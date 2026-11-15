/* the chip: Saving… → Saved (only on the server's word) · Offline · Not saved */




/* the Tomorrow list on the server: rounds_queue/{id} = {tenant_id, key, text, done, done_at, created_at, created_by, updated_at, updated_by} */

function rdQDb(){ try{ return (typeof Backend!=='undefined'&&Backend.mode==='staff'&&typeof DB!=='undefined'&&DB&&DB.collection)?DB:null; }catch(e){ return null; } }
function rdQWho(){ try{ return rdActorName()||null; }catch(e){ return null; } }
function rdQWrite(p){ var d=rdQDb(); if(!d||!p){ return; } rdQ.pend++; window.__rdQWait=true; rdSaveState('saving');
  p.then(function(){ rdQ.pend--; if(!rdQ.pend){ window.__rdQWait=false; if(!window.__rdWaitSince) rdSaveState('saved'); } })
   .catch(function(e){ rdQ.pend--; console.warn('[rounds] tomorrow list',e); rdSaveState('error'); try{ toast('Tomorrow list not saved — check your connection'); }catch(x){} }); }
function rdQRef(id){ return rdQDb().collection('rounds_queue').doc(String(id)); }
function rdQAdd(key,x){ var d=rdQDb(); if(!d) return; var now=new Date().toISOString();
  rdQWrite(rdQRef(x.id).set({tenant_id:TENANT_ID,key:key,text:String(x.text).slice(0,200),done:!!x.done,done_at:x.doneAt||null,created_at:x.at||now,created_by:rdQWho(),updated_at:now,updated_by:rdQWho()})); }
