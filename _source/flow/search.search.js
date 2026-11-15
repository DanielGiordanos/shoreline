
 
const searchEl=document.getElementById('globalSearch');
let searchHl=-1, searchFlat=[];
/* searchIndex · its layers, innermost first: 1 #54 wrap · 2 n347 wrap · 3 n348 wrap · 4 n349 wrap   (PVX-N387; kept true by flow_t387) */
function searchIndex(q){ return pvxRun('searchIndex',searchIndex$base,this,arguments); }
function searchIndex$base(q){
q=q.trim().toLowerCase(); if(!q) return [];
const res=[];
PATIENTS.forEach(p=>{
const l=liaison(p.liaison);
const hay=[p.name,p.last,p.owner,p.hid,p.reason,p.room,p.status,doc(p.doctor).name,l?l.name:''].join(' ').toLowerCase();
if(hay.includes(q)) res.push({kind:'Patient',color:STATUSES[p.status].color,initials:initials(p),
title:`${p.name} ${p.last}`,sub:`${p.species} · ${p.room} · ${p.hid}`,act:()=>{closeSearch();openDrawer(p.id);}});
});
DOCTORS.forEach(d=>{ if(d.name.toLowerCase().includes(q)) res.push({kind:'Doctor',color:d.color,initials:d.initials,
title:d.name,sub:`${activeCountForDoctor(d.id)} active patient${activeCountForDoctor(d.id)===1?'':'s'}`,
act:()=>{closeSearch();filters={status:null,prio:null,doctor:d.id,liaison:null};switchView('list');renderFilterBar();renderTable();}}); });
LIAISONS.forEach(l=>{ if(l.name.toLowerCase().includes(q)) res.push({kind:'Liaison',color:l.color,initials:l.initials,
title:l.name,sub:`${activeCountForLiaison(l.id)} patient${activeCountForLiaison(l.id)===1?'':'s'}`,
act:()=>{closeSearch();filters={status:null,prio:null,doctor:null,liaison:l.id};switchView('list');renderFilterBar();renderTable();}}); });
ROOMS.forEach(r=>{ if(r.toLowerCase().includes(q)){ const occ=PATIENTS.find(p=>isActive(p)&&p.room===r);
res.push({kind:'Room',icon:true,color:'var(--accent)',title:r,sub:occ?`${occ.name} · ${occ.status}`:'Available',
act:()=>{closeSearch(); occ?openDrawer(occ.id):switchView('rooms');}}); } });
return res;
}
function closeSearch(){const r=document.getElementById('searchResults');r.classList.remove('open');r.innerHTML='';searchHl=-1;searchFlat=[];}
/* renderSearch · its layers, innermost first: 1 #54 wrap · 2 n349 wrap   (PVX-N387; kept true by flow_t387) */
function renderSearch(q){ return pvxRun('renderSearch',renderSearch$base,this,arguments); }
function renderSearch$base(q){
const box=document.getElementById('searchResults');
if(!q.trim()){ closeSearch(); return; }
const all=searchIndex(q);
if(!all.length){ box.innerHTML=`<div class="sr-inner"><div class="sr-none">No matches for “${pvxEscQ(q)}”</div></div>`; box.classList.add('open'); positionSearchResults(); searchFlat=[]; return; }
const ql=q.trim().toLowerCase();
let kinds=['Filter','Patient','Doctor','Liaison','Room','Help'];
if(/^(room|lobby|comfort)/.test(ql) || ROOMS.some(r=>r.toLowerCase()===ql)) kinds=['Room','Filter','Patient','Doctor','Liaison','Help'];
let html=''; searchFlat=[]; let idx=0;
kinds.forEach(k=>{
const g=all.filter(r=>r.kind===k).slice(0,4); if(!g.length) return;
html+=`<div class="sr-group"><div class="sr-label">${k}${g.length>1?'s':''}</div>`;
g.forEach(r=>{ searchFlat.push(r);
const av = r.icon ?`<span class="sr-ic" style="background:${r.color}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${r.svg||ATTN_ICONS.room}</svg></span>`
:`<span class="sr-ic" style="background:${r.color}">${r.initials}</span>`;
html+=`<div class="sr-item" data-i="${idx}">${av}<div class="sr-main"><div class="sr-t">${pvxEscQ(r.title)}</div><div class="sr-s">${pvxEscQ(r.sub)}</div></div><div class="sr-kind">${r.kind}</div></div>`; idx++;
});
html+='</div>';
});
box.innerHTML='<div class="sr-inner">'+html+'</div>'; box.classList.add('open'); positionSearchResults();
box.querySelectorAll('.sr-item').forEach(n=>n.onclick=()=>searchFlat[+n.dataset.i].act());
}
function highlightSearch(){document.querySelectorAll('#searchResults .sr-item').forEach((n,i)=>n.classList.toggle('hl',i===searchHl));
const h=document.querySelector('#searchResults .sr-item.hl'); if(h) h.scrollIntoView({block:'nearest'});}
searchEl.addEventListener('input',e=>{ searchQ=e.target.value; renderSearch(searchQ); renderTable(); renderBoard(); });
searchEl.addEventListener('keydown',e=>{
if(e.key==='ArrowDown'){e.preventDefault();searchHl=Math.min(searchFlat.length-1,searchHl+1);highlightSearch();}
else if(e.key==='ArrowUp'){e.preventDefault();searchHl=Math.max(0,searchHl-1);highlightSearch();}
else if(e.key==='Enter'){e.preventDefault();const r=searchFlat[searchHl>=0?searchHl:0];if(r)r.act();}
else if(e.key==='Escape'){e.preventDefault();searchEl.value='';searchQ='';closeSearch();renderTable();renderBoard();searchEl.blur();}
});
document.addEventListener('click',e=>{ if(!e.target.closest('.search') && !e.target.closest('#searchResults')) closeSearch(); });
(function(){var _sr=document.getElementById('searchResults'); if(_sr && _sr.parentNode!==document.body) document.body.appendChild(_sr);})();
 
var activeSearchWrap=null;
document.querySelectorAll('.search .search-input').forEach(function(inp){ inp.addEventListener('focus',function(){ activeSearchWrap=inp.closest('.search-wrap'); }); });
function positionSearchResults(){var box=document.getElementById('searchResults'); if(!box||!box.classList.contains('open'))return; var bar=activeSearchWrap||document.querySelector('.search .search-wrap'); if(!bar)return; var r=bar.getBoundingClientRect(); box.style.top=(r.bottom+8)+'px'; box.style.left=r.left+'px'; box.style.width=r.width+'px'; box.style.maxHeight=Math.max(140,Math.min(520, window.innerHeight-r.bottom-24))+'px';}
window.addEventListener('resize',positionSearchResults); window.addEventListener('scroll',positionSearchResults,true);


(function(){
var r=document.getElementById('rdSearch'); if(!r) return;   /* PVX-N212: Rounds' search filters the census only; Return opens the first match */
r.addEventListener('keydown',function(e){
if(e.key==='Enter'&&!e.isComposing){ var row=[].slice.call(document.querySelectorAll('.rd-row[data-pid]')).filter(function(x){ return x.offsetParent!==null; })[0];
  if(row){ e.preventDefault(); var pid=row.getAttribute('data-pid'); if(typeof rdExpanded==='undefined'||rdExpanded!==pid) rdHandleAct('toggle',row.querySelector('.rd-rowmain')||row); else row.scrollIntoView({block:'nearest'}); } }
});
})();
document.addEventListener('keydown',e=>{
if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchEl.focus();}
if(e.key==='Escape'&& !e.defaultPrevented && document.activeElement!==searchEl){ if(document.getElementById('opsMenu').classList.contains('open')){ opsMenuClose(); return; } if(document.getElementById('triEditModal').classList.contains('open')){ closeTriageEdit(); return; } if(document.getElementById('shiftModal').classList.contains('open')){ closeShiftSetup(); return; } if(document.getElementById('apModal').classList.contains('open')){ closeAddPatient(); return; } if(document.getElementById('intakeModal').classList.contains('open')){ closeIntake(); return; } closeDrawer(); closeLocDrawer(); }
});
