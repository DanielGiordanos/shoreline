/* PVX-N192 - a file or link dropped where nothing takes it does nothing (the page stays); text fields still take text */
(function(){
  function editable(t){ return t&&t.closest&&t.closest('input,textarea,[contenteditable]:not([contenteditable=false])'); }
  document.addEventListener('dragover',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='none'; });
  document.addEventListener('drop',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); });
})();