/* Pravix Anesia (n151) — the page: records list, the shared-clock chart, sheets, and saving.
   Uses window.Anesia (engine.js) for every calculation and every change. Training records only. */
(function () {
  'use strict';   /* PVX-N155: HIG audit fixes */
  var A = window.Anesia, MIN = A.MIN, sig = A.sig, num = A.num;
  var COL = 'anesia_records', TENANT = 'shoreline', LOBBY = ['au733@vca.com'];
  var FB_CONFIG = { apiKey: 'AIzaSyCf8iXW_wWRLvHi1G4YnYRH-iLpaDufZQE', authDomain: 'shoreline-flow.firebaseapp.com', projectId: 'shoreline-flow',
    storageBucket: 'shoreline-flow.firebasestorage.app', messagingSenderId: '237404385636', appId: '1:237404385636:web:1ee3ba27f22c946f748a71' };

  /* Drug list for training cases: common anesthesia drugs at their usual stock concentrations (mg/mL).
     Always check the vial — the concentration can be changed when a drug is first added to a record. No dose ranges are suggested. */
  var LIB = [
    ['Acepromazine', 'drug', 10, 'IV'], ['Alfaxalone', 'drug', 10, 'IV'], ['Atropine', 'drug', 0.54, 'IV'], ['Buprenorphine', 'drug', 0.3, 'IV'],
    ['Butorphanol', 'drug', 10, 'IV'], ['Cefazolin', 'drug', 100, 'IV'], ['Dexmedetomidine', 'drug', 0.5, 'IV'], ['Diazepam', 'drug', 5, 'IV'],
    ['Dobutamine', 'drug', 12.5, 'IV'], ['Dopamine', 'drug', 40, 'IV'], ['Ephedrine', 'drug', 50, 'IV'], ['Fentanyl', 'drug', 0.05, 'IV'],
    ['Glycopyrrolate', 'drug', 0.2, 'IV'], ['Hydromorphone', 'drug', 2, 'IV'], ['Ketamine', 'drug', 100, 'IV'], ['Lidocaine', 'drug', 20, 'IV'],
    ['Maropitant', 'drug', 10, 'IV'], ['Methadone', 'drug', 10, 'IV'], ['Midazolam', 'drug', 5, 'IV'], ['Norepinephrine', 'drug', 1, 'IV'],
    ['Propofol', 'drug', 10, 'IV'],
    ['Lactated Ringer’s', 'fluid', null, 'IV'], ['Plasma-Lyte A', 'fluid', null, 'IV'], ['0.9% sodium chloride', 'fluid', null, 'IV']
  ].map(function (d) { return { name: d[0], kind: d[1], conc: d[2], route: d[3] }; });
  var ROUTES = ['IV', 'IM', 'SC', 'PO', 'Epidural', 'Local'];
  /* Drug classes coloured as the international syringe-label standard (ISO 26825): induction agents yellow, opioids blue,
     benzodiazepines orange, vasopressors violet, local anesthetics grey, anticholinergics green, antiemetics salmon.
     Drugs the standard doesn't group (alpha-2 agonists, phenothiazines, antibiotics) stay neutral. Shown as a dot or an edge, never as the only cue. */
  var CLASS = { induction: 'Induction', opioid: 'Opioid', benzo: 'Benzodiazepine', vaso: 'Vasopressor', local: 'Local anesthetic', anticho: 'Anticholinergic', antiemetic: 'Antiemetic' };
  var CLASS_OF = { propofol: 'induction', alfaxalone: 'induction', ketamine: 'induction', etomidate: 'induction', fentanyl: 'opioid', hydromorphone: 'opioid', methadone: 'opioid', butorphanol: 'opioid', buprenorphine: 'opioid', morphine: 'opioid', remifentanil: 'opioid',
    midazolam: 'benzo', diazepam: 'benzo', dopamine: 'vaso', dobutamine: 'vaso', norepinephrine: 'vaso', ephedrine: 'vaso', phenylephrine: 'vaso', vasopressin: 'vaso', epinephrine: 'vaso', lidocaine: 'local', bupivacaine: 'local', ropivacaine: 'local', mepivacaine: 'local',
    atropine: 'anticho', glycopyrrolate: 'anticho', maropitant: 'antiemetic', ondansetron: 'antiemetic' };
  function drugClass(d) { if (!d) return 'other'; if (d.kind === 'fluid') return 'fluid'; var n = String(d.name || '').toLowerCase().split(/[\s(]/)[0]; return CLASS_OF[n] || 'other'; }
  function classLabel(d) { return CLASS[drugClass(d)] || ''; }
  function dot(d) { return '<i class="an-cdot c-' + drugClass(d) + '" aria-hidden="true"></i>'; }
  var AGENT = { iso: { name: 'Isoflurane', unit: '%', step: 0.25 }, sevo: { name: 'Sevoflurane', unit: '%', step: 0.25 }, o2: { name: 'Oxygen', unit: 'L/min', step: 0.5 } };
  var MON = [['hr', 'HR', 'bpm'], ['rr', 'RR', 'br/min'], ['bp', 'BP', 'SAP/DAP (MAP)'], ['spo2', 'SpO₂', '%'], ['etco2', 'EtCO₂', 'mmHg'], ['temp', 'Temp', '°F']];
  var DUE_MIN = 5;   /* vitals are due every 5 minutes under anesthesia */

  var S = { loaded: false, undoStack: [], redoStack: [], histAll: false, presence: {}, mode: 'local', fb: null, db: null, auth: null, user: null, me: '', ready: false, gate: null,
    server: {}, local: {}, cur: null, fresh: null, opening: null, prevTiles: {}, inspector: null, vOpen: null, vTime: null, keep: {}, undo: null, filter: 'active', colMin: 5, pxCol: 64, pumpNotice: null, toastT: 0, unsubList: null };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return window.__anNow ? window.__anNow() : Date.now(); }
  function fmtTime(t) { return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function fmtDate(t) { return new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
  function hhmm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function dur(ms) { var m = Math.max(0, Math.floor(ms / MIN)); return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  /* amounts: under 1 mg reads as mcg (0.2 mg → 200 mcg) */
  function amt(mg) { if (mg === null || mg === undefined) return '—'; return mg > 0 && mg < 1 ? sig(mg * 1000) + ' mcg' : sig(mg) + ' mg'; }
  function amtKg(mgkg) { if (mgkg === null || mgkg === undefined) return ''; return mgkg > 0 && mgkg < 1 ? sig(mgkg * 1000) + ' mcg/kg' : sig(mgkg) + ' mg/kg'; }
  function conc(c) { if (!c) return ''; return c < 1 ? sig(c * 1000) + ' mcg/mL' : sig(c) + ' mg/mL'; }
  /* ---- Pravix Symbols (n171): one family on a 24-pt grid, drawn to SF Symbols' rules.
     Layers: .s = secondary (hierarchical), .b = body (filled in the fill variant), .bf = fill-only area, .k = detail hidden when filled.
     Weight follows the label's font weight (syncSymbols); size is small / medium / large relative to the text. */
  var SYM = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    heart: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    syringe: '<path class="b s" d="M14.6 4.6l4.8 4.8-9.2 9.2H5.4v-4.8z"/><path d="M17.4 2.6l4 4M19.4 4.6l-2.6 2.6M5.4 18.6l-2.8 2.8"/><path class="s k" d="M12.3 9.1l1.8 1.8M9.7 11.7l1.8 1.8"/>',
    drip: '<path class="b" d="M12 3.2s6.2 6.6 6.2 11.1a6.2 6.2 0 0 1-12.4 0C5.8 9.8 12 3.2 12 3.2z"/><path class="s k" d="M9.3 14.6a2.8 2.8 0 0 0 2.6 2.7"/>',
    output: '<path class="b s" d="M12 3.2s6.2 6.6 6.2 11.1a6.2 6.2 0 0 1-12.4 0C5.8 9.8 12 3.2 12 3.2z"/><path d="M12 10.4v6.2M9.4 14l2.6 2.6 2.6-2.6"/>',
    compose: '<path class="s" d="M11 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13"/><path class="b" d="M17.8 3.7a1.9 1.9 0 0 1 2.7 2.7l-7.6 7.6-3.6.9.9-3.6z"/>',
    airway: '<path d="M10 3v6.5a5.5 5.5 0 0 0 1 3.2L12 14v7M14 3v6.5M8 21h8"/><circle class="b s" cx="12" cy="14" r="2"/>',
    idcheck: '<rect class="b s" x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.4 1.5-2 2.5-2s1.9.6 2.5 2"/><path class="s" d="M14 10h4M14 13.5h3"/>',
    gas: '<rect class="b" x="7.5" y="7" width="9" height="14" rx="3.5"/><path class="s" d="M10 7V5h4v2M12 3v2M9 3h6"/>',
    share: '<path class="s" d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v7A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/><path d="M12 3.5v11M8.2 7.3L12 3.5l3.8 3.8"/>',
    print: '<path class="s" d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    flag: '<path d="M5.5 21V3.5"/><path class="b s" d="M5.5 4h12l-2.6 4.25 2.6 4.25h-12z"/>',
    scale: '<circle cx="12" cy="5" r="2.2"/><path class="b s" d="M7 8.5h10a1.8 1.8 0 0 1 1.75 1.4l1.9 8.1A2 2 0 0 1 18.7 20.5H5.3A2 2 0 0 1 3.35 18l1.9-8.1A1.8 1.8 0 0 1 7 8.5z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    checkd: '<path pathLength="1" class="dr" d="M5 12.5l4.5 4.5L19 7"/>',
    info: '<circle class="b s" cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>',
    sidebar: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path class="bf" d="M14.5 4.5h4A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-4z"/><path d="M14.5 4.5v15"/>',
    stop: '<rect class="b" x="6" y="6" width="12" height="12" rx="2.5"/>',
    pen: '<path class="b" d="M4 20h4L19 9l-4-4L4 16v4z"/><path class="s" d="M13 7l4 4"/>',
    lockd: '<rect class="b s" x="5" y="10.5" width="14" height="10" rx="2.5"/><path pathLength="1" class="dr" d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    timer: '<circle class="b s" cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.2 1.4M10 3h4M12 3v3.5"/>',
    expand: '<path d="M14 4h6v6M20 4l-6.5 6.5M10 20H4v-6M4 20l6.5-6.5"/>',
    collapse: '<path d="M19 10h-5V5M14 10l6-6M5 14h5v5M10 14l-6 6"/>',
    /* vitals: same grid and weight, shown in their fill variant on the tiles */
    'v-hr': '<path class="b" d="M12 20.3s-7.8-4.6-7.8-10.4A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.8-7.8 10.4-7.8 10.4z"/>',
    'v-spo2': '<path class="b" d="M12 3.2s6.2 6.6 6.2 11.1a6.2 6.2 0 0 1-12.4 0C5.8 9.8 12 3.2 12 3.2zM12 12.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 1 0 0-4.8z"/>',
    'v-bp': '<path class="b" d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17zM10.3 13.2l5.3-6.1 1.3 1.1-4.2 6.6a2.1 2.1 0 1 1-2.4-1.6z"/>',
    'v-etco2': '<path d="M12 3v7"/><path class="b" d="M10.6 7.8v5.4c0 3.6-1.6 6.6-4.3 7.2-2 .4-3-1.3-3-3.9 0-4.4 2.5-9.1 4.9-9.1 1.3 0 2.4.2 2.4.4zM13.4 7.8v5.4c0 3.6 1.6 6.6 4.3 7.2 2 .4 3-1.3 3-3.9 0-4.4-2.5-9.1-4.9-9.1-1.3 0-2.4.2-2.4.4z"/>',
    'v-rr': '<path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7"/>',
    'v-temp': '<path class="b" d="M9.5 14.2V5.5a2.5 2.5 0 0 1 5 0v8.7a4.5 4.5 0 1 1-5 0z"/><path class="s k" d="M12 9v7"/>'
  };
  var SYMOPT = {"plus":[1.114,0.01,0.01],"back":[1.18,0.33,0.01],"heart":[1.033,0.2,0.01],"syringe":[0.915,-0.36,0.42],"drip":[0.98,0.06,-0.35],"output":[1.014,0.01,-0.52],"airway":[1.039,0.06,-0.39],"idcheck":[0.941,0.46,-0.07],"gas":[1.007,0.01,-0.31],"share":[1.004,0.01,0.48],"print":[0.893,0.01,-0.89],"close":[1.18,0.01,0.01],"flag":[1.016,1.8,0.61],"scale":[0.95,0.01,0.58],"check":[1.18,-0.01,-0.26],"checkd":[1.18,-0.01,-0.26],"info":[0.947,0.01,-0.07],"sidebar":[0.896,-0.23,0.01],"stop":[1.166,0.01,0.01],"pen":[1.021,0.66,-0.64],"lockd":[1.028,0.01,-0.06],"timer":[0.989,-0.05,0.58],"expand":[0.991,0.01,0.01],"collapse":[1.004,0.01,0.01],"v-hr":[1.0,0.01,-0.33],"v-spo2":[0.957,0.01,-0.52],"v-bp":[0.894,-0.12,-0.07],"v-etco2":[0.89,0.01,-0.47],"v-rr":[0.936,0.24,0.57],"v-temp":[0.961,0.01,-0.96],"compose":[0.95,-1.13,1.03]};   /* [scale, dx, dy] from tests/optical_measure.py */
  var SYMFLIP = { back: 1 };   /* directional symbols mirror in right-to-left layouts */
  var symN = 0;
  /* icon(name, {fill, slash, scale: 's'|'m'|'l', cls}) */
  function icon(n, o) {
    o = o || {}; var d = SYM[n] || '', op = SYMOPT[n];
    if (op && (op[0] !== 1 || op[1] || op[2])) d = '<g class="os" style="--an-os:' + op[0] + '" transform="translate(12 12) scale(' + op[0] + ') translate(-12 -12) translate(' + op[1] + ' ' + op[2] + ')">' + d + '</g>';
    var cls = 'an-ico' + (SYMFLIP[n] ? ' flip' : '') + (o.fill ? ' fill' : '') + (o.slash ? ' slash' : '') + (o.scale ? ' sc-' + o.scale : '') + (o.cls ? ' ' + o.cls : '');
    if (o.slash) { var id = 'anSl' + (++symN); d = '<defs><mask id="' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><path d="M3 3.6l17.4 17.4" stroke="#000" stroke-width="4.6" stroke-linecap="round"/></mask></defs><g mask="url(#' + id + ')">' + d + '</g><path class="sl" d="M4 4l16 16"/>'; }
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  }
  /* weight matching: a symbol's stroke follows the font weight of the label beside it, like SF Symbols */
  var SYMW = { 100: 1.2, 200: 1.3, 300: 1.45, 400: 1.6, 500: 1.8, 600: 2, 700: 2.25, 800: 2.5, 900: 2.7 };
  function symWeightFor(fw) { fw = Math.round((parseInt(fw, 10) || 400) / 100) * 100; return SYMW[Math.min(900, Math.max(100, fw))]; }
  function syncSymbols(root) {
    $$('svg.an-ico', root || document).forEach(function (svg) {
      var host = svg.parentElement; while (host && host.tagName !== 'BUTTON' && host.tagName !== 'A' && host.tagName !== 'LABEL' && !/^(B|STRONG|SPAN|EM|H\d|P|DIV|LI)$/.test(host.tagName)) host = host.parentElement;
      if (!host) return; var w = symWeightFor(getComputedStyle(host).fontWeight);
      if (svg.__w !== w) { svg.style.setProperty('--an-symw', w + 'px'); svg.__w = w; }
    });
  }
  (function () {   /* everything that appears later (sheets, toasts) is matched too, once per frame */
    var q = 0; try { new MutationObserver(function () { if (q) return; q = requestAnimationFrame(function () { q = 0; syncSymbols(); }); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) { }
  })();

  /* ---------------- saving ---------------- */
  /* Each record = {base (last server copy), pending changes}. The screen shows the pending changes replayed on the base.
     A save replays the pending changes on the server copy inside a transaction, so two people charting at once never
     overwrite each other. "Saved" shows only once the server has confirmed (n148). */
  var LKEY = 'anesia:v1:';
  function lsGet(k) { try { var v = localStorage.getItem(LKEY + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(LKEY + k, JSON.stringify(v)); } catch (e) { } }
  function lsDel(k) { try { localStorage.removeItem(LKEY + k); } catch (e) { } }
  function localIndex() { return lsGet('index') || []; }
  function slot(id) {
    if (!S.local[id]) S.local[id] = lsGet('rec:' + id) || { base: null, pending: [] };
    return S.local[id];
  }
  function persistSlot(id) { var s = slot(id); lsSet('rec:' + id, { base: s.base, pending: s.pending }); var ix = localIndex(); if (ix.indexOf(id) < 0) { ix.push(id); lsSet('index', ix); } }
  function replay(base, pending, onDrop) {
    var r = base;
    pending.forEach(function (p) {
      if (p.create) { if (!r) r = JSON.parse(JSON.stringify(p.create)); return; }
      if (!r) return;
      try { r = A.apply(r, p.op, p.ctx); } catch (e) { if (onDrop) onDrop(p, e); }
    });
    return r;
  }
  function recOf(id) {
    var s = slot(id), base = S.mode === 'server' ? (S.server[id] || s.base) : s.base;
    return replay(base, s.pending);
  }
  function allIds() {
    var ids = {}; Object.keys(S.server).forEach(function (k) { ids[k] = 1; });
    localIndex().forEach(function (k) { var s = slot(k); if (S.mode === 'local' || s.pending.length) ids[k] = 1; });
    return Object.keys(ids);
  }

  var save = { state: 'idle', inflight: false, waitT: 0, retryT: 0 };
  function saveChip(st, txt) {
    save.state = st; var el = $('#anSave'); if (!el) return;
    var T = { saving: 'Saving…', saved: 'Saved', offline: 'Offline · saves when connected', error: 'Not saved · retrying', denied: 'Not saved · no access', local: 'Saved on this device' };
    el.textContent = txt || T[st] || '';
    el.classList.toggle('bad', st === 'offline' || st === 'error' || st === 'denied');
    var live = $('#anSaveLive'); if (live) live.textContent = (st === 'offline' || st === 'error' || st === 'denied') ? el.textContent : '';   /* saving stays silent */
  }
  var UNDO = { dose: 'dose', infusion: 'infusion', rate: 'rate', stop: 'stop', gas: 'gas', vitals: 'vitals', event: 'event', weight: 'weight', output: 'output', device: 'device', vent: 'vent', timeout: 'timeout', staff: 'staff' };
  function change(id, op, extra) {
    var s = slot(id), ctx = { by: S.me, at: now() };
    var cur = recOf(id), uk = UNDO[op.type];
    if (uk && uk !== 'stop' && !op.eid) op.eid = A.uid(uk.charAt(0));
    S.fresh = op.eid || op.infusionId || null;   /* the entry just made gets a short appear animation */
    var next = A.apply(cur, op, ctx);   /* throws on anything refused — the sheet shows it */
    if (uk && !(extra && extra.noUndo)) {
      var said = next.audit[next.audit.length - 1].detail;
      var entry = { rid: id, kind: uk, op: JSON.parse(JSON.stringify(op)), uop: { type: 'undo', kind: uk, id: uk === 'stop' ? op.infusionId : op.eid }, label: said === 'Vitals' ? 'Vitals recorded' : said, t: op.at || ctx.at, ts: ctx.at };
      S.undoStack.push(entry); if (S.undoStack.length > 30) S.undoStack.shift();
      if (!(extra && extra.fromRedo)) S.redoStack = [];
      offerUndo(entry.label);
    }
    if (S.mode === 'local') { s.base = next; s.pending = []; persistSlot(id); saveChip('local'); }
    else { s.pending.push({ op: op, ctx: ctx }); persistSlot(id); flush(); }
    if (!extra || !extra.quiet) render();
    return next;
  }
  function createRecord(rec) {
    var s = slot(rec.id);
    if (S.mode === 'local') { s.base = rec; s.pending = []; }
    else { s.base = null; s.pending = [{ create: rec }]; }
    persistSlot(rec.id); if (S.mode === 'server') flush(); else saveChip('local');
  }
  function flush() {
    if (S.mode !== 'server' || save.inflight) return;
    var id = Object.keys(S.local).filter(function (k) { return S.local[k].pending.length; })[0];
    if (!id) { if (save.state !== 'idle') saveChip('saved'); return; }
    var s = slot(id), n = s.pending.length, batch = s.pending.slice(0, n), ref = S.db.collection(COL).doc(id), dropped = [];
    save.inflight = true; if (['offline', 'error', 'denied'].indexOf(save.state) < 0) saveChip('saving');   /* a retry keeps saying why it isn't saved */
    clearTimeout(save.waitT); save.waitT = setTimeout(function () { if (save.inflight) saveChip('offline'); }, 4000);
    S.db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        dropped = [];
        var cur = snap.exists ? snap.data() : null;
        var next = replay(cur, batch, function (p, e) { dropped.push(e.message); });
        if (!next) throw Object.assign(new Error('missing'), { code: 'not-found' });
        tx.set(ref, JSON.parse(JSON.stringify(next)));
        return next;
      });
    }).then(function (next) {
      save.inflight = false; clearTimeout(save.waitT);
      s.pending.splice(0, n); s.base = next; S.server[id] = next; persistSlot(id);
      if (!s.pending.length) lsSet('rec:' + id, { base: next, pending: [] });
      if (dropped.length) toast('A change couldn’t be saved: ' + dropped[0]);
      saveChip('saved'); softRender();
      if (Object.keys(S.local).some(function (k) { return S.local[k].pending.length; })) flush();
    }).catch(function (e) {
      save.inflight = false; clearTimeout(save.waitT);
      var code = e && e.code || '';
      if (code === 'permission-denied') { saveChip('denied'); clearTimeout(save.retryT); save.retryT = setTimeout(flush, 15000); return; }
      saveChip(navigator.onLine === false || code === 'unavailable' ? 'offline' : 'error');
      clearTimeout(save.retryT); save.retryT = setTimeout(flush, 5000);
    });
  }
  window.addEventListener('online', function () { flush(); });

  /* ---------------- start-up and sign-in ---------------- */
  function nameOf(u) {
    if (!u) return '';
    if (u.displayName) return u.displayName;
    return String(u.email || '').split('@')[0].split(/[._]+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  /* n166 — opened inside a Treatment Sheet: ?embed=1&sheet=<sheet id>&pre=<patient from the sheet, JSON> */
  var Q = (function () { var o = {}; location.search.replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); o[decodeURIComponent(kv.slice(0, i < 0 ? kv.length : i))] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); }); return o; })();
  var EMBED = Q.embed === '1', SHEET = Q.sheet || null, PRE = null;
  try { PRE = Q.pre ? JSON.parse(Q.pre) : null; } catch (e) { PRE = null; }
  if (EMBED) {
    document.documentElement.classList.add('an-embed');
    /* the frame's colour scheme must equal the iframe element's, or the browser paints an opaque grey canvas behind the record */
    var syncScheme = function () { try { document.documentElement.style.colorScheme = document.body && document.body.classList.contains('dark') ? 'dark' : 'light'; } catch (e) { } };
    syncScheme(); try { new MutationObserver(syncScheme).observe(document.body, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
  }
  /* Expand (n169): the record fills the window — no top bar, and inside Treatment Sheets no sheet around it */
  var XP = false;
  function setExpanded(on, fromHost) {
    on = !!on; if (on === XP) return;
    var apply = function () {
      XP = on; document.documentElement.classList.toggle('an-expanded', on);
      var b = document.getElementById('anExpand');
      if (b) { b.classList.remove('rep'); void b.offsetWidth; b.classList.add('rep'); setTimeout(function () { b.classList.remove('rep'); }, 450); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Exit expanded view' : 'Expand record'); b.title = on ? 'Exit expanded view (⌥F or Esc)' : 'Expand (⌥F)'; }
    };
    if (EMBED) { if (!fromHost) try { parent.postMessage({ anesia: 'expand', on: on }, location.origin); } catch (e) { } apply(); return; }   /* the sheet animates the frame */
    if (document.startViewTransition && !fromHost) { try { document.startViewTransition(apply); return; } catch (e) { } }
    apply();
  }
  window.addEventListener('message', function (e) { if (e.origin !== location.origin || !e.data || e.data.anesiaHost !== 'expanded') return; setExpanded(e.data.on, true); });
  var autoOpened = false;
  function sheetRecs() { return allIds().map(recOf).filter(function (r) { return r && SHEET && r.sheet_id === SHEET; }).sort(function (a, b) { return (b.start || b.created_at) - (a.start || a.created_at); }); }
  function kindPill(r) { return r.kind === 'case' ? '<span class="an-pill sheet">Treatment sheet</span>' : '<span class="an-pill training">Training</span>'; }
  function boot() {
    /* remembered per device (Launching): zoom and the list filter */
    var z0 = lsGet('zoom'), f0 = lsGet('filter'); if ([5, 10, 15].indexOf(z0) > -1) S.colMin = z0; if (['active', 'ended', 'signed'].indexOf(f0) > -1) S.filter = f0;
    var fb = window.firebase;
    if (!fb || !fb.initializeApp) { S.mode = 'local'; S.me = 'This device'; S.ready = true; route(); return; }
    try { if (!fb.apps.length) fb.initializeApp(FB_CONFIG); S.db = fb.firestore(); S.auth = fb.auth(); } catch (e) { S.mode = 'local'; S.ready = true; route(); return; }
    S.auth.onAuthStateChanged(function (u) {
      S.user = u; S.ready = true;
      if (S.unsubList) { S.unsubList(); S.unsubList = null; }
      if (!u) { S.gate = 'signin'; render(); return; }
      if (LOBBY.indexOf(String(u.email || '').toLowerCase()) > -1) { S.gate = 'lobby'; render(); return; }
      S.gate = null; S.mode = 'server'; S.me = nameOf(u);
      S.unsubList = S.db.collection(COL).where('tenant_id', '==', TENANT).onSnapshot(function (q) {
        var m = {}; q.forEach(function (d) { m[d.id] = d.data(); }); S.server = m; S.loaded = true; softRender();
      }, function (e) { if (e && e.code === 'permission-denied') saveChip('denied'); });
      flush(); route();
    });
  }
  function route() {
    var h = location.hash.replace(/^#/, ''), m = /(?:^|&)r=([\w-]+)/.exec(h);
    if (S.skipHash !== undefined) { var sk = S.skipHash; S.skipHash = undefined; if (sk === h) return; }   /* a morph already rendered this route */
    S.cur = m ? m[1] : null; if (!S.cur || S.cur !== presRec) stopPresence(); render();
    if (S.cur) setTimeout(scrollToNow, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------------- n170 motion helpers ---------------- */
  var MO = { at: {}, from: {}, seg: {} };
  function rmo() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function fire(k) { MO.at[k] = performance.now(); }
  function fired(k) { return MO.at[k] !== undefined; }
  /* a one-shot animation survives re-renders: it resumes where it is (negative delay) and ends on time */
  function playing(k, ms) { var t0 = MO.at[k]; if (t0 === undefined) return null; var e = performance.now() - t0; return e < ms ? Math.round(e) : null; }
  /* the tapped thing grows into what it opens (View Transitions; instant where unsupported) */
  function morph(fromEl, update, to) {
    var clear = function () { $$('.an-vt').forEach(function (x) { x.style.viewTransitionName = ''; x.classList.remove('an-vt'); }); };
    if (!document.startViewTransition || !fromEl || !fromEl.isConnected) { update(); return; }
    clear(); fromEl.style.viewTransitionName = 'an-hero'; fromEl.classList.add('an-vt');
    var vt;
    try {
      vt = document.startViewTransition(function () {
        fromEl.style.viewTransitionName = ''; update();
        var t = typeof to === 'function' ? to() : $(to); if (t) { t.style.viewTransitionName = 'an-hero'; t.classList.add('an-vt'); }
      });
    } catch (e) { clear(); update(); return; }
    vt.finished.then(clear, clear);
  }
  /* rolling numbers: only the characters that changed roll in, upward when the value rose */
  function rollHTML(from, to, ms) {
    var a = String(from || ''), b = String(to), up = parseFloat(b) >= parseFloat(a), n = Math.max(a.length, b.length);
    a = Array(n - a.length + 1).join(' ') + a;
    var pb = Array(n - b.length + 1).join(' ') + b, out = '', k = 0;
    for (var i = 0; i < n; i++) {
      var c = pb[i]; if (c === ' ') continue;
      if (c !== a[i]) { out += '<span class="an-dg ' + (up ? 'up' : 'dn') + '" style="animation-delay:' + ((n - 1 - i) * 35 - ms) + 'ms">' + c + '</span>'; k++; }
      else out += c;
    }
    return out;
  }
  /* the selection pill slides (and stretches) from where it was to the chosen segment */
  function snapSegs() { $$('.an-seg[role=radiogroup]').forEach(function (g) { var pl = $('.an-segpill', g); if (!pl) return; var gr = g.getBoundingClientRect(), r = pl.getBoundingClientRect(); MO.seg[g.getAttribute('aria-label')] = { l: r.left - gr.left, w: r.width }; }); }
  function pillSegs() {
    $$('.an-seg[role=radiogroup]').forEach(function (g) {
      var on = $('[aria-checked="true"]', g); if (!on) return;
      var key = g.getAttribute('aria-label'), pl = document.createElement('span'); pl.className = 'an-segpill'; pl.setAttribute('aria-hidden', 'true');
      g.classList.add('has-pill'); g.insertBefore(pl, g.firstChild);
      var l = on.offsetLeft, w = on.offsetWidth; pl.style.cssText = 'left:0;top:' + on.offsetTop + 'px;height:' + on.offsetHeight + 'px;width:' + w + 'px;transform:translateX(' + l + 'px)';
      var pv = MO.seg[key]; MO.seg[key] = { l: l, w: w };
      if (!pv || Math.abs(pv.l - l) < 1 || rmo() || !pl.animate) return;
      var lo = Math.min(pv.l, l), span = Math.max(pv.l + pv.w, l + w) - lo;
      pl.animate([{ transform: 'translateX(' + pv.l + 'px)', width: pv.w + 'px' }, { transform: 'translateX(' + (lo + (span - (span * .72 + Math.min(pv.w, w) * .28)) / 2) + 'px)', width: (span * .72 + Math.min(pv.w, w) * .28) + 'px', offset: .45 }, { transform: 'translateX(' + l + 'px)', width: w + 'px' }],
        { duration: 520, easing: 'linear(0, 0.04, 0.136, 0.26, 0.391, 0.518, 0.632, 0.73, 0.811, 0.875, 0.924, 0.96, 0.985, 1.002, 1.012, 1.018, 1.02, 1.02, 1.018, 1.016, 1.013, 1.01, 1.008, 1.006, 1.004, 1.003, 1.002, 1.001, 1)' });
    });
  }
  /* the now line glides: it is always aimed at where "now" will be at the next tick, so it moves continuously */
  var TICK = 15000;
  function glideNow() {
    var nl = $('.an-now'), cm = S.cm; if (!nl || !cm) return;
    var base = parseFloat(nl.style.left) || 0, t = now();
    if (rmo()) { nl.style.transition = 'none'; nl.style.transform = 'translateX(' + Math.round((t - cm.from) * cm.px - base) + 'px)'; return; }
    nl.style.transform = 'translateX(' + ((t + TICK - cm.from) * cm.px - base).toFixed(1) + 'px)';
  }

  /* ---------------- render ---------------- */
  var lastScroll = 0;
  function render(soft) {
    var root = $('#anApp'); if (!root) return;
    if (!S.ready) { root.innerHTML = '<div class="an-loading" role="status"><span class="an-spin" aria-hidden="true"></span>Loading…</div>'; return; }
    if (S.gate) { root.innerHTML = gateHTML(); bindGate(); if (EMBED) $$('.an-gate a').forEach(function (x) { x.target = '_top'; }); return; }
    if (XP && !S.cur) setExpanded(false);   /* Expand belongs to a record; the list never stays expanded */
    var ch = $('.an-chart'); if (ch) lastScroll = ch.scrollLeft;
    snapSegs();
    var fk = root.contains(document.activeElement) ? keyOf(document.activeElement) : null;
    if (S.vOpen) $$('[data-keep] input', root).forEach(function (el) { if (el.id) S.keep[el.id] = { v: el.value, filled: el.classList.contains('filled') }; });
    var tbOpen = $('[data-vtimebox]', root) && !$('[data-vtimebox]', root).hidden;
    if (S.cur) {
      var rec = recOf(S.cur);
      if (!rec && S.mode === 'server' && !S.loaded) { root.innerHTML = '<div class="an-loading" role="status"><span class="an-spin" aria-hidden="true"></span>Loading the record…</div>'; return; }
      if (!rec) { root.innerHTML = '<div class="an-gate"><h1>Record not found</h1><p>It may still be loading, or it was opened from another hospital.</p><a class="an-btn primary" href="#">All records</a></div>'; return; }
      root.innerHTML = recordHTML(rec); bindRecord(rec);
      var c2 = $('.an-chart'); if (c2) { c2.scrollLeft = lastScroll; c2.addEventListener('scroll', function () { if (!stickRaf) stickRaf = requestAnimationFrame(stickLabels); }, { passive: true }); stickLabels(); }
    } else { root.innerHTML = listHTML(); bindList(); }
    Object.keys(S.keep).forEach(function (id) { var el = document.getElementById(id); if (el && S.keep[id]) { el.value = S.keep[id].v; el.classList.toggle('filled', !!S.keep[id].filled); } });
    if (tbOpen && $('[data-vtimebox]', root)) $('[data-vtimebox]', root).hidden = false;
    if (S.fresh && $('.fresh', root)) { var fz = S.fresh; setTimeout(function () { if (S.fresh === fz) S.fresh = null; }, 700); }
    if (fk && !$('#anSheet')) { var fe = $(fk, root); if (fe) try { fe.focus({ preventScroll: true }); } catch (e) { } }
    S.shownSig = sigOf(); S.dirtyUi = false; afterRender();
    if (!soft) { var st = save.state; saveChip(S.mode === 'local' ? 'local' : st === 'idle' ? 'saved' : st); }
    else saveChip(S.mode === 'local' ? 'local' : save.state === 'idle' ? 'saved' : save.state);
  }

  function gateHTML() {
    if (S.gate === 'lobby') return '<div class="an-gate"><h1 id="anGateT">This is the lobby screen account</h1><p>Anesia needs your own Pravix account. Sign in with it on Flow, then come back to this page.</p><button type="button" class="an-btn primary" id="anGateOwn">Sign in with my own account</button></div>';
    return '<div class="an-gate"><h1 id="anGateT">Sign in to use Anesia</h1><p>Anesia uses your Pravix account. Sign in on Flow and you’ll come straight back here.</p><a class="an-btn primary" href="' + esc(signInURL()) + '">Sign in on Flow</a></div>';
  }
  function signInURL() { return 'https://shoreline.pravix.app/?next=' + encodeURIComponent(location.pathname + location.hash); }
  function bindGate() { var b = $('#anGateOwn'); if (b) b.onclick = function () { S.auth.signOut().then(function () { location.href = signInURL(); }); }; }

  /* ----- list ----- */
  function devShort(d) { return { ett: 'ET tube', sga: 'Supraglottic airway', mask: 'Face mask', iv: 'IV catheter', art: 'Arterial line', urinary: 'Urinary catheter', epidural: 'Epidural catheter', other: 'Other' }[d.kind] || d.kind; }
  function ventBits(v) { var o = []; if (v.tv !== undefined) o.push(['Tidal volume', sig(v.tv) + ' mL', 'TV ' + sig(v.tv)]); if (v.rate !== undefined) o.push(['Rate', sig(v.rate) + ' br/min', 'RR ' + sig(v.rate)]); if (v.peep !== undefined) o.push(['PEEP', sig(v.peep) + ' cmH₂O', 'PEEP ' + sig(v.peep)]); if (v.pip !== undefined) o.push(['Peak pressure', sig(v.pip) + ' cmH₂O', 'PIP ' + sig(v.pip)]); return o; }
  function abxState(a, t, live) {
    if (!a.redoseMin) return { cls: 'unset', txt: 'Set timer', aria: 'No redose interval set. Set one' };
    if (!live) return { cls: 'ok', txt: 'every ' + sig(a.redoseMin) + ' min', aria: 'Redose every ' + a.redoseMin + ' minutes' };
    var m = Math.ceil((a.dueAt - t) / MIN);
    if (m > 10) return { cls: 'ok', txt: 'in ' + m + ' min', aria: 'Redose in ' + m + ' minutes' };
    if (m > 0) return { cls: 'due', txt: 'Due in ' + m + ' min', aria: 'Redose due in ' + m + ' minutes' };
    if (m > -1) return { cls: 'due', txt: 'Due now', aria: 'Redose due now' };
    return { cls: 'late', txt: -m + ' min late', aria: 'Redose ' + (-m) + ' minutes late' };
  }
  function teamNames(r, t) { var n = [r.team.resident, r.team.supervisor].filter(Boolean); A.staffOn(r, t).forEach(function (x) { if (n.indexOf(x.name) < 0) n.push(x.name); }); return n; }
  function abxSheet(r, drugId) {
    var d = A.drug(r, drugId) || {}, a = A.abxStatus(r, now()).filter(function (x) { return x.drugId === drugId; })[0];
    openSheet({
      title: d.name + ' redose', primary: 'Save', quiet: true,
      body: (a ? '<dl class="an-dl"><dt>Last dose</dt><dd>' + esc(fmtTime(a.last)) + '</dd><dt>Doses so far</dt><dd>' + a.doses + '</dd></dl>' : '') +
        '<div class="an-f"><label for="aI">Redose every</label><div class="an-unit"><input class="an-in an-tnum" id="aI" name="min" inputmode="numeric" autocomplete="off" value="' + (d.redoseMin ? sig(d.redoseMin) : '') + '"><span class="u">min</span></div><span class="hint">Use your hospital’s protocol. Anesia has no built-in interval; leave it empty to turn the timer off.</span></div>' +
        '<label class="an-check"><input type="checkbox" name="abx" checked>Count ' + esc(d.name) + ' as an antibiotic</label>' +
        '<button type="button" class="an-btn plain" data-give style="align-self:flex-start">Give a dose now</button>',
      init: function (w) { $('[data-give]', w).onclick = function () { closeSheet(true); doseSheet(r); }; },
      submit: function (w) { change(r.id, { type: 'redose', drugId: drugId, min: val(w, 'min').trim(), abx: val(w, 'abx') }); }
    });
  }
  function airwaySheet(r, tab) {
    var DK = [['ett', 'ET tube'], ['sga', 'Supraglottic'], ['mask', 'Face mask'], ['iv', 'IV catheter'], ['art', 'Arterial line'], ['urinary', 'Urinary catheter'], ['epidural', 'Epidural'], ['other', 'Other']];
    var vn = A.ventAt(r, now()) || {}, isV = tab === 'vent';
    openSheet({
      title: 'Airway & lines', primary: 'Add', quiet: true,
      body: '<div class="an-seg an-atabs" role="radiogroup" aria-label="Record" data-rove="radio"><button type="button" role="radio" data-atab="dev" aria-checked="' + !isV + '">Airway &amp; lines</button><button type="button" role="radio" data-atab="vent" aria-checked="' + isV + '">Ventilation</button></div>' +
        '<div data-pane="dev"' + (isV ? ' hidden' : '') + '><div class="an-f"><span class="lab">What</span>' + chips('kind', DK, '') + '</div>' +
        '<div class="an-two"><div class="an-f"><label for="dvS">Size</label><input class="an-in" id="dvS" name="size" maxlength="30" autocomplete="off"><span class="hint" data-shint>For example 7.5 mm, 20 G or 8 Fr.</span></div>' +
        '<div class="an-f" data-cuffbox hidden><span class="lab">Cuff</span>' + chips('cuff', [['cuffed', 'Cuffed'], ['uncuffed', 'Uncuffed']], '') + '</div>' +
        '<div class="an-f" data-sitebox><label for="dvP">Site</label><input class="an-in" id="dvP" name="site" maxlength="60" autocomplete="off" placeholder="Left cephalic"></div></div>' +
        '<div class="an-f"><label for="dvN">Note</label><input class="an-in" id="dvN" name="note" maxlength="200" autocomplete="off"></div></div>' +
        '<div data-pane="vent"' + (isV ? '' : ' hidden') + '><div class="an-f"><span class="lab">Mode</span>' + chips('mode', Object.keys(A.VENT).map(function (k) { return [k, A.VENT[k]]; }), '') + '</div>' +
        '<div class="an-vgrid an-vset" data-vset hidden>' + [['tv', 'Tidal volume', 'mL'], ['rate', 'Rate', 'br/min'], ['peep', 'PEEP', 'cmH₂O'], ['pip', 'Peak', 'cmH₂O']].map(function (f) { return '<label class="an-vf" for="vs_' + f[0] + '"><span>' + f[1] + ' <i>' + f[2] + '</i></span><input class="an-in an-tnum" id="vs_' + f[0] + '" name="' + f[0] + '" inputmode="decimal" autocomplete="off" value="' + (vn[f[0]] !== undefined ? sig(vn[f[0]]) : '') + '"></label>'; }).join('') + '</div>' +
        (vn.mode ? '<p class="hint" style="margin:0">Now: ' + esc(A.VENT[vn.mode]) + '</p>' : '') + '</div>' + timeField(now()),
      focus: isV ? '[data-chips=mode] .an-chip' : '[data-chips=kind] .an-chip',
      init: function (w) {
        bindTime(w);
        bindChips(w, function (name, v) {
          if (name === 'kind') { var air = v === 'ett' || v === 'sga'; $('[data-cuffbox]', w).hidden = !air; $('[data-sitebox]', w).hidden = air || v === 'mask'; $('[data-shint]', w).textContent = air ? 'Inner diameter, for example 7.5 mm.' : v === 'iv' || v === 'art' ? 'Gauge, for example 20 G.' : v === 'urinary' ? 'French size, for example 8 Fr.' : 'Optional.'; }
          if (name === 'mode') $('[data-vset]', w).hidden = v === 'spont';
        });
        var tabs = $$('[data-atab]', w); tabs.forEach(function (b) { b.onclick = function () { var v2 = b.getAttribute('data-atab') === 'vent'; tabs.forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); }); $('[data-pane=dev]', w).hidden = v2; $('[data-pane=vent]', w).hidden = !v2; w.dataset.tab = v2 ? 'vent' : 'dev'; var ok = $('[data-ok]', w); if (ok) ok.textContent = v2 ? 'Set' : 'Add'; }; });
        w.dataset.tab = isV ? 'vent' : 'dev'; if (isV) { var ok0 = $('[data-ok]', w); if (ok0) ok0.textContent = 'Set'; }
      },
      submit: function (w) {
        if (w.dataset.tab === 'vent') {
          if (!val(w, 'mode')) bad('Choose the ventilation mode.');
          var op = { type: 'vent', mode: val(w, 'mode'), at: readTime(w, r), eid: A.uid('v') };
          if (op.mode !== 'spont') ['tv', 'rate', 'peep', 'pip'].forEach(function (k) { var x = val(w, k).trim(); if (x) op[k] = x; });
          try { change(r.id, op); } catch (e) { if (e.code && /^(tv|rate|peep|pip)$/.test(e.code)) e.field = e.code; throw e; }
          return;
        }
        if (!val(w, 'kind')) bad('Choose the airway or line.');
        change(r.id, { type: 'device', kind: val(w, 'kind'), size: val(w, 'size'), cuff: val(w, 'cuff'), site: val(w, 'site'), note: val(w, 'note'), at: readTime(w, r), eid: A.uid('d') });
      }
    });
  }
  function deviceSheet(r, id, anchor) {
    var d = (r.devices || []).filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var rows = [['Type', A.DEVICES[d.kind]]]; if (d.size) rows.push(['Size', d.size]); if (d.cuff) rows.push(['Cuff', d.cuff === 'cuffed' ? 'Cuffed' : 'Uncuffed']); if (d.site) rows.push(['Site', d.site]); if (d.note) rows.push(['Note', d.note]);
    rows.push(['Placed', fmtTime(d.at) + ' · ' + d.by]); if (d.end) rows.push(['Removed', fmtTime(d.end) + ' · ' + (d.endBy || '')]);
    if (d.void) rows.push(['Struck through', d.void.reason + ' · ' + d.void.by + ', ' + fmtTime(d.void.at)]);
    var can = r.status !== 'signed' && !d.void;
    openSheet({
      title: devShort(d), primary: null, focus: '[data-x]', anchor: anchor,
      body: '<dl class="an-dl">' + rows.map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl>' +
        (can ? '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' + (d.end ? '' : '<button type="button" class="an-btn" data-remove>Removed…</button>') + '<button type="button" class="an-btn danger" data-void>Strike through…</button></div>' : ''),
      init: function (w) {
        var rm = $('[data-remove]', w); if (rm) rm.onclick = function () { closeSheet(true); timeSheet(r, 'Remove ' + devShort(d).toLowerCase(), 'Removed', function (t) { change(r.id, { type: 'remove', deviceId: d.id, at: t }); }); };
        var vb = $('[data-void]', w); if (vb) vb.onclick = function () { voidSheet(r, 'device', d.id, devShort(d)); };
      }
    });
    var xb = $('#anSheet [data-x]'); if (xb) xb.textContent = 'Close';
  }
  function timeoutHelp(r, k) {
    var p = r.patient, w = A.weightAt(r, now()), a = A.abxStatus(r, now());
    return { identity: p.name + (w ? ' · ' + sig(w) + ' kg' : ' · no weight'), procedure: r.procedure || 'No procedure entered', code: p.cpr || 'Code status not recorded', allergies: p.allergies || (p.nka ? 'None known' : 'Not recorded'),
      abx: a.length ? a.map(function (x) { return x.name + ' ' + fmtTime(x.last); }).join(', ') : 'None given yet' }[k] || '';
  }
  function timeoutSheet(r) {
    var last = A.timeoutStatus(r), done = last ? (r.timeouts.filter(function (x) { return x.id === last.id; })[0] || {}).items || [] : [];
    openSheet({
      title: 'Time-out', primary: 'Save time-out',
      body: '<p style="margin:0;color:var(--an-ink-3)">Read each item out with the team before incision. Check only what was confirmed out loud.</p>' +
        '<div class="an-tolist">' + A.TIMEOUT.map(function (i) { var h = timeoutHelp(r, i[0]); return '<label class="an-check an-toi"><input type="checkbox" name="to_' + i[0] + '"' + (done.indexOf(i[0]) >= 0 ? ' checked' : '') + '><span>' + esc(i[1]) + (h ? '<small>' + esc(h) + '</small>' : '') + '</span></label>'; }).join('') + '</div>' +
        '<div class="an-f"><label for="toN">Note</label><input class="an-in" id="toN" name="note" maxlength="300" autocomplete="off"></div>' + timeField(now()),
      init: bindTime,
      submit: function (w) { change(r.id, { type: 'timeout', items: A.TIMEOUT.map(function (i) { return i[0]; }).filter(function (k) { return val(w, 'to_' + k); }), note: val(w, 'note'), at: readTime(w, r), eid: A.uid('t') }); }
    });
  }
  function timeoutView(r) {
    var to = A.timeoutStatus(r); if (!to) return;
    openSheet({ title: 'Time-out', primary: null, focus: '[data-x]', body: '<dl class="an-dl"><dt>Done</dt><dd>' + esc(fmtTime(to.at) + ' · ' + to.by) + '</dd><dt>Not done</dt><dd>' + esc(to.open.join(', ') || 'Nothing — complete') + '</dd></dl>' });
    var xb = $('#anSheet [data-x]'); if (xb) xb.textContent = 'Close';
  }
  function teamSheet(r) {
    var t = now(), ro = r.status === 'signed', st = (r.staff || []).filter(function (x) { return !x.void; }).sort(function (a, b) { return a.from - b.from; });
    var meIn = teamNames(r, t).indexOf(S.me) >= 0;
    var list = '<ul class="an-team"><li><span><b>' + esc(r.team.resident || '—') + '</b><small>Resident</small></span></li><li><span><b>' + esc(r.team.supervisor || '—') + '</b><small>Supervisor</small></span></li>' +
      st.map(function (x) { return '<li class="' + (x.to ? 'gone' : '') + '"><span><b>' + esc(x.name) + '</b><small>' + esc(A.ROLES[x.role]) + ' · ' + esc(fmtTime(x.from)) + (x.to ? '–' + esc(fmtTime(x.to)) : ' – now') + '</small></span>' + (!x.to && !ro ? '<button type="button" class="an-btn plain sm" data-hand="' + x.id + '">Hand off</button>' : '') + '</li>'; }).join('') + '</ul>';
    openSheet({
      title: 'Team', primary: ro ? null : 'Add', quiet: true,
      body: list + (ro ? '' : '<div class="an-f"><span class="lab">Add someone</span><div class="an-two"><div class="an-f"><label for="tmN">Name</label><input class="an-in" id="tmN" name="name" maxlength="80" autocomplete="off" value="' + (meIn ? '' : esc(S.me)) + '"></div>' +
        '<div class="an-f"><span class="lab">Role</span>' + chips('role', Object.keys(A.ROLES).map(function (k) { return [k, A.ROLES[k]]; }), meIn ? '' : 'resident') + '</div></div></div>' + timeField(t, 'Joined')),
      init: function (w) { bindTime(w); bindChips(w); $$('[data-hand]', w).forEach(function (b) { b.onclick = function () { var x = st.filter(function (y) { return y.id === b.getAttribute('data-hand'); })[0]; closeSheet(true); handoffSheet(r, x); }; }); },
      submit: function (w) { if (!val(w, 'name').trim()) bad('Enter the name.', 'name'); if (!val(w, 'role')) bad('Choose the role.'); change(r.id, { type: 'staff', name: val(w, 'name'), role: val(w, 'role'), at: readTime(w, r), eid: A.uid('s') }); }
    });
    if (ro) { var xb = $('#anSheet [data-x]'); if (xb) xb.textContent = 'Close'; }
  }
  function handoffSheet(r, x) {
    openSheet({
      title: 'Hand off ' + x.name, primary: 'Hand off',
      body: '<div class="an-f"><label for="hoN">Taking over</label><input class="an-in" id="hoN" name="name" maxlength="80" autocomplete="off" placeholder="Name"><span class="hint">Same role (' + esc(A.ROLES[x.role].toLowerCase()) + '). Leave empty if nobody takes over.</span></div>' + timeField(now()),
      init: bindTime,
      submit: function (w) { change(r.id, { type: 'handoff', staffId: x.id, name: val(w, 'name'), at: readTime(w, r) }); }
    });
  }
  function caseLogHTML(r) {
    var devs = (r.devices || []).filter(function (d) { return !d.void; }), vents = (r.vents || []).filter(function (v) { return !v.void; }), to = A.timeoutStatus(r), st = (r.staff || []).filter(function (x) { return !x.void; });
    if (!devs.length && !vents.length && !to && !st.length) return '';
    var li = function (time, txt) { return '<li><time>' + esc(time) + '</time><span>' + txt + '</span></li>'; };
    return '<section class="an-panel"><h3>Airway, team &amp; time-out</h3><ul class="an-hist">' +
      (to ? li(fmtTime(to.at), 'Time-out ' + (to.complete ? 'complete' : '— not done: ' + esc(to.open.join(', '))) + '<small>' + esc(to.by) + '</small>') : '') +
      devs.map(function (d) { return li(fmtTime(d.at), esc(devShort(d) + ' ' + [d.size, d.cuff, d.site].filter(Boolean).join(', ')) + '<small>' + (d.end ? 'Removed ' + esc(fmtTime(d.end)) : 'In place') + '</small>'); }).join('') +
      vents.map(function (v) { return li(fmtTime(v.at), esc(['Ventilation: ' + A.VENT[v.mode]].concat(ventBits(v).map(function (b) { return b[2]; })).join(' · '))); }).join('') +
      st.map(function (x) { return li(fmtTime(x.from), esc(A.ROLES[x.role] + ' ' + x.name) + '<small>' + (x.to ? 'Left ' + esc(fmtTime(x.to)) : 'On the case') + '</small>'); }).join('') + '</ul></section>';
  }
  function confirmChip(r) {
    if (!A.isConfirmed(r)) return '<button type="button" class="an-pill unconf" id="anConfirm">Not confirmed</button>';
    if (!r.confirmed) return '';   /* records from before n161 */
    var pc = playing('conf:' + r.id, 900);
    return '<span class="an-pill conf' + (pc !== null ? ' drawn' : '') + '"' + (pc !== null ? ' style="--an-d:-' + pc + 'ms"' : '') + ' title="Confirmed by ' + esc(r.confirmed.by) + ' at ' + esc(fmtTime(r.confirmed.at)) + '">' + icon('checkd', { scale: 's' }) + 'Confirmed</span>';
  }
  /* the patient summary under the name: code status, allergies, ASA, procedure — always on screen */
  function summaryHTML(r) {
    var p = r.patient, ro = r.status === 'signed', tag = function (cls, k, v, aria) { return '<button type="button" class="an-sum-i ' + cls + '" data-sum aria-label="' + esc(aria) + '"><span class="k">' + k + '</span><span class="v">' + v + '</span></button>'; };
    var code = p.cpr === 'DNR' ? tag('dnr', 'Code', 'DNR', 'Code status: do not resuscitate') : p.cpr === 'CPR' ? tag('cpr', 'Code', 'CPR', 'Code status: CPR') : tag('none', 'Code', 'Not recorded', 'Code status not recorded. Add it');
    var alg = p.allergies ? tag('alg', 'Allergies', esc(p.allergies), 'Allergies: ' + p.allergies) : p.nka ? tag('nka', 'Allergies', 'None known', 'No known allergies') : tag('none', 'Allergies', 'Not recorded', 'Allergies not recorded. Add them');
    var asa = p.asa ? tag('', 'ASA', esc(p.asa + (p.emergency ? 'E' : '')), 'ASA ' + p.asa + (p.emergency ? ' emergency' : '')) : '';
    var pr = r.procedure ? tag('proc', 'Procedure', esc(r.procedure), 'Procedure: ' + r.procedure) : '';
    var to = A.timeoutStatus(r), tmo = to ? (to.complete ? tag('cpr', 'Time-out', 'Done ' + esc(fmtTime(to.at)), 'Time-out done at ' + fmtTime(to.at)) : tag('alg', 'Time-out', to.open.length + ' not done', 'Time-out: ' + to.open.length + ' items not done')) : (r.status === 'planned' || r.status === 'active' ? tag('none', 'Time-out', 'Not done', 'Time-out not done yet. Do it') : '');
    var tn = teamNames(r, now()), me = S.me && tn.indexOf(S.me) < 0 && (r.status === 'planned' || r.status === 'active');
    var team = me ? tag('alg', 'Team', 'You’re not on it', 'You are not listed on the team. Add yourself') : tag('', 'Team', String(tn.length), 'Team: ' + tn.join(', '));
    return '<div class="an-sum' + (ro ? ' ro' : '') + '" role="group" aria-label="Patient summary">' + code + alg + asa + pr + tmo.replace('data-sum', 'data-sto') + team.replace('data-sum', 'data-steam') + '</div>';
  }
  function confirmSheet(r, then) {
    var p = r.patient, w = A.weightAt(r, now()), lw = lastWeighed(r);
    var rows = [['Species', [cap(p.species), p.breed, p.sex, p.age].filter(Boolean).join(' · ')], ['Weight', w ? sig(w) + ' kg' + (lw && lw.method === 'estimated' ? ' (estimated)' : '') : 'No weight yet'], ['Procedure', r.procedure || 'Not entered'],
      ['Code status', p.cpr || 'Not recorded'], ['Allergies', p.allergies || (p.nka ? 'None known' : 'Not recorded')]];
    openSheet({
      title: 'Confirm patient', primary: 'Confirm patient',
      body: '<div class="an-cfm"><span class="ic" aria-hidden="true">' + icon('idcheck') + '</span><b>' + esc(p.name) + '</b><small>Check this against the patient’s cage card or ID band.</small></div>' +
        '<dl class="an-dl">' + rows.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' +
        '<button type="button" class="an-btn plain" data-cedit style="align-self:flex-start">Something’s wrong — edit details</button>',
      init: function (wr) { $('[data-cedit]', wr).onclick = function () { closeSheet(true); patientSheet(r); }; },
      submit: function () { fire('conf:' + r.id); change(r.id, { type: 'confirm' }); if (then) setTimeout(function () { var r2 = recOf(r.id); if (r2) then(r2); }, 60); }
    });
  }
  /* charting waits for the patient to be confirmed: the action asks first, then carries on */
  function needConfirm(r, go) { if (A.isConfirmed(r) || r.status === 'signed') return go(r); confirmSheet(r, go); }
  function outputSheet(r) {
    var opts = Object.keys(A.OUTPUTS).map(function (k) { return [k, A.OUTPUTS[k]]; });
    openSheet({
      title: 'Output', primary: 'Add', quiet: true,
      body: '<div class="an-f"><span class="lab">What was measured</span>' + chips('kind', opts, '') + '</div>' +
        '<div class="an-f"><label for="oV">Volume</label><div class="an-unit"><input class="an-in an-tnum" id="oV" name="mL" inputmode="decimal" autocomplete="off" enterkeyhint="done"><span class="u">mL</span></div><span class="hint">For blood loss, include suction and weighed sponges.</span></div>' +
        '<div class="an-f"><label for="oN">Note</label><input class="an-in" id="oN" name="note" maxlength="200" autocomplete="off"></div>' + timeField(now()),
      focus: '.an-chip', init: function (w) { bindTime(w); bindChips(w); },
      submit: function (w) {
        if (!val(w, 'kind')) bad('Choose what was measured.');
        var ml = num(val(w, 'mL')); if (ml === null || ml <= 0) bad('Enter the volume in mL.', 'mL');
        change(r.id, { type: 'output', kind: val(w, 'kind'), mL: ml, note: val(w, 'note'), at: readTime(w, r), eid: A.uid('o') });
      }
    });
  }
  function balanceHTML(r, t) {
    var b = A.balance(r, t), w = A.weightAt(r, t), sgn = function (x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + sig(Math.abs(x)); };
    if (!b.inTotal && !b.outTotal) return '';
    var line = function (k, v, sub2) { return '<tr><td>' + k + '</td><td>' + sig(v) + ' mL</td><td>' + (sub2 || '') + '</td></tr>'; };
    return '<section class="an-panel an-bal"><h3>Fluid balance <small>' + (r.end ? 'whole case' : 'so far') + '</small></h3><table class="an-tot"><tbody>' +
      '<tr class="hd"><th scope="rowgroup" colspan="3">In</th></tr>' + line('Fluids', b.fluids) + (b.drugs ? line('Drug volumes', b.drugs) : '') +
      '<tr class="hd"><th scope="rowgroup" colspan="3">Out</th></tr>' + line('Blood loss', b.out.ebl) + line('Urine', b.out.urine, b.urineRate !== null ? sig(b.urineRate) + ' mL/kg/h' : '') + (b.out.other ? line('Other', b.out.other) : '') +
      '<tr class="net"><td>Net</td><td>' + sgn(b.net) + ' mL</td><td>' + (w ? sgn(b.net / w) + ' mL/kg' : '') + '</td></tr></tbody></table></section>';
  }
  function statusPill(r) {
    if (r.status === 'active') return '<span class="an-pill active">Under anesthesia</span>';
    if (r.status === 'signed') return '<span class="an-pill signed">Signed</span>';
    if (r.status === 'ended') return '<span class="an-pill warn">Ended · not signed</span>';
    return '<span class="an-pill">Planned</span>';
  }
  function sheetListHTML() {
    var recs = sheetRecs(), nm = (PRE && PRE.name) || 'this patient';
    if (!autoOpened && (S.mode !== 'server' || S.loaded)) { autoOpened = true; var openOne = recs.filter(function (r) { return r.status === 'planned' || r.status === 'active'; })[0]; if (openOne) setTimeout(function () { location.hash = 'r=' + openOne.id; }, 0); }
    var cards = recs.map(function (r) { var w = A.weightAt(r, now());
      return '<li><button type="button" class="an-card" data-open="' + esc(r.id) + '"><span class="t"><b>' + esc(r.procedure || 'Anesthesia') + '</b>' + statusPill(r) + '</span><span class="s">' + esc(r.start ? fmtDate(r.start) + ' · ' + fmtTime(r.start) + (r.end ? '–' + fmtTime(r.end) : '') : 'Created ' + fmtDate(r.created_at)) + (w ? ' · ' + sig(w) + ' kg' : '') + '</span><span class="m">' + esc(r.team.resident || '') + (r.team.supervisor ? ' · ' + esc(r.team.supervisor) : '') + '</span></button></li>'; }).join('');
    return '<header class="an-lhead an-shead"><div><h2>Anesthesia</h2><p>' + (recs.length ? recs.length + (recs.length === 1 ? ' record' : ' records') + ' for ' + esc(nm) : 'No anesthesia record for ' + esc(nm) + ' yet') + '</p></div>' +
      '<button type="button" class="an-btn primary" id="anNew">' + icon('plus') + 'Start anesthesia record</button></header>' +
      (S.mode === 'server' && !S.loaded ? '<ul class="an-list" aria-busy="true"><li><div class="an-skel" aria-hidden="true"><i></i><i></i><i></i></div></li></ul>'
        : recs.length ? '<ul class="an-list">' + cards + '</ul>' : '<div class="an-empty"><b>Ready when ' + esc(nm) + ' goes under</b>Start a record and the patient’s name, weight, code status and allergies come from this treatment sheet.</div>') +
      '<p class="an-save an-vh" id="anSave"></p><p class="an-vh" role="status" id="anSaveLive"></p>';
  }
  function listHTML() {
    if (SHEET) return sheetListHTML();
    var recs = allIds().map(recOf).filter(Boolean);
    var F = { active: function (r) { return r.status === 'planned' || r.status === 'active'; }, ended: function (r) { return r.status === 'ended'; }, signed: function (r) { return r.status === 'signed'; } };
    var counts = { active: recs.filter(F.active).length, ended: recs.filter(F.ended).length, signed: recs.filter(F.signed).length };
    var shown = recs.filter(F[S.filter]).sort(function (a, b) { return (b.start || b.created_at) - (a.start || a.created_at); });
    var tab = function (k, l) { return '<button type="button" role="radio" data-f="' + k + '" aria-checked="' + (S.filter === k) + '" tabindex="' + (S.filter === k ? 0 : -1) + '">' + l + (counts[k] ? ' · ' + counts[k] : '') + '</button>'; };
    var cards = shown.map(function (r) {
      var w = A.weightAt(r, now()), p = r.patient;
      return '<li><button type="button" class="an-card" data-open="' + esc(r.id) + '"><span class="t"><b>' + esc(p.name || 'Unnamed training patient') + '</b>' + statusPill(r) + '</span>' +
        '<span class="s">' + esc([cap(p.species), p.breed].filter(Boolean).join(' · ')) + (w ? ' · ' + sig(w) + ' kg' : ' · <span style="color:var(--an-amber-ink);font-weight:600">No weight</span>') + '</span>' +
        '<span class="s">' + esc(r.procedure || 'No procedure entered') + '</span>' +
        '<span class="m">' + kindPill(r) + esc(r.start ? fmtDate(r.start) + ' · ' + fmtTime(r.start) : 'Created ' + fmtDate(r.created_at)) + (r.team.resident ? ' · ' + esc(r.team.resident) : '') + '</span></button></li>';
    }).join('');
    var empty = { active: ['No training cases in progress', 'Start a new training record for the case you are about to anesthetize.'], ended: ['Nothing waiting to be signed', 'Ended records appear here until they are signed.'], signed: ['No signed records yet', 'Signed records stay here, read-only.'] }[S.filter];
    return '<header class="an-lhead"><div><h1>Anesia</h1><p>Anesthesia records for training cases. They are not part of the medical record.</p></div>' +
      '<button type="button" class="an-btn primary" id="anNew">' + icon('plus') + 'New training record</button></header>' +
      (S.mode === 'local' ? '<div class="an-banner info"><span><b>Preview.</b> Records are saved on this device only.</span></div>' : '') +
      '<div class="an-seg" role="radiogroup" aria-label="Show records" data-rove="radio">' + tab('active', 'In progress') + tab('ended', 'To sign') + tab('signed', 'Signed') + '</div>' +
      (S.mode === 'server' && !S.loaded ? '<ul class="an-list" aria-busy="true" aria-label="Loading records">' + [1, 2, 3].map(function () { return '<li><div class="an-skel" aria-hidden="true"><i></i><i></i><i></i></div></li>'; }).join('') + '</ul><p class="an-vh" role="status">Loading records…</p>'
        : shown.length ? '<ul class="an-list">' + cards + '</ul>' : '<div class="an-empty"><b>' + empty[0] + '</b>' + empty[1] + '</div>') +
      '<p class="an-save an-vh" id="anSave"></p><p class="an-vh" role="status" id="anSaveLive"></p>';
  }
  function cap(s) { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function bindList() {
    if (!$('[data-f]') && !$('#anNew')) return;
    $$('[data-f]').forEach(function (b) { b.onclick = function () { S.filter = b.getAttribute('data-f'); lsSet('filter', S.filter); render(); var t = $('[data-f="' + S.filter + '"]'); if (t) t.focus(); }; });
    $$('[data-open]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-open'); morph(b, function () { location.hash = 'r=' + id; route(); S.skipHash = 'r=' + id; }, '.an-id'); }; });
    $('#anNew').onclick = function () { patientSheet(null); };
  }

  /* ----- record (n152: iPad-first; a Now column; the weight beside the name; one row per drug; empty groups hidden) ----- */
  function lastWeighed(r) { return (r.patient.weights || []).filter(function (x) { return !x.void; }).sort(function (a, b) { return b.at - a.at; })[0] || null; }
  function liveVitals(r) { return r.vitals.filter(function (v) { return !v.void; }).sort(function (a, b) { return a.at - b.at; }); }
  function vitalsDue(r, t) {
    if (r.status !== 'active') return null;
    var vs = liveVitals(r), last = vs.length ? vs[vs.length - 1].at : r.start;
    var m = Math.floor((t - last) / MIN); return m >= DUE_MIN ? m : null;
  }
  function inspectorOpen() { if (S.inspector === null) { var v = lsGet('inspector'); S.inspector = v === null ? window.innerWidth >= 1600 : !!v; } return S.inspector; }

  function recordHTML(r) {
    var t = now(), w = A.weightAt(r, t), p = r.patient, signed = r.status === 'signed', live = r.status === 'active';
    var lw = lastWeighed(r), due = vitalsDue(r, t), insp = inspectorOpen();
    var clock = live ? '<div class="an-clock"><b>' + dur(t - r.start) + '</b><span>Anesthesia time</span></div>'
      : r.start && r.end ? '<div class="an-clock"><b>' + dur(r.end - r.start) + '</b><span>' + fmtTime(r.start) + '–' + fmtTime(r.end) + '</span></div>' : '';
    var main = r.status === 'planned' ? '<button type="button" class="an-btn primary" id="anStart">Start anesthesia</button>'
      : live ? '<button type="button" class="an-btn" id="anEnd">' + icon('stop') + 'End anesthesia</button>'
      : r.status === 'ended' ? '<button type="button" class="an-btn primary" id="anSign">' + icon('check') + 'Sign record</button>'
      : '<button type="button" class="an-btn" id="anAdd">' + icon('compose') + 'Add addendum</button>';
    var facts = [cap(p.species), p.breed, p.sex, p.age].filter(Boolean).map(esc).join(' · '), conf = A.isConfirmed(r);
    var head = '<header class="an-rhead"><a class="an-back" href="#">' + icon('back', { scale: 'l' }) + (SHEET ? 'Anesthesia' : 'Records') + '</a>' +
      '<div class="an-id"><h1>' + esc(p.name || 'Unnamed training patient') + statusPill(r) + kindPill(r) + confirmChip(r) + presenceChip(r) + '</h1>' +
      '<div class="sub"><span>' + (facts || 'No details yet') + '</span><button type="button" class="an-info" id="anPatient" aria-label="Patient details">' + icon('info') + '</button></div></div>' +
      '<button type="button" class="an-wbig' + (w ? '' : ' none') + '" id="anWeight"' + (signed ? ' disabled' : '') + ' aria-label="' + (w ? 'Weight ' + sig(w) + ' kilograms' + (lw ? ', weighed ' + fmtTime(lw.at) : '') + '. Change weight' : 'No weight. Add weight') + '">' +
      (w ? '<b>' + sig(w) + '<span> kg</span></b><small>' + (lw ? (lw.method === 'estimated' ? 'Estimated ' : 'Weighed ') + fmtTime(lw.at) : '') + '</small>' : '<b>' + icon('scale', { slash: true, scale: 's' }) + 'No weight</b><small>Add weight</small>') + '</button>' +
      '<div class="an-ract"><span class="an-save" id="anSave" aria-hidden="true"></span>' + clock + main +
      '<button type="button" class="an-btn icon" id="anExpand" aria-pressed="' + XP + '" aria-label="' + (XP ? 'Exit expanded view' : 'Expand record') + '" title="' + (XP ? 'Exit expanded view (⌥F or Esc)' : 'Expand (⌥F)') + '"><span class="ic-out">' + icon('expand') + '</span><span class="ic-in">' + icon('collapse') + '</span></button>' +
      '<button type="button" class="an-btn icon" id="anShare" aria-label="Share link to this record" title="Share link">' + icon('share') + '</button>' +
      (r.status === 'ended' || r.status === 'signed' ? '<button type="button" class="an-btn icon" id="anPrint" aria-label="Print record" title="Print (⌘P)">' + icon('print') + '</button>' : '') + '</div>' + summaryHTML(r) + '</header><p class="an-vh" role="status" id="anSaveLive"></p>';
    var banners = '';
    if (!conf && !signed) banners += '<div class="an-confirm" role="alert"><span class="ic" aria-hidden="true">' + icon('idcheck') + '</span><span><b>Confirm the patient</b>Check the name, weight and procedure against the cage card before you chart.</span><button type="button" class="an-btn danger" id="anConfirmB">Confirm patient</button></div>';
    if (!w && !signed) banners += '<div class="an-banner"><span><b>No weight on file.</b> Per-kg doses can’t be calculated and per-kg infusions can’t start. Doses given now are typed in mg and confirmed.</span><button type="button" class="an-btn tinted" data-act="weight">Add weight</button></div>';
    if (S.pumpNotice && S.pumpNotice.id === r.id && S.pumpNotice.items.length) banners += '<div class="an-banner info" role="alert"><span><b>Weight changed — set the pumps.</b> ' + S.pumpNotice.items.map(function (x) { return esc(x.name) + ' ' + (x.from === null ? '—' : sig(x.from)) + ' → <b>' + (x.to === null ? '—' : sig(x.to)) + ' mL/h</b>'; }).join(' · ') + '</span><button type="button" class="an-btn tinted" id="anPumpsSet">Pumps set</button></div>';
    if (!lsGet('tips') && !signed && conf) banners += '<div class="an-tips" role="note" aria-label="Tips"><span><b>Tips</b>Tap any value on the chart to see who charted it, or to strike it through. Undo with the message at the bottom<span class="an-kb">, or ⌘Z. Keyboard: ⌥V vitals, ⌥D drug, ⌥I infusion, ⌥G gas, ⌥E event</span>.</span><button type="button" class="an-btn plain strong" id="anTipsOk">Got it</button></div>';
    var ps = signed ? playing('sign:' + r.id, 1100) : null;
    if (signed) banners += '<div class="an-banner info an-signed' + (ps !== null ? ' just' : '') + '"' + (ps !== null ? ' style="--an-d:-' + ps + 'ms"' : '') + '><span class="an-seal" aria-hidden="true">' + icon('lockd') + '</span><span><b>Signed ' + esc(fmtDate(r.signed.at) + ', ' + fmtTime(r.signed.at)) + ' by ' + esc(r.signed.by) + '.</b> The record is read-only. Corrections go in an addendum.</span></div>';
    var dis = signed ? ' disabled' : '';
    var dk = 'due:' + r.id + ':' + (r.vitals.length ? r.vitals[r.vitals.length - 1].at : r.start); if (due && live && !fired(dk)) fire(dk); var bp2 = due ? playing(dk, 900) : null;
    var tools = '<div class="an-tools" role="toolbar" aria-label="Chart" data-rove="toolbar">' +
      '<button type="button" class="an-btn primary" data-act="vitals"' + dis + ' aria-label="Vitals now' + (due ? ', vitals due ' + due + ' minutes' : '') + '" title="Vitals now (⌥V)">' + (bp2 !== null ? '<span class="an-beat" style="animation-delay:-' + bp2 + 'ms">' + icon('heart') + '</span>' : icon('heart')) + '<span class="t">Vitals now</span>' + '</button>' +
      '<div class="an-group" role="group" aria-label="Chart a drug, infusion, gas or event">' +
      '<button type="button" class="an-btn" data-act="dose"' + dis + ' aria-label="Give drug" title="Give drug (⌥D)">' + icon('syringe') + '<span class="t">Give drug</span></button>' +
      '<button type="button" class="an-btn" data-act="infusion"' + dis + ' aria-label="Infusion" title="Start an infusion (⌥I)">' + icon('drip') + '<span class="t">Infusion</span></button>' +
      '<button type="button" class="an-btn" data-act="gas"' + dis + ' aria-label="Gas" title="Gas and oxygen (⌥G)">' + icon('gas') + '<span class="t">Gas</span></button>' +
      '<button type="button" class="an-btn" data-act="event"' + dis + ' aria-label="Event" title="Event (⌥E)">' + icon('flag') + '<span class="t">Event</span></button>' +
      '<button type="button" class="an-btn" data-act="output"' + dis + ' aria-label="Output" title="Blood loss, urine and other output (⌥O)">' + icon('output') + '<span class="t">Output</span></button>' +
      '<button type="button" class="an-btn" data-act="airway"' + dis + ' aria-label="Airway" title="Airway, lines and ventilation (⌥A)">' + icon('airway') + '<span class="t">Airway</span></button></div>' +
      '<span class="sp"><span class="an-tbt" aria-hidden="true">' + esc(p.name || 'Training patient') + '</span></span><div class="an-seg an-zoomseg" role="radiogroup" aria-label="Minutes per column" data-rove="radio">' +
      [5, 10, 15].map(function (m) { return '<button type="button" role="radio" data-zoom="' + m + '" aria-checked="' + (S.colMin === m) + '" tabindex="' + (S.colMin === m ? 0 : -1) + '" aria-label="' + m + ' minutes per column">' + m + ' min</button>'; }).join('') + '</div>' +
      '<button type="button" class="an-btn" id="anInsp" aria-pressed="' + insp + '" aria-controls="anInspector" aria-label="Totals and history" title="Totals and history">' + icon('sidebar') + '<span class="t">Totals</span></button></div>';
    return head + banners + tools + '<div class="an-body' + (insp ? ' insp' : '') + (ps !== null ? ' settle' : '') + '"' + (ps !== null ? ' style="--an-d:-' + ps + 'ms"' : '') + '><section class="an-panel an-chartp' + (conf ? '' : ' unconf') + '" aria-label="Anesthesia chart">' + chartHTML(r) + (conf ? (playing('conf:' + r.id, 900) !== null ? '<div class="an-wm gone" aria-hidden="true" style="animation-delay:-' + playing('conf:' + r.id, 900) + 'ms"><span>Confirm correct patient</span></div>' : '') : '<div class="an-wm" aria-hidden="true"><span>Confirm correct patient</span></div>') + '</section>' +
      nowHTML(r) + (insp ? '<aside class="an-side' + (S.opening === 'side' ? ' opening' : '') + '" id="anInspector" aria-label="Totals and history">' + sideHTML(r) + '</aside>' : '<aside class="an-side an-print-only" aria-hidden="true">' + sideHTML(r).replace(/ id="an[A-Za-z]+"/g, '') + '</aside>') + '</div>';
  }

  /* the Now column: how the patient is right now — big numbers, a short trend, the settings and pumps in force */
  var TILES = [['hr', 'HR', 'bpm'], ['spo2', 'SpO₂', '%'], ['bp', 'BP', 'mmHg'], ['etco2', 'EtCO₂', 'mmHg'], ['rr', 'RR', 'br/min'], ['temp', 'Temp', '°F']];
  function spark(vals, k) {
    if (vals.length < 2) return '';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), W = 72, Hh = 22, span = hi - lo || 1;
    var pts = vals.map(function (v, i) { return Math.round(i / (vals.length - 1) * W) + ',' + Math.round(Hh - 2 - (v - lo) / span * (Hh - 4)); }).join(' ');
    return '<svg class="an-spark v-' + (k || '') + '" viewBox="0 0 ' + W + ' ' + Hh + '" width="' + W + '" height="' + Hh + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  /* (n171: the old Phosphor vitals icons are replaced by the Pravix Symbols v-* set) */

  function vIcon(k) { return icon('v-' + k, { fill: true, cls: 'an-vi' }); }
  var CHEV = '<svg class="an-chev" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M7 4.5l4.5 4.5L7 13.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function nowHTML(r) {
    var t = now(), vs = liveVitals(r), signed = r.status === 'signed', due = vitalsDue(r, t), live = r.status === 'active';
    var last = function (k) { for (var i = vs.length - 1; i >= 0; i--) if (vs[i][k] !== undefined) return vs[i]; return null; };
    var series = function (k) { return vs.filter(function (v) { return v[k] !== undefined; }).slice(-12).map(function (v) { return v[k]; }); };
    var lastAt = vs.length ? vs[vs.length - 1].at : null;
    var tiles = TILES.map(function (m) {
      var k = m[0], v = k === 'bp' ? (last('sap') || last('map')) : last(k), val, aria;
      var unit = m[2];
      if (!v) { val = ''; aria = m[1] + ', no value yet'; }
      else if (k === 'bp') { val = v.sap !== undefined ? sig(v.sap) + '/' + (v.dap !== undefined ? sig(v.dap) : '—') : sig(v.map); if (v.sap !== undefined && v.map !== undefined) unit = '(' + sig(v.map) + ') mmHg'; else if (v.sap === undefined) unit = 'mmHg mean'; aria = 'Blood pressure ' + (v.sap !== undefined ? v.sap + ' over ' + (v.dap !== undefined ? v.dap : 'unknown') + ', ' : '') + (v.map !== undefined ? 'mean ' + v.map : ''); }
      else { val = sig(v[k]); aria = m[1] + ' ' + v[k] + ' ' + m[2]; }
      var age = v ? Math.floor((t - v.at) / MIN) : null, stale = age !== null && age >= 15;
      var tk = r.id + ':' + k, pn = performance.now(); if (S.prevTiles[tk] !== undefined && S.prevTiles[tk].v !== val) { S.prevTiles[tk].until = pn + 600; MO.from[tk] = S.prevTiles[tk].v; fire('roll:' + tk); } var chg = !!(S.prevTiles[tk] && S.prevTiles[tk].until > pn); S.prevTiles[tk] = { v: val, until: S.prevTiles[tk] ? S.prevTiles[tk].until : 0 };   /* a new reading flashes once */
      return '<button type="button" class="an-tile' + (stale ? ' stale' : '') + (chg ? ' chg' : '') + '" data-vk="' + k + '"' + (signed ? ' disabled' : '') + ' aria-label="' + esc(aria) + (v ? ', ' + age + ' minutes ago' : '') + (signed ? '' : '. Enter ' + m[1]) + '">' +
        '<span class="hd"><b class="tag v-' + k + '">' + vIcon(k) + m[1] + '</b>' + (signed ? '' : CHEV) + '</span>' +
        (v ? '<span class="v"><b' + (chg && MO.from[tk] ? ' class="an-roll"' : '') + '>' + (chg && MO.from[tk] && playing('roll:' + tk, 600) !== null ? rollHTML(MO.from[tk], val, playing('roll:' + tk, 600)) : val) + '</b><small>' + unit + '</small></span>' : '<span class="v nd">No data</span>') +
        '<span class="f"><span' + (v ? ' data-at="' + v.at + '"' : '') + (v && v.at === lastAt && !stale ? ' class="same"' : '') + '>' + (v ? (age < 1 ? 'Just now' : age + ' min ago') : 'Not yet') + '</span>' + spark(series(k === 'bp' ? 'map' : k), k) + '</span></button>';
    }).join('');
    var gasRows = ['iso', 'sevo', 'o2'].map(function (a) { var g = A.gasAt(r, a, t); return g === null || (g === 0 && a !== 'o2') ? '' : '<button type="button" class="an-nrow" data-gas="' + a + '"' + (signed ? ' disabled' : '') + '><span class="an-key g-' + a + '">' + AGENT[a].name + '</span><b>' + sig(g) + ' <i>' + AGENT[a].unit + '</i></b></button>'; }).join('');
    var running = r.infusions.filter(function (i) { return !i.void && !i.end; });
    var pumps = running.map(function (i) {
      var d = A.drug(r, i.drugId) || {}, pp = A.pumpNow(r, i, t), rt = A.rateAt(i, t);
      return '<li><button type="button" class="an-nrow pmp" data-inf="' + i.id + '"><span><em class="an-dn">' + dot(d) + esc(d.name) + '</em><small>' + sig(rt) + ' ' + esc(i.unit) + '</small></span><b>' + (pp && pp.ok && pp.mLPerH !== null ? sig(pp.mLPerH) : '—') + ' <i>mL/h</i></b></button></li>';
    }).join('');
    var abx = A.abxStatus(r, r.end && r.end < t ? r.end : t), abxRows = abx.map(function (a) {
      var st = abxState(a, t, live);
      var nk = 'abx:' + r.id + ':' + a.drugId + ':' + a.dueAt; if ((st.cls === 'due' || st.cls === 'late') && live && !fired(nk)) fire(nk); var np = playing(nk, 700);
      return '<button type="button" class="an-nrow an-abx ' + st.cls + '" data-abx="' + a.drugId + '"' + (signed ? ' disabled' : '') + ' aria-label="' + esc(a.name + ', last dose ' + fmtTime(a.last) + '. ' + st.aria) + '"><span><em class="an-dn"><span class="an-abxic' + (np !== null ? ' nudge' : '') + '"' + (np !== null ? ' style="animation-delay:-' + np + 'ms"' : '') + ' aria-hidden="true">' + icon('timer', { scale: 's' }) + '</span>' + esc(a.name) + '</em><small>Last ' + esc(fmtTime(a.last)) + (a.redoseMin ? ' · every ' + sig(a.redoseMin) + ' min' : '') + '</small></span><b' + (a.dueAt && live ? ' data-abxdue="' + a.dueAt + '"' : '') + '>' + esc(st.txt) + '</b></button>';
    }).join('');
    var devNow = (r.devices || []).filter(function (d) { return !d.void && !d.end; }), vnow = A.ventAt(r, t);
    var devRows = devNow.map(function (d) { return '<button type="button" class="an-nrow an-ndev" data-dev="' + d.id + '"' + (signed ? ' disabled' : '') + '><span><em class="an-dn">' + esc(devShort(d)) + '</em><small>' + esc([d.size, d.cuff, d.site].filter(Boolean).join(' · ')) + '</small></span><b><i>since</i> ' + esc(fmtTime(d.at)) + '</b></button>'; }).join('') +
      (vnow ? '<div class="an-nrow an-nbal"><span>Ventilation</span><b style="font-size:.9375rem">' + esc(A.VENT[vnow.mode]) + '</b></div>' : '');
    var fb = A.balance(r, r.end && r.end < t ? r.end : t), fbRow = (r.outputs || []).length ? '<h3>Fluid balance</h3><div class="an-nlist"><div class="an-nrow an-nbal"><span>In ' + sig(fb.inTotal) + ' · out ' + sig(fb.outTotal) + ' mL</span><b>' + (fb.net >= 0 ? '+' : '−') + sig(Math.abs(fb.net)) + ' <i>mL</i></b></div></div>' : '';
    var form = S.vOpen && S.vOpen === r.id && !signed ? vitalsFormHTML(r) : '';
    return '<aside class="an-nowcol" aria-label="Now">' +
      '<div class="an-nh"><div><h2>Now</h2>' + (lastAt ? '<p class="an-nlast">Last check ' + (live ? '<span data-last="' + lastAt + '">' + ago(t - lastAt) + '</span>' : 'at ' + fmtTime(lastAt)) + '</p>' : '<p class="an-nlast">No vitals yet</p>') + '</div>' + (due ? '<span class="an-pill warn" role="status">Vitals due · ' + due + ' min</span>' : '<span class="an-nt">' + fmtTime(t) + '</span>') + '</div>' +
      (form || '<div class="an-tiles">' + tiles + '</div>') +
      (abxRows ? '<h3>Antibiotics</h3><div class="an-nlist">' + abxRows + '</div>' : '') +
      (gasRows ? '<h3>Gases</h3><div class="an-nlist">' + gasRows + '</div>' : '') +
      (devRows ? '<h3>Airway &amp; lines</h3><div class="an-nlist">' + devRows + '</div>' : '') + fbRow +
      (pumps ? '<h3>Pumps</h3><ul class="an-nlist an-inf">' + pumps + '</ul>' : (live ? '' : '')) +
      '</aside>';
  }

  /* vitals typed straight into the Now column (Return moves to the next field; the last Return saves) */
  var VF = [['hr', 'HR', 'bpm'], ['rr', 'RR', 'br/min'], ['sap', 'SAP', 'mmHg'], ['dap', 'DAP', 'mmHg'], ['map', 'MAP', 'mmHg'], ['spo2', 'SpO₂', '%'], ['etco2', 'EtCO₂', 'mmHg'], ['temp', 'Temp', '°F']];
  var VF2 = [['fio2', 'FiO₂', '%'], ['etag', 'Et agent', '%'], ['tof', 'TOF', 'of 4']];
  function vitalsFormHTML(r) {
    var vs = liveVitals(r);
    return '<form class="an-vform' + (S.opening === 'vform' ? ' opening' : '') + '" id="anVForm" data-keep novalidate aria-label="New vitals"><div class="an-vgrid">' +
      VF.map(function (f) { return '<label class="an-vf" for="nv_' + f[0] + '"><span>' + f[1] + ' <i>' + f[2] + '</i></span><input class="an-in an-tnum" id="nv_' + f[0] + '" name="' + f[0] + '" inputmode="decimal" autocomplete="off" aria-describedby="nve_' + f[0] + '" enterkeyhint="' + (f[0] === 'temp' ? 'done' : 'next') + '"' + (f[0] === 'map' ? ' placeholder="Auto"' : '') + '><em class="err" id="nve_' + f[0] + '" data-ferr="' + f[0] + '"></em></label>'; }).join('') +
      '</div><button type="button" class="an-btn plain sm an-vmore" data-vmore aria-expanded="' + (S.vMore ? 'true' : 'false') + '" aria-controls="anVMore">' + (S.vMore ? 'Fewer monitors' : 'More monitors') + '</button>' +
      '<div class="an-vgrid an-vgrid2" id="anVMore"' + (S.vMore ? '' : ' hidden') + '>' + VF2.map(function (f) { return '<label class="an-vf" for="nv_' + f[0] + '"><span>' + f[1] + ' <i>' + f[2] + '</i></span><input class="an-in an-tnum" id="nv_' + f[0] + '" name="' + f[0] + '" inputmode="decimal" autocomplete="off" aria-describedby="nve_' + f[0] + '" enterkeyhint="next"><em class="err" id="nve_' + f[0] + '" data-ferr="' + f[0] + '"></em></label>'; }).join('') +
      '<label class="an-vf an-vecg" for="nv_ecg"><span>ECG <i>rhythm</i></span><select class="an-sel" id="nv_ecg" name="ecg"><option value="">—</option>' + Object.keys(A.ECG).map(function (k) { return '<option value="' + k + '">' + esc(A.ECG[k]) + '</option>'; }).join('') + '</select><em class="err" id="nve_ecg" data-ferr="ecg"></em></label></div>' +
      '<div class="an-vwhen"><span data-when>At ' + (S.vTime ? fmtTime(S.vTime) : 'now') + '</span><button type="button" class="an-btn plain sm" data-vtime aria-expanded="false" aria-controls="nv_timebox">Change time</button></div>' +
      '<div class="an-vtime" id="nv_timebox" data-vtimebox hidden><input class="an-in an-tnum" type="time" name="time" id="nv_time" value="' + hhmm(S.vTime || now()) + '"></div>' +
      '<p class="formerr" role="alert" data-verr></p>' +
      '<div class="an-vdiscard" data-vdiscard hidden role="group" aria-label="Discard these vitals?"><span>Discard these vitals?</span><button type="button" class="an-btn sm" data-vkeep>Keep editing</button><button type="button" class="an-btn sm destr" data-vdrop>Discard</button></div>' +
      '<div class="an-vacts"><span class="sp"></span><button type="button" class="an-btn plain" data-vcancel>Cancel</button><button type="submit" class="an-btn primary">Save</button></div></form>';
  }
  function bindVitalsForm(r) {
    var f = $('#anVForm'); if (!f) return;
    var inputs = $$('input[inputmode]', f);
    inputs.forEach(function (inp) { inp.addEventListener('keydown', function (e) { if (e.key !== 'Enter') return; var vis = inputs.filter(function (x) { return !x.closest('[hidden]'); }), i = vis.indexOf(inp); if (i > -1 && i < vis.length - 1) { e.preventDefault(); vis[i + 1].focus(); } }); });
    var drop = function () { morph($('#anVForm'), function () { S.vOpen = null; S.keep = {}; S.vTime = null; lsDel('draft:' + r.id); render(); }, '.an-tiles'); var b = $('[data-act=vitals]'); if (b) b.focus(); };
    var ecgSel = $('#nv_ecg', f), typed = function () { return inputs.some(function (i) { return i.value.trim() !== ''; }) || !!(ecgSel && ecgSel.value); };
    var vm = $('[data-vmore]', f); if (vm) vm.onclick = function () { S.vMore = !S.vMore; var box = $('#anVMore'); box.hidden = !S.vMore; vm.setAttribute('aria-expanded', String(S.vMore)); vm.textContent = S.vMore ? 'Fewer monitors' : 'More monitors'; if (S.vMore) $('#nv_fio2').focus(); };
    var askDrop = function () { if (!typed()) return drop(); var d = $('[data-vdiscard]', f); d.hidden = false; $('[data-vkeep]', f).focus(); };
    $('[data-vcancel]', f).onclick = askDrop;
    $('[data-vkeep]', f).onclick = function () { $('[data-vdiscard]', f).hidden = true; inputs[0].focus(); };
    $('[data-vdrop]', f).onclick = drop;
    f.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); if (!$('[data-vdiscard]', f).hidden) { $('[data-vdiscard]', f).hidden = true; inputs[0].focus(); } else askDrop(); } });
    var tbtn = $('[data-vtime]', f), tbox = $('[data-vtimebox]', f), tin = $('#nv_time');
    tbtn.onclick = function () { var open = tbox.hidden; tbox.hidden = !open; tbtn.setAttribute('aria-expanded', String(open)); tbtn.textContent = open ? 'Use now' : 'Change time'; $('[data-when]', f).textContent = open ? 'At the time below' : 'At now'; if (open) tin.focus(); else tin.dataset.touched = ''; };
    if (!tbox.hidden) { tbtn.setAttribute('aria-expanded', 'true'); tbtn.textContent = 'Use now'; }
    /* check each value as you leave it (it is still only saved with Save) */
    inputs.forEach(function (inp) {
      inp.addEventListener('blur', function () {
        var k = inp.name, fe = $('[data-ferr="' + k + '"]', f); if (!fe) return;
        if (inp.value.trim() === '') { fe.textContent = ''; inp.removeAttribute('aria-invalid'); return; }
        var o = {}; o[k] = inp.value; var cv = A.checkVitals(o);
        if (cv.errors[k]) { fe.textContent = cv.errors[k]; inp.setAttribute('aria-invalid', 'true'); } else { fe.textContent = ''; inp.removeAttribute('aria-invalid'); }
      });
      inp.addEventListener('input', function () { var d = {}; inputs.forEach(function (i) { if (i.value) d[i.id] = { v: i.value }; }); lsSet('draft:' + r.id, d); });
    });
    /* no "same as last": residents read every value off the monitor (n153 decision) */
    inputs.forEach(function (inp) { inp.addEventListener('input', function () { inp.classList.remove('filled'); }); });
    f.onsubmit = function (e) {
      e.preventDefault(); var v = {}, err = $('[data-verr]', f);
      $$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); }); $$('[data-ferr]', f).forEach(function (x) { x.textContent = ''; });
      VF.concat(VF2).forEach(function (x) { var s = $('#nv_' + x[0]).value.trim(); if (s !== '') v[x[0]] = s; });
      if (ecgSel && ecgSel.value) v.ecg = ecgSel.value;
      var tb = $('[data-vtimebox]', f), at;
      try {
        at = tb.hidden ? now() : readClock($('#nv_time').value, r);
        if (!typed()) throw Object.assign(new Error('Enter at least one value.'), {});
        change(r.id, { type: 'vitals', values: v, at: at }, { quiet: true });
      } catch (ex) {
        err.textContent = ex.message;
        if (ex.errors) Object.keys(ex.errors).forEach(function (k) { var el = $('#nv_' + k), fe = $('[data-ferr="' + k + '"]', f); if (el) el.setAttribute('aria-invalid', 'true'); if (fe) fe.textContent = ex.errors[k]; });
        var bad1 = $('[aria-invalid]', f) || inputs[0]; bad1.focus(); return;
      }
      morph($('#anVForm'), function () { S.vOpen = null; S.keep = {}; S.vTime = null; lsDel('draft:' + r.id); render(); }, '.an-tiles'); var b = $('[data-act=vitals]'); if (b) b.focus();
    };
  }

  /* the chart: one clock for every row; a group appears once it has something in it */
  function chartHTML(r) {
    var t = now(), colMs = S.colMin * MIN, sp = A.span(r, t);
    var from = Math.floor(sp.from / colMs) * colMs, to = Math.ceil(sp.to / colMs) * colMs;
    if (S.colMin > 5) { from -= colMs; to += colMs * 2; }
    var px = S.pxCol / colMs, W = Math.round((to - from) * px), live = r.status === 'active' || r.status === 'planned';
    var X = function (tt) { return Math.round((tt - from) * px); };
    var css = 'style="width:' + W + 'px;--an-col:' + S.pxCol + 'px"';
    var rows = [];
    function row(label, track, cls, h) { var g = /grp/.test(cls || ''); rows.push('<div class="an-row ' + (cls || '') + '"><div class="an-lab' + (g ? ' grp" role="heading" aria-level="3' : '') + '">' + (g ? label : label.replace('<b', '<b role="heading" aria-level="4"')) + '</div><div class="an-trk an-grid-bg' + (/both/.test(cls || '') ? ' both' : '') + '" ' + css.replace('style="', 'style="' + (h ? 'min-height:' + h + ';' : '')) + '>' + track + '</div></div>'); }
    var ticks = '';
    for (var tt = from; tt < to; tt += colMs) { var d0 = new Date(tt); ticks += '<span class="an-tick' + (d0.getMinutes() === 0 ? ' hr' : '') + '" style="left:' + X(tt) + 'px;width:' + S.pxCol + 'px">' + fmtTime(tt).replace(/ (AM|PM)/, d0.getMinutes() === 0 ? ' $1' : '') + '</span>'; }
    rows.push('<div class="an-row time"><div class="an-lab"><b>' + esc(fmtDate(from)) + '</b><span>Every ' + S.colMin + ' min</span></div><div class="an-trk" aria-hidden="true" ' + css + '>' + ticks + '</div></div>');
    S.cm = { from: from, to: to, px: px, col: colMs };
    function lanes(items, w) { var last = [-1e9, -1e9]; return items.map(function (it) { var x = X(it.at), l = 0; if (x - last[0] < w) l = x - last[1] < w ? 0 : 1; last[l] = x; return l; }); }
    function infBar(inf, d) {
      var end = inf.end || (live ? t : inf.start + colMs), segs = A.segments(inf, end);
      var labs = segs.map(function (s) { var pr = A.rate({ rate: s.rate, unit: inf.unit, weightKg: A.weightAt(r, s.from), conc: d.conc }); return '<span class="an-seglab" style="left:' + (X(s.from) - X(inf.start)) + 'px;max-width:' + Math.max(0, X(s.to) - X(s.from)) + 'px">' + sig(s.rate) + ' ' + esc(inf.unit) + (pr.ok && pr.mLPerH !== null && inf.unit !== 'mL/h' ? ' · ' + sig(pr.mLPerH) + ' mL/h' : '') + '</span>'; }).join('');
      return '<button type="button" class="an-bar c-' + drugClass(d) + (inf.void ? ' void' : '') + (!inf.end && live ? ' run' : '') + (S.fresh === inf.id ? ' fresh' : '') + '" data-inf="' + inf.id + '" style="left:' + X(inf.start) + 'px;width:' + Math.max(6, X(end) - X(inf.start)) + 'px" aria-label="' + esc(d.name) + ' infusion from ' + fmtTime(inf.start) + (inf.end ? ' to ' + fmtTime(inf.end) : ', running') + '">' + labs + '</button>';
    }

    /* gases */
    var gasAgents = ['iso', 'sevo', 'o2'].filter(function (a) { return r.gases.some(function (g) { return g.agent === a; }); });
    if (gasAgents.length) row('Gases', '', 'grp');
    gasAgents.forEach(function (a) {
      var gs = r.gases.filter(function (g) { return g.agent === a && !g.void; }).sort(function (x, y) { return x.at - y.at; });
      var end = r.end || (live ? t : (gs.length ? gs[gs.length - 1].at + colMs : t));
      var segs = gs.map(function (g, i) { return { g: g, from: g.at, to: i + 1 < gs.length ? gs[i + 1].at : end }; }).filter(function (s) { return s.to > s.from && s.g.value > 0; });
      var runs = []; segs.forEach(function (s) { var lr = runs[runs.length - 1]; if (lr && lr.to === s.from) { lr.to = s.to; lr.segs.push(s); } else runs.push({ from: s.from, to: s.to, segs: [s] }); });
      var bars = runs.map(function (rn) {
        var labs = rn.segs.map(function (s) { return '<span class="an-seglab" style="left:' + (X(s.from) - X(rn.from)) + 'px;max-width:' + Math.max(0, X(s.to) - X(s.from)) + 'px">' + sig(s.g.value) + (a === 'o2' ? ' L/min' : ' %') + '</span>'; }).join('');
        return '<button type="button" class="an-bar gas-' + a + (live && !r.end && rn.to === end ? ' run' : '') + '" data-gas="' + a + '" style="left:' + X(rn.from) + 'px;width:' + Math.max(4, X(rn.to) - X(rn.from)) + 'px" aria-label="' + AGENT[a].name + ' from ' + fmtTime(rn.from) + '">' + labs + '</button>';
      }).join('');
      r.gases.filter(function (g) { return g.agent === a && g.void; }).forEach(function (g) { bars += '<button type="button" class="an-mk void" data-entry="gas:' + g.id + '" style="left:' + X(g.at) + 'px">' + sig(g.value) + '</button>'; });
      row('<b class="an-key g-' + a + '">' + AGENT[a].name + '</b><span>' + AGENT[a].unit + '</span>', bars);
    });

    /* airway & lines, ventilation */
    var devs = (r.devices || []).slice().sort(function (a, b) { return a.at - b.at; }), vents = (r.vents || []).filter(function (v) { return !v.void; }).sort(function (a, b) { return a.at - b.at; });
    var vvoid = (r.vents || []).filter(function (v) { return v.void; });
    if (devs.length || vents.length || vvoid.length) row('Airway & lines', '', 'grp');
    devs.forEach(function (d) {
      var end = d.end || (live ? t : d.at + colMs);
      row('<b>' + esc(devShort(d)) + '</b><span>' + esc([d.size, d.cuff, d.site].filter(Boolean).join(' · ') || A.DEVICES[d.kind]) + '</span>',
        '<button type="button" class="an-bar dev' + (d.void ? ' void' : '') + (!d.end && live ? ' run' : '') + (S.fresh === d.id ? ' fresh' : '') + '" data-dev="' + d.id + '" style="left:' + X(d.at) + 'px;width:' + Math.max(6, X(end) - X(d.at)) + 'px" aria-label="' + esc(A.DEVICES[d.kind] + ' ' + (d.size || '') + ' placed ' + fmtTime(d.at) + (d.end ? ', removed ' + fmtTime(d.end) : ', in place')) + '"><span class="an-seglab" style="left:0">' + esc(d.end ? 'In ' + fmtTime(d.at) + ' – out ' + fmtTime(d.end) : 'Placed ' + fmtTime(d.at)) + '</span></button>');
    });
    if (vents.length || vvoid.length) {
      var vend = r.end || (live ? t : (vents.length ? vents[vents.length - 1].at + colMs : t));
      row('<b>Ventilation</b><span>' + esc(vents.length ? A.VENT[vents[vents.length - 1].mode] : '—') + '</span>', vents.map(function (v, i) {
        var to2 = i + 1 < vents.length ? vents[i + 1].at : vend;
        return '<button type="button" class="an-bar vent' + (S.fresh === v.id ? ' fresh' : '') + '" data-entry="vent:' + v.id + '" style="left:' + X(v.at) + 'px;width:' + Math.max(6, X(to2) - X(v.at)) + 'px" aria-label="' + esc(A.VENT[v.mode] + ' from ' + fmtTime(v.at)) + '"><span class="an-seglab" style="left:0;max-width:' + Math.max(0, X(to2) - X(v.at)) + 'px">' + esc([A.VENT[v.mode]].concat(ventBits(v).map(function (b) { return b[2]; })).join(' · ')) + '</span></button>';
      }).join('') + vvoid.map(function (v) { return '<button type="button" class="an-mk void" data-entry="vent:' + v.id + '" style="left:' + X(v.at) + 'px">' + esc(A.VENT[v.mode]) + '</button>'; }).join(''));
    }

    /* fluids */
    var fluidIds = [], drugIds = [];
    r.infusions.forEach(function (i) { var d = A.drug(r, i.drugId) || {}; var L = d.kind === 'fluid' ? fluidIds : drugIds; if (L.indexOf(i.drugId) < 0) L.push(i.drugId); });
    r.doses.forEach(function (x) { if (drugIds.indexOf(x.drugId) < 0 && fluidIds.indexOf(x.drugId) < 0) drugIds.push(x.drugId); });
    var outs = (r.outputs || []).slice().sort(function (a, b) { return a.at - b.at; });
    if (fluidIds.length || outs.length) row('Fluids', '', 'grp');
    fluidIds.forEach(function (id) { var d = A.drug(r, id) || {}; row('<b>' + dot(d) + esc(d.name) + '</b><span>Fluid</span>', r.infusions.filter(function (i) { return i.drugId === id; }).map(function (i) { return infBar(i, d); }).join('')); });

    if (outs.length) { var OL = lanes(outs, 96), otwo = OL.some(function (l) { return l === 1; }), ob = A.balance(r, r.end && r.end < t ? r.end : t);
      row('<b>Output</b><span>' + sig(ob.outTotal) + ' mL out · net ' + (ob.net >= 0 ? '+' : '−') + sig(Math.abs(ob.net)) + ' mL</span>', outs.map(function (o, i) { return '<button type="button" class="an-mk out k-' + o.kind + (otwo ? (OL[i] ? ' l2' : ' l1') : '') + (o.void ? ' void' : '') + (S.fresh === o.id ? ' fresh' : '') + '" data-entry="output:' + o.id + '" style="left:' + X(o.at) + 'px" aria-label="' + esc(A.OUTPUTS[o.kind] + ' ' + sig(o.mL) + ' mL at ' + fmtTime(o.at)) + '">' + esc((o.kind === 'ebl' ? 'Blood ' : o.kind === 'urine' ? 'Urine ' : '') + sig(o.mL) + ' mL') + '</button>'; }).join(''), '', otwo ? '3.75rem' : ''); }

    /* drugs: one row per drug — its infusion bar with the boluses above it */
    if (drugIds.length) row('Drugs', '', 'grp');
    var first = function (id) { var ts = r.doses.filter(function (x) { return x.drugId === id; }).map(function (x) { return x.at; }).concat(r.infusions.filter(function (i) { return i.drugId === id; }).map(function (i) { return i.start; })); return Math.min.apply(null, ts); };
    drugIds.sort(function (a, b) { return first(a) - first(b); }).forEach(function (id) {
      var d = A.drug(r, id) || {}, ds = r.doses.filter(function (x) { return x.drugId === id; }).sort(function (a, b) { return a.at - b.at; });
      var infs = r.infusions.filter(function (i) { return i.drugId === id; }), both = infs.length && ds.length;
      var L = lanes(ds, 76), two = !both && L.some(function (l) { return l === 1; });
      var mk = ds.map(function (x, i) { return '<button type="button" class="an-mk c-' + drugClass(d) + (two ? (L[i] ? ' l2' : ' l1') : '') + (x.void ? ' void' : '') + (S.fresh === x.id ? ' fresh' : '') + (x.noWeight ? ' nw' : '') + '" data-entry="dose:' + x.id + '" style="left:' + X(x.at) + 'px" aria-label="' + esc(d.name) + ' ' + amt(x.mg) + ' ' + esc(x.route) + ' at ' + fmtTime(x.at) + (x.void ? ', struck through' : '') + '">' + amt(x.mg) + '</button>'; }).join('');
      var sub = [conc(d.conc), classLabel(d)].concat(infs.some(function (i) { return !i.end && !i.void; }) ? ['running'] : []).filter(Boolean).join(' · ');
      row('<b>' + dot(d) + esc(d.name) + '</b><span>' + esc(sub) + '</span>', infs.map(function (i) { return infBar(i, d); }).join('') + mk, both ? 'both' : '', both ? '4.5rem' : two ? '3.75rem' : '');
    });

    /* events */
    var evs = r.events.slice().sort(function (a, b) { return a.at - b.at; });
    if (evs.length) {
      row('Events', '', 'grp');
      var EL = lanes(evs, 110), etwo = EL.some(function (l) { return l === 1; });
      row('<b>Events</b><span>' + evs.length + ' recorded</span>', evs.map(function (e, i) { return '<button type="button" class="an-mk ev' + (etwo ? (EL[i] ? ' l2' : ' l1') : '') + (e.void ? ' void' : '') + (S.fresh === e.id ? ' fresh' : '') + '" data-entry="event:' + e.id + '" style="left:' + X(e.at) + 'px" aria-label="' + esc(A.EVENTS[e.kind]) + ' at ' + fmtTime(e.at) + '">' + esc(A.EVENTS[e.kind]) + '</button>'; }).join(''), '', etwo ? '3.75rem' : '');
    }

    /* vitals graph + monitor rows (blood pressure on one row) */
    row('Vitals', '', 'grp');
    var GH = 192, top = 8, MAXV = 240, vs = liveVitals(r);
    var Y = function (v) { return Math.round(top + (GH - top * 2) * (1 - Math.min(v, MAXV) / MAXV)); };
    var svg = '<svg class="an-graph" width="' + W + '" height="' + GH + '" role="img" aria-label="' + esc(graphSummary(vs)) + '">';
    [40, 80, 120, 160, 200].forEach(function (g) { svg += '<line x1="0" x2="' + W + '" y1="' + Y(g) + '" y2="' + Y(g) + '" stroke="var(--an-grid-2)" stroke-width="1"/>'; });
    var mapV = vs.filter(function (v) { return v.map !== undefined; }), mapPts = mapV.map(function (v) { return X(v.at) + ',' + Y(v.map); });
    var newSeg = mapPts.length > 1 && S.fresh === mapV[mapV.length - 1].id;
    if (newSeg) {   /* the line reaches out to the new point */
      if (mapPts.length > 2) svg += '<polyline points="' + mapPts.slice(0, -1).join(' ') + '" fill="none" stroke="var(--an-bp)" stroke-width="2"/>';
      var pa = mapPts[mapPts.length - 2].split(','), pb = mapPts[mapPts.length - 1].split(',');
      svg += '<line class="an-draw" pathLength="1" x1="' + pa[0] + '" y1="' + pa[1] + '" x2="' + pb[0] + '" y2="' + pb[1] + '" stroke="var(--an-bp)" stroke-width="2"/>';
    } else if (mapPts.length > 1) svg += '<polyline points="' + mapPts.join(' ') + '" fill="none" stroke="var(--an-bp)" stroke-width="2"/>';
    vs.forEach(function (v) {
      var x = X(v.at), nw = S.fresh === v.id ? ' class="an-pt-new"' : '';
      if (v.sap !== undefined) svg += '<path' + nw + ' d="M' + (x - 5) + ' ' + (Y(v.sap) - 4) + 'L' + x + ' ' + (Y(v.sap) + 3) + 'L' + (x + 5) + ' ' + (Y(v.sap) - 4) + '" fill="none" stroke="var(--an-bp)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      if (v.dap !== undefined) svg += '<path' + nw + ' d="M' + (x - 5) + ' ' + (Y(v.dap) + 4) + 'L' + x + ' ' + (Y(v.dap) - 3) + 'L' + (x + 5) + ' ' + (Y(v.dap) + 4) + '" fill="none" stroke="var(--an-bp)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      if (v.map !== undefined) svg += '<circle' + nw + ' cx="' + x + '" cy="' + Y(v.map) + '" r="3.5" fill="var(--an-bp)"/>';
      if (v.hr !== undefined) svg += '<circle' + nw + ' cx="' + x + '" cy="' + Y(v.hr) + '" r="4" fill="var(--an-hr)"/>';
    });
    svg += '</svg>';
    var axis = '<div class="an-legend"><span class="an-units">bpm · mmHg</span><span><svg aria-hidden="true" viewBox="0 0 14 14"><circle cx="7" cy="7" r="4" fill="var(--an-hr)"/></svg>HR</span><span><svg aria-hidden="true" viewBox="0 0 14 14"><path d="M2 4L7 11L12 4" fill="none" stroke="var(--an-bp)" stroke-width="2"/></svg>SAP</span><span><svg aria-hidden="true" viewBox="0 0 14 14"><line x1="1" y1="7" x2="13" y2="7" stroke="var(--an-bp)" stroke-width="2"/><circle cx="7" cy="7" r="3" fill="var(--an-bp)"/></svg>MAP</span><span><svg aria-hidden="true" viewBox="0 0 14 14"><path d="M2 10L7 3L12 10" fill="none" stroke="var(--an-bp)" stroke-width="2"/></svg>DAP</span></div>' +
      '<div class="an-axis" aria-hidden="true">' + [40, 80, 120, 160, 200].map(function (g) { return '<i style="top:' + Y(g) + 'px">' + g + '</i>'; }).join('') + '</div>';
    rows.push('<div class="an-row"><div class="an-lab" style="justify-content:flex-start;padding-top:.75rem">' + axis + '</div><div class="an-trk an-grid-bg" ' + css.replace('style="', 'style="min-height:' + GH + 'px;') + '>' + svg + (vs.length ? '' : '<span class="an-empty-t">Vitals appear here. Enter them with Vitals now.</span>') + '</div></div>');
    MON.forEach(function (m) {
      var k = m[0];
      var cells = r.vitals.filter(function (v) { return k === 'bp' ? (v.sap !== undefined || v.map !== undefined) : v[k] !== undefined; }).map(function (v) {
        var txt, aria;
        if (k === 'bp') { txt = (v.sap !== undefined ? sig(v.sap) + '/' + (v.dap !== undefined ? sig(v.dap) : '—') : '') + '<small' + (v.mapCalc ? ' class="calc"' : '') + '>' + (v.map !== undefined ? '(' + sig(v.map) + ')' : '') + '</small>'; aria = 'Blood pressure ' + (v.sap !== undefined ? v.sap + ' over ' + (v.dap !== undefined ? v.dap : 'unknown') : '') + (v.map !== undefined ? ', mean ' + v.map + (v.mapCalc ? ' calculated' : '') : ''); }
        else { txt = sig(v[k]); aria = m[1] + ' ' + v[k] + ' ' + m[2]; }
        return '<button type="button" class="an-mon' + (k === 'bp' ? ' bp' : '') + (v.void ? ' void' : '') + (S.fresh === v.id ? ' fresh' : '') + '" data-entry="vitals:' + v.id + '" style="left:' + X(v.at) + 'px" aria-label="' + esc(aria) + ' at ' + fmtTime(v.at) + (v.void ? ', struck through' : '') + '">' + txt + '</button>';
      }).join('');
      rows.push('<div class="an-row"><div class="an-lab"><b class="an-key v-' + k + '" role="heading" aria-level="4">' + m[1] + '</b><span>' + m[2] + '</span></div><div class="an-trk an-grid-bg" ' + css.replace('style="', 'style="min-height:' + (k === 'bp' ? '3.25rem' : '2.75rem') + ';') + '>' + cells + '</div></div>');
    });
    [['fio2', 'FiO₂', '%'], ['etag', 'Et agent', '%'], ['tof', 'TOF', 'of 4'], ['ecg', 'ECG', 'rhythm']].forEach(function (m) {
      var k = m[0], ev = r.vitals.filter(function (v) { return v[k] !== undefined; }); if (!ev.length) return;
      var ECGS = { sinus: 'Sinus', stach: 'S-tach', sbrady: 'S-brady', sarr: 'SA', avb: 'AVB', vpc: 'VPCs', afib: 'AF', other: 'Other' };
      var cells = ev.map(function (v) { var txt = k === 'ecg' ? ECGS[v.ecg] : sig(v[k]), aria = m[1] + ' ' + (k === 'ecg' ? A.ECG[v.ecg] : v[k] + ' ' + m[2]);
        return '<button type="button" class="an-mon' + (k === 'ecg' ? ' txt' : '') + (v.void ? ' void' : '') + (S.fresh === v.id ? ' fresh' : '') + '" data-entry="vitals:' + v.id + '" style="left:' + X(v.at) + 'px" aria-label="' + esc(aria) + ' at ' + fmtTime(v.at) + '">' + esc(txt) + '</button>'; }).join('');
      rows.push('<div class="an-row"><div class="an-lab"><b class="an-key v-more" role="heading" aria-level="4">' + m[1] + '</b><span>' + m[2] + '</span></div><div class="an-trk an-grid-bg" ' + css.replace('style="', 'style="min-height:2.75rem;') + '>' + cells + '</div></div>');
    });
    var ov = '';
    r.events.filter(function (e) { return !e.void && /induction|incision|anesthesia_start|anesthesia_end|extubation/.test(e.kind); }).forEach(function (e) { ov += '<span class="an-evline" style="left:' + X(e.at) + 'px"></span>'; });
    if (live && t >= from && t <= to) ov += '<span class="an-now" style="left:' + X(t) + 'px" title="Now ' + fmtTime(t) + '"></span>';
    return '<div class="an-chart" tabindex="0" aria-label="Chart, scroll sideways for earlier and later times"><div class="an-chart-in" style="width:calc(var(--an-label-w) + ' + W + 'px)">' + rows.join('') + '<div class="an-overlay" style="width:' + W + 'px">' + ov + '</div></div></div>';
  }

  function graphSummary(vs) {
    if (!vs.length) return 'Vitals graph: no vitals yet';
    var hr = vs.filter(function (v) { return v.hr !== undefined; }), bp = vs.filter(function (v) { return v.sap !== undefined || v.map !== undefined; }), lb = bp[bp.length - 1];
    var parts = ['Vitals graph, ' + fmtTime(vs[0].at) + ' to ' + fmtTime(vs[vs.length - 1].at)];
    if (hr.length) parts.push('heart rate ' + hr[0].hr + ' to ' + hr[hr.length - 1].hr + ' bpm, lowest ' + Math.min.apply(null, hr.map(function (v) { return v.hr; })) + ', highest ' + Math.max.apply(null, hr.map(function (v) { return v.hr; })));
    if (lb) parts.push('latest blood pressure ' + (lb.sap !== undefined ? lb.sap + (lb.dap !== undefined ? ' over ' + lb.dap : ' systolic') : '') + (lb.map !== undefined ? ', mean ' + lb.map : '') + ' mmHg' + (bp.length > 1 && bp[0].map !== undefined ? ', mean was ' + bp[0].map + ' at the start' : ''));
    return parts.join('; ') + '. The values are listed in the rows below.';
  }
  function sideHTML(r) {
    var t = now(), tot = A.totals(r, r.end && r.end < t ? r.end : t), w = A.weightAt(r, t);
    var rows = tot.map(function (x) {
      var xd = A.drug(r, x.drugId);
      if (x.kind === 'fluid') return '<tr class="flu"><td>' + dot(xd) + esc(x.name) + '</td><td>' + sig(x.mL) + ' mL</td><td>' + (w ? sig(x.mL / w) + ' mL/kg' : '') + '</td></tr>';
      return '<tr><td>' + dot(xd) + esc(x.name) + (x.unknown ? '<small>Part not calculable</small>' : '') + '</td><td>' + amt(x.mg) + (x.mL ? '<small>' + sig(x.mL) + ' mL</small>' : '') + '</td><td>' + (x.mgPerKg !== null ? amtKg(x.mgPerKg) : '') + '</td></tr>';
    }).join('');
    var allH = r.audit.slice().reverse(), hist = (S.histAll ? allH : allH.slice(0, 20)).map(function (a) { return '<li><time>' + fmtTime(a.t || a.at) + '</time><span>' + esc(a.detail) + '<small>' + esc(a.by) + (a.t && Math.abs(a.t - a.at) > 2 * MIN ? ' · charted ' + fmtTime(a.at) : '') + '</small></span></li>'; }).join('');
    var add = r.addenda.length ? '<section class="an-panel"><h3>Addenda</h3><ul class="an-hist">' + r.addenda.map(function (a) { return '<li><time>' + fmtTime(a.at) + '</time><span>' + esc(a.text) + '<small>' + esc(a.by) + ' · ' + esc(fmtDate(a.at)) + '</small></span></li>'; }).join('') + '</ul></section>' : '';
    return '<section class="an-panel"><h3 tabindex="-1" id="anTotH">Running totals <small>' + (r.end ? 'whole case' : 'so far') + '</small></h3>' + (rows ? '<table class="an-tot"><thead><tr><th scope="col">Drug</th><th scope="col">Total</th><th scope="col">Per kg</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="an-pnote">Nothing given yet.</p>') + '<p class="an-pnote">Infusions are added up minute by minute, at the rate and weight in force.</p></section>' +
      balanceHTML(r, r.end && r.end < t ? r.end : t) + caseLogHTML(r) + add + '<section class="an-panel"><h3 tabindex="-1" id="anHistH">History <small>' + r.audit.length + ' changes</small></h3><ul class="an-hist">' + hist + '</ul>' + (allH.length > 20 ? '<button type="button" class="an-btn plain sm an-more" id="anHistAll" aria-expanded="' + S.histAll + '">' + (S.histAll ? 'Show the latest 20' : 'Show all ' + allH.length + ' changes') + '</button>' : '') + '</section>';
  }

  function bindRecord(r) {
    var id = r.id;
    var on = function (sel, fn) { var el = $(sel); if (el) el.onclick = fn; };
    on('#anStart', function () { needConfirm(r, function (r2) { timeSheet(r2, 'Start anesthesia', 'Start', function (t) { change(id, { type: 'start', at: t }); }); }); });
    on('#anConfirm', function () { confirmSheet(r); });
    on('#anConfirmB', function () { confirmSheet(r); });
    $$('[data-sum]').forEach(function (b) { b.onclick = function () { patientSheet(r, r.status === 'signed'); }; });
    $$('[data-sto]').forEach(function (b) { b.onclick = function () { r.status === 'signed' ? timeoutView(r) : needConfirm(r, timeoutSheet); }; });
    $$('[data-steam]').forEach(function (b) { b.onclick = function () { teamSheet(r); }; });
    $$('[data-abx]').forEach(function (b) { b.onclick = function () { abxSheet(r, b.getAttribute('data-abx')); }; });
    $$('[data-dev]').forEach(function (b) { b.onclick = function () { deviceSheet(r, b.getAttribute('data-dev'), b); }; });
    on('#anEnd', function () { timeSheet(r, 'End anesthesia', 'End anesthesia', function (t) { change(id, { type: 'end', at: t }); }, 'Running infusions stop at this time.'); });
    on('#anSign', function () { signSheet(r); });
    on('#anAdd', function () { addendumSheet(r); });
    on('#anPatient', function () { patientSheet(r, r.status === 'signed'); });
    on('#anWeight', function () { weightSheet(r); });
    on('#anPumpsSet', function () { S.pumpNotice = null; render(); });
    on('#anInsp', function () {
      S.inspector = !inspectorOpen(); lsSet('inspector', S.inspector); S.opening = S.inspector ? 'side' : null; render(); S.opening = null;
      var side = $('#anInspector');
      /* below 1500 px the panel sits under the chart: bring it into view and move focus there, so the button visibly does something */
      if (side && window.innerWidth < 1500) { try { side.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { } var h = $('#anTotH'); if (h) h.focus({ preventScroll: true }); }
      else { var b = $('#anInsp'); if (b) b.focus(); }
    });
    on('#anHistAll', function () { S.histAll = !S.histAll; render(); var b = $('#anHistAll'); if (b) b.focus(); });
    on('#anTipsOk', function () { lsSet('tips', 1); render(); var b = $('[data-act=vitals]'); if (b) b.focus(); });
    on('#anShare', function () { shareRecord(r); });
    var bk = $('.an-back'); if (bk && !SHEET) bk.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); var hd = $('.an-id'); morph(hd, function () { history.pushState(null, '', location.pathname + location.search); route(); }, function () { return $('[data-open="' + r.id + '"]'); }); });
    on('#anExpand', function () { setExpanded(!XP); var b = $('#anExpand'); if (b) b.focus(); });
    on('#anPrint', function () { printRecord(); });
    $$('[data-zoom]').forEach(function (b) { b.onclick = function () { S.colMin = +b.getAttribute('data-zoom'); lsSet('zoom', S.colMin); lastScroll = 0; render(); scrollToNow(); var z = $('[data-zoom="' + S.colMin + '"]'); if (z) z.focus(); }; });
    $$('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-act');
        if (a === 'weight') return weightSheet(r);
        needConfirm(r, function (r2) {
          if (a === 'vitals') openVitals(r2); else if (a === 'dose') doseSheet(r2); else if (a === 'infusion') infusionSheet(r2);
          else if (a === 'gas') gasSheet(r2); else if (a === 'event') eventSheet(r2); else if (a === 'output') outputSheet(r2); else if (a === 'airway') airwaySheet(r2);
        });
      };
    });
    $$('[data-vk]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-vk'); morph(b, function () { openVitals(r, k === 'bp' ? 'sap' : k); }, '#anVForm'); }; });
    $$('[data-inf]').forEach(function (b) { b.onclick = function () { infusionDetail(r, b.getAttribute('data-inf')); }; });
    $$('[data-entry]').forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-entry').split(':'); entrySheet(r, p[0], p[1], b); }; });
    $$('[data-gas]').forEach(function (b) { b.onclick = function () { gasSheet(r, b.getAttribute('data-gas')); }; });
    bindVitalsForm(r);
    watchPresence(r);
  }
  /* after every render: one Tab stop per chart row and per control group, arrow keys inside (Charts, Segmented controls, Toolbars) */
  function afterRender() {
    if (window.anesiaText) window.anesiaText.fit();
    syncSymbols();
    pillSegs(); requestAnimationFrame(function () { requestAnimationFrame(glideNow); });
    $$('.an-chart .an-trk').forEach(function (trk) {
      var bs = $$('button', trk).sort(function (a, b) { return a.offsetLeft - b.offsetLeft; }); if (!bs.length) return;
      bs.forEach(function (b, i) { b.tabIndex = i === bs.length - 1 ? 0 : -1; });
    });
    var nc = $('.an-nowcol'); if (nc) nc.classList.toggle('tall', nc.scrollHeight > window.innerHeight - 32);
    $$('[data-rove="toolbar"]').forEach(function (tb) { var bs = roveItems(tb); bs.forEach(function (b, i) { b.tabIndex = i === 0 ? 0 : -1; }); });
  }
  document.addEventListener('keydown', function (e) {
    var b = document.activeElement; if (!b || b.tagName !== 'BUTTON' || $('#anSheet')) return;
    var k = e.key; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(k) < 0) return;
    var trk = b.closest('.an-chart .an-trk'), grp = b.closest('[data-rove]');
    if (trk) {
      var bs = $$('button', trk).sort(function (x, y) { return x.offsetLeft - y.offsetLeft; }), i = bs.indexOf(b), nx = null;
      if (k === 'ArrowLeft') nx = bs[i - 1]; else if (k === 'ArrowRight') nx = bs[i + 1]; else if (k === 'Home') nx = bs[0]; else if (k === 'End') nx = bs[bs.length - 1];
      else { /* up / down: the nearest reading in the next row that has any */
        var rows = $$('.an-chart .an-trk').filter(function (t) { return t.querySelector('button'); }), ri = rows.indexOf(trk), to = rows[ri + (k === 'ArrowDown' ? 1 : -1)];
        if (to) { var x0 = b.offsetLeft; nx = $$('button', to).sort(function (x, y) { return Math.abs(x.offsetLeft - x0) - Math.abs(y.offsetLeft - x0); })[0]; }
      }
      if (nx) { e.preventDefault(); b.tabIndex = -1; nx.tabIndex = 0; nx.focus(); try { nx.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (x) { } }
      return;
    }
    if (grp) {
      var gs = roveItems(grp).filter(function (x) { return !x.disabled; }), j = gs.indexOf(b); if (j < 0) return;
      var nj = k === 'Home' ? 0 : k === 'End' ? gs.length - 1 : (k === 'ArrowRight' || k === 'ArrowDown') ? (j + 1) % gs.length : (j - 1 + gs.length) % gs.length;
      e.preventDefault(); gs.forEach(function (x) { x.tabIndex = -1; }); gs[nj].tabIndex = 0; gs[nj].focus();
      if (grp.getAttribute('data-rove') === 'radio') gs[nj].click();
    }
  });
  function roveItems(grp) { return $$('button', grp).filter(function (x) { var g = x.closest('[data-rove]'); return g === grp; }); }
  function scrollChartTo(t) {
    var ch = $('.an-chart'), cm = S.cm; if (!ch || !cm || !t) return;
    var x = (t - cm.from) * cm.px; if (x < ch.scrollLeft + 40 || x > ch.scrollLeft + ch.clientWidth - 40) ch.scrollLeft = Math.max(0, x - ch.clientWidth / 2);
  }
  /* Share and Print (Activity views, Printing) */
  function shareRecord(r) {
    var url = location.href, title = (r.patient.name || 'Training record') + ' · Anesia';
    if (navigator.share) { navigator.share({ title: title, text: 'Training anesthesia record', url: url }).catch(function () { }); return; }
    try { navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast('Copy this link: ' + url); }); } catch (e) { toast('Copy this link: ' + url); }
  }
  function printRecord() { window.print(); }
  window.addEventListener('beforeprint', function () {
    if (S.cur && !S.histAll) { S.histAll = true; S.printHist = true; render(true); }   /* paper gets the whole history */
    var ch = $('.an-chart-in'); if (!ch) return; document.body.classList.add('an-printing');
    var avail = 1000, w = ch.scrollWidth; ch.style.transformOrigin = 'top left'; ch.style.transform = w > avail ? 'scale(' + (avail / w) + ')' : '';
    ch.parentNode.style.height = (ch.scrollHeight * Math.min(1, avail / w)) + 'px';
  });
  window.addEventListener('afterprint', function () { if (S.printHist) { S.printHist = false; S.histAll = false; render(true); } var ch = $('.an-chart-in'); document.body.classList.remove('an-printing'); if (ch) { ch.style.transform = ''; ch.parentNode.style.height = ''; } });
  /* who else has this record open (Collaboration) — one small document per person, refreshed every minute */
  var presT = 0, presUnsub = null, presRec = null;
  function presenceChip(r) {
    var t = Date.now(), me = S.user && S.user.uid, others = Object.keys(S.presence).map(function (k) { return S.presence[k]; }).filter(function (p) { return p.rec === r.id && p.uid !== me && t - p.at < 150000; });
    return others.length ? '<span class="an-pill an-pres" title="Also has this record open">Also open: ' + esc(others.map(function (p) { return p.name; }).join(', ')) + '</span>' : '';
  }
  function watchPresence(r) {
    if (S.mode !== 'server' || !S.user || presRec === r.id) return;
    stopPresence(); presRec = r.id;
    var ref = S.db.collection('anesia_presence').doc(r.id + '_' + S.user.uid);
    var beat = function () { if (document.visibilityState === 'hidden') return; ref.set({ tenant_id: TENANT, rec: r.id, uid: S.user.uid, name: S.me, at: Date.now() }).catch(function () { }); };
    beat(); presT = setInterval(beat, 60000);
    presUnsub = S.db.collection('anesia_presence').where('rec', '==', r.id).onSnapshot(function (q) {
      var m = {}; q.forEach(function (d) { m[d.id] = d.data(); }); var before = JSON.stringify(S.presence); S.presence = m;
      if (JSON.stringify(m) !== before) { var h = $('.an-id h1 .an-pres'), html = presenceChip(r); if (h) h.outerHTML = html || ''; else if (html) { var h1 = $('.an-id h1'); if (h1) h1.insertAdjacentHTML('beforeend', html); } }
    }, function () { });
  }
  function stopPresence() {
    clearInterval(presT); if (presUnsub) { presUnsub(); presUnsub = null; }
    if (presRec && S.db && S.user) { S.db.collection('anesia_presence').doc(presRec + '_' + S.user.uid).delete().catch(function () { }); }
    presRec = null; S.presence = {};
  }
  window.addEventListener('pagehide', stopPresence);
  function openVitals(r, field) {
    if (r.status === 'signed') return;
    if (S.vOpen !== r.id) { S.keep = lsGet('draft:' + r.id) || {}; S.vTime = null; S.opening = 'vform'; } S.vOpen = r.id; render(); S.opening = null;
    var el = $('#nv_' + (field || 'hr')); if (el) { el.focus(); try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { } }
  }
  /* a bar's setting stays readable when its start has scrolled out of view: the label slides along the left edge */
  var stickRaf = 0;
  function stickLabels() {
    stickRaf = 0; var ch = $('.an-chart'); if (!ch) return; var edge = ch.scrollLeft + 8;
    $$('.an-bar', ch).forEach(function (bar) {
      var bl = bar.offsetLeft;
      $$('.an-seglab', bar).forEach(function (l) {
        var x0 = bl + l.offsetLeft, w = parseFloat(l.style.maxWidth) || 0, lw = l.scrollWidth;
        var dx = edge > x0 ? Math.min(edge - x0, Math.max(0, w - lw)) : 0;
        l.style.transform = dx ? 'translateX(' + dx + 'px)' : ''; l.classList.toggle('slid', !!dx);
      });
    });
  }
  function scrollToNow() {
    var ch = $('.an-chart'), nl = $('.an-now'); if (!ch) return;
    var x = nl ? nl.offsetLeft : (ch.scrollWidth);
    ch.scrollLeft = Math.max(0, x - ch.clientWidth * 0.75);
    lastScroll = ch.scrollLeft; stickLabels();
  }

  /* ---------------- sheets ---------------- */
  var sheetPrev = null, sheetKey = null;
  /* a selector that finds the same control again after a re-render */
  function keyOf(el) {
    if (!el || !el.getAttribute) return null;
    if (el.id) return '#' + el.id;
    var A2 = ['data-act', 'data-inf', 'data-entry', 'data-open', 'data-f', 'data-gas'];
    for (var i = 0; i < A2.length; i++) if (el.getAttribute(A2[i])) return '[' + A2[i] + '="' + el.getAttribute(A2[i]) + '"]';
    return null;
  }
  function openSheet(o) {
    closeSheet(true);
    sheetPrev = document.activeElement;
    /* the page re-renders after a save, so remember how to find the opener again */
    sheetKey = keyOf(sheetPrev);
    var wrap = document.createElement('div'); wrap.className = 'an-scrim'; wrap.id = 'anSheet';
    var pop = o.anchor && window.innerWidth >= 900;   /* on wide screens, details open as a popover beside what was tapped */
    wrap.innerHTML = '<div class="an-sheet" role="dialog" aria-modal="true" aria-labelledby="anShT"><div class="an-grab" aria-hidden="true"></div><div class="an-sh"><button type="button" class="an-btn plain l" data-x>Cancel</button><h2 id="anShT">' + esc(o.title) + '</h2>' +
      (o.primary ? '<button type="button" class="an-btn ' + (o.danger ? 'destr' : o.quiet ? 'plain strong' : 'primary') + ' r" data-ok>' + esc(o.primary) + '</button>' : '<span></span>') + '</div>' +
      '<div class="an-discard" data-discard hidden role="group" aria-labelledby="anDiscT"><b id="anDiscT">Discard your changes?</b><span>What you typed in this sheet will be lost.</span><div><button type="button" class="an-btn" data-keep>Keep editing</button><button type="button" class="an-btn destr" data-drop>Discard</button></div></div>' +
      '<form class="an-sb" novalidate>' + o.body + '<p class="formerr" role="alert" id="anShErr" data-err></p><button type="submit" hidden></button></form></div>';
    if (pop) wrap.classList.add('pop');
    document.body.appendChild(wrap);
    $$('.an,#pvxTopnav,#anToast').forEach(function (el) { el.setAttribute('inert', ''); });
    if (pop) { var ar = o.anchor.getBoundingClientRect(), sh = $('.an-sheet', wrap), sw = Math.min(400, window.innerWidth - 32), sx = Math.min(Math.max(16, ar.left + ar.width / 2 - sw / 2), window.innerWidth - sw - 16);
      sh.style.width = sw + 'px'; sh.style.left = sx + 'px'; var below = window.innerHeight - ar.bottom > 320; sh.style.top = (below ? ar.bottom + 10 : Math.max(16, ar.top - 10 - Math.min(sh.offsetHeight, 420))) + 'px';
      sh.style.transformOrigin = Math.round(ar.left + ar.width / 2 - sx) + 'px ' + (below ? -10 : sh.offsetHeight + 10) + 'px'; wrap.classList.add('morph'); }
    else if (sheetPrev && sheetPrev.getBoundingClientRect && window.innerWidth > 600) {   /* n159: the sheet grows out of the button that opened it */
      var shm = $('.an-sheet', wrap), br = sheetPrev.getBoundingClientRect(), mr = shm.getBoundingClientRect();
      if (br.width) { shm.style.transformOrigin = Math.round(br.left + br.width / 2 - mr.left) + 'px ' + Math.round(br.top + br.height / 2 - mr.top) + 'px'; wrap.classList.add('morph', 'big'); } }
    var form = $('form', wrap), err = $('[data-err]', wrap);
    function submit() {
      err.textContent = ''; $$('[aria-invalid]', wrap).forEach(function (el) { el.removeAttribute('aria-invalid'); }); $$('[data-ferr]', wrap).forEach(function (el) { el.textContent = ''; });
      try { if (o.submit(wrap) !== false) { wrap.dirty = false; closeSheet(); } }
      catch (e) {
        err.textContent = e.message || 'Something went wrong.';
        if (e.errors) Object.keys(e.errors).forEach(function (k) { var f = $('[name="' + k + '"]', wrap), fe = $('[data-ferr="' + k + '"]', wrap); if (f) f.setAttribute('aria-invalid', 'true'); if (fe) fe.textContent = e.errors[k]; });
        if (e.field) { var f2 = $('[name="' + e.field + '"]', wrap); if (f2) { f2.setAttribute('aria-invalid', 'true'); f2.setAttribute('aria-describedby', ((f2.getAttribute('aria-describedby') || '').replace('anShErr', '') + ' anShErr').trim()); f2.focus(); } }
      }
    }
    form.onsubmit = function (e) { e.preventDefault(); if (o.primary) submit(); };
    var ok = $('[data-ok]', wrap); if (ok) ok.onclick = submit;
    /* closing a sheet you have typed in asks first (Design principles, Modality, Action sheets) */
    form.addEventListener('input', function () { wrap.dirty = true; });
    form.addEventListener('change', function () { wrap.dirty = true; });
    form.addEventListener('click', function (e) { if (e.target.closest('.an-chip,[data-step]')) wrap.dirty = true; });
    var disc = $('[data-discard]', wrap);
    function requestClose() {
      if (!wrap.dirty) return closeSheet();
      disc.hidden = false; $('[data-keep]', wrap).focus();
    }
    $('[data-keep]', wrap).onclick = function () { disc.hidden = true; var f0 = $('input:not([type=hidden]),select,textarea', form); if (f0) f0.focus(); };
    $('[data-drop]', wrap).onclick = function () { wrap.dirty = false; closeSheet(); };
    $('[data-x]', wrap).onclick = requestClose;
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) requestClose(); });
    /* phones: drag the sheet down by its top to close it */
    (function () {
      var sh = $('.an-sheet', wrap), y0 = null, dy = 0, ly = 0, lt = 0, v = 0, zone = [$('.an-grab', wrap), $('.an-sh', wrap)];
      zone.forEach(function (z) {
        z.addEventListener('touchstart', function (e) { if (window.innerWidth > 600) return; y0 = ly = e.touches[0].clientY; lt = performance.now(); dy = 0; v = 0; sh.classList.remove('an-spring', 'an-fling'); sh.style.transition = 'none'; sh.style.animation = 'none'; }, { passive: true });
        z.addEventListener('touchmove', function (e) {
          if (y0 === null) return; var y = e.touches[0].clientY, t = performance.now();
          if (t > lt) v = v * .4 + (y - ly) / (t - lt) * .6; ly = y; lt = t;   /* px per ms, smoothed */
          dy = y - y0; dy = dy < 0 ? dy / 4 : dy;   /* a little resistance upward */
          sh.style.transform = 'translateY(' + dy + 'px)';
        }, { passive: true });
        z.addEventListener('touchend', function () {
          if (y0 === null) return; y0 = null; sh.style.transition = '';
          var close = dy > 90 || (v > .5 && dy > 24);   /* a far drag or a quick flick */
          if (close && !wrap.dirty && !RM()) { sh.classList.add('an-fling'); sh.style.transform = 'translateY(' + (sh.offsetHeight + 24) + 'px)'; setTimeout(function () { closeSheet(); }, 200); return; }
          sh.classList.add('an-spring'); sh.style.transform = '';
          setTimeout(function () { sh.classList.remove('an-spring'); }, 400);
          if (close) requestClose();
        });
      });
    })();
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); if (!disc.hidden) { disc.hidden = true; $('[data-keep]', wrap).click(); } else requestClose(); }
      if (e.key === 'Tab') {
        var f = $$('button:not([disabled]):not([hidden]),input:not([disabled]),select,textarea,a[href]', wrap).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return; var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    if (o.init) o.init(wrap);
    /* every field's hint and error are read with it; Return reads as Done */
    $$('.an-f', wrap).forEach(function (f, i) {
      var c = $('input:not([type=hidden]):not([type=checkbox]),select,textarea', f); if (!c) return;
      var ids = [];
      $$('.hint,[data-ferr]', f).forEach(function (h, j) { if (!h.id) h.id = 'anH' + i + '_' + j; ids.push(h.id); });
      if (ids.length) c.setAttribute('aria-describedby', ids.join(' '));
      if (c.tagName === 'INPUT' && !c.getAttribute('enterkeyhint')) c.setAttribute('enterkeyhint', 'done');
    });
    $$('input[type=checkbox]', wrap).forEach(function (c) { c.setAttribute('role', 'switch'); c.setAttribute('switch', ''); c.classList.add('an-switch'); c.addEventListener('change', function () { try { if (navigator.vibrate && matchMedia('(pointer:coarse)').matches) navigator.vibrate(8); } catch (e) { } }); });   /* iOS switches, not checkboxes */
    $$('input[name=time]', wrap).forEach(function (t) { t.addEventListener('input', function () { t.dataset.touched = '1'; }); });
    setTimeout(function () { var first = $(o.focus || 'input:not([type=checkbox]):not([type=hidden]),select,textarea', wrap) || ok; if (first) first.focus(); }, 30);
    return wrap;
  }
  var RM = function () { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function closeSheet(silent) {
    $$('.an-scrim.out').forEach(function (x) { x.remove(); });
    var w = $('#anSheet'); if (!w) return;
    w.id = 'anSheetOut';   /* the sheet eases out; it is already gone as far as the page is concerned */
    var sh0 = $('.an-sheet', w);
    if (sh0 && sh0.animate && !RM()) {   /* retarget from the current position (even mid-opening), never restart */
      var cs0 = getComputedStyle(sh0), tr0 = cs0.transform, op0 = +cs0.opacity, phone = window.innerWidth <= 600 && !w.classList.contains('morph');
      sh0.style.animation = 'none'; w.classList.add('out');
      sh0.animate([{ transform: tr0, opacity: op0 }, { transform: phone ? 'translateY(105%)' : w.classList.contains('morph') ? 'scale(.6)' : 'translateY(12px) scale(.985)', opacity: phone ? op0 : 0 }], { duration: phone ? 240 : 170, easing: 'cubic-bezier(.3,0,.7,.2)', fill: 'forwards' });
      setTimeout(function () { w.remove(); }, phone ? 250 : 180);
    } else { w.classList.add('out'); setTimeout(function () { w.remove(); }, RM() ? 130 : 180); }   /* Reduce Motion fades instead of sliding */
    $$('[inert]').forEach(function (el) { el.removeAttribute('inert'); });
    if (silent) return;
    var back = sheetPrev && document.body.contains(sheetPrev) ? sheetPrev : sheetKey ? $(sheetKey) : null;
    if (!back || back.disabled) back = $('#anApp');
    try { back.focus(); } catch (e) { }
  }
  function bad(msg, field) { var e = new Error(msg); e.field = field; throw e; }
  function val(w, n) { var el = $('[name="' + n + '"]', w); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; }
  function chips(name, opts, cur) { return '<div class="an-chips" role="group" data-chips="' + name + '">' + opts.map(function (o) { var v = o[0], l = o[1]; return '<button type="button" class="an-chip" data-v="' + esc(v) + '" aria-pressed="' + (v === cur) + '">' + esc(l) + '</button>'; }).join('') + '</div><input type="hidden" name="' + name + '" value="' + esc(cur || '') + '">'; }
  function bindChips(w, cb) {
    $$('[data-chips]', w).forEach(function (g) {
      var name = g.getAttribute('data-chips'), hid = $('input[name="' + name + '"]', w);
      $$('.an-chip', g).forEach(function (c) { c.onclick = function () { $$('.an-chip', g).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); c.setAttribute('aria-pressed', 'true'); hid.value = c.getAttribute('data-v'); if (cb) cb(name, hid.value); }; });
    });
  }
  /* time field: today's clock time; the date is the one nearest the case (so 11:50 PM charted at 12:10 AM lands yesterday) */
  /* time: "Now" unless changed (one line, Change opens the clock) */
  function timeField(t, label, open) {
    return '<div class="an-f" data-tf><div class="an-tline"' + (open ? ' hidden' : '') + ' data-tline><span>' + esc(label || 'Time') + ': <b data-tnow>Now</b></span><button type="button" class="an-btn plain sm" data-topen aria-expanded="false" aria-controls="anTbox">Change</button></div>' +
      '<div data-tbox id="anTbox"' + (open ? '' : ' hidden') + '><label for="anT" class="lab">' + esc(label || 'Time') + '</label><div class="an-time"><input class="an-in an-tnum" id="anT" name="time" type="time" value="' + hhmm(t) + '" required><button type="button" class="an-btn" data-now>Now</button></div></div></div>';
  }
  function bindTime(w) {
    var b = $('[data-now]', w); if (b) b.onclick = function () { var ti = $('[name=time]', w); ti.value = hhmm(now()); ti.dataset.touched = ''; };
    var o = $('[data-topen]', w); if (o) o.onclick = function () {
      var box = $('[data-tbox]', w), open = box.hidden; box.hidden = !open; o.setAttribute('aria-expanded', String(open)); o.textContent = open ? 'Use now' : 'Change';
      var ti = $('[name=time]', w); if (open) ti.focus(); else ti.dataset.touched = '';
      var tn = $('[data-tnow]', w); if (tn) tn.textContent = open ? 'as set below' : 'Now';
    };
  }
  function readClock(v, r) {
    var m = /^(\d{1,2}):(\d{2})/.exec(v || ''); if (!m) bad('Enter the time.', 'time');
    var ref = now(), best = null;
    [-1, 0, 1].forEach(function (k) { var d = new Date(ref); d.setDate(d.getDate() + k); d.setHours(+m[1], +m[2], 0, 0); var tt = d.getTime(); if (best === null || Math.abs(tt - ref) < Math.abs(best - ref)) best = tt; });
    if (best > ref + 5 * MIN) bad('That time is in the future.', 'time');
    if (r && r.start && best < r.start - 6 * 60 * MIN) bad('That time is long before this case started.', 'time');
    return best;
  }
  function readClockSafe(v) { try { return readClock(v); } catch (e) { return now(); } }
  /* the clock time typed, on the date nearest the case; "Now" (the box still closed) is the moment of saving */
  function readTime(w, r) {
    var el = $('[name=time]', w); if (!el) return now();
    if (el.dataset.touched === '1' || !el.closest('[hidden]')) return readClock(el.value, r);
    return now();   /* "Now" unless a time was typed */
  }

  function patientSheet(r, readOnly) {
    if (r && readOnly) {
      var pr = r.patient, rows = [['Species', cap(pr.species)], ['Breed', pr.breed], ['Sex', pr.sex], ['Age', pr.age], ['ASA', pr.asa ? pr.asa + (pr.emergency ? 'E' : '') : ''], ['Code status', pr.cpr || 'Not recorded'], ['Allergies', pr.allergies || (pr.nka ? 'None known' : 'Not recorded')], ['Procedure', r.procedure], ['Confirmed', r.confirmed ? r.confirmed.by + ', ' + fmtTime(r.confirmed.at) : A.isConfirmed(r) ? '—' : 'Not yet'], ['Resident', r.team.resident], ['Supervisor', r.team.supervisor]].filter(function (x) { return x[1]; });
      openSheet({ title: pr.name || 'Patient', primary: null, focus: '[data-x]', body: '<dl class="an-dl">' + rows.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' });
      var xb = $('#anSheet [data-x]'); if (xb) xb.textContent = 'Close'; return;
    }
    var fromSheet = !r && SHEET && PRE, p = r ? r.patient : fromSheet ? { name: PRE.name || '', species: PRE.species || 'dog', breed: PRE.breed || '', sex: PRE.sex || '', age: PRE.age || '', cpr: PRE.cpr || '', allergies: PRE.allergies || '', nka: !!PRE.nka } : { species: 'dog' }, edit = !!r;
    var isCase = (r && r.kind === 'case') || fromSheet;
    openSheet({
      title: edit ? 'Patient details' : fromSheet ? 'Start anesthesia record' : 'New training record', primary: edit ? 'Done' : 'Create', quiet: edit,
      body: (isCase ? '<div class="an-banner info" style="margin:0"><span><b>From the treatment sheet.</b> Name, weight, code status and allergies were filled in from ' + esc(p.name || 'the sheet') + '’s treatment sheet. Check them before you start.</span></div>'
        : '<div class="an-banner info" style="margin:0"><span><b>Training record.</b> Use the case’s training name. This record is not part of the medical record.</span></div>') +
        '<div class="an-f"><label for="pN">Patient name</label><input class="an-in" id="pN" name="name" maxlength="80" autocomplete="off" autocapitalize="words" required value="' + esc(p.name || '') + '" placeholder="For example, Training dog 4"></div>' +
        '<div class="an-f"><span class="lab" id="pSpL">Species</span>' + chips('species', [['dog', 'Dog'], ['cat', 'Cat'], ['other', 'Other']], p.species || 'dog') + '</div>' +
        '<div class="an-three"><div class="an-f"><label for="pB">Breed</label><input class="an-in" id="pB" name="breed" maxlength="60" value="' + esc(p.breed || '') + '"></div>' +
        '<div class="an-f"><label for="pS">Sex</label><select class="an-sel" id="pS" name="sex">' + ['', 'Male', 'Male neutered', 'Female', 'Female spayed'].map(function (x) { return '<option' + (x === (p.sex || '') ? ' selected' : '') + ' value="' + x + '">' + (x || '—') + '</option>'; }).join('') + '</select></div>' +
        '<div class="an-f"><label for="pA">Age</label><input class="an-in" id="pA" name="age" maxlength="20" value="' + esc(p.age || '') + '" placeholder="4 y"></div></div>' +
        (edit ? '' : '<div class="an-f"><span class="lab">Weight was</span>' + chips('method', [['measured', 'Measured on a scale'], ['estimated', 'Estimated']], 'measured') + '</div>') + (edit ? '' : '<div class="an-f"><label for="pW">Weight</label><div class="an-unit"><input class="an-in an-tnum" id="pW" name="kg" inputmode="decimal" autocomplete="off" value="' + (fromSheet && PRE.kg ? esc(String(PRE.kg)) : '') + '"><span class="u">kg</span></div><span class="hint">Leave empty if the patient hasn’t been weighed. Per-kg doses need a weight.</span></div>') +
        '<div class="an-two"><div class="an-f"><span class="lab">ASA status</span>' + chips('asa', [['', '—'], ['I', 'I'], ['II', 'II'], ['III', 'III'], ['IV', 'IV'], ['V', 'V']], p.asa || '') + '</div>' +
        '<label class="an-f" style="justify-content:flex-end"><span class="an-check" style="border-color:var(--an-line-2);background:transparent"><input type="checkbox" name="emergency"' + (p.emergency ? ' checked' : '') + '>Emergency (E)</span></label></div>' +
        '<div class="an-two"><div class="an-f"><span class="lab">Code status</span>' + chips('cpr', [['', 'Not recorded'], ['CPR', 'CPR'], ['DNR', 'DNR']], p.cpr || '') + '</div>' +
        '<div class="an-f"><label for="pAl">Allergies</label><input class="an-in" id="pAl" name="allergies" maxlength="300" autocomplete="off" value="' + esc(p.allergies || '') + '" placeholder="Drug or other allergies"><label class="an-check" style="margin-top:.375rem"><input type="checkbox" name="nka"' + (p.nka ? ' checked' : '') + '>No known allergies</label></div></div>' +
        '<div class="an-f"><label for="pP">Procedure</label><input class="an-in" id="pP" name="procedure" maxlength="160" value="' + esc(r ? r.procedure : '') + '"></div>' +
        '<div class="an-two"><div class="an-f"><label for="pR">Resident</label><input class="an-in" id="pR" name="resident" maxlength="80" value="' + esc(r ? r.team.resident : S.me) + '"></div>' +
        '<div class="an-f"><label for="pSu">Supervisor</label><input class="an-in" id="pSu" name="supervisor" maxlength="80" value="' + esc(r ? r.team.supervisor : '') + '"></div></div>',
      init: function (w) {
        bindChips(w);
        /* Create waits for a name */
        var ok = $('[data-ok]', w), nm = $('[name=name]', w), sync = function () { var none = !nm.value.trim(); ok.disabled = none; ok.title = none ? 'Give the patient a name first' : ''; };
        nm.addEventListener('input', sync); sync();
      },
      submit: function (w) {
        var name = val(w, 'name').trim(); if (!name) bad('Give the patient a name.', 'name');
        var alg = val(w, 'allergies').trim();
        var op = { type: 'patient', cpr: val(w, 'cpr'), allergies: alg, nka: !alg && val(w, 'nka'), name: name, species: val(w, 'species'), breed: val(w, 'breed').trim(), sex: val(w, 'sex'), age: val(w, 'age').trim(), asa: val(w, 'asa'), emergency: val(w, 'emergency'), procedure: val(w, 'procedure').trim(), resident: val(w, 'resident').trim(), supervisor: val(w, 'supervisor').trim() };
        if (edit) { change(r.id, op); return; }
        var kgv = val(w, 'kg').trim(), kg = kgv ? num(kgv) : null; if (kgv && (kg === null || kg <= 0 || kg > 150)) bad('Enter a weight between 0.01 and 150 kg, or leave it empty.', 'kg');
        var ctx = { by: S.me, at: now() }, rec = A.newRecord({ by: S.me, at: ctx.at, kind: fromSheet ? 'case' : 'training', sheetId: fromSheet ? SHEET : null });
        rec = A.apply(rec, op, ctx); if (kg) rec = A.apply(rec, { type: 'weight', kg: kg, method: val(w, 'method') }, ctx);
        createRecord(rec); closeSheet(true); location.hash = 'r=' + rec.id; return false;
      }
    });
  }

  function weightSheet(r) {
    var t = now(), w0 = A.weightAt(r, t);
    openSheet({
      title: w0 ? 'Change weight' : 'Add weight', primary: 'Save weight',
      body: '<div class="an-f"><label for="wK">Weight</label><div class="an-unit"><input class="an-in an-tnum" id="wK" name="kg" inputmode="decimal" autocomplete="off" value=""><span class="u">kg</span></div><span class="hint" data-lb>' + (w0 ? 'Now ' + sig(w0) + ' kg (' + sig(w0 * 2.20462) + ' lb).' : 'In kilograms.') + '</span></div>' +
        '<div class="an-f"><span class="lab">Weight was</span>' + chips('method', [['measured', 'Measured on a scale'], ['estimated', 'Estimated']], 'measured') + '</div>' +
        '<div data-impact></div>' + timeField(t, 'Weighed at'),
      init: function (w) {
        bindTime(w); bindChips(w); var inp = $('[name=kg]', w);
        inp.oninput = function () {
          var kg = num(inp.value); $('[data-lb]', w).textContent = kg ? '= ' + sig(kg * 2.20462) + ' lb' : (w0 ? 'Now ' + sig(w0) + ' kg.' : 'In kilograms.');
          var im = kg ? A.weightImpact(r, kg, now()).filter(function (x) { return x.to !== null; }) : [];
          $('[data-impact]', w).innerHTML = im.length ? '<div class="an-calc warn"><b>The pumps will need changing</b>' + im.map(function (x) { return esc(x.name) + ': ' + (x.from === null ? '—' : sig(x.from)) + ' → ' + sig(x.to) + ' mL/h'; }).join('<br>') + '<span style="display:block;margin-top:.25rem">What was ordered per kg stays the same.</span></div>' : '';
        };
      },
      submit: function (w) {
        var kg = num(val(w, 'kg')); if (kg === null) bad('Enter the weight.', 'kg');
        var t1 = readTime(w, r), im = A.weightImpact(r, kg, now()).filter(function (x) { return x.to !== null && x.from !== x.to; });
        try { change(r.id, { type: 'weight', kg: kg, at: t1, method: val(w, 'method') }, { quiet: true }); } catch (e) { e.field = 'kg'; throw e; }
        S.pumpNotice = im.length ? { id: r.id, items: im } : null; render();
      }
    });
  }

  function drugOptions(r, kinds) {
    var onRec = r.drugs.filter(function (d) { return kinds.indexOf(d.kind) > -1; }), names = onRec.map(function (d) { return d.name.toLowerCase(); });
    var lib = LIB.filter(function (d) { return kinds.indexOf(d.kind) > -1 && names.indexOf(d.name.toLowerCase()) < 0; });
    return (onRec.length ? '<optgroup label="On this record">' + onRec.map(function (d) { return '<option value="rec:' + d.id + '">' + esc(d.name) + (d.conc ? ' · ' + esc(conc(d.conc)) : '') + '</option>'; }).join('') + '</optgroup>' : '') +
      '<optgroup label="Add">' + lib.map(function (d, i) { return '<option value="lib:' + LIB.indexOf(d) + '">' + esc(d.name) + '</option>'; }).join('') + '<option value="new">Other…</option></optgroup>';
  }
  /* resolve the chosen drug; a drug not yet on the record is added first (in the same save) */
  function pickDrug(r, w, kind) {
    var v = val(w, 'drug'); if (!v) bad('Choose a drug.', 'drug');
    if (v.indexOf('rec:') === 0) return { drug: A.drug(r, v.slice(4)), add: null };
    var name = v === 'new' ? val(w, 'dname').trim() : LIB[+v.slice(4)].name; if (!name) bad('Name the drug.', 'dname');
    var cv = val(w, 'conc').trim(), c = cv === '' ? null : num(cv);
    if (kind !== 'fluid' && cv !== '' && (c === null || c <= 0)) bad('Enter the concentration in mg/mL.', 'conc');
    var lk = v === 'new' ? { kind: kind === 'fluid' ? 'fluid' : 'drug', route: 'IV' } : LIB[+v.slice(4)];
    var add = { type: 'drug', id: A.uid('d'), name: name, kind: lk.kind, conc: lk.kind === 'fluid' && !c ? null : c, route: lk.route };
    return { drug: { id: add.id, name: name, kind: add.kind, conc: add.conc, route: add.route }, add: add };
  }
  /* the drugs this case already uses, most recent first — one tap picks one */
  function recentDrugs(r, kinds) {
    var last = {};
    r.doses.forEach(function (x) { last[x.drugId] = Math.max(last[x.drugId] || 0, x.at); });
    r.infusions.forEach(function (i) { last[i.drugId] = Math.max(last[i.drugId] || 0, i.start); });
    return r.drugs.filter(function (d) { return kinds.indexOf(d.kind) > -1; }).sort(function (a, b) { return (last[b.id] || 0) - (last[a.id] || 0); }).slice(0, 6);
  }
  function drugFields(r, kinds, cur) {
    var quick = recentDrugs(r, kinds), label = kinds.indexOf('fluid') > -1 ? 'Drug or fluid' : 'Drug';
    return (quick.length ? '<div class="an-f"><span class="lab" id="dQl">' + label + '</span><div class="an-chips" role="group" aria-labelledby="dQl">' + quick.map(function (d) { return '<button type="button" class="an-chip" data-pick="rec:' + d.id + '" aria-pressed="false">' + dot(d) + esc(d.name) + '</button>'; }).join('') + '<button type="button" class="an-chip" data-pick="other" aria-pressed="false">Other…</button></div></div>' : '') +
      '<div class="an-f" data-dsel' + (quick.length ? ' hidden' : '') + '><input type="search" class="an-in" data-dfind placeholder="Search drugs" aria-label="Search drugs" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"><label for="dD">' + (quick.length ? 'Other ' + label.toLowerCase() : label) + '</label><select class="an-sel" id="dD" name="drug"><option value="">Choose…</option>' + drugOptions(r, kinds) + '</select></div>' +
      '<div class="an-f" data-dname hidden><label for="dNm">Name</label><input class="an-in" id="dNm" name="dname" maxlength="60" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="words"></div>' +
      '<div class="an-f" data-conc hidden><label for="dC">Concentration</label><div class="an-unit"><input class="an-in an-tnum" id="dC" name="conc" inputmode="decimal" autocomplete="off"><span class="u">mg/mL</span></div><span class="hint" data-conchint>Check the vial or syringe label. For mcg/mL, divide by 1000 (50 mcg/mL = 0.05).</span></div>';
  }
  function bindDrug(w, r, onPick) {
    var sel = $('[name=drug]', w), find = $('[data-dfind]', w);
    if (find) find.addEventListener('input', function () {
      var q = find.value.trim().toLowerCase(), first = null;
      $$('option', sel).forEach(function (o) { var hit = !q || !o.value || o.value === 'new' || o.textContent.toLowerCase().indexOf(q) > -1; o.hidden = !hit; if (hit && o.value && o.value !== 'new' && !first) first = o; });
      if (first && q) { sel.value = first.value; sel.onchange(); }
    });
    $$('[data-pick]', w).forEach(function (c) {
      c.onclick = function () {
        $$('[data-pick]', w).forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        var v = c.getAttribute('data-pick');
        if (v === 'other') { $('[data-dsel]', w).hidden = false; sel.value = ''; sel.onchange(); (find || sel).focus(); return; }
        $('[data-dsel]', w).hidden = true; sel.value = v; sel.onchange();
        var lastDose = r.doses.filter(function (x) { return 'rec:' + x.drugId === v && !x.void && !x.noWeight; }).sort(function (a, b) { return b.at - a.at; })[0];
        var u = $('input[name=unit]', w);   /* the unit last used for this drug (never the amount) */
        if (lastDose && u && $('[data-chips=unit] [data-v="' + lastDose.unit + '"]', w)) $('[data-chips=unit] [data-v="' + lastDose.unit + '"]', w).click();
        var dz = $('[name=dose]', w) || $('[name=rate]', w); if (dz) dz.focus();
      };
    });
    sel.onchange = function () {
      var v = sel.value, isNew = v.indexOf('lib:') === 0 || v === 'new';
      $('[data-dname]', w).hidden = v !== 'new'; $('[data-conc]', w).hidden = !isNew;
      if (v.indexOf('lib:') === 0) { var d = LIB[+v.slice(4)]; $('[name=conc]', w).value = d.conc === null ? '' : d.conc; $('[data-conc]', w).hidden = d.kind === 'fluid'; }
      if (v === 'new') $('[name=conc]', w).value = '';
      onPick && onPick();
    };
  }
  function curDrug(r, w) {
    var v = val(w, 'drug'); if (!v) return null;
    if (v.indexOf('rec:') === 0) return A.drug(r, v.slice(4));
    var c = num(val(w, 'conc')); var lk = v === 'new' ? { kind: 'drug' } : LIB[+v.slice(4)];
    return { id: null, name: v === 'new' ? val(w, 'dname') : lk.name, kind: lk.kind, conc: c };
  }

  function doseSheet(r) {
    var t = now();
    openSheet({
      title: 'Give drug', primary: 'Record dose',
      body: drugFields(r, ['drug']) +
        '<div class="an-f"><label for="dDo">Dose</label><input class="an-in an-tnum" id="dDo" name="dose" inputmode="decimal" autocomplete="off"></div>' +
        '<div class="an-f"><span class="lab">Unit</span>' + chips('unit', A.BOLUS_UNITS.map(function (u) { return [u, u]; }), 'mg/kg') + '</div>' +
        '<div data-calc></div><div data-nw hidden><div class="an-f"><label for="dG">Dose given</label><div class="an-unit"><input class="an-in an-tnum" id="dG" name="mgGiven" inputmode="decimal" autocomplete="off"><span class="u">mg</span></div><span class="hint">No weight on file, so this dose can’t be calculated. Type the dose you actually gave.</span></div><label class="an-check" style="margin-top:.75rem"><input type="checkbox" name="confirmNoWeight">I confirm this is the dose given — there is no weight on file</label></div>' +
        '<div data-big hidden><label class="an-check"><input type="checkbox" name="confirmBig"><span data-bigtxt></span></label></div>' +
        '<div class="an-tline" data-rsum><span>Route and time: <b data-sumtxt>IV · Now</b></span><button type="button" class="an-btn plain sm" data-ropen aria-expanded="false" aria-controls="anRbox">Change</button></div>' +
        '<div data-rbox id="anRbox" hidden><div class="an-f"><span class="lab">Route</span>' + chips('route', ROUTES.map(function (x) { return [x, x]; }), 'IV') + '</div>' + timeField(t, 'Time', true) + '</div>',
      focus: recentDrugs(r, ['drug']).length ? '[data-pick]' : '[name=drug]',
      init: function (w) {
        bindTime(w);
        var ro = $('[data-ropen]', w), rbox = $('[data-rbox]', w), ti = $('[name=time]', w);
        var sumTxt = function () { $('[data-sumtxt]', w).textContent = val(w, 'route') + ' · ' + (ti.dataset.touched === '1' ? fmtTime(readClockSafe(ti.value)) : 'Now'); };
        ro.onclick = function () { var open = rbox.hidden; rbox.hidden = !open; ro.setAttribute('aria-expanded', String(open)); ro.textContent = open ? 'Done' : 'Change'; sumTxt(); if (open) { var c = $('[data-chips=route] [aria-pressed=true]', w); if (c) c.focus(); } else ro.focus(); };
        ti.addEventListener('input', sumTxt);
        var upd = function () {
          var d = curDrug(r, w), unit = val(w, 'unit'), dose = val(w, 'dose'), wt = A.weightAt(r, now()), box = $('[data-calc]', w), nw = $('[data-nw]', w), big = $('[data-big]', w);
          nw.hidden = true; big.hidden = true; box.innerHTML = '';
          if (!d || !dose) return;
          var b = A.bolus({ dose: dose, unit: unit, weightKg: wt, conc: d.conc });
          if (!b.ok && b.error === 'needs-weight') { nw.hidden = false; box.innerHTML = '<div class="an-calc warn"><b>' + icon('scale', { slash: true, scale: 's' }) + 'Needs a weight</b><span>Add a weight to calculate ' + esc(unit) + ' doses, or type the dose given below.</span></div>'; return; }
          if (!b.ok) return;
          box.innerHTML = '<div class="an-calc" aria-live="polite"><b>' + amt(b.mg) + (b.mL !== null ? ' · ' + sig(b.mL) + ' mL' : '') + '</b><span>' + (b.perKg ? esc(sig(num(dose)) + ' ' + unit + ' × ' + sig(wt) + ' kg') : esc(sig(num(dose)) + ' ' + unit)) + (d.conc ? ' · ' + esc(conc(d.conc)) : ' · no concentration, so no volume') + (b.perKg ? '' : wt ? ' · ' + amtKg(b.mg / wt) : '') + '</span></div>';
          var prev = r.doses.filter(function (x) { return !x.void && d.id && x.drugId === d.id && x.mg; }).sort(function (a, c) { return c.at - a.at; })[0];
          var ratio = prev ? b.mg / prev.mg : 0;
          if (ratio >= 5 || (b.mL !== null && b.mL > 50)) { big.hidden = false; $('[data-bigtxt]', w).textContent = ratio >= 5 ? 'This is ' + Math.round(ratio) + '× the last ' + d.name + ' dose (' + amt(prev.mg) + ' at ' + fmtTime(prev.at) + '). I’ve checked it.' : 'This is ' + sig(b.mL) + ' mL. I’ve checked the dose and the concentration.'; }
        };
        bindDrug(w, r, upd); bindChips(w, function (n) { upd(); if (n === 'route') $('[data-sumtxt]', w).textContent = val(w, 'route') + ' · ' + ($('[name=time]', w).dataset.touched === '1' ? fmtTime(readClockSafe($('[name=time]', w).value)) : 'Now'); }); $('[name=dose]', w).oninput = upd; $('[name=conc]', w).oninput = upd;
      },
      submit: function (w) {
        var pk = pickDrug(r, w, 'drug'), t1 = readTime(w, r);
        if (!$('[data-big]', w).hidden && !val(w, 'confirmBig')) bad('Tick the box to confirm this dose.', 'confirmBig');
        var op = { type: 'dose', drugId: pk.drug.id, dose: val(w, 'dose'), unit: val(w, 'unit'), route: val(w, 'route'), mgGiven: val(w, 'mgGiven'), confirmNoWeight: val(w, 'confirmNoWeight'), at: t1, eid: A.uid('b') };
        /* check the whole change before saving any of it */
        var trial = pk.add ? A.apply(recOf(r.id), pk.add, { by: S.me, at: now() }) : recOf(r.id);
        try { A.apply(trial, op, { by: S.me, at: now() }); } catch (e) { e.field = e.code === 'needs-weight' ? 'mgGiven' : e.code === 'dose' ? 'dose' : e.code === 'confirm' ? 'confirmNoWeight' : null; throw e; }
        if (pk.add) change(r.id, pk.add, { quiet: true });
        change(r.id, op);
      }
    });
  }

  function infusionSheet(r) {
    openSheet({
      title: 'Start infusion', primary: 'Start', focus: recentDrugs(r, ['drug', 'fluid']).length ? '[data-pick]' : '[name=drug]',
      body: drugFields(r, ['drug', 'fluid']) +
        '<div class="an-f"><label for="iR">Rate</label><input class="an-in an-tnum" id="iR" name="rate" inputmode="decimal" autocomplete="off"></div>' +
        '<div class="an-f"><span class="lab">Unit</span>' + chips('unit', A.RATE_UNITS.map(function (u) { return [u, u]; }), 'mcg/kg/min') + '</div><div data-calc></div>' + timeField(now(), 'Started at'),
      init: function (w) {
        bindTime(w);
        var upd = function () {
          var d = curDrug(r, w), unit = val(w, 'unit'), rt = val(w, 'rate'), wt = A.weightAt(r, now()), box = $('[data-calc]', w); box.innerHTML = '';
          if (d && d.kind === 'fluid' && !/^mL/.test(unit)) { $$('[data-chips=unit] .an-chip', w).forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-v') === 'mL/kg/h'); }); $('[name=unit]', w).value = unit = 'mL/kg/h'; }
          if (!d || rt === '') return;
          var p = A.rate({ rate: rt, unit: unit, weightKg: wt, conc: d.conc });
          if (!p.ok && p.error === 'needs-weight') { box.innerHTML = '<div class="an-calc warn"><b>' + icon('scale', { slash: true, scale: 's' }) + 'Needs a weight</b><span>Per-kg infusions can’t start without a weight. Add one, or set the rate in mL/h.</span></div>'; return; }
          if (!p.ok) return;
          box.innerHTML = '<div class="an-calc" aria-live="polite"><b>Pump ' + (p.mLPerH !== null ? sig(p.mLPerH) + ' mL/h' : '—') + '</b><span>' + (p.mgPerH !== null ? amt(p.mgPerH) + ' per hour' : '') + (A.perKg(unit) ? ' · at ' + sig(wt) + ' kg' : '') + (d.conc ? ' · ' + conc(d.conc) : (d.kind === 'fluid' ? '' : ' · add the concentration to get mL/h')) + '</span></div>';
        };
        bindDrug(w, r, upd); bindChips(w, upd); $('[name=rate]', w).oninput = upd; $('[name=conc]', w).oninput = upd;
      },
      submit: function (w) {
        var pk = pickDrug(r, w, val(w, 'unit').indexOf('mL') === 0 ? 'fluid' : 'drug'), t1 = readTime(w, r);
        var op = { type: 'infusion', drugId: pk.drug.id, rate: val(w, 'rate'), unit: val(w, 'unit'), at: t1, eid: A.uid('i') };
        var trial = pk.add ? A.apply(recOf(r.id), pk.add, { by: S.me, at: now() }) : recOf(r.id);
        try { A.apply(trial, op, { by: S.me, at: now() }); } catch (e) { e.field = e.code === 'rate' ? 'rate' : null; throw e; }
        if (pk.add) change(r.id, pk.add, { quiet: true });
        change(r.id, op);
      }
    });
  }

  function infusionDetail(r, iid) {
    var inf = r.infusions.filter(function (i) { return i.id === iid; })[0]; if (!inf) return;
    var d = A.drug(r, inf.drugId) || {}, t = now(), p = A.pumpNow(r, inf, t), running = !inf.end && !inf.void, a = A.infused(r, inf, inf.end || t);
    var hist = A.segments(inf, inf.end || t).map(function (s) { return '<li><time>' + fmtTime(s.from) + '</time><span>' + sig(s.rate) + ' ' + esc(inf.unit) + '</span></li>'; }).join('');
    var signed = r.status === 'signed';
    openSheet({
      title: d.name + ' infusion', primary: running && !signed ? 'Change rate' : null, quiet: true, focus: running && !signed ? '[name=rate]' : '[data-x]',
      body: '<dl class="an-dl"><dt>Ordered</dt><dd>' + sig(A.rateAt(inf, Math.min(t, inf.end ? inf.end - 1 : t))) + ' ' + esc(inf.unit) + '</dd>' + (running && p && p.ok ? '<dt>Pump now</dt><dd>' + (p.mLPerH !== null ? sig(p.mLPerH) + ' mL/h' : '—') + '</dd>' : '') +
        '<dt>Started</dt><dd>' + fmtTime(inf.start) + ' · ' + esc(inf.by) + '</dd>' + (inf.end ? '<dt>Stopped</dt><dd>' + fmtTime(inf.end) + '</dd>' : '') +
        '<dt>Given so far</dt><dd>' + (d.kind === 'fluid' ? sig(a.mL) + ' mL' : amt(a.mg) + (a.mL ? ' · ' + sig(a.mL) + ' mL' : '')) + '</dd>' + (inf.void ? '<dt>Struck through</dt><dd>' + esc(inf.void.reason) + ' · ' + esc(inf.void.by) + '</dd>' : '') + '</dl>' +
        '<ul class="an-hist" style="border:1px solid var(--an-line);border-radius:var(--an-r-m)">' + hist + '</ul>' +
        (running && !signed ? '<div class="an-f"><label for="iNr">New rate</label><div class="an-unit"><input class="an-in an-tnum" id="iNr" name="rate" inputmode="decimal" autocomplete="off"><span class="u">' + esc(inf.unit) + '</span></div><span class="hint" data-pump></span></div>' + timeField(t) +
          '<div style="display:flex;gap:.75rem;flex-wrap:wrap"><button type="button" class="an-btn" data-stop>' + icon('stop') + 'Stop at this time</button></div>' : '') +
        (!inf.void && !signed ? '<button type="button" class="an-btn danger" data-void style="align-self:flex-start">Strike through…</button>' : ''),
      init: function (w) {
        bindTime(w);
        var rt = $('[name=rate]', w); if (rt) rt.oninput = function () { var q = A.rate({ rate: rt.value, unit: inf.unit, weightKg: A.weightAt(r, now()), conc: d.conc }); $('[data-pump]', w).textContent = q.ok && q.mLPerH !== null ? 'Pump ' + sig(q.mLPerH) + ' mL/h' : ''; };
        var st = $('[data-stop]', w); if (st) st.onclick = function () { try { change(r.id, { type: 'stop', infusionId: inf.id, at: readTime(w, r) }); closeSheet(); } catch (e) { $('[data-err]', w).textContent = e.message; } };
        var vd = $('[data-void]', w); if (vd) vd.onclick = function () { voidSheet(r, 'infusion', inf.id, d.name + ' infusion'); };
      },
      submit: function (w) { change(r.id, { type: 'rate', infusionId: inf.id, rate: val(w, 'rate'), at: readTime(w, r), eid: A.uid('c') }); }
    });
  }

  function gasSheet(r, agent) {
    var t = now(), a0 = agent || (r.gases.length ? r.gases[r.gases.length - 1].agent : 'iso');
    if (r.status === 'signed') return;
    openSheet({
      title: 'Gas', primary: 'Set', quiet: true,
      body: '<div class="an-f"><span class="lab">Agent</span>' + chips('agent', [['iso', 'Isoflurane'], ['sevo', 'Sevoflurane'], ['o2', 'Oxygen']], a0) + '</div>' +
        '<div class="an-f"><label for="gV">Setting</label><div class="an-unit"><button type="button" class="an-btn icon" data-step="-1" aria-label="Decrease">−</button><input class="an-in an-tnum" id="gV" name="value" inputmode="decimal" autocomplete="off" style="text-align:center"><button type="button" class="an-btn icon" data-step="1" aria-label="Increase">+</button><span class="u" data-gu></span></div><span class="hint" data-gnow></span></div>' + timeField(t),
      init: function (w) {
        bindTime(w);
        var sync = function () { var ag = val(w, 'agent'), cur = A.gasAt(r, ag, now()); $('[data-step="-1"]', w).setAttribute('aria-label', 'Decrease ' + AGENT[ag].name.toLowerCase()); $('[data-step="1"]', w).setAttribute('aria-label', 'Increase ' + AGENT[ag].name.toLowerCase()); $('[data-gu]', w).textContent = AGENT[ag].unit; $('[data-gnow]', w).textContent = cur === null ? 'Not set yet. Set 0 to turn it off.' : 'Now ' + sig(cur) + ' ' + AGENT[ag].unit + '. Set 0 to turn it off.'; $('[name=value]', w).value = cur === null ? '' : cur; };
        bindChips(w, sync); sync();
        $$('[data-step]', w).forEach(function (b) { b.onclick = function () { var ag = val(w, 'agent'), v = num($('[name=value]', w).value) || 0; v = Math.max(0, Math.round((v + (+b.getAttribute('data-step')) * AGENT[ag].step) * 100) / 100); $('[name=value]', w).value = v; }; });
      },
      submit: function (w) { try { change(r.id, { type: 'gas', agent: val(w, 'agent'), value: val(w, 'value'), at: readTime(w, r), eid: A.uid('g') }); } catch (e) { e.field = 'value'; throw e; } }
    });
  }

  function eventSheet(r) {
    var opts = Object.keys(A.EVENTS).filter(function (k) { return k !== 'anesthesia_start' && k !== 'anesthesia_end'; }).map(function (k) { return [k, A.EVENTS[k]]; });
    openSheet({
      title: 'Event', primary: 'Add', quiet: true,
      body: (!(A.timeoutStatus(r) || {}).complete && r.status !== 'signed' ? '<div class="an-tline an-towarn"><span>Time-out ' + (A.timeoutStatus(r) ? 'not complete' : 'not done yet') + ' — do it before incision.</span><button type="button" class="an-btn plain sm" data-dotimeout>Do time-out</button></div>' : '') + '<div class="an-f"><span class="lab">What happened</span>' + chips('kind', opts, '') + '</div><div class="an-f"><label for="eN">Note</label><textarea class="an-ta" id="eN" name="note" maxlength="300"></textarea></div>' + timeField(now()),
      focus: '.an-chip', init: function (w) { bindTime(w); bindChips(w); var dt = $('[data-dotimeout]', w); if (dt) dt.onclick = function () { closeSheet(true); timeoutSheet(r); }; },
      submit: function (w) { if (!val(w, 'kind')) bad('Choose what happened.'); if (val(w, 'kind') === 'note' && !val(w, 'note').trim()) bad('Write the note.', 'note'); change(r.id, { type: 'event', kind: val(w, 'kind'), note: val(w, 'note'), at: readTime(w, r), eid: A.uid('e') }); }
    });
  }

  function entrySheet(r, list, id, anchor) {
    var L = { dose: r.doses, vitals: r.vitals, event: r.events, gas: r.gases, output: r.outputs || [], vent: r.vents || [] }[list] || [], x = L.filter(function (e) { return e.id === id; })[0]; if (!x) return;
    var rows = [], title = '';
    if (list === 'dose') { var d = A.drug(r, x.drugId) || {}; title = d.name; rows = [['Dose', amt(x.mg) + (x.mL !== null ? ' · ' + sig(x.mL) + ' mL' : '')], ['Ordered as', x.noWeight ? 'Typed in mg — no weight on file' : sig(x.dose) + ' ' + x.unit + (x.weightKg ? ' at ' + sig(x.weightKg) + ' kg' : '')], ['Route', x.route || '—']]; }
    if (list === 'vitals') { title = 'Vitals'; rows = VF.concat(VF2).filter(function (m) { return x[m[0]] !== undefined; }).map(function (m) { return [m[1], sig(x[m[0]]) + ' ' + m[2] + (m[0] === 'map' && x.mapCalc ? ' (worked out from SAP and DAP)' : '')]; }); }
    if (list === 'event') { title = A.EVENTS[x.kind]; if (x.note) rows.push(['Note', x.note]); }
    if (list === 'vitals' && x.ecg) rows.push(['ECG', A.ECG[x.ecg]]);
    if (list === 'vent') { title = 'Ventilation'; rows = [['Mode', A.VENT[x.mode]]].concat(ventBits(x).map(function (b) { return [b[0], b[1]]; })); }
    if (list === 'output') { title = A.OUTPUTS[x.kind]; rows = [['Volume', sig(x.mL) + ' mL']]; if (x.note) rows.push(['Note', x.note]); }
    if (list === 'gas') { title = AGENT[x.agent].name; rows = [['Setting', sig(x.value) + ' ' + AGENT[x.agent].unit]]; }
    rows.push(['Time', fmtTime(x.at)]); rows.push(['Charted by', x.by || '—']);
    if (x.void) rows.push(['Struck through', x.void.reason + ' · ' + x.void.by + ', ' + fmtTime(x.void.at)]);
    var canVoid = !x.void && r.status !== 'signed' && !(list === 'event' && /anesthesia_(start|end)/.test(x.kind));
    openSheet({
      title: title, primary: null, focus: '[data-x]', anchor: anchor,
      body: '<dl class="an-dl">' + rows.map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl>' + (canVoid ? '<button type="button" class="an-btn danger" data-void style="align-self:flex-start">Strike through…</button>' : ''),
      init: function (w) { var b = $('[data-void]', w); if (b) b.onclick = function () { voidSheet(r, list, id, title); }; }
    });
    var xb = $('#anSheet [data-x]'); if (xb) xb.textContent = 'Close';
  }
  function voidSheet(r, list, id, what) {
    openSheet({
      title: 'Strike through', primary: 'Strike through', danger: true,
      body: '<p style="margin:0">' + esc(what) + ' stays on the record, crossed out, with your name and reason. It no longer counts in the totals. A strike-through can’t be undone.</p><div class="an-f"><label for="vR">Reason</label><input class="an-in" id="vR" name="reason" maxlength="200" autocomplete="off" placeholder="For example, charted on the wrong case"></div>',
      submit: function (w) { try { change(r.id, { type: 'void', list: list, id: id, reason: val(w, 'reason') }); } catch (e) { e.field = 'reason'; throw e; } }
    });
  }
  function timeSheet(r, title, primary, fn, note) {
    openSheet({ title: title, primary: primary, body: (note ? '<p style="margin:0;color:var(--an-ink-3)">' + esc(note) + '</p>' : '') + timeField(now()), init: bindTime, submit: function (w) { fn(readTime(w, r)); } });
  }
  function signSheet(r) {
    openSheet({
      title: 'Sign record', primary: 'Sign',
      body: '<p style="margin:0">Sign as <b>' + esc(S.me) + '</b>. After signing the record is read-only; corrections go in an addendum.</p>' +
        (A.weightAt(r, now()) ? '' : '<div class="an-calc warn"><b>No weight on this record</b><span>Doses were typed in mg.</span></div>'),
      submit: function () { fire('sign:' + r.id); change(r.id, { type: 'sign' }); }
    });
  }
  function addendumSheet(r) {
    openSheet({ title: 'Addendum', primary: 'Add', quiet: true, body: '<div class="an-f"><label for="aT">Addendum</label><textarea class="an-ta" id="aT" name="text" maxlength="1000"></textarea></div>', submit: function (w) { try { change(r.id, { type: 'addendum', text: val(w, 'text') }); } catch (e) { e.field = 'text'; throw e; } } });
  }

  function toast(msg) { var el = $('#anToast'); if (!el) return; el.innerHTML = '<span>' + esc(msg) + '</span>'; showToast(el); clearTimeout(S.toastT); S.toastT = setTimeout(function () { el.hidden = true; }, 6000); }
  function showToast(el) { el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
  /* every change offers Undo — the message stays until the next change or until it is closed (no time limit);
     ⌘Z / Ctrl+Z steps back through your own changes from the last 2 minutes, ⇧⌘Z redoes; later fixes are a strike-through */
  function liveUndo() { var t = now(); S.undoStack = S.undoStack.filter(function (e) { return t - e.ts <= A.UNDO_MS && e.rid === S.cur; }); return S.undoStack; }
  function offerUndo(msg, redo) {
    var el = $('#anToast'); if (!el) return; clearTimeout(S.toastT);
    el.innerHTML = '<span>' + esc(msg) + '</span><button type="button" class="an-tbtn" id="anUndo">' + (redo ? 'Redo' : 'Undo') + '</button><button type="button" class="an-tx" id="anToastX" aria-label="Dismiss">' + icon('close') + '</button>';
    showToast(el);
    $('#anUndo').onclick = function () { if (redo) redoLast(); else undoLast(); };
    $('#anToastX').onclick = function () { el.hidden = true; };
  }
  function undoLast() {
    var e = liveUndo().pop(); var el = $('#anToast');
    if (!e) { toast('Nothing to undo — changes can be undone for 2 minutes.'); return; }
    try { change(e.rid, e.uop); } catch (x) { toast(x.message); return; }
    if (e.kind === 'weight') { S.pumpNotice = null; render(); }
    S.redoStack.push(e); scrollChartTo(e.t);
    offerUndo('Undid: ' + e.label, true);
  }
  function redoLast() {
    var e = S.redoStack.pop(); if (!e) { toast('Nothing to redo.'); return; }
    try { change(e.rid, JSON.parse(JSON.stringify(e.op)), { fromRedo: true }); } catch (x) { toast(x.message); return; }
    scrollChartTo(e.t);
  }
  document.addEventListener('keydown', function (e) {
    var a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    if ($('#anSheet')) { if (e.key === 'Escape' && !$('#anSheet').contains(document.activeElement)) { e.preventDefault(); var xb = $('#anSheet [data-x]'); if (xb) xb.click(); } return; }   /* n172: Esc before focus has moved into a new sheet */
    if (typing || !S.cur) return;
    if (e.key === 'Escape' && XP && !e.defaultPrevented) { e.preventDefault(); setExpanded(false); return; }   /* an open sheet takes Esc first */
    if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyF' && window.innerWidth > 600) { e.preventDefault(); setExpanded(!XP); return; }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redoLast(); else undoLast(); return; }
    /* shortcuts for the frequent actions (shown in each button's tooltip) */
    if (e.altKey && !e.metaKey && !e.ctrlKey) {
      var map = { KeyV: 'vitals', KeyD: 'dose', KeyI: 'infusion', KeyG: 'gas', KeyE: 'event', KeyO: 'output', KeyA: 'airway' }, act = map[e.code];
      if (act) { var b = $('[data-act="' + act + '"]'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
    }
  });

  /* keep the clock, now line and totals moving while a case runs (never while a sheet is open) */
  function sigOf() { try { return S.cur ? JSON.stringify(recOf(S.cur)) + '|' + S.loaded : JSON.stringify(allIds().map(recOf)) + '|' + S.loaded + S.filter; } catch (e) { return Math.random() + ''; } }
  function softRender() { var g = sigOf(); if (g === S.shownSig && !S.dirtyUi) return; render(true); }
  /* the clock, the now line, the tiles' ages and "vitals due" update in place; the page is rebuilt only when the chart must grow */
  function tick() {
    if (!S.cur || $('#anSheet')) return; var r = recOf(S.cur); if (!r || r.status !== 'active') return;
    var t = now(), cm = S.cm, due = vitalsDue(r, t), pill = $('.an-nh .an-pill.warn');
    if (!cm || t > cm.to - cm.col || (!!due) !== (!!pill)) { if (!S.vOpen) render(true); return; }
    var ck = $('.an-clock b'); if (ck) ck.textContent = dur(t - r.start);
    glideNow();
    if (pill) pill.textContent = 'Vitals due · ' + due + ' min';
    var vb = $('[data-act="vitals"]'); if (vb) vb.setAttribute('aria-label', 'Vitals now' + (due ? ', vitals due ' + due + ' minutes' : ''));
    $$('.an-tile [data-at]').forEach(function (el) { var age = Math.floor((t - +el.getAttribute('data-at')) / MIN); el.textContent = age < 1 ? 'Just now' : age + ' min ago'; el.closest('.an-tile').classList.toggle('stale', age >= 15); });
    var nt = $('.an-nt'); if (nt) nt.textContent = fmtTime(t);
    var nla = $('[data-last]'); if (nla) nla.textContent = ago(t - +nla.getAttribute('data-last'));
    $$('[data-abxdue]').forEach(function (el) { var st = abxState({ dueAt: +el.getAttribute('data-abxdue'), redoseMin: 1 }, t, true), row2 = el.closest('.an-abx'); el.textContent = st.txt; if (row2) { var was = row2.classList.contains('due') || row2.classList.contains('late'); row2.classList.remove('ok', 'due', 'late', 'unset'); row2.classList.add(st.cls); var ic2 = $('.an-abxic', row2), nk2 = 'abx:' + S.cur + ':' + row2.getAttribute('data-abx') + ':' + el.getAttribute('data-abxdue'); if (!was && (st.cls === 'due' || st.cls === 'late') && ic2 && !fired(nk2)) { fire(nk2); ic2.classList.remove('nudge'); void ic2.offsetWidth; ic2.classList.add('nudge'); } } });
  }
  function ago(ms) { var a = Math.floor(ms / MIN); return a < 1 ? 'just now' : a + ' min ago'; }
  setInterval(tick, TICK);
  /* coming back to the tab: catch up at once, and retry a waiting save (Multitasking) */
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { tick(); flush(); } });

  window.anesiaApp = { S: S, recOf: recOf, change: change, render: render, tick: tick };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* n158 — glass guard. Real blur stays on only while this device keeps up with it.
   While the page scrolls or a sheet opens, frame times are sampled for about a second. If more than one in ten of the
   frames take longer than 25 ms, blur is switched off for good on this device (html.an-noblur → frosted solid, no blur). */
(function () {
  var KEY = 'anesia:v1:blur', root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { } }
  if (get() === '0') { root.classList.add('an-noblur'); return; }
  var busy = false, rounds = 0;
  function sample() {
    if (busy || root.classList.contains('an-noblur') || rounds >= 6) return;
    busy = true; rounds++;
    var d = [], last = 0, t0 = 0;
    requestAnimationFrame(function f(t) {
      if (!t0) { t0 = last = t; return requestAnimationFrame(f); }
      d.push(t - last); last = t;
      if (t - t0 < 1000) return requestAnimationFrame(f);
      busy = false;
      if (d.length > 10 && d.filter(function (x) { return x > 25; }).length / d.length > 0.1) {
        root.classList.add('an-noblur'); set('0'); window.__anBlurOff = { frames: d.length, at: Date.now() };
      } else if (rounds >= 3) set('1');
    });
  }
  window.addEventListener('scroll', sample, { passive: true, capture: true });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-act]')) sample(); }, true);
  window.anesiaGlass = { sample: sample };
})();

/* n159 — toolbar behaviour, Liquid Glass style: a scroll-edge fade when content runs under it, and it shrinks to
   icons while you scroll down (labels come back when you scroll up). Classes live on <html>, so re-renders keep them. */
(function () {
  var root = document.documentElement, lastY = window.scrollY, ticking = false, down = 0;
  function update() {
    ticking = false;
    var bar = document.querySelector('.an-tools'), y = window.scrollY, dy = y - lastY; lastY = y;
    var stuck = !!bar && getComputedStyle(bar).position === 'sticky' && bar.getBoundingClientRect().top <= 12 && y > 40;
    var h1 = document.querySelector('.an-rhead .an-id h1'); root.classList.toggle('an-titled', !!(stuck && h1 && h1.getBoundingClientRect().bottom < bar.getBoundingClientRect().bottom));   /* n170: the name moves into the toolbar */
    root.classList.toggle('an-stuck', stuck);
    if (!stuck) { root.classList.remove('an-compact'); down = 0; return; }
    if (dy > 0) { down += dy; if (down > 48) root.classList.add('an-compact'); }
    else if (dy < -4) { down = 0; root.classList.remove('an-compact'); }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.anesiaBar = { update: update };
})();

/* n164 — Larger Text: read the real root text size (iOS/iPadOS Dynamic Type sets it through -apple-system-body)
   and switch to the stacked header when text is big. */
(function () {
  var root = document.documentElement, last = '';
  function check() {
    var px = parseFloat(getComputedStyle(root).fontSize) || 16, k = px >= 25 ? 'huge' : px >= 20 ? 'big' : '';
    if (k !== last) { last = k; root.classList.toggle('an-bigtext', !!k); root.classList.toggle('an-hugetext', k === 'huge'); }
    if (typeof fit === 'function') fit();
  }
  check(); window.addEventListener('resize', check); document.addEventListener('visibilitychange', check);
  new MutationObserver(check).observe(root, { attributes: true, attributeFilter: ['style'] });
  /* the toolbar drops its labels when they would push it onto a second row */
  function fit() {
    var bar = document.querySelector('.an-tools'); if (!bar) return;
    root.classList.remove('an-toolsicons');
    var first = bar.firstElementChild, h = first ? first.getBoundingClientRect().height : 44;
    if (bar.getBoundingClientRect().height > h * 1.6) root.classList.add('an-toolsicons');
  }
  window.addEventListener('resize', function () { requestAnimationFrame(fit); });
  window.anesiaText = { check: check, fit: fit };
})();
