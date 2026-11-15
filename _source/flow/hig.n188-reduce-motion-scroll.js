/* PVX-N188 - with Reduce Motion, scripted smooth scrolling jumps instead */
(function(){
  var q; try{ q=matchMedia('(prefers-reduced-motion: reduce)'); }catch(e){ return; }
  function fix(a){ if(q.matches&&a&&typeof a==='object'&&a.behavior==='smooth'){ a=Object.assign({},a,{behavior:'auto'}); } return a; }
  ['scrollTo','scrollBy'].forEach(function(n){ [window,Element.prototype].forEach(function(o){ var f=o[n]; if(!f) return;
    o[n]=function(a){ return arguments.length===1?f.call(this,fix(a)):f.apply(this,arguments); }; }); });
  var si=Element.prototype.scrollIntoView; Element.prototype.scrollIntoView=function(a){ return si.call(this,fix(a)); };
  window.pvxReducedMotion=function(){ return q.matches; };
})();