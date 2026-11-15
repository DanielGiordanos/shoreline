
 
const COMPLETION = {
Discharged: {tlLabel:'Patient discharged', title:'Patient discharged', icon:'discharge', color:'var(--s-admitted)', stampKey:'dischargedAt'},
Admitted:   {tlLabel:'Patient admitted',   title:'Patient admitted',   icon:'check',     color:'var(--s-admitted)', stampKey:'admittedAt'},
Euthanized: {tlLabel:'Patient euthanized',  title:'Patient euthanized',  icon:'info',      color:'#8A82A8',           stampKey:'euthanizedAt'}
};
/* completePatient · its layers, innermost first: 1 #23 after · 2 n252-net wrap · 3 n350 wrap   (PVX-N387; kept true by flow_t387) */
function completePatient(p,finalStatus){ return pvxRun('completePatient',completePatient$base,this,arguments); }
function completePatient$base(p, finalStatus){
const old=p.status, oldRoom=p.room;
const cfg=COMPLETION[finalStatus]||COMPLETION.Discharged;
const stamp=new Date();
p.status=finalStatus;
p.completed=true; p.active=false;
p.completedAt=stamp;
p[cfg.stampKey]=stamp;
p.totalMin=Math.round((stamp - p.arrival)/60000);
p.totalTimeInHospital=p.totalMin;
p.timeline.push({label: cfg.tlLabel, at:stamp, meta:`From ${old}`});
try{ rdOnFlowComplete(p, finalStatus); }catch(e){ console.warn('[rounds] couldn’t update Rounds for',p&&p.name,e); }   /* n252: was silent */

notify(cfg.title,`${pvxEscQ(p.name)} · ${pvxEscQ(p.hid)}`, {icon: cfg.icon, color: cfg.color});
if(oldRoom && oldRoom!=='Lobby') notify(`${pvxEscQ(oldRoom)} available`,'Ready for next patient', {icon:'room', color:'var(--s-admitted)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
 



function archiveList(){ return PATIENTS.filter(p=>isCompleted(p) && p.completedAt && isTodayHosp(p.completedAt)).sort((a,b)=>(b.completedAt||0)-(a.completedAt||0)); }
/* renderComplete · its layers, innermost first: 1 #17 after   (PVX-N387; kept true by flow_t387) */
function renderComplete(){ return pvxRun('renderComplete',renderComplete$base,this,arguments); }
function renderComplete$base(){
const dEl=document.getElementById('dischCount'), aEl=document.getElementById('admitCount'), eEl=document.getElementById('euthCount'), tEl=document.getElementById('czTotal');
const _dT=completedTodayCount('Discharged'), _aT=completedTodayCount('Admitted'), _eT=completedTodayCount('Euthanized');
if(dEl) dEl.textContent=_dT;
if(aEl) aEl.textContent=_aT;
if(eEl) eEl.textContent=_eT;
if(tEl) tEl.textContent=_dT+_aT+_eT;
const list=document.getElementById('czList'); if(!list) return;
const arch=archiveList();
list.innerHTML = arch.length ? arch.map(p=>`
    <div class="cz-item" data-pid="${p.id}">${mono(p,'patient-medallion patient-medallion--compact')}
      <div class="cz-main"><div class="cz-name">${pvxEscQ(p.name)} ${pvxEscQ(p.last)}</div>
        <div class="cz-sub">${p.doctor==='unassigned'?'No doctor':docShort(p.doctor)} · ${fmtWait(p.totalMin||0)} total</div></div>
      <div class="cz-rt"><span class="pill st-${p.status.toLowerCase()}"><span class="d"></span>${p.status}</span>
        <span class="cz-time">${p.completedAt?fmtTime(p.completedAt):''}</span></div>
    </div>`).join('') :`<div class="empty-mini empty-mini--stage"><div class="ico">${EMPTY_ICON}</div><b>No completions yet today</b></div>`;
list.querySelectorAll('.cz-item').forEach(n=>n.onclick=()=>openDrawer(n.dataset.pid));
}
function wireCompleteZones(){
document.querySelectorAll('.cz-target').forEach(z=>{
z.addEventListener('dragover',e=>{ if(!dragId) return; e.preventDefault(); z.classList.add('cz-over');
const bd=document.getElementById('board'); if(bd) bd.classList.add('board-dim'); });
z.addEventListener('dragenter',()=>{ if(dragId) z._pvxN=(z._pvxN||0)+1; });
z.addEventListener('dragleave',()=>{ if(z._pvxN>1){ z._pvxN--; return; } z._pvxN=0; z.classList.remove('cz-over');
const bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim'); });
z.addEventListener('drop',e=>{ e.preventDefault(); z.classList.remove('cz-over'); z._pvxN=0;
const bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim');
const p=PATIENTS.find(x=>x.id===dragId); if(!p) return;
const final=z.dataset.final;
const verb={Discharged:'discharged',Admitted:'admitted',Euthanized:'euthanized'}[final]||'discharged';
const okLabel={Discharged:'Discharge patient',Admitted:'Admit patient',Euthanized:'Mark euthanized'}[final]||'Discharge patient';
if(final==='Admitted'&&window.pvxCanAdmit&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }   /* n253 */
showConfirm(`Mark ${p.name} ${p.last} as ${verb}?`, okLabel,
()=>completePatient(p, final),
{sub:'This will remove the patient from active views and move them to Completed Today.'});
});
});
}
