"""Pravix Flow — the n383 build's own checks (Nov 14 2026): Flow's scripts are in files. Same code, same order.
index.html keeps the markup, the styles and the small scripts that run before the app. The main script is assets/flow/app.js;
the 104 scripts that followed it are assets/flow/layers.js and layers2.js, in the order they ran. Each of those was its own
<script>, so one that threw never stopped the next: in the shared files each runs inside try/catch. The service worker saves
a copy of the page only together with the files it names, so a saved copy still opens with no connection."""
import os, re, hashlib
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD, flow_code

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SCRIPT = re.compile(r'<script\b([^>]*)>(.*?)</script\s*>', re.S | re.I)
HEAD = re.compile(r'\n/\* ━━━━━ (\d+) of (\d+) · (.*?) ━━━━━ \*/\n')
CATCH = '}catch(e){setTimeout(function(){throw e})}'
rd = lambda *p: open(os.path.join(BUILD, *p), encoding='utf-8').read()


async def ctx(br, w=1440, h=900, alter=None, sw='block'):
    c = await br.new_context(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', service_workers=sw)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    seen = []
    async def route(r):
        u = r.request.url
        if u.startswith(f'http://127.0.0.1:{PORT}/'):
            seen.append(u[len(f'http://127.0.0.1:{PORT}'):])
            if alter and '/assets/flow/layers.js' in u: await r.fulfill(status=200, content_type='application/javascript; charset=utf-8', body=alter(rd('assets', 'flow', 'layers.js')))
            else: await r.continue_()
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        else: await r.fulfill(status=204, body='')
    if sw == 'block': await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e, seen

SEED3 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Cleo','Varga','Exam','Room 2',3,D[1],'Feline',22,'Ear infection']]
   .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
  renderAll(); return PATIENTS.length; })()"""

# every part of the page's code is there and wired, from the first script that moved to the last
ALIVE = """(()=>{ const f=n=>{ try{ return typeof (0,eval)(n); }catch(e){ return 'missing'; } };
  return {main:[f('renderAll'),f('openDrawer'),f('switchView'),f('patient'),f('PATIENTS'),f('DOCTORS')], early:[f('PVX_MOVE_ICON'),f('pvxUsRefocus'),f('rdQAdd'),typeof window.pvxN133],
    late:[typeof window.pvxSheets370, typeof window.pvxOpenThread, typeof window.pvxNoteTick, typeof window.pvxN332], switcher:!!document.querySelector('#subnavFlow .switcher.pvx-sw'), net:!!document.getElementById('flowNet'), live:!!document.getElementById('srLive'),
    inline:[...document.scripts].filter(s=>!s.src).length, files:[...document.scripts].filter(s=>s.src).map(s=>s.getAttribute('src').replace(/\\?v=.*/,'')) }; })()"""


@section(id='t383', title='n383 · Flow’s scripts are in files (app.js, layers.js, layers2.js): the same code in the same order, each script still on its own, and a saved copy still opens offline',
         apps=['flow'], topics=['performance', 'security'], engines=('chromium', 'webkit'))
async def s_t383(br):
    html = rd('index.html'); S = [(m.group(1), m.group(2), m.start()) for m in SCRIPT.finditer(html)]
    files = [re.search(r'src="([^"]+)"', a).group(1) for a, b, s in S if 'src=' in a]
    flow = [f for f in files if f.startswith('/assets/flow/')]; names = [f.split('?')[0].rsplit('/', 1)[1] for f in flow]
    last_inline = max(s for a, b, s in S if 'src=' not in a); app_at = next(s for a, b, s in S if '/assets/flow/app.js' in a)
    ok('The page · Flow’s code is three files, loaded in order (app.js, layers.js, then the Yakuri library where it was, then layers2.js), and no inline script comes after them',
       names == ['app.js', 'layers.js', 'layers2.js'] and last_inline < app_at
       and [re.sub(r'\?v=.*', '', f) for f in files[files.index(flow[0]):]] == ['/assets/flow/app.js', '/assets/flow/layers.js', 'assets/pvx-yakuri.js', '/assets/flow/layers2.js'], files[-6:])
    ok('…the page itself is a third of its size (1.76 MB of markup, styles and script became about half a megabyte; the styles move next)', len(html) < 600000, len(html))
    v = {f: hashlib.sha256(open(os.path.join(BUILD, f.split('?')[0].lstrip('/')), 'rb').read()).hexdigest()[:10] for f in flow}
    pre = re.findall(r'<link rel="preload" href="(/assets/flow/[^"]+)" as="script">', html)
    ok('…each file’s ?v= is the start of its SHA-256, so a changed file is a new address (python3 _ci/seal_csp.py . writes them), and each is preloaded under that same address',
       all(f.split('?v=')[1] == v[f] for f in flow) and pre == flow, [flow, v, pre])

    app = rd('assets', 'flow', 'app.js'); la, lb = rd('assets', 'flow', 'layers.js'), rd('assets', 'flow', 'layers2.js')
    A = HEAD.split(la); B = HEAD.split(lb); nums = [int(x) for x in A[1::4] + B[1::4]]; tot = set(A[2::4] + B[2::4]); blocks = A[4::4] + B[4::4]
    ok('The layers · every script that followed the main one is there, numbered in the order it ran (1…104), under the id it had', nums == list(range(1, len(nums) + 1)) and tot == {str(len(nums))} and len(nums) >= 100
       and sum(1 for x in A[3::4] + B[3::4] if x.startswith('pvx-n') or x.startswith('n3')) >= 60, [len(nums), tot])
    labels = [x.split(' · ')[0] for x in A[3::4] + B[3::4]]
    lone = [labels[k] for k, t in enumerate(blocks) if not ('try{\n' in t and t.rstrip().endswith(CATCH))]; whole = sum(1 for t in blocks if t.startswith('try{\n') and t.rstrip().endswith(CATCH))
    ok('…each runs inside its own try/catch, so one that throws doesn’t stop the next (each was its own <script>); a caught error is thrown again on its own, so it still reaches the console. The one without a try only declares five functions',
       lone == ['pvx-n148-rd-js'] and whole >= len(blocks) - 3 and not re.search(r'^(?!function |/\*|\s|$)', blocks[labels.index('pvx-n148-rd-js')], re.M), lone[:6])
    ok('…the main script is one file with nothing wrapped round it, and no file is strict (the scripts weren’t)', 'function renderAll' in app and not re.search(r'^\s*[\'"]use strict[\'"]', app, re.M) and not re.search(r'^[\'"]use strict[\'"]', la + lb, re.M) and len(app) > 400000, len(app))
    code = flow_code()
    ok('…and checks that read Flow’s source read the page and its files together (core.flow_code)', len(code) > len(html) + 1000000 and 'function renderAll' in code and '<nav' in code, len(code))

    c, p, e, seen = await ctx(br)
    await p.evaluate(SEED3); await p.wait_for_timeout(600)
    a = await p.evaluate(ALIVE)
    ok('Running · the app starts as before: the main script, the first scripts that moved, the last ones, and what they add to the page are all there',
       a['main'] == ['function', 'function', 'function', 'function', 'object', 'object'] and a['early'] == ['string', 'function', 'function', 'object'] and a['late'] == ['function', 'function', 'function', 'object']
       and a['switcher'] and a['net'] and a['live'], a)
    ok('…with the three files asked for once each, under their ?v= address, and about twenty small scripts left in the page (there were 124)',
       [u for u in seen if u.startswith('/assets/flow/') and '.js?' in u] == flow and 10 <= a['inline'] <= 30, [[u for u in seen if '/assets/flow/' in u], a['inline']])
    for v_ in ('list', 'rooms', 'dashboard'):
        await p.evaluate(f"switchView('{v_}')"); await p.wait_for_timeout(500)
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(900)
    d = await p.evaluate("(()=>{ const dr=document.getElementById('drawer'); return [dr.classList.contains('open'), (document.getElementById('dName')||{}).textContent||'']; })()")
    ok('…the views and a patient open, with no page errors', d[0] and 'Rocky' in d[1] and not newerr(e), [d, newerr(e)[:3]])
    await c.close()

    # one script throws: the ones after it still run, and the error still shows
    def alter(t):
        i = t.index('try{\n', t.index('━━━━━ 1 of ')); return t[:i + 5] + "throw new Error('n383 isolation check');\n" + t[i + 5:]
    c, p, e, seen = await ctx(br, alter=alter)
    b = await p.evaluate(ALIVE)
    ok('One script throwing · the scripts after it in the same file still run (the labels, the Move menu, the Rounds queue, the switcher), as they did when each was its own <script>',
       b['early'] == ['string', 'function', 'function', 'object'] and b['switcher'] and b['late'] == ['function', 'function', 'function', 'object'], b)
    ok('…and its error still reaches the console, as an uncaught error', any('n383 isolation check' in x for x in e), e[:3])
    await c.close()

    sw = rd('sw.js')
    ok('The service worker · a copy of the page is saved only together with the code files it names (at install and whenever a newer page arrives), those files are served from what was saved, and files no saved page names are forgotten',
       sw.count('saveShell(') == 3 and 'if (res && res.ok) await saveShell(res);' in sw and 'return saveShell(r.clone());' in sw and "url.pathname.indexOf('/assets/flow/') === 0 && url.search.indexOf('?v=') === 0) { event.respondWith(cacheFirst(event)); return; }" in sw
       and 'if (got.indexOf(false) >= 0) return false;' in sw and 'assets.delete(k)' in sw and 'shell.put(SHELL_KEY, r.clone())' not in sw, sw.count('saveShell('))
    if br.browser_type.name == 'chromium':
        # the page registers its worker on https only; here it is asked to by hand, then the connection goes
        c = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark')
        await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
        p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
        await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached')
        await p.evaluate("navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready)")
        kept = []
        for _ in range(40):
            kept = await p.evaluate("""(async()=>{ const a=await caches.open('flow-assets-v1'), s=await caches.open('flow-shell-v1');
              return {files:(await a.keys()).map(r=>r.url.replace(location.origin,'')).filter(u=>u.indexOf('/assets/flow/')===0).sort(), page:(await s.keys()).length, ctl:!!navigator.serviceWorker.controller}; })()""")
            if kept['page'] and len(kept['files']) >= 3 and kept['ctl']: break
            await p.wait_for_timeout(250)
        named = sorted(set(re.findall(r'(?:src|href)="(/assets/flow/[^"]+)"', html)))   # n384 adds the two style files
        ok('…live (Chromium): after one visit the saved page has its code files beside it, under their ?v= addresses', kept['page'] == 1 and kept['files'] == named and set(flow) <= set(named), kept)
        await c.set_offline(True)
        try:
            await p.reload(); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached', timeout=15000); await p.wait_for_timeout(1200)
            off = await p.evaluate(ALIVE)
        except Exception as x: off = {'error': str(x)[:200]}
        ok('…and with no connection Flow opens from that copy: the app, every layer and the switcher are there',
           off.get('main') == ['function', 'function', 'function', 'function', 'object', 'object'] and off.get('early') == ['string', 'function', 'function', 'object'] and off.get('late') == ['function', 'function', 'function', 'object'] and off.get('switcher') and not newerr(e), [off, newerr(e)[:3]])
        await c.set_offline(False); await c.close()
