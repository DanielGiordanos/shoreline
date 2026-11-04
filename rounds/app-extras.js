/* script */

try{(function(){
  function say(t){ var l=document.getElementById('pvxN136Live'); if(!l) return; l.textContent=''; setTimeout(function(){ l.textContent=t; },30); }
  /* RD-02: the name button toggles; after the census re-renders, focus goes back to the same patient's toggle */
  var refocus=null;
  document.addEventListener('click',function(e){ var t=e.target.closest&&e.target.closest('.rd-toggle'); if(t) refocus=t.dataset.pid; },true);
  if(typeof renderRdCensus==='function'){ var _r=renderRdCensus; renderRdCensus=function(){ var out=_r.apply(this,arguments); if(refocus){ var b=document.querySelector('.rd-toggle[data-pid="'+refocus+'"]'); refocus=null; if(b) b.focus({preventScroll:true}); } return out; }; }
  /* Rounds' own role=button controls (financial row, section headers…) had no key handling */
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ') return;
    var el=e.target; if(!el||!el.matches||!el.matches('#view-rd-census [role=button][data-act], #view-rd-archive [role=button][data-act]')) return;
    e.preventDefault(); if(el.dataset.pid) refocus=el.dataset.pid; if(typeof rdHandleAct==='function') rdHandleAct(el.dataset.act,el);
  });
  /* the case drawer is created on first open, in the same tick it opens, so the overlay primitive (n133) saw it already open and
     never moved focus into it: make sure it exists and is registered before it opens */
  if(typeof openUsxCase==='function'){ var _oc=openUsxCase; openUsxCase=function(){ try{ if(typeof usxEnsureDrawer==='function') usxEnsureDrawer(); if(window.pvxOverlay&&pvxOverlay.scan) pvxOverlay.scan(); }catch(err){} return _oc.apply(this,arguments); }; }
  /* US-03: arrow keys on a grip move the case in the queue — the same renumbering a drop does */
  var toastT=null, usFocus=null;
  /* the queue re-renders again when the save echoes back; keep focus on the moved case's grip through those re-renders */
  function usBack(){ if(!usFocus||Date.now()>usFocus.until) return; var a=document.activeElement; if(a&&a!==document.body&&!(a.classList&&a.classList.contains('us-move'))) { usFocus=null; return; } var nb=document.querySelector(usFocus.sel); if(nb&&a!==nb) nb.focus({preventScroll:true}); }
  if(typeof renderUltrasound==='function'){ var _u=renderUltrasound; renderUltrasound=function(){ var out=_u.apply(this,arguments); usBack(); return out; }; }
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('.us-move')){ e.stopPropagation(); } },true);
  document.addEventListener('keydown',function(e){
    var b=e.target&&e.target.closest&&e.target.closest('.us-move'); if(!b) return;
    var k=e.key; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].indexOf(k)<0) return;
    e.preventDefault(); e.stopPropagation();
    if(typeof usCanEdit!=='function'||!usCanEdit()) return;
    var ids=usQueue().map(function(x){ return x.id; }), id=b.dataset.move, i=ids.indexOf(id); if(i<0) return;
    var j=k==='Home'?0:k==='End'?ids.length-1:(k==='ArrowUp'||k==='ArrowLeft')?i-1:i+1; j=Math.max(0,Math.min(ids.length-1,j));
    var pt=PATIENTS.find(function(x){ return x.id===id; }), nm=(pt&&pt.name)||'Patient';
    if(j===i){ say(nm+' is already '+(i===0?'first':'last')+' in the queue.'); return; }
    ids.splice(j,0,ids.splice(i,1)[0]);
    ids.forEach(function(x,n){ var q=PATIENTS.find(function(y){ return y.id===x; }); if(q&&q.ultrasound) q.ultrasound.queuePosition=n+1; });
    var cls=b.classList.contains('um-rgrip')?'.um-rgrip':'.usb-grip';
    renderAll();
    usFocus={sel:cls+'.us-move[data-move="'+id+'"]',until:Date.now()+2000}; usBack();
    say(nm+' moved to position '+(j+1)+' of '+ids.length+'.');
    clearTimeout(toastT); toastT=setTimeout(function(){ try{ notify('Queue updated','Ultrasound order changed by Internal Medicine',{icon:'move',color:'var(--s-ultrasound)'}); }catch(err){} },1200);
  },true);
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20464)}

/* pvx-n144-js */

try{(function(){
  var $=function(s,r){ return (r||document).querySelector(s); }, $$=function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  /* FLOW-01: the table region is named and reachable; a hint appears only when columns are off screen */
  function tableRegion(){ var w=$('#view-list .tablewrap'); if(!w) return; if(!w.hasAttribute('role')){ w.setAttribute('role','region'); w.setAttribute('aria-label','Patients table'); w.tabIndex=0;
      var h=document.createElement('p'); h.className='pvx-tblhint'; h.id='pvxTblHint'; h.textContent='Scroll sideways for Status, Priority, Arrival and Wait.'; w.parentNode.insertBefore(h,w); w.setAttribute('aria-describedby','pvxTblHint'); }
    var over=w.scrollWidth>w.clientWidth+1, h2=$('#pvxTblHint'); if(h2) h2.classList.toggle('on',over); }
  /* FLOW-08: keep the alert under the app bar while it is on screen (it scrolls away with the page) */
  var ciRaf=0; function ciTop(){ ciRaf=0; var y=12;
    /* a dialog or drawer on top: the page behind is inert, so the alert keeps its original place instead of covering the dialog */
    if($('.addpt-modal.open, .intake-modal.open, .drawer.open, .confirm.open, .modal.open, .sheet.open')){ document.documentElement.style.setProperty('--pvx-ci-top','12px'); return; }
    $$('.topnav, .subnav').forEach(function(n){ if(n.offsetParent===null&&getComputedStyle(n).position!=='fixed') return; var b=n.getBoundingClientRect(); if(b.height&&b.bottom>0) y=Math.max(y,Math.round(b.bottom+8)); }); document.documentElement.style.setProperty('--pvx-ci-top',y+'px'); }
  function ciLater(){ if(!ciRaf) ciRaf=requestAnimationFrame(ciTop); }
  /* FLOW-13: arrival and priority are single-choice groups — roles, checked state, arrow keys */
  function radios(g,label){ if(!g) return; if(!g.dataset.pvxRg){ g.dataset.pvxRg='1'; g.setAttribute('role','radiogroup'); g.setAttribute('aria-label',label);
      g.addEventListener('keydown',function(e){ var k=e.key; if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].indexOf(k)<0) return; var bs=$$('button',g).filter(function(b){ return b.offsetParent!==null&&!b.disabled; }); var i=bs.indexOf(document.activeElement); if(i<0) return; e.preventDefault();
        var j=k==='Home'?0:k==='End'?bs.length-1:(i+((k==='ArrowRight'||k==='ArrowDown')?1:-1)+bs.length)%bs.length; bs[j].focus(); bs[j].click(); }); }
    $$('button',g).forEach(function(b){ var on=b.classList.contains('active'); b.setAttribute('role','radio'); b.setAttribute('aria-checked',on?'true':'false'); b.tabIndex=on?0:-1; }); }
  /* FLOW-10 (state only), US-04, RD-05: the selected view / shift / filter is exposed, not only coloured */
  function selected(){ ['#switcher','#switcherUs','#switcherRd'].forEach(function(id){ $$(id+' .seg').forEach(function(b){ if(b.classList.contains('active')) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); }); });
    $$('.rd-svcbtn').forEach(function(b){ b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false'); });
    radios($('#apArrival'),'Arrival type'); radios($('#apPrio'),'Priority'); tableRegion(); }
  var sRaf=0; function later(){ if(!sRaf) sRaf=requestAnimationFrame(function(){ sRaf=0; selected(); }); }
  function boot(){ selected(); ciTop();
    new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var t=ms[i].target; if(t.nodeType===1&&(ms[i].type==='childList'||t.matches('.seg,.ap-seg-btn,.ap-prio-btn,.rd-svcbtn,#rdShiftSeg button'))){ later(); ciLater(); return; } if(ms[i].type==='attributes'&&t.nodeType===1&&/(^|\s)open(\s|$)/.test(t.className||'')!==/(^|\s)open(\s|$)/.test(ms[i].oldValue||'')) ciLater(); } })
      .observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class']});
    addEventListener('scroll',ciLater,{passive:true,capture:true}); addEventListener('resize',function(){ ciLater(); later(); });
    /* FLOW-14: a blank name is marked on the field itself, stays until fixed, and is announced */
    var nm=$('#apName'), cb=$('#apCreate');
    if(nm&&cb){ nm.setAttribute('required',''); nm.setAttribute('aria-required','true'); var er=document.createElement('div'); er.className='pvx-fielderr'; er.id='apNameErr'; er.setAttribute('role','alert'); nm.parentNode.appendChild(er);
      var lab=nm.parentNode.querySelector('label'); if(lab&&!lab.htmlFor) lab.htmlFor='apName';
      cb.addEventListener('click',function(){ if(!String(nm.value||'').trim()){ nm.setAttribute('aria-invalid','true'); nm.setAttribute('aria-describedby','apNameErr'); er.textContent='Enter a patient name.'; setTimeout(function(){ try{ nm.focus(); }catch(e){} },0); } },true);
      nm.addEventListener('input',function(){ if(String(nm.value||'').trim()&&nm.getAttribute('aria-invalid')==='true'){ nm.removeAttribute('aria-invalid'); er.textContent=''; } }); }
    var tt=$('#toast'); if(tt&&!tt.hasAttribute('role')){ tt.setAttribute('role','status'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20617)}

/* pvx-n145-us-js */

/* the case workspace / request editor re-render the queue and the board when they close, so the opening control is a new element:
   find it again by patient (the request button, the case row/card, then the patient's name) and focus it */
function pvxUsRefocus(pid,kind){ if(!pid) return; var a=document.activeElement; if(a&&a!==document.body&&a.id!=='stage'&&!(a.closest&&a.closest('.pvx-closed'))&&document.contains(a)&&a.offsetParent) return;
  var o=window.__pvxUsFrom; var c=[];
  if(o&&document.contains(o)&&o.offsetParent) c.push(o);
  if(kind==='req') c.push(document.querySelector('[data-usflag="'+pid+'"]'));
  ['[data-pid="'+pid+'"] .us-open','[data-pid="'+pid+'"][tabindex="0"]','[data-open="'+pid+'"]','tr[data-pid="'+pid+'"]','.usb-card[data-pid="'+pid+'"]','[data-pid="'+pid+'"] .pvx-open','.pvx-open[data-pid="'+pid+'"]','[data-usflag="'+pid+'"]'].forEach(function(s){ Array.prototype.forEach.call(document.querySelectorAll(s),function(e){ c.push(e); }); });
  for(var i=0;i<c.length;i++){ var e=c[i]; if(e&&e.offsetParent&&!(e.closest&&e.closest('[inert],.pvx-closed'))){ if(e.tabIndex<0&&!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) e.tabIndex=-1; try{ e.focus({preventScroll:false}); }catch(x){} if(document.activeElement===e) break; } }
 }
/* UR-05: case cards and rows without their own Open button (e.g. Completed rows) open the case with the keyboard too */
try{(function(){ var SEL='.um-next,.um-rrow,.usb-card,#usxCompleted2 tr[data-pid],#usxCompleted tr[data-pid],.ums-detail';
  function pidOf(e){ return e.dataset.pid||e.dataset.open||((e.querySelector('[data-pid]')||{}).dataset||{}).pid; }
  function nameOf(pid){ try{ var p=PATIENTS.find(function(x){ return x.id===pid; }); return p?(p.name+' '+(p.last||'')).trim():''; }catch(e){ return ''; } }
  function wire(){ Array.prototype.forEach.call(document.querySelectorAll(SEL),function(e){ if(e.dataset.pvxCase) return; if(e.querySelector('.us-open,.pvx-open,button')) return; var pid=pidOf(e); if(!pid) return; e.dataset.pvxCase='1'; e.tabIndex=0; e.setAttribute('role','button'); var n=nameOf(pid); if(n) e.setAttribute('aria-label','Open ultrasound case: '+n); }); }
  document.addEventListener('keydown',function(ev){ var t=ev.target; if(!t||!t.matches||!t.matches(SEL)||!t.dataset.pvxCase) return; if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); window.__pvxUsFrom=t; t.click(); } });
  var raf=0; new MutationObserver(function(){ if(!raf) raf=requestAnimationFrame(function(){ raf=0; wire(); }); }).observe(document.body,{childList:true,subtree:true}); wire(); })();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20675)}

/* pvx-n148-rd-js */

/* the chip: Saving… → Saved (only on the server's word) · Offline · Not saved */
var _rdSS={t:0,off:0,state:''};
function rdSaveState(st){ var el=document.getElementById('rdSaveState'); if(!el) return;
  var live=document.getElementById('rdSaveLive'); if(!live){ live=document.createElement('span'); live.id='rdSaveLive'; live.className='rd-save-live'; live.setAttribute('role','status'); el.parentNode.insertBefore(live,el.nextSibling); }
  clearTimeout(_rdSS.t); clearTimeout(_rdSS.off); _rdSS.state=st; el.classList.remove('warn');
  if(st==='saving'){ el.textContent='Saving…'; el.classList.add('on'); live.textContent='';
    _rdSS.off=setTimeout(function(){ if(_rdSS.state!=='saving') return; var off=!navigator.onLine; try{ off=off||(typeof Backend!=='undefined'&&Backend.conn&&Backend.conn!=='live'); }catch(e){}
      if(off){ el.textContent='Offline · saves when connected'; el.classList.add('warn'); live.textContent='Offline. Rounds changes will save when the connection is back.'; } },4000); return; }
  if(st==='saved'){ el.textContent='Saved'; el.classList.add('on'); live.textContent=''; _rdSS.t=setTimeout(function(){ el.classList.remove('on'); },1400); return; }
  if(st==='error'){ el.textContent='Not saved · retrying'; el.classList.add('on','warn'); live.textContent='Rounds change not saved yet. Retrying.'; return; }
  if(st==='off'){ el.textContent='Not saved · not connected'; el.classList.add('on','warn'); live.textContent='Not connected. Rounds changes are not being saved.'; return; } }
try{window.addEventListener('pvx:persist',function(e){ var d=e.detail||{}; if(!window.__rdWaitSince) return;
  if((d.state==='saved'||d.state==='idle')&&d.at>=window.__rdWaitSince){ window.__rdWaitSince=0; rdSaveState('saved'); return; }
  if(d.state==='error'){ rdSaveState('error'); clearTimeout(window.__rdRetryT); window.__rdRetryT=setTimeout(function(){ try{ persist(); }catch(x){} },5000); return; }
  if(d.state==='off'){ rdSaveState('off'); } });
}catch(__e){window.__n305Skip&&__n305Skip(__e,20701)}

/* the Tomorrow list on the server: rounds_queue/{id} = {tenant_id, key, text, done, done_at, created_at, created_by, updated_at, updated_by} */
var rdQ={server:false, live:false, unsub:null, migrated:false, pend:0, dirty:false};
function rdQDb(){ try{ return (typeof Backend!=='undefined'&&Backend.mode==='staff'&&typeof DB!=='undefined'&&DB&&DB.collection)?DB:null; }catch(e){ return null; } }
function rdQWho(){ try{ return rdActorName()||null; }catch(e){ return null; } }
function rdQWrite(p){ var d=rdQDb(); if(!d||!p){ return; } rdQ.pend++; window.__rdQWait=true; rdSaveState('saving');
  p.then(function(){ rdQ.pend--; if(!rdQ.pend){ window.__rdQWait=false; if(!window.__rdWaitSince) rdSaveState('saved'); } })
   .catch(function(e){ rdQ.pend--; console.warn('[rounds] tomorrow list',e); rdSaveState('error'); try{ toast('Tomorrow list not saved — check your connection'); }catch(x){} }); }
function rdQRef(id){ return rdQDb().collection('rounds_queue').doc(String(id)); }
function rdQAdd(key,x){ var d=rdQDb(); if(!d) return; var now=new Date().toISOString();
  rdQWrite(rdQRef(x.id).set({tenant_id:TENANT_ID,key:key,text:String(x.text).slice(0,200),done:!!x.done,done_at:x.doneAt||null,created_at:x.at||now,created_by:rdQWho(),updated_at:now,updated_by:rdQWho()})); }
function rdQDone(x){ var d=rdQDb(); if(!d) return; var now=new Date().toISOString();
  rdQWrite(rdQRef(x.id).update({done:!!x.done,done_at:x.doneAt||null,updated_at:now,updated_by:rdQWho()})); }
function rdQDel(id,quiet){ var d=rdQDb(); if(!d) return; var p=rdQRef(id).delete(); if(quiet){ p.catch(function(){}); return; } rdQWrite(p); }
function rdQPaint(){ var a=document.activeElement, side=document.getElementById('rdSide');
  if(side&&a&&side.contains(a)&&a.tagName==='INPUT'){ rdQ.dirty=true; return; }   /* never wipe what someone is typing */
  rdQ.dirty=false; try{ renderRdCensus(true); }catch(e){} }
try{document.addEventListener('focusout',function(e){ if(rdQ.dirty&&e.target&&e.target.closest&&e.target.closest('#rdSide')) setTimeout(rdQPaint,0); });
}catch(__e){window.__n305Skip&&__n305Skip(__e,20722)}
function rdQApply(snap){ var next={}; RD_QUEUE_DEFS.forEach(function(d){ next[d.key]=[]; });
  snap.docs.forEach(function(doc){ var v=doc.data()||{}; if(!next[v.key]) return; next[v.key].push({id:doc.id,text:String(v.text||''),done:!!v.done,doneAt:v.done_at||null,at:v.created_at||null}); });
  RD_QUEUE_DEFS.forEach(function(d){ next[d.key].sort(function(a,b){ return String(a.at||'').localeCompare(String(b.at||'')); }); });
  /* once: items typed on this device before the list moved to the server are copied up (open ones only) */
  if(!rdQ.migrated){ rdQ.migrated=true; var MK=RD_QUEUE_KEY+':migrated'; var done=false; try{ done=localStorage.getItem(MK)==='1'; }catch(e){}
    if(!done){ var ids={}; snap.docs.forEach(function(d){ ids[d.id]=1; });
      RD_QUEUE_DEFS.forEach(function(d){ (rdQueues[d.key]||[]).forEach(function(x){ if(!ids[x.id]&&!x.done&&x.text){ next[d.key].push(x); rdQAdd(d.key,x); } }); });
      try{ localStorage.setItem(MK,'1'); }catch(e){} } }
  rdQueues=next; rdQ.live=true; try{ localStorage.setItem(RD_QUEUE_KEY,JSON.stringify(rdQueues)); }catch(e){}
  try{ rdPruneQueues(); }catch(e){} rdQPaint(); }
function rdQConnect(){ if(rdQ.unsub) return; var d=rdQDb(); if(!d) return; rdQ.server=true;
  try{ rdQ.unsub=d.collection('rounds_queue').where('tenant_id','==',TENANT_ID).onSnapshot(rdQApply,function(e){ console.warn('[rounds] tomorrow list read',e); rdQ.live=false; rdQ.unsub=null; var n=document.getElementById('rdTmrNote'); if(n) n.textContent='Couldn’t load the shared list — showing this device’s copy'; }); }
  catch(e){ rdQ.unsub=null; } }
try{setInterval(rdQConnect,2000);
}catch(__e){window.__n305Skip&&__n305Skip(__e,20736)} try{setTimeout(rdQConnect,300);
}catch(__e){window.__n305Skip&&__n305Skip(__e,20736)}

/* pvx-n149-flow-js */

/* pvxLobbyAccountCard lives next to the account list in Flow's main script (the sign-in handler can run before this point) */

/* pvx-n184-js */

/* PVX-N184 - 1. Dynamic Type on iPhone and iPad: -apple-system-body is 17 pt at the default size; the root follows it. */
try{(function(){
  var de=document.documentElement;
  function ios(){ return /iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1); }
  function probe(){
    try{
      if(!ios()||!(window.CSS&&CSS.supports&&CSS.supports('font','-apple-system-body'))) return;
      var d=document.createElement('div'); d.setAttribute('data-pvx-probe','text'); d.style.cssText='position:absolute;visibility:hidden;pointer-events:none;font:-apple-system-body';
      de.appendChild(d); var f=parseFloat(getComputedStyle(d).fontSize); d.remove();
      if(!f) return; var pct=Math.max(82,Math.min(235,f/17*100));
      de.style.fontSize=Math.abs(pct-100)<1?'':pct.toFixed(1)+'%';
    }catch(e){}
  }
  function mark(){ var sc=parseFloat(getComputedStyle(de).fontSize)/16; de.classList.toggle('pvx-text-l',sc>=1.25); }
  probe(); mark();
  document.addEventListener('visibilitychange',function(){ if(!document.hidden){ probe(); mark(); } });
  window.addEventListener('resize',mark);
  try{ new MutationObserver(mark).observe(de,{attributes:true,attributeFilter:['style']}); }catch(e){}
  window.pvxTextScale=function(){ return parseFloat(getComputedStyle(de).fontSize)/16; };
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20828)}
/* PVX-N184 - 5. sub-nav strips that scroll: fade at the edge that has more, a chevron to reach it, current view in sight */
try{(function(){
  var CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  function wire(sw){
    if(sw.__pvx) return; sw.__pvx=1; sw.classList.add('pvx-sw');
    var more=document.createElement('button'); more.type='button'; more.className='pvx-swmore'; more.tabIndex=-1; more.setAttribute('aria-hidden','true'); more.title='More'; more.innerHTML=CHEV;
    sw.parentNode.insertBefore(more,sw.nextSibling);
    more.addEventListener('click',function(){ sw.scrollBy({left:Math.max(120,sw.clientWidth*0.7),behavior:'smooth'}); });
    function upd(){
      var max=sw.scrollWidth-sw.clientWidth, x=sw.scrollLeft, ov=max>2 && sw.clientWidth>0;
      sw.classList.toggle('ov-l',ov&&x>2); sw.classList.toggle('ov-r',ov&&x<max-2);
      var on=ov&&x<max-2; more.classList.toggle('on',on);
      if(on){ var p=sw.parentNode.getBoundingClientRect(), r=sw.getBoundingClientRect(); more.style.left=Math.round(r.right-p.left-32)+'px'; more.style.top=Math.round(r.top-p.top)+'px'; more.style.height=Math.round(r.height)+'px'; }
    }
    var seated=null;
    function seat(){ var a=sw.querySelector('.seg.active'); if(!a||a===seated) return; if(sw.scrollWidth<=sw.clientWidth+2) return; seated=a; var l=a.offsetLeft-sw.offsetLeft, r=l+a.offsetWidth;
      if(l<sw.scrollLeft||r>sw.scrollLeft+sw.clientWidth) sw.scrollLeft=Math.max(0,l-24); }
    sw.addEventListener('scroll',upd,{passive:true}); window.addEventListener('resize',function(){ upd(); });
    try{ new ResizeObserver(upd).observe(sw); }catch(e){}
    try{ new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ if(ms[i].target!==sw){ seat(); upd(); return; } } }).observe(sw,{subtree:true,attributes:true,attributeFilter:['class'],childList:true}); }catch(e){}
    seat(); upd(); sw.__pvxUpd=upd;
  }
  function all(){ document.querySelectorAll('.subnav .switcher').forEach(wire); document.querySelectorAll('.subnav .switcher.pvx-sw').forEach(function(sw){ sw.__pvxUpd&&sw.__pvxUpd(); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  window.addEventListener('load',all);
  try{ new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ var t=ms[i].target; if(t.classList&&t.classList.contains('subnav')){ requestAnimationFrame(all); return; } } }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']}); }catch(e){}
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20848)}

/* pvx-n185-js */

/* PVX-N185 - Anesia's glass guard, shared on this device (same key): blur stays on only while the device keeps up. */
try{(function(){
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
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#fabAdd,#globalSearch,#fvTalk')) sample(); },true);
  window.pvxGlass={sample:sample};
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20905)}

/* pvx-n188-js */

/* PVX-N188 - with Reduce Motion, scripted smooth scrolling jumps instead */
try{(function(){
  var q; try{ q=matchMedia('(prefers-reduced-motion: reduce)'); }catch(e){ return; }
  function fix(a){ if(q.matches&&a&&typeof a==='object'&&a.behavior==='smooth'){ a=Object.assign({},a,{behavior:'auto'}); } return a; }
  ['scrollTo','scrollBy'].forEach(function(n){ [window,Element.prototype].forEach(function(o){ var f=o[n]; if(!f) return;
    o[n]=function(a){ return arguments.length===1?f.call(this,fix(a)):f.apply(this,arguments); }; }); });
  var si=Element.prototype.scrollIntoView; Element.prototype.scrollIntoView=function(a){ return si.call(this,fix(a)); };
  window.pvxReducedMotion=function(){ return q.matches; };
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20953)}

/* pvx-n189-js */

/* PVX-N189 - weight matching, Anesia's table: stroke on the 24-pt grid = W(weight) x font size x 0.05 x 24 / icon size,
   i.e. the same stroke-to-text ratio as Anesia's 1.2 em symbols */
try{(function(){
  var W={100:1.2,200:1.3,300:1.45,400:1.6,500:1.8,600:2,700:2.25,800:2.5,900:2.7};
  var SKIP='.topnav,.cpr-pill,.dnr-pill,.spark,.us-spark-area,.kpi .spark,.command-kpi__spark,.fab-add,.aph-ic,.empty,.board-empty-state,.an-chart,.cl-vnode,.nextup-rail';
  function host(svg){ var h=svg.parentElement; while(h&&h!==document.body){ if(/^(BUTTON|A|LABEL|LI|H\d|P|TD|TH)$/.test(h.tagName)||h.getAttribute('role')==='button') return h; if(h.childNodes.length>1&&[].some.call(h.childNodes,function(n){return n.nodeType===3&&n.textContent.trim();})) return h; h=h.parentElement; } return svg.parentElement; }
  function label(h){ var w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT,{acceptNode:function(n){ return n.textContent.trim()&&!(n.parentElement&&n.parentElement.closest('svg'))?1:3; }}); var n=w.nextNode(); return n&&n.parentElement; }
  function one(svg){
    if(svg.classList.contains('pvx-gi')||svg.closest(SKIP)) return;
    var vb=svg.viewBox&&svg.viewBox.baseVal; if(!vb||vb.width!==24||vb.height!==24) return;
    var r=svg.getBoundingClientRect(); if(!r.width||r.width>28) return;
    var p=svg.querySelector('path,line,polyline,polygon,circle,rect'); if(!p||getComputedStyle(p).stroke==='none') return;
    var h=host(svg), lab=label(h)||h, cs=getComputedStyle(lab), fw=Math.min(900,Math.max(100,Math.round((parseInt(cs.fontWeight,10)||400)/100)*100));
    var u=(W[fw]*parseFloat(cs.fontSize)*0.05*24/r.width); u=Math.max(1.3,Math.min(3.2,u));
    var k=u.toFixed(2); if(svg.__pvxw===k) return; svg.__pvxw=k;
    svg.classList.add('pvx-sym'); svg.style.setProperty('--pvx-symw',k);
  }
  function all(){ document.querySelectorAll('svg').forEach(function(s){ try{ one(s); }catch(e){} }); }
  var t=0; function soon(){ if(t) return; t=setTimeout(function(){ t=0; requestAnimationFrame(all); },120); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  window.addEventListener('load',all); window.addEventListener('resize',function(){ document.querySelectorAll('svg.pvx-sym').forEach(function(s){ s.__pvxw=null; }); soon(); });
  try{ new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ if(ms[i].addedNodes.length){ soon(); return; } } }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  try{ new MutationObserver(function(){ document.querySelectorAll('svg.pvx-sym').forEach(function(s){ s.__pvxw=null; }); soon(); }).observe(document.documentElement,{attributes:true,attributeFilter:['style','class']}); }catch(e){}
  document.addEventListener('click',soon,true); document.addEventListener('focusin',soon,true);
  window.pvxSymbols={sync:all};
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,20983)}

/* pvx-n191-js */

/* PVX-N191 - bars read their value: capacity rails, status bars and utilisation bars become meters */
try{(function(){
  function pct(el){ var w=el&&(el.style.width||el.style.getPropertyValue('--w')||el.dataset.w); var n=parseFloat(w); return isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0; }
  function txt(e){ return e?e.textContent.replace(/\s+/g,' ').trim():''; }
  function set(el,lab,now,vt){ el.setAttribute('role','meter'); el.setAttribute('aria-valuemin','0'); el.setAttribute('aria-valuemax','100'); el.setAttribute('aria-valuenow',String(now)); if(lab) el.setAttribute('aria-label',lab); if(vt) el.setAttribute('aria-valuetext',vt); }
  function all(){
    document.querySelectorAll('.command-kpi__rail').forEach(function(r){ var c=r.closest('.command-kpi'); if(!c) return;
      var v=txt(c.querySelector('.command-kpi__value')).replace(/\s*\/\s*/,' of '), sub=txt(c.querySelector('.command-kpi__sub'));
      set(r, txt(c.querySelector('.command-kpi__label')), pct(r.querySelector('i')), v+(sub?' · '+sub:'')); });
    document.querySelectorAll('.status-row .track').forEach(function(t){ var row=t.closest('.status-row'), f=t.querySelector('.fill');
      var n=txt(row.querySelector('.count')), p=f?parseFloat(f.dataset.w)||0:0; set(t, txt(row.querySelector('.status-label')), Math.round(p), n+' patients, '+Math.round(p)+' %'); });
    document.querySelectorAll('.util-fill').forEach(function(f){ var tr=f.parentElement; if(!tr) return; var box=tr.closest('[class*="util"],.panel,.card')||tr.parentElement;
      var lab=txt(box&&box.querySelector('h3,h4,.util-lab,.lbl,.label'))||'Utilisation'; set(tr, lab, pct(f), pct(f)+' %'); });
  }
  var t=0; function soon(){ if(t) return; t=setTimeout(function(){ t=0; all(); },150); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  try{ new MutationObserver(soon).observe(document.body,{childList:true,subtree:true,characterData:true}); }catch(e){}
  window.pvxMeters={sync:all};
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21023)}

/* pvx-n192-js */

/* PVX-N192 - drag and drop: Undo after a move, Escape cancels a Rounds drag, spoken refusals */
try{(function(){
  var live=null;
  function say(t){ if(!live){ live=document.createElement('div'); live.id='pvxDndLive'; live.className='pvx-sr'; live.setAttribute('aria-live','assertive'); document.body.appendChild(live); }
    live.textContent=''; setTimeout(function(){ live.textContent=t; },40); }
  window.pvxSay=say;
  /* PVX-N202 - one undo history shared by the Undo buttons and Cmd-Z / Shift-Cmd-Z */
  window.pvxUndo=window.pvxUndo||(function(){ var U=[],R=[],busy=0;
    function info(t){ notify(t,'',{icon:'info',color:'var(--accent)'}); say(t); }
    function push(e){ U.push(e); if(U.length>25) U.shift(); if(!busy) R.length=0; return e; }
    function undoEntry(e){ var i=U.indexOf(e); if(i<0) return false; U.splice(i,1); var ok; busy++; try{ ok=e.undo(); } finally { busy--; } if(ok!==false&&e.redo) R.push(e); return ok!==false; }
    function undo(){ var e=U[U.length-1]; if(!e){ info('Nothing to undo'); return; } undoEntry(e); }
    function redo(){ var e=R.pop(); if(!e){ info('Nothing to redo'); return; } var ok, n=U.length; busy++; try{ ok=e.redo(); } finally { busy--; } if(ok!==false&&U.length===n) U.push(e); }   /* n314: unless the redo added its own entry */
    return {push:push,undo:undo,redo:redo,undoEntry:undoEntry,size:function(){ return [U.length,R.length]; }}; })();
  function act(title,sub,fn,opts,redo){
    var e=pvxUndo.push({label:title,undo:fn,redo:redo}), go=function(){ pvxUndo.undoEntry(e); };
    if(typeof window.fvNotifyAct==='function') window.fvNotifyAct(title,sub,'Undo',go,Object.assign({dur:8000},opts||{})); else notify(title,sub,opts); }

  /* ---- stage and room moves ---- */
  var depth=0;
  function snap(p){ var o=Object.assign({},p); o.timeline=(p.timeline||[]).slice(); if(p.ultrasound&&typeof p.ultrasound==='object') o.ultrasound=Object.assign({},p.ultrasound); return o; }
  function restore(q,o){ Object.keys(q).forEach(function(k){ if(k.charAt(0)!=='_'&&!(k in o)) delete q[k]; }); Object.keys(o).forEach(function(k){ if(k.charAt(0)!=='_') q[k]=o[k]; }); }
  function undo(id,o,after){
    var q=PATIENTS.find(function(x){ return x.id===id; });
    if(!q||q.completed||q.status!==after.status||q.room!==after.room){ notify('Can’t undo','This patient has moved since',{icon:'info',color:'var(--accent)'}); say('Can’t undo: this patient has moved since'); return false; }
    var sheet=q.tsSheet&&q.tsSheet.board, sheetWas=o.tsSheet&&o.tsSheet.board;
    restore(q,o);
    try{ if(typeof _usPid!=='undefined'&&_usPid===id&&typeof closeUltrasound==='function') closeUltrasound(); }catch(e){}   /* the request the move opened */
    try{ var A=window.fvAdmitSheet; if(A&&sheet&&!sheetWas&&!q._demo){ if(sheet==='OP') A.closeOP(q,'Move undone'); else if(sheet==='IP') A.undo(q); } }catch(e){}   /* the sheet the move made */
    scheduleRender(function(){ if(typeof activePatient!=='undefined'&&activePatient===q.id) fillDrawer(q); });
    var where=(o.status===after.status)?o.room:o.status;
    notify('Move undone',bcEsc(q.name||'')+' · back in '+bcEsc(where||''),{icon:'move',color:'var(--accent)'});
  }
  function undoable(name,when){
    var f=window[name]; if(typeof f!=='function') return;
    window[name]=function(p,to){
      if(depth||!p||!when(p,to)) return f.apply(this,arguments);
      var o=snap(p), real=window.notify, cap=null, r; depth++;
      window.notify=function(t,sub,op){ if(!cap){ cap=[t,sub,op]; return; } return real.apply(this,arguments); };   /* the move's own message gets the Undo */
      try{ r=f.apply(this,arguments); } finally { window.notify=real; depth--; }
      var after={status:p.status,room:p.room};
      if(after.status===o.status&&after.room===o.room){ if(cap) real.apply(null,cap); return r; }
      var args=[].slice.call(arguments,1);
      act(cap?cap[0]:'Moved',cap?cap[1]:'',function(){ return undo(p.id,o,after); },cap&&cap[2],function(){ var q=PATIENTS.find(function(x){ return x.id===p.id; }); if(q) window[name].apply(null,[q].concat(args)); });
      return r; };
  }
  undoable('moveStatus',function(p,ns){ return ns!=='Discharged'&&ns!=='Admitted'&&p.status!==ns; });   /* completions keep their own Undo */
  undoable('moveRoom',function(p,rm){ return !!rm&&p.room!==rm; });

  /* ---- ultrasound queue ---- */
  window.pvxQueueSnap=function(){ return PATIENTS.filter(function(x){ return x.ultrasound; }).map(function(x){ return [x.id,x.ultrasound.queuePosition]; }); };
  function qApply(qs){ qs.forEach(function(e){ var q=PATIENTS.find(function(x){ return x.id===e[0]; }); if(q&&q.ultrasound){ if(e[1]===undefined) delete q.ultrasound.queuePosition; else q.ultrasound.queuePosition=e[1]; } }); renderAll(); }
  window.pvxQueueUndo=function(q0){
    var q1=window.pvxQueueSnap();
    act('Queue updated','Ultrasound order changed by Internal Medicine',function(){
      qApply(q0); notify('Queue restored','Ultrasound order is back as it was',{icon:'move',color:'var(--s-ultrasound)'}); },{icon:'move',color:'var(--s-ultrasound)'},
      function(){ qApply(q1); window.pvxQueueUndo(q0); });
  };

  /* ---- Rounds order: Undo after a drag (arrow keys undo with the opposite arrow) ---- */
  var kbd=0, rdT=0;
  if(typeof window.rdRankMove==='function'){ var rm=window.rdRankMove; window.rdRankMove=function(){ kbd++; try{ return rm.apply(this,arguments); } finally { kbd--; } }; }
  if(typeof window.rdRankSave==='function'){ var rs=window.rdRankSave;
    window.rdRankSave=function(sec,pids,pid,to){
      var before=(pids||[]).map(function(id){ var q=rdFind(id); return q&&q.rounds?[id,q.rounds.rank,q.rounds.rankSec]:null; }).filter(Boolean);
      var r=rs.apply(this,arguments); if(r&&!kbd) rdOffer(before,pid,to); return r; }; }
  function rdOffer(before,pid,to){
    var t=document.getElementById('rdUndo'); if(!t){ t=document.createElement('div'); t.id='rdUndo'; t.className='rd-undo'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); }
    var p=rdFind(pid), nm=p?rdFullName(p):'';
    t.innerHTML='<span class="ru-msg"></span><button type="button" class="ru-undo">Undo</button><span class="ru-bar" aria-hidden="true"></span>';
    t.querySelector('.ru-msg').textContent=(nm?nm+' moved ':'Moved ')+(to===0?'to the top':'to #'+(to+1));
    t.classList.remove('open'); void t.offsetWidth; t.classList.add('open');
    clearTimeout(rdT); rdT=setTimeout(function(){ t.classList.remove('open'); },8000);
    function rdApply(st){ st.forEach(function(e){ var q=rdFind(e[0]); if(!q||!q.rounds) return; if(e[1]===undefined) delete q.rounds.rank; else q.rounds.rank=e[1]; if(e[2]===undefined) delete q.rounds.rankSec; else q.rounds.rankSec=e[2]; }); }
    var after=before.map(function(e){ var q=rdFind(e[0]); return q&&q.rounds?[e[0],q.rounds.rank,q.rounds.rankSec]:e; });
    var ent=pvxUndo.push({label:'Rounds order',undo:function(){ clearTimeout(rdT); t.classList.remove('open'); rdApply(before); var q=rdFind(pid); rdTouch(q,'Rounds order — move undone',true); say('Rounds order restored'); },
      redo:function(){ rdApply(after); var q=rdFind(pid); rdTouch(q,'Rounds order — move redone',true); say('Rounds order: move redone'); rdOffer(before,pid,to); }});
    t.querySelector('.ru-undo').onclick=function(){ pvxUndo.undoEntry(ent); };
  }

  /* ---- Escape cancels a Rounds drag ---- */
  window.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||!window.rdRk||typeof rdRankEnd!=='function') return;
    e.preventDefault(); e.stopImmediatePropagation();
    var d=window.rdRk; try{ d.row.releasePointerCapture(d.pid0); }catch(x){}
    rdRankEnd(false); say('Move cancelled');
  },true);
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21049)}

/* pvx-n192-guard */

/* PVX-N192 - a file or link dropped where nothing takes it does nothing (the page stays); text fields still take text */
try{(function(){
  function editable(t){ return t&&t.closest&&t.closest('input,textarea,[contenteditable]:not([contenteditable=false])'); }
  document.addEventListener('dragover',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='none'; });
  document.addEventListener('drop',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); });
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21139)}

/* pvx-n193-js */

/* PVX-N193 - entering data: labels tied to fields, required data before Create, checks as you leave a field, units as
   choices, the signed-in user as the triager, an in-app hours sheet, full text of clipped fields on hover */
try{(function(){
  var $=function(id){ return document.getElementById(id); };
  function hint(id,msg){ var el=$(id), h=$(id==='apName'?'apNameErr':id+'Hint');   /* the name keeps Flow's own message slot (FLOW-14) */ if(el){ if(msg) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); }
    if(h){ h.textContent=msg||''; h.classList.toggle('show',!!msg); } return !msg; }

  /* ---- 3. every label tied to its field ---- */
  var n=0;
  function tie(root){ (root||document).querySelectorAll('.ap-field > label:not([for]), .alert-field > label:not([for]), .ap-field > .lbl, .te-field > label:not([for])').forEach(function(l){
    var f=l.parentElement.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea'); if(!f) return;
    if(f.closest('label')===l) return; if(!f.id) f.id='pvxf'+(++n); if(l.tagName==='LABEL') l.htmlFor=f.id; else { if(!l.id) l.id='pvxl'+n; if(!f.getAttribute('aria-labelledby')&&!f.getAttribute('aria-label')) f.setAttribute('aria-labelledby',l.id); } }); }
  var tt=0; function soon(){ if(tt) return; tt=setTimeout(function(){ tt=0; tie(); },60); }
  tie(); try{ new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++) if(ms[i].addedNodes.length){ soon(); return; } }).observe(document.body,{childList:true,subtree:true}); }catch(e){}

  /* ---- 1. Add New Patient ---- */
  function unit(id){ var b=document.querySelector('[data-unit-for="'+id+'"] [aria-checked=true]'); return b?b.getAttribute('data-u'):''; }
  function setUnit(id,u){ document.querySelectorAll('[data-unit-for="'+id+'"] [data-u]').forEach(function(b){ b.setAttribute('aria-checked',String(b.getAttribute('data-u')===u)); }); }
  function bare(v){ return /^\d+(?:\.\d+)?$/.test(String(v||'').trim()); }
  function withUnit(id){ var el=$(id); if(!el) return ''; var v=el.value.trim(); return bare(v)?v+' '+unit(id):v; }
  var CHECK={
    apName:function(){ return $('apName').value.trim()?'':'Enter a patient name.'; },
    apSpecies:function(){ return (typeof apArrivalType!=='undefined'&&apArrivalType==='otw')||$('apSpecies').value?'':'Choose a species.'; },
    apPhone:function(){ var d=$('apPhone').value.replace(/\D/g,'').replace(/^1(?=\d{10})/,''); return !d||d.length===10?'':'Enter a 10-digit phone number.'; },
    apWeight:function(){ var v=withUnit('apWeight'); if(!v) return ''; var r=parseWeightInput(v); if(!r.valid) return 'Enter the weight as a number, in kg or lb.'; return r.kg>150?'Enter a weight from 0.01 to 150 kg.':''; },
    apAge:function(){ var v=$('apAge').value.trim(); if(!v) return ''; if(/^\d+\.\d+$/.test(v)) return 'Use whole numbers — for example 18 mo instead of 1.5 y.';
      if(bare(v)) return ''; return fmtAge(v)!==v||/^\d+\s*(years?|months?|weeks?|days?)(,\s*\d+\s*(years?|months?|weeks?|days?))*$/i.test(v)?'':'Enter the age as a number, in years or months.'; }
  };
  function need(){ return !$('apName').value.trim()||(!((typeof apArrivalType!=='undefined'&&apArrivalType==='otw'))&&!$('apSpecies').value&&!(typeof apReviewIntakeId!=='undefined'&&apReviewIntakeId)); }
  function syncCreate(){ var b=$('apCreate'); if(!b) return; var no=need(); b.classList.toggle('pvx-notyet',no); b.setAttribute('aria-disabled',String(no)); }
  function clearAll(){ Object.keys(CHECK).forEach(function(id){ hint(id,''); }); setUnit('apWeight','kg'); setUnit('apAge','y'); setTimeout(syncCreate,0); }
  function wireAp(){
    var M=$('apModal'); if(!M||M.__pvx193) return; M.__pvx193=1;
    M.addEventListener('input',function(e){ var id=e.target&&e.target.id; if(CHECK[id]&&e.target.getAttribute('aria-invalid')) hint(id,CHECK[id]());   /* fixed as you type once flagged */
      if(id==='apWeight'){ var v=e.target.value.toLowerCase(); if(/lb|#|pound/.test(v)) setUnit('apWeight','lb'); else if(/kg|kilo/.test(v)) setUnit('apWeight','kg'); }
      if(id==='apAge'){ var a=e.target.value.toLowerCase(); if(/m/.test(a)) setUnit('apAge','mo'); else if(/y/.test(a)) setUnit('apAge','y'); }
      syncCreate(); },true);
    M.addEventListener('change',function(e){ var id=e.target&&e.target.id; if(id==='apSpecies') hint(id,''); syncCreate(); },true);
    M.addEventListener('focusout',function(e){ var id=e.target&&e.target.id; if(id&&CHECK[id]&&id!=='apName'&&id!=='apSpecies') hint(id,CHECK[id]()); },true);
    M.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.pvx-unit [data-u]'); if(b){ var id=b.parentElement.getAttribute('data-unit-for'); setUnit(id,b.getAttribute('data-u')); if($(id).getAttribute('aria-invalid')) hint(id,CHECK[id]()); }
      setTimeout(syncCreate,0); },true);
    M.addEventListener('keydown',function(e){ var b=e.target.closest&&e.target.closest('.pvx-unit [data-u]'); if(!b||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')) return; e.preventDefault(); var o=b.parentElement.querySelectorAll('[data-u]'), i=[].indexOf.call(o,b), j=(i+(e.key==='ArrowRight'?1:o.length-1))%o.length; o[j].click(); o[j].focus(); },true);
    var cb=$('apCreate'), prev=cb.onclick;
    cb.onclick=function(ev){
      var order=['apName','apSpecies','apPhone','apWeight','apAge'], first=null;
      order.forEach(function(id){ var m=CHECK[id](); if(id==='apSpecies'&&typeof apReviewIntakeId!=='undefined'&&apReviewIntakeId) m=''; if(!hint(id,m)&&!first) first=id; });
      if(first){ var el=$(first); try{ el.focus(); }catch(e){} if(window.pvxSay) pvxSay(CHECK[first]()); return; }
      ['apWeight','apAge'].forEach(function(id){ var el=$(id); if(el&&bare(el.value)) el.value=el.value.trim()+(id==='apAge'?(unit(id)==='mo'?' mo':' y'):' '+unit(id)); });   /* the unit choice goes with the number */
      return prev.call(this,ev);
    };
  }
  if(typeof window.openAddPatient==='function'){ var oap=window.openAddPatient; window.openAddPatient=function(){ var r=oap.apply(this,arguments); wireAp(); clearAll(); return r; }; }
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#apArrival .ap-seg-btn')) setTimeout(function(){ hint('apSpecies',''); syncCreate(); },0); },true);
  wireAp();

  /* ---- 2. Edit Triage: decimal keypad and Anesia's input limits ---- */
  var LIM={temp:[77,113,'temperature','°F'],hr:[0,400,'heart rate','bpm'],rr:[0,150,'respiratory rate','breaths/min']};
  function triMsg(el){ var k=el.getAttribute('data-vk'), v=el.value.trim(); if(!v) return '';
    if(k==='weight'){ var r=parseWeightInput(v); if(!r.valid) return 'Enter the weight in kg (or type lb).'; return r.kg>150?'Enter a weight from 0.01 to 150 kg.':''; }
    var L=LIM[k]; if(!L) return ''; var m=v.match(/^-?\d+(?:\.\d+)?/); var x=m?parseFloat(m[0]):NaN;
    if(!m||v.replace(m[0],'').replace(/[°\s]|f$|bpm|rpm|br\/?min/gi,'')!==''||!isFinite(x)) return 'Enter the '+L[2]+' as a number.';
    return x<L[0]||x>L[1]?'Enter '+L[2]+' from '+L[0]+' to '+L[1]+' '+L[3]+'.':''; }
  function triShow(el,msg){ var h=el.__h; if(!h){ h=document.createElement('div'); h.className='ap-hint'; h.id='pvxth'+(++n); h.setAttribute('aria-live','polite'); el.insertAdjacentElement('afterend',h); el.setAttribute('aria-describedby',h.id); el.__h=h; }
    h.textContent=msg||''; h.classList.toggle('show',!!msg); if(msg) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); return !msg; }
  if(typeof window.openTriageEdit==='function'){ var ote=window.openTriageEdit; window.openTriageEdit=function(){ var r=ote.apply(this,arguments);
    document.querySelectorAll('#triEditBody [data-vk]').forEach(function(el){ el.setAttribute('inputmode','decimal'); el.setAttribute('autocomplete','off');
      el.addEventListener('blur',function(){ triShow(el,triMsg(el)); }); el.addEventListener('input',function(){ if(el.getAttribute('aria-invalid')) triShow(el,triMsg(el)); }); });
    var by=$('triEditBy'); if(by&&!by.value&&typeof CURRENT_USER==='string') by.value=CURRENT_USER;
    tie($('triEditModal')); return r; }; }
  var ts=$('triEditSave'); if(ts){ var tsave=ts.onclick; ts.onclick=function(ev){ var bad=null;
    document.querySelectorAll('#triEditBody [data-vk]').forEach(function(el){ if(!triShow(el,triMsg(el))&&!bad) bad=el; });
    if(bad){ bad.focus(); if(window.pvxSay) pvxSay(bad.__h.textContent); return; } return tsave.call(this,ev); }; }

  /* ---- 4. authorized hours: an in-app sheet ---- */
  window.pvxHoursSheet=function(cur,done){
    showConfirm('Authorized hours','Save',function(){},{});
    var box=$('confirmBox'), ok=$('confirmOk'), sub=$('confirmSub'), old=box.querySelector('.pvx-hwrap'); if(old) old.remove();
    var w=document.createElement('div'); w.className='pvx-hwrap';
    w.innerHTML='<div class="pvx-hours"><button type="button" data-h="-1" aria-label="12 hours fewer">−</button><input id="pvxHours" inputmode="numeric" autocomplete="off" aria-label="Total authorized hours" aria-describedby="pvxHoursErr"><span class="pvx-hours-u">hours</span><button type="button" data-h="1" aria-label="12 hours more">+</button></div><div class="pvx-hours-err" id="pvxHoursErr" aria-live="polite"></div>';
    sub.insertAdjacentElement('afterend',w); box.setAttribute('aria-labelledby','confirmTitle');
    var inp=w.querySelector('input'), err=w.querySelector('.pvx-hours-err'); inp.value=String(Math.max(0,Math.round(+cur||0)));
    function read(){ var v=inp.value.trim(); return /^\d{1,3}$/.test(v)?+v:null; }
    w.querySelectorAll('[data-h]').forEach(function(b){ b.onclick=function(){ var v=read(); v=v===null?0:v; v=Math.max(0,Math.min(999,v+12*(+b.getAttribute('data-h')))); inp.value=String(v); err.textContent=''; inp.removeAttribute('aria-invalid'); }; });
    function close(){ $('confirmScrim').classList.remove('open'); box.classList.remove('open'); setTimeout(function(){ if(!box.classList.contains('open')) w.remove(); },300); }
    function save(){ var v=read(); if(v===null){ err.textContent='Enter whole hours from 0 to 999.'; inp.setAttribute('aria-invalid','true'); inp.focus(); return; } close(); done(v); }
    ok.onclick=save; inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); save(); } if(e.key==='Escape'){ e.preventDefault(); close(); } });
    $('confirmCancel').onclick=close; $('confirmScrim').onclick=close;
    setTimeout(function(){ inp.focus(); inp.select(); },60);
  };
  if(typeof window.showConfirm==='function'){ var sc=window.showConfirm; window.showConfirm=function(){ var x=document.querySelector('#confirmBox .pvx-hwrap'); if(x) x.remove(); return sc.apply(this,arguments); }; }

  /* ---- 5. Mac expansion tooltip: a clipped field shows its full text on hover ---- */
  document.addEventListener('mouseover',function(e){ var el=e.target; if(!el||el.tagName!=='INPUT'||!/^(text|search|email|tel|url|)$/.test(el.type||'')) return;
    if(el.title&&!el.__pvxTip) return; var clip=el.scrollWidth>el.clientWidth+1&&el.value;
    if(clip){ el.title=el.value; el.__pvxTip=1; } else if(el.__pvxTip){ el.removeAttribute('title'); el.__pvxTip=0; } },true);
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21169)}

/* pvx-n194-js */

/* PVX-N194 - full screen: Rounds Display stays in Rounds and follows full screen; the lobby TV's controls come back with a tap */
try{(function(){
  /* leaving full screen that Display entered ends Display (the top bar is never hidden in a normal window) */
  document.addEventListener('fullscreenchange',function(){
    if(!document.fullscreenElement&&window.__rdFs){ window.__rdFs=false; if(typeof rdToggleDisplay==='function') rdToggleDisplay(false); } });
  /* Display belongs to Rounds: leaving Rounds puts the top bar back, coming back resumes Display */
  if(typeof window.switchApp==='function'){ var sa=window.switchApp;
    window.switchApp=function(app){ var r=sa.apply(this,arguments);
      try{ if(app!=='rounds'&&document.body.classList.contains('rd-display')) rdDisplayState(false);
        else if(app==='rounds'&&window.__rdDisplayWant&&!document.body.classList.contains('rd-display')) rdDisplayState(true); }catch(e){}
      return r; }; }
  /* lobby TV: a tap shows Exit Full screen, like moving the mouse */
  ['pointerdown','touchstart'].forEach(function(ev){ document.addEventListener(ev,function(){ if(document.body.classList.contains('fs-mode')&&typeof fsPokeExit==='function') fsPokeExit(); },{capture:true,passive:true}); });
  /* lobby TV: if full screen ends, the tap-to-enter prompt comes back (entering is still a tap) */
  var armed=false;
  function arm(){ if(armed) return; armed=true;
    var go=function(){ teardown(); try{ enterFullscreen(); }catch(e){} try{ removeFsHint(); }catch(e){} };
    var teardown=function(){ armed=false; ['click','keydown','touchend'].forEach(function(ev){ document.removeEventListener(ev,go,true); }); };
    ['click','keydown','touchend'].forEach(function(ev){ document.addEventListener(ev,go,true); }); }
  ['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,function(){
    var fs=!!(document.fullscreenElement||document.webkitFullscreenElement);
    if(!fs&&document.body.classList.contains('tv-mode')){ setTimeout(function(){ try{ showFsHint(); }catch(e){} arm(); },300); } }); });
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21267)}

/* pvx-n195-js */

/* PVX-N195 - launching: theme transitions back on once the first screen is up; remember and restore where you were;
   the status bar follows the theme */
try{(function(){
  var d=document.documentElement;
  function up(){ d.classList.remove('pvx-pre-dark','pvx-pre-light'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ setTimeout(function(){ d.classList.remove('pvx-boot'); },120); }); }); }
  if(document.readyState==='complete') up(); else window.addEventListener('load',up);
  /* status bar */
  var meta=document.querySelector('meta[name="theme-color"]');
  function tint(){ if(meta) meta.setAttribute('content',document.body.classList.contains('dark')?'#0A1222':'#F2F4F8'); }
  tint(); try{ new MutationObserver(tint).observe(document.body,{attributes:true,attributeFilter:['class']}); }catch(e){}
  /* where you were */
  var KEY='pvx:rounds:where', R=window.__pvxRestore||null, ready=!R;
  function get(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null')||{}; }catch(e){ return {}; } }
  function save(p){ if(!ready||document.body.classList.contains('tv-mode')) return; try{ var o=get(); for(var k in p) o[k]=p[k]; o.at=Date.now(); localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  function app(){ return typeof currentApp!=='undefined'?currentApp:'flow'; }
  function view(){ return app()==='ultrasound'?'us:'+(typeof currentUsView!=='undefined'?currentUsView:''):app()==='rounds'?'rounds':(typeof currentView!=='undefined'?currentView:''); }
  [['switchApp',function(a){ save({app:a}); }],['switchView',function(v){ save({app:'flow',view:v}); }],['switchUsView',function(v){ save({usView:v}); }]].forEach(function(x){
    var f=window[x[0]]; if(typeof f!=='function') return; window[x[0]]=function(a){ var r=f.apply(this,arguments); try{ x[1](a); }catch(e){} return r; }; });
  var st=document.getElementById('stage'), stT=0;
  function keep(){ if(!ready||!st) return; var o=get(); o.scroll=o.scroll||{}; o.scroll[view()]=Math.round(st.scrollTop); o.at=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  if(st) st.addEventListener('scroll',function(){ if(!ready) return; clearTimeout(stT); stT=setTimeout(keep,200); },{passive:true});
  window.addEventListener('pagehide',keep); document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') keep(); });   /* an app the iPad closes keeps its place */
  function scrollBack(){ var o=get(), y=o.scroll&&o.scroll[view()]; if(!st||!y) return; var moved=false, mark=function(){ moved=true; };
    st.addEventListener('wheel',mark,{once:true,passive:true}); st.addEventListener('touchstart',mark,{once:true,passive:true});
    var go=function(){ if(!moved&&st.scrollHeight-st.clientHeight>=y-4) st.scrollTo({top:y,behavior:'instant'}); }; go(); setTimeout(go,500); setTimeout(go,1200); }
  if(R){
    /* the existing #app= boot switches the app at 250 ms and keeps Flow hidden until its two frames; the view goes first */
    setTimeout(function(){
      try{ if(R.app==='flow'&&R.view&&R.view!=='dashboard'&&typeof switchView==='function') switchView(R.view);
        if(R.app==='ultrasound'&&R.usView&&typeof switchUsView==='function') switchUsView(R.usView); }catch(e){ console.warn('[restore]',e); }
      ready=true; setTimeout(scrollBack,350);
    },260);
  } else setTimeout(scrollBack,600);
  window.pvxWhere={get:get};
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21294)}

/* pvx-n196-js */

/* PVX-N196 - offering help: Tap on touch, Click with a mouse; money fields edit with one click, tap or Return */
try{(function(){
  var coarse=false; try{ coarse=matchMedia('(pointer:coarse)').matches; }catch(e){}
  function words(){ var w=coarse?'Tap':'Click'; document.querySelectorAll('.pvx-tapclick').forEach(function(x){ if(x.textContent!==w) x.textContent=w; }); }
  words(); try{ new MutationObserver(function(){ words(); }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  function edit(el){ el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true})); }   /* the existing editor opens on dblclick */
  document.addEventListener('click',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.rd-fin-edit[data-fin-key]'); if(!el||e.detail>1) return; edit(el); });
  document.addEventListener('keydown',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.rd-fin-edit[data-fin-key]'); if(!el||(e.key!=='Enter'&&e.key!==' ')) return; e.preventDefault(); e.stopPropagation(); edit(el); },true);
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21331)}

/* pvx-n197-js */

/* PVX-N197 - notifications: failures stay; critical ultrasound findings reach the board; Reminder chime setting */
try{(function(){
  /* failures stay until dismissed (and are read at once) */
  var FAIL=/^(Not saved|Couldn[’']t |Could not |Prices not saved)/;
  if(typeof window.notify==='function'){ var nf=window.notify; window.notify=function(t,sub,o){ o=o||{}; if(FAIL.test(String(t||''))&&o.sticky===undefined) o=Object.assign({},o,{sticky:true}); return nf.call(this,t,sub,o); }; }

  /* critical ultrasound findings: card flag (usFlag), Attention Center until seen, a message when one arrives */
  function crit(p){ var u=p&&p.ultrasound; return !!(u&&u.criticalFinding&&!u.critSeenAt&&isActive(p)); }
  function nm(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
  function safe(f){ try{ return f()||''; }catch(e){ return ''; } }
  function by(p){ var u=p.ultrasound; return (u.performingDoctor&&safe(function(){ return drName(u.performingDoctor); }))||'Internal Medicine'; }
  if(typeof window.attentionItems==='function'){ var ai=window.attentionItems;
    window.attentionItems=function(){ var a=ai.apply(this,arguments);
      try{ PATIENTS.filter(crit).forEach(function(p){ a.unshift({key:'uscrit:'+p.id,sev:'red',icon:'flask',t:p.name+' — critical ultrasound finding',s:'Flagged by '+by(p)+' · '+safe(function(){ return docShort(p.doctor); }),p:p}); }); }catch(e){ console.warn('[uscrit]',e); }
      return a; }; }
  function markSeen(pid){ var p=PATIENTS.find(function(x){ return x.id===pid; }); if(!p||!p.ultrasound) return;
    var by=(typeof CURRENT_USER==='string'&&CURRENT_USER)||'Staff'; p.ultrasound.critSeenAt=new Date(); p.ultrasound.critSeenBy=by;
    try{ usTimeline(p,'Critical ultrasound finding seen',by); }catch(e){ (p.timeline=p.timeline||[]).push({label:'Critical ultrasound finding seen',at:new Date(),meta:by}); }
    try{ renderAll(); }catch(e){} notify('Marked seen',bcEsc(nm(p))+' · critical ultrasound finding',{icon:'check',color:'var(--s-admitted)'}); }
  window.pvxCritSeen=markSeen;
  if(typeof window.dismissAlert==='function'){ var da=window.dismissAlert; window.dismissAlert=function(key){ if(String(key||'').indexOf('uscrit:')===0){ markSeen(String(key).slice(7)); return; } return da.apply(this,arguments); }; }
  function label(){ document.querySelectorAll('#attnList .attn-item[data-key^="uscrit:"]').forEach(function(it){
    var b=it.querySelector('.attn-clear'); if(b){ b.setAttribute('aria-label','Mark seen'); b.title='Mark seen'; }
    var g=it.querySelector('.overdue-badge'); if(g){ g.setAttribute('aria-label','Critical'); var tx=g.querySelector('.overdue-text'); if(tx&&tx.textContent!=='CRITICAL') tx.textContent='CRITICAL'; } }); }   /* a finding, not a wait */
  if(typeof window.renderAttention==='function'){ var rat=window.renderAttention; window.renderAttention=function(){ var r=rat.apply(this,arguments); label(); return r; }; }
  var announced=null, BOOT=Date.now();
  function sweep(){
    try{ label();
      var now=PATIENTS.filter(crit).map(function(p){ return p.id; });
      if(announced===null||Date.now()-BOOT<8000){ announced=new Set(now); return; }   /* at start-up the board and Attention Center show them */
      var tv=document.body.classList.contains('tv-mode'), us=(typeof currentApp!=='undefined'&&currentApp==='ultrasound');
      now.forEach(function(id){ if(announced.has(id)) return; announced.add(id); if(tv||us) return;
        var p=PATIENTS.find(function(x){ return x.id===id; }), fb=by(p);
        var o={icon:'info',color:'var(--priority-p1)',sticky:true};
        if(typeof window.fvNotifyAct==='function') fvNotifyAct('Critical ultrasound finding',bcEsc(nm(p))+' · flagged by '+bcEsc(fb),'Open',function(){ openDrawer(id); },o);
        else notify('Critical ultrasound finding',bcEsc(nm(p))+' · flagged by '+bcEsc(fb),o);
        if(window.pvxSay) pvxSay('Critical ultrasound finding: '+nm(p)+', flagged by '+fb); });
    }catch(e){}
  }
  if(typeof window.renderAll==='function'){ var ra=window.renderAll; window.renderAll=function(){ var r=ra.apply(this,arguments); setTimeout(sweep,0); return r; }; }
  setInterval(sweep,3000);

  /* Operations > Reminder chime, per screen */
  var K='pvx:sound:reminder';
  function on(){ try{ return localStorage.getItem(K)!=='off'; }catch(e){ return true; } }
  function paint(){ var b=document.getElementById('opsChime'), s2=document.getElementById('opsChimeS'); if(!b) return; var v=on(); b.setAttribute('aria-checked',String(v)); if(s2) s2.textContent=(v?'On':'Off')+' · this screen'; }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#opsChime'); if(!b) return; e.preventDefault(); e.stopPropagation();
    try{ localStorage.setItem(K,on()?'off':'on'); }catch(x){} paint(); if(window.pvxSay) pvxSay('Reminder chime '+(on()?'on':'off')+' on this screen. A new critical case always chimes.'); },true);
  paint();
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21353)}

/* script */

/* PVX-N198 - action sheets: confirmations and Rounds menus */
try{(function(){
  function phone(){ return window.innerWidth<600; }
  function coarse(){ try{ return matchMedia('(pointer:coarse)').matches; }catch(e){ return false; } }
  var box=document.getElementById('confirmBox'), cancel=document.getElementById('confirmCancel');

  /* 1-2. confirmations */
  var opener=null;
  if(box&&typeof window.showConfirm==='function'){
    var sc=window.showConfirm;
    window.showConfirm=function(title,okLabel,onOk,opts){
      var a=document.activeElement; opener=(a&&a!==document.body&&!box.contains(a))?a:opener;
      var r=sc.apply(this,arguments);
      box.classList.toggle('pvx-as',phone());
      var danger=!!(opts&&(opts.danger||opts.noDefault));   /* n311: no default either when the action is final */
      setTimeout(function(){
        if(!box.classList.contains('open')||box.querySelector('.pvx-hwrap')) return;   /* the hours sheet focuses its field */
        var f=danger?box:document.getElementById('confirmOk'); if(f) try{ f.focus({preventScroll:true}); }catch(e){ f.focus(); }   /* PVX-N209: no default on a destructive alert */
      },40);
      return r;
    };
    new MutationObserver(function(){
      if(box.classList.contains('open')) return;
      var a=document.activeElement, o=opener; opener=null;
      if(o&&o.isConnected&&(!a||a===document.body||box.contains(a))) try{ o.focus({preventScroll:true}); }catch(e){}
    }).observe(box,{attributes:true,attributeFilter:['class']});
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||!box.classList.contains('open')) return;
      e.preventDefault(); e.stopPropagation(); if(cancel) cancel.click();
    },true);
    window.addEventListener('resize',function(){ if(box.classList.contains('open')) box.classList.toggle('pvx-as',phone()); });
  }

  /* 3. Rounds menus */
  if(typeof window.rdMenu!=='function') return;
  var DANGER=/^(Clear |Undo |Remove )/;
  function esc(t){ return (typeof rdEsc==='function')?rdEsc(t):String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  window.rdMenu=function(anchor,items,onPick){
    rdCloseMenus();
    var plain=[], bad=[];
    items.forEach(function(i){ (i.danger||DANGER.test(i.label||'')?bad:plain).push(i); });
    var radio=items.some(function(i){ return typeof i.on==='boolean'; });   /* n321: choices, chosen or not */
    function row(i,d){ return '<button type="button" tabindex="-1" role="'+(radio?'menuitemradio':'menuitem')+'"'+(radio?' aria-checked="'+(!!i.on)+'"':'')+' data-v="'+esc(i.value)+'" class="'+(i.on?'on ':'')+(d?'danger':'')+'">'+(radio?'<svg class="rd-ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':'')+esc(i.label)+'</button>'; }
    var html=plain.map(function(i){ return i.sep?'<div class="rd-msep" role="separator"></div>':row(i,false); }).join('')+(bad.length&&plain.length?'<div class="rd-msep" role="separator"></div>':'')+bad.map(function(i){ return row(i,true); }).join('');
    var label=(anchor&&(anchor.getAttribute('aria-label')||anchor.getAttribute('title')||(anchor.textContent||'').trim().slice(0,40)))||'Options';
    var as=phone(), m=document.createElement('div');
    m.className='rd-menu'+(as?' rd-as':'')+(coarse()?' rd-touch':'')+(radio?' rd-radio':'');   /* PVX-N203 */
    if(as) m.innerHTML='<div class="rd-assheet" role="menu" aria-label="'+esc(label)+'"><div class="rd-asgroup">'+html+'</div><button type="button" class="rd-ascancel">Cancel</button></div>';
    else { m.setAttribute('role','menu'); m.setAttribute('aria-label',label); m.innerHTML=html; }
    document.body.appendChild(m);
    if(!as){
      var r=anchor.getBoundingClientRect(), vh=window.innerHeight, h=m.scrollHeight, below=vh-r.bottom-18, above=r.top-18, top, maxH;
      if(h<=below||below>=above){ maxH=Math.max(120,below); top=r.bottom+6; }
      else { maxH=Math.max(120,above); top=Math.max(12,r.top-6-Math.min(h,maxH)); }
      m.style.maxHeight=maxH+'px';
      m.style.left=Math.max(12,Math.min(r.left,window.innerWidth-m.offsetWidth-12))+'px';
      m.style.top=top+'px';
    }
    var opts=[].slice.call(m.querySelectorAll('button'));   /* the items, then Cancel on phones */
    function close(back){
      m.remove(); document.removeEventListener('click',outside,true);
      if(back&&anchor&&anchor.isConnected) try{ anchor.focus({preventScroll:true}); }catch(e){}
    }
    function outside(ev){ if(!m.isConnected){ document.removeEventListener('click',outside,true); return; } if(!m.contains(ev.target)) close(false); }
    m.addEventListener('click',function(e){
      if(e.target===m||e.target.closest('.rd-ascancel')){ e.stopPropagation(); close(true); return; }
      var b=e.target.closest('button[data-v]'); if(!b) return;
      var v=b.dataset.v; close(false); onPick(v);
    });
    m.addEventListener('keydown',function(e){
      var i=opts.indexOf(document.activeElement);
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(true); return; }
      if(e.key==='Tab'){ close(false); return; }
      var n=null;
      if(e.key==='ArrowDown') n=(i+1)%opts.length; else if(e.key==='ArrowUp') n=(i-1+opts.length)%opts.length;
      else if(e.key==='Home') n=0; else if(e.key==='End') n=opts.length-1;
      if(n!==null){ e.preventDefault(); opts[n].focus(); }
    });
    setTimeout(function(){ if(m.isConnected) document.addEventListener('click',outside,true); },0);
    var first=m.querySelector('button.on')||opts[0]; if(first) try{ first.focus({preventScroll:true}); }catch(e){ first.focus(); }
    if(anchor&&anchor.setAttribute){ anchor.setAttribute('aria-expanded','true');   /* PVX-N206: the trigger says its menu is open */
      var mo=new MutationObserver(function(){ if(!m.isConnected){ anchor.setAttribute('aria-expanded','false'); mo.disconnect(); } }); mo.observe(document.body,{childList:true}); }
  };
  /* Esc also closes a menu that lost focus */
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&document.querySelector('.rd-menu')){ e.preventDefault(); rdCloseMenus(); } });
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21406)}

/* script */

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
try{(function () {
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
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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
      if (title) h += '<button type="button" role="menuitem" class="back" data-back="1"><span class="c" aria-hidden="true">‹</span><span class="l">' + esc(title) + '</span></button><div role="separator"></div>';
      level.forEach(function (it, i) {
        if (it.sep) { h += '<div role="separator"></div>'; return; }
        var ck = it.checked !== undefined;   /* n204: an option can show a checkmark (the current choice) */
        h += '<button type="button" role="' + (ck ? 'menuitemradio' : 'menuitem') + '"' + (ck ? ' aria-checked="' + !!it.checked + '"' : '') + ' data-i="' + i + '"' + ((it.danger || it.disabled) ? ' class="' + (it.danger ? 'danger' : '') + (it.disabled ? ' off' : '') + '"' : '') + (it.disabled ? ' aria-disabled="true"' : '') + (it.sub ? ' aria-haspopup="menu"' : '') + '>' + (ck ? '<svg class="k" viewBox="0 0 24 24" aria-hidden="true"' + (it.checked ? '' : ' style="visibility:hidden"') + '><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '') + '<span class="l">' + esc(it.label) + '</span>' + (it.sub ? '<span class="c" aria-hidden="true">›</span>' : '') + '</button>';
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
        if (show(el, e, 'hold')) { eat = Date.now(); try { if (navigator.vibrate && matchMedia('(pointer:coarse)').matches && !(window.__pvxBuzz && Date.now() - window.__pvxBuzz < 600)) navigator.vibrate(6); } catch (x) { }   /* n313: one tick per hold */ }
      }, opt.holdMs || 500);
    }, true);
    document.addEventListener('pointermove', function (e) { if (t && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) clear(); }, { passive: true, capture: true });
    ['pointerup', 'pointercancel', 'dragstart'].forEach(function (k) { document.addEventListener(k, function (e) { clear(); if (k === 'dragstart' && cur && Date.now() - lastOpen < 1500) close(false); }, true); });
    document.addEventListener('click', function (e) { if (eat && Date.now() - eat < 900) { eat = 0; e.preventDefault(); e.stopPropagation(); } }, true);
  }
  window.PvxCtx = { open: open, close: close, bind: bind, isOpen: function () { return !!cur; } };
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21505)}

/* PVX-N201 - Flow's context menus */
try{(function(){
  if(!window.PvxCtx) return;
  function find(pid){ return (typeof PATIENTS!=='undefined'?PATIENTS:[]).find(function(x){ return x.id===pid; }); }
  function shown(){ var b=document.body.classList; return !(b.contains('tv-mode')||b.contains('client-mode')); }
  function nm(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
  function call(name){ var f=window[name]; return typeof f==='function'?f:null; }
  function copyLink(p){ var u=trackUrlFor(p); function said(t){ if(typeof toast==='function') toast(t); }
    try{ navigator.clipboard.writeText(u).then(function(){ said('Tracker link copied'); },function(){ said('Link: '+u); }); }catch(e){ said('Link: '+u); } }
  function flowItems(p){
    var done=typeof isCompleted==='function'&&isCompleted(p);
    var stages=done?[]:STAGE_ORDER.filter(function(st){ return st!==p.status; }).map(function(st){ return {label:st,act:function(){ call('moveStatus')(p,st); }}; });
    var rooms=done?[]:ROOMS.concat(['Treatment']).filter(function(rm){ return rm!==p.room&&canDropRoom(p,rm); }).map(function(rm){ return {label:rm,act:function(){
      if(rm==='Comfort Room') showConfirm('Move patient to Comfort Room?','Move patient',function(){ call('moveRoom')(p,rm); }); else call('moveRoom')(p,rm); }}; });
    var docs=done?[]:DOCTORS.filter(function(d){ return d.id!==p.doctor; }).map(function(d){ return {label:d.name,act:function(){ call('assignDoctor')(p,d.id); try{ renderAll(); }catch(e){} }}; });
    return [{label:'Open',act:function(){ openDrawer(p.id); }}, {sep:1},
      stages.length&&{label:'Move to',sub:stages}, rooms.length&&{label:'Room',sub:rooms}, docs.length&&{label:'Assign doctor',sub:docs}, {sep:1},
      (!done&&window.fvDocs&&fvDocs.openSend)&&{label:'Send a form…',act:function(){ fvDocs.openSend(p); }},
      (p.publicToken&&typeof trackUrlFor==='function')&&{label:'Copy tracker link',act:function(){ copyLink(p); }}];
  }
  function rdMovable(row,d){ var g=row&&row.parentElement; if(!g||!g.matches('.rd-secgroup[data-sec]')||!row.querySelector('.rd-grip')) return false;   /* n319 */
    var rows=[].filter.call(g.children,function(c){ return c.classList&&c.classList.contains('rd-row'); }), i=rows.indexOf(row); return i>=0&&i+d>=0&&i+d<rows.length; }
  function rdItems(p,row){
    var r=p.rounds||{}, ended=!!r.outcome, open=row.classList.contains('open');
    var cur=typeof rdCurrentDocId==='function'?rdCurrentDocId(p):null;
    return [{label:open?'Close':'Open',act:function(){ rdHandleAct('toggle',row.querySelector('.rd-rowmain')||row); }},
      !ended&&typeof RD_ACUITY!=='undefined'&&{label:'Status',sub:Object.keys(RD_ACUITY).filter(function(k){ return k!==r.acuity; }).map(function(k){ return {label:RD_ACUITY[k].label,act:function(){ rdSetAcuity(p,k); }}; })},
      !ended&&typeof rdAllDoctors==='function'&&{label:'Take case',sub:(typeof rdDocsOrdered==='function'?rdDocsOrdered(p):rdAllDoctors()).filter(function(d){ return d.id!==cur; }).map(function(d){ return d.sep?d:{label:drName(d.name)+(d._team?' · on service':'')+(typeof rdActorId!=='undefined'&&rdActorId===d.id?' (you)':''),act:function(){ rdTakeCase(p,d.id); }}; })},   /* n320 */
      (typeof rdCanRank==='function'&&rdCanRank()&&!open&&!ended&&rdMovable(row,-1))&&{label:'Move up',act:function(){ rdRankMove(p.id,-1); }},
      (typeof rdCanRank==='function'&&rdCanRank()&&!open&&!ended&&rdMovable(row,1))&&{label:'Move down',act:function(){ rdRankMove(p.id,1); }},
      {sep:1},
      typeof rdShare==='function'&&{label:'Share…',act:function(){ rdShare(p.id); }},
      find(p.id)&&{label:'Show in Flow',act:function(){ try{ sessionStorage.setItem('pvx:open-patient',String(p.id)); }catch(e){} location.href='/#app=flow'; }}];   /* n309: Flow is another page since n305 */
  }
  var SEL='#board .card[data-pid],#tableBody tr[data-pid],.r-pt[data-pid],.rd-row[data-pid]>.rd-rowmain';
  PvxCtx.bind(SEL,function(el){
    if(!shown()) return null;
    var row=el.classList.contains('rd-rowmain')?el.parentElement:null, pid=(row||el).getAttribute('data-pid');
    var p=row?(typeof rdFind==='function'?rdFind(pid):null):find(pid); if(!p) return null;
    return {items:row?rdItems(p,row):flowItems(p),label:'Actions for '+nm(p),lift:row||el};
  },{touchOnly:true,holdMs:500,
     skip:function(el,e){ if(e.type==='contextmenu'){ try{ var s=window.getSelection&&window.getSelection(); if(s&&!s.isCollapsed&&String(s).trim()&&el.contains(s.anchorNode)) return true; }catch(x){} }   /* n320 */
      return e.type==='pointerdown'&&!!(e.target.closest('button,a,input,select,textarea,[role=button]')&&e.target.closest('button,a,input,select,textarea,[role=button]')!==el); },
     beforeHold:function(){ if(window.rdRk&&typeof rdRankEnd==='function') rdRankEnd(false); }});
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21682)}

/* pvx-n202-js */

/* PVX-N202 - Cmd-Z / Shift-Cmd-Z (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) undo and redo the last change that offered Undo */
try{(function(){
  function typing(){ var a=document.activeElement; return !!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)); }
  function shown(el){ var r=el.getBoundingClientRect(); if(!r.width||!r.height) return false; var c=getComputedStyle(el); return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05&&c.pointerEvents!=='none'; }
  function modal(){ if(window.PvxCtx&&PvxCtx.isOpen()) return true; if(document.querySelector('.rd-menu,.pvx-menu')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),shown); }
  document.addEventListener('keydown',function(e){
    if(!(e.metaKey||e.ctrlKey)||e.altKey||!window.pvxUndo) return;
    var k=(e.key||'').toLowerCase(), isUndo=k==='z'&&!e.shiftKey, isRedo=(k==='z'&&e.shiftKey)||(k==='y'&&e.ctrlKey&&!e.metaKey);
    if(!isUndo&&!isRedo) return;
    var b=document.body.classList; if(b.contains('tv-mode')||b.contains('client-mode')||typing()||modal()) return;   /* the field's own Undo, or nothing */
    e.preventDefault(); e.stopPropagation(); if(isUndo) pvxUndo.undo(); else pvxUndo.redo();
  },true);
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21728)}

/* pvx-n203-js */

/* PVX-N203 - the Operations menu works from the keyboard and gives focus back to + */
/* n305: Flow only */

/* script */

/* PVX-KEYS n207 - the Keyboard shortcuts sheet, shared by Flow and Anesia (HIG The menu bar; claude/hig-audit-menu-bar.md).
   A web app can't put its commands in the Mac menu bar, so this sheet does the menu bar's other job: it lists every
   shortcut, by group, next to the command it runs. Self-contained: it injects its own styles on first use.
   PvxKeys.bind(groups())        -> "?" opens / closes the sheet (not while typing, not over another dialog or menu)
   PvxKeys.open(groups(), from)  -> opens it; ✕ Close, Esc, Command-Period or ? closes it (n211: a view-only sheet closes with ✕, not Done) and focus returns to `from`
   PvxKeys.cap(keys)             -> keycap HTML for ['alt','V'], ['mod','K'] (Mac: ⌥ ⌘; Windows: Alt, Ctrl)
   PvxKeys.aria(keys)            -> the aria-keyshortcuts value ("Alt+V", "Meta+K Control+K")
   groups: [{title, items:[{keys:['alt','V'], label:'Vitals now'}, ...]}, ...] */
try{(function () {
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
  /* n209: Command-Period cancels wherever Esc does (HIG Alerts) - it is passed on as an Esc press */
  window.addEventListener('keydown', function (e) {
    if (!(e.metaKey && !e.ctrlKey && !e.altKey && (e.key === '.' || e.code === 'Period'))) return;
    e.preventDefault(); e.stopPropagation();
    var t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
    var ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true });
    t.dispatchEvent(ev);
  }, true);
  window.PvxKeys = { open: open, close: close, bind: bind, cap: cap, aria: aria, word: word, text: text, mac: MAC, isOpen: function () { return !!cur; } };
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21778)}

/* PVX-N207 - Flow's keyboard: view keys, the shortcuts sheet, the search keycap, /#op=new */
try{(function(){
  /* the views in their order on screen (Consent forms joins when it is available) */
  function views(){ return [].slice.call(document.querySelectorAll('#subnavFlow .seg[data-view]')).slice(0,9).map(function(b){ var c=b.cloneNode(true); [].forEach.call(c.querySelectorAll('[class*="badge"],[hidden],svg'),function(x){ x.remove(); }); return [b.dataset.view,(c.textContent||'').replace(/\s+/g,' ').trim(),b]; }); }
  function typing(){ var a=document.activeElement; return !!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)); }
  function shown(el){ var r=el.getBoundingClientRect(); if(!r.width||!r.height) return false; var c=getComputedStyle(el); return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05&&c.pointerEvents!=='none'; }
  function modal(){ if(window.PvxCtx&&PvxCtx.isOpen()) return true; if(PvxKeys.isOpen()) return true; if(document.querySelector('.rd-menu,.pvx-menu')) return true;
    if(document.getElementById('opsMenu')&&document.getElementById('opsMenu').classList.contains('open')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),shown); }
  function screenMode(){ var b=document.body.classList; return b.contains('tv-mode')||b.contains('client-mode'); }
  function app(){ try{ return currentApp; }catch(e){ return 'flow'; } }
  /* tooltips and aria-keyshortcuts on the view buttons, kept in step when a view joins */
  function label(){ views().forEach(function(v,i){ var k='Alt+'+(i+1); if(v[2].getAttribute('aria-keyshortcuts')===k) return; v[2].setAttribute('aria-keyshortcuts',k); v[2].title='Show '+v[1]+' ('+PvxKeys.text(['alt',String(i+1)])+')'; }); }
  label(); setTimeout(label,1500);
  var sw=document.querySelector('#subnavFlow .switcher')||document.getElementById('switcher'); if(sw&&window.MutationObserver) new MutationObserver(label).observe(sw,{childList:true});
  document.addEventListener('keydown',function(e){
    if(!e.altKey||e.metaKey||e.ctrlKey||e.shiftKey) return;
    var m=/^Digit([1-9])$/.exec(e.code||''); if(!m) return;
    if(typing()||modal()||screenMode()||app()!=='flow') return;
    var v=views()[+m[1]-1], b=v&&v[2]; if(!b||!shown(b)) return;
    e.preventDefault(); b.click();
  });
  /* the search keycap: Ctrl K off the Mac; hidden while the field has text */
  var key=document.getElementById('globalSearchKey'), inp=document.getElementById('globalSearch');
  if(key&&!PvxKeys.mac) key.textContent='Ctrl K';
  if(inp){ var bar=inp.closest('.search-bar'); var sync=function(){ if(bar) bar.classList.toggle('has-text',!!inp.value); }; inp.addEventListener('input',sync); inp.addEventListener('change',sync); sync(); }
  /* the sheet */
  function groups(){
    if(app()==='rounds'&&typeof window.rdShortcutGroups==='function') return window.rdShortcutGroups();   /* n312 */
    return [
      {title:'Views', items:views().map(function(v,i){ return {keys:['alt',String(i+1)], label:v[1]}; })},
      {title:'Patients', items:[{keys:['mod','K'],label:'Search patients, rooms and commands'},{keys:['mod','Z'],label:'Undo the last move'},{keys:['shift','mod','Z'],label:'Redo'}]},
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
}catch(__e){window.__n305Skip&&__n305Skip(__e,21881)}

/* script */

/* PVX-N209 - alerts: a second action (opts.alt), a description for VoiceOver, Cancel is always Cancel */
try{(function(){
  var box=document.getElementById('confirmBox'), ok=document.getElementById('confirmOk'), cancel=document.getElementById('confirmCancel'), sub=document.getElementById('confirmSub');
  if(!box||!ok||typeof window.showConfirm!=='function') return;
  var alt=document.createElement('button'); alt.type='button'; alt.id='confirmAlt'; alt.className='btn ghost'; alt.hidden=true;
  ok.parentNode.insertBefore(alt, ok);   /* row: Cancel · second action · action; phone stack: action, second action, Cancel */
  var sc=window.showConfirm;
  window.showConfirm=function(title,okLabel,onOk,opts){
    opts=opts||{};
    var r=sc.apply(this,arguments);
    if(cancel) cancel.textContent='Cancel';
    if(opts.alt&&opts.alt.label){
      alt.hidden=false; alt.textContent=opts.alt.label; box.classList.add('has-alt');
      alt.onclick=function(){ document.getElementById('confirmScrim').classList.remove('open'); box.classList.remove('open'); try{ opts.alt.act&&opts.alt.act(); }catch(e){ console.warn('[confirm]',e); } };
    } else { alt.hidden=true; alt.onclick=null; box.classList.remove('has-alt'); }
    if(sub&&opts.sub) box.setAttribute('aria-describedby','confirmSub'); else box.removeAttribute('aria-describedby');
    if(!box.querySelector('.pvx-hwrap')) box.setAttribute('aria-labelledby','confirmTitle');
    return r;
  };
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,21937)}

/* script */

/* PVX-N211 - iPhone sheets: Flow's main sheets match Anesia's (HIG Sheets) */
try{(function(){
  var PH=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false,addListener:function(){}};
  var RM=function(){ return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches); };
  var CFG=[{m:'apModal',l:'#apCancel',r:'#apCreate',x:'#apClose',close:function(){ closeAddPatient(); }},
           {m:'shiftModal',l:'#shiftCancel',r:'#shiftSave',x:'#shiftClose',close:function(){ closeShiftSetup(); }},
           {m:'alertModal',l:'#alertCancelBtn',r:'#alertActivateBtn',x:'#alertClose',close:function(){ closeAlertModal(); }}];
  function q(c,sel){ var m=document.getElementById(c.m); return m&&m.querySelector(sel); }
  function park(btn,cls,head,before){ if(!btn||btn.closest('.addpt-head')) return;
    var mk=document.createComment('pvx-ps'); btn.parentNode.insertBefore(mk,btn); btn._pvxMark=mk;
    btn.classList.add('pvx-ps-btn',cls); if(before) head.insertBefore(btn,before); else head.appendChild(btn); }
  function unpark(btn){ if(!btn||!btn._pvxMark) return; var mk=btn._pvxMark; btn._pvxMark=null;
    btn.classList.remove('pvx-ps-btn','pvx-ps-l','pvx-ps-r'); if(mk.parentNode){ mk.parentNode.insertBefore(btn,mk); mk.remove(); } }
  function undo(c){ var m=document.getElementById(c.m); if(!m) return;
    [].slice.call(m.querySelectorAll('.addpt-head .pvx-ps-btn')).forEach(unpark);
    var x=q(c,c.x); if(x){ x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); if(x._pvxMark) unpark(x); }
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
  if(typeof renderAlertModal==='function'){ var ram=renderAlertModal; renderAlertModal=function(){ undo(CFG[2]); var r=ram.apply(this,arguments); arrange(CFG[2]); return r; }; }
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
    function zone(e){ return e.target.closest&&e.target.closest('.pvx-grab,.addpt-head'); }
    m.addEventListener('touchstart',function(e){ if(!PH.matches||!m.classList.contains('open')||!zone(e)||e.touches.length>1) return;
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
}catch(__e){window.__n305Skip&&__n305Skip(__e,21961)}
/* PVX-N211 - one sheet at a time on iPhone: the patient drawer steps aside for a sheet opened from it and comes back after */
try{(function(){
  function phone(){ return window.innerWidth<=820; }   /* wherever the drawer fills the screen */
  window.pvxSheetBack=function(){ var d=document.getElementById('drawer');
    if(!phone()||!d||!d.classList.contains('open')||typeof activePatient==='undefined'||!activePatient) return null;
    var b=d.querySelector('.drawer-body'), back={pid:activePatient, top:b?b.scrollTop:0}; closeDrawer(); return back; };
  window.pvxSheetReturn=function(back){ if(!back||!PATIENTS.some(function(x){ return x.id===back.pid; })) return;
    var d=document.getElementById('drawer'); if(d&&d.classList.contains('open')) return;
    openDrawer(back.pid); var put=function(){ var b=document.querySelector('#drawer .drawer-body'); if(b) b.scrollTop=back.top; };
    put(); requestAnimationFrame(function(){ put(); setTimeout(put,60); }); };
  if(typeof openCareTeam==='function'&&typeof closeCareTeam==='function'){
    var oct=openCareTeam, cct=closeCareTeam, ctBack=null;
    openCareTeam=function(pid){ var b=pvxSheetBack(); var r=oct.apply(this,arguments); if(b) ctBack=b; return r; };
    closeCareTeam=function(){ var b=ctBack; ctBack=null; var r=cct.apply(this,arguments); if(b) setTimeout(function(){ pvxSheetReturn(b); },0); return r; };
  }
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22022)}

/* script */

/* PVX-N212 - search fields (HIG Search fields) */
try{(function(){
  var inp=document.getElementById('globalSearch'), box=document.getElementById('searchResults'); if(!inp||!box) return;
  var CW=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false};
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  /* 1. the placeholder fits the width */
  function ph(){ inp.placeholder=CW.matches?'Search patients':'Search patients, doctors, rooms'; }
  ph(); if(CW.addEventListener) CW.addEventListener('change',ph);
  /* 2. Clear */
  var X='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".32"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  function clearer(field){ var bar=field&&field.closest('.search-bar'); if(!bar||bar.querySelector('.pvx-sclear')) return;
    var b=document.createElement('button'); b.type='button'; b.className='pvx-sclear'; b.setAttribute('aria-label','Clear search'); b.title='Clear'; b.innerHTML=X;
    field.parentNode.insertBefore(b,field.nextSibling);   /* right after the text, before the mic */
    function sync(){ bar.classList.toggle('pvx-has',!!field.value); }
    ['input','keyup','change','blur','focus'].forEach(function(k){ field.addEventListener(k,sync); });
    b.addEventListener('mousedown',function(e){ e.preventDefault(); });   /* keep the field focused */
    b.addEventListener('click',function(){ field.value=''; field.dispatchEvent(new Event('input',{bubbles:true})); sync(); try{ field.focus({preventScroll:true}); }catch(e){ field.focus(); } });
    sync(); }
  clearer(inp); clearer(document.getElementById('rdSearch'));
  /* 6. best match first */
  if(typeof searchIndex==='function'){ var si=searchIndex; searchIndex=function(q){ var r=si.apply(this,arguments), ql=String(q||'').trim().toLowerCase();
    function rank(x){ var t=String(x.title||'').toLowerCase(); if(t.indexOf(ql)===0) return 0; if(t.split(/[\s.\-']+/).some(function(w){ return w.indexOf(ql)===0; })) return 1; return 2; }
    return r.map(function(x,i){ return {x:x,i:i,k:rank(x)}; }).sort(function(a,b){ return a.k-b.k||a.i-b.i; }).map(function(o){ return o.x; }); }; }
  /* 3. recent patients, in memory only (this tab), never stored */
  var RECENT=[];
  if(typeof openDrawer==='function'){ var od=openDrawer; openDrawer=function(pid){ var r=od.apply(this,arguments); try{ RECENT=[pid].concat(RECENT.filter(function(x){ return x!==pid; })).slice(0,5); }catch(e){} return r; }; }
  function showRecent(){ if(document.activeElement!==inp||inp.value.trim()) return;
    var ps=RECENT.map(function(id){ return PATIENTS.find(function(p){ return p.id===id; }); }).filter(Boolean);
    var html='', flat=[];
    if(ps.length){ html+='<div class="sr-group"><div class="sr-label">Recent</div>';
      ps.forEach(function(p,i){ var st=(typeof STATUSES!=='undefined'&&STATUSES[p.status])||{};
        flat.push({kind:'Patient',act:function(){ closeSearch(); openDrawer(p.id); }});
        html+='<div class="sr-item" data-i="'+i+'"><span class="sr-ic" style="background:'+(st.color||'var(--accent)')+'">'+esc(typeof initials==='function'?initials(p):'')+'</span><div class="sr-main"><div class="sr-t">'+esc((p.name||'')+' '+(p.last||''))+'</div><div class="sr-s">'+esc([p.species,p.room,p.hid].filter(Boolean).join(' · '))+'</div></div><div class="sr-kind">Patient</div></div>'; });
      html+='</div>'; }
    var ex=(ps[0]&&ps[0].name)||'Bella';
    html+='<div class="sr-hint">Or type a command, like <b>“move '+esc(ex)+' to Exam”</b></div>';
    box.innerHTML='<div class="sr-inner">'+html+'</div>'; box.classList.add('open'); try{ positionSearchResults(); }catch(e){}
    searchFlat=flat; searchHl=-1;
    box.querySelectorAll('.sr-item').forEach(function(n){ n.onclick=function(){ var r=searchFlat[+n.dataset.i]; if(r) r.act(); }; });
    deco(); }
  if(typeof renderSearch==='function'){ var rs=renderSearch; renderSearch=function(q){ if(!String(q||'').trim()&&document.activeElement===inp){ showRecent(); return; } return rs.apply(this,arguments); }; }
  inp.addEventListener('focus',function(){ if(!inp.value.trim()) setTimeout(showRecent,0); });
  /* 5. combobox semantics */
  box.setAttribute('role','listbox'); box.setAttribute('aria-label','Search results');
  var live=document.createElement('div'); live.id='srLive'; live.className='pvx-vh'; live.setAttribute('role','status'); document.body.appendChild(live);
  var said='', st=0;
  function deco(){
    var open=box.classList.contains('open'); inp.setAttribute('aria-expanded',open?'true':'false');
    [].forEach.call(box.querySelectorAll('.sr-group'),function(g,gi){ g.setAttribute('role','group'); var l=g.querySelector('.sr-label'); if(l){ l.id='srG'+gi; l.setAttribute('role','presentation'); g.setAttribute('aria-labelledby',l.id); } });
    [].forEach.call(box.querySelectorAll('.sr-inner'),function(x){ x.setAttribute('role','presentation'); });
    var items=box.querySelectorAll('.sr-item');
    [].forEach.call(items,function(n,i){ n.id='srOpt'+i; n.setAttribute('role','option'); n.setAttribute('aria-selected',n.classList.contains('hl')?'true':'false'); });
    [].forEach.call(box.querySelectorAll('.fv-cmd'),function(n,i){ n.id='srCmd'+i; n.setAttribute('role','option'); n.setAttribute('aria-selected',n.classList.contains('ready')?'true':'false'); });
    [].forEach.call(box.querySelectorAll('.sr-none,.sr-hint'),function(n){ n.setAttribute('role','presentation'); });
    var hl=box.querySelector('.sr-item.hl'); if(hl) inp.setAttribute('aria-activedescendant',hl.id); else inp.removeAttribute('aria-activedescendant');
    /* say the count once, after typing settles */
    clearTimeout(st); st=setTimeout(function(){ if(!open||!inp.value.trim()){ said=''; return; }
      var cmd=box.querySelector('.fv-cmd.ready .sr-t'), n=items.length, msg=cmd?('Command: '+cmd.textContent.replace(/\s+/g,' ').trim()+'. Press Return.'):n?(n+' result'+(n===1?'':'s')):'No results';
      if(msg!==said){ said=msg; live.textContent=''; setTimeout(function(){ live.textContent=msg; },40); } },600);
  }
  new MutationObserver(deco).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  deco();
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22042)}
/* PVX-N212 - compact width: Flow's sections as a bottom tab bar (HIG Tab bars) */
/* n305: Flow only */

/* script */

/* PVX-N213 - a context menu on every token, and "Added ..." announced once */
try{(function(){
  if(window.PvxCtx) PvxCtx.bind('#apProblemsChips .rvp-chip', function(el){
    var i=+el.getAttribute('data-i'), pr=apProblems[i]; if(!pr) return null;
    var t=formatProblem(pr), o=String(pr.originalInput||''), flat=function(x){ return _rn(x).replace(/[^a-z0-9]+/g,''); };
    var items=[{label:'Edit',act:function(){ rpEdit(i); }},{label:'Remove',act:function(){ rpRemove(i); }}];
    if(o&&flat(o)!==flat(t)) items.push({sep:1},{label:'Typed: “'+o+'”',disabled:true});
    return {items:items,label:'Problem: '+t,lift:el};
  },{holdMs:500});
  if(typeof addProblem==='function'){ var ap=addProblem; addProblem=function(){ var n=apProblems.length, r=ap.apply(this,arguments);
    if(apProblems.length>n) rpSay('Added '+apProblems.slice(n).map(formatProblem).join(', ')); return r; }; }
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22124)}

/* script */

/* PVX-COMBO n214 - shared by Flow and Client Check-In (HIG Combo boxes) */
try{(function(){
  if(window.pvxCombo) return;
  /* the best match first: name start, then a word start in the name, then nicknames; common breeds, then whole words, win ties */
  window.pvxBreedRank=function(list,q,pins,hl){ var qn=String(q||'').toLowerCase().replace(/[^a-z0-9]/g,''), ql=String(q||'').toLowerCase().trim(); if(!qn||!list||!list.length) return list;
    return list.map(function(r,i){ var low=String(r.name||'').toLowerCase(), words=low.split(/[^a-z0-9]+/).filter(Boolean), nn=low.replace(/[^a-z0-9]/g,'');
      var t=nn.indexOf(qn)===0?0:(words.some(function(w){ return w.indexOf(qn)===0; })?1:2), p=(pins||[]).indexOf(r.name);
      return {r:r,i:i,t:t,p:p<0?99:p,w:words.indexOf(qn)>=0?0:1}; })
      .sort(function(a,b){ return a.t-b.t||a.p-b.p||a.w-b.w||a.i-b.i; }).map(function(o){
        /* mark the word that matched ("Shorthair"), not the first place the letters appear ("Brit-ish") */
        if(o.t===1&&typeof hl==='function'&&ql){ var low=String(o.r.name).toLowerCase(), m=-1, re=/[^a-z0-9]/;
          for(var k=0;k<low.length;k++){ if((k===0||re.test(low[k-1]))&&low.substr(k,ql.length)===ql){ m=k; break; } }
          if(m>=0) o.r=Object.assign({},o.r,{html:hl(o.r.name,[[m,ql.length]])}); }
        return o.r; }); };
  /* a text field with a list is a combobox; its list is a listbox of options */
  window.pvxCombo=function(input,panel,o){ if(!input||!panel||input.__pvxCombo) return; input.__pvxCombo=1; o=o||{};
    if(!panel.id) panel.id=input.id+'List';
    input.setAttribute('role','combobox'); input.setAttribute('aria-controls',panel.id); input.setAttribute('aria-expanded','false');
    if(o.select) input.setAttribute('aria-haspopup','listbox'); else input.setAttribute('aria-autocomplete','list');
    panel.setAttribute('role','listbox'); if(o.label) panel.setAttribute('aria-label',o.label);
    var opt=o.opt||'.bc-opt', hl=o.hl||'hl', busy=false;
    function sync(){ if(busy) return; busy=true;
      try{ var open=panel.classList.contains('open')&&panel.getBoundingClientRect().height>4; input.setAttribute('aria-expanded',open?'true':'false');
        var cur=null; [].forEach.call(panel.querySelectorAll(opt),function(n,i){ if(!n.id) n.id=panel.id+'-o'+i; n.setAttribute('role','option'); var on=n.classList.contains(hl); n.setAttribute('aria-selected',on?'true':'false'); if(on) cur=n; });
        [].forEach.call(panel.querySelectorAll('.bc-list,.hv-list'),function(n){ n.setAttribute('role','presentation'); });
        if(cur&&open) input.setAttribute('aria-activedescendant',cur.id); else input.removeAttribute('aria-activedescendant'); }
      finally{ busy=false; } }
    new MutationObserver(sync).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); sync();
    /* Esc closes the open list first, never the sheet around it (window capture runs before the sheet's own Esc) */
    if(typeof o.close==='function') window.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||document.activeElement!==input||input.getAttribute('aria-expanded')!=='true') return;
      e.preventDefault(); e.stopPropagation(); try{ o.close(); }catch(x){} sync(); },true); };
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22140)}

/* script */

/* PVX-N214 - combo boxes (HIG Combo boxes): best match first, VoiceOver semantics, Sex as a pop-up */
try{(function(){
  /* Flow's breed search ranks the likeliest first */
  if(typeof breedFuzzyIndexed==='function'){ var bfi=breedFuzzyIndexed; breedFuzzyIndexed=function(IDX,q){ var r=bfi.apply(this,arguments), sp=(typeof breedSpecies==='function')?breedSpecies():null;
    return pvxBreedRank(r,q,(typeof BREED_PINS!=='undefined'&&sp&&BREED_PINS[sp])||[],typeof bcHighlight==='function'?bcHighlight:null); }; }
  pvxCombo(document.getElementById('apBreed'),document.getElementById('apBreedPanel'),{label:'Breeds',close:function(){ breedClose(); }});
  pvxCombo(document.getElementById('apRefHosp'),document.getElementById('apRefHospPanel'),{label:'Hospitals',opt:'.hv-opt,.bc-opt',close:function(){ rhClose(); }});
  pvxCombo(document.getElementById('apReason'),document.getElementById('rvList'),{label:'Reason suggestions',opt:'.rv-opt',hl:'active',close:function(){ if(typeof _rvCtrl!=='undefined'&&_rvCtrl) _rvCtrl.close(); }});
  /* a selected Reason token takes Esc (deselect) before the sheet does */
  if(typeof renderProblemChips==='function'){ var rpc=renderProblemChips; renderProblemChips=function(){ var r=rpc.apply(this,arguments); var i=document.getElementById('apReason'); if(i){ if(typeof _rpBackspaceArmed!=='undefined'&&_rpBackspaceArmed) i.setAttribute('data-pvx-esc',''); else i.removeAttribute('data-pvx-esc'); } return r; }; }
  /* Sex: a value from elsewhere (check-in review, an older record) that isn't one of the five stays as an extra option */
  var sx=document.getElementById('apSex');
  if(sx&&sx.tagName==='SELECT'){ var D=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
    Object.defineProperty(sx,'value',{configurable:true,get:function(){ return D.get.call(sx); },set:function(v){ v=v==null?'':String(v);
      [].forEach.call(sx.querySelectorAll('option[data-pvx-extra]'),function(x){ if(x.value!==v) x.remove(); });
      if(v&&![].some.call(sx.options,function(x){ return x.value===v; })){ var x=document.createElement('option'); x.textContent=v; x.value=v; x.setAttribute('data-pvx-extra',''); sx.appendChild(x); }
      D.set.call(sx,v); }}); }
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22175)}

/* script */

/* PVX-SEG (n215, shared) - single-choice segmented controls (HIG Segmented controls).
   pvxSeg(selector, {label, item, mode, isOn})
     mode 'radio' (default): a named radiogroup, the choice aria-checked, one Tab stop, arrows / Home / End move it
     mode 'tabs'           : the same as a tablist (the control switches a panel), aria-selected
     mode 'current'        : an app's section switcher: the open section is aria-current, nothing else changes
   The app keeps drawing the highlight with its own class (active, on, ...). The state is read from that class every time
   it changes, so what VoiceOver hears is always what is on screen. A group that is drawn again later is picked up too.
   Moving with the keyboard clicks the next segment, so the app's own handler does the work. */
try{(function(){
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
    if(!obs&&document.body){ obs=new MutationObserver(later); obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']}); }
    [].forEach.call(document.querySelectorAll(sel),function(g){ sync(g,o); }); return o; };
  window.pvxSeg.sync=scan;
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22204)}

/* script */

/* PVX-N215 - the review time as Day + Time; single-choice segmented controls are radiogroups */
try{(function(){
  function pad(n){ return String(n).padStart(2,'0'); }
  function isoDay(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function clock(m){ var h=Math.floor(m/60)%24, mm=m%60; return (h%12||12)+':'+pad(mm)+' '+(h<12?'AM':'PM'); }
  function dayLabel(s){ var p=s.split('-'), d=new Date(+p[0],+p[1]-1,+p[2]); return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
  function review(){
    var inp=document.getElementById('alertReview'); if(!inp||inp.type==='hidden') return;
    var v=inp.value||'', vd=v.slice(0,10), vm=v.length>=16?(+v.slice(11,13))*60+(+v.slice(14,16)):null;
    inp.type='hidden';
    var field=inp.closest('.alert-field'), lab=field&&field.querySelector('label');
    var now=new Date(), days=[['','No review time'],[isoDay(now),'Today']];
    for(var i=1;i<=6;i++){ var x=new Date(now); x.setDate(now.getDate()+i); days.push([isoDay(x),i===1?'Tomorrow':dayLabel(isoDay(x))]); }
    if(vd&&!days.some(function(d){ return d[0]===vd; })) days.push([vd,dayLabel(vd)]);
    var times=[]; for(var m=0;m<24*60;m+=15) times.push(m);
    if(vm!==null&&times.indexOf(vm)<0){ times.push(vm); times.sort(function(a,b){ return a-b; }); }
    var wrap=document.createElement('div'); wrap.className='pvx-review';
    wrap.innerHTML='<select class="ap-input ap-select" id="alertReviewDay">'+days.map(function(d){ return '<option value="'+d[0]+'"'+(d[0]===vd?' selected':'')+'>'+d[1]+'</option>'; }).join('')+'</select>'
      +'<select class="ap-input ap-select" id="alertReviewTime" aria-label="Review time">'+times.map(function(m){ return '<option value="'+m+'"'+(m===vm?' selected':'')+'>'+clock(m)+'</option>'; }).join('')+'</select>';
    inp.parentNode.insertBefore(wrap,inp);
    if(lab){ lab.setAttribute('for','alertReviewDay'); }
    var ds=wrap.querySelector('#alertReviewDay'), ts=wrap.querySelector('#alertReviewTime');
    function sensible(){ if(ds.value===isoDay(new Date())){ var n=new Date(), m=Math.ceil((n.getHours()*60+n.getMinutes()+60)/15)*15; return Math.min(m,23*60+45); } return 8*60; }
    function put(){ ts.disabled=!ds.value; inp.value=ds.value?ds.value+'T'+pad(Math.floor(+ts.value/60))+':'+pad(+ts.value%60):''; }
    if(vm===null) ts.value=String(sensible());
    ds.addEventListener('change',function(){ if(!ds.dataset.touched&&vm===null) ts.value=String(sensible()); put(); });
    ts.addEventListener('change',function(){ ds.dataset.touched='1'; put(); });
    put();
  }
  if(typeof renderAlertModal==='function'){ var ram=renderAlertModal; renderAlertModal=function(){ var r=ram.apply(this,arguments); try{ review(); }catch(e){} return r; }; }
  review();
  /* single-choice segmented controls */
  function fieldLabel(g){ var f=g.closest('.ap-field'), l=f&&f.querySelector('label'); return l?l.textContent.trim():'Choice'; }
  pvxSeg('.fv-or-seg',{item:'.ap-seg-btn',label:fieldLabel});
  pvxSeg('.fg-seg',{label:'Keep the flag'});
  pvxSeg('#rdShiftSeg',{label:'Rounds shift'});
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22250)}

/* pvx-n227-a11y */

/* PVX-N227 - an icon beside its label is decorative: VoiceOver reads the label, not "image". Icons that stand alone keep
   whatever name they have (their button's name). Runs on icons drawn later too. The shared top bar is left as it is. */
try{(function(){
  function fix(){
    var top=document.getElementById('pvxTopnav')||document.querySelector('nav.topnav');
    var l=document.querySelectorAll('svg:not([aria-hidden]):not([role]):not([aria-label]):not([aria-labelledby])');
    for(var i=0;i<l.length;i++){
      var s=l[i]; if(top&&top.contains(s)) continue; if(s.querySelector('title')) continue;
      var host=s.closest('button,a,[role=button],[role=tab],[role=menuitem],[role=option],label,li,td,th,summary,.chip,.seg')||s.parentElement;
      if(!host) continue;
      var name=(host.getAttribute('aria-label')||host.getAttribute('title')||host.textContent||'').trim();
      if(name||s.getBoundingClientRect().width<=32) s.setAttribute('aria-hidden','true');
    }
  }
  var q=0; function soon(){ if(q) return; q=setTimeout(function(){ q=0; fix(); },150); }
  function boot(){ fix(); new MutationObserver(soon).observe(document.body,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22291)}

/* pvx-n242-flow */

/* n242: a sheet started in Treatment Sheets joins Flow and Rounds */
try{(function(){
  var COL='sheets', busy={}, T0=Date.now(), STALE=3*60000;
  function T(){ return (typeof TENANT_ID==='string'&&TENANT_ID)||'shoreline'; }
  function ok(){ try{ if(typeof DB==='undefined'||!DB) return false; if(typeof LOBBY!=='undefined'&&LOBBY) return false;
      if(document.body&&document.body.classList.contains('tv-mode')) return false; if(typeof Backend!=='undefined'&&Backend.mode!=='staff') return false;
      return !!(typeof AUTH!=='undefined'&&AUTH&&AUTH.currentUser); }catch(e){ return false; } }
  function who(){ var u=(AUTH&&AUTH.currentUser)||{}, n=(typeof CURRENT_USER==='string'&&CURRENT_USER)||u.displayName||u.email||'Flow';
    return {name:n,uid:u.uid||null,ini:String(n).split(/[\s@.]+/).filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0,3).toUpperCase()}; }
  function norm(v){ return String(v==null?'':v).trim().toLowerCase(); }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function species(v){ var t=norm(v); return /cat|fel/.test(t)?'Feline':/dog|can|k9/.test(t)?'Canine':(t?t.charAt(0).toUpperCase()+t.slice(1):'—'); }
  function doctorId(name){ var n=norm(name).replace(/^dr\.?\s*/,''); if(!n) return 'unassigned';
    var all=(typeof rdAllDoctors==='function'?rdAllDoctors():(typeof DOCTORS!=='undefined'?DOCTORS:[]))||[];
    var hit=all.filter(function(d){ return norm(d.name)===n; }); if(hit.length===1) return hit[0].id;
    var ln=n.split(/\s+/).pop(); hit=all.filter(function(d){ return norm(d.name).split(/\s+/).pop()===ln; }); return hit.length===1?hit[0].id:'unassigned'; }
  function open(p){ return !!p&&!p._demo&&(p.status==='Hospitalized'||(p.status==='Admitted'&&!(p.rounds&&p.rounds.outcome))); }
  /* an open admission in Flow for the same pet, with no sheet of its own */
  function twin(pt){ var nm=norm(pt.name), ln=norm(pt.last), sp=species(pt.species); if(!nm) return null;
    return (PATIENTS||[]).filter(function(p){ return open(p)&&!p.tsSheetId&&!(p.tsSheet&&p.tsSheet.board)&&norm(p.name)===nm&&(!ln||norm(p.last)===ln)&&(sp==='—'||species(p.species)===sp); })[0]||null; }
  function problems(pt){ var out=[];
    try{ var l=Array.isArray(pt.problem_list)?pt.problem_list.filter(function(q){ return q&&q.text&&!q.resolved_at; }).map(function(q){ return q.text; }):[];
      if(!l.length&&pt.reason) l=(typeof splitComplaints==='function')?splitComplaints(pt.reason):[pt.reason];
      out=l.map(function(x){ try{ return (typeof parseProblem==='function')?parseProblem(x):{label:x}; }catch(e){ return {label:x}; } }); }catch(e){}
    return out; }
  function fieldsFor(id,x,vid,w){ var pt=x.patient||{}, arr=new Date(x.admitted_at||x.created_at||Date.now()); if(isNaN(arr)) arr=new Date();
    var wt=(typeof pt.weight==='number'&&pt.weight>0)?pt.weight:(parseFloat(pt.weight)||null), code=String(pt.code||'').toUpperCase(), cond=norm(pt.condition);
    var loc=/^icu/i.test(pt.location||'')?'ICU':/^ward/i.test(pt.location||'')?'Wards':/^iso/i.test(pt.location||'')?'Isolation':'Treatment';
    var pr=problems(pt), reason=pr.length&&typeof problemsToString==='function'?problemsToString(pr):(pt.reason||'Reason not specified'), now=new Date();
    var f={id:vid,name:pt.name||'Patient',last:pt.last||'',species:species(pt.species),age:'—',birthday:'',ageEstimated:true,ageDisplay:'',
      breed:pt.breed||'—',owner:pt.last||'—',ownerPhone:'',sex:pt.sex||'',weight:wt?(wt+' kg'):'',weightKg:wt,
      reason:reason,reasonProblems:pr,reasonId:pr.length?(pr[0].id||null):null,reasonCategory:pr.length?(pr[0].category||null):null,
      doctor:doctorId(pt.doctor),liaison:null,room:loc,status:'Hospitalized',prio:cond==='critical'?1:(cond==='watch'?2:3),arrival:arr,arrivalType:'hospitalized',
      referringHospital:'',referringHospitalInfo:null,transferNotes:'',tsSheetId:id,tsSheet:{board:'IP',at:now.toISOString()},
      timeline:[{label:'Checked in',at:arr,meta:'Direct admit · sheet started in Treatment Sheets'+(x.created_by?' by '+x.created_by:'')},{label:'Admitted to Treatment',at:arr,meta:'Hospitalized'}]};
    if(code==='DNR'||code==='ALS'||code==='BLS'||code==='CPR'){ f.resusPref=code==='DNR'?'DNR':'CPR'; f.resusStatus='confirmed'; f.resusSource='Treatment Sheets'; f.resusRecordedAt=now; }
    return f; }
  function save(){ try{ if(typeof persist==='function') persist(); }catch(e){} try{ renderAll(); }catch(e){} }
  function attach(id,x,vid,w,how){ var ref=DB.collection(COL).doc(id), p=(PATIENTS||[]).find(function(q){ return String(q.id)===String(vid); });
    if(how==='twin'&&p){ p.tsSheetId=id; p.tsSheet={board:'IP',at:new Date().toISOString()}; p.timeline=p.timeline||[]; p.timeline.push({label:'Treatment sheet linked',at:new Date(),meta:'Started in Treatment Sheets'});
      if(!p.rounds||p.rounds.outcome){ try{ rdEnroll(p); }catch(e){} } save(); }
    else if(!p){ var f=(typeof fxCleanPatient==='function')?fxCleanPatient(fieldsFor(id,x,vid,w)):fieldsFor(id,x,vid,w); p=patient(f); PATIENTS.push(p);
      try{ rdEnroll(p); var t0=new Date(x.admitted_at||x.created_at||0); if(p.rounds&&!isNaN(t0)&&t0>0&&t0<new Date()) p.rounds.admittedAt=(typeof rdIso==='function'?rdIso(t0):t0.toISOString()); }catch(e){ console.warn('[n242 rounds]',e); } save(); }   /* the stay counts from the sheet's admission, not from the link */
    if(p&&p.hid) ref.update({visit_code:p.hid}).catch(function(){}); }
  function stale(d){ var l=d&&d.flow_link; return !!(l&&l.visit&&d.visit_id===l.visit&&(Date.now()-new Date(l.at))>STALE&&!(PATIENTS||[]).some(function(q){ return String(q.id)===String(l.visit); })); }
  function claim(doc){ var id=doc.id, x=doc.data()||{}; if(busy[id]) return; if(x.status!=='active'||x.board==='OP'||x.tenant_id&&x.tenant_id!==T()) return;
    var fresh=!x.visit_id&&!x.flow_link, again=stale(x); if(!fresh&&!again) return;
    if((PATIENTS||[]).some(function(q){ return q&&String(q.tsSheetId||'')===id; })) return;
    busy[id]=1; var w=who(), now=new Date().toISOString(), FV=firebase.firestore.FieldValue, ref=DB.collection(COL).doc(id);
    var tw=fresh?twin(x.patient||{}):null, how=tw?'twin':'new';
    var vid=again?x.flow_link.visit:(tw?String(tw.id):((window.crypto&&crypto.randomUUID)?crypto.randomUUID():('pt-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6))));
    DB.runTransaction(function(t){ return t.get(ref).then(function(s){ var d=s.exists&&s.data(); if(!d||d.status!=='active'||d.board==='OP') return null;
        if(again){ if(!stale(d)) return null; t.update(ref,{'flow_link.at':now,'flow_link.by':w.name,'flow_link.uid':w.uid,updated_at:now}); return d; }
        if(d.visit_id||d.flow_link) return null;
        t.update(ref,{visit_id:vid,flow_link:{at:now,by:w.name,uid:w.uid,visit:vid,how:how},updated_at:now,updated_by:w.ini,
          audit:FV.arrayUnion({at:now,type:'doctor',desc:(how==='twin'?'Linked to Flow — the open admission for <b>'+esc((x.patient||{}).name)+'</b>':'Added to Flow and Rounds as a direct admit'),who:w.ini,uid:w.uid})});
        return d; }); })
      .then(function(d){ if(d) attach(id,d,vid,w,again?'new':how); })
      .catch(function(e){ console.warn('[n242 link]',e); })
      .then(function(){ setTimeout(function(){ delete busy[id]; },5000); }); }
  window.pvxSheetLink={claim:claim,twin:twin,fieldsFor:fieldsFor,doctorId:doctorId};
  var unsub=null, last=null;
  function listen(){ if(unsub||!ok()) return;
    unsub=DB.collection(COL).where('tenant_id','==',T()).where('status','==','active').onSnapshot(function(snap){ last=snap;
      if(Date.now()-T0<6000) return setTimeout(function(){ snap.forEach(claim); },6000-(Date.now()-T0));   /* let Flow load its visits first */
      snap.forEach(claim); },function(e){ console.warn('[n242 sheets]',e); unsub=null; }); }
  setInterval(listen,3000); setTimeout(listen,1500);
  setInterval(function(){ if(last&&ok()) last.forEach(claim); },60000);   /* a claim left unfinished by a closed screen */
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22310)}

/* pvx-n252-net */
/* PVX-N252 - every ending acts on the current patient; admissions that never reached Rounds are added (see patch_n252.py) */
try{(function(){
  if(typeof completePatient!=='function') return;
  var base=completePatient;
  window.completePatient=completePatient=function(p,finalStatus){ var a=[].slice.call(arguments); a[0]=window.fvCurPatient?fvCurPatient(p):p; return base.apply(this,a); };
  if(typeof LOBBY!=='undefined'&&LOBBY) return;
  var tried={}, failed={};
  function ms(v){ var t=v?new Date(v).getTime():NaN; return isNaN(t)?null:t; }
  function sheetIdOf(p){ try{ if(window.fvAdmitSheet&&fvAdmitSheet.id) return fvAdmitSheet.id(p); }catch(e){} return p.tsSheetId?String(p.tsSheetId):'v_'+String(p.id||'').replace(/[\/\s.#$\[\]]/g,'_'); }
  function enroll(p,why){ var q=window.fvCurPatient?fvCurPatient(p):p; if(!q||q.rounds) return;
    try{ rdEnroll(q);
      var t0=ms(q.admittedAt)||ms(q.completedAt)||ms(q.arrival);
      if(q.rounds&&t0&&t0<Date.now()) q.rounds.admittedAt=rdIso(new Date(t0));
      try{ rdAudit(q,'Added to Rounds — '+why); }catch(e){}
      console.info('[flow-n252] added',q.name,'to Rounds —',why);
      try{ renderAll(); }catch(e){}
    }catch(e){ console.warn('[flow-n252] couldn’t add',q&&q.name,'to Rounds',e);
      if(!failed[q.id]){ failed[q.id]=1; try{ notify('Couldn’t add '+bcEsc(q.name||'a patient')+' to Rounds','Open Rounds and add them from the census',{icon:'info',color:'var(--priority-p1)',dur:9000}); }catch(_){} } } }
  function sweep(){
    var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    if(!u||typeof PATIENTS==='undefined'||!PATIENTS.length||typeof DB==='undefined'||!DB||(typeof Backend!=='undefined'&&Backend.mode!=='staff')) return;
    var now=Date.now();
    PATIENTS.forEach(function(p){ if(!p||p._demo||p.rounds||p.id==null) return;
      var id=String(p.id); if(tried[id]&&now-tried[id]<300000) return;
      if(p.status==='Hospitalized'&&(typeof isActive!=='function'||isActive(p))){ tried[id]=now;
        setTimeout(function(){ enroll(p,'a direct admit that hadn’t reached Rounds'); },500+Math.random()*3000); return; }
      if(p.status==='Admitted'){ var at=ms(p.admittedAt)||ms(p.completedAt); if(!at||now-at>7*86400000) return; tried[id]=now;
        DB.collection('sheets').doc(sheetIdOf(p)).get().then(function(snap){ var d=snap&&snap.exists?snap.data():null;
          if(!d||d.status!=='active'||(d.board||'IP')!=='IP') return;
          setTimeout(function(){ enroll(p,'admitted in Flow, with an inpatient sheet'); },500+Math.random()*3000); }).catch(function(){ tried[id]=0; }); } });
  }
  window.fvRoundsSweep=sweep;
  setTimeout(sweep,6000); setInterval(sweep,30000);
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22380)}
/* pvx-n253-admit */
/* PVX-N253 - only doctors, liaisons and management admit (see patch_n253.py) */
try{(function(){
  var role=null, WHO='Doctors, liaisons and management admit';
  function lists(){ var d=[], l=[];
    try{ d=d.concat(typeof DOCTOR_NAMES!=='undefined'?DOCTOR_NAMES:[]); }catch(e){}
    try{ d=d.concat((typeof IM_DOCTORS!=='undefined'?IM_DOCTORS:[]).map(function(x){ return x.name; })); }catch(e){}
    try{ l=l.concat(typeof LIAISON_NAMES!=='undefined'?LIAISON_NAMES:[]); }catch(e){}
    return {doctors:d, liaisons:l}; }
  window.pvxCanAdmit=function(){ try{ if(typeof IS_ADMIN!=='undefined'&&IS_ADMIN) return true; }catch(e){} return !!(window.PvxRoles&&PvxRoles.canAdmit(role)); };
  window.pvxAdmitRole=function(){ return role; };
  window.pvxAdmitDenied=function(){ try{ notify(WHO,'Ask a doctor, liaison or manager to admit this patient',{icon:'info',color:'var(--accent)'}); }catch(e){} };
  function apply(){ var ok=pvxCanAdmit();
    var c=document.querySelector('#dispActions .disposition-card.admit');
    if(c){ if(ok) c.removeAttribute('disabled'); else c.setAttribute('disabled',''); c.setAttribute('aria-disabled',String(!ok)); c.classList.toggle('pvx-locked',!ok);
      var body=c.querySelector('.dc-body'), n=c.querySelector('.dc-note.pvx-lock');
      if(!ok&&body&&!n){ n=document.createElement('span'); n.className='dc-note pvx-lock'; n.textContent='Doctors, liaisons and management'; body.appendChild(n); }
      if(ok&&n) n.remove(); c.title=ok?'':WHO; }
    var b=document.querySelector('#apArrival [data-arrival="hospitalized"]');
    if(b){ b.classList.toggle('pvx-locked',!ok); if(ok){ b.removeAttribute('aria-disabled'); b.title=''; } else { b.setAttribute('aria-disabled','true'); b.title=WHO; } } }
  window.pvxAdmitApply=apply;
  function refresh(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    if(!u||!window.PvxRoles){ role=null; apply(); return; }
    var nm=''; try{ nm=(typeof CURRENT_USER==='string'&&CURRENT_USER)||u.displayName||''; }catch(e){}
    PvxRoles.resolve(u.email,nm,lists()).then(function(r){ role=r; apply(); }); }
  window.pvxAdmitRefresh=refresh;
  try{ if(AUTH&&AUTH.onAuthStateChanged) AUTH.onAuthStateChanged(function(){ setTimeout(refresh,0); }); }catch(e){}
  setTimeout(refresh,0);
  if(typeof fillDrawer==='function'){ var fd=fillDrawer; window.fillDrawer=fillDrawer=function(){ var r=fd.apply(this,arguments); try{ apply(); }catch(e){} return r; }; }
  if(typeof openAddPatient==='function'){ var oa=openAddPatient; window.openAddPatient=openAddPatient=function(){ var r=oa.apply(this,arguments); try{ apply(); }catch(e){} return r; }; }
  /* the arrival chip: a click on Direct admit is refused (it is not a real disabled button, so the others keep their keyboard order) */
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#apArrival [data-arrival="hospitalized"]');
    if(b&&!pvxCanAdmit()){ e.stopImmediatePropagation(); e.preventDefault(); pvxAdmitDenied(); } },true);
  if(typeof openDispConfirm==='function'){ var od=openDispConfirm; window.openDispConfirm=openDispConfirm=function(kind){ if(kind==='admit'&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }
    var r=od.apply(this,arguments); try{ var cf=document.getElementById('dispConfirm'); if(cf&&typeof activePatient!=='undefined') cf.setAttribute('data-pid',String(activePatient)); }catch(e){} return r; }; }
  /* a board refresh (any change on any screen) no longer closes an open Admit / Discharge confirmation or the "Admitting…" state */
  if(typeof renderDisposition==='function'){ var rdp=renderDisposition; window.renderDisposition=renderDisposition=function(p){ try{ var cf=document.getElementById('dispConfirm');
    if(p&&cf&&!isCompleted(p)&&((typeof _dispBusy!=='undefined'&&_dispBusy)||(cf.querySelector('.confirmation')&&cf.getAttribute('data-pid')===String(p.id)))){ apply(); return; } }catch(e){}
    return rdp.apply(this,arguments); }; }
  if(typeof submitDisp==='function'){ var sd=submitDisp; window.submitDisp=submitDisp=function(kind){ if(kind==='admit'&&!pvxCanAdmit()){ pvxAdmitDenied(); try{ closeDispConfirm(); }catch(e){} return; } return sd.apply(this,arguments); }; }
  if(typeof moveStatus==='function'){ var ms=moveStatus; window.moveStatus=moveStatus=function(p,st){ if(st==='Admitted'&&!pvxCanAdmit()){ pvxAdmitDenied(); try{ renderAll(); }catch(e){} return; } return ms.apply(this,arguments); }; }
})();
}catch(__e){window.__n305Skip&&__n305Skip(__e,22416)}