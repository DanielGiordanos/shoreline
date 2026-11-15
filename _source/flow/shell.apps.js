/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */

 
let currentApp='flow';
let currentUsView='today';
/* n333: on Ultrasound's page */
/* n333: on Ultrasound's page */
function switchAppShell(app){
currentApp=app;
const nf=document.getElementById('navFlow'), nu=document.getElementById('navUltrasound'), nr=document.getElementById('navRounds');
if(nf) nf.classList.toggle('active',app==='flow');
if(nu) nu.classList.toggle('active',app==='ultrasound');
if(nr) nr.classList.toggle('active',app==='rounds');
[nf,nu,nr].forEach(function(a){ if(!a) return; if(a.classList.contains('active')) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });   /* n132 US-04 */
const sf=document.getElementById('subnavFlow'), su=document.getElementById('subnavUs'), sr=document.getElementById('subnavRd');
if(sf) sf.classList.toggle('hidden',app!=='flow');
if(su) su.classList.toggle('hidden',app!=='ultrasound');
if(sr) sr.classList.toggle('hidden',app!=='rounds');
document.body.classList.toggle('app-ultrasound',app==='ultrasound');
document.body.classList.toggle('app-rounds',app==='rounds');
const vbBrand=document.querySelector('.vb-brand');
if(vbBrand) vbBrand.textContent = app==='ultrasound'?'Pravix Ultrasound': (app==='rounds'?'Pravix Rounds':'Pravix Flow');
const vbVer=document.getElementById('versionLabel');
if(vbVer) vbVer.textContent = app==='ultrasound'?'Ultrasound v1.0': (app==='rounds'?'Rounds v3.0':'Flow v1.0');
}
function switchApp(app){
if(app===currentApp) return;
if(app==='ultrasound'){
switchAppShell('ultrasound');
document.body.classList.remove('client-mode');
try{ stopClientRotate(); stopClientCarousel(); }catch(e){}
['dashboard','list','flow','rooms','client'].forEach(x=>{ const el=document.getElementById('view-'+x); if(el) el.classList.add('hidden'); });
try{ rdHideAllViews(); }catch(e){}
switchUsView(currentUsView||'today');
}else if(app==='rounds'){
switchAppShell('rounds');
document.body.classList.remove('client-mode');
try{ stopClientRotate(); stopClientCarousel(); }catch(e){}
['dashboard','list','flow','rooms','client'].forEach(x=>{ const el=document.getElementById('view-'+x); if(el) el.classList.add('hidden'); });
usxHideAllViews();
switchRdView(currentRdView||'census');
}else{
switchAppShell('flow');
usxHideAllViews();
try{ rdHideAllViews(); }catch(e){}
switchView(currentView||'dashboard');
}
}
