
 
(function initAmbient(){
const stage=document.getElementById('stage'), mesh=document.getElementById('mesh');
if(stage&&mesh) stage.addEventListener('scroll',()=>{
mesh.style.transform = document.body.classList.contains('dark') ?`translateY(${stage.scrollTop*-0.03}px)`:'none';
}, {passive:true});
})();


let _lastMin=-1;
setInterval(()=>{
now.setTime(Date.now());   /* flow-fixes-oct6: the real time, so a missed tick is never lost */
if(currentApp==='flow'&&currentView==='dashboard'){renderKPIs();}
if(currentApp==='flow'&&currentView==='client'){ updateClientClock(); }
const mins=Math.floor(now.getTime()/60000);
if(mins!==_lastMin){
_lastMin=mins;
try{ updateDashDate(); }catch(e){}
if(currentApp==='flow'&&currentView==='dashboard') renderOps();
if(currentView==='rooms') renderRooms();
if(currentApp==='ultrasound') renderUltrasound();
if(currentApp==='rounds') renderRounds();
if(currentApp==='flow'&&currentView==='client') renderClient();
}
},1000);


function updateDashDate(){ const el=document.getElementById('dashDate'); if(!el) return; const d=new Date();
el.innerHTML=(d.toLocaleDateString('en-US',{weekday:'long'}) +', ').toUpperCase()
+'<span class="dd-md" style="font-weight:var(--weight-bold)">'+ d.toLocaleDateString('en-US',{month:'long',day:'numeric'}).toUpperCase() +'</span>'
+' • HOSPITAL OPERATIONS'; }
updateDashDate();
