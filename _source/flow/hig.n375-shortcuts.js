(function(){
  if(/[?&](display|tv|lobby)=?/.test(location.search)) return;   /* the lobby TV is untouched */
  var SC=[['New patient','Start intake for a new patient'],['Find a patient','Search patients, doctors and rooms'],['Patients','Everyone in the hospital, most urgent first'],['Client Display','The lobby screen for families']];
  function installed(){ if(window.__pvxDisplayMode) return window.__pvxDisplayMode!=='browser';
    try{ return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||matchMedia('(display-mode: minimal-ui)').matches; }catch(e){ return false; } }
  function where(){ var u=navigator.userAgent||'', touch=navigator.maxTouchPoints>0;
    if(/iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&touch)) return null;   /* iPhone and iPad show no web-app shortcuts */
    if(/Android/.test(u)) return {how:'Touch and hold Flow’s icon.',tip:'Touch and hold Flow’s icon for New patient'};
    if(/Macintosh|Mac OS X/.test(u)) return {how:'Right-click Flow in the Dock, or open the File menu.',tip:'Right-click Flow in the Dock for New patient'};
    if(/Windows/.test(u)) return {how:'Right-click Flow in the taskbar.',tip:'Right-click Flow in the taskbar for New patient'};
    return null; }
  function avail(){ return installed()&&where(); }
  var esc=function(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  /* 1. the Keyboard shortcuts sheet lists them */
  function add(root){ var w=avail(), b=root.querySelector('.pvx-ks-body'); if(!w||!b||b.querySelector('.pvx-ks-ic')) return;
    b.insertAdjacentHTML('beforeend','<h3 id="pvxKsIc">From Flow’s icon</h3><p class="pvx-ks-how">'+esc(w.how)+'</p><ul class="pvx-ks-ic" aria-labelledby="pvxKsIc">'
      +SC.map(function(s){ return '<li><b>'+esc(s[0])+'</b><span>'+esc(s[1])+'</span></li>'; }).join('')+'</ul>'); }
  try{ pvxWatch(function(m){ m.forEach(function(r){ [].forEach.call(r.addedNodes,function(n){ if(n.nodeType===1&&n.classList.contains('pvx-ks')) add(n); }); }); },{childList:true},document.body); }catch(e){}
  /* 2. one tip, after the third patient added from inside Flow */
  var K='pvx:flow:tip-sc', get=function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, put=function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} };
  if(typeof window.commitPatient==='function'){ 
    pvxAfter('commitPatient',function(){ 
      try{ var w=avail(); if(w&&get(K)!=='shown'){ var n=(+get(K)||0)+1; if(n>=3){ put(K,'shown'); setTimeout(function(){ if(typeof notify==='function') notify('Tip: New patient from Flow’s icon',w.tip+', Find a patient, Patients and Client Display.',{icon:'info'}); },1600); } else put(K,String(n)); } }catch(e){}
      },'n375'); }
})();