/* PVX-KEYS n207 - the Keyboard shortcuts sheet, shared by Flow and Anesia (HIG The menu bar; claude/hig-audit-menu-bar.md).
   A web app can't put its commands in the Mac menu bar, so this sheet does the menu bar's other job: it lists every
   shortcut, by group, next to the command it runs. Self-contained: it injects its own styles on first use.
   PvxKeys.bind(groups())        -> "?" opens / closes the sheet (not while typing, not over another dialog or menu)
   PvxKeys.open(groups(), from)  -> opens it; ✕ Close, Esc, Command-Period or ? closes it (n211: a view-only sheet closes with ✕, not Done) and focus returns to `from`
   PvxKeys.cap(keys)             -> keycap HTML for ['alt','V'], ['mod','K'] (Mac: ⌥ ⌘; Windows: Alt, Ctrl)
   PvxKeys.aria(keys)            -> the aria-keyshortcuts value ("Alt+V", "Meta+K Control+K")
   groups: [{title, items:[{keys:['alt','V'], label:'Vitals now'}, ...]}, ...] */
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
  function word(k) { return NAME[k] || k; }
  function text(keys) { return keys.map(word).join(MAC ? '' : '+'); }   /* for tooltips: ⌥2 / Alt+2 */
  function cap(keys) { return keys.map(function (k) { return '<kbd class="pvx-kc">' + pvxEsc(word(k)) + '</kbd>'; }).join(''); }
  function said(keys) { return keys.map(function (k) { return { alt: MAC ? 'Option' : 'Alt', mod: MAC ? 'Command' : 'Control', shift: 'Shift', ctrl: 'Control', esc: 'Escape', 'return': MAC ? 'Return' : 'Enter', '↑': 'Up arrow', '↓': 'Down arrow', '?': 'Question mark' }[k] || k; }).join(' '); }
  function aria(keys) {
    function one(mod) { return keys.map(function (k) { return k === 'mod' ? mod : (ARIA[k] || k); }).join('+'); }
    return keys.indexOf('mod') > -1 ? one('Meta') + ' ' + one('Control') : one();
  }
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
      return '<h3>' + pvxEsc(g.title) + '</h3><dl>' + g.items.map(function (i) {
        return '<dt>' + pvxEsc(i.label) + '</dt><dd aria-label="' + pvxEsc(said(i.keys)) + '">' + cap(i.keys) + '</dd>';
      }).join('') + '</dl>';
    }).join('');
    root.innerHTML = '<div class="pvx-ks-box" role="dialog" aria-modal="true" aria-labelledby="pvxKsT"><div class="pvx-ks-head"><h2 id="pvxKsT">Keyboard shortcuts</h2>' +
      '<button type="button" class="pvx-ks-x" aria-label="Close" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="pvx-ks-body">' + body + '</div></div>';
    var done = root.querySelector('.pvx-ks-x');   /* n211: ✕ Close, not Done */
    var c = { root: root, from: from || document.activeElement };
    c.key = function (e) {
      if (cur !== c) return;
      if (e.key === 'Escape' || (e.key === '?' && !pvxTyping())) { e.preventDefault(); e.stopPropagation(); close(); return; }
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
      if (pvxTyping() || busy() || (opts.skip && opts.skip())) return;
      e.preventDefault(); open(typeof groups === 'function' ? groups() : groups, document.activeElement);
    });
  }
  /* n209: Command-Period cancels wherever Esc does (HIG Alerts) - it is passed on as an Esc press */
  window.addEventListener('keydown', function (e) {
    if (!(((e.metaKey && !e.ctrlKey) || (!MAC && e.ctrlKey && !e.metaKey)) && !e.altKey && (e.key === '.' || e.code === 'Period'))) return;   /* PVX-N366: Ctrl+. off a Mac */
    e.preventDefault(); e.stopPropagation();
    var t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
    var ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true });
    t.dispatchEvent(ev);
  }, true);
  window.PvxKeys = { open: open, close: close, bind: bind, cap: cap, aria: aria, word: word, text: text, mac: MAC, isOpen: function () { return !!cur; } };
})();

/* PVX-N207 - Flow's keyboard: view keys, the shortcuts sheet, the search keycap, /#op=new */
(function(){
  /* the views in their order on screen (Consent forms joins when it is available) */
  function views(){ return [].slice.call(document.querySelectorAll('#subnavFlow .seg[data-view]')).slice(0,9).map(function(b){ var c=b.cloneNode(true); [].forEach.call(c.querySelectorAll('[class*="badge"],[hidden],svg'),function(x){ x.remove(); }); return [b.dataset.view,(c.textContent||'').replace(/\s+/g,' ').trim(),b]; }); }
  function modal(){ if(window.PvxCtx&&PvxCtx.isOpen()) return true; if(PvxKeys.isOpen()) return true; if(document.querySelector('.rd-menu,.pvx-menu')) return true;
    if(document.getElementById('opsMenu')&&document.getElementById('opsMenu').classList.contains('open')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),pvxShown); }
  function screenMode(){ var b=document.body.classList; return b.contains('tv-mode')||b.contains('client-mode'); }
  function app(){ try{ return currentApp; }catch(e){ return 'flow'; } }
  /* tooltips and aria-keyshortcuts on the view buttons, kept in step when a view joins */
  function label(){ views().forEach(function(v,i){ var k='Alt+'+(i+1); if(v[2].getAttribute('aria-keyshortcuts')===k) return; v[2].setAttribute('aria-keyshortcuts',k); v[2].title='Show '+v[1]+' ('+PvxKeys.text(['alt',String(i+1)])+')'; }); }
  label(); setTimeout(label,1500);
  var sw=document.querySelector('#subnavFlow .switcher')||document.getElementById('switcher'); if(sw&&window.MutationObserver) new MutationObserver(label).observe(sw,{childList:true});
  document.addEventListener('keydown',function(e){
    if(!e.altKey||e.metaKey||e.ctrlKey||e.shiftKey) return;
    var m=/^Digit([1-9])$/.exec(e.code||''); if(!m) return;
    if(pvxTyping()||modal()||screenMode()||app()!=='flow') return;
    var v=views()[+m[1]-1], b=v&&v[2]; if(!b||!pvxShown(b)) return;
    e.preventDefault(); b.click();
  });
  /* the search keycap: Ctrl K off the Mac; hidden while the field has text */
  var key=document.getElementById('globalSearchKey'), inp=document.getElementById('globalSearch');
  if(key&&!PvxKeys.mac) key.textContent='Ctrl K';
  if(inp){ var bar=inp.closest('.search-bar'); var sync=function(){ if(bar) bar.classList.toggle('has-text',!!inp.value); }; inp.addEventListener('input',sync); inp.addEventListener('change',sync); sync(); }
  /* the sheet */
  function groups(){
    return [
      {title:'Views', items:views().map(function(v,i){ return {keys:['alt',String(i+1)], label:v[1]}; })},
      {title:'Patients', items:[{keys:['mod','K'],label:'Search patients, rooms and commands'},{keys:['mod','P'],label:'Print this view'},{keys:['mod','Z'],label:'Undo the last change'},{keys:['shift','mod','Z'],label:'Redo'},{keys:['alt','↓'],label:'Next patient, with one open'},{keys:['alt','↑'],label:'Previous patient, with one open'}]},
      {title:'Menus and sheets', items:[{keys:['esc'],label:'Close the menu or sheet'},{keys:['↑','↓'],label:'Move through a menu'},{keys:['return'],label:'Choose'}]},
      {title:'Help', items:[{keys:['?'],label:'Show keyboard shortcuts'}]}
    ];
  }
  PvxKeys.bind(groups,{skip:screenMode});
  /* /#op=new - New patient from the Mac File menu, the Dock menu or a link */
  function opFromHash(){ if(!/(^#|&)op=new\b/.test(String(location.hash||''))) return;
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    try{ if(app()!=='flow'&&typeof switchApp==='function') switchApp('flow'); }catch(e){}
    setTimeout(function(){ if(typeof openAddPatient==='function') openAddPatient(); },120); }
  setTimeout(opFromHash,700); window.addEventListener('hashchange',opFromHash);
})();