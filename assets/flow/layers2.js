/* Pravix Flow — layers2.js (n383). The scripts that follow the Yakuri library (assets/pvx-yakuri.js): n254 on.
   They sat inline in index.html, each in its own <script>. They are here in the order they ran, each as it was.
   A block that throws doesn't stop the ones after it: it runs inside try/catch and the error is thrown again on its own,
   so it still shows in the console. What a block declared for the whole page stays outside the try.
   After changing this file:  python3 _ci/seal_csp.py .   (it refreshes the ?v= in index.html) */

/* ━━━━━ 64 of 104 · pvx-n254-yakuri ━━━━━ */
try{
/* PVX-N254 - Flow and Rounds read Yakuri: Rounds medications link to it; the drawer lists the owner's medications from intake as
   Yakuri drugs and runs Yakuri's own interaction check (see patch_n254.py) */
(function(){ if(!window.PvxYakuri) return;
  window.pvxYkLink=function(name,html){ return PvxYakuri.ready()?PvxYakuri.link(name,html):html; };
  function tokens(text){ return String(text||'').split(/[,;\n\/+]|\band\b|\bwith\b/i).map(function(x){ return x.trim(); }).filter(Boolean); }
  function panel(p){
    var mount=document.getElementById('intakeCardMount'); if(!mount) return; var old=document.getElementById('pvxYkMeds');
    var meds=p&&p.intake&&p.intake.medications&&String(p.intake.medications).trim();
    if(!meds||!PvxYakuri.ready()){ if(old) old.remove(); return; }
    var ds=PvxYakuri.matchAll(meds), miss=tokens(meds).filter(function(x){ return !PvxYakuri.match(x) && !/^(none|no|n\/a|na)$/i.test(x); });
    if(!ds.length&&!miss.length){ if(old) old.remove(); return; }
    var h='<div class="t">Owner’s medications · Yakuri</div><div class="l">'+(ds.length?ds.map(function(d){ return PvxYakuri.link(d); }).join(' · '):'')
      +(miss.length?'<span class="u">Not found in Yakuri: '+pvxEsc(miss.join(', '))+'</span>':'')+'</div>'
      +(ds.length>=2?'<button type="button" data-ykint>Check interactions</button><div class="r" hidden></div>':'');
    var el=old||document.createElement('div'); el.id='pvxYkMeds'; el.className='pvx-ykmeds'; el.setAttribute('data-pid',String(p.id)); el.innerHTML=h;
    if(!old) mount.parentNode.insertBefore(el,mount.nextSibling);
    var b=el.querySelector('[data-ykint]'); if(b) b.onclick=function(){ check(p,ds,el); };
  }
  function check(p,ds,el){ var r=el.querySelector('.r'), sp=PvxYakuri.species(p.species);
    r.hidden=false; if(!sp){ r.innerHTML='<div class="sc">Yakuri’s interaction check covers dogs and cats.</div>'; return; }
    r.innerHTML='<div class="sc">Checking in Yakuri…</div>';
    PvxYakuri.interactions(ds,sp).then(function(x){
      r.innerHTML=(x.pairs||[]).map(function(q){ return '<div class="pr"><b>'+pvxEsc(q.names.join(' + '))+'</b> · '+pvxEsc(q.classification)+'<br><i>'+pvxEsc(q.summary)+'</i></div>'; }).join('')
        +'<div class="sc">'+pvxEsc(x.scope||'')+' Yakuri has no clinical approval yet.</div>';
    }).catch(function(e){ r.innerHTML='<div class="sc">'+pvxEsc((e&&e.message)||'Yakuri’s check didn’t run.')+'</div>'; });
  }
  if(typeof fillDrawer==='function'){ pvxAfter('fillDrawer',function(p){ try{ panel(p); }catch(e){ console.warn('[yakuri meds]',e); } },'n254-yakuri'); }
  PvxYakuri.onReady(function(){ try{ renderAll(); }catch(e){} try{ if(activePatient){ var p=PATIENTS.find(function(x){ return x.id===activePatient; }); if(p) fillDrawer(p); } }catch(e){} });
  function start(){ try{ if(typeof LOBBY!=='undefined'&&LOBBY) return; if(typeof Backend!=='undefined'&&Backend.mode&&Backend.mode!=='staff') return; }catch(e){} PvxYakuri.load().catch(function(){}); }
  setTimeout(start,6000);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 65 of 104 · n305-flow-js ━━━━━ */
try{
/* n305: anything in Flow that still asks for Rounds opens Rounds' own page */
(function(){ var sa=window.switchApp; if(typeof sa!=='function') return;
  window.switchApp=function(app){ if(app==='rounds'){ location.href='/rounds/'; return; } return sa.apply(this,arguments); }; })();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 66 of 104 · n309-open-patient ━━━━━ */
try{
/* n309: Rounds' "Show in Flow" opens that patient's drawer here (Flow is its own page since n305) */
(function(){ var id; try{ id=sessionStorage.getItem('pvx:open-patient'); sessionStorage.removeItem('pvx:open-patient'); }catch(e){} if(!id) return; var n=0;
  (function t(){ try{ if(typeof PATIENTS!=='undefined'&&PATIENTS.some(function(p){ return String(p.id)===id; })&&typeof openDrawer==='function'){ openDrawer(id); return; } }catch(e){} if(++n<80) setTimeout(t,250); })(); })();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 67 of 104 · pvx-n332-js ━━━━━ */
try{
/* ===== n332 · Flow: Design principles, Accessibility, Color (Nov 6 2026) ===== */
try{(function(){
  if(typeof LOBBY!=='undefined'&&LOBBY) return;   /* the lobby TV stays as it is */
  const $=s=>document.querySelector(s);
  /* a long wait says so to VoiceOver too, not only in colour */
  const WAITS='.wait.warn,.wait.crit,.wd-wait.warn,.wd-wait.crit,.r-timer.warn,.r-timer.crit';
  function sayWaits(root){ (root||document).querySelectorAll(WAITS).forEach(el=>{ if(el.closest('#view-client')) return;
    const crit=el.classList.contains('crit'), txt=crit?' (over 2 hours)':(el.classList.contains('r-timer')||el.classList.contains('wd-wait')?' (over an hour)':' (long wait)');
    let s=el.querySelector(':scope > .pvx-sr332'); if(!s){ s=document.createElement('span'); s.className='pvx-sr332'; el.appendChild(s); } if(s.textContent!==txt) s.textContent=txt;
    if(!el.title) el.title=crit?'Waiting over 2 hours':'Long wait'; }); }
  /* the Attention Center: each alert is a button you can reach with Tab, named by what it says */
  function attn(){ document.querySelectorAll('.attn-item').forEach(n=>{ if(n.getAttribute('role')==='button') return;
    n.setAttribute('role','button'); n.tabIndex=0;
    const pt=n.querySelector('.patient'), is=n.querySelector('.issue'), sec=n.querySelector('.secondary'), badge=n.querySelector('.overdue-text,.high-text');
    const head=[pt&&pt.textContent.trim(),is&&is.textContent.trim()].filter(Boolean).join(' ');
    n.setAttribute('aria-label',[head,sec&&sec.textContent.trim(),badge&&badge.textContent.trim().toLowerCase()].filter(Boolean).join(', '));
    n.addEventListener('keydown',e=>{ if(e.target!==n) return; if(e.key==='Enter'||e.key===' '){ e.preventDefault(); n.click(); } }); }); }
  /* the critical banner and an open patient: beside it when there's room, above it when there isn't */
  function island(){ const isl=$('#critIsland'), dr=$('#drawer'); if(!isl) return;
    const on=isl.classList.contains('on'), open=!!(dr&&dr.classList.contains('open'));
    if(!on||!open){ if(isl.style.left) isl.style.removeProperty('left'); if(dr&&dr.classList.contains('pvx-ci-pad')){ dr.classList.remove('pvx-ci-pad'); dr.style.removeProperty('--pvx-ci-pad'); } }   /* PVX-N378: only when it changes; removing an absent class woke every watcher, every frame */
    else{ const dw=dr.getBoundingClientRect().width, free=innerWidth-dw, need=(parseFloat(getComputedStyle(isl).getPropertyValue('--ci-w'))||640)+32;
      if(free>=need){ const L=(free/2)+'px'; if(isl.style.left!==L) isl.style.left=L; if(dr.classList.contains('pvx-ci-pad')){ dr.classList.remove('pvx-ci-pad'); dr.style.removeProperty('--pvx-ci-pad'); } }
      else{ if(isl.style.left) isl.style.removeProperty('left'); const r=isl.getBoundingClientRect(), pad=Math.ceil(r.bottom+10)+'px'; if(dr.style.getPropertyValue('--pvx-ci-pad')!==pad) dr.style.setProperty('--pvx-ci-pad',pad); if(!dr.classList.contains('pvx-ci-pad')) dr.classList.add('pvx-ci-pad'); } }
    /* Ultrasound Today has no page title for the banner to sit beside, so it makes room above Next Up */
    const ut=$('#view-us-today'); if(ut){ if(on&&!open&&ut.offsetParent){ if(scrollY<4){ const r=isl.getBoundingClientRect(); ut.style.paddingTop='';
          const f=[...ut.children].find(c=>c.offsetHeight>40&&!/absolute|fixed/.test(getComputedStyle(c).position));
          if(f){ const base=parseFloat(getComputedStyle(ut).paddingTop)||0, pad=Math.max(0,Math.ceil(r.bottom+14-f.getBoundingClientRect().top)); if(pad) ut.style.paddingTop=(base+pad)+'px'; } } }
      else ut.style.paddingTop=''; } }
  let t=0; const soon=()=>{ if(t) return; t=requestAnimationFrame(()=>{ t=0; try{ sayWaits(); attn(); island(); }catch(e){} }); };
  try{ pvxWatch(soon,{childList:true,subtree:true,attributes:true,attributeFilter:['class']},document.body); }catch(e){}
  addEventListener('resize',soon); soon();
  window.pvxN332={sayWaits,attn,island};
})();}catch(__e){ console.warn('[n332]',__e); }
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 68 of 104 · n333-flow-js ━━━━━ */
try{
/* n333: anything in Flow that still asks for Ultrasound opens Ultrasound's own page */
(function(){ var sa=window.switchApp; if(typeof sa!=='function') return;
  window.switchApp=function(app){ if(app==='ultrasound'){ location.href='/ultrasound/'; return; } return sa.apply(this,arguments); }; })();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 69 of 104 · pvx-n334-js ━━━━━ */
try{
/* PVX-N334 - 2. the critical-patient banner floats above the page; at the top of the page it no longer covers
   the title, the filters or the first controls: the page makes just enough room under it.
   3. if the text size changes while the banner is open, it refits its height to its text. */
try{(function(){
  const $=s=>document.querySelector(s);
  const CTL='h1,h2,h3,.col-head,button,a[href],input,select,textarea,[role=button],[role=tab],.chip,.kpi,th,label';
  function view(){ const st=$('#stage'); if(!st) return null; for(const v of st.children){ if(/^view-/.test(v.id)&&v.offsetHeight>0&&getComputedStyle(v).display!=='none') return v; } return null; }
  function clear(v){ if(!v||!v.hasAttribute('data-pvx-room')) return; v.style.removeProperty('padding-top'); v.removeAttribute('data-pvx-room'); }
  let last='';
  function room(){
    const isl=$('#critIsland'), dr=$('#drawer'), st=$('#stage'), v=view();
    document.querySelectorAll('[data-pvx-room]').forEach(x=>{ if(x!==v) clear(x); });
    if(!v) return;
    const on=!!(isl&&isl.classList.contains('on')&&isl.classList.contains('content')), open=!!(dr&&dr.classList.contains('open'));
    const atTop=!st||st.scrollTop<=4;
    if(!on||open||v.id==='view-client'||document.body.classList.contains('tv-mode')){ if(atTop||!on) { if(atTop) clear(v); } last=''; return; }
    if(!atTop){ last=''; return; }   /* scrolled: the banner floats over the content, as it always has */
    const cs=getComputedStyle(isl), H=parseFloat(isl.style.height)||isl.offsetHeight, W=parseFloat(isl.style.width)||isl.offsetWidth;
    const top=parseFloat(cs.top)||0, bottom=top+H;
    const lft=isl.style.left?parseFloat(isl.style.left):innerWidth/2, left=lft-W/2, right=lft+W/2;
    const key=[v.id,H,W,top,lft,innerWidth,innerHeight,getComputedStyle(document.documentElement).fontSize].join('|');
    if(key===last) return; last=key;
    const base=v.hasAttribute('data-pvx-room')?parseFloat(v.dataset.pvxBase)||0:parseFloat(getComputedStyle(v).paddingTop)||0;
    const shift=(parseFloat(getComputedStyle(v).paddingTop)||0)-base;   /* how far the content sits lower right now (mid-animation too) */
    const sy=st?st.scrollTop:0;   /* a smooth scroll back up can still be a few points short of the top */
    let minTop=Infinity;
    v.querySelectorAll(CTL).forEach(e=>{ const b=e.getBoundingClientRect(); if(!b.width||!b.height) return; const t=b.top-shift+sy, bt=b.bottom-shift+sy;
      if(b.right<=left||b.left>=right||bt<=top||t>=bottom+8) return; if(t<minTop) minTop=t; });
    const pad=minTop<Infinity?Math.max(0,Math.ceil(bottom+12-minTop)):0;
    if(!pad){ clear(v); return; }
    if(!v.hasAttribute('data-pvx-room')){ v.dataset.pvxBase=String(base); v.setAttribute('data-pvx-room',''); }
    v.style.paddingTop=(base+pad)+'px';
  }
  let fs=getComputedStyle(document.documentElement).fontSize;
  function fit(){ const now=getComputedStyle(document.documentElement).fontSize; if(now===fs) return; fs=now;
    const isl=$('#critIsland'); if(!isl||!isl.classList.contains('content')) return; const inn=isl.querySelector('.ci-inner'); if(!inn) return;
    const h=Math.max(36,inn.offsetHeight), cur=parseFloat(isl.style.height)||0; if(cur&&Math.abs(h-cur)>1) isl.style.height=h+'px'; }
  let t=0; const soon=()=>{ if(t) return; t=requestAnimationFrame(()=>{ t=0; try{ fit(); room(); }catch(e){} }); };
  try{ pvxWatch(soon,{attributes:true,attributeFilter:['class','style'],subtree:true},document.body); }catch(e){}
  try{ pvxWatch(soon,{attributes:true,attributeFilter:['style','class']},document.documentElement); }catch(e){}
  addEventListener('resize',()=>{ last=''; soon(); });
  const st=$('#stage'); if(st) st.addEventListener('scroll',()=>{ if(st.scrollTop<=4) soon(); },{passive:true});
  const isl=$('#critIsland'); if(isl) isl.addEventListener('transitionend',()=>{ last=''; soon(); });
  document.addEventListener('transitionend',e=>{ if(e.target&&e.target.id==='critIsland'){ last=''; soon(); } });
  soon();
  window.pvxN334={room,fit,reset:()=>{ last=''; }};
})();}catch(__e){ console.warn('[n334]',__e); }
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 70 of 104 · pvx-n342-js · pvx-n340: HIG Writing ━━━━━ */
try{
/* PVX-N342 - HIG Entering data: every field in Triage intake and Edit triage has a name, so VoiceOver and Voice Control can reach it
   (the labels sat beside the fields without being tied to them, and three Edit triage fields had only a heading) */
(function(){
  var n=0;
  function tie(root){ if(!root) return;
    root.querySelectorAll('.ik-field, .ap-field').forEach(function(f){
      var c=f.querySelectorAll('input,select,textarea'); if(c.length!==1) return; c=c[0];
      if((c.labels&&c.labels.length)||c.getAttribute('aria-label')||c.getAttribute('aria-labelledby')) return;
      var l=f.querySelector('label');
      if(l&&!l.htmlFor){ if(!c.id) c.id='pvxik'+(++n); l.htmlFor=c.id; return; }
      var s=f.closest('.ap-sect,.ik-sect'), h=s&&s.querySelector('h4'); if(h) c.setAttribute('aria-label', h.textContent.replace(/\s+/g,' ').trim());
    }); }
  function watch(id){ var el=document.getElementById(id); if(!el) return; tie(el); try{ new MutationObserver(function(){ tie(el); }).observe(el,{childList:true,subtree:true}); }catch(e){} }
  function go(){ watch('intakeBody'); watch('triEditBody'); }
  /* Return on a field whose keyboard says Next moves to the next field of Add patient */
  document.addEventListener('keydown',function(e){ var t=e.target; if(e.key!=='Enter'||e.isComposing||!t||t.getAttribute('enterkeyhint')!=='next') return; var m=t.closest('#apModal'); if(!m) return;
    var f=[].filter.call(m.querySelectorAll('input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled])'),function(x){ return x.getClientRects().length; });
    var i=f.indexOf(t); if(i>-1&&f[i+1]){ e.preventDefault(); f[i+1].focus(); } },true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 71 of 104 · pvx-n343-js ━━━━━ */
try{
/* PVX-N343 - HIG Feedback: on a Mac or iPad, messages appear under the top bar and Flow's sub-nav, clear of the critical banner,
   so they no longer cover search, Log out and the light/dark switch for the seconds after every move; on iPhone they stay at the top but never cover the critical banner */
(function(){
  var N=null, t=0;
  function place(){ t=0; N=N||document.getElementById('notes'); if(!N) return; var b=document.body.classList;
    if(b.contains('tv-mode')||b.contains('client-mode')){ N.style.removeProperty('top'); return; }
    var top=14, sn=document.getElementById('subnavFlow'); if(sn&&sn.getClientRects().length){ var r=sn.getBoundingClientRect(); if(r.bottom>0&&r.bottom<innerHeight/2) top=Math.round(r.bottom)+8; }
    var ci=document.getElementById('critIsland'); if(ci&&ci.classList.contains('on')&&+getComputedStyle(ci).opacity>.1){
      var c=ci.getBoundingClientRect(), left=innerWidth-16-Math.min(320,innerWidth-32); if(c.right>left&&c.bottom>top-8&&c.top<top+120) top=Math.round(c.bottom)+8; }
    N.style.top=top+'px'; }
  function soon(){ if(!t) t=requestAnimationFrame(place); }
  function go(){ place(); addEventListener('resize',soon);
    try{ pvxWatch(soon,{attributes:true,attributeFilter:['class']},document.body); }catch(e){}
    var ci=document.getElementById('critIsland'); if(ci) try{ new MutationObserver(soon).observe(ci,{attributes:true,attributeFilter:['class','style']}); }catch(e){}
    var n=document.getElementById('notes'); if(n) try{ new MutationObserver(soon).observe(n,{childList:true}); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 72 of 104 · pvx-n344-js ━━━━━ */
try{
/* PVX-N344 - HIG Loading: until the patient list has really arrived (Backend._gotVisits, n273), Flow shows that it is loading
   instead of saying the hospital is empty ("0 patients", "No attention items · All current patients are clear", "8 rooms available").
   After 12 s it says it's still loading and to check the connection. The lobby TV and the Client Display are untouched. */
(function(){
  var H=document.documentElement;
  if(/[?&](display|tv|lobby)=?/.test(location.search)) return;
  H.classList.add('pvx-flow-loading');
  var t0=Date.now(), st=null;
  function say(t){ if(!st){ st=document.createElement('div'); st.id='pvxLoadSay'; st.setAttribute('role','status'); st.className='pvx-sr'; (document.body||H).appendChild(st); } if(st.textContent!==t) st.textContent=t; }
  function tick(){
    var b=document.body; if(b&&(b.classList.contains('tv-mode'))){ H.classList.remove('pvx-flow-loading','pvx-flow-slow'); return; }
    if(typeof Backend!=='undefined'&&Backend._gotVisits){ H.classList.remove('pvx-flow-loading','pvx-flow-slow'); if(st) st.textContent=''; return; }
    if(b) say(Date.now()-t0>12000?'Still loading patients — check the connection':'Loading patients…');
    if(Date.now()-t0>12000) H.classList.add('pvx-flow-slow');
    setTimeout(tick,150); }
  tick();
  window.pvxFlowLoading=function(elapsed){ H.classList.add('pvx-flow-loading'); H.classList.remove('pvx-flow-slow'); t0=Date.now()-(elapsed||0); tick(); };   /* for checks */
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 73 of 104 · pvx-n345-js ━━━━━ */
try{
/* PVX-N345 - HIG Managing notifications: a badge for what's waiting, so it reaches you when Flow isn't the tab or app in front.
   The tab's title starts with the number of unread family messages and says when a critical patient is waiting
   ("(2) Critical patient waiting · Pravix Flow…"); Flow installed on a Home Screen or Dock shows the same count on its icon.
   It clears as messages are read and the case is taken. The lobby TV keeps its own title. */
(function(){
  var BASE=null, last='';
  function upd(){ var b=document.body; if(!b) return; if(BASE===null) BASE=document.title;
    if(b.classList.contains('tv-mode')) return;
    if(/[?&](display|tv|lobby)=?/.test(location.search)) return;
    var n=0; try{ n=(typeof _unreadMsgs!=='undefined'&&_unreadMsgs)?_unreadMsgs.size:0; }catch(e){}
    var crit=b.classList.contains('crit-active'), signedIn=!(document.getElementById('sbLogin')&&getComputedStyle(document.getElementById('sbLogin')).display!=='none');
    if(!signedIn){ n=0; crit=false; }
    var t=(n?'('+n+') ':'')+(crit?'Critical patient waiting · ':'')+BASE;
    if(t!==last){ last=t; if(document.title!==t&&(document.title===BASE||/^(\(\d+\) )?(Critical patient waiting · )?/.test(document.title))) document.title=t;
      try{ if(navigator.setAppBadge){ if(n||crit) navigator.setAppBadge(n+(crit?1:0)); else if(navigator.clearAppBadge) navigator.clearAppBadge(); } }catch(e){} } }
  function go(){ upd(); setInterval(upd,1000); try{ pvxWatch(upd,{attributes:true,attributeFilter:['class']},document.body); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
  window.pvxBadgeNow=upd;   /* for checks */
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 74 of 104 · pvx-n346-js ━━━━━ */
try{
/* PVX-N346 - HIG Modality: a sheet over the patient drawer (Care team, Ultrasound request, Edit triage, Triage intake, Send a form…)
   keeps Tab inside it; the drawer behind is out of reach until the sheet closes (Tab wandered into the drawer 17 times in 25) */
(function(){
  var IDS=['ctModal','usModal','triEditModal','intakeModal','assignModal','apModal','alertModal','shiftModal','confirmBox'];
  function sheetOpen(){ return IDS.some(function(id){ var m=document.getElementById(id); return m&&m.classList.contains('open'); })
    || [].some.call(document.querySelectorAll('.cf-sheet.open,.fv-sheet.open,.sf-sheet.open'),function(x){ return x.getClientRects().length; }); }
  var on=false, back=null;
  function sync(){ var dr=document.getElementById('drawer'); if(!dr) return; var want=dr.classList.contains('open')&&sheetOpen();
    if(want===on) return; on=want;
    if(want){ var a=document.activeElement; back=(a&&dr.contains(a))?a:back; dr.inert=true; dr.setAttribute('data-pvx-inert','1'); }
    else if(dr.getAttribute('data-pvx-inert')){ dr.inert=false; dr.removeAttribute('data-pvx-inert');
      /* the sheet tried to put focus back while the drawer was still out of reach: finish the job */
      var f=document.activeElement, lost=!f||f===document.body||f.id==='stage'||IDS.some(function(id){ var m=document.getElementById(id); return m&&!m.classList.contains('open')&&m.contains(f); }); if(lost&&back&&back.isConnected&&dr.classList.contains('open')) try{ back.focus({preventScroll:true}); }catch(e){}
      back=null; } }
  function go(){ IDS.concat(['drawer']).forEach(function(id){ var m=document.getElementById(id); if(m) try{ new MutationObserver(sync).observe(m,{attributes:true,attributeFilter:['class']}); }catch(e){} });
    try{ pvxWatch(sync,{childList:true},document.body); }catch(e){} sync(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 75 of 104 · pvx-n347-js ━━━━━ */
try{
/* PVX-N347 - HIG Offering help: Flow's help is findable. Typing "help", "shortcuts" or "keyboard" in search offers Keyboard shortcuts
   (before, only the ? key opened it, and search said "No matches"). */
(function(){
  if(typeof searchIndex!=='function') return;
  var KEYS='<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>';
  pvxWrap('searchIndex',function(_si){ return function(q){ var r=_si.apply(this,arguments); var t=String(q||'').trim().toLowerCase();
    if(t.length>=2&&/^(help|hel|he|short|shortc|shortcu|shortcut|shortcuts|keyb|keyboard|keys|key|hotkey|\?)/.test(t)||t==='?'){
      r.push({kind:'Help',icon:true,svg:KEYS,color:'var(--ink-500)',title:'Keyboard shortcuts',sub:'Or press ? anytime',
        act:function(){ try{ closeSearch(); }catch(e){} var s=document.getElementById('globalSearch'); if(s) s.blur();
          setTimeout(function(){ document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); },30); }}); }
    return r; }; },'n347');
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 76 of 104 · pvx-n348-js ━━━━━ */
try{
/* PVX-N348 - HIG Printing.
   1. Command, Patients, the board and Rooms print on white with the screen's controls, banners and sheets left off, and a line saying when it was printed.
      Before, the dark screen printed as it looked (top bar, search, the critical banner on every page), and the list stopped after the first page.
   2. Print is in the + menu (with the view's name) and in the keyboard shortcuts; search answers "print". It's offered only where there's a view to print. */
(function(){
  var NAMES={dashboard:'Command',list:'Patients',flow:'Board',rooms:'Rooms'};
  function can(){ var b=document.body; return !!NAMES[pvxView()]&&!b.classList.contains('client-mode')&&!b.classList.contains('tv-mode')&&!b.classList.contains('fs-mode')&&!b.classList.contains('app-ultrasound')&&!b.classList.contains('app-rounds'); }
  var head=document.createElement('div'); head.id='pvxPrintHead'; head.setAttribute('aria-hidden','true'); document.body.insertBefore(head,document.body.firstChild);
  var wasDark=false, on=false;
  function begin(){ var b=document.body; if(on||b.classList.contains('end-tagging')||b.classList.contains('cf-printing')||!can()) return; on=true;
    var d=new Date(), when=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})+', '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    head.innerHTML='<span>VCA Shoreline · Pravix Flow · '+NAMES[pvxView()]+'</span><span>Printed '+when+'</span>';
    wasDark=b.classList.contains('dark'); if(wasDark) b.classList.remove('dark'); b.classList.add('pvx-printing'); }
  function end(){ if(!on) return; on=false; var b=document.body; b.classList.remove('pvx-printing'); if(wasDark) b.classList.add('dark'); wasDark=false; }
  window.addEventListener('beforeprint',begin); window.addEventListener('afterprint',end);
  try{ var mq=matchMedia('print'), f=function(e){ if(e.matches) begin(); else end(); }; if(mq.addEventListener) mq.addEventListener('change',f); else if(mq.addListener) mq.addListener(f); }catch(e){}
  window.pvxPrintView=function(){ if(!can()) return false; begin(); try{ window.print(); }catch(e){} setTimeout(end,0); return true; };
  window.pvxPrintBegin=begin; window.pvxPrintEnd=end;
  /* the + menu item: named for the view, offered only where printing makes sense */
  function paint(){ var it=document.getElementById('opsPrint'), s=document.getElementById('opsPrintS'); if(!it) return; var ok=can(); it.hidden=!ok;
    if(s) s.textContent=(NAMES[pvxView()]||'This view')+' · '+((window.PvxKeys&&PvxKeys.mac===false)?'Ctrl P':'⌘P'); }
  var fab=document.getElementById('fabAdd'); if(fab) fab.addEventListener('click',paint,true); paint();
  /* search: "print" offers Print this view */
  if(typeof searchIndex==='function'){
    var IC='<path d="M6.5 9V3.5h11V9"/><rect x="2.5" y="9" width="19" height="8.5" rx="2"/><rect x="6.5" y="14" width="11" height="7" rx="1"/>';
    pvxWrap('searchIndex',function(_si){ return function(q){ var r=_si.apply(this,arguments); var t=String(q||'').trim().toLowerCase();
      if(/^prin(t|ti|tin|ting)?$/.test(t)&&can()) r.push({kind:'Help',icon:true,svg:IC,color:'var(--ink-500)',title:'Print '+(pvxView()==='flow'?'the board':NAMES[pvxView()]),sub:((window.PvxKeys&&PvxKeys.mac===false)?'Ctrl P':'⌘P'),
        act:function(){ try{ closeSearch(); }catch(e){} var s=document.getElementById('globalSearch'); if(s) s.blur(); setTimeout(function(){ pvxPrintView(); },60); }});
      return r; }; },'n348');
  }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 77 of 104 · pvx-n349-js ━━━━━ */
try{
/* PVX-N349 - HIG Searching + Settings.
   Searching: say what the list and board are filtered by, and let it be cleared there; suggest the closest name for a typo;
   show why a patient matched (owner, reason); a typed ID filters the list too; "p1", "critical" or a stage name offers that filter; Recent can be cleared.
   Settings: Talk to Flow on or off per screen in the + menu, beside Reminder chime. */
(function(){
  var inp=document.getElementById('globalSearch'); if(!inp) return;
  function q(){ try{ return String(searchQ||''); }catch(e){ return ''; } }
  function clearSearch(){ inp.value=''; inp.dispatchEvent(new Event('input',{bubbles:true})); try{ closeSearch(); }catch(e){} }
  /* 1. the scope: "Matching “mil” · 1 of 9 · Clear search" under the Patients and Flow titles */
  function scopeEl(view){ var h=document.querySelector('#view-'+view+' .view-head > div'); if(!h) return null; var s=h.querySelector('.pvx-scope');
    if(!s){ s=document.createElement('div'); s.className='pvx-scope'; s.setAttribute('role','status'); h.appendChild(s);
      s.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return;
        if(b.dataset.fix){ inp.value=b.dataset.fix; inp.dispatchEvent(new Event('input',{bubbles:true})); try{ closeSearch(); }catch(x){} var nb=s.querySelector('button'); if(nb) nb.focus(); return; }
        clearSearch(); try{ var h1=document.querySelector('#view-'+view+' h1'); if(h1){ h1.tabIndex=-1; h1.focus(); } }catch(x){} }); }
    return s; }
  function scope(){ var t=q().trim(); var all=0; try{ all=PATIENTS.filter(isActive).length; }catch(e){}
    var n=0; try{ n=(typeof pvxBoardFiltered==='function'?pvxBoardFiltered():filtered()).filter(isActive).length; }catch(e){}
    ['list','flow'].forEach(function(v){ var s=scopeEl(v); if(!s) return; s.classList.toggle('on',!!t);
      var fix=(t&&!n)?correct(t):'';
      var html=t?'Matching <b>“'+pvxEsc(t)+'”</b>'+(v==='flow'?' · '+n+' of '+all:'')+(fix?'<button type="button" data-fix="'+pvxEsc(fix)+'">Search “'+pvxEsc(fix)+'”</button>':'')+'<button type="button" data-clear="1">Clear search</button>':'';
      if(s.__h!==html){ s.__h=html; s.innerHTML=html; } }); }
  if(typeof renderTable==='function'){ pvxAfter('renderTable',function(){ 
    try{ var rc=document.getElementById('resCount'); if(rc){ var m=/^(\d+)/.exec(rc.textContent); if(m) rc.textContent=m[1]+(+m[1]===1?' patient':' patients'); } }catch(e){}
    scope(); },'n349'); }
  if(typeof renderBoard==='function'){ pvxAfter('renderBoard',function(){ scope(); },'n349'); }
  /* 2. why it matched, and filters, in search */
  var STAGES=(typeof FLOW_COLS!=='undefined'?FLOW_COLS:[]);
  function lc(s){ return String(s||'').toLowerCase(); }
  if(typeof searchIndex==='function'){
    pvxWrap('searchIndex',function(si){ return function(qq){ var r=si.apply(this,arguments), t=lc(qq).trim(); if(!t) return r;
      try{ r.forEach(function(x){ if(x.kind!=='Patient'||x.__why) return; var p=PATIENTS.find(function(pp){ return (pp.name+' '+pp.last)===x.title; }); if(!p) return;
          var named=lc([p.name,p.last,p.room,p.status].join(' ')).indexOf(t)>-1; if(named) return;
          var why=lc(p.owner).indexOf(t)>-1?'Owner '+p.owner:lc(p.reason).indexOf(t)>-1?p.reason:'';
          if(why){ x.sub=why+' · '+x.sub; x.__why=1; } }); }catch(e){}
      try{ var act=PATIENTS.filter(isActive);
        var pm=/^(?:p\s?([123])|priority\s?([123])|(crit(?:i(?:c(?:a(?:l)?)?)?)?)|(urgent|urge|urg)|(stable|stab|sta))$/.exec(t);
        if(pm){ var lv=+(pm[1]||pm[2]||(pm[3]?1:pm[4]?2:3)); var n=act.filter(function(p){ return Number(p.prio)===lv; }).length;
          r.unshift({kind:'Filter',icon:true,color:'var(--priority-p'+lv+')',svg:'<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',title:'P'+lv+' · '+PRIO_LABEL[lv]+' patients',sub:(n===1?'1 patient':n+' patients')+' · Patients list',
            act:function(){ try{ closeSearch(); }catch(e){} clearSearch(); filters={status:null,prio:lv,doctor:null,liaison:null}; switchView('list'); renderFilterBar(); renderTable(); }}); }
        if(t.length>=3) STAGES.forEach(function(s){ if(lc(s).indexOf(t)!==0) return; var n=act.filter(function(p){ return p.status===s; }).length;
          r.unshift({kind:'Filter',icon:true,color:(STATUSES[s]&&STATUSES[s].color)||'var(--accent)',svg:'<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',title:'All patients in '+s,sub:(n===1?'1 patient':n+' patients')+' · Patients list',
            act:function(){ try{ closeSearch(); }catch(e){} clearSearch(); filters={status:s,prio:null,doctor:null,liaison:null}; switchView('list'); renderFilterBar(); renderTable(); }}); }); }catch(e){}
      return r; }; },'n349');
  }
  /* 3. a typo: show the closest name ("No matches for “Bela”. Showing Bella.") */
  function dl(a,b){ var m=a.length,n=b.length,d=[],i,j; for(i=0;i<=m;i++){ d[i]=[i]; } for(j=0;j<=n;j++) d[0][j]=j;
    for(i=1;i<=m;i++) for(j=1;j<=n;j++){ var c=a[i-1]===b[j-1]?0:1; d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c); if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1); }
    return d[m][n]; }
  function correct(t){ t=lc(t).trim(); if(t.length<3||/\s/.test(t)||/^\d/.test(t)) return '';
    var words=[]; try{ PATIENTS.filter(isActive).forEach(function(p){ words.push(p.name,p.last); }); DOCTORS.forEach(function(d){ String(d.name).replace(/^Dr\.?\s*/,'').split(/\s+/).forEach(function(w){ words.push(w); }); }); }catch(e){}
    var best='', bd=9, lim=t.length>=6?2:1;
    words.forEach(function(w){ var lw=lc(w); if(!lw||lw.length<3) return; var d=Math.min(dl(t,lw), lw.length>t.length?dl(t,lw.slice(0,t.length)):9, lw.length>t.length?dl(t,lw.slice(0,t.length+1)):9);
      if(d<=lim&&d<bd){ bd=d; best=w; } });
    return best; }
  if(typeof renderSearch==='function'){
    pvxWrap('renderSearch',function(rs){ return function(qq){ var t=String(qq||'').trim();
      if(t&&!searchIndex(t).length){ var c=correct(t); if(c&&searchIndex(c).length){ var r=rs.call(this,c);
          var box=document.getElementById('searchResults'), inr=box&&box.querySelector('.sr-inner');
          if(inr){ inr.insertAdjacentHTML('afterbegin','<div class="sr-hint pvx-dym" role="status">No matches for “'+pvxEsc(t)+'”. Showing <b>'+pvxEsc(c)+'</b>.</div>'); }
          return r; } }
      return rs.apply(this,arguments); }; },'n349');
  }
  /* 4. Recent can be cleared (it lives only in this tab, and goes when someone signs out) */
  var box=document.getElementById('searchResults');
  if(box){
    new MutationObserver(function(){ var lab=[].slice.call(box.querySelectorAll('.sr-label')).filter(function(l){ return l.textContent==='Recent'; })[0];
      if(lab&&!(lab.nextElementSibling&&lab.nextElementSibling.classList.contains('pvx-rclear'))){ var b=document.createElement('button'); b.type='button'; b.className='pvx-rclear'; b.textContent='Clear'; b.setAttribute('aria-label','Clear recent patients'); lab.insertAdjacentElement('afterend',b); } })
      .observe(box,{childList:true,subtree:true});
    box.addEventListener('mousedown',function(e){ if(e.target.closest('.pvx-rclear')) e.preventDefault(); },true);
    box.addEventListener('click',function(e){ if(!e.target.closest('.pvx-rclear')) return; e.preventDefault(); e.stopPropagation();
      window.__pvxRecentClear=(window.__pvxRecentClear||0)+1; try{ if(window.pvxRecent) pvxRecent.clear(); }catch(x){}
      var g=e.target.closest('.sr-group'); if(g) g.remove(); try{ searchFlat=[]; searchHl=-1; }catch(x){} try{ inp.focus(); }catch(x){}
      try{ if(window.pvxSay) pvxSay('Recent patients cleared'); }catch(x){} },true);
  }
  if(typeof logout==='function'){ pvxBefore('logout',function(){ try{ if(window.pvxRecent) pvxRecent.clear(); }catch(e){} },'n349'); }
  /* 5. Settings: Talk to Flow on this screen */
  function vpaint(){ var b=document.getElementById('opsVoice'), s=document.getElementById('opsVoiceS'); if(!b) return; var V=window.pvxVoice;
    var can=!!(V&&V.can())&&!document.body.classList.contains('client-mode'); b.hidden=!can; if(!can) return; var on=V.on();
    b.setAttribute('aria-checked',String(on)); if(s) s.textContent=(on?'On':'Off')+' · this screen'; }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#opsVoice'); if(!b||!window.pvxVoice) return; e.preventDefault(); e.stopPropagation();
    var on=pvxVoice.set(!pvxVoice.on()); vpaint(); try{ if(window.pvxSay) pvxSay('Talk to Flow '+(on?'on':'off')+' on this screen.'); }catch(x){} },true);
  var fab=document.getElementById('fabAdd'); if(fab) fab.addEventListener('click',vpaint,true); setTimeout(vpaint,0);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 78 of 104 · pvx-n350-js ━━━━━ */
try{
/* PVX-N350 - HIG Undo and redo.
   1. Priority, doctor and liaison changes can be undone (their note's Undo button, Cmd-Z) and redone (Shift-Cmd-Z); before, only moves could.
   2. Every Undo button belongs to the one history Cmd-Z uses (a discharge or admit, taking a critical case, a cancelled form, On the way),
      so Cmd-Z right after one of them undoes it, not something older.
   3. After an undo or redo, the patient's row or card is outlined for a moment and scrolled into view, so the change can be seen. */
(function(){
  if(!window.pvxUndo) return;
  function find(id){ try{ return PATIENTS.find(function(x){ return x.id===id; }); }catch(e){ return null; } }
  /* 3. show the result */
  var TT={}, mo=null;
  function el(id){ try{ var v=document.getElementById('view-'+currentView); var x=v&&v.querySelector('[data-pid="'+id+'"]'); return x&&x.offsetParent?x:null; }catch(e){ return null; } }
  function paint(){ var now=Date.now(), left=0; Object.keys(TT).forEach(function(id){ var age=now-TT[id]; if(age>1700){ delete TT[id]; return; } left++; var x=el(id);
      if(x&&!x.classList.contains('pvx-touched')){ x.style.animationDelay=(-age)+'ms'; x.classList.add('pvx-touched'); setTimeout(function(){ x.classList.remove('pvx-touched'); x.style.animationDelay=''; },1700-age); } });
    if(!left&&mo){ mo.disconnect(); mo=null; } }
  window.pvxTouch=function(id){ var x=el(id); TT[id]=Date.now(); if(x){ x.classList.remove('pvx-touched'); }
    if(!mo){ var st=document.getElementById('stage'); if(st){ mo=new MutationObserver(function(){ paint(); }); mo.observe(st,{childList:true,subtree:true}); } }
    paint(); x=el(id); if(x){ try{ x.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }catch(e){} }
    setTimeout(paint,1750); return !!x; };
  /* 2. a note's own Undo button joins the history */
  if(typeof window.fvNotifyAct==='function'){ var na=window.fvNotifyAct;
    window.fvNotifyAct=function(title,sub,act,fn,opts){ if(act!=='Undo'||typeof fn!=='function') return na.apply(this,arguments);
      var e, go=fn;
      if(!fn.__pvxU){ e=pvxUndo.push({label:String(title).replace(/<[^>]*>/g,''),undo:fn}); go=function(){ if(!pvxUndo.undoEntry(e)) fn(); }; go.__pvxU=1; } else e=pvxUndo.top();
      var r=na.call(this,title,sub,act,go,opts); try{ var w=document.getElementById('notes'); if(e&&w) e.__note=w.lastElementChild; }catch(x){} return r; }; }
  /* nested changes (a move that assigns a doctor, taking a case) belong to the outer change */
  var nest=0;
  ['moveStatus','moveRoom','completePatient'].forEach(function(n){ if(typeof window[n]!=='function') return; pvxWrap(n,function(f){ return function(){ nest++; try{ return f.apply(this,arguments); } finally { nest--; } }; },'n350'); });
  if(typeof window.critTakeCase==='function'){ var tk=window.critTakeCase;
    window.critTakeCase=function(id){ var r; nest++; try{ r=tk.apply(this,arguments); } finally { nest--; } var p=find(id); if(!p||!p.critTakenAt) return r;
      var nm=p.name||'Patient', e=pvxUndo.push({label:'Case taken',pid:id,undo:function(){ var q=find(id); if(!q||!q.critTakenAt) return false; window.critUndoTake(); q=find(id);
          if(q&&q.critTakenAt){ notify('Can’t undo',bcEsc(nm)+' · taking a case can be undone for 9 seconds',{icon:'info',color:'var(--accent)'}); if(window.pvxSay) pvxSay('Can’t undo taking the case'); return false; }
          notify('Take undone',bcEsc(nm)+' · back to waiting for a doctor',{icon:'move',color:'var(--accent)'}); }});
      window.__pvxTakeEntry=e; return r; };
    if(typeof window.critUndoTake==='function'){ var ut=window.critUndoTake; window.critUndoTake=function(){ var e=window.__pvxTakeEntry; if(e&&pvxUndo.top()===e&&!pvxUndo.__inUndo) pvxUndo.remove(e); return ut.apply(this,arguments); }; }
  }
  /* 1. priority, doctor and liaison */
  function label(field,p){ try{ if(field==='prio') return 'P'+p.prio+' · '+PRIO_LABEL[p.prio]; if(field==='doctor') return (p.doctor&&p.doctor!=='unassigned')?doc(p.doctor).name:'no doctor'; if(field==='liaison'){ var l=p.liaison&&liaison(p.liaison); return l?l.name:'no liaison'; } }catch(e){} return ''; }
  function fieldUndo(name,field,word,extra){
    if(typeof window[name]!=='function') return;
    pvxWrap(name,function(f){ return function(p,v){
      if(nest||!p||p[field]===v) return f.apply(this,arguments);
      var before=p[field], keep={}; (extra||[]).forEach(function(k){ keep[k]=p[k]; });
      var tl=(p.timeline||[]).length, real=window.notify, cap=null, r; nest++;
      window.notify=function(t,s,o){ if(!cap){ cap=[t,s,o]; return; } return real.apply(this,arguments); };
      try{ r=f.apply(this,arguments); } finally { window.notify=real; nest--; }
      if(p[field]===before){ if(cap) real.apply(null,cap); return r; }
      var after=p[field], added=(p.timeline||[]).slice(tl).map(function(x){ return x&&(x.label+'|'+(x.at&&+new Date(x.at))); }), id=p.id, args=[].slice.call(arguments,1);
      var e=pvxUndo.push({label:cap?cap[0]:word, pid:id,
        undo:function(){ var q=find(id); if(!q||q.completed||q[field]!==after){ notify('Can’t undo',(q?bcEsc(q.name||'')+' · ':'')+'this has changed since',{icon:'info',color:'var(--accent)'}); if(window.pvxSay) pvxSay('Can’t undo: this has changed since'); return false; }
          q[field]=before; Object.keys(keep).forEach(function(k){ if(keep[k]===undefined) delete q[k]; else q[k]=keep[k]; });
          if(field==='doctor'){ try{ ctSyncPrimary(q); }catch(x){} }
          q.timeline=(q.timeline||[]).filter(function(x){ return added.indexOf(x&&(x.label+'|'+(x.at&&+new Date(x.at))))<0; });
          scheduleRender(function(){ try{ if(activePatient===q.id) fillDrawer(q); }catch(x){} });
          notify(word+' undone',bcEsc(q.name||'')+' · back to '+bcEsc(label(field,q)),{icon:'move',color:'var(--accent)'}); if(window.pvxSay) pvxSay(word+' undone: '+(q.name||'')+', back to '+label(field,q)); },
        redo:function(){ var q=find(id); if(q) window[name].apply(null,[q].concat(args)); }});
      var go=function(){ pvxUndo.undoEntry(e); }; go.__pvxU=1;
      if(cap&&typeof window.fvNotifyAct==='function') window.fvNotifyAct(cap[0],cap[1],'Undo',go,Object.assign({dur:8000},cap[2]||{})); else if(cap) real.apply(null,cap);
      return r; }; },'n350');
  }
  fieldUndo('setPriority','prio','Priority change');
  fieldUndo('assignDoctor','doctor','Doctor change',['msDoctorAt']);
  fieldUndo('assignLiaison','liaison','Liaison change');
  /* undo through the history marks itself, so a button press and Cmd-Z don't both run */
  var u0=pvxUndo.undo, ue0=pvxUndo.undoEntry;
  pvxUndo.undo=function(){ pvxUndo.__inUndo=1; try{ return u0.apply(this,arguments); } finally { pvxUndo.__inUndo=0; } };
  pvxUndo.undoEntry=function(){ pvxUndo.__inUndo=1; try{ return ue0.apply(this,arguments); } finally { pvxUndo.__inUndo=0; } };
  /* once a change is undone, its note no longer offers Undo */
  var push0=pvxUndo.push; pvxUndo.push=function(e){ var r=push0.apply(this,arguments); if(e&&!e.__wrapped){ e.__wrapped=1; var u=e.undo; e.undo=function(){ var ok=u.apply(this,arguments);
      if(ok!==false&&e.__note){ [].forEach.call(e.__note.querySelectorAll('button'),function(b){ if(/^\s*Undo\s*$/.test(b.textContent)) b.remove(); }); } return ok; }; } return r; };
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 79 of 104 · pvx-n351-js ━━━━━ */
try{
/* PVX-N351 - HIG Text views + Web views.
   1. The hospital alert's public message and staff note, the triage intake's history and notes, and the ultrasound request's question and
      findings grow to show everything typed (they were fixed 2-line or short boxes that scrolled inside), up to 40% of the window.
   2. Back and Forward: opening a patient or a room is a step. The browser's Back (or Android's back gesture in the Home Screen app)
      closes it instead of leaving Flow, and Forward opens it again. Closing it with ✕ or Esc takes the step away. */
(function(){
  /* 1. text views that grow */
  var SEL='#alertMessage,#alertNote,#intakeModal .ik-area,#usCQ,#usDx';
  function fit(t){ if(!t||!t.isConnected||!t.offsetParent) return; t.classList.add('pvx-grow');
    var cs=getComputedStyle(t), b=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0), max=Math.round((window.innerHeight||800)*0.4);
    t.style.height='auto'; var need=t.scrollHeight+b, h=Math.min(need,max); t.style.height=h+'px'; t.classList.toggle('pvx-grow-max',need>max); }
  function fitAll(){ [].forEach.call(document.querySelectorAll(SEL),fit); }
  window.pvxFitText=fitAll;
  document.addEventListener('input',function(e){ if(e.target&&e.target.matches&&e.target.matches(SEL)) fit(e.target); },true);
  document.addEventListener('focusin',function(e){ if(e.target&&e.target.matches&&e.target.matches(SEL)) fit(e.target); },true);
  window.addEventListener('resize',function(){ fitAll(); });
  ['openAlertModal','openIntake','openUltrasoundRequest','openTriageEdit'].forEach(function(n){ if(typeof window[n]!=='function') return;
    pvxWrap(n,function(f){ return function(){ var r=f.apply(this,arguments); requestAnimationFrame(fitAll); setTimeout(fitAll,350); return r; }; },'n351'); });

  /* 2. Back and Forward */
  if(!window.history||!history.pushState) return;
  var PANELS={drawer:{el:'drawer',id:function(){ try{ return activePatient; }catch(e){ return null; } },open:function(id){ openDrawer(id); },close:function(){ closeDrawer(); }},
              loc:{el:'locDrawer',id:function(){ try{ return activeLoc; }catch(e){ return null; } },open:function(id){ openLocDrawer(id); },close:function(){ closeLocDrawer(); }}};
  var fromPop=0, pend=null;
  function isOpen(k){ var e=document.getElementById(PANELS[k].el); return !!(e&&e.classList.contains('open')); }
  function lobby(){ var b=document.body.classList; return b.contains('tv-mode')||b.contains('client-mode')||/[?&](tv|display|lobby)=?/.test(location.search); }
  function st(){ return history.state&&history.state.pvxPanel?history.state:null; }
  function opened(k){ if(fromPop||lobby()) return; var id=PANELS[k].id(); if(id==null) return;
    var s={pvxPanel:k,id:id};
    if(pend){ clearTimeout(pend); pend=null; }
    var cur=st(); if(cur){ history.replaceState(s,''); } else history.pushState(s,''); }
  function closed(k){ if(fromPop) return; var cur=st(); if(!cur||cur.pvxPanel!==k) return;
    clearTimeout(pend); pend=setTimeout(function(){ pend=null; var c=st(); if(c&&c.pvxPanel===k&&!isOpen(k)) history.back(); },80); }
  Object.keys(PANELS).forEach(function(k){ var el=document.getElementById(PANELS[k].el); if(!el) return; var was=el.classList.contains('open');
    new MutationObserver(function(){ var now=el.classList.contains('open'); if(now===was){ if(now){ var c=st(); var id=PANELS[k].id(); if(c&&c.pvxPanel===k&&id!=null&&c.id!==id&&!fromPop) history.replaceState({pvxPanel:k,id:id},''); } return; }
      was=now; if(now) opened(k); else closed(k); }).observe(el,{attributes:true,attributeFilter:['class']});
    if(was) opened(k); });
  /* a different patient in the open drawer updates the step */
  if(typeof window.openDrawer==='function'){ pvxAfter('openDrawer',function(pid){ try{ var c=st(); if(!fromPop&&c&&c.pvxPanel==='drawer'&&c.id!==pid&&isOpen('drawer')) history.replaceState({pvxPanel:'drawer',id:pid},''); }catch(e){} },'n351'); }
  window.addEventListener('popstate',function(e){ var s=e.state&&e.state.pvxPanel?e.state:null; if(pend){ clearTimeout(pend); pend=null; }
    fromPop++; try{
      Object.keys(PANELS).forEach(function(k){ if(isOpen(k)&&(!s||s.pvxPanel!==k)) PANELS[k].close(); });
      if(s&&PANELS[s.pvxPanel]&&!isOpen(s.pvxPanel)){ var ok=true; if(s.pvxPanel==='drawer'){ try{ ok=!!PATIENTS.find(function(x){ return x.id===s.id; }); }catch(x){ ok=false; } }
        if(ok) PANELS[s.pvxPanel].open(s.id); }
    } finally { setTimeout(function(){ fromPop--; },0); } });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 80 of 104 · pvx-n352-js ━━━━━ */
try{
/* PVX-N352 - HIG Boxes: each box says what it holds, for VoiceOver too.
   - The patient drawer's section titles (Flags, Assigned doctor, Liaison, Documents, Move to stage, Timeline) and its boxes'
     titles (pDVM records, Surgery, Triage, Care team, Triage intake, Family messages) are headings, so VoiceOver can move
     section to section; there was one heading, the patient's name.
   - Each box is a group named by its title: the drawer's boxes, Command's panels (Attention center, Client queue,
     Current wait by doctor) and its number tiles (On floor, Waiting…).
   - The intern supervision box had no title; it now reads "Intern supervision". */
(function(){
  function nm(s){ s=String(s||'').replace(/\s+/g,' ').trim(); return s; }
  function sentence(s){ s=nm(s); return (window.pvxChartName?pvxChartName(s):s); }
  var n=0; function idFor(el){ if(!el.id) el.id='pvxBoxT'+(++n); return el.id; }
  function head(el,level){ if(!el||el.getAttribute('role')==='heading'||/^H[1-6]$/.test(el.tagName)||el.closest('button,[role=button]')) return;   /* a title inside a button stays the button's name */ el.setAttribute('role','heading'); el.setAttribute('aria-level',String(level||3)); }
  function group(box,title){ if(!box||!title) return; if(box.matches('button,[role=button]')) return;
    if(!box.getAttribute('role')||box.getAttribute('role')==='group'){ var gid=idFor(title); if(box.getAttribute('role')!=='group') box.setAttribute('role','group'); if(box.getAttribute('aria-labelledby')!==gid) box.setAttribute('aria-labelledby',gid); } }
  function drawer(){ var d=document.getElementById('drawer'); if(!d) return;
    d.querySelectorAll('.sect-title,.timeline-title').forEach(function(t){ head(t,3); });
    d.querySelectorAll('.rec-card').forEach(function(b){ var t=b.querySelector('.rec-title'); if(t){ head(t,3); group(b,t); } });
    d.querySelectorAll('.triage-card:not([role=button]):not(button) .tc-title').forEach(function(t){ head(t,3); });
    var tri=d.querySelector('#triCard'); if(tri){ var tt=tri.querySelector('.tri-hmain b, .tri-hmain .tri-title, .tri-hmain > div:first-child'); if(tt){ head(tt,3); group(tri,tt); } }
    var ms=d.querySelector('.msg-sect'), mh=ms&&ms.querySelector('#commHead .comm-title, #commHead b, #commHead .comm-headwrap > :first-child'); if(ms&&mh){ head(mh,3); group(ms,mh); }
    d.querySelectorAll('.fg-sec,.fvd').forEach(function(b){ var t=b.querySelector('.sect-title'); if(t) group(b,t); });
    var pi=document.getElementById('pv-intern');
    if(pi){ var h=pi.querySelector(':scope > .pvx-box-t'); if(!h){ h=document.createElement('p'); h.className='sect-title pvx-box-t'; h.textContent='Intern supervision'; pi.insertBefore(h,pi.firstChild); }
      head(h,3); pi.setAttribute('aria-labelledby',idFor(h)); }
  }
  function command(){ var v=document.getElementById('view-dashboard'); if(!v) return;
    v.querySelectorAll('.panel').forEach(function(b){ var t=b.querySelector('h3,h2'); if(t) group(b,t); });
    v.querySelectorAll('.command-kpi').forEach(function(k){ var l=k.querySelector('.command-kpi__label'); if(!l) return; var s=sentence(l.textContent);
      if(k.getAttribute('aria-label')!==s){ k.setAttribute('role','group'); k.setAttribute('aria-label',s); } });
  }
  var t=0; function soon(){ if(t) return; t=requestAnimationFrame(function(){ t=0; try{ drawer(); command(); }catch(e){} }); }
  ['drawer','view-dashboard'].forEach(function(id){ var el=document.getElementById(id); if(el) new MutationObserver(soon).observe(el,{childList:true,subtree:true}); });
  soon();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 81 of 104 · pvx-n353-js ━━━━━ */
try{
/* PVX-N353 - HIG Disclosure controls: Triage details open and close from the keyboard and tell VoiceOver whether they're open
   (the row only answered a click; its details were read out even when closed). */
(function(){
  function wire(){ var card=document.getElementById('triCard'), head=document.getElementById('triHead'); if(!card||!head) return;
    var ch=head.querySelector('.tri-chev'), det=card.querySelector('.tri-detail'); if(!ch) return;
    if(det&&!det.id) det.id='triDetail';
    if(!ch.__pvx){ ch.__pvx=1; ch.setAttribute('role','button'); ch.setAttribute('tabindex','0'); ch.setAttribute('aria-label','Triage details'); if(det) ch.setAttribute('aria-controls',det.id);
      ch.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); head.click(); setTimeout(sync,0); } }); }
    sync();
    if(!card.__pvxMo){ card.__pvxMo=new MutationObserver(sync); card.__pvxMo.observe(card,{attributes:true,attributeFilter:['class']}); } }
  function sync(){ var card=document.getElementById('triCard'), ch=card&&card.querySelector('.tri-chev'); if(!ch) return; var open=card.classList.contains('open');
    if(ch.getAttribute('aria-expanded')!==String(open)) ch.setAttribute('aria-expanded',String(open));
    var det=card.querySelector('.tri-detail'); if(det){ if(open) det.removeAttribute('aria-hidden'); else { if(det.contains(document.activeElement)) ch.focus(); det.setAttribute('aria-hidden','true'); } } }
  var m=document.getElementById('triageMount'); if(m) new MutationObserver(wire).observe(m,{childList:true,subtree:false});
  wire();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 82 of 104 · pvx-n354-js ━━━━━ */
try{
/* PVX-N354 - HIG Lists and tables.
   1. Selection feedback: while a patient is open, their row on Patients and their card on the board stay highlighted
      (aria-current), so it's clear whose drawer it is. Nothing marked the row before.
   2. Column headings sort Patients (macOS: "let people click a column heading to sort"). The first click sorts the natural way
      for that column (names A to Z, P1 first, longest wait first, earliest arrival first), the second reverses it, the third goes
      back to most urgent first, Flow's own order. "Most urgent first" beside the count does the same. */
(function(){
  /* 1. the open patient */
  function cur(){ try{ return document.getElementById('drawer').classList.contains('open')?activePatient:null; }catch(e){ return null; } }
  function mark(){ var id=cur(); ['#tableBody tr[data-pid]','#board .card[data-pid]'].forEach(function(sel){ [].forEach.call(document.querySelectorAll(sel),function(el){
      var on=id!=null&&el.getAttribute('data-pid')===String(id); el.classList.toggle('pvx-current',on); if(on) el.setAttribute('aria-current','true'); else el.removeAttribute('aria-current'); }); }); }
  var mt=0; function soon(){ if(mt) return; mt=setTimeout(function(){ mt=0; mark(); },0); }   /* a timer, not the next frame: a page in the background gets no frames */
  ['tableBody','board'].forEach(function(id){ var el=document.getElementById(id); if(el) new MutationObserver(soon).observe(el,{childList:true,subtree:true}); });
  var dr=document.getElementById('drawer'); if(dr) new MutationObserver(soon).observe(dr,{attributes:true,attributeFilter:['class']});
  if(typeof window.openDrawer==='function'){ pvxAfter('openDrawer',function(){ try{ mark(); }catch(e){} soon(); },'n354'); }

  /* 2. sorting */
  var KEY=null, DIR=1;
  var NAT={patient:1,reason:1,doctor:1,location:1,status:1,priority:1,arrival:1,wait:-1};
  var WORD={patient:'patient',reason:'reason',doctor:'doctor',location:'location',status:'status',priority:'priority',arrival:'arrival',wait:'wait'};
  var DIRW={patient:['A to Z','Z to A'],reason:['A to Z','Z to A'],doctor:['A to Z','Z to A'],location:['A to Z','Z to A'],status:['in stage order','in reverse stage order'],priority:['P1 first','P3 first'],arrival:['earliest first','latest first'],wait:['shortest first','longest first']};
  var ARROW='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function val(p,k){ try{ switch(k){
      case 'patient': return ((p.name||'')+' '+(p.last||'')).toLowerCase();
      case 'reason': return String((typeof compactProblems==='function'?compactProblems(p):'')||p.reason||'').toLowerCase()||'\uffff';
      case 'doctor': return (!p.doctor||p.doctor==='unassigned')?'\uffff':String(doc(p.doctor).name||'').replace(/^Dr\.?\s*/,'').toLowerCase();
      case 'location': return String(p.room||'').toLowerCase().replace(/\d+/g,function(n){ return ('000'+n).slice(-4); });
      case 'status': var i=(typeof FLOW_COLS!=='undefined'?FLOW_COLS:[]).indexOf(p.status); return i<0?99:i;
      case 'priority': return Number(p.prio)||9;
      case 'arrival': return +new Date(p.arrival)||0;
      case 'wait': return (typeof waitMinutes==='function')?waitMinutes(p):0; } }catch(e){} return ''; }
  function find(id){ try{ return PATIENTS.find(function(x){ return String(x.id)===String(id); }); }catch(e){ return null; } }
  function apply(){ var tb=document.getElementById('tableBody'); if(!tb) return; var rows=[].slice.call(tb.querySelectorAll(':scope > tr[data-pid]')); if(!rows.length) return;
    var base=rows.map(function(r,i){ return {r:r,i:i,p:find(r.getAttribute('data-pid'))}; });
    if(KEY){ base.sort(function(a,b){ if(!a.p||!b.p) return a.i-b.i; var x=val(a.p,KEY), y=val(b.p,KEY); if(x<y) return -DIR; if(x>y) return DIR; return (typeof pvxByUrgency==='function')?pvxByUrgency(a.p,b.p):a.i-b.i; }); }
    else if(typeof pvxByUrgency==='function'){ base.sort(function(a,b){ if(!a.p||!b.p) return a.i-b.i; return pvxByUrgency(a.p,b.p)||a.i-b.i; }); }
    var changed=base.some(function(o,j){ return o.r!==rows[j]; }); if(changed) base.forEach(function(o){ tb.appendChild(o.r); });
    paint(); }
  function paint(){ [].forEach.call(document.querySelectorAll('#view-list thead th[data-sort]'),function(th){ var k=th.getAttribute('data-sort');
      if(!th.querySelector('.pvx-th')){ var t=th.textContent.trim(); th.textContent=''; var b=document.createElement('button'); b.type='button'; b.className='pvx-th'; b.innerHTML='<span class="pvx-th-t"></span><span class="pvx-sort" aria-hidden="true">'+ARROW+'</span>'; b.firstChild.textContent=t; th.appendChild(b);
        b.addEventListener('click',function(){ choose(k); }); }
      var b2=th.querySelector('.pvx-th'), name=b2.querySelector('.pvx-th-t').textContent;
      if(KEY===k){ th.setAttribute('aria-sort',DIR===1?'ascending':'descending'); var d=DIRW[k][DIR===1?0:1], nd=DIR===NAT[k]?DIRW[k][DIR===1?1:0]:'most urgent first'; b2.title='Sorted by '+WORD[k]+', '+d+'. Click for '+nd+'.'; b2.setAttribute('aria-label',name+', sorted '+d); }
      else { th.removeAttribute('aria-sort'); b2.title='Sort by '+WORD[k]; b2.setAttribute('aria-label','Sort by '+WORD[k]); } });
    var rc=document.getElementById('resCount'), rs=document.getElementById('pvxSortReset');
    if(rc&&!rs){ rs=document.createElement('button'); rs.type='button'; rs.id='pvxSortReset'; rs.textContent='Most urgent first'; rs.title='Back to Flow’s order: P1 first, then the longest wait'; rs.addEventListener('click',function(){ choose(null); }); rc.insertAdjacentElement('afterend',rs); }
    if(rs){ rs.hidden=!KEY; if(rc){ var cs=getComputedStyle(rc); rs.style.fontSize=cs.fontSize; rs.style.lineHeight=cs.lineHeight; } } }
  function choose(k){
    if(k===null){ KEY=null; DIR=1; }
    else if(KEY!==k){ KEY=k; DIR=NAT[k]; }
    else if(DIR===NAT[k]){ DIR=-DIR; }
    else { KEY=null; DIR=1; }
    apply();
    try{ if(window.pvxSay) pvxSay(KEY?('Sorted by '+WORD[KEY]+', '+DIRW[KEY][DIR===1?0:1]):'Sorted most urgent first'); }catch(e){}
    var th=KEY&&document.querySelector('#view-list thead th[data-sort="'+KEY+'"] .pvx-th'); if(th&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest('thead')) th.focus(); }
  window.pvxListSort=function(k){ choose(k); return {key:KEY,dir:DIR}; };
  if(typeof renderTable==='function'){ pvxAfter('renderTable',function(){ try{ apply(); }catch(e){} },'n354'); }
  paint();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 83 of 104 · pvx-n355-js ━━━━━ */
try{
/* PVX-N355 - HIG Split views: with a patient open, ⌥↓ and ⌥↑ move to the next or previous patient in the order the view shows
   (Patients as sorted, the board stage by stage, Rooms room by room; from Command, most urgent first), the way Mail moves through
   a list with its message open. The drawer follows, the row or card stays highlighted (n354), and VoiceOver hears where it is
   ("Milo Chen, 3 of 9"). It stops at either end and says so. Text fields, menus and sheets keep their own arrow keys. */
(function(){
  function seq(){ var sel={list:'#tableBody tr[data-pid]',flow:'#board .card[data-pid]',rooms:'#view-rooms [data-pid]'}[pvxView()], ids=[];
    if(sel){ [].forEach.call(document.querySelectorAll(sel),function(el){ if(!el.offsetParent) return; var id=el.getAttribute('data-pid'); if(id&&ids.indexOf(id)<0) ids.push(id); }); }
    if(!ids.length){ try{ ids=PATIENTS.filter(isActive).slice().sort(pvxByUrgency).map(function(p){ return String(p.id); }); }catch(e){} }
    return ids; }
  function name(id){ try{ var p=PATIENTS.find(function(x){ return String(x.id)===String(id); }); return p?((p.name||'')+(p.last?' '+p.last:'')):''; }catch(e){ return ''; } }
  function say(t){ try{ if(window.pvxSay) pvxSay(t); }catch(e){} }
  function step(d){ var cur; try{ cur=String(activePatient); }catch(e){ return false; } var ids=seq(), i=ids.indexOf(cur);
    if(i<0){ if(!ids.length) return false; i=d>0?-1:ids.length; }
    var j=i+d; if(j<0||j>=ids.length){ say(d>0?'Last patient':'First patient'); return true; }
    openDrawer(ids[j]); say(name(ids[j])+', '+(j+1)+' of '+ids.length);
    var dr=document.getElementById('drawer'); if(dr&&!dr.contains(document.activeElement)){ var h=dr.querySelector('h2'); if(h){ h.tabIndex=-1; try{ h.focus({preventScroll:true}); }catch(e){ h.focus(); } } }
    try{ var row=document.querySelector('#view-'+pvxView()+' [data-pid="'+ids[j]+'"]'); if(row) row.scrollIntoView({block:'nearest'}); }catch(e){}
    return true; }
  window.pvxStepPatient=step;
  function covered(){ return [].some.call(document.querySelectorAll('.addpt-modal.open,.intake-modal.open,.us-modal.open,.confirm.open,#fvStale.show,.ops-menu.open,.dd-panel.open,[role=menu]:not([hidden])'),function(m){ return !!m.offsetParent; }); }
  document.addEventListener('keydown',function(e){
    if(!e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||(e.key!=='ArrowDown'&&e.key!=='ArrowUp')) return;
    var dr=document.getElementById('drawer'); if(!dr||!dr.classList.contains('open')) return;
    if(pvxTyping()||covered()) return;
    if(step(e.key==='ArrowDown'?1:-1)){ e.preventDefault(); e.stopPropagation(); }
  },true);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 84 of 104 · pvx-n356-js ━━━━━ */
try{
/* PVX-N356 - HIG Tab views + Activity views. See n356/patch_n356.py for the source changes:
   1. the share sheet wherever the browser has one, beside Copy, with Apple's Share symbol;
   2. the Patients filter chips filter only Patients; the board shows everyone (search still applies to both). */
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 85 of 104 · pvx-n357-js ━━━━━ */
try{
/* PVX-N357 - HIG Buttons + Context menus. Source changes in n357/patch_n357.py:
   1. "Waiting on …" on a board card is a button (name, keyboard, press state, ✕), and its context menu can clear it;
   2. Book surgery… ends in an ellipsis (it opens the booking sheet);
   3. the context menu draws its chevrons and gives Copy, Share and Send a form their symbols;
   4. the Attention center's patient items have the same context menu as the board, the list and Rooms. */
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 86 of 104 · pvx-n358-js ━━━━━ */
try{
/* PVX-N358 - HIG Dock menus: /#find and /#view=… open from the Dock menu, the Mac File menu or a link
   (/#op=new was n207). Find focuses the search field; a view opens that view. The address is tidied afterwards. */
(function(){
  var VIEWS={list:1,flow:1,rooms:1,dashboard:1,consent:1,client:1};
  function app(){ try{ return typeof currentApp!=='undefined'?currentApp:'flow'; }catch(e){ return 'flow'; } }
  function go(){ var h=String(location.hash||''); var mv=/(^#|&)view=([a-z]+)/.exec(h), mf=/(^#|&)find\b/.test(h);
    if(!mv&&!mf) return; if(mv&&!VIEWS[mv[2]]) return;
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    try{ if(app()!=='flow'&&typeof switchApp==='function') switchApp('flow'); }catch(e){}
    setTimeout(function(){
      if(mv){ try{ switchView(mv[2]); }catch(e){} return; }
      var s=document.getElementById('globalSearch'); if(!s) return;
      if(!s.getClientRects().length){ var b=document.querySelector('#subnavFlow [aria-label^="Search"]:not(input)'); if(b) b.click(); }
      setTimeout(function(){ try{ s.focus(); s.select(); }catch(e){} },60);
    },120); }
  setTimeout(go,700); window.addEventListener('hashchange',go);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 87 of 104 · pvx-n359-js ━━━━━ */
try{
/* PVX-N359 - HIG Home Screen quick actions: with launch_handler focus-existing, choosing New patient, Find a patient,
   Patients or Client Display from the Dock menu, the File menu or a quick action brings the open Flow window forward and does
   it there, without reloading the board. The first launch is the one that opened this page, which the page has already
   handled (n207, n358); later ones are handed to the same #op= / #find / #view= handlers. */
(function(){
  if(!('launchQueue' in window)||!window.launchQueue||typeof launchQueue.setConsumer!=='function') return;
  var first=true;
  launchQueue.setConsumer(function(params){
    if(first){ first=false; return; }
    try{ var u=new URL(params&&params.targetURL||'', location.href); if(u.origin!==location.origin) return;
      var h=String(u.hash||'').replace(/^#/,''); if(!h) return;
      if(String(location.hash).replace(/^#/,'')===h){ try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
      location.hash=h; }catch(e){}
  });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 88 of 104 · pvx-n360-js ━━━━━ */
try{
/* PVX-N360 - HIG Pop-up buttons + Pull-down buttons. Source changes in n360/patch_n360.py:
   1. pop-up choices are read as words ("Klaudia Polak, Free"), the button as "Doctor: Kelley Harpin";
   2. short pop-ups (three priorities) don't show a search field, and keep their keys;
   3. the drawer's Doctor pop-up offers "No doctor" once one is assigned, and removing one says "Doctor removed";
   4. a live update doesn't rebuild the drawer under an open pop-up: the refill waits until the list closes. */
(function(){
  if(typeof fillDrawer!=='function') return;
  var pend=null, shown=null;
  function inDrawer(){ try{ var d=document.getElementById('drawer'); return !!(ddOpen&&ddOpen.root&&d&&d.contains(ddOpen.root)); }catch(e){ return false; } }
  pvxWrap('fillDrawer',function(orig){ return function(p){
    if(inDrawer()){ if(p&&p.id===shown){ pend=p; return; } try{ ddOpen.close(); }catch(e){} }   /* another patient: close the list, then fill */
    pend=null; shown=p&&p.id; return orig.apply(this,arguments); }; },'n360');
  window.__pvxDdClosed=function(){ if(!pend||inDrawer()) return; var id=pend.id; pend=null;
    try{ if(typeof activePatient!=='undefined'&&activePatient===id){ var q=PATIENTS.find(function(x){ return x.id===id; }); if(q) window.fillDrawer(q); } }catch(e){} };
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 89 of 104 · pvx-n361-js ━━━━━ */
try{
/* PVX-N361 - HIG Path controls + Search fields. Source changes in n361/patch_n361.py:
   1. Flow's search shows the longest whole placeholder that fits ("Search patients, doctors, rooms" on a wide Mac window),
      never one cut mid-word; the field is wider where the window has room;
   2. every search field has a Clear button (pop-ups, Add flag), and Esc in Add flag clears what's typed before closing;
   3. names aren't autocorrected or underlined in Flow's search or the pop-ups' search;
   4. a pop-up choice shows its whole name and load, wrapping when long, instead of ending in "…";
   5. Esc in a pop-up or in Add flag closes only that, not the drawer behind it.
   Path controls are a Mac file-system control; Flow has no files or folders to show a path for. */
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 90 of 104 · pvx-n362-js ━━━━━ */
try{
/* PVX-N362 - the board view is "Board" (the sub-nav, the iPhone tab bar, its heading, ⌥3's name, Print and the keyboard
   shortcuts). Flow is the app's name only. The view id stays `flow`. */
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 91 of 104 · pvx-n363-js ━━━━━ */
try{
/* PVX-N363 - HIG Tab bars: "switch between sections while preserving the current navigation state within each section".
   1. Each Flow view keeps its own scroll position: Patients scrolled to Ziggy, a look at the board, and back on Patients
      Ziggy is still in view. Before, the one scrolling area carried whatever position the last view left, so a view came
      back somewhere else. A view opened for the first time starts at its top.
   2. Choosing the view you're already on takes it back to its top (as iOS does when you tap the current tab again).
   3. The Consent forms tab says its badge in words: VoiceOver heard "Consent forms2"; now "Consent forms, 2 waiting". */
(function(){
  var POS={}, busy=false;
  function stage(){ return document.getElementById('stage'); }
  function cur(){ try{ return currentView; }catch(e){ return ''; } }
  if(typeof switchView!=='function') return;
  /* where a view was: the first patient in sight and its distance from the top (a pixel offset alone drifts when the
     critical banner's room comes and goes), with the offset as the fallback */
  function mark(v){ var st=stage(), el=document.getElementById('view-'+v); if(!st) return null; var top=st.getBoundingClientRect().top, a=null;
    if(el&&st.scrollTop>4){ var c=el.querySelectorAll('[data-pid]'); for(var k=0;k<c.length;k++){ var r=c[k].getBoundingClientRect(); if(r.height&&r.bottom>top+8){ a={pid:c[k].getAttribute('data-pid'),off:r.top-top,nth:[].filter.call(c,function(x){ return x.getAttribute('data-pid')===c[k].getAttribute('data-pid'); }).indexOf(c[k])}; break; } } }
    return {y:st.scrollTop,a:a}; }
  function jump(st,y){ var s=st.style.scrollBehavior; st.style.scrollBehavior='auto'; st.scrollTop=y; st.style.scrollBehavior=s; }   /* the stage scrolls smoothly; a return is instant */
  function back(v,m){ var st=stage(); if(!st) return; if(!m||m.y<=4){ jump(st,0); return; }
    var el=document.getElementById('view-'+v), same=m.a&&el?[].filter.call(el.querySelectorAll('[data-pid]'),function(x){ return x.getAttribute('data-pid')===m.a.pid; }):[], t=same[m.a?m.a.nth:0]||same[0];
    if(t&&!t.getBoundingClientRect().height) t=null;
    if(t){ var top=st.getBoundingClientRect().top; jump(st, st.scrollTop+(t.getBoundingClientRect().top-top)-m.a.off); } else jump(st,m.y); }
  pvxWrap('switchView',function(base){ return function(v){
    var st=stage(), from=cur();
    if(st&&from&&!busy) POS[from]=mark(from);
    var r=base.apply(this,arguments);
    if(st&&v!==from){ var m=POS[v]||null, touched=false, hit=function(){ touched=true; };
      ['wheel','touchstart','keydown','pointerdown'].forEach(function(k){ st.addEventListener(k,hit,{once:true,passive:true}); });
      /* after the view has drawn (renderAll is synchronous; late layers and the banner's room settle over a few frames) */
      back(v,m); requestAnimationFrame(function(){ if(cur()===v&&!touched) back(v,m); });
      [120,350].forEach(function(ms){ setTimeout(function(){ if(cur()===v&&!touched) back(v,m); },ms); }); }
    return r; }; },'n363');
  /* 2. the current tab again: back to the top */
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#switcher .seg[data-view]'); if(!b) return;
    var v=b.dataset.view; if(v!==cur()||v==='client') return; var st=stage(); if(!st||st.scrollTop<4) return;
    try{ st.scrollTo({top:0,behavior:pvxReduceMotion()?'auto':'smooth'}); }catch(x){ st.scrollTop=0; } POS[v]=null; },true);
  /* 3. Consent forms' badge in words */
  function syncBadge(){ var b=document.getElementById('cfBadge'), seg=b&&b.closest('.seg'); if(!seg) return;
    var n=b.hidden?0:(parseInt(b.textContent,10)||0), lab='Consent forms'+(n?', '+n+' waiting':'');
    if(seg.getAttribute('aria-label')!==lab) seg.setAttribute('aria-label',lab); if(b.getAttribute('aria-hidden')!=='true') b.setAttribute('aria-hidden','true'); }
  function watch(){ var b=document.getElementById('cfBadge'); if(!b){ setTimeout(watch,500); return; } syncBadge();
    try{ new MutationObserver(syncBadge).observe(b,{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true}); }catch(e){} }
  watch();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 92 of 104 · pvx-n364-js ━━━━━ */
try{
/* PVX-N364 - HIG Token fields (Add patient's Reason for visit). Source changes in n364/patch_n364.py:
   1. a token's ✕ is the Close symbol (it was a typed "×"); its tooltip says what was typed when the problem was matched to a name;
   2. problems can be put in order: Move earlier / Move later in the token's menu, and ⌥← ⌥→ on a selected token
      (the first problem leads the reason everywhere and is recorded as the visit's main reason);
   3. the token's menu has commands only, Remove last in red after a separator (the "Typed: …" row did nothing).
   Activity rings: Move, Exercise and Stand only; Flow shows no fitness data and no ring that could be mistaken for them. */
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 93 of 104 · pvx-n365-js ━━━━━ */
try{
/* PVX-N365 - HIG Gauges and Progress indicators (see n365/patch_n365.py): waits that say what they get and when they stall;
   the Undo countdown waits while the pointer or focus is on it */
(function(){
  var MS=10000, DOCS={};
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var WORD={msgs:['msg-empty','Getting messages…','The messages haven’t arrived yet. Check the connection.'],
            docs:['fvd-empty','Getting documents…','The documents haven’t arrived yet. Check the connection.']};
  function body(kind,stalled){ var w=WORD[kind];
    return stalled ? esc(w[2])+(kind==='msgs'?' <button type="button" class="pvx-wait-retry" data-pvx-retry="msgs">Try again</button>':'')
                   : '<span class="pvx-spin" aria-hidden="true"></span>'+esc(w[1]); }
  window.pvxWaitHTML=function(kind,id){ var since=Date.now();
    if(kind==='docs'){ since=DOCS[id]||(DOCS[id]=since); }
    var stalled=Date.now()-since>MS;
    return '<div class="'+WORD[kind][0]+' pvx-wait'+(stalled?' is-stalled':'')+'" role="status" data-pvx-wait="'+kind+'" data-since="'+since+'">'+body(kind,stalled)+'</div>'; };
  function tick(){ var now=Date.now();
    document.querySelectorAll('[data-pvx-wait]:not(.is-stalled)').forEach(function(el){ var s=+el.getAttribute('data-since')||now;
      if(now-s>MS){ el.classList.add('is-stalled'); el.innerHTML=body(el.getAttribute('data-pvx-wait'),true); } }); }
  setInterval(tick,1000);
  window.pvxWaits={tick:tick, docs:DOCS, ms:function(v){ if(v!=null) MS=v; return MS; }};   /* for checks */
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-pvx-retry="msgs"]'); if(!b) return;
    var el=document.getElementById('msgThread'); if(!el) return;
    var p=null; try{ p=PATIENTS.find(function(x){ return x.id===activePatient; }); }catch(_){}
    el.innerHTML=pvxWaitHTML('msgs'); if(p&&typeof loadThread==='function') loadThread(p); });

  if(typeof showUndo==='function'){
    var start=0, left=5000, paused=false;
    function bar(t){ return t&&t.querySelector('.undo-progress'); }
    function pause(){ var t=document.getElementById('undoToast'); if(paused||!t||!t.classList.contains('open')) return;
      paused=true; try{ clearTimeout(_dispUndoTimer); }catch(_){} left=Math.max(0,left-(Date.now()-start)); var b=bar(t); if(b) b.style.animationPlayState='paused'; }
    function resume(){ var t=document.getElementById('undoToast'); if(!paused||!t) return;
      if(t.matches(':hover')||t.contains(document.activeElement)) return;
      paused=false; start=Date.now(); var b=bar(t); if(b) b.style.animationPlayState='running';
      try{ _dispUndoTimer=setTimeout(function(){ hideUndo(); }, Math.max(600,left)); }catch(_){} }
    pvxAfter('showUndo',function(){ start=Date.now(); left=5000; paused=false;
      var t=document.getElementById('undoToast');
      if(t&&!t.__pvx365){ t.__pvx365=1;
        t.addEventListener('pointerenter',pause); t.addEventListener('focusin',pause);
        t.addEventListener('pointerleave',function(){ setTimeout(resume,0); }); t.addEventListener('focusout',function(){ setTimeout(resume,0); }); }
      if(t&&(t.matches(':hover')||t.contains(document.activeElement))) pause();
      },'n365');
  }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 94 of 104 · pvx-n366-js ━━━━━ */
try{
/* PVX-N366 - HIG Action sheets and Alerts (second look). Source changes in n366/patch_n366.py:
   1. the Hospital alert's question (activate a diversion, end an alert) is Flow's own alert, not a box of its own;
   2. Ctrl+. cancels off a Mac, as ⌘. does on one;
   3. the duplicate check names the button it means: "Choose Add new visit only if this is a different pet." */
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 95 of 104 · pvx-n367-js ━━━━━ */
try{
/* PVX-N367 - HIG Panels and Page controls (second look; n210 was the first). Source changes in n367/patch_n367.py:
   1. the patient drawer is an inspector from 1024 pt (it was 1180): another patient beside it opens in one click;
   2. on Command too: another patient's attention item switches the drawer instead of closing it;
   3. the Lobby / Treatment panel is a panel beside the Rooms grid, not a modal: it has no scrim (patients are dragged from it
      to the rooms), so keyboard and VoiceOver can now reach the rooms too (no Tab trap, aria-modal false). On iPhone, where
      it fills the screen, it stays modal. */
(function(){
  var PH=function(){ return window.innerWidth<=700; };
  if(window.pvxOverlay&&pvxOverlay.register) pvxOverlay.register([{sel:'#locDrawer', open:'open', get modal(){ return PH(); }, close:'.drawer-head .close,.close', initial:':self'}]);
  var el=document.getElementById('locDrawer'); if(!el) return;
  function sync(){ if(!el.classList.contains('open')) return; el.setAttribute('role','dialog'); el.setAttribute('aria-labelledby','locTitle'); el.setAttribute('aria-modal', PH()?'true':'false'); }
  try{ new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['class']}); }catch(e){}
  window.addEventListener('resize',sync);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 96 of 104 · pvx-n368-js ━━━━━ */
try{
/* PVX-N368 - HIG Scroll views. Flow's views scroll in #stage, not the page, so with nothing focused (after opening Flow,
   switching views from the keyboard, or closing a sheet) Page Up / Page Down, Space, the arrows, Home and End did nothing.
   They now scroll the view, a page at a time with a line of overlap. Talk to Flow keeps Space where it's switched on. */
(function(){
  var K={PageDown:1,PageUp:-1,' ':1,ArrowDown:1,ArrowUp:-1,Home:0,End:0};
  window.addEventListener('keydown',function(e){
    if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey||!(e.key in K)) return;
    var t=e.target; if(t!==document.body&&t!==document.documentElement) return;
    try{ if(window.pvxOverlay&&pvxOverlay.top()) return; }catch(x){}
    var st=document.getElementById('stage'); if(!st||st.scrollHeight<=st.clientHeight+2) return;
    var page=Math.max(80,st.clientHeight-48), y=st.scrollTop;
    if(e.key==='Home') y=0; else if(e.key==='End') y=st.scrollHeight;
    else if(e.key==='ArrowDown'||e.key==='ArrowUp') y+=K[e.key]*40;
    else y+=(e.key===' '&&e.shiftKey?-1:K[e.key])*page;
    e.preventDefault(); st.scrollTo({top:y,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 97 of 104 · pvx-n370-js ━━━━━ */
try{
/* PVX-N370 - HIG Sheets and Windows (second look) */
/* 1. the critical-patient banner and sheets: while a sheet or alert is open, the banner sits behind its dimmed backdrop with the
   rest of the page. The drawer (an inspector) keeps it beside or above, as n332 set. */
(function(){
  function shown(d){ if(d.id==='drawer'||d.id==='locDrawer'||(d.closest&&d.closest('#critIsland'))) return false;
    var cs=getComputedStyle(d); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.05) return false;
    var r=d.getBoundingClientRect(); return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight; }
  function check(){ var on=[].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),shown);
    if(document.body.classList.contains('pvx-ci-under')!==on) document.body.classList.toggle('pvx-ci-under',on); }
  var t=0; function soon(){ if(t) return; t=requestAnimationFrame(function(){ t=0; try{ check(); }catch(e){} }); }
  try{ pvxWatch(soon,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-modal']},document.body); }catch(e){}
  document.addEventListener('transitionend',soon,true); addEventListener('resize',soon); soon();
  window.pvxCiUnder=check;
})();

/* 2 and 3. sheets */
(function(){
  var PH=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false,addListener:function(){}};
  var RM=function(){ return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches); };
  function f(n){ return function(){ var g=window[n]; if(typeof g==='function') g(); }; }
  /* the sheets, their parts, and how they close. n211 already does Add patient, Shift setup and Hospital alert. */
  var CFG=[{m:'triEditModal',l:'#triEditCancel',r:'#triEditSave',x:'#triEditClose',close:f('closeTriageEdit'),edit:true},
           {m:'ctModal',x:'#ctClose',close:f('closeCareTeam')},
           {m:'assignModal',shell:'intake',l:'#assignCancel',x:'#assignClose',close:f('closeAssignModal')},
           {m:'usModal',shell:'us',l:'#usX',r:'#usSend',rs:'Send',close:f('closeUltrasound')}];
  /* for the intake and Ultrasound shells, borrow n211's sheet classes while on iPhone */
  var LEND={intake:[['.intake-head','addpt-head'],['.ih-title','aph-title'],['.ih-ic','aph-ic'],['.ih-t','aph-t'],['.ih-sub','aph-sub'],['.intake-foot','addpt-foot']],
            us:[['.us-head','addpt-head'],['.us-head>div:first-child','aph-title'],['.us-h-t','aph-t'],['.us-h-name','aph-sub'],['.us-h-sub','aph-sub'],['.us-foot','addpt-foot']]};
  function el(c){ return document.getElementById(c.m); }
  function q(c,sel){ var m=el(c); return m&&m.querySelector(sel); }
  function park(btn,cls,head,before){ if(!btn||btn._pvxMark) return;
    var mk=document.createComment('pvx-ps'); btn.parentNode.insertBefore(mk,btn); btn._pvxMark=mk;
    btn.classList.add('pvx-ps-btn',cls); if(before) head.insertBefore(btn,before); else head.appendChild(btn); }
  function undo(c){ var m=el(c); if(!m) return;
    [].slice.call(m.querySelectorAll('.pvx-ps-btn')).forEach(function(b){ if(b._pvxText!=null){ b.textContent=b._pvxText; b._pvxText=null; } pvxUnpark(b); });
    var x=c.x&&q(c,c.x); if(x){ if(x._pvxMark) pvxUnpark(x); if(x._pvxHid){ x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); x._pvxHid=false; } }
    [].slice.call(m.querySelectorAll('[data-pvx-lent]')).forEach(function(n){ n.getAttribute('data-pvx-lent').split(' ').forEach(function(k){ n.classList.remove(k); }); n.removeAttribute('data-pvx-lent'); });
    var ft=m.querySelector('.pvx-ps-empty'); if(ft) ft.classList.remove('pvx-ps-empty');
    m.classList.remove('pvx-ps','pvx-ps-bar'); }
  function lend(m,shell){ (LEND[shell]||[]).forEach(function(p){ [].slice.call(m.querySelectorAll(p[0])).forEach(function(n){ if(n.classList.contains(p[1])) return;
    n.classList.add(p[1]); n.setAttribute('data-pvx-lent',((n.getAttribute('data-pvx-lent')||'')+' '+p[1]).trim()); }); }); }
  function arrange(c){ var m=el(c); if(!m) return; undo(c); nox(c); if(!PH.matches) return;
    if(c.shell) lend(m,c.shell);
    var head=m.querySelector('.addpt-head'), t=m.querySelector('.aph-title'), foot=m.querySelector('.addpt-foot'); if(!head||!t) return;
    m.classList.add('pvx-ps');
    if(!m.querySelector('.pvx-grab')){ var g=document.createElement('div'); g.className='pvx-grab'; g.setAttribute('aria-hidden','true'); m.insertBefore(g,m.firstChild); }
    var L=c.l&&m.querySelector(c.l), R=c.r&&m.querySelector(c.r), X=c.x&&m.querySelector(c.x);
    if(L||R){ if(L) park(L,'pvx-ps-l',head,t); if(R){ park(R,'pvx-ps-r',head,null); if(c.rs){ R._pvxText=R.textContent; R.setAttribute('aria-label',R._pvxText); R.textContent=c.rs; } }
      m.classList.add('pvx-ps-bar');
      if(X&&X!==L){ X.setAttribute('aria-hidden','true'); X.setAttribute('tabindex','-1'); X._pvxHid=true; } }
    else if(X&&X.parentNode===head){ var mk=document.createComment('pvx-ps'); head.insertBefore(mk,X); X._pvxMark=mk; head.insertBefore(X,t); }   /* view-only: ✕ Close, leading */
    if(foot) foot.classList.toggle('pvx-ps-empty', ![].some.call(foot.children,function(k){ return getComputedStyle(k).display!=='none'&&!k.hidden; }));
  }
  /* 3. Mac and iPad: Cancel in the footer means no ✕ in the title bar */
  var NOX=[{m:'apModal',f:'.addpt-foot'},{m:'shiftModal',f:'.addpt-foot'},{m:'alertModal',f:'.addpt-foot,#alertFoot'},{m:'triEditModal',f:'.addpt-foot'},{m:'assignModal',f:'.intake-foot'}];
  function nox(c){ var n=NOX.filter(function(k){ return k.m===c.m; })[0]||c, m=el(n); if(!m||!n.f) return;
    var has=!PH.matches&&[].some.call(m.querySelectorAll(n.f+' button'),function(b){ return /^\s*Cancel\s*$/.test(b.textContent)&&getComputedStyle(b).display!=='none'&&!b.hidden; });
    m.classList.toggle('pvx-nox',has); var x=m.querySelector(':is(.addpt-head,.intake-head)>.close');
    if(x){ if(has){ x.setAttribute('aria-hidden','true'); x.setAttribute('tabindex','-1'); x._pvxNox=true; } else if(x._pvxNox){ x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); x._pvxNox=false; } } }
  function noxAll(){ NOX.forEach(nox); }
  function all(){ CFG.forEach(arrange); noxAll(); }
  window.pvxSheets370=all;
  if(PH.addEventListener) PH.addEventListener('change',all); else PH.addListener(all);
  /* the Ultrasound request is built each time it opens; the Hospital alert rebuilds its footer */
  if(typeof openUltrasoundRequest==='function'){ pvxAfter('openUltrasoundRequest',function(){ arrange(CFG[3]); },'n370'); }
  if(typeof renderAlertModal==='function'){ pvxAfter('renderAlertModal',function(){ nox(NOX[2]); },'n370'); }
  NOX.concat(CFG).forEach(function(k){ var m=el(k); if(!m||m._pvx370) return; m._pvx370=true;
    new MutationObserver(function(){ var o=m.classList.contains('open'); if(o&&!m._pvx370o){ m._pvxDirty=false; nox(k); } m._pvx370o=o; }).observe(m,{attributes:true,attributeFilter:['class']}); });
  all();
  /* Edit triage: typing or choosing since it opened */
  CFG.forEach(function(c){ var m=el(c); if(!m||!c.edit) return;
    ['input','change'].forEach(function(k){ m.addEventListener(k,function(e){ if(e.isTrusted!==false) m._pvxDirty=true; },true); }); });
  function ask(c){ showConfirm('Discard your changes?','Discard',function(){ var m=el(c); if(m) m._pvxDirty=false; c.close(); },{sub:'What you typed in this sheet will be lost.',danger:true});
    var k=document.getElementById('confirmCancel'); if(k) k.textContent='Keep editing'; }
  window.pvxSheetDirty370=function(id){ var m=document.getElementById(id); return !!(m&&m._pvxDirty); };
  /* drag the sheet down by its top to close it; a sheet with typing asks first */
  CFG.forEach(function(c){ var m=el(c); if(!m) return;
    var y0=null, dy=0, ly=0, lt=0, v=0;
    m.addEventListener('touchstart',function(e){ if(!PH.matches||!m.classList.contains('open')||!m.classList.contains('pvx-ps')||!pvxGrabZone(e)||e.touches.length>1) return;
      if(e.target.closest('button,a,input,select,textarea')) return;
      y0=ly=e.touches[0].clientY; lt=performance.now(); dy=0; v=0; m.classList.add('pvx-ps-drag'); },{passive:true});
    m.addEventListener('touchmove',function(e){ if(y0===null) return; var y=e.touches[0].clientY, t=performance.now();
      if(t>lt) v=v*.4+(y-ly)/(t-lt)*.6; ly=y; lt=t; dy=y-y0; dy=dy<0?dy/4:dy; m.style.transform='translateY('+dy+'px)'; },{passive:true});
    function end(){ if(y0===null) return; y0=null; m.classList.remove('pvx-ps-drag');
      var go=dy>90||(v>.5&&dy>24);
      if(go&&!(c.edit&&m._pvxDirty)){ if(RM()){ m.style.transform=''; c.close(); return; }
        m.style.transform='translateY('+(m.offsetHeight+24)+'px)'; setTimeout(function(){ c.close(); setTimeout(function(){ m.style.transform=''; },380); },200); return; }
      m.style.transform=''; if(go) ask(c); }
    m.addEventListener('touchend',end); m.addEventListener('touchcancel',end);
  });
})();

/* 5. Open in new window (HIG Windows: give people the option to view content in a new window) */
(function(){
  var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||'')||/Mac OS X/.test(navigator.userAgent||'');
  var SEL='#board .card[data-pid],#tableBody tr[data-pid],.r-pt[data-pid],#view-dashboard .attn-item[data-pid]';
  function staff(){ var b=document.body.classList; return !(b.contains('tv-mode')||b.contains('client-mode')); }
  function addr(pid){ return location.origin+location.pathname+'#open='+encodeURIComponent(pid); }
  window.pvxOpenInNewWindow=function(pid){ try{ return window.open(addr(pid),'_blank','noopener'); }catch(e){ return null; } };
  window.pvxNewWinItem=function(p){ if(!p||!staff()) return false; if(!(window.matchMedia&&matchMedia('(any-pointer:fine)').matches)) return false;
    return {label:'Open in new window',act:function(){ pvxOpenInNewWindow(p.id); }}; };
  function target(e){ var t=e.target, row=t&&t.closest&&t.closest(SEL); if(!row||!staff()) return null;
    var c=t.closest('button,a,input,select,textarea,label'); if(c&&c!==row&&row.contains(c)&&!c.classList.contains('pvx-open')) return null; return row; }   /* the name (the card's open button) counts */
  document.addEventListener('click',function(e){ if(e.button!==0||e.altKey||e.shiftKey) return; if(!(MAC?(e.metaKey&&!e.ctrlKey):(e.ctrlKey&&!e.metaKey))) return;
    var row=target(e); if(!row) return; e.preventDefault(); e.stopImmediatePropagation(); pvxOpenInNewWindow(row.getAttribute('data-pid')); },true);
  /* a middle click: pressed and released on the same patient (the board may redraw the card in between, so it goes by the patient) */
  var mid=null;
  document.addEventListener('mousedown',function(e){ if(e.button!==1) return; var row=target(e); mid=row?row.getAttribute('data-pid'):null; if(row) e.preventDefault(); },true);   /* no autoscroll */
  document.addEventListener('mouseup',function(e){ if(e.button!==1||!mid) return; var row=target(e), id=mid; mid=null;
    if(row&&row.getAttribute('data-pid')===id){ e.preventDefault(); e.stopImmediatePropagation(); pvxOpenInNewWindow(id); } },true);
  document.addEventListener('auxclick',function(e){ if(e.button===1&&target(e)){ e.preventDefault(); e.stopImmediatePropagation(); } },true);
  /* the new window: #open=<visit id> opens Flow on that patient once the board has them */
  function want(){ var m=/(?:^#|&)open=([^&]+)/.exec(location.hash||''); if(!m) return null; try{ return decodeURIComponent(m[1]); }catch(e){ return null; } }
  function go(){ var id=want(); if(!id) return; try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    var t0=Date.now();
    (function wait(){ var p=(typeof PATIENTS!=='undefined'?PATIENTS:[]).find(function(x){ return String(x.id)===String(id); });
      if(p){ try{ if(typeof currentApp!=='undefined'&&currentApp!=='flow'&&typeof switchApp==='function') switchApp('flow'); }catch(e){}
        setTimeout(function(){ try{ openDrawer(p.id); }catch(e){} },80); return; }
      if(Date.now()-t0>15000){ try{ toast('That patient isn’t on the board now.'); }catch(e){} return; }
      setTimeout(wait,300); })(); }
  setTimeout(go,500); addEventListener('hashchange',go);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 98 of 104 · pvx-n371-js ━━━━━ */
try{
/* PVX-N371 - HIG Combo boxes */
/* 1. hospitals this workstation picked recently, newest first (names only, kept on this computer) */
(function(){
  var K='pvx:flow:refhosp';
  function read(){ try{ var a=JSON.parse(localStorage.getItem(K)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  window.pvxRefRecent=function(){ var L=(typeof CT_VET_HOSPITALS!=='undefined'?CT_VET_HOSPITALS:[]), out=[];
    read().forEach(function(n){ var h=L.filter(function(x){ return x.name===n; })[0]; if(h&&out.indexOf(h)<0) out.push(h); }); return out.slice(0,5); };
  window.pvxRefRemember=function(name){ name=String(name||'').trim(); if(!name) return;
    var L=(typeof CT_VET_HOSPITALS!=='undefined'?CT_VET_HOSPITALS:[]); if(!L.some(function(x){ return x.name===name; })) return;   /* a typed name isn't added to the list */
    var a=read().filter(function(n){ return n!==name; }); a.unshift(name); try{ localStorage.setItem(K,JSON.stringify(a.slice(0,5))); }catch(e){} };
  if(typeof commitPatient==='function'){ pvxBefore('commitPatient',function(f){ try{ if(f&&f.referringHospital) pvxRefRemember(f.referringHospital); }catch(e){} },'n371'); }
})();
/* 3. the pull-down button of a combo box: opens and closes the list; not in the Tab order (↓ opens it from the keyboard) */
(function(){
  var SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var CFG=[{i:'apBreed',p:'apBreedPanel',label:'Show breeds',close:function(){ if(typeof breedClose==='function') breedClose(); },open:function(){ if(typeof breedRefresh==='function') breedRefresh(); }},
           {i:'apRefHosp',p:'apRefHospPanel',label:'Show hospitals',close:function(){ try{ _apRefCtrl&&_apRefCtrl.close(); }catch(e){} },
            open:function(inp){ inp.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})); }}];
  function add(c){ var inp=document.getElementById(c.i), pan=document.getElementById(c.p); if(!inp||!pan||inp.__pvxCbx) return; inp.__pvxCbx=1;
    var wrap=inp.closest('.bc-wrap')||inp.parentNode, b=document.createElement('button');
    b.type='button'; b.className='pvx-cbx'; b.tabIndex=-1; b.setAttribute('aria-label',c.label); b.setAttribute('aria-controls',c.p); b.setAttribute('aria-expanded','false'); b.innerHTML=SVG;
    inp.parentNode.insertBefore(b,inp.nextSibling); wrap.classList.add('pvx-cbx-on');
    function isOpen(){ return pan.classList.contains('open'); }
    function sync(){ b.setAttribute('aria-expanded',String(isOpen())); }
    b.addEventListener('mousedown',function(e){ e.preventDefault(); });   /* keep the cursor in the field */
    b.addEventListener('click',function(e){ e.preventDefault();
      if(isOpen()){ c.close(); sync(); return; }
      if(document.activeElement!==inp){ inp.focus(); setTimeout(function(){ if(!isOpen()) c.open(inp); sync(); },0); }
      else { c.open(inp); sync(); } });
    try{ new MutationObserver(sync).observe(pan,{attributes:true,attributeFilter:['class']}); }catch(e){} }
  function all(){ CFG.forEach(add); }
  all(); if(typeof ensureHospitalAutocompletes==='function'){ pvxAfter('ensureHospitalAutocompletes',function(){ all(); },'n371'); }
  document.addEventListener('focusin',function(e){ if(e.target&&(e.target.id==='apBreed'||e.target.id==='apRefHosp')) all(); });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 99 of 104 · pvx-n372-js ━━━━━ */
try{
(function(){
  var GROUPS='.otw-leave,.pvx-unit,.alert-types';
  function radios(g){ return [].slice.call(g.querySelectorAll(g.classList.contains('alert-types')?'.alert-type':'[role=radio]')); }
  function roving(g){ var R=radios(g); if(!R.length) return; var on=R.filter(function(r){ return r.getAttribute('aria-checked')==='true'; })[0]||R[0];
    R.forEach(function(r){ var t=r===on?0:-1; if(r.tabIndex!==t) r.tabIndex=t; }); }
  function alertTypes(){ var g=document.querySelector('#alertModal .alert-types'); if(!g) return;
    if(g.getAttribute('role')!=='radiogroup'){ g.setAttribute('role','radiogroup'); g.setAttribute('aria-label','Alert type'); }
    radios(g).forEach(function(b){ b.setAttribute('role','radio'); var on=b.classList.contains('sel'); if(b.getAttribute('aria-checked')!==String(on)) b.setAttribute('aria-checked',String(on)); }); }
  var refocus=false;
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#alertModal .alert-type')) refocus=true; },true);
  if(typeof renderAlertModal==='function'){ pvxAfter('renderAlertModal',function(){ 
    try{ alertTypes(); var g=document.querySelector('#alertModal .alert-types'); if(g) roving(g);
      if(refocus&&g){ var c=g.querySelector('[aria-checked="true"]'); if(c) c.focus({preventScroll:true}); } }catch(e){} refocus=false; past(); },'n372'); }
  document.addEventListener('keydown',function(e){ var g=e.target.closest&&e.target.closest(GROUPS); if(!g) return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].indexOf(e.key)<0||e.altKey||e.metaKey||e.ctrlKey) return;
    var R=radios(g), i=R.indexOf(e.target.closest(g.classList.contains('alert-types')?'.alert-type':'[role=radio]')); if(i<0) return;
    if(g.classList.contains('pvx-unit')) { setTimeout(function(){ roving(g); },0); return; }
    e.preventDefault(); e.stopPropagation();
    var n=R.length, j=e.key==='Home'?0:e.key==='End'?n-1:(i+((e.key==='ArrowLeft'||e.key==='ArrowUp')?-1:1)+n)%n;
    if(g.classList.contains('alert-types')) refocus=true;
    R[j].click();
    var g2=document.querySelector(g.classList.contains('alert-types')?'#alertModal .alert-types':g.classList.contains('otw-leave')?'.otw-leave':null)||g;
    roving(g2); var c=g2.querySelector('[aria-checked="true"]')||radios(g2)[j]; if(c&&document.activeElement!==c) c.focus({preventScroll:true});
  },true);
  var t=0; function sweep(){ t=0; try{ alertTypes(); [].forEach.call(document.querySelectorAll(GROUPS),roving); }catch(e){} }
  try{ pvxWatch(function(){ if(!t) t=requestAnimationFrame(sweep); },{subtree:true,childList:true,attributes:true,attributeFilter:['aria-checked','class']},document.body); }catch(e){}
  sweep();
  function past(){ var d=document.getElementById('alertReviewDay'), s=document.getElementById('alertReviewTime'); if(!d||!s) return;
    var n=new Date(), today=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'), now=n.getHours()*60+n.getMinutes(), isT=d.value===today;
    [].forEach.call(s.options,function(o){ o.disabled=isT&&(+o.value)<=now; });
    if(isT&&s.selectedOptions[0]&&s.selectedOptions[0].disabled){ var f=[].filter.call(s.options,function(o){ return !o.disabled; })[0]; if(f){ s.value=f.value; s.dispatchEvent(new Event('change',{bubbles:true})); } } }
  document.addEventListener('change',function(e){ if(e.target&&e.target.id==='alertReviewDay') setTimeout(past,0); },true);
  past();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 100 of 104 · pvx-n373-js ━━━━━ */
try{
(function(){
  function sync(i){ var v=parseInt(i.value,10), ok=v>0&&v<=240;
    if(ok){ i.setAttribute('aria-valuenow',v); i.setAttribute('aria-valuetext',v+(v===1?' minute':' minutes')); } else { i.removeAttribute('aria-valuenow'); i.removeAttribute('aria-valuetext'); } }
  document.addEventListener('keydown',function(e){ var i=e.target; if(!i||i.id!=='otwMin'||e.altKey||e.metaKey||e.ctrlKey) return;
    var k=e.key, v=parseInt(i.value,10), big=e.shiftKey?10:1, n;
    if(k==='ArrowUp') n=(v>0?v:0)+big; else if(k==='ArrowDown') n=(v>0?v:2)-big; else if(k==='PageUp') n=(v>0?v:0)+10; else if(k==='PageDown') n=(v>0?v:11)-10;
    else if(k==='Home') n=1; else if(k==='End') n=240; else return;
    e.preventDefault(); n=Math.max(1,Math.min(240,n)); if(String(n)===i.value) return; i.value=String(n); sync(i); i.dispatchEvent(new Event('input',{bubbles:true})); },true);
  document.addEventListener('input',function(e){ if(e.target&&e.target.id==='otwMin') sync(e.target); },true);
  try{ pvxWatch(function(){ var i=document.getElementById('otwMin'); if(i&&!i.__s){ i.__s=1; sync(i); } },{childList:true,subtree:true},document.body); }catch(e){}
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 101 of 104 · pvx-n374-js ━━━━━ */
try{
(function(){
  var set=function(e,k,v){ if(e.getAttribute(k)!==v) e.setAttribute(k,v); };
  var COARSE=window.matchMedia?matchMedia('(hover:none) and (pointer:coarse)'):{matches:false};
  /* 1. keyboards that fit the text */
  var CLIN='#apReason,#apTransferNotes,#triEditChief,#triEditHistory,#intakeModal input:not([type=checkbox]):not([type=radio]),#intakeModal textarea,#usCQ,#usDx,#fvOrProc,#fvOrNote,.tq-note,#apBreed,#apRefHosp,#otwFrom,#recPdvm,#triEditBy,#ctFormManual';
  var WORDS='#triEditBy,#ctFormManual,#cffOwner,#cffAddr,#cffCity,#cffPet';
  function keys(){ [].forEach.call(document.querySelectorAll(CLIN),function(i){ set(i,'autocorrect','off'); set(i,'spellcheck','false'); });
    [].forEach.call(document.querySelectorAll('input[placeholder^="List medications"]'),function(i){ set(i,'autocapitalize','off'); });
    [].forEach.call(document.querySelectorAll(WORDS),function(i){ set(i,'autocapitalize','words'); });
    var st=document.getElementById('cffState'); if(st) set(st,'autocapitalize','characters'); }
  /* 4. toggles */
  function radios(){ [].forEach.call(document.querySelectorAll('#cfFamily .cff-lang,#cfFamily .cff-ts'),function(g){ set(g,'role','radiogroup');
      var B=[].slice.call(g.querySelectorAll('button')), on=null;
      B.forEach(function(b){ var p=b.getAttribute('aria-pressed'); if(p!==null){ set(b,'aria-checked',p); b.removeAttribute('aria-pressed'); } set(b,'role','radio'); if(b.getAttribute('aria-checked')==='true') on=b; });
      B.forEach(function(b){ var t=(b===(on||B[0]))?0:-1; if(b.tabIndex!==t) b.tabIndex=t; }); });
    [].forEach.call(document.querySelectorAll('#cfFamily [data-fvd="fzoom"][aria-pressed]'),function(b){ b.removeAttribute('aria-pressed'); });
  }
  var want=null;
  document.addEventListener('keydown',function(e){ var b=e.target, g=b&&b.closest&&b.closest('#cfFamily .cff-lang,#cfFamily .cff-ts'); if(!g||e.altKey||e.metaKey||e.ctrlKey) return;
    var B=[].slice.call(g.querySelectorAll('button')), i=B.indexOf(b), n=B.length; if(i<0) return;
    var j={ArrowLeft:i-1,ArrowUp:i-1,ArrowRight:i+1,ArrowDown:i+1,Home:0,End:n-1}[e.key]; if(j===undefined) return;
    e.preventDefault(); e.stopPropagation(); j=(j+n)%n; want={cls:g.className.split(' ')[0],k:j,at:Date.now()}; B[j].click(); back(); },true);
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#cfFamily .cff-lang button,#cfFamily .cff-ts button');
    if(b&&!want){ var g=b.parentNode; want={cls:g.className.split(' ')[0],k:[].indexOf.call(g.querySelectorAll('button'),b),at:Date.now()}; } },true);
  function back(){ var w=want; if(!w) return; if(Date.now()-w.at>1200){ want=null; return; } radios();
    var g=document.querySelector('#cfFamily .'+w.cls), c=g&&(g.querySelector('[aria-checked="true"]')||g.querySelectorAll('button')[w.k]);
    if(c&&document.activeElement!==c) try{ c.focus({preventScroll:true}); }catch(x){} }
  var t=0; function sweep(){ clearTimeout(t); t=0; try{ keys(); radios(); back(); }catch(e){} }
  var go=function(){ if(!t) t=setTimeout(sweep,30); };
  document.addEventListener('focusin',function(){ try{ keys(); }catch(e){} },true);   /* before the keyboard comes up */
  try{ pvxWatch(go,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed']},document.documentElement); }catch(e){}
  sweep();
  /* 2. a Clear button in sheets on iPhone and iPad */
  var XM='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 8l8 8M16 8l-8 8"/></svg>';
  var cb=null, cur=null;
  function clearable(i){ return COARSE.matches&&i&&i.tagName==='INPUT'&&/^(text|tel|email|)$/.test(i.type||'')&&!i.readOnly&&!i.disabled&&i.getAttribute('role')!=='spinbutton'
    &&!/^Search/.test(i.getAttribute('aria-label')||'')&&!i.closest('.pvx-uwrap')&&!!i.closest('[role=dialog],[aria-modal="true"],#drawer'); }
  function place(){ var i=cur, show=!!(i&&i.isConnected&&i.value&&document.activeElement===i);
    if(!show){ if(cb) cb.hidden=true; if(i) i.classList.remove('pvx-hasclr'); return; }
    if(!cb){ cb=document.createElement('button'); cb.type='button'; cb.className='pvx-clr'; cb.tabIndex=-1; cb.title='Clear'; cb.setAttribute('aria-label','Clear'); cb.innerHTML=XM;
      var clr=function(e){ e.preventDefault(); var x=cur; if(!x||!x.value) return; x.value=''; x.dispatchEvent(new Event('input',{bubbles:true})); try{ x.focus({preventScroll:true}); }catch(y){} place(); };
      cb.addEventListener('pointerdown',clr); cb.addEventListener('mousedown',function(e){ e.preventDefault(); }); cb.addEventListener('click',clr); }   /* on touch down: focus never leaves the field */
    var host=i.closest('[role=dialog],[aria-modal="true"],#drawer')||document.body; if(cb.parentNode!==host) host.appendChild(cb);
    var r=i.getBoundingClientRect(); i.classList.add('pvx-hasclr'); cb.hidden=false;
    var w=cb.offsetWidth||28, h=cb.offsetHeight||28, L=Math.round(r.right-w-Math.max(2,(36-w)/2+4)), Y=Math.round(r.top+r.height/2-h/2);   /* 44 pt on touch */ cb.style.left=L+'px'; cb.style.top=Y+'px';
    var q=cb.getBoundingClientRect(); if(Math.abs(q.left-L)>1||Math.abs(q.top-Y)>1){ cb.style.left=(2*L-q.left)+'px'; cb.style.top=(2*Y-q.top)+'px'; } }   /* a sheet that moves (transform) holds fixed things relative to itself */
  var later=function(){ requestAnimationFrame(function(){ requestAnimationFrame(place); }); };
  document.addEventListener('focusin',function(e){ if(clearable(e.target)){ if(cur&&cur!==e.target) cur.classList.remove('pvx-hasclr'); cur=e.target; } place(); later(); });
  document.addEventListener('focusout',function(){ setTimeout(place,0); });
  document.addEventListener('input',function(e){ if(e.target===cur) place(); });
  document.addEventListener('scroll',function(){ if(cur) place(); },{capture:true,passive:true});
  window.addEventListener('resize',function(){ if(cur) place(); });
  /* 3. while the touch keyboard is up */
  var TXT='input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]),textarea,[contenteditable="true"]';
  function kb(on){ var h=document.documentElement; if(h.classList.contains('pvx-kb')!==on){ h.classList.toggle('pvx-kb',on); later(); } }
  document.addEventListener('focusin',function(e){ var x=e.target; if(COARSE.matches&&x&&x.matches&&x.matches(TXT)) kb(true); });
  document.addEventListener('focusout',function(){ setTimeout(function(){ var a=document.activeElement; if(!(a&&a.matches&&a.matches(TXT))) kb(false); },80); });
  if(window.visualViewport){ visualViewport.addEventListener('scroll',function(){ if(cur) place(); },{passive:true});
    visualViewport.addEventListener('resize',function(){ var a=document.activeElement; if(!document.documentElement.classList.contains('pvx-kb')||!a||!a.getBoundingClientRect) return;
      var r=a.getBoundingClientRect(); if(r.bottom>visualViewport.height-8||r.top<0) try{ a.scrollIntoView({block:'center'}); }catch(x){} place(); }); }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 102 of 104 · pvx-n375-js ━━━━━ */
try{
(function(){
  if(/[?&](display|tv|lobby)=?/.test(location.search)) return;   /* the lobby TV is untouched */
  var SC=[['New patient','Start intake for a new patient'],['Find a patient','Search patients, doctors and rooms'],['Patients','Everyone in the hospital, most urgent first'],['Client Display','The lobby screen for families']];
  function installed(){ if(window.__pvxDisplayMode) return window.__pvxDisplayMode!=='browser';
    try{ return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||matchMedia('(display-mode: minimal-ui)').matches; }catch(e){ return false; } }
  function where(){ var u=navigator.userAgent||'', touch=navigator.maxTouchPoints>0;
    if(/iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&touch)) return null;   /* iPhone and iPad show no web-app shortcuts */
    if(/Android/.test(u)) return {how:'Touch and hold Flow’s icon.',tip:'Touch and hold Flow’s icon for New patient'};
    if(/Macintosh|Mac OS X/.test(u)) return {how:'Right-click Flow in the Dock, or open the File menu.',tip:'Right-click Flow in the Dock for New patient'};
    if(/Windows/.test(u)) return {how:'Right-click Flow in the taskbar.',tip:'Right-click Flow in the taskbar for New patient'};
    return null; }
  function avail(){ return installed()&&where(); }
  var esc=function(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  /* 1. the Keyboard shortcuts sheet lists them */
  function add(root){ var w=avail(), b=root.querySelector('.pvx-ks-body'); if(!w||!b||b.querySelector('.pvx-ks-ic')) return;
    b.insertAdjacentHTML('beforeend','<h3 id="pvxKsIc">From Flow’s icon</h3><p class="pvx-ks-how">'+esc(w.how)+'</p><ul class="pvx-ks-ic" aria-labelledby="pvxKsIc">'
      +SC.map(function(s){ return '<li><b>'+esc(s[0])+'</b><span>'+esc(s[1])+'</span></li>'; }).join('')+'</ul>'); }
  try{ pvxWatch(function(m){ m.forEach(function(r){ [].forEach.call(r.addedNodes,function(n){ if(n.nodeType===1&&n.classList.contains('pvx-ks')) add(n); }); }); },{childList:true},document.body); }catch(e){}
  /* 2. one tip, after the third patient added from inside Flow */
  var K='pvx:flow:tip-sc', get=function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, put=function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} };
  if(typeof window.commitPatient==='function'){ 
    pvxAfter('commitPatient',function(){ 
      try{ var w=avail(); if(w&&get(K)!=='shown'){ var n=(+get(K)||0)+1; if(n>=3){ put(K,'shown'); setTimeout(function(){ if(typeof notify==='function') notify('Tip: New patient from Flow’s icon',w.tip+', Find a patient, Patients and Client Display.',{icon:'info'}); },1600); } else put(K,String(n)); } }catch(e){}
      },'n375'); }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 103 of 104 · pvx-n376-js ━━━━━ */
try{
(function(){
  /* a family message's note opens that patient's conversation */
  window.pvxOpenThread=function(pid){ try{ (window.openDrawer||openDrawer)(pid);
      var h=document.getElementById('commHead'); if(h&&h.getAttribute('aria-expanded')!=='true') h.click();
      setTimeout(function(){ var b=document.getElementById('commBody'), m=document.getElementById('msgBox'); if(b&&b.scrollIntoView) b.scrollIntoView({block:'nearest'});
        var fine=!window.matchMedia||!matchMedia('(hover:none) and (pointer:coarse)').matches; if(m&&fine) try{ m.focus(); }catch(e){} },150); }catch(e){ console.warn('[thread]',e); } };
  /* how long ago a message came */
  function ago(at){ var m=Math.floor((Date.now()-at)/60000); if(m<1) return 'now'; if(m<60) return m+' min ago';
    try{ return new Date(at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return m+' min ago'; } }
  function tick(){ [].forEach.call(document.querySelectorAll('#notes .n-time[data-at]'),function(t){ var v=ago(+t.getAttribute('data-at')); if(t.textContent!==v) t.textContent=v; }); }
  window.pvxNoteTick=tick; setInterval(tick,20000);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 104 of 104 · pvx-n380-js ━━━━━ */
try{
/* PVX-N380 - Flow's own inline handlers, as listeners (the page's policy runs no inline handler) */
(function(){
  function on(id,ev,fn){ var el=typeof id==='string'?document.getElementById(id):id; if(el) el.addEventListener(ev,fn); }
  on('logoutBtn','click',function(){ logout(); });
  on(document.querySelector('.theme-toggle'),'click',function(){ toggleDark(); });
  on('ctScrim','click',function(){ closeCareTeam(); });
  on('ctClose','click',function(){ closeCareTeam(); });
  on('ctModal','keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); closeCareTeam(); } });
  /* the care team's buttons are drawn again and again: the first listener to hear a click arms the button itself for it,
     so the action runs on the button, in its turn, exactly as its onclick did (and can stop the click there) */
  function act(b,e){
    if(b.hasAttribute('data-ct-open')){ e.stopPropagation(); openCareTeam(b.getAttribute('data-ct-open')); return; }
    if(b.hasAttribute('data-ct-form')){ ctShowForm(b.getAttribute('data-ct-form')); return; }
    var d=b.getAttribute('data-ct-do'), id=b.getAttribute('data-ct-id');
    if(d==='confirm'){ ctConfirm(ctPatient(),id); renderCareTeam(); }
    else if(d==='decline'){ ctDecline(ctPatient(),id); renderCareTeam(); }
    else if(d==='end'){ ctEnd(ctPatient(),id); renderCareTeam(); }
    else if(d==='cancel'){ ctFormRole=null; renderCareTeam(); }
    else if(d==='submit'){ ctFormSubmit(); }
  }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-ct-open],[data-ct-form],[data-ct-do]'); if(!b||b.__pvxEv===e) return;
    b.__pvxEv=e; b.addEventListener('click',function(ev){ if(ev===e) act(b,ev); },{once:true}); },true);
  document.addEventListener('change',function(e){ var t=e.target; if(!t||!t.id) return;
    if(t.id==='ctFormRoleSel') ctShowForm(t.value);
    else if(t.id==='ctFormWho'){ var w=document.getElementById('ctFormManualWrap'); if(w) w.hidden=t.value!=='__manual'; } });
})();
}catch(e){setTimeout(function(){throw e})}
