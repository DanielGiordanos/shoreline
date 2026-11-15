/* ═══ Pravix shared overlay primitive · n132 ═══
   One behaviour for every modal, drawer, popover and scrim in the suite (audit FL-01, FL-06, DTA-S02, DTA-A05, DTA-C05, DTA-M01, CL-T05, CL-O11):
   · CLOSED means closed: once an overlay's exit transition has finished it gets `inert` + visibility:hidden (class .pvx-closed), so its
     controls leave the Tab order and the accessibility tree. Opacity, transform and pointer-events alone never hide anything from a keyboard.
   · OPEN means active: a modal overlay gets role=dialog + aria-modal, a name, an initial focus inside it, Tab/Shift+Tab kept inside,
     Escape → its own Cancel/Close control (so the app's own cancel logic decides about unsaved edits), and focus back to the opener on close.
   · The app keeps its own open/close code and classes; this watches the class and reacts. Nothing here reads or writes app data.
   Registry entries: {sel, open:'open'|['open','show'], modal:true, dialog:'.inner-card' (where the dialog semantics go), close:'.close,.btn.ghost',
     label:'…', labelFrom:'h2', initial:'input', escape:true, delay:450}
   A registered element is only ever marked closed when it is also visually invisible (opacity 0, display none, or outside the viewport),
   so a mis-registered element that is really on screen is never hidden by mistake. */
(function(){
  if(window.pvxOverlay) return;
  var REG=[], timers=new WeakMap(), st=new WeakMap(), last=new WeakMap(), known=new WeakMap(), stack=[];
  function closestRegistered(n){ while(n&&n.nodeType===1){ if(cfgFor(n)) return n; n=n.parentElement; } return null; }
  function cfgFor(el){ for(var i=REG.length-1;i>=0;i--){ try{ if(el.matches(REG[i].sel)) return REG[i]; }catch(e){} } return null; }
  function isOpen(el,r){ if(r.openWhen) return !!r.openWhen(el); var o=r.open||'open'; return (Array.isArray(o)?o:[o]).some(function(c){ return el.classList.contains(c); }); }
  function invisible(el){ var s=getComputedStyle(el); if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0) return true;
    var b=el.getBoundingClientRect(); return b.width===0||b.height===0||b.right<=0||b.left>=innerWidth||b.bottom<=0||b.top>=innerHeight; }
  function visibleEl(el){ if(!el||!el.isConnected) return false; var n=el; while(n&&n.nodeType===1){ var s=getComputedStyle(n); if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0) return false; n=n.parentElement; }
    var b=el.getBoundingClientRect(); return b.width>0&&b.height>0; }
  function focusables(el){ return [].slice.call(el.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable=true]')).filter(function(f){
    if(f.disabled||f.getAttribute('tabindex')==='-1'||f.getAttribute('aria-hidden')==='true') return false; if(f.closest('.pvx-closed,[inert],[hidden]')) return false; return visibleEl(f); }); }
  function hideNow(el,r){ if(isOpen(el,r)||!invisible(el)) return false; el.classList.add('pvx-closed'); el.setAttribute('inert',''); el.setAttribute('data-pvx-closed','1'); return true; }
  /* wait for the exit transition, then hide; if it is still moving, keep checking for a while (a .5 s slide must not leave it exposed) */
  function settle(el,r){ clearTimeout(timers.get(el)); var tries=0, step=function(){ if(isOpen(el,r)) return; if(!hideNow(el,r)&&tries++<16) timers.set(el,setTimeout(step,150)); };
    timers.set(el,setTimeout(step,r.delay!=null?r.delay:300)); }
  function reveal(el){ clearTimeout(timers.get(el)); el.classList.remove('pvx-closed'); el.removeAttribute('inert'); el.removeAttribute('data-pvx-closed'); }
  function name(el,r){ if(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')) return;
    var h=r.labelFrom?el.querySelector(r.labelFrom):el.querySelector('h1,h2,h3,.drawer-head h2,.modal-title,.sheet-title');
    if(h&&h.textContent.trim()){ if(!h.id) h.id='pvxlbl_'+Math.random().toString(36).slice(2,8); el.setAttribute('aria-labelledby',h.id); }
    else if(r.label) el.setAttribute('aria-label',r.label); }
  function dialogEl(el,r){ return (r.dialog&&el.querySelector(r.dialog))||el; }
  function semantics(el,r){ if(r.modal===false) return; var d=dialogEl(el,r); if(!d.getAttribute('role')) d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); name(d,r); }
  function onOpen(el,r){ reveal(el); semantics(el,r);
    var opener=document.activeElement; if(opener===document.body||opener===document.documentElement) opener=null;
    /* n133: the opener may already have been re-rendered away by the time this runs (a list that redraws when a row is picked) — fall back to what held focus a moment ago */
    if(!opener&&lastFocus.el&&Date.now()-lastFocus.at<1500&&!el.contains(lastFocus.el)) opener=lastFocus.el;
    if(opener&&el.contains(opener)) opener=(st.get(el)||{}).opener||null;
    /* opened from inside another overlay (a menu item, say): remember that overlay's own opener as the fallback return point */
    var host=opener&&opener.closest?closestRegistered(opener.parentElement):null, opener2=host?(last.get(host)||{}).opener||null:null;
    st.set(el,{opener:opener,opener2:opener2,key:openerKey(opener),at:Date.now()}); last.set(el,{opener:opener,opener2:opener2,key:openerKey(opener)}); if(stack.indexOf(el)<0) stack.push(el);
    if(r.modal===false&&!r.focus) return;
    setTimeout(function(){ if(!isOpen(el,r)||!el.isConnected) return; var a=document.activeElement; if(a&&el.contains(a)) return;   /* the app already placed focus: keep it */
      var f=focusables(el), t=r.initial===':self'?el:(r.initial?el.querySelector(r.initial):null);
      if(t===el&&!el.hasAttribute('tabindex')) el.setAttribute('tabindex','-1');
      if(t&&!visibleEl(t)) t=null;
      t=t||f.filter(function(x){ return /^(INPUT|SELECT|TEXTAREA)$/.test(x.tagName)&&!/^(checkbox|radio|file)$/.test(x.type); })[0]||f.filter(function(x){ return !/close|cancel|dismiss/i.test((x.getAttribute('aria-label')||'')+' '+x.className+' '+x.textContent); })[0]||f[0];
      if(!t){ if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','-1'); t=el; }
      try{ t.focus({preventScroll:true}); }catch(e){} },r.focusDelay!=null?r.focusDelay:80); }
  /* n133: a selector that finds the opener again after the list it sits in re-renders (same id, or same data-pid/data-loc/data-id with the same classes) */
  function openerKey(o){ if(!o||!o.getAttribute) return null; if(o.id) return '#'+CSS.escape(o.id); var ks=['data-pid','data-loc','data-id','data-key'];
    for(var i=0;i<ks.length;i++){ var v=o.getAttribute(ks[i]); if(v){ var cls=(o.className&&typeof o.className==='string')?o.className.trim().split(/\s+/).map(function(c){ return '.'+CSS.escape(c); }).join(''):''; return o.tagName.toLowerCase()+cls+'['+ks[i]+'="'+v.replace(/"/g,'\\"')+'"]'; } } return null; }
  /* n133: the list the opener sits in may redraw right after the overlay closes (the app clears its selection) — if that drops focus, find the opener again by its key */
  function keepOn(key){ if(!key) return; [120,320,650].forEach(function(ms){ setTimeout(function(){ var a=document.activeElement; if(a&&a!==document.body&&a!==document.documentElement) return; if(topModal()) return;
      try{ var o=document.querySelector(key); if(o&&visibleEl(o)) o.focus({preventScroll:true}); }catch(e){} },ms); }); }
  var lastFocus={el:null,at:0}; document.addEventListener('focusin',function(e){ var x=e.target; if(x&&x!==document.body&&x!==document.documentElement) lastFocus={el:x,at:Date.now()}; },true);
  function onClose(el,r){ var s=st.get(el)||{}; st.delete(el); var i=stack.indexOf(el); if(i>-1) stack.splice(i,1); settle(el,r);
    var a=document.activeElement; if(a&&a!==document.body&&!el.contains(a)) return;   /* the app moved focus somewhere sensible already */
    var cands=[s.opener,s.opener2]; if(s.key){ try{ var again=document.querySelector(s.key); if(again) cands.splice(1,0,again); }catch(e){} }
    for(var k=0;k<cands.length;k++){ var o=cands[k]; if(o&&o.isConnected&&visibleEl(o)&&!o.closest('.pvx-closed,[inert]')){ try{ o.focus({preventScroll:true}); keepOn(s.key); return; }catch(e){} } }
    var top=topModal(); if(top){ var f=focusables(top)[0]||top; try{ f.focus({preventScroll:true}); }catch(e){} return; }
    var m=document.querySelector('main,[role=main]')||document.body; if(m!==document.body&&!m.hasAttribute('tabindex')) m.setAttribute('tabindex','-1'); try{ m.focus({preventScroll:true}); }catch(e){} }
  function sync(el){ var r=cfgFor(el); if(!r||!el.isConnected) return; var o=isOpen(el,r), was=known.get(el);
    if(was===undefined){ known.set(el,o); if(o){ reveal(el); semantics(el,r); if(stack.indexOf(el)<0) stack.push(el); } else settle(el,r); return; }
    if(o===was) return; known.set(el,o); if(o) onOpen(el,r); else onClose(el,r); }
  function otherDialogOpen(top){ var own=dialogEl(top,cfgFor(top)||{}); return [].slice.call(document.querySelectorAll('[role=dialog],[aria-modal=true]')).some(function(d){ return d!==top&&d!==own&&!d.contains(top)&&!d.closest('.pvx-closed,[inert]')&&visibleEl(d); }); }   /* a dialog nested inside the top one (an end-of-visit sheet in a drawer) counts too */
  function topModal(){ for(var i=stack.length-1;i>=0;i--){ var el=stack[i], r=cfgFor(el); if(el.isConnected&&r&&r.modal!==false&&isOpen(el,r)&&!invisible(el)) return el; } return null; }
  /* n133: when an open modal re-renders the element that held focus, the browser drops focus to <body> silently (no blur event); bring it back to the modal container */
  var refocusT; function refocus(){ clearTimeout(refocusT); refocusT=setTimeout(function(){ var top=topModal(); if(!top) return; var a=document.activeElement; if(a&&a!==document.body&&a!==document.documentElement) return;
    if(!top.hasAttribute('tabindex')) top.setAttribute('tabindex','-1'); try{ top.focus({preventScroll:true}); }catch(x){} },60); }
  var mo=new MutationObserver(function(ms){ var lost=false; ms.forEach(function(m){ if(m.type==='childList'&&m.removedNodes.length) lost=true; if(m.type==='attributes'){ sync(m.target); }
    else m.addedNodes.forEach(function(n){ if(n.nodeType!==1) return; if(cfgFor(n)) { observe(n); sync(n); } n.querySelectorAll&&REG.forEach(function(r){ n.querySelectorAll(r.sel).forEach(function(x){ observe(x); sync(x); }); }); }); }); if(lost) refocus(); });
  function observe(el){ if(el.__pvxObs) return; el.__pvxObs=1; mo.observe(el,{attributes:true,attributeFilter:['class','style','hidden','aria-hidden']}); }
  function scan(){ REG.forEach(function(r){ document.querySelectorAll(r.sel).forEach(function(el){ observe(el); sync(el); }); }); }
  /* on window, capture phase: runs before the app's own document listeners whatever the event's target */
  window.addEventListener('keydown',function(e){
    if(e.defaultPrevented) return; var top=topModal(); if(!top) return; var r=cfgFor(top);
    if(e.key==='Escape'){ var ae=document.activeElement; if(ae&&ae.getAttribute&&((ae.getAttribute('role')==='combobox'&&ae.getAttribute('aria-expanded')==='true')||ae.hasAttribute('data-pvx-esc'))) return; }   /* PVX-N214: an open list (or a selected token) takes Esc first */
    /* another dialog is open above this one (one the app mounts on demand and manages itself): leave the keys to the app */
    if(otherDialogOpen(top)) return;
    if(e.key==='Tab'){ var f=focusables(top); if(!f.length){ e.preventDefault(); try{ top.focus(); }catch(x){} return; }
      var a=document.activeElement, i=f.indexOf(a);
      if(i<0||!top.contains(a)){ e.preventDefault(); f[e.shiftKey?f.length-1:0].focus(); return; }
      if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } else if(e.shiftKey&&i===0){ e.preventDefault(); f[f.length-1].focus(); } }
    else if(e.key==='Escape'&&r.escape!==false){ var c=null; (r.close||'.close,[data-close],.btn.ghost,[aria-label^="Close"],[aria-label^="Cancel"]').split(',').some(function(s){ var cands=[].slice.call(top.querySelectorAll(s.trim())).filter(visibleEl); if(cands.length){ c=cands[0]; return true; } return false; });
      if(typeof r.onEscape==='function'){ e.preventDefault(); r.onEscape(top); } else if(c){ e.preventDefault(); c.click(); } }
  },true);
  /* a focus that lands in a closed overlay anyway (programmatic focus from the app) is sent back to the page */
  document.addEventListener('focusin',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.pvx-closed'); if(!el) return; var top=topModal(); var f=top?(focusables(top)[0]||top):(document.querySelector('main,[role=main]')||document.body); try{ f.focus({preventScroll:true}); }catch(x){} },true);
  window.pvxOverlay={register:function(list){ (list||[]).forEach(function(r){ if(r&&r.sel) REG.push(r); }); if(document.body){ scan(); mo.observe(document.body,{childList:true,subtree:true}); } else document.addEventListener('DOMContentLoaded',function(){ scan(); mo.observe(document.body,{childList:true,subtree:true}); });
    window.addEventListener('load',scan); },
    scan:scan, top:topModal, focusables:focusables, _reg:REG, _state:function(el){ return st.get(el)||null; }, version:'n133'};
})();

pvxOverlay.register([{"sel": ".addpt-modal,.intake-modal,.us-modal", "open": "open", "modal": true, "close": ".close,.btn.ghost,[data-fvor-x]"}, {"sel": ".confirm", "open": "open", "modal": true, "close": "#confirmCancel,.btn.ghost", "label": "Confirm"}, {"sel": "aside.drawer,#drawer,#locDrawer", "open": "open", "modal": true, "close": ".drawer-head .close,.close", "initial": ":self"}, {"sel": ".scrim,.confirm-scrim,.ops-scrim,.us-scrim,.intake-scrim,.addpt-scrim", "open": "open", "modal": false}, {"sel": ".ops-menu", "open": "open", "modal": false, "escape": false}, {"sel": "#fvPanel", "open": "show", "modal": false, "escape": false}, {"sel": ".dd-panel", "open": "open", "modal": false, "escape": false}]);