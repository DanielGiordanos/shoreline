
/* ═══════════════════════════════════════════════════════════════
   TREATMENT SHEETS · CORE UI (from the Flow Clinical prototype)
   Shared screen state (VISIT, ORDERS, TASKS, NOTES, AUDIT) and the screens that draw it:
   board, grid, completion drawer, timeline, notes. Everything starts empty; the store (store/*.js)
   loads the sheet from Firestore into this state, saves changes back, and adds every newer feature.
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

/* ── the clock: minutes since midnight (the store adds the clock of an earlier day being viewed) ── */
function nowMin(){const d=new Date();return d.getHours()*60+d.getMinutes()+d.getSeconds()/60;}
function fmtTime(min){min=((Math.round(min)%1440)+1440)%1440;let h=Math.floor(min/60),m=min%60,ap=h<12?'AM':'PM',hh=h%12;if(hh===0)hh=12;return `${hh}:${String(m).padStart(2,'0')} ${ap}`;}
function hourLabel(h){let ap=h<12?'A':'P',hh=h%12;if(hh===0)hh=12;return {h:hh,ap};}

/* ── reference data ── */
const STAFF=[];   /* initials offered in the completion drawer: the signed-in person (added by the store) */
const VISIT={};   /* filled from the sheet by the store (setVisit) */
const OTHERS=[];   /* the other admitted patients, filled by the store */

/* ── orders ── */
let ORDERS=[];   /* the open sheet's orders (own copies), filled by the store */
const SECTIONS=[
  {key:'Basic Observation',icon:'M3 12h4l2-7 4 14 2-7h6'},
  {key:'Continuous Infusions',icon:'M12 3c3 4 5 6.5 5 9a5 5 0 01-10 0c0-2.5 2-5 5-9z'},
  {key:'Medications',icon:'M10.5 20.5a4.95 4.95 0 01-7-7l6-6a4.95 4.95 0 017 7l-6 6zM8 8l8 8'},
  {key:'Patient Care',icon:'M12 21s-7-4.35-9.5-8.5C.8 9.6 2.3 6 5.5 6 7.5 6 9 7.2 12 10c3-2.8 4.5-4 6.5-4 3.2 0 4.7 3.6 3 6.5C19 16.65 12 21 12 21z'},
  {key:'Diagnostics',icon:'M9 3v6l-5 9a2 2 0 002 3h12a2 2 0 002-3l-5-9V3M8 3h8'},
];
const FREQ_INT={q1h:1,q2h:2,q4h:4,q6h:6,q8h:8,q12h:12,q24h:24,SID:24,BID:12,TID:8,QID:6};
function freqTimes(o){if(o.draft)return [];   /* a draft order (store/drafts.js) has no slots until a doctor approves it */
  if(['PRN','Continuous','Until discontinued','Custom'].includes(o.freq))return [];if(o.freq==='Once')return [o.start];const int=FREQ_INT[o.freq]||24,out=[];for(let h=o.start;h<24;h+=int)out.push(h);return out;}

let TASKS=[],AUDIT=[],NOTES=[],TASK_SEQ=0;
function deriveStatus(t){if(t.status==='completed')return 'completed';if(t.status==='held'||t.status==='skipped')return 'skipped';if(t.status==='delayed')return 'scheduled';const n=nowMin();if(t.sched>n+18)return 'scheduled';if(t.sched>=n-18)return 'due';return 'overdue';}
NOTES=[{min:480,type:'nursing',author:'KM',role:'Technician',body:'Patient BAR this AM. No vomiting overnight. Ate ¼ can a/d, drank small amount. Urinated x2, no straining.'},
  {min:552,type:'doctor',author:'Dr. Nolte',role:'Doctor',body:'Continue current plan. Recheck electrolytes AM — trending K+ before adjusting additive. Reassess appetite at noon.'},
  {min:555,type:'communication',author:'Dr. Nolte',role:'Doctor',body:'Spoke with owner. Updated on stable overnight status. Owner approved continued care. Will update again this PM.'}];

/* ── status counts ── */
/* ═══ MODULE + TAB NAVIGATION ═══ */
let currentCTab='dash', currentRole='tech';
function selectCTab(tab){
  currentCTab=tab;
  $$('#clinSwitcher .seg').forEach(c=>c.classList.toggle('active',c.dataset.ctab===tab));
  $$('.ctab').forEach(c=>c.classList.add('hidden'));
  $('#ctab-'+tab).classList.remove('hidden');
  $('#stage').classList.toggle('sheet-active',tab==='sheet'||tab==='vitals');
  closeBrief();
  if(tab==='dash')renderDash();if(tab==='sheet')renderSheet();if(tab==='vitals')renderVitals();if(tab==='rounds')renderRounds();if(tab==='timeline')renderTimeline();if(tab==='notes')renderNotes();if(tab==='charges'&&window.tsRenderCharges)tsRenderCharges();if(tab==='tasks'&&window.tsRenderTasks)tsRenderTasks();
  $('#stage').scrollTop=0;
}
$$('#clinSwitcher .seg').forEach(b=>b.onclick=()=>selectCTab(b.dataset.ctab));

/* helper: species emoji + class */
function spTag(species){return /^(cat|fel)/i.test(String(species||''))?'FEL':'CAN';}
function spClass(species){return /^(cat|fel)/i.test(String(species||''))?'sp-fel':'sp-can';}
function monogram(name){return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function ptBadge(name,species,style){return `<div class="pt-emoji ${spClass(species)}"${style?` style="${style}"`:''}>${monogram(name)}<span class="sp-tag">${spTag(species)}</span></div>`;}
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

/* Discharge time picker (24h) */

/* Discharge date calendar */
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
let sbTx=true, sbBoard='IP Board';
function lsPill(ls){if(!ls)return '';const m={ALS:'ls-als',BLS:'ls-bls',DNR:'ls-dnr'}[ls]||'ls-als';return `<span class="ls-pill ${m}">${IC.heart}${ls}</span>`;}
function toggleSbTx(){sbTx=!sbTx;renderDash();}
function setSbBoard(b){sbBoard=b;renderDash();}
function openSbFilters(ev){ev.stopPropagation();if(window.tsSbFilters){tsSbFilters(ev.currentTarget);return;}   /* workflow filters (store/workflow.js) */
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
      ${window.tsBoardTools?tsBoardTools():''}${window.tsWfChip?tsWfChip():''}<button class="sb-filters${window.tsWfOn&&tsWfOn()?' on':''}" onclick="openSbFilters(event)">${IC.filter} Filters</button>
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
      <div class="sbc c-ward">${(window.tsWardSel&&tsWardSel(p))||`<select class="ward-sel" onchange="toast('${p.name.split(' ')[0]} → '+this.value)">${WARDS.map(w=>`<option ${w===p.ward?'selected':''}>${w}</option>`).join('')}</select>`}</div>
      <div class="sbc c-io"><div style="display:flex;align-items:center;gap:8px"><span class="io-badge" style="float:none;margin:0">${p.inout}</span><div><div class="io-date">${p.date}</div><div class="io-time">${p.time}</div></div></div></div>
      <div class="sbc c-timer">${p.techHTML||''}</div>
      <div class="sbc c-alerts aa-cell" onclick="event.stopPropagation();openPatient(${i})" title="Alert Assist">${p.alerts.length?p.alerts.map(a=>`<div class="al-row ${a.t}">${IC.tri}${a.x}</div>`).join(''):'<span class="al-empty">— Add alert</span>'}<div class="aa-cell-hint">${IC.spark}Alert Assist</div></div>
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
/* ═══ TREATMENT SHEET ═══ */
function patientCmdHTML(){ if(window.tsHeaderHTML){ try{ return tsHeaderHTML(); }catch(e){ console.warn('[header]',e); } }
  const chips=`
    <span class="ts-wt-slot">${window.tsWeightHTML?tsWeightHTML():'<span class="pill soft">'+VISIT.weight+' kg</span>'}</span>
    <span class="pill soft">${deptName(VISIT.dept)}</span>
    <span class="ts-ho-slot">${window.tsDoctorChip?tsDoctorChip():VISIT.doctorFrom.split(',')[0]+' → '+VISIT.doctorTo.split(',')[0]}</span>
    <span class="ts-techchip-slot">${window.tsTechChip?tsTechChip():''}</span>
    <span class="pill soft ts-day-slot">${window.tsDayLabel?tsDayLabel():VISIT.day}</span>
    <span class="ts-locchip-slot">${window.tsLocChip?tsLocChip():'<span class="pill soft">'+VISIT.location+'</span>'}</span>
    ${tsCodePill()}`;
  return `<section class="clinical-patient-header">
    <div class="cmd-r1">
      <button class="c-back" onclick="selectCTab('dash')" title="Back to patients"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <div style="min-width:0">
        <div class="cmd-name">${VISIT.patient} <span class="pid">${VISIT.vcode||('V-'+VISIT.id)}</span></div>
        <div class="cmd-sig">${[VISIT.species,VISIT.breed,VISIT.sex,VISIT.age].map(x=>`<span>${x}</span>`).join('<span class="d"></span>')}</div>
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
function renderSheet(){
  const ov=document.getElementById('ctab-vitals');if(ov)ov.innerHTML='';
  const canAdd=currentRole==='doctor'||currentRole==='admin';
  const grid=`<main class="treatment-main">
    <div class="treatment-toolbar">
      <button class="btn ghost brief-toggle" onclick="openBrief()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1.5"/><line x1="14" y1="7" x2="21" y2="7"/><line x1="14" y1="12" x2="21" y2="12"/><line x1="14" y1="17" x2="21" y2="17"/></svg>Patient info</button>
      <div class="order-search-wrapper"><div class="qadd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="tsSearch" placeholder="Add order by name or ID…" autocomplete="off" onfocus="openTsDrop()" oninput="tsRender(this.value)" onkeydown="tsKey(event)"></div><div class="order-search-dropdown" id="tsDrop" style="display:none"></div></div>${window.tsSetsBtn?tsSetsBtn():''}
      <div class="day-nav ts-daynav">${window.tsDayNavHTML?tsDayNavHTML():'<button class="today">Today</button>'}</div>
      <div class="spacer" style="flex:1"></div>
      <span id="tsDrafts" class="ts-seen-slot"></span><span id="tsSeen" class="ts-seen-slot"></span>
      <button class="btn ghost" style="flex:0 0 auto;width:auto;height:38px;padding:0 14px" onclick="selectCTab('timeline')">Audit</button>
      
    </div>
    <div class="treatment-grid-shell" id="sheetScroll"><div class="sheet-inner" id="sheetInner"></div></div>
    <div class="treatment-legend" id="legend"></div>
  </main>`;
  $('#ctab-sheet').innerHTML=patientCmdHTML()+`<section class="clinical-workspace">${sidebarBriefHTML()}${grid}</section>`;
  buildGrid();
}
/* ═══ GRID (the Vitals tab is store/vitals.js) ═══ */
const MK_CHECK='<svg class="mk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
function markContent(t,s){if(s==='completed')return t.value??MK_CHECK;if(s==='due')return '';if(s==='overdue')return '!';if(s==='skipped')return '–';if(s==='scheduled')return '·';return '';}
function buildGrid(){
  const inner=$('#sheetInner');if(!inner)return;let html='';const nh=Math.floor(nowMin()/60);
  html+=`<div class="grow ghead"><div class="rl"><span class="rl-name" style="color:var(--ink-400);font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:800">Order</span></div><div class="hcells">`;
  for(let h=0;h<24;h++){const L=hourLabel(h);html+=`<div class="hcell ${h===nh?'hour-now':''}" onclick="tsBatch(${h})" title="Chart everything at ${L.h} ${L.ap}M">${L.h}<span class="ampm">${L.ap}</span></div>`;}
  html+=`</div></div>`;
  SECTIONS.forEach(sec=>{const so=ORDERS.filter(o=>o.section===sec.key);if(!so.length)return;
    /* the section band comes from the store (store/sections.js: fold, hour summary, chart the hour, add to section) when it is loaded */
    html+=window.tsSecBand?tsSecBand(sec,so):`<div class="grow"><div class="gsection"><svg class="sicon" viewBox="0 0 24 24" fill="none"><path d="${sec.icon}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="stitle">${sec.key}</span><span class="scount">${so.length}</span>${sec.key==='Continuous Infusions'&&window.tsInfTotal?tsInfTotal():''}</div></div>`;
    const fold=window.tsSecFolded&&tsSecFolded(sec.key)?' sec-folded':'';
    so.forEach(o=>{html+=`<div class="grow${o.dc?' is-dc':''}${o.draft?' is-draft':''}${o.pin?' is-pin':''}${fold}" data-sec="${sec.key}" data-o="${o.id}"><div class="rl" data-dc="${o.dc?(o.dc_reason==='error'?'Error':o.dc_reason==='rejected'?'Not approved':'Stopped'):''}" onclick="tsOrderPanel('${o.id}')" title="Order details">${window.tsRowLead?tsRowLead(o):''}`;   /* draft badge · pin · reorder grip (store/drafts.js, store/sortorder.js) */
      if(o.type==='med'){const d=medDose(o);html+=`<div style="min-width:0"><div class="rl-name">${o.name}${(window.tsBrand&&tsBrand(o.name))?'<span class="rl-brand"> · '+tsBrand(o.name)+'</span>':''}</div><div class="rl-meta">${d.mg}${o.conc?' · <b>'+d.volume+'</b>':''} · ${o.freq}</div></div>${window.tsDoseClock?tsDoseClock(o):''}<span class="route-pill">${o.route}</span>`;}   /* the dose clock (store/medsafe.js) */
      else if(o.type==='fluid'){html+=`<div style="min-width:0"><div class="rl-name">${window.tsInfName?tsInfName(o):o.name}</div><div class="rl-meta">${window.tsInfMeta?tsInfMeta(o):o.rate}</div></div><span class="route-pill">${o.kind==='cri'?'CRI':'IV'}</span>`;}
      else{html+=`<div style="min-width:0"><div class="rl-name">${o.name}</div><div class="rl-meta">${o.freq}${o.unit?' · '+o.unit:''}</div></div>${window.tsRowTrend?tsRowTrend(o):''}`;}   /* the reading's trend (store/vitals.js) */
      html+=`</div><div class="hcells">`;
      if(o.cont&&o.kind&&window.tsInfCells){html+=tsInfCells(o);}else if(o.cont){const nowH=nowMin()/60;for(let h=0;h<24;h++){let cls=h<o.start?'off':(h<=nowH?'on':'future');let lbl=h===o.start?String(o.rate||'').replace(' mL/hr',''):'';html+=`<div class="cell inf"><div class="inf-fill ${cls}" onclick="openInfusion('${o.id}',${h})">${lbl}</div></div>`;}}
      else{for(let h=0;h<24;h++){const _c=TASKS.filter(x=>x.orderId===o.id&&Math.floor(x.sched/60)===h);const t=_c.find(x=>x.status)||_c.find(x=>x.sched===h*60)||_c[0];if(!t){html+=`<div class="cell"></div>`;continue;}const s=deriveStatus(t);if(s==='completed'&&t.severity){html+=`<div class="cell"><div class="mark abn ${t.severity>=2?'sev':''}" onclick="openCompletion('${t.id}')">${t.value}</div></div>`;continue;}const mv=t.movedFrom!=null;html+=`<div class="cell"><div class="mark ${s}${mv?' moved':''}" data-t="${t.id}" onclick="openCompletion('${t.id}')" title="${o.name} · ${fmtTime(t.sched)}${mv?' (moved from '+fmtTime(t.movedFrom)+')':''}">${markContent(t,s)}</div></div>`;}}
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
  if(window.tsCdExtra)body+=tsCdExtra(t);   /* the doctor's dose note and the last dose (store/medsafe.js) */
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
/* ═══ ORDER SEARCH — the dropdown and its keyboard; results and picking are store/rx.js ═══ */
/* toolbar quick-add: anchored dropdown (not the drawer) */
let tsRows=[],tsIdx=-1,_tsOutside=null;
function tsMark(){$$('#tsDrop .ts-item').forEach(el=>el.classList.toggle('hi',+el.dataset.i===tsIdx));}
function tsHi(i){tsIdx=i;tsMark();}
function openTsDrop(){tsRender($('#tsSearch')?$('#tsSearch').value:'');setTimeout(()=>{_tsOutside=e=>{const wrap=document.querySelector('.order-search-wrapper');if(wrap&&!wrap.contains(e.target))closeTsDrop();};document.addEventListener('mousedown',_tsOutside);},0);}
function closeTsDrop(){const d=$('#tsDrop');if(d)d.style.display='none';if(_tsOutside){document.removeEventListener('mousedown',_tsOutside);_tsOutside=null;}}
function tsKey(e){if(e.key==='ArrowDown'){e.preventDefault();tsIdx=Math.min(tsRows.length-1,tsIdx+1);tsMark();}
  else if(e.key==='ArrowUp'){e.preventDefault();tsIdx=Math.max(0,tsIdx-1);tsMark();}
  else if(e.key==='Enter'){e.preventDefault();if(tsIdx>=0&&tsRows[tsIdx])tsPick(tsRows[tsIdx]);}
  else if(e.key==='Escape'){closeTsDrop();const si=$('#tsSearch');if(si)si.blur();}}
/* ═══ TIMELINE ═══ */
let tlFilter='all';
function renderTimeline(){
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

/* ═══ live clock tick ═══ */
function tick(){if(currentCTab==='sheet'){const nl=$('#sheetInner .nowline');if(nl){nl.style.left=`calc(240px + ${(nowMin()/60)*54}px)`;const l=nl.querySelector('.now-lbl');if(l)l.textContent='NOW '+fmtTime(nowMin());}}}
setInterval(tick,10000);

/* ═══ init ═══ */
selectCTab('dash');
