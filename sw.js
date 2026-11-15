/* Pravix Flow service worker.
   Scope is deliberately narrow: it only handles the Flow board page ("/") and the files that page
   loads. Every other page on this site (Directory, SGVP, Scheduling, Check-in, Tracker) passes
   straight through to the network untouched.
   - The Flow page is network-first with a revalidating fetch, so a reload always gets the newest
     version when online, and the last saved copy when offline.
   - Flow's images and data files are served from cache and refreshed in the background.
   - Flow's code is in files (assets/flow/…?v=…, n383). The address carries the version, so a file is fetched once and
     kept. A copy of the page is saved only together with the files it names, so the saved copy always opens.
   - The Firebase and QR libraries are this site's own files (assets/vendor/, n379), kept so Flow can open with no
     connection. Other apps' copies from gstatic are cached when they ask for them.
   Emergency: replace this file with KILL-SWITCH-sw.js to remove it from every browser. */
const SW_VERSION = 'flow-sw-4';   /* n383 (n379: flow-sw-3, n195: flow-sw-2) */
const SHELL = 'flow-shell-v1';
const ASSETS = 'flow-assets-v1';
const SHELL_KEY = '/';
const NET_TIMEOUT_MS = 2000;   /* n195: launch within a couple of seconds when a saved copy exists */

const LOCAL_ASSETS = [
  '/assets/data/breeds.js',
  '/assets/img/favicon.png', '/assets/img/logo-dark.png', '/assets/img/logo-light.png',
  '/assets/img/pvx-icon-dark.png', '/assets/img/pvx-icon-light.png',
  '/assets/img/pvx-mark-dark.png', '/assets/img/pvx-mark-light.png',
  '/assets/img/theme-dark.png', '/assets/img/theme-light.png',
  '/assets/img/footer-logo.png', '/assets/img/pravix-logo-drk.png', '/assets/img/pravix-logo-lite.png',
  '/assets/img/disch-icon.png', '/assets/img/docs-icon.png', '/assets/img/pets-icon.png',
  '/assets/img/luna-mask.webp', '/assets/img/luna-orb.webp',
  '/assets/img/icon-192.png', '/assets/img/icon-512.png',
  '/manifest.webmanifest',
  '/assets/vendor/firebase-10.12.5/firebase-app-compat.js',
  '/assets/vendor/firebase-10.12.5/firebase-firestore-compat.js',
  '/assets/vendor/firebase-10.12.5/firebase-auth-compat.js',
  '/assets/vendor/qrcode-generator-1.4.4/qrcode.js'
];
const CDN_ASSETS = [];   /* n379: Flow's libraries are local now */

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    try {
      const res = await fetch(new Request(SHELL_KEY, { cache: 'no-cache', credentials: 'same-origin' }));
      if (res && res.ok) await saveShell(res);   /* n383: with its code files */
    } catch (e) {}
    const assets = await caches.open(ASSETS);
    await Promise.all(LOCAL_ASSETS.map(function (u) {
      return fetch(new Request(u, { cache: 'no-cache' })).then(function (r) { if (r && r.ok) return assets.put(u, r); }).catch(function () {});
    }).concat(CDN_ASSETS.map(function (u) {
      return fetch(u, { mode: 'no-cors' }).then(function (r) { if (r && (r.ok || r.type === 'opaque')) return assets.put(u, r); }).catch(function () {});
    })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keep = [SHELL, ASSETS];
    const names = await caches.keys();
    await Promise.all(names.filter(function (n) { return n.indexOf('flow-') === 0 && keep.indexOf(n) < 0; }).map(function (n) { return caches.delete(n); }));
    await self.clients.claim();
  })());
});

/* n383: the page names its code files (/assets/flow/app.js?v=…). Save them first, then the page; forget the ones no saved page names. */
function flowFiles(html) {
  const out = [], re = /(?:src|href)="(\/assets\/flow\/[^"]+)"/g; let m;
  while ((m = re.exec(html))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
}
async function saveShell(res) {
  const shell = await caches.open(SHELL), assets = await caches.open(ASSETS);
  const files = flowFiles(await res.clone().text());
  const got = await Promise.all(files.map(async function (u) {
    if (await assets.match(u)) return true;
    try { const r = await fetch(new Request(u, { cache: 'no-cache' })); if (r && r.ok) { await assets.put(u, r); return true; } } catch (e) {}
    return false;
  }));
  if (got.indexOf(false) >= 0) return false;   /* keep the last copy that is whole */
  await shell.put(SHELL_KEY, res);
  const keys = await assets.keys();
  await Promise.all(keys.filter(function (k) { const u = new URL(k.url); return u.origin === self.location.origin && u.pathname.indexOf('/assets/flow/') === 0 && files.indexOf(u.pathname + u.search) < 0; })
    .map(function (k) { return assets.delete(k); }));
  return true;
}

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }

async function flowPage(event) {
  const cache = await caches.open(SHELL);
  const url = new URL(event.request.url);
  const saved = await cache.match(SHELL_KEY);
  const net = fetch(new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' }));
  /* n195: a late network copy is still saved for next time */
  event.waitUntil(net.then(function (r) { if (r && r.ok && !r.redirected) return saveShell(r.clone()); }).catch(function () {}));   /* n383: with its code files */
  try {
    const res = saved ? await Promise.race([net, timeout(NET_TIMEOUT_MS)]) : await net;
    if (res && res.ok && !res.redirected) return res;
    if (res && res.status >= 400) {
      const hit = await cache.match(SHELL_KEY);
      return hit || res;
    }
    return res;
  } catch (e) {
    const hit = await cache.match(SHELL_KEY);
    if (hit) return hit;
    return fetch(event.request);
  }
}

async function freshInBackground(event) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(event.request);
  const net = fetch(event.request).then(function (r) {
    if (r && (r.ok || r.type === 'opaque')) cache.put(event.request, r.clone());
    return r;
  }).catch(function () { return null; });
  if (hit) { event.waitUntil(net); return hit; }
  const r = await net;
  return r || Response.error();
}

async function cacheFirst(event) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(event.request);
  if (hit) return hit;
  const r = await fetch(event.request);
  if (r && (r.ok || r.type === 'opaque')) event.waitUntil(cache.put(event.request, r.clone()));
  return r;
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  if (req.mode === 'navigate') {
    if (same && (url.pathname === '/' || url.pathname === '/index.html')) event.respondWith(flowPage(event));
    return;
  }
  if (same && url.pathname.indexOf('/assets/vendor/') === 0) { event.respondWith(cacheFirst(event)); return; }   /* n379: the folder name carries the version */
  if (same && url.pathname.indexOf('/assets/flow/') === 0 && url.search.indexOf('?v=') === 0) { event.respondWith(cacheFirst(event)); return; }   /* n383: ?v= carries the version */
  if (same && (url.pathname.indexOf('/assets/') === 0 || url.pathname === '/manifest.webmanifest')) {
    event.respondWith(freshInBackground(event));
    return;
  }
  if ((url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/10.12.5/') === 0) ||
      (url.hostname === 'cdn.jsdelivr.net' && url.pathname.indexOf('/npm/qrcode-generator@1.4.4/') === 0)) {
    event.respondWith(cacheFirst(event));
  }
});
