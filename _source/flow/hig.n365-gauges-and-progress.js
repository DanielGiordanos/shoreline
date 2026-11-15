/* PVX-N365 - HIG Gauges and Progress indicators (see n365/patch_n365.py): waits that say what they get and when they stall;
   the Undo countdown waits while the pointer or focus is on it */
(function(){
  var MS=10000, DOCS={};
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var WORD={msgs:['msg-empty','Getting messages…','The messages haven’t arrived yet. Check the connection.'],
            docs:['fvd-empty','Getting documents…','The documents haven’t arrived yet. Check the connection.']};
  function body(kind,stalled){ var w=WORD[kind];
    return stalled ? esc(w[2])+(kind==='msgs'?' <button type="button" class="pvx-wait-retry" data-pvx-retry="msgs">Try again</button>':'')
                   : '<span class="pvx-spin" aria-hidden="true"></span>'+esc(w[1]); }
  window.pvxWaitHTML=function(kind,id){ var since=Date.now();
    if(kind==='docs'){ since=DOCS[id]||(DOCS[id]=since); }
    var stalled=Date.now()-since>MS;
    return '<div class="'+WORD[kind][0]+' pvx-wait'+(stalled?' is-stalled':'')+'" role="status" data-pvx-wait="'+kind+'" data-since="'+since+'">'+body(kind,stalled)+'</div>'; };
  function tick(){ var now=Date.now();
    document.querySelectorAll('[data-pvx-wait]:not(.is-stalled)').forEach(function(el){ var s=+el.getAttribute('data-since')||now;
      if(now-s>MS){ el.classList.add('is-stalled'); el.innerHTML=body(el.getAttribute('data-pvx-wait'),true); } }); }
  setInterval(tick,1000);
  window.pvxWaits={tick:tick, docs:DOCS, ms:function(v){ if(v!=null) MS=v; return MS; }};   /* for checks */
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-pvx-retry="msgs"]'); if(!b) return;
    var el=document.getElementById('msgThread'); if(!el) return;
    var p=null; try{ p=PATIENTS.find(function(x){ return x.id===activePatient; }); }catch(_){}
    el.innerHTML=pvxWaitHTML('msgs'); if(p&&typeof loadThread==='function') loadThread(p); });

  if(typeof showUndo==='function'){
    var start=0, left=5000, paused=false;
    function bar(t){ return t&&t.querySelector('.undo-progress'); }
    function pause(){ var t=document.getElementById('undoToast'); if(paused||!t||!t.classList.contains('open')) return;
      paused=true; try{ clearTimeout(_dispUndoTimer); }catch(_){} left=Math.max(0,left-(Date.now()-start)); var b=bar(t); if(b) b.style.animationPlayState='paused'; }
    function resume(){ var t=document.getElementById('undoToast'); if(!paused||!t) return;
      if(t.matches(':hover')||t.contains(document.activeElement)) return;
      paused=false; start=Date.now(); var b=bar(t); if(b) b.style.animationPlayState='running';
      try{ _dispUndoTimer=setTimeout(function(){ hideUndo(); }, Math.max(600,left)); }catch(_){} }
    pvxAfter('showUndo',function(){ start=Date.now(); left=5000; paused=false;
      var t=document.getElementById('undoToast');
      if(t&&!t.__pvx365){ t.__pvx365=1;
        t.addEventListener('pointerenter',pause); t.addEventListener('focusin',pause);
        t.addEventListener('pointerleave',function(){ setTimeout(resume,0); }); t.addEventListener('focusout',function(){ setTimeout(resume,0); }); }
      if(t&&(t.matches(':hover')||t.contains(document.activeElement))) pause();
      },'n365');
  }
})();