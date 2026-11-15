/* Pravix Flow — app.js (n383). Flow's main script, as it was inline in index.html (it loads at the same point of the page).
   The scripts that followed it are in layers.js and layers2.js.
   After changing this file:  python3 _ci/seal_csp.py .   (it refreshes the ?v= in index.html) */

/* ━━━━━ PVX-N385 · Flow's shared helpers: one copy each (stage 2a) ━━━━━
   Each of these was declared again in several layer blocks, with the same code. A block that needs one calls it by this name;
   it does not declare its own. A helper belongs here only if it uses nothing but page-wide names. */
/* text made safe to place in markup: & < > " */
function pvxEsc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
/* text made safe for markup and for a quoted attribute: & < > " ' */
function pvxEscQ(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* is the person typing in a field? */
function pvxTyping(){ var a=document.activeElement; return !!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)); }
/* the patient with this id, or null */
function pvxPatientById(id){ try{ return PATIENTS.find(function(x){ return String(x.id)===String(id); })||null; }catch(e){ return null; } }
/* the patient whose drawer is open, or null */
function pvxActivePatient(){ try{ return PATIENTS.find(function(x){ return x.id===activePatient; })||null; }catch(e){ return null; } }
/* the signed-in person's name, or 'Staff' */
function pvxWho(){ try{ return (typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):'Staff'; }catch(e){ return 'Staff'; } }
/* the signed-in person: {name, uid, initials} */
function pvxMe(){ var u=null; try{ u=(typeof AUTH!=='undefined'&&AUTH&&AUTH.currentUser)||null; }catch(e){}
    var name=(typeof CURRENT_USER==='string'&&CURRENT_USER)||(u&&(u.displayName||u.email))||'Flow';
    return {name:name,uid:u?u.uid:null,initials:name.split(/\s+/).map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase()}; }
/* the signed-in person's account id, or null */
function pvxUid(){ try{ return (AUTH&&AUTH.currentUser&&AUTH.currentUser.uid)||null; }catch(e){ return null; } }
/* the signed-in person's email, or '' */
function pvxEmail(){ try{ return (AUTH&&AUTH.currentUser&&AUTH.currentUser.email)||''; }catch(e){ return ''; } }
/* a number as two digits */
function pvxPad2(n){ return (n<10?'0':'')+n; }
/* an ISO time as the clock time */
function pvxHm(iso){ try{ return fmtTime(new Date(iso)); }catch(e){ return ''; } }
/* whole minutes since an ISO time */
function pvxMinsSince(iso){ return Math.max(0,Math.round((Date.now()-new Date(iso))/60000)); }
/* the hospital's id */
function pvxTenant(){ try{ return TENANT_ID||'shoreline'; }catch(e){ return 'shoreline'; } }
/* the database, or null before it is ready */
function pvxDb(){ try{ return (typeof DB!=='undefined'&&DB)?DB:null; }catch(e){ return null; } }
/* a quiet notice (notify with the info icon) */
function pvxNote(t,s,o){ try{ notify(t,s,Object.assign({icon:'info',color:'#3E8FA5'},o||{})); }catch(e){} }
/* a patient's first and last name */
function pvxFullName(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
/* is this element drawn and able to be clicked? */
function pvxShown(el){ var r=el.getBoundingClientRect(); if(!r.width||!r.height) return false; var c=getComputedStyle(el); return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05&&c.pointerEvents!=='none'; }
/* the Flow view on screen */
function pvxView(){ try{ return currentView; }catch(e){ return ''; } }
/* does the person ask for reduced motion? */
function pvxReduceMotion(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
/* put a parked sheet button back where it was */
function pvxUnpark(btn){ if(!btn||!btn._pvxMark) return; var mk=btn._pvxMark; btn._pvxMark=null;
    btn.classList.remove('pvx-ps-btn','pvx-ps-l','pvx-ps-r'); if(mk.parentNode){ mk.parentNode.insertBefore(btn,mk); mk.remove(); } }
/* the grab area of a sheet under this event, if any */
function pvxGrabZone(e){ return e.target.closest&&e.target.closest('.pvx-grab,.addpt-head'); }
/* ━━━━━ PVX-N386 · pvxWatch: the layers that watch the whole page share one observer (stage 2b) ━━━━━
   pvxWatch(fn, options, target) stands in for  new MutationObserver(fn).observe(target, options)  when target is document.body
   or document.documentElement. There is one real observer per target. Each caller still gets only the records its own options
   would have given it (type, attributeFilter, subtree), as an array, in the order the callers registered; a caller with nothing
   to receive isn't called. Callers with the same options are handed the same array, so a caller must not change it.
   It returns {disconnect(), takeRecords()}. A watcher on one element keeps its own observer. */
var pvxWatch=(function(){
  var hubs=[], UNLISTED=1<<31;   /* an attribute no caller listed by name: only a caller that asked for every attribute receives it */
  function hubFor(target){ for(var i=0;i<hubs.length;i++) if(hubs[i].target===target) return hubs[i];
    var h={target:target,subs:[],sigs:{},mo:null,all:false,bits:{},nbits:0,oldV:false,cd:false,cl:false,st:false,last:'',batch:0}; hubs.push(h); return h; }
  /* A batch is sorted once. Each record gets one number: 1 nodes, 2 text, or the bit of its attribute. Callers with the same options
     share one answer, worked out the first time one of them is reached. */
  function pick(h,g,ms,kind,atT){ var out=[], m=g.mask, all=g.allAttr, deep=g.subtree;
    for(var j=0;j<ms.length;j++){ var k=kind[j]; if((k&m)||(all&&(k<0||k>=4))){ if(deep||atT[j]) out.push(ms[j]); } }
    return out; }
  function deliver(h,ms){ var list=h.subs.slice(), n=ms.length, kind=new Array(n), atT=new Array(n), t=h.target, b=++h.batch, j;
    for(j=0;j<n;j++){ var r=ms[j]; atT[j]=r.target===t; kind[j]= r.type==='childList'?1 : r.type==='characterData'?2 : (h.bits[r.attributeName]||UNLISTED); }
    for(var i=0;i<list.length;i++){ var s=list[i]; if(s.off) continue; var g=s.sig; if(g.batch!==b){ g.batch=b; g.out=pick(h,g,ms,kind,atT); }
      if(g.out.length){ try{ s.fn(g.out,s.obs); }catch(e){ (function(e){ setTimeout(function(){ throw e; },0); })(e); } } } }
  function start(h){ if(!h.mo) h.mo=new MutationObserver(function(ms){ deliver(h,ms); });
    var o={}; if(h.cl) o.childList=true; if(h.st) o.subtree=true; if(h.cd) o.characterData=true;
    if(h.all){ o.attributes=true; } else { var f=Object.keys(h.bits); if(f.length){ o.attributes=true; o.attributeFilter=f; } }
    if(o.attributes&&h.oldV) o.attributeOldValue=true;
    var k=JSON.stringify(o); if(k!==h.last){ h.last=k; h.mo.observe(h.target,o); } }
  function watch(fn,opts,target){ opts=opts||{}; target=target||document.body; var h=hubFor(target);
    var attrs=!!(opts.attributes||opts.attributeFilter||opts.attributeOldValue), filter=opts.attributeFilter?opts.attributeFilter.slice():null, mask=0;
    if(opts.childList) mask|=1; if(opts.characterData||opts.characterDataOldValue) mask|=2;
    if(filter) filter.forEach(function(a){ if(!h.bits[a]){ if(h.nbits>=27) throw new Error('pvxWatch: too many different attributes on one target'); h.bits[a]=4<<(h.nbits++); } mask|=h.bits[a]; });
    var key=mask+'|'+(attrs&&!filter?'a':'')+'|'+(opts.subtree?'s':''), g=h.sigs[key]||(h.sigs[key]={mask:mask,allAttr:attrs&&!filter,subtree:!!opts.subtree,batch:0,out:null});
    var s={fn:fn,off:false,sig:g};
    s.obs={disconnect:function(){ s.off=true; var i=h.subs.indexOf(s); if(i>-1) h.subs.splice(i,1); },takeRecords:function(){ return []; }};
    h.subs.push(s); if(mask&1) h.cl=true; if(opts.subtree) h.st=true; if(mask&2) h.cd=true; if(opts.attributeOldValue) h.oldV=true; if(attrs&&!filter) h.all=true;
    start(h); return s.obs; }
  watch.count=function(target){ return target?hubFor(target).subs.length:hubs.reduce(function(a,h){ return a+h.subs.length; },0); };
  watch.hubs=function(){ return hubs.map(function(h){ return {target:h.target,watchers:h.subs.length,options:h.last}; }); };
  return watch;
})();

/* ━━━━━ PVX-N387 · steps: a function of the main script and what the layers add to it (stage 2c) ━━━━━
   A layer no longer replaces a function (saving the old one and calling it from the new one). It adds to it:
     pvxBefore('fillDrawer', function(p){ … }, 'who')     runs before the function, with the same arguments
     pvxAfter ('fillDrawer', function(p){ … }, 'who')     runs after it, with the same arguments; the function's result is returned
     pvxWrap  ('fillDrawer', function(inner){ return function(p){ … inner.apply(this,arguments) … }; }, 'who')
                                                          for a layer that decides whether the function runs, or changes what goes in or comes out
   The order is the order the layers were added, as when each wrapped the one before: the last one added is outermost. Its "before"
   runs first and its "after" runs last. The function itself is NAME$base; NAME(…) runs it with its layers. pvxSteps.of(NAME) lists them.
   A name without a NAME$base is wrapped the old way, so the three calls work for any page-wide function. */
var pvxSteps=(function(){
  var all={};
  function flat(inner){ var g={before:[],after:[],inner:inner};
    g.fn=function(){ var b=g.before, a=g.after, nb=b.length, na=a.length, i, r;
      for(i=nb-1;i>=0;i--) b[i].apply(this,arguments);
      r=g.inner.apply(this,arguments);
      for(i=0;i<na;i++) a[i].apply(this,arguments);
      return r; };
    return g; }
  function add(name,kind,fn,who){ var base=window[name+'$base'];
    if(typeof base!=='function'){ var old=window[name]; if(typeof old!=='function') throw new Error('pvxSteps: no function named '+name);
      window[name]= kind==='wrap' ? fn(old) : kind==='before' ? function(){ fn.apply(this,arguments); return old.apply(this,arguments); } : function(){ var r=old.apply(this,arguments); fn.apply(this,arguments); return r; };
      return; }
    var s=all[name]||(all[name]={top:base,group:null,list:[]});
    if(kind==='wrap'){ var w=fn(s.top); if(typeof w!=='function') throw new Error('pvxWrap('+name+'): the layer must return a function'); s.top=w; s.group=null; }
    else { if(!s.group){ s.group=flat(s.top); s.top=s.group.fn; } s.group[kind].push(fn); }
    s.list.push({kind:kind,who:who||''}); }
  return { s:all, add:add,
    of:function(name){ return all[name]?all[name].list.map(function(x){ return {kind:x.kind,who:x.who}; }):[]; },
    names:function(){ return Object.keys(all); } };
})();
function pvxRun(name,base,self,args){ var s=pvxSteps.s[name]; return (s?s.top:base).apply(self,args); }
function pvxBefore(name,fn,who){ pvxSteps.add(name,'before',fn,who); }
function pvxAfter(name,fn,who){ pvxSteps.add(name,'after',fn,who); }
function pvxWrap(name,make,who){ pvxSteps.add(name,'wrap',make,who); }

const STATUSES = {
Waiting:     {color:'var(--s-waiting)',     bg:'var(--s-waiting-bg)'},
Exam:        {color:'var(--s-exam)',        bg:'var(--s-exam-bg)'},
Diagnostics: {color:'var(--s-diagnostics)', bg:'var(--s-diagnostics-bg)'},
Ultrasound:  {color:'var(--s-ultrasound)',  bg:'var(--s-ultrasound-bg)'},
Procedure:   {color:'var(--s-procedure)',   bg:'var(--s-procedure-bg)'},
Admitted:    {color:'var(--s-admitted)',    bg:'var(--s-admitted-bg)'},
Discharged:  {color:'var(--s-discharged)',  bg:'var(--s-discharged-bg)'},
Euthanized:  {color:'#8A82A8',              bg:'rgba(138,130,168,.16)'},
Hospitalized:{color:'#2FB6B9',              bg:'rgba(47,182,185,.16)'}
};
const FLOW_COLS = ['Waiting','Exam','Diagnostics','Ultrasound','Procedure'];
const STAGE_ORDER = ['Waiting','Exam','Diagnostics','Ultrasound','Procedure','Admitted','Discharged'];

const ROOMS = (window.Pravix && Pravix.getRooms) ? Pravix.getRooms() : ['Lobby','Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Comfort Room'];
const ROOM_SPEC = (window.Pravix && Pravix.getRoomSpec) ? Pravix.getRoomSpec() : {'Room 2':'Oncology','Room 4':'Neurology','Comfort Room':'End-of-life'};





const DOCTOR_NAMES = (window.Pravix && Pravix.getDoctors) ? Pravix.getDoctors() : [
'Annie Downes',
'Kelley Harpin',
'Amber Koch',
'Mara Kraenzlin',
'Marissa Marinaccio',
'Michael McCann',
'Shaylan Meyer',
'Sarah Schiff',
'Klaudia Polak',
'Morgan Vrana'
];

const DOC_PALETTE = (window.Pravix && Pravix.getDoctorPalette) ? Pravix.getDoctorPalette() : ['var(--accent)','var(--purple)','#E8644A','var(--amber)','var(--s-admitted)','#3E7CB1','#2C7FB8','#C0568E','#5EA9A0','#9B7BD4'];
function docSlug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function docInitials(s){return s.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();}
const DOCTORS = DOCTOR_NAMES.map((name,i)=>({
id: docSlug(name), name,
initials: docInitials(name),
color: DOC_PALETTE[i % DOC_PALETTE.length],
baseColor: DOC_PALETTE[i % DOC_PALETTE.length]
}));
const UNASSIGNED = {id:'unassigned', name:'Unassigned', initials:'—', color:'#A9C0D4'};
function doc(id){return DOCTORS.find(d=>d.id===id) || UNASSIGNED;}

function patientsForDoctor(id){return PATIENTS.filter(p=>p.doctor===id);}
function activeCountForDoctor(id){return PATIENTS.filter(p=>p.doctor===id && isActive(p)).length;}



const LIAISON_NAMES = (window.Pravix && Pravix.getLiaisons) ? Pravix.getLiaisons() : [
'Melissa Hamilton',
'Jamie Cisneros',
'Tammy Guinto',
'Nyla Chase',
'Daniel Giordano',
'Alexa Marucci',
'Liz DeLauri',
'Alexandra Rimkus',
'Stephanie Bamford',
'Sara DeVitto',
'Rhiannon Cappannelli'
];
const LIA_PALETTE = (window.Pravix && Pravix.getLiaisonPalette) ? Pravix.getLiaisonPalette() : ['var(--purple)','var(--s-admitted)','var(--amber)','var(--accent)','#E8644A','#9B7BD4','#3E7CB1','#5EA9A0','#C0568E','#A888E0','#2C7FB8'];
const LIAISONS = LIAISON_NAMES.map((name,i)=>({
id: docSlug(name), name,
initials: docInitials(name),
color: LIA_PALETTE[i % LIA_PALETTE.length]
}));
const NO_LIAISON = {id:'none', name:'No liaison', initials:'', color:'#7A9BB5'};
function liaison(id){return id ? (LIAISONS.find(l=>l.id===id) || null) : null;}

function patientsForLiaison(id){return PATIENTS.filter(p=>p.liaison===id);}
function activeCountForLiaison(id){return PATIENTS.filter(p=>p.liaison===id && isActive(p)).length;}





const TRIAGE_Q = [
{key:'eating',     label:'Eating Normally?',        normal:'yes'},
{key:'drinking',   label:'Drinking Normally?',      normal:'yes'},
{key:'vomiting',   label:'Vomiting?',               normal:'no',  note:true},
{key:'diarrhea',   label:'Diarrhea?',               normal:'no',  note:true},
{key:'urination',  label:'Normal Urination?',       normal:'yes'},
{key:'defecation', label:'Normal Defecation?',      normal:'yes'},
{key:'pain',       label:'Pain / Lameness?',        normal:'no',  note:true},
{key:'coughing',   label:'Coughing / Sneezing?',    normal:'no',  note:true},
{key:'collapse',   label:'Collapse?',               normal:'no',  note:true},
{key:'seizure',    label:'Seizures?',               normal:'no',  note:true},
{key:'dyspnea',    label:'Difficulty Breathing?',   normal:'no',  note:true},
{key:'toxin',      label:'Toxin Exposure?',         normal:'no',  note:true},
];
const TRIAGE_STATUS = {not_started:'Not started', in_progress:'In progress', complete:'Complete'};
function defaultIntake(){
const q={}, qnotes={}; TRIAGE_Q.forEach(x=>{q[x.key]=null; if(x.note)qnotes[x.key]='';});
return {status:'not_started', complaint:'', duration:'', history:'', medications:'', allergies:'', conditions:'', q, qnotes, notes:''};
}
function getIntake(p){ if(!p.intake) p.intake=defaultIntake(); return p.intake; }





const TRIAGE_VITALS = [
{key:'temp',   label:'Temperature',      unit:'°F',   fmt:fmtTemp},
{key:'hr',     label:'Heart rate',       unit:'bpm',  fmt:fmtHR},
{key:'rr',     label:'Respiratory rate', unit:'rpm',  fmt:fmtRR},
{key:'weight', label:'Weight',           unit:'kg',   fmt:fmtWeight},

];
const TRIAGE_ASSESS = [
{key:'mentation', label:'Mentation',        opts:['BAR','QAR','Dull','Obtunded','Stupor']},
{key:'mm',        label:'Mucous membranes', opts:['Pink','Pale Pink','Pale','White','Injected','Cyanotic']},
{key:'crt',       label:'Capillary refill time', fmt:fmtCRT, opts:['<2 sec','2 sec','>2 sec']},   /* same choices as Treatment Sheets' Vitals (V_OPTS) */

];
function defaultTriage(){ return {status:'not_started', vitals:{}, assess:{}, chief:[], history:'', by:'', at:''}; }
function getTriage(p){ if(!p.triage) p.triage=defaultTriage(); return p.triage; }
const TRIAGE_SHORT = {vomiting:'Vomiting',diarrhea:'Diarrhea',seizure:'Seizures',toxin:'Toxin exposure',coughing:'Coughing / sneezing',pain:'Pain / lameness',collapse:'Collapse',dyspnea:'Difficulty breathing'};
function summarizeIntake(k){
const parts=[];
Object.keys(TRIAGE_SHORT).forEach(key=>{ if(k.q[key]==='yes') parts.push(TRIAGE_SHORT[key]); });
parts.push((k.medications&&k.medications.trim())?k.medications.trim():'No medications');
if(k.q.eating==='no') parts.push('Appetite decreased'); else if(k.q.eating==='yes') parts.push('Eating normally');
return parts.slice(0,3).join(' • ') || (k.complaint ||'Intake recorded');
}

const PRIO = {
1:{c:'var(--priority-p1)', t:'#fff',    l:'P1'},
2:{c:'var(--priority-p2)', t:'#1D1D1F', l:'P2'},
3:{c:'var(--priority-p3)', t:'#fff',    l:'P3'}
};
const PRIO_LABEL = {1:'Critical',2:'Urgent',3:'Stable'};


const now = new Date();
function mAgo(min){return new Date(now.getTime()-min*60000);}

let SEQ = 100;
function patient(o){
const n = SEQ++;
return Object.assign({
id:(window.crypto&&crypto.randomUUID)?crypto.randomUUID():('pt-'+Date.now().toString(36)+'-'+n), hid:'SH-'+(1042+(n-100)), tenant:TENANT_ID, tags:[], liaison:null, timeline:[], intake:null, careTeam:{assignments:[]}
}, o);
}


function tl(label, minAgo, meta){return {label, at:mAgo(minAgo), meta:meta||''};}

let PATIENTS = [];



const TENANT_ID = (function(){ try{ return (window.Pravix && Pravix.getCurrentHospital) ? (Pravix.getCurrentHospital().id||'shoreline') :'shoreline'; }catch(e){ return'shoreline'; } })();



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

const FIREBASE_CONFIG = {
apiKey:'AIzaSyCf8iXW_wWRLvHi1G4YnYRH-iLpaDufZQE',
authDomain:'shoreline-flow.firebaseapp.com',
projectId:'shoreline-flow',
storageBucket:'shoreline-flow.firebasestorage.app',
messagingSenderId:'237404385636',
appId:'1:237404385636:web:1ee3ba27f22c946f748a71'
};
const SB_LOGIN_EMAIL ='au733@vca.com';
/* PVX-N149 decision #4: the shared front-desk login is now only the lobby screen's account. Keep in step with or/ and treatment/. */
const PVX_LOBBY_ACCOUNTS=['au733@vca.com'];
function pvxIsLobbyAccount(u){ var e=String(u&&u.email||u||'').toLowerCase(); return PVX_LOBBY_ACCOUNTS.indexOf(e)>-1; }
function pvxLobbyAccountCard(user){
  var el=document.getElementById('pvxLobbyAcct');
  if(!user){ if(el){ el.remove(); document.body.classList.remove('sb-locked'); document.querySelectorAll('.app, #mesh').forEach(function(x){ try{ x.removeAttribute('inert'); }catch(e){} }); } return; }
  try{ var ov=document.getElementById('sbLogin'); if(ov) ov.remove(); }catch(e){}
  if(el) return;
  el=document.createElement('div'); el.id='pvxLobbyAcct'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','pvxLaT');
  el.innerHTML='<div class="card"><h2 id="pvxLaT">This is the lobby screen account</h2>'
    +'<p>'+String(user.email||'').replace(/[&<>"]/g,'')+' only shows the waiting-room display. To use the board, sign in with your own account.</p>'
    +'<div class="acts"><button type="button" class="primary" id="pvxLaOwn">Sign in with my own account</button><a href="?display=1" id="pvxLaTv">Open the lobby display</a></div></div>';
  document.body.appendChild(el); document.body.classList.add('sb-locked');
  document.querySelectorAll('.app, #mesh').forEach(function(x){ try{ x.setAttribute('inert',''); }catch(e){} });
  document.getElementById('pvxLaOwn').onclick=function(){ try{ AUTH.signOut(); }catch(e){} };   /* the normal sign-in card follows (showLogin) */
  setTimeout(function(){ try{ document.getElementById('pvxLaOwn').focus(); }catch(e){} },60);
}

try{ if(window.firebase && !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG); }catch(e){}
const DB   = (window.firebase && firebase.firestore) ? firebase.firestore() : null;
/* Offline: keep a local copy of the board so Flow opens and keeps working without a connection. */
try{ if(DB && DB.settings) DB.settings({experimentalAutoDetectLongPolling:true, merge:true}); }catch(e){}   /* n92: Safari and SSL-inspection proxies stall Firestore's stream; long-polling keeps it live */
try{ if(DB && DB.enablePersistence && !(window.pvxFsMem&&pvxFsMem())) DB.enablePersistence({synchronizeTabs:true}).catch(function(){}); else if(window.pvxFsMem&&pvxFsMem()) console.warn('[flow-n249] running without the offline copy for this session'); }catch(e){}   /* n249: not after Safari lost its local database */
const AUTH = (window.firebase && firebase.auth)      ? firebase.auth()      : null;
const SB   = DB;

// One-time, narrowly-scoped enrollment for the two authorized test accounts.
// No new passwords are collected; Firestore Rules verify the signed UID,
// approved email and role. Unverified email onboarding is available only to
// existing Heather email/password sign-ins until the temporary expiry.
/* PVX-N369 - the sign-in's own alert (HIG Alerts). It used the browser's confirm() and alert(): an unstyled box headed
   "shoreline.pravix.app says", "OK" for every answer, no dark mode. This one names its buttons, follows light and dark, is an
   action sheet on a phone, and Esc / Cmd-. (Ctrl-. off a Mac) cancels. Resolves true for the action, false for Cancel. */
function pvxAaCss(){
  if(document.getElementById('pvxAaCss')) return; var s=document.createElement('style'); s.id='pvxAaCss'; s.textContent=
      '.pvx-aa{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(6,10,20,.45)}'+
      '.pvx-aa-box{width:min(340px,100%);border-radius:18px;padding:20px 18px 16px;background:#fff;color:#1d1d1f;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35);font:15px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif}'+
      'body.dark .pvx-aa-box{background:#172440;color:#E8EEF8}'+
      '.pvx-aa-box:focus{outline:none}.pvx-aa-box h2{margin:0 0 6px;font-size:17px;font-weight:700;line-height:1.3}.pvx-aa-box p{margin:0 0 16px;font-size:13px;opacity:.82}'+
      '.pvx-aa-b{display:flex;gap:8px}.pvx-aa-b button{flex:1;min-height:44px;border-radius:12px;border:0;padding:0 12px;font-family:inherit;font-size:15px;font-weight:600;line-height:1;background:rgba(127,127,127,.16);color:inherit;cursor:pointer}'+
      '.pvx-aa-b .pvx-aa-ok{background:#38BDD2;color:#04121A}.pvx-aa-b button:focus-visible{outline:2px solid #38BDD2;outline-offset:2px}'+
      '.pvx-aa{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}'+
      '@media (max-width:700px){.pvx-aa{place-items:end center}.pvx-aa-b{flex-direction:column-reverse}}'+
      '#sbLogin #sbErr.pvx-info{color:inherit;opacity:.74}';
  document.head.appendChild(s);
}
function pvxAuthAlert(o){
  return new Promise(function(res){
    var d=document, back=d.activeElement, w=d.createElement('div'), k=String(Date.now());
    function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    pvxAaCss();
    w.className='pvx-aa';
    w.innerHTML='<div class="pvx-aa-box" role="alertdialog" aria-modal="true" aria-labelledby="pvxAaT'+k+'" aria-describedby="pvxAaM'+k+'" tabindex="-1">'
      +'<h2 id="pvxAaT'+k+'">'+esc(o.title)+'</h2><p id="pvxAaM'+k+'">'+esc(o.msg)+'</p><div class="pvx-aa-b">'
      +(o.cancel?'<button type="button" data-v="0">'+esc(o.cancel)+'</button>':'')+'<button type="button" data-v="1" class="pvx-aa-ok">'+esc(o.ok)+'</button></div></div>';
    d.body.appendChild(w);
    function trap(e){ if(w.parentNode&&!w.contains(e.target)){ try{ w.querySelector('.pvx-aa-ok').focus(); }catch(x){} } }   /* modal: focus can't wander behind it */
    function end(v){ d.removeEventListener('keydown',key,true); d.removeEventListener('focusin',trap,true); if(w.parentNode) w.parentNode.removeChild(w); try{ if(back&&back.focus) back.focus(); }catch(e){} res(v); }
    function key(e){
      if(e.key==='Escape'||((e.metaKey||e.ctrlKey)&&!e.altKey&&e.key==='.')){ e.preventDefault(); e.stopPropagation(); end(!o.cancel); return; }
      if(e.key==='Tab'){ var b=[].slice.call(w.querySelectorAll('button')), i=b.indexOf(d.activeElement); e.preventDefault(); e.stopPropagation(); b[(i+(e.shiftKey?-1:1)+b.length)%b.length].focus(); } }
    w.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('button'); if(b) end(b.getAttribute('data-v')==='1'); });
    d.addEventListener('keydown',key,true); d.addEventListener('focusin',trap,true);
    try{ w.querySelector('.pvx-aa-ok').focus(); }catch(e){}
  });
}
/* PVX-N369: what happened at sign-in, said in place on the sign-in card (Brand §9.1: alerts only for decisions). The sign-out that
   follows shows the card (or keeps it), which picks the note up and puts its Sign in button back. A note that isn't a problem
   (info) is in the card's text colour, not red, until the person types or signs in again. */
var PVX_AUTH_NOTE='', PVX_AUTH_INFO=false;
function pvxAuthTone(e0,info){
  if(!e0) return; pvxAaCss(); e0.classList.toggle('pvx-info',!!info); var f=e0.closest&&e0.closest('form'); if(!info||!f) return;
  var off=function(){ e0.classList.remove('pvx-info'); f.removeEventListener('input',off,true); f.removeEventListener('submit',off,true); };
  f.addEventListener('input',off,true); f.addEventListener('submit',off,true);
}
function pvxAuthNote(t,info){ PVX_AUTH_NOTE=String(t||''); PVX_AUTH_INFO=!!info; var e0=document.getElementById('sbErr'); if(e0&&PVX_AUTH_NOTE){ e0.textContent=PVX_AUTH_NOTE; pvxAuthTone(e0,PVX_AUTH_INFO); } }
async function pvxActivateApprovedStaffMember(user){
  if(!user || !DB) return false;
  const approved={
    'daniel.giordano@pravix.app': {
      active:true,tenant_id:'shoreline',role:'owner',kura_owner:true,review_manager:true
    },
    'heather.galano@vca.com': {
      active:true,tenant_id:'shoreline',role:'management',kura_owner:false,review_manager:true
    }
  };
  const email=String(user.email||'').trim().toLowerCase();
  if(!Object.prototype.hasOwnProperty.call(approved,email)) return true;
  try{
    await user.reload();
    await user.getIdToken(true);
    // Existing Heather email/password authentication is sufficient for
    // prelaunch reviewer access; no additional verification email required.
    // The effective Firestore rules independently check the signed provider,
    // email, UID, hospital, exact role fields and temporary expiration.
    const heatherPasswordLogin = email==='heather.galano@vca.com' &&
      Array.isArray(user.providerData) &&
      user.providerData.some(p=>p&&p.providerId==='password');
    if(!user.emailVerified && !heatherPasswordLogin){
      const who=String(user.email||'your email');   /* PVX-N369: a Pravix alert for the decision; what happened is said in place on the sign-in card */
      if(await pvxAuthAlert({title:'Verify your email to use Pravix', msg:'Pravix needs to confirm '+who+' before your access can start. It will send you a link.', ok:'Send email', cancel:'Cancel'})){
        let sent=true; try{ await user.sendEmailVerification(); }catch(_){ sent=false; }
        pvxAuthNote(sent?'Link sent to '+who+'. Open it, then sign in again.':'The link didn’t send. Try again in a few minutes.', sent);
      } else pvxAuthNote('Verify your email, then sign in again.', true);
      return false;
    }
    const ref=DB.collection('staff_members').doc(user.uid);
    try{
      const existing=await ref.get();
      if(existing.exists && existing.data().active===true
          && existing.data().tenant_id==='shoreline') return true;
    }catch(_){ /* A missing membership is intentionally unreadable. */ }
    await ref.set(approved[email]);
    const verified=await ref.get();
    if(!verified.exists || verified.data().active!==true
        || verified.data().tenant_id!=='shoreline'){
      throw new Error('Membership confirmation failed');
    }
    try{ if(typeof toast==='function') toast('Pravix access is active'); }catch(_){}
    return true;
  }catch(_){
    pvxAuthNote('Pravix couldn’t start your access. Check that your email is verified, then sign in again.');
    return false;
  }
}

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
try{ notify('New message from family', bcEsc((p.name+' '+(p.last||'')).trim()), {icon:'info', color:'#0A84FF', dur:8000, openLabel:'Open the conversation', open:(function(pid){ return function(){ pvxOpenThread(pid); }; })(p.id)}); }catch(e){}   /* PVX-N376 */
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



/* ═════════ VISITS — open visits + the last 30 days, not every visit ever (Oct 2026) ═════════
   Flow listened to every visit ever recorded: fine at first, slower every month. Now three live queries, merged by visit:
     open (is_active) · in the hospital (Admitted / Hospitalized — is_active is false for those) · saved in the last 30 days (last_at).
   The last one needs a composite index (visits: tenant_id ↑ last_at ↑). Until it exists, or if any query is refused, Flow falls
   back to the full list it always used, so nothing goes missing; the console says why. Older visits are read only when needed:
   fvVisitHistory() (Rounds archive) and fvVisitsByName() (flags from a visit more than 30 days ago). */
var FV_RECENT_DAYS=30;
function fvVisitsAll(){ return DB.collection('visits').where('tenant_id','==',TENANT_ID); }
function fvVisitQueries(){ var b=fvVisitsAll(), cut=new Date(Date.now()-FV_RECENT_DAYS*864e5).toISOString();
  return [b.where('is_active','==',true), b.where('status','in',['Admitted','Hospitalized']), b.where('last_at','>=',cut)]; }
function fvMerge(lists){ var seen={}, out=[]; lists.forEach(function(L){ (L||[]).forEach(function(d){ if(!seen[d.id]){ seen[d.id]=1; out.push(d); } }); }); return out; }
function fvVisitsListen(onDocs,onErr,opts){ opts=opts||{};
  var qs=fvVisitQueries(), parts=qs.map(function(){ return null; }), cache=qs.map(function(){ return false; }), subs=[], full=null, dead=false, t=null;
  var rdc=!!window.__rdFeed; window.__rdFeed=0; try{ rdc&&window.rdLoadFeed&&rdLoadFeed(qs.length); }catch(e){}   /* n273: only Flow's own feed (Backend) counts for Rounds' loader */
  function flush(){ t=null; if(dead||full) return; Backend._visitsMode='recent'; onDocs(fvMerge(parts),{fromCache:cache.some(Boolean),real:parts.every(function(x,i){ return !cache[i]||(x&&x.length); })}); }
  function fallback(err){ if(dead||full) return; console.warn('[visits] loading the full list instead —',(err&&err.message)||err);
    subs.forEach(function(u){ try{ u(); }catch(e){} }); subs=[]; Backend._visitsMode='all'; try{ rdc&&window.rdLoadFeed&&rdLoadFeed(1); }catch(e){}
    full=fvVisitsAll().onSnapshot(opts,function(s){ try{ rdc&&window.rdLoadPart&&rdLoadPart(0,!!s.metadata.fromCache,s.docs.length); }catch(e){} onDocs(s.docs,{fromCache:!!s.metadata.fromCache}); },onErr||function(){}); }
  qs.forEach(function(q,i){ subs.push(q.onSnapshot(opts,function(s){ parts[i]=s.docs; cache[i]=!!s.metadata.fromCache; try{ rdc&&window.rdLoadPart&&rdLoadPart(i,cache[i],s.docs.length); }catch(e){}
      if(parts.every(function(x){ return x!==null; })&&!t) t=setTimeout(flush,0); },   /* one change seen by two queries (a discharge) lands as one update */
    function(err){ fallback(err); })); });
  return function(){ dead=true; if(t) clearTimeout(t); subs.forEach(function(u){ try{ u(); }catch(e){} }); if(full) try{ full(); }catch(e){} }; }
function fvVisitsGet(){ return Promise.all(fvVisitQueries().map(function(q){ return q.get(); })).then(function(S){ Backend._visitsMode='recent'; return fvMerge(S.map(function(s){ return s.docs; })); })
  .catch(function(err){ console.warn('[visits] loading the full list instead —',(err&&err.message)||err); Backend._visitsMode='all'; return fvVisitsAll().get().then(function(s){ return s.docs; }); }); }
/* n92 — live connection guard (Safari / sleeping iPads / flaky Wi-Fi).
   The board is only ever replaced by an answer from the server. Cached answers that would empty it are ignored; a feed that errors
   restarts itself (2 s, 4 s … 30 s); waking the screen or coming back online re-checks with the server; the capsule says when it is not live. */
function fvVisitsGetServer(){ var o={source:'server'};
  return Promise.all(fvVisitQueries().map(function(q){ return q.get(o); })).then(function(S){ Backend._visitsMode='recent'; return fvMerge(S.map(function(s){ return s.docs; })); })
  .catch(function(err){ if(err&&/unavailable|offline|network/i.test((err.code||'')+' '+(err.message||''))) throw err;
    return fvVisitsAll().get(o).then(function(s){ Backend._visitsMode='all'; return s.docs; }); }); }
function fvKeepBoard(docs,meta){
  try{ if(!meta||!meta.fromCache||(docs&&docs.length)) return false;
    var have=PATIENTS.some(function(p){ return p&&!p._demo; }); if(!have) return false;
    console.warn('[visits] ignored an empty cached update — keeping the board'); fvConfirmLive(); return true; }catch(e){ return false; } }
var _fvConfT=null;
function fvConfirmLive(){ if(_fvConfT) return; _fvConfT=setTimeout(function(){ _fvConfT=null;
  fvVisitsAll().limit(1).get({source:'server'}).then(function(s){ Backend._liveAt=Date.now(); Backend._retry=0; if(!Backend._gotVisits){ if(!s||!s.docs||!s.docs.length){ Backend._gotVisits=true; try{ renderRounds(true); }catch(e){} } else if(!Backend._n273fetch){ Backend._n273fetch=1; Backend.refetch(); } } if(Backend.conn!=='live') Backend.setConn('live'); })
  .catch(function(){ Backend.setConn('reconnecting'); fvResubscribeSoon(); }); },400); }
var _fvRetryT=null;
function fvResubscribeSoon(){ if(_fvRetryT) return; var n=Backend._retry=(Backend._retry||0)+1, wait=Math.min(30000,1000*Math.pow(2,n));
  _fvRetryT=setTimeout(function(){ _fvRetryT=null; if(!navigator.onLine){ fvResubscribeSoon(); return; }
    try{ if(Backend._subVisits) Backend._subVisits(); Backend.refetch(); }catch(e){} },wait); }
(function(){ var hidAt=0;
  function wake(){ try{ if(Backend.mode!=='staff'||!Backend._subVisits) return; if(!AUTH||!AUTH.currentUser) return;
    Backend._subVisits(); Backend.refetch(); }catch(e){} }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'){ hidAt=Date.now(); return; } if(hidAt&&Date.now()-hidAt>20000) wake(); hidAt=0; });
  window.addEventListener('pageshow',function(e){ if(e&&e.persisted) wake(); });   /* Safari back/forward cache */
  setInterval(function(){ try{ if(Backend.mode==='staff'&&Backend.conn!=='live'&&navigator.onLine&&Backend._subVisits&&!_fvRetryT) fvConfirmLive(); }catch(e){} },15000);   /* n92c: a cheap server check, not a full re-subscribe */
})();
var _fvHist=null;
function fvVisitHistory(){ if(_fvHist&&Date.now()-_fvHist.at<10*60000) return _fvHist.p;
  var p=fvVisitsAll().get().then(function(s){ return s.docs.map(function(d){ return mapToApp(Object.assign({id:d.id},d.data())); }); }); _fvHist={at:Date.now(),p:p}; p.catch(function(){ _fvHist=null; }); return p; }
function fvVisitsByName(full){ var n=String(full||'').trim().replace(/\s+/g,' '); if(!n) return Promise.resolve([]);
  var tc=n.toLowerCase().replace(/(^|[\s'-])(\S)/g,function(m,a,b){ return a+b.toUpperCase(); }), v=[n,tc,n.toUpperCase(),n.toLowerCase()].filter(function(x,i,A){ return A.indexOf(x)===i; });
  return fvVisitsAll().where('patient_name','in',v).get().then(function(s){ return s.docs.map(function(d){ return mapToApp(Object.assign({id:d.id},d.data())); }); }); }

function loadState(){ try{ Backend.init(); }catch(e){ if(SB) Backend.setConn('error'); } }




/* Oct 2026 — a copy, never the live objects: triage / intake are edited in place, and a live reference made every later change invisible */
function fvRowsCopy(list){ return (list||[]).map(function(p){ try{ return JSON.parse(JSON.stringify(mapToDb(p))); }catch(e){ return mapToDb(p); } }); }
function pvxPersistEvt(state,at){ try{ window.dispatchEvent(new CustomEvent('pvx:persist',{detail:{state:state,at:at}})); }catch(e){} }   /* PVX-N148 */
function persist(){
if(_persistLock) return;
if(Backend.mode!=='staff'|| !DB){ pvxPersistEvt('off',Date.now()); return; }   /* PVX-N148 */

const LIVE = PATIENTS.filter(function(p){ return !p._demo; });
LIVE.forEach(function(p){ if(!p.publicToken) p.publicToken=genToken(); if(!p.trackCode) p.trackCode=genTrackCode(); });
const rows = LIVE.map(mapToDb);
const prev = {}; (Backend._lastRows||[]).forEach(function(r){ prev[r.id]=JSON.stringify(r); });
const changed = LIVE.filter(function(p,i){ return prev[rows[i].id] !== JSON.stringify(rows[i]); });
if(!changed.length){ pvxPersistEvt('idle',Date.now()); return; }   /* PVX-N148: nothing waiting = everything is on the server */
clearTimeout(persist._t);
persist._t = setTimeout(async function(){
const pvxAt=Date.now();   /* PVX-N148: what this write covers */
try{
const batch = DB.batch();
changed.forEach(function(p){
if(typeof fvSaveVisit==='function') fvSaveVisit(batch,p,prev); else batch.set(DB.collection('visits').doc(String(p.id)), mapToDb(p));
batch.set(DB.collection('pub').doc(p.publicToken), safeProjection(p), { merge:true });
fxLobbyWrite(batch,p);
if(typeof fxCodesSync==='function') fxCodesSync([p],true);   /* n118: codes/{CODE}-{pet name}, its own batch (codes_n118.js) */
});
try{ await batch.commit(); }catch(err){ changed.forEach(function(p){ delete _fxLobby[String(p.id)]; }); throw err; /* Never rewrite a potentially stale entire patient record after a failed batch. */ }
Backend._lastRows = fvRowsCopy(LIVE);
if(Backend.conn!=='live') Backend.setConn('live');
pvxPersistEvt('saved',pvxAt);   /* PVX-N148: the server confirmed */
}catch(e){ Backend.setConn('error'); pvxPersistEvt('error',pvxAt); }
}, 250);
}




function showLogin(msg){
var existing=document.getElementById('sbLogin');
var pvxNoteInfo=false; if(!msg&&PVX_AUTH_NOTE){ msg=PVX_AUTH_NOTE; pvxNoteInfo=PVX_AUTH_INFO; PVX_AUTH_NOTE=''; }   /* PVX-N369 */
if(existing){ if(msg){ var e0=existing.querySelector('#sbErr'); if(e0){ e0.textContent=msg; pvxAuthTone(e0,pvxNoteInfo); } var b0=existing.querySelector('#sbBtn'); if(b0&&b0.disabled&&!b0.classList.contains('signed')){ b0.disabled=false; b0.textContent='Sign in'; } } return; }
var ov=document.createElement('div'); ov.id='sbLogin';
ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Sign in to Pravix');
ov.innerHTML=`<div class="login-wrap"><form class="card" id="sbLoginForm" novalidate><div class="brand"><img class="pravix-logo-img logo-lite" src="assets/img/pravix-logo-lite.png" alt="Pravix"><img class="pravix-logo-img logo-drk" src="assets/img/pravix-logo-drk.png" alt="Pravix"><div class="product">Shoreline Patient Flow</div><div class="secure-line"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>Secure sign in</div></div><div class="heading"><h1>${Backend.mode==='lobby'?'Lobby screen':'Sign in to Pravix'}</h1><p id="sbLead">${Backend.mode==='lobby'?'Sign in with the lobby screen account to show the waiting-room display.':'Sign in with your own account.'}</p></div><div class="form-stack"><label class="field-label" for="sbEmail">Email</label><div class="field"><div class="lock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="3"></rect><path d="m5.5 8 6.5 5 6.5-5"></path></svg></div><input id="sbEmail" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="name@vca.com" /></div><label class="field-label" for="sbPass" style="margin-top:10px">Password</label><div class="field"><div class="lock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="3"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg></div><input id="sbPass" type="password" autocomplete="current-password" placeholder="Enter password" /><button class="reveal" id="sbReveal" type="button" aria-label="Show password"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg></button></div><div class="caps-hint" id="sbCaps">Caps Lock is on</div><div class="error" id="sbErr" role="status" style="height:auto;min-height:23px"></div><button type="button" id="sbForgot" style="display:block;margin:2px auto 12px;background:none;border:none;color:var(--accent);font:inherit;font-size:0.75rem;font-weight:600;cursor:pointer;">Forgot password?</button><button class="continue is-inactive" id="sbBtn" type="submit">Sign in</button></div></form><div class="page-foot"><b>VCA Shoreline</b> · Protected Pravix Workspace</div></div>`;
document.body.appendChild(ov);
document.body.classList.add('sb-locked');
document.querySelectorAll('.app, #mesh').forEach(function(el){ try{ el.setAttribute('inert',''); }catch(e){} });
var form=ov.querySelector('#sbLoginForm'), email=ov.querySelector('#sbEmail'), password=ov.querySelector('#sbPass'),
reveal=ov.querySelector('#sbReveal'), btn=ov.querySelector('#sbBtn'), error=ov.querySelector('#sbErr'),
card=ov.querySelector('.card'), loginWrap=ov.querySelector('.login-wrap'), capsHint=ov.querySelector('#sbCaps'),
emailField=email.closest('.field'), passwordField=password.closest('.field');
if(msg && error){ error.textContent=msg; pvxAuthTone(error,pvxNoteInfo); }   /* PVX-N369 */
function updateButtonState(){ var ready=email.value.trim() && password.value.trim(); btn.classList.toggle('is-inactive', !ready); }
reveal.addEventListener('click', function(){ var showing=password.type==='text'; password.type=showing?'password':'text'; reveal.setAttribute('aria-label', showing?'Show password':'Hide password'); password.focus(); });
[email,password].forEach(function(el){ el.addEventListener('input', function(){ if(error.textContent) error.textContent=''; updateButtonState(); }); });
var forgot=ov.querySelector('#sbForgot');
if(forgot){ forgot.addEventListener('click', async function(){
var em=email.value.trim();
if(!em){ error.textContent='Enter your email above, then choose Forgot password.'; shake(emailField); email.focus(); return; }
forgot.disabled=true;
try{ await AUTH.sendPasswordResetEmail(em); error.textContent='Reset link sent to '+em+'. Check your inbox and spam.'; }
catch(e2){ error.textContent='Could not send a reset email — check the address and try again.'; }
forgot.disabled=false;
}); }
function capsCheck(e){ if(typeof e.getModifierState==='function') capsHint.classList.toggle('show', e.getModifierState('CapsLock')); }
password.addEventListener('keydown', capsCheck); password.addEventListener('keyup', capsCheck);
password.addEventListener('blur', function(){ capsHint.classList.remove('show'); });
email.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); password.focus(); } });
password.addEventListener('keydown', function(e){ if(e.key==='Enter'&& email.value.trim() && password.value.trim()){ e.preventDefault(); form.requestSubmit(); } });
[emailField,passwordField].forEach(function(f){ f.addEventListener('animationend', function(){ f.classList.remove('error-shake'); }); });
card.addEventListener('pointermove', function(e){ var r=card.getBoundingClientRect(); card.style.setProperty('--mx', ((e.clientX-r.left)/r.width*100)+'%'); card.style.setProperty('--my', ((e.clientY-r.top)/r.height*100)+'%'); });
card.addEventListener('pointerleave', function(){ card.style.setProperty('--mx','50%'); card.style.setProperty('--my','18%'); });
function shake(field){ field.classList.remove('error-shake'); void field.offsetWidth; field.classList.add('error-shake'); }
form.addEventListener('submit', async function(e){
e.preventDefault();
if(!email.value.trim()){ error.textContent='Enter your email address.'; shake(emailField); email.focus(); return; }
if(!password.value.trim()){ error.textContent='Enter your password.'; shake(passwordField); password.focus(); return; }
error.textContent=''; btn.disabled=true; btn.classList.remove('signed'); btn.innerHTML='Signing in <span class="signin-progress" aria-hidden="true"></span>';
try{


await AUTH.signInWithEmailAndPassword(email.value.trim(), password.value);

}catch(err){
var wrong = err && (err.code==='auth/wrong-password'||err.code==='auth/invalid-credential'||err.code==='auth/user-not-found'||err.code==='auth/invalid-login-credentials'||err.code==='auth/invalid-email');
error.textContent = wrong ?'Incorrect email or password. Please try again.':'Connection problem. Try again.';
shake(passwordField); btn.disabled=false; btn.classList.remove('signed'); btn.textContent='Sign in';
try{ password.select(); }catch(e2){} updateButtonState();
}
});
updateButtonState();
setTimeout(function(){ try{ email.focus(); }catch(e){} }, 250);
}

function sbFinishLogin(ov){
try{ var btn=ov.querySelector('#sbBtn'), wrap=ov.querySelector('.login-wrap');
if(btn){ btn.disabled=true; btn.classList.add('signed'); btn.innerHTML='Signed in <span class="checkmark" aria-hidden="true"></span>'; }
if(wrap) wrap.classList.add('success'); }catch(e){}
setTimeout(function(){ try{ ov.remove(); }catch(e){}
document.body.classList.remove('sb-locked');
document.querySelectorAll('.app, #mesh').forEach(function(el){ try{ el.removeAttribute('inert'); }catch(e){} });
}, 480);
}

if(typeof window!=='undefined'&& window.addEventListener){
window.addEventListener('offline', function(){ Backend.setConn('offline'); });
window.addEventListener('online',  function(){ if(Backend.mode==='staff'){ Backend.setConn('reconnecting'); Backend.refetch(); } });
}



let filters = {status:null, prio:null, doctor:null, liaison:null};
 
const HOSP_TZ = (function(){ try{ return (window.Pravix && Pravix.getHospitalSettings) ? (Pravix.getHospitalSettings().timezone||'America/New_York') :'America/New_York'; }catch(e){ return'America/New_York'; } })();
let _hospFmt=null;   /* built once (it was built per call — the slowest part of every render) */
function _hospDayKey(d){ try{ if(!_hospFmt) _hospFmt=new Intl.DateTimeFormat('en-CA',{timeZone:HOSP_TZ,year:'numeric',month:'2-digit',day:'2-digit'}); return _hospFmt.format(new Date(d)); }catch(e){ return new Date(d).toDateString(); } }



function isTodayHosp(d){ return d ? _hospDayKey(d)===_hospDayKey(new Date()) : false; }





let _hospDayNow = _hospDayKey(new Date());
function checkHospDayRollover(){
const k=_hospDayKey(new Date());
if(k!==_hospDayNow){ _hospDayNow=k; try{ if(typeof renderAll==='function') renderAll(); }catch(e){} }
}
setInterval(checkHospDayRollover, 30000);
function completedTodayCount(status){ return PATIENTS.filter(p=>p.status===status && p.completedAt && isTodayHosp(p.completedAt)).length; }
let searchQ ='';
let activePatient = null;
let _tlFreshOpen=false;
let triExpanded = false;
let recExpanded = false;
let activeLoc = null;
let currentView ='dashboard';



function initials(p){const a=(p.name||'').trim()[0]||'';const b=(p.last||'').trim()[0]||'';return bcEsc((a+b).toUpperCase());}
function spCls(p){return p.species==='Feline'?'sp-fel':'sp-can';}
function spTag(p){return p.species==='Feline'?'FEL':'CAN';}
 
function pmInitial(p){ return bcEsc(((p&&p.name?String(p.name):'').trim()[0]||'?').toUpperCase()); }
function speciesCode(p){ if(!p||!p.species) return''; const s=String(p.species).trim().toLowerCase();
const map={feline:'FEL',cat:'FEL',canine:'CAN',dog:'CAN',avian:'AVI',bird:'AVI',reptile:'REP',rabbit:'RAB',exotic:'EXO',other:'EXO'};
return map[s]||'OTH'; }
function monoInner(p){ const sp=speciesCode(p); return'<span class="pm-mono" aria-hidden="true"><span class="pm-init">'+pmInitial(p)+'</span>'+(sp?'<span class="pm-sp">'+sp+'</span>':'')+'</span>'; }


function mono(p,variant,css){
if(!variant) return`<div class="pt-emoji ${spCls(p)}">${initials(p)}<span class="sp-tag">${spTag(p)}</span></div>`;
const pc=PRIO_CLR[p.prio]||PRIO_CLR[3];
return`<div class="pt-emoji ${variant} priority-p${p.prio} ${spCls(p)}" style="${css?css+';':''}--gc:${pc.c};--gcrgb:${pc.rgb}">${monoInner(p)}</div>`;
}
function waitMinutes(p){return Math.round((now - p.arrival)/60000);}
/* n336: the most urgent first, as the Client Display and the Attention center already do: priority (P1 first), then the longest wait, then the name */
function pvxByUrgency(a,b){ const pa=Number(a&&a.prio)||9, pb=Number(b&&b.prio)||9; if(pa!==pb) return pa-pb; const wa=+(a&&a.arrival)||0, wb=+(b&&b.arrival)||0; if(wa!==wb) return wa-wb; return String(a&&a.name||'').localeCompare(String(b&&b.name||'')); }

function roomSince(p){
if(p.roomSince) return p.roomSince;
const moves=(p.timeline||[]).filter(e=>/moved (to|from).*room|moved to room|moved to/i.test(e.label));
if(moves.length) return moves[moves.length-1].at;
return p.arrival;
}
function roomMinutes(p){return Math.max(0, Math.round((now - roomSince(p))/60000));}
function fmtWait(min){ min=Math.max(0,Math.round(min)); if(min<60) return min+'m'; const h=Math.floor(min/60),m=min%60; return m? h+'h '+m+'m': h+'h'; }
function fmtTime(d){let h=d.getHours(),m=d.getMinutes();const ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+String(m).padStart(2,'0')+' '+ap;}
function docAv(id){const d=doc(id);return`<span class="dav" style="--dav-accent:${d.color}">${d.initials}</span>`;}
function liaAv(id){const l=liaison(id);return l?`<span class="dav lav" style="color:${l.color};border-color:${l.color}">${l.initials}</span>`:'';}
function statusPill(s){return`<span class="pill st-${s.toLowerCase()}"><span class="d"></span>${s}</span>`;}
function eventColor(label){
for(const s of STAGE_ORDER){ if(STATUSES[s] && label.toLowerCase().includes(s.toLowerCase())) return STATUSES[s].color; }
if(/doctor|liaison/i.test(label)) return'var(--accent)';
if(/checked in|arriv/i.test(label)) return STATUSES.Waiting.color;
if(/discharg/i.test(label)) return STATUSES.Discharged.color;
return'var(--accent)';
}
function isActive(p){return !(p.completed===true || p.active===false || p.status==='Discharged'|| p.status==='Admitted'|| p.status==='Euthanized'|| p.status==='Deceased');}
function isCompleted(p){return p.status==='Discharged'|| p.status==='Admitted'|| p.status==='Euthanized'|| p.status==='Deceased';}

function toast(msg){const t=document.getElementById('toast');document.getElementById('toastMsg').textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);}

 
const NOTE_ICONS = {
move:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
doctor:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>',
liaison:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20v-1a6 6 0 0 1 9.5-4"/><path d="M16 4a4 4 0 0 1 0 7.5"/></svg>',
discharge:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
room:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/></svg>',
info:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
check:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>'
};
/* PVX-N377: a message's title and text are data. Allowed: a few inline tags and links to this site; the rest is shown as text. */
const PVX_NOTE_TAGS={A:1,B:1,STRONG:1,I:1,EM:1,SPAN:1,SMALL:1,U:1,BR:1}, PVX_NOTE_ATTR={class:1,href:1,target:1,rel:1,'aria-label':1,'aria-hidden':1,lang:1,dir:1};
function pvxNoteHref(v){ try{ const u=new URL(String(v),location.href); return (u.protocol==='https:'||u.protocol==='http:')&&(u.origin===location.origin||(u.protocol==='https:'&&/(^|\.)pravix\.app$/.test(u.hostname))); }catch(e){ return false; } }
function pvxNoteFrag(html){ const t=document.createElement('template'); t.innerHTML=String(html==null?'':html);
  (function walk(n){ Array.prototype.slice.call(n.childNodes).forEach(function(c){ if(c.nodeType===3) return; if(c.nodeType!==1){ c.remove(); return; }
      if(!PVX_NOTE_TAGS[c.tagName]||c.namespaceURI!=='http://www.w3.org/1999/xhtml'){ c.replaceWith(document.createTextNode(c.outerHTML)); return; }
      Array.prototype.slice.call(c.attributes).forEach(function(a){ const k=a.name.toLowerCase(); if(!PVX_NOTE_ATTR[k]||(k==='href'&&!pvxNoteHref(a.value))) c.removeAttribute(a.name); });
      if(c.tagName==='A'&&c.getAttribute('target')) c.setAttribute('rel','noopener');
      walk(c); }); })(t.content);
  return t.content; }
function pvxNoteColor(c){ c=String(c==null?'':c); return /^[#\w(),.%\s-]{1,60}$/.test(c)?c:'var(--accent)'; }
window.pvxNoteFrag=pvxNoteFrag;
function notify(title, sub, opts){
opts=opts||{};
const wrap=document.getElementById('notes'); if(!wrap) return;
const el=document.createElement('div'); el.className='note';
el.innerHTML=`<div class="n-ic" style="background:${pvxNoteColor(opts.color||'var(--accent)')}">${NOTE_ICONS[opts.icon]||NOTE_ICONS.info}</div>
    <div class="n-body"><div class="n-title"></div>${sub?`<div class="n-sub"></div>`:''}</div>
    <div class="n-time" aria-hidden="true" data-at="${Date.now()}">now</div>`;
el.querySelector('.n-title').appendChild(pvxNoteFrag(title)); if(sub) el.querySelector('.n-sub').appendChild(pvxNoteFrag(sub));   /* PVX-N377 */
if(typeof opts.open==='function'){ el.classList.add('n-open'); const tt=el.querySelector('.n-title'), go=document.createElement('button'); go.type='button'; go.className='n-go'; while(tt.firstChild) go.appendChild(tt.firstChild);
  go.setAttribute('aria-label', go.textContent+'. '+(opts.openLabel||'Open')); tt.appendChild(go);
  el.addEventListener('click',function(e){ if(e.target.closest('.n-x,a')) return; el.classList.add('hide'); setTimeout(()=>el.remove(),480); try{ opts.open(); }catch(x){ console.warn('[note]',x); } }); }   /* PVX-N376 */
wrap.appendChild(el);
RAF ? RAF(()=>el.classList.add('show')) : el.classList.add('show');
if(opts.sticky){ el.setAttribute('role','alert'); el.classList.add('sticky'); const x=document.createElement('button'); x.type='button'; x.className='n-x'; x.setAttribute('aria-label','Dismiss'); x.innerHTML=(window.PVX_GI?PVX_GI.xmark:'×');
  x.onclick=()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(),480); }; el.appendChild(x); }   /* PVX-N197: a failure waits to be read */
else setTimeout(()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(),480); }, opts.dur||4200);
while(wrap.children.length>4){ const old=[...wrap.children].find(n=>!n.classList.contains('sticky'))||wrap.firstChild; old.remove(); }   /* PVX-N197: the oldest routine message goes first */
}



let ddOpen=null;
function createDropdown({items, selectedId=null, placeholder='Select', searchPlaceholder='Search…', variant='', onSelect, label=''}){
const lid='pvxdd'+(createDropdown.n=(createDropdown.n||0)+1);   /* PVX-N205 */
const field=label||String(placeholder).replace(/^(Assign|Add|Select)\s+(an?\s+)?/i,'').replace(/^All\s+/i,'Filter by ').replace(/^./,c=>c.toUpperCase());
const root=document.createElement('div');
root.className='dd'+(variant==='compact'?' dd-compact':'');
let sel=selectedId, hl=-1, q='';
const chev='<span class="chev"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const avatar=d=> d.badge ? '<span class="dd-badge" aria-hidden="true">'+d.badge+'</span>'
: d.initials ?`<span class="dd-av" aria-hidden="true">${d.initials}</span>`
:`<span class="dd-av dd-av-dot" aria-hidden="true" style="background:${d.color}"></span>`;
const parts=h=>{ const x=document.createElement('div'); x.innerHTML=String(h==null?'':h); return [...x.childNodes].map(n=>(n.textContent||'').trim()).filter(Boolean); };   /* PVX-N360: words, not run together */
const said=d=>parts(d.name).join(', ');
root.innerHTML=`
    <button type="button" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="${lid}"></button>
    <div class="dd-panel" role="presentation">
      <div class="dd-search">${searchIcon}<input type="text" placeholder="${searchPlaceholder}" aria-label="${String(searchPlaceholder||'Search').replace(/…$/,'')}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="${lid}"/><button type="button" class="dd-clear" aria-label="Clear search" title="Clear" tabindex="-1" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".32"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button></div>
      <div class="dd-list" role="listbox" id="${lid}" aria-label="${field}"></div>
    </div>`;
const trigger=root.querySelector('.dd-trigger');
const panel=root.querySelector('.dd-panel');
const input=root.querySelector('.dd-search input');
if(items.length<=6){ panel.classList.add('dd-short'); input.setAttribute('aria-label', field); input.removeAttribute('placeholder'); }   /* PVX-N360 */
const list=root.querySelector('.dd-list');
const selItem=()=>items.find(i=>i.id===sel);
function renderTrigger(){
const d=selItem();
trigger.innerHTML = d
?`${avatar(d)}<span class="dd-name">${d.name}</span>${chev}`
:`<span class="dd-placeholder">${placeholder}</span>${chev}`;
trigger.setAttribute('aria-label', field+': '+(d?(parts(d.name)[0]||'none'):'none'));
}
const matches=()=>{const t=q.trim().toLowerCase();return t?items.filter(i=>i.name.toLowerCase().includes(t)):items;};
function renderList(){
const ms=matches();
if(!ms.length){list.innerHTML='<div class="dd-empty" role="status">No matches for “'+bcEsc(q.trim())+'”</div>';return;}
list.innerHTML=ms.map((i,idx)=>`
      <div class="dd-opt ${i.id===sel?'sel':''} ${idx===hl?'hl':''}${i.none?' dd-none':''}" data-id="${i.id}" role="option" id="${lid}-o${idx}" aria-selected="${i.id===sel}" aria-label="${said(i).replace(/"/g,'&quot;')}">
        ${avatar(i)}<span class="dd-name">${i.name}</span>
        <span class="dd-check"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 7 9.5 17 5 12.5"/></svg></span>
      </div>`).join('');
list.querySelectorAll('.dd-opt').forEach(o=>o.onclick=()=>choose(o.dataset.id));
if(hl>=0&&ms[hl]) input.setAttribute('aria-activedescendant',lid+'-o'+hl); else input.removeAttribute('aria-activedescendant');
}
function choose(id){sel=id;renderTrigger();close();if(onSelect)onSelect(id);}

function reposition(){
const r=trigger.getBoundingClientRect();
panel.style.position='fixed'; panel.style.zIndex='1000'; panel.style.right='auto';
panel.style.width=r.width+'px'; panel.style.left=r.left+'px'; panel.style.top=(r.bottom+6)+'px';
const pw=panel.offsetWidth, ph=panel.offsetHeight, vw=innerWidth, vh=innerHeight, M=8;
let left=Math.max(M, Math.min(r.left, vw-M-pw));
let top=r.bottom+6;
if(top+ph>vh-M){ const above=r.top-6-ph; top = above>=M ? above : Math.max(M, vh-M-ph); }
panel.style.left=left+'px'; panel.style.top=top+'px';
}
function open(){
if(ddOpen && ddOpen.close!==close) ddOpen.close();
document.body.appendChild(panel);
root.classList.add('open'); panel.classList.add('open'); trigger.setAttribute('aria-expanded','true');
q='';input.value='';hl=-1;if(clr) clr.hidden=true;renderList();
reposition();
window.addEventListener('scroll', reposition, true);
window.addEventListener('resize', reposition);
ddOpen={close, root, panel};
setTimeout(()=>input.focus(),50);
}
function close(){
window.removeEventListener('scroll', reposition, true);
window.removeEventListener('resize', reposition);
panel.classList.remove('open'); root.classList.remove('open'); trigger.setAttribute('aria-expanded','false');
panel.style.position=panel.style.top=panel.style.left=panel.style.right=panel.style.width=panel.style.zIndex='';
if(panel.parentNode!==root) root.appendChild(panel);
if(ddOpen && ddOpen.close===close){ ddOpen=null; if(window.__pvxDdClosed) setTimeout(window.__pvxDdClosed,0); }   /* PVX-N360 */
}
trigger.onclick=e=>{e.stopPropagation();root.classList.contains('open')?close():open();};
const clr=root.querySelector('.dd-clear'), syncClr=()=>{ if(clr) clr.hidden=!input.value; };   /* PVX-N361 */
if(clr){ clr.addEventListener('mousedown',e=>e.preventDefault()); clr.addEventListener('click',e=>{ e.stopPropagation(); input.value=''; q=''; hl=-1; syncClr(); renderList(); input.focus(); }); }
input.addEventListener('input',syncClr);
input.addEventListener('input',()=>{ if(panel.classList.contains('dd-short')){ const t=input.value.trim().toLowerCase(); input.value=''; q=''; const k=t?items.findIndex(i=>said(i).toLowerCase().split(/[^a-z0-9]+/).some(w=>w&&w.startsWith(t))):-1; if(k>=0) hl=k; renderList(); scrollHl(); return; } q=input.value;hl=-1;renderList();});
input.addEventListener('keydown',e=>{
const ms=matches();
if(e.key==='ArrowDown'){e.preventDefault();hl=Math.min(ms.length-1,hl+1);renderList();scrollHl();}
else if(e.key==='ArrowUp'){e.preventDefault();hl=Math.max(0,hl-1);renderList();scrollHl();}
else if(e.key==='PageDown'){e.preventDefault();hl=Math.min(ms.length-1,(hl<0?0:hl)+6);renderList();scrollHl();}
else if(e.key==='PageUp'){e.preventDefault();hl=Math.max(0,(hl<0?0:hl)-6);renderList();scrollHl();}
else if(e.key==='Home'){e.preventDefault();hl=0;renderList();scrollHl();}
else if(e.key==='End'){e.preventDefault();hl=ms.length-1;renderList();scrollHl();}
else if(e.key==='Enter'){e.preventDefault();if(ms[hl])choose(ms[hl].id);else if(ms.length===1)choose(ms[0].id);}
else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();try{trigger.focus({preventScroll:true});}catch(x){}}   /* PVX-N361 */
else if(e.key==='Tab'){e.preventDefault();}
});

list.addEventListener('wheel',e=>{ e.stopPropagation(); },{passive:true});
list.addEventListener('touchmove',e=>{ e.stopPropagation(); },{passive:true});
function scrollHl(){const el=list.querySelector('.dd-opt.hl');if(el)el.scrollIntoView({block:'nearest'});}
renderTrigger();
return root;
}

document.addEventListener('click',e=>{
if(ddOpen && !ddOpen.root.contains(e.target) && !ddOpen.panel.contains(e.target)) ddOpen.close();
});



const CARE_TEAM_CONFIG = {
directoryUrl:'https://shoreline.pravix.app/directory',


serviceContacts: {},

services: ['Emergency service','Internal Medicine service','Surgery service','Neurology service','Oncology service','Urgent Care service']
};
const CT_ROLES = [
{ id:'primary',    label:'Primary clinician',                  mirror:true,  missing:'No primary clinician assigned'},
{ id:'technician', label:'Technician',                         multi:true,   missing:'No technician assigned'},
{ id:'supervising',label:'Supervising clinician',              opt:'when applicable', missing:'No supervising clinician'},
{ id:'consulting', label:'Consulting clinician / service',     opt:'optional', missing:'No consult recorded'},
{ id:'covering',   label:'After-hours / covering',             opt:'optional', missing:'No covering clinician or service'}
];
const CT_KIND_LABEL = { doctor:'Emergency doctor', im:'Internal Medicine', liaison:'Liaison', service:'Service', manual:'Staff (entered by name)'};
function ctRole(id){ return CT_ROLES.find(r=>r.id===id) || CT_ROLES[0]; }
function ctEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function ctIso(d){ return d ? (d instanceof Date ? d.toISOString() : String(d)) : null; }
function ctFmt(iso){ if(!iso) return''; const d=new Date(iso); if(isNaN(d)) return''; const today=new Date(); const same=d.toDateString()===today.toDateString(); return (same?'':d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' ')+fmtTime(d); }
function ctUid(){ return'ct-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7); }

 
/* ctRoster · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctRoster(){ return pvxRun('ctRoster',ctRoster$base,this,arguments); }
function ctRoster$base(){
const out=[];
DOCTORS.forEach(d=>out.push({ id:d.id, name:d.name, kind:'doctor', initials:d.initials, color:d.color }));
(typeof IM_DOCTORS!=='undefined'?IM_DOCTORS:[]).forEach(d=>{ if(!out.some(x=>x.id===d.id)) out.push({ id:d.id, name:d.name, kind:'im', initials:d.initials, color:d.color }); });
LIAISONS.forEach(l=>{ if(!out.some(x=>x.id===l.id)) out.push({ id:l.id, name:l.name, kind:'liaison', initials:l.initials, color:l.color }); });
CARE_TEAM_CONFIG.services.forEach(s=>out.push({ id:'svc-'+docSlug(s), name:s, kind:'service', initials:s.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(), color:'var(--ink-400)'}));
return out;
}
function ctStaff(id, fallbackName, kind){
const r=ctRoster().find(x=>x.id===id);
if(r) return r;
const name=fallbackName||id||'Unknown';
return { id, name, kind:kind||'manual', initials:docInitials(name), color:'var(--ink-400)'};
}
function ctProfileUrl(a){ if(!a || a.staffKind==='service'|| !CARE_TEAM_CONFIG.directoryUrl) return null; return CARE_TEAM_CONFIG.directoryUrl.replace(/[?#].*$/,'')+'?staff='+encodeURIComponent(String(a.staffId).replace(/^manual:/,'')); }

 
function ctList(p){ if(!p.careTeam || !Array.isArray(p.careTeam.assignments)) p.careTeam={ assignments:[] }; return p.careTeam.assignments; }
function ctCurrent(p, role){ return ctList(p).filter(a=>a.status==='current'&& (!role || a.role===role)); }
function ctPending(p, role){ return ctList(p).filter(a=>a.status==='pending'&& (!role || a.role===role)); }
function ctEnded(p){ return ctList(p).filter(a=>a.status==='ended').sort((a,b)=>String(b.endAt||'').localeCompare(String(a.endAt||''))); }
/* ctTouch · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctTouch(a){ return pvxRun('ctTouch',ctTouch$base,this,arguments); }
function ctTouch$base(a){ a.updatedAt=new Date().toISOString(); a.updatedBy=CURRENT_USER; }
function ctLastUpdate(p){ return ctList(p).reduce((m,a)=>(!m||String(a.updatedAt)>String(m.updatedAt))?a:m, null); }
function ctToDb(ct){ const L=(ct&&Array.isArray(ct.assignments))?ct.assignments:[]; return { assignments: L.map(a=>({ id:a.id, patient_id:a.patientId, staff_id:a.staffId, staff_name:a.staffName||'', staff_kind:a.staffKind||'manual', role:a.role, status:a.status,
start_at:ctIso(a.startAt), end_at:ctIso(a.endAt), updated_at:ctIso(a.updatedAt), updated_by:a.updatedBy||'', proposed_by:a.proposedBy||null, confirmed_by:a.confirmedBy||null, confirmed_at:ctIso(a.confirmedAt), ended_by:a.endedBy||null, end_reason:a.endReason||null, note:a.note||'', actor_uid:a.actorUid||null })) }; }
function ctToApp(row){ const L=(row&&Array.isArray(row.assignments))?row.assignments:[]; return { assignments: L.map(a=>({ id:a.id, patientId:a.patient_id, staffId:a.staff_id, staffName:a.staff_name||'', staffKind:a.staff_kind||'manual', role:a.role, status:a.status,
startAt:a.start_at||null, endAt:a.end_at||null, updatedAt:a.updated_at||null, updatedBy:a.updated_by||'', proposedBy:a.proposed_by||null, confirmedBy:a.confirmed_by||null, confirmedAt:a.confirmed_at||null, endedBy:a.ended_by||null, endReason:a.end_reason||null, note:a.note||'', actorUid:a.actor_uid||null })) }; }

function ctEndAssignment(p, a, reason){
if(!a || a.status==='ended') return;
a.status='ended'; a.endAt=new Date().toISOString(); a.endedBy=CURRENT_USER; a.endReason=reason||'ended'; ctTouch(a);
}
 
/* ctAssign · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctAssign(p,roleId,staff,opts){ return pvxRun('ctAssign',ctAssign$base,this,arguments); }
function ctAssign$base(p, roleId, staff, opts){
opts=opts||{}; const role=ctRole(roleId);
if(role.mirror && !opts.pending){
if(staff.kind!=='doctor'){ toast('Choose one of Flow\'s emergency doctors as primary clinician'); return null; }
assignDoctor(p, staff.id); return ctCurrent(p,'primary')[0]||null;
}
const now=new Date().toISOString();
const a={ id:ctUid(), patientId:p.id, staffId:staff.id, staffName:staff.name, staffKind:staff.kind, role:roleId, status: opts.pending?'pending':'current',
startAt: opts.pending?null:now, endAt:null, updatedAt:now, updatedBy:CURRENT_USER, proposedBy: opts.pending?CURRENT_USER:null, confirmedBy:null, confirmedAt:null, endedBy:null, endReason:null, note:(opts.note||'').slice(0,160) };
if(!opts.pending && !role.multi) ctCurrent(p,roleId).forEach(x=>ctEndAssignment(p,x,'replaced'));
ctList(p).push(a);
p.timeline.push({ label: opts.pending?('Handoff proposed · '+role.label):(role.label+' assigned'), at:new Date(), meta: staff.name+' · '+CURRENT_USER });
notify(opts.pending?'Handoff proposed':'Care team updated',`${bcEsc(staff.name)} → ${bcEsc(p.name)} (${bcEsc(role.label)})`, {icon:'doctor', color:'var(--accent)'});
renderAll(); if(activePatient===p.id) fillDrawer(p);
return a;
}
function ctConfirm(p, aid){
const a=ctList(p).find(x=>x.id===aid); if(!a||a.status!=='pending') return;
const role=ctRole(a.role);
if(role.mirror){ if(a.staffKind!=='doctor'){ toast('Choose an emergency doctor as primary clinician'); return; } a.status='ended'; a.endReason='confirmed-into-primary'; a.confirmedBy=CURRENT_USER; a.confirmedAt=new Date().toISOString(); ctTouch(a); assignDoctor(p, a.staffId); const c=ctCurrent(p,'primary')[0]; if(c){ c.confirmedBy=CURRENT_USER; c.confirmedAt=a.confirmedAt; c.proposedBy=a.proposedBy; } renderAll(); if(activePatient===p.id) fillDrawer(p); return; }
if(!role.multi) ctCurrent(p,a.role).forEach(x=>ctEndAssignment(p,x,'handed off'));
a.status='current'; a.startAt=new Date().toISOString(); a.confirmedBy=CURRENT_USER; a.confirmedAt=a.startAt; ctTouch(a);
p.timeline.push({ label:'Handoff confirmed · '+role.label, at:new Date(), meta:a.staffName+' · confirmed by '+CURRENT_USER });
notify('Handoff confirmed',`${bcEsc(a.staffName)} now ${bcEsc(role.label.toLowerCase())} for ${bcEsc(p.name)}`, {icon:'doctor', color:'var(--s-admitted)'});
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
function ctDecline(p, aid){
const a=ctList(p).find(x=>x.id===aid); if(!a||a.status!=='pending') return;
ctEndAssignment(p,a,'declined');
p.timeline.push({ label:'Handoff declined · '+ctRole(a.role).label, at:new Date(), meta:a.staffName+' · '+CURRENT_USER });
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
function ctEnd(p, aid){
if(aid==='__doctor'){ assignDoctor(p,'unassigned'); return; }
const a=ctList(p).find(x=>x.id===aid); if(!a||a.status!=='current') return;
if(ctRole(a.role).mirror){ assignDoctor(p,'unassigned'); return; }
ctEndAssignment(p,a,'ended');
p.timeline.push({ label:ctRole(a.role).label+' assignment ended', at:new Date(), meta:a.staffName+' · '+CURRENT_USER });
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
 
function ctSyncPrimary(p){
const cur=ctCurrent(p,'primary'); const want=(p.doctor && p.doctor!=='unassigned')?p.doctor:null;
cur.forEach(a=>{ if(a.staffId!==want) ctEndAssignment(p,a, want?'replaced':'unassigned'); });
if(want && !cur.some(a=>a.staffId===want)){ const d=doc(want); const now=new Date().toISOString();
ctList(p).push({ id:ctUid(), patientId:p.id, staffId:d.id, staffName:d.name, staffKind:'doctor', role:'primary', status:'current', startAt:now, endAt:null, updatedAt:now, updatedBy:CURRENT_USER, proposedBy:null, confirmedBy:null, confirmedAt:null, endedBy:null, endReason:null, note:''}); }
}

 
function ctSummary(p){
const cur=ctCurrent(p).filter(a=>a.role!=='primary'), pend=ctPending(p);
const tech=ctCurrent(p,'technician').length;
const parts=[]; const d=doc(p.doctor);
parts.push(p.doctor==='unassigned'?'No primary clinician':d.name);
parts.push(tech?`${tech} technician${tech>1?'s':''}`:'No technician');
if(ctCurrent(p,'supervising').length) parts.push('supervised');
if(ctCurrent(p,'covering').length) parts.push('covering set');
if(pend.length) parts.push(`${pend.length} pending handoff${pend.length>1?'s':''}`);
return { text:parts.join(' · '), tech, pending:pend.length, others:cur };
}
function ctAvRow(p){
const cur=ctCurrent(p).filter(a=>a.role!=='primary'), pend=ctPending(p).length;
if(!cur.length && !pend) return'';
const show=cur.slice(0,3);
return show.map(a=>{ const s=ctStaff(a.staffId,a.staffName,a.staffKind); const role=ctRole(a.role).label; return`<span class="dav ct-av ${a.staffKind==='service'?'svc':''}" style="--ct-c:${s.color}" role="img" aria-label="${ctEsc(s.name)} — ${ctEsc(role)}" title="${ctEsc(s.name)} · ${ctEsc(role)}">${ctEsc(s.initials)}</span>`; }).join('')
+ (cur.length>3?`<span class="ct-av-more" aria-label="${cur.length-3} more team members">+${cur.length-3}</span>`:'')
+ (pend?`<span class="ct-pend" role="img" aria-label="${pend} pending handoff${pend>1?'s':''}" title="${pend} pending handoff${pend>1?'s':''}"></span>`:'');
}
function ctCardAction(p){ return`<div class="row"><span>Care team</span><b><button class="ct-link" type="button" data-ct-open="${ctEsc(p.id)}"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>Who's responsible?</button></b></div>`; }
function renderCareTeamCard(p){
const m=document.getElementById('careTeamMount'); if(!m) return;
const s=ctSummary(p); const cls = s.pending?'ct-status-warn':(p.doctor!=='unassigned'&&s.tech?'ct-status-ok':'ct-status-none');
const st = s.pending?`${s.pending} pending handoff${s.pending>1?'s':''}`:(p.doctor==='unassigned'?'No primary clinician':(s.tech?'Team assigned':'Technician missing'));
m.innerHTML=`<div class="triage-card ct-card" id="careTeamCard" role="button" tabindex="0" aria-label="Care team — who is responsible? ${ctEsc(s.text)}">
    <div class="tc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
    <div class="tc-main"><div class="tc-title">Care team · Who is responsible?</div><div class="tc-sub">${ctEsc(s.text)}</div>
      <span class="tc-status ${cls}">${ctEsc(st)}</span></div>
    <div class="tc-chev"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
  </div>`;
const card=document.getElementById('careTeamCard');
card.onclick=()=>openCareTeam(p.id);
card.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openCareTeam(p.id); } };
}

 
let ctOpenId=null, ctFormRole=null, ctRestoreFocus=null;
/* openCareTeam · its layers, innermost first: 1 #53 wrap   (PVX-N387; kept true by flow_t387) */
function openCareTeam(pid){ return pvxRun('openCareTeam',openCareTeam$base,this,arguments); }
function openCareTeam$base(pid){
const p=PATIENTS.find(x=>x.id===pid); if(!p) return;
ctOpenId=pid; ctFormRole=null; ctRestoreFocus=document.activeElement;
renderCareTeam();
document.getElementById('ctScrim').classList.add('open');
document.getElementById('ctModal').classList.add('open');
setTimeout(()=>{ const c=document.getElementById('ctClose'); if(c) c.focus(); }, 40);
}
/* closeCareTeam · its layers, innermost first: 1 #53 wrap   (PVX-N387; kept true by flow_t387) */
function closeCareTeam(){ return pvxRun('closeCareTeam',closeCareTeam$base,this,arguments); }
function closeCareTeam$base(){
ctOpenId=null; ctFormRole=null;
document.getElementById('ctScrim').classList.remove('open');
document.getElementById('ctModal').classList.remove('open');
if(ctRestoreFocus && document.contains(ctRestoreFocus)){ try{ ctRestoreFocus.focus(); }catch(e){} }
ctRestoreFocus=null;
}
function ctPatient(){ return ctOpenId ? PATIENTS.find(x=>x.id===ctOpenId) : null; }
function renderCareTeam(){
const p=ctPatient(); if(!p) return;
document.getElementById('ctSub').textContent=`${p.name} ${p.last||''}`.trim()+' · '+(p.hid||'')+' · '+(p.room||'');
const body=document.getElementById('ctBody'), foot=document.getElementById('ctFoot');
let html='';
if(p._demo) html+='<div class="ct-banner warn"><strong>Preview census.</strong> This sample patient is not saved — assignments here are not shared.</div>';
else if(typeof Backend!=='undefined'&& Backend.conn!=='live') html+=`<div class="ct-banner warn"><strong>Assignment data may be out of date.</strong> Connection: ${ctEsc(Backend.conn)}. Changes will sync when the connection returns; confirm with the team before relying on this view.</div>`;
html+=CT_ROLES.map(r=>ctRoleHTML(p,r)).join('');
if(ctFormRole) html+=ctFormHTML(p, ctFormRole);
const hist=ctEnded(p);
html+=`<details class="ct-hist"><summary><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>History · ${hist.length} ended assignment${hist.length===1?'':'s'}</summary>
    ${hist.length?hist.slice(0,30).map(a=>ctRowHTML(p,a,true)).join(''):'<div class="ct-empty">No ended assignments yet.</div>'}</details>`;
body.innerHTML=html;
const last=ctLastUpdate(p);
foot.innerHTML=`<span class="ct-updated">${last?`Last updated ${ctEsc(ctFmt(last.updatedAt))} by ${ctEsc(last.updatedBy||'—')}`:'No assignments recorded yet'}</span>`;
if(ctFormRole){ const f=document.getElementById('ctFormRoleSel')||document.querySelector('#ctFormBox select'); if(f) f.focus(); }
}
function ctRoleHTML(p, r){
let cur=ctCurrent(p,r.id); const pend=ctPending(p,r.id);
if(r.mirror && !cur.length && p.doctor && p.doctor!=='unassigned'){
const d=doc(p.doctor); cur=[{ id:'__doctor', staffId:d.id, staffName:d.name, staffKind:'doctor', role:'primary', status:'current', startAt:null, updatedAt:null, updatedBy:'', note:'', _legacy:true }];
}
let rows=cur.map(a=>ctRowHTML(p,a)).join('')+pend.map(a=>ctRowHTML(p,a)).join('');
if(!cur.length && !pend.length){
const sc=CARE_TEAM_CONFIG.serviceContacts[r.id];
rows=`<div class="ct-missing"><span><b>${ctEsc(r.missing)}</b>${sc?` · designated contact: ${ctEsc(sc.name)}${sc.ext?' · Ext. '+ctEsc(sc.ext):''}${sc.phone?' · '+ctEsc(sc.phone):''}`:''}</span><button class="ct-mini" type="button" data-ct-form="${r.id}">Assign</button></div>`;
}
const canAdd = (r.multi || !cur.length) && (cur.length||pend.length);
return`<section class="ct-role" aria-label="${ctEsc(r.label)}"><div class="ct-role-head"><p class="sect-title">${ctEsc(r.label)}${r.opt?` <span class="opt">· ${ctEsc(r.opt)}</span>`:''}</p>
      ${(cur.length||pend.length)?`<button class="ct-mini" type="button" data-ct-form="${r.id}">${r.multi?'Add':'Replace / hand off'}</button>`:''}</div>${rows}</section>`;
}
function ctRowHTML(p, a, history){
const s=ctStaff(a.staffId,a.staffName,a.staffKind), r=ctRole(a.role), url=ctProfileUrl(a);
const im=(a.staffKind==='im'&& typeof imContact==='function') ? imContact({id:a.staffId}) : null;
let sub='';
if(a._legacy) sub='Assigned doctor · time not recorded (assigned before Care team history started)';
else if(a.status==='current') sub=`Since ${ctEsc(ctFmt(a.startAt))}${a.confirmedBy?` · handoff confirmed by ${ctEsc(a.confirmedBy)}`:''}${a.updatedBy?` · updated ${ctEsc(ctFmt(a.updatedAt))} by ${ctEsc(a.updatedBy)}`:''}`;
else if(a.status==='pending') sub=`Proposed by ${ctEsc(a.proposedBy||a.updatedBy||'—')} at ${ctEsc(ctFmt(a.updatedAt))} · waiting for ${ctEsc(s.name)} to confirm`;
else sub=`${ctEsc(r.label)} · ${ctEsc(ctFmt(a.startAt)||'proposed')} → ${ctEsc(ctFmt(a.endAt))} · ${ctEsc(a.endReason||'ended')} by ${ctEsc(a.endedBy||a.updatedBy||'—')}`;
if(a.note) sub+=` · “${ctEsc(a.note)}”`;
const actions = history ?'':`<div class="ct-actions">
      ${url?`<a class="ct-mini" href="${ctEsc(url)}" target="_blank" rel="noopener" title="Open directory profile (opens the Directory; sign-in applies)"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>Profile</a>`:''}
      ${im&&im.phone?`<a class="ct-mini" href="tel:${ctEsc(im.phone)}">Call</a>`:''}${im&&im.email?`<a class="ct-mini" href="mailto:${ctEsc(im.email)}">Email</a>`:''}
      ${a.status==='pending'?`<button class="ct-mini primary" type="button" data-ct-do="confirm" data-ct-id="${a.id}" title="Recorded as confirmed by ${ctEsc(CURRENT_USER)}">Confirm handoff</button><button class="ct-mini danger" type="button" data-ct-do="decline" data-ct-id="${a.id}">Decline</button>`:''}
      ${a.status==='current'?`<button class="ct-mini danger" type="button" data-ct-do="end" data-ct-id="${a.id}">End</button>`:''}
    </div>`;
return`<div class="ct-row ${a.status}"><span class="dav ${a.staffKind==='service'?'ct-av svc':''}" style="${a.staffKind==='service'?'--ct-c:var(--ink-400);width:32px;height:32px;font-size:0.6875rem':'--dav-accent:'+s.color}" aria-hidden="true">${ctEsc(s.initials)}</span>
    <div class="ct-main"><div class="ct-name">${ctEsc(s.name)}<span class="ct-pill ${a.status}">${a.status}</span>${history?'':`<span class="muted" style="font-size:0.6875rem;font-weight:600">${ctEsc(CT_KIND_LABEL[a.staffKind]||'')}</span>`}</div><div class="ct-sub">${sub}</div></div>${actions}</div>`;
}
function ctShowForm(roleId){ ctFormRole=roleId; renderCareTeam(); }
/* ctFormHTML · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctFormHTML(p,roleId){ return pvxRun('ctFormHTML',ctFormHTML$base,this,arguments); }
function ctFormHTML$base(p, roleId){
const r=ctRole(roleId), roster=ctRoster();
const groups=[['doctor','Emergency doctors'],['im','Internal Medicine'],['liaison','Liaisons'],['service','Services']];
const allowed = r.mirror ? ['doctor'] : (roleId==='technician'? ['doctor','im','liaison'] : ['doctor','im','service']);
const opts=groups.filter(g=>allowed.includes(g[0])).map(g=>`<optgroup label="${g[1]}">${roster.filter(x=>x.kind===g[0]).map(x=>`<option value="${ctEsc(x.id)}">${ctEsc(x.name)}</option>`).join('')}</optgroup>`).join('');
return`<div class="ct-form" id="ctFormBox" role="group" aria-label="Assign ${ctEsc(r.label)}">
    <div class="ct-field"><label class="k" for="ctFormRoleSel">Role</label><select id="ctFormRoleSel">${CT_ROLES.map(x=>`<option value="${x.id}" ${x.id===roleId?'selected':''}>${ctEsc(x.label)}</option>`).join('')}</select></div>
    <div class="ct-field"><label class="k" for="ctFormWho">Who</label><select id="ctFormWho">${opts}${r.mirror?'':'<optgroup label="Other"><option value="__manual">Someone else — enter a name</option></optgroup>'}</select>
      ${r.mirror?'<div class="ct-hint">The primary clinician is Flow’s doctor assignment — choosing here updates it exactly like the Assigned doctor control.</div>':''}</div>
    <div class="ct-field" id="ctFormManualWrap" hidden><label class="k" for="ctFormManual">Name</label><input type="text" id="ctFormManual" maxlength="60" placeholder="Full name as it appears in the Directory"><div class="ct-hint">Technicians and other staff aren't in Flow's rosters yet; the name is linked to the Directory by slug, so spell it as it appears there.</div></div>
    <div class="ct-field"><label class="ct-check"><input type="checkbox" id="ctFormPending"> <span><b>Needs confirmation (handoff)</b> — the incoming person confirms before they become responsible. Until then the current assignment stays in place.</span></label></div>
    <div class="ct-field"><label class="k" for="ctFormNote">Note <span style="text-transform:none;letter-spacing:0;font-weight:600">(optional)</span></label><input type="text" id="ctFormNote" maxlength="160" placeholder="e.g. covering until 7 AM"></div>
    <div class="ct-foot"><button class="ct-mini" type="button" data-ct-do="cancel">Cancel</button><button class="ct-mini primary" type="button" data-ct-do="submit">Assign</button></div>
  </div>`;
}
function ctFormSubmit(){
const p=ctPatient(); if(!p) return;
const roleId=document.getElementById('ctFormRoleSel').value, who=document.getElementById('ctFormWho').value;
const pending=document.getElementById('ctFormPending').checked, note=document.getElementById('ctFormNote').value.trim();
let staff=null;
if(who==='__manual'){ const name=document.getElementById('ctFormManual').value.trim(); if(!name){ toast('Enter a name'); return; } staff={ id:'manual:'+docSlug(name), name, kind:'manual', initials:docInitials(name), color:'var(--ink-400)'}; }
else staff=ctStaff(who);
if(!staff){ toast('Choose who is responsible'); return; }
if(ctCurrent(p,roleId).some(a=>a.staffId===staff.id) && !pending){ toast(staff.name+' is already assigned'); return; }
ctFormRole=null;
ctAssign(p, roleId, staff, { pending, note });
renderCareTeam();
const c=document.getElementById('ctClose'); if(c) c.focus();
}
document.addEventListener('keydown', function(e){ if(e.key==='Escape'&& ctOpenId && document.getElementById('ctModal').classList.contains('open')){ e.stopPropagation(); closeCareTeam(); } }, true);

/* assignDoctor · its layers, innermost first: 1 #8 after · 2 n350 wrap   (PVX-N387; kept true by flow_t387) */
function assignDoctor(p,id){ return pvxRun('assignDoctor',assignDoctor$base,this,arguments); }
function assignDoctor$base(p,id){
if(p.doctor===id) return;
p.doctor=id;
try{ ctSyncPrimary(p); }catch(e){}
const d=doc(id), off=(id==='unassigned');   /* PVX-N360: removing says so */
p.timeline.push({label:off?'Doctor removed':'Doctor assigned', at:new Date(), meta:off?'':d.name});
notify(off?'Doctor removed':'Doctor assigned', off?bcEsc(p.name):`${bcEsc(d.name)} → ${bcEsc(p.name)}`, {icon:'doctor', color:'var(--accent)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
/* assignLiaison · its layers, innermost first: 1 n350 wrap   (PVX-N387; kept true by flow_t387) */
function assignLiaison(p,id){ return pvxRun('assignLiaison',assignLiaison$base,this,arguments); }
function assignLiaison$base(p,id){
if(p.liaison===id) return;
p.liaison=id;
const l=liaison(id);
p.timeline.push({label: l?'Liaison assigned':'Liaison removed', at:new Date(), meta: l?l.name:''});
notify(l?'Liaison assigned':'Liaison removed', l?`${bcEsc(l.name)} → ${bcEsc(p.name)}`:bcEsc(p.name), {icon:'liaison', color:'var(--purple)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
/* setPriority · its layers, innermost first: 1 n350 wrap   (PVX-N387; kept true by flow_t387) */
function setPriority(p,level){ return pvxRun('setPriority',setPriority$base,this,arguments); }
function setPriority$base(p,level){
if(p.prio===level) return;
p.prio=level;
p.timeline.push({label:`Priority set to P${level}`, at:new Date(), meta:PRIO_LABEL[level]});
notify('Priority updated',`${bcEsc(p.name)} · P${level} · ${PRIO_LABEL[level]}`, {icon:'info', color:PRIO[level].c});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}

function makeEditable(el, commit){
if(!el) return;
el.setAttribute('contenteditable','true'); el.spellcheck=false;
el.classList.add('editable');
el.dataset.orig=el.textContent;
el.onkeydown=ev=>{
if(ev.key==='Enter'){ ev.preventDefault(); el.blur(); }
else if(ev.key==='Escape'){ ev.preventDefault(); el._cancel=true; el.blur(); }
};
el.onblur=()=>{
if(el._cancel){ el._cancel=false; el.textContent=el.dataset.orig; return; }
const v=fxClean(el.textContent,true).trim();
if(v===el.dataset.orig.trim()) return;
commit(v);
};
}

function pvxBoardFiltered(){ var f=filters; filters={status:null,prio:null,doctor:null,liaison:null}; try{ return filtered(); } finally { filters=f; } }   /* PVX-N356: the board takes search, not the Patients filters */
/* filtered · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function filtered(){ return pvxRun('filtered',filtered$base,this,arguments); }
function filtered$base(){
return PATIENTS.filter(p=>{
if(filters.status && p.status!==filters.status) return false;
if(filters.prio && p.prio!==filters.prio) return false;
if(filters.doctor && p.doctor!==filters.doctor) return false;
if(filters.liaison){ if(filters.liaison==='none'){ if(p.liaison) return false; } else if(p.liaison!==filters.liaison) return false; }
if(searchQ){
const l=liaison(p.liaison);
const hay=[p.name,p.last,p.species,p.reason,doc(p.doctor).name,l?l.name:'',p.room,p.owner,p.status,p.hid].join(' ').toLowerCase();
if(!hay.includes(searchQ.toLowerCase())) return false;
}
return true;
});
}






function examPickupsToday(){ return PATIENTS.filter(p=>p.examStartedAt && typeof p.examWaitMinutes==='number'&& isTodayHosp(p.examStartedAt)); }
function avgExamWaitToday(){ const w=examPickupsToday().map(p=>p.examWaitMinutes); return w.length? Math.round(w.reduce((a,b)=>a+b,0)/w.length) : null; }
function computeKPIs(){
const active = PATIENTS.filter(isActive);
const waiting = active.filter(p=>p.status==='Waiting');
const waits = active.map(waitMinutes);
const longest = active.length? Math.max(...waits):0;
const longestP = active.find(p=>waitMinutes(p)===longest);
const countBy = s=>active.filter(p=>p.status===s).length;
const num = String;
const awToday = avgExamWaitToday();
return [
{feature:true, lab:'On Floor', raw:active.length, fmt:num, sub:'Patients', wash:WASH.cyan},
{lab:'Waiting', raw:waiting.length, fmt:num, sub:'Awaiting assignment', wash:WASH.amber},
{lab:'Avg Wait', raw: awToday==null?'—': awToday, fmt: awToday==null? String : fmtWait, sub:'Check-in → Exam', wash:WASH.amber},
{lab:'Longest', raw: active.length? longest :'—', fmt: active.length? fmtWait : String, sub: longestP? (longestP.name+(longestP.last?' '+longestP.last:'')) :'—', wash:WASH.red},
{lab:'Exam', raw:countBy('Exam'), fmt:num, sub:'In Exam', wash:WASH.cyan},
{lab:'Diagnostics', raw:countBy('Diagnostics'), fmt:num, sub:'Lab & imaging', wash:WASH.lavender},
{lab:'Ultrasound', raw:countBy('Ultrasound'), fmt:num, sub:'Ultrasound queue', wash:WASH.blue},
{lab:'Procedure', raw:countBy('Procedure'), fmt:num, sub:'In Procedure', wash:WASH.coral},
];
}

const WASH = {
cyan:'rgba(56,189,210,0.12)', teal:'rgba(58,196,190,0.12)', green:'rgba(72,184,136,0.12)',
blue:'rgba(90,169,240,0.11)', lavender:'rgba(168,136,224,0.12)', amber:'rgba(235,201,93,0.11)',
coral:'rgba(232,100,74,0.11)', red:'rgba(228,52,43,0.10)'
};
const RAF = (typeof requestAnimationFrame!=='undefined') ? requestAnimationFrame : null;
const nowMs = ()=> (typeof performance!=='undefined'&& performance.now) ? performance.now() : Date.now();
function countUp(el, target, fmt){
if(!RAF){ el.textContent=fmt(target); return; }
const dur=850, start=nowMs();
(function step(){
let p=Math.min(1,(nowMs()-start)/dur); p=1-Math.pow(1-p,3);
{ const tx=String(fmt(Math.round(target*p))), n=el.firstChild; if(n&&n.nodeType===3&&!n.nextSibling){ if(n.nodeValue!==tx) n.nodeValue=tx; } else el.textContent=tx; }   /* PVX-N378 */
if(p<1) RAF(step);
})();
}


function ckpiCard(c,i,group){
return`<article class="command-kpi kpi-in command-kpi--${c.k}"
    style="animation-delay:${i*45}ms;--kaccent:${c.ac.h};--kaccent-rgb:${c.ac.r}">
    <div class="command-kpi__top">
      <span class="command-kpi__label">${bcEsc(c.lab)}</span>
      <span class="command-kpi__chip">${bcEsc(c.chip)}</span>
    </div>
    <div class="command-kpi__value${c.isName?' is-name':''}">${bcEsc(String(c.val))}</div>
    <div class="command-kpi__sub">${bcEsc(c.sub)}</div>
    ${ckpiSpark(group,c.lab)}
  </article>`;
}



const WAIT_ALERT_MIN=120;
const CQ_WAIT_ALERT_MIN=20;
const CKPI_AC={
cyan   :{h:'var(--accent)', r:'56,189,210'},  amber:{h:'var(--amber)', r:'235,201,93'},
purple :{h:'#A888E0', r:'168,136,224'}, blue :{h:'#5AA9F0', r:'90,169,240'},
coral  :{h:'#E8644A', r:'232,100,74'},  red  :{h:'var(--priority-p1)', r:'228,52,43'},
green  :{h:'var(--s-admitted)', r:'72,184,136'},  neutral:{h:'#8C9098', r:'140,144,152'}
};
 
const CKPI_META=[
{k:'onfloor',    ac:'cyan',    chip:()=>({t:'Live'})},
{k:'waiting',    ac:'amber',   chip:()=>({t:''})},
{k:'avg',        ac:'neutral', chip:()=>({t:'Today'})},
{k:'longest',    ac:'red',     chip:c=>(typeof c.raw==='number'&&c.raw>WAIT_ALERT_MIN)
?{t:'Above target',warn:true}:{t:'On target',ok:true}},
{k:'exam',       ac:'cyan',    chip:()=>({t:''})},
{k:'diagnostics',ac:'purple',  chip:()=>({t:''})},
{k:'ultrasound', ac:'blue',    chip:()=>({t:''})},
{k:'procedure',  ac:'coral',   chip:()=>({t:''})}
];


/* PVX-N191: sparklines keep the last hour (one sample a minute) on this device, and describe themselves */
const CKPI_HIST=(function(){ try{ const o=JSON.parse(localStorage.getItem('pvx:kpi:v1')||'{}'); return (o&&typeof o==='object')?o:{}; }catch(e){ return {}; } })(); const _ckpiMin={};

/* PVX-N341 - share the visit tracker link: the system share sheet on iPhone and iPad (Messages, Mail, AirDrop…), Copy with a mouse.
   "Copied" shows only after the copy really happened; a refused copy says so and shows the link. */
function pvxCanShare(){ try{ return typeof navigator.share==='function'; }catch(e){ return false; } }   /* PVX-N356: wherever the browser has a share sheet, a Mac's Safari too */
function pvxCopyTracker(u){ function say(t){ if(typeof toast==='function') toast(t); }
  try{ navigator.clipboard.writeText(u).then(function(){ say('Tracker link copied'); }, function(){ say('Couldn’t copy the link — '+u); }); }catch(e){ say('Couldn’t copy the link — '+u); } }
function pvxShareTracker(u, name){
  function say(t){ if(typeof toast==='function') toast(t); }
  function copy(){ try{ navigator.clipboard.writeText(u).then(function(){ say('Tracker link copied'); }, function(){ say('Couldn’t copy the link — '+u); }); }catch(e){ say('Couldn’t copy the link — '+u); } }
  if(pvxCanShare()){ navigator.share({title:'Visit tracker'+(name?' · '+name:''), url:u}).catch(function(e){ if(!e||e.name!=='AbortError') copy(); }); return; }
  copy();
}
function ckpiSave(){ try{ localStorage.setItem('pvx:kpi:v1', JSON.stringify(CKPI_HIST)); }catch(e){} }
function ckpiSample(group,cards){
const m=Math.floor(Date.now()/60000);
if(_ckpiMin[group]===m) return; _ckpiMin[group]=m;
const cut=Date.now()-60*60000;
cards.forEach(c=>{ const k=group+'|'+c.lab; let a=Array.isArray(CKPI_HIST[k])?CKPI_HIST[k]:[];
a=a.filter(x=>x&&typeof x==='object'&&x.t>=cut);
if(typeof c.raw==='number'&&isFinite(c.raw)) a.push({t:Date.now(),v:c.raw});
CKPI_HIST[k]=a.slice(-60); });
ckpiSave();
}
/* PVX-N341 - a chart's words: the card's name in sentence case, and minutes where the values are minutes */
function pvxChartName(lab){ var s=String(lab||'').replace(/^Avg\b/,'Average'); return s.charAt(0)+s.slice(1).toLowerCase(); }
function pvxChartUnit(lab){ return /^(avg wait|longest)$/i.test(String(lab))?' min':''; }
function pvxSpoken(m){ m=Math.round(Math.abs(+m)||0); var h=Math.floor(m/60), r=m%60, w=function(n,u){ return n+' '+u+(n===1?'':'s'); };   /* PVX-N350: VoiceOver hears “1 hour 20 minutes”, not “1h 20m” */
  return h?(w(h,'hour')+(r?' '+w(r,'minute'):'')):w(r,'minute'); }
function pvxDur(m){ return (typeof fmtWait==='function')?fmtWait(m):(m+'m'); }   /* a trend reads like the wait beside it: 5h 30m, not 330m */
function ckpiSpark(group,lab){
const cut=Date.now()-60*60000, a=(Array.isArray(CKPI_HIST[group+'|'+lab])?CKPI_HIST[group+'|'+lab]:[]).filter(x=>x&&x.t>=cut), X0=2, X1=62, Y0=5, Y1=26;
if(a.length<2) return'<svg class="command-kpi__spark is-empty" viewBox="0 0 64 31" aria-hidden="true"></svg>';
const vs=a.map(x=>x.v); let mn=Math.min.apply(null,vs), mx=Math.max.apply(null,vs);
const need=Math.max(4, Math.abs(mx)*0.2); if(mx-mn<need){ const mid=(mx+mn)/2; mn=mid-need/2; mx=mid+need/2; }
const span=mx-mn, t0=a[0].t, t1=a[a.length-1].t;
const pts=a.map(x=>[ Math.round((X0+(X1-X0)*((x.t-t0)/Math.max(1,t1-t0)))*10)/10, Math.round((Y1-(x.v-mn)/span*(Y1-Y0))*10)/10 ]);
const d='M'+pts.map(q=>q[0]+' '+q[1]).join(' L'), last=pts[pts.length-1];
const f=vs[0], l=vs[vs.length-1], diff=l-f, fmtT=new Date(t0).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const r1=v=>Math.round(v*10)/10;
const nm=pvxChartName(lab), u=pvxChartUnit(lab), q=v=>u?pvxSpoken(r1(v)):String(r1(v));
const say=nm+' since '+fmtT+': '+q(f)+' to '+q(l)+(diff>0?', up '+q(diff):diff<0?', down '+q(-diff):', no change');
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
return'<svg class="command-kpi__spark" viewBox="0 0 64 31" role="img" aria-label="'+esc(say)+'"><title>'+esc(say)+'</title>'+
'<path class="line" d="'+d+'"/><circle cx="'+last[0]+'" cy="'+last[1]+'" r="2"/></svg>';
}

function renderKPIs(animate){
const cards=computeKPIs();
const row=document.getElementById('kpiRow');
ckpiSample('top',cards);
if(!row.children || !row.children.length){
row.innerHTML = cards.map((c,i)=>{
const m=CKPI_META[i]||CKPI_META[0], ac=CKPI_AC[m.ac];
return`<article class="command-kpi kpi-in command-kpi--${m.k}"
        style="animation-delay:${i*50}ms;--kaccent:${ac.h};--kaccent-rgb:${ac.r}">
        <div class="command-kpi__top">
          <span class="command-kpi__label">${c.lab}</span>
          <span class="command-kpi__chip"></span>
        </div>
        <div class="command-kpi__value">0</div>
        <div class="command-kpi__sub">${bcEsc(c.sub)}</div>
      </article>`;}).join('');
}
const els=[...row.children];
cards.forEach((c,i)=>{
const el=els[i]; if(!el) return;
const val=el.querySelector('.command-kpi__value'),
sub=el.querySelector('.command-kpi__sub'),
chip=el.querySelector('.command-kpi__chip'),
m=CKPI_META[i]||CKPI_META[0];
if(sub){ const sv=String(c.sub==null?'':c.sub); if(sub.textContent!==sv) sub.textContent=sv; }   /* PVX-N378 */
if(chip){ const ch=m.chip(c), ct=String(ch.t||''), cd=ch.t?'':'none'; if(chip.textContent!==ct) chip.textContent=ct; if(chip.style.display!==cd) chip.style.display=cd; chip.classList.toggle('is-warn',!!ch.warn); chip.classList.toggle('is-ok',!!ch.ok); }
const spark=ckpiSpark('top',c.lab), old=el.querySelector('.command-kpi__spark');
if(!old || old.outerHTML!==spark){ if(old) old.remove(); el.insertAdjacentHTML('beforeend',spark); }
if(!val) return;
if(animate && typeof c.raw==='number') countUp(val, c.raw, c.fmt);
else { const vt=String(c.fmt(c.raw)); if(val.textContent!==vt) val.textContent = vt; }
});
}

/* attentionItems · its layers, innermost first: 1 n197 wrap   (PVX-N387; kept true by flow_t387) */
function attentionItems(){ return pvxRun('attentionItems',attentionItems$base,this,arguments); }
function attentionItems$base(){
const items=[];
const active=PATIENTS.filter(isActive);
active.forEach(p=>{
if(p.status==='Hospitalized') return;
const w=waitMinutes(p);

if(w>WAIT_ALERT_MIN) items.push({key:`wait:${p.id}:${p.status}`,sev:'red',icon:'clock',t:`${p.name} waiting over 2 hours`,s:`${fmtWait(w)} · ${p.status} · ${p.room}`,p});
if(p.doctor==='unassigned') items.push({key:`nodoc:${p.id}`,sev:'orange',icon:'user',t:`${p.name} has no doctor assigned`,s:fmtWait(w)+(p.reason?' · '+p.reason:''),p});
else if(!p.liaison && p.prio<=2) items.push({key:`nolia:${p.id}`,sev:'yellow',icon:'liaison',t:`${p.name} has no liaison`,s:`Optional · under ${doc(p.doctor).name}`,p});
if(p.status==='Diagnostics'&& w>90) items.push({key:`diag:${p.id}`,sev:'blue',icon:'flask',t:`${p.name} diagnostics may be complete`,s:`${fmtWait(w)} in diagnostics · check results`,p});
if(p.status==='Procedure'&& w>90) items.push({key:`proc:${p.id}`,sev:'green',icon:'check',t:`${p.name} procedure likely complete`,s:`Ready to admit or discharge · ${doc(p.doctor).name}`,p});
});

const waitingCount=active.filter(p=>p.status==='Waiting').length;
const clinRooms=ROOMS.filter(r=>r!=='Lobby'&&r!=='Comfort Room');
const freeRoom=clinRooms.find(r=>!active.some(p=>p.room===r));
if(waitingCount>0 && freeRoom) items.push({key:`roomavail:${freeRoom}`,sev:'warn',icon:'room',t:`${freeRoom} available while ${waitingCount} waiting`,s:'Consider moving a patient in',room:freeRoom});

try{ FlowIntakeStore.getPendingIntakes().forEach(r=>{
const nm=(r.patient&&r.patient.name)||'Client check-in';
const mins=(Date.now()-new Date(r.submittedAt).getTime())/60000;
if(r.urgentReview && r.urgentReview.flagged) items.push({key:`cq-urgent:${r.id}`,sev:'red',icon:'clock',t:`${nm} — needs CSR review`,s:'High-acuity phrase · client self check-in',intakeId:r.id});
else if(r.toxinWorkflow) items.push({key:`cq-toxin:${r.id}`,sev:'orange',icon:'flask',t:`${nm} — possible toxin exposure`,s:`${(r.toxinWorkflow.medication||'Substance')} · confirm with CSR`,intakeId:r.id});
else if(mins>CQ_WAIT_ALERT_MIN) items.push({key:`cq-wait:${r.id}`,sev:'yellow',icon:'clock',t:`${nm} waiting for review`,s:`${Math.round(mins)} min in Client Queue`,intakeId:r.id});
}); }catch(e){}
const order={red:0,orange:1,yellow:2,blue:3,green:4,warn:5};
return items.sort((a,b)=>(order[a.sev]-order[b.sev])||((a.p?a.p.prio:9)-(b.p?b.p.prio:9))||((b.p?waitMinutes(b.p):0)-(a.p?waitMinutes(a.p):0)));   /* n332 */
}


let dismissedAlerts = new Set();
function visibleAttentionItems(){
const all = attentionItems();
const currentKeys = new Set(all.map(a=>a.key));
dismissedAlerts.forEach(k=>{ if(!currentKeys.has(k)) dismissedAlerts.delete(k); });
return all.filter(a=>!dismissedAlerts.has(a.key));
}
/* dismissAlert · its layers, innermost first: 1 n197 wrap   (PVX-N387; kept true by flow_t387) */
function dismissAlert(key){ return pvxRun('dismissAlert',dismissAlert$base,this,arguments); }
function dismissAlert$base(key){ if(!key) return; dismissedAlerts.add(key); renderAttention(); }
function clearAllAlerts(){ visibleAttentionItems().forEach(a=>dismissedAlerts.add(a.key)); renderAttention(); }
const ATTN_ICONS={
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
liaison:'<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20v-1a6 6 0 0 1 9.5-4"/><path d="M16 4a4 4 0 0 1 0 7.5"/>',
room:'<path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/>'
};
const SEV_ACCENT={red:'#E4342B',orange:'#E8934A',yellow:'var(--s-waiting)',blue:'var(--s-exam)',green:'var(--s-admitted)',warn:'var(--s-diagnostics)'};
const SEV_LABEL={red:'Overdue',orange:'High',yellow:'Watch',blue:'Review',green:'Ready',warn:'Open'};


function setNotificationCount(el, value){
if(typeof el==='string') el=document.getElementById(el);
if(!el) return;
const txt=el.querySelector('.badge-text'); if(!txt) return;
const count=Math.max(0,Math.floor(Number(value)||0));
txt.textContent = count>99 ?'99+': String(count);
el.classList.toggle('over-limit', count>99);
el.style.display = count===0 ?'none':'block';
el.setAttribute('aria-label', count>99 ?'99 or more notifications': count+' notifications');
}
/* renderAttention · its layers, innermost first: 1 n197 after   (PVX-N387; kept true by flow_t387) */
function renderAttention(){ return pvxRun('renderAttention',renderAttention$base,this,arguments); }
function renderAttention$base(){
const items=visibleAttentionItems();
setNotificationCount('attnCount', items.length);
const clearAllBtn=document.getElementById('attnClearAll');
if(clearAllBtn) clearAllBtn.style.display = items.length ?'':'none';
const el=document.getElementById('attnList');
if(!items.length){el.innerHTML=`<div class="empty" style="padding:40px 20px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><b>No attention items</b><span>All current patients are clear.</span></div>`;return;}
el.innerHTML=items.map((it,i)=>{
const sev=it.sev; const accent=SEV_ACCENT[sev]||'var(--s-diagnostics)';
const nm=it.p?it.p.name:''; let rest=it.t; if(nm && rest.indexOf(nm)===0) rest=rest.slice(nm.length).trim();
const patient=nm||it.t; const issue=nm?rest:'';
const parts=String(it.s||'').split(' \u00b7 ');
const secHTML=parts.length>1 ?`<strong>${bcEsc(parts[0])}</strong> \u00b7 ${bcEsc(parts.slice(1).join(' \u00b7 '))}`: bcEsc(it.s||'');
return`<div class="attn-item${i===0?' primary':''}" data-pid="${it.p?it.p.id:''}" data-room="${it.room||''}" data-intake="${bcEsc(it.intakeId||'')}" data-key="${bcEsc(it.key)}" style="--accent:${accent};animation-delay:${i*40}ms"><div class="copy"><div class="primary-line"><span class="patient">${bcEsc(patient)}</span>${issue?`<span class="issue">${bcEsc(issue)}</span>`:''}</div><div class="secondary">${secHTML}</div></div>${sev==='red'?`<div class="overdue-badge" role="status" aria-label="Overdue"><span class="overdue-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5.5v8.5"/><path d="M12 18.6v.01"/></svg></span><span class="overdue-text">OVERDUE</span></div>`:sev==='orange'?`<div class="high-badge" role="status" aria-label="High priority"><span class="high-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5.5v8.5"/><path d="M12 18.6v.01"/></svg></span><span class="high-text">HIGH</span></div>`:sev==='blue'?`<div class="review-badge" role="status" aria-label="Diagnostics ready for review"><span class="review-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.5 3.75h9"/><path d="M9 3.75v4.65L5.7 15a3.6 3.6 0 0 0 3.15 5.25h6.3a3.6 3.6 0 0 0 3.15 -5.25L15 8.4V3.75"/><path d="M7.5 13.5h9"/></svg></span><span class="review-text">REVIEW</span></div>`:sev==='green'?`<div class="ready-badge" role="status" aria-label="Ready"><span class="ready-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.3 9.6 17.25 19.5 7.2"/></svg></span><span class="ready-text">READY</span></div>`:sev==='warn'?`<div class="room-open-badge" role="status" aria-label="Room open"><span class="room-open-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5.25 20.25V3.75h10.5v16.5"/><path d="M15.75 5.25 10.5 6.75v12l5.25 1.5"/><circle cx="13.05" cy="13.05" r="0.68" fill="currentColor" stroke="none"/><path d="M3.75 20.25h16.5"/></svg></span><span class="room-open-text">OPEN</span></div>`:sev==='yellow'?`<div class="watch-badge" role="status" aria-label="Watch"><span class="watch-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2.7 12s3.45 -6 9.3 -6 9.3 6 9.3 6 -3.45 6 -9.3 6S2.7 12 2.7 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></span><span class="watch-text">WATCH</span></div>`:`<div class="severity">${SEV_LABEL[sev]||''}</div>`}<div class="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div><button class="attn-clear" title="Clear this alert" aria-label="Clear alert: ${bcEsc(patient)}${issue?' '+bcEsc(issue):''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`;
}).join('');
el.querySelectorAll('.attn-item').forEach(n=>n.onclick=()=>{ if(n.dataset.intake) openIntakeReview(n.dataset.intake); else if(n.dataset.pid) openDrawer(n.dataset.pid); else if(n.dataset.room) switchView('rooms'); });
el.querySelectorAll('.attn-clear').forEach(btn=>btn.onclick=(e)=>{ e.stopPropagation(); dismissAlert(btn.closest('.attn-item').dataset.key); });
}

function renderDist(animate){
const active=PATIENTS.filter(isActive);
const total=active.length;
document.getElementById('distTotal').textContent = total===1 ?'1 patient': total+' patients';
const rows=FLOW_COLS.map(s=>{
const n=active.filter(p=>p.status===s).length;
const pct=total? Math.round(n/total*100):0;
const c=STATUSES[s].color;
const shown=(animate&&RAF)?0:pct;
return`<div class="status-row"><div class="status-label"><span class="sdot" style="color:${c};background:${c}"></span>${s}</div>`
+`<div class="track${n===0?' zero':''}"><div class="fill" data-w="${pct}" style="--w:${shown}%;--c:${c}"></div></div>`
+`<div class="count">${n}</div></div>`;
}).join('');
const el=document.getElementById('distList');
el.innerHTML=rows;
if(animate && RAF){ RAF(()=>RAF(()=>{ el.querySelectorAll('.fill').forEach(f=>{ f.style.setProperty('--w', f.dataset.w+'%'); }); })); }
}

 
function docShort(id){ const d=doc(id); return d===UNASSIGNED ?'Unassigned':'Dr. '+d.name.split(' ').slice(-1)[0]; }
function execMetrics(){
const active=PATIENTS.filter(isActive);
const working=DOCTORS.map(d=>{
const pts=PATIENTS.filter(p=>p.doctor===d.id && isActive(p));
const waits=pts.map(waitMinutes);
return {d, n:pts.length, avg: waits.length? Math.round(waits.reduce((a,b)=>a+b,0)/waits.length):0};
}).filter(x=>x.n>0);
const assigned=active.filter(p=>p.doctor!=='unassigned').length;
const byCount=[...working].sort((a,b)=>b.n-a.n);
const clin=ROOMS.filter(r=>r!=='Lobby');
const inUse=clin.filter(r=>active.some(p=>p.room===r)).length;

const pickups=examPickupsToday();
const byDoc={};
pickups.forEach(p=>{ const id=p.examStartedByDoctorId; if(!id||id==='unassigned') return; (byDoc[id]=byDoc[id]||[]).push(p.examWaitMinutes); });
const showIds=new Set(Object.keys(byDoc));
DOCTORS.forEach(d=>{ if(active.some(p=>p.doctor===d.id)) showIds.add(d.id); });
const waitByDoc=[...showIds].map(id=>{ const ws=byDoc[id]||[];
const activePts=active.filter(p=>p.doctor===id);



const avg=activePts.length? Math.round(activePts.reduce((a,p)=>a+waitMinutes(p),0)/activePts.length) : null;
const longest=activePts.length
? [...activePts].sort((a,b)=>waitMinutes(b)-waitMinutes(a))[0]
: null;
return { d:doc(id), n:ws.length, avg, activePts, load:activePts.length, longest };
}).sort((a,b)=> ((b.avg==null?-1:b.avg)-(a.avg==null?-1:a.avg)) || (b.load-a.load) || a.d.name.localeCompare(b.d.name));
return {
working, doctorsWorking:working.length,
avgPerDoc: working.length? (assigned/working.length):0,
highest: byCount[0], lowest: byCount[byCount.length-1],
inUse, totalRooms:clin.length, util: clin.length? Math.round(inUse/clin.length*100):0,
waitByDoc, casesToday: pickups.length,
discharged: completedTodayCount('Discharged'), admitted: completedTodayCount('Admitted'), euthanized: completedTodayCount('Euthanized'), deceased: completedTodayCount('Deceased'), completed: completedTodayCount('Discharged')+completedTodayCount('Admitted')+completedTodayCount('Euthanized')+completedTodayCount('Deceased')
};
}


function pickedUpToday(doctorId){ return examPickupsToday().some(p=>p.examStartedByDoctorId===doctorId); }
function isDoctorBlocked(doctorId){
const d=doc(doctorId), wf=d.workflowState;
return d.unavailable===true || d.blocked===true ||
(typeof wf==='string'&& ['in-surgery','in-procedure','on-break','off-floor','unavailable'].indexOf(wf)>=0);
}
function isDoctorAvailableForAssignment(doctorId, activePatients){
const d=doc(doctorId);
const activeForDoctor=(activePatients||PATIENTS.filter(isActive)).filter(p=>p.doctor===doctorId);
const isOnService = (typeof d.onService==='boolean') ? d.onService
: (activeForDoctor.length>0 || pickedUpToday(doctorId));
const acceptsCases = d.acceptsCases!==false;
const manuallyUnavailable = d.unavailable===true;
const blocked = isDoctorBlocked(doctorId);
const cap = (typeof d.maxCapacity==='number') ? d.maxCapacity : 1;
const hasCapacity = activeForDoctor.length < cap;
return isOnService && acceptsCases && !manuallyUnavailable && !blocked && hasCapacity;
}


const WD_TREND_KEY='wd_trend_v1', WD_TREND_WINDOW=8*60*1000;
function wdComputeTrends(rows){
let store; try{store=JSON.parse(localStorage.getItem(WD_TREND_KEY))||{};}catch(e){store={};}
const now=Date.now(), out={}; let changed=false;
rows.forEach(x=>{
const id=x.d.id, avg=x.avg;
if(avg==null){ if(store[id]){ delete store[id]; changed=true; } out[id]={cls:'',text:'—'}; return; }
const e=store[id];
if(!e){ store[id]={base:avg,ts:now}; changed=true; out[id]={cls:'',text:'—'}; return; }
const delta=avg-e.base;
if(now-e.ts>WD_TREND_WINDOW){ store[id]={base:avg,ts:now}; changed=true; }
out[id]= delta>=1 ? {cls:'up',text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>'+pvxDur(delta),say:'Average wait up '+pvxSpoken(delta)+' in the last '+Math.round(WD_TREND_WINDOW/60000)+' minutes'}
: delta<=-1 ? {cls:'down',text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>'+pvxDur(-delta),say:'Average wait down '+pvxSpoken(-delta)+' in the last '+Math.round(WD_TREND_WINDOW/60000)+' minutes'}
: {cls:'',text:'—',say:'Average wait unchanged in the last '+Math.round(WD_TREND_WINDOW/60000)+' minutes'};
});
if(changed){ try{localStorage.setItem(WD_TREND_KEY,JSON.stringify(store)); }catch(e){} }
return out;
}
function renderOps(animate){
const m=execMetrics();
const avail=m.totalRooms-m.inUse;


const A=CKPI_AC;
const opsCards=[
{k:'doctors',    lab:'Doctors Working', ac:A.cyan,  raw:m.doctorsWorking,
val:m.doctorsWorking, sub:'On shift now',     chip:''},
{k:'rooms',      lab:'Rooms In Use',    ac:(avail<=0?A.amber:A.cyan),  rail:m.util,   /* PVX-N365: amber once no room is free */
val:`${m.inUse}<small><span aria-hidden="true">/</span><span class="pvx-sr"> of </span>${m.totalRooms}</small>`,
sub:avail<=0?'No rooms available':`${avail} room${avail===1?'':'s'} available`, chip:m.util+'%'},
{k:'discharged', lab:'Discharged Today',ac:A.green, raw:m.discharged,
val:m.discharged,     sub:'Patients released', chip:'Today'},
{k:'admitted',   lab:'Admitted Today',  ac:A.blue,  raw:m.admitted,
val:m.admitted,       sub:'To hospital',       chip:'Today'},
{k:'completed',  lab:'Completed Today', ac:A.green, raw:m.completed,
val:m.completed,      sub:'Total off the board',chip:'Today'}
];
ckpiSample('ops', opsCards.filter(o=>typeof o.raw==='number'));
document.getElementById('opsGrid').innerHTML = opsCards.map(o=>
`<article class="command-kpi command-kpi--${o.k}" style="--kaccent:${o.ac.h};--kaccent-rgb:${o.ac.r}">
      <div class="command-kpi__top">
        <span class="command-kpi__label">${o.lab}</span>
        ${o.chip?`<span class="command-kpi__chip">${o.chip}</span>`:''}
      </div>
      <div class="command-kpi__value">${o.val}</div>
      <div class="command-kpi__sub">${o.sub}</div>
      ${o.rail!=null
        ? `<div class="command-kpi__rail">${o.rail>0?`<i style="width:${Math.min(100,o.rail)}%"></i>`:''}</div>`
        : ckpiSpark('ops',o.lab)}
    </article>`).join('');

document.getElementById('wdCount').textContent = m.waitByDoc.length + (m.waitByDoc.length===1?' doctor on service':' doctors on service');

const loads=m.waitByDoc.map(x=>x.load||0);
const maxLoad=loads.length?Math.max(...loads):0;
const minLoad=loads.length?Math.min(...loads):0;
const balance=(maxLoad-minLoad<=1)?'Balanced':'Needs Balancing';
const balEl=document.getElementById('wdBalance');
balEl.textContent=balance;
balEl.style.color=balance==='Balanced'?'var(--ink-400)':'var(--s-waiting)';
balEl.style.borderColor=balance==='Balanced'?'rgba(120,145,170,.11)':'rgba(235,201,93,.20)';
balEl.style.background=balance==='Balanced'?'rgba(255,255,255,.014)':'rgba(235,201,93,.06)';

const activeLoads=m.waitByDoc.filter(x=>x.load>0).map(x=>x.load);
const avgLoad=activeLoads.length ? activeLoads.reduce((a,b)=>a+b,0)/activeLoads.length : 0;
const wl=document.getElementById('opsWaitList');
const activeAll=PATIENTS.filter(isActive);
const wdTrends=wdComputeTrends(m.waitByDoc);

wl.innerHTML = m.waitByDoc.length ? m.waitByDoc.map(x=>{
const has=x.avg!=null;
const waitCls=!has?'':(x.avg>120?'crit':x.avg>60?'warn':'');


const state = isDoctorBlocked(x.d.id)
? {label:'Unavailable', cls:''}
: isDoctorAvailableForAssignment(x.d.id, activeAll)
? {label:'Available for assignment', cls:'available'}
: (x.load>Math.max(1,Math.ceil(avgLoad)))
? {label:'High load', cls:'high'}
: {label:'Accepting cases', cls:''};

const longest=x.longest
?`Longest: ${bcEsc(x.longest.name)} · ${fmtWait(waitMinutes(x.longest))}`
:'No active cases';

return`<div class="wd-row ${x.load===0?'is-idle':''}" data-doctor="${x.d.id}" title="View ${docShort(x.d.id)}">
      <span class="wd-avatar" style="--wd-accent:${x.d.color}">${x.d.initials}</span>
      <div class="wd-main">
        <div class="wd-top">
          <span class="wd-name">${docShort(x.d.id)}</span>
          <span class="wd-count">${x.load} active patient${x.load===1?'':'s'}</span>
        </div>
        <div class="wd-subline">
          <span class="wd-longest">${longest}</span>
          <span class="wd-state ${state.cls}"${state.label!=='Unavailable'?` data-assign="${x.d.id}" title="Assign an unassigned patient to ${docShort(x.d.id)}"`:''}>${state.label}</span>
        </div>
      </div>
      <div class="wd-metrics">
        <span class="wd-trend ${wdTrends[x.d.id].cls}" ${wdTrends[x.d.id].say?'role="img" aria-label="'+wdTrends[x.d.id].say+'"':'aria-hidden="true"'}>${wdTrends[x.d.id].text}</span>
        <span class="wd-wait-stack">
          <span class="wd-wait ${waitCls}">${has?fmtWait(x.avg):'—'}</span>
          <span class="wd-wait-label">Avg wait</span>
        </span>
        <span class="wd-action" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></span>
      </div>
    </div>`;
}).join('') :`<div class="empty-mini"><div class="ico">${EMPTY_ICON}</div><b>No doctors on service</b></div>`;
}





document.addEventListener('click',e=>{
if(e.target.closest('.wd-state[data-assign]')) return;
const row=e.target.closest('.wd-row[data-doctor]');
if(!row) return;
const id=row.dataset.doctor;
if(!id) return;
filters.doctor=id;
const listSeg=document.querySelector('.seg[data-view="list"]');
if(listSeg) listSeg.click();
else{
renderFilterBar();
renderTable();
}
});



function assignUnassignedList(){ return PATIENTS.filter(p=>isActive(p) && (!p.doctor || p.doctor==='unassigned')); }
function renderAssignBody(){
const body=document.getElementById('assignBody'); if(!body) return;
const list=assignUnassignedList();
const sub=document.getElementById('assignSub');
if(sub) sub.textContent = list.length ? (list.length+' unassigned patient'+(list.length===1?'':'s')) :'No unassigned patients';
if(!list.length){ body.innerHTML='<div class="assign-empty">Every active patient already has a doctor.</div>'; return; }
body.innerHTML = list.map(function(p){
var meta=[p.species,p.breed].filter(Boolean).join(' · ');
var reason=p.reason?(' · '+p.reason):'';
var pr=p.priority||3;
return'<button class="assign-row" data-pid="'+p.id+'">'
+'<div><div class="assign-name">'+bcEsc((p.name+' '+(p.last||'')).trim())+'</div>'
+'<div class="assign-meta">'+bcEsc(meta+reason)+'</div></div>'
+'<div class="assign-side"><span class="assign-loc">'+bcEsc(p.room||'Lobby')+'</span><span class="assign-prio p'+pr+'">P'+pr+'</span></div>'
+'</button>';
}).join('');
}
let assignDocId=null;
function openAssignModal(docId){
assignDocId=docId;
var nm=document.getElementById('assignDocName'); if(nm) nm.textContent=docShort(docId);
renderAssignBody();
document.getElementById('assignScrim').classList.add('open');
document.getElementById('assignModal').classList.add('open');
}
function closeAssignModal(){
document.getElementById('assignScrim').classList.remove('open');
document.getElementById('assignModal').classList.remove('open');
assignDocId=null;
}
document.addEventListener('click',function(e){ var s=e.target.closest('.wd-state[data-assign]'); if(s){ e.stopPropagation(); openAssignModal(s.dataset.assign); } });
(function(){
var sc=document.getElementById('assignScrim'), cl=document.getElementById('assignClose'), ca=document.getElementById('assignCancel'), body=document.getElementById('assignBody');
if(sc) sc.onclick=closeAssignModal;
if(cl) cl.onclick=closeAssignModal;
if(ca) ca.onclick=closeAssignModal;
if(body) body.addEventListener('click',function(e){ var r=e.target.closest('.assign-row[data-pid]'); if(!r) return; var p=PATIENTS.find(function(x){return String(x.id)===r.dataset.pid;}); if(p && assignDocId){ assignDoctor(p, assignDocId); } closeAssignModal(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ var m=document.getElementById('assignModal'); if(m && m.classList.contains('open')) closeAssignModal(); } });
})();
function renderFilterBar(){
const active=PATIENTS.filter(isActive);
const statusChips=FLOW_COLS.map(s=>{
const n=active.filter(p=>p.status===s).length;
return`<button class="chip ${filters.status===s?'active':''}" data-f="status" data-v="${s}" aria-pressed="${filters.status===s}">
      <span class="d" style="width:8px;height:8px;border-radius:50%;background:${STATUSES[s].color};display:inline-block"></span>${s}<span class="cnt">${n}</span></button>`;
}).join('');
const prioChips=[1,2,3].map(p=>`<button class="chip ${filters.prio===p?'active':''}" data-f="prio" data-v="${p}" aria-pressed="${filters.prio===p}"><span class="d" style="width:8px;height:8px;border-radius:50%;background:${PRIO[p].c};display:inline-block"></span>${PRIO[p].l}</button>`).join('');
const anyFilter=filters.status||filters.prio||filters.doctor||filters.liaison;
document.getElementById('filterBar').innerHTML =
statusChips +`<span style="width:1px;height:22px;background:var(--glass-hairline)"></span>`+
prioChips +
`<span class="grow"></span>`+
`<span style="width:1px;height:22px;background:var(--glass-hairline)"></span>`+
`<span id="docFilterMount"></span><span id="liaFilterMount"></span>`+
(anyFilter?`<button class="chip" data-f="clear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Clear</button>`:'') +
`<span class="result" id="resCount"></span>`;

document.querySelectorAll('#filterBar .chip').forEach(c=>c.onclick=()=>{
const f=c.dataset.f;
if(f==='clear'){filters={status:null,prio:null,doctor:null,liaison:null};}
else{const v=c.dataset.v;const val=f==='prio'?+v:v;filters[f]=filters[f]===val?null:val;}
renderFilterBar();renderTable();
});


document.getElementById('docFilterMount').appendChild(createDropdown({
items: [{id:'all', name:'All doctors', initials:'', color:'#B9C7D6'}, ...DOCTORS],
selectedId: filters.doctor ||'all',
placeholder:'All doctors', searchPlaceholder:'Search doctors…',
variant:'compact',
onSelect: id => { filters.doctor = (id==='all'? null : id); renderFilterBar(); renderTable(); }
}));

document.getElementById('liaFilterMount').appendChild(createDropdown({
items: [{id:'all', name:'All liaisons', initials:'', color:'#B9C7D6'},
{id:'none', name:'No liaison', initials:'', color:'#7A9BB5'}, ...LIAISONS],
selectedId: filters.liaison ||'all',
placeholder:'All liaisons', searchPlaceholder:'Search liaisons…',
variant:'compact',
onSelect: id => { filters.liaison = (id==='all'? null : id); renderFilterBar(); renderTable(); }
}));
}

/* renderTable · its layers, innermost first: 1 n349 after · 2 n354 after   (PVX-N387; kept true by flow_t387) */
function renderTable(){ return pvxRun('renderTable',renderTable$base,this,arguments); }
function renderTable$base(){
const rows=filtered().filter(isActive).sort(pvxByUrgency);
const rc=document.getElementById('resCount'); if(rc) rc.textContent=rows.length+' Patients';
const body=document.getElementById('tableBody');
document.getElementById('tableEmpty').classList.toggle('hidden',rows.length>0);
if(rows.length===0){
const _tot=PATIENTS.filter(isActive).length;
const _tt=document.getElementById('tableEmptyTitle'), _ts=document.getElementById('tableEmptySub');
if(_tot===0){ if(_tt)_tt.textContent='No patients currently checked in.'; if(_ts)_ts.textContent='Patients appear here after check-in.'; }
else { if(_tt)_tt.textContent='No patients match'; if(_ts)_ts.textContent='Try clearing a filter or search'; }
}
body.innerHTML=rows.map(p=>{
const w=waitMinutes(p);const wc=w>120?'crit':w>45?'warn':'';
return`<tr data-pid="${p.id}">
      <td><div class="pt-cell">${mono(p,'patient-medallion patient-medallion--compact')}
        <div class="nm"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${bcEsc(p.name)} ${bcEsc(p.last)}">${bcEsc(p.name)} ${bcEsc(p.last)}</button>${resusBadge(p)}${recBadge(p)}${msgBadge(p)}${typeof fgInline==='function'?fgInline(p):''}</b><span>${pvxDot(bcEsc(p.species),bcEsc(formatPatientAge(p)))}</span></div></div></td>
      <td><div class="reason" title="${bcEsc((p.reasonProblems&&p.reasonProblems.length)?problemsToString(p.reasonProblems):(p.reason||''))}">${bcEsc(compactProblems(p))}</div></td>
      <td>${p.doctor==='unassigned'?'<span class="muted">Unassigned</span>':`<span class="doctag">${docAv(p.doctor)}${doc(p.doctor).name}</span>`}</td>
      <td><span class="loc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>${bcEsc(p.room)}</span></td>
      <td>${statusPill(p.status)}</td>
      <td><span class="prio prio-${p.prio}">${PRIO[p.prio].l}</span></td>
      <td class="muted">${fmtTime(p.arrival)}</td>
      <td><span class="wait ${wc}">${fmtWait(w)}</span></td>
    </tr>`;
}).join('');
body.querySelectorAll('tr').forEach(tr=>tr.onclick=()=>openDrawer(tr.dataset.pid));
}



const COL_EMPTY={Waiting:'No patients waiting',Exam:'No exams in progress',Diagnostics:'No active diagnostics',Ultrasound:'No ultrasounds running',Procedure:'No procedures in progress'};
const EMPTY_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
/* renderBoard · its layers, innermost first: 1 n349 after   (PVX-N387; kept true by flow_t387) */
function renderBoard(){ return pvxRun('renderBoard',renderBoard$base,this,arguments); }
function renderBoard$base(){
const board=document.getElementById('board');
if(PATIENTS.filter(isActive).length===0){
board.classList.add('board-empty');
board.innerHTML=`<div class="empty board-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><b>No active patients in the hospital.</b><span>New patients appear here after check-in.</span></div>`;
return;
}
board.classList.remove('board-empty');
board.innerHTML=FLOW_COLS.map(s=>{
const list=pvxBoardFiltered().filter(p=>p.status===s).sort(pvxByUrgency);
const cards=list.map(p=>cardHTML(p)).join('') ||
`<div class="empty-mini empty-mini--stage"><div class="ico">${EMPTY_ICON}</div><b>${(typeof searchQ!=='undefined'&&String(searchQ).trim())?'No matches here':(COL_EMPTY[s]||'Nothing here')}</b></div>`;
return`<div class="col" data-status="${s}">
      <div class="col-head"><span class="cd" style="background:${STATUSES[s].color}"></span><h4>${s}</h4><span class="cc">${list.length}</span></div>
      <div class="col-body" data-status="${s}">${cards}</div>
    </div>`;
}).join('');
wireDnD();
}
function cardHTML(p){
const w=waitMinutes(p);const wc=w>120?'crit':w>45?'warn':'';
return`<div class="card" draggable="true" data-pid="${p.id}">
    <span class="edge" style="background:${PRIO[p.prio].c}"></span>
    <div class="c-top">${mono(p,'patient-medallion patient-medallion--compact')}<b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${bcEsc(p.name)} ${bcEsc(p.last)} · ${p.status}">${bcEsc(p.name)} ${bcEsc(p.last)}</button>${msgBadge(p)}</b> <button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="stage" aria-label="Move ${bcEsc(p.name)} to another stage" title="Move to another stage">${PVX_MOVE_ICON}</button><span class="prio prio-${p.prio}" style="width:22px;height:22px;font-size:0.625rem">${PRIO[p.prio].l}</span></div>
    <div class="c-reason">${p.species?'<span class="c-sp">'+bcEsc(typeof speciesEnglish==='function'?speciesEnglish(p.species):p.species)+'</span> · ':''}${bcEsc(compactProblems(p))}</div>${typeof fgCard==='function'?fgCard(p):''}${typeof fvOrChip==='function'?fvOrChip(p):''}
    ${usFlag(p)}${typeof fvWaitChip==='function'?fvWaitChip(p):''}${typeof fvPresenceChip==='function'?fvPresenceChip(p):''}
    <div class="c-meta"><div class="l">${p.doctor==='unassigned'?'<span class="muted" style="font-size:0.75rem">No doctor</span>':docAv(p.doctor)}${p.liaison?liaAv(p.liaison):''}${ctAvRow(p)}
      <span class="loc" style="font-size:0.75rem">${bcEsc(p.room)}</span></div>
      <span class="wait ${wc}" style="font-size:0.75rem">${fmtWait(w)}</span></div>
    <div class="card-expand">
      <div class="row"><span>Owner</span><b>${bcEsc(p.owner)}</b></div>
      <div class="row"><span>Arrived</span><b>${fmtTime(p.arrival)}</b></div>
      <div class="row"><span>Liaison</span><b>${liaison(p.liaison)?liaison(p.liaison).name:'—'}</b></div>
      ${ctCardAction(p)}
    </div>
  </div>`;
}
let dragId=null;
function wireDnD(){
document.querySelectorAll('.card').forEach(c=>{
c.addEventListener('dragstart',e=>{dragId=c.dataset.pid;c.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
c.addEventListener('dragend',()=>{c.classList.remove('dragging');dragId=null;
document.querySelectorAll('.col').forEach(x=>{ x.classList.remove('drop'); const b=x.querySelector('.col-body'); if(b) b._pvxN=0; });
document.querySelectorAll('.cz-target').forEach(x=>{ x.classList.remove('cz-over'); x._pvxN=0; });
const bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim');});
c.addEventListener('click',()=>{ if(!c.classList.contains('dragging')) openDrawer(c.dataset.pid); });
});
document.querySelectorAll('[data-usflag]').forEach(el=>{ el.onclick=e=>{ e.stopPropagation(); openUltrasoundRequest(el.getAttribute('data-usflag')); }; });
document.querySelectorAll('.col-body').forEach(col=>{
const parent=col.closest('.col');
col.addEventListener('dragenter',()=>{ if(dragId) col._pvxN=(col._pvxN||0)+1; });   /* PVX-N192: entering a card inside isn't leaving */
col.addEventListener('dragover',e=>{ const p=dragId&&PATIENTS.find(x=>x.id===dragId); if(!p) return; e.preventDefault();
  const ok=p.status!==col.dataset.status; e.dataTransfer.dropEffect=ok?'move':'none'; parent.classList.toggle('drop',ok); });
col.addEventListener('dragleave',()=>{ if(col._pvxN>1){ col._pvxN--; return; } col._pvxN=0; parent.classList.remove('drop'); });
col.addEventListener('drop',e=>{
e.preventDefault();parent.classList.remove('drop'); col._pvxN=0;
const p=PATIENTS.find(x=>x.id===dragId);
const newStatus=col.dataset.status;
if(p && p.status!==newStatus){ moveStatus(p,newStatus); }
});
});
}
/* moveStatus · its layers, innermost first: 1 #10 wrap · 2 n192 wrap · 3 n253-admit wrap · 4 n350 wrap   (PVX-N387; kept true by flow_t387) */
function moveStatus(p,newStatus){ return pvxRun('moveStatus',moveStatus$base,this,arguments); }
function moveStatus$base(p,newStatus){
if(newStatus==='Discharged'||newStatus==='Admitted') return completePatient(p,newStatus);
const old=p.status;
const at=new Date();
p.status=newStatus;


if(newStatus==='Exam'&& !p.examStartedAt){
p.examStartedAt = at;
p.examStartedByDoctorId = (p.doctor && p.doctor!=='unassigned') ? p.doctor : null;
p.examWaitMinutes = Math.max(0, Math.round((at - (p.arrival||at))/60000));
}
p.timeline.push({label:`${newStatus} started`, at:at, meta:`Moved from ${old}`});

if(newStatus==='Ultrasound'&& !p.ultrasound){
p.ultrasound = { study:'Abdominal Ultrasound', clinicalQuestion:'', status:'incomplete', requestStatus:'incomplete', requestedAt:null, createdAt:at };
}
const done = ['Diagnostics','Ultrasound','Procedure'].includes(old) ?`${old} completed`:`Moved to ${newStatus}`;
notify(bcEsc(done),`${bcEsc(p.name)} · in ${bcEsc(p.room)}`, {icon:'move', color:STATUSES[newStatus].color});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });

if(newStatus==='Ultrasound'&& (!p.ultrasound || p.ultrasound.status!=='requested')){
const pid=p.id; setTimeout(function(){ openUltrasoundRequest(pid); }, 160);
}
}


/* n333: on Ultrasound's page */
const US_ICON_REQ ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const US_ICON_INC ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
const US_ICON_WAVE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1.3"/><path d="M8.9 12.6a4.4 4.4 0 0 1 6.2 0"/><path d="M6.2 9.8a8.2 8.2 0 0 1 11.6 0"/></svg>';
function usFlag(p){
const u=p.ultrasound; if(!u) return'';
const st=usEff(p);
if(st==='completed'){
if(p.status!=='Ultrasound'&& !(u.completedAt && isTodayHosp(u.completedAt))) return'';
const extra = (u.criticalFinding&&!u.critSeenAt?'<span class="us-flag crit" role="img" aria-label="Critical ultrasound finding, not yet seen">'+(window.PVX_GI?PVX_GI.warn:'')+'Critical ultrasound finding</span>':'')+(u.doctorDiscussionNeeded ?'<span class="us-flag disc">'+US_ICON_WAVE+'Discussion requested</span>':'');   /* PVX-N197 */
return'<span class="us-flag done">'+US_ICON_REQ+'Ultrasound · Completed '+(u.completedAt?fmtTime(u.completedAt):'')+'</span>'+extra;
}
if(p.status!=='Ultrasound') return'';
if(st==='incomplete') return'<button type="button" class="us-flag inc" data-usflag="'+p.id+'" title="Complete the ultrasound request" aria-label="'+bcEsc('Complete ultrasound request for '+(p.name+' '+(p.last||'')).trim())+'">'+US_ICON_INC+'Ultrasound · Request incomplete</button>';   /* PVX-N145 UR-06 */
if(st==='in_progress') return'<span class="us-flag prog"><span class="fd"></span>Ultrasound · In Progress</span>';
if(st==='accepted') return'<span class="us-flag acc">'+US_ICON_REQ+'Ultrasound · Accepted · '+bcEsc(drName(u.acceptedBy))+'</span>';
const pos=usQueuePos(p);
if(pos===1) return'<span class="us-flag req">'+US_ICON_WAVE+'Ultrasound · next</span>';
if(pos)     return'<span class="us-flag req">'+US_ICON_WAVE+'Ultrasound · #'+pos+' in Queue</span>';
return'<span class="us-flag req">'+US_ICON_REQ+'Ultrasound · Requested</span>';
}

function usDiagnostics(p){
const out=[];
try{ if(p.records && p.records.status==='received') out.push('pDVM records received'+(p.records.pdvm?(' · '+p.records.pdvm):'')); }catch(e){}
return out;
}
let _usPid=null;
/* openUltrasoundRequest · its layers, innermost first: 1 n351 wrap · 2 n370 after   (PVX-N387; kept true by flow_t387) */
function openUltrasoundRequest(pid){ return pvxRun('openUltrasoundRequest',openUltrasoundRequest$base,this,arguments); }
function openUltrasoundRequest$base(pid){
const p=(pid && typeof pid==='object') ? pid : PATIENTS.find(x=>x.id===pid); if(!p) return;
_usPid=p.id;
if(!p.ultrasound) p.ultrasound={ study:'Abdominal Ultrasound', clinicalQuestion:'', status:'incomplete', requestStatus:'incomplete', requestedAt:null, createdAt:new Date() };
const u=p.ultrasound;
const docName=(p.doctor&&p.doctor!=='unassigned')?('Dr. '+doc(p.doctor).name.split(/\s+/).slice(-1)[0]):'Unassigned';
const sub=['ER', docName, (p.species||'—'), (p.weight||'—')].join(' · ');
const hist=(p.reasonProblems&&p.reasonProblems.length)
?'<ul class="us-list">'+p.reasonProblems.map(pr=>'<li>'+bcEsc(formatProblem(pr))+'</li>').join('')+'</ul>'
:'<div class="us-empty">No presenting problems recorded</div>';
const dg=usDiagnostics(p);
const dxAuto = dg.length ?'<div class="us-sub">Auto-detected from Flow</div><ul class="us-list" style="margin-bottom:10px">'+dg.map(d=>'<li>'+bcEsc(d)+'</li>').join('')+'</ul><div class="us-sub">Doctor notes</div>':'';
let scrim=document.getElementById('usScrim'), modal=document.getElementById('usModal');
if(!scrim){ scrim=document.createElement('div'); scrim.id='usScrim'; scrim.className='us-scrim'; document.body.appendChild(scrim); scrim.addEventListener('click',closeUltrasound); }
if(!modal){ modal=document.createElement('div'); modal.id='usModal'; modal.className='us-modal'; document.body.appendChild(modal); }
modal.innerHTML =
'<div class="us-head"><div><div class="us-h-t" id="usHT">Ultrasound request</div>'
+'<div class="us-h-name" id="usHN">'+bcEsc((p.name+' '+(p.last||'')).trim())+'</div>'
+'<div class="us-h-sub">'+bcEsc(sub)+'</div></div>'
+'<button class="us-x" id="usX" type="button" aria-label="Close" title="Close (Esc)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
+'<div class="us-body">'
+'<div class="us-sect"><div class="us-lab">Study</div><div class="us-static">Abdominal Ultrasound</div></div>'
+'<div class="us-sect"><label class="us-lab" for="usCQ">Clinical question<span class="req" aria-hidden="true">*</span></label>'
+'<textarea class="us-input" id="usCQ" required aria-required="true" placeholder="What do you want Internal Medicine to evaluate?">'+bcEsc(u.clinicalQuestion||'')+'</textarea></div>'
+'<div class="us-sect"><div class="us-lab">Relevant history</div>'+hist+'</div>'
+'<div class="us-sect"><label class="us-lab" for="usDx">Relevant diagnostics</label>'+dxAuto
+'<textarea class="us-input" id="usDx" placeholder="Add pertinent lab results, imaging findings, or other diagnostic information…">'+bcEsc(u.diagnosticsNotes||'')+'</textarea></div>'
+'</div>'
+'<div class="us-foot"><button class="us-send" id="usSend" type="button">Send to Ultrasound</button></div>';
const cq=modal.querySelector('#usCQ'), send=modal.querySelector('#usSend');
function refreshSend(){ send.disabled = !cq.value.trim(); }
refreshSend();
cq.addEventListener('input',function(){ const pp=PATIENTS.find(x=>x.id===_usPid); if(pp&&pp.ultrasound) pp.ultrasound.clinicalQuestion=cq.value; refreshSend(); });
const dx=modal.querySelector('#usDx'); if(dx) dx.addEventListener('input',function(){ const pp=PATIENTS.find(x=>x.id===_usPid); if(pp&&pp.ultrasound) pp.ultrasound.diagnosticsNotes=dx.value; });
modal.querySelector('#usX').onclick=closeUltrasound;
send.onclick=sendUltrasound;
modal.onkeydown=function(e){ if(e.key==='Escape'){ e.preventDefault(); closeUltrasound(); } };
modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','usHT usHN'); modal.removeAttribute('aria-label');   /* PVX-N145 UR-07 */
RAF ? RAF(function(){ scrim.classList.add('open'); modal.classList.add('open'); }) : (scrim.classList.add('open'),modal.classList.add('open'));
setTimeout(function(){ try{ cq.focus(); }catch(e){} }, 140);
}
function closeUltrasound(){
const _pvxPid=_usPid; setTimeout(function(){ pvxUsRefocus(_pvxPid,'req'); },80); setTimeout(function(){ pvxUsRefocus(_pvxPid,'req'); },450);   /* PVX-N145 UR-08 */
const scrim=document.getElementById('usScrim'), modal=document.getElementById('usModal');
if(scrim) scrim.classList.remove('open');
if(modal) modal.classList.remove('open');
_usPid=null;
try{ persist(); }catch(e){}
try{ renderBoard(); }catch(e){}
try{ renderUltrasound(); }catch(e){}
}
function sendUltrasound(){
const p=PATIENTS.find(x=>x.id===_usPid); if(!p){ return closeUltrasound(); }
const modal=document.getElementById('usModal'); const cq=modal?modal.querySelector('#usCQ'):null;
if(!p.ultrasound) p.ultrasound={ study:'Abdominal Ultrasound'};
if(cq) p.ultrasound.clinicalQuestion=cq.value.trim();
if(!p.ultrasound.clinicalQuestion) return;
const dx=modal?modal.querySelector('#usDx'):null; if(dx) p.ultrasound.diagnosticsNotes=dx.value.trim();
p.ultrasound.study='Abdominal Ultrasound';
const _usWasReady = p.ultrasound.status==='requested';
p.ultrasound.status='requested';
if(!p.ultrasound.requestedAt) p.ultrasound.requestedAt=new Date();

if(!['accepted','in_progress','completed'].includes(p.ultrasound.requestStatus||'')){
p.ultrasound.requestStatus='ready';
if(typeof p.ultrasound.queuePosition!=='number') p.ultrasound.queuePosition=usNextQueuePos();
}
p.timeline.push({label:_usWasReady?'Ultrasound request updated':'Ultrasound requested', at:new Date(), meta:p.ultrasound.study});
try{ notify('Sent to Ultrasound', bcEsc((p.name+' '+(p.last||'')).trim())+' · '+bcEsc(p.ultrasound.study), {icon:'flask', color:'var(--accent)'}); }catch(e){}
closeUltrasound();
renderAll();
}




 
const IM_DOCTOR_NAMES = (window.Pravix && Pravix.getIMDoctors) ? Pravix.getIMDoctors() : [
'Larry Berkwitt',
'Dianne Kittrell'
];
const IM_PALETTE=['#4F9AD6','var(--accent)','#5E8CA8','#2C7FB8','#6FA8C4'];
const IM_DOCTORS = IM_DOCTOR_NAMES.map((name,i)=>({ id:docSlug(name), name, initials:docInitials(name), color:IM_PALETTE[i%IM_PALETTE.length] }));


const IM_CONTACT={
'larry-berkwitt':{title:'Internist',dept:'Internal Medicine',phone:'(203) 926-8580',email:'Larry.Berkwitt@vca.com'},
'dianne-kittrell':{title:'Internist',dept:'Internal Medicine',phone:'(917) 558-6653',email:'Dianne.Kittrell@vca.com'}
};
function imContact(d){ return IM_CONTACT[d.id]||{title:'Internist',dept:'Internal Medicine',phone:'',email:''}; }
function imDoc(id){ return IM_DOCTORS.find(d=>d.id===id) || null; }
function drName(n){ return n ? ('Dr. '+String(n).trim().split(/\s+/).slice(-1)[0]) :'—'; }



const USX_STATUS_KEY='pravix:'+((typeof TENANT_ID!=='undefined')?TENANT_ID:'shoreline')+':usdocstatus:v1';
let USDOC_STATUS={};
try{ USDOC_STATUS=JSON.parse(localStorage.getItem(USX_STATUS_KEY))||{}; }catch(e){ USDOC_STATUS={}; }
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
let currentApp='flow';
let currentUsView='today';
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
function switchAppShell(app){
currentApp=app;
const nf=document.getElementById('navFlow'), nu=document.getElementById('navUltrasound'), nr=document.getElementById('navRounds');
if(nf) nf.classList.toggle('active',app==='flow');
if(nu) nu.classList.toggle('active',app==='ultrasound');
if(nr) nr.classList.toggle('active',app==='rounds');
[nf,nu,nr].forEach(function(a){ if(!a) return; if(a.classList.contains('active')) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });   /* n132 US-04 */
const sf=document.getElementById('subnavFlow'), su=document.getElementById('subnavUs'), sr=document.getElementById('subnavRd');
if(sf) sf.classList.toggle('hidden',app!=='flow');
if(su) su.classList.toggle('hidden',app!=='ultrasound');
if(sr) sr.classList.toggle('hidden',app!=='rounds');
document.body.classList.toggle('app-ultrasound',app==='ultrasound');
document.body.classList.toggle('app-rounds',app==='rounds');
const vbBrand=document.querySelector('.vb-brand');
if(vbBrand) vbBrand.textContent = app==='ultrasound'?'Pravix Ultrasound': (app==='rounds'?'Pravix Rounds':'Pravix Flow');
const vbVer=document.getElementById('versionLabel');
if(vbVer) vbVer.textContent = app==='ultrasound'?'Ultrasound v1.0': (app==='rounds'?'Rounds v3.0':'Flow v1.0');
}
function switchApp(app){
if(app===currentApp) return;
if(app==='ultrasound'){
switchAppShell('ultrasound');
document.body.classList.remove('client-mode');
try{ stopClientRotate(); stopClientCarousel(); }catch(e){}
['dashboard','list','flow','rooms','client'].forEach(x=>{ const el=document.getElementById('view-'+x); if(el) el.classList.add('hidden'); });
try{ rdHideAllViews(); }catch(e){}
switchUsView(currentUsView||'today');
}else if(app==='rounds'){
switchAppShell('rounds');
document.body.classList.remove('client-mode');
try{ stopClientRotate(); stopClientCarousel(); }catch(e){}
['dashboard','list','flow','rooms','client'].forEach(x=>{ const el=document.getElementById('view-'+x); if(el) el.classList.add('hidden'); });
usxHideAllViews();
switchRdView(currentRdView||'census');
}else{
switchAppShell('flow');
usxHideAllViews();
try{ rdHideAllViews(); }catch(e){}
switchView(currentView||'dashboard');
}
}
/* n333: on Ultrasound's page */



let usRole='im';
function usCanEdit(){ return usRole==='im'; }

var ADMIN_EMAILS=['daniel.giordano@pravix.app'];
var IS_ADMIN=false;
function isAdminUser(email){ return !!email && ADMIN_EMAILS.indexOf(String(email).toLowerCase())>-1; }

function usEmailIsIM(email){ if(!email) return false; email=String(email).toLowerCase();
try{ return Object.keys(IM_CONTACT).some(function(k){ return (IM_CONTACT[k].email||'').toLowerCase()===email; }); }catch(e){ return false; } }
function usApplyRoleForUser(user){ try{ IS_ADMIN = isAdminUser(user && user.email);
var im = IS_ADMIN || (user && usEmailIsIM(user.email)); usRole = im ?'im':'view';
var rt=document.getElementById('usxRole');
if(rt){ rt.style.display = im ?'':'none'; rt.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x.dataset.role===usRole); }); }
}catch(e){ usRole='view'; } }
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
function usEff(p){
const u=p&&p.ultrasound; if(!u) return null;
if(u.requestStatus) return u.requestStatus;
return (u.status==='requested') ?'ready':'incomplete';
}
function usActiveCases(){ return PATIENTS.filter(p=>p.ultrasound && usOpenCase(p)); }
/* the case's own status decides (admitting the patient doesn't end the request); it ends when the scan is completed or the patient leaves */
function usOpenCase(p){ const st=usEff(p); if(!st||st==='completed') return false; if(isActive(p)) return true; if(p.status!=='Admitted') return false;
  if(p.rounds) return !p.rounds.outcome;   /* on Rounds: while the admission is open */
  const t=p.completedAt?new Date(p.completedAt).getTime():0; return !!t&&Date.now()-t<48*3600e3; }   /* not on Rounds: 48 h after admission */
function usQueue(){
return usActiveCases().filter(p=>['ready','next','accepted'].includes(usEff(p))).sort((a,b)=>{
const qa=a.ultrasound.queuePosition, qb=b.ultrasound.queuePosition;
const na=(typeof qa==='number'), nb=(typeof qb==='number');
if(na&&nb) return qa-qb;
if(na) return -1; if(nb) return 1;
return (a.ultrasound.requestedAt||a.ultrasound.createdAt||0)-(b.ultrasound.requestedAt||b.ultrasound.createdAt||0);
});
}
/* n333: on Ultrasound's page */
function usQueuePos(p){ const i=usQueue().findIndex(x=>x.id===p.id); return i<0?null:i+1; }
function usNextQueuePos(){ return usQueue().length+1; }
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
function usTimeline(p,label,meta){ try{ (p.timeline=p.timeline||[]).push({label:label, at:new Date(), meta:meta||''}); }catch(e){} }
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
let _usxForceComplete=null;
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
let _usxCase=null, _usxDrag=null;
/* n333: on Ultrasound's page */

/* n333: on Ultrasound's page */

/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */



/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */



function umsSpark(n){
const g='us'+n;
return`<div class="timeline-spark" aria-label="Ultrasound progress: Taken, Started, Now">
        <svg viewBox="0 0 760 108" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${g}Stroke" gradientUnits="userSpaceOnUse" x1="22" y1="0" x2="742" y2="0">
              <stop offset="0" stop-color="#22C3E6"/>
              <stop offset=".52" stop-color="#5B8DEF"/>
              <stop offset="1" stop-color="#24C1EE"/>
            </linearGradient>
            <linearGradient id="${g}Fill" gradientUnits="userSpaceOnUse" x1="0" y1="32" x2="0" y2="108">
              <stop offset="0" stop-color="#5B8DEF" stop-opacity=".18"/>
              <stop offset=".22" stop-color="#5B8DEF" stop-opacity=".11"/>
              <stop offset=".52" stop-color="#6B75EC" stop-opacity=".055"/>
              <stop offset=".76" stop-color="#24C1EE" stop-opacity=".022"/>
              <stop offset="1" stop-color="#22C3E6" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${g}EdgeMask" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="760" y2="0">
              <stop offset="0" stop-color="white" stop-opacity="0"/>
              <stop offset=".06" stop-color="white" stop-opacity=".72"/>
              <stop offset=".18" stop-color="white"/>
              <stop offset=".82" stop-color="white"/>
              <stop offset=".94" stop-color="white" stop-opacity=".72"/>
              <stop offset="1" stop-color="white" stop-opacity="0"/>
            </linearGradient>
            <mask id="${g}AreaMask">
              <rect x="0" y="0" width="760" height="108" fill="url(#${g}EdgeMask)"/>
            </mask>
            <linearGradient id="${g}SweepGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#fff" stop-opacity="0"/>
              <stop offset=".5" stop-color="#fff" stop-opacity=".9"/>
              <stop offset="1" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path class="us-spark-area" d="M8 32 H752 V108 H8 Z" fill="url(#${g}Fill)" mask="url(#${g}AreaMask)"/>
          <path class="us-spark-glow" d="M8 32 H752" stroke="url(#${g}Stroke)" stroke-width="6" stroke-linecap="round"/>
          <path class="us-spark-line" d="M8 32 H752" stroke="url(#${g}Stroke)" stroke-width="2.5" stroke-linecap="round"/>
          <rect class="us-sweep" x="-120" y="27" width="105" height="10" rx="5" fill="url(#${g}SweepGradient)" filter="blur(2px)"/>
          <circle class="stage-dot-ring taken-ring" cx="8" cy="32" r="7" fill="#22C3E6"/>
          <circle class="stage-dot taken-core" cx="8" cy="32" r="4.4" fill="#ffffff" stroke="#22C3E6" stroke-width="2.2"/>
          <circle class="stage-dot-ring started-ring" cx="380" cy="32" r="7.5" fill="#5B8DEF"/>
          <circle class="stage-dot started-core" cx="380" cy="32" r="4.4" fill="#ffffff" stroke="#5B8DEF" stroke-width="2.2"/>
          <circle class="us-spark-halo" cx="752" cy="32" r="8.5" fill="#24C1EE"/>
          <circle class="us-spark-dot" cx="752" cy="32" r="5.1" fill="#ffffff" stroke="#24C1EE" stroke-width="2.5"/>
        </svg>
      </div>`;
}
 
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */

/* ── NEEDS INFORMATION — collapses to a positive status card when clear ── */
/* n333: on Ultrasound's page */

/* ── AVERAGE WAIT — live average across the current queue ── */
/* ── AVG WAIT — pravix_avg_wait_card.html, wired to the live queue ───────────
   The card's markup, styling and its two animations are that file's code. Every
   figure here comes from usQueue() — the same list that draws the queue rows —
   so the two can never disagree. The prototype's LIVE badge is deliberately not
   carried over; Currently Scanning owns that indicator.                      */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* the prototype's soft number swap, taking the already-formatted string this app
   uses (fmtWait reads "1h 5m" past the hour) instead of a raw minute count */
function updateAvgWait(valueEl,text){
  if(!valueEl || valueEl.textContent===text) return;
  valueEl.classList.add('is-updating');
  setTimeout(function(){
    valueEl.textContent=text;
    requestAnimationFrame(function(){ valueEl.classList.remove('is-updating'); });
  },140);
}
/* n333: on Ultrasound's page */

/* ── INTERNAL MEDICINE team ── */
/* Internal Medicine roster, built on the Directory's employee card: ringed
   avatar with a presence dot, name / title / department badge, a contact row and
   an actions row. Copy, Fav, Email and Call are dropped — the numbers stay
   readable in the contact row, and the only action this card owns is
   availability, so Set Unavailable is what sits in that slot. */
const UMT_IC_PHONE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 3.8h3l1.5 3.7-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 3.7 1.5v3a1.7 1.7 0 0 1-1.9 1.7A15.7 15.7 0 0 1 4.5 5.7 1.7 1.7 0 0 1 6.2 3.8Z"/></svg>';
/* n333: on Ultrasound's page */

/* ── QUEUE CONTROL utility ── */
/* n333: on Ultrasound's page */

/* ── QUEUE BOARD — the live Internal Medicine ultrasound command board.
   Structurally inspired by Flow's Client Display card system (scannable
   patient cards + a clear stage rail), but staff-facing: full clinical
   detail and IM controls. Reads the same shared ultrasound request data
   as every other Pravix surface — no separate objects per page. ── */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

/* Ultrasound workflow timeline: Requested → Accepted → Started → Completed.
   Horizontal, per pravix_ultrasound_queue_hybrid.html. The state reading is
   unchanged — every node still comes from the request's own timestamps and
   usEff(), so nothing about the workflow moves; only the presentation does. */
/* n333: on Ultrasound's page */

/* One board card. kind: 'wait' | 'scan' | 'info' */
/* n333: on Ultrasound's page */

/* Wire click-to-open + state actions on a rendered zone */
/* n333: on Ultrasound's page */

/* Grid-aware drop target: nearest card centre, before/after by pointer x */
/* n333: on Ultrasound's page */

/* n333: on Ultrasound's page */

/* ── IM presence — inferred Scanning + manual Available/Unavailable ── */
/* n333: on Ultrasound's page */

/* ── completed — compact rows with a Flags column ── */
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* openUsxCase · its layers, innermost first: 1 #30 before   (PVX-N387; kept true by flow_t387) */
function openUsxCase(pid){ return pvxRun('openUsxCase',openUsxCase$base,this,arguments); }
function openUsxCase$base(pid){
const p=PATIENTS.find(x=>x.id===pid); if(!p||!p.ultrasound) return;
try{ window.__pvxUsFrom=document.activeElement; window.__pvxUsPid=pid; }catch(e){}
(function(){ var d=document.getElementById('usxDrawer')||usxEnsureDrawer(); if(d&&!d.__pvxObs){ d.__pvxObs=new MutationObserver(function(){ if(!d.classList.contains('open')&&window.__pvxUsPid){ var id=window.__pvxUsPid; window.__pvxUsPid=null; setTimeout(function(){ pvxUsRefocus(id,'case'); },80); setTimeout(function(){ pvxUsRefocus(id,'case'); },450); } }); d.__pvxObs.observe(d,{attributes:true,attributeFilter:['class']}); } })();   /* PVX-N145 UR-05: however the workspace closes (Escape, scrim, ✕) */
_usxCase=pid; _usxForceComplete=null;
usxEnsureDrawer();
fillUsxCase();
document.getElementById('usxScrim').classList.add('open');
document.getElementById('usxDrawer').classList.add('open');
}
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
try{(function usxWireShell(){
const nf=document.getElementById('navFlow'), nu=document.getElementById('navUltrasound');
if(nf) nf.addEventListener('click',e=>{ e.preventDefault(); switchApp('flow'); });
/* n333: Ultrasound is its own page; its item is a plain link */
const nrNav=document.getElementById('navRounds');
/* n305: Rounds is its own page; its tab is a plain link */
const sw=document.getElementById('switcherUs');
if(sw) sw.addEventListener('click',e=>{ const b=e.target.closest('.seg'); if(b) switchUsView(b.dataset.usview); });
const el=document.getElementById('usxRole');
if(el) el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
usRole=b.dataset.role;
el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
renderUltrasound();
if(_usxCase) fillUsxCase();
}));
})();
}catch(__e){console.warn("[n333]",__e&&__e.message)}

 
const COMPLETION = {
Discharged: {tlLabel:'Patient discharged', title:'Patient discharged', icon:'discharge', color:'var(--s-admitted)', stampKey:'dischargedAt'},
Admitted:   {tlLabel:'Patient admitted',   title:'Patient admitted',   icon:'check',     color:'var(--s-admitted)', stampKey:'admittedAt'},
Euthanized: {tlLabel:'Patient euthanized',  title:'Patient euthanized',  icon:'info',      color:'#8A82A8',           stampKey:'euthanizedAt'}
};
/* completePatient · its layers, innermost first: 1 #23 after · 2 n252-net wrap · 3 n350 wrap   (PVX-N387; kept true by flow_t387) */
function completePatient(p,finalStatus){ return pvxRun('completePatient',completePatient$base,this,arguments); }
function completePatient$base(p, finalStatus){
const old=p.status, oldRoom=p.room;
const cfg=COMPLETION[finalStatus]||COMPLETION.Discharged;
const stamp=new Date();
p.status=finalStatus;
p.completed=true; p.active=false;
p.completedAt=stamp;
p[cfg.stampKey]=stamp;
p.totalMin=Math.round((stamp - p.arrival)/60000);
p.totalTimeInHospital=p.totalMin;
p.timeline.push({label: cfg.tlLabel, at:stamp, meta:`From ${old}`});
try{ rdOnFlowComplete(p, finalStatus); }catch(e){ console.warn('[rounds] couldn’t update Rounds for',p&&p.name,e); }   /* n252: was silent */

notify(cfg.title,`${bcEsc(p.name)} · ${bcEsc(p.hid)}`, {icon: cfg.icon, color: cfg.color});
if(oldRoom && oldRoom!=='Lobby') notify(`${bcEsc(oldRoom)} available`,'Ready for next patient', {icon:'room', color:'var(--s-admitted)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
 



function archiveList(){ return PATIENTS.filter(p=>isCompleted(p) && p.completedAt && isTodayHosp(p.completedAt)).sort((a,b)=>(b.completedAt||0)-(a.completedAt||0)); }
/* renderComplete · its layers, innermost first: 1 #17 after   (PVX-N387; kept true by flow_t387) */
function renderComplete(){ return pvxRun('renderComplete',renderComplete$base,this,arguments); }
function renderComplete$base(){
const dEl=document.getElementById('dischCount'), aEl=document.getElementById('admitCount'), eEl=document.getElementById('euthCount'), tEl=document.getElementById('czTotal');
const _dT=completedTodayCount('Discharged'), _aT=completedTodayCount('Admitted'), _eT=completedTodayCount('Euthanized');
if(dEl) dEl.textContent=_dT;
if(aEl) aEl.textContent=_aT;
if(eEl) eEl.textContent=_eT;
if(tEl) tEl.textContent=_dT+_aT+_eT;
const list=document.getElementById('czList'); if(!list) return;
const arch=archiveList();
list.innerHTML = arch.length ? arch.map(p=>`
    <div class="cz-item" data-pid="${p.id}">${mono(p,'patient-medallion patient-medallion--compact')}
      <div class="cz-main"><div class="cz-name">${bcEsc(p.name)} ${bcEsc(p.last)}</div>
        <div class="cz-sub">${p.doctor==='unassigned'?'No doctor':docShort(p.doctor)} · ${fmtWait(p.totalMin||0)} total</div></div>
      <div class="cz-rt"><span class="pill st-${p.status.toLowerCase()}"><span class="d"></span>${p.status}</span>
        <span class="cz-time">${p.completedAt?fmtTime(p.completedAt):''}</span></div>
    </div>`).join('') :`<div class="empty-mini empty-mini--stage"><div class="ico">${EMPTY_ICON}</div><b>No completions yet today</b></div>`;
list.querySelectorAll('.cz-item').forEach(n=>n.onclick=()=>openDrawer(n.dataset.pid));
}
function wireCompleteZones(){
document.querySelectorAll('.cz-target').forEach(z=>{
z.addEventListener('dragover',e=>{ if(!dragId) return; e.preventDefault(); z.classList.add('cz-over');
const bd=document.getElementById('board'); if(bd) bd.classList.add('board-dim'); });
z.addEventListener('dragenter',()=>{ if(dragId) z._pvxN=(z._pvxN||0)+1; });
z.addEventListener('dragleave',()=>{ if(z._pvxN>1){ z._pvxN--; return; } z._pvxN=0; z.classList.remove('cz-over');
const bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim'); });
z.addEventListener('drop',e=>{ e.preventDefault(); z.classList.remove('cz-over'); z._pvxN=0;
const bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim');
const p=PATIENTS.find(x=>x.id===dragId); if(!p) return;
const final=z.dataset.final;
const verb={Discharged:'discharged',Admitted:'admitted',Euthanized:'euthanized'}[final]||'discharged';
const okLabel={Discharged:'Discharge patient',Admitted:'Admit patient',Euthanized:'Mark euthanized'}[final]||'Discharge patient';
if(final==='Admitted'&&window.pvxCanAdmit&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }   /* n253 */
showConfirm(`Mark ${p.name} ${p.last} as ${verb}?`, okLabel,
()=>completePatient(p, final),
{sub:'This will remove the patient from active views and move them to Completed Today.'});
});
});
}

 
/* moveRoom · its layers, innermost first: 1 #8 wrap · 2 #23 wrap · 3 n192 wrap · 4 n350 wrap   (PVX-N387; kept true by flow_t387) */
function moveRoom(p,newRoom){ return pvxRun('moveRoom',moveRoom$base,this,arguments); }
function moveRoom$base(p,newRoom){
const old=p.room;
if(old===newRoom) return;
const stamp=new Date();
p.room=newRoom;
p.roomSince=stamp;
p.timeline.push({label:`Moved from ${old} to ${newRoom}`, at:stamp, meta:''});
notify('Patient moved',`${bcEsc(p.name)} · ${bcEsc(old)} → ${bcEsc(newRoom)}`, {icon:'move', color:STATUSES[p.status].color});
if(old!=='Lobby'&& !PATIENTS.some(x=>x.id!==p.id && isActive(x) && x.room===old))
notify(`${bcEsc(old)} available`,'Ready for next patient', {icon:'room', color:'var(--s-admitted)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}

function canDropRoom(p,target){
if(!p || !target || p.room===target) return false;
if(target==='Lobby'|| target==='Treatment') return true;
if(!ROOMS.includes(target)) return false;
return !PATIENTS.some(x=>x.id!==p.id && isActive(x) && x.room===target);
}

/* showConfirm · its layers, innermost first: 1 n193 before · 2 #47 wrap · 3 #52 wrap   (PVX-N387; kept true by flow_t387) */
function showConfirm(title,okLabel,onOk,opts){ return pvxRun('showConfirm',showConfirm$base,this,arguments); }
function showConfirm$base(title, okLabel, onOk, opts){
opts=opts||{};
document.getElementById('confirmTitle').textContent=title;
document.getElementById('confirmOk').textContent=okLabel;
const sub=document.getElementById('confirmSub');
sub.textContent=opts.sub||''; sub.style.display=opts.sub?'':'none';
const ok=document.getElementById('confirmOk');
ok.classList.toggle('danger', !!opts.danger);
ok.classList.remove('is-confirming','is-success');
const scrim=document.getElementById('confirmScrim'), box=document.getElementById('confirmBox');
const close=()=>{scrim.classList.remove('open');box.classList.remove('open');};
scrim.classList.add('open');box.classList.add('open');
{ const cb=document.getElementById('confirmCancel'); cb.textContent=opts.cancelLabel||'Cancel'; cb.onclick=()=>{ close(); if(opts.onCancel) opts.onCancel(); }; }
document.getElementById('confirmScrim').onclick=close;
{
box.classList.remove('confirm-fancy');
ok.textContent=okLabel;
ok.onclick=()=>{close();onOk();};
}
}
 




function renderRooms(){
const occ=PATIENTS.filter(p=>isActive(p)).length;
document.getElementById('roomLive').textContent=`${PATIENTS.filter(p=>isActive(p)&&p.room!=='Lobby').length} rooms in use`;
const grid=document.getElementById('roomGrid');
const cards=ROOMS.map(rm=>{
const occupants=PATIENTS.filter(p=>isActive(p)&&p.room===rm).sort(pvxByUrgency);
const spec=ROOM_SPEC[rm];
if(rm==='Lobby'){
const waiting=occupants.length;
return`<div class="room ${waiting?'occupied':''}" data-room="${rm}" data-room-name="${rm}">
        ${waiting?`<div class="room-accent" style="background:var(--s-waiting)"></div>`:''}
        <div class="r-top"><div><div class="r-name"><button type="button" class="pvx-open" data-loc="Lobby" aria-label="Open Lobby">Lobby</button></div><div class="r-spec">Waiting area</div></div>
          <span class="r-state ${waiting?'clean':'avail'}">${waiting?waiting+' Waiting':'Empty'}</span></div>
        ${waiting?occupants.slice(0,3).map(p=>`<div class="r-pt r-drag" draggable="true" data-pid="${p.id}" style="margin-bottom:8px">${mono(p,'patient-medallion patient-medallion--compact','width:30px;height:30px;font-size:0.6875rem')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${bcEsc(p.name)}">${bcEsc(p.name)}</button><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="room" aria-label="Move ${bcEsc(p.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></b><span>${fmtWait(waitMinutes(p))} · ${PRIO[p.prio].l}</span></div></div>`).join('')+(waiting>3?`<div class="muted" style="font-size:0.75rem;margin-top:4px">+${waiting-3} more</div>`:''):`<div class="r-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>No patients waiting</div>`}
      </div>`;
}
const p=occupants[0];
if(!p){
return`<div class="room" data-room="${rm}" data-room-name="${rm}">
        <div class="r-top"><div><div class="r-name">${rm}</div>${spec?`<div class="r-spec">${spec}</div>`:'<div class="r-spec">&nbsp;</div>'}</div>
          <span class="r-state avail">Available</span></div>
        <div class="r-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/></svg>Ready for next patient</div>
      </div>`;
}
const rmin=roomMinutes(p); const rcls=rmin>120?'crit':rmin>60?'warn':'';
return`<div class="room occupied r-drag" draggable="true" data-pid="${p.id}" data-room-name="${rm}"> <div class="room-accent" style="background:${STATUSES[p.status].color}"></div> <div class="r-top"><div><div class="r-name">${rm}</div>${spec?`<div class="r-spec">${spec}</div>`:'<div class="r-spec">&nbsp;</div>'}</div> <span class="r-state busy">In use</span><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="room" aria-label="Move ${bcEsc(p.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></div>
      <div class="r-pt">${mono(p,'patient-medallion patient-medallion--compact')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${bcEsc(p.name)} ${bcEsc(p.last)} · ${rm}">${bcEsc(p.name)} ${bcEsc(p.last)}</button></b><span>${pvxDot(bcEsc(p.species),bcEsc(compactProblems(p).slice(0,26))+(compactProblems(p).length>26?'…':''))}</span></div></div>
      ${typeof fgRoom==='function'?fgRoom(p):''}
      <div class="r-foot"><div class="dctr">${p.doctor==='unassigned'?'<span class="muted">No doctor</span>':docAv(p.doctor)+doc(p.doctor).name}</div>
        <div class="r-right"><span class="r-timer ${rcls}" title="Time in ${rm}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${fmtWait(rmin)}</span>${statusPill(p.status)}</div></div>
    </div>`;
});

const ti = ROOMS.indexOf('Room 7');
cards.splice(ti+1, 0, treatmentCard());
grid.innerHTML = cards.join('');
grid.querySelectorAll('.room.occupied[data-pid]').forEach(n=>n.onclick=()=>openDrawer(n.dataset.pid));

grid.querySelectorAll('.room[data-room-name="Lobby"], .room[data-room-name="Treatment"]').forEach(card=>{
card.style.cursor='pointer';
card.onclick=()=>openLocDrawer(card.dataset.roomName);
});
wireRoomDnD();
}


function treatmentCard(){
const occ = PATIENTS.filter(p=>isActive(p) && p.room==='Treatment');
if(!occ.length){
return`<div class="room" data-room-name="Treatment">
        <div class="room-accent" style="background:#2FB6B9"></div>
        <div class="r-top"><div><div class="r-name">Treatment</div><div class="r-spec">ICU • Treatment • Wards</div></div>
          <span class="r-state avail">Available</span></div>
        <div class="r-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/></svg>No patients</div>
      </div>`;
}
const lead=occ[0], rmin=roomMinutes(lead);
const rows = occ.slice(1,4).map(p=>`
      <div class="r-pt r-drag" draggable="true" data-pid="${p.id}" style="margin-top:9px;padding-top:9px;border-top:1px solid var(--glass-hairline)"> ${mono(p,'patient-medallion patient-medallion--compact')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${bcEsc(p.name)} ${bcEsc(p.last)}">${bcEsc(p.name)} ${bcEsc(p.last)}</button><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${p.id}" data-kind="room" aria-label="Move ${bcEsc(p.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></b><span>${bcEsc(p.species)} · ${p.status}</span></div></div>`).join('');
const more = occ.length>4 ?`<div class="muted" style="font-size:0.75rem;margin-top:6px">+${occ.length-4} more in treatment</div>`:'';
return`<div class="room occupied" data-room-name="Treatment"> <div class="room-accent" style="background:#2FB6B9"></div> <div class="r-top"><div><div class="r-name"><button type="button" class="pvx-open" data-loc="Treatment" aria-label="Open Treatment">Treatment</button></div><div class="r-spec">ICU • Treatment • Wards</div></div>
        <span class="r-state busy">In use</span></div>
      <div class="r-pt r-drag" draggable="true" data-pid="${lead.id}">${mono(lead,'patient-medallion patient-medallion--compact')}<div class="info"><b><button type="button" class="pvx-open" data-pid="${lead.id}" aria-label="Open patient: ${bcEsc(lead.name)} ${bcEsc(lead.last)}">${bcEsc(lead.name)} ${bcEsc(lead.last)}</button><button type="button" class="pvx-move" aria-haspopup="menu" aria-expanded="false" data-pid="${lead.id}" data-kind="room" aria-label="Move ${bcEsc(lead.name)} to another room" title="Move to another room">${PVX_MOVE_ICON}</button></b><span>${bcEsc(lead.species)} · ${bcEsc(compactProblems(lead).slice(0,26))}${compactProblems(lead).length>26?'…':''}</span></div></div>
      ${typeof fgRoom==='function'?fgRoom(lead):''}${rows}${more}
      <div class="r-foot"><div class="dctr">${lead.doctor==='unassigned'?'<span class="muted">No doctor</span>':docAv(lead.doctor)+doc(lead.doctor).name}</div>
        <div class="r-right"><span class="r-timer" title="Time in Treatment"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${fmtWait(rmin)}</span>${statusPill(lead.status)}</div></div>
    </div>`;
}
let roomDragId=null;
function wireRoomDnD(){
const grid=document.getElementById('roomGrid');
grid.querySelectorAll('.r-drag[draggable="true"]').forEach(el=>{
el.addEventListener('dragstart',e=>{
roomDragId=el.dataset.pid; el.classList.add('dragging');
e.dataTransfer.effectAllowed='move';
const p=PATIENTS.find(x=>x.id===roomDragId);
grid.querySelectorAll('.room').forEach(r=>{ if(canDropRoom(p,r.dataset.roomName)) r.classList.add('room-available'); });
});
el.addEventListener('dragend',()=>{
el.classList.remove('dragging'); roomDragId=null;
grid.querySelectorAll('.room').forEach(r=>{ r.classList.remove('room-available','room-drop','room-nodrop'); r._pvxN=0; });
});
});
grid.querySelectorAll('.room').forEach(room=>{
const target=room.dataset.roomName;
room.addEventListener('dragenter',()=>{ if(!roomDragId) return; room._pvxN=(room._pvxN||0)+1; if(room._pvxN!==1) return;   /* PVX-N192 */
const p=PATIENTS.find(x=>x.id===roomDragId); if(p&&p.room!==target&&!canDropRoom(p,target)&&window.pvxSay) pvxSay(target+' is occupied'); });
room.addEventListener('dragover',e=>{
if(!roomDragId) return;
const p=PATIENTS.find(x=>x.id===roomDragId);
if(p && p.room===target) return;
e.preventDefault();
const ok=canDropRoom(p,target);
e.dataTransfer.dropEffect=ok?'move':'none';   /* PVX-N192: refused before release - "not allowed", and the patient slides back */
room.classList.toggle('room-drop',ok);
room.classList.toggle('room-nodrop',!ok);
});
room.addEventListener('dragleave',()=>{ if(room._pvxN>1){ room._pvxN--; return; } room._pvxN=0; room.classList.remove('room-drop','room-nodrop'); });
room.addEventListener('drop',e=>{
e.preventDefault();
room.classList.remove('room-drop','room-nodrop'); room._pvxN=0;
const p=PATIENTS.find(x=>x.id===roomDragId);
if(!p || p.room===target) return;
if(!canDropRoom(p,target)){ toast('That room is in use — choose another room'); return; }
if(target==='Comfort Room'){ showConfirm('Move patient to Comfort Room?','Move patient',()=>moveRoom(p,target)); }
else moveRoom(p,target);
});
});
}



/* openDrawer · its layers, innermost first: 1 #8 after · 2 #9 before · 3 #54 after · 4 n351 after · 5 n354 after   (PVX-N387; kept true by flow_t387) */
function openDrawer(pid){ return pvxRun('openDrawer',openDrawer$base,this,arguments); }
function openDrawer$base(pid){
const p=PATIENTS.find(x=>x.id===pid); if(!p) return;
activePatient=pid; triExpanded=false; recExpanded=false; _commOpen=false; _tlFreshOpen=true; fillDrawer(p);
document.getElementById('scrim').classList.add('open');
document.getElementById('drawer').classList.add('open');
}
/* closeDrawer · its layers, innermost first: 1 #8 after · 2 #17 before   (PVX-N387; kept true by flow_t387) */
function closeDrawer(){ return pvxRun('closeDrawer',closeDrawer$base,this,arguments); }
function closeDrawer$base(){
activePatient=null;
document.getElementById('scrim').classList.remove('open');
document.getElementById('drawer').classList.remove('open');
}
 
(function initResusBurst(){
var t=document.getElementById('dTimeline'); if(!t) return;
t.addEventListener('click', function(e){
var tg=e.target.closest && e.target.closest('.resus-burst-toggle'); if(!tg) return;
var b=tg.closest('.resus-burst'); if(!b) return;
var open=b.classList.toggle('open'); tg.setAttribute('aria-expanded', open?'true':'false');
});
})();
 
(function initTimelineToggle(){
var head=document.getElementById('dTimelineHead'), tl=document.getElementById('dTimeline'); if(!head||!tl) return;
function toggle(){ var willOpen=tl.classList.contains('collapsed'); tl.classList.toggle('collapsed'); head.setAttribute('aria-expanded', willOpen?'true':'false');
if(willOpen){ tl.classList.remove('tl-animate'); void tl.offsetWidth; tl.classList.add('tl-animate'); } }
head.addEventListener('click', toggle);
head.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
})();

 
function locPatients(loc){ return PATIENTS.filter(p=>isActive(p) && p.room===loc); }
function openLocDrawer(loc){
activeLoc=loc;
document.getElementById('locDrawer').classList.add('open');
renderLocDrawer();
}
function closeLocDrawer(){
activeLoc=null;
document.getElementById('locDrawer').classList.remove('open');
}
function renderLocDrawer(){
if(!activeLoc) return;
const loc=activeLoc, list=locPatients(loc);
const word = loc==='Lobby'? (list.length===1?'patient waiting':'patients waiting')
: (list.length===1?'patient in treatment':'patients in treatment');
document.getElementById('locTitle').textContent=loc;
document.getElementById('locSub').textContent=`${list.length} ${word}`;
document.getElementById('locHint').style.display = list.length ?'':'none';
const body=document.getElementById('locBody');
if(!list.length){
const msg = loc==='Lobby'?'No patients waiting in Lobby':'No patients';
body.innerHTML =`<div class="empty" style="padding:56px 20px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><b>${msg}</b><span>Drag patients here from the Rooms grid</span></div>`;
return;
}
body.innerHTML = list.map(p=>{
const inLoc=roomMinutes(p), total=waitMinutes(p);
return`<div class="loc-pt r-drag" draggable="true" data-pid="${p.id}">
      ${mono(p,'patient-medallion patient-medallion--compact')}
      <div class="lp-main">
        <div class="lp-name">${bcEsc(p.name)} ${bcEsc(p.last)}</div>
        <div class="lp-reason">${pvxDot(bcEsc(p.species),bcEsc(p.reason))}</div>
        <div class="lp-tags"><span class="prio prio-${p.prio}" style="width:22px;height:22px;font-size:0.625rem">${PRIO[p.prio].l}</span>${statusPill(p.status)}
          ${p.doctor==='unassigned'?'<span class="muted" style="font-size:0.75rem">No doctor assigned</span>':`<span class="lp-doc">${docAv(p.doctor)}${doc(p.doctor).name}</span>`}</div>
        <div class="lp-meta"><span>${loc}: <b>${fmtWait(inLoc)}</b></span><span>Hospital: <b>${fmtWait(total)}</b></span></div>
      </div>
    </div>`;
}).join('');

body.querySelectorAll('.loc-pt').forEach(row=>{
row.addEventListener('dragstart',e=>{
roomDragId=row.dataset.pid; row.classList.add('dragging'); e.dataTransfer.effectAllowed='move';
const p=PATIENTS.find(x=>x.id===roomDragId);
document.querySelectorAll('#roomGrid .room').forEach(r=>{ if(canDropRoom(p,r.dataset.roomName)) r.classList.add('room-available'); });
});
row.addEventListener('dragend',()=>{
row.classList.remove('dragging'); roomDragId=null;
document.querySelectorAll('#roomGrid .room').forEach(r=>{ r.classList.remove('room-available','room-drop','room-nodrop'); r._pvxN=0; });
});
row.addEventListener('click',()=>{ if(!row.classList.contains('dragging')){ const pid=row.dataset.pid; closeLocDrawer(); openDrawer(pid); } });
});
}


let CURRENT_USER='Daniel Giordano';
function userDisplayName(u){ if(!u) return CURRENT_USER; if(u.displayName && u.displayName.trim()) return u.displayName.trim(); var lp=((u.email||'').split('@')[0]||''); if(lp.indexOf('.')>-1||lp.indexOf('_')>-1){ return lp.split(/[._]+/).filter(Boolean).map(function(w){return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();}).join(' '); } return'Front Desk'; }
const RECORDS_STATUS={
not_requested:{label:'Not requested', color:'#86868b'},
requested:{label:'Requested', color:'#3B82C4'},
partial:{label:'Partial', color:'#C98A1A'},
received:{label:'Received', color:'#3B9E74'},
unable:{label:'Unable to obtain', color:'var(--priority-p1)'}
};
const RECORD_METHODS=['Phone','Email'];
const REC_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
function defaultRecords(){ return {status:'not_requested', pdvm:'', method:'', note:'', requestedBy:'', requestedAt:null, history:[]}; }
function getRecords(p){ if(!p.records) p.records=defaultRecords(); return p.records; }
function requestRecords(p){
const r=getRecords(p); if(r.status!=='not_requested') return;
const at=new Date();
r.status='requested'; r.requestedBy=CURRENT_USER; r.requestedAt=at;
r.history.push({status:'requested', by:CURRENT_USER, at});
p.timeline.push({label:'pDVM records requested', at, meta:CURRENT_USER});
recExpanded=true;
notify('Records requested',`${bcEsc(p.name)} · pDVM records`, {icon:'info', color:'#3B82C4'});
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
function setRecordStatus(p, status){
const r=getRecords(p); if(r.status===status) return;
r.status=status; r.history.push({status, by:CURRENT_USER, at:new Date()});
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
function cprPill(p){
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const when = p.resusRecordedAt?fmtTime(p.resusRecordedAt):'';
const title=('Resuscitation: CPR · '+conf+(when?' · '+when:'')).replace(/"/g,'&quot;');

var d='M1 13 C4 13,5 13,7 13 C8 13,9 11.8,10.2 11.3 C11.4 10.8,12.2 12.1,13.4 13 L16 13 L17.2 14.3 L18.5 10.5 L20.1 2.7 L21.6 21.4 L23.2 12.2 L26 13 C28 13,29 12.8,30 12.5 C32 11.2,33.4 9.8,35 10.2 C37 10.7,38 12.5,40 13 L42 13 C45 13,46 13,48 13 C49 13,50 11.8,51.2 11.3 C52.4 10.8,53.2 12.1,54.4 13 L57 13 L58.2 14.3 L59.5 10.5 L61.1 2.7 L62.6 21.4 L64.2 12.2 L67 13 C69 13,70 12.8,71 12.5 C72.5 11.4,73.5 10.4,75 10.8';
return'<span class="cpr-pill" role="button" tabindex="0" aria-label="Resuscitation: CPR — tap to change" title="'+title+'"><span class="ecg" aria-hidden="true"><svg class="ecg-svg" viewBox="0 0 76 26" preserveAspectRatio="xMidYMid meet"><path class="ecg-base" d="'+d+'"/><path class="ecg-live" d="'+d+'"/><circle class="ecg-dot" cx="1" cy="13" r="1.7"/></svg></span><span class="label">CPR</span></span>';
}


var CprEcg=(function(){
var raf=null, t0=null, live=null, dot=null, len=0; var DUR=2750;
function stop(){ if(raf){ cancelAnimationFrame(raf); raf=null; } t0=null; }
function frame(ts){
if(!live || !document.body.contains(live)){ stop(); return; }
if(t0===null) t0=ts;
var prog=((ts-t0)%DUR)/DUR;
var pt=live.getPointAtLength(prog*len);
dot.setAttribute('cx', pt.x.toFixed(2)); dot.setAttribute('cy', pt.y.toFixed(2));
live.style.strokeDashoffset=(len*(1-prog)).toFixed(2);
raf=requestAnimationFrame(frame);
}
function mount(){
stop();
var root=document.getElementById('dResus');

live = root ? root.querySelector('.cpr-pill .ecg-live, .dnr-pill .flatline-live') : null;
dot  = root ? root.querySelector('.cpr-pill .ecg-dot, .dnr-pill .flatline-dot')  : null;
if(!live || !dot){ live=null; return; }
try{ len=live.getTotalLength(); }catch(e){ len=0; }
if(!len){ live=null; return; }
live.style.strokeDasharray=len;
live.style.strokeDashoffset=len;
raf=requestAnimationFrame(frame);
}
return { mount:mount, stop:stop };
})();


/* setResusPref · its layers, innermost first: 1 #23 after   (PVX-N387; kept true by flow_t387) */
function setResusPref(p,pref){ return pvxRun('setResusPref',setResusPref$base,this,arguments); }
function setResusPref$base(p, pref){
if(!p || (pref!=='CPR'&& pref!=='DNR') || p.resusPref===pref) return;
const at=new Date();
try{ if(p.publicToken&&p.resusPref) (_fxStaffResus[p.publicToken]=_fxStaffResus[p.publicToken]||{})[fxResusKey(p.resusPref,p.resusRecordedAt)]=1; }catch(e){}   /* the state being replaced */
p.resusPref=pref;
p.resusStatus='confirmed';
p.resusSource='staff_flow';
p.resusRecordedAt=at;
p.resusRequest=null;   /* staff decided */
if(!Array.isArray(p.resusHistory)) p.resusHistory=[];
p.resusHistory.push({ pref:pref, source:'staff_flow', at:at.toISOString(), by:CURRENT_USER });
if(Array.isArray(p.timeline)) p.timeline.push({ label:'Resuscitation preference: '+pref, at:at, meta:'Updated · '+CURRENT_USER });


try{ if(typeof Backend!=='undefined'&& Backend && Backend._pubResus && p.publicToken){ Backend._pubResus[p.publicToken]={ pref:pref, status:'confirmed', at:at.toISOString() }; } }catch(e){}
notify('Resuscitation updated', bcEsc(p.name||'Patient')+' · '+bcEsc(pref), {icon:'info', color: pref==='CPR'?'var(--s-admitted)':'#8B4DB5'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
function closeResusChooser(){ var pop=document.getElementById('resusPop'); if(pop) pop.remove();
document.removeEventListener('mousedown', _resusOutside, true); document.removeEventListener('keydown', _resusKey, true); }
function _resusOutside(e){ var pop=document.getElementById('resusPop');
if(pop && !pop.contains(e.target) && !(e.target.closest && e.target.closest('.cpr-pill,.dnr-pill,.resus-set'))) closeResusChooser(); }
function _resusKey(e){ if(e.key==='Escape'){ e.stopPropagation(); closeResusChooser(); } }
function openResusChooser(pillEl){
const p=PATIENTS.find(x=>x.id===activePatient); if(!p || isCompleted(p)){ return; }
closeResusChooser();
var cur=p.resusPref;
var check='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
var pop=document.createElement('div'); pop.className='resus-pop'; pop.id='resusPop'; pop.setAttribute('role','menu');
['CPR','DNR'].forEach(function(v){
var b=document.createElement('button'); b.type='button';
b.className='rp-opt '+(v==='CPR'?'cpr':'dnr')+(cur===v?' active':'');
b.setAttribute('role','menuitemradio'); b.setAttribute('aria-checked', cur===v?'true':'false');
b.innerHTML='<span class="rp-dot" aria-hidden="true"></span><span>'+v+'</span><span class="rp-check" aria-hidden="true">'+check+'</span>';
b.onclick=function(){ setResusPref(p, v); closeResusChooser(); };
pop.appendChild(b);
});
document.body.appendChild(pop);
var r=pillEl.getBoundingClientRect(), pw=pop.offsetWidth, ph=pop.offsetHeight, vw=window.innerWidth, vh=window.innerHeight;
var left=r.left; if(left+pw>vw-8) left=vw-8-pw; if(left<8) left=8;
var top=r.bottom+6; if(top+ph>vh-8) top=r.top-6-ph;
pop.style.left=left+'px'; pop.style.top=top+'px';
var first=pop.querySelector('.rp-opt.active')||pop.querySelector('.rp-opt'); if(first) first.focus();
setTimeout(function(){ document.addEventListener('mousedown', _resusOutside, true); document.addEventListener('keydown', _resusKey, true); },0);
}
(function initResusChooser(){
var dr=document.getElementById('dResus'); if(!dr) return;
dr.addEventListener('click', function(e){ var pill=e.target.closest && e.target.closest('.cpr-pill,.dnr-pill,.resus-set'); if(pill) openResusChooser(pill); });
dr.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ var pill=e.target.closest && e.target.closest('.cpr-pill,.dnr-pill,.resus-set'); if(pill){ e.preventDefault(); openResusChooser(pill); } } });
})();
function dnrPill(p){
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const when = p.resusRecordedAt?fmtTime(p.resusRecordedAt):'';
const title=('Resuscitation: DNR · '+conf+(when?' · '+when:'')).replace(/"/g,'&quot;');
return'<span class="dnr-pill" role="button" tabindex="0" aria-label="Resuscitation: DNR — tap to change" title="'+title+'"><span class="flatline" aria-hidden="true"><svg class="flatline-svg" viewBox="0 0 76 26" preserveAspectRatio="xMidYMid meet"><path class="flatline-base" d="M1 13 H75"/><path class="flatline-live" d="M1 13 H75"/><circle class="flatline-dot" cx="1" cy="13" r="1.7"/></svg></span><span class="label">DNR</span></span>';
}
function resusBadge(p, big){ return _fxResusBadge(p,big)+fxResusReqChip(p); }
function _fxResusBadge(p, big){
if(!p.resusPref) return'';
const cls=p.resusPref==='CPR'?'cpr':'dnr';
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const when = p.resusRecordedAt?fmtTime(p.resusRecordedAt):'';
const title=`Resuscitation: ${p.resusPref} · ${conf}${when?' · '+when:''}`;
return`<span class="resus-badge ${cls}${big?' big':''}" title="${title.replace(/"/g,'&quot;')}">${p.resusPref}</span>`;
}
const RESUS_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 8-6-16-3 8H2"/></svg>';
 
function resusPill(p){ return _fxResusPill(p)+fxResusReqHTML(p); }
function _fxResusPill(p){
if(!p.resusPref) return'<span class="resus-set" role="button" tabindex="0" aria-label="Set resuscitation preference — CPR or DNR" title="Set resuscitation (CPR / DNR)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 3 10 2-7 1.5 2H21"/></svg><span>Resuscitation</span></span>';
if(p.resusPref==='CPR') return cprPill(p);
if(p.resusPref==='DNR') return dnrPill(p);
const cls=p.resusPref==='CPR'?'cpr':'dnr';
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const title=`Resuscitation: ${p.resusPref} · ${conf}`;
return`<span class="resus-cap ${cls}" title="${title.replace(/"/g,'&quot;')}">${RESUS_ICON}${p.resusPref}</span>`;
}
function recBadge(p){
const r=p.records; if(!r || r.status==='not_requested') return'';
const s=RECORDS_STATUS[r.status];
const last=r.history.length?r.history[r.history.length-1].at:r.requestedAt;
const title=`Records: ${s.label} · ${r.pdvm||'pDVM'} · updated ${last?fmtTime(last):'—'}`;
return`<span class="rec-badge rec-${r.status}" title="${title.replace(/"/g,'&quot;')}">${REC_ICON}</span>`;
}
function renderRecordsCard(p){
const mount=document.getElementById('recordsMount'); if(!mount) return;
const r=getRecords(p), st=r.status;
const chip=`<span class="rec-chip rec-${st}">${RECORDS_STATUS[st].label}</span>`;
const head=`<div class="rec-ic">${REC_ICON}</div><div class="rec-title">pDVM records</div>${chip}`;
if(st==='not_requested'){
mount.innerHTML=`<div class="rec-card"><div class="rec-head">${head}<button class="rec-req" id="recRequest" type="button">Request records</button></div></div>`;
document.getElementById('recRequest').onclick=()=>requestRecords(p);
return;
}
if(!recExpanded){
const ts=r.requestedAt?fmtTime(r.requestedAt):'—';
mount.innerHTML=`<div class="rec-card"><div class="rec-head">${head}<button class="rec-link" id="recEdit" type="button">Edit</button></div>
      <div class="rec-summary">${r.pdvm?bcEsc(r.pdvm):'pDVM not named'} · requested ${ts}</div></div>`;
document.getElementById('recEdit').onclick=()=>{ recExpanded=true; renderRecordsCard(p); };
return;
}
const hist=r.history.slice().reverse().map(h=>`<div class="rh-row"><span><b>${RECORDS_STATUS[h.status].label}</b></span><span>${bcEsc(h.by)} · ${fmtTime(h.at)}</span></div>`).join('');
mount.innerHTML=`<div class="rec-card"><div class="rec-head">${head}<button class="rec-link" id="recDone" type="button">Done</button></div>
    <div class="rec-body">
      <div class="rec-field"><label>pDVM / Hospital name</label>
        ${ r.pdvmInfo
          ? `<div class="hv-selected"><div class="hv-sel-main"><div class="hv-sel-name">${bcEsc(r.pdvmInfo.name)}</div><div class="hv-sel-sub">${bcEsc(r.pdvmInfo.town)}, CT</div></div><button class="hv-sel-change" id="recPdvmChange" type="button">Change</button></div>`
          : `<div class="bc-wrap"><input class="rec-input" id="recPdvm" placeholder="Search Connecticut hospitals…" autocomplete="off" value="${(r.pdvm||'').replace(/"/g,'&quot;')}"><div class="bc-panel hv-panel" id="recPdvmPanel"></div></div>` }
      </div>
      <div class="rec-grid2">
        <div class="rec-field"><label>Request method</label><div id="recMethodMount"></div></div>
        <div class="rec-field"><label>Status</label><div id="recStatusMount"></div></div>
      </div>
      <div class="rec-field"><label>Note <span style="color:var(--ink-400);font-weight:500">· optional</span></label><input class="rec-input" id="recNote" placeholder="Optional note" value="${(r.note||'').replace(/"/g,'&quot;')}"></div>
      <div class="rec-hist"><div class="rh-title">Activity</div>${hist||'<div class="rh-row"><span>No activity yet</span></div>'}</div>
    </div></div>`;
document.getElementById('recDone').onclick=()=>{ recExpanded=false; renderRecordsCard(p); };
if(r.pdvmInfo){
const chg=document.getElementById('recPdvmChange');
if(chg) chg.onclick=function(){ r.pdvm=''; r.pdvmInfo=null; renderRecordsCard(p);
const inp=document.getElementById('recPdvm'); if(inp) try{ inp.focus(); }catch(e){} };
} else {
const inp=document.getElementById('recPdvm');
if(inp) HospitalAutocomplete.attach(inp, document.getElementById('recPdvmPanel'), {
onSelect:function(h){ r.pdvm=h.name; r.pdvmInfo=h; renderRecordsCard(p); persist(); },
onInput:function(v){ r.pdvm=v; r.pdvmInfo=null; }
});
}
document.getElementById('recNote').oninput=e=>{ r.note=e.target.value; };
document.getElementById('recMethodMount').appendChild(createDropdown({
items: RECORD_METHODS.map(m=>({id:m,name:m,initials:'',color:'#7A98B8'})),
selectedId: r.method||null, placeholder:'Select method', searchPlaceholder:'Method…',
onSelect:id=>{ r.method=id; } }));
document.getElementById('recStatusMount').appendChild(createDropdown({
items: ['requested','received','partial','unable'].map(s=>({id:s,name:RECORDS_STATUS[s].label,initials:'',color:RECORDS_STATUS[s].color})),
selectedId: r.status, placeholder:'Status', searchPlaceholder:'Status…',
onSelect:id=>setRecordStatus(p,id) }));
}

 
function clinBar(p){
const t=getTriage(p), v=t.vitals||{};
const vv=(key)=>{ const val=v[key]; return (val!=null&&val!=='')?val:null; };
const temp=vv('temp'), hr=vv('hr'), weight=vv('weight');
const parts=[];
parts.push(`<span class="cb-stat"><b>${bcEsc(p.room)}</b><i>Location</i></span>`);
parts.push(`<span class="cb-stat cb-status"><b><span class="cb-statusdot" aria-hidden="true" style="color:${(STATUSES[p.status]||{}).color||'var(--ink-400)'}"></span>${bcEsc((STATUSES[p.status]||{}).label||p.status||'—')}</b><i>Status</i></span>`);   /* PVX-N144 FLOW-07 */
parts.push(`<span class="cb-pill"><span class="cb-statuscol"><span class="prio prio-${p.prio}" style="width:24px;height:24px;font-size:0.6875rem">${PRIO[p.prio].l}</span><i>Priority</i></span></span>`);
parts.push(`<span class="cb-stat"><b>${fmtWait(waitMinutes(p))}</b><i>In hospital</i></span>`);
const _u=(x,u)=>/^\s*\d+(\.\d+)?\s*$/.test(String(x))?String(x).trim()+(u==='°F'?' °F':' '+u):String(x);   /* PVX-N144 FLOW-07: units */
if(temp)   parts.push(`<span class="cb-stat"><b>${bcEsc(_u(temp,'°F'))}</b><i>Temp</i></span>`);
if(hr)     parts.push(`<span class="cb-stat"><b>${bcEsc(_u(hr,'bpm'))}</b><i>Heart rate</i></span>`);
if(weight) parts.push(`<span class="cb-stat"><b>${bcEsc(_u(weight,'kg'))}</b><i>Weight</i></span>`);
return parts.join('');
}
 
const TRI_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 7 9.5 17 5 12.5"/></svg>';
const TRI_CLIP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6"/><path d="M9 15h4"/></svg>';
function triageCardHtml(p){
const t=getTriage(p), st=t.status||'not_started', v=t.vitals||{}, a=t.assess||{};
const vv=(key)=>{ const val=v[key]; return (val!=null&&val!=='')?bcEsc(val):'—'; };   /* PVX-N377 */
const stateLabel = st==='complete'?PVX_GI.check+' Complete':(st==='in_progress'?'In Progress':'Not started');
const quick = ['weight','temp','hr'].map(k=>{ const c=TRIAGE_VITALS.find(x=>x.key===k);
return`<div class="tq"><span class="tq-v">${vv(k)}</span><span class="tq-l">${c.label}</span></div>`; }).join('');
const vitalsGrid = TRIAGE_VITALS.map(c=>`<div class="tv"><span class="tv-l">${c.label}</span><span class="tv-v">${vv(c.key)}</span></div>`).join('');
const assessRows = TRIAGE_ASSESS.map(c=>`<div class="tr-row"><span class="tr-l">${c.label}</span><span class="tr-v">${(a[c.key]!=null&&a[c.key]!=='')?bcEsc(a[c.key]):'—'}</span></div>`).join('');
const chief = (t.chief&&t.chief.length) ? t.chief.map(c=>`<span class="tri-chip">${bcEsc(c)}</span>`).join('') :'<span class="tri-muted">—</span>';
const byLine = st==='complete'?`Completed · ${bcEsc(t.by||'—')} • ${bcEsc(t.at||'')}`: (st==='in_progress'?'In progress':'Awaiting triage');
return`<div class="tri-card tri-${st}${triExpanded?' open':''}" id="triCard">
    <div class="tri-head" id="triHead">
      <div class="tri-badge">${st==='complete'?TRI_CHECK:TRI_CLIP}</div>
      <div class="tri-hmain">
        <div class="tri-title">Triage <span class="tri-state">${stateLabel}</span></div>
        <div class="tri-quick">${quick}</div>
        <div class="tri-by">${byLine}</div>
      </div>
      <button class="tri-edit" id="triEdit" type="button">Edit</button>
      <div class="tri-chev"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div>
    </div>
    <div class="tri-detail">
      <div class="tri-sect"><div class="tri-sh">Vitals</div><div class="tri-vgrid">${vitalsGrid}</div></div>
      <div class="tri-sect"><div class="tri-sh">Assessment</div>${assessRows}</div>
      <div class="tri-sect"><div class="tri-sh">Chief Complaint</div><div class="tri-chips">${chief}</div></div>
      <div class="tri-sect"><div class="tri-sh">History</div><div class="tri-text">${t.history?bcEsc(t.history):'—'}</div></div>
      <div class="tri-sect"><div class="tri-sh">Completed</div>
        <div class="tr-row"><span class="tr-l">Completed by</span><span class="tr-v">${bcEsc(t.by||'—')}</span></div>
        <div class="tr-row"><span class="tr-l">Completed at</span><span class="tr-v">${bcEsc(t.at||'—')}</span></div>
      </div>
      <button class="tri-collapse" id="triCollapse" type="button">Collapse <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg></button>
    </div>
  </div>`;
}
 
let triEditPatient=null;
/* openTriageEdit · its layers, innermost first: 1 #16 after · 2 n193 after · 3 n351 wrap   (PVX-N387; kept true by flow_t387) */
function openTriageEdit(p){ return pvxRun('openTriageEdit',openTriageEdit$base,this,arguments); }
function openTriageEdit$base(p){
triEditPatient=p;
const t=getTriage(p), v=t.vitals||{}, a=t.assess||{};
document.getElementById('triEditSub').textContent=`${p.name} ${p.last} · ${p.species} · ${p.hid}`;
const esc=s=>String(s==null?'':s).replace(/"/g,'&quot;');
const vitalFields=TRIAGE_VITALS.map(c=>`
    <div class="ap-field"><label>${c.label} <span class="te-unit">${c.unit.trim()}</span></label>
      <input class="ap-input" data-vk="${c.key}" value="${esc(v[c.key])}" placeholder="—"></div>`).join('');
const assessFields=TRIAGE_ASSESS.map(c=>{ const cur=a[c.key]==null?'':String(a[c.key]);
    if(c.opts){ const list=c.opts.slice(); if(cur&&list.indexOf(cur)<0) list.unshift(cur);   /* an older typed value stays selectable */
      return `
    <div class="ap-field"><label>${c.label}</label>
      <select class="ap-input ap-select" data-ak="${c.key}"><option value=""${cur?'':' selected'}>—</option>${list.map(o=>`<option value="${esc(o)}"${o===cur?' selected':''}>${esc(o)}</option>`).join('')}</select></div>`; }
    return `
    <div class="ap-field"><label>${c.label}</label>
      <input class="ap-input" data-ak="${c.key}" value="${esc(cur)}" placeholder="—"></div>`; }).join('');
document.getElementById('triEditBody').innerHTML=`
    <div class="ap-sect"><h4>Vitals</h4><div class="ap-grid c2">${vitalFields}</div></div>
    <div class="ap-sect"><h4>Assessment</h4><div class="ap-grid c2">${assessFields}</div></div>
    <div class="ap-sect"><h4>Chief complaint</h4>
      <div class="ap-field"><input class="ap-input" id="triEditChief" value="${esc((t.chief||[]).join(', '))}" placeholder="e.g. Vomiting, Lethargy"></div></div>
    <div class="ap-sect"><h4>History</h4>
      <div class="ap-field"><input class="ap-input" id="triEditHistory" value="${esc(t.history)}" placeholder="Owner history"></div></div>
    <div class="ap-sect"><h4>Completed by</h4>
      <div class="ap-field"><input class="ap-input" id="triEditBy" value="${esc(t.by||(typeof CURRENT_USER==='string'?CURRENT_USER:''))}" placeholder="Clinician name"></div></div>`;

document.querySelectorAll('#triEditBody [data-vk]').forEach(el=>{ const c=TRIAGE_VITALS.find(x=>x.key===el.dataset.vk);
if(c&&c.fmt){ const run=()=>{ el.value=c.fmt(el.value); }; el.addEventListener('blur',run); el.addEventListener('keydown',e=>{ if(e.key==='Enter') run(); }); } });
document.querySelectorAll('#triEditBody [data-ak]').forEach(el=>{ const c=TRIAGE_ASSESS.find(x=>x.key===el.dataset.ak);
if(c&&c.fmt&&el.tagName!=='SELECT'){ const run=()=>{ el.value=c.fmt(el.value); }; el.addEventListener('blur',run); el.addEventListener('keydown',e=>{ if(e.key==='Enter') run(); }); } });
document.getElementById('triEditScrim').classList.add('open');
document.getElementById('triEditModal').classList.add('open');
}
function closeTriageEdit(){
triEditPatient=null;
document.getElementById('triEditScrim').classList.remove('open');
document.getElementById('triEditModal').classList.remove('open');
}
function saveTriageEdit(){
const p0=triEditPatient; if(!p0) return;
const p=(typeof PATIENTS!=='undefined'&&PATIENTS.find(x=>x.id===p0.id))||p0;   /* n250: the board may have refreshed while the form was open */
const t=getTriage(p);
const body=document.getElementById('triEditBody');
const vitals={}; body.querySelectorAll('[data-vk]').forEach(el=>{ const c=TRIAGE_VITALS.find(x=>x.key===el.dataset.vk); const val=el.value.trim();
if(val!==''){ vitals[el.dataset.vk]=(c&&c.fmt)?c.fmt(val):val; } });
const assess={}; body.querySelectorAll('[data-ak]').forEach(el=>{ const c=TRIAGE_ASSESS.find(x=>x.key===el.dataset.ak); const val=el.value.trim();
if(val!==''){ assess[el.dataset.ak]=(c&&c.fmt&&el.tagName!=='SELECT')?c.fmt(val):val; } });
t.vitals=vitals; t.assess=assess;
t.chief=document.getElementById('triEditChief').value.split(',').map(s=>s.trim()).filter(Boolean);
t.history=document.getElementById('triEditHistory').value.trim();
t.by=document.getElementById('triEditBy').value.trim()||(typeof CURRENT_USER==='string'?CURRENT_USER:'');
t.at=fmtTime(new Date());
t.status='complete';
closeTriageEdit();
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
notify('Triage updated',`${bcEsc(p.name)} · ${bcEsc(p.hid)}`, {icon:'info', color:'var(--accent)'});
try{ if(typeof window.fvAfterTriage==='function') window.fvAfterTriage(p); }catch(e){ console.warn('[triage → sheet, Rounds]',e); }   /* n250 */
}
/* fillDrawer · its layers, innermost first: 1 #3 wrap · 2 #9 after · 3 #10 after · 4 #19 after · 5 #24 after · 6 n253-admit after · 7 n254-yakuri after · 8 n360 wrap   (PVX-N387; kept true by flow_t387) */
function fillDrawer(p){ return pvxRun('fillDrawer',fillDrawer$base,this,arguments); }
function fillDrawer$base(p){
const _dePc=(typeof PRIO_CLR!=='undefined')?(PRIO_CLR[p.prio]||PRIO_CLR[3]):null;
const de=document.getElementById('dEmoji');de.className='pt-emoji patient-medallion patient-medallion--compact priority-p'+p.prio+' '+spCls(p);
if(_dePc){ de.style.setProperty('--gc',_dePc.c); de.style.setProperty('--gcrgb',_dePc.rgb); }
de.innerHTML=monoInner(p);
const nameEl=document.getElementById('dName');
nameEl.textContent=`${p.name} ${p.last}`.trim();
const dResus=document.getElementById('dResus'); if(dResus){ dResus.innerHTML=resusPill(p); try{ CprEcg.mount(); }catch(e){} }
nameEl.classList.add('editable-hint');
nameEl.title='Edit name';
makeEditable(nameEl, val=>{
val=val.trim(); if(!val){ nameEl.textContent=`${p.name} ${p.last}`.trim(); return; }
const words=val.split(/\s+/);
if(words.length>1){ p.last=words.pop(); p.name=words.join(' '); } else { p.name=val; p.last=''; }
renderAll(); if(activePatient===p.id) fillDrawer(p);
});
document.getElementById('dSub').textContent=[p.species,patientAgeDisplay(p),p.breed].filter(x=>x&&x!=='—').join(' · ');
document.getElementById('dTags').innerHTML='';
document.getElementById('dClin').innerHTML=clinBar(p);
const w=waitMinutes(p);
document.getElementById('dGrid').innerHTML=`
    <div class="d-cell editable-hint"><div class="k">Owner</div><div class="v" id="dOwner">${bcEsc(p.owner)}</div></div>
    <div class="d-cell"><div class="k">Priority</div><div id="prioMount" style="margin-top:5px"></div></div>
    <div class="d-cell"><div class="k">Arrival</div><div class="v">${fmtTime(p.arrival)}</div></div>
    <div class="d-cell"><div class="k">Time in hospital</div><div class="v">${fmtWait(w)}</div></div>
    <div class="d-cell editable-hint" style="grid-column:1/3"><div class="k">Reason for visit</div><div class="v" id="dReason" style="font-size:0.8125rem;font-weight:600;line-height:1.5;white-space:pre-line">${bcEsc((p.reasonProblems&&p.reasonProblems.length)? p.reasonProblems.map(formatProblem).join('\n') : (p.reason||''))}</div></div>
    ${ownerHistoryCellHtml(p)}`;
wireOwnerHistoryToggle(p);

const prMount=document.getElementById('prioMount');
prMount.appendChild(createDropdown({ label:'Priority',
items: [1,2,3].map(n=>({id:String(n), name:`P${n} · ${PRIO_LABEL[n]}`, badge:`<span class="prio prio-${n}" style="width:24px;height:24px;font-size:0.6875rem;flex:0 0 auto">${PRIO[n].l}</span>`, color:PRIO[n].c, textColor:PRIO[n].t})),
selectedId: String(p.prio), variant:'compact', placeholder:'Set priority', searchPlaceholder:'Priority…',
onSelect: id => setPriority(PATIENTS.find(x=>x.id===p.id)||p, +id)
}));

makeEditable(document.getElementById('dReason'), val=>{
val=val.trim(); if(!val){ fillDrawer(p); return; }
const probs=[]; val.split(/\n+/).forEach(function(line){ splitComplaints(line).forEach(function(seg){ if(seg.trim()) probs.push(parseProblem(seg)); }); });
p.reasonProblems = probs;
p.reason = probs.length ? problemsToString(probs) : val;
p.reasonId = probs.length ? (probs[0].id||null) : null;
p.reasonCategory = probs.length ? (probs[0].category||null) : null;
renderAll(); if(activePatient===p.id) fillDrawer(p);
});

makeEditable(document.getElementById('dOwner'), val=>{
val=val.trim(); if(!val){ document.getElementById('dOwner').textContent=p.owner; return; }
p.owner=val; renderAll(); if(activePatient===p.id) fillDrawer(p);
});

const dMount=document.getElementById('docAssignMount');
dMount.innerHTML='';
dMount.appendChild(createDropdown({
items: (p.doctor&&p.doctor!=='unassigned'?[{id:'__none', name:'No doctor', initials:'—', color:'#A9C0D4', none:true}]:[]).concat(typeof fvDoctorItems==='function'?fvDoctorItems():DOCTORS),
selectedId: p.doctor==='unassigned'? null : p.doctor,
placeholder:'Assign a doctor', searchPlaceholder:'Search doctors…',
onSelect: id => assignDoctor(PATIENTS.find(x=>x.id===p.id)||p, id==='__none'?'unassigned':id)
}));

const lMount=document.getElementById('liaAssignMount');
lMount.innerHTML='';
lMount.appendChild(createDropdown({
items: [NO_LIAISON, ...LIAISONS],
selectedId: p.liaison || null,
placeholder:'Add a liaison', searchPlaceholder:'Search liaisons…',
onSelect: id => assignLiaison(PATIENTS.find(x=>x.id===p.id)||p, id==='none'? null : id)
}));

try{ renderCareTeamCard(p); }catch(e){}

renderRecordsCard(p);

const tm=document.getElementById('triageMount');
tm.innerHTML=triageCardHtml(p);
const triCard=document.getElementById('triCard');
document.getElementById('triHead').onclick=()=>{ triExpanded=!triExpanded; triCard.classList.toggle('open',triExpanded); };
document.getElementById('triCollapse').onclick=(e)=>{ e.stopPropagation(); triExpanded=false; triCard.classList.remove('open'); };
document.getElementById('triEdit').onclick=(e)=>{ e.stopPropagation(); openTriageEdit(p); };

const im=document.getElementById('intakeCardMount');
const kk=p.intake, ist=kk?kk.status:'not_started';
const isub = (kk && ist!=='not_started') ? summarizeIntake(kk) :'Owner history • Medications • Symptoms • Notes';
im.innerHTML=`<div class="triage-card" id="intakeCard" role="button" tabindex="0" aria-label="Triage intake — ${bcEsc(TRIAGE_STATUS[ist]||'')}. ${bcEsc(String(isub).replace(/ • /g,', '))}">
    <div class="tc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="9" r="2"/></svg></div>
    <div class="tc-main"><div class="tc-title">Triage intake</div><div class="tc-sub">${bcEsc(isub)}</div>
      <span class="tc-status tc-${ist}">${TRIAGE_STATUS[ist]}</span></div>
    <div class="tc-chev"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
  </div>`;
document.getElementById('intakeCard').onclick=()=>openIntake(p);
document.getElementById('intakeCard').onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openIntake(p); } };   /* PVX-N352 */
try{ renderMessages(p); }catch(e){}

document.getElementById('dAdv').innerHTML=STAGE_ORDER.filter(s=>s!==p.status && s!=='Admitted'&& s!=='Discharged').map(s=>
`<button data-s="${s}">${s}</button>`).join('');
document.querySelectorAll('#dAdv button').forEach(b=>b.onclick=()=>moveStatus(p,b.dataset.s));

const _tlRaw=[...p.timeline].sort((a,b)=>a.at-b.at);
const RESUS_WIN=10*60*1000;
const _resusPref=(l)=>{ const m=/\b(CPR|DNR)\b/i.exec(l||''); return m?m[1].toUpperCase():''; };
const _isResus=(l)=>/resuscitation preference/i.test(l||'');
const _stageClass=(l)=>{ l=(l||'').toLowerCase();
if(/waiting|checked in|arriv/.test(l)) return'waiting';
if(/exam/.test(l)) return'exam';
if(/diagnostic/.test(l)) return'diagnostics';
if(/ultrasound/.test(l)) return'ultrasound';
if(/procedure/.test(l)) return'procedure';
if(/admitted/.test(l)) return'admitted';
if(/discharg|euthan/.test(l)) return'discharged';
return''; };
const _actor=(m)=>{ if(!m) return''; const parts=String(m).split('·'); return parts.length>1?parts[parts.length-1].trim():''; };
const _items=[];
_tlRaw.forEach((e)=>{
if(_isResus(e.label)){
const last=_items[_items.length-1];
if(last && last.kind==='resus'&& (e.at-last.lastAt)<=RESUS_WIN){ last.entries.push(e); last.lastAt=e.at; last.finalPref=_resusPref(e.label)||last.finalPref; }
else { _items.push({kind:'resus', at:e.at, lastAt:e.at, entries:[e], finalPref:_resusPref(e.label)}); }
} else { _items.push({kind:'event', e:e}); }
});
let _curIdx=-1;
if(!isCompleted(p)){ for(let k=_items.length-1;k>=0;k--){ const it=_items[k]; if(it.kind==='event'){ const sc=_stageClass(it.e.label); if(sc && sc!=='discharged'){ _curIdx=k; break; } } } }
let tlHtml='';
_items.forEach((it, idx)=>{
const iv='--timeline-index:'+idx;
if(it.kind==='event'){
const sc=_stageClass(it.e.label);
const cls='timeline-event'+(sc?(' '+sc):'')+(idx===_curIdx?' current':'');
tlHtml+=`<div class="${cls}" style="${iv}"><div class="timeline-time">${fmtTime(it.e.at)}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-copy"><div class="timeline-event-title">${bcEsc(it.e.label)}</div>${it.e.meta?`<div class="timeline-event-detail">${bcEsc(it.e.meta)}</div>`:''}</div></div>`;
} else {
const fp=it.finalPref||'CPR', fpc=fp==='DNR'?'dnr':'cpr';
if(it.entries.length<=1){
const e0=it.entries[0];
tlHtml+=`<div class="timeline-event resus ${fpc}" style="${iv}"><div class="timeline-time">${fmtTime(e0.at)}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-copy"><div class="timeline-event-title">Resuscitation preference · ${fp}</div>${e0.meta?`<div class="timeline-event-detail">${bcEsc(e0.meta)}</div>`:''}</div></div>`;
} else {
const mins=Math.max(1,Math.round((it.lastAt-it.at)/60000));
const who=_actor(it.entries[it.entries.length-1].meta);
let rows='';
it.entries.forEach((en,ei)=>{
const to=_resusPref(en.label), from=ei>0?_resusPref(it.entries[ei-1].label):'';
const line = from ?`<span class="ra-${from==='DNR'?'dnr':'cpr'}">${from}</span> → <span class="ra-${to==='DNR'?'dnr':'cpr'}">${to}</span>`:`<span class="ra-${to==='DNR'?'dnr':'cpr'}">${to}</span>`;
const ac=_actor(en.meta);
rows+=`<div class="resus-audit"><div class="ra-time">${fmtTime(en.at)}</div><div><div class="ra-line">${line}</div>${ac?`<div class="ra-actor">${bcEsc(ac)}</div>`:''}</div></div>`;
});
tlHtml+=`<div class="timeline-event resus ${fpc}" style="${iv}"><div class="timeline-time">${fmtTime(it.at)}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-copy"><div class="resus-burst"><button type="button" class="resus-burst-toggle" aria-expanded="false"><div><div class="timeline-event-title">Resuscitation preference · ${fp}</div><div class="timeline-event-detail">Changed ${it.entries.length} times over ${mins} min${who?' · '+bcEsc(who):''}</div></div><span class="resus-chevron" aria-hidden="true">›</span></button><div class="resus-burst-more"><div class="resus-burst-inner">${rows}</div></div></div></div></div>`;
}
}
});
const _tlEl=document.getElementById('dTimeline');
_tlEl.innerHTML=tlHtml;
if(_tlFreshOpen){ _tlEl.classList.add('collapsed'); _tlEl.classList.remove('tl-animate'); const _th=document.getElementById('dTimelineHead'); if(_th) _th.setAttribute('aria-expanded','false'); }
_tlFreshOpen=false;
try{ renderDisposition(p); }catch(e){}
}

 
let intakePatient=null, intakeDraft=null;
/* openIntake · its layers, innermost first: 1 n351 wrap   (PVX-N387; kept true by flow_t387) */
function openIntake(p){ return pvxRun('openIntake',openIntake$base,this,arguments); }
function openIntake$base(p){
intakePatient=p;
intakeDraft=JSON.parse(JSON.stringify(getIntake(p)));
document.getElementById('intakePt').textContent=`${p.name} ${p.last} · ${p.species} · ${p.hid}`;
renderIntakeBody();
document.getElementById('intakeScrim').classList.add('open');
document.getElementById('intakeModal').classList.add('open');
}
function closeIntake(){
intakePatient=null; intakeDraft=null;
document.getElementById('intakeScrim').classList.remove('open');
document.getElementById('intakeModal').classList.remove('open');
}
function renderIntakeBody(){
const k=intakeDraft;
const ta=(f,ph,cls)=>`<textarea class="ik-area ${cls||''}" data-field="${f}" placeholder="${ph}">${(k[f]||'').replace(/</g,'&lt;')}</textarea>`;
const inp=(f,ph)=>`<input class="ik-input" data-field="${f}" placeholder="${ph}" value="${(k[f]||'').replace(/"/g,'&quot;')}">`;
const qRows = TRIAGE_Q.map(q=>{
const v=k.q[q.key];
const note = q.note ?`<input class="tq-note" data-note="${q.key}" placeholder="Details (optional)" value="${(k.qnotes[q.key]||'').replace(/"/g,'&quot;')}" style="display:${v==='yes'?'':'none'}">`:'';
return`<div class="tq-row" data-qkey="${q.key}">
      <div class="tq-label">${q.label}</div>
      <div class="tq-pills">
        <button class="tq-btn ${v==='yes'?('yes'===q.normal?'sel-normal':'sel-abnormal'):''}" data-q="${q.key}" data-val="yes" data-normal="${q.normal}">Yes</button>
        <button class="tq-btn ${v==='no'?('no'===q.normal?'sel-normal':'sel-abnormal'):''}" data-q="${q.key}" data-val="no" data-normal="${q.normal}">No</button>
      </div>${note}</div>`;
}).join('');
document.getElementById('intakeBody').innerHTML=`
    <div class="ik-sect"><h4>Presenting complaint</h4>
      <div class="ik-grid2">
        <div class="ik-field"><label>Presenting complaint</label>${inp('complaint','e.g. Vomiting, lethargy')}</div>
        <div class="ik-field"><label>Duration of signs</label>${inp('duration','e.g. 2 days')}</div>
      </div>
      <div class="ik-field"><label>History from owner</label>${ta('history','What did the owner observe? Onset, changes, context…')}</div>
    </div>
    <div class="ik-sect"><h4>Medical history</h4>
      <div class="ik-field"><label>Current medications</label>${inp('medications','List medications, or leave blank')}</div>
      <div class="ik-grid2">
        <div class="ik-field"><label>Known allergies</label>${inp('allergies','e.g. None known')}</div>
        <div class="ik-field"><label>Previous medical conditions</label>${inp('conditions','e.g. Prior pancreatitis')}</div>
      </div>
    </div>
    <div class="ik-sect"><h4>Clinical questions</h4>${qRows}</div>
    <div class="ik-sect"><h4>Additional notes</h4>
      <div class="ik-field">${ta('notes','Anything else the care team should know…','tall')}</div>
    </div>`;

document.querySelectorAll('#intakeBody [data-field]').forEach(el=>el.oninput=()=>{ intakeDraft[el.dataset.field]=el.value; });
document.querySelectorAll('#intakeBody [data-note]').forEach(el=>el.oninput=()=>{ intakeDraft.qnotes[el.dataset.note]=el.value; });
document.querySelectorAll('#intakeBody .tq-btn').forEach(btn=>btn.onclick=()=>{
const key=btn.dataset.q, val=btn.dataset.val;
intakeDraft.q[key] = (intakeDraft.q[key]===val ? null : val);
const row=btn.closest('.tq-row');
row.querySelectorAll('.tq-btn').forEach(b=>{ const selected=intakeDraft.q[key]===b.dataset.val, isNormal=b.dataset.val===b.dataset.normal;
b.classList.toggle('sel-normal', selected && isNormal); b.classList.toggle('sel-abnormal', selected && !isNormal); });
const note=row.querySelector('.tq-note'); if(note) note.style.display = intakeDraft.q[key]==='yes'?'':'none';
});
}
function commitIntake(finalStatus){
if(!intakePatient||!intakeDraft) return;
const prev = intakePatient.intake ? intakePatient.intake.status :'not_started';
intakeDraft.status = finalStatus || (prev==='complete'?'complete':'in_progress');
intakePatient.intake = intakeDraft;
const p=intakePatient, label=finalStatus==='complete'?'Triage intake completed':'Triage intake saved';
p.timeline.push({label, at:new Date(), meta:''});
notify(label,`${bcEsc(p.name)} ${bcEsc(p.last)}`, {icon:'check', color:'var(--s-exam)'});
closeIntake();
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}





const CLIENT_STEPS=['Check-In','Triage','Doctor Exam','Diagnostics','Treatment','Recovery','Ready to Go Home'];
const CLIENT_STAGE={
Waiting:      {label:'Awaiting Doctor',  color:'var(--s-waiting)',     rgb:'235,201,93',  step:2},
Exam:         {label:'Doctor Exam',       color:'var(--s-exam)',        rgb:'56,189,210',  step:2},
Diagnostics:  {label:'Diagnostics',       color:'var(--s-diagnostics)', rgb:'168,136,224', step:3},
Ultrasound:   {label:'Ultrasound',        color:'var(--s-ultrasound)',  rgb:'79,154,214',  step:3},
Procedure:    {label:'Treatment',         color:'var(--s-procedure)',   rgb:'232,100,74',  step:4},
Hospitalized: {label:'Hospitalized',      color:'#2FB6B9',              rgb:'47,182,185',  step:5},
Admitted:     {label:'Recovering',        color:'var(--s-admitted)',    rgb:'72,184,136',  step:5},
Discharged:   {label:'Ready to Go Home',  color:'var(--s-discharged)',  rgb:'122,155,181', step:6}
};
function clientStage(p){ return CLIENT_STAGE[p.status] || CLIENT_STAGE.Exam; }

const PRIO_CLR={1:{c:'var(--priority-p1)',rgb:'228,52,43'},2:{c:'var(--priority-p2)',rgb:'242,199,68'},3:{c:'var(--priority-p3)',rgb:'92,199,90'}};
function stageMinutes(p){ const t=p.timeline; const last=(t&&t.length)?t[t.length-1].at:p.arrival; return Math.max(0,Math.round((now-last)/60000)); }
const CL_PAW='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="11" r="2"/><circle cx="10" cy="6.5" r="2"/><circle cx="14" cy="6.5" r="2"/><circle cx="18" cy="11" r="2"/><path d="M12 12c-2.6 0-4.7 2-4.7 4.2 0 1.7 1.4 2.6 3 2.3.7-.15 1.1-.35 1.7-.35s1 .2 1.7.35c1.6.3 3-.6 3-2.3C16.7 14 14.6 12 12 12z"/></svg>';
const CL_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 7 9.5 17 5 12.5"/></svg>';
function clientJourney(p, withLabels){
const cs=clientStage(p), cur=cs.step;
return`<div class="cl-journey${withLabels?'':' nolabel'}" style="--gc:${cs.color};--gcrgb:${cs.rgb}">`+
CLIENT_STEPS.map((lbl,i)=>{ const cls=i<cur?'done':(i===cur?'current':''); return`<div class="cl-step ${cls}"><div class="cl-node">${i<cur?CL_CHECK:''}</div>${withLabels?`<div class="cl-step-lbl">${lbl}</div>`:''}</div>`; }).join('')+
`</div>`;
}
function clientSegments(p){
const cs=clientStage(p), cur=cs.step;
return`<div class="cl-segs" style="--gc:${cs.color};--gcrgb:${cs.rgb}">`+
CLIENT_STEPS.map((_,i)=>`<span class="cl-seg ${i<cur?'done':(i===cur?'current':'')}"></span>`).join('')+`</div>`;
}
function clientBadge(p){ const cs=clientStage(p); return`<span class="cl-badge" style="--gc:${cs.color};--gcrgb:${cs.rgb}"><span class="cl-badge-dot"></span><span class="cl-badge-txt"><span class="cl-badge-inner">${cs.label}</span></span></span>`; }

function clientVJourney(p){
const cs=clientStage(p), cur=cs.step;
return`<div class="cl-vtl" style="--gc:${cs.color};--gcrgb:${cs.rgb}">`+
CLIENT_STEPS.map((lbl,i)=>{ const cls=i<cur?'done':(i===cur?'current':''); return`<div class="cl-vstep2 ${cls}"><span class="cl-vnode">${i<cur?CL_CHECK:''}</span><span class="cl-vlbl">${lbl}</span></div>`; }).join('')+
`</div>`;
}
function clientPlaceholder(idx){
return`<div class="cl-card cl-empty" style="animation-delay:${idx*40}ms"><div class="cl-empty-in"><span class="cl-empty-paw">${CL_PAW}</span><span class="cl-empty-txt">Available</span></div></div>`;
}
function clientCard(p, idx){
const cs=clientStage(p), pr=PRIO[p.prio]||PRIO[3], pc=PRIO_CLR[p.prio]||PRIO_CLR[3];


const docName = p.doctor==='unassigned'
?'<span class="assigning-text">Assigning<span class="assigning-dots" aria-hidden="true"></span></span>'
: bcEsc(docShort(p.doctor));
return`<div class="cl-card priority-p${p.prio}" style="--gc:${pc.c};--gcrgb:${pc.rgb};animation-delay:${idx*60}ms">
    <div class="cl-cardtop">
      <div class="cl-cardmain">
        <div class="cl-mainhead">
          <div class="cl-photo patient-medallion ${spCls(p)}">${monoInner(p)}</div>
          <span class="cl-prio" style="background:${pr.c};color:${pr.t}">P${p.prio}</span>
        </div>
        <div class="cl-name">${bcEsc(p.name)} ${bcEsc(p.last)}</div>
        <div class="cl-meta">${bcEsc(p.breed)} · ${bcEsc(formatPatientAge(p))}</div>
      </div>
      ${clientVJourney(p)}
    </div>
    <div class="cl-badgerow">${clientBadge(p)}<span class="cl-doc">${docName}</span></div>
  </div>`;
}
const CL_ICONS={
users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
steth:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="9" r="2"/></svg>',
clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
};
function countUpEl(el,target,fmt){
const dur=900, t0=Date.now(), fmtv=n=>fmt==='wait'?fmtWait(Math.round(n)):String(Math.round(n));
(function step(){ const p=Math.min(1,(Date.now()-t0)/dur), e=1-Math.pow(1-p,3);
el.textContent=fmtv(target*e); if(p<1){ RAF?RAF(step):setTimeout(step,16); } })();
}
const PETS_ICON="assets/img/pets-icon.png";
const DOCS_ICON="assets/img/docs-icon.png";
const DISCH_ICON="assets/img/disch-icon.png";
function renderClientStats(animate){
const el=document.getElementById('clStats'); if(!el) return;
const m=execMetrics(); const active=PATIENTS.filter(isActive).length;
const avg=computeKPIs().find(k=>k.lab==='Avg Wait'); const avgVal=(avg && typeof avg.raw==='number')?avg.raw:null;
const stats=[
{ic:'<img class="cl-stat-photo" src="'+PETS_ICON+'" alt="">', sc:'56,189,210',  raw:active,           l:'Pets Receiving Care',   s:'On floor now',   fmt:'num'},
{ic:'<img class="cl-stat-photo" src="'+DOCS_ICON+'" alt="">', sc:'72,184,136',  raw:m.doctorsWorking, l:'Doctors On Duty',       s:'Caring for pets',fmt:'num'},
{ic:'<img class="cl-stat-photo" src="'+DISCH_ICON+'" alt="">', sc:'72,184,136',  raw:m.discharged,     l:'Pets Discharged Today', s:'Home & happy',   fmt:'num'}
];
const _disp=s=> s.fmt==='wait'? (typeof s.raw==='number'?fmtWait(s.raw):'—') : String(s.raw);
el.innerHTML=stats.map(s=>`<div class="cl-stat" style="--sc:${s.sc}">
    <div class="cl-stat-ic">${s.ic}</div>
    <div><div class="cl-stat-v" data-raw="${typeof s.raw==='number'?s.raw:''}" data-fmt="${s.fmt}">${_disp(s)}</div>
      <div class="cl-stat-l">${s.l}</div></div></div>`).join('');
if(animate) el.querySelectorAll('.cl-stat-v').forEach(v=>{ if(v.dataset.raw!=='') countUpEl(v, +v.dataset.raw, v.dataset.fmt); });
}
function clQrSvg(){
const N=21, s=100/N; let seed=7, cells='';
const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const finder=(x,y)=>{ let r=''; for(let i=0;i<7;i++)for(let j=0;j<7;j++){ if(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4)) r+=`<rect x="${(x+j)*s}" y="${(y+i)*s}" width="${s}" height="${s}"/>`; } return r; };
for(let y=0;y<N;y++)for(let x=0;x<N;x++){ if((x<7&&y<7)||(x>=N-7&&y<7)||(x<7&&y>=N-7)) continue; if(rnd()>0.55) cells+=`<rect x="${x*s}" y="${y*s}" width="${s}" height="${s}"/>`; }
return`<svg viewBox="0 0 100 100" fill="#0A1222" xmlns="http://www.w3.org/2000/svg">${cells}${finder(0,0)}${finder(N-7,0)}${finder(0,N-7)}</svg>`;
}
function updateClientClock(){ const c=document.getElementById('clClock'), d=document.getElementById('clDate'); if(!c) return;
c.textContent=fmtTime(now); if(d) d.textContent=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); }
let clPage=0, clPages=1, clRotateTimer=null;
function renderClient(animate){
const grid=document.getElementById('clGrid'); if(!grid) return;
const list=PATIENTS.filter(p=>isActive(p)&&p.status!=='Hospitalized').sort((a,b)=> a.prio-b.prio || waitMinutes(b)-waitMinutes(a));
const _clT=document.getElementById('clSecTitle'); if(_clT) _clT.textContent = list.length?'Pets Currently Receiving Care':'No pets are currently listed.';
const PER=clPerPage(grid);
clPages=Math.max(1,Math.ceil(list.length/PER));
if(clPage>=clPages) clPage=0;
const items=list.slice(clPage*PER, clPage*PER+PER);
let html=items.map((p,i)=>clientCard(p,i)).join('');
for(let i=items.length;i<PER;i++) html+=clientPlaceholder(i);
grid.innerHTML=html;
renderClientPager();
renderClientStats(animate);
updateClientClock();
const qr=document.getElementById('clQr'); if(qr && !qr.innerHTML) qr.innerHTML='<div style="background:#fff;padding:5px;border-radius:6px;line-height:0">'+(typeof makeQR==='function'?makeQR('https://shoreline.pravix.app/track.html'):clQrSvg())+'</div>';
const gq=document.getElementById('clGamesQr'); if(gq && !gq.innerHTML) gq.innerHTML='<div style="background:#fff;padding:5px;border-radius:6px;line-height:0">'+(typeof makeQR==='function'?makeQR('https://shoreline.pravix.app/arcade'):'')+'</div>';
fitClientBadges();
requestAnimationFrame(fitClientBadges);
}


function fitClientBadges(){
var grid=document.getElementById('clGrid'); if(!grid) return;
grid.querySelectorAll('.cl-badge-txt').forEach(function(txt){
var inner=txt.querySelector('.cl-badge-inner'); if(!inner) return;
inner.classList.remove('scroll'); inner.style.removeProperty('--scroll-dist'); inner.style.removeProperty('--scroll-dur');
var over=inner.scrollWidth - txt.clientWidth;
if(over>1){
var dist=Math.ceil(over);
var dur=Math.min(14, Math.max(5, over/10 + 4));
inner.style.setProperty('--scroll-dist', (-dist)+'px');
inner.style.setProperty('--scroll-dur', dur.toFixed(2)+'s');
inner.classList.add('scroll');
}
});
}
(function(){
var reflow=function(){ if(typeof currentView!=='undefined'&& currentView==='client'){ fitClientBadges(); clearTimeout(window.__clRerender); window.__clRerender=setTimeout(function(){ try{ if(currentView==='client') renderClient(false); }catch(e){} },150); } };
window.addEventListener('resize',reflow);
document.addEventListener('fullscreenchange',reflow);
document.addEventListener('webkitfullscreenchange',reflow);
})();
function clPerPage(grid){ try{ var cs=getComputedStyle(grid); var c=cs.gridTemplateColumns.split(' ').filter(Boolean).length, r=cs.gridTemplateRows.split(' ').filter(Boolean).length; var n=Math.max(1,c)*Math.max(1,r); return n>0?n:8; }catch(e){ return 8; } }
function renderClientPager(){
const pager=document.getElementById('clPager'); if(!pager) return;
if(clPages<=1){ pager.innerHTML=''; pager.style.visibility='hidden'; return; }
pager.style.visibility='';
let dots=''; for(let i=0;i<clPages;i++) dots+=`<button class="cl-dot ${i===clPage?'active':''}" data-pg="${i}" aria-label="Page ${i+1} of ${clPages}"${i===clPage?' aria-current="page"':''}></button>`;   /* PVX-N210 */
const mid=clPages>10?`<span class="cl-pcount">Page ${clPage+1} of ${clPages}</span>`:`<div class="cl-dots">${dots}</div>`;
pager.setAttribute('role','group'); pager.setAttribute('aria-label','Pages');
pager.innerHTML=`<button class="cl-pnav" data-dir="-1" aria-label="Previous page">‹ Previous</button>${mid}<button class="cl-pnav" data-dir="1" aria-label="Next page">Next ›</button>`;
pager.querySelectorAll('.cl-dot').forEach(d=>d.onclick=()=>clientSetPage(+d.dataset.pg));
pager.querySelectorAll('.cl-pnav').forEach(b=>b.onclick=()=>clientPage(+b.dataset.dir));
}

function clientFade(){
const grid=document.getElementById('clGrid'); if(!grid){ renderClient(); return; }
grid.classList.add('sliding');
setTimeout(()=>{ renderClient(); grid.classList.remove('sliding'); }, 260);
}
function clientPage(dir){ if(clPages<=1) return; clPage=(clPage+dir+clPages)%clPages; clientFade(); startClientRotate(); clSay(); }
function clientSetPage(i){ if(clPages<=1||i===clPage) return; clPage=i; clientFade(); startClientRotate(); clSay(); }
function clSay(){ var l=document.getElementById('clPageLive'); if(!l){ l=document.createElement('div'); l.id='clPageLive'; l.setAttribute('role','status'); l.className='cl-vh'; document.body.appendChild(l); }   /* PVX-N210: a chosen page is announced once */
  l.textContent=''; setTimeout(function(){ l.textContent='Page '+(clPage+1)+' of '+clPages; },60); }
function startClientRotate(){ stopClientRotate(); if(clPages>1){ clRotateTimer=setInterval(()=>{ clPage=(clPage+1)%clPages; clientFade(); }, 13000); } }
function stopClientRotate(){ if(clRotateTimer){ clearInterval(clRotateTimer); clRotateTimer=null; } }
 
let clSlide=0, clSlideTimer=null;
function clShowSlide(){ const s=document.querySelectorAll('#clCarousel .cl-slide'); s.forEach((el,i)=>el.classList.toggle('active', i===clSlide)); }
function startClientCarousel(){ stopClientCarousel(); clShowSlide();
clSlideTimer=setInterval(()=>{ const n=document.querySelectorAll('#clCarousel .cl-slide').length||1; clSlide=(clSlide+1)%n; clShowSlide(); }, 20000); }
function stopClientCarousel(){ if(clSlideTimer){ clearInterval(clSlideTimer); clSlideTimer=null; } }

document.addEventListener('keydown',e=>{
if(currentView!=='client') return;
if(e.key==='ArrowRight'){ e.preventDefault(); clientPage(1); }
else if(e.key==='ArrowLeft'){ e.preventDefault(); clientPage(-1); }
});
(function clientSwipe(){
let x0=null;
document.addEventListener('touchstart',e=>{ if(currentView==='client'&& e.target.closest && e.target.closest('#clGrid')) x0=e.touches[0].clientX; },{passive:true});
document.addEventListener('touchend',e=>{ if(x0===null) return; const dx=e.changedTouches[0].clientX-x0; x0=null; if(Math.abs(dx)>60) clientPage(dx<0?1:-1); },{passive:true});
})();

/* switchView · its layers, innermost first: 1 #18 after · 2 n363 wrap   (PVX-N387; kept true by flow_t387) */
function switchView(v){ return pvxRun('switchView',switchView$base,this,arguments); }
function switchView$base(v){


if(typeof currentApp!=='undefined'&& currentApp!=='flow'){ switchAppShell('flow'); usxHideAllViews(); try{ rdHideAllViews(); }catch(e){} }
currentView=v;
document.body.classList.toggle('client-mode', v==='client');
document.body.classList.toggle('hide-fab', v==='flow'||v==='rooms');
if(v!=='client'){ stopClientRotate(); stopClientCarousel(); }
if(typeof hidePreview==='function'&& v!=='list'){ clearTimeout(pvTimer); hidePreview(); }
document.querySelectorAll('#switcher .seg').forEach(s=>s.classList.toggle('active',s.dataset.view===v));
['dashboard','list','flow','rooms','client'].forEach(x=>{
const el=document.getElementById('view-'+x);
el.classList.toggle('hidden',x!==v);
if(x===v){el.classList.remove('view');void el.offsetWidth;el.classList.add('view');}
});
renderAll();
if(v==='dashboard'){ renderKPIs(true); renderClientQueue(); renderOps(true); }
if(v==='client'){ clPage=0; clSlide=0; renderClient(true); startClientRotate(); startClientCarousel(); }
}
function scheduleRender(after){
if(typeof after==='function') _renderAfter.push(after);
if(_renderQueued) return;
_renderQueued=true;
requestAnimationFrame(_runQueuedRender);
setTimeout(_runQueuedRender,100);
}
function _runQueuedRender(){
if(!_renderQueued) return;
_renderQueued=false;
var cbs=_renderAfter; _renderAfter=[];
try{ renderAll(); }catch(e){ console.error('renderAll failed',e); }
for(var i=0;i<cbs.length;i++){ try{ cbs[i](); }catch(e){ console.error('post-render callback failed',e); } }
}
function flushRender(){ _runQueuedRender(); }
var _renderQueued=false, _renderAfter=[];
/* renderAll · its layers, innermost first: 1 n197 after   (PVX-N387; kept true by flow_t387) */
function renderAll(){ return pvxRun('renderAll',renderAll$base,this,arguments); }
function renderAll$base(){
try{ now.setTime(Date.now()); }catch(e){}
renderKPIs();renderAttention();renderClientQueue();renderOps();
renderFilterBar();renderTable();renderBoard();renderRooms();renderComplete();
if(currentView==='client') renderClient();
if(activeLoc) renderLocDrawer();
try{ renderAlert(); }catch(e){}
try{ if(typeof renderCritAlert==='function') renderCritAlert(); }catch(e){}
try{ renderUltrasound(); }catch(e){}
try{ renderRounds(); }catch(e){}
persist();
}



const AP_LOCATIONS = ['Lobby','Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Treatment','Comfort Room'];
let apArrivalType='walkin', apPrio=2, apDoctorId='unassigned', apLocation='Lobby';
let apDoctorDD=null, apLocationDD=null;

 

const BREED_PINS={Feline:["Domestic Shorthair","Domestic Medium Hair","Domestic Longhair"], Canine:["Mixed Breed Dog"]};

 
let bcResults=[], bcHl=-1, bcOpen=false;
const bcPanel=()=>document.getElementById('apBreedPanel');
const bcInput=()=>document.getElementById('apBreed');
/* ═════════ flow-round2-oct6 ═════════ */
function bcEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/* Text that can come from the public check-in iPad. Every display point escapes, so ordinary characters (< > & quotes)
   are never touched; only control characters (→ a space; line breaks kept where asked) and invisible zero-width /
   direction-override characters (removed) go. Joiners stay, so emoji sequences survive. */
function fxClean(v,lines){ if(typeof v!=='string') return v;
  return v.replace(lines?/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029]/g:/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g,' ')
    .replace(/[\u200B\u202A-\u202E\u2066-\u2069\uFEFF]/g,''); }
function fxCleanPatient(o){ if(!o) return o;
  ['name','last','owner','ownerPhone','breed','species','sex','age','ageDisplay','weight','referringHospital'].forEach(k=>{ if(typeof o[k]==='string') o[k]=fxClean(o[k]); });
  ['reason','transferNotes'].forEach(k=>{ if(typeof o[k]==='string') o[k]=fxClean(o[k],true); });
  if(Array.isArray(o.reasonProblems)) o.reasonProblems.forEach(x=>{ if(x&&typeof x==='object'){ ['label','originalInput','durationText','frequencyText','onsetText'].forEach(k=>{ if(typeof x[k]==='string') x[k]=fxClean(x[k]); }); } });
  return o; }

/* Already checked in? Same pet name and the same owner or phone, on a visit that hasn't ended. */
function fxKey(v){ const t=String(v==null?'':v).toLowerCase().replace(/\s+/g,' ').trim(); return t==='—'?'':t; }
function fxDigits(v){ return String(v==null?'':v).replace(/\D/g,'').slice(-10); }
function fxDupFind(f){
  const nm=fxKey((f.name||'')+' '+(f.last||'')); if(!nm) return null; const ow=fxKey(f.owner), ph=fxDigits(f.ownerPhone);
  return PATIENTS.find(p=>!p.completed&&!isCompleted(p)&&fxKey((p.name||'')+' '+(p.last||''))===nm
    &&((ow&&fxKey(p.owner)===ow)||(ph.length>=7&&fxDigits(p.ownerPhone)===ph)))||null; }
function fxDupAsk(f,go){
  const ex=fxDupFind(f); if(!ex) return false;
  const nm=((ex.name||'')+' '+(ex.last||'')).trim();
  showConfirm(nm+' is already checked in.','Open existing',()=>{ closeAddPatient(); openDrawer(ex.id); },   /* PVX-N209: Cancel never adds */
    {sub:'Owner '+(ex.owner||'—')+' · '+(ex.status||'')+' · '+(ex.room||'Lobby')+(ex.arrival instanceof Date?' · arrived '+fmtTime(ex.arrival):'')+'. Choose Add new visit only if this is a different pet.',
     alt:{label:'Add new visit', act:go}});
  return true; }
function fxCommitChecked(f){ if(fxDupAsk(f,()=>commitPatient(f))) return null; return commitPatient(f); }

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

/* CPR/DNR from the family's tracker (pub) is a request: staff confirm it before it becomes the badge.
   No clock comparison (a family phone's clock can be behind the staff record): a pub value is ignored only when it is
   exactly a state staff had on record — the current one, one in the history, or one this screen replaced (a stale copy of
   our own write still on its way out of pub). */
var _fxStaffResus={};   /* tracker token → { 'CPR|<iso>':1 } states this screen replaced */
function fxIso(v){ if(!v) return ''; try{ if(v.toDate) v=v.toDate(); const d=new Date(v); return isNaN(d.getTime())?String(v):d.toISOString(); }catch(e){ return String(v); } }
function fxResusKey(pref,at){ return (pref||'')+'|'+fxIso(at); }
function fxStaffKnows(p,pref,at){ const k=fxResusKey(pref,at);
  if(fxResusKey(p.resusPref,p.resusRecordedAt)===k) return true;
  if((p.resusHistory||[]).some(h=>h&&h.source!=='client_tracker'&&fxResusKey(h.pref,h.at)===k)) return true;
  return !!(_fxStaffResus[p.publicToken]&&_fxStaffResus[p.publicToken][k]); }
function fxResusFromPub(p,r){
  if(!p||!r) return; const pref=normalizeResusPref(r.pref); if(!pref) return;
  const at=fxIso(r.at)||null;
  if(pref===p.resusPref){ if(p.resusRequest&&!fxStaffKnows(p,pref,at)) p.resusRequest=null; return; }   /* the family went back to what's on record */
  if(p.resusRequest&&p.resusRequest.pref===pref) return;                                                 /* already waiting */
  if(p.resusRequestDismissed===fxResusKey(pref,at)) return;                                              /* staff dismissed this one */
  if(fxStaffKnows(p,pref,at)) return;                                                                    /* our own earlier record */
  p.resusRequest={pref:pref, at:at};
}
function fxResusReqHTML(p){ const q=p&&p.resusRequest; if(!q) return '';
  return '<span class="fx-rr" role="group" aria-label="Client request — confirm"><span class="fx-rr-t">Client request — confirm <b>'+bcEsc(q.pref)+'</b>'
    +(q.at?'<small> · '+bcEsc(fmtTime(new Date(q.at)))+'</small>':'')+'</span>'
    +'<button type="button" class="fx-rr-ok" data-rr="ok">Confirm '+bcEsc(q.pref)+'</button><button type="button" class="fx-rr-no" data-rr="no">Dismiss</button></span>'; }
function fxResusReqChip(p){ const q=p&&p.resusRequest; if(!q) return '';
  return '<span class="fx-rr-chip" title="Client request — confirm in the patient panel">'+bcEsc(q.pref)+'?</span>'; }
function fxResusAccept(p){ const q=p&&p.resusRequest; if(!q) return;
  if(!Array.isArray(p.resusHistory)) p.resusHistory=[];
  p.resusHistory.push({ pref:q.pref, source:'client_tracker', at:q.at||new Date().toISOString(), by:null });
  if(p.resusPref===q.pref){ p.resusRequest=null; p.resusStatus='confirmed'; scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); }); }
  else setResusPref(p,q.pref);
  if(Array.isArray(p.timeline)) p.timeline.push({ label:'Client resuscitation request confirmed: '+q.pref, at:new Date(), meta:'Confirmed · '+CURRENT_USER }); }
function fxResusDismiss(p){ const q=p&&p.resusRequest; if(!q) return;
  p.resusRequestDismissed=fxResusKey(q.pref,q.at); p.resusRequest=null;
  if(Array.isArray(p.timeline)) p.timeline.push({ label:'Client resuscitation request dismissed: '+q.pref, at:new Date(), meta:'Kept '+(p.resusPref||'not set')+' · '+CURRENT_USER });
  scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); }); }
document.addEventListener('click',function(e){ const b=e.target.closest&&e.target.closest('[data-rr]'); if(!b) return;
  e.preventDefault(); e.stopPropagation(); const p=PATIENTS.find(x=>x.id===activePatient); if(!p) return;
  if(b.dataset.rr==='ok') fxResusAccept(p); else fxResusDismiss(p); },true);

function breedSpecies(){ const el=document.getElementById('apSpecies'); const v=el?el.value:''; return v==='Feline'?'Feline':(v==='Canine'?'Canine':null); }
function breedSource(){ const sp=breedSpecies(); return sp==='Feline'?FELINE_BREEDS.map(b=>b.name):(sp==='Canine'?CANINE_BREEDS:null); }


function _bnorm(s){ return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,''); }
function _buildBreedIndex(arr){ return arr.map(b=>{ const terms=[]; const add=a=>(a||[]).forEach(x=>{ const n=_bnorm(x); if(n&&terms.indexOf(n)<0) terms.push(n); }); add(b.aliases); add(b.variants); add(b.search_terms); return {name:b.name,id:b.id,nameNorm:_bnorm(b.name),terms:terms}; }); }
const FELINE_INDEX=_buildBreedIndex(FELINE_BREEDS);
const CANINE_INDEX=_buildBreedIndex(CANINE_BREEDS);
const FELINE_BY_NAME={},FELINE_BY_ID={}; FELINE_BREEDS.forEach(b=>{ FELINE_BY_NAME[b.name]=b; if(b.id) FELINE_BY_ID[b.id]=b; });
const CANINE_BY_NAME={},CANINE_BY_ID={}; CANINE_BREEDS.forEach(b=>{ CANINE_BY_NAME[b.name]=b; if(b.id) CANINE_BY_ID[b.id]=b; });
function breedMeta(k){ return FELINE_BY_NAME[k]||FELINE_BY_ID[k]||CANINE_BY_NAME[k]||CANINE_BY_ID[k]||null; }
function felineBreedMeta(k){ return FELINE_BY_NAME[k]||FELINE_BY_ID[k]||null; }


/* breedFuzzyIndexed · its layers, innermost first: 1 #57 wrap   (PVX-N387; kept true by flow_t387) */
function breedFuzzyIndexed(INDEX,q){ return pvxRun('breedFuzzyIndexed',breedFuzzyIndexed$base,this,arguments); }
function breedFuzzyIndexed$base(INDEX,q){
const ql=_bnorm(q); if(!ql) return []; const rawL=q.toLowerCase(); const res=[];
for(let i=0;i<INDEX.length;i++){ const it=INDEX[i]; let score=-1;
if(it.nameNorm===ql) score=1000; else if(it.nameNorm.indexOf(ql)===0) score=900; else if(it.nameNorm.indexOf(ql)>=0) score=500;
if(score<800){ for(let t=0;t<it.terms.length;t++){ if(it.terms[t]===ql){ score=800; break; } } }
if(score<700){ for(let t=0;t<it.terms.length;t++){ if(it.terms[t].indexOf(ql)===0){ score=Math.max(score,700); } } }
if(score<400){ for(let t=0;t<it.terms.length;t++){ if(it.terms[t].indexOf(ql)>=0){ score=Math.max(score,400); break; } } }
if(score<0 && bcSubseq(it.nameNorm,ql)) score=100;
if(score>=0){ let ranges=null; const idxn=it.name.toLowerCase().indexOf(rawL); if(idxn>=0) ranges=[[idxn,q.length]]; res.push({name:it.name,score:score,ranges:ranges,len:it.name.length}); }
}
res.sort((a,b)=> b.score-a.score || a.len-b.len || a.name.localeCompare(b.name));
return res.map(r=>({name:r.name, html:bcHighlight(r.name,r.ranges), pinned:false}));
}
function breedOrdered(sp, source){
const pins=BREED_PINS[sp]||[];
const rest=source.filter(b=>pins.indexOf(b)<0).slice().sort((a,b)=>a.localeCompare(b));
return pins.concat(rest);
}
function bcWordBoundary(low,q){ let i=low.indexOf(q); while(i>0){ const c=low[i-1]; if(c===' '||c==='-'||c==='/') return i; i=low.indexOf(q,i+1); } return -1; }
function bcSubseq(low,q){ const r=[]; let qi=0; for(let i=0;i<low.length&&qi<q.length;i++){ if(low[i]===q[qi]){ r.push([i,1]); qi++; } } return qi===q.length?r:null; }
function bcHighlight(name, ranges){
if(!ranges||!ranges.length) return bcEsc(name);
const mark=new Array(name.length).fill(false);
ranges.forEach(r=>{ for(let i=r[0];i<r[0]+r[1];i++) if(i>=0&&i<name.length) mark[i]=true; });
let out='', run='', on=false;
for(let i=0;i<name.length;i++){ if(mark[i]!==on){ out += on?('<span class="bc-hl">'+bcEsc(run)+'</span>'):bcEsc(run); run=''; on=mark[i]; } run+=name[i]; }
out += on?('<span class="bc-hl">'+bcEsc(run)+'</span>'):bcEsc(run);
return out;
}
function breedFuzzy(list,q){
const ql=q.toLowerCase(); const res=[];
list.forEach(name=>{
const low=name.toLowerCase(); let score=-1, ranges=null;
const idx=low.indexOf(ql);
if(idx===0){ score=100; ranges=[[0,ql.length]]; }
else { const wb=bcWordBoundary(low,ql);
if(wb>0){ score=80; ranges=[[wb,ql.length]]; }
else if(idx>0){ score=60; ranges=[[idx,ql.length]]; }
else { const ss=bcSubseq(low,ql); if(ss){ score=30; ranges=ss; } } }
if(score>=0) res.push({name,score,ranges});
});
res.sort((a,b)=> b.score-a.score || a.name.length-b.name.length || a.name.localeCompare(b.name));
return res.map(r=>({name:r.name, html:bcHighlight(r.name,r.ranges), pinned:false}));
}
function breedCompute(q){
const sp=breedSpecies(); if(!sp) return null;
q=(q||'').trim();
const DS = sp==='Feline'?FELINE_BREEDS:CANINE_BREEDS;
const IDX = sp==='Feline'?FELINE_INDEX:CANINE_INDEX;
const pins = BREED_PINS[sp]||[];
if(!q){ const rest=DS.map(b=>b.name).filter(n=>pins.indexOf(n)<0).sort((a,b)=>a.localeCompare(b));
return pins.concat(rest).map(n=>({name:n, html:bcEsc(n), pinned:pins.indexOf(n)>=0})); }
return breedFuzzyIndexed(IDX,q);
}
function breedHls(){ const opts=bcPanel().querySelectorAll('.bc-opt'); opts.forEach((o,i)=>o.classList.toggle('hl', i===bcHl)); const el=opts[bcHl]; if(el) el.scrollIntoView({block:'nearest'}); }
function breedRefresh(){
const p=bcPanel(); if(!p) return;
const list=breedCompute(bcInput().value);
if(list===null){ breedClose(); return; }
bcResults=list; if(bcHl>=list.length) bcHl=list.length-1;
if(!list.length){ p.innerHTML='<div class="bc-empty">No matching breeds — “'+bcEsc(bcInput().value.trim())+'” will be used as entered.</div>'; }
else {
p.innerHTML='<div class="bc-list">'+list.map((r,i)=>'<div class="bc-opt'+(i===bcHl?' hl':'')+'" data-i="'+i+'"><span class="bc-name">'+r.html+'</span>'+(r.pinned?'<span class="bc-pin">Common</span>':'')+'</div>').join('')+'</div>';
p.querySelectorAll('.bc-opt').forEach(o=>{
o.onmousedown=e=>{ e.preventDefault(); breedSelect(bcResults[+o.dataset.i].name); };
o.onmouseenter=()=>{ bcHl=+o.dataset.i; breedHls(); };
});
}
p.classList.add('open'); bcOpen=true;
}
function breedSelect(name){ const bi=bcInput(); bi.value=name; breedClose(); bi.focus(); }
function breedClose(){ const p=bcPanel(); if(p) p.classList.remove('open'); bcOpen=false; bcHl=-1; }
function breedKey(e){
if(!bcOpen){ if(e.key==='ArrowDown'){ bcHl=-1; breedRefresh(); } return; }
const n=bcResults.length;
if(e.key==='ArrowDown'){ e.preventDefault(); if(n){ bcHl=(bcHl+1)%n; breedHls(); } }
else if(e.key==='ArrowUp'){ e.preventDefault(); if(n){ bcHl=(bcHl-1+n)%n; breedHls(); } }
else if(e.key==='Enter'){ if(bcHl>=0 && bcResults[bcHl]){ e.preventDefault(); breedSelect(bcResults[bcHl].name); } else { breedClose(); } }
else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); breedClose(); }
else if(e.key==='Tab'){ breedClose(); }
}

function apAvailableLocations(){

return AP_LOCATIONS.filter(rm=>{
if(rm==='Lobby'||rm==='Treatment') return true;
return !PATIENTS.some(x=>isActive(x) && x.room===rm);
}).map(rm=>({id:rm, name:rm+(ROOM_SPEC[rm]?' · '+ROOM_SPEC[rm]:''), initials:'', color:'#7A98B8'}));
}
function apMountDoctor(){
const docItems=[{id:'unassigned',name:'Unassigned',initials:'—',color:'#A9C0D4'}, ...DOCTORS];
apDoctorDD=createDropdown({items:docItems, selectedId:apDoctorId, placeholder:'Assign a doctor',
searchPlaceholder:'Search doctors…', onSelect:id=>{apDoctorId=id;}});
const dm=document.getElementById('apDoctorMount'); dm.innerHTML=''; dm.appendChild(apDoctorDD);
}
function apMountLocation(){
const locs=apAvailableLocations();
if(!locs.some(l=>l.id===apLocation)) apLocation = locs[0]?locs[0].id:'Lobby';
apLocationDD=createDropdown({items:locs, selectedId:apLocation, placeholder:'Assign a location',
searchPlaceholder:'Search locations…', onSelect:id=>{apLocation=id;}});
const lm=document.getElementById('apLocationMount'); lm.innerHTML=''; lm.appendChild(apLocationDD);
}
/* apSetArrival · its layers, innermost first: 1 #21 wrap   (PVX-N387; kept true by flow_t387) */
function apSetArrival(type){ return pvxRun('apSetArrival',apSetArrival$base,this,arguments); }
function apSetArrival$base(type){
apArrivalType=type;
document.querySelectorAll('#apArrival .ap-seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.arrival===type));
document.getElementById('apTransfer').style.display = type==='transfer'?'':'none';
document.getElementById('apHospNote').style.display = type==='hospitalized'?'':'none';
const lm=document.getElementById('apLocationMount');
if(type==='hospitalized'){ apLocation='Treatment'; apMountLocation(); lm.style.opacity='.5'; lm.style.pointerEvents='none'; }
else { if(apLocation==='Treatment') apLocation='Lobby'; apMountLocation(); lm.style.opacity=''; lm.style.pointerEvents=''; }
}
function apSetPrio(level){
apPrio=level;
document.querySelectorAll('#apPrio .ap-prio-btn').forEach(b=>b.classList.toggle('active', +b.dataset.prio===level));
}
 
/* fmtTitleCase · its layers, innermost first: 1 #16 wrap   (PVX-N387; kept true by flow_t387) */
function fmtTitleCase(s){ return pvxRun('fmtTitleCase',fmtTitleCase$base,this,arguments); }
function fmtTitleCase$base(s){
if(!s || !s.trim()) return s;
return s.trim().replace(/\s+/g,' ').toLowerCase()
.replace(/(^|[\s'’.-])([a-z])/g, (m,p,c)=>p+c.toUpperCase());
}
/* Phone: digits only, at most 10 (area code + number), shaped as you type — (401) 533-7580 (n91) */
function fmtPhoneLive(s){ const d=String(s||'').replace(/\D/g,'').replace(/^1(?=\d{10})/,'').slice(0,10);
if(d.length<4) return d; if(d.length<7) return '('+d.slice(0,3)+') '+d.slice(3); return '('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6); }
document.addEventListener('input',function(e){ const el=e.target; if(!el||el.id!=='apPhone') return; const v=fmtPhoneLive(el.value); if(el.value!==v) el.value=v; },true);
function fmtPhone(s){
if(!s) return s;
const d=s.replace(/\D/g,'');
return d.length===10 ?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`: s;
}
function fmtAge(raw){
if(!raw || !raw.trim()) return raw;
const s=raw.trim();
if(/^\d+$/.test(s)){ const n=parseInt(s,10); return n+' Year'+(n===1?'':'s'); }
const map={y:'Year',yr:'Year',yrs:'Year',year:'Year',years:'Year',
m:'Month',mo:'Month',mos:'Month',month:'Month',months:'Month',
w:'Week',wk:'Week',wks:'Week',week:'Week',weeks:'Week',
d:'Day',day:'Day',days:'Day'};
const parts=[]; let matched=false;
const re=/(\d+)\s*([a-zA-Z]+)/g; let mch;
while((mch=re.exec(s))!==null){
const n=parseInt(mch[1],10), u=mch[2].toLowerCase();
if(!map[u]) return raw;
matched=true; parts.push(n+' '+map[u]+(n===1?'':'s'));
}
return (matched && parts.length) ? parts.join(', ') : raw;
}

function fmtNumUnit(s, unit){ if(s==null) return s; s=String(s).trim(); if(s==='') return s;
const m=s.match(/-?\d+(\.\d+)?/); return m ? (m[0]+unit) : s; }


const LB_TO_KG = 0.45359237;
function convertLbToKg(lb){ return lb * LB_TO_KG; }


function formatWeightKg(kg, converted){
if(kg==null || !isFinite(kg)) return'';


const r = converted ? (Math.round(kg*10)/10).toFixed(1) : String(Math.round(kg*100)/100);
return r +' kg';
}

function parseWeightInput(raw){
if(raw==null) return {valid:false, empty:true};
const s = String(raw).trim().toLowerCase();
if(s==='') return {valid:false, empty:true};
const bad = {valid:false, error:'Enter weight in kg or lb.'};
{ const lo=s.match(/^(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|#)\s*(\d+(?:\.\d+)?)\s*(?:oz|ounces?)$/);   /* 12 lb 8 oz */
  if(lo){ const kg0=convertLbToKg(parseFloat(lo[1])+parseFloat(lo[2])/16); return kg0>0?{valid:true,kg:Math.round(kg0*100)/100,display:formatWeightKg(kg0,true),lb:true}:bad; } }
const nums = s.match(/-?\d+(?:\.\d+)?/g) || [];
if(nums.length!==1) return bad;
const n = parseFloat(nums[0]);
if(!isFinite(n) || n<=0) return bad;
const unit = /#/.test(s) ? 'lb' : s.replace(nums[0],'').replace(/[^a-z]/g,'');   /* 44# = 44 lb */
let kg, converted=false;
if(/^(lb|lbs|pound|pounds)$/.test(unit)){ kg = convertLbToKg(n); converted=true; }
else if(/^(kg|kgs|kilo|kilos|kilogram|kilograms)$/.test(unit) || unit===''){ kg = n; }
else return bad;
if(!isFinite(kg) || kg<=0) return bad;
return { valid:true, kg: Math.round(kg*100)/100, display: formatWeightKg(kg, converted) };
}
function fmtWeight(s){ const r=parseWeightInput(s); return r.valid ? r.display : (s==null?s:String(s)); }
function fmtTemp(s){ return fmtNumUnit(s,'°F'); }
function fmtHR(s){ return fmtNumUnit(s,' bpm'); }
function fmtRR(s){ return fmtNumUnit(s,' rpm'); }
function fmtCRT(s){ if(s==null) return s; s=String(s).trim(); if(s==='') return s;
const low=s.toLowerCase(), m=s.match(/\d+(\.\d+)?/); if(!m) return s;
let sign='<';
if(low.includes('greater than')||low.includes('more than')||s.includes('>')) sign='>';
else if(low.includes('less than')||s.includes('<')) sign='<';
return sign+m[0]+' sec'; }
function apFormatFields(){
const f=(id,fn)=>{const el=document.getElementById(id); if(el) el.value=fn(el.value);};
f('apName',fmtTitleCase); f('apOwner',fmtTitleCase); f('apPhone',fmtPhone); f('apAge',fmtAge); f('apWeight',fmtWeight);
}


const REASON_VISIT_DATA = [{"id":"vomiting","rank": 1,"label":"Vomiting","category":"Gastrointestinal","keywords": ["throwing up","puking","vomit","emesis","regurgitating"],"description":"The single most common ER complaint; causes range from dietary indiscretion to obstruction or toxicity"}, {"id":"diarrhea","rank": 2,"label":"Diarrhea","category":"Gastrointestinal","keywords": ["loose stool","soft stool","runny stool","liquid poop"],"description":"Especially urgent when bloody, watery, or paired with vomiting/lethargy"}, {"id":"lethargy","rank": 3,"label":"Lethargy","category":"General & Systemic","keywords": ["tired","weak","low energy","not acting right","ADR","listless"],"description":"Vague but very common presenting sign; can signal almost any serious illness"}, {"id":"not-eating","rank": 4,"label":"Not Eating","category":"General & Systemic","keywords": ["anorexia","loss of appetite","won't eat","refusing food","inappetence","wont eat"],"description":"Refusing food >24 hrs, especially in cats (risk of hepatic lipidosis)"}, {"id":"hit-by-car","rank": 5,"label":"Hit by Car","category":"Trauma","keywords": ["HBC","car accident","run over","struck by vehicle","vehicular trauma"],"description":"Internal bleeding, lung contusions, and fractures may not be obvious at first"}, {"id":"chocolate-ingestion","rank": 6,"label":"Chocolate Ingestion","category":"Toxicity","keywords": ["chocolate toxicity","ate chocolate","cocoa","brownies","baking chocolate"],"description":"Theobromine poisoning; dark/baking chocolate most dangerous"}, {"id":"foreign-body-ingestion","rank": 7,"label":"Foreign Body Ingestion","category":"Gastrointestinal","keywords": ["ate a sock","ate a toy","swallowed object","obstruction","ate a bone","corn cob"],"description":"Can cause intestinal obstruction requiring surgery"}, {"id":"difficulty-breathing","rank": 8,"label":"Difficulty Breathing","category":"Respiratory","keywords": ["dyspnea","labored breathing","can't breathe","gasping","open mouth breathing","cant breathe"],"description":"Open-mouth breathing in cats is always an emergency"}, {"id":"seizures","rank": 9,"label":"Seizures","category":"Neurologic","keywords": ["convulsions","fitting","epilepsy","seizing","shaking episode"],"description":"First-time seizures, cluster seizures, or seizures >5 min (status epilepticus)"}, {"id":"bite-wounds-animal-attack","rank": 10,"label":"Bite Wounds / Animal Attack","category":"Trauma","keywords": ["dog fight","cat fight","attacked","bitten","BDLD","puncture wounds"],"description":"Puncture wounds often hide deep tissue damage and infection"}, {"id":"laceration-open-wound","rank": 11,"label":"Laceration / Open Wound","category":"Trauma","keywords": ["cut","gash","bleeding wound","torn skin","needs stitches"],"description":"Cuts from glass, metal, fencing needing sutures"}, {"id":"limping-lameness","rank": 12,"label":"Limping / Lameness","category":"Musculoskeletal","keywords": ["favoring leg","won't bear weight","holding leg up","limp","wont bear weight"],"description":"Sprains, cruciate (ACL) tears, fractures, dislocations"}, {"id":"allergic-reaction","rank": 13,"label":"Allergic Reaction","category":"Allergic & Immune","keywords": ["hives","swollen face","facial swelling","anaphylaxis","welts"],"description":"Often from insect stings, foods, or vaccines; can progress to anaphylaxis"}, {"id":"urinary-blockage","rank": 14,"label":"Urinary Blockage","category":"Urinary","keywords": ["blocked cat","can't pee","can't urinate","straining no urine","urethral obstruction","cant pee","cant urinate"],"description":"Straining with no urine produced is life-threatening within hours"}, {"id":"bloat-gdv","rank": 15,"label":"Bloat / GDV","category":"Gastrointestinal","keywords": ["twisted stomach","distended abdomen","swollen belly","retching nothing coming up","torsion"],"description":"Distended abdomen and unproductive retching in large deep-chested dogs; surgical emergency"}, {"id":"human-medication-ingestion","rank": 16,"label":"Human Medication Ingestion","category":"Toxicity","keywords": ["ate pills","ibuprofen","Advil","Tylenol","acetaminophen","Adderall","antidepressants"],"description":"One of the top toxin calls every year"}, {"id":"rat-poison-ingestion","rank": 17,"label":"Rat Poison Ingestion","category":"Toxicity","keywords": ["rodenticide","mouse poison","D-Con","bait block","bromethalin"],"description":"Anticoagulant and bromethalin baits; signs may be delayed days"}, {"id":"marijuana-ingestion","rank": 18,"label":"Marijuana Ingestion","category":"Toxicity","keywords": ["THC","weed","edibles","cannabis","pot","gummies"],"description":"Increasingly common; wobbliness, dribbling urine, dilated pupils"}, {"id":"grape-raisin-ingestion","rank": 19,"label":"Grape / Raisin Ingestion","category":"Toxicity","keywords": ["ate grapes","raisins","trail mix","currants"],"description":"Can cause acute kidney failure in dogs, even small amounts"}, {"id":"xylitol-ingestion","rank": 20,"label":"Xylitol Ingestion","category":"Toxicity","keywords": ["sugar-free gum","birch sugar","sugar free candy","peanut butter xylitol"],"description":"Causes severe hypoglycemia and liver failure in dogs"}, {"id":"collapse-fainting","rank": 21,"label":"Collapse / Fainting","category":"General & Systemic","keywords": ["syncope","passed out","fell over","went limp","unresponsive"],"description":"Cardiac disease, internal bleeding, or heat stroke until proven otherwise"}, {"id":"acute-pain","rank": 22,"label":"Acute Pain","category":"General & Systemic","keywords": ["crying","yelping","hunched","painful","whimpering","vocalizing"],"description":"Common presentation of back, abdominal, or orthopedic problems"}, {"id":"vomiting-blood","rank": 23,"label":"Vomiting Blood","category":"Gastrointestinal","keywords": ["hematemesis","blood in vomit","coffee grounds vomit"],"description":"Ulcers, toxins, clotting disorders, foreign bodies"}, {"id":"bloody-diarrhea","rank": 24,"label":"Bloody Diarrhea","category":"Gastrointestinal","keywords": ["HGE","blood in stool","hemorrhagic diarrhea","AHDS"],"description":"Sudden jam-like bloody stool with rapid dehydration"}, {"id":"blood-in-urine","rank": 25,"label":"Blood in Urine","category":"Urinary","keywords": ["hematuria","red urine","pink urine","bloody pee"],"description":"UTIs, bladder stones, or bleeding disorders"}, {"id":"straining-to-urinate","rank": 26,"label":"Straining to Urinate","category":"Urinary","keywords": ["dysuria","frequent urination","peeing small amounts","urinary accidents","UTI"],"description":"UTI or partial blockage; monitor closely for full obstruction"}, {"id":"dehydration","rank": 27,"label":"Dehydration","category":"General & Systemic","keywords": ["not drinking","sunken eyes","dry gums","tacky gums"],"description":"Usually secondary to vomiting, diarrhea, or not drinking"}, {"id":"broken-bone-fracture","rank": 28,"label":"Broken Bone / Fracture","category":"Trauma","keywords": ["broken leg","fractured","broken bone"],"description":"From falls, car accidents, rough play, or being stepped on"}, {"id":"fall-from-height","rank": 29,"label":"Fall from Height","category":"Trauma","keywords": ["fell off balcony","high-rise syndrome","fell out window","fell down stairs"],"description":"Common in cats; chest and jaw injuries typical"}, {"id":"heatstroke","rank": 30,"label":"Heatstroke","category":"Environmental","keywords": ["overheated","hot car","heat exhaustion","hyperthermia","heat stress"],"description":"Dogs in hot cars or over-exercised in heat; brachycephalic breeds at high risk"}, {"id":"eye-injury","rank": 31,"label":"Eye Injury","category":"Eye","keywords": ["squinting","pawing at eye","scratched eye","something in eye","eye trauma"],"description":"Scratches, punctures, and foreign material; vision-threatening"}, {"id":"corneal-ulcer","rank": 32,"label":"Corneal Ulcer","category":"Eye","keywords": ["eye ulcer","cloudy eye","scratched cornea"],"description":"Painful surface erosion of the eye, often after trauma"}, {"id":"sudden-blindness","rank": 33,"label":"Sudden Blindness","category":"Eye","keywords": ["can't see","bumping into things","vision loss","went blind","cant see"],"description":"Retinal detachment, glaucoma, SARDS, or hypertension"}, {"id":"eye-out-of-socket","rank": 34,"label":"Eye Out of Socket","category":"Eye","keywords": ["proptosis","eye popped out","eye bulging"],"description":"Common in short-nosed breeds after even minor trauma; true emergency"}, {"id":"pancreatitis","rank": 35,"label":"Pancreatitis","category":"Gastrointestinal","keywords": ["ate fatty food","table scraps","abdominal pain and vomiting","pancreas"],"description":"Often after a fatty meal (holiday table scraps); vomiting and belly pain"}, {"id":"parvovirus","rank": 36,"label":"Parvovirus","category":"Infectious Disease","keywords": ["parvo","puppy bloody diarrhea","unvaccinated puppy sick"],"description":"Severe vomiting/bloody diarrhea in unvaccinated puppies; often fatal untreated"}, {"id":"kennel-cough-respiratory-infection","rank": 37,"label":"Kennel Cough / Respiratory Infection","category":"Infectious Disease","keywords": ["honking cough","CIRDC","upper respiratory infection","URI","goose honk"],"description":"Honking cough; urgent if not eating or breathing hard"}, {"id":"asthma-attack-cat","rank": 38,"label":"Asthma Attack (Cat)","category":"Respiratory","keywords": ["feline asthma","wheezing cat","cat can't breathe","cat cant breathe"],"description":"Wheezing, crouched open-mouth breathing in cats"}, {"id":"choking","rank": 39,"label":"Choking","category":"Respiratory","keywords": ["something stuck in throat","gagging","object in mouth","ball stuck"],"description":"Balls, sticks, bones, chew treats"}, {"id":"persistent-cough","rank": 40,"label":"Persistent Cough","category":"Respiratory","keywords": ["coughing","hacking","won't stop coughing","wont stop coughing"],"description":"Heart disease, collapsing trachea, pneumonia"}, {"id":"snake-bite","rank": 41,"label":"Snake Bite","category":"Environmental","keywords": ["copperhead","rattlesnake","bitten by snake","snakebite"],"description":"In CT: copperhead and timber rattlesnake are venomous; any bite warrants a visit"}, {"id":"bee-wasp-sting","rank": 42,"label":"Bee / Wasp Sting","category":"Environmental","keywords": ["stung","insect sting","swollen muzzle","bee sting"],"description":"Facial swelling and hives; can escalate to anaphylaxis"}, {"id":"porcupine-quills","rank": 43,"label":"Porcupine Quills","category":"Environmental","keywords": ["quilled","quills in face","porcupine"],"description":"Require sedated removal; never cut quills"}, {"id":"antifreeze-ingestion","rank": 44,"label":"Antifreeze Ingestion","category":"Toxicity","keywords": ["ethylene glycol","coolant","radiator fluid"],"description":"Tiny amounts cause fatal kidney failure; sweet taste attracts pets"}, {"id":"lily-ingestion-cat","rank": 45,"label":"Lily Ingestion (Cat)","category":"Toxicity","keywords": ["ate lily","lily toxicity","chewed flowers"],"description":"All parts of true lilies cause kidney failure in cats, even pollen"}, {"id":"onion-garlic-ingestion","rank": 46,"label":"Onion / Garlic Ingestion","category":"Toxicity","keywords": ["ate onions","garlic toxicity","onion powder"],"description":"Damages red blood cells; includes onion/garlic powder in foods"}, {"id":"sago-palm-ingestion","rank": 47,"label":"Sago Palm Ingestion","category":"Toxicity","keywords": ["ate sago palm","cycad","palm plant"],"description":"Houseplant causing acute liver failure; often fatal"}, {"id":"mushroom-ingestion","rank": 48,"label":"Mushroom Ingestion","category":"Toxicity","keywords": ["wild mushroom","yard mushroom","amanita","ate mushroom"],"description":"Amanita species can cause fatal liver failure"}, {"id":"compost-moldy-food-ingestion","rank": 49,"label":"Compost / Moldy Food Ingestion","category":"Toxicity","keywords": ["garbage gut","got into trash","mycotoxins","moldy food"],"description":"Tremors and seizures after raiding trash or compost"}, {"id":"bread-dough-ingestion","rank": 50,"label":"Bread Dough Ingestion","category":"Toxicity","keywords": ["raw dough","yeast dough","ate dough","rising dough"],"description":"Rising yeast dough expands in the stomach and ferments into alcohol"}, {"id":"alcohol-ingestion","rank": 51,"label":"Alcohol Ingestion","category":"Toxicity","keywords": ["drank alcohol","ethanol","beer","wine","liquor"],"description":"Alcohol poisoning; wobbliness, vomiting, dangerous drops in blood sugar and body temperature"}, {"id":"battery-ingestion","rank": 52,"label":"Battery Ingestion","category":"Toxicity","keywords": ["ate battery","button battery","swallowed battery"],"description":"Chemical burns to mouth, esophagus, and stomach"}, {"id":"string-ingestion-cat","rank": 53,"label":"String Ingestion (Cat)","category":"Gastrointestinal","keywords": ["linear foreign body","ate ribbon","tinsel","thread","string hanging out"],"description":"Thread, ribbon, tinsel; can saw through intestines; never pull a visible string"}, {"id":"fish-hook-injury","rank": 54,"label":"Fish Hook Injury","category":"Trauma","keywords": ["hook in lip","swallowed hook","fishhook"],"description":"Embedded in lips, mouth, or swallowed; do not pull out"}, {"id":"household-chemical-exposure","rank": 55,"label":"Household Chemical Exposure","category":"Toxicity","keywords": ["bleach","drain cleaner","laundry pod","detergent","essential oils","cleaning products"],"description":"Bleach, drain cleaner, laundry pods, essential oils"}, {"id":"flea-tick-product-toxicity","rank": 56,"label":"Flea/Tick Product Toxicity","category":"Toxicity","keywords": ["permethrin","dog flea med on cat","spot-on reaction","flea treatment reaction"],"description":"Dog-only spot-on products applied to cats cause tremors and seizures"}, {"id":"vestibular-episode","rank": 57,"label":"Vestibular Episode","category":"Neurologic","keywords": ["head tilt","circling","stroke-like","eyes darting","nystagmus","old dog vestibular"],"description":"Alarming but often treatable, especially in older dogs"}, {"id":"back-pain-ivdd","rank": 58,"label":"Back Pain / IVDD","category":"Neurologic","keywords": ["slipped disc","hunched back","won't jump","neck pain","disc disease","wont jump"],"description":"Yelping, hunched back, reluctance to jump; dachshunds and similar breeds prone"}, {"id":"hind-limb-weakness-paralysis","rank": 59,"label":"Hind-Limb Weakness / Paralysis","category":"Neurologic","keywords": ["dragging back legs","can't walk","down in rear","paralyzed","cant walk"],"description":"Disc herniation or (in cats) aortic clot; time-critical"}, {"id":"ataxia-wobbly-gait","rank": 60,"label":"Ataxia / Wobbly Gait","category":"Neurologic","keywords": ["stumbling","walking drunk","uncoordinated","off balance"],"description":"Toxins, inner-ear disease, or neurologic injury"}, {"id":"head-trauma","rank": 61,"label":"Head Trauma","category":"Trauma","keywords": ["hit head","head injury","concussion","kicked in head"],"description":"After falls, kicks, or vehicle strikes; watch for uneven pupils, disorientation"}, {"id":"tremors-shaking","rank": 62,"label":"Tremors / Shaking","category":"Neurologic","keywords": ["trembling","muscle tremors","shaking all over"],"description":"Toxins (mycotoxins, permethrin), low calcium, pain, or neurologic disease"}, {"id":"congestive-heart-failure","rank": 63,"label":"Congestive Heart Failure","category":"Cardiovascular","keywords": ["CHF","fluid in lungs","heart failure","heavy breathing heart"],"description":"Rapid or labored breathing, coughing, blue-tinged gums"}, {"id":"saddle-thrombus-cat","rank": 64,"label":"Saddle Thrombus (Cat)","category":"Cardiovascular","keywords": ["FATE","cold back legs","sudden paralysis cat","aortic clot","screaming and dragging legs"],"description":"Sudden painful hind-leg paralysis with cold limbs; cardiac emergency"}, {"id":"heart-arrhythmia","rank": 65,"label":"Heart Arrhythmia","category":"Cardiovascular","keywords": ["irregular heartbeat","racing heart","abnormal rhythm"],"description":"Weakness, collapse, exercise intolerance"}, {"id":"pale-gums-anemia","rank": 66,"label":"Pale Gums / Anemia","category":"Blood & Immune","keywords": ["white gums","pale tongue","anemic"],"description":"Sign of internal bleeding, immune destruction of red cells, or toxins"}, {"id":"internal-bleeding","rank": 67,"label":"Internal Bleeding","category":"Blood & Immune","keywords": ["hemoabdomen","splenic mass","bleeding internally","collapsed and pale"],"description":"Sudden collapse and pale gums in older large-breed dogs"}, {"id":"immune-mediated-anemia-imha","rank": 68,"label":"Immune-Mediated Anemia (IMHA)","category":"Blood & Immune","keywords": ["IMHA","autoimmune anemia","destroying red blood cells"],"description":"Body attacks its own red blood cells; jaundice and weakness"}, {"id":"diabetic-crisis","rank": 69,"label":"Diabetic Crisis","category":"Metabolic & Endocrine","keywords": ["DKA","ketoacidosis","diabetes emergency","diabetic"],"description":"Vomiting, weakness, sweet-smelling breath in a diabetic pet"}, {"id":"low-blood-sugar","rank": 70,"label":"Low Blood Sugar","category":"Metabolic & Endocrine","keywords": ["hypoglycemia","insulin overdose","weak puppy","sugar crash"],"description":"Toy-breed puppies, diabetic pets after insulin, xylitol ingestion"}, {"id":"addisonian-crisis","rank": 71,"label":"Addisonian Crisis","category":"Metabolic & Endocrine","keywords": ["Addison's disease","adrenal crisis","hypoadrenocorticism","Addisons disease"],"description":"Collapse, vomiting, shock; \"the great pretender\""}, {"id":"acute-kidney-failure","rank": 72,"label":"Acute Kidney Failure","category":"Metabolic & Endocrine","keywords": ["renal failure","kidney injury","AKI","kidneys shutting down"],"description":"Toxins (antifreeze, lilies, grapes), infections, shock"}, {"id":"liver-failure-jaundice","rank": 73,"label":"Liver Failure / Jaundice","category":"Metabolic & Endocrine","keywords": ["yellow gums","yellow eyes","icterus","liver disease"],"description":"Toxins, infections, or chronic disease decompensating"}, {"id":"pyometra","rank": 74,"label":"Pyometra","category":"Reproductive","keywords": ["infected uterus","pus discharge","unspayed female sick","pyo"],"description":"Unspayed females weeks after heat; drinking a lot, discharge; surgical emergency"}, {"id":"difficulty-giving-birth","rank": 75,"label":"Difficulty Giving Birth","category":"Reproductive","keywords": ["dystocia","stuck puppy","stuck kitten","in labor too long","whelping trouble"],"description":"Active straining >30-60 min without a puppy/kitten"}, {"id":"eclampsia","rank": 76,"label":"Eclampsia","category":"Reproductive","keywords": ["milk fever","nursing mother shaking","low calcium","puerperal tetany"],"description":"Tremors and stiffness in small-breed nursing dogs"}, {"id":"mastitis","rank": 77,"label":"Mastitis","category":"Reproductive","keywords": ["swollen mammary gland","infected teat","hard hot gland"],"description":"Hot, painful, discolored gland in nursing mothers"}, {"id":"fever","rank": 78,"label":"Fever","category":"General & Systemic","keywords": ["high temperature","pyrexia","burning up","hot ears"],"description":"Temperature >103.5 F with lethargy"}, {"id":"abscess","rank": 79,"label":"Abscess","category":"Skin & Ear","keywords": ["swelling with pus","cat bite abscess","ruptured lump","draining wound"],"description":"Painful swelling that may rupture and drain; common after cat fights"}, {"id":"hot-spot","rank": 80,"label":"Hot Spot","category":"Skin & Ear","keywords": ["moist dermatitis","raw spot","weeping sore","licked raw"],"description":"Rapidly spreading moist, raw, painful sore, often self-inflicted by licking or chewing"}, {"id":"skin-infection","rank": 81,"label":"Skin Infection","category":"Skin & Ear","keywords": ["pyoderma","infected skin","pustules","crusty skin","skin rash"],"description":"Bacterial skin infection; redness, crusts, pustules, odor"}, {"id":"ear-infection","rank": 82,"label":"Ear Infection","category":"Skin & Ear","keywords": ["otitis","head shaking","ear discharge","smelly ear","scratching at ear"],"description":"Painful ear canal infection; head shaking, odor, and discharge"}, {"id":"swollen-ear-flap-aural-hematoma","rank": 83,"label":"Swollen Ear Flap (Aural Hematoma)","category":"Skin & Ear","keywords": ["aural hematoma","puffy ear","pillow ear","blood blister on ear"],"description":"Blood-filled swelling of the ear flap, usually after violent head shaking"}, {"id":"torn-nail","rank": 84,"label":"Torn Nail","category":"Trauma","keywords": ["broken nail","bleeding nail","ripped toenail","cracked claw"],"description":"Bleeds heavily and is very painful; usually quick to treat"}, {"id":"paw-pad-injury","rank": 85,"label":"Paw Pad Injury","category":"Trauma","keywords": ["burned pads","cut pad","hot pavement","raw paws"],"description":"Limping, licking paws, visible sores after summer walks"}, {"id":"degloving-injury","rank": 86,"label":"Degloving Injury","category":"Trauma","keywords": ["skin torn off","exposed tissue","road rash severe"],"description":"Skin torn away exposing tissue, usually from vehicle accidents"}, {"id":"burns-scalds","rank": 87,"label":"Burns / Scalds","category":"Trauma","keywords": ["burned","hot liquid","stove burn","heating pad burn"],"description":"From stoves, hot liquids, heating pads, fires"}, {"id":"electrocution","rank": 88,"label":"Electrocution","category":"Trauma","keywords": ["chewed cord","electric shock","bit power cable"],"description":"Mouth burns and fluid in the lungs; common in puppies and kittens"}, {"id":"near-drowning","rank": 89,"label":"Near Drowning","category":"Environmental","keywords": ["fell in pool","inhaled water","almost drowned"],"description":"Pools and ponds; lung injury can develop hours later"}, {"id":"smoke-inhalation","rank": 90,"label":"Smoke Inhalation","category":"Environmental","keywords": ["house fire","smoke exposure"],"description":"After house fires; airway swelling may be delayed"}, {"id":"hypothermia","rank": 91,"label":"Hypothermia","category":"Environmental","keywords": ["too cold","freezing","low body temperature","cold exposure"],"description":"Dangerously low body temperature after cold exposure; shivering, weakness, stupor"}, {"id":"frostbite","rank": 92,"label":"Frostbite","category":"Environmental","keywords": ["frozen ears","frozen tail","frostbitten paws","frost bite"],"description":"Freezing injury to ear tips, tail, and paws after winter exposure"}, {"id":"nosebleed","rank": 93,"label":"Nosebleed","category":"Blood & Immune","keywords": ["epistaxis","bleeding from nose","bloody nose"],"description":"Clotting disorders, rodenticide, tumors, or trauma"}, {"id":"broken-tooth","rank": 94,"label":"Broken Tooth","category":"Trauma","keywords": ["dental fracture","cracked tooth","fractured tooth","chipped tooth","slab fracture"],"description":"Fractured or cracked teeth, often from chewing hard objects (bones, antlers); exposed pulp is very painful"}, {"id":"jaw-injury","rank": 95,"label":"Jaw Injury","category":"Trauma","keywords": ["fractured jaw","broken jaw","jaw hanging open","mouth trauma","can't close mouth","cant close mouth"],"description":"Jaw fracture or dislocation from falls, fights, or vehicle strikes; drooling and inability to close the mouth"}, {"id":"gunshot-projectile-wound","rank": 96,"label":"Gunshot / Projectile Wound","category":"Trauma","keywords": ["shot","pellet gun","BB gun","arrow wound"],"description":"Includes arrows and pellet gun injuries"}, {"id":"tail-injury","rank": 97,"label":"Tail Injury","category":"Trauma","keywords": ["happy tail","broken tail","degloved tail","bleeding tail tip"],"description":"Bleeding tail-tip wounds that repeatedly reopen"}, {"id":"rectal-prolapse","rank": 98,"label":"Rectal Prolapse","category":"Gastrointestinal","keywords": ["tissue coming out of anus","prolapsed rectum"],"description":"Tissue protruding from the anus after straining"}, {"id":"constipation","rank": 99,"label":"Constipation","category":"Gastrointestinal","keywords": ["obstipation","can't poop","straining to defecate","megacolon","hasn't pooped","cant poop","hasnt pooped"],"description":"Common in older cats (megacolon); straining mistaken for urinary blockage"}, {"id":"anal-gland-abscess","rank": 100,"label":"Anal Gland Abscess","category":"Skin & Ear","keywords": ["scooting","ruptured anal gland","swelling near anus"],"description":"Scooting, licking, sudden painful swelling near the anus"}, {"id":"vaccine-reaction","rank": 101,"label":"Vaccine Reaction","category":"Allergic & Immune","keywords": ["reaction after shot","swollen face after vaccine","vomiting after vaccine"],"description":"Vomiting, hives, facial swelling, or collapse shortly after vaccination"}, {"id":"medication-reaction","rank": 102,"label":"Medication Reaction","category":"Allergic & Immune","keywords": ["drug reaction","adverse drug event","reaction to medication","side effects"],"description":"Adverse reaction to a prescribed or over-the-counter medication"}, {"id":"post-surgery-complication","rank": 103,"label":"Post-Surgery Complication","category":"General & Systemic","keywords": ["opened incision","dehiscence","chewed stitches","incision bleeding","licked incision"],"description":"Dehiscence, infection, or licking damage after any surgery"}, {"id":"maggots-flystrike","rank": 104,"label":"Maggots / Flystrike","category":"Skin & Ear","keywords": ["myiasis","maggot wound","fly larvae"],"description":"Fly larvae in wounds or soiled coats, usually in debilitated outdoor animals"}, {"id":"tick-borne-illness","rank": 105,"label":"Tick-Borne Illness","category":"Infectious Disease","keywords": ["Lyme disease","anaplasmosis","ehrlichia","tick fever","tick disease"],"description":"Lyme, anaplasmosis, or ehrlichiosis flare-ups; fever, shifting lameness, lethargy"}, {"id":"tick-paralysis","rank": 106,"label":"Tick Paralysis","category":"Infectious Disease","keywords": ["weak after ticks","covered in ticks","ascending paralysis"],"description":"Progressive weakness caused by tick salivary toxins; improves after tick removal"}, {"id":"behavior-change-hiding","rank": 107,"label":"Behavior Change / Hiding","category":"General & Systemic","keywords": ["acting strange","disoriented","hiding","not himself","confused","staring at walls"],"description":"Especially in cats, hiding is often the only sign of serious illness or pain"}];



const ReasonVisitAutocomplete = (function(){
const norm = s => String(s||'').toLowerCase().replace(/[’']/g,'');
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function rank3(text,q){ const t=norm(text);
if(t.startsWith(q)) return 0;
if(t.split(/[^a-z0-9]+/).some(w=>w.startsWith(q))) return 1;
if(t.includes(q)) return 2; return -1; }
function score(item,q){
const rl=rank3(item.label,q); if(rl>=0) return [rl,null];
let best=9, via=null;
for(const k of item.keywords){ const r=rank3(k,q); if(r>=0 && r+3<best){ best=r+3; via=k; } }
if(via) return [best,via];
if(norm(item.category).includes(q)) return [6,null];
return [9,null]; }
function highlight(text,q){ const t=norm(text); const i=q?t.indexOf(q):-1;
if(i<0) return esc(text);
return esc(text.slice(0,i))+'<mark>'+esc(text.slice(i,i+q.length))+'</mark>'+esc(text.slice(i+q.length)); }
function search(raw){ const q=norm(String(raw).trim()); if(!q) return [];
return REASON_VISIT_DATA.map(it=>{ const [s,via]=score(it,q); return {it,s,via}; })
.filter(x=>x.s<9).sort((a,b)=> a.s-b.s || a.it.rank-b.it.rank).slice(0,8); }
function attach(input, listEl, opts){
opts=opts||{}; let current=[], active=-1, open=false;
function close(){ open=false; active=-1; listEl.classList.remove('open'); input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); }
function render(){
const q=norm(input.value.trim()); active=-1;
if(!q){ current=[]; close(); return; }
current=search(input.value);
listEl.innerHTML = current.length ? current.map((x,i)=>
'<li class="rv-opt" role="option" id="rvOpt'+i+'" data-i="'+i+'">'
+'<div class="rv-r1"><span class="rv-lbl">'+highlight(x.it.label,q)+'</span>'
+'<span class="rv-chip">'+esc(x.it.category)+'</span></div>'
+(x.via?'<div class="rv-via">Matched: “<b>'+highlight(x.via,q)+'</b>”</div>':'')
+'<div class="rv-desc">'+esc(x.it.description)+'</div></li>'
).join('') :'<li class="rv-none">No match — this reason will be saved as entered.</li>';
open=true; listEl.classList.add('open'); input.setAttribute('aria-expanded','true');
}
function choose(i){ const x=current[i]; if(!x) return; input.value=x.it.label; if(opts.onSelect) opts.onSelect(x.it); close(); }
let wait=0;   /* PVX-N213: suggestions after two letters, or a short pause on one (HIG Token fields) */
input.addEventListener('input', function(){ if(opts.onInput) opts.onInput(input.value); clearTimeout(wait);
  const n=input.value.trim().length; if(n===1){ close(); wait=setTimeout(function(){ if(input.value.trim().length===1&&document.activeElement===input) render(); },400); } else render(); });
input.addEventListener('focus', function(){ if(input.value.trim()) render(); });
input.addEventListener('keydown', function(e){
const els=listEl.querySelectorAll('li.rv-opt');
if(e.key==='ArrowDown'){ if(!open && input.value.trim()){ render(); return; } active=Math.min(active+1, els.length-1); }
else if(e.key==='ArrowUp'){ active=Math.max(active-1, 0); }
else if(e.key==='Enter'){ if(open && active>=0 && els.length){ e.preventDefault(); choose(active); } return; }
else if(e.key==='Escape'){ if(open){ e.preventDefault(); close(); } return; }
else return;
e.preventDefault();
els.forEach((o,i)=> o.classList.toggle('active', i===active));
if(active>=0) input.setAttribute('aria-activedescendant','rvOpt'+active);
if(els[active]) els[active].scrollIntoView({block:'nearest'});
});
listEl.addEventListener('mousedown', function(e){ const li=e.target.closest('li.rv-opt'); if(li){ e.preventDefault(); choose(+li.dataset.i); } });
if(!attach._away){ attach._away=true; document.addEventListener('click', function(e){ if(!e.target.closest('.rv-combo')) document.querySelectorAll('.rv-list.open').forEach(l=>l.classList.remove('open')); }); }
return { close:close, render:render };
}
return { search:search, attach:attach };
})();

let apWeightKg=null;



const _rn = s => String(s||'').toLowerCase().replace(/['’]/g,'');

(function(){
try{
const ne=REASON_VISIT_DATA.find(x=>x.id==='not-eating');
if(ne){ ne.id='anorexia'; ne.label='Anorexia';
ne.keywords=['not eating','wont eat','no appetite','hasnt eaten','stopped eating','refusing food','anorexia','not eaten'].concat(ne.keywords||[]); }
if(!REASON_VISIT_DATA.some(x=>x.id==='hyporexia'))
REASON_VISIT_DATA.push({ id:'hyporexia', rank:4.5, label:'Hyporexia', category:'General & Systemic',
keywords:['barely eating','eating less','poor appetite','reduced appetite','decreased appetite','picky','not eating much','eating a little','hyporexia'],
description:'Reduced or partial appetite — eating less than normal'});
const vo=REASON_VISIT_DATA.find(x=>x.id==='vomiting'); if(vo){ ['vomited','threw up','puked','vomits','throwing up'].forEach(function(k){ if(vo.keywords.indexOf(k)<0) vo.keywords.push(k); }); }
const co=REASON_VISIT_DATA.find(x=>x.id==='persistent-cough'); if(co){ ['cough','coughs','coughed'].forEach(function(k){ if(co.keywords.indexOf(k)<0) co.keywords.push(k); }); }
const an=REASON_VISIT_DATA.find(x=>x.id==='anorexia'); if(an){ ['will not eat','has not eaten','refuses food','food refusal','not touching food','no interest in food','no interest in treats','wont take treats','not taking treats','didnt eat','off food','off feed','inappetence','anorexic','loss of appetite'].forEach(function(k){ if(an.keywords.indexOf(k)<0) an.keywords.push(k); }); }

const bu=REASON_VISIT_DATA.find(x=>x.id==='blood-in-urine'); if(bu){ bu.id='hematuria'; bu.label='Hematuria';
['bloody urine','blood in urine','blood when peeing','blood when urinating','peeing blood','urinating blood','red urine','pink urine','urine looks bloody','blood from urine','hematuria','haematuria'].forEach(function(k){ if(bu.keywords.indexOf(k)<0) bu.keywords.push(k); }); }
function _addReason(o){ if(!REASON_VISIT_DATA.some(x=>x.id===o.id)) REASON_VISIT_DATA.push(o); }
_addReason({ id:'bleeding-ruptured-mass', rank:79.5, label:'Bleeding / Ruptured Mass', category:'Dermatologic / Mass',
keywords:['mass on head popped','mass popped','popped lump','popped tumor','mass burst','mass ruptured','ruptured mass','ruptured lump','bleeding mass','mass bleeding','growth bleeding','bleeding growth','tumor bleeding','bleeding tumor','lump bleeding','bleeding lump','mass opened','mass broke open','growth opened','tumor opened','ulcerated mass','open mass'],
description:'A mass, lump, growth, or tumor that has ruptured, opened, ulcerated, or is actively bleeding'});
_addReason({ id:'urinary-tract-signs', rank:25.5, label:'Urinary Tract Signs', category:'Urinary',
keywords:['poss uti','possible uti','uti','urinary infection','possible urinary infection','urinary issue','urinary problem','urinary symptoms','frequent urination','peeing frequently','peeing a lot','peeing','urinating','urinating frequently','straining to urinate','straining to pee','difficulty urinating','difficulty peeing','painful urination','pain when urinating','urinary accidents','peeing in house','urinating in house','small amounts of urine','frequent small urinations','urinary discomfort'],
description:'Urinary signs such as straining, frequency, inappropriate urination, discomfort, or suspected urinary tract disease'});
_addReason({ id:'suspected-toxin-exposure', rank:16.5, label:'Suspected Toxin Exposure', category:'Toxicology',
keywords:['toxicity','toxin','toxic exposure','possible toxin','suspected toxin','poison','poisoning','poisoned','possible poisoning','ate something toxic','ingested toxin','toxin ingestion','toxic ingestion','possible ingestion','got into something','got into medication','ate medication','ate poison','chemical exposure','toxic substance','possible toxic substance'],
description:'Known or suspected exposure to a potentially toxic substance'});
}catch(e){}
})();

const EPISODE_LABEL_IDS=new Set(['seizures','collapse-fainting','diarrhea','bloody-diarrhea','tremors-shaking','fall-from-height']);


const REASON_NORMALIZE=[
{ id:'hyporexia', label:'Hyporexia', category:'General & Systemic',
re:[/barely (eating|eaten)/,/eating less/,/eats less/,/poor appetite/,/reduced appetite/,/decreased appetite/,/low appetite/,/\bpicky/,/not eating much/,/eating a little/,/hardly eating/,/eating poorly/,/hyporexi/] },
{ id:'anorexia', label:'Anorexia', category:'General & Systemic',
re:[/not eating/,/not eaten/,/not been eating/,/wont eat/,/will not eat/,/no appetite/,/hasnt eaten/,/has not eaten/,/stopped eating/,/quit eating/,/refus\w* (to )?eat/,/wont touch food/,/anorexi/,/loss of appetite/,/off (his |her |their )?(food|feed)/,/inappeten/] },

{ id:'bleeding-ruptured-mass', label:'Bleeding / Ruptured Mass', category:'Dermatologic / Mass',
re:[/(mass|tumou?r|growth|lump|nodule)\b[\s\S]*(bleed|ruptur|popp|burst|broke open|broke|opened|open|ulcerat|drain)/,
/(bleed|ruptur|popp|burst|ulcerat)[\s\S]*(mass|tumou?r|growth|lump|nodule)/] },


{ id:'suspected-toxin-exposure', label:'Suspected Toxin Exposure', category:'Toxicology',
re:[/^toxicity$/,/^toxin$/,/^toxic exposure$/,/^possible toxin$/,/^suspected toxin$/,/^poison$/,/^poisoned$/,/^poisoning$/,/^possible poisoning$/,/^chemical exposure$/,/^ate something toxic$/,/^got into something$/,/^toxic substance$/] }
];
function normalizeReason(sym){ const t=_rn(sym); for(const r of REASON_NORMALIZE){ if(r.re.some(rx=>rx.test(t))) return r; } return null; }
function _durUnit(u){ u=u.toLowerCase();
if(/^(h|hr|hrs|hour|hours)$/.test(u)) return'hours';
if(/^(d|day|days)$/.test(u)) return'days';
if(/^(w|wk|wks|week|weeks)$/.test(u)) return'weeks';
if(/^(min|mins|minute|minutes)$/.test(u)) return'minutes';
if(/^(mo|mos|month|months)$/.test(u)) return'months';
if(/^(y|yr|yrs|year|years)$/.test(u)) return'years';
return u; }
function _durText(v,u){ const sing={hours:'hour',days:'day',weeks:'week',minutes:'minute',months:'month',years:'year'}[u]||u; return v+' '+(v===1? sing : u); }
const _WORDNUM={once:1,twice:2,thrice:3,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};


function parseModifiers(raw){
const orig=String(raw||''); let w=orig.toLowerCase(); const ranges=[];
function take(re){ const m=w.match(re); if(m){ const i=m.index; ranges.push([i,i+m[0].length]); w=w.slice(0,i)+' '.repeat(m[0].length)+w.slice(i+m[0].length); } return m; }
let durationValue=null,durationUnit=null,durationText=null, freqCount=null,freqText=null, onsetText=null, m;

m=take(/\bsince\s+(?:this (?:morning|afternoon|evening|night)|last (?:night|week|weekend|month)|yesterday|tonight|midnight|noon|monday|tuesday|wednesday|thursday|friday|saturday|sunday|[a-z]+day)\b/);
if(!m) m=take(/\b(?:overnight|last night|this (?:morning|afternoon|evening)|today|tonight|all day|all night|all morning|this week)\b/);
if(m) onsetText=orig.slice(m.index, m.index+m[0].length).trim();

m=take(/\b(\d+)\s*(?:x\b|times\b|time\b|episodes?\b|bouts?\b|epis\b)/);
if(m){ freqCount=parseInt(m[1],10); }
if(freqCount==null){ m=take(/\bx\s*(\d+)(?!\s*(?:h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|mo|month|months|y|yr|year|years|min|minute|minutes)\b)/); if(m) freqCount=parseInt(m[1],10); }
if(freqCount==null){ m=take(/\b(once|twice|thrice)\b/); if(m) freqCount=_WORDNUM[m[1]]; }
if(freqCount==null){ m=take(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+times?\b/); if(m) freqCount=_WORDNUM[m[1]]; }
if(freqCount==null){ m=take(/\b(several|multiple|many|numerous|a few|a couple|couple)\s+times?\b/); if(m) freqText=(m[1]+' times'); }

m=take(/\b(?:for\s+|x)?(\d+)\s*(h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|min|mins|minute|minutes|mo|mos|month|months|y|yr|yrs|year|years)\b/);
if(m){ durationValue=parseInt(m[1],10); durationUnit=_durUnit(m[2]); durationText=_durText(durationValue,durationUnit); }
if(durationText==null){ m=take(/\b(?:for\s+)?a few\s+(minutes|mins|hours|hrs|days|weeks|months)\b/); if(m){ const u=_durUnit(m[1]); durationUnit=u; durationText='a few '+u; } }

ranges.sort((a,b)=>a[0]-b[0]); let rem='', idx=0;
ranges.forEach(function(r){ if(r[0]>idx) rem+=orig.slice(idx,r[0]); idx=Math.max(idx,r[1]); });
rem+=orig.slice(idx);
rem=rem.replace(/\s+/g,' ').replace(/\b(for|x)\b\s*$/i,'').replace(/^[\s,;:-]+/,'').replace(/[\s,;:-]+$/,'').trim();
return { durationValue, durationUnit, durationText, freqCount, freqText, onsetText, remaining:rem };
}
function _freqUnit(id){ return EPISODE_LABEL_IDS.has(id) ?'episodes':'times'; }
function makeProblem(id,label,category,mods,original){
return { id:id||null, label:label, category:category||null,
durationValue:mods.durationValue, durationUnit:mods.durationUnit, durationText:mods.durationText,
frequencyCount:(mods.freqCount==null?null:mods.freqCount), frequencyLabel:(mods.freqCount==null?null:_freqUnit(id)),
frequencyText:mods.freqText||null, onsetText:mods.onsetText||null, originalInput:original };
}
/* PVX-N213: a token stands for what was typed - a word becomes a named problem only on a label, a label part,
   a whole keyword or a known form of one (collapsed / collapse, fainted / fainting); a prefix only suggests */
const _RV_FILL=new Set(['a','an','the','he','she','it','they','his','her','its','my','our','their','is','was','has','had','have','been','be','very','really','some','just','and','or','with','of','to','in','on','at','for','from','when','while','that','this','after','before','now','still','also','again','being','got','getting','keeps','kept','seems','seem','started','starting','lot','bit']);
function _rvWords(s){ return _rn(s).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean); }
function _rvStem(w){ for(const x of ['ing','ed','es','ic','y','s','e']){ if(w.length-x.length>=4&&w.endsWith(x)) return w.slice(0,-x.length); } return w; }
function _rvCore(s){ return _rvWords(s).filter(w=>!_RV_FILL.has(w)).map(_rvStem).join(' '); }
function _rvCands(it){ return [it.label].concat(String(it.label).split(/\s*\/\s*/)).concat(it.keywords||[]); }
function _rvScore(sym,it){ const qc=_rvCore(sym); if(!qc) return 0; let best=0; const whole=[it.label].concat(it.keywords||[]);
  _rvCands(it).forEach(function(c){ const cc=_rvCore(c); if(cc&&cc===qc) best=Math.max(best,1000+cc.length); });   /* the whole entry, any label part */
  whole.forEach(function(c){ const cc=_rvCore(c); if(cc&&cc.length>=4&&qc.indexOf(cc+' ')===0) best=Math.max(best,cc.length); });   /* starts with a whole label or keyword */
  return best; }
function isConfidentReason(sym, item){ return _rvScore(sym,item)>0; }
function findConfidentReason(sym){ let best=null, bs=0; for(const it of REASON_VISIT_DATA){ const sc=_rvScore(sym,it); if(sc>bs){ bs=sc; best=it; } } return best; }
/* the typed words the match didn't use stay on the token */
function _rvExtra(sym, vocab){ const used=new Set(); (vocab||[]).forEach(function(t){ _rvWords(t).forEach(function(w){ used.add(_rvStem(w)); }); });
  const bare=w=>_rn(w).replace(/[^a-z0-9]+/g,'');
  const all=String(sym).replace(/[,;:]+/g,' ').split(/\s+/).filter(Boolean), first=all.findIndex(function(w){ const n=bare(w); return n&&used.has(_rvStem(n)); });
  const before=all.slice(0,Math.max(0,first)).some(function(w){ const n=bare(w); return n&&!_RV_FILL.has(n); });
  const keep=all.filter(function(w){ const n=bare(w); return n&&!used.has(_rvStem(n)); });
  while(keep.length&&_RV_FILL.has(bare(keep[0]))) keep.shift();
  while(keep.length&&_RV_FILL.has(bare(keep[keep.length-1]))) keep.pop();
  const hits=all.filter(function(w){ const n=bare(w); return n&&!_RV_FILL.has(n)&&used.has(_rvStem(n)); }).length, rest=keep.filter(function(w){ return !_RV_FILL.has(bare(w)); }).length;
  return keep.length?{text:keep.join(' '),before:before||rest>hits}:null; }   /* more left over than matched: keep the typed words */

function matchByAlias(sym){
const q=' '+_rn(sym).replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()+' ';
let best=null, bestLen=0;
for(const it of REASON_VISIT_DATA){
const cands=[it.label].concat(it.keywords||[]);
for(const c of cands){ const cc=_rn(c).replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
if(cc.length<3) continue;
if(q.indexOf(' '+cc+' ')>=0 && cc.length>bestLen){ best=it; bestLen=cc.length; } }
}
return best ? { item:best, len:bestLen } : null;
}

function parseProblem(raw){
const original=String(raw).trim();
const mods=parseModifiers(original);
const sym=(mods.remaining||original).trim();
function made(id,label,cat,vocab){ const pr=makeProblem(id,label,cat,mods,original), ex=_rvExtra(sym,vocab);   /* PVX-N213: nothing typed is dropped */
  if(ex){ if(/^\d+$/.test(ex.text)&&pr.frequencyCount==null){ pr.frequencyCount=+ex.text; pr.frequencyLabel=_freqUnit(id); }   /* "3 seizures" */
    else if(ex.before) pr.typedLabel=sym;   /* "trying to vomit": the token keeps the typed words (still filed under the problem) */
    else pr.extra=ex.text; }
  return pr; }
const norm=normalizeReason(sym);
if(norm){ const t=_rn(sym); let span=''; for(const rx of norm.re){ const m=t.match(rx); if(m){ span=m[0]; break; } } return made(norm.id,norm.label,norm.category,[norm.label,span]); }
const hit=findConfidentReason(sym);
if(hit) return made(hit.id,hit.label,hit.category,_rvCands(hit));
/* a loose phrase match never goes through a negation ("not vomiting" stays as typed) */
if(!/\b(no|not|never|without|isnt|hasnt|doesnt|didnt|denies)\b/.test(_rn(sym))){
const am=matchByAlias(sym);
if(am){ const symN=_rn(sym); const cov=am.len/Math.max(1,symN.length); const words=symN.split(/\s+/).filter(Boolean).length;
if(cov>=0.5 || words<=4){ const it=am.item; return made(it.id,it.label,it.category,_rvCands(it)); } }
}
return makeProblem(null,(sym||original),null,mods,original);
}



/* PVX-N213: only true modifiers stay with the problem before; complaints of their own (lethargic, limping, weak) split */
const _SPLIT_STOP=new Set(['bleeding','bloody','painful','pain','swollen','hot','red','open','ruptured','popped','draining','oozing','sore','itchy','worse','worsening']);
function _rvModOnly(p){ const r=parseModifiers(p).remaining.trim(); if(!r) return true; const w=_rvWords(r); return w.length===1&&_SPLIT_STOP.has(w[0])&&!findConfidentReason(r)&&!normalizeReason(r); }
function splitComplaints(raw){
const s=String(raw||'').replace(/\bv\s*\+/gi,' ; vomiting ; ').replace(/\s+&\s+/g,' ; ');
const base=s.split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);
const out=[];
base.forEach(function(seg0){
  /* commas: a part that is a problem of its own starts a new token; "3 times", "since this morning", "bloody" stay */
  const segs=[]; let lead='';
  seg0.split(/\s*,\s*/).filter(Boolean).forEach(function(c){
    if(_rvModOnly(c)){ if(segs.length) segs[segs.length-1]+=', '+c; else lead+=(lead?', ':'')+c; }
    else { segs.push(lead?lead+', '+c:c); lead=''; } });
  if(lead){ if(segs.length) segs[segs.length-1]+=', '+lead; else segs.push(lead); }
  segs.forEach(function(seg){
    const parts=seg.split(/\s+\b(?:and|plus)\b\s+/i);
    if(parts.length>1){ if(parts.some(_rvModOnly)) out.push(seg); else parts.forEach(function(p){ if(p.trim()) out.push(p.trim()); }); }
    else out.push(seg);
  });
});
return out.length?out:[String(raw).trim()];
}

function formatProblem(pr){
const parts=[pr.typedLabel||pr.label]; if(pr.extra) parts.push(pr.extra);   /* PVX-N213: the typed words the match didn't use */
if(pr.frequencyCount!=null){ const u=pr.frequencyLabel||'times'; parts.push(pr.frequencyCount+' '+(pr.frequencyCount===1? u.replace(/s$/,'') : u)); }
else if(pr.frequencyText){ parts.push(pr.frequencyText); }
if(pr.durationText) parts.push(pr.durationText);
if(pr.onsetText) parts.push(pr.onsetText);
return parts.join(' · ');
}
function problemsToString(arr){ return (arr||[]).map(formatProblem).join('; '); }
function compactMod(pr){
if(pr.frequencyCount!=null) return pr.frequencyCount+(pr.frequencyLabel==='episodes'?'ep':'×');
if(pr.durationValue && pr.durationUnit){ const sh={hours:'h',days:'d',weeks:'w',minutes:'m',months:'mo',years:'y'}[pr.durationUnit]; if(sh) return pr.durationValue+sh; }
if(pr.durationText) return pr.durationText;
if(pr.frequencyText) return pr.frequencyText;
if(pr.onsetText) return pr.onsetText;
return'';
}
function compactProblems(p){ const a=p&&p.reasonProblems; if(!a||!a.length) return (p&&p.reason)||''; const f=a[0]; const mod=compactMod(f); let s=f.label+(mod?(' · '+mod):''); if(a.length>1) s+=' +'+(a.length-1); return s; }

 
let apProblems=[], _rvCtrl=null, _rpBackspaceArmed=false, _rpLastRaw='';
let apReviewIntakeId=null;
function focusReasonInput(){ const i=document.getElementById('apReason'); if(i) try{ i.focus(); }catch(e){} }
let _rpSel=-1;   /* PVX-N213: the selected token (while _rpBackspaceArmed) */
/* renderProblemChips · its layers, innermost first: 1 #57 after   (PVX-N387; kept true by flow_t387) */
function renderProblemChips(){ return pvxRun('renderProblemChips',renderProblemChips$base,this,arguments); }
function renderProblemChips$base(){
const wrap=document.getElementById('apProblemsChips'); if(!wrap) return;
if(!_rpBackspaceArmed||_rpSel<0||_rpSel>=apProblems.length){ if(_rpBackspaceArmed&&apProblems.length) _rpSel=apProblems.length-1; else { _rpSel=-1; _rpBackspaceArmed=false; } }
wrap.setAttribute('role','list'); wrap.setAttribute('aria-label','Problems');
wrap.innerHTML = apProblems.map(function(pr,i){
const t=formatProblem(pr), armed=(_rpBackspaceArmed&&i===_rpSel)?' armed':'';
const o=String(pr.originalInput||''), tip=(o&&_rn(o).replace(/[^a-z0-9]+/g,'')!==_rn(t).replace(/[^a-z0-9]+/g,''))?'Edit · typed “'+o+'”':'Edit';   /* PVX-N364 */
return'<span class="rvp-chip'+armed+'" role="listitem" data-i="'+i+'"><button type="button" class="rvp-chip-t" data-i="'+i+'" title="'+bcEsc(tip)+'" aria-label="Edit '+bcEsc(t)+'">'+bcEsc(t)+'</button>'
+'<button type="button" class="rvp-chip-x" data-i="'+i+'" aria-label="Remove '+bcEsc(t)+'" title="Remove"><svg viewBox="0 0 24 24" aria-hidden="true" class="rvp-x-ic"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg></button></span>';
}).join('');
wrap.querySelectorAll('.rvp-chip-x').forEach(function(b){ b.onclick=function(){ rpRemove(+b.dataset.i); }; });
wrap.querySelectorAll('.rvp-chip-t').forEach(function(b){ b.onclick=function(){ rpEdit(+b.dataset.i); }; });
wrap.style.display = apProblems.length ?'flex':'none';
}
function rpSay(msg){ let l=document.getElementById('apTokLive'); if(!l){ l=document.createElement('div'); l.id='apTokLive'; l.className='pvx-vh'; l.setAttribute('role','status'); document.body.appendChild(l); }
l.textContent=''; setTimeout(function(){ l.textContent=msg; },40); }
function rpRemove(i){ const pr=apProblems[i]; if(!pr) return; const t=formatProblem(pr); apProblems.splice(i,1); _rpBackspaceArmed=false; renderProblemChips(); focusReasonInput(); rpSay('Removed '+t); }
function rpEdit(i){ const pr=apProblems[i]; if(!pr) return; const input=document.getElementById('apReason'); if(!input) return;
const t=formatProblem(pr); apProblems.splice(i,1); _rpBackspaceArmed=false; renderProblemChips();
input.value=pr.originalInput||t; _rpLastRaw=input.value; focusReasonInput(); try{ input.setSelectionRange(input.value.length,input.value.length); }catch(e){}
rpSay('Editing '+t); }
function rpMove(i,d){ const j=i+d; if(i<0||j<0||j>=apProblems.length) return; const pr=apProblems[i]; apProblems.splice(i,1); apProblems.splice(j,0,pr);   /* PVX-N364 */
  if(_rpBackspaceArmed) _rpSel=j; renderProblemChips(); const t=formatProblem(pr); rpSay(t+' moved '+(d<0?'earlier':'later')+', '+(j+1)+' of '+apProblems.length+(j===0?', now the main reason':''));
  if(!_rpBackspaceArmed){ const b=document.querySelector('#apProblemsChips .rvp-chip-t[data-i="'+j+'"]'); if(b) try{ b.focus(); }catch(e){} } }
function rpSaySel(){ const pr=apProblems[_rpSel]; if(pr) rpSay(formatProblem(pr)+' selected, '+(_rpSel+1)+' of '+apProblems.length+'. Backspace removes it, Return edits it'+(apProblems.length>1?', '+((window.PvxKeys&&!PvxKeys.mac)?'Alt':'Option')+' and an arrow move it.':'.')); }
/* addProblem · its layers, innermost first: 1 #55 wrap   (PVX-N387; kept true by flow_t387) */
function addProblem(item){ return pvxRun('addProblem',addProblem$base,this,arguments); }
function addProblem$base(item){
const input=document.getElementById('apReason'); if(!input) return;

const raw = item ? (_rpLastRaw || input.value.trim()) : input.value.trim();
let prob;
if(item){ const mods=parseModifiers(raw); apProblems.push(makeProblem(item.id,item.label,item.category,mods,raw||item.label)); }
else { if(!raw) return; splitComplaints(raw).forEach(function(seg){ apProblems.push(parseProblem(seg)); }); }
input.value=''; _rpLastRaw=''; _rpBackspaceArmed=false;
if(_rvCtrl) _rvCtrl.close();
renderProblemChips(); focusReasonInput();
}
function ensureReasonAutocomplete(){
if(_rvCtrl) return;
const input=document.getElementById('apReason'), listEl=document.getElementById('rvList');
if(!input || !listEl) return;
_rvCtrl=ReasonVisitAutocomplete.attach(input, listEl, {
onSelect:function(it){ addProblem(it); },
onInput:function(v){ _rpBackspaceArmed=false; _rpLastRaw=v; }
});

input.addEventListener('keydown', function(e){   /* PVX-N213: select, edit and remove tokens from the keyboard */
if((e.key==='Enter'|| e.key===';') && !e.defaultPrevented){
if(input.value.trim()){ e.preventDefault(); addProblem(null); return; }
if(e.key==='Enter'&&_rpBackspaceArmed&&_rpSel>=0){ e.preventDefault(); rpEdit(_rpSel); }
return;
}
if(input.value===''&&apProblems.length){
if(e.key==='Backspace'||e.key==='Delete'){ e.preventDefault(); if(_rpBackspaceArmed) rpRemove(_rpSel); else if(e.key==='Backspace'){ _rpBackspaceArmed=true; _rpSel=apProblems.length-1; renderProblemChips(); rpSaySel(); } return; }
if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.altKey&&_rpBackspaceArmed&&_rpSel>=0){ e.preventDefault(); rpMove(_rpSel,e.key==='ArrowLeft'?-1:1); return; }   /* PVX-N364: ⌥← ⌥→ move the selected problem */
if(e.key==='ArrowLeft'){ e.preventDefault(); if(!_rpBackspaceArmed){ _rpBackspaceArmed=true; _rpSel=apProblems.length-1; } else _rpSel=Math.max(0,_rpSel-1); renderProblemChips(); rpSaySel(); return; }
if(e.key==='ArrowRight'&&_rpBackspaceArmed){ e.preventDefault(); if(_rpSel<apProblems.length-1){ _rpSel++; renderProblemChips(); rpSaySel(); } else { _rpBackspaceArmed=false; renderProblemChips(); } return; }
if(e.key==='Escape'&&_rpBackspaceArmed){ e.preventDefault(); e.stopPropagation(); _rpBackspaceArmed=false; renderProblemChips(); return; }
}
if(_rpBackspaceArmed&&['Shift','Alt','Meta','Control','Tab'].indexOf(e.key)<0){ _rpBackspaceArmed=false; renderProblemChips(); }
});
}

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
notify(bcEsc(full)+' added successfully',
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




const FLOW_TRANSLATE_ENDPOINT = (typeof window!=='undefined'&& window.PRAVIX_TRANSLATE_URL) ||'';
const LANG_EN_NAME = {en:'English',fr:'French',es:'Spanish',zh:'Chinese',pt:'Portuguese',ja:'Japanese',ru:'Russian',ko:'Korean',ar:'Arabic'};
function langEnglishName(code){ return LANG_EN_NAME[String(code||'').toLowerCase().slice(0,2)] || (code||'their language'); }



const SPECIES_EN = {canine:'Canine', feline:'Feline', other:'Other'};
function speciesEnglish(v){ if(v==null||v==='') return''; const k=String(v).toLowerCase().trim();
if(SPECIES_EN[k]) return SPECIES_EN[k];
const legacy={canino:'Canine',perro:'Canine',dog:'Canine','cão':'Canine',chien:'Canine',
felino:'Feline',gato:'Feline',cat:'Feline',chat:'Feline', otro:'Other',outro:'Other',autre:'Other',other:'Other'};
return legacy[k] || v; }


const SEX_CANON_LABEL = { male_neutered:'Male (Neutered)', female_spayed:'Female (Spayed)',
male_intact:'Male (Intact)', female_intact:'Female (Intact)', unknown:'Unknown', male:'Male', female:'Female'};
function normalizeSexValue(v){
if(v==null) return'';
let s=String(v).toLowerCase().trim(); if(!s) return'';
s=s.replace(/[—–\-]/g,' ').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();
const map={
'mn':'male_neutered','fs':'female_spayed','mi':'male_intact','fi':'female_intact','unknown':'unknown','unk':'unknown','u':'unknown',
'male neutered':'male_neutered','neutered male':'male_neutered','castrated male':'male_neutered','male castrated':'male_neutered','male castrado':'male_neutered',
'female spayed':'female_spayed','spayed female':'female_spayed',
'male intact':'male_intact','intact male':'male_intact','male entire':'male_intact','entire male':'male_intact',
'female intact':'female_intact','intact female':'female_intact','female entire':'female_intact','entire female':'female_intact',
'male':'male','female':'female','m':'male','f':'female',
'macho castrado':'male_neutered','hembra esterilizada':'female_spayed','macho entero':'male_intact','hembra entera':'female_intact',
'macho':'male','hembra':'female','desconocido':'unknown'
};
if(map[s]) return map[s];
if(SEX_CANON_LABEL[s.replace(/ /g,'_')]) return s.replace(/ /g,'_');
return s;
}
 
function getSexDisplayLabel(v){ const c=normalizeSexValue(v); return SEX_CANON_LABEL[c] || (v==null?'':String(v)); }
function sexEnglish(v){ return getSexDisplayLabel(v); }



const TranslationService = (function(){
// Clinical intake narratives are confidential. A public machine translation
// endpoint MUST NOT receive a pet's symptoms, complaint or medical history.
// The only permitted integration is an explicitly configured HTTPS endpoint
// on the SAME Pravix origin, where approved server controls can enforce
// authentication, audit and data-processing restrictions.
function endpoint(){
  const configured=(typeof window!=='undefined'&&window.PRAVIX_TRANSLATE_URL) || FLOW_TRANSLATE_ENDPOINT || '';
  if(!configured) return '';
  try{
    const base=new URL(window.location.href);
    const target=new URL(configured,base);
    if(base.protocol!=='https:' || target.protocol!=='https:' || target.origin!==base.origin)
      return '';
    if(target.username || target.password || target.search || target.hash) return '';
    return target.href;
  }catch(_){return '';}
}
async function _fetchT(url, opts){
const ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
const timer=ctrl?setTimeout(()=>ctrl.abort(),12000):null;
try{ return await fetch(url, Object.assign({}, opts, ctrl?{signal:ctrl.signal}:{}, {cache:'no-store',credentials:'same-origin'})); }
finally{ if(timer) clearTimeout(timer); }
}
async function _viaEndpoint(url, list, source){
const resp=await _fetchT(url,{ method:'POST', headers:{'Content-Type':'application/json'},
body:JSON.stringify({ texts:list, source:source||null, target:'en'}) });
if(!resp.ok){ const err=new Error('translation http '+resp.status);err.code='http_'+resp.status;throw err; }
const data=await resp.json();
const out=data.translations||data.data||[];
if(!Array.isArray(out) || out.length!==list.length){ const err=new Error('translation shape mismatch');err.code='bad_response';throw err; }
return { translations:out.map(x=>String(x==null?'':x)),
detectedSourceLanguage:data.detectedSourceLanguage||data.detected||source||null,
provider:data.provider||'private-translation',model:data.model||null };
}
async function translateBatch(texts, source){
const list=(texts||[]).map(t=>t==null?'':String(t));
if(!list.length) return {translations:[],detectedSourceLanguage:source||null,provider:'none',model:null};
const url=endpoint();
if(!url){
  // The existing intake UI displays the unchanged original and a warning.
  // It must NOT silently retry through public Google/MyMemory endpoints.
  const err=new Error('Approved private translation is not configured');
  err.code='translation_not_configured';throw err;
}
return _viaEndpoint(url,list,source);
}
async function translateToEnglish(text,source){
const r=await translateBatch([text],source);
return { translatedText:r.translations[0]||'',sourceLanguage:r.detectedSourceLanguage||source||null,provider:r.provider,model:r.model };
}
return {translateBatch,translateToEnglish,endpoint};
})();

const _t9nPromises = {};
function intakeSourceLang(r){ return String((r&&r.sourceLanguage)||'en').toLowerCase().slice(0,2)||'en'; }
function intakeNeedsT9n(r){ return r && intakeSourceLang(r)!=='en'&& !(r.t9n && r.t9n.status); }


function intakeEnglishReason(r){
if(r && r.t9n && (r.t9n.status==='translated'||r.t9n.status==='failed')){
const parts=[]; if(r.t9n.reason && r.t9n.reason.english) parts.push(r.t9n.reason.english);
(r.t9n.additional||[]).forEach(a=>{ if(a && a.english) parts.push(a.english); });
if(parts.length) return parts.join('. ');
}
return [ (r&&r.reason)||''].concat((r&&r.additionalProblems)||[]).filter(Boolean).join('. ');
}
function intakeOriginalReason(r){
return [ (r&&r.reason)||''].concat((r&&r.additionalProblems)||[]).filter(Boolean).join('. ');
}


function ensureIntakeTranslated(id){
const cur=FlowIntakeStore.getIntake(id);
if(!cur) return Promise.resolve(null);
if(cur.t9n && cur.t9n.status) return Promise.resolve(cur);
if(_t9nPromises[id]) return _t9nPromises[id];
const src=intakeSourceLang(cur);
const stamp=new Date().toISOString();
if(src==='en'){
FlowIntakeStore.updateIntake(id,{ t9n:{ status:'not_needed', sourceLanguage:'en', at:stamp } });
return Promise.resolve(FlowIntakeStore.getIntake(id));
}
const texts=[ cur.reason||''].concat(cur.additionalProblems||[]);
const p=(async()=>{
try{
const res=await TranslationService.translateBatch(texts, src);
const eng=res.translations||[];
FlowIntakeStore.updateIntake(id,{ t9n:{
status:'translated', sourceLanguage:res.detectedSourceLanguage||src,
provider:res.provider||'public', model:res.model||null, at:stamp,
reason:{ original:cur.reason||'', english:eng[0]||''},
additional:(cur.additionalProblems||[]).map((o,i)=>({ original:o, english:eng[i+1]||''}))
}});
}catch(e){
const code=(e&&e.code)||'error';
FlowIntakeStore.updateIntake(id,{ t9n:{
status:'failed', reasonCode:code, sourceLanguage:src, at:stamp,
reason:{ original:cur.reason||'', english:cur.reason||''},
additional:(cur.additionalProblems||[]).map(o=>({ original:o, english:o }))
}});
}
return FlowIntakeStore.getIntake(id);
})();
_t9nPromises[id]=p;
if(p.finally) p.finally(()=>{ delete _t9nPromises[id]; }); else p.then(()=>{ delete _t9nPromises[id]; },()=>{ delete _t9nPromises[id]; });
return p;
}


function translatePendingIntakes(){
try{ FlowIntakeStore.getPendingIntakes().forEach(r=>{ if(intakeNeedsT9n(r) && !_t9nPromises[r.id]) ensureIntakeTranslated(r.id); }); }catch(e){}
}


function t9nEnglishText(t){ if(!t) return''; const parts=[]; if(t.reason&&t.reason.english) parts.push(t.reason.english); (t.additional||[]).forEach(a=>{ if(a&&a.english) parts.push(a.english); }); return parts.join('. '); }
function t9nOriginalText(t){ if(!t) return''; const parts=[]; if(t.reason&&t.reason.original) parts.push(t.reason.original); (t.additional||[]).forEach(a=>{ if(a&&a.original) parts.push(a.original); }); return parts.join('. '); }
function patientIntakeT9n(p){ return (p && (p.reasonTranslation || (p.clientIntake && p.clientIntake.t9n))) || null; }
function ownerHistoryCellHtml(p){
const t=patientIntakeT9n(p); if(!t || !t.status) return'';
if(t.status!=='translated'&& t.status!=='failed') return'';
const eng=t9nEnglishText(t), orig=t9nOriginalText(t); if(!orig) return'';
const note = t.status==='translated'
?'Translated from '+langEnglishName(t.sourceLanguage)+' · <button type="button" class="t9n-link" id="dOwnerHistToggle">View original</button>'
:'Translation unavailable — showing original text';
const body = t.status==='translated'? (eng||orig) : orig;
return'<div class="d-cell" style="grid-column:1/3"><div class="k">Owner History</div>'
+'<div class="v" style="font-size:0.8125rem;font-weight:600;line-height:1.5;white-space:pre-line">'+bcEsc(body)+'</div>'
+'<div class="t9n-note" id="dOwnerHistNote">'+note+'</div>'
+'<div class="v t9n-orig" id="dOwnerHistOrig" style="display:none;margin-top:4px;white-space:pre-line">'+bcEsc(orig)+'</div></div>';
}
function wireOwnerHistoryToggle(p){
const tog=document.getElementById('dOwnerHistToggle'), orig=document.getElementById('dOwnerHistOrig');
if(tog && orig){ tog.onclick=()=>{ const show=orig.style.display==='none'; orig.style.display=show?'':'none'; tog.textContent=show?'Hide original':'View original'; }; }
}



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
return'<div class="cq-card'+(flag?' flag':'')+'" data-cq="'+bcEsc(r.id)+'">'
+'<div class="cq-main"><div class="cq-name">'+bcEsc(pt.name||'Unnamed')+'</div>'
+(sp?'<div class="cq-sub">'+bcEsc(sp)+'</div>':'')
+(owner?'<div class="cq-owner">'+bcEsc(owner)+'</div>':'')
+(reason?'<div class="cq-reason">'+bcEsc(reason)+'</div>':'')
+'<div class="cq-time">Submitted '+bcEsc(intakeTimeAgo(r.submittedAt))+'</div></div>'
+'<div class="cq-right"><span class="cq-chip '+chip.cls+'">'+chip.label+'</span>'
+'<button class="cq-review" data-cqr="'+bcEsc(r.id)+'">Review</button></div></div>';
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



const CT_VET_HOSPITALS = [{"name":"Bethel Veterinary Hospital","town":"Bethel","county":"Fairfield","address":"25A Turkey Plain Rd, Bethel CT 06801","phone":"(203) 794-0247","type":"General practice"},{"name":"Bethel Village Square Animal Hospital","town":"Bethel","county":"Fairfield","address":"10 Elizabeth St Ste A, Bethel CT 06801","phone":"(203) 730-9800","type":"General practice"},{"name":"Danbury Animal Hospital (and Versatile Vets)","town":"Bethel","county":"Fairfield","address":"19 Stony Hill Rd, Bethel CT 06801","phone":"(203) 748-6430","type":"General practice"},{"name":"Veterinary Behavior Consultants","town":"Bethel","county":"Fairfield","address":"14 Ridgedale Rd, Bethel CT 06801","phone":"(845) 473-7406","type":"Specialty/referral"},{"name":"Ash Creek Animal Hospital & Spa","town":"Bridgeport","county":"Fairfield","address":"3290 Fairfield Ave, Bridgeport CT 06605","phone":"(203) 333-2195","type":"General practice"},{"name":"Black Rock Animal Hospital","town":"Bridgeport","county":"Fairfield","address":"2877 Fairfield Ave, Bridgeport CT 06605","phone":"(203) 366-5696","type":"General practice"},{"name":"Bridgeport Veterinary Hospital","town":"Bridgeport","county":"Fairfield","address":"2715 Main St, Bridgeport CT 06606","phone":"(203) 334-5548","type":"General practice"},{"name":"Brookside Veterinary Hospital","town":"Bridgeport","county":"Fairfield","address":"4540 Main St, Bridgeport CT 06606","phone":"(203) 374-6149","type":"General practice"},{"name":"Brookfield Animal Hospital","town":"Brookfield","county":"Fairfield","address":"329 Federal Rd, Brookfield CT 06804","phone":"(203) 775-3679","type":"General practice"},{"name":"Dunbarton Equine","town":"Brookfield","county":"Fairfield","address":"336 Federal Rd, Brookfield CT 06804","phone":"(203) 775-5561","type":"Equine/large animal"},{"name":"The Complete Cat Veterinary Clinic","town":"Brookfield","county":"Fairfield","address":"32 Old New Milford Rd, Brookfield CT 06804","phone":"(203) 775-5157","type":"General practice"},{"name":"Cat Clinic of Danbury (Feline Health Center)","town":"Danbury","county":"Fairfield","address":"30 Germantown Rd, Danbury CT 06810","phone":"(203) 748-2287","type":"General practice"},{"name":"Cutting Edge Veterinary Surgery, PC","town":"Danbury","county":"Fairfield","address":"260 Great Plain Rd, Danbury CT 06811","phone":"","type":"Specialty/referral"},{"name":"Mill Plain Veterinary Clinic","town":"Danbury","county":"Fairfield","address":"66 Mill Plain Rd, Danbury CT 06811","phone":"(203) 790-8387","type":"General practice"},{"name":"Noah's Ark Animal Hospital","town":"Danbury","county":"Fairfield","address":"44 Mill Plain Rd, Danbury CT 06811","phone":"(203) 743-9999","type":"General practice"},{"name":"Plumtrees Animal Hospital","town":"Danbury","county":"Fairfield","address":"65 Newtown Rd, Danbury CT 06810","phone":"(203) 748-8878","type":"General practice"},{"name":"VCA Northside Animal Hospital","town":"Danbury","county":"Fairfield","address":"21 Padanaram Rd, Danbury CT 06811","phone":"(203) 743-4521","type":"General practice"},{"name":"VIP Petcare Community Clinic","town":"Danbury","county":"Fairfield","address":"67 Newtown Rd, Danbury CT 06810","phone":"","type":"General practice"},{"name":"Park Animal Hospital","town":"Darien","county":"Fairfield","address":"168 Noroton Ave, Darien CT 06820","phone":"(203) 655-7795","type":"General practice"},{"name":"VCA Darien Animal Hospital","town":"Darien","county":"Fairfield","address":"1302 Post Rd, Darien CT 06820","phone":"(203) 655-1449","type":"General practice"},{"name":"Easton Veterinary Clinic","town":"Easton","county":"Fairfield","address":"796 Sport Hill Rd, Easton CT 06612","phone":"(203) 268-3304","type":"General practice"},{"name":"Aristokatz Veterinary Clinic for Cats","town":"Fairfield","county":"Fairfield","address":"636 Kings Highway East, Fairfield CT 06825","phone":"(203) 690-1099","type":"General practice"},{"name":"Bond Vet - Fairfield","town":"Fairfield","county":"Fairfield","address":"","phone":"","type":"General practice"},{"name":"Community Veterinary Clinic","town":"Fairfield","county":"Fairfield","address":"136 Fairfield Woods Rd, Fairfield CT 06825","phone":"(203) 372-2436","type":"General practice"},{"name":"Engelberg Kristy Animal Hospital","town":"Fairfield","county":"Fairfield","address":"181 Kings Highway East, Fairfield CT 06825","phone":"(203) 367-4475","type":"General practice"},{"name":"Fairfield Veterinary Hospital","town":"Fairfield","county":"Fairfield","address":"55 Ruane St, Fairfield CT 06824","phone":"(203) 256-1955","type":"General practice"},{"name":"Greenfield Animal Hospital","town":"Fairfield","county":"Fairfield","address":"212 Hillside Rd, Fairfield CT 06824","phone":"(203) 254-0700","type":"General practice"},{"name":"Highway Animal Hospital","town":"Fairfield","county":"Fairfield","address":"555 Kings Highway East, Fairfield CT 06825","phone":"(203) 366-6733","type":"General practice"},{"name":"Marcie Fallek DVM (holistic housecall practice)","town":"Fairfield","county":"Fairfield","address":"248 Alden St, Fairfield CT 06824","phone":"(203) 254-8642","type":"General practice"},{"name":"Southport Veterinary Center","town":"Fairfield","county":"Fairfield","address":"2131 Post Rd, Fairfield CT 06824","phone":"(203) 259-5295","type":"General practice"},{"name":"Blue Cross Animal Hospital","town":"Greenwich","county":"Fairfield","address":"530 E Putnam Ave, Greenwich CT 06830","phone":"","type":"General practice"},{"name":"David E. Vitka DVM","town":"Greenwich","county":"Fairfield","address":"352 W Putnam Ave, Greenwich CT 06830","phone":"(203) 661-6493","type":"General practice"},{"name":"Greenwich Animal Hospital","town":"Greenwich","county":"Fairfield","address":"430 W Putnam Ave, Greenwich CT 06830","phone":"(203) 869-0534","type":"General practice"},{"name":"Greenwich Veterinary Center","town":"Greenwich","county":"Fairfield","address":"264 W Putnam Ave, Greenwich CT 06830","phone":"(475) 325-5327","type":"General practice"},{"name":"Hospital for Veterinary Surgery","town":"Greenwich","county":"Fairfield","address":"","phone":"","type":"Specialty/referral"},{"name":"Veterinary Emergency Group (VEG) Greenwich","town":"Greenwich (Cos Cob)","county":"Fairfield","address":"409 E Putnam Ave, Cos Cob CT 06807","phone":"(203) 909-6560","type":"Emergency/24-hr"},{"name":"Monroe Animal Hospital","town":"Monroe","county":"Fairfield","address":"270 Main St, Monroe CT 06468","phone":"(203) 261-0544","type":"General practice"},{"name":"Monroe Town & Country Veterinary Hospital","town":"Monroe","county":"Fairfield","address":"607 Main St, Monroe CT 06468","phone":"(203) 268-8681","type":"General practice"},{"name":"Grove Street Veterinary Clinic","town":"New Canaan","county":"Fairfield","address":"73 Grove St, New Canaan CT 06840","phone":"(203) 972-7387","type":"General practice"},{"name":"New Canaan Veterinary Hospital","town":"New Canaan","county":"Fairfield","address":"7 Vitti St, New Canaan CT 06840","phone":"(203) 966-1627","type":"General practice"},{"name":"Fieldstone Veterinary Care","town":"New Fairfield","county":"Fairfield","address":"4 Cotton Tail Rd, New Fairfield CT 06812","phone":"(475) 282-2875","type":"General practice"},{"name":"New Fairfield Animal Hospital","town":"New Fairfield","county":"Fairfield","address":"28 Route 39, New Fairfield CT 06812","phone":"(203) 312-9000","type":"General practice"},{"name":"Brookfield Animal Hospital - Newtown","town":"Newtown","county":"Fairfield","address":"52 Church Hill Rd, Newtown CT 06470","phone":"(203) 270-8387","type":"General practice"},{"name":"Connecticut Equine Practice","town":"Newtown","county":"Fairfield","address":"53 Mt Nebo Rd, Newtown CT 06470","phone":"(203) 426-5040","type":"Equine/large animal"},{"name":"Fairfield Equine Associates","town":"Newtown","county":"Fairfield","address":"32 Barnabas Rd, Newtown CT 06470","phone":"(203) 270-3600","type":"Equine/large animal"},{"name":"Mt. Pleasant Hospital for Animals","town":"Newtown","county":"Fairfield","address":"119 Mt Pleasant Rd, Newtown CT 06470","phone":"(203) 426-8585","type":"General practice"},{"name":"Newtown Animal Clinic","town":"Newtown","county":"Fairfield","address":"98 S Main St, Newtown CT 06470","phone":"(203) 426-2777","type":"General practice"},{"name":"Newtown Veterinary Specialists","town":"Newtown","county":"Fairfield","address":"52 Church Hill Rd, Newtown CT 06470","phone":"(203) 270-8387","type":"Emergency/24-hr"},{"name":"Berkshire Veterinary Hospital","town":"Newtown (Sandy Hook)","county":"Fairfield","address":"1 Toddy Hill Rd, Sandy Hook CT 06482","phone":"(203) 426-4222","type":"General practice"},{"name":"Animal Wellness Veterinary Center","town":"Norwalk","county":"Fairfield","address":"570 Main Ave, Norwalk CT 06851","phone":"(203) 295-8080","type":"General practice"},{"name":"Banfield Pet Hospital - Norwalk","town":"Norwalk","county":"Fairfield","address":"500 Connecticut Ave, Norwalk CT 06851","phone":"(475) 489-9565","type":"General practice"},{"name":"Broad River Animal Hospital","town":"Norwalk","county":"Fairfield","address":"89 New Canaan Ave, Norwalk CT 06850","phone":"(203) 846-3495","type":"General practice"},{"name":"Eye Care for Animals - Norwalk","town":"Norwalk","county":"Fairfield","address":"178 Connecticut Ave, Norwalk CT 06854","phone":"(203) 855-1533","type":"Specialty/referral"},{"name":"MedVet Norwalk","town":"Norwalk","county":"Fairfield","address":"129 Glover Ave Ste 1A, Norwalk CT 06850","phone":"(203) 838-6626","type":"Emergency/24-hr"},{"name":"Norwalk Animal Hospital","town":"Norwalk","county":"Fairfield","address":"330 Main Ave, Norwalk CT 06851","phone":"(203) 847-7757","type":"General practice"},{"name":"Norwalk Veterinary Hospital","town":"Norwalk","county":"Fairfield","address":"726 Connecticut Ave, Norwalk CT 06854","phone":"(203) 838-8421","type":"General practice"},{"name":"Pet Animal Welfare Society (PAWS) Clinic","town":"Norwalk","county":"Fairfield","address":"504 Main St, Norwalk CT 06854","phone":"(203) 750-9572","type":"General practice"},{"name":"PetSmart Veterinary Services - Norwalk","town":"Norwalk","county":"Fairfield","address":"525 Connecticut Ave, Norwalk CT 06854","phone":"(475) 284-5025","type":"General practice"},{"name":"Strawberry Hill Animal Hospital","town":"Norwalk","county":"Fairfield","address":"350 Westport Ave, Norwalk CT 06851","phone":"(203) 847-5875","type":"General practice"},{"name":"United Veterinary Center","town":"Norwalk","county":"Fairfield","address":"48 Westport Ave, Norwalk CT 06851","phone":"","type":"General practice"},{"name":"VCA Veterinary Referral and Emergency Center","town":"Norwalk","county":"Fairfield","address":"123 W Cedar St, Norwalk CT 06854","phone":"(203) 854-9960","type":"Emergency/24-hr"},{"name":"Value Pet Vet","town":"Norwalk","county":"Fairfield","address":"17 Park St, Norwalk CT 06851","phone":"(203) 939-9590","type":"General practice"},{"name":"Georgetown Veterinary Hospital","town":"Redding","county":"Fairfield","address":"53 Redding Rd, Redding CT 06896","phone":"(203) 544-9098","type":"General practice"},{"name":"Redding Ridge Veterinary","town":"Redding","county":"Fairfield","address":"3 Meeker Hill Rd, Redding CT 06896","phone":"(203) 938-8018","type":"General practice"},{"name":"Mathews Veterinary Clinic","town":"Ridgefield","county":"Fairfield","address":"28 Lost Mine Pl, Ridgefield CT 06877","phone":"(203) 617-8664","type":"General practice"},{"name":"Pawpaw Tree Veterinary Clinic of Ridgefield","town":"Ridgefield","county":"Fairfield","address":"723 Branchville Rd, Ridgefield CT 06877","phone":"(475) 215-9005","type":"General practice"},{"name":"Quarry Ridge Animal Hospital","town":"Ridgefield","county":"Fairfield","address":"30 Old Quarry Rd, Ridgefield CT 06877","phone":"(203) 438-8878","type":"General practice"},{"name":"Redding Veterinary Hospital","town":"Ridgefield","county":"Fairfield","address":"235 Ethan Allen Hwy, Ridgefield CT 06877","phone":"(203) 438-3761","type":"General practice"},{"name":"Ridgefield Animal Hospital","town":"Ridgefield","county":"Fairfield","address":"614 Main St, Ridgefield CT 06877","phone":"(203) 431-4444","type":"General practice"},{"name":"Ridgefield Veterinary Center","town":"Ridgefield","county":"Fairfield","address":"722 Danbury Rd, Ridgefield CT 06877","phone":"(203) 438-2658","type":"General practice"},{"name":"Countryside Veterinary Hospital","town":"Shelton","county":"Fairfield","address":"374 Leavenworth Rd, Shelton CT 06484","phone":"(203) 929-0500","type":"General practice"},{"name":"Shelton Veterinary Center","town":"Shelton","county":"Fairfield","address":"560 Huntington St, Shelton CT 06484","phone":"(203) 929-7297","type":"General practice"},{"name":"VCA Shoreline Veterinary Referral and Emergency Center","town":"Shelton","county":"Fairfield","address":"895 Bridgeport Ave, Shelton CT 06484","phone":"(203) 929-8600","type":"Emergency/24-hr"},{"name":"Creature Comforts Mobile Veterinary Clinic","town":"Sherman","county":"Fairfield","address":"90 Route 39 S, Sherman CT 06784","phone":"","type":"General practice"},{"name":"Banfield Pet Hospital - Stamford","town":"Stamford","county":"Fairfield","address":"2000 W Main St, Stamford CT 06902","phone":"(203) 348-7787","type":"General practice"},{"name":"Bulls Head Pet Hospital","town":"Stamford","county":"Fairfield","address":"28 Long Ridge Rd, Stamford CT 06905","phone":"(203) 324-5711","type":"General practice"},{"name":"CoreVet Animal Hospital","town":"Stamford","county":"Fairfield","address":"670 Pacific St, Stamford CT 06902","phone":"(203) 807-5776","type":"General practice"},{"name":"Cornell University Veterinary Specialists","town":"Stamford","county":"Fairfield","address":"880 Canal St, Stamford CT 06902","phone":"(203) 595-2777","type":"Emergency/24-hr"},{"name":"High Ridge Animal Hospital","town":"Stamford","county":"Fairfield","address":"868 High Ridge Rd, Stamford CT 06905","phone":"(203) 322-0507","type":"General practice"},{"name":"Just Cats Veterinary Hospital","town":"Stamford","county":"Fairfield","address":"1029 E Main St, Stamford CT 06902","phone":"(203) 327-7220","type":"General practice"},{"name":"PetSmart Veterinary Services - Stamford","town":"Stamford","county":"Fairfield","address":"288 West Ave, Stamford CT 06902","phone":"(475) 291-3023","type":"General practice"},{"name":"Rippowam Animal Hospital","town":"Stamford","county":"Fairfield","address":"888 High Ridge Rd, Stamford CT 06905","phone":"(203) 329-8811","type":"General practice"},{"name":"Spot On Veterinary Hospital & Hotel","town":"Stamford","county":"Fairfield","address":"184 Selleck St, Stamford CT 06902","phone":"(203) 973-7768","type":"General practice"},{"name":"Stamford Veterinary Center","town":"Stamford","county":"Fairfield","address":"633 Hope St, Stamford CT 06907","phone":"(203) 293-2477","type":"General practice"},{"name":"Stamford-Springdale Animal Hospital","town":"Stamford","county":"Fairfield","address":"995 Hope St #1, Stamford CT 06907","phone":"(203) 323-9623","type":"General practice"},{"name":"VCA Davis Animal Hospital","town":"Stamford","county":"Fairfield","address":"2053 W Main St, Stamford CT 06902","phone":"(203) 327-0300","type":"General practice"},{"name":"Barnum Animal Hospital","town":"Stratford","county":"Fairfield","address":"755 Barnum Avenue Cutoff, Stratford CT 06614","phone":"(203) 378-0687","type":"General practice"},{"name":"Nutmeg Spay/Neuter Clinic","town":"Stratford","county":"Fairfield","address":"626 Surf Ave, Stratford CT 06615","phone":"(203) 690-1550","type":"General practice"},{"name":"Oronoque Veterinary Services","town":"Stratford","county":"Fairfield","address":"88 Ryders Lane, Stratford CT 06614","phone":"(203) 378-5229","type":"General practice"},{"name":"Pieper Veterinary - Stratford","town":"Stratford","county":"Fairfield","address":"95 Armory Rd, Stratford CT 06614","phone":"(475) 271-2287","type":"Mixed (GP + emergency)"},{"name":"Shakespeare Veterinary Hospital","town":"Stratford","county":"Fairfield","address":"47 Nichols Ave, Stratford CT 06614","phone":"(203) 378-8276","type":"General practice"},{"name":"Stratford Animal Hospital","town":"Stratford","county":"Fairfield","address":"480 Knowlton St, Stratford CT 06615","phone":"(203) 377-0235","type":"General practice"},{"name":"The Pet Hospital of Stratford","town":"Stratford","county":"Fairfield","address":"1185 Linden Ave, Stratford CT 06615","phone":"(203) 381-9488","type":"General practice"},{"name":"Home Veterinary Services","town":"Trumbull","county":"Fairfield","address":"37 Church Hill Rd, Trumbull CT 06611","phone":"(203) 261-7387","type":"General practice"},{"name":"Reid Veterinary Center","town":"Trumbull","county":"Fairfield","address":"165 Monroe Tpke, Trumbull CT 06611","phone":"(203) 261-9223","type":"General practice"},{"name":"Trumbull Animal Hospital","town":"Trumbull","county":"Fairfield","address":"6537 Main St, Trumbull CT 06611","phone":"(203) 268-6231","type":"General practice"},{"name":"Animal Doctor of Weston","town":"Weston","county":"Fairfield","address":"202 Weston Rd, Weston CT 06883","phone":"(203) 221-1440","type":"General practice"},{"name":"HomeVet","town":"Weston","county":"Fairfield","address":"49 White Birch Rd, Weston CT 06883","phone":"(203) 222-7979","type":"General practice"},{"name":"Bond Vet - Westport","town":"Westport","county":"Fairfield","address":"1 Main St, Westport CT 06880","phone":"(203) 309-1113","type":"General practice"},{"name":"Healing Center for Animals","town":"Westport","county":"Fairfield","address":"606 Post Rd E, Westport CT 06880","phone":"(203) 227-4943","type":"General practice"},{"name":"Schulhof Animal Hospital","town":"Westport","county":"Fairfield","address":"199 Post Rd W, Westport CT 06880","phone":"(203) 226-1231","type":"General practice"},{"name":"Spot On Veterinary Hospital - Westport","town":"Westport","county":"Fairfield","address":"950 Post Rd E, Westport CT 06880","phone":"","type":"General practice"},{"name":"Westport Animal Hospital","town":"Westport","county":"Fairfield","address":"814 Post Rd E, Westport CT 06880","phone":"(203) 227-4117","type":"General practice"},{"name":"Westport Veterinary Associates","town":"Westport","county":"Fairfield","address":"1677 Post Rd E, Westport CT 06880","phone":"(203) 259-3647","type":"General practice"},{"name":"Winslow Park Animal Hospital","town":"Westport","county":"Fairfield","address":"319 Post Rd E, Westport CT 06880","phone":"(203) 226-5555","type":"General practice"},{"name":"Animal Eye Clinic","town":"Wilton","county":"Fairfield","address":"783 Danbury Rd Ste A, Wilton CT 06897","phone":"(203) 587-1225","type":"Specialty/referral"},{"name":"Cannondale Animal Clinic","town":"Wilton","county":"Fairfield","address":"481 Danbury Rd, Wilton CT 06897","phone":"(203) 834-8855","type":"General practice"},{"name":"South Wilton Veterinary Group","town":"Wilton","county":"Fairfield","address":"51 Danbury Rd, Wilton CT 06897","phone":"(203) 762-2002","type":"Mixed (GP + emergency)"},{"name":"Wilton Hospital for Animals","town":"Wilton","county":"Fairfield","address":"215 Danbury Rd, Wilton CT 06897","phone":"(203) 762-8321","type":"General practice"},{"name":"Animal General","town":"Avon","county":"Hartford","address":"296 Country Club Road","phone":"(860) 673-4000","type":"General practice"},{"name":"Avon Veterinary Clinic","town":"Avon","county":"Hartford","address":"328 West Main Street","phone":"(860) 678-1122","type":"General practice"},{"name":"Progressive Animal Wellness (PAW)","town":"Avon","county":"Hartford","address":"70 E Main St","phone":"(860) 325-2124","type":"General practice"},{"name":"Compassionate Care Veterinary Hospital","town":"Berlin","county":"Hartford","address":"1088 Berlin Turnpike","phone":"(860) 438-7597","type":"General practice"},{"name":"Silver Lake Animal Hospital","town":"Berlin","county":"Hartford","address":"2762 Berlin Turnpike","phone":"(860) 828-4717","type":"General practice"},{"name":"Animal Hospital of Berlin","town":"Berlin (Kensington)","county":"Hartford","address":"369 New Britain Road","phone":"(860) 828-1770","type":"General practice"},{"name":"Kensington Bird & Animal Hospital","town":"Berlin (Kensington)","county":"Hartford","address":"977 Farmington Ave","phone":"","type":"General practice"},{"name":"Bloomfield Animal Hospital","town":"Bloomfield","county":"Hartford","address":"77 Old Windsor Rd","phone":"","type":"General practice"},{"name":"MacDonald Veterinary Hospital","town":"Bloomfield","county":"Hartford","address":"","phone":"(860) 242-5506","type":"General practice"},{"name":"Chippens Hill Veterinary Hospital","town":"Bristol","county":"Hartford","address":"595 Clark Avenue","phone":"(860) 583-9271","type":"General practice"},{"name":"VCA Bristol Animal Hospital","town":"Bristol","county":"Hartford","address":"865 Terryville Avenue","phone":"(860) 583-4641","type":"General practice"},{"name":"Burlington Veterinary Center","town":"Burlington","county":"Hartford","address":"","phone":"","type":"General practice"},{"name":"Canton Animal Hospital","town":"Canton","county":"Hartford","address":"198 Albany Turnpike","phone":"(860) 693-9300","type":"General practice"},{"name":"Roaring Brook Veterinary Hospital","town":"Canton","county":"Hartford","address":"60 Lovely Street","phone":"(860) 693-0214","type":"General practice"},{"name":"Veterinary Emergency Center of Canton","town":"Canton","county":"Hartford","address":"135 Dowd Avenue","phone":"(860) 693-6992","type":"Emergency/24-hr"},{"name":"East Hartford Animal Clinic","town":"East Hartford","county":"Hartford","address":"","phone":"","type":"General practice"},{"name":"POA SPAY!","town":"East Hartford","county":"Hartford","address":"144 Main Street, Unit E","phone":"(860) 206-7922","type":"General practice"},{"name":"VCA Animal Hospital of East Hartford","town":"East Hartford","county":"Hartford","address":"334 Silver Lane","phone":"(860) 569-1066","type":"General practice"},{"name":"Vet For Pet Animal Hospital","town":"East Hartford","county":"Hartford","address":"765 Main Street","phone":"(860) 216-5342","type":"General practice"},{"name":"Connecticut Mobile Veterinary Services","town":"East Windsor","county":"Hartford","address":"6 Newberry Road","phone":"(860) 682-0354","type":"General practice"},{"name":"Enfield Animal Hospital","town":"Enfield","county":"Hartford","address":"26 Oliver Road","phone":"(860) 745-1619","type":"General practice"},{"name":"Freshwater Veterinary Hospital","town":"Enfield","county":"Hartford","address":"151 Hazard Ave","phone":"","type":"General practice"},{"name":"Advanced Veterinary Care","town":"Farmington","county":"Hartford","address":"376 Scott Swamp Road","phone":"(860) 677-0309","type":"General practice"},{"name":"Farmington Animal Hospital","town":"Farmington","county":"Hartford","address":"204 Farmington Avenue","phone":"(860) 677-4400","type":"General practice"},{"name":"Star Meadow Animal Clinic","town":"Farmington","county":"Hartford","address":"1073 Farmington Ave","phone":"","type":"General practice"},{"name":"Banfield Pet Hospital - Glastonbury","town":"Glastonbury","county":"Hartford","address":"","phone":"","type":"General practice"},{"name":"Beckett & Associates Veterinary Services","town":"Glastonbury","county":"Hartford","address":"1269 Main Street","phone":"(860) 659-0848","type":"General practice"},{"name":"Glastonbury Animal Hospital","town":"Glastonbury","county":"Hartford","address":"55 Grove Street","phone":"(860) 633-8394","type":"General practice"},{"name":"Glastonbury Veterinary Hospital","town":"Glastonbury","county":"Hartford","address":"121 Pratt Street","phone":"(860) 633-3588","type":"General practice"},{"name":"Salmon Brook Veterinary Hospital","town":"Granby","county":"Hartford","address":"136 Salmon Brook Street","phone":"(860) 653-7238","type":"General practice"},{"name":"Banfield Pet Hospital - Manchester","town":"Manchester","county":"Hartford","address":"","phone":"","type":"General practice"},{"name":"Manchester Veterinary Clinic","town":"Manchester","county":"Hartford","address":"156 Spencer St","phone":"","type":"General practice"},{"name":"Glastonbury Animal Hospital of Marlborough","town":"Marlborough","county":"Hartford","address":"","phone":"","type":"General practice"},{"name":"Marlborough Animal Hospital (Pieper Veterinary)","town":"Marlborough","county":"Hartford","address":"212 E. Hampton Road","phone":"(860) 295-8381","type":"General practice"},{"name":"Marlborough Bird & Animal Hospital","town":"Marlborough","county":"Hartford","address":"21 South Main Street","phone":"(860) 295-1595","type":"General practice"},{"name":"UrgentVet New Britain","town":"New Britain","county":"Hartford","address":"462 Hartford Road","phone":"(860) 256-8800","type":"Urgent care"},{"name":"Fox Memorial Clinic (Connecticut Humane Society)","town":"Newington","county":"Hartford","address":"701-B Russell Road","phone":"(860) 594-4503","type":"General practice"},{"name":"Hartford Veterinary Hospital","town":"Newington","county":"Hartford","address":"2300 Berlin Turnpike","phone":"(860) 666-1447","type":"General practice"},{"name":"Newington Veterinary Clinic","town":"Newington","county":"Hartford","address":"177 Day St","phone":"","type":"General practice"},{"name":"Banfield Pet Hospital - Plainville","town":"Plainville","county":"Hartford","address":"","phone":"","type":"General practice"},{"name":"Ragged Mountain Animal Hospital","town":"Plainville","county":"Hartford","address":"137 New Britain Ave","phone":"","type":"General practice"},{"name":"VCA Old Canal Animal Hospital","town":"Plainville","county":"Hartford","address":"49 E. Main Street","phone":"(860) 747-2759","type":"General practice"},{"name":"Veterinary Urgent and Well Care Center","town":"Plainville","county":"Hartford","address":"","phone":"","type":"Urgent care"},{"name":"Animal Hospital of Rocky Hill","town":"Rocky Hill","county":"Hartford","address":"588 Cromwell Avenue","phone":"(860) 563-1027","type":"General practice"},{"name":"Catzablanca Cat Clinic and Hospital","town":"Rocky Hill","county":"Hartford","address":"1940 Silas Deane Highway","phone":"(860) 721-6369","type":"General practice"},{"name":"Hop Meadow Animal Hospital","town":"Simsbury","county":"Hartford","address":"235 Hopmeadow Street","phone":"(860) 658-1931","type":"General practice"},{"name":"Simsbury Veterinary Hospital","town":"Simsbury","county":"Hartford","address":"1450 Hopmeadow Street","phone":"(860) 658-5126","type":"General practice"},{"name":"South Windsor Veterinary Clinic","town":"South Windsor","county":"Hartford","address":"69 Oakland Road","phone":"(860) 644-3224","type":"General practice"},{"name":"VCA Valley Animal Hospital","town":"South Windsor","county":"Hartford","address":"39 Patria Road","phone":"(860) 528-2178","type":"General practice"},{"name":"Southington Veterinary Associates","town":"Southington","county":"Hartford","address":"35 Darling Street","phone":"(860) 621-9328","type":"General practice"},{"name":"Mountain Lore Animal Hospital (Pieper Veterinary)","town":"Southington (Plantsville)","county":"Hartford","address":"765 South End Road","phone":"(860) 276-8553","type":"General practice"},{"name":"River Valley Animal Center","town":"Suffield","county":"Hartford","address":"616 South Street","phone":"(860) 370-5277","type":"General practice"},{"name":"Suffield Veterinary Hospital","town":"Suffield","county":"Hartford","address":"577 East Street South","phone":"(860) 668-4041","type":"General practice"},{"name":"Cats Limited Veterinary Hospital","town":"West Hartford","county":"Hartford","address":"1260 New Britain Ave","phone":"","type":"General practice"},{"name":"Connecticut Veterinary Center","town":"West Hartford","county":"Hartford","address":"470 Oakwood Ave","phone":"(860) 233-8564","type":"Mixed (GP + emergency)"},{"name":"Petcare Veterinary Services","town":"West Hartford","county":"Hartford","address":"64 Raymond Road","phone":"(860) 232-6060","type":"General practice"},{"name":"VCA Veterinary Specialists of CT","town":"West Hartford","county":"Hartford","address":"993 North Main Street","phone":"(860) 236-3273","type":"Emergency/24-hr"},{"name":"Beaver Brook Animal Hospital","town":"Wethersfield","county":"Hartford","address":"434 Silas Deane Highway","phone":"(860) 757-3346","type":"General practice"},{"name":"Double A Veterinary Hospital","town":"Wethersfield","county":"Hartford","address":"106 Nott Street","phone":"(860) 529-0668","type":"General practice"},{"name":"Connecticut Veterinary Center - Windsor","town":"Windsor","county":"Hartford","address":"620 Bloomfield Ave","phone":"(860) 688-2026","type":"General practice"},{"name":"Kennedy Road Veterinary Clinic","town":"Windsor","county":"Hartford","address":"960 Kennedy Rd","phone":"","type":"General practice"},{"name":"New England Veterinary Center & Cancer Care","town":"Windsor","county":"Hartford","address":"955 Kennedy Rd","phone":"(860) 688-8400","type":"Emergency/24-hr"},{"name":"Windsor Animal Clinic","town":"Windsor","county":"Hartford","address":"46 Poquonock Avenue","phone":"(860) 688-4969","type":"General practice"},{"name":"Winsted Hospital for Animals","town":"Barkhamsted","county":"Litchfield","address":"319 New Hartford Road","phone":"(860) 379-0701","type":"General practice"},{"name":"Gold Coast Mobile Veterinary Service","town":"Bethlehem","county":"Litchfield","address":"80 Town Line Highway North","phone":"(203) 727-8600","type":"General practice"},{"name":"Sand Road Animal Hospital","town":"Canaan (Falls Village)","county":"Litchfield","address":"136 Sand Road","phone":"(860) 824-5223","type":"General practice"},{"name":"Dr. Brown's Cat Spay Neuter Clinic","town":"Goshen","county":"Litchfield","address":"6 Tyler Heights Ext","phone":"(860) 205-0035","type":"General practice"},{"name":"Litchfield Hills Veterinary Hospital","town":"Harwinton","county":"Litchfield","address":"172 Litchfield Road","phone":"(860) 485-1978","type":"General practice"},{"name":"Kent Animal Clinic","town":"Kent","county":"Litchfield","address":"13 Bridge Street","phone":"(860) 927-1200","type":"General practice"},{"name":"Litchfield Veterinary Hospital","town":"Litchfield","county":"Litchfield","address":"289 Torrington Road","phone":"(860) 567-1622","type":"General practice"},{"name":"Tri-State Veterinary Services","town":"Litchfield","county":"Litchfield","address":"499 Bantam Road, Unit D","phone":"(860) 459-0986","type":"Equine/large animal"},{"name":"Bantam Lake Animal Hospital","town":"Litchfield (Bantam)","county":"Litchfield","address":"180 Bantam Lake Road","phone":"(860) 567-8369","type":"General practice"},{"name":"Northwest Corner Veterinary Hospital","town":"Litchfield (Bantam)","county":"Litchfield","address":"646 Bantam Road","phone":"(860) 567-0766","type":"General practice"},{"name":"Candlewood Animal Hospital","town":"New Milford","county":"Litchfield","address":"117 Kent Road","phone":"(860) 355-3008","type":"General practice"},{"name":"New Milford Animal Hospital","town":"New Milford","county":"Litchfield","address":"2 Sega Drive","phone":"(860) 354-3316","type":"General practice"},{"name":"Park Lane Animal Hospital (Heart + Paw)","town":"New Milford","county":"Litchfield","address":"24 Park Lane Road","phone":"(860) 350-4937","type":"General practice"},{"name":"Valley Veterinary Hospital","town":"New Milford","county":"Litchfield","address":"","phone":"(860) 355-3756","type":"General practice"},{"name":"Roxbury Animal Clinic","town":"Roxbury","county":"Litchfield","address":"156 Baker Road","phone":"(860) 354-8612","type":"General practice"},{"name":"Bee Tree Veterinary Clinic","town":"Sharon","county":"Litchfield","address":"13 West Main Street","phone":"(860) 364-0008","type":"General practice"},{"name":"Sharon Veterinary Clinic","town":"Sharon","county":"Litchfield","address":"414 Cornwall Bridge Road","phone":"(860) 364-0058","type":"General practice"},{"name":"Thomaston Veterinary Clinic","town":"Thomaston","county":"Litchfield","address":"52 East Main Street","phone":"(860) 567-8369","type":"General practice"},{"name":"North Torrington Veterinary Hospital","town":"Torrington","county":"Litchfield","address":"493 Winsted Road","phone":"(860) 489-0607","type":"General practice"},{"name":"Torrington Animal Hospital","town":"Torrington","county":"Litchfield","address":"765 East Main Street","phone":"(860) 489-4231","type":"General practice"},{"name":"Aspetuck Animal Hospital","town":"Washington (New Preston)","county":"Litchfield","address":"78 New Milford Turnpike","phone":"(860) 868-2973","type":"General practice"},{"name":"Stone Veterinary Hospital","town":"Watertown","county":"Litchfield","address":"51 Depot Street, Unit 501","phone":"(860) 945-9339","type":"General practice"},{"name":"Watertown Veterinary Hospital","town":"Watertown","county":"Litchfield","address":"673 Litchfield Road","phone":"(860) 274-9651","type":"General practice"},{"name":"Davis Companion Animal Hospital","town":"Woodbury","county":"Litchfield","address":"127 Main Street North, Suite G","phone":"(203) 263-8866","type":"General practice"},{"name":"Middle Quarter Animal Hospital","town":"Woodbury","county":"Litchfield","address":"726 Main Street South","phone":"(203) 263-4772","type":"General practice"},{"name":"Sherman Hill Animal Hospital","town":"Woodbury","county":"Litchfield","address":"431 Sherman Hill Road","phone":"(203) 263-4222","type":"General practice"},{"name":"Woodbury Veterinary Clinic","town":"Woodbury","county":"Litchfield","address":"1188 Main Street South","phone":"(203) 263-3232","type":"General practice"},{"name":"VetCor of Chester","town":"Chester","county":"Middlesex","address":"264 Middlesex Avenue","phone":"(860) 526-5313","type":"General practice"},{"name":"Clinton Veterinary Hospital","town":"Clinton","county":"Middlesex","address":"93 Old Post Road","phone":"(860) 669-5721","type":"General practice"},{"name":"Shoreline Animal Hospital","town":"Clinton","county":"Middlesex","address":"18 West Main Street","phone":"(860) 669-9374","type":"General practice"},{"name":"Companion Animal Hospital","town":"Cromwell","county":"Middlesex","address":"5 Kirby Road","phone":"","type":"General practice"},{"name":"VCA Cromwell Animal Hospital","town":"Cromwell","county":"Middlesex","address":"547 Main Street","phone":"(860) 635-1979","type":"General practice"},{"name":"Deep River Animal Hospital","town":"Deep River","county":"Middlesex","address":"171 Winthrop Road","phone":"(860) 526-8387","type":"General practice"},{"name":"Durham Veterinary Hospital","town":"Durham","county":"Middlesex","address":"178 Parmelee Hill Road","phone":"(860) 349-3485","type":"General practice"},{"name":"East Haddam Veterinary Clinic (Pieper Veterinary)","town":"East Haddam","county":"Middlesex","address":"105 Town Street","phone":"(860) 873-8673","type":"General practice"},{"name":"Moodus Veterinary Practice","town":"East Haddam (Moodus)","county":"Middlesex","address":"5 Grist Mill Road","phone":"(860) 733-0411","type":"General practice"},{"name":"The Veterinary Clinic of East Hampton","town":"East Hampton","county":"Middlesex","address":"","phone":"","type":"General practice"},{"name":"Cobalt Veterinary Clinic","town":"East Hampton (Cobalt)","county":"Middlesex","address":"9 Middle Haddam Road","phone":"(860) 342-3399","type":"General practice"},{"name":"Essex Veterinary Clinic (Pieper Veterinary)","town":"Essex","county":"Middlesex","address":"114 Westbrook Road","phone":"(860) 767-7976","type":"General practice"},{"name":"Higganum Veterinary Clinic","town":"Haddam (Higganum)","county":"Middlesex","address":"92 Saybrook Road","phone":"(860) 345-3366","type":"General practice"},{"name":"Veterinary Associates of Killingworth","town":"Killingworth","county":"Middlesex","address":"208 Route 81","phone":"(860) 663-3003","type":"General practice"},{"name":"Middletown Animal Clinic (Pieper Veterinary)","town":"Middletown","county":"Middlesex","address":"","phone":"","type":"General practice"},{"name":"Middletown Veterinary Hospital","town":"Middletown","county":"Middlesex","address":"150 Berlin Street","phone":"(860) 346-0837","type":"General practice"},{"name":"Pieper Memorial Veterinary Center (Pieper Veterinary)","town":"Middletown","county":"Middlesex","address":"730 Randolph Road","phone":"(860) 347-8387","type":"Emergency/24-hr"},{"name":"Pieper Olson Veterinary Hospital","town":"Middletown","county":"Middlesex","address":"730 Randolph Road","phone":"(860) 347-1122","type":"General practice"},{"name":"Animal Hospital of Old Saybrook","town":"Old Saybrook","county":"Middlesex","address":"21 Spencer Plains Road","phone":"(860) 399-6249","type":"General practice"},{"name":"Saybrook Veterinary Hospital","town":"Old Saybrook","county":"Middlesex","address":"807 Middlesex Turnpike","phone":"(860) 388-9681","type":"General practice"},{"name":"Portland Veterinary Hospital","town":"Portland","county":"Middlesex","address":"455 Portland-Cobalt Road","phone":"(860) 342-3399","type":"General practice"},{"name":"TEAM Mobile Feline Unit","town":"Westbrook","county":"Middlesex","address":"1201 Boston Post Road","phone":"(888) 367-8326","type":"General practice"},{"name":"Ansonia Westfield Veterinary Hospital","town":"Ansonia","county":"New Haven","address":"10 Westfield Avenue","phone":"(203) 735-8634","type":"General practice"},{"name":"Beacon Falls Animal Hospital","town":"Beacon Falls","county":"New Haven","address":"45 Pines Bridge Road","phone":"(203) 828-6686","type":"General practice"},{"name":"Bethany Veterinary Hospital","town":"Bethany","county":"New Haven","address":"782 Amity Road","phone":"(203) 393-3650","type":"General practice"},{"name":"Country Companions Veterinary Services","town":"Bethany","county":"New Haven","address":"116 Old Amity Road","phone":"(203) 393-7387","type":"General practice"},{"name":"Branford Veterinary Hospital","town":"Branford","county":"New Haven","address":"125 North Branford Road","phone":"(203) 488-3949","type":"General practice"},{"name":"East Shore Animal Hospital","town":"Branford","county":"New Haven","address":"50 North Main Street","phone":"(203) 488-1686","type":"General practice"},{"name":"Lakes Veterinary Services","town":"Branford","county":"New Haven","address":"201 East Main Street","phone":"(203) 481-1394","type":"General practice"},{"name":"Mill Pond Veterinary Hospital","town":"Branford","county":"New Haven","address":"229 East Main Street","phone":"(203) 488-5990","type":"General practice"},{"name":"Animal Medical Care","town":"Cheshire","county":"New Haven","address":"490 Cornwall Avenue","phone":"(203) 439-2597","type":"General practice"},{"name":"Sandbank Veterinary Hospital","town":"Cheshire","county":"New Haven","address":"1320 Peck Lane","phone":"","type":"General practice"},{"name":"VCA Cheshire Animal Hospital","town":"Cheshire","county":"New Haven","address":"1572 South Main Street","phone":"(203) 272-3266","type":"General practice"},{"name":"River Valley Veterinary Hospital","town":"Derby","county":"New Haven","address":"88 Sodom Lane","phone":"(203) 257-1785","type":"General practice"},{"name":"Veterinary Associates of Derby","town":"Derby","county":"New Haven","address":"380 New Haven Avenue","phone":"(203) 734-2007","type":"General practice"},{"name":"Shore Haven Veterinary Hospital","town":"East Haven","county":"New Haven","address":"47 Frontage Road","phone":"(203) 469-6531","type":"General practice"},{"name":"VCA Foxon Animal Hospital","town":"East Haven","county":"New Haven","address":"981 Foxon Road","phone":"","type":"General practice"},{"name":"Central Hospital for Veterinary Medicine - Guilford","town":"Guilford","county":"New Haven","address":"535 Boston Post Road","phone":"(203) 533-6444","type":"Emergency/24-hr"},{"name":"Guilford Animal Medical Center","town":"Guilford","county":"New Haven","address":"1795 Boston Post Road","phone":"(203) 453-0375","type":"General practice"},{"name":"Guilford Veterinary Hospital","town":"Guilford","county":"New Haven","address":"81 Saw Mill Road","phone":"(203) 453-2707","type":"General practice"},{"name":"Pet's Friend Animal Hospital","town":"Guilford","county":"New Haven","address":"2477 Boston Post Road","phone":"(203) 453-4333","type":"General practice"},{"name":"Hamden Animal Hospital","town":"Hamden","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Merryfield Veterinary Hospital","town":"Hamden","county":"New Haven","address":"625 Shepard Avenue","phone":"(203) 281-3811","type":"General practice"},{"name":"Mt. Carmel Veterinary Hospital","town":"Hamden","county":"New Haven","address":"3320 Whitney Avenue","phone":"(203) 281-7532","type":"General practice"},{"name":"Spring Glen Veterinary Clinic","town":"Hamden","county":"New Haven","address":"1632 Whitney Avenue","phone":"(203) 248-2104","type":"General practice"},{"name":"CareFur Veterinarians","town":"Madison","county":"New Haven","address":"1321 Boston Post Road","phone":"(203) 800-7850","type":"General practice"},{"name":"Hammonasset Veterinary Clinic","town":"Madison","county":"New Haven","address":"117 Cottage Road","phone":"(203) 245-3434","type":"General practice"},{"name":"Madison Veterinary Hospital","town":"Madison","county":"New Haven","address":"1260 Durham Road","phone":"(203) 421-3300","type":"General practice"},{"name":"Pieper Veterinary Madison","town":"Madison","county":"New Haven","address":"51 Boston Post Road","phone":"(203) 245-8511","type":"Urgent care"},{"name":"Meriden Animal Hospital","town":"Meriden","county":"New Haven","address":"607 East Main Street","phone":"(203) 235-1131","type":"General practice"},{"name":"Embrace Animal Hospital","town":"Middlebury","county":"New Haven","address":"1556 Straits Turnpike","phone":"(203) 528-3933","type":"General practice"},{"name":"Middlebury Animal Hospital","town":"Middlebury","county":"New Haven","address":"52 Turnpike Drive","phone":"(203) 758-1708","type":"General practice"},{"name":"Animal Clinic of Milford","town":"Milford","county":"New Haven","address":"100 Gulf Street","phone":"(203) 882-8311","type":"General practice"},{"name":"Companion Animal Hospital of Milford","town":"Milford","county":"New Haven","address":"100 Lansdale Avenue","phone":"(203) 882-1100","type":"General practice"},{"name":"Milford Animal Hospital","town":"Milford","county":"New Haven","address":"256 Cherry Street","phone":"(203) 878-7471","type":"General practice"},{"name":"Mobile Veterinary Clinic of Milford","town":"Milford","county":"New Haven","address":"525 Boston Post Road","phone":"(203) 874-1000","type":"General practice"},{"name":"Pond Point Animal Hospital","town":"Milford","county":"New Haven","address":"632 New Haven Avenue","phone":"(203) 878-4646","type":"General practice"},{"name":"Silver Sands Veterinary Center","town":"Milford","county":"New Haven","address":"17 Seemans Lane","phone":"(203) 877-3221","type":"General practice"},{"name":"Snowflake Pet Center","town":"Milford","county":"New Haven","address":"1 Rowe Avenue","phone":"(203) 878-3117","type":"General practice"},{"name":"Beacon Valley Animal Hospital","town":"Naugatuck","county":"New Haven","address":"772 Prospect Street","phone":"(203) 723-5005","type":"General practice"},{"name":"Naugatuck Veterinary Hospital (Pet Partners of Naugatuck)","town":"Naugatuck","county":"New Haven","address":"562B Rubber Avenue","phone":"(203) 723-7187","type":"General practice"},{"name":"Elm City Vet (Pieper Veterinary)","town":"New Haven","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Veterinary Associates of Westville","town":"New Haven","county":"New Haven","address":"1292 Whalley Avenue","phone":"(203) 387-6648","type":"General practice"},{"name":"Veterinary Wellness Center of New Haven","town":"New Haven","county":"New Haven","address":"686 State Street","phone":"(203) 867-5181","type":"General practice"},{"name":"Pet Shield Veterinary Hospital","town":"North Branford","county":"New Haven","address":"2033 Foxon Road","phone":"(203) 481-1492","type":"General practice"},{"name":"Veterinary Associates of North Branford","town":"North Branford","county":"New Haven","address":"2364 Route 80","phone":"(203) 481-4238","type":"General practice"},{"name":"Banfield Pet Hospital - North Haven","town":"North Haven","county":"New Haven","address":"419 Universal Drive North","phone":"","type":"General practice"},{"name":"Central Hospital for Veterinary Medicine","town":"North Haven","county":"New Haven","address":"4 Devine Street","phone":"(203) 865-0878","type":"Emergency/24-hr"},{"name":"Montowese Veterinary Clinic","town":"North Haven","county":"New Haven","address":"101 Quinnipiac Avenue","phone":"(203) 562-9896","type":"General practice"},{"name":"North Haven Animal Hospital","town":"North Haven","county":"New Haven","address":"386 Washington Avenue","phone":"(203) 239-5365","type":"General practice"},{"name":"Ridgehill Animal Hospital","town":"North Haven","county":"New Haven","address":"430 State Street","phone":"(203) 288-3307","type":"General practice"},{"name":"Orange Veterinary Hospital","town":"Orange","county":"New Haven","address":"356 Boston Post Road","phone":"(203) 795-6091","type":"General practice"},{"name":"Post Road Veterinary Clinic","town":"Orange","county":"New Haven","address":"321 Dogburn Lane","phone":"(203) 795-1241","type":"General practice"},{"name":"Cat's Corner Veterinary Hospital","town":"Oxford","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Evergreen Veterinary Clinic","town":"Oxford","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Oxford Veterinary Hospital","town":"Oxford","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Prospect Veterinary Hospital","town":"Prospect","county":"New Haven","address":"93 Waterbury Road","phone":"","type":"General practice"},{"name":"Ansonia Animal Hospital, PC","town":"Seymour","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Ansonia Seymour Veterinary Hospital","town":"Seymour","county":"New Haven","address":"876 South Main Street","phone":"(203) 735-9915","type":"General practice"},{"name":"Southbury Veterinary Hospital","town":"Southbury","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"VCA Maple Ridge Animal Hospital","town":"Southbury","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Heritage Animal Hospital","town":"Wallingford","county":"New Haven","address":"71 North Turnpike Road","phone":"(203) 269-8862","type":"General practice"},{"name":"Wallingford Veterinary Hospital","town":"Wallingford","county":"New Haven","address":"60 Church Street, Unit 1A","phone":"","type":"General practice"},{"name":"Yalesville Veterinary Hospital","town":"Wallingford","county":"New Haven","address":"322 Church Street","phone":"(203) 265-1646","type":"General practice"},{"name":"At Home Veterinary Care","town":"Waterbury","county":"New Haven","address":"","phone":"","type":"General practice"},{"name":"Mattatuck Animal Hospital","town":"Waterbury","county":"New Haven","address":"1095 Chase Parkway","phone":"(203) 754-2105","type":"General practice"},{"name":"Waterbury Veterinary Hospital","town":"Waterbury","county":"New Haven","address":"515 Wolcott Street","phone":"","type":"General practice"},{"name":"Angel Animal Hospital","town":"West Haven","county":"New Haven","address":"333 Elm Street","phone":"(203) 934-3536","type":"General practice"},{"name":"Elm Veterinary Clinic","town":"West Haven","county":"New Haven","address":"93 Bull Hill Road","phone":"(203) 934-5295","type":"General practice"},{"name":"Veterinary Care Everywhere","town":"West Haven","county":"New Haven","address":"109 Skyline Drive","phone":"(800) 533-1898","type":"General practice"},{"name":"West Haven Animal Clinic","town":"West Haven","county":"New Haven","address":"959 Campbell Avenue","phone":"(203) 934-3528","type":"General practice"},{"name":"Wolcott Veterinary Clinic","town":"Wolcott","county":"New Haven","address":"400 Center Street","phone":"(203) 879-4641","type":"General practice"},{"name":"Woodbridge Veterinary Hospital","town":"Woodbridge","county":"New Haven","address":"1746 Litchfield Turnpike","phone":"(203) 387-0113","type":"General practice"},{"name":"Norwich Veterinary Hospital","town":"Bozrah","county":"New London","address":"439 Salem Turnpike","phone":"(860) 889-1387","type":"General practice"},{"name":"Colchester Veterinary Hospital","town":"Colchester","county":"New London","address":"364 Old Hartford Road","phone":"(860) 537-3435","type":"General practice"},{"name":"Goodfriends Veterinary Clinic","town":"East Lyme","county":"New London","address":"339 Flanders Road, Suite 104","phone":"(860) 739-4637","type":"General practice"},{"name":"Niantic Animal Hospital","town":"East Lyme (Niantic)","county":"New London","address":"9 Lake Avenue","phone":"(860) 691-0667","type":"General practice"},{"name":"Twin Pines Equine Veterinary Services","town":"Griswold","county":"New London","address":"1 Colonel Brown Road","phone":"(860) 376-4373","type":"Equine/large animal"},{"name":"Companion Animal Hospital","town":"Groton","county":"New London","address":"801 Poquonnock Road","phone":"(860) 449-9800","type":"General practice"},{"name":"Noank-Mystic Veterinary Hospital","town":"Groton (Noank)","county":"New London","address":"2 Elm Street","phone":"(860) 536-6656","type":"General practice"},{"name":"Lebanon Veterinary Hospital (Pieper Veterinary)","town":"Lebanon","county":"New London","address":"920 Trumbull Highway","phone":"(860) 642-7936","type":"Mixed (GP + urgent care)"},{"name":"Meadow Hill Veterinary Shoppe","town":"Lebanon","county":"New London","address":"159 Exeter Road","phone":"(860) 642-3450","type":"General practice"},{"name":"Groton-Ledyard Veterinary Hospital","town":"Ledyard","county":"New London","address":"5 Lorenz Industrial Parkway","phone":"(860) 464-1045","type":"General practice"},{"name":"Lisbon Veterinary Clinic","town":"Lisbon (Jewett City)","county":"New London","address":"91 River Road","phone":"(860) 376-4050","type":"General practice"},{"name":"Montville Animal Hospital","town":"Montville (Uncasville)","county":"New London","address":"907-B Route 32","phone":"(860) 848-1277","type":"General practice"},{"name":"Four Paws Veterinary Services","town":"Mystic","county":"New London","address":"151 Cow Hill Road","phone":"(860) 536-4204","type":"General practice"},{"name":"Northeastern Veterinary Care Center","town":"Mystic","county":"New London","address":"144 Whitehall Avenue","phone":"(860) 980-3047","type":"General practice"},{"name":"North Stonington Veterinary Clinic","town":"North Stonington","county":"New London","address":"71 New London Turnpike","phone":"(860) 535-3666","type":"General practice"},{"name":"All Friends Animal Hospital","town":"Norwich","county":"New London","address":"420 New London Turnpike","phone":"(860) 317-0998","type":"General practice"},{"name":"Norwichtown Veterinary Hospital (Pieper Veterinary)","town":"Norwich","county":"New London","address":"177 Otrobando Avenue","phone":"(860) 886-0188","type":"General practice"},{"name":"Clark Veterinary Hospital","town":"Old Lyme","county":"New London","address":"445 Shore Road","phone":"(860) 434-1763","type":"General practice"},{"name":"Old Lyme Veterinary Hospital","town":"Old Lyme","county":"New London","address":"1 Davis Road West","phone":"(860) 434-8387","type":"General practice"},{"name":"Preston Animal Hospital","town":"Preston","county":"New London","address":"38 Doolittle Road","phone":"(860) 889-4736","type":"General practice"},{"name":"Salem Valley Veterinary Clinic","town":"Salem","county":"New London","address":"12 Centre Street","phone":"(860) 859-1649","type":"General practice"},{"name":"Stonington Veterinary Hospital","town":"Stonington","county":"New London","address":"785 Stonington Road","phone":"(860) 535-3011","type":"General practice"},{"name":"Pawcatuck Veterinary Clinic","town":"Stonington (Pawcatuck)","county":"New London","address":"37 South Broad Street","phone":"(860) 535-5813","type":"General practice"},{"name":"VCA New London Animal Hospital","town":"Waterford","county":"New London","address":"122 Cross Road","phone":"(860) 442-0611","type":"General practice"},{"name":"Waterford Animal Hospital","town":"Waterford","county":"New London","address":"14 Miner Lane","phone":"(860) 443-1893","type":"General practice"},{"name":"Bolton Veterinary Hospital","town":"Bolton","county":"Tolland","address":"222 Boston Turnpike","phone":"(860) 646-6134","type":"Mixed (GP + emergency)"},{"name":"Companion Animal Dental Services","town":"Bolton","county":"Tolland","address":"","phone":"","type":"Specialty/referral"},{"name":"East of the River Veterinary Emergency Clinic","town":"Bolton","county":"Tolland","address":"222 Boston Turnpike","phone":"(860) 646-6134","type":"Emergency/24-hr"},{"name":"Connecticut Equine Clinic","town":"Coventry","county":"Tolland","address":"","phone":"","type":"Equine/large animal"},{"name":"Ellington Center Animal Clinic","town":"Ellington","county":"Tolland","address":"66 Main St","phone":"","type":"General practice"},{"name":"Hebron Veterinary Hospital","town":"Hebron","county":"Tolland","address":"43 W Main St","phone":"(860) 228-4324","type":"General practice"},{"name":"East Brook Animal Hospital","town":"Mansfield Center","county":"Tolland","address":"143 Storrs Road","phone":"(860) 456-1759","type":"General practice"},{"name":"Kirby Veterinary Hospital","town":"Mansfield Center","county":"Tolland","address":"266 Stafford Rd","phone":"(860) 450-0505","type":"General practice"},{"name":"Four Town Veterinary Hospital","town":"Somers","county":"Tolland","address":"495 South Rd","phone":"","type":"General practice"},{"name":"Somers Veterinary Hospital","town":"Somers","county":"Tolland","address":"63 South Rd","phone":"","type":"General practice"},{"name":"Stafford Veterinary Center","town":"Stafford Springs","county":"Tolland","address":"27 Buckley Highway","phone":"(860) 684-5868","type":"General practice"},{"name":"Fenton River Veterinary Hospital","town":"Tolland","county":"Tolland","address":"9 Fieldstone Commons","phone":"(860) 870-8701","type":"General practice"},{"name":"Tolland Veterinary Hospital","town":"Tolland","county":"Tolland","address":"70 Hartford Turnpike","phone":"(860) 875-5748","type":"General practice"},{"name":"Town and Country Veterinary Associates","town":"Vernon","county":"Tolland","address":"27 Hartford Turnpike","phone":"(860) 645-1700","type":"General practice"},{"name":"VCA Animal Hospital of Vernon","town":"Vernon","county":"Tolland","address":"155 Talcottville Road","phone":"(860) 872-7351","type":"General practice"},{"name":"River Road Veterinary Center","town":"Willington","county":"Tolland","address":"451 River Road","phone":"(860) 429-5683","type":"General practice"},{"name":"Willington Veterinary Center","town":"Willington","county":"Tolland","address":"195 River Road","phone":"(860) 487-4817","type":"General practice"},{"name":"Fenton River North Veterinary Clinic","town":"Ashford","county":"Windham","address":"118 Ashford Center Road","phone":"(860) 487-0479","type":"General practice"},{"name":"Brooklyn Veterinary Hospital","town":"Brooklyn","county":"Windham","address":"150 Hartford Road","phone":"(860) 779-0608","type":"General practice"},{"name":"Cat Hospital of Canterbury","town":"Canterbury","county":"Windham","address":"37 South Canterbury Road","phone":"(860) 546-6811","type":"General practice"},{"name":"Eastford Veterinary Clinic","town":"Eastford","county":"Windham","address":"17 Pomfret Road","phone":"(860) 974-2638","type":"General practice"},{"name":"Quinebaug Valley Veterinary Hospital","town":"Killingly (Danielson)","county":"Windham","address":"616 Wauregan Road","phone":"(860) 774-7650","type":"General practice"},{"name":"Companion Veterinary Health Center","town":"Killingly (Dayville)","county":"Windham","address":"729 Hartford Pike","phone":"(860) 779-6070","type":"General practice"},{"name":"VCA Plainfield Animal Hospital","town":"Plainfield","county":"Windham","address":"1100 Norwich Road","phone":"(860) 564-7177","type":"General practice"},{"name":"Animal Hospital of Putnam","town":"Putnam","county":"Windham","address":"1 Kennedy Drive","phone":"(860) 928-1931","type":"General practice"},{"name":"Animal Care Experts (ACE)","town":"Thompson","county":"Windham","address":"1387 Thompson Road","phone":"(860) 935-0304","type":"General practice"},{"name":"North Windham Animal Hospital","town":"Windham (North Windham)","county":"Windham","address":"99 Boston Post Road","phone":"(860) 456-4701","type":"General practice"},{"name":"Windham Spay/Neuter Clinic","town":"Windham (North Windham)","county":"Windham","address":"148 Club Road","phone":"(860) 942-9676","type":"General practice"},{"name":"Dr. Gwenn Mobile Vet","town":"Woodstock","county":"Windham","address":"272 Barlow Cemetery Road","phone":"(860) 428-4271","type":"General practice"},{"name":"Eggleston Equine","town":"Woodstock","county":"Windham","address":"483 Center Road","phone":"","type":"Equine/large animal"},{"name":"Peake Brook Veterinary Center","town":"Woodstock","county":"Windham","address":"168 Route 171","phone":"(860) 315-5955","type":"General practice"},{"name":"Woodstock Veterinary Clinic","town":"Woodstock","county":"Windham","address":"290 Route 171","phone":"(860) 974-1802","type":"General practice"}];
const HospitalAutocomplete = (function(){
const _instances = [];
const TYPE_PILL = {
'General practice':['GENERAL','gp'],
'Emergency/24-hr':['EMERGENCY','er'],
'Specialty/referral':['SPECIALTY','spec'],
'Urgent care':['URGENT CARE','uc'],
'Equine/large animal':['EQUINE','eq'],
'Mixed (GP + emergency)':['GP + ER','mix'],
'Mixed (GP + urgent care)':['GP + URGENT','mix']
};
const norm = s => String(s||'').toLowerCase();
const digits = s => String(s||'').replace(/\D/g,'');
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function hlText(text,q){ const t=norm(text); const i=q?t.indexOf(q):-1; if(i<0) return esc(text);
return esc(text.slice(0,i))+'<span class="bc-hl">'+esc(text.slice(i,i+q.length))+'</span>'+esc(text.slice(i+q.length)); }
function shortAddr(a){ return String(a||'').split(',')[0]; }
function score(h,q,qd){
const n=norm(h.name), t=norm(h.town), c=norm(h.county), a=norm(h.address);
if(n.startsWith(q)) return 0;
if(n.split(/[^a-z0-9]+/).some(w=>w.startsWith(q))) return 1;
if(n.includes(q)) return 2;
if(t.startsWith(q)) return 3;
if(t.includes(q)) return 4;
if(c.includes(q)) return 5;
if(a.includes(q)) return 6;
if(qd && qd.length>=3 && digits(h.phone).includes(qd)) return 7;
return -1;
}
function search(raw){
const q=norm(String(raw).trim());
if(!q){ const R=(window.pvxRefRecent?pvxRefRecent():[]), all=CT_VET_HOSPITALS.filter(h=>R.indexOf(h)<0).sort((a,b)=>a.name.localeCompare(b.name)), out=R.concat(all); out._recent=R.length; return out; }   /* PVX-N371: every hospital, recent first */
const qd=digits(q);
return CT_VET_HOSPITALS.map(h=>({h,s:score(h,q,qd)})).filter(x=>x.s>=0)
.sort((a,b)=> a.s-b.s || a.h.name.localeCompare(b.h.name)).slice(0,50).map(x=>x.h);
}
function attach(input, panel, opts){
opts=opts||{};
for(let i=_instances.length-1;i>=0;i--){ if(!document.contains(_instances[i].wrap)) _instances.splice(i,1); }
const wrap = input.closest('.bc-wrap') || panel.parentElement;
let results=[], hl=-1, open=false;
function close(){ open=false; hl=-1; panel.classList.remove('open'); input.setAttribute('aria-expanded','false'); }
function marks(){ const els=panel.querySelectorAll('.bc-opt'); els.forEach((o,i)=>o.classList.toggle('hl',i===hl)); if(els[hl]) els[hl].scrollIntoView({block:'nearest'}); }
function refresh(){
const q=norm(input.value.trim());
results=search(input.value);
if(hl>=results.length) hl=results.length-1;
if(!results.length){
panel.innerHTML='<div class="bc-empty">No matching hospitals — “'+esc(input.value.trim())+'” will be used as entered.</div>';
} else {
panel.innerHTML='<div class="bc-list hv-list">'+results.map(function(h,i){
const pill=TYPE_PILL[h.type]||[String(h.type||'').toUpperCase(),'gp'];
return(results._recent&&i===0?'<div class="pvx-grp" role="presentation">Recent</div>':'')+(results._recent&&i===results._recent?'<div class="pvx-grp" role="presentation">All hospitals</div>':'')
+'<div class="bc-opt hv-opt'+(i===hl?' hl':'')+'" role="option" data-i="'+i+'">'
+'<div class="hv-main"><div class="hv-name">'+hlText(h.name,q)+'</div>'
+'<div class="hv-sub">'+esc(h.town)+', CT · '+esc(shortAddr(h.address))+'</div></div>'
+'<span class="hv-pill hv-'+pill[1]+'">'+esc(pill[0])+'</span></div>';
}).join('')+'</div>';
panel.querySelectorAll('.bc-opt').forEach(function(o){
o.onmousedown=function(e){ e.preventDefault(); choose(+o.dataset.i); };
o.onmouseenter=function(){ hl=+o.dataset.i; marks(); };
});
}
open=true; panel.classList.add('open'); input.setAttribute('aria-expanded','true');
}
function choose(i){ const h=results[i]; if(!h) return; input.value=h.name; if(opts.onSelect) opts.onSelect(h); close(); try{input.focus();}catch(e){} }
input.addEventListener('input', function(){ if(opts.onInput) opts.onInput(input.value); hl=-1; refresh(); });
input.addEventListener('focus', function(){ hl=-1; refresh(); });
input.addEventListener('keydown', function(e){
if(!open){ if(e.key==='ArrowDown'){ hl=-1; refresh(); } return; }
const n=results.length;
if(e.key==='ArrowDown'){ e.preventDefault(); if(n){ hl=(hl+1)%n; marks(); } }
else if(e.key==='ArrowUp'){ e.preventDefault(); if(n){ hl=(hl-1+n)%n; marks(); } }
else if(e.key==='Enter'){ if(hl>=0 && results[hl]){ e.preventDefault(); choose(hl); } else close(); }
else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(); }
else if(e.key==='Tab'){ close(); }
});
input.setAttribute('role','combobox'); input.setAttribute('aria-autocomplete','list'); input.setAttribute('aria-expanded','false');
const inst={ close:close, wrap:wrap };
_instances.push(inst);
return inst;
}
if(typeof document!=='undefined'){
document.addEventListener('mousedown', function(e){
_instances.forEach(function(inst){ if(inst.wrap && !inst.wrap.contains(e.target)) inst.close(); });
});
}
return { attach:attach, search:search, data:CT_VET_HOSPITALS };
})();

 
let apRefHospObj=null, _apRefCtrl=null;
/* ensureHospitalAutocompletes · its layers, innermost first: 1 n371 after   (PVX-N387; kept true by flow_t387) */
function ensureHospitalAutocompletes(){ return pvxRun('ensureHospitalAutocompletes',ensureHospitalAutocompletes$base,this,arguments); }
function ensureHospitalAutocompletes$base(){
if(_apRefCtrl) return;
const inp=document.getElementById('apRefHosp'), pnl=document.getElementById('apRefHospPanel');
if(inp && pnl) _apRefCtrl=HospitalAutocomplete.attach(inp, pnl, {
onSelect:function(h){ apRefHospObj=h; },
onInput:function(){ apRefHospObj=null; }
});
}
function rhClose(){ if(_apRefCtrl) _apRefCtrl.close(); }

 
const SEX_OPTIONS=["Male (Neutered)","Female (Spayed)","Male (Intact)","Female (Intact)","Unknown"];
let sxResults=[], sxHl=-1, sxOpen=false;
const sxPanel=()=>document.getElementById('apSexPanel');
const sxInput=()=>document.getElementById('apSex');
function sxCompute(q){
q=(q||'').trim().toLowerCase();
const list = q ? SEX_OPTIONS.filter(o=>o.toLowerCase().includes(q)) : SEX_OPTIONS.slice();
return list.map(name=>{
let html;
if(q){ const i=name.toLowerCase().indexOf(q);
html = bcEsc(name.slice(0,i))+'<span class="bc-hl">'+bcEsc(name.slice(i,i+q.length))+'</span>'+bcEsc(name.slice(i+q.length)); }
else html=bcEsc(name);
return {name, html};
});
}
function sxHls(){ const opts=sxPanel().querySelectorAll('.bc-opt'); opts.forEach((o,i)=>o.classList.toggle('hl',i===sxHl)); const el=opts[sxHl]; if(el) el.scrollIntoView({block:'nearest'}); }
function sxRefresh(){
const p=sxPanel(); if(!p) return;
const list=sxCompute(sxInput().value);
sxResults=list; if(sxHl>=list.length) sxHl=list.length-1;
if(!list.length){ p.innerHTML='<div class="bc-empty">No matching option</div>'; }
else {
p.innerHTML='<div class="bc-list">'+list.map((r,i)=>'<div class="bc-opt'+(i===sxHl?' hl':'')+'" data-i="'+i+'"><span class="bc-name">'+r.html+'</span></div>').join('')+'</div>';
p.querySelectorAll('.bc-opt').forEach(o=>{ o.onmousedown=e=>{ e.preventDefault(); sxSelect(sxResults[+o.dataset.i].name); }; o.onmouseenter=()=>{ sxHl=+o.dataset.i; sxHls(); }; });
}
p.classList.add('open'); sxOpen=true;
}
function sxSelect(name){ const el=sxInput(); el.value=name; sxClose(); el.focus(); }
function sxClose(){ const p=sxPanel(); if(p) p.classList.remove('open'); sxOpen=false; sxHl=-1;
const el=sxInput(); if(el && el.value && SEX_OPTIONS.indexOf(el.value)<0) el.value=''; }
function sxKey(e){
if(!sxOpen){ if(e.key==='ArrowDown'){ sxHl=-1; sxRefresh(); } return; }
const n=sxResults.length;
if(e.key==='ArrowDown'){ e.preventDefault(); if(n){ sxHl=(sxHl+1)%n; sxHls(); } }
else if(e.key==='ArrowUp'){ e.preventDefault(); if(n){ sxHl=(sxHl-1+n)%n; sxHls(); } }
else if(e.key==='Enter'){ if(sxHl>=0 && sxResults[sxHl]){ e.preventDefault(); sxSelect(sxResults[sxHl].name); } else { sxClose(); } }
else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); sxClose(); }
else if(e.key==='Tab'){ sxClose(); }
}



function opsMenuPlace(){ /* PVX-N184: the menu drops down from the + in the sub-nav */
const fab=document.getElementById('fabAdd'), m=document.getElementById('opsMenu'); if(!fab||!m) return;
const b=fab.getBoundingClientRect(), w=m.offsetWidth||312, gut=12;
const sl=parseFloat(getComputedStyle(document.body).paddingLeft)||0, sr=parseFloat(getComputedStyle(document.body).paddingRight)||0;
m.style.left=Math.round(Math.max(gut+sl, Math.min(b.right-w, innerWidth-w-gut-sr)))+'px'; m.style.top=Math.round(b.bottom+8)+'px'; m.style.bottom='auto';
}
window.addEventListener('resize',function(){ if(document.getElementById('opsMenu').classList.contains('open')) opsMenuPlace(); });
/* opsMenuOpen · its layers, innermost first: 1 n203 after   (PVX-N387; kept true by flow_t387) */
function opsMenuOpen(){ return pvxRun('opsMenuOpen',opsMenuOpen$base,this,arguments); }
function opsMenuOpen$base(){
opsMenuPlace();
document.getElementById('opsScrim').classList.add('open');
document.getElementById('opsMenu').classList.add('open');
const fab=document.getElementById('fabAdd'); fab.classList.add('open'); fab.setAttribute('aria-expanded','true');
}
/* opsMenuClose · its layers, innermost first: 1 n203 wrap   (PVX-N387; kept true by flow_t387) */
function opsMenuClose(){ return pvxRun('opsMenuClose',opsMenuClose$base,this,arguments); }
function opsMenuClose$base(){
document.getElementById('opsScrim').classList.remove('open');
document.getElementById('opsMenu').classList.remove('open');
const fab=document.getElementById('fabAdd'); fab.classList.remove('open'); fab.setAttribute('aria-expanded','false');
}
function opsMenuToggle(){ document.getElementById('opsMenu').classList.contains('open') ? opsMenuClose() : opsMenuOpen(); }



const ALERT_WARN_SVG ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ALERT_TYPES = {
normal:    { label:"Normal Operations",        color:"neutral", dot:"var(--s-admitted)", desc:"Clears any active alert and restores the normal Client Display.", headline:"", message:""},
limited:   { label:"Limited Emergency Intake", color:"amber",   dot:"var(--amber)", desc:"High volume; new arrivals may be redirected after assessment.", headline:"Limited Emergency Intake", message:"We are currently experiencing exceptionally high patient volume. New arrivals may be redirected after medical assessment. Please speak with our Client Service team."},
diversion: { label:"Emergency Service Diversion", color:"red",  dot:"var(--priority-p1)", desc:"Not accepting additional emergency patients.", headline:"Emergency Service Diversion", message:"We are currently unable to accept additional emergency patients. Please contact the front desk for assistance locating another emergency hospital."},
custom:    { label:"Custom Announcement",      color:"neutral", dot:"var(--accent)", desc:"Your own headline and message.", headline:"", message:""}
};
let currentAlert = null;
let alertDraftType ="diversion";
let alertModalMode ="new";
function _alertColorClass(type){ const c=(ALERT_TYPES[type]||{}).color; return c==="amber"?"amber":(c==="red"?"red":"neutral"); }
function _heroColorClass(type){ const c=(ALERT_TYPES[type]||{}).color; return c==="amber"?"amber":(c==="red"?"":"neutral"); }
function fmtAlertWhen(v){ if(!v) return""; try{ const d=new Date(v); return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" · "+fmtTime(d); }catch(e){ return""; } }
function toLocalInput(v){ try{ const d=new Date(v); const p=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes()); }catch(e){ return""; } }

 


let _clMarqueeRO=null, _clFsHooked=false;
function _clStopFallback(track){ if(!track) return; if(track._raf){ cancelAnimationFrame(track._raf); track._raf=null; } if(track._fbT){ clearTimeout(track._fbT); track._fbT=null; } }
function _clMarqueeMeasure(){
const wrap=document.querySelector('#view-client .cl-alert-msg-wrap'); if(!wrap) return;
const track=wrap.querySelector('.cl-alert-track'); if(!track) return;
const copy=track.querySelector('.cl-alert-copy'); if(!copy) return;
if(wrap.clientWidth===0) return;
const overflow = copy.scrollWidth > wrap.clientWidth + 2;
if(overflow){
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
track.classList.add('marquee');
const W = track.scrollWidth/2;
const speed = reduce ? 55 : 95;
const dur = Math.max(16, Math.round(W/speed));
track.style.setProperty('--cl-dur', dur+'s');
track.style.animation='none'; void track.offsetWidth; track.style.animation='';
_clMarqueeFallback(track, W, dur);
} else {
_clStopFallback(track);
track.classList.remove('marquee');
track.style.removeProperty('--cl-dur'); track.style.animation=''; track.style.transform='';
}
}
function _clMarqueeFallback(track, W, dur){
_clStopFallback(track);
track._fbT=setTimeout(function(){
const a=getComputedStyle(track).transform;
track._fbT=setTimeout(function(){
const b=getComputedStyle(track).transform;
if(a===b && track.classList.contains('marquee')){
track.style.animation='none';
const pxms=W/(dur*1000); let t0=null;
(function step(ts){ if(!track.classList.contains('marquee')) return; if(t0==null)t0=ts; const x=((ts-t0)*pxms)%W; track.style.transform='translate3d('+(-x)+'px,0,0)'; track._raf=requestAnimationFrame(step); })(performance.now());
}
},170);
},130);
}
function setupAlertMarquee(){
if(_clMarqueeRO){ try{ _clMarqueeRO.disconnect(); }catch(e){} _clMarqueeRO=null; }
const wrap=document.querySelector('#view-client .cl-alert-msg-wrap'); if(!wrap) return;
_clMarqueeMeasure();
if(typeof ResizeObserver!=='undefined'){ _clMarqueeRO=new ResizeObserver(function(){ _clMarqueeMeasure(); }); try{ _clMarqueeRO.observe(wrap); }catch(e){} }
if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ _clMarqueeMeasure(); }).catch(function(){}); }
if(!_clFsHooked){ _clFsHooked=true;
document.addEventListener('fullscreenchange', function(){ setTimeout(_clMarqueeMeasure,60); });
window.addEventListener('resize', function(){ _clMarqueeMeasure(); }); }
}
function renderAlert(){
const a = currentAlert;
const isAlert = !!(a && a.type && a.type!=="normal");
const hero = document.querySelector("#view-client .cl-hero");
if(hero){
if(isAlert && a.show_client!==false){
const head = bcEsc(a.headline || (ALERT_TYPES[a.type]||{}).headline || (ALERT_TYPES[a.type]||{}).label ||"Hospital Alert");
const msg  = bcEsc(a.message  || (ALERT_TYPES[a.type]||{}).message  ||"");
hero.innerHTML ='<div class="cl-alert-hero '+_heroColorClass(a.type)+'">'
+'<div class="cl-alert-ic">'+ALERT_WARN_SVG+'</div>'
+'<div class="cl-alert-body"><div class="cl-alert-title">'+head+'</div>'
+'<div class="cl-alert-msg-wrap"><div class="cl-alert-track">'
+'<span class="cl-alert-msg cl-alert-copy">'+msg+'</span>'
+'<span class="cl-alert-msg cl-alert-copy" aria-hidden="true">'+msg+'</span>'
+'</div></div></div></div>';
try{ setupAlertMarquee(); }catch(e){}
} else {
hero.innerHTML ='<div class="cl-hero-title">'+"We're here for them. You're in good hands."+'</div><div class="cl-hero-sub">'+"Thank you for trusting us with your pet's care."+'</div>';
try{ if(_clMarqueeRO){ _clMarqueeRO.disconnect(); _clMarqueeRO=null; } }catch(e){}
}
}
const strip = document.getElementById("alertStrip");
if(strip){
const lobby = (typeof Backend!=="undefined"&& Backend.mode==="lobby");
if(isAlert && a.show_staff!==false && !lobby){
const t = ALERT_TYPES[a.type] || ALERT_TYPES.custom;
strip.className ="alert-strip show "+ _alertColorClass(a.type).replace("red","");

const canManage = (currentView!=='client');
strip.innerHTML ='<span class="as-dot"></span><span class="as-label">'+bcEsc(t.label)+'</span>'
+'<span class="as-meta">Active since '+fmtAlertWhen(a.effective_at || a.created_at)+'</span>'
+ (canManage ?'<button class="as-manage" id="alertStripManage">Manage</button>':'');
if(canManage){ const mb=document.getElementById("alertStripManage"); if(mb) mb.onclick=openAlertModal; }
} else { strip.className="alert-strip"; strip.innerHTML=""; }
}
try{ window.LunaAnnouncement?.onAlert(a); }catch(e){}
}

/* openAlertModal · its layers, innermost first: 1 n351 wrap   (PVX-N387; kept true by flow_t387) */
function openAlertModal(){ return pvxRun('openAlertModal',openAlertModal$base,this,arguments); }
function openAlertModal$base(){
alertModalMode = currentAlert ?"view":"new";
alertDraftType = currentAlert ? currentAlert.type :"diversion";
renderAlertModal();
document.getElementById("alertScrim").classList.add("open");
document.getElementById("alertModal").classList.add("open");
}
function closeAlertModal(){
const c=document.getElementById("alertConfirm"); if(c) c.remove();
document.getElementById("alertScrim").classList.remove("open");
document.getElementById("alertModal").classList.remove("open");
}
/* renderAlertModal · its layers, innermost first: 1 #53 wrap · 2 #59 after · 3 n370 after · 4 n372 after   (PVX-N387; kept true by flow_t387) */
function renderAlertModal(){ return pvxRun('renderAlertModal',renderAlertModal$base,this,arguments); }
function renderAlertModal$base(){
const body=document.getElementById("alertBody"), foot=document.getElementById("alertFoot");
foot.classList.toggle("drawer-confirm-actions", alertModalMode!=="view");
if(alertModalMode==="view"&& currentAlert){
const t = ALERT_TYPES[currentAlert.type] || ALERT_TYPES.custom;
body.innerHTML ='<div class="alert-active-card '+_alertColorClass(currentAlert.type)+'">'
+'<div class="aac-t">'+bcEsc(t.label)+'</div>'
+'<div class="aac-m">'+bcEsc(currentAlert.message || t.message ||"")+'</div>'
+'<div class="aac-meta">Active since '+fmtAlertWhen(currentAlert.effective_at || currentAlert.created_at)
+ (currentAlert.review_at ?'  ·  Review by '+fmtAlertWhen(currentAlert.review_at) :'')
+ (currentAlert.internal_note ?'<br>Note: '+bcEsc(currentAlert.internal_note) :'') +'</div></div>';
foot.innerHTML ='<button class="btn ghost" id="alertEditBtn">Edit alert</button><button class="btn danger" id="alertEndBtn">End alert</button>';
document.getElementById("alertEditBtn").onclick = function(){ alertModalMode="edit"; alertDraftType=currentAlert.type; renderAlertModal(); };
document.getElementById("alertEndBtn").onclick = function(){ confirmAlert("end"); };
return;
}
const cards = Object.keys(ALERT_TYPES).map(function(k){ const t=ALERT_TYPES[k];
return'<button type="button" class="alert-type'+(alertDraftType===k?" sel":"")+'" data-atype="'+k+'"><span class="at-dot" style="background:'+t.dot+'"></span><span><span class="at-t">'+t.label+'</span><span class="at-s">'+t.desc+'</span></span></button>';
}).join("");
const pre = (currentAlert && currentAlert.type===alertDraftType) ? currentAlert : null;
const t = ALERT_TYPES[alertDraftType];
let form="";
if(alertDraftType==="normal"){
form ='<div class="alert-field" style="color:var(--ink-400);font-size:0.8125rem;line-height:1.45">Selecting Normal Operations clears any active alert and restores the normal Client Display and staff pages.</div>';
} else {
form ='<div class="alert-field"><label>Public headline</label><input type="text" id="alertHeadline" value="'+bcEsc((pre&&pre.headline)||t.headline||"")+'" /></div>'
+'<div class="alert-field"><label>Public message</label><textarea id="alertMessage">'+bcEsc((pre&&pre.message)||t.message||"")+'</textarea></div>'
+'<div class="alert-field"><label>Internal staff note · never shown publicly</label><textarea id="alertNote">'+bcEsc((pre&&pre.internal_note)||"")+'</textarea></div>'
+'<div class="alert-field"><label>Expected review time · optional</label><input type="datetime-local" id="alertReview" value="'+((pre&&pre.review_at)?toLocalInput(pre.review_at):"")+'" /></div>'
+'<div class="alert-toggles"><label class="alert-toggle"><input type="checkbox" id="alertShowClient" '+((!pre||pre.show_client!==false)?"checked":"")+' /> Show on Client Display</label>'
+'<label class="alert-toggle"><input type="checkbox" id="alertShowStaff" '+((!pre||pre.show_staff!==false)?"checked":"")+' /> Show on staff pages</label></div>';
}
body.innerHTML ='<div class="alert-types">'+cards+'</div>'+form;
body.querySelectorAll(".alert-type").forEach(function(el){ el.onclick=function(){ alertDraftType=el.dataset.atype; renderAlertModal(); }; });
const label = alertDraftType==="normal"?"Restore normal":"Activate alert";
foot.innerHTML ='<button type="button" class="cf-btn cancel" id="alertCancelBtn">Cancel</button><button type="button" class="cf-btn go" id="alertActivateBtn">'+label+'</button>';
document.getElementById("alertCancelBtn").onclick = closeAlertModal;
document.getElementById("alertActivateBtn").onclick = function(){
if(alertDraftType==="diversion") confirmAlert("activate");
else if(alertDraftType==="normal") endAlert(false);
else activateAlert();
};
}
function confirmAlert(kind){   /* PVX-N366: the shared alert (it was a dark box of its own inside the sheet) */
const isEnd = kind==="end";
const on = (isEnd && currentAlert) ? currentAlert.type : "diversion", t = ALERT_TYPES[on] || ALERT_TYPES.custom;
if(isEnd) showConfirm(on==="custom" ? "End this announcement?" : "End "+t.label+"?", on==="diversion" ? "End diversion" : "End alert", function(){ endAlert(false); },
  {sub:"The Client Display goes back to its normal message, and the alert leaves staff pages."});
else showConfirm("Activate "+t.label+"?", "Activate diversion", function(){ activateAlert(); },
  {sub:"The Client Display shows the diversion message right away, and every staff page shows the alert.", danger:true});
}
function _alertVal(id){ const el=document.getElementById(id); return el?el.value.trim():""; }
function _alertChecked(id){ const el=document.getElementById(id); return el?el.checked:true; }
async function activateAlert(){
const type = alertDraftType;
const by = (typeof CURRENT_USER!=="undefined"&&CURRENT_USER) ? CURRENT_USER : "Unknown";   /* PVX-N149: the person, not the shared address */
const t = ALERT_TYPES[type] || ALERT_TYPES.custom;
const payload = {
tenant_id: TENANT_ID, type: type,
headline: _alertVal("alertHeadline") || t.headline || t.label,
message: _alertVal("alertMessage") || t.message ||"",
internal_note: _alertVal("alertNote") || null,
show_client: _alertChecked("alertShowClient"),
show_staff: _alertChecked("alertShowStaff"),
review_at: _alertVal("alertReview") || null,
effective_at: new Date().toISOString(),
active: true, created_by: by
};
if(DB && Backend.mode==="staff"){
try{
await DB.collection("alerts").doc(TENANT_ID).set(payload);
currentAlert = payload;
}catch(e){ toast("Couldn’t activate the alert — check the connection and try again"); return; }
} else { currentAlert = payload; }
renderAlert();
closeAlertModal();
notify("Hospital alert activated", bcEsc(t.label), { icon:"info", color: type==="diversion"?"var(--priority-p1)":(type==="limited"?"var(--amber)":"var(--accent)") });
}
async function endAlert(silent){
const by = (typeof CURRENT_USER!=="undefined"&&CURRENT_USER) ? CURRENT_USER : "Unknown";   /* PVX-N149: the person, not the shared address */
if(DB && Backend.mode==="staff"){
try{ await DB.collection("alerts").doc(TENANT_ID).set({ active:false, ended_at:new Date().toISOString(), ended_by:by }, { merge:true }); }catch(e){}
currentAlert = null;
} else { currentAlert = null; }
renderAlert(); closeAlertModal();
if(!silent) notify("Alert ended","Normal operations restored", { icon:"check", color:"var(--s-admitted)"});
}



function enterFullscreen(){
const el=document.documentElement;
const req=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;
if(req){ try{ const p=req.call(el); if(p&&p.catch) p.catch(function(){}); }catch(e){} }
else { document.body.classList.add('fs-mode'); ensureFsExit(); fsPokeExit(); }
}
function exitFullscreen(){
try{ if(document.exitFullscreen) document.exitFullscreen(); else if(document.webkitExitFullscreen) document.webkitExitFullscreen(); }catch(e){}
document.body.classList.remove('fs-mode');
}
function ensureFsExit(){
if(document.getElementById('fsExit')) return;
const b=document.createElement('button'); b.id='fsExit'; b.type='button';
b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/></svg>Exit Full screen';
b.onclick=exitFullscreen; document.body.appendChild(b);
}
let _fsHideTimer=null;
function fsPokeExit(){
if(!document.body.classList.contains('fs-mode')) return;
const b=document.getElementById('fsExit'); if(!b) return;
b.classList.add('show'); clearTimeout(_fsHideTimer);
_fsHideTimer=setTimeout(function(){ b.classList.remove('show'); }, 3000);
}
function _fsActive(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
function showFsHint(){ if(document.getElementById('fsHint')||_fsActive()) return; const h=document.createElement('div'); h.id='fsHint'; h.textContent='Tap anywhere to enter full screen'; document.body.appendChild(h); }
function removeFsHint(){ const h=document.getElementById('fsHint'); if(h) h.remove(); }


function lobbyArmFullscreen(){
if(!document.body.classList.contains('tv-mode')) return;
try{ enterFullscreen(); }catch(e){}
setTimeout(function(){ if(!_fsActive()) showFsHint(); }, 700);
const go=function(){ enterFullscreen(); removeFsHint(); teardown(); };
const teardown=function(){ ['click','keydown','touchstart'].forEach(function(ev){ document.removeEventListener(ev, go, true); }); };
['click','keydown','touchstart'].forEach(function(ev){ document.addEventListener(ev, go, true); });
}
function _onFsChange(){
const fs=!!(document.fullscreenElement||document.webkitFullscreenElement);
document.body.classList.toggle('fs-mode', fs&&(document.body.classList.contains('tv-mode')||document.body.classList.contains('client-mode')));   /* PVX-N194 */
if(fs){ ensureFsExit(); fsPokeExit(); removeFsHint(); }
else { const b=document.getElementById('fsExit'); if(b) b.classList.remove('show'); }
}
if(typeof document!=='undefined'&& document.addEventListener){
['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,_onFsChange); });
document.addEventListener('mousemove', function(){ if(document.body.classList.contains('fs-mode')) fsPokeExit(); });
document.addEventListener('keydown', function(e){ if(e.key==='f'&& document.body.classList.contains('client-mode') && !/input|textarea/i.test((e.target&&e.target.tagName)||'')){ } });
}



const _unreadMsgs = new Set();
let _commOpen = false;
function updateCommMeta(p, count){
const m=document.getElementById('commMeta'); if(!m) return;
if(_unreadMsgs.has(p.id)){ m.className='comm-meta unread'; m.innerHTML='<span class="comm-dot"></span>New'; }
else if(typeof count==='number'&& count>0){ m.className='comm-meta'; m.textContent=count+(count===1?' message':' messages'); }
else { m.className='comm-meta'; m.textContent=''; }
}
function msgBadge(p){ return _unreadMsgs.has(p.id) ?'<span class="msg-badge" title="New family message"></span>':''; }
function makeQR(text){ try{ const qr=qrcode(0,'M'); qr.addData(text); qr.make(); return qr.createSvgTag({cellSize:4,margin:0,scalable:true}); }catch(e){ return''; } }
function trackUrlFor(p){ return'https://shoreline.pravix.app/track.html?t='+ (p.publicToken||''); }

function renderMessages(p){
const mount=document.getElementById('messagesMount'); if(!mount) return;
const url=trackUrlFor(p);
mount.innerHTML =
'<div class="msg-sect">'
+'<button class="comm-head" id="commHead" aria-expanded="'+(_commOpen?'true':'false')+'"><span class="comm-headwrap"><span class="sect-title">Messages</span><span class="comm-meta" id="commMeta"></span></span>'
+'<svg class="comm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg></button>'
+'<div class="comm-body'+(_commOpen?'':' collapsed')+'" id="commBody">'
+'<div class="msg-track"><div class="mqr">'+(p.publicToken?makeQR(url):'')+'</div>'
+'<div class="mt-main"><div class="mt-code">Check-in code<b>'+bcEsc(p.trackCode||'—')+'</b></div>'
+'<div class="mt-acts"><button type="button" class="mt-copy" id="msgCopyLink" title="Copy the family’s tracker link"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7h6.5L19 10.5V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><path d="M5 16V5a2 2 0 0 1 2-2h6"/></svg><span>Copy tracker link</span></button>'+'<button type="button" class="mt-copy mt-share" id="msgShareLink" aria-label="Share tracker link…" title="Share the tracker link: Messages, Mail, AirDrop…" hidden><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M8 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg><span>Share…</span></button></div>'+'</div></div>'
+'<div class="msg-thread" id="msgThread">'+(window.pvxWaitHTML?pvxWaitHTML('msgs'):'<div class="msg-empty">Loading…</div>')+'</div>'
+'<div class="msg-compose"><textarea id="msgBox" rows="1" placeholder="Message" aria-label="Message to the family" enterkeyhint="send" autocapitalize="sentences"></textarea>'
+'<button class="msg-send" id="msgSendBtn" disabled aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="6 11 12 5 18 11"/></svg></button></div>'
+'</div></div>';
const commHead=document.getElementById('commHead'), commBody=document.getElementById('commBody');
commHead.onclick=function(){
_commOpen=!_commOpen;
commHead.setAttribute('aria-expanded', _commOpen?'true':'false');
commBody.classList.toggle('collapsed', !_commOpen);
if(_commOpen && _unreadMsgs.has(p.id)){ _unreadMsgs.delete(p.id); updateCommMeta(p); try{ renderTable(); renderBoard(); }catch(e){} }
};
updateCommMeta(p);
const copyBtn=document.getElementById('msgCopyLink');
copyBtn.onclick=function(){ pvxCopyTracker(url); };   /* PVX-N356: Copy copies; Share opens the share sheet */
const shareBtn=document.getElementById('msgShareLink'); if(shareBtn){ shareBtn.hidden=!pvxCanShare(); shareBtn.onclick=function(){ pvxShareTracker(url, (p.name||'')+(p.last?' '+p.last:'')); }; }
const box=document.getElementById('msgBox'), sbtn=document.getElementById('msgSendBtn');
box.addEventListener('input',function(){ box.style.height='auto'; box.style.height=Math.min(box.scrollHeight,110)+'px'; sbtn.disabled=!box.value.trim(); });
box.addEventListener('keydown',function(e){ if(e.key==='Enter'&& !e.shiftKey){ e.preventDefault(); if(box.value.trim()) sendStaffMsg(p, box.value.trim()); } });
sbtn.onclick=function(){ if(box.value.trim()) sendStaffMsg(p, box.value.trim()); };
loadThread(p);
}
async function loadThread(p){
const el=document.getElementById('msgThread'); if(!el || !DB) return;
if(!p.publicToken){ updateCommMeta(p, 0); el.innerHTML='<div class="msg-empty">No messages yet. Share the tracker link or QR above, or send the family a note.</div>'; return; }
let msgs=[];
try{
const q=await DB.collection('messages').doc(p.publicToken).collection('items').orderBy('created_at','asc').get();
msgs=q.docs.map(function(d){ const m=d.data(); return { sender:m.sender, body:m.body, staff_name:m.staff_name||null }; });
}catch(e){ el.innerHTML='<div class="msg-empty" role="status">Couldn’t get the messages. Check the connection. <button type="button" class="pvx-wait-retry" data-pvx-retry="msgs">Try again</button></div>'; return; }   /* PVX-N365 */
updateCommMeta(p, msgs.length);
if(!msgs.length){ el.innerHTML='<div class="msg-empty">No messages yet. Share the tracker link or QR above, or send the family a note.</div>'; return; }
el.innerHTML=msgs.map(function(m){ const staff=m.sender==='staff';
return'<div class="msg-row '+(staff?'staff':'client')+'"><div class="msg-b">'+bcEsc(m.body)+'</div></div>'; }).join('');
el.scrollTop=el.scrollHeight;
}
async function sendStaffMsg(p, body){
if(!body) return;
const box=document.getElementById('msgBox'); if(box){ box.value=''; box.style.height='auto'; }
const sbtn=document.getElementById('msgSendBtn'); if(sbtn) sbtn.disabled=true;
if(DB && Backend.mode==='staff'){
if(!p.publicToken){ p.publicToken=genToken(); if(!p.trackCode) p.trackCode=genTrackCode(); persist(); }
try{
await DB.collection('messages').doc(p.publicToken).collection('items').add({ tenant_id:TENANT_ID, visit_id:String(p.id), sender:'staff', body:body, staff_name:CURRENT_USER, created_at:new Date().toISOString() });
}catch(e){ toast('Couldn’t send the message — check the connection and try again'); if(sbtn) sbtn.disabled=false; return; }
}
loadThread(p);
}

/* opsAction · its layers, innermost first: 1 #54 wrap   (PVX-N387; kept true by flow_t387) */
function opsAction(op){ return pvxRun('opsAction',opsAction$base,this,arguments); }
function opsAction$base(op){
opsMenuClose();
if(op==='new') setTimeout(openAddPatient,120);
else if(op==='shift') setTimeout(openShiftSetup,120);
else if(op==='alert') setTimeout(openAlertModal,120);
else if(op==='print') setTimeout(function(){ if(window.pvxPrintView) pvxPrintView(); },160);
}






const SHIFTS = (window.Pravix && Pravix.getShifts) ? Pravix.getShifts() : [
{key:'morning',   label:'Morning ER',  color:'#283f7a'},
{key:'critical',  label:'Criticalist', color:'#a05c9e'},
{key:'swing',     label:'Swing',       color:'#e17355'},
{key:'overnight', label:'Overnight',   color:'#68c1e0'}
];
const shiftColor = key => (SHIFTS.find(s=>s.key===key)||{}).color;
let shiftAssign = {morning:null, critical:null, swing:null, overnight:null};
let shiftDraft = null, shiftDDs = {};
let _shiftModalOpen = false;
const RELIEF = {id:'relief', name:'Relief Doctor', initials:'RD', color:'#7A9BB5'};
const NO_DOC  = {id:'unassigned', name:'Unassigned', initials:'—', color:'#A9C0D4'};


function shiftOfDoctor(id){ for(const s of SHIFTS){ if(shiftAssign[s.key]===id) return s.key; } return null; }

function applyShiftColors(){
DOCTORS.forEach(d=>{ d.color=d.baseColor; });
SHIFTS.forEach(s=>{ const did=shiftAssign[s.key]; if(did && did!=='unassigned'&& did!=='relief'){ const d=DOCTORS.find(x=>x.id===did); if(d) d.color=s.color; } });
}
function openShiftSetup(){
_shiftModalOpen = true;
shiftDraft = Object.assign({}, shiftAssign);
shiftDDs = {};
const grid=document.getElementById('shiftGrid'); grid.innerHTML='';
SHIFTS.forEach(s=>{
const card=document.createElement('div'); card.className='shift-card';
card.innerHTML=`<span class="shift-bar" style="background:${s.color}"></span>
      <div class="shift-body">
        <div class="shift-name"><span class="shift-dot" style="background:${s.color};color:${s.color}"></span>${s.label}</div>
        <div class="shift-mount"></div>
      </div>`;
grid.appendChild(card);
const items=[NO_DOC, ...DOCTORS, RELIEF];
const dd=createDropdown({items, selectedId: shiftDraft[s.key]||'unassigned',
placeholder:'Assign a doctor', searchPlaceholder:'Search doctors…',
onSelect:id=>{ shiftDraft[s.key] = (id==='unassigned'? null : id); }});
card.querySelector('.shift-mount').appendChild(dd);
shiftDDs[s.key]=dd;
});
document.getElementById('shiftScrim').classList.add('open');
document.getElementById('shiftModal').classList.add('open');
}
function closeShiftSetup(){
_shiftModalOpen = false;
document.getElementById('shiftScrim').classList.remove('open');
document.getElementById('shiftModal').classList.remove('open');
}
async function saveShiftSetup(){
const draft = Object.assign({}, shiftDraft);
const btn = document.getElementById('shiftSave');
if(btn) btn.disabled = true;

if(DB && Backend.mode==='staff'){
try{
await DB.collection('shifts').doc(TENANT_ID).set(
{ tenant_id: TENANT_ID, assignments: draft, updated_at: new Date().toISOString() }, { merge:true });
}catch(e){ if(btn) btn.disabled=false; toast('Couldn’t save the shift assignments — check the connection and try again'); return; }
}
shiftAssign = draft;
applyShiftColors();
if(btn) btn.disabled = false;
closeShiftSetup();
renderAll();
const n=SHIFTS.filter(s=>shiftAssign[s.key]).length;
notify('Shift assignments saved', n+' of '+SHIFTS.length+' shifts staffed · synced to all devices', {icon:'doctor', color:'var(--accent)'});
}



let pvTimer=null, pvHide=null, pvPid=null, pvShown=false;
function previewHtml(p){
const t=getTriage(p), v=t.vitals||{}, a=t.assess||{};
const NR='<span class="pv-nr">Not recorded</span>';
const vit=key=>{ const val=v[key]; return (val!=null&&val!=='')?val:NR; };
const ass=key=>{ const val=a[key]; return (val!=null&&val!=='')?bcEsc(val):NR; };
const lastEv=(p.timeline&&p.timeline.length)?p.timeline[p.timeline.length-1]:null;
const docLine=p.doctor==='unassigned'?NR:`${docAv(p.doctor)}${doc(p.doctor).name}`;
return`
    <div class="pv-name">${bcEsc(p.name+' '+(p.last||'')).trim()}</div>
    <div class="pv-sub">${bcEsc(p.species)} • ${bcEsc(formatPatientAge(p)||'—')} • ${bcEsc(p.breed||'—')}</div>
    <div class="pv-owner">Owner · ${p.owner?bcEsc(p.owner):NR}</div>
    <div class="pv-pills">${statusPill(p.status)}<span class="pill prio-${p.prio}">P${p.prio}</span>
      <span class="pill" style="color:var(--ink-500);background:var(--fill-soft)">${bcEsc(p.room)}</span></div>
    <div class="pv-row"><span class="pv-k">Doctor</span><span class="pv-v">${docLine}</span></div>
    <div class="pv-row"><span class="pv-k">Reason</span><span class="pv-v">${p.reason?bcEsc(p.reason):NR}</span></div>
    <div class="pv-sect">Triage Snapshot</div>
    <div class="pv-grid">
      <div class="pv-stat"><i>Weight</i><b>${vit('weight')}</b></div>
      <div class="pv-stat"><i>Temp</i><b>${vit('temp')}</b></div>
      <div class="pv-stat"><i>Heart rate</i><b>${vit('hr')}</b></div>
      <div class="pv-stat"><i>Resp. Rate</i><b>${vit('rr')}</b></div>
      <div class="pv-stat"><i>Mentation</i><b>${ass('mentation')}</b></div>
      <div class="pv-stat"><i>MM</i><b>${ass('mm')}</b></div>
      <div class="pv-stat"><i>CRT</i><b>${ass('crt')}</b></div>
    </div>
    <div class="pv-sect">Recent Activity</div>
    <div class="pv-row"><span class="pv-k">Last</span><span class="pv-v">${lastEv? bcEsc(lastEv.label)+' · '+fmtTime(lastEv.at) : NR}</span></div>
    <div class="pv-row"><span class="pv-k">In hospital</span><span class="pv-v">${fmtWait(waitMinutes(p))}</span></div>`;
}
function showPreview(pid, anchor){
const p=PATIENTS.find(x=>x.id===pid); if(!p) return;
const pv=document.getElementById('patientPreview');
pv.innerHTML=previewHtml(p); pvPid=pid; pvShown=true;
pv.style.visibility='hidden'; pv.classList.add('show');
const r=anchor.getBoundingClientRect(), pw=pv.offsetWidth, ph=pv.offsetHeight, M=10, vw=innerWidth, vh=innerHeight;
let left=r.right+12; if(left+pw>vw-M) left=r.left-pw-12; if(left<M) left=Math.max(M, vw-pw-M);
let top=r.top;       if(top+ph>vh-M) top=vh-M-ph;         if(top<M) top=M;
pv.style.left=left+'px'; pv.style.top=top+'px'; pv.style.visibility='';
}
function hidePreview(){ const pv=document.getElementById('patientPreview'); pv.classList.remove('show'); pvShown=false; pvPid=null; }
document.addEventListener('mouseover',e=>{
if(e.target.closest && e.target.closest('#patientPreview')){ clearTimeout(pvHide); return; }
if(dragId||roomDragId) return;
const el=e.target.closest && e.target.closest('[data-pid]');
if(!el || !el.dataset.pid || !PATIENTS.some(x=>x.id===el.dataset.pid)) return;
if(currentView!=='list'|| !el.closest('#tableBody')) return;
clearTimeout(pvHide);
if(pvShown && pvPid===el.dataset.pid) return;
clearTimeout(pvTimer);
if(pvShown){ showPreview(el.dataset.pid, el); }
else { pvTimer=setTimeout(()=>showPreview(el.dataset.pid, el), 500); }
});
document.addEventListener('mouseout',e=>{
const to=e.relatedTarget;
if(to && to.closest && to.closest('#patientPreview')) return;
const fromEl=e.target.closest && e.target.closest('[data-pid]');
const toEl=to && to.closest ? to.closest('[data-pid]') : null;
if(fromEl && fromEl!==toEl){ clearTimeout(pvTimer); clearTimeout(pvHide); pvHide=setTimeout(hidePreview,180); }
});
document.getElementById('patientPreview').addEventListener('mouseenter',()=>clearTimeout(pvHide));
document.getElementById('patientPreview').addEventListener('mouseleave',()=>{ clearTimeout(pvHide); pvHide=setTimeout(hidePreview,160); });
window.addEventListener('scroll',()=>{ if(pvShown) hidePreview(); }, true);
/* n93 — the hover card never gets stuck. Live updates redraw the table under the cursor, and Safari then skips the mouseout,
   so the card stayed up. Now: it only opens if the pointer is still on that patient when the 0.5 s delay ends, and any pointer
   move that is not over the card or that patient's row closes it; so does a click, Esc, switching view, or leaving the window. */
(function(){
  let px=-1, py=-1, raf=0;
  function overOwner(){ if(px<0) return false; const el=document.elementFromPoint(px,py); if(!el) return false;
    if(el.closest('#patientPreview')) return true; const row=el.closest('[data-pid]'); return !!(row&&row.dataset.pid===pvPid&&row.closest('#tableBody')); }
  function check(){ raf=0; if(pvShown&&!overOwner()){ clearTimeout(pvHide); pvHide=setTimeout(function(){ if(pvShown&&!overOwner()) hidePreview(); },120); } }
  document.addEventListener('pointermove',e=>{ px=e.clientX; py=e.clientY; if(pvShown&&!raf) raf=requestAnimationFrame(check); },{passive:true,capture:true});
  const _show=showPreview;
  showPreview=function(pid,anchor){ if(px>=0){ const el=document.elementFromPoint(px,py), row=el&&el.closest&&el.closest('[data-pid]'); if(!row||row.dataset.pid!==pid) return; }
    if(currentView!=='list') return; return _show.apply(this,arguments); };
  function closeNow(){ clearTimeout(pvTimer); if(pvShown) hidePreview(); }
  document.addEventListener('pointerdown',e=>{ if(!(e.target.closest&&e.target.closest('#patientPreview'))) closeNow(); },true);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeNow(); });
  window.addEventListener('blur',closeNow);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState!=='visible') closeNow(); });
  document.documentElement.addEventListener('mouseleave',closeNow);
  setInterval(function(){ if(pvShown&&(currentView!=='list'||!overOwner())) closeNow(); },1500);
})();


document.getElementById('switcher').addEventListener('click',e=>{const b=e.target.closest('.seg');if(b)switchView(b.dataset.view);});
var _sl=document.getElementById('searchLuna'); if(_sl) _sl.onclick=()=>document.getElementById('globalSearch').focus();
var _rsl=document.getElementById('rdSearchLuna'); if(_rsl) _rsl.onclick=()=>{var r=document.getElementById('rdSearch'); if(r) r.focus();};


(function(){
function attachCaret(si){
var bar=si?si.closest('.search-bar'):null; if(!si||!bar) return;
function updCaret(){
var active = si.matches(':focus') && si.value.length===0;
bar.classList.toggle('caret-active',active);
si.classList.toggle('custom-caret-active',active);
}
si.addEventListener('focus',updCaret);
si.addEventListener('blur',updCaret);
si.addEventListener('input',updCaret);
}
document.querySelectorAll('.search .search-input').forEach(attachCaret);
})();

document.getElementById('fabAdd').onclick=opsMenuToggle;
document.getElementById('opsScrim').onclick=opsMenuClose;
document.getElementById('opsMenu').addEventListener('click',e=>{const b=e.target.closest('.ops-item'); if(b) opsAction(b.dataset.op);});
document.getElementById('shiftClose').onclick=closeShiftSetup;
document.getElementById('shiftScrim').onclick=closeShiftSetup;
document.getElementById('shiftCancel').onclick=closeShiftSetup;
document.getElementById('shiftSave').onclick=saveShiftSetup;
document.getElementById('alertClose').onclick=closeAlertModal;
document.getElementById('alertScrim').onclick=closeAlertModal;
(function(){ const fb=document.getElementById('fsBtn'); if(fb) fb.onclick=enterFullscreen; })();
document.getElementById('apClose').onclick=closeAddPatient;
document.getElementById('apCancel').onclick=closeAddPatient;
document.getElementById('apScrim').onclick=closeAddPatient;
document.getElementById('apCreate').onclick=createPatient;


FlowIntakeStore.onChange(function(){ try{ renderClientQueue(); renderAttention(); }catch(e){} });
document.getElementById('apArrival').addEventListener('click',e=>{const b=e.target.closest('.ap-seg-btn'); if(b) apSetArrival(b.dataset.arrival);});
document.getElementById('apPrio').addEventListener('click',e=>{const b=e.target.closest('.ap-prio-btn'); if(b) apSetPrio(+b.dataset.prio);});


[['apName',fmtTitleCase],['apOwner',fmtTitleCase],['apPhone',fmtPhone],['apAge',fmtAge]].forEach(([id,fn])=>{
const el=document.getElementById(id); if(!el) return;
el.addEventListener('blur',()=>{ if(!(id==='apAge'&&/^\d+$/.test(el.value.trim()))) el.value=fn(el.value); });
el.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!(id==='apAge'&&/^\d+$/.test(el.value.trim()))) el.value=fn(el.value); });
});

(function(){
const el=document.getElementById('apWeight'), hint=document.getElementById('apWeightHint');
if(!el) return;
function normalize(){
const bareW=/^\d+(?:\.\d+)?$/.test(el.value.trim()), uW=document.querySelector('[data-unit-for="apWeight"] [aria-checked=true]');   /* PVX-N193 */
const res=parseWeightInput(bareW?el.value.trim()+' '+(uW?uW.getAttribute('data-u'):'kg'):el.value);
if(res.valid){ if(!bareW) el.value=res.display; apWeightKg=res.kg; if(hint) hint.classList.remove('show'); }
else if(res.empty){ apWeightKg=null; if(hint) hint.classList.remove('show'); }
else { apWeightKg=null; if(hint) hint.classList.add('show'); }
}
el.addEventListener('input',()=>{ if(hint && hint.classList.contains('show') && parseWeightInput(el.value).valid) hint.classList.remove('show'); });
el.addEventListener('blur', normalize);
el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key==='Tab') normalize(); });
})();

document.getElementById('apBreed').addEventListener('focus',()=>{ bcHl=-1; breedRefresh(); });
document.getElementById('apBreed').addEventListener('input',()=>{ bcHl=-1; breedRefresh(); });
document.getElementById('apBreed').addEventListener('keydown',breedKey);
document.getElementById('apSpecies').addEventListener('change',()=>{

const bi=bcInput(); const sp=breedSpecies();
if(bi && bi.value && (sp==='Feline'||sp==='Canine')){
const v=bi.value.toLowerCase();
const ok = (sp==='Feline'?FELINE_BREEDS:CANINE_BREEDS).some(b=>b.name.toLowerCase()===v);
if(!ok) bi.value='';
}
bcHl=-1; if(bcOpen) breedRefresh();
});
document.addEventListener('mousedown',e=>{ if(bcOpen && !e.target.closest('.bc-wrap')) breedClose(); });



document.getElementById('apSex').addEventListener('focus',()=>{ sxHl=-1; sxRefresh(); });
document.getElementById('apSex').addEventListener('input',()=>{ sxHl=-1; sxRefresh(); });
document.getElementById('apSex').addEventListener('keydown',sxKey);
document.addEventListener('mousedown',e=>{ if(sxOpen && !e.target.closest('.bc-wrap')) sxClose(); });
document.getElementById('drawerClose').onclick=closeDrawer;
document.getElementById('scrim').onclick=function(e){   /* PVX-N210: on wide screens, clicking another patient switches the drawer */
  if(window.innerWidth>=1024&&e&&e.clientX!=null){   /* PVX-N367: from 1024 pt, where the drawer leaves 584 pt of the view beside it */
    var sc=document.getElementById('scrim'), old=sc.style.pointerEvents; sc.style.pointerEvents='none';
    var under=document.elementFromPoint(e.clientX,e.clientY); sc.style.pointerEvents=old;
    var it=under&&under.closest&&under.closest('#board .card[data-pid],#tableBody tr[data-pid],.r-pt[data-pid],.room[data-pid],#view-dashboard .attn-item[data-pid]');
    if(it&&it.dataset.pid&&it.dataset.pid!==activePatient&&PATIENTS.some(function(x){ return x.id===it.dataset.pid; })){ openDrawer(it.dataset.pid); return; }
  }
  closeDrawer(); };
document.getElementById('locClose').onclick=closeLocDrawer;
document.getElementById('attnClearAll').onclick=()=>showConfirm('Clear all attention items?','Clear all',clearAllAlerts,
{sub:'This will dismiss the current alerts. Patient records will not be changed.', danger:true});
document.getElementById('intakeClose').onclick=closeIntake;
document.getElementById('intakeScrim').onclick=closeIntake;
document.getElementById('intakeCancel').onclick=closeIntake;
document.getElementById('intakeSave').onclick=()=>commitIntake();
document.getElementById('intakeComplete').onclick=()=>commitIntake('complete');
document.getElementById('triEditClose').onclick=closeTriageEdit;
document.getElementById('triEditScrim').onclick=closeTriageEdit;
document.getElementById('triEditCancel').onclick=closeTriageEdit;
document.getElementById('triEditSave').onclick=saveTriageEdit;
(function(){var db=document.getElementById('dischargeBtn'); if(!db) return;
db.addEventListener('pointermove',function(e){ var r=db.getBoundingClientRect(); db.style.setProperty('--mx',(e.clientX-r.left)+'px'); db.style.setProperty('--my',(e.clientY-r.top)+'px'); });
db.addEventListener('pointerleave',function(){ db.style.setProperty('--mx','50%'); db.style.setProperty('--my','50%'); });
})();
(function(){var lb=document.getElementById('logoutBtn'); if(!lb) return;
lb.addEventListener('pointermove',function(e){ var r=lb.getBoundingClientRect(); lb.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%'); lb.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%'); });
lb.addEventListener('pointerleave',function(){ lb.style.setProperty('--mx','50%'); lb.style.setProperty('--my','50%'); });
})();


let _dispBusy=false, _dispUndoTimer=null;
const DISP_ICON={
admit:'<path d="M14 21V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v17"/><path d="M3 21h16"/><circle cx="11" cy="12" r="1"/>',
discharge:'<path d="M3 8v10"/><path d="M3 12h15a3 3 0 0 1 3 3v3"/><path d="M3 18h18"/><circle cx="8" cy="9.5" r="1.6"/>',
euth:'<path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10z"/>'
};
function dispFirstName(p){ return (p&&p.name)?String(p.name).split(' ')[0]:'Patient'; }
/* captureDispSnap · its layers, innermost first: 1 #17 wrap   (PVX-N387; kept true by flow_t387) */
function captureDispSnap(p){ return pvxRun('captureDispSnap',captureDispSnap$base,this,arguments); }
function captureDispSnap$base(p){ return {status:p.status,completed:p.completed,active:p.active,completedAt:p.completedAt,dischargedAt:p.dischargedAt,admittedAt:p.admittedAt,euthanizedAt:p.euthanizedAt,totalMin:p.totalMin,totalTimeInHospital:p.totalTimeInHospital,room:p.room,roomSince:p.roomSince,tlLen:(p.timeline?p.timeline.length:0)}; }
/* restoreDispSnap · its layers, innermost first: 1 #17 wrap   (PVX-N387; kept true by flow_t387) */
function restoreDispSnap(p,s){ return pvxRun('restoreDispSnap',restoreDispSnap$base,this,arguments); }
function restoreDispSnap$base(p,s){ p.status=s.status;p.completed=s.completed;p.active=s.active;p.completedAt=s.completedAt;p.dischargedAt=s.dischargedAt;p.admittedAt=s.admittedAt;p.euthanizedAt=s.euthanizedAt;p.totalMin=s.totalMin;p.totalTimeInHospital=s.totalTimeInHospital;p.room=s.room;p.roomSince=s.roomSince;if(p.timeline&&typeof s.tlLen==='number')p.timeline.length=s.tlLen; }
/* renderDisposition · its layers, innermost first: 1 #17 after · 2 n253-admit wrap   (PVX-N387; kept true by flow_t387) */
function renderDisposition(p){ return pvxRun('renderDisposition',renderDisposition$base,this,arguments); }
function renderDisposition$base(p){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(!acts||!conf) return;
if(conf){ conf.className='disp-confirm'; conf.innerHTML=''; }
acts.classList.remove('mutation-locked');
acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.remove('processing','compress','errored'));
if(isCompleted(p)){
const map={ Admitted:['Admitted','Inpatient care active',DISP_ICON.admit],
Discharged:['Discharged','Visit completed',DISP_ICON.discharge],
Euthanized:['Visit closed','Recorded in Completed Today',DISP_ICON.euth],
Deceased:['Visit closed','Recorded in Completed Today',DISP_ICON.euth] };
const m=map[p.status]||map.Discharged;
acts.style.display='none';
conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-terminal"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+m[2]+'</svg></span><span class="dc-body"><span class="dc-title">'+m[0]+'</span><span class="dc-desc">'+m[1]+'</span></span></div>';
return;
}
acts.style.display='';
}
/* openDispConfirm · its layers, innermost first: 1 #17 wrap · 2 n253-admit wrap   (PVX-N387; kept true by flow_t387) */
function openDispConfirm(kind){ return pvxRun('openDispConfirm',openDispConfirm$base,this,arguments); }
function openDispConfirm$base(kind){
const p=PATIENTS.find(x=>x.id===activePatient);
if(!p||_dispBusy||isCompleted(p)) return;
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.add('compress'));
const isAdmit=kind==='admit', nm=dispFirstName(p);
const q=isAdmit?('Admit '+nm+'?'):('Discharge '+nm+'?');
const sub=isAdmit?('Move '+nm+' into inpatient care.'):('Complete '+nm+'’s active visit.');
const go=isAdmit?'Admit':'Discharge';
conf.className='disp-confirm mounted';
conf.innerHTML='<div class="confirmation '+(isAdmit?'from-admit':'from-discharge')+'" role="group" aria-label="'+q+'">'
+'<div class="cf-q">'+q+'</div><div class="cf-sub">'+sub+'</div>'
+'<div class="cf-row"><button type="button" class="cf-btn cancel" data-cf="cancel">Cancel</button>'
+'<button type="button" class="cf-btn go" data-cf="go" data-kind="'+kind+'">'+go+'</button></div></div>';
const surface=conf.querySelector('.confirmation'); if(surface) requestAnimationFrame(()=>surface.classList.add('open'));
const goBtn=conf.querySelector('.cf-btn.go'); if(goBtn) goBtn.focus();
}
/* closeDispConfirm · its layers, innermost first: 1 #17 after   (PVX-N387; kept true by flow_t387) */
function closeDispConfirm(){ return pvxRun('closeDispConfirm',closeDispConfirm$base,this,arguments); }
function closeDispConfirm$base(){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(acts) acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.remove('compress'));
if(conf){ conf.className='disp-confirm'; conf.innerHTML=''; }
}
/* submitDisp · its layers, innermost first: 1 n253-admit wrap   (PVX-N387; kept true by flow_t387) */
function submitDisp(kind){ return pvxRun('submitDisp',submitDisp$base,this,arguments); }
function submitDisp$base(kind){
let p=PATIENTS.find(x=>x.id===activePatient);
if(!p||_dispBusy) return;
if(isCompleted(p)){ showDispConflict(p); return; }
const pid=p.id;
_dispBusy=true;
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
acts.classList.add('mutation-locked');
const card=acts.querySelector('.disposition-card.'+kind); if(card) card.classList.add('processing');
conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-terminal" aria-live="polite"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/></svg></span><span class="dc-body"><span class="dc-title">'+(kind==='admit'?'Admitting…':'Discharging…')+'</span><span class="dc-desc">Saving to record</span></span></div>';
setTimeout(function(){
p=PATIENTS.find(x=>x.id===pid)||p;   /* n252: the board may have refreshed during "Admitting…" */
if(isCompleted(p)){ _dispBusy=false; showDispConflict(p); return; }
const snap=captureDispSnap(p);
let failed=false;
try{
completePatient(p, kind==='admit'?'Admitted':'Discharged');
if(p.timeline&&p.timeline.length){ const ev=p.timeline[p.timeline.length-1]; ev.meta=(ev.meta?ev.meta+' · ':'')+CURRENT_USER; }
}catch(e){ failed=true; }
setTimeout(function(){
_dispBusy=false;
p=PATIENTS.find(x=>x.id===pid)||p;   /* n252 */
const connBad=(typeof Backend!=='undefined'&&Backend&&Backend.conn==='error');
if(failed||connBad){ restoreDispSnap(p,snap); try{renderAll();}catch(_){}
if(activePatient===p.id) fillDrawer(p); showDispError(p,kind); return; }
if(activePatient===p.id) fillDrawer(p);
showUndo(p, kind, snap);
}, 360);
}, 430);
}
function showDispError(p,kind){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(acts){ acts.classList.remove('mutation-locked'); acts.style.display='';
acts.querySelectorAll('.disposition-card').forEach(c=>c.classList.remove('processing','compress'));
const card=acts.querySelector('.disposition-card.'+kind); if(card) card.classList.add('errored'); }
if(conf){ conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-terminal" style="grid-template-columns:1fr" role="alert"><span class="dc-body"><span class="dc-title" style="color:rgba(232,152,146,.96)">'+(kind==='admit'?'Couldn’t admit · Try again':'Couldn’t discharge · Try again')+'</span><span class="dc-desc">No patient state was changed</span></span></div>'; }
}
function showDispConflict(p){
const acts=document.getElementById('dispActions'), conf=document.getElementById('dispConfirm');
if(acts){ acts.style.display='none'; acts.classList.remove('mutation-locked'); }
if(conf){ conf.className='disp-confirm mounted';
conf.innerHTML='<div class="disp-conflict" role="alert"><div class="cfl-t">Patient status changed</div><div class="cfl-s">This patient’s disposition was updated on another workstation.</div><button type="button" class="cf-btn go" data-cf="refresh">Refresh state</button></div>'; }
}
/* showUndo · its layers, innermost first: 1 n365 after   (PVX-N387; kept true by flow_t387) */
function showUndo(p,kind,snap){ return pvxRun('showUndo',showUndo$base,this,arguments); }
function showUndo$base(p, kind, snap){
const t=document.getElementById('undoToast'); if(!t) return;
clearTimeout(_dispUndoTimer);
const nm=dispFirstName(p), verb=(kind==='admit'?'admitted':kind==='euthanasia'?'· euthanasia recorded':kind==='died'?'· death recorded':'discharged');
t.innerHTML='<span class="ut-msg">'+bcEsc(nm)+' '+verb+'</span><button type="button" class="ut-undo">Undo</button><span class="undo-progress" aria-hidden="true"></span>';
t.classList.remove('open'); void t.offsetWidth; t.classList.add('open');
const undoBtn=t.querySelector('.ut-undo');
if(undoBtn) undoBtn.onclick=function(){
clearTimeout(_dispUndoTimer); hideUndo();
p=(window.fvCurPatient?fvCurPatient(p):p);   /* n252 */
restoreDispSnap(p, snap);
try{ if(typeof rdOnFlowUndo==='function') rdOnFlowUndo(p); }catch(_){}
try{ renderAll(); }catch(_){}
if(activePatient===p.id) fillDrawer(p);
notify('Reverted', bcEsc(nm)+' · disposition undone', {icon:'move', color:'var(--accent)'});
};
try{ if(window.pvxUndo&&undoBtn){ var __uo=undoBtn.onclick, __e=pvxUndo.push({label:nm+' '+verb, pid:p.id, undo:function(){ if(!t.classList.contains('open')||!undoBtn.isConnected){ notify('Can’t undo',bcEsc(nm)+' '+verb+' · Undo is offered for 5 seconds after',{icon:'info',color:'var(--accent)'}); if(window.pvxSay) pvxSay('Can’t undo: '+nm+' '+verb); return false; } __uo.call(undoBtn); }});
  undoBtn.onclick=function(){ if(!pvxUndo.undoEntry(__e)) __uo.call(undoBtn); }; } }catch(_){}   /* PVX-N350 */
_dispUndoTimer=setTimeout(function(){ hideUndo(); }, 5000);
}
function hideUndo(){ const t=document.getElementById('undoToast'); if(!t) return; t.classList.remove('open');
setTimeout(function(){ if(!t.classList.contains('open')) t.innerHTML=''; }, 240); }
(function initDisposition(){
document.addEventListener('click', function(e){
if(!e.target||!e.target.closest) return;
const cf=e.target.closest('[data-cf]');
if(cf){ const a=cf.dataset.cf;
if(a==='cancel') closeDispConfirm();
else if(a==='go') submitDisp(cf.dataset.kind);
else if(a==='refresh'){ const p=PATIENTS.find(x=>x.id===activePatient); if(p) fillDrawer(p); }
return; }
const card=e.target.closest('.disposition-card');
if(card && card.closest('#dispActions') && !card.hasAttribute('disabled')){ openDispConfirm(card.dataset.disp); }
});
document.addEventListener('keydown', function(e){
if(e.key==='Escape'){ const conf=document.getElementById('dispConfirm');
if(conf && conf.querySelector('.confirmation')){ e.stopPropagation(); closeDispConfirm(); } }
}, true);
})();

 
function toggleDark(){document.body.classList.toggle('dark');


try{ if(window.__pvxPaintCanvas) window.__pvxPaintCanvas(document.body.classList.contains('dark')?'dark':'light'); }catch(e){}
try{ document.cookie ='pvx_theme='+(document.body.classList.contains('dark')?'dark':'light')+';domain=.pravix.app;path=/;max-age=31536000;SameSite=Lax'; }catch(e){}
if(!document.body.classList.contains('dark')){const m=document.getElementById('mesh');if(m)m.style.transform='none';}}
/* Clear only per-user clinical UI mirrors; keep theme/accessibility settings.
   The server remains authoritative for all medical records and handoff queues. */
function pvxClearPrivateLocalState(){
  try{
    var remove = ['pravix_client_intakes','pravix_intake_analytics','pvx:flow:where','pvx:kpi:v1','wd_trend_v1'];
    remove.forEach(function(k){localStorage.removeItem(k)});
    for(var i=localStorage.length-1;i>=0;i--){
      var k=localStorage.key(i);
      if(k && /^pravix:[^:]+:(?:rounds:(?:tomorrow|actor)|usdocstatus):/.test(k))
        localStorage.removeItem(k);
    }
  }catch(e){console.warn('[privacy] local cleanup unavailable');}
}
/* logout · its layers, innermost first: 1 n349 before   (PVX-N387; kept true by flow_t387) */
function logout(){ return pvxRun('logout',logout$base,this,arguments); }
function logout$base(){
try{ ['unsubVisits','unsubPub','unsubShifts','unsubAlert','unsubMsgs','unsubPubLobby'].forEach(function(k){ if(Backend[k]){ try{ Backend[k](); }catch(e){} Backend[k]=null; } }); }catch(e){}
try{ if(AUTH) AUTH.signOut(); }catch(e){}
pvxClearPrivateLocalState();
PATIENTS=[]; try{ if(typeof renderAll==='function') renderAll(); }catch(e){}
try{ showLogin(); }catch(e){} toast('Signed out');
}

 
const searchEl=document.getElementById('globalSearch');
let searchHl=-1, searchFlat=[];
/* searchIndex · its layers, innermost first: 1 #54 wrap · 2 n347 wrap · 3 n348 wrap · 4 n349 wrap   (PVX-N387; kept true by flow_t387) */
function searchIndex(q){ return pvxRun('searchIndex',searchIndex$base,this,arguments); }
function searchIndex$base(q){
q=q.trim().toLowerCase(); if(!q) return [];
const res=[];
PATIENTS.forEach(p=>{
const l=liaison(p.liaison);
const hay=[p.name,p.last,p.owner,p.hid,p.reason,p.room,p.status,doc(p.doctor).name,l?l.name:''].join(' ').toLowerCase();
if(hay.includes(q)) res.push({kind:'Patient',color:STATUSES[p.status].color,initials:initials(p),
title:`${p.name} ${p.last}`,sub:`${p.species} · ${p.room} · ${p.hid}`,act:()=>{closeSearch();openDrawer(p.id);}});
});
DOCTORS.forEach(d=>{ if(d.name.toLowerCase().includes(q)) res.push({kind:'Doctor',color:d.color,initials:d.initials,
title:d.name,sub:`${activeCountForDoctor(d.id)} active patient${activeCountForDoctor(d.id)===1?'':'s'}`,
act:()=>{closeSearch();filters={status:null,prio:null,doctor:d.id,liaison:null};switchView('list');renderFilterBar();renderTable();}}); });
LIAISONS.forEach(l=>{ if(l.name.toLowerCase().includes(q)) res.push({kind:'Liaison',color:l.color,initials:l.initials,
title:l.name,sub:`${activeCountForLiaison(l.id)} patient${activeCountForLiaison(l.id)===1?'':'s'}`,
act:()=>{closeSearch();filters={status:null,prio:null,doctor:null,liaison:l.id};switchView('list');renderFilterBar();renderTable();}}); });
ROOMS.forEach(r=>{ if(r.toLowerCase().includes(q)){ const occ=PATIENTS.find(p=>isActive(p)&&p.room===r);
res.push({kind:'Room',icon:true,color:'var(--accent)',title:r,sub:occ?`${occ.name} · ${occ.status}`:'Available',
act:()=>{closeSearch(); occ?openDrawer(occ.id):switchView('rooms');}}); } });
return res;
}
function closeSearch(){const r=document.getElementById('searchResults');r.classList.remove('open');r.innerHTML='';searchHl=-1;searchFlat=[];}
/* renderSearch · its layers, innermost first: 1 #54 wrap · 2 n349 wrap   (PVX-N387; kept true by flow_t387) */
function renderSearch(q){ return pvxRun('renderSearch',renderSearch$base,this,arguments); }
function renderSearch$base(q){
const box=document.getElementById('searchResults');
if(!q.trim()){ closeSearch(); return; }
const all=searchIndex(q);
if(!all.length){ box.innerHTML=`<div class="sr-inner"><div class="sr-none">No matches for “${bcEsc(q)}”</div></div>`; box.classList.add('open'); positionSearchResults(); searchFlat=[]; return; }
const ql=q.trim().toLowerCase();
let kinds=['Filter','Patient','Doctor','Liaison','Room','Help'];
if(/^(room|lobby|comfort)/.test(ql) || ROOMS.some(r=>r.toLowerCase()===ql)) kinds=['Room','Filter','Patient','Doctor','Liaison','Help'];
let html=''; searchFlat=[]; let idx=0;
kinds.forEach(k=>{
const g=all.filter(r=>r.kind===k).slice(0,4); if(!g.length) return;
html+=`<div class="sr-group"><div class="sr-label">${k}${g.length>1?'s':''}</div>`;
g.forEach(r=>{ searchFlat.push(r);
const av = r.icon ?`<span class="sr-ic" style="background:${r.color}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${r.svg||ATTN_ICONS.room}</svg></span>`
:`<span class="sr-ic" style="background:${r.color}">${r.initials}</span>`;
html+=`<div class="sr-item" data-i="${idx}">${av}<div class="sr-main"><div class="sr-t">${bcEsc(r.title)}</div><div class="sr-s">${bcEsc(r.sub)}</div></div><div class="sr-kind">${r.kind}</div></div>`; idx++;
});
html+='</div>';
});
box.innerHTML='<div class="sr-inner">'+html+'</div>'; box.classList.add('open'); positionSearchResults();
box.querySelectorAll('.sr-item').forEach(n=>n.onclick=()=>searchFlat[+n.dataset.i].act());
}
function highlightSearch(){document.querySelectorAll('#searchResults .sr-item').forEach((n,i)=>n.classList.toggle('hl',i===searchHl));
const h=document.querySelector('#searchResults .sr-item.hl'); if(h) h.scrollIntoView({block:'nearest'});}
searchEl.addEventListener('input',e=>{ searchQ=e.target.value; renderSearch(searchQ); renderTable(); renderBoard(); });
searchEl.addEventListener('keydown',e=>{
if(e.key==='ArrowDown'){e.preventDefault();searchHl=Math.min(searchFlat.length-1,searchHl+1);highlightSearch();}
else if(e.key==='ArrowUp'){e.preventDefault();searchHl=Math.max(0,searchHl-1);highlightSearch();}
else if(e.key==='Enter'){e.preventDefault();const r=searchFlat[searchHl>=0?searchHl:0];if(r)r.act();}
else if(e.key==='Escape'){e.preventDefault();searchEl.value='';searchQ='';closeSearch();renderTable();renderBoard();searchEl.blur();}
});
document.addEventListener('click',e=>{ if(!e.target.closest('.search') && !e.target.closest('#searchResults')) closeSearch(); });
(function(){var _sr=document.getElementById('searchResults'); if(_sr && _sr.parentNode!==document.body) document.body.appendChild(_sr);})();
 
var activeSearchWrap=null;
document.querySelectorAll('.search .search-input').forEach(function(inp){ inp.addEventListener('focus',function(){ activeSearchWrap=inp.closest('.search-wrap'); }); });
function positionSearchResults(){var box=document.getElementById('searchResults'); if(!box||!box.classList.contains('open'))return; var bar=activeSearchWrap||document.querySelector('.search .search-wrap'); if(!bar)return; var r=bar.getBoundingClientRect(); box.style.top=(r.bottom+8)+'px'; box.style.left=r.left+'px'; box.style.width=r.width+'px'; box.style.maxHeight=Math.max(140,Math.min(520, window.innerHeight-r.bottom-24))+'px';}
window.addEventListener('resize',positionSearchResults); window.addEventListener('scroll',positionSearchResults,true);


(function(){
var r=document.getElementById('rdSearch'); if(!r) return;   /* PVX-N212: Rounds' search filters the census only; Return opens the first match */
r.addEventListener('keydown',function(e){
if(e.key==='Enter'&&!e.isComposing){ var row=[].slice.call(document.querySelectorAll('.rd-row[data-pid]')).filter(function(x){ return x.offsetParent!==null; })[0];
  if(row){ e.preventDefault(); var pid=row.getAttribute('data-pid'); if(typeof rdExpanded==='undefined'||rdExpanded!==pid) rdHandleAct('toggle',row.querySelector('.rd-rowmain')||row); else row.scrollIntoView({block:'nearest'}); } }
});
})();
document.addEventListener('keydown',e=>{
if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchEl.focus();}
if(e.key==='Escape'&& !e.defaultPrevented && document.activeElement!==searchEl){ if(document.getElementById('opsMenu').classList.contains('open')){ opsMenuClose(); return; } if(document.getElementById('triEditModal').classList.contains('open')){ closeTriageEdit(); return; } if(document.getElementById('shiftModal').classList.contains('open')){ closeShiftSetup(); return; } if(document.getElementById('apModal').classList.contains('open')){ closeAddPatient(); return; } if(document.getElementById('intakeModal').classList.contains('open')){ closeIntake(); return; } closeDrawer(); closeLocDrawer(); }
});

 
(function initAmbient(){
const stage=document.getElementById('stage'), mesh=document.getElementById('mesh');
if(stage&&mesh) stage.addEventListener('scroll',()=>{
mesh.style.transform = document.body.classList.contains('dark') ?`translateY(${stage.scrollTop*-0.03}px)`:'none';
}, {passive:true});
})();


let _lastMin=-1;
setInterval(()=>{
now.setTime(Date.now());   /* flow-fixes-oct6: the real time, so a missed tick is never lost */
if(currentApp==='flow'&&currentView==='dashboard'){renderKPIs();}
if(currentApp==='flow'&&currentView==='client'){ updateClientClock(); }
const mins=Math.floor(now.getTime()/60000);
if(mins!==_lastMin){
_lastMin=mins;
try{ updateDashDate(); }catch(e){}
if(currentApp==='flow'&&currentView==='dashboard') renderOps();
if(currentView==='rooms') renderRooms();
if(currentApp==='ultrasound') renderUltrasound();
if(currentApp==='rounds') renderRounds();
if(currentApp==='flow'&&currentView==='client') renderClient();
}
},1000);


function updateDashDate(){ const el=document.getElementById('dashDate'); if(!el) return; const d=new Date();
el.innerHTML=(d.toLocaleDateString('en-US',{weekday:'long'}) +', ').toUpperCase()
+'<span class="dd-md" style="font-weight:var(--weight-bold)">'+ d.toLocaleDateString('en-US',{month:'long',day:'numeric'}).toUpperCase() +'</span>'
+' • HOSPITAL OPERATIONS'; }
updateDashDate();









 


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
function rdEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

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
try{ notify('Added to Rounds', rdEsc(rdFullName(p))+' · New Admit · '+rdSvc(svc).label, {icon:'info', color:'var(--accent)'}); }catch(e){}
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
function rdActorLabel(){ const el=document.getElementById('rdActor'); if(el) el.innerHTML='Rounding as <b>'+rdEsc(rdActorName())+'</b>'; }

 
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


 









 
try{ rdWireOnce(); }catch(e){}

loadState();
wireCompleteZones();
renderAll();
switchView('dashboard');



(function(){
return; 
const ROUTE_VIEW={'/':'dashboard','/command':'dashboard','/patients':'list','/flow':'flow','/rooms':'rooms','/client-display':'client'};
const VIEW_ROUTE={dashboard:'/command',list:'/patients',flow:'/flow',rooms:'/rooms',client:'/client-display'};
const US_ROUTES={today:'/ultrasound',queue:'/ultrasound/queue',completed:'/ultrasound/completed'};
const RD_ROUTES={census:'/rounds',archive:'/rounds/archive'};
const rdSubR=p=>{ const s=(p.split('/')[2]||'census'); return RD_ROUTES[s]?s:'census'; };
const curPath=()=>(location.pathname||'/').replace(/index\.html$/,'').replace(/\/+$/,'')||'/';
const usSub=p=>{ const s=(p.split('/')[2]||'today'); return US_ROUTES[s]?s:'today'; };
if(curPath().indexOf('/ultrasound')===0){ const s=usSub(curPath()); currentUsView=s; switchApp('ultrasound'); }
else if(curPath().indexOf('/rounds')===0){ const s=rdSubR(curPath()); currentRdView=s; switchApp('rounds'); }
else { const v=ROUTE_VIEW[curPath()]; if(v && v!=='dashboard') switchView(v); }
const _sv=switchView, _su=switchUsView;
switchView=function(view){ _sv(view); try{ if(currentApp==='flow'){ const r=VIEW_ROUTE[view]; if(r) history.replaceState(null,'',r); } }catch(e){} };
switchUsView=function(view){ _su(view); try{ const r=US_ROUTES[currentUsView]; if(r) history.replaceState(null,'',r); }catch(e){} };
const _sr=switchRdView;
switchRdView=function(view){ _sr(view); try{ const r=RD_ROUTES[currentRdView]; if(r) history.replaceState(null,'',r); }catch(e){} };
window.addEventListener('popstate',()=>{
const p=curPath();
if(p.indexOf('/ultrasound')===0){ const s=usSub(p); if(currentApp!=='ultrasound'){ currentUsView=s; switchApp('ultrasound'); } else _su(s); }
else if(p.indexOf('/rounds')===0){ const s=rdSubR(p); if(currentApp!=='rounds'){ currentRdView=s; switchApp('rounds'); } else _sr(s); }
else { const vv=ROUTE_VIEW[p]; if(vv) _sv(vv); }
});
})();
