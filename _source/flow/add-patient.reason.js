


const ReasonVisitAutocomplete = (function(){
const norm = s => String(s||'').toLowerCase().replace(/[’']/g,'');
function rank3(text,q){ const t=norm(text);
if(t.startsWith(q)) return 0;
if(t.split(/[^a-z0-9]+/).some(w=>w.startsWith(q))) return 1;
if(t.includes(q)) return 2; return -1; }
function score(item,q){
const rl=rank3(item.label,q); if(rl>=0) return [rl,null];
let best=9, via=null;
for(const k of item.keywords){ const r=rank3(k,q); if(r>=0 && r+3<best){ best=r+3; via=k; } }
if(via) return [best,via];
if(norm(item.category).includes(q)) return [6,null];
return [9,null]; }
function highlight(text,q){ const t=norm(text); const i=q?t.indexOf(q):-1;
if(i<0) return pvxEsc(text);
return pvxEsc(text.slice(0,i))+'<mark>'+pvxEsc(text.slice(i,i+q.length))+'</mark>'+pvxEsc(text.slice(i+q.length)); }
function search(raw){ const q=norm(String(raw).trim()); if(!q) return [];
return REASON_VISIT_DATA.map(it=>{ const [s,via]=score(it,q); return {it,s,via}; })
.filter(x=>x.s<9).sort((a,b)=> a.s-b.s || a.it.rank-b.it.rank).slice(0,8); }
function attach(input, listEl, opts){
opts=opts||{}; let current=[], active=-1, open=false;
function close(){ open=false; active=-1; listEl.classList.remove('open'); input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); }
function render(){
const q=norm(input.value.trim()); active=-1;
if(!q){ current=[]; close(); return; }
current=search(input.value);
listEl.innerHTML = current.length ? current.map((x,i)=>
'<li class="rv-opt" role="option" id="rvOpt'+i+'" data-i="'+i+'">'
+'<div class="rv-r1"><span class="rv-lbl">'+highlight(x.it.label,q)+'</span>'
+'<span class="rv-chip">'+pvxEsc(x.it.category)+'</span></div>'
+(x.via?'<div class="rv-via">Matched: “<b>'+highlight(x.via,q)+'</b>”</div>':'')
+'<div class="rv-desc">'+pvxEsc(x.it.description)+'</div></li>'
).join('') :'<li class="rv-none">No match — this reason will be saved as entered.</li>';
open=true; listEl.classList.add('open'); input.setAttribute('aria-expanded','true');
}
function choose(i){ const x=current[i]; if(!x) return; input.value=x.it.label; if(opts.onSelect) opts.onSelect(x.it); close(); }
let wait=0;   /* PVX-N213: suggestions after two letters, or a short pause on one (HIG Token fields) */
input.addEventListener('input', function(){ if(opts.onInput) opts.onInput(input.value); clearTimeout(wait);
  const n=input.value.trim().length; if(n===1){ close(); wait=setTimeout(function(){ if(input.value.trim().length===1&&document.activeElement===input) render(); },400); } else render(); });
input.addEventListener('focus', function(){ if(input.value.trim()) render(); });
input.addEventListener('keydown', function(e){
const els=listEl.querySelectorAll('li.rv-opt');
if(e.key==='ArrowDown'){ if(!open && input.value.trim()){ render(); return; } active=Math.min(active+1, els.length-1); }
else if(e.key==='ArrowUp'){ active=Math.max(active-1, 0); }
else if(e.key==='Enter'){ if(open && active>=0 && els.length){ e.preventDefault(); choose(active); } return; }
else if(e.key==='Escape'){ if(open){ e.preventDefault(); close(); } return; }
else return;
e.preventDefault();
els.forEach((o,i)=> o.classList.toggle('active', i===active));
if(active>=0) input.setAttribute('aria-activedescendant','rvOpt'+active);
if(els[active]) els[active].scrollIntoView({block:'nearest'});
});
listEl.addEventListener('mousedown', function(e){ const li=e.target.closest('li.rv-opt'); if(li){ e.preventDefault(); choose(+li.dataset.i); } });
if(!attach._away){ attach._away=true; document.addEventListener('click', function(e){ if(!e.target.closest('.rv-combo')) document.querySelectorAll('.rv-list.open').forEach(l=>l.classList.remove('open')); }); }
return { close:close, render:render };
}
return { search:search, attach:attach };
})();

let apWeightKg=null;



const _rn = s => String(s||'').toLowerCase().replace(/['’]/g,'');

(function(){
try{
const ne=REASON_VISIT_DATA.find(x=>x.id==='not-eating');
if(ne){ ne.id='anorexia'; ne.label='Anorexia';
ne.keywords=['not eating','wont eat','no appetite','hasnt eaten','stopped eating','refusing food','anorexia','not eaten'].concat(ne.keywords||[]); }
if(!REASON_VISIT_DATA.some(x=>x.id==='hyporexia'))
REASON_VISIT_DATA.push({ id:'hyporexia', rank:4.5, label:'Hyporexia', category:'General & Systemic',
keywords:['barely eating','eating less','poor appetite','reduced appetite','decreased appetite','picky','not eating much','eating a little','hyporexia'],
description:'Reduced or partial appetite — eating less than normal'});
const vo=REASON_VISIT_DATA.find(x=>x.id==='vomiting'); if(vo){ ['vomited','threw up','puked','vomits','throwing up'].forEach(function(k){ if(vo.keywords.indexOf(k)<0) vo.keywords.push(k); }); }
const co=REASON_VISIT_DATA.find(x=>x.id==='persistent-cough'); if(co){ ['cough','coughs','coughed'].forEach(function(k){ if(co.keywords.indexOf(k)<0) co.keywords.push(k); }); }
const an=REASON_VISIT_DATA.find(x=>x.id==='anorexia'); if(an){ ['will not eat','has not eaten','refuses food','food refusal','not touching food','no interest in food','no interest in treats','wont take treats','not taking treats','didnt eat','off food','off feed','inappetence','anorexic','loss of appetite'].forEach(function(k){ if(an.keywords.indexOf(k)<0) an.keywords.push(k); }); }

const bu=REASON_VISIT_DATA.find(x=>x.id==='blood-in-urine'); if(bu){ bu.id='hematuria'; bu.label='Hematuria';
['bloody urine','blood in urine','blood when peeing','blood when urinating','peeing blood','urinating blood','red urine','pink urine','urine looks bloody','blood from urine','hematuria','haematuria'].forEach(function(k){ if(bu.keywords.indexOf(k)<0) bu.keywords.push(k); }); }
function _addReason(o){ if(!REASON_VISIT_DATA.some(x=>x.id===o.id)) REASON_VISIT_DATA.push(o); }
_addReason({ id:'bleeding-ruptured-mass', rank:79.5, label:'Bleeding / Ruptured Mass', category:'Dermatologic / Mass',
keywords:['mass on head popped','mass popped','popped lump','popped tumor','mass burst','mass ruptured','ruptured mass','ruptured lump','bleeding mass','mass bleeding','growth bleeding','bleeding growth','tumor bleeding','bleeding tumor','lump bleeding','bleeding lump','mass opened','mass broke open','growth opened','tumor opened','ulcerated mass','open mass'],
description:'A mass, lump, growth, or tumor that has ruptured, opened, ulcerated, or is actively bleeding'});
_addReason({ id:'urinary-tract-signs', rank:25.5, label:'Urinary Tract Signs', category:'Urinary',
keywords:['poss uti','possible uti','uti','urinary infection','possible urinary infection','urinary issue','urinary problem','urinary symptoms','frequent urination','peeing frequently','peeing a lot','peeing','urinating','urinating frequently','straining to urinate','straining to pee','difficulty urinating','difficulty peeing','painful urination','pain when urinating','urinary accidents','peeing in house','urinating in house','small amounts of urine','frequent small urinations','urinary discomfort'],
description:'Urinary signs such as straining, frequency, inappropriate urination, discomfort, or suspected urinary tract disease'});
_addReason({ id:'suspected-toxin-exposure', rank:16.5, label:'Suspected Toxin Exposure', category:'Toxicology',
keywords:['toxicity','toxin','toxic exposure','possible toxin','suspected toxin','poison','poisoning','poisoned','possible poisoning','ate something toxic','ingested toxin','toxin ingestion','toxic ingestion','possible ingestion','got into something','got into medication','ate medication','ate poison','chemical exposure','toxic substance','possible toxic substance'],
description:'Known or suspected exposure to a potentially toxic substance'});
}catch(e){}
})();

const EPISODE_LABEL_IDS=new Set(['seizures','collapse-fainting','diarrhea','bloody-diarrhea','tremors-shaking','fall-from-height']);


const REASON_NORMALIZE=[
{ id:'hyporexia', label:'Hyporexia', category:'General & Systemic',
re:[/barely (eating|eaten)/,/eating less/,/eats less/,/poor appetite/,/reduced appetite/,/decreased appetite/,/low appetite/,/\bpicky/,/not eating much/,/eating a little/,/hardly eating/,/eating poorly/,/hyporexi/] },
{ id:'anorexia', label:'Anorexia', category:'General & Systemic',
re:[/not eating/,/not eaten/,/not been eating/,/wont eat/,/will not eat/,/no appetite/,/hasnt eaten/,/has not eaten/,/stopped eating/,/quit eating/,/refus\w* (to )?eat/,/wont touch food/,/anorexi/,/loss of appetite/,/off (his |her |their )?(food|feed)/,/inappeten/] },

{ id:'bleeding-ruptured-mass', label:'Bleeding / Ruptured Mass', category:'Dermatologic / Mass',
re:[/(mass|tumou?r|growth|lump|nodule)\b[\s\S]*(bleed|ruptur|popp|burst|broke open|broke|opened|open|ulcerat|drain)/,
/(bleed|ruptur|popp|burst|ulcerat)[\s\S]*(mass|tumou?r|growth|lump|nodule)/] },


{ id:'suspected-toxin-exposure', label:'Suspected Toxin Exposure', category:'Toxicology',
re:[/^toxicity$/,/^toxin$/,/^toxic exposure$/,/^possible toxin$/,/^suspected toxin$/,/^poison$/,/^poisoned$/,/^poisoning$/,/^possible poisoning$/,/^chemical exposure$/,/^ate something toxic$/,/^got into something$/,/^toxic substance$/] }
];
function normalizeReason(sym){ const t=_rn(sym); for(const r of REASON_NORMALIZE){ if(r.re.some(rx=>rx.test(t))) return r; } return null; }
function _durUnit(u){ u=u.toLowerCase();
if(/^(h|hr|hrs|hour|hours)$/.test(u)) return'hours';
if(/^(d|day|days)$/.test(u)) return'days';
if(/^(w|wk|wks|week|weeks)$/.test(u)) return'weeks';
if(/^(min|mins|minute|minutes)$/.test(u)) return'minutes';
if(/^(mo|mos|month|months)$/.test(u)) return'months';
if(/^(y|yr|yrs|year|years)$/.test(u)) return'years';
return u; }
function _durText(v,u){ const sing={hours:'hour',days:'day',weeks:'week',minutes:'minute',months:'month',years:'year'}[u]||u; return v+' '+(v===1? sing : u); }
const _WORDNUM={once:1,twice:2,thrice:3,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};


function parseModifiers(raw){
const orig=String(raw||''); let w=orig.toLowerCase(); const ranges=[];
function take(re){ const m=w.match(re); if(m){ const i=m.index; ranges.push([i,i+m[0].length]); w=w.slice(0,i)+' '.repeat(m[0].length)+w.slice(i+m[0].length); } return m; }
let durationValue=null,durationUnit=null,durationText=null, freqCount=null,freqText=null, onsetText=null, m;

m=take(/\bsince\s+(?:this (?:morning|afternoon|evening|night)|last (?:night|week|weekend|month)|yesterday|tonight|midnight|noon|monday|tuesday|wednesday|thursday|friday|saturday|sunday|[a-z]+day)\b/);
if(!m) m=take(/\b(?:overnight|last night|this (?:morning|afternoon|evening)|today|tonight|all day|all night|all morning|this week)\b/);
if(m) onsetText=orig.slice(m.index, m.index+m[0].length).trim();

m=take(/\b(\d+)\s*(?:x\b|times\b|time\b|episodes?\b|bouts?\b|epis\b)/);
if(m){ freqCount=parseInt(m[1],10); }
if(freqCount==null){ m=take(/\bx\s*(\d+)(?!\s*(?:h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|mo|month|months|y|yr|year|years|min|minute|minutes)\b)/); if(m) freqCount=parseInt(m[1],10); }
if(freqCount==null){ m=take(/\b(once|twice|thrice)\b/); if(m) freqCount=_WORDNUM[m[1]]; }
if(freqCount==null){ m=take(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+times?\b/); if(m) freqCount=_WORDNUM[m[1]]; }
if(freqCount==null){ m=take(/\b(several|multiple|many|numerous|a few|a couple|couple)\s+times?\b/); if(m) freqText=(m[1]+' times'); }

m=take(/\b(?:for\s+|x)?(\d+)\s*(h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|min|mins|minute|minutes|mo|mos|month|months|y|yr|yrs|year|years)\b/);
if(m){ durationValue=parseInt(m[1],10); durationUnit=_durUnit(m[2]); durationText=_durText(durationValue,durationUnit); }
if(durationText==null){ m=take(/\b(?:for\s+)?a few\s+(minutes|mins|hours|hrs|days|weeks|months)\b/); if(m){ const u=_durUnit(m[1]); durationUnit=u; durationText='a few '+u; } }

ranges.sort((a,b)=>a[0]-b[0]); let rem='', idx=0;
ranges.forEach(function(r){ if(r[0]>idx) rem+=orig.slice(idx,r[0]); idx=Math.max(idx,r[1]); });
rem+=orig.slice(idx);
rem=rem.replace(/\s+/g,' ').replace(/\b(for|x)\b\s*$/i,'').replace(/^[\s,;:-]+/,'').replace(/[\s,;:-]+$/,'').trim();
return { durationValue, durationUnit, durationText, freqCount, freqText, onsetText, remaining:rem };
}
function _freqUnit(id){ return EPISODE_LABEL_IDS.has(id) ?'episodes':'times'; }
function makeProblem(id,label,category,mods,original){
return { id:id||null, label:label, category:category||null,
durationValue:mods.durationValue, durationUnit:mods.durationUnit, durationText:mods.durationText,
frequencyCount:(mods.freqCount==null?null:mods.freqCount), frequencyLabel:(mods.freqCount==null?null:_freqUnit(id)),
frequencyText:mods.freqText||null, onsetText:mods.onsetText||null, originalInput:original };
}
/* PVX-N213: a token stands for what was typed - a word becomes a named problem only on a label, a label part,
   a whole keyword or a known form of one (collapsed / collapse, fainted / fainting); a prefix only suggests */
const _RV_FILL=new Set(['a','an','the','he','she','it','they','his','her','its','my','our','their','is','was','has','had','have','been','be','very','really','some','just','and','or','with','of','to','in','on','at','for','from','when','while','that','this','after','before','now','still','also','again','being','got','getting','keeps','kept','seems','seem','started','starting','lot','bit']);
function _rvWords(s){ return _rn(s).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean); }
function _rvStem(w){ for(const x of ['ing','ed','es','ic','y','s','e']){ if(w.length-x.length>=4&&w.endsWith(x)) return w.slice(0,-x.length); } return w; }
function _rvCore(s){ return _rvWords(s).filter(w=>!_RV_FILL.has(w)).map(_rvStem).join(' '); }
function _rvCands(it){ return [it.label].concat(String(it.label).split(/\s*\/\s*/)).concat(it.keywords||[]); }
function _rvScore(sym,it){ const qc=_rvCore(sym); if(!qc) return 0; let best=0; const whole=[it.label].concat(it.keywords||[]);
  _rvCands(it).forEach(function(c){ const cc=_rvCore(c); if(cc&&cc===qc) best=Math.max(best,1000+cc.length); });   /* the whole entry, any label part */
  whole.forEach(function(c){ const cc=_rvCore(c); if(cc&&cc.length>=4&&qc.indexOf(cc+' ')===0) best=Math.max(best,cc.length); });   /* starts with a whole label or keyword */
  return best; }
function isConfidentReason(sym, item){ return _rvScore(sym,item)>0; }
function findConfidentReason(sym){ let best=null, bs=0; for(const it of REASON_VISIT_DATA){ const sc=_rvScore(sym,it); if(sc>bs){ bs=sc; best=it; } } return best; }
/* the typed words the match didn't use stay on the token */
function _rvExtra(sym, vocab){ const used=new Set(); (vocab||[]).forEach(function(t){ _rvWords(t).forEach(function(w){ used.add(_rvStem(w)); }); });
  const bare=w=>_rn(w).replace(/[^a-z0-9]+/g,'');
  const all=String(sym).replace(/[,;:]+/g,' ').split(/\s+/).filter(Boolean), first=all.findIndex(function(w){ const n=bare(w); return n&&used.has(_rvStem(n)); });
  const before=all.slice(0,Math.max(0,first)).some(function(w){ const n=bare(w); return n&&!_RV_FILL.has(n); });
  const keep=all.filter(function(w){ const n=bare(w); return n&&!used.has(_rvStem(n)); });
  while(keep.length&&_RV_FILL.has(bare(keep[0]))) keep.shift();
  while(keep.length&&_RV_FILL.has(bare(keep[keep.length-1]))) keep.pop();
  const hits=all.filter(function(w){ const n=bare(w); return n&&!_RV_FILL.has(n)&&used.has(_rvStem(n)); }).length, rest=keep.filter(function(w){ return !_RV_FILL.has(bare(w)); }).length;
  return keep.length?{text:keep.join(' '),before:before||rest>hits}:null; }   /* more left over than matched: keep the typed words */

function matchByAlias(sym){
const q=' '+_rn(sym).replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()+' ';
let best=null, bestLen=0;
for(const it of REASON_VISIT_DATA){
const cands=[it.label].concat(it.keywords||[]);
for(const c of cands){ const cc=_rn(c).replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
if(cc.length<3) continue;
if(q.indexOf(' '+cc+' ')>=0 && cc.length>bestLen){ best=it; bestLen=cc.length; } }
}
return best ? { item:best, len:bestLen } : null;
}

function parseProblem(raw){
const original=String(raw).trim();
const mods=parseModifiers(original);
const sym=(mods.remaining||original).trim();
function made(id,label,cat,vocab){ const pr=makeProblem(id,label,cat,mods,original), ex=_rvExtra(sym,vocab);   /* PVX-N213: nothing typed is dropped */
  if(ex){ if(/^\d+$/.test(ex.text)&&pr.frequencyCount==null){ pr.frequencyCount=+ex.text; pr.frequencyLabel=_freqUnit(id); }   /* "3 seizures" */
    else if(ex.before) pr.typedLabel=sym;   /* "trying to vomit": the token keeps the typed words (still filed under the problem) */
    else pr.extra=ex.text; }
  return pr; }
const norm=normalizeReason(sym);
if(norm){ const t=_rn(sym); let span=''; for(const rx of norm.re){ const m=t.match(rx); if(m){ span=m[0]; break; } } return made(norm.id,norm.label,norm.category,[norm.label,span]); }
const hit=findConfidentReason(sym);
if(hit) return made(hit.id,hit.label,hit.category,_rvCands(hit));
/* a loose phrase match never goes through a negation ("not vomiting" stays as typed) */
if(!/\b(no|not|never|without|isnt|hasnt|doesnt|didnt|denies)\b/.test(_rn(sym))){
const am=matchByAlias(sym);
if(am){ const symN=_rn(sym); const cov=am.len/Math.max(1,symN.length); const words=symN.split(/\s+/).filter(Boolean).length;
if(cov>=0.5 || words<=4){ const it=am.item; return made(it.id,it.label,it.category,_rvCands(it)); } }
}
return makeProblem(null,(sym||original),null,mods,original);
}



/* PVX-N213: only true modifiers stay with the problem before; complaints of their own (lethargic, limping, weak) split */
const _SPLIT_STOP=new Set(['bleeding','bloody','painful','pain','swollen','hot','red','open','ruptured','popped','draining','oozing','sore','itchy','worse','worsening']);
function _rvModOnly(p){ const r=parseModifiers(p).remaining.trim(); if(!r) return true; const w=_rvWords(r); return w.length===1&&_SPLIT_STOP.has(w[0])&&!findConfidentReason(r)&&!normalizeReason(r); }
function splitComplaints(raw){
const s=String(raw||'').replace(/\bv\s*\+/gi,' ; vomiting ; ').replace(/\s+&\s+/g,' ; ');
const base=s.split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);
const out=[];
base.forEach(function(seg0){
  /* commas: a part that is a problem of its own starts a new token; "3 times", "since this morning", "bloody" stay */
  const segs=[]; let lead='';
  seg0.split(/\s*,\s*/).filter(Boolean).forEach(function(c){
    if(_rvModOnly(c)){ if(segs.length) segs[segs.length-1]+=', '+c; else lead+=(lead?', ':'')+c; }
    else { segs.push(lead?lead+', '+c:c); lead=''; } });
  if(lead){ if(segs.length) segs[segs.length-1]+=', '+lead; else segs.push(lead); }
  segs.forEach(function(seg){
    const parts=seg.split(/\s+\b(?:and|plus)\b\s+/i);
    if(parts.length>1){ if(parts.some(_rvModOnly)) out.push(seg); else parts.forEach(function(p){ if(p.trim()) out.push(p.trim()); }); }
    else out.push(seg);
  });
});
return out.length?out:[String(raw).trim()];
}

function formatProblem(pr){
const parts=[pr.typedLabel||pr.label]; if(pr.extra) parts.push(pr.extra);   /* PVX-N213: the typed words the match didn't use */
if(pr.frequencyCount!=null){ const u=pr.frequencyLabel||'times'; parts.push(pr.frequencyCount+' '+(pr.frequencyCount===1? u.replace(/s$/,'') : u)); }
else if(pr.frequencyText){ parts.push(pr.frequencyText); }
if(pr.durationText) parts.push(pr.durationText);
if(pr.onsetText) parts.push(pr.onsetText);
return parts.join(' · ');
}
function problemsToString(arr){ return (arr||[]).map(formatProblem).join('; '); }
function compactMod(pr){
if(pr.frequencyCount!=null) return pr.frequencyCount+(pr.frequencyLabel==='episodes'?'ep':'×');
if(pr.durationValue && pr.durationUnit){ const sh={hours:'h',days:'d',weeks:'w',minutes:'m',months:'mo',years:'y'}[pr.durationUnit]; if(sh) return pr.durationValue+sh; }
if(pr.durationText) return pr.durationText;
if(pr.frequencyText) return pr.frequencyText;
if(pr.onsetText) return pr.onsetText;
return'';
}
function compactProblems(p){ const a=p&&p.reasonProblems; if(!a||!a.length) return (p&&p.reason)||''; const f=a[0]; const mod=compactMod(f); let s=f.label+(mod?(' · '+mod):''); if(a.length>1) s+=' +'+(a.length-1); return s; }
