/* Pravix Treatment Sheets — Anesthesia tab (n166, Expand n169, state badge n176)
   The patient's anesthesia record lives in Anesia; this tab shows it inside the sheet, next to Vitals.
   Same origin, same sign-in: Anesia runs in a frame in embed mode (?embed=1&sheet=<id>&pre=<patient from the sheet>).
   Records started here are linked to the sheet (kind "case"); Anesia's own training records are untouched. */
(function () {
  'use strict';
  var frame = null, frameSheet = null, poll = null;
  function sheetId() {
    var m = (location.hash.match(/sheet=([^&]+)/) || [])[1];
    if (m) try { return decodeURIComponent(m); } catch (e) { return m; }
    try { return localStorage.getItem('tsCurrentSheet'); } catch (e) { return null; }
  }
  function V() { try { return VISIT; } catch (e) { return {}; } }   /* VISIT is the open sheet's patient (core.js) */
  function sexOf(x) {
    x = String(x || '').toLowerCase();
    if (/neut|castr|^mn$/.test(x)) return 'Male neutered'; if (/spay|^fs$/.test(x)) return 'Female spayed';
    if (/^m|male/.test(x)) return 'Male'; if (/^f|female/.test(x)) return 'Female'; return '';
  }
  function pre() {
    var v = V(), code = String(v.code || '').toUpperCase(), alg = String(v.allergies || '').trim();
    var nka = !alg || /^(none|none known|nka|no known allergies|—|-)$/i.test(alg);
    return { name: v.patient && v.patient !== 'Unnamed patient' ? v.patient : '', species: /^(cat|fel)/i.test(v.species || '') ? 'cat' : /^(dog|can)/i.test(v.species || 'dog') ? 'dog' : 'other',
      breed: v.breed && v.breed !== '—' ? v.breed : '', sex: sexOf(v.sex), age: v.age && v.age !== '—' ? v.age : '', kg: Number(v.weight) || '',
      cpr: ['ALS', 'BLS', 'CPR', 'DNR'].indexOf(code) > -1 ? code : '', allergies: nka ? '' : alg, nka: nka };   /* n176: the sheet's four codes, not just CPR/DNR */
  }
  function srcFor(id) { return '/anesia/?embed=1&sheet=' + encodeURIComponent(id) + '&pre=' + encodeURIComponent(JSON.stringify(pre())); }
  function fit() {
    if (!frame || !frame.isConnected) return;
    var top = frame.getBoundingClientRect().top; frame.style.height = Math.max(420, window.innerHeight - top - 12) + 'px';
  }
  function mirrorTheme() {
    if (!frame) return;
    var dark = document.body.classList.contains('dark'), cs = dark ? 'dark' : 'light';
    frame.style.colorScheme = cs;   /* must equal the record's own scheme, or the browser paints an opaque canvas (the grey box) */
    try { var d = frame.contentDocument; if (d && d.body) { d.body.classList.toggle('dark', dark); d.documentElement.style.colorScheme = cs; } } catch (e) { }
  }
  /* n169 — Expand: Anesia asks (button, ⌥F, Esc); the sheet makes the frame cover the window and animates it */
  function expanded() { var b = document.querySelector('#ctab-anes .ts-anes'); return !!(b && b.classList.contains('expanded')); }
  function setExpanded(on, tellFrame) {
    var box = document.querySelector('#ctab-anes .ts-anes'); on = !!on;
    if (!box || box.classList.contains('expanded') === on) return;
    var apply = function () { box.classList.toggle('expanded', on); document.documentElement.classList.toggle('ts-anes-lock', on); fit(); };
    if (document.startViewTransition) { try { document.startViewTransition(apply); } catch (e) { apply(); } } else apply();
    if (tellFrame && frame && frame.contentWindow) try { frame.contentWindow.postMessage({ anesiaHost: 'expanded', on: on }, location.origin); } catch (e) { }
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow || !e.data || e.data.anesia !== 'expand') return;
    setExpanded(e.data.on, false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && expanded()) { e.preventDefault(); setExpanded(false, true); } });
  function render() {
    var host = document.getElementById('ctab-anes'); if (!host) return;
    var id = sheetId(), v = V();
    if (!id || !v.patient) {
      frame = null; frameSheet = null;
      host.innerHTML = '<div class="ts-empty"><div class="ts-empty-card"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M10 2.5h4M12 2.5v3"/></svg></div><b>No patient open</b><span>Open a patient’s sheet to see or start their anesthesia record.</span><div class="row"><button type="button" class="ts-btn" onclick="selectCTab(\'dash\')">Inpatients</button></div></div></div>';
      return;
    }
    var head = ''; try { head = typeof patientCmdHTML === 'function' ? patientCmdHTML() : ''; } catch (e) { head = ''; }
    if (frame && frameSheet === id && frame.isConnected) {   /* same patient: refresh the header only, keep the record as it is */
      var h = host.querySelector('.ts-anes-head'); if (h) h.innerHTML = head; fit(); return;
    }
    document.documentElement.classList.remove('ts-anes-lock');
    host.innerHTML = '<div class="ts-anes"><div class="ts-anes-head">' + head + '</div><iframe class="ts-anes-frame" title="Anesthesia record" loading="eager"></iframe></div>';
    frame = host.querySelector('iframe'); frameSheet = id;
    frame.addEventListener('load', function () { mirrorTheme(); fit(); });
    mirrorTheme(); frame.src = srcFor(id); requestAnimationFrame(fit);
  }
  /* hook into the sheet's tab switcher */
  function install() {
    if (typeof window.selectCTab !== 'function' || window.selectCTab.__anes) return false;
    var orig = window.selectCTab;
    var wrapped = function (e) {
      orig.apply(this, arguments);
      var on = e === 'anes' && !!document.getElementById('ctab-anes');
      var st = document.getElementById('stage'); if (st) st.classList.toggle('anes-active', on);
      clearInterval(poll); poll = null;
      if (!on) setExpanded(false, true);
      if (on) { render(); poll = setInterval(function () { if (sheetId() !== frameSheet) render(); }, 800); }
    };
    wrapped.__anes = true; window.selectCTab = wrapped;
    return true;
  }
  if (!install()) document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('load', function () { install(); if (/(^|[#&])tab=anes/.test(location.hash)) window.selectCTab('anes'); });
  window.addEventListener('resize', fit);
  new MutationObserver(mirrorTheme).observe(document.body || document.documentElement, { attributes: true, attributeFilter: ['class'] });
  /* n176 — the record's state on the tab, from the summary Anesia writes onto the sheet (sheets/<id>.anesthesia):
     under anesthesia (green, with the minutes), ended but not signed (amber), signed (quiet). Watched even when the tab is closed. */
  var AN = { id: null, unsub: null, sum: null, tick: null };
  function anBadge() {
    var b = document.querySelector('#clinSwitcher .seg[data-ctab=anes]'); if (!b) return;
    var el = b.querySelector('.seg-badge.anes'); if (!el) { el = document.createElement('span'); el.className = 'seg-badge anes'; el.setAttribute('aria-live', 'polite'); b.appendChild(el); }
    var a = AN.sum, st = a && a.rec ? a.status : null, txt = '', cls = 'seg-badge anes', title = 'Anesthesia';
    if (st === 'active') { var m = Math.max(0, Math.round((Date.now() - (a.start || Date.now())) / 60000)); txt = (m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min'); cls += ' live'; title = 'Under anesthesia · ' + txt + (a.last && a.last.hr ? ' · HR ' + a.last.hr : '') + (a.last && a.last.spo2 ? ' · SpO₂ ' + a.last.spo2 + '%' : ''); }
    else if (st === 'ended' && a.recovery && !a.recovery.end) { var rm = Math.max(0, Math.round((Date.now() - (a.recovery.start || Date.now())) / 60000)), lc = a.recovery.last; txt = 'Recovery ' + (rm >= 60 ? Math.floor(rm / 60) + 'h ' + (rm % 60) + 'm' : rm + ' min'); cls += ' rec'; title = 'In recovery · ' + rm + ' min' + (lc && lc.temp != null ? ' · ' + lc.temp + ' °F' : '') + (lc && lc.pain != null ? ' · pain ' + lc.pain + '/4' : ''); }   /* n180 */
    else if (st === 'ended') { txt = 'Unsigned'; cls += ' over'; title = 'Anesthesia ended · record not signed' + (a.recovery && a.recovery.dest ? ' · recovered, to ' + a.recovery.dest : ''); }
    else if (st === 'signed') { cls += ' done'; title = 'Anesthesia record signed'; }
    else if (st === 'planned') { title = 'Anesthesia record started, patient not yet under'; }
    el.className = cls; el.textContent = txt; b.title = title; b.setAttribute('aria-label', title);
    clearInterval(AN.tick); AN.tick = null; if (st === 'active' || /\brec\b/.test(cls)) AN.tick = setInterval(anBadge, 30000);
  }
  function watchSheet() {
    var id = sheetId(); if (id === AN.id) return; AN.id = id; AN.sum = null;
    if (AN.unsub) { try { AN.unsub(); } catch (e) { } AN.unsub = null; }
    anBadge(); if (!id) return;
    try {
      var fb = window.firebase; if (!fb || !fb.apps || !fb.apps.length) return;
      AN.unsub = fb.firestore().collection('sheets').doc(id).onSnapshot(function (d) { AN.sum = d.exists ? (d.data() || {}).anesthesia || null : null; if (sheetId() === id) anBadge(); }, function (e) { console.warn('[sheet ← Anesia]', e); });
    } catch (e) { }
  }
  setInterval(watchSheet, 1000); window.addEventListener('load', watchSheet);
  window.tsAnes = { render: render, sheetId: sheetId, pre: pre, setExpanded: setExpanded, state: function () { return AN.sum; } };
})();
