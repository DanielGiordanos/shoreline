/* PVX-N202 - Cmd-Z / Shift-Cmd-Z (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) undo and redo the last change that offered Undo */
(function(){
  function modal(){ if(window.PvxCtx&&PvxCtx.isOpen()) return true; if(document.querySelector('.rd-menu,.pvx-menu')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),pvxShown); }
  document.addEventListener('keydown',function(e){
    if(!(e.metaKey||e.ctrlKey)||e.altKey||!window.pvxUndo) return;
    var k=(e.key||'').toLowerCase(), isUndo=k==='z'&&!e.shiftKey, isRedo=(k==='z'&&e.shiftKey)||(k==='y'&&e.ctrlKey&&!e.metaKey);
    if(!isUndo&&!isRedo) return;
    var b=document.body.classList; if(b.contains('tv-mode')||b.contains('client-mode')||pvxTyping()||modal()) return;   /* the field's own Undo, or nothing */
    e.preventDefault(); e.stopPropagation(); if(isUndo) pvxUndo.undo(); else pvxUndo.redo();
  },true);
})();