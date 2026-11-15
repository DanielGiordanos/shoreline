
 
function toggleDark(){document.body.classList.toggle('dark');


try{ if(window.__pvxPaintCanvas) window.__pvxPaintCanvas(document.body.classList.contains('dark')?'dark':'light'); }catch(e){}
try{ document.cookie ='pvx_theme='+(document.body.classList.contains('dark')?'dark':'light')+';domain=.pravix.app;path=/;max-age=31536000;SameSite=Lax'; }catch(e){}
if(!document.body.classList.contains('dark')){const m=document.getElementById('mesh');if(m)m.style.transform='none';}}
/* Clear only per-user clinical UI mirrors; keep theme/accessibility settings.
   The server remains authoritative for all medical records and handoff queues. */
function pvxClearPrivateLocalState(){
  try{
    var remove = ['pravix_client_intakes','pravix_intake_analytics','pvx:flow:where','pvx:kpi:v1','wd_trend_v1'];
    remove.forEach(function(k){localStorage.removeItem(k)});
    for(var i=localStorage.length-1;i>=0;i--){
      var k=localStorage.key(i);
      if(k && /^pravix:[^:]+:(?:rounds:(?:tomorrow|actor)|usdocstatus):/.test(k))
        localStorage.removeItem(k);
    }
  }catch(e){console.warn('[privacy] local cleanup unavailable');}
}
/* logout · its layers, innermost first: 1 n349 before   (PVX-N387; kept true by flow_t387) */
function logout(){ return pvxRun('logout',logout$base,this,arguments); }
function logout$base(){
try{ ['unsubVisits','unsubPub','unsubShifts','unsubAlert','unsubMsgs','unsubPubLobby'].forEach(function(k){ if(Backend[k]){ try{ Backend[k](); }catch(e){} Backend[k]=null; } }); }catch(e){}
try{ if(AUTH) AUTH.signOut(); }catch(e){}
pvxClearPrivateLocalState();
PATIENTS=[]; try{ if(typeof renderAll==='function') renderAll(); }catch(e){}
try{ showLogin(); }catch(e){} toast('Signed out');
}
