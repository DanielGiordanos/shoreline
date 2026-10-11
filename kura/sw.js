// Kura on shoreline.pravix.app — keeps the app and its engine on this device so it opens fast and without a connection.
// Inventory data never enters CacheStorage: it lives in Firebase and in this browser's IndexedDB copy.
const VERSION = 'kura-web-c011573571';
const ENGINE = 'kura-engine-0.27.7';              // Pyodide files never change for a given version
const SCOPE = new URL('./', self.location).pathname;
const SHELL = ["./", "index.html", "py/backend/connectors.py?v=c011573571", "py/backend/controlled.py?v=c011573571", "py/backend/core.py?v=c011573571", "py/backend/init.py?v=c011573571", "py/backend/kits.py?v=c011573571", "py/backend/planning.py?v=c011573571", "py/backend/purchasing.py?v=c011573571", "py/backend/security.py?v=c011573571", "py/backend/server.py?v=c011573571", "py/backend/web.py?v=c011573571", "py/backend/workflows.py?v=c011573571", "src/api.js?v=c011573571", "src/app.css?v=c011573571", "src/app.js?v=c011573571", "src/area-icons.js?v=c011573571", "src/assume.js?v=c011573571", "src/brief-push.js?v=c011573571", "src/camera.js?v=c011573571", "src/controlled-ui.js?v=c011573571", "src/insights.css?v=c011573571", "src/insights.js?v=c011573571", "src/iso.js?v=c011573571", "src/kit.js?v=c011573571", "src/kits-ui.js?v=c011573571", "src/label-reader.js?v=c011573571", "src/look.css?v=c011573571", "src/nav.js?v=c011573571", "src/numbers.js?v=c011573571", "src/overview-scene.js?v=c011573571", "src/overview.css?v=c011573571", "src/overview.js?v=c011573571", "src/planning-ui.js?v=c011573571", "src/purchasing-ui.js?v=c011573571", "src/qr.js?v=c011573571", "src/search.js?v=c011573571", "src/theme/components.css?v=c011573571", "src/theme/product.css?v=c011573571", "src/theme/tokens.css?v=c011573571", "src/ui/components.js?v=c011573571", "src/ui/icons.js?v=c011573571", "src/web/engine-worker.js?v=c011573571", "src/web/kura-web.js?v=c011573571", "src/words.js?v=c011573571", "assets/logo-logo-dark.png", "assets/logo-logo-light.png", "assets/pvx-icon-plogo-dark.png", "assets/pvx-icon-plogo-light.png", "assets/pvx-mark-plogo-dark.png", "assets/pvx-mark-plogo-light.png", "assets/theme-dark.png", "assets/theme-light.png", "icons/kura-180.png", "icons/kura-192.png", "icons/kura-512.png", "src/scene/kura-area-scene.js", "src/scene/three.module.min.js", "src/vendor/qrcode-generator-2.0.4.esm.js", "src/vendor/zxing-0.21.3.min.js", "manifest.webmanifest"].map(p => SCOPE + p);
const FIREBASE_JS = /^https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.5\//;
const ENGINE_FILES = ["pyodide/pyodide.js", "pyodide/pyodide.asm.js", "pyodide/pyodide.asm.wasm", "pyodide/python_stdlib.zip", "pyodide/pyodide-lock.json", "pyodide/sqlite3-1.0.0-cp312-cp312-pyodide_2024_0_wasm32.whl"].map(p => SCOPE + p);
async function keepEngine() { const c = await caches.open(ENGINE); for (const f of ENGINE_FILES) if (!(await c.match(f))) await c.add(f); }
self.addEventListener('install', e => e.waitUntil(Promise.all([caches.open(VERSION).then(c => c.addAll(SHELL)), keepEngine()]).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys
  .filter(k => (k.startsWith('kura-web-') && k !== VERSION) || (k.startsWith('kura-engine-') && k !== ENGINE)).map(k => caches.delete(k))))
  .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(SCOPE + 'pyodide/')) {        // cache first: large and fixed
    e.respondWith(caches.open(ENGINE).then(async c => (await c.match(req, { ignoreSearch: true })) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  const shell = url.origin === self.location.origin && url.pathname.startsWith(SCOPE);
  if (!shell && !FIREBASE_JS.test(req.url)) return;                                            // Firestore traffic is never cached
  e.respondWith(fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: url.pathname.endsWith('.py') }).then(r => r || (req.mode === 'navigate' ? caches.match(SCOPE + 'index.html') : Response.error()))));
});

// Morning brief (cloud/functions/brief.js): show the notification; tapping it opens Kura's brief page.
self.addEventListener('push', e => {
  let m; try { m = e.data.json(); } catch { m = { title: 'Kura', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || 'Kura', { body: m.body || '', tag: m.tag || 'kura', renotify: false,
    icon: SCOPE + 'icons/kura-192.png', badge: SCOPE + 'icons/kura-192.png', data: { url: new URL(m.url || './', self.registration.scope).href } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(w => w.url.startsWith(self.registration.scope));
    if (open) { open.postMessage({ kura: 'navigate', url }); return open.focus(); }
    return self.clients.openWindow(url);
  }));
});
