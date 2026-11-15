








 


const RD_SERVICES=[
{key:'ecc',    label:'Emergency & Critical Care'},
{key:'im',     label:'Internal Medicine'},
{key:'neuro',  label:'Neurology'},
{key:'onco',   label:'Oncology'},
{key:'surgery',label:'Surgery'}
];
function rdSvc(key){ return RD_SERVICES.find(s=>s.key===key) || RD_SERVICES[0]; }



const RD_LOCATIONS=['ICU','Wards','Isolation'];

const RD_ACUITY={
critical: {label:'Critical',        color:'var(--priority-p1)'},
attention:{label:'Attention',       color:'var(--amber)'},
stable:   {label:'Stable',          color:'#4F9AD6'},
discharge:{label:'Discharge ready', color:'var(--s-admitted)'}
};


 
const RD_ADMIT_TYPES={clinical:'Clinical',medboard:'Med board',boarding:'Boarding',shelter:'Shelter / ACO'};


const RD_SERIES_META={pcv:{label:'PCV/TS',pair:true},na:{label:'Na'},k:{label:'K'},bg:{label:'BG'},bp:{label:'BP'},o2:{label:'O₂',unit:'%'},lac:{label:'Lac'},temp:{label:'Temp'},hr:{label:'HR'},rr:{label:'RR'}};
 



 





 
function rdId(){ return'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function rdIso(d){ return (d instanceof Date? d : new Date(d)).toISOString(); }
function rdDate(v){ return v ? (v instanceof Date? v : new Date(v)) : null; }
/* PVX-N143-RD (RD-04): hospital-time clock, the day when it isn't today, the zone when this device is elsewhere */
function rdTZ(){ try{ return HOSP_TZ||'America/New_York'; }catch(e){ return 'America/New_York'; } }
const _rdF={}; function rdFmt(k,o){ const z=rdTZ(), key=k+'|'+z; return _rdF[key]||(_rdF[key]=new Intl.DateTimeFormat('en-US',Object.assign({timeZone:z},o))); }
function rdClock(d){ try{ return rdFmt('clock',{hour:'numeric',minute:'2-digit'}).format(d).replace(/\u202f/g,' '); }catch(e){ return fmtTime(d); } }
let _rdLocalTz=null; function rdTzTag(d){ try{ if(_rdLocalTz==null) _rdLocalTz=Intl.DateTimeFormat().resolvedOptions().timeZone; if(_rdLocalTz===rdTZ()) return ''; const p=rdFmt('zone',{timeZoneName:'short'}).formatToParts(d).find(x=>x.type==='timeZoneName'); return p?' '+p.value.replace(/^E[DS]T$/,'ET'):''; }catch(e){ return ''; } }
function rdDaysAgo(d){ try{ return Math.round((Date.parse(_hospDayKey(new Date()))-Date.parse(_hospDayKey(d)))/864e5); }catch(e){ return 0; } }
function rdDayWord(d){ const n=rdDaysAgo(d); if(n===0) return 'today'; if(n===1) return 'yesterday'; if(n===-1) return 'tomorrow';
  return rdFmt('md',{month:'short',day:'numeric'}).format(d); }
function rdT(v){ const d=rdDate(v); if(!d) return '—'; const n=rdDaysAgo(d); return rdClock(d)+rdTzTag(d)+(n===0?'':' '+rdDayWord(d)); }

 


function rdDayKey(v){ return _hospDayKey(rdDate(v)||new Date()); }

function rdDayNum(p){ const r=p.rounds; if(!r||!r.admittedAt) return 1;
const a=new Date(rdDayKey(r.admittedAt)+'T00:00:00'), b=new Date(rdDayKey(new Date())+'T00:00:00');
return Math.max(1, Math.round((b-a)/86400000)+1); }
function rdCap(s){ s=String(s||'').trim(); return s? s.charAt(0).toUpperCase()+s.slice(1) : s; }
function rdFullName(p){ return (p.name+' '+(p.last||'')).trim(); }




const RD_ACTOR_KEY='pravix:'+TENANT_ID+':rounds:actor:v1';
let rdActorId=null; 
function rdAllDoctors(){
const seen={}, out=[];
DOCTORS.concat(IM_DOCTORS).forEach(d=>{ if(!seen[d.id]){ seen[d.id]=1; out.push(d); } });
return out;
}
function rdActor(){ return rdAllDoctors().find(d=>d.id===rdActorId)||null; }
function rdActorName(){ const d=rdActor(); return d? drName(d.name) : CURRENT_USER; }



const RD_QUEUE_KEY='pravix:'+TENANT_ID+':rounds:tomorrow:v1';

let rdQueues={recheck:[],dropoff:[],opus:[]};

function rdSaveQueues(){ try{ localStorage.setItem(RD_QUEUE_KEY,JSON.stringify(rdQueues)); }catch(e){} }


 
function rdShiftAuto(d){ const h=(d||new Date()).getHours(); return (h>=5&&h<13)?'morning':(h>=13&&h<21)?'evening':'overnight'; }
let rdShift=rdShiftAuto(), rdShiftSeen=rdShift;
/* Oct 2026 — the rounds day starts at 5 AM, so the overnight shift's reviews, done tasks and "ended today" stay put at midnight.
   The shift follows the clock: a shift picked by hand holds until the next shift starts. */
function rdRoundsDay(v){ const d=rdDate(v)||new Date(); return _hospDayKey(new Date(d.getTime()-5*3600000)); }
function rdReviewKey(){ return rdRoundsDay(new Date())+':'+rdShift; }

function rdReviewed(p){ const r=p.rounds; return (r&&r.review&&r.review[rdReviewKey()])||null; }

 
function rdAudit(p,what){
const r=p.rounds; if(!r) return;
r.audit=(r.audit||[]).concat([{at:rdIso(new Date()),by:rdActorName(),what:what}]).slice(-200);
}

/* rdTouch · its layers, innermost first: 1 #23 after   (PVX-N387; kept true by flow_t387) */
function rdTouch(p,what,skipSnapshot){ return pvxRun('rdTouch',rdTouch$base,this,arguments); }
function rdTouch$base(p,what,skipSnapshot){
if(p&&what) rdAudit(p,what);
if(p&&p.rounds&&!skipSnapshot) rdSnapshotToday(p);
window.__rdWaitSince=Date.now(); if(typeof rdSaveState==='function') rdSaveState('saving');   /* PVX-N148: "Saved" waits for the server (see pvx:persist) */
renderAll();
}

 
function rdNorm(r){
if(!r) return null;
const iso=v=>{ if(!v) return null; try{ return (v instanceof Date)? v.toISOString() : String(v); }catch(e){ return null; } };
return {
admittedAt:iso(r.admittedAt), admittedBy:r.admittedBy||null, admittedById:r.admittedById||null,
enrolledBy:r.enrolledBy||null, admittingService:r.admittingService||null,
service:r.service||'ecc', location:r.location||null, locSheet:r.locSheet||null,
acuity:r.acuity||'stable', newAdmit:!!r.newAdmit, rank:(typeof r.rank==='number'&&isFinite(r.rank))?r.rank:null, rankSec:(typeof r.rankSec==='string'&&r.rankSec)?r.rankSec:null,
admitType:RD_ADMIT_TYPES[r.admitType]?r.admitType:'clinical',
assessment:r.assessment||'',
clientId:r.clientId?String(r.clientId):null, petId:(r.petId||r.employeeId)?String(r.petId||r.employeeId):null,


care:(r.care||[]).map(c=>({id:c.id||rdId(),docId:c.docId||null,name:c.name||'',at:iso(c.at),by:c.by||null})),


next:r.next&&r.next.docId?{docId:r.next.docId,name:r.next.name||null,at:iso(r.next.at),by:r.next.by||null}:null,
problems:(r.problems||[]).map(x=>({id:x.id||rdId(),label:x.label||'',active:x.active!==false,resolvedAt:iso(x.resolvedAt)})),
events:(r.events||[]).map(x=>({id:x.id||rdId(),at:iso(x.at),text:x.text||'',by:x.by||null,kind:x.kind||'clinical'})),
diagnostics:(r.diagnostics||[]).map(x=>({id:x.id||rdId(),name:x.name||'',result:x.result||'',status:x.status||'pending',at:iso(x.at),due:x.due||null,discussed:!!x.discussed,createdAt:iso(x.createdAt)})),
treatments:(r.treatments||[]).map(x=>Object.assign({id:x.id||rdId(),name:x.name||'',detail:x.detail||''},x.oid?{oid:String(x.oid)}:{},x.g?{g:String(x.g),main:x.main||'',kg:x.kg||'',sub:x.sub||''}:{})),   /* oid: the sheet order it mirrors (n116) */
tasks:(r.tasks||[]).map(x=>({id:x.id||rdId(),label:x.label||'',due:x.due||null,assignee:x.assignee||null,status:x.status||'pending',doneAt:iso(x.doneAt),doneBy:x.doneBy||null,urgent:!!x.urgent,createdAt:iso(x.createdAt)})),
contingencies:(r.contingencies||[]).map(c=>({id:c.id||rdId(),trigger:c.trigger||'',action:c.action||'',active:c.active!==false,by:c.by||null,at:iso(c.at)})),
flags:(r.flags||[]).map(f=>({id:f.id||rdId(),label:f.label||'',kind:f.kind||'safety'})),
series:(function(){ const src=r.series||{}, out={}; Object.keys(src).forEach(k=>{ if(!RD_SERIES_META[k]) return;
out[k]=(src[k]||[]).map(pt=>({at:iso(pt.at),v:(pt.v==null?null:+pt.v),v2:(pt.v2==null?null:+pt.v2)})); }); return out; })(),
auth:r.auth?{
hours:(r.auth.hours||[]).map(x=>({h:(+x.h||0),at:iso(x.at),by:x.by||null})),
estimate:(r.auth.estimate==null?null:+r.auth.estimate), estimateLow:(r.auth.estimateLow==null?null:+r.auth.estimateLow), deposited:(r.auth.deposited==null?null:+r.auth.deposited), bill:(r.auth.bill==null?null:+r.auth.bill),
cubexDob:!!r.auth.cubexDob,
payers:(r.auth.payers||[]).map(String),
approvals:(r.auth.approvals||[]).map(a=>({id:a.id||rdId(),amount:(a.amount==null?null:+a.amount),scope:a.scope||'',method:a.method||'verbal',by:a.by||null,at:iso(a.at)}))
}:null,
usSyncedAt:r.usSyncedAt?String(r.usSyncedAt):null,
comms:r.comms?{lastAt:iso(r.comms.lastAt),lastBy:r.comms.lastBy||null,next:r.comms.next||null,intervalH:(typeof r.comms.intervalH==='number'?r.comms.intervalH:12),
window:r.comms.window||null,channel:r.comms.channel||null,translator:r.comms.translator||null}:{lastAt:null,lastBy:null,next:null,intervalH:12,window:null,channel:null,translator:null},
discharge:r.discharge?{likely:r.discharge.likely||'not_today',checklist:Array.isArray(r.discharge.checklist)?r.discharge.checklist.map(c=>({id:c.id||rdId(),label:c.label||'',done:!!c.done})):null}:{likely:'not_today',checklist:null},
summary:r.summary?{text:r.summary.text||'',generatedAt:iso(r.summary.generatedAt),edited:!!r.summary.edited,accepted:!!r.summary.accepted}:null,
review:r.review||{},
lastReviewSnapshot:r.lastReviewSnapshot||null,
snapshots:r.snapshots||{},
handoff:r.handoff?{note:r.handoff.note||'',preparedAt:iso(r.handoff.preparedAt),preparedBy:r.handoff.preparedBy||null,reviewedBy:r.handoff.reviewedBy||null,reviewedAt:iso(r.handoff.reviewedAt)}:null,
financial:r.financial?{estimate:(r.financial.estimate==null?null:r.financial.estimate),deposited:(r.financial.deposited==null?null:r.financial.deposited),bill:(r.financial.bill==null?null:r.financial.bill)}:null,
outcome:r.outcome?{type:r.outcome.type,at:iso(r.outcome.at),by:r.outcome.by||null}:null,
audit:(r.audit||[]).slice(-200).map(a=>({at:iso(a.at),by:a.by||'',what:a.what||''}))
};
}
function rdToDb(r){ return rdNorm(r); }
function rdToApp(r){ return rdNorm(r); }



function rdActive(){
return PATIENTS.filter(p=>(p.status==='Admitted'||p.status==='Hospitalized')&& p.rounds && !p.rounds.outcome)
.sort((a,b)=>rdDate(b.rounds.admittedAt)-rdDate(a.rounds.admittedAt));
}
function rdCensus(){ return rdActive().filter(p=>(p.rounds.admitType||'clinical')==='clinical'); }


function rdPendingItems(p){
const r=p.rounds, out=[];
(r.diagnostics||[]).forEach(d=>{ if(d.status==='pending') out.push({kind:'diag',id:d.id,label:d.name,due:d.due||'Pending result'}); });
(r.tasks||[]).forEach(t=>{ if(t.status!=='done') out.push({kind:'task',id:t.id,label:t.label,due:t.due||'',urgent:t.urgent,assignee:t.assignee}); });
return out;
}
function rdOwnerDue(p){
const c=p.rounds.comms||{}; const hrs=(typeof c.intervalH==='number'?c.intervalH:12);
const ref=rdDate(c.lastAt)||rdDate(p.rounds.admittedAt); if(!ref) return null;
const over=(Date.now()-ref.getTime())/3600000 - hrs;
return over>0 ? fmtWait(Math.round(over*60)) : null;
}
function rdLikely(p){ const d=p.rounds.discharge||{}; return d.likely==='likely'||d.likely==='possible'; }





function rdDoc(id){ if(!id||id==='unassigned') return null; return rdAllDoctors().find(d=>d.id===id)||null; }
function rdDocShort(id){ const d=rdDoc(id); return d?drName(d.name):null; }
function rdCareList(p){ return (p.rounds&&p.rounds.care)||[]; }
function rdCareCurrent(p){ const c=rdCareList(p); return c.length?c[c.length-1]:null; }

function rdCareName(entry){ if(!entry) return null;
if(entry.docId){ const n=rdDocShort(entry.docId); if(n) return n; }
return entry.name||null; }



 



function rdCurrentDocId(p){
if(p.doctor&&p.doctor!=='unassigned') return p.doctor;
const c=rdCareCurrent(p); return c?c.docId:null;
}
function rdCurrentDocName(p){
const id=rdCurrentDocId(p); if(id) return rdDocShort(id);
const c=rdCareCurrent(p); return c?rdCareName(c):null;
}
 
function rdNextDocId(p){ const n=p.rounds&&p.rounds.next; return n?n.docId:null; }
function rdNextDocName(p){ const id=rdNextDocId(p); if(!id) return null;
return rdDocShort(id)||((p.rounds.next||{}).name||null); }










function rdAuth(p){
const r=p.rounds;
if(!r.auth){
r.auth={hours:[],
estimate:(r.financial&&r.financial.estimate!=null)?r.financial.estimate:null,
deposited:(r.financial&&r.financial.deposited!=null)?r.financial.deposited:null,
bill:null,cubexDob:false,payers:[],approvals:[]};
}
return r.auth;
}


function rdAuthRead(p){ return (p&&p.rounds&&p.rounds.auth)||null; }
function rdAuthHours(p){ const a=rdAuthRead(p); return a?(a.hours||[]).reduce((s,x)=>s+(+x.h||0),0):0; }







var RD_AUTH_SOON_H=12;   /* flow-round2-oct6: one "expiring" cutoff for the panel, the chips, the summary and the handoff */

function rdAuthState(p){
const total=rdAuthHours(p); if(!total) return null;
const elapsed=(Date.now()-rdDate(p.rounds.admittedAt).getTime())/3600000;
const remaining=total-elapsed;
return {total:total,elapsed:elapsed,remaining:remaining,status:remaining<0?'over':(remaining<=RD_AUTH_SOON_H?'expiring':'ok')};
}






 
function rdSeriesAdd(p,key,v,v2){
const r=p.rounds; r.series=r.series||{};
(r.series[key]=r.series[key]||[]).push({at:rdIso(new Date()),v:(v==null?null:+v),v2:(v2==null?null:+v2)});
if(r.series[key].length>40) r.series[key]=r.series[key].slice(-40);
}




function rdDefaultService(p){
if(p.doctor && p.doctor!=='unassigned'&& IM_DOCTORS.some(d=>d.id===p.doctor)) return'im';
return'ecc';
}
function rdNormLoc(raw){


const t=String(raw||'').trim();
if(/^iso/i.test(t)) return'Isolation';
if(/^ward/i.test(t)) return'Wards';
if(/^icu/i.test(t)) return'ICU';
return RD_LOCATIONS.indexOf(t)>=0 ? t :'';
}
function rdDefaultLocation(p){
return rdNormLoc((p.rounds&&p.rounds.location)||p.room||'');
}
function rdSeedProblems(p){
const seen={};
return (p.reasonProblems||[]).filter(pr=>pr&&pr.label).map(pr=>{
const label=rdCap(pr.label); if(seen[label.toLowerCase()]) return null; seen[label.toLowerCase()]=1;
return {id:rdId(),label:label,active:true,resolvedAt:null};
}).filter(Boolean);
}
function rdSeedDiagnostics(p){
const out=[];
const u=p.ultrasound;
if(u&&u.status){
if(u.requestStatus==='completed'||u.completedAt){
out.push({id:rdId(),name:u.study||'Abdominal Ultrasound',result:u.preliminaryFindings||'Completed',status:'completed',at:rdIso(u.completedAt||new Date()),due:null});
}else if(u.status==='requested'||u.requestStatus){
out.push({id:rdId(),name:u.study||'Abdominal Ultrasound',result:'',status:'pending',at:null,due:'Requested in Flow'});
}
}
return out;
}
function rdEnroll(p){
const at=new Date();
if(p.rounds && !p.rounds.outcome){
 
p.rounds.location=rdDefaultLocation(p);
rdAudit(p,'Reconnected to active admission');
return;
}
const svc=rdDefaultService(p);
const admitDoc=(p.doctor&&p.doctor!=='unassigned')?rdDocShort(p.doctor):null;
p.rounds=rdNorm({
admittedAt:rdIso(at),
admittedBy:admitDoc, admittedById:(p.doctor&&p.doctor!=='unassigned')?p.doctor:null,
enrolledBy:CURRENT_USER,
admittingService:svc, service:svc,
location:rdDefaultLocation(p),
acuity:p.prio===1?'critical':(p.prio===2?'attention':'stable'),
newAdmit:true,
problems:rdSeedProblems(p),
events:[], diagnostics:rdSeedDiagnostics(p), treatments:[], tasks:[],
comms:{lastAt:null,lastBy:null,next:null,intervalH:12},
discharge:{likely:'not_today',checklist:null},
summary:null, review:{}, lastReviewSnapshot:null, snapshots:{},
handoff:null, financial:null, outcome:null,
care:(p.doctor&&p.doctor!=='unassigned')?[{id:rdId(),docId:p.doctor,name:rdDocShort(p.doctor),at:rdIso(at),by:CURRENT_USER}]:[],
audit:[{at:rdIso(at),by:CURRENT_USER,what:'Enrolled in Rounds from Flow'}]
});
try{ if(typeof fvRoundsPrefill==='function') fvRoundsPrefill(p,at); }catch(e){ console.warn('[rounds prefill]',e); }
p.timeline.push({label:'Enrolled in Rounds', at:at, meta:rdSvc(svc).label});
try{ notify('Added to Rounds', pvxEsc(rdFullName(p))+' · New Admit · '+rdSvc(svc).label, {icon:'info', color:'var(--accent)'}); }catch(e){}
}
function rdOnFlowComplete(p, finalStatus){
if(finalStatus==='Admitted'){ rdEnroll(p); return; }
if(p.rounds && !p.rounds.outcome){
 
const type=(finalStatus==='Euthanized'||finalStatus==='Deceased')?finalStatus:'Discharged';
p.rounds.outcome={type:type,at:rdIso(new Date()),by:CURRENT_USER};
rdSnapshotToday(p);
rdAudit(p,'Admission closed from Flow · '+type);
}
}
/* rdSetOutcome · its layers, innermost first: 1 #25 wrap   (PVX-N387; kept true by flow_t387) */
function rdSetOutcome(p,type){ return pvxRun('rdSetOutcome',rdSetOutcome$base,this,arguments); }
function rdSetOutcome$base(p,type){
showConfirm('Mark '+rdFullName(p)+' as '+type.toLowerCase()+'?','Mark '+type.toLowerCase(), ()=>{
p.rounds.outcome={type:type,at:rdIso(new Date()),by:rdActorName()};
p.timeline.push({label:type, at:new Date(), meta:'Rounds · '+rdActorName()});
rdSnapshotToday(p);
rdExpanded=null;
rdTouch(p,'Admission ended · '+type);
if(p.status==='Hospitalized'&&!p.completed){ try{ completePatient(p, (type==='Euthanized'||type==='Deceased')?type:'Discharged'); }catch(e){} }   /* a direct admit leaves Flow too */
}, {sub:'The admission closes and moves to the Rounds archive. The full record is preserved.'});
}


function rdSetAcuity(p,a){
if(p.rounds.acuity===a) return;
p.rounds.acuity=a;
rdTouch(p,'Acuity → '+RD_ACUITY[a].label);
}

 
function rdSnapState(p){
const r=p.rounds;
return {
at:rdIso(new Date()),
day:rdDayNum(p),
service:r.service, location:r.location, acuity:r.acuity,
problems:(r.problems||[]).filter(x=>x.active!==false).map(x=>x.label),
diag:(r.diagnostics||[]).reduce((m,d)=>{ m[d.name]=(d.status||'pending')+(d.result?(' | '+d.result):''); return m; },{}),
tx:(r.treatments||[]).map(t=>t.name+(t.detail?(' — '+t.detail):'')),
tasksOpen:(r.tasks||[]).filter(t=>t.status!=='done').map(t=>t.label),
tasksDone:(r.tasks||[]).filter(t=>t.status==='done').map(t=>t.id),
eventCount:(r.events||[]).length,
commLastAt:(r.comms&&r.comms.lastAt)||null,
summary:(r.summary&&r.summary.text)||'',
admitType:r.admitType||'clinical',
flags:(r.flags||[]).map(f=>f.label),
careIds:(r.care||[]).map(c=>c.id),
nextDocId:(r.next&&r.next.docId)||null,
contIds:(r.contingencies||[]).map(c=>c.id),
authTotal:rdAuthHours(p),
seriesLast:(function(){ const out={}; const s=r.series||{}; Object.keys(s).forEach(k=>{ const a=s[k]; if(a&&a.length) out[k]=a[a.length-1].at; }); return out; })()
};
}
function rdSnapshotToday(p){
const r=p.rounds; if(!r) return;
r.snapshots=r.snapshots||{};
r.snapshots[rdDayKey(new Date())]=rdSnapState(p);
}


 


 



 
function rdParseTime(text){
let at=null, rest=text;
let m=rest.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
if(!m) m=rest.match(/\b(?:at\s+)(\d{1,2})(?::(\d{2}))?\b/);
if(m){
let h=parseInt(m[1],10)%12; const min=m[2]?parseInt(m[2],10):0;
const ap=(m[3]||'').toLowerCase();
if(ap==='pm') h+=12;
if(!ap && parseInt(m[1],10)>=13) h=parseInt(m[1],10);
const d=new Date(); d.setHours(h,min,0,0);
if(d.getTime()>Date.now()+5*60000) d.setDate(d.getDate()-1); 
at=d; rest=(rest.slice(0,m.index)+rest.slice(m.index+m[0].length)).replace(/\s{2,}/g,' ').trim();
}
return {at:at, rest:rest, dueText:m? m[0].replace(/^at\s+/i,'').toUpperCase().replace(/\s+/g,' ') : null};
}
function rdParseQuick(p, raw){
const text=String(raw||'').trim(); if(!text) return null;
const low=text.toLowerCase();
 
let cm=text.match(/^if\s+(.+)$/i);
if(cm){
const parts=cm[1].split(/\s*(?:→|->|—>|,?\s*then\s+|:)\s*/);
if(parts.length>=2&&parts[1].trim()){
const trig=rdCap(parts[0].trim()), act=rdCap(parts.slice(1).join(' — ').trim());
return {kind:'cont',title:'Contingency',preview:'IF '+trig+' → '+act,
apply:function(){ p.rounds.contingencies.push({id:rdId(),trigger:trig,action:act,active:true,by:rdActorName(),at:rdIso(new Date())}); rdTouch(p,'Contingency · if '+trig); }};
}
}
 
cm=low.match(/^flag[:\s]+(.+)$/);
if(cm){ const label=rdCap(cm[1]);
return {kind:'flag',title:'Safety Flag',preview:label,
apply:function(){ p.rounds.flags.push({id:rdId(),label:label,kind:'safety'}); rdTouch(p,'Flag added · '+label); }}; }
 
cm=text.match(/^incident[:\s]+(.+)$/i);
if(cm){ const t=rdCap(cm[1]);
return {kind:'incident',title:'Incident',preview:t,
apply:function(){ p.rounds.events.push({id:rdId(),at:rdIso(new Date()),text:t,by:rdActorName(),kind:'incident'});
p.rounds.tasks.push({id:rdId(),label:'Disclose incident to owner',due:null,assignee:null,status:'pending',doneAt:null,urgent:true,createdAt:rdIso(new Date())});
rdTouch(p,'Incident recorded'); }}; }
 
cm=low.match(/^(pcv\/?ts|pcv|na|k|bg|glu|bp|o2|lac|temp|hr|rr)\s*[:\s]\s*([\d.]+)(?:\s*\/\s*([\d.]+))?\s*%?$/);
if(cm){
let key=cm[1].replace('/','').replace('pcvts','pcv'); if(key==='glu') key='bg';
if(RD_SERIES_META[key]){
const v=parseFloat(cm[2]), v2=cm[3]!=null?parseFloat(cm[3]):null;
const m=RD_SERIES_META[key];
return {kind:'series',title:'Trend',preview:m.label+' '+(v2!=null?(v+'/'+v2):v)+(m.unit||''),
apply:function(){ rdSeriesAdd(p,key,v,v2); rdTouch(p,'Trend · '+m.label); }};
}
}
 
if(/^owner\b/.test(low)||/\bowner (update|call)\b/.test(low)){
const next=rdCap(text.replace(/^owner\s*(update|call)?\s*/i,'').trim())||'Update owner';
return {kind:'comm',title:'Communication',preview:'Owner update · '+next,
apply:function(){ p.rounds.comms.next=next; rdTouch(p,'Owner plan · '+next); }};
}
 
let m=low.match(/^(?:add\s+)?problem[:\s]+(.+)$/);
if(m){ const label=rdCap(m[1]);
return {kind:'problem',title:'Active Problem',preview:label,
apply:function(){ p.rounds.problems.push({id:rdId(),label:label,active:true,resolvedAt:null}); rdTouch(p,'Problem added · '+label); }}; }
 
m=low.match(/^(?:tx|treatment|start)[:\s]+(.+)$/);
if(m){ const t=rdCap(m[1]);
return {kind:'tx',title:'Treatment',preview:t,
apply:function(){ const parts=t.split(/\s[-–—]\s|,\s*/); p.rounds.treatments.push({id:rdId(),name:parts[0],detail:parts.slice(1).join(', ')}); rdTouch(p,'Treatment added · '+parts[0]); }}; }
 
if(/^(repeat|recheck|check|give|transition|call|schedule|walk|feed|d\/c|discontinue|remove|pull|start)\b/.test(low)){
const pt=rdParseTime(text);
const label=rdCap(pt.rest);
const due=pt.at? fmtTime(pt.at) : (pt.dueText||null);
return {kind:'task',title:'Task',preview:label+(due?(' · '+due):''),
apply:function(){ p.rounds.tasks.push({id:rdId(),label:label,due:due,assignee:null,status:'pending',doneAt:null,urgent:false}); rdTouch(p,'Task added · '+label); }}; }
 
m=low.match(/^(?:dx|diagnostic|order)[:\s]+(.+)$/);
if(m){ const nm=rdCap(m[1]);
return {kind:'diag',title:'Diagnostic',preview:nm+' · Pending',
apply:function(){ p.rounds.diagnostics.push({id:rdId(),name:nm,result:'',status:'pending',at:null,due:null}); rdTouch(p,'Diagnostic ordered · '+nm); }}; }
 
const pt=rdParseTime(text);
const evText=rdCap(pt.rest);
const at=pt.at||new Date();
return {kind:'event',title:'Event',preview:evText+' · '+fmtTime(at),
apply:function(){ p.rounds.events.push({id:rdId(),at:rdIso(at),text:evText,by:rdActorName(),kind:'clinical'}); rdTouch(p,'Event · '+evText); }};
}

 
function rdMarkReviewed(p){
const r=p.rounds;
r.review=r.review||{};
r.review[rdReviewKey()]={by:rdActorName(),at:rdIso(new Date())};
r.lastReviewSnapshot=rdSnapState(p);
if(r.newAdmit){ r.newAdmit=false; }
rdSnapshotToday(p);
rdTouch(p,'Rounds reviewed · '+rdShift,true);
}



 
let rdKpiFilter=null; 
let rdSvcFilter='all'; 
let rdQuery='';

let rdModeOpen=false, rdModeIdx=0, rdModeDetail=false;


 






 
function rdMatchesQuery(p,q){
if(!q) return true;
const r=p.rounds;
const hay=[rdFullName(p),p.owner,p.hid,p.id,p.species,p.breed,r.location,rdSvc(r.service).label,
rdCurrentDocName(p)||'', rdNextDocName(p)||'',
(r.problems||[]).map(x=>x.label).join(' '),(r.assessment||'')].join(' ').toLowerCase();
return hay.indexOf(q)>=0;
}
function rdFiltered(){
const q=rdQuery.trim().toLowerCase();
return rdCensus().filter(p=>{
if(!rdMatchesQuery(p,q)) return false;
if(rdSvcFilter==='new'&&!p.rounds.newAdmit) return false;
if(rdSvcFilter!=='all'&&rdSvcFilter!=='new'&&p.rounds.service!==rdSvcFilter) return false;
if(rdKpiFilter==='critical'&&p.rounds.acuity!=='critical') return false;
if(rdKpiFilter==='new'&&!p.rounds.newAdmit) return false;
if(rdKpiFilter==='pending'&&!rdPendingItems(p).length) return false;
if(rdKpiFilter==='discharge'&&!rdLikely(p)) return false;
if(rdKpiFilter==='owner'&&!rdOwnerDue(p)) return false;
if(rdKpiFilter==='review'&&rdReviewed(p)) return false;
if(rdKpiFilter==='auth'){ const a=rdAuthState(p); if(!a||a.status==='ok') return false; }
return true;
});
}

 


 





 


 


 












 


 
/* n117 — Rounds treatments: the sheet's orders as a plan (fluids & CRIs → meds → care), the dose you'd say first, mg/kg light on the right */


/* RD-01 n133: section add-fields are named by their action and patient, not by the example text */




 


 


 




 

/* ═════════ ROUNDS ORDER — drag patients into the order you round on them (Oct 2026) ═════════
   Each section (New Admits, then each department) lists its patients in p.rounds.rank order — the team's order, saved for
   everyone, with the section it was set in (p.rounds.rankSec): a rank from another section doesn't count. Patients not placed
   yet come first, newest first (a transfer into a section is seen, then placed). The grip at a
   row's left edge drags it within its section (mouse, pen or touch); arrow keys on the grip move it one place; Esc cancels.
   Start Rounds walks the same order. Off while searching or filtering by a count (that would order a subset). */
function rdRankOf(p,sec){ const r=p.rounds; return (r.rank!=null&&r.rankSec===sec)?r.rank:null; }   /* a rank only counts in the section it was set in */
function rdRankCmp(a,b,sec){ const x=rdRankOf(a,sec), y=rdRankOf(b,sec); if(x==null&&y==null) return 0; if(x==null) return -1; if(y==null) return 1; return x-y; }
function rdGroupsOf(list){
const groups=[];
const newAdmits=list.filter(p=>p.rounds.newAdmit);
if(rdSvcFilter==='all'&&!rdKpiFilter&&newAdmits.length) groups.push({key:'new',label:'New Admits',list:newAdmits,cls:'sec-new'});
RD_SERVICES.forEach(s=>{
const l=list.filter(p=>p.rounds.service===s.key&&!(groups.length&&groups[0].key==='new'&&p.rounds.newAdmit));
if(l.length) groups.push({key:s.key,label:s.label,list:l});
});
groups.forEach(g=>{ g.list=g.list.slice().sort((a,b)=>rdRankCmp(a,b,g.key)); });   /* stable: the unplaced keep newest-first */
return groups;
}








   /* a save that arrived during a press shows now (after the click) */
/* start: the grip (keyboard users, or anyone who finds it) lifts at once; the row itself lifts once a mouse or pen moves it
   10 px up or down (a shaky click stays a click), or — on touch, so a swipe still scrolls — after a 350 ms press-and-hold */




   /* a lifted row, not the page, follows the finger */



   /* the click that ends a drag doesn't also open the row (unless a mouse let go back in the row's own slot) */







/* ═════════ ROUNDS GAPS (Oct 2026) — CPR/DNR · tasks · archive reads older visits on demand ═════════ */



/* the archive also shows admissions older than what Flow keeps loaded (read once, when the archive opens) */



/* n273: Rounds is loading until Flow's first real answer (no "No patients", no 0s); the loader is n273.js */




 




 
function rdFind(pid){ return PATIENTS.find(p=>p.id===pid)||null; }




function rdHandleInput(inp){
const kind=inp.dataset.input, pid=inp.dataset.pid, id=inp.dataset.id;
 
if(kind==='queue'){ const v0=inp.value.trim(); if(!v0) return; const qk=inp.dataset.key;
const qx={id:rdId(),text:rdCap(v0),done:false,doneAt:null,at:rdIso(new Date())}; rdQueues[qk].push(qx);
rdSaveQueues(); rdQAdd(qk,qx); renderRdCensus(true); return; }   /* PVX-N148 */
const p=rdFind(pid); if(!p) return;
const r=p.rounds, v=inp.value.trim();
switch(kind){
case'quick':{ const parsed=rdParseQuick(p,v); if(parsed){ parsed.apply(); } break; }
case'prob': if(v){ r.problems.push({id:rdId(),label:rdCap(v),active:true,resolvedAt:null}); rdTouch(p,'Problem added · '+rdCap(v)); } break;
case'event':{ if(!v) break; const pt=rdParseTime(v); const at=pt.at||new Date();
r.events.push({id:rdId(),at:rdIso(at),text:rdCap(pt.rest||v),by:rdActorName(),kind:'clinical'}); rdTouch(p,'Event · '+rdCap(pt.rest||v)); break; }
case'diag':{ if(!v) break; const parts=v.split(/\s+[-—–]\s+|\s+·\s+/);
const done=parts.length>1;
r.diagnostics.push({id:rdId(),name:rdCap(parts[0]),result:done?parts.slice(1).join(' — '):'',status:done?'completed':'pending',at:done?rdIso(new Date()):null,due:null});
rdTouch(p,'Diagnostic added · '+rdCap(parts[0])); break; }
case'tx':{ if(!v) break; const parts=v.split(/\s+[-—–]\s+/);
r.treatments.push({id:rdId(),name:rdCap(parts[0]),detail:parts.slice(1).join(' — ')}); rdTouch(p,'Treatment added · '+rdCap(parts[0])); break; }
case'task':{ if(!v) break; const pt=rdParseTime(v);
r.tasks.push({id:rdId(),label:rdCap(pt.rest||v),due:pt.at?fmtTime(pt.at):null,assignee:null,status:'pending',doneAt:null,urgent:false}); rdTouch(p,'Task added · '+rdCap(pt.rest||v)); break; }
case'dis': if(v){ r.discharge.checklist=(r.discharge.checklist||[]).concat([{id:rdId(),label:rdCap(v),done:false}]); rdTouch(p,'Discharge item added'); } break;
case'client-id': if((r.clientId||'')!==v){ r.clientId=v; rdTouch(p,'Client ID updated'); } break;
case'pet-id': if((r.petId||'')!==v){ r.petId=v; rdTouch(p,'Pet ID updated'); } break;
case'assess': if((r.assessment||'')!==v){ r.assessment=v; rdTouch(p,'Assessment updated'); } break;
case'comm-next': if((r.comms.next||'')!==v){ r.comms.next=v||null; rdTouch(p,'Owner plan updated'); } break;
case'diag-res':{ const d=r.diagnostics.find(x=>x.id===id); if(d&&(d.result||'')!==v){ d.result=v; if(v&&d.status!=='completed'){ d.status='completed'; d.at=rdIso(new Date()); } rdTouch(p,d.name+' result updated'); } break; }
case'tx-edit':{ const t=r.treatments.find(x=>x.id===id); if(!t) break; const parts=v.split(/\s+[-—–]\s+/);
if(t.name!==parts[0]||(t.detail||'')!==parts.slice(1).join(' — ')){ t.name=parts[0]; t.detail=parts.slice(1).join(' — '); rdTouch(p,'Treatment updated · '+t.name); } break; }
case'auth-num':{ const kk=inp.dataset.key, a=rdAuth(p);
const num=v===''?null:parseFloat(v.replace(/[^0-9.]/g,''));
if(a[kk]!==num){ a[kk]=(num==null||isNaN(num))?null:num; rdTouch(p,'Authorization '+kk+' updated'); } break; }
case'appr':{ if(!v) break;
const m=v.match(/^\$?\s*([\d,]+(?:\.\d+)?)\s*(.*)$/);
const amount=m?parseFloat(m[1].replace(/,/g,'')):null;
let rest=m?m[2]:v, method='verbal';
['signed','text','phone','verbal','in person'].forEach(w=>{ const re=new RegExp('\\b'+w+'\\b','i'); if(re.test(rest)){ method=(w==='phone'?'verbal (phone)':w); rest=rest.replace(re,'').trim(); } });
rest=rest.replace(/^[-–—:\s]+/,'').trim();
rdAuth(p).approvals.push({id:rdId(),amount:amount,scope:rdCap(rest),method:method,by:rdActorName(),at:rdIso(new Date())});
p.timeline.push({label:'Owner approval'+(amount!=null?(' · $'+amount.toLocaleString()):''), at:new Date(), meta:rdCap(rest)||method});
rdTouch(p,'Owner approval recorded'); break; }
case'cont':{ if(!v) break;
const parsed=rdParseQuick(p,/^if\s/i.test(v)?v:('if '+v));
if(parsed&&parsed.kind==='cont'){ parsed.apply(); }
else { rdTouch(p,null); } break; }
case'series':{ if(!v) break;
const parsed=rdParseQuick(p,v);
if(parsed&&parsed.kind==='series'){ parsed.apply(); } break; }
case'comm-window': if((r.comms.window||'')!==v){ r.comms.window=v||null; rdTouch(p,'Owner constraints updated'); } break;
}
}
function rdWireOnce(){
const census=document.getElementById('view-rd-census');
const archive=document.getElementById('view-rd-archive');
[census,archive].forEach(root=>{
if(!root) return;
root.addEventListener('click',e=>{
const el=e.target.closest('[data-act]'); if(!el) return;
if(e.target.closest('input,textarea')) return;
e.preventDefault(); rdHandleAct(el.dataset.act,el);
});
root.addEventListener('dblclick',e=>{
const value=e.target.closest('[data-fin-key]'); if(!value) return;
e.preventDefault(); e.stopPropagation();
const pid=value.dataset.pid, key=value.dataset.finKey, p=rdFind(pid); if(!p) return;
if(!['estimateLow','estimate','deposited'].includes(key)) return;
const a=rdAuth(p);
let cur=a[key];
if(key==='estimateLow'&& cur==null && a.estimate!=null) cur=Math.round((+a.estimate)*.8);
const input=document.createElement('input');
input.className='rd-fin-inline'; input.type='text'; input.inputMode='decimal';
input.value=cur==null?'':Number(cur).toLocaleString('en-US',{maximumFractionDigits:2});
let done=false;
const commit=()=>{ if(done) return; done=true; const raw=input.value.trim().replace(/[$,]/g,''); const num=raw===''?null:parseFloat(raw); a[key]=(num==null||isNaN(num))?null:num; rdTouch(p,({estimateLow:'Low end',estimate:'High end',deposited:'Deposit'}[key]||'Financial value')+' updated'); };
input.addEventListener('keydown',ev=>{ if(ev.key==='Enter'){ev.preventDefault();commit();} else if(ev.key==='Escape'){done=true;renderRdCensus(true);} });
input.addEventListener('blur',commit,{once:true});
value.replaceWith(input); input.focus(); input.select();
});
root.addEventListener('keydown',e=>{
const inp=e.target.closest('input[data-input],textarea[data-input]');
if(!inp) return;
if(e.key==='Escape'){ inp.blur(); renderRdCensus(true); return; }
if(e.key!=='Enter'||inp.tagName==='TEXTAREA') return;
e.preventDefault();
const kind=inp.dataset.input, keep=(kind==='quick'), pid=inp.dataset.pid;
inp.dataset.committed='1';
rdHandleInput(inp);
renderRdCensus(true);
if(keep){ const again=document.querySelector('input[data-input="quick"][data-pid="'+pid+'"]'); if(again){ again.value=''; again.focus(); } }
});
 
root.addEventListener('input',e=>{
const inp=e.target.closest('input[data-input="quick"]'); if(!inp) return;
const hint=document.getElementById('rdQuickHint-'+inp.dataset.pid); if(!hint) return;
const p=rdFind(inp.dataset.pid); const parsed=p?rdParseQuick(p,inp.value):null;
hint.textContent=parsed&&inp.value.trim()? (parsed.title+' — '+parsed.preview+'  ⏎') :'';
});


root.addEventListener('focusout',e=>{
const inp=e.target.closest('input[data-input]'); if(!inp) return;
const kind=inp.dataset.input;
if(inp.dataset.committed) return;
if(['assess','comm-next','comm-window','diag-res','tx-edit','auth-num'].indexOf(kind)>=0) setTimeout(()=>rdHandleInput(inp),140);
});
});
 
document.querySelectorAll('#switcherRd .seg').forEach(s=>s.addEventListener('click',()=>switchRdView(s.dataset.rdview)));
const q=document.getElementById('rdSearch');
if(q){ q.addEventListener('input',()=>{ rdQuery=q.value; renderRdCensus(true); });
q.addEventListener('keydown',e=>{ if(e.key==='Escape'){ q.value=''; rdQuery=''; q.blur(); renderRdCensus(true); } }); }
document.querySelectorAll('#rdShiftSeg button').forEach(b=>b.addEventListener('click',()=>{ rdShift=b.dataset.shift; renderRdCensus(true); }));
const sb=document.getElementById('rdStartBtn'); if(sb) sb.addEventListener('click',rdStartMode);
const db=document.getElementById('rdDisplayBtn'); if(db) db.addEventListener('click',rdToggleDisplay);
const actor=document.getElementById('rdActor');
if(actor){ actor.addEventListener('click',()=>{
rdMenu(actor,[{value:'',label:'Care Team',on:!rdActorId}].concat(rdAllDoctors().map(d=>({value:d.id,label:drName(d.name),on:rdActorId===d.id}))),v=>{
rdActorId=v||null; try{ v?localStorage.setItem(RD_ACTOR_KEY,v):localStorage.removeItem(RD_ACTOR_KEY); }catch(e){}
rdActorLabel(); }); }); }
rdActorLabel();
 
document.addEventListener('keydown',e=>{
if(typeof currentApp==='undefined'||currentApp!=='rounds') return;
const typing=/input|textarea/i.test((document.activeElement&&document.activeElement.tagName)||'');
if(rdModeOpen){
if(e.key==='Escape'){ e.preventDefault(); rdExitMode(); }
else if(e.key==='ArrowRight'){ e.preventDefault(); rdModeNav(1); }
else if(e.key==='ArrowLeft'){ e.preventDefault(); rdModeNav(-1); }
else if((e.key==='r'||e.key==='R')&&!typing){ e.preventDefault(); rdModeReview(); }
else if(e.key==='Enter'&&!typing){ e.preventDefault(); rdModeDetail=!rdModeDetail; rdModeRender(); }
return;
}
if(e.key==='/'&&!typing){ e.preventDefault(); const s=document.getElementById('rdSearch'); if(s) s.focus(); }
if(e.key==='Escape'&&!typing&&rdExpanded){ rdExpanded=null; renderRdCensus(true); }
});
}
function rdActorLabel(){ const el=document.getElementById('rdActor'); if(el) el.innerHTML='Rounding as <b>'+pvxEsc(rdActorName())+'</b>'; }

 
function rdModeList(){ return rdGroupsOf(rdFiltered()).reduce((a,g)=>a.concat(g.list),[]); }
function rdSetStartBtn(on){ const b=document.getElementById('rdStartBtn'); if(b){ b.classList.toggle('is-running', !!on); b.setAttribute('aria-pressed', on?'true':'false'); } }
function rdStartMode(){
if(!rdCensus().length) return;
rdModeOpen=true; rdModeIdx=0; rdModeDetail=false; rdSetStartBtn(true);
let ov=document.getElementById('rdMode');
if(!ov){ ov=document.createElement('div'); ov.id='rdMode'; document.body.appendChild(ov); }
document.body.classList.add('rd-mode-open');
rdModeRender();
}
function rdExitMode(){
rdModeOpen=false; rdSetStartBtn(false);
const ov=document.getElementById('rdMode'); if(ov) ov.remove();
document.body.classList.remove('rd-mode-open');
renderRdCensus(true);
}
function rdModeNav(d){
const n=rdModeList().length; if(!n) return rdExitMode();
rdModeIdx=Math.min(n-1,Math.max(0,rdModeIdx+d)); rdModeDetail=false; rdModeRender();
}
function rdModeReview(){
const p=rdModeList()[rdModeIdx]; if(!p) return;
rdMarkReviewed(p);
const btn=document.querySelector('#rdMode .rdm-rev'); if(btn){ btn.classList.add('did'); }
setTimeout(()=>{ if(rdModeOpen){ if(rdModeIdx<rdModeList().length-1) rdModeNav(1); else rdModeRender(); } },380);
}
