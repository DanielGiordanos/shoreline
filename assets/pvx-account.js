/* Pravix · who is signed in, in the shared top bar (n263, Oct 29 2026; Daniel chose options B and C from the mock-up).
   C · the Logout button names the person: "Daniel G." above "Log out". One click still logs out, as people do on the
       hospital's shared computers, and the button keeps its size.
   B · an account card: name, email, role (where the page knows it), when this computer signed in, and Log out, with
       "Not you? Log out, so the next person charts as themselves." It opens when the pointer rests on the button, on a
       right-click or a long press, or with ↓ from the button; Esc or pointing away closes it.
   Loaded by assets/pvx-appearance.js, which every staff page loads first. A page without the top bar's #logoutBtn, or
   with nobody signed in, is left exactly as it was. */
(function () {
  if (window.pvxAccount) return;
  var CSS = [
    '.logout-button .pvx-two{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;line-height:1.15;text-align:left;min-width:0}',
    '.logout-button .pvx-two small{font-size:0.6875rem;font-weight:500;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#A7C2D8}',
    '.logout-button .pvx-two span{font-size:0.8331rem;font-weight:600}',
    'html.pvx-ac-light .logout-button .pvx-two small{color:#5C5E62}',
    '.pvx-acard{position:fixed;z-index:2147483000;width:300px;max-width:calc(100vw - 24px);box-sizing:border-box;border-radius:16px;padding:16px;',
    '  font:0.8125rem/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;text-align:left;',
    '  background:rgba(23,35,56,.92);color:#D8E8F4;border:1px solid rgba(150,185,220,.18);',
    '  -webkit-backdrop-filter:blur(12px) saturate(160%);backdrop-filter:blur(12px) saturate(160%);',
    '  box-shadow:0 18px 40px -12px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);animation:pvxAcIn .16s cubic-bezier(.2,.8,.2,1)}',
    '@keyframes pvxAcIn{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}',
    '.pvx-acard .pac-hd{display:flex;gap:12px;align-items:center;min-width:0}',
    '.pvx-acard .pac-av{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:rgba(150,185,220,.20);color:#E6EEF6;font-weight:700;font-size:0.9375rem;letter-spacing:.02em}',
    '.pvx-acard .pac-nm{display:block;font-size:0.9375rem;font-weight:600;color:#F2F6FA;overflow-wrap:anywhere}',
    '.pvx-acard .pac-em{display:block;color:#A7C2D8;overflow-wrap:anywhere}',
    '.pvx-acard .pac-meta{margin-top:12px;padding-top:12px;border-top:1px solid rgba(150,185,220,.14);color:#A7C2D8}',
    '.pvx-acard .pac-meta b{font-weight:500;color:#D8E8F4}',
    '.pvx-acard .pac-out{all:unset;box-sizing:border-box;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:40px;border-radius:11px;background:rgba(150,185,220,.12);color:#F2F6FA;font-weight:600;cursor:pointer}',
    '.pvx-acard .pac-out:hover{background:rgba(150,185,220,.2)}',
    '.pvx-acard .pac-out:focus-visible{outline:2px solid #38BDD2;outline-offset:2px}',
    '.pvx-acard .pac-out svg{width:16px;height:16px}',
    '.pvx-acard .pac-note{margin-top:10px;font-size:0.75rem;color:#A7C2D8;text-align:center}',
    'html.pvx-ac-light .pvx-acard{background:rgba(255,255,255,.92);color:#3A3C40;border-color:rgba(0,0,0,.08);box-shadow:0 18px 40px -14px rgba(20,30,60,.28)}',
    'html.pvx-ac-light .pvx-acard .pac-av{background:rgba(35,67,156,.10);color:#23439C}',
    'html.pvx-ac-light .pvx-acard .pac-nm{color:#181A1F}',
    'html.pvx-ac-light .pvx-acard :is(.pac-em,.pac-meta,.pac-note){color:#5C5E62}',
    'html.pvx-ac-light .pvx-acard .pac-meta{border-top-color:rgba(0,0,0,.08)}',
    'html.pvx-ac-light .pvx-acard .pac-meta b{color:#181A1F}',
    'html.pvx-ac-light .pvx-acard .pac-out{background:rgba(0,0,0,.05);color:#181A1F}',
    '@media (prefers-reduced-motion:reduce){.pvx-acard{animation:pvxAcFade .16s}@keyframes pvxAcFade{from{opacity:0}to{opacity:1}}}',
    '@media (prefers-reduced-transparency:reduce),(prefers-contrast:more){.pvx-acard{-webkit-backdrop-filter:none;backdrop-filter:none;background:#172338}',
    '  html.pvx-ac-light .pvx-acard{background:#fff}}'
  ].join('\n');
  var DOOR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.2 5.3H7.1A2.1 2.1 0 0 0 5 7.4v9.2a2.1 2.1 0 0 0 2.1 2.1h3.1"/><path d="M12.6 8.7 16 12l-3.4 3.3"/><path d="M8.9 12H16"/></svg>';
  var ROLE = { doctor: 'Doctor', liaison: 'Liaison', management: 'Management', admin: 'Admin' };
  var me = null, card = null, hoverT = 0, leaveT = 0, pressT = 0, pressed = false, roleTxt = '';
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function btn() { return document.getElementById('logoutBtn'); }
  function fullName(u) { return (u.displayName || '').trim() || String(u.email || '').split('@')[0].replace(/[._]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function shortName(n) { var p = n.split(/\s+/).filter(Boolean); return p.length > 1 ? p[0] + ' ' + p[p.length - 1].charAt(0) + '.' : (p[0] || ''); }
  function initials(n) { var p = n.split(/\s+/).filter(Boolean); return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }
  function when(iso) {
    var d = new Date(iso); if (!iso || isNaN(d)) return '';
    var t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), n = new Date();
    if (d.toDateString() === n.toDateString()) return t;
    var y = new Date(n); y.setDate(n.getDate() - 1);
    return (d.toDateString() === y.toDateString() ? 'yesterday' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })) + ' at ' + t;
  }
  /* light or dark is read from the top bar itself (its Log out text is light on a dark bar), so it follows whatever the page's appearance code did */
  function theme() {
    var h = document.documentElement, b = btn(), d = null;
    if (b) { var m = (getComputedStyle(b).color.match(/[\d.]+/g) || []).map(Number); if (m.length >= 3) d = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 140; }
    if (d === null) { var bd = document.body; d = !!((bd && bd.classList.contains('dark')) || h.dataset.theme === 'dark'); }
    h.classList.toggle('pvx-ac-light', !d);
  }
  function style() { if (document.getElementById('pvx-account-css')) return; var s = document.createElement('style'); s.id = 'pvx-account-css'; s.textContent = CSS; document.head.appendChild(s); }
  /* C · the button names the person */
  function paint() {
    theme(); var b = btn(); if (!b) return;
    var lab = b.querySelector('.logout-label');
    if (!me) {   /* signed out: as it was */
      if (b.dataset.pvxAcct) { if (lab) lab.outerHTML = '<span class="logout-label">Logout</span>'; b.setAttribute('aria-label', 'Log out'); b.removeAttribute('aria-haspopup'); delete b.dataset.pvxAcct; }
      return;
    }
    style();
    var n = fullName(me), key = n + '|' + (me.email || '');
    if (b.dataset.pvxAcct === key && b.querySelector('.pvx-two')) return;
    b.dataset.pvxAcct = key;
    if (lab) lab.outerHTML = '<span class="logout-label pvx-two"><small>' + esc(shortName(n)) + '</small><span>Log out</span></span>';
    b.setAttribute('aria-label', 'Log out ' + n);
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('aria-description', 'Signed in as ' + n + '. Press Down Arrow for account details.');
    b.removeAttribute('title');
  }
  /* B · the account card */
  function open(focus) {
    var b = btn(); if (!b || !me) return; clearTimeout(leaveT);
    if (card) { if (focus) card.querySelector('.pac-out').focus(); return; }
    style();
    var n = fullName(me), since = when(me.metadata && me.metadata.lastSignInTime);
    card = document.createElement('div'); card.className = 'pvx-acard'; card.id = 'pvxAccountCard';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Signed in as ' + n);
    card.innerHTML = '<div class="pac-hd"><span class="pac-av" aria-hidden="true">' + esc(initials(n)) + '</span><div style="min-width:0"><span class="pac-nm">' + esc(n) + '</span><span class="pac-em">' + esc(me.email || '') + '</span></div></div>' +
      '<div class="pac-meta">' + (roleTxt ? '<b>' + esc(roleTxt) + '</b> · ' : '') + 'VCA Shoreline' + (since ? '<br>Signed in on this computer since ' + esc(since) : '') + '</div>' +
      '<button type="button" class="pac-out">' + DOOR + 'Log out</button>' +
      '<div class="pac-note">Not you? Log out, so the next person charts as themselves.</div>';
    document.body.appendChild(card); place();
    card.querySelector('.pac-out').addEventListener('click', function () { close(); try { (window.logout || function () { b.click(); })(); } catch (e) {} });
    card.addEventListener('mouseenter', function () { clearTimeout(leaveT); });
    card.addEventListener('mouseleave', function () { leaveT = setTimeout(close, 300); });
    if (focus) card.querySelector('.pac-out').focus();
  }
  function place() {
    var b = btn(); if (!b || !card) return; var r = b.getBoundingClientRect(), w = card.offsetWidth;
    card.style.top = Math.round(r.bottom + 8) + 'px';
    card.style.left = Math.round(Math.max(12, Math.min(innerWidth - w - 12, r.right - w))) + 'px';
  }
  function close(back) { clearTimeout(hoverT); clearTimeout(leaveT); if (!card) return; var f = card.contains(document.activeElement); card.remove(); card = null; if (back || f) { var b = btn(); b && b.focus(); } }
  /* opening: the pointer rests on the button (not on touch), right-click, long press, ↓ */
  document.addEventListener('mouseover', function (e) {
    var b = btn(); if (!b || !me || !e.target.closest || e.target.closest('#logoutBtn') !== b) return;
    if (matchMedia('(hover:none)').matches) return;
    clearTimeout(leaveT); clearTimeout(hoverT); hoverT = setTimeout(function () { open(false); }, 600);
  });
  document.addEventListener('mouseout', function (e) {
    var b = btn(); if (!b || !e.target.closest || e.target.closest('#logoutBtn') !== b) return;
    if (e.relatedTarget && (b.contains(e.relatedTarget) || (card && card.contains(e.relatedTarget)))) return;
    clearTimeout(hoverT); if (card) leaveT = setTimeout(close, 300);
  });
  document.addEventListener('contextmenu', function (e) {
    var b = btn(); if (!b || !me || !e.target.closest || e.target.closest('#logoutBtn') !== b) return;
    e.preventDefault(); open(true);
  });
  document.addEventListener('pointerdown', function (e) {
    var b = btn(); pressed = false;
    if (!b || !me || e.pointerType === 'mouse' || !e.target.closest || e.target.closest('#logoutBtn') !== b) return;
    clearTimeout(pressT); pressT = setTimeout(function () { pressed = true; try { navigator.vibrate && navigator.vibrate(8); } catch (x) {} open(true); }, 500);
  }, true);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { document.addEventListener(t, function () { clearTimeout(pressT); }, true); });
  /* a long press opened the card: that press doesn't also log out */
  document.addEventListener('click', function (e) {
    if (!pressed || !e.target.closest || !e.target.closest('#logoutBtn')) return;
    pressed = false; e.preventDefault(); e.stopPropagation();
  }, true);
  document.addEventListener('keydown', function (e) {
    var b = btn(); if (!b) return;
    if (e.key === 'ArrowDown' && document.activeElement === b && me) { e.preventDefault(); open(true); return; }
    if (e.key === 'Escape' && card) { e.preventDefault(); e.stopPropagation(); close(true); }
  }, true);
  document.addEventListener('mousedown', function (e) { if (card && !card.contains(e.target) && !(e.target.closest && e.target.closest('#logoutBtn'))) close(); }, true);
  addEventListener('resize', place); addEventListener('scroll', function () { if (card) place(); }, true);
  /* who is signed in */
  var tries = 0;
  function watch() {
    var a = null; try { a = window.firebase && firebase.apps && firebase.apps.length && firebase.auth ? firebase.auth() : null; } catch (e) {}
    if (!a) { if (++tries < 100) setTimeout(watch, 150); return; }
    a.onAuthStateChanged(function (u) {
      me = u || null; roleTxt = ''; close(); paint();
      if (u && window.PvxRoles && PvxRoles.resolve) {
        try { PvxRoles.resolve(u.email, u.displayName).then(function (r) { if (me === u) roleTxt = ROLE[r] || ''; }).catch(function () {}); } catch (e) {}
      }
    });
  }
  /* pages that redraw their top bar get their label back */
  var q = 0, late = 0;
  function soon() { if (q) return; q = requestAnimationFrame(function () { q = 0; theme(); if (me) paint(); }); clearTimeout(late); late = setTimeout(theme, 450); }
  function keep() {
    if (!window.MutationObserver || !document.body) return;
    new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(soon).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    new MutationObserver(soon).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
  }
  function ready() { watch(); keep(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  window.pvxAccount = { open: open, close: close, user: function () { return me; } };
})();
