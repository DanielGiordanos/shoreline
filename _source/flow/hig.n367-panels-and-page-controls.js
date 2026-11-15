/* PVX-N367 - HIG Panels and Page controls (second look; n210 was the first). Source changes in n367/patch_n367.py:
   1. the patient drawer is an inspector from 1024 pt (it was 1180): another patient beside it opens in one click;
   2. on Command too: another patient's attention item switches the drawer instead of closing it;
   3. the Lobby / Treatment panel is a panel beside the Rooms grid, not a modal: it has no scrim (patients are dragged from it
      to the rooms), so keyboard and VoiceOver can now reach the rooms too (no Tab trap, aria-modal false). On iPhone, where
      it fills the screen, it stays modal. */
(function(){
  var PH=function(){ return window.innerWidth<=700; };
  if(window.pvxOverlay&&pvxOverlay.register) pvxOverlay.register([{sel:'#locDrawer', open:'open', get modal(){ return PH(); }, close:'.drawer-head .close,.close', initial:':self'}]);
  var el=document.getElementById('locDrawer'); if(!el) return;
  function sync(){ if(!el.classList.contains('open')) return; el.setAttribute('role','dialog'); el.setAttribute('aria-labelledby','locTitle'); el.setAttribute('aria-modal', PH()?'true':'false'); }
  try{ new MutationObserver(sync).observe(el,{attributes:true,attributeFilter:['class']}); }catch(e){}
  window.addEventListener('resize',sync);
})();