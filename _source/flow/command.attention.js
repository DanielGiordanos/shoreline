
/* attentionItems · its layers, innermost first: 1 n197 wrap   (PVX-N387; kept true by flow_t387) */
function attentionItems(){ return pvxRun('attentionItems',attentionItems$base,this,arguments); }
function attentionItems$base(){
const items=[];
const active=PATIENTS.filter(isActive);
active.forEach(p=>{
if(p.status==='Hospitalized') return;
const w=waitMinutes(p);

if(w>WAIT_ALERT_MIN) items.push({key:`wait:${p.id}:${p.status}`,sev:'red',icon:'clock',t:`${p.name} waiting over 2 hours`,s:`${fmtWait(w)} · ${p.status} · ${p.room}`,p});
if(p.doctor==='unassigned') items.push({key:`nodoc:${p.id}`,sev:'orange',icon:'user',t:`${p.name} has no doctor assigned`,s:fmtWait(w)+(p.reason?' · '+p.reason:''),p});
else if(!p.liaison && p.prio<=2) items.push({key:`nolia:${p.id}`,sev:'yellow',icon:'liaison',t:`${p.name} has no liaison`,s:`Optional · under ${doc(p.doctor).name}`,p});
if(p.status==='Diagnostics'&& w>90) items.push({key:`diag:${p.id}`,sev:'blue',icon:'flask',t:`${p.name} diagnostics may be complete`,s:`${fmtWait(w)} in diagnostics · check results`,p});
if(p.status==='Procedure'&& w>90) items.push({key:`proc:${p.id}`,sev:'green',icon:'check',t:`${p.name} procedure likely complete`,s:`Ready to admit or discharge · ${doc(p.doctor).name}`,p});
});

const waitingCount=active.filter(p=>p.status==='Waiting').length;
const clinRooms=ROOMS.filter(r=>r!=='Lobby'&&r!=='Comfort Room');
const freeRoom=clinRooms.find(r=>!active.some(p=>p.room===r));
if(waitingCount>0 && freeRoom) items.push({key:`roomavail:${freeRoom}`,sev:'warn',icon:'room',t:`${freeRoom} available while ${waitingCount} waiting`,s:'Consider moving a patient in',room:freeRoom});

try{ FlowIntakeStore.getPendingIntakes().forEach(r=>{
const nm=(r.patient&&r.patient.name)||'Client check-in';
const mins=(Date.now()-new Date(r.submittedAt).getTime())/60000;
if(r.urgentReview && r.urgentReview.flagged) items.push({key:`cq-urgent:${r.id}`,sev:'red',icon:'clock',t:`${nm} — needs CSR review`,s:'High-acuity phrase · client self check-in',intakeId:r.id});
else if(r.toxinWorkflow) items.push({key:`cq-toxin:${r.id}`,sev:'orange',icon:'flask',t:`${nm} — possible toxin exposure`,s:`${(r.toxinWorkflow.medication||'Substance')} · confirm with CSR`,intakeId:r.id});
else if(mins>CQ_WAIT_ALERT_MIN) items.push({key:`cq-wait:${r.id}`,sev:'yellow',icon:'clock',t:`${nm} waiting for review`,s:`${Math.round(mins)} min in Client Queue`,intakeId:r.id});
}); }catch(e){}
const order={red:0,orange:1,yellow:2,blue:3,green:4,warn:5};
return items.sort((a,b)=>(order[a.sev]-order[b.sev])||((a.p?a.p.prio:9)-(b.p?b.p.prio:9))||((b.p?waitMinutes(b.p):0)-(a.p?waitMinutes(a.p):0)));   /* n332 */
}


let dismissedAlerts = new Set();
function visibleAttentionItems(){
const all = attentionItems();
const currentKeys = new Set(all.map(a=>a.key));
dismissedAlerts.forEach(k=>{ if(!currentKeys.has(k)) dismissedAlerts.delete(k); });
return all.filter(a=>!dismissedAlerts.has(a.key));
}
/* dismissAlert · its layers, innermost first: 1 n197 wrap   (PVX-N387; kept true by flow_t387) */
function dismissAlert(key){ return pvxRun('dismissAlert',dismissAlert$base,this,arguments); }
function dismissAlert$base(key){ if(!key) return; dismissedAlerts.add(key); renderAttention(); }
function clearAllAlerts(){ visibleAttentionItems().forEach(a=>dismissedAlerts.add(a.key)); renderAttention(); }
const ATTN_ICONS={
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
liaison:'<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20v-1a6 6 0 0 1 9.5-4"/><path d="M16 4a4 4 0 0 1 0 7.5"/>',
room:'<path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/>'
};
const SEV_ACCENT={red:'#E4342B',orange:'#E8934A',yellow:'var(--s-waiting)',blue:'var(--s-exam)',green:'var(--s-admitted)',warn:'var(--s-diagnostics)'};
const SEV_LABEL={red:'Overdue',orange:'High',yellow:'Watch',blue:'Review',green:'Ready',warn:'Open'};


function setNotificationCount(el, value){
if(typeof el==='string') el=document.getElementById(el);
if(!el) return;
const txt=el.querySelector('.badge-text'); if(!txt) return;
const count=Math.max(0,Math.floor(Number(value)||0));
txt.textContent = count>99 ?'99+': String(count);
el.classList.toggle('over-limit', count>99);
el.style.display = count===0 ?'none':'block';
el.setAttribute('aria-label', count>99 ?'99 or more notifications': count+' notifications');
}
/* renderAttention · its layers, innermost first: 1 n197 after   (PVX-N387; kept true by flow_t387) */
function renderAttention(){ return pvxRun('renderAttention',renderAttention$base,this,arguments); }
function renderAttention$base(){
const items=visibleAttentionItems();
setNotificationCount('attnCount', items.length);
const clearAllBtn=document.getElementById('attnClearAll');
if(clearAllBtn) clearAllBtn.style.display = items.length ?'':'none';
const el=document.getElementById('attnList');
if(!items.length){el.innerHTML=`<div class="empty" style="padding:40px 20px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><b>No attention items</b><span>All current patients are clear.</span></div>`;return;}
el.innerHTML=items.map((it,i)=>{
const sev=it.sev; const accent=SEV_ACCENT[sev]||'var(--s-diagnostics)';
const nm=it.p?it.p.name:''; let rest=it.t; if(nm && rest.indexOf(nm)===0) rest=rest.slice(nm.length).trim();
const patient=nm||it.t; const issue=nm?rest:'';
const parts=String(it.s||'').split(' \u00b7 ');
const secHTML=parts.length>1 ?`<strong>${pvxEscQ(parts[0])}</strong> \u00b7 ${pvxEscQ(parts.slice(1).join(' \u00b7 '))}`: pvxEscQ(it.s||'');
return`<div class="attn-item${i===0?' primary':''}" data-pid="${it.p?it.p.id:''}" data-room="${it.room||''}" data-intake="${pvxEscQ(it.intakeId||'')}" data-key="${pvxEscQ(it.key)}" style="--accent:${accent};animation-delay:${i*40}ms"><div class="copy"><div class="primary-line"><span class="patient">${pvxEscQ(patient)}</span>${issue?`<span class="issue">${pvxEscQ(issue)}</span>`:''}</div><div class="secondary">${secHTML}</div></div>${sev==='red'?`<div class="overdue-badge" role="status" aria-label="Overdue"><span class="overdue-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5.5v8.5"/><path d="M12 18.6v.01"/></svg></span><span class="overdue-text">OVERDUE</span></div>`:sev==='orange'?`<div class="high-badge" role="status" aria-label="High priority"><span class="high-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5.5v8.5"/><path d="M12 18.6v.01"/></svg></span><span class="high-text">HIGH</span></div>`:sev==='blue'?`<div class="review-badge" role="status" aria-label="Diagnostics ready for review"><span class="review-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.5 3.75h9"/><path d="M9 3.75v4.65L5.7 15a3.6 3.6 0 0 0 3.15 5.25h6.3a3.6 3.6 0 0 0 3.15 -5.25L15 8.4V3.75"/><path d="M7.5 13.5h9"/></svg></span><span class="review-text">REVIEW</span></div>`:sev==='green'?`<div class="ready-badge" role="status" aria-label="Ready"><span class="ready-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 12.3 9.6 17.25 19.5 7.2"/></svg></span><span class="ready-text">READY</span></div>`:sev==='warn'?`<div class="room-open-badge" role="status" aria-label="Room open"><span class="room-open-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5.25 20.25V3.75h10.5v16.5"/><path d="M15.75 5.25 10.5 6.75v12l5.25 1.5"/><circle cx="13.05" cy="13.05" r="0.68" fill="currentColor" stroke="none"/><path d="M3.75 20.25h16.5"/></svg></span><span class="room-open-text">OPEN</span></div>`:sev==='yellow'?`<div class="watch-badge" role="status" aria-label="Watch"><span class="watch-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2.7 12s3.45 -6 9.3 -6 9.3 6 9.3 6 -3.45 6 -9.3 6S2.7 12 2.7 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></span><span class="watch-text">WATCH</span></div>`:`<div class="severity">${SEV_LABEL[sev]||''}</div>`}<div class="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div><button class="attn-clear" title="Clear this alert" aria-label="Clear alert: ${pvxEscQ(patient)}${issue?' '+pvxEscQ(issue):''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`;
}).join('');
el.querySelectorAll('.attn-item').forEach(n=>n.onclick=()=>{ if(n.dataset.intake) openIntakeReview(n.dataset.intake); else if(n.dataset.pid) openDrawer(n.dataset.pid); else if(n.dataset.room) switchView('rooms'); });
el.querySelectorAll('.attn-clear').forEach(btn=>btn.onclick=(e)=>{ e.stopPropagation(); dismissAlert(btn.closest('.attn-item').dataset.key); });
}
