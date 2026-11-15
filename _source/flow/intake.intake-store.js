


const FlowIntakeStore=(function(){
const KEY='pravix_client_intakes';
const COL='client_intakes';
const listeners=new Set();
let _db=null, _unsub=null, _bound=false;
function _all(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]')||[]; }catch(e){ return []; } }
function _writeMirror(arr){ try{ localStorage.setItem(KEY, JSON.stringify(arr)); }catch(e){} }
function _saveAll(arr){ _writeMirror(arr); _emit(); }
function _emit(){ listeners.forEach(fn=>{ try{ fn(); }catch(e){} }); }
try{ window.addEventListener('storage', e=>{ if(e.key===KEY) _emit(); }); }catch(e){}


function _attach(db){
if(_bound || !db) return; _bound=true; _db=db;
try{
_unsub = db.collection(COL).where('tenant_id','==',TENANT_ID).onSnapshot(function(snap){
const arr=[];
snap.forEach(function(d){ const v=d.data()||{}; const rec=(v && v.record)?v.record:v; if(rec && rec.id) arr.push(rec); });
arr.sort(function(a,b){ return String((b&&b.submittedAt)||'').localeCompare(String((a&&a.submittedAt)||'')); });
_writeMirror(arr); _emit();
}, function(err){ console.warn('[intake-sync] subscription error',err&&err.code||'unknown'); try{window.dispatchEvent(new CustomEvent('pvx:intake-sync-error',{detail:{source:'subscription'}}))}catch(_){} });
}catch(e){}
}
function _push(id, rec, extra){
function warn(error){ console.warn('[intake-sync] write failed',error&&error.code||'connection'); try{window.dispatchEvent(new CustomEvent('pvx:intake-sync-error',{detail:{source:'write',id:id}}))}catch(_){} try{if(typeof toast==='function')toast('Couldn’t save the check-in — check the connection and try again')}catch(_){} return false; }
if(!_db) return Promise.resolve(warn(null));
try{ return _db.collection(COL).doc(id).set(Object.assign({ tenant_id:TENANT_ID, id:id, record:rec }, extra||{}), {merge:true}).then(function(){return true}).catch(warn); }catch(e){return Promise.resolve(warn(e))}
}
return {
getPendingIntakes(){ return _all().filter(r=> r && r.status!=='completed'&& r.status!=='dismissed'); },
getIntake(id){ return _all().find(r=> r && r.id===id) || null; },
submitClientIntake(rec){ const q=_all(); q.unshift(rec); _saveAll(q); _push(rec.id, rec, { submittedAt: rec.submittedAt||new Date().toISOString() }); return rec; },
updateIntake(id,patch){ const q=_all(); const i=q.findIndex(r=>r&&r.id===id); let merged=null; if(i>=0){ merged=Object.assign({},q[i],patch); q[i]=merged; _saveAll(q); } _push(id, merged||patch); return merged; },
completeIntake(id){ const q=_all().map(r=> (r&&r.id===id)?Object.assign({},r,{status:'completed'}):r ); return _push(id, {status:'completed'}).then(function(ok){ if(ok)_saveAll(q); return ok; }); },
onChange(fn){ listeners.add(fn); return ()=>listeners.delete(fn); },
_attach:_attach, _all:_all, _saveAll:_saveAll
};
})();
