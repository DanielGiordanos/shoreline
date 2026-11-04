"""Pravix Rounds — the n318 build's own checks: HIG Split views, Tab views and Activity views (Nov 3 2026),
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

SIDE = "(()=>{const s=document.getElementById('rdSide'),b=document.getElementById('rdSideBtn');return [getComputedStyle(s).display, b&&b.getAttribute('aria-expanded'), Math.round(document.getElementById('rdList').getBoundingClientRect().width)]})()"


@section(id='t318', title='n318 · Rounds follows the HIG Split views, Tab views and Activity views pages', apps=['rounds'], topics=['rounds', 'split-views', 'tab-views', 'sharing'], engines=('chromium', 'webkit'))
async def s_t318(br):
    c = await ctx(br); p, e = await open_(c)
    # ---- Split views: a named pane with headings, which can be hidden and brought back two ways, and is remembered
    a = await p.evaluate("[document.getElementById('rdSide').getAttribute('aria-label'), [...document.querySelectorAll('#rdSide [role=heading]')].map(h=>h.getAttribute('aria-level')+' '+h.textContent.trim())]")
    ok('Split views · the side panel is a named pane (“On Service and Tomorrow”) with its own headings (it was an unnamed region)', a[0] == 'On Service and Tomorrow' and '2 On Service' in a[1] and '2 Tomorrow' in a[1], a)
    s0 = await p.evaluate(SIDE)
    await p.click('#rdSideBtn'); await p.wait_for_timeout(400); s1 = await p.evaluate(SIDE)
    await p.keyboard.press('Control+Alt+Digit0'); await p.wait_for_timeout(400); s2 = await p.evaluate(SIDE)
    ok('…people can hide it to give the census room, and bring it back with the toolbar button or ⌥⌘0 / Ctrl+Alt+0',
       s0[0] != 'none' and s0[1] == 'true' and s1[0] == 'none' and s1[1] == 'false' and s1[2] > s0[2] + 150 and s2[0] != 'none' and s2[1] == 'true', (s0, s1, s2))
    await p.click('#rdSideBtn'); await p.wait_for_timeout(300)
    await p.reload(); await p.wait_for_timeout(2800); s3 = await p.evaluate(SIDE)
    ok('…and a hidden panel stays hidden when Rounds is opened again', s3[0] == 'none' and s3[1] == 'false', s3)
    sh = await p.evaluate("JSON.stringify(rdShortcutGroups())")
    ok('…the shortcut is in the ? sheet', 'Show or hide the side panel' in sh, sh[-160:])
    await p.evaluate("logout(); 0"); await p.wait_for_timeout(500)
    lg = await p.evaluate("[localStorage.getItem('pvx:rounds:side-off'), document.documentElement.classList.contains('rd-side-off')]")
    ok('…and it’s forgotten at Log out', lg == [None, False], lg)
    ok('no page errors (wide)', not newerr(e), e[:3]); await c.close()
    # ---- Split views on iPad: the panel is below the whole census, and the same button goes to it
    c = await ctx(br, viewport={'width': 1024, 'height': 768}, has_touch=True); p, e = await open_(c)
    b = await p.evaluate("(()=>{const b=document.getElementById('rdSideBtn'), s=document.getElementById('rdSide');return [b.textContent.trim(), b.getAttribute('aria-label'), b.getAttribute('aria-expanded'), Math.round(s.getBoundingClientRect().top)]})()")
    await p.click('#rdSideBtn'); await p.wait_for_timeout(1200)
    t = await p.evaluate("[Math.round(document.getElementById('rdSide').getBoundingClientRect().top), document.activeElement.textContent.trim(), getComputedStyle(document.getElementById('rdSide')).display]")
    ok('…on iPad, where the panel sits below the whole census, the button reads “Tomorrow” and goes straight to it',
       b[0] == 'Tomorrow' and 'Tomorrow' in b[1] and b[2] is None and b[3] > 1500 and 0 <= t[0] < 400 and t[1] == 'On Service' and t[2] != 'none', (b, t))
    # ---- Tab views → segmented controls: Status says which one is chosen
    await p.evaluate("(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true);})(); 0"); await p.wait_for_timeout(500)
    g = await p.evaluate("[...document.querySelectorAll('#rdList .rd-row.open .rd-acuity-seg')].map(g=>[g.getAttribute('role'),g.getAttribute('aria-label'),[...g.children].map(b=>b.getAttribute('aria-pressed')+(b.classList.contains('on')?'*':''))])")
    ok('Tab views (segmented controls on iPad and iPhone) · a patient’s Status says which one is chosen, like the shift picker (only its colour showed it)',
       g and g[0][0] == 'group' and g[0][1] == 'Status' and g[0][2].count('true*') == 1 and all(x in ('true*', 'false') for x in g[0][2]), g)
    # ---- Activity views: Share… carries the Share symbol
    s = await p.evaluate("(()=>{const b=document.querySelector('#rdList .rd-row.open [data-act=share]');const v=b&&b.querySelector('svg');return b&&[b.textContent.trim(), !!v, v&&v.getAttribute('aria-hidden')]})()")
    ok('Activity views · Share… (the share sheet on iPhone and iPad) carries the Share symbol people look for', s == ['Share…', True, 'true'], s)
    ok('no page errors (iPad)', not newerr(e), e[:3]); await c.close()
