
function renderDist(animate){
const active=PATIENTS.filter(isActive);
const total=active.length;
document.getElementById('distTotal').textContent = total===1 ?'1 patient': total+' patients';
const rows=FLOW_COLS.map(s=>{
const n=active.filter(p=>p.status===s).length;
const pct=total? Math.round(n/total*100):0;
const c=STATUSES[s].color;
const shown=(animate&&RAF)?0:pct;
return`<div class="status-row"><div class="status-label"><span class="sdot" style="color:${c};background:${c}"></span>${s}</div>`
+`<div class="track${n===0?' zero':''}"><div class="fill" data-w="${pct}" style="--w:${shown}%;--c:${c}"></div></div>`
+`<div class="count">${n}</div></div>`;
}).join('');
const el=document.getElementById('distList');
el.innerHTML=rows;
if(animate && RAF){ RAF(()=>RAF(()=>{ el.querySelectorAll('.fill').forEach(f=>{ f.style.setProperty('--w', f.dataset.w+'%'); }); })); }
}

 
function docShort(id){ const d=doc(id); return d===UNASSIGNED ?'Unassigned':'Dr. '+d.name.split(' ').slice(-1)[0]; }
function execMetrics(){
const active=PATIENTS.filter(isActive);
const working=DOCTORS.map(d=>{
const pts=PATIENTS.filter(p=>p.doctor===d.id && isActive(p));
const waits=pts.map(waitMinutes);
return {d, n:pts.length, avg: waits.length? Math.round(waits.reduce((a,b)=>a+b,0)/waits.length):0};
}).filter(x=>x.n>0);
const assigned=active.filter(p=>p.doctor!=='unassigned').length;
const byCount=[...working].sort((a,b)=>b.n-a.n);
const clin=ROOMS.filter(r=>r!=='Lobby');
const inUse=clin.filter(r=>active.some(p=>p.room===r)).length;

const pickups=examPickupsToday();
const byDoc={};
pickups.forEach(p=>{ const id=p.examStartedByDoctorId; if(!id||id==='unassigned') return; (byDoc[id]=byDoc[id]||[]).push(p.examWaitMinutes); });
const showIds=new Set(Object.keys(byDoc));
DOCTORS.forEach(d=>{ if(active.some(p=>p.doctor===d.id)) showIds.add(d.id); });
const waitByDoc=[...showIds].map(id=>{ const ws=byDoc[id]||[];
const activePts=active.filter(p=>p.doctor===id);



const avg=activePts.length? Math.round(activePts.reduce((a,p)=>a+waitMinutes(p),0)/activePts.length) : null;
const longest=activePts.length
? [...activePts].sort((a,b)=>waitMinutes(b)-waitMinutes(a))[0]
: null;
return { d:doc(id), n:ws.length, avg, activePts, load:activePts.length, longest };
}).sort((a,b)=> ((b.avg==null?-1:b.avg)-(a.avg==null?-1:a.avg)) || (b.load-a.load) || a.d.name.localeCompare(b.d.name));
return {
working, doctorsWorking:working.length,
avgPerDoc: working.length? (assigned/working.length):0,
highest: byCount[0], lowest: byCount[byCount.length-1],
inUse, totalRooms:clin.length, util: clin.length? Math.round(inUse/clin.length*100):0,
waitByDoc, casesToday: pickups.length,
discharged: completedTodayCount('Discharged'), admitted: completedTodayCount('Admitted'), euthanized: completedTodayCount('Euthanized'), deceased: completedTodayCount('Deceased'), completed: completedTodayCount('Discharged')+completedTodayCount('Admitted')+completedTodayCount('Euthanized')+completedTodayCount('Deceased')
};
}


function pickedUpToday(doctorId){ return examPickupsToday().some(p=>p.examStartedByDoctorId===doctorId); }
function isDoctorBlocked(doctorId){
const d=doc(doctorId), wf=d.workflowState;
return d.unavailable===true || d.blocked===true ||
(typeof wf==='string'&& ['in-surgery','in-procedure','on-break','off-floor','unavailable'].indexOf(wf)>=0);
}
function isDoctorAvailableForAssignment(doctorId, activePatients){
const d=doc(doctorId);
const activeForDoctor=(activePatients||PATIENTS.filter(isActive)).filter(p=>p.doctor===doctorId);
const isOnService = (typeof d.onService==='boolean') ? d.onService
: (activeForDoctor.length>0 || pickedUpToday(doctorId));
const acceptsCases = d.acceptsCases!==false;
const manuallyUnavailable = d.unavailable===true;
const blocked = isDoctorBlocked(doctorId);
const cap = (typeof d.maxCapacity==='number') ? d.maxCapacity : 1;
const hasCapacity = activeForDoctor.length < cap;
return isOnService && acceptsCases && !manuallyUnavailable && !blocked && hasCapacity;
}


const WD_TREND_KEY='wd_trend_v1', WD_TREND_WINDOW=8*60*1000;
function wdComputeTrends(rows){
let store; try{store=JSON.parse(localStorage.getItem(WD_TREND_KEY))||{};}catch(e){store={};}
const now=Date.now(), out={}; let changed=false;
rows.forEach(x=>{
const id=x.d.id, avg=x.avg;
if(avg==null){ if(store[id]){ delete store[id]; changed=true; } out[id]={cls:'',text:'—'}; return; }
const e=store[id];
if(!e){ store[id]={base:avg,ts:now}; changed=true; out[id]={cls:'',text:'—'}; return; }
const delta=avg-e.base;
if(now-e.ts>WD_TREND_WINDOW){ store[id]={base:avg,ts:now}; changed=true; }
out[id]= delta>=1 ? {cls:'up',text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>'+pvxDur(delta),say:'Average wait up '+pvxSpoken(delta)+' in the last '+Math.round(WD_TREND_WINDOW/60000)+' minutes'}
: delta<=-1 ? {cls:'down',text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>'+pvxDur(-delta),say:'Average wait down '+pvxSpoken(-delta)+' in the last '+Math.round(WD_TREND_WINDOW/60000)+' minutes'}
: {cls:'',text:'—',say:'Average wait unchanged in the last '+Math.round(WD_TREND_WINDOW/60000)+' minutes'};
});
if(changed){ try{localStorage.setItem(WD_TREND_KEY,JSON.stringify(store)); }catch(e){} }
return out;
}
function renderOps(animate){
const m=execMetrics();
const avail=m.totalRooms-m.inUse;


const A=CKPI_AC;
const opsCards=[
{k:'doctors',    lab:'Doctors Working', ac:A.cyan,  raw:m.doctorsWorking,
val:m.doctorsWorking, sub:'On shift now',     chip:''},
{k:'rooms',      lab:'Rooms In Use',    ac:(avail<=0?A.amber:A.cyan),  rail:m.util,   /* PVX-N365: amber once no room is free */
val:`${m.inUse}<small><span aria-hidden="true">/</span><span class="pvx-sr"> of </span>${m.totalRooms}</small>`,
sub:avail<=0?'No rooms available':`${avail} room${avail===1?'':'s'} available`, chip:m.util+'%'},
{k:'discharged', lab:'Discharged Today',ac:A.green, raw:m.discharged,
val:m.discharged,     sub:'Patients released', chip:'Today'},
{k:'admitted',   lab:'Admitted Today',  ac:A.blue,  raw:m.admitted,
val:m.admitted,       sub:'To hospital',       chip:'Today'},
{k:'completed',  lab:'Completed Today', ac:A.green, raw:m.completed,
val:m.completed,      sub:'Total off the board',chip:'Today'}
];
ckpiSample('ops', opsCards.filter(o=>typeof o.raw==='number'));
document.getElementById('opsGrid').innerHTML = opsCards.map(o=>
`<article class="command-kpi command-kpi--${o.k}" style="--kaccent:${o.ac.h};--kaccent-rgb:${o.ac.r}">
      <div class="command-kpi__top">
        <span class="command-kpi__label">${o.lab}</span>
        ${o.chip?`<span class="command-kpi__chip">${o.chip}</span>`:''}
      </div>
      <div class="command-kpi__value">${o.val}</div>
      <div class="command-kpi__sub">${o.sub}</div>
      ${o.rail!=null
        ? `<div class="command-kpi__rail">${o.rail>0?`<i style="width:${Math.min(100,o.rail)}%"></i>`:''}</div>`
        : ckpiSpark('ops',o.lab)}
    </article>`).join('');

document.getElementById('wdCount').textContent = m.waitByDoc.length + (m.waitByDoc.length===1?' doctor on service':' doctors on service');

const loads=m.waitByDoc.map(x=>x.load||0);
const maxLoad=loads.length?Math.max(...loads):0;
const minLoad=loads.length?Math.min(...loads):0;
const balance=(maxLoad-minLoad<=1)?'Balanced':'Needs Balancing';
const balEl=document.getElementById('wdBalance');
balEl.textContent=balance;
balEl.style.color=balance==='Balanced'?'var(--ink-400)':'var(--s-waiting)';
balEl.style.borderColor=balance==='Balanced'?'rgba(120,145,170,.11)':'rgba(235,201,93,.20)';
balEl.style.background=balance==='Balanced'?'rgba(255,255,255,.014)':'rgba(235,201,93,.06)';

const activeLoads=m.waitByDoc.filter(x=>x.load>0).map(x=>x.load);
const avgLoad=activeLoads.length ? activeLoads.reduce((a,b)=>a+b,0)/activeLoads.length : 0;
const wl=document.getElementById('opsWaitList');
const activeAll=PATIENTS.filter(isActive);
const wdTrends=wdComputeTrends(m.waitByDoc);

wl.innerHTML = m.waitByDoc.length ? m.waitByDoc.map(x=>{
const has=x.avg!=null;
const waitCls=!has?'':(x.avg>120?'crit':x.avg>60?'warn':'');


const state = isDoctorBlocked(x.d.id)
? {label:'Unavailable', cls:''}
: isDoctorAvailableForAssignment(x.d.id, activeAll)
? {label:'Available for assignment', cls:'available'}
: (x.load>Math.max(1,Math.ceil(avgLoad)))
? {label:'High load', cls:'high'}
: {label:'Accepting cases', cls:''};

const longest=x.longest
?`Longest: ${pvxEscQ(x.longest.name)} · ${fmtWait(waitMinutes(x.longest))}`
:'No active cases';

return`<div class="wd-row ${x.load===0?'is-idle':''}" data-doctor="${x.d.id}" title="View ${docShort(x.d.id)}">
      <span class="wd-avatar" style="--wd-accent:${x.d.color}">${x.d.initials}</span>
      <div class="wd-main">
        <div class="wd-top">
          <span class="wd-name">${docShort(x.d.id)}</span>
          <span class="wd-count">${x.load} active patient${x.load===1?'':'s'}</span>
        </div>
        <div class="wd-subline">
          <span class="wd-longest">${longest}</span>
          <span class="wd-state ${state.cls}"${state.label!=='Unavailable'?` data-assign="${x.d.id}" title="Assign an unassigned patient to ${docShort(x.d.id)}"`:''}>${state.label}</span>
        </div>
      </div>
      <div class="wd-metrics">
        <span class="wd-trend ${wdTrends[x.d.id].cls}" ${wdTrends[x.d.id].say?'role="img" aria-label="'+wdTrends[x.d.id].say+'"':'aria-hidden="true"'}>${wdTrends[x.d.id].text}</span>
        <span class="wd-wait-stack">
          <span class="wd-wait ${waitCls}">${has?fmtWait(x.avg):'—'}</span>
          <span class="wd-wait-label">Avg wait</span>
        </span>
        <span class="wd-action" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></span>
      </div>
    </div>`;
}).join('') :`<div class="empty-mini"><div class="ico">${EMPTY_ICON}</div><b>No doctors on service</b></div>`;
}





document.addEventListener('click',e=>{
if(e.target.closest('.wd-state[data-assign]')) return;
const row=e.target.closest('.wd-row[data-doctor]');
if(!row) return;
const id=row.dataset.doctor;
if(!id) return;
filters.doctor=id;
const listSeg=document.querySelector('.seg[data-view="list"]');
if(listSeg) listSeg.click();
else{
renderFilterBar();
renderTable();
}
});



function assignUnassignedList(){ return PATIENTS.filter(p=>isActive(p) && (!p.doctor || p.doctor==='unassigned')); }
function renderAssignBody(){
const body=document.getElementById('assignBody'); if(!body) return;
const list=assignUnassignedList();
const sub=document.getElementById('assignSub');
if(sub) sub.textContent = list.length ? (list.length+' unassigned patient'+(list.length===1?'':'s')) :'No unassigned patients';
if(!list.length){ body.innerHTML='<div class="assign-empty">Every active patient already has a doctor.</div>'; return; }
body.innerHTML = list.map(function(p){
var meta=[p.species,p.breed].filter(Boolean).join(' · ');
var reason=p.reason?(' · '+p.reason):'';
var pr=p.priority||3;
return'<button class="assign-row" data-pid="'+p.id+'">'
+'<div><div class="assign-name">'+pvxEscQ((p.name+' '+(p.last||'')).trim())+'</div>'
+'<div class="assign-meta">'+pvxEscQ(meta+reason)+'</div></div>'
+'<div class="assign-side"><span class="assign-loc">'+pvxEscQ(p.room||'Lobby')+'</span><span class="assign-prio p'+pr+'">P'+pr+'</span></div>'
+'</button>';
}).join('');
}
let assignDocId=null;
function openAssignModal(docId){
assignDocId=docId;
var nm=document.getElementById('assignDocName'); if(nm) nm.textContent=docShort(docId);
renderAssignBody();
document.getElementById('assignScrim').classList.add('open');
document.getElementById('assignModal').classList.add('open');
}
function closeAssignModal(){
document.getElementById('assignScrim').classList.remove('open');
document.getElementById('assignModal').classList.remove('open');
assignDocId=null;
}
document.addEventListener('click',function(e){ var s=e.target.closest('.wd-state[data-assign]'); if(s){ e.stopPropagation(); openAssignModal(s.dataset.assign); } });
(function(){
var sc=document.getElementById('assignScrim'), cl=document.getElementById('assignClose'), ca=document.getElementById('assignCancel'), body=document.getElementById('assignBody');
if(sc) sc.onclick=closeAssignModal;
if(cl) cl.onclick=closeAssignModal;
if(ca) ca.onclick=closeAssignModal;
if(body) body.addEventListener('click',function(e){ var r=e.target.closest('.assign-row[data-pid]'); if(!r) return; var p=PATIENTS.find(function(x){return String(x.id)===r.dataset.pid;}); if(p && assignDocId){ assignDoctor(p, assignDocId); } closeAssignModal(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ var m=document.getElementById('assignModal'); if(m && m.classList.contains('open')) closeAssignModal(); } });
})();
