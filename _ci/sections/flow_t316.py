"""Pravix Rounds — the n316 build's own checks: HIG Boxes, Collections, Column views and Disclosure controls (Nov 3 2026),
on Rounds' own page. Chromium and WebKit."""
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
ANG = """(s=>{const el=document.querySelector(s); if(!el) return null; let n=el,t=0; while(n&&n.tagName!=='BUTTON'){ const m=getComputedStyle(n).transform; if(m&&m!=='none'){ const q=m.slice(7,-1).split(',').map(Number); t+=Math.round(Math.atan2(q[1],q[0])*180/Math.PI);} n=n.parentElement; }
  const b=n.getBoundingClientRect(), c=el.getBoundingClientRect(); return [t, c.left < b.left+b.width/2 ? 'leading':'trailing'];})"""


@section(id='t316', title='n316 · Rounds follows the HIG Boxes, Collections, Column views and Disclosure controls pages', apps=['rounds'], topics=['rounds', 'boxes', 'collections', 'disclosure'], engines=('chromium', 'webkit'))
async def s_t316(br):
    c = await ctx(br); p, e = await open_(c)
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    # ---- Disclosure controls
    res = {}
    for k, sel in [('attn', '.rd-row.open .rd-attn-toggle'), ('dis', '.rd-row.open .rd-discharge-toggle')]:
        a = await p.evaluate("(%s)('%s svg')" % (ANG, sel))
        await p.click(sel); await p.wait_for_timeout(450)
        b = await p.evaluate("(%s)('%s svg')" % (ANG, sel)); x = await p.evaluate("document.querySelector('%s').getAttribute('aria-expanded')" % sel)
        res[k] = [a, b, x]
    ok('Disclosure controls · Needs Attention and Discharge Readiness are disclosure triangles like the census sections: leading edge, pointing in when closed and down when open (they were trailing buttons pointing down, then up)',
       all(v[0] == [-90, 'leading'] and v[1] == [0, 'leading'] and v[2] == 'true' for v in res.values()), res)
    sec = await p.evaluate("(%s)('[data-act=sec-toggle] svg')" % ANG)
    ok('…the same as a census section open (down, leading)', sec == [0, 'leading'], sec)
    # ---- Boxes
    g = await p.evaluate("""(()=>{const r=document.querySelector('.rd-row.open');const gs=[...r.querySelectorAll('[role=group][aria-labelledby]')];
      return gs.map(x=>{const h=document.getElementById(x.getAttribute('aria-labelledby'));return [h&&h.getAttribute('role'),h&&h.getAttribute('aria-level'),(h&&h.textContent||'').trim().slice(0,18)]})})()""")
    names = [x[2] for x in g]
    ok('Boxes · each box in an open patient is a named group whose title is a heading, so VoiceOver can move box to box (titles were plain text)',
       len(g) >= 6 and all(x[0] == 'heading' and x[1] == '3' for x in g) and any(n.startswith('Active Problems') for n in names) and any(n.startswith('Diagnostics') for n in names), g)
    # ---- Collections: KPI tiles and Archive days
    k0 = await p.evaluate("[...document.querySelectorAll('[data-act=kpi]')].map(b=>(b.dataset.key||'all')+':'+b.getAttribute('aria-pressed'))")
    await p.evaluate("document.querySelector('[data-act=kpi][data-key=critical]').click()"); await p.wait_for_timeout(400)
    k1 = await p.evaluate("[document.querySelector('[data-act=kpi][data-key=critical]').getAttribute('aria-pressed'), document.querySelector('[data-act=kpi]:not([data-key]),[data-act=kpi][data-key=\"\"]')?.getAttribute('aria-pressed')]")
    ok('Collections · the KPI tiles say which one is chosen, like the service chips (they gave no state)', 'all:true' in k0 and k1[0] == 'true' and k1[1] in ('false', None), (k0, k1))
    await p.evaluate("document.querySelector('[data-act=kpi][data-key=critical]').click()"); await p.wait_for_timeout(300)
    await p.evaluate("switchRdView('archive')"); await p.wait_for_timeout(600)
    d = await p.evaluate("[...document.querySelectorAll('#rdArchiveBody .rd-arcday')].map(b=>[b.getAttribute('aria-label'),b.getAttribute('aria-pressed'),b.innerText.replace(/\\s+/g,' ')])")
    ok('…and each Archive day reads as a date, with the chosen one marked (it read “3 TUE Nov”)', d and all(x[0] and ',' in x[0] and x[1] in ('true', 'false') for x in d) and any(x[1] == 'true' for x in d), d)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
