




const CLIENT_STEPS=['Check-In','Triage','Doctor Exam','Diagnostics','Treatment','Recovery','Ready to Go Home'];
const CLIENT_STAGE={
Waiting:      {label:'Awaiting Doctor',  color:'var(--s-waiting)',     rgb:'235,201,93',  step:2},
Exam:         {label:'Doctor Exam',       color:'var(--s-exam)',        rgb:'56,189,210',  step:2},
Diagnostics:  {label:'Diagnostics',       color:'var(--s-diagnostics)', rgb:'168,136,224', step:3},
Ultrasound:   {label:'Ultrasound',        color:'var(--s-ultrasound)',  rgb:'79,154,214',  step:3},
Procedure:    {label:'Treatment',         color:'var(--s-procedure)',   rgb:'232,100,74',  step:4},
Hospitalized: {label:'Hospitalized',      color:'#2FB6B9',              rgb:'47,182,185',  step:5},
Admitted:     {label:'Recovering',        color:'var(--s-admitted)',    rgb:'72,184,136',  step:5},
Discharged:   {label:'Ready to Go Home',  color:'var(--s-discharged)',  rgb:'122,155,181', step:6}
};
function clientStage(p){ return CLIENT_STAGE[p.status] || CLIENT_STAGE.Exam; }

const PRIO_CLR={1:{c:'var(--priority-p1)',rgb:'228,52,43'},2:{c:'var(--priority-p2)',rgb:'242,199,68'},3:{c:'var(--priority-p3)',rgb:'92,199,90'}};
function stageMinutes(p){ const t=p.timeline; const last=(t&&t.length)?t[t.length-1].at:p.arrival; return Math.max(0,Math.round((now-last)/60000)); }
const CL_PAW='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="11" r="2"/><circle cx="10" cy="6.5" r="2"/><circle cx="14" cy="6.5" r="2"/><circle cx="18" cy="11" r="2"/><path d="M12 12c-2.6 0-4.7 2-4.7 4.2 0 1.7 1.4 2.6 3 2.3.7-.15 1.1-.35 1.7-.35s1 .2 1.7.35c1.6.3 3-.6 3-2.3C16.7 14 14.6 12 12 12z"/></svg>';
const CL_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 7 9.5 17 5 12.5"/></svg>';
function clientJourney(p, withLabels){
const cs=clientStage(p), cur=cs.step;
return`<div class="cl-journey${withLabels?'':' nolabel'}" style="--gc:${cs.color};--gcrgb:${cs.rgb}">`+
CLIENT_STEPS.map((lbl,i)=>{ const cls=i<cur?'done':(i===cur?'current':''); return`<div class="cl-step ${cls}"><div class="cl-node">${i<cur?CL_CHECK:''}</div>${withLabels?`<div class="cl-step-lbl">${lbl}</div>`:''}</div>`; }).join('')+
`</div>`;
}
function clientSegments(p){
const cs=clientStage(p), cur=cs.step;
return`<div class="cl-segs" style="--gc:${cs.color};--gcrgb:${cs.rgb}">`+
CLIENT_STEPS.map((_,i)=>`<span class="cl-seg ${i<cur?'done':(i===cur?'current':'')}"></span>`).join('')+`</div>`;
}
function clientBadge(p){ const cs=clientStage(p); return`<span class="cl-badge" style="--gc:${cs.color};--gcrgb:${cs.rgb}"><span class="cl-badge-dot"></span><span class="cl-badge-txt"><span class="cl-badge-inner">${cs.label}</span></span></span>`; }

function clientVJourney(p){
const cs=clientStage(p), cur=cs.step;
return`<div class="cl-vtl" style="--gc:${cs.color};--gcrgb:${cs.rgb}">`+
CLIENT_STEPS.map((lbl,i)=>{ const cls=i<cur?'done':(i===cur?'current':''); return`<div class="cl-vstep2 ${cls}"><span class="cl-vnode">${i<cur?CL_CHECK:''}</span><span class="cl-vlbl">${lbl}</span></div>`; }).join('')+
`</div>`;
}
function clientPlaceholder(idx){
return`<div class="cl-card cl-empty" style="animation-delay:${idx*40}ms"><div class="cl-empty-in"><span class="cl-empty-paw">${CL_PAW}</span><span class="cl-empty-txt">Available</span></div></div>`;
}
function clientCard(p, idx){
const cs=clientStage(p), pr=PRIO[p.prio]||PRIO[3], pc=PRIO_CLR[p.prio]||PRIO_CLR[3];


const docName = p.doctor==='unassigned'
?'<span class="assigning-text">Assigning<span class="assigning-dots" aria-hidden="true"></span></span>'
: pvxEscQ(docShort(p.doctor));
return`<div class="cl-card priority-p${p.prio}" style="--gc:${pc.c};--gcrgb:${pc.rgb};animation-delay:${idx*60}ms">
    <div class="cl-cardtop">
      <div class="cl-cardmain">
        <div class="cl-mainhead">
          <div class="cl-photo patient-medallion ${spCls(p)}">${monoInner(p)}</div>
          <span class="cl-prio" style="background:${pr.c};color:${pr.t}">P${p.prio}</span>
        </div>
        <div class="cl-name">${pvxEscQ(p.name)} ${pvxEscQ(p.last)}</div>
        <div class="cl-meta">${pvxEscQ(p.breed)} · ${pvxEscQ(formatPatientAge(p))}</div>
      </div>
      ${clientVJourney(p)}
    </div>
    <div class="cl-badgerow">${clientBadge(p)}<span class="cl-doc">${docName}</span></div>
  </div>`;
}
const CL_ICONS={
users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
steth:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="9" r="2"/></svg>',
clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
};
function countUpEl(el,target,fmt){
const dur=900, t0=Date.now(), fmtv=n=>fmt==='wait'?fmtWait(Math.round(n)):String(Math.round(n));
(function step(){ const p=Math.min(1,(Date.now()-t0)/dur), e=1-Math.pow(1-p,3);
el.textContent=fmtv(target*e); if(p<1){ RAF?RAF(step):setTimeout(step,16); } })();
}
const PETS_ICON="assets/img/pets-icon.png";
const DOCS_ICON="assets/img/docs-icon.png";
const DISCH_ICON="assets/img/disch-icon.png";
function renderClientStats(animate){
const el=document.getElementById('clStats'); if(!el) return;
const m=execMetrics(); const active=PATIENTS.filter(isActive).length;
const avg=computeKPIs().find(k=>k.lab==='Avg Wait'); const avgVal=(avg && typeof avg.raw==='number')?avg.raw:null;
const stats=[
{ic:'<img class="cl-stat-photo" src="'+PETS_ICON+'" alt="">', sc:'56,189,210',  raw:active,           l:'Pets Receiving Care',   s:'On floor now',   fmt:'num'},
{ic:'<img class="cl-stat-photo" src="'+DOCS_ICON+'" alt="">', sc:'72,184,136',  raw:m.doctorsWorking, l:'Doctors On Duty',       s:'Caring for pets',fmt:'num'},
{ic:'<img class="cl-stat-photo" src="'+DISCH_ICON+'" alt="">', sc:'72,184,136',  raw:m.discharged,     l:'Pets Discharged Today', s:'Home & happy',   fmt:'num'}
];
const _disp=s=> s.fmt==='wait'? (typeof s.raw==='number'?fmtWait(s.raw):'—') : String(s.raw);
el.innerHTML=stats.map(s=>`<div class="cl-stat" style="--sc:${s.sc}">
    <div class="cl-stat-ic">${s.ic}</div>
    <div><div class="cl-stat-v" data-raw="${typeof s.raw==='number'?s.raw:''}" data-fmt="${s.fmt}">${_disp(s)}</div>
      <div class="cl-stat-l">${s.l}</div></div></div>`).join('');
if(animate) el.querySelectorAll('.cl-stat-v').forEach(v=>{ if(v.dataset.raw!=='') countUpEl(v, +v.dataset.raw, v.dataset.fmt); });
}
function clQrSvg(){
const N=21, s=100/N; let seed=7, cells='';
const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const finder=(x,y)=>{ let r=''; for(let i=0;i<7;i++)for(let j=0;j<7;j++){ if(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4)) r+=`<rect x="${(x+j)*s}" y="${(y+i)*s}" width="${s}" height="${s}"/>`; } return r; };
for(let y=0;y<N;y++)for(let x=0;x<N;x++){ if((x<7&&y<7)||(x>=N-7&&y<7)||(x<7&&y>=N-7)) continue; if(rnd()>0.55) cells+=`<rect x="${x*s}" y="${y*s}" width="${s}" height="${s}"/>`; }
return`<svg viewBox="0 0 100 100" fill="#0A1222" xmlns="http://www.w3.org/2000/svg">${cells}${finder(0,0)}${finder(N-7,0)}${finder(0,N-7)}</svg>`;
}
function updateClientClock(){ const c=document.getElementById('clClock'), d=document.getElementById('clDate'); if(!c) return;
c.textContent=fmtTime(now); if(d) d.textContent=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); }
let clPage=0, clPages=1, clRotateTimer=null;
function renderClient(animate){
const grid=document.getElementById('clGrid'); if(!grid) return;
const list=PATIENTS.filter(p=>isActive(p)&&p.status!=='Hospitalized').sort((a,b)=> a.prio-b.prio || waitMinutes(b)-waitMinutes(a));
const _clT=document.getElementById('clSecTitle'); if(_clT) _clT.textContent = list.length?'Pets Currently Receiving Care':'No pets are currently listed.';
const PER=clPerPage(grid);
clPages=Math.max(1,Math.ceil(list.length/PER));
if(clPage>=clPages) clPage=0;
const items=list.slice(clPage*PER, clPage*PER+PER);
let html=items.map((p,i)=>clientCard(p,i)).join('');
for(let i=items.length;i<PER;i++) html+=clientPlaceholder(i);
grid.innerHTML=html;
renderClientPager();
renderClientStats(animate);
updateClientClock();
const qr=document.getElementById('clQr'); if(qr && !qr.innerHTML) qr.innerHTML='<div style="background:#fff;padding:5px;border-radius:6px;line-height:0">'+(typeof makeQR==='function'?makeQR('https://shoreline.pravix.app/track.html'):clQrSvg())+'</div>';
const gq=document.getElementById('clGamesQr'); if(gq && !gq.innerHTML) gq.innerHTML='<div style="background:#fff;padding:5px;border-radius:6px;line-height:0">'+(typeof makeQR==='function'?makeQR('https://shoreline.pravix.app/arcade'):'')+'</div>';
fitClientBadges();
requestAnimationFrame(fitClientBadges);
}


function fitClientBadges(){
var grid=document.getElementById('clGrid'); if(!grid) return;
grid.querySelectorAll('.cl-badge-txt').forEach(function(txt){
var inner=txt.querySelector('.cl-badge-inner'); if(!inner) return;
inner.classList.remove('scroll'); inner.style.removeProperty('--scroll-dist'); inner.style.removeProperty('--scroll-dur');
var over=inner.scrollWidth - txt.clientWidth;
if(over>1){
var dist=Math.ceil(over);
var dur=Math.min(14, Math.max(5, over/10 + 4));
inner.style.setProperty('--scroll-dist', (-dist)+'px');
inner.style.setProperty('--scroll-dur', dur.toFixed(2)+'s');
inner.classList.add('scroll');
}
});
}
(function(){
var reflow=function(){ if(typeof currentView!=='undefined'&& currentView==='client'){ fitClientBadges(); clearTimeout(window.__clRerender); window.__clRerender=setTimeout(function(){ try{ if(currentView==='client') renderClient(false); }catch(e){} },150); } };
window.addEventListener('resize',reflow);
document.addEventListener('fullscreenchange',reflow);
document.addEventListener('webkitfullscreenchange',reflow);
})();
function clPerPage(grid){ try{ var cs=getComputedStyle(grid); var c=cs.gridTemplateColumns.split(' ').filter(Boolean).length, r=cs.gridTemplateRows.split(' ').filter(Boolean).length; var n=Math.max(1,c)*Math.max(1,r); return n>0?n:8; }catch(e){ return 8; } }
function renderClientPager(){
const pager=document.getElementById('clPager'); if(!pager) return;
if(clPages<=1){ pager.innerHTML=''; pager.style.visibility='hidden'; return; }
pager.style.visibility='';
let dots=''; for(let i=0;i<clPages;i++) dots+=`<button class="cl-dot ${i===clPage?'active':''}" data-pg="${i}" aria-label="Page ${i+1} of ${clPages}"${i===clPage?' aria-current="page"':''}></button>`;   /* PVX-N210 */
const mid=clPages>10?`<span class="cl-pcount">Page ${clPage+1} of ${clPages}</span>`:`<div class="cl-dots">${dots}</div>`;
pager.setAttribute('role','group'); pager.setAttribute('aria-label','Pages');
pager.innerHTML=`<button class="cl-pnav" data-dir="-1" aria-label="Previous page">‹ Previous</button>${mid}<button class="cl-pnav" data-dir="1" aria-label="Next page">Next ›</button>`;
pager.querySelectorAll('.cl-dot').forEach(d=>d.onclick=()=>clientSetPage(+d.dataset.pg));
pager.querySelectorAll('.cl-pnav').forEach(b=>b.onclick=()=>clientPage(+b.dataset.dir));
}

function clientFade(){
const grid=document.getElementById('clGrid'); if(!grid){ renderClient(); return; }
grid.classList.add('sliding');
setTimeout(()=>{ renderClient(); grid.classList.remove('sliding'); }, 260);
}
function clientPage(dir){ if(clPages<=1) return; clPage=(clPage+dir+clPages)%clPages; clientFade(); startClientRotate(); clSay(); }
function clientSetPage(i){ if(clPages<=1||i===clPage) return; clPage=i; clientFade(); startClientRotate(); clSay(); }
function clSay(){ var l=document.getElementById('clPageLive'); if(!l){ l=document.createElement('div'); l.id='clPageLive'; l.setAttribute('role','status'); l.className='cl-vh'; document.body.appendChild(l); }   /* PVX-N210: a chosen page is announced once */
  l.textContent=''; setTimeout(function(){ l.textContent='Page '+(clPage+1)+' of '+clPages; },60); }
function startClientRotate(){ stopClientRotate(); if(clPages>1){ clRotateTimer=setInterval(()=>{ clPage=(clPage+1)%clPages; clientFade(); }, 13000); } }
function stopClientRotate(){ if(clRotateTimer){ clearInterval(clRotateTimer); clRotateTimer=null; } }
 
let clSlide=0, clSlideTimer=null;
function clShowSlide(){ const s=document.querySelectorAll('#clCarousel .cl-slide'); s.forEach((el,i)=>el.classList.toggle('active', i===clSlide)); }
function startClientCarousel(){ stopClientCarousel(); clShowSlide();
clSlideTimer=setInterval(()=>{ const n=document.querySelectorAll('#clCarousel .cl-slide').length||1; clSlide=(clSlide+1)%n; clShowSlide(); }, 20000); }
function stopClientCarousel(){ if(clSlideTimer){ clearInterval(clSlideTimer); clSlideTimer=null; } }

document.addEventListener('keydown',e=>{
if(currentView!=='client') return;
if(e.key==='ArrowRight'){ e.preventDefault(); clientPage(1); }
else if(e.key==='ArrowLeft'){ e.preventDefault(); clientPage(-1); }
});
(function clientSwipe(){
let x0=null;
document.addEventListener('touchstart',e=>{ if(currentView==='client'&& e.target.closest && e.target.closest('#clGrid')) x0=e.touches[0].clientX; },{passive:true});
document.addEventListener('touchend',e=>{ if(x0===null) return; const dx=e.changedTouches[0].clientX-x0; x0=null; if(Math.abs(dx)>60) clientPage(dx<0?1:-1); },{passive:true});
})();
