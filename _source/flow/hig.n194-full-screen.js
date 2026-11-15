/* PVX-N194 - full screen: Rounds Display stays in Rounds and follows full screen; the lobby TV's controls come back with a tap */
(function(){
  /* leaving full screen that Display entered ends Display (the top bar is never hidden in a normal window) */
  document.addEventListener('fullscreenchange',function(){
    if(!document.fullscreenElement&&window.__rdFs){ window.__rdFs=false; if(typeof rdToggleDisplay==='function') rdToggleDisplay(false); } });
  /* Display belongs to Rounds: leaving Rounds puts the top bar back, coming back resumes Display */
  if(typeof window.switchApp==='function'){ var sa=window.switchApp;
    window.switchApp=function(app){ var r=sa.apply(this,arguments);
      try{ if(app!=='rounds'&&document.body.classList.contains('rd-display')) rdDisplayState(false);
        else if(app==='rounds'&&window.__rdDisplayWant&&!document.body.classList.contains('rd-display')) rdDisplayState(true); }catch(e){}
      return r; }; }
  /* lobby TV: a tap shows Exit Full screen, like moving the mouse */
  ['pointerdown','touchstart'].forEach(function(ev){ document.addEventListener(ev,function(){ if(document.body.classList.contains('fs-mode')&&typeof fsPokeExit==='function') fsPokeExit(); },{capture:true,passive:true}); });
  /* lobby TV: if full screen ends, the tap-to-enter prompt comes back (entering is still a tap) */
  var armed=false;
  function arm(){ if(armed) return; armed=true;
    var go=function(){ teardown(); try{ enterFullscreen(); }catch(e){} try{ removeFsHint(); }catch(e){} };
    var teardown=function(){ armed=false; ['click','keydown','touchend'].forEach(function(ev){ document.removeEventListener(ev,go,true); }); };
    ['click','keydown','touchend'].forEach(function(ev){ document.addEventListener(ev,go,true); }); }
  ['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,function(){
    var fs=!!(document.fullscreenElement||document.webkitFullscreenElement);
    if(!fs&&document.body.classList.contains('tv-mode')){ setTimeout(function(){ try{ showFsHint(); }catch(e){} arm(); },300); } }); });
})();