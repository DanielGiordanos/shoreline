/* ═════════ ROUNDS ⇄ TREATMENT SHEET — discharge (Oct 2026) ═════════
   The doctor plans the discharge in Rounds; whoever is with the patient discharges on the treatment sheet. One Discharge button.
     · Rounds → sheet: Discharge Readiness "Likely today" / "Possible today" and its checklist travel to the sheet
       (sheets/{id}.patient.discharge_plan). The sheet shows it in the header with the Discharge button, the IP Board row gets a chip,
       and the Rounds row says GOING HOME TODAY.
     · Sheet → everything else: when the sheet closes (charge check, then how the stay ended), the admission ends in Rounds
       (rounds.outcome → the Rounds archive), the board card goes, and the family tracker gets its ending (visit_end, from the outcome).
     · Rounds' "End admission…" sends an admitted patient with an open sheet to the sheet, so nobody discharges in two places.
   Staff-only: none of this is on the family tracker or the waiting-room screen (the tracker only sees the ending). */
(function(){
  if(typeof completePatient!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
  var TS_URL='/treatment/';
  /* how the stay ended on the sheet → the Rounds outcome (RD_OUTCOMES; 'Admitted in error' is its own ending) */
  var OUT={home:'Discharged',ama:'Discharged',transfer:'Transferred',euth:'Euthanized',died:'Deceased',error:'Admitted in error'};
  var LEGACY={discharged:'Discharged',transferred:'Transferred',deceased:'Deceased',cancelled:'Admitted in error'};
  var LIKELY={likely:'Likely today',possible:'Possible today'};
  function dk(d){ return d.getFullYear()+pvxPad2(d.getMonth()+1)+pvxPad2(d.getDate()); }
  function ok(){ return !LOBBY&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&!document.body.classList.contains('client-mode')&&!document.body.classList.contains('tv-mode'); }
  function signedIn(){ try{ return !!(AUTH&&AUTH.currentUser); }catch(e){ return false; } }
  function sid(p){ return fvAdmitSheet.id(p); }
  function inRounds(p){ return !!(p&&p.rounds&&typeof p.rounds==='object'&&!p.rounds.outcome); }
  function sheetLink(id,go){ return TS_URL+'#sheet='+encodeURIComponent(id)+(go?'&discharge=1':''); }

  /* ---------- Rounds → sheet: the plan ---------- */
  function planFor(p){ var r=p.rounds, d=r&&r.discharge; if(!d||!LIKELY[d.likely]) return null;
    var a=(r.audit||[]).slice().reverse().find(function(x){ return x&&/^Discharge · (likely|possible)/i.test(x.what||''); })||{};
    var list=(Array.isArray(d.checklist)?d.checklist:[]).filter(function(c){ return c&&c.label; }).slice(0,12).map(function(c){ return {t:String(c.label).slice(0,60),done:!!c.done}; });
    return {k:d.likely,label:LIKELY[d.likely],at:a.at||null,by:a.by||null,list:list}; }
  var lastPlan={};
  function syncPlan(p){
    if(!ok()||!p||p._demo||!inRounds(p)) return; var pl=planFor(p), sig=JSON.stringify(pl); if(lastPlan[p.id]===sig) return; lastPlan[p.id]=sig;
    var ref=DB.collection('sheets').doc(sid(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists){ delete lastPlan[p.id]; return; }
      var d=snap.data()||{}, had=(d.patient&&d.patient.discharge_plan)||null; if(d.status==='closed') return;
      if(JSON.stringify(had)===sig) return;
      var upd={'patient.discharge_plan':pl,updated_at:now.toISOString(),updated_by:who.initials};
      if((had&&had.k)!==(pl&&pl.k)) upd.audit=FV.arrayUnion({at:now.toISOString(),type:'doctor',desc:pl?'Discharge planned in Rounds — <b>'+pvxEsc(pl.label)+'</b>':'Discharge plan cleared in Rounds',who:who.initials,uid:who.uid});
      t.update(ref,upd);
    }); }).catch(function(e){ delete lastPlan[p.id]; console.warn('[rounds→sheet discharge]',e); });
  }
  setInterval(function(){ if(!signedIn()||typeof PATIENTS==='undefined') return; try{ PATIENTS.forEach(function(p){ if(p&&p.rounds) syncPlan(p); }); }catch(e){} },8000);

  /* ---------- sheet → Rounds, board, tracker: the sheet closed ---------- */
  function outcomeOf(d){ var k=d&&d.outcome&&d.outcome.k; return OUT[k]||LEGACY[String(d&&d.closed_reason||'').toLowerCase()]||null; }
  function endAdmission(p,d){
    var type=outcomeOf(d); if(!type||!inRounds(p)) return false;
    var by=d.closed_by||(d.outcome&&d.outcome.by)||'Treatment sheet', at=d.closed_at||new Date().toISOString(), lab=(d.outcome&&d.outcome.label)||type;
    p.rounds.outcome={type:type,at:at,by:by};
    p.timeline=p.timeline||[]; p.timeline.push({label:type,at:new Date(at),meta:'Treatment sheet · '+by});
    try{ if(typeof rdExpanded!=='undefined'&&rdExpanded===p.id) rdExpanded=null; }catch(e){}
    try{ rdTouch(p,'Admission ended on the treatment sheet · '+lab); }catch(e){ try{ renderAll(); }catch(_){} }
    if(p.status==='Hospitalized'&&!p.completed){ try{ completePatient(p,(type==='Euthanized'||type==='Deceased')?type:'Discharged'); }catch(e){} }   /* a direct admit leaves the board too */
    try{ if(window.fvSheetSeen) fvSheetSeen(p,'closed'); }catch(e){}
    try{ notify(type==='Discharged'?'Went home':type,pvxEsc(((p.name||'')+' '+(p.last||'')).trim())+' · '+pvxEsc(lab)+' on the treatment sheet',{icon:'info',color:'var(--s-admitted)',dur:7000}); }catch(e){}
    return true; }
  var claimed={};
  /* one screen ends it: claim the closed sheet first (rounds_ended_at), so two Flow screens never write the ending twice */
  function onClosed(id,d){ if(claimed[id]||!d||d.status!=='closed'||d.rounds_ended_at) return;
    var p=(PATIENTS||[]).find(function(x){ return x&&!x._demo&&sid(x)===id; }); if(!p||!inRounds(p)||!outcomeOf(d)) return;
    claimed[id]=1; var ref=DB.collection('sheets').doc(id), now=new Date().toISOString();
    DB.runTransaction(function(t){ return t.get(ref).then(function(s){ var x=s.exists&&s.data(); if(!x||x.status!=='closed'||x.rounds_ended_at) return null;
        t.update(ref,{rounds_ended_at:now,rounds_ended_by:pvxMe().initials}); return x; }); })
      .then(function(x){ if(x) endAdmission(p,x); else delete claimed[id]; })
      .catch(function(e){ delete claimed[id]; console.warn('[sheet→rounds discharge]',e); }); }
  /* sheets closed today or yesterday (closed_on, written by the sheet) — a handful of documents, not the whole collection */
  var unsub=null, onDay=null;
  function listen(){ if(!ok()||!signedIn()) return; var now=new Date(), y=new Date(now.getTime()-86400000), key=dk(now); if(onDay===key&&unsub) return;
    if(unsub){ try{ unsub(); }catch(e){} unsub=null; } onDay=key;
    try{ unsub=DB.collection('sheets').where('closed_on','in',[key,dk(y)]).onSnapshot(function(q){ q.forEach(function(s){ onClosed(s.id,s.data()); }); },function(e){ console.warn('[sheet→rounds listen]',e); unsub=null; onDay=null; }); }catch(e){ unsub=null; onDay=null; } }
  setInterval(listen,15000); setTimeout(listen,2500);

  /* ---------- Rounds' End admission… → the sheet, when the patient has one open ---------- */
  if(typeof rdSetOutcome==='function'){
    pvxWrap('rdSetOutcome',function(origOutcome){ return function(p,type){
      if(!ok()||!p||p._demo) return origOutcome.apply(this,arguments);
      var self=this, args=arguments, id=sid(p);
      DB.collection('sheets').doc(id).get().then(function(s){ var d=s.exists&&s.data();
        if(!d||d.status!=='active') return origOutcome.apply(self,args);
        var nm=((p.name||'')+' '+(p.last||'')).trim();
        showConfirm('Discharge '+nm+' on the treatment sheet?','Open sheet',function(){ window.open(sheetLink(id,true),'_blank','noopener'); },
          {sub:'The sheet runs the charge check; Rounds and the board update by themselves.'});   /* PVX-N198 */
      }).catch(function(){ origOutcome.apply(self,args); });
    }; },'#25');
  }

  /* ---------- the Rounds row chip (admitted patients are on Rounds, not on the Flow board) ---------- */
  window.fvDisRowChip=function(p){ var r=p&&p.rounds, d=r&&r.discharge; if(!r||r.outcome||!d||d.likely!=='likely') return '';
    var L=Array.isArray(d.checklist)?d.checklist:[], n=L.filter(function(c){ return c&&c.done; }).length;
    return '<span class="rd-chip home" title="Discharge planned · discharged on the treatment sheet">GOING HOME TODAY'+(L.length?' · '+n+'/'+L.length:'')+'</span>'; };
  window.fvDischarge={syncPlan:syncPlan,planFor:planFor,onClosed:onClosed,endAdmission:endAdmission,outcomeOf:outcomeOf,listen:listen};
})();