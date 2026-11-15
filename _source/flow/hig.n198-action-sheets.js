/* PVX-N198 - action sheets: confirmations and Rounds menus */
(function(){
  function phone(){ return window.innerWidth<600; }
  function coarse(){ try{ return matchMedia('(pointer:coarse)').matches; }catch(e){ return false; } }
  var box=document.getElementById('confirmBox'), cancel=document.getElementById('confirmCancel');

  /* 1-2. confirmations */
  var opener=null;
  if(box&&typeof window.showConfirm==='function'){
    pvxWrap('showConfirm',function(sc){ return function(title,okLabel,onOk,opts){
      var a=document.activeElement; opener=(a&&a!==document.body&&!box.contains(a))?a:opener;
      var r=sc.apply(this,arguments);
      box.classList.toggle('pvx-as',phone());
      var danger=!!(opts&&opts.danger);
      setTimeout(function(){
        if(!box.classList.contains('open')||box.querySelector('.pvx-hwrap')) return;   /* the hours sheet focuses its field */
        var f=danger?box:document.getElementById('confirmOk'); if(f) try{ f.focus({preventScroll:true}); }catch(e){ f.focus(); }   /* PVX-N209: no default on a destructive alert */
      },40);
      return r;
    }; },'#47');
    new MutationObserver(function(){
      if(box.classList.contains('open')) return;
      var a=document.activeElement, o=opener; opener=null;
      if(o&&o.isConnected&&(!a||a===document.body||box.contains(a))) try{ o.focus({preventScroll:true}); }catch(e){}
    }).observe(box,{attributes:true,attributeFilter:['class']});
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||!box.classList.contains('open')) return;
      e.preventDefault(); e.stopPropagation(); if(cancel) cancel.click();
    },true);
    window.addEventListener('resize',function(){ if(box.classList.contains('open')) box.classList.toggle('pvx-as',phone()); });
  }

  /* 3. Rounds menus */
  if(typeof window.rdMenu!=='function') return;
  var DANGER=/^(Clear |Undo |Remove )/;
  function esc(t){ return (typeof pvxEsc==='function')?pvxEsc(t):String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  window.rdMenu=function(anchor,items,onPick){
    rdCloseMenus();
    var plain=[], bad=[];
    items.forEach(function(i){ (i.danger||DANGER.test(i.label||'')?bad:plain).push(i); });
    var radio=items.some(function(i){ return i.on; });
    function row(i,d){ return '<button type="button" tabindex="-1" role="'+(radio?'menuitemradio':'menuitem')+'"'+(radio?' aria-checked="'+(!!i.on)+'"':'')+' data-v="'+esc(i.value)+'" class="'+(i.on?'on ':'')+(d?'danger':'')+'">'+(radio?'<svg class="rd-ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':'')+esc(i.label)+'</button>'; }
    var html=plain.map(function(i){ return i.sep?'<div class="rd-msep" role="separator"></div>':row(i,false); }).join('')+(bad.length&&plain.length?'<div class="rd-msep" role="separator"></div>':'')+bad.map(function(i){ return row(i,true); }).join('');
    var label=(anchor&&(anchor.getAttribute('aria-label')||anchor.getAttribute('title')||(anchor.textContent||'').trim().slice(0,40)))||'Options';
    var as=phone(), m=document.createElement('div');
    m.className='rd-menu'+(as?' rd-as':'')+(coarse()?' rd-touch':'')+(radio?' rd-radio':'');   /* PVX-N203 */
    if(as) m.innerHTML='<div class="rd-assheet" role="menu" aria-label="'+esc(label)+'"><div class="rd-asgroup">'+html+'</div><button type="button" class="rd-ascancel">Cancel</button></div>';
    else { m.setAttribute('role','menu'); m.setAttribute('aria-label',label); m.innerHTML=html; }
    document.body.appendChild(m);
    if(!as){
      var r=anchor.getBoundingClientRect(), vh=window.innerHeight, h=m.scrollHeight, below=vh-r.bottom-18, above=r.top-18, top, maxH;
      if(h<=below||below>=above){ maxH=Math.max(120,below); top=r.bottom+6; }
      else { maxH=Math.max(120,above); top=Math.max(12,r.top-6-Math.min(h,maxH)); }
      m.style.maxHeight=maxH+'px';
      m.style.left=Math.max(12,Math.min(r.left,window.innerWidth-m.offsetWidth-12))+'px';
      m.style.top=top+'px';
    }
    var opts=[].slice.call(m.querySelectorAll('button'));   /* the items, then Cancel on phones */
    function close(back){
      m.remove(); document.removeEventListener('click',outside,true);
      if(back&&anchor&&anchor.isConnected) try{ anchor.focus({preventScroll:true}); }catch(e){}
    }
    function outside(ev){ if(!m.isConnected){ document.removeEventListener('click',outside,true); return; } if(!m.contains(ev.target)) close(false); }
    m.addEventListener('click',function(e){
      if(e.target===m||e.target.closest('.rd-ascancel')){ e.stopPropagation(); close(true); return; }
      var b=e.target.closest('button[data-v]'); if(!b) return;
      var v=b.dataset.v; close(false); onPick(v);
    });
    m.addEventListener('keydown',function(e){
      var i=opts.indexOf(document.activeElement);
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(true); return; }
      if(e.key==='Tab'){ close(false); return; }
      var n=null;
      if(e.key==='ArrowDown') n=(i+1)%opts.length; else if(e.key==='ArrowUp') n=(i-1+opts.length)%opts.length;
      else if(e.key==='Home') n=0; else if(e.key==='End') n=opts.length-1;
      if(n!==null){ e.preventDefault(); opts[n].focus(); }
    });
    setTimeout(function(){ if(m.isConnected) document.addEventListener('click',outside,true); },0);
    var first=m.querySelector('button.on')||opts[0]; if(first) try{ first.focus({preventScroll:true}); }catch(e){ first.focus(); }
    if(anchor&&anchor.setAttribute){ anchor.setAttribute('aria-expanded','true');   /* PVX-N206: the trigger says its menu is open */
      var mo=new MutationObserver(function(){ if(!m.isConnected){ anchor.setAttribute('aria-expanded','false'); mo.disconnect(); } }); mo.observe(document.body,{childList:true}); }
  };
  /* Esc also closes a menu that lost focus */
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&document.querySelector('.rd-menu')){ e.preventDefault(); rdCloseMenus(); } });
})();