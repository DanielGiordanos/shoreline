 
const TRI_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 7 9.5 17 5 12.5"/></svg>';
const TRI_CLIP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6"/><path d="M9 15h4"/></svg>';
function triageCardHtml(p){
const t=getTriage(p), st=t.status||'not_started', v=t.vitals||{}, a=t.assess||{};
const vv=(key)=>{ const val=v[key]; return (val!=null&&val!=='')?pvxEscQ(val):'—'; };   /* PVX-N377 */
const stateLabel = st==='complete'?PVX_GI.check+' Complete':(st==='in_progress'?'In Progress':'Not started');
const quick = ['weight','temp','hr'].map(k=>{ const c=TRIAGE_VITALS.find(x=>x.key===k);
return`<div class="tq"><span class="tq-v">${vv(k)}</span><span class="tq-l">${c.label}</span></div>`; }).join('');
const vitalsGrid = TRIAGE_VITALS.map(c=>`<div class="tv"><span class="tv-l">${c.label}</span><span class="tv-v">${vv(c.key)}</span></div>`).join('');
const assessRows = TRIAGE_ASSESS.map(c=>`<div class="tr-row"><span class="tr-l">${c.label}</span><span class="tr-v">${(a[c.key]!=null&&a[c.key]!=='')?pvxEscQ(a[c.key]):'—'}</span></div>`).join('');
const chief = (t.chief&&t.chief.length) ? t.chief.map(c=>`<span class="tri-chip">${pvxEscQ(c)}</span>`).join('') :'<span class="tri-muted">—</span>';
const byLine = st==='complete'?`Completed · ${pvxEscQ(t.by||'—')} • ${pvxEscQ(t.at||'')}`: (st==='in_progress'?'In progress':'Awaiting triage');
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
      <div class="tri-sect"><div class="tri-sh">History</div><div class="tri-text">${t.history?pvxEscQ(t.history):'—'}</div></div>
      <div class="tri-sect"><div class="tri-sh">Completed</div>
        <div class="tr-row"><span class="tr-l">Completed by</span><span class="tr-v">${pvxEscQ(t.by||'—')}</span></div>
        <div class="tr-row"><span class="tr-l">Completed at</span><span class="tr-v">${pvxEscQ(t.at||'—')}</span></div>
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
notify('Triage updated',`${pvxEscQ(p.name)} · ${pvxEscQ(p.hid)}`, {icon:'info', color:'var(--accent)'});
try{ if(typeof window.fvAfterTriage==='function') window.fvAfterTriage(p); }catch(e){ console.warn('[triage → sheet, Rounds]',e); }   /* n250 */
}
