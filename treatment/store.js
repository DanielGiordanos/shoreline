
/* ═══════════════════════════════════════════════════════════════════════
   TREATMENT SHEETS · DATABASE LAYER
   Every admitted patient has one live sheet in Firestore (same project and sign-in as Pravix Flow):
     sheets/{sheetId} = { tenant_id, status, visit_id, patient{…}, orders{id:order}, marks{taskKey:mark},
                          notes[…], audit[…], created_at, created_by, updated_at }
   • marks are keyed per treatment slot ("20260930_o1_600"), so two techs charting different
     cells at the same moment never overwrite each other (field-level updates).
   • The screen keeps working offline; changes sync when the connection returns.
   The prototype UI is unchanged: this layer loads a sheet into its data (VISIT / ORDERS / TASKS /
   NOTES / AUDIT) and writes back only what changed.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
var CFG={apiKey:'AIzaSyCf8iXW_wWRLvHi1G4YnYRH-iLpaDufZQE',authDomain:'shoreline-flow.firebaseapp.com',projectId:'shoreline-flow',
  storageBucket:'shoreline-flow.firebasestorage.app',messagingSenderId:'237404385636',appId:'1:237404385636:web:1ee3ba27f22c946f748a71'};
var TENANT='shoreline', COL='sheets', FV=null, DB=null, AUTH=null;
try{ if(!firebase.apps.length) firebase.initializeApp(CFG); DB=firebase.firestore(); AUTH=firebase.auth(); FV=firebase.firestore.FieldValue;
  DB.enablePersistence({synchronizeTabs:true}).catch(function(){}); }catch(e){ console.warn('Treatment Sheets: Firebase unavailable',e); }

/* ---------- helpers ---------- */
function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function pad(n){ return (n<10?'0':'')+n; }
function dayKey(d){ d=d||new Date(); return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate()); }
function midnight(){ var d=new Date(); d.setHours(0,0,0,0); return d.getTime(); }
function minToISO(min){ return new Date(midnight()+Math.round(min*60000)).toISOString(); }
function isoToMin(iso){ var t=new Date(iso).getTime(); return isNaN(t)?0:(t-midnight())/60000; }
function clean(o){ return JSON.parse(JSON.stringify(o,function(k,v){ return (k==='order'||k.charAt(0)==='_')?undefined:v; })); }
function user(){ var u=AUTH&&AUTH.currentUser; if(!u) return {uid:'',name:'',initials:'—'};
  var name=u.displayName||(u.email||'').split('@')[0].split(/[._]+/).map(function(w){ return w.charAt(0).toUpperCase()+w.slice(1); }).join(' ');
  var parts=name.trim().split(/\s+/); return {uid:u.uid,name:name,initials:((parts[0]||'')[0]||'').toUpperCase()+((parts.length>1?parts[parts.length-1][0]:'')||'').toUpperCase()}; }
window.tsMe=function(){ return user().initials||'—'; };

/* the sample timeline generator is prototype-only */
try{ seedAudit=function(){}; }catch(e){}

/* ---------- real clock (the prototype ran on a simulated 10:12 AM) ---------- */
nowMin=function(){ var d=new Date(); return d.getHours()*60+d.getMinutes()+d.getSeconds()/60; };

/* ---------- the default treatment sheet every admission starts with ---------- */
var DEFAULT_ORDERS=[
  ['Temperature','obs','Basic Observation','q4h','°F'],['Heart Rate','obs','Basic Observation','q4h','bpm'],['Respiratory Rate','obs','Basic Observation','q4h','rpm'],
  ['CRT','obs','Basic Observation','q4h'],['Mucous Membrane','obs','Basic Observation','q4h'],['Mentation','obs','Basic Observation','q4h'],['Pain Score','obs','Basic Observation','q4h'],
  ['Weight','obs','Basic Observation','q24h','kg',8],['Food','obs','Basic Observation','q8h'],['Water','obs','Basic Observation','q8h'],
  ['Urination','obs','Basic Observation','q8h',null,2],['Defecation','obs','Basic Observation','q8h',null,2],
  ['Check IV catheter','care','Patient Care','q4h'],['Walk','care','Patient Care','q6h',null,2],['Cage cleaned','care','Patient Care','q8h',null,4]];
function defaultOrders(startHour){ var out={}; DEFAULT_ORDERS.forEach(function(r,i){ var id='d'+(i+1);
  out[id]={id:id,name:r[0],type:r[1],section:r[2],freq:r[3],start:r[5]!=null?r[5]:((startHour||0)+1)%4};   /* first round at the next full hour after admission */ if(r[4]) out[id].unit=r[4]; }); return out; }
window.tsDefaultOrders=defaultOrders;

/* ---------- state ---------- */
var WANT=null, WANT_GO=false, SHEETS=[], CUR=null, curDoc=null, unsubCur=null, unsubList=null, ready=false, IPL=[];

/* ---------- storage layout (keeps every record small, however long the stay) ----------
   sheets/{id}                 patient, orders, estimate, notes, recent audit, digest (board summary)
   sheets/{id}/days/{YYYYMMDD} { marks } — that day's charting
   sheets/{id}/log/{auto}      older audit entries, moved out in blocks
   Flow may still drop triage readings into sheets/{id}.marks ("inbox"); they're moved into the day records. */
var DAYS='days', LOGC='log', AUD_MAX=150, AUD_KEEP=100;
var curMain=null, curDays={}, dayLoaded={}, liveDay={}, unsubDays=[], subDk=null, ARCH=[], liveCur=false;
function dayRef(id,dk){ return DB.collection(COL).doc(id).collection(DAYS).doc(dk); }
function prevDk(dk){ var d=new Date(+dk.slice(0,4),+dk.slice(4,6)-1,+dk.slice(6,8)); d.setDate(d.getDate()-1); return dayKey(d); }
function dayReady(){ return !!(curMain&&subDk&&dayLoaded[subDk]); }
function isNum(v){ return v!=null&&v!==''&&isFinite(parseFloat(String(v).replace(/[^\d.\-]/g,''))); }
/* the board's summary: what's done today (slot → 1 completed / 2 other) and the last 3 numeric readings per order */
function computeDigest(marks){ var dk=dayKey(), done={}, by={};
  Object.keys(marks||{}).forEach(function(k){ var m=marks[k]; if(!m||!m.status) return;
    if(k.indexOf(dk+'_')===0) done[k.slice(9)]=m.status==='completed'?1:2;
    if(m.status==='completed'&&m.orderId&&isNum(m.value)){ var mn=Math.round(m.min!=null?m.min:(m.sched||0));
      (by[m.orderId]=by[m.orderId]||[]).push([k,String(m.value),mn,k.slice(0,8)+('0000'+mn).slice(-4)]); } });
  var vit={}; Object.keys(by).sort().forEach(function(o){ vit[o]=by[o].sort(function(a,b){ return a[3]<b[3]?-1:a[3]>b[3]?1:0; }).slice(-3).map(function(r){ return {k:r[0],v:r[1],m:r[2]}; }); });
  var sd={}; Object.keys(done).sort().forEach(function(k){ sd[k]=done[k]; });
  return {dk:dk,done:sd,vit:vit}; }
/* board-side stand-in for a sheet's charting, rebuilt from its digest (+ any inbox readings) */
function synthMarks(x,raw){ var m={}, g=x.digest, dk=dayKey();
  if(g){ if(g.dk===dk) Object.keys(g.done||{}).forEach(function(k){ m[dk+'_'+k]={status:g.done[k]===1?'completed':'skipped'}; });
    Object.keys(g.vit||{}).forEach(function(o){ (g.vit[o]||[]).forEach(function(r){ if(r&&r.k) m[r.k]={status:'completed',value:r.v,min:r.m,sched:r.m,orderId:o}; }); }); }
  Object.keys(raw||{}).forEach(function(k){ if(raw[k]) m[k]=raw[k]; });
  return m; }
function compose(){ if(!curMain) return null; var m={};
  Object.assign(m,curDays[prevDk(subDk)]||{},curDays[subDk]||{});
  var inbox=curMain.marks||{}; Object.keys(inbox).forEach(function(k){ var a=inbox[k], b=m[k]; if(a&&(!b||String(a.at||'')>=String(b.at||''))) m[k]=a; });
  var d=Object.assign({},curMain); d.marks=m; return d; }
var recT=null;
function recompose(now){ if(!curMain||!dayLoaded[subDk]) return; clearTimeout(recT);
  var go=function(){ curDoc=compose(); hydrate(); rerender(); try{ flagsDirty(); }catch(e){} saveCacheSoon(); scheduleSync(); };
  if(now) go(); else recT=setTimeout(go,16); }
/* move inbox readings into day records, refresh the digest, archive old audit — in one transaction, safe from any screen */
var refreshing={}, lastTry={}, refreshQ=Promise.resolve();
function needsRefresh(x){ return Object.keys(x._inbox||{}).length>0||x.digest_dirty||!x.digest||(x.audit||[]).length>AUD_MAX; }
function maybeRefresh(x){ if(!x||!AUTH||!AUTH.currentUser||!needsRefresh(x)) return; var id=x._id, now=Date.now();
  if(refreshing[id]||now-(lastTry[id]||0)<20000) return; lastTry[id]=now; refreshing[id]=1;
  refreshQ=refreshQ.then(function(){ return refreshSheet(id); }).catch(function(e){ console.warn('[sheet refresh]',id,e); }).then(function(){ refreshing[id]=0; }); }
function refreshSheet(id){ var ref=DB.collection(COL).doc(id), today=dayKey(), yday=prevDk(today), nowIso=new Date().toISOString();
  return DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ if(!snap.exists) return; var d=snap.data()||{}, inbox=d.marks||{}, dks={};
    dks[today]=1; dks[yday]=1; Object.keys(inbox).forEach(function(k){ if(/^\d{8}_/.test(k)) dks[k.slice(0,8)]=1; }); var list=Object.keys(dks);
    return Promise.all(list.map(function(dk){ return t.get(dayRef(id,dk)); })).then(function(snaps){
      var days={}; snaps.forEach(function(s,i){ days[list[i]]=Object.assign({},(s.exists&&s.data().marks)||{}); });
      var writes={}; Object.keys(inbox).forEach(function(k){ var a=inbox[k]; if(!a||!/^\d{8}_/.test(k)) return; var dk=k.slice(0,8), b=days[dk][k];
        if(!b||String(a.at||'')>=String(b.at||'')){ days[dk][k]=a; (writes[dk]=writes[dk]||{})[k]=a; } });
      Object.keys(writes).forEach(function(dk){ t.set(dayRef(id,dk),{dk:dk,marks:writes[dk],updated_at:nowIso},{merge:true}); });
      var upd={digest:computeDigest(Object.assign({},days[yday],days[today]))};
      if(Object.keys(inbox).length) upd.marks=FV.delete();
      if(d.digest_dirty) upd.digest_dirty=FV.delete();
      var au=d.audit||[]; if(au.length>AUD_MAX){ var cut=au.length-AUD_KEEP, old=au.slice(0,cut);
        t.set(ref.collection(LOGC).doc(),{entries:old,from:old[0]&&old[0].at||null,to:old[old.length-1]&&old[old.length-1].at||null,created_at:nowIso});
        upd.audit=au.slice(cut); upd.audit_archived=(d.audit_archived||0)+old.length; }
      t.update(ref,upd); }); }); }); }
function loadArchive(id){ ARCH=[]; DB.collection(COL).doc(id).collection(LOGC).get().then(function(qs){ if(CUR!==id) return; var all=[];
  qs.forEach(function(doc){ (doc.data().entries||[]).forEach(function(a){ all.push(a); }); }); ARCH=all; if(curDoc){ hydrate(); rerender(); } }).catch(function(){}); }
var SECTION_ORDER=['Basic Observation','Continuous Infusions','Medications','Patient Care','Diagnostics'];

/* Start from an empty screen: the prototype's sample patient is not real data */
var BLANK_VISIT={id:'',patient:'',client:'',species:'Dog',breed:'—',sex:'—',age:'—',weight:0,temp:'—',hr:'—',rr:'—',mm:'—',crt:'—',mentation:'—',dept:'ER',
  doctorFrom:'—',doctorTo:'—',location:'—',status:'Stable',code:'—',ecollar:'—',allergies:'None known',estimate:'—',admit:'—',day:'Day 1',service:'ER',department:'Emergency',
  hospStatus:'Hospitalized',pain:'—',bsa:'—',rer:'—',checkin:'—',liaison:'Not assigned',dischargeDate:'Not set',dischargeTime:'Not set',commPref:'—',updatePref:'—',lastUpdate:'—',nextUpdate:'—',commNote:'',
  estLow:0,estHigh:0,estCurrent:0,estApprovedBy:'—',estApprovedTime:'—',estClientInitials:'—',estLastUpdated:'—',estPlan:'—',complaint:'—',problems:[],plan:[],alerts:[],pending:[]};
function setVisit(v){ Object.keys(VISIT).forEach(function(k){ delete VISIT[k]; }); Object.assign(VISIT,BLANK_VISIT,v||{}); }
function reset(){ setVisit({}); ORDERS=[]; TASKS=[]; NOTES=[]; AUDIT=[]; OTHERS.length=0; }
reset();

/* ---------- mapping between Firestore and the screen ---------- */
function fmtAdmit(iso){ try{ var d=new Date(iso); return (d.getMonth()+1)+'/'+d.getDate()+' · '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return '—'; } }
function dayOf(iso){ try{ var n=Math.floor((midnight()-new Date(new Date(iso).setHours(0,0,0,0)).getTime())/86400000)+1; return 'Day '+Math.max(1,n); }catch(e){ return 'Day 1'; } }
function visitFrom(d){ var p=d.patient||{}; var full=((p.name||'')+' '+(p.last||'')).trim()||'Unnamed patient';
  var latest=function(name){ var o=Object.values(d.orders||{}).find(function(x){ return x.name===name; }); if(!o) return '—';
    var ms=Object.keys(d.marks||{}).map(function(k){ return d.marks[k]; }).filter(function(m){ return m&&m.orderId===o.id&&m.status==='completed'&&m.value; })
      .sort(function(a,b){ return (b.at||'').localeCompare(a.at||''); }); return ms[0]?ms[0].value:'—'; };
  return {id:String(d.visit_id||d._id||'').replace(/^[a-z]_/,'').slice(-6).toUpperCase(), vcode:d.visit_code||'', patient:full, client:p.last||p.owner||'—', species:p.species||'Dog', breed:p.breed||'—', sex:sexLabel(p.sex)||'—', age:p.age||'—',
    weight:Number(p.weight)||0, temp:latest('Temperature'), hr:latest('Heart Rate'), rr:latest('Respiratory Rate'), mm:latest('Mucous Membrane'), crt:latest('CRT'), mentation:latest('Mentation'), pain:latest('Pain Score'),
    doctorFrom:p.doctor||'—', doctorTo:p.doctor||'—', location:p.location||'—', status:p.condition||'Stable', code:p.code||'—', allergies:p.allergies||'None known',
    admit:fmtAdmit(d.admitted_at||d.created_at), checkin:fmtAdmit(d.admitted_at||d.created_at), day:dayOf(d.admitted_at||d.created_at),
    complaint:p.reason||'—', problems:p.problems&&p.problems.length?p.problems:(p.reason?[p.reason]:[]), plan:p.plan||[], alerts:p.alerts||[], pending:[], owner:p.owner||'', phone:p.phone||''}; }
function hydrate(){
  var d=curDoc; if(!d){ reset(); return; }
  setVisit(visitFrom(d));
  ORDERS=Object.keys(d.orders||{}).map(function(k){ return d.orders[k]; }).filter(function(o){ return o&&!o.dc; })
    .sort(function(a,b){ return (SECTION_ORDER.indexOf(a.section)-SECTION_ORDER.indexOf(b.section))||String(a.id).localeCompare(String(b.id),undefined,{numeric:true}); });
  buildTasks();
  NOTES=(d.notes||[]).map(function(n){ return {min:isoToMin(n.at),type:n.type||'nursing',author:n.author||'—',role:n.role||'',body:n.body||'',_srv:1}; });
  AUDIT=ARCH.concat(d.audit||[]).map(function(a){ return {min:isoToMin(a.at),type:a.type||'doctor',desc:a.desc||'',who:a.who||'',_srv:1}; }).sort(function(a,b){ return a.min-b.min; });
  OTHERS.length=0; SHEETS.filter(function(s){ return s._id!==CUR; }).forEach(function(s){ var p=s.patient||{};
    OTHERS.push({name:((p.name||'')+' '+(p.last||'')).trim(),species:p.species||'Dog',sig:[p.species,p.breed,p.sex,p.weight?p.weight+' kg':''].filter(Boolean).join(' · '),
      status:p.condition||'Stable',doctor:p.doctor||'—',loc:p.location||'—',code:p.code||'—',problems:p.reason?[p.reason]:[],due:0,late:0,last:'—',rounds:'Pending'}); });
  var ini=(VISIT.patient||'?').split(/\s+/).map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
  document.querySelectorAll('#completionDrawer .pt-emoji, #noteDrawer .pt-emoji').forEach(function(e){ e.firstChild&&(e.firstChild.nodeValue=ini); });
  var ns=document.querySelector('#noteDrawer .dh-top .sub'); if(ns) ns.textContent=VISIT.patient+' · '+VISIT.location;
}
/* Tasks come from the orders' schedule for today, with whatever has been charted laid on top */
buildTasks=function(){
  TASKS=[]; var dk=dayKey(), marks=(curDoc&&curDoc.marks)||{};
  var adm=curDoc&&(curDoc.admitted_at||curDoc.created_at), from=(adm&&dayKey(new Date(adm))===dk)?isoToMin(adm):-1;
  ORDERS.forEach(function(o){ if(o.cont) return; freqTimes(o).forEach(function(h){ var min=h*60, key=dk+'_'+o.id+'_'+min, m=marks[key]; if(min<from&&!m&&!o.ordered_at) return;   /* the admission cutoff is for the starter orders; a doctor's order shows from the time they chose */
    TASKS.push({id:key,key:key,orderId:o.id,order:o,sched:min,status:m?m.status:null,by:m?m.by:null,completedMin:m&&m.min!=null?m.min:null,value:m?m.value:null,notes:m?m.notes:null,severity:0}); }); });
  Object.keys(marks).forEach(function(k){ if(k.indexOf(dk+'_')!==0||TASKS.some(function(t){ return t.key===k; })) return; var m=marks[k]; if(!m) return;
    var o=ORDERS.find(function(x){ return x.id===m.orderId; }); if(!o) return;
    TASKS.push({id:k,key:k,orderId:o.id,order:o,sched:m.sched!=null?m.sched:(m.min||0),status:m.status,by:m.by,completedMin:m.min,value:m.value,notes:m.notes,severity:0,adhoc:true}); });
};

/* ---------- writing back only what changed ---------- */
function markOf(t){ if(!t.status) return null; return {status:t.status,by:t.by||user().initials||null,min:t.completedMin!=null?Math.round(t.completedMin):null,
  value:t.value!=null&&t.value!==''?String(t.value):null,notes:t.notes||null,orderId:t.orderId,sched:Math.round(t.sched)}; }
function same(a,b){ var f=function(m){ return m?JSON.stringify([m.status,m.by,m.min,m.value,m.notes]):'null'; }; return f(a)===f(b); }
var syncT=null, syncing=false;
function scheduleSync(){ clearTimeout(syncT); syncT=setTimeout(sync,350); }
function sync(){
  if(!CUR||!curDoc||!DB||syncing||!AUTH||!AUTH.currentUser||!dayReady()) return; var upd={}, n=0, dk=dayKey(), me=user(), marks=curDoc.marks||(curDoc.marks={});
  /* charting goes to the day's own record (sheets/{id}/days/{YYYYMMDD}); the sheet itself stays small */
  var dayUpd={}, dn=0, inbox=(curMain&&curMain.marks)||{};
  TASKS.forEach(function(t){ if(!t.key){ t.key=dk+'_'+t.orderId+'_x'+Math.round(t.sched); }
    var m=markOf(t), old=marks[t.key]; if(same(m,old)) return;
    if(m){ m.at=new Date().toISOString(); m.uid=me.uid; } dayUpd[t.key]=m||FV.delete(); if(inbox[t.key]) upd['marks.'+t.key]=FV.delete();
    marks[t.key]=m||undefined; if(!m) delete marks[t.key]; dn++; });
  /* a charted slot that no longer exists on screen (undo of an extra reading) is removed */
  var live={}; TASKS.forEach(function(t){ if(t.key) live[t.key]=1; });
  Object.keys(marks).forEach(function(k){ if(k.indexOf(dk+'_')!==0||live[k]) return; var m=marks[k]; if(!m||!ORDERS.some(function(o){ return o.id===m.orderId; })) return;
    dayUpd[k]=FV.delete(); if(inbox[k]) upd['marks.'+k]=FV.delete(); delete marks[k]; dn++; });
  if(dn) n++;
  /* the board's summary of this sheet (what's done today + the latest readings) */
  var dg=computeDigest(marks); if(curMain&&liveDay[subDk]&&liveDay[prevDk(subDk)]&&JSON.stringify(dg)!==JSON.stringify(curMain.digest||null)){ upd.digest=dg; curMain.digest=dg; curDoc.digest=dg; n++; }
  var so=curDoc.orders||(curDoc.orders={}), seen={};
  ORDERS.forEach(function(o){ seen[o.id]=1; var c=clean(o); if(JSON.stringify(c)!==JSON.stringify(so[o.id])){ upd['orders.'+o.id]=c; so[o.id]=c; n++; } });
  Object.keys(so).forEach(function(id){ if(!seen[id]&&!so[id].dc){ so[id]=Object.assign({},so[id],{dc:true,dc_at:new Date().toISOString()}); upd['orders.'+id]=so[id]; n++; } });
  var newNotes=NOTES.filter(function(x){ return !x._srv; }), newAudit=AUDIT.filter(function(x){ return !x._srv; });
  if(newNotes.length){ upd.notes=FV.arrayUnion.apply(null,newNotes.map(function(x){ x._srv=1; return {at:minToISO(x.min),type:x.type,author:x.author,role:x.role,body:x.body,uid:me.uid}; })); n++; }
  if(newAudit.length){ upd.audit=FV.arrayUnion.apply(null,newAudit.map(function(x){ x._srv=1; return {at:minToISO(x.min),type:x.type,desc:x.desc,who:x.who,uid:me.uid}; })); n++; }
  if(!n) return;
  var nowIso=new Date().toISOString(); upd.updated_at=nowIso; upd.updated_by=me.name||null;
  var b=DB.batch(), ref=DB.collection(COL).doc(CUR);
  if(dn) b.set(dayRef(CUR,dk),{dk:dk,marks:dayUpd,updated_at:nowIso},{merge:true});
  b.update(ref,upd);
  syncing=true; b.commit().catch(function(e){ console.warn('sheet save failed',e); try{ toast('Couldn’t save — will retry'); }catch(_){} })
    .then(function(){ syncing=false; }); setTimeout(function(){ syncing=false; },4000);
  try{ flagsDirty(); }catch(e){}
}
/* saves happen right after each change (scheduleSync); this is only a safety net */
setInterval(sync,10000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') sync(); });
window.addEventListener('pagehide',sync);
/* save right after any change the sheet makes */
['buildGrid','logEvent','renderNotes','renderSheet','renderVitals'].forEach(function(fn){ try{ var o=window[fn]; if(typeof o!=='function') return;
  window[fn]=function(){ var r=o.apply(this,arguments); scheduleSync(); return r; }; }catch(e){} });
try{ var _lg=logEvent; logEvent=function(type,desc,who){ return _lg(type,desc,(who==='DG'?user().initials:who)||user().initials); }; }catch(e){}

/* ---------- empty state when no patient is open ---------- */
function emptyHTML(){ return '<div class="ts-empty"><div class="ts-empty-card"><div class="ic">'+
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17.5" rx="2.5"/><path d="M9 3.5h6v2.5H9z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg></div>'+
  '<b>No patient open</b><span>Choose a patient from the IP Board, or start a new sheet.</span>'+
  '<div class="row"><button type="button" class="ts-btn" onclick="selectCTab(\'dash\')">IP Board</button><button type="button" class="ts-btn primary" onclick="tsNewSheet()">New sheet</button></div></div></div>'; }
['renderSheet','renderVitals','renderRounds','renderTimeline','renderNotes'].forEach(function(fn){ var tab={renderSheet:'sheet',renderVitals:'vitals',renderRounds:'rounds',renderTimeline:'timeline',renderNotes:'notes'}[fn];
  try{ var o=window[fn]; window[fn]=function(){ if(!CUR||!curDoc){ var el=document.getElementById('ctab-'+tab); if(el) el.innerHTML=CUR?'<div class="ts-empty"><div class="ts-empty-card"><span>Opening sheet…</span></div></div>':emptyHTML(); if(fn==='renderSheet') renderedFor=null; return; } if(fn==='renderSheet'){ renderedFor=CUR; var r=o.apply(this,arguments); requestAnimationFrame(scrollToNow); return r; } return o.apply(this,arguments); }; }catch(e){} });

var renderedFor=null;
/* code-status chip reflects the sheet (prototype had DNR hard-coded) */
window.tsCodePill=function(always){ var c=String(VISIT.code||'').toUpperCase(); if(!c||c==='—') return always?'—':'';
  return c==='DNR'?'<span class="pill code-dnr">DNR</span>':'<span class="pill soft">'+c+'</span>'; };
/* header vitals follow live charting without a full re-render */
function refreshEstimate(){ var c=document.querySelector('#ctab-sheet .est-card'); if(!c||typeof window.estimateCard!=='function') return; var h=window.estimateCard(); if(c.outerHTML!==h){ var t=document.createElement('div'); t.innerHTML=h; if(t.firstElementChild) c.replaceWith(t.firstElementChild); } }
function refreshHeader(){ try{ refreshEstimate(); }catch(e){} var vs=document.querySelectorAll('.cmd-vitals .vstat .vv'); if(vs.length<4) return;
  var vals=[VISIT.temp==='—'?'—':VISIT.temp+'°',VISIT.hr,VISIT.rr,VISIT.mm]; vs.forEach(function(e,i){ if(i<4&&e.textContent!==String(vals[i])) e.textContent=vals[i]; }); }
/* open the grid at "now" instead of midnight */
function scrollToNow(){ var sh=document.getElementById('sheetScroll'); if(!sh) return; var x=240+(nowMin()/60)*54; sh.scrollLeft=Math.max(0,x-240-(sh.clientWidth-240)*0.35); }
function rerender(){ try{ if(currentCTab==='sheet'){ if(curDoc&&renderedFor===CUR&&document.querySelector('#sheetInner')){ buildGrid(); refreshHeader(); } else { renderSheet(); renderedFor=curDoc?CUR:null; } } else if(currentCTab==='vitals') renderVitals(); else if(currentCTab==='dash') renderDash(); else if(currentCTab==='rounds') renderRounds(); else if(currentCTab==='timeline') renderTimeline(); else if(currentCTab==='notes') renderNotes(); }catch(e){ console.warn(e); } updateChip(); }

/* ---------- IP Board: every active sheet ---------- */
function blocksFor(s){ var dk=dayKey(), marks=s.marks||{}, n=nowMin(), out=[];
  var adm=s.admitted_at||s.created_at, from=(adm&&dayKey(new Date(adm))===dk)?isoToMin(adm):-1;   /* same rule as the sheet: nothing is due before admission */
  for(var h=6;h<=20;h++){ var due=0, over=0, done=0, sched=0; if(h*60<from) continue;
    Object.keys(s.orders||{}).forEach(function(id){ var o=s.orders[id]; if(!o||o.dc||o.cont) return; if(freqTimes(o).indexOf(h)<0) return;
      var m=marks[dk+'_'+id+'_'+(h*60)]; if(m&&m.status){ done++; return; } var t=h*60; if(t>n+18) sched++; else if(t>=n-18) due++; else over++; });
    var tot=due+over+done+sched; if(!tot) continue;
    out.push({h:h,status:over?'overdue':due?'due':sched?'scheduled':'completed',label:String(over||due||sched||done)}); }
  return out; }
var SEX_LABEL={male_neutered:'MN',neutered_male:'MN',mn:'MN',female_spayed:'FS',spayed_female:'FS',fs:'FS',male_intact:'M',male:'M',m:'M',female_intact:'F',female:'F',f:'F',unknown:''};
function sexLabel(x){ var k=String(x||'').toLowerCase().replace(/[\s-]+/g,'_'); return SEX_LABEL.hasOwnProperty(k)?SEX_LABEL[k]:(x||''); }
window.tsSexLabel=sexLabel;
function initialsOf(n){ var w=String(n||'').replace(/^dr\.?\s+/i,'').split(/[\s,]+/).filter(Boolean); return w.length?w.map(function(x){ return x[0]; }).join('').slice(0,3).toUpperCase():'—'; }
function boardOf(s){ return s.board==='OP'?'OP Board':'IP Board'; }   /* sheets made before boards existed are inpatients */
/* My Board: patients where the signed-in person is the technician (set in Flow or the Tech column) or the doctor */
function isMine(s){ var me=normName(user().name), p=s.patient||{}; return !!me&&(normName(p.tech)===me||normName(p.doctor)===me); }
window.tsIsMyBoard=function(){ return typeof sbBoard!=='undefined'&&sbBoard==='My Board'; };
window.tsBoardList=function(board){ var my=board==='My Board';
  IPL=SHEETS.filter(function(s){ return my?isMine(s):boardOf(s)===(board||'IP Board'); }).map(function(s){ var p=s.patient||{}, at=s.admitted_at||s.created_at, d=at?new Date(at):null;
    return {_id:s._id,name:((p.name||'')+' '+(p.last||'')).trim()||'Unnamed',sig:(my?(s.board==='OP'?'OP · ':'IP · '):'')+[p.age,sexLabel(p.sex),p.breed].filter(Boolean).join(' ')+(p.weight?' · '+p.weight+' kg':''),
      cage:p.location||'',ls:(['DNR','BLS','ALS','CPR'].indexOf(p.code)>=0?p.code:''),reason:p.reason||'—',dr:initialsOf(p.doctor),ward:p.location||'Treatment Area',inout:'IN',
      date:d?(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear():'',time:d?d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}).replace(' ',''):'',
      alerts:(p.alerts||[]).map(function(x){ return {t:/dnr|caution|aggress|bite/i.test(x)?'crit':'warn',x:x}; }),service:p.service||'Emergency/Critical Care',
      owner:p.owner||'—',phone:p.phone||'—',belongings:p.belongings||'',blocks:blocksFor(s._id===CUR&&curDoc?curDoc:s)}; });
  return IPL; };
window.tsIPList=function(){ return window.tsBoardList('IP Board'); };
window.tsOpenFromBoard=function(i){ if(typeof sbBoard==='undefined'||(sbBoard!=='IP Board'&&sbBoard!=='OP Board'&&sbBoard!=='My Board')) return false; var s=IPL[i]; if(!s) return false; openSheet(s._id,true); return true; };

/* ---------- open / follow one sheet live: the sheet + today's and yesterday's charting ---------- */
function unsubAllCur(){ if(unsubCur){ try{ unsubCur(); }catch(e){} unsubCur=null; } unsubDays.forEach(function(u){ try{ u(); }catch(e){} }); unsubDays=[]; liveCur=false; }
function listenDays(id){ unsubDays.forEach(function(u){ try{ u(); }catch(e){} }); unsubDays=[]; subDk=dayKey(); liveDay={};
  [subDk,prevDk(subDk)].forEach(function(dk){
    unsubDays.push(dayRef(id,dk).onSnapshot(function(s){ if(CUR!==id) return;
      if(!s.metadata.hasPendingWrites) sync();   /* push anything typed locally before taking the server's view */
      curDays[dk]=(s.exists&&s.data().marks)||{}; dayLoaded[dk]=1; if(!s.metadata.fromCache) liveDay[dk]=1; recompose(); },
      function(e){ console.warn('day listen failed',dk,e); dayLoaded[dk]=1; recompose(); })); }); }
/* keep: the cached copy already on screen stays up while the live one connects */
function openSheet(id,goSheet,keep){
  unsubAllCur(); if(!(keep&&CUR===id&&curDoc)){ sync(); CUR=id; curDoc=null; curMain=null; curDays={}; dayLoaded={}; ARCH=[]; }
  try{ localStorage.setItem('tsCurrentSheet',id); history.replaceState(null,'','#sheet='+encodeURIComponent(id)); }catch(e){}
  if(goSheet){ try{ selectCTab('sheet'); }catch(e){} }
  if(!AUTH||!AUTH.currentUser){ return; }   /* signed-in check still running: the live connection starts when it finishes */
  liveCur=true; var archLoaded=false;
  unsubCur=DB.collection(COL).doc(id).onSnapshot(function(snap){
    if(CUR!==id) return;
    if(!snap.exists){ if(!snap.metadata.fromCache){ CUR=null; curDoc=null; curMain=null; reset(); rerender(); } return; }
    if(!snap.metadata.hasPendingWrites) sync();
    var d=snap.data(); d._id=snap.id;
    /* closed on another screen (or an old link): leave it, don't keep charting on a closed sheet */
    if(d.status==='closed'){ if(snap.metadata.hasPendingWrites) return; /* our own close — closeSheetFlow finishes it */ var nm=((d.patient||{}).name||'This patient'); closeCurrent(); try{ selectCTab('dash'); }catch(e){} try{ toast(nm+'’s sheet was closed'); }catch(e){} return; }
    curMain=d; if(!archLoaded&&d.audit_archived){ archLoaded=true; loadArchive(id); }
    d._inbox=d.marks||{}; maybeRefresh(d);
    recompose();
  },function(e){ console.warn('sheet listen failed',e); showGate('rules'); });
  listenDays(id);
}
window.tsOpenSheet=openSheet;
function closeCurrent(){ unsubAllCur(); CUR=null; curDoc=null; curMain=null; curDays={}; dayLoaded={}; ARCH=[]; reset(); try{ localStorage.removeItem('tsCurrentSheet'); history.replaceState(null,'',location.pathname+location.search); }catch(e){} saveCacheSoon(); rerender(); }
/* past midnight: follow the new day's charting */
setInterval(function(){ if(CUR&&liveCur&&subDk&&subDk!==dayKey()){ dayLoaded={}; listenDays(CUR); } },30000);

function sheetFrom(doc){ var x=doc.data(); x._id=doc.id; x._inbox=x.marks||{}; x.marks=synthMarks(x,x._inbox); return x; }
function listen(){
  if(unsubList) return;
  unsubList=DB.collection(COL).where('tenant_id','==',TENANT).where('status','==','active').onSnapshot(function(snap){
    SHEETS=snap.docs.map(sheetFrom).sort(function(a,b){ return String(a.admitted_at||a.created_at).localeCompare(String(b.admitted_at||b.created_at)); });
    if(!ready){ ready=true; pickWant(); }
    /* the first snapshot can come from the local cache before a just-created sheet arrives — keep the link until the server answers */
    if(WANT){ if(SHEETS.some(function(s){ return s._id===WANT; })){ var w=WANT; WANT=null; if(CUR!==w||!liveCur) openSheet(w,WANT_GO,true); }
      else if(!(snap.metadata&&snap.metadata.fromCache)) WANT=null; }
    else if(CUR&&!liveCur) openSheet(CUR,false,true);
    if(!(snap.metadata&&snap.metadata.fromCache)) SHEETS.forEach(maybeRefresh);
    if(CUR&&curDoc) hydrate(); if(currentCTab==='dash') renderDash(); updateChip(); try{ flagsDirty(); }catch(e){} saveCacheSoon();
  },function(e){ console.warn('sheets list failed',e); showGate('rules'); });
}
function pickWant(){ var fromLink=(location.hash.match(/sheet=([^&]+)/)||[])[1]; WANT=fromLink?decodeURIComponent(fromLink):null; WANT_GO=!!WANT;
  if(!WANT){ try{ WANT=localStorage.getItem('tsCurrentSheet'); }catch(e){} } }

/* ---------- instant start: last board + open sheet from this device, replaced by live data as it arrives ---------- */
var CACHE_KEY='tsCache_v1', cacheT=null;
function saveCacheSoon(){ clearTimeout(cacheT); cacheT=setTimeout(saveCache,2500); }
function slimSheet(s){ var o={}; Object.keys(s).forEach(function(k){ if(k!=='marks'&&k!=='audit'&&k!=='notes'&&k!=='_inbox') o[k]=s[k]; }); o.marks=s._inbox||{}; return o; }
function saveCache(){ try{ var u=AUTH&&AUTH.currentUser; if(!u) return;
  var c={v:1,uid:u.uid,at:Date.now(),sheets:SHEETS.map(slimSheet),cur:null};
  if(CUR&&curMain){ var cm=Object.assign({},curMain); delete cm._inbox; cm.audit=(cm.audit||[]).slice(-40);
    c.cur={id:CUR,main:cm,days:{}}; [subDk,prevDk(subDk)].forEach(function(dk){ if(curDays[dk]) c.cur.days[dk]=curDays[dk]; }); }
  localStorage.setItem(CACHE_KEY,JSON.stringify(c)); }catch(e){ try{ localStorage.removeItem(CACHE_KEY); }catch(_){} } }
function clearCache(){ try{ localStorage.removeItem(CACHE_KEY); }catch(e){} }
function paintFromCache(){ var c=null; try{ c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); }catch(e){} if(!c||c.v!==1) return false;
  if(Date.now()-c.at>36*3600000){ clearCache(); return false; }
  SHEETS=(c.sheets||[]).map(function(x){ x._inbox=x.marks||{}; x.marks=synthMarks(x,x._inbox); return x; });
  pickWant(); var want=WANT;
  if(c.cur&&want&&c.cur.id===want){ CUR=want; curMain=c.cur.main; curMain._id=want; curMain._inbox=curMain.marks||{}; curDays=c.cur.days||{}; subDk=dayKey(); dayLoaded={}; dayLoaded[subDk]=1;
    curDoc=compose(); hydrate(); if(WANT_GO){ try{ selectCTab('sheet'); }catch(e){} } }
  return true; }
/* ---------- patient switcher in the sub-nav ---------- */
var chip=null, menu=null;
function buildChip(){ var sub=document.querySelector('.subnav'); if(!sub||chip) return;
  chip=document.createElement('button'); chip.type='button'; chip.id='tsPatientChip'; chip.className='ts-chip';
  var anchor=sub.querySelector('.role-dd'); sub.insertBefore(chip,anchor||sub.querySelector('.search'));
  menu=document.createElement('div'); menu.id='tsPatientMenu'; menu.className='ts-menu'; document.body.appendChild(menu);
  chip.onclick=function(e){ e.stopPropagation(); if(menu.classList.contains('show')){ menu.classList.remove('show'); return; } renderMenu(); var r=chip.getBoundingClientRect(); menu.style.top=(r.bottom+8)+'px'; menu.style.left=Math.max(8,Math.min(r.left,innerWidth-300))+'px'; menu.classList.add('show'); };
  document.addEventListener('click',function(e){ if(menu&&!menu.contains(e.target)) menu.classList.remove('show'); });
  updateChip(); }
function updateChip(){ if(!chip) return; var n=CUR?(VISIT.patient||'Patient'):'No patient open';
  chip.innerHTML='<span class="dot'+(CUR?' on':'')+'"></span><span class="nm">'+esc(n)+'</span>'+(CUR&&VISIT.location&&VISIT.location!=='—'?'<span class="loc">'+esc(VISIT.location)+'</span>':'')+'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>'; }
function renderMenu(){
  var rows=SHEETS.map(function(s){ var p=s.patient||{}; return '<button type="button" class="mi'+(s._id===CUR?' cur':'')+'" data-open="'+esc(s._id)+'"><span class="av">'+esc(((p.name||'?')[0]||'?').toUpperCase())+'</span><span class="tx"><b>'+esc(((p.name||'')+' '+(p.last||'')).trim()||'Unnamed')+'</b><small>'+esc([p.location,p.reason].filter(Boolean).join(' · ')||'—')+'</small></span></button>'; }).join('');
  menu.innerHTML='<div class="mh">Admitted patients</div>'+(rows||'<div class="me">No admitted patients yet.</div>')
    +'<div class="sep"></div><button type="button" class="mi act" data-new="1">＋ New sheet</button>'
    +(CUR?'<button type="button" class="mi act danger" data-close="1">Discharge / close this sheet</button>':'');
  menu.querySelectorAll('[data-open]').forEach(function(b){ b.onclick=function(){ menu.classList.remove('show'); openSheet(b.getAttribute('data-open'),true); }; });
  var nb=menu.querySelector('[data-new]'); if(nb) nb.onclick=function(){ menu.classList.remove('show'); tsNewSheet(); };
  var cb=menu.querySelector('[data-close]'); if(cb) cb.onclick=function(){ menu.classList.remove('show'); closeSheetFlow(); };
}
function closeSheetFlow(){ if(!CUR) return; var nm=VISIT.patient;
  modal('<h3>Close '+esc(nm)+'’s sheet?</h3><p>The sheet leaves the IP Board. Everything charted stays saved.</p>'
    +'<div class="ts-seg" id="tsCloseWhy"><button type="button" class="on" data-v="discharged">Discharged</button><button type="button" data-v="transferred">Transferred</button><button type="button" data-v="deceased">Deceased</button><button type="button" data-v="cancelled">Admitted in error</button></div>',
    'Close sheet',function(){ var why=(document.querySelector('#tsCloseWhy .on')||{}).getAttribute?document.querySelector('#tsCloseWhy .on').getAttribute('data-v'):'discharged', id=CUR, me=user();
      sync(); DB.collection(COL).doc(id).update({status:'closed',closed_reason:why,closed_at:new Date().toISOString(),closed_by:me.name||null,
        audit:FV.arrayUnion({at:new Date().toISOString(),type:'doctor',desc:'Sheet closed — '+why,who:me.initials,uid:me.uid})}).then(function(){ closeCurrent(); selectCTab('dash'); toast(nm+' closed'); })
        .catch(function(){ toast('Couldn’t close the sheet'); }); });
  document.querySelectorAll('#tsCloseWhy button').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('#tsCloseWhy button').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on'); }; });
}

/* ---------- New sheet (for patients not coming from Flow's Admit) ---------- */
function modal(html,okLabel,onOk){ var m=document.getElementById('tsModal'); if(!m){ m=document.createElement('div'); m.id='tsModal'; document.body.appendChild(m); }
  m.innerHTML='<div class="tm-scrim"></div><div class="tm-card" role="dialog" aria-modal="true">'+html+'<div class="tm-foot"><button type="button" class="ts-btn" data-x>Cancel</button><button type="button" class="ts-btn primary" data-ok>'+esc(okLabel)+'</button></div></div>';
  m.classList.add('show'); var close=function(){ m.classList.remove('show'); };
  m.querySelector('.tm-scrim').onclick=close; m.querySelector('[data-x]').onclick=close; m.querySelector('[data-ok]').onclick=function(){ if(onOk()!==false) close(); };
  var f=m.querySelector('input'); if(f) setTimeout(function(){ f.focus(); },60); }
window.tsNewSheet=function(){
  modal('<h3>New treatment sheet</h3><p>For a patient admitted outside Flow. Admitting in Flow creates the sheet automatically.</p><div class="tm-grid">'
    +'<label>Patient name<input id="nsName" placeholder="Bella"></label><label>Owner last name<input id="nsLast" placeholder="Smith"></label>'
    +'<label>Species<select id="nsSp"><option>Dog</option><option>Cat</option><option>Other</option></select></label><label>Weight (kg)<input id="nsWt" inputmode="decimal" placeholder="12.4"></label>'
    +'<label>Breed<input id="nsBreed" placeholder="Labrador"></label><label>Sex<select id="nsSex"><option value="">—</option><option>MN</option><option>FS</option><option>M</option><option>F</option></select></label>'
    +'<label class="wide">Reason for admission<input id="nsReason" placeholder="Vomiting, dehydration"></label>'
    +'<label>Attending doctor<input id="nsDoc" placeholder="Dr. Downes"></label><label>Location<input id="nsLoc" placeholder="ICU Cage 2"></label>'
    +'<label>Code status<select id="nsCode"><option>ALS</option><option>BLS</option><option>DNR</option></select></label><label>Condition<select id="nsCond"><option>Stable</option><option>Watch</option><option>Critical</option></select></label>'
    +'</div><p class="tm-note">Starts with standard observations every 4 hours. The doctor adds meds and fluids on the sheet.</p>','Create sheet',function(){
      var v=function(id){ return (document.getElementById(id)||{}).value||''; }; if(!v('nsName').trim()){ toast('Enter the patient’s name'); return false; }
      var me=user(), now=new Date(), id='s_'+now.getTime().toString(36)+Math.random().toString(36).slice(2,6);
      var doc={tenant_id:TENANT,status:'active',visit_id:null,source:'manual',created_at:now.toISOString(),admitted_at:now.toISOString(),created_by:me.name||null,created_uid:me.uid,
        patient:{name:v('nsName').trim(),last:v('nsLast').trim(),species:v('nsSp'),breed:v('nsBreed').trim(),sex:v('nsSex'),weight:parseFloat(v('nsWt'))||null,reason:v('nsReason').trim(),
          doctor:v('nsDoc').trim(),location:v('nsLoc').trim(),code:v('nsCode'),condition:v('nsCond'),alerts:v('nsCode')==='DNR'?['DNR']:[]},
        orders:defaultOrders(now.getHours()),digest:{dk:dayKey(),done:{},vit:{}},notes:[],audit:[{at:now.toISOString(),type:'doctor',desc:'Sheet created — <b>'+esc(v('nsName').trim())+'</b> admitted',who:me.initials,uid:me.uid}]};
      DB.collection(COL).doc(id).set(doc).then(function(){ toast('Sheet created'); }).catch(function(e){ console.warn(e); toast('Couldn’t create the sheet'); });
      openSheet(id,true); });
};

/* ---------- sign-in gate: same account as Flow ---------- */
var gate=null;
function showGate(kind){ if(!gate){ gate=document.createElement('div'); gate.id='tsGate'; document.body.appendChild(gate); }
  gate.innerHTML=kind==='rules'
    ?'<div class="tg-card"><b>Treatment Sheets can’t reach the database yet</b><span>Your account doesn’t have access to treatment sheets. Ask Daniel to finish the database setup.</span></div>'
    :'<div class="tg-card"><b>Sign in to continue</b><span>Treatment Sheets uses your Pravix Flow account. Sign in on Flow, then come back to this page.</span><a class="ts-btn primary" href="https://shoreline.pravix.app/">Open Flow to sign in</a></div>';
  gate.classList.add('show'); }
function hideGate(){ if(gate) gate.classList.remove('show'); }
if(AUTH){ AUTH.onAuthStateChanged(function(u){ if(u){ hideGate(); var ini=user().initials; if(ini&&ini!=='—'){ var i=STAFF.indexOf(ini); if(i>-1) STAFF.splice(i,1); STAFF.unshift(ini); } listen(); if(CUR&&!liveCur) openSheet(CUR,false,true); rerender(); }
  else { clearCache(); unsubAllCur(); SHEETS=[]; CUR=null; curDoc=null; curMain=null; reset(); try{ rerender(); }catch(e){} showGate('signin'); } }); }
else { showGate('rules'); }

/* ---------- boot ---------- */
function boot(){ buildChip(); if(!ready&&!liveCur){ try{ paintFromCache(); }catch(e){ console.warn('cache paint',e); } } rerender(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else setTimeout(boot,0);
function removeNote(body,min){ if(!CUR||!curDoc) return; var iso=minToISO(min);
  var keep=(curDoc.notes||[]).filter(function(n){ return !(n.body===body&&Math.abs(new Date(n.at).getTime()-new Date(iso).getTime())<90000); });
  curDoc.notes=keep; NOTES=NOTES.filter(function(n){ return !(n.body===body&&Math.abs(n.min-min)<1.5); });
  DB.collection(COL).doc(CUR).update({notes:keep,updated_at:new Date().toISOString()}).catch(function(){}); }
/* ---------- estimate range: stored on the sheet, editable by doctors (and the admin account) — liaisons can be added via EST_EDITORS ---------- */
var EST_EDITORS=['doctor','admin'];
var ADMIN_EMAILS=['daniel.giordano@pravix.app'];
function normName(n){ return String(n||'').toLowerCase().replace(/^dr\.?\s+/,'').replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim(); }
function staffRole(){ var u=AUTH&&AUTH.currentUser; if(!u) return null; var S=window.TS_STAFF||{doctors:[],liaisons:[]}, me=normName(user().name);
  if(ADMIN_EMAILS.indexOf(String(u.email||'').toLowerCase())>-1) return 'admin';
  if(S.doctors.some(function(n){ return normName(n)===me; })) return 'doctor';
  if(S.liaisons.some(function(n){ return normName(n)===me; })) return 'liaison';
  return null; }
function canEditEstimate(){ return EST_EDITORS.indexOf(staffRole())>-1; }
window.tsCanEditEstimate=canEditEstimate;
function estOf(){ var e=curDoc&&curDoc.estimate; return (e&&e.high>0)?e:null; }
function fmtWhen(iso){ try{ var d=new Date(iso); return d.toLocaleDateString([], {month:'short',day:'numeric'})+' · '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return '—'; } }
function applyEstimateToVisit(){ var e=estOf();
  VISIT.estLow=e?Number(e.low)||0:0; VISIT.estHigh=e?Number(e.high)||0:0; VISIT.estCurrent=e?Number(e.current)||0:0; VISIT.estDeposit=(e&&e.deposit!=null&&e.deposit!=='')?Number(e.deposit):null;
  VISIT.estApprovedBy=e?(e.approved_by||'—'):'—'; VISIT.estApprovedTime=e&&e.approved_at?fmtWhen(e.approved_at):'—';
  VISIT.estClientInitials=e?(e.initials||'—'):'—'; VISIT.estPlan=e?(e.plan||'—'):'—';
  VISIT.estLastUpdated=e&&e.updated_at?fmtWhen(e.updated_at)+(e.updated_by?' by '+e.updated_by:''):'—'; }
/* Remaining = deposit − current charges (how much of the client's deposit is left) */
function depositCard(){
  var m=function(n){ return '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var lo=VISIT.estLow, hi=VISIT.estHigh, cur=VISIT.estCurrent, dep=VISIT.estDeposit, hasDep=dep!=null&&dep>0;
  /* gauge = deposit left: full when nothing is charged, drains as charges come in, full red once past the deposit */
  var rem=hasDep?dep-cur:null, over=rem!=null&&rem<0, left=hasDep?Math.max(0,Math.min(100,rem/dep*100)):0, clamped=over?100:left;
  var color=!hasDep?'cyan':over?'red':left>25?'cyan':left>10?'amber':'coral';
  var remLabel=rem==null?'—':(rem>=0?m(rem):'−'+m(-rem));
  var barLabel=rem==null?'No deposit recorded':(rem>=0?m(rem)+' remaining':m(-rem)+' over deposit');
  var labelPos=Math.max(20,Math.min(80,clamped));
  var pending=estOf().approved_by==='Not yet approved';
  var chk='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M8 12.5l2.5 2.5 5.5-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var info='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>';
  return '<div class="panel est-card" tabindex="0" role="button" onclick="openEstimate()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openEstimate();}"><h4>Estimate Range</h4><div class="est">'
    +'<div class="est-range">'+m(lo)+' — '+m(hi)+'</div>'
    +'<div class="est-status"><span class="est-pill '+(pending?'warn':'approved')+'">'+chk+(pending?'Awaiting approval':'Approved')+'</span></div>'
    +'<div class="est-div"></div>'
    +'<div class="est-row"><span class="k">Current Charges</span><span class="v">'+m(cur)+'</span></div>'
    +'<div class="est-row"><span class="k">Deposit</span><span class="v">'+(hasDep?m(dep):'—')+'</span></div>'
    +'<div class="est-row"><span class="k">Remaining</span><span class="v '+color+'">'+remLabel+'</span></div>'
    +'<div class="est-bar-wrap"><div class="est-bar"><div class="est-fill '+color+'" style="width:'+clamped.toFixed(1)+'%"></div><div class="est-cap"></div><div class="est-marklabel '+color+'" style="left:'+labelPos.toFixed(1)+'%">'+barLabel+'</div></div>'
    +'<div class="est-ends"><span><b>'+m(0)+'</b>Used up</span><span class="hi"><b>'+(hasDep?m(dep):'—')+'</b>Deposit</span></div></div>'
    +'<div class="est-note">'+info+(rem!=null&&rem<0?'Charges are past the deposit. Collect an additional deposit before continuing.':'Stay near the low end when possible. Do not exceed the high end without updated client authorization.')+'</div>'
    +'<div class="est-foot">Updated '+VISIT.estLastUpdated+'</div>'
    +'</div></div>';
}
var _origCard=window.estimateCard;
window.estimateCard=function(){
  applyEstimateToVisit();
  if(estOf()) return depositCard();
  var edit=canEditEstimate();
  return '<div class="panel est-card ts-est-empty"'+(edit?' tabindex="0" role="button" onclick="openEstimate()"':'')+'><h4>Estimate Range</h4><div class="est">'
    +'<div class="ts-est-none">No estimate on file</div>'
    +(edit?'<button type="button" class="ts-btn primary ts-est-add" onclick="event.stopPropagation();openEstimate()">Add estimate</button>'
          :'<div class="est-sub">A doctor adds the estimate.</div>')
    +'</div></div>'; };
/* keep Rounds (Flow) in step: low end, high end and bill live on visits/{id}.rounds.auth */
function syncRounds(visitId,lo,hi,cur,me,dep){
  if(!visitId) return; var ref=DB.collection('visits').doc(String(visitId)), now=new Date().toISOString();
  DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
    if(!snap.exists) return 'novisit'; var r=snap.data().rounds; if(!r||typeof r!=='object') return 'norounds';
    var a=(r.auth&&typeof r.auth==='object')?r.auth:null, u={last_by:me.name||null,last_by_uid:me.uid||null,last_at:now};
    if(a&&+a.estimate===hi&&+a.estimateLow===lo&&+a.bill===cur&&(a.deposited==null?null:+a.deposited)===dep) return 'same';
    if(a){ u['rounds.auth.estimate']=hi; u['rounds.auth.estimateLow']=lo; u['rounds.auth.bill']=cur; u['rounds.auth.deposited']=dep; }
    else u['rounds.auth']={hours:[],estimate:hi,estimateLow:lo,deposited:dep,bill:cur,cubexDob:false,payers:[],approvals:[]};
    u['rounds.audit']=FV.arrayUnion({at:now,by:me.name||me.initials,what:'Estimate updated from treatment sheet'});
    t.update(ref,u); return 'synced';
  }); }).catch(function(e){ console.warn('[sheet→rounds estimate]',e); });
}
var _origOpen=window.openEstimate;
window.openEstimate=function(){
  if(!CUR||!curDoc) return;
  applyEstimateToVisit();
  if(!canEditEstimate()){ if(estOf()){ var mm=function(n){ return n==null?'—':'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }, rr=function(k,v){ return '<div><span>'+k+'</span><strong>'+v+'</strong></div>'; }, dp=VISIT.estDeposit;
      openModal('<h2>Estimate Authorization</h2><div class="em-rows">'+rr('Low End',mm(VISIT.estLow))+rr('High End',mm(VISIT.estHigh))+rr('Current Charges',mm(VISIT.estCurrent))+rr('Deposit',mm(dp))+rr('Remaining (deposit − charges)',dp==null?'—':mm(dp-VISIT.estCurrent))+rr('Approved By',esc(VISIT.estApprovedBy))+rr('Approved Time',VISIT.estApprovedTime)+rr('Client Initials',esc(VISIT.estClientInitials))+rr('Last Updated',VISIT.estLastUpdated)+'</div><div class="em-linked"><span>Linked Treatment Plan</span><strong>'+esc(VISIT.estPlan)+'</strong></div>','liaison-modal estimate-modal'); return; } toast('Only doctors can add the estimate'); return; }
  var e=estOf()||{}, pad2=function(n){ return (n<10?'0':'')+n; }, at=e.approved_at?new Date(e.approved_at):new Date();
  var local=at.getFullYear()+'-'+pad2(at.getMonth()+1)+'-'+pad2(at.getDate())+'T'+pad2(at.getHours())+':'+pad2(at.getMinutes());
  var num=function(v){ return v!=null&&v!==''?String(v):''; };
  var opts=['Client — in person','Client — by phone','Client — by email','Not yet approved'].map(function(o){ return '<option'+(o===(e.approved_by||'Client — in person')?' selected':'')+'>'+o+'</option>'; }).join('');
  modal('<h3>'+(estOf()?'Update estimate':'Add estimate')+'</h3><p>'+esc(VISIT.patient)+' · visible on every screen as soon as you save.</p><div class="tm-grid">'
    +'<label>Low end ($)<input id="esLow" inputmode="decimal" placeholder="3,600" value="'+num(e.low)+'"></label>'
    +'<label>High end ($)<input id="esHigh" inputmode="decimal" placeholder="4,500" value="'+num(e.high)+'"></label>'
    +'<label>Current charges ($)<input id="esCur" inputmode="decimal" placeholder="0" value="'+num(e.current)+'"></label>'
    +'<label>Deposit ($)<input id="esDep" inputmode="decimal" placeholder="0" value="'+num(e.deposit)+'"></label>'
    +'<label>Approved<select id="esBy">'+opts+'</select></label>'
    +'<label>Client initials<input id="esIni" maxlength="5" placeholder="JS" value="'+esc(e.initials||'')+'"></label>'
    +'<label>Approved at<input id="esAt" type="datetime-local" value="'+local+'"></label>'
    +'<label>Treatment plan # <input id="esPlan" placeholder="Optional" value="'+esc(e.plan&&e.plan!=='—'?e.plan:'')+'"></label>'
    +'</div><p class="tm-note">Current charges come from the medical record. Update them when you check the account.</p>','Save estimate',function(){
      var v=function(id){ return (document.getElementById(id)||{}).value||''; }, money=function(x){ var n=parseFloat(String(x).replace(/[$,\s]/g,'')); return isFinite(n)?Math.round(n*100)/100:NaN; };
      var lo=money(v('esLow')), hi=money(v('esHigh')), cur=v('esCur').trim()===''?0:money(v('esCur'));
      if(!(lo>=0)||!(hi>0)){ toast('Enter the low and high end'); return false; }
      if(hi<lo){ toast('High end must be at least the low end'); return false; }
      if(!(cur>=0)){ toast('Current charges must be a number'); return false; }
      var dep=v('esDep').trim()===''?null:money(v('esDep')); if(dep!=null&&!(dep>=0)){ toast('Deposit must be a number'); return false; }
      var me=user(), role=staffRole(), now=new Date(), by=v('esBy'), whenD=new Date(v('esAt'));
      var est={low:lo,high:hi,current:cur,deposit:dep,approved_by:by,approved_at:(by==='Not yet approved'||isNaN(whenD))?null:whenD.toISOString(),
        initials:v('esIni').trim().toUpperCase(),plan:v('esPlan').trim(),updated_at:now.toISOString(),updated_by:me.initials,updated_by_name:me.name,updated_by_role:role};
      var fmt=function(n){ return '$'+n.toLocaleString('en-US',{maximumFractionDigits:0}); };
      var desc=(estOf()?'Estimate updated':'Estimate added')+' — <b>'+fmt(lo)+' – '+fmt(hi)+'</b>'+(cur?' · charges '+fmt(cur):'')+(dep!=null?' · deposit '+fmt(dep):'')+(by==='Not yet approved'?' · awaiting approval':'');
      if(curDoc) curDoc.estimate=est; rerender();
      DB.collection(COL).doc(CUR).update({estimate:est,updated_at:now.toISOString(),updated_by:me.initials,
        audit:FV.arrayUnion({at:now.toISOString(),type:'doctor',desc:desc,who:me.initials,uid:me.uid})})
        .then(function(){ toast('Estimate saved'); syncRounds(curDoc&&curDoc.visit_id,lo,hi,cur,me,dep); }).catch(function(err){ console.warn(err); toast('Couldn’t save the estimate'); });
    });
};
/* ---------- log out: save what's pending, sign out (shared with Flow), land on the sign-in screen ---------- */
window.logout=function(){
  var btn=document.getElementById('logoutBtn'); if(btn){ btn.disabled=true; btn.style.opacity='.6'; }
  try{ sync(); }catch(e){}
  var done=function(){ try{ unsubAllCur(); }catch(e){} try{ if(unsubList) unsubList(); }catch(e){} unsubList=null; clearTimeout(cacheT); clearCache();
    try{ localStorage.removeItem('tsCurrentSheet'); }catch(e){}
    if(!AUTH){ location.href='/'; return; }
    AUTH.signOut().catch(function(){}).then(function(){ location.replace('/'); }); };
  setTimeout(done,450);   /* give the last save a moment to leave */
};
/* ---------- medication orders from the Pravix drug reference (dose suggested from the reference; doctor confirms or changes) ---------- */
var DRUGS=null, drugsLoading=null;
function loadDrugs(){ if(DRUGS) return Promise.resolve(DRUGS); if(drugsLoading) return drugsLoading;
  drugsLoading=new Promise(function(res){
    if(window.PRAVIX_DRUGS){ DRUGS=window.PRAVIX_DRUGS.d||[]; return res(DRUGS); }
    var sc=document.createElement('script'); sc.src='drugs.js?v='+(window.TS_DRUGS_VER||'1');
    sc.onload=function(){ DRUGS=(window.PRAVIX_DRUGS||{}).d||[]; res(DRUGS); };
    sc.onerror=function(){ drugsLoading=null; res(null); };
    document.head.appendChild(sc); });
  return drugsLoading; }
function spKey(){ var s=String(VISIT.species||''); return /^(cat|fel)/i.test(s)?'cat':/^(dog|can)/i.test(s)?'dog':null; }
var ROUTE={oral:'PO',intravenous:'IV',subcutaneous:'SQ',intramuscular:'IM',topical:'Topical',ophthalmic:'Ophthalmic',otic:'Otic',rectal:'Rectal',inhaled:'Inhaled',intranasal:'Intranasal',transdermal:'Transdermal'};
function routeOf(e){ return ROUTE[e.rn]||ROUTE[String(e.ro||'').toLowerCase()]||(/^(IV|SQ|SC|IM|PO)$/i.test(e.ro)?String(e.ro).toUpperCase().replace('SC','SQ'):''); }
var FREQS=['Once','q1h','q2h','q4h','q6h','q8h','q12h','q24h','PRN'];
function freqOf(e){ if(e.once) return 'Once'; if(!e.h) return ''; var h=e.h[0]; return FREQS.indexOf('q'+h+'h')>-1?'q'+h+'h':''; }
function unitOf(e){ if(!e.d) return ''; var u=e.d[2]||'mg', b=e.d[3]; if(u==='IU') u='U';
  return b==='kg'?u+'/kg':b==='lb'?u+'/lb':b==='m²'?u+'/m²':u; }
function bsa(kg,sp){ return (sp==='cat'?10:10.1)*Math.pow(kg,2/3)/100; }
function doseTotal(dose,unit,kg,sp){ var per=String(unit).split('/')[1]||'';
  return per==='kg'?dose*kg:per==='lb'?dose*kg*2.20462:per==='m²'?dose*bsa(kg,sp):dose; }
function fmtN(n){ return n>=100?Math.round(n).toString():n>=10?(Math.round(n*10)/10).toString():(Math.round(n*100)/100).toString(); }
/* the sheet's dose math understands mg/kg, mg/lb, mg/m² and fixed doses */
window.medDose=function(o){ var w=Number(VISIT.weight)||0, unit=String(o.unit||'mg/kg'), base=unit.split('/')[0];
  var total=doseTotal(Number(o.dose)||0,unit,w,spKey()), vol=o.conc?total/o.conc:null;
  return {mg:fmtN(total)+' '+base, volume:vol!=null?vol.toFixed(2)+' mL':'—', raw:total}; };

/* first dose/check defaults to now; the rest of today's hours follow */
function hourOpts(){ var ch=Math.floor(nowMin()/60), out='<option value="'+ch+'" selected>Now · '+fmtTime(ch*60)+'</option>';
  for(var h=ch+1;h<24;h++) out+='<option value="'+h+'">'+fmtTime(h*60)+'</option>';
  out+='<optgroup label="Earlier today">'; for(var g=0;g<ch;g++) out+='<option value="'+g+'">'+fmtTime(g*60)+'</option>'; return out+'</optgroup>'; }
/* after adding: scroll to the row, flash it, and say when the next one is due */
function nextDueText(o){ var ts=freqTimes(o), ch=nowMin()/60;
  if(o.freq==='PRN') return 'as needed';
  var up=ts.filter(function(h){ return h>=Math.floor(ch); }); if(up.length) return 'next '+fmtTime(up[0]*60);
  if(ts.length) return 'first '+fmtTime(ts[0]*60)+' (overdue)';
  var iv=FREQ_INT[o.freq]; if(iv){ var nx=(o.start+iv)%24; return 'next '+fmtTime(nx*60)+' tomorrow'; } return 'scheduled'; }
function revealOrder(o){ setTimeout(function(){ var rows=document.querySelectorAll('#sheetInner .rl-name'), el=null;
    rows.forEach(function(r){ if(!el&&r.textContent.trim()===o.name) el=r; }); if(!el) return; var row=el.closest('.grow')||el;
    try{ row.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){ row.scrollIntoView(); } row.classList.add('ts-flash'); setTimeout(function(){ row.classList.remove('ts-flash'); },2400); },120); }
/* ---------- monitoring & patient-care catalog: suggested frequencies, nothing assumed ---------- */
var OBS=[
  ['Blood pressure','obs','mmHg',['q1h','q2h','q4h','q6h','q12h'],'bp doppler nibp hypertension hypotension'],
  ['Blood glucose','obs','mg/dL',['q1h','q2h','q4h','q6h','q8h','q12h'],'bg glucose sugar curve diabetic dka'],
  ['Temperature','obs','°F',['q2h','q4h','q6h','q8h','q12h'],'temp fever'],
  ['Heart rate','obs','bpm',['q1h','q2h','q4h','q6h','q8h'],'hr pulse'],
  ['Respiratory rate','obs','rpm',['q1h','q2h','q4h','q6h','q8h'],'rr breathing'],
  ['Respiratory effort','obs','',['q1h','q2h','q4h','q6h'],'dyspnea breathing effort'],
  ['SpO2','obs','%',['q1h','q2h','q4h','q6h'],'pulse ox oxygen saturation spo2 sat'],
  ['Pain score','obs','',['q2h','q4h','q6h','q8h'],'pain cmps'],
  ['Mentation','obs','',['q1h','q2h','q4h','q6h'],'mental status'],
  ['Neuro check','obs','',['q1h','q2h','q4h','q6h'],'neuro mgcs seizure'],
  ['Mucous membranes / CRT','obs','',['q2h','q4h','q6h','q8h'],'mm crt perfusion'],
  ['ECG check','obs','',['q1h','q2h','q4h','q6h'],'ecg ekg arrhythmia rhythm'],
  ['Urine output','obs','mL/kg/hr',['q2h','q4h','q6h','q8h'],'uop urine ins and outs'],
  ['PCV / TS','obs','',['q6h','q8h','q12h','q24h'],'pcv ts hct packed cell'],
  ['Lactate','obs','mmol/L',['q2h','q4h','q6h','q12h'],'lactate'],
  ['Electrolytes','obs','',['q6h','q8h','q12h','q24h'],'lytes potassium sodium'],
  ['Ketones','obs','',['q6h','q8h','q12h','q24h'],'ketone dka'],
  ['Weight','obs','kg',['q12h','q24h'],'weigh'],
  ['Hydration check','obs','',['q4h','q6h','q8h','q12h'],'hydration dehydration skin tent'],
  ['Vomiting check','obs','',['q2h','q4h','q6h'],'vomit emesis'],
  ['Nausea signs','obs','',['q2h','q4h','q6h'],'nausea'],
  ['Appetite check','obs','',['q4h','q6h','q8h','q12h'],'appetite eating'],
  ['Incision check','obs','',['q8h','q12h','q24h'],'incision surgical site'],
  ['Check IV catheter','care','',['q4h','q6h','q8h','q12h'],'iv catheter flush'],
  ['Fluids check','care','',['q1h','q2h','q4h'],'fluid pump line'],
  ['Offer food','care','',['q4h','q6h','q8h','q12h'],'feed food'],
  ['Offer water','care','',['q4h','q6h','q8h'],'water drink'],
  ['Walk','care','',['q4h','q6h','q8h'],'walk outside potty'],
  ['Turn patient','care','',['q2h','q4h','q6h'],'turn recumbent'],
  ['Express bladder','care','',['q4h','q6h','q8h'],'bladder express'],
  ['Eye lubrication','care','',['q2h','q4h','q6h','q8h'],'eye lube lubricant'],
  ['Cold compress','care','',['q4h','q6h','q8h'],'ice cold compress'],
  ['Warm compress','care','',['q4h','q6h','q8h'],'heat warm compress'],
  ['Physical therapy','care','',['q8h','q12h','q24h'],'pt rehab range of motion'],
  ['Oxygen check','care','',['q1h','q2h','q4h'],'oxygen o2 cage'],
  ['Cage cleaned','care','',['q4h','q8h','q12h'],'clean cage bedding']
].map(function(a){ return {n:a[0],t:a[1],u:a[2],f:a[3],k:a[4]}; });
function scoreName(n,q,k){ var l=n.toLowerCase(); if(l===q) return 0; if(l.indexOf(q)===0) return 1; if((' '+l).indexOf(' '+q)>-1||l.indexOf('/ '+q)>-1) return 2;
  if(l.indexOf(q)>-1) return 3; if(k&&(' '+k+' ').indexOf(' '+q)>-1) return 4; return 9; }
function onSheet(name){ var l=name.toLowerCase(); return ORDERS.find(function(o){ return !o.dc&&String(o.name).toLowerCase()===l; }); }

/* ---------- search: medications + monitoring/care + anything typed ---------- */
window.tsRender=function(q){ var raw=(q||'').trim(); q=raw.toLowerCase(); var html='', rows=[], sp=spKey();
  var d=document.getElementById('tsDrop'); if(!d) return;
  if(!DRUGS){ d.innerHTML='<div class="ts-empty">Loading…</div>'; d.style.display='block';
    loadDrugs().then(function(r){ if(r===null){ d.innerHTML='<div class="ts-empty">Couldn’t load the medication list</div>'; return; }
      if(d.style.display!=='none') window.tsRender((document.getElementById('tsSearch')||{}).value||''); }); return; }
  var row=function(key,label,meta){ var k=rows.length; rows.push(key);
    return '<button class="ts-item" data-i="'+k+'" onmouseenter="tsHi('+k+')" onmousedown="event.preventDefault();tsPick(\''+esc(key.replace(/\\/g,'\\\\').replace(/'/g,"\\'"))+'\')"><span>'+label+'</span>'+(meta?'<small class="ts-meta">'+meta+'</small>':'')+'</button>'; };
  if(q){
    var hits=DRUGS.map(function(x,i){ return {i:i,s:scoreName(x.n,q)}; }).filter(function(h){ return h.s<9; })
      .sort(function(a,b){ return a.s-b.s||DRUGS[a.i].n.localeCompare(DRUGS[b.i].n); }).slice(0,6);
    var obs=OBS.map(function(x,i){ return {i:i,s:scoreName(x.n,q,x.k)}; }).filter(function(h){ return h.s<9; }).sort(function(a,b){ return a.s-b.s; }).slice(0,6);
    var obsFirst=obs.length&&(!hits.length||obs[0].s<hits[0].s);
    var medHTML='', obsHTML='', careHTML='';
    hits.forEach(function(h){ var x=DRUGS[h.i], n=sp?x.r.filter(function(e){ return e.s.indexOf(sp)>-1; }).length:x.r.length;
      medHTML+=row('drug:'+h.i,esc(x.n),n?n+(sp?' '+sp:'')+' dose'+(n>1?'s':''):'no '+(sp||'')+' dose listed'); });
    obs.forEach(function(h){ var x=OBS[h.i], ex=onSheet(x.n), meta=ex?'on sheet · '+ex.freq:'suggested '+x.f.slice(0,3).join(' · ');
      if(x.t==='care') careHTML+=row('obs:'+h.i,esc(x.n),meta); else obsHTML+=row('obs:'+h.i,esc(x.n),meta); });
    var blocks=[]; if(medHTML) blocks.push(['Medications',medHTML]); if(obsHTML) blocks.push(['Monitoring',obsHTML]); if(careHTML) blocks.push(['Patient Care',careHTML]);
    if(obsFirst) blocks.sort(function(a,b){ return (a[0]==='Medications')-(b[0]==='Medications'); });
    blocks.forEach(function(b){ html+='<div class="ts-cat">'+b[0]+'</div>'+b[1]; });
    html+='<div class="ts-cat">Custom</div>'+row('custom:'+raw,'Add “'+esc(raw)+'” as an order','choose frequency');
  } else {
    html+='<div class="ts-cat">Medications</div><div class="ts-hint">Type a drug name — '+DRUGS.length+' in the reference</div>';
    html+='<div class="ts-cat">Common monitoring</div>';
    ['Blood pressure','Blood glucose','SpO2','Urine output','Pain score','Neuro check'].forEach(function(n){ var i=OBS.findIndex(function(x){ return x.n===n; }), ex=onSheet(n);
      html+=row('obs:'+i,esc(n),ex?'on sheet · '+ex.freq:'suggested '+OBS[i].f.slice(0,3).join(' · ')); });
  }
  tsRows=rows; tsIdx=rows.length?0:-1; d.innerHTML=html; d.style.display='block'; try{ tsMark(); }catch(e){} };
window.tsPick=function(key){ key=String(key); try{ closeTsDrop(); }catch(e){} var si=document.getElementById('tsSearch'); if(si) si.value='';
  if(!CUR||!curDoc){ toast('Open a patient first'); return; }
  if(key.indexOf('drug:')===0) return openMedOrder(+key.slice(5));
  if(key.indexOf('obs:')===0) return openObsOrder(OBS[+key.slice(4)]);
  if(key.indexOf('custom:')===0) return openObsOrder({n:key.slice(7),t:'obs',u:'',f:[],custom:true});
  var m=OBS.find(function(x){ return x.n.toLowerCase()===key.replace(/\s+q\d+h$/i,'').toLowerCase(); });   /* older quick items */
  return openObsOrder(m||{n:key.replace(/\s+q\d+h$/i,''),t:'obs',u:'',f:[],custom:true}); };

/* ---------- monitoring / care order: pick a frequency (suggestions first) ---------- */
function openObsOrder(x){
  var ex=onSheet(x.n), hrs=hourOpts();
  var chip=function(f,sugg){ return '<button type="button" class="rx-chip'+(sugg?' sugg':'')+'" data-f="'+f+'" onclick="tsObsFreq(this)">'+f+'</button>'; };
  var more=FREQS.filter(function(f){ return x.f.indexOf(f)<0; });
  modal('<h3>'+(x.custom?'New order':esc(x.n))+'</h3><p>'+esc(VISIT.patient)+(ex?' · already on the sheet at <b>'+esc(ex.freq)+'</b> — choosing a frequency updates it':'')+'</p>'
    +(x.custom?'<div class="tm-grid"><label class="wide">Order<input id="obName" value="'+esc(x.n)+'"></label><label>Section<select id="obSec"><option value="obs">Monitoring</option><option value="care">Patient Care</option><option value="diag">Diagnostics</option></select></label><label>Unit<input id="obUnit" placeholder="Optional"></label></div>':'')
    +(x.f.length?'<div class="rx-lbl">Suggested</div><div class="rx-chips">'+x.f.map(function(f){ return chip(f,true); }).join('')+'</div>':'')
    +'<div class="rx-lbl">'+(x.f.length?'Other':'Frequency')+'</div><div class="rx-chips">'+more.map(function(f){ return chip(f,false); }).join('')+'</div>'
    +'<div class="tm-grid" style="margin-top:14px"><label>First check<select id="obStart">'+hrs+'</select></label><label>Notes<input id="obNotes" placeholder="Optional"></label></div>',
    ex?'Update order':'Add to sheet', function(){ return tsObsSubmit(x,ex); });
  window._obsFreq='';
}
window.tsObsFreq=function(b){ document.querySelectorAll('#tsModal .rx-chip').forEach(function(c){ c.classList.toggle('on',c===b); }); window._obsFreq=b.dataset.f; };
function tsObsSubmit(x,ex){
  var v=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); }, f=window._obsFreq;
  var name=x.custom?v('obName'):x.n; if(!name){ toast('Enter the order'); return false; }
  if(!f){ toast('Choose a frequency'); return false; }
  var start=parseInt(v('obStart'),10), me=user(), sec=x.custom?v('obSec'):x.t;
  var section=sec==='care'?'Patient Care':sec==='diag'?'Diagnostics':'Basic Observation', type=sec==='care'?'care':sec==='diag'?'diag':'obs';
  if(ex){ ex.freq=f; ex.start=start; if(v('obNotes')) ex.notes=v('obNotes'); logEvent('doctor','Order changed — <b>'+esc(name)+'</b> now '+f,me.initials); }
  else { var o={id:'c'+Date.now().toString(36),type:type,section:section,name:name,freq:f,start:start,notes:v('obNotes'),ordered_by:me.initials,ordered_at:new Date().toISOString()};
    var unit=x.custom?v('obUnit'):x.u; if(unit) o.unit=unit;
    ORDERS.push(o); logEvent('doctor','Order added — <b>'+esc(name)+'</b> '+f,me.initials); }
  buildTasks(); try{ renderSheet(); }catch(err){ try{ buildGrid(); }catch(_){} } sync();
  var oo=ex||ORDERS[ORDERS.length-1]; toast(name+(ex?' updated':' added')+' · '+nextDueText(oo)); revealOrder(oo); return true; }

/* ---------- medication order: the dose is suggested from the reference; the doctor confirms or changes it ---------- */
var RX=null;
/* the dose a hospital doctor usually means: has a number, injectable first (SQ, then IV, IM, then PO),
   and the general indication before special cases (motion sickness, pre-chemo, etc.) */
var ROUTE_RANK={SQ:0,IV:0.5,IM:1,PO:1.5};
function special(e){ return /motion|travel|chemo|emetogenic|prior to|before|pre-?op|premed|anesthe/i.test(e.i||'')?2:0; }
function regimenScore(e){ var r=routeOf(e); return (e.d?0:10)+(e.st?3:0)+(r?(ROUTE_RANK[r]!=null?ROUTE_RANK[r]:2):3)+special(e)+(freqOf(e)?0:1); }
function bestRegimen(list,route){ var L=route?list.filter(function(e){ return routeOf(e)===route; }):list;
  return L.map(function(e,k){ return [regimenScore(e),k,e]; }).sort(function(a,b){ return a[0]-b[0]||a[1]-b[1]; }).map(function(x){ return x[2]; })[0]||null; }
function openMedOrder(i){
  if(!CUR||!curDoc){ toast('Open a patient first'); return; }
  var x=DRUGS[i]; if(!x) return; var sp=spKey(), kg=Number(VISIT.weight)||0, canOrder=canEditEstimate();
  var mine=x.r.filter(function(e){ return !sp||e.s.indexOf(sp)>-1; }), others=x.r.filter(function(e){ return sp&&e.s.indexOf(sp)<0; });
  RX={i:i,x:x,sel:null,mine:mine,others:others};
  var refBtn=function(e,k,grp){ var tag=e.st?'<span class="rx-tag">'+(e.st==='candidate'?'Candidate':'Qualified')+'</span>':'';
    return '<button type="button" class="rx-ref" data-k="'+grp+k+'" onclick="tsRxPick(\''+grp+'\','+k+')"><b>'+esc(e.do||'See source')+'</b>'
      +'<span>'+esc([routeOf(e)||e.ro,e.fo].filter(Boolean).join(' · '))+'</span>'
      +(e.i?'<small>'+esc(e.i)+'</small>':'')+tag
      +(e.u?'<a href="'+esc(e.u)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">Source ↗</a>':'')+'</button>'; };
  var refs=mine.length?mine.map(function(e,k){ return refBtn(e,k,'m'); }).join('')
    :'<div class="rx-none">No '+(sp||'')+' dose in the reference for this drug — enter the dose.</div>';
  if(others.length) refs+='<details class="rx-other"'+(mine.length?'':' open')+'><summary>'+others.length+' dose'+(others.length>1?'s':'')+' for other species</summary>'
    +others.map(function(e,k){ return refBtn(e,k,'o'); }).join('')+'</details>';
  var opt=function(list,sel){ return list.map(function(v){ return '<option'+(v===sel?' selected':'')+'>'+v+'</option>'; }).join(''); };
  var hrs=hourOpts();
  modal('<h3>'+esc(x.n)+'</h3><p>'+esc(VISIT.patient)+' · '+esc(VISIT.species||'')+' · <b>'+(kg?kg+' kg':'no weight')+'</b>'+(kg?'':' — add a triage weight to calculate doses')+'</p>'
    +'<div class="rx-lbl">Reference doses'+(sp?' · '+(sp==='cat'?'cats':'dogs'):'')+'</div><div class="rx-refs">'+refs+'</div>'
    +'<div class="tm-grid" style="margin-top:14px">'
    +'<label>Dose<span class="rx-dose"><input id="rxDose" inputmode="decimal" placeholder="Enter dose" oninput="tsRxCalc(true)"><select id="rxUnit" onchange="tsRxCalc(true)">'
      +opt(['mg/kg','mcg/kg','U/kg','mL/kg','g/kg','mg/lb','mg/m²','mcg/m²','mg','mcg','U','mL'],'mg/kg')+'</select></span></label>'
    +'<label>Route<select id="rxRoute" onchange="tsRxRoute()"><option value="">Choose…</option>'+opt(['IV','SQ','IM','PO','Topical','Ophthalmic','Otic','Rectal','Inhaled','Intranasal','Transdermal'],'')+'</select></label>'
    +'<label>Frequency<select id="rxFreq"><option value="">Choose…</option>'+opt(FREQS,'')+'</select></label>'
    +'<label>First dose<select id="rxStart">'+hrs+'</select></label>'
    +'<label>Concentration <span id="rxConcU">(mg/mL)</span><input id="rxConc" inputmode="decimal" placeholder="Optional" oninput="tsRxCalc()"></label>'
    +'<label>Notes<input id="rxNotes" placeholder="Optional"></label>'
    +'</div><div class="rx-calc" id="rxCalc">Enter a dose to calculate</div><div class="rx-sugg" id="rxSugg"></div><div class="rx-range" id="rxRange"></div>'
    +(canOrder?'':'<p class="rx-warn rx-block">Signed in as <b>'+esc(user().name||'—')+'</b>. Only doctors can place medication orders.</p>'),
    canOrder?'Add to sheet':'Close', function(){ return canOrder?tsRxSubmit():true; });
  setTimeout(function(){ var c=document.querySelector('#tsModal .tm-card'); if(c) c.classList.add('rx-card');
    var best=bestRegimen(mine); if(best) tsRxPick('m',mine.indexOf(best),true); },30);
}
window.tsOpenMedOrder=function(name){ return loadDrugs().then(function(){ var i=DRUGS.findIndex(function(x){ return x.n.toLowerCase()===String(name).toLowerCase(); }); if(i>-1) openMedOrder(i); return i; }); };
/* tapping a reference (or opening the drug) fills in a suggested dose: the value, or the low end of a range */
window.tsRxRoute=function(){ if(!RX) return; var r=(document.getElementById('rxRoute')||{}).value; if(!r) return;
  if(RX.sel&&routeOf(RX.sel)===r) return;
  var best=bestRegimen(RX.mine,r);
  if(best){ tsRxPick('m',RX.mine.indexOf(best),true); return; }
  RX.sel=null; RX.suggested=null; document.querySelectorAll('#tsModal .rx-ref').forEach(function(b){ b.classList.remove('on'); });
  tsRxCalc(); var sg=document.getElementById('rxSugg'); if(sg){ sg.innerHTML='No '+(spKey()||'')+' reference dose for '+esc(r)+' — enter and confirm the dose.'; sg.style.display='block'; } };
window.tsRxPick=function(grp,k){ if(!RX) return; var e=(grp==='m'?RX.mine:RX.others)[k]; if(!e) return; RX.sel=e; RX.touched=false;
  document.querySelectorAll('#tsModal .rx-ref').forEach(function(b){ b.classList.toggle('on',b.dataset.k===grp+k); });
  var u=unitOf(e), r=routeOf(e), f=freqOf(e), set=function(id,v){ var el=document.getElementById(id); if(el&&v!=null&&v!=='') el.value=v; };
  if(u){ var us=document.getElementById('rxUnit'); if(us&&![].some.call(us.options,function(o){ return o.value===u; })){ var o=document.createElement('option'); o.textContent=u; us.appendChild(o); } set('rxUnit',u); }
  set('rxRoute',r); set('rxFreq',f);
  var dz=document.getElementById('rxDose');
  if(dz){ if(e.d&&e.d[0]!=null){ dz.value=String(e.d[0]); RX.suggested={v:e.d[0],range:e.d[1]!=null&&e.d[1]!==e.d[0]}; } else { dz.value=''; RX.suggested=null; } }
  if(e.c&&e.c[0]&&/mg\/mL/i.test(e.c[1]||'')) set('rxConc',String(e.c[0]));
  tsRxCalc(); };
window.tsRxCalc=function(edited){ var el=document.getElementById('rxCalc'), rg=document.getElementById('rxRange'), sg=document.getElementById('rxSugg'); if(!el) return;
  if(edited&&RX) RX.touched=true;
  var dose=parseFloat((document.getElementById('rxDose')||{}).value), unit=(document.getElementById('rxUnit')||{}).value||'mg/kg', conc=parseFloat((document.getElementById('rxConc')||{}).value);
  var base=unit.split('/')[0], cu=document.getElementById('rxConcU'); if(cu) cu.textContent='('+base+'/mL)';
  var kg=Number(VISIT.weight)||0, sp=spKey(), per=unit.split('/')[1];
  if(!(dose>0)){ el.textContent='Enter a dose to calculate'; el.className='rx-calc'; }
  else if(per&&!kg){ el.textContent='Add a weight to calculate the total dose'; el.className='rx-calc'; }
  else { var tot=doseTotal(dose,unit,kg,sp); el.innerHTML='= <b>'+fmtN(tot)+' '+base+'</b>'+(per?' for '+kg+' kg':'')+(per==='m²'?' · BSA '+bsa(kg,sp).toFixed(2)+' m²':'')+(conc>0?' · <b>'+(tot/conc).toFixed(2)+' mL</b>':''); el.className='rx-calc ok'; }
  var e=RX&&RX.sel, s=RX&&RX.suggested;
  if(sg){ sg.innerHTML=(e&&s&&!RX.touched)?'Suggested from the reference'+(s.range?' (low end of '+esc(e.do)+')':'')+' — confirm or change the dose.':''; sg.style.display=sg.innerHTML?'block':'none'; }
  var msg='';
  if(e&&e.d&&dose>0&&unitOf(e)===unit){ var lo=e.d[0], hi=e.d[1]; if(lo!=null&&hi!=null&&(dose<lo-1e-9||dose>hi+1e-9)) msg='Outside the reference ('+esc(e.do)+'). <label class="rx-ok"><input type="checkbox" id="rxOk"> I confirm this dose</label>'; }
  if(rg){ rg.innerHTML=msg; rg.style.display=msg?'block':'none'; } };
function tsRxSubmit(){
  var v=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); };
  var dose=parseFloat(v('rxDose')), unit=v('rxUnit'), route=v('rxRoute'), freq=v('rxFreq'), start=parseInt(v('rxStart'),10), conc=parseFloat(v('rxConc'));
  if(!(dose>0)){ toast('Enter the dose'); return false; }
  if(!route){ toast('Choose a route'); return false; }
  if(!freq){ toast('Choose a frequency'); return false; }
  var rg=document.getElementById('rxRange'); if(rg&&rg.style.display!=='none'&&!(document.getElementById('rxOk')||{}).checked){ toast('Confirm the dose outside the reference'); return false; }
  var x=RX.x, e=RX.sel, me=user(), now=new Date();
  var o={id:'m'+now.getTime().toString(36),type:'med',section:'Medications',name:x.n,dose:dose,unit:unit,route:route,freq:freq,start:isNaN(start)?Math.ceil(nowMin()/60):start,
    conc:conc>0?conc:null,notes:v('rxNotes'),drug_id:x.id,ordered_by:me.initials,ordered_by_name:me.name,ordered_at:now.toISOString(),dose_source:(e&&RX.suggested&&!RX.touched)?'reference_suggestion':'doctor_entered'};
  if(e) o.ref={dose:e.do,route:e.ro,freq:e.fo,indication:e.i,species:e.s,source:e.u||null};
  ORDERS.push(o); buildTasks();
  var d=medDose(o);
  logEvent('doctor','Order added — <b>'+esc(x.n)+'</b> '+dose+' '+unit+' ('+d.mg+') '+route+' '+freq,me.initials);
  try{ renderSheet(); }catch(err){ try{ buildGrid(); }catch(_){} }
  sync(); toast(x.n+' added · '+nextDueText(o)); revealOrder(o); return true; }
/* the drug reference loads quietly after start-up, so the first search is instant */
setTimeout(function(){ var go=function(){ if(AUTH&&AUTH.currentUser&&!document.hidden) loadDrugs(); else setTimeout(go,8000); };
  if(window.requestIdleCallback) requestIdleCallback(go,{timeout:6000}); else go(); },4000);

/* ═════════ #6 TREND ALERTS + #10 WORKLOAD ═════════
   Alert limits are hospital workflow defaults (not diagnoses) — review with the medical director and adjust FLAG_RULES. */
var FLAG_RULES=[
  {id:'temp', match:/^temperature$/i, label:'Temperature', unit:'°F', lo:99, hi:103.5, clo:97, chi:105, trend:'up', delta:1.0},
  {id:'hr',   match:/^heart rate$/i, label:'Heart rate', unit:'bpm', lo:{dog:60,cat:140}, hi:{dog:180,cat:240}, clo:{dog:45,cat:110}, chi:{dog:220,cat:270}, trend:'up', deltaPct:20},
  {id:'rr',   match:/^respiratory rate$/i, label:'Respiratory rate', unit:'rpm', hi:40, chi:60, trend:'up', delta:10},
  {id:'bg',   match:/blood glucose|^glucose$/i, label:'Blood glucose', unit:'mg/dL', lo:70, hi:300, clo:50, chi:450, trend:'down', deltaPct:30},
  {id:'bp',   match:/blood pressure/i, label:'Systolic BP', unit:'mmHg', lo:90, hi:180, clo:80, chi:200, trend:'down', delta:20},
  {id:'spo2', match:/^spo2$/i, label:'SpO2', unit:'%', lo:95, clo:90, trend:'down', delta:3},
  {id:'lac',  match:/^lactate$/i, label:'Lactate', unit:'mmol/L', hi:2.5, chi:4, trend:'up', delta:1},
  {id:'uop',  match:/^urine output$/i, label:'Urine output', unit:'mL/kg/hr', lo:1, clo:0.5, trend:'down', delta:0.5},
  {id:'pain', match:/^pain score/i, label:'Pain score', unit:'', trend:'up', delta:2}
];
function lim(v,sp){ return (v&&typeof v==='object')?v[sp||'dog']:v; }
function numOf(v){ var m=String(v==null?'':v).match(/-?\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }
function ruleFor(name){ for(var i=0;i<FLAG_RULES.length;i++) if(FLAG_RULES[i].match.test(String(name||'').trim())) return FLAG_RULES[i]; return null; }
function sexSp(species){ var s=String(species||''); return /^(cat|fel)/i.test(s)?'cat':'dog'; }
/* 0 normal · 1 outside limits · 2 critical */
function sevOf(rule,v,sp){ if(v==null) return 0; var clo=lim(rule.clo,sp), chi=lim(rule.chi,sp), lo=lim(rule.lo,sp), hi=lim(rule.hi,sp);
  if((clo!=null&&v<clo)||(chi!=null&&v>chi)) return 2; if((lo!=null&&v<lo)||(hi!=null&&v>hi)) return 1; return 0; }
function fmtV(v){ return (Math.round(v*10)/10).toString(); }
/* flags for one sheet document: latest reading outside limits, or 3 readings in a row moving the wrong way */
function flagsFor(d){ var out=[]; if(!d||!d.orders) return out; var sp=sexSp((d.patient||{}).species), marks=d.marks||{}, acks=d.flag_acks||{};
  var byOrder={}; Object.keys(marks).forEach(function(k){ var m=marks[k]; if(!m||m.status!=='completed'||m.value==null||m.value==='') return; var v=numOf(m.value); if(v==null) return;
    (byOrder[m.orderId]=byOrder[m.orderId]||[]).push({k:k,v:v,t:k.slice(0,8)+'_'+('0000'+Math.round(m.min!=null?m.min:(m.sched||0))).slice(-4)}); });
  Object.keys(byOrder).forEach(function(oid){ var o=d.orders[oid]; if(!o||o.dc) return; var rule=ruleFor(o.name); if(!rule) return;
    var rs=byOrder[oid].sort(function(a,b){ return a.t<b.t?-1:a.t>b.t?1:0; }), last=rs[rs.length-1], unit=rule.unit?' '+rule.unit:'';
    var s=sevOf(rule,last.v,sp);
    if(s){ var lo=lim(rule.lo,sp), clo=lim(rule.clo,sp), low=(lo!=null&&last.v<lo)||(clo!=null&&last.v<clo);
      out.push({key:(rule.id+'_lim_'+last.k).replace(/[^A-Za-z0-9_]/g,'_'),sev:s,rule:rule.id,text:rule.label+' '+fmtV(last.v)+unit+(low?' — low':' — high'),at:last.t}); }
    if(rs.length>=3){ var a=rs[rs.length-3].v,b=rs[rs.length-2].v,c=last.v, up=rule.trend==='up';
      var mono=up?(a<b&&b<c):(a>b&&b>c), chg=Math.abs(c-a), big=rule.deltaPct?(a?chg/Math.abs(a)*100>=rule.deltaPct:false):chg>=rule.delta;
      if(mono&&big) out.push({key:(rule.id+'_trend_'+last.k).replace(/[^A-Za-z0-9_]/g,'_'),sev:Math.max(1,s),rule:rule.id,text:rule.label+(up?' rising':' falling')+': '+fmtV(a)+' → '+fmtV(b)+' → '+fmtV(c)+unit,at:last.t}); } });
  return out.filter(function(f){ return !acks[f.key]; }).sort(function(x,y){ return y.sev-x.sev; }); }
/* abnormal readings are tinted on the grid (amber = outside limits, coral = critical) */
var _btFlags=buildTasks;
buildTasks=function(){ _btFlags.apply(this,arguments); var sp=spKey()||'dog';
  TASKS.forEach(function(t){ if(t.status!=='completed'||t.value==null) return; var r=ruleFor(t.order&&t.order.name); if(!r) return; t.severity=sevOf(r,numOf(t.value),sp); }); };
function canAck(){ return canEditEstimate(); }
window.tsAckFlag=function(sheetId,key,ev){ if(ev){ ev.stopPropagation(); ev.preventDefault(); }
  if(!canAck()){ toast('A doctor acknowledges alerts'); return; }
  var me=user(), now=new Date().toISOString(), u={updated_at:now}; u['flag_acks.'+key]={by:me.initials,name:me.name,at:now};
  var s=sheetId===CUR?curDoc:SHEETS.find(function(x){ return x._id===sheetId; }); var f=s&&flagsFor(s).find(function(x){ return x.key===key; });
  u.audit=FV.arrayUnion({at:now,type:'doctor',desc:'Alert acknowledged — <b>'+esc(f?f.text:key)+'</b>',who:me.initials,uid:me.uid});
  if(s){ s.flag_acks=s.flag_acks||{}; s.flag_acks[key]=u['flag_acks.'+key]; if(FLAG_MEMO) FLAG_MEMO.delete(s); }
  DB.collection(COL).doc(sheetId).update(u).then(function(){ toast('Alert acknowledged'); }).catch(function(e){ console.warn(e); toast('Couldn’t save'); });
  renderFlagsBar(); flagsDirty(); try{ if(currentCTab==='dash') renderDash(); }catch(_){} };
var FL_I='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
function renderFlagsBar(){ var host=document.querySelector('#ctab-sheet .clinical-patient-header'), bar=document.getElementById('tsFlagBar');
  if(!host||!CUR||!curDoc){ if(bar) bar.remove(); return; }
  var fl=flagsFor(curDoc); if(!fl.length){ if(bar) bar.remove(); return; }
  if(!bar){ bar=document.createElement('div'); bar.id='tsFlagBar'; host.insertAdjacentElement('afterend',bar); }
  bar.innerHTML=fl.map(function(f){ return '<div class="ts-flag s'+f.sev+'">'+FL_I+'<span>'+esc(f.text)+'</span>'+(canAck()?'<button type="button" onclick="tsAckFlag(\''+CUR+'\',\''+f.key+'\',event)">Acknowledge</button>':'<small>Doctor notified</small>')+'</div>'; }).join(''); }
var _rrFlags=rerender; rerender=function(){ _rrFlags.apply(this,arguments); try{ renderFlagsBar(); }catch(e){} };
var _rhFlags=refreshHeader; refreshHeader=function(){ _rhFlags.apply(this,arguments); try{ renderFlagsBar(); }catch(e){} };
/* alerts pill in the sub-nav: every open alert in the hospital; the patient's doctor gets a pop-up for new ones */
var pill=null, seenFlags={}, flagsPrimed=false;
try{ seenFlags=JSON.parse(localStorage.getItem('tsSeenFlags')||'{}'); }catch(e){ seenFlags={}; }
var FLAG_MEMO=(typeof WeakMap!=='undefined')?new WeakMap():null;
function flagsOf(d){ if(d===curDoc||!FLAG_MEMO) return flagsFor(d); var f=FLAG_MEMO.get(d); if(!f){ f=flagsFor(d); FLAG_MEMO.set(d,f); } return f; }
function allFlags(){ var out=[]; SHEETS.forEach(function(s){ var d=s._id===CUR&&curDoc?curDoc:s; flagsOf(d).forEach(function(f){ out.push({s:s,f:f}); }); }); return out; }
function renderAlertPill(){ var sub=document.querySelector('.subnav'); if(!sub) return;
  if(!pill){ pill=document.createElement('button'); pill.type='button'; pill.id='tsAlertPill'; pill.className='ts-alert-pill';
    pill.onclick=function(e){ e.stopPropagation(); openAlertMenu(); }; var c=document.getElementById('tsPatientChip'); sub.insertBefore(pill,c||sub.firstChild); }
  var n=allFlags().length; if(pill._n===n) return; pill._n=n; pill.style.display=n?'':'none'; pill.innerHTML=FL_I+'<span>'+n+' alert'+(n===1?'':'s')+'</span>'; }
function openAlertMenu(){ var old=document.getElementById('tsAlertMenu'); if(old){ old.remove(); return; }
  var items=allFlags(), m=document.createElement('div'); m.id='tsAlertMenu'; m.className='ts-menu ts-alert-menu show';
  m.innerHTML=items.length?items.map(function(it){ var p=it.s.patient||{};
    return '<div class="ts-am-row s'+it.f.sev+'"><button type="button" class="ts-am-open" onclick="tsOpenSheet(\''+it.s._id+'\',true);document.getElementById(\'tsAlertMenu\').remove()"><b>'+esc(((p.name||'')+' '+(p.last||'')).trim())+'</b><span>'+esc(it.f.text)+'</span><small>'+esc(p.doctor||'No doctor')+'</small></button>'
      +(canAck()?'<button type="button" class="ts-am-ack" onclick="tsAckFlag(\''+it.s._id+'\',\''+it.f.key+'\',event);document.getElementById(\'tsAlertMenu\').remove()">Acknowledge</button>':'')+'</div>'; }).join('')
    :'<div class="ts-am-empty">No open alerts</div>';
  var r=pill.getBoundingClientRect(); m.style.top=(r.bottom+8)+'px'; m.style.left=Math.max(12,Math.min(window.innerWidth-372,r.left))+'px';
  document.body.appendChild(m); setTimeout(function(){ document.addEventListener('mousedown',function h(ev){ if(!m.contains(ev.target)&&ev.target!==pill){ m.remove(); document.removeEventListener('mousedown',h); } }); },0); }
function notifyDoctor(){ var me=normName(user().name), mine=[], fresh=[];
  var changed=false; allFlags().forEach(function(it){ var id=it.s._id+'|'+it.f.key; if(!seenFlags[id]){ fresh.push(it); seenFlags[id]=Date.now(); changed=true; }
    if(me&&normName((it.s.patient||{}).doctor)===me) mine.push(it); });
  try{ var keep={}, cut=Date.now()-3*86400000; Object.keys(seenFlags).forEach(function(k){ if(seenFlags[k]>cut) keep[k]=seenFlags[k]; else changed=true; }); seenFlags=keep; if(changed) localStorage.setItem('tsSeenFlags',JSON.stringify(keep)); }catch(e){}
  var newMine=fresh.filter(function(it){ return me&&normName((it.s.patient||{}).doctor)===me; });
  if(!flagsPrimed){ flagsPrimed=true; if(mine.length) showDocAlert(mine,true); return; }
  if(newMine.length) showDocAlert(newMine,false); }
function showDocAlert(list,summary){ var el=document.getElementById('tsDocAlert'); if(el) el.remove(); el=document.createElement('div'); el.id='tsDocAlert'; el.className='ts-doc-alert';
  var top=list[0], p=top.s.patient||{};
  el.innerHTML=FL_I+'<div><b>'+(summary&&list.length>1?list.length+' open alerts on your patients':esc(((p.name||'')+' '+(p.last||'')).trim())+' — '+esc(top.f.text))+'</b><small>'+(summary?'Tap to review':'Your patient · '+fmtTime(nowMin()))+'</small></div>'
    +'<button type="button" class="open">Open</button><button type="button" class="x" aria-label="Dismiss">✕</button>';
  el.querySelector('.open').onclick=function(){ el.remove(); if(summary&&list.length>1) openAlertMenu(); else tsOpenSheet(top.s._id,true); };
  el.querySelector('.x').onclick=function(){ el.remove(); };
  document.body.appendChild(el); try{ var ac=new (window.AudioContext||window.webkitAudioContext)(), o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=880; g.gain.value=.04; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+.18); }catch(e){}
  setTimeout(function(){ if(el.parentNode) el.classList.add('fade'); },14000); setTimeout(function(){ if(el.parentNode) el.remove(); },15000); }
/* alerts are re-checked when data changes (a sheet saves, another screen charts, an alert is acknowledged) — not on a timer */
var alertT=null;
function flagsDirty(){ clearTimeout(alertT); alertT=setTimeout(function(){ if(!AUTH||!AUTH.currentUser) return; try{ renderAlertPill(); notifyDoctor(); }catch(e){ console.warn(e); } },250); }

/* ═════════ #10 WORKLOAD: tech per patient, load strip, one-tap rebalance ═════════ */
function loadOf(s){ var n=nowMin(), dk=dayKey(), marks=s.marks||{}, due=0, over=0;
  var adm=s.admitted_at||s.created_at, from=(adm&&dayKey(new Date(adm))===dk)?isoToMin(adm):-1;
  Object.keys(s.orders||{}).forEach(function(id){ var o=s.orders[id]; if(!o||o.dc||o.cont) return;
    freqTimes(o).forEach(function(h){ var t=h*60, m=marks[dk+'_'+id+'_'+t]; if(m&&m.status) return; if(t<from&&!o.ordered_at) return;
      if(t<n-18) over++; else if(t<=n+60) due++; }); });
  return {due:due,over:over,score:due+over*2}; }
function techOf(s){ return ((s.patient||{}).tech)||''; }
function initialsOfName(n){ return String(n||'').split(/\s+/).filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase(); }
var _bl=window.tsBoardList;
window.tsBoardList=function(board){ var list=_bl.apply(this,arguments);
  list.forEach(function(row){ var s=SHEETS.find(function(x){ return x._id===row._id; }); if(!s) return; var d=s._id===CUR&&curDoc?curDoc:s;
    var fl=flagsFor(d); if(fl.length) row.alerts=fl.map(function(f){ return {t:f.sev>=2?'crit':'warn',x:f.text}; }).concat(row.alerts||[]);
    var t=techOf(s), L=loadOf(d);
    row.techHTML='<button type="button" class="ts-tech'+(t?'':' none')+'" title="'+esc(t?t+' · '+L.due+' due next hour'+(L.over?' · '+L.over+' overdue':''):'Assign a tech')+'" onclick="event.stopPropagation();tsPickTech(\''+s._id+'\',this)">'+(t?esc(initialsOfName(t)):'+')+'</button>'; });
  return list; };
var TECHS=(window.TS_STAFF&&window.TS_STAFF.techs)||[];
window.tsPickTech=function(sheetId,anchor){ var old=document.getElementById('tsTechMenu'); if(old) old.remove();
  var s=SHEETS.find(function(x){ return x._id===sheetId; }); if(!s) return; var loads=techLoads(), cur=techOf(s);
  var m=document.createElement('div'); m.id='tsTechMenu'; m.className='ts-menu ts-tech-menu show';
  var opt=function(n){ var L=loads[n]; return '<button type="button" class="'+(n===cur?'on':'')+'" data-n="'+esc(n)+'"><b>'+esc(n||'Unassigned')+'</b>'+(n&&L?'<small>'+L.patients+' pt · '+L.due+' due'+(L.over?' · '+L.over+' late':'')+'</small>':'')+'</button>'; };
  var names=TECHS.slice().sort(function(a,b){ var la=(loads[a]||{score:0}).score, lb=(loads[b]||{score:0}).score; return la-lb||a.localeCompare(b); });
  m.innerHTML='<div class="ts-tm-h">Assign tech · '+esc(((s.patient||{}).name)||'')+'</div>'+opt('')+names.map(opt).join('');
  m.querySelectorAll('button[data-n]').forEach(function(b){ b.onclick=function(){ m.remove(); assignTech(sheetId,b.dataset.n); }; });
  var r=anchor.getBoundingClientRect(); m.style.top=Math.min(window.innerHeight-380,r.bottom+6)+'px'; m.style.left=Math.max(12,Math.min(window.innerWidth-300,r.left-20))+'px';
  document.body.appendChild(m); setTimeout(function(){ document.addEventListener('mousedown',function h(ev){ if(!m.contains(ev.target)){ m.remove(); document.removeEventListener('mousedown',h); } }); },0); };
function assignTech(sheetId,name){ var s=SHEETS.find(function(x){ return x._id===sheetId; }); if(!s) return; var me=user(), now=new Date().toISOString(), p=s.patient||{};
  var u={'patient.tech':name||null,'patient.tech_at':now,updated_at:now,audit:FV.arrayUnion({at:now,type:'doctor',desc:(name?'Tech assigned — <b>'+esc(name)+'</b>':'Tech unassigned'),who:me.initials,uid:me.uid})};
  p.tech=name||null; s.patient=p; if(sheetId===CUR&&curDoc){ curDoc.patient=curDoc.patient||{}; curDoc.patient.tech=name||null; }
  p.tech_at=now; DB.collection(COL).doc(sheetId).update(u).then(function(){ toast(name?((p.name||'Patient')+' → '+name):'Tech unassigned'); }).catch(function(e){ console.warn(e); toast('Couldn’t save'); });
  techToFlow(s.visit_id,name,me,now);
  try{ if(currentCTab==='dash') renderDash(); refreshTechCell(); }catch(e){} }
/* the same technician shows on the patient in Flow (replaces whoever was there; history is kept) */
function techToFlow(visitId,name,me,now){ if(!visitId) return; var ref=DB.collection('visits').doc(String(visitId));
  var slug=function(n){ return 'tech:'+String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); };
  DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ if(!snap.exists) return;
    var ct=snap.data().care_team||{}, L=Array.isArray(ct.assignments)?ct.assignments.slice():[], by=me.name||me.initials||'Treatment Sheets';
    var cur=L.filter(function(a){ return a.role==='technician'&&a.status==='current'; });
    if(name&&cur.length===1&&cur[0].staff_name===name) return;
    if(!name&&!cur.length) return;
    L=L.map(function(a){ return (a.role==='technician'&&a.status==='current')?Object.assign({},a,{status:'ended',end_at:now,ended_by:by,end_reason:name?'replaced':'unassigned',updated_at:now,updated_by:by}):a; });
    if(name) L.push({id:'ct-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),patient_id:String(visitId),staff_id:slug(name),staff_name:name,staff_kind:'manual',role:'technician',status:'current',
      start_at:now,end_at:null,updated_at:now,updated_by:by,proposed_by:null,confirmed_by:null,confirmed_at:null,ended_by:null,end_reason:null,note:'From Treatment Sheets',actor_uid:me.uid||null});
    t.update(ref,{'care_team.assignments':L}); }); }).catch(function(e){ console.warn('[sheet→flow tech]',e); }); }
function techLoads(){ var out={}; SHEETS.forEach(function(s){ var t=techOf(s); if(!t) return; var d=s._id===CUR&&curDoc?curDoc:s, L=loadOf(d), o=out[t]||(out[t]={patients:0,due:0,over:0,score:0,list:[]});
  o.patients++; o.due+=L.due; o.over+=L.over; o.score+=L.score; o.list.push({s:s,L:L}); }); return out; }
function loadStripHTML(){ var loads=techLoads(), names=Object.keys(loads).sort(function(a,b){ return loads[b].score-loads[a].score; });
  var un=SHEETS.filter(function(s){ return !techOf(s); }).length;
  if(!names.length) return '<div class="ts-load"><div class="ts-load-empty">Assign a tech to each patient (the <b>+</b> in the Tech column) to see who is carrying what.</div></div>';
  var max=Math.max.apply(null,names.map(function(n){ return loads[n].score; }).concat([1]));
  var cards=names.map(function(n){ var L=loads[n], lvl=L.over>=3||L.score>=12?'hi':L.score>=6?'mid':'lo';
    return '<div class="ts-load-card '+lvl+'"><div class="ts-lc-top"><span class="ts-lc-av">'+esc(initialsOfName(n))+'</span><b>'+esc(n)+'</b></div>'
      +'<div class="ts-lc-nums"><span><b>'+L.patients+'</b> pt</span><span><b>'+L.due+'</b> due · 1h</span>'+(L.over?'<span class="late"><b>'+L.over+'</b> late</span>':'')+'</div>'
      +'<div class="ts-lc-bar"><i style="width:'+Math.round(L.score/max*100)+'%"></i></div></div>'; }).join('');
  var hint='';
  if(names.length>=2){ var hi=names[0], lo=names[names.length-1], gap=loads[hi].score-loads[lo].score;
    if(gap>=4&&loads[hi].patients>=2){ var target=gap/2, pick=loads[hi].list.slice().sort(function(a,b){ return Math.abs(a.L.score-target)-Math.abs(b.L.score-target); })[0];
      if(pick&&pick.L.score>0&&pick.L.score<gap){ var pn=((pick.s.patient||{}).name)||'patient';
        hint='<div class="ts-load-hint"><span>'+esc(hi)+' has '+loads[hi].score+' tasks queued vs '+esc(lo)+' with '+loads[lo].score+'. Moving <b>'+esc(pn)+'</b> evens it out.</span><button type="button" onclick="tsRebalance(\''+pick.s._id+'\',\''+esc(lo).replace(/'/g,"\\'")+'\')">Move to '+esc(lo.split(' ')[0])+'</button></div>'; } } }
  return '<div class="ts-load"><div class="ts-load-h">Workload · next hour'+(un?'<small>'+un+' unassigned</small>':'')+'</div><div class="ts-load-row">'+cards+'</div>'+hint+'</div>'; }
window.tsRebalance=function(sheetId,name){ assignTech(sheetId,name); };
function refreshTechCell(){ document.querySelectorAll('.ts-tech-slot').forEach(function(c){ var h=window.tsTechCell(); if(c.innerHTML!==h) c.innerHTML=h; }); }
var _rhTech=refreshHeader; refreshHeader=function(){ _rhTech.apply(this,arguments); try{ refreshTechCell(); }catch(e){} };
/* Visit panel: the patient's technician (same assignment as the board's Tech column and Flow) */
window.tsTechCell=function(){ if(!CUR) return '—'; var t=(curDoc&&curDoc.patient&&curDoc.patient.tech)||'';
  return t?'<button type="button" class="ts-tech-cell" title="Change technician" onclick="tsPickTech(\''+CUR+'\',this)"><span class="ts-lc-av">'+esc(initialsOfName(t))+'</span>'+esc(t)+'</button>'
          :'<button type="button" class="addbtn" onclick="tsPickTech(\''+CUR+'\',this)">+ Assign</button>'; };
window.tsLoadStrip=function(){ try{ if(typeof sbBoard!=='undefined'&&(sbBoard==='IP Board'||sbBoard==='OP Board')) return loadStripHTML(); }catch(e){ console.warn(e); } return ''; };
/* due / overdue colours move with the clock; the board only touches the cells that changed */
setInterval(function(){ try{ if(!document.hidden&&currentCTab==='dash'&&!document.getElementById('tsTechMenu')&&!document.getElementById('tsAlertMenu')) renderDash(); }catch(e){} },60000);

/* ═════════ TS RESUS — Flow's CPR (live ECG) / DNR (flatline) pills ═════════
   Code status comes from Flow (staff or the client in Care Connect); the sheet only displays it. */
var RESUS_ECG='M1 13 C4 13,5 13,7 13 C8 13,9 11.8,10.2 11.3 C11.4 10.8,12.2 12.1,13.4 13 L16 13 L17.2 14.3 L18.5 10.5 L20.1 2.7 L21.6 21.4 L23.2 12.2 L26 13 C28 13,29 12.8,30 12.5 C32 11.2,33.4 9.8,35 10.2 C37 10.7,38 12.5,40 13 L42 13 C45 13,46 13,48 13 C49 13,50 11.8,51.2 11.3 C52.4 10.8,53.2 12.1,54.4 13 L57 13 L58.2 14.3 L59.5 10.5 L61.1 2.7 L62.6 21.4 L64.2 12.2 L67 13 C69 13,70 12.8,71 12.5 C72.5 11.4,73.5 10.4,75 10.8';
function resusPillHTML(code,size){
  var c=String(code||'').toUpperCase(); if(['CPR','DNR','ALS','BLS'].indexOf(c)<0) return '';
  var dnr=c==='DNR', d=dnr?'M1 13 H75':RESUS_ECG;
  var tip=dnr?'Do not resuscitate':(c==='CPR'?'Resuscitate (CPR)':c==='ALS'?'Advanced life support':'Basic life support');
  return '<span class="ts-resus '+(dnr?'dnr':'cpr')+(size?' '+size:'')+'" title="Code status: '+tip+' · set in Flow" aria-label="Code status '+c+'">'+
    '<span class="tr-line" aria-hidden="true"><svg viewBox="0 0 76 26" preserveAspectRatio="xMidYMid meet"><path class="tr-base" d="'+d+'"/><path class="tr-live" d="'+d+'"'+(size==='sm'?' pathLength="100"':'')+'/>'+(size==='sm'?'':'<circle class="tr-dot" cx="1" cy="13" r="1.7"/>')+'</svg></span>'+
    '<span class="tr-lbl">'+c+'</span></span>';
}
window.tsCodePill=function(always){ var h=resusPillHTML(VISIT&&VISIT.code); return h||(always?'—':''); };
try{ lsPill=function(ls){ return resusPillHTML(ls,'sm'); }; }catch(e){ window.lsPill=function(ls){ return resusPillHTML(ls,'sm'); }; }

/* one shared animation loop for every pill on screen (same beat everywhere, paused when hidden or off-screen) */
(function(){
  var DUR=2750, list=[], raf=null, reduce=false;
  try{ reduce=matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  function scan(){ list=[]; document.querySelectorAll('.ts-resus:not(.sm) .tr-live').forEach(function(p){
      if(!p.getClientRects().length) return;
      var len=+p.dataset.len; if(!len){ try{ len=p.getTotalLength(); }catch(e){ len=0; } if(!len) return; p.dataset.len=len; p.style.strokeDasharray=len; }
      list.push([p,p.parentNode.querySelector('.tr-dot'),len]); }); }
  function frame(ts){
    if(!list.length||document.hidden){ raf=null; return; } raf=requestAnimationFrame(frame);
    var prog=reduce?1:(ts%DUR)/DUR;
    for(var i=0;i<list.length;i++){ var p=list[i][0], dot=list[i][1], len=list[i][2];
      p.style.strokeDashoffset=(len*(1-prog)).toFixed(2);
      if(dot){ var pt=p.getPointAtLength(prog*len); dot.setAttribute('cx',pt.x.toFixed(2)); dot.setAttribute('cy',pt.y.toFixed(2)); } }
  }
  /* look for header pills twice a second; the frame loop runs only while one is on screen */
  setInterval(function(){ if(document.hidden) return; scan(); if(list.length&&!raf) raf=requestAnimationFrame(frame); },500);
})();

window.__tsStore={removeNote:removeNote, sync:sync, get cur(){ return CUR; }, get doc(){ return curDoc; }, get sheets(){ return SHEETS; }, openSheet:openSheet, dayKey:dayKey};
})();
