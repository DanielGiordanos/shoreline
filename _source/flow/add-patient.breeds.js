
function breedSpecies(){ const el=document.getElementById('apSpecies'); const v=el?el.value:''; return v==='Feline'?'Feline':(v==='Canine'?'Canine':null); }
function breedSource(){ const sp=breedSpecies(); return sp==='Feline'?FELINE_BREEDS.map(b=>b.name):(sp==='Canine'?CANINE_BREEDS:null); }


function _bnorm(s){ return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,''); }
function _buildBreedIndex(arr){ return arr.map(b=>{ const terms=[]; const add=a=>(a||[]).forEach(x=>{ const n=_bnorm(x); if(n&&terms.indexOf(n)<0) terms.push(n); }); add(b.aliases); add(b.variants); add(b.search_terms); return {name:b.name,id:b.id,nameNorm:_bnorm(b.name),terms:terms}; }); }
const FELINE_INDEX=_buildBreedIndex(FELINE_BREEDS);
const CANINE_INDEX=_buildBreedIndex(CANINE_BREEDS);
const FELINE_BY_NAME={},FELINE_BY_ID={}; FELINE_BREEDS.forEach(b=>{ FELINE_BY_NAME[b.name]=b; if(b.id) FELINE_BY_ID[b.id]=b; });
const CANINE_BY_NAME={},CANINE_BY_ID={}; CANINE_BREEDS.forEach(b=>{ CANINE_BY_NAME[b.name]=b; if(b.id) CANINE_BY_ID[b.id]=b; });
function breedMeta(k){ return FELINE_BY_NAME[k]||FELINE_BY_ID[k]||CANINE_BY_NAME[k]||CANINE_BY_ID[k]||null; }
function felineBreedMeta(k){ return FELINE_BY_NAME[k]||FELINE_BY_ID[k]||null; }


/* breedFuzzyIndexed · its layers, innermost first: 1 #57 wrap   (PVX-N387; kept true by flow_t387) */
function breedFuzzyIndexed(INDEX,q){ return pvxRun('breedFuzzyIndexed',breedFuzzyIndexed$base,this,arguments); }
function breedFuzzyIndexed$base(INDEX,q){
const ql=_bnorm(q); if(!ql) return []; const rawL=q.toLowerCase(); const res=[];
for(let i=0;i<INDEX.length;i++){ const it=INDEX[i]; let score=-1;
if(it.nameNorm===ql) score=1000; else if(it.nameNorm.indexOf(ql)===0) score=900; else if(it.nameNorm.indexOf(ql)>=0) score=500;
if(score<800){ for(let t=0;t<it.terms.length;t++){ if(it.terms[t]===ql){ score=800; break; } } }
if(score<700){ for(let t=0;t<it.terms.length;t++){ if(it.terms[t].indexOf(ql)===0){ score=Math.max(score,700); } } }
if(score<400){ for(let t=0;t<it.terms.length;t++){ if(it.terms[t].indexOf(ql)>=0){ score=Math.max(score,400); break; } } }
if(score<0 && bcSubseq(it.nameNorm,ql)) score=100;
if(score>=0){ let ranges=null; const idxn=it.name.toLowerCase().indexOf(rawL); if(idxn>=0) ranges=[[idxn,q.length]]; res.push({name:it.name,score:score,ranges:ranges,len:it.name.length}); }
}
res.sort((a,b)=> b.score-a.score || a.len-b.len || a.name.localeCompare(b.name));
return res.map(r=>({name:r.name, html:bcHighlight(r.name,r.ranges), pinned:false}));
}
function breedOrdered(sp, source){
const pins=BREED_PINS[sp]||[];
const rest=source.filter(b=>pins.indexOf(b)<0).slice().sort((a,b)=>a.localeCompare(b));
return pins.concat(rest);
}
function bcWordBoundary(low,q){ let i=low.indexOf(q); while(i>0){ const c=low[i-1]; if(c===' '||c==='-'||c==='/') return i; i=low.indexOf(q,i+1); } return -1; }
function bcSubseq(low,q){ const r=[]; let qi=0; for(let i=0;i<low.length&&qi<q.length;i++){ if(low[i]===q[qi]){ r.push([i,1]); qi++; } } return qi===q.length?r:null; }
function bcHighlight(name, ranges){
if(!ranges||!ranges.length) return pvxEscQ(name);
const mark=new Array(name.length).fill(false);
ranges.forEach(r=>{ for(let i=r[0];i<r[0]+r[1];i++) if(i>=0&&i<name.length) mark[i]=true; });
let out='', run='', on=false;
for(let i=0;i<name.length;i++){ if(mark[i]!==on){ out += on?('<span class="bc-hl">'+pvxEscQ(run)+'</span>'):pvxEscQ(run); run=''; on=mark[i]; } run+=name[i]; }
out += on?('<span class="bc-hl">'+pvxEscQ(run)+'</span>'):pvxEscQ(run);
return out;
}
function breedFuzzy(list,q){
const ql=q.toLowerCase(); const res=[];
list.forEach(name=>{
const low=name.toLowerCase(); let score=-1, ranges=null;
const idx=low.indexOf(ql);
if(idx===0){ score=100; ranges=[[0,ql.length]]; }
else { const wb=bcWordBoundary(low,ql);
if(wb>0){ score=80; ranges=[[wb,ql.length]]; }
else if(idx>0){ score=60; ranges=[[idx,ql.length]]; }
else { const ss=bcSubseq(low,ql); if(ss){ score=30; ranges=ss; } } }
if(score>=0) res.push({name,score,ranges});
});
res.sort((a,b)=> b.score-a.score || a.name.length-b.name.length || a.name.localeCompare(b.name));
return res.map(r=>({name:r.name, html:bcHighlight(r.name,r.ranges), pinned:false}));
}
function breedCompute(q){
const sp=breedSpecies(); if(!sp) return null;
q=(q||'').trim();
const DS = sp==='Feline'?FELINE_BREEDS:CANINE_BREEDS;
const IDX = sp==='Feline'?FELINE_INDEX:CANINE_INDEX;
const pins = BREED_PINS[sp]||[];
if(!q){ const rest=DS.map(b=>b.name).filter(n=>pins.indexOf(n)<0).sort((a,b)=>a.localeCompare(b));
return pins.concat(rest).map(n=>({name:n, html:pvxEscQ(n), pinned:pins.indexOf(n)>=0})); }
return breedFuzzyIndexed(IDX,q);
}
function breedHls(){ const opts=bcPanel().querySelectorAll('.bc-opt'); opts.forEach((o,i)=>o.classList.toggle('hl', i===bcHl)); const el=opts[bcHl]; if(el) el.scrollIntoView({block:'nearest'}); }
function breedRefresh(){
const p=bcPanel(); if(!p) return;
const list=breedCompute(bcInput().value);
if(list===null){ breedClose(); return; }
bcResults=list; if(bcHl>=list.length) bcHl=list.length-1;
if(!list.length){ p.innerHTML='<div class="bc-empty">No matching breeds — “'+pvxEscQ(bcInput().value.trim())+'” will be used as entered.</div>'; }
else {
p.innerHTML='<div class="bc-list">'+list.map((r,i)=>'<div class="bc-opt'+(i===bcHl?' hl':'')+'" data-i="'+i+'"><span class="bc-name">'+r.html+'</span>'+(r.pinned?'<span class="bc-pin">Common</span>':'')+'</div>').join('')+'</div>';
p.querySelectorAll('.bc-opt').forEach(o=>{
o.onmousedown=e=>{ e.preventDefault(); breedSelect(bcResults[+o.dataset.i].name); };
o.onmouseenter=()=>{ bcHl=+o.dataset.i; breedHls(); };
});
}
p.classList.add('open'); bcOpen=true;
}
function breedSelect(name){ const bi=bcInput(); bi.value=name; breedClose(); bi.focus(); }
function breedClose(){ const p=bcPanel(); if(p) p.classList.remove('open'); bcOpen=false; bcHl=-1; }
function breedKey(e){
if(!bcOpen){ if(e.key==='ArrowDown'){ bcHl=-1; breedRefresh(); } return; }
const n=bcResults.length;
if(e.key==='ArrowDown'){ e.preventDefault(); if(n){ bcHl=(bcHl+1)%n; breedHls(); } }
else if(e.key==='ArrowUp'){ e.preventDefault(); if(n){ bcHl=(bcHl-1+n)%n; breedHls(); } }
else if(e.key==='Enter'){ if(bcHl>=0 && bcResults[bcHl]){ e.preventDefault(); breedSelect(bcResults[bcHl].name); } else { breedClose(); } }
else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); breedClose(); }
else if(e.key==='Tab'){ breedClose(); }
}
