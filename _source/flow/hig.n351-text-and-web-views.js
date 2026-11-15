/* PVX-N351 - HIG Text views + Web views.
   1. The hospital alert's public message and staff note, the triage intake's history and notes, and the ultrasound request's question and
      findings grow to show everything typed (they were fixed 2-line or short boxes that scrolled inside), up to 40% of the window.
   2. Back and Forward: opening a patient or a room is a step. The browser's Back (or Android's back gesture in the Home Screen app)
      closes it instead of leaving Flow, and Forward opens it again. Closing it with ✕ or Esc takes the step away. */
(function(){
  /* 1. text views that grow */
  var SEL='#alertMessage,#alertNote,#intakeModal .ik-area,#usCQ,#usDx';
  function fit(t){ if(!t||!t.isConnected||!t.offsetParent) return; t.classList.add('pvx-grow');
    var cs=getComputedStyle(t), b=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0), max=Math.round((window.innerHeight||800)*0.4);
    t.style.height='auto'; var need=t.scrollHeight+b, h=Math.min(need,max); t.style.height=h+'px'; t.classList.toggle('pvx-grow-max',need>max); }
  function fitAll(){ [].forEach.call(document.querySelectorAll(SEL),fit); }
  window.pvxFitText=fitAll;
  document.addEventListener('input',function(e){ if(e.target&&e.target.matches&&e.target.matches(SEL)) fit(e.target); },true);
  document.addEventListener('focusin',function(e){ if(e.target&&e.target.matches&&e.target.matches(SEL)) fit(e.target); },true);
  window.addEventListener('resize',function(){ fitAll(); });
  ['openAlertModal','openIntake','openUltrasoundRequest','openTriageEdit'].forEach(function(n){ if(typeof window[n]!=='function') return;
    pvxWrap(n,function(f){ return function(){ var r=f.apply(this,arguments); requestAnimationFrame(fitAll); setTimeout(fitAll,350); return r; }; },'n351'); });

  /* 2. Back and Forward */
  if(!window.history||!history.pushState) return;
  var PANELS={drawer:{el:'drawer',id:function(){ try{ return activePatient; }catch(e){ return null; } },open:function(id){ openDrawer(id); },close:function(){ closeDrawer(); }},
              loc:{el:'locDrawer',id:function(){ try{ return activeLoc; }catch(e){ return null; } },open:function(id){ openLocDrawer(id); },close:function(){ closeLocDrawer(); }}};
  var fromPop=0, pend=null;
  function isOpen(k){ var e=document.getElementById(PANELS[k].el); return !!(e&&e.classList.contains('open')); }
  function lobby(){ var b=document.body.classList; return b.contains('tv-mode')||b.contains('client-mode')||/[?&](tv|display|lobby)=?/.test(location.search); }
  function st(){ return history.state&&history.state.pvxPanel?history.state:null; }
  function opened(k){ if(fromPop||lobby()) return; var id=PANELS[k].id(); if(id==null) return;
    var s={pvxPanel:k,id:id};
    if(pend){ clearTimeout(pend); pend=null; }
    var cur=st(); if(cur){ history.replaceState(s,''); } else history.pushState(s,''); }
  function closed(k){ if(fromPop) return; var cur=st(); if(!cur||cur.pvxPanel!==k) return;
    clearTimeout(pend); pend=setTimeout(function(){ pend=null; var c=st(); if(c&&c.pvxPanel===k&&!isOpen(k)) history.back(); },80); }
  Object.keys(PANELS).forEach(function(k){ var el=document.getElementById(PANELS[k].el); if(!el) return; var was=el.classList.contains('open');
    new MutationObserver(function(){ var now=el.classList.contains('open'); if(now===was){ if(now){ var c=st(); var id=PANELS[k].id(); if(c&&c.pvxPanel===k&&id!=null&&c.id!==id&&!fromPop) history.replaceState({pvxPanel:k,id:id},''); } return; }
      was=now; if(now) opened(k); else closed(k); }).observe(el,{attributes:true,attributeFilter:['class']});
    if(was) opened(k); });
  /* a different patient in the open drawer updates the step */
  if(typeof window.openDrawer==='function'){ pvxAfter('openDrawer',function(pid){ try{ var c=st(); if(!fromPop&&c&&c.pvxPanel==='drawer'&&c.id!==pid&&isOpen('drawer')) history.replaceState({pvxPanel:'drawer',id:pid},''); }catch(e){} },'n351'); }
  window.addEventListener('popstate',function(e){ var s=e.state&&e.state.pvxPanel?e.state:null; if(pend){ clearTimeout(pend); pend=null; }
    fromPop++; try{
      Object.keys(PANELS).forEach(function(k){ if(isOpen(k)&&(!s||s.pvxPanel!==k)) PANELS[k].close(); });
      if(s&&PANELS[s.pvxPanel]&&!isOpen(s.pvxPanel)){ var ok=true; if(s.pvxPanel==='drawer'){ try{ ok=!!PATIENTS.find(function(x){ return x.id===s.id; }); }catch(x){ ok=false; } }
        if(ok) PANELS[s.pvxPanel].open(s.id); }
    } finally { setTimeout(function(){ fromPop--; },0); } });
})();