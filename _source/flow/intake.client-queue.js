


function normalizeResusPref(v){
if(v==null) return''; const s=String(v).trim().toUpperCase().replace(/[_\-]/g,' ').replace(/\s+/g,' ');
if(s==='CPR'||s==='FULL'||s==='FULL CODE'||s==='FULLCODE'||s==='RESUSCITATE'||s==='YES') return'CPR';
if(s==='DNR'||s==='DNAR'||s==='NO CPR'||s==='DO NOT RESUSCITATE'||s==='NO') return'DNR';
return'';
}
function intakeResus(r){
const o=(r && r.resuscitation && typeof r.resuscitation==='object') ? r.resuscitation : null;
const legacyStr=(r && typeof r.resuscitation==='string') ? r.resuscitation :'';
const pref = normalizeResusPref(o&&o.preference) || normalizeResusPref(r&&r.cpr) ||
normalizeResusPref(r&&r.resuscitationPreference) || normalizeResusPref(r&&r.resuscitationStatus) ||
normalizeResusPref(r&&r.codeStatus) || normalizeResusPref(legacyStr) ||
normalizeResusPref(r&&r.consent && r.consent.cpr);
const at = (o&&o.selectedAt) || (r&&r.resuscitationSelectedAt) || (r&&r.submittedAt) || null;
const source = (o&&o.source) ||'client_checkin';
const authorized = o ? (o.authorizedByClient!==false) : true;
return { pref:pref||'', at:at||null, source:source, authorized:authorized };
}
let apReviewResus='';
function renderAprResus(){
const host=document.getElementById('aprResus'); if(!host) return;
const opts=['CPR','DNR'];
host.innerHTML = opts.map(function(v){ const cls=v==='CPR'?'cpr':'dnr'; const sel=(apReviewResus===v)?' sel':'';
return'<button type="button" class="resus-cap '+cls+' apr-resus-pill'+sel+'" data-resus="'+v+'">'+RESUS_ICON+v+'</button>'; }).join('');
host.querySelectorAll('[data-resus]').forEach(function(b){ b.onclick=function(){ apReviewResus=b.getAttribute('data-resus'); renderAprResus(); }; });
}
function intakeChip(r){
if(r.urgentReview && r.urgentReview.flagged) return {cls:'attn', label:'Needs Attention'};
if(r.toxinWorkflow) return {cls:'toxin', label:'Toxin Exposure'};
return {cls:'new', label:(r.status==='reviewing'?'Reviewing':'New')};
}
function intakeReasonSummary(r){
if(r.structuredProblems && r.structuredProblems.length) return r.structuredProblems.map(p=>p.label||p.name).filter(Boolean).join(', ');
return r.reason||'';
}
function renderClientQueue(){
const host=document.getElementById('cqList'); if(!host) return;
const q=FlowIntakeStore.getPendingIntakes();
q.forEach(r=>{ if(intakeNeedsT9n(r) && !_t9nPromises[r.id]) ensureIntakeTranslated(r.id); });
setNotificationCount('cqCount', q.length);
if(!q.length){ host.innerHTML='<div class="cq-empty">No client check-ins waiting.<br>Submissions from the check-in tablet appear here for review.</div>'; return; }
host.innerHTML=q.map(r=>{
const chip=intakeChip(r); const flag=(r.urgentReview&&r.urgentReview.flagged)||!!r.toxinWorkflow;
const pt=r.patient||{}, cl=r.client||{};
const sp=[pt.species,pt.breed].filter(Boolean).join(' · ');
const owner=[cl.first,cl.last].filter(Boolean).join(' ');
const reason=(r.t9n && r.t9n.status==='translated') ? intakeEnglishReason(r) : intakeReasonSummary(r);
return'<div class="cq-card'+(flag?' flag':'')+'" data-cq="'+pvxEscQ(r.id)+'">'
+'<div class="cq-main"><div class="cq-name">'+pvxEscQ(pt.name||'Unnamed')+'</div>'
+(sp?'<div class="cq-sub">'+pvxEscQ(sp)+'</div>':'')
+(owner?'<div class="cq-owner">'+pvxEscQ(owner)+'</div>':'')
+(reason?'<div class="cq-reason">'+pvxEscQ(reason)+'</div>':'')
+'<div class="cq-time">Submitted '+pvxEscQ(intakeTimeAgo(r.submittedAt))+'</div></div>'
+'<div class="cq-right"><span class="cq-chip '+chip.cls+'">'+chip.label+'</span>'
+'<button class="cq-review" data-cqr="'+pvxEscQ(r.id)+'">Review</button></div></div>';
}).join('');
host.querySelectorAll('[data-cqr]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openIntakeReview(b.getAttribute('data-cqr')); });
host.querySelectorAll('.cq-card').forEach(c=>c.onclick=()=>openIntakeReview(c.getAttribute('data-cq')));
}




function calculateAgeFromDOB(dob){
const empty={years:0,months:0,totalDays:null,display:''};
if(!dob) return empty;
let y,mo,d; const m=String(dob).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
if(m){ y=+m[1]; mo=+m[2]; d=+m[3]; }
else { const dt=new Date(dob); if(isNaN(dt)) return empty; y=dt.getFullYear(); mo=dt.getMonth()+1; d=dt.getDate(); }
if(!y||!mo||!d) return empty;
const ref=(typeof now!=='undefined'&& now instanceof Date)?now:new Date();
const cy=ref.getFullYear(), cm=ref.getMonth()+1, cd=ref.getDate();
const birth=new Date(y,mo-1,d), today=new Date(cy,cm-1,cd);
if(birth.getTime()>today.getTime()) return empty;
const totalDays=Math.round((today.getTime()-birth.getTime())/86400000);
let years=cy-y, months=cm-mo;
if(cd<d) months-=1;
if(months<0){ years-=1; months+=12; }
if(years<0) return empty;
let display;
if(years>0 || months>0){
const yl=years+' Year'+(years===1?'':'s'), ml=months+' Month'+(months===1?'':'s');
display=(years>0&&months>0)?(yl+' '+ml):(years>0?yl:ml);
} else if(totalDays>=7){
const wk=Math.floor(totalDays/7); display=wk+' Week'+(wk===1?'':'s');
} else {
display=totalDays+' Day'+(totalDays===1?'':'s');
}
return {years:years,months:months,totalDays:totalDays,display:display};
}
function flowApproxAgeDisplay(value,unit){
const n=Number(value); if(!n||n<0) return'';
unit=String(unit||'years').toLowerCase();
if(unit.indexOf('month')>=0) return n+' Month'+(n===1?'':'s');
if(unit.indexOf('week')>=0)  return n+' Week'+(n===1?'':'s');
if(unit.indexOf('day')>=0)   return n+' Day'+(n===1?'':'s');
return n+' Year'+(n===1?'':'s');
}
 
function normalizeAgeString(s){
if(s==null) return'';
s=String(s).trim(); if(!s) return'';
if(/^\d{4}-\d{1,2}-\d{1,2}/.test(s)){ const a=calculateAgeFromDOB(s); if(a.display) return a.display; }
return s.replace(/\s*[,·•]\s*/g,' ').replace(/\s+/g,' ').trim();
}
 
function pvxDot(){ return [].slice.call(arguments).map(function(x){ return String(x==null?'':x).trim(); }).filter(Boolean).join(' · '); }   /* PVX-N353 */
function formatPatientAge(p){
if(!p) return'';
if(p.birthday && !p.ageEstimated){ const a=calculateAgeFromDOB(p.birthday); if(a.display) return a.display; }
return normalizeAgeString(p.ageDisplay || p.age ||'');
}
function patientAgeDisplay(p){ return formatPatientAge(p); }
function openIntakeReview(id){
const r0=FlowIntakeStore.getIntake(id); if(!r0){ toast('Intake no longer available'); renderClientQueue(); return; }
openAddPatient();
apReviewIntakeId=id;
const M=document.getElementById('apModal'); M.classList.add('review-mode');
document.querySelector('#apModal .aph-t').textContent='Review client check-in';
document.querySelector('#apModal .aph-sub').textContent='Confirm the client-entered details, then assign a medical priority.';
document.getElementById('apCreate').textContent='Complete check-in';
apSetPrio(null);
_populateIntakeReview(id);

if(intakeNeedsT9n(r0)){ ensureIntakeTranslated(id).then(()=>{ if(apReviewIntakeId===id) _populateIntakeReview(id); }); }
}
function _populateIntakeReview(id){
const r=FlowIntakeStore.getIntake(id); if(!r) return;
const pt=r.patient||{}, cl=r.client||{};
const setv=(fid,v)=>{ const el=document.getElementById(fid); if(el) el.value=(v==null?'':v); };
setv('apName', pt.name); setv('apSpecies', speciesEnglish(pt.species)||pt.species); setv('apBreed', pt.breed);


let ageStr='';
if(pt.birthday && !pt.birthdayEstimated) ageStr=calculateAgeFromDOB(pt.birthday).display;
else if(pt.approximateAge && pt.approximateAge.value) ageStr=flowApproxAgeDisplay(pt.approximateAge.value, pt.approximateAge.unit);
else ageStr=pt.age||'';
setv('apAge', ageStr); setv('apSex', getSexDisplayLabel(pt.sex||pt.sexDisplay)); setv('apWeight', pt.weight);
setv('apOwner', [cl.first,cl.last].filter(Boolean).join(' ')); setv('apPhone', cl.phone);

const engReason=intakeEnglishReason(r);
apProblems = splitComplaints(engReason).map(parseProblem).filter(Boolean);
renderProblemChips();

document.getElementById('aprReason').textContent = engReason || r.clientStatement ||'—';
const noteEl=document.getElementById('aprT9n'), noteTx=document.getElementById('aprT9nText'),
tog=document.getElementById('aprT9nToggle'), origEl=document.getElementById('aprReasonOrig');
const t9n=r.t9n||{};
if(t9n.status==='translated'){
noteEl.style.display=''; noteTx.textContent='Translated from '+langEnglishName(t9n.sourceLanguage)+' · ';
tog.style.display=''; tog.textContent='View original'; origEl.style.display='none';
origEl.textContent=intakeOriginalReason(r);
tog.onclick=()=>{ const show=origEl.style.display==='none'; origEl.style.display=show?'':'none'; tog.textContent=show?'Hide original':'View original'; };
} else if(t9n.status==='failed'){
noteEl.style.display=''; noteTx.textContent='Translation unavailable — showing original text'; tog.style.display='none'; origEl.style.display='none';
} else if(intakeNeedsT9n(r)){
noteEl.style.display=''; noteTx.textContent='Translating from '+langEnglishName(intakeSourceLang(r))+'…'; tog.style.display='none'; origEl.style.display='none';
} else { noteEl.style.display='none'; origEl.style.display='none'; }
const flagEl=document.getElementById('aprFlag');
if(r.urgentReview && r.urgentReview.flagged){ flagEl.style.display='';
document.getElementById('aprFlagText').textContent=(r.urgentReview.reasons&&r.urgentReview.reasons.length? r.urgentReview.reasons.join(', ') :'Client answer may describe a problem that needs staff review.'); }
else flagEl.style.display='none';
const tx=r.toxinWorkflow, txEl=document.getElementById('aprToxin');
if(tx){ txEl.style.display='';
document.getElementById('aprToxMed').textContent=tx.medication||'—';
document.getElementById('aprToxStrength').textContent=tx.strength||'—';
document.getElementById('aprToxAmount').textContent=tx.amount||'—';
document.getElementById('aprToxTime').textContent=tx.exposureTime||'—'; }
else txEl.style.display='none';
apReviewResus = intakeResus(r).pref;
renderAprResus();
document.getElementById('aprStab').textContent=r.stabilization||'—';
document.getElementById('aprSigned').textContent = r.submittedAt ? ('Yes · '+new Date(r.submittedAt).toLocaleString()) :'—';
}
function completeIntakeReview(){
apFormatFields();
const val=id=>{const el=document.getElementById(id); return el?el.value.trim():'';};
const name=val('apName');
if(!name){ toast('Enter a patient name'); return; }
if(!val('apSpecies')){ toast('Choose a species'); return; }
if(!val('apBreed')){ toast('Enter a breed'); return; }
if(!val('apAge')){ toast('Enter a date of birth or an approximate age'); return; }
if(!val('apSex')){ toast('Choose the sex'); return; }
if(!val('apOwner')){ toast('Enter the owner name'); return; }
if(val('apPhone').replace(/\D/g,'').length<10){ toast('Enter a full phone number'); return; }
{ const rin=document.getElementById('apReason'); if(rin && rin.value.trim()){ splitComplaints(rin.value.trim()).forEach(seg=>apProblems.push(parseProblem(seg))); rin.value=''; } }
if(!apProblems.length){ toast('Enter a reason for visit'); return; }
if(apPrio==null){ toast('Choose a priority: P1, P2 or P3'); return; }
const id=apReviewIntakeId;
const r=FlowIntakeStore.getIntake(id)||{};
const parts=name.split(/\s+/); const first=parts.shift(); const last=parts.join(' ');
const at=new Date();
const room=apLocation||'Lobby';
const rp=r.patient||{};
const exactDOB=(rp.birthday && !rp.birthdayEstimated)?rp.birthday:'';
const fields={
name:first, last:last, species:val('apSpecies')||'—', age:val('apAge')||'—', breed:val('apBreed')||'—',
birthday: exactDOB, ageEstimated: !exactDOB, ageDisplay: val('apAge')||'',
owner:val('apOwner')||'—', ownerPhone:val('apPhone'), sex:val('apSex'),
weight:val('apWeight'), weightKg:(parseWeightInput(val('apWeight')).kg||null),
reason: problemsToString(apProblems), reasonProblems: apProblems.slice(),
reasonId: apProblems[0]?(apProblems[0].id||null):null, reasonCategory: apProblems[0]?(apProblems[0].category||null):null,
doctor:apDoctorId, liaison:null, room:room, status:'Waiting', prio:apPrio, arrival:at, arrivalType:'walkin',



clientIntake: r, source:'client-checkin',


reasonTranslation: r.t9n || null, sourceLanguage: intakeSourceLang(r),
timeline:[
{label:'Client self check-in completed', at:new Date(r.submittedAt||at), meta:'Client Check-In'+(r.id?(' · '+r.id):'')},
{label:'CSR review completed', at:at, meta:'Reception confirmed the intake'},
{label:'Priority assigned: P'+apPrio, at:at, meta:'Triaged P'+apPrio+(PRIO[apPrio]?(' · '+PRIO[apPrio].l):'')},
{label:'Checked in', at:at, meta:'Walk-in · triaged P'+apPrio}
]
};


const cr=intakeResus(r);
const finalPref=normalizeResusPref(apReviewResus) || cr.pref;
if(finalPref){
const changed = !!cr.pref && finalPref!==cr.pref;
fields.resusPref=finalPref;
fields.resusStatus='client_selected';
fields.resusSource = changed ?'csr_modified': (cr.source||'client_checkin');
fields.resusRecordedAt = (!changed && cr.at) ? new Date(cr.at) : at;
const hist=[];
if(cr.pref) hist.push({ pref:cr.pref, source:cr.source||'client_checkin', at:_toISO(cr.at||r.submittedAt||at) });
if(changed) hist.push({ pref:finalPref, source:'csr_modified', at:_toISO(at), by:null });
fields.resusHistory=hist;
fields.timeline.push({ label:'Resuscitation preference: '+finalPref,
at:(fields.resusRecordedAt||at),
meta: changed ? ('Client selected '+cr.pref+' · CSR changed to '+finalPref+' during review')
:'Owner selected during client check-in'});
}
const fin=()=>{ apReviewIntakeId=null; apReviewResus=''; commitPatient(fields); FlowIntakeStore.completeIntake(id); };
if(fxDupAsk(fields,fin)) return;   /* already checked in? */
fin();
}
