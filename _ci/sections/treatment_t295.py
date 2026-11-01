"""Treatment Sheets — the n295 build's own checks: HIG Keyboards and Nearby interactions.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

ROWS = """[...document.querySelectorAll('.pvx-ks-body dt')].map(dt=>{const dd=dt.nextElementSibling;return [dt.textContent.trim(),dd?[...dd.querySelectorAll('kbd')].map(k=>k.textContent.trim()).join(' '):'']})"""
MAC = "Object.defineProperty(navigator,'userAgentData',{get:()=>({platform:'macOS'})});Object.defineProperty(navigator,'platform',{get:()=>'MacIntel'})"
WIN = "Object.defineProperty(navigator,'userAgentData',{get:()=>({platform:'Windows'})});Object.defineProperty(navigator,'platform',{get:()=>'Win32'})"


async def sheet(br, init):
    ctx, pg, e = await ts(br, PORT, view='sheet', init=init)
    await pg.mouse.click(5, 880); await pg.keyboard.press('Shift+?')
    await until(pg, "!!document.querySelector('.pvx-ks-body dt')", 4000)
    rows = await pg.evaluate(ROWS)
    return ctx, e, rows


def find(rows, label):
    return [k for l, k in rows if l == label]


@section(id='t295', title='n295 · Treatment Sheets against HIG Keyboards and Nearby interactions',
         apps=['treatment'], topics=['keyboard'], engines=('chromium', 'webkit'))
async def s_t295(br):
    ctx, e, w = await sheet(br, WIN)
    ok('Keyboards (Windows): Ctrl+. is listed beside Esc to cancel (it worked since n287 but wasn’t listed)', find(w, 'Cancel, as Esc does') == ['Ctrl .'], find(w, 'Cancel, as Esc does'))
    ok('…modifiers in Windows order, Ctrl before Shift (it showed Shift Ctrl), and Ctrl+Y for Redo',
       find(w, 'Redo') == ['Ctrl Shift Z', 'Ctrl Y'] and find(w, 'Move the tab left or right (on a tab)') == ['Ctrl Shift ← →'], [find(w, 'Redo'), find(w, 'Move the tab left or right (on a tab)')])
    ok('no page errors (Windows)', not e, e[:2])
    await ctx.close()
    ctx, e, m = await sheet(br, MAC)
    ok('Keyboards (Mac): ⌘. is listed to cancel, and the order stays Apple’s — Control, Option, Shift, Command (⇧⌘Z, no Ctrl+Y)',
       find(m, 'Cancel, as Esc does') == ['⌘ .'] and find(m, 'Redo') == ['⇧ ⌘ Z'] and find(m, 'Move the tab left or right (on a tab)') == ['⇧ ⌘ ← →'], [find(m, 'Cancel, as Esc does'), find(m, 'Redo')])
    ok('no page errors (Mac)', not e, e[:2])
    await ctx.close()
