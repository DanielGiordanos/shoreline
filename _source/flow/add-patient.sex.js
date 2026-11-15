
 
const SEX_OPTIONS=["Male (Neutered)","Female (Spayed)","Male (Intact)","Female (Intact)","Unknown"];
let sxResults=[], sxHl=-1, sxOpen=false;
const sxPanel=()=>document.getElementById('apSexPanel');
const sxInput=()=>document.getElementById('apSex');
function sxCompute(q){
q=(q||'').trim().toLowerCase();
const list = q ? SEX_OPTIONS.filter(o=>o.toLowerCase().includes(q)) : SEX_OPTIONS.slice();
return list.map(name=>{
let html;
if(q){ const i=name.toLowerCase().indexOf(q);
html = pvxEscQ(name.slice(0,i))+'<span class="bc-hl">'+pvxEscQ(name.slice(i,i+q.length))+'</span>'+pvxEscQ(name.slice(i+q.length)); }
else html=pvxEscQ(name);
return {name, html};
});
}
function sxHls(){ const opts=sxPanel().querySelectorAll('.bc-opt'); opts.forEach((o,i)=>o.classList.toggle('hl',i===sxHl)); const el=opts[sxHl]; if(el) el.scrollIntoView({block:'nearest'}); }
function sxRefresh(){
const p=sxPanel(); if(!p) return;
const list=sxCompute(sxInput().value);
sxResults=list; if(sxHl>=list.length) sxHl=list.length-1;
if(!list.length){ p.innerHTML='<div class="bc-empty">No matching option</div>'; }
else {
p.innerHTML='<div class="bc-list">'+list.map((r,i)=>'<div class="bc-opt'+(i===sxHl?' hl':'')+'" data-i="'+i+'"><span class="bc-name">'+r.html+'</span></div>').join('')+'</div>';
p.querySelectorAll('.bc-opt').forEach(o=>{ o.onmousedown=e=>{ e.preventDefault(); sxSelect(sxResults[+o.dataset.i].name); }; o.onmouseenter=()=>{ sxHl=+o.dataset.i; sxHls(); }; });
}
p.classList.add('open'); sxOpen=true;
}
function sxSelect(name){ const el=sxInput(); el.value=name; sxClose(); el.focus(); }
function sxClose(){ const p=sxPanel(); if(p) p.classList.remove('open'); sxOpen=false; sxHl=-1;
const el=sxInput(); if(el && el.value && SEX_OPTIONS.indexOf(el.value)<0) el.value=''; }
function sxKey(e){
if(!sxOpen){ if(e.key==='ArrowDown'){ sxHl=-1; sxRefresh(); } return; }
const n=sxResults.length;
if(e.key==='ArrowDown'){ e.preventDefault(); if(n){ sxHl=(sxHl+1)%n; sxHls(); } }
else if(e.key==='ArrowUp'){ e.preventDefault(); if(n){ sxHl=(sxHl-1+n)%n; sxHls(); } }
else if(e.key==='Enter'){ if(sxHl>=0 && sxResults[sxHl]){ e.preventDefault(); sxSelect(sxResults[sxHl].name); } else { sxClose(); } }
else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); sxClose(); }
else if(e.key==='Tab'){ sxClose(); }
}
