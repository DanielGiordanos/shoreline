





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
