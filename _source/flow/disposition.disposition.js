

let _dispBusy=false, _dispUndoTimer=null;
const DISP_ICON={
admit:'<path d="M14 21V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v17"/><path d="M3 21h16"/><circle cx="11" cy="12" r="1"/>',
discharge:'<path d="M3 8v10"/><path d="M3 12h15a3 3 0 0 1 3 3v3"/><path d="M3 18h18"/><circle cx="8" cy="9.5" r="1.6"/>',
euth:'<path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10z"/>'
};
function dispFirstName(p){ return (p&&p.name)?String(p.name).split(' ')[0]:'Patient'; }
/* captureDispSnap · its layers, innermost first: 1 #17 wrap   (PVX-N387; kept true by flow_t387) */
function captureDispSnap(p){ return pvxRun('captureDispSnap',captureDispSnap$base,this,arguments); }
function captureDispSnap$base(p){ return {status:p.status,completed:p.completed,active:p.active,completedAt:p.completedAt,dischargedAt:p.dischargedAt,admittedAt:p.admittedAt,euthanizedAt:p.euthanizedAt,totalMin:p.totalMin,totalTimeInHospital:p.totalTimeInHospital,room:p.room,roomSince:p.roomSince,tlLen:(p.timeline?p.timeline.length:0)}; }
/* restoreDispSnap · its layers, innermost first: 1 #17 wrap   (PVX-N387; kept true by flow_t387) */
function restoreDispSnap(p,s){ return pvxRun('restoreDispSnap',restoreDispSnap$base,this,arguments); }
function restoreDispSnap$base(p,s){ p.status=s.status;p.completed=s.completed;p.active=s.active;p.completedAt=s.completedAt;p.dischargedAt=s.dischargedAt;p.admittedAt=s.admittedAt;p.euthanizedAt=s.euthanizedAt;p.totalMin=s.totalMin;p.totalTimeInHospital=s.totalTimeInHospital;p.room=s.room;p.roomSince=s.roomSince;if(p.timeline&&typeof s.tlLen==='number')p.timeline.length=s.tlLen; }
/* renderDisposition · its layers, innermost first: 1 #17 after · 2 n253-admit wrap   (PVX-N387; kept true by flow_t387) */
function renderDisposition(p){ return pvxRun('renderDisposition',renderDisposition$base,this,arguments); }
function renderDisposition$base(p){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(!acts||!conf) return;
if(conf){ conf.className='disp-confirm'; conf.innerHTML=''; }
acts.classList.remove('mutation-locked');
acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.remove('processing','compress','errored'));
if(isCompleted(p)){
const map={ Admitted:['Admitted','Inpatient care active',DISP_ICON.admit],
Discharged:['Discharged','Visit completed',DISP_ICON.discharge],
Euthanized:['Visit closed','Recorded in Completed Today',DISP_ICON.euth],
Deceased:['Visit closed','Recorded in Completed Today',DISP_ICON.euth] };
const m=map[p.status]||map.Discharged;
acts.style.display='none';
conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-terminal"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+m[2]+'</svg></span><span class="dc-body"><span class="dc-title">'+m[0]+'</span><span class="dc-desc">'+m[1]+'</span></span></div>';
return;
}
acts.style.display='';
}
/* openDispConfirm · its layers, innermost first: 1 #17 wrap · 2 n253-admit wrap   (PVX-N387; kept true by flow_t387) */
function openDispConfirm(kind){ return pvxRun('openDispConfirm',openDispConfirm$base,this,arguments); }
function openDispConfirm$base(kind){
const p=PATIENTS.find(x=>x.id===activePatient);
if(!p||_dispBusy||isCompleted(p)) return;
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.add('compress'));
const isAdmit=kind==='admit', nm=dispFirstName(p);
const q=isAdmit?('Admit '+nm+'?'):('Discharge '+nm+'?');
const sub=isAdmit?('Move '+nm+' into inpatient care.'):('Complete '+nm+'’s active visit.');
const go=isAdmit?'Admit':'Discharge';
conf.className='disp-confirm mounted';
conf.innerHTML='<div class="confirmation '+(isAdmit?'from-admit':'from-discharge')+'" role="group" aria-label="'+q+'">'
+'<div class="cf-q">'+q+'</div><div class="cf-sub">'+sub+'</div>'
+'<div class="cf-row"><button type="button" class="cf-btn cancel" data-cf="cancel">Cancel</button>'
+'<button type="button" class="cf-btn go" data-cf="go" data-kind="'+kind+'">'+go+'</button></div></div>';
const surface=conf.querySelector('.confirmation'); if(surface) requestAnimationFrame(()=>surface.classList.add('open'));
const goBtn=conf.querySelector('.cf-btn.go'); if(goBtn) goBtn.focus();
}
/* closeDispConfirm · its layers, innermost first: 1 #17 after   (PVX-N387; kept true by flow_t387) */
function closeDispConfirm(){ return pvxRun('closeDispConfirm',closeDispConfirm$base,this,arguments); }
function closeDispConfirm$base(){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(acts) acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.remove('compress'));
if(conf){ conf.className='disp-confirm'; conf.innerHTML=''; }
}
/* submitDisp · its layers, innermost first: 1 n253-admit wrap   (PVX-N387; kept true by flow_t387) */
function submitDisp(kind){ return pvxRun('submitDisp',submitDisp$base,this,arguments); }
function submitDisp$base(kind){
let p=PATIENTS.find(x=>x.id===activePatient);
if(!p||_dispBusy) return;
if(isCompleted(p)){ showDispConflict(p); return; }
const pid=p.id;
_dispBusy=true;
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
acts.classList.add('mutation-locked');
const card=acts.querySelector('.disposition-card.'+kind); if(card) card.classList.add('processing');
conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-terminal" aria-live="polite"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/></svg></span><span class="dc-body"><span class="dc-title">'+(kind==='admit'?'Admitting…':'Discharging…')+'</span><span class="dc-desc">Saving to record</span></span></div>';
setTimeout(function(){
p=PATIENTS.find(x=>x.id===pid)||p;   /* n252: the board may have refreshed during "Admitting…" */
if(isCompleted(p)){ _dispBusy=false; showDispConflict(p); return; }
const snap=captureDispSnap(p);
let failed=false;
try{
completePatient(p, kind==='admit'?'Admitted':'Discharged');
if(p.timeline&&p.timeline.length){ const ev=p.timeline[p.timeline.length-1]; ev.meta=(ev.meta?ev.meta+' · ':'')+CURRENT_USER; }
}catch(e){ failed=true; }
setTimeout(function(){
_dispBusy=false;
p=PATIENTS.find(x=>x.id===pid)||p;   /* n252 */
const connBad=(typeof Backend!=='undefined'&&Backend&&Backend.conn==='error');
if(failed||connBad){ restoreDispSnap(p,snap); try{renderAll();}catch(_){}
if(activePatient===p.id) fillDrawer(p); showDispError(p,kind); return; }
if(activePatient===p.id) fillDrawer(p);
showUndo(p, kind, snap);
}, 360);
}, 430);
}
function showDispError(p,kind){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(acts){ acts.classList.remove('mutation-locked'); acts.style.display='';
acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.remove('processing','compress'));
const card=acts.querySelector('.disposition-card.'+kind); if(card) card.classList.add('errored'); }
if(conf){ conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-terminal" style="grid-template-columns:1fr" role="alert"><span class="dc-body"><span class="dc-title" style="color:rgba(232,152,146,.96)">'+(kind==='admit'?'Couldn’t admit · Try again':'Couldn’t discharge · Try again')+'</span><span class="dc-desc">No patient state was changed</span></span></div>'; }
}
function showDispConflict(p){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(acts){ acts.style.display='none'; acts.classList.remove('mutation-locked'); }
if(conf){ conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-conflict" role="alert"><div class="cfl-t">Patient status changed</div><div class="cfl-s">This patient’s disposition was updated on another workstation.</div><button type="button" class="cf-btn go" data-cf="refresh">Refresh state</button></div>'; }
}
/* showUndo · its layers, innermost first: 1 n365 after   (PVX-N387; kept true by flow_t387) */
function showUndo(p,kind,snap){ return pvxRun('showUndo',showUndo$base,this,arguments); }
function showUndo$base(p, kind, snap){
const t=document.getElementById('undoToast'); if(!t) return;
clearTimeout(_dispUndoTimer);
const nm=dispFirstName(p), verb=(kind==='admit'?'admitted':kind==='euthanasia'?'· euthanasia recorded':kind==='died'?'· death recorded':'discharged');
t.innerHTML='<span class="ut-msg">'+pvxEscQ(nm)+' '+verb+'</span><button type="button" class="ut-undo">Undo</button><span class="undo-progress" aria-hidden="true"></span>';
t.classList.remove('open'); void t.offsetWidth; t.classList.add('open');
const undoBtn=t.querySelector('.ut-undo');
if(undoBtn) undoBtn.onclick=function(){
clearTimeout(_dispUndoTimer); hideUndo();
p=(window.fvCurPatient?fvCurPatient(p):p);   /* n252 */
restoreDispSnap(p, snap);
try{ if(typeof rdOnFlowUndo==='function') rdOnFlowUndo(p); }catch(_){}
try{ renderAll(); }catch(_){}
if(activePatient===p.id) fillDrawer(p);
notify('Reverted', pvxEscQ(nm)+' · disposition undone', {icon:'move', color:'var(--accent)'});
};
try{ if(window.pvxUndo&&undoBtn){ var __uo=undoBtn.onclick, __e=pvxUndo.push({label:nm+' '+verb, pid:p.id, undo:function(){ if(!t.classList.contains('open')||!undoBtn.isConnected){ notify('Can’t undo',pvxEscQ(nm)+' '+verb+' · Undo is offered for 5 seconds after',{icon:'info',color:'var(--accent)'}); if(window.pvxSay) pvxSay('Can’t undo: '+nm+' '+verb); return false; } __uo.call(undoBtn); }});
  undoBtn.onclick=function(){ if(!pvxUndo.undoEntry(__e)) __uo.call(undoBtn); }; } }catch(_){}   /* PVX-N350 */
_dispUndoTimer=setTimeout(function(){ hideUndo(); }, 5000);
}
function hideUndo(){ const t=document.getElementById('undoToast'); if(!t) return; t.classList.remove('open');
setTimeout(function(){ if(!t.classList.contains('open')) t.innerHTML=''; }, 240); }
(function initDisposition(){
document.addEventListener('click', function(e){
if(!e.target||!e.target.closest) return;
const cf=e.target.closest('[data-cf]');
if(cf){ const a=cf.dataset.cf;
if(a==='cancel') closeDispConfirm();
else if(a==='go') submitDisp(cf.dataset.kind);
else if(a==='refresh'){ const p=PATIENTS.find(x=>x.id===activePatient); if(p) fillDrawer(p); }
return; }
const card=e.target.closest('.disposition-card');
if(card && card.closest('#dispActions') && !card.hasAttribute('disabled')){ openDispConfirm(card.dataset.disp); }
});
document.addEventListener('keydown', function(e){
if(e.key==='Escape'){ const conf=document.getElementById('dispConfirm');
if(conf && conf.querySelector('.confirmation')){ e.stopPropagation(); closeDispConfirm(); } }
}, true);
})();
