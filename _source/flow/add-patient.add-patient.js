
/* openAddPatient · its layers, innermost first: 1 #21 wrap · 2 n193 after · 3 n253-admit after   (PVX-N387; kept true by flow_t387) */
function openAddPatient(){ return pvxRun('openAddPatient',openAddPatient$base,this,arguments); }
function openAddPatient$base(){
apArrivalType='walkin'; apPrio=2; apDoctorId='unassigned'; apLocation='Lobby';
apReviewIntakeId=null;
{ const M=document.getElementById('apModal'); if(M) M.classList.remove('review-mode');
const t=document.querySelector('#apModal .aph-t'); if(t) t.textContent='Add new patient';
const s=document.querySelector('#apModal .aph-sub'); if(s) s.textContent='';
const cb=document.getElementById('apCreate'); if(cb) cb.textContent='Create patient'; }
apProblems=[]; _rpBackspaceArmed=false;
ensureReasonAutocomplete();
if(_rvCtrl) _rvCtrl.close();
renderProblemChips();
apRefHospObj=null; ensureHospitalAutocompletes();
apWeightKg=null; { const wh=document.getElementById('apWeightHint'); if(wh) wh.classList.remove('show'); }
['apName','apSpecies','apBreed','apAge','apSex','apWeight','apOwner','apPhone','apReason','apRefHosp','apTransferNotes']
.forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
document.querySelectorAll('#apArrival .ap-seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.arrival==='walkin'));
document.getElementById('apTransfer').style.display='none';
document.getElementById('apHospNote').style.display='none';
apSetPrio(2);
apMountDoctor();
const lm=document.getElementById('apLocationMount'); lm.style.opacity=''; lm.style.pointerEvents='';
apMountLocation();
breedClose(); rhClose(); sxClose();
document.getElementById('apScrim').classList.add('open');
document.getElementById('apModal').classList.add('open');
setTimeout(()=>{const n=document.getElementById('apName'); if(n) n.focus();},120);
}
function closeAddPatient(){
document.getElementById('apScrim').classList.remove('open');
document.getElementById('apModal').classList.remove('open');
}


/* commitPatient · its layers, innermost first: 1 #9 wrap · 2 n371 before · 3 n375 after   (PVX-N387; kept true by flow_t387) */
function commitPatient(fields){ return pvxRun('commitPatient',commitPatient$base,this,arguments); }
function commitPatient$base(fields){
fields=fxCleanPatient(Object.assign({},fields));   /* flow-round2-oct6: no control or invisible override characters */
const p = patient(fields);
PATIENTS.push(p);
if(p.status==='Hospitalized'){ try{ rdEnroll(p); }catch(e){} }   /* a direct admit is on Rounds from the start */
closeAddPatient();
renderAll();
const full=((fields.name||'')+(fields.last?' '+fields.last:'')).trim();
notify(pvxEscQ(full)+' added successfully',
'Priority P'+fields.prio+' · '+(fields.status==='Hospitalized'?'In Treatment':'Awaiting assignment'),
{icon:'discharge', color:'var(--s-admitted)'});
const pid=p.id;
const flash=()=>{ document.querySelectorAll('[data-pid="'+pid+'"]').forEach(el=>{
el.classList.remove('just-added'); void el.offsetWidth; el.classList.add('just-added');
setTimeout(()=>el.classList.remove('just-added'),750); }); };
RAF ? RAF(()=>RAF(flash)) : flash();
return p;
}
function createPatient(){
if(apReviewIntakeId) return completeIntakeReview();
apFormatFields();
const val=id=>{const el=document.getElementById(id); return el?el.value.trim():'';};
const name=val('apName');
if(!name){ toast('Enter a patient name'); const n=document.getElementById('apName'); if(n) n.focus(); return; }
const parts=name.split(/\s+/); const first=parts.shift(); const last=parts.join(' ');
if(apArrivalType==='hospitalized'&&window.pvxCanAdmit&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }   /* n253: a direct admit is an admission */
let room, status;
if(apArrivalType==='hospitalized'){ room='Treatment'; status='Hospitalized'; }
else { room = apLocation ||'Lobby'; status='Waiting'; }
const arrivalLabel = apArrivalType==='transfer'?'ER transfer': (apArrivalType==='hospitalized'?'Direct admit':'Walk-in');
const at=new Date();

{ const rin=document.getElementById('apReason'); if(rin && rin.value.trim()){ splitComplaints(rin.value.trim()).forEach(function(seg){ apProblems.push(parseProblem(seg)); }); rin.value=''; } }
const reasonStr = apProblems.length ? problemsToString(apProblems) :'Reason not specified';
fxCommitChecked({
name:first, last:last, species:val('apSpecies')||'—', age:val('apAge')||'—',
birthday:'', ageEstimated:true, ageDisplay:(val('apAge')||''),
breed:val('apBreed')||'—', owner:val('apOwner')||'—', ownerPhone:val('apPhone'),
sex:val('apSex'), weight:val('apWeight'), weightKg:(parseWeightInput(val('apWeight')).kg||null),
reason: reasonStr,
reasonProblems: apProblems.slice(),
reasonId: apProblems.length ? (apProblems[0].id||null) : null,
reasonCategory: apProblems.length ? (apProblems[0].category||null) : null,
doctor:apDoctorId, liaison:null,
room:room, status:status, prio:apPrio, arrival:at, arrivalType:apArrivalType,
referringHospital: apArrivalType==='transfer'?val('apRefHosp'):'',
referringHospitalInfo: (apArrivalType==='transfer'&& apRefHospObj && apRefHospObj.name===val('apRefHosp')) ? apRefHospObj : null,
transferNotes: apArrivalType==='transfer'?val('apTransferNotes'):'',
timeline: apArrivalType==='hospitalized'
? [ {label:'Checked in', at:at, meta:arrivalLabel+' · triaged P'+apPrio}, {label:'Admitted to Treatment', at:at, meta:'Hospitalized'} ]
: [ {label:'Checked in', at:at, meta:arrivalLabel+' · triaged P'+apPrio} ]
});
}

 
function intakeTimeAgo(iso){ const s=Math.max(0,(Date.now()-new Date(iso).getTime())/1000);
if(s<60) return Math.round(s)+' sec ago'; const m=s/60; if(m<60) return Math.round(m)+' min ago';
const h=m/60; if(h<24) return Math.round(h)+' hr ago'; return Math.round(h/24)+' d ago'; }
