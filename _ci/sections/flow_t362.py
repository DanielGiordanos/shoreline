"""Pravix Flow — the n362 build's own check (Nov 11 2026): the board view is named "Board"; Flow is only the app's name.
The view id stays `flow`, so #view=flow, ⌥3 and saved views keep working."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e


@section(id='t362', title='n362 · the board view is “Board”; Flow is the app', apps=['flow'], topics=['writing', 'tab-bars'], engines=('chromium', 'webkit'))
async def s_t362(br):
    c, p, e = await ctx(br)
    await p.keyboard.press('Alt+3'); await p.wait_for_timeout(500)
    m = await p.evaluate("""(()=>{ const b=document.querySelector('#switcher .seg[data-view=flow]'); return {view:currentView, label:b.textContent.trim(), title:b.getAttribute('title'), h1:document.querySelector('#view-flow h1').textContent.trim(),
      app:document.getElementById('navFlow').getAttribute('title'), nav:document.getElementById('switcher').getAttribute('aria-label')}; })()""")
    ok('Writing · the board view is “Board” in the sub-nav and its heading, and ⌥3 still opens it; the app keeps the name Flow', m['view'] == 'flow' and m['label'] == 'Board' and m['title'].startswith('Show Board') and m['h1'] == 'Board' and m['app'] == 'Flow' and m['nav'] == 'Flow views', m)
    await p.keyboard.press('?'); await p.wait_for_timeout(500)
    k = await p.evaluate("document.body.innerText.includes('Board') && !/\\bFlow\\b\\s*⌥?\\s*3/.test(document.body.innerText)")
    ok('…the Keyboard shortcuts sheet lists it as Board', k, k)
    await p.keyboard.press('Escape'); await c.close()
    c, p, e2 = await ctx(br, 390, 844, True)
    t = await p.evaluate("[...document.querySelectorAll('#switcher .seg')].filter(b=>b.offsetParent).map(b=>b.textContent.trim())")
    ok('…and in the iPhone tab bar: Command, Patients, Board, Rooms, Consent forms', t[:4] == ['Command', 'Patients', 'Board', 'Rooms'], t)
    ok('…no page errors', not newerr(e) and not newerr(e2), newerr(e) + newerr(e2))
    await c.close()
