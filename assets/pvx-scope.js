/* Pravix · review-only accounts (ro1, Nov 4 2026; Daniel: Sarah Schiff and Mara Kraenzlin, "access only to the intern
   review portal").
   A staff_members/{uid} record with role 'reviewer' opens Intern reviews (https://shoreline.pravix.app/sgvp/assessment/)
   as an evaluator, and nothing else. The Firestore rules are what keep the account out of the other apps; this file
   only makes that plain on screen:
   - on Intern reviews, the top bar and the program's sub-nav show nothing the account can't open;
   - on any other Pravix page, the page is covered by one card that says so and offers Intern reviews or Log out.
   Everyone else is left exactly as they were. The role is read from the person's own staff_members record through
   Firestore's REST address with their sign-in token, so it works on pages without the Firestore library.
   Loaded by assets/pvx-appearance.js (every staff page) and yakuri/pvx-guard-n243.js (Yakuri's pages). */
(function () {
  'use strict';
  if (window.pvxScope) return;
  var HOME = '/sgvp/assessment/', HINT = 'pvx_scope_ro', d = document.documentElement;
  var onHome = location.pathname.indexOf(HOME) === 0;
  var api = window.pvxScope = { role: null, reviewOnly: false };
  var css = document.createElement('style'); css.id = 'pvx-scope-css';
  css.textContent = [
    'html.pvx-scope-wait body{visibility:hidden!important}',
    /* on Intern reviews: only what the account can open */
    'html.pvx-scope-ro .nav-item:not([href*="/sgvp/assessment"]){display:none!important}',
    'html.pvx-scope-ro #pvxSubnav .seg:not([href*="/sgvp/assessment"]){display:none!important}',
    'html.pvx-scope-ro a.a-btn[href="/"]{display:none!important}',
    /* everywhere else: one card */
    'html.pvx-scope-off body{overflow:hidden!important}',
    '.pvx-scope-box{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;',
    '  background:#0A1222;color:#E6EEF6;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,"Segoe UI","Helvetica Neue",Arial,sans-serif}',
    'html.pvx-scope-light .pvx-scope-box{background:#F2F4F8;color:#0E1A2B}',
    '.pvx-scope-box .c{max-width:420px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px}',
    '.pvx-scope-box h1{margin:0;font-size:1.75rem;line-height:1.2;font-weight:700;letter-spacing:-.01em}',
    '.pvx-scope-box p{margin:0;font-size:.9375rem;line-height:1.45;color:#A7C2D8}',
    'html.pvx-scope-light .pvx-scope-box p{color:#52698A}',
    '.pvx-scope-box .acts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:8px}',
    '.pvx-scope-box a,.pvx-scope-box button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:999px;',
    '  font:inherit;font-weight:600;font-size:.9375rem;text-decoration:none;cursor:pointer;border:0}',
    '.pvx-scope-box a{background:linear-gradient(150deg,#38BDD2,#2C7FB8);color:#fff}',
    '.pvx-scope-box button{background:rgba(255,255,255,.08);color:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}',
    'html.pvx-scope-light .pvx-scope-box button{background:#fff;box-shadow:inset 0 0 0 1px rgba(14,26,43,.14)}',
    '.pvx-scope-box a:focus-visible,.pvx-scope-box button:focus-visible{outline:2px solid #38BDD2;outline-offset:3px}',
    '@media (forced-colors:active){.pvx-scope-box a,.pvx-scope-box button{border:1px solid ButtonText}}'
  ].join('\n');
  (document.head || d).appendChild(css);

  /* someone this browser last saw as review-only: keep the other app's page hidden until the role is known */
  var hinted = false; try { hinted = !!localStorage.getItem(HINT); } catch (e) {}
  if (hinted && !onHome) d.classList.add('pvx-scope-wait');
  var waitT = setTimeout(function () { d.classList.remove('pvx-scope-wait'); }, 4000);   /* never a blank page for long */

  function ready(f) { if (document.body && document.readyState !== 'loading') f(); else document.addEventListener('DOMContentLoaded', f); }
  var box = null, mo = null, who = '';
  function inert(v) {
    if (!document.body) return;
    [].forEach.call(document.body.children, function (c) {
      if (c === box || c.tagName === 'SCRIPT' || c.tagName === 'STYLE') return;
      if (v) { if (!c.hasAttribute('data-pvx-scope')) { c.setAttribute('data-pvx-scope', c.hasAttribute('inert') ? '1' : '0'); c.setAttribute('inert', ''); } }
      else if (c.hasAttribute('data-pvx-scope')) { if (c.getAttribute('data-pvx-scope') === '0') c.removeAttribute('inert'); c.removeAttribute('data-pvx-scope'); }
    });
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cover() {
    ready(function () {
      if (!api.reviewOnly || onHome) return;
      var light = /(?:^|;\s*)pvx_theme=light/.test(document.cookie);
      if (!/(?:^|;\s*)pvx_theme=/.test(document.cookie)) { try { light = !(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); } catch (e) {} }
      d.classList.toggle('pvx-scope-light', light);
      d.classList.add('pvx-scope-off');
      if (!box) {
        box = document.createElement('main'); box.className = 'pvx-scope-box';
        box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-labelledby', 'pvxScopeT'); box.setAttribute('aria-describedby', 'pvxScopeD');
        box.innerHTML = '<div class="c"><h1 id="pvxScopeT">Intern reviews only</h1>'
          + '<p id="pvxScopeD">' + esc(who) + ' is set up to review interns. The other Pravix apps aren’t open to this account.</p>'
          + '<div class="acts"><a id="pvxScopeGo" href="' + HOME + '">Open Intern reviews</a>'
          + '<button type="button" id="pvxScopeOut">Log out</button></div></div>';
        document.body.appendChild(box);
        box.querySelector('#pvxScopeOut').onclick = function () {
          try { localStorage.removeItem(HINT); } catch (e) {}
          try { firebase.auth().signOut(); } catch (e) {}
        };
        setTimeout(function () { try { box.querySelector('#pvxScopeGo').focus(); } catch (e) {} }, 60);
      }
      inert(true);
      if (!mo) {   /* the page keeps adding its own cards and banners: keep them out of reach */
        var busy = false;
        mo = new MutationObserver(function () { if (busy || !box) return; busy = true; setTimeout(function () { busy = false; if (box) inert(true); }, 60); });
        mo.observe(document.body, { childList: true });
      }
    });
  }
  function uncover() {
    if (mo) { mo.disconnect(); mo = null; }
    if (box) { box.remove(); box = null; }
    d.classList.remove('pvx-scope-off', 'pvx-scope-light');
    inert(false);
  }
  function settle(ro) {
    ro = !!ro; api.reviewOnly = ro;
    d.classList.toggle('pvx-scope-ro', ro);
    d.classList.remove('pvx-scope-wait'); clearTimeout(waitT);
    try { if (ro) localStorage.setItem(HINT, '1'); else localStorage.removeItem(HINT); } catch (e) {}
    if (ro && onHome) ready(function () {   /* the brand goes back to Intern reviews, not the program's Overview */
      [].forEach.call(document.querySelectorAll('a[href$="/sgvp/"]'), function (a) { if (!a.closest('#pvxSubnav')) a.setAttribute('href', HOME); });
    });
    if (ro) cover(); else uncover();
    try { document.dispatchEvent(new CustomEvent('pvx-scope', { detail: { reviewOnly: ro } })); } catch (e) {}
  }
  /* the signed-in person's own staff_members record (rules: only her own; anyone without one reads nothing) */
  var seq = 0;
  function check(u) {
    var n = ++seq;
    if (!u) { api.role = null; who = ''; settle(false); return; }
    who = u.email || '';
    var cacheKey = 'pvx_scope_' + u.uid, cached = null;
    try { cached = sessionStorage.getItem(cacheKey); } catch (e) {}
    if (cached !== null) { api.role = cached || null; settle(cached === 'reviewer'); }
    var pid = ''; try { pid = firebase.app().options.projectId; } catch (e) {}
    if (!pid || !window.fetch) { if (cached === null) settle(false); return; }
    u.getIdToken().then(function (tok) {
      return fetch('https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(pid) + '/databases/(default)/documents/staff_members/' + encodeURIComponent(u.uid),
        { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' });
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (n !== seq) return;
      var f = (j && j.fields) || {};
      var role = (f.role && f.role.stringValue) || '';
      var ok = f.active && f.active.booleanValue === true && f.tenant_id && f.tenant_id.stringValue === 'shoreline';
      api.role = ok ? role : null;
      try { sessionStorage.setItem(cacheKey, api.role || ''); } catch (e) {}
      settle(ok && role === 'reviewer');
    }).catch(function () { if (n === seq && cached === null) settle(false); });
  }
  var tries = 0;
  (function poll() {
    try {
      if (window.firebase && firebase.apps && firebase.apps.length && firebase.auth) { firebase.auth().onAuthStateChanged(check); return; }
    } catch (e) {}
    if (++tries < 80) setTimeout(poll, 150); else settle(false);
  })();
})();
