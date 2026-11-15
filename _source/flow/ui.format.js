


function initials(p){const a=(p.name||'').trim()[0]||'';const b=(p.last||'').trim()[0]||'';return pvxEscQ((a+b).toUpperCase());}
function spCls(p){return p.species==='Feline'?'sp-fel':'sp-can';}
function spTag(p){return p.species==='Feline'?'FEL':'CAN';}
 
function pmInitial(p){ return pvxEscQ(((p&&p.name?String(p.name):'').trim()[0]||'?').toUpperCase()); }
function speciesCode(p){ if(!p||!p.species) return''; const s=String(p.species).trim().toLowerCase();
const map={feline:'FEL',cat:'FEL',canine:'CAN',dog:'CAN',avian:'AVI',bird:'AVI',reptile:'REP',rabbit:'RAB',exotic:'EXO',other:'EXO'};
return map[s]||'OTH'; }
function monoInner(p){ const sp=speciesCode(p); return'<span class="pm-mono" aria-hidden="true"><span class="pm-init">'+pmInitial(p)+'</span>'+(sp?'<span class="pm-sp">'+sp+'</span>':'')+'</span>'; }


function mono(p,variant,css){
if(!variant) return`<div class="pt-emoji ${spCls(p)}">${initials(p)}<span class="sp-tag">${spTag(p)}</span></div>`;
const pc=PRIO_CLR[p.prio]||PRIO_CLR[3];
return`<div class="pt-emoji ${variant} priority-p${p.prio} ${spCls(p)}" style="${css?css+';':''}--gc:${pc.c};--gcrgb:${pc.rgb}">${monoInner(p)}</div>`;
}
function waitMinutes(p){return Math.round((now - p.arrival)/60000);}
/* n336: the most urgent first, as the Client Display and the Attention center already do: priority (P1 first), then the longest wait, then the name */
function pvxByUrgency(a,b){ const pa=Number(a&&a.prio)||9, pb=Number(b&&b.prio)||9; if(pa!==pb) return pa-pb; const wa=+(a&&a.arrival)||0, wb=+(b&&b.arrival)||0; if(wa!==wb) return wa-wb; return String(a&&a.name||'').localeCompare(String(b&&b.name||'')); }

function roomSince(p){
if(p.roomSince) return p.roomSince;
const moves=(p.timeline||[]).filter(e=>/moved (to|from).*room|moved to room|moved to/i.test(e.label));
if(moves.length) return moves[moves.length-1].at;
return p.arrival;
}
function roomMinutes(p){return Math.max(0, Math.round((now - roomSince(p))/60000));}
function fmtWait(min){ min=Math.max(0,Math.round(min)); if(min<60) return min+'m'; const h=Math.floor(min/60),m=min%60; return m? h+'h '+m+'m': h+'h'; }
function fmtTime(d){let h=d.getHours(),m=d.getMinutes();const ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+String(m).padStart(2,'0')+' '+ap;}
function docAv(id){const d=doc(id);return`<span class="dav" style="--dav-accent:${d.color}">${d.initials}</span>`;}
function liaAv(id){const l=liaison(id);return l?`<span class="dav lav" style="color:${l.color};border-color:${l.color}">${l.initials}</span>`:'';}
function statusPill(s){return`<span class="pill st-${s.toLowerCase()}"><span class="d"></span>${s}</span>`;}
function eventColor(label){
for(const s of STAGE_ORDER){ if(STATUSES[s] && label.toLowerCase().includes(s.toLowerCase())) return STATUSES[s].color; }
if(/doctor|liaison/i.test(label)) return'var(--accent)';
if(/checked in|arriv/i.test(label)) return STATUSES.Waiting.color;
if(/discharg/i.test(label)) return STATUSES.Discharged.color;
return'var(--accent)';
}
function isActive(p){return !(p.completed===true || p.active===false || p.status==='Discharged'|| p.status==='Admitted'|| p.status==='Euthanized'|| p.status==='Deceased');}
function isCompleted(p){return p.status==='Discharged'|| p.status==='Admitted'|| p.status==='Euthanized'|| p.status==='Deceased';}
