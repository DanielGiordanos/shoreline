"""Treatment Sheets — the n302 build's own checks: the Firebase modular SDK behind a compat-shaped facade (firebase-lite.js), loaded from the
site instead of the three compat scripts from gstatic. The suite's fake Firebase stays in charge of the app checks (the facade defines
window.firebase only when nothing has); here the facade is also loaded on its own and its shapes checked. The real data path is covered by
n302/fb/conformance (compat vs facade against the emulators, step for step) and n302/fb/e2e.py (the real page on the emulators).
Written with that build; they run in Chromium and WebKit."""
import os
from tsh import *
from core import ok, section, until, PORT, BUILD


@section(id='t302', title='n302 · Treatment Sheets: the modular Firebase SDK behind the compat shapes the app uses, served from the site',
         apps=['treatment'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t302(br):
    T = os.path.join(BUILD, 'treatment')
    idx = open(os.path.join(T, 'index.html'), encoding='utf-8').read()
    lite = os.path.join(T, 'firebase-lite.js'); src = os.path.join(T, 'src', 'firebase-lite.mjs')
    ok('index.html loads firebase-lite.js (deferred, hashed, preloaded) where the three gstatic compat scripts were, and no longer preconnects to www.gstatic.com',
       'firebasejs/' not in idx and idx.count('firebase-lite.js?v=') == 2 and 'preconnect" href="https://www.gstatic.com"' not in idx and 'firestore.googleapis.com' in idx, idx.count('firebase-lite.js?v='))
    ok('the facade and its source are in the build: under 420 KB minified (the compat scripts were 513 KB), with the modular firestore and auth inside',
       os.path.exists(lite) and os.path.exists(src) and os.path.getsize(lite) < 420000 and 'connectFirestoreEmulator' in open(src, encoding='utf-8').read(), os.path.getsize(lite) if os.path.exists(lite) else None)
    # the app on the suite's fake Firebase: the facade stands aside
    ctx, pg, e = await ts(br, PORT, view='sheet')
    f = await pg.evaluate("[firebase.SDK_VERSION||null, !!window.__fs, performance.getEntriesByType('resource').some(r=>/firebase-lite\\.js/.test(r.name)), performance.getEntriesByType('resource').some(r=>/gstatic/.test(r.name)), (TASKS||[]).length>0]")
    ok('with a Firebase already on the page (the suite\'s fake), the facade leaves it alone: the fake serves the app, firebase-lite.js was fetched, nothing from gstatic', f[0] is None and f[1] and f[2] and not f[3] and f[4], f)
    ok('no page errors', not e, e[:3])
    await ctx.close()
    # the facade alone, offline: the shapes the app relies on
    ctx = await br.new_context(); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda x: errs.append(str(x)))
    await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{PORT}/') else r.fulfill(status=204, body=''))
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/manifest.webmanifest')
    await pg.add_script_tag(content=open(lite, encoding='utf-8').read()); await pg.wait_for_timeout(300)
    sh = await pg.evaluate("""(()=>{try{const fb=window.firebase;const before=fb.apps.length;fb.initializeApp({apiKey:'x',authDomain:'x.firebaseapp.com',projectId:'shoreline-flow',appId:'1:1:web:1'});
      const db=fb.firestore(),auth=fb.auth(),FV=fb.firestore.FieldValue;const d=db.collection('sheets').doc('sh_1');const q=db.collection('sheets').where('tenant_id','==','shoreline').where('status','in',['active']);
      return {ver:fb.SDK_VERSION,before,after:fb.apps.length,fvType:typeof FV,fv:[typeof FV.serverTimestamp(),typeof FV.delete(),typeof FV.arrayUnion('a'),typeof FV.increment(1)],
        ref:[d.id,d.path,d.parent.id,d.collection('days').path,typeof d.get,typeof d.set,typeof d.update,typeof d.onSnapshot,typeof d.delete],
        q:[typeof q.get,typeof q.onSnapshot,typeof q.where],batch:typeof db.batch().set,tx:typeof db.runTransaction,
        auth:[auth.currentUser,typeof auth.onAuthStateChanged,typeof auth.signInWithEmailAndPassword,typeof auth.signOut,typeof auth.sendPasswordResetEmail],
        ts:typeof fb.firestore.Timestamp.now().toDate}}catch(e){return {err:String(e)}}})()""")
    ok('alone on a blank page the facade gives the compat shapes: apps, initializeApp, firestore() with collection/doc/where/get/set/update/delete/onSnapshot/batch/runTransaction, FieldValue as a function with its sentinels, Timestamp, auth() with currentUser null and the five calls the app makes',
       not sh.get('err') and sh['ver'] == '10.12.5-lite' and sh['before'] == 0 and sh['after'] == 1 and sh['fvType'] == 'function' and all(x == 'object' for x in sh['fv'])
       and sh['ref'] == ['sh_1', 'sheets/sh_1', 'sheets', 'sheets/sh_1/days', 'function', 'function', 'function', 'function', 'function'] and sh['q'] == ['function'] * 3
       and sh['batch'] == 'function' and sh['tx'] == 'function' and sh['auth'] == [None, 'function', 'function', 'function', 'function'] and sh['ts'] == 'function', sh)
    ok('no page errors (facade alone)', not errs, errs[:3])
    await ctx.close()
