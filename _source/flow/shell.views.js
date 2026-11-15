
/* switchView · its layers, innermost first: 1 #18 after · 2 n363 wrap   (PVX-N387; kept true by flow_t387) */
function switchView(v){ return pvxRun('switchView',switchView$base,this,arguments); }
function switchView$base(v){


if(typeof currentApp!=='undefined'&& currentApp!=='flow'){ switchAppShell('flow'); usxHideAllViews(); try{ rdHideAllViews(); }catch(e){} }
currentView=v;
document.body.classList.toggle('client-mode', v==='client');
document.body.classList.toggle('hide-fab', v==='flow'||v==='rooms');
if(v!=='client'){ stopClientRotate(); stopClientCarousel(); }
if(typeof hidePreview==='function'&& v!=='list'){ clearTimeout(pvTimer); hidePreview(); }
document.querySelectorAll('#switcher .seg').forEach(s=>s.classList.toggle('active',s.dataset.view===v));
['dashboard','list','flow','rooms','client'].forEach(x=>{
const el=document.getElementById('view-'+x);
el.classList.toggle('hidden',x!==v);
if(x===v){el.classList.remove('view');void el.offsetWidth;el.classList.add('view');}
});
renderAll();
if(v==='dashboard'){ renderKPIs(true); renderClientQueue(); renderOps(true); }
if(v==='client'){ clPage=0; clSlide=0; renderClient(true); startClientRotate(); startClientCarousel(); }
}
function scheduleRender(after){
if(typeof after==='function') _renderAfter.push(after);
if(_renderQueued) return;
_renderQueued=true;
requestAnimationFrame(_runQueuedRender);
setTimeout(_runQueuedRender,100);
}
function _runQueuedRender(){
if(!_renderQueued) return;
_renderQueued=false;
var cbs=_renderAfter; _renderAfter=[];
try{ renderAll(); }catch(e){ console.error('renderAll failed',e); }
for(var i=0;i<cbs.length;i++){ try{ cbs[i](); }catch(e){ console.error('post-render callback failed',e); } }
}
function flushRender(){ _runQueuedRender(); }
var _renderQueued=false, _renderAfter=[];
/* renderAll · its layers, innermost first: 1 n197 after   (PVX-N387; kept true by flow_t387) */
function renderAll(){ return pvxRun('renderAll',renderAll$base,this,arguments); }
function renderAll$base(){
try{ now.setTime(Date.now()); }catch(e){}
renderKPIs();renderAttention();renderClientQueue();renderOps();
renderFilterBar();renderTable();renderBoard();renderRooms();renderComplete();
if(currentView==='client') renderClient();
if(activeLoc) renderLocDrawer();
try{ renderAlert(); }catch(e){}
try{ if(typeof renderCritAlert==='function') renderCritAlert(); }catch(e){}
try{ renderUltrasound(); }catch(e){}
try{ renderRounds(); }catch(e){}
persist();
}
