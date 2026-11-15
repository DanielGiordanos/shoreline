/* PVX-N252 - every ending acts on the current patient; admissions that never reached Rounds are added (see patch_n252.py) */
(function(){
  if(typeof completePatient!=='function') return;
  pvxWrap('completePatient',function(base){ return function(p,finalStatus){ var a=[].slice.call(arguments); a[0]=window.fvCurPatient?fvCurPatient(p):p; return base.apply(this,a); }; },'n252-net');
  if(typeof LOBBY!=='undefined'&&LOBBY) return;
  var tried={}, failed={};
  function ms(v){ var t=v?new Date(v).getTime():NaN; return isNaN(t)?null:t; }
  function sheetIdOf(p){ try{ if(window.fvAdmitSheet&&fvAdmitSheet.id) return fvAdmitSheet.id(p); }catch(e){} return p.tsSheetId?String(p.tsSheetId):'v_'+String(p.id||'').replace(/[\/\s.#$\[\]]/g,'_'); }
  function enroll(p,why){ var q=window.fvCurPatient?fvCurPatient(p):p; if(!q||q.rounds) return;
    try{ rdEnroll(q);
      var t0=ms(q.admittedAt)||ms(q.completedAt)||ms(q.arrival);
      if(q.rounds&&t0&&t0<Date.now()) q.rounds.admittedAt=rdIso(new Date(t0));
      try{ rdAudit(q,'Added to Rounds — '+why); }catch(e){}
      console.info('[flow-n252] added',q.name,'to Rounds —',why); clearFixed();
      try{ renderAll(); }catch(e){}
    }catch(e){ console.warn('[flow-n252] couldn’t add',q&&q.name,'to Rounds',e);
      if(!failed[q.id]){ failed[q.id]=1; try{ notify('Couldn’t add '+pvxEscQ(q.name||'a patient')+' to Rounds','Flow tries again in 5 minutes',{icon:'info',color:'var(--priority-p1)',dur:9000}); }catch(_){} } } }
  /* PVX-N376: a failure note goes once that patient is in Rounds (by this retry or any other way) */
  function clearFixed(){ try{ [].forEach.call(document.querySelectorAll('#notes .note.sticky .n-title'),function(t){ var m=/^Couldn’t add (.+) to Rounds$/.exec(t.textContent); if(!m) return;
      if(!PATIENTS.some(function(x){ return (x.name||'a patient')===m[1]&&failed[x.id]&&!x.rounds; })) t.closest('.note').remove(); }); }catch(_){} }
  function sweep(){ clearFixed();
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