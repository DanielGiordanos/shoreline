


/* ═════════ VISITS — open visits + the last 30 days, not every visit ever (Oct 2026) ═════════
   Flow listened to every visit ever recorded: fine at first, slower every month. Now three live queries, merged by visit:
     open (is_active) · in the hospital (Admitted / Hospitalized — is_active is false for those) · saved in the last 30 days (last_at).
   The last one needs a composite index (visits: tenant_id ↑ last_at ↑). Until it exists, or if any query is refused, Flow falls
   back to the full list it always used, so nothing goes missing; the console says why. Older visits are read only when needed:
   fvVisitHistory() (Rounds archive) and fvVisitsByName() (flags from a visit more than 30 days ago). */
var FV_RECENT_DAYS=30;
function fvVisitsAll(){ return DB.collection('visits').where('tenant_id','==',TENANT_ID); }
function fvVisitQueries(){ var b=fvVisitsAll(), cut=new Date(Date.now()-FV_RECENT_DAYS*864e5).toISOString();
  return [b.where('is_active','==',true), b.where('status','in',['Admitted','Hospitalized']), b.where('last_at','>=',cut)]; }
function fvMerge(lists){ var seen={}, out=[]; lists.forEach(function(L){ (L||[]).forEach(function(d){ if(!seen[d.id]){ seen[d.id]=1; out.push(d); } }); }); return out; }
function fvVisitsListen(onDocs,onErr,opts){ opts=opts||{};
  var qs=fvVisitQueries(), parts=qs.map(function(){ return null; }), cache=qs.map(function(){ return false; }), subs=[], full=null, dead=false, t=null;
  var rdc=!!window.__rdFeed; window.__rdFeed=0; try{ rdc&&window.rdLoadFeed&&rdLoadFeed(qs.length); }catch(e){}   /* n273: only Flow's own feed (Backend) counts for Rounds' loader */
  function flush(){ t=null; if(dead||full) return; Backend._visitsMode='recent'; onDocs(fvMerge(parts),{fromCache:cache.some(Boolean),real:parts.every(function(x,i){ return !cache[i]||(x&&x.length); })}); }
  function fallback(err){ if(dead||full) return; console.warn('[visits] loading the full list instead —',(err&&err.message)||err);
    subs.forEach(function(u){ try{ u(); }catch(e){} }); subs=[]; Backend._visitsMode='all'; try{ rdc&&window.rdLoadFeed&&rdLoadFeed(1); }catch(e){}
    full=fvVisitsAll().onSnapshot(opts,function(s){ try{ rdc&&window.rdLoadPart&&rdLoadPart(0,!!s.metadata.fromCache,s.docs.length); }catch(e){} onDocs(s.docs,{fromCache:!!s.metadata.fromCache}); },onErr||function(){}); }
  qs.forEach(function(q,i){ subs.push(q.onSnapshot(opts,function(s){ parts[i]=s.docs; cache[i]=!!s.metadata.fromCache; try{ rdc&&window.rdLoadPart&&rdLoadPart(i,cache[i],s.docs.length); }catch(e){}
      if(parts.every(function(x){ return x!==null; })&&!t) t=setTimeout(flush,0); },   /* one change seen by two queries (a discharge) lands as one update */
    function(err){ fallback(err); })); });
  return function(){ dead=true; if(t) clearTimeout(t); subs.forEach(function(u){ try{ u(); }catch(e){} }); if(full) try{ full(); }catch(e){} }; }
function fvVisitsGet(){ return Promise.all(fvVisitQueries().map(function(q){ return q.get(); })).then(function(S){ Backend._visitsMode='recent'; return fvMerge(S.map(function(s){ return s.docs; })); })
  .catch(function(err){ console.warn('[visits] loading the full list instead —',(err&&err.message)||err); Backend._visitsMode='all'; return fvVisitsAll().get().then(function(s){ return s.docs; }); }); }
/* n92 — live connection guard (Safari / sleeping iPads / flaky Wi-Fi).
   The board is only ever replaced by an answer from the server. Cached answers that would empty it are ignored; a feed that errors
   restarts itself (2 s, 4 s … 30 s); waking the screen or coming back online re-checks with the server; the capsule says when it is not live. */
function fvVisitsGetServer(){ var o={source:'server'};
  return Promise.all(fvVisitQueries().map(function(q){ return q.get(o); })).then(function(S){ Backend._visitsMode='recent'; return fvMerge(S.map(function(s){ return s.docs; })); })
  .catch(function(err){ if(err&&/unavailable|offline|network/i.test((err.code||'')+' '+(err.message||''))) throw err;
    return fvVisitsAll().get(o).then(function(s){ Backend._visitsMode='all'; return s.docs; }); }); }
function fvKeepBoard(docs,meta){
  try{ if(!meta||!meta.fromCache||(docs&&docs.length)) return false;
    var have=PATIENTS.some(function(p){ return p&&!p._demo; }); if(!have) return false;
    console.warn('[visits] ignored an empty cached update — keeping the board'); fvConfirmLive(); return true; }catch(e){ return false; } }
var _fvConfT=null;
function fvConfirmLive(){ if(_fvConfT) return; _fvConfT=setTimeout(function(){ _fvConfT=null;
  fvVisitsAll().limit(1).get({source:'server'}).then(function(s){ Backend._liveAt=Date.now(); Backend._retry=0; if(!Backend._gotVisits){ if(!s||!s.docs||!s.docs.length){ Backend._gotVisits=true; try{ renderRounds(true); }catch(e){} } else if(!Backend._n273fetch){ Backend._n273fetch=1; Backend.refetch(); } } if(Backend.conn!=='live') Backend.setConn('live'); })
  .catch(function(){ Backend.setConn('reconnecting'); fvResubscribeSoon(); }); },400); }
var _fvRetryT=null;
function fvResubscribeSoon(){ if(_fvRetryT) return; var n=Backend._retry=(Backend._retry||0)+1, wait=Math.min(30000,1000*Math.pow(2,n));
  _fvRetryT=setTimeout(function(){ _fvRetryT=null; if(!navigator.onLine){ fvResubscribeSoon(); return; }
    try{ if(Backend._subVisits) Backend._subVisits(); Backend.refetch(); }catch(e){} },wait); }
(function(){ var hidAt=0;
  function wake(){ try{ if(Backend.mode!=='staff'||!Backend._subVisits) return; if(!AUTH||!AUTH.currentUser) return;
    Backend._subVisits(); Backend.refetch(); }catch(e){} }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'){ hidAt=Date.now(); return; } if(hidAt&&Date.now()-hidAt>20000) wake(); hidAt=0; });
  window.addEventListener('pageshow',function(e){ if(e&&e.persisted) wake(); });   /* Safari back/forward cache */
  setInterval(function(){ try{ if(Backend.mode==='staff'&&Backend.conn!=='live'&&navigator.onLine&&Backend._subVisits&&!_fvRetryT) fvConfirmLive(); }catch(e){} },15000);   /* n92c: a cheap server check, not a full re-subscribe */
})();
var _fvHist=null;
function fvVisitHistory(){ if(_fvHist&&Date.now()-_fvHist.at<10*60000) return _fvHist.p;
  var p=fvVisitsAll().get().then(function(s){ return s.docs.map(function(d){ return mapToApp(Object.assign({id:d.id},d.data())); }); }); _fvHist={at:Date.now(),p:p}; p.catch(function(){ _fvHist=null; }); return p; }
function fvVisitsByName(full){ var n=String(full||'').trim().replace(/\s+/g,' '); if(!n) return Promise.resolve([]);
  var tc=n.toLowerCase().replace(/(^|[\s'-])(\S)/g,function(m,a,b){ return a+b.toUpperCase(); }), v=[n,tc,n.toUpperCase(),n.toLowerCase()].filter(function(x,i,A){ return A.indexOf(x)===i; });
  return fvVisitsAll().where('patient_name','in',v).get().then(function(s){ return s.docs.map(function(d){ return mapToApp(Object.assign({id:d.id},d.data())); }); }); }
