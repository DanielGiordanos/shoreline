

/* n333: on Ultrasound's page */
const US_ICON_REQ ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const US_ICON_INC ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
const US_ICON_WAVE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1.3"/><path d="M8.9 12.6a4.4 4.4 0 0 1 6.2 0"/><path d="M6.2 9.8a8.2 8.2 0 0 1 11.6 0"/></svg>';
function usFlag(p){
const u=p.ultrasound; if(!u) return'';
const st=usEff(p);
if(st==='completed'){
if(p.status!=='Ultrasound'&& !(u.completedAt && isTodayHosp(u.completedAt))) return'';
const extra = (u.criticalFinding&&!u.critSeenAt?'<span class="us-flag crit" role="img" aria-label="Critical ultrasound finding, not yet seen">'+(window.PVX_GI?PVX_GI.warn:'')+'Critical ultrasound finding</span>':'')+(u.doctorDiscussionNeeded ?'<span class="us-flag disc">'+US_ICON_WAVE+'Discussion requested</span>':'');   /* PVX-N197 */
return'<span class="us-flag done">'+US_ICON_REQ+'Ultrasound · Completed '+(u.completedAt?fmtTime(u.completedAt):'')+'</span>'+extra;
}
if(p.status!=='Ultrasound') return'';
if(st==='incomplete') return'<button type="button" class="us-flag inc" data-usflag="'+p.id+'" title="Complete the ultrasound request" aria-label="'+pvxEscQ('Complete ultrasound request for '+(p.name+' '+(p.last||'')).trim())+'">'+US_ICON_INC+'Ultrasound · Request incomplete</button>';   /* PVX-N145 UR-06 */
if(st==='in_progress') return'<span class="us-flag prog"><span class="fd"></span>Ultrasound · In Progress</span>';
if(st==='accepted') return'<span class="us-flag acc">'+US_ICON_REQ+'Ultrasound · Accepted · '+pvxEscQ(drName(u.acceptedBy))+'</span>';
const pos=usQueuePos(p);
if(pos===1) return'<span class="us-flag req">'+US_ICON_WAVE+'Ultrasound · next</span>';
if(pos)     return'<span class="us-flag req">'+US_ICON_WAVE+'Ultrasound · #'+pos+' in Queue</span>';
return'<span class="us-flag req">'+US_ICON_REQ+'Ultrasound · Requested</span>';
}

function usDiagnostics(p){
const out=[];
try{ if(p.records && p.records.status==='received') out.push('pDVM records received'+(p.records.pdvm?(' · '+p.records.pdvm):'')); }catch(e){}
return out;
}
let _usPid=null;
/* openUltrasoundRequest · its layers, innermost first: 1 n351 wrap · 2 n370 after   (PVX-N387; kept true by flow_t387) */
function openUltrasoundRequest(pid){ return pvxRun('openUltrasoundRequest',openUltrasoundRequest$base,this,arguments); }
function openUltrasoundRequest$base(pid){
const p=(pid && typeof pid==='object') ? pid : PATIENTS.find(x=>x.id===pid); if(!p) return;
_usPid=p.id;
if(!p.ultrasound) p.ultrasound={ study:'Abdominal Ultrasound', clinicalQuestion:'', status:'incomplete', requestStatus:'incomplete', requestedAt:null, createdAt:new Date() };
const u=p.ultrasound;
const docName=(p.doctor&&p.doctor!=='unassigned')?('Dr. '+doc(p.doctor).name.split(/\s+/).slice(-1)[0]):'Unassigned';
const sub=['ER', docName, (p.species||'—'), (p.weight||'—')].join(' · ');
const hist=(p.reasonProblems&&p.reasonProblems.length)
?'<ul class="us-list">'+p.reasonProblems.map(pr=>'<li>'+pvxEscQ(formatProblem(pr))+'</li>').join('')+'</ul>'
:'<div class="us-empty">No presenting problems recorded</div>';
const dg=usDiagnostics(p);
const dxAuto = dg.length ?'<div class="us-sub">Auto-detected from Flow</div><ul class="us-list" style="margin-bottom:10px">'+dg.map(d=>'<li>'+pvxEscQ(d)+'</li>').join('')+'</ul><div class="us-sub">Doctor notes</div>':'';
let scrim=document.getElementById('usScrim'), modal=document.getElementById('usModal');
if(!scrim){ scrim=document.createElement('div'); scrim.id='usScrim'; scrim.className='us-scrim'; document.body.appendChild(scrim); scrim.addEventListener('click',closeUltrasound); }
if(!modal){ modal=document.createElement('div'); modal.id='usModal'; modal.className='us-modal'; document.body.appendChild(modal); }
modal.innerHTML =
'<div class="us-head"><div><div class="us-h-t" id="usHT">Ultrasound request</div>'
+'<div class="us-h-name" id="usHN">'+pvxEscQ((p.name+' '+(p.last||'')).trim())+'</div>'
+'<div class="us-h-sub">'+pvxEscQ(sub)+'</div></div>'
+'<button class="us-x" id="usX" type="button" aria-label="Close" title="Close (Esc)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
+'<div class="us-body">'
+'<div class="us-sect"><div class="us-lab">Study</div><div class="us-static">Abdominal Ultrasound</div></div>'
+'<div class="us-sect"><label class="us-lab" for="usCQ">Clinical question<span class="req" aria-hidden="true">*</span></label>'
+'<textarea class="us-input" id="usCQ" required aria-required="true" placeholder="What do you want Internal Medicine to evaluate?">'+pvxEscQ(u.clinicalQuestion||'')+'</textarea></div>'
+'<div class="us-sect"><div class="us-lab">Relevant history</div>'+hist+'</div>'
+'<div class="us-sect"><label class="us-lab" for="usDx">Relevant diagnostics</label>'+dxAuto
+'<textarea class="us-input" id="usDx" placeholder="Add pertinent lab results, imaging findings, or other diagnostic information…">'+pvxEscQ(u.diagnosticsNotes||'')+'</textarea></div>'
+'</div>'
+'<div class="us-foot"><button class="us-send" id="usSend" type="button">Send to Ultrasound</button></div>';
const cq=modal.querySelector('#usCQ'), send=modal.querySelector('#usSend');
function refreshSend(){ send.disabled = !cq.value.trim(); }
refreshSend();
cq.addEventListener('input',function(){ const pp=PATIENTS.find(x=>x.id===_usPid); if(pp&&pp.ultrasound) pp.ultrasound.clinicalQuestion=cq.value; refreshSend(); });
const dx=modal.querySelector('#usDx'); if(dx) dx.addEventListener('input',function(){ const pp=PATIENTS.find(x=>x.id===_usPid); if(pp&&pp.ultrasound) pp.ultrasound.diagnosticsNotes=dx.value; });
modal.querySelector('#usX').onclick=closeUltrasound;
send.onclick=sendUltrasound;
modal.onkeydown=function(e){ if(e.key==='Escape'){ e.preventDefault(); closeUltrasound(); } };
modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','usHT usHN'); modal.removeAttribute('aria-label');   /* PVX-N145 UR-07 */
RAF ? RAF(function(){ scrim.classList.add('open'); modal.classList.add('open'); }) : (scrim.classList.add('open'),modal.classList.add('open'));
setTimeout(function(){ try{ cq.focus(); }catch(e){} }, 140);
}
function closeUltrasound(){
const _pvxPid=_usPid; setTimeout(function(){ pvxUsRefocus(_pvxPid,'req'); },80); setTimeout(function(){ pvxUsRefocus(_pvxPid,'req'); },450);   /* PVX-N145 UR-08 */
const scrim=document.getElementById('usScrim'), modal=document.getElementById('usModal');
if(scrim) scrim.classList.remove('open');
if(modal) modal.classList.remove('open');
_usPid=null;
try{ persist(); }catch(e){}
try{ renderBoard(); }catch(e){}
try{ renderUltrasound(); }catch(e){}
}
function sendUltrasound(){
const p=PATIENTS.find(x=>x.id===_usPid); if(!p){ return closeUltrasound(); }
const modal=document.getElementById('usModal'); const cq=modal?modal.querySelector('#usCQ'):null;
if(!p.ultrasound) p.ultrasound={ study:'Abdominal Ultrasound'};
if(cq) p.ultrasound.clinicalQuestion=cq.value.trim();
if(!p.ultrasound.clinicalQuestion) return;
const dx=modal?modal.querySelector('#usDx'):null; if(dx) p.ultrasound.diagnosticsNotes=dx.value.trim();
p.ultrasound.study='Abdominal Ultrasound';
const _usWasReady = p.ultrasound.status==='requested';
p.ultrasound.status='requested';
if(!p.ultrasound.requestedAt) p.ultrasound.requestedAt=new Date();

if(!['accepted','in_progress','completed'].includes(p.ultrasound.requestStatus||'')){
p.ultrasound.requestStatus='ready';
if(typeof p.ultrasound.queuePosition!=='number') p.ultrasound.queuePosition=usNextQueuePos();
}
p.timeline.push({label:_usWasReady?'Ultrasound request updated':'Ultrasound requested', at:new Date(), meta:p.ultrasound.study});
try{ notify('Sent to Ultrasound', pvxEscQ((p.name+' '+(p.last||'')).trim())+' · '+pvxEscQ(p.ultrasound.study), {icon:'flask', color:'var(--accent)'}); }catch(e){}
closeUltrasound();
renderAll();
}
