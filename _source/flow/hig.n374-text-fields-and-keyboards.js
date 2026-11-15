(function(){
  var set=function(e,k,v){ if(e.getAttribute(k)!==v) e.setAttribute(k,v); };
  var COARSE=window.matchMedia?matchMedia('(hover:none) and (pointer:coarse)'):{matches:false};
  /* 1. keyboards that fit the text */
  var CLIN='#apReason,#apTransferNotes,#triEditChief,#triEditHistory,#intakeModal input:not([type=checkbox]):not([type=radio]),#intakeModal textarea,#usCQ,#usDx,#fvOrProc,#fvOrNote,.tq-note,#apBreed,#apRefHosp,#otwFrom,#recPdvm,#triEditBy,#ctFormManual';
  var WORDS='#triEditBy,#ctFormManual,#cffOwner,#cffAddr,#cffCity,#cffPet';
  function keys(){ [].forEach.call(document.querySelectorAll(CLIN),function(i){ set(i,'autocorrect','off'); set(i,'spellcheck','false'); });
    [].forEach.call(document.querySelectorAll('input[placeholder^="List medications"]'),function(i){ set(i,'autocapitalize','off'); });
    [].forEach.call(document.querySelectorAll(WORDS),function(i){ set(i,'autocapitalize','words'); });
    var st=document.getElementById('cffState'); if(st) set(st,'autocapitalize','characters'); }
  /* 4. toggles */
  function radios(){ [].forEach.call(document.querySelectorAll('#cfFamily .cff-lang,#cfFamily .cff-ts'),function(g){ set(g,'role','radiogroup');
      var B=[].slice.call(g.querySelectorAll('button')), on=null;
      B.forEach(function(b){ var p=b.getAttribute('aria-pressed'); if(p!==null){ set(b,'aria-checked',p); b.removeAttribute('aria-pressed'); } set(b,'role','radio'); if(b.getAttribute('aria-checked')==='true') on=b; });
      B.forEach(function(b){ var t=(b===(on||B[0]))?0:-1; if(b.tabIndex!==t) b.tabIndex=t; }); });
    [].forEach.call(document.querySelectorAll('#cfFamily [data-fvd="fzoom"][aria-pressed]'),function(b){ b.removeAttribute('aria-pressed'); });
  }
  var want=null;
  document.addEventListener('keydown',function(e){ var b=e.target, g=b&&b.closest&&b.closest('#cfFamily .cff-lang,#cfFamily .cff-ts'); if(!g||e.altKey||e.metaKey||e.ctrlKey) return;
    var B=[].slice.call(g.querySelectorAll('button')), i=B.indexOf(b), n=B.length; if(i<0) return;
    var j={ArrowLeft:i-1,ArrowUp:i-1,ArrowRight:i+1,ArrowDown:i+1,Home:0,End:n-1}[e.key]; if(j===undefined) return;
    e.preventDefault(); e.stopPropagation(); j=(j+n)%n; want={cls:g.className.split(' ')[0],k:j,at:Date.now()}; B[j].click(); back(); },true);
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#cfFamily .cff-lang button,#cfFamily .cff-ts button');
    if(b&&!want){ var g=b.parentNode; want={cls:g.className.split(' ')[0],k:[].indexOf.call(g.querySelectorAll('button'),b),at:Date.now()}; } },true);
  function back(){ var w=want; if(!w) return; if(Date.now()-w.at>1200){ want=null; return; } radios();
    var g=document.querySelector('#cfFamily .'+w.cls), c=g&&(g.querySelector('[aria-checked="true"]')||g.querySelectorAll('button')[w.k]);
    if(c&&document.activeElement!==c) try{ c.focus({preventScroll:true}); }catch(x){} }
  var t=0; function sweep(){ clearTimeout(t); t=0; try{ keys(); radios(); back(); }catch(e){} }
  var go=function(){ if(!t) t=setTimeout(sweep,30); };
  document.addEventListener('focusin',function(){ try{ keys(); }catch(e){} },true);   /* before the keyboard comes up */
  try{ pvxWatch(go,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed']},document.documentElement); }catch(e){}
  sweep();
  /* 2. a Clear button in sheets on iPhone and iPad */
  var XM='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 8l8 8M16 8l-8 8"/></svg>';
  var cb=null, cur=null;
  function clearable(i){ return COARSE.matches&&i&&i.tagName==='INPUT'&&/^(text|tel|email|)$/.test(i.type||'')&&!i.readOnly&&!i.disabled&&i.getAttribute('role')!=='spinbutton'
    &&!/^Search/.test(i.getAttribute('aria-label')||'')&&!i.closest('.pvx-uwrap')&&!!i.closest('[role=dialog],[aria-modal="true"],#drawer'); }
  function place(){ var i=cur, show=!!(i&&i.isConnected&&i.value&&document.activeElement===i);
    if(!show){ if(cb) cb.hidden=true; if(i) i.classList.remove('pvx-hasclr'); return; }
    if(!cb){ cb=document.createElement('button'); cb.type='button'; cb.className='pvx-clr'; cb.tabIndex=-1; cb.title='Clear'; cb.setAttribute('aria-label','Clear'); cb.innerHTML=XM;
      var clr=function(e){ e.preventDefault(); var x=cur; if(!x||!x.value) return; x.value=''; x.dispatchEvent(new Event('input',{bubbles:true})); try{ x.focus({preventScroll:true}); }catch(y){} place(); };
      cb.addEventListener('pointerdown',clr); cb.addEventListener('mousedown',function(e){ e.preventDefault(); }); cb.addEventListener('click',clr); }   /* on touch down: focus never leaves the field */
    var host=i.closest('[role=dialog],[aria-modal="true"],#drawer')||document.body; if(cb.parentNode!==host) host.appendChild(cb);
    var r=i.getBoundingClientRect(); i.classList.add('pvx-hasclr'); cb.hidden=false;
    var w=cb.offsetWidth||28, h=cb.offsetHeight||28, L=Math.round(r.right-w-Math.max(2,(36-w)/2+4)), Y=Math.round(r.top+r.height/2-h/2);   /* 44 pt on touch */ cb.style.left=L+'px'; cb.style.top=Y+'px';
    var q=cb.getBoundingClientRect(); if(Math.abs(q.left-L)>1||Math.abs(q.top-Y)>1){ cb.style.left=(2*L-q.left)+'px'; cb.style.top=(2*Y-q.top)+'px'; } }   /* a sheet that moves (transform) holds fixed things relative to itself */
  var later=function(){ requestAnimationFrame(function(){ requestAnimationFrame(place); }); };
  document.addEventListener('focusin',function(e){ if(clearable(e.target)){ if(cur&&cur!==e.target) cur.classList.remove('pvx-hasclr'); cur=e.target; } place(); later(); });
  document.addEventListener('focusout',function(){ setTimeout(place,0); });
  document.addEventListener('input',function(e){ if(e.target===cur) place(); });
  document.addEventListener('scroll',function(){ if(cur) place(); },{capture:true,passive:true});
  window.addEventListener('resize',function(){ if(cur) place(); });
  /* 3. while the touch keyboard is up */
  var TXT='input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]),textarea,[contenteditable="true"]';
  function kb(on){ var h=document.documentElement; if(h.classList.contains('pvx-kb')!==on){ h.classList.toggle('pvx-kb',on); later(); } }
  document.addEventListener('focusin',function(e){ var x=e.target; if(COARSE.matches&&x&&x.matches&&x.matches(TXT)) kb(true); });
  document.addEventListener('focusout',function(){ setTimeout(function(){ var a=document.activeElement; if(!(a&&a.matches&&a.matches(TXT))) kb(false); },80); });
  if(window.visualViewport){ visualViewport.addEventListener('scroll',function(){ if(cur) place(); },{passive:true});
    visualViewport.addEventListener('resize',function(){ var a=document.activeElement; if(!document.documentElement.classList.contains('pvx-kb')||!a||!a.getBoundingClientRect) return;
      var r=a.getBoundingClientRect(); if(r.bottom>visualViewport.height-8||r.top<0) try{ a.scrollIntoView({block:'center'}); }catch(x){} place(); }); }
})();