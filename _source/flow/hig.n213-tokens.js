/* PVX-N213 - a context menu on every token, and "Added ..." announced once */
(function(){
  if(window.PvxCtx) PvxCtx.bind('#apProblemsChips .rvp-chip', function(el){
    var i=+el.getAttribute('data-i'), pr=apProblems[i]; if(!pr) return null;
    var t=formatProblem(pr), o=String(pr.originalInput||''), flat=function(x){ return _rn(x).replace(/[^a-z0-9]+/g,''); };
    var n=apProblems.length, items=[{label:'Edit',act:function(){ rpEdit(i); }}];   /* PVX-N364 */
    if(i>0) items.push({label:'Move earlier',act:function(){ rpMove(i,-1); }});
    if(i<n-1) items.push({label:'Move later',act:function(){ rpMove(i,1); }});
    items.push({sep:1},{label:'Remove',danger:true,act:function(){ rpRemove(i); }});
    return {items:items,label:'Problem: '+t,lift:el};
  },{holdMs:500});
  if(typeof addProblem==='function'){ pvxWrap('addProblem',function(ap){ return function(){ var n=apProblems.length, r=ap.apply(this,arguments);
    if(apProblems.length>n) rpSay('Added '+apProblems.slice(n).map(formatProblem).join(', ')); return r; }; },'#55'); }
})();