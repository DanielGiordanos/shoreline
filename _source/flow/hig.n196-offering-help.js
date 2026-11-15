/* PVX-N196 - offering help: Tap on touch, Click with a mouse; money fields edit with one click, tap or Return */
(function(){
  var coarse=false; try{ coarse=matchMedia('(pointer:coarse)').matches; }catch(e){}
  function words(){ var w=coarse?'Tap':'Click'; document.querySelectorAll('.pvx-tapclick').forEach(function(x){ if(x.textContent!==w) x.textContent=w; }); }
  words(); try{ pvxWatch(function(){ words(); },{childList:true,subtree:true},document.body); }catch(e){}
  function edit(el){ el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true})); }   /* the existing editor opens on dblclick */
  document.addEventListener('click',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.rd-fin-edit[data-fin-key]'); if(!el||e.detail>1) return; edit(el); });
  document.addEventListener('keydown',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.rd-fin-edit[data-fin-key]'); if(!el||(e.key!=='Enter'&&e.key!==' ')) return; e.preventDefault(); e.stopPropagation(); edit(el); },true);
})();