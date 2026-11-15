
const Backend = {
mode:'staff', channel:null, conn:'connecting', _poll:null, _lastRows:null,
setConn:function(state){
if(Backend.conn!==state) Backend._connSince=Date.now(); Backend.conn = state;
const map = { live:['Live','var(--s-admitted)'], connecting:['Connecting…','var(--s-admitted)'],
reconnecting:['Reconnecting…','var(--amber)'], offline:['Offline','#8A8FA0'], error:['Sync error','var(--priority-p1)'] };
const cfg = map[state] || map.live;
['connBadge','connBadgeCl'].forEach(function(id){
const el=document.getElementById(id); if(!el) return;
const label = (id==='connBadgeCl'&& state==='live') ?'Live · Updating': cfg[0];
el.innerHTML ='<span class="dot"></span>'+label; el.style.color = cfg[1];
const dot=el.querySelector('.dot'); if(dot){ dot.style.background=cfg[1]; dot.style.boxShadow='0 0 10px '+cfg[1]; }
});
},
init: async function(){
Backend.mode =/[?&](display|tv|lobby)=?/.test(location.search) ?'lobby':'staff';
if(!DB){ Backend.setConn('error'); return; }
Backend.setConn('connecting');
if(Backend.mode==='lobby'){   /* PVX-N149: the lobby screen signs in (its own account), then shows the Client Display */
  if(!AUTH){ return Backend.lobbyStart(); }
  if(Backend._authWired) return; Backend._authWired=true;
  AUTH.onAuthStateChanged(function(user){ if(user){ const ov=document.getElementById('sbLogin'); if(ov) sbFinishLogin(ov); if(!Backend._lobbyOn){ Backend._lobbyOn=true; Backend.lobbyStart(); } }
    else { Backend._lobbyOn=false; ['unsubAlertLobby','unsubPubLobby'].forEach(function(k){ if(Backend[k]){ try{ Backend[k](); }catch(e){} Backend[k]=null; } }); PATIENTS=[]; try{ renderClient(); }catch(e){} showLogin(); } });
  return; }


if(!AUTH){ showLogin(); return; }
if(Backend._authWired) return;
Backend._authWired = true;
AUTH.onAuthStateChanged(async function(user){
if(user&&pvxIsLobbyAccount(user)){ pvxLobbyAccountCard(user); return; }   /* PVX-N149: the lobby account never opens the staff board */
if(user){
  // The original Pravix sign-in is the only password entry surface.
  // Before staff subscriptions start, provision the approved UID from the
  // temporary, verified-email Firebase Security Rules bootstrap.
  if(!(await pvxActivateApprovedStaffMember(user))){
    try{ await AUTH.signOut(); }catch(_){}
    return;
  }
  /* PVX-N155: return to the page that asked for sign-in (a path on this site only) */ try{ var pvxNext=new URLSearchParams(location.search).get('next'); if(pvxNext&&/^\/(?![\/\\])[\w\-\/.#=&%?]*$/.test(pvxNext)){ location.replace(pvxNext); return; } }catch(e){}
  pvxLobbyAccountCard(null); try{ CURRENT_USER = userDisplayName(user); }catch(e){} try{ usApplyRoleForUser(user); }catch(e){} const ov=document.getElementById('sbLogin'); if(ov){ sbFinishLogin(ov); } Backend.loadAndSubscribe(); }
else { pvxClearPrivateLocalState(); pvxLobbyAccountCard(null); showLogin(); }
});
},
loadShifts: async function(){
try{
const snap = await DB.collection('shifts').doc(TENANT_ID).get();
const a = snap.exists ? ((typeof _shiftsForToday==='function') ? _shiftsForToday(snap.data()) : snap.data().assignments) : null;
if(a && typeof shiftAssign!=='undefined'){
Object.keys(shiftAssign).forEach(function(k){ shiftAssign[k]=null; });
Object.assign(shiftAssign, a);
if(typeof applyShiftColors==='function') applyShiftColors();
}
}catch(e){}
},
loadAlert: async function(){
try{
const snap = await DB.collection('alerts').doc(TENANT_ID).get();
const row = snap.exists ? snap.data() : null;
currentAlert = (row && row.active) ? row : null;
}catch(e){}
try{ if(typeof renderAlert==='function') renderAlert(); }catch(e){}
},
lobbyLoadAlert: async function(){
try{
const snap = await DB.collection('alerts').doc(TENANT_ID).get();
const row = snap.exists ? snap.data() : null;
currentAlert = (row && row.active && row.show_client!==false) ? row : null;
}catch(e){}
},
loadAndSubscribe: async function(){
var pvxFirst=Promise.all([ Backend.refetch(), Backend.loadShifts(), Backend.loadAlert() ]);
await Promise.race([ pvxFirst, new Promise(function(r){ setTimeout(r,4000); }) ]);   /* n249: a stalled first read never holds back the live feed */
if(!Backend._n249Watch){ Backend._n249Watch=true; var pvxT0=Date.now(); setTimeout(function n249Check(){ try{
  if(Backend.mode!=='staff'||!AUTH||!AUTH.currentUser) return;
  if(Backend._liveAt&&Backend._liveAt>=pvxT0) return;   /* the server has answered */
  if(!navigator.onLine){ setTimeout(n249Check,10000); return; }
  if(window.pvxFsRecover) pvxFsRecover('no answer from the server 20 s after sign-in');
}catch(e){} },20000); }
try{ FlowIntakeStore._attach(DB); }catch(e){}
try{ fxLobbySync(); }catch(e){}

Backend._subVisits=function(){   /* n92: one place that (re)starts the live visits feed */
if(Backend.unsubVisits){ try{ Backend.unsubVisits(); }catch(e){} }
window.__rdFeed=1;   /* n273: this is the feed Rounds waits for */
Backend.unsubVisits = fvVisitsListen(function(docs,meta){
if(fvKeepBoard(docs,meta)) return;   /* an empty answer from the local cache never wipes a board that has patients */
if(meta&&meta.real!==undefined?meta.real:(!(meta&&meta.fromCache)||(docs&&docs.length))) Backend._gotVisits=true;   /* n273: every census list answered for real (an empty list from the local cache isn't an answer yet) */
Backend._liveAt=Date.now(); Backend._retry=0;
_persistLock = true;
var pvxKeep=window.fvUnsavedTake?fvUnsavedTake():null;   /* n252 */
PATIENTS = docs.map(function(d){ return mapToApp(Object.assign({ id:d.id }, d.data())); }).concat(PATIENTS.filter(function(p){ return p._demo; }));
Backend._lastRows = fvRowsCopy(PATIENTS);
if(window.fvUnsavedPut) fvUnsavedPut(pvxKeep);   /* n252: what this screen hasn't saved yet stays, and is saved */
Backend._mergeResus();
_persistLock = false;
if(meta&&meta.fromCache) fvConfirmLive(); else Backend.setConn('live');   /* n92c: Firestore sends no second event when only the cache flag changes */
try{ if(typeof scheduleRender==='function'){ scheduleRender(function(){ try{ if(activePatient){ const p=PATIENTS.find(function(x){return x.id===activePatient;}); if(p && typeof fillDrawer==='function') fillDrawer(p); } }catch(e){} }); } else { if(typeof renderAll==='function') renderAll();
try{ if(activePatient){ const p=PATIENTS.find(function(x){return x.id===activePatient;}); if(p && typeof fillDrawer==='function') fillDrawer(p); } }catch(e){} } }catch(e){}
}, function(err){ console.warn('[visits] live feed stopped —',(err&&err.message)||err); Backend.setConn('reconnecting'); fvResubscribeSoon(); });
};
Backend._subVisits();

if(Backend.unsubPub){ try{ Backend.unsubPub(); }catch(e){} }
Backend.unsubPub = DB.collection('pub').where('tenant_id','==',TENANT_ID)
.onSnapshot(function(snap){
Backend._pubResus = {};
snap.docs.forEach(function(d){ const v=d.data(); if(v.resus_pref) Backend._pubResus[d.id]={ pref:v.resus_pref, status:v.resus_status||'client_selected', at:v.resus_recorded_at||null }; });
Backend._mergeResus();
try{ if(typeof scheduleRender==='function'){ scheduleRender(function(){ try{ if(activePatient){ const p=PATIENTS.find(function(x){return x.id===activePatient;}); if(p && typeof fillDrawer==='function') fillDrawer(p); } }catch(e){} }); } else { if(typeof renderAll==='function') renderAll();
try{ if(activePatient){ const p=PATIENTS.find(function(x){return x.id===activePatient;}); if(p && typeof fillDrawer==='function') fillDrawer(p); } }catch(e){} } }catch(e){}
}, function(){});

if(Backend.unsubShifts){ try{ Backend.unsubShifts(); }catch(e){} }
Backend.unsubShifts = DB.collection('shifts').doc(TENANT_ID)
.onSnapshot(function(d){
if(_shiftModalOpen) return;
const a = d.exists ? ((typeof _shiftsForToday==='function') ? _shiftsForToday(d.data()) : d.data().assignments) : null;
if(a && typeof shiftAssign!=='undefined'){
Object.keys(shiftAssign).forEach(function(k){ shiftAssign[k]=null; });
Object.assign(shiftAssign, a);
if(typeof applyShiftColors==='function') applyShiftColors();
if(typeof renderAll==='function') renderAll();
}
}, function(){});

if(Backend.unsubAlert){ try{ Backend.unsubAlert(); }catch(e){} }
Backend.unsubAlert = DB.collection('alerts').doc(TENANT_ID)
.onSnapshot(function(d){ const row=d.exists?d.data():null; currentAlert=(row&&row.active)?row:null; try{ if(typeof renderAlert==='function') renderAlert(); }catch(e){} }, function(){});

if(Backend.unsubMsgs){ try{ Backend.unsubMsgs(); }catch(e){} }
Backend.unsubMsgs = DB.collectionGroup('items')
.onSnapshot(function(snap){
snap.docChanges().forEach(function(ch){
if(ch.type!=='added') return;
const m=ch.doc.data(); if(!m || m.sender!=='client') return;
if(Backend._msgSeen[ch.doc.id]) return; Backend._msgSeen[ch.doc.id]=1;
if(Backend._msgWarm){ return; }
const token = ch.doc.ref.parent.parent ? ch.doc.ref.parent.parent.id : null;
const p = PATIENTS.find(function(x){ return x.publicToken===token; });
const dr=document.getElementById('drawer'); const open = dr && dr.classList.contains('open');
if(p && activePatient===p.id && open){
if(!_commOpen) _unreadMsgs.add(p.id);
loadThread(p); return;
}
if(p){ _unreadMsgs.add(p.id);
try{ notify('New message from family', pvxEscQ((p.name+' '+(p.last||'')).trim()), {icon:'info', color:'#0A84FF', dur:8000, openLabel:'Open the conversation', open:(function(pid){ return function(){ pvxOpenThread(pid); }; })(p.id)}); }catch(e){}   /* PVX-N376 */
try{ renderTable(); renderBoard(); }catch(e){} }
});
Backend._msgWarm = false;
}, function(){});
},
_pubResus:{}, _msgSeen:{}, _msgWarm:true,
_mergeResus: function(){
try{ PATIENTS.forEach(function(p){ fxResusFromPub(p, Backend._pubResus[p.publicToken]); }); }catch(e){}   /* never straight onto the badge */
},
refetch: async function(){
_persistLock = true;
try{
const docs = await fvVisitsGetServer();   /* n92: never rebuild the board from the local cache */
Backend._gotVisits=true;   /* n272 */
var pvxKeep=window.fvUnsavedTake?fvUnsavedTake():null;   /* n252 */
PATIENTS = docs.map(function(d){ return mapToApp(Object.assign({ id:d.id }, d.data())); }).concat(PATIENTS.filter(function(p){ return p._demo; }));
Backend._lastRows = fvRowsCopy(PATIENTS);   /* n252: the server's copy, taken now (edits during the next read are this screen's) */
if(window.fvUnsavedPut) fvUnsavedPut(pvxKeep);
Backend._liveAt=Date.now();

const pub = await DB.collection('pub').where('tenant_id','==',TENANT_ID).get();
Backend._pubResus = {};
pub.docs.forEach(function(d){ const v=d.data(); if(v.resus_pref) Backend._pubResus[d.id]={ pref:v.resus_pref, status:v.resus_status||'client_selected', at:v.resus_recorded_at||null }; });
Backend._mergeResus();
if(Backend.conn!=='live') Backend.setConn('live');
}catch(e){ console.warn('[visits] refresh failed — keeping the board on screen',(e&&e.message)||e); Backend.setConn('reconnecting'); fvResubscribeSoon(); }
try{ if(typeof renderAll==='function') renderAll(); }catch(e){}
_persistLock = false;
try{ if(activePatient){ const p=PATIENTS.find(function(x){return x.id===activePatient;}); if(p && typeof fillDrawer==='function') fillDrawer(p); } }catch(e){}
},
lobbyStart: async function(){
document.body.classList.add('tv-mode');
if(Backend.unsubAlertLobby){ try{ Backend.unsubAlertLobby(); }catch(e){} }
Backend.unsubAlertLobby = DB.collection('alerts').doc(TENANT_ID)
.onSnapshot(function(d){
const row=d.exists?d.data():null;
currentAlert=(row&&row.active&&row.show_client!==false)?row:null;
try{ renderAlert(); }catch(e){}
}, function(){ Backend.setConn('error'); });

if(Backend.unsubPubLobby){ try{ Backend.unsubPubLobby(); }catch(e){} }
Backend.unsubPubLobby = DB.collection('lobby').where('tenant_id','==',TENANT_ID)
.onSnapshot(async function(snap){
_persistLock = true;
PATIENTS = snap.docs.map(function(d){ return mapSafeToApp(Object.assign({ id:d.id }, d.data())); })
.filter(function(p){ return p.active; });
_persistLock = false;
if(typeof renderClient==='function') renderClient(); else if(typeof renderAll==='function') renderAll();
try{ if(typeof renderAlert==='function') renderAlert(); }catch(e){}
Backend.setConn('live');
}, function(){ Backend.setConn('error'); });
try{ if(typeof switchView==='function') switchView('client'); }catch(e){}
try{ lobbyArmFullscreen(); }catch(e){}
},
lobbyLoad: async function(){ }
};
