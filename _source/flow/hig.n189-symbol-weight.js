/* PVX-N189 - weight matching, Anesia's table: stroke on the 24-pt grid = W(weight) x font size x 0.05 x 24 / icon size,
   i.e. the same stroke-to-text ratio as Anesia's 1.2 em symbols */
(function(){
  var W={100:1.2,200:1.3,300:1.45,400:1.6,500:1.8,600:2,700:2.25,800:2.5,900:2.7};
  var SKIP='.fg-ck,.fg-search,.confirm-icon,.topnav,.cpr-pill,.dnr-pill,.spark,.us-spark-area,.kpi .spark,.command-kpi__spark,.fab-add,.aph-ic,.empty,.board-empty-state,.an-chart,.cl-vnode,.nextup-rail';
  function host(svg){ var h=svg.parentElement; while(h&&h!==document.body){ if(/^(BUTTON|A|LABEL|LI|H\d|P|TD|TH)$/.test(h.tagName)||h.getAttribute('role')==='button') return h; if(h.childNodes.length>1&&[].some.call(h.childNodes,function(n){return n.nodeType===3&&n.textContent.trim();})) return h; h=h.parentElement; } return svg.parentElement; }
  function label(h){ var w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT,{acceptNode:function(n){ return n.textContent.trim()&&!(n.parentElement&&n.parentElement.closest('svg'))?1:3; }}); var n=w.nextNode(); return n&&n.parentElement; }
  function one(svg){
    if(svg.classList.contains('pvx-gi')||svg.closest(SKIP)) return;
    var vb=svg.viewBox&&svg.viewBox.baseVal; if(!vb||vb.width!==24||vb.height!==24) return;
    var r=svg.getBoundingClientRect(); if(!r.width||r.width>28) return;
    var p=svg.querySelector('path,line,polyline,polygon,circle,rect'); if(!p||getComputedStyle(p).stroke==='none') return;
    var h=host(svg), lab=label(h)||h, cs=getComputedStyle(lab), fw=Math.min(900,Math.max(100,Math.round((parseInt(cs.fontWeight,10)||400)/100)*100));
    var u=(W[fw]*parseFloat(cs.fontSize)*0.05*24/r.width); u=Math.max(1.3,Math.min(3.2,u));
    var k=u.toFixed(2); if(svg.__pvxw===k) return; svg.__pvxw=k;
    svg.classList.add('pvx-sym'); svg.style.setProperty('--pvx-symw',k);
  }
  function all(){ document.querySelectorAll('svg').forEach(function(s){ try{ one(s); }catch(e){} }); }
  var t=0; function soon(){ if(t) return; t=setTimeout(function(){ t=0; requestAnimationFrame(all); },120); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  window.addEventListener('load',all); window.addEventListener('resize',function(){ document.querySelectorAll('svg.pvx-sym').forEach(function(s){ s.__pvxw=null; }); soon(); });
  try{ pvxWatch(function(ms){ for(var i=0;i<ms.length;i++){ if(ms[i].addedNodes.length){ soon(); return; } } },{childList:true,subtree:true},document.body); }catch(e){}
  try{ pvxWatch(function(){ document.querySelectorAll('svg.pvx-sym').forEach(function(s){ s.__pvxw=null; }); soon(); },{attributes:true,attributeFilter:['style','class']},document.documentElement); }catch(e){}
  document.addEventListener('click',soon,true); document.addEventListener('focusin',soon,true);
  window.pvxSymbols={sync:all};
})();