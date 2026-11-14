"""Pravix Flow — the n375 build's own checks (Nov 13 2026): HIG App Shortcuts (Flow's first look; the shortcuts are n207, n358,
n359) and Progress indicators (second look). Flow's shortcuts are findable where they exist: the Keyboard shortcuts sheet lists
them under "From Flow's icon" with how to reach them, and one tip, once, after the third patient added. Not in a browser tab,
not on iPhone or iPad."""
import os, json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'   # iPadOS asks for the desktop site


async def ctx(br, w=1440, h=900, mode=None):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', user_agent=MAC if w > 820 else IPAD)
    if w <= 820: o.update(has_touch=True, is_mobile=w < 700)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    if mode: await c.add_init_script(f"window.__pvxDisplayMode='{mode}';")
    if w <= 820: await c.add_init_script("Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});")   # a real iPad reports 5; WebKit's emulation reports 0   # an installed Flow (display-mode standalone), which a test browser can't be
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

SHEET = """(async()=>{ document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); await new Promise(r=>setTimeout(r,300));
  const b=document.querySelector('.pvx-ks .pvx-ks-body'); if(!b) return null; const h=[...b.querySelectorAll('h3')].map(x=>x.textContent), ic=b.querySelector('.pvx-ks-ic');
  const r={heads:h, how:(b.querySelector('.pvx-ks-how')||{}).textContent||null, items:ic?[...ic.querySelectorAll('li b')].map(x=>x.textContent):[], named:ic?ic.getAttribute('aria-labelledby'):null};
  document.querySelector('.pvx-ks-x').click(); return r; })()"""
ADD = """((n)=>{ for(let i=0;i<n;i++) commitPatient({name:'Tip'+(PATIENTS.length+1),last:'Test',owner:'Synthetic Test',status:'Waiting',room:'Lobby',prio:3,doctor:'unassigned',species:'Canine',
  arrival:new Date(),reason:'Vomiting',timeline:[]}); return PATIENTS.length; })"""
TIPS = "[...document.querySelectorAll('#notes .note')].map(n=>n.textContent).filter(t=>/Tip: New patient/.test(t))"


@section(id='t375', title='n375 · App Shortcuts: Flow’s shortcuts are findable where they exist (Keyboard shortcuts sheet, one tip); not in a browser tab or on iPhone and iPad',
         apps=['flow'], topics=['app-shortcuts', 'help'], engines=('chromium', 'webkit'))
async def s_t375(br):
    mf = json.load(open(os.path.join(BUILD, 'manifest.webmanifest'), encoding='utf-8'))
    names = [s['name'] for s in mf.get('shortcuts', [])]

    c, p, e = await ctx(br, mode='standalone')
    s = await p.evaluate(SHEET)
    ok('App Shortcuts · in the installed Flow on a Mac, the Keyboard shortcuts sheet lists Flow’s shortcuts under “From Flow’s icon”, in the manifest’s order, with how to reach them here',
       s and 'From Flow’s icon' in s['heads'] and s['items'] == names and len(names) == 4 and s['how'] == 'Right-click Flow in the Dock, or open the File menu.' and s['named'] == 'pvxKsIc', [s, names])
    await p.evaluate(f"({ADD})(2)"); await p.wait_for_timeout(2200); t2 = await p.evaluate(TIPS)
    await p.evaluate(f"({ADD})(1)"); await p.wait_for_timeout(2200); t3 = await p.evaluate(TIPS)
    ok('…after the third patient added, one tip says the shortcut exists (“Right-click Flow in the Dock for New patient, …”); none before',
       t2 == [] and len(t3) == 1 and 'Right-click Flow in the Dock for New patient' in t3[0], [t2, t3])
    await p.wait_for_timeout(6000)
    await p.evaluate(f"({ADD})(3)"); await p.wait_for_timeout(2200); t4 = await p.evaluate(TIPS)
    st = await p.evaluate("localStorage.getItem('pvx:flow:tip-sc')")
    ok('…and only once on this computer', t4 == [] and st == 'shown', [t4, st])
    ok('…no page errors (installed)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    s = await p.evaluate(SHEET)
    await p.evaluate(f"({ADD})(3)"); await p.wait_for_timeout(2200); t = await p.evaluate(TIPS)
    ok('…in a browser tab, where the Dock icon is the browser’s, neither the list nor the tip appears', s and 'From Flow’s icon' not in s['heads'] and t == [], [s, t])
    await c.close()

    c, p, e = await ctx(br, 820, 1180, mode='standalone')
    on = await p.evaluate("(()=>{ document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); return new Promise(r=>setTimeout(()=>r(!!document.querySelector('.pvx-ks .pvx-ks-ic')),300)); })()")
    await p.evaluate(f"({ADD})(3)"); await p.wait_for_timeout(2200); t = await p.evaluate(TIPS)
    ok('…on iPad (and iPhone), which don’t show web-app shortcuts, neither appears, even from the Home Screen', on is False and t == [], [on, t])
    ok('…no page errors (iPad)', not newerr(e), newerr(e))
    await c.close()
