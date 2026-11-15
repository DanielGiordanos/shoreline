
 
function locPatients(loc){ return PATIENTS.filter(p=>isActive(p) && p.room===loc); }
function openLocDrawer(loc){
activeLoc=loc;
document.getElementById('locDrawer').classList.add('open');
renderLocDrawer();
}
function closeLocDrawer(){
activeLoc=null;
document.getElementById('locDrawer').classList.remove('open');
}
function renderLocDrawer(){
if(!activeLoc) return;
const loc=activeLoc, list=locPatients(loc);
const word = loc==='Lobby'? (list.length===1?'patient waiting':'patients waiting')
: (list.length===1?'patient in treatment':'patients in treatment');
document.getElementById('locTitle').textContent=loc;
document.getElementById('locSub').textContent=`${list.length} ${word}`;
document.getElementById('locHint').style.display = list.length ?'':'none';
const body=document.getElementById('locBody');
if(!list.length){
const msg = loc==='Lobby'?'No patients waiting in Lobby':'No patients';
body.innerHTML =`<div class="empty" style="padding:56px 20px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><b>${msg}</b><span>Drag patients here from the Rooms grid</span></div>`;
return;
}
body.innerHTML = list.map(p=>{
const inLoc=roomMinutes(p), total=waitMinutes(p);
return`<div class="loc-pt r-drag" draggable="true" data-pid="${p.id}">
      ${mono(p,'patient-medallion patient-medallion--compact')}
      <div class="lp-main">
        <div class="lp-name">${pvxEscQ(p.name)} ${pvxEscQ(p.last)}</div>
        <div class="lp-reason">${pvxDot(pvxEscQ(p.species),pvxEscQ(p.reason))}</div>
        <div class="lp-tags"><span class="prio prio-${p.prio}" style="width:22px;height:22px;font-size:0.625rem">${PRIO[p.prio].l}</span>${statusPill(p.status)}
          ${p.doctor==='unassigned'?'<span class="muted" style="font-size:0.75rem">No doctor assigned</span>':`<span class="lp-doc">${docAv(p.doctor)}${doc(p.doctor).name}</span>`}</div>
        <div class="lp-meta"><span>${loc}: <b>${fmtWait(inLoc)}</b></span><span>Hospital: <b>${fmtWait(total)}</b></span></div>
      </div>
    </div>`;
}).join('');

body.querySelectorAll('.loc-pt').forEach(row=>{
row.addEventListener('dragstart',e=>{
roomDragId=row.dataset.pid; row.classList.add('dragging'); e.dataTransfer.effectAllowed='move';
const p=PATIENTS.find(x=>x.id===roomDragId);
document.querySelectorAll('#roomGrid .room').forEach(r=>{ if(canDropRoom(p,r.dataset.roomName)) r.classList.add('room-available'); });
});
row.addEventListener('dragend',()=>{
row.classList.remove('dragging'); roomDragId=null;
document.querySelectorAll('#roomGrid .room').forEach(r=>{ r.classList.remove('room-available','room-drop','room-nodrop'); r._pvxN=0; });
});
row.addEventListener('click',()=>{ if(!row.classList.contains('dragging')){ const pid=row.dataset.pid; closeLocDrawer(); openDrawer(pid); } });
});
}
