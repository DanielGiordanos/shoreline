/* PVX-N368 - HIG Scroll views. Flow's views scroll in #stage, not the page, so with nothing focused (after opening Flow,
   switching views from the keyboard, or closing a sheet) Page Up / Page Down, Space, the arrows, Home and End did nothing.
   They now scroll the view, a page at a time with a line of overlap. Talk to Flow keeps Space where it's switched on. */
(function(){
  var K={PageDown:1,PageUp:-1,' ':1,ArrowDown:1,ArrowUp:-1,Home:0,End:0};
  window.addEventListener('keydown',function(e){
    if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey||!(e.key in K)) return;
    var t=e.target; if(t!==document.body&&t!==document.documentElement) return;
    try{ if(window.pvxOverlay&&pvxOverlay.top()) return; }catch(x){}
    var st=document.getElementById('stage'); if(!st||st.scrollHeight<=st.clientHeight+2) return;
    var page=Math.max(80,st.clientHeight-48), y=st.scrollTop;
    if(e.key==='Home') y=0; else if(e.key==='End') y=st.scrollHeight;
    else if(e.key==='ArrowDown'||e.key==='ArrowUp') y+=K[e.key]*40;
    else y+=(e.key===' '&&e.shiftKey?-1:K[e.key])*page;
    e.preventDefault(); st.scrollTo({top:y,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
})();