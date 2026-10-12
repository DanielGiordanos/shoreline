/* Treatment Sheets — keeps the app on the downtime computer (store/downtime.js registers this there only).
   Network first: while the network works every request goes to the network as usual, and a copy of the answer is kept.
   Only when the network fails is the kept copy used, so the app (and its downtime copy of the patients) still opens.
   It handles Treatment Sheets' own files and the Firebase scripts; everything else (the database itself) is left alone. */
var CACHE='ts-downtime-v1';
self.addEventListener('install',function(){ self.skipWaiting(); });
self.addEventListener('activate',function(e){ e.waitUntil(self.clients.claim()); });
function mine(u){ return (u.origin===self.location.origin&&u.pathname.indexOf('/treatment/')===0)||(u.hostname==='www.gstatic.com'&&u.pathname.indexOf('/firebasejs/')===0); }
function keep(req,res){ if(!res||!(res.ok||res.type==='opaque')) return; var cp=res.clone(); caches.open(CACHE).then(function(c){ return c.put(req,cp); }).catch(function(){}); }
/* the page sends the files it loaded: keep each of them, drop old versions nobody uses any more */
self.addEventListener('message',function(e){ var d=e.data||{}; if(d.type!=='dt-cache'||!Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(d.urls.map(function(u){ var url=new URL(u); if(!mine(url)) return null;
      var same=url.origin===self.location.origin, req=new Request(u,{mode:same?'same-origin':'no-cors',credentials:same?'same-origin':'omit'});
      return fetch(req).then(function(r){ if(r.ok||r.type==='opaque') return c.put(u,r); }).catch(function(){}); }))
    .then(function(){ return c.keys(); }).then(function(keys){ var want={}; d.urls.forEach(function(u){ want[u.split('#')[0]]=1; });
      return Promise.all(keys.map(function(k){ var path=new URL(k.url).pathname; if(!want[k.url]&&!/\/treatment\/(index\.html)?$/.test(path)) return c.delete(k); })); }); })); });
self.addEventListener('fetch',function(e){ var r=e.request; if(r.method!=='GET') return; var u=new URL(r.url); if(!mine(u)) return;
  e.respondWith(fetch(r).then(function(res){ keep(r,res); return res; }).catch(function(){
    return caches.open(CACHE).then(function(c){ return c.match(r,{ignoreSearch:r.mode==='navigate'}).then(function(m){
      return m||(r.mode==='navigate'?c.match(new URL('./',self.registration.scope).href,{ignoreSearch:true}):null); }); })
      .then(function(m){ return m||Response.error(); }); })); });
