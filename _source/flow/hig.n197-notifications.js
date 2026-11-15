/* PVX-N197 - notifications: failures stay; critical ultrasound findings reach the board; Reminder chime setting */
(function(){
  /* failures stay until dismissed (and are read at once) */
  var FAIL=/^(Not saved|Couldn[’']t |Could not |Prices not saved)/;
  if(typeof window.notify==='function'){ var nf=window.notify; window.notify=function(t,sub,o){ o=o||{}; if(FAIL.test(String(t||''))&&o.sticky===undefined) o=Object.assign({},o,{sticky:true}); return nf.call(this,t,sub,o); }; }

  /* critical ultrasound findings: card flag (usFlag), Attention Center until seen, a message when one arrives */
  function crit(p){ var u=p&&p.ultrasound; return !!(u&&u.criticalFinding&&!u.critSeenAt&&isActive(p)); }
  function safe(f){ try{ return f()||''; }catch(e){ return ''; } }
  function by(p){ var u=p.ultrasound; return (u.performingDoctor&&safe(function(){ return drName(u.performingDoctor); }))||'Internal Medicine'; }
  if(typeof window.attentionItems==='function'){ 
    pvxWrap('attentionItems',function(ai){ return function(){ var a=ai.apply(this,arguments);
      try{ PATIENTS.filter(crit).forEach(function(p){ a.unshift({key:'uscrit:'+p.id,sev:'red',icon:'flask',t:p.name+' — critical ultrasound finding',s:'Flagged by '+by(p)+' · '+safe(function(){ return docShort(p.doctor); }),p:p}); }); }catch(e){ console.warn('[uscrit]',e); }
      return a; }; },'n197'); }
  function markSeen(pid){ var p=PATIENTS.find(function(x){ return x.id===pid; }); if(!p||!p.ultrasound) return;
    var by=(typeof CURRENT_USER==='string'&&CURRENT_USER)||'Staff'; p.ultrasound.critSeenAt=new Date(); p.ultrasound.critSeenBy=by;
    try{ usTimeline(p,'Critical ultrasound finding seen',by); }catch(e){ (p.timeline=p.timeline||[]).push({label:'Critical ultrasound finding seen',at:new Date(),meta:by}); }
    try{ renderAll(); }catch(e){} notify('Marked seen',pvxEscQ(pvxFullName(p))+' · critical ultrasound finding',{icon:'check',color:'var(--s-admitted)'}); }
  window.pvxCritSeen=markSeen;
  if(typeof window.dismissAlert==='function'){ pvxWrap('dismissAlert',function(da){ return function(key){ if(String(key||'').indexOf('uscrit:')===0){ markSeen(String(key).slice(7)); return; } return da.apply(this,arguments); }; },'n197'); }
  function label(){ document.querySelectorAll('#attnList .attn-item[data-key^="uscrit:"]').forEach(function(it){
    var b=it.querySelector('.attn-clear'); if(b){ b.setAttribute('aria-label','Mark seen'); b.title='Mark seen'; }
    var g=it.querySelector('.overdue-badge'); if(g){ g.setAttribute('aria-label','Critical'); var tx=g.querySelector('.overdue-text'); if(tx&&tx.textContent!=='CRITICAL') tx.textContent='CRITICAL'; } }); }   /* a finding, not a wait */
  if(typeof window.renderAttention==='function'){ pvxAfter('renderAttention',function(){ label(); },'n197'); }
  var announced=null, BOOT=Date.now();
  function sweep(){
    try{ label();
      var now=PATIENTS.filter(crit).map(function(p){ return p.id; });
      if(announced===null||Date.now()-BOOT<8000){ announced=new Set(now); return; }   /* at start-up the board and Attention Center show them */
      var tv=document.body.classList.contains('tv-mode'), us=(typeof currentApp!=='undefined'&&currentApp==='ultrasound');
      now.forEach(function(id){ if(announced.has(id)) return; announced.add(id); if(tv||us) return;
        var p=PATIENTS.find(function(x){ return x.id===id; }), fb=by(p);
        var o={icon:'info',color:'var(--priority-p1)',sticky:true};
        if(typeof window.fvNotifyAct==='function') fvNotifyAct('Critical ultrasound finding',pvxEscQ(pvxFullName(p))+' · flagged by '+pvxEscQ(fb),'Open',function(){ openDrawer(id); },o);
        else notify('Critical ultrasound finding',pvxEscQ(pvxFullName(p))+' · flagged by '+pvxEscQ(fb),o);
        if(window.pvxSay) pvxSay('Critical ultrasound finding: '+pvxFullName(p)+', flagged by '+fb); });
    }catch(e){}
  }
  if(typeof window.renderAll==='function'){ pvxAfter('renderAll',function(){ setTimeout(sweep,0); },'n197'); }
  setInterval(sweep,3000);

  /* Operations > Reminder chime, per screen */
  var K='pvx:sound:reminder';
  function on(){ try{ return localStorage.getItem(K)!=='off'; }catch(e){ return true; } }
  function paint(){ var b=document.getElementById('opsChime'), s2=document.getElementById('opsChimeS'); if(!b) return; var v=on(); b.setAttribute('aria-checked',String(v)); if(s2) s2.textContent=(v?'On':'Off')+' · this screen'; }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#opsChime'); if(!b) return; e.preventDefault(); e.stopPropagation();
    try{ localStorage.setItem(K,on()?'off':'on'); }catch(x){} paint(); if(window.pvxSay) pvxSay('Reminder chime '+(on()?'on':'off')+' on this screen. A new critical case always chimes.'); },true);
  paint();
})();