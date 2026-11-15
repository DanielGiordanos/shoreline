/* PVX-N254 - Flow and Rounds read Yakuri: Rounds medications link to it; the drawer lists the owner's medications from intake as
   Yakuri drugs and runs Yakuri's own interaction check (see patch_n254.py) */
(function(){ if(!window.PvxYakuri) return;
  window.pvxYkLink=function(name,html){ return PvxYakuri.ready()?PvxYakuri.link(name,html):html; };
  function tokens(text){ return String(text||'').split(/[,;\n\/+]|\band\b|\bwith\b/i).map(function(x){ return x.trim(); }).filter(Boolean); }
  function panel(p){
    var mount=document.getElementById('intakeCardMount'); if(!mount) return; var old=document.getElementById('pvxYkMeds');
    var meds=p&&p.intake&&p.intake.medications&&String(p.intake.medications).trim();
    if(!meds||!PvxYakuri.ready()){ if(old) old.remove(); return; }
    var ds=PvxYakuri.matchAll(meds), miss=tokens(meds).filter(function(x){ return !PvxYakuri.match(x) && !/^(none|no|n\/a|na)$/i.test(x); });
    if(!ds.length&&!miss.length){ if(old) old.remove(); return; }
    var h='<div class="t">Owner’s medications · Yakuri</div><div class="l">'+(ds.length?ds.map(function(d){ return PvxYakuri.link(d); }).join(' · '):'')
      +(miss.length?'<span class="u">Not found in Yakuri: '+pvxEsc(miss.join(', '))+'</span>':'')+'</div>'
      +(ds.length>=2?'<button type="button" data-ykint>Check interactions</button><div class="r" hidden></div>':'');
    var el=old||document.createElement('div'); el.id='pvxYkMeds'; el.className='pvx-ykmeds'; el.setAttribute('data-pid',String(p.id)); el.innerHTML=h;
    if(!old) mount.parentNode.insertBefore(el,mount.nextSibling);
    var b=el.querySelector('[data-ykint]'); if(b) b.onclick=function(){ check(p,ds,el); };
  }
  function check(p,ds,el){ var r=el.querySelector('.r'), sp=PvxYakuri.species(p.species);
    r.hidden=false; if(!sp){ r.innerHTML='<div class="sc">Yakuri’s interaction check covers dogs and cats.</div>'; return; }
    r.innerHTML='<div class="sc">Checking in Yakuri…</div>';
    PvxYakuri.interactions(ds,sp).then(function(x){
      r.innerHTML=(x.pairs||[]).map(function(q){ return '<div class="pr"><b>'+pvxEsc(q.names.join(' + '))+'</b> · '+pvxEsc(q.classification)+'<br><i>'+pvxEsc(q.summary)+'</i></div>'; }).join('')
        +'<div class="sc">'+pvxEsc(x.scope||'')+' Yakuri has no clinical approval yet.</div>';
    }).catch(function(e){ r.innerHTML='<div class="sc">'+pvxEsc((e&&e.message)||'Yakuri’s check didn’t run.')+'</div>'; });
  }
  if(typeof fillDrawer==='function'){ pvxAfter('fillDrawer',function(p){ try{ panel(p); }catch(e){ console.warn('[yakuri meds]',e); } },'n254-yakuri'); }
  PvxYakuri.onReady(function(){ try{ renderAll(); }catch(e){} try{ if(activePatient){ var p=PATIENTS.find(function(x){ return x.id===activePatient; }); if(p) fillDrawer(p); } }catch(e){} });
  function start(){ try{ if(typeof LOBBY!=='undefined'&&LOBBY) return; if(typeof Backend!=='undefined'&&Backend.mode&&Backend.mode!=='staff') return; }catch(e){} PvxYakuri.load().catch(function(){}); }
  setTimeout(start,6000);
})();