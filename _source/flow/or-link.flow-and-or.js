/* ═════════ FLOW ⇄ OR (Oct 2026) ═════════
   A surgical case lives on the patient's treatment sheet (sheets/{id}.surgery) — the record Flow, Treatment Sheets and Pravix OR share.
     · Book surgery (drawer → Surgery): starts the outpatient sheet if there isn't one yet (as moving to Treatment does), then puts the case
       on it. Pravix OR shows it straight away, with readiness filled in from the visit and the sheet.
     · Pravix OR sends every step back to the visit (visits/{id}.or_status): the board card says "OR 2 · 2:30" → "In surgery · OR 2" →
       "Recovery", and the drawer's Surgery card follows along.
     · OR's hand-off to ICU / Ward / Treatment admits an outpatient (visits/{id}.admit_request → fvAdmitRequests); once the case is done,
       Rounds gets a Surgery line (procedure, surgeon, room, times, destination) — once per case.
   Staff-only: never shown on the family tracker or the waiting-room screen. */
(function(){
  if(typeof completePatient!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
  var OR_URL='https://shoreline.pravix.app/or/';
  var ROOMS=[{id:'or1',name:'OR 1',service:'Orthopedics / Neurology'},{id:'or2',name:'OR 2',service:'Soft Tissue / Emergency'}];
  var SURGEONS=[{id:'galano',name:'Dr. Galano'},{id:'nolte',name:'Dr. Nolte'},{id:'giannetto',name:'Dr. Giannetto'}];   /* = Pravix OR */
  var PROC={'TPLO':'Orthopedics','Fracture Repair':'Orthopedics','Arthroscopy':'Orthopedics','Hemilaminectomy':'Neurology','GDV Surgery':'Emergency',
    'Splenectomy':'Soft Tissue','Exploratory Laparotomy':'Soft Tissue','Foreign Body Removal':'Soft Tissue','Cystotomy':'Soft Tissue','Mass Removal':'Soft Tissue',
    'Thoracotomy':'Soft Tissue','Total Ear Canal Ablation':'Soft Tissue','Liver Lobectomy':'Soft Tissue','Perineal Urethrostomy':'Soft Tissue'};
  var LIVE_ST=['in_room','anesthesia_started','procedure_started','closing','procedure_finished'], REC_ST=['out_of_room','recovery'], DONE_ST=['recovery_complete','out_of_recovery','complete'];
  function isoDay(d){ return d.getFullYear()+'-'+pvxPad2(d.getMonth()+1)+'-'+pvxPad2(d.getDate()); }
  function clock(iso){ if(!iso) return ''; var d=new Date(iso); if(isNaN(d)) return ''; var h=d.getHours(), m=d.getMinutes(); return (h%12||12)+':'+pvxPad2(m)+' '+(h<12?'AM':'PM'); }
  function minClock(m){ var h=Math.floor(m/60)%24, mm=Math.round(m%60); return (h%12||12)+':'+pvxPad2(mm)+' '+(h<12?'AM':'PM'); }
  function ok(){ return !LOBBY&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&!document.body.classList.contains('client-mode')&&!document.body.classList.contains('tv-mode'); }
  function curP(p){ return (p&&typeof PATIENTS!=='undefined'&&PATIENTS.find(function(x){ return x.id===p.id; }))||p; }
  function today(s){ return !!s&&String(s.date||'')===isoDay(new Date()); }
  function open(s){ return !!s&&s.status!=='cancelled'&&DONE_ST.indexOf(s.status)<0; }
  function caseLink(id){ return OR_URL+'#case='+encodeURIComponent(id||''); }

  /* ---------- the board card ---------- */
  window.fvOrChip=function(p){ var s=p&&p.orStatus; if(!s||!open(s)||(!today(s)&&LIVE_ST.indexOf(s.status)<0&&REC_ST.indexOf(s.status)<0)) return '';
    var live=LIVE_ST.indexOf(s.status)>-1, rec=REC_ST.indexOf(s.status)>-1;
    var t=live?'In surgery · '+pvxEsc(s.room):rec?'Recovery':pvxEsc(s.room)+' · '+clock(s.sched).replace(' ',' ');
    return '<div class="fv-or-chip'+(live?' live':rec?' rec':'')+'" title="'+pvxEsc((s.proc||'Surgery')+' · '+(s.surgeon||'')+' · '+(s.label||''))+'"><i></i>'+t+'</div>'; };

  /* ---------- the drawer: Surgery ---------- */
  var SG_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4.5l5 5L9 20H4v-5z"/><path d="M12.5 6.5l5 5"/></svg>';
  function card(p){ var s=p.orStatus, booked=s&&s.case&&s.status!=='cancelled';
    var head='<div class="rec-ic">'+SG_IC+'</div><div class="rec-title">Surgery</div>';
    if(!booked||(!open(s)&&!today(s))) return '<div class="rec-card fv-or-card"><div class="rec-head">'+head+'<button class="rec-req" type="button" data-fvor="book">Book surgery…</button></div></div>';
    var st=LIVE_ST.indexOf(s.status)>-1?'live':REC_ST.indexOf(s.status)>-1?'rec':DONE_ST.indexOf(s.status)>-1?'done':'sched';
    var chip='<span class="rec-chip fv-or-st '+st+'">'+pvxEsc(st==='done'?(s.dest?'Done · '+s.dest:'Done'):s.label||'Scheduled')+'</span>';
    var when=(today(s)?'':String(s.date||'').slice(5).replace('-','/')+' ')+clock(s.sched);
    var line=[s.proc,s.room,st==='sched'?when:st==='live'?'in '+clock(s.in):st==='rec'?'out '+clock(s.out):'',s.surgeon].filter(Boolean).map(pvxEsc).join(' · ');
    return '<div class="rec-card fv-or-card"><div class="rec-head">'+head+chip+'<a class="rec-link" href="'+caseLink(s.case)+'" target="_blank" rel="noopener">Open in OR</a></div><div class="rec-summary">'+line+'</div></div>'; }
  function mount(p){ var m=document.getElementById('fvOrMount');
    if(!m){ var r=document.getElementById('recordsMount'); if(!r) return; m=document.createElement('div'); m.id='fvOrMount'; r.insertAdjacentElement('afterend',m); }
    if(!p||p._demo&&!window.FV_OR_DEMO){ m.innerHTML=''; return; } m.innerHTML=card(p); m.setAttribute('data-pid',p.id); }
  if(typeof fillDrawer==='function'){ 
    pvxAfter('fillDrawer',function(p){ try{ if(ok()||window.FV_OR_DEMO) mount(p); }catch(e){ console.warn('[flow OR card]',e); } },'#24'); }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-fvor="book"]'); if(!b) return; e.preventDefault();
    var m=document.getElementById('fvOrMount'), id=m&&m.getAttribute('data-pid'), p=id&&PATIENTS.find(function(x){ return String(x.id)===id; }); if(p) bookOpen(p); });

  /* ---------- Book surgery ---------- */
  var BK=null;
  function seg(name,opts,val){ return '<div class="ap-seg fv-or-seg" data-seg="'+name+'" style="grid-template-columns:repeat('+opts.length+',1fr)">'+opts.map(function(o){ return '<button type="button" class="ap-seg-btn'+(o[0]===val?' active':'')+'" data-v="'+pvxEsc(o[0])+'">'+pvxEsc(o[1])+'</button>'; }).join('')+'</div>'; }
  function segVal(name){ var b=document.querySelector('#fvOrModal [data-seg="'+name+'"] .active'); return b?b.getAttribute('data-v'):''; }
  function ensureModal(){ if(document.getElementById('fvOrModal')) return;
    var sc=document.createElement('div'); sc.className='addpt-scrim'; sc.id='fvOrScrim'; sc.onclick=bookClose;
    var md=document.createElement('div'); md.className='addpt-modal fv-or-modal'; md.id='fvOrModal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-labelledby','fvOrTitle');
    md.innerHTML='<div class="addpt-head"><div class="aph-title"><span class="aph-ic">'+SG_IC+'</span><div><div class="aph-t" id="fvOrTitle">Book surgery</div><div class="aph-sub" id="fvOrSub"></div></div></div>'
      +'<button class="close" type="button" aria-label="Close" data-fvor-x><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      +'<div class="addpt-body" id="fvOrBody"></div><div class="addpt-foot" id="fvOrFoot"></div>';
    document.body.appendChild(sc); document.body.appendChild(md);
    md.addEventListener('click',function(e){ var x=e.target.closest('[data-fvor-x]'); if(x){ bookClose(); return; } var b=e.target.closest('.fv-or-seg .ap-seg-btn'); if(!b) return;
      b.parentNode.querySelectorAll('.ap-seg-btn').forEach(function(y){ y.classList.toggle('active',y===b); }); if(b.parentNode.getAttribute('data-seg')==='type'&&b.getAttribute('data-v')==='emergency') pickRoomFor('GDV Surgery'); });
    md.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); bookClose(); } }); }
  function pickRoomFor(proc){ var sv=PROC[proc]||'Soft Tissue', r=/Orthopedics|Neurology/.test(sv)?'or1':'or2';
    document.querySelectorAll('#fvOrModal [data-seg="room"] .ap-seg-btn').forEach(function(y){ y.classList.toggle('active',y.getAttribute('data-v')===r); }); }
  function bookOpen(p){ ensureModal(); BK={p:p}; var d=new Date(), nowM=d.getHours()*60+d.getMinutes(), def=Math.min(21*60,Math.ceil((nowM+60)/15)*15), times=[];
    for(var m=7*60;m<=22*60;m+=15) times.push(m);
    var days=[[isoDay(d),'Today']]; for(var i=1;i<=7;i++){ var x=new Date(d); x.setDate(d.getDate()+i); days.push([isoDay(x),i===1?'Tomorrow':x.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})]); }
    document.getElementById('fvOrSub').textContent=((p.name||'')+' '+(p.last||'')).trim();
    document.getElementById('fvOrBody').innerHTML=
      '<div class="ap-sect"><h4>Procedure</h4><div class="ap-grid c2"><div class="ap-field"><label for="fvOrProc">Procedure</label><input class="ap-input" id="fvOrProc" list="fvOrProcs" placeholder="e.g. Foreign Body Removal" autocomplete="off" value="'+pvxEsc(/foreign body/i.test(p.reason||'')?'Foreign Body Removal':'')+'"><datalist id="fvOrProcs">'+Object.keys(PROC).map(function(k){ return '<option value="'+pvxEsc(k)+'">'; }).join('')+'</datalist></div>'
      +'<div class="ap-field"><label>Side</label>'+seg('lat',[['','None'],['Left','Left'],['Right','Right'],['Bilateral','Both']],'')+'</div></div></div>'
      +'<div class="ap-sect"><h4>Team &amp; room</h4><div class="ap-grid c2"><div class="ap-field"><label>Surgeon</label>'+seg('surgeon',SURGEONS.map(function(s){ return [s.id,s.name]; }),'')+'</div>'
      +'<div class="ap-field"><label>Room</label>'+seg('room',ROOMS.map(function(r){ return [r.id,r.name]; }),'or2')+'</div></div></div>'
      +'<div class="ap-sect"><h4>When</h4><div class="ap-grid c3"><div class="ap-field"><label for="fvOrDate">Day</label><select class="ap-input ap-select" id="fvOrDate">'+days.map(function(x){ return '<option value="'+x[0]+'">'+pvxEsc(x[1])+'</option>'; }).join('')+'</select></div>'
      +'<div class="ap-field"><label for="fvOrTime">Time</label><select class="ap-input ap-select" id="fvOrTime">'+times.map(function(m){ return '<option value="'+m+'"'+(m===def?' selected':'')+'>'+minClock(m)+'</option>'; }).join('')+'</select></div>'
      +'<div class="ap-field"><label for="fvOrDur">About</label><select class="ap-input ap-select" id="fvOrDur">'+[30,45,60,75,90,120,150,180,240].map(function(m){ return '<option value="'+m+'"'+(m===90?' selected':'')+'>'+(m<60?m+' min':(m%60?Math.floor(m/60)+' h '+m%60+' min':m/60+' h'))+'</option>'; }).join('')+'</select></div></div>'
      +'<div class="ap-field" style="margin-top:13px"><label>Type</label>'+seg('type',[['scheduled','Scheduled'],['addon','Add-on'],['emergency','Emergency']],'addon')+'</div></div>'
      +'<div class="ap-sect"><h4>Note <span style="text-transform:none;letter-spacing:0;font-weight:500">· optional</span></h4><input class="ap-input" id="fvOrNote" placeholder="Anything the OR team should know"></div>'
      +'<div class="fv-or-err" id="fvOrErr" role="alert"></div>';
    document.getElementById('fvOrFoot').innerHTML='<button class="btn" type="button" data-fvor-x>Cancel</button><button class="btn primary" type="button" id="fvOrGo">Book surgery</button>';
    document.getElementById('fvOrGo').onclick=bookSave;
    var pr=document.getElementById('fvOrProc'); pr.addEventListener('change',function(){ if(PROC[pr.value]) pickRoomFor(pr.value); }); if(pr.value) pickRoomFor(pr.value);
    document.getElementById('fvOrScrim').classList.add('open'); document.getElementById('fvOrModal').classList.add('open'); setTimeout(function(){ pr.focus(); },60); }
  function bookClose(){ var a=document.getElementById('fvOrScrim'), b=document.getElementById('fvOrModal'); if(a) a.classList.remove('open'); if(b) b.classList.remove('open'); BK=null; }
  function err(t){ var e=document.getElementById('fvOrErr'); if(e) e.textContent=t||''; }
  function bookSave(){ if(!BK) return; var p=curP(BK.p), proc=(document.getElementById('fvOrProc').value||'').trim(), sg=segVal('surgeon');
    if(!proc){ err('Enter the procedure.'); document.getElementById('fvOrProc').focus(); return; }
    if(!sg){ err('Choose the surgeon.'); return; }
    var lat=segVal('lat')||null, type=segVal('type')||'scheduled', room=segVal('room')||'or2', date=document.getElementById('fvOrDate').value, sched=+document.getElementById('fvOrTime').value, dur=+document.getElementById('fvOrDur').value, note=(document.getElementById('fvOrNote').value||'').trim();
    var who=pvxMe(), at=new Date(), nm=at.getHours()*60+at.getMinutes(), id='c'+at.getTime().toString(36);
    var s={id:id, procedure:proc, laterality:lat, service:PROC[proc]||'Soft Tissue', surgeonId:sg, anesthesiaId:null, techId:null, assistantIds:[], roomId:room, date:date, sched:sched, dur:dur,
      type:type, priority:type==='emergency'?'emergency':type==='addon'?'urgent':'routine', asa:null, status:'scheduled', events:[{status:'scheduled',t:date===isoDay(at)?nm:0}],
      readiness:{}, rman:{}, readinessNotes:{}, delay:null, timeout:{done:false,t:null,checks:{}}, intraop:[], implants:[], specimens:[], kura:[], drugs:[], anesthesia:null, recovery:{}, record:null, prefCardId:null,
      notes:note, src:'flow', bookedBy:who.name, bookedUid:who.uid, bookedAt:at.toISOString()};
    var go=document.getElementById('fvOrGo'); go.disabled=true; go.textContent='Booking…'; err('');
    if(window.FV_OR_DEMO){ p.orStatus=statusOf(s); bookClose(); done(p,s); return; }
    var board=(p.status==='Hospitalized'||p.status==='Admitted'||(p.tsSheet&&p.tsSheet.board==='IP'))?'IP':'OP';
    Promise.resolve(fvAdmitSheet.ensure(p,board,{quiet:true})).then(function(res){ if(res==='error'||res==='closed'||res==null) throw new Error('sheet:'+res);
      var ref=DB.collection('sheets').doc(fvAdmitSheet.id(p)), FV=firebase.firestore.FieldValue;
      return DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ var d=snap.exists&&snap.data(); if(!d) throw new Error('no sheet');
        var old=d.surgery; if(old&&open(old)&&old.id) throw new Error('booked:'+(old.procedure||''));
        var upd={surgery:s, updated_at:at.toISOString(), updated_by:who.initials,
          audit:FV.arrayUnion({at:at.toISOString(),type:'doctor',desc:'Surgery booked in Flow — <b>'+pvxEsc(proc+(lat?' — '+lat:''))+'</b> · '+pvxEsc((ROOMS.find(function(r){ return r.id===room; })||{}).name||'OR')+' · '+minClock(sched)+' · '+pvxEsc((SURGEONS.find(function(x){ return x.id===sg; })||{}).name||''),who:who.initials,uid:who.uid})};
        if(old&&old.id) upd.surgery_past=FV.arrayUnion(old);
        var al=p.intake&&p.intake.allergies; if(al&&String(al).trim()) upd['patient.allergies']=String(al).trim().slice(0,200);
        t.update(ref,upd); }); }); })
    .then(function(){ var os=statusOf(s); p.orStatus=os; DB.collection('visits').doc(String(p.id)).update({or_status:Object.assign({},os,{at:at.toISOString(),by:who.name})}).catch(function(e){ console.warn('[flow → OR status]',e); });
      bookClose(); done(p,s); })
    .catch(function(e){ console.warn('[book surgery]',e); go.disabled=false; go.textContent='Book surgery'; var m=String(e&&e.message||'');
      err(m.indexOf('booked:')===0?'There’s already a surgery booked for '+(p.name||'this patient')+' ('+m.slice(7)+'). Change it in the OR.':'Couldn’t book it — check the connection and try again.'); }); }
  function statusOf(s){ var r=ROOMS.find(function(x){ return x.id===s.roomId; })||ROOMS[1], sg=SURGEONS.find(function(x){ return x.id===s.surgeonId; });
    var d=new Date(s.date+'T00:00:00'); d.setMinutes(s.sched);
    return {case:s.id,status:'scheduled',label:'Scheduled',stage:'scheduled',room:r.name,proc:s.procedure+(s.laterality?' — '+s.laterality:''),surgeon:sg?sg.name:'',date:s.date,sched:d.toISOString(),in:null,out:null,dest:null,sent:false}; }
  function done(p,s){ try{ p.timeline=p.timeline||[]; p.timeline.push({label:'Surgery booked',at:new Date(),meta:s.procedure+' · '+(statusOf(s).room)+' · '+minClock(s.sched)}); }catch(e){}
    try{ notify('Surgery booked', pvxEsc(p.name||'Patient')+' · '+pvxEsc(s.procedure)+' · <a href="'+caseLink(s.id)+'" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;text-decoration:none">Open in OR ›</a>',{icon:'info',color:'var(--accent)',dur:8000}); }catch(e){}
    try{ if(typeof renderAll==='function') renderAll(); }catch(e){} try{ if(typeof fillDrawer==='function'&&typeof activePatient!=='undefined'&&activePatient===p.id) fillDrawer(p); else mount(p); }catch(e){} }
  window.fvBookSurgery=bookOpen;

  /* ---------- Rounds: the surgery, once per case ---------- */
  function roundsLine(p){ var s=p.orStatus, r=p.rounds; if(!s||!s.case||!r||r.outcome||!Array.isArray(r.events)||DONE_ST.indexOf(s.status)<0) return;
    var eid='or_'+s.case, added=false;   /* n118: the surgery line, then each intra-op event and the recovery, once each */
    function put(id,at,text,by){ if(r.events.some(function(e){ return e&&e.id===id; })) return; r.events.push({id:id,at:at,text:text,by:by||null,kind:'clinical'}); added=true; }
    var bits=[s.proc,s.surgeon,s.room].filter(Boolean), tm=[s.in?'in '+clock(s.in):'',s.out?'out '+clock(s.out):''].filter(Boolean).join(', ');
    put(eid,(s.out||s.at||new Date().toISOString()),'Surgery — '+bits.join(' · ')+(tm?' · '+tm:'')+(s.dest?' → '+s.dest:''),s.surgeon);
    (Array.isArray(s.notes)?s.notes:[]).slice(0,8).forEach(function(n,i){ if(n&&n.text) put(eid+'_i'+i,(n.at||s.out||s.at||new Date().toISOString()),'Intra-op — '+String(n.text),s.surgeon); });
    var c=s.rec; if(c){ var rb=[c.ext?'extubated '+clock(c.ext):'',c.temp?'T '+c.temp:'',c.pain?'pain '+c.pain:'',c.o2?'O₂ '+c.o2:'',c.incision?'incision '+String(c.incision).toLowerCase():'',
        c.meds?'meds: '+c.meds:'',c.complications&&!/^none\.?$/i.test(String(c.complications).trim())?'complications: '+c.complications:''].filter(Boolean);
      if(rb.length) put(eid+'_rec',(c.at||s.out||s.at||new Date().toISOString()),'Recovery — '+rb.join(' · '),null); }
    if(!added) return;
    r.events.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
    try{ if(typeof rdTouch==='function') rdTouch(p,'Surgery from OR'); }catch(e){} }
  setInterval(function(){ if(!ok()||typeof PATIENTS==='undefined') return; try{ PATIENTS.forEach(function(p){ if(p&&!p._demo&&p.orStatus) roundsLine(p); }); }catch(e){} },4000);
  window.fvOrRoundsLine=roundsLine;
  /* the portal nav in Treatment Sheets and OR links to Ultrasound and Rounds as Flow#app=ultrasound / #app=rounds */
  /* Flow hides its views while it opens straight into Rounds / Ultrasound (html.pvx-app-boot, set at the top of <body>), so the Flow
     board never flashes first: switch now, again once Flow's own start-up has run, then show the page */
  function bootDone(){ document.documentElement.classList.remove('pvx-app-boot'); }
  function appFromHash(keep){ var m=String(location.hash||'').match(/app=(rounds|ultrasound|flow)/); if(!m||typeof switchApp!=='function'){ if(keep!==true) bootDone(); return; }
    try{ switchApp(m[1]); if(keep!==true) history.replaceState(null,'',location.pathname+location.search); }catch(e){ console.warn('[nav]',e); }
    if(keep!==true) requestAnimationFrame(function(){ requestAnimationFrame(bootDone); }); }
  appFromHash(true);
  setTimeout(appFromHash,250); setTimeout(bootDone,2500); window.addEventListener('hashchange',appFromHash);
  /* Logout from any other Pravix page (Directory, SGVP, Scheduling…) lands on Flow at #logout: sign out here too, then Flow's sign-in */
  function logoutFromHash(){ if(!/(^#|&)logout\b/.test(String(location.hash||''))) return; try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    try{ if(typeof logout==='function') logout(); else if(typeof AUTH!=='undefined'&&AUTH) AUTH.signOut(); }catch(e){ console.warn('[logout]',e); } }
  setTimeout(logoutFromHash,600); window.addEventListener('hashchange',logoutFromHash);
})();