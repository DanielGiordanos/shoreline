
/* Lobby screen: a display-only copy per visit in `lobby/{visit id}` — never the tracker token. Written where pub is written,
   removed when the visit ends or the patient is hospitalized (the lobby lists the pets being seen in the ER). */
var _fxLobby={};   /* visit id → what the lobby doc holds ('' = none) */
function fxLobbyOn(p){ return !!p&&!p._demo&&isActive(p)&&p.status!=='Hospitalized'; }
function lobbyProjection(p){ const t=p.timeline||[], last=t.length?t[t.length-1].at:p.arrival;
  return { tenant_id:TENANT_ID, patient_name:((p.name||'')+' '+(p.last||'')).trim(), species:p.species||null, breed:p.breed||null,
    age:formatPatientAge(p)||p.age||null, age_estimated:true, status:p.status||'Waiting', prio:p.prio||3,
    doctor_id:(p.doctor&&p.doctor!=='unassigned')?p.doctor:null, arrival_time:_toISO(p.arrival)||null,
    timeline:last?[{at:_toISO(last)}]:[], is_active:true }; }
function fxCanon(o){ return JSON.stringify(Object.keys(o||{}).sort().reduce((a,k)=>{ a[k]=o[k]; return a; },{})); }
function fxLobbyRef(id){ return DB.collection('lobby').doc(String(id)); }
function fxLobbyWrite(batch,p){ const id=String(p.id), ref=fxLobbyRef(id);
  if(fxLobbyOn(p)){ const d=lobbyProjection(p), j=fxCanon(d); if(_fxLobby[id]===j) return; batch.set(ref,d); _fxLobby[id]=j; }
  else if(_fxLobby[id]!==''){ batch.delete(ref); _fxLobby[id]=''; } }
async function fxLobbySync(){   /* once per staff load: add what's missing, drop what's left over */
  if(!DB||Backend.mode!=='staff') return;
  try{
    const snap=await DB.collection('lobby').where('tenant_id','==',TENANT_ID).get(), have={};
    snap.docs.forEach(d=>{ have[d.id]=fxCanon(d.data()); });
    PATIENTS.forEach(p=>{ if(!p._demo) _fxLobby[String(p.id)]=(have[String(p.id)]!==undefined)?have[String(p.id)]:''; });
    const b=DB.batch(); let n=0;
    Object.keys(have).forEach(id=>{ if(!PATIENTS.some(p=>String(p.id)===id&&fxLobbyOn(p))){ b.delete(fxLobbyRef(id)); _fxLobby[id]=''; n++; } });
    PATIENTS.forEach(p=>{ if(fxLobbyOn(p)&&n<450){ const d=lobbyProjection(p), j=fxCanon(d); if(_fxLobby[String(p.id)]!==j){ b.set(fxLobbyRef(p.id),d); _fxLobby[String(p.id)]=j; n++; } } });
    if(n) await b.commit();
  }catch(e){}
}
