


function opsMenuPlace(){ /* PVX-N184: the menu drops down from the + in the sub-nav */
const fab=document.getElementById('fabAdd'), m=document.getElementById('opsMenu'); if(!fab||!m) return;
const b=fab.getBoundingClientRect(), w=m.offsetWidth||312, gut=12;
const sl=parseFloat(getComputedStyle(document.body).paddingLeft)||0, sr=parseFloat(getComputedStyle(document.body).paddingRight)||0;
m.style.left=Math.round(Math.max(gut+sl, Math.min(b.right-w, innerWidth-w-gut-sr)))+'px'; m.style.top=Math.round(b.bottom+8)+'px'; m.style.bottom='auto';
}
window.addEventListener('resize',function(){ if(document.getElementById('opsMenu').classList.contains('open')) opsMenuPlace(); });
/* opsMenuOpen · its layers, innermost first: 1 n203 after   (PVX-N387; kept true by flow_t387) */
function opsMenuOpen(){ return pvxRun('opsMenuOpen',opsMenuOpen$base,this,arguments); }
function opsMenuOpen$base(){
opsMenuPlace();
document.getElementById('opsScrim').classList.add('open');
document.getElementById('opsMenu').classList.add('open');
const fab=document.getElementById('fabAdd'); fab.classList.add('open'); fab.setAttribute('aria-expanded','true');
}
/* opsMenuClose · its layers, innermost first: 1 n203 wrap   (PVX-N387; kept true by flow_t387) */
function opsMenuClose(){ return pvxRun('opsMenuClose',opsMenuClose$base,this,arguments); }
function opsMenuClose$base(){
document.getElementById('opsScrim').classList.remove('open');
document.getElementById('opsMenu').classList.remove('open');
const fab=document.getElementById('fabAdd'); fab.classList.remove('open'); fab.setAttribute('aria-expanded','false');
}
function opsMenuToggle(){ document.getElementById('opsMenu').classList.contains('open') ? opsMenuClose() : opsMenuOpen(); }
