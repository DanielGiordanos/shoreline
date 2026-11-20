"""Pravix OR — the n409 build's own checks (Nov 18 2026): the case details beside the page, sized to the window.
n407 made them an inspector from 1024 pt; at 1024 the Board's rooms squeezed to 243 pt each (text collided), the Schedule
showed three hours and Cases scrolled sideways. The inspector now starts at 1180 pt, is 400 pt wide below 1366 pt (470
above), the page makes room for exactly that, and the Board's rooms keep at least 320 pt each. Below 1180 the details are
a sheet over the page again."""
import core
from core import ok, section
import or_t390 as T

LAY = """(()=>{const d=document.getElementById('drawer').getBoundingClientRect(), g=document.getElementById('roomGrid'),
  rooms=[...g.children].filter(x=>x.getClientRects().length).map(r=>Math.round(r.getBoundingClientRect().width));
  return {ins:document.body.classList.contains('or-inspect'), inert:!!document.querySelector('.app').inert, w:Math.round(d.width),
    rooms, beside:Math.round(g.getBoundingClientRect().right)<=Math.round(d.left), page:document.documentElement.scrollWidth<=innerWidth}})()"""


@section(id='t409', title='n409 · OR · the case details beside the page, sized to the window: a sheet below 1180 pt, a 400 pt inspector to 1365 pt, 470 above, rooms never under 320 pt',
         apps=['or'], topics=['split'], engines=('chromium', 'webkit'))
async def s_t409(br):
    res = {}
    for vp, touch in [((1024, 768), False), ((1180, 820), True), ((1280, 800), False), ((1440, 900), False)]:
        c, p, e = await T.open_or(br, vp=vp, touch=touch)
        await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(700)
        res[vp[0]] = await p.evaluate(LAY)
        if vp[0] == 1180:
            await p.evaluate("closeDrawer(); switchView('cases')"); await p.wait_for_timeout(400)
            await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(600)
            res['cases'] = await p.evaluate("[document.documentElement.scrollWidth<=innerWidth, document.body.classList.contains('or-inspect')]")
            await p.click('#casesBody tr[data-id="or390c5"]'); await p.wait_for_timeout(600)
            res['switch'] = await p.evaluate("UI.drawerId")
        res.setdefault('errors', []).extend(e)
        await c.close()
    a, b, m, w = res[1024], res[1180], res[1280], res[1440]
    ok('Split views · at 1024 pt the details are a sheet over the page again (the inspector squeezed the Board’s rooms to 243 pt and text collided)',
       a['ins'] is False and a['inert'] is True, a)
    ok('…from 1180 pt (iPad landscape) they are a 400 pt inspector beside the page, and the Board keeps both rooms side by side at 320 pt or more',
       b['ins'] and b['w'] == 400 and b['beside'] and len(b['rooms']) == 2 and min(b['rooms']) >= 320 and b['page'], b)
    ok('…at 1280 pt the same, and from 1366 pt the inspector is 470 pt as before', m['ins'] and m['w'] == 400 and m['beside'] and min(m['rooms']) >= 320
       and w['ins'] and w['w'] == 470 and w['beside'] and min(w['rooms']) >= 320, (m, w))
    ok('…in Cases at 1180 pt nothing scrolls the page sideways, and one click on another case shows it', res['cases'] == [True, True] and res['switch'] == 'or390c5', (res['cases'], res['switch']))
    ok('no page errors', not res['errors'], res['errors'])
