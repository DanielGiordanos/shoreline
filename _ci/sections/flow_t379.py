"""Pravix Flow — the n379 build's own checks (Nov 13 2026): Flow hosts Firebase and the QR library itself.
The files are the publishers' own bytes (checked here against their published hashes), the page takes no script from another
site, the service worker keeps them for offline starts, and the real Firebase starts from them (no fake on the page)."""
import os, re, hashlib, base64
from core import ok, section, PORT, BUILD

V = {'firebase-10.12.5/firebase-app-compat.js': 'mLD+wdwynYnAhgHAkdPP5hroWJXJTNy5C2OhPKM55zuiV2vjzFD1LtBohaHq2Ex8',
     'firebase-10.12.5/firebase-firestore-compat.js': '/SBCyt0JELVRyyrOp+QG5CdnpVoAry+uw9hdherLgyZxxePtHjOvQmJU5CHymUhT',
     'firebase-10.12.5/firebase-auth-compat.js': 'NiuRnBs5Z0OgJ12kYJLSeWxANeJN369zH3+Zn0TGVPaCH/TKmbPFqfOmmLtrj+wg',
     'qrcode-generator-1.4.4/qrcode.js': '8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k'}
VD = os.path.join(BUILD, 'assets', 'vendor')


@section(id='t379', title='n379 · Flow hosts Firebase and the QR library itself: the publishers’ bytes, no script from another site, kept for offline starts, and the real Firebase starts from them',
         apps=['flow'], topics=['security', 'loading'], engines=('chromium', 'webkit'))
async def s_t379(br):
    html = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    got = {}
    for f in V:
        try: got[f] = base64.b64encode(hashlib.sha384(open(os.path.join(VD, f), 'rb').read()).digest()).decode()
        except Exception as x: got[f] = str(x)
    ok('The files are the publishers’ own, byte for byte: Firebase 10.12.5 (app, Firestore, Auth) and qrcode-generator 1.4.4 match their published SHA-384', got == V, got)
    srcs = re.findall(r'<script[^>]*\ssrc="([^"]+)"', html)
    ok('The page loads each from /assets/vendor/ (Firebase in order: app, Firestore, Auth; the QR library deferred), with no integrity attribute to fail at the bedside',
       [s for s in srcs if '/vendor/' in s] == ['/assets/vendor/' + f for f in V] and 'integrity=' not in html and re.search(r'<script defer src="/assets/vendor/qrcode-generator-1\.4\.4/qrcode\.js">', html) is not None,
       [s for s in srcs if '/vendor/' in s])
    ok('…and takes no script from another site, nor warms a connection to gstatic', not [s for s in srcs if re.match(r'https?://', s)] and 'gstatic.com/firebasejs' not in html and 'preconnect" href="https://www.gstatic.com' not in html and 'jsdelivr' not in html,
       [s for s in srcs if re.match(r'https?://', s)])
    ok('…with the licences beside them (Apache 2.0 for Firebase; MIT in the QR file) and a README naming each file’s source and hash',
       os.path.exists(os.path.join(VD, 'firebase-10.12.5', 'LICENSE')) and 'Apache License' in open(os.path.join(VD, 'firebase-10.12.5', 'LICENSE')).read()[:400]
       and all(h in open(os.path.join(VD, 'README.md'), encoding='utf-8').read() for h in V.values()) and 'MIT license' in open(os.path.join(VD, 'qrcode-generator-1.4.4', 'qrcode.js'), encoding='utf-8').read()[:800], None)
    sw = open(os.path.join(BUILD, 'sw.js'), encoding='utf-8').read()
    ok('The service worker keeps all four for an offline start (cache first; a new version is a new folder) under a new version name, and no longer fetches the outside copies when it installs',
       all(("'/assets/vendor/" + f + "'") in sw for f in V) and "SW_VERSION = 'flow-sw-3'" in sw and 'const CDN_ASSETS = [];' in sw and "url.pathname.indexOf('/assets/vendor/') === 0) { event.respondWith(cacheFirst(event))" in sw, None)

    # the real libraries, no fake: Flow reaches its sign-in screen on them (Google's servers are out of reach here, as on a bad day)
    c = await br.new_context(viewport={'width': 1280, 'height': 800}, timezone_id='America/New_York', locale='en-US', color_scheme='dark')
    hits = []
    async def route(r):
        u = r.request.url
        m = re.match(r'http://127\.0\.0\.1:%d/assets/vendor/(.+?\.js)(\?.*)?$' % PORT, u)
        if m and m.group(1) in V:
            hits.append(m.group(1)); await r.fulfill(status=200, content_type='application/javascript', body=open(os.path.join(VD, m.group(1)), 'rb').read())
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.abort()
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_timeout(3500)
    r = await p.evaluate("""(()=>{ const vis=el=>!!el&&el.getClientRects().length>0;
      let fs=null, au=null; try{ fs=typeof firebase.firestore().collection; }catch(x){ fs=String(x); } try{ au=typeof firebase.auth().signInWithEmailAndPassword; }catch(x){ au=String(x); }
      const pw=document.querySelector('input[type="password"]');
      return {sdk:window.firebase&&firebase.SDK_VERSION, apps:window.firebase?firebase.apps.length:null, fs:fs, au:au, ts:typeof firebase.firestore.Timestamp, fv:typeof firebase.firestore.FieldValue,
              qr:typeof window.qrcode, signin:vis(pw), outside:performance.getEntriesByType('resource').map(x=>x.name).filter(n=>/gstatic\\.com\\/firebasejs|jsdelivr/.test(n))}; })()""")
    ok('The real Firebase starts from the hosted files: SDK 10.12.5, the app initialised, Firestore and Auth ready, the QR library present',
       r['sdk'] == '10.12.5' and r['apps'] == 1 and r['fs'] == 'function' and r['au'] == 'function' and r['ts'] == 'function' and r['fv'] == 'function' and r['qr'] == 'function'
       and sorted(set(hits)) == sorted(V), [r, sorted(set(hits))])
    ok('…Flow shows its sign-in screen on them, asks gstatic and jsDelivr for nothing, and raises no page error', r['signin'] and r['outside'] == [] and not e, [r['signin'], r['outside'], e[:3]])
    await c.close()
