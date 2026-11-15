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
  function boot(){ fix(); pvxWatch(soon,{childList:true,subtree:true},document.body); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();