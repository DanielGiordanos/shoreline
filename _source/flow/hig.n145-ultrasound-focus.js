/* the case workspace / request editor re-render the queue and the board when they close, so the opening control is a new element:
   find it again by patient (the request button, the case row/card, then the patient's name) and focus it */
function pvxUsRefocus(pid,kind){ if(!pid) return; var a=document.activeElement; if(a&&a!==document.body&&a.id!=='stage'&&!(a.closest&&a.closest('.pvx-closed'))&&document.contains(a)&&a.offsetParent) return;
  var o=window.__pvxUsFrom; var c=[];
  if(o&&document.contains(o)&&o.offsetParent) c.push(o);
  if(kind==='req') c.push(document.querySelector('[data-usflag="'+pid+'"]'));
  ['[data-pid="'+pid+'"] .us-open','[data-pid="'+pid+'"][tabindex="0"]','[data-open="'+pid+'"]','tr[data-pid="'+pid+'"]','.usb-card[data-pid="'+pid+'"]','[data-pid="'+pid+'"] .pvx-open','.pvx-open[data-pid="'+pid+'"]','[data-usflag="'+pid+'"]'].forEach(function(s){ Array.prototype.forEach.call(document.querySelectorAll(s),function(e){ c.push(e); }); });
  for(var i=0;i<c.length;i++){ var e=c[i]; if(e&&e.offsetParent&&!(e.closest&&e.closest('[inert],.pvx-closed'))){ if(e.tabIndex<0&&!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) e.tabIndex=-1; try{ e.focus({preventScroll:false}); }catch(x){} if(document.activeElement===e) break; } }
 }
/* UR-05: case cards and rows without their own Open button (e.g. Completed rows) open the case with the keyboard too */
try{
(function(){ var SEL='.um-next,.um-rrow,.usb-card,#usxCompleted2 tr[data-pid],#usxCompleted tr[data-pid],.ums-detail';
  function pidOf(e){ return e.dataset.pid||e.dataset.open||((e.querySelector('[data-pid]')||{}).dataset||{}).pid; }
  function nameOf(pid){ try{ var p=PATIENTS.find(function(x){ return x.id===pid; }); return p?(p.name+' '+(p.last||'')).trim():''; }catch(e){ return ''; } }
  function wire(){ Array.prototype.forEach.call(document.querySelectorAll(SEL),function(e){ if(e.dataset.pvxCase) return; if(e.querySelector('.us-open,.pvx-open,button')) return; var pid=pidOf(e); if(!pid) return; e.dataset.pvxCase='1'; e.tabIndex=0; e.setAttribute('role','button'); var n=nameOf(pid); if(n) e.setAttribute('aria-label','Open ultrasound case: '+n); }); }
  document.addEventListener('keydown',function(ev){ var t=ev.target; if(!t||!t.matches||!t.matches(SEL)||!t.dataset.pvxCase) return; if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); window.__pvxUsFrom=t; t.click(); } });
  var raf=0; pvxWatch(function(){ if(!raf) raf=requestAnimationFrame(function(){ raf=0; wire(); }); },{childList:true,subtree:true},document.body); wire(); })();
}catch(e){setTimeout(function(){throw e})}
