
function pvxBoardFiltered(){ var f=filters; filters={status:null,prio:null,doctor:null,liaison:null}; try{ return filtered(); } finally { filters=f; } }   /* PVX-N356: the board takes search, not the Patients filters */
/* filtered · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function filtered(){ return pvxRun('filtered',filtered$base,this,arguments); }
function filtered$base(){
return PATIENTS.filter(p=>{
if(filters.status && p.status!==filters.status) return false;
if(filters.prio && p.prio!==filters.prio) return false;
if(filters.doctor && p.doctor!==filters.doctor) return false;
if(filters.liaison){ if(filters.liaison==='none'){ if(p.liaison) return false; } else if(p.liaison!==filters.liaison) return false; }
if(searchQ){
const l=liaison(p.liaison);
const hay=[p.name,p.last,p.species,p.reason,doc(p.doctor).name,l?l.name:'',p.room,p.owner,p.status,p.hid].join(' ').toLowerCase();
if(!hay.includes(searchQ.toLowerCase())) return false;
}
return true;
});
}
