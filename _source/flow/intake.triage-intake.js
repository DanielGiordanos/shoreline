
 
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
notify(label,`${pvxEscQ(p.name)} ${pvxEscQ(p.last)}`, {icon:'check', color:'var(--s-exam)'});
closeIntake();
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
