
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
  /* no shared multi-tab cache: Flow and every other tab on this site share one IndexedDB lease, and when the tab holding it is in the
     background Chrome throttles it and other tabs stall on "Opening sheet…". Treatment Sheets keeps its own connection; instant start comes from tsCache_v1. */
  }catch(e){ console.warn('Treatment Sheets: Firebase unavailable',e); }

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


/* ---------- real clock (the prototype ran on a simulated 10:12 AM) ---------- */
nowMin=function(){ var c=claim('clock'); if(c!=null&&c!==false) return c; var d=new Date(); return d.getHours()*60+d.getMinutes()+d.getSeconds()/60; };   /* hook: clock (a past day's clock) */

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
  var d=Object.assign({},curMain); d.marks=m; emit('compose',d); return d; }
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
/* row order: section, then pinned first, then the order someone dragged the rows into (order.rank), then when it was added (store/sortorder.js) */
function orderRank(o){ return (o.pin?-1e9:0)+(o.rank!=null?+o.rank:1e6); }
function orderCmp(a,b){ return (SECTION_ORDER.indexOf(a.section)-SECTION_ORDER.indexOf(b.section))||(orderRank(a)-orderRank(b))||String(a.id).localeCompare(String(b.id),undefined,{numeric:true}); }

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
function dayOf(iso){ try{ var n=Math.floor((Date.now()-new Date(iso).getTime())/86400000)+1; return 'Day '+(n>0?n:1); }catch(e){ return 'Day 1'; } }   /* hospital day from admission: day 2 starts at 24 h */
function visitFrom(d){ var v=visitBase(d); emit('visit',v,d); return v; }
function visitBase(d){ var p=d.patient||{}; var full=((p.name||'')+' '+(p.last||'')).trim()||'Unnamed patient';
  var latest=function(name){ return rdLatest(d,new RegExp('^'+name+'$','i'))||'—'; };   /* newest charted value, by day + minute (rounds.js) */
  return {id:String(d.visit_id||d._id||'').replace(/^[a-z]_/,'').slice(-6).toUpperCase(), vcode:d.visit_code||'', patient:full, client:p.last||p.owner||'—', species:p.species||'Dog', breed:p.breed||'—', sex:sexLabel(p.sex)||'—', age:p.age||'—',
    weight:Number(p.weight)||0, temp:latest('Temperature'), hr:latest('Heart Rate'), rr:latest('Respiratory Rate'), mm:latest('Mucous Membrane'), crt:latest('CRT'), mentation:latest('Mentation'), pain:latest('Pain Score'),
    doctorFrom:p.doctor||'—', doctorTo:p.doctor||'—', location:p.location||'—', status:p.condition||'Stable', code:p.code||'—', allergies:p.allergies||'None known',
    admit:fmtAdmit(d.admitted_at||d.created_at), checkin:fmtAdmit(d.admitted_at||d.created_at), day:dayOf(d.admitted_at||d.created_at),
    complaint:p.reason||'—', problems:p.problems&&p.problems.length?p.problems:(p.reason?[p.reason]:[]), plan:p.plan||[], alerts:p.alerts||[], pending:[], owner:p.owner||'', phone:p.phone||''}; }
function hydrate(){
  var d=curDoc; if(!d){ reset(); return; }
  setVisit(visitFrom(d));
  /* own copies: an order edited on screen (frequency, rate…) must differ from the stored one so sync() sees the change and saves it */
  ORDERS=Object.keys(d.orders||{}).map(function(k){ return d.orders[k]?Object.assign({},d.orders[k]):d.orders[k]; }).filter(function(o){ return o&&(!o.dc||dcVisible(o)); })
    .sort(orderCmp);
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
buildTasks=function(){ if(!claim('tasks.build')) buildToday(); emit('tasks.built'); };
function buildToday(){
  TASKS=[]; var dk=dayKey(), marks=(curDoc&&curDoc.marks)||{};
  var adm=curDoc&&(curDoc.admitted_at||curDoc.created_at), from=(adm&&dayKey(new Date(adm))===dk)?isoToMin(adm):-1;
  ORDERS.forEach(function(o){ if(o.cont) return; freqTimes(o).forEach(function(h){ var min=h*60, key=dk+'_'+o.id+'_'+min, m=marks[key]; if(min<from&&!m&&!o.ordered_at) return; if(o.dc&&!m&&min>=dcCut(o,dk)) return; if(o.not_before&&!m&&dayKey(new Date(o.not_before))===dk&&min<isoToMin(o.not_before)) return;   /* not_before: no slot earlier than that on its day (store/weight.js) · the admission cutoff is for the starter orders; a doctor's order shows from the time they chose */
    var at=slotMin(o,dk,min); TASKS.push({id:key,key:key,orderId:o.id,order:o,sched:at,movedFrom:at!==min?min:null,status:m?m.status:null,by:m?m.by:null,completedMin:m&&m.min!=null?m.min:null,value:m?m.value:null,notes:m?m.notes:null,given:m?m.given||null:null,vol:m?m.vol||null:null,reason:m?m.reason||null:null,hist:m&&m.hist?m.hist:null,at:m?m.at||null:null,severity:0}); }); });
  Object.keys(marks).forEach(function(k){ if(k.indexOf(dk+'_')!==0||TASKS.some(function(t){ return t.key===k; })) return; var m=marks[k]; if(!m) return;
    var o=ORDERS.find(function(x){ return x.id===m.orderId; }); if(!o) return;
    TASKS.push({id:k,key:k,orderId:o.id,order:o,sched:m.sched!=null?m.sched:(m.min||0),status:m.status,by:m.by,completedMin:m.min,value:m.value,notes:m.notes,given:m.given||null,vol:m.vol||null,reason:m.reason||null,hist:m.hist||null,at:m.at||null,severity:0,adhoc:true}); });
}

/* ---------- writing back only what changed ---------- */
function markOf(t){ if(!t.status) return null; return {status:t.status,by:t.by||user().initials||null,min:t.completedMin!=null?Math.round(t.completedMin):null,
  value:t.value!=null&&t.value!==''?String(t.value):null,notes:t.notes||null,orderId:t.orderId,sched:Math.round(t.sched),
  given:t.given||null,vol:t.vol||null,reason:t.reason||null,hist:t.hist&&t.hist.length?t.hist:null}; }   /* given/vol: what was actually given · reason: why it wasn't done · hist: earlier versions (store/chart.js) */
function same(a,b){ var f=function(m){ return m?JSON.stringify([m.status,m.by,m.min,m.value,m.notes,m.given||null,m.vol||null,m.reason||null,m.hist||null]):'null'; }; return f(a)===f(b); }
var syncT=null, syncing=false;
function scheduleSync(){ clearTimeout(syncT); syncT=setTimeout(sync,350); }
function sync(){
  if(!CUR||!curDoc||!DB||syncing||!AUTH||!AUTH.currentUser||!dayReady()||!allow('sync.allowed')) return; var upd={}, n=0, dk=dayKey(), me=user(), marks=curDoc.marks||(curDoc.marks={});
  /* charting goes to the day's own record (sheets/{id}/days/{YYYYMMDD}); the sheet itself stays small */
  var dayUpd={}, dn=0, inbox=(curMain&&curMain.marks)||{};
  TASKS.forEach(function(t){ if(!t.key){ t.key=dk+'_'+t.orderId+'_x'+Math.round(t.sched); }
    var m=markOf(t), old=marks[t.key]; if(same(m,old)) return;
    if(m){ m.at=new Date().toISOString(); m.uid=me.uid; } dayUpd[t.key]=m||DEL; if(inbox[t.key]) upd['marks.'+t.key]=DEL;
    marks[t.key]=m||undefined; if(!m) delete marks[t.key]; dn++; });
  /* a charted slot that no longer exists on screen (undo of an extra reading) is removed */
  var live={}; TASKS.forEach(function(t){ if(t.key) live[t.key]=1; });
  Object.keys(marks).forEach(function(k){ if(k.indexOf(dk+'_')!==0||live[k]) return; var m=marks[k]; if(!m||!ORDERS.some(function(o){ return o.id===m.orderId; })) return;
    dayUpd[k]=DEL; if(inbox[k]) upd['marks.'+k]=DEL; delete marks[k]; dn++; });
  if(dn) n++;
  /* the board's summary of this sheet (what's done today + the latest readings) */
  var dg=computeDigest(marks); if(curMain&&liveDay[subDk]&&liveDay[prevDk(subDk)]&&JSON.stringify(dg)!==JSON.stringify(curMain.digest||null)){ upd.digest=dg; curMain.digest=dg; curDoc.digest=dg; n++; }
  var so=curDoc.orders||(curDoc.orders={}), seen={};
  ORDERS.forEach(function(o){ seen[o.id]=1; var c=clean(o); if(JSON.stringify(c)!==JSON.stringify(so[o.id])){ upd['orders.'+o.id]=c; so[o.id]=c; n++; } });
  Object.keys(so).forEach(function(id){ if(!seen[id]&&!so[id].dc){ so[id]=Object.assign({},so[id],{dc:true,dc_at:new Date().toISOString()}); upd['orders.'+id]=so[id]; n++; } });
  var newNotes=NOTES.filter(function(x){ return !x._srv; }), newAudit=AUDIT.filter(function(x){ return !x._srv; });
  if(newNotes.length){ upd.notes=U(newNotes.map(function(x){ x._srv=1; return {at:minToISO(x.min),type:x.type,author:x.author,role:x.role,body:x.body,uid:me.uid}; })); n++; }
  if(newAudit.length){ upd.audit=U(newAudit.map(function(x){ x._srv=1; return {at:minToISO(x.min),type:x.type,desc:x.desc,who:x.who,uid:me.uid}; })); n++; }
  if(!n) return;
  var nowIso=new Date().toISOString(); upd.updated_at=nowIso; upd.updated_by=me.name||null;
  /* through the outbox: kept on this device until the database confirms (ts_outbox.js) */
  syncing=true; tsCommit(CUR,upd,dn?dk:null,dn?dayUpd:null).catch(function(){}).then(function(){ syncing=false; }); setTimeout(function(){ syncing=false; },4000);
  try{ flagsDirty(); }catch(e){}
}
/* saves happen right after each change (scheduleSync); this is only a safety net */
setInterval(sync,10000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') sync(); });
window.addEventListener('pagehide',sync);
/* save right after any change the sheet makes */
['buildGrid','logEvent','renderNotes','renderSheet'].forEach(function(fn){ try{ var o=window[fn]; if(typeof o!=='function') return;
  window[fn]=function(){ var r=o.apply(this,arguments); scheduleSync(); return r; }; }catch(e){} });
/* ---------- adapters over the prototype's completion drawer (core): the only place base wraps core functions ---------- */
(function(){ var oc=window.openCompletion; if(typeof oc==='function') window.openCompletion=function(id){ if(claim('completion.open',id)) return; return oc.apply(this,arguments); };
  ['completeTask','saveTask'].forEach(function(fn){ var orig=window[fn]; if(typeof orig!=='function') return;
    window[fn]=function(){ var id=(typeof activeTaskId!=='undefined')?activeTaskId:null, r=orig.apply(this,arguments);
      var t=(TASKS||[]).find(function(x){ return x.id===id; }); if(t&&t.status==='completed') emit('task.charted',t); return r; }; }); })();
try{ var _lg=logEvent; logEvent=function(type,desc,who){ return _lg(type,desc,(who==='DG'?user().initials:who)||user().initials); }; }catch(e){}

/* ---------- empty state when no patient is open ---------- */
function emptyHTML(){ return '<div class="ts-empty"><div class="ts-empty-card"><div class="ic">'+
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17.5" rx="2.5"/><path d="M9 3.5h6v2.5H9z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg></div>'+
  '<b>No patient open</b><span>Choose a patient from the IP Board, or start a new sheet.</span>'+
  '<div class="row"><button type="button" class="ts-btn" onclick="selectCTab(\'dash\')">IP Board</button><button type="button" class="ts-btn primary" onclick="tsNewSheet()">New sheet</button></div></div></div>'; }
['renderSheet','renderTimeline','renderNotes'].forEach(function(fn){ var tab={renderSheet:'sheet',renderTimeline:'timeline',renderNotes:'notes'}[fn];   /* Vitals and Rounds guard themselves (store/vitals.js, store/rounds.js) */
  try{ var o=window[fn]; window[fn]=function(){ if(!CUR||!curDoc){ var el=document.getElementById('ctab-'+tab); if(el) el.innerHTML=CUR?'<div class="ts-empty"><div class="ts-empty-card"><span>Opening sheet…</span></div></div>':emptyHTML(); if(fn==='renderSheet') renderedFor=null; return; } if(fn==='renderSheet'){ renderedFor=CUR; var r=o.apply(this,arguments); requestAnimationFrame(scrollToNow); emit('sheet.drawn'); return r; }   /* sheet.drawn: toolbar slots refill (seen.js, drafts.js) */ return o.apply(this,arguments); }; }catch(e){} });

var renderedFor=null;
/* code-status chip reflects the sheet (prototype had DNR hard-coded) */
window.tsCodePill=function(always){ var c=String(VISIT.code||'').toUpperCase(); if(!c||c==='—') return always?'—':'';
  return c==='DNR'?'<span class="pill code-dnr">DNR</span>':'<span class="pill soft">'+c+'</span>'; };
/* header vitals follow live charting without a full re-render */
function refreshEstimate(){ var c=document.querySelector('#ctab-sheet .est-card'); if(!c||typeof window.estimateCard!=='function') return; var h=window.estimateCard(); if(c.outerHTML!==h){ var t=document.createElement('div'); t.innerHTML=h; if(t.firstElementChild) c.replaceWith(t.firstElementChild); } }
function refreshPrototypeHeader(){ try{ refreshEstimate(); }catch(e){} try{ vLive(); }catch(e){} var vs=document.querySelectorAll('.cmd-vitals .vstat .vv'); if(vs.length<4) return;
  var vals=[VISIT.temp==='—'?'—':VISIT.temp+'°',VISIT.hr,VISIT.rr,VISIT.mm]; vs.forEach(function(e,i){ if(i<4&&e.textContent!==String(vals[i])) e.textContent=vals[i]; }); }
/* the prototype header's numbers, then every module's part (hook: header.refresh) */
function refreshHeader(){ refreshPrototypeHeader(); emit('header.refresh'); }
/* open the grid at "now" instead of midnight */
function scrollToNow(){ var sh=document.getElementById('sheetScroll'); if(!sh) return; var L=(typeof GRID_LW!=='undefined'?GRID_LW:240), x=L+(nowMin()/60)*54; sh.scrollLeft=Math.max(0,x-L-(sh.clientWidth-L)*0.35); }
function rerender(){ try{ if(currentCTab==='sheet'){ if(curDoc&&renderedFor===CUR&&document.querySelector('#sheetInner')){ buildGrid(); refreshHeader(); } else { renderSheet(); renderedFor=curDoc?CUR:null; } } else if(currentCTab==='vitals') renderVitals(); else if(currentCTab==='dash') renderDash(); else if(currentCTab==='timeline') renderTimeline(); else if(currentCTab==='notes') renderNotes(); else if(currentCTab==='charges'&&window.tsRenderCharges) tsRenderCharges(); }catch(e){ console.warn(e); } updateChip(); emit('rendered'); }

/* ---------- IP Board: every active sheet ---------- */
function blocksFor(s){ var dk=dayKey(), marks=s.marks||{}, n=nowMin(), out=[];
  var adm=s.admitted_at||s.created_at, from=(adm&&dayKey(new Date(adm))===dk)?isoToMin(adm):-1;   /* same rule as the sheet: nothing is due before admission */
  for(var h=6;h<=20;h++){ var due=0, over=0, done=0, sched=0, items=[]; if(h*60<from) continue;
    Object.keys(s.orders||{}).forEach(function(id){ var o=s.orders[id]; if(!o||o.dc||o.cont||(window.tsWfOk&&!tsWfOk(o))) return; var h0=freqTimes(o).find(function(x){ return Math.floor(slotMin(o,dk,x*60)/60)===h; }); if(h0==null) return;
      var m=marks[dk+'_'+id+'_'+(h0*60)], t=slotMin(o,dk,h0*60), st=m&&m.status?(m.status==='skipped'?'skipped':'completed'):t>n+18?'scheduled':t>=n-18?'due':'overdue';
      items.push({n:o.name,m:t,s:st,f:o.freq||''}); if(m&&m.status){ done++; return; } if(t>n+18) sched++; else if(t>=n-18) due++; else over++; });
    var tot=due+over+done+sched; if(!tot) continue;
    items.sort(function(a,b){ var r={overdue:0,due:1,scheduled:2,completed:3,skipped:4}; return (r[a.s]-r[b.s])||(a.m-b.m); });
    out.push({h:h,status:over?'overdue':due?'due':sched?'scheduled':'completed',label:String(over||due||sched||done),items:items,done:done,tot:tot}); }
  return out; }
var SEX_LABEL={male_neutered:'MN',neutered_male:'MN',mn:'MN',female_spayed:'FS',spayed_female:'FS',fs:'FS',male_intact:'M',male:'M',m:'M',female_intact:'F',female:'F',f:'F',unknown:''};
function sexLabel(x){ var k=String(x||'').toLowerCase().replace(/[\s-]+/g,'_'); return SEX_LABEL.hasOwnProperty(k)?SEX_LABEL[k]:(x||''); }
window.tsSexLabel=sexLabel;
function initialsOf(n){ var w=String(n||'').replace(/^dr\.?\s+/i,'').split(/[\s,]+/).filter(Boolean); return w.length?w.map(function(x){ return x[0]; }).join('').slice(0,3).toUpperCase():'—'; }
function boardOf(s){ return s.board==='OP'?'OP Board':'IP Board'; }   /* sheets made before boards existed are inpatients */
/* My Board: patients where the signed-in person is the technician (set in Flow or the Tech column) or the doctor */
function isMine(s){ var me=normName(user().name), p=s.patient||{}; return !!me&&(normName(p.tech)===me||normName(p.doctor)===me); }
window.tsIsMyBoard=function(){ return typeof sbBoard!=='undefined'&&sbBoard==='My Board'; };
/* the board's Stay column: inpatients by hospital day (day 2 starts at 24 h, as the sheet and charges count it) and hours in; outpatients by time in */
function stayOf(d,op){ if(!d||isNaN(d)) return null; var now=new Date(), ms=Math.max(0,now-d), h=Math.floor(ms/3600000), m=Math.floor(ms/60000)%60;
  var tm=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}), days=Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/86400000);
  var when=days<=0?tm:days<7?d.toLocaleDateString([], {weekday:'short'})+' '+tm:(d.getMonth()+1)+'/'+d.getDate()+' '+tm;
  var full='Admitted '+(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear()+' · '+tm, span=h?(h+' h'+(op&&m?' '+m+' m':'')):(Math.max(1,m)+' min');
  if(op) return {day:span,since:'Since '+when,pct:null,tip:full+' · '+span+' in hospital',hours:h};
  var into=h%24, left=24-into; return {day:dayOf(d.toISOString()),since:'Since '+when,pct:into/24,tip:full+' · '+span+' in hospital · Day '+(Math.floor(h/24)+2)+' starts in '+left+' h',hours:h}; }
window.tsBoardList=function(board){ var my=board==='My Board';
  IPL=SHEETS.filter(function(s){ return my?isMine(s):boardOf(s)===(board||'IP Board'); }).map(function(s){ var p=s.patient||{}, at=s.admitted_at||s.created_at, d=at?new Date(at):null;
    return {_id:s._id,name:((p.name||'')+' '+(p.last||'')).trim()||'Unnamed',sig:(my?(s.board==='OP'?'OP · ':'IP · '):'')+[p.age,sexLabel(p.sex),p.breed].filter(Boolean).join(' ')+(p.weight?' · '+p.weight+' kg':''),
      cage:p.location||'',ls:(['DNR','BLS','ALS','CPR'].indexOf(p.code)>=0?p.code:''),reason:p.reason||'—',dr:initialsOf(p.doctor),ward:p.location||'Treatment Area',inout:'IN',
      date:d?(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear():'',time:d?d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}).replace(' ',''):'',
      alerts:(p.alerts||[]).map(function(x){ return {t:/dnr|caution|aggress|bite/i.test(x)?'crit':'warn',x:x,own:1}; }).concat((p.client_alerts||[]).map(function(x){ return {t:'client',x:(x&&x.text)||String(x),own:1}; })),service:(window.tsServiceName?tsServiceName(p.service||p.department):(p.service||'Emergency & Critical Care')),
      owner:p.owner||'—',phone:p.phone||'—',belongings:esc(p.belongings||''),stay:stayOf(d,boardOf(s)==='OP Board'),drName:p.doctor||'',techName:p.tech||'',cur:s._id===CUR,at:at||'',blocks:blocksFor(s._id===CUR&&curDoc?curDoc:s)}; });
  emit('board.rows',IPL); return IPL; };
window.tsIPList=function(){ return window.tsBoardList('IP Board'); };
/* the toolbar's counts: how many patients each board has right now (Boarding has no live list yet) */
window.tsBoardCounts=function(){ var c={'My Board':0,'OP Board':0,'IP Board':0}; SHEETS.forEach(function(s){ c[boardOf(s)]++; if(isMine(s)) c['My Board']++; }); c['Boarding']=0; return c; };
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
  emit('sheet.opening',id); unsubAllCur(); if(!(keep&&CUR===id&&curDoc)){ sync(); CUR=id; curDoc=null; curMain=null; curDays={}; dayLoaded={}; ARCH=[]; }
  try{ localStorage.setItem('tsCurrentSheet',id); history.replaceState(null,'','#sheet='+encodeURIComponent(id)); }catch(e){}
  if(goSheet){ try{ selectCTab('sheet'); }catch(e){} }
  if(!AUTH||!AUTH.currentUser){ return; }   /* signed-in check still running: the live connection starts when it finishes */
  liveCur=true; var archLoaded=false;
  unsubCur=DB.collection(COL).doc(id).onSnapshot(function(snap){
    if(CUR!==id) return;
    if(!snap.exists){ if(!snap.metadata.fromCache){ CUR=null; curDoc=null; curMain=null; reset(); rerender(); } return; }
    if(!snap.metadata.hasPendingWrites) sync();
    var d=snap.data(); d._id=snap.id; fillLast(d);
    /* closed on another screen (or an old link): leave it, don't keep charting on a closed sheet */
    if(d.status==='closed'){ if(snap.metadata.hasPendingWrites) return; /* our own close — closeSheetFlow finishes it */ var nm=((d.patient||{}).name||'This patient'); closeCurrent(); try{ selectCTab('dash'); }catch(e){} try{ toast(nm+'’s sheet was closed'); }catch(e){} return; }
    curMain=d; if(!archLoaded&&d.audit_archived){ archLoaded=true; loadArchive(id); }
    d._inbox=d.marks||{}; maybeRefresh(d);
    recompose();
  },function(e){ console.warn('sheet listen failed',e); showGate('rules'); });
  listenDays(id);
  /* never spin forever: after 10 s say so and offer a reload */
  setTimeout(function(){ if(CUR!==id||curDoc) return; var el=document.getElementById('ctab-'+(currentCTab||'sheet')), c=el&&el.querySelector('.ts-empty-card');
    if(c) c.innerHTML='<span>Still connecting to the database…</span><button type="button" class="ts-btn primary" style="margin-top:12px" onclick="location.reload()">Reload</button>'; console.warn('[sheet] slow to open',id); },10000);
}
window.tsOpenSheet=openSheet;
function closeCurrent(){ unsubAllCur(); CUR=null; curDoc=null; curMain=null; curDays={}; dayLoaded={}; ARCH=[]; reset(); try{ localStorage.removeItem('tsCurrentSheet'); history.replaceState(null,'',location.pathname+location.search); }catch(e){} saveCacheSoon(); rerender(); }
/* past midnight: follow the new day's charting */
setInterval(function(){ if(CUR&&liveCur&&subDk&&subDk!==dayKey()){ dayLoaded={}; listenDays(CUR); } },30000);

/* the pet carries the family's last name ("Linda Vander Ploeg") so two Lindas are never confused; taken from the owner when the sheet has none */
function ownerLast(o){ o=String(o||'').trim(); if(!o) return ''; if(o.indexOf(',')>-1) return o.split(',')[0].trim(); var w=o.split(/\s+/); return w.length>1?w.slice(1).join(' '):''; }
function fillLast(x){ var p=x&&x.patient; if(p&&!String(p.last||'').trim()){ var l=ownerLast(p.owner); if(l) p.last=l; } return x; }
function sheetFrom(doc){ var x=doc.data(); x._id=doc.id; fillLast(x); x._inbox=x.marks||{}; x.marks=synthMarks(x,x._inbox); return x; }
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
function pickWant(){ var fromLink=(location.hash.match(/sheet=([^&]+)/)||[])[1], mine=null; try{ mine=localStorage.getItem('tsCurrentSheet'); }catch(e){} WANT=fromLink?decodeURIComponent(fromLink):null; WANT_GO=!!WANT&&WANT!==mine;   /* the app writes #sheet= itself: only a link to another sheet jumps to it — otherwise store/lastview.js brings back the tab the person was on */
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
function updateChip(){ emit('chip'); if(!chip) return; var n=CUR?(VISIT.patient||'Patient'):'No patient open';
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
/* closing a sheet: the charge check (store/chargecheck.js) goes first when the sheet has charges; the close itself is tsCloseSheet */
function closeSheetFlow(){ if(!CUR) return; if(window.tsChargeCheck&&window.tsChargeCheck()) return; closeSheetAsk(); }
function closeSheetAsk(){ var nm=VISIT.patient;
  modal('<h3>Close '+esc(nm)+'’s sheet?</h3><p>The sheet leaves the IP Board. Everything charted stays saved.</p>'
    +'<div class="ts-seg" id="tsCloseWhy"><button type="button" class="on" data-v="discharged">Discharged</button><button type="button" data-v="transferred">Transferred</button><button type="button" data-v="deceased">Deceased</button><button type="button" data-v="cancelled">Admitted in error</button></div>',
    'Close sheet',function(){ var b=document.querySelector('#tsCloseWhy .on'); tsCloseSheet(b?b.getAttribute('data-v'):'discharged'); });
  document.querySelectorAll('#tsCloseWhy button').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('#tsCloseWhy button').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on'); }; });
}
/* extra: more fields saved with the close (the charge check record); note: added to the audit line; after(ok) when the write settles */
window.tsCloseSheet=function(why,extra,note,after){ var id=CUR, me=user(), nm=VISIT.patient; if(!id) return;
  sync(); DB.collection(COL).doc(id).update(Object.assign({status:'closed',closed_reason:why,closed_at:new Date().toISOString(),closed_by:me.name||null,
    audit:FV.arrayUnion({at:new Date().toISOString(),type:'doctor',desc:'Sheet closed — '+why+(note?' · '+note:''),who:me.initials,uid:me.uid})},extra||{}))
    .then(function(){ closeCurrent(); selectCTab('dash'); toast(nm+' closed'); if(after) after(true); })
    .catch(function(){ toast('Couldn’t close the sheet'); if(after) after(false); }); };

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
    +'<label>Attending doctor<input id="nsDoc" placeholder="Dr. Downes"></label><label>Location<select id="nsLoc"><option value="">Not set</option><option>ICU</option><option>Wards</option><option>Isolation</option></select></label>'
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
if(AUTH){ AUTH.onAuthStateChanged(function(u){ if(u){ hideGate(); var ini=user().initials; if(ini&&ini!=='—'){ var i=STAFF.indexOf(ini); if(i>-1) STAFF.splice(i,1); STAFF.unshift(ini); } listen(); applyRole(); if(CUR&&!liveCur) openSheet(CUR,false,true); rerender(); }
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
/* the sheet's role (what you can do) follows the signed-in account — no Role picker */
function applyRole(){ var r=staffRole(), me=normName(user().name), T=(window.TS_STAFF&&window.TS_STAFF.techs)||[];
  var role=r==='admin'?'admin':r==='doctor'?'doctor':r==='liaison'?'liaison':'tech';
  if(!r&&me&&!T.some(function(n){ return normName(n)===me; })) role='tech';
  try{ if(currentRole!==role){ currentRole=role; if(currentCTab==='sheet'&&CUR&&curDoc){ renderSheet(); } } }catch(e){} }
window.tsRole=function(){ try{ return currentRole; }catch(e){ return null; } };
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
    +(window.tsChProjRow?tsChProjRow():'')   /* projected cost if nothing changes (store/charges.js) */
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
    +'</div>'+(window.tsEstPlanHTML?tsEstPlanHTML():'')+'<p class="tm-note">Current charges come from the medical record. Update them when you check the account.</p>','Save estimate',function(){
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
/* ═════════ TS KERNEL — named extension points + the order API ═════════
   Modules add behaviour by registering on a hook, never by replacing another module's function.
     on(name, fn, order)  register (lower order runs first; default 0)
     emit(name, …)        run every handler; a failing handler is logged and never breaks the caller
     claim(name, …)       routing: the first handler that returns something truthy wins (its value is returned)
     allow(name, …)       guards: false as soon as one handler returns false
   Hooks (owner → listeners):
     clock                  base nowMin            → days (the clock of a day looked back at)
     tasks.build/.built     base buildTasks        → days (that day's tasks) · ops (abnormal readings tinted)
     compose                base compose           → days (adds the day looked back at)
     sync.allowed           base sync              → days (nothing is saved while a past day is shown)
     sheet.opening          base openSheet         → days (a newly opened patient starts on today)
     visit                  base visitFrom         → handoff (doctorTo = the next doctor)
     board.rows             base tsBoardList       → ops (alerts, tech chip)
     header.refresh         base refreshHeader     → loc · handoff · ops · header
     header.parts           loc/ops/handoff redrew a part → header (redraw the flat header)
     rendered               base rerender          → ops (alert bar)
     sheet.drawn            base renderSheet       → seen · drafts (toolbar pills)
     order.window           rx · fluids order windows → drafts ("your orders need approval")
     orders.adding/.added   kernel addOrders       → drafts (an intern's orders become drafts) · sortorder (rescue drugs pinned)
     chip                   base updateChip        → tasks (badge, live list)
     task.charted           completeTask/saveTask adapter · Tasks tab · batch → safety (weight check)
     completion.open        openCompletion adapter → days (view-only on a past day)
     search.extra           rx tsRender            → fluids · sets (their rows in the order search)
     pick                   rx tsPick              → days (past-day block) · fluids (inf:) · sets (set:)
     rx.opened/.validate/.added  rx order window    → safety (duplicate banner + guard) · orders (Change… replaces the old order)
     order.panel            orders tsOrderPanel    → fluids (infusion card)
   window.tsHooks.list() shows what is registered. */
function hookList(n){ var m=hookList.m||(hookList.m={}); return m[n]||(m[n]=[]); }
function on(n,fn,order){ var L=hookList(n); L.push({fn:fn,order:order||0}); L.sort(function(a,b){ return a.order-b.order; }); }
function emit(n){ var a=[].slice.call(arguments,1); hookList(n).forEach(function(h){ try{ h.fn.apply(null,a); }catch(e){ console.warn('[hook '+n+']',e); } }); }
function claim(n){ var a=[].slice.call(arguments,1), L=hookList(n); for(var i=0;i<L.length;i++){ try{ var r=L[i].fn.apply(null,a); if(r) return r; }catch(e){ console.warn('[hook '+n+']',e); } } return null; }
function allow(n){ var a=[].slice.call(arguments,1), L=hookList(n); for(var i=0;i<L.length;i++){ try{ if(L[i].fn.apply(null,a)===false) return false; }catch(e){ console.warn('[hook '+n+']',e); } } return true; }
window.tsEmit=function(){ emit.apply(null,arguments); };   /* for core/ (outside the store's scope): core/nav.js tab, core/board.js board.view */
window.tsHooks={list:function(){ var m=hookList.m||{}; return Object.keys(m).reduce(function(o,k){ o[k]=m[k].length; return o; },{}); }};

/* ---------- orders: the one way to add or change them — the grid redraws and the change is saved ----------
   ORDERS holds the sheet's own copies (hydrate), so a changed order differs from the stored one and sync() writes it. */
/* a treatment moved to another hour (drag on the grid, store/move.js): order.moves = {'<YYYYMMDD>_<scheduled min>': new min}.
   The slot keeps its key (charting still saves under the original slot); only its time changes. */
function slotMin(o,dk,min){ var m=o&&o.moves&&o.moves[dk+'_'+min]; return m!=null?m:min; }
function redrawSheet(){ try{ renderSheet(); }catch(e){ try{ buildGrid(); }catch(_){} } }
function orderById(id){ return (ORDERS||[]).find(function(o){ return o.id===id; })||null; }
/* rebuild the day's tasks without losing what was charted on screen but not saved yet (the save is debounced) */
function rebuildTasks(){ var prev={}; (TASKS||[]).forEach(function(t){ if(t.key) prev[t.key]=t; }); buildTasks(); var have={};
  TASKS.forEach(function(t){ have[t.key]=1; var p=prev[t.key]; if(p&&p!==t){ t.status=p.status; t.by=p.by; t.completedMin=p.completedMin; t.value=p.value; t.notes=p.notes; t.given=p.given; t.vol=p.vol; t.reason=p.reason; t.hist=p.hist; t.at=p.at; } });
  Object.keys(prev).forEach(function(k){ var p=prev[k]; if(!have[k]&&p.adhoc&&p.status&&orderById(p.orderId)){ p.order=orderById(p.orderId); TASKS.push(p); } }); }
function addOrders(list){ emit('orders.adding',list); list.forEach(function(o){ ORDERS.push(o); }); try{ ORDERS.sort(orderCmp); }catch(e){} rebuildTasks(); redrawSheet(); sync(); emit('orders.added',list); return list; }   /* orders.adding: drafts.js marks an intern's orders as drafts */
function updateOrder(id,patch){ var o=orderById(id); if(!o) return null; Object.assign(o,patch); rebuildTasks(); redrawSheet(); sync(); return o; }
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
  var total=doseTotal(Number(o.dose)||0,unit,w,spKey()), vol=base==='mL'?total:(o.conc?total/o.conc:null);
  return {mg:fmtN(total)+' '+base, volume:vol!=null?fmtVol(vol)+' mL':'—', raw:total}; };
/* volumes never end in a trailing zero (ISMP: "4 mL", never "4.00 mL", which can be misread as 400) — two decimals at most, three under 0.1 mL */
function fmtVol(v){ var r=v<0.1?Math.round(v*1000)/1000:Math.round(v*100)/100; return String(r); }

/* first dose/check defaults to now; the rest of today's hours follow */
function hourOpts(){ var ch=Math.floor(nowMin()/60), out='<option value="'+ch+'" selected>Now · '+fmtTime(ch*60)+'</option>';
  for(var h=ch+1;h<24;h++) out+='<option value="'+h+'">'+fmtTime(h*60)+'</option>';
  out+='<optgroup label="Earlier today">'; for(var g=0;g<ch;g++) out+='<option value="'+g+'">'+fmtTime(g*60)+'</option>'; return out+'</optgroup>'; }
/* after adding: scroll to the row, flash it, and say when the next one is due */
function nextDueText(o){ if(o.draft) return 'draft — waiting for a doctor to approve'; var ts=freqTimes(o), ch=nowMin()/60;
  if(o.freq==='PRN') return 'as needed';
  var up=ts.filter(function(h){ return h>=Math.floor(ch); }); if(up.length) return 'next '+fmtTime(up[0]*60);
  if(ts.length) return 'first '+fmtTime(ts[0]*60)+' (overdue)';
  var iv=FREQ_INT[o.freq]; if(iv){ var nx=(o.start+iv)%24; return 'next '+fmtTime(nx*60)+' tomorrow'; } return 'scheduled'; }
function revealOrder(o){ setTimeout(function(){ var rows=document.querySelectorAll('#sheetInner .rl-name'), el=null;
    rows.forEach(function(r){ if(!el&&(r.firstChild?r.firstChild.textContent:r.textContent).trim()===o.name) el=r; }); if(!el) return; var row=el.closest('.grow')||el;
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
  ['Catalyst Chem15 CBC Lytes','diag','',['Once','q12h','q24h'],'chem chemistry chem15 cbc lytes electrolytes bloodwork panel catalyst idexx'],
  ['Nova panel','obs','',['q4h','q6h','q8h','q12h','q24h'],'nova blood gas bgas lytes electrolytes lactate ionized calcium istat'],
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
/* a section band's "+" scopes the search to that section (store/sections.js sets window.tsSearchScope; cleared when the search closes) */
var SCOPE_T={'Basic Observation':'obs','Patient Care':'care','Diagnostics':'diag'};
window.tsRender=function(q){ var raw=(q||'').trim(); q=raw.toLowerCase(); var html='', rows=[], sp=spKey(), scope=window.tsSearchScope||'', sT=SCOPE_T[scope]||'';
  var d=document.getElementById('tsDrop'); if(!d) return;
  if(!DRUGS){ d.innerHTML='<div class="ts-empty">Loading…</div>'; d.style.display='block';
    loadDrugs().then(function(r){ if(r===null){ d.innerHTML='<div class="ts-empty">Couldn’t load the medication list</div>'; return; }
      if(d.style.display!=='none') window.tsRender((document.getElementById('tsSearch')||{}).value||''); }); return; }
  var row=function(key,label,meta){ var k=rows.length; rows.push(key);
    return '<button class="ts-item" data-i="'+k+'" onmouseenter="tsHi('+k+')" onmousedown="event.preventDefault();tsPick(\''+esc(key.replace(/\\/g,'\\\\').replace(/'/g,"\\'"))+'\')"><span>'+label+'</span>'+(meta?'<small class="ts-meta">'+meta+'</small>':'')+'</button>'; };
  if(q){
    var hits=(scope&&scope!=='Medications')?[]:DRUGS.map(function(x,i){ var r=drugScore(x,q); return {i:i,s:r.s,b:r.b}; }).filter(function(h){ return h.s<9; })
      .sort(function(a,b){ return a.s-b.s||DRUGS[a.i].n.localeCompare(DRUGS[b.i].n); }).slice(0,scope?10:6);
    var obs=(scope&&!sT)?[]:OBS.map(function(x,i){ return {i:i,s:(sT&&x.t!==sT)?9:scoreName(x.n,q,x.k)}; }).filter(function(h){ return h.s<9; }).sort(function(a,b){ return a.s-b.s; }).slice(0,scope?10:6);
    var obsFirst=obs.length&&(!hits.length||obs[0].s<hits[0].s);
    var medHTML='', obsHTML='', careHTML='';
    hits.forEach(function(h){ var x=DRUGS[h.i], n=sp?x.r.filter(function(e){ return e.s.indexOf(sp)>-1; }).length:x.r.length;
      var br=h.b||tsBrand(x.n); medHTML+=row('drug:'+h.i,esc(x.n)+(br?' <span class="ts-brand">'+esc(br)+'</span>':''),n?n+(sp?' '+sp:'')+' dose'+(n>1?'s':''):'no '+(sp||'')+' dose listed'); });
    obs.forEach(function(h){ var x=OBS[h.i], ex=onSheet(x.n), meta=ex?'on sheet · '+ex.freq:'suggested '+x.f.slice(0,3).join(' · ');
      if(x.t==='care') careHTML+=row('obs:'+h.i,esc(x.n),meta); else obsHTML+=row('obs:'+h.i,esc(x.n),meta); });
    var blocks=[]; if(medHTML) blocks.push(['Medications',medHTML]); if(obsHTML) blocks.push(['Monitoring',obsHTML]); if(careHTML) blocks.push(['Patient Care',careHTML]);
    if(obsFirst) blocks.sort(function(a,b){ return (a[0]==='Medications')-(b[0]==='Medications'); });
    blocks.forEach(function(b){ html+='<div class="ts-cat">'+b[0]+'</div>'+b[1]; });
    if(scope!=='Medications'&&scope!=='Continuous Infusions') html+='<div class="ts-cat">Custom</div>'+row('custom:'+raw,'Add “'+esc(raw)+'” as an order'+(scope?' in '+esc(scope):''),'choose frequency');
  } else if(scope==='Medications'){ html+='<div class="ts-hint">Type a drug name — '+DRUGS.length+' in the reference</div>';
  } else if(sT){ OBS.forEach(function(x,i){ if(x.t!==sT) return; var ex=onSheet(x.n); html+=row('obs:'+i,esc(x.n),ex?'on sheet · '+ex.freq:'suggested '+x.f.slice(0,3).join(' · ')); });
  } else if(scope){   /* Continuous Infusions: its rows come from fluids.js (search.extra) */
  } else {
    html+='<div class="ts-cat">Medications</div><div class="ts-hint">Type a drug name — '+DRUGS.length+' in the reference</div>';
    html+='<div class="ts-cat">Common monitoring</div>';
    ['Blood pressure','Blood glucose','SpO2','Urine output','Pain score','Neuro check'].forEach(function(n){ var i=OBS.findIndex(function(x){ return x.n===n; }), ex=onSheet(n);
      html+=row('obs:'+i,esc(n),ex?'on sheet · '+ex.freq:'suggested '+OBS[i].f.slice(0,3).join(' · ')); });
  }
  if(scope) html='<div class="ts-scope"><span>Adding to <b>'+esc(scope)+'</b></span><button type="button" onmousedown="event.preventDefault();tsScopeClear()">All orders</button></div>'+html;
  tsRows=rows; tsIdx=rows.length?0:-1; d.innerHTML=html; d.style.display='block'; emit('search.extra',raw); try{ tsMark(); }catch(e){} };
window.tsPick=function(key){ key=String(key); var scT=SCOPE_T[window.tsSearchScope||'']||'obs'; try{ closeTsDrop(); }catch(e){} var si=document.getElementById('tsSearch'); if(si) si.value=''; if(window.tsScopeClear) tsScopeClear(true);
  if(!CUR||!curDoc){ toast('Open a patient first'); return; }
  if(claim('pick',key)) return;   /* past-day block, inf:, set: … */
  if(key.indexOf('drug:')===0) return openMedOrder(+key.slice(5));
  if(key.indexOf('obs:')===0) return openObsOrder(OBS[+key.slice(4)]);
  if(key.indexOf('custom:')===0) return openObsOrder({n:key.slice(7),t:scT,u:'',f:[],custom:true});
  var m=OBS.find(function(x){ return x.n.toLowerCase()===key.replace(/\s+q\d+h$/i,'').toLowerCase(); });   /* older quick items */
  return openObsOrder(m||{n:key.replace(/\s+q\d+h$/i,''),t:'obs',u:'',f:[],custom:true}); };

/* ---------- monitoring / care order: pick a frequency (suggestions first) ---------- */
function openObsOrder(x){
  var ex=onSheet(x.n), hrs=hourOpts();
  var chip=function(f,sugg){ return '<button type="button" class="rx-chip'+(sugg?' sugg':'')+'" data-f="'+f+'" onclick="tsObsFreq(this)">'+f+'</button>'; };
  var more=FREQS.filter(function(f){ return x.f.indexOf(f)<0; });
  modal('<h3>'+(x.custom?'New order':esc(x.n))+'</h3><p>'+esc(VISIT.patient)+(ex?' · already on the sheet at <b>'+esc(ex.freq)+'</b> — choosing a frequency updates it':'')+'</p>'
    +(x.custom?'<div class="tm-grid"><label class="wide">Order<input id="obName" value="'+esc(x.n)+'"></label><label>Section<select id="obSec">'+[['obs','Monitoring'],['care','Patient Care'],['diag','Diagnostics']].map(function(o){ return '<option value="'+o[0]+'"'+(x.t===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select></label><label>Unit<input id="obUnit" placeholder="Optional"></label></div>':'')
    +(x.f.length?'<div class="rx-lbl">Suggested</div><div class="rx-chips">'+x.f.map(function(f){ return chip(f,true); }).join('')+'</div>':'')
    +'<div class="rx-lbl">'+(x.f.length?'Other':'Frequency')+'</div><div class="rx-chips">'+more.map(function(f){ return chip(f,false); }).join('')+'</div>'
    +'<div class="tm-grid" style="margin-top:14px"><label>First check<select id="obStart">'+hrs+'</select></label><label>Instructions<input id="obNotes" placeholder="Optional — how, or when to call"></label></div>',
    ex?'Update order':'Add to sheet', function(){ return tsObsSubmit(x,ex); });
  window._obsFreq=''; emit('order.window',x.t==='diag'?'diag':x.t||'obs');
}
window.tsObsFreq=function(b){ document.querySelectorAll('#tsModal .rx-chip').forEach(function(c){ c.classList.toggle('on',c===b); }); window._obsFreq=b.dataset.f; };
function tsObsSubmit(x,ex){
  var v=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); }, f=window._obsFreq;
  var name=x.custom?v('obName'):x.n; if(!name){ toast('Enter the order'); return false; }
  if(!f){ toast('Choose a frequency'); return false; }
  var start=parseInt(v('obStart'),10), me=user(), sec=x.custom?v('obSec'):x.t;
  var section=sec==='care'?'Patient Care':sec==='diag'?'Diagnostics':'Basic Observation', type=sec==='care'?'care':sec==='diag'?'diag':'obs';
  var oo;
  if(ex){ var pt={freq:f,start:start}; if(v('obNotes')) pt.notes=v('obNotes'); logEvent('doctor','Order changed — <b>'+esc(name)+'</b> now '+f,me.initials); oo=updateOrder(ex.id,pt)||ex; }
  else { var o={id:'c'+Date.now().toString(36),type:type,section:section,name:name,freq:f,start:start,notes:v('obNotes'),ordered_by:me.initials,ordered_at:new Date().toISOString()};
    var unit=x.custom?v('obUnit'):x.u; if(unit) o.unit=unit;
    logEvent('doctor','Order added — <b>'+esc(name)+'</b> '+f,me.initials); addOrders([o]); oo=o; }
  toast(name+(ex?' updated':' added')+' · '+nextDueText(oo)); revealOrder(oo); return true; }

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
  modal('<h3>'+esc(x.n)+(brandsOf(x.n).length?' <span class="rx-brand">'+esc(brandsOf(x.n).join(' · '))+'</span>':'')+'</h3><p>'+esc(VISIT.patient)+' · '+esc(VISIT.species||'')+' · <b>'+(kg?kg+' kg':'no weight')+'</b>'+(kg?'':' — add a triage weight to calculate doses')+'</p>'
    +'<div class="rx-lbl">Reference doses'+(sp?' · '+(sp==='cat'?'cats':'dogs'):'')+'</div><div class="rx-refs">'+refs+'</div>'
    +'<div class="tm-grid" style="margin-top:14px">'
    +'<label>Dose<span class="rx-dose"><input id="rxDose" inputmode="decimal" placeholder="Enter dose" oninput="tsRxCalc(true)"><select id="rxUnit" onchange="tsStockAuto();tsRxCalc(true)">'
      +opt(['mg/kg','mcg/kg','U/kg','mL/kg','g/kg','mg/lb','mg/m²','mcg/m²','mg','mcg','U','mL'],'mg/kg')+'</select></span></label>'
    +'<label>Route<select id="rxRoute" onchange="tsRxRoute()"><option value="">Choose…</option>'+opt(['IV','SQ','IM','PO','Topical','Ophthalmic','Otic','Rectal','Inhaled','Intranasal','Transdermal'],'')+'</select></label>'
    +'<label>Frequency<select id="rxFreq"><option value="">Choose…</option>'+opt(FREQS,'')+'</select></label>'
    +'<label>First dose<select id="rxStart">'+hrs+'</select></label>'
    +'<label>Concentration <span id="rxConcU">(mg/mL)</span><input id="rxConc" inputmode="decimal" placeholder="Optional" oninput="tsRxConcEdit()"></label>'
    +'<label>Instructions<input id="rxNotes" placeholder="Optional — e.g. give with food"></label>'
    +'</div><div class="rx-stock" id="rxStock" style="display:none"></div><div class="rx-calc" id="rxCalc">Enter a dose to calculate</div><div class="rx-sugg" id="rxSugg"></div><div class="rx-range" id="rxRange"></div><div id="rxPrn" style="display:none"></div>'
    +(canOrder?'':'<p class="rx-warn rx-block">Signed in as <b>'+esc(user().name||'—')+'</b>. Only doctors can place medication orders.</p>'),
    canOrder?'Add to sheet':'Close', function(){ return canOrder?tsRxSubmit():true; });
  emit('rx.opened',i); emit('order.window','med');
  setTimeout(function(){ var c=document.querySelector('#tsModal .tm-card'); if(c) c.classList.add('rx-card');
    var best=bestRegimen(mine); if(best) tsRxPick('m',mine.indexOf(best),true); else tsStockAuto(); },30);
}
window.tsOpenMedOrder=function(name){ return loadDrugs().then(function(){ var l=String(name).toLowerCase(), i=DRUGS.findIndex(function(x){ return x.n.toLowerCase()===l; }); if(i<0) i=DRUGS.findIndex(function(x){ return brandsOf(x.n).some(function(b){ return b.toLowerCase()===l; }); }); if(i>-1) openMedOrder(i); return i; }); };
/* tapping a reference (or opening the drug) fills in a suggested dose: the value, or the low end of a range */
window.tsRxRoute=function(){ if(!RX) return; var r=(document.getElementById('rxRoute')||{}).value; if(!r) return;
  if(RX.sel&&routeOf(RX.sel)===r) return;
  var best=bestRegimen(RX.mine,r);
  if(best){ tsRxPick('m',RX.mine.indexOf(best),true); return; }
  RX.sel=null; RX.suggested=null; document.querySelectorAll('#tsModal .rx-ref').forEach(function(b){ b.classList.remove('on'); });
  tsStockAuto(); tsRxCalc(); var sg=document.getElementById('rxSugg'); if(sg){ sg.innerHTML='No '+(spKey()||'')+' reference dose for '+esc(r)+' — enter and confirm the dose.'; sg.style.display='block'; } };
window.tsRxPick=function(grp,k){ if(!RX) return; var e=(grp==='m'?RX.mine:RX.others)[k]; if(!e) return; RX.sel=e; RX.touched=false;
  document.querySelectorAll('#tsModal .rx-ref').forEach(function(b){ b.classList.toggle('on',b.dataset.k===grp+k); });
  var u=unitOf(e), r=routeOf(e), f=freqOf(e), set=function(id,v){ var el=document.getElementById(id); if(el&&v!=null&&v!=='') el.value=v; };
  if(u){ var us=document.getElementById('rxUnit'); if(us&&![].some.call(us.options,function(o){ return o.value===u; })){ var o=document.createElement('option'); o.textContent=u; us.appendChild(o); } set('rxUnit',u); }
  set('rxRoute',r); set('rxFreq',f);
  var dz=document.getElementById('rxDose');
  if(dz){ if(e.d&&e.d[0]!=null){ dz.value=String(e.d[0]); RX.suggested={v:e.d[0],range:e.d[1]!=null&&e.d[1]!==e.d[0]}; } else { dz.value=''; RX.suggested=null; } }
  if(e.c&&e.c[0]&&/mg\/mL/i.test(e.c[1]||'')) set('rxConc',String(e.c[0]));
  tsStockAuto(); tsRxCalc(); };
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
  /* the dose bar, 24-hour total, overlapping drugs and PRN rules (store/medsafe.js) */
  if(rg){ rg.innerHTML=''; rg.style.display='none'; } emit('rx.calc'); };
function tsRxSubmit(){
  var v=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); };
  var dose=parseFloat(v('rxDose')), unit=v('rxUnit'), route=v('rxRoute'), freq=v('rxFreq'), start=parseInt(v('rxStart'),10), conc=parseFloat(v('rxConc'));
  if(!(dose>0)){ toast('Enter the dose'); return false; }
  if(!route){ toast('Choose a route'); return false; }
  if(!freq){ toast('Choose a frequency'); return false; }
  if(!allow('rx.validate')) return false;   /* duplicate needs a tick · an out-of-range dose needs a reason · a PRN needs its rules (safety.js, medsafe.js) */
  var x=RX.x, e=RX.sel, me=user(), now=new Date();
  var o={id:'m'+now.getTime().toString(36),type:'med',section:'Medications',name:x.n,dose:dose,unit:unit,route:route,freq:freq,start:isNaN(start)?Math.ceil(nowMin()/60):start,
    conc:conc>0?conc:null,conc_label:(conc>0&&RX.stockK!=null&&stockOf(x))?stockOf(x).s[RX.stockK][2]:null,conc_source:conc>0?(RX.stockK!=null?'hospital_stock':'doctor_entered'):null,notes:v('rxNotes'),drug_id:x.id,ordered_by:me.initials,ordered_by_name:me.name,ordered_at:now.toISOString(),dose_source:(e&&RX.suggested&&!RX.touched)?'reference_suggestion':'doctor_entered'};
  if(e) o.ref={dose:e.do,route:e.ro,freq:e.fo,indication:e.i,species:e.s,source:e.u||null};
  emit('rx.build',o);   /* order.safety (why an out-of-range dose) · order.prn (how often, when) */
  var d=medDose(o);
  logEvent('doctor','Order added — <b>'+esc(x.n)+'</b> '+dose+' '+unit+' ('+d.mg+(o.conc?' = '+d.volume+' of '+(o.conc_label||o.conc+' '+unit.split('/')[0]+'/mL'):'')+') '+route+' '+freq,me.initials);
  addOrders([o]); emit('rx.added',o);
  toast(x.n+' added · '+nextDueText(o)); revealOrder(o); return true; }
/* the prototype's order composer is gone: anything that still calls it lands in the real order search */
window.openOrderBuilder=function(){ var s=document.getElementById('tsSearch'); if(s){ s.focus(); try{ window.tsRender(s.value||''); }catch(e){} } };
/* the drug reference loads quietly after start-up, so the first search is instant */
setTimeout(function(){ var go=function(){ if(AUTH&&AUTH.currentUser&&!document.hidden) loadDrugs(); else setTimeout(go,8000); };
  if(window.requestIdleCallback) requestIdleCallback(go,{timeout:6000}); else go(); },4000);

/* ---------- hospital stock strengths: the injectable's concentration fills in so the order shows the mL to draw up ----------
   Standard US product strengths — a starting list for the medical director / pharmacy to confirm.
   [value, unit per mL, label]. Several strengths in use → pick:1 = shown as choices, nothing filled in until the doctor picks.
   Not here on purpose: powders mixed in the hospital (cefazolin, ampicillin, …) and insulin (drawn up in units). */
var STOCK={
  'Acepromazine':{s:[[10,'mg','10 mg/mL']]},
  'Alfaxalone':{s:[[10,'mg','Alfaxan 10 mg/mL']]},
  'Alfentanil':{s:[[500,'mcg','500 mcg/mL']]},
  'Amikacin':{s:[[250,'mg','250 mg/mL'],[50,'mg','50 mg/mL']],pick:1},
  'Aminophylline':{s:[[25,'mg','25 mg/mL']]},
  'Amiodarone':{s:[[50,'mg','50 mg/mL']]},
  'Atipamezole':{s:[[5,'mg','Antisedan 5 mg/mL']]},
  'Atropine':{s:[[0.54,'mg','0.54 mg/mL'],[0.4,'mg','0.4 mg/mL']],pick:1},
  'Bupivacaine':{s:[[5,'mg','0.5% · 5 mg/mL'],[2.5,'mg','0.25% · 2.5 mg/mL']],pick:1},
  'Buprenorphine':{s:[[0.3,'mg','0.3 mg/mL'],[1.8,'mg','Simbadol 1.8 mg/mL']],pick:1},
  'Butorphanol':{s:[[10,'mg','10 mg/mL']]},
  'Calcium chloride':{s:[[100,'mg','10% · 100 mg/mL']]},
  'Calcium gluconate':{s:[[100,'mg','10% · 100 mg/mL']]},
  'Carboplatin':{s:[[10,'mg','10 mg/mL']]},
  'Cefovecin':{s:[[80,'mg','Convenia 80 mg/mL']]},
  'Clindamycin':{s:[[150,'mg','150 mg/mL']]},
  'Cosyntropin':{s:[[250,'mcg','250 mcg/mL']]},
  'Cyanocobalamin':{s:[[1000,'mcg','1,000 mcg/mL']]},
  'Desmopressin':{s:[[4,'mcg','4 mcg/mL']]},
  'Desoxycorticosterone pivalate':{s:[[25,'mg','25 mg/mL']]},
  'Dexamethasone':{s:[[4,'mg','Dex SP 4 mg/mL'],[2,'mg','2 mg/mL']],pick:1},
  'Dexmedetomidine':{s:[[0.5,'mg','Dexdomitor 0.5 mg/mL'],[0.1,'mg','Dexdomitor 0.1 mg/mL']],pick:1},
  'Dextrose':{s:[[500,'mg','50% · 500 mg/mL']]},
  'Diazepam':{s:[[5,'mg','5 mg/mL']]},
  'Diltiazem':{s:[[5,'mg','5 mg/mL']]},
  'Diphenhydramine':{s:[[50,'mg','50 mg/mL']]},
  'Dobutamine':{s:[[12.5,'mg','12.5 mg/mL']]},
  'Dolasetron':{s:[[20,'mg','20 mg/mL']]},
  'Dopamine':{s:[[40,'mg','40 mg/mL']]},
  'Doxapram':{s:[[20,'mg','20 mg/mL']]},
  'Doxorubicin':{s:[[2,'mg','2 mg/mL']]},
  'Enoxaparin':{s:[[100,'mg','100 mg/mL']]},
  'Enrofloxacin':{s:[[22.7,'mg','2.27% · 22.7 mg/mL'],[100,'mg','100 mg/mL']],pick:1},
  'Epinephrine':{s:[[1,'mg','1 mg/mL (1:1,000)'],[0.1,'mg','0.1 mg/mL (1:10,000)']],pick:1},
  'Esmolol':{s:[[10,'mg','10 mg/mL']]},
  'Etomidate':{s:[[2,'mg','2 mg/mL']]},
  'Famotidine':{s:[[10,'mg','10 mg/mL']]},
  'Fentanyl':{s:[[50,'mcg','50 mcg/mL']]},
  'Flumazenil':{s:[[0.1,'mg','0.1 mg/mL']]},
  'Furosemide':{s:[[50,'mg','50 mg/mL']]},
  'Gentamicin':{s:[[100,'mg','100 mg/mL'],[50,'mg','50 mg/mL'],[40,'mg','40 mg/mL']],pick:1},
  'Glycopyrrolate':{s:[[0.2,'mg','0.2 mg/mL']]},
  'Heparin':{s:[[1000,'U','1,000 U/mL'],[5000,'U','5,000 U/mL']],pick:1},
  'Hydralazine':{s:[[20,'mg','20 mg/mL']]},
  'Hydrocortisone':{s:[[50,'mg','Solu-Cortef 50 mg/mL']]},
  'Hydromorphone':{s:[[2,'mg','2 mg/mL'],[10,'mg','10 mg/mL']],pick:1},
  'Ketamine':{s:[[100,'mg','100 mg/mL']]},
  'Levetiracetam':{s:[[100,'mg','100 mg/mL']]},
  'Lidocaine':{s:[[20,'mg','2% · 20 mg/mL']]},
  'Magnesium sulfate':{s:[[500,'mg','50% · 500 mg/mL'],[4.06,'mEq','50% · 4.06 mEq/mL']]},
  'Mannitol':{s:[[200,'mg','20% · 200 mg/mL'],[250,'mg','25% · 250 mg/mL']],pick:1},
  'Maropitant':{s:[[10,'mg','Cerenia 10 mg/mL']]},
  'Medetomidine':{s:[[1,'mg','1 mg/mL']]},
  'Meloxicam':{s:[[5,'mg','5 mg/mL']]},
  'Methadone':{s:[[10,'mg','10 mg/mL']]},
  'Methocarbamol':{s:[[100,'mg','100 mg/mL']]},
  'Methylprednisolone':{s:[[20,'mg','20 mg/mL'],[40,'mg','40 mg/mL']],pick:1},
  'Metoclopramide':{s:[[5,'mg','5 mg/mL']]},
  'Metronidazole':{s:[[5,'mg','IV 5 mg/mL']]},
  'Midazolam':{s:[[5,'mg','5 mg/mL'],[1,'mg','1 mg/mL']],pick:1},
  'Morphine':{s:[[15,'mg','15 mg/mL'],[10,'mg','10 mg/mL'],[1,'mg','1 mg/mL']],pick:1},
  'Naloxone':{s:[[0.4,'mg','0.4 mg/mL']]},
  'Norepinephrine':{s:[[1,'mg','1 mg/mL']]},
  'Octreotide':{s:[[100,'mcg','100 mcg/mL'],[50,'mcg','50 mcg/mL'],[500,'mcg','500 mcg/mL']],pick:1},
  'Ondansetron':{s:[[2,'mg','2 mg/mL']]},
  'Oxymorphone':{s:[[1,'mg','1 mg/mL']]},
  'Oxytocin':{s:[[20,'U','20 U/mL'],[10,'U','10 U/mL']],pick:1},
  'Pantoprazole':{s:[[4,'mg','40 mg vial in 10 mL · 4 mg/mL']]},
  'Phenobarbital':{s:[[65,'mg','65 mg/mL'],[130,'mg','130 mg/mL']],pick:1},
  'Phytonadione':{s:[[10,'mg','10 mg/mL']]},
  'Potassium chloride':{s:[[2,'mEq','2 mEq/mL']]},
  'Potassium phosphate':{s:[[3,'mmol','K phos · 3 mmol/mL phosphate'],[4.4,'mEq','K phos · 4.4 mEq/mL potassium']]},
  'Pralidoxime':{s:[[50,'mg','1 g in 20 mL · 50 mg/mL']]},
  'Procainamide':{s:[[100,'mg','100 mg/mL'],[500,'mg','500 mg/mL']],pick:1},
  'Propofol':{s:[[10,'mg','10 mg/mL']]},
  'Propranolol':{s:[[1,'mg','1 mg/mL']]},
  'Robenacoxib':{s:[[20,'mg','Onsior 20 mg/mL']]},
  'Ropivacaine':{s:[[5,'mg','0.5% · 5 mg/mL'],[2,'mg','0.2% · 2 mg/mL'],[7.5,'mg','0.75% · 7.5 mg/mL']],pick:1},
  'Sodium bicarbonate':{s:[[1,'mEq','8.4% · 1 mEq/mL']]},
  'Sodium nitroprusside':{s:[[25,'mg','25 mg/mL']]},
  'Terbutaline':{s:[[1,'mg','1 mg/mL']]},
  'Thiamine':{s:[[100,'mg','100 mg/mL'],[200,'mg','200 mg/mL']],pick:1},
  'Tiletamine / zolazepam':{s:[[100,'mg','Telazol 100 mg/mL']]},
  'Triamcinolone acetonide':{s:[[2,'mg','2 mg/mL'],[10,'mg','10 mg/mL'],[40,'mg','40 mg/mL']],pick:1},
  'Vasopressin':{s:[[20,'U','20 U/mL']]},
  'Vinblastine':{s:[[1,'mg','1 mg/mL']]},
  'Vincristine':{s:[[1,'mg','1 mg/mL']]}
};
window.TS_STOCK=STOCK;
var INJ={IV:1,SQ:1,IM:1,IO:1};
var MASS={g:1000,mg:1,mcg:0.001};
/* a stock strength in the dose's unit per mL (10 mg/mL for a mg/kg dose, 50 mcg/mL for mcg/kg), or null if the units don't match */
function concFor(st,unit){ var base=String(unit||'mg/kg').split('/')[0], u=st[1];
  if(MASS[u]&&MASS[base]) return st[0]*MASS[u]/MASS[base];
  return u===base?st[0]:null; }
function stockOf(x){ return x&&STOCK[x.n]||null; }
function rxv(id){ return ((document.getElementById(id)||{}).value||'').trim(); }
/* chips under the dose: the hospital's strengths; one standard strength is filled in for IV/SQ/IM */
window.tsStockRender=function(){ var el=document.getElementById('rxStock'); if(!el||!RX) return; var st=stockOf(RX.x), unit=rxv('rxUnit');
  if(!st){ el.innerHTML=''; el.style.display='none'; return; }
  var html=st.s.map(function(s,k){ var ok=concFor(s,unit)!=null; if(!ok&&st.s.some(function(t){ return concFor(t,unit)!=null; })) return '';
    return '<button type="button" class="rx-chip'+(RX.stockK===k?' on':'')+'"'+(ok?'':' disabled')+' onclick="tsStockPick('+k+')">'+esc(s[2])+'</button>'; }).join('');
  el.innerHTML='<div class="rx-lbl">Stock strength'+(st.pick?' · choose the one you are using':'')+'</div><div class="rx-chips">'+html+'</div>'; el.style.display='block'; };
window.tsStockPick=function(k){ if(!RX) return; var st=stockOf(RX.x); if(!st||!st.s[k]) return; var c=concFor(st.s[k],rxv('rxUnit')); if(c==null) return;
  RX.stockK=k; RX.stockAuto=false; RX.concTouched=false; var ci=document.getElementById('rxConc'); if(ci) ci.value=String(+c.toPrecision(6));
  tsStockRender(); tsRxCalc(); };
/* route or unit changed: refill the strength the doctor (or the default) chose, in the new unit; drop it for PO/topical */
window.tsStockAuto=function(){ if(!RX||RX.concTouched) return; var st=stockOf(RX.x), ci=document.getElementById('rxConc'); if(!ci) return;
  var route=rxv('rxRoute'), unit=rxv('rxUnit'), filled=RX.stockK!=null, k=null;
  var same=function(j){ var p=st.s[j][2].split('·')[0]; return st.s.findIndex(function(s){ return s[2].split('·')[0]===p&&concFor(s,unit)!=null; }); };
  if(st&&!(route&&!INJ[route])){
    k=RX.stockK; if(k!=null&&concFor(st.s[k],unit)==null){ k=same(k); if(k<0) k=null; }
    if(k==null&&!st.pick&&INJ[route]){ k=st.s.findIndex(function(s){ return concFor(s,unit)!=null; }); if(k<0) k=null; }
  }
  RX.stockK=k;
  if(k!=null) ci.value=String(+concFor(st.s[k],unit).toPrecision(6)); else if(filled) ci.value='';
  tsStockRender(); };
window.tsRxConcEdit=function(){ if(RX){ RX.concTouched=true; RX.stockK=null; RX.stockAuto=false; } tsStockRender(); tsRxCalc(); };

/* ---------- brand names: staff search by "Cerenia" as often as by "maropitant" ----------
   Generic (as named in the drug reference) → common US veterinary / human brand names. The first brand is the one shown on the sheet. */
var BRANDS={
  'Acarbose':['Precose'],'Acepromazine':['PromAce'],'Acetylcysteine':['Mucomyst','Acetadote'],'Activated charcoal':['ToxiBan'],
  'Afoxolaner':['NexGard'],'Afoxolaner / milbemycin oxime':['NexGard Spectra'],'Afoxolaner / moxidectin / pyrantel':['NexGard Plus'],
  'Aglepristone':['Alizin'],'Albuterol':['Ventolin','ProAir'],'Alfaxalone':['Alfaxan'],'Alfentanil':['Alfenta'],'Allopurinol':['Zyloprim'],
  'Alprazolam':['Xanax'],'Alteplase':['Activase'],'Amikacin':['Amiglyde-V'],'Amiodarone':['Cordarone','Nexterone'],'Amitriptyline':['Elavil'],
  'Amlodipine':['Norvasc'],'Amoxicillin':['Amoxi-Tabs','Amoxi-Drops'],'Amoxicillin / clavulanate':['Clavamox','Augmentin'],
  'Amphotericin B':['Fungizone'],'Ampicillin / sulbactam':['Unasyn'],'Atenolol':['Tenormin'],'Atipamezole':['Antisedan'],'Azathioprine':['Imuran'],
  'Azithromycin':['Zithromax'],'Bedinvetmab':['Librela'],'Benazepril':['Fortekor','Lotensin'],'Benazepril / spironolactone':['Cardalis'],
  'Bethanechol':['Urecholine'],'Bexagliflozin':['Bexacat'],'Brinzolamide':['Azopt'],'Budesonide':['Entocort'],'Bupivacaine':['Marcaine'],
  'Buprenorphine':['Buprenex','Simbadol','Zorbium'],'Buspirone':['Buspar'],'Butorphanol':['Torbugesic','Torbutrol'],'Cabergoline':['Dostinex'],
  'Capromorelin':['Entyce','Elura'],'Carbimazole':['Vidalta'],'Carboplatin':['Paraplatin'],'Carprofen':['Rimadyl','Novox','Vetprofen'],
  'Carvedilol':['Coreg'],'Cefazolin':['Ancef'],'Cefotaxime':['Claforan'],'Cefovecin':['Convenia'],'Cefoxitin':['Mefoxin'],'Cefpodoxime':['Simplicef'],
  'Ceftazidime':['Fortaz'],'Ceftiofur':['Naxcel','Excenel'],'Ceftriaxone':['Rocephin'],'Cephalexin':['Keflex','Rilexine'],'Cetirizine':['Zyrtec'],
  'Chlorambucil':['Leukeran'],'Chloramphenicol':['Chloromycetin'],'Chlorpheniramine':['Chlor-Trimeton'],'Cholestyramine':['Questran'],
  'Ciprofloxacin':['Cipro'],'Cisapride':['Propulsid'],'Clindamycin':['Antirobe','Cleocin'],'Clomipramine':['Clomicalm'],'Clonidine':['Catapres'],
  'Clopidogrel':['Plavix'],'Clotrimazole':['Lotrimin'],'Cosyntropin':['Cortrosyn'],'Cyclophosphamide':['Cytoxan'],
  'Cyclosporine':['Atopica','Optimmune','Cyclavance'],'Dalteparin':['Fragmin'],'Darbepoetin':['Aranesp'],'Deracoxib':['Deramaxx'],
  'Desmopressin':['DDAVP'],'Desoxycorticosterone pivalate':['Percorten-V','Zycortal','DOCP'],'Dexamethasone':['Azium','Dex SP'],
  'Dexmedetomidine':['Dexdomitor','Sileo'],'Diazepam':['Valium'],'Digoxin':['Lanoxin'],'Diltiazem':['Cardizem'],'Diphenhydramine':['Benadryl'],
  'Dobutamine':['Dobutrex'],'Dolasetron':['Anzemet'],'Dopamine':['Intropin'],'Dorzolamide':['Trusopt'],'Doxapram':['Dopram'],
  'Doxorubicin':['Adriamycin'],'Doxycycline':['Vibramycin'],'Emodepside / praziquantel':['Profender'],'Enalapril':['Enacard','Vasotec'],
  'Enoxaparin':['Lovenox'],'Enrofloxacin':['Baytril'],'Epinephrine':['Adrenalin'],'Erythromycin':['Erythrocin'],
  'Esafoxolaner / eprinomectin / praziquantel':['NexGard Combo'],'Esmolol':['Brevibloc'],'Estriol':['Incurin'],'Etomidate':['Amidate'],
  'Famciclovir':['Famvir'],'Famotidine':['Pepcid'],'Felbamate':['Felbatol'],'Fenbendazole':['Panacur'],'Fentanyl':['Sublimaze'],
  'Finasteride':['Proscar'],'Fipronil':['Frontline'],'Firocoxib':['Previcox'],'Fluconazole':['Diflucan'],'Fludrocortisone':['Florinef'],
  'Flumazenil':['Romazicon'],'Fluoxetine':['Prozac','Reconcile'],'Fluralaner':['Bravecto'],'Fluticasone':['Flovent'],
  'Fluticasone / salmeterol':['Advair'],'Fomepizole':['Antizol'],'Frunevetmab':['Solensia'],'Furosemide':['Lasix','Salix'],
  'Gabapentin':['Neurontin'],'Gentamicin':['Gentocin'],'Glipizide':['Glucotrol'],'Glycopyrrolate':['Robinul'],'Grapiprant':['Galliprant'],
  'Griseofulvin':['Fulvicin'],'Hydralazine':['Apresoline'],'Hydrocodone':['Hycodan'],'Hydrocortisone':['Solu-Cortef'],'Hydromorphone':['Dilaudid'],
  'Hydroxyzine':['Atarax','Vistaril'],'Ilunocitinib':['Zenrelia'],'Imepitoin':['Pexion'],'Imipenem / cilastatin':['Primaxin'],
  'Insulin detemir':['Levemir'],'Insulin glargine':['Lantus'],'Insulin isophane (NPH)':['Humulin N','Novolin N'],'Isoflurane':['IsoFlo'],
  'Itraconazole':['Itrafungol','Sporanox'],'Ivermectin':['Heartgard'],'Ketamine':['Ketaset','Vetalar'],'Ketoconazole':['Nizoral'],
  'Lactulose':['Enulose'],'Latanoprost':['Xalatan'],'Leflunomide':['Arava'],'Levetiracetam':['Keppra'],'Levothyroxine':['Soloxine','Thyro-Tabs'],
  'Lidocaine':['Xylocaine'],'Lokivetmab':['Cytopoint'],'Lomustine':['CeeNU','Gleostine'],'Loperamide':['Imodium'],'Lotilaner':['Credelio'],
  'Lufenuron':['Program'],'Mannitol':['Osmitrol'],'Marbofloxacin':['Zeniquin'],'Maropitant':['Cerenia'],'Masitinib':['Kinavet'],
  'Medetomidine':['Domitor'],'Meloxicam':['Metacam'],'Meropenem':['Merrem'],'Mesalamine':['Asacol'],'Methadone':['Dolophine'],
  'Methimazole':['Tapazole','Felimazole'],'Methocarbamol':['Robaxin'],'Methylprednisolone':['Depo-Medrol','Solu-Medrol','Medrol'],
  'Metoclopramide':['Reglan'],'Metoprolol':['Lopressor'],'Metronidazole':['Flagyl'],'Mexiletine':['Mexitil'],'Midazolam':['Versed'],
  'Milbemycin oxime':['Interceptor'],'Minocycline':['Minocin'],'Mirtazapine':['Mirataz','Remeron'],'Misoprostol':['Cytotec'],
  'Mitotane':['Lysodren'],'Moxidectin':['ProHeart'],'Mupirocin':['Bactroban'],'Mycophenolate mofetil':['CellCept'],'Naloxone':['Narcan'],
  'Nitenpyram':['Capstar'],'Nitroglycerin':['Nitro-Bid'],'Norepinephrine':['Levophed'],'Oclacitinib':['Apoquel'],'Octreotide':['Sandostatin'],
  'Omeprazole':['Prilosec','GastroGard'],'Ondansetron':['Zofran'],'Orbifloxacin':['Orbax'],'Oxymorphone':['Opana'],'Oxytocin':['Pitocin'],
  'Pancrelipase':['Viokase'],'Pantoprazole':['Protonix'],'Paroxetine':['Paxil'],'Pentoxifylline':['Trental'],'Phenoxybenzamine':['Dibenzyline'],
  'Phenylpropanolamine':['Proin'],'Phytonadione':['Vitamin K1','Veta-K1','Mephyton'],'Pimobendan':['Vetmedin'],
  'Piperacillin / tazobactam':['Zosyn'],'Polyethylene glycol 3350':['MiraLAX'],'Ponazuril':['Marquis'],
  'Porcine insulin zinc suspension (lente)':['Vetsulin','Caninsulin'],'Posaconazole':['Noxafil'],'Potassium bromide':['K-BroVet'],
  'Potassium citrate':['Urocit-K'],'Potassium gluconate':['Tumil-K'],'Pradofloxacin':['Veraflox'],'Pralidoxime':['Protopam','2-PAM'],
  'Praziquantel':['Droncit'],'Praziquantel / pyrantel / febantel':['Drontal Plus'],'Prazosin':['Minipress'],'Pregabalin':['Bonqat','Lyrica'],
  'Procainamide':['Pronestyl'],'Proparacaine':['Alcaine'],'Propofol':['PropoFlo','Diprivan'],'Propranolol':['Inderal'],
  'Pyrantel pamoate':['Nemex','Strongid'],'Ramipril':['Vasotop','Altace'],'Regular human insulin':['Humulin R','Novolin R'],
  'Remdesivir':['Veklury'],'Remifentanil':['Ultiva'],'Rifampin':['Rifadin'],'Rivaroxaban':['Xarelto'],'Robenacoxib':['Onsior'],
  'Ropinirole':['Clevor'],'Ropivacaine':['Naropin'],'Sarolaner':['Simparica'],'Sarolaner / moxidectin / pyrantel':['Simparica Trio'],
  'Selamectin':['Revolution'],'Selamectin / sarolaner':['Revolution Plus'],'Selegiline':['Anipryl'],'Sertraline':['Zoloft'],
  'Sevelamer':['Renvela'],'Sevoflurane':['SevoFlo'],'Sildenafil':['Viagra','Revatio'],'Sirolimus':['Rapamune'],
  'Sodium nitroprusside':['Nitropress'],'Sotalol':['Betapace'],'Spinosad':['Comfortis'],'Spironolactone':['Aldactone'],'Sucralfate':['Carafate'],
  'Sulfadimethoxine':['Albon'],'Sulfasalazine':['Azulfidine'],'Tacrolimus':['Protopic'],'Telmisartan':['Semintra'],'Terbinafine':['Lamisil'],
  'Terbutaline':['Brethine'],'Theophylline':['Theo-24'],'Tiletamine / zolazepam':['Telazol'],'Timolol':['Timoptic'],
  'Timolol / dorzolamide':['Cosopt'],'Toceranib':['Palladia'],'Topiramate':['Topamax'],'Torsemide':['UpCard','Demadex'],'Tramadol':['Ultram'],
  'Trazodone':['Desyrel'],'Triamcinolone acetonide':['Vetalog','Kenalog'],'Trilostane':['Vetoryl'],
  'Trimethoprim / sulfamethoxazole':['Bactrim','Septra','TMS'],'Ursodiol':['Actigall'],'Vancomycin':['Vancocin'],'Vasopressin':['Vasostrict'],
  'Velagliflozin':['Senvelgo'],'Vinblastine':['Velban'],'Vincristine':['Oncovin','Vincasar'],'Voriconazole':['Vfend'],'Zonisamide':['Zonegran']
};
window.TS_BRANDS=BRANDS;
function brandsOf(name){ return BRANDS[name]||[]; }
/* the brand shown next to a generic name on the sheet and in the order (first listed) */
window.tsBrand=function(name){ return brandsOf(String(name||''))[0]||''; };
/* best search score across the generic name and its brands; .b = the brand that matched (shown first in the result) */
function drugScore(x,q){ var s=scoreName(x.n,q), b=null;
  brandsOf(x.n).forEach(function(br){ var t=scoreName(br,q); if(t<s){ s=t; b=br; } });
  return {s:s,b:b}; }

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
on('tasks.built',function(){ var sp=spKey()||'dog';
  TASKS.forEach(function(t){ if(t.status!=='completed'||t.value==null) return; var r=ruleFor(t.order&&t.order.name); if(!r) return; t.severity=sevOf(r,numOf(t.value),sp); }); });
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
on('rendered',renderFlagsBar); on('header.refresh',renderFlagsBar);
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
/* the doctor's pop-up comes only when someone taps "Notify Dr. …" on the alert (Vitals · Needs attention, store/vattn.js) — Oct 2026 */
function notifyDoctor(){ var me=normName(user().name), mine=[], fresh=[];
  var changed=false; allFlags().forEach(function(it){ var d=it.s._id===CUR&&curDoc?curDoc:it.s, nt=(d.flag_notify||{})[it.f.key]||(it.s.flag_notify||{})[it.f.key]; if(!nt) return;
    var id=it.s._id+'|'+it.f.key+'|n'+nt.at; if(!seenFlags[id]){ fresh.push(it); seenFlags[id]=Date.now(); changed=true; }
    if(me&&normName((it.s.patient||{}).doctor)===me) mine.push(it); });
  try{ var keep={}, cut=Date.now()-3*86400000; Object.keys(seenFlags).forEach(function(k){ if(seenFlags[k]>cut) keep[k]=seenFlags[k]; else changed=true; }); seenFlags=keep; if(changed) localStorage.setItem('tsSeenFlags',JSON.stringify(keep)); }catch(e){}
  var newMine=fresh.filter(function(it){ return me&&normName((it.s.patient||{}).doctor)===me; });
  if(!flagsPrimed){ flagsPrimed=true; if(mine.length) showDocAlert(mine,true); return; }
  if(newMine.length) showDocAlert(newMine,false); }
function showDocAlert(list,summary){ var el=document.getElementById('tsDocAlert'); if(el) el.remove(); el=document.createElement('div'); el.id='tsDocAlert'; el.className='ts-doc-alert';
  var top=list[0], p=top.s.patient||{};
  el.innerHTML=FL_I+'<div><b>'+(summary&&list.length>1?list.length+' open alerts on your patients':esc(((p.name||'')+' '+(p.last||'')).trim())+' — '+esc(top.f.text))+'</b><small>'+(summary?'Tap to review':'Your patient · '+fmtTime(nowMin())+(function(){ var n=((top.s.flag_notify||{})[top.f.key])||(((top.s._id===CUR&&curDoc)?curDoc.flag_notify:null)||{})[top.f.key]; return n&&n.name?' · from '+esc(n.name):''; })())+'</small></div>'
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
    freqTimes(o).forEach(function(h){ var t=slotMin(o,dk,h*60), m=marks[dk+'_'+id+'_'+(h*60)]; if(m&&m.status) return; if(h*60<from&&!o.ordered_at) return;
      if(t<n-18) over++; else if(t<=n+60) due++; }); });
  return {due:due,over:over,score:due+over*2}; }
function techOf(s){ return ((s.patient||{}).tech)||''; }
function initialsOfName(n){ return String(n||'').split(/\s+/).filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase(); }
on('board.rows',function(list){
  list.forEach(function(row){ var s=SHEETS.find(function(x){ return x._id===row._id; }); if(!s) return; var d=s._id===CUR&&curDoc?curDoc:s;
    var fl=flagsFor(d); if(fl.length) row.alerts=fl.map(function(f){ return {t:f.sev>=2?'crit':'warn',x:f.text}; }).concat(row.alerts||[]);
    var t=techOf(s), L=loadOf(d);
    row.techHTML='<button type="button" class="ts-tech'+(t?'':' none')+'" title="'+esc(t?t+' · '+L.due+' due next hour'+(L.over?' · '+L.over+' overdue':''):'Assign a tech')+'" onclick="event.stopPropagation();tsPickTech(\''+s._id+'\',this)">'+(t?esc(initialsOfName(t)):'+')+'</button>'; }); });
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
function refreshTechCell(){ document.querySelectorAll('.ts-tech-slot').forEach(function(c){ var h=window.tsTechCell(); if(c.innerHTML!==h) c.innerHTML=h; }); emit('header.parts'); }
on('header.refresh',refreshTechCell);
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

/* ═════════ TS LOCATION — where the inpatient is housed: ICU · Wards · Isolation ═════════
   One field (sheet.patient.location) shown in the Visit panel, the board's Ward column, the patient chip and Rounds. */
var LOCATIONS=['ICU','Wards','Isolation'];
window.TS_LOCATIONS=LOCATIONS;
function locOf(s){ return ((s&&s.patient)||{}).location||''; }
function setLocation(sheetId,loc){ var s=SHEETS.find(function(x){ return x._id===sheetId; }); if(!s) return;
  var p=s.patient||(s.patient={}), was=p.location||''; loc=loc||''; if(was===loc) return;
  var me=user(), now=new Date().toISOString();
  var u={'patient.location':loc||null,updated_at:now,updated_by:me.initials,
    audit:FV.arrayUnion({at:now,type:'doctor',desc:loc?('Location — <b>'+esc(loc)+'</b>'+(was?' (was '+esc(was)+')':'')):'Location cleared',who:me.initials,uid:me.uid})};
  p.location=loc||null; if(sheetId===CUR&&curDoc){ curDoc.patient=curDoc.patient||{}; curDoc.patient.location=loc||null; VISIT.location=loc||'—'; }
  DB.collection(COL).doc(sheetId).update(u).then(function(){ toast(((p.name||'Patient'))+(loc?' → '+loc:' · location cleared')); })
    .catch(function(e){ console.warn(e); toast('Couldn’t save the location'); });
  refreshLoc(); try{ if(currentCTab==='dash') renderDash(); }catch(e){} }
window.tsSetLocation=setLocation;
/* the menu: three choices, the current one ticked */
window.tsPickLoc=function(sheetId,anchor){ var old=document.getElementById('tsLocMenu'); if(old) old.remove();
  var s=SHEETS.find(function(x){ return x._id===sheetId; }); if(!s) return; var cur=locOf(s);
  var m=document.createElement('div'); m.id='tsLocMenu'; m.className='ts-menu ts-tech-menu ts-loc-menu show';
  var opt=function(n,label){ return '<button type="button" class="'+(n===cur?'on':'')+'" data-n="'+esc(n)+'"><b>'+esc(label||n)+'</b></button>'; };
  m.innerHTML='<div class="ts-tm-h">Location · '+esc(((s.patient||{}).name)||'')+'</div>'+LOCATIONS.map(function(n){ return opt(n); }).join('')+(cur?opt('','Clear location'):'');
  m.querySelectorAll('button[data-n]').forEach(function(b){ b.onclick=function(){ m.remove(); setLocation(sheetId,b.dataset.n); }; });
  var r=anchor.getBoundingClientRect(); m.style.top=Math.min(window.innerHeight-220,r.bottom+6)+'px'; m.style.left=Math.max(12,Math.min(window.innerWidth-300,r.left-20))+'px';
  document.body.appendChild(m); setTimeout(function(){ document.addEventListener('mousedown',function h(ev){ if(!m.contains(ev.target)){ m.remove(); document.removeEventListener('mousedown',h); } }); },0); };
/* Visit panel row */
window.tsLocCell=function(){ if(!CUR) return '<span class="pill soft">'+esc(VISIT.location||'—')+'</span>'; var l=locOf(curDoc);
  return l?'<button type="button" class="ts-loc-pill loc-'+esc(l.toLowerCase().replace(/[^a-z]/g,''))+'" title="Change location" onclick="tsPickLoc(\''+CUR+'\',this)">'+esc(l)+'</button>'
          :'<button type="button" class="addbtn" onclick="tsPickLoc(\''+CUR+'\',this)">+ Set location</button>'; };
/* board Ward column: the same three choices, saved straight to the sheet */
window.tsWardSel=function(p){ if(!p||!p._id) return null; var cur=p.cage||'', known=LOCATIONS.indexOf(cur)>-1;
  return '<select class="ward-sel" onclick="event.stopPropagation()" onchange="event.stopPropagation();tsSetLocation(\''+p._id+'\',this.value)">'
    +'<option value=""'+(cur?'':' selected')+'>—</option>'+(cur&&!known?'<option selected>'+esc(cur)+'</option>':'')
    +LOCATIONS.map(function(w){ return '<option'+(w===cur?' selected':'')+'>'+w+'</option>'; }).join('')+'</select>'; };
function refreshLoc(){ document.querySelectorAll('.ts-loc-slot').forEach(function(c){ var h=window.tsLocCell(); if(c.innerHTML!==h) c.innerHTML=h; });
  try{ updateChip(); }catch(e){} emit('header.parts'); }
on('header.refresh',refreshLoc);

/* ═════════ TS HANDOFF — Current → Next doctor (the same handoff Rounds shows in Flow) ═════════
   Sheet:  patient.doctor (current) · patient.doctor_next {name,at,by} (planned) · handoffs[] (note, snapshot, acknowledgment; last 20)
   Flow:   visits.doctor_id (current = slug of the name) · visits.rounds.next {docId,name,at,by} (only when the visit is in Rounds)
   Doctors (and Daniel) hand off; everyone can read. The receiving doctor gets a card on the sheet until they acknowledge. */
var FLOW_DOCS=(window.TS_STAFF&&window.TS_STAFF.flowDoctors)||[];
function docSlugTS(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function drShort(n){ n=String(n||'').replace(/^dr\.?\s+/i,'').trim(); return n?'Dr. '+n.split(/\s+/).slice(-1)[0]:'—'; }
function hoCur(d){ return ((d&&d.patient)||{}).doctor||''; }
function hoNext(d){ var n=((d&&d.patient)||{}).doctor_next; return n&&n.name?n:null; }
function hoList(d){ return Array.isArray(d&&d.handoffs)?d.handoffs:[]; }
/* the newest handoff to whoever is now the current doctor that they have not acknowledged yet */
function hoPending(d){ var H=hoList(d), cur=normName(hoCur(d)); for(var i=H.length-1;i>=0;i--){ var h=H[i]; if(normName(h.to)===cur) return h.ack_at?null:h; } return null; }
function canHandoff(){ var r=staffRole(); return r==='doctor'||r==='admin'; }
function hoTime(iso){ try{ var d=new Date(iso); return d.toLocaleDateString([], {month:'numeric',day:'numeric'})+' · '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }

/* the header shows Current → Next (or "Hand off" when no next doctor is set) */
on('visit',function(v,d){ var n=hoNext(d); v.doctorTo=n?n.name:v.doctorFrom; });
window.tsDoctorChip=function(){ if(!CUR||!curDoc) return '<span class="pill soft">'+esc(String(VISIT.doctorFrom||'—').split(',')[0])+' → '+esc(String(VISIT.doctorTo||'—').split(',')[0])+'</span>';
  var cur=hoCur(curDoc), n=hoNext(curDoc), p=hoPending(curDoc);
  return '<button type="button" class="pill soft ts-ho-chip'+(n?' has-next':'')+(p?' pending':'')+'" onclick="tsOpenHandoff()" title="'+(n?'Next doctor set — tap to hand off':'Hand off to the next doctor')+'">'
    +esc(cur||'No doctor')+' <span class="ho-arrow">→</span> '+(n?esc(n.name)+'<span class="hc-k next">Next</span>':'<span class="ho-muted">Hand off</span>')+(p?'<i class="ho-dot" title="Handoff not yet acknowledged"></i>':'')+'</button>'; };

/* what the next doctor needs at a glance, captured with the handoff */
function hoSnapshot(){ var v=VISIT||{}, meds=[], alerts=[];
  try{ (ORDERS||[]).forEach(function(o){ if(o&&o.type==='med'&&!o.dc){ var d=window.medDose?medDose(o):{mg:''}; meds.push(o.name+' '+d.mg+' '+(o.route||'')+' '+(o.freq||'')); } }); }catch(e){}
  try{ alerts=flagsFor(curDoc).map(function(f){ return f.text; }); }catch(e){}
  var vit=[['T',v.temp],['HR',v.hr],['RR',v.rr],['Pain',v.pain]].filter(function(x){ return x[1]&&x[1]!=='—'; }).map(function(x){ return x[0]+' '+x[1]; }).join(' · ');
  return {vitals:vit||'', meds:meds.slice(0,12), alerts:alerts.slice(0,6), code:v.code&&v.code!=='—'?v.code:'', weight:v.weight||null, location:v.location&&v.location!=='—'?v.location:''}; }
function snapHTML(s){ if(!s) return ''; var row=function(k,val){ return val?'<div class="ho-snap-row"><span>'+k+'</span><b>'+val+'</b></div>':''; };
  return '<div class="ho-snap">'+row('Code',esc(s.code))+row('Location',esc(s.location))+row('Last vitals',esc(s.vitals))
    +row('Medications',(s.meds||[]).map(esc).join('<br>'))+row('Alerts',(s.alerts||[]).map(esc).join('<br>'))+'</div>'; }
function hoEntryHTML(h){ return '<div class="ho-entry"><div class="ho-entry-h"><b>'+esc(drShort(h.from))+' → '+esc(drShort(h.to))+'</b><small>'+esc(hoTime(h.at))+(h.ack_at?' · acknowledged '+esc(hoTime(h.ack_at)):' · not yet acknowledged')+'</small></div>'
  +(h.summary?'<p><span>Summary</span>'+esc(h.summary)+'</p>':'')+(h.todo?'<p><span>To do / watch for</span>'+esc(h.todo)+'</p>':'')+snapHTML(h.snapshot)+'</div>'; }

/* ---------- the handoff window ---------- */
window.tsOpenHandoff=function(){ if(!CUR||!curDoc){ toast('Open a patient first'); return; }
  var cur=hoCur(curDoc), n=hoNext(curDoc), H=hoList(curDoc), last=H[H.length-1], v=VISIT||{};
  if(!canHandoff()){ modal('<h3>Handoff · '+esc(v.patient||'')+'</h3><p>Current doctor: <b>'+esc(cur||'—')+'</b>'+(n?' · next: <b>'+esc(n.name)+'</b>':'')+'</p>'
      +(last?hoEntryHTML(last):'<p class="ho-muted">No handoff yet.</p>')+'<p class="rx-warn rx-block">Only doctors can hand off a patient.</p>','Close',function(){ return true; }); return; }
  var docs=FLOW_DOCS.filter(function(x){ return normName(x)!==normName(cur); });
  var mine=normName(user().name); docs.sort(function(a,b){ return (normName(b)===mine)-(normName(a)===mine)||(n&&normName(b)===normName(n.name))-(n&&normName(a)===normName(n.name)); });
  window._ho={to:n?n.name:'',mode:n?'now':'next'};
  var summ=[v.age,v.sex,v.breed].filter(function(x){ return x&&x!=='—'; }).join(' ')+(v.complaint&&v.complaint!=='—'?' · '+v.complaint:'');
  modal('<h3>Hand off · '+esc(v.patient||'')+'</h3><p>Current doctor <b>'+esc(cur||'—')+'</b>'+(n?' · next doctor set: <b>'+esc(n.name)+'</b> ('+esc(hoTime(n.at))+')':'')+'</p>'
    +'<div class="rx-lbl">Hand off to</div><div class="rx-chips ho-docs">'+docs.map(function(x){ return '<button type="button" class="rx-chip'+(window._ho.to===x?' on':'')+'" data-d="'+esc(x)+'" onclick="tsHoDoc(this)">'+esc(x)+'</button>'; }).join('')+'</div>'
    +'<div class="rx-lbl">When</div><div class="ho-seg"><button type="button" data-m="now" class="'+(window._ho.mode==='now'?'on':'')+'" onclick="tsHoMode(this)">Now<small>They take the case</small></button>'
      +'<button type="button" data-m="next" class="'+(window._ho.mode==='next'?'on':'')+'" onclick="tsHoMode(this)">Next shift<small>Set as next doctor</small></button></div>'
    +'<div class="tm-grid" style="margin-top:14px"><label class="wide">Summary<textarea id="hoSumm" rows="2">'+esc(summ)+'</textarea></label>'
    +'<label class="wide">To do / watch for<textarea id="hoTodo" rows="3" placeholder="Recheck PCV at 2 AM · if seizures → midazolam · call owner with update"></textarea></label></div>'
    +'<div class="rx-lbl">Included automatically</div>'+snapHTML(hoSnapshot())
    +(n?'<button type="button" class="ho-clear" onclick="tsHoClearNext()">Clear next doctor</button>':'')
    +(last?'<details class="ho-hist"><summary>Last handoff</summary>'+hoEntryHTML(last)+'</details>':''),
    'Hand off', tsHoSubmit);
  tsHoLabel(); };
window.tsHoDoc=function(b){ document.querySelectorAll('#tsModal .ho-docs .rx-chip').forEach(function(c){ c.classList.toggle('on',c===b); }); window._ho.to=b.dataset.d; tsHoLabel(); };
window.tsHoMode=function(b){ document.querySelectorAll('#tsModal .ho-seg button').forEach(function(c){ c.classList.toggle('on',c===b); }); window._ho.mode=b.dataset.m; tsHoLabel(); };
function tsHoLabel(){ var ok=document.querySelector('#tsModal [data-ok]'); if(!ok) return; var t=window._ho.to;
  ok.textContent=window._ho.mode==='now'?(t?'Hand off to '+drShort(t)+' now':'Hand off now'):(t?'Set '+drShort(t)+' as next':'Set as next doctor'); }

function tsHoSubmit(){ var h=window._ho||{}, to=h.to, mode=h.mode;
  if(!to){ toast('Choose the doctor'); return false; }
  var s=SHEETS.find(function(x){ return x._id===CUR; }), d=curDoc, me=user(), now=new Date().toISOString(), cur=hoCur(d), visitId=d.visit_id;
  var entry={id:'h'+Date.now().toString(36),at:now,from:cur||null,to:to,mode:mode,summary:((document.getElementById('hoSumm')||{}).value||'').trim(),
    todo:((document.getElementById('hoTodo')||{}).value||'').trim(),snapshot:hoSnapshot(),by:me.name||me.initials,by_uid:me.uid||null,ack_at:null,ack_by:null};
  var H=hoList(d).concat([entry]).slice(-20), desc;
  var u={handoffs:H,updated_at:now,updated_by:me.initials};
  if(mode==='now'){ u['patient.doctor']=to; u['patient.doctor_at']=now; u['patient.doctor_next']=null; desc='Handed off — <b>'+esc(drShort(cur))+' → '+esc(drShort(to))+'</b>'; }
  else { u['patient.doctor_next']={name:to,at:now,by:me.name||me.initials}; desc='Next doctor — <b>'+esc(drShort(to))+'</b>'; }
  u.audit=FV.arrayUnion({at:now,type:'doctor',desc:desc,who:me.initials,uid:me.uid});
  u.notes=FV.arrayUnion({at:now,type:'doctor',author:me.initials,role:'Doctor',uid:me.uid,
    body:'Handoff '+drShort(cur)+' → '+drShort(to)+(mode==='next'?' (next shift)':'')+(entry.summary?'\nSummary: '+entry.summary:'')+(entry.todo?'\nTo do / watch for: '+entry.todo:'')});
  /* Flow first (Rounds' current/next), then the sheet — so Flow's own sync never sees a half-done handoff */
  hoToFlow(visitId,to,mode,me,now).then(function(){ return DB.collection(COL).doc(CUR).update(u); })
    .then(function(){ toast(mode==='now'?('Handed off to '+drShort(to)):(drShort(to)+' set as next doctor')); })
    .catch(function(e){ console.warn('[handoff]',e); toast('Couldn’t save the handoff'); });
  /* show it right away */
  d.handoffs=H; d.patient=d.patient||{}; if(mode==='now'){ d.patient.doctor=to; d.patient.doctor_next=null; if(s&&s.patient){ s.patient.doctor=to; s.patient.doctor_next=null; } }
  else { d.patient.doctor_next={name:to,at:now}; if(s&&s.patient) s.patient.doctor_next={name:to,at:now}; }
  try{ setVisit(visitFrom(d)); }catch(e){} refreshHo(); return true; }
function hoToFlow(visitId,to,mode,me,now){ if(!visitId||FLOW_DOCS.indexOf(to)<0) return Promise.resolve('skip');
  var ref=DB.collection('visits').doc(String(visitId)), id=docSlugTS(to);
  return DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ if(!snap.exists) return 'novisit'; var v=snap.data(), r=(v.rounds&&typeof v.rounds==='object')?v.rounds:null, u={};
    if(mode==='now'){ if(v.doctor_id!==id) u.doctor_id=id; if(r&&r.next) u['rounds.next']=null; }
    else if(r){ u['rounds.next']={docId:id,name:drShort(to),at:now,by:me.name||me.initials}; }
    if(r) u['rounds.audit']=FV.arrayUnion({at:now,by:me.name||me.initials,what:(mode==='now'?'Case handed to ':'Next doctor · ')+drShort(to)+' (treatment sheet)'});
    if(Object.keys(u).length) t.update(ref,u); return 'ok'; }); }).catch(function(e){ console.warn('[handoff→flow]',e); }); }
window.tsHoClearNext=function(){ if(!CUR||!curDoc) return; var me=user(), now=new Date().toISOString(), visitId=curDoc.visit_id;
  try{ document.getElementById('tsModal').classList.remove('show'); }catch(e){}
  var p1=visitId?DB.collection('visits').doc(String(visitId)).get().then(function(sn){ if(sn.exists&&sn.data().rounds&&sn.data().rounds.next) return sn.ref.update({'rounds.next':null}); }).catch(function(){}):Promise.resolve();
  p1.then(function(){ return DB.collection(COL).doc(CUR).update({'patient.doctor_next':null,updated_at:now,audit:FV.arrayUnion({at:now,type:'doctor',desc:'Next doctor cleared',who:me.initials,uid:me.uid})}); })
    .then(function(){ toast('Next doctor cleared'); }).catch(function(e){ console.warn(e); toast('Couldn’t clear'); });
  curDoc.patient.doctor_next=null; try{ setVisit(visitFrom(curDoc)); }catch(e){} refreshHo(); };

/* ---------- receiving doctor: a card on the sheet until they acknowledge ---------- */
function hoCard(){ var el=document.getElementById('tsHoCard'), p=CUR&&curDoc?hoPending(curDoc):null;
  var forMe=p&&(normName(user().name)===normName(hoCur(curDoc))||staffRole()==='admin');
  if(!p||!forMe||currentCTab!=='sheet'){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='tsHoCard'; document.body.appendChild(el); }
  var html='<div class="ho-card-h"><b>Handoff from '+esc(drShort(p.from))+'</b><small>'+esc(hoTime(p.at))+'</small></div>'
    +(p.summary?'<p>'+esc(p.summary)+'</p>':'')+(p.todo?'<p class="ho-todo">'+esc(p.todo)+'</p>':'')
    +'<div class="ho-card-b"><button type="button" onclick="tsHoView()">Details</button><button type="button" class="primary" onclick="tsHoAck(\''+esc(p.id)+'\')">Acknowledge</button></div>';
  if(el.dataset.k!==p.id+CUR){ el.innerHTML=html; el.dataset.k=p.id+CUR; } }
window.tsHoView=function(){ var p=curDoc&&hoPending(curDoc); if(!p) return; modal('<h3>Handoff · '+esc(VISIT.patient||'')+'</h3>'+hoEntryHTML(p),'Acknowledge',function(){ tsHoAck(p.id); return true; }); };
window.tsHoAck=function(id){ if(!CUR) return; var ref=DB.collection(COL).doc(CUR), me=user(), now=new Date().toISOString();
  DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ if(!snap.exists) return; var H=(snap.data().handoffs||[]).map(function(h){ return h.id===id&&!h.ack_at?Object.assign({},h,{ack_at:now,ack_by:me.name||me.initials}):h; });
    t.update(ref,{handoffs:H,updated_at:now,audit:FV.arrayUnion({at:now,type:'doctor',desc:'Handoff acknowledged',who:me.initials,uid:me.uid})}); }); })
    .then(function(){ toast('Handoff acknowledged'); }).catch(function(e){ console.warn(e); toast('Couldn’t save'); });
  if(curDoc&&curDoc.handoffs) curDoc.handoffs=curDoc.handoffs.map(function(h){ return h.id===id?Object.assign({},h,{ack_at:now,ack_by:me.name}):h; }); refreshHo(); };
function refreshHo(){ document.querySelectorAll('.ts-ho-slot').forEach(function(c){ var h=window.tsDoctorChip(); if(c.innerHTML!==h) c.innerHTML=h; }); try{ hoCard(); }catch(e){} emit('header.parts'); }
on('header.refresh',refreshHo);
setInterval(function(){ try{ hoCard(); }catch(e){} },3000);

/* ═════════ TS HEADER — calm, flat, instrument-panel header (Oct 2026) ═════════
   Name + signalment · big live vitals (value, unit, age, colour only when out of range, ▲▼ trend)
   Info row of label-over-value items (no borders): Weight · Service · Doctor → Next · Tech · Hospital day · Location · Code
   Collapses to one slim line while the grid is scrolled (iOS large-title style). Red is only for critical / DNR. */
function hdrDoc(){ return CUR&&curDoc?curDoc:null; }
window.tsHoursIn=function(){ var d=hdrDoc(), at=d&&(d.admitted_at||d.created_at); return at?Math.max(0,Math.floor((Date.now()-new Date(at))/3600000)):null; };
function hospDay(h){ return h!=null?Math.floor(h/24)+1:null; }
window.tsDayLabel=function(){ var h=window.tsHoursIn(); return h!=null?'Day '+hospDay(h)+' · '+h+' h':esc(VISIT.day||''); };
function wtWhen(iso){ try{ var d=new Date(iso), today=new Date(); var day=d.toDateString()===today.toDateString()?'Today':(d.getMonth()+1)+'/'+d.getDate();
  return day+' · '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }
function ago(iso){ var m=Math.floor((Date.now()-new Date(iso))/60000); if(!(m>=0)) return ''; if(m<1) return 'now'; if(m<60) return m+'m ago'; var h=Math.floor(m/60); return h<24?h+'h ago':Math.floor(h/24)+'d ago'; }
/* completed readings for an order name, newest last */
function readings(d,rx){ var ids={}, fq={}; Object.keys(d.orders||{}).forEach(function(k){ var o=d.orders[k]; if(o&&!o.dc&&rx.test(String(o.name||'').trim())){ ids[o.id||k]=1; fq.f=o.freq; } });
  var out=[]; Object.keys(d.marks||{}).forEach(function(k){ var m=d.marks[k]; if(!m||m.status!=='completed'||!ids[m.orderId]||m.value==null||String(m.value).trim()==='') return; out.push({v:String(m.value).trim(),at:m.at||'',src:m.src||''}); });
  /* older days aren't loaded on the open sheet: the board summary (digest.vit) keeps recent numeric readings per order */
  var seen={}; out.forEach(function(r){ seen[r.at]=1; }); var vit=(d.digest&&d.digest.vit)||{};
  Object.keys(ids).forEach(function(oid){ (vit[oid]||[]).forEach(function(x){ var k=String(x.k||''), y=+k.slice(0,4), mo=+k.slice(4,6), dd=+k.slice(6,8); if(!y||x.v==null) return;
    var at=new Date(y,mo-1,dd,0,+x.m||0).toISOString(); if(seen[at]) return; seen[at]=1; out.push({v:String(x.v),at:at,src:/_triage$/.test(k)?'triage':''}); }); });
  out.sort(function(a,b){ return a.at<b.at?-1:a.at>b.at?1:0; }); out.freq=fq.f; return out; }
function freqH(f){ var m=String(f||'').match(/q(\d+)h/i); return m?+m[1]:null; }

/* ---------- weight: the dosing weight and when it was taken ---------- */
function weightInfo(d){ var kg=Number(VISIT.weight)||0; if(!kg) return {kg:0};
  var R=d?readings(d,/^weight$/i).map(function(r){ return {v:parseFloat((r.v.match(/\d+(\.\d+)?/)||[])[0]),at:r.at,src:r.src}; }).filter(function(r){ return r.v>0; }):[];
  var match=null, latest=R[R.length-1]||null; for(var i=R.length-1;i>=0;i--){ if(Math.abs(R[i].v-kg)<0.05){ match=R[i]; break; } }
  var when=match?wtWhen(match.at):(d?wtWhen(d.admitted_at||d.created_at):''), how=match?(match.src==='triage'?'Triage':'Weighed'):'Admission';
  var newer=latest&&Math.abs(latest.v-kg)>=0.05&&(!match||latest.at>match.at)?latest:null;
  return {kg:kg,when:when,how:how,newer:newer}; }

/* ---------- vitals ---------- */
var VITS=[{k:'temp',rx:/^temperature$/i,l:'Temp',u:'°F'},{k:'hr',rx:/^heart rate$/i,l:'Heart rate',u:'bpm'},{k:'rr',rx:/^respiratory rate$/i,l:'Resp rate',u:'rpm'},{k:'mm',rx:/^mucous membrane/i,l:'MM',u:''}];
var _tshPrev={};
function vitalsData(d){ var sp=sexSp(VISIT.species), fl=[]; try{ fl=flagsFor(d); }catch(e){}
  return VITS.map(function(V){ var R=readings(d,V.rx), last=R[R.length-1]; if(!last) return {V:V};
    var rule=V.k!=='mm'?ruleFor({temp:'Temperature',hr:'Heart Rate',rr:'Respiratory Rate'}[V.k]):null, num=numOf(last.v), sev=rule&&num!=null?sevOf(rule,num,sp):0;
    var tr=fl.find(function(f){ return f.rule===V.k&&/rising|falling/.test(f.text); }), arrow=tr?(/rising/.test(tr.text)?'▲':'▼'):'';
    var fh=freqH(R.freq), old=fh&&last.at&&(Date.now()-new Date(last.at))>fh*1.25*3600000;
    return {V:V,val:V.k==='mm'?last.v:(num!=null?String(num):last.v),at:last.at,sev:sev,arrow:arrow,old:old}; }); }
function vitalsHTML(d){ var D=vitalsData(d); if(!D.some(function(x){ return x.val; })) return '<div class="tsh-novit">No vitals charted yet</div>';
  var cur={}, html=D.map(function(x){ if(!x.val) return '<div class="tsh-vit empty"><div class="tsh-vv">—</div><div class="tsh-vk">'+x.V.l+'</div></div>';
    var sig=x.val+'|'+x.at; cur[x.V.k]=sig; var changed=_tshPrev[x.V.k]&&_tshPrev[x.V.k]!==sig;
    return '<div class="tsh-vit'+(x.V.k==='mm'?' text':'')+(x.sev===2?' crit':x.sev===1?' warn':'')+'" title="'+esc(x.V.l+' '+x.val+(x.V.u?' '+x.V.u:'')+' · '+wtWhen(x.at))+'">'
      +'<div class="tsh-vv"><span class="ts-num" data-roll="hdr-'+x.V.k+'">'+esc(x.val)+'</span>'+(x.V.u?'<span class="tsh-u">'+x.V.u+'</span>':'')+(x.arrow?'<span class="tsh-ar">'+x.arrow+'</span>':'')+'</div>'
      +'<div class="tsh-vk">'+x.V.l+'<span class="tsh-age'+(x.old?' old':'')+'">'+esc(ago(x.at))+'</span></div></div>'; }).join('');
  _tshPrev=cur; return html; }
function miniVitals(d){ var D=vitalsData(d); return D.filter(function(x){ return x.val&&x.V.k!=='mm'; }).map(function(x){ return '<span class="'+(x.sev===2?'crit':x.sev===1?'warn':'')+'">'+({temp:'T',hr:'HR',rr:'RR'})[x.V.k]+' '+esc(x.val)+(x.arrow?' '+x.arrow:'')+'</span>'; }).join(''); }

/* ---------- info row: label over value, no borders; tappable items get a soft hover ---------- */
function item(k,v,o){ o=o||{}; var tag=o.on?'button type="button"':'div';
  return '<'+tag+' class="tsh-item'+(o.cls?' '+o.cls:'')+'"'+(o.on?' onclick="'+o.on+'"':'')+(o.title?' title="'+esc(o.title)+'"':'')+'><span class="tsh-k">'+k+'</span><span class="tsh-v">'+v+'</span></'+(o.on?'button':'div')+'>'; }
var LOC_ICON='<svg class="tsh-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 15V6m0 5h14v4m-14-2h14M7 8.5h3.5a2 2 0 0 1 2 2V11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function infoHTML(d){ var p=(d&&d.patient)||{}, W=weightInfo(d), out=[];
  var WP=W.kg&&window.tsWtPlaus?tsWtPlaus(W.kg):null, WA=W.kg&&window.tsWtAgeH?tsWtAgeH(d):null;   /* believable for the breed? how old? (store/weight.js) */
  out.push(W.kg?item('Weight','<b><span class="ts-num" data-roll="hdr-wt">'+W.kg+'</span><span class="ts-u">kg</span></b><small>'+esc(W.when)+'</small>'+(WP?'<small class="tsh-coral">Check — '+esc(WP.short)+'</small>':W.newer?'<small class="tsh-amber">Charted '+W.newer.v+' kg</small>':(WA!=null&&WA>24?'<small class="tsh-amber">Weigh today</small>':'')),
      {cls:WP?'coral':W.newer?'amber':'',on:WP?'tsWtCheckOpen()':W.newer?'tsWeightReview('+W.newer.v+')':'',title:(WP?WP.t+' · tap to check · ':'')+(W.newer?'Tap to review doses · ':'')+'Dosing weight — every dose on this sheet uses it · '+W.how+' '+W.when+(W.newer?' · newer charted weight '+W.newer.v+' kg ('+wtWhen(W.newer.at)+')':'')})
    :item('Weight','<b class="tsh-amber">Not set</b>',{title:'Add a weight to calculate doses'}));
  out.push(item('Service','<b>'+esc(deptName(VISIT.dept))+'</b>'));
  if(d){ var cur=hoCur(d), n=hoNext(d), pend=hoPending(d);
    out.push(item(n?'Doctor → Next':'Doctor','<b>'+esc(cur?drShort(cur):'—')+'</b>'+(n?'<span class="tsh-arrow">→</span><b class="tsh-accent">'+esc(drShort(n.name))+'</b>':'<small class="tsh-link">Hand off</small>')+(pend?'<i class="tsh-dot" title="Handoff not yet acknowledged"></i>':''),
      {on:'tsOpenHandoff()',title:cur?(cur+(n?' → '+n.name+' (next)':'')+' · tap to hand off'):'Tap to set the doctor'}));
    out.push(item('Tech',p.tech?'<b>'+esc(p.tech)+'</b>':'<small class="tsh-link">Assign</small>',{on:'tsPickTech(\''+CUR+'\',this)'}));
  } else out.push(item('Doctor','<b>'+esc(String(VISIT.doctorFrom||'—').split(',')[0])+'</b>'));
  var h=window.tsHoursIn(); out.push(item('Hospital day','<b>'+(h!=null?hospDay(h):esc(String(VISIT.day||'').replace(/^Day\s*/i,'')))+'</b>'+(h!=null?'<small>'+h+' h</small>':'')));
  var loc=p.location||''; out.push(item('Location',loc?LOC_ICON+'<b>'+esc(loc)+'</b>':'<small class="tsh-link">Set</small>',{on:d?'tsPickLoc(\''+CUR+'\',this)':'',cls:loc==='Isolation'?'amber':''}));
  var code=resusPillHTML(VISIT.code); out.push(item('Code',code||'<small>Not set</small>',{title:'Code status comes from Flow'}));
  return out.join(''); }

/* ---------- the header ---------- */
window.tsHeaderHTML=function(){ var d=hdrDoc(), v=VISIT||{};
  var sig=[v.species,v.breed,v.sex,v.age].filter(function(x){ return x&&x!=='—'; }).map(esc).join('<span class="tsh-sep"></span>');
  return '<section class="clinical-patient-header tsh" id="tsHdr">'
    +'<div class="tsh-top">'
      +'<button type="button" class="tsh-back" onclick="selectCTab(\'dash\')" aria-label="Back to patients" title="Back to patients"><svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
      +'<div class="tsh-id"><div class="tsh-name"><span>'+esc(v.patient||'')+'</span><span class="tsh-pid">'+esc(v.vcode||('V-'+(v.id||'')))+'</span><span class="tsh-live-slot">'+liveHTML(d)+'</span></div>'
        +'<div class="tsh-sig">'+sig+'</div></div>'
      +'<div class="tsh-mini">'+miniHTML(d)+'</div>'
      +'<div class="tsh-vitals">'+(d?vitalsHTML(d):'')+'</div>'
    +'</div>'
    +'<div class="tsh-info">'+infoHTML(d)+'</div>'
  +'</section>'; };
function miniHTML(d){ if(!d) return ''; var W=weightInfo(d), loc=((d.patient||{}).location)||'';
  return '<span><b>'+(W.kg?W.kg+' kg':'No weight')+'</b></span>'+(resusPillHTML(VISIT.code,'sm')||'')+(loc?'<span>'+esc(loc)+'</span>':'')+miniVitals(d); }
/* someone else changed this sheet in the last 90 s — hidden (Daniel, Oct 3 2026: saving and syncing stay in the background) */
var TSH_LIVE_DOT=false;
function liveHTML(d){ if(!TSH_LIVE_DOT) return ''; if(!d||!d.updated_at||!d.updated_by) return ''; var me=user(), by=String(d.updated_by), age=Date.now()-new Date(d.updated_at);
  var mine=by===me.initials||normName(by)===normName(me.name)||normName(by)===normName(me.initials);
  return (age<90000&&!mine)?'<i class="tsh-live" title="Updated just now by '+esc(d.updated_by)+'"></i>':''; }

/* re-render the parts that change, only when they changed */
function refreshHdr(){ var h=document.getElementById('tsHdr'), d=hdrDoc(); if(!h||!d) return;
  var set=function(sel,html){ var el=h.querySelector(sel); if(el&&el.innerHTML!==html) el.innerHTML=html; };
  var nm=h.querySelector('.tsh-name > span:first-child'); if(nm&&nm.textContent!==(VISIT.patient||'')) nm.textContent=VISIT.patient||'';
  var sg=[VISIT.species,VISIT.breed,VISIT.sex,VISIT.age].filter(function(x){ return x&&x!=='—'; }).map(esc).join('<span class="tsh-sep"></span>'); set('.tsh-sig',sg);
  set('.tsh-vitals',vitalsHTML(d)); set('.tsh-info',infoHTML(d)); set('.tsh-mini',miniHTML(d)); set('.tsh-live-slot',liveHTML(d)); }
on('header.refresh',refreshHdr,10); on('header.parts',refreshHdr);   /* runs after the other parts have refreshed */
setInterval(function(){ try{ if(!document.hidden) refreshHdr(); }catch(e){} },30000);
/* collapse while the grid is scrolled; expand back at the top (with a little hysteresis) */
document.addEventListener('scroll',function(e){ var t=e.target; if(!t||t.id!=='sheetScroll') return; var h=document.getElementById('tsHdr'); if(!h) return;
  var y=t.scrollTop; if(y>48&&!h.classList.contains('is-compact')) h.classList.add('is-compact'); else if(y<6&&h.classList.contains('is-compact')) h.classList.remove('is-compact'); },true);

/* ═════════ TS DAYS — the ‹ Today › day navigator: look back at earlier days of this stay ═════════
   The grid normally shows today. ‹ steps back a calendar day (to the admission day), › forward, the middle button returns to today.
   Past days are VIEW ONLY: nothing is written while one is shown (the save path assumes today), tapping a cell shows what was charted. */
var VIEW_DK=null;
function viewDk(){ return VIEW_DK||dayKey(); }
window.tsViewDk=viewDk;
function dkDate(dk){ return new Date(+dk.slice(0,4),+dk.slice(4,6)-1,+dk.slice(6,8)); }
function nextDk(dk){ var d=dkDate(dk); d.setDate(d.getDate()+1); return dayKey(d); }
function firstDk(){ var at=curDoc&&(curDoc.admitted_at||curDoc.created_at); return at?dayKey(new Date(at)):dayKey(); }
function dkLabel(dk){ var d=dkDate(dk); return d.toLocaleDateString([], {weekday:'short',month:'numeric',day:'numeric'}); }

/* the grid's clock: on a past day "now" is past the end of that day, so every slot reads as finished or missed */
on('clock',function(){ return VIEW_DK?(Date.now()-dkDate(VIEW_DK).getTime())/60000:null; });
/* tasks for the day on screen */
on('tasks.build',function(){ if(!VIEW_DK) return false;
  TASKS=[]; var dk=VIEW_DK, marks=(curDoc&&curDoc.marks)||{}, adm=curDoc&&(curDoc.admitted_at||curDoc.created_at);
  var from=(adm&&dayKey(new Date(adm))===dk)?(new Date(adm)-dkDate(dk))/60000:-1;
  ORDERS.forEach(function(o){ if(o.cont) return; var oa=o.ordered_at?dayKey(new Date(o.ordered_at)):null; if(oa&&oa>dk) return;   /* ordered after this day */
    freqTimes(o).forEach(function(h){ var min=h*60, key=dk+'_'+o.id+'_'+min, m=marks[key]; if(min<from&&!m) return; if(o.dc&&!m&&min>=dcCut(o,dk)) return; if(o.not_before&&!m&&dayKey(new Date(o.not_before))===dk&&min<(new Date(o.not_before)-dkDate(dk))/60000) return;
      var at=slotMin(o,dk,min); TASKS.push({id:key,key:key,orderId:o.id,order:o,sched:at,movedFrom:at!==min?min:null,status:m?m.status:null,by:m?m.by:null,completedMin:m&&m.min!=null?m.min:null,value:m?m.value:null,notes:m?m.notes:null,given:m?m.given||null:null,vol:m?m.vol||null:null,reason:m?m.reason||null:null,hist:m&&m.hist?m.hist:null,at:m?m.at||null:null,severity:0}); }); });
  Object.keys(marks).forEach(function(k){ if(k.indexOf(dk+'_')!==0||TASKS.some(function(t){ return t.key===k; })) return; var m=marks[k]; if(!m) return;
    var o=ORDERS.find(function(x){ return x.id===m.orderId; }); if(!o) return;
    TASKS.push({id:k,key:k,orderId:o.id,order:o,sched:m.sched!=null?m.sched:(m.min||0),status:m.status,by:m.by,completedMin:m.min,value:m.value,notes:m.notes,given:m.given||null,vol:m.vol||null,reason:m.reason||null,hist:m.hist||null,at:m.at||null,severity:0,adhoc:true}); });
  return true; });
/* an older day's charting joins the composed sheet while it is on screen */
on('compose',function(d){ if(d&&VIEW_DK&&curDays[VIEW_DK]) d.marks=Object.assign({},curDays[VIEW_DK],d.marks); });
/* nothing is saved while a past day is on screen */
on('sync.allowed',function(){ return !VIEW_DK; });

function goDay(dk){ if(!CUR||!curDoc) return; var today=dayKey(); if(dk>=today) dk=null; var lo=firstDk(); if(dk&&dk<lo) dk=lo;
  if(dk===VIEW_DK) return;
  if(!VIEW_DK) sync();   /* save anything typed on today before looking back */
  VIEW_DK=dk; try{ document.body.classList.toggle('ts-past-day',!!dk); }catch(e){}
  var show=function(){ curDoc=compose(); hydrate(); try{ renderSheet(); }catch(e){ try{ rerender(); }catch(_){} } };
  if(dk&&!curDays[dk]&&dk!==subDk&&dk!==prevDk(subDk)){ var id=CUR, el=document.querySelector('.ts-daynav .dn-mid'); if(el) el.textContent='Loading…';
    dayRef(id,dk).get().then(function(s){ if(CUR!==id) return; curDays[dk]=(s.exists&&s.data().marks)||{}; dayLoaded[dk]=1; if(VIEW_DK===dk) show(); })
      .catch(function(e){ console.warn('[day]',e); toast('Couldn’t load '+dkLabel(dk)); VIEW_DK=null; show(); });
  } else show();
  if(dk) toast(dkLabel(dk)+' · view only'); }
window.tsDayPrev=function(){ goDay(VIEW_DK?prevDk(VIEW_DK):prevDk(dayKey())); };
window.tsDayNext=function(){ if(VIEW_DK) goDay(nextDk(VIEW_DK)); };
window.tsDayToday=function(){ goDay(null); };
window.tsDayNavHTML=function(){ var today=dayKey(), dk=viewDk(), lo=CUR&&curDoc?firstDk():today;
  var label=VIEW_DK?('<b>'+esc(dkLabel(dk))+'</b><span class="dn-ro">View only</span>'):('Today · '+esc(dkLabel(today)));
  return '<button type="button" class="dn-prev" onclick="tsDayPrev()"'+(dk<=lo?' disabled':'')+' aria-label="Previous day">‹</button>'
    +'<button type="button" class="today dn-mid'+(VIEW_DK?' past':'')+'" onclick="tsDayToday()" title="'+(VIEW_DK?'Back to today':'Today')+'">'+label+'</button>'
    +'<button type="button" class="dn-next" onclick="tsDayNext()"'+(VIEW_DK?'':' disabled')+' aria-label="Next day">›</button>'; };
/* tapping a cell on a past day shows what was charted instead of opening the editor */
var SLOT_TXT={completed:'Completed',skipped:'Skipped',refused:'Refused',held:'Held'};
on('completion.open',function(id){ if(!VIEW_DK) return false;
  var t=(TASKS||[]).find(function(x){ return x.id===id; }); if(!t){ toast('View only'); return true; }
  var at=fmtTime(t.sched); toast(t.order.name+' · '+dkLabel(VIEW_DK)+' '+at+' — '+(t.status?(SLOT_TXT[t.status]||t.status)+(t.value?' '+t.value:'')+(t.by?' by '+t.by:''):'not charted')); return true; });
/* orders are added on today's sheet */
on('pick',function(){ if(!VIEW_DK) return false; toast('Go back to today to add orders'); return true; },-10);
/* a new patient always opens on today */
on('sheet.opening',function(id){ if(id!==CUR){ VIEW_DK=null; try{ document.body.classList.remove('ts-past-day'); }catch(e){} } });

/* ═════════ TS ORDERS — tap an order's name: details, Change, Discontinue ═════════
   Orders are never deleted. Discontinue keeps the order (orders.<id>.dc = true + who/when/why); what was already charted stays on the sheet,
   the row fades off the grid at once (earlier days still show it as it ran); a 5-second Undo restores it. Doctors and Daniel only. */
var DC_REASONS=[{k:'discontinued',l:'Discontinued',d:'No longer needed'},{k:'changed',l:'Changed',d:'Replaced by a new order'},
  {k:'error',l:'Entered in error',d:'Duplicate or wrong order'},{k:'discharged',l:'Patient discharged',d:'Leaving the hospital'}];
function dcLabel(o){ return o&&o.dc?(o.dc_reason==='error'?'Entered in error':o.dc_reason==='rejected'?'Not approved':'Stopped'):''; }
/* a discontinued order stays on the grid for the day it was stopped (and for earlier days looked back at) */
function dcVisible(o){ if(!o||!o.dc||!o.dc_at) return false; var dk=window.tsViewDk?tsViewDk():dayKey(); return dayKey(new Date(o.dc_at))>dk; }   /* a stopped order leaves the grid on the day it was stopped; earlier days still show it as it ran */
/* orders stopped on the day shown leave their section; the grid lists them under "Stopped & completed" with what was charted, read only */
window.tsStoppedToday=function(){ var out={orders:[],tasks:[]}; if(!curDoc) return out; var dk=window.tsViewDk?tsViewDk():dayKey(), M=curDoc.marks||{};
  Object.keys(curDoc.orders||{}).forEach(function(k){ var o=curDoc.orders[k]; if(!o||!o.dc||!o.dc_at||o.draft||dayKey(new Date(o.dc_at))!==dk) return;
    if((ORDERS||[]).some(function(x){ return x.id===o.id; })) return;
    var g=Object.assign({},o,{_ghost:true}), pre=dk+'_'+o.id+'_'; out.orders.push(g);
    Object.keys(M).forEach(function(mk){ var m=M[mk]; if(!m||!m.status||mk.indexOf(pre)!==0) return; var slot=+mk.slice(pre.length); if(isNaN(slot)) return;
      out.tasks.push({id:'g_'+mk,key:mk,orderId:o.id,order:g,sched:m.sched!=null?m.sched:slot,status:m.status,value:m.value,completedMin:m.min,by:m.by,notes:m.notes,reason:m.reason}); }); });
  out.orders.sort(function(a,b){ return String(b.dc_at).localeCompare(String(a.dc_at)); }); return out; };
/* no new slots after the stop time on the stop day; none at all on later days */
function dcCut(o,dk){ if(!o||!o.dc||!o.dc_at) return Infinity; var at=new Date(o.dc_at), adk=dayKey(at); if(adk>dk) return Infinity; if(adk<dk) return -1;
  return at.getHours()*60+at.getMinutes(); }
function canOrderTS(){ var r=staffRole(); return r==='doctor'||r==='admin'; }
function oFind(id){ return (ORDERS||[]).find(function(o){ return o.id===id; })||((curDoc&&curDoc.orders)||{})[id]||null; }
function fmtWhen(iso){ try{ var d=new Date(iso), t=new Date(); var day=d.toDateString()===t.toDateString()?'Today':(d.getMonth()+1)+'/'+d.getDate(); return day+' · '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }
var TYPE_L={med:'Medication',obs:'Monitoring',care:'Patient care',diag:'Diagnostics',fluid:'Fluids'};
var TYPE_IC={med:'M10.5 20.5 3.5 13.5a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7ZM8.5 8.5l7 7',obs:'M3 12h4l3-8 4 16 3-8h4',care:'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z',diag:'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3',fluid:'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z'};

/* today's slots for this order as small dots: done · due · missed · scheduled */
function slotDots(o){ var T=(TASKS||[]).filter(function(t){ return t.orderId===o.id; }).sort(function(a,b){ return a.sched-b.sched; }), now=nowMin();
  if(!T.length) return ''; var done=T.filter(function(t){ return t.status==='completed'; }).length;
  return '<div class="op-prog"><div class="op-dots">'+T.map(function(t){ var c=t.status==='completed'?'done':t.status?'other':(t.sched<now-60?'late':t.sched<=now+60?'due':'sched');
      return '<span class="op-dot '+c+'" title="'+esc(fmtTime(t.sched))+(t.status?' · '+esc(t.status):'')+'"></span>'; }).join('')+'</div>'
    +'<span>'+done+' of '+T.length+' '+(o.type==='med'?'given':'done')+' '+(window.tsViewDk&&tsViewDk()!==dayKey()?'that day':'today')+'</span></div>'; }
function row(k,v){ return v?'<div class="op-row"><span>'+k+'</span><b>'+v+'</b></div>':''; }

window.tsOrderPanel=function(id){ var o=oFind(id); if(!o) return; if(claim('order.panel',o)) return;   /* infusions have their own card */ var can=canOrderTS()&&!(window.tsViewDk&&tsViewDk()!==dayKey());
  var brand=window.tsBrand?tsBrand(o.name):'', big='', sub='';
  if(o.type==='med'){ var d=medDose(o); big=esc(d.mg); var per=String(o.dose+' '+o.unit); sub=[per.trim()!==String(d.mg).trim()?esc(per):'', o.conc?esc(d.volume+' of '+(o.conc_label||o.conc+' '+String(o.unit||'mg').split('/')[0]+'/mL')):''].filter(Boolean).join(' · '); }
  else if(o.type==='fluid'){ big=esc(o.rate||''); }
  else { big=esc(o.freq||''); sub=o.unit?esc(o.unit):''; }
  var nx=''; try{ nx=nextDueText(o); }catch(e){}
  var who=o.ordered_by_name||o.ordered_by||'', src=o.dose_source==='reference_suggestion'?'Reference dose, confirmed':o.dose_source==='doctor_entered'?'Entered by the doctor':'';
  var html='<div class="op-head"><span class="op-ic t-'+esc(o.type||'obs')+'"><svg viewBox="0 0 24 24" fill="none"><path d="'+(TYPE_IC[o.type]||TYPE_IC.obs)+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">'+(TYPE_L[o.type]||'Order')+(o.route?' · '+esc(o.route):'')+'</div><h3>'+esc(o.name)+(brand?' <span class="op-brand">'+esc(brand)+'</span>':'')+'</h3></div>'
    +'<button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +(o.dc?'<div class="op-dc-banner"><b>'+esc(dcLabel(o))+'</b> '+esc(fmtWhen(o.dc_at))+(o.dc_by_name?' by '+esc(o.dc_by_name):'')+(o.dc_note?'<br><small>'+esc(o.dc_note)+'</small>':'')+'</div>':'')
    +'<div class="op-hero"><div class="op-big">'+big+'</div>'+(sub?'<div class="op-sub">'+sub+'</div>':'')
      +(o.type!=='fluid'&&o.freq&&o.type==='med'?'<div class="op-freq"><span>'+esc(o.freq)+'</span>'+(nx&&!o.dc?'<small>'+esc(nx)+'</small>':'')+'</div>':(nx&&!o.dc&&o.type!=='med'?'<div class="op-freq"><small>'+esc(nx)+'</small></div>':''))+'</div>'
    +slotDots(o)+(o.safety&&window.tsMsSafetyHTML?tsMsSafetyHTML(o):'')
    +'<div class="op-list">'+row('First dose',o.start!=null&&o.type==='med'?esc(fmtTime(o.start*60)):'')+row('Ordered by',who?esc(who)+(o.ordered_at?' · '+esc(fmtWhen(o.ordered_at)):''):'')
      +(window.tsMsPanelRows?tsMsPanelRows(o):'')+row('Dose source',esc(src))+row('Reference',o.ref&&o.ref.dose?esc(o.ref.dose+(o.ref.indication?' — '+o.ref.indication:'')):'')+row('Instructions',o.notes?esc(o.notes):'')+'</div>'
    +(can&&!o.dc&&window.tsInsSplitCount&&tsInsSplitOne(o)?'<button type="button" class="op-link rl-sp-btn" onclick="tsInsSplitOpen(\''+esc(o.id)+'\')">Shorten the name — keep the rest as instructions</button>':'')
    +(window.tsOcPanelRows?tsOcPanelRows(o):'')   /* price · note required · owner handout (ordercare.js) */
    +(window.tsPinBtn?tsPinBtn(o):'')   /* pin to the top of its section (sortorder.js) */
    +(o.dc?'':(can?'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderChange(\''+esc(o.id)+'\')">Change…</button><button type="button" class="op-btn danger" onclick="tsOrderStopAsk(\''+esc(o.id)+'\')">Discontinue</button></div>'
      :'<p class="op-foot">'+((window.tsViewDk&&tsViewDk()!==dayKey())?'Go back to today to change orders.':'Only doctors can change or stop orders.')+'</p>'));
  opShow(html); };
function opShow(html,cls){ var m=document.getElementById('tsOrderSheet'); if(!m){ m=document.createElement('div'); m.id='tsOrderSheet'; document.body.appendChild(m);
    m.addEventListener('click',function(e){ if(e.target===m) tsOrderClose(); }); document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&m.classList.contains('show')) tsOrderClose(); }); }
  m.innerHTML='<div class="op-card'+(cls?' '+cls:'')+'" role="dialog" aria-modal="true">'+html+'</div>'; requestAnimationFrame(function(){ m.classList.add('show'); }); }
window.tsOrderClose=function(){ var m=document.getElementById('tsOrderSheet'); if(m) m.classList.remove('show'); };

/* ---------- discontinue: pick a reason, confirm ---------- */
window.tsOrderStopAsk=function(id){ var o=oFind(id); if(!o) return; window._opDc={id:id,reason:'discontinued'};
  var html='<div class="op-head"><span class="op-ic danger"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>'
    +'<div><div class="op-kind">Discontinue</div><h3>'+esc(o.name)+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">'+(o.cont?'The infusion stops now. What has run so far stays on the record.':'Upcoming '+(o.type==='med'?'doses':'checks')+' come off the sheet. Everything already charted stays.')+'</p>'
    +'<div class="op-reasons">'+DC_REASONS.map(function(r,i){ return '<button type="button" class="op-reason'+(i?'':' on')+'" data-r="'+r.k+'" onclick="tsOrderReason(this)"><b>'+r.l+'</b><small>'+r.d+'</small><i></i></button>'; }).join('')+'</div>'
    +'<input id="opDcNote" class="op-note" placeholder="Note (optional)">'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderPanel(\''+esc(id)+'\')">Back</button><button type="button" class="op-btn danger solid" onclick="tsOrderStop()">Discontinue '+esc(o.name)+'</button></div>';
  opShow(html); };
window.tsOrderReason=function(b){ document.querySelectorAll('#tsOrderSheet .op-reason').forEach(function(x){ x.classList.toggle('on',x===b); }); window._opDc.reason=b.dataset.r; };
function stopOrder(id,reason,note){ var o=oFind(id); if(!o||!CUR||!curDoc) return Promise.resolve(); var me=user(), now=new Date().toISOString();
  var base=(curDoc.orders&&curDoc.orders[id])||clean(o);
  var dc=Object.assign({},base,{dc:true,dc_at:now,dc_by:me.initials,dc_by_name:me.name||me.initials,dc_by_uid:me.uid||null,dc_reason:reason||'discontinued',dc_note:note||null});
  var lbl=(DC_REASONS.find(function(r){ return r.k===reason; })||DC_REASONS[0]).l;
  curDoc.orders[id]=dc; if(curMain&&curMain.orders) curMain.orders[id]=dc;
  var redraw=function(){ ORDERS=ORDERS.map(function(x){ return x.id===id?dc:x; }).filter(function(x){ return !x.dc||dcVisible(x); }); buildTasks();
    /* on the sheet: redraw the grid in place, so the stopped row dims and glides down into Stopped & completed (store/rowlook.js) */
    if(typeof currentCTab!=='undefined'&&currentCTab==='sheet'&&document.getElementById('sheetInner')){ try{ buildGrid(); refreshHeader(); emit('rendered'); return; }catch(e){ console.warn(e); } }
    try{ renderSheet(); }catch(e){ try{ buildGrid(); }catch(_){} } };
  redraw();
  var u={updated_at:now,updated_by:me.initials,audit:U([{at:now,type:'doctor',desc:'Order '+(reason==='error'?'entered in error':reason==='rejected'?'not approved':'discontinued')+' — <b>'+esc(o.name)+'</b>'+(o.type==='med'?' '+esc(medDose(o).mg)+' '+esc(o.route||'')+' '+esc(o.freq||''):'')+((reason==='error'||reason==='discontinued'||reason==='rejected')?'':' · '+esc(lbl))+(note?' · '+esc(note):''),who:me.initials,uid:me.uid}])};
  u['orders.'+id]=dc;
  return tsCommit(CUR,u).catch(function(e){ console.warn('[discontinue]',e); }); }
window.tsOrderStop=function(){ var s=window._opDc||{}, o=oFind(s.id); if(!o) return; var note=((document.getElementById('opDcNote')||{}).value||'').trim();
  var sheet=CUR, before=JSON.parse(JSON.stringify((curDoc&&curDoc.orders&&curDoc.orders[s.id])||clean(o)));
  tsOrderClose(); stopOrder(s.id,s.reason,note);
  undoToast(esc(o.name)+' '+(s.reason==='error'?'marked entered in error':'discontinued'),function(){ restoreOrder(sheet,s.id,before); }); };
/* Undo: the order comes back exactly as it was (the audit keeps both steps) */
function restoreOrder(sheet,id,before){ if(CUR!==sheet||!curDoc){ toast('Open the patient to undo'); return; } var me=user(), now=new Date().toISOString(), o=Object.assign({},before);
  ['dc','dc_at','dc_by','dc_by_name','dc_by_uid','dc_reason','dc_note'].forEach(function(k){ delete o[k]; });
  curDoc.orders[id]=o; if(curMain&&curMain.orders) curMain.orders[id]=o;
  hydrate(); try{ renderSheet(); }catch(e){ try{ buildGrid(); }catch(_){} } try{ revealOrder(o); }catch(e){}
  var u={updated_at:now,updated_by:me.initials,audit:U([{at:now,type:'doctor',desc:'Discontinue undone — <b>'+esc(o.name)+'</b>',who:me.initials,uid:me.uid}])}; u['orders.'+id]=o;
  tsCommit(sheet,u).catch(function(){}); toast(esc(o.name)+' restored'); }
window.tsRestoreOrder=restoreOrder;
window.tsStopOrder=stopOrder;
/* a toast with an Undo button and a thin countdown line */
function undoToast(msg,onUndo,ms){ ms=ms||5000; var w=document.getElementById('toastWrap'); if(!w){ toast(msg); return; }
  var el=document.createElement('div'); el.className='ctoast ts-undo';
  el.innerHTML='<span class="tk"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="tu-msg">'+msg+'</span><button type="button">Undo</button><i class="tu-bar" style="animation-duration:'+ms+'ms"></i>';
  w.appendChild(el); var done=false, kill=function(){ if(!el.parentNode) return; el.style.opacity='0'; el.style.transform='translateY(8px)'; setTimeout(function(){ el.remove(); },300); };
  el.querySelector('button').onclick=function(){ if(done) return; done=true; kill(); try{ onUndo(); }catch(e){ console.warn('[undo]',e); } };
  setTimeout(function(){ done=true; kill(); },ms); }
window.tsUndoToast=undoToast;

/* ---------- change: monitoring updates in place; a medication is re-ordered and the old one is stopped as "Changed" ---------- */
window.tsOrderChange=function(id){ var o=oFind(id); if(!o) return; tsOrderClose();
  if(o.type!=='med'){ var m=(typeof OBS!=='undefined'&&OBS.find(function(x){ return x.n.toLowerCase()===String(o.name).toLowerCase(); }))||{n:o.name,t:o.type||'obs',u:o.unit||'',f:[],custom:false};
    openObsOrder(m); return; }
  window._opReplace=o.id;
  window.tsOpenMedOrder(o.name).then(function(i){ if(i<0){ window._opReplace=null; toast('This drug isn’t in the reference — stop it and add the new order'); return; }
    setTimeout(function(){ var set=function(idd,v){ var el=document.getElementById(idd); if(el&&v!=null&&v!==''){ el.value=String(v); } };
      set('rxUnit',o.unit); set('rxDose',o.dose); set('rxRoute',o.route); set('rxFreq',o.freq); if(o.conc) set('rxConc',o.conc); if(o.notes) set('rxNotes',o.notes);
      try{ if(RX){ RX.touched=true; RX.concTouched=!!o.conc; } tsRxCalc(true); }catch(e){}
      var h=document.querySelector('#tsModal h3'); if(h&&!h.querySelector('.op-chg')) h.insertAdjacentHTML('beforeend',' <span class="op-chg">Changing</span>'); },120); }); };
/* the replacement was placed: stop the old order as "Changed" (a failed attempt keeps the change pending) */
on('rx.added',function(n){ var old=window._opReplace; window._opReplace=null; if(old&&n.draft){ var od=oFind(old); if(od&&od.draft) stopOrder(old,'error','Replaced by a new draft'); return; }   /* an intern's change waits for approval; the old order keeps running (drafts.js) */
  if(old) stopOrder(old,'changed','Replaced by '+n.name+' '+n.dose+' '+n.unit+' '+n.route+' '+n.freq); });
/* closing the order window without placing it cancels the change */
document.addEventListener('click',function(e){ if(window._opReplace&&e.target&&(e.target.matches('#tsModal .tm-scrim')||e.target.matches('#tsModal [data-x]'))) window._opReplace=null; },true);

/* ═════════ TS DRAFTS — an intern's orders wait for a doctor's approval ═════════
   Who drafts: Graduate Veterinarian Interns (window.TS_STAFF.interns, from the Directory titles at build time). The owner account can
   try it from the toolbar in the preview (sessionStorage tsInternTry). Everyone else's orders go straight onto the sheet as before.
   What is drafted: medications, IV fluids / CRIs and diagnostics (monitoring and patient care go straight on). An intern's Change… is a
   draft that replaces the running order only when approved (order.draft.replaces); an intern's rate change is order.rate_draft.
   Per intern (ts_settings/drafts, store below): drafts on or off, optionally "until" a date; the owner and the people the owner names change it
   from the board (Intern drafts). An intern not listed there is in draft mode.
   A draft has no slots (core freqTimes), runs no fluids, is not charged and shows hatched with a Draft badge. Doctors see "N to approve"
   in the toolbar and on the board; Approve · Edit · Not approved (with a reason). Every step is in the audit. */
var DRAFT_TYPES={med:1,fluid:1,diag:1};
var DRAFT_CAP='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5L2 9Z M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5 M22 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
window.tsIsDrafter=function(){ var r=staffRole(); if(r==='admin'){ try{ return sessionStorage.getItem('tsInternTry')==='1'; }catch(e){ return false; } }
  var me=normName(user().name); return !!me&&((window.TS_STAFF||{}).interns||[]).some(function(n){ return normName(n)===me; })&&tsDraftOnFor(user().name); };
function drCanApprove(){ return canOrderTS()&&!tsIsDrafter(); }
function drMine(o){ var me=user(); return !!(o&&o.draft&&((o.draft.uid&&o.draft.uid===me.uid)||o.draft.by===me.initials)); }
function drLine(o){ if(o.type==='med'){ var d=medDose(o); return d.mg+(o.route?' '+o.route:'')+(o.freq?' '+o.freq:''); }
  if(o.cont) return window.tsInfRateStr?tsInfRateStr(o):(o.rate||''); return o.freq||''; }
function drWhen(iso){ try{ return fmtWhen(iso); }catch(e){ return ''; } }
function drList(d){ d=d||curDoc; var O=(d&&d.orders)||{}, out=[]; Object.keys(O).forEach(function(k){ var o=O[k]; if(o&&!o.dc&&(o.draft||o.rate_draft)) out.push(o); }); return out; }

/* new orders from an intern become drafts */
on('orders.adding',function(list){ if(!tsIsDrafter()) return; var me=user(), now=new Date().toISOString(), names=[];
  var rp=window._opReplace&&oFind(window._opReplace);   /* an intern's Change…: the draft replaces that order (or what the draft it redoes was replacing) once approved */
  list.forEach(function(o){ if(!o||!DRAFT_TYPES[o.type]) return; o.draft={by:me.initials||null,by_name:me.name||null,uid:me.uid||null,at:now};
    if(rp&&o.type==='med'&&!rp.dc){ var r=rp.draft?(rp.draft.replaces||null):rp.id; if(r) o.draft.replaces=r; } names.push('<b>'+esc(o.name)+'</b>'); });
  if(!names.length) return; logEvent('doctor','Draft order'+(names.length>1?'s':'')+' — '+names.join(', ')+' · waiting for a doctor to approve',me.initials);
  var viaRx=list.length===1&&list[0].type==='med';   /* the medication window already says "draft — waiting for a doctor to approve" */
  if(!viaRx) setTimeout(function(){ toast(names.length>1?names.length+' drafts sent for approval':'Draft sent for approval'); },450); });
/* a doctor editing an intern's draft: the new order is the approved one; the order the draft was replacing stops */
var drRepl=null;
on('rx.build',function(o){ var old=window._opReplace&&oFind(window._opReplace); drRepl=null; if(!old||!old.draft||tsIsDrafter()) return; var me=user();
  o.approved={by:me.initials,by_name:me.name||null,at:new Date().toISOString(),draft_by:old.draft.by,draft_by_name:old.draft.by_name||null,edited:true}; drRepl=old.draft.replaces||null;
  logEvent('doctor','Approved with changes — <b>'+esc(o.name)+'</b> (drafted by '+esc(old.draft.by_name||old.draft.by||'')+')',me.initials); });
on('rx.added',function(o){ var r=drRepl; drRepl=null; if(r&&window.tsStopOrder) tsStopOrder(r,'changed','Replaced by '+o.name+' (approved)'); });

/* ---------- approve · not approved · withdraw ---------- */
window.tsDraftApprove=function(id,quiet){ var o=orderById(id); if(!o||!o.draft||!drCanApprove()) return false; var me=user(), now=new Date().toISOString(), d=o.draft;
  var patch={draft:null,approved:{by:me.initials,by_name:me.name||null,at:now,draft_by:d.by,draft_by_name:d.by_name||null}};
  if(o.cont){ patch.started_at=now; patch.start=new Date().getHours(); patch.rates=(o.rates||[]).map(function(r,i){ return i===0?Object.assign({},r,{at:now}):r; }); }
  logEvent('doctor','Approved — <b>'+esc(o.name)+'</b> '+esc(drLine(o))+' (drafted by '+esc(d.by_name||d.by||'')+')',me.initials);
  updateOrder(id,patch); if(d.replaces&&window.tsStopOrder) tsStopOrder(d.replaces,'changed','Replaced by '+o.name+' (approved)');
  if(!quiet){ tsOrderClose(); toast(esc(o.name)+' approved'); } drPaint(); return true; };
window.tsDraftApproveAll=function(){ var n=0; drList().slice().forEach(function(o){ if(o.draft&&tsDraftApprove(o.id,true)) n++; else if(o.rate_draft&&window.tsRateDraftApprove){ tsRateDraftApprove(o.id,true); n++; } });
  tsOrderClose(); if(n) toast(n+' approved'); drPaint(); };
var DR_WHY=['Dose','Drug choice','Route / frequency','Not needed','Let’s talk'];
window.tsDraftRejectAsk=function(id){ var o=oFind(id); if(!o) return; window._drWhy=null;
  var html='<div class="op-head"><span class="op-ic danger"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>'
    +'<div><div class="op-kind">Not approved</div><h3>'+esc(o.name)+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">'+esc(drLine(o))+' — drafted by '+esc((o.draft&&(o.draft.by_name||o.draft.by))||'')+'. The intern sees your reason.</p>'
    +'<div class="rx-chips dr-why">'+DR_WHY.map(function(w){ return '<button type="button" class="rx-chip" onclick="tsDraftWhy(this)">'+esc(w)+'</button>'; }).join('')+'</div>'
    +'<input id="drNote" class="op-note" placeholder="Note for the intern (optional)">'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderPanel(\''+esc(id)+'\')">Back</button><button type="button" class="op-btn danger solid" onclick="tsDraftReject(\''+esc(id)+'\')">Not approved</button></div>';
  opShow(html); };
window.tsDraftWhy=function(b){ document.querySelectorAll('#tsOrderSheet .dr-why .rx-chip').forEach(function(x){ x.classList.toggle('on',x===b); }); window._drWhy=b.textContent; };
window.tsDraftReject=function(id){ var o=oFind(id); if(!o||!drCanApprove()) return; var note=((document.getElementById('drNote')||{}).value||'').trim(), why=[window._drWhy,note].filter(Boolean).join(' — ');
  tsOrderClose(); tsStopOrder(id,'rejected',why||null); toast(esc(o.name)+' not approved'); setTimeout(drPaint,400); };
window.tsDraftWithdraw=function(id){ var o=oFind(id); if(!o||!drMine(o)) return; tsOrderClose(); tsStopOrder(id,'error','Draft withdrawn'); toast('Draft withdrawn'); setTimeout(drPaint,400); };
window.tsDraftEdit=function(id){ var o=oFind(id); if(!o) return; tsOrderClose(); if(o.cont) return tsInfRateAsk(id); tsOrderChange(id); };

/* ---------- the draft's own panel (before the regular order panel and the infusion card) ---------- */
on('order.panel',function(o){ if(!o||!o.draft||o.dc) return false; tsDraftPanel(o); return true; },-1);
function drPanelHTML(o){ var d=o.draft, rep=d.replaces&&oFind(d.replaces), can=drCanApprove()&&!(window.tsViewDk&&tsViewDk()!==dayKey());
  var html='<div class="op-head"><span class="op-ic dr-ic">'+DRAFT_CAP+'</span>'
    +'<div><div class="op-kind">Draft · '+esc((TYPE_L&&TYPE_L[o.type])||'Order')+(o.route?' · '+esc(o.route):'')+'</div><h3>'+esc(o.name)+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<div class="op-hero"><div class="op-big">'+esc(drLine(o))+'</div>'+(o.type==='med'&&o.dose!=null?'<div class="op-sub">'+esc(o.dose+' '+o.unit)+(o.conc?' · '+esc(medDose(o).volume):'')+'</div>':'')+'</div>'
    +'<div class="dr-banner"><b>Waiting for a doctor’s approval</b><span>Drafted by '+esc(d.by_name||d.by||'')+' · '+esc(drWhen(d.at))+'. Nothing is given or charged until it’s approved.</span>'
      +(rep?'<span>Replaces <b>'+esc(rep.name)+' '+esc(drLine(rep))+'</b> — that order keeps running until then.</span>':'')+'</div>'
    +(o.safety&&window.tsMsSafetyHTML?tsMsSafetyHTML(o):'')
    +'<div class="op-list">'+(o.type==='med'&&o.start!=null?'<div class="op-row"><span>First dose</span><b>'+esc(fmtTime(o.start*60))+'</b></div>':'')
      +(o.prn?'<div class="op-row"><span>PRN</span><b>'+(o.prn.min?'q'+o.prn.min+'h at most':'')+(o.prn.when?' · when '+esc(o.prn.when.charAt(0).toLowerCase()+o.prn.when.slice(1)):'')+'</b></div>':'')
      +(o.ref&&o.ref.dose?'<div class="op-row"><span>Reference</span><b>'+esc(o.ref.dose+(o.ref.indication?' — '+o.ref.indication:''))+'</b></div>':'')
      +(o.notes?'<div class="op-row"><span>Instructions</span><b>'+esc(o.notes)+'</b></div>':'')+'</div>';
  if(can) html+='<div class="op-actions three"><button type="button" class="op-btn danger" onclick="tsDraftRejectAsk(\''+esc(o.id)+'\')">Not approved</button><button type="button" class="op-btn" onclick="tsDraftEdit(\''+esc(o.id)+'\')">Edit</button><button type="button" class="op-btn primary" onclick="tsDraftApprove(\''+esc(o.id)+'\')">Approve</button></div>';
  else if(drMine(o)) html+='<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button><button type="button" class="op-btn danger" onclick="tsDraftWithdraw(\''+esc(o.id)+'\')">Withdraw draft</button></div>';
  else html+='<p class="op-foot">A doctor approves this order before it goes on the schedule.</p><div class="op-actions one"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button></div>';
  return html; }
window.tsDraftPanel=function(o){ if(typeof o==='string') o=oFind(o); if(!o) return; opShow(drPanelHTML(o)); };
/* an intern's rate change on a running infusion (fluids.js shows it on the infusion card) */
window.tsRateDraftHTML=function(o){ var d=o&&o.rate_draft; if(!d) return ''; var can=drCanApprove(), to=window.tsInfRateStr?tsInfRateStr(o,d.v,d.u):(d.v+' '+d.u);
  return '<div class="dr-banner"><b>Rate change waiting for approval</b><span>'+esc(to)+' — drafted by '+esc(d.by_name||d.by||'')+' · '+esc(drWhen(d.at))+(d.note?' · '+esc(d.note):'')+'</span>'
    +(can?'<div class="dr-acts"><button type="button" class="op-btn danger" onclick="tsRateDraftApprove(\''+esc(o.id)+'\',false)">Not approved</button><button type="button" class="op-btn primary" onclick="tsRateDraftApprove(\''+esc(o.id)+'\',true)">Approve rate</button></div>':'')+'</div>'; };

/* ---------- the row badge, the toolbar pill, the list, the board ---------- */
window.tsDraftBadge=function(o){ if(!o) return ''; if(o.draft&&!o.dc) return '<span class="dr-badge" title="Draft by '+esc(o.draft.by_name||o.draft.by||'')+' — waiting for approval">'+DRAFT_CAP+'Draft</span>';
  if(o.rate_draft&&!o.dc) return '<span class="dr-badge rate" title="Rate change waiting for approval">'+DRAFT_CAP+'Rate</span>'; return ''; };
function drPaint(){ var el=document.getElementById('tsDrafts'); if(!el) return; var L=CUR&&curDoc?drList():[], drafter=tsIsDrafter(), admin=staffRole()==='admin', h='';
  if(L.length) h='<button type="button" class="ts-seen dr-pill'+(drafter?' mine':'')+'" onclick="tsDraftList()" title="Draft orders on this sheet">'+DRAFT_CAP+L.length+(drafter?' waiting for approval':' to approve')+'</button>';
  if(admin&&drafter&&tsInternTrying()) h+='<button type="button" class="ts-seen dr-try on" onclick="tsInternTry()" title="Intern mode is on for this device — tap to turn it off (Settings turns it on)">Intern mode on</button>';   /* turned on from Settings (store/settings.js); shown only while it is on */
  if(el.innerHTML!==h) el.innerHTML=h; }
on('header.refresh',drPaint); on('rendered',drPaint); on('sheet.drawn',drPaint);
window.tsInternTrying=function(){ try{ return sessionStorage.getItem('tsInternTry')==='1'; }catch(e){ return false; } };
window.tsInternTry=function(){ try{ if(sessionStorage.getItem('tsInternTry')==='1') sessionStorage.removeItem('tsInternTry'); else sessionStorage.setItem('tsInternTry','1'); }catch(e){}
  toast(tsIsDrafter()?'Intern mode — your orders are drafts':'Intern mode off'); drPaint(); };
window.tsDraftList=function(){ var L=drList(), can=drCanApprove(); if(!L.length){ tsOrderClose(); return; }
  var html='<div class="op-head"><span class="op-ic dr-ic">'+DRAFT_CAP+'</span><div><div class="op-kind">Drafts · '+L.length+'</div><h3>'+esc(VISIT.patient||'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<div class="op-list dr-list">'+L.map(function(o){ var d=o.draft||o.rate_draft, rate=!o.draft;
      return '<div class="op-row" onclick="'+(rate?'tsInfPanel':'tsDraftPanel')+'(\''+esc(o.id)+'\')" style="cursor:pointer"><span>'+esc(drWhen(d.at).replace('Today · ',''))+'</span><b>'+esc(o.name)+' · '+esc(rate?'rate → '+(window.tsInfRateStr?tsInfRateStr(o,d.v,d.u):d.v):drLine(o))+'<small> — '+esc(d.by_name||d.by||'')+'</small></b></div>'; }).join('')+'</div>'
    +(drCanEdit()?'<button type="button" class="op-link" onclick="tsInternsOpen()">Which interns need approval…</button>':'')
    +(can?'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button><button type="button" class="op-btn primary" onclick="tsDraftApproveAll()">Approve all</button></div>'
      :'<div class="op-actions one"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button></div>');
  opShow(html,'wide'); };
on('board.rows',function(list){ list.forEach(function(row){ var s=SHEETS.find(function(x){ return x._id===row._id; }); if(!s) return; var d=s._id===CUR&&curDoc?curDoc:s, n=drList(d).length;
  if(n) row.alerts=[{t:'warn',x:n+' draft'+(n>1?'s':'')+' to approve'}].concat(row.alerts||[]); }); });

/* ═════════ per-intern switch — Firestore ts_settings/drafts ═════════
   { interns: { '<normName>': {name, on, until:'YYYY-MM-DD'|null, by, at} }, editors: ['email', …], log: [{at, by, who, change}] }
   Read by everyone signed in; written by the owner, or by the emails in editors (who can't change editors) — rule: Firebase/firestore-ts-settings-rule.txt.
   Until the rule is published the read fails quietly and every intern stays in draft mode. */
var DR_SET={interns:{},editors:[],log:[]}, drSetUnsub=null;
function drSetListen(){ if(drSetUnsub||typeof DB==='undefined'||!DB||!AUTH||!AUTH.currentUser) return;
  try{ drSetUnsub=DB.collection('ts_settings').doc('drafts').onSnapshot(function(s){ var d=(s&&s.exists&&s.data())||{}; DR_SET={interns:d.interns||{},editors:(d.editors||[]).map(function(e){ return String(e).toLowerCase(); }),log:d.log||[]};
      drPaint(); var p=document.querySelector('#tsOrderSheet .di-list'); if(p) tsInternsOpen(); try{ if(currentCTab==='dash') renderDash(); }catch(e){} },
    function(e){ console.warn('[intern drafts settings]',e&&e.code); }); }catch(e){} }
on('header.refresh',drSetListen); on('rendered',drSetListen); setTimeout(drSetListen,1500);
function drKey(n){ return normName(n); }
function drIso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
/* is this intern in draft mode today? (not listed: yes) */
window.tsDraftOnFor=function(name){ var s=DR_SET.interns[drKey(name)]; if(!s) return true; if(s.on===false) return false; if(s.until) return drIso(new Date())<=String(s.until); return true; };
function drUntilText(iso){ try{ var p=String(iso).split('-'); return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString([], {month:'short',day:'numeric',year:(+p[0]!==new Date().getFullYear()?'numeric':undefined)}); }catch(e){ return iso; } }
function drCanEdit(){ var u=AUTH&&AUTH.currentUser; return staffRole()==='admin'||(!!u&&DR_SET.editors.indexOf(String(u.email||'').toLowerCase())>-1); }
window.tsDraftCanEdit=drCanEdit;
function drStatus(n){ var s=DR_SET.interns[drKey(n)];
  if(!s||s.on!==false&&!s.until) return {on:true,t:'Drafts on'};
  if(s.on===false) return {on:false,t:'Off — orders go straight onto the sheet'};
  var live=tsDraftOnFor(n); return {on:live,until:s.until,t:live?'Drafts until '+drUntilText(s.until):'Ended '+drUntilText(s.until)+' — orders go straight on'}; }
function drSave(patch,change,who){ var me=user(), now=new Date().toISOString(), entry={at:now,by:me.name||me.initials||'',who:who||'',change:change};
  if(patch.interns) Object.keys(patch.interns).forEach(function(k){ DR_SET.interns[k]=Object.assign({},DR_SET.interns[k]||{},patch.interns[k]); });
  if(patch.editors) DR_SET.editors=patch.editors.slice(); DR_SET.log=(DR_SET.log||[]).concat([entry]);
  var data=Object.assign({},patch,{updated_at:now,updated_by:me.name||null}); try{ data.log=firebase.firestore.FieldValue.arrayUnion(entry); }catch(e){}
  try{ DB.collection('ts_settings').doc('drafts').set(data,{merge:true}).catch(function(e){ console.warn('[intern drafts]',e); toast('Couldn’t save — '+(e&&e.code==='permission-denied'?'the database rule for intern settings isn’t published yet':'try again')); }); }catch(e){}
  drPaint(); }
window.tsInternSet=function(name,on){ if(!drCanEdit()) return; var k=drKey(name), cur=DR_SET.interns[k]||{}, me=user(), rec={name:name,on:!!on,until:on?(cur.until||null):null,by:me.name||null,at:new Date().toISOString()};
  var I={}; I[k]=rec; drSave({interns:I},on?'drafts on':'drafts off',name); tsInternsOpen(); toast(name+(on?' — orders need approval':' — orders go straight onto the sheet')); };
window.tsInternUntil=function(name,iso){ if(!drCanEdit()) return; var k=drKey(name), me=user(), v=iso||null, rec={name:name,on:true,until:v,by:me.name||null,at:new Date().toISOString()};
  var I={}; I[k]=rec; drSave({interns:I},v?'drafts until '+drUntilText(v):'drafts on (no end date)',name); tsInternsOpen(); };
window.tsInternEditor=function(email,add){ if(staffRole()!=='admin') return; email=String(email||'').trim().toLowerCase(); if(add&&!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)){ toast('Enter an email address'); return; }
  var E=DR_SET.editors.filter(function(e){ return e!==email; }); if(add) E.push(email); drSave({editors:E},(add?'can change intern drafts: ':'removed: ')+email,''); tsInternsOpen(); };
/* the panel: one row per intern */
window.tsInternsOpen=function(){ if(!drCanEdit()){ toast('Only the owner and the people they name change this'); return; } var I=((window.TS_STAFF||{}).interns||[]).slice().sort(), owner=staffRole()==='admin', min=drIso(new Date());
  var rows=I.map(function(n){ var st=drStatus(n), s=DR_SET.interns[drKey(n)]||{}, q=esc(n).replace(/'/g,"\\'");
    return '<div class="di-row'+(st.on?'':' off')+'"><div class="di-who"><b>'+esc(n)+'</b><small>'+esc(st.t)+'</small></div>'
      +'<div class="di-ctl"><div class="di-seg" role="group" aria-label="Drafts for '+esc(n)+'"><button type="button" class="'+(s.on!==false?'on':'')+'" onclick="tsInternSet(\''+q+'\',true)">On</button><button type="button" class="'+(s.on===false?'on':'')+'" onclick="tsInternSet(\''+q+'\',false)">Off</button></div>'
      +(s.on!==false?'<label class="di-until"><span>until</span><input type="date" min="'+min+'" value="'+esc(s.until||'')+'" onchange="tsInternUntil(\''+q+'\',this.value)" aria-label="Drafts until (optional)"></label>':'')+'</div></div>'; }).join('');
  var log=(DR_SET.log||[]).slice(-5).reverse().map(function(l){ return '<div class="op-row"><span>'+esc(drWhen(l.at))+'</span><b>'+esc((l.who?l.who+' — ':'')+l.change)+'<small> · '+esc(l.by||'')+'</small></b></div>'; }).join('');
  var html='<div class="op-head"><span class="op-ic dr-ic">'+DRAFT_CAP+'</span><div><div class="op-kind">Intern drafts</div><h3>Graduate Veterinarian Interns</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">On: medications, fluids, CRIs and diagnostics wait for a doctor’s approval. Add an end date and drafts switch off by themselves after it.</p>'
    +'<div class="di-list">'+(rows||'<p class="op-lead">No interns in the Directory.</p>')+'</div>'
    +(owner?'<div class="rx-lbl op-lbl">Who else can change this</div><div class="di-eds">'+DR_SET.editors.map(function(e){ return '<span class="di-ed">'+esc(e)+'<button type="button" onclick="tsInternEditor(\''+esc(e)+'\',false)" aria-label="Remove '+esc(e)+'">×</button></span>'; }).join('')
      +'<span class="di-add"><input id="diEd" type="email" placeholder="name@pravix.app" onkeydown="if(event.key===\'Enter\')tsInternEditor(this.value,true)"><button type="button" class="op-btn" onclick="tsInternEditor(document.getElementById(\'diEd\').value,true)">Add</button></span></div>':'')
    +(log?'<div class="rx-lbl op-lbl">Recent changes</div><div class="op-list">'+log+'</div>':'')
    +'<div class="op-actions one"><button type="button" class="op-btn" onclick="tsOrderClose()">Done</button></div>';
  opShow(html,'wide'); };
/* the board's toolbar: the way in, for the people who can change it */
window.tsBoardTools=function(){ return drCanEdit()?'<button type="button" class="sb-wf-chip di-open" onclick="tsInternsOpen()" title="Which interns’ orders need approval">'+DRAFT_CAP+'Intern drafts</button>':''; };
/* the order window tells an intern their orders need approval (rx.js · fluids.js emit order.window) */
on('order.window',function(type){ if(!tsIsDrafter()||!DRAFT_TYPES[type]) return; var c=document.querySelector('#tsModal .tm-card'); if(!c||c.querySelector('.dr-note')) return;
  var s=DR_SET.interns[drKey(user().name)], until=s&&s.on!==false&&s.until?' until '+drUntilText(s.until):'', p=c.querySelector('p');
  var h='<div class="dr-note">'+DRAFT_CAP+'<span>'+(staffRole()==='admin'?'Intern mode — this order':'Your orders need')+' '+(staffRole()==='admin'?'will be a draft for a doctor to approve.':'a doctor’s approval'+until+'.')+'</span></div>';
  if(p) p.insertAdjacentHTML('afterend',h); else c.insertAdjacentHTML('afterbegin',h); });
/* ═════════ TS SORT ORDER — rows in the order the team wants them ═════════
   · Drag the grip at the left edge of a row label (it appears on hover) up or down within its section; arrow keys on the grip do the same.
     The new order is saved on the orders (order.rank) so everyone sees it.
   · Pin to top (order panel): order.pin keeps a row first in its section. Rescue drugs ordered PRN (midazolam, diazepam, naloxone,
     atropine, epinephrine, flumazenil, atipamezole) are pinned when they're added, so they're never hunted for in an emergency.
   Sorting itself is base.js orderCmp (section → pinned → rank → when added). Anyone who charts can sort; past days are view-only. */
var SO_RESCUE=/^(midazolam|diazepam|naloxone|atropine|epinephrine|flumazenil|atipamezole)$/i;
var SO_GRIP='<svg viewBox="0 0 8 14" aria-hidden="true"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>';
var SO_PIN='<svg class="rl-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2l1.5 1.5L13 6l4 4 2.5-2.5L21 9l-6 6-1.4-1.4-3.3 3.3L8 19l-3-3 2.1-2.3L5.7 12 2 6l4-4z" fill="currentColor"/></svg>';
function soCan(){ return canChart()&&!(window.tsViewDk&&tsViewDk()!==dayKey()); }
/* what core grid puts at the start of each row label: the reorder grip, a pin, a draft badge */
window.tsRowLead=function(o){ if(!o) return ''; var h='';
  if(!o.dc&&soCan()) h+='<button type="button" class="rl-grip" aria-label="Reorder '+esc(o.name)+' — drag, or use the arrow keys" title="Drag to reorder" onpointerdown="tsSortDown(event,\''+esc(o.id)+'\')" onclick="event.stopPropagation()" onkeydown="tsSortKey(event,\''+esc(o.id)+'\')">'+SO_GRIP+'</button>';
  if(o.pin&&!o.dc) h+='<span class="rl-pinwrap" title="Pinned to the top of '+esc(o.section)+'">'+SO_PIN+'</span>';
  if(window.tsDraftBadge) h+=tsDraftBadge(o);
  return h; };
on('orders.adding',function(list){ list.forEach(function(o){ if(o&&o.type==='med'&&o.freq==='PRN'&&SO_RESCUE.test(String(o.name||'').trim())) o.pin=true; }); });

/* ---------- save a section's order ---------- */
function soSection(sec){ return (ORDERS||[]).filter(function(o){ return o.section===sec&&(!o.dc||dcVisible(o)); }); }
function soApply(sec,ids){ var changed=0; ids.forEach(function(id,i){ var o=orderById(id); if(o&&o.rank!==i*10){ o.rank=i*10; changed++; } });
  if(!changed) return false; ORDERS.sort(orderCmp); rebuildTasks(); redrawSheet(); sync(); return true; }
window.tsSortMove=function(id,to){ var o=orderById(id); if(!o||!soCan()) return false; var L=soSection(o.section).map(function(x){ return x.id; }), from=L.indexOf(id); if(from<0) return false;
  to=Math.max(0,Math.min(L.length-1,to)); if(to===from) return false; L.splice(from,1); L.splice(to,0,id); return soApply(o.section,L); };
window.tsSortKey=function(e,id){ if(e.key!=='ArrowUp'&&e.key!=='ArrowDown') return; e.preventDefault(); e.stopPropagation(); var o=orderById(id); if(!o) return;
  var L=soSection(o.section).map(function(x){ return x.id; }); if(tsSortMove(id,L.indexOf(id)+(e.key==='ArrowUp'?-1:1))) setTimeout(function(){ var g=document.querySelector('#sheetInner .grow[data-o="'+id+'"] .rl-grip'); if(g) g.focus(); },30); };
window.tsPinToggle=function(id){ var o=orderById(id); if(!o||!soCan()) return; var on=!o.pin; tsOrderClose(); updateOrder(id,{pin:on||null}); try{ ORDERS.sort(orderCmp); redrawSheet(); }catch(e){}
  toast(esc(o.name)+(on?' pinned to the top of '+esc(o.section):' unpinned')); };
window.tsPinBtn=function(o){ if(!o||o.dc||!soCan()) return ''; return '<button type="button" class="op-link" onclick="tsPinToggle(\''+esc(o.id)+'\')">'+(o.pin?'Unpin':'Pin to the top of '+esc(o.section))+'</button>'; };

/* ---------- drag ---------- */
var soD=null;
window.tsSortDown=function(e,id){ if(e.button!==0||!soCan()) return; e.preventDefault(); e.stopPropagation(); var row=document.querySelector('#sheetInner .grow[data-o="'+id+'"]'); if(!row) return;
  var sec=row.dataset.sec, rows=[].slice.call(document.querySelectorAll('#sheetInner .grow[data-sec="'+sec.replace(/"/g,'\\"')+'"]')).filter(function(r){ return !r.classList.contains('sec-folded'); });
  soD={id:id,row:row,rows:rows,y0:e.clientY,h:row.offsetHeight,from:rows.indexOf(row),to:rows.indexOf(row),pid:e.pointerId,moved:false};
  try{ e.target.setPointerCapture(e.pointerId); }catch(_){} };
document.addEventListener('pointermove',function(e){ var d=soD; if(!d||e.pointerId!==d.pid) return; var dy=e.clientY-d.y0; if(!d.moved&&Math.abs(dy)<4) return;
  if(!d.moved){ d.moved=true; d.row.classList.add('so-drag'); document.body.classList.add('so-dragging'); }
  e.preventDefault(); var to=Math.max(0,Math.min(d.rows.length-1,d.from+Math.round(dy/d.h))); d.to=to;
  d.row.style.transform='translateY('+dy+'px)';
  d.rows.forEach(function(r,i){ if(r===d.row) return; var s=0; if(d.from<to&&i>d.from&&i<=to) s=-d.h; else if(d.from>to&&i<d.from&&i>=to) s=d.h; r.style.transform=s?'translateY('+s+'px)':''; }); },true);
function soEnd(drop){ var d=soD; soD=null; if(!d) return; d.rows.forEach(function(r){ r.style.transform=''; }); d.row.classList.remove('so-drag'); document.body.classList.remove('so-dragging');
  if(!drop||!d.moved||d.to===d.from) return; var L=d.rows.map(function(r){ return r.dataset.o; }); L.splice(d.from,1); L.splice(d.to,0,d.id);
  var o=orderById(d.id); if(o) soApply(o.section,L); }
document.addEventListener('pointerup',function(e){ if(soD&&e.pointerId===soD.pid) soEnd(true); },true);
document.addEventListener('pointercancel',function(e){ if(soD&&e.pointerId===soD.pid) soEnd(false); },true);
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&soD) soEnd(false); });
/* ═════════ TS OVERDUE MOTION — a task that turns overdue: its clock pops in ═════════
   (Oct 2026: the per-row overdue badge and its list were removed — the tiles and the section counts say it once.)
   Effects are re-applied after every redraw (the grid morphs in place and resets classes) until they run out. Off under Reduce Motion;
   the first draw of a sheet never animates. */
var BM={key:null,st:{},fx:[]};
function bmOff(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
function bmOd(tid){ return document.querySelector('#sheetInner .mark[data-t="'+String(tid).replace(/"/g,'\\"')+'"] .od'); }
function bmApply(){ var now=Date.now(); BM.fx=BM.fx.filter(function(f){ return now<f.end; });
  BM.fx.forEach(function(f){ var el=bmOd(f.id); if(el) el.classList.add(f.cls); }); }
window.tsBadgeMotion=function(){ var key=(typeof CUR!=='undefined'?CUR:'')+'|'+(window.tsViewDk?tsViewDk():''), first=BM.key!==key, st={};
  [].forEach.call(document.querySelectorAll('#sheetInner .mark[data-t]'),function(m){ st[m.dataset.t]=m.dataset.s; });
  if(first) BM.fx=[];
  else if(!bmOff()) Object.keys(st).forEach(function(id){ if(st[id]==='overdue'&&BM.st[id]&&BM.st[id]!=='overdue'){ BM.fx=BM.fx.filter(function(x){ return x.id!==id; }); BM.fx.push({id:id,cls:'bm-arrive',end:Date.now()+550}); } });
  bmApply(); BM.key=key; BM.st=st; };
/* ═════════ TS WORKFLOW — the board filtered by the kind of work ═════════
   Board → Filters: Assistant (walks, feeding, water, cage care, weights) · Lab (diagnostics and bloodwork) · Controlled drugs ·
   Fluids & CRIs · Medications. With one or more on, the board lists only patients who have that work ordered, and the hour blocks count
   only that work (base.js blocksFor asks tsWfOk). Per person, per browser (localStorage tsWf_v1) — a convenience, never shared.
   WF_CONTROLLED is the federal DEA-scheduled list for drugs in the reference; state-scheduled drugs (e.g. gabapentin) can be added. */
var WF_KEY='tsWf_v1';
var WF_CONTROLLED=/^(methadone|hydromorphone|morphine|fentanyl|oxymorphone|hydrocodone|remifentanil|alfentanil|buprenorphine|butorphanol|tramadol|midazolam|diazepam|alprazolam|ketamine|tiletamine \/ zolazepam|alfaxalone|phenobarbital|pregabalin)$/i;
var WF_LAB=/pcv|glucose|lactate|electrolyte|lytes|nova|chem|ketone|cbc|urinalysis|blood gas|culture|cytology|coag|pt\/ptt|smear/i;
var WF=[
  {k:'assist',l:'Assistant',d:'Walks, feeding, water, cage care, weights',
    t:function(o){ var n=String(o.name||''); return (o.type==='care'&&!/catheter|fluid|oxygen|physical therapy/i.test(n))||(o.type==='obs'&&/^(food|water|weight|appetite)/i.test(n)); }},
  {k:'lab',l:'Lab',d:'Diagnostics and bloodwork',t:function(o){ return o.type==='diag'||(o.type==='obs'&&WF_LAB.test(String(o.name||''))); }},
  {k:'ctrl',l:'Controlled drugs',d:'Opioids, benzodiazepines, ketamine, phenobarbital…',t:function(o){ return (o.type==='med'||o.cont)&&WF_CONTROLLED.test(String(o.name||'').trim()); }},
  {k:'inf',l:'Fluids & CRIs',d:'Anything running IV',t:function(o){ return !!o.cont; }},
  {k:'meds',l:'Medications',d:'Every medication order',t:function(o){ return o.type==='med'; }}];
function wfSel(){ try{ var a=JSON.parse(localStorage.getItem(WF_KEY)||'{}'); return a[user().uid||'_']||[]; }catch(e){ return []; } }
function wfSave(list){ try{ var a=JSON.parse(localStorage.getItem(WF_KEY)||'{}'); a[user().uid||'_']=list; localStorage.setItem(WF_KEY,JSON.stringify(a)); }catch(e){} }
window.tsWfOn=function(){ return wfSel().length>0; };
window.tsWfCount=function(){ return wfSel().length+flCount(); };
/* is this order part of the work being shown? (no filter: everything is) */
window.tsWfOk=function(o){ var S=wfSel(); if(!S.length) return true; if(!o||o.dc||o.draft) return false; return WF.some(function(w){ return S.indexOf(w.k)>-1&&w.t(o); }); };
window.tsWfMatches=function(d){ var O=(d&&d.orders)||{}; return Object.keys(O).some(function(k){ var o=O[k]; return o&&!o.dc&&!o.draft&&tsWfOk(o); }); };
/* the board keeps only the patients with that work (runs after every other board.rows handler) */
on('board.rows',function(list){ if(!tsWfOn()) return; for(var i=list.length-1;i>=0;i--){ var s=SHEETS.find(function(x){ return x._id===list[i]._id; }), d=s&&(s._id===CUR&&curDoc?curDoc:s);
  if(!d||!tsWfMatches(d)) list.splice(i,1); } },99);
/* ── more filters, Instinct-style categories with our look: Treatment status · Doctor · Technician · Ward · Service ──
   Within a category any ticked value matches (Dr. Schiff OR Dr. Moore); across categories all must match (Dr. Schiff AND ICU).
   Options come from the patients on the current board, each with its count. Per person, per browser (localStorage tsFilt_v1). */
var FL_KEY='tsFilt_v1', FL_OPEN='', FL_OPTS={};
var FL_GROUPS=[['st','Treatment status','Any status'],['dr','Doctor','Any doctor'],['tc','Technician','Any technician'],['wd','Ward','Any ward'],['sv','Service','Any service']];
var FL_ST=[['over','Overdue','Has tasks past due'],['due','Due now','Something due this hour'],['sched','Scheduled','More to do later today'],['clear','All caught up','Nothing overdue or due']];
function flSel(){ try{ var a=JSON.parse(localStorage.getItem(FL_KEY)||'{}'); return a[user().uid||'_']||{}; }catch(e){ return {}; } }
function flSave(v){ try{ var a=JSON.parse(localStorage.getItem(FL_KEY)||'{}'); a[user().uid||'_']=v; localStorage.setItem(FL_KEY,JSON.stringify(a)); }catch(e){} }
function flCount(){ var F=flSel(); return Object.keys(F).reduce(function(n,k){ return n+((F[k]||[]).length); },0); }
function flBoardSheets(){ var b=(typeof sbBoard!=='undefined'&&sbBoard)||'IP Board'; return SHEETS.filter(function(s){ return b==='My Board'?isMine(s):boardOf(s)===b; }); }
function flVal(s,g){ var p=s.patient||{};
  if(g==='dr') return p.doctor?'Dr. '+String(p.doctor).replace(/^dr\.?\s+/i,''):'No doctor';
  if(g==='tc') return p.tech||'Unassigned';
  if(g==='wd') return p.location||'No ward';
  if(g==='sv') return flSvc(p.service||p.department); return ''; }
/* the hospital's services, in this order; codes from Flow (ER, IM, SX, Neuro…) map onto them, no service = Emergency & Critical Care */
var FL_SVC=['Emergency & Critical Care','Internal Medicine','Neurology','Oncology','Surgery'];
function flSvc(v){ var t=String(v||'').trim(); if(!t||/^(er|ecc|ed)$|emerg|critical/i.test(t)) return FL_SVC[0]; if(/^im$|internal/i.test(t)) return FL_SVC[1];
  if(/^neuro/i.test(t)) return FL_SVC[2]; if(/^onc/i.test(t)) return FL_SVC[3]; if(/^sx$|^surg/i.test(t)) return FL_SVC[4]; return t; }
window.tsServiceName=flSvc;
function flStatus(blocks){ var b=blocks||[], has=function(x){ return b.some(function(k){ return k.status===x; }); };
  return {over:has('overdue'),due:has('due'),sched:has('scheduled'),clear:!has('overdue')&&!has('due')}; }
function flOptions(){ var S=flBoardSheets(), O={};
  O.st=FL_ST.map(function(x){ var n=S.filter(function(s){ return flStatus(blocksFor(s._id===CUR&&curDoc?curDoc:s))[x[0]]; }).length; return {v:x[0],l:x[1],d:x[2],n:n}; });
  ['dr','tc','wd','sv'].forEach(function(g){ var m={}; if(g==='sv') FL_SVC.forEach(function(v){ m[v]=0; }); S.forEach(function(s){ var v=flVal(s,g); m[v]=(m[v]||0)+1; });
    if(g==='sv'){ O.sv=FL_SVC.concat(Object.keys(m).filter(function(v){ return FL_SVC.indexOf(v)<0; }).sort()).map(function(v){ return {v:v,l:v,n:m[v]}; }); return; }
    O[g]=Object.keys(m).sort(function(a,b){ var na=/^(No |Unassigned)/.test(a), nb=/^(No |Unassigned)/.test(b); return na-nb||a.localeCompare(b); }).map(function(v){ return {v:v,l:v,n:m[v]}; }); });
  return O; }
function flLabel(g,v){ if(g==='st'){ var x=FL_ST.find(function(y){ return y[0]===v; }); return x?x[1]:v; } return v; }
/* the board keeps only the patients matching every category that has something ticked */
on('board.rows',function(list){ var F=flSel(); if(!flCount()) return;
  for(var i=list.length-1;i>=0;i--){ var r=list[i], s=SHEETS.find(function(x){ return x._id===r._id; }); if(!s){ list.splice(i,1); continue; }
    var ok=FL_GROUPS.every(function(G){ var g=G[0], vals=F[g]||[]; if(!vals.length) return true;
      if(g==='st'){ var st=flStatus(r.blocks); return vals.some(function(v){ return st[v]; }); }
      return vals.indexOf(flVal(s,g))>-1; });
    if(!ok) list.splice(i,1); } },99.5);
window.tsWfChip=function(){ var S=wfSel(), F=flSel(), names=WF.filter(function(w){ return S.indexOf(w.k)>-1; }).map(function(w){ return w.l; });
  FL_GROUPS.forEach(function(G){ (F[G[0]]||[]).forEach(function(v){ names.push(flLabel(G[0],v)); }); });
  if(!names.length) return '';
  return '<button type="button" class="sb-wf-chip" onclick="tsWfClear()" title="Showing only these patients — tap to show everything">'+esc(names.length>3?names.slice(0,2).join(' · ')+' +'+(names.length-2):names.join(' · '))+'<span aria-hidden="true">×</span></button>'; };
function wfPopHTML(){ var S=wfSel(), F=flSel(); FL_OPTS=flOptions();
  var work='<div class="wf-h">Show the work</div>'+WF.map(function(w){ var on=S.indexOf(w.k)>-1;
      return '<button type="button" class="fp-row wf-row'+(on?' on':'')+'" onclick="tsWfToggle(\''+w.k+'\')" aria-pressed="'+on+'"><span class="fp-lab"><b>'+esc(w.l)+'</b><small>'+esc(w.d)+'</small></span><i class="wf-ck"></i></button>'; }).join('');
  var more='<div class="wf-h">Patients</div>'+FL_GROUPS.map(function(G){ var g=G[0], vals=F[g]||[], open=FL_OPEN===g, opts=FL_OPTS[g]||[];
      var sum=vals.length?vals.map(function(v){ return flLabel(g,v); }).join(', '):G[2];
      return '<button type="button" class="fp-row wf-row fl-grp'+(open?' open':'')+(vals.length?' set':'')+'" onclick="tsFlOpen(\''+g+'\')" aria-expanded="'+open+'"><span class="fp-lab"><b>'+esc(G[1])+'</b><small>'+esc(sum)+'</small></span><i class="fl-chev" aria-hidden="true"></i></button>'
        +(open?'<div class="fl-opts">'+(opts.length?opts.map(function(o,i){ var on=vals.indexOf(o.v)>-1;
            return '<button type="button" class="fp-row wf-row'+(on?' on':'')+'" onclick="tsFlToggle(\''+g+'\','+i+')" aria-pressed="'+on+'"><span class="fp-lab"><b>'+esc(o.l)+'</b><small>'+(o.d?esc(o.d)+' · ':'')+o.n+' patient'+(o.n===1?'':'s')+'</small></span><i class="wf-ck"></i></button>'; }).join(''):'<div class="fl-none">No patients on this board.</div>')+'</div>':''); }).join('');
  return '<div class="sb-filter-pop wf-pop">'+work+more+'<button class="fp-clear" onclick="tsWfClear();_closePop()">Show everything</button></div>'; }
function flRedraw(){ var p=document.getElementById('flPop'); if(p) p.innerHTML=wfPopHTML(); try{ renderDash(); }catch(e){} }
window.tsFlOpen=function(g){ FL_OPEN=FL_OPEN===g?'':g; var p=document.getElementById('flPop'); if(p) p.innerHTML=wfPopHTML(); };
window.tsFlToggle=function(g,i){ var o=(FL_OPTS[g]||[])[i]; if(!o) return; var F=flSel(), L=(F[g]||[]).slice(), k=L.indexOf(o.v); if(k>-1) L.splice(k,1); else L.push(o.v); F[g]=L; flSave(F); flRedraw(); };
window.tsSbFilters=function(anchor){ _openPop(anchor,wfPopHTML()); };
window.tsWfToggle=function(k){ var S=wfSel(), i=S.indexOf(k); if(i>-1) S.splice(i,1); else S.push(k); wfSave(S); flRedraw(); };
window.tsWfClear=function(){ wfSave([]); flSave({}); FL_OPEN=''; try{ renderDash(); }catch(e){} };
/* ═════════ TS OUTBOX — charting survives a wifi dead zone ═════════
   Every save is kept on this device first (localStorage, per signed-in user), then sent; it is crossed off when the database confirms it.
   Offline, the screen keeps working from memory and Firestore holds the writes until the connection returns. If the tab is closed or
   reloaded before that, the saves still waiting here are sent on the next start — without overwriting anything charted more recently.
   No Firestore persistence on purpose (see the multi-tab lease note at the top of this file). */
var OBX_KEY='tsOutbox_v1', OBX_MAX_AGE=36*3600000, DEL={$fv:'del'}, OBX_LIVE={}, obxReplaying=false;
function U(list){ return {$fv:'union',v:list}; }
function obxAll(){ try{ var L=JSON.parse(localStorage.getItem(OBX_KEY)||'[]'); return Array.isArray(L)?L:[]; }catch(e){ return []; } }
function obxPut(L){ try{ if(L.length) localStorage.setItem(OBX_KEY,JSON.stringify(L)); else localStorage.removeItem(OBX_KEY); }catch(e){} }
function obxMine(){ var u=AUTH&&AUTH.currentUser&&AUTH.currentUser.uid; return obxAll().filter(function(e){ return e&&e.uid===u; }); }
function obxDone(id){ delete OBX_LIVE[id]; obxPut(obxAll().filter(function(e){ return e.id!==id; })); obxPaint(); }
function fvOf(v){ if(v&&typeof v==='object'&&v.$fv==='del') return FV.delete(); if(v&&typeof v==='object'&&v.$fv==='union') return FV.arrayUnion.apply(null,v.v||[]); return v; }
function fvMap(o){ var r={}; Object.keys(o||{}).forEach(function(k){ r[k]=fvOf(o[k]); }); return r; }
var OBX_FATAL=/permission-denied|not-found|invalid-argument|failed-precondition|unauthenticated/;

/* one save: main = sheet fields (dotted paths), day = { slotKey: mark | DEL } for sheets/{id}/days/{dk} */
function tsCommit(sheet,main,dk,day){ if(!DB||!sheet) return Promise.resolve();
  var me=user(), e={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),uid:me.uid||'',sheet:sheet,at:new Date().toISOString(),
    main:main&&Object.keys(main).length?main:null,dk:dk||null,day:day&&Object.keys(day).length?day:null};
  if(!e.main&&!e.day) return Promise.resolve();
  var L=obxAll(); L.push(e); obxPut(L); OBX_LIVE[e.id]=Date.now(); obxPaintSoon();
  return obxSend(e); }
window.tsCommit=tsCommit;
function obxSend(e){ var b=DB.batch(), nowIso=new Date().toISOString();
  if(e.day) b.set(dayRef(e.sheet,e.dk),{dk:e.dk,marks:fvMap(e.day),updated_at:nowIso},{merge:true});
  if(e.main) b.update(DB.collection(COL).doc(e.sheet),fvMap(e.main));
  return b.commit().then(function(){ obxDone(e.id); }).catch(function(err){
    console.warn('[outbox] save failed',err);
    if(OBX_FATAL.test(String(err&&(err.code||err.message)||''))){ obxDone(e.id); try{ toast('Couldn’t save that change — '+(/permission/.test(String(err.code))?'no permission':'the sheet is gone')); }catch(_){} }
    else { delete OBX_LIVE[e.id]; obxPaint(); }   /* kept on this device and retried quietly */
    throw err; }); }

/* saves left over from a closed tab or a reload: send them again, never over newer charting */
function obxReplay(){ if(obxReplaying||!DB||!AUTH||!AUTH.currentUser||!navigator.onLine) return; var now=Date.now();
  var L=obxMine().filter(function(e){ return !OBX_LIVE[e.id]; }); if(!L.length) return;
  var stale=L.filter(function(e){ return now-new Date(e.at).getTime()>OBX_MAX_AGE; }); stale.forEach(function(e){ obxDone(e.id); });
  L=L.filter(function(e){ return stale.indexOf(e)<0; }); if(!L.length) return;
  obxReplaying=true; L.forEach(function(e){ OBX_LIVE[e.id]=Date.now(); });
  var chain=Promise.resolve();
  L.forEach(function(e){ chain=chain.then(function(){ return obxReplayOne(e); }).catch(function(err){ console.warn('[outbox] replay',e.id,err); }); });
  chain.then(function(){ obxReplaying=false; obxPaint(); }); }
function obxReplayOne(e){ var ref=DB.collection(COL).doc(e.sheet);
  return Promise.all([ref.get({source:'server'}),e.day?dayRef(e.sheet,e.dk).get({source:'server'}):Promise.resolve(null)]).then(function(r){
    var main=r[0], dayS=r[1]; if(!main.exists){ obxDone(e.id); return; }
    var srvOrders=(main.data()||{}).orders||{}, srvMarks=(dayS&&dayS.exists&&dayS.data().marks)||{}, out={id:e.id,uid:e.uid,sheet:e.sheet,dk:e.dk,main:null,day:null};
    if(e.day){ var d={}; Object.keys(e.day).forEach(function(k){ var m=e.day[k], s=srvMarks[k];
        if(m&&m.$fv==='del'){ if(!s||String(s.at||'')<=e.at) d[k]=m; return; }
        if(!s||String(s.at||'')<=String(m.at||'')) d[k]=m; });
      if(Object.keys(d).length) out.day=d; }
    if(e.main){ var m={}; Object.keys(e.main).forEach(function(k){ if(k==='digest') return;
        if(k.indexOf('orders.')===0){ var id=k.slice(7), so=srvOrders[id], mine=e.main[k]; if(so&&so.dc&&!(mine&&mine.dc)) return; if(so&&JSON.stringify(so)===JSON.stringify(mine)) return; }
        m[k]=e.main[k]; });
      if(out.day) m.digest_dirty=true;
      if(Object.keys(m).some(function(k){ return k!=='updated_at'&&k!=='updated_by'&&k!=='digest_dirty'; })||out.day) out.main=m; }
    if(!out.main&&!out.day){ obxDone(e.id); return; }
    return obxSend(out); }); }

/* Saving is silent (Daniel, Oct 3 2026): changes are kept on this device and sent in the background — no "Saving…", no "Not connected".
   The only time anyone hears about it: a change still hasn't reached the database after OBX_WARN (5 min) — then one calm line, because
   that charting exists only on this computer until the connection comes back. */
var obxT=null, obxTick=null, OBX_WARN=5*60000;
function obxPaintSoon(){ clearTimeout(obxT); obxT=setTimeout(obxPaint,1500); }
function obxPaint(){ var el=document.getElementById('tsNet');
  var mine=obxMine(), n=mine.length, oldest=mine.reduce(function(a,e){ var t=new Date(e.at).getTime(); return Math.min(a,t); },Date.now()), stuck=n&&(Date.now()-oldest>OBX_WARN);
  if(n&&!obxTick) obxTick=setInterval(obxPaint,15000);
  if(!stuck){ if(el) el.classList.remove('show'); if(!n){ clearInterval(obxTick); obxTick=null; } return; }
  var state='wait';
  if(!el){ el=document.createElement('div'); el.id='tsNet'; el.setAttribute('role','status'); document.body.appendChild(el); }
  var txt='Some charting hasn’t reached the database yet — it’s safe on this computer and will send when the connection is back';
  el.className='show '+state; el.innerHTML='<i></i><span>'+txt+'</span>';
  if(!obxTick) obxTick=setInterval(obxPaint,3000); }
window.addEventListener('online',function(){ obxPaint(); setTimeout(obxReplay,1200); });
window.addEventListener('offline',obxPaint);
/* after sign-in: anything left from last time goes out */
(function wait(){ if(AUTH&&AUTH.currentUser){ setTimeout(function(){ obxPaint(); obxReplay(); },2500); } else setTimeout(wait,1500); })();
setInterval(function(){ if(!document.hidden) obxReplay(); },60000);

/* ═════════ TS SAFETY — duplicate orders · weight changes ═════════
   Duplicate: opening a drug that is already running on the sheet says so at the top of the order window; adding it anyway needs a tick.
   Weight: charting a weight that differs from the dosing weight shows every weight-based dose before and after; a doctor decides
   whether the sheet switches to the new weight (patient.weight). Techs see the same review, read-only, and the header stays amber. */

/* ---------- duplicates ---------- */
function activeSame(name,except){ var l=String(name||'').toLowerCase(); return (ORDERS||[]).filter(function(o){ return o&&!o.dc&&o.id!==except&&o.type==='med'&&String(o.name||'').toLowerCase()===l; }); }
window.tsActiveSame=activeSame;
function orderLine(o){ var d=medDose(o); return esc(d.mg)+(o.route?' '+esc(o.route):'')+(o.freq?' '+esc(o.freq):''); }
on('rx.opened',dupBanner);
function dupBanner(i){ var x=DRUGS&&DRUGS[i]; if(!x||!RX) return; var ex=activeSame(x.n,window._opReplace); RX.dup=ex.length?ex:null; if(!ex.length) return;
  var p=document.querySelector('#tsModal .tm-card > p'); if(!p) return;
  p.insertAdjacentHTML('afterend','<div class="ts-dup" role="alert"><div class="td-h"><svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><b>Already ordered</b></div>'
    +ex.map(function(o){ return '<div class="td-o"><span>'+esc(o.name)+' '+orderLine(o)+'</span><button type="button" onclick="tsDupOpen(\''+esc(o.id)+'\')">View</button></div>'; }).join('')
    +'<label class="td-ok"><input type="checkbox" id="rxDupOk"> Add a second '+esc(x.n)+' order</label></div>'); }
window.tsDupOpen=function(id){ var m=document.getElementById('tsModal'); if(m) m.classList.remove('show'); tsOrderPanel(id); };
on('rx.validate',function(){
  if(RX&&RX.dup&&RX.dup.length&&!(document.getElementById('rxDupOk')||{}).checked){ var b=document.querySelector('#tsModal .ts-dup');
    if(b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); b.scrollIntoView({block:'nearest',behavior:'smooth'}); }
    toast('Already on the sheet — tick “Add a second order” to add it anyway'); return false; } });

/* ---------- weight ---------- */
function isWeightOrder(o){ return !!o&&/^weight$/i.test(String(o.name||'').trim()); }
function kgOf(v){ var s=String(v==null?'':v), m=s.match(/\d+(\.\d+)?/); if(!m) return null; var n=parseFloat(m[0]); if(/lb/i.test(s)) n=n/2.20462; return n>0?Math.round(n*100)/100:null; }
window.tsKgOf=kgOf;
function perWeight(unit){ return /\/(kg|lb|m²)/.test(String(unit||'')); }
/* doses that follow the weight: medications in mg/kg, mg/lb, mg/m² and infusions in …/kg/… */
function weightDoses(kg){ var keep=VISIT.weight, out=[];
  (ORDERS||[]).forEach(function(o){ if(!o||o.dc) return;
    if(o.type==='med'&&perWeight(o.unit)){ var a=medDose(o); VISIT.weight=kg; var b=medDose(o); VISIT.weight=keep;
      out.push({o:o,what:esc(o.dose+' '+o.unit)+(o.route?' '+esc(o.route):'')+(o.freq?' '+esc(o.freq):''),from:a.mg+(o.conc?' · '+a.volume:''),to:b.mg+(o.conc?' · '+b.volume:'')}); }
    else if(o.cont&&window.tsInfRateFor&&o.rate_u&&/\/kg/.test(o.rate_u)){ var x=tsInfRateFor(o,keep), y=tsInfRateFor(o,kg);
      out.push({o:o,what:esc(o.rate_v+' '+o.rate_u),from:x,to:y}); } });
  return out; }
function weightCheck(kg){ var w=Number(VISIT.weight)||0; if(!kg||!CUR) return; if(w&&Math.abs(kg-w)<0.05) return; setTimeout(function(){ tsWeightReview(kg); },380); }
window.tsWeightCheck=weightCheck;
/* any reading charted (drawer, Tasks tab, batch) — a new weight opens the dose review */
on('task.charted',function(t){ var past=window.tsViewDk&&tsViewDk()!==dayKey(); if(t&&!past&&isWeightOrder(t.order)) weightCheck(kgOf(t.value)); });
window.tsWeightReview=function(kg){ kg=Number(kg); if(!(kg>0)||!CUR) return; var w=Number(VISIT.weight)||0, can=canOrderTS(), L=weightDoses(kg);
  var diff=w?kg-w:0, pct=w?diff/w*100:0, big=w&&Math.abs(pct)>=10;
  var fmt=function(n){ return (Math.round(n*100)/100).toString(); };
  var html='<div class="op-head"><span class="op-ic t-wt"><svg viewBox="0 0 24 24" fill="none"><path d="M6 20h12a2 2 0 0 0 2-2l-1.4-9.3A2 2 0 0 0 16.6 7H7.4a2 2 0 0 0-2 1.7L4 18a2 2 0 0 0 2 2Z M9.5 7a2.5 2.5 0 0 1 5 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">'+(w?'Weight changed':'Dosing weight')+'</div><h3>'+esc(VISIT.patient||'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<div class="op-hero"><div class="op-big">'+fmt(kg)+' kg</div>'+(w?'<div class="op-sub">was '+fmt(w)+' kg · '+(diff>0?'+':'−')+fmt(Math.abs(diff))+' kg ('+(diff>0?'+':'−')+Math.abs(pct).toFixed(1)+'%)</div>':'<div class="op-sub">No dosing weight on this sheet yet</div>')+'</div>'
    +(window.tsWtPlausHTML?tsWtPlausHTML(kg,can):'')   /* heavy or light for the breed — pounds typed as kilograms? (store/weight.js) */
    +(big?'<div class="wt-warn">A change of more than 10% — re-weigh to confirm before changing doses.</div>':'')
    +(w?'<p class="op-lead">Doses on this sheet are calculated from <b>'+fmt(w)+' kg</b>.</p>':'')
    +(L.length?'<div class="wt-list">'+L.map(function(r){ return '<div class="wt-row"><div><b>'+esc(r.o.name)+'</b><small>'+r.what+'</small></div><div class="wt-ch"><span>'+esc(r.from)+'</span><i>→</i><b>'+esc(r.to)+'</b></div></div>'; }).join('')+'</div>'
      :'<p class="op-lead">No weight-based doses on this sheet.</p>')
    +(can?'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">'+(w?'Keep '+fmt(w)+' kg':'Not now')+'</button><button type="button" class="op-btn primary" onclick="tsSetDosingWeight('+kg+')">Use '+fmt(kg)+' kg</button></div>'
      :'<p class="op-foot">A doctor decides the dosing weight. Until then the header shows the new weight in amber.</p><div class="op-actions one"><button type="button" class="op-btn" onclick="tsOrderClose()">OK</button></div>');
  opShow(html); };
window.tsSetDosingWeight=function(kg){ if(!CUR||!curDoc||!canOrderTS()) return; var me=user(), now=new Date().toISOString(), w=Number(VISIT.weight)||0, n=weightDoses(kg).length;
  var p=curDoc.patient||(curDoc.patient={}); p.weight=kg; p.weight_at=now; p.weight_by=me.name||me.initials; if(curMain){ curMain.patient=curMain.patient||{}; Object.assign(curMain.patient,{weight:kg,weight_at:now,weight_by:p.weight_by}); }
  VISIT.weight=kg; var s=SHEETS.find(function(x){ return x._id===CUR; }); if(s&&s.patient) s.patient.weight=kg;
  tsOrderClose(); try{ renderSheet(); }catch(e){ try{ buildGrid(); }catch(_){} }
  tsCommit(CUR,{'patient.weight':kg,'patient.weight_at':now,'patient.weight_by':p.weight_by,updated_at:now,updated_by:me.initials,
    audit:U([{at:now,type:'doctor',desc:'Dosing weight — <b>'+kg+' kg</b>'+(w?' (was '+w+' kg)':'')+(n?' · '+n+' dose'+(n>1?'s':'')+' recalculated':''),who:me.initials,uid:me.uid}])}).catch(function(){});
  toast('Dosing weight '+kg+' kg'+(n?' · '+n+' dose'+(n>1?'s':'')+' updated':'')); };

/* ═════════ TS MEDSAFE — the dose bar, 24-hour totals, overlapping drugs, PRN rules and the dose clock ═════════
   In the medication order window (store/rx.js emits rx.opened · rx.calc · rx.validate · rx.build):
   · Dose bar: where the dose sits in the species range for that route (all reference doses for the species, same unit), drawn as a strip.
   · 24-hour total: this order plus every other active order of the same drug (same unit) and its CRI, against the reference daily maximum
     (the top dose × how often the reference allows it). Catches "q4h PRN on top of q8h".
   · Overlap: drugs that shouldn't run together (two NSAIDs, NSAID + steroid, full + partial opioid …). MS_RULES below; a doctor reviews the list.
   · Anything outside the reference needs one tap on a reason; the order keeps it (order.safety) and the tech sees it when giving the dose.
   · PRN: "no more often than" and "give when". A charted reading that meets the trigger (pain score ≥ 3 …) puts the dose on the grid as due
     (order.prn_due), or at the first time it's allowed.
   On the grid: every medication row gets a dose clock (time since the last dose → the next one; PRN: when it can be given again).
   Tap it for the last 24 hours of that drug and, for a PRN, Give now (an early dose needs a reason). */

/* ---------- the reference span for a drug, species, unit and route ---------- */
function msDrug(name){ var l=String(name||'').toLowerCase(); return (DRUGS||[]).find(function(d){ return d.n.toLowerCase()===l; })||null; }
function msSpan(name,unit,route){ var x=msDrug(name), sp=spKey(); if(!x||!unit) return null;
  var L=x.r.filter(function(e){ return e.d&&e.d[0]!=null&&unitOf(e)===unit&&(!sp||e.s.indexOf(sp)>-1); }); if(!L.length) return null;
  var R=route?L.filter(function(e){ return routeOf(e)===route; }):[], use=R.length?R:L, lo=Infinity, hi=0, day=0, minH=null;
  use.forEach(function(e){ var a=+e.d[0], b=e.d[1]!=null?+e.d[1]:a; lo=Math.min(lo,a); hi=Math.max(hi,b);
    if(e.h&&e.h[0]>0){ day=Math.max(day,b*24/Math.min(24,e.h[0])); minH=minH==null?e.h[0]:Math.min(minH,e.h[0]); } else if(e.once) day=Math.max(day,b); });
  return {lo:lo,hi:hi,day:day||null,minH:minH,route:R.length?route:'',sp:sp}; }
window.tsDoseSpan=msSpan;
function msN(n){ return fmtN(+n); }
function msSpWord(sp){ return sp==='cat'?'cat':sp==='dog'?'dog':''; }

/* ---------- doses per day and the 24-hour total of a drug ---------- */
function msPerDay(freq,prnMin){ if(freq==='PRN') return prnMin?Math.max(1,Math.floor(24/prnMin)):0; if(freq==='Once') return 1; var iv=FREQ_INT[freq]; return iv?Math.max(1,Math.floor(24/Math.min(24,iv))):0; }
/* a CRI of the same drug, as an amount per day in the order's unit (mg/kg + mg/kg/hr …) */
function msCriDay(o,unit){ var u=String(o.rate_u||''), b=unit.split('/'), p=u.split('/'); if(!o.cont||Number(o.rate_v)===0) return 0;
  var f=p[0]===b[0]?1:(p[0]==='mcg'&&b[0]==='mg')?0.001:(p[0]==='mg'&&b[0]==='mcg')?1000:null; if(f==null) return 0;
  if(b[1]==='kg'&&p[1]!=='kg') return 0; if(b[1]!=='kg'&&p[1]==='kg') return 0;
  var per=p[p.length-1]; return (Number(o.rate_v)||0)*f*(per==='min'?1440:per==='hr'?24:per==='day'?1:0); }
function msTotal(name,unit,self){ var l=String(name||'').toLowerCase(), skip=window._opReplace, parts=[], tot=0;
  (ORDERS||[]).forEach(function(o){ if(!o||o.dc||o.id===skip||String(o.name||'').toLowerCase().replace(/\s+cri$/,'')!==l) return;
    if(o.cont){ var c=msCriDay(o,unit); if(c){ tot+=c; parts.push({o:o,amt:c,txt:'CRI '+(o.rate_v+' '+o.rate_u)}); } return; }
    if(o.type!=='med'||o.unit!==unit) return; var n=msPerDay(o.freq,o.prn&&o.prn.min); if(!n) return; tot+=n*(+o.dose||0); parts.push({o:o,amt:n*(+o.dose||0),txt:o.dose+' '+o.unit+' '+(o.route||'')+' '+o.freq}); });
  if(self&&self.n){ tot+=self.n*self.dose; }
  return {tot:tot,parts:parts}; }

/* ---------- drugs that shouldn't run together (a doctor reviews this list) ---------- */
var MS_CLASS={
  nsaid:/^(meloxicam|carprofen|robenacoxib|firocoxib|deracoxib|grapiprant|aspirin|ketoprofen|piroxicam)$/,
  steroid:/^(dexamethasone|prednisone|prednisolone|methylprednisolone|hydrocortisone|budesonide|triamcinolone acetonide)$/,
  mu:/^(methadone|hydromorphone|morphine|fentanyl|oxymorphone|hydrocodone|remifentanil|alfentanil)$/,
  partial:/^(buprenorphine|butorphanol)$/,
  benzo:/^(midazolam|diazepam|alprazolam)$/,
  sero:/^(trazodone|tramadol|fluoxetine|sertraline|paroxetine|clomipramine|amitriptyline|doxepin|mirtazapine|selegiline|buspirone)$/,
  clot:/^(heparin|enoxaparin|dalteparin|rivaroxaban|clopidogrel|aspirin)$/,
  amino:/^(gentamicin|amikacin)$/,
  loop:/^(furosemide|torsemide)$/,
  raas:/^(enalapril|benazepril|ramipril|telmisartan|spironolactone|benazepril \/ spironolactone)$/,
  kplus:/^(potassium chloride|potassium gluconate|potassium phosphate|potassium citrate)$/ };
var MS_RULES=[
  {a:'nsaid',b:'nsaid',tone:'crit',t:'Two NSAIDs together — risk of GI ulceration and kidney injury'},
  {a:'nsaid',b:'steroid',tone:'crit',t:'An NSAID with a corticosteroid — risk of GI ulceration and perforation'},
  {a:'steroid',b:'steroid',tone:'warn',t:'Two corticosteroids'},
  {a:'mu',b:'partial',tone:'warn',t:'A partial or mixed opioid can blunt a full mu opioid'},
  {a:'mu',b:'mu',tone:'warn',t:'Two full mu opioids — added sedation and respiratory depression'},
  {a:'benzo',b:'benzo',tone:'warn',t:'Two benzodiazepines'},
  {a:'sero',b:'sero',tone:'warn',t:'Two serotonergic drugs — watch for serotonin syndrome'},
  {a:'clot',b:'clot',tone:'warn',t:'Two drugs that affect clotting — watch for bleeding'},
  {a:'amino',b:'nsaid',tone:'warn',t:'An aminoglycoside with an NSAID — added kidney risk'},
  {a:'amino',b:'loop',tone:'warn',t:'An aminoglycoside with a loop diuretic — added kidney and hearing risk'},
  {a:'raas',b:'kplus',tone:'warn',t:'Potassium with an ACE inhibitor / spironolactone — watch potassium'} ];
function msClasses(name){ var l=String(name||'').toLowerCase().replace(/\s+cri$/,'').replace(/\s*\(.*\)$/,''); return Object.keys(MS_CLASS).filter(function(k){ return MS_CLASS[k].test(l); }); }
function msOverlaps(name){ var mine=msClasses(name), l=String(name||'').toLowerCase(), out=[], seen={}; if(!mine.length) return out;
  (ORDERS||[]).forEach(function(o){ if(!o||o.dc||o.id===window._opReplace||(o.type!=='med'&&!o.cont)) return; var n=String(o.name||''); if(n.toLowerCase()===l) return;   /* the same drug: the duplicate banner */
    var theirs=msClasses(n); MS_RULES.forEach(function(r){ var hit=(mine.indexOf(r.a)>-1&&theirs.indexOf(r.b)>-1)||(mine.indexOf(r.b)>-1&&theirs.indexOf(r.a)>-1); if(!hit||seen[r.t+n]) return; seen[r.t+n]=1; out.push({tone:r.tone,t:r.t,with:n}); }); });
  return out; }
window.tsMsOverlaps=msOverlaps;

/* ---------- the checks for the order being written ---------- */
var MS_WHY=['Per specialist','Titrating to effect','Patient-specific dose','Intended combination','Other'];
function msRead(){ var g=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); };
  return {dose:parseFloat(g('rxDose')),unit:g('rxUnit')||'mg/kg',route:g('rxRoute'),freq:g('rxFreq')}; }
function msChecks(v){ var x=RX&&RX.x; if(!x) return {flags:[],html:''}; var S=msSpan(x.n,v.unit,v.route), flags=[], html='', sp=spKey();
  if(S&&v.dose>0){ var top=Math.max(S.hi*2,v.dose*1.12,S.lo*1.6)||1, pc=function(n){ return Math.max(0,Math.min(100,n/top*100)); };
    var tone=(v.dose<S.lo*0.5-1e-9||v.dose>S.hi*2+1e-9)?'crit':(v.dose<S.lo-1e-9||v.dose>S.hi+1e-9)?'warn':'ok';
    var rng=(S.lo===S.hi?msN(S.lo):msN(S.lo)+'–'+msN(S.hi))+' '+v.unit, who=[msSpWord(S.sp),S.route].filter(Boolean).join(' ');
    var where=tone==='ok'?(S.lo===S.hi?'at the reference dose':((v.dose-S.lo)/(S.hi-S.lo)<1/3?'low end':(v.dose-S.lo)/(S.hi-S.lo)>2/3?'high end':'mid-range')):'';
    var say=tone==='ok'?'In range'+(who?' for '+esc(who):'')+' · '+where
      :(v.dose>S.hi?'Above':'Below')+' the '+(who?esc(who)+' ':'')+'range'+(v.dose>S.hi?' · '+msN(v.dose/S.hi)+'× the top':'');
    if(tone!=='ok') flags.push({k:'range',tone:tone,t:(v.dose>S.hi?'Above':'Below')+' the reference ('+rng+')'});
    var zl=pc(S.lo), zw=Math.max(1.5,pc(S.hi)-zl);
    html+='<div class="ms-bar '+tone+'"><div class="ms-track"><span class="ms-zone" style="left:'+zl+'%;width:'+zw+'%"></span><i class="ms-mk" style="left:'+pc(v.dose)+'%"></i></div>'
      +'<div class="ms-scale"><span style="left:'+zl+'%">'+esc(msN(S.lo))+'</span>'+(S.hi!==S.lo?'<span style="left:'+(zl+zw)+'%">'+esc(msN(S.hi))+'</span>':'')+'</div>'
      +'<div class="ms-say"><b>'+say+'</b><span>Reference '+esc(rng)+'</span></div></div>'; }
  else if(v.dose>0&&x.r.some(function(e){ return e.d&&(!sp||e.s.indexOf(sp)>-1); })&&!S) html+='<div class="ms-line">No '+(sp?msSpWord(sp)+' ':'')+'reference dose in '+esc(v.unit)+' — the range can’t be checked.</div>';
  /* the 24-hour total */
  var per=msPerDay(v.freq,v.freq==='PRN'?RX.prnMin:null);
  if(S&&S.day&&v.dose>0&&per){ var T=msTotal(x.n,v.unit,{n:per,dose:v.dose}), over=T.tot>S.day*1.0001;
    if(over||T.parts.length) html+='<div class="ms-line'+(over?' warn':'')+'"><b>24 h'+(v.freq==='PRN'?' if given as often as allowed':'')+': '+esc(msN(T.tot))+' '+esc(v.unit)+'</b>'
      +(T.parts.length?' · with '+T.parts.map(function(p){ return esc(p.o.name+' '+p.txt.trim()); }).join(', '):'')+' · reference max '+esc(msN(S.day))+' '+esc(v.unit)+'/day</div>';
    if(over) flags.push({k:'day',tone:'warn',t:'24-hour total '+msN(T.tot)+' '+v.unit+' (reference max '+msN(S.day)+')'}); }
  /* overlapping drugs */
  msOverlaps(x.n).forEach(function(f){ flags.push({k:'overlap',tone:f.tone,t:f.t+' ('+f.with+')'});
    html+='<div class="ms-line '+f.tone+'"><b>'+esc(f.t)+'</b> · '+esc(f.with)+' is on the sheet</div>'; });
  /* the weight the doses use */
  var wp=window.tsWtPlaus&&tsWtPlaus(Number(VISIT.weight)||0); if(wp) html+='<div class="ms-line crit"><b>Check the weight</b> · '+esc(wp.t)+'</div>';
  if(flags.length) html+='<div class="ms-why"><div class="ms-why-h">Reason to go ahead</div><div class="rx-chips">'+MS_WHY.map(function(w){ return '<button type="button" class="rx-chip'+(RX.msWhy===w?' on':'')+'" onclick="tsMsWhy(this)">'+esc(w)+'</button>'; }).join('')+'</div>'
    +(RX.msWhy==='Other'?'<input id="msWhyNote" class="ms-note" placeholder="Why this dose?" value="'+esc(RX.msNote||'')+'" oninput="RX.msNote=this.value">':'')+'</div>';
  return {flags:flags,html:html}; }
window.tsMsWhy=function(b){ if(!RX) return; RX.msWhy=RX.msWhy===b.textContent?null:b.textContent; msPaint(); if(RX.msWhy==='Other') setTimeout(function(){ var n=document.getElementById('msWhyNote'); if(n) n.focus(); },20); };
function msPaint(){ var rg=document.getElementById('rxRange'); if(!rg||!RX) return; var v=msRead(); if(v.freq==='PRN') prnDefault(v); var c=msChecks(v); RX.msFlags=c.flags;
  rg.innerHTML=c.html; rg.style.display=c.html?'block':'none'; rg.className='rx-range ms'+(c.flags.some(function(f){ return f.tone==='crit'; })?' crit':c.flags.length?' warn':'');
  prnPaint(v); try{ if(window.tsOcFoot) tsOcFoot(); }catch(e){} }
on('rx.calc',msPaint);
on('rx.opened',function(){ if(!RX) return; RX.msWhy=null; RX.msNote=''; RX.prnMin=null; RX.prnWhen=null; RX.prnText='';
  var f=document.getElementById('rxFreq'); if(f&&!f._ms){ f._ms=1; f.addEventListener('change',function(){ try{ tsRxCalc(); }catch(e){} }); } });
on('rx.validate',function(){ if(!RX) return;
  if(RX.msFlags&&RX.msFlags.length&&(!RX.msWhy||(RX.msWhy==='Other'&&!String(RX.msNote||'').trim()))){ var b=document.querySelector('#tsModal .ms-why');
    if(b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); b.scrollIntoView({block:'nearest',behavior:'smooth'}); }
    toast(RX.msWhy==='Other'?'Say why in a few words':'Choose a reason to go ahead'); return false; }
  if(msRead().freq==='PRN'){ if(!RX.prnMin){ toast('Choose how often the PRN can be given'); return false; }
    if(!RX.prnWhen&&!String(RX.prnText||'').trim()){ var p=document.querySelector('#tsModal .ms-prn'); if(p){ p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); } toast('Say when to give it'); return false; } } });
on('rx.build',function(o){ var me=user(), now=new Date().toISOString();
  if(RX&&RX.msFlags&&RX.msFlags.length){ o.safety={flags:RX.msFlags.map(function(f){ return f.t; }),tone:RX.msFlags.some(function(f){ return f.tone==='crit'; })?'crit':'warn',
      reason:RX.msWhy==='Other'?String(RX.msNote||'').trim():RX.msWhy,by:me.initials,by_name:me.name||null,at:now};
    logEvent('doctor','Dose check — <b>'+esc(o.name)+'</b>: '+esc(o.safety.flags.join('; '))+' · '+esc(o.safety.reason),me.initials); }
  if(o.freq==='PRN'&&RX){ var w=PRN_WHEN.find(function(x){ return x.l===RX.prnWhen; }); o.prn={min:RX.prnMin,when:RX.prnWhen==='Other'||!RX.prnWhen?String(RX.prnText||'').trim():RX.prnWhen,trig:w&&w.rx?{rx:w.rx,op:w.op,v:w.v==null?null:w.v}:null}; } });

/* ---------- PRN: how often, and when ---------- */
var PRN_EVERY=[1,2,4,6,8,12,24];
var PRN_WHEN=[{l:'Pain score ≥ 2',rx:'^pain',op:'>=',v:2},{l:'Pain score ≥ 3',rx:'^pain',op:'>=',v:3},{l:'Vomiting',rx:'vomit',op:'yes'},{l:'Nausea signs',rx:'nausea',op:'yes'},
  {l:'Temp ≥ 103.5 °F',rx:'^temp',op:'>=',v:103.5},{l:'Seizure'},{l:'Anxious / agitated'},{l:'Other'}];
/* the shortest interval the reference allows for this species (and route, when it lists one) — doses with or without a number */
function msMinH(name,route){ var x=msDrug(name), sp=spKey(); if(!x) return null; var L=x.r.filter(function(e){ return e.h&&e.h[0]>0&&(!sp||e.s.indexOf(sp)>-1); }), R=route?L.filter(function(e){ return routeOf(e)===route; }):[];
  return (R.length?R:L).reduce(function(m,e){ return m==null?e.h[0]:Math.min(m,e.h[0]); },null); }
function prnDefault(v){ if(RX.prnMin!=null) return; var m=msMinH(RX.x.n,v.route); RX.prnMin=m&&PRN_EVERY.indexOf(m)>-1?m:4; RX.prnAuto=!!(m&&PRN_EVERY.indexOf(m)>-1); }
function prnPaint(v){ var el=document.getElementById('rxPrn'); if(!el||!RX) return; if(v.freq!=='PRN'){ el.innerHTML=''; el.style.display='none'; return; }
  prnDefault(v);
  var h='<div class="ms-prn"><div class="rx-lbl">No more often than'+(RX.prnAuto?' · from the reference':'')+'</div><div class="rx-chips">'
    +PRN_EVERY.map(function(n){ return '<button type="button" class="rx-chip'+(RX.prnMin===n?' on':'')+'" onclick="tsPrnEvery('+n+')">q'+n+'h</button>'; }).join('')+'</div>'
    +'<div class="rx-lbl">Give when</div><div class="rx-chips">'+PRN_WHEN.map(function(w){ return '<button type="button" class="rx-chip'+(RX.prnWhen===w.l?' on':'')+'" onclick="tsPrnWhen(this)">'+esc(w.l)+'</button>'; }).join('')+'</div>'
    +(RX.prnWhen==='Other'?'<input id="prnText" class="ms-note" placeholder="Give when…" value="'+esc(RX.prnText||'')+'" oninput="RX.prnText=this.value">':'')
    +((PRN_WHEN.find(function(w){ return w.l===RX.prnWhen; })||{}).rx?'<div class="ms-line ok">Charting a reading that meets this puts the dose on the sheet as due.</div>':'')+'</div>';
  el.innerHTML=h; el.style.display='block'; }
window.tsPrnEvery=function(n){ if(!RX) return; RX.prnMin=n; RX.prnAuto=false; msPaint(); };
window.tsPrnWhen=function(b){ if(!RX) return; var l=b.textContent; RX.prnWhen=RX.prnWhen===l?null:l; msPaint(); if(RX.prnWhen==='Other') setTimeout(function(){ var n=document.getElementById('prnText'); if(n) n.focus(); },20); };

/* ---------- doses given: this drug, today and yesterday (saved charting + anything charted this second) ---------- */
function msNowMs(){ return dkDate(dayKey()).getTime()+nowMin()*60000; }
function msSameDrug(name){ var l=String(name||'').toLowerCase(), ids={}; (ORDERS||[]).concat(Object.keys((curDoc&&curDoc.orders)||{}).map(function(k){ return curDoc.orders[k]; }))
  .forEach(function(o){ if(o&&o.type==='med'&&String(o.name||'').toLowerCase()===l) ids[o.id]=o; }); return ids; }
function msGiven(name){ var ids=msSameDrug(name), out=[], seen={}, today=dayKey(), t0=dkDate(today).getTime();
  (TASKS||[]).forEach(function(t){ if(t.status!=='completed'||!ids[t.orderId]) return; var ms=t0+(t.completedMin!=null?t.completedMin:t.sched)*60000; if(t.key) seen[t.key]=1;
    out.push({at:ms,by:t.by||'',o:ids[t.orderId],notes:t.notes||'',given:t.given||null}); });
  var M=(curDoc&&curDoc.marks)||{}; Object.keys(M).forEach(function(k){ var m=M[k]; if(seen[k]||!m||m.status!=='completed'||!ids[m.orderId]) return; var dk=k.slice(0,8); if(dk===today) return;
    out.push({at:dkDate(dk).getTime()+(m.min!=null?m.min:(m.sched||0))*60000,by:m.by||'',o:ids[m.orderId],notes:m.notes||'',given:m.given||null}); });
  return out.sort(function(a,b){ return b.at-a.at; }); }
window.tsMsGiven=msGiven;
function msPrnMin(o){ return (o&&o.prn&&o.prn.min)||null; }
function msAgo(ms){ var m=Math.max(0,Math.round(ms/60000)); if(m<1) return 'just now'; if(m<60) return m+' min'; var h=Math.floor(m/60), r=m%60; return h+' h'+(r?' '+r+' m':''); }
function msClock(ms){ var d=new Date(ms), a=new Date(); a.setHours(0,0,0,0); var day=Math.floor((new Date(d).setHours(0,0,0,0)-a)/86400000);
  return (day===0?'':day===-1?'yesterday ':day===1?'tomorrow ':(d.getMonth()+1)+'/'+d.getDate()+' ')+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }
function msAgoTxt(ms){ var t=msAgo(ms); return t==='just now'?t:t+' ago'; }
/* the state of one order's clock */
function msState(o){ var now=msNowMs(), G=msGiven(o.name), last=G[0]||null, t0=dkDate(dayKey()).getTime(), st={last:last,given:G,now:now};
  if(o.freq==='PRN'){ var mh=msPrnMin(o); st.prn=true; st.min=mh; st.next=last&&mh?last.at+mh*3600000:null; st.ok=!st.next||st.next<=now; st.span=mh?mh*3600000:null; }
  else { var open=(TASKS||[]).filter(function(t){ return t.orderId===o.id&&!t.status; }).sort(function(a,b){ return a.sched-b.sched; });
    var nx=open.find(function(t){ return t0+t.sched*60000>=now-18*60000; })||null; st.next=nx?t0+nx.sched*60000:null; st.late=open.some(function(t){ return t0+t.sched*60000<now-18*60000; });
    var iv=FREQ_INT[o.freq]; st.span=iv?iv*3600000:(last&&st.next?st.next-last.at:null); }
  var day=G.filter(function(g){ return g.at>now-86400000; }); st.day=day;
  return st; }
window.tsMsState=msState;

/* ---------- the dose clock on the grid ---------- */
function msRing(frac,tone,label){ var r=8, c=2*Math.PI*r, f=Math.max(0,Math.min(1,frac||0));
  return '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="'+r+'" class="dc-bg"/>'+(f>0?'<circle cx="11" cy="11" r="'+r+'" class="dc-fg" stroke-dasharray="'+(c*f).toFixed(2)+' '+c.toFixed(2)+'" transform="rotate(-90 11 11)"/>':'')+'</svg>'+(label?'<b>'+label+'</b>':''); }
function msShort(ms){ var m=Math.max(0,Math.round(ms/60000)); return m<60?m+'m':Math.round(m/60)+'h'; }
function msTip(o,s){ var tone='', frac=0, lbl='', tip='';
  var lastT=s.last?'Last given '+msClock(s.last.at)+' ('+msAgoTxt(s.now-s.last.at)+(s.last.by?', '+s.last.by:'')+')':'Not given yet';
  if(s.prn){ if(!s.last){ tone='ok'; frac=1; tip=lastT+' · can give'; }
    else if(s.ok){ tone='ok'; frac=1; tip=lastT+' · can give again now'; }
    else { tone='wait'; frac=s.span?(s.now-s.last.at)/s.span:0; lbl=msShort(s.next-s.now); tip=lastT+' · can give again '+msClock(s.next)+' (in '+msAgo(s.next-s.now)+')'; } }
  else { if(s.late){ tone='late'; frac=1; tip=lastT+' · a dose is overdue'; }
    else if(s.next){ var a=s.last?s.last.at:s.next-(s.span||3600000); frac=(s.now-a)/Math.max(1,s.next-a); tone=s.next-s.now<=18*60000?'due':''; lbl=s.next-s.now<=18*60000?'':msShort(s.next-s.now); tip=lastT+' · next '+msClock(s.next)+(s.next>s.now?' (in '+msAgo(s.next-s.now)+')':' (due)'); }
    else { tone='done'; frac=s.last?1:0; tip=lastT+' · nothing more today'; } }
  return {tone:tone,frac:frac,lbl:lbl,tip:tip}; }
window.tsDoseClock=function(o){ if(!o||o.type!=='med'||o.dc||o.draft||!curDoc||(window.tsViewDk&&tsViewDk()!==dayKey())) return ''; var s=msState(o), k=msTip(o,s);
  return '<button type="button" class="dose-clock '+k.tone+'" onclick="event.stopPropagation();tsDoseOpen(\''+esc(o.id)+'\')" title="'+esc(k.tip)+'" aria-label="'+esc(o.name+' — '+k.tip)+'">'+msRing(k.frac,k.tone,k.lbl)+'</button>'; };
/* the Latest column on a medication row: the last dose given and how long ago (opens the dose panel) */
window.tsMedLatest=function(o){ if(!o||o.type!=='med'||o.draft||!curDoc||(window.tsViewDk&&tsViewDk()!==dayKey())) return ''; var s=msState(o), k=msTip(o,s), L=s.last;
  /* never given: say what's next — "Not given · Due 2 PM", "Due in 12 min", "Due now" (store/rowlook.js tsNextDue) */
  var nd=!L&&!s.prn&&window.tsNextDue?tsNextDue(o):null;
  var v=L?(L.given||medDose(L.o||o).mg):'Not given', d=L?Math.max(0,s.now-L.at):0, age=!L?(s.prn?'Can give':nd?nd.txt:''):d<9e4?'just now':d<36e5?Math.round(d/6e4)+' min ago':d<864e5?Math.floor(d/36e5)+' h ago':Math.floor(d/864e5)+' d ago';
  return '<button type="button" class="rl-trend rl-med dose-clock '+k.tone+(L?'':' none')+'" onclick="event.stopPropagation();tsDoseOpen(\''+esc(o.id)+'\')" title="'+esc(k.tip)+'" aria-label="'+esc(o.name+' — '+k.tip)+'"><span class="rt-v"><b>'+esc(v)+'</b></span>'+(age?'<small'+(nd?' class="rl-due '+nd.cls+'"':'')+'>'+esc(age)+'</small>':'')+'</button>'; };

/* ---------- the dose panel: last 24 hours of this drug, and Give now for a PRN ---------- */
var MS_EARLY=['Doctor approved','Pain not controlled — doctor aware','Other'];
window.tsDoseOpen=function(id,early){ var o=orderById(id)||oFind(id); if(!o) return; var s=msState(o), S=msSpan(o.name,o.unit,o.route), past=window.tsViewDk&&tsViewDk()!==dayKey();
  var dayAmt=s.day.reduce(function(a,g){ return a+(g.o.unit===o.unit?(+g.o.dose||0):0); },0), over=S&&S.day&&dayAmt>S.day*1.0001;
  var hero=s.last?'<div class="op-big">'+esc(msAgoTxt(s.now-s.last.at).replace(/^./,function(c){ return c.toUpperCase(); }))+'</div><div class="op-sub">Last given '+esc(msClock(s.last.at))+(s.last.by?' by '+esc(s.last.by):'')+'</div>'
    :'<div class="op-big">Not given yet</div>';
  var status='';
  if(s.prn) status=s.ok?'<div class="dc-say ok">Can give now</div>':'<div class="dc-say wait">Can give again at <b>'+esc(msClock(s.next))+'</b> · in '+esc(msAgo(s.next-s.now))+'</div>';
  else if(s.late) status='<div class="dc-say late">A dose is overdue</div>';
  else if(s.next) status='<div class="dc-say">Next <b>'+esc(msClock(s.next))+'</b>'+(s.next>s.now?' · in '+esc(msAgo(s.next-s.now)):' · due now')+'</div>';
  var rule=o.prn?'<div class="op-row"><span>PRN</span><b>'+(o.prn.min?'q'+o.prn.min+'h at most':'')+(o.prn.when?(o.prn.min?' · ':'')+'give when '+esc(o.prn.when.charAt(0).toLowerCase()+o.prn.when.slice(1)):'')+'</b></div>':'';
  var list=s.day.length?'<div class="rx-lbl op-lbl">Last 24 hours · '+s.day.length+' dose'+(s.day.length>1?'s':'')+(o.unit?' · '+esc(msN(dayAmt))+' '+esc(o.unit)+(S&&S.day?' of '+esc(msN(S.day))+' max':''):'')+'</div>'
    +'<div class="op-list">'+s.day.map(function(g){ return '<div class="op-row"><span>'+esc(msClock(g.at))+'</span><b>'+esc(g.o.dose+' '+g.o.unit+' '+(g.o.route||'')+' · '+g.o.freq)+(g.by?' · '+esc(g.by):'')+(g.notes?'<small> — '+esc(g.notes)+'</small>':'')+'</b></div>'; }).join('')+'</div>'
    :'<p class="op-lead">No doses of '+esc(o.name)+' in the last 24 hours.</p>';
  var act='', can=canChart()&&!past&&!o.dc&&o.freq==='PRN';
  if(can){ var need=!s.ok||over||(S&&S.day&&dayAmt+(+o.dose||0)>S.day*1.0001);
    if(need&&!early) act='<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button><button type="button" class="op-btn" onclick="tsDoseOpen(\''+esc(o.id)+'\',1)">Give early…</button></div>';
    else if(need) act='<div class="ms-why"><div class="ms-why-h">'+(!s.ok?'Before the allowed time':'Over the 24-hour maximum')+' — reason</div><div class="rx-chips">'+MS_EARLY.map(function(w){ return '<button type="button" class="rx-chip" onclick="tsDoseWhy(this)">'+esc(w)+'</button>'; }).join('')+'</div><input id="dcWhyNote" class="ms-note" placeholder="Note (required for Other)" style="display:none"></div>'
      +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsDoseOpen(\''+esc(o.id)+'\')">Back</button><button type="button" class="op-btn primary" onclick="tsDoseGive(\''+esc(o.id)+'\',1)">Give now</button></div>';
    else act='<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button><button type="button" class="op-btn primary" onclick="tsDoseGive(\''+esc(o.id)+'\')">Give now</button></div>'; }
  else act='<div class="op-actions one"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button></div>';
  var html='<div class="op-head"><span class="op-ic t-med"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 9v4l2.5 2M10 2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">Dose clock · '+esc(medDose(o).mg)+' '+esc(o.route||'')+' '+esc(o.freq||'')+'</div><h3>'+esc(o.name)+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<div class="op-hero">'+hero+status+'</div>'+(o.safety?msSafetyHTML(o):'')+(rule?'<div class="op-list">'+rule+'</div>':'')+list+act;
  opShow(html); window._dcWhy=null; };
window.tsDoseWhy=function(b){ document.querySelectorAll('#tsOrderSheet .ms-why .rx-chip').forEach(function(x){ x.classList.toggle('on',x===b); }); window._dcWhy=b.textContent;
  var n=document.getElementById('dcWhyNote'); if(n){ n.style.display=window._dcWhy==='Other'?'block':'none'; if(window._dcWhy==='Other') n.focus(); } };
window.tsDoseGive=function(id,early){ var o=orderById(id); if(!o||!canChart()) return; var me=user(), n=nowMin(), why='';
  if(early){ why=window._dcWhy||''; if(why==='Other') why=((document.getElementById('dcWhyNote')||{}).value||'').trim(); if(!why){ toast('Choose a reason'); return; } }
  var t=(TASKS||[]).find(function(x){ return x.orderId===id&&x.prnDue&&!x.status; });
  if(!t){ var key=dayKey()+'_'+id+'_x'+Math.round(n), k=key, i=1; while((TASKS||[]).some(function(x){ return x.key===k; })) k=key+'_'+(i++);   /* two doses in one minute keep both */
    t={id:k,key:k,orderId:id,order:o,sched:Math.round(n),severity:0}; TASKS.push(t); }
  t.status='completed'; t.completedMin=n; t.by=me.initials||null; t.notes=why?'Early dose — '+why:null;
  logEvent('med','<b>'+esc(o.name)+'</b> '+esc(medDose(o).mg)+' '+esc(o.route||'')+' PRN given'+(why?' early — '+esc(why):''),me.initials);
  tsOrderClose(); sync(); emit('task.charted',t); try{ buildGrid(); }catch(e){} toast(esc(o.name)+' given'); };

/* what the doctor said about an out-of-range dose: the order panel, the dose panel and the completion drawer show it */
function msSafetyHTML(o){ var s=o.safety; if(!s) return ''; return '<div class="ms-note-card '+(s.tone||'warn')+'"><b>Dose check</b><span>'+esc((s.flags||[]).join(' · '))+'</span><small>'+esc(s.reason||'')+(s.by_name||s.by?' — '+esc(s.by_name||s.by):'')+'</small></div>'; }
window.tsMsSafetyHTML=msSafetyHTML;
window.tsMsPanelRows=function(o){ if(!o||o.type!=='med') return ''; var s=msState(o), r='';
  r+='<div class="op-row"><span>Last given</span><b>'+(s.last?esc(msClock(s.last.at))+' · '+esc(msAgoTxt(s.now-s.last.at))+(s.last.by?' · '+esc(s.last.by):''):'Not yet')+'</b></div>';
  if(o.prn) r+='<div class="op-row"><span>PRN</span><b>'+(o.prn.min?'q'+o.prn.min+'h at most':'')+(o.prn.when?' · when '+esc(o.prn.when.charAt(0).toLowerCase()+o.prn.when.slice(1)):'')+'</b></div>';
  return r; };
/* the completion drawer: before giving a dose */
window.tsCdExtra=function(t){ var o=t&&t.order; if(!o||o.type!=='med') return ''; var s=msState(o), h='';
  if(o.safety) h+=msSafetyHTML(o);
  if(!t.status) h+='<div class="ms-cd">'+(s.last?'Last '+esc(o.name)+' '+esc(msClock(s.last.at))+' · '+esc(msAgoTxt(s.now-s.last.at))+(s.last.by?' ('+esc(s.last.by)+')':''):'First dose of '+esc(o.name))+(t.prnDue&&o.prn_due&&o.prn_due.why?' · due because '+esc(o.prn_due.why):'')+'</div>';
  return h; };

/* ---------- give-when: a reading that meets a PRN's trigger puts the dose on the sheet ---------- */
function msMeets(tr,val){ var s=String(val==null?'':val).trim(); if(!s) return false;
  if(tr.op==='yes') return !/^(no|none|neg|negative|0|-|n|nad|wnl|normal)$/i.test(s);
  var m=s.match(/-?\d+(\.\d+)?/); if(!m) return false; var n=parseFloat(m[0]); return tr.op==='>='?n>=tr.v:tr.op==='<='?n<=tr.v:false; }
on('task.charted',function(t){ if(!t||!t.order||t.order.type==='med'||(window.tsViewDk&&tsViewDk()!==dayKey())) return; var nm=String(t.order.name||''), me=user();
  (ORDERS||[]).forEach(function(o){ if(!o||o.dc||o.type!=='med'||o.freq!=='PRN'||!o.prn||!o.prn.trig) return; var tr=o.prn.trig;
    try{ if(!new RegExp(tr.rx,'i').test(nm)) return; }catch(e){ return; } if(!msMeets(tr,t.value)) return;
    var s=msState(o), pending=o.prn_due&&new Date(o.prn_due.at).getTime()>(s.last?s.last.at:0); if(pending) return;
    var at=s.ok?s.now:s.next, why=nm+' '+t.value+' at '+fmtTime(nowMin());
    updateOrder(o.id,{prn_due:{at:new Date(at).toISOString(),why:why,by:me.initials||null}});
    logEvent('med','<b>'+esc(o.name)+'</b> PRN '+(s.ok?'due':'scheduled '+esc(msClock(at)))+' — '+esc(why),me.initials);
    toast(esc(nm)+' '+esc(t.value)+' → '+esc(o.name)+' PRN '+(s.ok?'is due':'at '+esc(msClock(at))+' (earliest allowed)')); }); });
/* the due PRN dose as a task on today's grid, until a dose of that drug is given after it */
on('tasks.built',function(){ if(!curDoc||(window.tsViewDk&&tsViewDk()!==dayKey())) return; var dk=dayKey(), t0=dkDate(dk).getTime();
  (ORDERS||[]).forEach(function(o){ if(!o||o.dc||o.type!=='med'||o.freq!=='PRN'||!o.prn_due) return; var at=new Date(o.prn_due.at).getTime(); if(isNaN(at)||at<t0||at>=t0+86400000) return;
    var min=Math.round((at-t0)/60000), key=dk+'_'+o.id+'_q'+min; if(TASKS.some(function(t){ return t.key===key; })) return;
    if(msGiven(o.name).some(function(g){ return g.at>=at-60000; })) return;
    TASKS.push({id:key,key:key,orderId:o.id,order:o,sched:min,status:null,by:null,completedMin:null,value:null,notes:null,severity:0,prnDue:true}); }); });
/* ═════════ TS WEIGHT — is this weight believable, how old is it, and a daily weigh-in ═════════
   · Plausibility: the weight against the breed's usual adult range (WT_DOG / WT_CAT, approximate breed-standard weights) or, with no breed
     match, the species. Far outside it — and especially when the number makes sense as pounds — the header, the dose review and the
     medication order window say so ("40 kg is heavy for a Domestic Shorthair — if 40 was pounds, that's 18.1 kg"). Puppies and kittens
     are only checked for being too heavy. A doctor can switch the dosing weight in one tap; nothing changes on its own.
   · Age: the header's weight says when it was taken; older than a day it asks for a weigh-in.
   · Daily weigh-in: an inpatient sheet without a Weight order gets one (q24h at 8 AM, order id auto_weight). Stopped by a doctor, it stays stopped. */
var WT_DOG=[
  [['chihuahua'],1.5,3],[['yorkshire terrier','yorkie'],2,3.5],[['pomeranian'],1.5,3.5],[['maltese'],2,4],[['toy poodle'],2,4],[['papillon'],2,4.5],
  [['italian greyhound'],3,7],[['havanese'],3,6],[['shih tzu'],4,7.5],[['miniature poodle'],4.5,7.5],[['lhasa apso'],5,8],[['bichon','bichon frise'],5,8],
  [['cavalier','cavalier king charles spaniel'],5.5,8.5],[['pug'],6,8.5],[['cairn terrier'],6,8],[['jack russell','jack russell terrier','parson russell terrier'],6,8],
  [['west highland white terrier','westie'],6.5,9],[['miniature schnauzer'],5,9],[['dachshund'],3.5,14.5],[['miniature dachshund'],3.5,5.5],[['boston terrier'],5,11],
  [['shetland sheepdog','sheltie'],6,12],[['shiba inu'],7,11],[['scottish terrier'],8,10],[['french bulldog'],8,13],[['beagle'],9,14],[['whippet'],9,19],
  [['cocker spaniel','american cocker spaniel','english cocker spaniel'],10,15],[['corgi','pembroke welsh corgi','cardigan welsh corgi'],10,17],
  [['staffordshire bull terrier'],11,17],[['border collie'],12,20],[['brittany'],14,18],[['pit bull','american pit bull terrier','pitbull'],14,27],
  [['australian cattle dog','blue heeler','heeler'],15,22],[['siberian husky','husky'],16,27],[['australian shepherd','aussie'],16,32],[['samoyed'],16,30],
  [['bulldog','english bulldog'],18,25],[['english springer spaniel','springer spaniel'],18,25],[['basset hound'],18,29],[['shar pei','chinese shar pei'],18,27],
  [['american staffordshire terrier'],18,32],[['standard poodle'],18,32],[['airedale terrier','airedale'],18,29],[['belgian malinois','malinois'],18,36],
  [['chow chow','chow'],20,32],[['vizsla'],20,30],[['german shorthaired pointer'],20,32],[['bull terrier'],22,32],[['german shepherd','german shepherd dog','gsd'],22,40],
  [['labrador retriever','labrador','lab'],25,36],[['golden retriever','golden'],25,34],[['boxer'],25,32],[['weimaraner'],25,40],[['doberman','doberman pinscher'],27,45],
  [['greyhound'],27,40],[['rhodesian ridgeback'],29,39],[['bernese mountain dog','bernese'],32,52],[['akita'],32,59],[['alaskan malamute','malamute'],32,43],
  [['rottweiler'],35,60],[['bloodhound'],36,50],[['great pyrenees'],39,60],[['cane corso'],40,55],[['bullmastiff'],45,60],[['newfoundland'],45,70],
  [['dogue de bordeaux'],45,65],[['great dane'],50,80],[['saint bernard','st bernard'],54,82],[['mastiff','english mastiff'],54,100]];
var WT_CAT=[
  [['domestic shorthair','dsh','domestic medium hair','dmh','domestic longhair','dlh','domestic'],2.5,7.5],[['siamese'],2.5,5.5],[['devon rex'],2.5,4.5],[['scottish fold'],2.5,6],
  [['abyssinian'],3,5],[['russian blue'],3,5.5],[['sphynx'],3,5.5],[['persian'],3,6.5],[['himalayan'],3,6.5],[['bengal'],3.5,7],[['british shorthair'],3.5,8],
  [['savannah'],3.5,11],[['ragdoll'],4.5,9],[['norwegian forest cat','norwegian forest'],4,9],[['maine coon'],4,11]];
var WT_LB=2.20462;
function wtTitle(k){ return k.length<=4?k.toUpperCase():k.replace(/\b[a-z]/g,function(c){ return c.toUpperCase(); }); }
function wtYoung(){ var a=String(VISIT.age||'').toLowerCase(); if(!a||a==='—') return false; var n=parseFloat(a);
  if(/(wk|week|mo|month)/.test(a)&&!/(\d\s*(y|yr|yrs|year))/.test(a)) return true; return /(y|yr|year)/.test(a)&&n<1; }
function wtRange(){ var sp=spKey(); if(!sp) return null; var b=' '+String(VISIT.breed||'').toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim()+' ', T=sp==='cat'?WT_CAT:WT_DOG, best=null;
  T.forEach(function(r){ r[0].forEach(function(k){ if(b.indexOf(' '+k+' ')>-1&&(!best||k.length>best.k.length)) best={k:k,lo:r[1],hi:r[2],name:wtTitle(r[0][0])}; }); });
  return best||(sp==='cat'?{lo:1.8,hi:8,name:'a cat',species:true}:{lo:1,hi:90,name:'a dog',species:true}); }
/* null when the weight is believable; otherwise what to say and the likely real weight */
window.tsWtPlaus=function(kg){ kg=Number(kg)||0; if(!(kg>0)) return null; var R=wtRange(); if(!R) return null; var young=wtYoung();
  var heavy=R.species?kg>R.hi*1.4:kg>R.hi*1.6, light=!young&&(R.species?kg<R.lo*0.6:kg<R.lo*0.55); if(!heavy&&!light) return null;
  var fmt=function(n){ return (Math.round(n*10)/10).toString(); }, usual=R.species?'':' (usually '+fmt(R.lo)+'–'+fmt(R.hi)+' kg)';
  var fix=null, how='', a=kg/WT_LB, b=kg*WT_LB;
  if(heavy&&a>=R.lo*0.7&&a<=R.hi*1.35){ fix=Math.round(a*10)/10; how='if '+fmt(kg)+' was pounds, that’s '+fmt(fix)+' kg'; }
  else if(light&&b>=R.lo*0.7&&b<=R.hi*1.35){ fix=Math.round(b*10)/10; how='converted twice? '+fmt(kg)+' × 2.2 = '+fmt(fix)+' kg'; }
  return {tone:'crit',fix:fix,short:fix?(heavy?fmt(kg)+' lb?':'× 2.2?'):(heavy?'heavy for breed':'light for breed'),
    t:fmt(kg)+' kg is '+(heavy?'heavy':'light')+' for '+R.name+usual+(how?' — '+how:'')}; };
window.tsWtPlausHTML=function(kg,can){ var p=tsWtPlaus(kg); if(!p) return '';
  return '<div class="wt-plaus"><div><b>Check this weight</b><span>'+esc(p.t)+'</span></div>'+(p.fix&&can?'<button type="button" class="op-btn" onclick="tsSetDosingWeight('+p.fix+')">Use '+p.fix+' kg</button>':'')+'</div>'; };
/* from the header: the same check with the choice */
window.tsWtCheckOpen=function(){ var kg=Number(VISIT.weight)||0, p=tsWtPlaus(kg); if(!p) return; var can=canOrderTS();
  var html='<div class="op-head"><span class="op-ic t-wt"><svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">Check the weight</div><h3>'+esc(VISIT.patient||'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<div class="op-hero"><div class="op-big">'+kg+' kg</div><div class="op-sub">'+esc([VISIT.breed!=='—'?VISIT.breed:'',VISIT.age!=='—'?VISIT.age:''].filter(Boolean).join(' · '))+'</div></div>'
    +'<p class="op-lead">'+esc(p.t)+'. Every dose on this sheet is calculated from this weight.</p>'
    +(can?'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Keep '+kg+' kg</button>'+(p.fix?'<button type="button" class="op-btn primary" onclick="tsSetDosingWeight('+p.fix+')">Use '+p.fix+' kg</button>':'')+'</div>'
      :'<p class="op-foot">A doctor decides the dosing weight. Re-weigh, then chart the Weight.</p><div class="op-actions one"><button type="button" class="op-btn" onclick="tsOrderClose()">OK</button></div>');
  opShow(html); };
/* when the dosing weight was taken (a reading that matches it, the time it was set, or admission) */
window.tsWtAt=function(d){ d=d||curDoc; if(!d) return null; var kg=Number(VISIT.weight)||0, p=d.patient||{}, R=[]; try{ R=readings(d,/^weight$/i); }catch(e){}
  for(var i=R.length-1;i>=0;i--){ var v=parseFloat((String(R[i].v).match(/\d+(\.\d+)?/)||[])[0]); if(Math.abs(v-kg)<0.05) return R[i].at; }
  return p.weight_at||d.admitted_at||d.created_at||null; };
window.tsWtAgeH=function(d){ var at=tsWtAt(d); if(!at) return null; var h=(Date.now()-new Date(at))/3600000; return isNaN(h)?null:h; };

/* ---------- the daily weigh-in ---------- */
var wtAsked={};
function wtDaily(){ if(!CUR||!curDoc||wtAsked[CUR]||(window.tsViewDk&&tsViewDk()!==dayKey())||!canChart()) return; if(typeof dayReady==='function'&&!dayReady()) return; wtAsked[CUR]=1;
  if(curDoc.board==='OP'||(curDoc.orders||{}).auto_weight) return;
  if((ORDERS||[]).some(function(o){ return o&&!o.dc&&/^weight$/i.test(String(o.name||'').trim()); })) return;
  var age=tsWtAgeH(), now=new Date().toISOString(), me=user();
  var o={id:'auto_weight',type:'obs',section:'Basic Observation',name:'Weight',unit:'kg',freq:'q24h',start:8,auto:true,ordered_by:'Auto',ordered_by_name:'Daily weigh-in',ordered_at:now};
  if(age!=null&&age<12) o.not_before=now;   /* weighed recently: the first weigh-in is tomorrow morning */
  logEvent('care','Daily weigh-in added — <b>Weight</b> q24h at 8:00 AM',me.initials); addOrders([o]); }
on('rendered',function(){ setTimeout(wtDaily,600); });
window.tsWtDaily=function(again){ if(again&&CUR) delete wtAsked[CUR]; wtDaily(); };
/* ═════════ TS FLUIDS — IV fluids and CRIs as first-class orders ═════════
   An infusion is one order (type 'fluid', cont: true, kind 'fluid' | 'cri') with its whole rate history:
     rates: [{at, v, u, by}] — every rate the doctor set, oldest first; rate_v / rate_u = the current one
   Fluids run in mL/hr or mL/kg/hr; CRIs in mcg/kg/hr, mcg/kg/min, mg/kg/hr, mg/kg/day, U/kg/hr or mEq/kg/hr with the bag/syringe
   concentration, so the pump rate (mL/hr) is always shown. Per-kg rates follow the dosing weight, like medication doses.
   The grid draws the infusion as a bar with the rate written where it changes; the section header adds up today's volume. */
var FLUIDS=['Lactated Ringer’s (LRS)','Plasma-Lyte A','Normosol-R','0.9% NaCl','0.45% NaCl + 2.5% dextrose','D5W'];
var FLUID_KEYS=' lrs lactated ringers plasma-lyte plasmalyte normosol saline nacl sodium chloride d5w dextrose fluid fluids iv fluids crystalloid maintenance ';
var ADDITIVES=['KCl 20 mEq/L','KCl 30 mEq/L','KCl 40 mEq/L','Dextrose 2.5%','Dextrose 5%','B vitamins'];
var CRI_DRUGS=[['Fentanyl','mcg/kg/hr'],['Hydromorphone','mg/kg/hr'],['Methadone','mg/kg/hr'],['Butorphanol','mg/kg/hr'],['Ketamine','mcg/kg/min'],['Lidocaine','mcg/kg/min'],
  ['Dexmedetomidine','mcg/kg/hr'],['Midazolam','mg/kg/hr'],['Metoclopramide','mg/kg/day'],['Insulin (regular)','U/kg/hr'],['Norepinephrine','mcg/kg/min'],['Dobutamine','mcg/kg/min'],
  ['Dopamine','mcg/kg/min'],['Furosemide','mg/kg/hr'],['Diltiazem','mcg/kg/min'],['Esmolol','mcg/kg/min'],['Potassium chloride','mEq/kg/hr']];
var CRI_UNITS=['mcg/kg/hr','mcg/kg/min','mg/kg/hr','mg/kg/day','U/kg/hr','mEq/kg/hr'], FLUID_UNITS=['mL/hr','mL/kg/hr'];
var CHECK_CHIPS=['Line patent','Pump running','Site clean, no swelling','Bag changed'];

/* ---------- rate math ---------- */
function kgNow(){ return Number(VISIT.weight)||0; }
function baseOf(u){ return String(u||'').split('/')[0]; }
function amtPerHr(v,u,kg){ var t=Number(v)||0; if(/\/kg/.test(u)) t*=kg; if(/\/min$/.test(u)) t*=60; else if(/\/day$/.test(u)) t/=24; return t; }
/* the pump rate in mL/hr, or null when it can't be worked out (no weight for a per-kg rate, no concentration for a CRI) */
function mlhrOf(o,v,u,kg){ if(kg==null) kg=kgNow(); u=String(u||''); if(/\/kg/.test(u)&&!kg) return null;
  if(/^mL\//.test(u)) return amtPerHr(v,u,kg); var c=Number(o&&o.conc)||0; return c?amtPerHr(v,u,kg)/c:null; }
function fmtR(n){ return n==null||isNaN(n)?'—':n>=100?Math.round(n).toString():n>=10?(Math.round(n*10)/10).toString():(Math.round(n*100)/100).toString(); }
function rateStr(o){ var m=mlhrOf(o,o.rate_v,o.rate_u); if(Number(o.rate_v)===0) return 'Paused';
  return o.kind==='cri'?(o.rate_v+' '+o.rate_u+(m!=null?' · '+fmtR(m)+' mL/hr':'')):(fmtR(m!=null?m:o.rate_v)+' mL/hr'); }
window.tsInfRateFor=function(o,kg){ var r=mlhrOf(o,o.rate_v,o.rate_u,kg); return r==null?'—':fmtR(r)+' mL/hr'; };
function isInf(o){ return !!o&&o.cont&&!!o.kind; }
function tms(iso){ var t=new Date(iso||0).getTime(); return isNaN(t)?0:t; }
function startMs(o){ return tms(o.started_at||o.ordered_at); }
function endMs(o){ return o.dc&&o.dc_at?tms(o.dc_at):Infinity; }
function rateAt(o,t){ var R=o.rates||[], cur=R[0]||(o.rate_v!=null?{v:o.rate_v,u:o.rate_u}:null); for(var i=0;i<R.length;i++){ if(tms(R[i].at)<=t) cur=R[i]; else break; } return cur; }
/* mL given between a and b (ms), following every rate change */
function volume(o,a,b){ if(o.draft) return 0; a=Math.max(a,startMs(o)); b=Math.min(b,endMs(o),Date.now()); if(!(b>a)) return 0;
  var pts=[a].concat((o.rates||[]).map(function(r){ return tms(r.at); }).filter(function(t){ return t>a&&t<b; })).concat([b]), tot=0;
  for(var i=0;i<pts.length-1;i++){ var r=rateAt(o,pts[i]), m=r?mlhrOf(o,r.v,r.u):null; if(m) tot+=m*(pts[i+1]-pts[i])/3600000; }
  return tot; }
/* 109500 mcg/hr reads as 109.5 mg/hr; 20000 mcg/mL as 20 mg/mL */
function fmtAmt(n,b){ if(b==='mcg'&&n>=1000) return fmtR(n/1000)+' mg'; return fmtR(n)+' '+b; }
function fmtMl(n){ return Math.round(n).toLocaleString()+' mL'; }

/* ---------- the grid ---------- */
/* Oct 2026 (option "hour bars"): each hour is a soft bar whose height is the volume given in it, with the hour's mL inside;
   the rate runs across the top as one line, written only where it changes. A pause breaks the line (dotted on the floor, ‖ glyph).
   After now the current rate continues as a dotted line; a dot on the now-line breathes with the due-now pills. */
var IB_PAUSE='<svg viewBox="0 0 8 8" aria-hidden="true"><rect x="1" y=".5" width="2" height="7" rx=".8"/><rect x="5" y=".5" width="2" height="7" rx=".8"/></svg>';
function ibVal(o,r){ if(!r||Number(r.v)===0) return 0; var m=mlhrOf(o,r.v,r.u); return m!=null?m:(Number(r.v)||0); }
/* the day's run as pieces of one rate: [{a,b,r,val,p}] */
function ibSegs(o,d0){ var d1=d0+86400000, st=Math.max(startMs(o)||d0,d0), en=Math.min(endMs(o),d1); if(!(en>st)) return [];
  var cut=[st]; (o.rates||[]).forEach(function(r){ var t=tms(r.at); if(t>st&&t<en) cut.push(t); }); cut.sort(function(a,b){ return a-b; }); cut.push(en);
  var S=[]; for(var i=0;i<cut.length-1;i++){ if(!(cut[i+1]>cut[i])) continue; var r=rateAt(o,cut[i]), v=ibVal(o,r), k=r?r.v+'|'+r.u:'';
    var L=S[S.length-1]; if(L&&L.k===k){ L.b=cut[i+1]; continue; } S.push({a:cut[i],b:cut[i+1],r:r,val:v,p:!v,k:k}); }
  return S; }
function ibCad(mlhr){ return mlhr>0?Math.round(Math.max(2800,Math.min(30000,360000/mlhr))):0; }
function ibNum(n){ return n>=10?Math.round(n).toString():(Math.round(n*10)/10).toString(); }
function ibRate(o,g,full){ if(g.p) return 'Paused'; var r=g.r, m=r?mlhrOf(o,r.v,r.u):null;
  if(o.kind==='cri') return r.v+' '+r.u; return m!=null?fmtR(m)+(full?' mL/hr':''):r.v+' '+r.u; }
window.tsInfCells=function(o){ if(!isInf(o)) return ''; if(o.draft){ var dh=''; for(var q=0;q<24;q++) dh+='<div class="cell inf"><div class="inf-fill off" onclick="tsOrderPanel(\''+o.id+'\')"></div></div>'; return dh; }
  var dk=window.tsViewDk?tsViewDk():dayKey(), d0=dkDate(dk).getTime(), now=Date.now(), S=ibSegs(o,d0), html='', HR=3600000;
  var mx=Math.max.apply(null,S.map(function(g){ return g.val; }).concat([0]))||1, R=function(v){ return Math.max(0,Math.min(1,v/mx)).toFixed(3); };
  var X=function(t,hs){ return Math.max(0,Math.min(100,(t-hs)/HR*100)).toFixed(2); }, cri=o.kind==='cri'&&o.conc==null;
  for(var h=0;h<24;h++){ var hs=d0+h*HR, he=hs+HR, c='';
    var P=S.filter(function(g){ return g.a<he&&g.b>hs; });
    if(P.length){ var ra=Math.max(hs,P[0].a), rb=Math.min(he,P[P.length-1].b), pb=Math.min(rb,now), cur=now>=hs&&now<he;
      c+='<i class="ib-base" style="left:'+X(ra,hs)+'%;right:'+(100-X(rb,hs))+'%"></i>';
      /* the hour's bar and its volume */
      if(pb>ra){ var w=0, run=0; P.forEach(function(g){ var a=Math.max(g.a,ra), b=Math.min(g.b,pb); if(b>a){ w+=g.val*(b-a); run+=b-a; } });
        var lastP=null; P.forEach(function(g){ if(g.a<pb) lastP=g; });
        var hv=cur?(lastP?lastP.val:0):(run?w/run:0), ml=volume(o,ra,pb), li=ra===hs?'1.5px':'0px', ri=(pb===he)?'1.5px':'0px';
        if(hv>0) c+='<i class="ib-bar'+(cur?' cur':'')+'" style="--r:'+R(hv)+';left:calc('+X(ra,hs)+'% + '+li+');right:calc('+(100-X(pb,hs))+'% + '+ri+')"></i>';
        if(!cri&&ml>=0.05) c+=cur?'<b class="ib-v cur" data-a="'+ra+'" style="left:calc('+X(now,hs)+'% + 7px)">'+ibNum(ml)+'</b>':'<b class="ib-v">'+ibNum(ml)+'</b>'; }
      /* the rate line, its risers, pauses and the dotted line ahead */
      var prev=null; P.forEach(function(g,gi){ var a=Math.max(g.a,hs), b=Math.min(g.b,he), pa=Math.min(a,now), pz=Math.min(b,now);
        if(pz>a){ c+=g.p?'<i class="ib-ps" style="left:'+X(a,hs)+'%;right:'+(100-X(pz,hs))+'%"></i>':'<i class="ib-ln" style="--r:'+R(g.val)+';left:'+X(a,hs)+'%;right:'+(100-X(pz,hs))+'%"></i>'; }
        if(b>Math.max(a,now)&&!g.p&&!(o.dc)) c+='<i class="ib-fut" style="--r:'+R(g.val)+';left:'+X(Math.max(a,now),hs)+'%;right:'+(100-X(b,hs))+'%"></i>';
        var ix=S.indexOf(g), pg=S[ix-1];
        if(g.a>=hs&&g.a<he){
          if(pg&&!pg.p&&!g.p&&pg.b===g.a&&g.a<=now){ var lo=Math.min(pg.val,g.val), hi=Math.max(pg.val,g.val); c+='<i class="ib-rs" style="--lo:'+R(lo)+';--hi:'+R(hi)+';left:'+X(g.a,hs)+'%"></i>'; }
          var shortP=g.p&&(Math.min(g.b,now)-g.a)<75*60000;
          c+='<span class="ib-lbl'+(g.p?' p':'')+(ix===S.length-1?' last':'')+'" style="--r:'+R(g.p?0:g.val)+';left:calc('+X(g.a,hs)+'% + '+(ix?4:2)+'px)"'+(g.p?' aria-label="Paused"':'')+'>'+(g.p?IB_PAUSE:'')+(shortP?'':esc(ibRate(o,g,ix===0||g.p||(pg&&pg.p))))+'</span>'; } });
      /* the now dot */
      if(cur&&now>=P[0].a&&now<P[P.length-1].b){ var gn=null; P.forEach(function(g){ if(g.a<=now&&g.b>now) gn=g; });
        if(gn) c+='<i class="ib-tip'+(gn.p?' p':'')+'" style="--r:'+R(gn.val)+';left:'+X(now,hs)+'%;--bd:-'+(Date.now()%2800)+'ms"></i>';
        var cad=gn&&!gn.p&&!cri?ibCad(gn.val):0;   /* a drop for every 0.1 mL at this rate (2.8–30 s) */
        if(cad) c+='<i class="ib-drop" style="--r:'+R(gn.val)+';left:'+X(now,hs)+'%;--cad:'+cad+'ms"></i>'; } }
    html+='<div class="cell inf" data-h="'+h+'"><div class="ib" style="--h:'+h+'" onclick="tsInfPanel(\''+o.id+'\')">'+c+'</div></div>'; }
  return html; };
/* Latest: what the line has given today, and when it was last checked */
window.tsInfLatest=function(o){ if(!isInf(o)||o.draft) return ''; var dk=window.tsViewDk?tsViewDk():dayKey(), d0=dkDate(dk).getTime(), v=volume(o,d0,d0+86400000);
  var C=(o.checks||[]).slice().sort(function(a,b){ return tms(b.at)-tms(a.at); })[0], age=C?Math.max(0,Math.round((Date.now()-tms(C.at))/60000)):null;
  var ck=age==null?'Not checked yet':'Checked '+(age<2?'just now':age<60?age+' min ago':Math.floor(age/60)+' h ago');
  if(v<0.05&&!C) return '';
  return '<span class="rl-trend rl-inf" title="'+esc(o.name+' — '+fmtMl(v)+' given today'+(C?' · line checked '+fmtTime((tms(C.at)-d0)/60000)+(C.by?' by '+C.by:''):''))+'"><span class="rt-v"><b>'+(v>=10?fmtMl(v):ibNum(v)+' mL')+'</b></span><small>'+ck+'</small></span>'; };
/* ---------- motion (Oct 2026: B + C) ----------
   Opening a sheet: the hour bars rise left to right, the rate line draws over them, the dot pops in (once per sheet and day).
   A rate change: the dot, the dotted line ahead and this hour's bar spring to the new height; the new rate fades in.
   Running: a drop leaves the dot for every 0.1 mL and this hour's mL is re-read as it lands. Reduce Motion: none of it. */
var IBM={key:'',last:{},openT:0};
function ibStill(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
/* Web Animations, so a redraw of the sheet (which resets inline styles) can't cut a spring short */
var IB_SPRING='cubic-bezier(.34,1.45,.64,1)';
function ibSpring(el,from,fade,ms){ if(!el||!el.animate) return; el.animate([{transform:from},{transform:'none'}],{duration:ms,easing:IB_SPRING});
  if(fade) el.animate([{opacity:0},{opacity:0,offset:.3},{opacity:1}],{duration:ms+200,easing:'ease'}); }
window.tsInfMotion=function(){ var si=document.getElementById('sheetInner'); if(!si) return;
  var dk=window.tsViewDk?tsViewDk():dayKey(), key=((curDoc&&curDoc.id)||'')+'|'+dk, still=ibStill();
  var rows=[].slice.call(si.querySelectorAll('.grow[data-o]')).filter(function(r){ return r.querySelector('.cell.inf .ib'); });
  if(key!==IBM.key){ IBM.key=key; IBM.last={}; if(rows.length&&!still){ IBM.openT=Date.now(); si.classList.add('ib-open'); clearTimeout(IBM.tm); IBM.tm=setTimeout(function(){ si.classList.remove('ib-open'); },1600); } }
  var d0=dkDate(dk).getTime();
  rows.forEach(function(row){ var id=row.getAttribute('data-o'), o=oFind(id); if(!o) return; var tip=row.querySelector('.ib-tip'), r=tip?parseFloat(tip.style.getPropertyValue('--r')):null, k=o.rate_v+'|'+o.rate_u+'|'+(o.rates||[]).length, L=IBM.last[id];
    var mx=Math.max.apply(null,ibSegs(o,d0).map(function(g){ return g.val; }).concat([0]))||1;
    /* a new highest rate rescales the day: the earlier hours ease down to their new heights */
    if(L&&L.k!==k&&L.mx&&Math.abs(L.mx-mx)>1e-6&&!still){ var hc=row.querySelector('.hcells'); if(hc){ try{ hc.animate([{'--k':(mx/L.mx).toFixed(4)},{'--k':'1'}],{duration:700,easing:IB_SPRING}); }catch(e){} } }
    if(L&&L.k!==k&&L.r!=null&&r!=null&&Math.abs(L.r-r)>.001&&!still){ var ih=parseFloat(getComputedStyle(si).getPropertyValue('--ih'))||22, dy=(r-L.r)*ih;
      ibSpring(tip,'translateY('+dy.toFixed(1)+'px)',false,700);
      [].forEach.call(row.querySelectorAll('.ib-fut,.ib-drop'),function(e){ ibSpring(e,'translateY('+dy.toFixed(1)+'px)',false,700); });
      var cb=row.querySelector('.ib-bar.cur'); if(cb&&r>0){ ibSpring(cb,'scaleY('+(L.r/r).toFixed(3)+')',false,700); }
      var lb=row.querySelectorAll('.ib-lbl.last'); if(lb.length) ibSpring(lb[lb.length-1],'translateY(3px)',true,500); }
    IBM.last[id]={k:k,r:r,mx:mx}; }); };
/* the drip: each drop is a 0.75 s fall started on the cadence; this hour's mL is re-read as it lands (it changes only when the volume does) */
setInterval(function(){ if(document.hidden) return; var si=document.getElementById('sheetInner'); if(!si||si.classList.contains('ib-open')) return; var D=si.querySelectorAll('.ib-drop'); if(!D.length||ibStill()) return; var now=Date.now();
  [].forEach.call(D,function(d){ var cad=parseFloat(d.style.getPropertyValue('--cad'))||0; if(!cad) return; var cyc=Math.floor(now/cad); if(d._c===cyc) return; var first=d._c==null; d._c=cyc; if(first) return;
    d.classList.remove('go'); void d.offsetWidth; d.classList.add('go');
    setTimeout(function(){ var el=d.isConnected&&d.parentNode.querySelector('.ib-v.cur'), row=el&&el.closest('.grow'), o=row&&oFind(row.getAttribute('data-o')); if(!o) return;
      var t=ibNum(volume(o,+el.getAttribute('data-a'),Date.now())); if(t===el.textContent) return; el.textContent=t; el.classList.remove('ib-tick'); void el.offsetWidth; el.classList.add('ib-tick'); },600); }); },250);
/* move along a line to read any moment: rate then, and how much had gone in today */
(function(){ var bub=null, hair=null;
  function hide(){ if(bub){ bub.hidden=true; hair.hidden=true; } }
  function show(e){ var ib=e.target&&e.target.closest&&e.target.closest('#sheetInner .cell.inf .ib'); if(!ib){ hide(); return; }
    var row=ib.closest('.grow'), o=row&&oFind(row.getAttribute('data-o')); if(!o||!isInf(o)||o.draft){ hide(); return; }
    var cell=ib.parentNode, rc=cell.getBoundingClientRect(), rr=row.getBoundingClientRect(), h=+cell.getAttribute('data-h');
    var dk=window.tsViewDk?tsViewDk():dayKey(), d0=dkDate(dk).getTime(), fr=Math.max(0,Math.min(.999,(e.clientX-rc.left)/rc.width)), mn=Math.round((h*60+fr*60)/5)*5, t=d0+mn*60000;
    var S=ibSegs(o,d0), g=null, now=Date.now(), txt; S.forEach(function(s){ if(s.a<=t&&s.b>t) g=s; });
    if(!S.length||t<S[0].a) txt=fmtTime(mn)+' · not started';
    else if(!g) txt=fmtTime(mn)+' · stopped';
    else if(t>now) txt=fmtTime(mn)+' · planned <b>'+esc(ibRate(o,g,true))+'</b>';
    else { var m=g.r?mlhrOf(o,g.r.v,g.r.u):null; txt=fmtTime(mn)+' · <b>'+esc(ibRate(o,g,true))+'</b>'+(o.kind==='cri'&&!g.p&&m!=null?' ('+fmtR(m)+' mL/hr)':'')+' · '+(o.kind==='cri'&&o.conc==null?'':(function(v){ return v>=10?fmtMl(v):ibNum(v)+' mL'; })(volume(o,d0,t))+' so far today'); }
    if(!bub){ bub=document.createElement('div'); bub.className='ib-bub'; bub.setAttribute('aria-hidden','true'); hair=document.createElement('div'); hair.className='ib-hair'; document.body.appendChild(hair); document.body.appendChild(bub); }
    bub.innerHTML=txt.replace(/ · $/,''); bub.hidden=false; hair.hidden=false;
    hair.style.left=e.clientX+'px'; hair.style.top=(rr.top+4)+'px'; hair.style.height=(rr.height-8)+'px';
    var bw=bub.offsetWidth, x=Math.max(8+bw/2,Math.min(innerWidth-8-bw/2,e.clientX)), above=rr.top>40;
    bub.style.left=x+'px'; bub.style.top=(above?rr.top-32:rr.bottom+6)+'px'; }
  document.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return; show(e); },{passive:true});
  document.addEventListener('scroll',hide,true); document.addEventListener('pointerdown',hide,true);
})();
window.tsInfName=function(o){ if(!isInf(o)) return esc(o.name); return esc(o.name)+(o.kind==='cri'?'<span class="rl-brand"> CRI</span>':'')+(o.additive?'<span class="rl-brand"> + '+esc(o.additive)+'</span>':''); };
window.tsInfMeta=function(o){ if(!isInf(o)) return esc(o.rate||''); var kg=kgNow(), m=mlhrOf(o,o.rate_v,o.rate_u,kg);
  if(Number(o.rate_v)===0) return '<b>Paused</b>';
  if(o.kind==='cri') return esc(o.rate_v+' '+o.rate_u)+(m!=null?' · <b>'+fmtR(m)+' mL/hr</b>':' · add concentration');
  var mx=maintX(m,kg);
  if(/\/kg/.test(o.rate_u)) return '<b>'+fmtR(m)+' mL/hr</b> · '+esc(o.rate_v)+' mL/kg/hr'+(mx!=null?' · '+mx+'× maint':'');
  return '<b>'+fmtR(Number(o.rate_v))+' mL/hr</b>'+(kg?' · '+fmtR(o.rate_v/kg)+' mL/kg/hr':'')+(mx!=null?' · '+mx+'× maint':''); };
/* section header: everything infused on the day shown (stopped infusions count too) */
window.tsInfTotal=function(){ if(!curDoc) return ''; var dk=window.tsViewDk?tsViewDk():dayKey(), d0=dkDate(dk).getTime(), t=0;
  Object.keys(curDoc.orders||{}).forEach(function(k){ var o=curDoc.orders[k]; if(isInf(o)) t+=volume(o,d0,d0+86400000); });
  return t>=1?'<span class="ts-inf-tot" title="IV volume given">'+fmtMl(t)+(dk===dayKey()?' today':'')+'</span>':''; };

/* ---------- the infusion card ---------- */
function canChart(){ try{ return currentRole!=='csr'&&currentRole!=='liaison'; }catch(e){ return true; } }
window.tsInfPanel=function(id){ var o=oFind(id); if(!o) return; if(!isInf(o)){ try{ return window._tsOldInf&&window._tsOldInf(id); }catch(e){ return; } }
  var past=window.tsViewDk&&tsViewDk()!==dayKey(), can=canOrderTS()&&!past&&!o.dc, kg=kgNow(), m=mlhrOf(o,o.rate_v,o.rate_u,kg), paused=Number(o.rate_v)===0;
  var big, sub;
  if(paused){ big='Paused'; sub='Rate set to 0'; }
  else if(o.kind==='cri'){ big=esc(o.rate_v+' '+o.rate_u); sub=(m!=null?'<b>'+fmtR(m)+' mL/hr</b>':'Add the concentration to get the pump rate')+(o.conc?' · '+esc(o.conc_label||(o.conc+' '+baseOf(o.rate_u)+'/mL')):'')+(kg?' · '+kg+' kg':''); }
  else { big=(m!=null?fmtR(m):'—')+' mL/hr'; sub=(/\/kg/.test(o.rate_u)?esc(o.rate_v)+' mL/kg/hr · '+kg+' kg':(kg?fmtR(o.rate_v/kg)+' mL/kg/hr · '+kg+' kg':''))+(m!=null&&kg?'<br>'+esc(flMath(m,kg)):''); }
  var d0=dkDate(dayKey()).getTime(), vToday=volume(o,d0,d0+86400000), vAll=volume(o,0,Date.now()+1);
  var R=(o.rates||[]).slice().reverse(), C=(o.checks||[]).slice().reverse(), lastC=C[0];
  var hist=R.slice(0,6).map(function(r,i){ var mm=mlhrOf(o,r.v,r.u); return '<div class="op-row"><span>'+(i===R.length-1?'Started ':'')+esc(fmtWhen(r.at).replace('Today · ',''))+'</span><b>'+(Number(r.v)===0?'Paused':esc(o.kind==='cri'?r.v+' '+r.u+(mm!=null?' · '+fmtR(mm)+' mL/hr':''):fmtR(mm)+' mL/hr'))+(r.by?' · '+esc(r.by):'')+'</b></div>'; }).join('');
  var html='<div class="op-head"><span class="op-ic t-fluid"><svg viewBox="0 0 24 24" fill="none"><path d="'+TYPE_IC.fluid+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">'+(o.kind==='cri'?'Constant rate infusion':'IV fluids')+' · '+esc(o.route||'IV')+'</div><h3>'+esc(o.name)+(o.additive?' <span class="op-brand">+ '+esc(o.additive)+'</span>':'')+'</h3></div>'
    +'<button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +(o.dc?'<div class="op-dc-banner"><b>Stopped</b> '+esc(fmtWhen(o.dc_at))+(o.dc_by_name?' by '+esc(o.dc_by_name):'')+'</div>':'')
    +'<div class="op-hero"><div class="op-big">'+big+'</div>'+(sub?'<div class="op-sub">'+sub+'</div>':'')
      +'<div class="op-freq"><span class="inf-live'+(o.dc||paused?' off':'')+'"><i></i>'+(o.dc?'Stopped':paused?'Paused':'Running')+'</span><small>since '+esc(fmtWhen(o.started_at||o.ordered_at))+'</small></div></div>'
    +'<div class="inf-stats"><div><span>Today</span><b>'+fmtMl(vToday)+'</b></div><div><span>Since start</span><b>'+fmtMl(vAll)+'</b></div><div><span>Last check</span><b>'+(lastC?esc(fmtWhen(lastC.at).replace('Today · ',''))+(lastC.by?' · '+esc(lastC.by):''):'—')+'</b></div></div>'
    +(window.tsRateDraftHTML?tsRateDraftHTML(o):'')
    +(hist?'<div class="rx-lbl op-lbl">Rate history</div><div class="op-list">'+hist+'</div>':'')
    +'<div class="op-list">'+row('Ordered by',o.ordered_by_name||o.ordered_by?esc(o.ordered_by_name||o.ordered_by)+(o.ordered_at?' · '+esc(fmtWhen(o.ordered_at)):''):'')+row('Carrier',o.carrier?esc(o.carrier):'')+row('Instructions',o.notes?esc(o.notes):'')+'</div>'
    +(past?'<p class="op-foot">Go back to today to change this infusion.</p>':o.dc?'':
      '<div class="op-actions">'+(can?'<button type="button" class="op-btn" onclick="tsInfRateAsk(\''+esc(o.id)+'\')">Change rate</button>':'')
        +(canChart()?'<button type="button" class="op-btn'+(can?'':' wide')+'" onclick="tsInfCheckAsk(\''+esc(o.id)+'\')">Log check</button>':'')+'</div>'
        +(window.tsPinBtn?tsPinBtn(o):'')+(can?'<button type="button" class="op-link danger" onclick="tsOrderStopAsk(\''+esc(o.id)+'\')">Stop infusion</button>':''));
  opShow(html); };
/* an intern's rate change, approved or not (drafts.js shows the banner) */
window.tsRateDraftApprove=function(id,ok){ var o=(ORDERS||[]).find(function(x){ return x.id===id; }); if(!o||!o.rate_draft||!canOrderTS()) return; var d=o.rate_draft, me=user(), now=new Date().toISOString();
  if(!ok){ logEvent('doctor','Rate change not approved — <b>'+esc(o.name)+'</b> (drafted by '+esc(d.by_name||d.by||'')+')',me.initials); tsOrderClose(); updateOrder(id,{rate_draft:null}); toast('Rate change not approved'); return; }
  var was=rateStr(o), next=Object.assign({},o,{rate_v:d.v,rate_u:d.u}), rate=rateStr(next);
  logEvent('doctor','Rate change approved — <b>'+esc(o.name)+'</b> '+esc(was)+' → '+esc(rate)+' (drafted by '+esc(d.by_name||d.by||'')+')',me.initials);
  tsOrderClose(); updateOrder(id,{rates:(o.rates||[]).concat([{at:now,v:d.v,u:d.u,by:d.by,by_name:d.by_name||null,approved_by:me.initials,approved_by_name:me.name||null,note:d.note||null}]),rate_v:d.v,rate_u:d.u,rate:rate,rate_draft:null}); toast(esc(o.name)+' · '+esc(rate)); };
window.tsInfRateStr=function(o,v,u){ return rateStr(Object.assign({},o,v!=null?{rate_v:v,rate_u:u}:{})); };
window._tsOldInf=window.openInfusion; window.openInfusion=function(id){ return tsInfPanel(id); };
on('order.panel',function(o){ if(!isInf(o)) return false; tsInfPanel(o.id); return true; });

/* ---------- change the rate ---------- */
function unitOpts(list,sel){ return list.map(function(u){ return '<option'+(u===sel?' selected':'')+'>'+u+'</option>'; }).join(''); }
window.tsInfRateAsk=function(id){ var o=oFind(id); if(!o) return; var units=o.kind==='cri'?CRI_UNITS:FLUID_UNITS;
  var html='<div class="op-head"><span class="op-ic t-fluid"><svg viewBox="0 0 24 24" fill="none"><path d="'+TYPE_IC.fluid+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">Change rate</div><h3>'+esc(o.name)+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">Now '+esc(rateStr(o))+'. The new rate starts now; the old one stays in the history.</p>'
    +'<div class="inf-rate"><input id="infV" inputmode="decimal" value="'+esc(o.rate_v)+'" oninput="tsInfRateCalc(\''+esc(o.id)+'\')"><select id="infU" onchange="tsInfRateCalc(\''+esc(o.id)+'\')">'+unitOpts(units,o.rate_u)+'</select></div>'
    +'<div class="inf-calc" id="infCalc"></div>'
    +'<input id="infNote" class="op-note" placeholder="Reason (optional) — e.g. PCV improving, eating">'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsInfPanel(\''+esc(o.id)+'\')">Back</button><button type="button" class="op-btn primary" onclick="tsInfRateSave(\''+esc(o.id)+'\')">Set rate</button></div>';
  opShow(html); tsInfRateCalc(id); setTimeout(function(){ var i=document.getElementById('infV'); if(i){ i.focus(); i.select(); } },80); };
window.tsInfRateCalc=function(id){ var o=oFind(id), el=document.getElementById('infCalc'); if(!o||!el) return;
  var v=parseFloat((document.getElementById('infV')||{}).value), u=(document.getElementById('infU')||{}).value, m=mlhrOf(o,v,u);
  el.innerHTML=!(v>=0)?'Enter a rate':v===0?'Pauses the infusion (it stays on the sheet)':(m!=null?'= <b>'+fmtR(m)+' mL/hr</b>'+(/\/kg/.test(u)?' for '+kgNow()+' kg':''):'Add a weight'+(o.kind==='cri'&&!o.conc?' and a concentration':'')+' to get mL/hr'); };
window.tsInfRateSave=function(id){ var o=(ORDERS||[]).find(function(x){ return x.id===id; }); if(!o||!canOrderTS()) return;
  var v=parseFloat((document.getElementById('infV')||{}).value), u=(document.getElementById('infU')||{}).value, note=((document.getElementById('infNote')||{}).value||'').trim();
  if(!(v>=0)){ toast('Enter a rate'); return; } if(v===Number(o.rate_v)&&u===o.rate_u){ toast('That’s the current rate'); return; }
  var me=user(), now=new Date().toISOString(), was=rateStr(o);
  if(window.tsIsDrafter&&tsIsDrafter()&&!o.draft){ var nx=Object.assign({},o,{rate_v:v,rate_u:u}); logEvent('doctor','Rate change drafted — <b>'+esc(o.name)+'</b> '+esc(was)+' → '+esc(rateStr(nx))+' · waiting for approval'+(note?' · '+esc(note):''),me.initials);
    tsOrderClose(); updateOrder(id,{rate_draft:{v:v,u:u,note:note||null,by:me.initials,by_name:me.name||null,at:now}}); toast('Rate change sent for approval'); return; }   /* an intern's rate change waits for a doctor (drafts.js) */
  if(o.draft){ var dr=Object.assign({},o,{rate_v:v,rate_u:u}); tsOrderClose(); updateOrder(id,{rate_v:v,rate_u:u,rates:[{at:now,v:v,u:u,by:me.initials,by_name:me.name||null}],rate:rateStr(dr)}); toast('Draft updated'); return; }
  var next=Object.assign({},o,{rate_v:v,rate_u:u}), rate=rateStr(next);
  logEvent('doctor',(v===0?'Infusion paused — <b>':'Rate changed — <b>')+esc(o.name)+'</b> '+esc(was)+' → '+esc(rate)+(note?' · '+esc(note):''),me.initials);
  tsOrderClose(); updateOrder(id,{rates:(o.rates||[]).concat([{at:now,v:v,u:u,by:me.initials,by_name:me.name||null,note:note||null}]),rate_v:v,rate_u:u,rate:rate}); toast(esc(o.name)+' · '+esc(rate)); };

/* ---------- pump / line check ---------- */
window.tsInfCheckAsk=function(id){ var o=oFind(id); if(!o) return;
  var html='<div class="op-head"><span class="op-ic t-fluid"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">Infusion check</div><h3>'+esc(o.name)+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">Running at '+esc(rateStr(o))+'.</p>'
    +'<div class="rx-chips inf-chips">'+CHECK_CHIPS.map(function(c){ return '<button type="button" class="rx-chip" onclick="this.classList.toggle(\'on\')">'+esc(c)+'</button>'; }).join('')+'</div>'
    +'<input id="infChkNote" class="op-note" placeholder="Note (optional)">'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsInfPanel(\''+esc(o.id)+'\')">Back</button><button type="button" class="op-btn primary" onclick="tsInfCheckSave(\''+esc(o.id)+'\')">Log check</button></div>';
  opShow(html); };
window.tsInfCheckSave=function(id){ var o=(ORDERS||[]).find(function(x){ return x.id===id; }); if(!o) return;
  var chips=[].map.call(document.querySelectorAll('#tsOrderSheet .inf-chips .rx-chip.on'),function(b){ return b.textContent; }), extra=((document.getElementById('infChkNote')||{}).value||'').trim();
  var note=chips.concat(extra?[extra]:[]).join(' · '), me=user(), now=new Date().toISOString();
  logEvent('care','Infusion check — <b>'+esc(o.name)+'</b> '+esc(rateStr(o))+(note?' · '+esc(note):''),me.initials);
  tsOrderClose(); updateOrder(id,{checks:(o.checks||[]).concat([{at:now,by:me.initials,note:note||null}]).slice(-24)}); toast('Check logged · '+esc(o.name)); };

/* ---------- ordering ---------- */
function hourStart(h){ var ch=Math.floor(nowMin()/60); if(isNaN(h)||h===ch) return new Date(); var d=new Date(); d.setHours(h,0,0,0); return d; }
function infBuild(kind,name,v,u,x){ x=x||{}; var me=user(), now=new Date(), started=x.started||new Date();
  var o={id:'f'+now.getTime().toString(36)+(x.k!=null?'_'+x.k:''),type:'fluid',cont:true,kind:kind,section:'Continuous Infusions',name:name,route:'IV',rate_v:v,rate_u:u,
    rates:[{at:started.toISOString(),v:v,u:u,by:me.initials,by_name:me.name||null}],started_at:started.toISOString(),start:started.getHours(),
    additive:x.additive||null,conc:x.conc||null,conc_label:x.conc_label||null,carrier:x.carrier||null,notes:x.notes||'',ordered_by:me.initials,ordered_by_name:me.name||null,ordered_at:now.toISOString()};
  if(x.set) o.set=x.set; o.rate=rateStr(o); return o; }
window.tsInfBuild=infBuild;
function infAdd(o){ logEvent('doctor','Infusion started — <b>'+esc(o.name)+'</b>'+(o.additive?' + '+esc(o.additive):'')+' '+esc(o.rate),user().initials);
  addOrders([o]); toast(esc(o.name)+' · '+esc(o.rate)); try{ revealOrder(o); }catch(e){} }
function runningSame(name){ var l=String(name||'').toLowerCase(); return (ORDERS||[]).filter(function(o){ return isInf(o)&&!o.dc&&String(o.name).toLowerCase()===l; }); }
function dupHTML(list){ return list.length?'<div class="ts-dup" role="alert"><div class="td-h"><b>Already running</b></div>'+list.map(function(o){ return '<div class="td-o"><span>'+esc(o.name)+' · '+esc(rateStr(o))+'</span></div>'; }).join('')
  +'<label class="td-ok"><input type="checkbox" id="infDupOk"> Start a second one</label></div>':''; }
function dupBlocked(list){ if(list.length&&!(document.getElementById('infDupOk')||{}).checked){ var b=document.querySelector('#tsModal .ts-dup'); if(b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } toast('Already running — tick “Start a second one”'); return true; } return false; }
function maintMlHr(kg){ return kg?(spKey()==='cat'?80:132)*Math.pow(kg,0.75)/24:0; }
/* the rate in the words doctors check it by: mL/kg/day and the multiple of maintenance (computed, never typed) */
function maintX(m,kg){ var mt=maintMlHr(kg); return mt&&m>0?Math.round(m/mt*10)/10:null; }
function flMath(m,kg){ if(!(m>0)||!kg) return ''; var x=maintX(m,kg); return fmtR(m*24/kg)+' mL/kg/day'+(x!=null?' · '+x+'× maint':''); }
window.tsFlMath=flMath;
window.tsOpenFluidOrder=function(name){ if(!CUR||!curDoc){ toast('Open a patient first'); return; } var can=canOrderTS(), kg=kgNow(), mt=maintMlHr(kg);
  modal('<h3>IV fluids</h3><p>'+esc(VISIT.patient)+' · <b>'+(kg?kg+' kg':'no weight')+'</b>'+(kg?'':' — add a weight for mL/kg/hr')+'</p><div id="flDup"></div>'
    +'<div class="tm-grid"><label class="wide">Fluid<input id="flName" list="flList" value="'+esc(name||FLUIDS[0])+'" oninput="tsFlDup()"><datalist id="flList">'+FLUIDS.map(function(f){ return '<option value="'+esc(f)+'">'; }).join('')+'</datalist></label>'
    +'<label>Rate<span class="rx-dose"><input id="flV" inputmode="decimal" placeholder="Rate" oninput="tsFlCalc()"><select id="flU" onchange="tsFlCalc()">'+unitOpts(FLUID_UNITS,'mL/hr')+'</select></span></label>'
    +'<label>Start<select id="flStart">'+hourOpts()+'</select></label>'
    +'<label class="wide">Additive<input id="flAdd" placeholder="Optional — e.g. KCl 20 mEq/L"></label></div>'
    +'<div class="rx-chips fl-add">'+ADDITIVES.map(function(a){ return '<button type="button" class="rx-chip" onclick="document.getElementById(\'flAdd\').value=this.textContent">'+esc(a)+'</button>'; }).join('')+'</div>'
    +(mt?'<div class="rx-lbl">Maintenance · '+(spKey()==='cat'?'80':'132')+' × kg<sup>0.75</sup> per day</div><div class="rx-chips">'+[1,1.5,2].map(function(f){ return '<button type="button" class="rx-chip" onclick="tsFlMaint('+f+')">'+f+'× · '+fmtR(mt*f)+' mL/hr</button>'; }).join('')+'</div>':'')
    +'<div class="tm-grid" style="margin-top:12px"><label class="wide">Instructions<input id="flNotes" placeholder="Optional"></label></div>'
    +'<div class="rx-calc" id="flCalc">Enter a rate</div>'
    +(can?'':'<p class="rx-warn rx-block">Signed in as <b>'+esc(user().name||'—')+'</b>. Only doctors can order fluids.</p>'),
    can?'Start fluids':'Close', function(){ return can?flSubmit():true; });
  setTimeout(function(){ var c=document.querySelector('#tsModal .tm-card'); if(c) c.classList.add('rx-card'); tsFlDup(); emit('order.window','fluid'); var i=document.getElementById('flV'); if(i) i.focus(); },30); };
window.tsFlDup=function(){ var el=document.getElementById('flDup'); if(el) el.innerHTML=dupHTML(runningSame(((document.getElementById('flName')||{}).value||'').trim())); };
window.tsFlMaint=function(f){ var v=document.getElementById('flV'), u=document.getElementById('flU'); if(!v||!u) return; v.value=fmtR(maintMlHr(kgNow())*f); u.value='mL/hr'; tsFlCalc(); };
window.tsFlCalc=function(){ var el=document.getElementById('flCalc'); if(!el) return; var v=parseFloat((document.getElementById('flV')||{}).value), u=(document.getElementById('flU')||{}).value, kg=kgNow(), m=mlhrOf({},v,u,kg);
  if(!(v>0)){ el.textContent='Enter a rate'; el.className='rx-calc'; return; }
  if(m==null){ el.textContent='Add a weight to use mL/kg/hr'; el.className='rx-calc'; return; }
  el.innerHTML='= <b>'+fmtR(m)+' mL/hr</b>'+(kg?' · '+fmtR(m/kg)+' mL/kg/hr · '+fmtMl(m*24)+'/day<br><b>'+esc(flMath(m,kg))+'</b>':''); el.className='rx-calc ok'; };
function flSubmit(){ var g=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); };
  var name=g('flName'), v=parseFloat(g('flV')), u=g('flU'); if(!name){ toast('Choose the fluid'); return false; } if(!(v>0)){ toast('Enter the rate'); return false; }
  if(mlhrOf({},v,u)==null){ toast('Add a weight to use mL/kg/hr'); return false; } if(dupBlocked(runningSame(name))) return false;
  infAdd(infBuild('fluid',name,v,u,{started:hourStart(parseInt(g('flStart'),10)),additive:g('flAdd'),notes:g('flNotes')})); return true; }

window.tsOpenCriOrder=function(name){ if(!CUR||!curDoc){ toast('Open a patient first'); return; } var can=canOrderTS(), kg=kgNow(), def=CRI_DRUGS.find(function(c){ return c[0].toLowerCase()===String(name||'').toLowerCase(); })||[name||'',CRI_UNITS[0]];
  window._cri={name:def[0],unit:def[1],stockK:null};
  modal('<h3>'+esc(def[0])+' CRI'+(window.tsBrand&&tsBrand(def[0])?' <span class="rx-brand">'+esc(tsBrand(def[0]))+'</span>':'')+'</h3><p>'+esc(VISIT.patient)+' · <b>'+(kg?kg+' kg':'no weight')+'</b>'+(kg?'':' — add a weight to calculate the rate')+'</p>'+dupHTML(runningSame(def[0]))
    +'<div class="tm-grid"><label>Dose<span class="rx-dose"><input id="crV" inputmode="decimal" placeholder="Enter dose" oninput="tsCriCalc()"><select id="crU" onchange="tsCriStock();tsCriCalc()">'+unitOpts(CRI_UNITS,def[1])+'</select></span></label>'
    +'<label>Concentration <span id="crCU">(mcg/mL)</span><input id="crC" inputmode="decimal" placeholder="In the syringe or bag" oninput="window._cri.stockK=null;tsCriStockPaint();tsCriCalc()"></label>'
    +'<label>Pump rate <span>(mL/hr)</span><input id="crM" inputmode="decimal" placeholder="Or enter mL/hr" oninput="tsCriFromPump()"></label>'
    +'<label>Start<select id="crStart">'+hourOpts()+'</select></label>'
    +'<label class="wide">Carrier<input id="crCar" placeholder="Optional — e.g. in 0.9% NaCl"></label></div>'
    +'<div class="rx-stock" id="crStock" style="display:none"></div>'
    +'<div class="tm-grid" style="margin-top:12px"><label class="wide">Instructions<input id="crNotes" placeholder="Optional"></label></div>'
    +'<div class="rx-calc" id="crCalc">Enter a dose to calculate</div>'
    +(can?'':'<p class="rx-warn rx-block">Signed in as <b>'+esc(user().name||'—')+'</b>. Only doctors can order CRIs.</p>'),
    can?'Start CRI':'Close', function(){ return can?criSubmit():true; });
  setTimeout(function(){ var c=document.querySelector('#tsModal .tm-card'); if(c) c.classList.add('rx-card'); tsCriStock(); tsCriCalc(); emit('order.window','fluid'); var i=document.getElementById('crV'); if(i) i.focus(); },30); };
function criStock(){ var n=window._cri&&window._cri.name; return (typeof STOCK!=='undefined'&&STOCK[n])||null; }
window.tsCriStock=function(){ var st=criStock(), u=(document.getElementById('crU')||{}).value||'', cu=document.getElementById('crCU'); if(cu) cu.textContent='('+baseOf(u)+'/mL)';
  var ci=document.getElementById('crC'); if(st&&ci&&window._cri.stockK!=null){ var c=concFor(st.s[window._cri.stockK],baseOf(u)+'/kg'); ci.value=c!=null?String(+c.toPrecision(6)):''; if(c==null) window._cri.stockK=null; }
  tsCriStockPaint(); };
window.tsCriStockPaint=function(){ var el=document.getElementById('crStock'), st=criStock(); if(!el) return; if(!st){ el.style.display='none'; return; } var u=(document.getElementById('crU')||{}).value||'';
  var html=st.s.map(function(s,k){ var ok=concFor(s,baseOf(u)+'/kg')!=null; return '<button type="button" class="rx-chip'+(window._cri.stockK===k?' on':'')+'"'+(ok?'':' disabled')+' onclick="tsCriPick('+k+')">'+esc(s[2])+' · undiluted</button>'; }).join('');
  el.innerHTML='<div class="rx-lbl">Stock strength</div><div class="rx-chips">'+html+'</div>'; el.style.display='block'; };
window.tsCriPick=function(k){ window._cri.stockK=k; tsCriStock(); tsCriCalc(); };
/* both ways: the pump rate a tech reads off the pump gives the dose (mL/hr × concentration ÷ kg) */
window.tsCriFromPump=function(){ var g=function(id){ return parseFloat((document.getElementById(id)||{}).value); }, m=g('crM'), c=g('crC'), u=(document.getElementById('crU')||{}).value, kg=kgNow(), v=document.getElementById('crV');
  if(!(m>0)||!(c>0)||!v){ tsCriCalc(true); return; } var per=amtPerHr(1,u,kg); if(!(per>0)){ tsCriCalc(true); return; } v.value=String(+(m*c/per).toPrecision(4)); tsCriCalc(true); };
window.tsCriCalc=function(){ var el=document.getElementById('crCalc'); if(!el) return; var g=function(id){ return parseFloat((document.getElementById(id)||{}).value); };
  var v=g('crV'), c=g('crC'), u=(document.getElementById('crU')||{}).value, kg=kgNow();
  if(!(v>0)){ el.textContent='Enter a dose to calculate'; el.className='rx-calc'; return; } if(!kg){ el.textContent='Add a weight to calculate the rate'; el.className='rx-calc'; return; }
  var amt=amtPerHr(v,u,kg), b=baseOf(u), pm=document.getElementById('crM'); if(pm&&!arguments[0]&&document.activeElement!==pm) pm.value=c>0?fmtR(amt/c):''; el.innerHTML='= <b>'+fmtAmt(amt,b)+'/hr</b>'+(c>0?' · <b>'+fmtR(amt/c)+' mL/hr</b> of '+fmtAmt(c,b)+'/mL':' · add the concentration for mL/hr'); el.className='rx-calc ok'; };
function criSubmit(){ var g=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); }, C=window._cri||{};
  var v=parseFloat(g('crV')), u=g('crU'), c=parseFloat(g('crC')); if(!(v>0)){ toast('Enter the dose'); return false; }
  if(!kgNow()){ toast('Add a weight first'); return false; } if(dupBlocked(runningSame(C.name))) return false;
  var st=criStock(), lbl=(c>0&&st&&C.stockK!=null)?st.s[C.stockK][2]:(c>0?fmtAmt(c,baseOf(u))+'/mL':null);
  infAdd(infBuild('cri',C.name,v,u,{started:hourStart(parseInt(g('crStart'),10)),conc:c>0?c:null,conc_label:lbl,carrier:g('crCar'),notes:g('crNotes')})); return true; }

/* ---------- order search: "IV fluids" and "<drug> CRI" ---------- */
on('search.extra',infSearch);
function infSearch(q){ var d=document.getElementById('tsDrop'); if(!d||d.style.display==='none'||!DRUGS) return; var scope=window.tsSearchScope||''; if(scope&&scope!=='Continuous Infusions') return; q=String(q||'').trim().toLowerCase(); var rows=[];
  if(!q&&scope){ rows.push(['inf:fluid:','IV fluids','LRS · Plasma-Lyte · Normosol-R · 0.9% NaCl']); CRI_DRUGS.forEach(function(c){ rows.push(['inf:cri:'+c[0],c[0]+' CRI',c[1]]); }); }
  if(q){ if(FLUID_KEYS.indexOf(' '+q)>-1||FLUIDS.some(function(f){ return f.toLowerCase().indexOf(q)>-1; })) rows.push(['inf:fluid:','IV fluids','LRS · Plasma-Lyte · Normosol-R · 0.9% NaCl']);
    var qq=q.replace(/\s*\bcri$/,'').trim();
    CRI_DRUGS.forEach(function(c){ var l=c[0].toLowerCase(); if(q==='cri'||(qq&&(l.indexOf(qq)===0||(' '+l).indexOf(' '+qq)>-1))) rows.push(['inf:cri:'+c[0],c[0]+' CRI',c[1]]); }); }
  else if(!scope) rows.push(['inf:fluid:','IV fluids','rate in mL/hr or mL/kg/hr']);
  rows=rows.slice(0,scope?20:q==='cri'?8:4); if(!rows.length) return;
  var k0=tsRows.length, html='<div class="ts-cat">Fluids &amp; CRIs</div>'+rows.map(function(r,j){ tsRows.push(r[0]);
    return '<button class="ts-item" data-i="'+(k0+j)+'" onmouseenter="tsHi('+(k0+j)+')" onmousedown="event.preventDefault();tsPick(\''+esc(r[0]).replace(/'/g,"\\'")+'\')"><span>'+esc(r[1])+'</span><small class="ts-meta">'+esc(r[2])+'</small></button>'; }).join('');
  var custom=[].find.call(d.querySelectorAll('.ts-cat'),function(c){ return c.textContent==='Custom'; });
  if(custom) custom.insertAdjacentHTML('beforebegin',html); else d.insertAdjacentHTML('beforeend',html); }
on('pick',function(key){ if(key.indexOf('inf:')!==0) return false; var p=key.split(':'); if(p[1]==='cri') tsOpenCriOrder(p.slice(2).join(':')); else tsOpenFluidOrder(); return true; });

/* ═════════ TS ORDER SETS — a whole plan in one tap ═════════
   A set lists monitoring, care, medications and infusions. Opening one shows every line for this patient: medication doses come from the
   Pravix drug reference for the patient's species and the set's route (low end of a range, like a single order), totals are worked out
   from the dosing weight, and anything already on the sheet is marked. The doctor unticks or edits lines, then adds them all.
   Lines without a reference dose (and every infusion) start unticked until a dose or rate is typed — nothing is assumed.
   Starter sets for the medical director to review; they live in ORDER_SETS below. */
var ORDER_SETS=[
  {id:'icu',name:'ICU admit',desc:'Closer monitoring for a critical patient',k:'icu critical admit monitoring',items:[
    {t:'obs',n:'Blood pressure',f:'q4h'},{t:'obs',n:'SpO2',f:'q4h'},{t:'obs',n:'ECG check',f:'q4h'},{t:'obs',n:'Urine output',f:'q4h'},{t:'care',n:'Fluids check',f:'q2h'},
    {t:'fluid',n:'Lactated Ringer’s (LRS)',u:'mL/kg/hr'}]},
  {id:'ortho',name:'Post-op orthopedic',desc:'TPLO · fracture repair',k:'post op postop orthopedic ortho tplo fracture surgery',items:[
    {t:'obs',n:'Pain score',f:'q2h'},{t:'obs',n:'Incision check',f:'q12h'},{t:'care',n:'Cold compress',f:'q6h'},
    {t:'med',n:'Methadone',r:'IV',f:'q4h'},{t:'med',n:'Gabapentin',r:'PO',f:'q8h'},{t:'med',n:'Cefazolin',r:'IV',f:'q8h'}]},
  {id:'parvo',name:'Parvovirus',desc:'Antiemetics · antibiotics · fluids',k:'parvo parvovirus isolation vomiting diarrhea',items:[
    {t:'obs',n:'Blood glucose',f:'q6h'},{t:'obs',n:'Weight',f:'q12h'},{t:'obs',n:'Vomiting check',f:'q4h'},{t:'obs',n:'Hydration check',f:'q6h'},
    {t:'med',n:'Maropitant',r:'IV',f:'q24h'},{t:'med',n:'Ondansetron',r:'IV',f:'q8h'},{t:'med',n:'Ampicillin',r:'IV',f:'q8h'},
    {t:'fluid',n:'Lactated Ringer’s (LRS)',u:'mL/kg/hr'}]},
  {id:'panc',name:'Pancreatitis',desc:'Nausea · pain · nutrition',k:'pancreatitis pancreas vomiting',items:[
    {t:'obs',n:'Pain score',f:'q4h'},{t:'obs',n:'Vomiting check',f:'q4h'},{t:'obs',n:'Appetite check',f:'q8h'},
    {t:'med',n:'Maropitant',r:'IV',f:'q24h'},{t:'med',n:'Ondansetron',r:'IV',f:'q8h'},{t:'med',n:'Pantoprazole',r:'IV',f:'q12h'},
    {t:'fluid',n:'Lactated Ringer’s (LRS)',u:'mL/kg/hr'}]},
  {id:'dka',name:'DKA',desc:'Glucose · electrolytes · ketones',k:'dka diabetic ketoacidosis diabetes insulin',items:[
    {t:'obs',n:'Blood glucose',f:'q2h'},{t:'obs',n:'Electrolytes',f:'q8h'},{t:'obs',n:'Ketones',f:'q12h'},{t:'obs',n:'Urine output',f:'q4h'},{t:'obs',n:'Weight',f:'q12h'},
    {t:'fluid',n:'0.9% NaCl',u:'mL/kg/hr'},{t:'cri',n:'Insulin (regular)',u:'U/kg/hr'}]},
  {id:'seizure',name:'Seizure watch',desc:'Neuro checks · temperature',k:'seizure seizures epilepsy status neuro',items:[
    {t:'obs',n:'Neuro check',f:'q2h'},{t:'obs',n:'Temperature',f:'q2h'},{t:'med',n:'Levetiracetam',r:'IV',f:'q8h'}]},
  {id:'uo',name:'Urethral obstruction',desc:'Post-unblock · cats',k:'urethral obstruction blocked cat uo fluts unblock',items:[
    {t:'obs',n:'Urine output',f:'q4h'},{t:'obs',n:'Electrolytes',f:'q12h'},{t:'obs',n:'Pain score',f:'q4h'},
    {t:'med',n:'Buprenorphine',r:'IV',f:'q8h'},{t:'med',n:'Prazosin',r:'PO',f:'q12h'},{t:'fluid',n:'Lactated Ringer’s (LRS)',u:'mL/kg/hr'}]},
  {id:'gdv',name:'GDV post-op',desc:'Arrhythmia watch · analgesia',k:'gdv bloat gastric dilatation volvulus post op',items:[
    {t:'obs',n:'ECG check',f:'q2h'},{t:'obs',n:'Blood pressure',f:'q4h'},{t:'obs',n:'Lactate',f:'q6h'},{t:'obs',n:'Pain score',f:'q2h'},
    {t:'med',n:'Methadone',r:'IV',f:'q4h'},{t:'med',n:'Maropitant',r:'IV',f:'q24h'},{t:'cri',n:'Lidocaine',u:'mcg/kg/min'},{t:'fluid',n:'Lactated Ringer’s (LRS)',u:'mL/kg/hr'}]}
];
window.TS_ORDER_SETS=ORDER_SETS;
var SET_IC='<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="19" cy="18" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>';
function setOf(id){ return ORDER_SETS.find(function(s){ return s.id===id; }); }
function routeHas(e,r){ if(routeOf(e)===r) return true; var raw=' '+String(e.ro||'').toUpperCase().replace(/INTRAVENOUS/g,'IV').replace(/SUBCUTANEOUS/g,'SQ').replace(/INTRAMUSCULAR/g,'IM').replace(/ORAL/g,'PO').replace(/\bSC\b/g,'SQ')+' ';
  return new RegExp('[^A-Z]'+r+'[^A-Z]').test(raw); }
/* the reference regimen for this species and route (never a different route's dose) */
function setRef(name,route){ var l=String(name).toLowerCase(), i=(DRUGS||[]).findIndex(function(x){ return x.n.toLowerCase()===l; }); if(i<0) return {i:-1};
  var x=DRUGS[i], sp=spKey(), mine=x.r.filter(function(e){ return !sp||e.s.indexOf(sp)>-1; }), e=bestRegimen(mine.filter(function(e){ return routeHas(e,route)&&e.d&&e.d[0]!=null; }));
  return {i:i,x:x,e:e||null}; }
function stockConc(name,unit,route){ var st=(typeof STOCK!=='undefined')&&STOCK[name]; if(!st||st.pick||!INJ[route]) return null;
  for(var k=0;k<st.s.length;k++){ var c=concFor(st.s[k],unit); if(c!=null) return {c:+c.toPrecision(6),label:st.s[k][2]}; } return null; }
function freqSel(cls,sel,list){ list=list||FREQS.filter(function(f){ return f!=='Once'; }); if(sel&&list.indexOf(sel)<0) list=[sel].concat(list);
  return '<select class="'+cls+'" onchange="tsSetRow(this)">'+list.map(function(f){ return '<option'+(f===sel?' selected':'')+'>'+f+'</option>'; }).join('')+'</select>'; }

/* ---------- the list of sets ---------- */
window.tsSetsBtn=function(){ return ''; };   /* Oct 2026: no toolbar button — order sets come up in Add order (type "parvo", or open the search for Browse order sets) */
window.tsSets=function(){ if(!CUR||!curDoc){ toast('Open a patient first'); return; } if(window.tsViewDk&&tsViewDk()!==dayKey()){ toast('Go back to today to add orders'); return; }
  var html='<div class="op-head"><span class="op-ic t-set">'+SET_IC+'</span><div><div class="op-kind">Order sets</div><h3>'+esc(VISIT.patient||'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<div class="set-grid">'+ORDER_SETS.map(function(s){ var meds=s.items.filter(function(i){ return i.t==='med'||i.t==='cri'; }).map(function(i){ return i.n+(i.t==='cri'?' CRI':''); });
      return '<button type="button" class="set-card" onclick="tsSetOpen(\''+s.id+'\')"><b>'+esc(s.name)+'</b><span>'+esc(s.desc)+'</span><small>'+s.items.length+' orders'+(meds.length?' · '+esc(meds.slice(0,3).join(', '))+(meds.length>3?'…':''):'')+'</small></button>'; }).join('')+'</div>';
  opShow(html,'wide'); };

/* ---------- one set, laid out for this patient ---------- */
window.tsSetOpen=function(id){ var S=setOf(id); if(!S) return; if(!DRUGS){ loadDrugs().then(function(){ tsSetOpen(id); }); return; }
  var can=canOrderTS(), kg=Number(VISIT.weight)||0, rows={obs:[],med:[],inf:[]};
  window._set={id:id,lines:[]};
  S.items.forEach(function(it,k){ var L={k:k,it:it}; window._set.lines.push(L); var cb, body='';
    if(it.t==='obs'||it.t==='care'){ var ob=(OBS||[]).find(function(x){ return x.n.toLowerCase()===it.n.toLowerCase(); })||{n:it.n,t:it.t,u:'',f:[]}, ex=onSheet(it.n);
      L.ob=ob; L.ex=ex; var same=ex&&ex.freq===it.f;
      cb=!same; body='<span class="sl-what"><b>'+esc(it.n)+'</b><small>'+(ex?(same?'Already on the sheet · '+esc(ex.freq):'On the sheet at '+esc(ex.freq)+' → changes to the frequency chosen'):(it.t==='care'?'Patient care':'Monitoring'))+'</small></span>'+freqSel('sl-f',it.f,ob.f&&ob.f.length?ob.f.concat(FREQS.filter(function(f){ return ob.f.indexOf(f)<0&&f!=='Once'; })):null);
      rows.obs.push(lineHTML(L,cb,body,same)); }
    else if(it.t==='med'){ var R=setRef(it.n,it.r), e=R.e, u=e?unitOf(e):'mg/kg', dose=e?e.d[0]:'', dup=activeSame(it.n), sc=stockConc(it.n,u,it.r);
      L.R=R; L.unit=u; L.conc=sc; L.dup=dup;
      cb=!!e&&!dup.length&&R.i>-1;
      body='<span class="sl-what"><b>'+esc(it.n)+(window.tsBrand&&tsBrand(it.n)?'<span class="sl-brand"> '+esc(tsBrand(it.n))+'</span>':'')+'</b><small>'+esc(it.r)+(R.i<0?' · not in the drug reference':e?' · reference '+esc(e.do||''):' · no '+(spKey()||'')+' '+esc(it.r)+' dose in the reference — enter one')+(dup.length?' · <em>already ordered: '+dup.map(orderLine).join(', ')+'</em>':'')+'</small></span>'
        +'<span class="sl-dose"><input class="sl-v" inputmode="decimal" value="'+esc(dose)+'" placeholder="Dose" oninput="tsSetRow(this,1)"'+(R.i<0?' disabled':'')+'><em>'+esc(u)+'</em></span>'+freqSel('sl-f',it.f)
        +'<span class="sl-calc"></span>';
      rows.med.push(lineHTML(L,cb,body,R.i<0)); }
    else { var cri=it.t==='cri', run=(ORDERS||[]).filter(function(o){ return o&&o.cont&&!o.dc&&String(o.name).toLowerCase()===it.n.toLowerCase(); });
      var sc2=cri?stockConc(it.n==='Insulin (regular)'?'':it.n,it.u,'IV'):null; L.conc=sc2; L.dup=run;
      body='<span class="sl-what"><b>'+esc(it.n)+(cri?' CRI':'')+'</b><small>'+(cri?(sc2?esc(sc2.label)+' · ':'concentration in the order · '):'IV fluids · ')+(run.length?'<em>already running</em>':'enter a '+(cri?'dose':'rate'))+'</small></span>'
        +'<span class="sl-dose"><input class="sl-v" inputmode="decimal" placeholder="'+(cri?'Dose':'Rate')+'" oninput="tsSetRow(this,1)"><em>'+esc(it.u)+'</em></span>'
        +(cri?'<span class="sl-dose sl-c"><input class="sl-cv" inputmode="decimal" value="'+(sc2?esc(sc2.c):'')+'" placeholder="Conc." oninput="tsSetRow(this)"><em>'+esc(String(it.u).split('/')[0])+'/mL</em></span>':'')
        +'<span class="sl-calc"></span>';
      rows.inf.push(lineHTML(L,false,body,false)); } });
  var sec=function(t,a){ return a.length?'<div class="rx-lbl op-lbl">'+t+'</div><div class="sl-list">'+a.join('')+'</div>':''; };
  var html='<div class="op-head"><span class="op-ic t-set">'+SET_IC+'</span><div><div class="op-kind">Order set · '+esc(VISIT.patient||'')+' · '+(kg?kg+' kg':'no weight')+'</div><h3>'+esc(S.name)+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">Doses are suggestions from the drug reference — check each line. Untick anything you don’t want.</p>'
    +sec('Monitoring &amp; care',rows.obs)+sec('Medications',rows.med)+sec('Fluids &amp; CRIs',rows.inf)
    +'<div class="sl-start"><span>First doses and checks</span><select id="slStart">'+hourOpts()+'</select></div>'
    +(can?'<div class="op-actions"><button type="button" class="op-btn" onclick="tsSets()">All sets</button><button type="button" class="op-btn primary" id="slGo" onclick="tsSetApply()">Add</button></div>'
      :'<p class="op-foot">Only doctors can place orders.</p><div class="op-actions one"><button type="button" class="op-btn" onclick="tsSets()">All sets</button></div>');
  opShow(html,'wide set-card-wide'); document.querySelectorAll('#tsOrderSheet .sl-line').forEach(function(el){ tsSetRow(el.querySelector('input,select')||el); }); tsSetCount();
  if(!can) document.querySelectorAll('#tsOrderSheet .sl-line input, #tsOrderSheet .sl-line select').forEach(function(i){ i.disabled=true; }); };
function lineHTML(L,checked,body,locked){ return '<label class="sl-line'+(locked?' locked':'')+'" data-k="'+L.k+'"><input type="checkbox" class="sl-ck"'+(checked&&!locked?' checked':'')+(locked?' disabled':'')+' onchange="tsSetCount()"><span class="bt-box"></span>'+body+'</label>'; }
/* a line changed: typing a dose ticks it; the total updates */
window.tsSetRow=function(el,typed){ var line=el&&el.closest&&el.closest('.sl-line'); if(!line) return; var L=(window._set||{}).lines[+line.dataset.k]; if(!L) return; var it=L.it, kg=Number(VISIT.weight)||0;
  var v=parseFloat((line.querySelector('.sl-v')||{}).value), out='', ck=line.querySelector('.sl-ck');
  if(typed&&ck&&!ck.disabled) ck.checked=v>0;
  if(it.t==='med'&&v>0){ var o={dose:v,unit:L.unit,conc:L.conc?L.conc.c:null}, d=medDose(o); out=(/\/(kg|lb|m²)/.test(L.unit)&&!kg)?'needs a weight':'= '+d.mg+(o.conc?' · '+d.volume:''); }
  else if(it.t==='fluid'&&v>0){ var m=mlhrOf({},v,it.u,kg); out=m!=null?'= '+fmtR(m)+' mL/hr':'needs a weight'; }
  else if(it.t==='cri'&&v>0){ var c=parseFloat((line.querySelector('.sl-cv')||{}).value), m2=mlhrOf({conc:c},v,it.u,kg); out=!kg?'needs a weight':m2!=null?'= '+fmtR(m2)+' mL/hr':'add concentration'; }
  var cl=line.querySelector('.sl-calc'); if(cl) cl.textContent=out; if(typed) tsSetCount(); };
window.tsSetCount=function(){ var n=document.querySelectorAll('#tsOrderSheet .sl-ck:checked').length, b=document.getElementById('slGo'); if(b){ b.textContent=n?'Add '+n+' order'+(n>1?'s':''):'Add'; b.disabled=!n; } };
window.tsSetApply=function(){ var S=setOf((window._set||{}).id); if(!S||!canOrderTS()||!CUR) return; var me=user(), now=new Date(), start=parseInt((document.getElementById('slStart')||{}).value,10), kg=Number(VISIT.weight)||0;
  if(isNaN(start)) start=Math.floor(nowMin()/60); var added=[], changed=[], bad=null, k=0;
  document.querySelectorAll('#tsOrderSheet .sl-line').forEach(function(line){ var ck=line.querySelector('.sl-ck'); if(!ck||!ck.checked||bad) return; var L=window._set.lines[+line.dataset.k], it=L.it;
    var f=(line.querySelector('.sl-f')||{}).value, v=parseFloat((line.querySelector('.sl-v')||{}).value), id36=(now.getTime()+(k++)).toString(36);
    if(it.t==='obs'||it.t==='care'){ var ex=onSheet(L.ob.n);   /* found again now: the sheet may have refreshed since the set was opened */
      if(ex){ if(ex.freq!==f){ changed.push({id:ex.id,name:ex.name,freq:ex.freq,start:ex.start,to:f}); ex.freq=f; ex.start=start; } return; }
      var o={id:'c'+id36,type:it.t==='care'?'care':'obs',section:it.t==='care'?'Patient Care':'Basic Observation',name:L.ob.n,freq:f,start:start,notes:'',ordered_by:me.initials,ordered_at:now.toISOString(),set:S.id}; if(L.ob.u) o.unit=L.ob.u; added.push(o); }
    else if(it.t==='med'){ if(!(v>0)){ bad=it.n+': enter the dose'; return; } if(/\/(kg|lb|m²)/.test(L.unit)&&!kg){ bad='Add a weight before ordering '+it.n; return; } var e=L.R.e, x=L.R.x;
      var touched=!e||Math.abs(v-e.d[0])>1e-9;
      var m={id:'m'+id36,type:'med',section:'Medications',name:x.n,dose:v,unit:L.unit,route:it.r,freq:f,start:start,conc:L.conc?L.conc.c:null,conc_label:L.conc?L.conc.label:null,conc_source:L.conc?'hospital_stock':null,
        notes:'',drug_id:x.id,ordered_by:me.initials,ordered_by_name:me.name,ordered_at:now.toISOString(),dose_source:touched?'doctor_entered':'reference_suggestion',set:S.id};
      if(e) m.ref={dose:e.do,route:e.ro,freq:e.fo,indication:e.i,species:e.s,source:e.u||null}; added.push(m); }
    else { if(!(v>0)){ bad=it.n+': enter the '+(it.t==='cri'?'dose':'rate'); return; } if(!kg){ bad='Add a weight before ordering '+it.n; return; }
      var c=parseFloat((line.querySelector('.sl-cv')||{}).value), started=start===Math.floor(nowMin()/60)?new Date():(function(){ var d=new Date(); d.setHours(start,0,0,0); return d; })();
      added.push(infBuild(it.t==='cri'?'cri':'fluid',it.n,v,it.u,{k:k,started:started,conc:c>0?c:null,conc_label:c>0?(L.conc&&L.conc.c===c?L.conc.label:fmtR(c)+' '+String(it.u).split('/')[0]+'/mL'):null,set:S.id})); } });
  if(bad){ toast(esc(bad)); return; } if(!added.length&&!changed.length) return;
  logEvent('doctor','Order set — <b>'+esc(S.name)+'</b>: '+added.map(function(o){ return esc(o.name)+(o.type==='med'?' '+esc(medDose(o).mg)+' '+esc(o.route)+' '+esc(o.freq):o.cont?' '+esc(o.rate):' '+esc(o.freq)); }).concat(changed.map(function(c){ return esc(c.name)+' '+esc(c.freq)+' → '+esc(c.to); })).join(', '),me.initials);
  tsOrderClose(); addOrders(added);
  var n=added.length+changed.length, ids=added.map(function(o){ return o.id; });
  undoToast(n+' order'+(n>1?'s':'')+' from '+esc(S.name),function(){ undoSet(S,ids,changed); },6000); };
function undoSet(S,ids,changed){ if(!CUR||!curDoc) return; sync(); var me=user(), now=new Date().toISOString(), u={updated_at:now,updated_by:me.initials};
  ids.forEach(function(id){ var o=(curDoc.orders||{})[id]||(ORDERS||[]).find(function(x){ return x.id===id; }); if(!o) return;
    var dc=Object.assign({},clean(o),{dc:true,dc_at:now,dc_by:me.initials,dc_by_name:me.name||me.initials,dc_reason:'error',dc_note:'Order set undone'});
    curDoc.orders[id]=dc; if(curMain&&curMain.orders) curMain.orders[id]=dc; u['orders.'+id]=dc; });
  changed.forEach(function(c){ var o=(ORDERS||[]).find(function(x){ return x.id===c.id; }); if(o){ o.freq=c.freq; o.start=c.start; } });
  u.audit=U([{at:now,type:'doctor',desc:'Order set undone — <b>'+esc(S.name)+'</b> ('+ids.length+' order'+(ids.length>1?'s':'')+')',who:me.initials,uid:me.uid}]);
  ORDERS=ORDERS.filter(function(o){ return ids.indexOf(o.id)<0; }); buildTasks(); try{ renderSheet(); }catch(e){ try{ buildGrid(); }catch(_){} }
  tsCommit(CUR,u).catch(function(){}); if(changed.length) sync(); toast(esc(S.name)+' undone'); }

/* ---------- order search: type "parvo", "dka", "set"… ---------- */
on('search.extra',setSearch);
function setSearch(q){ var d=document.getElementById('tsDrop'); if(!d||d.style.display==='none'||!DRUGS||window.tsSearchScope) return; q=String(q||'').trim().toLowerCase();
  var hits=q?ORDER_SETS.filter(function(s){ return q==='set'||q==='sets'||q==='order set'||s.name.toLowerCase().indexOf(q)===0||(' '+s.k+' ').indexOf(' '+q)>-1; }):[];
  var rows=q?hits.slice(0,4).map(function(s){ return ['set:'+s.id,s.name,'Order set · '+s.items.length+' orders']; }):[['sets:','Browse order sets',ORDER_SETS.length+' sets · ICU admit, Parvovirus, DKA…']];
  if(!rows.length) return; var k0=tsRows.length;
  var html='<div class="ts-cat">Order sets</div>'+rows.map(function(r,j){ tsRows.push(r[0]); return '<button class="ts-item" data-i="'+(k0+j)+'" onmouseenter="tsHi('+(k0+j)+')" onmousedown="event.preventDefault();tsPick(\''+esc(r[0])+'\')"><span>'+esc(r[1])+'</span><small class="ts-meta">'+esc(r[2])+'</small></button>'; }).join('');
  if(q&&hits.length){   /* a set that matches goes first: renumber what is already listed, then put the sets on top */
    var n=rows.length, S2=tsRows.splice(k0,n); tsRows.unshift.apply(tsRows,S2);
    [].forEach.call(d.querySelectorAll('.ts-item[data-i]'),function(b){ var i=+b.getAttribute('data-i')+n; b.setAttribute('data-i',i); b.setAttribute('onmouseenter','tsHi('+i+')'); });
    html=html.replace(/data-i="(\d+)"/g,function(_,i){ return 'data-i="'+(i-k0)+'"'; }).replace(/tsHi\((\d+)\)/g,function(_,i){ return 'tsHi('+(i-k0)+')'; });
    d.insertAdjacentHTML('afterbegin',html); tsIdx=0; try{ tsMark(); }catch(e){} return; }
  var custom=[].find.call(d.querySelectorAll('.ts-cat'),function(c){ return c.textContent==='Custom'; });
  if(custom) custom.insertAdjacentHTML('beforebegin',html); else d.insertAdjacentHTML('beforeend',html); }
on('pick',function(key){ if(key.indexOf('set:')!==0&&key!=='sets:') return false; var si=document.getElementById('tsSearch'); if(si) si.blur();
  if(key==='sets:') tsSets(); else tsSetOpen(key.slice(4)); return true; });

/* ═════════ TS TASKS — what's due across every patient · chart a whole hour at once ═════════
   Tasks tab: every open sheet's uncharted slots — Overdue (last 6 h, older on request), Due now (±18 min, the sheet's own rule), Next hour —
   grouped by patient, filtered by My patients and ICU · Wards · Isolation. One tap charts it (readings take a value), with Undo.
   The open sheet charts through its own grid; other sheets get the reading in their inbox (sheets/{id}.marks), the same path Flow's
   triage readings use, and the sheet's refresh moves it into that day's record.
   Batch: tap an hour in the grid header to chart everything at that hour for this patient in one sheet. */
var WL={mine:false,loc:'',old:false}, WL_IX={};
try{ var _wl=JSON.parse(localStorage.getItem('tsWlPrefs')||'null'); if(_wl) Object.assign(WL,_wl,{old:false}); }catch(e){}
function wlSave(){ try{ localStorage.setItem('tsWlPrefs',JSON.stringify({mine:WL.mine,loc:WL.loc})); }catch(e){} }
var WL_OLD=6*60;
function wlItems(){ var dk=dayKey(), n=nowMin(), out=[];
  (SHEETS||[]).forEach(function(s0){ var s=(s0._id===CUR&&curDoc)?curDoc:s0, marks=s.marks||{}, p=s0.patient||{};
    if(WL.mine&&!isMine(s0)) return; if(WL.loc&&(p.location||'')!==WL.loc) return;
    var adm=s0.admitted_at||s0.created_at, from=(adm&&dayKey(new Date(adm))===dk)?isoToMin(adm):-1;
    Object.keys(s.orders||{}).forEach(function(id){ var o=s.orders[id]; if(!o||o.cont||o.dc) return;
      freqTimes(o).forEach(function(h0){ var t=slotMin(o,dk,h0*60), h=Math.floor(t/60); if(t>n+60) return; if(h0*60<from&&!o.ordered_at) return;
        var key=dk+'_'+id+'_'+(h0*60), m=marks[key]; if(m&&m.status) return;
        /* a reading charted off-schedule in the same hour counts (the grid shows it in that cell) */
        if(Object.keys(marks).some(function(k){ var x=marks[k]; return x&&x.status&&x.orderId===id&&k.indexOf(dk+'_')===0&&Math.floor((x.sched!=null?x.sched:x.min||0)/60)===h; })) return;
        out.push({sheet:s0._id,s0:s0,p:p,o:o,id:id,key:key,t:t,state:t<n-18?'over':t<=n+18?'due':'next'}); }); }); });
  return out.sort(function(a,b){ return a.t-b.t||String(a.p.name||'').localeCompare(String(b.p.name||'')); }); }
function wlCounts(L){ var c={over:0,due:0,next:0,old:0}, n=nowMin(); L.forEach(function(x){ if(x.state==='over'&&x.t<n-WL_OLD) c.old++; else c[x.state]++; }); return c; }
function needsValue(o){ return o.type==='obs'||o.type==='diag'; }
function taskMeta(o){ if(o.type==='med'){ var d=medDose(o); return esc(d.mg)+(o.conc?' · '+esc(d.volume):'')+(o.route?' '+esc(o.route):''); } return esc(o.freq||'')+(o.unit?' · '+esc(o.unit):''); }
function wlRow(x){ var k=x.sheet+'|'+x.key; WL_IX[k]=x; var nv=needsValue(x.o);
  return '<div class="wl-row '+x.state+'" data-k="'+esc(k)+'"><span class="wl-time">'+esc(fmtTime(x.t))+'</span>'
    +'<div class="wl-what"><b>'+esc(x.o.name)+(x.o.type==='med'&&window.tsBrand&&tsBrand(x.o.name)?'<span class="wl-brand"> · '+esc(tsBrand(x.o.name))+'</span>':'')+'</b><small>'+taskMeta(x.o)+'</small></div>'
    +(nv?'<input class="wl-val" inputmode="'+(x.o.unit&&/°F|bpm|rpm|kg|mmHg|mg\/dL|%|mmol/.test(x.o.unit)?'decimal':'text')+'" placeholder="'+esc(x.o.unit||'Value')+'" onkeydown="if(event.key===\'Enter\'){event.preventDefault();tsWlDone(this)}">':'')
    +'<button type="button" class="wl-done" onclick="tsWlDone(this)" aria-label="Mark '+esc(x.o.name)+' done"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'+(x.o.type==='med'?'Given':'Done')+'</button></div>'; }
function wlGroup(title,cls,L){ if(!L.length) return ''; var by={}, order=[];
  L.forEach(function(x){ if(!by[x.sheet]){ by[x.sheet]=[]; order.push(x.sheet); } by[x.sheet].push(x); });
  return '<section class="wl-sec '+cls+'"><h3>'+title+'<span>'+L.length+'</span></h3>'+order.map(function(id){ var a=by[id], p=a[0].p, nm=((p.name||'')+' '+(p.last||'')).trim()||'Patient';
      return '<div class="wl-pt"><button type="button" class="wl-pth" onclick="tsOpenSheet(\''+esc(id)+'\',true)"><b>'+esc(nm)+'</b><span>'+[p.location,p.tech?'Tech '+p.tech:''].filter(Boolean).map(esc).join(' · ')+'</span>'
        +(String(p.code||'').toUpperCase()==='DNR'?'<em class="wl-dnr">DNR</em>':'')+'<i>›</i></button>'+a.map(wlRow).join('')+'</div>'; }).join('')+'</section>'; }
window.tsRenderTasks=function(){ var el=document.getElementById('ctab-tasks'); if(!el) return; WL_IX={};
  var L=wlItems(), n=nowMin(), c=wlCounts(L), over=L.filter(function(x){ return x.state==='over'&&(WL.old||x.t>=n-WL_OLD); }), due=L.filter(function(x){ return x.state==='due'; }), next=L.filter(function(x){ return x.state==='next'; });
  var chip=function(v,l){ return '<button type="button" class="wl-chip'+(WL.loc===v?' on':'')+'" onclick="tsWlLoc(\''+v+'\')">'+l+'</button>'; };
  var sum=[c.over+(WL.old?c.old:0)?'<b class="o">'+(c.over+(WL.old?c.old:0))+'</b> overdue':'',c.due?'<b class="d">'+c.due+'</b> due now':'',c.next?'<b>'+c.next+'</b> in the next hour':''].filter(Boolean).join(' · ');
  var html='<div class="wl"><div class="wl-top"><div><h2>Tasks</h2><p>'+(sum||'Nothing due right now')+' · '+esc(fmtTime(n))+'</p></div>'
    +'<div class="wl-seg"><button type="button" class="'+(WL.mine?'':'on')+'" onclick="tsWlMine(false)">All patients</button><button type="button" class="'+(WL.mine?'on':'')+'" onclick="tsWlMine(true)">My patients</button></div></div>'
    +'<div class="wl-chips">'+chip('','All')+(window.TS_LOCATIONS||['ICU','Wards','Isolation']).map(function(l){ return chip(l,l); }).join('')+'</div>'
    +(SHEETS&&SHEETS.length?'':'<div class="wl-empty"><b>No admitted patients</b><span>Sheets appear here as soon as a patient is admitted.</span></div>')
    +wlGroup('Overdue','over',over)+wlGroup('Due now','due',due)+wlGroup('Next hour','next',next)
    +(c.old&&!WL.old?'<button type="button" class="wl-more" onclick="tsWlOld()">'+c.old+' earlier today not charted · show</button>':'')
    +(SHEETS&&SHEETS.length&&!over.length&&!due.length&&!next.length?'<div class="wl-empty ok"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><b>All caught up</b><span>Nothing due in the next hour'+(WL.mine?' for your patients':WL.loc?' in '+esc(WL.loc):'')+'.</span></div>':'')
    +'</div>';
  if(typeof tsMorphHTML==='function') tsMorphHTML(el,html); else el.innerHTML=html; tsTaskBadge(L); };
window.tsWlMine=function(v){ WL.mine=!!v; wlSave(); tsRenderTasks(); };
window.tsWlLoc=function(v){ WL.loc=v||''; wlSave(); tsRenderTasks(); };
window.tsWlOld=function(){ WL.old=true; tsRenderTasks(); };
function tsTaskBadge(L){ var b=document.getElementById('tsTaskBadge'); if(!b) return; L=L||wlItems(); var c=wlCounts(L), n=c.over+c.due;
  if(!b.hasAttribute('data-roll')) b.setAttribute('data-roll','tasks'); b.textContent=n?String(n):''; b.className='seg-badge'+(c.over?' over':''); b.title=n?(c.over+' overdue · '+c.due+' due now'):''; }
window.tsTaskBadge=tsTaskBadge;
function chartDesc(o,val){ return '<b>'+esc(o.name)+'</b> '+(val?'— '+esc(val)+' ':'')+(o.type==='med'?'given':'completed'); }
window.tsWlDone=function(btn){ var row=btn.closest('.wl-row'); if(!row||row.classList.contains('wl-leaving')) return; var x=WL_IX[row.dataset.k]; if(!x) return;
  if(!canChart()){ toast('Your role can’t chart'); return; }
  var inp=row.querySelector('.wl-val'), val=inp?inp.value.trim():''; if(inp&&!val){ inp.focus(); inp.classList.add('need'); setTimeout(function(){ inp.classList.remove('need'); },900); return; }
  var me=user(), now=new Date(), nowIso=now.toISOString(), undo;
  var here=x.sheet===CUR&&curDoc&&dayReady()&&!(window.tsViewDk&&tsViewDk()!==dayKey()), t=here&&(TASKS||[]).find(function(y){ return y.key===x.key; });
  if(t){ t.status='completed'; t.completedMin=nowMin(); t.by=me.initials||null; t.value=val||null; logEvent(x.o.type==='obs'?'vital':x.o.type,chartDesc(x.o,val),me.initials); sync();
    emit('task.charted',t);
    undo=function(){ t.status=null; t.completedMin=null; t.by=null; t.value=null; logEvent('doctor','<b>'+esc(x.o.name)+'</b> '+esc(fmtTime(x.t))+' charting undone',me.initials); try{ buildGrid(); }catch(e){} sync(); tsRenderTasks(); }; }
  else { var mark={status:'completed',by:me.initials||null,min:Math.round(nowMin()),value:val||null,notes:null,orderId:x.id,sched:x.t,at:nowIso,uid:me.uid||null,src:'tasks'};
    var u={updated_at:nowIso,updated_by:me.name||null,audit:U([{at:nowIso,type:x.o.type==='obs'?'vital':x.o.type,desc:chartDesc(x.o,val),who:me.initials,uid:me.uid}])}; u['marks.'+x.key]=mark;
    x.s0.marks=x.s0.marks||{}; x.s0.marks[x.key]=mark; tsCommit(x.sheet,u).catch(function(){});
    undo=function(){ var t2=new Date().toISOString(), d={}; d[x.key]=DEL; var u2={updated_at:t2,digest_dirty:true,audit:U([{at:t2,type:'doctor',desc:'<b>'+esc(x.o.name)+'</b> '+esc(fmtTime(x.t))+' charting undone',who:me.initials,uid:me.uid}])}; u2['marks.'+x.key]=DEL;
      if(x.s0.marks) delete x.s0.marks[x.key]; tsCommit(x.sheet,u2,x.key.slice(0,8),d).catch(function(){}); tsRenderTasks(); }; }
  row.classList.add('wl-leaving'); setTimeout(tsRenderTasks,320);
  undoToast(esc(x.o.name)+(val?' '+esc(val):'')+' · '+esc(((x.p.name||'')+' '+(x.p.last||'')).trim()),undo); };
/* keep the list and the badge current: data changes arrive through updateChip (every sheet snapshot), the clock through the timer */
on('chip',function(){ if(currentCTab==='tasks') tsRenderTasks(); else tsTaskBadge(); });
setInterval(function(){ if(document.hidden) return; try{ if(currentCTab==='tasks'&&!(document.activeElement&&document.activeElement.classList.contains('wl-val'))) tsRenderTasks(); else tsTaskBadge(); }catch(e){} },30000);

/* ═══ batch charting: one hour, one patient — or one section of it (sec = a section band's hour, store/sections.js) ═══ */
function btField(t,o){ var opts=(typeof V_OPTS!=='undefined')&&V_OPTS[String(o.name).toLowerCase()], id=esc(t.id);
  return '<input class="bt-val" data-id="'+id+'" placeholder="'+esc(o.unit||(opts?'Select':'Value'))+'"'+(opts?' list="btl-'+id+'"':' inputmode="'+(o.unit?'decimal':'text')+'"')+' autocomplete="off" oninput="tsBatchVal(this)" onkeydown="tsBatchKey(event,this)">'
    +(opts?'<datalist id="btl-'+id+'">'+opts.map(function(x){ return '<option value="'+esc(x)+'">'; }).join('')+'</datalist>':''); }
/* Enter moves to the next reading; on the last one it completes */
window.tsBatchKey=function(e,inp){ if(e.key!=='Enter') return; e.preventDefault(); var L=[].slice.call(document.querySelectorAll('#tsOrderSheet .bt-val')), i=L.indexOf(inp);
  if(i>-1&&i<L.length-1) L[i+1].focus(); else { var b=document.getElementById('btGo'); if(b&&!b.disabled) b.click(); } };
window.tsBatch=function(h,sec){ if(!CUR||!curDoc) return; if(window.tsViewDk&&tsViewDk()!==dayKey()){ toast('View only — go back to today to chart'); return; }
  if(!canChart()){ toast('Your role can’t chart'); return; } var nh=Math.floor(nowMin()/60); if(h>nh+1){ toast(fmtTime(h*60)+' hasn’t come yet'); return; } var secName=sec?String(sec):'';
  var idx={}; (ORDERS||[]).forEach(function(o,i){ idx[o.id]=i; });
  var L=(TASKS||[]).filter(function(t){ return !t.status&&Math.floor(t.sched/60)===h&&t.order&&!t.order.dc&&!t.order.cont&&(!secName||t.order.section===secName); }).sort(function(a,b){ return (idx[a.orderId]-idx[b.orderId])||a.sched-b.sched; });
  if(!L.length){ toast((secName?esc(secName)+' at ':'Everything at ')+fmtTime(h*60)+' is charted'); return; }
  window._batch={h:h,sec:secName};
  var rows=L.map(function(t){ var o=t.order, nv=needsValue(o), nr=!!o.note_req;
    return '<label class="bt-row'+(nv?' nv':'')+(nr?' nr':'')+'"><input type="checkbox" class="bt-ck" data-id="'+esc(t.id)+'"'+(nv||nr?'':' checked')+' onchange="tsBatchCount()"><span class="bt-box"></span>'
      +'<span class="bt-what"><b>'+esc(o.name)+'</b><small>'+taskMeta(o)+(t.sched%60?' · '+esc(fmtTime(t.sched)):'')+'</small></span>'
      +(nv?btField(t,o):'')+(nr?'<input class="bt-note" data-id="'+esc(t.id)+'" placeholder="'+esc(o.note_prompt||'Note required')+'" aria-label="'+esc(o.name)+' note (required)" oninput="tsBatchVal(this)" onclick="event.preventDefault();this.focus()">':'')+'</label>'; }).join('');
  var html='<div class="op-head"><span class="op-ic"><svg viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">Chart '+(secName?esc(secName)+' · ':'')+esc(fmtTime(h*60))+'</div><h3>'+esc(VISIT.patient||'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">Untick anything that wasn’t done. Readings are added when you type a value.</p>'+(window.tsBtSayHTML?tsBtSayHTML():'')+'<div class="bt-list">'+rows+'</div>'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Cancel</button><button type="button" class="op-btn primary" id="btGo" onclick="tsBatchGo()">Complete</button></div>';
  opShow(html,'wide'); tsBatchCount(); setTimeout(function(){ var f=document.querySelector('#tsOrderSheet .bt-val'); if(f) f.focus(); },120); };
window.tsBatchVal=function(inp){ var row=inp.closest('.bt-row'), ck=row&&row.querySelector('.bt-ck'); if(ck) ck.checked=!!inp.value.trim(); tsBatchCount(); };
window.tsBatchCount=function(){ var n=document.querySelectorAll('#tsOrderSheet .bt-ck:checked').length, b=document.getElementById('btGo'); if(b){ b.textContent=n?'Complete '+n:'Complete'; b.disabled=!n; } };
window.tsBatchGo=function(){ var B=window._batch||{}, me=user(), done=[], vals=[], wt=null, skipped=[];
  document.querySelectorAll('#tsOrderSheet .bt-ck:checked').forEach(function(ck){ var t=(TASKS||[]).find(function(x){ return x.id===ck.dataset.id; }); if(!t||t.status) return;
    var ni=document.querySelector('#tsOrderSheet .bt-note[data-id="'+ck.dataset.id+'"]'), nt=ni?ni.value.trim():'';
    if(t.order&&t.order.note_req&&!nt){ skipped.push(t.order.name); return; }
    var vi=document.querySelector('#tsOrderSheet .bt-val[data-id="'+ck.dataset.id+'"]'), v=vi?vi.value.trim():'';
    t.status='completed'; t.completedMin=nowMin(); t.by=me.initials||null; t.value=v||null; if(nt) t.notes=nt; done.push(t); vals.push(esc(t.order.name)+(v?' '+esc(v):''));
    });
  if(skipped.length) setTimeout(function(){ toast(esc(skipped.join(', '))+' need'+(skipped.length>1?'':'s')+' a note first'); },done.length?1800:0);
  if(!done.length) return; tsOrderClose(); if(window.tsJustCharted) tsJustCharted(done.map(function(t){ return t.id; }));
  logEvent('vital','Charted '+(B.sec?esc(B.sec)+' ':'')+esc(fmtTime(B.h*60))+' — '+vals.join(', '),me.initials);
  try{ buildGrid(); }catch(e){} sync();
  undoToast(done.length+' task'+(done.length>1?'s':'')+' charted · '+esc(fmtTime(B.h*60)),function(){ done.forEach(function(t){ t.status=null; t.completedMin=null; t.by=null; t.value=null; });
    logEvent('doctor','Charting at '+esc(fmtTime(B.h*60))+' undone ('+done.length+')',me.initials); try{ buildGrid(); }catch(e){} sync(); });
  done.forEach(function(t){ emit('task.charted',t); }); };

/* ═════════ TS SAY — charting an hour by voice (or by typing one line) ═════════
   In the "Chart <section> · <hour>" form (tsBatch, store/tasks.js): tap the mic and say the readings —
   "temp 101.2, heart rate 130, RR 24, pink, under 2, BAR, pain 1" — or type the same line and press Enter.
   Each value goes into its row (names, short forms and the usual answers are understood); nothing is saved until Complete,
   so the person checks every value first. Rows it filled flash; anything it couldn't place stays empty.
   Uses the browser's speech recognition (as LUNA voice does); without it, the typed line still works. */
var SAY_SR=window.SpeechRecognition||window.webkitSpeechRecognition, sayRec=null;
var SAY_ALIAS={'temperature':['temperature','temp','t'],'heart rate':['heart rate','hr','pulse','heart'],'respiratory rate':['respiratory rate','resp rate','respiration rate','respirations','resp','rr','breathing'],
  'mucous membrane':['mucous membranes','mucous membrane','membranes','mm','gums'],'crt':['capillary refill time','capillary refill','cap refill','crt','refill'],'mentation':['mentation','mental status','mentally'],
  'pain score':['pain score','pain'],'weight':['weight','wt','weighs'],'blood glucose':['blood glucose','glucose','bg','sugar'],'blood pressure':['blood pressure','bp','pressure'],
  'spo2':['spo2','oxygen saturation','pulse ox','sats','sat'],'food':['food','eating','ate'],'water':['water','drinking','drank'],'urination':['urination','urine','urinated','peed'],'defecation':['defecation','stool','feces','poop'],
  'vomiting':['vomiting','vomit','vomited'],'lactate':['lactate'],'urine output':['urine output','uop']};
function sayNorm(t){ return ' '+String(t||'').toLowerCase().replace(/(\d)\s*point\s*(\d)/g,'$1.$2').replace(/\bpoint\b/g,'.').replace(/[,;]/g,' , ')
  .replace(/\b(less than|under|below|fewer than)\s*(two|2)\b/g,' <2 ').replace(/\b(more than|over|greater than|above|longer than)\s*(two|2)\b/g,' >2 ')
  .replace(/\bone\b/g,'1').replace(/\btwo\b/g,'2').replace(/\bthree\b/g,'3').replace(/\bfour\b/g,'4').replace(/\bzero\b/g,'0').replace(/\bfive\b/g,'5')
  .replace(/\s+/g,' ')+' '; }
function sayRows(){ return [].slice.call(document.querySelectorAll('#tsOrderSheet .bt-val')).map(function(inp){ var t=(TASKS||[]).find(function(x){ return x.id===inp.dataset.id; }), n=t?String(t.order.name).toLowerCase().trim():'';
  var key=Object.keys(SAY_ALIAS).find(function(k){ return n===k||n.indexOf(k)===0; }), opts=(typeof V_OPTS!=='undefined'&&V_OPTS[n])||[];
  return {inp:inp,name:n,al:(key?SAY_ALIAS[key]:[]).concat([n]).sort(function(a,b){ return b.length-a.length; }),opts:opts.map(function(o){ return String(o).toLowerCase(); }),num:!opts.length}; }); }
/* text → {row index: value} */
function sayParse(text,R){ var s=sayNorm(text), out={}, used=[];
  /* mentions of a row by name, earliest first */
  var hits=[]; R.forEach(function(r,i){ r.al.forEach(function(a){ var re=new RegExp('(^|[\\s,])'+a.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&')+'(?=[\\s,])','g'), m;
    while((m=re.exec(s))){ var st=m.index+m[1].length; if(!used.some(function(u){ return st<u[1]&&st+a.length>u[0]; })){ hits.push({i:i,at:st,end:st+a.length}); used.push([st,st+a.length]); } } }); });
  hits.sort(function(a,b){ return a.at-b.at; });
  hits.forEach(function(h,k){ if(out[h.i]!=null) return; var r=R[h.i], next=k<hits.length-1?hits[k+1].at:s.length, seg=s.slice(h.end,next).replace(/^[\s,:=is]*(is|of|was)?\s*/,'');
    if(r.num){ var m=seg.match(/^-?\d+(\.\d+)?/)||seg.match(/-?\d+(\.\d+)?/); if(m) out[h.i]=m[0]; }
    else { var o=r.opts.slice().sort(function(a,b){ return b.length-a.length; }).find(function(o){ return (' '+seg+' ').indexOf(' '+o+' ')>-1; }); if(o) out[h.i]=R[h.i].opts.indexOf(o); } });
  /* answers said without the name ("pink", "BAR", "under 2") go to the one row that offers them */
  R.forEach(function(r,i){ if(out[i]!=null||r.num) return; var o=r.opts.slice().sort(function(a,b){ return b.length-a.length; }).find(function(o){ if(!/[a-z<>]/.test(o)) return false; var others=R.some(function(q,j){ return j!==i&&q.opts.indexOf(o)>-1; }); return !others&&s.indexOf(' '+o+' ')>-1; });
    if(o) out[i]=r.opts.indexOf(o); });
  return out; }
function sayApply(text){ var R=sayRows(); if(!R.length) return 0; var P=sayParse(text,R), n=0;
  Object.keys(P).forEach(function(i){ var r=R[i], v=P[i]; if(!r.num){ var opts=(V_OPTS[r.name]||[]); v=opts[v]; } if(v==null||v==='') return;
    r.inp.value=String(v); try{ tsBatchVal(r.inp); }catch(e){} n++; var row=r.inp.closest('.bt-row'); if(row){ row.classList.remove('bt-said'); void row.offsetWidth; row.classList.add('bt-said'); } });
  var st=document.getElementById('btSayMsg'); if(st) st.textContent=n?'Filled '+n+' of '+R.length+' — check them, then Complete':'Couldn’t place those — try “temp 101.2, heart rate 130”';
  return n; }
window.tsBtSayHTML=function(){ if(!document) return ''; return '<div class="bt-say">'+(SAY_SR?'<button type="button" class="bt-mic" id="btMic" onclick="tsBtMic()" aria-label="Say the readings" title="Say the readings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg></button>':'')
  +'<input id="btSay" autocomplete="off" placeholder="'+(SAY_SR?'Say or type':'Type')+': temp 101.2, HR 130, pink, under 2, BAR, pain 1" onkeydown="if(event.key===\'Enter\'){event.preventDefault();event.stopPropagation();tsBtSay(this.value);}"></div><div class="bt-say-msg" id="btSayMsg"></div>'; };
window.tsBtSay=function(text){ return sayApply(text); };
window.tsBtMic=function(){ if(!SAY_SR) return; var b=document.getElementById('btMic'), inp=document.getElementById('btSay');
  if(sayRec){ try{ sayRec.stop(); }catch(e){} return; }
  try{ sayRec=new SAY_SR(); }catch(e){ toast('Voice isn’t available on this device'); return; }
  sayRec.lang='en-US'; sayRec.interimResults=true; sayRec.continuous=false; var fin='';
  sayRec.onresult=function(e){ var t=''; for(var i=e.resultIndex;i<e.results.length;i++){ if(e.results[i].isFinal) fin+=e.results[i][0].transcript+' '; else t+=e.results[i][0].transcript; } if(inp) inp.value=(fin+t).trim(); };
  sayRec.onerror=function(e){ if(e.error==='not-allowed') toast('Allow the microphone to chart by voice'); };
  sayRec.onend=function(){ sayRec=null; if(b) b.classList.remove('on'); var txt=(inp&&inp.value)||fin; if(txt.trim()) sayApply(txt); };
  if(b) b.classList.add('on'); var st=document.getElementById('btSayMsg'); if(st) st.textContent='Listening…';
  try{ sayRec.start(); }catch(e){ sayRec=null; if(b) b.classList.remove('on'); } };
/* ═════════ TS SECTIONS — the grid's section bands (Basic Observation, Medications, Patient Care …) ═════════
   Drawn by core buildGrid through window.tsSecBand; core gives every order row data-sec and hides rows of a folded section.
   · Tap the title to fold / unfold a section. Folded, the band keeps one dot per hour (worst status, open count) so nothing is lost.
     Fold state is per person, per browser (localStorage tsFold_v1, keyed by uid) — a convenience, never shared.
   · The band sticks under the hour header while the grid scrolls down, so you always see which section you're in.
   · Tap the band above an hour to chart that section's open tasks at that hour in one form (tsBatch(h, section), store/tasks.js).
   · "+" opens the order search limited to that section (window.tsSearchScope, store/rx.js · fluids.js · sets.js). */
var SEC_KEY='tsFold_v1', secFoldMap=null, secFoldUid=null;
function secFolds(){ var uid=user().uid||'_'; if(secFoldMap&&secFoldUid===uid) return secFoldMap; secFoldUid=uid; secFoldMap={};
  try{ var all=JSON.parse(localStorage.getItem(SEC_KEY)||'{}'); secFoldMap=all[uid]||{}; }catch(e){} return secFoldMap; }
function secFoldSave(){ try{ var all=JSON.parse(localStorage.getItem(SEC_KEY)||'{}'); all[secFoldUid||'_']=secFoldMap; localStorage.setItem(SEC_KEY,JSON.stringify(all)); }catch(e){} }
window.tsSecFolded=function(k){ return !!secFolds()[k]; };

var SEC_CHEV='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var SEC_PLUS='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5v10M5 10h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
var SEC_CHECK='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3l2.3 2.2 4.7-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var SEC_RANK={overdue:5,due:4,scheduled:3,completed:2,skipped:1};
var SEC_WORD={overdue:'overdue',due:'due',scheduled:'scheduled',completed:'done',skipped:'skipped'};
function secPast(){ return !!(window.tsViewDk&&tsViewDk()!==dayKey()); }
function secQ(k){ return esc(k).replace(/'/g,"\\'"); }

window.tsSecBand=function(sec,so){ var k=sec.key, f=tsSecFolded(k), inf=k==='Continuous Infusions', kq=secQ(k), past=secPast();
  var head='<div class="gsection" role="button" tabindex="0" aria-expanded="'+(!f)+'" onclick="tsSecToggle(\''+kq+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();tsSecToggle(\''+kq+'\');}" title="'+(f?'Show ':'Hide ')+esc(k)+'">'
    +'<svg class="sicon" viewBox="0 0 24 24" fill="none"><path d="'+sec.icon+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'<span class="stitle">'+esc(k)+'</span><span class="scount" data-roll="sec-'+esc(k)+'">'+so.length+'</span>'+(inf&&window.tsInfTotal?tsInfTotal():'')
    +'<span class="sec-chev">'+SEC_CHEV+'</span>'
    +(canOrderTS()&&!past&&k!=='Stopped & completed'?'<button type="button" class="sec-add" onclick="event.stopPropagation();tsSecAdd(\''+kq+'\')" onkeydown="event.stopPropagation()" aria-label="Add to '+esc(k)+'" title="Add to '+esc(k)+'">'+SEC_PLUS+'</button>':'')+'</div>';
  /* hour cells: no "✓ n" badges (they read as "the section is done"). Folded, a section shows where work is waiting — due or overdue, as the
     grid's own shapes — and its title says exactly what it counts. */
  var cells='', cnt={overdue:0,due:0};
  if(!inf){ var nh=Math.floor(nowMin()/60), ids={}, by=[], h; for(h=0;h<24;h++) by.push([]);
    so.forEach(function(o){ if(!o.cont&&!o.dc) ids[o.id]=1; });
    (TASKS||[]).forEach(function(t){ var hh=Math.floor(t.sched/60); if(ids[t.orderId]&&hh>=0&&hh<24) by[hh].push(t); });
    for(h=0;h<24;h++){ var L=by[h], n={}, worst='';
      L.forEach(function(t){ if(t.status) return; var s=deriveStatus(t); if(s==='overdue'||s==='due'){ n[s]=(n[s]||0)+1; cnt[s]++; if(!worst||SEC_RANK[s]>SEC_RANK[worst]) worst=s; } });
      var tip=Object.keys(n).sort(function(a,b){ return SEC_RANK[b]-SEC_RANK[a]; }).map(function(s){ return n[s]+' '+SEC_WORD[s]; }).join(' · ');
      cells+='<div class="hcell sec-h'+(h===nh&&!past?' now':'')+'"'+(tip?' title="'+esc(fmtTime(h*60))+' — '+esc(tip)+'"':'')+'>'
        +(f&&worst?'<span class="sec-dot '+worst+'" aria-hidden="true">'+(worst==='overdue'?MK_CLOCK:'')+'</span>':'')+'</div>'; } }
  /* folded: the header says only what needs you — "1 late" (amber), "2 due now" (accent) — and nothing when nothing does (Oct 2026) */
  if(f&&!inf){ var pills=(cnt.overdue?'<span class="sec-pill late">'+cnt.overdue+' late</span>':'')+(cnt.due?'<span class="sec-pill due">'+cnt.due+' due now</span>':'');
    if(pills) head=head.replace('<span class="sec-chev">','<span class="sec-sum">'+pills+'</span><span class="sec-chev">'); }
  return '<div class="grow gband'+(f?' folded':'')+(inf?' inf':'')+'" data-band="'+esc(k)+'">'+head+(cells?'<div class="hcells">'+cells+'</div>':'')+'</div>'; };

window.tsSecToggle=function(k){ var m=secFolds(), shut=!m[k]; if(m[k]) delete m[k]; else m[k]=1; secFoldSave();
  if(window.tsFoldMotion&&tsFoldMotion(k,shut)) return;   /* the rows fold away or open smoothly, then the grid redraws (store/rowlook.js) */
  try{ buildGrid(); }catch(e){}
  var b=document.querySelector('#sheetInner .gband[data-band="'+k.replace(/"/g,'\\"')+'"] .gsection'); if(b&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.gband')) b.focus(); };
window.tsSecChart=function(k,h){ tsBatch(h,k); };

/* "+": the order search, limited to this section until it closes */
var secPh=null;
window.tsSecAdd=function(k){ if(!canOrderTS()){ toast('Only doctors add orders'); return; } var si=document.getElementById('tsSearch'); if(!si) return;
  if(secPh===null) secPh=si.getAttribute('placeholder')||''; window.tsSearchScope=k; si.setAttribute('placeholder','Add to '+k+'…'); si.value='';
  try{ si.scrollIntoView({block:'nearest'}); }catch(e){} si.focus(); try{ tsRender(''); }catch(e){}
  if(!si._secBlur){ si._secBlur=1; si.addEventListener('blur',function(){ setTimeout(function(){ if(document.activeElement!==si) tsScopeClear(true); },150); }); } };
window.tsScopeClear=function(silent){ if(!window.tsSearchScope) return; window.tsSearchScope=''; var si=document.getElementById('tsSearch');
  if(si&&secPh!==null) si.setAttribute('placeholder',secPh); if(!silent&&si){ si.focus(); try{ tsRender(si.value||''); }catch(e){} } };

/* the band sticks just under the hour header: its height, measured once it exists */
on('rendered',function(){ var g=document.querySelector('#sheetInner .ghead'); if(g&&g.offsetHeight) document.documentElement.style.setProperty('--ts-ghead',g.offsetHeight+'px'); });   /* on the root: #sheetInner is rebuilt with each sheet */
/* ═════════ TS VIEW — how much of the sheet fits on screen (Oct 2026) ═════════
   One "View" button on the grid toolbar: Comfortable / Compact rows, and each section shown or collapsed (with Collapse all / Expand all),
   so medications and patient care are a tap away under a heavy workload. Per person, on this device (localStorage).
   Compact is the default and keeps values, ages and the 44-pt touch targets (styles/suite.css).
   Section bar (above the grid): every section with what's outstanding (overdue · due now); select one to jump there (it opens if collapsed).
   The bar follows the scroll, so it always shows which section you are in. */
var VW_KEY='tsDense_v1';
function vwDense(){ try{ return localStorage.getItem(VW_KEY)!=='0'; }catch(e){ return true; } }   /* compact unless the person chose Comfortable */
function vwApply(){ try{ document.body.classList.toggle('ts-dense',vwDense()); }catch(e){} }
vwApply();
var VW_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
function vwBtn(){ var folded=SECTIONS.filter(function(s){ return window.tsSecFolded&&tsSecFolded(s.key)&&(ORDERS||[]).some(function(o){ return o.section===s.key; }); }).length;
  return '<button type="button" class="btn ghost ts-view-btn" aria-haspopup="true" onclick="tsViewOpen(this)" title="Row density and sections">'+VW_IC+'View'+(vwDense()?' · Compact':'')+(folded?' · '+folded+' collapsed':'')+'</button>'; }
function vwPaint(){ var el=document.getElementById('tsView'); if(!el) return; var h=vwBtn(); if(el.innerHTML!==h) el.innerHTML=h; }
on('sheet.drawn',vwPaint); on('rendered',vwPaint);
function vwPopHTML(){ var d=vwDense(), S=SECTIONS.filter(function(s){ return (ORDERS||[]).some(function(o){ return o.section===s.key; }); });
  var row=function(on,label,sub,click,role){ return '<button type="button" class="fp-row wf-row'+(on?' on':'')+'" role="'+role+'" aria-checked="'+on+'" onclick="'+click+'"><span class="fp-lab"><b>'+label+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span><i class="wf-ck'+(role==='menuitemradio'?' rd':'')+'"></i></button>'; };
  return '<div class="sb-filter-pop wf-pop vw-pop" role="menu" aria-label="View"><div class="wf-h">Rows</div>'
    +row(!d,'Comfortable','Two lines per order, roomy','tsViewDense(0)','menuitemradio')+row(d,'Compact','More orders on screen','tsViewDense(1)','menuitemradio')
    +'<div class="wf-h">Sections</div>'+S.map(function(s){ var n=(ORDERS||[]).filter(function(o){ return o.section===s.key; }).length, shown=!(window.tsSecFolded&&tsSecFolded(s.key));
      return row(shown,esc(s.key),n+' order'+(n>1?'s':'')+(shown?'':' · collapsed'),'tsViewSec(\''+esc(s.key).replace(/'/g,"\\'")+'\')','menuitemcheckbox'); }).join('')
    +'<div class="vw-all"><button type="button" class="fp-clear" onclick="tsViewAll(1)">Collapse all</button><button type="button" class="fp-clear" onclick="tsViewAll(0)">Expand all</button></div></div>'; }
function vwRepaint(){ var p=document.getElementById('flPop'); if(p&&p.querySelector('.vw-pop')) p.innerHTML=vwPopHTML(); vwPaint(); }
window.tsViewOpen=function(a){ _openPop(a,vwPopHTML()); };
window.tsViewDense=function(on){ try{ localStorage.setItem(VW_KEY,on?'1':'0'); }catch(e){} vwApply(); try{ buildGrid(); }catch(e){} vwRepaint(); };
window.tsViewSec=function(k){ tsSecToggle(k); vwRepaint(); };
window.tsViewAll=function(fold){ SECTIONS.forEach(function(s){ var f=tsSecFolded(s.key); if((fold&&!f)||(!fold&&f)) tsSecToggle(s.key); }); vwRepaint(); };

/* ---------- section bar ---------- */
var VW_SHORT={'Basic Observation':'Observations','Continuous Infusions':'Infusions','Patient Care':'Patient care'};
function vwOut(k){ var ids={}, n={overdue:0,due:0}; (ORDERS||[]).forEach(function(o){ if(o.section===k&&!o.cont&&!o.dc) ids[o.id]=1; });
  (TASKS||[]).forEach(function(t){ if(!ids[t.orderId]||t.status) return; var s=deriveStatus(t); if(s==='overdue'||s==='due') n[s]++; }); return n; }
window.tsSecNavPaint=function(){ var el=document.getElementById('tsSecNav'); if(!el) return; var past=window.tsViewDk&&tsViewDk()!==dayKey();
  var S=SECTIONS.filter(function(s){ return (ORDERS||[]).some(function(o){ return o.section===s.key; }); });
  var h=S.map(function(s){ var n=past?{overdue:0,due:0}:vwOut(s.key), f=window.tsSecFolded&&tsSecFolded(s.key), nm=VW_SHORT[s.key]||s.key, cnt=(ORDERS||[]).filter(function(o){ return o.section===s.key; }).length;
      var parts=[n.overdue?n.overdue+' overdue':'',n.due?n.due+' due now':''].filter(Boolean);
      return '<button type="button" class="sn-chip'+(f?' folded':'')+'" data-sec="'+esc(s.key)+'" onclick="tsSecGo(this.dataset.sec)" aria-label="'+esc(nm+', '+cnt+' orders'+(parts.length?', '+parts.join(', '):', nothing outstanding')+(f?', collapsed':''))+'">'
        +'<svg class="sn-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="'+s.icon+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sn-name">'+esc(nm)+'</span>'
        +(n.overdue?'<span class="sn-n late" data-roll="snl-'+esc(s.key)+'">'+n.overdue+' overdue</span>':'')+(n.due?'<span class="sn-n due" data-roll="snd-'+esc(s.key)+'">'+n.due+' due</span>':'')+(!n.overdue&&!n.due?'<span class="sn-n none">'+cnt+'</span>':'')
        +(f?'<span class="sn-f">collapsed</span>':'')+'</button>'; }).join('');
  if(el.innerHTML!==h){ el.innerHTML=h; } tsSecNavSpy(); };
window.tsSecNavSpy=function(){ var sc=document.getElementById('sheetScroll'), el=document.getElementById('tsSecNav'); if(!sc||!el) return; var head=document.querySelector('#sheetInner .ghead'), top=sc.scrollTop+(head?head.offsetHeight:0)+40, cur=null;
  [].forEach.call(document.querySelectorAll('#sheetInner .gband'),function(b){ var r=b.nextElementSibling, y=r&&r.dataset&&r.dataset.sec===b.dataset.band&&r.offsetHeight?r.offsetTop:b.offsetTop; if(y<=top) cur=b.dataset.band; });
  if(!cur){ var f=document.querySelector('#sheetInner .gband'); cur=f&&f.dataset.band; }
  /* at the bottom the last sections can't reach the top: keep the one just chosen */
  if(vwLastGo&&Date.now()-vwLastGo.t<4000&&sc.scrollTop+sc.clientHeight>=sc.scrollHeight-4) cur=vwLastGo.k;
  [].forEach.call(el.querySelectorAll('.sn-chip'),function(c){ var on=c.dataset.sec===cur; c.classList.toggle('on',on); if(on) c.setAttribute('aria-current','true'); else c.removeAttribute('aria-current'); }); };
var vwLastGo=null;
window.tsSecGo=function(k){ vwLastGo={k:k,t:Date.now()}; if(window.tsSecFolded&&tsSecFolded(k)) tsSecToggle(k);
  var sc=document.getElementById('sheetScroll'), head=document.querySelector('#sheetInner .ghead'), band=document.querySelector('#sheetInner .gband[data-band="'+String(k).replace(/"/g,'\\"')+'"]'); if(!sc||!band) return;
  var row=band.nextElementSibling, bandH=band.offsetHeight, y=(row&&row.dataset.sec===k)?row.offsetTop-bandH:band.offsetTop;
  sc.scrollTo({top:Math.max(0,y-(head?head.offsetHeight:0)),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  setTimeout(function(){ var c=document.querySelector('#tsSecNav .sn-chip[data-sec="'+String(k).replace(/"/g,'\\"')+'"]'); tsSecNavSpy(); },450); };
/* ═════════ TS MOVE — drag a treatment to another hour ═════════
   Drag an open cell (not charted yet) along its row to another hour — the patient is asleep, in imaging, being walked.
   Mouse / pen: press and drag. Touch: press and hold, then drag (a quick swipe still scrolls the grid).
   Only that one treatment moves: order.moves['<YYYYMMDD>_<scheduled min>'] = new min (kernel slotMin); the rest of the order keeps
   its times. Allowed for anyone who charts, today only, to this hour or later, and never onto an hour that already has this order.
   The audit records who moved what; Undo puts it back. A moved cell carries a small corner tick and "moved from …" in its tooltip. */
var mvD=null, mvSwallow=false;
function mvTask(id){ return (TASKS||[]).find(function(t){ return t.id===id; })||null; }
function mvOk(t){ return !!(t&&!t.status&&!t.adhoc&&t.key&&t.order&&!t.order.dc&&!t.order.cont&&canChart()&&!(window.tsViewDk&&tsViewDk()!==dayKey())); }
function mvOrig(t){ return +String(t.key).split('_').pop(); }
function mvWhy(t,h){ var nh=Math.floor(nowMin()/60); if(h===Math.floor(t.sched/60)) return 'same';
  if(h<nh) return 'Can’t move into the past'; if(h>23) return 'Tomorrow isn’t on this sheet yet';
  if((TASKS||[]).some(function(x){ return x!==t&&x.orderId===t.orderId&&Math.floor(x.sched/60)===h; })) return esc(t.order.name)+' is already at '+fmtTime(h*60);
  return ''; }
function mvHourAt(x){ var c=mvD.cells.getBoundingClientRect(); return Math.max(0,Math.min(23,Math.floor((x-c.left)/54))); }

function mvStart(){ var d=mvD; d.on=true; var r=d.mk.getBoundingClientRect();
  d.ghost=d.mk.cloneNode(true); d.ghost.removeAttribute('onclick'); d.ghost.removeAttribute('data-t'); d.ghost.classList.add('mv-ghost');
  d.ghost.style.cssText='position:fixed;left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;margin:0';
  document.body.appendChild(d.ghost); d.dx=d.x0-r.left; d.mk.classList.add('mv-origin'); document.body.classList.add('mv-dragging');
  d.drop=document.createElement('div'); d.drop.className='mv-drop'; d.cells.appendChild(d.drop);
  d.tag=document.createElement('div'); d.tag.className='mv-tag'; document.body.appendChild(d.tag);
  if(navigator.vibrate&&d.type==='touch') try{ navigator.vibrate(8); }catch(e){} }
function mvMove(x){ var d=mvD, sh=document.getElementById('sheetScroll'); if(!d||!d.on) return; d.lastX=x;
  var c=d.cells.getBoundingClientRect(), r=d.mk.getBoundingClientRect(), left=Math.max(c.left,Math.min(c.right-r.width,x-d.dx));
  d.ghost.style.left=left+'px'; d.ghost.style.top=r.top+'px';
  var h=mvHourAt(left+r.width/2), why=mvWhy(d.t,h); d.h=h; d.why=why;
  d.drop.style.left=(h*54)+'px'; d.drop.className='mv-drop'+(why==='same'?' same':why?' no':' ok');
  d.tag.className='mv-tag'+(why&&why!=='same'?' no':''); d.tag.innerHTML=why==='same'?esc(fmtTime(d.t.sched)):why?why:'→ '+esc(fmtTime(h*60));
  d.tag.style.left=(left+r.width/2)+'px'; d.tag.style.top=(r.top-8)+'px';
  /* near an edge of the grid: scroll it along */
  if(sh){ var s=sh.getBoundingClientRect(), edge=48, v=x<s.left+(typeof GRID_LW!=='undefined'?GRID_LW:240)+edge?-1:x>s.right-edge?1:0; d.vx=v; if(v&&!d.raf) d.raf=requestAnimationFrame(mvTick); } }
function mvTick(){ var d=mvD, sh=document.getElementById('sheetScroll'); if(!d||!d.on||!d.vx||!sh){ if(d) d.raf=null; return; } sh.scrollLeft+=d.vx*10; mvMove(d.lastX); d.raf=requestAnimationFrame(mvTick); }
function mvEnd(drop){ var d=mvD; mvD=null; if(!d) return; clearTimeout(d.timer); document.removeEventListener('touchmove',mvBlock,{passive:false});
  if(!d.on) return; mvSwallow=true; setTimeout(function(){ mvSwallow=false; },350);
  if(d.raf) cancelAnimationFrame(d.raf); document.body.classList.remove('mv-dragging'); d.mk.classList.remove('mv-origin');
  if(d.drop) d.drop.remove(); if(d.ghost) d.ghost.remove(); if(d.tag) d.tag.remove();
  if(!drop||d.h==null||d.why==='same') return; if(d.why){ toast(d.why); return; } tsMoveTask(d.t.id,d.h); }
function mvBlock(e){ if(mvD&&mvD.on) e.preventDefault(); }

document.addEventListener('pointerdown',function(e){ if(e.button!==0||mvD) return; var mk=e.target.closest&&e.target.closest('#sheetInner .mark[data-t]'); if(!mk) return;
  var t=mvTask(mk.dataset.t); if(!mvOk(t)) return; var cells=mk.closest('.hcells'); if(!cells) return;
  mvD={mk:mk,t:t,cells:cells,x0:e.clientX,y0:e.clientY,lastX:e.clientX,pid:e.pointerId,type:e.pointerType,on:false,timer:null};
  if(e.pointerType==='touch'){ document.addEventListener('touchmove',mvBlock,{passive:false}); mvD.timer=setTimeout(function(){ if(mvD&&!mvD.on){ mvStart(); mvMove(mvD.lastX); } },420); } },true);
document.addEventListener('pointermove',function(e){ var d=mvD; if(!d||e.pointerId!==d.pid) return; var dx=e.clientX-d.x0, dy=e.clientY-d.y0;
  if(!d.on){ if(d.type==='touch'){ if(Math.abs(dx)>8||Math.abs(dy)>8) mvEnd(false); return; } if(Math.abs(dx)>6){ mvStart(); } else return; }
  e.preventDefault(); mvMove(e.clientX); },true);
document.addEventListener('pointerup',function(e){ if(mvD&&e.pointerId===mvD.pid) mvEnd(true); },true);
document.addEventListener('pointercancel',function(e){ if(mvD&&e.pointerId===mvD.pid) mvEnd(false); },true);
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&mvD&&mvD.on){ mvD.h=null; mvEnd(false); } });
document.addEventListener('click',function(e){ if(mvSwallow){ e.stopPropagation(); e.preventDefault(); mvSwallow=false; } },true);   /* the drop isn't a tap */
document.addEventListener('contextmenu',function(e){ if(mvD&&mvD.type==='touch') e.preventDefault(); });

/* the move itself — also callable on its own (tests, keyboard) */
window.tsMoveTask=function(id,h){ var t=mvTask(id); if(!mvOk(t)) return false; var why=mvWhy(t,h); if(why){ if(why!=='same') toast(why); return false; }
  var o=orderById(t.orderId); if(!o) return false; var dk=dayKey(), orig=mvOrig(t), from=t.sched, to=h*60, me=user(), before=o.moves?Object.assign({},o.moves):null;
  var mv=Object.assign({},o.moves||{}), y=prevDk(dk); Object.keys(mv).forEach(function(k){ if(k.slice(0,8)<y) delete mv[k]; });   /* keep only today's and yesterday's */
  if(to===orig) delete mv[dk+'_'+orig]; else mv[dk+'_'+orig]=to;
  logEvent(o.type==='med'?'med':o.type==='obs'?'vital':'care','<b>'+esc(o.name)+'</b> '+esc(fmtTime(from))+' moved to '+esc(fmtTime(to)),me.initials);
  updateOrder(o.id,{moves:Object.keys(mv).length?mv:null});
  undoToast(esc(o.name)+' moved to '+esc(fmtTime(to)),function(){ logEvent('doctor','<b>'+esc(o.name)+'</b> back to '+esc(fmtTime(from)),me.initials); updateOrder(o.id,{moves:before}); });
  return true; };
/* ═════════ TS SEEN — "what changed since you last looked" ═════════
   Each person's last look at each sheet is kept in this browser (localStorage tsSeen_v1: {uid: {sheetId: iso}}).
   Opening a sheet compares it with that moment: other people's order changes (added, changed, stopped, moved), problem-list edits,
   notes, and readings outside the hospital limits. Routine charting is not a change. A pill in the toolbar says how many
   ("3 changes since 7:05 AM"); tap it for the list. Rows that changed glow once when the sheet opens.
   The first time someone opens a sheet there is nothing to compare with, so nothing shows. */
var SEEN_KEY='tsSeen_v1', seenSince={}, seenCur=null, seenGlowed={};
function seenRead(){ try{ return JSON.parse(localStorage.getItem(SEEN_KEY)||'{}')||{}; }catch(e){ return {}; } }
function seenWrite(id,iso){ try{ var a=seenRead(), u=user().uid||'_', m=a[u]||(a[u]={}); m[id]=iso;
    var ks=Object.keys(m); if(ks.length>300) ks.sort(function(x,y){ return String(m[x]).localeCompare(String(m[y])); }).slice(0,ks.length-300).forEach(function(k){ delete m[k]; });
    localStorage.setItem(SEEN_KEY,JSON.stringify(a)); }catch(e){} }
/* a sheet opened: remember when this person last looked, then mark it looked at now */
function seenOpen(){ if(!CUR||!curDoc||CUR===seenCur) return; var now=new Date().toISOString(), u=user().uid||'_';
  if(seenCur) seenWrite(seenCur,now); seenCur=CUR; seenSince[CUR]=(seenRead()[u]||{})[CUR]||null; seenWrite(CUR,now); }
window.addEventListener('pagehide',function(){ if(seenCur) seenWrite(seenCur,new Date().toISOString()); });

function seenMine(x){ var me=user(); return x.uid?x.uid===me.uid:(!!x.who&&x.who===me.initials); }
function seenList(){ var since=seenSince[CUR]; if(!since||!curDoc) return []; var out=[], O=curDoc.orders||{};
  (curDoc.audit||[]).forEach(function(a){ if(!a||!a.at||a.at<=since||seenMine(a)) return;
    if(a.type!=='doctor'&&a.type!=='comm'&&!/ moved to | back to /.test(a.desc||'')) return;   /* routine charting is not a change */
    out.push({at:a.at,who:a.who||'',desc:a.desc||''}); });
  (curDoc.notes||[]).forEach(function(n){ if(!n||!n.at||n.at<=since||seenMine({uid:n.uid,who:n.author})) return;
    out.push({at:n.at,who:n.author||'',desc:esc(String(n.type||'').replace(/^./,function(c){ return c.toUpperCase(); }))+' note — '+esc(String(n.body||'').slice(0,90))}); });
  Object.keys(curDoc.marks||{}).forEach(function(k){ var m=curDoc.marks[k], o=m&&O[m.orderId]; if(!o||m.status!=='completed'||!m.at||m.at<=since||m.value==null||seenMine(m)) return;
    var tone=vTone(o,m.value); if(!tone) return;
    out.push({at:m.at,who:m.by||'',oid:o.id,tone:tone,desc:'<b>'+esc(o.name)+'</b> '+esc(m.value)+(o.unit?' '+esc(o.unit):'')+' — '+(tone==='coral'?'critical':'outside normal')}); });
  return out.sort(function(a,b){ return String(b.at).localeCompare(String(a.at)); }); }
/* the rows to point at: orders added, stopped or moved since, and abnormal readings */
function seenRows(L){ var since=seenSince[CUR], ids={}; if(!since) return ids; var O=curDoc.orders||{};
  Object.keys(O).forEach(function(id){ var o=O[id]; if(!o) return; if((o.ordered_at&&o.ordered_at>since&&o.ordered_by!==user().initials)||(o.dc_at&&o.dc_at>since)) ids[id]=1; });
  L.forEach(function(x){ if(x.oid) ids[x.oid]=1; }); return ids; }
function seenTime(iso){ var d=new Date(iso), t=new Date(); return (d.toDateString()===t.toDateString()?'':(d.getMonth()+1)+'/'+d.getDate()+' ')+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }

function seenPaint(){ seenOpen(); var el=document.getElementById('tsSeen'); if(!el) return; var L=seenList(), since=seenSince[CUR];
  var h=L.length?'<button type="button" class="ts-seen'+(L.some(function(x){ return x.tone==='coral'; })?' crit':'')+'" onclick="tsSeenOpen()" title="Changes by others since you last opened this sheet"><span class="ts-seen-dot"></span>'+L.length+' change'+(L.length>1?'s':'')+' since '+esc(seenTime(since))+'</button>':'';
  if(el.innerHTML!==h) el.innerHTML=h;
  if(L.length&&!seenGlowed[CUR]){ seenGlowed[CUR]=1; var ids=seenRows(L); setTimeout(function(){ Object.keys(ids).forEach(function(id){ var r=document.querySelector('#sheetInner .grow[data-o="'+id+'"]'); if(r){ r.classList.remove('ts-flash'); void r.offsetWidth; r.classList.add('ts-flash'); } }); },350); } }
on('header.refresh',seenPaint);
on('rendered',seenPaint);
on('sheet.drawn',seenPaint);

window.tsSeenOpen=function(){ var L=seenList(), since=seenSince[CUR]; if(!L.length) return;
  var html='<div class="op-head"><span class="op-ic"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">Since you last looked · '+esc(seenTime(since))+'</div><h3>'+esc(VISIT.patient||'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<div class="op-list sn-list">'+L.map(function(x){ return '<div class="op-row'+(x.tone?' sn-'+x.tone:'')+'"'+(x.oid?' onclick="tsSeenShow(\''+esc(x.oid)+'\')" style="cursor:pointer"':'')+'><span>'+esc(seenTime(x.at))+'</span><b>'+x.desc+(x.who?'<small> — '+esc(x.who)+'</small>':'')+'</b></div>'; }).join('')+'</div>'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Close</button><button type="button" class="op-btn primary" onclick="tsSeenDone()">Mark as seen</button></div>';
  opShow(html,'wide'); };
window.tsSeenShow=function(id){ tsOrderClose(); var r=document.querySelector('#sheetInner .grow[data-o="'+id+'"]'); if(!r) return; try{ r.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'}); }catch(e){ r.scrollIntoView(); } r.classList.remove('ts-flash'); void r.offsetWidth; r.classList.add('ts-flash'); };
window.tsSeenDone=function(){ seenSince[CUR]=new Date().toISOString(); tsOrderClose(); seenPaint(); };
/* ═════════ TS CHARGES — charge capture from the treatment sheet (VCA Coding Handbook v10.6) ═════════
   The Charges tab lists, day by day for the whole stay (Day 1 = admission day), everything the sheet says was done, with its VCA code and quantity, so the front desk
   can enter it in the invoice and nothing is missed. It does not bill or price anything; the PIMS stays the invoice.
     Hospitalization  HOSP Setup on day 1 + HOSP/Hour Level 1–4 by species and size (K9 Sm ≤ 27.7 kg, K9 Lg above), hours per calendar day,
                      counted automatically from admission to now (or discharge). The level is worked out from the sheet with the handbook's
                      level definitions (see chAutoAt); the doctor can override it (sheet.hosp_levels = [{at, level, by}], 0 = automatic).
     Monitoring       services ordered on the sheet that the handbook charges by the hour (oxygen, ECG / BP / pulse-ox monitors, CVP):
                      Setup on the order's first day only + per hour while it is ordered.
     Fluids & CRIs    Fluid IV Set-Up (hourly) on the day it starts + Maintenance/hr hours that day; additives → Fluid Additives pick list.
                      CRI: syringe pump (or piggyback, when the carrier says so) Setup + Maintenance/hr, and the drug's ADD code from the pick list.
     Treatments       every charted administration / reading of an order that carries a code (order.code, or the hospital's code for that
                      drug or test, charge_codes/map, or a built-in first/recheck pair: glucose, blood pressure, PCV/TP). Basic observations and
                      nursing care are part of hospitalization. Anything charted with no code shows "Needs a code".
     Added charges    codes added by hand (exam, catheter placement …): sheet.charges_extra.{id} = {dk, code, name, qty, at, by}.
   Ticking a line means "entered on the invoice": sheet.charges_done.{key} = {at, by, q}; if more is charted after (more hours), the line
   asks to be updated. The code list itself (2,400+ codes) is in Firestore charge_codes/{meta, p1…} — staff can read it, only admin writes it;
   it is never shipped with the app. Prices are this hospital's (charge_codes/prices), set by the owner/admin by tapping a price.
   */
var CH_CODES=null, CH_IX={}, CH_P=null, CH_MAP={}, CH_ADMIN_FILE=null;
/* this hospital's prices (charge_codes/prices, written by the owner/admin): codes = {code: price}; items = {order name: {price, code}}
   for things priced by the hospital that the handbook has no master price or code for (e.g. the Nova panel) */
var CH_PRICES={codes:{},items:{},fees:{}};
function chDB(){ return DB&&DB.collection?DB.collection('charge_codes'):null; }
function chLoad(){ if(CH_CODES) return Promise.resolve(CH_CODES); if(CH_P) return CH_P; var col=chDB(); if(!col) return Promise.resolve([]);
  CH_P=col.doc('meta').get().then(function(m){ var meta=m.exists?m.data():null, parts=(meta&&meta.parts)||[];
      return Promise.all(parts.map(function(id){ return col.doc(id).get(); })).then(function(S){ var L=[];
        S.forEach(function(s){ if(s.exists) (s.data().rows||[]).forEach(function(r){ L.push(Array.isArray(r)?{c:r[0],n:r[1],d:r[2]||''}:{c:r.c,n:r.n,d:r.d||'',u:r.u||'',t:r.t||''});   /* u: the invoice unit (mL, tab, hr …) · t: WOOFware type (IHINJ, IHMED, DISP …) */ });   /* rows are {c,n,d}: Firestore forbids nested arrays */ });
        CH_CODES=L; CH_IX={}; CH_DX=null; L.forEach(function(x){ CH_IX[x.c]=x; }); CH_CODES.version=meta&&meta.version; return L; }); })
    .then(function(L){ return chLoadPrices().then(function(){ return L; }); })
    .catch(function(e){ console.warn('[charges] code list',e); CH_P=null; return []; });
  return CH_P; }
/* prices + the hospital's codes per drug/test: two small documents, read once per session (the projection on the estimate card needs them);
   the full code list (chLoad) is read only when the Charges tab or a code search opens */
var CH_PP=null, CH_PP_OK=false;
function chLoadPrices(){ if(CH_PP) return CH_PP; var col=chDB(); if(!col) return Promise.resolve();
  CH_PP=Promise.all([col.doc('map').get().then(function(s){ CH_MAP=(s.exists&&s.data().codes)||{}; },function(){}),
    col.doc('prices').get().then(function(s){ var d=s.exists?s.data():{}; CH_PRICES={codes:d.codes||{},items:d.items||{},fees:d.fees||{}};   /* fees: WOOFware's fee per invoice entry (e.g. the injection fee), added once per entry on top of unit price × quantity */ },function(){})])
    .then(function(){ CH_PP_OK=true; try{ refreshHeader(); }catch(e){} }); return CH_PP; }
on('header.refresh',function(){ if(!CH_PP&&CUR&&curDoc) chLoadPrices(); if(!CH_CODES&&!CH_P&&CUR&&curDoc) chLoad().then(function(L){ if(L&&L.length) try{ refreshHeader(); }catch(e){} }); });
function chName(code,fallback){ var x=CH_IX[code]; return x?x.n:(fallback||''); }

/* ---------- the patient ---------- */
function chSp(){ var s=String(VISIT.species||(curDoc&&curDoc.patient&&curDoc.patient.species)||'').toLowerCase();
  return /cat|fel/.test(s)?'cat':/dog|can|k9/.test(s)?'dog':'zm'; }
function chHospCode(level){ var sp=chSp(), kg=Number(VISIT.weight)||0, L=level-1;
  if(sp==='cat') return '49.25'+L; if(sp==='dog') return (kg&&kg<=27.7?'49.26':'49.27')+L; return null; }   /* ZooMed: size isn't on the sheet → pick the code */
/* ---------- the hospitalization level, worked out from the sheet (Coding Handbook "HOSP per Hour Level Definitions") ----------
   Level 1  every hospitalized patient (TPR, visits every 2–4 h, not on continuous IV fluids)
   Level 2  IV fluids or another IV infusion running; non-invasive monitoring (ECG, blood pressure, pulse oximetry monitor); checks every hour;
            conditions that can become unstable quickly — seizures, renal failure, cardiac disease
   Level 3  oxygen supplementation; blood products / antivenin; invasive monitoring (CVP, direct blood pressure); DKA, pneumonia / dyspnea,
            active bleeding, unstable after major surgery
   Level 4  continual one-on-one care — the doctor's call (never automatic)
   It is worked out for each stretch of the stay between changes (an order started or stopped, a problem added or resolved), so the hours
   split between levels by themselves.
   The doctor can override it from a moment on (sheet.hosp_levels = [{at, level 1–4 | 0 = automatic again, by}]). */
var CH_L3_PROB=/ketoacidosis|\bdka\b|pneumonia|dyspn|respiratory distress|bleed|hemorrhag|haemorrhag|hemoabdomen|hemothorax|coagulopath|\bdic\b|rodenticide|\bgdv\b|post.?op/i;
var CH_L2_PROB=/seizure|status epilepticus|renal|kidney|\baki\b|azotemi|uremi|cardiac|heart|arrhythmi|\bchf\b|tachycard|bradycard/i;
var CH_L3_ORD=/oxygen(?! check)|\bo2\b|\bcvp\b|central venous|direct (blood pressure|bp)|arterial line|transfusion|\bprbc|whole blood|fresh frozen|\bffp\b|\bplasma\b(?!-?lyte)|cryo|antivenin|antivenom/i;
var CH_L2_ORD=/ecg monitor|telemetry|continuous ecg|blood pressure monitor|continuous (bp|blood pressure)|pulse ox(imetry)? monitor|spo2 monitor|neuro check/i;
function chOverrides(){ var H=curDoc&&curDoc.hosp_levels; return (Array.isArray(H)?H:[]).filter(function(x){ return x&&x.at!=null&&x.level!=null; }).slice().sort(function(a,b){ return String(a.at).localeCompare(String(b.at)); }); }
function chOverrideAt(t){ var L=chOverrides(), cur=0; L.forEach(function(x){ if(tms(x.at)<=t) cur=+x.level||0; }); return cur; }
function chActive(o,t){ if(o.draft) return false; var f=o.cont?startMs(o):tms(o.ordered_at)||chAdm(), e=o.dc&&o.dc_at?tms(o.dc_at):Infinity; return t>=f&&t<e; }
function chProblemsAt(t){ var P=(curDoc&&curDoc.patient)||{}, L=Array.isArray(P.problem_list)?P.problem_list:(P.problems||(P.reason?[P.reason]:[])).map(function(x){ return {text:x}; });
  return L.filter(function(x){ return x&&x.text&&(!x.added_at||tms(x.added_at)<=t)&&(!x.resolved_at||tms(x.resolved_at)>t); }).map(function(x){ return x.text; }); }
function chHourly(o){ return /^q1h$|^q30m|^q15m|^continuous$/i.test(String(o.freq||'')); }
/* {level, why[]} at moment t */
function chAutoAt(t){ var O=Object.keys((curDoc&&curDoc.orders)||{}).map(function(k){ return curDoc.orders[k]; }).filter(function(o){ return o&&chActive(o,t); }), w3=[], w2=[];
  O.forEach(function(o){ var n=String(o.name||'');
    if(CH_L3_ORD.test(n)) w3.push(n); else if(isInf(o)) w2.push(o.kind==='cri'?n+' CRI':'IV fluids'); else if(CH_L2_ORD.test(n)) w2.push(n); else if(!o.cont&&o.type!=='med'&&chHourly(o)) w2.push(n+' hourly'); });
  chProblemsAt(t).forEach(function(p){ if(CH_L3_PROB.test(p)) w3.push(p); else if(CH_L2_PROB.test(p)) w2.push(p); });
  var u=function(a){ return a.filter(function(x,i){ return a.indexOf(x)===i; }); };
  return w3.length?{level:3,why:u(w3)}:w2.length?{level:2,why:u(w2)}:{level:1,why:[]}; }
function chLevelAt(t){ var ov=chOverrideAt(t); if(ov) return {level:ov,why:['set by the doctor'],manual:true}; return chAutoAt(t); }
function chLevelNow(){ return chLevelAt(Math.min(Date.now(),chEnd())); }
function chAdm(){ return tms(curDoc&&(curDoc.admitted_at||curDoc.created_at)); }
function chEnd(){ if(curDoc&&curDoc.status==='closed'&&curDoc.closed_at) return tms(curDoc.closed_at); return CH_UNTIL||Date.now(); }
/* projection: while CH_UNTIL is set, every line is worked out as if the sheet ran on unchanged until then (chProject) */
var CH_UNTIL=null, CH_SIM={};
/* treatments still to come for an order on one day, up to CH_UNTIL (scheduled times after now, before it stops) */
function chFuture(o,dk){ if(!CH_UNTIL||o.dc||o.freq==='PRN') return 0; var W=chWin(dk), a=Math.max(Date.now(),W[0],tms(o.ordered_at)||0), b=Math.min(CH_UNTIL,W[1]), M=(curDoc&&curDoc.marks)||{}, n=0;
  if(!(b>a)) return 0; freqTimes(o).forEach(function(h){ var t=W[0]+slotMin(o,dk,h*60)*60000, m=M[dk+'_'+o.id+'_'+(h*60)]; if(t>a&&t<=b&&!(m&&m.status)) n++; }); return n; }
function chHrs(ms){ return ms>0?Math.ceil(ms/3600000-0.0001):0; }
function chWin(dk){ var d0=dkDate(dk).getTime(); return [d0,d0+864e5]; }

/* ---------- the lines for one day ---------- */
var CH_PAIRS=[[/^blood glucose|^glucose/i,'101.208','101.1174'],[/^blood pressure/i,'39.19','39.530'],[/^pcv\s*\/?\s*t[ps]/i,'101.259','101.282'],[/^pcv$/i,'101.247','101.282']];
function chMarksOf(o){ var M=Object.assign({},chOldMarks,(curDoc&&curDoc.marks)||{}), out=[]; Object.keys(M).forEach(function(k){ var m=M[k]; if(m&&m.status==='completed'&&m.orderId===o.id&&/^\d{8}_/.test(k)) out.push({dk:k.slice(0,8),k:k,m:m}); });
  (TASKS||[]).forEach(function(t){ if(t.orderId===o.id&&t.status==='completed'&&t.key&&!M[t.key]) out.push({dk:t.key.slice(0,8),k:t.key,m:{by:t.by,value:t.value,min:t.completedMin}}); });
  return out.sort(function(a,b){ return a.k.localeCompare(b.k); }); }
function chOrderCode(o){ if(o.code) return {c:o.code,src:'order'}; var k=String(o.name||'').trim().toLowerCase(); if(CH_MAP[k]) return {c:CH_MAP[k],src:'map'};
  var it=CH_PRICES.items[k]; if(it&&it.code) return {c:it.code,src:'item',item:k};
  var dc=chDrugCode(o); if(dc){ if(it) dc.item=k; return dc; }   /* the drug's own code; a price set per dose for the drug still counts until the code has a price */
  if(it) return {c:'',src:'item',item:k};
  for(var i=0;i<CH_PAIRS.length;i++) if(CH_PAIRS[i][0].test(String(o.name||'').trim())) return {c:CH_PAIRS[i][1],re:CH_PAIRS[i][2],src:'pair'}; return null; }
/* ---------- drug codes (WOOFware catalog, verified list Oct 2026): a medication order finds its own code by drug, strength and route ----------
   Injectable on the sheet (IV · IM · SC · IO) → the IHINJ code for that drug at the order's stock concentration; invoiced in mL actually given.
   By mouth → the IHMED tablet / capsule that makes the dose in whole or half tablets (or the oral suspension at the order's mg/mL), in tablets or mL.
   A code typed on the order, or remembered for the drug (charge_codes/map), always wins. Nothing matched → "Needs a code" as before. */
var CH_DX=null;
function chGen(s){ return String(s||'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/\b(gen|generic|hcl|hydrochloride|sodium|potassium|citrate|sulfate|phosphate|tartrate|maleate|mesylate|acetate|succinate|hyclate|base|inj|injection)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim(); }
function chDxIndex(){ if(CH_DX) return CH_DX; CH_DX={}; (CH_CODES||[]).forEach(function(x){ var n=String(x.n||'').replace(/\/mL\/mL/gi,'/mL'), t=x.t||((n.match(/\b(IHINJ|IHMED)\s*$/)||[])[1]||''); if(t!=='IHINJ'&&t!=='IHMED') return;
    if(/\d+\s*ct\b|\bpatch\b/i.test(n)) return;   /* case counts and patches are not doses */
    var core=n.replace(/\s*(IHINJ|IHMED)\s*$/,''), m=core.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|meq|u|iu|units?)\s*\/\s*ml/i), ml=!!m; if(!m) m=core.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|meq|u|iu|units?)\b/i); if(!m) return;
    var lead=core.slice(0,core.search(/\d/)), g=chGen(lead); if(!g) return; var su=m[2].toLowerCase(), sv=+m[1]*(su==='mcg'?0.001:su==='g'?1000:1), form=core.slice(m.index+m[0].length).toLowerCase();
    (CH_DX[g]=CH_DX[g]||[]).push({c:x.c,t:t,s:sv,ml:ml,form:form,u:x.u&&x.u!=='each'?x.u:(ml?'mL':/cap/i.test(form)?'cap':'tab'),unitWord:su}); }); return CH_DX; }
function chRound(n){ return Math.round(n*100)/100; }
function chFeeCount(l){ return l&&l.unit==='hr'?(+l.qty||0):(l&&l.n||1); }   /* hourly codes (HOSP/hr, fluids/hr, oxygen/hr) carry their fee on every hour; everything else once per invoice entry */
function chFee(l){ var f=l&&l.code&&CH_PRICES.fees&&CH_PRICES.fees[l.code]; return f?+f:0; }
function chCodePriced(c){ var v=c&&CH_PRICES.codes[c]; return v!=null&&v!==''; }
/* bill in mL / tablets when the code itself is priced (or nothing is); a per-dose price set for the drug counts doses */
function chByUnit(cc){ return !!(cc&&cc.per&&(chCodePriced(cc.c)||!cc.item)); }
function chDrugCode(o){ if(!o||o.type!=='med'||!CH_CODES) return null; var X=chDxIndex(), g=chGen(o.name), L=X[g];
  if(!L){ var ks=Object.keys(X).filter(function(k){ return k.split(' ')[0]===g.split(' ')[0]; }); if(ks.length===1) L=X[ks[0]]; }
  if(!L||!L.length) return null; var r=String(o.route||''), d=window.medDose?medDose(o):null, total=d?d.raw:0, base=String(o.unit||'mg').split('/')[0].toLowerCase(), f=base==='mcg'?0.001:base==='g'?1000:1, mg=total*f, conc=o.conc?Number(o.conc)*f:0;   /* the dose and the stock strength are in the dose's unit (mcg, mg, U …): compare in mg */
  if(/^(iv|im|sc|sq|io|subq|intra)/i.test(r)){ var I=L.filter(function(x){ return x.t==='IHINJ'&&x.ml; }), pick=null;
    if(conc) pick=I.filter(function(x){ return Math.abs(x.s-conc)<1e-6*Math.max(1,conc); })[0]||null; else if(I.length===1) pick=I[0];
    if(!pick) return null; var ml=pick.s>0&&mg>0?mg/pick.s:(d&&parseFloat(d.volume))||0; return {c:pick.c,src:'drug',u:'mL',per:ml>0?chRound(ml):null}; }
  if(/^(po|oral)/i.test(r)){ var M=L.filter(function(x){ return x.t==='IHMED'; }); if(!M.length||!(mg>0)) return null;
    var sus=conc?M.filter(function(x){ return x.ml&&Math.abs(x.s-conc)<1e-6*Math.max(1,conc); })[0]:null; if(sus) return {c:sus.c,src:'drug',u:'mL',per:chRound(mg/sus.s)};
    /* tablets: the strength whose whole (or half) tablets come within 12.5% of the dose, fewest whole tablets first — 182 mg → 2 × 100 mg */
    var best=null; M.filter(function(x){ return !x.ml&&x.s>0; }).forEach(function(x){ var n=mg/x.s, h=Math.round(n*2)/2; if(h<0.5||h>6||Math.abs(n-h)>0.125*n) return; var sc=(h%1?10:0)+h+Math.abs(n-h)/n; if(!best||sc<best.sc) best={x:x,n:h,sc:sc}; });
    return best?{c:best.x.c,src:'drug',u:best.x.u,per:best.n}:null; }
  return null; }
/* services charged by the hour while ordered — the handbook: "Setup code: invoice only on the 1st day. Monitoring/hr: invoice … repeated each day" */
var CH_CONT=[[/oxygen.*(nasal|cannula)/i,'51.32','51.34'],[/oxygen.*high.?flow|high.?flow.*oxygen/i,'51.80','51.82'],[/oxygen.*(mask|facial)/i,'51.30','51.34'],[/oxygen(?! check)|\bo2 cage/i,'51.29','51.34'],
  [/ecg monitor|telemetry|continuous ecg/i,'39.59','39.60'],[/direct (blood pressure|bp)|arterial line/i,'','39.546'],[/blood pressure monitor|continuous (bp|blood pressure)/i,'39.56','39.57'],
  [/pulse ox(imetry)? monitor|spo2 monitor|continuous (pulse ox|spo2)/i,'39.344','39.345'],[/\bcvp\b|central venous/i,'39.44','39.339']];
function chContinuous(o){ if(o.cont||o.type==='med'||o.code) return null; var n=String(o.name||''); for(var i=0;i<CH_CONT.length;i++) if(CH_CONT[i][0].test(n)) return [CH_CONT[i][1],CH_CONT[i][2]]; return null; }
function chActiveFrom(o){ return Math.max(tms(o.ordered_at)||chAdm(),chAdm()); }
function chPriceOf(l){ var c=l.code&&CH_PRICES.codes[l.code]; if(c!=null&&c!=='') return +c; var it=l.item&&CH_PRICES.items[l.item]; return it&&it.price!=null?+it.price:null; }
function chMoney(n){ return n==null?'':'$'+n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
/* what is still to enter on a line: all of it, or — when more was charted after it was ticked — the difference (hourly fees per hour, other fees per new entry) */
function chDiff(l){ if(!l.more) return {q:l.qty,amt:l.total}; var d=((curDoc&&curDoc.charges_done)||{})[l.key]||{}, dq=Math.round((l.qty-(d.q||0))*100)/100;
  if(l.price==null) return {q:dq,amt:null}; var dn=l.unit==='hr'?dq:Math.max(0,(l.n||1)-(d.n!=null?d.n:Math.round((l.n||1)*(d.q||0)/(l.qty||1))));
  return {q:dq,amt:Math.round((l.price*dq+(l.fee||0)*dn)*100)/100}; }
function chIncluded(o){ return (o.type==='obs'||o.type==='care')&&!chOrderCode(o); }   /* part of hospitalization */
/* the moments in [a,b) where the level can change: orders, infusions, problems, the doctor's override */
function chCuts(a,b){ var cuts=[a,b];
  Object.keys(curDoc.orders||{}).forEach(function(k){ var o=curDoc.orders[k]; if(!o) return; [o.cont?startMs(o):tms(o.ordered_at),o.dc&&o.dc_at?tms(o.dc_at):0].forEach(function(t){ if(t>a&&t<b) cuts.push(t); }); });
  var PL=(curDoc.patient||{}).problem_list; (Array.isArray(PL)?PL:[]).forEach(function(x){ [tms(x&&x.added_at),tms(x&&x.resolved_at)].forEach(function(t){ if(t>a&&t<b) cuts.push(t); }); });
  chOverrides().forEach(function(x){ var t=tms(x.at); if(t>a&&t<b) cuts.push(t); });
  return cuts.sort(function(x,y){ return x-y; }); }
/* hours per level for a day, by a level rule (chLevelAt = what is billed, chAutoAt = what the sheet works out) — the same split chLines bills */
function chHoursBy(dk,lvFn){ var W=chWin(dk), a=Math.max(chAdm(),W[0]), b=Math.min(chEnd(),W[1]), byL={}, hrs={}; if(!chAdm()||!(b>a)) return hrs;
  var cuts=chCuts(a,b); for(var i=0;i<cuts.length-1;i++){ var f=cuts[i], e=cuts[i+1]; if(!(e>f)) continue; var l=lvFn((f+e)/2).level; byL[l]=(byL[l]||0)+(e-f); }
  var left=chHrs(b-a); Object.keys(byL).map(Number).sort().reverse().forEach(function(l,i,A){ var h=i===A.length-1?left:Math.min(chHrs(byL[l]),left); hrs[l]=h; left-=h; }); return hrs; }
function chHourCost(hrs){ var t=0; Object.keys(hrs).forEach(function(l){ var c=chHospCode(+l); if(!c||!hrs[l]) return; var p=CH_PRICES.codes[c]; if(p==null||p==='') return; t+=hrs[l]*(+p+chFee({code:c})); }); return Math.round(t*100)/100; }
/* hospitalization billed below the level the sheet works out (the doctor lowered it): per day, the hours each way and the dollars between them.
   Shown in the charge check and saved with the close (charge_check.lowered) for the owner's report (store/levels.js). */
function chLowered(){ if(!curDoc) return []; var out=[], O=chOverrides();
  chDays().forEach(function(dk,i){ var billed=chHoursBy(dk,chLevelAt), auto=chHoursBy(dk,chAutoAt), bc=chHourCost(billed), ac=chHourCost(auto);
    var lower=Object.keys(billed).some(function(l){ return billed[l]&&Object.keys(auto).some(function(m){ return +m>+l&&auto[m]; }); });
    if(!lower||!(ac>bc)) return; var W=chWin(dk), by=O.filter(function(x){ var t=tms(x.at); return t<W[1]&&+x.level; }).map(function(x){ return x.by_name||x.by||''; }).filter(Boolean);
    out.push({dk:dk,day:i+1,billed:billed,auto:auto,diff:Math.round((ac-bc)*100)/100,by:by.filter(function(x,j,A){ return A.indexOf(x)===j; })}); });
  return out; }
window.tsChLowered=function(){ return chLowered(); };
function chLines(dk){ if(!curDoc) return []; var L=[], W=chWin(dk), adm=chAdm(), end=chEnd(), sp=chSp();
  var add=function(g,key,code,name,qty,unit,note,x){ L.push(Object.assign({g:g,key:dk+'_'+key,code:code||'',name:name||chName(code),qty:qty,unit:unit||'',note:note||''},x||{})); };
  /* hospitalization */
  var a=Math.max(adm,W[0]), b=Math.min(end,W[1]);
  if(adm&&b>a){ if(dayKey(new Date(adm))===dk) add('hosp','hosp_setup',sp==='zm'?'49.319':'49.320',sp==='zm'?'HOSP Setup ZM':'HOSP Setup K9/Feline',1,'','Day 1 of the stay');
    /* hours per level add up to the hours in hospital that day */
    var byL={}, why={}, cuts=chCuts(a,b);
    for(var i=0;i<cuts.length-1;i++){ var f=cuts[i], e=cuts[i+1]; if(!(e>f)) continue; var lv=chLevelAt((f+e)/2); byL[lv.level]=(byL[lv.level]||0)+(e-f); (why[lv.level]=why[lv.level]||[]).push.apply(why[lv.level],lv.why); }
    /* a started hour counts as an hour (like the fluids per hour); the higher level gets its started hours, the lowest level the rest,
       so the levels always add up to the hours in hospital that day */
    var tot=chHrs(b-a), ks=Object.keys(byL).map(Number).sort(), hrs={}, left=tot;
    ks.slice().reverse().forEach(function(l,i,A){ var h=i===A.length-1?left:Math.min(chHrs(byL[l]),left); hrs[l]=h; left-=h; });
    ks.forEach(function(l){ var h=hrs[l]; if(!(h>0)) return; var c=chHospCode(l), W2=(why[l]||[]).filter(function(x,i,A){ return A.indexOf(x)===i; });
      add('hosp','hosp_L'+l,c,c?chName(c,'HOSP/Hour Level '+l):'HOSP/Hour Level '+l+' ZM',h,'hr',(W2.length?esc(W2.slice(0,3).join(' · ')):'Hospitalized')+(c?'':' — ZooMed: choose the size code'),c?null:{warn:'code'}); }); }
  /* infusions + charted orders */
  var O=Object.keys(curDoc.orders||{}).map(function(k){ return curDoc.orders[k]; }).filter(Boolean);
  O.forEach(function(o){ if(o.draft) return;   /* not approved yet: nothing to charge */
    if(isInf(o)){ var s=startMs(o), e=Math.min(endMs(o),end), f=Math.max(s,W[0]), t=Math.min(e,W[1]); if(!(t>f)) return; var h=chHrs(t-f), first=dayKey(new Date(s))===dk;
      if(o.kind==='fluid'){ if(first) add('inf','fl_'+o.id+'_s',sp==='zm'?'37.82':'37.83',sp==='zm'?'Fluid IV Set-Up ZM (hourly)':'Fluid IV Set-Up (hourly)',1,'',esc(o.name));
        add('inf','fl_'+o.id+'_h',sp==='zm'?'37.87':'37.84',sp==='zm'?'Fluid IV Maintenance/hr ZM':'Fluid IV Maintenance/hr',h,'hr',esc(o.name)+(o.dc?' · stopped':''));
        if(o.additive&&first) add('inf','fl_'+o.id+'_a','37.300','Fluid Additives (Pick List)',1,'','Add: '+esc(o.additive)+' — choose the additive in the pick list'); }
      else { var pig=/piggy|in\s+(lrs|plasma|normosol|nacl|saline|fluid|the bag)/i.test(o.carrier||'');
        if(first) add('inf','cri_'+o.id+'_s',pig?'37.110':'37.108',pig?'CRI Piggyback Setup':'CRI Syringe Pump Setup',1,'',esc(o.name)+' CRI');
        add('inf','cri_'+o.id+'_h',pig?'37.111':'37.109',pig?'CRI Piggyback Maintenance/hour':'CRI Syringe Pump Maintenance/hour',h,'hr',esc(o.name)+' CRI'+(o.dc?' · stopped':''));
        add('inf','cri_'+o.id+'_d','37.107','CRI Medications to ADD (Pick List)',1,'','Choose the '+esc(o.name)+' ADD code in the pick list'); }
      return; }
    var cs=chContinuous(o); if(cs){ var cf=Math.max(chActiveFrom(o),W[0]), ct=Math.min(o.dc&&o.dc_at?tms(o.dc_at):end,end,W[1]); if(ct>cf){
        if(cs[0]&&dayKey(new Date(chActiveFrom(o)))===dk) add('dx','cs_'+o.id+'_s',cs[0],'',1,'',esc(o.name)+' — setup, first day only');
        add('dx','cs_'+o.id+'_h',cs[1],'',chHrs(ct-cf),'hr',esc(o.name)+(o.dc?' · stopped':'')); } return; }
    if(o.cont||chIncluded(o)) return;
    var M=chMarksOf(o), today=M.filter(function(x){ return x.dk===dk; }), fut=chFuture(o,dk); if(!today.length&&!fut) return;
    var cc=chOrderCode(o), g=o.type==='med'?'med':'dx', what=o.type==='med'?esc(o.name)+(o.route?' '+esc(o.route):''):esc(o.name);
    var times=today.map(function(x){ return (x.m.min!=null?fmtTime(x.m.min):'')+(x.m.by?' '+esc(x.m.by):''); }).filter(Boolean).join(' · ');
    var cnt=today.length+fut;
    if(fut) times=(times?times+' · ':'')+fut+' to come';
    if(cc&&cc.re){ var firstEver=CH_UNTIL?(!M.some(function(x){ return x.dk<dk; })&&!CH_SIM[o.id]):(M[0]&&M[0].dk===dk), n1=firstEver&&cnt?1:0, n2=cnt-n1; if(CH_UNTIL&&cnt) CH_SIM[o.id]=1;
      if(n1) add(g,'o_'+o.id+'_1',cc.c,'',1,'',what+' · '+times.split(' · ')[0],{n:1});
      if(n2) add(g,'o_'+o.id+'_r',cc.re,'',n2,'',what+' · recheck',{n:n2}); }
    else add(g,'o_'+o.id,cc?cc.c:'',cc&&cc.c?'':(o.type==='med'?(/^(iv|im|sc|sq)/i.test(o.route||'')?'Injection':'Medication')+' — '+o.name:o.name),chByUnit(cc)?chRound(cnt*cc.per):cnt,chByUnit(cc)?cc.u:(cnt>1?'×':''),what+' · '+times,cc?{src:cc.src,oid:o.id,item:cc.item,warn:cc.c?null:'code',n:cnt}:{warn:'code',oid:o.id,n:cnt}); });
  /* added by hand */
  var X=(curDoc.charges_extra)||{}; Object.keys(X).forEach(function(id){ var x=X[id]; if(!x||x.dk!==dk) return;
    L.push({g:'extra',key:'x_'+id,xid:id,code:x.code||(x.item&&CH_PRICES.items[x.item]&&CH_PRICES.items[x.item].code)||'',item:x.item||null,warn:!(x.code||(x.item&&CH_PRICES.items[x.item]&&CH_PRICES.items[x.item].code))?'code':null,name:x.name||chName(x.code),qty:x.qty||1,unit:'',note:(x.by?'Added by '+esc(x.by):'')+(x.at?' · '+esc(fmtWhen(x.at)):'')}); });
  L.forEach(function(l){ var p=chPriceOf(l), f=chFee(l); l.price=p; l.fee=f; l.total=p!=null?Math.round((p*l.qty+f*chFeeCount(l))*100)/100:null; });   /* l.n: invoice entries on the line (each administration is its own entry) */
  var D=(curDoc.charges_done)||{}, Wv=(curDoc.charges_waived)||{}; L.forEach(function(l){ var d=D[l.key]; l.done=!!d; l.doneQ=d&&d.q; l.more=!!d&&l.qty>(d.q||0); if(l.name&&!l.nameHTML) l.nameHTML=esc(l.name);
    if(Wv[l.key]){ l.waived=Wv[l.key]; l.done=true; l.more=false; } });   /* won't charge (with a reason): settled, not on the invoice */
  return L; }

/* ---------- the tab ---------- */
var CH_GROUPS=[['hosp','Hospitalization'],['inf','Fluids & CRIs'],['med','Medications'],['dx','Diagnostics & monitoring'],['extra','Added charges']];
function chDk(){ return dayKey(); }   /* a charge added by hand belongs to today */
/* the whole stay, admission day first: Day 1 carries HOSP Setup and the setups of anything started that day */
function chDays(){ var out=[], lo=dayKey(new Date(chAdm()||Date.now())), hi=dayKey(new Date(CH_UNTIL?Math.max(chEnd()-1,Date.now()):Math.min(chEnd(),Date.now()))), d=dkDate(lo), guard=0;
  while(dayKey(d)<=hi&&guard++<120){ out.push(dayKey(d)); d.setDate(d.getDate()+1); } return out; }
function chAllLines(){ var L=[]; chDays().forEach(function(dk,i){ chLines(dk).forEach(function(l){ l.dk=dk; l.day=i+1; L.push(l); }); }); return L; }
/* charting of days older than the two the sheet keeps live: read once per sheet, so their treatments are charged too */
var chOldMarks={}, chOldFor=null;
function chLoadOld(){ if(!CUR||chOldFor===CUR) return; var id=CUR; chOldFor=id; chOldMarks={}; var keep={}; keep[dayKey()]=1; keep[prevDk(dayKey())]=1;
  (curDays?Object.keys(curDays):[]).forEach(function(dk){ Object.assign(chOldMarks,curDays[dk]||{}); });
  var need=chDays().filter(function(dk){ return !keep[dk]&&!(curDays&&curDays[dk]); });
  if(!need.length) return; Promise.all(need.map(function(dk){ return dayRef(id,dk).get().then(function(sn){ return (sn.exists&&sn.data().marks)||{}; },function(){ return {}; }); }))
    .then(function(R){ if(CUR!==id) return; R.forEach(function(m){ Object.assign(chOldMarks,m); }); if(currentCTab==='charges') tsRenderCharges(); }); }
function chCan(){ return !!CUR; }
var chOpen={};   /* days opened or closed by hand stay that way while the tab redraws */
window.tsChDay=function(el){ chOpen[CUR+el.getAttribute('data-dk')]=el.open; };
window.tsRenderCharges=function(){ var el=document.getElementById('ctab-charges'); if(!el) return; var os=document.getElementById('ctab-sheet'); if(os&&currentCTab!=='sheet') os.innerHTML='';
  if(!CUR||!curDoc){ el.innerHTML=CUR?'<div class="ts-empty"><div class="ts-empty-card"><span>Opening sheet…</span></div></div>':emptyHTML(); return; }
  if(!CH_CODES) chLoad().then(function(){ if(currentCTab==='charges') tsRenderCharges(); });
  chLoadOld(); var days=chDays(), L=chAllLines(), lv=chLevelNow(), doc=canOrderTS(), todo=L.filter(function(l){ return !l.done||l.more; }).length, need=L.filter(function(l){ return l.warn; }).length;
  var row=function(l){ var st=l.waived?'done waived':l.warn?'warn':l.more?'more':l.done?'done':'';
    return '<li class="ch-row '+st+'" data-k="'+esc(l.key)+'">'
      +'<button type="button" class="ch-ck" onclick="tsChTick(\''+esc(l.key)+'\','+l.qty+')" aria-label="'+(l.done?'Mark as not entered':'Mark as entered on the invoice')+'" title="'+(l.done?'Entered on the invoice — tap to undo':'Tap when it is on the invoice')+'"'+(l.warn&&!l.code?' disabled':'')+'><i></i></button>'
      +'<span class="ch-code">'+(l.code?esc(l.code):'—')+'</span>'
      +'<span class="ch-what"><b>'+l.nameHTML+'</b>'+(l.note?'<small>'+l.note+'</small>':'')+(l.more?'<small class="ch-more">Entered '+l.doneQ+' — '+(l.qty-l.doneQ)+' more since</small>':'')+(l.waived?'<small class="ch-waived">Won’t charge — '+esc(l.waived.why||'')+(l.waived.by?' · '+esc(l.waived.by):'')+'</small>':'')+'</span>'
      +'<span class="ch-qty">'+l.qty+(/^(hr|mL|tab|cap)$/.test(l.unit)?' '+l.unit:'')+'</span>'
      +'<span class="ch-amt'+(l.total==null?' none':'')+'">'+(chAdmin()&&(l.code||l.item)?'<button type="button" class="ch-price" onclick="tsChPrice(this,\''+esc(l.code||'')+'\',\''+esc(l.item||'')+'\')" title="Set this hospital’s price">':'')
        +(l.total!=null?'<b>'+chMoney(l.total)+'</b>'+((l.qty!==1||l.fee)?'<small>'+(l.qty!==1?chMoney(l.price)+(/^(mL|tab|cap|hr)$/.test(l.unit)?'/'+l.unit:' each'):'')+(l.fee?(l.qty!==1?' + ':'')+chMoney(l.fee)+' fee'+(l.unit==='hr'?'/hr':((l.n||1)>1?' ×'+l.n:'')):'')+'</small>':''):(chAdmin()&&(l.code||l.item)?'<small>Set price</small>':'<small>—</small>'))+(chAdmin()&&(l.code||l.item)?'</button>':'')+'</span>'
      +(l.warn==='level'?(doc?'<button type="button" class="ch-fix" onclick="document.getElementById(\'chLevel\').scrollIntoView({block:\'center\'})">Set level</button>':'<span class="ch-fix muted">Doctor sets level</span>')
        :l.warn==='code'||l.oid?'<button type="button" class="ch-fix'+(l.warn?'':' ghost')+'" onclick="tsChPick(\''+esc(l.oid||'')+'\',\''+esc(l.key)+'\')">'+(l.warn?'Find code':'Change')+'</button>'
        :l.xid?'<button type="button" class="ch-fix ghost" onclick="tsChRemove(\''+esc(l.xid)+'\')" aria-label="Remove">Remove</button>':'')+'</li>'; };
  /* newest day first; a day that is all on the invoice folds away */
  var groups=days.slice().reverse().map(function(dk){ var D=L.filter(function(l){ return l.dk===dk; }); if(!D.length) return ''; var n=days.indexOf(dk)+1, left=D.filter(function(l){ return !l.done||l.more; }).length;
    var body=CH_GROUPS.map(function(g){ var G=D.filter(function(l){ return l.g===g[0]; }); return G.length?'<section class="ch-group"><h4>'+g[1]+'</h4><ul class="ch-list">'+G.map(row).join('')+'</ul></section>':''; }).join('');
    var open=chOpen[CUR+dk]!=null?chOpen[CUR+dk]:(left||dk===dayKey());
    return '<details class="ch-day" data-dk="'+dk+'"'+(open?' open':'')+' ontoggle="tsChDay(this)"><summary><b>Day '+n+'</b><span>'+esc(dkLabel(dk))+(dk===dayKey()?' · today':'')+'</span><em class="'+(left?'':'ok')+'">'+(left?left+' to enter':'All entered')+'</em>'+(D.some(function(l){ return l.total!=null; })?'<strong class="ch-daytot">'+chMoney(D.reduce(function(t,l){ return t+(l.waived?0:(l.total||0)); },0))+'</strong>':'')+'</summary>'+body+'</details>'; }).join('');
  var ov=chOverrideAt(Date.now()), lvBtns='<button type="button" class="ch-lv auto'+(!ov?' on':'')+'"'+(doc?' onclick="tsChLevel(0)"':' disabled')+'>Auto</button>'+[1,2,3,4].map(function(n){ return '<button type="button" class="ch-lv'+(ov===n?' on':'')+'"'+(doc?' onclick="tsChLevel('+n+')"':' disabled')+'>'+n+'</button>'; }).join('');
  el.innerHTML=patientCmdHTML()+'<section class="ch-wrap"><main class="ch-main panel">'
    +'<div class="ch-head"><div><div class="ch-kicker">Charges · whole stay · '+days.length+' day'+(days.length>1?'s':'')+'</div><div class="ch-sum">'+(L.length?(todo?'<b>'+todo+'</b> to enter':'<b>All entered</b>')+' · '+L.length+' line'+(L.length>1?'s':'')+(need?' · <span class="ch-need">'+need+' need attention</span>':''):'Nothing to charge yet')+'</div>'
    +(L.some(function(l){ return l.total!=null; })?'<div class="ch-total"><b>'+chMoney(L.reduce(function(t,l){ return t+(l.waived?0:(l.total||0)); },0))+'</b> so far'+(L.some(function(l){ return l.total==null; })?' <small>· '+L.filter(function(l){ return l.total==null; }).length+' without a price</small>':'')+'</div>':'')+'</div>'
    +'<div class="ch-acts"><button type="button" class="btn ghost" onclick="tsChAdd()">Add charge</button><button type="button" class="btn ghost" onclick="tsChCopy()"'+(L.length?'':' disabled')+'>Copy list</button>'
    +(todo?'<button type="button" class="btn" onclick="tsChAll()">Mark all entered</button>':'')+'</div></div>'
    +(groups||'<div class="ch-empty">Charted treatments, fluids and hospitalization hours appear here with their VCA codes.</div>')
    +'<p class="ch-foot">Codes from the VCA Coding Handbook'+(CH_CODES&&CH_CODES.version?' v'+esc(CH_CODES.version):'')+'. Basic observations and nursing care are part of hospitalization. Prices and the invoice stay in the PIMS.</p></main>'
    +'<aside class="ch-side"><div class="panel" id="chLevel"><h4>Hospitalization level</h4><div class="ch-lvs" role="group" aria-label="Hospitalization level">'+lvBtns+'</div>'
    +'<div class="ch-lvnow"><b>Level '+lv.level+'</b>'+(chHospCode(lv.level)?' · '+esc(chHospCode(lv.level)):'')+'<small>'+(lv.manual?'Set by the doctor':lv.why.length?'Automatic — '+esc(lv.why.slice(0,3).join(' · ')):'Automatic — hospitalized, no IV fluids or monitoring')+'</small></div>'
    +'<p class="ch-lvnote">Worked out from the sheet using the Coding Handbook level definitions'+(doc?'. Tap a number to override; Auto goes back.':'. The doctor can override it.')+'</p>'
    +(chOverrides().length?'<div class="ch-hist">'+chOverrides().slice().reverse().map(function(x){ return '<div><span>'+esc(fmtWhen(x.at))+'</span><b>'+(+x.level?'Level '+x.level:'Auto')+'</b><small>'+esc(x.by||'')+'</small></div>'; }).join('')+'</div>':'')+'</div>'

    +'</aside></section>'; };
function chAdmin(){ try{ var e=String((AUTH&&AUTH.currentUser&&AUTH.currentUser.email)||'').toLowerCase(); return e==='daniel.giordano@pravix.app'||staffRole()==='admin'; }catch(e){ return false; } }
on('header.refresh',function(){ if(currentCTab==='charges') tsRenderCharges(); });

/* ---------- saving ---------- */
function chLocal(path,val){ [curDoc,curMain,(SHEETS||[]).find(function(s){ return s._id===CUR; })].forEach(function(d){ if(!d) return; var p=path.split('.'), o=d;
  for(var i=0;i<p.length-1;i++){ if(!o[p[i]]||typeof o[p[i]]!=='object') o[p[i]]={}; o=o[p[i]]; } if(val===DEL) delete o[p[p.length-1]]; else o[p[p.length-1]]=val; }); }
function chSave(upd,desc,keepLocal){ var me=user(), now=new Date().toISOString(); Object.keys(upd).forEach(function(k){ if(!keepLocal||keepLocal.indexOf(k)<0) chLocal(k,upd[k]); });
  if(desc) upd.audit=U([{at:now,type:'comm',desc:desc,who:me.initials,uid:me.uid}]); upd.updated_at=now; upd.updated_by=me.name||null;
  tsCommit(CUR,upd).catch(function(){}); tsRenderCharges(); }
window.tsChTick=function(key,q){ var me=user(), D=(curDoc&&curDoc.charges_done)||{}, d=D[key], u={};
  if(((curDoc&&curDoc.charges_waived)||{})[key]){ u['charges_waived.'+key]=DEL; chSave(u,'Charge back on the list'); return; }   /* a won't-charge line: undo the waiver */
  if(d&&(d.q||0)>=q){ u['charges_done.'+key]=DEL; chSave(u); return; }
  var l=chAllLines().filter(function(x){ return x.key===key; })[0];
  u['charges_done.'+key]={at:new Date().toISOString(),by:me.initials||'',q:q,n:(l&&l.n)||1}; chSave(u); };   /* n: entries at the tick, so a later dose adds only its own fee */
window.tsChAll=function(){ var me=user(), now=new Date().toISOString(), u={}, n=0;
  chAllLines().forEach(function(l){ if((!l.done||l.more)&&!(l.warn&&!l.code)){ u['charges_done.'+l.key]={at:now,by:me.initials||'',q:l.qty,n:l.n||1}; n++; } });
  if(n){ chSave(u,n+' charge'+(n>1?'s':'')+' marked as entered on the invoice'); toast(n+' marked as entered'); } };
window.tsChLevel=function(n){ if(!canOrderTS()){ toast('The doctor can override the hospitalization level'); return; } if(chOverrideAt(Date.now())===n) return;
  var me=user(), now=new Date().toISOString(), x={at:now,level:n,by:me.initials||'',by_name:me.name||'',auto:chAutoAt(Date.now()).level}, L=chOverrides().concat([x]);   /* auto: what the sheet worked out at that moment, for the owner's report */
  chLocal('hosp_levels',L); chSave({hosp_levels:U([x])},n?'Hospitalization level set to '+n+(chHospCode(n)?' ('+chHospCode(n)+')':''):'Hospitalization level back to automatic',['hosp_levels']); };   /* the array is added to on the server; locally it is already set */
window.tsChRemove=function(id){ var X=(curDoc&&curDoc.charges_extra)||{}, x=X[id]; if(!x) return; var u={}; u['charges_extra.'+id]=DEL; u['charges_done.x_'+id]=DEL;
  chSave(u,'Charge removed — '+esc(x.code)+' '+esc(x.name||''));
  undoToast(esc(x.code)+' removed',function(){ var v={}; v['charges_extra.'+id]=x; chSave(v,'Charge restored — '+esc(x.code)); }); };
window.tsChCopy=function(){ var L=chAllLines().filter(function(l){ return l.code&&(!l.done||l.more); }); if(!L.length) L=chAllLines().filter(function(l){ return l.code; });
  var txt=L.map(function(l){ var q=l.more?l.qty-l.doneQ:l.qty; return l.code+'\t'+q+'\t'+l.name+(l.price!=null?'\t'+chMoney(Math.round(l.price*q*100)/100):''); }).join('\n');
  try{ navigator.clipboard.writeText(txt).then(function(){ toast(L.length+' line'+(L.length>1?'s':'')+' copied — code, quantity, description'); },function(){ toast('Couldn’t copy'); }); }catch(e){ toast('Couldn’t copy'); } };

/* ---------- finding a code ---------- */
/* how people say it → how WOOFware abbreviates it: "ultrasound" finds the US codes, "x-ray" the RAD codes */
var CH_SYN=[[/^(ultrasounds?|ultrasonography|sono(gram)?|u\/s)$/,/\bus\b/],[/^(radiographs?|x-?rays?|xrays?|rads?)$/,/\brad\b/]];
/* the code a plain request means (the hospital's call): "ultrasound" → 23.1 US Abdominal */
var CH_PREFER=[[/^(abdominal |abdomen )?(ultrasound|us|u\/s)( abdominal| abdomen| of the abdomen)?$/i,'23.1']];
function chWord(t,w){ if(t.indexOf(w)>-1) return true; for(var i=0;i<CH_SYN.length;i++) if(CH_SYN[i][0].test(w)) return CH_SYN[i][1].test(t); return false; }
function chPreferred(q){ q=String(q||'').trim(); for(var i=0;i<CH_PREFER.length;i++) if(CH_PREFER[i][0].test(q)) return CH_PREFER[i][1]; return ''; }
function chSearch(q,limit){ q=String(q||'').trim().toLowerCase(); if(!q||!CH_CODES) return []; var words=q.split(/\s+/), top=chPreferred(q);
  return CH_CODES.map(function(x){ var n=x.n.toLowerCase(), s;
      if(x.c===top) s=-1; else if(x.c===q) s=0; else if(x.c.indexOf(q)===0) s=1; else if(n.indexOf(q)===0) s=2; else if(words.every(function(w){ return chWord(n,w); })) s=3; else if(words.every(function(w){ return chWord(n+' '+String(x.d||'').toLowerCase(),w); })) s=5; else return null;
      return {x:x,s:s}; }).filter(Boolean).sort(function(a,b){ return a.s-b.s||a.x.n.length-b.x.n.length; }).slice(0,limit||40).map(function(r){ return r.x; }); }
var chPickCtx=null;
function chPicker(title,lead,ctx,q0){ chPickCtx=ctx;
  var html='<div class="op-head"><span class="op-ic"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><div><div class="op-kind">VCA code</div><h3>'+title+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +(lead?'<p class="op-lead">'+lead+'</p>':'')+'<input id="chQ" class="ch-q" placeholder="Code or name — e.g. 101.208 or glucose" autocomplete="off" oninput="tsChFind(this.value)" value="'+esc(q0||'')+'">'
    +(ctx.qty?'<label class="ch-qtyin">Quantity <input id="chN" type="number" min="1" value="1" inputmode="numeric"></label>':'')
    +(ctx.oid?'<label class="ch-all"><input type="checkbox" id="chAll" checked> Use this code for every '+esc(ctx.name||'')+' order</label>':'')
    +(ctx.qty&&chItemsHTML()?'<div class="ch-items">'+chItemsHTML()+'</div>':'')+'<div id="chRes" class="ch-res"></div>';
  opShow(html,'wide'); chLoad().then(function(){ tsChFind((document.getElementById('chQ')||{}).value||''); var i=document.getElementById('chQ'); if(i){ i.focus(); i.select(); } }); }
window.tsChFind=function(q){ var el=document.getElementById('chRes'); if(!el) return; if(!CH_CODES||!CH_CODES.length){ el.innerHTML='<div class="ch-empty">The code list isn’t loaded'+(chAdmin()?' — import it from the Charges tab.':' yet.')+'</div>'; return; }
  var qq=String(q||'').trim(), own=/^\d{1,4}\.\d{1,5}$/.test(qq)&&!CH_IX[qq];   /* drug and product codes live in the WOOFware catalog, not the handbook: any code can be typed */
  var R=chSearch(q); el.innerHTML=(own?'<button type="button" class="ch-hit" onclick="tsChChoose(\''+esc(qq)+'\')"><span class="ch-code">'+esc(qq)+'</span><span><b>Use '+esc(qq)+'</b><small>Not in the Coding Handbook — a product or drug code from WOOFware</small></span></button>':'')+(R.length?R.map(function(x){ return '<button type="button" class="ch-hit" onclick="tsChChoose(\''+esc(x.c)+'\')"><span class="ch-code">'+esc(x.c)+'</span><span><b>'+esc(x.n)+'</b>'+(x.d?'<small>'+esc(x.d.slice(0,150))+(x.d.length>150?'…':'')+'</small>':'')+'</span></button>'; }).join('')
    :(own?'':'<div class="ch-empty">'+(q?'No handbook code matches “'+esc(q)+'”. Drug and product codes are in WOOFware — type the code itself (e.g. 54.733).':'Type a code or a few words.')+'</div>')); };
window.tsChChoose=function(code){ var C=chPickCtx||{}, x=CH_IX[code]||{c:code,n:''}, me=user(), now=new Date().toISOString(); tsOrderClose();
  if(C.xid){ var u1={}; u1['charges_extra.'+C.xid+'.code']=code; chSave(u1,'Charge code for '+esc(C.name||'')+': '+esc(code)); if(C.item) emit('ch.coded',C.item,code); toast(esc(code)+' — '+esc(C.name||'')); return; }
  if(C.oid){ var o=orderById(C.oid)||(curDoc.orders||{})[C.oid]; if(!o) return; var all=(document.getElementById('chAll')||{}).checked;
    if(orderById(C.oid)) updateOrder(C.oid,{code:code}); else { var u0={}; u0['orders.'+C.oid+'.code']=code; chSave(u0); }
    logEvent('comm','Charge code for <b>'+esc(o.name)+'</b>: '+esc(code)+' '+esc(x.n),me.initials); emit('ch.coded',o.name,code);
    if(all&&chDB()){ var k=String(o.name||'').trim().toLowerCase(), f={}; CH_MAP[k]=code; f[k]=code;   /* the hospital's code for this drug / test, for every patient */
      try{ chDB().doc('map').set({codes:f,updated_at:now,updated_by:me.initials},{merge:true}).catch(function(){}); }catch(e){} }
    toast(esc(code)+' — '+esc(x.n||o.name)); setTimeout(tsRenderCharges,50); return; }
  var n=Math.max(1,parseInt((document.getElementById('chN')||{}).value,10)||1), id='x'+Date.now().toString(36), u={};
  u['charges_extra.'+id]={dk:chDk(),code:code,name:x.n||'',qty:n,at:now,by:me.initials||''}; chSave(u,'Charge added — '+esc(code)+' '+esc(x.n||'')+(n>1?' ×'+n:'')); };
window.tsChPick=function(oid,key){ var o=oid&&((curDoc.orders||{})[oid]);
  if(!o&&/^x_/.test(key||'')){ var xid=key.slice(2), x=((curDoc&&curDoc.charges_extra)||{})[xid]; if(!x) return;   /* an added charge (e.g. Exam) still without its code */
    chPicker(esc(x.name||'Charge'),'Type the WOOFware code for '+esc(x.name||'this charge')+'. '+(x.item?'It is remembered for every '+esc(x.name)+' from now on.':''),{xid:xid,item:x.item,name:x.name},''); return; }
  if(!o) return;
  chPicker(esc(o.name),'Choose the code for '+esc(o.name)+'. Every charted '+(o.type==='med'?'administration':'reading')+' is listed with it.',{oid:oid,name:o.name},chPreferred(o.name)?String(o.name).trim():String(o.name||'').split(/[\s\/(]/)[0]); };   /* an order the hospital has a usual code for opens on it */
window.tsChAdd=function(){ chPicker('Add a charge','For things the sheet doesn’t record — an exam, a catheter placement, a procedure.',{qty:true},''); };

/* ---------- the code list: imported once by the owner (JSON from the Coding Handbook), stored behind sign-in ---------- */
window.tsChImport=function(inp){ var f=inp.files&&inp.files[0]; if(!f||!chAdmin()) return; var r=new FileReader();
  r.onload=function(){ try{ var J=JSON.parse(r.result), rows=(J.codes||J).map(function(x){ var r={c:String(x.c),n:String(x.n||''),d:String(x.d||'').slice(0,240)}; if(x.u) r.u=String(x.u).slice(0,8); if(x.t) r.t=String(x.t).slice(0,8); return r; }).filter(function(x){ return /^\d+\.\d+$/.test(x.c); });
      if(rows.length<50){ toast('That file has no codes'); return; } var col=chDB(), per=1200, parts=[], ver=String(J.version||'');
      for(var i=0;i<rows.length;i+=per) parts.push('p'+(parts.length+1));
      Promise.all(parts.map(function(id,i){ return col.doc(id).set({rows:rows.slice(i*per,(i+1)*per),version:ver}); }))
        .then(function(){ return col.doc('meta').set({parts:parts,version:ver,count:rows.length,updated_at:new Date().toISOString(),updated_by:user().initials},{merge:true}); })
        .then(function(){ return J.prices?col.doc('prices').set(Object.assign({codes:J.prices.codes||{},items:J.prices.items||{},updated_at:new Date().toISOString(),updated_by:user().initials},J.prices.fees?{fees:J.prices.fees}:{}),{merge:true}):null; })   /* the hospital's starting prices, if the file has them */
        .then(function(){ CH_CODES=null; CH_P=null; CH_PP=null; toast(rows.length.toLocaleString()+' codes imported'); chLoad().then(function(){ tsRenderCharges(); emit('ch.imported'); }); })
        .catch(function(e){ console.warn(e); toast('Import failed — '+(e&&e.code==='permission-denied'?'the database rule for charge_codes isn’t published yet':'see console')); });
    }catch(e){ toast('Couldn’t read that file'); } };
  r.readAsText(f); inp.value=''; };

/* ---------- prices: the owner/admin taps a price to set it for the whole hospital ---------- */
window.tsChPrice=function(btn,code,item){ if(!chAdmin()) return; var cur=code?CH_PRICES.codes[code]:(CH_PRICES.items[item]||{}).price;
  var cell=btn.parentNode; cell.innerHTML='<input class="ch-pin" inputmode="decimal" placeholder="0.00" value="'+(cur!=null?(+cur).toFixed(2):'')+'" aria-label="Price">';
  var inp=cell.querySelector('input'), done=false; inp.focus(); inp.select();
  var fin=function(save){ if(done) return; done=true; var v=String(inp.value||'').replace(/[$,\s]/g,''); if(save&&v!==''&&!isNaN(+v)) chSetPrice(code,item,Math.round(+v*100)/100); else tsRenderCharges(); };
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); fin(true); } else if(e.key==='Escape') fin(false); });
  inp.addEventListener('blur',function(){ fin(true); }); };
function chSetPrice(code,item,v){ var col=chDB(), me=user(), now=new Date().toISOString(), up={updated_at:now,updated_by:me.initials||''};
  if(code){ CH_PRICES.codes[code]=v; up.codes={}; up.codes[code]=v; } else if(item){ CH_PRICES.items[item]=Object.assign({},CH_PRICES.items[item],{price:v}); up.items={}; up.items[item]={price:v}; }
  if(col) col.doc('prices').set(up,{merge:true}).then(function(){ toast(esc(code||item)+' · '+chMoney(v)); },function(e){ toast(e&&e.code==='permission-denied'?'Only the owner or an admin can set prices':'Couldn’t save the price'); });
  tsRenderCharges(); }
/* a priced hospital item learns its code once someone picks one for it */
on('ch.coded',function(name,code){ var k=String(name||'').trim().toLowerCase(), it=CH_PRICES.items[k]; if(!it||it.code===code||!chDB()) return; it.code=code; var f={}; f[k]={code:code}; try{ chDB().doc('prices').set({items:f},{merge:true}).catch(function(){}); }catch(e){} });

/* the hospital's own priced items (Exam, Nova panel …): one tap in Add a charge */
function chItemsHTML(){ var I=CH_PRICES.items||{}; return Object.keys(I).filter(function(k){ return I[k]&&I[k].price!=null; }).sort().map(function(k){ var x=I[k];
  return '<button type="button" class="ch-item" onclick="tsChChooseItem(\''+esc(k).replace(/'/g,"\\'")+'\')"><b>'+esc(x.name||k)+'</b><small>'+chMoney(+x.price)+(x.code?' · '+esc(x.code):'')+'</small></button>'; }).join(''); }
window.tsChChooseItem=function(k){ var x=(CH_PRICES.items||{})[k]; if(!x) return; var me=user(), now=new Date().toISOString(), n=Math.max(1,parseInt((document.getElementById('chN')||{}).value,10)||1), id='x'+Date.now().toString(36), u={};
  tsOrderClose(); u['charges_extra.'+id]={dk:chDk(),code:x.code||'',item:k,name:x.name||k,qty:n,at:now,by:me.initials||''}; chSave(u,'Charge added — '+esc(x.name||k)+(n>1?' ×'+n:'')); };

/* ---------- projected cost: everything the sheet would charge if nothing changes until `until` (ms) ----------
   Hours keep counting at the level the sheet is at, fluids / CRIs / hourly services keep running, scheduled treatments are given.
   Only priced lines add up; the count of lines without a price is returned so the number is never presented as complete. */
function chProject(until){ var now=chAllLines(), nowT=now.reduce(function(t,l){ return t+(l.waived?0:(l.total||0)); },0);
  CH_UNTIL=Math.max(until,Date.now()); CH_SIM={}; var L; try{ L=chAllLines(); }finally{ CH_UNTIL=null; CH_SIM={}; }
  var tot=L.reduce(function(t,l){ return t+(l.waived?0:(l.total||0)); },0), unp=L.filter(function(l){ return l.total==null; }).length;
  return {now:Math.round(nowT*100)/100,total:Math.round(tot*100)/100,add:Math.round((tot-nowT)*100)/100,unpriced:unp,lines:L}; }
window.tsChProject=function(until){ return chProject(until); };
/* one dose (or one charge) of an order, at this hospital's price — the order window and order panel show it (store/ordercare.js) */
window.tsChReady=function(){ return chLoad().then(function(){ return chLoadPrices(); }); };   /* drug codes come from the code list, so the order window loads it too (once a session) */
window.tsChOrderPrice=function(o){ if(!o) return null; var cc=chOrderCode(o), k=String(o.name||'').trim().toLowerCase(); var p=chPriceOf({code:cc&&cc.c||'',item:(cc&&cc.item)||k});
  var fee=chFee({code:cc&&cc.c});   /* one dose = unit price × what one dose uses + the fee for that entry */
  if(p!=null&&chByUnit(cc)) return {price:chRound(p*cc.per+fee),code:cc.c,per:cc.per,u:cc.u,unitPrice:p,fee:fee};
  return p!=null?{price:chRound(p+fee),code:cc&&cc.c||'',fee:fee}:null; };
window.tsChMoney=chMoney; window.tsChAdmin=function(){ return chAdmin(); };
window.tsChCodesInfo=function(){ return CH_CODES&&CH_CODES.length?CH_CODES.length.toLocaleString()+' codes · v'+String(CH_CODES.version||'?'):''; };   /* for Settings (store/settings.js) */
/* the horizons offered: 8 AM tomorrow (rounds), +24 h, +48 h */
var CH_HZ=[['8am','8 AM tomorrow'],['24','In 24 h'],['48','In 48 h']], chHz='8am';
function chHzTime(k){ if(k==='24') return Date.now()+864e5; if(k==='48') return Date.now()+1728e5; var d=new Date(); d.setDate(d.getDate()+(d.getHours()>=8?1:0)); d.setHours(8,0,0,0); return d.getTime(); }
function chHzLabel(t){ var d=new Date(t), x=new Date(); x.setDate(x.getDate()+1); return (d.toDateString()===x.toDateString()?'tomorrow':d.toLocaleDateString([], {weekday:'short'}))+' '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }
function chProjHTML(){ if(!curDoc||curDoc.status==='closed') return ''; var t=chHzTime(chHz), P=chProject(t); if(!(P.total>0)) return '';
  return '<div class="ch-proj"><span>If nothing changes: <b>'+chMoney(P.total)+'</b> by '+esc(chHzLabel(t))+' <small>(+'+chMoney(P.add)+(P.unpriced?' · '+P.unpriced+' line'+(P.unpriced>1?'s':'')+' without a price not included':'')+')</small></span>'
    +'<span class="ch-hz">'+CH_HZ.map(function(h){ return '<button type="button" class="'+(h[0]===chHz?'on':'')+'" onclick="tsChHz(\''+h[0]+'\')">'+h[1]+'</button>'; }).join('')+'</span></div>'; }
window.tsChHz=function(k){ chHz=k; tsRenderCharges(); };
/* a line for the estimate card (base.js depositCard) */
window.tsChProjRow=function(){ try{ if(!CH_PP_OK) return ''; var t=chHzTime('8am'), P=chProject(t); if(!(P.total>0)) return '';
  return '<div class="est-row ch-est-proj"><span class="k">Projected by '+esc(chHzLabel(t).replace('tomorrow ',''))+'</span><span class="v">'+chMoney(P.total)+'</span></div>'; }catch(e){ return ''; } };
/* ---------- estimate from the plan (base.js estimate editor): low = stay of N days, high = M days, from the orders on the sheet now ---------- */
window.tsEstPlanHTML=function(){ if(!curDoc) return ''; var d=Math.max(1,Math.ceil((Date.now()-chAdm())/864e5));
  return '<div class="ch-plan"><div class="ch-plan-h">Build from the plan</div><div class="ch-plan-row"><span>Stay of</span><input id="epLo" type="number" min="1" value="'+(d+1)+'" aria-label="Shortest stay in days"><span>to</span><input id="epHi" type="number" min="1" value="'+(d+2)+'" aria-label="Longest stay in days"><span>days</span>'
    +'<button type="button" class="ts-btn" onclick="tsEstPlan()">Calculate</button></div><div id="epOut" class="ch-plan-out">From the orders on the sheet and this hospital’s prices.</div></div>'; };
window.tsEstPlan=function(){ chLoad().then(function(){ var lo=Math.max(1,parseInt((document.getElementById('epLo')||{}).value,10)||1), hi=Math.max(lo,parseInt((document.getElementById('epHi')||{}).value,10)||lo), adm=chAdm();
    var A=chProject(adm+lo*864e5), B=chProject(adm+hi*864e5), r=function(n){ return Math.ceil(n/10)*10; }, set=function(id,v){ var el=document.getElementById(id); if(el) el.value=String(v); };
    set('esLow',r(A.total)); set('esHigh',r(B.total)); if(!(+((document.getElementById('esCur')||{}).value)>0)) set('esCur',A.now);
    var out=document.getElementById('epOut'); if(out) out.innerHTML='Low <b>'+chMoney(r(A.total))+'</b> ('+lo+' day'+(lo>1?'s':'')+') · high <b>'+chMoney(r(B.total))+'</b> ('+hi+' days) · charges so far '+chMoney(A.now)
      +(B.unpriced?'<br><span class="ch-need">'+B.unpriced+' line'+(B.unpriced>1?'s have':' has')+' no price yet and '+(B.unpriced>1?'aren’t':'isn’t')+' included</span>':''); }); };
/* ---------- Charge check at discharge ----------
   "Discharge / close this sheet" opens this first when the sheet has charges. Every line has to be entered on the
   invoice (ticked, sheet.charges_done) or marked "won't charge" with a reason (sheet.charges_waived.{key} = {at, by, why, q, amt})
   before the sheet closes. A line that grew after it was ticked (more hours, another dose) comes back with only the difference.
   The owner / an admin can close anyway with a written reason: the open lines are saved on the sheet for the morning review
   (charge_check.open, charge_review:true). Every close through here saves charge_check = {at, by, lines, total, entered, waived, open, anyway, lowered}.
   Hours billed below the level the sheet works out (the doctor lowered it) show as a note with the dollars, and are saved for the owner's report. */
var CC_WHY=['Doctor waived','Included in another charge','Entered under another code','Charted in error'];
var CC_CLOSE=[['discharged','Discharged'],['transferred','Transferred'],['deceased','Deceased'],['cancelled','Admitted in error']];
var ccBack=false, ccOn=false, ccAsk='', ccCode='', ccWhy='discharged', ccAny=false, ccPrev={r:0,b:0,tot:0,ent:0,left:0}, ccMine={};
var CC_CK='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l2.9 2.9L12.6 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function ccLines(){ return chAllLines().filter(function(l){ return l.qty>0; }); }
function ccIsOpen(l){ return !l.done||l.more; }
function ccSums(L){ var tot=0, left=0; L.forEach(function(l){ if(l.waived) return; tot+=l.total||0; if(ccIsOpen(l)) left+=chDiff(l).amt||0; });
  tot=Math.round(tot*100)/100; left=Math.round(left*100)/100; return {tot:tot,left:left,ent:Math.max(0,Math.round((tot-left)*100)/100)}; }
/* the hospital's usual code for an uncoded order (e.g. Abdominal ultrasound → 23.1), with its price */
function ccSuggest(l){ if(!l.oid||l.code) return null; var o=(curDoc.orders||{})[l.oid]; var c=o&&chPreferred(o.name); if(!c) return null;
  var x=CH_IX[c]||{c:c,n:''}, p=CH_PRICES.codes[c]; return {c:c,n:x.n||c,amt:p!=null?Math.round((+p+chFee({code:c}))*100)/100:null}; }
function ccQty(q,u){ return q+(/^(hr|mL|tab|cap)$/.test(u||'')?' '+u:''); }

window.tsChargeCheck=function(){ if(!CUR||!curDoc) return false; if(!ccLines().length) return false;
  ccOn=true; ccAsk=''; ccCode=''; ccWhy='discharged'; ccAny=false; ccMine={}; ccPrev={r:0,b:0,tot:0,ent:0,left:0}; ccRender(true); return true; };
window.tsCcClose=function(){ ccOn=false; tsOrderClose(); };

function ccRowHTML(l){ var d=chDiff(l), sg=l.warn&&!l.code?ccSuggest(l):null, k=esc(l.key);
  return '<div class="cc-row" data-row="'+k+'"><div class="cc-in"><div class="cc-line'+(ccAsk===l.key?' ask':'')+'">'
    +'<span class="cc-code">'+(l.code?esc(l.code):'<em>No code</em>')+'</span>'
    +'<span class="cc-what"><b>'+l.nameHTML+'</b><small>'+(l.more?'<span class="cc-tag">+'+esc(ccQty(d.q,l.unit))+' since entered</span> · '+esc(ccQty(l.qty,l.unit))+(l.total!=null?', '+chMoney(l.total):'')+' in all':esc(ccQty(l.qty,l.unit)))+'</small></span>'
    +'<span class="cc-amt">'+(d.amt!=null?chMoney(d.amt):'—')+'</span>'
    +'<span class="cc-acts">'+(l.warn&&!l.code?(l.oid?'<button type="button" class="cc-b need" data-code="'+k+'">Find code</button>':'')
      :'<button type="button" class="cc-b ent" data-ent="'+k+'" aria-label="Entered on the invoice: '+esc(l.name||l.code)+'">'+CC_CK+'Entered</button>')
    +'<button type="button" class="cc-b" data-ask="'+k+'" aria-expanded="'+(ccAsk===l.key)+'">Won’t charge</button></span></div>'
    +(ccAsk===l.key?'<div class="cc-why" role="group" aria-label="Why it won’t be charged">'+CC_WHY.map(function(w){ return '<button type="button" class="cc-chip" data-waive="'+k+'" data-r="'+esc(w)+'">'+esc(w)+'</button>'; }).join('')+'</div>':'')
    +(sg&&ccCode!==l.key?'<div class="cc-sugg"><button type="button" data-use="'+k+'" data-c="'+esc(sg.c)+'"><span class="c">'+esc(sg.c)+'</span><span class="n">'+esc(sg.n)+'<small>Your usual code for '+esc(l.name||'this order')+'</small></span><b>'+(sg.amt!=null?chMoney(sg.amt):'')+'</b></button></div>':'')
    +'</div></div>'; }

function ccHTML(){ var L=ccLines(), O=L.filter(ccIsOpen), R=L.filter(function(l){ return !ccIsOpen(l); }), S=ccSums(L), n=O.length, tot=L.length, adm=chAdmin(), days=chDays();
  var fin=n===0, ratio=tot?(tot-n)/tot:1, bar=S.tot?Math.round(S.ent/S.tot*1000)/10:(fin?100:0);
  var head='<div class="op-head cc-head"><span class="cc-ring'+(fin?' fin':'')+'" aria-hidden="true"><svg class="cc-arc" viewBox="0 0 52 52"><circle class="trk" cx="26" cy="26" r="22"/><circle class="val" cx="26" cy="26" r="22" style="stroke-dashoffset:'+(138.2*(1-ccPrev.r)).toFixed(1)+'" data-to="'+(138.2*(1-ratio)).toFixed(1)+'"/></svg>'
    +'<b class="cc-n">'+n+'</b><span class="cc-ck"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span></span>'
    +'<div class="cc-ttl"><div class="op-kind">Discharge · charge check</div><h3 id="ccT">'+(fin?'Everything is on the invoice':n===1?'1 charge isn’t on the invoice yet':n+' charges aren’t on the invoice yet')+'</h3>'
    +'<p class="cc-lead">'+(fin?'All '+tot+' line'+(tot>1?'s are':' is')+' entered or have a reason. Choose why the sheet is closing.':'Enter each one in WOOFware and tick it here, or mark it “won’t charge” with a reason.')+'</p></div>'
    +'<button type="button" class="op-x" onclick="tsCcClose()" aria-label="Close">×</button></div>';
  var money='<div class="cc-money'+(fin?' fin':'')+'"><div><small>Whole stay</small><b data-roll="tot" data-v="'+S.tot+'">'+chMoney(ccPrev.tot)+'</b></div><div><small>Entered</small><b data-roll="ent" data-v="'+S.ent+'">'+chMoney(ccPrev.ent)+'</b></div>'
    +'<div class="left"><small>Still to enter</small><b data-roll="left" data-v="'+S.left+'">'+chMoney(ccPrev.left)+'</b></div><div class="cc-bar"><i style="width:'+ccPrev.b+'%" data-to="'+bar+'"></i></div></div>';
  var list=days.slice().reverse().map(function(dk){ var D=O.filter(function(l){ return l.dk===dk; }); if(!D.length) return '';
      var sum=D.reduce(function(t,l){ return t+(chDiff(l).amt||0); },0);
      return '<div class="cc-grp"><span>Day '+(days.indexOf(dk)+1)+' · '+esc(dkLabel(dk))+'</span><span>'+chMoney(Math.round(sum*100)/100)+' to enter</span></div>'+D.map(ccRowHTML).join(''); }).join('')
    +(fin?'<div class="cc-none">Nothing left to enter</div>':'')
    +(R.length?'<details class="cc-done"'+(fin?' open':'')+'><summary><span>Entered or won’t charge · '+R.length+'</span><span class="cc-show">Show</span></summary>'
      +R.map(function(l){ var m=ccMine[l.key]; return '<div class="cc-rl"><span class="cc-code">'+esc(l.code||'—')+'</span><span class="cc-rn">'+l.nameHTML+'</span>'
        +'<span class="cc-st'+(l.waived?' w':'')+'">'+(l.waived?'Won’t charge · '+esc(l.waived.why||''):'Entered')+'</span>'
        +(l.waived?'<s>'+chMoney(l.total)+'</s>':'<span class="cc-ra">'+(l.total!=null?chMoney(l.total):'—')+'</span>')
        +(m?'<button type="button" class="cc-undo" data-undo="'+esc(l.key)+'">Undo</button>':'')+'</div>'; }).join('')+'</details>':'');
  var foot='<div class="cc-foot'+(fin?' fin':'')+'">'
    +(fin?'<div class="cc-reason" role="group" aria-label="Why the sheet is closing">'+CC_CLOSE.map(function(x){ return '<button type="button" data-why="'+x[0]+'" aria-pressed="'+(ccWhy===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div>'
      :'<button type="button" class="cc-btn" data-all="1"'+(O.some(function(l){ return l.code||!l.warn; })?'':' disabled')+'>Mark all entered</button>'+(adm?'<button type="button" class="cc-link" data-any="1" aria-expanded="'+ccAny+'">Close anyway…</button>':'<span class="cc-note">Only the owner or an admin can close with charges open.</span>'))
    +'<span class="cc-sp"></span><button type="button" class="cc-btn '+(fin?'ok':'pri')+'" data-shut="1"'+(fin?'':' disabled')+'>'+(fin?'Close sheet':'Close sheet · '+n+' left')+'</button>'
    +(!fin&&ccAny&&adm?'<div class="cc-any"><p><b>Close with charges not entered?</b> The sheet closes now and the '+n+' open charge'+(n>1?'s go':' goes')+' to the charges review for the morning.</p>'
      +'<textarea id="ccAnyWhy" rows="2" placeholder="Why now? e.g. Client left at 3 AM, WOOFware down"></textarea>'
      +'<div class="cc-anyr"><button type="button" class="cc-btn" data-any="1">Cancel</button><button type="button" class="cc-btn pri" data-anygo="1" disabled>Close and send to review</button></div></div>':'')
    +'</div>';
  var LW=chLowered(), low=LW.length?'<div class="cc-low" role="note"><div class="cc-low-h"><b>Hospitalization level lowered</b><span>'+chMoney(LW.reduce(function(t,x){ return t+x.diff; },0))+' below the sheet’s level</span></div>'
    +LW.map(function(x){ return '<div class="cc-low-r"><span>Day '+x.day+'</span><span>'+ccLvl(x.billed)+' billed · the sheet worked out '+ccLvl(x.auto)+(x.by.length?' · set by '+esc(x.by.join(', ')):'')+'</span><b>−'+chMoney(x.diff)+'</b></div>'; }).join('')+'</div>':'';
  return {html:head+money+low+'<div class="cc-list">'+list+'</div>'+foot, ratio:ratio, bar:bar, S:S}; }
function ccLvl(h){ return Object.keys(h).filter(function(l){ return h[l]; }).sort().reverse().map(function(l){ return 'Level '+l+' '+h[l]+' h'; }).join(' + '); }

function ccRoll(el,from,to){ if(!el) return; if(from===to||matchMedia('(prefers-reduced-motion: reduce)').matches){ el.textContent=chMoney(to); return; }
  var t0=performance.now(), d=480; (function step(t){ var k=Math.min(1,(t-t0)/d), e=1-Math.pow(1-k,3); el.textContent=chMoney(Math.round((from+(to-from)*e)*100)/100); if(k<1) requestAnimationFrame(step); })(t0); }

function ccRender(first){ if(!ccOn||!CUR) return; var V=ccHTML(), m=document.getElementById('tsOrderSheet'), card=m&&m.querySelector('.op-card.cc');
  var keepScroll=card&&card.querySelector('.cc-list')?card.querySelector('.cc-list').scrollTop:0;
  if(first||!card||!m.classList.contains('show')){ opShow(V.html,'cc'); card=document.querySelector('#tsOrderSheet .op-card.cc'); } else card.innerHTML=V.html;
  var lst=card.querySelector('.cc-list'); if(lst&&!first) lst.scrollTop=keepScroll;
  card.onclick=ccClick; var ta=card.querySelector('#ccAnyWhy'); if(ta){ ta.oninput=function(){ card.querySelector('[data-anygo]').disabled=ta.value.trim().length<4; }; setTimeout(function(){ ta.focus(); },30); }
  requestAnimationFrame(function(){ var v=card.querySelector('.cc-arc .val'), b=card.querySelector('.cc-bar i'); if(v) v.style.strokeDashoffset=v.getAttribute('data-to'); if(b) b.style.width=b.getAttribute('data-to')+'%';
    card.querySelectorAll('[data-roll]').forEach(function(el){ var k=el.getAttribute('data-roll'); ccRoll(el,ccPrev[k],+el.getAttribute('data-v')); });
    ccPrev={r:V.ratio,b:V.bar,tot:V.S.tot,ent:V.S.ent,left:V.S.left}; }); }

/* a row folds away, then the list redraws */
function ccFold(key,then){ var r=document.querySelector('#tsOrderSheet .cc-row[data-row="'+(window.CSS&&CSS.escape?CSS.escape(key):key)+'"]'); then(); if(r){ r.classList.add('gone'); setTimeout(function(){ ccRender(); },300); } else ccRender(); }
function ccLine(key){ return ccLines().filter(function(l){ return l.key===key; })[0]; }
function ccClick(e){ var b=e.target.closest('button'); if(!b||b.disabled) return; var k;
  if((k=b.getAttribute('data-ent'))){ var l=ccLine(k); if(!l) return; ccMine[k]=1; ccFold(k,function(){ tsChTick(k,l.qty); }); }
  else if((k=b.getAttribute('data-ask'))){ ccAsk=ccAsk===k?'':k; ccRender(); }
  else if((k=b.getAttribute('data-waive'))){ var l2=ccLine(k), me=user(), u={}, why=b.getAttribute('data-r'); if(!l2) return; ccMine[k]=1; ccAsk='';
    u['charges_waived.'+k]={at:new Date().toISOString(),by:me.initials||'',why:why,q:l2.qty,amt:l2.total};
    ccFold(k,function(){ chSave(u,'Won’t charge — '+esc(l2.code||'')+' '+esc(l2.name||'')+': '+esc(why)); }); }
  else if((k=b.getAttribute('data-code'))){ var l3=ccLine(k); if(!l3) return; ccBack=true; tsChPick(l3.oid,k); }   /* the code picker; choosing a code comes back here */
  else if((k=b.getAttribute('data-use'))){ var l4=ccLine(k), o=l4&&(curDoc.orders||{})[l4.oid]; if(!o) return; ccBack=true; ccCode=k; chPickCtx={oid:l4.oid,name:o.name}; tsChChoose(b.getAttribute('data-c')); }
  else if((k=b.getAttribute('data-undo'))){ var u2={}; delete ccMine[k]; if(((curDoc.charges_waived)||{})[k]) u2['charges_waived.'+k]=DEL; else u2['charges_done.'+k]=DEL; chSave(u2); ccRender(); }
  else if(b.getAttribute('data-all')){ var O=ccLines().filter(ccIsOpen).filter(function(l){ return !(l.warn&&!l.code); }); O.forEach(function(l){ ccMine[l.key]=1; });
    document.querySelectorAll('#tsOrderSheet .cc-row').forEach(function(r,i){ if(O.some(function(l){ return l.key===r.getAttribute('data-row'); })) setTimeout(function(){ r.classList.add('gone'); },i*45); });
    tsChAll(); setTimeout(function(){ ccRender(); },O.length*45+320); }
  else if(b.getAttribute('data-any')){ ccAny=!ccAny; ccRender(); }
  else if((k=b.getAttribute('data-why'))){ ccWhy=k; ccRender(); }
  else if(b.getAttribute('data-anygo')){ var ta=document.getElementById('ccAnyWhy'); ccFinish((ta&&ta.value||'').trim()); }
  else if(b.getAttribute('data-shut')) ccFinish(null); }
on('ch.coded',function(){ if(!ccOn||!ccBack) return; ccBack=false; setTimeout(function(){ ccCode=''; if(ccOn&&CUR) ccRender(true); },60); });

function ccFinish(anyway){ var L=ccLines(), O=L.filter(ccIsOpen), S=ccSums(L), me=user(), now=new Date().toISOString(), nm=VISIT.patient||'Patient';
  if(O.length&&!(anyway&&chAdmin())) return;
  var W=L.filter(function(l){ return l.waived; });
  var rec={at:now,by:me.initials||'',lines:L.length,total:S.tot,entered:S.ent,
    waived:W.map(function(l){ return {key:l.key,code:l.code||'',name:l.name||'',why:l.waived.why||'',amt:l.total}; }),
    open:O.map(function(l){ var d=chDiff(l); return {key:l.key,code:l.code||'',name:l.name||'',q:d.q,amt:d.amt}; }),
    anyway:anyway||null};
  var LW=chLowered(); rec.lowered=LW.map(function(x){ return {dk:x.dk,day:x.day,billed:x.billed,auto:x.auto,diff:x.diff,by:x.by}; });
  var extra={charge_check:rec}; if(O.length) extra.charge_review=true;
  if(LW.length){ extra.level_lowered=true; extra.level_lowered_amt=Math.round(LW.reduce(function(t,x){ return t+x.diff; },0)*100)/100; }   /* the owner's report (store/levels.js) finds these */
  var note=O.length?O.length+' charge'+(O.length>1?'s':'')+' not entered, sent to review: '+anyway:'charges: all '+L.length+' entered or waived';
  var why=ccWhy, label=(CC_CLOSE.filter(function(x){ return x[0]===why; })[0]||[,why])[1];
  ccOn=false;
  tsCloseSheet(why,extra,note,function(ok){ if(!ok) return;
    opShow('<div class="cc-end'+(O.length?' flag':'')+'"><span class="cc-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>'
      +'<h3>'+(O.length?esc(nm)+' closed · '+O.length+' sent to review':esc(nm)+' · '+esc(label))+'</h3>'
      +'<p>'+(O.length?'“'+esc(anyway)+'” — '+esc(me.initials||'')+'. The open charges are saved on the sheet for the morning review.':'Every charge is accounted for. This record is saved on the sheet.')+'</p>'
      +'<div class="op-list"><div class="op-row"><span>Lines</span><b>'+L.length+'</b></div><div class="op-row"><span>Entered on the invoice</span><b>'+chMoney(S.ent)+'</b></div>'
      +(W.length?'<div class="op-row"><span>Won’t charge ('+W.length+')</span><b>'+W.map(function(l){ return esc(l.code||l.name||'')+' · '+esc((l.waived.why||'').toLowerCase()); }).join('<br>')+'</b></div>':'')
      +(O.length?'<div class="op-row"><span>Sent to review ('+O.length+')</span><b class="cc-warnv">'+chMoney(S.left)+'</b></div>':'')
      +'<div class="op-row"><span>Closed by</span><b>'+esc(me.initials||'')+' · '+esc(fmtWhen(now))+'</b></div></div>'
      +'<button type="button" class="cc-btn ok cc-endb" onclick="tsOrderClose()">Done</button></div>','cc'); }); }
/* ═════════ TS LEVELS REPORT — hospitalization billed below the sheet's level, for the owner (Oct 2026) ═════════
   The sheet works out the hospitalization level from what is charted (store/charges.js chAutoAt); a doctor can set it lower.
   Every close saves what was billed below the worked-out level (charge_check.lowered, level_lowered:true, level_lowered_amt — store/chargecheck.js).
   This report (Settings → Lowered levels, the owner only) lists those closed stays for a period, totals them by who lowered the level,
   and adds patients still in hospital: the open sheet with its dollars so far, the others where the level is set below the sheet's right now. */
var LVR_DAYS=30, LVR_ROWS=null, lvrBusy=false;
function lvrOwner(){ try{ return String((AUTH&&AUTH.currentUser&&AUTH.currentUser.email)||'').toLowerCase()==='daniel.giordano@pravix.app'; }catch(e){ return false; } }
window.tsLevelsOwner=lvrOwner;
function lvrName(d){ var p=(d&&d.patient)||{}; return ((p.name||'')+' '+(p.last||'')).trim()||'Unnamed'; }
function lvrLoad(){ if(lvrBusy) return; lvrBusy=true; LVR_ROWS=null; lvrPaint();
  DB.collection(COL).where('tenant_id','==',TENANT).where('level_lowered','==',true).get().then(function(snap){
    var R=[]; snap.forEach(function(doc){ var d=doc.data(), cc=d.charge_check||{}; (cc.lowered||[]).forEach(function(x){
      R.push({id:doc.id,name:lvrName(d),dr:(d.patient||{}).doctor||'',at:d.closed_at||cc.at||'',day:x.day,billed:x.billed||{},auto:x.auto||{},diff:+x.diff||0,by:(x.by&&x.by.length?x.by:[(d.patient||{}).doctor||'—']),open:false}); }); });
    LVR_ROWS=R; lvrBusy=false; lvrPaint(); },function(e){ console.warn('[levels report]',e); LVR_ROWS=[]; lvrBusy=false; lvrPaint(true); }); }
/* patients still in hospital */
function lvrOpen(){ var R=[];
  if(CUR&&curDoc){ try{ chLowered().forEach(function(x){ R.push({id:CUR,name:lvrName(curDoc),dr:(curDoc.patient||{}).doctor||'',at:'',day:x.day,billed:x.billed,auto:x.auto,diff:x.diff,by:x.by.length?x.by:['—'],open:true}); }); }catch(e){} }
  (SHEETS||[]).forEach(function(s){ if(s._id===CUR) return; var H=Array.isArray(s.hosp_levels)?s.hosp_levels.slice().sort(function(a,b){ return String(a.at).localeCompare(String(b.at)); }):[], last=H[H.length-1];
    if(last&&+last.level&&last.auto&&+last.level<+last.auto) R.push({id:s._id,name:lvrName(s),dr:(s.patient||{}).doctor||'',at:last.at,day:null,billed:null,auto:null,now:{level:+last.level,auto:+last.auto},diff:null,by:[last.by_name||last.by||'—'],open:true}); });
  return R; }
function lvrLvl(h){ return h?Object.keys(h).filter(function(l){ return h[l]; }).sort().reverse().map(function(l){ return 'L'+l+' '+h[l]+' h'; }).join(' + '):''; }
function lvrHTML(err){ var cut=Date.now()-LVR_DAYS*864e5, C=(LVR_ROWS||[]).filter(function(r){ return !r.at||new Date(r.at).getTime()>=cut; }), O=lvrOpen(), A=C.concat(O.filter(function(r){ return r.diff!=null; }));
  var tot=A.reduce(function(t,r){ return t+(r.diff||0); },0), pts={}; A.forEach(function(r){ pts[r.id]=1; });
  var byWho={}; A.forEach(function(r){ var w=r.by[0]||'—', b=byWho[w]=byWho[w]||{n:{},diff:0,days:0}; b.n[r.id]=1; b.diff+=r.diff||0; b.days++; });
  var who=Object.keys(byWho).sort(function(a,b){ return byWho[b].diff-byWho[a].diff; });
  var per='<div class="lvr-per" role="group" aria-label="Period">'+[7,30,90].map(function(n){ return '<button type="button" data-lvr="'+n+'" aria-pressed="'+(LVR_DAYS===n)+'">'+n+' days</button>'; }).join('')+'</div>';
  return '<div class="op-head"><span class="op-ic">'+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/></svg>'+'</span><div><div class="op-kind">Owner report</div><h3>Lowered hospitalization levels</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">Hours billed below the level the sheet worked out from what was charted (oxygen, IV fluids, monitoring, the problem list), and who set the lower level.</p>'+per
    +(LVR_ROWS==null&&!err?'<div class="lvr-empty">Loading…</div>'
      :'<div class="lvr-tot"><div><small>Below the sheet’s level</small><b>'+chMoney(Math.round(tot*100)/100)+'</b></div><div><small>Patients</small><b>'+Object.keys(pts).length+'</b></div><div><small>Days</small><b>'+A.length+'</b></div></div>'
      +(err?'<div class="lvr-empty">Couldn’t read the closed sheets — showing patients still in hospital only.</div>':'')
      +(who.length?'<h4 class="lvr-h">By who lowered it</h4><div class="op-list">'+who.map(function(w){ var b=byWho[w]; return '<div class="op-row"><span>'+esc(w)+'</span><b>'+Object.keys(b.n).length+' patient'+(Object.keys(b.n).length>1?'s':'')+' · '+b.days+' day'+(b.days>1?'s':'')+' · '+chMoney(Math.round(b.diff*100)/100)+'</b></div>'; }).join('')+'</div>':'<div class="lvr-empty">Nothing billed below the sheet’s level in the last '+LVR_DAYS+' days.</div>')
      +(A.length?'<h4 class="lvr-h">Stays</h4><div class="op-list">'+A.sort(function(a,b){ return String(b.at).localeCompare(String(a.at)); }).map(function(r){ return '<div class="op-row lvr-row"><span><b>'+esc(r.name)+'</b><small>'+(r.open?'In hospital':esc(fmtWhen(r.at)))+' · Day '+r.day+' · '+esc(r.by.join(', '))+'</small></span><b>'+esc(lvrLvl(r.billed))+' billed<br><small>sheet: '+esc(lvrLvl(r.auto))+'</small><br>−'+chMoney(r.diff)+'</b></div>'; }).join('')+'</div>':'')
      +(O.filter(function(r){ return r.now; }).length?'<h4 class="lvr-h">Set lower right now</h4><div class="op-list">'+O.filter(function(r){ return r.now; }).map(function(r){ return '<div class="op-row"><span>'+esc(r.name)+' · '+esc(r.by.join(', '))+'</span><b>Level '+r.now.level+' (sheet: '+r.now.auto+')</b></div>'; }).join('')+'</div>':''));
}
function lvrPaint(err){ var m=document.getElementById('tsOrderSheet'), card=m&&m.querySelector('.op-card.lvr'); if(!card) return; card.innerHTML=lvrHTML(err); }
window.tsLevelsReport=function(){ if(!lvrOwner()) return; opShow(lvrHTML(),'lvr'); var card=document.querySelector('#tsOrderSheet .op-card.lvr');
  card.onclick=function(e){ var b=e.target.closest('[data-lvr]'); if(!b) return; LVR_DAYS=+b.getAttribute('data-lvr'); lvrPaint(); };
  lvrLoad(); };
/* ═════════ TS SETTINGS — owner / admin tools, out of the clinical screens (Oct 2026) ═════════
   A gear beside the patient chip, shown only to the owner and admins, opens one sheet with:
   · Intern mode — order as an intern would, on this device until the tab closes (store/drafts.js tsInternTry);
     while it is on, an "Intern mode on" pill stays on the sheet toolbar to turn it off.
   · Intern drafts — which interns' orders need a doctor's approval (tsInternsOpen), for the people allowed to change it.
   · Lowered levels — the owner's report of hospitalization billed below the sheet's level (store/levels.js), the owner only.
   · Code list — how many codes are loaded and Import code list (.json) (store/charges.js tsChImport).
   Clinicians never see any of it. */
var STG_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
var stgOn=false;
function stgAllowed(){ try{ return !!(window.tsChAdmin&&tsChAdmin()); }catch(e){ return false; } }
function stgButton(){ var chip=document.getElementById('tsPatientChip'), b=document.getElementById('tsSettingsBtn');
  if(!stgAllowed()){ if(b) b.remove(); return; }
  if(!chip||b) return; b=document.createElement('button'); b.type='button'; b.id='tsSettingsBtn'; b.className='ts-gear'; b.title='Settings'; b.setAttribute('aria-label','Settings');
  b.innerHTML=STG_ICON; b.onclick=function(e){ e.stopPropagation(); tsSettingsOpen(); }; chip.parentNode.insertBefore(b,chip.nextSibling); }
on('header.refresh',stgButton); on('rendered',stgButton); on('chip',function(){ setTimeout(stgButton,0); });

function stgRow(title,lead,ctl){ return '<div class="stg-row"><div class="stg-tx"><b>'+title+'</b><small>'+lead+'</small></div><div class="stg-ctl">'+ctl+'</div></div>'; }
function stgHTML(){ var admin=staffRole()==='admin', trying=window.tsInternTrying&&tsInternTrying(), info=window.tsChCodesInfo?tsChCodesInfo():'';
  var canDrafts=false; try{ canDrafts=drCanEdit(); }catch(e){}
  return '<div class="op-head"><span class="op-ic">'+STG_ICON+'</span><div><div class="op-kind">Owner &amp; admins</div><h3>Settings</h3></div><button type="button" class="op-x" onclick="tsSettingsClose()" aria-label="Close">×</button></div>'
    +'<div class="stg-list">'
    +(admin?stgRow('Intern mode','Order as an intern would: your orders become drafts. Only on this device, until the tab closes.','<button type="button" class="stg-btn'+(trying?' on':'')+'" data-stg="intern" aria-pressed="'+(!!trying)+'">'+(trying?'Turn off':'Turn on')+'</button>'):'')
    +(canDrafts?stgRow('Intern drafts','Which interns’ orders need a doctor’s approval.','<button type="button" class="stg-btn" data-stg="drafts">Choose…</button>'):'')
    +(window.tsLevelsOwner&&tsLevelsOwner()?stgRow('Lowered levels','Hospitalization billed below the level the sheet worked out, by who lowered it. Only you see this.','<button type="button" class="stg-btn" data-stg="levels">Open report</button>'):'')
    +(window.tsInsSplitCount&&canOrderTS()&&tsInsSplitCount()?stgRow('Long order names',tsInsSplitCount()+' on this sheet could be a short name with the rest kept as instructions. You see the list before anything changes.','<button type="button" class="stg-btn" data-stg="names">Review…</button>'):'')
    +stgRow('Code list',(info?esc(info):'Not loaded yet')+'. Import the WOOFware code list with its prices and fees.','<label class="stg-btn">Import (.json)<input type="file" accept=".json,application/json" hidden id="stgImport"></label>')
    +'</div>'; }
function stgRender(){ if(!stgOn) return; var m=document.getElementById('tsOrderSheet'), card=m&&m.querySelector('.op-card.stg');
  if(!card||!m.classList.contains('show')){ opShow(stgHTML(),'stg'); card=document.querySelector('#tsOrderSheet .op-card.stg'); } else card.innerHTML=stgHTML();
  card.onclick=function(e){ var b=e.target.closest('[data-stg]'); if(!b) return; var k=b.getAttribute('data-stg');
    if(k==='intern'){ tsInternTry(); stgRender(); }
    else if(k==='drafts'){ stgOn=false; tsInternsOpen(); }
    else if(k==='names'){ stgOn=false; tsInsSplitOpen(); }
    else if(k==='levels'){ stgOn=false; tsLevelsReport(); } };
  var f=card.querySelector('#stgImport'); if(f) f.onchange=function(){ tsChImport(f); }; }
window.tsSettingsOpen=function(){ if(!stgAllowed()) return; stgOn=true; stgRender(); try{ if(window.tsChCodesInfo&&!tsChCodesInfo()) chLoad().then(function(){ if(stgOn) stgRender(); }); }catch(e){} };   /* the code list loads on first use */
window.tsSettingsClose=function(){ stgOn=false; tsOrderClose(); };
on('ch.imported',function(){ if(stgOn) stgRender(); });
/* ═════════ TS LAST VIEW — each person comes back to where they were (Oct 2026) ═════════
   Remembered per signed-in person, on this device (localStorage tsLastView_v1: {uid: {tab, board, tx}}) — a convenience, never shared:
   the tab (Dashboard, Tasks, Treatment Sheet, Vitals, Timeline, Charges, Notes), the Status Board view (My / OP / IP / Boarding) and the TX view switch.
   The open patient is already remembered (base.js tsCurrentSheet); the board filters, Tasks filters, row density and folded sections remember themselves.
   A link to a sheet (#sheet=…) wins over the remembered tab, and so does anything the person taps before the restore runs. */
var LV_KEY='tsLastView_v1', LV_PATIENT={sheet:1,vitals:1,timeline:1,charges:1,notes:1}, lvDone=false, lvBusy=false, lvT0=Date.now();
function lvAll(){ try{ return JSON.parse(localStorage.getItem(LV_KEY)||'{}')||{}; }catch(e){ return {}; } }
function lvUid(){ try{ return (AUTH&&AUTH.currentUser&&AUTH.currentUser.uid)||''; }catch(e){ return ''; } }
function lvGet(){ var u=lvUid(); return u?(lvAll()[u]||{}):null; }
function lvPut(o){ var u=lvUid(); if(!u) return; try{ var a=lvAll(); a[u]=Object.assign({},a[u]||{},o); localStorage.setItem(LV_KEY,JSON.stringify(a)); }catch(e){} }
/* the sheet in the address is this app's own (it writes #sheet= when a sheet opens) unless it differs from the one remembered: then it is a link someone followed */
var lvOwnHash=(function(){ try{ var h=(location.hash.match(/sheet=([^&]+)/)||[])[1]; return !h||decodeURIComponent(h)===localStorage.getItem('tsCurrentSheet'); }catch(e){ return true; } })();
on('tab',function(tab){
  if(!lvBusy&&!lvDone&&lvUid()){ if(lvOwnHash&&tab==='sheet'&&Date.now()-lvT0<10000) return;   /* reopening the remembered sheet at start — not a choice */
    lvDone=true; }   /* the person (or a sheet link) chose — keep it */
  lvPut({tab:tab}); });
on('board.view',function(){ try{ lvPut({board:sbBoard,tx:!!sbTx}); }catch(e){} });
function lvRestore(){ if(lvDone) return; var P=lvGet(); if(!P) return;
  if(Date.now()-lvT0>10000){ lvDone=true; return; }   /* too late to move anyone */
  lvBusy=true;
  try{ if(P.board&&['My Board','OP Board','IP Board','Boarding'].indexOf(P.board)>-1&&P.board!==sbBoard) sbBoard=P.board; if(typeof P.tx==='boolean') sbTx=P.tx; }catch(e){}
  var t=P.tab;
  if(!t||t==='dash'||!document.getElementById('ctab-'+t)){ lvDone=true; if(currentCTab==='dash') try{ renderDash(); }catch(e){} lvBusy=false; return; }
  if(LV_PATIENT[t]&&!CUR){ lvBusy=false; return; }   /* wait for the remembered patient to open */
  lvDone=true; if(currentCTab!==t) try{ selectCTab(t); }catch(e){} lvBusy=false; }
on('rendered',function(){ if(!lvDone) setTimeout(lvRestore,0); });
on('chip',function(){ if(!lvDone) setTimeout(lvRestore,0); });
/* ═════════ TS FIND — the header search finds patients ═════════
   The sub-nav search ("Search patients, orders…") looks through every open sheet as you type: pet name, family name, owner, problem,
   ward, doctor, breed. One search for the whole app — the Status Board's own "Name or problem…" box is gone.
   · On the Status Board the rows filter as you type, a chip ("lind ×") shows the board is filtered, and return opens the first match.
   · Anywhere else a short list drops down under the bar: ↑ ↓ move, return or a tap opens the patient.
   · esc, or leaving the tab, clears it.
   A typed command (voice.js: "bupe done", "open vitals") wins: its hint shows and no patient list does. */
var FIND_Q='', FIND_SEL=0, FIND_EL=null;
function findBox(){ return document.getElementById('globalSearch'); }
function findHay(s){ var p=s.patient||{}; return [p.name,p.last,p.owner,p.reason,p.location,p.doctor,p.breed].filter(Boolean).join(' ').toLowerCase(); }
function findNm(s){ var p=s.patient||{}; return ((p.name||'')+' '+(p.last||'')).trim()||'Unnamed'; }
function findList(q){ q=String(q||'').trim().toLowerCase(); if(!q) return []; var W=q.split(/\s+/);
  return SHEETS.filter(function(s){ var h=findHay(s); return W.every(function(w){ return h.indexOf(w)>-1; }); })
    .sort(function(a,b){ var A=findNm(a).toLowerCase().indexOf(q)===0?0:1, B=findNm(b).toLowerCase().indexOf(q)===0?0:1; return A-B; }); }
function findOnBoard(){ return typeof currentCTab!=='undefined'&&currentCTab==='dash'; }
function findCmd(){ var h=[].slice.call(document.querySelectorAll('.ts-cmd-hint.show')).filter(function(x){ return x!==FIND_EL; }); return h.length>0; }
function findHide(){ if(FIND_EL) FIND_EL.classList.remove('show'); }
function findRedraw(){ if(findOnBoard()){ try{ renderDash(); }catch(e){} } }
window.tsFindClear=function(keepFocus){ var b=findBox(); if(b) b.value=''; var had=!!FIND_Q; FIND_Q=''; FIND_SEL=0; findHide(); if(had) findRedraw(); if(b&&keepFocus) b.focus(); };
/* the board keeps only the matching patients (before the work filter trims it further) */
on('board.rows',function(list){ if(!FIND_Q) return; var ids={}; findList(FIND_Q).forEach(function(s){ ids[s._id]=1; });
  for(var i=list.length-1;i>=0;i--){ if(!ids[list[i]._id]) list.splice(i,1); } },98);
window.tsFindChip=function(){ if(!FIND_Q) return '';
  return '<button type="button" class="sb-wf-chip ts-find-chip" onclick="tsFindClear()" title="Showing patients matching “'+esc(FIND_Q)+'” — tap to show everyone">“'+esc(FIND_Q)+'”<span aria-hidden="true">×</span></button>'; };
function findEl(){ if(FIND_EL) return FIND_EL; FIND_EL=document.createElement('div'); FIND_EL.id='tsFind'; FIND_EL.className='ts-menu ts-find'; FIND_EL.setAttribute('role','listbox'); document.body.appendChild(FIND_EL);
  FIND_EL.addEventListener('mousedown',function(e){ e.preventDefault(); var b=e.target.closest('[data-open]'); if(b) findOpen(b.getAttribute('data-open')); });
  return FIND_EL; }
function findPlace(){ var bar=document.querySelector('.subnav .search-bar')||findBox(); if(!bar||!FIND_EL) return; var r=bar.getBoundingClientRect();
  var w=Math.max(280,Math.min(r.width,innerWidth-16)), l=Math.max(8,Math.min(r.left,innerWidth-8-w));
  FIND_EL.style.top=(r.bottom+8)+'px'; FIND_EL.style.left=l+'px'; FIND_EL.style.width=w+'px'; }
function findOpen(id){ tsFindClear(); var b=findBox(); if(b) b.blur(); openSheet(id,true); }
function findShow(){ var el=findEl(), L=findList(FIND_Q), board=findOnBoard();
  if(!FIND_Q||findCmd()){ findHide(); return; }
  if(board){   /* the board itself is the list: one line says what return does */
    el.innerHTML=L.length?'<div class="ts-find-tip"><span class="ic">↵</span><span class="tx">Open <b>'+esc(findNm(L[0]))+'</b>'+(L.length>1?' · '+L.length+' on the board':'')+'</span></div>'
      :'<div class="me">No patient matches “'+esc(FIND_Q)+'”.</div>';
  } else {
    FIND_SEL=Math.min(FIND_SEL,Math.max(0,L.length-1));
    el.innerHTML='<div class="mh">Patients</div>'+(L.length?L.slice(0,6).map(function(s,k){ var p=s.patient||{};
      return '<button type="button" class="mi'+(k===FIND_SEL?' cur':'')+(s._id===CUR?' open':'')+'" role="option" aria-selected="'+(k===FIND_SEL)+'" data-open="'+esc(s._id)+'"><span class="av">'+esc(((p.name||'?')[0]||'?').toUpperCase())+'</span><span class="tx"><b>'+esc(findNm(s))+'</b><small>'
        +esc([boardOf(s)==='OP Board'?'OP':'IP',p.location,p.reason].filter(Boolean).join(' · '))+'</small></span></button>'; }).join('')
      :'<div class="me">No patient matches “'+esc(FIND_Q)+'”.</div>');
  }
  findPlace(); el.classList.add('show'); }
document.addEventListener('input',function(e){ if(!e.target||e.target.id!=='globalSearch') return; var q=e.target.value.trim();
  if(q===FIND_Q) return; FIND_Q=q; FIND_SEL=0; findRedraw(); setTimeout(findShow,0); });   /* after voice.js decides whether it's a command */
document.addEventListener('focusin',function(e){ if(e.target&&e.target.id==='globalSearch'&&FIND_Q) setTimeout(findShow,0); });
document.addEventListener('focusout',function(e){ if(e.target&&e.target.id==='globalSearch') setTimeout(findHide,150); });
document.addEventListener('keydown',function(e){ if(!e.target||e.target.id!=='globalSearch'||e.isComposing) return;
  if(e.key==='Escape'){ if(FIND_Q){ e.preventDefault(); tsFindClear(true); } return; }
  if(!FIND_Q||findCmd()) return; var L=findList(FIND_Q);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ if(findOnBoard()||!L.length) return; e.preventDefault(); var n=Math.min(L.length,6); FIND_SEL=(FIND_SEL+(e.key==='ArrowDown'?1:n-1))%n; findShow(); return; }
  if(e.key==='Enter'){ var s=L[findOnBoard()?0:FIND_SEL]; if(s){ e.preventDefault(); findOpen(s._id); } } });
on('tab',function(){ if(FIND_Q) tsFindClear(); });
addEventListener('resize',function(){ if(FIND_EL&&FIND_EL.classList.contains('show')) findPlace(); });
/* ═════════ TS FINANCE — the account card in the sheet sidebar (Oct 2026) ═════════
   Quiet by default, so treatment stays the focus: the estimate range, whether the client approved it, and the deposit balance
   (deposit − current charges) with one line tying the projection to that balance. Everything else is under "Details".
   Projected = current charges (from the medical record) + what the sheet's orders add by 8 AM tomorrow (store/charges.js).
   Data and editor unchanged: base.js estOf / applyEstimateToVisit / openEstimate. */
var FIN_KEY='tsFinOpen_v1';
function finOpen(){ try{ return localStorage.getItem(FIN_KEY)==='1'; }catch(e){ return false; } }
/* Oct 2026: the old "Estimate Range" look again (range, approval pill, remaining + bar), with the rest folded under Details.
   Details opens in place (no redraw) and is remembered per person. Motion answers changes only — nothing loops:
   amounts roll digit by digit, the bar glides with a spring + one light along it, crossing into low/over sends one ring from the thumb,
   approval turns the pill green as its check draws; opening a sheet, the bar fills once. Reduce Motion: none of it. */
window.tsFinToggle=function(ev){ if(ev){ ev.stopPropagation(); ev.preventDefault(); } var o=!finOpen(); try{ localStorage.setItem(FIN_KEY,o?'1':'0'); }catch(e){}
  var c=document.querySelector('#ctab-sheet .est-card.fin2'); if(!c){ try{ refreshEstimate(); }catch(e){} return; }
  c.classList.toggle('open',o); var b=c.querySelector('.est-more'); if(b){ b.setAttribute('aria-expanded',String(o)); b.firstChild.nodeValue=o?'Hide details':'Details'; }
  var x=c.querySelector('.est-x .in'); if(x) x.inert=!o; };
function finMoney(n,cents){ return (n<0?'−':'')+'$'+Math.abs(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:cents?2:0,maximumFractionDigits:cents?2:0}); }
function finProj(cur){ try{ if(!CH_PP_OK) return null; var t=chHzTime('8am'), P=chProject(t); if(!(P.add>0)) return null; return {at:chHzLabel(t).replace(/^tomorrow /,'').replace(':00',''),tomorrow:/^tomorrow/.test(chHzLabel(t)),add:P.add,total:cur+P.add,unpriced:P.unpriced}; }catch(e){ return null; } }
function finRow(k,v,cls,odo){ return '<div class="est-row"><span class="k">'+k+'</span><span class="v'+(cls?' '+cls:'')+'"'+(odo?' data-odo="'+odo+'"':'')+'>'+v+'</span></div>'; }
var FIN_CHK='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path class="hands" d="M12 7v5l3 2" fill="none" stroke="var(--fin-card)" stroke-width="2.2" stroke-linecap="round"/><path class="tick" d="M8 12.5l2.5 2.5 5.5-6" fill="none" stroke="var(--fin-card)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var FIN_INFO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>';
var FIN_CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
window.estimateCard=function(){
  applyEstimateToVisit(); var e=estOf(), edit=canEditEstimate(), open=finOpen();
  if(!e) return '<div class="panel est-card fin2 fin-empty"><h4>Estimate Range</h4><div class="est"><div class="ts-est-none">No estimate on file</div>'
    +(edit?'<button type="button" class="fin-link" onclick="openEstimate()">Add estimate</button>':'<div class="est-sub">A doctor adds the estimate.</div>')+'</div></div>';
  var lo=VISIT.estLow, hi=VISIT.estHigh, cur=VISIT.estCurrent, dep=VISIT.estDeposit, hasDep=dep!=null&&dep>0, rem=hasDep?dep-cur:null, over=rem!=null&&rem<0;
  var left=hasDep?Math.max(0,Math.min(100,rem/dep*100)):0, tone=!hasDep?'cyan':over?'red':left>25?'cyan':'amber', pending=VISIT.estApprovedBy==='Not yet approved';
  var h='<h4>Estimate Range</h4><div class="est">'
    +'<button type="button" class="est-range" onclick="event.stopPropagation();openEstimate()" aria-label="Estimate '+finMoney(lo,true)+' to '+finMoney(hi,true)+' — open the estimate">'+finMoney(lo,true)+' — '+finMoney(hi,true)+'</button>'
    +'<div class="est-status"><span class="est-pill '+(pending?'warn':'ok')+'" data-appr="'+(pending?0:1)+'">'+FIN_CHK+'<span class="t">'+(pending?'Awaiting approval':'Approved')+'</span></span></div>'
    +'<div class="est-div"></div>'
    +finRow('Remaining',rem==null?'No deposit recorded':finMoney(rem,true),tone==='cyan'?'':tone,rem==null?'':'rem');
  var P=finProj(cur);
  if(P){ var pl=hasDep?dep-P.total:null, ph=P.total>hi;
    h+='<div class="est-proj'+((pl!=null&&pl<0)||ph?' warn':'')+'"><b>By '+esc(P.at)+(P.tomorrow?' tomorrow':'')+': about <span data-odo="proj">'+finMoney(P.total)+'</span></b><span>'
      +(pl==null?'No deposit to compare with':pl<0?finMoney(-pl)+' more than the deposit':finMoney(pl)+' of the deposit left')+(ph?' · above the high end':'')+'</span></div>'; }
  if(hasDep) h+='<div class="est-bar" role="img" aria-label="'+(over?'Charges are past the deposit':Math.round(left)+'% of the deposit left')+'"><div class="est-fill '+tone+'" data-w="'+(over?100:left).toFixed(1)+'" data-tone="'+tone+'" style="width:'+(over?100:left).toFixed(1)+'%"><span class="sheen"></span></div>'+(over?'':'<div class="est-cap"></div>')+'</div>';
  h+='<button type="button" class="est-more" aria-expanded="'+open+'" aria-controls="finX" onclick="tsFinToggle(event)">'+(open?'Hide details':'Details')+FIN_CHEV+'</button>'
    +'<div class="est-x" id="finX"><div><div class="in"'+(open?'':' inert')+'>'
    +(hasDep?'<div class="est-ends"><span><b>'+finMoney(0,true)+'</b>Used up</span><span class="hi"><b>'+finMoney(dep,true)+'</b>Deposit</span></div>':'')
    +'<div class="est-div"></div>'
    +finRow('Current charges',finMoney(cur,true),'','cur')+finRow('Deposit',hasDep?finMoney(dep,true):'—','',hasDep?'dep':'')
    +(P?finRow('Added by '+esc(P.at)+' from orders','+'+finMoney(P.add,true)+(P.unpriced?' <small>('+P.unpriced+' without a price)</small>':'')):'')
    +finRow('Approved by',pending?'—':esc(VISIT.estApprovedBy||'—'))+finRow('Approved at',pending?'—':esc(VISIT.estApprovedTime||'—'))+finRow('Client initials',esc(VISIT.estClientInitials||'—'))
    +(VISIT.estPlan&&VISIT.estPlan!=='—'?finRow('Treatment plan',esc(VISIT.estPlan)):'')
    +'<div class="est-note'+(over?' bad':'')+'">'+FIN_INFO+'<span>'+(over?'Charges are past the deposit. Collect an additional deposit before continuing.':'Stay near the low end when possible. Don’t exceed the high end without updated client authorization.')+'</span></div>'
    +'<div class="est-foot"><button type="button" class="fin-link" onclick="event.stopPropagation();openEstimate()">'+(edit?'Update estimate':'View estimate')+'</button><span>Updated '+esc(VISIT.estLastUpdated||'—')+'</span></div>'
    +'</div></div></div></div>';
  try{ requestAnimationFrame(function(){ tsFinMotion(); }); }catch(x){}
  return '<div class="panel est-card fin2'+(open?' open':'')+'" onclick="if(!event.target.closest(\'button\'))openEstimate()">'+h+'</div>'; };
/* ---------- motion ---------- */
var FM={key:null,v:{},w:null,tone:null,appr:null,pw:0};
function finStill(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
var FIN_COL='0123456789'.split('').map(function(n){ return '<b>'+n+'</b>'; }).join('');
/* roll an amount from its old text to its new one, aligned from the right; plain text again once it settles */
function finRoll(el,from,to){ var ch=to.split(''), o=from.split(''), pad=ch.length-o.length, cols=[];
  el.innerHTML='<span class="fin-sr">'+esc(to)+'</span><span class="odo" aria-hidden="true">'+ch.map(function(c,i){ if(!/\d/.test(c)) return '<span class="c">'+esc(c)+'</span>'; var k=i-pad, p=k>=0&&/\d/.test(o[k])?+o[k]:0;
    return '<span class="d"><i style="transition:none;transform:translateY(-'+(p*1.25)+'em)" data-to="'+c+'">'+FIN_COL+'</i></span>'; }).join('')+'</span>';
  void el.offsetWidth; var I=el.querySelectorAll('.d i'), n=I.length;
  [].forEach.call(I,function(col,ix){ col.style.transition=''; col.style.transitionDelay=((n-1-ix)*35)+'ms'; col.style.transform='translateY(-'+(+col.getAttribute('data-to')*1.25)+'em)'; });
  setTimeout(function(){ if(el.isConnected&&el.querySelector('.fin-sr')) el.textContent=to; },1300); }
window.tsFinMotion=function(){ var c=document.querySelector('#ctab-sheet .est-card.fin2:not(.fin-empty)'); if(!c) return;
  var key=(curDoc&&curDoc.id)||'', still=finStill(), f=c.querySelector('.est-fill'), pill=c.querySelector('.est-pill');
  var vals={}; [].forEach.call(c.querySelectorAll('[data-odo]'),function(el){ var k=el.getAttribute('data-odo'); if(k) vals[k]=el.textContent; });
  var w=f?parseFloat(f.getAttribute('data-w')):null, tone=f?f.getAttribute('data-tone'):null, appr=pill?pill.getAttribute('data-appr')==='1':null;
  if(FM.key!==key){ FM.key=key;
    if(f&&!still){ f.style.transition='none'; f.style.width='0%'; void f.offsetWidth; f.style.transition=''; f.style.width=w+'%'; f.classList.add('shine'); setTimeout(function(){ f.classList.remove('shine'); },1700); } }
  else if(!still){
    [].forEach.call(c.querySelectorAll('[data-odo]'),function(el){ var k=el.getAttribute('data-odo'), was=FM.v[k]; if(k&&was&&was!==vals[k]) finRoll(el,was,vals[k]); });
    if(f&&FM.w!=null&&FM.w!==w){ f.style.transition='none'; f.style.width=FM.w+'%'; void f.offsetWidth; f.style.transition=''; f.style.width=w+'%'; f.classList.add('shine');
      if(FM.tone&&tone!==FM.tone&&tone!=='cyan') f.classList.add('ping'); setTimeout(function(){ f.classList.remove('shine','ping'); },1800); }
    if(pill&&FM.appr===false&&appr){ var w1=pill.getBoundingClientRect().width; pill.classList.add('just');
      if(pill.animate&&FM.pw) pill.animate([{width:FM.pw+'px'},{width:w1+'px'}],{duration:500,easing:'cubic-bezier(.32,.72,0,1)'});
      setTimeout(function(){ pill.classList.remove('just'); },1100); } }
  FM.v=vals; FM.w=w; FM.tone=tone; FM.appr=appr; FM.pw=pill?pill.getBoundingClientRect().width:0; };
/* ═════════ TS ORDER CARE — what the order window and the order panel add (Oct 2026) ═════════
   · Price at the moment of ordering: this hospital's price for one dose (charge_codes/prices via store/charges.js) and about a day's worth.
   · Hard stop: a dose outside the reference turns the button into a red "Order anyway"; it still needs a reason (store/medsafe.js).
   · Note required: a doctor can make an order need a note every time it is charted (catheter site, injection site …). The chart drawer,
     the Vitals tab and charting an hour all ask for it (store/chart.js · vitals.js · tasks.js).
   · Owner handout: a one-page, plain-language sheet for a medication — what it's for, how much and how often — edited, then printed.
   · Copy (one button, a menu: Treatments · Latest vitals): the sheet's active orders, or the latest vitals, as text for the record or a message. */
function ocFreqDay(f){ f=String(f||''); var m=/^q(\d+)h$/i.exec(f); if(m) return 24/(+m[1]); if(/^once$/i.test(f)) return 1; if(/^sid$/i.test(f)) return 1; if(/^bid$/i.test(f)) return 2; if(/^tid$/i.test(f)) return 3; return null; }
function ocPriceHTML(o){ if(!window.tsChOrderPrice) return ''; var p=tsChOrderPrice(o), M=window.tsChMoney||function(n){ return '$'+n; };
  if(!p) return '<div class="oc-price none"><span>No hospital price for '+esc(o.name)+' yet</span>'+(window.tsChAdmin&&tsChAdmin()?'<small>Set it in Charges</small>':'')+'</div>';
  var n=ocFreqDay(o.freq), day=n&&n>1?' · about <b>'+M(Math.round(p.price*n*100)/100)+'</b> a day':'';
  return '<div class="oc-price"><span class="oc-price-k">Charge</span><span><b>'+M(p.price)+'</b> a dose'+day+'</span>'+(p.code?'<small>'+esc(p.code)+(p.per?' · '+p.per+' '+esc(p.u)+' × '+M(p.unitPrice):'')+(p.fee?' + '+M(p.fee)+' fee':'')+'</small>':'')+'</div>'; }

/* ---------- the medication order window ---------- */
on('rx.opened',function(){ var c=document.getElementById('rxCalc'); if(!c||document.getElementById('rxPrice')) return;
  var pr=document.createElement('div'); pr.id='rxPrice'; c.parentNode.insertBefore(pr,c.nextSibling);
  var g=document.querySelector('#tsModal .tm-grid'); if(g){ var r=document.createElement('div'); r.className='oc-req-row';
    r.innerHTML='<label class="oc-req"><button type="button" role="switch" id="rxNoteReq" class="v-sw" aria-checked="false" onclick="tsOcReqToggle(this)"><i></i></button><span>Require a note each time it’s given</span></label>'
      +'<input id="rxNoteReqP" class="oc-req-p" placeholder="What should the note say? e.g. Injection site" hidden>';
    g.parentNode.insertBefore(r,g.nextSibling); }
  var ok=document.querySelector('#tsModal [data-ok]'); if(ok) ok.setAttribute('data-label',ok.textContent);
  if(window.tsChReady) tsChReady().then(function(){ ocPaint(); }); });
window.tsOcReqToggle=function(b){ var on=b.getAttribute('aria-checked')!=='true'; b.setAttribute('aria-checked',String(on)); var p=document.getElementById('rxNoteReqP'); if(p){ p.hidden=!on; if(on) p.focus(); } };
function ocPaint(){ if(!RX) return; var el=document.getElementById('rxPrice'), v=function(id){ return ((document.getElementById(id)||{}).value||'').trim(); };
  if(el) el.innerHTML=ocPriceHTML({name:RX.x.n,type:'med',route:v('rxRoute'),freq:v('rxFreq')});
  window.tsOcFoot(); }
/* the button says what will happen: a flagged dose is ordered "anyway", in red */
window.tsOcFoot=function(){ var b=document.querySelector('#tsModal [data-ok]'); if(!b||!RX) return; var base=b.getAttribute('data-label')||b.textContent;
  var flag=RX.msFlags&&RX.msFlags.length&&base==='Add to sheet';
  b.textContent=flag?'Order anyway':base; b.classList.toggle('danger',!!flag); };
on('rx.calc',ocPaint,100);
on('rx.build',function(o){ var sw=document.getElementById('rxNoteReq'); if(sw&&sw.getAttribute('aria-checked')==='true'){ o.note_req=true; var p=((document.getElementById('rxNoteReqP')||{}).value||'').trim(); if(p) o.note_prompt=p; } });

/* ---------- the order panel ---------- */
window.tsOcPanelRows=function(o){ if(!o||o.dc) return ''; var h='';
  if(o.type==='med'||o.type==='diag') h+=ocPriceHTML(o);
  var can=canOrderTS()&&!(window.tsViewDk&&tsViewDk()!==dayKey());
  if(can&&!o.cont) h+='<div class="oc-req-row in-panel"><label class="oc-req"><button type="button" role="switch" class="v-sw" aria-checked="'+(!!o.note_req)+'" onclick="tsOcReqSet(\''+esc(o.id)+'\',this)"><i></i></button><span>Require a note when charted</span></label>'
    +'<input class="oc-req-p" id="ocReqP" placeholder="What should the note say? e.g. Catheter site and condition" value="'+esc(o.note_prompt||'')+'"'+(o.note_req?'':' hidden')+' onchange="tsOcReqPrompt(\''+esc(o.id)+'\',this.value)"></div>';
  else if(o.note_req) h+='<div class="oc-req-ro">Needs a note when charted'+(o.note_prompt?' — '+esc(o.note_prompt):'')+'</div>';
  if(o.type==='med') h+='<button type="button" class="op-btn oc-handout" onclick="tsOcHandout(\''+esc(o.id)+'\')"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>Owner handout</button>';
  return h; };
window.tsOcReqSet=function(id,b){ var on=b.getAttribute('aria-checked')!=='true', me=user(), o=oFind(id); if(!o) return; b.setAttribute('aria-checked',String(on));
  var p=document.getElementById('ocReqP'); if(p){ p.hidden=!on; if(on) setTimeout(function(){ p.focus(); },30); }
  updateOrder(id,{note_req:on||null,note_prompt:on?(o.note_prompt||null):null});
  logEvent('doctor','<b>'+esc(o.name)+'</b> — '+(on?'a note is now required when charted':'note no longer required'),me.initials); toast(on?'A note will be required when charted':'Note no longer required'); };
window.tsOcReqPrompt=function(id,v){ var o=oFind(id); if(!o) return; v=String(v||'').trim(); if((o.note_prompt||'')===v) return; updateOrder(id,{note_prompt:v||null}); };

/* ---------- owner handout ---------- */
var OC_ROUTE={PO:'by mouth',SQ:'as an injection under the skin',SC:'as an injection under the skin',IM:'as an injection into the muscle',IV:'into the vein (given by our team)',Topical:'on the skin',Ophthalmic:'in the eye',Otic:'in the ear',Rectal:'rectally',Inhaled:'by inhaler',Intranasal:'in the nose',Transdermal:'on the skin of the ear'};
function ocFreqWords(f){ f=String(f||''); var m=/^q(\d+)h$/i.exec(f); if(m){ var h=+m[1]; return h===24?'once a day':h===12?'twice a day, about every 12 hours':h===8?'three times a day, about every 8 hours':'every '+h+' hours'; }
  return /^once$/i.test(f)?'once':/^prn$/i.test(f)?'only when needed, as your veterinarian explained':f; }
window.tsOcHandout=function(id){ var o=oFind(id); if(!o) return; var d=medDose(o), br=window.tsBrand?tsBrand(o.name):'', p=(curDoc&&curDoc.patient)||{};
  var how='Give '+d.mg+(o.conc&&d.volume?' ('+d.volume+')':'')+' '+(OC_ROUTE[o.route]||String(o.route||'').toLowerCase())+', '+ocFreqWords(o.freq)+'.';
  var html='<div class="op-head"><span class="op-ic t-med"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    +'<div><div class="op-kind">Owner handout</div><h3>'+esc(o.name)+(br?' <span class="op-brand">'+esc(br)+'</span>':'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">Check and edit the wording, then print. Nothing here changes the order.</p>'
    +'<div class="oc-ho-form"><label>What it’s for<input id="hoFor" value="'+esc((o.ref&&o.ref.indication)||'')+'" placeholder="e.g. Nausea and vomiting"></label>'
    +'<label>How to give it<textarea id="hoHow" rows="2">'+esc(how)+'</textarea></label>'
    +'<label>Next dose<input id="hoNext" placeholder="e.g. Tomorrow at 8 AM"></label>'
    +'<label>Notes from your veterinarian<textarea id="hoNotes" rows="3" placeholder="Side effects to watch for, giving it with food …"></textarea></label></div>'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderPanel(\''+esc(o.id)+'\')">Back</button><button type="button" class="op-btn primary" onclick="tsOcHandoutPrint(\''+esc(o.id)+'\')">Print handout</button></div>';
  opShow(html,'wide'); };
window.tsOcHandoutPrint=function(id){ var o=oFind(id); if(!o) return; var p=(curDoc&&curDoc.patient)||{}, v=function(k){ return ((document.getElementById(k)||{}).value||'').trim(); }, br=window.tsBrand?tsBrand(o.name):'';
  var me=user(), doc=o.ordered_by_name||me.name||'', pet=[p.name,p.last].filter(Boolean).join(' '), today=new Date().toLocaleDateString([], {month:'long',day:'numeric',year:'numeric'});
  var sec=function(t,b){ return b?'<section><h2>'+esc(t)+'</h2><p>'+esc(b).replace(/\n/g,'<br>')+'</p></section>':''; };
  var page='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(o.name)+' — '+esc(pet)+'</title><style>'
    +'@page{margin:18mm}body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;color:#1d1d1f;margin:0}'
    +'header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #d2d2d7;padding-bottom:14px;margin-bottom:22px}'
    +'.hosp{font-size:12px;color:#6e6e73;letter-spacing:.02em}h1{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:6px 0 0}h1 small{font-size:16px;font-weight:500;color:#6e6e73;margin-left:8px}'
    +'.pet{text-align:right;font-size:13px;color:#6e6e73}.pet b{display:block;font-size:17px;color:#1d1d1f}'
    +'section{margin:0 0 18px}h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#17738A;margin:0 0 4px}p{margin:0}'
    +'.how p{font-size:19px;font-weight:600;letter-spacing:-.01em}.box{margin-top:26px;padding:14px 16px;border-radius:12px;background:#f5f5f7;font-size:13.5px}'
    +'footer{margin-top:28px;font-size:12px;color:#6e6e73;border-top:1px solid #d2d2d7;padding-top:10px;display:flex;justify-content:space-between}</style></head><body>'
    +'<header><div><div class="hosp">'+esc(window.TS_HOSPITAL||'VCA Shoreline Veterinary Referral & Emergency Center')+'</div><h1>'+esc(o.name)+(br?'<small>'+esc(br)+'</small>':'')+'</h1></div>'
    +'<div class="pet"><b>'+esc(pet)+'</b>'+esc([p.species,p.weight?p.weight+' kg':''].filter(Boolean).join(' · '))+'</div></header>'
    +sec('What it’s for',v('hoFor'))+'<div class="how">'+sec('How to give it',v('hoHow'))+'</div>'+sec('Next dose',v('hoNext'))+sec('Notes from your veterinarian',v('hoNotes'))
    +'<div class="box">Give this medicine exactly as directed, and don’t stop early or give extra unless your veterinarian tells you to. Call us right away if your pet vomits, stops eating, has trouble breathing, or seems unwell after a dose.</div>'
    +'<footer><span>'+(doc?'Prescribed by '+esc(doc):'')+'</span><span>'+esc(today)+'</span></footer></body></html>';
  var f=document.getElementById('ocPrint'); if(f) f.remove(); f=document.createElement('iframe'); f.id='ocPrint'; f.setAttribute('aria-hidden','true'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f); var w=f.contentWindow; w.document.open(); w.document.write(page); w.document.close();
  logEvent('comm','Owner handout printed — <b>'+esc(o.name)+'</b>',me.initials);
  setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){ toast('Couldn’t open printing'); } },250); };

/* ---------- copy treatments / copy vitals (bottom of the sheet) ---------- */
function ocLast(o){ var L=(TASKS||[]).filter(function(t){ return t.orderId===o.id&&t.status==='completed'; }).sort(function(a,b){ return (b.completedMin||0)-(a.completedMin||0); })[0]; return L; }
window.tsOcCopyTx=function(){ if(!curDoc) return; var by={}, order=[];
  (ORDERS||[]).forEach(function(o){ if(!o||o.dc||o.draft) return; var k=o.section||'Other'; if(!by[k]){ by[k]=[]; order.push(k); }
    var line; if(o.type==='med'){ var d=medDose(o); line=o.name+' '+d.mg+(o.conc&&d.volume?' ('+d.volume+')':'')+' '+(o.route||'')+' '+(o.freq||''); }
    else if(o.cont&&o.kind) line=o.name+' '+(window.tsInfRateFor?tsInfRateFor(o):o.rate||'');
    else line=o.name+' '+(o.freq||'');
    var l=ocLast(o); if(l) line+=' — last '+(l.value?l.value+(o.unit?' '+o.unit:'')+' at ':'')+fmtTime(l.completedMin);
    if(o.note_req) line+=' (note required)';
    by[k].push('• '+line.replace(/\s+/g,' ').trim()); });
  var txt=(VISIT.patient||'')+' — treatments '+new Date().toLocaleDateString([], {month:'numeric',day:'numeric'})+' '+fmtTime(nowMin())+'\n'+order.map(function(k){ return k+'\n'+by[k].join('\n'); }).join('\n\n');
  try{ navigator.clipboard.writeText(txt).then(function(){ toast('Treatments copied'); },function(){ toast('Couldn’t copy'); }); }catch(e){ toast('Couldn’t copy'); }
  window._ocLastCopy=txt; return txt; };
window.tsOcLegendActs=function(){ var I='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/></svg>';
  return '<button type="button" class="lg-act" id="tsCopyBtn" onclick="tsCopyMenu(this)" aria-haspopup="menu" aria-expanded="false">'+I+'Copy<svg class="lg-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'; };
/* one Copy button (Oct 2026): a small menu — the treatments or the latest vitals, as text */
window.tsCopyMenu=function(btn){ var m=document.getElementById('tsCopyMenu'); if(m){ m.remove(); btn.setAttribute('aria-expanded','false'); return; }
  m=document.createElement('div'); m.id='tsCopyMenu'; m.className='ts-copymenu'; m.setAttribute('role','menu');
  m.innerHTML='<button type="button" role="menuitem" data-c="tx"><b>Treatments</b><small>Active orders, doses and fluids</small></button><button type="button" role="menuitem" data-c="v"><b>Latest vitals</b><small>The newest reading of each</small></button>';
  document.body.appendChild(m); var r=btn.getBoundingClientRect(), h=m.offsetHeight, w=m.offsetWidth;
  m.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'; m.style.top=(r.top-h-8>8?r.top-h-8:r.bottom+8)+'px'; btn.setAttribute('aria-expanded','true');
  var close=function(){ m.remove(); btn.setAttribute('aria-expanded','false'); document.removeEventListener('click',out,true); document.removeEventListener('keydown',key); };
  var out=function(e){ if(!m.contains(e.target)&&e.target!==btn&&!btn.contains(e.target)) close(); }, key=function(e){ if(e.key==='Escape'){ close(); btn.focus(); } };
  setTimeout(function(){ document.addEventListener('click',out,true); document.addEventListener('keydown',key); },0);
  m.onclick=function(e){ var b=e.target.closest('[data-c]'); if(!b) return; close(); if(b.getAttribute('data-c')==='tx') tsOcCopyTx(); else tsVCopy(); };
  var f=m.querySelector('button'); if(f) f.focus(); };
/* ═════════ TS ALERTS — short alerts on the board, about the patient and about the client (Oct 2026) ═════════
   Patient alerts (sheet.patient.alerts, strings): "Caution — may bite", "Anxious", "Diabetic" …  — red when it's about safety.
   Client alerts (sheet.patient.client_alerts, [{text, at, by}]): "Owner waiting for results", "Owner wants a call before procedures" …
   Anyone signed in adds or clears them from the board's Alerts column (or the sheet header); every change is in the sheet's audit.
   Trend / limit alerts from charted vitals (store/ops.js) still lead the list and are not edited here.
   Board hour blocks: hover (or focus) a block to see that hour's tasks — name, time, done / due / late. */
var AL_PAT=['Caution — may bite','Muzzle for handling','Anxious — Fear Free handling','Diabetic','Seizure history','Blind','Deaf','Brachycephalic — heat and sedation risk'];
var AL_CLI=['Owner waiting for results','Owner wants updates — call after rounds','Owner visiting today','Call owner before any procedure','Financial approval needed before more care','Owner prefers text messages'];
var AL_ICON={
  crit:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.2M12 17v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.8v4.6M12 15.6v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  client:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8.2" r="3.6" stroke="currentColor" stroke-width="1.8"/><path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'};
function alSheet(id){ return (SHEETS||[]).find(function(x){ return x._id===id; })||null; }
function alList(s){ var p=(s&&s.patient)||{}; return {pat:(p.alerts||[]).slice(),cli:(p.client_alerts||[]).map(function(x){ return (x&&x.text)?x:{text:String(x)}; })}; }
/* the board cell: auto alerts (vitals) first, then the patient's, then the client's; tap to edit */
window.tsAlertCell=function(p,i){ var A=p.alerts||[];
  return '<div class="sbc c-alerts aa-cell al-cell" role="button" tabindex="0" onclick="event.stopPropagation();tsAlertEdit(\''+esc(p._id||'')+'\',this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();tsAlertEdit(\''+esc(p._id||'')+'\',this);}" title="Alerts — select to add or clear" aria-label="Alerts for '+esc(p.name||'')+': '+esc(A.map(function(a){ return a.x; }).join(', ')||'none')+'. Select to edit">'
    +(A.length?A.slice(0,3).map(function(a){ return '<div class="al-row '+esc(a.t)+'">'+(AL_ICON[a.t]||AL_ICON.warn)+'<span>'+esc(a.x)+'</span></div>'; }).join('')+(A.length>3?'<div class="al-more">+'+(A.length-3)+' more</div>':'')
      :'<span class="al-empty">+ Add alert</span>')+'</div>'; };
/* the editor: current alerts with ×, then quick picks and a line to type one */
window.tsAlertEdit=function(id,anchor){ var s=alSheet(id); if(!s){ toast('Open the patient first'); return; } var old=document.getElementById('tsAlMenu'); if(old) old.remove();
  var p=s.patient||{}, L=alList(s), m=document.createElement('div'); m.id='tsAlMenu'; m.className='ts-menu al-menu show'; m.setAttribute('role','dialog'); m.setAttribute('aria-label','Alerts for '+(p.name||'patient'));
  var cur=L.pat.map(function(t,k){ return '<div class="al-cur '+(/dnr|caution|aggress|bite|muzzle/i.test(t)?'crit':'warn')+'">'+(/dnr|caution|aggress|bite|muzzle/i.test(t)?AL_ICON.crit:AL_ICON.warn)+'<span>'+esc(t)+'</span>'+(t==='DNR'?'':'<button type="button" aria-label="Remove '+esc(t)+'" data-rm="p'+k+'">×</button>')+'</div>'; }).join('')
    +L.cli.map(function(x,k){ return '<div class="al-cur client">'+AL_ICON.client+'<span>'+esc(x.text)+(x.by?'<small>'+esc(x.by)+(x.at?' · '+esc(fmtWhen(x.at)):'')+'</small>':'')+'</span><button type="button" aria-label="Remove '+esc(x.text)+'" data-rm="c'+k+'">×</button></div>'; }).join('');
  var pick=function(arr,kind,have){ return arr.filter(function(t){ return have.indexOf(t)<0; }).map(function(t){ return '<button type="button" class="al-pick '+kind+'" data-add="'+kind+'" data-t="'+esc(t)+'">'+esc(t)+'</button>'; }).join(''); };
  m.innerHTML='<div class="ts-tm-h">Alerts · '+esc(((p.name||'')+' '+(p.last||'')).trim())+'</div>'
    +(cur?'<div class="al-curs">'+cur+'</div>':'<p class="al-none">No alerts yet.</p>')
    +'<div class="al-h">About the patient</div><div class="al-picks">'+pick(AL_PAT,'p',L.pat)+'</div>'
    +'<div class="al-h">About the client</div><div class="al-picks">'+pick(AL_CLI,'c',L.cli.map(function(x){ return x.text; }))+'</div>'
    +'<div class="al-type"><select id="alKind" aria-label="Alert is about"><option value="c">Client</option><option value="p">Patient</option></select><input id="alText" placeholder="Type an alert…" maxlength="60"><button type="button" id="alAdd">Add</button></div>';
  var re=function(){ m.remove(); try{ if(currentCTab==='dash') renderDash(); }catch(e){} var a=document.querySelector('.al-cell[onclick*="'+id+'"]'); tsAlertEdit(id,a||anchor); };
  m.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=function(ev){ ev.stopPropagation(); var k=b.dataset.rm; alSave(id,k[0]==='p'?'p':'c','rm',+k.slice(1)); re(); }; });
  m.querySelectorAll('[data-add]').forEach(function(b){ b.onclick=function(ev){ ev.stopPropagation(); alSave(id,b.dataset.add,'add',b.dataset.t); re(); }; });
  var addTyped=function(){ var t=(m.querySelector('#alText').value||'').trim(); if(!t) return; alSave(id,m.querySelector('#alKind').value,'add',t); re(); };
  m.querySelector('#alAdd').onclick=function(ev){ ev.stopPropagation(); addTyped(); }; m.querySelector('#alText').onkeydown=function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); addTyped(); } if(ev.key==='Escape') m.remove(); };
  m.addEventListener('mousedown',function(ev){ ev.stopPropagation(); }); m.addEventListener('click',function(ev){ ev.stopPropagation(); });
  document.body.appendChild(m); var r=(anchor||document.body).getBoundingClientRect(), w=360, hgt=m.offsetHeight;
  m.style.left=Math.max(12,Math.min(window.innerWidth-w-12,r.left-20))+'px'; m.style.top=Math.max(12,Math.min(window.innerHeight-hgt-12,r.bottom+6))+'px';
  setTimeout(function(){ document.addEventListener('mousedown',function h(ev){ if(!m.contains(ev.target)){ m.remove(); document.removeEventListener('mousedown',h); } }); },0);
  setTimeout(function(){ var f=m.querySelector('#alText'); if(f) f.focus({preventScroll:true}); },40); };
function alSave(id,kind,op,v){ var s=alSheet(id); if(!s) return; var p=s.patient||(s.patient={}), me=user(), now=new Date().toISOString(), field, list, desc;
  if(kind==='p'){ list=(p.alerts||[]).slice(); if(op==='add'){ if(list.indexOf(v)>-1) return; list.push(v); desc='Alert added — <b>'+esc(v)+'</b>'; } else { desc='Alert cleared — <b>'+esc(list[v])+'</b>'; list.splice(v,1); } p.alerts=list; field='patient.alerts'; }
  else { list=(p.client_alerts||[]).slice(); if(op==='add'){ if(list.some(function(x){ return x&&x.text===v; })) return; list.push({text:v,at:now,by:me.initials||null}); desc='Client alert added — <b>'+esc(v)+'</b>'; } else { desc='Client alert cleared — <b>'+esc((list[v]||{}).text||'')+'</b>'; list.splice(v,1); } p.client_alerts=list; field='patient.client_alerts'; }
  if(id===CUR&&curDoc){ curDoc.patient=curDoc.patient||{}; curDoc.patient.alerts=p.alerts; curDoc.patient.client_alerts=p.client_alerts; if(kind==='p') VISIT.alerts=p.alerts||[]; }
  var u={updated_at:now,updated_by:me.initials,audit:FV.arrayUnion({at:now,type:'comm',desc:desc,who:me.initials,uid:me.uid})}; u[field]=list;
  DB.collection(COL).doc(id).update(u).catch(function(e){ console.warn(e); toast('Couldn’t save the alert'); });
  try{ refreshHeader(); }catch(e){} }
window.tsAlertSave=alSave;   /* tests */

/* ---------- the hour block popover: that hour's tasks ---------- */
var AL_WORD={overdue:'late',due:'due',scheduled:'',completed:'done',skipped:'not done'};
window.tsBlkHTML=function(b,p){ var it=b.items||[], txt=it.map(function(x){ return x.n+' '+fmtTime(x.m)+(AL_WORD[x.s]?' '+AL_WORD[x.s]:''); }).join(', ');
  return '<div class="sb-blk '+b.status+'" tabindex="0" data-hl="'+esc(hlabelSafe(b.h))+'" aria-label="'+esc(hlabelSafe(b.h)+' — '+txt)+'"><span class="sb-bn">'+b.label+'</span>'+(b.done&&b.status!=='completed'&&b.tot?'<span class="sb-pb" aria-hidden="true"><i style="width:'+Math.round(b.done/b.tot*100)+'%"></i></span>':'')
    +'<span class="sb-pop-src" hidden>'+it.map(function(x){ return '<div class="sp-row '+x.s+'"><i></i><span class="sp-n">'+esc(x.n)+'</span><span class="sp-t">'+esc(fmtTime(x.m))+(AL_WORD[x.s]?' · '+AL_WORD[x.s]:'')+'</span></div>'; }).join('')+'</span></div>'; };
function hlabelSafe(h){ try{ return fmtTime(h*60); }catch(e){ return h+':00'; } }
(function(){ var pop=null, cur=null;
  function hide(){ if(pop) pop.hidden=true; cur=null; }
  function show(b){ var src=b.querySelector('.sb-pop-src'); if(!src||!src.innerHTML.trim()){ hide(); return; } if(!pop){ pop=document.createElement('div'); pop.className='sb-pop'; pop.setAttribute('role','tooltip'); document.body.appendChild(pop); }
    if(cur===b&&!pop.hidden) return; cur=b; var row=b.closest('.sb-row'), nm=row&&row.querySelector('.pt-nm'), h=b.closest('.sb-hcell');
    pop.innerHTML='<div class="sp-h">'+(nm?esc(nm.textContent)+' · ':'')+esc(b.getAttribute('data-hl')||'')+'</div>'+src.innerHTML; pop.hidden=false;
    var r=b.getBoundingClientRect(), w=pop.offsetWidth, hh=pop.offsetHeight, left=r.left-w-10; if(left<8) left=r.right+10; pop.style.left=Math.min(window.innerWidth-w-8,left)+'px'; pop.style.top=Math.max(8,Math.min(window.innerHeight-hh-8,r.top+r.height/2-hh/2))+'px'; }
  document.addEventListener('mouseover',function(e){ var b=e.target.closest&&e.target.closest('#ctab-dash .sb-blk'); if(b) show(b); else if(cur) hide(); },{passive:true});
  document.addEventListener('focusin',function(e){ var b=e.target.closest&&e.target.closest('#ctab-dash .sb-blk'); if(b) show(b); else if(cur) hide(); });
  document.addEventListener('scroll',hide,true);
})();
/* ═════════ TS BOARD VIEW — the Status Board as a calm, sortable list (Oct 2026, mockup "version 3") ═════════
   · Care Team: one column, doctor over technician, names not initials, each person with their own colour dot. The tech line still
     opens the tech picker (ops.js tsPickTech); hover either line for the full name and role.
   · Alerts: safety alerts in colour, client alerts as small chips under them (alerts.js cell, re-shaped here); "+ Add alert" on hover.
   · Group title "Inpatients 2" with pills — CPR · DNR · CAUTION · OWNER WAITING — tap one to show only those patients.
   · Sorting: click a column name; again to reverse. Remembered per person, per browser (localStorage tsSbSort_v1 — a convenience).
   · Keyboard on the board: ↑ ↓ move, space Quick Look, return opens the sheet, esc closes. Click a row to peek, double-click to open.
     Space is also hold-to-talk (voice.js): on the board a quick tap peeks and holding it still listens.
   · Quick Look: up next today, latest temperature · heart rate · respiratory rate (coloured outside FLAG_RULES), alerts, owner and
     belongings — and Open Sheet.
   Nothing here is saved to the sheet; it only reads what the board already has. */
var BV_SORT_KEY='tsSbSort_v1', BV_PILL='', BV_SEL=null, BV_QL=false, BV_TALLY={}, BV_ROWS=[];
var BV_COLORS=['#38BDD2','#4CC38A','#B28BEF','#F2A93B','#FF8A7A','#5B9DF5','#E879B9','#9BC53D'];
function bvColor(n){ n=String(n||'').toLowerCase(); var h=0; for(var i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))>>>0; return BV_COLORS[h%BV_COLORS.length]; }
function bvDr(n){ n=String(n||'').trim().replace(/^dr\.?\s+/i,''); if(!n) return ''; var w=n.split(/\s+/); return 'Dr. '+w[w.length-1]; }
function bvShort(n){ n=String(n||'').trim(); if(!n) return ''; var w=n.split(/\s+/); return w.length>1?w[0]+' '+w[w.length-1][0]+'.':w[0]; }
var BV_CAUTION=/caution|aggress|bite|fractious|muzzle|scratch/i, BV_WAIT=/wait/i;
function bvHasCaution(r){ return (r.alerts||[]).some(function(a){ return a.t!=='client'&&BV_CAUTION.test(a.x||''); }); }
function bvHasWait(r){ return (r.alerts||[]).some(function(a){ return a.t==='client'&&BV_WAIT.test(a.x||''); }); }
var BV_PILLS=[['cpr','CPR','var(--green)',function(r){ return r.ls&&r.ls!=='DNR'; }],['dnr','DNR','var(--purple,#B28BEF)',function(r){ return r.ls==='DNR'; }],
  ['caution','CAUTION','var(--coral)',bvHasCaution],['wait','OWNER WAITING','#5fd3e6',bvHasWait]];

/* ---- sorting ---- */
function bvSort(){ try{ var a=JSON.parse(localStorage.getItem(BV_SORT_KEY)||'{}'), v=a[user().uid||'_']; if(v&&v.k) return v; }catch(e){} return {k:'nm',d:1}; }
function bvSortSave(v){ try{ var a=JSON.parse(localStorage.getItem(BV_SORT_KEY)||'{}'); a[user().uid||'_']=v; localStorage.setItem(BV_SORT_KEY,JSON.stringify(a)); }catch(e){} }
window.tsSbSortState=function(){ return bvSort(); };
window.tsSbSort=function(k){ var S=bvSort(); bvSortSave(S.k===k?{k:k,d:-S.d}:{k:k,d:1}); try{ renderDash(); }catch(e){} };
function bvKey(r,k){ if(k==='ward') return String(r.ward||'').toLowerCase();
  if(k==='stay') return r.at?new Date(r.at).getTime():Infinity;   /* earliest admission = longest stay first */
  if(k==='team') return String(r.drName||'~').toLowerCase()+'|'+String(r.techName||'~').toLowerCase();
  if(k==='al') return -((r.alerts||[]).filter(function(a){ return a.t==='crit'; }).length*10+(r.alerts||[]).length);
  return String(r.name||'').toLowerCase(); }
/* the counts are taken on the whole board, the pill filter runs before the search (98) and work filter (99), sorting last */
on('board.rows',function(list){ BV_TALLY={}; BV_PILLS.forEach(function(p){ BV_TALLY[p[0]]=list.filter(p[3]).length; });
  if(BV_PILL&&!BV_TALLY[BV_PILL]) BV_PILL=''; },96);
on('board.rows',function(list){ if(!BV_PILL) return; var f=BV_PILLS.find(function(p){ return p[0]===BV_PILL; }); if(!f) return;
  for(var i=list.length-1;i>=0;i--){ if(!f[3](list[i])) list.splice(i,1); } },97);
on('board.rows',function(list){ var S=bvSort(); list.sort(function(a,b){ var A=bvKey(a,S.k), B=bvKey(b,S.k); return (A<B?-1:A>B?1:0)*S.d||String(a.name).localeCompare(String(b.name)); });
  BV_ROWS=list; if(BV_SEL&&!list.some(function(r){ return r._id===BV_SEL; })){ BV_SEL=null; BV_QL=false; } },100);
window.tsBoardPills=function(){ var h=BV_PILLS.map(function(p){ var n=BV_TALLY[p[0]]||0; if(!n) return '';
    return '<button type="button" class="sb-pill'+(BV_PILL===p[0]?' on':'')+'" aria-pressed="'+(BV_PILL===p[0])+'" onclick="tsBoardPill(\''+p[0]+'\')"><i style="background:'+p[2]+'"></i>'+n+' '+p[1]+'</button>'; }).join('');
  return h?'<div class="sb-pills">'+h+'</div>':''; };
window.tsBoardPill=function(k){ BV_PILL=BV_PILL===k?'':k; try{ renderDash(); }catch(e){} };

/* ---- cells ---- */
window.tsTeamCell=function(r){ var dr=bvDr(r.drName), t=r.techName;
  return '<div class="sbc c-team">'+(dr?'<div class="tm-p" title="Doctor · Dr. '+esc(String(r.drName).replace(/^dr\.?\s+/i,''))+'"><i style="background:'+bvColor(r.drName)+'"></i>'+esc(dr)+'</div>':'<div class="tm-p none">No doctor</div>')
    +'<button type="button" class="tm-p tm-tech'+(t?'':' none')+'" title="'+(t?'Technician · '+esc(t)+' — tap to change':'Assign a tech')+'" onclick="event.stopPropagation();tsPickTech(\''+esc(r._id||'')+'\',this)">'
    +(t?'<i style="background:'+bvColor(t)+'"></i>'+esc(bvShort(t)):'+ Assign tech')+'</button></div>'; };
/* alerts.js draws the cell; client alerts become chips under the safety ones */
(function(){ var base=window.tsAlertCell; if(!base) return;
  window.tsAlertCell=function(p,i){ var html=base(p,i), cl=(p.alerts||[]).filter(function(a){ return a.t==='client'; });
    if(!cl.length) return html;
    var tmp=document.createElement('div'); tmp.innerHTML=html; var cell=tmp.firstChild; if(!cell) return html;
    [].slice.call(cell.querySelectorAll('.al-row.client')).forEach(function(r){ var c=document.createElement('span'); c.className='al-chip'; c.innerHTML=r.innerHTML; r.parentNode.replaceChild(c,r); });
    var chips=[].slice.call(cell.querySelectorAll('.al-chip')); if(chips.length){ var w=document.createElement('div'); w.className='al-chips'; chips.forEach(function(c){ w.appendChild(c); }); var more=cell.querySelector('.al-more'); cell.insertBefore(w,more||null); }
    return cell.outerHTML; }; })();

/* ---- selection, Quick Look, keyboard ---- */
window.tsBoardSel=function(r){ return BV_SEL?r._id===BV_SEL:!!r.cur; };
window.tsBoardClick=function(i,ev){ if(ev&&ev.detail>1) return; var r=BV_ROWS[i]; if(!r) return;
  if(BV_SEL===r._id&&BV_QL){ BV_QL=false; } else { BV_SEL=r._id; BV_QL=true; } bvMark(); bvQL(); };
function bvMark(){ var sel=BV_SEL||((BV_ROWS.find(function(r){ return r.cur; })||{})._id);
  document.querySelectorAll('#ctab-dash .sb-row[data-id]').forEach(function(el){ var on=el.getAttribute('data-id')===sel; el.classList.toggle('sel',on); el.classList.toggle('ql-open',on&&BV_QL);
    if(on&&!el.classList.contains('sb-head')){ try{ var sc=el.closest('.sb-scroll'), rr=el.getBoundingClientRect(), sr=sc.getBoundingClientRect(); if(rr.bottom>sr.bottom||rr.top<sr.top+40) el.scrollIntoView({block:'nearest'}); }catch(e){} } }); }
function bvTasks(d){ var n=nowMin(), dk=dayKey(), marks=d.marks||{}, out=[]; var adm=d.admitted_at||d.created_at, from=(adm&&dayKey(new Date(adm))===dk)?isoToMin(adm):-1;
  Object.keys(d.orders||{}).forEach(function(id){ var o=d.orders[id]; if(!o||o.dc||o.cont||o.draft) return;
    freqTimes(o).forEach(function(h){ var t=slotMin(o,dk,h*60), m=marks[dk+'_'+id+'_'+(h*60)]; if(m&&m.status) return; if(h*60<from&&!o.ordered_at) return;
      out.push({t:t,late:t<n-18,soon:t>=n-18&&t<=n+15,name:String(o.name||'')+(o.dose?' '+o.dose+(o.unit?' '+String(o.unit).replace(/\/kg$/,'/kg'):''):'')+(o.route?' '+o.route:'')}); }); });
  return out.sort(function(a,b){ return a.t-b.t; }); }
function bvLate(m){ m=Math.round(m); return m<60?m+' min late':Math.floor(m/60)+' h '+(m%60?m%60+' m ':'')+'late'; }
function bvClock(t){ var h=Math.floor(t/60)%24, m=Math.round(t%60); return (h%12||12)+':'+('0'+m).slice(-2)+(h<12?'a':'p'); }
function bvVitals(d){ var sp=sexSp((d.patient||{}).species);
  return [['Temp','temp'],['HR','hr'],['RR','rr']].map(function(x){ var rule=FLAG_RULES.find(function(r){ return r.id===x[1]; }); var R=rule?readings(d,rule.match):[], l=R[R.length-1];
    if(!l) return {k:x[0],v:'—',ag:'not charted',sev:0}; var v=numOf(l.v);
    return {k:x[0],v:esc(l.v)+(rule.unit&&!/[a-z°%]/i.test(l.v)&&rule.id==='temp'?' °F':''),ag:l.at?ago(l.at):'',sev:v==null?0:sevOf(rule,v,sp)}; }); }
function bvQL(){ var el=document.getElementById('tsQL'); if(!el){ el=document.createElement('aside'); el.id='tsQL'; el.className='ts-ql'; el.setAttribute('aria-label','Quick Look'); document.body.appendChild(el);
    el.addEventListener('click',function(e){ if(e.target.closest('[data-qx]')){ BV_QL=false; bvMark(); bvQL(); } else if(e.target.closest('[data-qopen]')){ bvOpen(); } }); }
  var r=BV_ROWS.find(function(x){ return x._id===BV_SEL; }), s=r&&SHEETS.find(function(x){ return x._id===r._id; }), d=s&&(s._id===CUR&&curDoc?curDoc:s);
  if(!BV_QL||!r||!d||currentCTab!=='dash'){ el.classList.remove('show'); el.setAttribute('aria-hidden','true'); return; }
  var p=d.patient||{}, T=bvTasks(d), lateAll=T.filter(function(t){ return t.late; }), late=lateAll.slice(-3), up=T.filter(function(t){ return !t.late; }).slice(0,4), V=bvVitals(d);   /* the 3 most recent overdue + the next 4 */
  var task=function(t){ return '<div class="ql-task'+(t.late?' late':t.soon?' soon':'')+'"><span class="tm">'+bvClock(t.t)+'</span><span class="tn">'+esc(t.name)+'</span><span class="st">'+(t.late?bvLate(nowMin()-t.t):t.soon&&t.t>nowMin()?'in '+Math.round(t.t-nowMin())+' min':'')+'</span></div>'; };
  var al=(r.alerts||[]).filter(function(a){ return a.t!=='client'; }), cl=(r.alerts||[]).filter(function(a){ return a.t==='client'; });
  el.innerHTML='<div class="ql-h"><button type="button" class="ql-x" data-qx aria-label="Close Quick Look">×</button><h4>'+esc(r.name)+'</h4>'
    +'<div class="ql-meta">'+esc(r.sig)+'<br>'+esc([r.ward,r.stay&&r.stay.day,r.stay&&r.stay.hours!=null?r.stay.hours+' h in hospital':'',r.drName?bvDr(r.drName):'',r.techName].filter(Boolean).join(' · '))+'</div>'
    +'<div class="ql-code">'+(lsPill(r.ls)||'<span class="sb-nocode">No code set</span>')+'</div></div>'
    +'<div class="ql-b"><div class="ql-sec">Up next'+(lateAll.length?' · <span class="ql-late">'+lateAll.length+' overdue</span>':'')+'</div>'+(lateAll.length>late.length?'<div class="ql-more">+ '+(lateAll.length-late.length)+' earlier overdue — open the sheet to see them</div>':'')+((late.concat(up)).map(task).join('')||'<div class="ql-none">Nothing left today.</div>')
    +'<div class="ql-sec">Latest vitals</div><div class="ql-vit">'+V.map(function(v){ return '<div class="ql-vt'+(v.sev===2?' crit':v.sev?' hi':'')+'"><div class="k">'+v.k+'</div><div class="v">'+v.v+'</div><div class="ag">'+esc(v.ag)+'</div></div>'; }).join('')+'</div>'
    +(al.length||cl.length?'<div class="ql-sec">Alerts</div>'+al.map(function(a){ return '<div class="ql-al '+esc(a.t)+'">'+esc(a.x)+'</div>'; }).join('')+(cl.length?'<div class="al-chips">'+cl.map(function(a){ return '<span class="al-chip">'+esc(a.x)+'</span>'; }).join('')+'</div>':''):'')
    +((p.owner||p.phone||p.belongings)?'<div class="ql-sec">Owner</div><div class="ql-own">'+esc([p.owner,p.phone].filter(Boolean).join(' · '))+(p.belongings?'<div class="ql-bel">Belongings: '+esc(p.belongings)+'</div>':'')+'</div>':'')
    +'</div><div class="ql-f"><button type="button" class="ql-btn" data-qx>Close</button><button type="button" class="ql-btn pri" data-qopen>Open Sheet</button></div>';
  el.setAttribute('aria-hidden','false'); requestAnimationFrame(function(){ el.classList.add('show'); }); }
function bvOpen(){ var i=BV_ROWS.findIndex(function(r){ return r._id===BV_SEL; }); BV_QL=false; bvQL(); if(i>-1) openPatient(i); }
function bvBoardKeys(){ return typeof currentCTab!=='undefined'&&currentCTab==='dash'&&BV_ROWS.length; }
function bvKeyOk(t){ if(!bvBoardKeys()) return false; if(t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"],.ts-menu,.op-sheet,#tsModal')) return false;
  return !document.querySelector('.ts-menu.show,#tsAlMenu,#tsTechMenu'); }
function bvSpace(){ var i=BV_ROWS.findIndex(function(r){ return r._id===(BV_SEL||((BV_ROWS.find(function(x){ return x.cur; })||{})._id)); }); if(i<0) i=0;
  BV_SEL=BV_ROWS[i]._id; BV_QL=!BV_QL; bvMark(); bvQL(); }
/* voice.js holds space for talking; on the board it asks first, and a quick tap comes back here */
window.tsBoardSpaceTap=function(m){ var a=document.activeElement; if(m==='can') return bvKeyOk(a)&&!(a&&a.closest&&a.closest('button,a,[role="button"]')); if(m==='tap') bvSpace(); };
/* toolbar keys on the board: 1–4 switch board (⌘1–⌘4 belong to the browser's tabs), H flips List ↔ Hours */
document.addEventListener('keydown',function(e){ if(typeof currentCTab==='undefined'||currentCTab!=='dash'||e.metaKey||e.ctrlKey||e.altKey||e.isComposing||e.repeat) return;
  var t=e.target&&e.target.closest?e.target:null; if(t&&t.closest('input,textarea,select,[contenteditable="true"],.ts-menu,.op-sheet,#tsModal')) return;
  if(document.querySelector('.ts-menu.show,#tsAlMenu,#tsTechMenu')) return;
  var B=['My Board','OP Board','IP Board','Boarding'];
  if(/^[1-4]$/.test(e.key)){ e.preventDefault(); if(sbBoard!==B[+e.key-1]) setSbBoard(B[+e.key-1]); }
  else if(e.key==='h'||e.key==='H'){ e.preventDefault(); toggleSbTx(); } });
document.addEventListener('keydown',function(e){ if(!bvBoardKeys()||e.metaKey||e.ctrlKey||e.altKey||e.isComposing) return;
  var t=e.target&&e.target.closest?e.target:null; if(t&&t.closest('input,textarea,select,[contenteditable="true"],.ts-menu,.op-sheet,#tsModal')) return;
  if(document.querySelector('.ts-menu.show,#tsAlMenu,#tsTechMenu')) return;
  if((e.key===' '||e.key==='Enter')&&t&&t.closest('button,a,[role="button"]')) return;   /* a focused button keeps its own space / return */
  var i=BV_ROWS.findIndex(function(r){ return r._id===(BV_SEL||((BV_ROWS.find(function(x){ return x.cur; })||{})._id)); });
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); i=i<0?0:Math.max(0,Math.min(BV_ROWS.length-1,i+(e.key==='ArrowDown'?1:-1))); BV_SEL=BV_ROWS[i]._id; bvMark(); if(BV_QL) bvQL(); }
  else if(e.key===' '){ e.preventDefault(); bvSpace(); }
  else if(e.key==='Enter'){ if(i>-1){ e.preventDefault(); BV_SEL=BV_ROWS[i]._id; bvOpen(); } }
  else if(e.key==='Escape'){ if(BV_QL){ e.preventDefault(); BV_QL=false; bvMark(); bvQL(); } else if(BV_PILL){ BV_PILL=''; try{ renderDash(); }catch(err){} } } });
on('tab',function(){ if(BV_QL){ BV_QL=false; } bvQL(); });
on('rendered',function(){ if(BV_QL) bvQL(); });
/* ═══ GRID TILES (Oct 2026, option A refined) — the pointer's place on the grid, and charting a whole hour from its header ═══
   · Hover any hour square: its order row and its hour column light faintly (the row through the sticky label with an inset shadow,
     never a see-through background; the column with a faint tint on each of its squares).
   · Hover an hour in the header: every open task in that hour lights, and a pill says "Chart 7 at 8 AM" (clicking the hour already
     opens Chart all — store/tasks.js tsBatch). Future hours and hours with nothing open show no pill.
   Classes are re-applied on the next pointer move after a redraw (tsMorphHTML resets them), so nothing here wraps the grid. */
(function(){
  var GX={row:null,col:-1,lit:-1,pill:null};
  function inner(){ return document.getElementById('sheetInner'); }
  function colOf(cell){ var p=cell&&cell.parentElement; if(!p) return -1; var i=0; for(var n=p.firstElementChild;n;n=n.nextElementSibling){ if(n===cell) return i; if(n.classList.contains('cell')||n.classList.contains('hcell')) i++; } return -1; }
  /* the column: a class on each square of that hour (never an extra child of #sheetInner — tsMorphHTML rebuilds everything when the child count changes) */
  function cols(col){ var el=inner(); if(!el) return []; return [].slice.call(el.querySelectorAll('.grow[data-o] > .hcells > :nth-child('+(col+1)+'), .ghead .hcells > .hcell:nth-child('+(col+1)+')')); }
  function clearX(){ if(GX.row) GX.row.classList.remove('xr'); GX.row=null; var el=inner(); if(el) el.querySelectorAll('.xc').forEach(function(c){ c.classList.remove('xc'); }); GX.col=-1; }
  function setX(row,col){ if(GX.row!==row){ if(GX.row) GX.row.classList.remove('xr'); GX.row=row; } if(row&&!row.classList.contains('xr')) row.classList.add('xr');
    if(GX.col!==col){ var el=inner(); if(el) el.querySelectorAll('.xc').forEach(function(c){ c.classList.remove('xc'); }); GX.col=col; }
    cols(col).forEach(function(c){ if(!c.classList.contains('xc')) c.classList.add('xc'); }); }
  function openAt(h){ var nh=Math.floor(nowMin()/60); if(h>nh+1||typeof TASKS==='undefined'||!TASKS) return 0;
    return TASKS.filter(function(t){ return !t.status&&Math.floor(t.sched/60)===h&&t.order&&!t.order.dc&&!t.order.cont; }).length; }
  function unlit(){ var el=inner(); if(el) el.querySelectorAll('.mark.lit').forEach(function(m){ m.classList.remove('lit'); }); GX.lit=-1; if(GX.pill) GX.pill.classList.remove('on'); }
  function applyLit(h){ var el=inner(); if(!el) return; el.querySelectorAll('.grow[data-o] > .hcells').forEach(function(r){ var c=r.children[h]; var m=c&&c.querySelector(':scope > .mark.overdue, :scope > .mark.due'); if(m&&!m.classList.contains('lit')) m.classList.add('lit'); }); }
  function lightHour(hc,h){ if(GX.lit===h&&GX.pill&&GX.pill.classList.contains('on')){ applyLit(h); return; } unlit(); var n=openAt(h); if(!n||document.body.classList.contains('ts-past-day')) return; GX.lit=h;
    applyLit(h);
    if(!GX.pill){ GX.pill=document.createElement('div'); GX.pill.className='gx-pill'; GX.pill.setAttribute('aria-hidden','true'); document.body.appendChild(GX.pill); }
    GX.pill.textContent='Chart '+n+' at '+hourText(h); var r=hc.getBoundingClientRect(); GX.pill.style.left=(r.left+r.width/2)+'px'; GX.pill.style.top=(r.bottom-6)+'px'; GX.pill.classList.add('on');
    hc.setAttribute('title','Chart '+n+' at '+hourText(h)); }
  document.addEventListener('mouseover',function(e){
    var t=e.target; if(!t||!t.closest) return; var el=inner(); if(!el||!el.contains(t)){ if(GX.row||GX.col>-1) clearX(); if(GX.lit>-1) unlit(); return; }
    var hc=t.closest('.ghead .hcell'); if(hc){ var h=colOf(hc); clearX(); if(h>-1) lightHour(hc,h); return; }
    if(GX.lit>-1) unlit();
    var cell=t.closest('.grow[data-o] > .hcells > .cell'); if(!cell){ if(!t.closest('.grow[data-o]')) clearX(); else { var rw=t.closest('.grow[data-o]'); if(GX.row!==rw){ clearX(); GX.row=rw; rw.classList.add('xr'); } } return; }
    setX(cell.closest('.grow'),colOf(cell)); },{passive:true});
  /* after a redraw the pointer may not move to a new element: re-apply on the next move over the same cell */
  var gxRaf=0; document.addEventListener('mousemove',function(e){ if(gxRaf) return; gxRaf=requestAnimationFrame(function(){ gxRaf=0; if(GX.lit>-1) applyLit(GX.lit); if(!GX.row) return; if(!GX.row.isConnected){ clearX(); return; }
    if(!GX.row.classList.contains('xr')) GX.row.classList.add('xr'); if(GX.col>-1){ var c=GX.row.querySelector('.hcells > :nth-child('+(GX.col+1)+')'); if(c&&!c.classList.contains('xc')) setX(GX.row,GX.col); } }); },{passive:true});
  /* a redraw resets classes: while something is lit, a light keeper puts them back (stops as soon as nothing is) */
  setInterval(function(){ if(GX.lit>-1) applyLit(GX.lit); if(GX.row){ if(!GX.row.isConnected){ clearX(); return; } if(!GX.row.classList.contains('xr')) GX.row.classList.add('xr'); if(GX.col>-1) cols(GX.col).forEach(function(c){ if(!c.classList.contains('xc')) c.classList.add('xc'); }); } },250);
  document.addEventListener('scroll',function(){ if(GX.lit>-1) unlit(); },true);
  window.addEventListener('blur',function(){ clearX(); unlit(); });
})();
/* ═════════ TS VITALS — the Vitals tab, from the sheet's real readings ═════════
   One row per monitoring order on the sheet (Basic observation first, then the rest of Monitoring and Diagnostics), its last three
   readings with time and who, colour only when a reading is outside the hospital limits (FLAG_RULES), and a Record box that charts
   into the sheet exactly like the grid: it completes the open slot nearest now (±60 min) or adds an extra reading. A weight opens
   the dose review (hook task.charted). Infusions show their pump rate and today's volume. Earlier days: view only.
   (Replaces the prototype’s Vitals board.) Oct 2026: every vital on its own line, one shared clock, Needs attention (vattn.js), Take vitals (vtake.js). */
var V_OPTS={'mucous membrane':['Pink','Pale Pink','Pale','White','Injected','Cyanotic'],'crt':['<2','2','>2'],'mentation':['BAR','QAR','Dull','Obtunded','Stupor'],
  'pain score':['0','1','2','3','4'],'food':['Ate','Some','Off','NPO'],'water':['Drank','Some','None'],'vomiting':['No','Yes'],'urination':['Nml','None','Abnormal'],'defecation':['Nml','None','Diarrhea']};
var vFilterQ='';
function vPast(){ return !!(window.tsViewDk&&tsViewDk()!==dayKey()); }
function vOrders(){ return (ORDERS||[]).filter(function(o){ return o&&!o.dc&&!o.cont&&(o.type==='obs'||o.type==='diag'); }); }
/* every charted value for an order: what is saved (curDoc.marks) plus anything charted this second and not yet saved (TASKS) */
function vReadings(o){ var out={}, d=curDoc||{}, marks=d.marks||{};
  var add=function(k,m,dk){ if(!m||m.status!=='completed'||m.value==null||String(m.value).trim()==='') return; var mn=m.min!=null?m.min:(m.sched||0);
    out[k]={v:String(m.value),at:dkDate(dk).getTime()+mn*60000,s:m.sched||0,by:m.by||'',notes:m.notes||'',k:k,sv:m.sv||(m.at?Date.parse(m.at)||0:0)}; };
  Object.keys(marks).forEach(function(k){ var m=marks[k]; if(m&&m.orderId===o.id&&/^\d{8}_/.test(k)) add(k,m,k.slice(0,8)); });
  (TASKS||[]).forEach(function(t){ if(t.orderId!==o.id||t.status!=='completed') return; var dk=(t.key&&/^\d{8}_/.test(t.key))?t.key.slice(0,8):viewDk(); add(t.key||t.id,{status:t.status,value:t.value,min:t.completedMin,sched:t.sched,by:t.by,notes:t.notes,at:t.at,sv:t.at?0:((typeof VX!=='undefined'&&(VX.fresh[t.key]||VX.fresh[t.id]))||0)},dk); });
  return Object.keys(out).map(function(k){ return out[k]; }).sort(function(a,b){ return (a.at-b.at)||(a.sv-b.sv)||(a.s-b.s); }); }   /* same minute: the one saved later is the newer reading, then the later slot */
function vWhen(ms){ var d=new Date(ms), t=new Date(), y=new Date(t.getFullYear(),t.getMonth(),t.getDate()-1);
  var hm=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}).replace(':00','').replace(' ','').replace('AM','A').replace('PM','P');
  return d.toDateString()===t.toDateString()?hm:d.toDateString()===y.toDateString()?'Yday '+hm:(d.getMonth()+1)+'/'+d.getDate()+' '+hm; }
function vTone(o,v){ var r=ruleFor(o.name); if(!r) return ''; var n=numOf(v), s=n!=null?sevOf(r,n,sexSp(VISIT.species)):0; return s>=2?'coral':s===1?'amber':''; }
/* ---------- every vital on its own line, all on one clock (Oct 2026) ----------
   Each row: the name and when it's due · its own trend · the latest reading · Value, Note, Record. All rows share one time axis,
   so 12 h · 24 h · 48 h · Stay changes every trend together — a zoom anchored on Now (points glide, the y-scale never moves).
   Numbers: a grey line over the hospital's normal range (FLAG_RULES, soft band); dots amber outside normal, coral when critical.
   Words (CRT, membranes, mentation…): a strip of marks, amber when abnormal. A dashed cyan ring at Now = this one is due.
   Drag along any line: a hairline runs through all of them and each latest cell shows what it was then, with who charted it and
   the medications / fluid changes around that moment. Meds & fluids is the last line, on the same clock. */
var V_ABN=/^(pale|white|cyanotic|injected|icteric|grey|gray|>2|>\s*2\s*s(ec)?|dull|obtunded|stupor|comatose|abnormal|diarrhea|none)$/i;
var VW_KEY='tsVWin_v1', VX={span:null,ax:null,raf:0,anim:true,geo:null}, VR=[], VE=[];
function vWin(){ try{ var w=localStorage.getItem(VW_KEY); return w==null||isNaN(+w)?24:+w; }catch(e){ return 24; } }
function vAdmit(){ var a=curDoc&&(curDoc.admitted_at||curDoc.created_at), t=a?new Date(a).getTime():NaN; return isNaN(t)?null:t; }
function vSpanOf(w){ if(w) return w*3600e3; var a=vAdmit(); return Math.max(6*3600e3,a?Date.now()-a:24*3600e3); }
function vStepH(sp){ var h=sp/3600e3; return h>36?12:h>25?6:h>13?4:2; }
function vDom(){ var sp=VX.span||vSpanOf(vWin()), now=Date.now(); return [now-sp,now+sp*.05]; }
function vIsNum(o,R){ if(/^crt$/i.test(String(o.name||'').trim())) return false; var opts=V_OPTS[String(o.name).toLowerCase()];
  return R.length>0&&R.every(function(r){ return opts?/^\s*-?\d+(\.\d+)?(\s*\/\s*\d+)?\s*$/.test(r.v):numOf(r.v)!=null; }); }
function vSev(o,v,num){ if(num){ var r=ruleFor(o.name); return r?sevOf(r,numOf(v),sexSp(VISIT.species)):0; } return V_ABN.test(String(v).trim())?1:0; }
function vClock(ms){ var d=new Date(ms), t=new Date(), h=d.getHours(), s=(h%12||12)+(d.getMinutes()?':'+String(d.getMinutes()).padStart(2,'0'):'')+(h<12?' AM':' PM');
  return d.toDateString()===t.toDateString()?s:d.toLocaleDateString([], {weekday:'short'})+' '+s; }
/* what was given and what the pumps did, for the Meds & fluids line and the scrub tooltip */
function vEvents(){ var out=[], d=curDoc||{}, O=d.orders||{}, marks=d.marks||{}, seen={};
  var med=function(o,k,m,dk){ if(!o||o.type!=='med'||!m||m.status!=='completed') return; if(seen[k]) return; seen[k]=1; var mn=m.min!=null?m.min:(m.sched||0);
    out.push({t:dkDate(dk).getTime()+mn*60000,k:'med',x:o.name+(m.given?' '+m.given:'')+(o.route?' '+o.route:''),by:m.by||''}); };
  (TASKS||[]).forEach(function(t){ if(t.status==='completed'&&t.order&&t.order.type==='med') med(t.order,t.key||t.id,{status:'completed',min:t.completedMin,sched:t.sched,given:t.given,by:t.by},(t.key&&/^\d{8}_/.test(t.key))?t.key.slice(0,8):viewDk()); });
  Object.keys(marks).forEach(function(k){ var m=marks[k]; if(m&&/^\d{8}_/.test(k)) med(O[m.orderId]||orderById(m.orderId),k,m,k.slice(0,8)); });
  (ORDERS||[]).concat(Object.keys(O).map(function(k){ return O[k]; })).forEach(function(o){ if(!o||!o.cont||!o.rates||seen['f'+o.id]) return; seen['f'+o.id]=1;
    o.rates.forEach(function(r,i){ var t=new Date(r.at).getTime(); if(isNaN(t)) return; var p=o.rates[i-1], u=' '+(r.u||'');
      out.push({t:t,k:'fluid',x:o.name+' '+(i===0?'started '+r.v+u:+r.v===0?'paused':(p?(+p.v===0?'restarted ':p.v+' → '):'')+r.v+u),by:r.by||''}); }); });
  return out.sort(function(a,b){ return a.t-b.t; }); }
function vDue(o){ if(vPast()||o.dc) return null; var n=nowMin(), open=(TASKS||[]).filter(function(t){ return t.orderId===o.id&&!t.status; });
  var now=open.filter(function(t){ var s=deriveStatus(t); return s==='due'||s==='overdue'; }).sort(function(a,b){ return a.sched-b.sched; })[0];
  if(now) return {now:true,late:deriveStatus(now)==='overdue',t:now};
  var nx=open.filter(function(t){ return t.sched>n; }).sort(function(a,b){ return a.sched-b.sched; })[0]; return nx?{now:false,t:nx}:null; }
function vDueTxt(D){ return !D?'':D.now?(D.late?'Late · was due '+fmtTime(D.t.sched):'Due now'):'Next '+fmtTime(D.t.sched); }
function vPrep(rows){ VR=rows.map(function(o){ var R=vReadings(o), num=vIsNum(o,R), r={o:o,R:R,num:num,due:vDue(o)};
    if(num){ var rule=ruleFor(o.name), sp=sexSp(VISIT.species), lo=rule?lim(rule.lo,sp):null, hi=rule?lim(rule.hi,sp):null, vals=R.map(function(x){ return numOf(x.v); }),
        mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), span=Math.max(mx-mn,1);
      if(lo!=null&&lo>=mn-span*1.5) mn=Math.min(mn,lo); if(hi!=null&&hi<=mx+span*1.5) mx=Math.max(mx,hi); var pad=Math.max((mx-mn)*.14,.5); r.lo=lo; r.hi=hi; r.mn=mn-pad; r.mx=mx+pad; }
    return r; }); VE=vEvents(); }
function vNowCell(i,p,scrub){ var r=VR[i], el=document.getElementById('vxn'+i); if(!r||!el) return; var o=r.o;
  if(!p){ el.className='vx-now'; el.innerHTML=scrub?'<b>—</b><small>not charted yet</small>':'<b>—</b><small>Nothing yet</small>'; return; }
  var s=vSev(o,p.v,r.num), sm=vSummary(p.v).s; el.className='vx-now'+(s>=2?' coral':s?' amber':'')+(scrub?' scrub':'');
  el.innerHTML='<b>'+esc(sm)+(o.unit&&r.num?' <span>'+esc(o.unit)+'</span>':'')+'</b><small>'+(scrub?'at ':'')+esc(vClock(p.at))+'</small>'; }
function vDraw(anim){ var ax=document.getElementById('vxAx'); if(!ax) return; var W=Math.max(160,ax.parentNode.clientWidth), d=vDom(), sp=Date.now()-d[0],
    x=function(t){ return 4+(t-d[0])/(d[1]-d[0])*(W-12); }, adm=vAdmit(), A=VX.ax, s1=A?A.s1:vStepH(sp), s0=A?A.s0:s1, e=A?A.e:1, lo=Math.min(s0,s1), H3=3600e3;
  VX.geo={d:d,W:W,x:x};
  /* hour marks: the old and new spacing crossfade while zooming; labels never overlap (the most visible one keeps its place) */
  var grid=function(H){ return G.map(function(g){ return '<line class="vx-grid" x1="'+g.x+'" x2="'+g.x+'" y1="-6" y2="'+(H+6)+'" opacity="'+g.o+'"/>'; }).join(''); }, G=[], LB=[];
  var base=new Date(d[0]-sp*.2); base.setMinutes(0,0,0);
  for(var t=base.getTime();t<=Date.now()-H3*.75;t+=H3){ var hh=new Date(t).getHours(), in0=hh%s0===0, in1=hh%s1===0; if(!in0&&!in1) continue;
    var op=in0&&in1?1:in1?e:1-e; if(op<.03) continue; var xm=x(t), edge=Math.max(0,Math.min(1,(xm-20)/28,(W-58-xm)/28)); G.push({x:xm.toFixed(1),o:op.toFixed(2)});
    if(edge*op>.03) LB.push({x:xm,o:edge*op,t:vClock(t)}); }
  var keep=[], ah=adm&&x(adm)>40?x(adm):null; if(ah!=null) keep.push({x:ah,o:1,t:'Admitted',w:56,a:1});
  LB.sort(function(a,b){ return b.o-a.o; }).forEach(function(l){ l.w=l.t.length*5.6+6; if(keep.every(function(k){ return Math.abs(k.x-l.x)>(k.w+l.w)/2+6; })) keep.push(l); });
  ax.setAttribute('viewBox','0 0 '+W+' 16'); ax.innerHTML=keep.map(function(l){ return '<text class="vx-t'+(l.a?' adm':'')+'" x="'+l.x.toFixed(1)+'" y="12" text-anchor="middle" opacity="'+l.o.toFixed(2)+'">'+esc(l.t)+'</text>'; }).join('')
    +'<text class="vx-t now" x="'+(x(d[1])+2).toFixed(1)+'" y="12" text-anchor="end">NOW</text>';
  var pre=function(H){ return ah!=null?'<rect x="0" y="-6" width="'+ah.toFixed(1)+'" height="'+(H+12)+'" fill="url(#vxHatch)"/>':''; };
  var evl=function(H){ return VE.filter(function(v){ return v.t>=d[0]-sp*.3; }).map(function(v){ var xx=x(v.t).toFixed(1); return '<line class="vx-evl" x1="'+xx+'" x2="'+xx+'" y1="0" y2="'+H+'"/>'; }).join(''); };
  var wrap=function(id,W,H,inner,after){ return '<defs><clipPath id="'+id+'"><rect x="0" y="-8" width="'+W+'" height="'+(H+16)+'"/></clipPath></defs><g clip-path="url(#'+id+')">'+inner+'</g>'
    +'<rect x="0" y="-6" width="14" height="'+(H+12)+'" fill="url(#vxFade)" pointer-events="none"/>'+(after||'')
    +'<line class="vx-cross" x1="-20" x2="-20" y1="-6" y2="'+(H+6)+'" visibility="hidden"/>'; };
  VR.forEach(function(r,i){ var svg=document.getElementById('vxs'+i); if(!svg) return; var H=r.num?48:36, o=r.o, h=pre(H)+grid(H)+evl(H), pts=r.R.filter(function(p){ return p.at>=d[0]-sp*.3; });
    if(r.num){ var Y=function(v){ return 5+(1-(v-r.mn)/(r.mx-r.mn))*(H-10); }; r.y=function(p){ return Y(numOf(p.v)); };
      if(r.lo!=null||r.hi!=null){ var yt=Y(r.hi!=null?Math.min(r.hi,r.mx):r.mx), yb=Y(r.lo!=null?Math.max(r.lo,r.mn):r.mn); h+='<rect class="vx-band" x="0" width="'+W+'" y="'+yt.toFixed(1)+'" height="'+Math.max(1,yb-yt).toFixed(1)+'" rx="4"/>'; }
      if(pts.length>1){ var dl=pts.map(function(p,j){ return (j?'L':'M')+x(p.at).toFixed(1)+' '+Y(numOf(p.v)).toFixed(1); }).join(' ');
        h+='<path class="vx-ar" d="'+dl+' L'+x(pts[pts.length-1].at).toFixed(1)+' '+H+' L'+x(pts[0].at).toFixed(1)+' '+H+' Z" fill="url(#vxArea)"/>';   /* a pale fill under the line (light mode, Oct 2026) */
        h+='<path class="vx-ln'+(anim?' draw':'')+'" style="--len:'+Math.ceil(W*1.7)+'" d="'+dl+'"/>'; }
      pts.forEach(function(p,j){ var s=vSev(o,p.v,true), last=j===pts.length-1; h+='<circle class="v-dot'+(s>=2?' coral':s?' amber':'')+(last?' cur':'')+(vFresh(p)?' fresh':'')+'" cx="'+x(p.at).toFixed(1)+'" cy="'+Y(numOf(p.v)).toFixed(1)+'" r="'+(last?4.5:3)+'"/>'; });
    } else { var c=H/2; r.y=function(){ return c; }; h+='<rect class="vx-band" x="0" width="'+W+'" y="'+(c-8)+'" height="16" rx="4"/>';
      pts.forEach(function(p,j){ var s=vSev(o,p.v,false), last=j===pts.length-1, w=last?9:7, hh2=last?16:12; h+='<rect class="v-dot tick'+(s>=2?' coral':s?' amber':'')+(last?' cur':'')+(vFresh(p)?' fresh':'')+'" x="'+(x(p.at)-w/2).toFixed(1)+'" y="'+(c-hh2/2)+'" width="'+w+'" height="'+hh2+'" rx="2.5"/>'; }); }
    var ring=r.due&&r.due.now?'<circle class="vx-next" cx="'+(x(d[1])-6).toFixed(1)+'" cy="'+(H/2)+'" r="5"><title>'+esc(vDueTxt(r.due))+'</title></circle>':'';
    svg.setAttribute('viewBox','0 0 '+W+' '+H); svg.style.height=H+'px';
    svg.innerHTML=wrap('vxc'+i,W,H,h,ring)+'<circle class="vx-hot" r="0" cx="-20" cy="0"/>';
    vNowCell(i,r.R[r.R.length-1]); });
  var ev=document.getElementById('vxsE'); if(ev){ var eh=pre(22)+grid(22), vis=VE.filter(function(v){ return v.t>=d[0]-sp*.3; });
    vis.forEach(function(v){ var cx=x(v.t); eh+=v.k==='fluid'?'<rect class="vx-fl" x="'+(cx-5).toFixed(1)+'" y="6" width="10" height="10" rx="3"/>':'<circle class="vx-med" cx="'+cx.toFixed(1)+'" cy="11" r="5"/>'; });
    ev.setAttribute('viewBox','0 0 '+W+' 22'); ev.style.height='22px'; ev.innerHTML=wrap('vxcE',W,22,eh);
    var n=document.getElementById('vxEn'); if(n){ var k=vis.filter(function(v){ return v.t>=d[0]; }).length; n.textContent=k?k+' in view':'None in view'; } } }
/* 12 h ↔ 24 h ↔ 48 h ↔ Stay: Now stays put and time zooms around it (log-scale, ease-out, ~half a second) */
function vReduce(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
window.tsVWin=function(w){ var from=VX.span||vSpanOf(vWin()), s0=VX.ax&&VX.ax.e<.5?VX.ax.s0:vStepH(from); try{ localStorage.setItem(VW_KEY,String(w)); }catch(e){}
  [].forEach.call(document.querySelectorAll('#vxWin [data-w]'),function(b){ var on=+b.dataset.w===w; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); }); vSegInd();
  var to=vSpanOf(w); cancelAnimationFrame(VX.raf); if(vReduce()||from===to){ VX.span=null; VX.ax=null; vDraw(false); return; }
  var t0=performance.now(), a=Math.log(from), b=Math.log(to);
  (function f(now){ var t=Math.min(1,(now-t0)/560), e=1-Math.pow(1-t,4); VX.span=Math.exp(a+(b-a)*e); VX.ax={s0:s0,s1:vStepH(to),e:e}; vDraw(false);
    if(t<1) VX.raf=requestAnimationFrame(f); else { VX.span=null; VX.ax=null; vDraw(false); } })(t0); };
function vSegInd(){ var sg=document.getElementById('vxWin'); if(!sg) return; var on=sg.querySelector('.on'), ind=sg.querySelector('.ind'); if(!on||!ind) return;
  ind.style.width=on.offsetWidth+'px'; ind.style.transform='translateX('+(on.offsetLeft-2)+'px)'; }
function vScrub(ev,svg){ var g=VX.geo; if(!g) return; var rc=svg.getBoundingClientRect(), cx=ev.touches?ev.touches[0].clientX:ev.clientX, px=(cx-rc.left)*(g.W/rc.width), d=g.d, t=d[0]+(px-4)/(g.W-12)*(d[1]-d[0]);
  if(t<d[0]||t>Date.now()){ vUnscrub(); return; }
  [].forEach.call(document.querySelectorAll('#vRows .vx-cross'),function(l){ l.setAttribute('x1',px); l.setAttribute('x2',px); l.setAttribute('visibility','visible'); });
  var who='', i0=+svg.getAttribute('data-vx');
  VR.forEach(function(r,i){ var p=null; r.R.forEach(function(q){ if(q.at<=t+20*60000) p=q; }); vNowCell(i,p,true); var hot=document.querySelector('#vxs'+i+' .vx-hot');
    if(hot){ if(p&&Math.abs(p.at-t)<=40*60000&&r.y){ hot.setAttribute('cx',g.x(p.at)); hot.setAttribute('cy',r.y(p)); hot.setAttribute('r',4); if(i===i0||!who) who=p.by; } else hot.setAttribute('r',0); } });
  var near=VE.filter(function(v){ return Math.abs(v.t-t)<=45*60000; }), tip=vTip();
  tip.innerHTML='<b>'+esc(vClock(Math.round(t/300000)*300000))+'</b>'+(who?'<span>Charted by '+esc(chWho(who))+'</span>':'')+near.map(function(v){ return '<i class="'+v.k+'">'+esc(v.x)+' · '+esc(vClock(v.t))+'</i>'; }).join('');
  tip.classList.add('show'); var tw=tip.offsetWidth, l=cx-tw-16; if(l<8) l=cx+16; tip.style.left=Math.min(l,innerWidth-tw-8)+'px'; tip.style.top=Math.max(8,rc.top-8)+'px'; }
function vTip(){ var t=document.getElementById('vxTip'); if(!t){ t=document.createElement('div'); t.id='vxTip'; t.setAttribute('role','status'); document.body.appendChild(t); } return t; }
function vUnscrub(){ var t=document.getElementById('vxTip'); if(t) t.classList.remove('show');
  [].forEach.call(document.querySelectorAll('#vRows .vx-cross'),function(l){ l.setAttribute('visibility','hidden'); });
  [].forEach.call(document.querySelectorAll('#vRows .vx-hot'),function(c){ c.setAttribute('r',0); }); VR.forEach(function(r,i){ vNowCell(i,r.R[r.R.length-1]); }); }
document.addEventListener('mousemove',function(e){ var s=e.target&&e.target.closest&&e.target.closest('#vRows svg[data-vx]'); if(s) vScrub(e,s); else if(VX.geo&&document.getElementById('vxTip')&&document.getElementById('vxTip').classList.contains('show')) vUnscrub(); });
document.addEventListener('touchmove',function(e){ var s=e.target&&e.target.closest&&e.target.closest('#vRows svg[data-vx]'); if(s) vScrub(e,s); },{passive:true});
document.addEventListener('touchend',function(e){ if(e.target&&e.target.closest&&e.target.closest('#vRows svg[data-vx]')) setTimeout(vUnscrub,900); });
var vRsT=null; addEventListener('resize',function(){ clearTimeout(vRsT); vRsT=setTimeout(function(){ if(document.getElementById('vxAx')){ vDraw(false); vSegInd(); } },120); });
VX.fresh={};
function vFresh(p){ var t=VX.fresh[p.k]; return !!(t&&Date.now()-t<2600); }
/* weight: type pounds and it shows the kilograms ("35.3 lb = 16.0 kg · Use kg"); a kg number that only makes sense as pounds says so */
var WT_LBK=2.20462;
function lbParse(v){ var m=/^\s*(\d+(?:\.\d+)?)\s*(lbs?|pounds?|#|kg|kgs)?\s*$/i.exec(String(v||'')); if(!m) return null; return {n:parseFloat(m[1]),u:m[2]?(/^k/i.test(m[2])?'kg':'lb'):null}; }
function vIsWeight(o){ return /^weight$/i.test(String(o&&o.name||'').trim()); }
window.tsLbUnit=function(id,u){ var w=document.querySelector('[data-lb="'+id+'"]'); if(!w) return; w.setAttribute('data-u',u); [].forEach.call(w.querySelectorAll('.lb-seg button'),function(b){ b.setAttribute('aria-pressed',String(b.dataset.u===u)); }); tsLbHint(id); };
window.tsLbHint=function(id){ var w=document.querySelector('[data-lb="'+id+'"]'), inp=document.getElementById(id), hint=w&&w.querySelector('.lb-hint'); if(!inp||!hint) return;
  var p=lbParse(inp.value), u=(p&&p.u)||w.getAttribute('data-u')||'kg', f=function(n){ return (Math.round(n*10)/10).toString(); }, html='';
  if(p&&p.n>0&&u==='lb') html='<span>'+f(p.n)+' lb = <b>'+f(p.n/WT_LBK)+' kg</b></span><button type="button" onclick="tsLbUse(\''+id+'\','+f(p.n/WT_LBK)+')">Use kg</button>';
  else if(p&&p.n>0&&window.tsWtPlaus){ var q=tsWtPlaus(p.n); if(q&&q.fix) html='<span>'+esc(q.short)+' '+f(p.n)+' lb = <b>'+f(q.fix)+' kg</b></span><button type="button" onclick="tsLbUse(\''+id+'\','+q.fix+')">Use '+f(q.fix)+' kg</button>'; }
  hint.innerHTML=html; hint.hidden=!html; };
window.tsLbUse=function(id,kg){ var inp=document.getElementById(id); if(!inp) return; inp.value=String(kg); tsLbUnit(id,'kg'); inp.focus(); };
/* the value to save, always in kg */
window.tsLbKg=function(id,val){ var w=document.querySelector('[data-lb="'+id+'"]'), p=lbParse(val); if(!w||!p) return val; var u=p.u||w.getAttribute('data-u')||'kg';
  return u==='lb'?(Math.round(p.n/WT_LBK*10)/10).toString():(p.u?String(p.n):val); };
window.tsLbField=function(id,extra){ return '<span class="lb-wrap" data-lb="'+id+'" data-u="kg">'+extra+'<span class="lb-seg" role="group" aria-label="Unit"><button type="button" data-u="kg" aria-pressed="true" onclick="tsLbUnit(\''+id+'\',\'kg\')">kg</button><button type="button" data-u="lb" aria-pressed="false" onclick="tsLbUnit(\''+id+'\',\'lb\')">lb</button></span><span class="lb-hint" hidden></span></span>'; };
function vRow(o,i){ var R=vReadings(o), past=vPast()||o.dc, opts=V_OPTS[String(o.name).toLowerCase()], wt=vIsWeight(o), need=o.note_req, D=vDue(o);
  var field=opts?'<input class="v-in" id="vin-'+esc(o.id)+'" list="vl-'+esc(o.id)+'" placeholder="Select"'+(past?' disabled':'')+' onkeydown="if(event.key===\'Enter\')tsVRecord(\''+esc(o.id)+'\')"><datalist id="vl-'+esc(o.id)+'">'+opts.map(function(x){ return '<option>'+esc(x)+'</option>'; }).join('')+'</datalist>'
    :'<input class="v-in" id="vin-'+esc(o.id)+'" inputmode="'+(o.unit&&!wt?'decimal':'text')+'" placeholder="Value"'+(past?' disabled':'')+(wt?' oninput="tsLbHint(\'vin-'+esc(o.id)+'\')"':' oninput="tsVWarnOff(\''+esc(o.id)+'\')"')+' onkeydown="if(event.key===\'Enter\')tsVRecord(\''+esc(o.id)+'\')">';
  if(wt) field=tsLbField('vin-'+o.id,field); else if(o.unit) field+='<span class="v-unit">'+esc(o.unit)+'</span>';
  var sum=R.length?R.slice(-6).map(function(r){ return r.v; }).join(', '):'nothing charted yet';
  return '<div class="v-row vx-r'+(o.dc?' is-dc':'')+'" id="vxr-'+esc(o.id)+'"><div class="v-name">'+esc(o.name)+'<small>'+(o.dc?'Stopped':esc(o.freq||''))+(D?' · <span class="vx-due'+(D.now?' now':'')+'">'+esc(vDueTxt(D))+'</span>':'')+'</small></div>'
    +'<div class="v-trend"><div class="v-chart vx" role="img" aria-label="'+esc(o.name+': '+sum)+'"><svg data-vx="'+i+'" id="vxs'+i+'" aria-hidden="true"></svg></div></div>'
    +'<div class="vx-now" id="vxn'+i+'"></div>'
    +(past?'<div class="v-input v-ro">'+(o.dc?'Stopped':'View only')+'</div>':'<div class="v-input">'+field+'<input class="v-note'+(need?' need':'')+'" id="vnote-'+esc(o.id)+'" placeholder="'+(need?esc(o.note_prompt||'Note required'):'Note')+'"'+(need?' aria-required="true"':'')+' onkeydown="if(event.key===\'Enter\')tsVRecord(\''+esc(o.id)+'\')"><button class="v-rec" onclick="tsVRecord(\''+esc(o.id)+'\')">Record</button></div>')
    +'<div class="vx-warn" id="vxw-'+esc(o.id)+'" role="alert" hidden></div></div>'; }
function vInfRows(){ return (ORDERS||[]).filter(function(o){ return o&&o.cont&&o.kind&&!o.dc; }).map(function(o){
    return '<div class="v-row v-inf" onclick="tsInfPanel(\''+esc(o.id)+'\')"><div class="v-name">'+esc(o.name)+'<small>'+(o.kind==='cri'?'CRI':'IV fluids')+'</small></div><div class="v-trend"><span class="v-chip cur cyan">'+esc(o.rate||'')+'</span></div><div class="vx-now"></div><div class="v-input v-ro">Open infusion ›</div></div>'; }).join(''); }
var V_ACT_KEY='tsVActive_v1';
function vOnlyActive(){ try{ return localStorage.getItem(V_ACT_KEY)!=='0'; }catch(e){ return true; } }
window.tsVActive=function(on){ try{ localStorage.setItem(V_ACT_KEY,on?'1':'0'); }catch(e){} var sw=document.getElementById('vActSw'); if(sw) sw.setAttribute('aria-checked',String(on)); vFill(); };
/* stopped monitoring orders that were charted (shown when "Show only active" is off) */
function vStopped(){ var O=(curDoc&&curDoc.orders)||{}, on={}; vOrders().forEach(function(o){ on[o.id]=1; });
  return Object.keys(O).map(function(k){ return O[k]; }).filter(function(o){ return o&&o.dc&&!o.cont&&!on[o.id]&&(o.type==='obs'||o.type==='diag')&&vReadings(o).length; }); }
function vList(){ var q=vFilterQ.toLowerCase().trim(); return vOrders().concat(vOnlyActive()?[]:vStopped()).filter(function(o){ return !q||String(o.name).toLowerCase().indexOf(q)>-1; }); }
function vRowsHTML(){ var q=vFilterQ.toLowerCase().trim(), L=vList();
  var basic=L.filter(function(o){ return o.section==='Basic Observation'; }), more=L.filter(function(o){ return o.section!=='Basic Observation'; }), inf=q?'':vInfRows(), order=basic.concat(more);
  vPrep(order); var ix=function(o){ return order.indexOf(o); };
  var sec=function(t,a){ return a.length?'<div class="v-sec-h"><span>'+t+'</span></div>'+a.map(function(o){ return vRow(o,ix(o)); }).join(''):''; };
  var html=order.length?'<div class="v-row vx-r vx-ax" aria-hidden="true"><div class="v-name"></div><div class="v-trend"><svg id="vxAx"></svg></div><div class="vx-now"></div><div class="v-input"></div></div>':'';
  html+=sec('Basic observations',basic)+sec('Monitoring &amp; diagnostics',more);
  if(order.length) html+='<div class="v-row vx-r vx-ev"><div class="v-name">Meds &amp; fluids<small id="vxEn"></small></div><div class="v-trend"><div class="v-chart vx" role="img" aria-label="Medications given and fluid rate changes"><svg data-vx="ev" id="vxsE" aria-hidden="true"></svg></div></div><div class="vx-now"></div><div class="v-input"></div></div>';
  html+=inf?'<div class="v-sec-h"><span>Fluids &amp; CRIs</span></div>'+inf:'';
  return html||'<div class="v-empty" style="padding:30px">'+(q?'No vitals match.':'No monitoring orders on this sheet yet.')+'</div>'; }
function vFill(anim){ var el=document.getElementById('vRows'); if(!el) return; el.innerHTML=vRowsHTML(); vDraw(!!anim&&!vReduce()); if(window.tsVAttnPaint) tsVAttnPaint(); }
window.tsVFilter=function(v){ vFilterQ=v||''; vFill(); };
var V_SEG=[[12,'12 h'],[24,'24 h'],[48,'48 h'],[0,'Stay']];
window.renderVitals=function(){ var os=document.getElementById('ctab-sheet'); if(os) os.innerHTML=''; var el=document.getElementById('ctab-vitals'); if(!el) return;
  if(!CUR||!curDoc){ el.innerHTML=CUR?'<div class="ts-empty"><div class="ts-empty-card"><span>Opening sheet…</span></div></div>':emptyHTML(); return; }
  var first=!el.querySelector('#vRows'), w=vWin(), sc=el.querySelector('.v-scroll'), top=sc?sc.scrollTop:0;
  el.innerHTML=patientCmdHTML()+'<section class="clinical-workspace vitals-mode"><main class="treatment-main vitals-main">'
    +'<div class="v-header"><button class="btn ghost" style="width:auto;height:34px;padding:0 12px;flex:0 0 auto" onclick="selectCTab(\'sheet\')">‹ Sheet</button>'
    +'<div class="v-filter">'+IC.search+'<input placeholder="Filter vitals by name" value="'+esc(vFilterQ)+'" oninput="tsVFilter(this.value)"></div><div class="v-title">VITALS</div>'
    +'<div class="vx-seg" id="vxWin" role="group" aria-label="Time shown"><span class="ind" aria-hidden="true"></span>'+V_SEG.map(function(s){ return '<button type="button" data-w="'+s[0]+'" class="'+(s[0]===w?'on':'')+'" aria-pressed="'+(s[0]===w)+'" onclick="tsVWin('+s[0]+')">'+s[1]+'</button>'; }).join('')+'</div>'
    +'<div class="spacer" style="flex:1"></div>'
    +'<label class="v-act"><span>Show only active</span><button type="button" role="switch" id="vActSw" class="v-sw" aria-checked="'+vOnlyActive()+'" onclick="tsVActive(this.getAttribute(\'aria-checked\')!==\'true\')"><i></i></button></label>'
    +(vPast()?'<span class="v-pastnote">'+esc(dkLabel(tsViewDk()))+' · view only</span>':(window.tsTakeBtnHTML?tsTakeBtnHTML():''))+'</div>'
    +'<div class="v-scroll"><div id="vxAttn"></div><div id="vRows"></div></div>'
    +'<div class="v-footer"><button class="btn ghost" style="width:auto;height:34px;padding:0 12px" onclick="tsVHistory()">Vitals history</button></div>'
    +'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="vxFade"><stop offset="0" style="stop-color:var(--vx-bg)"/><stop offset="1" style="stop-color:var(--vx-bg);stop-opacity:0"/></linearGradient><linearGradient id="vxArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--vx-line);stop-opacity:var(--vx-ar,0)"/><stop offset="1" style="stop-color:var(--vx-line);stop-opacity:0"/></linearGradient>'
    +'<pattern id="vxHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--vx-hatch)" stroke-width="2"/></pattern></defs></svg>'
    +'</main></section>';
  vFill(first); var sc2=el.querySelector('.v-scroll'); if(sc2&&top) sc2.scrollTop=top; setTimeout(vSegInd,0); };
window.tsVWarnOff=function(oid){ var w=document.getElementById('vxw-'+oid); if(w){ w.hidden=true; w.innerHTML=''; } };
/* Record: the open slot nearest now, or an extra reading; saved like a grid cell. A value that's impossible or critical asks first. */
window.tsVRecord=function(oid,force){ if(vPast()){ toast('View only — go back to today to chart'); return; } if(!canChart()){ toast('Your role can’t chart'); return; }
  var o=orderById(oid), inp=document.getElementById('vin-'+oid), val=inp?inp.value.trim():''; if(!o) return; if(!val){ toast('Enter a value first'); if(inp) inp.focus(); return; }
  var note=((document.getElementById('vnote-'+oid)||{}).value||'').trim();
  if(o.note_req&&!note){ var ne=document.getElementById('vnote-'+oid); if(ne){ ne.focus(); ne.classList.add('cd-need'); } toast(esc(o.note_prompt||'This order needs a note')+' — add it to record'); return; }
  if(vIsWeight(o)){ var kgv=tsLbKg('vin-'+oid,val); if(kgv!==val){ toast(esc(val)+' saved as '+esc(kgv)+' kg'); val=kgv; } }
  else if(!force&&window.tsVCheck){ var c=tsVCheck(o,val); if(c){ var w=document.getElementById('vxw-'+oid); if(w){ w.innerHTML=tsVWarnHTML(c,'tsVWarnPick(\''+esc(oid)+'\',',o); w.hidden=false; var b=w.querySelector('button'); if(b) b.focus(); } return; } }
  var t=vChartOne(o,val,note); toast(esc(o.name)+' '+esc(val)+' recorded'); renderVitals(); return t; };
/* chart one reading into the slot nearest now (±60 min) or as an extra one; shared with Take vitals */
function vChartOne(o,val,note,by,later){ var n=nowMin(), me=user(), oid=o.id;
  var t=(TASKS||[]).filter(function(x){ return x.orderId===oid&&!x.status&&Math.abs(x.sched-n)<=60; }).sort(function(a,b){ return Math.abs(a.sched-n)-Math.abs(b.sched-n); })[0];
  if(!t){ t={id:'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),orderId:oid,order:o,sched:Math.round(n),severity:0}; TASKS.push(t); }
  t.status='completed'; t.completedMin=n; t.by=by||me.initials||null; t.value=val; t.notes=note||null;
  logEvent('vital','<b>'+esc(o.name)+'</b> — '+esc(val)+(o.unit?' '+esc(o.unit):'')+' recorded',t.by);
  if(!t.key) t.key=dayKey()+'_'+t.orderId+'_x'+Math.round(t.sched); VX.fresh[t.key]=Date.now(); VX.fresh[t.id]=Date.now();
  if(!later) sync(); emit('task.charted',t); return t; }
window.tsVHistory=function(){ var rows=[]; vOrders().forEach(function(o){ vReadings(o).forEach(function(r){ rows.push({o:o,r:r}); }); });
  rows.sort(function(a,b){ return b.r.at-a.r.at; }); rows=rows.slice(0,80);
  var html='<div class="op-head"><span class="op-ic"><svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><div class="op-kind">Vitals history</div><h3>'+esc(VISIT.patient||'')+'</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +(rows.length?'<div class="op-list vh-list">'+rows.map(function(x){ return '<div class="op-row"><span>'+esc(vWhen(x.r.at))+'</span><b>'+esc(x.o.name)+' · '+esc(x.r.v)+(x.o.unit?' '+esc(x.o.unit):'')+(x.r.by?' · '+esc(x.r.by):'')+(x.r.notes?'<small> — '+esc(x.r.notes)+'</small>':'')+'</b></div>'; }).join('')+'</div>'
      :'<p class="op-lead">Nothing charted yet.</p>');
  opShow(html,'wide'); };
window.tsVCopy=function(){ var g=function(rx){ var o=vOrders().find(function(x){ return rx.test(String(x.name)); }); var R=o?vReadings(o):[]; return R.length?R[R.length-1].v:'—'; };
  var txt=VISIT.patient+' — vitals '+fmtTime(nowMin())+': T '+g(/^temperature$/i)+'°F, HR '+g(/^heart rate$/i)+', RR '+g(/^respiratory rate$/i)+', MM '+g(/^mucous membrane/i)+', CRT '+g(/^crt$/i)+', '+g(/^mentation$/i)+', pain '+g(/^pain score$/i)+'/4, weight '+g(/^weight$/i)+' kg';
  try{ navigator.clipboard.writeText(txt); toast('Latest vitals copied'); }catch(e){ toast('Couldn’t copy'); } };

/* ---------- the latest value of each vital, as charted on the sheet ----------
   Saved readings plus anything charted this second and not yet saved; feeds VISIT (header numbers, Vitals card, handoff).
   Runs on every header refresh and after each charted cell, so the Vitals card always matches the grid. */
var V_LIVE=[['temp',/^temperature$/i],['hr',/^heart rate$/i],['rr',/^respiratory rate$/i],['mm',/^mucous membrane/i],['crt',/^crt$/i],['mentation',/^mentation$/i],['pain',/^pain score$/i]];
function vLatestOf(rx){ var seen={}, best=null; (ORDERS||[]).concat(Object.keys((curDoc&&curDoc.orders)||{}).map(function(k){ return curDoc.orders[k]; })).forEach(function(o){
    if(!o||!o.id||seen[o.id]||!rx.test(String(o.name||'').trim())) return; seen[o.id]=1; var R=vReadings(o), r=R[R.length-1]; if(r&&(!best||r.at>=best.at)) best=r; }); return best; }
function vLive(){ if(!curDoc) return; V_LIVE.forEach(function(v){ var r=vLatestOf(v[1]); VISIT[v[0]]=r?r.v:'—'; }); }
on('task.charted',function(){ try{ refreshHeader(); }catch(e){} },50);

/* ---------- the trend in a grid row's label (core buildGrid → window.tsRowTrend) ----------
   Monitoring and diagnostic rows: the latest reading, an arrow against the one before, and a small line of the last 24 h of numbers.
   Colour only when the latest reading is outside the hospital limits (FLAG_RULES: amber outside normal, coral critical). */
/* the Latest column: one value line + one age line, so every row keeps the same height.
   A long entry gets a meaningful short form (QAR for "Quiet, alert, responsive", or its first clause) and a visible "More";
   the cell is a button that opens the full entry, who charted it, and what the arrow means. ↑ ↓ = higher / lower than the previous reading. */
var V_ABBR={'bright alert responsive':'BAR','bright alert and responsive':'BAR','quiet alert responsive':'QAR','quiet alert and responsive':'QAR'};
var _vCtx=null;
window.tsAbbr=function(v){ return V_ABBR[String(v||'').toLowerCase().replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim()]||''; };   /* core grid: a cell shows QAR for "Quiet, alert, responsive" */
function vFits(t,px){ try{ if(!_vCtx) _vCtx=document.createElement('canvas').getContext('2d'); _vCtx.font='600 12.5px '+(getComputedStyle(document.body).fontFamily||'sans-serif'); return _vCtx.measureText(String(t)).width<=px; }catch(e){ return String(t).length<=11; } }
function vSummary(v){ v=String(v).trim(); var W=80; if(vFits(v,W)) return {s:v,cut:false};
  var a=V_ABBR[v.toLowerCase().replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim()]; if(a) return {s:a,cut:true};
  var c=v.split(/\s*[,;(—–]\s*|\s+-\s+/)[0]; if(c&&c!==v&&vFits(c,W)) return {s:c,cut:true};
  var w=v.split(/\s+/), o=''; for(var i=0;i<w.length;i++){ var n=o?o+' '+w[i]:w[i]; if(!vFits(n+'…',W)) break; o=n; } return {s:(o||v.slice(0,6))+'…',cut:true}; }
function vAge(ms){ var a=Math.max(0,Date.now()-ms); return a<9e4?'just now':a<36e5?Math.round(a/6e4)+' min ago':a<864e5?Math.floor(a/36e5)+' h ago':Math.floor(a/864e5)+' d ago'; }
function vMinOf(ms){ var d=new Date(ms); return d.getHours()*60+d.getMinutes(); }
function vLast2(o){ var R=vReadings(o); if(!R.length) return null; var last=R[R.length-1], prev=null, nl=numOf(last.v);
  for(var i=R.length-2;i>=0;i--){ if(numOf(R[i].v)!=null){ prev=R[i]; break; } }
  var dir=''; if(prev&&nl!=null){ var a=numOf(prev.v), eps=Math.max(Math.abs(a),1)*0.01; dir=nl>a+eps?'up':nl<a-eps?'down':'same'; }
  return {R:R,last:last,prev:prev,dir:dir}; }
function vDirTxt(L,o){ if(!L.prev||!L.dir) return ''; var p=L.prev.v+(o.unit?' '+o.unit:'')+' at '+fmtTime(vMinOf(L.prev.at));
  return L.dir==='up'?'Higher than the previous reading ('+p+')':L.dir==='down'?'Lower than the previous reading ('+p+')':'Same as the previous reading ('+p+')'; }
window.tsRowTrend=function(o){ if(!o||o.dc||(o.type!=='obs'&&o.type!=='diag')) return ''; var L=vLast2(o); if(!L) return '';
  var last=L.last, tone=vTone(o,last.v), sm=vSummary(last.v), arrow=L.dir==='up'?'↑':L.dir==='down'?'↓':'', dt=vDirTxt(L,o), age=vAge(last.at);
  var lab=o.name+' latest: '+last.v+(o.unit?' '+o.unit:'')+', '+age+(dt?'. '+dt:'')+'. Select for the full entry';
  return '<button type="button" class="rl-trend'+(tone?' '+tone:'')+(sm.cut?' cut':'')+'" onclick="event.stopPropagation();tsLatestOpen(\''+esc(o.id)+'\',this)" title="'+esc(last.v+(o.unit?' '+o.unit:'')+' · '+age+(dt?' · '+dt:''))+'" aria-label="'+esc(lab)+'">'
    +'<span class="rt-v"><b>'+esc(sm.s)+'</b>'+(arrow?'<i aria-hidden="true">'+arrow+'</i>':'')+'</span><small>'+age+(sm.cut?'<span class="rt-more"> · More</span>':'')+'</small></button>'; };
window.tsLatestOpen=function(id,anchor){ var o=orderById(id); if(!o) return; var L=vLast2(o); if(!L) return; var last=L.last, dt=vDirTxt(L,o), mn=vMinOf(last.at);
  var hist=L.R.slice(-4,-1).reverse().map(function(r){ return '<div class="lt-row"><span>'+esc(fmtTime(vMinOf(r.at)))+'</span><b>'+esc(r.v)+'</b></div>'; }).join('');
  var t=(TASKS||[]).find(function(x){ return x.id===last.k||x.key===last.k; });
  _openPop(anchor,'<div class="sb-filter-pop wf-pop lt-pop" role="dialog" aria-label="'+esc(o.name)+' latest reading"><div class="wf-h">'+esc(o.name)+' · latest</div>'
    +'<div class="lt-v">'+esc(last.v)+(o.unit?' <small>'+esc(o.unit)+'</small>':'')+'</div>'
    +'<div class="lt-m">'+esc(fmtTime(mn))+' · '+vAge(last.at)+(last.by?' · '+esc(typeof chWho==='function'?chWho(last.by):last.by):'')+'</div>'
    +(dt?'<div class="lt-ch '+L.dir+'"><i aria-hidden="true">'+(L.dir==='up'?'↑':L.dir==='down'?'↓':'=')+'</i>'+esc(dt)+'</div>':'')
    +(last.notes?'<div class="lt-note">'+esc(last.notes)+'</div>':'')
    +(hist?'<div class="wf-h">Earlier</div>'+hist:'')
    +(t?'<button type="button" class="fp-clear" onclick="_closePop();openCompletion(\''+esc(t.id)+'\')">Open entry</button>':'')+'</div>'); };
/* ═════════ TS VITALS · NEEDS ATTENTION (Oct 2026) ═════════
   Top of the Vitals tab: every vital whose latest reading is outside the hospital limits (FLAG_RULES), one card each —
   the value, how far out (high / low / critical), "Charted 11:48 AM by Amber Horvath" (whoever saved it: tech, doctor, intern,
   or triage vitals from Flow), and three things to do:
     Recheck 15 / 30 / 60 min — a one-time slot on the sheet for that vital, assigned to whoever charted the reading
     Notify Dr. … — the patient's doctor gets the pop-up. Only when someone taps it (Daniel, Oct 2026): a new alert no longer
                    pops up on its own; it still shows in the alerts pill and on the board.
     Add note — added to that reading's note (the earlier text is kept in its history)
   A critical reading schedules its recheck in 15 min by itself. A reading back in range resolves the card.
   Rising / falling trends (ops.js flagsFor) show as one line under the cards.
   Saved on the sheet: rechecks.{id} = {orderId, dk, min, by, auto, made_by, made_at} · flag_notify.{flagKey} = {to, by, name, at}. */
var VA_NOTE=null;
function vaDoc(){ return curDoc||{}; }
function vaDr(n){ n=String(n||'').replace(/^dr\.?\s+/i,'').trim(); if(!n||n==='—') return ''; var w=n.split(/\s+/); return 'Dr. '+w[w.length-1]; }
function vaKey(rule,r){ return (rule.id+'_lim_'+r.k).replace(/[^A-Za-z0-9_]/g,'_'); }
function vaName(ini){ var w=chWho(ini); return String(w).replace(/\s*\([^)]*\)\s*$/,''); }
/* the open rechecks for an order (today, not charted yet) */
function vaRechecks(oid){ var R=vaDoc().rechecks||{}, dk=dayKey(); return Object.keys(R).map(function(id){ var x=R[id]; return x&&Object.assign({id:id},x); })
  .filter(function(x){ if(!x||x.orderId!==oid||x.dk!==dk) return false; var t=(TASKS||[]).find(function(t){ return t.key===vaSlot(x); }); return !t||!t.status; }); }
function vaSlot(x){ return x.dk+'_'+x.orderId+'_r'+Math.round(x.min); }
/* each recheck is a real slot on the sheet: the grid shows it, Tasks lists it, charting it completes it */
on('tasks.built',function(){ if(!curDoc||vPast()) return; var R=curDoc.rechecks||{}, dk=dayKey();
  Object.keys(R).forEach(function(id){ var x=R[id]; if(!x||x.dk!==dk) return; var o=orderById(x.orderId); if(!o||o.dc) return; var key=vaSlot(x), t=TASKS.find(function(t){ return t.key===key; });
    if(t){ t.recheck=x; return; }
    TASKS.push({id:key,key:key,orderId:o.id,order:o,sched:Math.round(x.min),movedFrom:null,status:null,by:null,completedMin:null,value:null,notes:null,severity:0,recheck:x,adhoc:true}); }); });
function vaAddRecheck(o,min,by,auto){ if(!CUR||!curDoc) return null; var me=user(), id='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), now=new Date().toISOString();
  var x={orderId:o.id,dk:dayKey(),min:Math.min(1439,Math.round(min)),by:by||me.initials||null,auto:!!auto,made_by:me.initials||null,made_at:now};
  curDoc.rechecks=curDoc.rechecks||{}; curDoc.rechecks[id]=x; if(curMain&&curMain!==curDoc){ curMain.rechecks=curMain.rechecks||{}; curMain.rechecks[id]=x; }
  var u={}; u['rechecks.'+id]=x; u.updated_at=now;
  u.audit=FV.arrayUnion({at:now,type:'vital',desc:'Recheck <b>'+esc(o.name)+'</b> at '+esc(fmtTime(x.min))+(auto?' — scheduled automatically (critical reading)':'')+' · assigned to '+esc(x.by||'—'),who:me.initials,uid:me.uid});
  try{ tsCommit(CUR,u); }catch(e){ console.warn(e); }
  try{ rebuildTasks(); }catch(e){ try{ buildTasks(); }catch(_){} } try{ if(currentCTab==='sheet') buildGrid(); }catch(e){} return x; }
/* critical reading → recheck in 15 min, for whoever charted it (once per vital while one is waiting) */
on('task.charted',function(t){ try{ if(!t||vPast()||!t.order||(t.order.type!=='obs'&&t.order.type!=='diag')) return; var rule=ruleFor(t.order.name); if(!rule) return;
  var s=sevOf(rule,numOf(t.value),sexSp(VISIT.species)); if(s<2||vaRechecks(t.orderId).length) return;
  vaAddRecheck(t.order,(t.completedMin!=null?t.completedMin:nowMin())+15,t.by,true); }catch(e){ console.warn(e); } },60);
/* the cards */
function vaItems(){ var out=[], sp=sexSp(VISIT.species), acks=vaDoc().flag_acks||{}, nt=vaDoc().flag_notify||{}, dk=dayKey(), t0=dkDate(dk).getTime();
  vOrders().forEach(function(o){ var rule=ruleFor(o.name); if(!rule) return; var R=vReadings(o); if(!R.length) return; var last=R[R.length-1], v=numOf(last.v); if(v==null) return;
    var s=sevOf(rule,v,sp), lo=lim(rule.lo,sp), clo=lim(rule.clo,sp), low=(lo!=null&&v<lo)||(clo!=null&&v<clo);
    if(s){ var key=vaKey(rule,last); out.push({o:o,r:last,rule:rule,sev:s,low:low,key:key,ack:acks[key],nt:nt[key],rc:vaRechecks(o.id)}); return; }
    /* resolved today: something today was out of range and the latest is back inside */
    var bad=R.filter(function(x){ return x.at>=t0&&sevOf(rule,numOf(x.v),sp)>0; }); if(bad.length) out.push({o:o,r:last,rule:rule,sev:0,res:true}); });
  return out; }
function vaCard(it){ var o=it.o, r=it.r, crit=it.sev>=2, u=it.rule.unit||o.unit||'', dr=vaDr(VISIT.doctorFrom||(vaDoc().patient||{}).doctor), can=canChart()&&!vPast(), id=esc(o.id);
  var word=crit?(it.low?'critical — low':'critical'):(it.low?'low':'high'), rc=it.rc[0];
  var who=r.by?' by '+esc(vaName(r.by)):'';
  var sched=rc?'<div class="va-sched">↻ Recheck '+esc(fmtTime(rc.min))+' · assigned to '+esc(String(vaName(rc.by)).split(' ')[0])+(rc.auto?' <span>(scheduled automatically)</span>':'')+'</div>':'';
  var note=VA_NOTE===o.id?'<div class="va-note"><input id="vaNote" placeholder="Add a note to this reading" onkeydown="if(event.key===\'Enter\')tsVaNoteSave(\''+id+'\');if(event.key===\'Escape\')tsVaNote(null)"><button type="button" onclick="tsVaNoteSave(\''+id+'\')">Save</button></div>':'';
  var acts=can?(rc?'':[15,30,60].map(function(m){ return '<button type="button" onclick="tsVaRecheck(\''+id+'\','+m+')">Recheck '+m+' min</button>'; }).join(''))
      +(it.ack?'<span class="va-done">✓ Seen by '+esc(vaDr(it.ack.name)||it.ack.by||'doctor')+'</span>':it.nt?'<span class="va-done">✓ '+esc(vaDr(it.nt.to)||'Doctor')+' notified '+esc(vClock(new Date(it.nt.at).getTime()))+'</span>':(dr?'<button type="button" onclick="tsVaNotify(\''+id+'\')">Notify '+esc(dr)+'</button>':''))
      +(VA_NOTE===o.id?'':'<button type="button" onclick="tsVaNote(\''+id+'\')">'+(r.notes?'Edit note':'Add note')+'</button>'):'';
  return '<div class="va-card'+(crit?' crit':'')+'" data-o="'+id+'"><div class="va-val"><span class="ts-num" data-roll="va-'+id+'">'+esc(r.v)+'</span>'+(u?'<small>'+esc(u)+'</small>':'')+'</div>'
    +'<div class="va-txt"><b>'+esc(it.rule.label||o.name)+' — '+word+'</b><span>Charted '+esc(vClock(r.at))+who+(r.notes?' · “'+esc(r.notes)+'”':'')+'</span>'+sched+'</div>'
    +'<div class="va-act">'+acts+'</div>'+note+'</div>'; }
window.tsVAttnPaint=function(){ var el=document.getElementById('vxAttn'); if(!el||!curDoc) return; var I=vaItems(), open=I.filter(function(x){ return !x.res; }), res=I.filter(function(x){ return x.res; });
  var tr=[]; try{ tr=flagsFor(curDoc).filter(function(f){ return /_trend_/.test(f.key); }); }catch(e){}
  if(!open.length&&!res.length&&!tr.length){ el.innerHTML=''; return; }
  el.innerHTML=(open.length?'<div class="va-h">Needs attention · '+open.length+'</div>'+open.map(vaCard).join(''):'')
    +(tr.length?'<div class="va-trend">'+tr.map(function(f){ return '<span>'+esc(f.text)+'</span>'; }).join('')+'</div>':'')
    +(res.length?'<div class="va-res">✓ Back in range today — '+res.map(function(x){ return esc((x.rule.label||x.o.name)+' '+x.r.v+(x.rule.unit?' '+x.rule.unit:'')+' at '+vClock(x.r.at)); }).join(' · ')+'</div>':'');
  if(VA_NOTE){ var n=document.getElementById('vaNote'); if(n) setTimeout(function(){ n.focus(); },20); } };
window.tsVaRecheck=function(oid,m){ var o=orderById(oid); if(!o) return; var it=vaItems().find(function(x){ return x.o.id===oid&&!x.res; });
  var x=vaAddRecheck(o,nowMin()+m,it&&it.r.by,false); if(x) toast('Recheck '+esc(o.name)+' at '+esc(fmtTime(x.min))); renderVitals(); };
window.tsVaNotify=function(oid){ var it=vaItems().find(function(x){ return x.o.id===oid&&!x.res; }); if(!it||!CUR) return; var me=user(), now=new Date().toISOString(), to=(curDoc.patient||{}).doctor||VISIT.doctorFrom||'';
  var rec={to:to,by:me.initials||null,name:me.name||null,at:now}, u={updated_at:now}; u['flag_notify.'+it.key]=rec;
  u.audit=FV.arrayUnion({at:now,type:'doctor',desc:esc(vaDr(to)||'Doctor')+' notified — <b>'+esc(it.rule.label+' '+it.r.v+(it.rule.unit?' '+it.rule.unit:''))+'</b>',who:me.initials,uid:me.uid});
  curDoc.flag_notify=curDoc.flag_notify||{}; curDoc.flag_notify[it.key]=rec; var s=(SHEETS||[]).find(function(x){ return x._id===CUR; }); if(s&&s!==curDoc){ s.flag_notify=s.flag_notify||{}; s.flag_notify[it.key]=rec; }
  try{ tsCommit(CUR,u); }catch(e){ console.warn(e); } toast(esc(vaDr(to)||'The doctor')+' notified'); tsVAttnPaint(); try{ flagsDirty(); }catch(e){} };
window.tsVaNote=function(oid){ VA_NOTE=oid; tsVAttnPaint(); };
window.tsVaNoteSave=function(oid){ var n=((document.getElementById('vaNote')||{}).value||'').trim(); VA_NOTE=null; if(!n){ tsVAttnPaint(); return; }
  var it=vaItems().find(function(x){ return x.o.id===oid&&!x.res; }), t=it&&(TASKS||[]).find(function(x){ return x.key===it.r.k||x.id===it.r.k; });
  if(!t){ toast('That reading is from another day — add a note on the sheet'); tsVAttnPaint(); return; }
  chKeep(t); t.notes=(t.notes?t.notes+' · ':'')+n; logEvent('vital','Note on <b>'+esc(t.order.name)+'</b> '+esc(t.value||'')+' — '+esc(n),user().initials); sync(); toast('Note added'); renderVitals(); };
/* ═════════ TS VITALS · TAKE VITALS + UNLIKELY-VALUE CHECK (Oct 2026) ═════════
   Take vitals (Vitals tab header): one pass through the round — temperature, heart rate, breathing, CRT, membranes, mentation, pain,
   plus any other basic observation due now. A big field per step; Return = next, Shift-Return = back, 1–9 picks a choice, Esc closes.
   The mic (or the typed line under it) takes the whole round at once — "101.2, 130, 24, under 2, pink, BAR, pain 1" — and each value
   drops into its step. A review shows everything before Save; Save charts every value like Record does (nearest open slot ±60 min).
   Unlikely-value check, under the field and never a pop-up, here and on each row's Record:
     impossible  "1017 °F isn’t possible — Use 101.7 · Fix it"   (a slipped decimal, a dropped digit, or °C typed as °F)
     critical    "107 °F is critical — Yes, 107 · Fix it"         (FLAG_RULES critical limits)
   You can't go on until you pick one. */
var V_PLAUS={temp:[80,115],hr:[1,400],rr:[1,150],bg:[1,900],bp:[20,350],spo2:[40,100],lac:[0,30],uop:[0,40]};
function vcFmt(n){ return (Math.round(n*10)/10).toString(); }
/* null when the value looks fine, else {kind:'imp'|'crit', n, u, fix, why} */
window.tsVCheck=function(o,val){ var n=numOf(val), rule=ruleFor(o&&o.name); if(n==null||!rule) return null; var P=V_PLAUS[rule.id], u=rule.unit||o.unit||'', sp=sexSp(VISIT.species);
  var ok=function(v){ return P&&v>=P[0]&&v<=P[1]; };
  if(P&&!ok(n)){ var fix=null, why='';
    if(rule.id==='temp'&&n>=30&&n<=45){ fix=vcFmt(n*9/5+32); why='looks like °C'; }
    else { var d=String(val).replace(/[^\d]/g,''), C=[];
      if(d.length>=3) C.push(+(d.slice(0,-1)+'.'+d.slice(-1))); if(d.length>=4) C.push(+(d.slice(0,-2)+'.'+d.slice(-2))); C.push(n/10);
      fix=C.filter(function(c){ return ok(c)&&sevOf(rule,c,sp)<2; }).map(vcFmt)[0]||null; }
    return {kind:'imp',n:vcFmt(n),u:u,fix:fix,why:why}; }
  if(sevOf(rule,n,sp)>=2) return {kind:'crit',n:vcFmt(n),u:u,fix:null};
  return null; };
/* cb: the start of a call, e.g. "tsVWarnPick('d1'," — the buttons finish it with 'ok' | 'use','101.7' | 'fix' */
window.tsVWarnHTML=function(c,cb){ var v=c.n+(c.u?' '+c.u:'');
  return c.kind==='imp'?'<span>'+esc(v)+' isn’t possible'+(c.why?' — '+esc(c.why):'')+'</span>'+(c.fix?'<button type="button" class="pri" onclick="'+cb+'\'use\',\''+c.fix+'\')">Use '+esc(c.fix)+'</button>':'')+'<button type="button" onclick="'+cb+'\'fix\')">Fix it</button>'
    :'<span>'+esc(v)+' is critical</span><button type="button" class="pri" onclick="'+cb+'\'ok\')">Yes, '+esc(c.n)+'</button><button type="button" onclick="'+cb+'\'fix\')">Fix it</button>'; };
window.tsVWarnPick=function(oid,act,v){ var inp=document.getElementById('vin-'+oid);
  if(act==='ok') return tsVRecord(oid,true);
  if(act==='use'){ if(inp) inp.value=v; return tsVRecord(oid,true); }
  tsVWarnOff(oid); if(inp){ inp.focus(); inp.select(); } };

/* ---------- Take vitals ---------- */
var TV={on:false,S:[],V:{},OK:{},i:0,rec:null};
function tvSteps(){ var L=vOrders().filter(function(o){ return !o.dc&&!vIsWeight(o)&&(o.type==='obs'||o.type==='diag'); }), out=[];
  V_LIVE.forEach(function(v){ var o=L.find(function(x){ return v[1].test(String(x.name||'').trim()); }); if(o&&out.indexOf(o)<0) out.push(o); });
  L.forEach(function(o){ if(out.indexOf(o)>-1||o.section!=='Basic Observation') return; var D=vDue(o); if(D&&D.now) out.push(o); });
  return out; }
window.tsTakeBtnHTML=function(){ if(!canChart()) return ''; var S=tvSteps(); if(!S.length) return ''; var due=S.filter(function(o){ var D=vDue(o); return D&&D.now; }).length;
  var nx=S.map(vDue).filter(function(D){ return D&&!D.now; }).sort(function(a,b){ return a.t.sched-b.t.sched; })[0];
  return '<button type="button" class="vx-take" id="vxTake" onclick="tsTakeOpen()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>Take vitals'
    +(due?'<span class="due">Due now · '+due+'</span>':nx?'<span class="due soft">Next '+esc(fmtTime(nx.t.sched))+'</span>':'')+'</button>'; };
function tvOpts(o){ return V_OPTS[String(o.name).toLowerCase()]||null; }
function tvEl(){ var el=document.getElementById('tvPanel'); if(el) return el;
  var sc=document.createElement('div'); sc.id='tvScrim'; sc.onclick=tsTakeClose; document.body.appendChild(sc);
  el=document.createElement('aside'); el.id='tvPanel'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','Take vitals'); document.body.appendChild(el);
  el.addEventListener('keydown',tvKey); el.addEventListener('input',function(e){ if(e.target&&/^tvIn\d+$/.test(e.target.id)){ var o=TV.S[TV.i]; if(o){ delete TV.OK[o.id]; tvWarn(null); } } });
  return el; }
window.tsTakeOpen=function(){ if(vPast()){ toast('View only — go back to today to chart'); return; } if(!canChart()){ toast('Your role can’t chart'); return; }
  TV.S=tvSteps(); if(!TV.S.length){ toast('No vitals ordered on this sheet'); return; } TV.V={}; TV.OK={}; TV.i=0; TV.on=true;
  var el=tvEl(), me=user();
  el.innerHTML='<div class="tv-h"><div><b>Take vitals</b><span>'+esc(VISIT.patient||'')+' · '+esc(fmtTime(nowMin()))+' · '+esc(me.initials||'')+'</span></div><button type="button" class="tv-x" onclick="tsTakeClose()" aria-label="Close">×</button></div>'
    +'<div class="tv-dots" id="tvDots" aria-hidden="true"></div><div class="tv-b" id="tvB"></div>'
    +'<div class="tv-keys" aria-hidden="true"><span><kbd>return</kbd>next</span><span><kbd>shift</kbd><kbd>return</kbd>back</span><span><kbd>1</kbd>–<kbd>9</kbd>pick</span><span><kbd>esc</kbd>close</span></div>'
    +'<div class="tv-say">'+(SAY_SR?'<button type="button" class="tv-mic" id="tvMic" onclick="tsTakeMic()" aria-label="Say the values"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg></button>':'')
    +'<input id="tvLine" placeholder="'+(SAY_SR?'Tap the mic and say them all, or type':'Type them all')+': 101.2, 130, 24, pink…" autocomplete="off" onkeydown="if(event.key===\'Enter\'){event.preventDefault();event.stopPropagation();tsTakeSay(this.value)}"></div>'
    +'<div class="tv-f"><button type="button" class="btn ghost" id="tvBack" onclick="tsTakeGo(-1)">Back</button><button type="button" class="btn primary" id="tvNext" onclick="tsTakeNext()">Next</button></div>';
  document.getElementById('tvScrim').classList.add('show'); requestAnimationFrame(function(){ el.classList.add('show'); }); tvBuild(); };
window.tsTakeClose=function(){ TV.on=false; try{ if(TV.rec) TV.rec.abort(); }catch(e){} var el=document.getElementById('tvPanel'), sc=document.getElementById('tvScrim'); if(el) el.classList.remove('show'); if(sc) sc.classList.remove('show');
  var b=document.getElementById('vxTake'); if(b) setTimeout(function(){ b.focus(); },50); };
function tvLast(o){ var R=vReadings(o), r=R[R.length-1]; return r?'Last: '+esc(r.v)+(o.unit?' '+esc(o.unit):'')+' · '+esc(vClock(r.at))+(r.by?' · '+esc(r.by):''):'Not charted yet'; }
function tvBuild(){ var B=document.getElementById('tvB'); if(!B) return; var N=TV.S.length;
  B.innerHTML=TV.S.map(function(o,i){ var cls=i<TV.i?'prev':i>TV.i?'next':'cur', opts=tvOpts(o), v=TV.V[o.id], D=vDue(o);
    var inner=opts?'<div class="tv-chips" role="radiogroup" aria-label="'+esc(o.name)+'">'+opts.map(function(c,j){ return '<button type="button" role="radio" aria-checked="'+(v===c)+'" class="'+(v===c?'on':'')+'" onclick="tsTakePick('+i+','+j+')">'+esc(c)+(j<9?'<kbd>'+(j+1)+'</kbd>':'')+'</button>'; }).join('')+'</div>'
      :'<div class="tv-big" id="tvBig'+i+'"><input id="tvIn'+i+'" inputmode="decimal" autocomplete="off" placeholder="—" value="'+esc(v!=null?v:'')+'" aria-label="'+esc(o.name)+'">'+(o.unit?'<span class="u">'+esc(o.unit)+'</span>':'')+'</div>';
    return '<section class="tv-step '+cls+'" aria-hidden="'+(i!==TV.i)+'"><div class="tv-q">'+(i+1)+' of '+N+' · '+esc(o.name)+(D&&D.now?'':' <small>not due</small>')+'</div>'+inner+'<div class="tv-last">'+tvLast(o)+'</div><div class="tv-warn" id="tvW'+i+'" role="alert" hidden></div></section>'; }).join('')
    +'<section class="tv-step '+(TV.i===N?'cur':'next')+'"><div class="tv-q">Review · '+esc(fmtTime(nowMin()))+'</div><div class="tv-rev">'+TV.S.map(function(o,i){ var v=TV.V[o.id], s=v!=null?vSev(o,v,!tvOpts(o)):0;
      return '<button type="button" class="'+(s>=2?'coral':s?'amber':'')+'" onclick="tsTakeGo('+(i-TV.i)+')"><span>'+esc(o.name)+'</span><b>'+(v!=null?esc(v)+(o.unit&&!tvOpts(o)?' '+esc(o.unit):''):'<em>skip</em>')+'</b></button>'; }).join('')+'</div></section>';
  var dots=document.getElementById('tvDots'); if(dots) dots.innerHTML=TV.S.map(function(o,i){ return '<i class="'+(i<TV.i?(TV.V[o.id]!=null?'done':'skip'):i===TV.i?'cur':'')+'"></i>'; }).join('')+'<i class="'+(TV.i===N?'cur':'')+'"></i>';
  var nx=document.getElementById('tvNext'), bk=document.getElementById('tvBack'), filled=TV.S.filter(function(o){ return TV.V[o.id]!=null; }).length;
  if(nx){ nx.textContent=TV.i===N?(filled?'Save '+filled+(filled===1?' vital':' vitals'):'Nothing to save'):'Next'; nx.disabled=TV.i===N&&!filled; } if(bk) bk.disabled=TV.i===0;
  var inp=document.getElementById('tvIn'+TV.i); setTimeout(function(){ var f=inp||document.querySelector('#tvB .tv-step.cur .tv-chips button.on')||document.querySelector('#tvB .tv-step.cur button'); if(f&&TV.on) try{ f.focus({preventScroll:true}); if(inp) inp.select(); }catch(e){} },vReduce()?0:200); }
function tvWarn(c){ var w=document.getElementById('tvW'+TV.i), big=document.getElementById('tvBig'+TV.i); if(!w) return;
  if(!c){ w.hidden=true; w.innerHTML=''; if(big) big.classList.remove('warn'); return; }
  w.innerHTML=tsVWarnHTML(c,'tsTakeWarn('); w.hidden=false; if(big) big.classList.add('warn'); }
window.tsTakeWarn=function(act,v){ var o=TV.S[TV.i]; if(!o) return; var inp=document.getElementById('tvIn'+TV.i);
  if(act==='ok'){ TV.OK[o.id]=1; tvWarn(null); tsTakeGo(1); return; }
  if(act==='use'){ TV.V[o.id]=v; if(inp) inp.value=v; TV.OK[o.id]=1; tvWarn(null); tsTakeGo(1); return; }
  tvWarn(null); if(inp){ inp.focus(); inp.select(); } };
/* leaving a number step: keep what's typed (empty = skip), check it first */
function tvKeep(){ var o=TV.S[TV.i]; if(!o||tvOpts(o)) return true; var inp=document.getElementById('tvIn'+TV.i), v=inp?inp.value.trim():'';
  if(!v){ delete TV.V[o.id]; return true; } TV.V[o.id]=v; if(TV.OK[o.id]) return true; var c=tsVCheck(o,v); if(c){ tvWarn(c); return false; } return true; }
window.tsTakeGo=function(d){ if(d>0&&!tvKeep()) return; if(d<0) tvKeep(); TV.i=Math.max(0,Math.min(TV.S.length,TV.i+d)); tvBuild(); };
window.tsTakeNext=function(){ if(TV.i===TV.S.length) tsTakeSave(); else tsTakeGo(1); };
window.tsTakePick=function(i,j){ var o=TV.S[i], opts=o&&tvOpts(o); if(!opts) return; TV.V[o.id]=opts[j]; TV.i=i; tvBuild(); setTimeout(function(){ if(TV.i===i) tsTakeGo(1); },vReduce()?0:170); };
function tvKey(e){ if(!TV.on) return; if(e.key==='Escape'){ e.preventDefault(); tsTakeClose(); return; }
  if(e.target&&e.target.id==='tvLine') return;
  if(e.key==='Enter'){ e.preventDefault(); if(e.shiftKey) tsTakeGo(-1); else tsTakeNext(); return; }
  var o=TV.S[TV.i], opts=o&&tvOpts(o); if(opts&&/^[1-9]$/.test(e.key)&&opts[+e.key-1]!=null){ e.preventDefault(); tsTakePick(TV.i,+e.key-1); } }
/* the whole round in one line, spoken or typed */
window.tsTakeSay=function(text){ text=String(text||'').trim(); if(!text) return 0;
  var R=TV.S.map(function(o){ var n=String(o.name).toLowerCase().trim(), key=Object.keys(SAY_ALIAS).find(function(k){ return n===k||n.indexOf(k)===0; }), opts=tvOpts(o)||[];
    return {al:(key?SAY_ALIAS[key]:[]).concat([n]).sort(function(a,b){ return b.length-a.length; }),opts:opts.map(function(x){ return String(x).toLowerCase(); }),num:!opts.length}; });
  var P=sayParse(text,R), got=0;
  /* numbers said without a name fill the number steps in order: "101.2, 130, 24" → temperature, heart rate, breathing */
  var tok=sayNorm(text).split(/[\s,]+/).filter(Boolean), aliasW={}; R.forEach(function(r){ r.al.forEach(function(a){ a.split(' ').forEach(function(w){ aliasW[w]=1; }); }); });
  var free=[]; tok.forEach(function(w,k){ if(/^-?\d+(\.\d+)?$/.test(w)&&!(k>0&&aliasW[tok[k-1]])&&!(k>0&&/^(is|of|was|at)$/.test(tok[k-1])&&k>1&&aliasW[tok[k-2]])) free.push(w); });
  var named={}; Object.keys(P).forEach(function(i){ if(R[i].num) named[P[i]]=(named[P[i]]||0)+1; });
  free=free.filter(function(w){ if(named[w]){ named[w]--; return false; } return true; });
  R.forEach(function(r,i){ if(r.num&&P[i]==null&&free.length) P[i]=free.shift(); });
  Object.keys(P).forEach(function(i){ var o=TV.S[i], v=P[i]; if(!R[i].num){ v=(tvOpts(o)||[])[v]; } if(v==null||v==='') return; TV.V[o.id]=String(v); got++; });
  var line=document.getElementById('tvLine'); if(line){ line.value=''; line.placeholder=got?'Heard: '+text:'Didn’t catch any values — try “temp 101.2, heart rate 130…”'; }
  if(got){ TV.i=TV.S.length; tvBuild(); /* every number still gets the unlikely-value check: the first one that fails opens */
    for(var i=0;i<TV.S.length;i++){ var o=TV.S[i], v=TV.V[o.id]; if(v!=null&&!tvOpts(o)&&!TV.OK[o.id]&&tsVCheck(o,v)){ TV.i=i; tvBuild(); tvWarn(tsVCheck(o,v)); break; } } }
  return got; };
window.tsTakeMic=function(){ if(!SAY_SR) return; var b=document.getElementById('tvMic'), line=document.getElementById('tvLine');
  if(TV.rec){ try{ TV.rec.stop(); }catch(e){} return; } var fin='';
  try{ TV.rec=new SAY_SR(); }catch(e){ return; } TV.rec.lang='en-US'; TV.rec.interimResults=true; TV.rec.continuous=false;
  TV.rec.onresult=function(e){ var t=''; for(var i=e.resultIndex;i<e.results.length;i++){ if(e.results[i].isFinal) fin+=e.results[i][0].transcript+' '; else t+=e.results[i][0].transcript; } if(line) line.value=(fin+t).trim(); };
  TV.rec.onerror=function(e){ if(e.error==='not-allowed') toast('Allow the microphone to chart by voice'); };
  TV.rec.onend=function(){ TV.rec=null; if(b) b.classList.remove('on'); var txt=(line&&line.value)||fin; if(txt.trim()&&TV.on) tsTakeSay(txt); };
  if(b) b.classList.add('on'); if(line){ line.value=''; line.placeholder='Listening…'; } try{ TV.rec.start(); }catch(e){ TV.rec=null; if(b) b.classList.remove('on'); } };
window.tsTakeSave=function(){ if(vPast()||!canChart()) return; var n=0, ids=[];
  TV.S.forEach(function(o){ var v=TV.V[o.id]; if(v==null||String(v).trim()==='') return; var t=vChartOne(o,String(v).trim(),null,null,true); if(t){ n++; ids.push(t.id); } });
  if(!n) return; sync(); try{ tsJustCharted(ids); }catch(e){} tsTakeClose(); toast(n+(n===1?' vital':' vitals')+' recorded'); renderVitals(); };
/* ═════════ TS ROW LOOK — the treatment list's left column, order instructions, and numbers that roll (Oct 2026) ═════════
   Built from the approved mockups (board-header-mockup.html · "Treatment list · left column", "Numbers that roll"):
   · Latest says what's next when nothing is charted yet: "Not given · Due 2 PM", "Due in 12 min" in the last 15 minutes, then
     "Due now" in the accent colour (tsNextDue — medsafe.js tsMedLatest and chart.js tsCareLatest use it). A minute tick keeps
     ages ("just now" → "1 min ago") and the countdown current without redrawing the grid.
   · Instructions: an order keeps a short name; its instructions (order.notes) sit behind a small grey dot after the name.
     Hover, tap the dot or Tab to it to read them; the charting window always shows them at the top, and a threshold written in
     them ("call Dr. Schiff if below 60") sits under the value field and lights up when the value typed crosses it.
     Long existing names ("Flush IV catheter with heparinized saline and check the site …") can be split into a short name +
     instructions — the list of proposed splits is shown first and nothing changes until Apply (tsInsSplitOpen).
   · Motion: a new order row opens from nothing with one soft accent glow; a stopped order dims and glides down into
     Stopped & completed while the rows between close up (FLIP); a section folds and opens smoothly with its chevron;
     changed numbers roll (only the digits that changed, right to left, 30 ms apart) and words slide.
     Reduce Motion: everything becomes a short fade.
   Numbers that roll: any element with data-roll="key" rolls when its text changes; data-roll-fade="key" crossfades instead.
   The first time a sheet (or day) is shown nothing rolls. */
var RL={snap:null,sheet:null,skip:false,first:true}, RL_EASE='cubic-bezier(.32,.72,0,1)';
function rlRM(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
function rlClock(min){ min=Math.round(min); var h=((Math.floor(min/60)%24)+24)%24, m=((min%60)+60)%60, ap=h<12?'AM':'PM', hh=h%12||12; return hh+(m?':'+(m<10?'0':'')+m:'')+' '+ap; }
window.tsClockShort=rlClock;
/* "Dr. Schiff" for a doctor's full name; anyone else as written */
window.tsDrShort=function(n){ n=String(n||'').trim(); if(!n) return ''; var w=n.replace(/^dr\.?\s+/i,'').split(/\s+/), S=window.TS_STAFF||{};
  var doc=/^dr\.?\s/i.test(n)||(S.doctors||[]).some(function(d){ return String(d).replace(/^dr\.?\s+/i,'').trim().toLowerCase()===w.join(' ').toLowerCase(); });
  var other=[].concat(S.techs||[],S.interns||[],S.liaisons||[]).some(function(d){ return String(d).trim().toLowerCase()===w.join(' ').toLowerCase(); });
  return (doc||(!other&&w.length>1))?'Dr. '+w[w.length-1]:n; };   /* only doctors stop orders: a full name without a known role reads as a doctor */

/* ---------- what's next on a row ---------- */
window.tsNextDue=function(o){ if(!o||o.dc||o.draft||(window.tsViewDk&&tsViewDk()!==dayKey())) return null; var n=nowMin();
  var T=(TASKS||[]).filter(function(t){ return t.orderId===o.id&&!t.status; }).sort(function(a,b){ return a.sched-b.sched; }); if(!T.length) return null;
  var late=T.filter(function(t){ return deriveStatus(t)==='overdue'; }); if(late.length) return {txt:'Due '+rlClock(late[0].sched),cls:'late'};
  var t=T[0], d=t.sched-n;
  if(d<=0) return {txt:'Due now',cls:'now'};
  if(d<=15) return {txt:'Due in '+Math.max(1,Math.ceil(d))+' min',cls:'soon'};
  return {txt:'Due '+rlClock(t.sched),cls:''}; };

/* ---------- instructions ---------- */
function rlIns(o){ return String((o&&o.notes)||'').trim(); }
window.tsInsAttr=function(o){ var s=rlIns(o); if(!s) return ['',''];
  return [' data-ins="'+esc(o.id)+'"','<button type="button" class="rl-idot" aria-label="Instructions: '+esc(s)+'" onclick="event.stopPropagation();tsInsPop(this,\''+esc(o.id)+'\',true)" onfocus="tsInsPop(this,\''+esc(o.id)+'\')" onblur="tsInsHide()"></button>']; };
function rlInsLines(s){ return esc(s).replace(/\s+·\s+|\n+/g,'<br>'); }
function rlInsWho(o){ var by=o.ordered_by_name||o.ordered_by||''; return (by?tsDrShort(by)+' · ':'')+(o.ordered_at?'when ordered':''); }
window.tsInsPop=function(anchor,id,toggle){ var o=orderById(id)||(window.oFind&&oFind(id)); if(!o) return; var s=rlIns(o); if(!s) return;
  var p=document.getElementById('tsInsPop'); if(!p){ p=document.createElement('div'); p.id='tsInsPop'; p.setAttribute('role','tooltip'); document.body.appendChild(p); }
  if(toggle&&p.classList.contains('show')&&p._for===id){ tsInsHide(); return; }
  p._for=id; p.innerHTML='<div class="ip-h">Instructions</div><p>'+rlInsLines(s)+'</p>'+(rlInsWho(o)?'<div class="ip-by">'+esc(rlInsWho(o))+'</div>':'');
  var nm=anchor.closest('.rl-name')||anchor, b=nm.getBoundingClientRect(); p.classList.add('show');
  var w=p.offsetWidth, x=Math.max(8,Math.min(b.left,innerWidth-w-8)), y=b.bottom+8; if(y+p.offsetHeight>innerHeight-8) y=Math.max(8,b.top-p.offsetHeight-8);
  p.style.left=x+'px'; p.style.top=y+'px'; };
window.tsInsHide=function(){ var p=document.getElementById('tsInsPop'); if(p) p.classList.remove('show'); };
(function(){ var hov=null;
  document.addEventListener('mouseover',function(e){ var n=e.target&&e.target.closest&&e.target.closest('#sheetInner .rl-name[data-ins]'); if(n===hov) return; hov=n; if(n){ var d=n.querySelector('.rl-idot'); tsInsPop(d||n,n.getAttribute('data-ins')); } else tsInsHide(); },true);
  document.addEventListener('scroll',function(){ tsInsHide(); },true);
  document.addEventListener('pointerdown',function(e){ if(!(e.target.closest&&(e.target.closest('#tsInsPop')||e.target.closest('.rl-idot')))) tsInsHide(); },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') tsInsHide(); }); })();
/* the charting window: instructions at the top */
window.tsInsBlock=function(o){ var s=rlIns(o); if(!s) return ''; var t=(o.type==='obs'||o.type==='diag')&&rlThr(o); if(t&&t.all) return '';   /* the threshold alone: it sits under the value field */ return '<div class="cd-ins"><div class="cd-ins-k">Instructions</div><p>'+rlInsLines(s)+'</p></div>'; };
/* a threshold written in the instructions, under the value field: "Call Dr. Schiff if below 60" */
var RL_THR=/(?:call|notify|page|tell)\b[^.;·\n]*?\b(below|under|less than|<|above|over|more than|greater than|>)\s*(\d+(?:\.\d+)?)/i;
function rlThr(o){ var s=rlIns(o); if(!s) return null; var parts=s.replace(/\b(Dr|Mr|Mrs|Ms)\./g,'$1\u2024').split(/\s+·\s+|[.;\n]+(?!\d)/);
  for(var i=0;i<parts.length;i++){ var m=RL_THR.exec(parts[i]); if(m) return {txt:parts[i].trim().replace(/\u2024/g,'.').replace(/^./,function(c){ return c.toUpperCase(); }),low:/below|under|less|</i.test(m[1]),v:+m[2],all:parts.length===1}; } return null; }
window.tsInsThreshold=function(o){ var t=rlThr(o); if(!t) return ''; return '<div class="cd-thr" id="cdThr" data-low="'+(t.low?1:0)+'" data-v="'+t.v+'">'+esc(t.txt)+'</div>'; };
document.addEventListener('input',function(e){ if(!e.target||e.target.id!=='cd-value') return; var h=document.getElementById('cdThr'); if(!h) return;
  var v=parseFloat(String(e.target.value).replace(/[^\d.\-]/g,'')), lim=+h.getAttribute('data-v'), low=h.getAttribute('data-low')==='1';
  h.classList.toggle('hit',!isNaN(v)&&(low?v<lim:v>lim)); });

/* ---------- long names → short name + instructions ---------- */
var RL_SPLIT=[' with ',' and check ',' — ',' - ',' ('];
function rlSplit(name){ name=String(name||''); if(name.length<26) return null; var at=-1, sep='';
  RL_SPLIT.forEach(function(s){ var i=name.toLowerCase().indexOf(s); if(i>2&&(at<0||i<at)){ at=i; sep=s; } }); if(at<0) return null;
  var short=name.slice(0,at).trim(), rest=name.slice(at+sep.length).trim();
  if(sep===' ('){ var cl=rest.indexOf(')'); if(cl>-1){ var aft=rest.slice(cl+1).replace(/^[\s—–\-:,;]+/,''); rest=rest.slice(0,cl)+(aft?' · '+aft:''); } }
  if(sep===' and check ') rest='Check '+rest;
  rest=rest.replace(/\s+[—–]\s+/g,' · ');
  rest=rest.replace(/\s+and check\s+/i,' · check ').replace(/^./,function(c){ return c.toUpperCase(); });
  if(short.length<3||!rest) return null; return {name:short,ins:rest}; }
function rlSplits(only){ return (ORDERS||[]).filter(function(o){ return !o.dc&&!o._ghost&&(!only||o.id===only); }).map(function(o){ var p=rlSplit(o.name); return p?{o:o,name:p.name,ins:p.ins+(rlIns(o)?' · '+rlIns(o):'')}:null; }).filter(Boolean); }
window.tsInsSplitOne=function(o){ return !!rlSplit(o&&o.name); };
window.tsInsSplitCount=function(){ try{ return rlSplits().length; }catch(e){ return 0; } };
window.tsInsSplitOpen=function(only){ if(!canOrderTS()){ toast('Only doctors change orders'); return; } var L=rlSplits(only);
  if(!L.length){ toast('No long order names on this sheet'); return; }
  opShow('<div class="op-head"><div><div class="op-kind">Orders</div><h3>Shorten long names</h3></div><button type="button" class="op-x" onclick="tsOrderClose()" aria-label="Close">×</button></div>'
    +'<p class="op-lead">Each order keeps a short name on the sheet; the rest becomes its instructions — behind the dot after the name, and at the top whenever it\'s charted. Nothing changes until you apply.</p>'
    +'<div class="rl-sp-list">'+L.map(function(x,i){ return '<label class="rl-sp"><input type="checkbox" checked data-i="'+i+'"><span><s>'+esc(x.o.name)+'</s><b>'+esc(x.name)+'</b><em>Instructions: '+esc(x.ins)+'</em></span></label>'; }).join('')+'</div>'
    +'<div class="op-actions"><button type="button" class="op-btn" onclick="tsOrderClose()">Cancel</button><button type="button" class="op-btn primary" id="rlSpGo">Apply '+L.length+'</button></div>','rl-split');
  var host=document.getElementById('tsOrderSheet');
  var go=document.getElementById('rlSpGo'), boxes=host.querySelectorAll('.rl-sp input');
  [].forEach.call(boxes,function(b){ b.onchange=function(){ var n=[].filter.call(boxes,function(x){ return x.checked; }).length; go.textContent=n?'Apply '+n:'Apply'; go.disabled=!n; }; });
  go.onclick=function(){ var me=user(), n=0; [].forEach.call(boxes,function(b){ if(!b.checked) return; var x=L[+b.getAttribute('data-i')]; if(!x) return;
      var o=orderById(x.o.id); if(!o) return; logEvent('doctor','Order renamed — <b>'+esc(x.o.name)+'</b> → <b>'+esc(x.name)+'</b> · instructions: '+esc(x.ins),me.initials);
      Object.assign(o,{name:x.name,notes:x.ins,long_name:x.o.name}); n++; });
    if(n){ rebuildTasks(); redrawSheet(); sync(); }   /* all at once: one save */
    tsOrderClose(); if(n) toast(n===1?'Name shortened — instructions kept':n+' names shortened — instructions kept'); }; };

/* ---------- numbers that roll ---------- */
var RN={map:{},pfx:null,raf:0,ST:''}; for(var _d=0;_d<10;_d++) RN.ST+='<span>'+_d+'</span>';
function rnPfx(){ var p=(typeof CUR!=='undefined'?CUR:'')+'|'+(window.tsViewDk?tsViewDk():''); if(p!==RN.pfx){ RN.pfx=p; RN.map={}; } return p; }
function rnText(el){ return el.textContent.trim(); }
function rnScan(){ RN.raf=0; rnPfx(); var all=document.querySelectorAll('[data-roll],[data-roll-fade]');
  for(var i=0;i<all.length;i++){ var el=all[i], fade=el.hasAttribute('data-roll-fade'), k=fade?'f:'+el.getAttribute('data-roll-fade'):el.getAttribute('data-roll'), v=rnText(el), was=RN.map[k];
    if(el._ro&&el.style.color!=='transparent') rnEnd(el);
    if(!el.getClientRects().length){ RN.map[k]={v:v,c:null}; continue; }
    var col=getComputedStyle(el).color; if(el._ro) col=el._roc||col;
    if(was&&was.v!==v&&v){ if(fade||rlRM()) rnFade(el); else rnRoll(el,was.v,v,was.c,col); }
    RN.map[k]={v:v,c:col}; } }
function rnQueue(){ if(!RN.raf) RN.raf=requestAnimationFrame(rnScan); }
window.tsRollScan=rnQueue;
function rnFade(el){ try{ el.animate([{opacity:.15},{opacity:1}],{duration:rlRM()?200:320,easing:'ease-out'}); }catch(e){} }
function rnEnd(el){ var o=el._ro; el._ro=null; if(o&&o.parentNode) o.parentNode.removeChild(o); if(el.style.color==='transparent') el.style.color=''; }
/* the rolling copy sits over the number (a clipped layer on the page), so the number itself — its text, its layout — never changes:
   same shape (105.6 → 103.2): only the changed digits roll, right to left; a new shape (Not given → 40 mg): the old slides up, the new rises */
var RN_HOST=null;
function rnHost(){ if(RN_HOST&&RN_HOST.isConnected) return RN_HOST; RN_HOST=document.createElement('div'); RN_HOST.setAttribute('aria-hidden','true'); RN_HOST.style.cssText='position:fixed;left:0;top:0;width:0;height:0;z-index:2147483000;pointer-events:none'; document.body.appendChild(RN_HOST);
  if(!rnHost.w){ rnHost.w=1; document.addEventListener('scroll',function(){ [].forEach.call(document.querySelectorAll('[data-roll]'),function(e){ if(e._ro) rnEnd(e); }); },true); } return RN_HOST; }
function rnRoll(el,a,b,ca,cb,tries){ if(el._ro) rnEnd(el); var r; try{ var rg=document.createRange(); rg.selectNodeContents(el); r=rg.getBoundingClientRect(); }catch(e){ r=el.getBoundingClientRect(); }
  var H=r.height; if(!H||H>80||!r.width||r.bottom<0||r.top>innerHeight) return; var cs=getComputedStyle(el);
  var hit=document.elementFromPoint(Math.min(innerWidth-1,r.left+r.width/2),r.top+H/2); if(!hit||!(hit===el||el.contains(hit)||hit.contains(el))){   /* covered — usually the charting drawer still closing: roll once it's out of the way */
    if((tries||0)<3){ var cur=rnText(el); setTimeout(function(){ if(el.isConnected&&rnText(el)===cur) rnRoll(el,a,b,ca,cb,(tries||0)+1); },320); } return; }
  var shape=function(s){ return s.replace(/\d/g,'0'); }, same=a.length===b.length&&shape(a)===shape(b)&&/\d/.test(b);
  var ov=document.createElement('div'); ov.className='ts-ro';
  ov.style.cssText='position:fixed;left:'+(r.left-6)+'px;top:'+r.top+'px;width:'+(r.width+12)+'px;height:'+H+'px;overflow:hidden;padding-left:6px;box-sizing:border-box;display:flex;white-space:pre;color:'+(ca||cb)
    +';font:'+cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily+';letter-spacing:'+cs.letterSpacing+';font-variant-numeric:tabular-nums';
  el._roc=cb; el.style.color='transparent'; el._ro=ov; rnHost().appendChild(ov);
  var line='height:'+H+'px;line-height:'+H+'px;display:block;text-align:center', done=0, need=0, fin=function(){ if(++done>=need&&el._ro===ov) rnEnd(el); };
  if(same){ var html=''; for(var i=0;i<b.length;i++){ if(/\d/.test(b[i])&&a[i]!==b[i]) html+='<span class="ro-d" style="display:inline-block;height:'+H+'px;overflow:hidden"><span class="ro-st" style="display:flex;flex-direction:column">'+RN.ST.replace(/<span>/g,'<span style="'+line+'">')+'</span></span>';
      else html+='<span style="'+line+'">'+esc(b[i])+'</span>'; }
    ov.innerHTML=html; var D=ov.querySelectorAll('.ro-d'), n=D.length;
    [].forEach.call(D,function(c,j){ var st=c.firstChild, idx=[].indexOf.call(ov.children,c);
      need++; var an=st.animate([{transform:'translateY(-'+(+a[idx]*H)+'px)'},{transform:'translateY(-'+(+b[idx]*H)+'px)'}],{duration:620,delay:(n-1-j)*30,easing:RL_EASE,fill:'forwards'}); an.onfinish=fin; an.oncancel=fin; }); }
  else { ov.innerHTML='<span class="ro-o" style="position:absolute;left:6px;top:0;'+line+';text-align:left">'+esc(a)+'</span><span class="ro-n" style="'+line+';text-align:left">'+esc(b)+'</span>';
    need=2; var o1=ov.firstChild.animate([{transform:'none',opacity:1},{transform:'translateY(-70%)',opacity:0}],{duration:360,easing:RL_EASE,fill:'forwards'}), o2=ov.lastChild.animate([{transform:'translateY(70%)',opacity:0},{transform:'none',opacity:1}],{duration:440,easing:RL_EASE,fill:'forwards'});
    o1.onfinish=fin; o2.onfinish=fin; o1.oncancel=fin; o2.oncancel=fin; }
  if(ca&&cb&&ca!==cb){ try{ ov.animate([{color:ca},{color:cb}],{duration:500,easing:'ease',fill:'forwards'}); }catch(e){} }
  if(!need) rnEnd(el); }
try{ new MutationObserver(function(M){ for(var i=0;i<M.length;i++){ var t=M[i].target; if(RN_HOST&&(t===RN_HOST||RN_HOST.contains(t))) continue; rnQueue(); return; } })
  .observe(document.documentElement,{subtree:true,childList:true,characterData:true}); }catch(e){}

/* ---------- the grid's rows: open, glide, fold ---------- */
function rlKey(el){ return el.hasAttribute('data-o')?'o:'+el.getAttribute('data-o'):el.hasAttribute('data-band')?'b:'+el.getAttribute('data-band'):''; }
window.tsGridBefore=function(inner){ var past=window.tsViewDk&&tsViewDk()!==dayKey(), id=(typeof CUR!=='undefined'?CUR:'')+'|'+(window.tsViewDk?tsViewDk():'');
  if(RL.sheet!==id||!inner.firstChild){ RL.sheet=id; RL.snap=null; return; }
  var S={}; [].forEach.call(inner.querySelectorAll(':scope > .grow[data-o], :scope > .grow[data-band]'),function(r){ if(r.classList.contains('sec-folded')) return; var k=rlKey(r); if(k) S[k]={top:r.getBoundingClientRect().top,sec:r.getAttribute('data-sec')||''}; });
  RL.snap=past?null:S; };
window.tsGridAfter=function(inner){ var S=RL.snap; RL.snap=null; if(!S||RL.skip) return; var rows=[].slice.call(inner.querySelectorAll(':scope > .grow[data-o], :scope > .grow[data-band]')).filter(function(r){ return !r.classList.contains('sec-folded'); });
  var add=[], moved=[], shift=[];
  rows.forEach(function(r){ var k=rlKey(r), s=S[k]; if(!s){ add.push(r); return; } var dy=s.top-r.getBoundingClientRect().top; if(Math.abs(dy)<1) return;
    if(r.hasAttribute('data-o')&&s.sec!==(r.getAttribute('data-sec')||'')) moved.push({r:r,dy:dy}); else shift.push({r:r,dy:dy}); });
  if(add.length>4||moved.length>3) return;   /* a different view, not one change */
  var rm=rlRM();
  if(add.length&&!moved.length){ add.forEach(function(r){ rlOpen(r,!r.hasAttribute('data-band')); }); return; }
  if(rm){ moved.forEach(function(m){ rnFade(m.r); }); return; }
  shift.concat(moved).forEach(function(m){ var lift=moved.indexOf(m)>-1;
    if(lift){ m.r.style.position='relative'; m.r.style.zIndex='6'; }
    var an=m.r.animate(lift?[{transform:'translateY('+m.dy+'px)',opacity:1},{transform:'translateY('+(m.dy*0.5)+'px) scale(1.006)',opacity:.85,boxShadow:'0 18px 40px rgba(0,0,0,.22)',offset:.5},{transform:'none',opacity:1}]
      :[{transform:'translateY('+m.dy+'px)'},{transform:'none'}],{duration:lift?640:520,easing:RL_EASE});
    if(lift) an.onfinish=an.oncancel=function(){ m.r.style.position=''; m.r.style.zIndex=''; }; });
  add.forEach(function(r){ rlOpen(r,false); }); };
/* a row opens from nothing; a new order glows once in the accent colour */
function rlOpen(r,glow){ if(rlRM()){ rnFade(r); return; } var h=r.offsetHeight; if(!h) return; r.style.clipPath='inset(0)';
  var an=r.animate([{height:'0px',minHeight:'0px',opacity:0},{height:h+'px',minHeight:'0px',opacity:1}],{duration:420,easing:RL_EASE}); an.onfinish=an.oncancel=function(){ r.style.clipPath=''; };
  if(glow){ var tint='color-mix(in srgb,var(--accent) 16%,transparent)', c=r.querySelector('.rl'), hc=r.querySelector('.hcells');
    [c,hc].forEach(function(x){ if(x) x.animate([{boxShadow:'inset 0 0 0 999px '+tint},{boxShadow:'inset 0 0 0 999px '+tint,offset:.35},{boxShadow:'inset 0 0 0 999px transparent'}],{duration:1800,easing:'ease-out'}); }); } }
/* folding: the rows close up under the header (chevron turns with them), then the grid redraws; opening is the reverse */
window.tsFoldMotion=function(k,shut){ var inner=document.getElementById('sheetInner'); if(!inner||rlRM()) return false; var sel=function(){ return [].slice.call(inner.querySelectorAll(':scope > .grow[data-sec="'+k.replace(/"/g,'\\"')+'"]')); };
  var band=inner.querySelector(':scope > .gband[data-band="'+k.replace(/"/g,'\\"')+'"]'), refocus=function(){ var b=inner.querySelector(':scope > .gband[data-band="'+k.replace(/"/g,'\\"')+'"] .gsection'); if(b&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.gband')) b.focus(); };
  if(shut){ var R=sel().filter(function(r){ return !r.classList.contains('sec-folded'); }); if(!R.length) return false; if(band) band.classList.add('folded');
    var left=R.length; R.forEach(function(r){ var h=r.offsetHeight; r.style.clipPath='inset(0)';
      r.animate([{height:h+'px',minHeight:'0px',opacity:1},{height:'0px',minHeight:'0px',opacity:0}],{duration:380,easing:RL_EASE,fill:'forwards'}).onfinish=function(){ if(--left) return; RL.skip=true; try{ buildGrid(); }catch(e){} RL.skip=false;
        R.forEach(function(x){ try{ x.getAnimations().forEach(function(a){ a.cancel(); }); }catch(e){} x.style.clipPath=''; }); refocus(); }; });
    return true; }
  RL.skip=true; try{ buildGrid(); }catch(e){} RL.skip=false; refocus();
  sel().forEach(function(r){ var h=r.offsetHeight; if(!h) return; r.style.clipPath='inset(0)'; var an=r.animate([{height:'0px',minHeight:'0px',opacity:0},{height:h+'px',minHeight:'0px',opacity:1}],{duration:420,easing:RL_EASE}); an.onfinish=an.oncancel=function(){ r.style.clipPath=''; }; });
  var b2=inner.querySelector(':scope > .gband[data-band="'+k.replace(/"/g,'\\"')+'"]'); if(b2){ b2.classList.add('folded'); void b2.offsetWidth; b2.classList.remove('folded'); }
  return true; };

/* ---------- the minute tick: ages and countdowns in the Latest column, without redrawing the grid ---------- */
function rlLatestHTML(o){ var latest='';
  if(o.type==='med') latest=window.tsMedLatest?tsMedLatest(o):''; else if(o.type==='fluid') latest=window.tsInfLatest?tsInfLatest(o):'';
  else if(o.type==='obs'||o.type==='diag') latest=window.tsRowTrend?tsRowTrend(o):''; else latest=window.tsCareLatest?tsCareLatest(o):'';
  return (typeof gridRollMark==='function'?gridRollMark(latest,o.id):latest)||'<span class="rl-none" aria-label="Nothing yet">—</span>'; }
function rlTick(){ if(document.hidden||typeof currentCTab==='undefined'||currentCTab!=='sheet') return; var inner=document.getElementById('sheetInner'); if(!inner) return;
  [].forEach.call(inner.querySelectorAll(':scope > .grow[data-o]'),function(r){ var o=orderById(r.getAttribute('data-o')); if(!o||o.dc) return; var c=r.querySelector('.rl-latest'); if(!c) return;
    var h=rlLatestHTML(o); if(c._rlh===h) return; c._rlh=h; tsMorphHTML(c,h); }); }
setInterval(function(){ try{ rlTick(); }catch(e){} },15000);
/* ═════════ TS CHART — the task drawer, matched to the task (Oct 2026) ═════════
   Selecting a task never charts it. The drawer opens in one of three modes:
     entry   not charted yet → a reading: one value field (Enter charts it) · a care task: "Mark done" · a medication: the order,
             the dose and volume actually given, given-at time, given by → "Record dose"
     omit    "Not done…" → a reason (required) and an optional note; the slot then shows ⊘ instead of the overdue clock
     review  charted or omitted → what was recorded, scheduled time vs the time it was done, who, when it was saved,
             and every earlier version (edits keep the old value in t.hist). Edit / Undo from here, never by accident.
   Saved per slot (base.js markOf): status · value · min (time done) · by · notes · given · vol · reason · hist · at (time saved).
   Past days open in review only (store/days.js). */
var CH_REASONS={
  med:['Held by doctor','NPO','Patient refused or would not take it','Vomited or could not give','Patient off the floor','Other'],
  task:['Patient sleeping — not disturbed','Patient off the floor','Not tolerated','Not needed — doctor’s instruction','Other']};
var chMode=null, chId=null;
/* just charted: the grid plays the completion once (core grid.js reads tsJust); several at once (batch) ripple 70 ms apart */
var CH_JUST={}, chJustT=null;
window.tsJust=function(id){ var j=CH_JUST[id]; if(!j) return null; if(Date.now()-j.t>2600){ delete CH_JUST[id]; return null; } return j; };
window.tsJustCharted=function(ids){ try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){} var now=Date.now();
  (ids||[]).forEach(function(id,i){ var tk=chTask(id), late=tk?nowMin()-tk.sched:0; CH_JUST[id]={t:now,d:Math.min(i,10)*70,od:late>18,od2:late>120}; });   /* od: it was overdue, so the finish starts from the amber tile */
  clearTimeout(chJustT); chJustT=setTimeout(function(){ CH_JUST={}; try{ buildGrid(); }catch(e){} },2800); };
function chTask(id){ return (TASKS||[]).find(function(t){ return t.id===id; })||null; }
function chPast(){ return !!(window.tsViewDk&&tsViewDk()!==dayKey()); }
function chKind(o){ return o.type==='med'?'med':(o.type==='obs'||o.type==='diag')?'reading':'care'; }
/* initials → the person's name (directory lists from the build, plus whoever is signed in) */
function chWho(ini){ if(!ini) return '—'; var me=user(); if(me&&me.initials===ini&&me.name) return me.name+' ('+ini+')';
  var S=window.TS_STAFF||{}, all=[].concat(S.doctors||[],S.techs||[],S.interns||[],S.liaisons||[]), ok=function(n){ return String(n).split(/\s+/).filter(Boolean).map(function(w){ return w[0]; }).join('').toUpperCase(); };
  var hit=all.filter(function(n,i){ return ok(n)===String(ini).toUpperCase()&&all.indexOf(n)===i; }); return hit.length===1?hit[0]+' ('+ini+')':ini; }
function chHM(min){ min=Math.max(0,Math.min(1439,Math.round(min||0))); var h=Math.floor(min/60), m=min%60; return (h<10?'0':'')+h+':'+(m<10?'0':'')+m; }
function chParseHM(v){ var m=/^(\d{1,2}):(\d{2})$/.exec(String(v||'')); return m?(+m[1])*60+(+m[2]):null; }
function chWhen(iso){ try{ var d=new Date(iso); return d.toLocaleDateString([], {month:'short',day:'numeric'})+' · '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return '—'; } }
function chDelta(done,sched){ var d=Math.round(done-sched); if(Math.abs(d)<2) return 'on time'; var a=Math.abs(d), t=a<60?a+' min':Math.floor(a/60)+' h'+(a%60?' '+(a%60)+' min':''); return t+(d>0?' after':' before')+' scheduled'; }
function chMk(s){ var st=MK_STATES[s]||MK_STATES.scheduled; return '<span class="mark '+s+' cd-mk" aria-hidden="true">'+st.glyph+'</span>'; }
function chHead(t,s){ var o=t.order, st=MK_STATES[s]||{};
  var when=s==='completed'||s==='skipped'?'scheduled '+fmtTime(t.sched):(s==='overdue'?'was due '+fmtTime(t.sched):s==='due'?'due '+fmtTime(t.sched):'scheduled '+fmtTime(t.sched));
  return '<div class="cd-state '+s+'">'+chMk(s)+'<span><b>'+esc(st.word||s)+'</b> · '+esc(when)+(t.movedFrom!=null?' <small>(moved from '+esc(fmtTime(t.movedFrom))+')</small>':'')+'</span></div>'; }
function chRow(k,v){ return '<div class="drow"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>'; }
function chLast(o){ try{ var R=vReadings(o); if(!R.length) return ''; var r=R[R.length-1]; return '<div class="cd-last">Last reading <b>'+esc(r.v)+(o.unit?' '+esc(o.unit):'')+'</b> · '+esc(chWhen(new Date(r.at).toISOString()))+'</div>'; }catch(e){ return ''; } }
function chBy(t){ return '<select id="cd-by" aria-label="Charted by" onchange="tsCdWhenSync()">'+STAFF.map(function(x){ return '<option'+((t.by||STAFF[0])===x?' selected':'')+'>'+esc(x)+'</option>'; }).join('')+'</select>'; }

/* ---------- entry: chart it ---------- */
function chEntry(t,edit){ var o=t.order, k=chKind(o), s=deriveStatus(t), nm=Math.round(nowMin()), at=edit&&t.completedMin!=null?t.completedMin:nm, h=edit?'':chHead(t,s);
  if(edit) h+='<div class="cd-editing">Editing the entry from '+esc(fmtTime(t.completedMin))+' · the earlier version is kept in its history</div>';
  if(window.tsInsBlock) h+=tsInsBlock(o);   /* the order's instructions, always at the top (store/rowlook.js) */
  if(k==='med'){ var d=medDose(o); if(window.tsCdExtra) h+=tsCdExtra(t);
    h+='<div class="cd-order"><div class="cd-order-l">Ordered</div><div class="cd-order-v"><b>'+esc(d.mg)+'</b>'+(o.conc?' · '+esc(d.volume):'')+' · '+esc(o.route||'')+' · '+esc(o.freq||'')+'</div>'+(o.conc_label?'<div class="cd-order-s">'+esc(o.conc_label)+'</div>':'')+'</div>'
      +'<div class="field-2"><div class="field"><label for="cd-dose">Dose given</label><input id="cd-dose" value="'+esc(edit&&t.given?t.given:d.mg)+'" autocomplete="off"></div>'
      +'<div class="field"><label for="cd-vol">Volume given</label><input id="cd-vol" value="'+esc(edit&&t.vol?t.vol:(o.conc?d.volume:''))+'" placeholder="—" autocomplete="off"></div></div>'; }
  else if(k==='reading'){ var opts=(typeof V_OPTS!=='undefined')&&V_OPTS[String(o.name).toLowerCase()];
    var wtx=/^weight$/i.test(String(o.name||'').trim())&&window.tsLbField, inp='<input id="cd-value" value="'+esc(edit?t.value||'':'')+'" placeholder="'+(o.name==='Temperature'?'102.1':opts?'Choose or type':'Value')+'"'+(opts?'':' inputmode="'+(o.unit&&!wtx?'decimal':'text')+'"')+(wtx?' oninput="tsLbHint(\'cd-value\')"':'')+' autocomplete="off" onkeydown="if(event.key===\'Enter\'){event.preventDefault();tsChartSave();}">';
    h+=chLast(o)+'<div class="field cd-big"><label for="cd-value">Reading'+(o.unit&&!wtx?' ('+esc(o.unit)+')':'')+'</label>'+(wtx?tsLbField('cd-value',inp):inp)+(window.tsInsThreshold?tsInsThreshold(o):'')+'</div>'
      +(opts?'<div class="cd-opts" role="group" aria-label="Common values">'+opts.map(function(v){ return '<button type="button" class="cd-opt" onclick="tsChOpt(this)">'+esc(v)+'</button>'; }).join('')+'</div>':''); }
  h+='<div class="cd-when"><button type="button" class="cd-when-b" id="cdWhenB" onclick="tsCdWhen()" aria-expanded="false" aria-controls="cdWhenF"><span id="cdWhenT">'+chWhenLine(k,edit?at:null,t.by||STAFF[0])+'</span><span class="cd-when-c">Change</span></button>'   /* Oct 2026: "Now · DG" — tap to change the time or who */
    +'<div class="field-2 cd-when-f" id="cdWhenF" hidden><div class="field"><label for="cd-at">'+(k==='med'?'Given at':'Done at')+'</label><input id="cd-at" type="time" value="'+chHM(at)+'" max="'+chHM(nm)+'" oninput="tsCdWhenSync()"></div>'
    +'<div class="field"><label for="cd-by">'+(k==='med'?'Given by':'Charted by')+'</label>'+chBy(t)+'</div></div></div>'
    +(o.note_req?'<div class="field cd-need-note"><label for="cd-notes">Note <span class="cd-req-l">required</span></label><textarea id="cd-notes" rows="2" aria-required="true" placeholder="'+esc(o.note_prompt||'What did you find or do?')+'">'+esc(edit?t.notes||'':'')+'</textarea></div>'
      :'<div class="field"><label for="cd-notes">Note <span class="cd-opt-l">optional</span></label><textarea id="cd-notes" rows="2" placeholder="Add a note…">'+esc(edit?t.notes||'':'')+'</textarea></div>');
  return h; }
/* the drawer's one-line time and who: "Now · DG", or the time charted when editing */
function chWhenLine(k,min,by){ return (k==='med'?'Given ':'Done ')+'<b>'+(min==null?'now':esc(fmtTime(min)))+'</b> · '+esc(by||''); }
window.tsCdWhen=function(){ var f=document.getElementById('cdWhenF'), b=document.getElementById('cdWhenB'); if(!f) return; f.hidden=!f.hidden; if(b){ b.setAttribute('aria-expanded',String(!f.hidden)); b.classList.toggle('open',!f.hidden); }
  if(!f.hidden){ var i=document.getElementById('cd-at'); if(i) setTimeout(function(){ i.focus(); },30); } };
window.tsCdWhenSync=function(){ var T=document.getElementById('cdWhenT'), at=document.getElementById('cd-at'), by=document.getElementById('cd-by'); if(!T||!at) return;
  var v=chParseHM(at.value), nm=Math.round(nowMin()), med=/^Given/.test(T.textContent); T.innerHTML=chWhenLine(med?'med':'',v==null||v===nm?null:v,by?by.value:''); };
function chEntryFoot(t,edit){ var k=chKind(t.order);
  if(edit) return '<button class="btn ghost" onclick="tsChOpen(\''+esc(t.id)+'\',\'review\')">Cancel</button><button class="btn primary" onclick="tsChartSave()">Save changes</button>';
  var go=k==='med'?'Record dose':k==='reading'?'Chart reading':'Mark done';
  return '<button class="btn ghost" onclick="tsChOpen(\''+esc(t.id)+'\',\'omit\')">'+(k==='med'?'Not given…':'Not done…')+'</button><button class="btn primary" id="cdGo" onclick="tsChartSave()">'+MK_CHECK+go+'</button>'; }

/* ---------- omit: record why it wasn't done ---------- */
function chOmit(t){ var k=chKind(t.order), L=CH_REASONS[k==='med'?'med':'task'], cur=t.reason||'';
  return chHead(t,deriveStatus(t))+'<p class="cd-lead">'+(k==='med'?'Record why this dose wasn’t given.':'Record why this wasn’t done.')+' The slot will show it as omitted, not overdue.</p>'
    +'<div class="cd-reasons" role="radiogroup" aria-label="Reason">'+L.map(function(r){ return '<label class="cd-reason"><input type="radio" name="cdWhy" value="'+esc(r)+'"'+(cur===r?' checked':'')+' onchange="tsChWhy()"><span>'+esc(r)+'</span></label>'; }).join('')+'</div>'
    +'<div class="field"><label for="cd-notes">Note <span class="cd-opt-l" id="cdNoteReq">optional</span></label><textarea id="cd-notes" rows="2" placeholder="Details, and who decided" oninput="tsChWhy()">'+esc(t.notes||'')+'</textarea></div>'
    +'<div class="field"><label for="cd-by">Recorded by</label>'+chBy(t)+'</div>'; }
function chOmitFoot(t){ return '<button class="btn ghost" onclick="tsChOpen(\''+esc(t.id)+'\',\''+(t.status?'review':'entry')+'\')">Back</button><button class="btn primary" id="cdGo" onclick="tsChOmitSave()" disabled>Record as '+(chKind(t.order)==='med'?'not given':'not done')+'</button>'; }
window.tsChWhy=function(){ var r=document.querySelector('#cd-body input[name=cdWhy]:checked'), n=(document.getElementById('cd-notes')||{}).value||'', b=document.getElementById('cdGo'), req=document.getElementById('cdNoteReq');
  var other=r&&r.value==='Other'; if(req) req.textContent=other?'required':'optional'; if(b) b.disabled=!r||(other&&!n.trim()); };

/* ---------- review: what was recorded, by whom, when — and its history ---------- */
function chReview(t){ var o=t.order, k=chKind(o), s=deriveStatus(t), h=chHead(t,s), d=k==='med'?medDose(o):null;
  if(s==='completed'){
    var big=k==='med'?esc(t.given||d.mg)+(t.vol?' · '+esc(t.vol):'')+' '+esc(o.route||''):k==='reading'?(t.value?esc(t.value)+(o.unit?' <small>'+esc(o.unit)+'</small>':''):'<span class="cd-none">No value recorded</span>'):'Done';
    h+='<div class="cd-rec"><div class="cd-rec-l">'+(k==='med'?'Given':k==='reading'?'Recorded':'Completed')+'</div><div class="cd-rec-v">'+big+'</div></div>';
    if(k==='med'&&t.given&&t.given!==d.mg) h+='<div class="cd-diff">Ordered '+esc(d.mg)+' — given '+esc(t.given)+'</div>';
    h+='<div class="cd-rows">'+chRow('Scheduled',esc(fmtTime(t.sched)))+chRow(k==='med'?'Given at':'Done at',t.completedMin!=null?esc(fmtTime(t.completedMin))+' <small>'+esc(chDelta(t.completedMin,t.sched))+'</small>':'—')
      +chRow(k==='med'?'Given by':'Charted by',esc(chWho(t.by)))+(t.at?chRow('Saved',esc(chWhen(t.at))):'')+'</div>'; }
  else { h+='<div class="cd-rec omit"><div class="cd-rec-l">'+(k==='med'?'Not given':'Not done')+'</div><div class="cd-rec-v">'+esc(t.reason||'No reason recorded')+'</div></div>'
      +'<div class="cd-rows">'+chRow('Scheduled',esc(fmtTime(t.sched)))+chRow('Recorded by',esc(chWho(t.by)))+(t.completedMin!=null?chRow('Recorded at',esc(fmtTime(t.completedMin))):'')+(t.at?chRow('Saved',esc(chWhen(t.at))):'')+'</div>'; }
  if(t.notes) h+='<div class="cd-note"><div class="cd-rec-l">Note</div><p>'+esc(t.notes)+'</p></div>';
  var H=(t.hist||[]).slice().reverse();
  h+='<div class="cd-hist"><div class="cd-rec-l">History</div>'+(H.length?'':'<p class="cd-none">No changes since it was recorded.</p>')+H.map(function(v){
    var what=v.status==='skipped'?'Not done · '+esc(v.reason||'—'):(v.given?esc(v.given)+(v.vol?' · '+esc(v.vol):''):v.value?esc(v.value):'Done');
    return '<div class="cd-hrow"><b>'+what+'</b><span>Charted '+(v.min!=null?esc(fmtTime(v.min)):'—')+' by '+esc(v.by||'—')+' · changed '+esc(v.edit_at?chWhen(v.edit_at):'—')+' by '+esc(v.edit_by||'—')+'</span></div>'; }).join('')+'</div>';
  return h; }
function chReviewFoot(t){ if(chPast()) return '<div class="cd-viewonly">View only — this is a past day</div>';
  if(!canChart()) return '<div class="cd-viewonly">Your role has view-only access to this task</div>';
  return '<button class="btn ghost" onclick="tsChUndo()">'+(t.status==='completed'?'Undo charting':'Remove omission')+'</button><button class="btn primary" onclick="tsChOpen(\''+esc(t.id)+'\',\''+(t.status==='completed'?'edit':'omit')+'\')">Edit</button>'; }

/* ---------- open ---------- */
window.tsChOpen=function(id,mode){ var t=chTask(id); if(!t) return; var o=t.order; chId=id; activeTaskId=id;
  if(!mode) mode=t.status?'review':'entry'; if((chPast()||!canChart())&&mode!=='review') mode=t.status?'review':'readonly'; chMode=mode;
  var dr=document.getElementById('completionDrawer'); if(dr) dr.dataset.mode=mode;
  $('#cd-title').textContent=o.name; $('#cd-sub').innerHTML=esc(o.section)+(o.type==='med'?' · '+esc(medDose(o).mg)+' '+esc(o.route||''):'')+(o.freq?' · '+esc(o.freq):'');
  var body='', foot='';
  if(mode==='entry'||mode==='edit'){ body=chEntry(t,mode==='edit'); foot=chEntryFoot(t,mode==='edit'); }
  else if(mode==='omit'){ body=chOmit(t); foot=chOmitFoot(t); }
  else if(mode==='readonly'){ body=chHead(t,deriveStatus(t))+'<p class="cd-lead">Not charted.</p>'; foot='<div class="cd-viewonly">'+(chPast()?'View only — this is a past day':'Your role has view-only access to this task')+'</div>'; }
  else { body=chReview(t); foot=chReviewFoot(t); }
  $('#cd-body').innerHTML=body; $('#cd-foot').innerHTML=foot; openDrawer('completionDrawer'); if(mode==='omit') tsChWhy();
  setTimeout(function(){ var f=document.getElementById(mode==='omit'?'':'cd-value'); if(f&&mode!=='review') try{ f.focus({preventScroll:true}); f.select(); }catch(e){} },140); };
on('completion.open',function(id){ if(!chTask(id)) return false; tsChOpen(id); return true; },-5);
window.tsChOpt=function(b){ var i=document.getElementById('cd-value'); if(!i) return; i.value=b.textContent; [].forEach.call(document.querySelectorAll('#cd-body .cd-opt'),function(x){ x.classList.toggle('on',x===b); }); i.focus(); };

/* ---------- save ---------- */
function chSnap(t){ return {status:t.status,value:t.value||null,given:t.given||null,vol:t.vol||null,reason:t.reason||null,notes:t.notes||null,min:t.completedMin!=null?Math.round(t.completedMin):null,by:t.by||null,edit_at:new Date().toISOString(),edit_by:user().initials||null}; }
function chKeep(t){ if(!t.status) return; var h=(t.hist||[]).slice(); h.push(chSnap(t)); t.hist=h.slice(-10); }
function chAt(){ var nm=Math.round(nowMin()), v=chParseHM((document.getElementById('cd-at')||{}).value); if(v==null) return nm; if(v>nm){ toast('That time hasn’t happened yet — using now'); return nm; } return v; }
function chDone(t,msg){ closeDrawers(); try{ buildGrid(); }catch(e){} try{ sync(); }catch(e){} toast(msg); }
window.tsChartSave=function(){ var t=chTask(chId||activeTaskId); if(!t) return; if(chPast()){ toast('View only — go back to today to chart'); return; } if(!canChart()){ toast('Your role can’t chart'); return; }
  var o=t.order, k=chKind(o), edit=t.status==='completed', val=(document.getElementById('cd-value')||{}).value, me=user();
  val=val!=null?String(val).trim():null;
  if(k==='reading'&&!val&&!edit){ var i=document.getElementById('cd-value'); if(i){ i.focus(); i.classList.add('cd-need'); } toast('Enter the reading, or choose “Not done…”'); return; }
  if(o.note_req&&!String((document.getElementById('cd-notes')||{}).value||'').trim()){ var nn=document.getElementById('cd-notes'); if(nn){ nn.focus(); nn.classList.add('cd-need'); } toast((o.note_prompt?esc(o.note_prompt):'This order needs a note')+' — add it to chart'); return; }
  if(val&&window.tsLbKg&&document.querySelector('[data-lb="cd-value"]')){ var kgv=tsLbKg('cd-value',val); if(kgv!==val) val=kgv; }
  if(edit) chKeep(t);
  t.status='completed'; t.completedMin=chAt(); t.by=(document.getElementById('cd-by')||{}).value||me.initials||t.by; t.notes=((document.getElementById('cd-notes')||{}).value||'').trim()||null; t.reason=null;
  if(k==='reading') t.value=val||null;
  if(k==='med'){ t.given=((document.getElementById('cd-dose')||{}).value||'').trim()||null; t.vol=((document.getElementById('cd-vol')||{}).value||'').trim()||null; }
  var what=k==='med'?(t.given||medDose(o).mg)+(t.vol?' · '+t.vol:'')+' at '+fmtTime(t.completedMin):k==='reading'?(t.value||''):'';
  logEvent(o.type==='obs'?'vital':o.type,'<b>'+esc(o.name)+'</b> '+(what?'— '+esc(what)+' ':'')+(edit?'corrected':k==='med'?'given':'completed'),t.by);
  if(!edit) tsJustCharted([t.id]);
  chDone(t,edit?'Changes saved · earlier version kept':o.name+(k==='med'?' recorded':' charted')); emit('task.charted',t); };
window.tsChOmitSave=function(){ var t=chTask(chId||activeTaskId); if(!t) return; var r=document.querySelector('#cd-body input[name=cdWhy]:checked'); if(!r) return;
  var n=((document.getElementById('cd-notes')||{}).value||'').trim(); if(r.value==='Other'&&!n){ toast('Add a note for “Other”'); return; }
  if(t.status) chKeep(t); var me=user();
  t.status='skipped'; t.reason=r.value; t.notes=n||null; t.by=(document.getElementById('cd-by')||{}).value||me.initials; t.completedMin=Math.round(nowMin()); t.value=null; t.given=null; t.vol=null;
  logEvent('doctor','<b>'+esc(t.order.name)+'</b> '+esc(fmtTime(t.sched))+' not '+(chKind(t.order)==='med'?'given':'done')+' — '+esc(r.value)+(n?' ('+esc(n)+')':''),t.by);
  chDone(t,t.order.name+' recorded as not '+(chKind(t.order)==='med'?'given':'done')); };
window.tsChUndo=function(){ var t=chTask(chId||activeTaskId); if(!t||!t.status) return; var keep=chSnap(t), prevHist=(t.hist||[]).slice(), o=t.order, me=user();
  chKeep(t); var hist=t.hist; t.status=null; t.completedMin=null; t.value=null; t.given=null; t.vol=null; t.reason=null; t.notes=null; t.by=null; t.hist=hist;
  logEvent('doctor','<b>'+esc(o.name)+'</b> '+esc(fmtTime(t.sched))+' charting undone',me.initials);
  closeDrawers(); try{ buildGrid(); }catch(e){} try{ sync(); }catch(e){}
  undoToast(esc(o.name)+' '+esc(fmtTime(t.sched))+' cleared',function(){ t.status=keep.status; t.completedMin=keep.min; t.value=keep.value; t.given=keep.given; t.vol=keep.vol; t.reason=keep.reason; t.notes=keep.notes; t.by=keep.by; t.hist=prevHist.length?prevHist:null;
    logEvent('doctor','<b>'+esc(o.name)+'</b> '+esc(fmtTime(t.sched))+' restored',me.initials); try{ buildGrid(); }catch(e){} try{ sync(); }catch(e){} }); };
/* the core names, so every caller (tests, voice, older modules) goes through the same save */
window.completeTask=function(){ var t=chTask(activeTaskId); if(t){ chId=t.id; if(!t.status&&chKind(t.order)==='reading'&&!document.getElementById('cd-value')) tsChOpen(t.id,'entry'); } return tsChartSave(); };
window.saveTask=window.completeTask;
window.undoTask=function(){ chId=activeTaskId; tsChUndo(); };
window.setTaskStatus=function(st){ if(st==='delayed'){ toast('Drag the task to another hour to move it'); return; } var t=chTask(activeTaskId); if(t) tsChOpen(t.id,'omit'); };

/* the Latest column on a care row: when it was last done today */
window.tsCareLatest=function(o){ var L=(TASKS||[]).filter(function(t){ return t.orderId===o.id&&t.status==='completed'&&t.completedMin!=null; }).sort(function(a,b){ return b.completedMin-a.completedMin; })[0];
  if(!L){ var nd=window.tsNextDue?tsNextDue(o):null; if(!nd) return '';   /* nothing done yet today: what's next (store/rowlook.js) */
    return '<span class="rl-trend rl-care none" title="'+esc(o.name+' — not done today · '+nd.txt.toLowerCase())+'"><span class="rt-v"><b>Not done today</b></span><small class="rl-due '+nd.cls+'">'+esc(nd.txt)+'</small></span>'; }
  var age=Math.max(0,Math.round(nowMin()-L.completedMin)), txt=age<2?'just now':age<60?age+' min ago':Math.floor(age/60)+' h ago';
  return '<span class="rl-trend rl-care" title="'+esc(o.name+' — done '+fmtTime(L.completedMin)+(L.by?' by '+L.by:''))+'"><span class="rt-v"><b>Done</b></span><small>'+txt+'</small></span>'; };
/* ═════════ TS PROBLEMS — the patient's problem list, Reminders-style ═════════
   Stored on the sheet as patient.problem_list = [{id, text, added_at, added_by, resolved_at?, resolved_by?}].
   Sheets that don't have one yet start from what Flow sent (patient.problems or the presenting reason); the first edit saves the list.
   Doctors (and admin) add, edit, resolve and remove; everyone else reads. Resolving keeps the problem (tap the circle; it moves to
   Resolved and can be restored); the × removes one entered by mistake, with Undo. Every change is in the audit. */
var PROB_COMMON=['Vomiting','Diarrhea','Inappetence','Lethargy','Pain','Dehydration','Hypovolemia','Anemia','Hemoabdomen','Ruptured splenic mass',
  'GDV','Pancreatitis','Acute kidney injury','Azotemia','DKA','Hypoglycemia','Hyperkalemia','Seizures','Respiratory distress','Pneumonia','Pleural effusion',
  'Congestive heart failure','Arrhythmia','Urethral obstruction','Trauma','Fracture','Toxin ingestion','Foreign body','Hyperthermia','Sepsis','Parvovirus','Post-operative care'];
var probShowResolved=false;
function probList(d){ var p=(d&&d.patient)||{};
  if(Array.isArray(p.problem_list)) return p.problem_list.filter(function(x){ return x&&x.text; });
  var seed=(p.problems&&p.problems.length?p.problems:(p.reason?[p.reason]:[]));
  return seed.map(function(t,i){ return {id:'seed'+i,text:String(t),seed:true}; }); }
function probActive(d){ return probList(d).filter(function(x){ return !x.resolved_at; }); }
window.tsProblemTexts=function(d){ return probActive(d||curDoc).map(function(x){ return x.text; }); };
on('visit',function(v,d){ v.problems=probActive(d).map(function(x){ return x.text; }); });
function probCan(){ return canOrderTS()&&!(window.tsViewDk&&tsViewDk()!==dayKey()); }
function probSave(list,desc){ if(!CUR||!curDoc) return; var me=user(), now=new Date().toISOString();
  var clean=list.map(function(x){ var o={id:x.seed?('p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)):x.id,text:x.text,added_at:x.added_at||now,added_by:x.added_by||me.name||me.initials};
    if(x.resolved_at){ o.resolved_at=x.resolved_at; o.resolved_by=x.resolved_by||null; } return o; });
  curDoc.patient=curDoc.patient||{}; curDoc.patient.problem_list=clean; if(curMain){ curMain.patient=curMain.patient||{}; curMain.patient.problem_list=clean; }
  var s=SHEETS.find(function(x){ return x._id===CUR; }); if(s){ s.patient=s.patient||{}; s.patient.problem_list=clean; }
  VISIT.problems=clean.filter(function(x){ return !x.resolved_at; }).map(function(x){ return x.text; });
  tsCommit(CUR,{'patient.problem_list':clean,updated_at:now,updated_by:me.initials,audit:U([{at:now,type:'doctor',desc:desc,who:me.initials,uid:me.uid}])}).catch(function(){});
  probPaint(); return clean; }

/* ---------- the panel ---------- */
var PI_X='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
var PI_PLUS='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5v10M5 10h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function probRow(x,i,can){ var res=!!x.resolved_at;
  return '<li class="pl-row'+(res?' res':'')+'" data-id="'+esc(x.id)+'">'
    +(can?'<button type="button" class="pl-ck" onclick="tsProbToggle(\''+esc(x.id)+'\',this)" aria-label="'+(res?'Restore ':'Resolve ')+esc(x.text)+'" title="'+(res?'Restore':'Mark resolved')+'"><i></i></button>':'<span class="pl-num">'+(i+1)+'</span>')
    +'<span class="pl-txt"'+(can&&!res?' onclick="tsProbEdit(\''+esc(x.id)+'\',this)" title="Tap to edit"':'')+'><span class="pl-t">'+esc(x.text)+'</span>'+(res&&x.resolved_at?'<small>Resolved '+esc(fmtWhen(x.resolved_at).replace('Today · ',''))+'</small>':'')+'</span>'
    +(can?'<button type="button" class="pl-x" onclick="tsProbRemove(\''+esc(x.id)+'\')" aria-label="Remove '+esc(x.text)+'" title="Remove (entered by mistake)">'+PI_X+'</button>':'')+'</li>'; }
function probInner(){ var L=probList(curDoc), act=L.filter(function(x){ return !x.resolved_at; }), res=L.filter(function(x){ return x.resolved_at; }), can=probCan();
  var others={}; (SHEETS||[]).forEach(function(s){ probActive(s).forEach(function(x){ others[x.text]=1; }); });
  var sugg=PROB_COMMON.concat(Object.keys(others)).filter(function(t,i,a){ return a.indexOf(t)===i&&!act.some(function(x){ return x.text.toLowerCase()===t.toLowerCase(); }); });
  return '<h4>Problem list'+(act.length?'<span class="pl-count">'+act.length+'</span>':'')+'</h4>'
    +'<ul class="pl">'+(act.length?act.map(function(x,i){ return probRow(x,i,can); }).join(''):'<li class="pl-empty">'+(can?'No problems listed yet':'No problems listed')+'</li>')+'</ul>'
    +(can?'<form class="pl-add" onsubmit="event.preventDefault();tsProbAdd(this)"><span class="pl-plus">'+PI_PLUS+'</span><input name="p" list="plSugg" placeholder="Add a problem" autocomplete="off" aria-label="Add a problem" onkeydown="if(event.key===\'Escape\'){this.value=\'\';this.blur();}"><datalist id="plSugg">'+sugg.map(function(t){ return '<option value="'+esc(t)+'">'; }).join('')+'</datalist><button type="submit" class="pl-go" aria-label="Add">Add</button></form>':'')
    +(res.length?'<button type="button" class="pl-restog" onclick="tsProbShowResolved()">'+(probShowResolved?'Hide':'Show')+' resolved · '+res.length+'</button>'+(probShowResolved?'<ul class="pl pl-resolved">'+res.map(function(x,i){ return probRow(x,i,can); }).join('')+'</ul>':''):''); }
window.tsProblemsPanel=function(){ return '<div class="panel pl-panel" id="tsProblems">'+probInner()+'</div>'; };
function probPaint(){ var el=document.getElementById('tsProblems'); if(!el) return; var a=document.activeElement;
  if(a&&el.contains(a)&&a.tagName==='INPUT'&&a.value) return;   /* never wipe what someone is typing */
  var h=probInner(); if(el.innerHTML!==h) el.innerHTML=h; }
on('header.refresh',probPaint);

/* ---------- actions ---------- */
window.tsProbAdd=function(form){ if(!probCan()) return; var inp=form.querySelector('input'), t=(inp.value||'').trim().replace(/\s+/g,' '); if(!t) { inp.focus(); return; }
  var L=probList(curDoc); if(L.some(function(x){ return !x.resolved_at&&x.text.toLowerCase()===t.toLowerCase(); })){ toast(esc(t)+' is already on the list'); inp.select(); return; }
  var me=user(), now=new Date().toISOString(); L=L.concat([{id:'p'+Date.now().toString(36),text:t,added_at:now,added_by:me.name||me.initials}]);
  inp.value=''; probSave(L,'Problem added — <b>'+esc(t)+'</b>');
  var el=document.getElementById('tsProblems'), ni=el&&el.querySelector('.pl-add input'); if(ni) ni.focus();
  var rows=el&&el.querySelectorAll('.pl:not(.pl-resolved) .pl-row'), last=rows&&rows[rows.length-1]; if(last){ last.classList.add('pl-new'); setTimeout(function(){ last.classList.remove('pl-new'); },700); } };
window.tsProbToggle=function(id,btn){ if(!probCan()) return; var L=probList(curDoc), x=L.find(function(p){ return p.id===id; }); if(!x) return; var me=user(), now=new Date().toISOString();
  var go=function(){ L=L.map(function(p){ if(p.id!==id) return p; var c=Object.assign({},p); if(c.resolved_at){ delete c.resolved_at; delete c.resolved_by; } else { c.resolved_at=now; c.resolved_by=me.name||me.initials; } return c; });
    probSave(L,(x.resolved_at?'Problem restored — <b>':'Problem resolved — <b>')+esc(x.text)+'</b>'); };
  var row=btn&&btn.closest('.pl-row'); if(row&&!x.resolved_at&&!matchMedia('(prefers-reduced-motion: reduce)').matches){ row.classList.add('pl-done'); setTimeout(go,420); } else go(); };
window.tsProbRemove=function(id){ if(!probCan()) return; var L=probList(curDoc), x=L.find(function(p){ return p.id===id; }); if(!x) return; var before=L.slice();
  var row=document.querySelector('#tsProblems .pl-row[data-id="'+id+'"]'), go=function(){ probSave(L.filter(function(p){ return p.id!==id; }),'Problem removed — <b>'+esc(x.text)+'</b>');
    undoToast(esc(x.text)+' removed',function(){ probSave(before,'Problem restored — <b>'+esc(x.text)+'</b>'); }); };
  if(row){ row.classList.add('pl-leaving'); setTimeout(go,260); } else go(); };
window.tsProbEdit=function(id,span){ if(!probCan()) return; var x=probList(curDoc).find(function(p){ return p.id===id; }); if(!x||span.querySelector('input')) return;
  span.innerHTML='<input class="pl-edit" value="'+esc(x.text)+'" aria-label="Edit problem">'; var inp=span.querySelector('input'); inp.focus(); inp.select();
  var done=false, finish=function(save){ if(done) return; done=true; var t=(inp.value||'').trim().replace(/\s+/g,' '); try{ inp.blur(); }catch(e){}
    if(save&&t&&t!==x.text) probSave(probList(curDoc).map(function(p){ return p.id===id?Object.assign({},p,{text:t}):p; }),'Problem changed — <b>'+esc(x.text)+'</b> → <b>'+esc(t)+'</b>'); else probPaint(); };
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); finish(true); } else if(e.key==='Escape'){ finish(false); } });
  inp.addEventListener('blur',function(){ finish(true); }); };
window.tsProbShowResolved=function(){ probShowResolved=!probShowResolved; probPaint(); };
/* ═════════ TS PATIENT INFO — the sheet sidebar, built from the sheet, nothing typed in by hand ═════════
   Estimate, the Vitals card (weight trend, six vitals, BSA / RER), patient and client details, problem list.
   Oct 2026: the Medical Rounds tab left (rounds live in Flow's Rounds app) and so did the Visit card — doctor → next,
   tech, location and service are in the header, where they can be changed. */
/* newest charted value of an order matching rx (base.js uses it for the visit's latest vitals) */
function rdLatest(d,rx){ var ids={}; Object.keys(d.orders||{}).forEach(function(k){ var o=d.orders[k]; if(o&&rx.test(String(o.name||'').trim())) ids[o.id||k]=1; });
  var best=null; Object.keys(d.marks||{}).forEach(function(k){ var m=d.marks[k]; if(!m||m.status!=='completed'||m.value==null||m.value===''||!ids[m.orderId]) return;
    var t=k.slice(0,8)+('0000'+Math.round(m.min!=null?m.min:(m.sched||0))).slice(-4); if(!best||t>best.t) best={t:t,v:String(m.value)}; }); return best&&best.v; }
/* ---------- patient info panel ---------- */
function weightTrendHTML(){ var R=[]; try{ R=readings(curDoc,/^weight$/i).map(function(r){ return {v:parseFloat((String(r.v).match(/\d+(\.\d+)?/)||[])[0]),at:r.at}; }).filter(function(r){ return r.v>0; }); }catch(e){}
  if(R.length<2) return ''; R=R.slice(-6); var n=R.length, x0=14, x1=286, top=20, bot=46, base=56, vals=R.map(function(p){ return p.v; }), lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals);
  var xs=R.map(function(_,i){ return x0+i*(x1-x0)/(n-1); }), ys=R.map(function(p){ return hi===lo?(top+bot)/2:top+(1-(p.v-lo)/(hi-lo))*(bot-top); });
  var pts=xs.map(function(x,i){ return x.toFixed(1)+' '+ys[i].toFixed(1); }), lbl=function(at){ var d=new Date(at); return (d.getMonth()+1)+'/'+d.getDate(); };
  return '<div class="weight-trend"><div class="trend-header"><span>Weight trend</span><strong>'+esc(vals[n-1])+' kg</strong></div><svg viewBox="0 0 300 64" preserveAspectRatio="none">'
    +'<path class="trend-fill" d="M'+pts.join(' L')+' L'+x1+' '+base+' L'+x0+' '+base+' Z"/><path class="trend-line" d="M'+pts.join(' L')+'"/>'
    +xs.map(function(x,i){ return '<circle class="trend-dot'+(i===n-1?' current':'')+'" cx="'+x.toFixed(1)+'" cy="'+ys[i].toFixed(1)+'" r="'+(i===n-1?4:3)+'"><title>'+esc(lbl(R[i].at))+': '+R[i].v+' kg</title></circle>'; }).join('')
    +xs.map(function(x,i){ return '<text x="'+x.toFixed(1)+'" y="63" text-anchor="'+(i===0?'start':i===n-1?'end':'middle')+'">'+esc(lbl(R[i].at))+'</text>'; }).join('')+'</svg></div>'; }
/* the weight tile: dosing weight, a sparkline of the charted weights and the change since the first (Oct 2026) */
function wtTileHTML(kg){ var R=[]; try{ R=readings(curDoc,/^weight$/i).map(function(r){ return {v:parseFloat((String(r.v).match(/\d+(\.\d+)?/)||[])[0]),at:r.at}; }).filter(function(r){ return r.v>0; }); }catch(e){}
  var spark='', d='';
  if(R.length>=2){ R=R.slice(-8); var vals=R.map(function(r){ return r.v; }), lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals), n=R.length, W=120, H=28;
    var pts=R.map(function(r,i){ return [(4+i*(W-8)/(n-1)).toFixed(1),(hi===lo?H/2:4+(1-(r.v-lo)/(hi-lo))*(H-8)).toFixed(1)]; });
    spark='<svg class="wt-spark" viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><path class="wt-fill" d="M'+pts.map(function(p){ return p.join(' '); }).join(' L')+' L'+pts[n-1][0]+' '+H+' L'+pts[0][0]+' '+H+' Z"/><polyline points="'+pts.map(function(p){ return p.join(','); }).join(' ')+'"/>'
      +'<circle cx="'+pts[n-1][0]+'" cy="'+pts[n-1][1]+'" r="3"/></svg>';
    var ch=Math.round((vals[n-1]-vals[0])*10)/10, f=new Date(R[0].at); d='<span class="wt-d">'+(ch===0?'No change':(ch>0?'+':'−')+Math.abs(ch)+' kg')+' since '+(f.getMonth()+1)+'/'+f.getDate()+'</span>'; }
  var last=R.length?R[R.length-1].v:null;
  return '<div class="vit vit-wt" title="'+esc(R.map(function(r){ var x=new Date(r.at); return (x.getMonth()+1)+'/'+x.getDate()+' '+r.v+' kg'; }).join(' · '))+'"><div class="wt-l"><div class="k">Weight</div><div class="v">'+(kg?kg+' kg':'—')+'</div>'
    +(last!=null&&kg&&Math.abs(last-kg)>=0.05?'<small>Charted '+esc(last)+' kg</small>':d?d:'')+'</div>'+(spark?'<div class="wt-r">'+spark+(last!=null&&kg&&Math.abs(last-kg)>=0.05?d:'')+'</div>':'')+'</div>'; }
function vitalsCardInner(){ try{ vLive(); }catch(e){} var kg=Number(VISIT.weight)||0, sp=spKey()||'dog', val=function(x,u){ return x&&x!=='—'?esc(x)+(u?' '+u:''):'—'; };
  /* six vitals, three even rows (Oct 2026: pain score left the card — it is on the sheet), each with how old its reading is */
  var age=function(rx,has){ if(!has) return ''; try{ var R=readings(curDoc,rx), l=R[R.length-1]; return l&&l.at?ago(l.at):''; }catch(e){ return ''; } }, has=function(x){ return x&&x!=='—'; };
  var vit=[['Temp',val(VISIT.temp,'°F'),age(/^temperature$/i,has(VISIT.temp))],['Heart rate',val(VISIT.hr,'bpm'),age(/^heart rate$/i,has(VISIT.hr))],['Resp rate',val(VISIT.rr,'rpm'),age(/^respiratory rate$/i,has(VISIT.rr))],
    ['MM',val(VISIT.mm),age(/^mucous membrane/i,has(VISIT.mm))],['CRT',val(VISIT.crt),age(/^crt$/i,has(VISIT.crt))],['Mentation',val(VISIT.mentation),age(/^mentation$/i,has(VISIT.mentation))]];
  if(window.tsWeightCard) return '<h4>Vitals</h4>'+tsWeightCard(kg,sp)+'<div class="vit-grid">'+vit.map(function(v){ return '<div class="vit'+(v[1]==='—'?' none':'')+'"><div class="k">'+v[0]+'</div><div class="v">'+v[1]+'</div>'+(v[2]?'<div class="age">'+esc(v[2])+'</div>':'')+'</div>'; }).join('')+'</div>';
  return '<h4>Vitals</h4>'+wtTileHTML(kg)+'<div class="vit-grid">'+vit.map(function(v){ return '<div class="vit"><div class="k">'+v[0]+'</div><div class="v">'+v[1]+'</div></div>'; }).join('')+'</div>'
    +(kg?'<div class="calc-row"><div class="calc-chip"><div class="k">BSA</div><div class="v">'+bsa(kg,sp).toFixed(2)+' m²</div></div><div class="calc-chip"><div class="k">RER</div><div class="v">'+Math.round(70*Math.pow(kg,0.75)).toLocaleString()+' kcal/day</div></div></div>':''); }
function vitalsCardPaint(){ var el=document.getElementById('tsVitalsCard'); if(!el) return; var h=vitalsCardInner(); if(el._h!==h){ el.innerHTML=h; el._h=h; } }   /* compare with what was written, not the browser's re-serialized innerHTML (SVG never matches) */
on('header.refresh',vitalsCardPaint);
window.sidebarBriefHTML=function(){ var p=(curDoc&&curDoc.patient)||{}, kg=Number(VISIT.weight)||0;
  var list=function(t,a){ return a&&a.length?'<div class="panel"><h4>'+t+'</h4><div class="pc"><ul>'+a.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></div></div>':''; };
  return '<aside class="clinical-sidebar cbrief" id="clinSidebar">'+estimateCard()
    +'<div class="panel" id="tsVitalsCard">'+vitalsCardInner()+'</div>'
    +'<div class="panel"><h4>Patient</h4><div class="kvlist">'
      +'<div class="kvrow"><span class="kk">Checked in</span><span class="vv" style="display:flex;flex-direction:column;align-items:flex-start;gap:3px"><span class="ci-time">'+esc(VISIT.checkin||'—')+'</span>'+((window.tsHoursIn&&tsHoursIn()!=null)?'<span class="ci-pill">'+tsHoursIn()+' hrs hospitalized</span>':'')+'</span></div>'
      +kvr('Species',esc(VISIT.species||'—'))+kvr('Breed',esc(VISIT.breed||'—'))+kvr('Age',esc(VISIT.age||'—'))+kvr('Sex',esc(VISIT.sex||'—'))+kvr('Weight',kg?kg+' kg':'—')
      +'<div class="kvrow"><span class="kk">Code status</span><span class="vv">'+tsCodePill(1)+'</span></div></div></div>'
    +((p.owner||p.phone)?'<div class="panel"><h4>Client</h4><div class="kvlist">'+(p.owner?kvr('Owner',esc(p.owner)):'')+(p.phone?kvr('Phone',esc(p.phone)):'')+'</div></div>':'')
    +tsProblemsPanel()+list('Plan',VISIT.plan)
    +'</aside>'; };
/* ═══ WEIGHT CARD (Oct 2026) — the top of the sidebar Vitals card ═══
   The dosing weight, the change since admit, a copy button, a trend chart of every charted weight (admit → now), and BSA / RER
   beside it, since both come from that weight. Reading the chart: pointer or Tab + ← → moves between weigh-ins.
   Motion (never with Reduce Motion): opening a sheet draws the line, raises the fill, brings each dot in as the line reaches it and
   sends one ring from the newest; a new weight springs the chart to its new scale, the new dot slides in from the last one and the
   number rolls. The card is re-rendered as a string (store/rounds.js vitalsCardInner); this module only decides what moves. */
(function(){
  var CW=276, CH=74, AX=15, PL=5, PR=32, WC={id:null,n:0,kg:null,P:null,now:0};
  var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function pts(){ var R=[]; try{ R=readings(curDoc,/^weight$/i).map(function(r){ return {v:parseFloat((String(r.v).match(/\d+(\.\d+)?/)||[])[0]),at:r.at,src:r.src}; }).filter(function(r){ return r.v>0&&r.at&&!isNaN(new Date(r.at)); }); }catch(e){}
    if(!R.length){ var kg=Number(VISIT.weight)||0, at=curDoc&&(curDoc.admitted_at||curDoc.created_at); if(kg&&at) R=[{v:kg,at:at,src:'admit'}]; }
    /* the same weigh-in can arrive twice (the open day's mark and the board summary, minutes rounded): keep one */
    var out=[]; R.map(function(r){ return {v:r.v,t:new Date(r.at).getTime(),src:r.src}; }).sort(function(a,b){ return a.t-b.t; }).forEach(function(r){ var p=out[out.length-1]; if(p&&Math.abs(r.t-p.t)<3*60000&&Math.abs(r.v-p.v)<0.005){ if(!p.src) p.src=r.src; return; } out.push(r); });
    return out.slice(-14); }
  function f2(k,ref){ var r=ref==null?k:ref; return (Math.round(k*100)/100).toFixed(r>=20?1:2); }
  function hr(t){ var d=new Date(t), h=d.getHours(), m=d.getMinutes(), a=h<12?'AM':'PM'; h=h%12||12; return h+(m?':'+String(m).padStart(2,'0'):'')+' '+a; }
  function sh(t){ var d=new Date(t), h=d.getHours(); return (h%12||12)+(h<12?'A':'P'); }
  function geom(R,now){ var t0=R[0].t, span=Math.max(now-t0,6*3600e3), x=function(t){ return PL+Math.min(1,(t-t0)/span)*(CW-PL-PR); };
    var ks=R.map(function(r){ return r.v; }), lo=Math.min.apply(null,ks), hi=Math.max.apply(null,ks), mid=(lo+hi)/2, half=Math.max((hi-lo)/2*1.35,mid*0.012,.15);
    var y=function(k){ return 7+(1-(k-(mid-half))/(2*half))*(CH-14); };
    return {x:x,y:y,lo:lo,hi:hi,P:R.map(function(r){ return [x(r.t),y(r.v)]; })}; }
  /* a monotone curve through the weigh-ins: it never bulges above or below a real weight */
  function mono(P){ if(P.length<2) return P.length?'M'+P[0][0].toFixed(1)+','+P[0][1].toFixed(1):''; var n=P.length,dx=[],m=[],t=[],i;
    for(i=0;i<n-1;i++){ dx[i]=Math.max(.01,P[i+1][0]-P[i][0]); m[i]=(P[i+1][1]-P[i][1])/dx[i]; }
    t[0]=m[0]; t[n-1]=m[n-2]; for(i=1;i<n-1;i++) t[i]=m[i-1]*m[i]<=0?0:(m[i-1]+m[i])/2;
    for(i=0;i<n-1;i++){ if(m[i]===0){ t[i]=t[i+1]=0; continue; } var a=t[i]/m[i], b=t[i+1]/m[i], s=a*a+b*b; if(s>9){ var k=3/Math.sqrt(s); t[i]=k*a*m[i]; t[i+1]=k*b*m[i]; } }
    var d='M'+P[0][0].toFixed(1)+','+P[0][1].toFixed(1); for(i=0;i<n-1;i++){ var h=dx[i]/3; d+=' C'+(P[i][0]+h).toFixed(1)+','+(P[i][1]+t[i]*h).toFixed(1)+' '+(P[i+1][0]-h).toFixed(1)+','+(P[i+1][1]-t[i+1]*h).toFixed(1)+' '+P[i+1][0].toFixed(1)+','+P[i+1][1].toFixed(1); }
    return d; }
  function chart(R,now){ var g=geom(R,now), P=g.P, L=P[P.length-1], nx=CW-PR, line=mono(P), s='', i, prev=null, lastLbl=-99;
    s+='<defs><linearGradient id="wcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="wc-g0"/><stop offset="1" class="wc-g1"/></linearGradient></defs>';
    if(R.length>1) s+='<rect class="wc-fut" x="'+L[0].toFixed(1)+'" y="0" width="'+Math.max(0,nx-L[0]).toFixed(1)+'" height="'+CH+'" rx="4"/>'
      +'<line class="wc-gl" x1="0" x2="'+nx+'" y1="'+g.y(g.hi).toFixed(1)+'" y2="'+g.y(g.hi).toFixed(1)+'"/><line class="wc-gl" x1="0" x2="'+nx+'" y1="'+g.y(g.lo).toFixed(1)+'" y2="'+g.y(g.lo).toFixed(1)+'"/>'
      +'<text x="'+CW+'" y="'+(g.y(g.hi)+3).toFixed(1)+'" text-anchor="end">'+f2(g.hi)+'</text>'+(g.hi!==g.lo?'<text x="'+CW+'" y="'+(g.y(g.lo)+3).toFixed(1)+'" text-anchor="end">'+f2(g.lo)+'</text>':'');
    else s+='<text x="'+CW+'" y="'+(L[1]+3).toFixed(1)+'" text-anchor="end">'+f2(R[0].v)+'</text>';
    if(R.length>1) s+='<path class="wc-ar" d="'+line+' L'+L[0].toFixed(1)+','+CH+' L'+P[0][0].toFixed(1)+','+CH+' Z"/>';
    s+='<path class="wc-ln" d="'+line+'"/><path class="wc-tail" d="M'+L[0].toFixed(1)+','+L[1].toFixed(1)+' H'+nx+'"/><line class="wc-scrub" x1="0" x2="0" y1="0" y2="'+CH+'"/>';
    for(i=0;i<P.length;i++) s+='<circle class="wc-dot'+(i===P.length-1?' last':'')+'" cx="'+P[i][0].toFixed(1)+'" cy="'+P[i][1].toFixed(1)+'" r="3.3"/>';
    s+='<circle class="wc-ring" cx="'+L[0].toFixed(1)+'" cy="'+L[1].toFixed(1)+'" r="4"/>';
    /* the time axis: each weigh-in (its day when the day changes), never two labels on top of each other, and Now */
    for(i=0;i<R.length;i++){ var x=P[i][0], last=i===R.length-1; if(!last&&x-lastLbl<34) continue; if(last&&x-lastLbl<30&&i>0){ /* the newest wins */ s=s.replace(/<text class="wc-t"[^>]*>[^<]*<\/text>$/,''); }
      var lb=(!prev||new Date(prev).toDateString()!==new Date(R[i].t).toDateString()?DAYS[new Date(R[i].t).getDay()]+' ':'')+sh(R[i].t); prev=R[i].t; lastLbl=x;
      s+='<text class="wc-t" x="'+x.toFixed(1)+'" y="'+(CH+AX-3)+'" text-anchor="'+(i===0?'start':'middle')+'">'+lb+'</text>'; }
    if(nx-L[0]>44) s+='<text class="wc-now" x="'+nx+'" y="'+(CH+AX-3)+'" text-anchor="end">Now</text>';
    return s; }
  var COPY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
  function arrow(d){ return '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="'+(d<0?'M5 1.5v7M2 5.5l3 3 3-3':'M5 8.5v-7M2 4.5l3-3 3 3')+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }

  window.tsWeightCard=function(kg,sp){ var R=pts(), now=nowMs(), W=null; try{ W=weightInfo(curDoc); }catch(e){}
    var first=R[0], last=R[R.length-1], meta='';
    if(R.length>1){ var dk=last.v-first.v, pct=dk/first.v*100, adm=curDoc&&(curDoc.admitted_at||curDoc.created_at), sinceAdmit=adm&&Math.abs(first.t-new Date(adm).getTime())<8*3600e3, fd=new Date(first.t);
      meta='<span class="wc-delta">'+(Math.abs(dk)<0.005?'No change':arrow(dk)+(dk>0?'+':'−')+f2(Math.abs(dk),last.v)+' kg')+'</span><span>'+(Math.abs(pct)>=0.05?(pct>0?'+':'−')+Math.abs(pct).toFixed(1)+'% ':'')+'since '+(sinceAdmit?'admit':(fd.getMonth()+1)+'/'+fd.getDate())+'</span>'; }
    else if(W&&W.kg) meta='<span>'+esc(W.how||'Weighed')+(W.when?' · '+esc(W.when):'')+'</span>';
    var chk=W&&W.newer?'<div class="wc-chk">Charted '+esc(f2(W.newer.v))+' kg · doses still use '+esc(String(kg))+' kg</div>':'';
    var sum=R.length>1?'Weight trend: '+f2(first.v)+' kg '+DAYS[new Date(first.t).getDay()]+' '+hr(first.t)+' to '+f2(last.v)+' kg '+DAYS[new Date(last.t).getDay()]+' '+hr(last.t)+'. Use the arrow keys to read each weigh-in.':(R.length?'Weight '+f2(last.v)+' kg, one weigh-in so far.':'');
    var data=R.map(function(r){ return r.t+':'+r.v+':'+(r.src||''); }).join(',');
    return '<div class="wc" data-pts="'+esc(data)+'" data-kg="'+esc(String(kg||''))+'"><div class="wc-top"><div><div class="k">Weight</div><div class="wc-v"><span class="wc-num ts-num" data-roll="wc-kg">'+(kg?esc(String(kg)):'—')+'</span>'+(kg?'<span class="wc-u">kg</span>':'')+'</div></div>'
      +(kg?'<button type="button" class="wc-cp" onclick="tsWcCopy(this)" aria-label="Copy weight" title="Copy weight">'+COPY+'<span class="ok">Copied</span></button>':'')+'</div>'
      +(meta?'<div class="wc-meta">'+meta+'</div>':'')+chk
      +(R.length?'<svg class="wc-chart" viewBox="0 0 '+CW+' '+(CH+AX)+'" tabindex="0" role="img" aria-label="'+esc(sum)+'">'+chart(R,now)+'</svg>'+(R.length<2?'<div class="wc-hint">Weigh again to see the trend.</div>':''):'')
      +'<div class="wc-bub" aria-hidden="true"></div>'
      +(kg?'<div class="wc-der"><div><div class="k">BSA</div><b>'+bsa(kg,sp).toFixed(2)+' <small>m²</small></b></div><div><div class="k">RER</div><b>'+Math.round(70*Math.pow(kg,0.75)).toLocaleString()+' <small>kcal/day</small></b></div></div>':'')
      +'</div>'; };
  function nowMs(){ return Date.now(); }

  window.tsWcCopy=function(b){ var t=(Number(VISIT.weight)||'')+' kg'; try{ if(navigator.clipboard) navigator.clipboard.writeText(t); }catch(e){} b.classList.add('done'); setTimeout(function(){ b.classList.remove('done'); },1300); };

  /* reading the chart */
  function readOf(svg){ var c=svg.closest('.wc'); return String(c.getAttribute('data-pts')||'').split(',').filter(Boolean).map(function(s){ var a=s.split(':'); return {t:+a[0],v:+a[1],src:a[2]}; }); }
  function show(svg,i){ var R=readOf(svg); if(!R[i]) return; var c=svg.closest('.wc'), g=geom(R,+svg.getAttribute('data-now')||nowMs()), p=g.P[i], bub=c.querySelector('.wc-bub'), sc=svg.querySelector('.wc-scrub');
    svg._i=i; svg.querySelectorAll('.wc-dot').forEach(function(d,j){ d.setAttribute('r',j===i?4.5:3.3); }); sc.setAttribute('x1',p[0]); sc.setAttribute('x2',p[0]); sc.classList.add('on');
    var sr=svg.getBoundingClientRect(), cr=c.getBoundingClientRect(), k=sr.width/CW, d=new Date(R[i].t), today=new Date().toDateString()===d.toDateString();
    bub.innerHTML=f2(R[i].v)+' kg<small>'+(today?'Today':DAYS[d.getDay()]+' '+(d.getMonth()+1)+'/'+d.getDate())+' '+hr(R[i].t)+(R[i].src==='triage'?' · Triage':'')+'</small>';
    bub.style.left=Math.min(Math.max(sr.left-cr.left+p[0]*k,58),cr.width-58)+'px'; bub.style.top=(sr.top-cr.top+p[1]*k-8)+'px'; bub.classList.add('on'); }
  function hide(svg){ var c=svg.closest('.wc'); svg._i=-1; c.querySelector('.wc-bub').classList.remove('on'); var sc=svg.querySelector('.wc-scrub'); if(sc) sc.classList.remove('on'); svg.querySelectorAll('.wc-dot').forEach(function(d){ d.setAttribute('r',3.3); }); }
  document.addEventListener('pointermove',function(e){ var svg=e.target&&e.target.closest&&e.target.closest('.wc-chart'); if(!svg) return; var R=readOf(svg); if(!R.length) return;
    var r=svg.getBoundingClientRect(), x=(e.clientX-r.left)*(CW/r.width), g=geom(R,+svg.getAttribute('data-now')||nowMs()), b=0, bd=1e9; g.P.forEach(function(p,i){ var d=Math.abs(p[0]-x); if(d<bd){ bd=d; b=i; } }); if(b!==svg._i) show(svg,b); },{passive:true});
  document.addEventListener('pointerout',function(e){ var svg=e.target&&e.target.closest&&e.target.closest('.wc-chart'); if(svg&&!svg.contains(e.relatedTarget)&&document.activeElement!==svg) hide(svg); },{passive:true});
  document.addEventListener('focusin',function(e){ var svg=e.target; if(svg&&svg.classList&&svg.classList.contains('wc-chart')){ var R=readOf(svg); if(R.length) show(svg,R.length-1); } });
  document.addEventListener('focusout',function(e){ var svg=e.target; if(svg&&svg.classList&&svg.classList.contains('wc-chart')) hide(svg); });
  document.addEventListener('keydown',function(e){ var svg=e.target; if(!(svg&&svg.classList&&svg.classList.contains('wc-chart'))) return; var R=readOf(svg);
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); var i=svg._i==null||svg._i<0?R.length-1:svg._i+(e.key==='ArrowRight'?1:-1); show(svg,Math.max(0,Math.min(R.length-1,i))); } if(e.key==='Escape') hide(svg); });

  /* motion */
  function still(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return true; } }
  var E='cubic-bezier(.32,.72,0,1)';
  function ring(svg,delay){ var r=svg.querySelector('.wc-ring'); if(r&&r.animate) try{ r.animate([{r:4,opacity:.55},{r:13,opacity:0}],{duration:1000,delay:delay,easing:'cubic-bezier(.2,.7,.3,1)'}); }catch(e){} }
  function intro(svg,R,now){ var ln=svg.querySelector('.wc-ln'), ar=svg.querySelector('.wc-ar'), D=900, Lh=0; try{ Lh=ln.getTotalLength(); }catch(e){}
    if(Lh>0) ln.animate([{strokeDasharray:Lh+' '+Lh,strokeDashoffset:Lh},{strokeDasharray:Lh+' '+Lh,strokeDashoffset:0}],{duration:D,easing:E});
    if(ar) ar.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:D+150,delay:80,easing:E,fill:'backwards'});
    var g=geom(R,now), span=(g.P[g.P.length-1][0]-g.P[0][0])||1;
    svg.querySelectorAll('.wc-dot').forEach(function(d,i){ d.animate([{transform:'scale(0)'},{transform:'scale(1.25)',offset:.6},{transform:'scale(1)'}],{duration:420,delay:(g.P[i][0]-g.P[0][0])/span*D*.85,easing:'ease-out',fill:'backwards'}); });
    svg.querySelectorAll('.wc-tail,.wc-fut').forEach(function(e){ e.animate([{opacity:0},{opacity:1}],{duration:400,delay:D*.8,fill:'backwards'}); });
    svg.querySelectorAll('text').forEach(function(t,i){ t.animate([{opacity:0},{opacity:1}],{duration:400,delay:200+i*40,fill:'backwards'}); });
    ring(svg,D*.9); }
  function springE(t){ return 1-Math.exp(-6.5*t)*Math.cos(9.5*t); }
  function springTo(svg,fromP,toP){ var ln=svg.querySelector('.wc-ln'), ar=svg.querySelector('.wc-ar'), dots=[].slice.call(svg.querySelectorAll('.wc-dot')), fut=svg.querySelector('.wc-fut'), tail=svg.querySelector('.wc-tail'), rg=svg.querySelector('.wc-ring'), nx=CW-PR;
    var from=toP.map(function(_,i){ return fromP[Math.min(i,fromP.length-1)]; }), T0=performance.now(), DUR=750;
    (function step(now){ if(!svg.isConnected) return; var k=Math.min(1,(now-T0)/DUR), e=springE(k), P=toP.map(function(p,i){ return [from[i][0]+(p[0]-from[i][0])*e, from[i][1]+(p[1]-from[i][1])*e]; }), L=P[P.length-1], d=mono(P);
      ln.setAttribute('d',d); if(ar) ar.setAttribute('d',d+' L'+L[0]+','+CH+' L'+P[0][0]+','+CH+' Z'); dots.forEach(function(c,i){ if(P[i]){ c.setAttribute('cx',P[i][0]); c.setAttribute('cy',P[i][1]); } });
      if(fut){ fut.setAttribute('x',L[0]); fut.setAttribute('width',Math.max(0,nx-L[0])); } if(tail) tail.setAttribute('d','M'+L[0]+','+L[1]+' H'+nx); if(rg){ rg.setAttribute('cx',L[0]); rg.setAttribute('cy',L[1]); }
      if(k<1) requestAnimationFrame(step); else ring(svg,0); })(T0); }
  function roll(card,oldTxt){ var num=card.querySelector('.wc-num'); if(!num||!num.animate) return; var g=num.cloneNode(true); g.textContent=oldTxt; g.className='wc-num wc-ghost'; num.parentNode.appendChild(g);
    var a=g.animate([{transform:'none',opacity:1},{transform:'translateY(-70%)',opacity:0}],{duration:380,easing:E,fill:'forwards'}); a.onfinish=function(){ g.remove(); };
    num.animate([{transform:'translateY(70%)',opacity:0},{transform:'none',opacity:1}],{duration:460,delay:60,easing:E,fill:'backwards'});
    card.querySelectorAll('.wc-der b').forEach(function(b){ b.animate([{opacity:.25,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:420,delay:200,easing:E,fill:'backwards'}); }); }
  function motion(){ var card=document.querySelector('#tsVitalsCard .wc'); if(!card||card._wc) return; card._wc=1;
    var svg=card.querySelector('.wc-chart'), R=svg?readOf(svg):[], now=nowMs(), kg=card.getAttribute('data-kg'), id=CUR, prev=WC, g=R.length?geom(R,now):null;
    if(svg) svg.setAttribute('data-now',String(now));
    WC={id:id,n:R.length,kg:kg,P:g?g.P:null,now:now};
    if(still()||!card.animate) return;
    if(prev.id!==id){ if(svg&&R.length) intro(svg,R,now); return; }
    if(svg&&R.length>prev.n&&prev.P&&prev.n>0) springTo(svg,prev.P,g.P);
    if(prev.kg&&kg&&prev.kg!==kg) roll(card,prev.kg); }
  window.tsWcMotion=motion;
  on('header.refresh',function(){ setTimeout(motion,0); });
  on('sheet.opening',function(){ WC={id:null,n:0,kg:null,P:null,now:0}; });
})();
window.__tsStore={removeNote:removeNote, sync:sync, get cur(){ return CUR; }, get doc(){ return curDoc; }, get sheets(){ return SHEETS; }, openSheet:openSheet, dayKey:dayKey,
  /* for tests and the preview only */ infAdd:function(){ return infAdd.apply(null,arguments); }, infBuild:function(){ return infBuild.apply(null,arguments); }, addOrders:function(L){ return addOrders(L); }};
})();
