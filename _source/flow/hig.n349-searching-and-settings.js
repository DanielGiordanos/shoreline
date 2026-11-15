/* PVX-N349 - HIG Searching + Settings.
   Searching: say what the list and board are filtered by, and let it be cleared there; suggest the closest name for a typo;
   show why a patient matched (owner, reason); a typed ID filters the list too; "p1", "critical" or a stage name offers that filter; Recent can be cleared.
   Settings: Talk to Flow on or off per screen in the + menu, beside Reminder chime. */
(function(){
  var inp=document.getElementById('globalSearch'); if(!inp) return;
  function q(){ try{ return String(searchQ||''); }catch(e){ return ''; } }
  function clearSearch(){ inp.value=''; inp.dispatchEvent(new Event('input',{bubbles:true})); try{ closeSearch(); }catch(e){} }
  /* 1. the scope: "Matching “mil” · 1 of 9 · Clear search" under the Patients and Flow titles */
  function scopeEl(view){ var h=document.querySelector('#view-'+view+' .view-head > div'); if(!h) return null; var s=h.querySelector('.pvx-scope');
    if(!s){ s=document.createElement('div'); s.className='pvx-scope'; s.setAttribute('role','status'); h.appendChild(s);
      s.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return;
        if(b.dataset.fix){ inp.value=b.dataset.fix; inp.dispatchEvent(new Event('input',{bubbles:true})); try{ closeSearch(); }catch(x){} var nb=s.querySelector('button'); if(nb) nb.focus(); return; }
        clearSearch(); try{ var h1=document.querySelector('#view-'+view+' h1'); if(h1){ h1.tabIndex=-1; h1.focus(); } }catch(x){} }); }
    return s; }
  function scope(){ var t=q().trim(); var all=0; try{ all=PATIENTS.filter(isActive).length; }catch(e){}
    var n=0; try{ n=(typeof pvxBoardFiltered==='function'?pvxBoardFiltered():filtered()).filter(isActive).length; }catch(e){}
    ['list','flow'].forEach(function(v){ var s=scopeEl(v); if(!s) return; s.classList.toggle('on',!!t);
      var fix=(t&&!n)?correct(t):'';
      var html=t?'Matching <b>“'+pvxEsc(t)+'”</b>'+(v==='flow'?' · '+n+' of '+all:'')+(fix?'<button type="button" data-fix="'+pvxEsc(fix)+'">Search “'+pvxEsc(fix)+'”</button>':'')+'<button type="button" data-clear="1">Clear search</button>':'';
      if(s.__h!==html){ s.__h=html; s.innerHTML=html; } }); }
  if(typeof renderTable==='function'){ pvxAfter('renderTable',function(){ 
    try{ var rc=document.getElementById('resCount'); if(rc){ var m=/^(\d+)/.exec(rc.textContent); if(m) rc.textContent=m[1]+(+m[1]===1?' patient':' patients'); } }catch(e){}
    scope(); },'n349'); }
  if(typeof renderBoard==='function'){ pvxAfter('renderBoard',function(){ scope(); },'n349'); }
  /* 2. why it matched, and filters, in search */
  var STAGES=(typeof FLOW_COLS!=='undefined'?FLOW_COLS:[]);
  function lc(s){ return String(s||'').toLowerCase(); }
  if(typeof searchIndex==='function'){
    pvxWrap('searchIndex',function(si){ return function(qq){ var r=si.apply(this,arguments), t=lc(qq).trim(); if(!t) return r;
      try{ r.forEach(function(x){ if(x.kind!=='Patient'||x.__why) return; var p=PATIENTS.find(function(pp){ return (pp.name+' '+pp.last)===x.title; }); if(!p) return;
          var named=lc([p.name,p.last,p.room,p.status].join(' ')).indexOf(t)>-1; if(named) return;
          var why=lc(p.owner).indexOf(t)>-1?'Owner '+p.owner:lc(p.reason).indexOf(t)>-1?p.reason:'';
          if(why){ x.sub=why+' · '+x.sub; x.__why=1; } }); }catch(e){}
      try{ var act=PATIENTS.filter(isActive);
        var pm=/^(?:p\s?([123])|priority\s?([123])|(crit(?:i(?:c(?:a(?:l)?)?)?)?)|(urgent|urge|urg)|(stable|stab|sta))$/.exec(t);
        if(pm){ var lv=+(pm[1]||pm[2]||(pm[3]?1:pm[4]?2:3)); var n=act.filter(function(p){ return Number(p.prio)===lv; }).length;
          r.unshift({kind:'Filter',icon:true,color:'var(--priority-p'+lv+')',svg:'<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',title:'P'+lv+' · '+PRIO_LABEL[lv]+' patients',sub:(n===1?'1 patient':n+' patients')+' · Patients list',
            act:function(){ try{ closeSearch(); }catch(e){} clearSearch(); filters={status:null,prio:lv,doctor:null,liaison:null}; switchView('list'); renderFilterBar(); renderTable(); }}); }
        if(t.length>=3) STAGES.forEach(function(s){ if(lc(s).indexOf(t)!==0) return; var n=act.filter(function(p){ return p.status===s; }).length;
          r.unshift({kind:'Filter',icon:true,color:(STATUSES[s]&&STATUSES[s].color)||'var(--accent)',svg:'<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',title:'All patients in '+s,sub:(n===1?'1 patient':n+' patients')+' · Patients list',
            act:function(){ try{ closeSearch(); }catch(e){} clearSearch(); filters={status:s,prio:null,doctor:null,liaison:null}; switchView('list'); renderFilterBar(); renderTable(); }}); }); }catch(e){}
      return r; }; },'n349');
  }
  /* 3. a typo: show the closest name ("No matches for “Bela”. Showing Bella.") */
  function dl(a,b){ var m=a.length,n=b.length,d=[],i,j; for(i=0;i<=m;i++){ d[i]=[i]; } for(j=0;j<=n;j++) d[0][j]=j;
    for(i=1;i<=m;i++) for(j=1;j<=n;j++){ var c=a[i-1]===b[j-1]?0:1; d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c); if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1); }
    return d[m][n]; }
  function correct(t){ t=lc(t).trim(); if(t.length<3||/\s/.test(t)||/^\d/.test(t)) return '';
    var words=[]; try{ PATIENTS.filter(isActive).forEach(function(p){ words.push(p.name,p.last); }); DOCTORS.forEach(function(d){ String(d.name).replace(/^Dr\.?\s*/,'').split(/\s+/).forEach(function(w){ words.push(w); }); }); }catch(e){}
    var best='', bd=9, lim=t.length>=6?2:1;
    words.forEach(function(w){ var lw=lc(w); if(!lw||lw.length<3) return; var d=Math.min(dl(t,lw), lw.length>t.length?dl(t,lw.slice(0,t.length)):9, lw.length>t.length?dl(t,lw.slice(0,t.length+1)):9);
      if(d<=lim&&d<bd){ bd=d; best=w; } });
    return best; }
  if(typeof renderSearch==='function'){
    pvxWrap('renderSearch',function(rs){ return function(qq){ var t=String(qq||'').trim();
      if(t&&!searchIndex(t).length){ var c=correct(t); if(c&&searchIndex(c).length){ var r=rs.call(this,c);
          var box=document.getElementById('searchResults'), inr=box&&box.querySelector('.sr-inner');
          if(inr){ inr.insertAdjacentHTML('afterbegin','<div class="sr-hint pvx-dym" role="status">No matches for “'+pvxEsc(t)+'”. Showing <b>'+pvxEsc(c)+'</b>.</div>'); }
          return r; } }
      return rs.apply(this,arguments); }; },'n349');
  }
  /* 4. Recent can be cleared (it lives only in this tab, and goes when someone signs out) */
  var box=document.getElementById('searchResults');
  if(box){
    new MutationObserver(function(){ var lab=[].slice.call(box.querySelectorAll('.sr-label')).filter(function(l){ return l.textContent==='Recent'; })[0];
      if(lab&&!(lab.nextElementSibling&&lab.nextElementSibling.classList.contains('pvx-rclear'))){ var b=document.createElement('button'); b.type='button'; b.className='pvx-rclear'; b.textContent='Clear'; b.setAttribute('aria-label','Clear recent patients'); lab.insertAdjacentElement('afterend',b); } })
      .observe(box,{childList:true,subtree:true});
    box.addEventListener('mousedown',function(e){ if(e.target.closest('.pvx-rclear')) e.preventDefault(); },true);
    box.addEventListener('click',function(e){ if(!e.target.closest('.pvx-rclear')) return; e.preventDefault(); e.stopPropagation();
      window.__pvxRecentClear=(window.__pvxRecentClear||0)+1; try{ if(window.pvxRecent) pvxRecent.clear(); }catch(x){}
      var g=e.target.closest('.sr-group'); if(g) g.remove(); try{ searchFlat=[]; searchHl=-1; }catch(x){} try{ inp.focus(); }catch(x){}
      try{ if(window.pvxSay) pvxSay('Recent patients cleared'); }catch(x){} },true);
  }
  if(typeof logout==='function'){ pvxBefore('logout',function(){ try{ if(window.pvxRecent) pvxRecent.clear(); }catch(e){} },'n349'); }
  /* 5. Settings: Talk to Flow on this screen */
  function vpaint(){ var b=document.getElementById('opsVoice'), s=document.getElementById('opsVoiceS'); if(!b) return; var V=window.pvxVoice;
    var can=!!(V&&V.can())&&!document.body.classList.contains('client-mode'); b.hidden=!can; if(!can) return; var on=V.on();
    b.setAttribute('aria-checked',String(on)); if(s) s.textContent=(on?'On':'Off')+' · this screen'; }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#opsVoice'); if(!b||!window.pvxVoice) return; e.preventDefault(); e.stopPropagation();
    var on=pvxVoice.set(!pvxVoice.on()); vpaint(); try{ if(window.pvxSay) pvxSay('Talk to Flow '+(on?'on':'off')+' on this screen.'); }catch(x){} },true);
  var fab=document.getElementById('fabAdd'); if(fab) fab.addEventListener('click',vpaint,true); setTimeout(vpaint,0);
})();