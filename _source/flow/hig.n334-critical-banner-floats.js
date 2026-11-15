/* PVX-N334 - 2. the critical-patient banner floats above the page; at the top of the page it no longer covers
   the title, the filters or the first controls: the page makes just enough room under it.
   3. if the text size changes while the banner is open, it refits its height to its text. */
try{(function(){
  const $=s=>document.querySelector(s);
  const CTL='h1,h2,h3,.col-head,button,a[href],input,select,textarea,[role=button],[role=tab],.chip,.kpi,th,label';
  function view(){ const st=$('#stage'); if(!st) return null; for(const v of st.children){ if(/^view-/.test(v.id)&&v.offsetHeight>0&&getComputedStyle(v).display!=='none') return v; } return null; }
  function clear(v){ if(!v||!v.hasAttribute('data-pvx-room')) return; v.style.removeProperty('padding-top'); v.removeAttribute('data-pvx-room'); }
  let last='';
  function room(){
    const isl=$('#critIsland'), dr=$('#drawer'), st=$('#stage'), v=view();
    document.querySelectorAll('[data-pvx-room]').forEach(x=>{ if(x!==v) clear(x); });
    if(!v) return;
    const on=!!(isl&&isl.classList.contains('on')&&isl.classList.contains('content')), open=!!(dr&&dr.classList.contains('open'));
    const atTop=!st||st.scrollTop<=4;
    if(!on||open||v.id==='view-client'||document.body.classList.contains('tv-mode')){ if(atTop||!on) { if(atTop) clear(v); } last=''; return; }
    if(!atTop){ last=''; return; }   /* scrolled: the banner floats over the content, as it always has */
    const cs=getComputedStyle(isl), H=parseFloat(isl.style.height)||isl.offsetHeight, W=parseFloat(isl.style.width)||isl.offsetWidth;
    const top=parseFloat(cs.top)||0, bottom=top+H;
    const lft=isl.style.left?parseFloat(isl.style.left):innerWidth/2, left=lft-W/2, right=lft+W/2;
    const key=[v.id,H,W,top,lft,innerWidth,innerHeight,getComputedStyle(document.documentElement).fontSize].join('|');
    if(key===last) return; last=key;
    const base=v.hasAttribute('data-pvx-room')?parseFloat(v.dataset.pvxBase)||0:parseFloat(getComputedStyle(v).paddingTop)||0;
    const shift=(parseFloat(getComputedStyle(v).paddingTop)||0)-base;   /* how far the content sits lower right now (mid-animation too) */
    const sy=st?st.scrollTop:0;   /* a smooth scroll back up can still be a few points short of the top */
    let minTop=Infinity;
    v.querySelectorAll(CTL).forEach(e=>{ const b=e.getBoundingClientRect(); if(!b.width||!b.height) return; const t=b.top-shift+sy, bt=b.bottom-shift+sy;
      if(b.right<=left||b.left>=right||bt<=top||t>=bottom+8) return; if(t<minTop) minTop=t; });
    const pad=minTop<Infinity?Math.max(0,Math.ceil(bottom+12-minTop)):0;
    if(!pad){ clear(v); return; }
    if(!v.hasAttribute('data-pvx-room')){ v.dataset.pvxBase=String(base); v.setAttribute('data-pvx-room',''); }
    v.style.paddingTop=(base+pad)+'px';
  }
  let fs=getComputedStyle(document.documentElement).fontSize;
  function fit(){ const now=getComputedStyle(document.documentElement).fontSize; if(now===fs) return; fs=now;
    const isl=$('#critIsland'); if(!isl||!isl.classList.contains('content')) return; const inn=isl.querySelector('.ci-inner'); if(!inn) return;
    const h=Math.max(36,inn.offsetHeight), cur=parseFloat(isl.style.height)||0; if(cur&&Math.abs(h-cur)>1) isl.style.height=h+'px'; }
  let t=0; const soon=()=>{ if(t) return; t=requestAnimationFrame(()=>{ t=0; try{ fit(); room(); }catch(e){} }); };
  try{ pvxWatch(soon,{attributes:true,attributeFilter:['class','style'],subtree:true},document.body); }catch(e){}
  try{ pvxWatch(soon,{attributes:true,attributeFilter:['style','class']},document.documentElement); }catch(e){}
  addEventListener('resize',()=>{ last=''; soon(); });
  const st=$('#stage'); if(st) st.addEventListener('scroll',()=>{ if(st.scrollTop<=4) soon(); },{passive:true});
  const isl=$('#critIsland'); if(isl) isl.addEventListener('transitionend',()=>{ last=''; soon(); });
  document.addEventListener('transitionend',e=>{ if(e.target&&e.target.id==='critIsland'){ last=''; soon(); } });
  soon();
  window.pvxN334={room,fit,reset:()=>{ last=''; }};
})();}catch(__e){ console.warn('[n334]',__e); }