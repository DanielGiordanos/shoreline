/* PVX-N350 - HIG Undo and redo.
   1. Priority, doctor and liaison changes can be undone (their note's Undo button, Cmd-Z) and redone (Shift-Cmd-Z); before, only moves could.
   2. Every Undo button belongs to the one history Cmd-Z uses (a discharge or admit, taking a critical case, a cancelled form, On the way),
      so Cmd-Z right after one of them undoes it, not something older.
   3. After an undo or redo, the patient's row or card is outlined for a moment and scrolled into view, so the change can be seen. */
(function(){
  if(!window.pvxUndo) return;
  function find(id){ try{ return PATIENTS.find(function(x){ return x.id===id; }); }catch(e){ return null; } }
  /* 3. show the result */
  var TT={}, mo=null;
  function el(id){ try{ var v=document.getElementById('view-'+currentView); var x=v&&v.querySelector('[data-pid="'+id+'"]'); return x&&x.offsetParent?x:null; }catch(e){ return null; } }
  function paint(){ var now=Date.now(), left=0; Object.keys(TT).forEach(function(id){ var age=now-TT[id]; if(age>1700){ delete TT[id]; return; } left++; var x=el(id);
      if(x&&!x.classList.contains('pvx-touched')){ x.style.animationDelay=(-age)+'ms'; x.classList.add('pvx-touched'); setTimeout(function(){ x.classList.remove('pvx-touched'); x.style.animationDelay=''; },1700-age); } });
    if(!left&&mo){ mo.disconnect(); mo=null; } }
  window.pvxTouch=function(id){ var x=el(id); TT[id]=Date.now(); if(x){ x.classList.remove('pvx-touched'); }
    if(!mo){ var st=document.getElementById('stage'); if(st){ mo=new MutationObserver(function(){ paint(); }); mo.observe(st,{childList:true,subtree:true}); } }
    paint(); x=el(id); if(x){ try{ x.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }catch(e){} }
    setTimeout(paint,1750); return !!x; };
  /* 2. a note's own Undo button joins the history */
  if(typeof window.fvNotifyAct==='function'){ var na=window.fvNotifyAct;
    window.fvNotifyAct=function(title,sub,act,fn,opts){ if(act!=='Undo'||typeof fn!=='function') return na.apply(this,arguments);
      var e, go=fn;
      if(!fn.__pvxU){ e=pvxUndo.push({label:String(title).replace(/<[^>]*>/g,''),undo:fn}); go=function(){ if(!pvxUndo.undoEntry(e)) fn(); }; go.__pvxU=1; } else e=pvxUndo.top();
      var r=na.call(this,title,sub,act,go,opts); try{ var w=document.getElementById('notes'); if(e&&w) e.__note=w.lastElementChild; }catch(x){} return r; }; }
  /* nested changes (a move that assigns a doctor, taking a case) belong to the outer change */
  var nest=0;
  ['moveStatus','moveRoom','completePatient'].forEach(function(n){ if(typeof window[n]!=='function') return; pvxWrap(n,function(f){ return function(){ nest++; try{ return f.apply(this,arguments); } finally { nest--; } }; },'n350'); });
  if(typeof window.critTakeCase==='function'){ var tk=window.critTakeCase;
    window.critTakeCase=function(id){ var r; nest++; try{ r=tk.apply(this,arguments); } finally { nest--; } var p=find(id); if(!p||!p.critTakenAt) return r;
      var nm=p.name||'Patient', e=pvxUndo.push({label:'Case taken',pid:id,undo:function(){ var q=find(id); if(!q||!q.critTakenAt) return false; window.critUndoTake(); q=find(id);
          if(q&&q.critTakenAt){ notify('Can’t undo',pvxEscQ(nm)+' · taking a case can be undone for 9 seconds',{icon:'info',color:'var(--accent)'}); if(window.pvxSay) pvxSay('Can’t undo taking the case'); return false; }
          notify('Take undone',pvxEscQ(nm)+' · back to waiting for a doctor',{icon:'move',color:'var(--accent)'}); }});
      window.__pvxTakeEntry=e; return r; };
    if(typeof window.critUndoTake==='function'){ var ut=window.critUndoTake; window.critUndoTake=function(){ var e=window.__pvxTakeEntry; if(e&&pvxUndo.top()===e&&!pvxUndo.__inUndo) pvxUndo.remove(e); return ut.apply(this,arguments); }; }
  }
  /* 1. priority, doctor and liaison */
  function label(field,p){ try{ if(field==='prio') return 'P'+p.prio+' · '+PRIO_LABEL[p.prio]; if(field==='doctor') return (p.doctor&&p.doctor!=='unassigned')?doc(p.doctor).name:'no doctor'; if(field==='liaison'){ var l=p.liaison&&liaison(p.liaison); return l?l.name:'no liaison'; } }catch(e){} return ''; }
  function fieldUndo(name,field,word,extra){
    if(typeof window[name]!=='function') return;
    pvxWrap(name,function(f){ return function(p,v){
      if(nest||!p||p[field]===v) return f.apply(this,arguments);
      var before=p[field], keep={}; (extra||[]).forEach(function(k){ keep[k]=p[k]; });
      var tl=(p.timeline||[]).length, real=window.notify, cap=null, r; nest++;
      window.notify=function(t,s,o){ if(!cap){ cap=[t,s,o]; return; } return real.apply(this,arguments); };
      try{ r=f.apply(this,arguments); } finally { window.notify=real; nest--; }
      if(p[field]===before){ if(cap) real.apply(null,cap); return r; }
      var after=p[field], added=(p.timeline||[]).slice(tl).map(function(x){ return x&&(x.label+'|'+(x.at&&+new Date(x.at))); }), id=p.id, args=[].slice.call(arguments,1);
      var e=pvxUndo.push({label:cap?cap[0]:word, pid:id,
        undo:function(){ var q=find(id); if(!q||q.completed||q[field]!==after){ notify('Can’t undo',(q?pvxEscQ(q.name||'')+' · ':'')+'this has changed since',{icon:'info',color:'var(--accent)'}); if(window.pvxSay) pvxSay('Can’t undo: this has changed since'); return false; }
          q[field]=before; Object.keys(keep).forEach(function(k){ if(keep[k]===undefined) delete q[k]; else q[k]=keep[k]; });
          if(field==='doctor'){ try{ ctSyncPrimary(q); }catch(x){} }
          q.timeline=(q.timeline||[]).filter(function(x){ return added.indexOf(x&&(x.label+'|'+(x.at&&+new Date(x.at))))<0; });
          scheduleRender(function(){ try{ if(activePatient===q.id) fillDrawer(q); }catch(x){} });
          notify(word+' undone',pvxEscQ(q.name||'')+' · back to '+pvxEscQ(label(field,q)),{icon:'move',color:'var(--accent)'}); if(window.pvxSay) pvxSay(word+' undone: '+(q.name||'')+', back to '+label(field,q)); },
        redo:function(){ var q=find(id); if(q) window[name].apply(null,[q].concat(args)); }});
      var go=function(){ pvxUndo.undoEntry(e); }; go.__pvxU=1;
      if(cap&&typeof window.fvNotifyAct==='function') window.fvNotifyAct(cap[0],cap[1],'Undo',go,Object.assign({dur:8000},cap[2]||{})); else if(cap) real.apply(null,cap);
      return r; }; },'n350');
  }
  fieldUndo('setPriority','prio','Priority change');
  fieldUndo('assignDoctor','doctor','Doctor change',['msDoctorAt']);
  fieldUndo('assignLiaison','liaison','Liaison change');
  /* undo through the history marks itself, so a button press and Cmd-Z don't both run */
  var u0=pvxUndo.undo, ue0=pvxUndo.undoEntry;
  pvxUndo.undo=function(){ pvxUndo.__inUndo=1; try{ return u0.apply(this,arguments); } finally { pvxUndo.__inUndo=0; } };
  pvxUndo.undoEntry=function(){ pvxUndo.__inUndo=1; try{ return ue0.apply(this,arguments); } finally { pvxUndo.__inUndo=0; } };
  /* once a change is undone, its note no longer offers Undo */
  var push0=pvxUndo.push; pvxUndo.push=function(e){ var r=push0.apply(this,arguments); if(e&&!e.__wrapped){ e.__wrapped=1; var u=e.undo; e.undo=function(){ var ok=u.apply(this,arguments);
      if(ok!==false&&e.__note){ [].forEach.call(e.__note.querySelectorAll('button'),function(b){ if(/^\s*Undo\s*$/.test(b.textContent)) b.remove(); }); } return ok; }; } return r; };
})();