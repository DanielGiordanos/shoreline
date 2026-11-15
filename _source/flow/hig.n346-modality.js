/* PVX-N346 - HIG Modality: a sheet over the patient drawer (Care team, Ultrasound request, Edit triage, Triage intake, Send a form…)
   keeps Tab inside it; the drawer behind is out of reach until the sheet closes (Tab wandered into the drawer 17 times in 25) */
(function(){
  var IDS=['ctModal','usModal','triEditModal','intakeModal','assignModal','apModal','alertModal','shiftModal','confirmBox'];
  function sheetOpen(){ return IDS.some(function(id){ var m=document.getElementById(id); return m&&m.classList.contains('open'); })
    || [].some.call(document.querySelectorAll('.cf-sheet.open,.fv-sheet.open,.sf-sheet.open'),function(x){ return x.getClientRects().length; }); }
  var on=false, back=null;
  function sync(){ var dr=document.getElementById('drawer'); if(!dr) return; var want=dr.classList.contains('open')&&sheetOpen();
    if(want===on) return; on=want;
    if(want){ var a=document.activeElement; back=(a&&dr.contains(a))?a:back; dr.inert=true; dr.setAttribute('data-pvx-inert','1'); }
    else if(dr.getAttribute('data-pvx-inert')){ dr.inert=false; dr.removeAttribute('data-pvx-inert');
      /* the sheet tried to put focus back while the drawer was still out of reach: finish the job */
      var f=document.activeElement, lost=!f||f===document.body||f.id==='stage'||IDS.some(function(id){ var m=document.getElementById(id); return m&&!m.classList.contains('open')&&m.contains(f); }); if(lost&&back&&back.isConnected&&dr.classList.contains('open')) try{ back.focus({preventScroll:true}); }catch(e){}
      back=null; } }
  function go(){ IDS.concat(['drawer']).forEach(function(id){ var m=document.getElementById(id); if(m) try{ new MutationObserver(sync).observe(m,{attributes:true,attributeFilter:['class']}); }catch(e){} });
    try{ pvxWatch(sync,{childList:true},document.body); }catch(e){} sync(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();