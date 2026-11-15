
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
