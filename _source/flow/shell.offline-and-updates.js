/* Offline support and automatic updates.
   - Registers the service worker so Flow opens and shows the last board with no connection.
   - A small capsule appears only when something needs attention: offline, syncing, just synced,
     or an update ready. It stays hidden while everything is live.
   - New versions of Flow are detected in the background and applied when the screen is idle,
     online, and has nothing waiting to sync, so nobody loses what they are doing. */
(function(){
var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
var CHECK_EVERY=120000, IDLE_MS=45000, RELOAD_GUARD_MS=5*60000;
var state={online:navigator.onLine, fromCache:false, cacheSince:0, pending:0, offlineSince:navigator.onLine?0:Date.now(), wasOffline:!navigator.onLine, synced:0, update:false};
var lastInput=Date.now(), loadedTag=null, el=null, lastHTML='';

/* service worker */
if('serviceWorker' in navigator && location.protocol==='https:'){
  window.addEventListener('load',function(){ navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){}); });
}

/* capsule */
function capsule(){ if(!el){ el=document.createElement('div'); el.id='flowNet'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); document.body.appendChild(el); } return el; }
function clock(t){ try{ return new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }
function onTV(){ try{ return document.body.classList.contains('client-mode')||LOBBY; }catch(e){ return false; } }
var ICON={
  off:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.8"/><path d="M14.7 10.2A10 10 0 0 1 19 12.9"/><path d="M2 8.8a15 15 0 0 1 4.2-2.7"/><path d="M10.7 5A15 15 0 0 1 22 8.8"/><path d="M12 20h.01"/></svg>',
  sync:'<svg class="fn-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>'
};
function feedDown(){ try{ return typeof Backend!=='undefined'&&Backend.mode==='staff'&&(Backend.conn==='reconnecting'||Backend.conn==='error')&&Backend._connSince&&Date.now()-Backend._connSince>6000; }catch(e){ return false; } }
function offline(){ return !state.online || (state.fromCache && state.cacheSince && Date.now()-state.cacheSince>8000) || feedDown(); }
function waiting(n){ return n===1?'1 change waiting':n+' changes waiting'; }
function render(){
  var c=capsule(), off=offline(), html='', cls='';
  if(off){
    if(!state.offlineSince) state.offlineSince=Date.now();
    state.wasOffline=true;
    cls='off'; html=ICON.off+'<span><b>'+(state.online?'Reconnecting':'Offline')+'</b> since '+clock(state.offlineSince)+' · '+(state.pending?waiting(state.pending):(state.online?'showing the last saved board':'Flow keeps working'))+'</span>';
  } else if(state.pending>0 && state.pendingSince && Date.now()-state.pendingSince>15000){
    cls='sync'; html=ICON.sync+'<span><b>Not saved yet</b> · '+(state.pending===1?'1 change':state.pending+' changes')+' still saving — keep this screen open</span>';
  } else if(state.pending>0 && state.wasOffline){
    cls='sync'; html=ICON.sync+'<span>Syncing '+(state.pending===1?'1 change':state.pending+' changes')+'</span>';
  } else if(state.wasOffline){
    state.wasOffline=false; state.offlineSince=0; state.synced=Date.now();
    cls='ok'; html=ICON.ok+'<span>Back online · all changes saved</span>';
  } else if(state.synced && Date.now()-state.synced<2600){
    cls='ok'; html=ICON.ok+'<span>Back online · all changes saved</span>';
  } else if(state.update){
    cls='up'; html=ICON.up+'<span>Update ready</span><button type="button" data-fn-refresh>Refresh</button>';
  }
  if(onTV()) { cls=''; html=''; }
  var key=cls+'|'+html;
  if(key===lastHTML) return;
  lastHTML=key;
  if(!cls){ c.className=''; return; }
  c.innerHTML=html; c.className='show '+cls;
  var b=c.querySelector('[data-fn-refresh]'); if(b) b.onclick=function(){ applyUpdate(true); };
}
setInterval(render,1000);
window.addEventListener('online',function(){ state.online=true; render(); checkUpdate(); });
window.addEventListener('offline',function(){ state.online=false; state.offlineSince=Date.now(); render(); });

/* pending writes and cache state, from Firestore itself */
function watch(){
  try{
    if(LOBBY||typeof DB==='undefined'||!DB||typeof TENANT_ID==='undefined') return;
    fvVisitsListen(function(docs,meta){   /* the same queries as the main list: Firestore shares them, nothing is read twice */
      state.pending=docs.filter(function(d){ return d.metadata.hasPendingWrites; }).length; if(state.pending&&!state.pendingSince) state.pendingSince=Date.now(); if(!state.pending) state.pendingSince=0;
      var fc=!!(meta&&meta.fromCache);
      if(fc&&!state.fromCache) state.cacheSince=Date.now();
      state.fromCache=fc; if(!fc) state.cacheSince=0;
      render();
    },function(){ setTimeout(watch,5000); },{includeMetadataChanges:true});   /* n92: restart after an error */
  }catch(e){}
}
try{ if(typeof AUTH!=='undefined'&&AUTH&&AUTH.onAuthStateChanged){ var started=false; AUTH.onAuthStateChanged(function(u){ if(u&&!started){ started=true; watch(); } }); } }catch(e){}

/* updates */
['pointerdown','keydown','wheel','touchstart'].forEach(function(t){ document.addEventListener(t,function(){ lastInput=Date.now(); },{capture:true,passive:true}); });
function myBuild(){ var m=document.querySelector('meta[name="flow-build"]'); return m?m.getAttribute('content'):null; }
async function liveBuild(){
  /* Reads only the first 2 KB of the live page, where the build stamp sits. */
  try{ var r=await fetch('/',{headers:{Range:'bytes=0-2047'},cache:'no-store'}); if(!(r.status===206||r.ok)) return null;
    var t=await r.text(); var m=t.match(/<meta name="flow-build" content="([^"]+)"/); return m?m[1]:null; }catch(e){ return null; }
}
function busy(){
  var a=document.activeElement, tag=a&&a.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(a&&a.isContentEditable)) return true;
  if(document.querySelector('#critIsland .ci-pick, #critIsland.taken')) return true;
  var open=document.querySelectorAll('.open');
  for(var i=0;i<open.length;i++){ var cn=(typeof open[i].className==='string')?open[i].className:''; var s=(open[i].id||'')+' '+cn; if(/modal|drawer|scrim|sheet|menu|popover|panel/i.test(s)) return true; }
  return false;
}
function canReload(){
  if(offline()||state.pending>0) return false;
  if(!onTV()&&(Date.now()-lastInput<IDLE_MS||busy())) return false;
  var last=0; try{ last=Number(sessionStorage.getItem('flowUpdateAt')||0); }catch(e){}
  return Date.now()-last>RELOAD_GUARD_MS;
}
function applyUpdate(now){
  if(!now&&!canReload()) return;
  if(offline()) return;
  try{ sessionStorage.setItem('flowUpdateAt',String(Date.now())); }catch(e){}
  location.reload();
}
async function checkUpdate(){
  if(!loadedTag||offline()) return;
  var cur=await liveBuild();
  if(cur&&cur!==loadedTag){ state.update=true; render(); applyUpdate(false); }
}
loadedTag=myBuild();
setInterval(checkUpdate,CHECK_EVERY);
setInterval(function(){ if(state.update) applyUpdate(false); },15000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') checkUpdate(); });
window.__flowNet={state:state, checkUpdate:checkUpdate, loadedTag:function(){ return loadedTag; }};
})();