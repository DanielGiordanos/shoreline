/* PVX-N347 - HIG Offering help: Flow's help is findable. Typing "help", "shortcuts" or "keyboard" in search offers Keyboard shortcuts
   (before, only the ? key opened it, and search said "No matches"). */
(function(){
  if(typeof searchIndex!=='function') return;
  var KEYS='<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>';
  pvxWrap('searchIndex',function(_si){ return function(q){ var r=_si.apply(this,arguments); var t=String(q||'').trim().toLowerCase();
    if(t.length>=2&&/^(help|hel|he|short|shortc|shortcu|shortcut|shortcuts|keyb|keyboard|keys|key|hotkey|\?)/.test(t)||t==='?'){
      r.push({kind:'Help',icon:true,svg:KEYS,color:'var(--ink-500)',title:'Keyboard shortcuts',sub:'Or press ? anytime',
        act:function(){ try{ closeSearch(); }catch(e){} var s=document.getElementById('globalSearch'); if(s) s.blur();
          setTimeout(function(){ document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); },30); }}); }
    return r; }; },'n347');
})();