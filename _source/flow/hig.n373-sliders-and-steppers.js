(function(){
  function sync(i){ var v=parseInt(i.value,10), ok=v>0&&v<=240;
    if(ok){ i.setAttribute('aria-valuenow',v); i.setAttribute('aria-valuetext',v+(v===1?' minute':' minutes')); } else { i.removeAttribute('aria-valuenow'); i.removeAttribute('aria-valuetext'); } }
  document.addEventListener('keydown',function(e){ var i=e.target; if(!i||i.id!=='otwMin'||e.altKey||e.metaKey||e.ctrlKey) return;
    var k=e.key, v=parseInt(i.value,10), big=e.shiftKey?10:1, n;
    if(k==='ArrowUp') n=(v>0?v:0)+big; else if(k==='ArrowDown') n=(v>0?v:2)-big; else if(k==='PageUp') n=(v>0?v:0)+10; else if(k==='PageDown') n=(v>0?v:11)-10;
    else if(k==='Home') n=1; else if(k==='End') n=240; else return;
    e.preventDefault(); n=Math.max(1,Math.min(240,n)); if(String(n)===i.value) return; i.value=String(n); sync(i); i.dispatchEvent(new Event('input',{bubbles:true})); },true);
  document.addEventListener('input',function(e){ if(e.target&&e.target.id==='otwMin') sync(e.target); },true);
  try{ pvxWatch(function(){ var i=document.getElementById('otwMin'); if(i&&!i.__s){ i.__s=1; sync(i); } },{childList:true,subtree:true},document.body); }catch(e){}
})();