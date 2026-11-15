/* ===== n332 · Flow: Design principles, Accessibility, Color (Nov 6 2026) ===== */
try{(function(){
  if(typeof LOBBY!=='undefined'&&LOBBY) return;   /* the lobby TV stays as it is */
  const $=s=>document.querySelector(s);
  /* a long wait says so to VoiceOver too, not only in colour */
  const WAITS='.wait.warn,.wait.crit,.wd-wait.warn,.wd-wait.crit,.r-timer.warn,.r-timer.crit';
  function sayWaits(root){ (root||document).querySelectorAll(WAITS).forEach(el=>{ if(el.closest('#view-client')) return;
    const crit=el.classList.contains('crit'), txt=crit?' (over 2 hours)':(el.classList.contains('r-timer')||el.classList.contains('wd-wait')?' (over an hour)':' (long wait)');
    let s=el.querySelector(':scope > .pvx-sr332'); if(!s){ s=document.createElement('span'); s.className='pvx-sr332'; el.appendChild(s); } if(s.textContent!==txt) s.textContent=txt;
    if(!el.title) el.title=crit?'Waiting over 2 hours':'Long wait'; }); }
  /* the Attention Center: each alert is a button you can reach with Tab, named by what it says */
  function attn(){ document.querySelectorAll('.attn-item').forEach(n=>{ if(n.getAttribute('role')==='button') return;
    n.setAttribute('role','button'); n.tabIndex=0;
    const pt=n.querySelector('.patient'), is=n.querySelector('.issue'), sec=n.querySelector('.secondary'), badge=n.querySelector('.overdue-text,.high-text');
    const head=[pt&&pt.textContent.trim(),is&&is.textContent.trim()].filter(Boolean).join(' ');
    n.setAttribute('aria-label',[head,sec&&sec.textContent.trim(),badge&&badge.textContent.trim().toLowerCase()].filter(Boolean).join(', '));
    n.addEventListener('keydown',e=>{ if(e.target!==n) return; if(e.key==='Enter'||e.key===' '){ e.preventDefault(); n.click(); } }); }); }
  /* the critical banner and an open patient: beside it when there's room, above it when there isn't */
  function island(){ const isl=$('#critIsland'), dr=$('#drawer'); if(!isl) return;
    const on=isl.classList.contains('on'), open=!!(dr&&dr.classList.contains('open'));
    if(!on||!open){ if(isl.style.left) isl.style.removeProperty('left'); if(dr&&dr.classList.contains('pvx-ci-pad')){ dr.classList.remove('pvx-ci-pad'); dr.style.removeProperty('--pvx-ci-pad'); } }   /* PVX-N378: only when it changes; removing an absent class woke every watcher, every frame */
    else{ const dw=dr.getBoundingClientRect().width, free=innerWidth-dw, need=(parseFloat(getComputedStyle(isl).getPropertyValue('--ci-w'))||640)+32;
      if(free>=need){ const L=(free/2)+'px'; if(isl.style.left!==L) isl.style.left=L; if(dr.classList.contains('pvx-ci-pad')){ dr.classList.remove('pvx-ci-pad'); dr.style.removeProperty('--pvx-ci-pad'); } }
      else{ if(isl.style.left) isl.style.removeProperty('left'); const r=isl.getBoundingClientRect(), pad=Math.ceil(r.bottom+10)+'px'; if(dr.style.getPropertyValue('--pvx-ci-pad')!==pad) dr.style.setProperty('--pvx-ci-pad',pad); if(!dr.classList.contains('pvx-ci-pad')) dr.classList.add('pvx-ci-pad'); } }
    /* Ultrasound Today has no page title for the banner to sit beside, so it makes room above Next Up */
    const ut=$('#view-us-today'); if(ut){ if(on&&!open&&ut.offsetParent){ if(scrollY<4){ const r=isl.getBoundingClientRect(); ut.style.paddingTop='';
          const f=[...ut.children].find(c=>c.offsetHeight>40&&!/absolute|fixed/.test(getComputedStyle(c).position));
          if(f){ const base=parseFloat(getComputedStyle(ut).paddingTop)||0, pad=Math.max(0,Math.ceil(r.bottom+14-f.getBoundingClientRect().top)); if(pad) ut.style.paddingTop=(base+pad)+'px'; } } }
      else ut.style.paddingTop=''; } }
  let t=0; const soon=()=>{ if(t) return; t=requestAnimationFrame(()=>{ t=0; try{ sayWaits(); attn(); island(); }catch(e){} }); };
  try{ pvxWatch(soon,{childList:true,subtree:true,attributes:true,attributeFilter:['class']},document.body); }catch(e){}
  addEventListener('resize',soon); soon();
  window.pvxN332={sayWaits,attn,island};
})();}catch(__e){ console.warn('[n332]',__e); }