/* Flow operations layer
   1. Safer saving: only the fields that changed are written, so two screens never erase each other's work.
   2. Stale-patient sweep: anyone on the board over 12 hours gets a Discharge / Admit / Keep prompt.
   3. Milestones: roomed and doctor-assigned times are recorded quietly for analytics.
   4. Least-busy doctor: doctor pickers show on-shift doctors first, lightest load on top.
   5. Live presence: who else has a patient open, and "Kristi just moved Bella to Exam".
   Everything here is additive; if any part fails, Flow keeps working as before. */
(function(){
var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
function ms(v){ if(!v) return 0; if(v instanceof Date) return v.getTime(); if(v.toDate) return v.toDate().getTime(); if(typeof v==='number') return v; var n=new Date(v).getTime(); return isNaN(n)?0:n; }
function me(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} var n=''; try{ n=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):''; }catch(e){} return {uid:(u&&u.uid)||'', name:n||(u&&u.email)||''}; }
function first(n){ return String(n||'').trim().split(/\s+/)[0]||'Someone'; }
function inits(n){ var w=String(n||'').trim().split(/\s+/); return ((w[0]||'')[0]||'').toUpperCase()+((w.length>1?w[w.length-1][0]:'')||'').toUpperCase(); }
function pn(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
function onTV(){ try{ return LOBBY||document.body.classList.contains('client-mode')||document.body.classList.contains('tv-mode'); }catch(e){ return false; } }

/* ---------- 1. safer saving ---------- */
window.fvSaveVisit=function(batch,p,prev){
  var ref=DB.collection('visits').doc(String(p.id)), row=mapToDb(p), who=me();
  var stamp={last_by:who.name||null, last_by_uid:who.uid||null, last_at:new Date().toISOString()};
  var old=null; try{ old=prev[row.id]?JSON.parse(prev[row.id]):null; }catch(e){ old=null; }
  if(!old){ batch.set(ref, Object.assign({}, row, stamp), {merge:true}); return; }
  var d={}, n=0;
  Object.keys(row).forEach(function(k){ if(row[k]===undefined) return; if(JSON.stringify(row[k])!==JSON.stringify(old[k])){ d[k]=row[k]; n++; } });
  if(!n) return;
  batch.update(ref, Object.assign(d, stamp));
};
/* Unsafe whole-record merge fallback disabled. An operator must reconcile
   conflicts against the latest server version before retrying. */
window.fvSaveFallback=async function(){ throw new Error('Whole-record fallback is disabled to protect concurrent edits.'); };

/* ---------- 3. milestones ---------- */
try{ if(typeof moveRoom==='function'){ pvxWrap('moveRoom',function(_mr){ return function(p,r){ var was=p&&p.room; var out=_mr.apply(this,arguments);
  try{ if(p&&!p.msRoomedAt&&(!was||was==='Lobby')&&p.room&&p.room!=='Lobby') p.msRoomedAt=new Date(); }catch(e){} return out; }; },'#8'); } }catch(e){}
try{ if(typeof assignDoctor==='function'){ pvxAfter('assignDoctor',function(p,id){ 
  try{ if(p&&!p.msDoctorAt&&id&&id!=='unassigned'&&p.doctor===id) p.msDoctorAt=new Date(); }catch(e){} },'#8'); } }catch(e){}

/* ---------- 4. least-busy doctor ---------- */
function onShift(){ var on={}; try{ Object.keys(shiftAssign||{}).forEach(function(k){ if(shiftAssign[k]) on[shiftAssign[k]]=k; }); }catch(e){} return on; }
function load(id){ try{ return activeCountForDoctor(id); }catch(e){ return 0; } }
function ranked(){ var on=onShift();
  return DOCTORS.filter(function(d){ return d&&d.id&&d.id!=='unassigned'; }).map(function(d){ return {d:d,n:load(d.id),on:!!on[d.id]}; })
    .sort(function(a,b){ return (b.on-a.on)||(a.n-b.n)||String(a.d.name).localeCompare(String(b.d.name)); }); }
window.fvLeastBusy=function(){ var b=ranked().find(function(x){ return x.on; }); return b?b.d:null; };
window.fvDoctorItems=function(){ var r=ranked(), best=r.find(function(x){ return x.on; });
  return r.map(function(x){ var tag=x.n===0?'Free':(x.n+' active');
    var label=x===best?'Suggested':(x.on?'On shift · '+tag:tag);
    return Object.assign({}, x.d, {name:pvxEsc(x.d.name)+'<span class="fv-load'+(x===best?' best':'')+(x.on?'':' off')+'" title="'+(x.on?'On shift':'Off shift')+' · '+tag+'">'+label+'</span>'}); }); };

if(LOBBY) return;

/* ---------- 2. stale-patient sweep ---------- */
var STALE_H=12, sheet=null, pill=null, AUTO_KEY='fvStaleAuto';
function staleList(){ var now=Date.now(); try{ return PATIENTS.filter(function(p){ return isActive(p)&&!p._demo&&p.status!=='Hospitalized'&&ms(p.arrival)&&(now-ms(p.arrival))>STALE_H*3600000&&!(p.staleKeepUntil&&ms(p.staleKeepUntil)>now); })
  .sort(function(a,b){ return ms(a.arrival)-ms(b.arrival); }); }catch(e){ return []; } }
function hrs(p){ var h=Math.round((Date.now()-ms(p.arrival))/3600000); return h>=48?Math.round(h/24)+' days':h+' h'; }
function when(p){ try{ return new Date(ms(p.arrival)).toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); }catch(e){ return ''; } }
function buildStale(){
  pill=document.createElement('button'); pill.id='fvStalePill'; pill.type='button'; document.body.appendChild(pill);
  pill.onclick=function(){ openSheet(); };
  sheet=document.createElement('div'); sheet.id='fvStale'; sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-label','Patients on the board over 12 hours');
  sheet.innerHTML='<div class="fs-scrim"></div><div class="fs-card"><div class="fs-head"><div><b>Still here?</b><span>These patients have been on the board over 12 hours. Clearing them keeps wait times and alerts accurate.</span></div><button class="fs-x" type="button" aria-label="Close">'+PVX_GI.xmark+'</button></div><div class="fs-list"></div><div class="fs-foot"><button class="fs-done" type="button">Done</button></div></div>';
  document.body.appendChild(sheet);
  sheet.querySelector('.fs-scrim').onclick=closeSheet; sheet.querySelector('.fs-x').onclick=closeSheet; sheet.querySelector('.fs-done').onclick=closeSheet;
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&sheet.classList.contains('show')){ e.stopPropagation(); closeSheet(); } },true);
  sheet.querySelector('.fs-list').addEventListener('click',function(e){ var b=e.target.closest('button[data-act]'); if(!b) return;
    var p=PATIENTS.find(function(x){ return String(x.id)===b.getAttribute('data-id'); }); if(!p) return; var act=b.getAttribute('data-act');
    if(act==='keep'){ p.staleKeepUntil=new Date(Date.now()+STALE_H*3600000); (p.timeline=p.timeline||[]).push({label:'Kept on board (12-hour review)', at:new Date(), meta:me().name}); try{ scheduleRender(); }catch(_){ try{ renderAll(); }catch(__){} } rowDone(b,'Kept'); return; }
    if(act==='admit'&&window.pvxCanAdmit&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }   /* n253 */
    /* Discharge / Admit need a second tap */
    if(!b.classList.contains('arm')){ sheet.querySelectorAll('button.arm').forEach(function(x){ x.classList.remove('arm'); x.textContent=x.getAttribute('data-label'); });
      b.classList.add('arm'); b.textContent='Confirm'; clearTimeout(b._t); b._t=setTimeout(function(){ b.classList.remove('arm'); b.textContent=b.getAttribute('data-label'); },4000); return; }
    try{ completePatient(p, act==='admit'?'Admitted':'Discharged'); }catch(err){ return; }
    rowDone(b, act==='admit'?'Admitted':'Discharged'); });
}
function rowDone(b,label){ var r=b.closest('.fs-row'); if(!r) return; r.classList.add('done'); r.querySelector('.fs-act').innerHTML='<span class="fs-ok">'+pvxEsc(label)+'</span>';
  setTimeout(function(){ r.remove(); if(!sheet.querySelector('.fs-row')) closeSheet(); updatePill(); },900); }
function renderSheet(){ var L=staleList(), list=sheet.querySelector('.fs-list');
  list.innerHTML=L.map(function(p){ var c='#6FD3E6'; try{ c=STATUSES[p.status].color; }catch(e){}
    return '<div class="fs-row"><span class="fs-med" style="--c:'+c+'">'+pvxEsc((p.name||'?')[0])+'</span><div class="fs-t"><b>'+pvxEsc(pn(p))+'</b><small>'+pvxEsc(hrs(p))+' · arrived '+pvxEsc(when(p))+' · '+pvxEsc(p.status)+' · '+pvxEsc(p.room||'Lobby')+'</small></div>'
      +'<div class="fs-act"><button type="button" data-act="discharge" data-label="Discharge" data-id="'+pvxEsc(p.id)+'">Discharge</button><button type="button" data-act="admit" data-label="Admit" data-id="'+pvxEsc(p.id)+'">Admit</button><button type="button" class="ghost" data-act="keep" data-label="Keep" data-id="'+pvxEsc(p.id)+'">Keep</button></div></div>'; }).join('')
    ||'<div class="fs-empty">All clear.</div>'; }
function openSheet(){ if(!sheet) return; renderSheet(); sheet.classList.add('show'); try{ localStorage.setItem(AUTO_KEY,String(Date.now())); }catch(e){} }
function closeSheet(){ if(sheet) sheet.classList.remove('show'); updatePill(); }
function updatePill(){ if(!pill) return; var n=staleList().length, show=n>0&&!onTV()&&!!me().uid;
  pill.classList.toggle('show',show); if(show) pill.innerHTML='<i></i>'+n+(n===1?' patient':' patients')+' over 12 hours<span>Review</span>'; }
function busy(){ var a=document.activeElement, t=a&&a.tagName; if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT') return true;
  try{ if(document.getElementById('drawer').classList.contains('open')) return true; }catch(e){} return !!document.querySelector('#critIsland .ci-pick, .modal.open, .sheet.open'); }
function hospHour(){ try{ return Number(new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',hour12:false}))%24; }catch(e){ return new Date().getHours(); } }
/* End-of-shift sweep at 7 AM / 7 PM, and at least once every 12 hours per screen */
function autoSweep(){ if(!sheet||onTV()||!me().uid||sheet.classList.contains('show')||busy()) return; if(!staleList().length) return;
  var last=0; try{ last=Number(localStorage.getItem(AUTO_KEY)||0); }catch(e){}
  var h=hospHour(), m=new Date().getMinutes(), shiftEdge=(h===7||h===19)&&m<30;
  if((shiftEdge&&Date.now()-last>45*60000)||Date.now()-last>12*3600000) openSheet(); }

/* ---------- 5. live presence ---------- */
var presId=null, presT=null, STALE_VIEW=150000;
function presWrite(id,on){ var u=me(); if(!u.uid||!DB||!id) return; var o={};
  try{ o['viewing.'+u.uid]=on?{name:u.name, at:Date.now()}:firebase.firestore.FieldValue.delete(); DB.collection('visits').doc(String(id)).update(o).catch(function(){}); }catch(e){} }
function presOpen(id){ if(presId&&presId!==id) presWrite(presId,false); presId=id; presWrite(id,true); clearInterval(presT);
  presT=setInterval(function(){ if(presId&&document.visibilityState==='visible') presWrite(presId,true); },60000); }
function presClose(){ if(presId) presWrite(presId,false); presId=null; clearInterval(presT); }
function viewers(p){ var v=p&&p.viewing, u=me(), out=[]; if(!v) return out; Object.keys(v).forEach(function(k){ var x=v[k]; if(k!==u.uid&&x&&Date.now()-ms(x.at)<STALE_VIEW) out.push(x.name||'Someone'); }); return out; }
window.fvPresenceChip=function(p){ var vs=viewers(p); if(!vs.length) return '';
  return '<div class="fv-pres" title="'+pvxEsc(vs.join(', '))+' viewing">'+vs.slice(0,3).map(function(n){ return '<span class="av">'+pvxEsc(inits(n))+'</span>'; }).join('')+'<span>'+pvxEsc(first(vs[0]))+(vs.length>1?' +'+(vs.length-1):'')+' viewing</span></div>'; };
try{ if(typeof openDrawer==='function'){ pvxAfter('openDrawer',function(pid){ try{ var p=PATIENTS.find(function(x){ return x.id===pid; }); if(p&&!p._demo) presOpen(pid); }catch(e){} tick(); },'#8'); } }catch(e){}
try{ if(typeof closeDrawer==='function'){ pvxAfter('closeDrawer',function(){ presClose(); },'#8'); } }catch(e){}
window.addEventListener('pagehide',presClose);

var bar=null, seen={}, warm=false, flashT=null, flashMsg='';
function sig(p){ return [p.status,p.room,p.doctor,p.prio,(p.waitingOn&&p.waitingOn.text)||''].join('|'); }
function describe(p,old){ var o=(old||'').split('|'), who=first(p.lastBy), n=p.name||'the patient';
  if(o[0]!==p.status) return who+' just moved '+n+' to '+p.status;
  if(o[1]!==p.room) return who+' just moved '+n+' to '+(p.room||'Lobby');
  if(o[2]!==p.doctor){ var d=''; try{ d=doc(p.doctor).name; }catch(e){} return who+' just assigned '+n+(d&&p.doctor!=='unassigned'?' to '+d:''); }
  if(o[3]!==String(p.prio)) return who+' just set '+n+' to P'+p.prio;
  return who+' just updated '+n; }
function tick(){
  try{
    var u=me(), dr=document.getElementById('drawer'), open=dr&&dr.classList.contains('open')&&typeof activePatient!=='undefined'&&activePatient;
    if(dr&&!bar){ bar=document.createElement('div'); bar.id='fvPresBar'; var head=dr.querySelector('.drawer-head'); (head||dr).appendChild(bar); }
    PATIENTS.forEach(function(p){ if(!isActive(p)) return; var s=sig(p), old=seen[p.id]; seen[p.id]=s;
      if(!warm||old===undefined||old===s) return;
      if(!p.lastByUid||p.lastByUid===u.uid||Date.now()-ms(p.lastAt)>20000) return;
      var msg=describe(p,old);
      var card=document.querySelector('.card[data-pid="'+p.id+'"]'); if(card){ card.classList.remove('fv-remote'); void card.offsetWidth; card.classList.add('fv-remote'); }
      if(open&&activePatient===p.id){ flashMsg=msg; clearTimeout(flashT); flashT=setTimeout(function(){ flashMsg=''; tick(); },8000); try{ notify(pvxEsc(msg),'',{icon:'info', color:'var(--accent)'}); }catch(e){} } });
    warm=true;
    if(bar){ var p=open?PATIENTS.find(function(x){ return x.id===activePatient; }):null, vs=p?viewers(p):[], html='';
      if(flashMsg) html='<span class="dot live"></span>'+pvxEsc(flashMsg);
      else if(vs.length) html=vs.slice(0,3).map(function(n){ return '<span class="av">'+pvxEsc(inits(n))+'</span>'; }).join('')+pvxEsc(vs.length===1?first(vs[0])+' is also viewing '+(p.name||''):first(vs[0])+' and '+(vs.length-1)+' more are viewing');
      if(bar._h!==html){ bar._h=html; bar.innerHTML=html; bar.classList.toggle('show',!!html); } }
    updatePill();
  }catch(e){}
}

function boot(){ buildStale(); setInterval(tick,1500); setInterval(autoSweep,60000); setTimeout(autoSweep,8000); tick(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
window.__fvOps={staleList:staleList, openSheet:openSheet, ranked:ranked, viewers:viewers, tick:tick};
})();