var PVX_MOVE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
try{
(function(){
  /* FL-05 — a <label> without for= names the one control in its field container */
  function assoc(root){ (root||document).querySelectorAll('.ap-field label:not([for]),.field label:not([for]),.fv-field label:not([for]),.rd-field label:not([for]),.ct-field label:not([for]),.intake-field label:not([for])').forEach(function(l){
      if(l.querySelector('input,select,textarea')) return; var box=l.parentElement; if(!box) return;
      var ctl=box.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),select,textarea'); if(ctl.length!==1) return;
      var c=ctl[0]; if(!c.id) c.id='pvxf_'+Math.random().toString(36).slice(2,8); l.htmlFor=c.id; }); }
  /* FL-06 — icon-only close buttons say what they are */
  function closes(root){ (root||document).querySelectorAll('button.close:not([aria-label]),button.drawer-close:not([aria-label])').forEach(function(b){ if(!b.textContent.trim()) b.setAttribute('aria-label','Close'); }); }
  function run(){ try{ assoc(); closes(); }catch(e){} }
  var t; pvxWatch(function(){ clearTimeout(t); t=setTimeout(run,120); },{childList:true,subtree:true},document.documentElement);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run(); window.addEventListener('load',run);
  /* FL-02 — Open: the name buttons bubble to the row/card handlers the app already has; Enter/Space on the button is a click */
  /* FL-02 — Move…: the same moves a drop would make, with the same confirmations (moveStatus / canDropRoom + moveRoom) */
  var menu=null, opener=null;
  function closeMenu(){ if(menu){ menu.remove(); menu=null; } document.removeEventListener('click',onDoc,true); if(opener) opener.setAttribute('aria-expanded','false'); if(opener&&opener.isConnected){ try{ opener.focus(); }catch(e){} } opener=null; }
  function onDoc(e){ if(menu&&!menu.contains(e.target)&&e.target!==opener) closeMenu(); }
  function openMenu(btn){ closeMenu(); var pid=btn.getAttribute('data-pid'), kind=btn.getAttribute('data-kind'); var p=(typeof PATIENTS!=='undefined'?PATIENTS:[]).find(function(x){ return x.id===pid; }); if(!p) return;
    var items=[], title='';
    if(kind==='stage'){ title='Move '+p.name+' to'; (typeof STAGE_ORDER!=='undefined'?STAGE_ORDER:[]).forEach(function(st){ if(st===p.status) return; items.push({label:st,act:function(){ moveStatus(p,st); }}); }); }
    else { title='Move '+p.name+' to'; var rooms=(typeof ROOMS!=='undefined'?ROOMS:[]).concat(['Treatment']); rooms.forEach(function(rm){ if(rm===p.room) return; var ok=canDropRoom(p,rm); items.push({label:rm+(ok?'':' · occupied'),disabled:!ok,act:function(){ if(rm==='Comfort Room') showConfirm('Move patient to Comfort Room?','Move patient',function(){ moveRoom(p,rm); }); else moveRoom(p,rm); }}); }); }
    menu=document.createElement('div'); menu.className='pvx-menu'; menu.setAttribute('role','menu'); menu.setAttribute('aria-label',title);
    menu.innerHTML='<div class="pvx-mt">'+title.replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; })+'</div>';
    items.forEach(function(it){ var b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem'); b.textContent=it.label; if(it.disabled) b.disabled=true; b.addEventListener('click',function(ev){ ev.stopPropagation(); var o=opener; closeMenu(); it.act(); }); menu.appendChild(b); });
    menu.addEventListener('keydown',function(ev){ var f=[].slice.call(menu.querySelectorAll('button:not([disabled])')), i=f.indexOf(document.activeElement);
      if(ev.key==='ArrowDown'){ ev.preventDefault(); (f[i+1]||f[0]).focus(); } else if(ev.key==='ArrowUp'){ ev.preventDefault(); (f[i-1]||f[f.length-1]).focus(); } else if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); closeMenu(); } else if(ev.key==='Tab'){ closeMenu(); } });
    document.body.appendChild(menu); opener=btn; btn.setAttribute('aria-expanded','true');   /* PVX-N206 */ var r=btn.getBoundingClientRect(); menu.style.left=Math.max(8,Math.min(r.left,innerWidth-menu.offsetWidth-8))+'px'; var top=r.bottom+6; if(top+menu.offsetHeight>innerHeight-8) top=Math.max(8,r.top-6-menu.offsetHeight); menu.style.top=top+'px';
    var first=menu.querySelector('button:not([disabled])'); if(first) first.focus(); setTimeout(function(){ document.addEventListener('click',onDoc,true); },0); }
  document.addEventListener('click',function(e){ var mv=e.target.closest&&e.target.closest('.pvx-move'); if(mv){ e.preventDefault(); e.stopPropagation(); openMenu(mv); return; } var op=e.target.closest&&e.target.closest('.pvx-open[data-loc]'); if(op){ e.stopPropagation(); if(typeof openLocDrawer==='function') openLocDrawer(op.getAttribute('data-loc')); } },true);
  /* the buttons sit inside draggable cards: a press-and-move still drags (the browser only clicks when the pointer stays put), so no drag guard is needed */
  window.pvxN133={openMenu:openMenu,closeMenu:closeMenu,assoc:assoc};
})();
}catch(e){setTimeout(function(){throw e})}
