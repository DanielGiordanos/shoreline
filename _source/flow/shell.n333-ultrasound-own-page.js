/* n333: anything in Flow that still asks for Ultrasound opens Ultrasound's own page */
(function(){ var sa=window.switchApp; if(typeof sa!=='function') return;
  window.switchApp=function(app){ if(app==='ultrasound'){ location.href='/ultrasound/'; return; } return sa.apply(this,arguments); }; })();