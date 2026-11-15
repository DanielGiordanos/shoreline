/* PVX-N380 - Flow's own inline handlers, as listeners (the page's policy runs no inline handler) */
(function(){
  function on(id,ev,fn){ var el=typeof id==='string'?document.getElementById(id):id; if(el) el.addEventListener(ev,fn); }
  on('logoutBtn','click',function(){ logout(); });
  on(document.querySelector('.theme-toggle'),'click',function(){ toggleDark(); });
  on('ctScrim','click',function(){ closeCareTeam(); });
  on('ctClose','click',function(){ closeCareTeam(); });
  on('ctModal','keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); closeCareTeam(); } });
  /* the care team's buttons are drawn again and again: the first listener to hear a click arms the button itself for it,
     so the action runs on the button, in its turn, exactly as its onclick did (and can stop the click there) */
  function act(b,e){
    if(b.hasAttribute('data-ct-open')){ e.stopPropagation(); openCareTeam(b.getAttribute('data-ct-open')); return; }
    if(b.hasAttribute('data-ct-form')){ ctShowForm(b.getAttribute('data-ct-form')); return; }
    var d=b.getAttribute('data-ct-do'), id=b.getAttribute('data-ct-id');
    if(d==='confirm'){ ctConfirm(ctPatient(),id); renderCareTeam(); }
    else if(d==='decline'){ ctDecline(ctPatient(),id); renderCareTeam(); }
    else if(d==='end'){ ctEnd(ctPatient(),id); renderCareTeam(); }
    else if(d==='cancel'){ ctFormRole=null; renderCareTeam(); }
    else if(d==='submit'){ ctFormSubmit(); }
  }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-ct-open],[data-ct-form],[data-ct-do]'); if(!b||b.__pvxEv===e) return;
    b.__pvxEv=e; b.addEventListener('click',function(ev){ if(ev===e) act(b,ev); },{once:true}); },true);
  document.addEventListener('change',function(e){ var t=e.target; if(!t||!t.id) return;
    if(t.id==='ctFormRoleSel') ctShowForm(t.value);
    else if(t.id==='ctFormWho'){ var w=document.getElementById('ctFormManualWrap'); if(w) w.hidden=t.value!=='__manual'; } });
})();