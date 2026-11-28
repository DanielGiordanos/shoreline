"""Anesia — the n452 build's own checks (Nov 28 2026): HIG Popovers (Page controls: none; Panels: macOS only).
A tall popover (Vitals) came down over the reading that was clicked, and switching popovers took two clicks."""
from core import *
from helpers import *

GEO = """(sel=>{const a=document.querySelector(sel).getBoundingClientRect(),w=document.querySelector('#anSheet');if(!w)return null;const s=w.querySelector('.an-sheet').getBoundingClientRect();
const ov=!(s.bottom<=a.top||s.top>=a.bottom||s.right<=a.left||s.left>=a.right);
return {pop:w.classList.contains('pop'),title:w.querySelector('#anShT').textContent,over:ov,inside:s.top>=0&&s.bottom<=innerHeight+1&&s.left>=0&&s.right<=innerWidth+1,s:[Math.round(s.top),Math.round(s.bottom),Math.round(s.left),Math.round(s.right)],a:[Math.round(a.top),Math.round(a.bottom),Math.round(a.left),Math.round(a.right)]}})"""


async def open_at(pg, prefix):
    sel = f'.an-chart [aria-label^="{prefix}"]'
    loc = pg.locator(sel).first
    await loc.scroll_into_view_if_needed(); await loc.click(); await pg.wait_for_timeout(500)
    return await pg.evaluate(GEO + f"('{sel}')")


@section(id='a452', title='n452 · Anesia · Popovers: a chart mark’s popover never covers the mark that opened it; one click outside closes it and opens the next',
         apps=['anesia'], topics=['popovers', 'chart'], engines=('chromium', 'webkit'))
async def s_a452(br):
    errs = []
    ctx, pg, e = await new_page(br, vp=(1180, 700))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(900)
    res = {}
    for k in ('HR ', 'RR ', 'Blood pressure', 'SpO₂', 'Temp ', 'Dexmedetomidine', 'Induction at'):
        res[k] = await open_at(pg, k)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    bad = {k: v for k, v in res.items() if not v or not v['pop'] or v['over'] or not v['inside']}
    ok('Popovers · on a 1180 × 700 window, no chart mark’s popover covers the mark that opened it, and each stays in the window (Vitals, 472 pt, came down over the reading)',
       not bad, bad or {k: v['s'] for k, v in res.items()})
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(1440, 900))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(900)
    await pg.evaluate("window.scrollBy(0, 420)"); await pg.wait_for_timeout(400)   # the event row comes into view
    # candidates first (with no sheet open, the chart isn't inert): events whose centre is the mark itself
    cands = await pg.evaluate("""[...document.querySelectorAll('.an-chart .an-mk.ev')].map(m=>{const r=m.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,t=document.elementFromPoint(x,y);
      return [x,y,m.getAttribute('aria-label').split(' at ')[0], !!t&&t.closest('.an-mk')===m]}).filter(c=>c[3]&&c[2]!=='Positioned'&&c[1]>0&&c[1]<innerHeight)""")
    await pg.locator('.an-chart [aria-label^="Positioned at"]').first.click(); await pg.wait_for_timeout(500)
    a = {'title': await pg.evaluate("document.querySelector('#anSheet #anShT')?.textContent")}
    s0 = await pg.evaluate("(()=>{const s=document.querySelector('#anSheet .an-sheet').getBoundingClientRect();return [s.left,s.top,s.right,s.bottom]})()")
    pick = next((c for c in cands if not (s0[0] - 4 <= c[0] <= s0[2] + 4 and s0[1] - 4 <= c[1] <= s0[3] + 4)), None)
    t = n = None
    if pick:
        await pg.mouse.click(pick[0], pick[1]); await pg.wait_for_timeout(700)
        t = await pg.evaluate("document.querySelector('#anSheet #anShT')?.textContent")
        n = await pg.evaluate("document.querySelectorAll('#anSheet').length")
    ok('Popovers · with Positioned’s popover open, one click on another event closes it and opens that one’s (it took two)',
       a and a['title'] == 'Positioned' and pick and t == pick[2] and n == 1, [a and a['title'], pick, t, n])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ok('…Esc still closes it', not await pg.evaluate("!!document.querySelector('#anSheet')"))
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
