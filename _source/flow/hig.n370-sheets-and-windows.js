/* PVX-N370 - HIG Sheets and Windows (second look) */
/* 1. the critical-patient banner and sheets: while a sheet or alert is open, the banner sits behind its dimmed backdrop with the
   rest of the page. The drawer (an inspector) keeps it beside or above, as n332 set. */
(function(){
  function shown(d){ if(d.id==='drawer'||d.id==='locDrawer'||(d.closest&&d.closest('#critIsland'))) return false;
    var cs=getComputedStyle(d); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.05) return false;
    var r=d.getBoundingClientRect(); return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight; }
  function check(){ var on=[].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),shown);
    if(document.body.classList.contains('pvx-ci-under')!==on) document.body.classList.toggle('pvx-ci-under',on); }
  var t=0; function soon(){ if(t) return; t=requestAnimationFrame(function(){ t=0; try{ check(); }catch(e){} }); }
  try{ pvxWatch(soon,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-modal']},document.body); }catch(e){}
  document.addEventListener('transitionend',soon,true); addEventListener('resize',soon); soon();
  window.pvxCiUnder=check;
})();

/* 2 and 3. sheets */
(function(){
  var PH=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false,addListener:function(){}};
  var RM=function(){ return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches); };
  function f(n){ return function(){ var g=window[n]; if(typeof g==='function') g(); }; }
  /* the sheets, their parts, and how they close. n211 already does Add patient, Shift setup and Hospital alert. */
  var CFG=[{m:'triEditModal',l:'#triEditCancel',r:'#triEditSave',x:'#triEditClose',close:f('closeTriageEdit'),edit:true},
           {m:'ctModal',x:'#ctClose',close:f('closeCareTeam')},
           {m:'assignModal',shell:'intake',l:'#assignCancel',x:'#assignClose',close:f('closeAssignModal')},
           {m:'usModal',shell:'us',l:'#usX',r:'#usSend',rs:'Send',close:f('closeUltrasound')}];
  /* for the intake and Ultrasound shells, borrow n211's sheet classes while on iPhone */
  var LEND={intake:[['.intake-head','addpt-head'],['.ih-title','aph-title'],['.ih-ic','aph-ic'],['.ih-t','aph-t'],['.ih-sub','aph-sub'],['.intake-foot','addpt-foot']],
            us:[['.us-head','addpt-head'],['.us-head>div:first-child','aph-title'],['.us-h-t','aph-t'],['.us-h-name','aph-sub'],['.us-h-sub','aph-sub'],['.us-foot','addpt-foot']]};
  function el(c){ return document.getElementById(c.m); }
  function q(c,sel){ var m=el(c); return m&&m.querySelector(sel); }
  function park(btn,cls,head,before){ if(!btn||btn._pvxMark) return;
    var mk=document.createComment('pvx-ps'); btn.parentNode.insertBefore(mk,btn); btn._pvxMark=mk;
    btn.classList.add('pvx-ps-btn',cls); if(before) head.insertBefore(btn,before); else head.appendChild(btn); }
  function undo(c){ var m=el(c); if(!m) return;
    [].slice.call(m.querySelectorAll('.pvx-ps-btn')).forEach(function(b){ if(b._pvxText!=null){ b.textContent=b._pvxText; b._pvxText=null; } pvxUnpark(b); });
    var x=c.x&&q(c,c.x); if(x){ if(x._pvxMark) pvxUnpark(x); if(x._pvxHid){ x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); x._pvxHid=false; } }
    [].slice.call(m.querySelectorAll('[data-pvx-lent]')).forEach(function(n){ n.getAttribute('data-pvx-lent').split(' ').forEach(function(k){ n.classList.remove(k); }); n.removeAttribute('data-pvx-lent'); });
    var ft=m.querySelector('.pvx-ps-empty'); if(ft) ft.classList.remove('pvx-ps-empty');
    m.classList.remove('pvx-ps','pvx-ps-bar'); }
  function lend(m,shell){ (LEND[shell]||[]).forEach(function(p){ [].slice.call(m.querySelectorAll(p[0])).forEach(function(n){ if(n.classList.contains(p[1])) return;
    n.classList.add(p[1]); n.setAttribute('data-pvx-lent',((n.getAttribute('data-pvx-lent')||'')+' '+p[1]).trim()); }); }); }
  function arrange(c){ var m=el(c); if(!m) return; undo(c); nox(c); if(!PH.matches) return;
    if(c.shell) lend(m,c.shell);
    var head=m.querySelector('.addpt-head'), t=m.querySelector('.aph-title'), foot=m.querySelector('.addpt-foot'); if(!head||!t) return;
    m.classList.add('pvx-ps');
    if(!m.querySelector('.pvx-grab')){ var g=document.createElement('div'); g.className='pvx-grab'; g.setAttribute('aria-hidden','true'); m.insertBefore(g,m.firstChild); }
    var L=c.l&&m.querySelector(c.l), R=c.r&&m.querySelector(c.r), X=c.x&&m.querySelector(c.x);
    if(L||R){ if(L) park(L,'pvx-ps-l',head,t); if(R){ park(R,'pvx-ps-r',head,null); if(c.rs){ R._pvxText=R.textContent; R.setAttribute('aria-label',R._pvxText); R.textContent=c.rs; } }
      m.classList.add('pvx-ps-bar');
      if(X&&X!==L){ X.setAttribute('aria-hidden','true'); X.setAttribute('tabindex','-1'); X._pvxHid=true; } }
    else if(X&&X.parentNode===head){ var mk=document.createComment('pvx-ps'); head.insertBefore(mk,X); X._pvxMark=mk; head.insertBefore(X,t); }   /* view-only: ✕ Close, leading */
    if(foot) foot.classList.toggle('pvx-ps-empty', ![].some.call(foot.children,function(k){ return getComputedStyle(k).display!=='none'&&!k.hidden; }));
  }
  /* 3. Mac and iPad: Cancel in the footer means no ✕ in the title bar */
  var NOX=[{m:'apModal',f:'.addpt-foot'},{m:'shiftModal',f:'.addpt-foot'},{m:'alertModal',f:'.addpt-foot,#alertFoot'},{m:'triEditModal',f:'.addpt-foot'},{m:'assignModal',f:'.intake-foot'}];
  function nox(c){ var n=NOX.filter(function(k){ return k.m===c.m; })[0]||c, m=el(n); if(!m||!n.f) return;
    var has=!PH.matches&&[].some.call(m.querySelectorAll(n.f+' button'),function(b){ return /^\s*Cancel\s*$/.test(b.textContent)&&getComputedStyle(b).display!=='none'&&!b.hidden; });
    m.classList.toggle('pvx-nox',has); var x=m.querySelector(':is(.addpt-head,.intake-head)>.close');
    if(x){ if(has){ x.setAttribute('aria-hidden','true'); x.setAttribute('tabindex','-1'); x._pvxNox=true; } else if(x._pvxNox){ x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); x._pvxNox=false; } } }
  function noxAll(){ NOX.forEach(nox); }
  function all(){ CFG.forEach(arrange); noxAll(); }
  window.pvxSheets370=all;
  if(PH.addEventListener) PH.addEventListener('change',all); else PH.addListener(all);
  /* the Ultrasound request is built each time it opens; the Hospital alert rebuilds its footer */
  if(typeof openUltrasoundRequest==='function'){ pvxAfter('openUltrasoundRequest',function(){ arrange(CFG[3]); },'n370'); }
  if(typeof renderAlertModal==='function'){ pvxAfter('renderAlertModal',function(){ nox(NOX[2]); },'n370'); }
  NOX.concat(CFG).forEach(function(k){ var m=el(k); if(!m||m._pvx370) return; m._pvx370=true;
    new MutationObserver(function(){ var o=m.classList.contains('open'); if(o&&!m._pvx370o){ m._pvxDirty=false; nox(k); } m._pvx370o=o; }).observe(m,{attributes:true,attributeFilter:['class']}); });
  all();
  /* Edit triage: typing or choosing since it opened */
  CFG.forEach(function(c){ var m=el(c); if(!m||!c.edit) return;
    ['input','change'].forEach(function(k){ m.addEventListener(k,function(e){ if(e.isTrusted!==false) m._pvxDirty=true; },true); }); });
  function ask(c){ showConfirm('Discard your changes?','Discard',function(){ var m=el(c); if(m) m._pvxDirty=false; c.close(); },{sub:'What you typed in this sheet will be lost.',danger:true});
    var k=document.getElementById('confirmCancel'); if(k) k.textContent='Keep editing'; }
  window.pvxSheetDirty370=function(id){ var m=document.getElementById(id); return !!(m&&m._pvxDirty); };
  /* drag the sheet down by its top to close it; a sheet with typing asks first */
  CFG.forEach(function(c){ var m=el(c); if(!m) return;
    var y0=null, dy=0, ly=0, lt=0, v=0;
    m.addEventListener('touchstart',function(e){ if(!PH.matches||!m.classList.contains('open')||!m.classList.contains('pvx-ps')||!pvxGrabZone(e)||e.touches.length>1) return;
      if(e.target.closest('button,a,input,select,textarea')) return;
      y0=ly=e.touches[0].clientY; lt=performance.now(); dy=0; v=0; m.classList.add('pvx-ps-drag'); },{passive:true});
    m.addEventListener('touchmove',function(e){ if(y0===null) return; var y=e.touches[0].clientY, t=performance.now();
      if(t>lt) v=v*.4+(y-ly)/(t-lt)*.6; ly=y; lt=t; dy=y-y0; dy=dy<0?dy/4:dy; m.style.transform='translateY('+dy+'px)'; },{passive:true});
    function end(){ if(y0===null) return; y0=null; m.classList.remove('pvx-ps-drag');
      var go=dy>90||(v>.5&&dy>24);
      if(go&&!(c.edit&&m._pvxDirty)){ if(RM()){ m.style.transform=''; c.close(); return; }
        m.style.transform='translateY('+(m.offsetHeight+24)+'px)'; setTimeout(function(){ c.close(); setTimeout(function(){ m.style.transform=''; },380); },200); return; }
      m.style.transform=''; if(go) ask(c); }
    m.addEventListener('touchend',end); m.addEventListener('touchcancel',end);
  });
})();

/* 5. Open in new window (HIG Windows: give people the option to view content in a new window) */
(function(){
  var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||'')||/Mac OS X/.test(navigator.userAgent||'');
  var SEL='#board .card[data-pid],#tableBody tr[data-pid],.r-pt[data-pid],#view-dashboard .attn-item[data-pid]';
  function staff(){ var b=document.body.classList; return !(b.contains('tv-mode')||b.contains('client-mode')); }
  function addr(pid){ return location.origin+location.pathname+'#open='+encodeURIComponent(pid); }
  window.pvxOpenInNewWindow=function(pid){ try{ return window.open(addr(pid),'_blank','noopener'); }catch(e){ return null; } };
  window.pvxNewWinItem=function(p){ if(!p||!staff()) return false; if(!(window.matchMedia&&matchMedia('(any-pointer:fine)').matches)) return false;
    return {label:'Open in new window',act:function(){ pvxOpenInNewWindow(p.id); }}; };
  function target(e){ var t=e.target, row=t&&t.closest&&t.closest(SEL); if(!row||!staff()) return null;
    var c=t.closest('button,a,input,select,textarea,label'); if(c&&c!==row&&row.contains(c)&&!c.classList.contains('pvx-open')) return null; return row; }   /* the name (the card's open button) counts */
  document.addEventListener('click',function(e){ if(e.button!==0||e.altKey||e.shiftKey) return; if(!(MAC?(e.metaKey&&!e.ctrlKey):(e.ctrlKey&&!e.metaKey))) return;
    var row=target(e); if(!row) return; e.preventDefault(); e.stopImmediatePropagation(); pvxOpenInNewWindow(row.getAttribute('data-pid')); },true);
  /* a middle click: pressed and released on the same patient (the board may redraw the card in between, so it goes by the patient) */
  var mid=null;
  document.addEventListener('mousedown',function(e){ if(e.button!==1) return; var row=target(e); mid=row?row.getAttribute('data-pid'):null; if(row) e.preventDefault(); },true);   /* no autoscroll */
  document.addEventListener('mouseup',function(e){ if(e.button!==1||!mid) return; var row=target(e), id=mid; mid=null;
    if(row&&row.getAttribute('data-pid')===id){ e.preventDefault(); e.stopImmediatePropagation(); pvxOpenInNewWindow(id); } },true);
  document.addEventListener('auxclick',function(e){ if(e.button===1&&target(e)){ e.preventDefault(); e.stopImmediatePropagation(); } },true);
  /* the new window: #open=<visit id> opens Flow on that patient once the board has them */
  function want(){ var m=/(?:^#|&)open=([^&]+)/.exec(location.hash||''); if(!m) return null; try{ return decodeURIComponent(m[1]); }catch(e){ return null; } }
  function go(){ var id=want(); if(!id) return; try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    var t0=Date.now();
    (function wait(){ var p=(typeof PATIENTS!=='undefined'?PATIENTS:[]).find(function(x){ return String(x.id)===String(id); });
      if(p){ try{ if(typeof currentApp!=='undefined'&&currentApp!=='flow'&&typeof switchApp==='function') switchApp('flow'); }catch(e){}
        setTimeout(function(){ try{ openDrawer(p.id); }catch(e){} },80); return; }
      if(Date.now()-t0>15000){ try{ toast('That patient isn’t on the board now.'); }catch(e){} return; }
      setTimeout(wait,300); })(); }
  setTimeout(go,500); addEventListener('hashchange',go);
})();