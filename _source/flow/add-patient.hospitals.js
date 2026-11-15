const HospitalAutocomplete = (function(){
const _instances = [];
const TYPE_PILL = {
'General practice':['GENERAL','gp'],
'Emergency/24-hr':['EMERGENCY','er'],
'Specialty/referral':['SPECIALTY','spec'],
'Urgent care':['URGENT CARE','uc'],
'Equine/large animal':['EQUINE','eq'],
'Mixed (GP + emergency)':['GP + ER','mix'],
'Mixed (GP + urgent care)':['GP + URGENT','mix']
};
const norm = s => String(s||'').toLowerCase();
const digits = s => String(s||'').replace(/\D/g,'');
function hlText(text,q){ const t=norm(text); const i=q?t.indexOf(q):-1; if(i<0) return pvxEsc(text);
return pvxEsc(text.slice(0,i))+'<span class="bc-hl">'+pvxEsc(text.slice(i,i+q.length))+'</span>'+pvxEsc(text.slice(i+q.length)); }
function shortAddr(a){ return String(a||'').split(',')[0]; }
function score(h,q,qd){
const n=norm(h.name), t=norm(h.town), c=norm(h.county), a=norm(h.address);
if(n.startsWith(q)) return 0;
if(n.split(/[^a-z0-9]+/).some(w=>w.startsWith(q))) return 1;
if(n.includes(q)) return 2;
if(t.startsWith(q)) return 3;
if(t.includes(q)) return 4;
if(c.includes(q)) return 5;
if(a.includes(q)) return 6;
if(qd && qd.length>=3 && digits(h.phone).includes(qd)) return 7;
return -1;
}
function search(raw){
const q=norm(String(raw).trim());
if(!q){ const R=(window.pvxRefRecent?pvxRefRecent():[]), all=CT_VET_HOSPITALS.filter(h=>R.indexOf(h)<0).sort((a,b)=>a.name.localeCompare(b.name)), out=R.concat(all); out._recent=R.length; return out; }   /* PVX-N371: every hospital, recent first */
const qd=digits(q);
return CT_VET_HOSPITALS.map(h=>({h,s:score(h,q,qd)})).filter(x=>x.s>=0)
.sort((a,b)=> a.s-b.s || a.h.name.localeCompare(b.h.name)).slice(0,50).map(x=>x.h);
}
function attach(input, panel, opts){
opts=opts||{};
for(let i=_instances.length-1;i>=0;i--){ if(!document.contains(_instances[i].wrap)) _instances.splice(i,1); }
const wrap = input.closest('.bc-wrap') || panel.parentElement;
let results=[], hl=-1, open=false;
function close(){ open=false; hl=-1; panel.classList.remove('open'); input.setAttribute('aria-expanded','false'); }
function marks(){ const els=panel.querySelectorAll('.bc-opt'); els.forEach((o,i)=>o.classList.toggle('hl',i===hl)); if(els[hl]) els[hl].scrollIntoView({block:'nearest'}); }
function refresh(){
const q=norm(input.value.trim());
results=search(input.value);
if(hl>=results.length) hl=results.length-1;
if(!results.length){
panel.innerHTML='<div class="bc-empty">No matching hospitals — “'+pvxEsc(input.value.trim())+'” will be used as entered.</div>';
} else {
panel.innerHTML='<div class="bc-list hv-list">'+results.map(function(h,i){
const pill=TYPE_PILL[h.type]||[String(h.type||'').toUpperCase(),'gp'];
return(results._recent&&i===0?'<div class="pvx-grp" role="presentation">Recent</div>':'')+(results._recent&&i===results._recent?'<div class="pvx-grp" role="presentation">All hospitals</div>':'')
+'<div class="bc-opt hv-opt'+(i===hl?' hl':'')+'" role="option" data-i="'+i+'">'
+'<div class="hv-main"><div class="hv-name">'+hlText(h.name,q)+'</div>'
+'<div class="hv-sub">'+pvxEsc(h.town)+', CT · '+pvxEsc(shortAddr(h.address))+'</div></div>'
+'<span class="hv-pill hv-'+pill[1]+'">'+pvxEsc(pill[0])+'</span></div>';
}).join('')+'</div>';
panel.querySelectorAll('.bc-opt').forEach(function(o){
o.onmousedown=function(e){ e.preventDefault(); choose(+o.dataset.i); };
o.onmouseenter=function(){ hl=+o.dataset.i; marks(); };
});
}
open=true; panel.classList.add('open'); input.setAttribute('aria-expanded','true');
}
function choose(i){ const h=results[i]; if(!h) return; input.value=h.name; if(opts.onSelect) opts.onSelect(h); close(); try{input.focus();}catch(e){} }
input.addEventListener('input', function(){ if(opts.onInput) opts.onInput(input.value); hl=-1; refresh(); });
input.addEventListener('focus', function(){ hl=-1; refresh(); });
input.addEventListener('keydown', function(e){
if(!open){ if(e.key==='ArrowDown'){ hl=-1; refresh(); } return; }
const n=results.length;
if(e.key==='ArrowDown'){ e.preventDefault(); if(n){ hl=(hl+1)%n; marks(); } }
else if(e.key==='ArrowUp'){ e.preventDefault(); if(n){ hl=(hl-1+n)%n; marks(); } }
else if(e.key==='Enter'){ if(hl>=0 && results[hl]){ e.preventDefault(); choose(hl); } else close(); }
else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(); }
else if(e.key==='Tab'){ close(); }
});
input.setAttribute('role','combobox'); input.setAttribute('aria-autocomplete','list'); input.setAttribute('aria-expanded','false');
const inst={ close:close, wrap:wrap };
_instances.push(inst);
return inst;
}
if(typeof document!=='undefined'){
document.addEventListener('mousedown', function(e){
_instances.forEach(function(inst){ if(inst.wrap && !inst.wrap.contains(e.target)) inst.close(); });
});
}
return { attach:attach, search:search, data:CT_VET_HOSPITALS };
})();

 
let apRefHospObj=null, _apRefCtrl=null;
/* ensureHospitalAutocompletes · its layers, innermost first: 1 n371 after   (PVX-N387; kept true by flow_t387) */
function ensureHospitalAutocompletes(){ return pvxRun('ensureHospitalAutocompletes',ensureHospitalAutocompletes$base,this,arguments); }
function ensureHospitalAutocompletes$base(){
if(_apRefCtrl) return;
const inp=document.getElementById('apRefHosp'), pnl=document.getElementById('apRefHospPanel');
if(inp && pnl) _apRefCtrl=HospitalAutocomplete.attach(inp, pnl, {
onSelect:function(h){ apRefHospObj=h; },
onInput:function(){ apRefHospObj=null; }
});
}
function rhClose(){ if(_apRefCtrl) _apRefCtrl.close(); }
