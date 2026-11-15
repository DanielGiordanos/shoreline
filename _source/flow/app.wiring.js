

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
