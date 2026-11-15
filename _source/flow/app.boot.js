

 









 
try{ rdWireOnce(); }catch(e){}

loadState();
wireCompleteZones();
renderAll();
switchView('dashboard');



(function(){
return; 
const ROUTE_VIEW={'/':'dashboard','/command':'dashboard','/patients':'list','/flow':'flow','/rooms':'rooms','/client-display':'client'};
const VIEW_ROUTE={dashboard:'/command',list:'/patients',flow:'/flow',rooms:'/rooms',client:'/client-display'};
const US_ROUTES={today:'/ultrasound',queue:'/ultrasound/queue',completed:'/ultrasound/completed'};
const RD_ROUTES={census:'/rounds',archive:'/rounds/archive'};
const rdSubR=p=>{ const s=(p.split('/')[2]||'census'); return RD_ROUTES[s]?s:'census'; };
const curPath=()=>(location.pathname||'/').replace(/index\.html$/,'').replace(/\/+$/,'')||'/';
const usSub=p=>{ const s=(p.split('/')[2]||'today'); return US_ROUTES[s]?s:'today'; };
if(curPath().indexOf('/ultrasound')===0){ const s=usSub(curPath()); currentUsView=s; switchApp('ultrasound'); }
else if(curPath().indexOf('/rounds')===0){ const s=rdSubR(curPath()); currentRdView=s; switchApp('rounds'); }
else { const v=ROUTE_VIEW[curPath()]; if(v && v!=='dashboard') switchView(v); }
const _sv=switchView, _su=switchUsView;
switchView=function(view){ _sv(view); try{ if(currentApp==='flow'){ const r=VIEW_ROUTE[view]; if(r) history.replaceState(null,'',r); } }catch(e){} };
switchUsView=function(view){ _su(view); try{ const r=US_ROUTES[currentUsView]; if(r) history.replaceState(null,'',r); }catch(e){} };
const _sr=switchRdView;
switchRdView=function(view){ _sr(view); try{ const r=RD_ROUTES[currentRdView]; if(r) history.replaceState(null,'',r); }catch(e){} };
window.addEventListener('popstate',()=>{
const p=curPath();
if(p.indexOf('/ultrasound')===0){ const s=usSub(p); if(currentApp!=='ultrasound'){ currentUsView=s; switchApp('ultrasound'); } else _su(s); }
else if(p.indexOf('/rounds')===0){ const s=rdSubR(p); if(currentApp!=='rounds'){ currentRdView=s; switchApp('rounds'); } else _sr(s); }
else { const vv=ROUTE_VIEW[p]; if(vv) _sv(vv); }
});
})();
