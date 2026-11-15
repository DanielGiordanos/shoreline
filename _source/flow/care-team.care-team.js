


const CARE_TEAM_CONFIG = {
directoryUrl:'https://shoreline.pravix.app/directory',


serviceContacts: {},

services: ['Emergency service','Internal Medicine service','Surgery service','Neurology service','Oncology service','Urgent Care service']
};
const CT_ROLES = [
{ id:'primary',    label:'Primary clinician',                  mirror:true,  missing:'No primary clinician assigned'},
{ id:'technician', label:'Technician',                         multi:true,   missing:'No technician assigned'},
{ id:'supervising',label:'Supervising clinician',              opt:'when applicable', missing:'No supervising clinician'},
{ id:'consulting', label:'Consulting clinician / service',     opt:'optional', missing:'No consult recorded'},
{ id:'covering',   label:'After-hours / covering',             opt:'optional', missing:'No covering clinician or service'}
];
const CT_KIND_LABEL = { doctor:'Emergency doctor', im:'Internal Medicine', liaison:'Liaison', service:'Service', manual:'Staff (entered by name)'};
function ctRole(id){ return CT_ROLES.find(r=>r.id===id) || CT_ROLES[0]; }
function ctIso(d){ return d ? (d instanceof Date ? d.toISOString() : String(d)) : null; }
function ctFmt(iso){ if(!iso) return''; const d=new Date(iso); if(isNaN(d)) return''; const today=new Date(); const same=d.toDateString()===today.toDateString(); return (same?'':d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' ')+fmtTime(d); }
function ctUid(){ return'ct-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7); }

 
/* ctRoster · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctRoster(){ return pvxRun('ctRoster',ctRoster$base,this,arguments); }
function ctRoster$base(){
const out=[];
DOCTORS.forEach(d=>out.push({ id:d.id, name:d.name, kind:'doctor', initials:d.initials, color:d.color }));
(typeof IM_DOCTORS!=='undefined'?IM_DOCTORS:[]).forEach(d=>{ if(!out.some(x=>x.id===d.id)) out.push({ id:d.id, name:d.name, kind:'im', initials:d.initials, color:d.color }); });
LIAISONS.forEach(l=>{ if(!out.some(x=>x.id===l.id)) out.push({ id:l.id, name:l.name, kind:'liaison', initials:l.initials, color:l.color }); });
CARE_TEAM_CONFIG.services.forEach(s=>out.push({ id:'svc-'+docSlug(s), name:s, kind:'service', initials:s.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(), color:'var(--ink-400)'}));
return out;
}
function ctStaff(id, fallbackName, kind){
const r=ctRoster().find(x=>x.id===id);
if(r) return r;
const name=fallbackName||id||'Unknown';
return { id, name, kind:kind||'manual', initials:docInitials(name), color:'var(--ink-400)'};
}
function ctProfileUrl(a){ if(!a || a.staffKind==='service'|| !CARE_TEAM_CONFIG.directoryUrl) return null; return CARE_TEAM_CONFIG.directoryUrl.replace(/[?#].*$/,'')+'?staff='+encodeURIComponent(String(a.staffId).replace(/^manual:/,'')); }

 
function ctList(p){ if(!p.careTeam || !Array.isArray(p.careTeam.assignments)) p.careTeam={ assignments:[] }; return p.careTeam.assignments; }
function ctCurrent(p, role){ return ctList(p).filter(a=>a.status==='current'&& (!role || a.role===role)); }
function ctPending(p, role){ return ctList(p).filter(a=>a.status==='pending'&& (!role || a.role===role)); }
function ctEnded(p){ return ctList(p).filter(a=>a.status==='ended').sort((a,b)=>String(b.endAt||'').localeCompare(String(a.endAt||''))); }
/* ctTouch · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctTouch(a){ return pvxRun('ctTouch',ctTouch$base,this,arguments); }
function ctTouch$base(a){ a.updatedAt=new Date().toISOString(); a.updatedBy=CURRENT_USER; }
function ctLastUpdate(p){ return ctList(p).reduce((m,a)=>(!m||String(a.updatedAt)>String(m.updatedAt))?a:m, null); }
function ctToDb(ct){ const L=(ct&&Array.isArray(ct.assignments))?ct.assignments:[]; return { assignments: L.map(a=>({ id:a.id, patient_id:a.patientId, staff_id:a.staffId, staff_name:a.staffName||'', staff_kind:a.staffKind||'manual', role:a.role, status:a.status,
start_at:ctIso(a.startAt), end_at:ctIso(a.endAt), updated_at:ctIso(a.updatedAt), updated_by:a.updatedBy||'', proposed_by:a.proposedBy||null, confirmed_by:a.confirmedBy||null, confirmed_at:ctIso(a.confirmedAt), ended_by:a.endedBy||null, end_reason:a.endReason||null, note:a.note||'', actor_uid:a.actorUid||null })) }; }
function ctToApp(row){ const L=(row&&Array.isArray(row.assignments))?row.assignments:[]; return { assignments: L.map(a=>({ id:a.id, patientId:a.patient_id, staffId:a.staff_id, staffName:a.staff_name||'', staffKind:a.staff_kind||'manual', role:a.role, status:a.status,
startAt:a.start_at||null, endAt:a.end_at||null, updatedAt:a.updated_at||null, updatedBy:a.updated_by||'', proposedBy:a.proposed_by||null, confirmedBy:a.confirmed_by||null, confirmedAt:a.confirmed_at||null, endedBy:a.ended_by||null, endReason:a.end_reason||null, note:a.note||'', actorUid:a.actor_uid||null })) }; }

function ctEndAssignment(p, a, reason){
if(!a || a.status==='ended') return;
a.status='ended'; a.endAt=new Date().toISOString(); a.endedBy=CURRENT_USER; a.endReason=reason||'ended'; ctTouch(a);
}
 
/* ctAssign · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctAssign(p,roleId,staff,opts){ return pvxRun('ctAssign',ctAssign$base,this,arguments); }
function ctAssign$base(p, roleId, staff, opts){
opts=opts||{}; const role=ctRole(roleId);
if(role.mirror && !opts.pending){
if(staff.kind!=='doctor'){ toast('Choose one of Flow\'s emergency doctors as primary clinician'); return null; }
assignDoctor(p, staff.id); return ctCurrent(p,'primary')[0]||null;
}
const now=new Date().toISOString();
const a={ id:ctUid(), patientId:p.id, staffId:staff.id, staffName:staff.name, staffKind:staff.kind, role:roleId, status: opts.pending?'pending':'current',
startAt: opts.pending?null:now, endAt:null, updatedAt:now, updatedBy:CURRENT_USER, proposedBy: opts.pending?CURRENT_USER:null, confirmedBy:null, confirmedAt:null, endedBy:null, endReason:null, note:(opts.note||'').slice(0,160) };
if(!opts.pending && !role.multi) ctCurrent(p,roleId).forEach(x=>ctEndAssignment(p,x,'replaced'));
ctList(p).push(a);
p.timeline.push({ label: opts.pending?('Handoff proposed · '+role.label):(role.label+' assigned'), at:new Date(), meta: staff.name+' · '+CURRENT_USER });
notify(opts.pending?'Handoff proposed':'Care team updated',`${pvxEscQ(staff.name)} → ${pvxEscQ(p.name)} (${pvxEscQ(role.label)})`, {icon:'doctor', color:'var(--accent)'});
renderAll(); if(activePatient===p.id) fillDrawer(p);
return a;
}
function ctConfirm(p, aid){
const a=ctList(p).find(x=>x.id===aid); if(!a||a.status!=='pending') return;
const role=ctRole(a.role);
if(role.mirror){ if(a.staffKind!=='doctor'){ toast('Choose an emergency doctor as primary clinician'); return; } a.status='ended'; a.endReason='confirmed-into-primary'; a.confirmedBy=CURRENT_USER; a.confirmedAt=new Date().toISOString(); ctTouch(a); assignDoctor(p, a.staffId); const c=ctCurrent(p,'primary')[0]; if(c){ c.confirmedBy=CURRENT_USER; c.confirmedAt=a.confirmedAt; c.proposedBy=a.proposedBy; } renderAll(); if(activePatient===p.id) fillDrawer(p); return; }
if(!role.multi) ctCurrent(p,a.role).forEach(x=>ctEndAssignment(p,x,'handed off'));
a.status='current'; a.startAt=new Date().toISOString(); a.confirmedBy=CURRENT_USER; a.confirmedAt=a.startAt; ctTouch(a);
p.timeline.push({ label:'Handoff confirmed · '+role.label, at:new Date(), meta:a.staffName+' · confirmed by '+CURRENT_USER });
notify('Handoff confirmed',`${pvxEscQ(a.staffName)} now ${pvxEscQ(role.label.toLowerCase())} for ${pvxEscQ(p.name)}`, {icon:'doctor', color:'var(--s-admitted)'});
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
function ctDecline(p, aid){
const a=ctList(p).find(x=>x.id===aid); if(!a||a.status!=='pending') return;
ctEndAssignment(p,a,'declined');
p.timeline.push({ label:'Handoff declined · '+ctRole(a.role).label, at:new Date(), meta:a.staffName+' · '+CURRENT_USER });
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
function ctEnd(p, aid){
if(aid==='__doctor'){ assignDoctor(p,'unassigned'); return; }
const a=ctList(p).find(x=>x.id===aid); if(!a||a.status!=='current') return;
if(ctRole(a.role).mirror){ assignDoctor(p,'unassigned'); return; }
ctEndAssignment(p,a,'ended');
p.timeline.push({ label:ctRole(a.role).label+' assignment ended', at:new Date(), meta:a.staffName+' · '+CURRENT_USER });
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
 
function ctSyncPrimary(p){
const cur=ctCurrent(p,'primary'); const want=(p.doctor && p.doctor!=='unassigned')?p.doctor:null;
cur.forEach(a=>{ if(a.staffId!==want) ctEndAssignment(p,a, want?'replaced':'unassigned'); });
if(want && !cur.some(a=>a.staffId===want)){ const d=doc(want); const now=new Date().toISOString();
ctList(p).push({ id:ctUid(), patientId:p.id, staffId:d.id, staffName:d.name, staffKind:'doctor', role:'primary', status:'current', startAt:now, endAt:null, updatedAt:now, updatedBy:CURRENT_USER, proposedBy:null, confirmedBy:null, confirmedAt:null, endedBy:null, endReason:null, note:''}); }
}

 
function ctSummary(p){
const cur=ctCurrent(p).filter(a=>a.role!=='primary'), pend=ctPending(p);
const tech=ctCurrent(p,'technician').length;
const parts=[]; const d=doc(p.doctor);
parts.push(p.doctor==='unassigned'?'No primary clinician':d.name);
parts.push(tech?`${tech} technician${tech>1?'s':''}`:'No technician');
if(ctCurrent(p,'supervising').length) parts.push('supervised');
if(ctCurrent(p,'covering').length) parts.push('covering set');
if(pend.length) parts.push(`${pend.length} pending handoff${pend.length>1?'s':''}`);
return { text:parts.join(' · '), tech, pending:pend.length, others:cur };
}
function ctAvRow(p){
const cur=ctCurrent(p).filter(a=>a.role!=='primary'), pend=ctPending(p).length;
if(!cur.length && !pend) return'';
const show=cur.slice(0,3);
return show.map(a=>{ const s=ctStaff(a.staffId,a.staffName,a.staffKind); const role=ctRole(a.role).label; return`<span class="dav ct-av ${a.staffKind==='service'?'svc':''}" style="--ct-c:${s.color}" role="img" aria-label="${pvxEscQ(s.name)} — ${pvxEscQ(role)}" title="${pvxEscQ(s.name)} · ${pvxEscQ(role)}">${pvxEscQ(s.initials)}</span>`; }).join('')
+ (cur.length>3?`<span class="ct-av-more" aria-label="${cur.length-3} more team members">+${cur.length-3}</span>`:'')
+ (pend?`<span class="ct-pend" role="img" aria-label="${pend} pending handoff${pend>1?'s':''}" title="${pend} pending handoff${pend>1?'s':''}"></span>`:'');
}
function ctCardAction(p){ return`<div class="row"><span>Care team</span><b><button class="ct-link" type="button" data-ct-open="${pvxEscQ(p.id)}"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>Who's responsible?</button></b></div>`; }
function renderCareTeamCard(p){
const m=document.getElementById('careTeamMount'); if(!m) return;
const s=ctSummary(p); const cls = s.pending?'ct-status-warn':(p.doctor!=='unassigned'&&s.tech?'ct-status-ok':'ct-status-none');
const st = s.pending?`${s.pending} pending handoff${s.pending>1?'s':''}`:(p.doctor==='unassigned'?'No primary clinician':(s.tech?'Team assigned':'Technician missing'));
m.innerHTML=`<div class="triage-card ct-card" id="careTeamCard" role="button" tabindex="0" aria-label="Care team — who is responsible? ${pvxEscQ(s.text)}">
    <div class="tc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
    <div class="tc-main"><div class="tc-title">Care team · Who is responsible?</div><div class="tc-sub">${pvxEscQ(s.text)}</div>
      <span class="tc-status ${cls}">${pvxEscQ(st)}</span></div>
    <div class="tc-chev"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
  </div>`;
const card=document.getElementById('careTeamCard');
card.onclick=()=>openCareTeam(p.id);
card.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openCareTeam(p.id); } };
}

 
let ctOpenId=null, ctFormRole=null, ctRestoreFocus=null;
/* openCareTeam · its layers, innermost first: 1 #53 wrap   (PVX-N387; kept true by flow_t387) */
function openCareTeam(pid){ return pvxRun('openCareTeam',openCareTeam$base,this,arguments); }
function openCareTeam$base(pid){
const p=PATIENTS.find(x=>x.id===pid); if(!p) return;
ctOpenId=pid; ctFormRole=null; ctRestoreFocus=document.activeElement;
renderCareTeam();
document.getElementById('ctScrim').classList.add('open');
document.getElementById('ctModal').classList.add('open');
setTimeout(()=>{ const c=document.getElementById('ctClose'); if(c) c.focus(); }, 40);
}
/* closeCareTeam · its layers, innermost first: 1 #53 wrap   (PVX-N387; kept true by flow_t387) */
function closeCareTeam(){ return pvxRun('closeCareTeam',closeCareTeam$base,this,arguments); }
function closeCareTeam$base(){
ctOpenId=null; ctFormRole=null;
document.getElementById('ctScrim').classList.remove('open');
document.getElementById('ctModal').classList.remove('open');
if(ctRestoreFocus && document.contains(ctRestoreFocus)){ try{ ctRestoreFocus.focus(); }catch(e){} }
ctRestoreFocus=null;
}
function ctPatient(){ return ctOpenId ? PATIENTS.find(x=>x.id===ctOpenId) : null; }
function renderCareTeam(){
const p=ctPatient(); if(!p) return;
document.getElementById('ctSub').textContent=`${p.name} ${p.last||''}`.trim()+' · '+(p.hid||'')+' · '+(p.room||'');
const body=document.getElementById('ctBody'), foot=document.getElementById('ctFoot');
let html='';
if(p._demo) html+='<div class="ct-banner warn"><strong>Preview census.</strong> This sample patient is not saved — assignments here are not shared.</div>';
else if(typeof Backend!=='undefined'&& Backend.conn!=='live') html+=`<div class="ct-banner warn"><strong>Assignment data may be out of date.</strong> Connection: ${pvxEscQ(Backend.conn)}. Changes will sync when the connection returns; confirm with the team before relying on this view.</div>`;
html+=CT_ROLES.map(r=>ctRoleHTML(p,r)).join('');
if(ctFormRole) html+=ctFormHTML(p, ctFormRole);
const hist=ctEnded(p);
html+=`<details class="ct-hist"><summary><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>History · ${hist.length} ended assignment${hist.length===1?'':'s'}</summary>
    ${hist.length?hist.slice(0,30).map(a=>ctRowHTML(p,a,true)).join(''):'<div class="ct-empty">No ended assignments yet.</div>'}</details>`;
body.innerHTML=html;
const last=ctLastUpdate(p);
foot.innerHTML=`<span class="ct-updated">${last?`Last updated ${pvxEscQ(ctFmt(last.updatedAt))} by ${pvxEscQ(last.updatedBy||'—')}`:'No assignments recorded yet'}</span>`;
if(ctFormRole){ const f=document.getElementById('ctFormRoleSel')||document.querySelector('#ctFormBox select'); if(f) f.focus(); }
}
function ctRoleHTML(p, r){
let cur=ctCurrent(p,r.id); const pend=ctPending(p,r.id);
if(r.mirror && !cur.length && p.doctor && p.doctor!=='unassigned'){
const d=doc(p.doctor); cur=[{ id:'__doctor', staffId:d.id, staffName:d.name, staffKind:'doctor', role:'primary', status:'current', startAt:null, updatedAt:null, updatedBy:'', note:'', _legacy:true }];
}
let rows=cur.map(a=>ctRowHTML(p,a)).join('')+pend.map(a=>ctRowHTML(p,a)).join('');
if(!cur.length && !pend.length){
const sc=CARE_TEAM_CONFIG.serviceContacts[r.id];
rows=`<div class="ct-missing"><span><b>${pvxEscQ(r.missing)}</b>${sc?` · designated contact: ${pvxEscQ(sc.name)}${sc.ext?' · Ext. '+pvxEscQ(sc.ext):''}${sc.phone?' · '+pvxEscQ(sc.phone):''}`:''}</span><button class="ct-mini" type="button" data-ct-form="${r.id}">Assign</button></div>`;
}
const canAdd = (r.multi || !cur.length) && (cur.length||pend.length);
return`<section class="ct-role" aria-label="${pvxEscQ(r.label)}"><div class="ct-role-head"><p class="sect-title">${pvxEscQ(r.label)}${r.opt?` <span class="opt">· ${pvxEscQ(r.opt)}</span>`:''}</p>
      ${(cur.length||pend.length)?`<button class="ct-mini" type="button" data-ct-form="${r.id}">${r.multi?'Add':'Replace / hand off'}</button>`:''}</div>${rows}</section>`;
}
function ctRowHTML(p, a, history){
const s=ctStaff(a.staffId,a.staffName,a.staffKind), r=ctRole(a.role), url=ctProfileUrl(a);
const im=(a.staffKind==='im'&& typeof imContact==='function') ? imContact({id:a.staffId}) : null;
let sub='';
if(a._legacy) sub='Assigned doctor · time not recorded (assigned before Care team history started)';
else if(a.status==='current') sub=`Since ${pvxEscQ(ctFmt(a.startAt))}${a.confirmedBy?` · handoff confirmed by ${pvxEscQ(a.confirmedBy)}`:''}${a.updatedBy?` · updated ${pvxEscQ(ctFmt(a.updatedAt))} by ${pvxEscQ(a.updatedBy)}`:''}`;
else if(a.status==='pending') sub=`Proposed by ${pvxEscQ(a.proposedBy||a.updatedBy||'—')} at ${pvxEscQ(ctFmt(a.updatedAt))} · waiting for ${pvxEscQ(s.name)} to confirm`;
else sub=`${pvxEscQ(r.label)} · ${pvxEscQ(ctFmt(a.startAt)||'proposed')} → ${pvxEscQ(ctFmt(a.endAt))} · ${pvxEscQ(a.endReason||'ended')} by ${pvxEscQ(a.endedBy||a.updatedBy||'—')}`;
if(a.note) sub+=` · “${pvxEscQ(a.note)}”`;
const actions = history ?'':`<div class="ct-actions">
      ${url?`<a class="ct-mini" href="${pvxEscQ(url)}" target="_blank" rel="noopener" title="Open directory profile (opens the Directory; sign-in applies)"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>Profile</a>`:''}
      ${im&&im.phone?`<a class="ct-mini" href="tel:${pvxEscQ(im.phone)}">Call</a>`:''}${im&&im.email?`<a class="ct-mini" href="mailto:${pvxEscQ(im.email)}">Email</a>`:''}
      ${a.status==='pending'?`<button class="ct-mini primary" type="button" data-ct-do="confirm" data-ct-id="${a.id}" title="Recorded as confirmed by ${pvxEscQ(CURRENT_USER)}">Confirm handoff</button><button class="ct-mini danger" type="button" data-ct-do="decline" data-ct-id="${a.id}">Decline</button>`:''}
      ${a.status==='current'?`<button class="ct-mini danger" type="button" data-ct-do="end" data-ct-id="${a.id}">End</button>`:''}
    </div>`;
return`<div class="ct-row ${a.status}"><span class="dav ${a.staffKind==='service'?'ct-av svc':''}" style="${a.staffKind==='service'?'--ct-c:var(--ink-400);width:32px;height:32px;font-size:0.6875rem':'--dav-accent:'+s.color}" aria-hidden="true">${pvxEscQ(s.initials)}</span>
    <div class="ct-main"><div class="ct-name">${pvxEscQ(s.name)}<span class="ct-pill ${a.status}">${a.status}</span>${history?'':`<span class="muted" style="font-size:0.6875rem;font-weight:600">${pvxEscQ(CT_KIND_LABEL[a.staffKind]||'')}</span>`}</div><div class="ct-sub">${sub}</div></div>${actions}</div>`;
}
function ctShowForm(roleId){ ctFormRole=roleId; renderCareTeam(); }
/* ctFormHTML · its layers, innermost first: 1 #3 wrap   (PVX-N387; kept true by flow_t387) */
function ctFormHTML(p,roleId){ return pvxRun('ctFormHTML',ctFormHTML$base,this,arguments); }
function ctFormHTML$base(p, roleId){
const r=ctRole(roleId), roster=ctRoster();
const groups=[['doctor','Emergency doctors'],['im','Internal Medicine'],['liaison','Liaisons'],['service','Services']];
const allowed = r.mirror ? ['doctor'] : (roleId==='technician'? ['doctor','im','liaison'] : ['doctor','im','service']);
const opts=groups.filter(g=>allowed.includes(g[0])).map(g=>`<optgroup label="${g[1]}">${roster.filter(x=>x.kind===g[0]).map(x=>`<option value="${pvxEscQ(x.id)}">${pvxEscQ(x.name)}</option>`).join('')}</optgroup>`).join('');
return`<div class="ct-form" id="ctFormBox" role="group" aria-label="Assign ${pvxEscQ(r.label)}">
    <div class="ct-field"><label class="k" for="ctFormRoleSel">Role</label><select id="ctFormRoleSel">${CT_ROLES.map(x=>`<option value="${x.id}" ${x.id===roleId?'selected':''}>${pvxEscQ(x.label)}</option>`).join('')}</select></div>
    <div class="ct-field"><label class="k" for="ctFormWho">Who</label><select id="ctFormWho">${opts}${r.mirror?'':'<optgroup label="Other"><option value="__manual">Someone else — enter a name</option></optgroup>'}</select>
      ${r.mirror?'<div class="ct-hint">The primary clinician is Flow’s doctor assignment — choosing here updates it exactly like the Assigned doctor control.</div>':''}</div>
    <div class="ct-field" id="ctFormManualWrap" hidden><label class="k" for="ctFormManual">Name</label><input type="text" id="ctFormManual" maxlength="60" placeholder="Full name as it appears in the Directory"><div class="ct-hint">Technicians and other staff aren't in Flow's rosters yet; the name is linked to the Directory by slug, so spell it as it appears there.</div></div>
    <div class="ct-field"><label class="ct-check"><input type="checkbox" id="ctFormPending"> <span><b>Needs confirmation (handoff)</b> — the incoming person confirms before they become responsible. Until then the current assignment stays in place.</span></label></div>
    <div class="ct-field"><label class="k" for="ctFormNote">Note <span style="text-transform:none;letter-spacing:0;font-weight:600">(optional)</span></label><input type="text" id="ctFormNote" maxlength="160" placeholder="e.g. covering until 7 AM"></div>
    <div class="ct-foot"><button class="ct-mini" type="button" data-ct-do="cancel">Cancel</button><button class="ct-mini primary" type="button" data-ct-do="submit">Assign</button></div>
  </div>`;
}
function ctFormSubmit(){
const p=ctPatient(); if(!p) return;
const roleId=document.getElementById('ctFormRoleSel').value, who=document.getElementById('ctFormWho').value;
const pending=document.getElementById('ctFormPending').checked, note=document.getElementById('ctFormNote').value.trim();
let staff=null;
if(who==='__manual'){ const name=document.getElementById('ctFormManual').value.trim(); if(!name){ toast('Enter a name'); return; } staff={ id:'manual:'+docSlug(name), name, kind:'manual', initials:docInitials(name), color:'var(--ink-400)'}; }
else staff=ctStaff(who);
if(!staff){ toast('Choose who is responsible'); return; }
if(ctCurrent(p,roleId).some(a=>a.staffId===staff.id) && !pending){ toast(staff.name+' is already assigned'); return; }
ctFormRole=null;
ctAssign(p, roleId, staff, { pending, note });
renderCareTeam();
const c=document.getElementById('ctClose'); if(c) c.focus();
}
document.addEventListener('keydown', function(e){ if(e.key==='Escape'&& ctOpenId && document.getElementById('ctModal').classList.contains('open')){ e.stopPropagation(); closeCareTeam(); } }, true);
