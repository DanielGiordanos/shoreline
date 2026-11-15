 




function renderRooms(){
const occ=PATIENTS.filter(p=>isActive(p)).length;
document.getElementById('roomLive').textContent=`${PATIENTS.filter(p=>isActive(p)&&p.room!=='Lobby').length} rooms in use`;
const grid=document.getElementById('roomGrid');
const cards=ROOMS.map(rm=>{
const occupants=PATIENTS.filter(p=>isActive(p)&&p.room===rm).sort(pvxByUrgency);
const spec=ROOM_SPEC[rm];
if(rm==='Lobby'){
const waiting=occupants.length;
return`<div class="room ${waiting?'occupied':''}" data-room="${rm}" data-room-name="${rm}">
        ${waiting?`<div class="room-accent" style="background:var(--s-waiting)"></div>`:''}
        <div class="r-top"><div><div class="r-name"><button type="button" class="pvx-open" data-loc="Lobby" aria-label="Open Lobby">Lobby</button></div><div class="r-spec">Waiting area</div></div>
          <span class="r-state ${waiting?'clean':'avail'}">${waiting?waiting+' Waiting':'Empty'}</span></div>
        ${waiting?occupants.slice(0,3).map(p=>`<div class="r-pt r-drag" draggable="true" data-pid="${p.id}" style="margin-bottom:8px">${mono(p,'patient-medallion patient-medallion--compact','width:30px;height:30px;font-size:0.6875rem')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${pvxEscQ(p.name)}">${pvxEscQ(p.name)}</button><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="room" aria-label="Move ${pvxEscQ(p.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></b><span>${fmtWait(waitMinutes(p))} · ${PRIO[p.prio].l}</span></div></div>`).join('')+(waiting>3?`<div class="muted" style="font-size:0.75rem;margin-top:4px">+${waiting-3} more</div>`:''):`<div class="r-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>No patients waiting</div>`}
      </div>`;
}
const p=occupants[0];
if(!p){
return`<div class="room" data-room="${rm}" data-room-name="${rm}">
        <div class="r-top"><div><div class="r-name">${rm}</div>${spec?`<div class="r-spec">${spec}</div>`:'<div class="r-spec">&nbsp;</div>'}</div>
          <span class="r-state avail">Available</span></div>
        <div class="r-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/></svg>Ready for next patient</div>
      </div>`;
}
const rmin=roomMinutes(p); const rcls=rmin>120?'crit':rmin>60?'warn':'';
return`<div class="room occupied r-drag" draggable="true" data-pid="${p.id}" data-room-name="${rm}"> <div class="room-accent" style="background:${STATUSES[p.status].color}"></div> <div class="r-top"><div><div class="r-name">${rm}</div>${spec?`<div class="r-spec">${spec}</div>`:'<div class="r-spec">&nbsp;</div>'}</div> <span class="r-state busy">In use</span><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="room" aria-label="Move ${pvxEscQ(p.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></div>
      <div class="r-pt">${mono(p,'patient-medallion patient-medallion--compact')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${pvxEscQ(p.name)} ${pvxEscQ(p.last)} · ${rm}">${pvxEscQ(p.name)} ${pvxEscQ(p.last)}</button></b><span>${pvxDot(pvxEscQ(p.species),pvxEscQ(compactProblems(p).slice(0,26))+(compactProblems(p).length>26?'…':''))}</span></div></div>
      ${typeof fgRoom==='function'?fgRoom(p):''}
      <div class="r-foot"><div class="dctr">${p.doctor==='unassigned'?'<span class="muted">No doctor</span>':docAv(p.doctor)+doc(p.doctor).name}</div>
        <div class="r-right"><span class="r-timer ${rcls}" title="Time in ${rm}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${fmtWait(rmin)}</span>${statusPill(p.status)}</div></div>
    </div>`;
});

const ti = ROOMS.indexOf('Room 7');
cards.splice(ti+1, 0, treatmentCard());
grid.innerHTML = cards.join('');
grid.querySelectorAll('.room.occupied[data-pid]').forEach(n=>n.onclick=()=>openDrawer(n.dataset.pid));

grid.querySelectorAll('.room[data-room-name="Lobby"], .room[data-room-name="Treatment"]').forEach(card=>{
card.style.cursor='pointer';
card.onclick=()=>openLocDrawer(card.dataset.roomName);
});
wireRoomDnD();
}


function treatmentCard(){
const occ = PATIENTS.filter(p=>isActive(p) && p.room==='Treatment');
if(!occ.length){
return`<div class="room" data-room-name="Treatment">
        <div class="room-accent" style="background:#2FB6B9"></div>
        <div class="r-top"><div><div class="r-name">Treatment</div><div class="r-spec">ICU • Treatment • Wards</div></div>
          <span class="r-state avail">Available</span></div>
        <div class="r-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/></svg>No patients</div>
      </div>`;
}
const lead=occ[0], rmin=roomMinutes(lead);
const rows = occ.slice(1,4).map(p=>`
      <div class="r-pt r-drag" draggable="true" data-pid="${p.id}" style="margin-top:9px;padding-top:9px;border-top:1px solid var(--glass-hairline)"> ${mono(p,'patient-medallion patient-medallion--compact')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${pvxEscQ(p.name)} ${pvxEscQ(p.last)}">${pvxEscQ(p.name)} ${pvxEscQ(p.last)}</button><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="room" aria-label="Move ${pvxEscQ(p.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></b><span>${pvxEscQ(p.species)} · ${p.status}</span></div></div>`).join('');
const more = occ.length>4 ?`<div class="muted" style="font-size:0.75rem;margin-top:6px">+${occ.length-4} more in treatment</div>`:'';
return`<div class="room occupied" data-room-name="Treatment"> <div class="room-accent" style="background:#2FB6B9"></div> <div class="r-top"><div><div class="r-name"><button type="button" class="pvx-open" data-loc="Treatment" aria-label="Open Treatment">Treatment</button></div><div class="r-spec">ICU • Treatment • Wards</div></div>
        <span class="r-state busy">In use</span></div>
      <div class="r-pt r-drag" draggable="true" data-pid="${lead.id}">${mono(lead,'patient-medallion patient-medallion--compact')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${lead.id}" aria-label="Open patient: ${pvxEscQ(lead.name)} ${pvxEscQ(lead.last)}">${pvxEscQ(lead.name)} ${pvxEscQ(lead.last)}</button><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${lead.id}" data-kind="room" aria-label="Move ${pvxEscQ(lead.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></b><span>${pvxEscQ(lead.species)} · ${pvxEscQ(compactProblems(lead).slice(0,26))}${compactProblems(lead).length>26?'…':''}</span></div></div>
      ${typeof fgRoom==='function'?fgRoom(lead):''}${rows}${more}
      <div class="r-foot"><div class="dctr">${lead.doctor==='unassigned'?'<span class="muted">No doctor</span>':docAv(lead.doctor)+doc(lead.doctor).name}</div>
        <div class="r-right"><span class="r-timer" title="Time in Treatment"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${fmtWait(rmin)}</span>${statusPill(lead.status)}</div></div>
    </div>`;
}
let roomDragId=null;
function wireRoomDnD(){
const grid=document.getElementById('roomGrid');
grid.querySelectorAll('.r-drag[draggable="true"]').forEach(el=>{
el.addEventListener('dragstart',e=>{
roomDragId=el.dataset.pid; el.classList.add('dragging');
e.dataTransfer.effectAllowed='move';
const p=PATIENTS.find(x=>x.id===roomDragId);
grid.querySelectorAll('.room').forEach(r=>{ if(canDropRoom(p,r.dataset.roomName)) r.classList.add('room-available'); });
});
el.addEventListener('dragend',()=>{
el.classList.remove('dragging'); roomDragId=null;
grid.querySelectorAll('.room').forEach(r=>{ r.classList.remove('room-available','room-drop','room-nodrop'); r._pvxN=0; });
});
});
grid.querySelectorAll('.room').forEach(room=>{
const target=room.dataset.roomName;
room.addEventListener('dragenter',()=>{ if(!roomDragId) return; room._pvxN=(room._pvxN||0)+1; if(room._pvxN!==1) return;   /* PVX-N192 */
const p=PATIENTS.find(x=>x.id===roomDragId); if(p&&p.room!==target&&!canDropRoom(p,target)&&window.pvxSay) pvxSay(target+' is occupied'); });
room.addEventListener('dragover',e=>{
if(!roomDragId) return;
const p=PATIENTS.find(x=>x.id===roomDragId);
if(p && p.room===target) return;
e.preventDefault();
const ok=canDropRoom(p,target);
e.dataTransfer.dropEffect=ok?'move':'none';   /* PVX-N192: refused before release - "not allowed", and the patient slides back */
room.classList.toggle('room-drop',ok);
room.classList.toggle('room-nodrop',!ok);
});
room.addEventListener('dragleave',()=>{ if(room._pvxN>1){ room._pvxN--; return; } room._pvxN=0; room.classList.remove('room-drop','room-nodrop'); });
room.addEventListener('drop',e=>{
e.preventDefault();
room.classList.remove('room-drop','room-nodrop'); room._pvxN=0;
const p=PATIENTS.find(x=>x.id===roomDragId);
if(!p || p.room===target) return;
if(!canDropRoom(p,target)){ toast('That room is in use — choose another room'); return; }
if(target==='Comfort Room'){ showConfirm('Move patient to Comfort Room?','Move patient',()=>moveRoom(p,target)); }
else moveRoom(p,target);
});
});
}
