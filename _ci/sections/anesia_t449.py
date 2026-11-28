"""Anesia — the n449 build's own checks (Nov 27 2026): HIG The menu bar, Toolbars (Path controls: macOS only).
The window was "Anesia · Pravix" everywhere; Emergency had no keyboard command; Expand's tooltip lost its wording
(and showed ⌥ on Windows) once it was used."""
from core import *
from helpers import *

TT = "[document.querySelector('#anExpand')?.title, document.querySelector('#anExpand')?.getAttribute('aria-label')]"


@section(id='a449', title='n449 · Anesia · The menu bar, Toolbars: the window title names what is on screen; Emergency is ⌥R and in the shortcut list; Expand keeps its tooltip',
         apps=['anesia'], topics=['toolbars', 'menu-bar', 'keyboard'], engines=('chromium', 'webkit'))
async def s_a449(br):
    errs = []
    ctx, pg, e = await new_page(br, vp=(1440, 900))
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
    t0 = await pg.title()
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    t1 = await pg.title()
    await pg.click('.an-back'); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(500)
    t2 = await pg.title()
    ok('Toolbars · the window’s title names what’s on screen: “Records” on the list, “Anesthesia record” in a record, never the patient’s name, “Records” again on the way back (it was “Anesia · Pravix” everywhere)',
       t0 == 'Records' and t1 == 'Anesthesia record' and t2 == 'Records', [t0, t1, t2])
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    em = await pg.evaluate("(()=>{const b=document.querySelector('#anEmer');return [b.getAttribute('aria-keyshortcuts'), b.title]})()")
    await pg.locator('.an-chart').first.click(position={'x': 5, 'y': 5}); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.keyboard.press('Alt+KeyR'); await pg.wait_for_timeout(700)
    sh = await pg.evaluate("document.querySelector('#anShT')?.textContent")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(600)
    ks = await pg.evaluate("""(()=>{const x=document.querySelector('.pvx-ks');if(!x)return null;const out=[];for(const h of x.querySelectorAll('h3')){const dl=h.nextElementSibling;if(dl&&dl.tagName==='DL')for(const dt of dl.querySelectorAll('dt'))out.push([h.textContent,(dt.nextElementSibling||{}).textContent,dt.textContent.trim()])}return out})()""")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    row = [k for k in (ks or []) if k[2] == 'Emergency drugs']
    ok('Toolbars and The menu bar · Emergency, the one toolbar action without a command, is ⌥R: in its tooltip and aria-keyshortcuts, it opens Emergency drugs, and the shortcut list has it under Charting',
       em[0] == 'Alt+R' and em[1].startswith('Show emergency drugs calculated for this patient (') and em[1].endswith('R)') and sh == 'Emergency drugs'
       and len(row) == 1 and row[0][0].startswith('Charting'), [em, sh, row])
    x0 = await pg.evaluate(TT)
    await pg.click('#anExpand'); await pg.wait_for_timeout(700); x1 = await pg.evaluate(TT)
    await pg.click('#anExpand'); await pg.wait_for_timeout(700); x2 = await pg.evaluate(TT)
    ok('Toolbars · Expand’s tooltip keeps its wording, in the computer’s keys, after it’s used (it became “Expand (⌥F)”, with ⌥ on Windows too)',
       x0 == x2 and x0[0].startswith('Fill the window with the record (') and x1[0].startswith('Return to the usual view (') and x1[0].endswith(' or Esc)')
       and '⌥' not in (x1[0] + x2[0] if 'Alt' in x0[0] else '') and x1[1] == 'Exit expanded view', [x0, x1, x2])
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, user='null'); await pg.goto(URL); await pg.wait_for_timeout(1200)
    tg = await pg.title(); errs += list(e); await ctx.close()
    ok('…signed out, the window keeps the app’s name', tg == 'Anesia · Pravix', tg)
    ok('no page errors', not errs, errs)
