/* ═══ Pravix shared top bar · n132 (audit RX-01, FL-07, DTA-S01, CL-X02, US-04) ═══
   The same nav.topnav lives in every app. This block makes it fit any width without collisions:
   · the brand and the Logout/theme group keep their real width (grid: max-content · 1fr · max-content) — nothing can slide under them;
   · the app links get the middle; the ones that do not fit move into a "More" menu (a real button with a menu of the same links),
     instead of being clipped inside a scroller with its scrollbar hidden. The active app always stays visible;
   · the More menu is keyboard-operable (Enter/Space, arrows, Escape, focus return) and closed state is display:none;
   · aria-current="page" follows the active link (apps that switch in place call pvxTopbar.setActive(id)). */
(function(){
  if(window.pvxTopbar) return;
  var nav=document.querySelector('nav.topnav'); if(!nav) return;
  var center=nav.querySelector('.nav-center'); if(!center) return;
  var more=document.createElement('div'); more.className='pvx-more'; more.hidden=true;
  more.innerHTML='<button type="button" class="nav-item pvx-more-btn" aria-haspopup="true" aria-expanded="false" aria-label="More apps" title="More apps">'
    +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>More</button>'
    +'<div class="pvx-more-menu" role="menu" aria-label="More apps" hidden></div>';
  center.appendChild(more); var btn=more.querySelector('button'), menu=more.querySelector('.pvx-more-menu');
  function items(){ return [].slice.call(center.querySelectorAll('.nav-item')).filter(function(a){ return a!==btn&&!a.classList.contains('pvx-more-btn'); }); }
  function shown(a){ return a.style.display!=='none'&&!a.hidden; }   /* account-gated links (Grid, Forms) are display:none until allowed */
  var gap=0, busy=false;
  function layout(){ if(busy) return; busy=true;
    try{ var ORD=['navDirectory','navAssets','navCurriculum','navSchedule','navFlow','navUltrasound','navTreatment','navRounds','navOR','navAnesia','navYakuri','navGrid','navForms'], all=items(), k=function(a){ var i=ORD.indexOf(a.id); return i<0?1000+all.indexOf(a):i; }; all=all.slice().sort(function(x,y){ return k(x)-k(y); });   /* n281: the apps keep the suite's order wherever they sit (the bar, More), whichever was current before */
      all.forEach(function(a){ center.insertBefore(a,more); a.removeAttribute('role'); });
      var vis=all.filter(shown); var PIN=['navGrid','navDirectory','navAssets','navUltrasound','navAnesia'];   /* PVX-N150: Grid always in More (unless it is the current app) · n281: Directory, Assets, Ultrasound and Anesia too (Daniel) */
      var pin=vis.filter(function(a){ return PIN.indexOf(a.id)>-1&&!(a.classList.contains('active')||a.getAttribute('aria-current')); }); vis=vis.filter(function(a){ return pin.indexOf(a)<0; });
      if(!vis.length&&!pin.length){ more.hidden=true; return; }
      gap=parseFloat(getComputedStyle(center).columnGap||getComputedStyle(center).gap)||0;
      more.hidden=true; var avail=center.clientWidth, w=vis.map(function(a){ return a.getBoundingClientRect().width; }), total=w.reduce(function(s,x){ return s+x; },0)+gap*(vis.length-1);
      if(!pin.length&&total<=avail+0.5){ menu.innerHTML=''; return; }
      more.hidden=false; var mw=more.getBoundingClientRect().width+gap, keep=0, used=0;
      for(var i=0;i<vis.length;i++){ if(used+w[i]+(i?gap:0)+mw<=avail){ used+=w[i]+(i?gap:0); keep++; } else break; }
      var active=vis.findIndex(function(a){ return a.classList.contains('active')||a.getAttribute('aria-current'); });
      if(active>=keep&&keep>0){ var a=vis.splice(active,1)[0]; vis.splice(keep-1,0,a); center.insertBefore(a,vis[keep]||more); }
      var hidden=vis.slice(keep).concat(pin); hidden.sort(function(x,y){ return all.indexOf(x)-all.indexOf(y); }); hidden.forEach(function(a){ menu.appendChild(a); a.setAttribute('role','menuitem'); });
      if(!hidden.length) more.hidden=true; }
    finally{ busy=false; } }
  function open(o){ var isOpen=!menu.hidden; if(o===undefined) o=!isOpen; if(o===isOpen) return; menu.hidden=!o; btn.setAttribute('aria-expanded',o?'true':'false');
    if(o){ var f=menu.querySelector('.nav-item'); if(f) f.focus(); } }
  btn.addEventListener('click',function(){ open(); });
  menu.addEventListener('keydown',function(e){ var f=[].slice.call(menu.querySelectorAll('.nav-item')), i=f.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){ e.preventDefault(); (f[i+1]||f[0]).focus(); } else if(e.key==='ArrowUp'){ e.preventDefault(); (f[i-1]||f[f.length-1]).focus(); }
    else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); open(false); btn.focus(); } else if(e.key==='Tab'){ open(false); } });
  btn.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ e.preventDefault(); open(true); } else if(e.key==='Escape'&&!menu.hidden){ e.preventDefault(); open(false); } });
  document.addEventListener('click',function(e){ if(!menu.hidden&&!more.contains(e.target)) open(false); },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!menu.hidden&&!more.contains(document.activeElement)) open(false); });
  function setActive(id){ items().forEach(function(a){ var on=a.id===id; a.classList.toggle('active',on); if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); }); layout(); }
  /* keep aria-current in step with the visual active class, for apps that switch in place */
  items().forEach(function(a){ if(a.classList.contains('active')) a.setAttribute('aria-current','page'); else if(a.getAttribute('aria-current')==='page'&&!a.classList.contains('active')) a.removeAttribute('aria-current'); });
  var t; function soon(){ clearTimeout(t); t=setTimeout(layout,60); }
  if(window.ResizeObserver){ new ResizeObserver(soon).observe(nav); } window.addEventListener('resize',soon);
  new MutationObserver(function(ms){ if(ms.some(function(m){ return !more.contains(m.target); })) soon(); }).observe(center,{attributes:true,subtree:true,attributeFilter:['style','class','hidden']});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(soon); window.addEventListener('load',soon); layout();
  window.pvxTopbar={layout:layout,setActive:setActive,version:'n132'};
})();