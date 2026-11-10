"""Pravix Flow — the n347 build's own checks (Nov 8 2026): HIG Offering help + Onboarding.
Search answers "help", "shortcuts" and "keyboard" with Keyboard shortcuts; every Close carries its key as a help tag. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
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


@section(id='t347', title='n347 · Offering help: search finds Keyboard shortcuts; every Close says its key', apps=['flow'], topics=['help'], engines=('chromium', 'webkit'))
async def s_t347(br):
    c, p, e = await ctx(br)
    r = {}
    for q in ('help', 'shortcuts', 'keyboard'):
        await p.fill('#globalSearch', q); await p.wait_for_timeout(500)
        r[q] = await p.evaluate("[...document.querySelectorAll('#searchResults .sr-item .sr-t')].map(e=>e.textContent.trim())")
    ok('Help · typing “help”, “shortcuts” or “keyboard” in search offers Keyboard shortcuts (search said “No matches”; only the ? key opened it)', all(v == ['Keyboard shortcuts'] for v in r.values()), r)
    await p.fill('#globalSearch', 'shortcuts'); await p.wait_for_timeout(500)
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.wait_for_timeout(700)
    s = await p.evaluate("(()=>{const k=document.querySelector('.pvx-ks'); return {open:!!k, title:k?k.querySelector('h2').textContent:'', focus:document.activeElement&&document.activeElement.className}})()")
    ok('Help · choosing it from the keyboard (↓, Return) opens the Keyboard shortcuts sheet with focus on its Close', s['open'] and s['title'] == 'Keyboard shortcuts' and 'pvx-ks-x' in (s['focus'] or ''), s)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    t = await p.evaluate("[...document.querySelectorAll('button.close, #usX')].map(b=>[b.id||'?', b.title])")
    ok('Help · every Close button carries the help tag “Close (Esc)” (none had one)', len(t) >= 9 and all(x[1] == 'Close (Esc)' for x in t if x[0] != '?'), t)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
