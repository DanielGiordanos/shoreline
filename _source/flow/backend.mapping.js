
let _persistLock = false;

function _toISO(d){ return d ? (d instanceof Date ? d.toISOString() : d) : null; }
function _fromTS(v){ if(!v) return null; if(v instanceof Date) return v; if(typeof v==='string') return new Date(v); if(v && v.toDate) try{ return v.toDate(); }catch(e){} return null; }

// Never use a predictable timestamp or Math.random() for client capabilities.
function genTrackCode(){
  const alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  if(!window.crypto||typeof crypto.getRandomValues!=='function')
    throw new Error('Secure random generator is unavailable');
  let code='';
  const limit=256-(256%alphabet.length);
  while(code.length<6){
    const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);
    for(const b of bytes){if(b<limit&&code.length<6)code+=alphabet[b%alphabet.length];}
  }
  return code;
}
function genToken(){
  if(!window.crypto||typeof crypto.getRandomValues!=='function')
    throw new Error('Secure tracker token generator is unavailable');
  if(typeof crypto.randomUUID==='function') return crypto.randomUUID();
  const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}



function fxVisitEnd(p){   /* how the visit ended, for the family tracker — Rounds outcome first, then Flow's final status */
  const o=p.rounds&&p.rounds.outcome&&p.rounds.outcome.type;
  if(o){ if(o==='Euthanized'||o==='Deceased') return 'loss'; if(o==='Transferred') return 'transferred'; if(o==='Discharged') return 'home'; return 'ended'; }
  if(p.status==='Euthanized'||p.status==='Deceased') return 'loss'; if(p.status==='Discharged') return 'home'; return null; }
function safeProjection(p){
  // Families can review a completed visit for up to 48 hours. Staff can
  // immediately revoke a link using pub.capability_revoked=true, a field
  // deliberately excluded here so later merge writes do not undo revocation.
  const closedAt=p.completed
    ? (p.completedAt && !isNaN(new Date(p.completedAt).getTime())
        ? new Date(p.completedAt) : new Date())
    : null;
  const readExpiresAt=closedAt
    ? new Date(closedAt.getTime()+48*60*60*1000)
    : null;
const docName = (p.doctor && p.doctor!=='unassigned') ? (doc(p.doctor).name||null) : null;
const liaName = p.liaison ? ((liaison(p.liaison)||{}).name||null) : null;
return {
tenant_id: TENANT_ID,
patient_name: ((p.name||'')+' '+(p.last||'')).trim(),
species: p.species||null, breed: p.breed||null, age: formatPatientAge(p)||p.age||null, sex: getSexDisplayLabel(p.sex)||null,
birthday: p.birthday||null, age_estimated: !!p.ageEstimated,
status: p.status||'Waiting', room_id: p.room||null,
doctor: docName, liaison: liaName,
doctor_id: (p.doctor && p.doctor!=='unassigned') ? p.doctor : null,
prio: p.prio||3, priority: p.prio||3, is_active: !p.completed,
arrival_time: _toISO(p.arrival) || new Date().toISOString(),
discharged_at: _toISO(p.completedAt),
access_expires_at: readExpiresAt,
track_code: p.trackCode||null,
visit_end: fxVisitEnd(p),
timeline: (p.timeline||[]).map(function(e){ return { label:e.label, at:_toISO(e.at) }; }),
resus_pref: (p.resusRequest&&p.resusRequest.pref)||p.resusPref||null, resus_status: p.resusRequest?'client_selected':(p.resusStatus||null), resus_recorded_at: p.resusRequest?(p.resusRequest.at||null):_toISO(p.resusRecordedAt),
updated_at: new Date().toISOString()
};
}


function recToDb(r){ if(!r) return null; return {
status:r.status||'not_requested', pdvm:r.pdvm||'', pdvmInfo:r.pdvmInfo||null,
method:r.method||'', note:r.note||'', requestedBy:r.requestedBy||'', requestedAt:_toISO(r.requestedAt),
history:(r.history||[]).map(h=>({ status:h.status, by:h.by, at:_toISO(h.at) })) }; }
function recToApp(r){ if(!r) return null; return {
status:r.status||'not_requested', pdvm:r.pdvm||'', pdvmInfo:r.pdvmInfo||null,
method:r.method||'', note:r.note||'', requestedBy:r.requestedBy||'', requestedAt:r.requestedAt?new Date(r.requestedAt):null,
history:(r.history||[]).map(h=>({ status:h.status, by:h.by, at:h.at?new Date(h.at):new Date() })) }; }

function usToDb(u){ if(!u) return null; return { study:u.study||null, clinicalQuestion:u.clinicalQuestion||'', diagnosticsNotes:u.diagnosticsNotes||'', status:u.status||'incomplete', requestedAt:_toISO(u.requestedAt), createdAt:_toISO(u.createdAt),
requestStatus:u.requestStatus||null, queuePosition:(typeof u.queuePosition==='number')?u.queuePosition:null,
acceptedAt:_toISO(u.acceptedAt), acceptedBy:u.acceptedBy||null, acceptedById:u.acceptedById||null,
startedAt:_toISO(u.startedAt), performingDoctor:u.performingDoctor||null, performingDoctorId:u.performingDoctorId||null,
completedAt:_toISO(u.completedAt), preliminaryFindings:u.preliminaryFindings||'',
criticalFinding:!!u.criticalFinding, critSeenAt:_toISO(u.critSeenAt), critSeenBy:u.critSeenBy||null, doctorDiscussionNeeded:!!u.doctorDiscussionNeeded,
internalMedicineNotes:u.internalMedicineNotes||''}; }
function usToApp(u){ if(!u) return null; return { study:u.study||'Abdominal Ultrasound', clinicalQuestion:u.clinicalQuestion||'', diagnosticsNotes:u.diagnosticsNotes||'', status:u.status||'incomplete', requestedAt:u.requestedAt?new Date(u.requestedAt):null, createdAt:u.createdAt?new Date(u.createdAt):null,
requestStatus:u.requestStatus||null, queuePosition:(typeof u.queuePosition==='number')?u.queuePosition:null,
acceptedAt:u.acceptedAt?new Date(u.acceptedAt):null, acceptedBy:u.acceptedBy||null, acceptedById:u.acceptedById||null,
startedAt:u.startedAt?new Date(u.startedAt):null, performingDoctor:u.performingDoctor||null, performingDoctorId:u.performingDoctorId||null,
completedAt:u.completedAt?new Date(u.completedAt):null, preliminaryFindings:u.preliminaryFindings||'',
criticalFinding:!!u.criticalFinding, critSeenAt:u.critSeenAt?new Date(u.critSeenAt):null, critSeenBy:u.critSeenBy||null, doctorDiscussionNeeded:!!u.doctorDiscussionNeeded,
internalMedicineNotes:u.internalMedicineNotes||''}; }
function mapToDb(p){
return {
id: p.id, tenant_id: TENANT_ID, visit_code: p.hid || null,
patient_name: ((p.name||'') +' '+ (p.last||'')).trim(),
owner_name: p.owner || null, phone_number: p.ownerPhone || null,
species: p.species || null, breed: p.breed || null, age: p.age || null,
birthday: p.birthday || null, age_estimated: !!p.ageEstimated, age_display: p.ageDisplay || null,
weight: p.weight || null, weight_kg: (typeof p.weightKg==='number'? p.weightKg : null), sex: normalizeSexValue(p.sex)||p.sex||null, arrival_type: p.arrivalType || null,
priority: p.prio || 3, status: p.status ||'Waiting', room_id: p.room || null,
doctor_id: (p.doctor && p.doctor !=='unassigned') ? p.doctor : null,
liaison_id: p.liaison || null, reason_for_visit: p.reason || null,
reason_id: p.reasonId || null, reason_category: p.reasonCategory || null,
reason_problems: Array.isArray(p.reasonProblems) ? p.reasonProblems.map(function(x){ return { id:x.id||null, label:x.label||'', category:x.category||null, durationValue:(x.durationValue==null?null:x.durationValue), durationUnit:x.durationUnit||null, durationText:x.durationText||null, frequencyCount:(x.frequencyCount==null?null:x.frequencyCount), frequencyLabel:x.frequencyLabel||null, frequencyText:x.frequencyText||null, onsetText:x.onsetText||null, originalInput:x.originalInput||''}; }) : [],
referring_hospital: p.referringHospital || null, referring_hospital_info: p.referringHospitalInfo || null,
triage: p.triage || null, intake: p.intake || null, records: recToDb(p.records), ultrasound: usToDb(p.ultrasound), rounds: rdToDb(p.rounds), care_team: ctToDb(p.careTeam),
timeline: (p.timeline||[]).map(function(e){ return { label:e.label, at:_toISO(e.at), meta:e.meta||''}; }),
arrival_time: _toISO(p.arrival) || new Date().toISOString(),
discharged_at: _toISO(p.completedAt),
exam_started_at: _toISO(p.examStartedAt), exam_started_by: p.examStartedByDoctorId || null,
exam_wait_min: (typeof p.examWaitMinutes==='number'? p.examWaitMinutes : null),
public_token: p.publicToken || null, track_code: p.trackCode || null,


resus_pref: p.resusPref || null, resus_status: p.resusStatus || null,
resus_recorded_at: _toISO(p.resusRecordedAt), resus_source: p.resusSource || null,
resus_request: (p.resusRequest&&p.resusRequest.pref)?{ pref:p.resusRequest.pref, at:p.resusRequest.at||null }:null, resus_request_dismissed: p.resusRequestDismissed || null,
resus_history: Array.isArray(p.resusHistory) ? p.resusHistory.map(function(h){ return { pref:h.pref||null, source:h.source||null, at:_toISO(h.at), by:h.by||null }; }) : [],
crit_taken_at: _toISO(p.critTakenAt), crit_taken_by: p.critTakenBy || null, crit_taken_uid: p.critTakenUid || null, waiting_on: p.waitingOn || null, stale_keep_until: _toISO(p.staleKeepUntil), ms_roomed_at: _toISO(p.msRoomedAt), ms_doctor_at: _toISO(p.msDoctorAt),
flags: (typeof fgToDb==='function'?fgToDb(p.flags):[]),
ts_sheet: (p.tsSheet&&p.tsSheet.board)?{board:p.tsSheet.board,at:p.tsSheet.at||null}:null, ts_sheet_id: p.tsSheetId||null,
ending: (typeof fvEndingToDb==='function'?fvEndingToDb(p.ending):null),
is_active: !(p.completed===true || p.active===false || p.status==='Discharged'|| p.status==='Admitted'|| p.status==='Euthanized'|| p.status==='Deceased')
};
}
function mapToApp(r){ return fxCleanPatient(_fxMapToApp(r)); }
function _fxMapToApp(r){
const full=(r.patient_name||'').trim();
const arrival = r.arrival_time ? new Date(r.arrival_time) : new Date();
const completedAt = r.discharged_at ? new Date(r.discharged_at) : null;
return {
id:r.id, hid:r.visit_code || ('SH-'+String(r.id).slice(0,4)), tenant:r.tenant_id,
name: full.split(/\s+/)[0]||'', last: full.split(/\s+/).slice(1).join(' '),
owner:r.owner_name||'', ownerPhone:r.phone_number||'',
species:r.species||'', breed:r.breed||'', age:r.age||'', birthday:r.birthday||'', ageEstimated:!!r.age_estimated, ageDisplay:r.age_display||'', weight:r.weight||'', weightKg:(typeof r.weight_kg==='number'?r.weight_kg:null), sex:getSexDisplayLabel(r.sex)||'',
arrivalType:r.arrival_type||'', prio:r.priority||3, status:r.status||'Waiting',
room:r.room_id||'Lobby', doctor:r.doctor_id||'unassigned', liaison:r.liaison_id||null,
reason:r.reason_for_visit||'', reasonId:r.reason_id||null, reasonCategory:r.reason_category||null, reasonProblems: Array.isArray(r.reason_problems)? r.reason_problems : [], referringHospital:r.referring_hospital||'', referringHospitalInfo:r.referring_hospital_info||null,
triage:r.triage||null, intake:r.intake||null, records:recToApp(r.records), ultrasound:usToApp(r.ultrasound), rounds:rdToApp(r.rounds), careTeam:ctToApp(r.care_team),
timeline:(r.timeline||[]).map(function(e){ return { label:e.label, at:e.at? new Date(e.at): new Date(), meta:e.meta||''}; }),
arrival:arrival, completed:!r.is_active, active:r.is_active, completedAt:completedAt, critTakenAt: r.crit_taken_at? new Date(r.crit_taken_at): null, critTakenBy: r.crit_taken_by||null, critTakenUid: r.crit_taken_uid||null, waitingOn: (r.waiting_on&&r.waiting_on.text)?r.waiting_on:null, staleKeepUntil: r.stale_keep_until?new Date(r.stale_keep_until):null, msRoomedAt: r.ms_roomed_at?new Date(r.ms_roomed_at):null, msDoctorAt: r.ms_doctor_at?new Date(r.ms_doctor_at):null, viewing: r.viewing||null, lastBy: r.last_by||null, lastByUid: r.last_by_uid||null, lastAt: r.last_at||null,
examStartedAt: r.exam_started_at? new Date(r.exam_started_at): null, examStartedByDoctorId: r.exam_started_by||null, examWaitMinutes: (typeof r.exam_wait_min==='number'? r.exam_wait_min : null),
totalMin: completedAt ? Math.round((completedAt-arrival)/60000) : undefined, publicToken:r.public_token||null, trackCode:r.track_code||null, admitRequest:(r.admit_request&&r.admit_request.at)?r.admit_request:null, orStatus:(r.or_status&&r.or_status.case)?r.or_status:null, ending:(r.ending&&r.ending.type)?r.ending:null, consentForm:(r.consent_form&&r.consent_form.status)?r.consent_form:null, tsSheet:(r.ts_sheet&&r.ts_sheet.board)?{board:r.ts_sheet.board,at:r.ts_sheet.at||null}:null, tsSheetId:r.ts_sheet_id||null, flags:(typeof fgToApp==='function'?fgToApp(r.flags):[]),
resusPref:r.resus_pref||null, resusStatus:r.resus_status||'not_selected', resusRecordedAt:r.resus_recorded_at?new Date(r.resus_recorded_at):null, resusSource:r.resus_source||null, resusHistory:Array.isArray(r.resus_history)?r.resus_history.map(function(h){ return { pref:h.pref||null, source:h.source||null, at:h.at?new Date(h.at):null, by:h.by||null }; }):[], resusRequest:(r.resus_request&&r.resus_request.pref)?{ pref:r.resus_request.pref, at:r.resus_request.at||null }:null, resusRequestDismissed:r.resus_request_dismissed||null, resusConfirmedBy:r.resus_confirmed_by||null, resusConfirmedAt:r.resus_confirmed_at?new Date(r.resus_confirmed_at):null, tags:[]
};
}
function mapSafeToApp(r){ return fxCleanPatient(_fxMapSafeToApp(r)); }
function _fxMapSafeToApp(r){
const full=(r.patient_name||'').trim();
return { id:r.id||r.public_token, name: full.split(/\s+/)[0]||'', last: full.split(/\s+/).slice(1).join(' '),
species:r.species||'', breed:r.breed||'', age:r.age||'', birthday:r.birthday||'', ageEstimated:!!r.age_estimated, prio:r.prio||r.priority||3, status:r.status||'Waiting',
room:r.room_id||'Lobby', doctor:r.doctor_id||'unassigned', liaison:null,
arrival:r.arrival_time? new Date(r.arrival_time): new Date(), active:r.is_active!==false, completed:r.is_active===false,
timeline:(r.timeline||[]).map(function(e){ return {label:e.label, at:e.at?new Date(e.at):new Date(), meta:''}; }), tags:[] };
}
