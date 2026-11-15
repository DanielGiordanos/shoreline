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