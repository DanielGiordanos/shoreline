/* PVX-N185 - Anesia's glass guard, shared on this device (same key): blur stays on only while the device keeps up. */
(function(){
  var KEY='anesia:v1:blur', root=document.documentElement;
  function get(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function set(v){ try{ localStorage.setItem(KEY,v); }catch(e){} }
  if(get()==='0'){ root.classList.add('pvx-noblur'); return; }
  var busy=false, rounds=0;
  function sample(){
    if(busy||root.classList.contains('pvx-noblur')||rounds>=6) return;
    busy=true; rounds++;
    var d=[], last=0, t0=0;
    requestAnimationFrame(function f(t){
      if(!t0){ t0=last=t; return requestAnimationFrame(f); }
      d.push(t-last); last=t;
      if(t-t0<1000) return requestAnimationFrame(f);
      busy=false;
      if(d.length>10 && d.filter(function(x){ return x>25; }).length/d.length>0.1){ root.classList.add('pvx-noblur'); set('0'); window.__pvxBlurOff={frames:d.length,at:Date.now()}; }
      else if(rounds>=3) set('1');
    });
  }
  window.addEventListener('scroll',sample,{passive:true,capture:true});
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#fabAdd,#globalSearch,#fvTalk')) sample(); },true);
  window.pvxGlass={sample:sample};
})();