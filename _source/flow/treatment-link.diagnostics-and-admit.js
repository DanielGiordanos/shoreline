/* ═════════ FLOW — Diagnostics → treatment sheet · Admit · Rounds pre-fill · lb→kg as you type (Oct 2026) ═════════
   · A patient moved to Diagnostics gets an outpatient treatment sheet; from an exam room (Room 1–7, Comfort Room) they also move to Treatment.
   · Once a visit has an outpatient sheet, its board card shows Admit: the sheet becomes inpatient and the patient joins Rounds, filled in
     from the visit (reason, triage, intake, flags, ultrasound, and the treatments already on the sheet).
   · Weight typed in pounds shows its kg as you type, and is stored in kg. */
(function(){
  function cur(p){ return (p&&PATIENTS.find(function(x){ return x.id===p.id; }))||p; }
  function active(p){ try{ return isActive(p); }catch(e){ return p&&!p.completed; } }
  function inRoom(p){ var r=String(p&&p.room||''); return r!=='Lobby'&&r!=='Treatment'&&/room/i.test(r); }

  /* the module (Flow → Treatment Sheets) reports what each sheet is now */
  window.fvSheetSeen=function(p,res,board){ var q=cur(p); if(!q) return;
    var b=(res==='closed'||res==='undone')?null:(res==='promoted'||res==='reopened')?'IP':(res==='demoted')?'OP':(board||null);
    if(!b&&!q.tsSheet) return; if(q.tsSheet&&q.tsSheet.board===b) return;
    q.tsSheet=b?{board:b,at:new Date().toISOString()}:null; try{ scheduleRender(function(){ if(activePatient===q.id) fillDrawer(q); }); }catch(e){} };
  function hasOP(p){ return !!(p&&p.tsSheet&&p.tsSheet.board==='OP'&&active(p)&&p.status!=='Hospitalized'); }

  /* Diagnostics: make the outpatient sheet; from a room, go to Treatment (the Treatment move makes the sheet itself) */
  if(typeof moveStatus==='function'){ 
    pvxWrap('moveStatus',function(_ms){ return function(p,newStatus){ var was=p&&p.status, r=_ms.apply(this,arguments);
      try{ if(p&&newStatus==='Diagnostics'&&was!=='Diagnostics'&&p.status==='Diagnostics'&&active(p)){
        if(p.room!=='Treatment'&&typeof moveRoom==='function') moveRoom(p,'Treatment');   /* a sheet means Treatment (n91: from the Lobby too); the move makes the sheet */
        else if(!p._demo&&window.fvAdmitSheet&&fvAdmitSheet.ensure) fvAdmitSheet.ensure(p,'OP'); } }catch(e){ console.warn('[flow diagnostics]',e); }
      return r; }; },'#10'); }

  /* drawer: the Admit card says what it will do; a visit from before this change is checked once */
  var looked={};
  if(typeof fillDrawer==='function'){ 
    pvxAfter('fillDrawer',function(p){ 
      try{ var n=document.getElementById('dAdmitNote'); if(n) n.hidden=!hasOP(p);
        if(p&&!p._demo&&!p.tsSheet&&!looked[p.id]&&active(p)&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&fvAdmitSheet.id){ looked[p.id]=1;
          DB.collection('sheets').doc(fvAdmitSheet.id(p)).get().then(function(s){ var d=s.exists&&s.data(); if(d&&d.status==='active') fvSheetSeen(p,'exists',d.board||'IP'); }).catch(function(){}); } }catch(e){}
      },'#10'); }

  /* Rounds pre-fill (called by rdEnroll) */
  function triAt(p,t){ var base=p.arrival?new Date(p.arrival):new Date(), m=String(t&&t.at||'').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i); if(!m) return base;
    var h=+m[1]%12; if(m[3]&&/p/i.test(m[3])) h+=12; var d=new Date(base); d.setHours(h,+m[2],0,0); if(p.arrival&&d<new Date(p.arrival)-60000) d.setDate(d.getDate()+1); if(d>new Date()) d=new Date(); return d; }
  function num(v){ var m=String(v==null?'':v).match(/-?\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }
  window.fvRoundsPrefill=function(p,at){ var r=p.rounds; if(!r) return; var t=p.triage||{}, v=t.vitals||{}, a=t.assess||{}, k=p.intake||{}, cap=(typeof rdCap==='function')?rdCap:function(x){ return x; };
    /* working assessment: reason for visit (+ how long) */
    if(!r.assessment){ var why=[p.reason||k.complaint||'', k.duration?('× '+k.duration):''].filter(Boolean).join(' '); if(why) r.assessment=cap(why); }
    /* problems: intake complaint + triage chief complaints */
    var have={}; (r.problems||[]).forEach(function(x){ have[String(x.label).toLowerCase()]=1; });
    [].concat(String(k.complaint||'').split(/\s*,\s*/),t.chief||[]).map(function(x){ return String(x||'').trim(); }).filter(Boolean).forEach(function(x){ var l=cap(x); if(have[l.toLowerCase()]) return; have[l.toLowerCase()]=1; r.problems.push({id:rdId(),label:l,active:true,resolvedAt:null}); });
    /* triage: one event + trend points at the triage time */
    var ta=triAt(p,t), parts=[];
    [['temp','T'],['hr','HR'],['rr','RR'],['weight','']].forEach(function(x){ if(v[x[0]]) parts.push((x[1]?x[1]+' ':'')+v[x[0]]); });
    [['mentation','Mentation'],['mm','MM'],['crt','CRT']].forEach(function(x){ if(a[x[0]]) parts.push(x[1]+' '+a[x[0]]); });
    if(parts.length) r.events.push({id:rdId(),at:rdIso(ta),text:'Triage — '+parts.join(' · ')+(t.by?' ('+t.by+')':''),by:t.by||null,kind:'clinical'});
    r.series=r.series||{}; ['temp','hr','rr'].forEach(function(key){ var n=num(v[key]); if(n==null) return; (r.series[key]=r.series[key]||[]).push({at:rdIso(ta),v:n,v2:null}); });
    /* intake: owner history, meds, allergies, what was abnormal */
    var bits=[]; if(k.history) bits.push(String(k.history).trim());
    try{ (TRIAGE_Q||[]).forEach(function(q){ var ans=k.q&&k.q[q.key]; if(ans&&ans!==q.normal){ var base=q.label.replace(/\?$/,''), lab=ans==='no'?'Not '+base.toLowerCase():((typeof TRIAGE_SHORT!=='undefined'&&TRIAGE_SHORT[q.key])||base); bits.push(lab+(k.qnotes&&k.qnotes[q.key]?' ('+k.qnotes[q.key]+')':'')); } }); }catch(e){}
    if(k.medications) bits.push('Meds: '+k.medications); if(k.allergies) bits.push('Allergies: '+k.allergies); if(k.conditions) bits.push('History: '+k.conditions);
    if(bits.length) r.events.push({id:rdId(),at:rdIso(p.arrival?new Date(p.arrival):at),text:'Intake — '+bits.join(' · '),by:null,kind:'clinical'});
    /* safety / handling flags from Flow */
    var fl={}; (r.flags||[]).forEach(function(f){ fl[f.label]=1; });
    (Array.isArray(p.flags)?p.flags:[]).forEach(function(f){ if(f&&(f.k==='safe'||f.k==='hand')&&f.t&&!fl[f.t]){ fl[f.t]=1; r.flags.push({id:rdId(),label:f.t,kind:'safety'}); } });
    r.events.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
    /* treatments already on the treatment sheet arrive once the sheet is inpatient */
    if(!r.treatments.length) setTimeout(function(){ fvRoundsTreatments(p); },1800); };
  /* n250: triage saved after the patient is on Rounds: write or replace the triage line and its trend points */
  function triParts(t){ var v=t.vitals||{}, a=t.assess||{}, parts=[];
    [['temp','T'],['hr','HR'],['rr','RR'],['weight','']].forEach(function(x){ if(v[x[0]]) parts.push((x[1]?x[1]+' ':'')+v[x[0]]); });
    [['mentation','Mentation'],['mm','MM'],['crt','CRT']].forEach(function(x){ if(a[x[0]]) parts.push(x[1]+' '+a[x[0]]); });
    return parts; }
  window.fvRoundsTriage=function(p0){ var p=cur(p0)||p0, r=p&&p.rounds; if(!r||r.outcome) return false;
    var t=p.triage||{}, v=t.vitals||{}, parts=triParts(t); if(!parts.length) return false;
    var text='Triage — '+parts.join(' · ')+(t.by?' ('+t.by+')':''), at=rdIso(triAt(p,t));
    r.events=r.events||[]; r.series=r.series||{};
    var old=null; r.events.forEach(function(e){ if(!old&&e&&e.kind==='clinical'&&/^Triage — /.test(e.text||'')) old=e; });
    var oldAt=old?old.at:null, sig=function(){ return JSON.stringify([old&&[old.text,old.at,old.by],['temp','hr','rr'].map(function(k){ return r.series[k]||[]; })]); }, before=sig();
    if(old){ old.text=text; old.at=at; old.by=t.by||null; }
    else { old={id:rdId(),at:at,text:text,by:t.by||null,kind:'clinical'}; r.events.push(old); }
    ['temp','hr','rr'].forEach(function(k){ var L=(r.series[k]||[]).filter(function(pt){ return !oldAt||pt.at!==oldAt; }), n=num(v[k]);
      if(n!=null) L.push({at:at,v:n,v2:null});
      L.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
      if(L.length||r.series[k]) r.series[k]=L; });
    if(sig()===before) return false;
    r.events.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
    try{ rdTouch(p,'Triage vitals from Flow'); }catch(e){ try{ renderAll(); }catch(_){} }
    return true; };
  function rxLine(o){ var bits=[]; if(o.dose!=null&&o.dose!=='') bits.push(o.dose+(o.unit?' '+o.unit:'')); if(o.rate) bits.push(o.rate+(o.rate_u?' '+o.rate_u:' mL/hr')); if(o.route) bits.push(o.route); if(o.freq&&o.freq!=='CRI') bits.push(o.freq); return bits.join(' · '); }
  window.fvRoundsTreatments=function(p){ try{ if(typeof DB==='undefined'||!DB||!window.fvAdmitSheet) return;
    DB.collection('sheets').doc(fvAdmitSheet.id(p)).get().then(function(s){ var d=s.exists&&s.data(); if(!d) return; var q=cur(p); if(!q.rounds||q.rounds.outcome||q.rounds.treatments.length) return;
      var O=d.orders||{}, L=Object.keys(O).map(function(id){ return O[id]; }).filter(function(o){ return o&&!o.dc&&!o.draft&&(o.type==='med'||o.cont||o.type==='fluid'||o.kind)&&!/^d\d+$/.test(String(o.id||'')); });
      if(!L.length) return; L.forEach(function(o){ q.rounds.treatments.push({id:rdId(),name:o.name||'Treatment',detail:rxLine(o)}); });
      rdTouch(q,'Treatments from the treatment sheet · '+L.length); }).catch(function(e){ console.warn('[rounds treatments]',e); }); }catch(e){} };

  /* weight in pounds: its kg as you type */
  function kgHint(el){ var h=el.parentNode&&el.parentNode.querySelector('.fv-kg'); var r=(typeof parseWeightInput==='function')?parseWeightInput(el.value):null;
    var show=!!(r&&r.valid&&(r.lb||/lb|pound|#/i.test(el.value)));
    if(!show){ if(h) h.remove(); return; } if(!h){ h=document.createElement('div'); h.className='fv-kg'; h.setAttribute('aria-live','polite'); el.insertAdjacentElement('afterend',h); }
    h.textContent='= '+r.display; }
  document.addEventListener('input',function(e){ var el=e.target; if(el&&el.matches&&el.matches('#apWeight, #triEditBody [data-vk="weight"]')) kgHint(el); },true);
  document.addEventListener('blur',function(e){ var el=e.target; if(el&&el.matches&&el.matches('#apWeight, #triEditBody [data-vk="weight"]')) setTimeout(function(){ var h=el.parentNode&&el.parentNode.querySelector('.fv-kg'); if(h&&/kg\s*$/i.test(el.value)) h.remove(); },0); },true);
})();