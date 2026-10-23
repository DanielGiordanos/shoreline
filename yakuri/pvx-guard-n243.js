
/* PVX-N223: the managers' shared account (au733@vca.com) can open https://shoreline.pravix.app/sgvp/ only.
   On every other Pravix page it sees the shared top bar and "Unauthorized" - nothing else, nothing to use.
   Runs first in <head>. It reads who is signed in from Firebase's own storage (works on pages without Firebase)
   and follows sign-in changes where Firebase is loaded. */
(function () {
  'use strict';
  var AU = 'au733@vca.com', KEY = 'pvx_acct', d = document.documentElement, on = false, box = null, mo = null;
  var css = document.createElement('style'); css.id = 'pvx-n223-guard';
  css.textContent = 'html.pvx-ua-wait body{visibility:hidden!important}'
    + 'html.pvx-ua body{overflow:hidden!important}html.pvx-ua [data-pvx-ua]{visibility:hidden!important}'
    + '.pvx-ua-box{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;'
    + 'background:#0A1222;color:#E6EEF6;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,"Segoe UI","Helvetica Neue",Arial,sans-serif}'
    + 'html.pvx-ua-light .pvx-ua-box{background:#F2F4F8;color:#0E1A2B}'
    + '.pvx-ua-box h1{margin:0;font-size:1.75rem;font-weight:700;letter-spacing:0}'
    + '.pvx-ua-box p{margin:0;font-size:.9375rem;line-height:1.45;color:#A7C2D8}html.pvx-ua-light .pvx-ua-box p{color:#52698A}'
    + '.pvx-ua-box a{margin-top:6px;display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;background:linear-gradient(150deg,#38BDD2,#2C7FB8);color:#fff;font-weight:600;font-size:.9375rem;text-decoration:none}'
    + '.pvx-ua-box a:focus-visible{outline:2px solid #38BDD2;outline-offset:3px}';
  (document.head || d).appendChild(css);
  try { if (localStorage.getItem(KEY) === 'au733') d.classList.add('pvx-ua-wait'); } catch (e) {}
  var waitT = setTimeout(function () { d.classList.remove('pvx-ua-wait'); }, 4000);   /* never leave anyone with a blank page */
  function ready(f) { if (document.body && document.readyState !== 'loading') f(); else document.addEventListener('DOMContentLoaded', f); }
  function top() { return document.querySelector('#pvxTopnav') || document.querySelector('nav.topnav') || document.querySelector('.topnav'); }
  function freeTop() {   /* some apps lock their own page for this account (inert on the wrapper that holds the top bar) */
    var t = top(); if (!t) return;
    for (var x = t; x && x !== document.body; x = x.parentElement) if (x.hasAttribute('inert')) { x.removeAttribute('inert'); x.setAttribute('data-pvx-ua-freed', ''); }
  }
  function setInert(v) {
    if (v) freeTop();
    var keep = [box, top()].filter(Boolean);
    function walk(parent) {
      [].forEach.call(parent.children, function (c) {
        if (keep.indexOf(c) >= 0 || c.tagName === 'SCRIPT' || c.tagName === 'STYLE') return;
        if (keep.some(function (k) { return c.contains(k); })) { walk(c); return; }
        if (v) { if (!c.hasAttribute('data-pvx-ua')) { c.setAttribute('data-pvx-ua', c.hasAttribute('inert') ? '1' : '0'); c.setAttribute('inert', ''); } }
        else if (c.hasAttribute('data-pvx-ua')) { if (c.getAttribute('data-pvx-ua') === '0') c.removeAttribute('inert'); c.removeAttribute('data-pvx-ua'); }
      });
    }
    walk(document.body);
  }
  function place() { if (!box) return; var t = top(), b = t ? Math.max(0, Math.round(t.getBoundingClientRect().bottom)) : 0; box.style.top = b + 'px'; }
  function show() {
    ready(function () {
      if (!on) return;
      d.classList.add('pvx-ua');
      var light = /(?:^|;\s*)pvx_theme=light/.test(document.cookie);
      if (!/(?:^|;\s*)pvx_theme=/.test(document.cookie)) { try { var m = getComputedStyle(document.body).backgroundColor.match(/\d+/g); if (m && (+m[0] + +m[1] + +m[2]) / 3 > 140) light = true; } catch (e) {} }
      if (light) d.classList.add('pvx-ua-light');
      if (!box) {
        box = document.createElement('main'); box.className = 'pvx-ua-box'; box.setAttribute('aria-labelledby', 'pvxUaT');
        box.innerHTML = '<h1 id="pvxUaT">Unauthorized</h1><p>This account can only open the intern curriculum.</p><a href="https://shoreline.pravix.app/sgvp/">Open the curriculum</a>';
        document.body.appendChild(box);
      }
      place(); setInert(true);
      d.classList.remove('pvx-ua-wait'); clearTimeout(waitT);
      if (!mo) {   /* the page keeps adding things (its own sign-in cards, banners): keep them out of reach */
        var busy = false;
        mo = new MutationObserver(function () { if (!on || busy) return; busy = true; setTimeout(function () { busy = false; if (on) { setInert(true); place(); } }, 60); });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert'] });
      }
      window.addEventListener('resize', place);
      setTimeout(place, 300); setTimeout(place, 1500);
    });
  }
  function hide() {
    if (mo) { mo.disconnect(); mo = null; }
    if (box) { box.remove(); box = null; }
    d.classList.remove('pvx-ua', 'pvx-ua-wait'); clearTimeout(waitT);
    if (document.body) setInert(false);
  }
  function decide(email) {
    var au = String(email || '').toLowerCase() === AU;
    try { if (au) localStorage.setItem(KEY, 'au733'); else localStorage.removeItem(KEY); } catch (e) {}
    if (au) { if (!on) { on = true; show(); } }
    else { on = false; hide(); }
  }
  window.pvxGuardDecide = decide;
  /* 1. who is signed in, from Firebase's own storage (any page) */
  try {
    var req = indexedDB.open('firebaseLocalStorageDb');
    req.onupgradeneeded = function () { try { req.transaction.abort(); } catch (e) {} };   /* no database: nobody signed in */
    req.onerror = function () { decide(null); };
    req.onsuccess = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains('firebaseLocalStorage')) { db.close(); decide(null); return; }
      var g = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll();
      g.onsuccess = function () {
        var em = null;
        (g.result || []).forEach(function (x) { var v = x && x.value; if (v && v.email && String(x.fbase_key || '').indexOf('firebase:authUser:') === 0 && String(v.email).toLowerCase() === AU) em = AU; });
        db.close(); if (!fbSeen) decide(em);
      };
      g.onerror = function () { db.close(); };
    };
  } catch (e) {}
  /* 2. sign-in changes on pages that load Firebase */
  var fbSeen = false, tries = 0;
  (function poll() {
    try {
      if (window.firebase && firebase.apps && firebase.apps.length && firebase.auth) {
        firebase.auth().onAuthStateChanged(function (u) { fbSeen = true; decide(u && u.email); });
        return;
      }
    } catch (e) {}
    if (++tries < 60) setTimeout(poll, 250);
  })();
})();
