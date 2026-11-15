/* PVX-N211 - iPhone sheets: Flow's main sheets match Anesia's (HIG Sheets) */
(function(){
  var PH=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false,addListener:function(){}};
  var RM=function(){ return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches); };
  var CFG=[{m:'apModal',l:'#apCancel',r:'#apCreate',x:'#apClose',close:function(){ closeAddPatient(); }},
           {m:'shiftModal',l:'#shiftCancel',r:'#shiftSave',x:'#shiftClose',close:function(){ closeShiftSetup(); }},
           {m:'alertModal',l:'#alertCancelBtn',r:'#alertActivateBtn',x:'#alertClose',close:function(){ closeAlertModal(); }}];
  function q(c,sel){ var m=document.getElementById(c.m); return m&&m.querySelector(sel); }
  function park(btn,cls,head,before){ if(!btn||btn.closest('.addpt-head')) return;
    var mk=document.createComment('pvx-ps'); btn.parentNode.insertBefore(mk,btn); btn._pvxMark=mk;
    btn.classList.add('pvx-ps-btn',cls); if(before) head.insertBefore(btn,before); else head.appendChild(btn); }
  function undo(c){ var m=document.getElementById(c.m); if(!m) return;
    [].slice.call(m.querySelectorAll('.addpt-head .pvx-ps-btn')).forEach(pvxUnpark);
    var x=q(c,c.x); if(x){ x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); if(x._pvxMark) pvxUnpark(x); }
    var f=m.querySelector('.addpt-foot'); if(f) f.classList.remove('pvx-ps-empty');
    m.classList.remove('pvx-ps','pvx-ps-bar'); }
  function arrange(c){ var m=document.getElementById(c.m); if(!m) return; undo(c); if(!PH.matches) return;
    var head=m.querySelector('.addpt-head'), foot=m.querySelector('.addpt-foot'), t=m.querySelector('.aph-title'); if(!head||!t) return;
    m.classList.add('pvx-ps');
    if(!m.querySelector('.pvx-grab')){ var g=document.createElement('div'); g.className='pvx-grab'; g.setAttribute('aria-hidden','true'); m.insertBefore(g,m.firstChild); }
    var L=foot&&foot.querySelector(c.l), R=foot&&foot.querySelector(c.r), X=q(c,c.x);
    if(L&&R){ park(L,'pvx-ps-l',head,t); park(R,'pvx-ps-r',head,null); m.classList.add('pvx-ps-bar');
      if(X){ X.setAttribute('aria-hidden','true'); X.setAttribute('tabindex','-1'); } }
    else if(X&&X.parentNode===head){ var mk=document.createComment('pvx-ps'); head.insertBefore(mk,X); X._pvxMark=mk; head.insertBefore(X,t); }   /* view-only: ✕ Close, leading (as in Anesia) */
    if(foot) foot.classList.toggle('pvx-ps-empty', ![].some.call(foot.children,function(k){ return k.offsetParent!==null||getComputedStyle(k).display!=='none'; }));
  }
  function all(){ CFG.forEach(arrange); }
  window.pvxPhoneSheets=all;
  /* the alert sheet rebuilds its footer: hand the buttons back first */
  if(typeof renderAlertModal==='function'){ pvxWrap('renderAlertModal',function(ram){ return function(){ undo(CFG[2]); var r=ram.apply(this,arguments); arrange(CFG[2]); return r; }; },'#53'); }
  if(PH.addEventListener) PH.addEventListener('change',all); else PH.addListener(all);
  all();
  /* changes since the sheet opened: typing, picking, toggling */
  CFG.forEach(function(c){ var m=document.getElementById(c.m); if(!m) return; m._pvxDirty=false;
    new MutationObserver(function(){ var o=m.classList.contains('open'); if(o&&!m._pvxWas) m._pvxDirty=false; m._pvxWas=o; }).observe(m,{attributes:true,attributeFilter:['class']});
    ['input','change'].forEach(function(k){ m.addEventListener(k,function(e){ if(e.isTrusted!==false) m._pvxDirty=true; },true); });
    m.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('.ap-seg-btn,.ap-prio-btn,.alert-type,.pvx-unit button,.rvp-chip,.rvp-x,.dd-opt')) m._pvxDirty=true; },true);
  });
  document.addEventListener('click',function(e){ if(!(e.target.closest&&e.target.closest('.dd-panel .dd-opt'))) return;
    CFG.forEach(function(c){ var m=document.getElementById(c.m); if(m&&m.classList.contains('open')) m._pvxDirty=true; }); },true);
  function ask(c){ showConfirm('Discard your changes?','Discard',function(){ var m=document.getElementById(c.m); if(m) m._pvxDirty=false; c.close(); },{sub:'What you typed in this sheet will be lost.',danger:true});
    var k=document.getElementById('confirmCancel'); if(k) k.textContent='Keep editing'; }
  window.pvxSheetDirty=function(id){ var m=document.getElementById(id); return !!(m&&m._pvxDirty); };
  /* drag the sheet down by its top to close it */
  CFG.forEach(function(c){ var m=document.getElementById(c.m); if(!m) return;
    var y0=null, dy=0, ly=0, lt=0, v=0;
    m.addEventListener('touchstart',function(e){ if(!PH.matches||!m.classList.contains('open')||!pvxGrabZone(e)||e.touches.length>1) return;
      y0=ly=e.touches[0].clientY; lt=performance.now(); dy=0; v=0; m.classList.add('pvx-ps-drag'); },{passive:true});
    m.addEventListener('touchmove',function(e){ if(y0===null) return; var y=e.touches[0].clientY, t=performance.now();
      if(t>lt) v=v*.4+(y-ly)/(t-lt)*.6; ly=y; lt=t; dy=y-y0; dy=dy<0?dy/4:dy; m.style.transform='translateY('+dy+'px)'; },{passive:true});
    function end(){ if(y0===null) return; y0=null; m.classList.remove('pvx-ps-drag');
      var go=dy>90||(v>.5&&dy>24);
      if(go&&!m._pvxDirty){ if(RM()){ m.style.transform=''; c.close(); return; }
        m.style.transform='translateY('+(m.offsetHeight+24)+'px)'; setTimeout(function(){ c.close(); setTimeout(function(){ m.style.transform=''; },380); },200); return; }
      m.style.transform=''; if(go) ask(c); }
    m.addEventListener('touchend',end); m.addEventListener('touchcancel',end);
  });
})();
/* PVX-N211 - one sheet at a time on iPhone: the patient drawer steps aside for a sheet opened from it and comes back after */
(function(){
  function phone(){ return window.innerWidth<=820; }   /* wherever the drawer fills the screen */
  window.pvxSheetBack=function(){ var d=document.getElementById('drawer');
    if(!phone()||!d||!d.classList.contains('open')||typeof activePatient==='undefined'||!activePatient) return null;
    var b=d.querySelector('.drawer-body'), back={pid:activePatient, top:b?b.scrollTop:0}; closeDrawer(); return back; };
  window.pvxSheetReturn=function(back){ if(!back||!PATIENTS.some(function(x){ return x.id===back.pid; })) return;
    var d=document.getElementById('drawer'); if(d&&d.classList.contains('open')) return;
    openDrawer(back.pid); var put=function(){ var b=document.querySelector('#drawer .drawer-body'); if(b) b.scrollTop=back.top; };
    put(); requestAnimationFrame(function(){ put(); setTimeout(put,60); }); };
  if(typeof openCareTeam==='function'&&typeof closeCareTeam==='function'){
    var ctBack=null;
    pvxWrap('openCareTeam',function(oct){ return function(pid){ var b=pvxSheetBack(); var r=oct.apply(this,arguments); if(b) ctBack=b; return r; }; },'#53');
    pvxWrap('closeCareTeam',function(cct){ return function(){ var b=ctBack; ctBack=null; var r=cct.apply(this,arguments); if(b) setTimeout(function(){ pvxSheetReturn(b); },0); return r; }; },'#53');
  }
})();