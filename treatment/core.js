
/* ═══════════════════════════════════════════════════════════════
   FLOW · CLINICAL MODULE — application logic
   Data model mirrors: patients / visits / doctors / orders / tasks /
   completions / notes / audit_log / templates. In-memory prototype.
   ═══════════════════════════════════════════════════════════════ */
/* tsMorphHTML: render new markup, then touch only the elements that differ (no full rebuild, no lost scroll) */
function tsMorphHTML(el,html){ if(!el) return; if(!el.firstChild){ el.innerHTML=html; return; } var t=document.createElement('template'); t.innerHTML=html; tsMorphKids(el,t.content); }
function tsMorphKids(a,b){ var an=Array.prototype.slice.call(a.childNodes), bn=Array.prototype.slice.call(b.childNodes);
  if(an.length!==bn.length){ while(a.firstChild) a.removeChild(a.firstChild); var f=document.createDocumentFragment(); bn.forEach(function(n){ f.appendChild(n); }); a.appendChild(f); return; }
  for(var i=0;i<an.length;i++) tsMorphNode(an[i],bn[i]); }
function tsMorphNode(x,y){
  if(x.nodeType!==y.nodeType||x.nodeName!==y.nodeName){ x.parentNode.replaceChild(y,x); return; }
  if(x.nodeType!==1){ if(x.nodeValue!==y.nodeValue) x.nodeValue=y.nodeValue; return; }
  if(x.isEqualNode(y)) return;
  var tag=x.nodeName; if(tag==='SELECT'){ x.parentNode.replaceChild(y,x); return; }
  var flash=x.classList&&x.classList.contains('ts-flash'), xa=x.attributes, ya=y.attributes, i;
  for(i=xa.length-1;i>=0;i--){ if(!y.hasAttribute(xa[i].name)) x.removeAttribute(xa[i].name); }
  for(i=0;i<ya.length;i++){ if(x.getAttribute(ya[i].name)!==ya[i].value) x.setAttribute(ya[i].name,ya[i].value); }
  if(flash) x.classList.add('ts-flash');
  if(tag==='INPUT'||tag==='TEXTAREA') return;   /* keep what someone is typing */
  tsMorphKids(x,y); }
function tsSetHTML(el,h){ if(el&&el._tsh!==h){ el.innerHTML=h; el._tsh=h; } }
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* theme + portal chrome */
function toggleDark(){document.body.classList.toggle('dark');var d=document.body.classList.contains('dark');try{document.documentElement.style.background=d?'#080E1A':'#FFFFFF';}catch(e){}try{document.cookie='pvx_theme='+(d?'dark':'light')+';domain=.pravix.app;path=/;max-age=31536000;SameSite=Lax';}catch(e){}try{document.cookie='pvx_theme='+(d?'dark':'light')+';path=/;max-age=31536000;SameSite=Lax';}catch(e){}}
function logout(){toast('Logged out of Shoreline Flow');}

/* ── simulated ICU clock ── */
const BASE_NOW=10*60+12, START_EPOCH=Date.now();
function nowMin(){return BASE_NOW+(Date.now()-START_EPOCH)/60000;}
function fmtTime(min){min=((Math.round(min)%1440)+1440)%1440;let h=Math.floor(min/60),m=min%60,ap=h<12?'AM':'PM',hh=h%12;if(hh===0)hh=12;return `${hh}:${String(m).padStart(2,'0')} ${ap}`;}
function hourLabel(h){let ap=h<12?'A':'P',hh=h%12;if(hh===0)hh=12;return {h:hh,ap};}
function seed(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}

/* ── reference data ── */
const STAFF=['DG','KM','AR','JL'];
const VISIT={id:'9208100',patient:'Cookie Giordano',client:'Giordano',species:'Dog',breed:'Domestic Long Hair',sex:'Female',age:'5 yr',
  weight:50,temp:102.1,hr:118,rr:28,mm:'Pink',crt:'<2',mentation:'BAR',dept:'ER',doctorFrom:'Bingham, Katherine',doctorTo:'Nolte, Dawn',
  location:'ICU Cage 2',status:'Critical',code:'DNR',ecollar:'Soft',allergies:'None known',estimate:'Approved',admit:'5/28 · 6:40 AM',day:'Day 1 of 2',
  service:'ER',department:'Emergency',hospStatus:'Hospitalized',pain:'1',bsa:'1.47',rer:'1,419',checkin:'05/28/26 · 6:40 AM',liaison:'Not assigned',dischargeDate:'Not set',dischargeTime:'Not set',
  commPref:'Phone',updatePref:'Call with updates',lastUpdate:'9:10 AM',nextUpdate:'Before 10 AM',commNote:'Owner briefed on stable overnight status and approved continued care.',
  estLow:3596.40,estHigh:4495.50,estCurrent:3812.20,estApprovedBy:'Client',estApprovedTime:'2/16/2026 8:57 AM',estClientInitials:'On file',estLastUpdated:'10:17 AM',estPlan:'102496676',
  complaint:'Vomiting and lethargy',problems:['Vomiting','Diabetic Ketosis','Azotemia','Coughing','Inappetence','Lethargy'],
  plan:['IV fluids (LRS 60 mL/hr + KCl)','Antiemetic therapy','Pain control','Recheck electrolytes in AM','Monitor appetite & vomiting'],
  alerts:['DNR','Soft E-collar','Monitor appetite','Estimate approved'],pending:['Recheck electrolytes','Monitor appetite','Owner update before 10 AM']};
const OTHERS=[
  {name:'Storm Giordano',species:'Cat',sig:'Cat · DSH · MN · 6 kg',status:'Watch',doctor:'Berkwitt, Larry',loc:'Cat Ward 4',code:'FULL',problems:['Azotemia','Inappetence'],due:2,late:0,last:'9:48 AM',rounds:'Pending'},
  {name:'Nico Giordano',species:'Cat',sig:'Cat · DSH · FS · 4 kg',status:'Stable',doctor:'Downes, Annie',loc:'Wards 7',code:'FULL',problems:['Post-op recovery'],due:1,late:0,last:'9:55 AM',rounds:'Done'},
  {name:'Robbie Giordano',species:'Dog',sig:'Dog · Lab · MN · 31 kg',status:'Discharge pending',doctor:'Nolte, Dawn',loc:'Wards 2',code:'FULL',problems:['Gastroenteritis — resolving'],due:0,late:0,last:'9:30 AM',rounds:'Done'},
  {name:'Willow Craven',species:'Dog',sig:'Dog · TSC · FS · 9 kg',status:'Procedure',doctor:'Bingham, Katherine',loc:'Wards 4AJ',code:'FULL',problems:['Dental — extractions'],due:3,late:1,last:'8:10 AM',rounds:'Pending'},
];

/* ── orders ── */
let ORDERS=[
  {id:'o1',type:'obs',section:'Basic Observation',name:'Temperature',freq:'q4h',start:0,unit:'°F'},
  {id:'o2',type:'obs',section:'Basic Observation',name:'Heart Rate',freq:'q4h',start:0,unit:'bpm'},
  {id:'o3',type:'obs',section:'Basic Observation',name:'Respiratory Rate',freq:'q4h',start:0,unit:'rpm'},
  {id:'o4',type:'obs',section:'Basic Observation',name:'CRT',freq:'q4h',start:0},
  {id:'o5',type:'obs',section:'Basic Observation',name:'Mucous Membrane',freq:'q4h',start:0},
  {id:'o6',type:'obs',section:'Basic Observation',name:'Mentation',freq:'q4h',start:0},
  {id:'o7',type:'obs',section:'Basic Observation',name:'Pain Score',freq:'q4h',start:0},
  {id:'o8',type:'obs',section:'Basic Observation',name:'Weight',freq:'q24h',start:8,unit:'kg'},
  {id:'o9',type:'obs',section:'Basic Observation',name:'Food',freq:'q8h',start:0},
  {id:'o10',type:'obs',section:'Basic Observation',name:'Water',freq:'q8h',start:0},
  {id:'o11',type:'obs',section:'Basic Observation',name:'Vomiting',freq:'q4h',start:2},
  {id:'o12',type:'obs',section:'Basic Observation',name:'Urination',freq:'q8h',start:2},
  {id:'o13',type:'obs',section:'Basic Observation',name:'Defecation',freq:'q8h',start:2},
  {id:'o20',type:'fluid',section:'Continuous Infusions',name:'LRS + KCl 20 mEq/L',rate:'60 mL/hr',additive:'KCl 20 mEq/L',start:1,cont:true},
  {id:'o30',type:'med',section:'Medications',name:'Cerenia',dose:1,unit:'mg/kg',route:'IV',freq:'q24h',start:8,conc:10,notes:'Give slowly IV over 1–2 min'},
  {id:'o31',type:'med',section:'Medications',name:'Unasyn',dose:30,unit:'mg/kg',route:'IV',freq:'q8h',start:0,conc:250,notes:''},
  {id:'o32',type:'med',section:'Medications',name:'Methadone',dose:0.2,unit:'mg/kg',route:'IV',freq:'q6h',start:0,conc:10,notes:'Pain control'},
  {id:'o33',type:'med',section:'Medications',name:'Acetazolamide',dose:10,unit:'mg/kg',route:'PO',freq:'q12h',start:8,conc:0},
  {id:'o34',type:'med',section:'Medications',name:'Acepromazine',dose:0.02,unit:'mg/kg',route:'PO',freq:'PRN',start:0,conc:0},
  {id:'o35',type:'med',section:'Medications',name:'Allopurinol',dose:10,unit:'mg/kg',route:'PO',freq:'q24h',start:8,conc:0},
  {id:'o40',type:'care',section:'Patient Care',name:'Walk',freq:'q6h',start:2},
  {id:'o41',type:'care',section:'Patient Care',name:'Check IV catheter',freq:'q4h',start:0},
  {id:'o42',type:'care',section:'Patient Care',name:'E-collar check',freq:'q8h',start:0},
  {id:'o43',type:'care',section:'Patient Care',name:'Nursing note',freq:'q8h',start:0},
  {id:'o44',type:'care',section:'Patient Care',name:'Cage cleaned',freq:'q8h',start:4},
  {id:'o50',type:'diag',section:'Diagnostics',name:'Blood glucose',freq:'q6h',start:0,unit:'mg/dL'},
  {id:'o51',type:'diag',section:'Diagnostics',name:'Recheck electrolytes',freq:'Once',start:8},
];
const SECTIONS=[
  {key:'Basic Observation',icon:'M3 12h4l2-7 4 14 2-7h6'},
  {key:'Continuous Infusions',icon:'M12 3c3 4 5 6.5 5 9a5 5 0 01-10 0c0-2.5 2-5 5-9z'},
  {key:'Medications',icon:'M10.5 20.5a4.95 4.95 0 01-7-7l6-6a4.95 4.95 0 017 7l-6 6zM8 8l8 8'},
  {key:'Patient Care',icon:'M12 21s-7-4.35-9.5-8.5C.8 9.6 2.3 6 5.5 6 7.5 6 9 7.2 12 10c3-2.8 4.5-4 6.5-4 3.2 0 4.7 3.6 3 6.5C19 16.65 12 21 12 21z'},
  {key:'Diagnostics',icon:'M9 3v6l-5 9a2 2 0 002 3h12a2 2 0 002-3l-5-9V3M8 3h8'},
];
const FREQ_INT={q1h:1,q2h:2,q4h:4,q6h:6,q8h:8,q12h:12,q24h:24,SID:24,BID:12,TID:8,QID:6};
function freqTimes(o){if(['PRN','Continuous','Until discontinued','Custom'].includes(o.freq))return [];if(o.freq==='Once')return [o.start];const int=FREQ_INT[o.freq]||24,out=[];for(let h=o.start;h<24;h+=int)out.push(h);return out;}

let TASKS=[],AUDIT=[],NOTES=[],TASK_SEQ=0;
const VITAL_VAL={'Temperature':s=>(101.3+s*1.3).toFixed(1),'Heart Rate':s=>Math.round(110+s*16),'Respiratory Rate':s=>Math.round(23+s*11),
  'CRT':()=>'<2','Mucous Membrane':()=>'Pk','Mentation':()=>'BAR','Pain Score':s=>Math.round(1+s*2),'Weight':()=>'50',
  'Food':s=>s>0.55?'Ate':'Off','Water':()=>'Drank','Vomiting':s=>s>0.85?'Yes':'No','Urination':()=>'Nml','Defecation':()=>'Nml','Blood glucose':s=>Math.round(180+s*140)};
function buildTasks(){TASKS=[];ORDERS.forEach(o=>{if(o.cont)return;freqTimes(o).forEach(h=>{const min=h*60,t={id:'t'+(TASK_SEQ++),orderId:o.id,order:o,sched:min,status:null,by:null,completedMin:null,value:null,notes:null,severity:0};const past=min<=nowMin()-30,sk=seed(o.id+'@'+h);if(past&&sk>0.10&&!o.review){t.status='completed';t.completedMin=min+Math.round(sk*7)+2;t.by=STAFF[Math.floor(sk*STAFF.length)];if(VITAL_VAL[o.name])t.value=VITAL_VAL[o.name](sk);if(o.name==='Vomiting'&&t.value==='Yes')t.severity=1;if(o.name==='Food'&&t.value==='Off')t.severity=1;}TASKS.push(t);});});seedAudit();}
function deriveStatus(t){if(t.status==='completed')return 'completed';if(t.status==='held'||t.status==='skipped')return 'skipped';if(t.status==='delayed')return 'scheduled';const n=nowMin();if(t.sched>n+18)return 'scheduled';if(t.sched>=n-18)return 'due';return 'overdue';}
function medDose(o){const total=(o.dose*VISIT.weight);let mg=total>=1?total.toFixed(total<10?1:0):total.toFixed(2);let vol=o.conc?(total/o.conc):null;return {mg:mg+' '+(o.unit.replace('/kg','')),volume:vol!=null?vol.toFixed(2)+' mL':'—',raw:total};}
function seedAudit(){AUDIT=[];AUDIT.push({min:400,type:'doctor',desc:`Patient admitted — <b>${VISIT.patient}</b> to ICU Cage 2`,who:'Dr. Bingham'});AUDIT.push({min:405,type:'doctor',desc:`Code status set to <b>DNR</b>`,who:'Dr. Bingham'});AUDIT.push({min:410,type:'fluid',desc:`Started <b>LRS + KCl 20 mEq/L</b> at 60 mL/hr`,who:'Dr. Bingham'});
  TASKS.filter(t=>t.status==='completed').forEach(t=>{const o=t.order;let d;if(o.type==='med')d=`<b>${o.name}</b> ${medDose(o).mg} ${o.route} completed`;else if(o.type==='obs')d=`${o.name} <b>${t.value??'done'}${o.unit&&t.value&&!isNaN(t.value)?o.unit:''}</b> recorded`;else if(o.type==='diag')d=`${o.name} <b>${t.value??'collected'}</b>`;else d=`${o.name} completed`;AUDIT.push({min:t.completedMin,type:o.type==='obs'?'vital':o.type,desc:d,who:t.by});});
  AUDIT.push({min:530,type:'fluid',desc:`Dr. Nolte reviewed <b>LRS</b> rate — recheck electrolytes AM before change`,who:'Dr. Nolte'});AUDIT.push({min:550,type:'comm',desc:`Owner update completed — stable overnight, ate small amount`,who:'Dr. Nolte'});AUDIT.sort((a,b)=>a.min-b.min);}
NOTES=[{min:480,type:'nursing',author:'KM',role:'Technician',body:'Patient BAR this AM. No vomiting overnight. Ate ¼ can a/d, drank small amount. Urinated x2, no straining.'},
  {min:552,type:'doctor',author:'Dr. Nolte',role:'Doctor',body:'Continue current plan. Recheck electrolytes AM — trending K+ before adjusting additive. Reassess appetite at noon.'},
  {min:555,type:'communication',author:'Dr. Nolte',role:'Doctor',body:'Spoke with owner. Updated on stable overnight status. Owner approved continued care. Will update again this PM.'}];

/* ── status counts ── */
function statusCounts(){let c={completed:0,due:0,late:0,missed:0,scheduled:0,held:0,review:0};TASKS.forEach(t=>c[deriveStatus(t)]++);return c;}

/* ═══ MODULE + TAB NAVIGATION ═══ */
let currentCTab='dash', currentRole='tech';
function selectCTab(tab){
  currentCTab=tab;
  $$('#clinSwitcher .seg').forEach(c=>c.classList.toggle('active',c.dataset.ctab===tab));
  $$('.ctab').forEach(c=>c.classList.add('hidden'));
  $('#ctab-'+tab).classList.remove('hidden');
  $('#stage').classList.toggle('sheet-active',tab==='sheet'||tab==='vitals');
  closeBrief();
  if(tab==='dash')renderDash();if(tab==='sheet')renderSheet();if(tab==='vitals')renderVitals();if(tab==='rounds')renderRounds();if(tab==='timeline')renderTimeline();if(tab==='notes')renderNotes();
  $('#stage').scrollTop=0;
}
$$('#clinSwitcher .seg').forEach(b=>b.onclick=()=>selectCTab(b.dataset.ctab));

/* helper: species emoji + class */
function spTag(species){return /^(cat|fel)/i.test(String(species||''))?'FEL':'CAN';}
function spClass(species){return /^(cat|fel)/i.test(String(species||''))?'sp-fel':'sp-can';}
function monogram(name){return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function ptBadge(name,species,style){return `<div class="pt-emoji ${spClass(species)}"${style?` style="${style}"`:''}>${monogram(name)}<span class="sp-tag">${spTag(species)}</span></div>`;}
const IC_TRI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L14.4 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
const IC_CHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const IC_INFO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>';
const A_IC={crit:IC_TRI,warn:IC_TRI,ok:IC_CHK,info:IC_INFO};
function kvr(k,v){return `<div class="kvrow"><span class="kk">${k}</span><span class="vv">${v}</span></div>`;}
const DEPT={'ER':'Emergency Medicine','Emergency':'Emergency Medicine','IM':'Internal Medicine','SX':'Surgery','Surgery':'Surgery','Oncology':'Oncology','Neuro':'Neurology','Neurology':'Neurology'};
function deptName(d){return DEPT[d]||d;}
function money(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function estimateCard(){
  const lo=VISIT.estLow,hi=VISIT.estHigh,cur=VISIT.estCurrent,rem=hi-cur;
  const progress=(cur-lo)/(hi-lo)*100, clamped=Math.max(0,Math.min(100,progress));
  const color=clamped<75?'cyan':clamped<90?'amber':clamped<=100?'coral':'red';
  const labelPos=Math.max(20,Math.min(80,clamped));
  const remLabel=rem>=0?money(rem):('−'+money(Math.abs(rem)));
  const chk='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M8 12.5l2.5 2.5 5.5-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const info='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>';
  return `<div class="panel est-card" tabindex="0" role="button" onclick="openEstimate()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openEstimate();}"><h4>Estimate Range</h4><div class="est">
    <div class="est-range">${money(lo)} — ${money(hi)}</div>
    <div class="est-status"><span class="est-pill approved">${chk}Approved</span></div>
    <div class="est-div"></div>
    <div class="est-row"><span class="k">Current Charges</span><span class="v">${money(cur)}</span></div>
    <div class="est-row"><span class="k">Remaining</span><span class="v ${color}">${remLabel}</span></div>
    <div class="est-bar-wrap"><div class="est-bar"><div class="est-fill ${color}" style="width:${clamped.toFixed(1)}%"></div><div class="est-cap"></div><div class="est-marklabel ${color}" style="left:${labelPos.toFixed(1)}%">${remLabel} remaining</div></div>
      <div class="est-ends"><span><b>${money(lo)}</b>Low End</span><span class="hi"><b>${money(hi)}</b>High End</span></div></div>
    <div class="est-note">${info}Stay near the low end when possible. Do not exceed the high end without updated client authorization.</div>
    <div class="est-foot">Updated ${VISIT.estLastUpdated}</div>
  </div></div>`;
}
function openEstimate(){
  const r=(k,v)=>`<div><span>${k}</span><strong>${v}</strong></div>`;
  const inner=`<h2>Estimate Authorization</h2><div class="em-rows">
    ${r('Low End',money(VISIT.estLow))}${r('High End',money(VISIT.estHigh))}${r('Current Charges',money(VISIT.estCurrent))}${r('Remaining to High End',money(VISIT.estHigh-VISIT.estCurrent))}
    ${r('Approved By',VISIT.estApprovedBy)}${r('Approved Time',VISIT.estApprovedTime)}${r('Client Initials',VISIT.estClientInitials)}${r('Last Updated',VISIT.estLastUpdated)}
  </div><div class="em-linked"><span>Linked Treatment Plan</span><strong>${VISIT.estPlan}</strong></div>`;
  openModal(inner,'liaison-modal estimate-modal');
}
/* ── inline click-to-edit values + generic Flow popover ── */
function ieVal(id,val,handler){return `<span class="inline-edit-value" id="${id}" onclick="${handler}(event)"><span class="ie-txt">${val}</span><svg class="ie-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>`;}
function setIe(id,val){const el=document.querySelector('#'+id+' .ie-txt');if(el)el.textContent=val;}
let _popCleanup=null;
function _closePop(){if(_popCleanup){_popCleanup();_popCleanup=null;}}
function _openPop(anchor,inner){
  _closePop();
  const pop=document.createElement('div');pop.className='fl-pop';pop.id='flPop';pop.innerHTML=inner;
  document.body.appendChild(pop);anchor.classList.add('active');
  const r=anchor.getBoundingClientRect(),pw=pop.offsetWidth||240,ph=pop.offsetHeight||280;
  let left=r.left;if(left+pw>window.innerWidth-12)left=window.innerWidth-12-pw;if(left<12)left=12;
  let top=r.bottom+6;if(top+ph>window.innerHeight-12)top=Math.max(12,r.top-ph-6);
  pop.style.left=left+'px';pop.style.top=top+'px';
  const outside=e=>{if(!pop.contains(e.target)&&!anchor.contains(e.target))_closePop();};
  const onKey=e=>{if(e.key==='Escape')_closePop();};
  const onResize=()=>_closePop();
  setTimeout(()=>document.addEventListener('mousedown',outside),0);
  document.addEventListener('keydown',onKey);window.addEventListener('resize',onResize);
  _popCleanup=()=>{pop.remove();anchor.classList.remove('active');document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize);};
  return pop;
}

/* Discharging liaison picker (alphabetical by first name, Not assigned pinned) */
const LIAISONS=['Alexa Marucci','Alexandra Rimkus','Daniel Giordano','Jamie Cisneros','Melissa Hamilton','Nyla Chase','Rhiannon Cappannelli','Sara DeVitto','Stephanie Bamford','Tammy Guinto'];
function openLiaison(ev){ev.stopPropagation();
  openModal(`<div class="lm-head"><div class="lm-title">Discharging Liaison</div><div class="lm-sub">Select who will discharge this patient</div></div>`+
    `<div class="lp-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="lpSearch" placeholder="Search liaison…" autocomplete="off" oninput="renderLiaisonList(this.value)"></div>`+
    `<div class="lp-list" id="lpList"></div>`,'liaison-modal');
  renderLiaisonList('');const si=document.getElementById('lpSearch');if(si)si.focus();
}
function renderLiaisonList(q){
  const list=document.getElementById('lpList');if(!list)return;
  const check='<svg class="lp-chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  const opts=['Not assigned',...LIAISONS].filter(n=>n.toLowerCase().includes((q||'').toLowerCase()));
  list.innerHTML=opts.length?opts.map(n=>`<button class="lp-item${n===VISIT.liaison?' sel':''}" data-n="${n}" onclick="selectLiaison(this.dataset.n)">${n}${n===VISIT.liaison?check:''}</button>`).join(''):`<div class="lp-empty">No liaisons found.</div>`;
}
function selectLiaison(n){VISIT.liaison=n;setIe('liaisonVal',n);closeModal();toast('Discharging liaison: '+n);}

/* Discharge time picker (24h) */
let _tpH='00',_tpM='00';
function openTimePicker(ev){ev.stopPropagation();
  const cur=VISIT.dischargeTime!=='Not set'?VISIT.dischargeTime:'00:00';[_tpH,_tpM]=cur.split(':');
  const hours=[...Array(24)].map((_,i)=>String(i).padStart(2,'0')),mins=['00','05','10','15','20','25','30','35','40','45','50','55'];
  const col=(arr,sel,id)=>`<div class="tp-col" id="${id}">${arr.map(v=>`<button class="tp-opt${v===sel?' sel':''}" data-v="${v}" onclick="tpPick('${id}','${v}')">${v}</button>`).join('')}</div>`;
  _openPop(ev.currentTarget,`<div class="tp"><div class="tp-head">Discharge Time · 24h</div><div class="tp-cols"><div class="tp-colwrap"><div class="tp-lbl">Hour</div>${col(hours,_tpH,'tpH')}</div><div class="tp-sep">:</div><div class="tp-colwrap"><div class="tp-lbl">Min</div>${col(mins,_tpM,'tpM')}</div></div><button class="glass-btn tp-set" onclick="setTimeVal()">Set Time</button></div>`);
  ['tpH','tpM'].forEach(id=>{const s=document.querySelector('#'+id+' .sel');if(s)s.scrollIntoView({block:'center'});});
}
function tpPick(id,v){if(id==='tpH')_tpH=v;else _tpM=v;const col=document.getElementById(id);if(col)[...col.children].forEach(b=>b.classList.toggle('sel',b.dataset.v===v));}
function setTimeVal(){const t=_tpH+':'+_tpM;VISIT.dischargeTime=t;setIe('dcTimeVal',t);_closePop();toast('Discharge time: '+t);}

/* Discharge date calendar */
let _dpView,_dpSel;const _dpToday=new Date(2026,4,28);
function parseMDY(s){const p=s.split('/').map(Number);return new Date(2000+p[2],p[0]-1,p[1]);}
/* shared centered glass modal system (calendar, liaison, future selectors) */
let _modalCleanup=null;
function closeModal(){if(_modalCleanup){_modalCleanup();_modalCleanup=null;}}
function openModal(inner,cls){closeModal();_closePop();
  const bd=document.createElement('div');bd.className='modal-backdrop';
  const modal=document.createElement('div');modal.className=cls;modal.innerHTML=inner;
  document.body.appendChild(bd);document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('open'),15);
  bd.addEventListener('mousedown',closeModal);
  _modalCleanup=()=>{modal.remove();bd.remove();};
  return modal;
}
function openDatePicker(ev){ev.stopPropagation();
  _dpSel=VISIT.dischargeDate!=='Not set'?parseMDY(VISIT.dischargeDate):null;
  _dpView=_dpSel?new Date(_dpSel.getFullYear(),_dpSel.getMonth(),1):new Date(_dpToday.getFullYear(),_dpToday.getMonth(),1);
  openModal(`<div class="dp" id="dpBody"></div>`,'cal-modal');renderCal();
}
function renderCal(){
  const b=document.getElementById('dpBody');if(!b)return;
  const y=_dpView.getFullYear(),m=_dpView.getMonth(),startDow=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const chev=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M${d>0?'9 6l6 6-6 6':'15 6l-6 6 6 6'}"/></svg>`;
  let cells='';for(let i=0;i<startDow;i++)cells+='<div class="dp-cell empty"></div>';
  for(let d=1;d<=days;d++){const isT=y===_dpToday.getFullYear()&&m===_dpToday.getMonth()&&d===_dpToday.getDate();const isS=_dpSel&&y===_dpSel.getFullYear()&&m===_dpSel.getMonth()&&d===_dpSel.getDate();cells+=`<button class="dp-cell${isT?' today':''}${isS?' sel':''}" onclick="pickDate(${y},${m},${d})"><span class="dn">${d}</span></button>`;}
  b.innerHTML=`<div class="dp-head"><button class="dp-nav" onclick="calMove(-1)">${chev(-1)}</button><div class="dp-title">${MN[m]} ${y}</div><button class="dp-nav" onclick="calMove(1)">${chev(1)}</button></div><div class="dp-dow">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(x=>`<span>${x}</span>`).join('')}</div><div class="dp-grid">${cells}</div>`;
}
function calMove(n){_dpView=new Date(_dpView.getFullYear(),_dpView.getMonth()+n,1);renderCal();}
function pickDate(y,m,d){const s=String(m+1).padStart(2,'0')+'/'+String(d).padStart(2,'0')+'/'+String(y).slice(2);VISIT.dischargeDate=s;setIe('dcDateVal',s);closeModal();toast('Discharge date: '+s);}
const weightTrend=[{label:'5/28',value:49.2},{label:'5/29',value:49.6},{label:'5/30',value:50.0}];
function weightTrendChart(){
  const d=weightTrend,n=d.length,x0=14,x1=286,top=20,bot=46,base=56;
  const vals=d.map(p=>p.value),vmin=Math.min(...vals),vmax=Math.max(...vals);
  const xs=d.map((_,i)=>n===1?(x0+x1)/2:x0+i*(x1-x0)/(n-1));
  const ys=d.map(p=>vmax===vmin?(top+bot)/2:top+(1-(p.value-vmin)/(vmax-vmin))*(bot-top));
  const pts=xs.map((x,i)=>`${x.toFixed(1)} ${ys[i].toFixed(1)}`);
  const line='M'+pts.join(' L');
  const fill='M'+pts.join(' L')+` L${x1} ${base} L${x0} ${base} Z`;
  const dots=xs.map((x,i)=>`<circle class="trend-dot${i===n-1?' current':''}" cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="${i===n-1?4:3}"><title>${d[i].label}: ${d[i].value} kg${i===n-1?' · Current':''}</title></circle>`).join('');
  const labels=xs.map((x,i)=>`<text x="${x.toFixed(1)}" y="63" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${d[i].label}</text>`).join('');
  return `<div class="weight-trend"><div class="trend-header"><span>Weight Trend</span><strong>${VISIT.weight} kg</strong></div>
    <svg viewBox="0 0 300 64" preserveAspectRatio="none"><path class="trend-fill" d="${fill}"/><path class="trend-line" d="${line}"/>${dots}${labels}</svg></div>`;
}

/* clinical status → Flow pill class */
function clinPill(s){const m={'Critical':'st-procedure','Watch':'st-waiting','Stable':'st-admitted','Discharge pending':'st-discharged','Procedure':'st-diagnostics','Hospitalized':'st-hospitalized'}[s]||'st-hospitalized';return `<span class="pill ${m}"><span class="d"></span>${s}</span>`;}

/* ═══ DASHBOARD ═══ */
/* ═══ STATUS BOARD (Instinct-style patient flow, Flow-skinned) ═══ */
const IC={
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg>',
  timer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
  caretUp:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8l5 6H7z"/></svg>',
  pin:'<svg class="pt-pin" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2l1.5 1.5L13 6l4 4 2.5-2.5L21 9l-6 6-1.4-1.4-3.3 3.3L8 19l-3-3 2.1-2.3L5.7 12 2 6l4-4z"/></svg>',
  dots:'<svg class="pt-dots" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
  vit:'<svg class="vit-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
  tri:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.3 6 5.5 6 7.5 6 9 7.2 12 10c3-2.8 4.5-4 6.5-4 3.2 0 4.7 3.6 3 6.5C19 16.65 12 21 12 21z"/></svg>',
  cage:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M13 5v14M18 5v14"/></svg>',
  copy:'<svg class="cage-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L16.2 2h-4l-.4 2.5a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.5h4l.4-2.5c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>',
  person:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.1a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 21V12h6v9"/></svg>',
  flow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h8l-2 8 10-12h-8z"/></svg>',
  dotSm:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M18 14l.9 2.6L21.5 17.5l-2.6.9L18 21l-.9-2.6L14.5 17.5l2.6-.9z"/></svg>',
};
const WARDS=['Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Comfort Room','Lobby','Treatment Area','Surgery','Wards','Isolation','Internal Medicine','ICU'];
const SB_PATIENTS=[
  {name:"Ginger Ale O'Brien",sig:'3.5 YO FS GOLD',cage:'CA23D8',ls:'ALS',reason:'Recheck vomiting',dr:'STM',ward:'Room 1',inout:'IN',date:'10/31/2025',time:'9:56A',alerts:[{t:'warn',x:'Anxious'}],service:'General Practice',owner:"Abby O'Brien",phone:'(856) 296-6192',belongings:'',pinned:true,blocks:[]},
  {name:'Mickey Roberts',sig:'3 YO MC JRUT · 13 kg',cage:'CA256B9',ls:'ALS',reason:'Annual exam',dr:'EMR',ward:'Lobby',inout:'IN',date:'10/31/2025',time:'9:54A',alerts:[{t:'warn',x:'Anxious'},{t:'crit',x:'Caution'}],service:'General Practice',owner:'Eric Roberts',phone:'(518) 396-7844',belongings:'',blocks:[{h:10,status:'completed',label:'8'}]},
  {name:'Moose Lightfoot',sig:'8 YO MC AMASTX · 21 kg',cage:'CA241CC',ls:'BLS',reason:'Senior wellness exam',dr:'AJM',ward:'Room 3',inout:'IN',date:'10/31/2025',time:'10:47A',alerts:[{t:'warn',x:'Cuddle Bug'}],service:'Emergency/Critical Care',owner:'Ron Lightfoot',phone:'(609) 859-7895',belongings:'',blocks:[{h:10,status:'completed',label:'8'}]},
  {name:'Oreo Franklin',sig:'4 YO FS MIXX',cage:'310240',ls:'ALS',reason:'Ear hematoma',dr:'STM',ward:'Treatment Area',inout:'IN',date:'10/31/2025',time:'9:55A',alerts:[],service:'General Practice',owner:'Heather Franklin',phone:'(555) 215-2016',belongings:'',blocks:[]},
  {name:'Pepe Cromwell',sig:'8 YO MC PITTX',cage:'CA241D0',ls:'DNR',reason:'Senior annual wellness and bump on back',dr:'EMR',ward:'Lobby',inout:'IN',date:'10/31/2025',time:'9:54A',alerts:[],service:'General Practice',owner:'Henry Cromwell',phone:'(609) 326-9874',belongings:'Parking space 1',blocks:[]},
  {name:'Turk Smith',sig:'1 YO M DOODX',cage:'CA24105',ls:'ALS',reason:'Neuter',dr:'AJM',ward:'Surgery',inout:'IN',date:'10/31/2025',time:'9:53A',alerts:[{t:'warn',x:'Diabetic'}],service:'Surgery',owner:'Jennifer Smith',phone:'None',belongings:'',blocks:[{h:15,status:'scheduled',label:'15'}]},
];
let sbTx=true, sbBoard='IP Board';
function lsPill(ls){if(!ls)return '';const m={ALS:'ls-als',BLS:'ls-bls',DNR:'ls-dnr'}[ls]||'ls-als';return `<span class="ls-pill ${m}">${IC.heart}${ls}</span>`;}
function toggleSbTx(){sbTx=!sbTx;renderDash();}
function setSbBoard(b){sbBoard=b;renderDash();}
function openSbFilters(ev){ev.stopPropagation();
  const rows=[['Tx Status',IC.dotSm],['Doctor',IC.person],['Ward',IC.home],['Service',IC.gear],['Workflow',IC.flow],['Location',IC.cage]];
  _openPop(ev.currentTarget,`<div class="sb-filter-pop" style="width:236px;padding:6px 10px">${rows.map(([l,ic])=>`<div class="fp-row"><span class="fp-lab">${ic}${l}</span><span class="fp-add" onclick="toast('Add filter: ${l}')">+ Add</span></div>`).join('')}<button class="fp-clear" onclick="_closePop();toast('Filters cleared')">Clear Filters</button></div>`);
}
function renderDash(){
  const hours=[];for(let h=6;h<=20;h++)hours.push(h);
  const hlabel=h=>{const ap=h<12?'A':'P',hh=h%12||12;return hh+ap;};
  const NOWH=Math.min(20,Math.max(6,new Date().getHours())), LEFTW=802, HW=46;
  const LIVE=(sbBoard==='IP Board'||sbBoard==='OP Board'||sbBoard==='My Board')&&typeof tsBoardList==='function', IPL=LIVE?tsBoardList(sbBoard):null, OPB=sbBoard==='OP Board';
  const list=IPL||[];
  const empty=!list.length;
  const boards=['My Board','OP Board','IP Board','Boarding','OTW'];
  const toolbar=`<div class="sb-toolbar">
    <div class="sb-title"><div class="sb-back">${IC.back}</div><h2>Status Board</h2></div>
    <div class="sb-txview">TX VIEW <div class="sb-switch ${sbTx?'on':''}" onclick="toggleSbTx()"></div></div>
    <div class="sb-tabs">${boards.map(t=>`<div class="sb-tab ${t===sbBoard?'active':''}" onclick="setSbBoard('${t}')">${t}</div>`).join('')}</div>
    <div class="sb-tool-r">
      <div class="sb-search">${IC.search}<input placeholder="Name or problem…"></div>
      <button class="sb-filters" onclick="openSbFilters(event)">${IC.filter} Filters</button>
    </div></div>`;
  // header row
  let head=`<div class="sb-row sb-head"><div class="sb-left">
    <div class="sbc c-pt">Patients ${IC.caretUp}</div>
    <div class="sbc c-dr">DR</div><div class="sbc c-ward">Ward</div><div class="sbc c-io">In / Out</div>
    <div class="sbc c-timer">Tech</div><div class="sbc c-alerts">Alerts</div></div>`;
  head+= sbTx
    ? `<div class="sb-hours">${hours.map(h=>`<div class="sb-hcell${h===NOWH?' now':''}">${hlabel(h)}</div>`).join('')}</div>`
    : `<div class="sb-cage"><div class="cage-head" style="width:650px">Cage Card Info</div></div>`;
  head+=`</div>`;
  const section=`<div class="sb-section"><span class="st">${sbBoard==='My Board'?'My patients':OPB?'Outpatients':'Inpatients'}</span><span class="sc">(${list.length})</span></div>`;
  let rows='';
  list.forEach((p,i)=>{
    const left=`<div class="sb-left">
      <div class="sbc c-pt"><div class="pt-top">${p.pinned?IC.pin:''}${IC.dots}<span class="pt-nm">${p.name}</span></div>
        <div class="pt-sig2">${p.sig}</div>
        <div class="pt-cage-line">${p.cage?`<span>(${p.cage})</span>`:''}${lsPill(p.ls)}${IC.vit}</div>
        <div class="pt-reason">${p.reason}</div></div>
      <div class="sbc c-dr"><span class="dr-box">${p.dr}</span></div>
      <div class="sbc c-ward"><select class="ward-sel" onchange="toast('${p.name.split(' ')[0]} → '+this.value)">${WARDS.map(w=>`<option ${w===p.ward?'selected':''}>${w}</option>`).join('')}</select></div>
      <div class="sbc c-io"><div style="display:flex;align-items:center;gap:8px"><span class="io-badge" style="float:none;margin:0">${p.inout}</span><div><div class="io-date">${p.date}</div><div class="io-time">${p.time}</div></div></div></div>
      <div class="sbc c-timer">${p.techHTML||''}</div>
      <div class="sbc c-alerts aa-cell" onclick="event.stopPropagation();${IPL?'openPatient':'openAlertAssist'}(${i})" title="Alert Assist">${p.alerts.length?p.alerts.map(a=>`<div class="al-row ${a.t}">${IC.tri}${a.x}</div>`).join(''):'<span class="al-empty">— Add alert</span>'}<div class="aa-cell-hint">${IC.spark}Alert Assist</div></div>
    </div>`;
    const right = sbTx
      ? `<div class="sb-hours">${hours.map(h=>{const b=p.blocks.find(x=>x.h===h);return `<div class="sb-hcell">${b?`<div class="sb-blk ${b.status}">${b.label}</div>`:''}</div>`;}).join('')}</div>`
      : `<div class="sb-cage">
          <div class="cage-col c1"><div class="cage-line">${IC.cage}<span class="cp">${p.cage||'—'}</span>${IC.copy}</div><div class="cage-line">${IC.gear}${p.service}</div><div class="cage-line">${lsPill(p.ls)}</div></div>
          <div class="cage-col c2"><div class="cage-line">${IC.person}${p.owner}</div><div class="cage-line">${IC.phone}${p.phone}</div><div class="cage-line">${IC.home}<select class="cage-date"><option>Select Date</option></select></div></div>
          <div class="cage-col c3"><div class="cage-notes"><div class="lbl">Belongings / Notes</div>${p.belongings||'&nbsp;'}</div></div>
        </div>`;
    rows+=`<div class="sb-row" onclick="openPatient(${i})">${left}${right}</div>`;
  });
  if(empty) rows=sbBoard==='My Board'?`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No patients assigned to you yet. In Flow, open a patient and choose a <b>Technician</b>, or use the <b>+</b> in the Tech column on the IP or OP Board.</div>`:OPB?`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No outpatients in Treatment. Move a patient to Treatment in Flow and their sheet appears here.</div>`:IPL?`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No admitted patients yet. Admit a patient in Flow, or <a href="#" onclick="event.preventDefault();tsNewSheet()" style="color:var(--accent-ink);font-weight:600">start a new sheet</a>.</div>`:`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No patients on the ${sbBoard}.</div>`;
  const nowline = (sbTx&&!empty)?`<div class="sb-nowline" style="left:${LEFTW+(NOWH-6)*HW+HW/2}px"></div>`:'';
  const legend = sbTx?`<div class="sb-legend"><div class="li"><span class="dot" style="background:var(--gray)"></span>Completed</div><div class="li"><span class="dot" style="background:var(--green)"></span>Scheduled</div><div class="li"><span class="dot" style="background:var(--amber)"></span>Due</div><div class="li"><span class="dot" style="background:var(--coral)"></span>Overdue</div></div>`:'';
  tsMorphHTML($('#ctab-dash'),`<div class="sb">${toolbar}${(window.tsLoadStrip&&tsLoadStrip())||''}<div class="sb-scroll"><div class="sb-inner">${head}${section}${rows}${nowline}</div></div>${legend}</div>`);
}
function openPatient(i){ if(typeof tsOpenFromBoard==='function'&&tsOpenFromBoard(i)) return; selectCTab('sheet');}

/* ═══ ALERT ASSIST · L.U.N.A. (alert explainer + selector) ═══ */
const ALERT_CATS=[
  ['Behavior / Handling',['Anxious','Fearful','Cage Aggressive','Bite Risk','Needs Muzzle','Caution','Cuddle Bug']],
  ['Medical Risk',['Bleeding Risk','Diabetic','Seizure Watch','Respiratory Watch','Cardiac Risk']],
  ['Workflow',['Admit for Procedure','Needs Estimate','Waiting on Consent','Owner Update Due']],
  ['Access / Devices',['Arterial Line','IVC','Urinary Catheter','Feeding Tube']],
  ['Special Needs',['Blind','Deaf','DNR','Mobility Assistance']],
];
const ALERT_LIB={
  'Anxious':{med:0,def:'Patient shows stress or fear. Handle calmly and minimize stressors.',steps:['Approach slowly and quietly','Use low-stress handling','Offer treats or pheromones if allowed','Note specific triggers'],kw:['anxious','stress','fear','nervous']},
  'Fearful':{med:0,def:'Fear-based behavior. Minimize handling and environmental stress.',steps:['Low-stress handling','Keep environment quiet','Move slowly and predictably'],kw:['fear','scared','timid']},
  'Cage Aggressive':{med:0,def:'Patient may react aggressively in or near the cage or kennel.',steps:['Use caution opening the cage','Two-person handling if needed','Document a handling plan','Check for sedation orders'],kw:['aggressive','cage','bite','handling']},
  'Bite Risk':{med:0,def:'Patient may bite. Use appropriate restraint and PPE for all handling.',steps:['Muzzle if indicated','Two-person restraint','Document handling plan','Alert all staff'],kw:['bite','bit','aggressive','muzzle','snap']},
  'Needs Muzzle':{med:0,def:'A muzzle is required for handling or procedures.',steps:['Apply an appropriately fitted muzzle','Confirm breathing is unobstructed','Remove as soon as safe'],kw:['muzzle','bite']},
  'Caution':{med:0,def:'General handling caution — review the patient notes before handling.',steps:['Review handling notes','Proceed carefully','Confirm plan with the team'],kw:['caution','careful','warning']},
  'Cuddle Bug':{med:0,def:'Friendly, affectionate patient — a positive handling note for the team.',steps:['Enjoy — gentle positive handling'],kw:['friendly','cuddle','sweet']},
  'Bleeding Risk':{med:1,def:'Increased risk of bleeding or a clotting concern — anticoagulant exposure, thrombocytopenia, surgical risk, or active bleeding.',steps:['Confirm the doctor is aware','Avoid jugular draw unless approved','Use caution with procedures','Confirm clotting / platelet status if ordered'],kw:['bleed','blood','clot','platelet','anticoagulant','coag']},
  'Diabetic':{med:1,def:'Diabetic patient — monitor glucose and coordinate feeding with insulin timing.',steps:['Confirm insulin orders and timing','Monitor blood glucose per orders','Coordinate feeding with insulin','Watch for hypo/hyperglycemia'],kw:['diabetic','diabetes','glucose','insulin','bg']},
  'Seizure Watch':{med:1,def:'Monitor closely for seizure activity.',steps:['Pad the environment if needed','Record seizure time and duration','Confirm rescue medications available','Notify the doctor of any events'],kw:['seizure','neuro','convuls']},
  'Respiratory Watch':{med:1,def:'Monitor respiratory status closely.',steps:['Monitor rate and effort','Have oxygen ready','Minimize stress','Notify the doctor of changes'],kw:['respiratory','breathing','oxygen','dyspnea','resp']},
  'Cardiac Risk':{med:1,def:'Cardiac concern — monitor rhythm and handle gently.',steps:['Minimize stress','Monitor HR and rhythm','Confirm cardiac medications','Notify the doctor of changes'],kw:['cardiac','heart','murmur','arrhythmia']},
  'Admit for Procedure':{med:0,def:'Patient is being admitted for a scheduled or same-day procedure and needs procedural workflow tracking.',examples:['Dental','Surgery','Sedated procedure','Imaging procedure'],steps:['Confirm estimate approved','Confirm consent signed','Assign ward / location','Confirm doctor assigned','Select procedure type'],kw:['procedure','admit','surgery','dental','sedate','sedated','imaging']},
  'Needs Estimate':{med:0,def:'An estimate must be created and approved before proceeding.',steps:['Build the estimate','Send to the client','Obtain approval'],kw:['estimate','cost','quote','money','price']},
  'Waiting on Consent':{med:0,def:'Awaiting client consent or authorization.',steps:['Send consent form','Confirm signature','Document authorization'],kw:['consent','authorization','sign','waiver']},
  'Owner Update Due':{med:0,def:'A client update is due.',steps:['Call or message the owner','Log the communication'],kw:['owner','update','call','client']},
  'Arterial Line':{med:1,def:'Arterial catheter in place for blood pressure monitoring or sampling.',steps:['Label the line clearly','Do not use for infusion','Monitor the site','Confirm flush protocol'],kw:['arterial','line','bp','pressure','a-line']},
  'IVC':{med:0,def:'IV catheter in place.',steps:['Check patency and site each shift','Confirm fluid orders','Monitor for swelling'],kw:['iv','ivc','catheter','fluids']},
  'Urinary Catheter':{med:0,def:'Urinary catheter in place.',steps:['Maintain a closed system','Monitor urine output','Confirm care orders'],kw:['urinary','catheter','foley','output','urine']},
  'Feeding Tube':{med:0,def:'Feeding tube in place.',steps:['Confirm the feeding plan','Flush before and after feeding','Monitor the site'],kw:['feeding','tube','nutrition','e-tube']},
  'Blind':{med:0,def:'Patient is visually impaired.',steps:['Approach with your voice first','Keep the environment consistent','Guide gently'],kw:['blind','vision','sight']},
  'Deaf':{med:0,def:'Patient is hearing impaired.',steps:['Approach where the patient can see you','Use gentle visual and touch cues'],kw:['deaf','hearing','ear']},
  'DNR':{med:1,def:'Do Not Resuscitate — no CPR per client authorization.',steps:['Confirm code status is documented','Notify the whole team','Respect the documented client wishes'],kw:['dnr','resuscitate','code','cpr']},
  'Mobility Assistance':{med:0,def:'Patient needs help moving or ambulating.',steps:['Use a sling or support','Two-person lift for large patients','Prevent falls'],kw:['mobility','ambulate','walk','sling','paralys']},
};
let aaPat=0,aaSel='',aaListQ='',aaQuery='',aaAnswer='',_aaModal=null;
const IC_INFO2='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>';
function openAlertAssist(i){aaPat=i;const p=SB_PATIENTS[i];aaSel=(p.alerts[0]&&p.alerts[0].x&&ALERT_LIB[p.alerts[0].x]?p.alerts[0].x:'Admit for Procedure');aaListQ='';aaQuery='';aaAnswer='';_aaModal=openModal(aaHTML(),'liaison-modal aa-modal');}
function aaRefresh(){if(_aaModal)_aaModal.innerHTML=aaHTML();}
function aaSelect(n){aaSel=n;aaAnswer='';aaRefresh();}
function aaToggle(n){const p=SB_PATIENTS[aaPat];const idx=p.alerts.findIndex(a=>a.x===n);const med=(ALERT_LIB[n]||{}).med;if(idx>=0)p.alerts.splice(idx,1);else p.alerts.push({t:med?'crit':'warn',x:n});aaSel=n;renderDash();aaRefresh();}
function aaFilter(q){aaListQ=q;const el=document.getElementById('aaList');if(el)el.innerHTML=aaListHTML();}
function aaAsk(q){aaQuery=q;q=(q||'').toLowerCase().trim();if(!q){aaAnswer='';aaRefresh();return;}
  if(/\bals\b/.test(q)){aaAnswer='ALS (green heart) is a code-status / life-support level meaning full advanced resuscitation. It is not a patient alert — set it on the patient record.';aaRefresh();return;}
  if(/\bbls\b/.test(q)){aaAnswer='BLS (amber heart) is basic life support — a code-status level, not an alert.';aaRefresh();return;}
  if(/which|active|current/.test(q)){const p=SB_PATIENTS[aaPat];aaAnswer='Active alerts for '+p.name.split(' ')[0]+': '+(p.alerts.map(a=>a.x).join(', ')||'none');aaRefresh();return;}
  let best=null,score=0;
  for(const[name,m]of Object.entries(ALERT_LIB)){let s=0;if(name.toLowerCase().includes(q))s+=3;(m.kw||[]).forEach(k=>{if(q.includes(k))s+=2;});q.split(/\s+/).forEach(w=>{if(w.length>3&&name.toLowerCase().includes(w))s+=1;});if(s>score){score=s;best=name;}}
  if(score<2&&/bite|bit\b|may bite|snap/.test(q)){best='Bite Risk';score=2;}
  if(best){aaSel=best;aaAnswer='This alert fits — '+best+'. Details below.';}
  else aaAnswer='Try an alert name (e.g. "Bleeding Risk") or describe the situation (e.g. "dog that may bite").';
  aaRefresh();
}
function aaSuggestHTML(){const p=SB_PATIENTS[aaPat];const out=[];
  p.alerts.forEach(a=>{if(ALERT_LIB[a.x]||true)out.push([a.x,'Already active']);});
  const proc=/neuter|spay|surgery|dental|procedure|mass|hematoma|removal|extract/i.test(p.reason)||p.service==='Surgery';
  if(proc&&!p.alerts.some(a=>a.x==='Admit for Procedure'))out.push(['Admit for Procedure','If admitting for a procedure']);
  if(!p.alerts.some(a=>a.x==='Cage Aggressive'))out.push(['Cage Aggressive','Only if handling concern documented']);
  return out.slice(0,4).map(([n,r])=>`<button class="aa-sg${n===aaSel?' sel':''}" onclick="aaSelect('${n}')"><span class="aa-sg-n">${n}</span><span class="aa-sg-r">${r}</span></button>`).join('');
}
function aaListHTML(){const p=SB_PATIENTS[aaPat];const q=(aaListQ||'').toLowerCase();let html='';
  ALERT_CATS.forEach(([cat,names])=>{const fn=names.filter(n=>!q||n.toLowerCase().includes(q)||((ALERT_LIB[n]||{}).kw||[]).some(k=>k.includes(q)));if(!fn.length)return;
    html+=`<div class="aa-cat">${cat}</div>`;
    fn.forEach(n=>{const active=p.alerts.some(a=>a.x===n);html+=`<button class="aa-item${n===aaSel?' sel':''}" onclick="aaSelect('${n}')"><span>${n}</span>${active?`<span class="aa-active" onclick="event.stopPropagation();aaToggle('${n}')">Active</span>`:`<span class="aa-add" onclick="event.stopPropagation();aaToggle('${n}')">+ Add</span>`}</button>`;});
  });
  return html||`<div class="lp-empty">No alerts found.</div>`;
}
function aaRightHTML(){const p=SB_PATIENTS[aaPat];const m=ALERT_LIB[aaSel]||{def:'Select an alert to see what it means and how to use it.',steps:[]};
  const on=p.alerts.some(a=>a.x===aaSel);
  const guard=m.med?`<div class="aa-guard">${IC_INFO2}I can explain what this alert is used for, but the doctor should confirm whether it applies clinically.</div>`:'';
  return `<div class="aa-r-head">${IC.spark}L.U.N.A.</div>
    <div class="aa-ask"><input id="aaAskI" placeholder="Ask L.U.N.A. about alerts…" value="${(aaQuery||'').replace(/\"/g,'&quot;')}" onkeydown="if(event.key==='Enter')aaAsk(this.value)"><button class="aa-ask-btn" onclick="aaAsk(document.getElementById('aaAskI').value)">Ask</button></div>
    ${aaAnswer?`<div class="aa-answer">${aaAnswer}</div>`:''}
    <div class="aa-card">
      <div class="aa-card-t">${aaSel}</div>
      <div class="aa-card-def">${m.def}</div>
      ${m.examples?`<div class="aa-card-lbl">Common examples</div><div class="aa-tags">${m.examples.map(e=>`<span class="aa-tag">${e}</span>`).join('')}</div>`:''}
      ${m.steps&&m.steps.length?`<div class="aa-card-lbl">Recommended next steps</div><ul class="aa-steps">${m.steps.map(s=>`<li>${s}</li>`).join('')}</ul>`:''}
      ${guard}
      <button class="glass-btn aa-apply" onclick="aaToggle('${aaSel}')">${on?'Remove this alert':'Add this alert'}</button>
    </div>`;
}
function aaHTML(){const p=SB_PATIENTS[aaPat];
  return `<div class="aa"><div class="aa-left">
    <div class="aa-ctx"><b>${p.name}</b> · ${p.reason}</div>
    <div class="lp-search aa-search">${IC.search}<input id="aaSearch" placeholder="Search alert…" autocomplete="off" value="${(aaListQ||'').replace(/\"/g,'&quot;')}" oninput="aaFilter(this.value)"></div>
    <div class="aa-sub">Suggested</div><div class="aa-sugg">${aaSuggestHTML()}</div>
    <div class="aa-sub">All alerts</div><div class="aa-list" id="aaList">${aaListHTML()}</div>
  </div><div class="aa-right">${aaRightHTML()}</div></div>`;
}

/* ═══ TREATMENT SHEET ═══ */
function patientCmdHTML(){
  const chips=`
    <span class="pill soft">${deptName(VISIT.dept)}</span>
    <span class="pill soft">${VISIT.doctorFrom.split(',')[0]} → ${VISIT.doctorTo.split(',')[0]}</span>
    <span class="pill soft">${VISIT.day}</span>
    <span class="pill soft">${VISIT.location}</span>
    ${tsCodePill()}`;
  return `<section class="clinical-patient-header">
    <div class="cmd-r1">
      <button class="c-back" onclick="selectCTab('dash')" title="Back to patients"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      ${ptBadge(VISIT.patient,VISIT.species,'width:40px;height:40px;font-size:14px')}
      <div style="min-width:0">
        <div class="cmd-name">${VISIT.patient} <span class="pid">${VISIT.vcode||('V-'+VISIT.id)}</span></div>
        <div class="cmd-sig">${[VISIT.species,VISIT.breed,VISIT.sex,VISIT.age,VISIT.weight+' kg'].map(x=>`<span>${x}</span>`).join('<span class="d"></span>')}</div>
      </div>
      <div class="cmd-vitals">
        <div class="vstat"><div class="vv">${VISIT.temp}°</div><div class="vl">Temp</div></div>
        <div class="vstat"><div class="vv">${VISIT.hr}</div><div class="vl">HR</div></div>
        <div class="vstat"><div class="vv">${VISIT.rr}</div><div class="vl">RR</div></div>
        <div class="vstat"><div class="vv">${VISIT.mm}</div><div class="vl">MM</div></div>
      </div>
    </div>
    <div class="cmd-chips">${chips}</div>
  </section>`;
}
function sidebarBriefHTML(){
  return `<aside class="clinical-sidebar cbrief" id="clinSidebar">
    ${estimateCard()}

    <div class="panel"><h4>Vitals</h4>
      <div class="vit-grid">
        <div class="vit"><div class="k">Weight</div><div class="v">${VISIT.weight} kg</div></div>
        <div class="vit"><div class="k">Temp</div><div class="v">${VISIT.temp}°F</div></div>
        <div class="vit"><div class="k">Heart Rate</div><div class="v">${VISIT.hr} bpm</div></div>
        <div class="vit"><div class="k">Resp Rate</div><div class="v">${VISIT.rr} rpm</div></div>
        <div class="vit"><div class="k">MM</div><div class="v">${VISIT.mm}</div></div>
        <div class="vit"><div class="k">CRT</div><div class="v">${VISIT.crt} sec</div></div>
        <div class="vit"><div class="k">Mentation</div><div class="v">${VISIT.mentation}</div></div>
        <div class="vit"><div class="k">Pain Score</div><div class="v">${VISIT.pain} / 4</div></div>
      </div>
      ${weightTrendChart()}
      <div class="calc-row">
        <div class="calc-chip"><div class="k">BSA</div><div class="v">${VISIT.bsa} m²</div></div>
        <div class="calc-chip"><div class="k">RER</div><div class="v">${VISIT.rer} kcal/day</div></div>
      </div>
    </div>

    <div class="panel"><h4>Visit</h4><div class="kvlist">
      ${kvr('Doctor','Dr. '+VISIT.doctorTo.split(',')[0])}
      <div class="kvrow"><span class="kk">Technician</span><span class="vv ts-tech-slot">${window.tsTechCell?tsTechCell():''}</span></div>
      <div class="kvrow"><span class="kk">Status</span><span class="vv"><span class="pill st-hospitalized"><span class="d"></span>${VISIT.hospStatus}</span></span></div>
      <div class="kvrow"><span class="kk">Location</span><span class="vv"><span class="pill soft">${VISIT.location}</span></span></div>
      ${kvr('Department',deptName(VISIT.department))}
      <div class="kvrow"><span class="kk">Discharge Date</span><span class="vv">${ieVal('dcDateVal',VISIT.dischargeDate,'openDatePicker')}</span></div>
      <div class="kvrow"><span class="kk">Discharge Time</span><span class="vv">${ieVal('dcTimeVal',VISIT.dischargeTime,'openTimePicker')}</span></div>
      <div class="kvrow"><span class="kk">Discharging Liaison</span><span class="vv">${ieVal('liaisonVal',VISIT.liaison,'openLiaison')}</span></div>
      ${kvr('Client Notes',VISIT.updatePref)}
    </div></div>

    <div class="panel"><h4>Patient</h4><div class="kvlist">
      <div class="kvrow"><span class="kk">Checked in</span><span class="vv" style="display:flex;flex-direction:column;align-items:flex-start;gap:3px"><span class="ci-time">${VISIT.checkin}</span><span class="ci-pill">67 hrs hospitalized</span></span></div>
      ${kvr('Species',VISIT.species)}${kvr('Breed',VISIT.breed)}${kvr('Age',VISIT.age)}${kvr('Sex',VISIT.sex)}${kvr('Weight',VISIT.weight+' kg')}
      <div class="kvrow"><span class="kk">Code Status</span><span class="vv">${tsCodePill(1)}</span></div>
      <div class="kvrow"><span class="kk">E-Collar</span><span class="vv"><span class="pill st-waiting">${VISIT.ecollar}</span></span></div>
    </div></div>

    <div class="panel"><h4>Client / Communication</h4><div class="kvlist">
      ${kvr('Client',VISIT.client)}${kvr('Preferred Contact',VISIT.commPref)}${kvr('Update Preference',VISIT.updatePref)}${kvr('Last Update',VISIT.lastUpdate)}${kvr('Next Update Due',VISIT.nextUpdate)}
      <div class="kvrow" style="flex-direction:column;align-items:flex-start;gap:3px"><span class="kk">Notes</span><span class="vv" style="font-weight:500;color:var(--ink-700)">${VISIT.commNote}</span></div>
    </div></div>

    <div class="panel"><h4>Problem List</h4><div class="pc"><ol>${VISIT.problems.map(p=>`<li>${p}</li>`).join('')}</ol></div></div>
    <div class="panel"><h4>Current Plan</h4><div class="pc"><ul>${VISIT.plan.map(p=>`<li>${p}</li>`).join('')}</ul></div></div>
    <div class="panel"><h4>Pending</h4><div class="pc"><ul>${VISIT.pending.map(p=>`<li>${p}</li>`).join('')}</ul></div></div>
  </aside>`;
}
function renderSheet(){
  const ov=document.getElementById('ctab-vitals');if(ov)ov.innerHTML='';
  const canAdd=currentRole==='doctor'||currentRole==='admin';
  const grid=`<main class="treatment-main">
    <div class="treatment-toolbar">
      <button class="btn ghost brief-toggle" onclick="openBrief()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1.5"/><line x1="14" y1="7" x2="21" y2="7"/><line x1="14" y1="12" x2="21" y2="12"/><line x1="14" y1="17" x2="21" y2="17"/></svg>Patient info</button>
      <div class="order-search-wrapper"><div class="qadd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="tsSearch" placeholder="Add order by name or ID…" autocomplete="off" onfocus="openTsDrop()" oninput="tsRender(this.value)" onkeydown="tsKey(event)"></div><div class="order-search-dropdown" id="tsDrop" style="display:none"></div></div>
      <div class="day-nav"><button>‹</button><button class="today">Today · Day 1 of 2</button><button>›</button></div>
      <div class="spacer" style="flex:1"></div>
      <button class="btn ghost" style="flex:0 0 auto;width:auto;height:38px;padding:0 14px" onclick="selectCTab('timeline')">Audit</button>
      ${canAdd?`<button class="btn primary" style="flex:0 0 auto;width:auto;height:38px;padding:0 16px" onclick="openOrderBuilder()">+ Add Order</button>`:''}
    </div>
    <div class="treatment-grid-shell" id="sheetScroll"><div class="sheet-inner" id="sheetInner"></div></div>
    <div class="treatment-legend" id="legend"></div>
  </main>`;
  $('#ctab-sheet').innerHTML=patientCmdHTML()+`<section class="clinical-workspace">${sidebarBriefHTML()}${grid}</section>`;
  buildGrid();
}
/* ═══ VITALS BOARD (Phase 1) ═══ */
const VT=[
 {name:'Weight',unit:'kg',kind:'num',sec:'basic',active:true,hist:[['6A','49.2'],['8A','49.6'],['10A','50.0']]},
 {name:'Temperature',unit:'°F',kind:'num',sec:'basic',active:true,hist:[['6A','102.3'],['8A','102.0'],['10A','101.8']]},
 {name:'Heart Rate',unit:'bpm',kind:'num',sec:'basic',active:true,hist:[['6A','118'],['8A','125'],['10A','122']]},
 {name:'Respiratory Rate',unit:'rpm',kind:'num',sec:'basic',active:true,hist:[['6A','28'],['8A','33'],['10A','29']]},
 {name:'Mucous Membrane',unit:'',kind:'sel',opts:['Pink','Pale Pink','Pale','White','Injected','Cyanotic'],sec:'basic',active:true,hist:[['6A','Pink'],['8A','Pink'],['10A','Pink']]},
 {name:'CRT',unit:'',kind:'sel',opts:['<2 sec','2 sec','>2 sec'],sec:'basic',active:true,hist:[['6A','<2'],['8A','<2'],['10A','<2']]},
 {name:'Mentation',unit:'',kind:'sel',opts:['BAR','QAR','Dull','Obtunded','Stupor'],sec:'basic',active:true,hist:[['6A','BAR'],['8A','BAR'],['10A','BAR']]},
 {name:'Pain Score',unit:'/4',kind:'sel',opts:['0','1','2','3','4'],sec:'basic',active:true,hist:[['6A','1'],['8A','1'],['10A','3']]},
 {name:'Food',unit:'',kind:'sel',opts:['Ate','Some','Off','NPO'],sec:'basic',active:true,hist:[['8A','Off'],['10A','Some']]},
 {name:'Water',unit:'',kind:'sel',opts:['Drank','Some','None'],sec:'basic',active:true,hist:[['8A','Drank'],['10A','Drank']]},
 {name:'Vomiting',unit:'',kind:'sel',opts:['No','Yes'],sec:'basic',active:true,hist:[['8A','No'],['10A','No']]},
 {name:'Urination',unit:'',kind:'sel',opts:['Nml','None','Abnormal'],sec:'basic',active:true,hist:[['8A','Nml'],['10A','Nml']]},
 {name:'Defecation',unit:'',kind:'sel',opts:['Nml','None','Diarrhea'],sec:'basic',active:false,hist:[['8A','None']]},
 {name:'IV Fluids',unit:'mL/hr',kind:'num',sec:'infusion',active:true,hist:[['6A','60'],['8A','60'],['10A','60']]},
 {name:'Volume Infused',unit:'mL',kind:'num',sec:'infusion',active:true,hist:[['6A','120'],['8A','240'],['10A','360']]},
 {name:'Blood Pressure',unit:'mmHg',kind:'num',sec:'advanced',active:false,hist:[]},
 {name:'SpO₂',unit:'%',kind:'num',sec:'advanced',active:false,hist:[]},
 {name:'ETCO₂',unit:'mmHg',kind:'num',sec:'advanced',active:false,hist:[]},
 {name:'Glucose',unit:'mg/dL',kind:'num',sec:'advanced',active:false,hist:[]},
 {name:'Lactate',unit:'mmol/L',kind:'num',sec:'advanced',active:false,hist:[]},
 {name:'Urine Output',unit:'mL/kg/h',kind:'num',sec:'advanced',active:false,hist:[]},
];
let vOnlyActive=false,vFilter='',vWeightUnit='kg',vAdvOpen=false;
function vColor(v){const n=v.name,last=v.hist.length?v.hist[v.hist.length-1][1]:'',num=parseFloat(last);
  if(n==='Pain Score')return num>=4?'coral':num>=3?'amber':'cyan';
  if(n==='Temperature')return (num<99||num>104)?'amber':'cyan';
  if(n==='Heart Rate')return (num<60||num>140)?'amber':'cyan';
  if(n==='Respiratory Rate')return (num<10||num>30)?'amber':'cyan';
  if(n==='Mucous Membrane')return last&&last!=='Pink'?'amber':'cyan';
  if(n==='Vomiting')return last==='Yes'?'amber':'cyan';
  if(n==='Food')return (last==='Off'||last==='NPO')?'amber':'cyan';
  return 'cyan';}
function vStripHTML(v){if(!v.hist.length)return '<span class="v-empty">No values yet</span>';const col=vColor(v);
  return `<div class="v-strip">`+v.hist.map((h,i)=>`<div class="v-pt"><span class="v-chip ${i===v.hist.length-1?col+' cur':''}">${h[1]}</span><span class="v-t">${h[0]}</span></div>`).join('<span class="v-dash"></span>')+`</div>`;}
function vInputHTML(v,idx){let field;
  if(v.kind==='num')field=`<input class="v-in" id="vin-${idx}" placeholder="Value">`+(v.name==='Weight'?`<button class="v-utoggle" onclick="vWtToggle(${idx})">${vWeightUnit}</button>`:`<span class="v-unit">${v.unit}</span>`);
  else field=`<input class="v-in" id="vin-${idx}" list="vl-${idx}" placeholder="Select"><datalist id="vl-${idx}">${v.opts.map(o=>`<option>${o}</option>`).join('')}</datalist>`+(v.unit?`<span class="v-unit">${v.unit}</span>`:'');
  return `<div class="v-input">${field}<input class="v-note" id="vnote-${idx}" placeholder="Enter vital note"><button class="v-rec" onclick="vRecord(${idx})">Record</button></div>`;}
function vRowsHTML(){const q=vFilter.toLowerCase().trim();const secs=[['basic','Basic Observations'],['infusion','Continuous Infusions'],['advanced','Advanced Monitoring']];let html='';
  secs.forEach(([key,label])=>{const rows=VT.map((v,i)=>[v,i]).filter(([v])=>v.sec===key&&(!vOnlyActive||v.active)&&(!q||v.name.toLowerCase().includes(q)));
    if(!rows.length)return;const clp=key==='advanced';
    html+=`<div class="v-sec-h${clp?' clp':''}"${clp?' onclick="vAdvOpen=!vAdvOpen;vRenderRows()"':''}><span>${label}</span>${clp?`<span class="v-chev ${vAdvOpen?'open':''}">${IC.caretUp}</span>`:''}</div>`;
    if(clp&&!vAdvOpen)return;
    rows.forEach(([v,i])=>{html+=`<div class="v-row"><div class="v-name">${v.name}</div><div class="v-trend">${vStripHTML(v)}</div>${vInputHTML(v,i)}</div>`;});});
  return html||'<div class="v-empty" style="padding:30px">No vitals match.</div>';}
function vRenderRows(){const el=$('#vRows');if(el)el.innerHTML=vRowsHTML();}
function vWtToggle(idx){const inp=$('#vin-'+idx);vWeightUnit=vWeightUnit==='kg'?'lb':'kg';if(inp&&inp.value){const n=parseFloat(inp.value);if(!isNaN(n))inp.value=(vWeightUnit==='lb'?n*2.20462:n/2.20462).toFixed(2);}
  if(inp){const b=inp.parentNode.querySelector('.v-utoggle');if(b)b.textContent=vWeightUnit;}}
function vRecord(idx){const v=VT[idx];const inp=$('#vin-'+idx);if(!inp||!inp.value.trim()){toast('Enter a value first');return;}
  let val=inp.value.trim();
  if(v.name==='Weight'){let n=parseFloat(val);if(!isNaN(n)){if(vWeightUnit==='lb')n=n/2.20462;val=(Math.round(n*10)/10).toString();VISIT.weight=Math.round(n*10)/10;}}
  const L=hourLabel(Math.floor(nowMin()/60));v.hist.push([L.h+L.ap,val]);
  const map={'Temperature':'temp','Heart Rate':'hr','Respiratory Rate':'rr','Mucous Membrane':'mm','Mentation':'mentation','Pain Score':'pain','CRT':'crt'};
  if(map[v.name])VISIT[map[v.name]]=val;
  logEvent('vital',`${v.name} recorded: <b>${val}${v.unit&&!isNaN(parseFloat(val))?v.unit:''}</b>`,'K. Tech');
  toast(`${v.name} recorded`);renderVitals();}
function vCopyVitals(){const g=n=>{const v=VT.find(x=>x.name===n);return v&&v.hist.length?v.hist[v.hist.length-1][1]:'—';};
  const txt=`Vitals ${fmtTime(nowMin())}: T ${g('Temperature')}°F, HR ${g('Heart Rate')} bpm, RR ${g('Respiratory Rate')} rpm, MM ${g('Mucous Membrane')}, CRT ${g('CRT')} sec, ${g('Mentation')}, Pain ${g('Pain Score')}/4, Weight ${g('Weight')} kg.`;
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).catch(()=>{});toast('Vitals copied');}
function vHistoryModal(){const rows=[['6:00 AM','50 kg','102.1°F','118','28','Pink','<2','BAR','1/4','stable','K. Tech'],['8:00 AM','50 kg','102.3°F','125','33','Pink','<2','BAR','1/4','no vomiting','K. Tech'],['10:00 AM','50 kg','101.8°F','122','29','Pink','<2','BAR','3/4','pain increased','K. Tech']];const head=['Time','Wt','Temp','HR','RR','MM','CRT','Ment','Pain','Notes','By'];
  openModal(`<div class="vh"><h2>Vitals History</h2><div class="vh-sub">Recent values and trends for this visit</div><div class="vh-scroll"><table class="vh-table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`,'liaison-modal vh-modal');}
function vLunaModal(){openModal(`<div class="vh"><h2>${IC.spark} L.U.N.A. · Vitals</h2><div class="vh-sub">Workflow insight — not a diagnosis</div><div class="oc-luna-a" style="margin-top:12px">Temperature is improving from 102.3°F to 101.8°F. Pain increased from 1/4 to 3/4. Consider flagging for doctor review if pain remains elevated.<div class="oc-luna-meta"><span>Source: Hospital vitals workflow rules</span><span>Confidence: Prototype rule</span></div><div class="oc-luna-guard">L.U.N.A. summarizes trends and suggests review. The doctor must confirm all clinical decisions.</div></div></div>`,'liaison-modal vh-modal');}
function renderVitals(){const os=document.getElementById('ctab-sheet');if(os)os.innerHTML='';
  const board=`<main class="treatment-main vitals-main">
    <div class="v-header">
      <button class="btn ghost" style="width:auto;height:34px;padding:0 12px;flex:0 0 auto" onclick="selectCTab('sheet')">‹ Back</button>
      <div class="v-filter">${IC.search}<input placeholder="Filter vitals by name" value="${vFilter.replace(/"/g,'&quot;')}" oninput="vFilter=this.value;vRenderRows()"></div>
      <div class="v-title">VITALS</div><div class="spacer" style="flex:1"></div>
      <div class="v-toggle" onclick="vOnlyActive=!vOnlyActive;vRenderRows()">Only Show Active<span class="sb-switch ${vOnlyActive?'on':''}"></span></div>
    </div>
    <div class="v-luna"><div class="v-luna-l"><div class="oc-luna-h">${IC.spark}L.U.N.A. Vitals Insight</div><div class="v-luna-txt">Temp improving from 102.3°F to 101.8°F. Pain increased from 1/4 to 3/4. Consider doctor review if pain remains elevated.</div></div><button class="btn ghost" style="width:auto;height:34px;padding:0 12px;flex:0 0 auto" onclick="vLunaModal()">Ask L.U.N.A. about vitals</button></div>
    <div class="v-scroll"><div id="vRows">${vRowsHTML()}</div></div>
    <div class="v-footer"><button class="btn ghost" style="width:auto;height:34px;padding:0 12px" onclick="vHistoryModal()">Vitals History</button><button class="btn ghost" style="width:auto;height:34px;padding:0 12px" onclick="toast('Treatments copied')">Copy Txs</button><button class="btn ghost" style="width:auto;height:34px;padding:0 12px" onclick="vCopyVitals()">Copy Vitals</button></div>
  </main>`;
  $('#ctab-vitals').innerHTML=patientCmdHTML()+`<section class="clinical-workspace vitals-mode">${board}</section>`;
}
const MK_CHECK='<svg class="mk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const MK_REVIEW='<svg class="mk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>';
const MK_MISS='<svg class="mk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
function markContent(t,s){if(s==='completed')return t.value??MK_CHECK;if(s==='due')return '';if(s==='overdue')return '!';if(s==='skipped')return '–';if(s==='scheduled')return '·';return '';}
function buildGrid(){
  const inner=$('#sheetInner');if(!inner)return;let html='';const nh=Math.floor(nowMin()/60);
  html+=`<div class="grow ghead"><div class="rl"><span class="rl-name" style="color:var(--ink-400);font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:800">Order</span></div><div class="hcells">`;
  for(let h=0;h<24;h++){const L=hourLabel(h);html+=`<div class="hcell ${h===nh?'hour-now':''}">${L.h}<span class="ampm">${L.ap}</span></div>`;}
  html+=`</div></div>`;
  SECTIONS.forEach(sec=>{const so=ORDERS.filter(o=>o.section===sec.key);if(!so.length)return;
    html+=`<div class="grow"><div class="gsection"><svg class="sicon" viewBox="0 0 24 24" fill="none"><path d="${sec.icon}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="stitle">${sec.key}</span><span class="scount">${so.length}</span></div></div>`;
    so.forEach(o=>{html+=`<div class="grow"><div class="rl">`;
      if(o.type==='med'){const d=medDose(o);html+=`<div style="min-width:0"><div class="rl-name">${o.name}</div><div class="rl-meta">${d.mg} · ${o.freq}</div></div><span class="route-pill">${o.route}</span>`;}
      else if(o.type==='fluid'){html+=`<div style="min-width:0"><div class="rl-name">${o.name}</div><div class="rl-meta">${o.rate}</div></div><span class="route-pill">IV</span>`;}
      else{html+=`<div style="min-width:0"><div class="rl-name">${o.name}</div><div class="rl-meta">${o.freq}${o.unit?' · '+o.unit:''}</div></div>`;}
      html+=`</div><div class="hcells">`;
      if(o.cont){const nowH=nowMin()/60;for(let h=0;h<24;h++){let cls=h<o.start?'off':(h<=nowH?'on':'future');let lbl=h===o.start?o.rate.replace(' mL/hr',''):'';html+=`<div class="cell inf"><div class="inf-fill ${cls}" onclick="openInfusion('${o.id}',${h})">${lbl}</div></div>`;}}
      else{for(let h=0;h<24;h++){const _c=TASKS.filter(x=>x.orderId===o.id&&Math.floor(x.sched/60)===h);const t=_c.find(x=>x.status)||_c.find(x=>x.sched===h*60);if(!t){html+=`<div class="cell"></div>`;continue;}const s=deriveStatus(t);if(s==='completed'&&t.severity){html+=`<div class="cell"><div class="mark abn ${t.severity>=2?'sev':''}" onclick="openCompletion('${t.id}')">${t.value}</div></div>`;continue;}html+=`<div class="cell"><div class="mark ${s}" onclick="openCompletion('${t.id}')" title="${o.name} · ${fmtTime(t.sched)}">${markContent(t,s)}</div></div>`;}}
      html+=`</div></div>`;});
  });
  {const old=inner.querySelector('.nowline');if(old)old.remove();}
  tsMorphHTML(inner,html);
  const nl=document.createElement('div');nl.className='nowline';nl.style.left=`calc(240px + ${(nowMin()/60)*54}px)`;nl.innerHTML=`<div class="now-lbl">NOW ${fmtTime(nowMin())}</div>`;inner.appendChild(nl);
  renderLegend();
}
function renderLegend(){const items=[['completed','Completed','var(--status-completed)'],['scheduled','Scheduled','var(--status-scheduled)'],['due','Due','var(--status-due)'],['overdue','Overdue','var(--status-overdue)'],['skipped','Skipped','var(--status-skipped)']];
  tsSetHTML($('#legend'),items.map(([k,l,c])=>`<div class="li"><span class="sw" style="color:${c}"></span>${l}</div>`).join('')+`<div style="flex:1"></div><div class="li" style="color:var(--ink-400)">Tap any cell to complete or edit</div>`);}

/* ═══ COMPLETION DRAWER ═══ */
let activeTaskId=null;
function drow(k,v){return `<div class="drow"><span class="k">${k}</span><span class="v">${v}</span></div>`;}
function openCompletion(id){
  const t=TASKS.find(x=>x.id===id);if(!t)return;activeTaskId=id;const o=t.order,s=deriveStatus(t);
  const sLabel={completed:'Completed',scheduled:'Scheduled',due:'Due',overdue:'Overdue',skipped:'Skipped'}[s];
  $('#cd-title').textContent=o.name;
  $('#cd-sub').innerHTML=`${o.section}`+(o.type==='med'?` · ${medDose(o).mg} ${o.route}`:'');
  let body=`<div class="status-line ${s}"><span class="sw"></span>${sLabel} · scheduled ${fmtTime(t.sched)}</div>`;
  body+=drow('Task',o.name)+drow('Category',o.section)+drow('Scheduled',fmtTime(t.sched));
  if(o.type==='med'){const d=medDose(o);body+=drow('Dose',d.mg)+drow('Volume',d.volume)+drow('Route',o.route)+drow('Frequency',o.freq);}
  if(t.status==='completed')body+=drow('Completed',fmtTime(t.completedMin))+drow('Completed by',t.by);
  body+=`<div style="height:14px"></div>`;
  if(o.type==='obs'||o.type==='diag')body+=`<div class="field"><label>Value / Result</label><input id="cd-value" value="${t.value??''}" placeholder="${o.name==='Temperature'?'102.1':'—'}"></div>`;
  if(o.type==='med'){const d=medDose(o);body+=`<div class="field-2"><div class="field"><label>Dose given</label><input id="cd-dose" value="${d.mg}"></div><div class="field"><label>Volume</label><input id="cd-vol" value="${d.volume}"></div></div>`;}
  body+=`<div class="field"><label>Notes</label><textarea id="cd-notes" placeholder="Add a note…">${t.notes||''}</textarea></div>`;
  body+=`<div class="field"><label>Completed by</label><select id="cd-by">${STAFF.map(x=>`<option ${t.by===x?'selected':''}>${x}</option>`).join('')}</select></div>`;
  $('#cd-body').innerHTML=body;
  const canComplete=currentRole!=='csr'&&currentRole!=='liaison';
  $('#cd-foot').innerHTML=t.status==='completed'
    ?`<button class="btn ghost" onclick="undoTask()">Undo</button><button class="btn primary" onclick="saveTask()">Save changes</button>`
    :(canComplete?`<button class="btn primary" onclick="completeTask()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M20 6L9 17l-5-5"/></svg>Complete</button><button class="btn ghost" onclick="setTaskStatus('skipped','Skipped')">Skip</button><button class="btn ghost" onclick="setTaskStatus('delayed','Delayed')">Delay</button>`
    :`<div style="color:var(--ink-400);font-size:13px;padding:6px">Your role has view-only access to this task.</div>`);
  openDrawer('completionDrawer');
}
function completeTask(){const t=TASKS.find(x=>x.id===activeTaskId);t.status='completed';t.completedMin=nowMin();t.by=($('#cd-by')||{}).value||'DG';const v=$('#cd-value');if(v)t.value=v.value;const n=$('#cd-notes');if(n)t.notes=n.value;logEvent(t.order.type==='obs'?'vital':t.order.type,`<b>${t.order.name}</b> ${t.value?('— '+t.value):''} completed`,t.by);closeDrawers();buildGrid();toast(`${t.order.name} completed`);}
function saveTask(){const t=TASKS.find(x=>x.id===activeTaskId);const v=$('#cd-value');if(v)t.value=v.value;const n=$('#cd-notes');if(n)t.notes=n.value;t.by=($('#cd-by')||{}).value||t.by;closeDrawers();buildGrid();toast('Changes saved');}
function undoTask(){const t=TASKS.find(x=>x.id===activeTaskId);t.status=null;t.completedMin=null;closeDrawers();buildGrid();toast('Completion undone');}
function setTaskStatus(st,label){const t=TASKS.find(x=>x.id===activeTaskId);t.status=st;logEvent('doctor',`<b>${t.order.name}</b> ${label.toLowerCase()}`,'DG');closeDrawers();buildGrid();toast(`${t.order.name} ${label.toLowerCase()}`);}
function openInfusion(id,h){const o=ORDERS.find(x=>x.id===id);activeTaskId=null;$('#cd-title').textContent=o.name;$('#cd-sub').innerHTML=`Continuous Infusion · ${o.rate}`;
  $('#cd-body').innerHTML=`<div class="status-line completed"><span class="sw"></span>Running · started ${fmtTime(o.start*60)}</div>${drow('Fluid',o.name)}${drow('Rate',o.rate)}${drow('Additive',o.additive||'—')}${drow('Started',fmtTime(o.start*60))}${drow('Daily total',(60*24)+' mL')}${drow('Last checked',fmtTime(nowMin()-40))}<div style="height:14px"></div><div class="field"><label>Adjust rate (mL/hr)</label><input id="cd-rate" value="60"></div><div class="field"><label>Pump / catheter check note</label><textarea placeholder="Line patent, no swelling…"></textarea></div>`;
  $('#cd-foot').innerHTML=`<button class="btn ghost" onclick="closeDrawers()">Cancel</button><button class="btn primary" onclick="closeDrawers();toast('Infusion check logged')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px"><path d="M20 6L9 17l-5-5"/></svg>Log check</button>`;openDrawer('completionDrawer');}

/* ═══ ORDER BUILDER ═══ */
let obType='med';
function openOrderBuilder(){if(currentRole==='csr'||currentRole==='liaison'){toast('Your role cannot add orders');return;}ocReset();renderComposer();openDrawer('orderDrawer');}
function renderOrderBuilder(){
  const types=[['med','Medication','Dose, route & frequency'],['fluid','Fluid','CRI or maintenance'],['obs','Vital / Monitor','TPR, pain, obs'],['care','Nursing Care','Walks, feeds, checks'],['diag','Diagnostic','Labs & imaging']];
  let h=`<div class="type-grid">${types.map(([k,t,d])=>`<button class="${k===obType?'sel':''}" onclick="obType='${k}';renderOrderBuilder()"><div class="ti">${t}</div><div class="td">${d}</div></button>`).join('')}</div>`;
  h+=`<div class="field"><label>${obType==='med'?'Medication name':obType==='fluid'?'Fluid type':'Task / order name'}</label><input id="ob-name" placeholder="${obType==='med'?'e.g. Cerenia':obType==='fluid'?'e.g. LRS':'e.g. Pain score'}" oninput="obCalc()"></div>`;
  if(obType==='med'){h+=`<div class="field-2"><div class="field"><label>Dose</label><input id="ob-dose" type="number" value="1" oninput="obCalc()"></div><div class="field"><label>Unit</label><select id="ob-unit" onchange="obCalc()"><option>mg/kg</option><option>mcg/kg</option><option>units/kg</option></select></div></div>
    <div class="field-2"><div class="field"><label>Concentration (mg/mL)</label><input id="ob-conc" type="number" value="10" oninput="obCalc()"></div><div class="field"><label>Route</label><select id="ob-route"><option>IV</option><option>IM</option><option>SQ</option><option>PO</option><option>CRI</option></select></div></div>
    <div class="calc-box"><div class="cl">Calculated for ${VISIT.weight} kg</div><div class="cv" id="ob-calc-dose">—</div><div class="cs" id="ob-calc-vol">—</div></div>`;}
  if(obType==='fluid')h+=`<div class="field-2"><div class="field"><label>Rate (mL/hr)</label><input id="ob-rate" type="number" value="60"></div><div class="field"><label>Additive</label><input id="ob-add" placeholder="KCl 20 mEq/L"></div></div>`;
  if(obType!=='fluid')h+=`<div class="field"><label>Frequency</label><select id="ob-freq">${['Once','q1h','q2h','q4h','q6h','q8h','q12h','q24h','SID','BID','TID','QID','PRN','Continuous','Until discontinued','Custom'].map(f=>`<option ${f==='q8h'?'selected':''}>${f}</option>`).join('')}</select></div>`;
  h+=`<div class="field-2"><div class="field"><label>Start time</label><select id="ob-start"><option value="now">Now</option>${[...Array(24)].map((_,i)=>`<option value="${i}">${fmtTime(i*60)}</option>`).join('')}</select></div><div class="field"><label>Stop condition</label><input id="ob-stop" value="Until discontinued"></div></div>`;
  h+=`<div class="field"><label>Notes</label><textarea id="ob-notes" placeholder="Special instructions…"></textarea></div>`;
  h+=`<div class="drawer-sub-label">Quick templates</div><div class="tpl-grid">${TEMPLATES.map((t,i)=>`<button onclick="applyTemplate(${i})">${t.name}<small>${t.orders.length} orders</small></button>`).join('')}</div>`;
  $('#ob-body').innerHTML=h;obCalc();
}
function obCalc(){if(obType!=='med')return;const dose=parseFloat($('#ob-dose')?.value||0),conc=parseFloat($('#ob-conc')?.value||0);const total=dose*VISIT.weight,vol=conc?(total/conc):null;if($('#ob-calc-dose'))$('#ob-calc-dose').textContent=(total%1?total.toFixed(1):total)+' mg';if($('#ob-calc-vol'))$('#ob-calc-vol').textContent=vol!=null?`${vol.toFixed(2)} mL · ${$('#ob-unit').value} × ${VISIT.weight} kg`:'—';}
function submitOrder(){const name=$('#ob-name')?.value?.trim();if(!name){toast('Enter an order name');return;}const startSel=$('#ob-start').value;const start=startSel==='now'?Math.ceil(nowMin()/60):parseInt(startSel);const sectionMap={med:'Medications',fluid:'Continuous Infusions',obs:'Basic Observation',care:'Patient Care',diag:'Diagnostics'};const o={id:'o'+Date.now(),type:obType,section:sectionMap[obType],name,start,freq:$('#ob-freq')?.value||'Continuous',notes:$('#ob-notes')?.value||''};if(obType==='med'){o.dose=parseFloat($('#ob-dose').value);o.unit=$('#ob-unit').value;o.conc=parseFloat($('#ob-conc').value);o.route=$('#ob-route').value;}if(obType==='fluid'){o.rate=($('#ob-rate').value||'60')+' mL/hr';o.additive=$('#ob-add').value;o.cont=true;o.freq='Continuous';}ORDERS.push(o);buildTasks();logEvent('doctor',`Order added — <b>${name}</b> ${o.route||''} ${o.freq!=='Continuous'?o.freq:o.rate||''}`,'DG');closeDrawers();renderSheet();toast(`${name} added to treatment sheet`);}

/* ═══ ORDER COMPOSER · guided ordering + Med Intelligence + L.U.N.A. ═══ */
const OC_W=27.22,OC_PT='Daisy Brown',OC_SP='Dog';
const OC_MED={id:'cerenia-inj-10',name:'Cerenia injectable 10 mg/mL',genericName:'Maropitant',className:'Neurokinin (NK-1) receptor antagonist; antiemetic',conc:10,defaultDose:1,safeRange:[1,2],route:'SQ',freq:'q24h',price:127.40,problem:'Vomiting',
  monitoring:[{name:'Vomiting check',freq:'q4h',reason:'Tracks response to antiemetic therapy',sel:true},{name:'Appetite check',freq:'q6h',reason:'Monitors return of appetite after nausea control',sel:true},{name:'Nausea signs',freq:'q6h',reason:'Tracks drooling, lip licking, retching, or nausea behavior',sel:false}]};
const OC_SEARCH={'Medications':['Cerenia injectable 10 mg/mL','Cerenia 16 mg tablet','Cerenia 24 mg tablet','Cerenia 60 mg tablet','Cerenia 160 mg tablet'],'Suggested Monitoring':['Vomiting check','Appetite check','Nausea signs'],'Patient Care':['Offer food','Monitor hydration']};
const OC_PROBLEMS=['Vomiting','Inappetence','Nausea','Pain','Diabetic Ketosis','Azotemia','Other'];
const OC_LUNA=[
  ['Why was this dose flagged?','The entered dose is outside the hospital safety range of 1–2 mg/kg configured for this medication. This is a workflow rule, not a diagnosis.'],
  ['What monitoring should be paired with this order?','Because an antiemetic was selected, Flow suggests vomiting and appetite monitoring to track response to treatment.'],
  ['Explain this frequency.','q24h means once every 24 hours — the default frequency for this medication in the hospital workflow rules.'],
  ['What will this add to the estimate?','This order adds approximately $127.40. Projected remaining to the estimate high end would be $555.90.'],
  ['Show medication guidance source.','Guidance shown here comes from the internal Med Intelligence workflow rules — it is not an external medical authority.'],
  ['Why is doctor override required?','The entered dose is outside the configured safety range, so a doctor override with a documented reason is required before placing.'],
];
const OC_CHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const OC_WARN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
let OC={};
function ocReset(){OC={q:'',medId:null,dose:1,route:'SQ',freq:'q24h',start:'Now',end:'Checkout / Discharge',doctor:'ALB',quantity:'',problem:'Vomiting',override:false,overrideReason:'',mon:{},luna:''};}
/* toolbar quick-add: anchored dropdown (not the drawer) */
let tsRows=[],tsIdx=-1,_tsOutside=null;
function tsRender(q){q=(q||'').toLowerCase().trim();tsRows=[];let html='';
  const suggested=VISIT.problems.some(p=>/vomit|inappet|nausea/i.test(p));const groups=[];
  if(suggested&&!q)groups.push(['Suggested for this patient',['Cerenia injectable 10 mg/mL','Vomiting check q4h','Appetite check q6h','Offer food q6h']]);
  Object.entries(OC_SEARCH).forEach(([g,items])=>groups.push([g,items.filter(n=>!q||n.toLowerCase().includes(q))]));
  groups.forEach(([g,items])=>{if(!items.length)return;html+=`<div class="ts-cat">${g}</div>`;items.forEach(n=>{const i=tsRows.length;tsRows.push(n);html+=`<button class="ts-item" data-i="${i}" onmouseenter="tsHi(${i})" onmousedown="event.preventDefault();tsPick('${n}')">${/Suggested for/.test(g)?IC.spark:''}<span>${n}</span></button>`;});});
  if(!tsRows.length)html='<div class="ts-empty">No results</div>';
  tsIdx=tsRows.length?0:-1;const d=$('#tsDrop');if(d){d.innerHTML=html;d.style.display='block';tsMark();}
}
function tsMark(){$$('#tsDrop .ts-item').forEach(el=>el.classList.toggle('hi',+el.dataset.i===tsIdx));}
function tsHi(i){tsIdx=i;tsMark();}
function openTsDrop(){tsRender($('#tsSearch')?$('#tsSearch').value:'');setTimeout(()=>{_tsOutside=e=>{const wrap=document.querySelector('.order-search-wrapper');if(wrap&&!wrap.contains(e.target))closeTsDrop();};document.addEventListener('mousedown',_tsOutside);},0);}
function closeTsDrop(){const d=$('#tsDrop');if(d)d.style.display='none';if(_tsOutside){document.removeEventListener('mousedown',_tsOutside);_tsOutside=null;}}
function tsKey(e){if(e.key==='ArrowDown'){e.preventDefault();tsIdx=Math.min(tsRows.length-1,tsIdx+1);tsMark();}
  else if(e.key==='ArrowUp'){e.preventDefault();tsIdx=Math.max(0,tsIdx-1);tsMark();}
  else if(e.key==='Enter'){e.preventDefault();if(tsIdx>=0&&tsRows[tsIdx])tsPick(tsRows[tsIdx]);}
  else if(e.key==='Escape'){closeTsDrop();const si=$('#tsSearch');if(si)si.blur();}}
function tsPick(name){closeTsDrop();const si=$('#tsSearch');if(si)si.value='';ocPickFromSearch(name);}
function ocPickFromSearch(name){ocReset();
  if(/Cerenia/i.test(name)){if(!/injectable/i.test(name))toast('Prototype: guided configure shown for the injectable form');openDrawer('orderDrawer');ocSelectMed();}
  else ocSelect(name);}
function ocCalc(){const total=OC.dose*OC_W,qty=total/OC_MED.conc;return{total,qty};}
function ocSafe(){return OC.dose>=OC_MED.safeRange[0]&&OC.dose<=OC_MED.safeRange[1];}
function ocEstimate(){const price=OC_MED.price,remaining=VISIT.estHigh-VISIT.estCurrent,projected=remaining-price;return{price,remaining,projected};}
function ocSelectMed(){OC.medId=OC_MED.id;OC.dose=OC_MED.defaultDose;OC.route=OC_MED.route;OC.freq=OC_MED.freq;OC.problem=OC_MED.problem;OC.override=false;OC.overrideReason='';OC.mon={};OC_MED.monitoring.forEach(m=>OC.mon[m.name]=m.sel);OC.quantity='';OC.luna='';renderComposer();}
function ocSelect(name){if(/Cerenia/i.test(name)){if(!/injectable/i.test(name))toast('Prototype: guided configure shown for the injectable form');ocSelectMed();return;}
  const fm=name.match(/\b(q\d+h|SID|BID|TID|QID|Once)\b/i);const freq=fm?fm[1]:'q6h';const base=name.replace(/\s*\b(q\d+h|SID|BID|TID|QID|Once)\b/i,'').trim();const care=/food|hydrat/i.test(base);
  ORDERS.push({id:'o'+Date.now(),type:care?'care':'obs',section:care?'Patient Care':'Basic Observation',name:base,freq,start:Math.ceil(nowMin()/60)});buildTasks();logEvent('doctor',`Order added — <b>${base}</b> ${freq}`,'DG');closeDrawers();renderSheet();toast(base+' added');}
function ocResultsHTML(){const q=(OC.q||'').toLowerCase().trim();const suggested=VISIT.problems.some(p=>/vomit|inappet|nausea/i.test(p));let html='';
  if(suggested&&!q){html+=`<div class="oc-sec"><div class="oc-sec-h">Suggested for this patient</div><div class="oc-res">`+['Cerenia injectable 10 mg/mL','Vomiting check q4h','Appetite check q6h','Offer food q6h'].map(n=>`<button class="oc-ritem sugg" onclick="ocSelect('${n}')">${IC.spark}${n}</button>`).join('')+`</div></div>`;}
  Object.entries(OC_SEARCH).forEach(([grp,items])=>{const fil=items.filter(n=>!q||n.toLowerCase().includes(q));if(!fil.length)return;html+=`<div class="oc-sec"><div class="oc-sec-h">${grp}</div><div class="oc-res">${fil.map(n=>`<button class="oc-ritem" onclick="ocSelect('${n}')">${n}</button>`).join('')}</div></div>`;});
  return html||`<div class="lp-empty" style="padding:26px">No results. Try another term.</div>`;}
function ocRefreshResults(){const el=$('#ocResults');if(el)el.innerHTML=ocResultsHTML();}
function ocSearchHTML(){return `<div class="oc-search-wrap"><div class="lp-search oc-search">${IC.search}<input id="ocQ" placeholder="Search medication, treatment, diagnostic, or monitoring…" autocomplete="off" value="${(OC.q||'').replace(/"/g,'&quot;')}" oninput="OC.q=this.value;ocRefreshResults()"></div><div id="ocResults">${ocResultsHTML()}</div></div>`;}
function ocInstructionHTML(){const {qty}=ocCalc();return `<div class="oc-inst-med">${OC_MED.name}</div><div class="oc-inst-big">Give ${qty.toFixed(2)} mL ${OC.route} ${ocFreqLabel(OC.freq)}</div>`;}
function ocMathHTML(){const {total,qty}=ocCalc();return `<div class="oc-sec-h">Clinical Math</div>
  <div class="oc-math-row"><span>Weight</span><b>${OC_W} kg</b></div><div class="oc-math-row"><span>Dose</span><b>${OC.dose} mg/kg</b></div>
  <div class="oc-math-row"><span>Total Dose</span><b>${total.toFixed(1)} mg</b></div><div class="oc-math-row"><span>Concentration</span><b>${OC_MED.conc} mg/mL</b></div>
  <div class="oc-math-row hi"><span>Quantity</span><b>${qty.toFixed(2)} mL</b></div>`;}
function ocFreqLabel(f){if(!f)return '';const s=String(f).trim(),low=s.toLowerCase();
  if(['prn','sid','bid','tid','qid'].includes(low))return s.toUpperCase();
  if(low==='once')return 'Once';if(low==='until completed')return 'Until Completed';if(low==='one time')return 'One Time';
  return s.replace(/\bq(\d+)h\b/gi,(m,n)=>'Q'+n+'H');}
function ocFreqMenuHTML(){const G=[['Special Options',['PRN','Until completed','One time','Once']],['Common Intervals',['q1h','q2h','q4h','q6h','q8h','q12h','q24h']],['Daily Options',['SID','BID','TID','QID']]];
  return G.map(([g,items])=>`<div class="oc-fcat">${g}</div>${items.map(v=>`<button type="button" class="oc-fitem${v===OC.freq?' sel':''}" onmousedown="event.preventDefault();ocFreqPick('${v}')">${ocFreqLabel(v)}</button>`).join('')}`).join('')+`<div class="oc-fcat">Custom</div><div class="oc-fcustom"><input placeholder="Custom Frequency…" onkeydown="if(event.key==='Enter'){event.preventDefault();ocFreqPick(this.value);}"></div>`;}
let _ocFOutside=null;
function ocFreqToggle(e){e.stopPropagation();const d=$('#ocFdrop');if(!d)return;if(d.style.display==='block'){ocFreqClose();return;}d.style.display='block';setTimeout(()=>{_ocFOutside=ev=>{const w=document.querySelector('.oc-fwrap');if(w&&!w.contains(ev.target))ocFreqClose();};document.addEventListener('mousedown',_ocFOutside);},0);}
function ocFreqClose(){const d=$('#ocFdrop');if(d)d.style.display='none';if(_ocFOutside){document.removeEventListener('mousedown',_ocFOutside);_ocFOutside=null;}}
function ocFreqPick(v){v=(v||'').trim();if(!v)return;OC.freq=v;ocFreqClose();const b=$('#ocFbtn');if(b)b.innerHTML=`<span>${ocFreqLabel(v)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;ocRefreshDynamic();}
function ocConfigFieldsHTML(){return `<div class="oc-sec-h">Configure Order</div>
  <div class="field-2"><div class="field"><label>Dose (mg/kg)</label><input id="ocDose" type="number" step="0.1" value="${OC.dose}" oninput="ocSetDose(this.value)"></div><div class="field"><label>Route</label><select onchange="OC.route=this.value;ocRefreshDynamic()">${['SQ','IV','IM','PO'].map(r=>`<option ${r===OC.route?'selected':''}>${r}</option>`).join('')}</select></div></div>
  <div class="field-2">
    <div class="field oc-ffield"><label>Frequency</label><div class="oc-fwrap"><button type="button" class="oc-fbtn" id="ocFbtn" onclick="ocFreqToggle(event)"><span>${ocFreqLabel(OC.freq)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="oc-fdrop" id="ocFdrop" style="display:none">${ocFreqMenuHTML()}</div></div></div>
    <div class="field"><label>Doctor</label><input value="${OC.doctor}" onchange="OC.doctor=this.value"></div>
  </div>
  <div class="field-2"><div class="field"><label>Start</label><input value="${OC.start}" list="ocStartList" placeholder="Type a start date / time…" onchange="OC.start=this.value"></div><div class="field"><label>End</label><input value="${OC.end}" list="ocEndList" placeholder="Type or pick…" onchange="OC.end=this.value"></div></div>
  <datalist id="ocStartList"><option>Now</option><option>In 1 hour</option><option>In 2 hours</option><option>Tomorrow AM</option><option>At next rounds</option></datalist>
  <datalist id="ocEndList"><option>Checkout / Discharge</option><option>Until discontinued</option><option>After 3 doses</option><option>Tomorrow AM</option><option>In 24 hours</option></datalist>
  <div class="field"><label>Quantity</label><div class="oc-qty-row"><input id="ocQty" value="${OC.quantity}" placeholder="—"><button class="glass-btn oc-usecalc" onclick="ocUseCalc()">Use Calculated Quantity</button></div></div>`;}
function ocSetDose(v){OC.dose=parseFloat(v)||0;ocRefreshDynamic();}
function ocUseCalc(){OC.quantity=ocCalc().qty.toFixed(2)+' mL';const el=$('#ocQty');if(el)el.value=OC.quantity;toast('Quantity set to '+OC.quantity);}
function ocUseRecommended(){OC.dose=OC_MED.defaultDose;OC.override=false;OC.overrideReason='';renderComposer();}
function ocDoOverride(){OC.override=true;const s=$('#oc-safety');if(s)s.innerHTML=ocSafetyHTML();ocFoot();}
function ocSafetyHTML(){const {qty}=ocCalc();const above=OC.dose>OC_MED.safeRange[1];const recQty=OC_MED.defaultDose*OC_W/OC_MED.conc;
  if(ocSafe()){return `<div class="oc-safe-box safe"><div class="oc-safe-h">${OC_CHK}Safety Review</div><div class="oc-safe-list">${['Dose verified','Monitoring paired','No duplicate active order','Estimate within range'].map(x=>`<div class="oc-safe-i">${OC_CHK}${x}</div>`).join('')}</div></div>`;}
  const reason=OC.override?`<div class="field" style="margin-top:12px"><label>Override reason required</label><textarea id="ocOR" placeholder="Enter clinical reason for override…" oninput="OC.overrideReason=this.value;ocFoot()">${OC.overrideReason}</textarea></div>`:'';
  return `<div class="oc-safe-box danger"><div class="oc-safe-h danger">${OC_WARN}Safety Review Required</div>
    <div class="oc-safe-msg">Entered dose is ${above?'above':'below'} hospital safety settings.</div>
    <div class="oc-safe-grid"><div><span>Recommended range</span><b>${OC_MED.safeRange[0]}–${OC_MED.safeRange[1]} mg/kg</b></div><div><span>Entered dose</span><b class="bad">${OC.dose} mg/kg</b></div><div><span>Calculated quantity</span><b class="bad">${qty.toFixed(1)} mL</b></div><div><span>Recommended correction</span><b>${OC_MED.defaultDose} mg/kg = ${recQty.toFixed(2)} mL</b></div></div>
    <div class="oc-safe-actions"><button class="glass-btn oc-rec" onclick="ocUseRecommended()">Use Recommended Dose</button><button class="btn ghost oc-ovr" onclick="ocDoOverride()">Doctor Override</button></div>${reason}</div>`;}
function ocMonHTML(){return `<div class="oc-sec-h">Suggested Monitoring</div><div class="oc-mon">${OC_MED.monitoring.map(m=>{const on=OC.mon[m.name];return `<div class="oc-mon-i${on?' on':''}"><button class="oc-mon-tog${on?' on':''}" onclick="ocToggleMon('${m.name}')">${on?OC_CHK:'+'}</button><div class="oc-mon-b"><div class="oc-mon-t">${m.name}<span class="oc-mon-f">${m.freq}</span></div><div class="oc-mon-r">Reason: ${m.reason}</div></div></div>`;}).join('')}</div>`;}
function ocToggleMon(n){OC.mon[n]=!OC.mon[n];const el=$('#oc-mon');if(el)el.innerHTML=ocMonHTML();}
function ocProblemHTML(){return `<div class="oc-sec-h">Linked Problem</div><select class="ward-sel" onchange="OC.problem=this.value">${OC_PROBLEMS.map(p=>`<option ${p===OC.problem?'selected':''}>${p}</option>`).join('')}</select>`;}
function ocEstimateHTML(){const {price,remaining,projected}=ocEstimate();const neg=projected<0,low=projected<150;
  return `<div class="oc-sec-h">Estimate Impact</div><div class="oc-est-add">+${money(price)}<span>this order</span></div>
  <div class="oc-est-rows"><div><span>Remaining to high end</span><b>${money(remaining)}</b></div><div><span>Projected remaining</span><b class="${neg?'bad':low?'warn':'good'}">${projected<0?'−'+money(Math.abs(projected)):money(projected)}</b></div></div>
  <div class="oc-est-bar"><div class="oc-est-fill ${neg?'red':low?'amber':'cyan'}" style="width:${Math.max(5,Math.min(100,price/remaining*100)).toFixed(0)}%"></div></div>
  ${neg?`<div class="oc-est-warn">${OC_WARN}Updated authorization required before exceeding the estimate high end.</div>`:''}`;}
function ocMedIntelHTML(){return `<div class="oc-mi"><div class="oc-mi-h">Med Intelligence</div><div class="oc-mi-drug">${OC_MED.genericName}</div><div class="oc-mi-trade">Trade name · ${OC_MED.name.split(' ')[0]}</div><div class="oc-mi-class">${OC_MED.className}</div>
  <div class="oc-mi-btns">${['Open Monograph','Drug Handout','Dose Guidance','Interactions','Adverse Effects'].map(b=>`<button class="oc-mi-btn" onclick="toast('${b} — prototype')">${b}</button>`).join('')}</div>
  <div class="oc-mi-lbl">Prescriber Highlights</div><ul class="oc-mi-list"><li>Used for prevention and treatment of vomiting.</li><li>Injectable route may be preferred for actively vomiting patients.</li><li>Monitor appetite and vomiting response after administration.</li><li>Review dose, route, and frequency before ordering.</li></ul>
  <div class="oc-mi-foot">Medication guidance is for workflow support. Doctor approval required.</div></div>`;}
function ocLunaPick(i){OC.luna=OC_LUNA[i][0];const el=$('#oc-lunaWrap');if(el)el.innerHTML=ocLunaHTML();}
function ocLunaHTML(){const ans=OC_LUNA.find(q=>q[0]===OC.luna);
  return `<div class="oc-luna"><div class="oc-luna-h">${IC.spark}L.U.N.A.</div><div class="oc-luna-qs">${OC_LUNA.map((q,i)=>`<button class="oc-luna-q${q[0]===OC.luna?' sel':''}" onclick="ocLunaPick(${i})">${q[0]}</button>`).join('')}</div>${ans?`<div class="oc-luna-a">${ans[1]}<div class="oc-luna-meta"><span>Source: Hospital medication workflow rules</span><span>Confidence: Prototype rule</span></div><div class="oc-luna-guard">L.U.N.A. explains workflow rules and source information. The doctor must approve clinical decisions.</div></div>`:''}</div>`;}
function ocRefreshDynamic(){['oc-instruction:ocInstructionHTML','oc-math:ocMathHTML','oc-safety:ocSafetyHTML','oc-estimate:ocEstimateHTML'].forEach(pair=>{const[id,fn]=pair.split(':');const el=$('#'+id);if(el)el.innerHTML=window[fn]?window[fn]():'';});
  const inst=$('#oc-instruction');if(inst)inst.innerHTML=ocInstructionHTML();const math=$('#oc-math');if(math)math.innerHTML=ocMathHTML();const saf=$('#oc-safety');if(saf)saf.innerHTML=ocSafetyHTML();const est=$('#oc-estimate');if(est)est.innerHTML=ocEstimateHTML();ocFoot();}
function ocFoot(){const foot=$('#ocFoot');if(!foot)return;
  if(!OC.medId){foot.innerHTML=`<button class="btn ghost" onclick="closeDrawers()">Cancel</button>`;return;}
  const {projected}=ocEstimate();let label='Place Order',cls='btn primary',dis='';
  if(!OC.dose||OC.dose<=0){label='Complete Required Fields';cls='btn oc-btn-mute';dis='disabled';}
  else if(!ocSafe()&&!OC.override){label='Safety Review Required';cls='btn oc-btn-danger';dis='disabled';}
  else if(OC.override&&!OC.overrideReason.trim()){label='Place Order with Doctor Override';cls='btn oc-btn-warn';dis='disabled';}
  else if(OC.override){label='Place Order with Doctor Override';cls='btn oc-btn-warn';}
  else if(projected<0){label='Updated Authorization Required';cls='btn oc-btn-warn';}
  else if(projected<150){label='Place Order & Flag Estimate';cls='btn oc-btn-warn';}
  else{label='Place Order';cls='btn primary';}
  foot.innerHTML=`<button class="btn ghost" onclick="closeDrawers()">Cancel</button><button class="${cls}" ${dis} onclick="ocPlace()">${label}</button>`;}
function ocPlace(){const {qty}=ocCalc();const start=Math.ceil(nowMin()/60);
  ORDERS.push({id:'o'+Date.now(),type:'med',section:'Medications',name:OC_MED.name,dose:OC.dose,unit:'mg/kg',conc:OC_MED.conc,route:OC.route,freq:OC.freq,start,notes:OC.override?('Doctor override: '+OC.overrideReason):''});
  OC_MED.monitoring.forEach(m=>{if(OC.mon[m.name]){const care=/food|hydrat/i.test(m.name);ORDERS.push({id:'o'+Date.now()+Math.random().toString(36).slice(2,5),type:care?'care':'obs',section:care?'Patient Care':'Basic Observation',name:m.name,freq:m.freq,start});}});
  buildTasks();logEvent('doctor',`Order placed — <b>${OC_MED.name}</b> ${OC.route} ${OC.freq}${OC.override?' (override)':''}`,'DG');closeDrawers();renderSheet();toast(OC_MED.name+' placed on treatment sheet');}
function renderComposer(){const body=$('#ob-body');const pl=$('#oc-ptline');if(pl)pl.textContent=`${OC_PT} · ${OC_SP} · ${OC_W} kg`;if(!body)return;
  if(!OC.medId){body.innerHTML=ocSearchHTML();ocFoot();return;}
  body.innerHTML=`<div id="oc-instruction" class="oc-inst">${ocInstructionHTML()}</div>
    <div class="oc-grid"><div class="oc-col-l">
      <div class="oc-panel">${ocConfigFieldsHTML()}</div>
      <div class="oc-panel" id="oc-math">${ocMathHTML()}</div>
      <div class="oc-panel">${ocProblemHTML()}</div>
    </div><div class="oc-col-r">${ocMedIntelHTML()}<div id="oc-lunaWrap">${ocLunaHTML()}</div></div></div>
    <div class="oc-panel" id="oc-safety">${ocSafetyHTML()}</div>
    <div class="oc-panel" id="oc-mon">${ocMonHTML()}</div>
    <div class="oc-panel" id="oc-estimate">${ocEstimateHTML()}</div>
    <button class="oc-back" onclick="OC.medId=null;renderComposer()">‹ Back to search</button>`;
  ocFoot();}
function applyTemplate(i){const t=TEMPLATES[i];let base=Math.ceil(nowMin()/60);t.orders.forEach(od=>ORDERS.push(Object.assign({id:'o'+Date.now()+Math.random().toString(36).slice(2,6),start:base},od)));buildTasks();logEvent('doctor',`Applied template — <b>${t.name}</b> (${t.orders.length} orders)`,'DG');closeDrawers();renderSheet();toast(`${t.name} applied · ${t.orders.length} orders added`);}
const TEMPLATES=[
  {name:'ER Hospitalization',orders:[{type:'obs',section:'Basic Observation',name:'TPR',freq:'q4h'},{type:'obs',section:'Basic Observation',name:'MM / CRT',freq:'q4h'},{type:'obs',section:'Basic Observation',name:'Mentation',freq:'q4h'},{type:'obs',section:'Basic Observation',name:'Pain score',freq:'q4h'},{type:'care',section:'Patient Care',name:'Walk',freq:'q6h'},{type:'care',section:'Patient Care',name:'Offer food/water',freq:'q8h'},{type:'care',section:'Patient Care',name:'Check IV catheter',freq:'q4h'}]},
  {name:'Stable Inpatient',orders:[{type:'obs',section:'Basic Observation',name:'TPR',freq:'q6h'},{type:'care',section:'Patient Care',name:'Walk',freq:'q8h'},{type:'care',section:'Patient Care',name:'Offer food/water',freq:'q8h'}]},
  {name:'Critical Patient',orders:[{type:'obs',section:'Basic Observation',name:'TPR',freq:'q1h'},{type:'obs',section:'Basic Observation',name:'Blood pressure',freq:'q1h'},{type:'obs',section:'Basic Observation',name:'SpO₂',freq:'q1h'},{type:'obs',section:'Basic Observation',name:'Pain score',freq:'q2h'}]},
  {name:'Post-Op',orders:[{type:'obs',section:'Basic Observation',name:'TPR',freq:'q2h'},{type:'obs',section:'Basic Observation',name:'Pain score',freq:'q2h'},{type:'care',section:'Patient Care',name:'Incision check',freq:'q8h'},{type:'care',section:'Patient Care',name:'E-collar check',freq:'q8h'}]},
  {name:'DKA',orders:[{type:'diag',section:'Diagnostics',name:'Blood glucose',freq:'q2h'},{type:'diag',section:'Diagnostics',name:'Electrolytes',freq:'q6h'},{type:'obs',section:'Basic Observation',name:'Mentation',freq:'q2h'},{type:'obs',section:'Basic Observation',name:'Urine output',freq:'q4h'}]},
  {name:'GI / Vomiting',orders:[{type:'obs',section:'Basic Observation',name:'Vomiting',freq:'q4h'},{type:'obs',section:'Basic Observation',name:'Defecation',freq:'q8h'},{type:'care',section:'Patient Care',name:'Offer food',freq:'q8h'}]},
  {name:'Respiratory',orders:[{type:'obs',section:'Basic Observation',name:'Respiratory rate/effort',freq:'q2h'},{type:'obs',section:'Basic Observation',name:'SpO₂',freq:'q2h'}]},
];

/* ═══ MEDICAL ROUNDS ═══ */
function renderRounds(){
  const meds=ORDERS.filter(o=>o.type==='med').map(o=>`${o.name} ${o.freq}`).join(', ');
  const rcSec=(l,v)=>`<div class="rc-sec"><div class="lab">${l}</div><div class="val">${v}</div></div>`;
  const cookie=`<div class="rc"><div class="panel"><div class="rc-head">${ptBadge(VISIT.patient,VISIT.species,'width:40px;height:40px;font-size:13px')}<div style="flex:1"><div style="font-weight:800;font-size:15px">${VISIT.patient}</div><div style="color:var(--ink-400);font-size:12px">${[VISIT.species,VISIT.breed,VISIT.sex,VISIT.weight?VISIT.weight+' kg':''].filter(x=>x&&x!=='—').join(' · ')}</div></div>${clinPill(VISIT.status||'Stable')}</div><div class="rc-body">
    ${rcSec('Doctor · Location · Day',`${VISIT.doctorTo} · ${VISIT.location} · ${VISIT.day}`)}${rcSec('Code Status',VISIT.code)}${rcSec('Problem List',VISIT.problems.join(', '))}
    ${rcSec('Overnight Events','No vomiting overnight. Ate ¼ can a/d. Stable vitals. Urinated x2, no straining.')}
    ${rcSec('Latest Vitals',`T ${VISIT.temp}°F · HR ${VISIT.hr} · RR ${VISIT.rr} · MM Pink · CRT &lt;2s · BAR`)}
    ${rcSec('Current Medications',meds)}${rcSec('Current Fluids','LRS + KCl 20 mEq/L @ 60 mL/hr')}
    ${rcSec('Diagnostics Pending','Recheck electrolytes (AM), review lab results')}${rcSec('Current Plan','Continue IV fluids &amp; Cerenia, recheck electrolytes AM, monitor appetite')}
    ${rcSec('Owner Communication','Updated 9:10 AM — approved continued care')}${rcSec('Discharge Readiness','<span class="pill st-waiting"><span class="d"></span>Not ready</span>')}
  </div></div></div>`;
  const others=OTHERS.map(p=>`<div class="rc"><div class="panel"><div class="rc-head">${ptBadge(p.name,p.species,'width:40px;height:40px;font-size:13px')}<div style="flex:1"><div style="font-weight:800;font-size:15px">${p.name}</div><div style="color:var(--ink-400);font-size:12px">${p.sig}</div></div>${clinPill(p.status)}</div><div class="rc-body">
    ${rcSec('Doctor · Location',`${p.doctor.split(',')[0]} · ${p.loc}`)}${rcSec('Problem List',p.problems.join(', '))}${rcSec('Tasks',`${p.due} due · ${p.late} late`)}
    ${rcSec('Discharge Readiness',p.status==='Discharge pending'?'<span class="pill st-exam"><span class="d"></span>Ready — pending paperwork</span>':'<span class="pill st-waiting"><span class="d"></span>Not ready</span>')}
  </div></div></div>`).join('');
  $('#ctab-rounds').innerHTML=`<div class="rounds-grid">${cookie}${others}</div>`;
}

/* ═══ TIMELINE ═══ */
let tlFilter='all';
function renderTimeline(){seedAudit();
  const filters=[['all','All events'],['med','Medications'],['vital','Vitals'],['fluid','Fluids'],['note','Notes'],['doctor','Doctor actions'],['care','Nursing care'],['diag','Diagnostics'],['comm','Communication']];
  let items=AUDIT.slice();NOTES.forEach(n=>items.push({min:n.min,type:'note',desc:`${n.type.charAt(0).toUpperCase()+n.type.slice(1)} note added`,who:n.author}));
  if(tlFilter!=='all')items=items.filter(i=>i.type===tlFilter);items.sort((a,b)=>b.min-a.min);
  $('#ctab-timeline').innerHTML=`<div class="tl-filters">${filters.map(([k,l])=>`<button class="chip ${k===tlFilter?'active':''}" onclick="tlFilter='${k}';renderTimeline()">${l}</button>`).join('')}</div>
    <div class="panel" style="padding:20px 22px"><div class="timeline">${items.map(i=>`<div class="tl-item ${i.type}"><div class="tl-time">${fmtTime(i.min)}</div><div class="tl-desc">${i.desc}</div><div class="tl-who">${i.who?(i.who.startsWith('Dr.')?i.who:'by '+i.who):''}</div></div>`).join('')}</div></div>`;
}
function logEvent(type,desc,who){AUDIT.push({min:nowMin(),type,desc,who});}

/* ═══ NOTES ═══ */
function renderNotes(){const sorted=[...NOTES].sort((a,b)=>b.min-a.min);
  $('#ctab-notes').innerHTML=`<button class="btn primary" style="width:auto;height:40px;padding:0 18px;margin-bottom:16px" onclick="openDrawer('noteDrawer')">+ Add Note</button>
    ${sorted.map(n=>`<div class="cnote"><div class="nh"><span class="ntype ${n.type}">${n.type}</span><span class="nmeta"><b style="color:var(--ink-900)">${n.author}</b> · ${n.role} · ${fmtTime(n.min)}</span></div><div class="nbody">${n.body}</div></div>`).join('')}`;
}
function submitNote(){const body=$('#note-body').value.trim();if(!body){toast('Write a note first');return;}const type=$('#note-type').value;NOTES.push({min:nowMin(),type,author:'DG',role:currentRole.charAt(0).toUpperCase()+currentRole.slice(1),body});logEvent('note',`${type} note added`,'DG');$('#note-body').value='';closeDrawers();renderNotes();toast('Note saved');}

/* ═══ DRAWERS / TOAST / ROLE ═══ */
function openDrawer(id){$('#scrim').classList.add('show');$('#'+id).classList.add('open');}
function closeDrawers(){$('#scrim').classList.remove('show');$$('.drawer').forEach(d=>d.classList.remove('open'));}
function openBrief(){const b=$('#clinSidebar');if(b)b.classList.add('open');$('#briefScrim').classList.add('show');}
function closeBrief(){const b=$('#clinSidebar');if(b)b.classList.remove('open');$('#briefScrim').classList.remove('show');}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawers();closeBrief();_closePop();closeModal();}});
function toast(msg){const el=document.createElement('div');el.className='ctoast';el.innerHTML=`<span class="tk"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${msg}`;$('#toastWrap').appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(8px)';setTimeout(()=>el.remove(),300);},2600);}
$('#roleSelect').onchange=e=>{currentRole=e.target.value;if(currentCTab==='sheet')renderSheet();toast(`Viewing as ${e.target.selectedOptions[0].text}`);};

/* ═══ live clock tick ═══ */
function tick(){if(currentCTab==='sheet'){const nl=$('#sheetInner .nowline');if(nl){nl.style.left=`calc(240px + ${(nowMin()/60)*54}px)`;const l=nl.querySelector('.now-lbl');if(l)l.textContent='NOW '+fmtTime(nowMin());}}}
setInterval(tick,10000);

/* ═══ init ═══ */
buildTasks();
selectCTab('dash');
