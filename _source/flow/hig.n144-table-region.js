(function(){
  var $=function(s,r){ return (r||document).querySelector(s); }, $$=function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  /* FLOW-01: the table region is named and reachable; a hint appears only when columns are off screen */
  function tableRegion(){ var w=$('#view-list .tablewrap'); if(!w) return; if(!w.hasAttribute('role')){ w.setAttribute('role','region'); w.setAttribute('aria-label','Patients table'); w.tabIndex=0;
      var h=document.createElement('p'); h.className='pvx-tblhint'; h.id='pvxTblHint'; h.textContent='Scroll sideways for Status, Priority, Arrival and Wait.'; w.parentNode.insertBefore(h,w); w.setAttribute('aria-describedby','pvxTblHint'); }
    var over=w.scrollWidth>w.clientWidth+1, h2=$('#pvxTblHint'); if(h2) h2.classList.toggle('on',over); }
  /* FLOW-08: keep the alert under the app bar while it is on screen (it scrolls away with the page) */
  var ciRaf=0; function ciTop(){ ciRaf=0; var y=12;
    /* a dialog or drawer on top: the page behind is inert, so the alert keeps its original place instead of covering the dialog */
    if($('.addpt-modal.open, .intake-modal.open, .drawer.open, .confirm.open, .modal.open, .sheet.open')){ document.documentElement.style.setProperty('--pvx-ci-top','12px'); return; }
    $$('.topnav, .subnav').forEach(function(n){ if(n.offsetParent===null&&getComputedStyle(n).position!=='fixed') return; var b=n.getBoundingClientRect(); if(b.height&&b.bottom>0) y=Math.max(y,Math.round(b.bottom+8)); }); document.documentElement.style.setProperty('--pvx-ci-top',y+'px'); }
  function ciLater(){ if(!ciRaf) ciRaf=requestAnimationFrame(ciTop); }
  /* FLOW-13: arrival and priority are single-choice groups — roles, checked state, arrow keys */
  function radios(g,label){ if(!g) return; if(!g.dataset.pvxRg){ g.dataset.pvxRg='1'; g.setAttribute('role','radiogroup'); g.setAttribute('aria-label',label);
      g.addEventListener('keydown',function(e){ var k=e.key; if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].indexOf(k)<0) return; var bs=$$('button',g).filter(function(b){ return b.offsetParent!==null&&!b.disabled; }); var i=bs.indexOf(document.activeElement); if(i<0) return; e.preventDefault();
        var j=k==='Home'?0:k==='End'?bs.length-1:(i+((k==='ArrowRight'||k==='ArrowDown')?1:-1)+bs.length)%bs.length; bs[j].focus(); bs[j].click(); }); }
    $$('button',g).forEach(function(b){ var on=b.classList.contains('active'), c=on?'true':'false', ti=on?'0':'-1'; if(b.getAttribute('role')!=='radio') b.setAttribute('role','radio'); if(b.getAttribute('aria-checked')!==c) b.setAttribute('aria-checked',c); if(b.getAttribute('tabindex')!==ti) b.tabIndex=on?0:-1; }); }   /* PVX-N378 */
  /* FLOW-10 (state only), US-04, RD-05: the selected view / shift / filter is exposed, not only coloured */
  function selected(){ ['#switcher','#switcherUs','#switcherRd'].forEach(function(id){ $$(id+' .seg').forEach(function(b){ if(b.classList.contains('active')){ if(b.getAttribute('aria-current')!=='page') b.setAttribute('aria-current','page'); } else if(b.hasAttribute('aria-current')) b.removeAttribute('aria-current'); }); });
    $$('.rd-svcbtn').forEach(function(b){ var v=b.classList.contains('on')?'true':'false'; if(b.getAttribute('aria-pressed')!==v) b.setAttribute('aria-pressed',v); });
    radios($('#apArrival'),'Arrival type'); radios($('#apPrio'),'Priority'); tableRegion(); }
  var sRaf=0; function later(){ if(!sRaf) sRaf=requestAnimationFrame(function(){ sRaf=0; selected(); }); }
  function boot(){ selected(); ciTop();
    pvxWatch(function(ms){ for(var i=0;i<ms.length;i++){ var t=ms[i].target; if(t.nodeType===1&&(ms[i].type==='childList'||t.matches('.seg,.ap-seg-btn,.ap-prio-btn,.rd-svcbtn,#rdShiftSeg button'))){ later(); ciLater(); return; } if(ms[i].type==='attributes'&&t.nodeType===1&&/(^|\s)open(\s|$)/.test(t.className||'')!==/(^|\s)open(\s|$)/.test(ms[i].oldValue||'')) ciLater(); } },{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class']},document.body);
    addEventListener('scroll',ciLater,{passive:true,capture:true}); addEventListener('resize',function(){ ciLater(); later(); });
    /* FLOW-14: a blank name is marked on the field itself, stays until fixed, and is announced */
    var nm=$('#apName'), cb=$('#apCreate');
    if(nm&&cb){ nm.setAttribute('required',''); nm.setAttribute('aria-required','true'); var er=document.createElement('div'); er.className='pvx-fielderr'; er.id='apNameErr'; er.setAttribute('role','alert'); nm.parentNode.appendChild(er);
      var lab=nm.parentNode.querySelector('label'); if(lab&&!lab.htmlFor) lab.htmlFor='apName';
      cb.addEventListener('click',function(){ if(!String(nm.value||'').trim()){ nm.setAttribute('aria-invalid','true'); nm.setAttribute('aria-describedby','apNameErr'); er.textContent='Enter a patient name.'; setTimeout(function(){ try{ nm.focus(); }catch(e){} },0); } },true);
      nm.addEventListener('input',function(){ if(String(nm.value||'').trim()&&nm.getAttribute('aria-invalid')==='true'){ nm.removeAttribute('aria-invalid'); er.textContent=''; } }); }
    var tt=$('#toast'); if(tt&&!tt.hasAttribute('role')){ tt.setAttribute('role','status'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();