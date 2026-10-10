/* Kura on shoreline.pravix.app — the browser stands in for Kura's server.

   Who: only the accounts in OWNERS (Firebase sign-in). Firestore rules enforce the same list.
   Where the data lives: Firestore kura/{SPACE}
     · kura/{SPACE}                    head: {seq} — the number of changes ever made
     · kura/{SPACE}/log/{000000000042}  change 42: the exact rows it wrote, gzip (Blob, split into parts/ when large)
     · kura/{SPACE}/checkpoints/{seq}   a full copy of the database at that change (every CHECKPOINT_EVERY changes)
     · kura/{SPACE}/meta/tslink         the Treatment Sheets link (on/off, where it has read up to)
   How a change is saved: the engine (Kura's Python, in a worker) computes it against this device's copy, then a Firestore
   transaction on the head writes it as change seq+1 — only if no other device saved one first. If one did, this device
   catches up and computes again. Other devices apply the recorded rows exactly. So every device holds the same database.
   Offline: the last copy opens from this device (read only); stock movements wait in Kura's device queue (api.js). */

export const SPACE = 'shoreline';
export const OWNERS = ['daniel.giordano@pravix.app'];
const FIREBASE = { apiKey: 'AIzaSyCf8iXW_wWRLvHi1G4YnYRH-iLpaDufZQE', authDomain: 'shoreline-flow.firebaseapp.com', projectId: 'shoreline-flow',
  storageBucket: 'shoreline-flow.firebasestorage.app', messagingSenderId: '237404385636', appId: '1:237404385636:web:1ee3ba27f22c946f748a71' };
const PART = 900_000, CHECKPOINT_EVERY = 100, RETRIES = 6, TS_SOURCE = 'pravix-treatment', TS_HOSPITAL = 'shoreline';
const AUTO_RETRY = ['mapping_missing', 'location_mapping_missing', 'original_event_missing'];
const pad = n => String(n).padStart(12, '0');
const offline = m => Object.assign(new Error(m || 'Kura could not reach Firebase. Check your connection; stock movements wait in the device queue.'), { code: 'offline', status: 0 });
const fail = e => Object.assign(new Error(e.message || 'The request could not be completed.'), { status: e.status || 400, code: e.code || 'validation', details: e.details || null });

let fb, db, auth, FV, worker, booted = null, seq = 0, ready = null, user = null, authReady, liveUnsub = null, lastCheckpoint = 0, cacheTimer = 0;
let lane = Promise.resolve(), status = { engine: 'starting', synced: false, offline: false, error: null, loaded_at: null };
const inLane = fn => { const p = lane.then(fn, fn); lane = p.catch(() => {}); return p; };

/* ---------- engine worker ---------- */
let rid = 0; const waiting = new Map();
function call(op, args = {}, bytes) {
  return new Promise((resolve, reject) => {
    const id = ++rid; waiting.set(id, { resolve, reject });
    const msg = { id, op, args: typeof args === 'string' ? args : JSON.stringify(args) };
    if (bytes) { msg.bytes = bytes; worker.postMessage(msg, [bytes]); } else worker.postMessage(msg);
  });
}
async function rpc(op, args) { const out = JSON.parse(await call(op, args)); if (out && out.error) throw fail(out.error); return out; }
const read = (op, args) => inLane(() => rpc(op, args));            // reads wait for any change in progress, so they never see one half-saved
const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'deadline-exceeded' })), ms))]);

/* ---------- bytes ---------- */
async function gzip(data) { const s = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip')); return new Uint8Array(await new Response(s).arrayBuffer()); }
async function gunzip(u8) { const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip')); return new Uint8Array(await new Response(s).arrayBuffer()); }
const blob = u8 => fb.firestore.Blob.fromUint8Array(u8);
const bytesOf = b => (b && b.toUint8Array) ? b.toUint8Array() : new Uint8Array(0);
async function partsWrite(ref, z, write) { const n = Math.max(1, Math.ceil(z.length / PART)); if (n === 1) return { z: blob(z), parts: 0 };
  for (let i = 0; i < n; i++) write(ref.collection('parts').doc(String(i)), { i, z: blob(z.subarray(i * PART, (i + 1) * PART)) });
  return { parts: n }; }
async function partsRead(ref, data) { if (!data.parts) return bytesOf(data.z);
  const snap = await ref.collection('parts').orderBy('i').get(); const chunks = snap.docs.map(d => bytesOf(d.data().z));
  if (chunks.length !== data.parts) throw new Error('Change ' + data.seq + ' is incomplete.'); const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0)); let o = 0; chunks.forEach(c => { out.set(c, o); o += c.length; }); return out; }

/* ---------- this device's copy (IndexedDB) ---------- */
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('kura-web-v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('db'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function cacheGet() { try { const d = await idb(); return await new Promise(res => { const q = d.transaction('db').objectStore('db').get(SPACE + ':' + user.uid); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch { return null; } }
async function cachePut(v) { try { const d = await idb(); await new Promise(res => { const t = d.transaction('db', 'readwrite'); t.objectStore('db').put(v, SPACE + ':' + user.uid); t.oncomplete = res; t.onerror = res; }); } catch { /* the copy is a convenience */ } }
function cacheSoon() { clearTimeout(cacheTimer); cacheTimer = setTimeout(() => inLane(async () => { const b = await call('serialize'); await cachePut({ seq, z: await gzip(new Uint8Array(b)), at: new Date().toISOString() }); }), 2500); }

/* ---------- Firestore ---------- */
const root = () => db.collection('kura').doc(SPACE);
async function openFrom(bytes) { const r = await call('open', {}, bytes ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : undefined); seq = r.seq || 0; }
async function applyEntry(doc) {
  const d = doc.data(); if (d.seq <= seq) return; if (d.seq !== seq + 1) { await catchUp(); return; }
  const text = new TextDecoder().decode(await gunzip(await partsRead(doc.ref, d)));
  await rpc('apply', '{"seq":' + d.seq + ',"changes":' + text + '}');   // the rows stay text: Python reads them, JavaScript never rounds a number
  seq = d.seq;
}
async function catchUp() {
  for (let guard = 0; guard < 1000; guard++) {
    const snap = await root().collection('log').where('seq', '>', seq).orderBy('seq').limit(100).get();
    if (snap.empty) return;
    for (const doc of snap.docs) await applyEntry(doc);
    if (snap.size < 100) return;
  }
}
function listen() {
  if (liveUnsub) liveUnsub();
  liveUnsub = root().collection('log').where('seq', '>', seq).orderBy('seq').onSnapshot(snap => {
    const docs = snap.docChanges().filter(c => c.type === 'added').map(c => c.doc);
    if (!docs.length) return;
    inLane(async () => { const before = seq; for (const d of docs) await applyEntry(d); if (seq !== before) { cacheSoon(); notify(); } });
  }, err => { status.offline = true; status.error = err && err.code; notify(); });
}
async function load() {
  const cached = await cacheGet();
  let head;
  try { head = await root().get(); }
  catch (e) {                                                  // no connection: open this device's last copy, read only
    if (!cached) throw offline('Kura needs a connection the first time it opens on this device.');
    await openFrom(await gunzip(cached.z)); status.offline = true; return;
  }
  const headSeq = head.exists ? (head.data().seq || 0) : 0;
  const cp = await root().collection('checkpoints').where('seq', '<=', headSeq).orderBy('seq', 'desc').limit(1).get();
  lastCheckpoint = cp.empty ? 0 : cp.docs[0].data().seq;
  if (cached && cached.seq <= headSeq && cached.seq >= lastCheckpoint) await openFrom(await gunzip(cached.z));
  else if (!cp.empty) await openFrom(await gunzip(await partsRead(cp.docs[0].ref, cp.docs[0].data())));
  else await openFrom(null);
  await catchUp();
  listen();
  status.synced = true; status.offline = false; cacheSoon();
}
async function checkpoint() {
  if (seq - lastCheckpoint < CHECKPOINT_EVERY) return;
  const at = seq, z = await gzip(new Uint8Array(await call('serialize')));
  const ref = root().collection('checkpoints').doc(pad(at)), batch = db.batch();
  const meta = await partsWrite(ref, z, (r, v) => batch.set(r, v));
  batch.set(ref, { seq: at, ...meta, size: z.length, at: FV.serverTimestamp(), by: user.email, engine: 'kura-web-1' });
  await batch.commit(); lastCheckpoint = at;
}

/* ---------- saving one change ---------- */
class Conflict extends Error {}
async function mutate(op, args, label) {
  return inLane(async () => {
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      const out = await rpc(op, args);
      if (!out.pending) return out.result;
      const base = seq, next = base + 1, z = await gzip(new TextEncoder().encode(out.changes));
      try {
        if (globalThis.navigator && navigator.onLine === false) throw offline();
        // If this times out and Firebase saves it later anyway, the change arrives back through the log like any other
        // device's, and api.js's retry with the same request key finds it already saved. Nothing is counted twice.
        await within(db.runTransaction(async tx => {
          const h = await tx.get(root());
          if ((h.exists ? h.data().seq || 0 : 0) !== base) throw new Conflict();
          const ref = root().collection('log').doc(pad(next));
          const meta = await partsWrite(ref, z, (r, v) => tx.set(r, v));
          tx.set(ref, { seq: next, ...meta, size: z.length, cmd: label || op, by: user.email, at: FV.serverTimestamp(), engine: 'kura-web-1' });
          tx.set(root(), { seq: next, updated_at: FV.serverTimestamp(), by: user.email }, { merge: true });
        }), 20000);
      } catch (e) {
        await rpc('finish', { ok: false });
        if (e instanceof Conflict) { await catchUp(); continue; }
        if (e && e.code === 'permission-denied') throw fail({ message: 'Firebase refused the change. Publish the Kura rule, and sign in as ' + OWNERS[0] + '.', status: 403, code: 'forbidden' });
        status.offline = true; notify(); throw offline();
      }
      await rpc('finish', { ok: true, seq: next });
      seq = next; status.offline = false; cacheSoon(); inLane(checkpoint).catch(() => {});
      return out.result;
    }
    throw fail({ message: 'Another device kept saving at the same moment. Try again.', status: 409, code: 'busy' });
  });
}

/* ---------- Treatment Sheets link: doses recorded on sheets take stock out while Kura is open ---------- */
const ts = { unsub: null, cfg: null, busy: false, again: false, last: null };
const tsRef = () => root().collection('meta').doc('tslink');
function tsListen() {
  if (ts.unsub) { ts.unsub(); ts.unsub = null; }
  if (!ts.cfg || !ts.cfg.enabled) return;
  const since = ts.cfg.cursor ? new Date(new Date(ts.cfg.cursor).getTime() - 3 * 60000) : new Date('2026-01-01T00:00:00Z');
  ts.unsub = db.collection('kura_outbox').doc(TS_HOSPITAL).collection('events').where('written_at', '>=', since).orderBy('written_at')
    .onSnapshot(snap => { ts.last = snap.docs; tsRun(); }, err => { ts.error = err && (err.code === 'permission-denied' ? 'Firestore refused to share Treatment Sheets doses. Publish the kura_outbox rule.' : err.message); notify(); });
}
async function tsRun() {
  if (ts.busy) { ts.again = true; return; } ts.busy = true;
  try {
    do {
      ts.again = false;
      const docs = ts.last || []; let newest = null, n = 0;
      for (const doc of docs) {
        const d = doc.data(), written = d.written_at && d.written_at.toDate ? d.written_at.toDate().toISOString() : null;
        newest = written || newest;
        if (d.kura && d.kura.status) continue;                        // already answered
        const check = await read('ts_check', { doc_id: doc.id, env: typeof d.env === 'string' ? d.env : null, doc_hospital: d.hospital ?? null, hospital: TS_HOSPITAL });
        if (check.error) { await doc.ref.update({ kura: { status: 'rejected', message: check.error.message, at: FV.serverTimestamp() } }).catch(() => {}); continue; }
        const seen = await read('find_event', { source: TS_SOURCE, event_id: check.env.event_id });
        if (!seen.event) { await mutate('command', { email: user.email, command: 'integration.event', payload: check.env, key: check.key }, 'integration.event'); n++; }
      }
      if (n || docs.length) await mutate('command', { email: user.email, command: 'integration.retry_source', payload: { source: TS_SOURCE, codes: AUTO_RETRY, limit: 200 }, key: 'tsretry-' + crypto.randomUUID() }, 'integration.retry_source');
      await tsAck(docs);
      if (newest && newest !== ts.cfg.cursor) { ts.cfg.cursor = newest; await tsRef().set({ cursor: newest, last_sync_at: FV.serverTimestamp(), last_error: null }, { merge: true }).catch(() => {}); }
      ts.error = null; ts.checked = new Date().toISOString(); if (n) notify();
    } while (ts.again);
  } catch (e) { ts.error = e.message; notify(); }
  finally { ts.busy = false; }
}
async function tsAck(docs) {
  const { statuses } = await read('event_statuses', { source: TS_SOURCE });
  for (const doc of docs) {
    const s = statuses[doc.id]; if (!s) continue;
    const want = s.status === 'accepted' ? 'accepted' : s.status === 'ignored' ? 'ignored' : 'needs_review';
    const have = doc.data().kura || {};
    if (have.status === want) continue;
    await doc.ref.update({ kura: { status: want, message: (want === 'accepted' ? 'Stock updated in Kura' : s.message || 'Needs review in Kura').slice(0, 300), at: FV.serverTimestamp() } }).catch(() => {});
  }
}
function tsPublic() {
  const c = ts.cfg || {};
  return { id: 'treatment-sheets', source: TS_SOURCE, connected: !!c.enabled_at, enabled: !!c.enabled, web: true,
    config: { email: 'Your account (' + (user && user.email) + ')', hospital: TS_HOSPITAL },
    status: { last_sync_at: ts.checked || null, last_error: ts.error ? { message: ts.error } : null } };
}
async function tsAction(action) {
  const set = async patch => { await tsRef().set(patch, { merge: true }); ts.cfg = { ...(ts.cfg || {}), ...patch }; tsListen(); };   // the page shows the new setting at once
  if (action === 'connect' || action === 'resume') await set({ enabled: true, enabled_at: (ts.cfg && ts.cfg.enabled_at) || new Date().toISOString(), by: user.email });
  else if (action === 'pause' || action === 'disconnect') await set({ enabled: false, by: user.email });
  else if (action === 'sync') { await tsRun(); }
  else throw fail({ message: 'Choose connect, pause, resume or sync.' });
  return { connector: tsPublic(), summary: ts.error ? { error: ts.error } : {} };
}

function stopListening() { if (liveUnsub) { liveUnsub(); liveUnsub = null; } if (ts.unsub) { ts.unsub(); ts.unsub = null; } if (ts.metaUnsub) { ts.metaUnsub(); ts.metaUnsub = null; } }

/* ---------- start ---------- */
const listeners = new Set(); function notify() { listeners.forEach(f => { try { f(); } catch { /* ignore */ } }); }
export function onChange(f) { listeners.add(f); return () => listeners.delete(f); }
export function engineStatus() { return { ...status, seq }; }

export function install({ firebase: fbGlobal, workerUrl }) {
  fb = fbGlobal;
  if (!fb.apps.length) fb.initializeApp(FIREBASE);
  db = fb.firestore(); auth = fb.auth(); FV = fb.firestore.FieldValue;
  worker = new Worker(workerUrl);
  worker.onmessage = e => { const w = waiting.get(e.data.id); if (!w) return; waiting.delete(e.data.id); e.data.ok ? w.resolve(e.data.value) : w.reject(new Error(e.data.value && e.data.value.message)); };
  worker.onerror = e => { status.engine = 'failed'; status.error = (e && e.message) || 'engine'; };
  booted = call('boot').then(v => { status.engine = 'ready'; return v; }, e => { status.engine = 'failed'; booted = null; throw offline('Kura’s engine did not load (' + (e.message || 'unknown') + '). Check your connection and reload.'); });
  booted.catch(e => { status.error = e.message; });
  authReady = new Promise(res => { auth.onAuthStateChanged(() => res()); setTimeout(res, 8000); });
  auth.onAuthStateChanged(u => { const was = user && user.uid; user = u; if ((u && u.uid) !== (was || null) && ready) { stopListening(); ready = null; } });
  globalThis.kuraTransport = request;          // api.js calls these instead of a Kura server
  globalThis.kuraDownload = download;
}
async function ensure() {
  if (!booted) throw offline(status.error || 'Kura’s engine did not load. Reload the page.');
  await Promise.all([authReady, booted]);
  if (!user || !OWNERS.includes(String(user.email || '').toLowerCase())) return false;
  if (!ready) ready = inLane(load).then(async () => {
    try { ts.cfg = (await tsRef().get()).data() || null; } catch { ts.cfg = null; }
    if (ts.metaUnsub) ts.metaUnsub();
    ts.metaUnsub = tsRef().onSnapshot(s => { const was = ts.cfg && ts.cfg.enabled; ts.cfg = s.data() || null; if (!!(ts.cfg && ts.cfg.enabled) !== !!was) { tsListen(); notify(); } }, () => {});
    tsListen(); status.loaded_at = new Date().toISOString();
  }).catch(e => { ready = null; throw e; });
  await ready; return true;
}

/* ---------- the endpoints api.js used to call on the Kura server ---------- */
async function request(path, payload) {
  const [name, query] = path.split('?'), params = new URLSearchParams(query || '');
  if (name === 'login') {
    if (!OWNERS.includes(String(payload.email || '').trim().toLowerCase())) throw fail({ message: 'Kura is available only to ' + OWNERS[0] + ' for now.', status: 403, code: 'forbidden' });
    try { await auth.signInWithEmailAndPassword(String(payload.email).trim(), payload.password); }
    catch (e) { throw fail({ message: e.code === 'auth/network-request-failed' ? 'No connection. Try again when online.' : 'Email or password is incorrect.', status: 401, code: 'authentication' }); }
    user = auth.currentUser; ready = null; return request('session');
  }
  if (name === 'logout') { stopListening(); await auth.signOut(); user = null; ready = null; return { signed_out: true }; }
  if (name === 'session') {
    const ok = await ensure();
    if (!ok) return { setup_required: false, user: null, permissions: [], environment: 'production', web: true, denied: user ? user.email : null };
    const out = await read('session', { email: user.email });
    return { ...out, web: true, firebase_user: { email: user.email, name: user.displayName || '' } };
  }
  if (!(await ensure())) throw fail({ message: 'Sign in to continue.', status: 401, code: 'authentication' });
  const email = user.email;
  if (name === 'setup') { const r = await mutate('setup', { email, name: payload.name, organization: payload.organization, hospital: payload.hospital }, 'setup'); return { ...r, web: true }; }
  if (name === 'command') return { result: await mutate('command', { email, command: payload.command, payload: payload.payload ?? {}, key: payload.key }, payload.command) };
  if (name === 'request-outcome') return mutate('outcome', { email, key: params.get('key') }, 'request.outcome');
  if (name === 'request-cancel') return mutate('outcome', { email, key: payload.key, cancel: true }, 'request.cancel');
  if (name === 'connector') return tsAction(payload.action);
  if (name === 'state') {
    const s = await inLane(() => rpc('state', { email }));
    s.connectors = [tsPublic()];
    s.health = { service: status.offline ? 'offline' : 'healthy', database: 'Firebase · change ' + seq, environment: 'production',
      transport: 'HTTPS (shoreline.pravix.app)', email: 'Not configured', sso: 'Firebase sign-in',
      external_integrations: ts.cfg && ts.cfg.enabled ? 'Treatment Sheets connected' : 'Not connected',
      backup: { status: lastCheckpoint ? 'completed' : 'not_yet_created', last_completed: null, error: null, interval_minutes: null, retained: null,
        note: 'Every change is kept in Firebase; a full copy is saved every ' + CHECKPOINT_EVERY + ' changes.' } };
    return s;
  }
  throw fail({ message: 'Endpoint not found.', status: 404, code: 'not_found' });
}

/* ---------- files to save ---------- */
async function download(kind) {
  if (!(await ensure())) throw fail({ message: 'Sign in to continue.', status: 401, code: 'authentication' });
  let data, type, name;
  if (kind === 'backup') { data = new Uint8Array(await inLane(() => call('serialize'))); type = 'application/vnd.sqlite3'; name = 'kura-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '') + '.sqlite3'; }
  else { const out = await inLane(() => rpc('export', { email: user.email, kind })); data = out.csv; type = 'text/csv;charset=utf-8'; name = 'kura-' + kind + '.csv'; }
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
