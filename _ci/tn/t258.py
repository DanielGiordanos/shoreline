"""n258 · light or dark follows the person, not the computer. python3 t258.py SITE_DIR  (WK=1 for WebKit)"""
import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import h
from playwright.async_api import async_playwright
SITE = sys.argv[1]; PORT = h.serve(SITE)
R = []
def ok(n, c, x=''):
    R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  ' + str(x)[:500]))
A = {"uid": "uA", "email": "daniel.giordano@pravix.app", "displayName": "Daniel Giordano"}
B = {"uid": "uB", "email": "resident.a@vca.com", "displayName": "Resident A"}
async def browser_ctx(br, sysdark, cookie=None):
    ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark' if sysdark else 'light')
    if cookie: await ctx.add_cookies([{'name': 'pvx_theme', 'value': cookie, 'url': f'http://127.0.0.1:{PORT}/'}])
    return ctx
async def open_page(ctx, path, user, seed=None, wait=2600):
    s = json.loads(h.SEED); s.update(seed or {})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: None if 'collectionGroup' in str(e) else errs.append(str(e)))   # the fake Firebase has no collectionGroup (Flow, before n258 too)
    await pg.add_init_script(h.INIT.replace('@@USER@@', json.dumps(user) if user else 'null').replace('@@SEED@@', json.dumps(s)))
    await pg.add_init_script(h.FAKE)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=h.STUB.get(u.rsplit('/', 1)[-1], ''))
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    await pg.goto(f'http://127.0.0.1:{PORT}/{path}'); await pg.wait_for_timeout(wait)
    return pg, errs
DARK = "(()=>document.body.classList.contains('dark'))()"
PREF = "(uid=>{const d=(window.__fs||{})['ts_prefs/'+uid];return d?(d.theme===undefined?null:d.theme):null})"
async def main():
    async with async_playwright() as pw:
        br = await (pw.webkit if os.environ.get('WK') else pw.chromium).launch()
        # 1. a person's choice is theirs: A chooses light on a dark-system shared computer
        ctx = await browser_ctx(br, True)
        pg, e = await open_page(ctx, 'treatment/', A)
        a0 = await pg.evaluate(DARK)
        await pg.click('.theme-toggle'); await pg.wait_for_timeout(500)
        a1 = [await pg.evaluate(DARK), await pg.evaluate(PREF + "('uA')"), await pg.evaluate("localStorage.getItem('pvx:theme:uA')")]
        ok('Never chosen: Treatment opens in the device’s appearance (dark here)', a0 is True, a0)
        ok('Pressing the switch saves light to Daniel’s account (ts_prefs/uA.theme) and to this browser for him', a1 == [False, 'light', 'light'], a1)
        ok('no page errors (Treatment)', not e, e[:2]); await pg.close()
        # the next person on the same computer gets their own (never chosen: the device's dark)
        pg, e = await open_page(ctx, 'treatment/', B)
        b0 = await pg.evaluate(DARK); await pg.close()
        ok('The next person on the same computer gets their own appearance (Resident A: the device’s dark), not Daniel’s light', b0 is True, b0)
        # Daniel again on this computer, in other apps
        res = {}
        for path in ['', 'or/', 'anesia/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/curriculum/', 'forms/']:
            pg, e = await open_page(ctx, path, A, seed={'ts_prefs/uA': {'theme': 'light'}}, wait=3000)
            res[path or 'flow'] = [await pg.evaluate(DARK), e[:1]]; await pg.close()
        ok('Daniel’s light follows him into Flow, OR, Anesia, Directory, Scheduling, SGVP, the curriculum and Forms', all(v[0] is False for v in res.values()), res)
        ok('no page errors in those apps', all(not v[1] for v in res.values()), {k: v[1] for k, v in res.items() if v[1]})
        await ctx.close()
        # 2. a different computer: his account brings it
        ctx = await browser_ctx(br, True)
        pg, e = await open_page(ctx, 'treatment/', A, seed={'ts_prefs/uA': {'theme': 'light'}})
        c0 = await pg.evaluate(DARK); await pg.close(); await ctx.close()
        ok('On another computer Daniel signs in and gets light from his account', c0 is False, c0)
        # 3. press back: matching the device clears the choice, and the device leads again (live)
        ctx = await browser_ctx(br, True)
        pg, e = await open_page(ctx, 'treatment/', A, seed={'ts_prefs/uA': {'theme': 'light'}})
        await pg.click('.theme-toggle'); await pg.wait_for_timeout(500)
        d1 = [await pg.evaluate(DARK), await pg.evaluate(PREF + "('uA')"), await pg.evaluate("localStorage.getItem('pvx:theme:uA')")]
        await pg.emulate_media(color_scheme='light'); await pg.wait_for_timeout(500); d2 = await pg.evaluate(DARK)
        await pg.emulate_media(color_scheme='dark'); await pg.wait_for_timeout(500); d3 = await pg.evaluate(DARK)
        ok('Pressing back to the device’s look clears his choice (account and browser)', d1 == [True, None, None], d1)
        ok('…and then the device leads again, live (light by day, dark at night)', d2 is False and d3 is True, [d2, d3])
        await pg.close(); await ctx.close()
        # a choice that differs from the device holds when the device switches
        ctx = await browser_ctx(br, True)
        pg, e = await open_page(ctx, 'treatment/', A, seed={'ts_prefs/uA': {'theme': 'light'}})
        await pg.emulate_media(color_scheme='light'); await pg.wait_for_timeout(300); await pg.emulate_media(color_scheme='dark'); await pg.wait_for_timeout(500)
        f0 = await pg.evaluate(DARK); await pg.close(); await ctx.close()
        ok('A person’s choice holds when the device switches', f0 is False, f0)
        # 4. signed out: the device's setting; the old shared cookie no longer decides
        ctx = await browser_ctx(br, True, cookie='light')
        pg, e = await open_page(ctx, 'treatment/', B)
        g0 = await pg.evaluate(DARK)
        await pg.evaluate("firebase.auth().signOut()"); await pg.wait_for_timeout(500)
        g1 = [await pg.evaluate(DARK), await pg.evaluate("localStorage.getItem('pvx:theme:last')")]
        await pg.close(); await ctx.close()
        ok('The old shared cookie (“light”, set by whoever pressed it last) no longer decides for someone who never chose', g0 is True, g0)
        ok('Signing out leaves the device’s setting, and forgets who was last', g1 == [True, None], g1)
        # 5. the page's own switch still works everywhere, and client pages are left alone
        ctx = await browser_ctx(br, True)
        sw = {}
        for path in ['', 'or/', 'directory/', 'sgvp/', 'sgvp/mentors/']:
            pg, e = await open_page(ctx, path, A, wait=3000)
            x0 = await pg.evaluate(DARK)
            try: await pg.click('.theme-toggle', timeout=3000)
            except Exception as ex: sw[path or 'flow'] = 'no switch'; await pg.close(); continue
            await pg.wait_for_timeout(500); x1 = await pg.evaluate(DARK)
            await pg.click('.theme-toggle'); await pg.wait_for_timeout(500); x2 = await pg.evaluate(DARK)
            sw[path or 'flow'] = [x0, x1, x2, e[:1]]; await pg.close()
        ok('Each app’s own switch still switches, and back (Flow, OR, Directory, SGVP, Mentors)', all(isinstance(v, list) and v[0] != v[1] and v[2] == v[0] and not v[3] for v in sw.values()), sw)
        cl = {}
        for path in ['checkin/', 'track.html', 'v/']:
            t = open(os.path.join(SITE, path if path.endswith('.html') else path + 'index.html'), encoding='utf-8').read()
            cl[path] = 'pvx-appearance.js' in t
        ok('Client pages (Check-In, the owner tracker, verify) don’t load it', not any(cl.values()), cl)
        await ctx.close(); await br.close()
    print(f'{sum(R)}/{len(R)}')
asyncio.run(main())
