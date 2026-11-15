


const ALERT_WARN_SVG ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ALERT_TYPES = {
normal:    { label:"Normal Operations",        color:"neutral", dot:"var(--s-admitted)", desc:"Clears any active alert and restores the normal Client Display.", headline:"", message:""},
limited:   { label:"Limited Emergency Intake", color:"amber",   dot:"var(--amber)", desc:"High volume; new arrivals may be redirected after assessment.", headline:"Limited Emergency Intake", message:"We are currently experiencing exceptionally high patient volume. New arrivals may be redirected after medical assessment. Please speak with our Client Service team."},
diversion: { label:"Emergency Service Diversion", color:"red",  dot:"var(--priority-p1)", desc:"Not accepting additional emergency patients.", headline:"Emergency Service Diversion", message:"We are currently unable to accept additional emergency patients. Please contact the front desk for assistance locating another emergency hospital."},
custom:    { label:"Custom Announcement",      color:"neutral", dot:"var(--accent)", desc:"Your own headline and message.", headline:"", message:""}
};
let currentAlert = null;
let alertDraftType ="diversion";
let alertModalMode ="new";
function _alertColorClass(type){ const c=(ALERT_TYPES[type]||{}).color; return c==="amber"?"amber":(c==="red"?"red":"neutral"); }
function _heroColorClass(type){ const c=(ALERT_TYPES[type]||{}).color; return c==="amber"?"amber":(c==="red"?"":"neutral"); }
function fmtAlertWhen(v){ if(!v) return""; try{ const d=new Date(v); return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" · "+fmtTime(d); }catch(e){ return""; } }
function toLocalInput(v){ try{ const d=new Date(v); const p=n=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes()); }catch(e){ return""; } }

 


let _clMarqueeRO=null, _clFsHooked=false;
function _clStopFallback(track){ if(!track) return; if(track._raf){ cancelAnimationFrame(track._raf); track._raf=null; } if(track._fbT){ clearTimeout(track._fbT); track._fbT=null; } }
function _clMarqueeMeasure(){
const wrap=document.querySelector('#view-client .cl-alert-msg-wrap'); if(!wrap) return;
const track=wrap.querySelector('.cl-alert-track'); if(!track) return;
const copy=track.querySelector('.cl-alert-copy'); if(!copy) return;
if(wrap.clientWidth===0) return;
const overflow = copy.scrollWidth > wrap.clientWidth + 2;
if(overflow){
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
track.classList.add('marquee');
const W = track.scrollWidth/2;
const speed = reduce ? 55 : 95;
const dur = Math.max(16, Math.round(W/speed));
track.style.setProperty('--cl-dur', dur+'s');
track.style.animation='none'; void track.offsetWidth; track.style.animation='';
_clMarqueeFallback(track, W, dur);
} else {
_clStopFallback(track);
track.classList.remove('marquee');
track.style.removeProperty('--cl-dur'); track.style.animation=''; track.style.transform='';
}
}
function _clMarqueeFallback(track, W, dur){
_clStopFallback(track);
track._fbT=setTimeout(function(){
const a=getComputedStyle(track).transform;
track._fbT=setTimeout(function(){
const b=getComputedStyle(track).transform;
if(a===b && track.classList.contains('marquee')){
track.style.animation='none';
const pxms=W/(dur*1000); let t0=null;
(function step(ts){ if(!track.classList.contains('marquee')) return; if(t0==null)t0=ts; const x=((ts-t0)*pxms)%W; track.style.transform='translate3d('+(-x)+'px,0,0)'; track._raf=requestAnimationFrame(step); })(performance.now());
}
},170);
},130);
}
function setupAlertMarquee(){
if(_clMarqueeRO){ try{ _clMarqueeRO.disconnect(); }catch(e){} _clMarqueeRO=null; }
const wrap=document.querySelector('#view-client .cl-alert-msg-wrap'); if(!wrap) return;
_clMarqueeMeasure();
if(typeof ResizeObserver!=='undefined'){ _clMarqueeRO=new ResizeObserver(function(){ _clMarqueeMeasure(); }); try{ _clMarqueeRO.observe(wrap); }catch(e){} }
if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ _clMarqueeMeasure(); }).catch(function(){}); }
if(!_clFsHooked){ _clFsHooked=true;
document.addEventListener('fullscreenchange', function(){ setTimeout(_clMarqueeMeasure,60); });
window.addEventListener('resize', function(){ _clMarqueeMeasure(); }); }
}
function renderAlert(){
const a = currentAlert;
const isAlert = !!(a && a.type && a.type!=="normal");
const hero = document.querySelector("#view-client .cl-hero");
if(hero){
if(isAlert && a.show_client!==false){
const head = pvxEscQ(a.headline || (ALERT_TYPES[a.type]||{}).headline || (ALERT_TYPES[a.type]||{}).label ||"Hospital Alert");
const msg  = pvxEscQ(a.message  || (ALERT_TYPES[a.type]||{}).message  ||"");
hero.innerHTML ='<div class="cl-alert-hero '+_heroColorClass(a.type)+'">'
+'<div class="cl-alert-ic">'+ALERT_WARN_SVG+'</div>'
+'<div class="cl-alert-body"><div class="cl-alert-title">'+head+'</div>'
+'<div class="cl-alert-msg-wrap"><div class="cl-alert-track">'
+'<span class="cl-alert-msg cl-alert-copy">'+msg+'</span>'
+'<span class="cl-alert-msg cl-alert-copy" aria-hidden="true">'+msg+'</span>'
+'</div></div></div></div>';
try{ setupAlertMarquee(); }catch(e){}
} else {
hero.innerHTML ='<div class="cl-hero-title">'+"We're here for them. You're in good hands."+'</div><div class="cl-hero-sub">'+"Thank you for trusting us with your pet's care."+'</div>';
try{ if(_clMarqueeRO){ _clMarqueeRO.disconnect(); _clMarqueeRO=null; } }catch(e){}
}
}
const strip = document.getElementById("alertStrip");
if(strip){
const lobby = (typeof Backend!=="undefined"&& Backend.mode==="lobby");
if(isAlert && a.show_staff!==false && !lobby){
const t = ALERT_TYPES[a.type] || ALERT_TYPES.custom;
strip.className ="alert-strip show "+ _alertColorClass(a.type).replace("red","");

const canManage = (currentView!=='client');
strip.innerHTML ='<span class="as-dot"></span><span class="as-label">'+pvxEscQ(t.label)+'</span>'
+'<span class="as-meta">Active since '+fmtAlertWhen(a.effective_at || a.created_at)+'</span>'
+ (canManage ?'<button class="as-manage" id="alertStripManage">Manage</button>':'');
if(canManage){ const mb=document.getElementById("alertStripManage"); if(mb) mb.onclick=openAlertModal; }
} else { strip.className="alert-strip"; strip.innerHTML=""; }
}
try{ window.LunaAnnouncement?.onAlert(a); }catch(e){}
}

/* openAlertModal · its layers, innermost first: 1 n351 wrap   (PVX-N387; kept true by flow_t387) */
function openAlertModal(){ return pvxRun('openAlertModal',openAlertModal$base,this,arguments); }
function openAlertModal$base(){
alertModalMode = currentAlert ?"view":"new";
alertDraftType = currentAlert ? currentAlert.type :"diversion";
renderAlertModal();
document.getElementById("alertScrim").classList.add("open");
document.getElementById("alertModal").classList.add("open");
}
function closeAlertModal(){
const c=document.getElementById("alertConfirm"); if(c) c.remove();
document.getElementById("alertScrim").classList.remove("open");
document.getElementById("alertModal").classList.remove("open");
}
/* renderAlertModal · its layers, innermost first: 1 #53 wrap · 2 #59 after · 3 n370 after · 4 n372 after   (PVX-N387; kept true by flow_t387) */
function renderAlertModal(){ return pvxRun('renderAlertModal',renderAlertModal$base,this,arguments); }
function renderAlertModal$base(){
const body=document.getElementById("alertBody"), foot=document.getElementById("alertFoot");
foot.classList.toggle("drawer-confirm-actions", alertModalMode!=="view");
if(alertModalMode==="view"&& currentAlert){
const t = ALERT_TYPES[currentAlert.type] || ALERT_TYPES.custom;
body.innerHTML ='<div class="alert-active-card '+_alertColorClass(currentAlert.type)+'">'
+'<div class="aac-t">'+pvxEscQ(t.label)+'</div>'
+'<div class="aac-m">'+pvxEscQ(currentAlert.message || t.message ||"")+'</div>'
+'<div class="aac-meta">Active since '+fmtAlertWhen(currentAlert.effective_at || currentAlert.created_at)
+ (currentAlert.review_at ?'  ·  Review by '+fmtAlertWhen(currentAlert.review_at) :'')
+ (currentAlert.internal_note ?'<br>Note: '+pvxEscQ(currentAlert.internal_note) :'') +'</div></div>';
foot.innerHTML ='<button class="btn ghost" id="alertEditBtn">Edit alert</button><button class="btn danger" id="alertEndBtn">End alert</button>';
document.getElementById("alertEditBtn").onclick = function(){ alertModalMode="edit"; alertDraftType=currentAlert.type; renderAlertModal(); };
document.getElementById("alertEndBtn").onclick = function(){ confirmAlert("end"); };
return;
}
const cards = Object.keys(ALERT_TYPES).map(function(k){ const t=ALERT_TYPES[k];
return'<button type="button" class="alert-type'+(alertDraftType===k?" sel":"")+'" data-atype="'+k+'"><span class="at-dot" style="background:'+t.dot+'"></span><span><span class="at-t">'+t.label+'</span><span class="at-s">'+t.desc+'</span></span></button>';
}).join("");
const pre = (currentAlert && currentAlert.type===alertDraftType) ? currentAlert : null;
const t = ALERT_TYPES[alertDraftType];
let form="";
if(alertDraftType==="normal"){
form ='<div class="alert-field" style="color:var(--ink-400);font-size:0.8125rem;line-height:1.45">Selecting Normal Operations clears any active alert and restores the normal Client Display and staff pages.</div>';
} else {
form ='<div class="alert-field"><label>Public headline</label><input type="text" id="alertHeadline" value="'+pvxEscQ((pre&&pre.headline)||t.headline||"")+'" /></div>'
+'<div class="alert-field"><label>Public message</label><textarea id="alertMessage">'+pvxEscQ((pre&&pre.message)||t.message||"")+'</textarea></div>'
+'<div class="alert-field"><label>Internal staff note · never shown publicly</label><textarea id="alertNote">'+pvxEscQ((pre&&pre.internal_note)||"")+'</textarea></div>'
+'<div class="alert-field"><label>Expected review time · optional</label><input type="datetime-local" id="alertReview" value="'+((pre&&pre.review_at)?toLocalInput(pre.review_at):"")+'" /></div>'
+'<div class="alert-toggles"><label class="alert-toggle"><input type="checkbox" id="alertShowClient" '+((!pre||pre.show_client!==false)?"checked":"")+' /> Show on Client Display</label>'
+'<label class="alert-toggle"><input type="checkbox" id="alertShowStaff" '+((!pre||pre.show_staff!==false)?"checked":"")+' /> Show on staff pages</label></div>';
}
body.innerHTML ='<div class="alert-types">'+cards+'</div>'+form;
body.querySelectorAll(".alert-type").forEach(function(el){ el.onclick=function(){ alertDraftType=el.dataset.atype; renderAlertModal(); }; });
const label = alertDraftType==="normal"?"Restore normal":"Activate alert";
foot.innerHTML ='<button type="button" class="cf-btn cancel" id="alertCancelBtn">Cancel</button><button type="button" class="cf-btn go" id="alertActivateBtn">'+label+'</button>';
document.getElementById("alertCancelBtn").onclick = closeAlertModal;
document.getElementById("alertActivateBtn").onclick = function(){
if(alertDraftType==="diversion") confirmAlert("activate");
else if(alertDraftType==="normal") endAlert(false);
else activateAlert();
};
}
function confirmAlert(kind){   /* PVX-N366: the shared alert (it was a dark box of its own inside the sheet) */
const isEnd = kind==="end";
const on = (isEnd && currentAlert) ? currentAlert.type : "diversion", t = ALERT_TYPES[on] || ALERT_TYPES.custom;
if(isEnd) showConfirm(on==="custom" ? "End this announcement?" : "End "+t.label+"?", on==="diversion" ? "End diversion" : "End alert", function(){ endAlert(false); },
  {sub:"The Client Display goes back to its normal message, and the alert leaves staff pages."});
else showConfirm("Activate "+t.label+"?", "Activate diversion", function(){ activateAlert(); },
  {sub:"The Client Display shows the diversion message right away, and every staff page shows the alert.", danger:true});
}
function _alertVal(id){ const el=document.getElementById(id); return el?el.value.trim():""; }
function _alertChecked(id){ const el=document.getElementById(id); return el?el.checked:true; }
async function activateAlert(){
const type = alertDraftType;
const by = (typeof CURRENT_USER!=="undefined"&&CURRENT_USER) ? CURRENT_USER : "Unknown";   /* PVX-N149: the person, not the shared address */
const t = ALERT_TYPES[type] || ALERT_TYPES.custom;
const payload = {
tenant_id: TENANT_ID, type: type,
headline: _alertVal("alertHeadline") || t.headline || t.label,
message: _alertVal("alertMessage") || t.message ||"",
internal_note: _alertVal("alertNote") || null,
show_client: _alertChecked("alertShowClient"),
show_staff: _alertChecked("alertShowStaff"),
review_at: _alertVal("alertReview") || null,
effective_at: new Date().toISOString(),
active: true, created_by: by
};
if(DB && Backend.mode==="staff"){
try{
await DB.collection("alerts").doc(TENANT_ID).set(payload);
currentAlert = payload;
}catch(e){ toast("Couldn’t activate the alert — check the connection and try again"); return; }
} else { currentAlert = payload; }
renderAlert();
closeAlertModal();
notify("Hospital alert activated", pvxEscQ(t.label), { icon:"info", color: type==="diversion"?"var(--priority-p1)":(type==="limited"?"var(--amber)":"var(--accent)") });
}
async function endAlert(silent){
const by = (typeof CURRENT_USER!=="undefined"&&CURRENT_USER) ? CURRENT_USER : "Unknown";   /* PVX-N149: the person, not the shared address */
if(DB && Backend.mode==="staff"){
try{ await DB.collection("alerts").doc(TENANT_ID).set({ active:false, ended_at:new Date().toISOString(), ended_by:by }, { merge:true }); }catch(e){}
currentAlert = null;
} else { currentAlert = null; }
renderAlert(); closeAlertModal();
if(!silent) notify("Alert ended","Normal operations restored", { icon:"check", color:"var(--s-admitted)"});
}
