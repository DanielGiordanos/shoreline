"""Pravix Flow — the n368 build's own checks (Nov 12 2026): HIG Popovers + Scroll views (Flow's first look at both).
The scroll keys work with nothing focused; the board's next stage peeks in on iPhone and iPad portrait; the unused
starfield styles are gone; pop-ups stay one at a time and switch in one click."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEED40 = """(()=>{ const now=Date.now(); for(let i=0;i<40;i++) PATIENTS.push(patient({name:'Scroll'+i,last:'Test',owner:'Synthetic',status:['Waiting','Exam'][i%2],room:'Lobby',arrival:new Date(now-(i+5)*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]})); renderAll(); })()"""
Y = "document.getElementById('stage').scrollTop"


async def ctx(br, w=1440, h=900, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', reduced_motion='reduce')
    if touch or w < 700: o.update(has_touch=True, is_mobile=True)
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
    await p.evaluate(SEED40); await p.wait_for_timeout(400)
    return c, p, e


@section(id='t368', title='n368 · Scroll views and Popovers: scroll keys with nothing focused, the board’s next stage peeks in, one pop-up at a time', apps=['flow'], topics=['scroll-views', 'popovers'], engines=('chromium', 'webkit'))
async def s_t368(br):
    c, p, e = await ctx(br)
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(900)
    await p.evaluate("document.getElementById('stage').scrollTop=0; document.activeElement&&document.activeElement.blur&&document.activeElement.blur()"); await p.wait_for_timeout(200)
    h = await p.evaluate("document.getElementById('stage').clientHeight")
    seq = {}
    for k in ['PageDown', 'ArrowDown', 'PageUp', 'End', 'Home']:
        await p.keyboard.press(k); await p.wait_for_timeout(250); seq[k] = await p.evaluate(Y)
    ok('Scroll views · with nothing focused, Page Down scrolls the view a page less one line of overlap (it did nothing)', abs(seq['PageDown'] - (h - 48)) <= 2, [h, seq])
    ok('…↓ scrolls a line, Page Up goes back a page, End to the bottom and Home to the top', seq['ArrowDown'] == seq['PageDown'] + 40 and seq['PageUp'] == 40 and seq['End'] > 1000 and seq['Home'] == 0, seq)
    await p.focus('#searchInput') if await p.evaluate("!!document.getElementById('searchInput')") else await p.evaluate("document.querySelector('.search input').focus()")
    await p.keyboard.press('End'); await p.wait_for_timeout(250)
    ok('…keys typed in a field stay in the field (End doesn’t scroll the view)', await p.evaluate(Y) == 0, await p.evaluate(Y))
    await p.evaluate("document.activeElement.blur(); showConfirm('Clear all attention items?','Clear all',()=>{},{danger:true})"); await p.wait_for_timeout(300)
    await p.evaluate("document.activeElement.blur()"); await p.keyboard.press('PageDown'); await p.wait_for_timeout(250)
    ok('…and nothing scrolls behind an open alert', await p.evaluate(Y) == 0, await p.evaluate(Y))
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    css = await p.evaluate("[...document.styleSheets].reduce((n,s)=>{ try{ return n+[...s.cssRules].filter(r=>/stars-|#starfield|animStar/.test(r.cssText)).length; }catch(x){ return n; } },0)")
    ok('Housekeeping · the starfield’s unused styles are gone (no page draws one)', css == 0 and not await p.evaluate("!!document.querySelector('#starfield,.stars-small,.stars-medium,.stars-large')"), css)
    await p.evaluate("switchView('flow'); openDrawer(PATIENTS.find(isActive).id)"); await p.wait_for_timeout(900)
    t = await p.evaluate("[...document.querySelectorAll('#drawer .dd-trigger')].filter(x=>x.offsetParent).slice(0,2).map(x=>{ const r=x.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]; })")
    await p.mouse.click(*t[0]); await p.wait_for_timeout(400); await p.mouse.click(*t[1]); await p.wait_for_timeout(400)
    o = await p.evaluate("[[...document.querySelectorAll('#drawer .dd-trigger')].filter(x=>x.offsetParent).slice(0,2).map(x=>x.getAttribute('aria-expanded')), [...document.querySelectorAll('.dd-panel')].filter(x=>!x.closest('.pvx-closed')&&getComputedStyle(x).display!=='none'&&getComputedStyle(x).visibility!=='hidden'&&x.getBoundingClientRect().height>10).length]")
    ok('Popovers · one at a time, and one click closes one and opens the next', o == [['false', 'true'], 1], o)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    for w, hh in ((390, 844), (820, 1180)):
        c, p, e = await ctx(br, w, hh, touch=True)
        await p.evaluate("switchView('flow')"); await p.wait_for_timeout(800)
        k = await p.evaluate(f"(()=>{{ const b=document.getElementById('board'), r=b.getBoundingClientRect(), cols=[...b.querySelectorAll('.col')]; const n=cols[1].getBoundingClientRect(); return [Math.round(Math.min(r.right,{w})-n.left), b.scrollWidth>b.clientWidth, Math.round(cols[0].getBoundingClientRect().width)]; }})()")
        ok(f'Scroll views · at {w} pt the board’s next stage shows at the edge (≥ 40 pt), so it’s plain the board scrolls sideways', k[0] >= 40 and k[1] and k[2] >= 290, k)
        await c.close()
