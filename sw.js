/* Pravix Flow service worker.
   Scope is deliberately narrow: it only handles the Flow board page ("/") and the files that page
   loads. Every other page on this site (Directory, SGVP, Scheduling, Check-in, Tracker) passes
   straight through to the network untouched.
   - The Flow page is network-first with a revalidating fetch, so a reload always gets the newest
     version when online, and the last saved copy when offline.
   - Flow's images and data files are served from cache and refreshed in the background.
   - The pinned Firebase and QR libraries are cached so Flow can open with no connection.
   Emergency: replace this file with KILL-SWITCH-sw.js to remove it from every browser. */
const SW_VERSION = 'flow-sw-1';
const SHELL = 'flow-shell-v1';
const ASSETS = 'flow-assets-v1';
const SHELL_KEY = '/';
const NET_TIMEOUT_MS = 6000;

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
  '/manifest.webmanifest'
];
const CDN_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    try {
      const shell = await caches.open(SHELL);
      const res = await fetch(new Request(SHELL_KEY, { cache: 'no-cache', credentials: 'same-origin' }));
      if (res && res.ok) await shell.put(SHELL_KEY, res);
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

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }

async function flowPage(event) {
  const cache = await caches.open(SHELL);
  const url = new URL(event.request.url);
  try {
    const res = await Promise.race([
      fetch(new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })),
      timeout(NET_TIMEOUT_MS)
    ]);
    if (res && res.ok && !res.redirected) {
      event.waitUntil(cache.put(SHELL_KEY, res.clone()));
      return res;
    }
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
  if (same && (url.pathname.indexOf('/assets/') === 0 || url.pathname === '/manifest.webmanifest')) {
    event.respondWith(freshInBackground(event));
    return;
  }
  if ((url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/10.12.5/') === 0) ||
      (url.hostname === 'cdn.jsdelivr.net' && url.pathname.indexOf('/npm/qrcode-generator@1.4.4/') === 0)) {
    event.respondWith(cacheFirst(event));
  }
});
