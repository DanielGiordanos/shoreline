/* Pravix · light or dark follows the person, not the computer (n258, Oct 27 2026).
   - Each person's choice is saved in their account (ts_prefs/{uid}.theme) and kept on this browser per person,
     so it follows them to any computer they sign in on, and the next person on a shared computer gets their own.
   - Someone who never chose (or is signed out) gets the device's own setting, live (Auto switches while open).
   - Pressing the top bar's switch so the screen matches the device again means "follow my device" (it clears the choice).
   - The old shared choice (the pvx_theme cookie, darkMode, sgvp-curr-theme, kura-theme) is now only a mirror of the
     current person's appearance, written here before each page's own start-up reads it.
   Loaded first in <head> on every staff page. Pages keep their own switch; this script presses it when it must change. */
(function () {
  if (window.pvxAppearance) return;
  var LS = 'pvx:theme:', LAST = 'pvx:theme:last', TOGGLE = '.theme-toggle,.kura-theme-toggle';
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function sys() { return mq && mq.matches ? 'light' : 'dark'; }
  var uid = get(LAST), choice = uid ? norm(get(LS + uid)) : null, busy = false;
  function norm(v) { return v === 'dark' || v === 'light' ? v : null; }
  function want() { return choice || sys(); }
  function cookie(v) {
    var tail = ';path=/;max-age=31536000;SameSite=Lax';
    try { document.cookie = 'pvx_theme=' + v + ';domain=.pravix.app' + tail; } catch (e) {}
    try { document.cookie = 'pvx_theme=' + v + tail; } catch (e) {}
  }
  /* every page's own start-up reads one of these; they all say this person's appearance */
  function mirror() { var t = want(); cookie(t); put('darkMode', t === 'dark' ? '1' : '0'); put('sgvp-curr-theme', t); put('kura-theme', t); }
  mirror();
  function isDark() { var b = document.body, h = document.documentElement; return !!((b && b.classList.contains('dark')) || h.dataset.theme === 'dark'); }
  function apply() {
    if (!document.body) return;
    var d = want() === 'dark'; if (isDark() === d) { mirror(); return; }
    busy = true;
    try {
      var btn = document.querySelector(TOGGLE);
      if (btn) btn.click();                       /* the page's own switch, with all it does (canvas, tables, logos) */
      if (isDark() !== d) {                        /* no switch on this page, or it didn't take */
        document.body.classList.toggle('dark', d);
        if (document.documentElement.dataset.theme) document.documentElement.dataset.theme = d ? 'dark' : 'light';
      }
      if (document.documentElement.style.background) document.documentElement.style.background = d ? '#080E1A' : '#F2F4F8';
    } finally { busy = false; }
    mirror();
  }
  function db() { try { return window.firebase && firebase.apps && firebase.apps.length && firebase.firestore ? firebase.firestore() : null; } catch (e) { return null; } }
  function save() {
    if (!uid) return; put(LS + uid, choice);
    var d = db(); if (!d) return;
    try {
      var v = choice ? choice : (firebase.firestore.FieldValue ? firebase.firestore.FieldValue.delete() : null);
      d.collection('ts_prefs').doc(uid).set({ theme: v, theme_at: new Date().toISOString() }, { merge: true }).catch(function () {});
    } catch (e) {}
  }
  /* a press of the switch: the new look is the person's choice, unless it's the device's own look (then: follow the device) */
  document.addEventListener('click', function (e) {
    if (busy || !e.target.closest || !e.target.closest(TOGGLE)) return;
    setTimeout(function () { var t = isDark() ? 'dark' : 'light'; choice = t === sys() ? null : t; mirror(); save(); }, 0);
  }, true);
  if (mq) { var on = function () { if (!choice) apply(); }; if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); }
  /* who is signed in decides; until we know, the last person on this browser */
  var off = null, tries = 0;
  function watch() {
    var a = null; try { a = window.firebase && firebase.apps && firebase.apps.length && firebase.auth ? firebase.auth() : null; } catch (e) {}
    if (!a) { if (++tries < 100) setTimeout(watch, 150); return; }
    off = a.onAuthStateChanged(function (u) {
      if (!u) { uid = null; choice = null; put(LAST, null); apply(); return; }
      uid = u.uid; put(LAST, uid); choice = norm(get(LS + uid)); apply();
      var d = db(); if (!d) return;
      try {
        d.collection('ts_prefs').doc(uid).get().then(function (s) {
          if (uid !== u.uid) return;
          var t = norm(s && s.exists && s.data() ? s.data().theme : null);
          if (t !== choice) { choice = t; put(LS + uid, t); apply(); }
        }).catch(function () {});
      } catch (e) {}
    });
  }
  function ready() { apply(); watch(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  window.pvxAppearance = { want: want, choice: function () { return choice; }, system: sys, apply: apply };
})();
/* n263 · who is signed in, in the shared top bar (assets/pvx-account.js): loaded from here because every staff page loads this file first */
(function () { if (window.pvxAccount || document.getElementById('pvx-account-js')) return; var s = document.createElement('script'); s.id = 'pvx-account-js'; s.src = '/assets/pvx-account.js?v=031545b1d5'; s.defer = true; (document.head || document.documentElement).appendChild(s); })();

/* n274 · the expanding app navigation in the shared top bar (assets/pvx-nav.js): loaded from here like pvx-account.js. Until it's in, the old row of apps is kept out of sight (4 s at most, then it shows as before). */
(function () { if (window.pvxNav || document.getElementById('pvx-nav-js')) return; var h = document.documentElement; if (document.querySelector && !/[?&]pvxnav=0/.test(location.search)) { h.classList.add('pvxn-wait'); var c = document.createElement('style'); c.id = 'pvx-nav-boot'; c.textContent = 'html.pvxn-wait body nav.topnav .nav-center{visibility:hidden!important;max-height:0!important;overflow:hidden!important}html.pvxn-wait body nav.topnav{margin-bottom:24px!important}'; (document.head || h).appendChild(c); setTimeout(function () { if (!(window.pvxNav && window.pvxNav.ready)) h.classList.remove('pvxn-wait'); }, 4000); var s = document.createElement('script'); s.id = 'pvx-nav-js'; s.src = '/assets/pvx-nav.js?v=456fe1a7b7'; s.async = true; (document.head || h).appendChild(s); } })();
