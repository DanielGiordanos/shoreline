/* Pravix theme — copied byte-for-byte from the suite (pvx-theme-js, live build n243). Loaded at the very top of <body>. */

/* Pravix theme — one Light / Dark choice for every app (Oct 2026; source: VCA/nav/pvx-theme.js).
   The choice lives in the pvx_theme cookie (domain .pravix.app), which Flow, Treatment Sheets, Directory and SGVP already use.
   Runs at the very top of <body>: applies the saved choice before anything is drawn, tells the page's own older setting
   (localStorage darkMode / sgvp-curr-theme) the same thing, and saves every later switch back to the cookie. Default: dark (as Flow). */
(function(){
  function rc(){ var m=document.cookie.match(/(?:^|;\s*)pvx_theme=(dark|light)/); return m&&m[1]; }
  function wc(v){ try{ document.cookie='pvx_theme='+v+';domain=.pravix.app;path=/;max-age=31536000;SameSite=Lax'; }catch(e){}
    if(rc()!==v){ try{ document.cookie='pvx_theme='+v+';path=/;max-age=31536000;SameSite=Lax'; }catch(e){} } }   /* outside pravix.app (previews) */
  function local(v){ try{ localStorage.setItem('darkMode',v==='dark'?'1':'0'); localStorage.setItem('sgvp-curr-theme',v); }catch(e){} }
  var t=rc()||((window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark'); local(t);
  try{ document.body.classList.toggle('dark',t==='dark'); }catch(e){}
  try{ new MutationObserver(function(){ var v=document.body.classList.contains('dark')?'dark':'light'; if(v!==rc()) wc(v); local(v); })
    .observe(document.body,{attributes:true,attributeFilter:['class']}); }catch(e){}
})();
