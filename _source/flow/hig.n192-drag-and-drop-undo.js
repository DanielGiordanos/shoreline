/* PVX-N192 - drag and drop: Undo after a move, Escape cancels a Rounds drag, spoken refusals */
(function(){
  var live=null;
  function say(t){ if(!live){ live=document.createElement('div'); live.id='pvxDndLive'; live.className='pvx-sr'; live.setAttribute('aria-live','assertive'); document.body.appendChild(live); }
    live.textContent=''; setTimeout(function(){ live.textContent=t; },40); }
  window.pvxSay=say;
  /* PVX-N202 - one undo history shared by the Undo buttons and Cmd-Z / Shift-Cmd-Z */
  window.pvxUndo=window.pvxUndo||(function(){ var U=[],R=[],busy=0;
    function info(t){ notify(t,'',{icon:'info',color:'var(--accent)'}); say(t); }
    function push(e){ U.push(e); if(U.length>25) U.shift(); if(!busy) R.length=0; return e; }
    function undoEntry(e){ var i=U.indexOf(e); if(i<0) return false; U.splice(i,1); var ok; busy++; try{ ok=e.undo(); } finally { busy--; } if(ok!==false&&e.redo) R.push(e); if(ok!==false&&e.pid&&window.pvxTouch) setTimeout(function(){ pvxTouch(e.pid); },160); return ok!==false; }
    function undo(){ var e=U[U.length-1]; if(!e){ info('Nothing to undo'); return; } undoEntry(e); }
    function redo(){ var e=R.pop(); if(!e){ info('Nothing to redo'); return; } busy++; try{ e.redo(); } finally { busy--; } if(e.pid&&window.pvxTouch) setTimeout(function(){ pvxTouch(e.pid); },160); }
    return {push:push,undo:undo,redo:redo,undoEntry:undoEntry,remove:function(e){ var i=U.indexOf(e); if(i>-1) U.splice(i,1); },top:function(){ return U[U.length-1]||null; },size:function(){ return [U.length,R.length]; }}; })();
  function act(title,sub,fn,opts,redo,pid){
    var e=pvxUndo.push({label:title,undo:fn,redo:redo,pid:pid}), go=function(){ pvxUndo.undoEntry(e); }; go.__pvxU=1;
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
    notify('Move undone',pvxEscQ(q.name||'')+' · back in '+pvxEscQ(where||''),{icon:'move',color:'var(--accent)'});
  }
  function undoable(name,when){
    if(typeof window[name]!=='function') return;
    pvxWrap(name,function(f){ return function(p,to){
      if(depth||!p||!when(p,to)) return f.apply(this,arguments);
      var o=snap(p), real=window.notify, cap=null, r; depth++;
      window.notify=function(t,sub,op){ if(!cap){ cap=[t,sub,op]; return; } return real.apply(this,arguments); };   /* the move's own message gets the Undo */
      try{ r=f.apply(this,arguments); } finally { window.notify=real; depth--; }
      var after={status:p.status,room:p.room};
      if(after.status===o.status&&after.room===o.room){ if(cap) real.apply(null,cap); return r; }
      var args=[].slice.call(arguments,1);
      act(cap?cap[0]:'Moved',cap?cap[1]:'',function(){ return undo(p.id,o,after); },cap&&cap[2],function(){ var q=PATIENTS.find(function(x){ return x.id===p.id; }); if(q) window[name].apply(null,[q].concat(args)); },p.id);
      return r; }; },'n192');
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