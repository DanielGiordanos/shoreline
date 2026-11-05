"""Pravix Rounds — the n324 build's own checks: Census and Archive as a bottom tab bar on iPhone (Daniel, Nov 4 2026) (Nov 4 2026), on Rounds' own page.
Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, seed=None, user=FU, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', user).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    return c


async def open_(c, path='/rounds/', demo=True, wait=2800):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(wait)
    await p.evaluate("(()=>{const t=window.toast;window.__toasts=[];window.toast=function(m){window.__toasts.push(String(m));try{return t.apply(this,arguments)}catch(e){}}})()")
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return p, e

OPENB = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"

ITEMS = "[...document.querySelectorAll('.rd-menu [role^=menuitem],.rd-menu [role=separator]')].filter(i=>i.getClientRects().length).map(i=>i.getAttribute('role')==='separator'?'—':i.textContent.trim().replace(/\\s+/g,' '))"
CX = "[...document.querySelectorAll('.pvx-cx [role^=menuitem]:not(.back),.pvx-cx .back~[role=separator]')].filter((i,k,a)=>!(k===0&&i.previousElementSibling&&i.previousElementSibling.classList.contains('back'))).map(i=>i.getAttribute('role')==='separator'?'—':i.textContent.trim().replace(/\\s+/g,' '))"
SURN = lambda s: s.replace(' (you)', '').split(' · ')[0].split(' — ')[0].split()[-1].lower()


async def menu(p, js):
    await p.evaluate(js); await p.wait_for_timeout(350)
    it = await p.evaluate(ITEMS)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    await p.evaluate("typeof rdCloseMenus==='function'&&rdCloseMenus(); 0")
    return it


def docs(items):
    return [i for i in items if i.startswith('Dr. ')]


def az(items):
    s = [SURN(i) for i in items]; return s == sorted(s)



TB = """(()=>{const s=document.getElementById('switcherRd'), b=s.getBoundingClientRect(), cs=getComputedStyle(s);
  return {on:document.documentElement.classList.contains('rd-tabbar'), pos:cs.position, bottom:Math.round(innerHeight-b.bottom), h:Math.round(b.height),
    tabs:[...s.querySelectorAll('.seg')].map(x=>{const r=x.getBoundingClientRect(); return [x.textContent.trim(),Math.round(r.width),Math.round(r.height),x.getAttribute('aria-current')]}),
    pad:parseFloat(getComputedStyle(document.body).paddingBottom), sub:Math.round(document.getElementById('subnavRd').getBoundingClientRect().height)}})()"""


@section(id='t324', title='n324 · Rounds: Census and Archive as a bottom tab bar on iPhone', apps=['rounds'], topics=['rounds', 'tab-bars'], engines=('chromium', 'webkit'))
async def s_t324(br):
    c = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); p, e = await open_(c)
    t = await p.evaluate(TB)
    ok('Tab bars · on iPhone, Census and Archive are a tab bar at the bottom, as in Flow and Treatment (they sat at the top in the sub-nav)',
       t['on'] and t['pos'] == 'fixed' and t['bottom'] == 0 and [x[0] for x in t['tabs']] == ['Census', 'Archive'] and all(x[1] >= 150 and x[2] >= 44 for x in t['tabs']) and t['tabs'][0][3] == 'page', t)
    ok('…the page keeps room for it, and the sub-nav is one row (the search)', t['pad'] >= 58 and t['sub'] <= 90, t)
    await p.evaluate("document.querySelectorAll('#switcherRd .seg')[1].click(); 0"); await p.wait_for_timeout(600)
    a = await p.evaluate("[document.title, [...document.querySelectorAll('#switcherRd .seg')].map(x=>x.getAttribute('aria-current'))]")
    ok('…and it switches views: Archive is marked current', a == ['Archive', [None, 'page']], a)
    await p.evaluate("document.querySelectorAll('#switcherRd .seg')[0].click(); 0"); await p.wait_for_timeout(500)
    await p.evaluate("document.getElementById('rdStartBtn').click(); 0"); await p.wait_for_timeout(600)
    cov = await p.evaluate("(()=>{const s=document.querySelector('#switcherRd .seg'), r=s.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return !!el&&!s.contains(el)})()")
    ok('…Rounds mode covers it, as a modal should', cov, cov)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
    c = await ctx(br); p, e = await open_(c)
    m = await p.evaluate(TB)
    ok('…on a Mac and iPad the switcher stays in the sub-nav', not m['on'] and m['pos'] != 'fixed', m)
    await c.close()
