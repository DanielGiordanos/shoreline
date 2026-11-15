/* PVX-N358 - HIG Dock menus: /#find and /#view=… open from the Dock menu, the Mac File menu or a link
   (/#op=new was n207). Find focuses the search field; a view opens that view. The address is tidied afterwards. */
(function(){
  var VIEWS={list:1,flow:1,rooms:1,dashboard:1,consent:1,client:1};
  function app(){ try{ return typeof currentApp!=='undefined'?currentApp:'flow'; }catch(e){ return 'flow'; } }
  function go(){ var h=String(location.hash||''); var mv=/(^#|&)view=([a-z]+)/.exec(h), mf=/(^#|&)find\b/.test(h);
    if(!mv&&!mf) return; if(mv&&!VIEWS[mv[2]]) return;
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    try{ if(app()!=='flow'&&typeof switchApp==='function') switchApp('flow'); }catch(e){}
    setTimeout(function(){
      if(mv){ try{ switchView(mv[2]); }catch(e){} return; }
      var s=document.getElementById('globalSearch'); if(!s) return;
      if(!s.getClientRects().length){ var b=document.querySelector('#subnavFlow [aria-label^="Search"]:not(input)'); if(b) b.click(); }
      setTimeout(function(){ try{ s.focus(); s.select(); }catch(e){} },60);
    },120); }
  setTimeout(go,700); window.addEventListener('hashchange',go);
})();