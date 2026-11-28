"""Anesia — the n448 build's own checks (Nov 27 2026): HIG Pop-up buttons, Pull-down buttons (Ornaments: visionOS only).
Minutes per column (a pop-up) and More (a pull-down) opened menus without ever saying whether they were open."""
from core import *
from helpers import *

EXP = "(s=>{const b=document.querySelector(s);return b?[b.getAttribute('aria-haspopup'),b.getAttribute('aria-expanded'),b.textContent.trim()]:null})"


@section(id='a448', title='n448 · Anesia · Pop-up and Pull-down buttons: Minutes per column and More say collapsed, expanded while their menu is open, and collapsed again',
         apps=['anesia'], topics=['menus', 'pop-up-buttons'], engines=('chromium', 'webkit'))
async def s_a448(br):
    errs = []
    ctx, pg, e = await new_page(br, vp=(820, 1180), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    z0 = await pg.evaluate(EXP + "('#anZoomPop')")
    await pg.click('#anZoomPop'); await pg.wait_for_timeout(400); z1 = await pg.evaluate(EXP + "('#anZoomPop')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400); z2 = await pg.evaluate(EXP + "('#anZoomPop')"); f2 = await pg.evaluate("document.activeElement.id")
    await pg.click('#anZoomPop'); await pg.wait_for_timeout(400)
    await pg.click('.pvx-cx .pvx-cx-list button:has-text("10 min")'); await pg.wait_for_timeout(500)
    z3 = await pg.evaluate(EXP + "('#anZoomPop')")
    ok('Pop-up buttons · on an iPad, Minutes per column says collapsed, expanded while its menu is open, collapsed after Esc (focus back on it) and after a choice, which it then shows (10 min)',
       z0 == ['menu', 'false', '5 min'] and z1[1] == 'true' and z2[1] == 'false' and f2 == 'anZoomPop' and z3 == ['menu', 'false', '10 min'], [z0, z1, z2, f2, z3])
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    m0 = await pg.evaluate(EXP + "('#anMore')")
    await pg.click('#anMore'); await pg.wait_for_timeout(400); m1 = await pg.evaluate(EXP + "('#anMore')")
    await pg.click('.pvx-cx-cancel'); await pg.wait_for_timeout(400); m2 = await pg.evaluate(EXP + "('#anMore')")
    await pg.click('#anMore'); await pg.wait_for_timeout(400)
    await pg.click('.pvx-cx .pvx-cx-list button:has-text("Gas…")'); await pg.wait_for_timeout(600)
    m3 = await pg.evaluate(EXP + "('#anMore')"); sh = await pg.evaluate("document.querySelector('#anShT')?.textContent")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ok('Pull-down buttons · on an iPhone, More says collapsed, expanded while its menu is open, and collapsed after Cancel or a choice (Gas… opens its sheet)',
       m0[:2] == ['menu', 'false'] and m1[1] == 'true' and m2[1] == 'false' and m3[1] == 'false' and sh == 'Gas', [m0, m1, m2, m3, sh])
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
