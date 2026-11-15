/* PVX-N360 - HIG Pop-up buttons + Pull-down buttons. Source changes in n360/patch_n360.py:
   1. pop-up choices are read as words ("Klaudia Polak, Free"), the button as "Doctor: Kelley Harpin";
   2. short pop-ups (three priorities) don't show a search field, and keep their keys;
   3. the drawer's Doctor pop-up offers "No doctor" once one is assigned, and removing one says "Doctor removed";
   4. a live update doesn't rebuild the drawer under an open pop-up: the refill waits until the list closes. */
(function(){
  if(typeof fillDrawer!=='function') return;
  var pend=null, shown=null;
  function inDrawer(){ try{ var d=document.getElementById('drawer'); return !!(ddOpen&&ddOpen.root&&d&&d.contains(ddOpen.root)); }catch(e){ return false; } }
  pvxWrap('fillDrawer',function(orig){ return function(p){
    if(inDrawer()){ if(p&&p.id===shown){ pend=p; return; } try{ ddOpen.close(); }catch(e){} }   /* another patient: close the list, then fill */
    pend=null; shown=p&&p.id; return orig.apply(this,arguments); }; },'n360');
  window.__pvxDdClosed=function(){ if(!pend||inDrawer()) return; var id=pend.id; pend=null;
    try{ if(typeof activePatient!=='undefined'&&activePatient===id){ var q=PATIENTS.find(function(x){ return x.id===id; }); if(q) window.fillDrawer(q); } }catch(e){} };
})();