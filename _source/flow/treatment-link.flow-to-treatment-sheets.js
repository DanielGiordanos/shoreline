/* ═══ FLOW → TREATMENT SHEETS ═══
   One sheet per visit in the shared `sheets` collection (doc id v_<visitId>), on one of two boards:
     • Moved into the Treatment area  → OP sheet (OP Board)
     • Admitted                        → IP sheet (IP Board). An OP sheet is promoted in place, so charting carries over.
     • Discharged / euthanized in Flow → an OP sheet closes (IP sheets are discharged from Treatment Sheets).
   All writes are transactions: two screens can never create two sheets or overwrite charting. */
(function(){
  if(typeof completePatient!=='function') return;
  var COL='sheets';
  /* Mirrors Treatment Sheets' DEFAULT_ORDERS. OP sheets start with the first 8 (vitals, pain, weight); admission adds the rest. */
  var DEFAULTS=[
    ['Temperature','obs','Basic Observation','q4h','°F'],['Heart Rate','obs','Basic Observation','q4h','bpm'],['Respiratory Rate','obs','Basic Observation','q4h','rpm'],
    ['CRT','obs','Basic Observation','q4h'],['Mucous Membrane','obs','Basic Observation','q4h'],['Mentation','obs','Basic Observation','q4h'],['Pain Score','obs','Basic Observation','q4h'],
    ['Weight','obs','Basic Observation','q24h','kg',8],['Food','obs','Basic Observation','q8h'],['Water','obs','Basic Observation','q8h'],
    ['Urination','obs','Basic Observation','q8h',null,2],['Defecation','obs','Basic Observation','q8h',null,2],
    ['Check IV catheter','care','Patient Care','q4h'],['Walk','care','Patient Care','q6h',null,2],['Cage cleaned','care','Patient Care','q8h',null,4]];
  var OP_COUNT=8;   /* vitals, pain and weight */
  function defaultOrders(h,board){ var out={}; DEFAULTS.forEach(function(r,i){ if(board==='OP'&&i>=OP_COUNT) return; var id='d'+(i+1);
    out[id]={id:id,name:r[0],type:r[1],section:r[2],freq:r[3],start:r[5]!=null?r[5]:((h||0)+1)%4}; if(r[4]) out[id].unit=r[4]; }); return out; }
  function sheetId(p){ if(p&&p.tsSheetId) return String(p.tsSheetId); return 'v_'+String(p.id||p.hid||'').replace(/[\/\s.#$\[\]]/g,'_'); }
  function ready(){ return typeof DB!=='undefined'&&DB&&!(typeof LOBBY!=='undefined'&&LOBBY); }
  function doctorName(id){ try{ var L=(typeof rdAllDoctors==='function')?rdAllDoctors():(DOCTORS||[]); var d=L.find(function(x){ return x.id===id; }); return d?d.name:''; }catch(e){ return ''; } }
  /* Triage weight (measured) always wins over the weight typed at check-in. */
  function triageKg(p){ var v=p&&p.triage&&p.triage.vitals&&p.triage.vitals.weight; if(v==null||String(v).trim()==='') return null;
    try{ if(typeof parseWeightInput==='function'){ var r=parseWeightInput(v); if(r&&r.valid) return r.kg; } }catch(e){}
    var n=String(v).match(/\d+(\.\d+)?/); return n?parseFloat(n[0]):null; }
  function weightFix(p,d,into){ var tw=triageKg(p); if(tw&&(!d.patient||d.patient.weight!==tw)) into['patient.weight']=tw; return into; }
  /* charting lives in sheets/{id}/days/{YYYYMMDD}; Treatment Sheets rebuilds the board summary when digest_dirty is set */
  function dayRefOf(id,dk){ return DB.collection(COL).doc(id).collection('days').doc(dk); }
  function byDay(tm){ var g={}; Object.keys(tm).forEach(function(f){ if(f.indexOf('marks.')!==0) return; var k=f.slice(6), dk=k.slice(0,8); (g[dk]=g[dk]||{})[k]=tm[f]; }); return g; }
  function writeDays(t,id,g,nowIso){ Object.keys(g).forEach(function(dk){ t.set(dayRefOf(id,dk),{dk:dk,marks:g[dk],updated_at:nowIso},{merge:true}); }); return Object.keys(g).length; }
  function hasCharting(d){ var g=d.digest||{}, k1=Object.keys(g.done||{}).some(function(k){ return !/_triage$/.test(k); }), k2=Object.keys(d.marks||{}).some(function(k){ return !/_triage$/.test(k); }); return k1||k2||(d.notes||[]).length>0; }
  function patientFor(p){
    var wt=triageKg(p)||((typeof p.weightKg==='number'&&p.weightKg>0)?p.weightKg:(parseFloat(p.weight)||null));
    var sex=''; try{ sex=(typeof normalizeSexValue==='function'?normalizeSexValue(p.sex):'')||p.sex||''; }catch(e){ sex=p.sex||''; }
    var code=p.resusPref==='DNR'?'DNR':(p.resusPref==='CPR'?'CPR':'—');
    var cond={1:'Critical',2:'Watch'}[p.prio]||'Stable';
    var own=String(p.owner||'').trim(), oLast=(typeof fvOwnerSurname==='function')?fvOwnerSurname(own):(own.indexOf(',')>-1?own.split(',')[0].trim():(own.split(/\s+/).length>1?own.split(/\s+/).slice(1).join(' '):''));
    return {name:p.name||'Patient',last:p.last||oLast||'',owner:p.owner||'',phone:p.ownerPhone||'',species:p.species||'Dog',breed:p.breed||'',sex:sex,
      age:p.ageDisplay||p.age||'',weight:wt,reason:p.reason||'',doctor:doctorName(p.doctor),location:'',code:code,condition:cond,
      alerts:code==='DNR'?['DNR']:[],tech:(techNow(p)||{}).staffName||null,tech_at:techAt(p)||null,flags:flagsFor(p),problems:Array.isArray(p.reasonProblems)?p.reasonProblems.map(function(x){ return x.label; }).filter(Boolean):[]};
  }
  /* ---- triage → sheet: each triage reading becomes a completed entry at the triage time ---- */
  var TRI_MAP={temp:'Temperature',hr:'Heart Rate',rr:'Respiratory Rate',weight:'Weight',mentation:'Mentation',mm:'Mucous Membrane',crt:'CRT'};
  var NUMERIC={temp:1,hr:1,rr:1,weight:1};
  function dayKeyOf(d){ return d.getFullYear()+pvxPad2(d.getMonth()+1)+pvxPad2(d.getDate()); }
  function triageTime(p,t){
    var base=p.arrival?new Date(p.arrival):new Date(), m=String(t.at||'').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
    if(!m) return new Date();
    var h=+m[1]%12; if(m[3]&&/p/i.test(m[3])) h+=12; if(!m[3]&&+m[1]===12) h=12;
    var d=new Date(base); d.setHours(h,+m[2],0,0);
    if(p.arrival&&d<new Date(p.arrival)-60000) d.setDate(d.getDate()+1);   /* triage after midnight */
    if(d>new Date()) d=new Date();
    return d;
  }
  function triInitials(name,who){ var w=String(name||'').trim().split(/\s+/).filter(Boolean); return w.length?w.map(function(x){ return x[0]; }).join('').slice(0,2).toUpperCase():who.initials; }
  /* -> { 'marks.<key>': mark } for every triage value whose order is on the sheet */
  function triageMarks(p,orders,who){
    var t=p&&p.triage; if(!t) return {};
    var vals={}; [t.vitals||{},t.assess||{}].forEach(function(src){ Object.keys(src).forEach(function(k){ if(TRI_MAP[k]&&src[k]!=null&&String(src[k]).trim()!=='') vals[k]=String(src[k]).trim(); }); });
    if(!Object.keys(vals).length) return {};
    var at=triageTime(p,t), dk=dayKeyOf(at), min=at.getHours()*60+at.getMinutes(), by=triInitials(t.by,who), out={};
    Object.keys(vals).forEach(function(k){
      var oid=null; Object.keys(orders||{}).forEach(function(id){ var o=orders[id]; if(o&&!o.dc&&o.name===TRI_MAP[k]&&!oid) oid=o.id||id; });
      if(!oid) return;
      var v=vals[k]; if(NUMERIC[k]){ var n=String(v).match(/-?\d+(\.\d+)?/); if(!n) return; v=n[0]; }
      out['marks.'+dk+'_'+oid+'_triage']={status:'completed',by:by,min:min,value:v,notes:'From triage',orderId:oid,sched:min,at:at.toISOString(),src:'triage'};
    });
    return out;
  }
  function audit(desc,who,now){ return {at:now.toISOString(),type:'doctor',desc:desc,who:who.initials,uid:who.uid}; }
  function openLink(id){ return '/treatment/#sheet='+encodeURIComponent(id); }
  function announce(p,id,res,board){
    var t={created:board==='OP'?'Treatment sheet ready · OP':'Treatment sheet ready',promoted:'Sheet moved to IP Board',reopened:'Treatment sheet reopened'}[res];
    if(!t) return;
    try{ notify(t, pvxEsc(p.name||'Patient')+' · <a href="'+openLink(id)+'" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;text-decoration:none">Open sheet ›</a>',
      {icon:'info',color:'var(--s-admitted)',dur:9000}); }catch(e){}
  }
  function fail(p,e){ console.warn('[flow→sheet]',e);
    try{ notify('Couldn’t open a treatment sheet',pvxEsc(p.name||'')+' · <a href="/treatment/" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;text-decoration:none">Open Treatment Sheets ›</a>',{icon:'info',color:'var(--priority-p1)',dur:7000}); }catch(_){} }

  /* Create the sheet on `board`, or promote OP → IP. createOnly: never reopen a closed sheet (used by background sweeps). */
  function ensureSheet(p,board,opts){
    opts=opts||{};
    if(!ready()||!p) return Promise.resolve(null);
    var id=sheetId(p); if(id==='v_') return Promise.resolve(null);
    var ref=DB.collection(COL).doc(id), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue, pt=patientFor(p), nm=pvxEsc((pt.name+' '+pt.last).trim()), outB=board;
    return DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(snap.exists){
        var d=snap.data()||{}, cur=d.board||'IP'; outB=cur;
        if(d.status==='active'){
          var promote=(board==='IP'&&cur==='OP'), upd={}, have=d.orders||{}, std=defaultOrders(now.getHours(),promote?'IP':cur);
          Object.keys(std).forEach(function(k){ if(!have[k]) upd['orders.'+k]=std[k]; });   /* sheets made before a standard order existed / admission adds the rest */
          var tm=triageMarks(p,Object.assign({},std,have),who), g=byDay(tm), dks=Object.keys(g), inbox=d.marks||{};
          return Promise.all(dks.map(function(dk){ return t.get(dayRefOf(id,dk)); })).then(function(snaps){
            snaps.forEach(function(ds,i){ var have3=(ds.exists&&ds.data().marks)||{}, dk=dks[i];
              Object.keys(g[dk]).forEach(function(k){ if(have3[k]||inbox[k]) delete g[dk][k]; }); if(!Object.keys(g[dk]).length) delete g[dk]; });
            weightFix(p,d,upd);
            if(promote){ upd.board='IP'; upd.ip_at=now.toISOString(); upd.updated_by=who.initials; upd.audit=FV.arrayUnion(audit('Admitted from Flow — moved to IP Board',who,now)); }
            if(writeDays(t,id,g,now.toISOString())) upd.digest_dirty=true;
            if(Object.keys(upd).length){ upd.updated_at=now.toISOString(); t.update(ref,upd); }
            if(promote) outB='IP'; return promote?'promoted':'exists'; });
        }
        if(opts.createOnly||board!=='IP') return 'closed';
        t.update(ref,{status:'active',board:'IP',ip_at:now.toISOString(),closed_at:FV.delete(),closed_reason:FV.delete(),updated_at:now.toISOString(),updated_by:who.initials,
          audit:FV.arrayUnion(audit('Re-admitted from Flow',who,now))});
        return 'reopened';
      }
      var doc={tenant_id:(typeof TENANT_ID==='string'&&TENANT_ID)||'shoreline',status:'active',board:board,visit_id:String(p.id||''),visit_code:p.hid||null,
        source:board==='OP'?'flow-treatment':'flow',created_at:now.toISOString(),
        admitted_at:(board==='IP'&&p.admittedAt?new Date(p.admittedAt):now).toISOString(),created_by:who.name,created_uid:who.uid,patient:pt,
        orders:defaultOrders(now.getHours(),board),notes:[],digest_dirty:true,
        audit:[audit((board==='OP'?'Moved to Treatment in Flow — <b>':'Admitted from Flow — <b>')+nm+'</b>'+(pt.doctor?' · '+pvxEsc(pt.doctor):''),who,now)],
        updated_at:now.toISOString(),updated_by:who.initials};
      if(board==='OP') doc.op_at=now.toISOString(); else doc.ip_at=now.toISOString();
      writeDays(t,id,byDay(triageMarks(p,doc.orders,who)),now.toISOString());
      var re0=roundsEst(p); if(re0) doc.estimate={low:re0.low,high:re0.high,current:re0.current||0,deposit:re0.deposit,approved_by:'Client — in person',approved_at:null,initials:'',plan:'',updated_at:now.toISOString(),updated_by:who.initials,updated_by_name:who.name,source:'rounds'};
      t.set(ref,doc); return 'created';
    }); }).then(function(res){ if(!opts.quiet) announce(p,id,res,board);
      /* n91: a new outpatient sheet puts the patient in the Treatment room (frees the exam room) */
      try{ if(res==='created'&&outB==='OP'&&p.room!=='Treatment'&&!p._demo&&(typeof isActive!=='function'||isActive(p))&&typeof moveRoom==='function') moveRoom(p,'Treatment'); }catch(e){ console.warn('[sheet → Treatment room]',e); }
      try{ if(window.fvSheetSeen&&res&&res!=='error'&&res!=='closed') fvSheetSeen(p,res,outB); }catch(e){}   /* the visit remembers its sheet (Admit on OP cards) */
      return res; })
      .catch(function(e){ if(!opts.quiet) fail(p,e); return 'error'; });
  }

  /* Discharged / euthanized from Flow: close an OP sheet. IP sheets are left alone. */
  function closeOP(p,why){
    if(!ready()||!p) return;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date();
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{};
      if(d.status!=='active'||(d.board||'IP')!=='OP') return;
      t.update(ref,{status:'closed',closed_at:now.toISOString(),closed_reason:String(why||'discharged').toLowerCase(),updated_at:now.toISOString(),updated_by:who.initials,
        audit:firebase.firestore.FieldValue.arrayUnion(audit(why+' in Flow — sheet closed',who,now))});
      return 'closed';
    }); }).then(function(r){ try{ if(r==='closed'&&window.fvSheetSeen) fvSheetSeen(p,'closed'); }catch(e){} }).catch(function(e){ console.warn('[flow→sheet close]',e); });
  }

  /* Undo of an Admit: an OP sheet that was promoted goes back to the OP Board; a sheet made by the admit closes
     (unless someone already charted on it). */
  function undoSheet(p){
    if(!ready()||!p||p.status==='Admitted') return;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return 'none'; var d=snap.data()||{};
      if(d.status!=='active'||(d.board||'IP')!=='IP') return 'skip';
      if(d.op_at){ t.update(ref,{board:'OP',ip_at:FV.delete(),updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Admission undone in Flow — back to OP Board',who,now))}); return 'demoted'; }
      if(hasCharting(d)) return 'kept';
      t.update(ref,{status:'closed',closed_at:now.toISOString(),closed_reason:'Admission undone',updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Admission undone in Flow — sheet closed',who,now))});
      return 'undone';
    }); }).then(function(r){ try{ if((r==='demoted'||r==='undone')&&window.fvSheetSeen) fvSheetSeen(p,r,r==='demoted'?'OP':null); }catch(e){} if(r==='kept'){ try{ notify('Treatment sheet kept',pvxEsc(p.name||'')+' · it already has charting',{icon:'info',color:'var(--accent)'}); }catch(e){} } })
      .catch(function(e){ console.warn('[flow→sheet undo]',e); });
  }

  /* ---- hooks ---- */
  pvxAfter('completePatient',function(p,finalStatus){
    if(p&&!p._demo){ try{
      if(finalStatus==='Admitted') ensureSheet(p,'IP').then(function(){ setTimeout(function(){ pullEstimate(p); pushEstimate(p); },400); });
      else if(finalStatus==='Discharged'||finalStatus==='Euthanized'||finalStatus==='Deceased') closeOP(p,finalStatus);
    }catch(e){ console.warn(e); } }
  },'#23');
  if(typeof moveRoom==='function'){
    pvxWrap('moveRoom',function(origMove){ return function(p,newRoom){
      var was=p&&p.room, r=origMove.apply(this,arguments);
      if(p&&!p._demo&&newRoom==='Treatment'&&was!=='Treatment'&&p.room==='Treatment'){ try{
        var active=(typeof isActive==='function')?isActive(p):!p.completed;
        if(active){ ensured[p.id]=1; ensureSheet(p,p.status==='Hospitalized'?'IP':'OP'); }
      }catch(e){ console.warn(e); } }
      return r;
    }; },'#23');
  }
  /* Triage edited after the sheet exists: refresh the triage entries on an open sheet. */
  function syncTriage(p){
    if(!ready()||!p||p._demo) return;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date();
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}; if(d.status!=='active') return;
      var tm=triageMarks(p,d.orders||{},who), upd=weightFix(p,d,{}), id=sheetId(p);
      if(writeDays(t,id,byDay(tm),now.toISOString())) upd.digest_dirty=true;
      if(!Object.keys(upd).length) return;
      upd.updated_at=now.toISOString(); upd.updated_by=who.initials; t.update(ref,upd);
    }); }).catch(function(e){ console.warn('[flow→sheet triage]',e); });
  }
  /* n250: called by saveTriageEdit itself (wrapping it missed the Save button, which holds the original) */
  window.fvAfterTriage=function(p){ if(!p||p._demo) return; setTimeout(function(){
    try{ syncTriage(p); }catch(e){ console.warn('[flow→sheet triage]',e); }
    try{ if(typeof window.fvRoundsTriage==='function') window.fvRoundsTriage(p); }catch(e){ console.warn('[triage → Rounds]',e); } },300); };
  var prevUndo=window.rdOnFlowUndo;
  window.rdOnFlowUndo=function(p){ var r; if(typeof prevUndo==='function'){ try{ r=prevUndo.apply(this,arguments); }catch(e){} } try{ undoSheet(p); }catch(e){} return r; };

  /* ---- background sweeps (cover every other path: drawer room picker, voice, new hospitalized arrivals, other screens, offline) ---- */
  var ensured={};
  function sweepTreatment(){
    try{ (PATIENTS||[]).forEach(function(p,i){
      if(!p||p._demo||ensured[p.id]||p.room!=='Treatment') return;
      if(typeof isActive==='function'&&!isActive(p)) return;
      ensured[p.id]=1;
      setTimeout(function(){ ensureSheet(p,p.status==='Hospitalized'?'IP':'OP',{createOnly:true,quiet:true})
        .then(function(r){ if(r==='created') announce(p,sheetId(p),'created',p.status==='Hospitalized'?'IP':'OP'); }); },i*150);
    }); }catch(e){ console.warn(e); }
  }
  function catchUpAdmitted(){
    try{ (PATIENTS||[]).filter(function(p){ return p&&p.status==='Admitted'&&!p._demo&&p.completedAt&&(typeof isTodayHosp!=='function'||isTodayHosp(p.completedAt)); })
      .forEach(function(p,i){ setTimeout(function(){ ensureSheet(p,'IP',{createOnly:true,quiet:true}).then(function(r){ if(r==='created'||r==='promoted') announce(p,sheetId(p),r,'IP'); }); },i*250); });
    }catch(e){ console.warn(e); }
  }
  var caught=false;
  setInterval(function(){
    var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    if(!u||typeof PATIENTS==='undefined'||!PATIENTS.length) return;
    if(!caught){ caught=true; catchUpAdmitted(); }
    sweepTreatment();
  },8000);

  /* ---- estimate sync: Rounds (low end, high end, bill) <-> treatment sheet (low, high, current charges) ----
     Rounds → sheet: any Rounds save whose numbers differ from the sheet's pushes them over.
     Sheet → Rounds: Treatment Sheets writes visits/{id}.rounds.auth directly; Flow picks it up from its normal listener. */
  function roundsEst(p){ var a=(typeof rdAuthRead==='function')?rdAuthRead(p):(p&&p.rounds&&p.rounds.auth); if(!a||a.estimate==null) return null;
    var hi=+a.estimate, lo=(a.estimateLow!=null?+a.estimateLow:Math.round(hi*.8)), cur=(a.bill!=null?+a.bill:null);
    return {low:lo,high:hi,current:cur,deposit:(a.deposited!=null?+a.deposited:null)}; }
  function sameEst(e,r){ return !!e&&+e.low===r.low&&+e.high===r.high&&(r.current==null||+e.current===r.current)&&((e.deposit==null?null:+e.deposit)===r.deposit); }
  function money0(n){ return '$'+Math.round(n).toLocaleString('en-US'); }
  var lastEstSig={};
  function pushEstimate(p,why){
    if(!ready()||!p||p._demo) return; var r=roundsEst(p); if(!r) return;
    var sig=r.low+'|'+r.high+'|'+r.current+'|'+r.deposit; if(lastEstSig[p.id]===sig) return; lastEstSig[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}; if(d.status!=='active') return;
      var e=(d.estimate&&typeof d.estimate==='object')?d.estimate:null; if(sameEst(e,r)) return;
      var est=Object.assign({approved_by:'Client — in person',approved_at:null,initials:'',plan:''},e||{},
        {low:r.low,high:r.high,current:(r.current!=null?r.current:(e&&e.current!=null?+e.current:0)),deposit:r.deposit,updated_at:now.toISOString(),updated_by:who.initials,updated_by_name:who.name,source:'rounds'});
      t.update(ref,{estimate:est,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Estimate updated in Rounds — <b>'+money0(r.low)+' – '+money0(r.high)+'</b>'+(r.current!=null?' · charges '+money0(r.current):'')+(r.deposit!=null?' · deposit '+money0(r.deposit):''),who,now))});
    }); }).catch(function(e){ lastEstSig[p.id]=null; console.warn('[rounds→sheet estimate]',e); });
  }
  /* sheet has an estimate but Rounds doesn't yet (e.g. estimate set on an OP sheet, then admitted): fill Rounds in */
  function pullEstimate(p){
    if(!ready()||!p||!p.rounds||roundsEst(p)) return;
    DB.collection(COL).doc(sheetId(p)).get().then(function(snap){
      var e=snap.exists&&snap.data().estimate; if(!e||!(+e.high>0)||roundsEst(p)) return;
      var a=rdAuth(p); a.estimate=+e.high; a.estimateLow=+e.low; if(e.current!=null) a.bill=+e.current; if(e.deposit!=null) a.deposited=+e.deposit;
      lastEstSig[p.id]=a.estimateLow+'|'+a.estimate+'|'+(a.bill!=null?a.bill:null)+'|'+(a.deposited!=null?a.deposited:null);
      try{ rdTouch(p,'Estimate from treatment sheet'); }catch(err){ try{ renderAll(); }catch(_){} }
    }).catch(function(){});
  }
  if(typeof rdTouch==='function'){
    pvxAfter('rdTouch',function(p,what){ try{ if(p) pushEstimate(p,what); }catch(e){} },'#23');
  }
  /* ---- code status: Flow's CPR / DNR (staff or client via Care Connect) → the sheet ----
     DNR always wins. CPR keeps a more specific ALS / BLS the team set on the sheet. */
  var lastCode={};
  function syncCode(p){
    if(!ready()||!p||p._demo) return; var pref=p.resusPref; if(pref!=='CPR'&&pref!=='DNR') return;
    if(lastCode[p.id]===pref) return; lastCode[p.id]=pref;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists){ delete lastCode[p.id]; return; }
      var d=snap.data()||{}; if(d.status==='discharged'||d.status==='closed') return;
      var pt=d.patient||{}, cur=pt.code||'—';
      var next=pref==='DNR'?'DNR':((cur==='ALS'||cur==='BLS')?cur:'CPR');
      var al=Array.isArray(pt.alerts)?pt.alerts.slice():[], hasD=al.indexOf('DNR')>=0;
      if(next==='DNR'&&!hasD) al.unshift('DNR'); if(next!=='DNR'&&hasD) al=al.filter(function(x){ return x!=='DNR'; });
      if(next===cur&&hasD===(next==='DNR')) return;
      var src=p.resusSource==='staff_flow'?'in Flow':'by the client';
      t.update(ref,{'patient.code':next,'patient.alerts':al,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Code status set '+src+' — <b>'+next+'</b>',who,now))});
    }); }).catch(function(e){ delete lastCode[p.id]; console.warn('[flow→sheet code]',e); });
  }
  /* ---- patient flags (staff-only) follow the patient onto the sheet, like the code status (Oct 2026) ---- */
  var FLAG_K={safe:1,hand:1,med:1,iso:1,own:1}, lastFlags={};
  function flagsFor(p){ return (Array.isArray(p&&p.flags)?p.flags:[]).filter(function(f){ return f&&f.t&&FLAG_K[f.k]; }).slice(0,30).map(function(f){ return {k:f.k,t:String(f.t).slice(0,40),scope:f.scope==='visit'?'visit':'always'}; }); }
  function syncFlags(p){
    if(!ready()||!p||p._demo) return; var L=flagsFor(p), sig=JSON.stringify(L); if(lastFlags[p.id]===sig) return; lastFlags[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists){ delete lastFlags[p.id]; return; }
      var d=snap.data()||{}; if(d.status==='discharged'||d.status==='closed') return;
      var had=JSON.stringify((d.patient&&d.patient.flags)||[]); if(had===sig) return;
      t.update(ref,{'patient.flags':L,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Flags from Flow — '+(L.length?L.map(function(f){ return '<b>'+pvxEsc(f.t)+'</b>'; }).join(', '):'none'),who,now))});
    }); }).catch(function(e){ delete lastFlags[p.id]; console.warn('[flow→sheet flags]',e); });
  }
  function sweepCodes(){ try{ (PATIENTS||[]).forEach(function(p){ if(!p) return; var on=p.room==='Treatment'||p.status==='Hospitalized'||p.status==='Admitted'||ensured[p.id]||(p.tsSheet&&p.tsSheet.board);
      if(on){ syncCode(p); syncFlags(p); } }); }catch(e){} }
  setInterval(function(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} if(u&&typeof PATIENTS!=='undefined') sweepCodes(); },8000);
  if(typeof setResusPref==='function'){
    pvxAfter('setResusPref',function(p,pref){ try{ if(p){ delete lastCode[p.id]; syncCode(p); } }catch(e){} },'#23');
  }
  /* ---- Technician: replaces the Care Team card in the drawer; the tech follows the patient onto the treatment sheet (and My Board) ---- */
  var TECH_COLOR='#38BDD2';
  function techSlug(n){ return 'tech:'+String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function techItem(n){ return {id:techSlug(n),name:n,initials:String(n).split(/\s+/).map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase(),color:TECH_COLOR}; }
  var NO_TECH={id:'none',name:'No technician',initials:'',color:'#7A9BB5'};
  function techNow(p){ var a=(typeof ctCurrent==='function')?ctCurrent(p,'technician'):[]; return a.length?a[a.length-1]:null; }
  function techAt(p){ var L=(typeof ctList==='function')?ctList(p).filter(function(a){ return a.role==='technician'; }):[]; return L.reduce(function(m,a){ var t=String(a.updatedAt||''); return t>m?t:m; },''); }
  function setTech(p,id){
    var cur=techNow(p); if(id==='none'?!cur:(cur&&cur.staffId===id)) return;
    ctCurrent(p,'technician').slice().forEach(function(a){ ctEndAssignment(p,a,id==='none'?'unassigned':'replaced'); });
    if(id==='none'){ p.timeline.push({label:'Technician unassigned',at:new Date(),meta:CURRENT_USER}); notify('Technician removed',pvxEsc(p.name||''),{icon:'doctor',color:'var(--accent)'}); renderAll(); if(activePatient===p.id) fillDrawer(p); }
    else { var it=(window.FV_TECHS||[]).map(techItem).find(function(x){ return x.id===id; })||(cur&&cur.staffId===id?techItem(cur.staffName):null); if(!it) return;
      ctAssign(p,'technician',{id:it.id,name:it.name,kind:'manual'}); }
    delete lastTech[p.id]; setTimeout(function(){ syncTech(p); },300);
  }
  /* Flow → sheet: the newest change wins (a tech set on the sheet itself is newer until someone changes it here) */
  var lastTech={};
  function syncTech(p){
    if(!ready()||!p||p._demo||typeof ctList!=='function') return; var at=techAt(p); if(!at) return;
    var cur=techNow(p), name=cur?(cur.staffName||null):null, sig=(name||'')+'|'+at; if(lastTech[p.id]===sig) return; lastTech[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}, pt=d.patient||{}; if(d.status==='closed') return;
      if((pt.tech||null)===name) return; if(String(pt.tech_at||'')>at) return;
      t.update(ref,{'patient.tech':name,'patient.tech_at':at,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit(name?'Technician assigned in Flow — <b>'+pvxEsc(name)+'</b>':'Technician unassigned in Flow',who,now))});
    }); }).catch(function(e){ delete lastTech[p.id]; console.warn('[flow→sheet tech]',e); });
  }
  /* Flow → sheet: the current doctor (Flow's doctor / Rounds' Current) and Rounds' Next doctor — a handoff in either app shows in both */
  var lastDoc={};
  function syncDoctor(p){
    if(!ready()||!p||p._demo) return; var cur=(p.doctor&&p.doctor!=='unassigned')?doctorName(p.doctor):'';
    var inRounds=!!(p.rounds&&typeof p.rounds==='object'), nx=inRounds&&p.rounds.next, nxName=nx&&nx.docId?doctorName(nx.docId):'';
    var sig=cur+'|'+(inRounds?nxName:'~'); if(lastDoc[p.id]===sig) return; lastDoc[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}, pt=d.patient||{}, upd={}, msg=[]; if(d.status==='closed') return;
      if(cur&&pt.doctor!==cur){ upd['patient.doctor']=cur; upd['patient.doctor_at']=now.toISOString(); msg.push('Doctor in Flow — <b>'+pvxEsc(cur)+'</b>'); }
      if(inRounds){ var have=(pt.doctor_next&&pt.doctor_next.name)||''; if(have!==nxName&&!(nxName&&nxName===(upd['patient.doctor']||pt.doctor))){
        upd['patient.doctor_next']=nxName?{name:nxName,at:nx.at||now.toISOString(),by:nx.by||'Rounds'}:null; msg.push(nxName?'Next doctor in Rounds — <b>'+pvxEsc(nxName)+'</b>':'Next doctor cleared in Rounds'); } }
      if(!msg.length) return;
      upd.updated_at=now.toISOString(); upd.updated_by=who.initials; upd.audit=FV.arrayUnion(audit(msg.join(' · '),who,now)); t.update(ref,upd);
    }); }).catch(function(e){ delete lastDoc[p.id]; console.warn('[flow→sheet doctor]',e); });
  }
  setInterval(function(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} if(!u||typeof PATIENTS==='undefined') return;
    try{ PATIENTS.forEach(function(p){ if(p&&(p.room==='Treatment'||p.status==='Hospitalized'||p.status==='Admitted'||ensured[p.id])){ syncTech(p); syncDoctor(p); } }); }catch(e){} },8000);
  window.fvAdmitSheet={syncTech:syncTech,syncDoctor:syncDoctor,syncCode:syncCode,sweepCodes:sweepCodes,ensure:ensureSheet,create:function(p,o){ return ensureSheet(p,'IP',o); },closeOP:closeOP,id:sheetId,undo:undoSheet,pushEstimate:pushEstimate,pullEstimate:pullEstimate,sweep:sweepTreatment,triageMarks:triageMarks,syncTriage:syncTriage};
})();