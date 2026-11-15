/* PVX-N363 - HIG Tab bars: "switch between sections while preserving the current navigation state within each section".
   1. Each Flow view keeps its own scroll position: Patients scrolled to Ziggy, a look at the board, and back on Patients
      Ziggy is still in view. Before, the one scrolling area carried whatever position the last view left, so a view came
      back somewhere else. A view opened for the first time starts at its top.
   2. Choosing the view you're already on takes it back to its top (as iOS does when you tap the current tab again).
   3. The Consent forms tab says its badge in words: VoiceOver heard "Consent forms2"; now "Consent forms, 2 waiting". */
(function(){
  var POS={}, busy=false;
  function stage(){ return document.getElementById('stage'); }
  function cur(){ try{ return currentView; }catch(e){ return ''; } }
  if(typeof switchView!=='function') return;
  /* where a view was: the first patient in sight and its distance from the top (a pixel offset alone drifts when the
     critical banner's room comes and goes), with the offset as the fallback */
  function mark(v){ var st=stage(), el=document.getElementById('view-'+v); if(!st) return null; var top=st.getBoundingClientRect().top, a=null;
    if(el&&st.scrollTop>4){ var c=el.querySelectorAll('[data-pid]'); for(var k=0;k<c.length;k++){ var r=c[k].getBoundingClientRect(); if(r.height&&r.bottom>top+8){ a={pid:c[k].getAttribute('data-pid'),off:r.top-top,nth:[].filter.call(c,function(x){ return x.getAttribute('data-pid')===c[k].getAttribute('data-pid'); }).indexOf(c[k])}; break; } } }
    return {y:st.scrollTop,a:a}; }
  function jump(st,y){ var s=st.style.scrollBehavior; st.style.scrollBehavior='auto'; st.scrollTop=y; st.style.scrollBehavior=s; }   /* the stage scrolls smoothly; a return is instant */
  function back(v,m){ var st=stage(); if(!st) return; if(!m||m.y<=4){ jump(st,0); return; }
    var el=document.getElementById('view-'+v), same=m.a&&el?[].filter.call(el.querySelectorAll('[data-pid]'),function(x){ return x.getAttribute('data-pid')===m.a.pid; }):[], t=same[m.a?m.a.nth:0]||same[0];
    if(t&&!t.getBoundingClientRect().height) t=null;
    if(t){ var top=st.getBoundingClientRect().top; jump(st, st.scrollTop+(t.getBoundingClientRect().top-top)-m.a.off); } else jump(st,m.y); }
  pvxWrap('switchView',function(base){ return function(v){
    var st=stage(), from=cur();
    if(st&&from&&!busy) POS[from]=mark(from);
    var r=base.apply(this,arguments);
    if(st&&v!==from){ var m=POS[v]||null, touched=false, hit=function(){ touched=true; };
      ['wheel','touchstart','keydown','pointerdown'].forEach(function(k){ st.addEventListener(k,hit,{once:true,passive:true}); });
      /* after the view has drawn (renderAll is synchronous; late layers and the banner's room settle over a few frames) */
      back(v,m); requestAnimationFrame(function(){ if(cur()===v&&!touched) back(v,m); });
      [120,350].forEach(function(ms){ setTimeout(function(){ if(cur()===v&&!touched) back(v,m); },ms); }); }
    return r; }; },'n363');
  /* 2. the current tab again: back to the top */
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#switcher .seg[data-view]'); if(!b) return;
    var v=b.dataset.view; if(v!==cur()||v==='client') return; var st=stage(); if(!st||st.scrollTop<4) return;
    try{ st.scrollTo({top:0,behavior:pvxReduceMotion()?'auto':'smooth'}); }catch(x){ st.scrollTop=0; } POS[v]=null; },true);
  /* 3. Consent forms' badge in words */
  function syncBadge(){ var b=document.getElementById('cfBadge'), seg=b&&b.closest('.seg'); if(!seg) return;
    var n=b.hidden?0:(parseInt(b.textContent,10)||0), lab='Consent forms'+(n?', '+n+' waiting':'');
    if(seg.getAttribute('aria-label')!==lab) seg.setAttribute('aria-label',lab); if(b.getAttribute('aria-hidden')!=='true') b.setAttribute('aria-hidden','true'); }
  function watch(){ var b=document.getElementById('cfBadge'); if(!b){ setTimeout(watch,500); return; } syncBadge();
    try{ new MutationObserver(syncBadge).observe(b,{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true}); }catch(e){} }
  watch();
})();