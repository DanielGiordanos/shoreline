/* PVX-N253 - only doctors, liaisons and management admit (see patch_n253.py) */
(function(){
  var role=null, WHO='Doctors, liaisons and management admit';
  function lists(){ var d=[], l=[];
    try{ d=d.concat(typeof DOCTOR_NAMES!=='undefined'?DOCTOR_NAMES:[]); }catch(e){}
    try{ d=d.concat((typeof IM_DOCTORS!=='undefined'?IM_DOCTORS:[]).map(function(x){ return x.name; })); }catch(e){}
    try{ l=l.concat(typeof LIAISON_NAMES!=='undefined'?LIAISON_NAMES:[]); }catch(e){}
    return {doctors:d, liaisons:l}; }
  window.pvxCanAdmit=function(){ try{ if(typeof IS_ADMIN!=='undefined'&&IS_ADMIN) return true; }catch(e){} return !!(window.PvxRoles&&PvxRoles.canAdmit(role)); };
  window.pvxAdmitRole=function(){ return role; };
  window.pvxAdmitDenied=function(){ try{ notify(WHO,'Ask a doctor, liaison or manager to admit this patient',{icon:'info',color:'var(--accent)'}); }catch(e){} };
  function apply(){ var ok=pvxCanAdmit();
    var c=document.querySelector('#dispActions .disposition-card.admit');
    if(c){ if(ok) c.removeAttribute('disabled'); else c.setAttribute('disabled',''); c.setAttribute('aria-disabled',String(!ok)); c.classList.toggle('pvx-locked',!ok);
      var body=c.querySelector('.dc-body'), n=c.querySelector('.dc-note.pvx-lock');
      if(!ok&&body&&!n){ n=document.createElement('span'); n.className='dc-note pvx-lock'; n.textContent='Doctors, liaisons and management'; body.appendChild(n); }
      if(ok&&n) n.remove(); c.title=ok?'':WHO; }
    var b=document.querySelector('#apArrival [data-arrival="hospitalized"]');
    if(b){ b.classList.toggle('pvx-locked',!ok); if(ok){ b.removeAttribute('aria-disabled'); b.title=''; } else { b.setAttribute('aria-disabled','true'); b.title=WHO; } } }
  window.pvxAdmitApply=apply;
  function refresh(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    if(!u||!window.PvxRoles){ role=null; apply(); return; }
    var nm=''; try{ nm=(typeof CURRENT_USER==='string'&&CURRENT_USER)||u.displayName||''; }catch(e){}
    PvxRoles.resolve(u.email,nm,lists()).then(function(r){ role=r; apply(); }); }
  window.pvxAdmitRefresh=refresh;
  try{ if(AUTH&&AUTH.onAuthStateChanged) AUTH.onAuthStateChanged(function(){ setTimeout(refresh,0); }); }catch(e){}
  setTimeout(refresh,0);
  if(typeof fillDrawer==='function'){ pvxAfter('fillDrawer',function(){ try{ apply(); }catch(e){} },'n253-admit'); }
  if(typeof openAddPatient==='function'){ pvxAfter('openAddPatient',function(){ try{ apply(); }catch(e){} },'n253-admit'); }
  /* the arrival chip: a click on Direct admit is refused (it is not a real disabled button, so the others keep their keyboard order) */
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#apArrival [data-arrival="hospitalized"]');
    if(b&&!pvxCanAdmit()){ e.stopImmediatePropagation(); e.preventDefault(); pvxAdmitDenied(); } },true);
  if(typeof openDispConfirm==='function'){ pvxWrap('openDispConfirm',function(od){ return function(kind){ if(kind==='admit'&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }
    var r=od.apply(this,arguments); try{ var cf=document.getElementById('dispConfirm'); if(cf&&typeof activePatient!=='undefined') cf.setAttribute('data-pid',String(activePatient)); }catch(e){} return r; }; },'n253-admit'); }
  /* a board refresh (any change on any screen) no longer closes an open Admit / Discharge confirmation or the "Admitting…" state */
  if(typeof renderDisposition==='function'){ pvxWrap('renderDisposition',function(rdp){ return function(p){ try{ var cf=document.getElementById('dispConfirm');
    if(p&&cf&&!isCompleted(p)&&((typeof _dispBusy!=='undefined'&&_dispBusy)||(cf.querySelector('.confirmation')&&cf.getAttribute('data-pid')===String(p.id)))){ apply(); return; } }catch(e){}
    return rdp.apply(this,arguments); }; },'n253-admit'); }
  if(typeof submitDisp==='function'){ pvxWrap('submitDisp',function(sd){ return function(kind){ if(kind==='admit'&&!pvxCanAdmit()){ pvxAdmitDenied(); try{ closeDispConfirm(); }catch(e){} return; } return sd.apply(this,arguments); }; },'n253-admit'); }
  if(typeof moveStatus==='function'){ pvxWrap('moveStatus',function(ms){ return function(p,st){ if(st==='Admitted'&&!pvxCanAdmit()){ pvxAdmitDenied(); try{ renderAll(); }catch(e){} return; } return ms.apply(this,arguments); }; },'n253-admit'); }
})();