"""Treatment Sheets — the n293 build's own checks: HIG App Shortcuts, Complications and Controls.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

X = "(()=>{const b=document.querySelector('.treatment-toolbar .ts-expand-btn');return b?[b.getAttribute('aria-label'),b.getAttribute('aria-pressed')]:null})()"
C = "(()=>{const b=document.querySelector('.dr-cap[aria-pressed]');return b?[b.getAttribute('aria-label'),b.getAttribute('aria-pressed'),b.getAttribute('aria-description')]:null})()"


@section(id='t293', title='n293 · Treatment Sheets against HIG App Shortcuts, Complications and Controls',
         apps=['treatment'], topics=['accessibility'], engines=('chromium', 'webkit'))
async def s_t293(br):
    ctx, pg, e = await ts(br, PORT, view='sheet')
    a = await pg.evaluate(X)
    await pg.mouse.click(5, 880); await pg.keyboard.press('Alt+e')
    await until(pg, "document.body.classList.contains('ts-expand')", 4000); await pg.wait_for_timeout(300)
    b = await pg.evaluate(X)
    ok('Controls: the Expand button keeps its name and says its state (it became “Exit full view”, heard as “Exit full view, selected”)',
       a == ['Expand the sheet', 'false'] and b == ['Expand the sheet', 'true'], [a, b])
    await pg.keyboard.press('Alt+e'); await pg.wait_for_timeout(400)
    c = await pg.evaluate(C)
    await pg.evaluate("document.querySelector('.dr-cap[aria-pressed]').click()"); await pg.wait_for_timeout(700)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    d = await pg.evaluate(C)
    ok('…Approval mode is “Approval mode”, on or off, with what it does as its description (its name was “Approval mode off” / “Approval mode on: …”)',
       c and c[0] == 'Approval mode' and c[1] in ('true', 'false') and c[2] and d and d[0] == 'Approval mode' and d[2], [c, d])
    ok('no page errors', not e, e[:2])
    await ctx.close()
