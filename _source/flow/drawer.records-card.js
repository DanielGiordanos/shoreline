function recBadge(p){
const r=p.records; if(!r || r.status==='not_requested') return'';
const s=RECORDS_STATUS[r.status];
const last=r.history.length?r.history[r.history.length-1].at:r.requestedAt;
const title=`Records: ${s.label} · ${r.pdvm||'pDVM'} · updated ${last?fmtTime(last):'—'}`;
return`<span class="rec-badge rec-${r.status}" title="${title.replace(/"/g,'&quot;')}">${REC_ICON}</span>`;
}
function renderRecordsCard(p){
const mount=document.getElementById('recordsMount'); if(!mount) return;
const r=getRecords(p), st=r.status;
const chip=`<span class="rec-chip rec-${st}">${RECORDS_STATUS[st].label}</span>`;
const head=`<div class="rec-ic">${REC_ICON}</div><div class="rec-title">pDVM records</div>${chip}`;
if(st==='not_requested'){
mount.innerHTML=`<div class="rec-card"><div class="rec-head">${head}<button class="rec-req" id="recRequest" type="button">Request records</button></div></div>`;
document.getElementById('recRequest').onclick=()=>requestRecords(p);
return;
}
if(!recExpanded){
const ts=r.requestedAt?fmtTime(r.requestedAt):'—';
mount.innerHTML=`<div class="rec-card"><div class="rec-head">${head}<button class="rec-link" id="recEdit" type="button">Edit</button></div>
      <div class="rec-summary">${r.pdvm?pvxEscQ(r.pdvm):'pDVM not named'} · requested ${ts}</div></div>`;
document.getElementById('recEdit').onclick=()=>{ recExpanded=true; renderRecordsCard(p); };
return;
}
const hist=r.history.slice().reverse().map(h=>`<div class="rh-row"><span><b>${RECORDS_STATUS[h.status].label}</b></span><span>${pvxEscQ(h.by)} · ${fmtTime(h.at)}</span></div>`).join('');
mount.innerHTML=`<div class="rec-card"><div class="rec-head">${head}<button class="rec-link" id="recDone" type="button">Done</button></div>
    <div class="rec-body">
      <div class="rec-field"><label>pDVM / Hospital name</label>
        ${ r.pdvmInfo
          ? `<div class="hv-selected"><div class="hv-sel-main"><div class="hv-sel-name">${pvxEscQ(r.pdvmInfo.name)}</div><div class="hv-sel-sub">${pvxEscQ(r.pdvmInfo.town)}, CT</div></div><button class="hv-sel-change" id="recPdvmChange" type="button">Change</button></div>`
          : `<div class="bc-wrap"><input class="rec-input" id="recPdvm" placeholder="Search Connecticut hospitals…" autocomplete="off" value="${(r.pdvm||'').replace(/"/g,'&quot;')}"><div class="bc-panel hv-panel" id="recPdvmPanel"></div></div>` }
      </div>
      <div class="rec-grid2">
        <div class="rec-field"><label>Request method</label><div id="recMethodMount"></div></div>
        <div class="rec-field"><label>Status</label><div id="recStatusMount"></div></div>
      </div>
      <div class="rec-field"><label>Note <span style="color:var(--ink-400);font-weight:500">· optional</span></label><input class="rec-input" id="recNote" placeholder="Optional note" value="${(r.note||'').replace(/"/g,'&quot;')}"></div>
      <div class="rec-hist"><div class="rh-title">Activity</div>${hist||'<div class="rh-row"><span>No activity yet</span></div>'}</div>
    </div></div>`;
document.getElementById('recDone').onclick=()=>{ recExpanded=false; renderRecordsCard(p); };
if(r.pdvmInfo){
const chg=document.getElementById('recPdvmChange');
if(chg) chg.onclick=function(){ r.pdvm=''; r.pdvmInfo=null; renderRecordsCard(p);
const inp=document.getElementById('recPdvm'); if(inp) try{ inp.focus(); }catch(e){} };
} else {
const inp=document.getElementById('recPdvm');
if(inp) HospitalAutocomplete.attach(inp, document.getElementById('recPdvmPanel'), {
onSelect:function(h){ r.pdvm=h.name; r.pdvmInfo=h; renderRecordsCard(p); persist(); },
onInput:function(v){ r.pdvm=v; r.pdvmInfo=null; }
});
}
document.getElementById('recNote').oninput=e=>{ r.note=e.target.value; };
document.getElementById('recMethodMount').appendChild(createDropdown({
items: RECORD_METHODS.map(m=>({id:m,name:m,initials:'',color:'#7A98B8'})),
selectedId: r.method||null, placeholder:'Select method', searchPlaceholder:'Method…',
onSelect:id=>{ r.method=id; } }));
document.getElementById('recStatusMount').appendChild(createDropdown({
items: ['requested','received','partial','unable'].map(s=>({id:s,name:RECORDS_STATUS[s].label,initials:'',color:RECORDS_STATUS[s].color})),
selectedId: r.status, placeholder:'Status', searchPlaceholder:'Status…',
onSelect:id=>setRecordStatus(p,id) }));
}

 
function clinBar(p){
const t=getTriage(p), v=t.vitals||{};
const vv=(key)=>{ const val=v[key]; return (val!=null&&val!=='')?val:null; };
const temp=vv('temp'), hr=vv('hr'), weight=vv('weight');
const parts=[];
parts.push(`<span class="cb-stat"><b>${pvxEscQ(p.room)}</b><i>Location</i></span>`);
parts.push(`<span class="cb-stat cb-status"><b><span class="cb-statusdot" aria-hidden="true" style="color:${(STATUSES[p.status]||{}).color||'var(--ink-400)'}"></span>${pvxEscQ((STATUSES[p.status]||{}).label||p.status||'—')}</b><i>Status</i></span>`);   /* PVX-N144 FLOW-07 */
parts.push(`<span class="cb-pill"><span class="cb-statuscol"><span class="prio prio-${p.prio}" style="width:24px;height:24px;font-size:0.6875rem">${PRIO[p.prio].l}</span><i>Priority</i></span></span>`);
parts.push(`<span class="cb-stat"><b>${fmtWait(waitMinutes(p))}</b><i>In hospital</i></span>`);
const _u=(x,u)=>/^\s*\d+(\.\d+)?\s*$/.test(String(x))?String(x).trim()+(u==='°F'?' °F':' '+u):String(x);   /* PVX-N144 FLOW-07: units */
if(temp)   parts.push(`<span class="cb-stat"><b>${pvxEscQ(_u(temp,'°F'))}</b><i>Temp</i></span>`);
if(hr)     parts.push(`<span class="cb-stat"><b>${pvxEscQ(_u(hr,'bpm'))}</b><i>Heart rate</i></span>`);
if(weight) parts.push(`<span class="cb-stat"><b>${pvxEscQ(_u(weight,'kg'))}</b><i>Weight</i></span>`);
return parts.join('');
}
