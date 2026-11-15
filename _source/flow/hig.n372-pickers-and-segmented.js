(function(){
  var GROUPS='.otw-leave,.pvx-unit,.alert-types';
  function radios(g){ return [].slice.call(g.querySelectorAll(g.classList.contains('alert-types')?'.alert-type':'[role=radio]')); }
  function roving(g){ var R=radios(g); if(!R.length) return; var on=R.filter(function(r){ return r.getAttribute('aria-checked')==='true'; })[0]||R[0];
    R.forEach(function(r){ var t=r===on?0:-1; if(r.tabIndex!==t) r.tabIndex=t; }); }
  function alertTypes(){ var g=document.querySelector('#alertModal .alert-types'); if(!g) return;
    if(g.getAttribute('role')!=='radiogroup'){ g.setAttribute('role','radiogroup'); g.setAttribute('aria-label','Alert type'); }
    radios(g).forEach(function(b){ b.setAttribute('role','radio'); var on=b.classList.contains('sel'); if(b.getAttribute('aria-checked')!==String(on)) b.setAttribute('aria-checked',String(on)); }); }
  var refocus=false;
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#alertModal .alert-type')) refocus=true; },true);
  if(typeof renderAlertModal==='function'){ pvxAfter('renderAlertModal',function(){ 
    try{ alertTypes(); var g=document.querySelector('#alertModal .alert-types'); if(g) roving(g);
      if(refocus&&g){ var c=g.querySelector('[aria-checked="true"]'); if(c) c.focus({preventScroll:true}); } }catch(e){} refocus=false; past(); },'n372'); }
  document.addEventListener('keydown',function(e){ var g=e.target.closest&&e.target.closest(GROUPS); if(!g) return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].indexOf(e.key)<0||e.altKey||e.metaKey||e.ctrlKey) return;
    var R=radios(g), i=R.indexOf(e.target.closest(g.classList.contains('alert-types')?'.alert-type':'[role=radio]')); if(i<0) return;
    if(g.classList.contains('pvx-unit')) { setTimeout(function(){ roving(g); },0); return; }
    e.preventDefault(); e.stopPropagation();
    var n=R.length, j=e.key==='Home'?0:e.key==='End'?n-1:(i+((e.key==='ArrowLeft'||e.key==='ArrowUp')?-1:1)+n)%n;
    if(g.classList.contains('alert-types')) refocus=true;
    R[j].click();
    var g2=document.querySelector(g.classList.contains('alert-types')?'#alertModal .alert-types':g.classList.contains('otw-leave')?'.otw-leave':null)||g;
    roving(g2); var c=g2.querySelector('[aria-checked="true"]')||radios(g2)[j]; if(c&&document.activeElement!==c) c.focus({preventScroll:true});
  },true);
  var t=0; function sweep(){ t=0; try{ alertTypes(); [].forEach.call(document.querySelectorAll(GROUPS),roving); }catch(e){} }
  try{ pvxWatch(function(){ if(!t) t=requestAnimationFrame(sweep); },{subtree:true,childList:true,attributes:true,attributeFilter:['aria-checked','class']},document.body); }catch(e){}
  sweep();
  function past(){ var d=document.getElementById('alertReviewDay'), s=document.getElementById('alertReviewTime'); if(!d||!s) return;
    var n=new Date(), today=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'), now=n.getHours()*60+n.getMinutes(), isT=d.value===today;
    [].forEach.call(s.options,function(o){ o.disabled=isT&&(+o.value)<=now; });
    if(isT&&s.selectedOptions[0]&&s.selectedOptions[0].disabled){ var f=[].filter.call(s.options,function(o){ return !o.disabled; })[0]; if(f){ s.value=f.value; s.dispatchEvent(new Event('change',{bubbles:true})); } } }
  document.addEventListener('change',function(e){ if(e.target&&e.target.id==='alertReviewDay') setTimeout(past,0); },true);
  past();
})();