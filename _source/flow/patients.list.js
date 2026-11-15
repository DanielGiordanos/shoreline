function renderFilterBar(){
const active=PATIENTS.filter(isActive);
const statusChips=FLOW_COLS.map(s=>{
const n=active.filter(p=>p.status===s).length;
return`<button class="chip ${filters.status===s?'active':''}" data-f="status" data-v="${s}" aria-pressed="${filters.status===s}">
      <span class="d" style="width:8px;height:8px;border-radius:50%;background:${STATUSES[s].color};display:inline-block"></span>${s}<span class="cnt">${n}</span></button>`;
}).join('');
const prioChips=[1,2,3].map(p=>`<button class="chip ${filters.prio===p?'active':''}" data-f="prio" data-v="${p}" aria-pressed="${filters.prio===p}"><span class="d" style="width:8px;height:8px;border-radius:50%;background:${PRIO[p].c};display:inline-block"></span>${PRIO[p].l}</button>`).join('');
const anyFilter=filters.status||filters.prio||filters.doctor||filters.liaison;
document.getElementById('filterBar').innerHTML =
statusChips +`<span style="width:1px;height:22px;background:var(--glass-hairline)"></span>`+
prioChips +
`<span class="grow"></span>`+
`<span style="width:1px;height:22px;background:var(--glass-hairline)"></span>`+
`<span id="docFilterMount"></span><span id="liaFilterMount"></span>`+
(anyFilter?`<button class="chip" data-f="clear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Clear</button>`:'') +
`<span class="result" id="resCount"></span>`;

document.querySelectorAll('#filterBar .chip').forEach(c=>c.onclick=()=>{
const f=c.dataset.f;
if(f==='clear'){filters={status:null,prio:null,doctor:null,liaison:null};}
else{const v=c.dataset.v;const val=f==='prio'?+v:v;filters[f]=filters[f]===val?null:val;}
renderFilterBar();renderTable();
});


document.getElementById('docFilterMount').appendChild(createDropdown({
items: [{id:'all', name:'All doctors', initials:'', color:'#B9C7D6'}, ...DOCTORS],
selectedId: filters.doctor ||'all',
placeholder:'All doctors', searchPlaceholder:'Search doctors…',
variant:'compact',
onSelect: id => { filters.doctor = (id==='all'? null : id); renderFilterBar(); renderTable(); }
}));

document.getElementById('liaFilterMount').appendChild(createDropdown({
items: [{id:'all', name:'All liaisons', initials:'', color:'#B9C7D6'},
{id:'none', name:'No liaison', initials:'', color:'#7A9BB5'}, ...LIAISONS],
selectedId: filters.liaison ||'all',
placeholder:'All liaisons', searchPlaceholder:'Search liaisons…',
variant:'compact',
onSelect: id => { filters.liaison = (id==='all'? null : id); renderFilterBar(); renderTable(); }
}));
}

/* renderTable · its layers, innermost first: 1 n349 after · 2 n354 after   (PVX-N387; kept true by flow_t387) */
function renderTable(){ return pvxRun('renderTable',renderTable$base,this,arguments); }
function renderTable$base(){
const rows=filtered().filter(isActive).sort(pvxByUrgency);
const rc=document.getElementById('resCount'); if(rc) rc.textContent=rows.length+' Patients';
const body=document.getElementById('tableBody');
document.getElementById('tableEmpty').classList.toggle('hidden',rows.length>0);
if(rows.length===0){
const _tot=PATIENTS.filter(isActive).length;
const _tt=document.getElementById('tableEmptyTitle'), _ts=document.getElementById('tableEmptySub');
if(_tot===0){ if(_tt)_tt.textContent='No patients currently checked in.'; if(_ts)_ts.textContent='Patients appear here after check-in.'; }
else { if(_tt)_tt.textContent='No patients match'; if(_ts)_ts.textContent='Try clearing a filter or search'; }
}
body.innerHTML=rows.map(p=>{
const w=waitMinutes(p);const wc=w>120?'crit':w>45?'warn':'';
return`<tr data-pid="${p.id}">
      <td><div class="pt-cell">${mono(p,'patient-medallion patient-medallion--compact')}
        <div class="nm"><b><button type="button" class="pvx-open" data-pid="${p.id}" aria-label="Open patient: ${pvxEscQ(p.name)} ${pvxEscQ(p.last)}">${pvxEscQ(p.name)} ${pvxEscQ(p.last)}</button>${resusBadge(p)}${recBadge(p)}${msgBadge(p)}${typeof fgInline==='function'?fgInline(p):''}</b><span>${pvxDot(pvxEscQ(p.species),pvxEscQ(formatPatientAge(p)))}</span></div></div></td>
      <td><div class="reason" title="${pvxEscQ((p.reasonProblems&&p.reasonProblems.length)?problemsToString(p.reasonProblems):(p.reason||''))}">${pvxEscQ(compactProblems(p))}</div></td>
      <td>${p.doctor==='unassigned'?'<span class="muted">Unassigned</span>':`<span class="doctag">${docAv(p.doctor)}${doc(p.doctor).name}</span>`}</td>
      <td><span class="loc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>${pvxEscQ(p.room)}</span></td>
      <td>${statusPill(p.status)}</td>
      <td><span class="prio prio-${p.prio}">${PRIO[p.prio].l}</span></td>
      <td class="muted">${fmtTime(p.arrival)}</td>
      <td><span class="wait ${wc}">${fmtWait(w)}</span></td>
    </tr>`;
}).join('');
body.querySelectorAll('tr').forEach(tr=>tr.onclick=()=>openDrawer(tr.dataset.pid));
}
