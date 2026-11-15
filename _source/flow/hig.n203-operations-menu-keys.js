/* PVX-N203 - the Operations menu works from the keyboard and gives focus back to + */
(function(){
  var menu=document.getElementById('opsMenu'), fab=document.getElementById('fabAdd'); if(!menu||!fab) return;
  fab.setAttribute('aria-haspopup','menu'); fab.setAttribute('aria-controls','opsMenu');
  function items(){ return [].slice.call(menu.querySelectorAll('.ops-item')).filter(function(b){ return b.offsetParent!==null&&!b.disabled; }); }
  function focusEl(el){ if(el) try{ el.focus({preventScroll:true}); }catch(e){ el.focus(); } }
  if(typeof window.opsMenuOpen==='function'){ pvxAfter('opsMenuOpen',function(){ setTimeout(function(){ if(menu.classList.contains('open')) focusEl(items()[0]); },30); },'n203'); }
  if(typeof window.opsMenuClose==='function'){ pvxWrap('opsMenuClose',function(cl){ return function(){ var inside=menu.contains(document.activeElement); var r=cl.apply(this,arguments); if(inside) focusEl(fab); return r; }; },'n203'); }
  menu.addEventListener('keydown',function(e){
    var b=items(), i=b.indexOf(document.activeElement), n=null;
    if(e.key==='ArrowDown') n=(i+1)%b.length; else if(e.key==='ArrowUp') n=(i-1+b.length)%b.length;
    else if(e.key==='Home') n=0; else if(e.key==='End') n=b.length-1;
    else if(e.key==='Tab'){ e.preventDefault(); window.opsMenuClose(); return; }
    else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); window.opsMenuClose(); return; }
    if(n!==null){ e.preventDefault(); focusEl(b[n]); }
  });
})();