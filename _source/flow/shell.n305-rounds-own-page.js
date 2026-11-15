/* n305: anything in Flow that still asks for Rounds opens Rounds' own page */
(function(){ var sa=window.switchApp; if(typeof sa!=='function') return;
  window.switchApp=function(app){ if(app==='rounds'){ location.href='/rounds/'; return; } return sa.apply(this,arguments); }; })();