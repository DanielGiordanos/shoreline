(function(){
  /* a family message's note opens that patient's conversation */
  window.pvxOpenThread=function(pid){ try{ (window.openDrawer||openDrawer)(pid);
      var h=document.getElementById('commHead'); if(h&&h.getAttribute('aria-expanded')!=='true') h.click();
      setTimeout(function(){ var b=document.getElementById('commBody'), m=document.getElementById('msgBox'); if(b&&b.scrollIntoView) b.scrollIntoView({block:'nearest'});
        var fine=!window.matchMedia||!matchMedia('(hover:none) and (pointer:coarse)').matches; if(m&&fine) try{ m.focus(); }catch(e){} },150); }catch(e){ console.warn('[thread]',e); } };
  /* how long ago a message came */
  function ago(at){ var m=Math.floor((Date.now()-at)/60000); if(m<1) return 'now'; if(m<60) return m+' min ago';
    try{ return new Date(at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return m+' min ago'; } }
  function tick(){ [].forEach.call(document.querySelectorAll('#notes .n-time[data-at]'),function(t){ var v=ago(+t.getAttribute('data-at')); if(t.textContent!==v) t.textContent=v; }); }
  window.pvxNoteTick=tick; setInterval(tick,20000);
})();