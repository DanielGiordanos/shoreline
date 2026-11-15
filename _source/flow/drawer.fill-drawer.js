/* fillDrawer · its layers, innermost first: 1 #3 wrap · 2 #9 after · 3 #10 after · 4 #19 after · 5 #24 after · 6 n253-admit after · 7 n254-yakuri after · 8 n360 wrap   (PVX-N387; kept true by flow_t387) */
function fillDrawer(p){ return pvxRun('fillDrawer',fillDrawer$base,this,arguments); }
function fillDrawer$base(p){
const _dePc=(typeof PRIO_CLR!=='undefined')?(PRIO_CLR[p.prio]||PRIO_CLR[3]):null;
const de=document.getElementById('dEmoji');de.className='pt-emoji patient-medallion patient-medallion--compact priority-p'+p.prio+' '+spCls(p);
if(_dePc){ de.style.setProperty('--gc',_dePc.c); de.style.setProperty('--gcrgb',_dePc.rgb); }
de.innerHTML=monoInner(p);
const nameEl=document.getElementById('dName');
nameEl.textContent=`${p.name} ${p.last}`.trim();
const dResus=document.getElementById('dResus'); if(dResus){ dResus.innerHTML=resusPill(p); try{ CprEcg.mount(); }catch(e){} }
nameEl.classList.add('editable-hint');
nameEl.title='Edit name';
makeEditable(nameEl, val=>{
val=val.trim(); if(!val){ nameEl.textContent=`${p.name} ${p.last}`.trim(); return; }
const words=val.split(/\s+/);
if(words.length>1){ p.last=words.pop(); p.name=words.join(' '); } else { p.name=val; p.last=''; }
renderAll(); if(activePatient===p.id) fillDrawer(p);
});
document.getElementById('dSub').textContent=[p.species,patientAgeDisplay(p),p.breed].filter(x=>x&&x!=='—').join(' · ');
document.getElementById('dTags').innerHTML='';
document.getElementById('dClin').innerHTML=clinBar(p);
const w=waitMinutes(p);
document.getElementById('dGrid').innerHTML=`
    <div class="d-cell editable-hint"><div class="k">Owner</div><div class="v" id="dOwner">${pvxEscQ(p.owner)}</div></div>
    <div class="d-cell"><div class="k">Priority</div><div id="prioMount" style="margin-top:5px"></div></div>
    <div class="d-cell"><div class="k">Arrival</div><div class="v">${fmtTime(p.arrival)}</div></div>
    <div class="d-cell"><div class="k">Time in hospital</div><div class="v">${fmtWait(w)}</div></div>
    <div class="d-cell editable-hint" style="grid-column:1/3"><div class="k">Reason for visit</div><div class="v" id="dReason" style="font-size:0.8125rem;font-weight:600;line-height:1.5;white-space:pre-line">${pvxEscQ((p.reasonProblems&&p.reasonProblems.length)? p.reasonProblems.map(formatProblem).join('\n') : (p.reason||''))}</div></div>
    ${ownerHistoryCellHtml(p)}`;
wireOwnerHistoryToggle(p);

const prMount=document.getElementById('prioMount');
prMount.appendChild(createDropdown({ label:'Priority',
items: [1,2,3].map(n=>({id:String(n), name:`P${n} · ${PRIO_LABEL[n]}`, badge:`<span class="prio prio-${n}" style="width:24px;height:24px;font-size:0.6875rem;flex:0 0 auto">${PRIO[n].l}</span>`, color:PRIO[n].c, textColor:PRIO[n].t})),
selectedId: String(p.prio), variant:'compact', placeholder:'Set priority', searchPlaceholder:'Priority…',
onSelect: id => setPriority(PATIENTS.find(x=>x.id===p.id)||p, +id)
}));

makeEditable(document.getElementById('dReason'), val=>{
val=val.trim(); if(!val){ fillDrawer(p); return; }
const probs=[]; val.split(/\n+/).forEach(function(line){ splitComplaints(line).forEach(function(seg){ if(seg.trim()) probs.push(parseProblem(seg)); }); });
p.reasonProblems = probs;
p.reason = probs.length ? problemsToString(probs) : val;
p.reasonId = probs.length ? (probs[0].id||null) : null;
p.reasonCategory = probs.length ? (probs[0].category||null) : null;
renderAll(); if(activePatient===p.id) fillDrawer(p);
});

makeEditable(document.getElementById('dOwner'), val=>{
val=val.trim(); if(!val){ document.getElementById('dOwner').textContent=p.owner; return; }
p.owner=val; renderAll(); if(activePatient===p.id) fillDrawer(p);
});

const dMount=document.getElementById('docAssignMount');
dMount.innerHTML='';
dMount.appendChild(createDropdown({
items: (p.doctor&&p.doctor!=='unassigned'?[{id:'__none', name:'No doctor', initials:'—', color:'#A9C0D4', none:true}]:[]).concat(typeof fvDoctorItems==='function'?fvDoctorItems():DOCTORS),
selectedId: p.doctor==='unassigned'? null : p.doctor,
placeholder:'Assign a doctor', searchPlaceholder:'Search doctors…',
onSelect: id => assignDoctor(PATIENTS.find(x=>x.id===p.id)||p, id==='__none'?'unassigned':id)
}));

const lMount=document.getElementById('liaAssignMount');
lMount.innerHTML='';
lMount.appendChild(createDropdown({
items: [NO_LIAISON, ...LIAISONS],
selectedId: p.liaison || null,
placeholder:'Add a liaison', searchPlaceholder:'Search liaisons…',
onSelect: id => assignLiaison(PATIENTS.find(x=>x.id===p.id)||p, id==='none'? null : id)
}));

try{ renderCareTeamCard(p); }catch(e){}

renderRecordsCard(p);

const tm=document.getElementById('triageMount');
tm.innerHTML=triageCardHtml(p);
const triCard=document.getElementById('triCard');
document.getElementById('triHead').onclick=()=>{ triExpanded=!triExpanded; triCard.classList.toggle('open',triExpanded); };
document.getElementById('triCollapse').onclick=(e)=>{ e.stopPropagation(); triExpanded=false; triCard.classList.remove('open'); };
document.getElementById('triEdit').onclick=(e)=>{ e.stopPropagation(); openTriageEdit(p); };

const im=document.getElementById('intakeCardMount');
const kk=p.intake, ist=kk?kk.status:'not_started';
const isub = (kk && ist!=='not_started') ? summarizeIntake(kk) :'Owner history • Medications • Symptoms • Notes';
im.innerHTML=`<div class="triage-card" id="intakeCard" role="button" tabindex="0" aria-label="Triage intake — ${pvxEscQ(TRIAGE_STATUS[ist]||'')}. ${pvxEscQ(String(isub).replace(/ • /g,', '))}">
    <div class="tc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="9" r="2"/></svg></div>
    <div class="tc-main"><div class="tc-title">Triage intake</div><div class="tc-sub">${pvxEscQ(isub)}</div>
      <span class="tc-status tc-${ist}">${TRIAGE_STATUS[ist]}</span></div>
    <div class="tc-chev"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
  </div>`;
document.getElementById('intakeCard').onclick=()=>openIntake(p);
document.getElementById('intakeCard').onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openIntake(p); } };   /* PVX-N352 */
try{ renderMessages(p); }catch(e){}

document.getElementById('dAdv').innerHTML=STAGE_ORDER.filter(s=>s!==p.status && s!=='Admitted'&& s!=='Discharged').map(s=>
`<button data-s="${s}">${s}</button>`).join('');
document.querySelectorAll('#dAdv button').forEach(b=>b.onclick=()=>moveStatus(p,b.dataset.s));

const _tlRaw=[...p.timeline].sort((a,b)=>a.at-b.at);
const RESUS_WIN=10*60*1000;
const _resusPref=(l)=>{ const m=/\b(CPR|DNR)\b/i.exec(l||''); return m?m[1].toUpperCase():''; };
const _isResus=(l)=>/resuscitation preference/i.test(l||'');
const _stageClass=(l)=>{ l=(l||'').toLowerCase();
if(/waiting|checked in|arriv/.test(l)) return'waiting';
if(/exam/.test(l)) return'exam';
if(/diagnostic/.test(l)) return'diagnostics';
if(/ultrasound/.test(l)) return'ultrasound';
if(/procedure/.test(l)) return'procedure';
if(/admitted/.test(l)) return'admitted';
if(/discharg|euthan/.test(l)) return'discharged';
return''; };
const _actor=(m)=>{ if(!m) return''; const parts=String(m).split('·'); return parts.length>1?parts[parts.length-1].trim():''; };
const _items=[];
_tlRaw.forEach((e)=>{
if(_isResus(e.label)){
const last=_items[_items.length-1];
if(last && last.kind==='resus'&& (e.at-last.lastAt)<=RESUS_WIN){ last.entries.push(e); last.lastAt=e.at; last.finalPref=_resusPref(e.label)||last.finalPref; }
else { _items.push({kind:'resus', at:e.at, lastAt:e.at, entries:[e], finalPref:_resusPref(e.label)}); }
} else { _items.push({kind:'event', e:e}); }
});
let _curIdx=-1;
if(!isCompleted(p)){ for(let k=_items.length-1;k>=0;k--){ const it=_items[k]; if(it.kind==='event'){ const sc=_stageClass(it.e.label); if(sc && sc!=='discharged'){ _curIdx=k; break; } } } }
let tlHtml='';
_items.forEach((it, idx)=>{
const iv='--timeline-index:'+idx;
if(it.kind==='event'){
const sc=_stageClass(it.e.label);
const cls='timeline-event'+(sc?(' '+sc):'')+(idx===_curIdx?' current':'');
tlHtml+=`<div class="${cls}" style="${iv}"><div class="timeline-time">${fmtTime(it.e.at)}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-copy"><div class="timeline-event-title">${pvxEscQ(it.e.label)}</div>${it.e.meta?`<div class="timeline-event-detail">${pvxEscQ(it.e.meta)}</div>`:''}</div></div>`;
} else {
const fp=it.finalPref||'CPR', fpc=fp==='DNR'?'dnr':'cpr';
if(it.entries.length<=1){
const e0=it.entries[0];
tlHtml+=`<div class="timeline-event resus ${fpc}" style="${iv}"><div class="timeline-time">${fmtTime(e0.at)}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-copy"><div class="timeline-event-title">Resuscitation preference · ${fp}</div>${e0.meta?`<div class="timeline-event-detail">${pvxEscQ(e0.meta)}</div>`:''}</div></div>`;
} else {
const mins=Math.max(1,Math.round((it.lastAt-it.at)/60000));
const who=_actor(it.entries[it.entries.length-1].meta);
let rows='';
it.entries.forEach((en,ei)=>{
const to=_resusPref(en.label), from=ei>0?_resusPref(it.entries[ei-1].label):'';
const line = from ?`<span class="ra-${from==='DNR'?'dnr':'cpr'}">${from}</span> → <span class="ra-${to==='DNR'?'dnr':'cpr'}">${to}</span>`:`<span class="ra-${to==='DNR'?'dnr':'cpr'}">${to}</span>`;
const ac=_actor(en.meta);
rows+=`<div class="resus-audit"><div class="ra-time">${fmtTime(en.at)}</div><div><div class="ra-line">${line}</div>${ac?`<div class="ra-actor">${pvxEscQ(ac)}</div>`:''}</div></div>`;
});
tlHtml+=`<div class="timeline-event resus ${fpc}" style="${iv}"><div class="timeline-time">${fmtTime(it.at)}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-copy"><div class="resus-burst"><button type="button" class="resus-burst-toggle" aria-expanded="false"><div><div class="timeline-event-title">Resuscitation preference · ${fp}</div><div class="timeline-event-detail">Changed ${it.entries.length} times over ${mins} min${who?' · '+pvxEscQ(who):''}</div></div><span class="resus-chevron" aria-hidden="true">›</span></button><div class="resus-burst-more"><div class="resus-burst-inner">${rows}</div></div></div></div></div>`;
}
}
});
const _tlEl=document.getElementById('dTimeline');
_tlEl.innerHTML=tlHtml;
if(_tlFreshOpen){ _tlEl.classList.add('collapsed'); _tlEl.classList.remove('tl-animate'); const _th=document.getElementById('dTimelineHead'); if(_th) _th.setAttribute('aria-expanded','false'); }
_tlFreshOpen=false;
try{ renderDisposition(p); }catch(e){}
}
