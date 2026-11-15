/* PVX-N212 - search fields (HIG Search fields) */
(function(){
  var inp=document.getElementById('globalSearch'), box=document.getElementById('searchResults'); if(!inp||!box) return;
  var CW=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false};
  /* 1. the placeholder fits the width */
  var PH=['Search patients, doctors, rooms','Search patients, doctors','Search patients','Search'], cv;   /* PVX-N361: the longest whole phrase that fits */
  function ph(){ var cs=getComputedStyle(inp), room=inp.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);
    if(!(room>0)){ inp.placeholder=CW.matches?PH[2]:PH[0]; return; }
    try{ cv=cv||document.createElement('canvas').getContext('2d'); cv.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily; }catch(e){ cv=null; }
    var pick=PH[3]; if(cv){ for(var k=0;k<PH.length;k++){ if(cv.measureText(PH[k]).width<=room-2){ pick=PH[k]; break; } } }
    if(inp.placeholder!==pick) inp.placeholder=pick; }
  try{ if(window.ResizeObserver) new ResizeObserver(function(){ ph(); }).observe(inp); }catch(e){}
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(ph);
  ph(); if(CW.addEventListener) CW.addEventListener('change',ph);
  /* 2. Clear */
  var X='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".32"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  function clearer(field){ var bar=field&&field.closest('.search-bar'); if(!bar||bar.querySelector('.pvx-sclear')) return;
    var b=document.createElement('button'); b.type='button'; b.className='pvx-sclear'; b.setAttribute('aria-label','Clear search'); b.title='Clear'; b.innerHTML=X;
    field.parentNode.insertBefore(b,field.nextSibling);   /* right after the text, before the mic */
    function sync(){ bar.classList.toggle('pvx-has',!!field.value); }
    ['input','keyup','change','blur','focus'].forEach(function(k){ field.addEventListener(k,sync); });
    b.addEventListener('mousedown',function(e){ e.preventDefault(); });   /* keep the field focused */
    b.addEventListener('click',function(){ field.value=''; field.dispatchEvent(new Event('input',{bubbles:true})); sync(); try{ field.focus({preventScroll:true}); }catch(e){ field.focus(); } });
    sync(); }
  clearer(inp); clearer(document.getElementById('rdSearch'));
  /* 6. best match first */
  if(typeof searchIndex==='function'){ pvxWrap('searchIndex',function(si){ return function(q){ var r=si.apply(this,arguments), ql=String(q||'').trim().toLowerCase();
    function rank(x){ var t=String(x.title||'').toLowerCase(); if(t.indexOf(ql)===0) return 0; if(t.split(/[\s.\-']+/).some(function(w){ return w.indexOf(ql)===0; })) return 1; return 2; }
    return r.map(function(x,i){ return {x:x,i:i,k:rank(x)}; }).sort(function(a,b){ return a.k-b.k||a.i-b.i; }).map(function(o){ return o.x; }); }; },'#54'); }
  /* 3. recent patients, in memory only (this tab), never stored */
  var RECENT=[];
  window.pvxRecent={clear:function(){ RECENT=[]; }, list:function(){ return RECENT.slice(); }};   /* PVX-N349 */
  if(typeof openDrawer==='function'){ pvxAfter('openDrawer',function(pid){ try{ RECENT=[pid].concat(RECENT.filter(function(x){ return x!==pid; })).slice(0,5); }catch(e){} },'#54'); }
  function showRecent(){ if(document.activeElement!==inp||inp.value.trim()) return;
    var ps=RECENT.map(function(id){ return PATIENTS.find(function(p){ return p.id===id; }); }).filter(Boolean);
    var html='', flat=[];
    if(ps.length){ html+='<div class="sr-group"><div class="sr-label">Recent</div>';
      ps.forEach(function(p,i){ var st=(typeof STATUSES!=='undefined'&&STATUSES[p.status])||{};
        flat.push({kind:'Patient',act:function(){ closeSearch(); openDrawer(p.id); }});
        html+='<div class="sr-item" data-i="'+i+'"><span class="sr-ic" style="background:'+(st.color||'var(--accent)')+'">'+pvxEsc(typeof initials==='function'?initials(p):'')+'</span><div class="sr-main"><div class="sr-t">'+pvxEsc((p.name||'')+' '+(p.last||''))+'</div><div class="sr-s">'+pvxEsc([p.species,p.room,p.hid].filter(Boolean).join(' · '))+'</div></div><div class="sr-kind">Patient</div></div>'; });
      html+='</div>'; }
    var ex=(ps[0]&&ps[0].name)||'Bella';
    html+='<div class="sr-hint">Or type a command, like <b>“move '+pvxEsc(ex)+' to Exam”</b></div>';
    box.innerHTML='<div class="sr-inner">'+html+'</div>'; box.classList.add('open'); try{ positionSearchResults(); }catch(e){}
    searchFlat=flat; searchHl=-1;
    box.querySelectorAll('.sr-item').forEach(function(n){ n.onclick=function(){ var r=searchFlat[+n.dataset.i]; if(r) r.act(); }; });
    deco(); }
  if(typeof renderSearch==='function'){ pvxWrap('renderSearch',function(rs){ return function(q){ if(!String(q||'').trim()&&document.activeElement===inp){ showRecent(); return; } return rs.apply(this,arguments); }; },'#54'); }
  inp.addEventListener('focus',function(){ if(!inp.value.trim()) setTimeout(showRecent,0); });
  /* 5. combobox semantics */
  box.setAttribute('role','listbox'); box.setAttribute('aria-label','Search results');
  var live=document.createElement('div'); live.id='srLive'; live.className='pvx-vh'; live.setAttribute('role','status'); document.body.appendChild(live);
  var said='', st=0;
  function deco(){
    var open=box.classList.contains('open'); inp.setAttribute('aria-expanded',open?'true':'false');
    [].forEach.call(box.querySelectorAll('.sr-group'),function(g,gi){ g.setAttribute('role','group'); var l=g.querySelector('.sr-label'); if(l){ l.id='srG'+gi; l.setAttribute('role','presentation'); g.setAttribute('aria-labelledby',l.id); } });
    [].forEach.call(box.querySelectorAll('.sr-inner'),function(x){ x.setAttribute('role','presentation'); });
    var items=box.querySelectorAll('.sr-item');
    [].forEach.call(items,function(n,i){ n.id='srOpt'+i; n.setAttribute('role','option'); n.setAttribute('aria-selected',n.classList.contains('hl')?'true':'false'); });
    [].forEach.call(box.querySelectorAll('.fv-cmd'),function(n,i){ n.id='srCmd'+i; n.setAttribute('role','option'); n.setAttribute('aria-selected',n.classList.contains('ready')?'true':'false'); });
    [].forEach.call(box.querySelectorAll('.sr-none,.sr-hint'),function(n){ n.setAttribute('role','presentation'); });
    var hl=box.querySelector('.sr-item.hl'); if(hl) inp.setAttribute('aria-activedescendant',hl.id); else inp.removeAttribute('aria-activedescendant');
    /* say the count once, after typing settles */
    clearTimeout(st); st=setTimeout(function(){ if(!open||!inp.value.trim()){ said=''; return; }
      var cmd=box.querySelector('.fv-cmd.ready .sr-t'), n=items.length, msg=cmd?('Command: '+cmd.textContent.replace(/\s+/g,' ').trim()+'. Press Return.'):n?(n+' result'+(n===1?'':'s')):'No results';
      if(msg!==said){ said=msg; live.textContent=''; setTimeout(function(){ live.textContent=msg; },40); } },600);
  }
  new MutationObserver(deco).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  deco();
})();
/* PVX-N212 - compact width: Flow's sections as a bottom tab bar (HIG Tab bars) */
(function(){
  var CW=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false}, sub=document.getElementById('subnavFlow'); if(!sub) return;
  function on(){ return CW.matches&&!sub.classList.contains('hidden')&&getComputedStyle(sub).display!=='none'; }
  /* Client Display is the lobby TV: in compact width it's offered in the + menu instead of a tab */
  var item=document.createElement('button'); item.className='ops-item pvx-op-client'; item.dataset.op='client'; item.setAttribute('role','menuitem');
  item.innerHTML='<span class="ops-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span><span class="ops-txt"><span class="ops-t">Show Client Display</span><span class="ops-s">The lobby TV view</span></span>';
  function sync(){ var t=on(); document.documentElement.classList.toggle('pvx-tabbar',t);
    var menu=document.getElementById('opsMenu'), sep=menu&&menu.querySelector('.ops-sep');
    if(t&&menu&&!item.isConnected) menu.insertBefore(item,sep||null); else if(!t&&item.isConnected) item.remove(); }
  if(CW.addEventListener) CW.addEventListener('change',sync);
  new MutationObserver(sync).observe(sub,{attributes:true,attributeFilter:['class','style']});
  window.addEventListener('resize',sync); sync(); setTimeout(sync,500);
  if(typeof opsAction==='function'){ pvxWrap('opsAction',function(oa){ return function(op){ if(op==='client'){ opsMenuClose(); switchView('client'); return; } return oa.apply(this,arguments); }; },'#54'); }
})();