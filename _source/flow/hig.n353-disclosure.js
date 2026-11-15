/* PVX-N353 - HIG Disclosure controls: Triage details open and close from the keyboard and tell VoiceOver whether they're open
   (the row only answered a click; its details were read out even when closed). */
(function(){
  function wire(){ var card=document.getElementById('triCard'), head=document.getElementById('triHead'); if(!card||!head) return;
    var ch=head.querySelector('.tri-chev'), det=card.querySelector('.tri-detail'); if(!ch) return;
    if(det&&!det.id) det.id='triDetail';
    if(!ch.__pvx){ ch.__pvx=1; ch.setAttribute('role','button'); ch.setAttribute('tabindex','0'); ch.setAttribute('aria-label','Triage details'); if(det) ch.setAttribute('aria-controls',det.id);
      ch.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); head.click(); setTimeout(sync,0); } }); }
    sync();
    if(!card.__pvxMo){ card.__pvxMo=new MutationObserver(sync); card.__pvxMo.observe(card,{attributes:true,attributeFilter:['class']}); } }
  function sync(){ var card=document.getElementById('triCard'), ch=card&&card.querySelector('.tri-chev'); if(!ch) return; var open=card.classList.contains('open');
    if(ch.getAttribute('aria-expanded')!==String(open)) ch.setAttribute('aria-expanded',String(open));
    var det=card.querySelector('.tri-detail'); if(det){ if(open) det.removeAttribute('aria-hidden'); else { if(det.contains(document.activeElement)) ch.focus(); det.setAttribute('aria-hidden','true'); } } }
  var m=document.getElementById('triageMount'); if(m) new MutationObserver(wire).observe(m,{childList:true,subtree:false});
  wire();
})();