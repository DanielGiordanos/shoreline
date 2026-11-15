


/* openDrawer · its layers, innermost first: 1 #8 after · 2 #9 before · 3 #54 after · 4 n351 after · 5 n354 after   (PVX-N387; kept true by flow_t387) */
function openDrawer(pid){ return pvxRun('openDrawer',openDrawer$base,this,arguments); }
function openDrawer$base(pid){
const p=PATIENTS.find(x=>x.id===pid); if(!p) return;
activePatient=pid; triExpanded=false; recExpanded=false; _commOpen=false; _tlFreshOpen=true; fillDrawer(p);
document.getElementById('scrim').classList.add('open');
document.getElementById('drawer').classList.add('open');
}
/* closeDrawer · its layers, innermost first: 1 #8 after · 2 #17 before   (PVX-N387; kept true by flow_t387) */
function closeDrawer(){ return pvxRun('closeDrawer',closeDrawer$base,this,arguments); }
function closeDrawer$base(){
activePatient=null;
document.getElementById('scrim').classList.remove('open');
document.getElementById('drawer').classList.remove('open');
}
 
(function initResusBurst(){
var t=document.getElementById('dTimeline'); if(!t) return;
t.addEventListener('click', function(e){
var tg=e.target.closest && e.target.closest('.resus-burst-toggle'); if(!tg) return;
var b=tg.closest('.resus-burst'); if(!b) return;
var open=b.classList.toggle('open'); tg.setAttribute('aria-expanded', open?'true':'false');
});
})();
 
(function initTimelineToggle(){
var head=document.getElementById('dTimelineHead'), tl=document.getElementById('dTimeline'); if(!head||!tl) return;
function toggle(){ var willOpen=tl.classList.contains('collapsed'); tl.classList.toggle('collapsed'); head.setAttribute('aria-expanded', willOpen?'true':'false');
if(willOpen){ tl.classList.remove('tl-animate'); void tl.offsetWidth; tl.classList.add('tl-animate'); } }
head.addEventListener('click', toggle);
head.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
})();
