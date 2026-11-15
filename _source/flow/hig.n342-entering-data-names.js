/* PVX-N342 - HIG Entering data: every field in Triage intake and Edit triage has a name, so VoiceOver and Voice Control can reach it
   (the labels sat beside the fields without being tied to them, and three Edit triage fields had only a heading) */
(function(){
  var n=0;
  function tie(root){ if(!root) return;
    root.querySelectorAll('.ik-field, .ap-field').forEach(function(f){
      var c=f.querySelectorAll('input,select,textarea'); if(c.length!==1) return; c=c[0];
      if((c.labels&&c.labels.length)||c.getAttribute('aria-label')||c.getAttribute('aria-labelledby')) return;
      var l=f.querySelector('label');
      if(l&&!l.htmlFor){ if(!c.id) c.id='pvxik'+(++n); l.htmlFor=c.id; return; }
      var s=f.closest('.ap-sect,.ik-sect'), h=s&&s.querySelector('h4'); if(h) c.setAttribute('aria-label', h.textContent.replace(/\s+/g,' ').trim());
    }); }
  function watch(id){ var el=document.getElementById(id); if(!el) return; tie(el); try{ new MutationObserver(function(){ tie(el); }).observe(el,{childList:true,subtree:true}); }catch(e){} }
  function go(){ watch('intakeBody'); watch('triEditBody'); }
  /* Return on a field whose keyboard says Next moves to the next field of Add patient */
  document.addEventListener('keydown',function(e){ var t=e.target; if(e.key!=='Enter'||e.isComposing||!t||t.getAttribute('enterkeyhint')!=='next') return; var m=t.closest('#apModal'); if(!m) return;
    var f=[].filter.call(m.querySelectorAll('input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled])'),function(x){ return x.getClientRects().length; });
    var i=f.indexOf(t); if(i>-1&&f[i+1]){ e.preventDefault(); f[i+1].focus(); } },true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();