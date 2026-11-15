/* PVX-CTX n201 (n204: checked options) - one Pravix context menu (HIG Context menus; claude/hig-audit-context-menus.md).
   Shared by Flow and Anesia. Self-contained: it injects its own styles on first use.
   PvxCtx.open({items, x, y | anchor, label, preview, onClose}) -> opens a menu
     items: [{label, act(), danger, sub:[items], disabled}, {sep:1}, ...]; falsy entries are dropped (context menus hide);
       n207: {disabled:true} shows the item dimmed and inert (pull-downs keep the same items, HIG The menu bar)
     - destructive items always end the menu, after a separator; at most one level of submenu
     - no title and no keyboard shortcuts; arrow keys, Home/End, Return, Esc; focus returns to the item
     - on a phone (under 600 px) it is an action sheet from the bottom with Cancel
     - preview (HTML) shows above the commands, over a dimmed screen (touch and hold)
   PvxCtx.bind(selector, build(el) -> {items, preview, label} | null, {holdMs, touchOnly, holdPreview})
     right-click / Control-click / two-finger click / the keyboard's context-menu key, plus touch and hold */
(function () {
  if (window.PvxCtx) return;
  var CSS = [
    '.pvx-cx{position:fixed;inset:0;z-index:100000;-webkit-tap-highlight-color:transparent}',
    '.pvx-cx.dim{background:rgba(6,10,22,.42);animation:pvxCxFade .16s ease both}',
    '.pvx-cx-panel{position:absolute;display:flex;flex-direction:column;gap:8px;width:max-content;min-width:220px;max-width:min(320px,calc(100vw - 16px));transform-origin:var(--ox,0) var(--oy,0);animation:pvxCxIn .16s cubic-bezier(.2,.8,.2,1) both}',
    '.pvx-cx-pv{padding:12px 14px;border-radius:14px;background:#1A2438;color:#EEF3F8;border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 40px rgba(0,0,0,.35);font:600 .9375rem/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif}',
    '.pvx-cx-pv small{display:block;margin-top:2px;font-weight:500;font-size:.8125rem;opacity:.72}',
    '.pvx-cx-list{display:flex;flex-direction:column;padding:5px;border-radius:14px;background:#1A2438;border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 40px rgba(0,0,0,.35);overflow-y:auto;overscroll-behavior:contain;max-height:calc(100vh - 16px)}',
    '.pvx-cx-list button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;min-height:36px;padding:7px 12px;border-radius:9px;color:#EEF3F8;cursor:pointer;font:500 .875rem/1.25 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;white-space:nowrap}',
    '.pvx-cx-list button .l{flex:1;overflow:hidden;text-overflow:ellipsis}',
    '.pvx-cx-list button .c{flex:none;opacity:.6;font-size:1rem;line-height:1}',
    '.pvx-cx-list button .k{flex:none;width:16px;height:16px;fill:none;stroke:#38BDD2;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
    '.pvx-cx-list button:hover,.pvx-cx-list button:focus-visible{background:rgba(56,189,210,.16);outline:none}',
    '.pvx-cx-list button:active{filter:brightness(.88)}',
    '.pvx-cx-list button.danger{color:#FF6B6B}',
    '.pvx-cx-list button.off{opacity:.42;cursor:default}.pvx-cx-list button.off:hover{background:none}',
    '.pvx-cx-list button.back{font-weight:700}',
    '.pvx-cx-list [role=separator]{height:1px;margin:4px 6px;background:rgba(255,255,255,.12);flex:none}',
    'body:not(.dark) .pvx-cx-list,body:not(.dark) .pvx-cx-pv{background:#FFFFFF;border-color:rgba(15,23,42,.10);box-shadow:0 18px 40px rgba(15,23,42,.18)}',
    'body:not(.dark) .pvx-cx-list button,body:not(.dark) .pvx-cx-pv{color:#14181F}',
    'body:not(.dark) .pvx-cx-list button.danger{color:#D92B22}',
    'body:not(.dark) .pvx-cx-list [role=separator]{background:rgba(15,23,42,.10)}',
    '@media (pointer:coarse){.pvx-cx-list button{min-height:44px}}',
    '.pvx-cx.sheet .pvx-cx-panel{left:8px!important;right:8px;top:auto!important;bottom:calc(8px + env(safe-area-inset-bottom,0px));width:auto;max-width:none;min-width:0;transform-origin:50% 100%;animation-name:pvxCxUp}',
    '.pvx-cx.sheet .pvx-cx-list{max-height:62vh}',
    '.pvx-cx.sheet .pvx-cx-list button{justify-content:center;min-height:48px;font-size:1.0625rem}',
    '.pvx-cx-cancel{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:14px;background:#1A2438;border:1px solid rgba(255,255,255,.10);color:#EEF3F8;font:700 1.0625rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;cursor:pointer}',
    'body:not(.dark) .pvx-cx-cancel{background:#FFFFFF;border-color:rgba(15,23,42,.10);color:#14181F}',
    '.pvx-cx-cancel:focus-visible{outline:2px solid #38BDD2;outline-offset:2px}',
    '.pvx-cx.out{opacity:0;transition:opacity .12s ease}',
    '.pvx-cx-lift{scale:1.02;transition:scale .16s ease}',
    '@keyframes pvxCxIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}',
    '@keyframes pvxCxUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}',
    '@keyframes pvxCxFade{from{opacity:0}to{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.pvx-cx-panel,.pvx-cx.dim{animation:none}.pvx-cx-lift{scale:none}}',
    '@media (forced-colors:active){.pvx-cx-list,.pvx-cx-pv,.pvx-cx-cancel{border:1px solid CanvasText}}'
  ].join('\n');
  var cur = null, lastOpen = 0;
  function css() { if (document.getElementById('pvx-ctx-css')) return; var s = document.createElement('style'); s.id = 'pvx-ctx-css'; s.textContent = CSS; document.head.appendChild(s); }
  function rmo() { try { return matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { return false; } }
  function norm(items) {
    var a = [], d = [];
    (items || []).forEach(function (i) {
      if (!i) return; if (i.sep) { a.push(i); return; }
      if (i.sub) { i = Object.assign({}, i, { sub: norm(i.sub) }); if (!i.sub.length) return; }
      (i.danger ? d : a).push(i);
    });
    if (d.length) { a.push({ sep: 1 }); a = a.concat(d); }
    var out = []; a.forEach(function (i) { if (i.sep && (!out.length || out[out.length - 1].sep)) return; out.push(i); });
    while (out.length && out[out.length - 1].sep) out.pop();
    return out;
  }
  function focusEl(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  function close(back) {
    if (!cur) return; var c = cur; cur = null;
    document.removeEventListener('keydown', c.key, true); window.removeEventListener('resize', c.away); window.removeEventListener('wheel', c.sc, true); window.removeEventListener('touchmove', c.sc, true);
    if (c.lift) c.lift.classList.remove(c.liftCls);
    c.root.classList.add('out'); setTimeout(function () { c.root.remove(); }, rmo() ? 0 : 130);
    if (c.onClose) try { c.onClose(); } catch (e) { }
    if (back !== false && c.anchor && c.anchor.isConnected) focusEl(c.anchor);
  }
  function open(o) {
    close(false); css();
    var items = norm(o.items);
    if (!items.length) return null;
    var phone = window.innerWidth < 600;
    var root = document.createElement('div');
    root.className = 'pvx-cx' + (phone ? ' sheet dim' : '') + (o.preview && !phone ? ' dim' : '');
    var panel = document.createElement('div'); panel.className = 'pvx-cx-panel';
    root.appendChild(panel);
    if (o.preview) { var pv = document.createElement('div'); pv.className = 'pvx-cx-pv'; pv.setAttribute('aria-hidden', 'true'); pv.innerHTML = o.preview; panel.appendChild(pv); }
    var list = document.createElement('div'); list.className = 'pvx-cx-list'; list.setAttribute('role', 'menu'); list.setAttribute('aria-label', o.label || 'Actions');
    panel.appendChild(list);
    var cancel = null;
    if (phone) { cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'pvx-cx-cancel'; cancel.textContent = 'Cancel'; panel.appendChild(cancel); }
    var c = { root: root, panel: panel, list: list, anchor: o.anchor || null, onClose: o.onClose, lift: o.lift || null, liftCls: o.liftClass || 'pvx-cx-lift', stack: [] };
    function draw(level, title) {
      var h = '';
      if (title) h += '<button type="button" role="menuitem" class="back" data-back="1"><span class="c" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></span><span class="l">' + pvxEsc(title) + '</span></button><div role="separator"></div>';
      level.forEach(function (it, i) {
        if (it.sep) { h += '<div role="separator"></div>'; return; }
        var ck = it.checked !== undefined;   /* n204: an option can show a checkmark (the current choice) */
        h += '<button type="button" role="' + (ck ? 'menuitemradio' : 'menuitem') + '"' + (ck ? ' aria-checked="' + !!it.checked + '"' : '') + ' data-i="' + i + '"' + ((it.danger || it.disabled) ? ' class="' + (it.danger ? 'danger' : '') + (it.disabled ? ' off' : '') + '"' : '') + (it.disabled ? ' aria-disabled="true"' : '') + (it.sub ? ' aria-haspopup="menu"' : '') + '>' + (ck ? '<svg class="k" viewBox="0 0 24 24" aria-hidden="true"' + (it.checked ? '' : ' style="visibility:hidden"') + '><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '') + (it.icon ? '<span class="i" aria-hidden="true">' + it.icon + '</span>' : '') + '<span class="l">' + pvxEsc(it.label) + '</span>' + (it.sub ? '<span class="c" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></span>' : '') + '</button>';
      });
      list.innerHTML = h; list.scrollTop = 0; c.level = level;
      focusEl(list.querySelector('button[data-i]:not([aria-disabled])') || list.querySelector('button'));
    }
    function enter(it) { c.stack.push(c.level); draw(it.sub, it.label); }
    function back() { if (!c.stack.length) return false; draw(c.stack.pop(), null); return true; }
    function pick(btn) {
      if (btn.hasAttribute('data-back')) { back(); return; }
      var it = c.level[+btn.getAttribute('data-i')]; if (!it || it.disabled) return;
      if (it.sub) { enter(it); return; }
      close(false); var a = c.anchor;
      try { it.act && it.act(); } finally { setTimeout(function () { var f = document.activeElement; if ((!f || f === document.body) && a && a.isConnected) focusEl(a); }, 0); }
    }
    list.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); pick(b); });
    if (cancel) cancel.addEventListener('click', function (e) { e.stopPropagation(); close(true); });
    root.addEventListener('pointerdown', function (e) { if (e.target === root) { e.preventDefault(); e.stopPropagation(); close(true); } });
    root.addEventListener('click', function (e) { if (e.target === root) { e.stopPropagation(); close(true); } });
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); if (e.target === root) close(true); });
    c.key = function (e) {
      if (!cur || cur !== c) return;
      var bs = [].slice.call(list.querySelectorAll('button')); if (cancel) bs.push(cancel);
      var i = bs.indexOf(document.activeElement), n = null;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
      if (e.key === 'Tab') { e.preventDefault(); close(true); return; }
      if (e.key === 'ArrowDown') n = (i + 1) % bs.length; else if (e.key === 'ArrowUp') n = (i - 1 + bs.length) % bs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = bs.length - 1;
      else if (e.key === 'ArrowRight') { var b = document.activeElement; if (b && b.getAttribute('aria-haspopup')) { e.preventDefault(); pick(b); } return; }
      else if (e.key === 'ArrowLeft') { if (back()) e.preventDefault(); return; }
      if (n !== null) { e.preventDefault(); e.stopPropagation(); focusEl(bs[n]); }
    };
    c.away = function () { close(false); };
    c.sc = function (e) { if (cur === c && !(e.target && e.target.nodeType === 1 && c.panel.contains(e.target))) close(false); };
    document.body.appendChild(root);
    cur = c; lastOpen = Date.now();
    if (c.lift) c.lift.classList.add(c.liftCls);
    draw(items, null);
    if (!phone) {
      var W = window.innerWidth, H = window.innerHeight, pw = panel.offsetWidth, ph = panel.offsetHeight, x, y, ox = '0', oy = '0';
      if (o.anchor && (o.x == null || o.y == null)) {
        var r = o.anchor.getBoundingClientRect();
        x = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), W - pw - 8); ox = '50%';
        if (r.bottom + 8 + ph <= H - 8 || r.top - 8 - ph < 8) { y = Math.min(r.bottom + 8, H - ph - 8); oy = '0'; } else { y = r.top - 8 - ph; oy = '100%'; }
      } else {
        x = o.x; y = o.y;
        if (x + pw > W - 8) { x = Math.max(8, x - pw); ox = '100%'; }
        if (y + ph > H - 8) { y = Math.max(8, y - ph); oy = '100%'; }
      }
      panel.style.left = Math.round(x) + 'px'; panel.style.top = Math.round(Math.max(8, y)) + 'px';
      panel.style.setProperty('--ox', ox); panel.style.setProperty('--oy', oy);
      list.style.maxHeight = (H - 16 - (o.preview ? panel.querySelector('.pvx-cx-pv').offsetHeight + 8 : 0)) + 'px';
    }
    document.addEventListener('keydown', c.key, true);
    window.addEventListener('resize', c.away); window.addEventListener('wheel', c.sc, { capture: true, passive: true }); window.addEventListener('touchmove', c.sc, { capture: true, passive: true });   /* a scroll by the person closes it; programmatic smooth scrolls don't */
    return c;
  }
  function editable(t) { return !!(t && t.closest && t.closest('input,textarea,select,[contenteditable=""],[contenteditable=true]')); }
  function bind(sel, build, opt) {
    opt = opt || {};
    function show(el, e, how) {
      var o = build(el, how); if (!o || !o.items) return false;
      var m = open(Object.assign({ anchor: el }, o, how === 'hold' ? { x: null, y: null, preview: opt.holdPreview ? o.preview : null, lift: o.lift === undefined ? el : o.lift } : how === 'key' ? { x: null, y: null, preview: null } : { x: e.clientX, y: e.clientY, preview: null, lift: null }));
      return !!m;
    }
    document.addEventListener('contextmenu', function (e) {
      if (editable(e.target)) return;
      if (e.clientX || e.clientY) { try { var s = window.getSelection && getSelection(); if (s && !s.isCollapsed && String(s).trim()) { for (var k = 0; k < s.rangeCount; k++) { if (s.getRangeAt(k).intersectsNode(e.target)) return; } } } catch (x) {} }   /* n358: on selected text, the browser's Copy and Look Up */
      var el = e.target.closest && e.target.closest(sel); if (!el) return;
      if (opt.skip && opt.skip(el, e)) return;
      if (Date.now() - lastOpen < 700 && cur) { e.preventDefault(); return; }   /* a touch hold already opened it */
      var how = (!e.clientX && !e.clientY) ? 'key' : 'click';
      if (show(el, e, how)) e.preventDefault();
    }, true);
    var t = 0, sx = 0, sy = 0, eat = 0;
    function clear() { clearTimeout(t); t = 0; }
    document.addEventListener('pointerdown', function (e) {
      clear(); if (e.button > 0 || editable(e.target)) return;
      if (opt.touchOnly && e.pointerType === 'mouse') return;
      var el = e.target.closest && e.target.closest(sel); if (!el) return;
      if (opt.skip && opt.skip(el, e)) return;
      sx = e.clientX; sy = e.clientY;
      t = setTimeout(function () {
        t = 0; if (cur && Date.now() - lastOpen < 700) return; if (opt.beforeHold) try { opt.beforeHold(el); } catch (x) { }
        if (show(el, e, 'hold')) { eat = Date.now(); try { if (navigator.vibrate && matchMedia('(pointer:coarse)').matches) navigator.vibrate(6); } catch (x) { } }
      }, opt.holdMs || 500);
    }, true);
    document.addEventListener('pointermove', function (e) { if (t && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) clear(); }, { passive: true, capture: true });
    ['pointerup', 'pointercancel', 'dragstart'].forEach(function (k) { document.addEventListener(k, function (e) { clear(); if (k === 'dragstart' && cur && Date.now() - lastOpen < 1500) close(false); }, true); });
    document.addEventListener('click', function (e) { if (eat && Date.now() - eat < 900) { eat = 0; e.preventDefault(); e.stopPropagation(); } }, true);
  }
  window.PvxCtx = { open: open, close: close, bind: bind, isOpen: function () { return !!cur; } };
})();

/* PVX-N201 - Flow's context menus */
(function(){
  if(!window.PvxCtx) return;
  function find(pid){ return (typeof PATIENTS!=='undefined'?PATIENTS:[]).find(function(x){ return x.id===pid; }); }
  function shown(){ var b=document.body.classList; return !(b.contains('tv-mode')||b.contains('client-mode')); }
  function call(name){ var f=window[name]; return typeof f==='function'?f:null; }
  function copyLink(p){ pvxShareTracker(trackUrlFor(p), pvxFullName(p)); }
  function flowItems(p){
    var done=typeof isCompleted==='function'&&isCompleted(p);
    var stages=done?[]:STAGE_ORDER.filter(function(st){ return st!==p.status; }).map(function(st){ return {label:st,act:function(){ call('moveStatus')(p,st); }}; });
    var rooms=done?[]:ROOMS.concat(['Treatment']).filter(function(rm){ return rm!==p.room&&canDropRoom(p,rm); }).map(function(rm){ return {label:rm,act:function(){
      if(rm==='Comfort Room') showConfirm('Move patient to Comfort Room?','Move patient',function(){ call('moveRoom')(p,rm); }); else call('moveRoom')(p,rm); }}; });
    var docs=done?[]:DOCTORS.filter(function(d){ return d.id!==p.doctor; }).map(function(d){ return {label:d.name,act:function(){ call('assignDoctor')(p,d.id); try{ renderAll(); }catch(e){} }}; });
    return [{label:'Open',act:function(){ openDrawer(p.id); }}, (window.pvxNewWinItem&&pvxNewWinItem(p)), {sep:1},
      stages.length&&{label:'Move to',sub:stages}, rooms.length&&{label:'Room',sub:rooms}, docs.length&&{label:'Assign doctor',sub:docs},
      (!done&&p.waitingOn&&p.waitingOn.text)&&{label:'Clear “Waiting on '+p.waitingOn.text+'”',act:function(){ var t=document.createElement('button'); t.type='button'; t.hidden=true; t.setAttribute('data-fvwait',p.id); document.body.appendChild(t); t.click(); t.remove(); }}, {sep:1},
      (!done&&window.fvDocs&&fvDocs.openSend)&&{label:'Send a form…',icon:'<svg viewBox="0 0 24 24"><path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z"/></svg>',act:function(){ fvDocs.openSend(p); }},
      (p.publicToken&&typeof trackUrlFor==='function')&&{label:'Copy tracker link',icon:'<svg viewBox="0 0 24 24"><path d="M9 7h6.5L19 10.5V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><path d="M5 16V5a2 2 0 0 1 2-2h6"/></svg>',act:function(){ pvxCopyTracker(trackUrlFor(p)); }},
      (p.publicToken&&typeof trackUrlFor==='function'&&typeof pvxCanShare==='function'&&pvxCanShare())&&{label:'Share tracker link…',icon:'<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M8 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>',act:function(){ copyLink(p); }}];
  }
  function rdItems(p,row){
    var r=p.rounds||{}, ended=!!r.outcome, open=row.classList.contains('open');
    var cur=typeof rdCurrentDocId==='function'?rdCurrentDocId(p):null;
    return [{label:open?'Close':'Open',act:function(){ rdHandleAct('toggle',row.querySelector('.rd-rowmain')||row); }},
      !ended&&typeof RD_ACUITY!=='undefined'&&{label:'Status',sub:Object.keys(RD_ACUITY).filter(function(k){ return k!==r.acuity; }).map(function(k){ return {label:RD_ACUITY[k].label,act:function(){ rdSetAcuity(p,k); }}; })},
      !ended&&typeof rdAllDoctors==='function'&&{label:'Take case',sub:rdAllDoctors().filter(function(d){ return d.id!==cur; }).map(function(d){ return {label:drName(d.name)+(typeof rdActorId!=='undefined'&&rdActorId===d.id?' (you)':''),act:function(){ rdTakeCase(p,d.id); }}; })},
      {sep:1},
      find(p.id)&&{label:'Show in Flow',act:function(){ switchApp('flow'); setTimeout(function(){ openDrawer(p.id); },80); }}];
  }
  var SEL='#board .card[data-pid],#tableBody tr[data-pid],.r-pt[data-pid],.rd-row[data-pid]>.rd-rowmain,#view-dashboard .attn-item[data-pid]';   /* n357: the Attention center too */
  PvxCtx.bind(SEL,function(el){
    if(!shown()) return null;
    var row=el.classList.contains('rd-rowmain')?el.parentElement:null, pid=(row||el).getAttribute('data-pid');
    var p=row?(typeof rdFind==='function'?rdFind(pid):null):find(pid); if(!p) return null;
    return {items:row?rdItems(p,row):flowItems(p),label:'Actions for '+pvxFullName(p),lift:row||el};
  },{touchOnly:true,holdMs:500,
     skip:function(el,e){ return e.type==='pointerdown'&&!!(e.target.closest('button,a,input,select,textarea,[role=button]')&&e.target.closest('button,a,input,select,textarea,[role=button]')!==el); },
     beforeHold:function(){ if(window.rdRk&&typeof rdRankEnd==='function') rdRankEnd(false); }});
})();