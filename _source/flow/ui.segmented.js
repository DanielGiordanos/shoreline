/* PVX-SEG (n215, shared) - single-choice segmented controls (HIG Segmented controls).
   pvxSeg(selector, {label, item, mode, isOn})
     mode 'radio' (default): a named radiogroup, the choice aria-checked, one Tab stop, arrows / Home / End move it
     mode 'tabs'           : the same as a tablist (the control switches a panel), aria-selected
     mode 'current'        : an app's section switcher: the open section is aria-current, nothing else changes
   The app keeps drawing the highlight with its own class (active, on, ...). The state is read from that class every time
   it changes, so what VoiceOver hears is always what is on screen. A group that is drawn again later is picked up too.
   Moving with the keyboard clicks the next segment, so the app's own handler does the work. */
(function(){
  if(window.pvxSeg) return;
  var REG=[], ON=/(^|\s)(active|on|is-on|is-active|sel|selected|current)(\s|$)/;
  function isOn(b,o){ return o.isOn?!!o.isOn(b):ON.test(typeof b.className==='string'?b.className:''); }
  function shown(b){ if(b.hidden) return false; var s=getComputedStyle(b); return s.display!=='none'&&s.visibility!=='hidden'; }
  function items(g,o){ return [].filter.call(g.querySelectorAll(o.item||'button'),function(b){ return b.closest(o.sel)===g&&shown(b); }); }
  function set(e,k,v){ if(e.getAttribute(k)!==v) e.setAttribute(k,v); }
  function sync(g,o){
    var it=items(g,o); if(!it.length) return;
    if(g.__pvxSegO!==o){ g.__pvxSegO=o;
      if(o.mode!=='current'){ g.setAttribute('role',o.mode==='tabs'?'tablist':'radiogroup'); g.addEventListener('keydown',key); }
      if(o.label&&!g.hasAttribute('aria-labelledby')) set(g,'aria-label',typeof o.label==='function'?o.label(g):o.label);
    }
    var cur=-1; for(var i=0;i<it.length;i++){ if(isOn(it[i],o)){ cur=i; break; } }
    it.forEach(function(b,i){ var s=i===cur;
      if(o.mode==='current'){ if(s) set(b,'aria-current','true'); else if(b.hasAttribute('aria-current')) b.removeAttribute('aria-current'); return; }
      set(b,'role',o.mode==='tabs'?'tab':'radio'); set(b,o.mode==='tabs'?'aria-selected':'aria-checked',String(s));
      if(b.hasAttribute('aria-pressed')) b.removeAttribute('aria-pressed');
      set(b,'tabindex',(s||(cur<0&&i===0))?'0':'-1');
    });
  }
  function ident(b){ return b.getAttribute('data-v')||b.getAttribute('data-s')||b.getAttribute('data-shift')||b.getAttribute('data-ctab')||b.getAttribute('data-tab')||b.getAttribute('data-mode')||b.id||b.textContent.trim(); }
  function key(e){
    var g=e.currentTarget, o=g.__pvxSegO; if(!o||e.altKey||e.metaKey||e.ctrlKey) return;
    var k=e.key, rtl=getComputedStyle(g).direction==='rtl', it=items(g,o).filter(function(b){ return !b.disabled&&b.getAttribute('aria-disabled')!=='true'; });
    var i=it.indexOf(document.activeElement); if(i<0) return;
    var fwd=rtl?'ArrowLeft':'ArrowRight', back=rtl?'ArrowRight':'ArrowLeft';
    var n=(k===fwd||k==='ArrowDown')?i+1:(k===back||k==='ArrowUp')?i-1:k==='Home'?0:k==='End'?it.length-1:null;
    if(n===null) return;
    e.preventDefault(); e.stopPropagation();
    var b=it[(n+it.length)%it.length], id=ident(b); b.focus(); b.click();
    /* the app may draw the group again: keep the keyboard on the same choice */
    requestAnimationFrame(function(){ scan(); if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest(o.sel)) return;
      var gs=document.querySelectorAll(o.sel); for(var j=0;j<gs.length;j++){ var m=items(gs[j],o).filter(function(x){ return ident(x)===id; })[0]; if(m){ m.focus(); return; } } });
  }
  var raf=0; function scan(){ raf=0; REG.forEach(function(o){ [].forEach.call(document.querySelectorAll(o.sel),function(g){ sync(g,o); }); }); }
  function later(){ if(!raf) raf=requestAnimationFrame(scan); }
  var obs=null;
  window.pvxSeg=function(sel,opts){ var o=Object.assign({sel:sel,mode:'radio'},opts||{}); REG.push(o);
    if(!obs&&document.body){ obs=pvxWatch(later,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']},document.body); }
    [].forEach.call(document.querySelectorAll(sel),function(g){ sync(g,o); }); return o; };
  window.pvxSeg.sync=scan;
})();