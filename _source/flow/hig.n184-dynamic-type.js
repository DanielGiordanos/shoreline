/* PVX-N184 - 1. Dynamic Type on iPhone and iPad: -apple-system-body is 17 pt at the default size; the root follows it. */
(function(){
  var de=document.documentElement;
  function ios(){ return /iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1); }
  function probe(){
    try{
      if(!ios()||!(window.CSS&&CSS.supports&&CSS.supports('font','-apple-system-body'))) return;
      var d=document.createElement('div'); d.setAttribute('data-pvx-probe','text'); d.style.cssText='position:absolute;visibility:hidden;pointer-events:none;font:-apple-system-body';
      de.appendChild(d); var f=parseFloat(getComputedStyle(d).fontSize); d.remove();
      if(!f) return; var pct=Math.max(82,Math.min(235,f/17*100));
      de.style.fontSize=Math.abs(pct-100)<1?'':pct.toFixed(1)+'%';
    }catch(e){}
  }
  function mark(){ var sc=parseFloat(getComputedStyle(de).fontSize)/16; de.classList.toggle('pvx-text-l',sc>=1.25); }
  probe(); mark();
  document.addEventListener('visibilitychange',function(){ if(!document.hidden){ probe(); mark(); } });
  window.addEventListener('resize',mark);
  try{ new MutationObserver(mark).observe(de,{attributes:true,attributeFilter:['style']}); }catch(e){}
  window.pvxTextScale=function(){ return parseFloat(getComputedStyle(de).fontSize)/16; };
})();
/* PVX-N184 - 5. sub-nav strips that scroll: fade at the edge that has more, a chevron to reach it, current view in sight */
(function(){
  var CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  function wire(sw){
    if(sw.__pvx) return; sw.__pvx=1; sw.classList.add('pvx-sw');
    var more=document.createElement('button'); more.type='button'; more.className='pvx-swmore'; more.tabIndex=-1; more.setAttribute('aria-hidden','true'); more.title='More'; more.innerHTML=CHEV;
    sw.parentNode.insertBefore(more,sw.nextSibling);
    more.addEventListener('click',function(){ sw.scrollBy({left:Math.max(120,sw.clientWidth*0.7),behavior:'smooth'}); });
    function upd(){
      var max=sw.scrollWidth-sw.clientWidth, x=sw.scrollLeft, ov=max>2 && sw.clientWidth>0;
      sw.classList.toggle('ov-l',ov&&x>2); sw.classList.toggle('ov-r',ov&&x<max-2);
      var on=ov&&x<max-2; more.classList.toggle('on',on);
      if(on){ var p=sw.parentNode.getBoundingClientRect(), r=sw.getBoundingClientRect(); more.style.left=Math.round(r.right-p.left-32)+'px'; more.style.top=Math.round(r.top-p.top)+'px'; more.style.height=Math.round(r.height)+'px'; }
    }
    var seated=null;
    function seat(){ var a=sw.querySelector('.seg.active'); if(!a||a===seated) return; if(sw.scrollWidth<=sw.clientWidth+2) return; seated=a; var l=a.offsetLeft-sw.offsetLeft, r=l+a.offsetWidth;
      if(l<sw.scrollLeft||r>sw.scrollLeft+sw.clientWidth) sw.scrollLeft=Math.max(0,l-24); }
    sw.addEventListener('scroll',upd,{passive:true}); window.addEventListener('resize',function(){ upd(); });
    try{ new ResizeObserver(upd).observe(sw); }catch(e){}
    try{ new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ if(ms[i].target!==sw){ seat(); upd(); return; } } }).observe(sw,{subtree:true,attributes:true,attributeFilter:['class'],childList:true}); }catch(e){}
    seat(); upd(); sw.__pvxUpd=upd;
  }
  function all(){ document.querySelectorAll('.subnav .switcher').forEach(wire); document.querySelectorAll('.subnav .switcher.pvx-sw').forEach(function(sw){ sw.__pvxUpd&&sw.__pvxUpd(); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  window.addEventListener('load',all);
  try{ pvxWatch(function(ms){ for(var i=0;i<ms.length;i++){ var t=ms[i].target; if(t.classList&&t.classList.contains('subnav')){ requestAnimationFrame(all); return; } } },{subtree:true,attributes:true,attributeFilter:['class']},document.body); }catch(e){}
})();