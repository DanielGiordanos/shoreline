/* PVX-N359 - HIG Home Screen quick actions: with launch_handler focus-existing, choosing New patient, Find a patient,
   Patients or Client Display from the Dock menu, the File menu or a quick action brings the open Flow window forward and does
   it there, without reloading the board. The first launch is the one that opened this page, which the page has already
   handled (n207, n358); later ones are handed to the same #op= / #find / #view= handlers. */
(function(){
  if(!('launchQueue' in window)||!window.launchQueue||typeof launchQueue.setConsumer!=='function') return;
  var first=true;
  launchQueue.setConsumer(function(params){
    if(first){ first=false; return; }
    try{ var u=new URL(params&&params.targetURL||'', location.href); if(u.origin!==location.origin) return;
      var h=String(u.hash||'').replace(/^#/,''); if(!h) return;
      if(String(location.hash).replace(/^#/,'')===h){ try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
      location.hash=h; }catch(e){}
  });
})();