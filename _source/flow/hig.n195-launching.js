/* PVX-N195 - launching: theme transitions back on once the first screen is up; remember and restore where you were;
   the status bar follows the theme */
(function(){
  var d=document.documentElement;
  function up(){ d.classList.remove('pvx-pre-dark','pvx-pre-light'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ setTimeout(function(){ d.classList.remove('pvx-boot'); },120); }); }); }
  if(document.readyState==='complete') up(); else window.addEventListener('load',up);
  /* status bar */
  var meta=document.querySelector('meta[name="theme-color"]');
  function tint(){ if(meta) meta.setAttribute('content',document.body.classList.contains('dark')?'#0A1222':'#F2F4F8'); }
  tint(); try{ pvxWatch(tint,{attributes:true,attributeFilter:['class']},document.body); }catch(e){}
  /* where you were */
  var KEY='pvx:flow:where', R=window.__pvxRestore||null, ready=!R;
  function get(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null')||{}; }catch(e){ return {}; } }
  function save(p){ if(!ready||document.body.classList.contains('tv-mode')) return; try{ var o=get(); for(var k in p) o[k]=p[k]; o.at=Date.now(); localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  function app(){ return typeof currentApp!=='undefined'?currentApp:'flow'; }
  function view(){ return app()==='ultrasound'?'us:'+(typeof currentUsView!=='undefined'?currentUsView:''):app()==='rounds'?'rounds':(typeof currentView!=='undefined'?currentView:''); }
  [['switchApp',function(a){ save({app:a}); }],['switchView',function(v){ save({app:'flow',view:v}); }],['switchUsView',function(v){ save({usView:v}); }]].forEach(function(x){
    var f=window[x[0]]; if(typeof f!=='function') return; window[x[0]]=function(a){ var r=f.apply(this,arguments); try{ x[1](a); }catch(e){} return r; }; });
  var st=document.getElementById('stage'), stT=0;
  function keep(){ if(!ready||!st) return; var o=get(); o.scroll=o.scroll||{}; o.scroll[view()]=Math.round(st.scrollTop); o.at=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  if(st) st.addEventListener('scroll',function(){ if(!ready) return; clearTimeout(stT); stT=setTimeout(keep,200); },{passive:true});
  window.addEventListener('pagehide',keep); document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') keep(); });   /* an app the iPad closes keeps its place */
  function scrollBack(){ var o=get(), y=o.scroll&&o.scroll[view()]; if(!st||!y) return; var moved=false, mark=function(){ moved=true; };
    st.addEventListener('wheel',mark,{once:true,passive:true}); st.addEventListener('touchstart',mark,{once:true,passive:true});
    var go=function(){ if(!moved&&st.scrollHeight-st.clientHeight>=y-4) st.scrollTo({top:y,behavior:'instant'}); }; go(); setTimeout(go,500); setTimeout(go,1200); }
  if(R){
    /* the existing #app= boot switches the app at 250 ms and keeps Flow hidden until its two frames; the view goes first */
    setTimeout(function(){
      try{ if(R.app==='flow'&&R.view&&R.view!=='dashboard'&&typeof switchView==='function') switchView(R.view);
        if(R.app==='ultrasound'&&R.usView&&typeof switchUsView==='function') switchUsView(R.usView); }catch(e){ console.warn('[restore]',e); }
      ready=true; setTimeout(scrollBack,350);
    },260);
  } else setTimeout(scrollBack,600);
  window.pvxWhere={get:get};
})();