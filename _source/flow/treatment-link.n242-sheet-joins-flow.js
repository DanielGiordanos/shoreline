/* n242: a sheet started in Treatment Sheets joins Flow and Rounds */
(function(){
  var COL='sheets', busy={}, T0=Date.now(), STALE=3*60000;
  function T(){ return (typeof TENANT_ID==='string'&&TENANT_ID)||'shoreline'; }
  function ok(){ try{ if(typeof DB==='undefined'||!DB) return false; if(typeof LOBBY!=='undefined'&&LOBBY) return false;
      if(document.body&&document.body.classList.contains('tv-mode')) return false; if(typeof Backend!=='undefined'&&Backend.mode!=='staff') return false;
      return !!(typeof AUTH!=='undefined'&&AUTH&&AUTH.currentUser); }catch(e){ return false; } }
  function who(){ var u=(AUTH&&AUTH.currentUser)||{}, n=(typeof CURRENT_USER==='string'&&CURRENT_USER)||u.displayName||u.email||'Flow';
    return {name:n,uid:u.uid||null,ini:String(n).split(/[\s@.]+/).filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0,3).toUpperCase()}; }
  function norm(v){ return String(v==null?'':v).trim().toLowerCase(); }
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
          audit:FV.arrayUnion({at:now,type:'doctor',desc:(how==='twin'?'Linked to Flow — the open admission for <b>'+pvxEsc((x.patient||{}).name)+'</b>':'Added to Flow and Rounds as a direct admit'),who:w.ini,uid:w.uid})});
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