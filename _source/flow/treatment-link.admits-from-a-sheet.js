/* ═════════ FLOW — admits sent from an outpatient treatment sheet (Oct 2026) ═════════
   Treatment Sheets' Admit moves the sheet to the IP Board and leaves visits/{id}.admit_request. The first staff Flow screen that sees it
   claims it in a transaction (only one screen admits), admits the visit here — which adds the patient to Rounds, filled in — and clears it. */
(function(){
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search), busy={};
  function me(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} return u; }
  function clear(id){ try{ var o={}; o.admit_request=firebase.firestore.FieldValue.delete(); DB.collection('visits').doc(String(id)).update(o).catch(function(){}); }catch(e){} }
  window.fvAdmitRequests=function(){ var u=me(); if(LOBBY||!u||typeof DB==='undefined'||!DB||typeof PATIENTS==='undefined') return;
    try{ if(document.body.classList.contains('client-mode')||document.body.classList.contains('tv-mode')) return; }catch(e){}
    PATIENTS.forEach(function(p){ var q=p&&p.admitRequest; if(!q||p._demo||busy[p.id]) return;
      if(p.completed||(typeof isActive==='function'&&!isActive(p))){ busy[p.id]=1; clear(p.id); return; }   /* already admitted / discharged: nothing to do */
      busy[p.id]=1; var ref=DB.collection('visits').doc(String(p.id));
      DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ var d=snap.exists&&snap.data(), r=d&&d.admit_request;
        if(!r||r.claimed) return false; t.update(ref,{'admit_request.claimed':u.uid,'admit_request.claimed_at':new Date().toISOString()}); return true; }); })
      .then(function(mine){ if(!mine) return; var cur=PATIENTS.find(function(x){ return x.id===p.id; })||p; if(cur.completed) { clear(p.id); return; }
        completePatient(cur,'Admitted');
        try{ var ev=(cur.timeline||[]).slice().reverse().find(function(e){ return /admit/i.test(e&&e.label||''); }); if(ev) ev.meta=(ev.meta?ev.meta+' · ':'')+'from Treatment Sheets'+(q.by?' · '+q.by:''); }catch(e){}
        setTimeout(function(){ clear(p.id); },1500); })
      .catch(function(e){ console.warn('[admit from sheet]',e); delete busy[p.id]; }); }); };
  setInterval(function(){ try{ fvAdmitRequests(); }catch(e){} },3000);
})();