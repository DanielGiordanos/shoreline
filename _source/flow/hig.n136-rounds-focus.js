(function(){
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
  if(typeof openUsxCase==='function'){ pvxBefore('openUsxCase',function(){ try{ if(typeof usxEnsureDrawer==='function') usxEnsureDrawer(); if(window.pvxOverlay&&pvxOverlay.scan) pvxOverlay.scan(); }catch(err){} },'#30'); }
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