"""Treatment Sheets — the n297 build's own checks: HIG Machine learning and AirPlay (LUNA's speech recognition).
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

MAC = "Object.defineProperty(navigator,'platform',{get:()=>'MacIntel'})"
WIN = "Object.defineProperty(navigator,'platform',{get:()=>'Win32'})"


async def hint(br, init):
    ctx, pg, e = await ts(br, PORT, view='sheet', init=init)
    await pg.mouse.click(5, 880); await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(400)
    await pg.evaluate("document.getElementById('globalSearch').focus()")
    await pg.keyboard.type('temperature 101.5')
    await until(pg, "!!document.querySelector('.ts-cmd-hint.show kbd')", 4000)
    k = await pg.evaluate("document.querySelector('.ts-cmd-hint.show kbd').textContent")
    return ctx, pg, e, k


@section(id='t297', title='n297 · Treatment Sheets against HIG Machine learning and AirPlay',
         apps=['treatment'], topics=['voice', 'privacy'], engines=('chromium', 'webkit'))
async def s_t297(br):
    ctx, pg, e, k = await hint(br, WIN)
    ok('Machine learning: the typed-command hint’s keycap says “enter” on Windows (it said “return” everywhere)', k == 'enter', k)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await until(pg, "!!(window.__tsVoice&&__tsVoice.handle)", 5000)
    await pg.evaluate("__tsVoice.handle('what can I say')"); await pg.wait_for_timeout(500)
    n = await pg.evaluate("(()=>{const h=[...document.querySelectorAll('.fv-help')].filter(x=>x.getClientRects().length).pop();const t=h&&h.querySelector('.fv-note');return t?[t.textContent,getComputedStyle(t).fontSize]:null})()")
    ok('…LUNA’s “what can I say” list ends by saying where speech goes and what LUNA keeps (nothing said so)',
       n and n[0] == 'Your browser turns speech into text (in Chrome, on Google’s servers), so voice needs internet. LUNA keeps only what you save.', n)
    ok('no page errors (Windows)', not e, e[:2])
    await ctx.close()
    ctx, pg, e, k = await hint(br, MAC)
    ok('…and “return” on a Mac', k == 'return', k)
    ok('no page errors (Mac)', not e, e[:2])
    await ctx.close()
