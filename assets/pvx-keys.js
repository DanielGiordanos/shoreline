/* PvxKeys (n207, Flow) — the Keyboard shortcuts sheet, as a file so Treatment Sheets can load it too (n264).
   PvxKeys.bind(groups, {skip}) -> "?" opens / closes it; PvxKeys.open(groups, from); PvxKeys.cap / aria / text.
   Flow and Anesia keep their own copy; whichever loads first wins (window.PvxKeys). */
(function () {
  if (window.PvxKeys) return;
  var MAC = /mac|iphone|ipad|ipod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent);
  var NAME = MAC ? { alt: '⌥', mod: '⌘', shift: '⇧', ctrl: '⌃', esc: 'Esc', 'return': 'Return' } : { alt: 'Alt', mod: 'Ctrl', shift: 'Shift', ctrl: 'Ctrl', esc: 'Esc', 'return': 'Enter' };
  var ARIA = { alt: 'Alt', shift: 'Shift', ctrl: 'Control' };
  var CSS = [
    '.pvx-ks{position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:16px;background:rgba(6,10,22,.46);animation:pvxKsFade .16s ease both}',
    '.pvx-ks-box{width:min(520px,100%);max-height:min(760px,calc(100vh - 32px));display:flex;flex-direction:column;border-radius:18px;background:#1A2438;color:#EEF3F8;border:1px solid rgba(255,255,255,.10);box-shadow:0 24px 60px rgba(0,0,0,.40);font:500 .875rem/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;animation:pvxKsIn .18s cubic-bezier(.2,.8,.2,1) both}',
    '.pvx-ks-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 10px}',
    '.pvx-ks-head h2{margin:0;font:700 1.0625rem/1.25 -apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif}',
    '.pvx-ks-body{overflow-y:auto;overscroll-behavior:contain;padding:0 20px 8px}',
    '.pvx-ks-body h3{margin:14px 0 6px;font:800 .6875rem/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8AA2BB}',
    '.pvx-ks-body dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:0}',
    '.pvx-ks-body dt,.pvx-ks-body dd{margin:0;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)}',
    '.pvx-ks-body dd{text-align:right;white-space:nowrap}',
    '.pvx-ks-body{padding-bottom:18px}',
    '.pvx-ks-x{all:unset;box-sizing:border-box;flex:0 0 auto;display:inline-grid;place-items:center;width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,.08);color:inherit;cursor:pointer}',
    '.pvx-ks-x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}',
    '.pvx-ks-x:hover{background:rgba(255,255,255,.14)}',
    '.pvx-ks-x:focus-visible{outline:2px solid #38BDD2;outline-offset:2px}',
    '.pvx-ks-x:active{filter:brightness(.88)}',
    'kbd.pvx-kc{display:inline-block;letter-spacing:.02em;min-width:1.6em;padding:1px 6px;margin-left:4px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);font:600 .75rem/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;text-align:center;color:inherit}',
    'body:not(.dark) .pvx-ks-box{background:#FFFFFF;color:#14181F;border-color:rgba(15,23,42,.10);box-shadow:0 24px 60px rgba(15,23,42,.20)}',
    'body:not(.dark) .pvx-ks-body h3{color:#5B6B80}',
    'body:not(.dark) .pvx-ks-body dt,body:not(.dark) .pvx-ks-body dd{border-bottom-color:rgba(15,23,42,.08)}',
    'body:not(.dark) kbd.pvx-kc{border-color:rgba(15,23,42,.16);background:rgba(15,23,42,.04)}',
    'body:not(.dark) .pvx-ks-x{background:rgba(15,23,42,.06)}',
    'body:not(.dark) .pvx-ks-x:hover{background:rgba(15,23,42,.10)}',
    '@media (pointer:coarse){.pvx-ks-x{width:44px;height:44px}}',
    '@keyframes pvxKsIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes pvxKsFade{from{opacity:0}to{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.pvx-ks,.pvx-ks-box{animation:none}}',
    '@media (forced-colors:active){.pvx-ks-box,kbd.pvx-kc,.pvx-ks-x{border:1px solid CanvasText}}'
  ].join('\n');
  var cur = null;
  function css() { if (document.getElementById('pvx-keys-css')) return; var s = document.createElement('style'); s.id = 'pvx-keys-css'; s.textContent = CSS; document.head.appendChild(s); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function word(k) { return NAME[k] || k; }
  function text(keys) { return keys.map(word).join(MAC ? '' : '+'); }   /* for tooltips: ⌥2 / Alt+2 */
  function cap(keys) { return keys.map(function (k) { return '<kbd class="pvx-kc">' + esc(word(k)) + '</kbd>'; }).join(''); }
  function said(keys) { return keys.map(function (k) { return { alt: MAC ? 'Option' : 'Alt', mod: MAC ? 'Command' : 'Control', shift: 'Shift', ctrl: 'Control', esc: 'Escape', 'return': MAC ? 'Return' : 'Enter', '↑': 'Up arrow', '↓': 'Down arrow', '?': 'Question mark' }[k] || k; }).join(' '); }
  function aria(keys) {
    function one(mod) { return keys.map(function (k) { return k === 'mod' ? mod : (ARIA[k] || k); }).join('+'); }
    return keys.indexOf('mod') > -1 ? one('Meta') + ' ' + one('Control') : one();
  }
  function typing() { var a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)); }
  function shown(el) { var r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; var c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05; }
  function busy() {
    if (window.PvxCtx && PvxCtx.isOpen()) return true;
    if (document.querySelector('.rd-menu,.pvx-menu')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'), function (d) { return !d.closest('.pvx-ks') && shown(d); });
  }
  function close() {
    if (!cur) return; var c = cur; cur = null;
    window.removeEventListener('keydown', c.key, true); c.root.remove();
    if (c.from && c.from.isConnected) try { c.from.focus({ preventScroll: true }); } catch (e) { }
  }
  function open(groups, from) {
    close(); css();
    var root = document.createElement('div'); root.className = 'pvx-ks';
    var body = (groups || []).filter(function (g) { return g && g.items && g.items.length; }).map(function (g) {
      return '<h3>' + esc(g.title) + '</h3><dl>' + g.items.map(function (i) {
        return '<dt>' + esc(i.label) + '</dt><dd aria-label="' + esc(said(i.keys)) + '">' + cap(i.keys) + '</dd>';
      }).join('') + '</dl>';
    }).join('');
    root.innerHTML = '<div class="pvx-ks-box" role="dialog" aria-modal="true" aria-labelledby="pvxKsT"><div class="pvx-ks-head"><h2 id="pvxKsT">Keyboard shortcuts</h2>' +
      '<button type="button" class="pvx-ks-x" aria-label="Close" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="pvx-ks-body">' + body + '</div></div>';
    var done = root.querySelector('.pvx-ks-x');   /* n211: ✕ Close, not Done */
    var c = { root: root, from: from || document.activeElement };
    c.key = function (e) {
      if (cur !== c) return;
      if (e.key === 'Escape' || (e.key === '?' && !typing())) { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') { e.preventDefault(); done.focus(); return; }   /* one control: focus stays on Close */
      e.stopPropagation();   /* the app's own shortcuts wait until the sheet closes (Return and Space still press Close) */
    };
    done.addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    window.addEventListener('keydown', c.key, true);   /* window capture runs before the apps' own key handlers */
    document.body.appendChild(root); cur = c;
    try { done.focus({ preventScroll: true }); } catch (e) { done.focus(); }
    return root;
  }
  function bind(groups, opts) {
    opts = opts || {};
    document.addEventListener('keydown', function (e) {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || cur) return;
      if (typing() || busy() || (opts.skip && opts.skip())) return;
      e.preventDefault(); open(typeof groups === 'function' ? groups() : groups, document.activeElement);
    });
  }
  window.PvxKeys = { open: open, close: close, bind: bind, cap: cap, aria: aria, word: word, text: text, mac: MAC, isOpen: function () { return !!cur; } };
})();
