"""Pravix Flow — the n384 build's own checks (Nov 14 2026): Flow's styles are in files. Same rules, same order.
The 27 style blocks that sat in <head> are assets/flow/app.css; the 68 that sat in <body> are assets/flow/layers.css, linked where
the first of them was, so they still come after the styles the shared assets add to <head>. index.html keeps the markup, three
small styles that paint before anything loads, and the small scripts that run before the app."""
import os, re, hashlib
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD, flow_code, flow_style

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
TOKEN = re.compile(r'<!--.*?-->|<script\b[^>]*>.*?</script\s*>|<style\b([^>]*)>(.*?)</style\s*>', re.S | re.I)
HEAD = re.compile(r'\n/\* ━━━━━ (\d+) of (\d+) · (.*?) ━━━━━ \*/\n')
rd = lambda *p: open(os.path.join(BUILD, *p), encoding='utf-8').read()


async def ctx(br, w=1440, h=900, scheme='dark'):
    c = await br.new_context(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme=scheme, service_workers='block')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

SEED3 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Cleo','Varga','Exam','Room 2',3,D[1],'Feline',22,'Ear infection']]
   .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
  renderAll(); return PATIENTS.length; })()"""

# the sheets as the browser has them, in the order it applies them
SHEETS = """(()=>{ const count=rs=>{ let n=0; for(const r of rs){ if(r.cssRules&&r.cssRules.length&&!(r instanceof CSSStyleRule)) n+=count(r.cssRules); else n++; } return n; };
  return [...document.styleSheets].map(s=>{ const o=s.ownerNode; let n=-1; try{ n=count(s.cssRules); }catch(e){} return {what:o.tagName==='LINK'?o.getAttribute('href').replace(/\\?v=.*/,''):'style#'+(o.id||''), n, where:o.parentNode===document.head?'head':(o.closest('body')?'body':'?')}; }); })()"""
LOOK = """(()=>{ const cs=(s,p)=>{ const e=document.querySelector(s); return e?getComputedStyle(e)[p]:null; };
  const orb=document.querySelector('.luna-search-orb img'); const mask=orb?(getComputedStyle(orb).maskImage||getComputedStyle(orb).webkitMaskImage):null;
  return {font:cs('body','fontFamily'), bg:cs('body','backgroundColor'), nav:cs('.topnav','position'), stage:cs('#stage','overflowY'), seg:cs('#switcher .seg.active','fontWeight'), sr:cs('#pvxN136Live','position'),
    drawer:cs('#drawer','position'), mask, styles:[...document.querySelectorAll('style')].map(s=>s.id||'(no id)') }; })()"""


@section(id='t384', title='n384 · Flow’s styles are in files (app.css, layers.css): the same rules in the same order, the shared assets’ styles still between them, and a saved copy still opens offline with its styles',
         apps=['flow'], topics=['performance', 'layout'], engines=('chromium', 'webkit'))
async def s_t384(br):
    html = rd('index.html'); head_end = html.index('</head>')
    styles = [(re.search(r'id="([^"]+)"', m.group(1)).group(1) if 'id=' in m.group(1) else '', m.start()) for m in TOKEN.finditer(html) if m.group(0)[:6].lower() == '<style']
    links = [(m.group(1), m.start()) for m in re.finditer(r'<link rel="stylesheet" href="(/assets/flow/[^"]+)">', html)]
    ok('The page · only three small styles are left in it (n248, n195 and n187: what paints before anything loads); the rest are two files',
       [i for i, s in styles] == ['pvx-n248-css', 'pvx-n195-boot-css', 'pvx-n187-css'] and [u.split('?')[0] for u, s in links] == ['/assets/flow/app.css', '/assets/flow/layers.css'], [styles, links])
    app_js = html.index('<script src="/assets/flow/app.js'); lay_js = html.index('<script src="/assets/flow/layers.js')
    ok('…app.css is linked in <head> where the first block was; layers.css in <body> where the first of its blocks was (after the main script, before the layers), and it is preloaded so it comes with the rest',
       links[0][1] < head_end < links[1][1] and app_js < links[1][1] < lay_js and f'<link rel="preload" href="{links[1][0]}" as="style">' in html[:head_end], [links, head_end])
    ok('…the page is under 100 KB (it was 1.76 MB before n383, half a megabyte after it)', len(html) < 100000, len(html))
    v = {u: hashlib.sha256(open(os.path.join(BUILD, u.split('?')[0].lstrip('/')), 'rb').read()).hexdigest()[:10] for u, s in links}
    ok('…each file’s ?v= is the start of its SHA-256 (python3 _ci/seal_csp.py . writes them)', all(u.split('?v=')[1] == v[u] for u, s in links), v)

    app, lay = rd('assets', 'flow', 'app.css'), rd('assets', 'flow', 'layers.css'); A, B = HEAD.split(app), HEAD.split(lay)
    ok('The files · every block is there under the id it had, numbered in the order it was (27 from <head>, 68 from <body>)',
       [int(x) for x in A[1::4]] == list(range(1, len(A[1::4]) + 1)) and [int(x) for x in B[1::4]] == list(range(1, len(B[1::4]) + 1)) and len(A[1::4]) >= 27 and len(B[1::4]) >= 68
       and 'careteam-css' in ' '.join(A[3::4]) and 'pvx-n184-css' in ' '.join(B[3::4]) and B[3::4][-1].startswith('pvx-n3'), [len(A[1::4]), len(B[1::4])])
    def closed(t):
        bare = re.sub(r'/\*.*?\*/', '', t, flags=re.S); bare = re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', '""', bare); return bare.count('{') == bare.count('}') and '/*' not in bare
    open_ = [x for x, t in zip(A[3::4] + B[3::4], A[4::4] + B[4::4]) if not closed(t)]
    ok('…each block is closed (joined in one file, an open brace or comment would swallow the next block), and none has @import, a <style> tag or an address written from the page', not open_ and '@import' not in app + lay
       and not re.search(r'</?style', re.sub(r'/\*.*?\*/', '', app + lay, flags=re.S)) and all(u.strip('\'"').startswith(('/', 'data:')) for u in re.findall(r'url\(\s*([^)]+?)\s*\)', app + lay)), open_[:3])
    blk = flow_style('pvx-n184-css'); code = flow_code()
    ok('…a check finds a block by its old id (core.flow_style) and reads the page with its files (core.flow_code)', bool(blk) and 'PVX-N184' in blk and 'env(safe-area-inset-left' in blk and '.addpt-modal' in code and 'function renderAll' in code, len(blk or ''))

    c, p, e = await ctx(br)
    await p.evaluate(SEED3); await p.wait_for_timeout(600)
    sh = await p.evaluate(SHEETS); names = [x['what'] for x in sh]
    ia, il = names.index('/assets/flow/app.css'), names.index('/assets/flow/layers.css'); added = [k for k, x in enumerate(sh) if x['what'] in ('style#pvx-yakuri-css', 'style#pvx-account-css')]
    ok('Running · the browser reads both files whole: about 2,450 rules in app.css and 990 in layers.css, 3,900 in all (as many as the hundred blocks had)',
       sh[ia]['n'] >= 2400 and sh[il]['n'] >= 950 and sum(x['n'] for x in sh) >= 3900 and all(x['n'] >= 0 for x in sh), [sh[ia], sh[il], sum(x['n'] for x in sh)])
    ok('…in the same order of winning: app.css, then the styles the shared assets add to <head> (Yakuri, the account menu), then layers.css from <body>',
       sh[ia]['where'] == 'head' and sh[il]['where'] == 'body' and len(added) == 2 and all(ia < k < il for k in added), [names])
    lk = await p.evaluate(LOOK)
    ok('…and the page is dressed: the system font stack, the dark ground, the stage scrolling, the drawer fixed, the live region out of sight, the Luna mask found from the site’s root',
       'system-ui' in (lk['font'] or '') and lk['bg'] not in (None, 'rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)') and lk['stage'] in ('auto', 'scroll') and lk['drawer'] == 'fixed' and lk['sr'] == 'absolute'
       and '/assets/img/luna-mask.webp' in (lk['mask'] or '') and os.path.exists(os.path.join(BUILD, 'assets', 'img', 'luna-mask.webp')), lk)
    ok('…with no style block left in <body>', not [s for s in lk['styles'] if s.startswith('pvx-n3') or s in ('n251-css', 'fv-or-css')] and await p.evaluate("document.body.querySelectorAll(':scope > style').length") == 0, lk['styles'])
    for v_ in ('list', 'rooms', 'dashboard'):
        await p.evaluate(f"switchView('{v_}')"); await p.wait_for_timeout(500)
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(900)
    d = await p.evaluate("(()=>{ const dr=document.getElementById('drawer'), r=dr.getBoundingClientRect(); return [dr.classList.contains('open'), Math.round(r.width), Math.round(innerWidth-r.right)]; })()")
    ok('…the views and a patient open (the drawer at the right edge, its own width), with no page errors', d[0] and 300 <= d[1] <= 760 and abs(d[2]) <= 24 and not newerr(e), [d, newerr(e)[:3]])
    await c.close()

    if br.browser_type.name == 'chromium':
        c = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark')
        await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
        p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
        await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached')
        await p.evaluate("navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready)")
        kept = {}
        for _ in range(40):
            kept = await p.evaluate("""(async()=>{ const a=await caches.open('flow-assets-v1'), s=await caches.open('flow-shell-v1');
              return {files:(await a.keys()).map(r=>r.url.replace(location.origin,'')).filter(u=>u.indexOf('/assets/flow/')===0).sort(), page:(await s.keys()).length, ctl:!!navigator.serviceWorker.controller}; })()""")
            if kept['page'] and kept['ctl']: break
            await p.wait_for_timeout(250)
        named = sorted(set(re.findall(r'(?:src|href)="(/assets/flow/[^"]+)"', html)))
        ok('The service worker · live (Chromium): the saved page has its five files beside it, the two style files among them', kept.get('page') == 1 and kept.get('files') == named and len(named) == 5 and sum(1 for u in named if '.css?' in u) == 2, kept)
        await c.set_offline(True)
        try:
            await p.reload(); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached', timeout=15000); await p.wait_for_timeout(1200)
            off = await p.evaluate(SHEETS); lk2 = await p.evaluate(LOOK)
        except Exception as x: off = []; lk2 = {'error': str(x)[:200]}
        on = {x['what']: x['n'] for x in off}
        ok('…and with no connection Flow opens dressed: both files read whole, the same look', on.get('/assets/flow/app.css', 0) >= 2400 and on.get('/assets/flow/layers.css', 0) >= 950 and lk2.get('drawer') == 'fixed' and lk2.get('bg') == lk['bg'] and not newerr(e), [on, lk2, newerr(e)[:3]])
        await c.set_offline(False); await c.close()
