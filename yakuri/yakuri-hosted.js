/* Yakuri hosted — shoreline.pravix.app/yakuri/. Loaded (deferred) before every Yakuri script.
   There is no Python server here, so this file answers the page's /api/… requests itself:
   - the library, holds, review states, history and source versions come from the snapshot the owner published from the
     Mac (Firestore yakuri/current → its parts), readable only by signed-in Pravix staff;
   - calculators, the CPR reference and the interaction checker run in yakuri-rules.js (checked against the Python);
   - nothing can approve, release a hold, place a hold or run a clinical action: those stay in Yakuri on the Mac.
   Signed out, the page shows the Pravix sign-in card (Flow's sign-in, then straight back). Signing out clears the copy
   this browser keeps. The owner publishes a new snapshot at /yakuri/#publish. */
(function () {
  'use strict';
  var R = window.YakuriRules;
  var OWNER = 'daniel.giordano@pravix.app', LOBBY = ['au733@vca.com'];
  var FB_CONFIG = { apiKey: 'AIzaSyCf8iXW_wWRLvHi1G4YnYRH-iLpaDufZQE', authDomain: 'shoreline-flow.firebaseapp.com', projectId: 'shoreline-flow',
    storageBucket: 'shoreline-flow.firebasestorage.app', messagingSenderId: '237404385636', appId: '1:237404385636:web:1ee3ba27f22c946f748a71' };
  var COL = 'yakuri', PART_CHARS = 900000, IDB = 'yakuri-hosted', HOSTED_MSG = 'Yakuri on Daniel’s Mac';
  window.YakuriHosted = { ready: false };

  /* ───────── data: core (library, health, interaction evidence) first, detail (recommendations, history, versions) after ───────── */
  var core = null, detail = null, release = null;
  var coreWait = defer(), detailWait = defer();
  function defer() { var d = {}; d.promise = new Promise(function (res, rej) { d.resolve = res; d.reject = rej; }); return d; }

  /* ───────── the /api/… answers ───────── */
  function Blocked(code, message, status) { return new R.Blocked(code, message, status); }
  function reply(status, value) { return new Response(JSON.stringify(value), { status: status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
  function refuse(e) { return reply(e.status, { allowed: false, code: e.code, message: e.message }); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function get(path) {
    var lib = core.library;
    if (path === '/api/session') return { token: 'hosted', mode: 'hosted-read-only', approval_write_enabled: false };
    if (path === '/api/label-scan/status') return { available: false, engine: 'Apple Vision · local', verified_product_catalog: false };
    if (path === '/api/library') return lib;
    if (path === '/api/interactions/coverage') return R.coverage(core.interaction_evidence);
    if (path === '/api/medical/cpr-rules') return R.cprCatalog();
    if (path === '/api/medical/catalog') return { drugs: lib.drugs.map(function (d) { return { id: d.id, name: d.name, state: d.governance.state }; })
      .sort(function (a, b) { var x = R.fold(a.name), y = R.fold(b.name); return x < y ? -1 : x > y ? 1 : 0; }), infusion_protocol_approved: false, cpr_protocol_approved: false };
    if (path === '/api/health') return core.health;
    return null;
  }
  function later(path) {
    var m = /^\/api\/(recommendations|source-versions|history)\/(.*)$/.exec(path);
    if (!m) return undefined;
    var map = m[1] === 'recommendations' ? detail.recommendations : m[1] === 'history' ? detail.history : detail.source_versions;
    if (has(map, m[2])) return map[m[2]];
    throw m[1] === 'recommendations' ? Blocked('unknown_recommendation', 'This recommendation is not in the current release.', 404) : Blocked('unknown_drug', 'Drug not found.', 404);
  }
  function post(path, payload, raw) {
    if (path === '/api/label-scan') throw Blocked('scanner_unavailable', 'Image recognition runs only in ' + HOSTED_MSG + '. Paste label text instead.', 503);
    if (path === '/api/medical/calculate') return R.calculate(payload, { floatKeys: R.floatKeysOf(raw) });
    if (path === '/api/interactions/check') return R.check(core.library, payload, core.interaction_evidence);
    if (path === '/api/hold' || path === '/api/release-hold') {
      var k = Object.keys(payload);
      if (k.length !== 3 || !['recommendation_id', 'version', 'reason'].every(function (x) { return has(payload, x) && typeof payload[x] === 'string'; }))
        throw Blocked('invalid_request', 'A recommendation, version and reason are required.', 400);
      throw Blocked('hosted_read_only', 'Safety holds change only in ' + HOSTED_MSG + '. This copy is read-only.');
    }
    if (path.indexOf('/api/clinical/') === 0) return R.clinical(path.slice('/api/clinical/'.length), payload, detail.recommendations);
    throw Blocked('not_found', 'Endpoint not found.', 404);
  }
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url;
    try { url = new URL(typeof input === 'string' ? input : input.url, location.href); } catch (e) { return realFetch(input, init); }
    if (url.origin !== location.origin || url.pathname.indexOf('/api/') !== 0) return realFetch(input, init);
    var path = decodeURIComponent(url.pathname), method = String((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    return coreWait.promise.then(function () {
      try {
        if (method === 'GET') {
          var v = get(path); if (v !== null) return reply(200, v);
          if (!/^\/api\/(recommendations|source-versions|history)\//.test(path)) throw Blocked('not_found', 'Endpoint not found.', 404);
          return detailWait.promise.then(function () { try { return reply(200, later(path)); } catch (e) { if (e && e.blocked) return refuse(e); throw e; } });
        }
        if (method !== 'POST') throw Blocked('not_found', 'Endpoint not found.', 404);
        var payload;
        var raw = String((init && init.body) || '');
        try { payload = JSON.parse(raw); } catch (e) { throw Blocked('invalid_json', 'Invalid JSON.', 400); }
        if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw Blocked('invalid_request', 'Request must be an object.', 400);
        if (path.indexOf('/api/clinical/') === 0) return detailWait.promise.then(function () { try { return reply(200, post(path, payload, raw)); } catch (e) { if (e && e.blocked) return refuse(e); throw e; } });
        return reply(200, post(path, payload, raw));
      } catch (e) { if (e && e.blocked) return refuse(e); throw e; }
    });
  };

  /* ───────── the copy this browser keeps (cleared on sign-out) ───────── */
  function idb() { return new Promise(function (res, rej) { var r = indexedDB.open(IDB, 1); r.onupgradeneeded = function () { r.result.createObjectStore('snap'); }; r.onsuccess = function () { var d = r.result; if (!d.objectStoreNames.contains('snap')) { d.close(); idbClear(); rej(new Error('cache')); return; } res(d); }; r.onerror = function () { rej(r.error); }; }); }
  function idbGet(k) { return idb().then(function (db) { return new Promise(function (res) { var g = db.transaction('snap').objectStore('snap').get(k); g.onsuccess = function () { res(g.result || null); db.close(); }; g.onerror = function () { res(null); db.close(); }; }); }).catch(function () { return null; }); }
  function idbPut(k, v) { return idb().then(function (db) { return new Promise(function (res) { var t = db.transaction('snap', 'readwrite'); t.objectStore('snap').put(v, k); t.oncomplete = function () { db.close(); res(); }; t.onerror = function () { db.close(); res(); }; }); }).catch(function () {}); }
  function idbClear() { try { indexedDB.deleteDatabase(IDB); } catch (e) {} }

  /* ───────── gzip + base64 + SHA-256 ───────── */
  function b64ToBytes(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function bytesToB64(u) { var s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
  function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function gunzip(bytes) { return pipe(bytes, new DecompressionStream('gzip')); }
  function gzip(bytes) { return pipe(bytes, new CompressionStream('gzip')); }
  function sha256(bytes) { return crypto.subtle.digest('SHA-256', bytes).then(function (h) { return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }
  function isGzip(u) { return u.length > 2 && u[0] === 0x1f && u[1] === 0x8b; }

  /* ───────── Firestore ───────── */
  var fb = null, db = null, user = null;
  /* a bundle arrives as its raw (gunzipped) bytes, checked against the release's SHA-256 before anything reads it */
  function readBundle(rel, name, n, expect, onPart) {
    var parts = [], done = 0;
    var ref = db.collection(COL).doc(rel.release).collection('parts');
    var jobs = []; for (var i = 0; i < n; i++) jobs.push(i);
    return Promise.all(jobs.map(function (i) {
      var id = name + '-' + ('0' + i).slice(-2);
      return ref.doc(id).get().then(function (d) { if (!d.exists) throw new Error('A part of the library is missing (' + id + ').'); parts[i] = d.data().data; onPart && onPart(++done); });
    })).then(function () { return gunzip(b64ToBytes(parts.join(''))); })
      .then(function (raw) { return checked(raw, expect); });
  }
  function checked(raw, expect) {
    return sha256(raw).then(function (h) { if (h !== expect) throw new Error('The library didn’t arrive intact. Reload to try again.'); return raw; });
  }
  function parse(raw) { return JSON.parse(new TextDecoder().decode(raw)); }
  /* The copy this browser keeps: raw bytes, for this account only, re-hashed against the release every time it is used. */
  function fromCache(cached, sha) {
    if (!cached || !user || cached.uid !== user.uid || !cached.core || !cached.detail || !sha) return Promise.resolve(false);
    return Promise.all([checked(cached.core, sha.core), checked(cached.detail, sha.detail)]).then(function (r) {
      core = parse(r[0]); detail = parse(r[1]); return true;
    }).catch(function () { idbClear(); return false; });
  }
  function load() {
    ui('loading', { text: 'Loading the drug library…' });
    return db.collection(COL).doc('current').get().then(function (cur) {
      if (!cur.exists) { ui('empty'); return; }
      release = cur.data();
      return idbGet('snap').then(function (cached) {
        var same = cached && cached.release === release.release;
        return fromCache(same ? cached : null, release.sha256).then(function (ok) {
          if (ok) { started(); return; }
          var total = release.parts.core + release.parts.detail, got = 0, rawCore;
          var tick = function () { got++; if (!core) ui('loading', { text: 'Loading the drug library…', progress: got / total }); };  /* the detail loads behind the open library */
          return readBundle(release, 'core', release.parts.core, release.sha256.core, tick).then(function (c) {
            rawCore = c; core = parse(c); coreReady();
            return readBundle(release, 'detail', release.parts.detail, release.sha256.detail, tick).then(function (d) {
              detail = parse(d); detailWait.resolve();
              idbPut('snap', { release: release.release, uid: user.uid, sha256: release.sha256, exported_at: release.exported_at, core: rawCore, detail: d });
            });
          });
        });
      });
    }).catch(function (e) {
      var denied = e && e.code === 'permission-denied';
      if (denied) { idbClear(); ui('error', { text: 'This account can’t open the drug library.' }); return; }   /* a denied account never sees a cached copy */
      var network = e && (e.code === 'unavailable' || e.code === 'deadline-exceeded' || e.name === 'TypeError');
      return (network ? idbGet('snap') : Promise.resolve(null)).then(function (cached) {
        return fromCache(cached, cached && cached.sha256).then(function (ok) {
          if (ok) { release = { release: cached.release, exported_at: cached.exported_at, offline: true }; started(); return; }
          ui('error', { text: e && e.message && /library/.test(e.message) ? e.message : 'Couldn’t load the drug library. Check the connection, then reload.' });
        });
      });
    });
  }
  function coreReady() { window.YakuriHosted.ready = true; window.YakuriHosted.release = release; coreWait.resolve(); ui(null); stamp(); watch(); }
  /* HIG Managing notifications (Oct 24 2026): a newer published library is announced in the page, quietly, never reloaded by itself.
     Checked when the tab comes back to the front and every 15 minutes; nothing is checked while the tab is hidden. */
  var watching = false, told = false;
  function watch() {
    if (watching) return; watching = true;
    var check = function () {
      if (told || document.visibilityState !== 'visible' || !db || !user || !release || !release.release) return;
      db.collection(COL).doc('current').get().then(function (cur) {
        if (told || !cur || !cur.exists) return;
        var next = cur.data();
        if (next && next.release && next.release !== release.release) {
          told = true;
          window.dispatchEvent(new CustomEvent('yakuri:library-changed', { detail: { exported_at: next.exported_at || '' } }));
        }
      }).catch(function () {});
    };
    document.addEventListener('visibilitychange', check);
    setInterval(check, 15 * 60 * 1000);
    window.YakuriHosted.checkForUpdate = check;
  }
  /* staff see which library they're reading: holds placed on the Mac reach this copy only when it is published again */
  function stamp() {
    var when = release && release.exported_at ? fmtDay(release.exported_at) : '';
    var text = 'Read-only copy' + (when ? ' · library of ' + when : '') + (release && release.offline ? ' · offline' : '') + ' · no clinical approval';
    var go = function () {
      var all = document.querySelectorAll('#pvxSubnav *, .medical-head *, .interaction-head *, header *');
      for (var i = 0; i < all.length; i++) { var el = all[i]; if (el.children.length === 0 && /^Read-only copy\b/.test((el.textContent || '').trim())) { el.textContent = text; el.title = 'Exported from Yakuri on the Mac ' + (release.exported_at || '') + '. Holds and reviews change only there; this copy shows them as of that export.'; } }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }
  function fmtDay(iso) { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } }
  function started() { coreReady(); detailWait.resolve(); }

  function boot() {
    fb = window.firebase;
    if (!fb || !fb.initializeApp) { ui('error', { text: 'Couldn’t reach Pravix sign-in. Check the connection, then reload.' }); return; }
    if (!fb.apps.length) fb.initializeApp(FB_CONFIG);
    db = fb.firestore();
    fb.auth().onAuthStateChanged(function (u) {
      var was = user; user = u;
      if (!u) { idbClear(); if (was || core) { location.reload(); return; } ui('signin'); return; }
      var email = String(u.email || '').toLowerCase();
      if (LOBBY.indexOf(email) > -1) { ui('lobby'); return; }   /* the managers' account: the suite guard shows "Unauthorized" */
      if (!core) load();
      if (/#publish\b/.test(location.hash) && email === OWNER) setTimeout(openPublish, 0);
      ownerLink(email === OWNER);
    });
  }

  /* ───────── the sign-in / loading card (below the top bar, over the page until the library is in) ───────── */
  var box = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function signInURL() { return 'https://shoreline.pravix.app/?next=' + encodeURIComponent(location.pathname + location.hash); }
  function place() { if (!box) return; var t = document.getElementById('pvxSubnav') || document.getElementById('pvxTopnav'); box.style.top = (t ? Math.max(0, Math.round(t.getBoundingClientRect().bottom)) : 0) + 'px'; }
  function ui(state, o) {
    o = o || {};
    if (!state) { if (box) { box.remove(); box = null; document.documentElement.classList.remove('yh-gated'); } return; }
    if (!box) {
      box = document.createElement('section'); box.className = 'yh-gate'; box.setAttribute('aria-live', 'polite');
      (document.body || document.documentElement).appendChild(box); document.documentElement.classList.add('yh-gated');
      window.addEventListener('resize', place); setTimeout(place, 300);
    }
    var h = '', p = '', act = '';
    if (state === 'loading') { h = o.text; p = 'Signed in as ' + esc(user ? user.email : '') + '.';
      act = '<div class="yh-bar" role="progressbar" aria-label="Loading the drug library" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round((o.progress || 0) * 100) + '"><span style="width:' + Math.round((o.progress || 0.04) * 100) + '%"></span></div>'; }
    else if (state === 'signin') { h = 'Sign in to use Yakuri'; p = 'Yakuri uses your Pravix account. Sign in on Flow and you’ll come straight back here.'; act = '<a class="yh-btn" href="' + esc(signInURL()) + '">Sign in on Flow</a>'; }
    else if (state === 'lobby') { h = 'Unauthorized'; p = 'This account can’t open the drug library.'; }
    else if (state === 'empty') { h = 'The drug library isn’t published yet'; p = 'Yakuri opens here once it has been published from the Mac.';
      if (user && String(user.email).toLowerCase() === OWNER) act = '<button class="yh-btn" type="button" id="yhPublishOpen">Publish the library…</button>'; }
    else if (state === 'error') { h = 'Yakuri couldn’t open'; p = esc(o.text); act = '<button class="yh-btn" type="button" id="yhReload">Reload</button>'; }
    box.innerHTML = '<div class="yh-card"><img class="yh-icon" src="icon-192.png" alt=""><h1>' + h + '</h1><p>' + p + '</p>' + act + '</div>';
    var r = box.querySelector('#yhReload'); if (r) r.onclick = function () { location.reload(); };
    var pb = box.querySelector('#yhPublishOpen'); if (pb) pb.onclick = openPublish;
    place();
  }

  /* ───────── the owner's publish sheet: /yakuri/#publish ───────── */
  function ownerLink(isOwner) {
    if (!isOwner) return;
    var add = function () {
      var tools = document.querySelector('#pvxSubnav .tools') || document.querySelector('#pvxSubnav');
      if (!tools || document.getElementById('yhPublishBtn')) return;
      var b = document.createElement('button'); b.type = 'button'; b.id = 'yhPublishBtn'; b.className = 'yh-publish-btn'; b.textContent = 'Publish…'; b.title = 'Publish the library from the Mac';
      b.onclick = openPublish; tools.appendChild(b);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
  }
  function fmtDate(iso) { try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso; } }
  function openPublish() {
    if (!user || String(user.email).toLowerCase() !== OWNER || document.getElementById('yhPublish')) return;
    var d = document.createElement('dialog'); d.id = 'yhPublish'; d.className = 'y-dialog yh-publish'; d.setAttribute('aria-labelledby', 'yhPubT');
    var cur = release && !release.offline ? 'Live now: the library exported ' + esc(fmtDate(release.exported_at)) + ' · ' + esc(release.counts ? release.counts.drugs + ' drugs, ' + release.counts.held + ' held' : '') + '.' : 'Nothing is published yet.';
    d.innerHTML = '<div class="y-dialog-head"><h2 id="yhPubT">Publish the library</h2><button type="button" class="yh-x" aria-label="Close">×</button></div>'
      + '<p>Choose the snapshot exported on the Mac (<code>hosted/out/snapshot.json.gz</code>). Everyone signed in to Pravix sees it next time Yakuri opens. Holds and review states come from the Mac exactly as they are.</p>'
      + '<p class="yh-cur">' + cur + '</p>'
      + '<label class="yh-file">Snapshot file<input type="file" id="yhPubFile" accept=".json,.gz,application/json,application/gzip"></label>'
      + '<p class="yh-msg" id="yhPubMsg" role="status"></p>'
      + '<div class="yh-actions"><button type="button" class="yh-btn yh-secondary" id="yhPubCancel">Cancel</button><button type="button" class="yh-btn" id="yhPubGo" aria-disabled="true">Publish</button></div>';
    document.body.appendChild(d); d.showModal();
    var close = function () { d.close(); d.remove(); if (/#publish/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); };
    d.querySelector('.yh-x').onclick = close; d.querySelector('#yhPubCancel').onclick = close; d.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    var msg = d.querySelector('#yhPubMsg'), go = d.querySelector('#yhPubGo'), snap = null, busy = false;
    d.querySelector('#yhPubFile').onchange = function (e) {
      var f = e.target.files[0]; snap = null; go.setAttribute('aria-disabled', 'true'); msg.className = 'yh-msg'; if (!f) return;
      msg.textContent = 'Reading ' + f.name + '…';
      f.arrayBuffer().then(function (b) { var u = new Uint8Array(b); return isGzip(u) ? gunzip(u) : u; }).then(function (raw) {
        var s = JSON.parse(new TextDecoder().decode(raw));
        if (!s || s.format !== 'yakuri-hosted-snapshot-v1' || !s.library || !Array.isArray(s.library.drugs) || !s.recommendations || !s.history || !s.source_versions || !s.interaction_evidence)
          throw new Error('That isn’t a Yakuri snapshot. Export one on the Mac with hosted/export_snapshot.py.');
        if (s.health && s.health.audit_intact === false) throw new Error('The Mac’s audit trail doesn’t verify, so this snapshot can’t be published. Check Yakuri on the Mac.');
        snap = s; var c = s.library.integration.counts;
        msg.textContent = 'Exported ' + fmtDate(s.exported_at) + ': ' + s.library.drugs.length + ' drugs · ' + c.Held + ' held · ' + c.Approved + ' approved · ' + c.Draft + ' unverified.';
        go.removeAttribute('aria-disabled');
      }).catch(function (err) { msg.className = 'yh-msg yh-err'; msg.textContent = err.message || 'Couldn’t read that file.'; });
    };
    go.onclick = function () {
      if (!snap || busy) { if (!snap) { msg.className = 'yh-msg yh-err'; msg.textContent = 'Choose the snapshot file first.'; } return; }
      busy = true; go.setAttribute('aria-disabled', 'true'); msg.className = 'yh-msg';
      publish(snap, function (t) { msg.textContent = t; }).then(function (rel) {
        msg.textContent = 'Published. Everyone signed in sees the library exported ' + fmtDate(rel.exported_at) + '.';
        idbClear(); setTimeout(function () { location.replace(location.pathname); }, 1600);
      }).catch(function (err) { busy = false; go.removeAttribute('aria-disabled'); msg.className = 'yh-msg yh-err'; msg.textContent = 'Not published: ' + (err && err.message || err) + ' Nothing changed for anyone.'; });
    };
  }
  function encode(obj) { var raw = new TextEncoder().encode(JSON.stringify(obj)); return Promise.all([sha256(raw), gzip(raw)]).then(function (r) { var b = bytesToB64(r[1]), parts = []; for (var i = 0; i < b.length; i += PART_CHARS) parts.push(b.slice(i, i + PART_CHARS)); return { sha: r[0], parts: parts, bytes: raw.length }; }); }
  function publish(s, say) {
    var lib = s.library, c = lib.integration.counts, id = 'r_' + s.exported_at.replace(/[^0-9]/g, '').slice(0, 14) + '_' + Math.random().toString(36).slice(2, 6);
    var coreObj = { library: lib, health: s.health, exported_at: s.exported_at, interaction_evidence: s.interaction_evidence };
    var detailObj = { recommendations: s.recommendations, history: s.history, source_versions: s.source_versions };
    say('Packing the library…');
    return Promise.all([encode(coreObj), encode(detailObj)]).then(function (enc) {
      var all = [];
      enc[0].parts.forEach(function (p, i) { all.push(['core-' + ('0' + i).slice(-2), p, i, enc[0].parts.length]); });
      enc[1].parts.forEach(function (p, i) { all.push(['detail-' + ('0' + i).slice(-2), p, i, enc[1].parts.length]); });
      var relDoc = { release: id, format: s.format, exported_at: s.exported_at, bundle: s.health.bundle, audit_intact: s.health.audit_intact,
        counts: { drugs: lib.drugs.length, held: c.Held, approved: c.Approved, draft: c.Draft }, parts: { core: enc[0].parts.length, detail: enc[1].parts.length },
        sha256: { core: enc[0].sha, detail: enc[1].sha }, bytes: { core: enc[0].bytes, detail: enc[1].bytes },
        published_by: user.email, published_at: fb.firestore.FieldValue.serverTimestamp(), clinical_approval: false };
      var ref = db.collection(COL).doc(id), n = 0;
      var chain = all.reduce(function (pr, a) { return pr.then(function () { say('Uploading part ' + (++n) + ' of ' + all.length + '…'); return ref.collection('parts').doc(a[0]).set({ i: a[2], n: a[3], data: a[1] }); }); }, Promise.resolve());
      return chain.then(function () { return ref.set(relDoc); })
        .then(function () { say('Checking what was uploaded…'); return readBundle(relDoc, 'core', relDoc.parts.core, relDoc.sha256.core); })
        .then(function () { return readBundle(relDoc, 'detail', relDoc.parts.detail, relDoc.sha256.detail); })
        .then(function () { say('Switching everyone to the new library…'); return db.collection(COL).doc('current').set(relDoc); })
        .then(function () { return relDoc; });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
