/* Critical Patient alert. One banner, one sound. Shows on every staff screen while an
   active P1 patient has no doctor and nobody has taken the case. Take Case picks a doctor
   from Today's Shift Assignments. Never shown or heard on the client display. */
(function(){
var lastTry=0, BOOT=Date.now(), announced=new Set(), shownIds=[], localTaken=new Set(), audioCtx=null, tickT=null;
var doneMsg=null, doneT=null, lastSig='', pickFor=null, showAll=false, phase='hidden', token=0, firstSeen=new Map(), reminded=new Set(), lastTake=null;
var REDUCE=false; try{ REDUCE=window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
var PILL_W=132, PILL_H=36;
var ECG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6h5"/></svg>';
var CHECK='<svg class="ci-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

function box(){var n=document.getElementById('critIsland');if(!n){n=document.createElement('div');n.id='critIsland';n.setAttribute('role','alert');n.setAttribute('aria-live','assertive');n.innerHTML='<span class="ci-seed" aria-hidden="true"></span><div class="ci-inner"></div>';document.body.appendChild(n);}return n;}
function inner(){return box().querySelector('.ci-inner');}
function pts(){try{return PATIENTS||[];}catch(e){return [];}}
function byId(id){return pts().find(function(x){return x.id===id;});}
function onTV(){try{ if(document.body.classList.contains('client-mode')) return true; return (typeof currentView!=='undefined' && currentView==='client'); }catch(e){return false;}}
function takenEntry(p){var t=p&&p.timeline;if(!t||!t.length)return null;for(var i=t.length-1;i>=0;i--){if(!t[i])continue;if(t[i].label==='Critical take undone')return null;if(t[i].label==='Critical case taken')return t[i];}return null;}
function docName(id){try{var d=DOCTORS.find(function(x){return x.id===id;});return d?d.name:'';}catch(e){return '';}}
function takenBy(p){if(p.critTakenBy)return p.critTakenBy;var e=takenEntry(p);if(e)return e.meta||'Staff';return (p.doctor&&p.doctor!=='unassigned')?docName(p.doctor):'';}
function untaken(p){try{return !!p && isActive(p) && Number(p.prio)===1 && !p.critTakenAt && !takenEntry(p) && (!p.doctor||p.doctor==='unassigned');}catch(e){return false;}}
function list(){return pts().filter(untaken).sort(function(a,b){return (new Date(a.arrival||0))-(new Date(b.arrival||0));});}
function me(){try{return CURRENT_USER||'Staff';}catch(e){return 'Staff';}}

/* sound */
function soundOn(){return !!(audioCtx&&audioCtx.state==='running');}
function wasActive(){try{return !!(navigator.userActivation&&navigator.userActivation.hasBeenActive);}catch(e){return false;}}
function unlock(){
  /* Browsers allow sound only after someone interacts with the page. Any click or key re-arms it,
     and a context the browser left suspended is replaced with a fresh one. */
  try{ var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    if(audioCtx&&audioCtx.state==='running') return;
    if(audioCtx){ try{ audioCtx.onstatechange=null; audioCtx.close(); }catch(e){} }
    audioCtx=new AC();
    audioCtx.onstatechange=function(){ lastSig=''; try{ window.renderCritAlert(); }catch(e){} };
    if(audioCtx.state!=='running'){ var pr=audioCtx.resume(); if(pr&&pr.then) pr.then(function(){ lastSig=''; window.renderCritAlert(); }).catch(function(){}); }
    lastSig='';
  }catch(e){}
}
['pointerdown','mousedown','click','keydown','touchstart'].forEach(function(t){document.addEventListener(t,function(){ unlock(); try{ window.renderCritAlert(); }catch(e){} },true);});
function chime(){
  if(!soundOn()&&wasActive()) unlock();
  if(!soundOn()) return;
  try{ var t0=audioCtx.currentTime+.03;
    [[659.25,0],[880,.17],[659.25,.55],[880,.72]].forEach(function(n){
      var o=audioCtx.createOscillator(), g=audioCtx.createGain(), t=t0+n[1];
      o.type='sine'; o.frequency.value=n[0];
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.22,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+.16);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+.18);
    });
  }catch(e){}
}

function softChime(){
  try{ if(localStorage.getItem('pvx:sound:reminder')==='off') return; }catch(e){}   /* PVX-N197: Operations > Reminder chime */
  if(!soundOn()&&wasActive()) unlock();
  if(!soundOn()) return;
  try{ var t0=audioCtx.currentTime+.03;
    [[587.33,0],[783.99,.2]].forEach(function(n){
      var o=audioCtx.createOscillator(), g=audioCtx.createGain(), t=t0+n[1];
      o.type='sine'; o.frequency.value=n[0];
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.12,t+.03); g.gain.exponentialRampToValueAtTime(.0001,t+.3);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+.32);
    });
  }catch(e){}
}

/* today's shift doctors */
function shiftDoctors(){
  var out=[];
  try{ SHIFTS.forEach(function(s){ var id=shiftAssign[s.key]; if(!id||id==='unassigned'||id==='relief') return;
      var d=DOCTORS.find(function(x){return x.id===id;}); if(!d) return;
      var hit=out.find(function(o){return o.d.id===id;});
      if(hit) hit.shifts.push(s); else out.push({d:d,shifts:[s]}); }); }catch(e){}
  return out;
}
function patientCount(id){var n=0;try{n=activeCountForDoctor(id);}catch(e){} return n===0?'No patients':(n===1?'1 patient':n+' patients');}
function initials(n){return String(n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();}
function docBtn(d,shifts,dl){
  var col=shifts&&shifts.length?shifts[0].color:(d.baseColor||d.color||'#5C5E62');
  var sub=(shifts&&shifts.length?shifts.map(function(s){return s.label;}).join(' + ')+' · ':'')+patientCount(d.id);
  return '<button class="ci-doc ci-s" style="--d:'+dl+'s" type="button" data-doc="'+pvxEsc(d.id)+'"><span class="ci-av" style="background:'+pvxEsc(col)+'">'+pvxEsc(initials(d.name))+'</span><span><b>'+pvxEsc(d.name)+'</b><small>'+pvxEsc(sub)+'</small></span></button>';
}

/* view html */
function dur(ms){var s=Math.max(0,Math.round(ms/1000));if(s>=3600){var h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h+'h '+String(m).padStart(2,'0')+'m';}return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function mmss(ms){var s=Math.max(0,Math.floor(ms/1000));if(s>=3600)return Math.floor(s/3600)+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function arrMs(p){var t=new Date(p.arrival).getTime();return isFinite(t)?t:null;}
function sig(p){var sp='';try{sp=(typeof speciesEnglish==='function'?speciesEnglish(p.species):p.species)||'';}catch(e){sp=p.species||'';} var age='';try{age=formatPatientAge(p)||'';}catch(e){} return [sp,age].filter(Boolean).join(' ');}
function resus(p){try{return normalizeResusPref(p.resusPref);}catch(e){return '';}}
function alertHTML(p,more){
  var loc=(p.room&&p.room!=='Lobby')?p.room:'Lobby', a=arrMs(p), r=resus(p), g=sig(p);
  var h='<div class="ci-row"><div class="ci-ic ci-s" style="--d:.02s">'+ECG+'</div>'
   +'<button class="ci-main ci-s" style="--d:.07s" type="button" data-open="'+pvxEsc(p.id)+'" aria-label="Open '+pvxEsc(p.name)+'">'
   +'<span class="ci-kicker">Critical patient · '+pvxEsc(loc)+'</span>'
   +'<span class="ci-name">'+pvxEsc(p.name||'Unnamed patient')+(g?' <span class="ci-sig">'+pvxEsc(g)+'</span>':'')+'</span>'
   +'<span class="ci-meta">'+(a?'<span class="ci-wait" data-arr="'+a+'">Waiting '+mmss(Date.now()-a)+'</span>':'Just arrived')+(p.reason?', '+pvxEsc(p.reason):'')+'</span></button>'
   +(r?'<span class="ci-tag ci-s" style="--d:.11s">'.replace('ci-tag','ci-tag '+(r==='DNR'?'dnr':'cpr'))+r+'</span>':'')
   +(more>0?'<span class="ci-more ci-s" style="--d:.12s">+'+more+' more</span>':'')
   +(pickFor===p.id?'':'<button class="ci-take ci-s" style="--d:.14s" type="button" data-take="'+pvxEsc(p.id)+'">Take case</button>')+'</div>';
  if(pickFor===p.id){
    var on=shiftDoctors(), rest;
    try{ rest=DOCTORS.filter(function(d){return !on.some(function(o){return o.d.id===d.id;});}); }catch(e){ rest=[]; }
    h+='<div class="ci-pick">'+(on.length?'':'<div class="ci-pick-h ci-s" style="--d:.05s"><span>Shifts haven\'t been set today. Choose the doctor taking '+pvxEsc(p.name)+'.</span></div>');
    var grid=on.length?on:rest.map(function(d){return {d:d,shifts:[]};});
    h+='<div class="ci-docs">'+grid.map(function(o,i){return docBtn(o.d,o.shifts,(.08+i*.035).toFixed(3));}).join('')+'</div>';
    if(on.length&&rest.length&&showAll){ h+='<div class="ci-all"><div class="ci-docs">'+rest.map(function(d,i){return docBtn(d,[],(.03+i*.02).toFixed(3));}).join('')+'</div></div>'; }
    h+='<div class="ci-foot ci-s" style="--d:.16s">'+(on.length&&rest.length?'<button class="ci-link" type="button" data-all="1">'+(showAll?'Hide other doctors':'Another doctor')+'</button>':'<span></span>')+(on.length?'<span class="ci-keys">'+(on.length>1?'Press 1 to '+Math.min(9,on.length):'Press 1')+'</span>':'')+'<button class="ci-link" type="button" data-cancel="1">Cancel</button></div></div>';
  } else if(!soundOn()){
    h+='<div class="ci-hint ci-s" style="--d:.18s">Sound is off on this screen. '+(matchMedia('(pointer:coarse)').matches?'Tap':'Click')+' anywhere in Flow to turn it on.</div>';
  }
  return h;
}
function takenHTML(){
  return '<div class="ci-row"><div class="ci-ic ci-s" style="--d:0s">'+CHECK+'</div><div class="ci-main ci-s" style="--d:.06s;cursor:default">'
   +'<span class="ci-kicker">Case Taken</span><span class="ci-name">'+pvxEsc(doneMsg.name)+' · '+pvxEsc(doneMsg.doc)+'</span>'
   +'<span class="ci-meta">'+(doneMsg.took!=null?'Taken in '+dur(doneMsg.took):'Just now')+(doneMsg.by?' · by '+pvxEsc(doneMsg.by):'')+'</span></div>'
   +'<button class="ci-link ci-undo ci-s" style="--d:.12s" type="button" data-undo="1">Undo</button></div>';
}

/* island motion: pill -> expand -> content in; content out -> pill -> gone */
function targetW(){return Math.max(PILL_W,Math.min(660,(window.innerWidth||800)-24));}
function measure(){var b=box();b.style.setProperty('--ci-w',targetW()+'px');return Math.max(PILL_H,inner().offsetHeight);}
function size(w,h){var b=box();b.style.width=w+'px';b.style.height=h+'px';}
function later(ms,fn){var t=token;setTimeout(function(){ if(t===token) fn(); }, REDUCE?0:ms);}
function show(html,taken){
  var b=box(); token++;
  b.classList.toggle('taken',!!taken);
  if(phase==='hidden'||phase==='closing'){
    phase='opening';
    inner().innerHTML=html; wire();
    b.classList.remove('content'); b.classList.add('pill');
    size(PILL_W,PILL_H); void b.offsetWidth; b.classList.add('on');
    later(180,function(){ b.classList.remove('pill'); size(targetW(),measure());
      later(250,function(){ b.classList.add('content'); phase='open'; }); });
    return;
  }
  b.classList.remove('content');
  later(130,function(){ inner().innerHTML=html; wire(); b.classList.remove('pill'); b.classList.add('on'); size(targetW(),measure()); later(60,function(){ b.classList.add('content'); phase='open'; }); });
}
function hide(){
  if(phase==='hidden'||phase==='closing') return;
  var b=box(); token++; phase='closing';
  b.classList.remove('content');
  later(140,function(){ b.classList.add('pill'); size(PILL_W,PILL_H);
    later(420,function(){ b.classList.remove('on'); later(220,function(){ b.classList.remove('pill','taken'); inner().innerHTML=''; phase='hidden'; }); }); });
}
function wire(){
  var b=box();
  b.querySelectorAll('[data-take]').forEach(function(x){ x.onclick=function(){ pickFor=x.getAttribute('data-take'); showAll=false; lastSig=''; window.renderCritAlert(); }; });
  b.querySelectorAll('[data-open]').forEach(function(x){ x.onclick=function(){ window.critOpenPatient(x.getAttribute('data-open')); }; });
  b.querySelectorAll('[data-doc]').forEach(function(x){ x.onclick=function(){ window.critTakeCase(pickFor, x.getAttribute('data-doc')); }; });
  b.querySelectorAll('[data-all]').forEach(function(x){ x.onclick=function(){ showAll=!showAll; lastSig=''; window.renderCritAlert(); }; });
  b.querySelectorAll('[data-cancel]').forEach(function(x){ x.onclick=function(){ pickFor=null; lastSig=''; window.renderCritAlert(); }; });
  b.querySelectorAll('[data-undo]').forEach(function(x){ x.onclick=function(){ window.critUndoTake(); }; });
  if(pickFor){ var f=b.querySelector('.ci-pick>.ci-docs [data-doc]'); if(f) setTimeout(function(){ try{ f.focus({preventScroll:true}); }catch(e){} },REDUCE?0:420); }
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&pickFor){ pickFor=null; lastSig=''; window.renderCritAlert(); return; }
  if(!pickFor||!/^[1-9]$/.test(e.key)||e.metaKey||e.ctrlKey||e.altKey) return;
  var t=e.target, tag=t&&t.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)) return;
  var btns=box().querySelectorAll('.ci-pick>.ci-docs [data-doc]'); var btn=btns[Number(e.key)-1];
  if(btn){ e.preventDefault(); btn.click(); }
});
window.addEventListener('resize',function(){ if(phase==='open'){ size(targetW(),measure()); } });
function tickStart(){ if(tickT) return; tickT=setInterval(function(){ var w=document.querySelector('#critIsland .ci-wait'); if(w){ var tx='Waiting '+mmss(Date.now()-Number(w.dataset.arr)), n=w.firstChild; if(n&&n.nodeType===3&&!n.nextSibling){ if(n.nodeValue!==tx) n.nodeValue=tx; } else w.textContent=tx; } },1000); }   /* PVX-N378 */
function tickStop(){ clearInterval(tickT); tickT=null; }

/* actions */
window.critTakeCase=function(id,doctorId){
  var p=byId(id);
  if(!p||!untaken(p)){ pickFor=null; lastSig=''; window.renderCritAlert(); return; }
  var d=null; try{ d=DOCTORS.find(function(x){return x.id===doctorId;})||null; }catch(e){}
  if(!d){ return; }
  var at=new Date(), by=me();
  p.critTakenAt=at; p.critTakenBy=d.name;
  try{ if(AUTH&&AUTH.currentUser) p.critTakenUid=AUTH.currentUser.uid; }catch(e){}
  (p.timeline=p.timeline||[]).push({label:'Critical case taken', at:at, meta:d.name+(by&&by!==d.name?' · by '+by:'')});
  try{ assignDoctor(p,d.id); }catch(e){ p.doctor=d.id; }
  localTaken.add(p.id); pickFor=null; showAll=false;
  var arr=new Date(p.arrival).getTime();
  doneMsg={id:p.id, name:p.name||'Patient', doc:d.name, docId:d.id, by:(by&&by!==d.name)?by:'', took:isFinite(arr)?(at.getTime()-arr):null};
  lastTake={id:doneMsg.id, doc:d.name, docId:d.id, until:Date.now()+9000};
  clearTimeout(doneT); doneT=setTimeout(function(){ doneMsg=null; lastSig=''; window.renderCritAlert(); },6000);
  try{ if(typeof scheduleRender==='function') scheduleRender(); else renderAll(); }catch(e){}
  lastSig=''; window.renderCritAlert();
};
window.critUndoTake=function(){
  var m=lastTake; if(!m||Date.now()>m.until) return;
  var p=byId(m.id); lastTake=null; doneMsg=null; clearTimeout(doneT);
  if(p&&p.critTakenAt){
    if(p.doctor===m.docId){ p.doctor='unassigned'; try{ ctSyncPrimary(p); }catch(e){} }
    p.critTakenAt=null; p.critTakenBy=null; p.critTakenUid=null;
    (p.timeline=p.timeline||[]).push({label:'Critical take undone', at:new Date(), meta:m.doc+' · by '+me()});
    localTaken.delete(p.id);
    try{ if(typeof scheduleRender==='function') scheduleRender(); else renderAll(); }catch(e){}
  }
  lastSig=''; window.renderCritAlert();
};
window.critOpenPatient=function(id){
  try{ if(typeof currentApp!=='undefined'&&currentApp!=='flow') switchView(currentView==='client'?'dashboard':currentView); }catch(e){}
  try{ openDrawer(id); }catch(e){}
};

window.renderCritAlert=function(){
  var tv=onTV(), L=tv?[]:list(), ids=L.map(function(p){return p.id;});
  shownIds.forEach(function(id){
    if(ids.indexOf(id)>-1||localTaken.has(id)||tv) return;
    var p=byId(id); var by=p?takenBy(p):'';
    if(by){ try{ notify('Critical case taken', pvxEsc(p.name)+' · '+pvxEsc(by), {icon:'doctor', color:'var(--priority-p1)'}); }catch(e){} }
  });
  shownIds=ids;
  if(pickFor&&ids.indexOf(pickFor)<0){ pickFor=null; showAll=false; }
  var fresh=L.filter(function(p){return !announced.has(p.id);});
  fresh.forEach(function(p){announced.add(p.id);});
  if(fresh.length && Date.now()-BOOT>8000){ chime(); try{ if(window.pvxSay) pvxSay('Critical case waiting: '+fresh.map(function(p){ return p.name; }).join(', ')); }catch(e){} }   /* PVX-N197 */
  var nowT=Date.now();
  L.forEach(function(p){ if(!firstSeen.has(p.id)) firstSeen.set(p.id,nowT); });
  var due=L.filter(function(p){ return !reminded.has(p.id) && nowT-firstSeen.get(p.id)>=120000; });
  if(due.length){ due.forEach(function(p){ reminded.add(p.id); }); softChime(); }
  if(L.length&&!soundOn()&&wasActive()&&Date.now()-lastTry>10000){ lastTry=Date.now(); unlock(); }
  document.body.classList.toggle('crit-active', L.length>0 && !doneMsg);
  var p=L[0];
  var onDocs=''; try{ onDocs=JSON.stringify(shiftAssign); }catch(e){}
  var key=tv+'|'+soundOn()+'|'+(doneMsg?doneMsg.name+doneMsg.doc:'')+'|'+pickFor+'|'+showAll+'|'+ids.join(',')+'|'+(pickFor?onDocs:'')+'|'+(p?[p.name,p.room,p.reason,p.resusPref,p.species,p.arrival&&new Date(p.arrival).getTime()].join('~'):'');
  if(key===lastSig) return;
  lastSig=key;
  if(tv||(!L.length&&!doneMsg)){ tickStop(); hide(); return; }
  if(doneMsg){ tickStop(); show(takenHTML(),true); return; }
  show(alertHTML(p,L.length-1),false);
  tickStart();
};
setInterval(function(){ try{ window.renderCritAlert(); }catch(e){} },2000);
try{ window.renderCritAlert(); }catch(e){}
})();

/* Today's Shift Assignments reset: Morning ER, Criticalist and Swing clear at midnight (hospital
   time); Overnight clears at 7:00 AM so the overnight doctor carries through the night. Assignments
   older than their reset are ignored on load, and at each reset one open screen saves the cleared list. */
(function(){
var OVERNIGHT_KEY='overnight', OVERNIGHT_RESET_H=7;
function dayKey(d){ try{ return _hospDayKey(d); }catch(e){ return new Date(d).toDateString(); } }
function cycKey(d){ return dayKey(new Date(new Date(d).getTime()-OVERNIGHT_RESET_H*3600e3)); }
function keys(a){ var k={}; try{ Object.keys(shiftAssign).forEach(function(x){ k[x]=1; }); }catch(e){} Object.keys(a||{}).forEach(function(x){ k[x]=1; }); return Object.keys(k); }
function filtered(data){
  var a=(data&&data.assignments)||{}, up=data&&data.updated_at, now=new Date(), out={}, dropped=false;
  keys(a).forEach(function(k){
    var v=a[k]||null, ok=!!up && (k===OVERNIGHT_KEY ? cycKey(up)===cycKey(now) : dayKey(up)===dayKey(now));
    out[k]=ok?v:null; if(v&&!ok) dropped=true;
  });
  return {out:out, dropped:dropped};
}
window._shiftsForToday=function(data){
  if(!data||!data.assignments) return data?data.assignments:null;
  var f=filtered(data); if(f.dropped) window.__shiftsStale=true; return f.out;
};
function applyLocal(a){
  try{ if(typeof _shiftModalOpen!=='undefined'&&_shiftModalOpen) return;
    Object.keys(shiftAssign).forEach(function(k){ shiftAssign[k]=null; }); Object.assign(shiftAssign,a||{});
    applyShiftColors(); renderAll(); }catch(e){}
}
async function rollover(){
  try{
    if(typeof DB==='undefined'||!DB){ var b={}; Object.keys(shiftAssign).forEach(function(k){ b[k]=(k===OVERNIGHT_KEY&&cycKey(new Date())===lastCyc)?shiftAssign[k]:null; }); applyLocal(b); return; }
    var ref=DB.collection('shifts').doc(TENANT_ID);
    var snap=await ref.get(); var data=snap.exists?snap.data():null;
    if(!data||!data.assignments) return;
    var f=filtered(data); applyLocal(f.out);
    if(f.dropped&&typeof Backend!=='undefined'&&Backend.mode==='staff'){
      await DB.runTransaction(async function(tx){
        var s=await tx.get(ref), d=s.exists?s.data():null; if(!d||!d.assignments) return;
        var g=filtered(d); if(!g.dropped) return;
        tx.set(ref,{tenant_id:TENANT_ID, assignments:g.out, updated_at:new Date().toISOString(), reset_reason:'scheduled'},{merge:true});
      });
    }
  }catch(e){}
}
var lastDay=dayKey(new Date()), lastCyc=cycKey(new Date());
setInterval(function(){ var d=dayKey(new Date()), c=cycKey(new Date()); if(d!==lastDay||c!==lastCyc){ lastDay=d; lastCyc=c; rollover(); } },30000);
setTimeout(function(){ if(window.__shiftsStale) rollover(); },12000);
window.__shiftReset={filtered:filtered, dayKey:dayKey, cycKey:cycKey};
})();