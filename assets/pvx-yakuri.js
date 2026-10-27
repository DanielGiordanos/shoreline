/* Pravix · Yakuri connector (n254, Daniel, Oct 26 2026): "connect Yakuri to Treatment Sheets, Anesia, OR and anything else
   that may need it". Every Pravix app reads the drug library from Yakuri — the release the owner publishes at /yakuri/#publish
   (Firestore yakuri/current → its parts), readable only by signed-in staff — instead of a drug file on the public site.

   What it gives each app (window.PvxYakuri):
   - drugs()            → Promise of the library as order lists use it ({n, id, b, st, no, r:[regimens]}), the same shape the
                          Treatment Sheets / Anesia reference had. A regimen on hold in Yakuri keeps its text but loses its
                          numbers (r.d = null, r.hold = true), so nothing can ever calculate a dose from it;
   - match(text)        → the Yakuri drug a name, brand or product line names (sync, once loaded), or null;
   - url(id) / link(…)  → the drug's page in Yakuri (/yakuri/#drug=…);
   - orderNote(drug)    → the line an order shows under the drug's name (held, or "no clinical approval yet");
   - interactions(…)    → Yakuri's own interaction check (yakuri-rules.js from /yakuri/), never a new one;
   - onReady(fn)        → runs fn once the library is in (or at once if it is).
   Nothing here approves, releases or changes anything in Yakuri. Clinical approval is still none: every dose is the doctor's.
   The copy this browser keeps is for the signed-in account only and is cleared at sign-out, like Yakuri's own. */
(function () {
  'use strict';
  if (window.PvxYakuri) return;
  var IDB = 'pvx-yakuri', YIDB = 'yakuri-hosted', COL = 'yakuri';
  var state = { lib: null, rel: null, wait: null, err: null, ready: [], rules: null, uid: null };

  /* ───────── small helpers ───────── */
  function fold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function b64ToBytes(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function gunzip(bytes) { return pipe(bytes, new DecompressionStream('gzip')); }
  function sha256(bytes) { return crypto.subtle.digest('SHA-256', bytes).then(function (h) { return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }
  function idbOpen(name, store) {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(name, 1);
      r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store); };
      r.onsuccess = function () { var d = r.result; if (!d.objectStoreNames.contains(store)) { d.close(); rej(new Error('no store')); return; } res(d); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(name, store, key) {
    return idbOpen(name, store).then(function (d) { return new Promise(function (res) { var t = d.transaction(store, 'readonly').objectStore(store).get(key); t.onsuccess = function () { d.close(); res(t.result); }; t.onerror = function () { d.close(); res(null); }; }); }).catch(function () { return null; });
  }
  function idbPut(name, store, key, v) {
    return idbOpen(name, store).then(function (d) { return new Promise(function (res) { var t = d.transaction(store, 'readwrite'); t.objectStore(store).put(v, key); t.oncomplete = function () { d.close(); res(); }; t.onerror = function () { d.close(); res(); }; }); }).catch(function () {});
  }
  function idbClear() { try { indexedDB.deleteDatabase(IDB); } catch (e) {} }
  function fb() { return window.firebase && firebase.apps && firebase.apps.length ? firebase : null; }

  /* ───────── the library: what the apps need from Yakuri's release, nothing more ───────── */
  function compact(core, rel) {
    var lib = core.library || { drugs: [] };
    var drugs = lib.drugs.map(function (d) {
      var g = d.governance || {}, ed = d.editorial || {}, held = {}, all = g.state === 'Held';
      (g.recommendations || []).forEach(function (r) { if (r && r.state === 'Held' && r.record_number) held[r.record_number] = 1; });
      var r = (d.records || []).map(function (x, i) {
        var y = {}; Object.keys(x).forEach(function (k) { if (k !== 'src' && k !== 'u') y[k] = x[k]; });
        y.u = '';
        if (all || held[i + 1]) { y.hold = true; y.d = null; }   /* held: shown, never calculated */
        return y;
      });
      return { n: d.name, id: d.id, b: (ed.brand_aliases || []).filter(function (x) { return typeof x === 'string'; }), ys: g.state || 'Draft',
        no: all ? (ed.notice || 'On hold in Yakuri.') : '', hr: Object.keys(held).length, r: r, sp: d.species || [] };
    });
    return { release: rel.release, exported_at: core.exported_at || rel.exported_at || '', counts: rel.counts || null, drugs: drugs, ev: core.interaction_evidence || null };
  }
  function index(lib) {
    var by = {}, names = [];
    lib.drugs.forEach(function (d) {
      [d.n].concat(d.b || []).forEach(function (nm) { var k = fold(nm); if (k && !by[k]) { by[k] = d; names.push(k); } });
    });
    names.sort(function (a, b) { return b.length - a.length; });   /* longest first: "Maropitant citrate" before "Maropitant" */
    lib._by = by; lib._names = names; lib._id = {}; lib.drugs.forEach(function (d) { lib._id[d.id] = d; });
    return lib;
  }
  function downloadCore(db, rel) {
    var n = (rel.parts && rel.parts.core) || 0, ref = db.collection(COL).doc(rel.release).collection('parts'), parts = [], jobs = [];
    for (var i = 0; i < n; i++) jobs.push(i);
    return Promise.all(jobs.map(function (i) {
      var id = 'core-' + ('0' + i).slice(-2);
      return ref.doc(id).get().then(function (d) { if (!d.exists) throw new Error('A part of the Yakuri library is missing (' + id + ').'); parts[i] = d.data().data; });
    })).then(function () { return gunzip(b64ToBytes(parts.join(''))); });
  }
  function checked(raw, expect) { return sha256(raw).then(function (h) { if (h !== expect) throw new Error('The Yakuri library didn’t arrive intact.'); return raw; }); }
  function parse(raw) { return JSON.parse(new TextDecoder().decode(raw)); }
  function signedIn() {
    return new Promise(function (res) {
      var F = fb(); if (!F) { var t = setInterval(function () { if (fb()) { clearInterval(t); signedIn().then(res); } }, 200); return; }
      var a = F.auth(); if (a.currentUser) return res(a.currentUser);
      var off = a.onAuthStateChanged(function (u) { if (u) { off(); res(u); } });
    });
  }
  function load() {
    if (state.lib) return Promise.resolve(state.lib);
    if (state.wait) return state.wait;
    state.wait = signedIn().then(function (u) {
      state.uid = u.uid;
      var db = firebase.firestore();
      return db.collection(COL).doc('current').get().then(function (cur) {
        if (!cur.exists) throw new Error('No Yakuri library has been published yet.');
        var rel = cur.data(); state.rel = rel;
        return idbGet(IDB, 'lib', 'current').then(function (c) {
          if (c && c.uid === u.uid && c.release === rel.release && c.sha === (rel.sha256 && rel.sha256.core)) return c.lib;
          /* the copy Yakuri itself keeps in this browser (same site) saves a second download */
          return idbGet(YIDB, 'snap', 'snap').then(function (y) {
            var raw = (y && y.uid === u.uid && y.release === rel.release && y.core) ? Promise.resolve(y.core) : downloadCore(db, rel);
            return raw.then(function (bytes) { return checked(bytes, rel.sha256.core); })
              .then(function (bytes) { var lib = compact(parse(bytes), rel); idbPut(IDB, 'lib', 'current', { uid: u.uid, release: rel.release, sha: rel.sha256.core, lib: lib }); return lib; });
          });
        });
      });
    }).then(function (lib) {
      state.lib = index(lib); state.err = null;
      var q = state.ready.splice(0); q.forEach(function (f) { try { f(state.lib); } catch (e) { console.warn('[yakuri]', e); } });
      try { window.dispatchEvent(new CustomEvent('pvx-yakuri:ready', { detail: { release: lib.release, drugs: lib.drugs.length } })); } catch (e) {}
      return state.lib;
    }).catch(function (e) { state.wait = null; state.err = e; console.warn('[yakuri] the drug library didn’t load —', (e && e.message) || e); throw e; });
    return state.wait;
  }
  /* signing out clears this browser's copy (as Yakuri does) */
  (function watch() {
    var F = fb(); if (!F) return setTimeout(watch, 300);
    F.auth().onAuthStateChanged(function (u) {
      if (!u) { idbClear(); state.lib = null; state.wait = null; state.uid = null; return; }
      if (state.uid && state.uid !== u.uid) { idbClear(); state.lib = null; state.wait = null; }
    });
  })();

  /* ───────── matching names to Yakuri drugs ───────── */
  function match(text) {
    var L = state.lib; if (!L || !text) return null;
    if (typeof text === 'object') return L._id[text.id] || match(text.n || text.name);
    var f = ' ' + fold(text) + ' ';
    if (L._by[f.trim()]) return L._by[f.trim()];
    for (var i = 0; i < L._names.length; i++) { var k = L._names[i]; if (k.length >= 4 && f.indexOf(' ' + k + ' ') > -1) return L._by[k]; }
    return null;
  }
  function matchAll(text) {
    var out = [], seen = {};
    String(text || '').split(/[,;\n\/+]|\band\b|\bwith\b/i).forEach(function (bit) { var d = match(bit); if (d && !seen[d.id]) { seen[d.id] = 1; out.push(d); } });
    return out;
  }
  function url(id) { return '/yakuri/#drug=' + encodeURIComponent(id); }
  function held(d) { return !!(d && (d.ys === 'Held' || d.hr)); }

  /* ───────── shared look (both themes) ───────── */
  (function css() {
    if (document.getElementById('pvx-yakuri-css')) return;
    var s = document.createElement('style'); s.id = 'pvx-yakuri-css';
    s.textContent = [
      'a.pvx-yk{color:var(--pvx-yk-ink,#38BDD2);text-decoration:none;font-weight:inherit}a.pvx-yk:hover{text-decoration:underline}',
      'a.pvx-yk:focus-visible{outline:2px solid var(--pvx-yk-ink,#38BDD2);outline-offset:2px;border-radius:3px}',
      '.pvx-yk-hold{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;font-size:0.6875rem;font-weight:700;letter-spacing:0;vertical-align:1px;white-space:nowrap;color:#EBC95D;background:rgba(235,201,93,.14)}',
      '.pvx-yk-note{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin:6px 0 2px;font-size:0.8125rem;line-height:1.4;color:var(--ink-500,#8fa3b8)}',
      '.pvx-yk-note.hold{color:#EBC95D}.pvx-yk-note a.pvx-yk{font-weight:600;white-space:nowrap}',
      'body:not(.dark){--pvx-yk-ink:#23439C}body:not(.dark) .pvx-yk-hold{color:#9A6A00;background:rgba(154,106,0,.10)}body:not(.dark) .pvx-yk-note.hold{color:#9A6A00}',
      'html[data-theme="light"]{--pvx-yk-ink:#23439C}',
      '.rx-tag.pvx-hold{color:#EBC95D;background:rgba(235,201,93,.14)}body:not(.dark) .rx-tag.pvx-hold{color:#9A6A00;background:rgba(154,106,0,.10)}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  })();

  function link(nameOrDrug, label, opts) {
    opts = opts || {};
    var d = typeof nameOrDrug === 'object' && nameOrDrug && nameOrDrug.r ? nameOrDrug : match(nameOrDrug);
    var text = label != null ? label : esc(typeof nameOrDrug === 'string' ? nameOrDrug : (d ? d.n : ''));
    if (!d) return text;
    var h = held(d);
    return '<a class="pvx-yk" href="' + url(d.id) + '" target="_blank" rel="noopener" title="' + esc((h ? 'On hold in Yakuri · ' : '') + 'Open ' + d.n + ' in Yakuri') + '">' + text + '</a>'
      + (h && opts.badge !== false ? '<span class="pvx-yk-hold">On hold in Yakuri</span>' : '');
  }
  function orderNote(drug) {
    var d = drug && drug.r ? drug : match(drug); if (!d) return '';
    var open = '<a class="pvx-yk" href="' + url(d.id) + '" target="_blank" rel="noopener">Open in Yakuri</a>';
    if (d.ys === 'Held') return '<div class="pvx-yk-note hold" role="note"><span><b>On hold in Yakuri.</b> ' + esc(d.no) + ' No dose is calculated; enter it yourself.</span>' + open + '</div>';
    if (d.hr) return '<div class="pvx-yk-note hold" role="note"><span><b>' + d.hr + ' of its doses are on hold in Yakuri</b> and aren’t calculated.</span>' + open + '</div>';
    return '<div class="pvx-yk-note" role="note"><span>From Yakuri · no clinical approval yet, so confirm every dose.</span>' + open + '</div>';
  }

  /* ───────── interactions: Yakuri's own check (yakuri-rules.js, the file /yakuri/ runs) ───────── */
  function rules() {
    if (window.YakuriRules) return Promise.resolve(window.YakuriRules);
    if (state.rules) return state.rules;
    state.rules = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = '/yakuri/yakuri-rules.js'; s.async = true;
      s.onload = function () { window.YakuriRules ? res(window.YakuriRules) : rej(new Error('Yakuri’s checker didn’t load.')); };
      s.onerror = function () { state.rules = null; rej(new Error('Yakuri’s checker didn’t load.')); };
      document.head.appendChild(s);
    });
    return state.rules;
  }
  function interactions(drugs, species) {
    return Promise.all([load(), rules()]).then(function (r) {
      var L = r[0], R = r[1];
      if (!L.ev) throw new Error('This Yakuri release has no interaction evidence.');
      var ids = []; drugs.forEach(function (d) { var x = d && d.id ? d : match(d); if (x && ids.indexOf(x.id) < 0) ids.push(x.id); });
      var lib = { drugs: L.drugs.map(function (d) { return { id: d.id, name: d.n, governance: { state: d.ys } }; }) };
      return R.check(lib, { drug_ids: ids.slice(0, 10), species: species }, L.ev);
    });
  }

  window.PvxYakuri = {
    load: load,
    drugs: function () { return load().then(function (L) { return L.drugs; }); },
    ready: function () { return !!state.lib; },
    error: function () { return state.err; },
    release: function () { return state.lib ? { release: state.lib.release, exported_at: state.lib.exported_at, drugs: state.lib.drugs.length } : null; },
    onReady: function (fn) { if (state.lib) { try { fn(state.lib); } catch (e) {} } else state.ready.push(fn); },
    match: match, matchAll: matchAll, url: url, link: link, held: held, orderNote: orderNote, interactions: interactions, fold: fold,
    species: function (s) { s = fold(s); return /^(dog|canine|k9)/.test(s) ? 'dog' : /^(cat|feline)/.test(s) ? 'cat' : null; }
  };
})();
