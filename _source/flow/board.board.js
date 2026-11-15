


const COL_EMPTY={Waiting:'No patients waiting',Exam:'No exams in progress',Diagnostics:'No active diagnostics',Ultrasound:'No ultrasounds running',Procedure:'No procedures in progress'};
const EMPTY_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
/* renderBoard · its layers, innermost first: 1 n349 after   (PVX-N387; kept true by flow_t387) */
function renderBoard(){ return pvxRun('renderBoard',renderBoard$base,this,arguments); }
function renderBoard$base(){
const board=document.getElementById('board');
if(PATIENTS.filter(isActive).length===0){
board.classList.add('board-empty');
board.innerHTML=`<div class="empty board-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><b>No active patients in the hospital.</b><span>New patients appear here after check-in.</span></div>`;
return;
}
board.classList.remove('board-empty');
board.innerHTML=FLOW_COLS.map(s=>{
const list=pvxBoardFiltered().filter(p=>p.status===s).sort(pvxByUrgency);
const cards=list.map(p=>cardHTML(p)).join('') ||
`<div class="empty-mini empty-mini--stage"><div class="ico">${EMPTY_ICON}</div><b>${(typeof searchQ!=='undefined'&&String(searchQ).trim())?'No matches here':(COL_EMPTY[s]||'Nothing here')}</b></div>`;
return`<div class="col" data-status="${s}">
      <div class="col-head"><span class="cd" style="background:${STATUSES[s].color}"></span><h4>${s}</h4><span class="cc">${list.length}</span></div>
      <div class="col-body" data-status="${s}">${cards}</div>
    </div>`;
}).join('');
wireDnD();
}
function cardHTML(p){
const w=waitMinutes(p);const wc=w>120?'crit':w>45?'warn':'';
return`<div class="card" draggable="true" data-pid="${p.id}">
    <span class="edge" style="background:${PRIO[p.prio].c}"></span>
    <div class="c-top">${mono(p,'patient-medallion patient-medallion--compact')}<b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${pvxEscQ(p.name)} ${pvxEscQ(p.last)} · ${p.status}">${pvxEscQ(p.name)} ${pvxEscQ(p.last)}</button>${msgBadge(p)}</b> <button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="stage" aria-label="Move ${pvxEscQ(p.name)} to another stage" title="Move to another stage">${PVX_MOVE_ICON}</button><span class="prio prio-${p.prio}" style="width:22px;height:22px;font-size:0.625rem">${PRIO[p.prio].l}</span></div>
    <div class="c-reason">${p.species?'<span class="c-sp">'+pvxEscQ(typeof speciesEnglish==='function'?speciesEnglish(p.species):p.species)+'</span> · ':''}${pvxEscQ(compactProblems(p))}</div>${typeof fgCard==='function'?fgCard(p):''}${typeof fvOrChip==='function'?fvOrChip(p):''}
    ${usFlag(p)}${typeof fvWaitChip==='function'?fvWaitChip(p):''}${typeof fvPresenceChip==='function'?fvPresenceChip(p):''}
    <div class="c-meta"><div class="l">${p.doctor==='unassigned'?'<span class="muted" style="font-size:0.75rem">No doctor</span>':docAv(p.doctor)}${p.liaison?liaAv(p.liaison):''}${ctAvRow(p)}
      <span class="loc" style="font-size:0.75rem">${pvxEscQ(p.room)}</span></div>
      <span class="wait ${wc}" style="font-size:0.75rem">${fmtWait(w)}</span></div>
    <div class="card-expand">
      <div class="row"><span>Owner</span><b>${pvxEscQ(p.owner)}</b></div>
      <div class="row"><span>Arrived</span><b>${fmtTime(p.arrival)}</b></div>
      <div class="row"><span>Liaison</span><b>${liaison(p.liaison)?liaison(p.liaison).name:'—'}</b></div>
      ${ctCardAction(p)}
    </div>
  </div>`;
}
let dragId=null;
function wireDnD(){
document.querySelectorAll('.card').forEach(c=>{
c.addEventListener('dragstart',e=>{dragId=c.dataset.pid;c.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
c.addEventListener('dragend',()=>{c.classList.remove('dragging');dragId=null;
document.querySelectorAll('.col').forEach(x=>{ x.classList.remove('drop'); const b=x.querySelector('.col-body'); if(b) b._pvxN=0; });
document.querySelectorAll('.cz-target').forEach(x=>{ x.classList.remove('cz-over'); x._pvxN=0; });
const bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim');});
c.addEventListener('click',()=>{ if(!c.classList.contains('dragging')) openDrawer(c.dataset.pid); });
});
document.querySelectorAll('[data-usflag]').forEach(el=>{ el.onclick=e=>{ e.stopPropagation(); openUltrasoundRequest(el.getAttribute('data-usflag')); }; });
document.querySelectorAll('.col-body').forEach(col=>{
const parent=col.closest('.col');
col.addEventListener('dragenter',()=>{ if(dragId) col._pvxN=(col._pvxN||0)+1; });   /* PVX-N192: entering a card inside isn't leaving */
col.addEventListener('dragover',e=>{ const p=dragId&&PATIENTS.find(x=>x.id===dragId); if(!p) return; e.preventDefault();
  const ok=p.status!==col.dataset.status; e.dataTransfer.dropEffect=ok?'move':'none'; parent.classList.toggle('drop',ok); });
col.addEventListener('dragleave',()=>{ if(col._pvxN>1){ col._pvxN--; return; } col._pvxN=0; parent.classList.remove('drop'); });
col.addEventListener('drop',e=>{
e.preventDefault();parent.classList.remove('drop'); col._pvxN=0;
const p=PATIENTS.find(x=>x.id===dragId);
const newStatus=col.dataset.status;
if(p && p.status!==newStatus){ moveStatus(p,newStatus); }
});
});
}
/* moveStatus · its layers, innermost first: 1 #10 wrap · 2 n192 wrap · 3 n253-admit wrap · 4 n350 wrap   (PVX-N387; kept true by flow_t387) */
function moveStatus(p,newStatus){ return pvxRun('moveStatus',moveStatus$base,this,arguments); }
function moveStatus$base(p,newStatus){
if(newStatus==='Discharged'||newStatus==='Admitted') return completePatient(p,newStatus);
const old=p.status;
const at=new Date();
p.status=newStatus;


if(newStatus==='Exam'&& !p.examStartedAt){
p.examStartedAt = at;
p.examStartedByDoctorId = (p.doctor && p.doctor!=='unassigned') ? p.doctor : null;
p.examWaitMinutes = Math.max(0, Math.round((at - (p.arrival||at))/60000));
}
p.timeline.push({label:`${newStatus} started`, at:at, meta:`Moved from ${old}`});

if(newStatus==='Ultrasound'&& !p.ultrasound){
p.ultrasound = { study:'Abdominal Ultrasound', clinicalQuestion:'', status:'incomplete', requestStatus:'incomplete', requestedAt:null, createdAt:at };
}
const done = ['Diagnostics','Ultrasound','Procedure'].includes(old) ?`${old} completed`:`Moved to ${newStatus}`;
notify(pvxEscQ(done),`${pvxEscQ(p.name)} · in ${pvxEscQ(p.room)}`, {icon:'move', color:STATUSES[newStatus].color});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });

if(newStatus==='Ultrasound'&& (!p.ultrasound || p.ultrasound.status!=='requested')){
const pid=p.id; setTimeout(function(){ openUltrasoundRequest(pid); }, 160);
}
}
