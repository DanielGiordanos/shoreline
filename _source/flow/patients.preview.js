


let pvTimer=null, pvHide=null, pvPid=null, pvShown=false;
function previewHtml(p){
const t=getTriage(p), v=t.vitals||{}, a=t.assess||{};
const NR='<span class="pv-nr">Not recorded</span>';
const vit=key=>{ const val=v[key]; return (val!=null&&val!=='')?val:NR; };
const ass=key=>{ const val=a[key]; return (val!=null&&val!=='')?pvxEscQ(val):NR; };
const lastEv=(p.timeline&&p.timeline.length)?p.timeline[p.timeline.length-1]:null;
const docLine=p.doctor==='unassigned'?NR:`${docAv(p.doctor)}${doc(p.doctor).name}`;
return`
    <div class="pv-name">${pvxEscQ(p.name+' '+(p.last||'')).trim()}</div>
    <div class="pv-sub">${pvxEscQ(p.species)} • ${pvxEscQ(formatPatientAge(p)||'—')} • ${pvxEscQ(p.breed||'—')}</div>
    <div class="pv-owner">Owner · ${p.owner?pvxEscQ(p.owner):NR}</div>
    <div class="pv-pills">${statusPill(p.status)}<span class="pill prio-${p.prio}">P${p.prio}</span>
      <span class="pill" style="color:var(--ink-500);background:var(--fill-soft)">${pvxEscQ(p.room)}</span></div>
    <div class="pv-row"><span class="pv-k">Doctor</span><span class="pv-v">${docLine}</span></div>
    <div class="pv-row"><span class="pv-k">Reason</span><span class="pv-v">${p.reason?pvxEscQ(p.reason):NR}</span></div>
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
    <div class="pv-row"><span class="pv-k">Last</span><span class="pv-v">${lastEv? pvxEscQ(lastEv.label)+' · '+fmtTime(lastEv.at) : NR}</span></div>
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
