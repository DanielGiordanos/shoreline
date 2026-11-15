function cprPill(p){
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const when = p.resusRecordedAt?fmtTime(p.resusRecordedAt):'';
const title=('Resuscitation: CPR · '+conf+(when?' · '+when:'')).replace(/"/g,'&quot;');

var d='M1 13 C4 13,5 13,7 13 C8 13,9 11.8,10.2 11.3 C11.4 10.8,12.2 12.1,13.4 13 L16 13 L17.2 14.3 L18.5 10.5 L20.1 2.7 L21.6 21.4 L23.2 12.2 L26 13 C28 13,29 12.8,30 12.5 C32 11.2,33.4 9.8,35 10.2 C37 10.7,38 12.5,40 13 L42 13 C45 13,46 13,48 13 C49 13,50 11.8,51.2 11.3 C52.4 10.8,53.2 12.1,54.4 13 L57 13 L58.2 14.3 L59.5 10.5 L61.1 2.7 L62.6 21.4 L64.2 12.2 L67 13 C69 13,70 12.8,71 12.5 C72.5 11.4,73.5 10.4,75 10.8';
return'<span class="cpr-pill" role="button" tabindex="0" aria-label="Resuscitation: CPR — tap to change" title="'+title+'"><span class="ecg" aria-hidden="true"><svg class="ecg-svg" viewBox="0 0 76 26" preserveAspectRatio="xMidYMid meet"><path class="ecg-base" d="'+d+'"/><path class="ecg-live" d="'+d+'"/><circle class="ecg-dot" cx="1" cy="13" r="1.7"/></svg></span><span class="label">CPR</span></span>';
}


var CprEcg=(function(){
var raf=null, t0=null, live=null, dot=null, len=0; var DUR=2750;
function stop(){ if(raf){ cancelAnimationFrame(raf); raf=null; } t0=null; }
function frame(ts){
if(!live || !document.body.contains(live)){ stop(); return; }
if(t0===null) t0=ts;
var prog=((ts-t0)%DUR)/DUR;
var pt=live.getPointAtLength(prog*len);
dot.setAttribute('cx', pt.x.toFixed(2)); dot.setAttribute('cy', pt.y.toFixed(2));
live.style.strokeDashoffset=(len*(1-prog)).toFixed(2);
raf=requestAnimationFrame(frame);
}
function mount(){
stop();
var root=document.getElementById('dResus');

live = root ? root.querySelector('.cpr-pill .ecg-live, .dnr-pill .flatline-live') : null;
dot  = root ? root.querySelector('.cpr-pill .ecg-dot, .dnr-pill .flatline-dot')  : null;
if(!live || !dot){ live=null; return; }
try{ len=live.getTotalLength(); }catch(e){ len=0; }
if(!len){ live=null; return; }
live.style.strokeDasharray=len;
live.style.strokeDashoffset=len;
raf=requestAnimationFrame(frame);
}
return { mount:mount, stop:stop };
})();


/* setResusPref · its layers, innermost first: 1 #23 after   (PVX-N387; kept true by flow_t387) */
function setResusPref(p,pref){ return pvxRun('setResusPref',setResusPref$base,this,arguments); }
function setResusPref$base(p, pref){
if(!p || (pref!=='CPR'&& pref!=='DNR') || p.resusPref===pref) return;
const at=new Date();
try{ if(p.publicToken&&p.resusPref) (_fxStaffResus[p.publicToken]=_fxStaffResus[p.publicToken]||{})[fxResusKey(p.resusPref,p.resusRecordedAt)]=1; }catch(e){}   /* the state being replaced */
p.resusPref=pref;
p.resusStatus='confirmed';
p.resusSource='staff_flow';
p.resusRecordedAt=at;
p.resusRequest=null;   /* staff decided */
if(!Array.isArray(p.resusHistory)) p.resusHistory=[];
p.resusHistory.push({ pref:pref, source:'staff_flow', at:at.toISOString(), by:CURRENT_USER });
if(Array.isArray(p.timeline)) p.timeline.push({ label:'Resuscitation preference: '+pref, at:at, meta:'Updated · '+CURRENT_USER });


try{ if(typeof Backend!=='undefined'&& Backend && Backend._pubResus && p.publicToken){ Backend._pubResus[p.publicToken]={ pref:pref, status:'confirmed', at:at.toISOString() }; } }catch(e){}
notify('Resuscitation updated', pvxEscQ(p.name||'Patient')+' · '+pvxEscQ(pref), {icon:'info', color: pref==='CPR'?'var(--s-admitted)':'#8B4DB5'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
function closeResusChooser(){ var pop=document.getElementById('resusPop'); if(pop) pop.remove();
document.removeEventListener('mousedown', _resusOutside, true); document.removeEventListener('keydown', _resusKey, true); }
function _resusOutside(e){ var pop=document.getElementById('resusPop');
if(pop && !pop.contains(e.target) && !(e.target.closest && e.target.closest('.cpr-pill,.dnr-pill,.resus-set'))) closeResusChooser(); }
function _resusKey(e){ if(e.key==='Escape'){ e.stopPropagation(); closeResusChooser(); } }
function openResusChooser(pillEl){
const p=PATIENTS.find(x=>x.id===activePatient); if(!p || isCompleted(p)){ return; }
closeResusChooser();
var cur=p.resusPref;
var check='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
var pop=document.createElement('div'); pop.className='resus-pop'; pop.id='resusPop'; pop.setAttribute('role','menu');
['CPR','DNR'].forEach(function(v){
var b=document.createElement('button'); b.type='button';
b.className='rp-opt '+(v==='CPR'?'cpr':'dnr')+(cur===v?' active':'');
b.setAttribute('role','menuitemradio'); b.setAttribute('aria-checked', cur===v?'true':'false');
b.innerHTML='<span class="rp-dot" aria-hidden="true"></span><span>'+v+'</span><span class="rp-check" aria-hidden="true">'+check+'</span>';
b.onclick=function(){ setResusPref(p, v); closeResusChooser(); };
pop.appendChild(b);
});
document.body.appendChild(pop);
var r=pillEl.getBoundingClientRect(), pw=pop.offsetWidth, ph=pop.offsetHeight, vw=window.innerWidth, vh=window.innerHeight;
var left=r.left; if(left+pw>vw-8) left=vw-8-pw; if(left<8) left=8;
var top=r.bottom+6; if(top+ph>vh-8) top=r.top-6-ph;
pop.style.left=left+'px'; pop.style.top=top+'px';
var first=pop.querySelector('.rp-opt.active')||pop.querySelector('.rp-opt'); if(first) first.focus();
setTimeout(function(){ document.addEventListener('mousedown', _resusOutside, true); document.addEventListener('keydown', _resusKey, true); },0);
}
(function initResusChooser(){
var dr=document.getElementById('dResus'); if(!dr) return;
dr.addEventListener('click', function(e){ var pill=e.target.closest && e.target.closest('.cpr-pill,.dnr-pill,.resus-set'); if(pill) openResusChooser(pill); });
dr.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ var pill=e.target.closest && e.target.closest('.cpr-pill,.dnr-pill,.resus-set'); if(pill){ e.preventDefault(); openResusChooser(pill); } } });
})();
function dnrPill(p){
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const when = p.resusRecordedAt?fmtTime(p.resusRecordedAt):'';
const title=('Resuscitation: DNR · '+conf+(when?' · '+when:'')).replace(/"/g,'&quot;');
return'<span class="dnr-pill" role="button" tabindex="0" aria-label="Resuscitation: DNR — tap to change" title="'+title+'"><span class="flatline" aria-hidden="true"><svg class="flatline-svg" viewBox="0 0 76 26" preserveAspectRatio="xMidYMid meet"><path class="flatline-base" d="M1 13 H75"/><path class="flatline-live" d="M1 13 H75"/><circle class="flatline-dot" cx="1" cy="13" r="1.7"/></svg></span><span class="label">DNR</span></span>';
}
function resusBadge(p, big){ return _fxResusBadge(p,big)+fxResusReqChip(p); }
function _fxResusBadge(p, big){
if(!p.resusPref) return'';
const cls=p.resusPref==='CPR'?'cpr':'dnr';
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const when = p.resusRecordedAt?fmtTime(p.resusRecordedAt):'';
const title=`Resuscitation: ${p.resusPref} · ${conf}${when?' · '+when:''}`;
return`<span class="resus-badge ${cls}${big?' big':''}" title="${title.replace(/"/g,'&quot;')}">${p.resusPref}</span>`;
}
const RESUS_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 8-6-16-3 8H2"/></svg>';
 
function resusPill(p){ return _fxResusPill(p)+fxResusReqHTML(p); }
function _fxResusPill(p){
if(!p.resusPref) return'<span class="resus-set" role="button" tabindex="0" aria-label="Set resuscitation preference — CPR or DNR" title="Set resuscitation (CPR / DNR)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 3 10 2-7 1.5 2H21"/></svg><span>Resuscitation</span></span>';
if(p.resusPref==='CPR') return cprPill(p);
if(p.resusPref==='DNR') return dnrPill(p);
const cls=p.resusPref==='CPR'?'cpr':'dnr';
const conf = p.resusStatus==='confirmed'?'Confirmed by staff':'Client preference recorded';
const title=`Resuscitation: ${p.resusPref} · ${conf}`;
return`<span class="resus-cap ${cls}" title="${title.replace(/"/g,'&quot;')}">${RESUS_ICON}${p.resusPref}</span>`;
}
