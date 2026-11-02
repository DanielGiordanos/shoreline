/* Treatment Sheets — the HIG layers' scripts that lived inline in index.html <body> (n132 … n298), folded out in n299 (Nov 1 2026).
   Source of truth for treatment/layers.js: edit this file, then run treatment/src/build.py (terser) to rebuild layers.js and the ?v= hashes in index.html.
   Each block is the inline <script> it came from, in the same order; the file is loaded by a classic <script> at the same point of the parse, so it runs before the deferred app scripts as the blocks did. */

/* ════ pvx-n298-ts · the layers' shared helpers (n298: pvxOn; n299: pvxWatch) ════ */
/* n298 · performance: layers listen to the app's own events instead of polling (claude/treatment-performance-audit-2026-11-01.md).
   pvxOn(events, fn, fallback): subscribes fn to the app's event bus (store.js: tsHooks.on) as soon as it exists; when the bus
   isn't there once the page has loaded, fallback() installs the layer's old timer, so a page without store.js behaves as before.
   n299 · pvxWatch(fn, opts): one MutationObserver on document.body for every layer. A layer passes the options it used to pass
   to its own observer and gets only the records those options would have given it, in the order the layers registered. */
(function(){
  var queue=[];
  function bus(){ var H=window.tsHooks; return H&&typeof H.on==='function'?H:null; }
  function sub(H,evs,fn){ (Array.isArray(evs)?evs:[evs]).forEach(function(e){ H.on(e,function(){ try{ fn.apply(null,arguments); }catch(x){ console.warn('[n298 '+e+']',x); } }); }); }
  function flush(){ var H=bus(); var q=queue; queue=[]; q.forEach(function(it){ if(H) sub(H,it.evs,it.fn); else if(it.fb){ try{ it.fb(); }catch(x){ console.warn('[n298 fallback]',x); } } }); }
  window.pvxOn=function(evs,fn,fallback){ var H=bus(); if(H){ sub(H,evs,fn); return true; } queue.push({evs:evs,fn:fn,fb:fallback});
    if(document.readyState!=='loading') setTimeout(flush,0); return false; };
  document.addEventListener('DOMContentLoaded',function(){ setTimeout(flush,0); });

  var subs=[], mo=null, all=false, filt={}, oldV=false, cd=false;
  function wants(s,m){
    if(m.type==='childList'){ if(!s.childList) return false; }
    else if(m.type==='attributes'){ if(!s.attributes) return false; if(s.filter&&s.filter.indexOf(m.attributeName)<0) return false; }
    else if(m.type==='characterData'){ if(!s.characterData) return false; }
    if(!s.subtree&&m.target!==document.body) return false;
    return true; }
  function deliver(ms){ var list=subs.slice();
    for(var i=0;i<list.length;i++){ var s=list[i], out=[]; for(var j=0;j<ms.length;j++) if(wants(s,ms[j])) out.push(ms[j]);
      if(out.length){ try{ s.fn(out,s.obs); }catch(e){ setTimeout(function(){ throw e; },0); } } } }
  function options(){ var o={childList:true,subtree:true,attributes:true}; if(all) o.attributeOldValue=oldV; else { o.attributeFilter=Object.keys(filt); o.attributeOldValue=oldV; } if(cd) o.characterData=true; return o; }
  var lastO=''; function start(){ if(!document.body) return; if(!mo) mo=new MutationObserver(deliver); var o=options(), k=JSON.stringify(o); if(k!==lastO){ lastO=k; mo.observe(document.body,o); } }
  window.pvxWatch=function(fn,opts){ opts=opts||{}; var s={fn:fn,childList:!!opts.childList,attributes:!!(opts.attributes||opts.attributeFilter),filter:opts.attributeFilter?opts.attributeFilter.slice():null,characterData:!!opts.characterData,subtree:!!opts.subtree};
    s.obs={disconnect:function(){ var i=subs.indexOf(s); if(i>-1) subs.splice(i,1); },takeRecords:function(){ return []; }};
    subs.push(s); if(s.attributes){ if(s.filter) s.filter.forEach(function(a){ filt[a]=1; }); else all=true; } if(opts.attributeOldValue) oldV=true; if(s.characterData) cd=true;
    if(document.body) start(); else document.addEventListener('DOMContentLoaded',start,{once:true}); return s.obs; };
  window.pvxWatch.count=function(){ return subs.length; };
})();

/* ════ (anonymous) · was index.html line 1470 ════ */
/* CL-T02 n132: compact search — the visible Search button is the Tab stop while collapsed; the field opens on focus/click and closes when left empty */(function(){var s=document.querySelector(".subnav .search"),i=document.getElementById("globalSearch"),b=s&&s.querySelector(".ts-search-open"),mq=window.matchMedia("(max-width:1680px)");if(!s||!i||!b)return;function collapsed(){return mq.matches&&!s.classList.contains("is-open")&&!s.classList.contains("is-focus");}function sync(){var c=collapsed();i.tabIndex=c?-1:0;b.tabIndex=c?0:-1;b.setAttribute("aria-hidden",c?"false":"true");}b.addEventListener("click",function(){s.classList.add("is-open");i.focus();sync();});s.addEventListener("click",function(e){if(!s.contains(document.activeElement)){i.focus();sync();}});i.addEventListener("focus",function(){s.classList.add("is-focus");sync();});i.addEventListener("input",function(){s.classList.toggle("is-open",!!i.value);sync();});i.addEventListener("blur",function(){s.classList.remove("is-focus");if(!i.value)s.classList.remove("is-open");setTimeout(sync,0);});mq.addEventListener?mq.addEventListener("change",sync):mq.addListener(sync);sync();})();

/* ════ (anonymous) · was index.html line 1474 ════ */
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

(function(){ if(document.body&&!document.getElementById("tsModal")){ var m=document.createElement("div"); m.id="tsModal"; document.body.appendChild(m); } })();  /* PVX-N141: exists before its first opening, so the overlay sees it open (focus in, Escape, focus back) */
pvxOverlay.register([{"sel": "#tsModal", "open": "show", "modal": true, "dialog": ".tm-card", "close": "[data-x]"}]);  /* PVX-N141 TO-04 */
pvxOverlay.register([{"sel": "aside.drawer", "open": "open", "modal": true, "close": ".drawer-head .close"}, {"sel": ".confirm,.liaison-modal", "open": "open", "modal": true, "close": ".close,.btn.ghost,[data-cancel]"}, {"sel": "#tsOrderSheet", "open": "show", "modal": true, "dialog": ".op-card", "close": ".op-x", "escape": false}, {"sel": ".pt-sheet,#tvPanel", "open": "show", "modal": true, "close": ".close,.pt-x,[aria-label=Close]"}, {"sel": ".scrim,.brief-scrim,.pt-scrim,#tvScrim", "open": ["open", "show"], "modal": false}, {"sel": ".patient-preview,.pt-pop,.bh-card,#tsInsPop,#fvPanel,#tsNet", "open": "show", "modal": false, "escape": false}]);

/* ════ pvx-app-links-js · was index.html line 1596 ════ */
/* n132: Grid and Forms links show only for the accounts those apps let in (keep in step with grid/index.html and forms/index.html ALLOWED) */
(function(){var OK={navGrid:["daniel.giordano@pravix.app"],navForms:["daniel.giordano@pravix.app"]};
function show(e){e=String(e||"").toLowerCase();Object.keys(OK).forEach(function(id){var a=document.getElementById(id);if(a)a.style.display=OK[id].indexOf(e)>-1?"":"none"})}
function fromStore(){try{if(!window.indexedDB||!indexedDB.databases)return;indexedDB.databases().then(function(l){if(!l.some(function(d){return d.name==="firebaseLocalStorageDb"}))return;var r=indexedDB.open("firebaseLocalStorageDb");r.onsuccess=function(){var db=r.result;try{if(!db.objectStoreNames.contains("firebaseLocalStorage")){db.close();return}var q=db.transaction("firebaseLocalStorage","readonly").objectStore("firebaseLocalStorage").getAll();q.onsuccess=function(){var e="";(q.result||[]).forEach(function(x){if(x&&String(x.fbase_key||"").indexOf("firebase:authUser:")===0&&x.value&&x.value.email)e=x.value.email});show(e);db.close()};q.onerror=function(){db.close()}}catch(_){try{db.close()}catch(__){}}}}).catch(function(){})}catch(_){}}
var hooked=false;function live(){if(hooked)return;try{if(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth){hooked=true;firebase.auth().onAuthStateChanged(function(u){if(u)show(u.email);else fromStore()})}}catch(_){}}
fromStore();live();window.addEventListener("load",function(){live();setTimeout(live,1500)})})();

/* ════ (anonymous) · was index.html line 1602 ════ */
/* ═══ Pravix shared top bar · n132 (audit RX-01, FL-07, DTA-S01, CL-X02, US-04) ═══
   The same nav.topnav lives in every app. This block makes it fit any width without collisions:
   · the brand and the Logout/theme group keep their real width (grid: max-content · 1fr · max-content) — nothing can slide under them;
   · the app links get the middle; the ones that do not fit move into a "More" menu (a real button with a menu of the same links),
     instead of being clipped inside a scroller with its scrollbar hidden. The active app always stays visible;
   · the More menu is keyboard-operable (Enter/Space, arrows, Escape, focus return) and closed state is display:none;
   · aria-current="page" follows the active link (apps that switch in place call pvxTopbar.setActive(id)). */
(function(){
  if(window.pvxTopbar) return;
  var nav=document.querySelector('nav.topnav'); if(!nav) return;
  var center=nav.querySelector('.nav-center'); if(!center) return;
  var more=document.createElement('div'); more.className='pvx-more'; more.hidden=true;
  more.innerHTML='<button type="button" class="nav-item pvx-more-btn" aria-haspopup="true" aria-expanded="false" aria-label="More apps" title="More apps">'
    +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>More</button>'
    +'<div class="pvx-more-menu" role="menu" aria-label="More apps" hidden></div>';
  center.appendChild(more); var btn=more.querySelector('button'), menu=more.querySelector('.pvx-more-menu');
  function items(){ return [].slice.call(center.querySelectorAll('.nav-item')).filter(function(a){ return a!==btn&&!a.classList.contains('pvx-more-btn'); }); }
  function shown(a){ return a.style.display!=='none'&&!a.hidden; }   /* account-gated links (Grid, Forms) are display:none until allowed */
  var gap=0, busy=false;
  function layout(){ if(busy) return; busy=true;
    try{ var ORD=['navDirectory','navAssets','navCurriculum','navSchedule','navFlow','navUltrasound','navTreatment','navRounds','navOR','navAnesia','navYakuri','navGrid','navForms'], all=items(), k=function(a){ var i=ORD.indexOf(a.id); return i<0?1000+all.indexOf(a):i; }; all=all.slice().sort(function(x,y){ return k(x)-k(y); });   /* n281: the apps keep the suite's order wherever they sit (the bar, More), whichever was current before */
      all.forEach(function(a){ center.insertBefore(a,more); a.removeAttribute('role'); });
      var vis=all.filter(shown); var PIN=['navGrid','navDirectory','navAssets','navUltrasound','navAnesia'];   /* PVX-N150: Grid always in More (unless it is the current app) · n281: Directory, Assets, Ultrasound and Anesia too (Daniel) */
      var pin=vis.filter(function(a){ return PIN.indexOf(a.id)>-1&&!(a.classList.contains('active')||a.getAttribute('aria-current')); }); vis=vis.filter(function(a){ return pin.indexOf(a)<0; });
      if(!vis.length&&!pin.length){ more.hidden=true; return; }
      gap=parseFloat(getComputedStyle(center).columnGap||getComputedStyle(center).gap)||0;
      more.hidden=true; var avail=center.clientWidth, w=vis.map(function(a){ return a.getBoundingClientRect().width; }), total=w.reduce(function(s,x){ return s+x; },0)+gap*(vis.length-1);
      if(!pin.length&&total<=avail+0.5){ menu.innerHTML=''; return; }
      more.hidden=false; var mw=more.getBoundingClientRect().width+gap, keep=0, used=0;
      for(var i=0;i<vis.length;i++){ if(used+w[i]+(i?gap:0)+mw<=avail){ used+=w[i]+(i?gap:0); keep++; } else break; }
      var active=vis.findIndex(function(a){ return a.classList.contains('active')||a.getAttribute('aria-current'); });
      if(active>=keep&&keep>0){ var a=vis.splice(active,1)[0]; vis.splice(keep-1,0,a); center.insertBefore(a,vis[keep]||more); }
      var hidden=vis.slice(keep).concat(pin); hidden.sort(function(x,y){ return all.indexOf(x)-all.indexOf(y); }); hidden.forEach(function(a){ menu.appendChild(a); a.setAttribute('role','menuitem'); });
      if(!hidden.length) more.hidden=true; }
    finally{ busy=false; } }
  function open(o){ var isOpen=!menu.hidden; if(o===undefined) o=!isOpen; if(o===isOpen) return; menu.hidden=!o; btn.setAttribute('aria-expanded',o?'true':'false');
    if(o){ var f=menu.querySelector('.nav-item'); if(f) f.focus(); } }
  btn.addEventListener('click',function(){ open(); });
  menu.addEventListener('keydown',function(e){ var f=[].slice.call(menu.querySelectorAll('.nav-item')), i=f.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){ e.preventDefault(); (f[i+1]||f[0]).focus(); } else if(e.key==='ArrowUp'){ e.preventDefault(); (f[i-1]||f[f.length-1]).focus(); }
    else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); open(false); btn.focus(); } else if(e.key==='Tab'){ open(false); } });
  btn.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ e.preventDefault(); open(true); } else if(e.key==='Escape'&&!menu.hidden){ e.preventDefault(); open(false); } });
  document.addEventListener('click',function(e){ if(!menu.hidden&&!more.contains(e.target)) open(false); },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!menu.hidden&&!more.contains(document.activeElement)) open(false); });
  function setActive(id){ items().forEach(function(a){ var on=a.id===id; a.classList.toggle('active',on); if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); }); layout(); }
  /* keep aria-current in step with the visual active class, for apps that switch in place */
  items().forEach(function(a){ if(a.classList.contains('active')) a.setAttribute('aria-current','page'); else if(a.getAttribute('aria-current')==='page'&&!a.classList.contains('active')) a.removeAttribute('aria-current'); });
  var t; function soon(){ clearTimeout(t); t=setTimeout(layout,60); }
  if(window.ResizeObserver){ new ResizeObserver(soon).observe(nav); } window.addEventListener('resize',soon);
  new MutationObserver(function(ms){ if(ms.some(function(m){ return !more.contains(m.target); })) soon(); }).observe(center,{attributes:true,subtree:true,attributeFilter:['style','class','hidden']});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(soon); window.addEventListener('load',soon); layout();
  window.pvxTopbar={layout:layout,setActive:setActive,version:'n132'};
})();

/* ════ pvx-n149-ts-js · was index.html line 1668 ════ */
(function(){ var LOBBY=['au733@vca.com'];
  function gate(on){ var el=document.getElementById('pvxTsLobby'), app=document.querySelector('.app');
    if(!on){ if(el){ el.remove(); if(app) app.removeAttribute('inert'); } return; }
    if(el) return; el=document.createElement('div'); el.id='pvxTsLobby'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','pvxTsLobbyT');
    el.innerHTML='<div class="tg-card"><b id="pvxTsLobbyT">This is the lobby screen account</b><span>Treatment Sheets needs your own Pravix account. Sign in with it on Flow, then come back to this page.</span><button type="button" id="pvxTsLobbyOwn">Sign in with my own account</button></div>';
    document.body.appendChild(el); if(app) app.setAttribute('inert','');
    document.getElementById('pvxTsLobbyOwn').onclick=function(){ try{ firebase.auth().signOut().then(function(){ location.href='https://shoreline.pravix.app/'; }); }catch(e){} };
    setTimeout(function(){ try{ document.getElementById('pvxTsLobbyOwn').focus(); }catch(e){} },60); }
  function hook(){ try{ if(!window.firebase||!firebase.apps||!firebase.apps.length||!firebase.auth) return false;
    firebase.auth().onAuthStateChanged(function(u){ gate(!!u&&LOBBY.indexOf(String(u.email||'').toLowerCase())>-1); }); return true; }catch(e){ return false; } }
  var n=0; (function tryHook(){ if(hook()) return; if(++n<60) setTimeout(tryHook,250); })();
})();

/* ════ pvx-n192-guard · was index.html line 1689 ════ */
/* PVX-N192 - a file or link dropped where nothing takes it does nothing (the page stays); text fields still take text */
(function(){
  function editable(t){ return t&&t.closest&&t.closest('input,textarea,[contenteditable]:not([contenteditable=false])'); }
  document.addEventListener('dragover',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='none'; });
  document.addEventListener('drop',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); });
})();

/* ════ (anonymous) · was index.html line 1699 ════ */
/* PVX-SEG (n215, shared) - single-choice segmented controls (HIG Segmented controls).
   pvxSeg(selector, {label, item, mode, isOn})
     mode 'radio' (default): a named radiogroup, the choice aria-checked, one Tab stop, arrows / Home / End move it
     mode 'tabs'           : the same as a tablist (the control switches a panel), aria-selected
     mode 'current'        : an app's section switcher: the open section is aria-current, nothing else changes
   The app keeps drawing the highlight with its own class (active, on, ...). The state is read from that class every time
   it changes, so what VoiceOver hears is always what is on screen. A group that is drawn again later is picked up too.
   Moving with the keyboard clicks the next segment, so the app's own handler does the work. */
(function(){
  if(window.pvxSeg) return;
  var REG=[], ON=/(^|\s)(active|on|is-on|is-active|sel|selected|current)(\s|$)/;
  function isOn(b,o){ return o.isOn?!!o.isOn(b):ON.test(typeof b.className==='string'?b.className:''); }
  function shown(b){ if(b.hidden) return false; var s=getComputedStyle(b); return s.display!=='none'&&s.visibility!=='hidden'; }
  function items(g,o){ return [].filter.call(g.querySelectorAll(o.item||'button'),function(b){ return b.closest(o.sel)===g&&shown(b); }); }
  function set(e,k,v){ if(e.getAttribute(k)!==v) e.setAttribute(k,v); }
  function sync(g,o){
    var it=items(g,o); if(!it.length) return;
    if(g.__pvxSegO!==o){ g.__pvxSegO=o;
      if(o.mode!=='current'){ g.setAttribute('role',o.mode==='tabs'?'tablist':'radiogroup'); g.addEventListener('keydown',key); }
      if(o.label&&!g.hasAttribute('aria-labelledby')) set(g,'aria-label',typeof o.label==='function'?o.label(g):o.label);
    }
    var cur=-1; for(var i=0;i<it.length;i++){ if(isOn(it[i],o)){ cur=i; break; } }
    it.forEach(function(b,i){ var s=i===cur;
      if(o.mode==='current'){ if(s) set(b,'aria-current','true'); else if(b.hasAttribute('aria-current')) b.removeAttribute('aria-current'); return; }
      set(b,'role',o.mode==='tabs'?'tab':'radio'); set(b,o.mode==='tabs'?'aria-selected':'aria-checked',String(s));
      if(b.hasAttribute('aria-pressed')) b.removeAttribute('aria-pressed');
      set(b,'tabindex',(s||(cur<0&&i===0))?'0':'-1');
    });
  }
  function ident(b){ return b.getAttribute('data-v')||b.getAttribute('data-s')||b.getAttribute('data-shift')||b.getAttribute('data-ctab')||b.getAttribute('data-tab')||b.getAttribute('data-mode')||b.id||b.textContent.trim(); }
  function key(e){
    var g=e.currentTarget, o=g.__pvxSegO; if(!o||e.altKey||e.metaKey||e.ctrlKey) return;
    var k=e.key, rtl=getComputedStyle(g).direction==='rtl', it=items(g,o).filter(function(b){ return !b.disabled&&b.getAttribute('aria-disabled')!=='true'; });
    var i=it.indexOf(document.activeElement); if(i<0) return;
    var fwd=rtl?'ArrowLeft':'ArrowRight', back=rtl?'ArrowRight':'ArrowLeft';
    var n=(k===fwd||k==='ArrowDown')?i+1:(k===back||k==='ArrowUp')?i-1:k==='Home'?0:k==='End'?it.length-1:null;
    if(n===null) return;
    e.preventDefault(); e.stopPropagation();
    var b=it[(n+it.length)%it.length], id=ident(b); b.focus(); b.click();
    /* the app may draw the group again: keep the keyboard on the same choice */
    requestAnimationFrame(function(){ scan(); if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest(o.sel)) return;
      var gs=document.querySelectorAll(o.sel); for(var j=0;j<gs.length;j++){ var m=items(gs[j],o).filter(function(x){ return ident(x)===id; })[0]; if(m){ m.focus(); return; } } });
  }
  var raf=0; function scan(){ raf=0; REG.forEach(function(o){ [].forEach.call(document.querySelectorAll(o.sel),function(g){ sync(g,o); }); }); }
  function later(){ if(!raf) raf=requestAnimationFrame(scan); }
  var obs=null;
  window.pvxSeg=function(sel,opts){ var o=Object.assign({sel:sel,mode:'radio'},opts||{}); REG.push(o);
    if(!obs&&document.body){ obs=pvxWatch(later,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']}); }
    [].forEach.call(document.querySelectorAll(sel),function(g){ sync(g,o); }); return o; };
  window.pvxSeg.sync=scan;
})();

/* ════ (anonymous) · was index.html line 1752 ════ */
/* PVX-N216 - Treatment's segmented controls, section switcher and iPhone tab bar */
(function(){
  pvxSeg('#clinSwitcher',{mode:'current',item:'.seg'});
  pvxSeg('#sbBoards',{mode:'tabs',item:'.sb-segb',label:'Boards'});
  pvxSeg('#sbView',{item:'.sb-segb',label:'Show as'});
  pvxSeg('.wl-seg',{label:'Whose patients'});
  pvxSeg('.wl-chips',{label:'Area'});
  /* iPhone: the boards as a pop-up, kept beside the (hidden) boards and in step with them */
  function boardsPop(){ var g=document.getElementById('sbBoards'); if(!g) return;
    var sel=g.previousElementSibling&&g.previousElementSibling.classList.contains('pvx-sbpop')?g.previousElementSibling:null;
    var bs=[].slice.call(g.querySelectorAll('.sb-segb'));
    if(!sel){ sel=document.createElement('select'); sel.className='pvx-sbpop'; sel.setAttribute('aria-label','Board'); g.parentNode.insertBefore(sel,g);
      sel.addEventListener('change',function(){ var b=document.querySelector('#sbBoards .sb-segb[data-board="'+sel.value+'"]'); if(b) b.click(); }); }
    var html=bs.map(function(b){ var n=b.querySelector('.sb-cnt'), name=(b.getAttribute('data-tip')||b.textContent).trim(), cnt=n?n.getAttribute('data-n'):'';
      return '<option value="'+b.getAttribute('data-board')+'"'+(b.classList.contains('on')?' selected':'')+'>'+name+(cnt!==''&&cnt!=null?' · '+cnt:'')+'</option>'; }).join('');
    if(sel.__h!==html){ sel.__h=html; sel.innerHTML=html; } }
  var raf=0; pvxWatch(function(){ if(!raf) raf=requestAnimationFrame(function(){ raf=0; boardsPop(); }); },{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  boardsPop();
  /* iPhone: the sections as a bottom tab bar with More */
  var sw=document.getElementById('clinSwitcher'); if(!sw) return;
  var MORE=['anes','timeline','charges','notes'], CW=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false};
  var more=document.createElement('button'); more.type='button'; more.className='pvx-tmore'; more.title='More'; more.setAttribute('aria-haspopup','menu'); more.setAttribute('aria-expanded','false');
  more.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>';
  sw.appendChild(more);
  var menu=document.createElement('div'); menu.className='pvx-tmenu'; menu.setAttribute('role','menu'); menu.setAttribute('aria-label','More sections'); menu.hidden=true; document.body.appendChild(menu);
  function label(){ var cur=sw.querySelector('.seg.active'), m=cur&&MORE.indexOf(cur.dataset.ctab)>=0;
    more.classList.toggle('on',!!m); more.setAttribute('aria-label',m?'More, '+cur.title+' open':'More');
    if(m) more.setAttribute('aria-current','true'); else more.removeAttribute('aria-current'); }
  function close(focus){ if(menu.hidden) return; menu.hidden=true; more.setAttribute('aria-expanded','false'); if(focus) more.focus(); }
  function open(){ menu.innerHTML=MORE.map(function(k){ var b=sw.querySelector('.seg[data-ctab="'+k+'"]'); if(!b) return '';
      return '<button type="button" role="menuitem" data-ctab="'+k+'"'+(b.classList.contains('active')?' aria-current="true"':'')+'>'+(b.querySelector('svg')||{}).outerHTML+'<span>'+b.title+'</span></button>'; }).join('');
    menu.hidden=false; more.setAttribute('aria-expanded','true'); var f=menu.querySelector('[aria-current]')||menu.querySelector('button'); if(f) f.focus(); }
  more.addEventListener('click',function(e){ e.stopPropagation(); if(menu.hidden) open(); else close(true); });
  menu.addEventListener('click',function(e){ var b=e.target.closest('[data-ctab]'); if(!b) return; close(false); var t=sw.querySelector('.seg[data-ctab="'+b.dataset.ctab+'"]'); if(t) t.click(); more.focus(); });
  menu.addEventListener('keydown',function(e){ var it=[].slice.call(menu.querySelectorAll('button')), i=it.indexOf(document.activeElement);
    if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(true); }
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); it[(i+(e.key==='ArrowDown'?1:-1)+it.length)%it.length].focus(); }
    else if(e.key==='Tab') close(false); });
  document.addEventListener('pointerdown',function(e){ if(!menu.hidden&&!menu.contains(e.target)&&!more.contains(e.target)) close(false); },true);
  function sync(){ document.documentElement.classList.toggle('pvx-ttab',!!CW.matches); if(!CW.matches) close(false); label(); }
  if(CW.addEventListener) CW.addEventListener('change',sync);
  new MutationObserver(label).observe(sw,{subtree:true,attributes:true,attributeFilter:['class']});
  sync();
})();

/* ════ pvx-n226-guard · was index.html line 1799 ════ */
/* PVX-N226 - Anesia's glass guard, shared on this device (same key): blur stays on only while the device keeps up. */
(function(){
  var KEY='anesia:v1:blur', root=document.documentElement;
  function get(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function set(v){ try{ localStorage.setItem(KEY,v); }catch(e){} }
  if(get()==='0'){ root.classList.add('pvx-noblur'); return; }
  var busy=false, rounds=0;
  function sample(){
    if(busy||root.classList.contains('pvx-noblur')||rounds>=6) return;
    busy=true; rounds++;
    var d=[], last=0, t0=0;
    requestAnimationFrame(function f(t){
      if(!t0){ t0=last=t; return requestAnimationFrame(f); }
      d.push(t-last); last=t;
      if(t-t0<1000) return requestAnimationFrame(f);
      busy=false;
      if(d.length>10 && d.filter(function(x){ return x>25; }).length/d.length>0.1){ root.classList.add('pvx-noblur'); set('0'); window.__pvxBlurOff={frames:d.length,at:Date.now()}; }
      else if(rounds>=3) set('1');
    });
  }
  window.addEventListener('scroll',sample,{passive:true,capture:true});
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('button,[role=button],summary,input')) sample(); },true);
  window.pvxGlass={sample:sample};
})();

/* ════ pvx-n227-a11y · was index.html line 1825 ════ */
/* PVX-N227 - an icon beside its label is decorative: VoiceOver reads the label, not "image". Icons that stand alone keep
   whatever name they have (their button's name). Runs on icons drawn later too. The shared top bar is left as it is. */
(function(){
  var SEL='svg:not([aria-hidden]):not([role]):not([aria-label]):not([aria-labelledby])';
  function fix(root){   /* n299: a root is the node that was added; the whole page only at boot */
    var top=document.getElementById('pvxTopnav')||document.querySelector('nav.topnav');
    var l=[].slice.call((root||document).querySelectorAll(SEL)); if(root&&root.matches&&root.matches(SEL)) l.unshift(root);
    for(var i=0;i<l.length;i++){
      var s=l[i]; if(top&&top.contains(s)) continue; if(s.querySelector('title')) continue;
      var host=s.closest('button,a,[role=button],[role=tab],[role=menuitem],[role=option],label,li,td,th,summary,.chip,.seg')||s.parentElement;
      if(!host) continue;
      var name=(host.getAttribute('aria-label')||host.getAttribute('title')||host.textContent||'').trim();
      if(name||s.getBoundingClientRect().width<=32) s.setAttribute('aria-hidden','true');
    }
  }
  var q=0, pend=[]; function soon(ms){ for(var i=0;i<ms.length;i++){ var a=ms[i].addedNodes; for(var j=0;j<a.length;j++) if(a[j].nodeType===1&&pend.indexOf(a[j])<0) pend.push(a[j]); }
    if(q) return; q=setTimeout(function(){ q=0; var roots=pend; pend=[]; if(roots.length>40) fix(); else roots.forEach(function(r){ if(r.isConnected) fix(r); }); },150); }
  function boot(){ fix(); pvxWatch(soon,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n230-ts · was index.html line 1845 ════ */
/* PVX-N230 - abnormal vitals say so (on screen and to VoiceOver); the compact header's Details; Vitals history in the toolbar */
(function(){
  var TRI='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 1.6 20.6h20.8z" fill="currentColor"/></svg>';
  var CIR='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>';
  var ES=(document.documentElement.lang||'').indexOf('es')===0;
  function word(c){ return c==='crit'?(ES?'Crítico':'Critical'):(ES?'Anormal':'Abnormal'); }
  function sev(el, c, host){
    if(!host) return;
    var cur=host.querySelector(':scope > .pvx-sev');
    if(cur&&cur.classList.contains(c)) return;
    if(cur) cur.remove();
    var s=document.createElement('span'); s.className='pvx-sev '+c; s.innerHTML=(c==='crit'?TRI:CIR)+word(c); host.appendChild(s);
    var t=el.getAttribute('title')||el.textContent.replace(/\s+/g,' ').trim();
    if(t&&!/critical|abnormal|crítico|anormal/i.test(el.getAttribute('aria-label')||'')){ el.setAttribute('aria-label', t+' — '+word(c).toLowerCase()); el.setAttribute('role','img'); }
  }
  function clean(el){ var x=el.querySelector('.pvx-sev'); if(x) x.remove(); }
  function vitals(){
    document.querySelectorAll('.tsh-vit').forEach(function(el){
      var c=el.classList.contains('crit')?'crit':el.classList.contains('warn')?'warn':'';
      if(c) sev(el,c,el); else clean(el);
    });
    document.querySelectorAll('.vx-now').forEach(function(el){
      var c=el.classList.contains('coral')?'crit':el.classList.contains('amber')?'warn':'';
      if(c) sev(el,c,el.querySelector('small')||el); else clean(el);
    });
  }
  var DOWN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var open=false;
  function header(){
    var h=document.getElementById('tsHdr'); if(!h) return;
    h.classList.toggle('pvx-open', open);
    var top=h.querySelector('.tsh-top'); if(!top) return;
    var b=top.querySelector('.pvx-hdr-more');
    if(!b){ b=document.createElement('button'); b.type='button'; b.className='pvx-hdr-more';
      b.addEventListener('click',function(){ open=!open; header(); }); top.appendChild(b); }
    var lbl=ES?'Detalles':'Details';   /* n268: the name stays; the chevron and aria-expanded say open or closed */
    var inf=h.querySelector('.tsh-info'); if(inf){ if(!inf.id) inf.id='tsHdrInfo'+(window.__pvxHdrN=(window.__pvxHdrN||0)+1); if(b.getAttribute('aria-controls')!==inf.id) b.setAttribute('aria-controls',inf.id); }
    if(b.getAttribute('aria-expanded')!==String(open)||b.textContent!==lbl){ b.setAttribute('aria-expanded',String(open)); b.innerHTML=lbl+DOWN; }
  }
  function vhist(){
    var f=document.querySelector('#ctab-vitals .v-footer'), hd=document.querySelector('#ctab-vitals .v-header');
    if(!f||!hd) return;
    var b=f.querySelector('button'); if(!b) return;
    b.classList.add('pvx-vhist'); var take=hd.querySelector('#vxTake');
    hd.insertBefore(b, take||null); f.style.display='none';
  }
  var q=0; function soon(){ if(q) return; q=setTimeout(function(){ q=0; try{ vitals(); header(); vhist(); }catch(e){} },60); }
  function boot(){ soon(); pvxWatch(soon,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n231-ts · was index.html line 1897 ════ */
/* PVX-N231 - the grid's section names in sentence case (their keys stay as they are in the orders) */
(function(){
  var K={'Basic Observation':'Observations','Patient Care':'Patient care','Continuous Infusions':'Infusions'};   /* n260: the section bar's names, everywhere */
  window.tsSecLabel=function(k){ return K[k]||k; };
  function fix(){
    document.querySelectorAll('.stitle, #flPop .fp-lab b, .ts-cat').forEach(function(e){
      var t=e.firstChild; if(t&&t.nodeType===3&&K[t.nodeValue]) t.nodeValue=K[t.nodeValue];
    });
  }
  var q=0; function soon(){ if(q) return; q=setTimeout(function(){ q=0; try{ fix(); }catch(e){} },40); }
  function boot(){ fix(); pvxWatch(soon,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n232-ts · was index.html line 1912 ════ */
/* PVX-N232 - Reduce Motion as a class too, so script-driven views can check it */
(function(){try{var m=matchMedia('(prefers-reduced-motion: reduce)');var f=function(){document.documentElement.classList.toggle('pvx-rm',m.matches)};f();m.addEventListener&&m.addEventListener('change',f)}catch(e){}})();

/* ════ pvx-n233-ts · was index.html line 1916 ════ */
/* PVX-N233 - required fields, dose units, Move to, view only, tooltips, rich copy */
(function(){
  var $=function(s,r){return (r||document).querySelector(s)};
  var num=function(v){v=String(v||'').replace(/[$,\s]/g,'');return /^-?\d+(\.\d+)?$/.test(v)?parseFloat(v):NaN};
  var wt=function(v){return /^\s*\d+(\.\d+)?\s*(kgs?|lbs?)?\s*$/i.test(String(v||''))};
  var say=function(el,msg){ if(window.tsFieldMsg) tsFieldMsg(el,msg); };
  /* 3-4. required fields: marked, the main button dims until they're in, and says what's missing in place */
  var FORMS=[
    {mark:'#nsName', btn:function(){return $('#tsModal .tm-foot .primary')}, req:['#nsName'], checks:[
      ['#nsName',function(v){return !!v.trim()},'Enter the patient’s name'],
      ['#nsWt',function(v){return !v.trim()||wt(v)},'Enter the weight as a number, like 12.4 kg or 27 lb']]},
    {mark:'#esLow', btn:function(){return $('#tsModal .tm-foot .primary')}, req:['#esLow','#esHigh'], checks:[
      ['#esLow',function(v){return num(v)>0},'Enter the low end, like 3,600'],
      ['#esHigh',function(v){return num(v)>0},'Enter the high end, like 4,500'],
      ['#esHigh',function(v){var l=num(($('#esLow')||{}).value);return !(num(v)>0&&l>0&&num(v)<l)},'Enter a high end that’s at least the low end'],
      ['#esCur',function(v){return !v.trim()||num(v)>=0},'Enter current charges as a number, like 1250'],   /* n261: was refused only on Save */
      ['#esDep',function(v){return !v.trim()||num(v)>=0},'Enter the deposit as a number, like 500']]},
    {mark:'#rxDose', btn:function(){return $('#tsModal .tm-foot .primary')}, req:['#rxDose'], checks:[
      ['#rxDose',function(v){return num(v)>0},'Enter the dose, like 1']]},
    {mark:'#flV', btn:function(){return $('#tsModal .tm-foot .primary')}, req:['#flV'], checks:[
      ['#flV',function(v){return num(v)>0},'Enter the rate, like 60']]},
    {mark:'#crV', btn:function(){return $('#tsModal .tm-foot .primary')}, req:['#crV'], checks:[
      ['#crV',function(v){return num(v)>0||num(($('#crM')||{}).value)>0},'Enter the dose, or the pump rate in mL/hr']]},
    {mark:'#tsAlIn', btn:function(){var b=[].slice.call(document.querySelectorAll('#tsModal .tm-foot button'));return b.filter(function(x){return /^Save$/.test(x.textContent.trim())})[0]}, req:['#tsAlIn'], checks:[
      ['#tsAlIn',function(v){return !!v.trim()},'Type the allergy and reaction, or choose No known allergies']]},
    {mark:'#note-body', root:'#noteDrawer', btn:function(){return $('#noteDrawer .btn.primary')}, req:['#note-body'], checks:[
      ['#note-body',function(v){return !!v.trim()},'Write the note first']]}
  ];
  function live(f){ var r=f.root?$(f.root):$('#tsModal'); if(!r) return null; var m=$(f.mark,r); if(!m) return null; if(f.root&&!r.classList.contains('open')&&!/open/.test(r.className)) return null; return r; }
  function first(f,r){ for(var i=0;i<f.checks.length;i++){ var c=f.checks[i], el=$(c[0],r); if(el&&!c[1](el.value||'')) return {el:el,msg:c[2]}; } return null; }
  function paint(f,r){ var b=f.btn(); if(!b) return; var bad=first(f,r); b.classList.toggle('pvx-dim',!!bad); if(bad) b.setAttribute('aria-disabled','true'); else b.removeAttribute('aria-disabled');
    f.req.forEach(function(q){ var el=$(q,r); el&&el.setAttribute('aria-required','true'); }); }
  function wire(f,r){ if(r._pvxReq===f.mark) return; r._pvxReq=f.mark; paint(f,r);
    r.addEventListener('input',function(){ if(live(f)) paint(f,r); });
    r.addEventListener('change',function(){ if(live(f)) paint(f,r); });
    f.checks.forEach(function(c){ var el=$(c[0],r); if(!el||el._pvxBlur) return; el._pvxBlur=1;
      el.addEventListener('blur',function(){ if(!live(f)) return; var v=el.value||''; if(!v.trim()) return;
        for(var i=0;i<f.checks.length;i++){ var k=f.checks[i]; if(k[0]===c[0]&&!k[1](v)){ say(el,k[2]); return; } } }); });
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button[aria-disabled="true"].pvx-dim'); if(!b) return;
    for(var i=0;i<FORMS.length;i++){ var f=FORMS[i], r=live(f); if(r&&f.btn()===b){ e.preventDefault(); e.stopImmediatePropagation(); var bad=first(f,r); if(bad){ say(bad.el,bad.msg); } return; } }
  },true);
  /* the charting drawer: dose / volume with their unit; Move to */
  function unitize(id){ var el=document.getElementById(id); if(!el||el.dataset.u||el.closest('.pvx-unitwrap')) return;
    var m=/^\s*(\d+(?:\.\d+)?)\s*([A-Za-zµμ%][\w\/µμ%.]*)\s*$/.exec(el.value||''); if(!m) return;
    el.value=m[1]; el.setAttribute('data-u',m[2]); el.setAttribute('inputmode','decimal');
    var w=document.createElement('span'); w.className='pvx-unitwrap'; el.parentNode.insertBefore(w,el); w.appendChild(el);
    var u=document.createElement('span'); u.className='cd-u'; u.textContent=m[2]; u.setAttribute('aria-hidden','true'); w.appendChild(u);
    var l=document.querySelector('label[for="'+id+'"]'); if(l&&!/\(/.test(l.textContent)) el.setAttribute('aria-label',l.textContent.trim()+', '+m[2]);
  }
  function hr(h){ return (h%12||12)+':00 '+(h<12?'AM':'PM'); }
  function moveRow(){ var body=document.getElementById('cd-body'); if(!body||body.querySelector('.cd-move')) return;
    var id=(typeof activeTaskId!=='undefined')?activeTaskId:null; if(!id||!window.tsMoveInfo) return; var inf=tsMoveInfo(id); if(!inf) return;
    var opts=inf.opts.filter(function(o){return o.why!=='same'}); if(!opts.length) return;
    var d=document.createElement('div'); d.className='cd-move';
    d.innerHTML='<label for="cd-mv">Move this '+(inf.med?'dose':'check')+' to</label><select id="cd-mv"><option value="">Keep at '+hr(inf.cur)+'</option>'+
      opts.map(function(o){ return '<option value="'+o.h+'"'+(o.why?' disabled':'')+'>'+hr(o.h)+(o.why?' — '+o.why.replace(/<[^>]+>/g,''):'')+'</option>'; }).join('')+'</select>';
    body.appendChild(d);
    d.querySelector('select').addEventListener('change',function(){ var v=this.value; if(v===''||!window.tsMoveTask) return; if(tsMoveTask(id,+v)){ try{ closeDrawers(); }catch(e){} try{ buildGrid(); }catch(e){} } });
  }
  function drawer(){ unitize('cd-dose'); unitize('cd-vol'); moveRow(); }
  /* view only, said up front */
  function viewOnly(){ var ro=false; try{ ro=window.tsCanChart?!tsCanChart():false; }catch(e){}
    var nm=$('.tsh .tsh-name'); if(!nm) return; var c=nm.querySelector('.pvx-vo');
    if(ro&&!c){ c=document.createElement('span'); c.className='pvx-vo'; c.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>View only'; c.title='Your role can read this sheet but not chart'; nm.appendChild(c); }
    if(!ro&&c) c.remove();
    document.body.classList.toggle('pvx-ro',ro);
  }
  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{
    FORMS.forEach(function(f){ var r=live(f); if(r) wire(f,r); }); drawer(); viewOnly();
  }catch(e){} },60); }
  function boot(){ tick(); pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.pvxSay=function(t){var e=document.getElementById('pvxSayLive');if(!e){e=document.createElement('div');e.id='pvxSayLive';e.className='pvx-sr';e.setAttribute('role','status');e.setAttribute('aria-live','polite');document.body.appendChild(e);}e.textContent='';setTimeout(function(){e.textContent=t},40);};
  /* 8. a clipped field shows its full text as a tooltip */
  document.addEventListener('mouseover',function(e){ var el=e.target; if(!el||!/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
    if(el.title&&!el.dataset.pvxTt) return; var clip=el.scrollWidth>el.clientWidth+2&&el.value;
    if(clip){ el.title=el.value; el.dataset.pvxTt='1'; } else if(el.dataset.pvxTt){ el.removeAttribute('title'); delete el.dataset.pvxTt; } },true);
  /* 15. Copy writes a table version too, so Word and Outlook keep the columns */
  window.pvxCopyRich=function(t){ try{ if(!window.ClipboardItem||!navigator.clipboard.write) return navigator.clipboard.writeText(t);
      var e=function(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
      var groups=String(t).split(/\n\s*\n/), h='<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:11pt">';
      groups.forEach(function(g){ var L=g.split('\n').filter(function(x){return x.trim()}); if(!L.length) return;
        h+='<p style="margin:10px 0 4px"><b>'+e(L[0])+'</b></p>';
        if(L.length>1){ h+='<table style="border-collapse:collapse">'+L.slice(1).map(function(l){ return '<tr>'+l.split(/\t| · /).map(function(c){ return '<td style="border:1px solid #ccc;padding:3px 8px">'+e(c.trim())+'</td>'; }).join('')+'</tr>'; }).join('')+'</table>'; } });
      h+='</div>';
      return navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([t],{type:'text/plain'}),'text/html':new Blob([h],{type:'text/html'})})]).catch(function(){ return navigator.clipboard.writeText(t); });
    }catch(err){ return navigator.clipboard.writeText(t); } };
})();

/* ════ pvx-n234-ts · was index.html line 2008 ════ */
(function(){
  var $=function(q){return document.querySelector(q)};
  function tm(t){ try{ return new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }
  /* 4.–6. a toast waits while the pointer or focus is on it; errors stay 8 s and can be dismissed */
  window.pvxToastLife=function(el,ms,closable,onEnd){
    var left=ms,t0=0,T=0,done=false;
    function kill(){ if(done) return; done=true; clearTimeout(T); try{ onEnd&&onEnd(); }catch(e){}
      if(!el.isConnected) return; el.style.opacity='0'; el.style.transform='translateY(8px)'; setTimeout(function(){ el.remove(); },300); }
    function bar(st){ var b=el.querySelector('.tu-bar'); if(b) b.style.animationPlayState=st; }
    function run(){ if(done) return; clearTimeout(T); t0=Date.now(); T=setTimeout(kill,left); bar('running'); }
    function hold(){ if(done) return; clearTimeout(T); left=Math.max(1500,left-(Date.now()-t0)); bar('paused'); }
    if(closable){ el.classList.add('pvx-tclose'); var x=document.createElement('button'); x.type='button'; x.className='pvx-tx'; x.setAttribute('aria-label','Dismiss');
      x.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'; x.onclick=kill; el.appendChild(x); }
    el.addEventListener('mouseenter',hold); el.addEventListener('mouseleave',run);
    el.addEventListener('focusin',hold); el.addEventListener('focusout',function(e){ if(!el.contains(e.relatedTarget)) run(); });
    /* n264 (HIG Multitasking): hidden, it waits; back on screen it stays at least 3 s more */
    function vis(){ if(done){ document.removeEventListener('visibilitychange',vis); return; } if(document.visibilityState==='hidden') hold(); else { left=Math.max(3000,left); run(); } }
    document.addEventListener('visibilitychange',vis);
    run(); if(document.visibilityState==='hidden') hold(); return kill;
  };
  /* 1.–2. offline: the browser's word, and the database's (serving from this computer's copy for 10 s) */
  var NET={cache:false,fcT:0,since:null,was:null};
  function off(){ return !navigator.onLine||NET.cache; }
  window.pvxNetState=function(){ return {offline:off(),since:NET.since}; };
  window.pvxNetWatch=function(q){ if(NET.q) return; NET.q=1; try{ q.onSnapshot({includeMetadataChanges:true},function(sn){ var fc=!!(sn&&sn.metadata&&sn.metadata.fromCache); clearTimeout(NET.fcT);
      if(fc){ NET.fcT=setTimeout(function(){ NET.cache=true; upd(); },10000); } else if(NET.cache){ NET.cache=false; upd(); } },function(){}); }catch(e){} };
  window.pvxTvLive=function(){ return off()?'<span class="tv-live off"><i></i>Offline — last updated '+tm(NET.since||Date.now())+'</span>':'<span class="tv-live"><i></i>Live · Updating</span>'; };
  var WIFI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5 12a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><path d="M12 19h.01"/><path d="M3 3l18 18"/></svg>';
  function paint(){
    var o=off(), nm=$('.tsh .tsh-name');
    if(nm){ var c=nm.querySelector('.pvx-off');
      if(o&&!c){ c=document.createElement('span'); c.className='pvx-off'; c.innerHTML=WIFI+'<span>Offline<span class="pvx-off-x"> — others’ charting isn’t reaching you</span></span>';
        c.title='This computer has lost its connection. Your charting is kept here and sends when it’s back, but changes from other computers can’t arrive until then.';
        c.setAttribute('aria-label','Offline. Other people’s charting isn’t reaching this computer.'); nm.appendChild(c); }
      if(!o&&c) c.remove(); }
    var tv=document.getElementById('tsTv');
    if(tv){ tv.classList.toggle('tv-stale',o); var l=tv.querySelector('.tv-live'); if(l){ var h=pvxTvLive(); if(l.outerHTML!==h) l.outerHTML=h; }
      var fl=tv.querySelector('.tv-foot-l'), tn=fl&&fl.lastChild; if(tn&&tn.nodeType===3){ var ft=o?'Not updating while offline · read-only':'Updates live · read-only'; if(tn.nodeValue!==ft) tn.nodeValue=ft; } }
    document.documentElement.classList.toggle('pvx-offline',o);
  }
  function upd(){ var o=off();
    if(o&&!NET.since) NET.since=Date.now(); if(!o) NET.since=null;
    if(NET.was!==null&&NET.was!==o&&window.pvxSay) pvxSay(o?'Offline. Other people’s charting isn’t reaching this computer.':'Back online.');
    NET.was=o; paint(); }
  window.addEventListener('online',upd); window.addEventListener('offline',upd);
  /* 11.–12. the TV in full screen: the button says what it does; buttons and pointer hide after 3 s still */
  var IT=0;
  function fsOn(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
  function idle(){ var tv=document.getElementById('tsTv'); clearTimeout(IT); if(!tv) return; tv.classList.remove('tv-idle');
    var ae=document.activeElement, kb=false; try{ kb=!!(ae&&tv.contains(ae)&&ae.matches(':focus-visible')); }catch(e){}
    if(fsOn()&&!kb) IT=setTimeout(function(){ tv.classList.add('tv-idle'); },3000); }
  function fsSync(){ var tv=document.getElementById('tsTv'); if(!tv) return; var b=document.getElementById('tvFsBtn'), f=fsOn();
    if(b){ var t=f?'Exit full screen':'Full screen'; if(b.textContent!==t) b.textContent=t; }
    if(tv.classList.contains('tv-fs')!==f) tv.classList.toggle('tv-fs',f); idle(); }
  document.addEventListener('fullscreenchange',fsSync); document.addEventListener('webkitfullscreenchange',fsSync);
  ['mousemove','pointerdown','touchstart','keydown'].forEach(function(ev){ document.addEventListener(ev,function(){ if(document.getElementById('tsTv')&&fsOn()) idle(); },{passive:true}); });
  /* 9. the import's button shows its progress and waits */
  window.pvxImpBusy=function(n,of){ var b=document.getElementById('stgImpBtn'); if(!b) return; var t=b.querySelector('.stg-imp-t'), i=b.querySelector('input');
    if(n==null){ b.classList.remove('busy'); b.removeAttribute('aria-disabled'); if(t) t.textContent='Import code list…'; if(i) i.disabled=false; return; }
    b.classList.add('busy'); b.setAttribute('aria-disabled','true'); if(i) i.disabled=true;
    if(t) t.textContent='Importing '+(+n).toLocaleString()+' of '+(+of).toLocaleString()+'…'; };
  document.addEventListener('keydown',function(e){ var b=e.target&&e.target.id==='stgImpBtn'?e.target:null; if(b&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); var i=b.querySelector('input'); i&&!i.disabled&&i.click(); } });
  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{ paint(); fsSync(); }catch(e){} },80); }
  function boot(){ upd(); pvxWatch(tick,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n235-ts · was index.html line 2076 ════ */
(function(){
  var de=document.documentElement;
  function h(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  /* 1. placeholders until the patient list's first real answer */
  if(!window.tsListReady){ de.classList.add('ts-loading'); setTimeout(function(){ if(!window.tsListReady) de.classList.add('ts-load-slow'); },10000); }
  window.pvxSkelRows=function(n,kind){ var w=[[38,22,30],[30,26,24],[42,18,28],[34,24,20]], r='';
    for(var i=0;i<n;i++){ var x=w[i%w.length]; r+='<div class="pvx-sk-row" aria-hidden="true"><i style="width:'+x[0]+'%"></i><i style="width:'+x[1]+'%"></i><i style="width:'+x[2]+'%"></i></div>'; }
    return '<div class="pvx-skel" role="status" aria-busy="true"><span class="pvx-sr">Loading the patient list…</span>'+r+'<div class="pvx-skel-slow">Still loading the patient list — check the connection.</div></div>'; };
  window.pvxListReady=function(){ de.classList.remove('ts-loading','ts-load-slow');
    try{ if(currentCTab==='dash'&&window.renderDash) renderDash(); }catch(e){}
    try{ if(currentCTab==='tasks'&&window.tsRenderTasks) tsRenderTasks(); }catch(e){} };
  /* the database's own word that its answer is current (an empty hospital never sends a second snapshot otherwise) */
  var w0=window.pvxNetWatch;
  window.pvxNetWatch=function(q){ if(w0) w0(q); if(window.__pvxReadyQ) return; window.__pvxReadyQ=1;
    try{ q.onSnapshot({includeMetadataChanges:true},function(sn){ if(sn&&!(sn.metadata&&sn.metadata.fromCache)&&!window.tsListReady){ window.tsListReady=true; pvxListReady(); } },function(){}); }catch(e){} };
  /* 2. the status bar follows the theme */
  function tc(){ var m=document.querySelector('meta[name=theme-color]'); if(!m||!document.body) return; var v=document.body.classList.contains('dark')?'#0D1730':'#FFFFFF'; /* n294: the colour of the top bar under it */ if(m.content!==v) m.content=v; }
  function tcBoot(){ tc(); try{ pvxWatch(tc,{attributes:true,attributeFilter:['class']}); }catch(e){} }
  if(document.body) tcBoot(); else document.addEventListener('DOMContentLoaded',tcBoot);
  /* 3. the app's own files on every device, so it opens with a slow or no connection */
  function sw(){ if(!('serviceWorker' in navigator)) return; if(navigator.webdriver&&!window.__pvxSwTest) return;
    navigator.serviceWorker.register('downtime-sw.js',{scope:'./'}).then(function(){ return navigator.serviceWorker.ready; }).then(function(r){
      var u=[location.href.split('#')[0]].concat(performance.getEntriesByType('resource').map(function(e){ return e.name; }).filter(function(e){ return e.indexOf(location.origin+'/treatment/')===0||/^https:\/\/www\.gstatic\.com\/firebasejs\//.test(e); }));
      var a=r.active||r.waiting||r.installing; a&&a.postMessage({type:'dt-cache',urls:u}); }).catch(function(){}); }
  window.addEventListener('load',function(){ setTimeout(sw,3000); });
  /* 4. opening a sheet: its header and grid at once, from the list's copy */
  window.pvxSheetSkel=function(id){ var L=(window.__tsStore&&__tsStore.sheets)||[], e=null; for(var i=0;i<L.length;i++) if(L[i]._id===id){ e=L[i]; break; }
    if(!e) return ''; var P=e.patient||{}, nm=((P.name||'')+' '+(P.last||'')).trim()||'Patient';
    try{ var ch=document.querySelector('#tsPatientChip .nm'); if(ch) ch.textContent=nm; }catch(x){}
    var O=e.orders||{}, secs={}, order=[];
    Object.keys(O).forEach(function(k){ var o=O[k]; if(!o||o.dc) return; var sc=o.section||'Other'; if(!secs[sc]){ secs[sc]=[]; order.push(sc); } secs[sc].push(o.name||''); });
    var rows='', n=0;
    order.forEach(function(sc){ if(n>=16) return; rows+='<div class="pvx-sk-sec">'+h(window.tsSecLabel?tsSecLabel(sc):sc)+'</div>';
      secs[sc].forEach(function(on){ if(n>=16) return; n++; rows+='<div class="pvx-sk-or"><span>'+h(on)+'</span><span class="pvx-sk-bar" aria-hidden="true"></span></div>'; }); });
    var sig=[P.species,P.breed,P.sex,P.age].filter(Boolean).join(' · ');
    var facts=[['Weight',P.weight?P.weight+' kg':'—'],['Doctor',P.doctor||'—'],['Location',P.location||'—'],['Code',P.code||'—'],['Allergies',P.allergies||'Not recorded']];
    return '<div class="pvx-sksheet" role="status" aria-busy="true"><span class="pvx-sr">Opening '+h(nm)+'’s sheet…</span>'+
      '<div class="pvx-sk-name">'+h(nm)+'</div><div class="pvx-sk-sig">'+h(sig)+'</div>'+
      '<div class="pvx-sk-facts">'+facts.map(function(f){ return '<span><small>'+h(f[0])+'</small><b>'+h(f[1])+'</b></span>'; }).join('')+'</div>'+
      '<div class="pvx-sk-grid" aria-hidden="true">'+rows+'</div></div>'; };
  /* 6. sign in here, on Flow's own sign-in card (same markup, same styles, same behaviour), then the sheet you asked for */
  var LOCK='<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';
  var MAIL='<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="3"></rect><path d="m5.5 8 6.5 5 6.5-5"></path></svg>';
  var EYE='<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
  window.pvxSignInHTML=function(){ return '<div id="sbLogin" role="dialog" aria-modal="true" aria-label="Sign in to Pravix"><div class="login-wrap"><form class="card" id="sbLoginForm" novalidate>'+
      '<div class="brand"><img class="pravix-logo-img logo-lite" src="/assets/img/pravix-logo-lite.png" alt="Pravix"><img class="pravix-logo-img logo-drk" src="/assets/img/pravix-logo-drk.png" alt="Pravix"><div class="product">Shoreline Treatment Sheets</div><div class="secure-line">'+LOCK+'Secure sign in</div></div>'+
      '<div class="heading"><h1>Sign in to Pravix</h1><p id="sbLead">Hospital staff only. Sign in with your own account.</p></div>'+
      '<div class="form-stack"><label class="field-label" for="sbEmail">Email</label><div class="field"><div class="lock-icon" aria-hidden="true">'+MAIL+'</div><input id="sbEmail" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="name@vca.com" /></div>'+
      '<label class="field-label" for="sbPass" style="margin-top:10px">Password</label><div class="field"><div class="lock-icon" aria-hidden="true">'+LOCK+'</div><input id="sbPass" type="password" autocomplete="current-password" placeholder="Enter password" /><button class="reveal" id="sbReveal" type="button" aria-label="Show password">'+EYE+'</button></div>'+
      '<div class="caps-hint" id="sbCaps">Caps Lock is on</div><div class="error" id="sbErr" role="alert"></div>'+
      '<button type="button" id="sbForgot" style="display:block;margin:2px auto 12px;background:none;border:none;color:var(--accent);font:inherit;font-size:0.75rem;font-weight:600;cursor:pointer;">Forgot password?</button>'+
      '<button class="continue is-inactive" id="sbBtn" type="submit">Sign in</button></div></form>'+
      '<div class="page-foot"><b>VCA Shoreline</b> · Protected Pravix Workspace</div></div></div>'; };
  function why(c){ return c==='auth/wrong-password'||c==='auth/invalid-credential'||c==='auth/user-not-found'||c==='auth/invalid-login-credentials'||c==='auth/invalid-email'?'Incorrect email or password. Please try again.':
      c==='auth/too-many-requests'?'Too many tries. Wait a minute and try again.':c==='auth/user-disabled'?'This account is turned off. Ask an admin to turn it back on.':'Connection problem. Try again.'; }
  function lock(on){ document.body.classList.toggle('sb-locked',on); [].forEach.call(document.body.children,function(el){ if(el.id==='tsGate'||el.id==='toastWrap'||el.tagName==='SCRIPT') return; try{ on?el.setAttribute('inert',''):el.removeAttribute('inert'); }catch(x){} }); }
  window.pvxSignInWire=function(root){ var ov=root&&root.querySelector('#sbLogin'); if(!ov||ov._w) return; ov._w=1; root.classList.add('pvx-flow-login'); lock(true);
    var form=ov.querySelector('#sbLoginForm'), email=ov.querySelector('#sbEmail'), password=ov.querySelector('#sbPass'), reveal=ov.querySelector('#sbReveal'), btn=ov.querySelector('#sbBtn'),
        error=ov.querySelector('#sbErr'), card=ov.querySelector('.card'), capsHint=ov.querySelector('#sbCaps'), emailField=email.closest('.field'), passwordField=password.closest('.field');
    function updateButtonState(){ var ready=email.value.trim()&&password.value.trim(); btn.classList.toggle('is-inactive',!ready); }
    function shake(f){ f.classList.remove('error-shake'); void f.offsetWidth; f.classList.add('error-shake'); }
    reveal.addEventListener('click',function(){ var showing=password.type==='text'; password.type=showing?'password':'text'; reveal.setAttribute('aria-label',showing?'Show password':'Hide password'); password.focus(); });
    [email,password].forEach(function(el){ el.addEventListener('input',function(){ if(error.textContent) error.textContent=''; updateButtonState(); }); });
    ov.querySelector('#sbForgot').addEventListener('click',function(){ var f=this, em=email.value.trim();
      if(!em){ error.textContent='Enter your email above, then choose Forgot password.'; shake(emailField); email.focus(); return; }
      if(!(window.firebase&&firebase.auth)) return; f.disabled=true;
      firebase.auth().sendPasswordResetEmail(em).then(function(){ error.textContent='Reset link sent to '+em+'. Check your inbox and spam.'; },function(){ error.textContent='Could not send a reset email — check the address and try again.'; }).then(function(){ f.disabled=false; }); });
    function capsCheck(e){ if(typeof e.getModifierState==='function') capsHint.classList.toggle('show',e.getModifierState('CapsLock')); }
    password.addEventListener('keydown',capsCheck); password.addEventListener('keyup',capsCheck); password.addEventListener('blur',function(){ capsHint.classList.remove('show'); });
    email.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); password.focus(); } });
    password.addEventListener('keydown',function(e){ if(e.key==='Enter'&&email.value.trim()&&password.value.trim()){ e.preventDefault(); form.requestSubmit(); } });
    [emailField,passwordField].forEach(function(f){ f.addEventListener('animationend',function(){ f.classList.remove('error-shake'); }); });
    card.addEventListener('pointermove',function(e){ var r=card.getBoundingClientRect(); card.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%'); card.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%'); });
    card.addEventListener('pointerleave',function(){ card.style.setProperty('--mx','50%'); card.style.setProperty('--my','18%'); });
    form.addEventListener('submit',function(e){ e.preventDefault();
      if(!email.value.trim()){ error.textContent='Enter your email address.'; shake(emailField); email.focus(); return; }
      if(!password.value.trim()){ error.textContent='Enter your password.'; shake(passwordField); password.focus(); return; }
      if(!(window.firebase&&firebase.auth)){ error.textContent='Connection problem. Try again.'; return; }
      error.textContent=''; btn.disabled=true; btn.classList.remove('signed'); btn.innerHTML='Signing in <span class="signin-progress" aria-hidden="true"></span>';
      firebase.auth().signInWithEmailAndPassword(email.value.trim(),password.value).catch(function(err){
        error.textContent=why(err&&err.code); shake(passwordField); btn.disabled=false; btn.classList.remove('signed'); btn.textContent='Sign in';
        try{ password.select(); }catch(x){} updateButtonState(); }); });
    updateButtonState(); setTimeout(function(){ try{ email.focus(); }catch(x){} },250); };
  /* Flow's finish: "Signed in ✓", the card fades, then the sheet */
  window.pvxSignInDone=function(se){ var ov=se&&se.querySelector('#sbLogin');
    if(!ov||!se.classList.contains('show')){ se&&se.classList.remove('show'); if(document.body.classList.contains('sb-locked')) lock(false); return; }
    var btn=ov.querySelector('#sbBtn'), wrap=ov.querySelector('.login-wrap');
    if(btn){ btn.disabled=true; btn.classList.add('signed'); btn.innerHTML='Signed in <span class="checkmark" aria-hidden="true"></span>'; }
    if(wrap) wrap.classList.add('success');
    setTimeout(function(){ se.classList.remove('show','pvx-flow-login'); se.innerHTML=''; lock(false); },480); };
})();

/* ════ pvx-n236-ts · was index.html line 2169 ════ */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  var XS='<svg class="pvx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){ return null; } }
  /* 1.–2. the doctor's alert: by urgency, and the sound setting */
  window.pvxAlertSound=function(on){ if(on===undefined) return ls('pvxAlertSound')!=='0'; ls('pvxAlertSound',on?'1':'0'); return on; };
  function tone(f,g,d){ if(!pvxAlertSound()) return; try{ var A=window.AudioContext||window.webkitAudioContext, a=new A(), o=a.createOscillator(), n=a.createGain();
    o.frequency.value=f; n.gain.value=g; o.connect(n); n.connect(a.destination); o.start(); o.stop(a.currentTime+d); setTimeout(function(){ try{ a.close(); }catch(e){} },(d+.3)*1000); }catch(e){} }
  window.pvxDocAlertLife=function(n,crit,quiet){
    if(crit){ if(quiet) return;   /* n262: alerts already seen don't sound again when Treatment reopens */
      tone(880,.04,.18); var rt=setTimeout(function(){ if(n.isConnected) tone(660,.02,.14); },120000); return; }
    var left=15000, last=Date.now();
    var iv=setInterval(function(){ if(!n.isConnected){ clearInterval(iv); return; } var now=Date.now();
      if(document.visibilityState==='visible'&&!n.matches(':hover')&&!n.contains(document.activeElement)) left-=now-last; last=now;
      if(left<=0){ clearInterval(iv); n.classList.add('fade'); setTimeout(function(){ n.remove(); },400); } },250); };
  /* the Alert sound row in Settings */
  function stgSound(){ var L=$('#tsOrderSheet .op-card.stg .stg-list'); if(!L||$('#pvxStgSound',L)) return; var on=pvxAlertSound();
    var r=document.createElement('div'); r.className='stg-row'; r.id='pvxStgSound';
    r.innerHTML='<div class="stg-tx"><b>Alert sound</b><small>A tone when a critical alert on your patients arrives, and a softer reminder after 2 minutes if it’s still open.</small></div><div class="stg-ctl"><button type="button" class="v-sw" role="switch" aria-label="Alert sound" aria-checked="'+on+'"><i></i></button></div>';
    r.querySelector('button').onclick=function(){ pvxAlertSound(!pvxAlertSound()); r.remove(); stgSound(); try{ toast(pvxAlertSound()?'Alert sound on':'Alert sound off'); }catch(e){} };
    L.insertBefore(r,L.children[1]||null); }
  /* the same setting where the alerts are: the alert pill's menu (Settings is for admins only) */
  function amSound(){ var m=$('#tsAlertMenu'); if(!m||$('#pvxAmSound',m)) return; var on=pvxAlertSound();
    var r=document.createElement('div'); r.className='ts-am-foot'; r.id='pvxAmSound';
    r.innerHTML='<span><b>Alert sound</b> · on this computer</span><button type="button" class="v-sw" role="switch" aria-label="Alert sound on this computer" aria-checked="'+on+'"><i></i></button>';
    r.querySelector('button').onclick=function(e){ e.stopPropagation(); pvxAlertSound(!pvxAlertSound()); r.remove(); amSound(); try{ toast(pvxAlertSound()?'Alert sound on':'Alert sound off'); }catch(x){} };
    m.appendChild(r); }
  /* 5. a report opened from Settings can go back to Settings */
  var fromStg=false;
  document.addEventListener('click',function(e){ var t=e.target.closest&&e.target.closest('#tsOrderSheet .op-card.stg [data-stg]'); if(t) fromStg=true; },true);
  function stgBack(){ var sh=$('#tsOrderSheet'); if(!sh||!sh.classList.contains('show')){ fromStg=false; return; }
    var c=$('.op-card',sh); if(!c||c.classList.contains('stg')||!fromStg) return; var hd=$('.op-head',c); if(!hd||$('.op-back',hd)) return;
    var b=document.createElement('button'); b.type='button'; b.className='op-back'; b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Settings';
    b.setAttribute('aria-label','Back to Settings'); b.onclick=function(){ try{ tsSettingsOpen(); }catch(x){} };
    var first=hd.firstElementChild; (first&&first.tagName==='DIV'?first:hd).insertBefore(b,(first&&first.tagName==='DIV'?first.firstChild:first)); }
  /* 3.–4. & 7. forms: what's typed, discard prompts, drafts */
  function fields(c){ return $$('input[id],select[id],textarea[id]',c).filter(function(f){ return f.type!=='hidden'&&f.type!=='file'&&f.type!=='checkbox'&&f.type!=='radio'; }); }
  function vals(c){ var o={}; fields(c).forEach(function(f){ o[f.id]=f.value; }); return o; }
  var SNAP=new WeakMap();
  function dirty(c){ var a=SNAP.get(c); if(!a) return false; var b=vals(c); return Object.keys(b).some(function(k){ return a[k]!==undefined&&a[k]!==b[k]; }); }
  function sheetId(){ try{ return (window.__tsStore&&__tsStore.cur)||'none'; }catch(e){ return 'none'; } }
  function formKey(c){ if(c.id==='noteDrawer') return 'note:'+sheetId();
    if(c.id==='completionDrawer') return 'cd:'+sheetId()+':'+(typeof activeTaskId!=='undefined'?activeTaskId:'');
    var h=$('h3',c); var t=h?h.textContent.replace(/\s+/g,' ').replace(/Changing$/,'').trim():''; if(!t) return null;
    return /^New treatment sheet/.test(t)?'ns':'tm:'+sheetId()+':'+t; }
  var DAY=12*3600*1000;
  function draftGet(k){ try{ var d=JSON.parse(ls('pvxDraft:'+k)||'null'); if(!d||Date.now()-d.at>DAY){ ls('pvxDraft:'+k,null); return null; } return d; }catch(e){ return null; } }
  function draftPut(k,v){ ls('pvxDraft:'+k,JSON.stringify({at:Date.now(),v:v})); }
  function draftDrop(k){ if(k) ls('pvxDraft:'+k,null); }
  window.pvxDraftsClear=function(){ try{ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('pvxDraft:')===0) localStorage.removeItem(k); }); }catch(e){} };
  function card(){ var m=$('#tsModal.show .tm-card'); return m; }
  function openC(){ var m=card(); if(m&&fields(m).length) return m; var d=$('#completionDrawer.open'); if(d) return d; var n=$('#noteDrawer.open'); return n||null; }
  function sess(c){ return c.classList.contains('drawer')?(c.id+':'+(typeof activeTaskId!=='undefined'?activeTaskId:'')+':'+sheetId()):'m'; }
  function arm(c){ if(!c) return; var k=sess(c); if(c._pvxSess===k) return; c._pvxSess=k; SNAP.delete(c); c._pvxKey=null; c._pvxSnap0=vals(c); c._pvxEarly=false;
    setTimeout(function(){ if(!c.isConnected||c._pvxSess!==k) return; SNAP.set(c,c._pvxEarly?c._pvxSnap0:vals(c)); c._pvxKey=formKey(c);
      var d=c._pvxKey&&draftGet(c._pvxKey);
      if(d){ var n=0; Object.keys(d.v).forEach(function(id){ var f=document.getElementById(id); if(f&&c.contains(f)&&f.value!==d.v[id]){ f.value=d.v[id]; f.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('change',{bubbles:true})); n++; } });
        if(n){ try{ toast('Draft restored'); }catch(e){} } }
      if(c._pvxL) return; c._pvxL=1;
      var T=0; c.addEventListener('input',function(){ clearTimeout(T); T=setTimeout(function(){ if(!c._pvxKey) return; if(dirty(c)){ var a=SNAP.get(c), b=vals(c), o={}; Object.keys(b).forEach(function(k){ if(a[k]!==b[k]) o[k]=b[k]; }); draftPut(c._pvxKey,o); } else draftDrop(c._pvxKey); },400); },true);
      c.addEventListener('change',function(){ c.dispatchEvent(new Event('input',{bubbles:true})); },true);
    },600); }
  /* n264: typing before the starting copy is taken counts as typing */
  document.addEventListener('input',function(e){ if(!e.isTrusted||!e.target.closest) return; var c=e.target.closest('.tm-card,.drawer'); if(c&&c._pvxSess&&!SNAP.has(c)) c._pvxEarly=true; },true);
  /* saving clears the draft */
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#tsModal [data-ok], #completionDrawer .btn.primary, #noteDrawer .btn.primary'); if(!b) return;
    var c=b.closest('.tm-card')||b.closest('.drawer'); if(!c) return; var k=c._pvxKey;
    setTimeout(function(){ var gone=c.closest('#tsModal')?!c.closest('#tsModal').classList.contains('show')||!c.isConnected:!c.classList.contains('open'); if(gone) draftDrop(k); },700); },true);
  function wording(c){ if(c.id==='completionDrawer') return 'Discard what you typed?'; var h=($('h3',c)||{}).textContent||'';
    if(/New treatment sheet/.test(h)) return 'Discard this new sheet?'; if(/estimate/i.test(h)) return 'Discard this estimate?'; if($('#rxDose,#flV,#crV',c)) return 'Discard this order?'; return 'Discard your changes?'; }
  var justAsked=false;
  function ask(c,closeFn){ justAsked=true; setTimeout(function(){ justAsked=false; },0); if($('.pvx-discard',c)){ $('.pvx-discard [data-keep]',c).focus(); return; }
    var d=document.createElement('div'); d.className='pvx-discard'; d.setAttribute('role','alertdialog'); d.setAttribute('aria-label',wording(c));
    d.innerHTML='<b>'+esc(wording(c))+'</b><button type="button" data-keep>Keep editing</button><button type="button" class="danger" data-discard>Discard</button>';
    var foot=$('.tm-foot',c); if(foot) foot.parentNode.insertBefore(d,foot); else ($('#cd-body',c)||c).appendChild(d);
    d.querySelector('[data-keep]').onclick=function(){ d.remove(); var f=fields(c)[0]; f&&f.focus(); };
    d.querySelector('[data-discard]').onclick=function(){ draftDrop(c._pvxKey); SNAP.delete(c); d.remove(); closeFn(); };
    try{ d.scrollIntoView({block:'nearest'}); }catch(e){} d.querySelector('[data-keep]').focus(); }
  function closeModal_(){ var m=$('#tsModal'); m&&m.classList.remove('show'); }
  function closeDrawer_(){ try{ closeDrawers(); }catch(e){ var d=$('#completionDrawer'); d&&d.classList.remove('open'); } }
  function guard(e){ var c=openC(); if(!c||c.id==='noteDrawer'||!dirty(c)) return false;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); ask(c, c.id==='completionDrawer'?closeDrawer_:closeModal_); return true; }
  var lastEsc=-1;
  window.addEventListener('keydown',function(e){ if(e.key!=='Escape') return; if(!e.isTrusted||e.timeStamp===lastEsc){ if(openC()&&$('.pvx-discard',openC())){ e.preventDefault(); e.stopImmediatePropagation(); } return; } lastEsc=e.timeStamp; var c=openC(); if(!c) return;
    var d=$('.pvx-discard',c); if(d&&justAsked){ e.preventDefault(); e.stopImmediatePropagation(); return; } if(d){ e.preventDefault(); e.stopImmediatePropagation(); d.remove(); var f=fields(c)[0]; f&&f.focus(); return; }
    guard(e); },true);
  document.addEventListener('click',function(e){ var t=e.target; if(!t.closest) return;
    var hit=t.closest('#tsModal .tm-scrim, #tsModal [data-x], #completionDrawer .drawer-head .close, #scrim, .scrim.show, .scrim.open');
    if(!hit) return; if(hit.matches('#scrim, .scrim.show, .scrim.open')&&!$('#completionDrawer.open')) return;
    guard(e); },true);
  /* 6. Treatment's own "say them all" microphone stops when the page is hidden; what was heard is applied */
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'){ var m=$('#btMic.on'); if(m&&window.tsBtMic) try{ tsBtMic(); }catch(e){} } });
  /* sign-out clears drafts (the sign-in card appears) */
  var w0=window.pvxSignInWire; window.pvxSignInWire=function(root){ pvxDraftsClear(); return w0&&w0(root); };
  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{ $$('.drawer').forEach(function(d){ if(!d.classList.contains('open')){ d._pvxSess=null; var x=$('.pvx-discard',d); x&&x.remove(); } }); var c=openC(); if(c) arm(c); stgSound(); amSound(); stgBack(); }catch(e){} },60); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n237-ts · was index.html line 2270 ════ */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  var XS='<svg class="pvx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent);
  function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fold(x){ return (window.tsFold||function(v){ return String(v).toLowerCase(); })(String(x||'')); }
  function F(){ return window.__tsFind; }

  /* ---------- printing ---------- */
  var SHEET_TABS={sheet:1,vitals:1,timeline:1,charges:1,notes:1,anes:1,anesthesia:1};
  function kind(){ var t=(typeof currentCTab!=='undefined')?currentCTab:''; var f=F(); var cur=f&&f.cur();
    if(t==='tasks'&&window.pvxPrintTasks) return 'tasks';   /* n265 */
    return cur&&SHEET_TABS[t]?'sheet':(cur&&t!=='dash'&&t!=='tasks'?'sheet':'board'); }
  window.tsPrintSheet=function(){ if(window.__tsPrintLive&&!__tsPrintLive('sheet')) try{ toast('Open a sheet to print it'); }catch(e){} };
  window.tsPrintBoard=function(){ window.__tsPrintLive&&__tsPrintLive('board'); };
  window.tsPrintItem=function(){ var ok=window.tsPrintReady&&tsPrintReady(), key=matchMedia('(hover:hover)').matches?(MAC?' · ⌘P':' · Ctrl+P'):'';
    return '<div class="ts-cm-sep" role="separator"></div><button type="button" role="menuitem" data-c="print"'+(ok?'':' aria-disabled="true" disabled')+'><b>Print…</b><small>'+(ok?'This sheet, '+(window.pvxPrintDay?pvxPrintDay():'today')+key:'Available once the sheet has loaded')+'</small></button>'; };
  /* ⌘P stays the browser's: when printing starts, a paper version of what's open is put in place */
  window.addEventListener('beforeprint',function(){ if(document.documentElement.classList.contains('dt-printing')||!window.__tsPrintLive) return;
    var k=kind(); if(k==='tasks'){ try{ if(pvxPrintTasks(true)) return; }catch(e){ console.warn('[print]',e); } k='board'; }
    if(k==='sheet'&&!(window.tsPrintReady&&tsPrintReady())) k='board'; try{ __tsPrintLive(k,true); }catch(e){ console.warn('[print]',e); } });

  /* ---------- the finder ---------- */
  var recent=[], lastCur=null, rows=[], idx=0, shown=false;
  function trackRecent(){ var f=F(); if(!f) return; var c=f.cur(); if(c&&c!==lastCur){ lastCur=c; recent=recent.filter(function(x){ return x!==c; }); recent.unshift(c); recent.length=Math.min(recent.length,5); } if(!c) lastCur=null; }
  function sheetById(id){ return (F().all()||[]).filter(function(e){ return e._id===id; })[0]; }
  function nm(e){ var t=e.patient||{}; return ((t.name||'')+' '+(t.last||'')).trim()||'Unnamed'; }
  function sub(e){ var t=e.patient||{}, b=F().bo(e); return [/OP/.test(b)?'OP':'IP',t.location,t.reason||t.problem].filter(Boolean).join(' · '); }
  function med(e){ var t=e.patient||{}; try{ return window.pvxMed?pvxMed(t.name,t.species,{code:1}):''; }catch(x){ return ''; } }
  function norm(x){ return String(x||'').toLowerCase().replace(/^dr\.?\s+/,'').replace(/\s+/g,' ').trim(); }
  function mine(){ var me=F().me()||{}, n=norm(me.name); if(!n) return [];
    return (F().all()||[]).filter(function(e){ var t=e.patient||{}; return norm(t.doctor)===n||norm(t.tech)===n; }); }
  function oLine(o){ var bits=[]; if(o.dose!=null&&o.dose!=='') bits.push(o.dose+(o.unit?' '+o.unit:'')); else if(o.unit&&o.type!=='obs') bits.push(o.unit);
    if(o.route) bits.push(o.route); if(o.rate) bits.push(o.rate); if(o.freq) bits.push(o.freq); return bits.join(' '); }
  function orderHits(q){ var w=fold(q).split(/\s+/).filter(Boolean), out=[]; if(!w.length) return out;
    (F().all()||[]).forEach(function(e){ var os=e.orders||{}; Object.keys(os).forEach(function(k){ var o=os[k]; if(!o||o.dc||o.draft||!o.name) return;
      var h=fold(o.name); if(w.every(function(x){ return h.indexOf(x)>-1; })) out.push({s:e,o:o}); }); });
    out.sort(function(a,b){ var x=fold(a.o.name).indexOf(w[0])===0?0:1, y=fold(b.o.name).indexOf(w[0])===0?0:1; return x-y||nm(a.s).localeCompare(nm(b.s)); });
    return out; }
  var OIC='<span class="ts-fo-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7Z"/><path d="m8.5 8.5 7 7"/></svg></span>';
  function pRow(e,i){ var cur=F().cur(); return '<button type="button" class="mi'+(i===idx?' cur':'')+(e._id===cur?' open':'')+'" role="option" id="tsFindO'+i+'" aria-selected="'+(i===idx)+'" data-open="'+esc(e._id)+'">'+med(e)+'<span class="tx"><b>'+esc(nm(e))+'</b><small>'+esc(sub(e))+'</small></span></button>'; }
  function oRow(h,i){ return '<button type="button" class="mi ord'+(i===idx?' cur':'')+'" role="option" id="tsFindO'+i+'" aria-selected="'+(i===idx)+'" data-open="'+esc(h.s._id)+'" data-order="'+esc(h.o.id)+'">'+OIC+'<span class="tx"><b>'+esc(h.o.name)+'</b><small>'+esc(nm(h.s)+' · '+oLine(h.o))+'</small></span></button>'; }
  /* n265 (HIG Searching: corrections): close matches when nothing matches exactly — one letter off for short words, two for long ones */
  function osa(a,b){ var m=a.length,n=b.length,i,j; if(Math.abs(m-n)>2) return 9; var d=[]; for(i=0;i<=m;i++) d[i]=[i]; for(j=0;j<=n;j++) d[0][j]=j;
    for(i=1;i<=m;i++) for(j=1;j<=n;j++){ var c=a[i-1]===b[j-1]?0:1; d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c); if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1); } return d[m][n]; }
  function near(w,ws){ var lim=w.length<4?0:w.length<6?1:2; return ws.some(function(x){ if(!x) return false; if(x.indexOf(w)===0) return true; if(!lim) return false; return osa(w,x)<=lim||(x.length>w.length&&osa(w,x.slice(0,w.length))<=lim); }); }
  function closeMatches(q){ var w=fold(q).split(/\s+/).filter(Boolean), p=[], o=[]; if(!w.length||w.join('').length<4) return {p:p,o:o};
    (F().all()||[]).forEach(function(e){ var t=e.patient||{}; var ws=fold([t.name,t.last,t.location,t.doctor,t.tech,t.breed,t.problem,t.reason].filter(Boolean).join(' ')).split(/[\s,·]+/);
      if(w.every(function(x){ return near(x,ws); })) p.push(e);
      var os=e.orders||{}; Object.keys(os).forEach(function(k){ var r=os[k]; if(!r||r.dc||r.draft||!r.name) return; if(w.every(function(x){ return near(x,fold(r.name).split(/\s+/)); })) o.push({s:e,o:r}); }); });
    return {p:p.slice(0,4),o:o.slice(0,4)}; }
  function draw(q){ var f=F(), el=f.el(), html='', i=0; rows=[];
    if(!q){ var my=mine().slice(0,5), seen={}; my.forEach(function(e){ seen[e._id]=1; });
      var rc=recent.map(sheetById).filter(function(e){ return e&&!seen[e._id]; }).slice(0,5);
      if(!my.length&&!rc.length) return false;
      if(my.length){ html+='<div class="mh">Your patients</div>'+my.map(function(e){ rows.push({id:e._id}); return pRow(e,i++); }).join(''); }
      if(rc.length){ html+='<div class="mh ts-fr-h">Recently opened<button type="button" class="ts-fr-clear" data-clear-recent aria-label="Clear recently opened">Clear</button></div>'+rc.map(function(e){ rows.push({id:e._id}); return pRow(e,i++); }).join(''); }
    } else {
      var pl=f.list(q), oh=orderHits(q), ids={}; oh.forEach(function(h){ ids[h.s._id]=1; });
      /* a patient found only by an order shows under Orders, not twice */
      var pOnly=pl.filter(function(e){ var w=fold(q).split(/\s+/).filter(Boolean); var t=e.patient||{}; var hay=fold([t.name,t.last,t.owner,t.reason,t.location,t.doctor,t.breed,t.species,t.problem,(t.problems||[]).map(function(x){ return x&&(x.name||x.text||x); }).join(' ')].filter(Boolean).join(' '));
        return w.every(function(x){ return hay.indexOf(x)>-1; })||!ids[e._id]; }).slice(0,6);
      if(pOnly.length) html+='<div class="mh">Patients</div>'+pOnly.map(function(e){ rows.push({id:e._id}); return pRow(e,i++); }).join('');
      else if(!oh.length){ var cm=closeMatches(q);
        if(cm.p.length||cm.o.length) html+='<div class="mh">Close matches</div><div class="me">Nothing matches “'+esc(q)+'” exactly.</div>'+cm.p.map(function(e){ rows.push({id:e._id}); return pRow(e,i++); }).join('')+cm.o.map(function(h){ rows.push({id:h.s._id,order:h.o.id}); return oRow(h,i++); }).join('');
        else html+='<div class="mh">Patients and orders</div><div class="me">No patient or order matches “'+esc(q)+'”.</div>'; }
      if(oh.length){ html+='<div class="mh">Orders</div>'+oh.slice(0,6).map(function(h){ rows.push({id:h.s._id,order:h.o.id}); return oRow(h,i++); }).join(''); }
    }
    if(idx>=rows.length) idx=Math.max(0,rows.length-1);
    el.innerHTML=html; f.place(); el.classList.add('show'); shown=true; aria(); return true; }
  var lastQ=null;
  window.pvxFindShow=function(q){ var f=F(); if(!f) return false; if(f.cmd()) return false; var box=$('#globalSearch'); if(q!==lastQ){ idx=0; lastQ=q; }
    if(!q){ if(!box||document.activeElement!==box){ f.hide(); return true; } if(!draw('')){ f.hide(); } return true; }
    if(f.board()) { shown=false; return false; }
    draw(q); return true; };
  window.pvxFindKey=function(e,q){ var f=F(); if(!f||!shown||!f.el().classList.contains('show')) return false; if(q&&f.board()) return false;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ if(!rows.length) return true; e.preventDefault(); idx=(idx+(e.key==='ArrowDown'?1:rows.length-1))%rows.length; draw(q); return true; }
    if(e.key==='Enter'){ var r=rows[idx]; if(!r) return false; e.preventDefault(); go(r); return true; }
    return false; };
  function go(r){ var f=F(); if(r.order){ openAtOrder(r.id,r.order); } else f.open(r.id); }
  function openAtOrder(id,oid){ var f=F(); f.open(id); var tries=0;
    (function look(){ tries++; try{ if(typeof selectCTab==='function'&&currentCTab!=='sheet') selectCTab('sheet'); }catch(e){}
      var row=$('#ctab-sheet .grow[data-o="'+oid+'"]');
      if(row&&f.cur()===id){ try{ row.scrollIntoView({block:'center'}); }catch(e){} row.classList.remove('ts-order-hl'); void row.offsetWidth; row.classList.add('ts-order-hl'); setTimeout(function(){ row.classList.remove('ts-order-hl'); },1800); return; }
      if(tries<30) setTimeout(look,100); })(); }
  document.addEventListener('mousedown',function(e){ var t=e.target.closest&&e.target.closest('#tsFind [data-order]'); if(!t) return; e.preventDefault(); e.stopPropagation(); openAtOrder(t.getAttribute('data-open'),t.getAttribute('data-order')); },true);
  /* n265: Clear empties Recently opened, on this computer, and keeps the search open */
  function clearRecent(e){ var t=e.target.closest&&e.target.closest('#tsFind [data-clear-recent]'); if(!t) return; e.preventDefault(); e.stopPropagation();
    if(e.type==='click'&&e.detail) return; recent=[]; lastCur=(F()&&F().cur())||null; idx=0; if(!draw('')) F().hide(); var b=$('#globalSearch'); b&&b.focus(); try{ window.pvxSay&&pvxSay('Recently opened cleared'); }catch(x){} }
  document.addEventListener('mousedown',clearRecent,true); document.addEventListener('click',clearRecent,true);
  function aria(){ var i=$('#globalSearch'), el=$('#tsFind'); if(!i) return; var open=!!(el&&el.classList.contains('show'));
    i.setAttribute('aria-expanded',open?'true':'false'); var c=el&&$('.mi.cur',el); if(open&&c&&c.id) i.setAttribute('aria-activedescendant',c.id); else i.removeAttribute('aria-activedescendant'); }
  function wireSearch(){ var i=$('#globalSearch'); if(!i||i._pvx237) return; i._pvx237=1;
    try{ i.type='search'; }catch(e){} i.setAttribute('role','combobox'); i.setAttribute('aria-autocomplete','list'); i.setAttribute('aria-controls','tsFind'); i.setAttribute('aria-expanded','false');
    i.setAttribute('enterkeyhint','search'); i.setAttribute('aria-keyshortcuts','Meta+K Control+K'); i.setAttribute('spellcheck','false');
    var bar=i.closest('.search-bar'), s=i.closest('.search'), act=bar&&$('.actions',bar);
    if(bar&&!$('.ts-sclear',bar)){ var c=document.createElement('button'); c.type='button'; c.className='ts-sclear'; c.setAttribute('aria-label','Clear search'); c.innerHTML=XS;
      c.addEventListener('mousedown',function(e){ e.preventDefault(); }); c.addEventListener('click',function(){ try{ tsFindClear(true); }catch(e){ i.value=''; } i.dispatchEvent(new Event('input',{bubbles:true})); i.focus(); sync(); });
      act?bar.insertBefore(c,act):bar.appendChild(c);
      var k=document.createElement('kbd'); k.className='ts-skey'; k.setAttribute('aria-hidden','true'); k.textContent=MAC?'⌘K':'Ctrl K'; act?bar.insertBefore(k,act):bar.appendChild(k); }
    function sync(){ s&&s.classList.toggle('has-q',!!i.value); }
    /* the open search lies over the chip and the gear: as wide as the space after the tabs allows */
    function fit(){ if(!bar||!s) return; bar.style.width=''; if(!matchMedia('(max-width:1680px)').matches) return; var sw=$('.subnav .switcher'); if(!sw) return;
      var right=s.getBoundingClientRect().right, room=right-sw.getBoundingClientRect().right-12; bar.style.setProperty('width',Math.max(220,Math.min(340,room))+'px','important'); }
    i.addEventListener('focus',fit); addEventListener('resize',function(){ if(document.activeElement===i) fit(); });
    i.addEventListener('input',sync); i.addEventListener('blur',function(){ setTimeout(function(){ sync(); if(!i.value&&bar) bar.style.width=''; },0); }); sync(); }
  window.addEventListener('keydown',function(e){ if(!(e.metaKey||e.ctrlKey)||e.altKey||e.shiftKey||e.isComposing) return; if((e.key||'').toLowerCase()!=='k') return; if(window.pvxModalUp&&pvxModalUp()) return;
    var i=$('#globalSearch'); if(!i) return; e.preventDefault(); var s=i.closest('.search'), b=s&&$('.ts-search-open',s);
    if(b&&getComputedStyle(b).display!=='none'&&b.getAttribute('aria-hidden')==='false') b.click(); else i.focus(); try{ i.select(); }catch(x){} },true);

  /* ---------- Settings: two groups ---------- */
  var HERE={'Downtime copy':1,'Alert sound':1}, ORDER=['Downtime copy','Alert sound','Kura stock link','Intern drafts','Spanish wording','Code list'];
  function stgGroup(){ var L=$('#tsOrderSheet .op-card.stg .stg-list'); if(!L) return; var rs=$$('.stg-row',L).filter(function(r){ return r.parentNode===L; }); if(!rs.length) return;
    var g1=$('.stg-grp[data-g="here"]',L), g2=$('.stg-grp[data-g="all"]',L);
    if(!g1){ g1=document.createElement('div'); g1.className='stg-grp'; g1.setAttribute('data-g','here'); g1.setAttribute('role','group'); g1.setAttribute('aria-labelledby','stgGh'); g1.innerHTML='<h4 id="stgGh">On this computer</h4>'; L.insertBefore(g1,L.firstChild); }
    if(!g2){ g2=document.createElement('div'); g2.className='stg-grp'; g2.setAttribute('data-g','all'); g2.setAttribute('role','group'); g2.setAttribute('aria-labelledby','stgGa'); g2.innerHTML='<h4 id="stgGa">For everyone <small>Changes Treatment for the whole hospital</small></h4>'; L.insertBefore(g2,g1.nextSibling); }
    rs.sort(function(a,b){ var x=ORDER.indexOf(($('b',a)||{}).textContent), y=ORDER.indexOf(($('b',b)||{}).textContent); return (x<0?99:x)-(y<0?99:y); })
      .forEach(function(r){ (HERE[($('b',r)||{}).textContent]?g1:g2).appendChild(r); });
    [g1,g2].forEach(function(g){ g.hidden=!$('.stg-row',g); }); }
  /* the switch rows: the whole row's switch is the control */
  document.addEventListener('click',function(e){ var sw=e.target.closest&&e.target.closest('#pvxStgSound .v-sw, #pvxAmSound .v-sw'); if(!sw) return; e.stopPropagation();
    pvxAlertSound(!pvxAlertSound()); var on=pvxAlertSound(); $$('#pvxStgSound .v-sw, #pvxAmSound .v-sw').forEach(function(x){ x.setAttribute('aria-checked',on?'true':'false'); });
    try{ toast(on?'Alert sound on':'Alert sound off'); }catch(x){} },true);

  /* ---------- the Status board: Print… and Reports ---------- */
  var PIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>';
  var RIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>';
  var CHEV='<svg class="ts-rep-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function reports(){ var r=[]; try{ if(window.tsLevelsOwner&&tsLevelsOwner()) r.push(['levels','Lowered levels','Hospitalization billed below the level the sheet worked out, by who lowered it. Only you see this.',function(){ tsLevelsReport(); }]); }catch(e){}
    if(window.tsOnTime) r.push(['ontime','On-time report','Treatments on time, late and missed — by shift, ward and hour; antibiotics from order to first dose; how stays ended. Never by person.',function(){ tsOnTime(1); }]);
    if(window.tsUsageReport) r.push(['usage','Usage','Which parts of the app were used in the last 7 days, and presses per treatment. Never by person.',function(){ tsUsageReport(); }]);
    var admin=false; try{ admin=!!(window.tsChAdmin&&tsChAdmin()); }catch(e){} return admin?r:r.filter(function(x){ return x[0]==='levels'; }); }
  function closeMenu(){ var m=$('#tsReportsMenu'); if(m){ m.remove(); var b=$('#tsReportsBtn'); b&&b.setAttribute('aria-expanded','false'); } }
  function openMenu(btn){ if($('#tsReportsMenu')){ closeMenu(); return; } var r=reports(); if(!r.length) return;
    var m=document.createElement('div'); m.id='tsReportsMenu'; m.className='ts-copymenu'; m.setAttribute('role','menu'); m.setAttribute('aria-label','Reports');
    m.innerHTML=r.map(function(x){ return '<button type="button" role="menuitem" data-rep="'+x[0]+'"><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></button>'; }).join('');
    document.body.appendChild(m); var b=btn.getBoundingClientRect(); m.style.position='fixed'; m.style.top=(b.bottom+6)+'px'; m.style.left=Math.max(8,Math.min(b.right-m.offsetWidth,innerWidth-m.offsetWidth-8))+'px'; m.style.zIndex=9000;
    btn.setAttribute('aria-expanded','true');
    m.addEventListener('click',function(e){ var t=e.target.closest('[data-rep]'); if(!t) return; var x=r.filter(function(y){ return y[0]===t.getAttribute('data-rep'); })[0]; closeMenu(); x&&x[3](); });
    m.addEventListener('keydown',function(e){ var its=$$('[role=menuitem]',m), k=its.indexOf(document.activeElement);
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); its[(k+(e.key==='ArrowDown'?1:its.length-1))%its.length].focus(); }
      else if(e.key==='Escape'){ e.preventDefault(); closeMenu(); btn.focus(); } });
    setTimeout(function(){ document.addEventListener('mousedown',function h(e){ if(!m.contains(e.target)&&!btn.contains(e.target)){ closeMenu(); document.removeEventListener('mousedown',h); } }); },0);
    var f=$('[role=menuitem]',m); f&&f.focus(); }
  function boardBtns(){ var tv=$('#ctab-dash .sb-tvb'); if(!tv) return; var bar=tv.parentNode;
    if(!$('#tsBoardPrint',bar)){ var p=document.createElement('button'); p.type='button'; p.id='tsBoardPrint'; p.className='sb-tvb ts-sbprint'; p.setAttribute('aria-label','Print the board…'); p.setAttribute('data-tip','Print the board…'+(matchMedia('(hover:hover)').matches?(MAC?' ⌘P':' Ctrl+P'):'')); p.innerHTML=PIC;
      p.onclick=function(e){ e.stopPropagation(); tsPrintBoard(); }; bar.insertBefore(p,tv); }
    var has=reports().length, rb=$('#tsReportsBtn',bar);
    if(has&&!rb){ rb=document.createElement('button'); rb.type='button'; rb.id='tsReportsBtn'; rb.className='sb-tvb'; rb.setAttribute('aria-haspopup','menu'); rb.setAttribute('aria-expanded','false'); rb.innerHTML=RIC+'Reports'+CHEV;
      rb.onclick=function(e){ e.stopPropagation(); openMenu(rb); }; bar.insertBefore(rb,$('#tsBoardPrint',bar)); }
    else if(!has&&rb) rb.remove(); }

  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{ trackRecent(); wireSearch(); aria(); stgGroup(); boardBtns(); }catch(e){ console.warn('[n237]',e); } },60); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n238-ts · was index.html line 2428 ════ */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent);
  function plain(h){ var d=document.createElement('div'); d.innerHTML=String(h||''); return (d.textContent||'').trim(); }
  function F(){ return window.__tsFind; }
  function cur(){ var f=F(); return f?f.cur():null; }
  function sheetName(id){ var f=F(); var s=f&&(f.all()||[]).filter(function(e){ return e._id===id; })[0]; var t=s&&s.patient||{}; return ((t.name||'')+' '+(t.last||'')).trim()||'the patient'; }

  /* ---------- one history: the Undo buttons, ⌘Z and ⇧⌘Z ---------- */
  var ST=[], RD=[];
  function quietly(fn){ var n=0, ot=window.toast; window.toast=function(){ n++; return ot.apply(this,arguments); }; var r; try{ r=fn(); }finally{ window.toast=ot; } return {n:n,r:r}; }
  window.pvxTsHist={
    add:function(label,undo,redo,sheet){ var e={label:label,undo:undo,redo:redo||null,sheet:sheet||null}; ST.push(e); if(ST.length>50) ST.shift(); RD.length=0; return e; },
    run:function(e,fromKey){ var i=ST.indexOf(e); if(i<0) return false; var q=quietly(function(){ return e.undo(); });
      if(q.r===false) return false;   /* the step said it couldn't be undone (someone changed it since) */
      ST.splice(ST.indexOf(e),1); e.kill&&e.kill(); if(e.redo) RD.push(e);
      if(fromKey&&!q.n) window.toast('Undone — '+plain(e.label)+(e.redo&&fromKey!=='touch'?(MAC?' · ⇧⌘Z to redo':' · Ctrl+Y to redo'):''));
      return true; },
    redo:function(e){ var i=RD.indexOf(e); if(i<0) return false; RD.splice(i,1); var q=quietly(function(){ return e.redo(); }); ST.push(e); if(!q.n) window.toast('Redone — '+plain(e.label)); return true; },
    size:function(){ return [ST.length,RD.length]; }
  };
  /* n266: the toolbar's Undo and Redo on touch screens use the same history */
  window.pvxTsTop=function(){ return [ST.length?plain(ST[ST.length-1].label):null, RD.length?plain(RD[RD.length-1].label):null]; };
  function needSheetT(e,verb){ if(!e.sheet||e.sheet===cur()) return false; var nm=sheetName(e.sheet); try{ tsOpenSheet(e.sheet,true); }catch(x){}
    window.toast('Opened '+nm+' — choose '+(verb==='redo'?'Redo':'Undo')+' again to '+verb+' “'+plain(e.label)+'”'); return true; }
  window.pvxTsUndo=function(){ var e=ST[ST.length-1]; if(!e){ window.toast('Nothing to undo'); return; } if(needSheetT(e,'undo')) return; pvxTsHist.run(e,'touch'); };
  window.pvxTsRedo=function(){ var r=RD[RD.length-1]; if(!r){ window.toast('Nothing to redo'); return; } if(needSheetT(r,'redo')) return; pvxTsHist.redo(r); };
  function busy(){ return !!$('#tsModal.show, #tsOrderSheet.show, .drawer.open, #tsCopyMenu, #tsReportsMenu, #tsAlertMenu, #tsFind.show, #tsDowntime.show, #tsTake.show, .ts-menu.show'); }
  function typing(t){ return t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable); }
  function needSheet(e,verb){ if(!e.sheet||e.sheet===cur()) return false; var nm=sheetName(e.sheet);
    try{ tsOpenSheet(e.sheet,true); }catch(x){} window.toast('Opened '+nm+' — press '+(verb==='redo'?(MAC?'⇧⌘Z':'Ctrl+Y'):(MAC?'⌘Z':'Ctrl+Z'))+' again to '+verb+' “'+plain(e.label)+'”'); return true; }
  window.addEventListener('keydown',function(ev){ if(ev.altKey||ev.isComposing) return; var k=(ev.key||'').toLowerCase(); var mod=MAC?ev.metaKey:ev.ctrlKey; if(!mod) return;
    var isUndo=k==='z'&&!ev.shiftKey, isRedo=(k==='z'&&ev.shiftKey)||(!MAC&&k==='y'); if(!isUndo&&!isRedo) return;
    if(typing(ev.target)||typing(document.activeElement)||busy()) return;   /* the field's own undo, or a dialog's */
    ev.preventDefault();
    if(isUndo){ var e=ST[ST.length-1]; if(!e){ window.toast('Nothing to undo'); return; } if(needSheet(e,'undo')) return; pvxTsHist.run(e,true); }
    else { var r=RD[RD.length-1]; if(!r){ window.toast('Nothing to redo'); return; } if(needSheet(r,'redo')) return; pvxTsHist.redo(r); } },true);

  /* show where a change landed: the order's row on the sheet or in Vitals */
  window.pvxHlOrder=function(oid){ if(!oid) return; setTimeout(function(){
      var row=$('#ctab-sheet .grow[data-o="'+oid+'"]')||(($('#vin-'+oid)||{}).closest&&$('#vin-'+oid).closest('.v-row'));
      if(!row||!row.getBoundingClientRect().width) return; try{ row.scrollIntoView({block:'nearest'}); }catch(x){}
      row.classList.remove('ts-hl-row'); void row.offsetWidth; row.classList.add('ts-hl-row'); setTimeout(function(){ row.classList.remove('ts-hl-row'); },1800); },80); };

  /* ---------- someone else's reading, announced ---------- */
  var live, alertR;
  function regions(){ if(!live){ live=document.createElement('div'); live.className='pvx-sr'; live.id='pvxLiveRemote'; live.setAttribute('aria-live','polite'); live.setAttribute('aria-atomic','true'); document.body.appendChild(live);
      alertR=document.createElement('div'); alertR.className='pvx-sr'; alertR.id='pvxLiveRemoteCrit'; alertR.setAttribute('role','alert'); document.body.appendChild(alertR); } }
  function clock(min){ var h=Math.floor(min/60)%24, m=Math.round(min%60); return (h%12||12)+':'+(m<10?'0':'')+m+' '+(h<12?'AM':'PM'); }
  var said={};
  window.pvxRemoteMarks=function(oldM,newM,find,sev,me){ try{ regions(); var out=[], crit=[];
    Object.keys(newM||{}).forEach(function(k){ var n=newM[k], o=oldM&&oldM[k]; if(!n||n.status!=='completed') return; if(o&&o.status===n.status&&String(o.value)===String(n.value)&&o.at===n.at) return;
      if(me&&n.uid&&n.uid===me.uid) return; if(me&&!n.uid&&n.by&&n.by===me.initials&&o) return; var id=k+'|'+(n.at||n.value); if(said[id]) return; said[id]=1;
      var ord=find(n.orderId)||{}; var nm=ord.name||'A treatment', u=ord.unit&&n.value!=null&&/\d/.test(String(n.value))?' '+ord.unit:'';
      var txt=nm+(n.value!=null&&n.value!==''?' '+n.value+u:'')+', '+(ord.type==='med'?'given':'charted')+(n.by?' by '+n.by:'')+(n.min!=null?' at '+clock(n.min):'');
      var s=ord.name&&n.value!=null?sev(ord,n.value):0; (s>=2?crit:out).push((s>=2?'Critical: ':s?'Abnormal: ':'')+txt); });
    if(out.length){ live.textContent=''; setTimeout(function(){ live.textContent=out.join('. ')+'.'; },60); }
    if(crit.length){ alertR.textContent=''; setTimeout(function(){ alertR.textContent=crit.join('. ')+'.'; },60); }
  }catch(e){ console.warn('[n238 remote]',e); } };

  /* ---------- the alert range ---------- */
  function nf(x){ return (Math.round(x*10)/10).toString(); }
  window.pvxBandShort=function(t){ if(!t||!t.num) return ''; var lo=t.lo, hi=t.hi, u=(t.o&&t.o.unit)||'';
    if(lo==null&&hi==null) return ''; var r=lo!=null&&hi!=null?nf(lo)+'–'+nf(hi):lo!=null?'at least '+nf(lo):'up to '+nf(hi); return 'Alert range '+r+(u?' '+u:''); };
  window.pvxBandTxt=function(t){ var s=pvxBandShort(t); return s?' Shaded: '+s.charAt(0).toLowerCase()+s.slice(1)+'.':''; };
  function alertLines(){ $$('#ctab-vitals .v-chart[role=img]').forEach(function(c){ var m=/Shaded: alert range (.+)\.$/.exec(c.getAttribute('aria-label')||''); var row=c.closest('.v-row'), now=row&&$('.vx-now',row); if(!now) return;
      var x=$('.vx-alr',now); if(!m){ x&&x.remove(); return; } var txt='Alert range '+m[1]; if(x&&x.textContent===txt) return; if(!x){ x=document.createElement('small'); x.className='vx-alr'; x.setAttribute('aria-hidden','true'); now.appendChild(x); } x.innerHTML='Alert range <span class="vx-nw">'+m[1].replace(/[&<>]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]})+'</span>'; }); }
  function legend(){ var ax=$('#ctab-vitals .v-row.vx-ax .v-name'); if(!ax||$('.vx-key',ax)) return; if(!$('#ctab-vitals .vx-band')) return;
    var k=document.createElement('span'); k.className='vx-key'; k.innerHTML='<i aria-hidden="true"></i>Shaded: alert range'; ax.appendChild(k); }

  /* ---------- note boxes grow with the text ---------- */
  var GROW='#note-body, #cd-notes, #hoNotes, #hoHow, #ccAnyWhy';
  function grow(t){ if(!t||!t.isConnected||!t.offsetParent) return; var cs=getComputedStyle(t), lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.4,
      pad=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth);
    var max=t.id==='note-body'?Math.max(160,Math.round(innerHeight*0.6)):Math.round(lh*8+pad);
    if(!t._pvxMin) t._pvxMin=t.getBoundingClientRect().height||t.offsetHeight;
    t.style.height='auto'; var want=Math.min(max,Math.max(t._pvxMin,t.scrollHeight+(cs.boxSizing==='border-box'?parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth):0))); t.style.height=want+'px'; }
  document.addEventListener('input',function(e){ if(e.target&&e.target.matches&&e.target.matches(GROW)) grow(e.target); },true);
  document.addEventListener('focusin',function(e){ if(e.target&&e.target.matches&&e.target.matches(GROW)) grow(e.target); },true);

  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{ legend(); alertLines(); $$(GROW).forEach(function(t){ if(t.offsetParent&&!t._pvxG){ t._pvxG=1; grow(t); } if(!t.offsetParent) t._pvxG=0; }); }catch(e){ console.warn('[n238]',e); } },80); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();


/* ════ pvx-n239-ts · was index.html line 2528 ════ */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  /* ---------- Back and Forward: one history entry per patient and per section ---------- */
  var SHEETISH={sheet:1,vitals:1,anes:1,anesthesia:1,timeline:1,charges:1,notes:1};
  function area(t){ return SHEETISH[t]?'sheet':(t==='tasks'?'tasks':'dash'); }
  function cur(){ try{ return window.__tsFind?__tsFind.cur():null; }catch(e){ return null; } }
  function tab(){ return (typeof currentCTab!=='undefined'&&currentCTab)||'dash'; }
  function urlFor(st){ return location.pathname+location.search+(st.area==='sheet'&&st.sheet?'#sheet='+encodeURIComponent(st.sheet):''); }
  function here(){ var t=tab(); return {pvx:1,area:area(t),tab:t,sheet:cur()}; }
  function same(a,b){ return a&&b&&a.area===b.area&&(a.area!=='sheet'||a.sheet===b.sheet); }
  var lastOpened=!/[#&]sheet=/.test(location.hash||''), popping=false, R=history.replaceState.bind(history), P=history.pushState.bind(history);
  function note(){ /* record the place we're at: a new entry when the patient or section changed, else update this one */
    if(popping) return; var now=here(), was=history.state&&history.state.pvx?history.state:null;
    if(!was){ /* first record: a #sheet= link that hasn't opened yet (signing in, still loading) is kept, not stripped */
      var m=/[#&]sheet=([^&]+)/.exec(location.hash||'');
      if(m&&now.area!=='sheet'){ R({pvx:1,area:'sheet',tab:'sheet',sheet:decodeURIComponent(m[1])},'',location.href); return; }
      R(now,'',urlFor(now)); return; }
    if(!lastOpened) return;   /* a linked sheet hasn't opened yet: leave the entry and its address alone */
    if(same(was,now)){ if(was.tab!==now.tab||was.sheet!==now.sheet) R(now,'',urlFor(now)); return; }
    P(now,'',urlFor(now)); }
  /* the app's own address updates keep our entry's place, and never add or drop entries */
  history.replaceState=function(st,t,u){ try{ if(!lastOpened&&u!=null&&!/[#&]sheet=/.test(String(u))) lastOpened=true; var s=history.state&&history.state.pvx?history.state:null; return R(st||s,t,u); }catch(e){ return R(st,t,u); } };
  /* the app's scripts load after this one, so wrap their navigation once they exist (and again if something re-wraps it) */
  var sel=null, os=null;
  function wrap(){ var f=window.selectCTab; if(typeof f==='function'&&!f.__pvx239){ sel=f; var w=function(){ var r=f.apply(this,arguments); try{ setTimeout(note,0); }catch(e){} return r; }; w.__pvx239=1; w.__orig=f; window.selectCTab=w; }
    var g=window.tsOpenSheet; if(typeof g==='function'&&!g.__pvx239){ os=g; var v=function(){ var r=g.apply(this,arguments); try{ setTimeout(note,0); }catch(e){} return r; }; v.__pvx239=1; window.tsOpenSheet=v; } }
  wrap(); document.addEventListener('DOMContentLoaded',wrap);   /* n298: the app's scripts have run by then; boot wraps once more after load. No 1 s re-wrap */
  /* sheets opened from search, links and the patient tabs go through openSheet; catch them by watching the current sheet */
  var lastCur=null; function check(){ var c=cur(); if(c) lastOpened=true; if(c!==lastCur){ lastCur=c; note(); } }
  /* n298: the app says when a sheet opens, is drawn, or the section changes; no 250 ms poll */
  pvxOn(['sheet.opening','sheet.drawn','tab','header.refresh','rendered'],function(){ setTimeout(check,0); },function(){ setInterval(check,250); });
  window.addEventListener('popstate',function(e){ var st=e.state&&e.state.pvx?e.state:null;
    if(!st){ var m=/[#&]sheet=([^&]+)/.exec(location.hash||''); st={pvx:1,area:m?'sheet':'dash',tab:m?'sheet':'dash',sheet:m?decodeURIComponent(m[1]):null}; }
    popping=true;
    try{
      if(st.area==='sheet'&&st.sheet){ if(cur()!==st.sheet) os(st.sheet,false); sel(st.tab&&SHEETISH[st.tab]?st.tab:'sheet'); }
      else sel(st.area==='tasks'?'tasks':'dash');
    }catch(x){ console.warn('[n239 back]',x); }
    setTimeout(function(){ lastCur=cur(); popping=false; try{ R(Object.assign({},st,{tab:tab()}),'',urlFor(st)); }catch(x){} },0); });
  function boot(){ wrap(); note(); lastCur=cur(); }
  if(document.readyState==='complete') setTimeout(boot,0); else addEventListener('load',function(){ setTimeout(boot,300); });

  /* ---------- the chosen reference dose is announced as chosen ---------- */
  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; $$('#tsModal .rx-ref').forEach(function(b){ var on=b.classList.contains('on'); if(b.getAttribute('aria-pressed')!==String(on)) b.setAttribute('aria-pressed',String(on)); }); },60); }
  pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();

/* ════ pvx-n240-ts · was index.html line 2576 ════ */
(function(){
  var $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  /* More options goes last in the order form, just above the buttons: the dose, its result and its checks stay together */
  function place(){ $$('#tsModal .tm-card').forEach(function(card){
    var more=card.querySelector(':scope>.of-more'), foot=card.querySelector(':scope>.tm-foot'); if(!more||!foot) return;
    var box=more.nextElementSibling&&more.nextElementSibling.classList.contains('of-box')?more.nextElementSibling:null;
    if(box){ if(box.nextElementSibling!==foot){ foot.parentNode.insertBefore(more,foot); foot.parentNode.insertBefore(box,foot); } }
    else if(more.nextElementSibling!==foot) foot.parentNode.insertBefore(more,foot);
    if(box){ if(!box.id) box.id='pvxOfBox'+Math.random().toString(36).slice(2,7); more.setAttribute('aria-controls',box.id); } }); }
  pvxWatch(function(){ if(document.querySelector('#tsModal .of-more')) place(); },{childList:true,subtree:true});
  /* opening it shows what opened */
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#tsModal .of-more'); if(!b) return;
    setTimeout(function(){ var box=b.nextElementSibling; if(b.getAttribute('aria-expanded')==='true'&&box){ var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
      try{ box.scrollIntoView({block:'nearest',behavior:rm?'auto':'smooth'}); }catch(x){} } },60); });
})();

/* ════ pvx-n241-ts · was index.html line 2593 ════ */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  function set(e,a,v){ if(!e) return; if(v==null){ if(e.hasAttribute(a)) e.removeAttribute(a); } else if(e.getAttribute(a)!==String(v)) e.setAttribute(a,String(v)); }
  var uid=0; function idOf(e,p){ if(!e.id) e.id=(p||'pvx241')+'-'+(++uid); return e.id; }
  function txt(e){ return e?(e.textContent||'').replace(/\s+/g,' ').trim():''; }
  function tab(){ return (typeof currentCTab!=='undefined'&&currentCTab)||''; }

  /* ---------- 1. the Status board as a table ---------- */
  function overdueOf(id){ var t=$('.pt-tab[data-id="'+id+'"] .pt-main'); var m=t&&/(\d+)\s*$/.exec(txt(t)); return m?+m[1]:null; }
  function rowName(r){ var id=r.getAttribute('data-id'), pt=$('.c-pt',r);
    var nm=txt($('.pt-nm',pt)), sel=$('.c-ward select',r), ward=sel?(sel.options[sel.selectedIndex]||{}).text:txt($('.c-ward',r));
    var day=txt($('.sb-stay .io-day',r)), code=$('.ts-resus',r), od=id?overdueOf(id):null, team=$$('.c-team .tm-p',r).map(txt).filter(Boolean);
    var parts=[nm]; if(ward&&ward!=='—') parts.push(ward); if(day) parts.push(day.replace(/^Day/,'day')); if(od!=null) parts.push(od+' overdue');
    if(code&&code.getAttribute('aria-label')) parts.push(code.getAttribute('aria-label').replace(/^Code status /,'')); if(team.length) parts.push(team.join(', '));
    return parts.join(', '); }
  function board(){ var root=$('#ctab-dash'); if(!root) return;
    $$('.sb-card',root).forEach(function(card){ var inner=$('.sb-inner',card); if(!inner) return; var h=$('.sb-group h3',card), n=$('.sb-group .sb-gn',card);
      set(inner,'role','table'); if(h){ set(inner,'aria-labelledby',idOf(h,'pvxSbH')+(n?' '+idOf(n,'pvxSbN'):'')); }
      $$(':scope>.sb-nowline',inner).forEach(function(x){ set(x,'aria-hidden','true'); });
      var rows=$$(':scope>.sb-row',inner), body=rows.filter(function(r){ return !r.classList.contains('sb-head'); }), cur=body.filter(function(r){ return r.classList.contains('sel'); })[0]||body[0];
      rows.forEach(function(r){ var head=r.classList.contains('sb-head'); set(r,'role','row');
        var left=$(':scope>.sb-left',r); set(left,'role','none');
        $$(':scope>.sb-nowdot',r).forEach(function(x){ set(x,'aria-hidden','true'); });
        $$(':scope>.sbc',left||r).forEach(function(c){
          if(head){ set(c,'role','columnheader'); var b=$('.sb-sorth',c); if(b){ var so=b.getAttribute('aria-sort'); if(so){ b.setAttribute('data-pvx-sort',so); b.removeAttribute('aria-sort'); } so=b.getAttribute('data-pvx-sort')||'none'; set(c,'aria-sort',so); } }
          else if(c.classList.contains('c-pt')) set(c,'role','rowheader');
          else if(c.classList.contains('al-cell')&&c.getAttribute('role')==='button'){ /* a cell holding the Alerts button (a row can only hold cells) */
            var w=document.createElement('span'); w.className='pvx-alb'; w.setAttribute('role','button'); w.tabIndex=c.tabIndex>-1?-1:-1;
            w.setAttribute('aria-label',c.getAttribute('aria-label')||'Alerts'); if(c.title) w.title=c.title;
            while(c.firstChild) w.appendChild(c.firstChild); c.appendChild(w); c.removeAttribute('aria-label'); c.removeAttribute('tabindex'); c.removeAttribute('title'); set(c,'role','cell'); w.tabIndex=0; }
          else if(!c.getAttribute('role')||c.getAttribute('role')!=='cell') set(c,'role','cell'); });
        var hrs=$(':scope>.sb-hours',r);
        if(hrs){ if(head){ var hc=$$('.sb-hcell',hrs); set(hrs,'role','columnheader'); set(hrs,'aria-label','Hours'+(hc.length?', '+hour(txt(hc[0]))+' to '+hour(txt(hc[hc.length-1])):'')); hc.forEach(function(x){ set(x,'aria-hidden','true'); }); }
          else { set(hrs,'role','cell'); set(hrs,'aria-label',null); } }
        if(!head){ set(r,'aria-label',rowName(r)); set(r,'tabindex',r===cur?'0':'-1'); set(r,'aria-selected',null); } }); }); }
  function hour(h){ var m=/^(\d+)([AP])$/.exec(h||''); return m?m[1]+' '+m[2]+'M':h; }
  /* the highlight moved with ↑ ↓: focus follows it, so VoiceOver reads the row */
  var moCb=function(ms){ var hit=null; ms.forEach(function(m){ if(m.type==='attributes'&&m.target.classList&&m.target.classList.contains('sb-row')&&m.target.classList.contains('sel')&&(m.oldValue||'').indexOf('sel')<0) hit=m.target; });
    sched(); if(hit&&tab()==='dash'){ var a=document.activeElement; if(!a||a===document.body||(a.classList&&a.classList.contains('sb-row'))){ setTimeout(function(){ board(); if(hit.isConnected){ try{ hit.focus({preventScroll:true}); hit.scrollIntoView({block:'nearest'}); }catch(x){} } },0); } } };
  /* Return opens the row that has focus (even if VoiceOver moved focus there) */
  document.addEventListener('keydown',function(e){ var r=e.target; if(e.key!=='Enter'||e.altKey||e.metaKey||e.ctrlKey||!r||!r.matches||!r.matches('#ctab-dash .sb-row[role=row]')) return;
    e.preventDefault(); e.stopImmediatePropagation(); r.click(); },true);
  /* coming back to the board puts focus on the row you left */
  var last=tab();
  function tabbed(){ var t=tab(); if(t===last) return; var was=last; last=t;
    if(t==='dash'&&was&&was!=='dash'){ [150,450].forEach(function(ms){ setTimeout(function(){ var a=document.activeElement; if(a&&a!==document.body&&a!==document.documentElement&&a.isConnected&&a.getClientRects().length) return; board();
      var r=$('#ctab-dash .sb-row.sel[role=row]')||$('#ctab-dash .sb-row[role=row][tabindex="0"]'); if(r){ try{ r.focus({preventScroll:true}); r.scrollIntoView({block:'nearest'}); }catch(x){} } },ms); }); } }
  pvxOn('tab',tabbed,function(){ setInterval(tabbed,120); });   /* n298: the app announces the section; no 120 ms poll */

  /* ---------- 2. Charges: each tick names its charge and day ---------- */
  function charges(){ $$('.ch-row .ch-ck').forEach(function(b){ var row=b.closest('.ch-row'), nm=txt($('.ch-what b',row)), d=b.closest('details'), day=d?txt($('summary b',d)):'';
      var cur=b.getAttribute('aria-label')||'', mine=b.getAttribute('data-pvx-lbl'); var base=(mine&&cur===mine)?b.getAttribute('data-pvx-base'):cur; if(!base||!nm) return;
      var who=nm+(day?', '+day.replace(/^Day/,'day'):''), m=/^Mark as (.+)$/.exec(base), lbl=m?'Mark '+who+', as '+m[1]:base+' — '+who;
      b.setAttribute('data-pvx-base',base); b.setAttribute('data-pvx-lbl',lbl); set(b,'aria-label',lbl); }); }

  /* ---------- 3. Tasks: each patient's tasks are a list ---------- */
  function tasks(){ $$('#ctab-tasks .wl-sec').forEach(function(sec){ var h=$(':scope>h3',sec), grp=txt(h).replace(/\s*\d+$/,'');
      $$(':scope>.wl-pt',sec).forEach(function(pt){ var rows=$$(':scope>.wl-row',pt), who=txt($('.wl-pth b',pt));
        set(pt,'role','list'); set(pt,'aria-label',(who?who+', ':'')+(grp?grp.charAt(0)+grp.slice(1).toLowerCase():'')+': '+rows.length+(rows.length===1?' task':' tasks'));
        rows.forEach(function(r){ set(r,'role','listitem'); }); }); }); }

  /* ---------- 4. Option-click folds or unfolds every section ---------- */
  var live=null; function say(m){ if(!live){ live=document.createElement('div'); live.id='pvxLive241'; live.className='pvx-sr'; live.setAttribute('aria-live','polite'); document.body.appendChild(live); } live.textContent=''; setTimeout(function(){ live.textContent=m; },30); }
  function nameOf(g){ var m=/tsSecToggle\('((?:[^'\\]|\\.)*)'\)/.exec(g.getAttribute('onclick')||''); return m?m[1].replace(/\\'/g,"'"):null; }
  function secByName(n){ return $$('.gband .gsection[role=button]').filter(function(g){ return nameOf(g)===n; })[0]; }
  function foldAll(g){ if(typeof window.tsSecToggle!=='function') return; var me=nameOf(g); if(!me) return;
    var open=g.getAttribute('aria-expanded')!=='true';   /* the clicked section decides: closed → open them all, open → fold them all */
    var names=$$('.gband .gsection[role=button]').map(nameOf).filter(Boolean);
    names.forEach(function(n){ var x=secByName(n); if(x&&(x.getAttribute('aria-expanded')==='true')!==open) tsSecToggle(n); });
    setTimeout(function(){ var x=secByName(me); x&&x.focus({preventScroll:true}); },30); say(open?'All sections shown':'All sections folded'); }
  document.addEventListener('click',function(e){ if(!e.altKey) return; var g=e.target.closest&&e.target.closest('.gband .gsection[role=button]'); if(!g||e.target.closest('.sec-add')) return;
    e.preventDefault(); e.stopImmediatePropagation(); foldAll(g); },true);
  document.addEventListener('keydown',function(e){ if(!e.altKey||(e.key!=='Enter'&&e.key!==' ')) return; var g=e.target.closest&&e.target.closest('.gband .gsection[role=button]'); if(!g||g!==e.target) return;
    e.preventDefault(); e.stopImmediatePropagation(); foldAll(g); },true);
  /* the band's tooltip says so */
  var MOD=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'')?'Option':'Alt';
  function tips(){ if(!matchMedia('(hover:hover)').matches) return; $$('.gband .gsection[role=button]').forEach(function(g){ var t=g.getAttribute('title')||''; if(t&&t.indexOf('-click: all sections')<0) g.setAttribute('title',t+' · '+MOD+'-click: all sections'); }); }

  var q=0; function sched(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ board(); charges(); tasks(); tips(); }catch(x){ console.warn('[n241]',x); } }); }
  function boot(){ pvxWatch(moCb,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class','role','tabindex','aria-label','aria-sort','title']}); sched(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n255 · was index.html line 2745 ════ */
/* PVX-N255 · keyboard grid, dialogs leaving the accessibility tree, Share in the toolbar (see patch_n255.py) */
(function(){
  /* text-size factor for the hour columns (1 at 16 px) */
  window.tsFsK=function(){ var f=parseFloat(getComputedStyle(document.documentElement).fontSize)||16; return Math.max(1,Math.min(2.5,f/16)); };
  function $(q,r){ return (r||document).querySelector(q); }
  function $$(q,r){ return [].slice.call((r||document).querySelectorAll(q)); }
  function vis(e){ if(!e||e.disabled||e.hidden||e.closest('[hidden]')) return false; if(!e.getClientRects().length) return false; var c=getComputedStyle(e); return c.visibility!=='hidden'&&c.display!=='none'; }
  var HINT='pvxGridHint', cur=null, curKey=null;
  function keyOf(e){ return e&&(e.getAttribute('data-t')?'t:'+e.getAttribute('data-t'):(e.getAttribute('aria-label')||'')+'|'+(e.className||'')); }
  function rows(){ var g=$('#sheetInner'); return g?$$('.grow',g).filter(function(r){ return r.getClientRects().length; }):[]; }
  function items(r){
    var all=$$('button,[tabindex],a[href],input,select,textarea',r).filter(function(e){ return vis(e)&&!e.closest('.pvx-noroving'); });
    var lab=all.filter(function(e){ return e.closest('.rl'); }).sort(function(a,b){ return a.getBoundingClientRect().left-b.getBoundingClientRect().left; });
    return lab.concat(all.filter(function(e){ return !e.closest('.rl'); }));
  }
  function nameBtn(m){ if(m.getAttribute('role')==='button') return; var t=m.textContent.replace(/\s+/g,' ').trim();
    m.setAttribute('role','button'); m.setAttribute('tabindex','-1'); m.setAttribute('aria-label',t+', order details'); }
  /* narrow windows: "‹ N" goes to the end of the meta line, so the name keeps the width */
  function chips(g){ var narrow=innerWidth<700; $$('.rl-off',g).forEach(function(o){ var rl=o.closest('.rl'); if(!rl) return; var meta=$('.rl-main .rl-meta',rl);
    if(narrow&&meta){ if(o.parentElement!==meta) meta.appendChild(o); } else if(!narrow&&o.parentElement!==rl){ rl.insertBefore(o,$('.rl-main',rl)); } }); }
  function hint(){ if(document.getElementById(HINT)) return; var h=document.createElement('span'); h.id=HINT; h.className='pvx-vh';
    h.textContent='Arrow keys move between cells and rows. Return opens one.'; document.body.appendChild(h); }
  function setCur(e){ if(cur&&cur!==e&&cur.isConnected){ cur.setAttribute('tabindex','-1'); if(cur.getAttribute('aria-describedby')===HINT) cur.removeAttribute('aria-describedby'); }
    cur=e; curKey=keyOf(e); if(e){ e.setAttribute('tabindex','0'); if(!e.getAttribute('aria-describedby')) e.setAttribute('aria-describedby',HINT); } }
  function apply(){
    var g=$('#sheetInner'); if(!g) return; hint();
    $$('.rl-main .rl-name',g).forEach(nameBtn); chips(g);
    var R=rows(), first=null, firstMark=null, keep=null, all=[];
    R.forEach(function(r){ items(r).forEach(function(e){ all.push(e); if(!first) first=e; if(!firstMark&&e.matches('.mark')) firstMark=e;
      if(cur&&e===cur) keep=e; else if(!keep&&curKey&&keyOf(e)===curKey) keep=e; }); });
    var want=keep||firstMark||first;
    all.forEach(function(e){ if(e!==want&&e.getAttribute('tabindex')!=='-1') e.setAttribute('tabindex','-1'); });
    if(want&&(want!==cur||want.getAttribute('tabindex')!=='0')) setCur(want);
  }
  var q=0; function sched(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ apply(); }catch(x){ console.warn('[n255]',x); } }); }
  function move(from,dx,dy,edge){
    var R=rows(), ri=-1, list=null;
    for(var i=0;i<R.length;i++){ if(R[i].contains(from)){ ri=i; list=items(R[i]); break; } }
    if(ri<0||!list) return null; var ix=list.indexOf(from);
    if(edge==='home') return list[0]; if(edge==='end') return list[list.length-1];
    if(edge==='top'||edge==='bottom'){ var rr=edge==='top'?R:R.slice().reverse(); for(var k=0;k<rr.length;k++){ var L=items(rr[k]); if(L.length) return edge==='top'?L[0]:L[L.length-1]; } return null; }
    if(dx) return list[ix+dx]||null;
    var x=from.getBoundingClientRect(), cx=x.left+x.width/2, inLab=!!from.closest('.rl');
    for(var j=ri+dy;j>=0&&j<R.length;j+=dy){ var L2=items(R[j]); if(!L2.length) continue;
      var pool=L2.filter(function(e){ return !!e.closest('.rl')===inLab; }); if(!pool.length) pool=L2;
      var best=null,bd=1e9; pool.forEach(function(e){ var b=e.getBoundingClientRect(), d=Math.abs(b.left+b.width/2-cx); if(d<bd){ bd=d; best=e; } }); return best; }
    return null;
  }
  document.addEventListener('keydown',function(e){
    var t=e.target; if(!t||!t.closest||!t.closest('#sheetInner')) return;
    if(t.matches('input,textarea,select,[contenteditable],[contenteditable] *')) return;
    if(e.altKey||e.metaKey) return;
    if(t.matches('.rl-name[role=button]')&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); t.click(); return; }
    var k=e.key, nx=null;
    if(t.matches('.rl-grip')&&(k==='ArrowUp'||k==='ArrowDown')) return;   /* the grip reorders with Up / Down */
    if(k==='ArrowRight') nx=move(t,1,0); else if(k==='ArrowLeft') nx=move(t,-1,0);
    else if(k==='ArrowDown') nx=move(t,0,1); else if(k==='ArrowUp') nx=move(t,0,-1);
    else if(k==='Home') nx=move(t,0,0,e.ctrlKey?'top':'home'); else if(k==='End') nx=move(t,0,0,e.ctrlKey?'bottom':'end');
    else return;
    e.preventDefault(); if(nx){ setCur(nx); try{ nx.focus(); nx.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(x){} }
  },true);
  document.addEventListener('focusin',function(e){ var t=e.target; if(t&&t.closest&&t.closest('#sheetInner')&&t.getAttribute('tabindex')==='-1'&&rows().some(function(r){ return r.contains(t); })) setCur(t); });
  /* focus back to the cell a drawer was opened from, even when the grid was redrawn meanwhile (it fell to the page) */
  function lost(){ var a=document.activeElement; return !a||a===document.body||a.tagName==='MAIN'; }
  var fKey=null, fRow=null;   /* the cell the person last focused (kept while the grid is redrawn) */
  document.addEventListener('focusin',function(e){ var t=e.target; if(t&&t.closest&&t.closest('#sheetInner')){ fKey=keyOf(t); var g=t.closest('.grow'); fRow=g&&g.getAttribute('data-o'); } },true);
  function refocus(){ if(!lost()) return false; var g=$('#sheetInner'); if(!g) return false; var t=null;
    if(fKey) t=$$('button,[tabindex]',g).filter(function(e){ return keyOf(e)===fKey&&vis(e); })[0]||null;
    if(!t&&fRow){ var row=$('.grow[data-o="'+fRow+'"]',g); if(row){ var L=items(row); t=L.filter(function(e){ return e.matches('.mark'); })[0]||L[0]||null; } }
    if(t){ setCur(t); try{ t.focus({preventScroll:true}); }catch(x){} return true; } return false; }
  function refocusSoon(){ [60,300,700].forEach(function(ms){ setTimeout(refocus,ms); }); }
  function watchDrawer(d){ if(!d||d.__pvx255) return; d.__pvx255=1; var was=d.classList.contains('open');
    new MutationObserver(function(){ var on=d.classList.contains('open'); if(on===was) return; was=on; if(!on) refocusSoon(); }).observe(d,{attributes:true,attributeFilter:['class']}); }
  /* 5. a mark answers anywhere in its cell */
  document.addEventListener('click',function(e){ var c=e.target&&e.target.closest&&e.target.closest('#sheetInner .cell'); if(!c||e.target.closest('.mark,button,a,input')) return;
    var ms=$$('.mark',c).filter(vis); if(!ms.length) return; var best=ms[0];
    if(ms.length>1){ var bd=1e9; ms.forEach(function(m){ var b=m.getBoundingClientRect(), d=Math.abs(b.left+b.width/2-e.clientX)+Math.abs(b.top+b.height/2-e.clientY); if(d<bd){ bd=d; best=m; } }); }
    best.click(); });
  /* 3. skip link */
  function skip(){ if($('.pvx-skip')) return; var a=document.createElement('a'); a.href='#sheetInner'; a.className='pvx-skip'; a.textContent='Skip to the treatment sheet';
    a.addEventListener('click',function(ev){ ev.preventDefault(); var go=function(){ apply(); var t=cur&&cur.isConnected&&vis(cur)?cur:null; if(t){ try{ t.focus(); t.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(x){} } };
      if(!vis($('#sheetInner'))&&window.selectCTab){ try{ selectCTab('sheet'); }catch(x){} setTimeout(go,120); } else go(); });
    document.body.insertBefore(a,document.body.firstChild); }
  /* 4 + 2. order-sheet dialogs: out of the accessibility tree once closed; focus back to the button that opened them */
  var lastOut=null;
  document.addEventListener('focusin',function(e){ if(e.target&&e.target.closest&&!e.target.closest('#tsOrderSheet,#tsCopyMenu,.ts-menu')) lastOut=e.target; },true);
  function watch(h){ if(!h||h.__pvx255) return; h.__pvx255=1; var opener=null, T=0, was=h.classList.contains('show');
    if(!was){ h.setAttribute('inert',''); h.setAttribute('aria-hidden','true'); }
    new MutationObserver(function(){ var on=h.classList.contains('show'); if(on===was) return; was=on; clearTimeout(T);
      if(on){ opener=lastOut; h.removeAttribute('inert'); h.removeAttribute('aria-hidden'); return; }
      var a=document.activeElement;
      if(opener&&opener.isConnected&&vis(opener)&&(!a||a===document.body||h.contains(a)||a.tagName==='MAIN')){ try{ opener.focus({preventScroll:true}); }catch(x){} }
      else if(opener&&!opener.isConnected){ refocusSoon(); }
      T=setTimeout(function(){ if(!h.classList.contains('show')){ h.setAttribute('inert',''); h.setAttribute('aria-hidden','true'); } },350);
    }).observe(h,{attributes:true,attributeFilter:['class']});
  }
  /* 8. Share: from the legend at the window's bottom edge into the sheet toolbar */
  function share(){ var b=document.getElementById('tsCopyBtn'), bar=$('#ctab-sheet .treatment-toolbar')||$('.treatment-toolbar'); if(!b||!bar) return;
    if(b.parentElement!==bar){ var x=$('.ts-expand-btn',bar); bar.insertBefore(b,x||null); }
    if(!b.classList.contains('ts-share-btn')) b.classList.add('btn','ghost','ts-share-btn');
    if(b.getAttribute('aria-label')!=='Share') b.setAttribute('aria-label','Share'); if(b.title!=='Share or print') b.title='Share or print';
    $$('#tsCopyBtn').forEach(function(d){ if(d!==b) d.remove(); }); }
  /* 9. iPhone toolbar: "N from last night" gets its own row; "Today · Tue, 10/27" shows "Today" (the date stays in its label) */
  function compact(){ var bar=$('#ctab-sheet .treatment-toolbar'); if(!bar) return; var narrow=innerWidth<600;
    var dn=$('.ts-daynav',bar), late=$('.dn-late',bar);
    if(late){ if(narrow&&late.parentElement!==bar) bar.insertBefore(late,dn?dn.nextSibling:null); else if(!narrow&&dn&&late.parentElement===bar) dn.appendChild(late); }
    var mid=$('.dn-mid',bar); if(mid){ var dd=$('.dn-d',mid);
      if(narrow&&!dd){ var t=mid.textContent, m=t.match(/^Today · (.+)$/); if(m){ mid.textContent='Today'; var d=document.createElement('span'); d.className='dn-d'; d.textContent=' · '+m[1]; mid.appendChild(d); mid.setAttribute('aria-label',t); } }
      else if(!narrow&&dd){ var full=mid.getAttribute('aria-label')||mid.textContent; mid.textContent=full; mid.removeAttribute('aria-label'); } } }
  var ro=window.ResizeObserver?new ResizeObserver(function(){ sched2(); }):null, roSeen=new WeakSet();
  function fitBar(){ var bar=$('#ctab-sheet .treatment-toolbar'); if(!bar) return;
    if(ro&&!roSeen.has(bar)){ roSeen.add(bar); ro.observe(bar); }   /* n298: the bar's own box; its children are measured below, not watched one by one */
    bar.setAttribute('data-measure',''); var was=bar.getAttribute('data-fit'); bar.removeAttribute('data-fit');
    var nw=getComputedStyle(bar).flexWrap==='nowrap';   /* n284: a toolbar that wraps (iPad) counts its rows of controls */
    if(innerWidth>=600&&bar.getClientRects().length&&!nw){ var over=function(){ var rows=[];
        [].forEach.call(bar.children,function(e){ if(e.matches('.order-search-wrapper,.brief-toggle,.dn-late,.pvx-ur,.ts-more-btn')) return; var q=e.getBoundingClientRect(); if(!(q.width>0&&q.height>0)) return;
          var c=(q.top+q.bottom)/2; if(!rows.some(function(r){ return Math.abs(r-c)<14; })) rows.push(c); }); return rows.length>1; };
      for(var j=1;j<=2&&over();j++) bar.setAttribute('data-fit',String(j)); }
    if(innerWidth>=600&&bar.getClientRects().length&&nw){
      var over=function(){ var r=bar.getBoundingClientRect(), edge=r.right-parseFloat(getComputedStyle(bar).paddingRight)+0.5, m=r.left;
        [].forEach.call(bar.children,function(e){ var q=e.getBoundingClientRect(); if(q.width>0) m=Math.max(m,q.right); }); return m>edge||bar.scrollWidth>bar.clientWidth+1; };
      for(var i=1;i<=3&&over();i++) bar.setAttribute('data-fit',String(i)); }
    void bar.offsetWidth; getComputedStyle(bar.lastElementChild||bar).fontSize; bar.removeAttribute('data-measure'); }
  /* 10. large text: section tabs become symbols only when the patient switcher would otherwise cut the name */
  function fitNav(){ var h=document.documentElement, nm=$('#tsPatientChip .nm'), sw=$('#clinSwitcher'); if(!nm||!sw) return;
    if(h.classList.contains('pvx-ttab')||getComputedStyle(sw).position==='fixed'||tsFsK()<1.15){ h.classList.remove('pvx-snav-icons'); return; }
    var on=h.classList.contains('pvx-snav-icons'); if(on) h.classList.remove('pvx-snav-icons');
    var cut=nm.scrollWidth>nm.clientWidth+1; if(cut) h.classList.add('pvx-snav-icons');
    if(cut) $$('#clinSwitcher .seg').forEach(function(b){ if(!b.title){ var t=b.textContent.replace(/\s+/g,' ').trim(); if(t) b.title=t; } }); }
  var q2=0; function sched2(){ if(q2) return; q2=requestAnimationFrame(function(){ q2=0; try{ compact(); fitBar(); fitNav(); }catch(x){ console.warn('[n255]',x); } }); }
  addEventListener('resize',sched); addEventListener('resize',sched2);
  /* n298: the toolbar, the patient chip and the section switcher are re-measured when they changed (or the toolbar resized, or the window did); a redrawn grid is no reason */
  var FIT='.treatment-toolbar,#tsPatientChip,#clinSwitcher';
  function touches(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i], t=m.target.nodeType===1?m.target:m.target.parentElement; if(t&&t.closest(FIT)) return true;
      if(m.type==='childList'){ var ns=[].slice.call(m.addedNodes).concat([].slice.call(m.removedNodes)); for(var j=0;j<ns.length;j++){ var n=ns[j]; if(n.nodeType===1&&(n.matches(FIT)||n.querySelector(FIT))) return true; } } } return false; }
  var moCb=function(ms){ sched(); if(touches(ms)) sched2(); watch(document.getElementById('tsOrderSheet')); watchDrawer(document.getElementById('completionDrawer')); share(); };
  try{ document.fonts&&document.fonts.ready.then(sched2); }catch(x){}
  function boot(){ skip(); hint(); watch(document.getElementById('tsOrderSheet')); share(); apply(); sched2(); pvxWatch(moCb,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n256 · was index.html line 2911 ════ */
/* PVX-N256 · bar symbols grow with the text size to 1.5× and hold (see patch_n256.py) */
(function(){
  function k(){ return window.tsFsK?tsFsK():Math.max(1,(parseFloat(getComputedStyle(document.documentElement).fontSize)||16)/16); }
  function set(){ var h=document.documentElement, v=k(); h.classList.toggle('pvx-bigtext',v>1.05); h.style.setProperty('--pvx-ik',String(Math.min(v,1.5))); head(); icons(); }
  /* each bar symbol keeps its own size × the factor (Safari doesn't zoom SVG, so the size is set) */
  var SEL='#ctab-sheet .treatment-toolbar svg,#tsSecNav svg,.pt-track svg,.tsh svg,#sheetInner .rl-grip svg';
  function icons(){ var h=document.documentElement, on=h.classList.contains('pvx-bigtext'), f=Math.min(k(),1.5);
    [].forEach.call(document.querySelectorAll(SEL),function(s){
      if(!on){ if(s.hasAttribute('data-pvx-bw')){ s.style.removeProperty('width'); s.style.removeProperty('height'); s.removeAttribute('data-pvx-bw'); s.removeAttribute('data-pvx-bh'); } return; }
      if(!s.hasAttribute('data-pvx-bw')){ var r=s.getBoundingClientRect(); if(!r.width) return; s.setAttribute('data-pvx-bw',r.width); s.setAttribute('data-pvx-bh',r.height); }
      var w=+s.getAttribute('data-pvx-bw')*f, hh=+s.getAttribute('data-pvx-bh')*f;
      if(s.style.width!==w+'px'){ s.style.setProperty('width',w+'px','important'); s.style.setProperty('height',hh+'px','important'); } }); }
  function head(){ var g=document.querySelector('#sheetInner .grow.ghead'); if(!g) return; var hh=Math.round(g.getBoundingClientRect().height); if(hh&&String(hh)+'px'!==document.documentElement.style.getPropertyValue('--pvx-ghh')) document.documentElement.style.setProperty('--pvx-ghh',hh+'px'); }
  var q=0; new MutationObserver(function(){ if(q||!document.documentElement.classList.contains('pvx-bigtext')) return; q=requestAnimationFrame(function(){ q=0; head(); icons(); }); }).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('resize',set);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',set); else set();
})();

/* ════ pvx-n257 · was index.html line 2952 ════ */
/* PVX-N257 · 4. follow the system appearance while open, unless someone chose one (see patch_n257.py) */
(function(){
  var mq=window.matchMedia&&matchMedia('(prefers-color-scheme: light)'); if(!mq) return;
  function chosen(){ return /(?:^|;\s*)pvx_theme=(dark|light)/.test(document.cookie); }
  function apply(){ if(chosen()||!document.body) return; var d=!mq.matches; if(document.body.classList.contains('dark')===d) return;
    document.body.classList.toggle('dark',d); try{ document.documentElement.style.background=d?'#080E1A':'#F2F4F8'; }catch(e){} }
  if(mq.addEventListener) mq.addEventListener('change',apply); else if(mq.addListener) mq.addListener(apply);
})();

/* ════ pvx-n264-ts · was index.html line 3014 ════ */
/* n264 · Treatment Sheets against HIG Modality, Multitasking, Offering help and Onboarding
   (claude/hig-audit-treatment-modality-multitasking-help-onboarding.md) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  var TOUCH=matchMedia('(hover:none)').matches;
  function shown(e){ if(!e||!e.getClientRects().length) return false; var c=getComputedStyle(e); return c.visibility!=='hidden'&&+c.opacity>0.05; }

  /* 2. is a dialog, sheet or menu open? Shortcuts wait until it's closed (HIG Modality: one at a time) */
  window.pvxModalUp=function(){
    if(window.PvxKeys&&PvxKeys.isOpen()) return true;
    if($('#tsModal.show, #tsOrderSheet.show, .drawer.open, #tsTake.show, #tsDowntime.show')) return true;
    return $$('.ts-menu.show, #tsAlertMenu, #tsCopyMenu, #tsReportsMenu, [role=dialog][aria-modal=true], [role=alertdialog]').some(shown);
  };

  /* 1. menus: Esc closes the open one and focus goes back to its button; ↑ ↓ Home End move through it; Tab leaves it */
  var opener=null, openerAt=0, keyAt=0;
  document.addEventListener('pointerdown',function(e){ var b=e.target.closest&&e.target.closest('button,[role=button],a[href]'); if(b&&!b.closest('.ts-menu')){ opener=b; openerAt=Date.now(); } },true);
  document.addEventListener('keydown',function(e){ if(e.key!=='Enter'&&e.key!==' ') return; var b=document.activeElement; if(b&&b!==document.body&&!b.closest('.ts-menu')){ opener=b; openerAt=keyAt=Date.now(); } },true);
  function menus(){ return $$('.ts-menu.show, #tsAlertMenu').filter(function(m){ return !m.matches('[role=dialog]')&&m.getClientRects().length&&getComputedStyle(m).visibility!=='hidden'; }); }  /* not opacity: a menu fades in */
  function itemsOf(m){ return $$('button,[role=menuitem],a[href]',m).filter(function(b){ return !b.disabled&&shown(b); }); }
  function closeMenu(m,back){ if(m.id==='tsPatientMenu') m.classList.remove('show'); else m.remove();
    var o=m._pvxFrom; if(back!==false&&o&&o.isConnected) try{ o.focus({preventScroll:true}); }catch(e){} }
  function tagMenus(){
    menus().forEach(function(m){ if(m._pvxSeen) return; m._pvxSeen=1; m._pvxFrom=(Date.now()-openerAt<1500&&opener)||document.activeElement;
      if(!m.getAttribute('role')&&!$('input,textarea,select',m)){ m.setAttribute('role','menu'); var its=itemsOf(m), radio=its.some(function(b){ return b.classList.contains('on'); });
        its.forEach(function(b){ if(b.getAttribute('role')) return; b.setAttribute('role',radio?'menuitemradio':'menuitem'); if(radio) b.setAttribute('aria-checked',String(b.classList.contains('on'))); }); }
      if(Date.now()-keyAt<900){ var its2=itemsOf(m), f=its2.filter(function(b){ return b.classList.contains('on'); })[0]||its2[0]; f&&f.focus({preventScroll:true}); } });
    $$('.ts-menu').forEach(function(m){ if(m._pvxSeen&&!m.classList.contains('show')) m._pvxSeen=0; });
  }
  window.addEventListener('keydown',function(e){ var ms=menus(); if(!ms.length||e.isComposing) return; var m=ms[ms.length-1];
    if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeMenu(m); return; }
    var a=document.activeElement, inside=m.contains(a);
    if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    if(e.key==='Tab'&&inside){ e.preventDefault(); closeMenu(m); return; }
    if(!/^(ArrowDown|ArrowUp|Home|End)$/.test(e.key)) return;
    var its=itemsOf(m); if(!its.length) return; var i=its.indexOf(a);
    e.preventDefault(); e.stopImmediatePropagation();
    var n=e.key==='Home'?0:e.key==='End'?its.length-1:e.key==='ArrowDown'?(i<0?0:Math.min(its.length-1,i+1)):(i<0?its.length-1:Math.max(0,i-1));
    its[n].focus({preventScroll:true}); },true);

  /* 3. a view-only card closes with its ✕ only */
  function oneClose(){ $$('#tsOrderSheet .op-card').forEach(function(c){ if(!$('.op-x',c)) return;
    $$('button',c).forEach(function(b){ if(b.classList.contains('op-x')||b.hidden||b.textContent.trim()!=='Close') return; b.hidden=true;
      var p=b.parentElement; if(p&&p!==c&&!$$('button,a,input,select,textarea',p).some(function(x){ return !x.hidden&&x!==b; })&&!p.textContent.trim().replace('Close','')) p.hidden=true; }); }); }

  /* 6. tooltips say what a control does; the name is added only when the label is hidden */
  var CT={dash:'see every patient and what’s due', tasks:'see what’s due for your patients, in order', sheet:'chart this patient’s treatments by the hour',
          vitals:'see readings and trends, and take vitals', anes:'open this patient’s anesthesia record', timeline:'see everything charted and changed, in order',
          charges:'mark charges as entered on the invoice', notes:'read and write this patient’s notes'};
  var BD={'My Board':'Show only the patients you care for','OP Board':'Show outpatients','IP Board':'Show admitted patients','Boarding':'Show boarding patients'};
  function cap1(t){ return t.charAt(0).toUpperCase()+t.slice(1); }
  function labelShown(b){ var r=document.createRange(); return [].some.call(b.childNodes,function(n){ if(n.nodeType!==3||!n.nodeValue.trim()) return false; r.selectNodeContents(n); var x=r.getBoundingClientRect(); return x.width>1&&x.height>1; }); }
  function tip(e){ var t=e.target; if(!t||!t.closest) return;
    var s=t.closest('.seg[data-ctab]'); if(s&&CT[s.dataset.ctab]){ var nm=s.getAttribute('aria-label')||''; s.title=labelShown(s)?cap1(CT[s.dataset.ctab]):nm+' — '+CT[s.dataset.ctab]; return; }
    var b=t.closest('.sb-segb[data-board]'); if(b&&BD[b.dataset.board]){ b.dataset.tip=BD[b.dataset.board]; return; }
    b=t.closest('.sb-segb[data-key="H"]'); if(b){ var hrs=/Hours/.test(b.textContent); b.dataset.tip=hrs?'Show each patient’s day by the hour':'Show the patients as a list'; return; }
    b=t.closest('.sb-filters'); if(b){ b.dataset.tip='Choose which patients the board shows'; return; }
    b=t.closest('.ts-audit-btn'); if(b){ b.title='Open the timeline: who charted and changed what'; return; }
    b=t.closest('.ts-gear'); if(b){ b.title='Open Treatment settings'; return; }
    b=t.closest('.ts-search-open'); if(b){ b.title='Search patients and orders'; return; }
    b=t.closest('.treatment-legend [title]'); if(b&&b.title.trim()===b.textContent.trim()) b.removeAttribute('title'); }
  document.addEventListener('mouseover',tip,true); document.addEventListener('focusin',tip,true);

  /* 8. one tip: a whole hour at once (HIG Offering help: a less obvious, faster way; once a day; retired once used or closed) */
  var TK='pvxTipHour', seen={};
  function st(){ try{ return JSON.parse(localStorage.getItem(TK)||'{}')||{}; }catch(e){ return {}; } }
  function put(o){ try{ localStorage.setItem(TK,JSON.stringify(o)); }catch(e){} }
  function retire(){ var o=st(); if(!o.done){ o.done=1; put(o); } var n=$('#pvxTipHour'); n&&n.remove(); }
  var XS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function showTip(){ var o=st(), today=new Date().toDateString(); if(o.done||o.shown===today||$('#pvxTipHour')) return;
    var sc=$('#sheetScroll'); if(!sc||!sc.parentElement) return;
    var d=document.createElement('div'); d.id='pvxTipHour'; d.className='pvx-tip'; d.setAttribute('role','status');
    d.innerHTML='<span>Chart a whole hour at once: '+(TOUCH?'tap':'click')+' its time at the top of the sheet.</span><button type="button" class="pvx-tip-x" aria-label="Close tip">'+XS+'</button>';
    d.querySelector('button').onclick=retire; sc.parentElement.insertBefore(d,sc); o.shown=today; put(o); }
  document.addEventListener('click',function(e){ var t=e.target; if(!t.closest) return;
    if(t.closest('#ctab-sheet .hcell')){ retire(); return; }
    var m=t.closest('#ctab-sheet .mark[data-t]'); if(!m||!/^(overdue|due)$/.test(m.dataset.s||'')) return;
    var p=(m.dataset.t||'').split('_'); if(p.length<3) return; var k=p[0]+'_'+Math.floor(+p[p.length-1]/60);
    (seen[k]=seen[k]||{})[p.slice(1,-1).join('_')]=1; if(Object.keys(seen[k]).length>=3) showTip(); },true);
  document.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('#ctab-sheet .hcell')) retire(); },true);

  /* 7. the Keyboard shortcuts sheet: ? */
  window.pvxTsKeyGroups=function(){ return groups(); };
  /* n295 · HIG Keyboards: Windows lists Ctrl, Alt, Shift in its own order (the Mac keeps Control, Option, Shift, Command), and Ctrl+Y for Redo */
  function groups(){ var mac=!!(window.PvxKeys&&PvxKeys.mac), O={ctrl:0,mod:0,alt:1,shift:2};
    return groups0().map(function(g){ var items=[];
      g.items.forEach(function(it){ var k=it.keys.slice();
        if(!mac){ var m=k.filter(function(x){ return x in O; }).sort(function(a,b){ return O[a]-O[b]; }), r=k.filter(function(x){ return !(x in O); }); k=m.concat(r); }
        items.push({keys:k,label:it.label});
        if(!mac&&it.label==='Redo') items.push({keys:['mod','Y'],label:'Redo'}); });
      return {title:g.title,items:items}; }); }
  function groups0(){ return [
    {title:'General', items:[{keys:['mod','K'],label:'Search patients and orders'},{keys:['?'],label:'Show keyboard shortcuts'}]},
    {title:'Patient tabs', items:[{keys:['alt','1–9'],label:'Go to patient tab 1 to 9'},{keys:['←','→'],label:'Move between tabs (on a tab)'},{keys:['alt','←','→'],label:'Next or previous tab'},{keys:['shift','mod','←','→'],label:'Move the tab left or right (on a tab)'},{keys:['Delete'],label:'Close the tab (on a tab)'}]},
    {title:'Treatment sheet', items:[{keys:['alt','E'],label:'Full view on or off'},{keys:['alt','I'],label:'Show or hide patient info (in full view and on narrow screens)'},{keys:['↑','↓','←','→'],label:'Move around the sheet'},{keys:['Home','End'],label:'Go to the start or end of the row'},{keys:['return'],label:'Chart or open the cell'},
      {keys:['mod','Z'],label:'Undo'},{keys:['shift','mod','Z'],label:'Redo'},{keys:['alt','Click'],label:'Fold or unfold every section (on a section)'}]},
    {title:'Status board', items:[{keys:['1–4'],label:'Your patients, Outpatients, Inpatients, Boarding'},{keys:['H'],label:'Hours or list'}]},
    {title:'Inpatients display', items:[{keys:['←','→'],label:'Turn the page'},{keys:['esc'],label:'Leave the display'}]},
    {title:'Menus and sheets', items:[{keys:['esc'],label:'Close the menu or sheet'},{keys:['mod','.'],label:'Cancel, as Esc does'},{keys:['↑','↓'],label:'Move through a menu'},{keys:['return'],label:'Choose'}]} ]; }

  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ tagMenus(); oneClose(); }catch(e){} }); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    if(window.PvxKeys) PvxKeys.bind(groups,{skip:function(){ return pvxModalUp()||!!document.getElementById('tsTv'); }}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n265-ts · was index.html line 3134 ════ */
/* n265 · Treatment Sheets against HIG Playing audio, Printing, Ratings and reviews, Searching
   (claude/hig-audit-treatment-audio-printing-ratings-searching.md) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent);
  function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function vis(e){ return !!(e&&e.getClientRects().length); }
  function dk(d){ return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'); }

  /* Printing 2. Print… says which day it prints (it said "today" on an earlier day) */
  window.pvxPrintDay=function(){ try{ var v=window.tsViewDk&&tsViewDk(); if(!v||v===dk(new Date())) return 'today';
    return new Date(+v.slice(0,4),+v.slice(4,6)-1,+v.slice(6,8)).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }catch(e){ return 'today'; } };

  /* Printing 1. Tasks prints the task list it shows (it printed the Status board) */
  function stamp(){ var me={}; try{ me=(window.__tsFind&&__tsFind.me())||{}; }catch(e){} var now=new Date();
    var at=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).replace(',','')+' at '+now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    return {at:at, line:'printed '+at+(me.name?' by '+me.name:'')}; }
  function taskRows(){ var root=$('#ctab-tasks'), out=[]; if(!root) return out;
    $$('.wl-sec',root).filter(vis).forEach(function(sec){ var h=$('h3',sec), c=h?h.cloneNode(true):null; if(c) $$('span',c).forEach(function(s){ s.remove(); });
      var g={title:c?c.textContent.replace(/\s+/g,' ').trim():'', rows:[]};
      $$('.wl-pt',sec).filter(vis).forEach(function(pt){ var ph=$('.wl-pth',pt), nm=ph&&$('b',ph)?$('b',ph).textContent.trim():'', sub=ph&&$('span',ph)?$('span',ph).textContent.trim():'';
        $$('.wl-row',pt).forEach(function(r){ var w=$('.wl-what',r); g.rows.push([($('.wl-time',r)||{}).textContent||'', nm, sub, w&&$('b',w)?$('b',w).textContent.trim():'', w&&$('small',w)?$('small',w).textContent.trim():'']); }); });
      if(g.rows.length) out.push(g); });
    return out; }
  window.pvxPrintTasks=function(noPrint){ var root=$('#ctab-tasks'); if(!root) return false;
    var gs=taskRows(), n=gs.reduce(function(a,g){ return a+g.rows.length; },0), st=stamp();
    var seg=$('.wl-seg button.on',root), chip=$('.wl-chip.on',root);
    var scope=[seg?seg.textContent.trim():'', chip&&chip.textContent.trim()!=='All'?chip.textContent.trim():''].filter(Boolean).join(' · ');
    var body=gs.map(function(g){ return '<h4>'+esc(g.title)+' <small>'+g.rows.length+'</small></h4><table class="dp-board dp-tasks"><colgroup><col class="t"><col class="p"><col class="w"><col class="v"><col class="i"></colgroup>'+
      '<thead><tr><th>Time</th><th>Patient</th><th>Task</th><th>Value</th><th>Initials</th></tr></thead><tbody>'+
      g.rows.map(function(r){ return '<tr><td>'+esc(r[0].trim())+'</td><td><b>'+esc(r[1])+'</b><small>'+esc(r[2])+'</small></td><td><b>'+esc(r[3])+'</b>'+(r[4]?'<small>'+esc(r[4])+'</small>':'')+'</td><td></td><td></td></tr>'; }).join('')+'</tbody></table>'; }).join('');
    var html='<section class="dp-page"><div class="dp-band live">TREATMENT · TASKS'+(scope?' · '+esc(scope.toUpperCase()):'')+' · '+n+' task'+(n===1?'':'s')+' · '+esc(st.line)+'</div>'+
      (body||'<p class="dp-none">No tasks in this view.</p>')+'<div class="dp-foot">Printed from Treatment. Tasks in Treatment are current; this page is not. Chart what you do in Treatment.</div></section>';
    var host=$('#tsDtPrint'); if(!host){ host=document.createElement('div'); host.id='tsDtPrint'; host.setAttribute('translate','no'); document.body.appendChild(host); }
    host.innerHTML=html; document.documentElement.classList.add('dt-printing');
    var t0=document.title; document.title=('Treatment tasks – '+st.at).replace(/:/g,'.').replace(/[  ]/g,' ');
    var done=function(){ document.title=t0; document.documentElement.classList.remove('dt-printing'); window.removeEventListener('afterprint',done); };
    window.addEventListener('afterprint',done);
    if(!noPrint) setTimeout(function(){ try{ window.print(); }catch(x){ try{ toast('Couldn’t open printing'); }catch(y){} } setTimeout(done,1500); },60);
    return true; };

  /* Printing 1b. a Print… button on Tasks, as the board has (HIG: make printing discoverable; dimmed when there's nothing to print) */
  var PIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>';
  function printBtn(){ var top=$('#ctab-tasks .wl-top'); if(!top) return; var b=$('.wl-print',top);
    if(!b){ b=document.createElement('button'); b.type='button'; b.className='sb-tvb wl-print'; b.innerHTML=PIC;
      b.onclick=function(){ if(b.getAttribute('aria-disabled')==='true'){ try{ toast('No tasks to print in this view'); }catch(e){} return; } pvxPrintTasks(false); };
      var seg=$('.wl-seg',top); seg&&seg.parentNode===top?top.insertBefore(b,seg.nextSibling):top.appendChild(b); }
    var none=!taskRows().length, key=matchMedia('(hover:hover)').matches?(MAC?' ⌘P':' Ctrl+P'):'';
    b.setAttribute('aria-label','Print the task list…'); b.title=none?'No tasks to print in this view':'Print the task list…'+key;
    if(none) b.setAttribute('aria-disabled','true'); else b.removeAttribute('aria-disabled'); }

  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ printBtn(); }catch(e){} }); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n266-ts · was index.html line 3205 ════ */
/* n266 · Treatment Sheets against HIG Settings, Undo and redo, Charts, Image views
   (claude/hig-audit-treatment-settings-undo-charts-images.md) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  var TOUCH=matchMedia('(hover:none), (pointer:coarse)'), NARROW=matchMedia('(max-width:600px)');

  /* Undo and redo 1. on iPad and iPhone, Undo and Redo in the toolbar, named for what they'll do (HIG: buttons when
     the system has no other way in; standard symbols, in a toolbar). With a keyboard, ⌘Z / ⇧⌘Z as before. */
  var UI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
  var RI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>';
  function group(){ var g=document.createElement('span'); g.className='pvx-ur'; g.setAttribute('role','group'); g.setAttribute('aria-label','Undo and redo');
    g.innerHTML='<button type="button" class="btn ghost pvx-u">'+UI+'</button><button type="button" class="btn ghost pvx-r">'+RI+'</button>';
    g.querySelector('.pvx-u').onclick=function(){ if(this.getAttribute('aria-disabled')!=='true'&&window.pvxTsUndo) pvxTsUndo(); paint(); };
    g.querySelector('.pvx-r').onclick=function(){ if(this.getAttribute('aria-disabled')!=='true'&&window.pvxTsRedo) pvxTsRedo(); paint(); };
    return g; }
  function place(){ if(!TOUCH.matches||!window.pvxTsTop){ $$('.pvx-ur').forEach(function(g){ g.remove(); }); return; }
    /* iPad: before View; iPhone: after the order search, which gives up the room, so the toolbar keeps its rows */
    var slot=$('#ctab-sheet #tsView')||$('#tsView'), os=$('#ctab-sheet .order-search-wrapper'), g=$('#ctab-sheet .pvx-ur')||(slot||os?group():null);
    if(g&&NARROW.matches&&os){ if(os.nextElementSibling!==g) os.parentNode.insertBefore(g,os.nextSibling); }
    else if(g&&slot&&slot.parentNode&&slot.previousElementSibling!==g) slot.parentNode.insertBefore(g,slot);
    var top=$('#ctab-tasks .wl-top'); if(top&&!$('.pvx-ur',top)){ var p=$('.wl-print',top); top.insertBefore(group(),p||null); } }
  function paint(){ if(!window.pvxTsTop) return; var t=pvxTsTop(), any=!!(t[0]||t[1]);
    $$('.pvx-ur').forEach(function(g){ g.hidden=!any; var u=$('.pvx-u',g), r=$('.pvx-r',g);
      u.setAttribute('aria-label',t[0]?'Undo '+t[0]:'Nothing to undo'); u.title=u.getAttribute('aria-label'); t[0]?u.removeAttribute('aria-disabled'):u.setAttribute('aria-disabled','true');
      r.setAttribute('aria-label',t[1]?'Redo '+t[1]:'Nothing to redo'); r.title=r.getAttribute('aria-label'); t[1]?r.removeAttribute('aria-disabled'):r.setAttribute('aria-disabled','true'); }); }

  /* Charts 1. VoiceOver hears times in words: "11 hours late", "7 days ago", "in 4 hours" — not "11 h", "7 d" (HIG: avoid
     ambiguous abbreviations in accessibility labels). What's on screen keeps its short form; "q4h" is a frequency and stays. */
  var RX=/(^|[^\w.])(\d+(?:\.\d+)?)\s?(h|hr|min|d)\b(?![\w\/])/g, RT=/(^|[^\w.])\d+(?:\.\d+)?\s?(h|hr|min|d)\b(?![\w\/])/;
  function spell(t){ return t.replace(RX,function(m,pre,n,u){ var one=+n===1, w=u==='min'?(one?'minute':'minutes'):u==='d'?(one?'day':'days'):(one?'hour':'hours'); return pre+n+' '+w; }); }
  window.pvxSpell=spell;
  /* only the app's own time phrases (the sheet's marks and its Latest column): never words someone typed, such as a snippet */
  function spoken(){ $$('#ctab-sheet .mark[aria-label], #ctab-sheet .rl-trend[aria-label]').forEach(function(e){ var a=e.getAttribute('aria-label'); if(a&&RT.test(a)&&!e.closest('nav.topnav')){ var s=spell(a); if(s!==a) e.setAttribute('aria-label',s); } }); }

  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ place(); paint(); spoken(); }catch(e){} }); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']}); tick();
    try{ TOUCH.addEventListener('change',tick); NARROW.addEventListener('change',tick); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n269-ts · was index.html line 3272 ════ */
/* n269 · Treatment Sheets against HIG Lockups, Outline views, Split views
   (claude/hig-audit-treatment-lockups-outlines-splitviews.md) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)};
  var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent), K=function(l){ return MAC?'⌥'+l:'Alt+'+l; };
  function shown(e){ return !!(e&&e.getClientRects().length&&getComputedStyle(e).display!=='none'); }
  function typing(){ var a=document.activeElement; return !!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)); }
  function say(t){ try{ window.pvxSay&&pvxSay(t); }catch(e){} }

  /* Split views 1. the Patient info pane says whether it's showing (aria-expanded, aria-controls), and a hidden pane
     comes back from the keyboard too: ⌥E full view on and off, ⌥I patient info (HIG: several ways to reveal a hidden pane) */
  function paint(){
    var t=$('#ctab-sheet .brief-toggle'), s=$('#clinSidebar');
    if(t&&s){ var open=s.classList.contains('open'); if(t.getAttribute('aria-expanded')!==String(open)) t.setAttribute('aria-expanded',String(open));
      if(t.getAttribute('aria-controls')!=='clinSidebar') t.setAttribute('aria-controls','clinSidebar'); t.setAttribute('aria-keyshortcuts','Alt+I');
      var tt=(open?'Hide patient info':'Show patient info')+' · '+K('I'); if(t.title!==tt) t.title=tt; }
    var x=$('#ctab-sheet .ts-expand-btn'); if(x){ x.setAttribute('aria-keyshortcuts','Alt+E'); var b=(x.title||'').replace(/ · (⌥|Alt\+)E$/,''); if(b&&x.title!==b+' · '+K('E')) x.title=b+' · '+K('E'); } }
  window.addEventListener('keydown',function(e){ if(!e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||e.isComposing||typing()) return;
    if(e.code!=='KeyE'&&e.code!=='KeyI') return; if(typeof currentCTab!=='undefined'&&currentCTab!=='sheet') return;
    var s=$('#clinSidebar'), briefOpen=!!(s&&s.classList.contains('open'));
    if(window.pvxModalUp&&pvxModalUp()&&!briefOpen) return;
    if(e.code==='KeyE'){ var x=$('#ctab-sheet .ts-expand-btn'); if(!shown(x)) return; e.preventDefault(); if(briefOpen) try{ closeBrief(); }catch(z){}
      var on=!document.body.classList.contains('ts-expand'); x.click(); say(on?'Full view':'Full view off'); setTimeout(paint,300); return; }
    var t=$('#ctab-sheet .brief-toggle'); if(!shown(t)) return;   /* the pane is already beside the sheet */
    e.preventDefault(); if(briefOpen){ try{ closeBrief(); }catch(z){} try{ t.focus({preventScroll:true}); }catch(z){} say('Patient info hidden'); }
    else { try{ openBrief(); }catch(z){} say('Patient info'); }
    setTimeout(paint,30); },true);

  /* Split views 3. the Patient info drawer is on top of its scrim and below the bars. It sat under its own scrim (they
     were in different layers), so it was dimmed and a tap inside it closed it; and its top was under the app's bars. */
  function scrim(){ var sc=document.getElementById('briefScrim'); if(!sc){ sc=document.createElement('div'); sc.className='brief-scrim'; sc.id='briefScrim'; sc.setAttribute('onclick','closeBrief()'); document.body.appendChild(sc); } return sc; }
  function barsBottom(){ var b=0; ['nav.topnav','.subnav','.pt-row'].forEach(function(q){ var e=$(q); if(!shown(e)) return; var r=e.getBoundingClientRect(); if(r.bottom>b&&r.bottom<innerHeight/2) b=r.bottom; }); return Math.round(b); }
  function wrap(){ if(!window.openBrief||openBrief._pvx269) return; var oO=window.openBrief, oC=window.closeBrief;
    window.openBrief=function(){ var s=$('#clinSidebar'), sc=scrim(); if(s&&s.parentElement&&sc.nextSibling!==s) s.parentElement.insertBefore(sc,s);
      if(s) s.style.setProperty('--pvx-brief-top',(barsBottom()+12)+'px'); var r=oO.apply(this,arguments); setTimeout(paint,30); return r; };
    window.openBrief._pvx269=1;
    window.closeBrief=function(){ scrim(); var r=oC.apply(this,arguments); setTimeout(function(){ var sc=document.getElementById('briefScrim'), s=$('#clinSidebar');
        if(sc&&!sc.classList.contains('show')&&sc.parentElement!==document.body) document.body.appendChild(sc); if(s&&!s.classList.contains('open')) s.style.removeProperty('--pvx-brief-top'); paint(); },320); return r; }; }

  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ wrap(); paint(); }catch(e){} }); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n282-ts · was index.html line 3409 ════ */
/* n282 · HIG Dock menus and Home Screen quick actions: the app's shortcuts (manifest) open where they say.
   #view=tasks → Tasks · #view=mine → the board, Your patients · #find → the patient search (as ⌘K).
   Applied once the app has drawn (and again on hashchange); the address is then tidied, as #display= is. */
(function(){
  function want(){ var h=String(location.hash||''); var m=/^#(?:.*&)?(view=(tasks|mine)|find)(?:&|$)/.exec(h); return m?(m[2]||'find'):null; }
  function tidy(){ try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
  function find(){ var i=document.getElementById('globalSearch'); if(!i) return false; var s=i.closest('.search'), b=s&&s.querySelector('.ts-search-open');
    if(b&&getComputedStyle(b).display!=='none'&&b.getAttribute('aria-hidden')==='false') b.click(); else i.focus(); try{ i.select(); }catch(e){} return true; }
  var W=want();   /* read now: the app tidies the address while it starts */
  function go(){ var w=W; if(!w) return true; if(typeof selectCTab!=='function') return false;
    try{ if(w==='tasks') selectCTab('tasks');
      else if(w==='mine'){ if(typeof setSbBoard==='function') setSbBoard('My Board'); selectCTab('dash'); }
      else { if(!find()) return false; } }catch(e){ return false; }
    W=null; if(want()) tidy(); return true; }
  var tries=0; function boot(){ if(go()||++tries>40) return; setTimeout(boot,250); }
  if(document.readyState==='complete') setTimeout(boot,600); else window.addEventListener('load',function(){ setTimeout(boot,600); });
  window.addEventListener('hashchange',function(){ var w=want(); if(!w) return; W=w; tries=0; boot(); });
})();

/* ════ pvx-n283-ts · was index.html line 3430 ════ */
/* n283 · HIG Menus and Pop-up buttons (claude/hig-audit-treatment-menus-ornaments-popups.md)
   · Display and Filters say they open something; Display's list is a menu, and ↑ ↓ Home End move through it
   · View's Collapse all / Expand all are menu items
   · in Tech and Location, typing a letter moves to the first name that starts with it */
(function(){
  var $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  function shown(e){ if(!e||!e.getClientRects().length) return false; var c=getComputedStyle(e); return c.visibility!=='hidden'&&+c.opacity>0.05; }
  var TV='.sb-tvb[onclick^="tsTvPick"]';   /* Display (Reports shares the class and keeps its own state) */
  function tag(){
    $$(TV).forEach(function(b){ if(b.getAttribute('aria-haspopup')!=='menu') b.setAttribute('aria-haspopup','menu'); });
    $$('.sb-filters').forEach(function(b){ if(!b.getAttribute('aria-haspopup')) b.setAttribute('aria-haspopup','true'); });
    var pop=document.getElementById('flPop');
    $$(TV+',.sb-filters,.ts-view-btn').forEach(function(b){ var v=String(!!pop&&b.classList.contains('active')); if(b.getAttribute('aria-expanded')!==v) b.setAttribute('aria-expanded',v); });
    if(!pop) return;
    $$('.tv-pick',pop).forEach(function(m){ if(m.getAttribute('role')) return; m.setAttribute('role','menu'); m.setAttribute('aria-label','Inpatients on a TV');
      $$('.fp-row',m).forEach(function(b){ b.setAttribute('role','menuitem'); }); });
    $$('.vw-pop .vw-all button',pop).forEach(function(b){ if(!b.getAttribute('role')) b.setAttribute('role','menuitem'); });
  }
  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ tag(); }catch(e){} }); }
  function items(m){ return $$('[role^=menuitem]',m).filter(function(b){ return !b.disabled&&shown(b); }); }
  var buf='', bufAt=0;
  window.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey||e.isComposing) return;
    var a=document.activeElement; if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    /* ↑ ↓ Home End in Display's menu and View's (the other menus have this since n264) */
    var pop=document.getElementById('flPop'), pm=pop&&pop.querySelector('[role=menu]');
    if(pm&&/^(ArrowDown|ArrowUp|Home|End)$/.test(e.key)&&(pop.contains(a)||(a&&a.classList&&a.classList.contains('active')))){
      var its=items(pm); if(!its.length) return; var i=its.indexOf(a); e.preventDefault(); e.stopImmediatePropagation();
      var n=e.key==='Home'?0:e.key==='End'?its.length-1:e.key==='ArrowDown'?(i<0?0:Math.min(its.length-1,i+1)):(i<0?its.length-1:Math.max(0,i-1));
      its[n].focus({preventScroll:true}); return; }
    /* type to select, in Tech and Location */
    if(e.key.length!==1||!/\S/.test(e.key)) return;
    var m=$$('.ts-tech-menu.show').filter(shown).pop(); if(!m) return;
    var now=Date.now(); buf=(now-bufAt>700?'':buf)+e.key.toLowerCase(); bufAt=now;
    var bs=$$('button',m).filter(shown), name=function(b){ var t=b.querySelector('b'); return ((t||b).textContent||'').trim().toLowerCase(); };
    var from=bs.indexOf(a), rot=bs.slice(from+1).concat(bs.slice(0,from+1));
    var hit=(buf.length===1?rot:bs).filter(function(b){ return name(b).indexOf(buf)===0; })[0];
    if(hit){ e.preventDefault(); e.stopImmediatePropagation(); hit.focus({preventScroll:false}); }
  },true);
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); tag(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n284-ts · was index.html line 3475 ════ */
/* n284 · HIG Toolbars, Pull-down buttons (claude/hig-audit-treatment-pulldowns-menubar-toolbars.md)
   1. the window's title names what's on screen, not the app ("Biscuit Training · Vitals", "Tasks")
   2. iPhone: View, Audit and Expand the sheet in a More (•••) menu beside Share */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)};
  var BASE=document.title, last=null, printing=false;
  addEventListener('beforeprint',function(){ printing=true; }); addEventListener('afterprint',function(){ printing=false; setTimeout(title,300); });
  function shown(e){ return !!(e&&e.getClientRects().length); }
  function want(){
    var tab=typeof currentCTab!=='undefined'?currentCTab:null; if(!tab||shown($('#sbLogin'))) return BASE;   /* signed out: the app's name */
    if(document.getElementById('tsTv')) return null;   /* the ward display keeps what it had */
    var seg=$('.seg[data-ctab="'+tab+'"]'), sec=seg?(seg.getAttribute('aria-label')||seg.textContent).trim():'';
    if(!sec) return BASE;
    if(tab==='dash'||tab==='tasks') return sec;
    var nm=$('#tsHdr .tsh-name > span:first-child'), n=nm?nm.textContent.replace(/\s+/g,' ').trim():'';
    return n?n+' · '+sec:sec; }
  function title(){ if(printing) return; var cur=document.title; if(cur!==BASE&&cur!==last) return;   /* set by someone else (printing names the file) */
    var w=want(); if(w&&w!==cur){ document.title=w; last=w; } }

  var MORE='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>';
  var CHEV='<svg class="mo-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function more(){ var bar=$('#ctab-sheet .treatment-toolbar'); if(!bar) return; var b=$('.ts-more-btn',bar);
    if(!b){ b=document.createElement('button'); b.type='button'; b.className='btn ghost ts-more-btn'; b.setAttribute('aria-label','More'); b.title='More';
      b.setAttribute('aria-haspopup','menu'); b.setAttribute('aria-expanded','false'); b.innerHTML=MORE; b.onclick=open; }
    if(b.parentElement!==bar||b.nextElementSibling) bar.appendChild(b);
    var v=String(!!document.getElementById('flPop')&&b.classList.contains('active')); if(b.getAttribute('aria-expanded')!==v) b.setAttribute('aria-expanded',v); }
  function open(e){ e.stopPropagation(); var b=e.currentTarget, x=document.getElementById('tsExpandBtn'), on=x&&x.getAttribute('aria-pressed')==='true';
    var row=function(a,label,sub,extra,tail,cls){ return '<button type="button" class="fp-row wf-row'+(cls||'')+'" data-a="'+a+'" '+extra+'><span class="fp-lab"><b>'+esc(label)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>'+(tail||'')+'</button>'; };
    var pop=_openPop(b,'<div class="sb-filter-pop wf-pop ts-more-pop" role="menu" aria-label="More">'+
      row('view','View','Rows and sections','role="menuitem" aria-haspopup="menu"',CHEV)+
      row('audit','Audit','Who charted and changed what','role="menuitem"')+
      (x?row('expand',(x.getAttribute('aria-label')||'Expand the sheet'),'Full view · the sheet takes the whole screen','role="menuitemcheckbox" aria-checked="'+on+'"','<i class="wf-ck"></i>',(on?' on':'')):'')+'</div>');
    var root=(pop&&pop.querySelectorAll)?pop:document.getElementById('flPop');
    [].forEach.call(root.querySelectorAll('[data-a]'),function(r){ r.onclick=function(ev){ ev.stopPropagation(); var a=r.getAttribute('data-a'); _closePop();
      if(a==='view'&&window.tsViewOpen) tsViewOpen(b);
      else if(a==='audit'){ var u=$('#ctab-sheet .ts-audit-btn'); u&&u.click(); }
      else if(a==='expand'){ var y=document.getElementById('tsExpandBtn'); y&&y.click(); } }; });
    if(e.detail===0){ var f=root.querySelector('[data-a]'); f&&f.focus({preventScroll:true}); } }
  /* iPhone: the add field's hint fits the narrower field */
  function hint(){ var i=document.getElementById('tsSearch'); if(!i) return; var ph=i.placeholder, EN='Add treatment…', ES='Agregar tratamiento…';
    if(innerWidth<600){ if(ph===EN||ph===ES) return; var s=/^Add treatment or template/.test(ph)?EN:/^Agregar tratamiento o plantilla/.test(ph)?ES:null; if(s){ i.dataset.ph=ph; i.placeholder=s; } }
    else if((ph===EN||ph===ES)&&i.dataset.ph) i.placeholder=i.dataset.ph; }   /* only the default hint; "Add to Observations…" is left as it is */
  addEventListener('resize',function(){ tick(); });
  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ title(); }catch(x){} try{ more(); }catch(x){} try{ hint(); }catch(x){} }); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-pressed']}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n285-ts · was index.html line 3526 ════ */
/* n285 · HIG Search fields (claude/hig-audit-treatment-pathcontrols-searchfields-sidebars.md):
   Vitals' filter and Add a charge's finder get a Clear button; Esc clears what's typed; Return says Search */
(function(){
  var X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var Q='<svg class="pvx-sf-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
  function sf(i,wrap){ if(i._pvxSf) return; i._pvxSf=1;
    i.setAttribute('role','searchbox'); i.setAttribute('enterkeyhint','search'); i.setAttribute('autocomplete','off');
    var host=i.parentElement;
    if(wrap){ host=document.createElement('span'); host.className='pvx-sfw'; i.parentElement.insertBefore(host,i); host.innerHTML=Q; host.appendChild(i); }
    var x=document.createElement('button'); x.type='button'; x.className='pvx-sf-x'; x.setAttribute('aria-label','Clear'); x.title='Clear'; x.innerHTML=X; host.appendChild(x);
    function sync(){ x.hidden=!i.value; }
    function clear(){ i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); sync(); }
    x.addEventListener('mousedown',function(e){ e.preventDefault(); });   /* the field keeps focus */
    x.onclick=function(e){ e.stopPropagation(); clear(); var j=fresh(i); try{ j.focus({preventScroll:true}); }catch(t){} };
    i.addEventListener('input',sync);
    i.addEventListener('keydown',function(e){ if(e.key==='Escape'&&i.value){ e.preventDefault(); e.stopPropagation(); clear(); } });
    sync(); }
  /* Vitals redraws its header: the field typed in may have been replaced */
  function fresh(i){ return i.isConnected?i:(document.querySelector('.v-filter input')||i); }
  function scan(){ [].forEach.call(document.querySelectorAll('.v-filter input'),function(i){ sf(i,false); });
    [].forEach.call(document.querySelectorAll('#tsOrderSheet .ch-q'),function(i){ sf(i,true); }); }
  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ scan(); }catch(x){} }); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n286-ts · was index.html line 3554 ════ */
/* n286 · HIG Token fields (claude/hig-audit-treatment-tabbars-tokenfields-actionsheets.md):
   ; adds a problem as Return does; each problem has a context menu (Edit, Mark resolved, Move up, Move down, Remove) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  document.addEventListener('keydown',function(e){ var i=e.target; if(e.key!==';'||e.isComposing||!i||!i.closest||!i.closest('.pl-add')) return;
    e.preventDefault(); if(String(i.value||'').trim()&&window.tsProbAdd) tsProbAdd(i.closest('.pl-add')); },true);

  var menu=null;
  function close(back){ if(!menu) return; var m=menu; menu=null; m.remove(); if(back!==false&&m._from&&m._from.isConnected) try{ m._from.focus({preventScroll:true}); }catch(x){} }
  function name(row){ var t=$('.pl-t',row)||$('.pl-txt',row); return t?t.textContent.trim():''; }
  function open(row,x,y,from,kbd){ close(false); var id=row.getAttribute('data-id'); if(!id) return;
    if(menu&&!menu.isConnected) menu=null; var rows=$$('.pl-row',row.parentElement).filter(function(r){ return !r.classList.contains('res'); });
    var ck=$('.pl-ck',row), nm=name(row), idx=rows.indexOf(row), resolved=idx<0;
    var ckLab=ck?String(ck.getAttribute('aria-label')||'').replace(nm,'').trim():''; ckLab=/^Resolve/i.test(ckLab)?'Mark resolved':'Restore';
    var it=[]; if(!resolved&&$('.pl-txt',row)) it.push(['edit','Edit']); if(ck) it.push(['ck',ckLab]);
    if(!resolved&&idx>0) it.push(['up','Move up']); if(!resolved&&idx>-1&&idx<rows.length-1) it.push(['down','Move down']);
    var m=document.createElement('div'); m.className='ts-menu ts-pl-menu show'; m.setAttribute('role','menu'); m.setAttribute('aria-label',nm);
    m.innerHTML=it.map(function(a){ return '<button type="button" role="menuitem" data-a="'+a[0]+'">'+a[1]+'</button>'; }).join('')+
      ($('.pl-x',row)?(it.length?'<div class="ts-tm-sep" role="separator"></div>':'')+'<button type="button" role="menuitem" class="danger" data-a="rm">Remove</button>':'');
    document.body.appendChild(m); m._pvxSeen=1; m._from=m._pvxFrom=from||$('.pl-grip',row)||$('.pl-ck',row); menu=m;
    var w=m.offsetWidth, h=m.offsetHeight; m.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+'px'; m.style.top=Math.max(8,Math.min(innerHeight-h-8,y))+'px';
    m.addEventListener('click',function(ev){ var b=ev.target.closest('[data-a]'); if(!b) return; var a=b.getAttribute('data-a'); close(false);
      var r=document.querySelector('.pl-row[data-id="'+id+'"]')||row;
      if(a==='edit'){ var t=$('.pl-txt',r); t&&window.tsProbEdit&&tsProbEdit(id,t); }
      else if(a==='ck'){ var c=$('.pl-ck',r); c&&c.click(); }
      else if(a==='up'||a==='down'){ if(window.tsProbMove&&tsProbMove(id,idx+(a==='up'?-1:1))){ window.pvxSay&&pvxSay(nm+' moved to #'+(idx+(a==='up'?0:2)));
          setTimeout(function(){ var g=$('.pl-row[data-id="'+id+'"] .pl-grip'); g&&g.focus({preventScroll:true}); },60); } }
      else if(a==='rm'){ var xb=$('.pl-x',r); xb&&xb.click(); } });
    var f=$('[data-a]',m); if(kbd&&f) f.focus({preventScroll:true});
    setTimeout(function(){ document.addEventListener('mousedown',function out(ev){ if(menu&&!menu.contains(ev.target)){ close(false); } document.removeEventListener('mousedown',out,true); },true); },0); }
  document.addEventListener('contextmenu',function(e){ var row=e.target.closest&&e.target.closest('.pl-row'); if(!row||(e.target.closest('input'))) return;
    e.preventDefault(); var kb=e.button!==2&&e.clientX===0&&e.clientY===0; var r=row.getBoundingClientRect();
    open(row,kb?r.left+24:e.clientX,kb?r.bottom+4:e.clientY,document.activeElement&&row.contains(document.activeElement)?document.activeElement:null,kb); });
  document.addEventListener('keydown',function(e){ var g=e.target; if(!g||!g.closest||!g.closest('.pl-row')||g.tagName==='INPUT') return;
    if(e.key==='ContextMenu'||(e.key==='F10'&&e.shiftKey)){ e.preventDefault(); var row=g.closest('.pl-row'), r=row.getBoundingClientRect(); open(row,r.left+24,r.bottom+4,g,true); } },true);
  /* touch and hold (0.5 s) on the problem's name; the tap that follows doesn't also start editing */
  var T=0, sx=0, sy=0, held=false;
  document.addEventListener('pointerdown',function(e){ if(e.pointerType!=='touch') return; var row=e.target.closest&&e.target.closest('.pl-row'); if(!row||!e.target.closest('.pl-txt')) return;
    sx=e.clientX; sy=e.clientY; held=false; clearTimeout(T); T=setTimeout(function(){ held=true; open(row,sx,sy+8,null,false); },500); },true);
  document.addEventListener('pointermove',function(e){ if(T&&(Math.abs(e.clientX-sx)>8||Math.abs(e.clientY-sy)>8)){ clearTimeout(T); T=0; } },true);
  document.addEventListener('pointerup',function(){ clearTimeout(T); T=0; },true);
  document.addEventListener('click',function(e){ if(held&&e.target.closest&&e.target.closest('.pl-txt')){ held=false; e.preventDefault(); e.stopImmediatePropagation(); } },true);
  window.addEventListener('keydown',function(e){ if(menu&&e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); close(true); } },true);
  window.addEventListener('scroll',function(){ menu&&close(false); },true);
})();

/* ════ pvx-n287-ts · was index.html line 3602 ════ */
/* n287 · HIG Alerts (claude/hig-audit-treatment-alerts-pagecontrols-panels.md):
   ⌘. cancels like Esc; a question is an alert (alertdialog, described by its message); a confirmation that replaces or
   deletes something has no default — focus goes to the alert itself */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)};
  function shown(e){ return !!(e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'); }
  var DESTRUCTIVE=/^(replace|stop|delete|remove|clear|erase|discard)\b/i;
  function alertify(){ var m=$('#tsModal'); if(!m||!m.classList.contains('show')) return; var c=$('.tm-card',m); if(!c||c._pvxA) return;
    var h=$('h3',c), t=h?h.textContent.trim():''; if(!/\?$/.test(t)) return; c._pvxA=1;
    c.setAttribute('role','alertdialog'); if(!h.id) h.id='pvxAt'+Date.now().toString(36); c.setAttribute('aria-labelledby',h.id);
    var p=$('p',c); if(p&&p.textContent.trim()){ if(!p.id) p.id='pvxAm'+Date.now().toString(36); c.setAttribute('aria-describedby',p.id); }
    var ok=$('[data-ok]',c);
    if(ok&&DESTRUCTIVE.test(ok.textContent.trim())){ c.setAttribute('tabindex','-1'); c._pvxNoDefault=1; ok.classList.remove('primary');
      [120,260].forEach(function(ms){ setTimeout(function(){ if(!c.isConnected||!m.classList.contains('show')) return; var a=document.activeElement;
        if(a===c||(a&&a.tagName==='INPUT'&&c.contains(a))) return; try{ c.focus({preventScroll:true}); }catch(x){} },ms); }); } }
  var q=0; function tick(){ if(q) return; q=requestAnimationFrame(function(){ q=0; try{ alertify(); }catch(x){} }); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();

  /* ⌘. / Ctrl+. : the same as Esc for whatever is on top */
  window.addEventListener('keydown',function(e){ if(e.key!=='.'||!(e.metaKey||e.ctrlKey)||e.altKey||e.shiftKey) return;
    var d=[].slice.call(document.querySelectorAll('.pvx-discard')).filter(shown).pop();
    var hit=null;
    if(d) hit=$('[data-keep]',d);
    else if(window.PvxKeys&&PvxKeys.isOpen()){ e.preventDefault(); e.stopImmediatePropagation(); PvxKeys.close(); return; }
    else if($('#tsModal.show')) hit=$('#tsModal.show [data-x]');
    else if($('#tsOrderSheet.show')) hit=[].slice.call(document.querySelectorAll('#tsOrderSheet .op-x')).filter(shown).pop();
    else { var dr=[].slice.call(document.querySelectorAll('.drawer.open')).filter(shown).pop(); if(dr) hit=$('.close',dr)||$('[aria-label=Close]',dr); }
    if(!hit) return; e.preventDefault(); e.stopImmediatePropagation(); hit.click(); },true);
})();

/* ════ pvx-n288-ts · was index.html line 3668 ════ */
/* n288 · HIG Popovers, Scroll views, Sheets and Windows (claude/hig-audit-treatment-popovers-scrollviews-sheets-windows.md) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  var PHONE=matchMedia('(max-width:599px)'), RM=matchMedia('(prefers-reduced-motion: reduce)');
  function shown(e){ return !!(e&&e.isConnected&&e.getClientRects().length); }

  /* ---------- 1. keyboard scrolling when nothing has focus ---------- */
  function scroller(){
    var pts=[[innerWidth/2,innerHeight*0.6],[innerWidth/2,innerHeight*0.45]];
    for(var i=0;i<pts.length;i++){ var el=document.elementFromPoint(pts[i][0],pts[i][1]);
      while(el&&el!==document.body&&el!==document.documentElement){ var cs=getComputedStyle(el);
        if(/(auto|scroll)/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+2) return el; el=el.parentElement; } }
    var s=document.scrollingElement; return s&&s.scrollHeight>s.clientHeight+2?s:null; }
  window.addEventListener('keydown',function(e){ if(e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.isComposing) return;
    var k=e.key; if(!/^(PageDown|PageUp| |Home|End|ArrowDown|ArrowUp)$/.test(k)) return;
    var a=document.activeElement; if(a&&a!==document.body&&a!==document.documentElement) return;
    if((window.pvxModalUp&&pvxModalUp())||$('#flPop')||$('.ts-menu.show')||$('.pt-pop.show')||$('.ts-copymenu')||$('#tsTv')) return;
    var sc=scroller(); if(!sc) return; e.preventDefault();
    var page=Math.max(40,sc.clientHeight-48), b=RM.matches?'auto':'smooth';
    if(k==='Home') sc.scrollTo({top:0,behavior:b}); else if(k==='End') sc.scrollTo({top:sc.scrollHeight,behavior:b});
    else sc.scrollBy({top:k==='PageDown'||(k===' '&&!e.shiftKey)?page:k==='PageUp'||k===' '?-page:k==='ArrowDown'?40:-40,behavior:b}); });

  /* ---------- 2. iPhone: the grid is as tall as the area it scrolls in ---------- */
  var lastH=0; function fit(){ var st=$('.stage'); if(!st) return; var h=st.clientHeight; if(h>0&&h!==lastH){ lastH=h; document.documentElement.style.setProperty('--pvx-stage-h',h+'px'); } }
  addEventListener('resize',fit); addEventListener('orientationchange',function(){ setTimeout(fit,300); });
  /* n298: the stage's size is watched, not re-read after every change on the page */
  var sro=window.ResizeObserver?new ResizeObserver(function(){ fit(); }):null;
  function fitWatch(){ var st=$('.stage'); if(sro&&st&&!st.__pvx288){ st.__pvx288=1; sro.observe(st); } }

  /* ---------- 3. iPhone: View and Filters as a sheet ---------- */
  var scrim=null, popWasSheet=false;
  function unScrim(){ if(scrim){ var s=scrim; scrim=null; s.classList.remove('on'); setTimeout(function(){ s.remove(); },380); } }
  function popSheet(){ var f=$('#flPop');
    if(!f){ popWasSheet=false; unScrim(); return; }
    var menu=!!f.querySelector('[role=menu]:not(.vw-pop)'), want=PHONE.matches&&(!!f.querySelector('.vw-pop')||(!menu&&(!!f.querySelector('.wf-pop')||popWasSheet)));
    if(!want){ if(f.classList.contains('pvx-as-sheet')){ f.classList.remove('pvx-as-sheet'); f.removeAttribute('role'); f.removeAttribute('aria-modal'); } popWasSheet=false; unScrim(); return; }
    if(!f.classList.contains('pvx-as-sheet')){ f.classList.add('pvx-as-sheet'); f.setAttribute('role','dialog'); f.setAttribute('aria-modal','true');
      if(!f.getAttribute('aria-label')) f.setAttribute('aria-label',f.querySelector('.vw-pop')?'View':'Filters'); }
    popWasSheet=true;
    if(!scrim){ scrim=document.createElement('div'); scrim.className='pvx-pop-scrim'; scrim.setAttribute('aria-hidden','true'); document.body.insertBefore(scrim,f);
      requestAnimationFrame(function(){ scrim&&scrim.classList.add('on'); }); } }

  /* ---------- 4. iPhone: forms as sheets from the bottom, Cancel and the action at the top ---------- */
  function formSheet(){ var m=$('#tsModal'); if(!m||!m.classList.contains('show')) return; var c=$('.tm-card',m); if(!c) return;
    if(!PHONE.matches){ return; }
    if(!c._pvxIs){ var foot=$(':scope > .tm-foot',c);
      if(c.getAttribute('role')==='alertdialog'||!foot||!foot.querySelector('[data-x]')||!foot.querySelector('[data-ok]')||!c.querySelector('input:not([type=hidden]),select,textarea')) return;
      c._pvxIs=1; c.classList.add('pvx-isheet'); } }

  /* ---------- swipe down to close (iPhone sheets) ---------- */
  var S=null;
  function sheetAt(t){ if(!PHONE.matches||!t||!t.closest) return null; var c=t.closest('#flPop.pvx-as-sheet, #tsOrderSheet .op-card, #tsModal .tm-card.pvx-isheet'); return c&&shown(c)?c:null; }
  function close(c){ if(c.id==='flPop'){ window._closePop&&_closePop(); return; }
    if(c.classList.contains('op-card')){ var x=$$('#tsOrderSheet .op-x').filter(shown).pop(); x&&x.click(); return; }
    var b=$('#tsModal.show [data-x]'); b&&b.click(); }
  document.addEventListener('touchstart',function(e){ if(e.touches.length!==1) return; var t=e.target, c=sheetAt(t); if(!c) return;
    if(t.closest('input,select,textarea,button,a,[role=slider]')) return; var r=c.getBoundingClientRect(), y=e.touches[0].clientY;
    var inBar=c.classList.contains('pvx-isheet')&&t.closest('.tm-foot'); if(!inBar&&(y-r.top>36||c.scrollTop>0)) return;
    S={c:c,y0:y,x0:e.touches[0].clientX,t0:Date.now(),dy:0,on:false}; },{capture:true,passive:true});
  document.addEventListener('touchmove',function(e){ if(!S) return; var p=e.touches[0], dy=p.clientY-S.y0, dx=p.clientX-S.x0;
    if(!S.on){ if(dy>8&&Math.abs(dx)<dy){ S.on=true; S.c.classList.add('pvx-swiping'); } else if(dy<-4||Math.abs(dx)>12){ S=null; return; } else return; }
    e.preventDefault(); S.dy=Math.max(0,dy); S.c.style.transform='translateY('+S.dy+'px)'; },{capture:true,passive:false});
  function end(){ if(!S) return; var s=S; S=null; if(!s.on) return; var v=s.dy/Math.max(1,Date.now()-s.t0);
    s.c.classList.remove('pvx-swiping'); s.c.style.transition=RM.matches?'none':'transform .2s cubic-bezier(.2,.8,.2,1)'; s.c.style.transform='';
    setTimeout(function(){ s.c.style.transition=''; },220);
    if(s.dy>100||(s.dy>40&&v>0.5)) close(s.c); }
  document.addEventListener('touchend',end,true); document.addEventListener('touchcancel',end,true);

  /* ---------- 5. Windows: open a sheet in a new window ---------- */
  var MAC=/Mac|iPhone|iPad/.test(navigator.platform||'')||/Mac OS X/.test(navigator.userAgent);
  function sheetOf(t){ if(!t||!t.closest) return null; var tab=t.closest('.pt-tab[data-id]'); if(tab) return t.closest('.pt-x')?null:tab.getAttribute('data-id');
    var row=t.closest('.sb-row[data-id]'); return row?row.getAttribute('data-id'):null; }
  function openWin(id){ var u=location.origin+location.pathname+location.search+'#sheet='+encodeURIComponent(id)+'&win=1';
    window.open(u,'_blank'); window.pvxSay&&pvxSay('Opened in a new window'); }
  window.pvxOpenSheetWindow=openWin;
  document.addEventListener('click',function(e){ if(!(MAC?e.metaKey:e.ctrlKey)||e.altKey) return; var id=sheetOf(e.target); if(!id) return;
    e.preventDefault(); e.stopImmediatePropagation(); openWin(id); },true);
  document.addEventListener('mousedown',function(e){ if(e.button===1&&sheetOf(e.target)) e.preventDefault(); },true);
  document.addEventListener('auxclick',function(e){ if(e.button!==1) return; var id=sheetOf(e.target); if(!id) return; e.preventDefault(); e.stopImmediatePropagation(); openWin(id); },true);
  /* the new window opens on that patient's sheet */
  (function(){ var h=location.hash||'', m=/[#&]win=1\b/.test(h)&&(h.match(/sheet=([^&]+)/)||[])[1]; if(!m) return; var id=decodeURIComponent(m), t0=Date.now(), ok=0;
    (function go(){ if(Date.now()-t0>15000) return; var cur=null; try{ cur=localStorage.getItem('tsCurrentSheet'); }catch(x){}
      var tab=typeof currentCTab!=='undefined'?currentCTab:null;
      if(typeof window.tsOpenSheet==='function'&&typeof window.selectCTab==='function'){
        if(cur!==id){ ok=0; try{ tsOpenSheet(id); }catch(x){} } else if(tab!=='sheet'){ ok=0; try{ selectCTab('sheet'); }catch(x){} }
        else if(++ok>=6){ try{ history.replaceState(null,'',location.pathname+location.search+'#sheet='+encodeURIComponent(id)); }catch(x){} return; } }
      setTimeout(go,400); })(); })();
  var lastTab=null, POINTER=matchMedia('(hover:hover) and (pointer:fine)');
  document.addEventListener('contextmenu',function(e){ var t=e.target.closest&&e.target.closest('.pt-tab[data-id]'); lastTab=t?t.getAttribute('data-id'):null; },true);
  document.addEventListener('keydown',function(e){ var t=e.target&&e.target.closest&&e.target.closest('.pt-tab[data-id]'); if(t&&(e.key==='ContextMenu'||(e.key==='F10'&&e.shiftKey))) lastTab=t.getAttribute('data-id'); },true);
  function tabMenu(){ $$('.pt-pop.show').forEach(function(m){ if(m._pvxWin||!m.querySelector('[data-k=left],[data-k=close]')||!lastTab||!POINTER.matches) return; m._pvxWin=lastTab;
    var b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem'); b.className='pt-mi'; b.setAttribute('data-k','pvxwin');
    b.innerHTML='<span class="pt-tx">Open in new window</span>'; var sep=document.createElement('div'); sep.className='pt-psep';
    m.insertBefore(sep,m.firstChild); m.insertBefore(b,sep);
    if(document.activeElement&&m.contains(document.activeElement)&&document.activeElement!==b){ try{ b.focus({preventScroll:true}); }catch(x){} } }); }
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.pt-pop [data-k=pvxwin]'); if(!b) return; e.preventDefault(); e.stopImmediatePropagation();
    var m=b.closest('.pt-pop'), id=m._pvxWin; m.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); if(m.isConnected&&m.classList.contains('show')){ m.classList.remove('show'); }
    id&&openWin(id); },true);

  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{ popSheet(); formSheet(); tabMenu(); if(sro) fitWatch(); else fit(); }catch(x){} },0); }   /* not rAF: it waits while the window is hidden */
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); fitWatch(); fit(); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n289-ts · was index.html line 3788 ════ */
/* n289 · HIG Combo boxes (claude/hig-audit-treatment-colorwells-comboboxes-digitentry.md): a reading with a fixed set of
   values is a pop-up in Vitals and Chart several; it was a text field that said "Select" and refused anything else */
(function(){
  var memo={}, lastFocus=null;
  function none(s){ s.classList.toggle('pvx-none',!s.value); }
  function popify(inp){ var dl=inp.list||document.getElementById(inp.getAttribute('list')); if(!dl) return;
    var vals=[].map.call(dl.options,function(o){ return o.value||o.textContent; }).filter(function(v){ return String(v).trim(); }); if(!vals.length) return;
    var s=document.createElement('select'); s.className=inp.className+' pvx-choice';
    ['id','aria-label','data-id','onkeydown','oninput','title'].forEach(function(a){ var v=inp.getAttribute(a); if(v!=null) s.setAttribute(a,v); });
    if(inp.disabled) s.disabled=true;
    var o0=document.createElement('option'); o0.value=''; o0.textContent='Choose…'; s.appendChild(o0);
    vals.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; s.appendChild(o); });
    var cur=String(inp.value||'').trim().toLowerCase(), keep=s.id&&memo[s.id], want=cur||(keep?String(keep).toLowerCase():'');
    if(want){ var m=vals.filter(function(v){ return String(v).toLowerCase()===want; })[0]; if(m!=null) s.value=m; }
    var hadFocus=document.activeElement===inp;
    inp.parentNode.replaceChild(s,inp); dl.remove(); none(s);
    s.addEventListener('change',function(){ none(s); if(s.id){ if(s.value) memo[s.id]=s.value; else delete memo[s.id]; } });
    if(hadFocus||(lastFocus&&lastFocus===s.id&&(document.activeElement===document.body||!document.activeElement))){ try{ s.focus({preventScroll:true}); }catch(x){} } }
  function scan(){ [].forEach.call(document.querySelectorAll('input.v-in[list], input.bt-val[list]'),popify);
    /* the sheet's charting drawer keeps typing (checked against the values), with the values as buttons under it: say so */
    var cd=document.getElementById('cd-value'); if(cd&&cd.placeholder==='Choose or type'&&document.querySelector('.cd-opts')) cd.placeholder='Choose below, or type one'; }
  document.addEventListener('focusin',function(e){ var t=e.target; lastFocus=t&&t.classList&&t.classList.contains('pvx-choice')?t.id||null:null; },true);
  /* a recorded value is forgotten, so a redraw doesn't bring it back */
  function wrap(){ if(!window.tsVRecord||tsVRecord._pvx289) return; var o=window.tsVRecord;
    window.tsVRecord=function(id){ var r=o.apply(this,arguments); setTimeout(function(){ var el=document.getElementById('vin-'+id); if(!el||!el.value) delete memo['vin-'+id]; if(el&&el.classList.contains('pvx-choice')) none(el); },0); return r; };
    window.tsVRecord._pvx289=1; }
  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{ wrap(); scan(); }catch(x){} },0); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n290-ts · was index.html line 3826 ════ */
/* n290 · HIG Segmented controls (claude/hig-audit-treatment-imagewells-pickers-segmented-sliders.md): a single choice is a
   radio group — one Tab stop, arrows choose, wrapping at the ends */
(function(){
  var SEL='.vx-seg, .lb-seg';
  function segs(g){ return [].filter.call(g.querySelectorAll('button'),function(b){ return b.getClientRects().length; }); }
  function on(b){ var p=b.getAttribute('aria-pressed'); return p!=null?p==='true':b.classList.contains('on'); }
  function paint(){ [].forEach.call(document.querySelectorAll(SEL),function(g){ if(g.getAttribute('role')!=='radiogroup') g.setAttribute('role','radiogroup');
      var bs=segs(g); if(!bs.length) return; var cur=bs.filter(on)[0]||bs[0];
      bs.forEach(function(b){ var c=b===cur; if(b.getAttribute('role')!=='radio') b.setAttribute('role','radio');
        if(b.getAttribute('aria-checked')!==String(c)) b.setAttribute('aria-checked',String(c)); var ti=c?'0':'-1'; if(b.getAttribute('tabindex')!==ti) b.setAttribute('tabindex',ti); }); }); }
  var GEN=0; document.addEventListener('pointerdown',function(){ GEN++; },true);
  function move(g,b,k){ var my=++GEN; var bs=segs(g), i=bs.indexOf(b); if(i<0) return false; var n=bs.length,
      j=k==='Home'?0:k==='End'?n-1:/^(ArrowRight|ArrowDown)$/.test(k)?(i+1)%n:/^(ArrowLeft|ArrowUp)$/.test(k)?(i-1+n)%n:-1;
    if(j<0) return false; var t=bs[j], label=t.getAttribute('data-w')||t.getAttribute('data-u')||t.textContent.trim(), key=t.getAttribute('data-w')?'data-w':t.getAttribute('data-u')?'data-u':null;
    if(t.getAttribute('aria-checked')!=='true') t.click();
    var gid=g.id, lb=g.closest('[data-lb]'), lbk=lb&&lb.getAttribute('data-lb'), gc='.'+g.classList[0]+'[role=radiogroup]', n0=0;
    function find(){ if(g.isConnected) return g; if(gid&&document.getElementById(gid)) return document.getElementById(gid);
      if(lbk){ var w=document.querySelector('[data-lb="'+lbk+'"]'); if(w&&w.querySelector(SEL)) return w.querySelector(SEL); }
      return [].filter.call(document.querySelectorAll(gc),function(x){ return x.getClientRects().length; })[0]||null; }
    (function settle(){ if(my!==GEN) return; paint(); var g2=find(); var ae=document.activeElement; if(ae&&(/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)||ae.closest&&ae.closest(SEL+', .sb-seg[role=radiogroup], .wl-seg[role=radiogroup]'))&&!(g2&&g2.contains(ae))&&!(g.isConnected&&g.contains(ae))) return;
      var nb=g2?segs(g2).filter(function(x){ return key?x.getAttribute(key)===label:x.textContent.trim()===label; })[0]:null;
      if(nb&&nb.getAttribute('aria-checked')==='true'){ if(document.activeElement!==nb) nb.focus({preventScroll:true}); if(++n0<4) setTimeout(settle,120); return; }
      if(nb&&document.activeElement!==nb) nb.focus({preventScroll:true});
      if(++n0<12) setTimeout(settle,100); })();
    return true; }
  window.addEventListener('keydown',function(e){ if(e.altKey||e.metaKey||e.ctrlKey) return; var b=e.target, g=b&&b.closest&&b.closest(SEL+', .sb-seg[role=radiogroup], .wl-seg[role=radiogroup]');
    if(!g||b.tagName!=='BUTTON') return; if(move(g,b,e.key)){ e.preventDefault(); e.stopPropagation(); } },true);
  var q=0; function tick(){ if(q) return; q=setTimeout(function(){ q=0; try{ paint(); }catch(x){} },0); }
  function boot(){ pvxWatch(tick,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','class']}); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n291-ts · was index.html line 3865 ════ */
/* n291 · HIG Steppers, Text fields, Virtual keyboards (claude/hig-audit-treatment-steppers-textfields-toggles-keyboards.md) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  function set(el,a,v){ if(el&&el.getAttribute(a)!==v) el.setAttribute(a,v); }
  /* ---------- keyboards: the keyboard and Return key that fit each field ---------- */
  function kb(){
    var s=$('#tsSearch'); if(s){ set(s,'autocorrect','off'); set(s,'autocapitalize','off'); set(s,'spellcheck','false'); set(s,'enterkeyhint','search'); }
    ['#nsName','#nsLast','#nsDoc','#nsBreed'].forEach(function(q){ var i=$(q); if(i){ set(i,'autocapitalize','words'); set(i,'autocorrect','off'); set(i,'spellcheck','false'); } });
    var ini=$('#esIni'); if(ini){ set(ini,'autocapitalize','characters'); set(ini,'autocorrect','off'); set(ini,'spellcheck','false'); }
    ['#epLo','#epHi'].forEach(function(q){ var i=$(q); if(i) set(i,'inputmode','numeric'); });
    $$('.v-input .v-in, .v-input .v-note').forEach(function(i){ if(i.tagName==='INPUT') set(i,'enterkeyhint','done'); });
    var cd=$('#cd-value'); if(cd) set(cd,'enterkeyhint','done');
    var bt=$$('#tsOrderSheet .bt-val').filter(function(i){ return i.tagName==='INPUT'; }); bt.forEach(function(i,k){ set(i,'enterkeyhint',k<bt.length-1?'next':'done'); }); }
  /* ---------- the add-treatment field: a Clear button ---------- */
  var X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function clearBtn(){ var i=$('#tsSearch'); if(!i||i._pvx291) return; var host=i.parentElement; if(!host) return; i._pvx291=1;
    var x=document.createElement('button'); x.type='button'; x.className='pvx-sf-x'; x.setAttribute('aria-label','Clear'); x.title='Clear'; x.innerHTML=X; host.appendChild(x);
    function sync(){ x.hidden=!i.value; }
    x.addEventListener('mousedown',function(e){ e.preventDefault(); });
    x.onclick=function(e){ e.stopPropagation(); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); sync(); try{ i.focus({preventScroll:true}); }catch(t){} };
    i.addEventListener('input',sync); i.addEventListener('change',sync); sync();
    /* n298: the field is emptied by the app with a pick (a click or Return), a section change or a redraw; no 700 ms poll */
    ['focus','blur','keyup'].forEach(function(ev){ i.addEventListener(ev,sync); }); document.addEventListener('click',function(){ setTimeout(sync,0); },true);
    pvxOn(['tab','rendered','sheet.drawn','header.refresh','orders.adding','orders.added','rx.opened','search.extra'],function(){ if(i.isConnected) sync(); },function(){ setInterval(function(){ if(i.isConnected) sync(); },700); }); }
  /* ---------- the zoom shows how many hours are on screen ---------- */
  function hours(){ var s=$('#sheetScroll'); if(!s||!s.getClientRects().length) return 0; var r=s.getBoundingClientRect(), seen={};
    $$('.hcell .hl',s).forEach(function(h){ var b=h.getBoundingClientRect(); if(!b.width||b.left<r.left-2||b.right>r.right+2||b.top<0||b.bottom>innerHeight) return;
      var el=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); if(el&&(el===h||h.contains(el)||el.closest&&el.closest('.hcell')===h.parentElement)) seen[h.textContent.trim()]=1; });   /* not hidden under the order column */
    return Object.keys(seen).length; }
  function zoom(){ var z=$('.ts-zoom'); if(!z) return; var bs=$$('button',z); if(bs.length!==3) return; var mid=bs[1];
    var own=mid.textContent.trim(); if(own&&own!=='Fit'&&!$('.pvx-zv',mid)) return;   /* zoomed in, the button already shows its hours ("9 h") */
    var n=hours(); if(!n) return;
    var t=n+' h'; if(mid.textContent.trim()!==t){ var sp=$('.pvx-zv',mid); if(!sp){ mid.textContent=''; sp=document.createElement('span'); sp.className='pvx-zv'; mid.appendChild(sp); } sp.textContent=t; }
    var fits=mid.getAttribute('aria-disabled')==='true';
    set(mid,'aria-label','Showing '+n+' hour'+(n===1?'':'s')+(fits?'':' · fit to the screen'));
    set(z,'aria-label','Hours shown: '+n); }
  /* n298: the hours-shown count follows the grid's changes, its scrolling, a resize and the zoom buttons, trailing them by 150 ms (one recount per burst of changes); no 1.5 s poll */
  var zq=0; function zoomSoon(){ clearTimeout(zq); zq=setTimeout(function(){ zq=0; try{ zoom(); }catch(x){} },150); }
  var q=0; function tick(){ zoomSoon(); if(q) return; q=setTimeout(function(){ q=0; try{ kb(); clearBtn(); }catch(x){} },30); }
  var ro=window.ResizeObserver?new ResizeObserver(zoomSoon):null, watched=null;
  function watch(){ var g=$('#sheetScroll'), c=g&&g.firstElementChild; if(g&&!g.__pvx291s){ g.__pvx291s=1; g.addEventListener('scroll',zoomSoon,{passive:true}); }
    if(!ro||!c||c===watched) return; try{ if(watched) ro.disconnect(); ro.observe(g); ro.observe(c); watched=c; }catch(x){} }
  function boot(){ pvxWatch(function(){ watch(); tick(); },{childList:true,subtree:true,attributes:true,attributeFilter:['aria-disabled','style','class']});
    addEventListener('resize',tick); document.addEventListener('visibilitychange',function(){ if(!document.hidden) tick(); }); watch(); tick(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n292-ts · was index.html line 3946 ════ */
/* n292 · HIG Gauges and Progress indicators (claude/hig-audit-treatment-activityrings-gauges-progress-ratings.md) */
(function(){
  var $=function(q,r){return (r||document).querySelector(q)}, $$=function(q,r){return [].slice.call((r||document).querySelectorAll(q))};
  function h(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  /* ---------- 1. the Pravix loader where a list or sheet waits for its first answer ---------- */
  function loader(task,slow){ return '<div class="pvx-ld"><div class="pvx-ld-line"><span class="pvx-ld-task"><span class="s1">'+h(task)+'</span>'+(slow?'<span class="s2">'+h(slow)+'</span>':'')+'</span></div>'+
    '<div class="pvx-ld-track" role="progressbar" aria-label="'+h(task)+'"><i></i></div></div>'; }
  function wrapSkel(){ var f=window.pvxSkelRows; if(typeof f!=='function'||f.__n292) return;
    var w=function(){ var s=f.apply(this,arguments); if(typeof s!=='string'||s.indexOf('pvx-ld')>-1) return s;
      s=s.replace(/<span class="pvx-sr">[^<]*<\/span>/,loader('Retrieving the patient list','Taking longer than expected'));
      return s.replace(/<div class="pvx-skel-slow">[^<]*<\/div>/,'<div class="pvx-skel-slow">The patient list hasn’t answered yet. Check the connection; it keeps trying.</div>'); };
    w.__n292=1; window.pvxSkelRows=w; }
  function wrapSheet(){ var f=window.pvxSheetSkel; if(typeof f!=='function'||f.__n292) return;
    var w=function(){ var s=f.apply(this,arguments); if(typeof s!=='string'||!s||s.indexOf('pvx-ld')>-1) return s;
      return s.replace(/<span class="pvx-sr">([^<]*?)…?<\/span>/,function(m,t){ var d=document.createElement('div'); d.innerHTML=t; return loader(d.textContent.replace(/…$/,'')); }); };
    w.__n292=1; window.pvxSheetSkel=w; }
  /* ---------- 2. the estimate bar: both ends named, on screen and to VoiceOver ---------- */
  function money(n){ n=+n||0; var whole=Math.abs(n-Math.round(n))<0.005; return (n<0?'−':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:whole?0:2,maximumFractionDigits:2}); }
  function est(){ var V; try{ V=(typeof VISIT!=='undefined')?VISIT:null; }catch(x){ V=null; } if(!V) return;
    $$('.est-card.fin2 .est-bar').forEach(function(b){ if(ero&&!b.__n298){ b.__n298=1; ero.observe(b); }
      var lo=+V.estLow||0, hi=+V.estHigh||0, cur=+V.estCurrent||0; if(!(hi>0)) return;
      var hasLo=lo>0&&lo<hi, d=hasLo?lo:hi, lbl;
      if(cur>hi) lbl='Charges '+money(cur)+': '+money(cur-hi)+' past the '+money(hi)+' high end.'+(hasLo?' Low end '+money(lo)+'.':'');
      else if(hasLo&&cur>lo) lbl='Charges '+money(cur)+': '+money(cur-lo)+' past the '+money(lo)+' low end, '+money(hi-cur)+' left to the '+money(hi)+' high end.';
      else lbl='Charges '+money(cur)+': '+money(d-cur)+' left to the '+money(d)+(hasLo?' low end. High end '+money(hi)+'.':' high end.');
      if(b.getAttribute('aria-label')!==lbl) b.setAttribute('aria-label',lbl);
      var mk=b.querySelector('.est-lo'), at=hasLo?(lo/hi*100):100, g=b.nextElementSibling;
      if(!g||!g.classList.contains('pvx-gends')){ g=document.createElement('div'); g.className='pvx-gends'; g.setAttribute('aria-hidden','true'); b.parentNode.insertBefore(g,b.nextSibling); }
      var sig=(hasLo?at.toFixed(1):'-')+'|'+b.getBoundingClientRect().width.toFixed(0);
      if(g.dataset.sig===sig) return; g.dataset.sig=sig;
      g.innerHTML=(hasLo?'<span class="lo" style="left:'+at.toFixed(1)+'%">Low end</span>':'')+'<span class="hi">High end</span>';
      var br=b.getBoundingClientRect(), gr0=g.getBoundingClientRect(), ml=parseFloat(g.style.marginLeft)||0;
      g.style.marginLeft=(ml+br.left-gr0.left).toFixed(1)+'px'; g.style.width=br.width.toFixed(1)+'px';
      var l=g.querySelector('.lo'), r=g.querySelector('.hi'); if(!l) return;
      var gr=g.getBoundingClientRect(), lr=l.getBoundingClientRect();
      if(lr.left<gr.left){ l.style.left='0'; l.style.transform='none'; lr=l.getBoundingClientRect(); }
      if(lr.right>r.getBoundingClientRect().left-8){ l.classList.add('end'); lr=l.getBoundingClientRect(); }
      if(lr.right>r.getBoundingClientRect().left-8){ r.textContent=''; l.textContent='Low end · high end'; l.classList.add('end'); l.style.left='100%'; }
    }); }
  /* ---------- 3. the workload bars: a fixed scale, the level in words, a VoiceOver label ---------- */
  var FULL=12;
  function wrapLoad(){ var f=window.tsLoadStrip; if(typeof f!=='function'||f.__n292) return;
    var w=function(){ var s=f.apply(this,arguments); if(typeof s!=='string'||s.indexOf('ts-load-card')<0) return s;
      var t=document.createElement('template'); t.innerHTML=s; var cards=[].slice.call(t.content.querySelectorAll('.ts-load-card')), rows=[];
      cards.forEach(function(c){ var nums=[].slice.call(c.querySelectorAll('.ts-lc-nums span')), due=0, late=0, pts=0;
        nums.forEach(function(sp){ var v=parseInt((sp.querySelector('b')||{}).textContent,10)||0, tx=sp.textContent;
          if(sp.classList.contains('late')) late=v; else if(/due/.test(tx)) due=v; else if(/pt/.test(tx)) pts=v; });
        rows.push({c:c,due:due,late:late,pts:pts,score:due+2*late}); });
      var max=Math.max.apply(null,[FULL].concat(rows.map(function(r){ return r.score; })));
      rows.forEach(function(r){ var c=r.c, lvl=c.classList.contains('hi')?'Heavy':c.classList.contains('mid')?'Busy':'Light', nm=((c.querySelector('.ts-lc-top b')||{}).textContent||'').trim();
        var top=c.querySelector('.ts-lc-top'); if(top&&!top.querySelector('.ts-lc-lvl')){ var e=document.createElement('span'); e.className='ts-lc-lvl'; e.textContent=lvl; top.appendChild(e); }
        var bar=c.querySelector('.ts-lc-bar'), i=bar&&bar.querySelector('i'); if(!bar) return;
        if(i) i.style.width=Math.round(Math.min(1,r.score/max)*100)+'%';
        bar.setAttribute('role','img');
        bar.setAttribute('aria-label',(nm?nm+': ':'')+lvl.toLowerCase()+' workload, '+r.due+' due within the hour'+(r.late?', '+r.late+' late':'')+', '+r.pts+(r.pts===1?' patient':' patients'));
      });
      return t.innerHTML; };
    w.__n292=1; window.tsLoadStrip=w; }
  function tick(){ wrapSkel(); wrapSheet(); wrapLoad(); est(); }
  tick();
  /* n298: the estimate is re-read when its card changed, its bar resized or the header refreshed, not after every change on the page; the wrappers are checked once more after load. No 1 s tick */
  var ero=window.ResizeObserver?new ResizeObserver(function(){ est(); }):null;
  function estTouched(ms){ for(var i=0;i<ms.length;i++){ var m=ms[i], t=m.target.nodeType===1?m.target:m.target.parentElement; if(t&&t.closest('.est-card')) return true;
      var ns=m.addedNodes; for(var j=0;j<ns.length;j++){ var n=ns[j]; if(n.nodeType===1&&(n.matches('.est-card')||n.querySelector('.est-card'))) return true; } } return false; }
  function boot(){ tick(); pvxWatch(function(ms){ if(estTouched(ms)) est(); },{childList:true,subtree:true});
    addEventListener('resize',function(){ $$('.pvx-gends').forEach(function(g){ g.dataset.sig=''; }); est(); });
    pvxOn('header.refresh',est); addEventListener('load',function(){ setTimeout(tick,0); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* ════ pvx-n293-ts · was index.html line 4018 ════ */
/* n293 · HIG Controls: a toggle keeps its name; its state is on or off (claude/hig-audit-treatment-appshortcuts-complications-controls.md) */
(function(){
  function set(el,a,v){ if(el&&el.getAttribute(a)!==v) el.setAttribute(a,v); }
  function names(){
    var x=document.querySelectorAll('.ts-expand-btn[aria-pressed]'); for(var i=0;i<x.length;i++) set(x[i],'aria-label','Expand the sheet');
    var c=document.querySelectorAll('.dr-cap[aria-pressed]');
    for(var j=0;j<c.length;j++){ set(c[j],'aria-label','Approval mode'); var t=c[j].getAttribute('data-tip')||''; if(t) set(c[j],'aria-description',t); }
  }
  function boot(){ names(); pvxWatch(names,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label','aria-pressed','data-tip']}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
