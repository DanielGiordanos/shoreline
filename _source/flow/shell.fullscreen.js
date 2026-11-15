


function enterFullscreen(){
const el=document.documentElement;
const req=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;
if(req){ try{ const p=req.call(el); if(p&&p.catch) p.catch(function(){}); }catch(e){} }
else { document.body.classList.add('fs-mode'); ensureFsExit(); fsPokeExit(); }
}
function exitFullscreen(){
try{ if(document.exitFullscreen) document.exitFullscreen(); else if(document.webkitExitFullscreen) document.webkitExitFullscreen(); }catch(e){}
document.body.classList.remove('fs-mode');
}
function ensureFsExit(){
if(document.getElementById('fsExit')) return;
const b=document.createElement('button'); b.id='fsExit'; b.type='button';
b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/></svg>Exit Full screen';
b.onclick=exitFullscreen; document.body.appendChild(b);
}
let _fsHideTimer=null;
function fsPokeExit(){
if(!document.body.classList.contains('fs-mode')) return;
const b=document.getElementById('fsExit'); if(!b) return;
b.classList.add('show'); clearTimeout(_fsHideTimer);
_fsHideTimer=setTimeout(function(){ b.classList.remove('show'); }, 3000);
}
function _fsActive(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
function showFsHint(){ if(document.getElementById('fsHint')||_fsActive()) return; const h=document.createElement('div'); h.id='fsHint'; h.textContent='Tap anywhere to enter full screen'; document.body.appendChild(h); }
function removeFsHint(){ const h=document.getElementById('fsHint'); if(h) h.remove(); }


function lobbyArmFullscreen(){
if(!document.body.classList.contains('tv-mode')) return;
try{ enterFullscreen(); }catch(e){}
setTimeout(function(){ if(!_fsActive()) showFsHint(); }, 700);
const go=function(){ enterFullscreen(); removeFsHint(); teardown(); };
const teardown=function(){ ['click','keydown','touchstart'].forEach(function(ev){ document.removeEventListener(ev, go, true); }); };
['click','keydown','touchstart'].forEach(function(ev){ document.addEventListener(ev, go, true); });
}
function _onFsChange(){
const fs=!!(document.fullscreenElement||document.webkitFullscreenElement);
document.body.classList.toggle('fs-mode', fs&&(document.body.classList.contains('tv-mode')||document.body.classList.contains('client-mode')));   /* PVX-N194 */
if(fs){ ensureFsExit(); fsPokeExit(); removeFsHint(); }
else { const b=document.getElementById('fsExit'); if(b) b.classList.remove('show'); }
}
if(typeof document!=='undefined'&& document.addEventListener){
['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,_onFsChange); });
document.addEventListener('mousemove', function(){ if(document.body.classList.contains('fs-mode')) fsPokeExit(); });
document.addEventListener('keydown', function(e){ if(e.key==='f'&& document.body.classList.contains('client-mode') && !/input|textarea/i.test((e.target&&e.target.tagName)||'')){ } });
}
