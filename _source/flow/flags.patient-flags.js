/* ═════════ patient-flags-oct7 ═════════
   Staff-only patient flags (Safety · Handling · Medical · Isolation · Owner). Stored on visits/{id}.flags
   [{id,k,t,scope:'always'|'visit',by,at,from}]. "Always" flags carry to the pet's next visit at check-in;
   "This visit" flags stay with the visit. Never written to pub/ or lobby/ (those projections list their fields). */
(function(){
var FK={safe:'Safety',hand:'Handling',med:'Medical',iso:'Isolation',own:'Owner'}, ORDER=['safe','hand','med','iso','own'];
var CAT={safe:['Bites','Muzzle','Dog aggressive','Scratches'],hand:['Fear Free','Hard stick','Sedate','E-collar'],
  med:['MDR1','No hydromorphone','Diabetic','Seizures'],iso:['Parvo','Ringworm','Kennel cough'],own:['Call first','Spanish','Approve estimate']};
var G={
 safe:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.695 2.85a1.5 1.5 0 0 1 2.61 0l9.03 15.9A1.5 1.5 0 0 1 21.03 21H2.97a1.5 1.5 0 0 1 -1.305 -2.25zM12 7.8a1.275 1.275 0 0 0 -1.275 1.35l0.3 5.4a0.975 0.975 0 0 0 1.95 0l0.3 -5.4A1.275 1.275 0 0 0 12 7.8zm0 9.15a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0 -2.55z"/></svg>',
 hand:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.1 1.95c0.825 0 1.5 0.675 1.5 1.5v6.45h0.75V4.5c0 -0.825 0.675 -1.5 1.5 -1.5s1.5 0.675 1.5 1.5v6.45h0.6V6.6c0 -0.75 0.6 -1.35 1.35 -1.35s1.35 0.6 1.35 1.35v7.65c0 4.5 -3.3 7.8 -7.5 7.8 -2.85 0 -4.65 -1.2 -6.3 -3.45L3 14.1c-0.6 -0.75 -0.45 -1.65 0.3 -2.1 0.675 -0.45 1.5 -0.3 2.1 0.3l1.95 2.1V4.5c0 -0.825 0.675 -1.5 1.5 -1.5s1.5 0.675 1.5 1.5v5.4h0.75V3.45c0 -0.825 0.675 -1.5 1.5 -1.5z" transform="translate(-0.9 0)"/></svg>',
 med:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.35 2.4h3.3v6.15l5.325 -3.075 1.65 2.85L15.3 11.4l5.325 3.075 -1.65 2.85L13.65 14.25v6.15H10.35V14.25l-5.325 3.075 -1.65 -2.85L8.7 11.4 3.375 8.325l1.65 -2.85L10.35 8.55z"/></svg>',
 iso:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.8l8.1 3v6.45c0 4.95 -3.45 8.7 -8.1 10.35C7.35 19.95 3.9 16.2 3.9 11.25V4.8z"/></svg>',
 own:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.3 2.4c0.75 -0.15 1.5 0.3 1.8 1.05l1.35 3.45c0.3 0.675 0 1.5 -0.6 1.875l-1.5 0.975a12.9 12.9 0 0 0 6.9 6.9l0.975 -1.5c0.375 -0.6 1.2 -0.9 1.875 -0.6l3.45 1.35c0.75 0.3 1.2 1.05 1.05 1.8l-0.45 2.4c-0.15 0.9 -1.05 1.5 -1.95 1.5C9.9 21.45 2.55 14.1 2.4 4.8c0 -0.9 0.6 -1.8 1.5 -1.95z"/></svg>'};
var MINUS='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="var(--fg-red)"/><rect x="6" y="10.909" width="12" height="2.182" rx="1.091" fill="#fff"/></svg>';
var PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="var(--fg-green)"/><rect x="6" y="10.909" width="12" height="2.182" rx="1.091" fill="#fff"/><rect x="10.909" y="6" width="2.182" height="12" rx="1.091" fill="#fff"/></svg>';
var MAG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.9"/><path d="m15.6 15.6 5.1 5.1"/></svg>';
var CK='<svg class="fg-ck" viewBox="0 0 24 24" fill="none" stroke="var(--fg-blue)" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.25 12.75l4.5 4.5 9 -10.5"/></svg>';
var APP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h7.2a5.2 5.2 0 0 1 0 10.4H9.6V20H6zm3.6 3.3v3.8h3.4a1.9 1.9 0 0 0 0-3.8z"/></svg>';
function E(s){ return (typeof pvxEscQ==='function')?pvxEscQ(s):String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function C(s){ return (typeof fxClean==='function')?fxClean(s):s; }
function uid(){ return 'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function iso(d){ try{ return d?new Date(d).toISOString():null; }catch(e){ return null; } }
function who(){ try{ return (typeof CURRENT_USER==='string'&&CURRENT_USER)?CURRENT_USER:'Staff'; }catch(e){ return 'Staff'; } }
function L(p){ return (p&&Array.isArray(p.flags))?p.flags:[]; }
function S(p){ return L(p).slice().sort(function(a,b){ return ORDER.indexOf(a.k)-ORDER.indexOf(b.k); }); }

/* Firestore ↔ app */
window.fgToDb=function(a){ return Array.isArray(a)?a.filter(function(f){ return f&&f.t; }).slice(0,30).map(function(f){
  return {id:String(f.id||uid()),k:FK[f.k]?f.k:'own',t:String(f.t).slice(0,40),scope:f.scope==='visit'?'visit':'always',by:f.by||null,at:iso(f.at),from:f.from||null}; }):[]; };
window.fgToApp=function(a){ return Array.isArray(a)?a.filter(function(f){ return f&&f.t; }).map(function(f){
  return {id:String(f.id||uid()),k:FK[f.k]?f.k:'own',t:C(String(f.t)),scope:f.scope==='visit'?'visit':'always',by:f.by?C(String(f.by)):null,at:f.at?new Date(f.at):null,from:f.from||null}; }):[]; };

/* atoms */
function tile(k,cls){ return '<i class="fg-t fg-k-'+k+(cls?' '+cls:'')+'">'+G[k]+'</i>'; }
function cap(t,cls){ return '<i class="fg-cap'+(cls?' '+cls:'')+'">'+G.safe+'<i>'+E(t)+'</i></i>'; }
var SEEN={}, PULSE=null;
function recent(d){ return d&&(Date.now()-new Date(d).getTime())<120000; }
function isNew(p,f){ var key=p.id+'|'+f.id; if(SEEN[key]) return false; SEEN[key]=1; return recent(f.at)||recent(p.arrival)||(f.from&&recent(p.arrival)); }

/* board card */
window.fgCard=function(p){ var a=S(p); if(!a.length) return ''; var s=a.filter(function(f){ return f.k==='safe'; }), o=a.filter(function(f){ return f.k!=='safe'; });
  return '<div class="fg-fl" aria-label="Flags: '+E(a.map(function(f){ return f.t; }).join(', '))+'">'
   +s.map(function(f){ var n=isNew(p,f); return cap(f.t,n?'fg-new fg-pulse':''); }).join('')
   +(o.length?'<span class="fg-stk">'+o.map(function(f,i){ return '<span class="fg-si'+(isNew(p,f)?' fg-new':'')+'" style="--i:'+i+'" title="'+E(f.t)+'">'+tile(f.k)+'<em>'+E(f.t)+'</em></span>'; }).join('')+'</span>':'')+'</div>'; };
/* patients table (inline after the name) and rooms */
function compact(p,small){ var a=S(p); if(!a.length) return ''; var s=a.filter(function(f){ return f.k==='safe'; }), o=a.filter(function(f){ return f.k!=='safe'; });
  return s.map(function(f){ return cap(f.t,small?'s':''); }).join('')+o.map(function(f){ return '<i class="fg-w" title="'+E(FK[f.k]+': '+f.t)+'">'+tile(f.k,small?'s':'')+'</i>'; }).join(''); }
window.fgInline=function(p){ var h=compact(p,true); return h?'<span class="fg-inl">'+h+'</span>':''; };
window.fgRoom=function(p){ var h=compact(p,false); return h?'<div class="fg-room">'+h+'</div>':''; };

/* mutations */
function save(p){ try{ renderAll(); }catch(e){} }
function add(p,k,t,scope){ t=C(String(t||'')).trim().slice(0,40); if(!t) return;
  if(L(p).some(function(f){ return f.t.toLowerCase()===t.toLowerCase(); })) return;
  p.flags=L(p).concat([{id:uid(),k:FK[k]?k:'own',t:t,scope:scope==='visit'?'visit':'always',by:who(),at:new Date(),from:null}]);
  try{ p.timeline.push({label:'Flag added',at:new Date(),meta:t}); }catch(e){}
  save(p); }
function remove(p,id){ var f=L(p).find(function(x){ return x.id===id; }); if(!f) return;
  p.flags=L(p).filter(function(x){ return x.id!==id; });
  try{ p.timeline.push({label:'Flag removed',at:new Date(),meta:f.t}); }catch(e){}
  save(p); }
window.fgAdd=add; window.fgRemove=remove;

/* drawer section */
var ST={pid:null,edit:false,sheet:false,scope:'always',touched:false,q:''};
function when(d){ if(!d) return ''; var x=new Date(d), t=new Date(); try{
  if(x.toDateString()===t.toDateString()) return x.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  return x.toLocaleDateString([], {month:'short',day:'numeric'}); }catch(e){ return ''; } }
function sectionHTML(p){ var a=S(p), pulse=PULSE===p.id; PULSE=null;
  var h='<div class="fg-sec'+(ST.edit?' edit':'')+'" id="fgSec"><div class="fg-hd"><p class="sect-title">Flags</p>'
   +(a.length?'<button type="button" class="fg-link" data-fg="edit">'+(ST.edit?'Done':'Edit')+'</button>':'')+'</div><div class="fg-group">';
  h+=a.map(function(f){ var meta=[f.scope==='visit'?'This visit':'Always', f.by?E(f.by):'', when(f.at)].filter(Boolean).join(' · ');
    return '<div class="fg-row" data-id="'+E(f.id)+'"><button type="button" class="fg-min" data-fg="arm" aria-label="Remove '+E(f.t)+'">'+MINUS+'</button>'
     +tile(f.k,'l'+(pulse&&f.k==='safe'?' fg-pulse':''))+'<div class="fg-tx"><b'+(f.k==='safe'?' style="color:var(--fg-red)"':'')+'>'+E(f.t)+'</b><small>'+E(FK[f.k])+' · '+meta+'</small></div>'
     +'<button type="button" class="fg-del" data-fg="del">Remove</button></div>'; }).join('');
  h+='<button type="button" class="fg-add" data-fg="add" aria-expanded="'+ST.sheet+'">'+PLUS+'<span>Add flag</span></button></div>';
  if(ST.sheet) h+=sheetHTML(p);
  return h+'</div>'; }
function sheetHTML(p){ var have={}; L(p).forEach(function(f){ have[f.t.toLowerCase()]=1; }); var q=ST.q.trim().toLowerCase(), any=false;
  var opts=ORDER.map(function(k){ var items=CAT[k].filter(function(t){ return !q||t.toLowerCase().indexOf(q)>-1; }); if(!items.length) return ''; any=true;
    return '<div class="fg-sh">'+FK[k]+'</div>'+items.map(function(t){ return '<button type="button" class="fg-opt'+(have[t.toLowerCase()]?' on':'')+'" data-fg="opt" data-k="'+k+'" data-t="'+E(t)+'">'+tile(k)+'<span class="fg-lb">'+E(t)+'</span>'+CK+'</button>'; }).join(''); }).join('');
  var custom=q&&!CAT.safe.concat(CAT.hand,CAT.med,CAT.iso,CAT.own).some(function(t){ return t.toLowerCase()===q; });
  return '<div class="fg-sheet" role="dialog" aria-label="Add flag"><label class="fg-search">'+MAG+'<input id="fgQ" type="search" enterkeyhint="search" placeholder="Search or new flag" value="'+E(ST.q)+'" autocomplete="off" aria-label="Search or new flag">'+(ST.q?'<button type="button" class="fg-x" data-fg="clearq" aria-label="Clear search" title="Clear"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".32"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>':'')+'</label>'
   +'<div class="fg-seg" role="group" aria-label="Keep the flag"><button type="button" data-fg="scope" data-s="always" class="'+(ST.scope==='always'?'on':'')+'">Always</button><button type="button" data-fg="scope" data-s="visit" class="'+(ST.scope==='visit'?'on':'')+'">This visit</button></div>'
   +'<div class="fg-opts">'+opts+(custom?'<div class="fg-new-as">Add “'+E(ST.q.trim())+'” as'+ORDER.map(function(k){ return '<button type="button" data-fg="new" data-k="'+k+'">'+tile(k,'s')+FK[k]+'</button>'; }).join('')+'</div>':'')
   +(!any&&!custom?'<div class="fg-new-as">No matches</div>':'')+'</div>'
   +'<div class="fg-sheet-ft"><button type="button" class="fg-pill g" data-fg="close">Done</button></div></div>'; }
function mountFor(p){ var m=document.getElementById('flagsMount'); if(!m||!p) return; if(ST.pid!==p.id){ ST={pid:p.id,edit:false,sheet:false,scope:'always',touched:false,q:''}; }
  var hadFocus=document.activeElement&&document.activeElement.id==='fgQ', pos=hadFocus?document.activeElement.selectionStart:null, sc=m.querySelector('.fg-opts'), top=sc?sc.scrollTop:0;
  m.innerHTML=sectionHTML(p);
  var ns=m.querySelector('.fg-opts'); if(ns) ns.scrollTop=top;
  var qi=m.querySelector('#fgQ'); if(qi){ qi.oninput=function(){ ST.q=qi.value; mountFor(p); };
    qi.onkeydown=function(e){ if(e.key==='Escape'&&ST.q){ e.preventDefault(); e.stopPropagation(); ST.q=''; mountFor(p); var qe=document.getElementById('fgQ'); if(qe) qe.focus(); return; }   /* PVX-N361 */
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); ST.sheet=false; ST.q=''; mountFor(p); m.querySelector('[data-fg="add"]').focus(); }
      if(e.key==='Enter'&&ST.q.trim()){ var first=m.querySelector('.fg-opt:not(.on)'); if(first) first.click(); else { var nb=m.querySelector('[data-fg="new"][data-k="own"]'); if(nb) nb.click(); } } };
    if(hadFocus){ qi.focus(); try{ qi.setSelectionRange(pos,pos); }catch(e){} } } }
window.fgMount=function(p){ try{ mountFor(p); }catch(e){} };
document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#flagsMount [data-fg]'); if(!b) return;
  var p=PATIENTS.find(function(x){ return x.id===ST.pid; }); if(!p) return; var act=b.dataset.fg, row=b.closest('.fg-row');
  if(act==='clearq'){ ST.q=''; mountFor(p); var qc=document.getElementById('fgQ'); if(qc) qc.focus(); return; }   /* PVX-N361 */
  if(act==='edit'){ ST.edit=!ST.edit; if(!ST.edit) document.querySelectorAll('#flagsMount .fg-row.arm').forEach(function(r){ r.classList.remove('arm'); }); var sec=document.getElementById('fgSec'); sec.classList.toggle('edit',ST.edit); b.textContent=ST.edit?'Done':'Edit'; return; }
  if(act==='arm'){ var was=row.classList.contains('arm'); document.querySelectorAll('#flagsMount .fg-row.arm').forEach(function(r){ r.classList.remove('arm'); }); if(!was) row.classList.add('arm'); return; }
  if(act==='del'){ var id=row.dataset.id; row.style.maxHeight=row.offsetHeight+'px'; void row.offsetWidth; row.classList.add('gone');
    setTimeout(function(){ remove(p,id); if(!L(p).length) ST.edit=false; mountFor(p); }, pvxReduceMotion()?160:340); return; }
  if(act==='add'){ ST.sheet=!ST.sheet; ST.q=''; ST.touched=false; ST.scope='always'; mountFor(p); if(ST.sheet){ var qi=document.getElementById('fgQ'); if(qi) qi.focus(); } return; }
  if(act==='close'){ ST.sheet=false; ST.q=''; mountFor(p); return; }
  if(act==='scope'){ ST.scope=b.dataset.s; ST.touched=true; b.parentNode.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on',x===b); }); return; }
  if(act==='opt'){ var t=b.dataset.t, k=b.dataset.k, ex=L(p).find(function(f){ return f.t.toLowerCase()===t.toLowerCase(); });
    if(ex){ remove(p,ex.id); b.classList.remove('on'); }
    else { add(p,k,t,ST.touched?ST.scope:(k==='iso'?'visit':ST.scope)); b.classList.add('on'); }
    setTimeout(function(){ mountFor(p); }, 380); return; }
  if(act==='new'){ add(p,b.dataset.k,ST.q,ST.touched?ST.scope:(b.dataset.k==='iso'?'visit':ST.scope)); ST.q=''; mountFor(p); var qi2=document.getElementById('fgQ'); if(qi2) qi2.focus(); return; }
});

/* check-in: "Always" flags from the pet's last visit come forward */
function key(v){ return String(v==null?'':v).toLowerCase().replace(/\s+/g,' ').trim(); }
function digits(v){ return String(v==null?'':v).replace(/\D/g,'').slice(-10); }
function priorFlags(p,pool){ var nm=key((p.name||'')+' '+(p.last||'')); if(!nm) return null; var ow=key(p.owner), ph=digits(p.ownerPhone);
  var prev=(pool||PATIENTS).filter(function(x){ return x!==p&&x.id!==p.id&&L(x).length&&key((x.name||'')+' '+(x.last||''))===nm&&((ow&&key(x.owner)===ow)||(ph.length>=7&&digits(x.ownerPhone)===ph)); })
    .sort(function(a,b){ return new Date(b.arrival||0)-new Date(a.arrival||0); });
  for(var i=0;i<prev.length;i++){ var al=L(prev[i]).filter(function(f){ return f.scope!=='visit'; }); if(al.length) return {from:prev[i],flags:al}; }
  return null; }
function carry(p){ if(L(p).length) return; var pr=priorFlags(p); if(!pr){ older(p); return; } carryFrom(p,pr); }
/* not in the last 30 days Flow keeps loaded: look up this pet's older visits by name (one small read) */
function older(p){ if(typeof fvVisitsByName!=='function'||typeof Backend==='undefined'||Backend._visitsMode!=='recent') return;
  fvVisitsByName((p.name||'')+' '+(p.last||'')).then(function(list){ var cur=PATIENTS.find(function(x){ return x.id===p.id; })||p; if(L(cur).length) return;
    var pr=priorFlags(cur,list); if(pr) carryFrom(cur,pr); }).catch(function(e){ console.warn('[flags] older visits',e); }); }
function carryFrom(p,pr){
  p.flags=pr.flags.map(function(f){ return {id:uid(),k:f.k,t:f.t,scope:'always',by:f.by||null,at:f.at||null,from:String(pr.from.id)}; });
  try{ p.timeline.push({label:'Flags from last visit',at:new Date(),meta:p.flags.map(function(f){ return f.t; }).join(', ')}); }catch(e){}
  save(p); notifyCheckin(p); }
window.fgCarry=carry;
if(typeof commitPatient==='function'){ 
  pvxWrap('commitPatient',function(_commit){ return function(){ var before={}; PATIENTS.forEach(function(x){ before[x.id]=1; }); var r=_commit.apply(this,arguments);
    try{ PATIENTS.filter(function(x){ return !before[x.id]; }).forEach(carry); }catch(e){} return r; }; },'#9'); }

function notifyCheckin(p){ var old=document.querySelector('.fg-ntf'); if(old) old.remove();
  var a=S(p), s=a.filter(function(f){ return f.k==='safe'; }), n=a.length, nm=((p.name||'')+' '+(p.last||'')).trim();
  var lead=s.length?s[0].t:a[0].t, rest=n-1;
  var el=document.createElement('div'); el.className='fg-ntf'; el.setAttribute('role','status');
  el.innerHTML='<span class="fg-app">'+APP+'</span><div class="fg-bd"><div class="fg-nh"><span class="fg-nk">Check-in</span><span aria-hidden="true">now</span></div><b>'+E(nm)+' is here</b>'
   +'<p>'+E(lead)+(rest?' and '+rest+' more flag'+(rest>1?'s':''):'')+' from the last visit.</p><div class="fg-rw">'+compact(p,false)+'</div>'
   +'<div class="fg-acts"><button type="button" class="fg-pill p" data-n="keep">Keep Flags</button><button type="button" class="fg-pill g" data-n="review">Review</button></div></div>';
  var wrap=document.getElementById('notes'); (wrap||document.body).appendChild(el); requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('show'); }); });
  var gone=false, timer=setTimeout(function(){ close(); }, 20000);
  function close(){ if(gone) return; gone=true; clearTimeout(timer); el.classList.add('out'); setTimeout(function(){ el.remove(); }, 450); }
  el.querySelector('[data-n="review"]').onclick=function(){ close(); try{ ST={pid:p.id,edit:true,sheet:false,scope:'always',touched:false,q:''}; openDrawer(p.id); }catch(e){} };
  el.querySelector('[data-n="keep"]').onclick=function(){ var to=document.querySelector('.card[data-pid="'+(window.CSS&&CSS.escape?CSS.escape(p.id):p.id)+'"] .fg-fl'), from=el.querySelectorAll('.fg-rw>*');
    var r=to&&to.getBoundingClientRect(), vis=r&&r.width&&r.top<innerHeight&&r.bottom>0;
    if(!vis||pvxReduceMotion()||!Element.prototype.animate){ close(); return; }
    var targets=to.querySelectorAll('.fg-cap,.fg-si'), done=0;
    [].forEach.call(from,function(src,i){ var a=src.getBoundingClientRect(), t=targets[i]||to, b=t.getBoundingClientRect(), c=src.cloneNode(true);
      c.classList.add('fg-fly'); c.style.left=a.left+'px'; c.style.top=a.top+'px'; document.body.appendChild(c); src.style.opacity=0;
      var dx=b.left-a.left, dy=b.top-a.top;
      var an=c.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx*.5+'px,'+(dy*.5-30)+'px) scale(1.12)',offset:.5},{transform:'translate('+dx+'px,'+dy+'px) scale(1)'}],{duration:640,delay:i*45,easing:'cubic-bezier(.32,.72,0,1)',fill:'forwards'});
      an.onfinish=function(){ c.remove(); if(++done===from.length){ var card=to.closest('.card'); if(card){ card.classList.remove('just-added'); void card.offsetWidth; card.classList.add('just-added'); setTimeout(function(){ card.classList.remove('just-added'); },750); } } }; });
    setTimeout(close,140); };
}
window.fgNotifyCheckin=notifyCheckin;

/* drawer hooks: section on every fill, Safety pulses once when the patient is opened */
if(typeof fillDrawer==='function'){ pvxAfter('fillDrawer',function(p){ try{ mountFor(p); }catch(e){} },'#9'); }
if(typeof openDrawer==='function'){ pvxBefore('openDrawer',function(pid){ PULSE=pid; },'#9'); }
})();