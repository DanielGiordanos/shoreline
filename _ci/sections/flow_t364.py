"""Pravix Flow — the n364 build's own checks (Nov 11 2026): HIG Token fields + Activity rings.
Add patient's Reason for visit: the ✕ is the Close symbol, problems can be put in order (menu and ⌥←/⌥→), the token's
menu has commands only with Remove last, and what was typed shows in the token's tooltip. Activity rings don't apply."""
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

CHIPS = "[...document.querySelectorAll('#apProblemsChips .rvp-chip-t')].map(x=>x.textContent)"


async def add(p, words):
    for t in words:
        await p.focus('#apReason'); await p.keyboard.type(t); await p.wait_for_timeout(350); await p.keyboard.press('Enter'); await p.wait_for_timeout(300)


@section(id='t364', title='n364 · Token fields: the Close symbol, problems in order, a menu of commands; Activity rings don’t apply', apps=['flow'], topics=['token-fields', 'activity-rings'], engines=('chromium', 'webkit'))
async def s_t364(br):
    c, p, e = await ctx(br)
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(600)
    await add(p, ['not eating for 3 days', 'limping'])
    x = await p.evaluate("""(()=>{ const b=document.querySelector('#apProblemsChips .rvp-chip-x'); return {svg:!!b.querySelector('svg'), txt:b.textContent.trim(), name:b.getAttribute('aria-label'), tip:document.querySelector('#apProblemsChips .rvp-chip-t').title}; })()""")
    ok('Token fields · a token’s ✕ is the Close symbol (not a typed “×”), named “Remove …”', x['svg'] and x['txt'] == '' and x['name'].startswith('Remove '), x)
    ok('…a matched token’s tooltip says what was typed (“Edit · typed “not eating for 3 days””)', x['tip'] == 'Edit · typed “not eating for 3 days”', x)
    a = await p.evaluate(CHIPS)
    await p.focus('#apReason'); await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(150); await p.keyboard.press('Alt+ArrowLeft'); await p.wait_for_timeout(300)
    b = await p.evaluate(CHIPS); say = await p.evaluate("document.getElementById('apTokLive').textContent")
    ok('Token fields · ⌥← moves the selected problem earlier, and it’s announced', b == [a[1], a[0]] and 'moved earlier, 1 of 2' in say and 'main reason' in say, [a, b, say])
    await p.keyboard.press('Alt+ArrowRight'); await p.wait_for_timeout(300)
    ok('…⌥→ moves it back later', await p.evaluate(CHIPS) == a, await p.evaluate(CHIPS))
    await p.keyboard.press('Escape'); await p.wait_for_timeout(150)
    await p.locator('#apProblemsChips .rvp-chip').nth(1).click(button='right', force=True); await p.wait_for_timeout(400)
    m = await p.evaluate("""(()=>{ const m=[...document.querySelectorAll('[role=menu]')].filter(x=>x.offsetParent).pop(); return m&&{items:[...m.querySelectorAll('[role^=menuitem]')].map(b=>b.textContent.trim()), off:[...m.querySelectorAll('[role^=menuitem][aria-disabled=true]')].length, sep:!!m.querySelector('[role=separator]')}; })()""")
    ok('Token fields · the token’s menu has commands only: Edit, Move earlier, then Remove last after a separator', m and m['items'] == ['Edit', 'Move earlier', 'Remove'] and m['off'] == 0 and m['sep'], m)
    await p.locator('[role=menu] [role^=menuitem]', has_text='Move earlier').last.click(); await p.wait_for_timeout(300)
    ok('…Move earlier from the menu puts it first', await p.evaluate(CHIPS) == [a[1], a[0]], await p.evaluate(CHIPS))
    s = await p.evaluate("(()=>{ const r=document.querySelectorAll('[class*=ring]'); return [...r].map(x=>x.className).filter(c=>/activity|move|exercise|stand/i.test(c)); })()")
    ok('Activity rings · Flow shows no Activity rings and no ring styled after them', s == [], s)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
