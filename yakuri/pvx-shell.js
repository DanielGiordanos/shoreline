/* n274 · the expanding app navigation in the shared top bar (assets/pvx-nav.js): loaded from here like pvx-account.js. Until it's in, the old row of apps is kept out of sight (4 s at most, then it shows as before). */
(function () { if (window.pvxNav || document.getElementById('pvx-nav-js')) return; var h = document.documentElement; if (document.querySelector && !/[?&]pvxnav=0/.test(location.search)) { h.classList.add('pvxn-wait'); var c = document.createElement('style'); c.id = 'pvx-nav-boot'; c.textContent = 'html.pvxn-wait body nav.topnav .nav-center{visibility:hidden!important;max-height:0!important;overflow:hidden!important}html.pvxn-wait body nav.topnav{margin-bottom:24px!important}'; (document.head || h).appendChild(c); setTimeout(function () { if (!(window.pvxNav && window.pvxNav.ready)) h.classList.remove('pvxn-wait'); }, 4000); var s = document.createElement('script'); s.id = 'pvx-nav-js'; s.src = '/assets/pvx-nav.js?v=456fe1a7b7'; s.async = true; (document.head || h).appendChild(s); } })();
/* Pravix shared top bar behaviour for Yakuri — copied byte-for-byte from the suite (anesia/index.html, live build n243).
   Yakuri serves scripts from files only (CSP script-src 'self'), so the two inline onclick handlers are attached here instead. */
function toggleDark(){ document.body.classList.toggle('dark'); }
(function(){var OK=["daniel.giordano@pravix.app"];function el(){return document.getElementById("navGrid")}
function show(e){var a=el();if(a)a.style.display=(e&&OK.indexOf(String(e).toLowerCase())>-1)?"":"none"}
function fromStore(){try{if(!window.indexedDB||!indexedDB.databases)return;indexedDB.databases().then(function(l){if(!l.some(function(d){return d.name==="firebaseLocalStorageDb"}))return;var r=indexedDB.open("firebaseLocalStorageDb");r.onsuccess=function(){var db=r.result;try{if(!db.objectStoreNames.contains("firebaseLocalStorage")){db.close();return}var q=db.transaction("firebaseLocalStorage","readonly").objectStore("firebaseLocalStorage").getAll();q.onsuccess=function(){var e="";(q.result||[]).forEach(function(x){if(x&&String(x.fbase_key||"").indexOf("firebase:authUser:")===0&&x.value&&x.value.email)e=x.value.email});show(e);db.close()};q.onerror=function(){db.close()}}catch(_){try{db.close()}catch(__){}}}}).catch(function(){})}catch(_){}}
var hooked=false;function live(){if(hooked)return;try{if(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth){hooked=true;firebase.auth().onAuthStateChanged(function(u){if(u)show(u.email);else fromStore()})}}catch(_){}}
fromStore();live();window.addEventListener("load",function(){live();setTimeout(live,1500)})})();

/* Logout — the same button in every Pravix app. A page with its own logout() keeps it; otherwise sign out of the shared account and open Flow's sign-in. */
(function(){
  window.pvxLogout=function(){ var b=document.getElementById('logoutBtn'); if(b){ b.disabled=true; b.style.opacity='.6'; }
    var go=function(){ location.replace('https://shoreline.pravix.app/#logout'); };
    try{ if(window.firebase&&firebase.apps&&firebase.apps.length&&typeof firebase.auth==='function'){ firebase.auth().signOut().catch(function(){}).then(go); return; } }catch(e){}
    go(); };
  window.pvxLogoutClick=function(){ if(typeof window.logout==='function'&&window.logout!==window.pvxLogout) return window.logout(); return window.pvxLogout(); };
  var lb=document.getElementById('logoutBtn'); if(!lb) return;
  lb.addEventListener('pointermove',function(e){ var r=lb.getBoundingClientRect(); lb.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%'); lb.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%'); });
  lb.addEventListener('pointerleave',function(){ lb.style.setProperty('--mx','50%'); lb.style.setProperty('--my','50%'); });
})();

/* n132: Grid and Forms links show only for the accounts those apps let in (keep in step with grid/index.html and forms/index.html ALLOWED) */
(function(){var OK={navGrid:["daniel.giordano@pravix.app"],navForms:["daniel.giordano@pravix.app"]};
function show(e){e=String(e||"").toLowerCase();Object.keys(OK).forEach(function(id){var a=document.getElementById(id);if(a)a.style.display=OK[id].indexOf(e)>-1?"":"none"})}
function fromStore(){try{if(!window.indexedDB||!indexedDB.databases)return;indexedDB.databases().then(function(l){if(!l.some(function(d){return d.name==="firebaseLocalStorageDb"}))return;var r=indexedDB.open("firebaseLocalStorageDb");r.onsuccess=function(){var db=r.result;try{if(!db.objectStoreNames.contains("firebaseLocalStorage")){db.close();return}var q=db.transaction("firebaseLocalStorage","readonly").objectStore("firebaseLocalStorage").getAll();q.onsuccess=function(){var e="";(q.result||[]).forEach(function(x){if(x&&String(x.fbase_key||"").indexOf("firebase:authUser:")===0&&x.value&&x.value.email)e=x.value.email});show(e);db.close()};q.onerror=function(){db.close()}}catch(_){try{db.close()}catch(__){}}}}).catch(function(){})}catch(_){}}
var hooked=false;function live(){if(hooked)return;try{if(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth){hooked=true;firebase.auth().onAuthStateChanged(function(u){if(u)show(u.email);else fromStore()})}}catch(_){}}
fromStore();live();window.addEventListener("load",function(){live();setTimeout(live,1500)})})();

/* ═══ Pravix shared top bar · n132 (audit RX-01, FL-07, DTA-S01, CL-X02, US-04) ═══
   The same nav.topnav lives in every app. This block makes it fit any width without collisions:
   · the brand and the Logout/theme group keep their real width (grid: max-content · 1fr · max-content) — nothing can slide under them;
   · the app links get the middle; the ones that do not fit move into a "More" menu (a real button with a menu of the same links),
     instead of being clipped inside a scroller with its scrollbar hidden. The active app always stays visible;
   · the More menu is keyboard-operable (Enter/Space, arrows, Escape, focus return) and closed state is display:none;
   · aria-current="page" follows the active link (apps that switch in place call pvxTopbar.setActive(id)). */
(function(){
  if(window.pvxTopbar) return;
  var nav=document.querySelector('nav.topnav'); if(!nav) return;
  var center=nav.querySelector('.nav-center'); if(!center) return;
  var more=document.createElement('div'); more.className='pvx-more'; more.hidden=true;
  more.innerHTML='<button type="button" class="nav-item pvx-more-btn" aria-haspopup="true" aria-expanded="false" aria-label="More apps" title="More apps">'
    +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>More</button>'
    +'<div class="pvx-more-menu" role="menu" aria-label="More apps" hidden></div>';
  center.appendChild(more); var btn=more.querySelector('button'), menu=more.querySelector('.pvx-more-menu');
  function items(){ return [].slice.call(center.querySelectorAll('.nav-item')).filter(function(a){ return a!==btn&&!a.classList.contains('pvx-more-btn'); }); }
  function shown(a){ return a.style.display!=='none'&&!a.hidden; }   /* account-gated links (Grid, Forms) are display:none until allowed */
  var gap=0, busy=false;
  function layout(){ if(busy) return; busy=true;
    try{ var all=items(); all.forEach(function(a){ center.insertBefore(a,more); a.removeAttribute('role'); });
      var vis=all.filter(shown); var PIN=['navGrid'];   /* PVX-N150: Grid always in More (unless it is the current app) */
      var pin=vis.filter(function(a){ return PIN.indexOf(a.id)>-1&&!(a.classList.contains('active')||a.getAttribute('aria-current')); }); vis=vis.filter(function(a){ return pin.indexOf(a)<0; });
      if(!vis.length&&!pin.length){ more.hidden=true; return; }
      gap=parseFloat(getComputedStyle(center).columnGap||getComputedStyle(center).gap)||0;
      more.hidden=true; var avail=center.clientWidth, w=vis.map(function(a){ return a.getBoundingClientRect().width; }), total=w.reduce(function(s,x){ return s+x; },0)+gap*(vis.length-1);
      if(!pin.length&&total<=avail+0.5){ menu.innerHTML=''; return; }
      more.hidden=false; var mw=more.getBoundingClientRect().width+gap, keep=0, used=0;
      for(var i=0;i<vis.length;i++){ if(used+w[i]+(i?gap:0)+mw<=avail){ used+=w[i]+(i?gap:0); keep++; } else break; }
      var active=vis.findIndex(function(a){ return a.classList.contains('active')||a.getAttribute('aria-current'); });
      if(active>=keep&&keep>0){ var a=vis.splice(active,1)[0]; vis.splice(keep-1,0,a); center.insertBefore(a,vis[keep]||more); }
      var hidden=vis.slice(keep).concat(pin); hidden.sort(function(x,y){ return all.indexOf(x)-all.indexOf(y); }); hidden.forEach(function(a){ menu.appendChild(a); a.setAttribute('role','menuitem'); });
      if(!hidden.length) more.hidden=true; }
    finally{ busy=false; } }
  function open(o){ var isOpen=!menu.hidden; if(o===undefined) o=!isOpen; if(o===isOpen) return; menu.hidden=!o; btn.setAttribute('aria-expanded',o?'true':'false');
    if(o){ var f=menu.querySelector('.nav-item'); if(f) f.focus(); } }
  btn.addEventListener('click',function(){ open(); });
  menu.addEventListener('keydown',function(e){ var f=[].slice.call(menu.querySelectorAll('.nav-item')), i=f.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){ e.preventDefault(); (f[i+1]||f[0]).focus(); } else if(e.key==='ArrowUp'){ e.preventDefault(); (f[i-1]||f[f.length-1]).focus(); }
    else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); open(false); btn.focus(); } else if(e.key==='Tab'){ open(false); } });
  btn.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ e.preventDefault(); open(true); } else if(e.key==='Escape'&&!menu.hidden){ e.preventDefault(); open(false); } });
  document.addEventListener('click',function(e){ if(!menu.hidden&&!more.contains(e.target)) open(false); },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!menu.hidden&&!more.contains(document.activeElement)) open(false); });
  function setActive(id){ items().forEach(function(a){ var on=a.id===id; a.classList.toggle('active',on); if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); }); layout(); }
  /* keep aria-current in step with the visual active class, for apps that switch in place */
  items().forEach(function(a){ if(a.classList.contains('active')) a.setAttribute('aria-current','page'); else if(a.getAttribute('aria-current')==='page'&&!a.classList.contains('active')) a.removeAttribute('aria-current'); });
  var t; function soon(){ clearTimeout(t); t=setTimeout(layout,60); }
  if(window.ResizeObserver){ new ResizeObserver(soon).observe(nav); } window.addEventListener('resize',soon);
  new MutationObserver(function(ms){ if(ms.some(function(m){ return !more.contains(m.target); })) soon(); }).observe(center,{attributes:true,subtree:true,attributeFilter:['style','class','hidden']});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(soon); window.addEventListener('load',soon); layout();
  window.pvxTopbar={layout:layout,setActive:setActive,version:'n132'};
})();


/* PVX-N192 - a file or link dropped where nothing takes it does nothing (the page stays); text fields still take text */
(function(){
  function editable(t){ return t&&t.closest&&t.closest('input,textarea,[contenteditable]:not([contenteditable=false])'); }
  document.addEventListener('dragover',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='none'; });
  document.addEventListener('drop',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); });
})();


/* PVX-N227 - an icon beside its label is decorative: VoiceOver reads the label, not "image". Icons that stand alone keep
   whatever name they have (their button's name). Runs on icons drawn later too. The shared top bar is left as it is. */
(function(){
  function fix(){
    var top=document.getElementById('pvxTopnav')||document.querySelector('nav.topnav');
    var l=document.querySelectorAll('svg:not([aria-hidden]):not([role]):not([aria-label]):not([aria-labelledby])');
    for(var i=0;i<l.length;i++){
      var s=l[i]; if(top&&top.contains(s)) continue; if(s.querySelector('title')) continue;
      var host=s.closest('button,a,[role=button],[role=tab],[role=menuitem],[role=option],label,li,td,th,summary,.chip,.seg')||s.parentElement;
      if(!host) continue;
      var name=(host.getAttribute('aria-label')||host.getAttribute('title')||host.textContent||'').trim();
      if(name||s.getBoundingClientRect().width<=32) s.setAttribute('aria-hidden','true');
    }
  }
  var q=0; function soon(){ if(q) return; q=setTimeout(function(){ q=0; fix(); },150); }
  function boot(){ fix(); new MutationObserver(soon).observe(document.body,{childList:true,subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

/* Yakuri: the markup's onclick="pvxLogoutClick()" and onclick="toggleDark()", attached without inline script */
(function(){var l=document.getElementById('logoutBtn');if(l)l.addEventListener('click',function(){window.pvxLogoutClick();});var d=document.getElementById('darkBtn');if(d)d.addEventListener('click',function(){toggleDark();});})();
