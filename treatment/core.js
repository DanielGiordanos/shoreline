
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
function toggleDark(){document.body.classList.toggle('dark');var d=document.body.classList.contains('dark');try{document.documentElement.style.background=d?'#080E1A':'#F2F4F8';}catch(e){}try{document.cookie='pvx_theme='+(d?'dark':'light')+';domain=.pravix.app;path=/;max-age=31536000;SameSite=Lax';}catch(e){}try{document.cookie='pvx_theme='+(d?'dark':'light')+';path=/;max-age=31536000;SameSite=Lax';}catch(e){}}

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
  if(!document.getElementById('ctab-'+tab)) tab='dash';   /* a tab that no longer exists (e.g. Medical Rounds) */
  currentCTab=tab;
  $$('#clinSwitcher .seg').forEach(c=>c.classList.toggle('active',c.dataset.ctab===tab));
  $$('.ctab').forEach(c=>c.classList.add('hidden'));
  $('#ctab-'+tab).classList.remove('hidden');
  $('#stage').classList.toggle('sheet-active',tab==='sheet'||tab==='vitals');
  closeBrief();
  if(tab==='dash')renderDash();if(tab==='sheet')renderSheet();if(tab==='vitals')renderVitals();if(tab==='timeline')renderTimeline();if(tab==='notes')renderNotes();if(tab==='charges'&&window.tsRenderCharges)tsRenderCharges();if(tab==='tasks'&&window.tsRenderTasks)tsRenderTasks();
  $('#stage').scrollTop=0;
  if(window.tsEmit) tsEmit('tab',tab);   /* store/lastview.js remembers it per person */
}
$$('#clinSwitcher .seg').forEach(b=>b.onclick=()=>selectCTab(b.dataset.ctab));

/* helper: species emoji + class */
function spTag(species){return /^(cat|fel)/i.test(String(species||''))?'FEL':'CAN';}
function spClass(species){return /^(cat|fel)/i.test(String(species||''))?'sp-fel':'sp-can';}
function monogram(name){return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function ptBadge(name,species,style){return `<div class="pt-emoji ${spClass(species)}"${style?` style="${style}"`:''}>${monogram(name)}<span class="sp-tag">${spTag(species)}</span></div>`;}
function kvr(k,v){return `<div class="kvrow"><span class="kk">${k}</span><span class="vv">${v}</span></div>`;}
const DEPT={'ER':'Emergency & Critical Care','ECC':'Emergency & Critical Care','Emergency':'Emergency & Critical Care','Emergency Medicine':'Emergency & Critical Care','Internal Medicine':'Internal Medicine','IM':'Internal Medicine','SX':'Surgery','Surgery':'Surgery','Oncology':'Oncology','Neuro':'Neurology','Neurology':'Neurology'};
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
  bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  chev:'<svg class="sb-chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 6.5 5 3.5l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>',
  hours:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 10h18M9 10v10M15 10v10"/></svg>',
  dotSm:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M18 14l.9 2.6L21.5 17.5l-2.6.9L18 21l-.9-2.6L14.5 17.5l2.6-.9z"/></svg>',
};
const WARDS=['Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Comfort Room','Lobby','Treatment Area','Surgery','Wards','Isolation','Internal Medicine','ICU'];
let sbTx=true, sbBoard='IP Board';
const SB_IND={}, SB_CNT={};
/* after each render: the raised pill slides to the selected segment, and a count that changed rolls (old number out, new in) */
function sbAfter(){ const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* the now line starts under the column header, so its dot sits at the top of the first row instead of hiding behind the sticky header */
  const nl=document.querySelector('#ctab-dash .sb-nowline'), hd=document.querySelector('#ctab-dash .sb-head'); if(nl&&hd) nl.style.top=hd.offsetHeight+'px';
  ['sbBoards','sbView'].forEach(id=>{ const sg=document.getElementById(id); if(!sg) return; const ind=sg.querySelector('.sb-ind'), on=sg.querySelector('.sb-segb.on'); if(!ind||!on) return;
    const x=on.offsetLeft, w=on.offsetWidth, first=!SB_IND[id]; SB_IND[id]={x,w};
    if(first){ ind.style.transition='none'; ind.style.width=w+'px'; ind.style.transform='translateX('+x+'px)'; void ind.offsetWidth; ind.style.transition=''; }
    else requestAnimationFrame(()=>{ ind.style.width=w+'px'; ind.style.transform='translateX('+x+'px)'; }); });
  document.querySelectorAll('#sbBoards .sb-segb').forEach(b=>{ const c=b.querySelector('.sb-cnt'), k=b.dataset.board; if(!c) return; const n=+c.dataset.n, old=SB_CNT[k]; SB_CNT[k]=n;
    if(old==null||old===n||reduce) return; const up=n>old, o=document.createElement('i'); o.className='out'; o.textContent=old; c.appendChild(o);
    const nw=c.querySelector('i:not(.out)'); nw.style.transition='none'; nw.style.transform='translateY('+(up?'100%':'-100%')+')'; nw.style.opacity='0'; void nw.offsetWidth; nw.style.transition='';
    requestAnimationFrame(()=>{ o.style.transform='translateY('+(up?'-100%':'100%')+')'; o.style.opacity='0'; nw.style.transform=''; nw.style.opacity=''; });
    setTimeout(()=>o.remove(),520);
    if(up&&k!==sbBoard&&performance.now()>5000){   /* not while the boards first fill in */ b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); setTimeout(()=>b.classList.remove('pulse'),1700); } }); }
/* hover a toolbar control for its name and shortcut, like a Mac menu */
(function(){ let tip=null, t=null;
  document.addEventListener('mouseover',e=>{ const el=e.target.closest&&e.target.closest('.sb-toolbar [data-tip]'); clearTimeout(t);
    if(!el){ if(tip) tip.classList.remove('show'); return; }
    t=setTimeout(()=>{ if(!tip){ tip=document.createElement('div'); tip.className='sb-tip'; tip.setAttribute('role','tooltip'); document.body.appendChild(tip); }
      tip.innerHTML=el.dataset.tip+(el.dataset.key?`<kbd>${el.dataset.key}</kbd>`:''); const r=el.getBoundingClientRect();
      tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.left+r.width/2-tip.offsetWidth/2))+'px'; tip.style.top=(r.bottom+8)+'px'; tip.classList.add('show'); },550); });
  document.addEventListener('mousedown',()=>{ clearTimeout(t); if(tip) tip.classList.remove('show'); }); })();
function sbHas(v){ v=String(v==null?'':v).trim(); return !!v&&v!=='—'&&v!=='-'; }
function lsPill(ls){if(!ls)return '';const m={ALS:'ls-als',BLS:'ls-bls',DNR:'ls-dnr'}[ls]||'ls-als';return `<span class="ls-pill ${m}">${IC.heart}${ls}</span>`;}
let SB_MORPH=false;
/* List ↔ Hours: the patients stay put; the hour blocks slide in one column after another, or fade out to the right before the list returns */
function toggleSbTx(){ const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, sb=document.querySelector('#ctab-dash .sb');
  const done=()=>{ renderDash(); if(window.tsEmit)tsEmit('board.view'); };
  if(sbTx&&sb&&!reduce&&!sb.classList.contains('sb-hours-out')){ sb.querySelectorAll('#sbView .sb-segb').forEach((b,i)=>{ b.classList.toggle('on',i===0); b.setAttribute('aria-checked',i===0); }); sbAfter();
    sb.classList.add('sb-hours-out'); setTimeout(()=>{ sbTx=false; done(); },210); return; }
  if(sbTx&&sb&&sb.classList.contains('sb-hours-out')) return;
  sbTx=!sbTx; SB_MORPH=sbTx&&!reduce; done(); }
function setSbBoard(b){sbBoard=b;renderDash();if(window.tsEmit)tsEmit('board.view');}
function openSbFilters(ev){ev.stopPropagation();if(window.tsSbFilters){tsSbFilters(ev.currentTarget);return;}   /* workflow filters (store/workflow.js) */
  const rows=[['Tx Status',IC.dotSm],['Doctor',IC.person],['Ward',IC.home],['Service',IC.gear],['Workflow',IC.flow],['Location',IC.cage]];
  _openPop(ev.currentTarget,`<div class="sb-filter-pop" style="width:236px;padding:6px 10px">${rows.map(([l,ic])=>`<div class="fp-row"><span class="fp-lab">${ic}${l}</span><span class="fp-add" onclick="toast('Add filter: ${l}')">+ Add</span></div>`).join('')}<button class="fp-clear" onclick="_closePop();toast('Filters cleared')">Clear Filters</button></div>`);
}
function renderDash(){
  const hours=[];for(let h=6;h<=20;h++)hours.push(h);
  const hlabel=h=>{const ap=h<12?'A':'P',hh=h%12||12;return hh+ap;};
  const NOWH=Math.min(20,Math.max(6,new Date().getHours())), LEFTW=900, HW=46;   /* LEFTW = the left columns' widths (suite.css: 280+120+140+160+200) */
  const LIVE=(sbBoard==='IP Board'||sbBoard==='OP Board'||sbBoard==='My Board')&&typeof tsBoardList==='function', IPL=LIVE?tsBoardList(sbBoard):null, OPB=sbBoard==='OP Board';
  const list=IPL||[];
  const empty=!list.length;
  const boards=['My Board','OP Board','IP Board','Boarding'], FN=(window.tsWfCount&&tsWfCount())||0;
  /* toolbar: title · boards (with counts) · List | Hours · Filters. The raised pill glides between segments (sbInd, after render). */
  const CNT=(window.tsBoardCounts&&tsBoardCounts())||{}, BLAB={'My Board':'My Patients','OP Board':'Outpatients','IP Board':'Inpatients','Boarding':'Boarding'};
  const seg=(id,items)=>`<div class="sb-seg" id="${id}" role="${id==='sbBoards'?'tablist':'radiogroup'}"><span class="sb-ind" aria-hidden="true" style="width:${(SB_IND[id]||{}).w||0}px;transform:translateX(${(SB_IND[id]||{}).x||0}px)"></span>${items}</div>`;
  const toolbar=`<div class="sb-toolbar">
    <div class="sb-title"><h2>Status Board</h2></div>
    ${seg('sbBoards',boards.map((t,k)=>{const on=t===sbBoard, n=CNT[t];return `<button type="button" class="sb-segb${on?' on':''}${n===0?' dim':''}" role="tab" aria-selected="${on}" data-board="${t}" data-tip="${BLAB[t]}" data-key="${k+1}" onclick="setSbBoard('${t}')">${BLAB[t]}${n!=null?`<span class="sb-cnt" data-n="${n}"><i>${n}</i></span>`:''}</button>`;}).join(''))}
    <div class="sb-tool-r">
      ${window.tsFindChip?tsFindChip():''}${window.tsWfChip?tsWfChip():''}
      ${seg('sbView',[['list','List',IC.list,!sbTx],['hours','Hours',IC.hours,sbTx]].map(([k,l,ic,on])=>`<button type="button" class="sb-segb${on?' on':''}" role="radio" aria-checked="${on}" data-tip="${l}" data-key="H" onclick="${on?'':'toggleSbTx()'}">${ic}${l}</button>`).join(''))}
      <button type="button" class="sb-filters${FN?' on':''}" data-tip="Filters" onclick="openSbFilters(event)">${IC.filter}Filters<span class="sb-fb">${FN||''}</span></button>
    </div></div>`;
  // header row — Title Case column names; click one to sort (store/boardview.js remembers it per person)
  const SORT=(window.tsSbSortState&&tsSbSortState())||null;
  const COLS=[['nm','Patient','c-pt'],['ward','Ward','c-ward'],['stay','Stay','c-io'],['team','Care Team','c-team'],['al','Alerts','c-alerts']];
  let head=`<div class="sb-row sb-head"><div class="sb-left">${COLS.map(([k,l,c])=>{const on=SORT&&SORT.k===k;
    return `<div class="sbc ${c}">${window.tsSbSort?`<button type="button" class="sb-sorth${on?' on'+(SORT.d<0?' desc':''):''}" onclick="tsSbSort('${k}')" aria-sort="${on?(SORT.d>0?'ascending':'descending'):'none'}">${l}${IC.chev}</button>`:l}</div>`;}).join('')}</div>`;
  head+= sbTx ? `<div class="sb-hours">${hours.map(h=>`<div class="sb-hcell${h===NOWH?' now':''}">${hlabel(h)}</div>`).join('')}</div>` : '';
  if(sbTx&&!empty) head+=`<span class="sb-nowdot" aria-hidden="true" style="left:${LEFTW+(NOWH-6)*HW+HW/2}px"></span>`;   /* the dot rides on the sticky header, where the now line begins */
  head+=`</div>`;
  const gtitle=sbBoard==='My Board'?'My Patients':OPB?'Outpatients':'Inpatients';
  const group=`<div class="sb-group"><h3>${gtitle}</h3><span class="sb-gn">${list.length}</span>${(window.tsBoardPills&&tsBoardPills())||''}</div>`;
  let rows='';
  list.forEach((p,i)=>{
    const stay=p.stay?`<div class="sbc c-io sb-stay" title="${p.stay.tip}"><div class="io-day">${p.stay.day}</div>${p.stay.pct!=null?`<div class="sb-dtrack" aria-hidden="true"><i style="width:${(p.stay.pct*100).toFixed(1)}%"></i></div>`:''}<div class="io-time">${p.stay.since}</div></div>`
      :`<div class="sbc c-io"><div class="io-date">${p.date}</div><div class="io-time">${p.time}</div></div>`;
    const left=`<div class="sb-left">
      <div class="sbc c-pt"><div class="pt-top">${p.pinned?IC.pin:''}${IC.dots}<span class="pt-nm">${p.name}</span></div>
        <div class="pt-sig2">${p.sig}</div>
        <div class="pt-cage-line">${lsPill(p.ls)||'<span class="sb-nocode" title="No code status yet — set CPR or DNR in Flow">No code set</span>'}${IC.vit}</div>
        ${p.reason&&p.reason!=='—'?`<div class="pt-reason">${p.reason}</div>`:''}</div>
      <div class="sbc c-ward">${(window.tsWardSel&&tsWardSel(p))||`<select class="ward-sel" onchange="toast('${p.name.split(' ')[0]} → '+this.value)">${WARDS.map(w=>`<option ${w===p.ward?'selected':''}>${w}</option>`).join('')}</select>`}</div>
      ${stay}
      ${window.tsTeamCell?tsTeamCell(p):`<div class="sbc c-team"><span class="dr-box">${p.dr}</span>${p.techHTML||''}</div>`}
      ${window.tsAlertCell?tsAlertCell(p,i):`<div class="sbc c-alerts aa-cell" onclick="event.stopPropagation();openPatient(${i})" title="Alert Assist">${p.alerts.length?p.alerts.map(a=>`<div class="al-row ${a.t}">${IC.tri}${a.x}</div>`).join(''):'<span class="al-empty">— Add alert</span>'}<div class="aa-cell-hint">${IC.spark}Alert Assist</div></div>`}
    </div>`;
    const right = sbTx
      ? `<div class="sb-hours">${hours.map(h=>{const b=p.blocks.find(x=>x.h===h);return `<div class="sb-hcell">${b?(window.tsBlkHTML?tsBlkHTML(b,p):`<div class="sb-blk ${b.status}">${b.label}</div>`):''}</div>`;}).join('')}</div>`
      : '';
    const sel=window.tsBoardSel?tsBoardSel(p):p.cur;
    rows+=`<div class="sb-row${sel?' sel':''}" data-id="${p._id||''}" onclick="${window.tsBoardClick?`tsBoardClick(${i},event)`:`openPatient(${i})`}" ondblclick="openPatient(${i})">${left}${right}</div>`;
  });
  if(empty) rows=sbBoard==='My Board'?`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No patients assigned to you yet. In Flow, open a patient and choose a <b>Technician</b>, or use the <b>+</b> in the Tech column on the IP or OP Board.</div>`:OPB?`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No outpatients in Treatment. Move a patient to Treatment in Flow and their sheet appears here.</div>`:IPL?`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No admitted patients yet. Admit a patient in Flow, or <a href="#" onclick="event.preventDefault();tsNewSheet()" style="color:var(--accent-ink);font-weight:600">start a new sheet</a>.</div>`:`<div style="padding:60px 20px;text-align:center;color:var(--ink-400);font-size:13.5px">No patients on the ${sbBoard}.</div>`;
  const nowline = (sbTx&&!empty)?`<div class="sb-nowline" style="left:${LEFTW+(NOWH-6)*HW+HW/2}px"></div>`:'';
  const keys = (!sbTx&&!empty&&window.tsBoardClick)?`<div class="sb-keys"><span><kbd>↑</kbd><kbd>↓</kbd>move</span><span><kbd>space</kbd>Quick Look</span><span><kbd>return</kbd>open sheet</span><span><kbd>esc</kbd>close</span><span>Click a row to peek · double-click to open</span></div>`:'';
  const legend = sbTx?`<div class="sb-legend"><div class="li"><span class="dot sb-lg overdue"></span>Overdue</div><div class="li"><span class="dot sb-lg due"></span>Due</div><div class="li"><span class="dot sb-lg scheduled"></span>Scheduled</div><div class="li"><span class="sb-lg-done">2</span>Done</div></div>`:'';
  tsMorphHTML($('#ctab-dash'),`<div class="sb${sbTx?'':' sb-list'}${SB_MORPH?' sb-hours-in':''}">${toolbar}${(window.tsLoadStrip&&tsLoadStrip())||''}<div class="sb-card">${group}<div class="sb-scroll"><div class="sb-inner">${head}${rows}${nowline}</div></div>${legend}${keys}</div></div>`);
  sbAfter(); if(SB_MORPH){ SB_MORPH=false; setTimeout(()=>{ const sb=document.querySelector('#ctab-dash .sb'); if(sb) sb.classList.remove('sb-hours-in'); },900); }
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
      <div class="order-search-wrapper"><div class="qadd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="tsSearch" placeholder="Add an order or order set…" autocomplete="off" onfocus="openTsDrop()" oninput="tsRender(this.value)" onkeydown="tsKey(event)"></div><div class="order-search-dropdown" id="tsDrop" style="display:none"></div></div>${window.tsSetsBtn?tsSetsBtn():''}
      <div class="day-nav ts-daynav">${window.tsDayNavHTML?tsDayNavHTML():'<button class="today">Today</button>'}</div>
      <div class="spacer" style="flex:1"></div>
      <span id="tsDrafts" class="ts-seen-slot"></span><span id="tsSeen" class="ts-seen-slot"></span><span id="tsView" class="ts-view-slot"></span>
      <button class="btn ghost" style="flex:0 0 auto;width:auto;height:38px;padding:0 14px" onclick="selectCTab('timeline')">Audit</button>
      
    </div>
    <nav class="ts-secnav" id="tsSecNav" aria-label="Sections"></nav>
    <div class="treatment-grid-shell" id="sheetScroll"><div class="sheet-inner" id="sheetInner"></div></div>
    <div class="treatment-legend" id="legend"></div>
  </main>`;
  $('#ctab-sheet').innerHTML=patientCmdHTML()+`<section class="clinical-workspace">${sidebarBriefHTML()}${grid}</section>`;
  buildGrid();
}
/* ═══ GRID (the Vitals tab is store/vitals.js) ═══
   One visual system for every task (Oct 2026 "clear grid"): each state has its own colour AND its own shape, and the legend is drawn
   from the same definitions, so the two can never disagree.
     Scheduled  ring, quiet          Due now  filled teal tile + dot     Overdue  filled amber tile + clock
     Done       soft tile + ✓ (or the value charted)                  Omitted  soft grey tile + ⊘ (a reason was recorded)
   Oct 2026 simplification: no minutes label on the marks (":30") and no per-row overdue badge — the tiles and the section counts carry it. */
const MK_CHECK='<svg class="mk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
const MK_CLOCK='<svg class="mk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
const MK_OMIT='<svg class="mk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>';
function mkOd(late){return `<span class="od"><svg class="od-ic" viewBox="0 0 24 24" aria-hidden="true"><circle class="od-face" cx="12" cy="12" r="7.6"/><path class="od-h" d="M12 12V7.6"/><path class="od-m" d="M12 12l3.4 2.2"/></svg>${late?`<span class="od-late">${late}</span>`:''}</span>`;}
function mkLate(t){const d=Math.max(0,Math.round(nowMin()-t.sched));return d<60?d+'m':d<1440?Math.floor(d/60)+'h':Math.floor(d/1440)+'d';}
const MK_STATES={   /* the single source for cells and legend */
  scheduled:{word:'Scheduled',glyph:'<i class="mk-ring" aria-hidden="true"></i>'},
  due:{word:'Due now',glyph:'<i class="mk-rim" aria-hidden="true"></i>'},   /* the solid teal pill is its own shape: no dot · mk-rim = the hover light that runs once around it */
  overdue:{word:'Overdue',glyph:mkOd('')},   /* a filled orange clock; on hover it opens to say how late ("4h") while the minute hand turns once */
  completed:{word:'Done',glyph:MK_CHECK},
  skipped:{word:'Omitted',glyph:MK_OMIT}};
/* completion: the cell plays pill → circle → the check draws itself → the reading takes its place (store/chart.js marks it via tsJust) */
const MK_DRAW='<svg class="da-ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 12.5l3.5 3.5 7.5-8"/></svg>';
const MK_BEAT=2800;   /* the due-now breath, ms — every pill shares one phase */
const MK_ORDER=['due','overdue','scheduled','completed','skipped'];
const GRID_LW=328;   /* the fixed left area: Order (216) + Latest (112) — base.js scrollToNow and store/move.js read it */
const MK_LINES='<svg class="mk-more" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h9"/></svg>';
let _mkCtx=null;
/* does a charted value fit its cell in full? (no fragments like "Ate 2…": a long entry shows ✓ + lines and opens in full on selection) */
function mkFits(txt){try{if(!_mkCtx){_mkCtx=document.createElement('canvas').getContext('2d');}const ff=getComputedStyle(document.body).fontFamily||'sans-serif';_mkCtx.font=`700 10px ${ff}`;return _mkCtx.measureText(String(txt)).width*0.985<=45;}catch(e){return String(txt).length<=6;}}
function gEsc(v){return String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
/* what sits inside a mark: the state's shape, the minutes when off the hour, or the value charted */
function markContent(t,s){const st=MK_STATES[s]||MK_STATES.scheduled;
  if(s==='completed'){const v=t&&t.value!=null&&t.value!==''?String(t.value):'';if(!v)return st.glyph;if(mkFits(v))return `<span class="mk-val">${gEsc(v)}</span>`;const ab=window.tsAbbr?tsAbbr(v):'';return ab?`<span class="mk-val">${gEsc(ab)}</span>`:st.glyph+MK_LINES;}
  return s==='overdue'&&t?mkOd(mkLate(t)):st.glyph;}
/* 12:06 PM with a small PM (numbers loud, the rest quiet — Oct 2026) */
function fmtTimeAP(min){const t=fmtTime(min).split(' ');return `${t[0]}<small class="ap">${t[1]}</small>`;}
function hourText(h){const L=hourLabel(h);return `${L.h} ${L.ap}M`;}
function gridNowX(){return GRID_LW+(nowMin()/60)*54;}
/* the Latest value rolls when it changes and its age fades (store/rowlook.js reads data-roll / data-roll-fade) */
function gridRollMark(h,id){return h?h.replace(/<span class="rt-v"><b>([^<]*)/,(m,v)=>`<span class="rt-v"><b data-roll="lat-${id}"${/^[<>~≤≥]?\d/.test(v)?' class="ts-num"':''}>${v}`).replace(/<small( class="[^"]*")?>/,(m,c)=>`<small${c||''} data-roll-fade="age-${id}">`):h;}
function buildGrid(){
  const inner=$('#sheetInner');if(!inner)return;if(window.tsGridBefore)tsGridBefore(inner);let html='';const nh=Math.floor(nowMin()/60);const past=document.body.classList.contains('ts-past-day');
  html+=`<div class="grow ghead"><div class="rl"><span class="gh-col gh-order">Order</span><span class="gh-col gh-latest">Latest</span></div><div class="hcells">`;
  for(let h=0;h<24;h++){html+=`<div class="hcell${h===nh&&!past?' hour-now':''}${h%3===0?' q3':''}${h===7||h===19?' shift':''}" onclick="tsBatch(${h})" title="Chart everything at ${hourText(h)}"><span class="hl">${hourText(h)}</span></div>`;}
  if(!past)html+=`<div class="now-chip" style="left:${(nowMin()/60)*54}px">Now <b>${fmtTimeAP(nowMin())}</b></div>`;
  html+=`</div></div>`;
  /* stopped today and one-time treatments that are all done move to their own section at the bottom (Oct 2026, like a
     "Discontinued / Completed" list): stopped orders keep what was charted, read only (store/orders.js tsStoppedToday) */
  const GHOST=window.tsStoppedToday?tsStoppedToday():{orders:[],tasks:[]};
  const doneOnce=past?[]:ORDERS.filter(o=>!o.dc&&!o.cont&&/^once$/i.test(String(o.freq||''))&&(()=>{const T=TASKS.filter(x=>x.orderId===o.id);return T.length&&T.every(x=>x.status);})());
  const rowsOf=(sec,so,fold)=>{
    so.forEach((o,ri)=>{const TK=o._ghost?GHOST.tasks:TASKS;
      /* every overdue task of the row, counted once on the row; each one still sits at its own time in the grid */
      const late=(!past&&!o.cont)?TK.filter(x=>x.orderId===o.id&&!x.status&&deriveStatus(x)==='overdue'):[];
      const mchip='';   /* Oct 2026: no per-row overdue badge — the tiles and the section count say it once */
      html+=`<div class="grow${ri%2?' zb':''}${o.dc?' is-dc':''}${o.draft?' is-draft':''}${o.pin?' is-pin':''}${late.length?' has-late':''}${fold}" data-sec="${sec.key}" data-o="${o.id}"${late.length?` data-late="${late.map(x=>Math.round(x.sched)).join(',')}"`:''}><div class="rl" data-dc="${o.dc&&!o._ghost?(o.dc_reason==='error'?'Error':o.dc_reason==='rejected'?'Not approved':'Stopped'):''}" onclick="tsOrderPanel('${o.id}')" title="Order details">${window.tsRowLead?tsRowLead(o):''}${late.length?`<button type="button" class="rl-off" hidden onclick="event.stopPropagation();tsOffGo('${o.id}')"></button>`:''}`;   /* draft badge · pin · reorder grip (store/drafts.js, store/sortorder.js) */
      /* Order column: name, then dose · route · frequency (or frequency · unit) and the overdue count. Latest column: the newest value and its age */
      let latest='';
      /* Oct 2026: brand after the name in grey (no "·"), the dose is the one bold part of the line, a dot after the name when the order has instructions (store/rowlook.js) */
      const nm=(n)=>{const ins=window.tsInsAttr?tsInsAttr(o):['',''];return `<div class="rl-name"${ins[0]}>${n}${ins[1]}</div>`;};
      if(o.type==='med'){const d=medDose(o);html+=`<div class="rl-main">${nm(o.name+((window.tsBrand&&tsBrand(o.name))?'<span class="rl-brand"> '+tsBrand(o.name)+'</span>':''))}<div class="rl-meta"><b>${d.mg}</b>${o.conc?' · '+d.volume:''} · ${o.route} · ${o.freq}${mchip}</div></div>`;latest=window.tsMedLatest?tsMedLatest(o):'';}   /* last dose given (store/medsafe.js) */
      else if(o.type==='fluid'){html+=`<div class="rl-main">${nm(window.tsInfName?tsInfName(o):o.name)}<div class="rl-meta">${window.tsInfMeta?tsInfMeta(o):o.rate} · ${o.kind==='cri'?'CRI':'IV'}</div></div>`;latest=window.tsInfLatest?tsInfLatest(o):'';}   /* given today · last line check (store/fluids.js) */
      else if(o.type==='obs'||o.type==='diag'){html+=`<div class="rl-main">${nm(o.name)}<div class="rl-meta">${o.freq}${o.unit?' · '+o.unit:''}${mchip}</div></div>`;latest=window.tsRowTrend?tsRowTrend(o):'';}   /* the latest reading and how old it is (store/vitals.js) */
      else{html+=`<div class="rl-main">${nm(o.name)}<div class="rl-meta">${o.freq}${mchip}</div></div>`;latest=window.tsCareLatest?tsCareLatest(o):'';}
      /* stopped: a quiet "Stopped" capsule, then when and by whom ("10 AM · Dr. Schiff") — the row is dimmed, never struck through */
      if(o.dc&&o.dc_at){const at=new Date(o.dc_at),mn=at.getHours()*60+at.getMinutes(),w=o.dc_reason==='error'?'Error':o.dc_reason==='rejected'?'Not approved':'Stopped',who=window.tsDrShort?tsDrShort(o.dc_by_name||o.dc_by||''):'';latest=`<span class="rl-trend rl-stop" title="${gEsc((o.dc_reason==='error'?'Entered in error':w)+(o.dc_by_name?' by '+o.dc_by_name:'')+' · '+fmtTime(mn))}"><span class="rt-v"><span class="rl-cap">${w}</span></span><small>${window.tsClockShort?tsClockShort(mn):fmtTime(mn)}${who?' · '+gEsc(who):''}</small></span>`;}
      html+=`<div class="rl-latest">${gridRollMark(latest,o.id)||'<span class="rl-none" aria-label="Nothing yet">—</span>'}</div>`;
      html+=`</div><div class="hcells">`;
      if(o.cont&&o.kind&&window.tsInfCells){html+=tsInfCells(o);}else if(o.cont){const nowH=nowMin()/60;for(let h=0;h<24;h++){let cls=h<o.start?'off':(h<=nowH?'on':'future');let lbl=h===o.start?String(o.rate||'').replace(' mL/hr',''):'';html+=`<div class="cell inf"><div class="inf-fill ${cls}" onclick="openInfusion('${o.id}',${h})">${lbl}</div></div>`;}}
      else{for(let h=0;h<24;h++){const cc='cell'+(past?'':(h<nh?' past':h===nh?' now':''))+(h%3===0?' q3':'')+(h===7||h===19?' shift':'');const _c=TK.filter(x=>x.orderId===o.id&&Math.floor(x.sched/60)===h);const t=_c.find(x=>x.status)||_c.find(x=>x.sched===h*60)||_c[0];if(!t){html+=`<div class="${cc}"></div>`;continue;}
        const s=deriveStatus(t),mv=t.movedFrom!=null,abn=s==='completed'&&t.severity?(t.severity>=2?' abn sev':' abn'):'',off=Math.round(t.sched)%60?' off':'';
        const word=((MK_STATES[s]||{}).word||s)+(s==='overdue'?` (${mkLate(t).replace('m',' min').replace('h',' h').replace('d',' d')} late)`:''),extra=_c.length>1?` · ${_c.length} tasks this hour`:'';
        const just=s==='completed'&&window.tsJust?tsJust(t.id):null;
        let inner=markContent(t,s);
        if(just){const hv=t.value!=null&&t.value!=='';inner=`<span class="da${hv?' val':''}${just.od?' da-late':''}" style="--da-d:${just.d}ms"><span class="disc"></span>${MK_DRAW}${hv?`<span class="v">${inner}</span>`:''}</span>`;}
        const beat=s==='due'?` style="animation-delay:-${Date.now()%MK_BEAT}ms"`:'';
        const l2=s==='overdue'&&nowMin()-t.sched>120?' late2':'';   /* more than 2 h late: the stronger tile (Oct 2026 grid tiles) */
        html+=`<div class="${cc}"><button type="button" class="mark ${s}${l2}${abn}${off}${mv?' moved':''}${just?' just':''}" ${o._ghost?'data-g':'data-t'}="${t.id}" data-s="${s}"${beat} onclick="${o._ghost?`tsOrderPanel('${o.id}')`:`openCompletion('${t.id}')`}" title="${gEsc(o.name)} · ${fmtTime(t.sched)} · ${word}${s==='completed'&&t.value?' '+gEsc(t.value):''}${mv?' (moved from '+fmtTime(t.movedFrom)+')':''}${extra}" aria-label="${gEsc(o.name)}, ${fmtTime(t.sched)}, ${word}">${inner}</button></div>`;}}
      html+=`</div></div>`;});
  };
  SECTIONS.forEach(sec=>{const so=ORDERS.filter(o=>o.section===sec.key&&doneOnce.indexOf(o)<0);if(!so.length)return;
    /* the section band comes from the store (store/sections.js: fold, hour summary, chart the hour, add to section) when it is loaded */
    html+=window.tsSecBand?tsSecBand(sec,so):`<div class="grow"><div class="gsection"><svg class="sicon" viewBox="0 0 24 24" fill="none"><path d="${sec.icon}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="stitle">${sec.key}</span><span class="scount">${so.length}</span>${sec.key==='Continuous Infusions'&&window.tsInfTotal?tsInfTotal():''}</div></div>`;
    const fold=window.tsSecFolded&&tsSecFolded(sec.key)?' sec-folded':'';
    rowsOf(sec,so,fold);
  });
  {const stop=GHOST.orders.concat(doneOnce);if(stop.length){const sec={key:'Stopped & completed',icon:'M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'};
    html+=window.tsSecBand?tsSecBand(sec,stop):'';const fold=window.tsSecFolded&&tsSecFolded(sec.key)?' sec-folded':'';rowsOf(sec,stop,fold);}}
  {const old=inner.querySelector('.nowline');if(old)old.remove();}
  tsMorphHTML(inner,html);
  if(window.tsGridAfter)tsGridAfter(inner);   /* rows that open, glide or fold (store/rowlook.js) */
  if(!past){const nl=document.createElement('div');nl.className='nowline';nl.style.left=`${gridNowX()}px`;inner.appendChild(nl);}
  renderLegend();
  gridOffWire();gridOffPaint();
  if(window.tsBadgeMotion)tsBadgeMotion(); if(window.tsInfMotion)tsInfMotion();   /* the overdue badge rolls / pops / leaves when its count changes (store/missed.js) */
  if(window.tsSecNavPaint)tsSecNavPaint();
}
/* overdue tasks scrolled out of view to the left: a "‹ 2 earlier" chip at the start of the row's visible hours (select it to scroll back) */
function gridOffWire(){const sc=$('#sheetScroll');if(!sc||sc._offWired)return;sc._offWired=1;let raf=0;sc.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;gridOffPaint();if(window.tsSecNavSpy)tsSecNavSpy();});},{passive:true});}
function gridOffPaint(){const sc=$('#sheetScroll');if(!sc)return;const x=sc.scrollLeft;
  $$('#sheetInner .grow[data-late]').forEach(r=>{const b=r.querySelector('.rl-off');if(!b)return;const hid=r.dataset.late.split(',').map(Number).filter(m=>(Math.floor(m/60)+1)*54<=x+6);
    if(hid.length){const t=`‹ ${hid.length} earlier`;if(b.textContent!==t)b.textContent=t;b.title=`${hid.length} overdue earlier today, out of view — select to scroll back`;b.setAttribute('aria-label',b.title);b.hidden=false;}else b.hidden=true;});}
window.tsOffGo=function(id){const r=document.querySelector(`#sheetInner .grow[data-o="${id}"]`),sc=$('#sheetScroll');if(!r||!sc)return;const m=Math.min(...r.dataset.late.split(',').map(Number));sc.scrollTo({left:Math.max(0,Math.floor(m/60)*54-54),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});};
/* 8A · 2:30P — short time, used in titles */
/* the column already names the hour, so a mark only shows minutes when the task is off the hour (":30") */
function gridMin(min){const m=Math.round(min)%60;return m?':'+String(m).padStart(2,'0'):'';}
function gridTime(min){min=Math.round(min);const h=Math.floor(min/60)%24,m=min%60,L=hourLabel(h);return L.h+(m?':'+String(m).padStart(2,'0'):'')+L.ap;}
function renderLegend(){   /* drawn from MK_STATES, the same shapes the grid uses */
  tsSetHTML($('#legend'),MK_ORDER.map(s=>`<div class="li"><span class="lg-mk mark ${s}" aria-hidden="true">${MK_STATES[s].glyph}</span>${MK_STATES[s].word}</div>`+(s==='overdue'?`<div class="li"><span class="lg-mk mark overdue late2" aria-hidden="true">${MK_STATES[s].glyph}</span>Over 2 h late</div>`:'')).join('')
    +`<div class="lg-sep" aria-hidden="true"></div><div class="li lg-key"><span class="lg-glyph">${MK_LINES}</span>More in the entry</div>`
    +`<div class="li lg-key"><span class="lg-glyph lg-arr">↑↓</span>Latest vs the previous reading</div>`
    +`<div style="flex:1"></div>${window.tsOcLegendActs?tsOcLegendActs():'<div class="li lg-hint">Select a cell to chart or see the full entry</div>'}`);}
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
function tick(){if(currentCTab==='sheet'){const nl=$('#sheetInner .nowline');if(nl)nl.style.left=`${gridNowX()}px`;const c=$('#sheetInner .now-chip');if(c){c.style.left=`${(nowMin()/60)*54}px`;const b=c.querySelector('b');if(b){const t=fmtTimeAP(nowMin());if(b.innerHTML!==t)b.innerHTML=t;}}}}
setInterval(tick,10000);

/* ═══ init ═══ */
selectCTab('dash');
