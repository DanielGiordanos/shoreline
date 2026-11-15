/* n333: on Ultrasound's page */



let usRole='im';
function usCanEdit(){ return usRole==='im'; }

var ADMIN_EMAILS=['daniel.giordano@pravix.app'];
var IS_ADMIN=false;
function isAdminUser(email){ return !!email && ADMIN_EMAILS.indexOf(String(email).toLowerCase())>-1; }

function usEmailIsIM(email){ if(!email) return false; email=String(email).toLowerCase();
try{ return Object.keys(IM_CONTACT).some(function(k){ return (IM_CONTACT[k].email||'').toLowerCase()===email; }); }catch(e){ return false; } }
function usApplyRoleForUser(user){ try{ IS_ADMIN = isAdminUser(user && user.email);
var im = IS_ADMIN || (user && usEmailIsIM(user.email)); usRole = im ?'im':'view';
var rt=document.getElementById('usxRole');
if(rt){ rt.style.display = im ?'':'none'; rt.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x.dataset.role===usRole); }); }
}catch(e){ usRole='view'; } }
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
function usEff(p){
const u=p&&p.ultrasound; if(!u) return null;
if(u.requestStatus) return u.requestStatus;
return (u.status==='requested') ?'ready':'incomplete';
}
function usActiveCases(){ return PATIENTS.filter(p=>p.ultrasound && usOpenCase(p)); }
/* the case's own status decides (admitting the patient doesn't end the request); it ends when the scan is completed or the patient leaves */
function usOpenCase(p){ const st=usEff(p); if(!st||st==='completed') return false; if(isActive(p)) return true; if(p.status!=='Admitted') return false;
  if(p.rounds) return !p.rounds.outcome;   /* on Rounds: while the admission is open */
  const t=p.completedAt?new Date(p.completedAt).getTime():0; return !!t&&Date.now()-t<48*3600e3; }   /* not on Rounds: 48 h after admission */
function usQueue(){
return usActiveCases().filter(p=>['ready','next','accepted'].includes(usEff(p))).sort((a,b)=>{
const qa=a.ultrasound.queuePosition, qb=b.ultrasound.queuePosition;
const na=(typeof qa==='number'), nb=(typeof qb==='number');
if(na&&nb) return qa-qb;
if(na) return -1; if(nb) return 1;
return (a.ultrasound.requestedAt||a.ultrasound.createdAt||0)-(b.ultrasound.requestedAt||b.ultrasound.createdAt||0);
});
}
/* n333: on Ultrasound's page */
function usQueuePos(p){ const i=usQueue().findIndex(x=>x.id===p.id); return i<0?null:i+1; }
function usNextQueuePos(){ return usQueue().length+1; }
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
function usTimeline(p,label,meta){ try{ (p.timeline=p.timeline||[]).push({label:label, at:new Date(), meta:meta||''}); }catch(e){} }
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
let _usxForceComplete=null;
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
let _usxCase=null, _usxDrag=null;
/* n333: on Ultrasound's page */

/* n333: on Ultrasound's page */

/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */



/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */



function umsSpark(n){
const g='us'+n;
return`<div class="timeline-spark" aria-label="Ultrasound progress: Taken, Started, Now">
        <svg viewBox="0 0 760 108" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${g}Stroke" gradientUnits="userSpaceOnUse" x1="22" y1="0" x2="742" y2="0">
              <stop offset="0" stop-color="#22C3E6"/>
              <stop offset=".52" stop-color="#5B8DEF"/>
              <stop offset="1" stop-color="#24C1EE"/>
            </linearGradient>
            <linearGradient id="${g}Fill" gradientUnits="userSpaceOnUse" x1="0" y1="32" x2="0" y2="108">
              <stop offset="0" stop-color="#5B8DEF" stop-opacity=".18"/>
              <stop offset=".22" stop-color="#5B8DEF" stop-opacity=".11"/>
              <stop offset=".52" stop-color="#6B75EC" stop-opacity=".055"/>
              <stop offset=".76" stop-color="#24C1EE" stop-opacity=".022"/>
              <stop offset="1" stop-color="#22C3E6" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="${g}EdgeMask" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="760" y2="0">
              <stop offset="0" stop-color="white" stop-opacity="0"/>
              <stop offset=".06" stop-color="white" stop-opacity=".72"/>
              <stop offset=".18" stop-color="white"/>
              <stop offset=".82" stop-color="white"/>
              <stop offset=".94" stop-color="white" stop-opacity=".72"/>
              <stop offset="1" stop-color="white" stop-opacity="0"/>
            </linearGradient>
            <mask id="${g}AreaMask">
              <rect x="0" y="0" width="760" height="108" fill="url(#${g}EdgeMask)"/>
            </mask>
            <linearGradient id="${g}SweepGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#fff" stop-opacity="0"/>
              <stop offset=".5" stop-color="#fff" stop-opacity=".9"/>
              <stop offset="1" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path class="us-spark-area" d="M8 32 H752 V108 H8 Z" fill="url(#${g}Fill)" mask="url(#${g}AreaMask)"/>
          <path class="us-spark-glow" d="M8 32 H752" stroke="url(#${g}Stroke)" stroke-width="6" stroke-linecap="round"/>
          <path class="us-spark-line" d="M8 32 H752" stroke="url(#${g}Stroke)" stroke-width="2.5" stroke-linecap="round"/>
          <rect class="us-sweep" x="-120" y="27" width="105" height="10" rx="5" fill="url(#${g}SweepGradient)" filter="blur(2px)"/>
          <circle class="stage-dot-ring taken-ring" cx="8" cy="32" r="7" fill="#22C3E6"/>
          <circle class="stage-dot taken-core" cx="8" cy="32" r="4.4" fill="#ffffff" stroke="#22C3E6" stroke-width="2.2"/>
          <circle class="stage-dot-ring started-ring" cx="380" cy="32" r="7.5" fill="#5B8DEF"/>
          <circle class="stage-dot started-core" cx="380" cy="32" r="4.4" fill="#ffffff" stroke="#5B8DEF" stroke-width="2.2"/>
          <circle class="us-spark-halo" cx="752" cy="32" r="8.5" fill="#24C1EE"/>
          <circle class="us-spark-dot" cx="752" cy="32" r="5.1" fill="#ffffff" stroke="#24C1EE" stroke-width="2.5"/>
        </svg>
      </div>`;
}
 
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */

/* ── NEEDS INFORMATION — collapses to a positive status card when clear ── */
/* n333: on Ultrasound's page */

/* ── AVERAGE WAIT — live average across the current queue ── */
/* ── AVG WAIT — pravix_avg_wait_card.html, wired to the live queue ───────────
   The card's markup, styling and its two animations are that file's code. Every
   figure here comes from usQueue() — the same list that draws the queue rows —
   so the two can never disagree. The prototype's LIVE badge is deliberately not
   carried over; Currently Scanning owns that indicator.                      */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* the prototype's soft number swap, taking the already-formatted string this app
   uses (fmtWait reads "1h 5m" past the hour) instead of a raw minute count */
function updateAvgWait(valueEl,text){
  if(!valueEl || valueEl.textContent===text) return;
  valueEl.classList.add('is-updating');
  setTimeout(function(){
    valueEl.textContent=text;
    requestAnimationFrame(function(){ valueEl.classList.remove('is-updating'); });
  },140);
}
/* n333: on Ultrasound's page */

/* ── INTERNAL MEDICINE team ── */
/* Internal Medicine roster, built on the Directory's employee card: ringed
   avatar with a presence dot, name / title / department badge, a contact row and
   an actions row. Copy, Fav, Email and Call are dropped — the numbers stay
   readable in the contact row, and the only action this card owns is
   availability, so Set Unavailable is what sits in that slot. */
const UMT_IC_PHONE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 3.8h3l1.5 3.7-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 3.7 1.5v3a1.7 1.7 0 0 1-1.9 1.7A15.7 15.7 0 0 1 4.5 5.7 1.7 1.7 0 0 1 6.2 3.8Z"/></svg>';
/* n333: on Ultrasound's page */

/* ── QUEUE CONTROL utility ── */
/* n333: on Ultrasound's page */

/* ── QUEUE BOARD — the live Internal Medicine ultrasound command board.
   Structurally inspired by Flow's Client Display card system (scannable
   patient cards + a clear stage rail), but staff-facing: full clinical
   detail and IM controls. Reads the same shared ultrasound request data
   as every other Pravix surface — no separate objects per page. ── */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

/* Ultrasound workflow timeline: Requested → Accepted → Started → Completed.
   Horizontal, per pravix_ultrasound_queue_hybrid.html. The state reading is
   unchanged — every node still comes from the request's own timestamps and
   usEff(), so nothing about the workflow moves; only the presentation does. */
/* n333: on Ultrasound's page */

/* One board card. kind: 'wait' | 'scan' | 'info' */
/* n333: on Ultrasound's page */

/* Wire click-to-open + state actions on a rendered zone */
/* n333: on Ultrasound's page */

/* Grid-aware drop target: nearest card centre, before/after by pointer x */
/* n333: on Ultrasound's page */

/* n333: on Ultrasound's page */

/* ── IM presence — inferred Scanning + manual Available/Unavailable ── */
/* n333: on Ultrasound's page */

/* ── completed — compact rows with a Flags column ── */
/* n333: on Ultrasound's page */

 
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */


/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* openUsxCase · its layers, innermost first: 1 #30 before   (PVX-N387; kept true by flow_t387) */
function openUsxCase(pid){ return pvxRun('openUsxCase',openUsxCase$base,this,arguments); }
function openUsxCase$base(pid){
const p=PATIENTS.find(x=>x.id===pid); if(!p||!p.ultrasound) return;
try{ window.__pvxUsFrom=document.activeElement; window.__pvxUsPid=pid; }catch(e){}
(function(){ var d=document.getElementById('usxDrawer')||usxEnsureDrawer(); if(d&&!d.__pvxObs){ d.__pvxObs=new MutationObserver(function(){ if(!d.classList.contains('open')&&window.__pvxUsPid){ var id=window.__pvxUsPid; window.__pvxUsPid=null; setTimeout(function(){ pvxUsRefocus(id,'case'); },80); setTimeout(function(){ pvxUsRefocus(id,'case'); },450); } }); d.__pvxObs.observe(d,{attributes:true,attributeFilter:['class']}); } })();   /* PVX-N145 UR-05: however the workspace closes (Escape, scrim, ✕) */
_usxCase=pid; _usxForceComplete=null;
usxEnsureDrawer();
fillUsxCase();
document.getElementById('usxScrim').classList.add('open');
document.getElementById('usxDrawer').classList.add('open');
}
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
try{(function usxWireShell(){
const nf=document.getElementById('navFlow'), nu=document.getElementById('navUltrasound');
if(nf) nf.addEventListener('click',e=>{ e.preventDefault(); switchApp('flow'); });
/* n333: Ultrasound is its own page; its item is a plain link */
const nrNav=document.getElementById('navRounds');
/* n305: Rounds is its own page; its tab is a plain link */
const sw=document.getElementById('switcherUs');
if(sw) sw.addEventListener('click',e=>{ const b=e.target.closest('.seg'); if(b) switchUsView(b.dataset.usview); });
const el=document.getElementById('usxRole');
if(el) el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
usRole=b.dataset.role;
el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
renderUltrasound();
if(_usxCase) fillUsxCase();
}));
})();
}catch(__e){console.warn("[n333]",__e&&__e.message)}
