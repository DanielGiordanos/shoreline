/* Treatment Sheets — keeps the app's own files so it opens with a slow or no connection (n235: on every device; before,
   only on the downtime computer). It holds Treatment's files and the Firebase scripts — never patient data: the database
   is left alone, and the downtime computer's copy of the patients lives in the page's own storage, as before.
   Network first. When a saved copy exists and the network hasn't answered in 2 s, the saved copy is used and the network
   answer still replaces it for next time. */
var CACHE='ts-downtime-v1', WAIT=2000;
self.addEventListener('install',function(){ self.skipWaiting(); });
self.addEventListener('activate',function(e){ e.waitUntil(self.clients.claim()); });
function mine(u){ return (u.origin===self.location.origin&&u.pathname.indexOf('/treatment/')===0)||(u.hostname==='www.gstatic.com'&&u.pathname.indexOf('/firebasejs/')===0); }
function keep(req,res){ if(!res||!(res.ok||res.type==='opaque')) return Promise.resolve(); var cp=res.clone(); return caches.open(CACHE).then(function(c){ return c.put(req,cp); }).catch(function(){}); }
/* the page sends the files it loaded: keep each of them, drop old versions nobody uses any more */
self.addEventListener('message',function(e){ var d=e.data||{}; if(d.type!=='dt-cache'||!Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(d.urls.map(function(u){ var url=new URL(u); if(!mine(url)) return null;
      var same=url.origin===self.location.origin, req=new Request(u,{mode:same?'same-origin':'no-cors',credentials:same?'same-origin':'omit'});
      return fetch(req).then(function(r){ if(r.ok||r.type==='opaque') return c.put(u,r); }).catch(function(){}); }))
    .then(function(){ return c.keys(); }).then(function(keys){ var want={}; d.urls.forEach(function(u){ want[u.split('#')[0]]=1; });
      return Promise.all(keys.map(function(k){ var path=new URL(k.url).pathname; if(!want[k.url]&&!/\/treatment\/(index\.html)?$/.test(path)) return c.delete(k); })); }); })); });
function saved(r){ return caches.open(CACHE).then(function(c){ return c.match(r,{ignoreSearch:r.mode==='navigate'}).then(function(m){
  return m||(r.mode==='navigate'?c.match(new URL('./',self.registration.scope).href,{ignoreSearch:true}):null); }); }).catch(function(){ return null; }); }
self.addEventListener('fetch',function(e){ var r=e.request; if(r.method!=='GET') return; var u=new URL(r.url); if(!mine(u)) return;
  var net=fetch(r).then(function(res){ e.waitUntil(keep(r,res)); return res; });
  e.respondWith(saved(r).then(function(m){
    if(!m) return net.catch(function(){ return Response.error(); });
    return new Promise(function(done){ var t=setTimeout(function(){ done(m); },WAIT);
      net.then(function(res){ clearTimeout(t); done(res); },function(){ clearTimeout(t); done(m); }); }); })); });
