
 
/* moveRoom · its layers, innermost first: 1 #8 wrap · 2 #23 wrap · 3 n192 wrap · 4 n350 wrap   (PVX-N387; kept true by flow_t387) */
function moveRoom(p,newRoom){ return pvxRun('moveRoom',moveRoom$base,this,arguments); }
function moveRoom$base(p,newRoom){
const old=p.room;
if(old===newRoom) return;
const stamp=new Date();
p.room=newRoom;
p.roomSince=stamp;
p.timeline.push({label:`Moved from ${old} to ${newRoom}`, at:stamp, meta:''});
notify('Patient moved',`${pvxEscQ(p.name)} · ${pvxEscQ(old)} → ${pvxEscQ(newRoom)}`, {icon:'move', color:STATUSES[p.status].color});
if(old!=='Lobby'&& !PATIENTS.some(x=>x.id!==p.id && isActive(x) && x.room===old))
notify(`${pvxEscQ(old)} available`,'Ready for next patient', {icon:'room', color:'var(--s-admitted)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}

function canDropRoom(p,target){
if(!p || !target || p.room===target) return false;
if(target==='Lobby'|| target==='Treatment') return true;
if(!ROOMS.includes(target)) return false;
return !PATIENTS.some(x=>x.id!==p.id && isActive(x) && x.room===target);
}
