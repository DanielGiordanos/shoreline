"""Treatment Sheets — the n290 build's own checks: HIG Image wells, Pickers, Segmented controls and Sliders.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

ST = "(s=>{const g=document.querySelector(s);if(!g)return null;return [g.getAttribute('role'),[...g.querySelectorAll('button')].filter(x=>x.getClientRects().length).map(x=>[x.textContent.trim(),x.getAttribute('role'),x.getAttribute('aria-checked'),x.tabIndex,x===document.activeElement,Math.round(x.getBoundingClientRect().width)])]})"


@section(id='t290', title='n290 · Treatment Sheets against HIG Image wells, Pickers, Segmented controls and Sliders',
         apps=['treatment'], topics=['menus', 'entering-data'], engines=('chromium', 'webkit'))
async def s_t290(br):
    ctx, pg, e = await ts(br, PORT, view='vitals')
    a = await pg.evaluate(ST + "('.vx-seg')")
    ok('Vitals: Time shown is one choice to VoiceOver — a radio group, 24 h checked, and one Tab stop (it was four toggle buttons, four Tab stops)',
       a and a[0] == 'radiogroup' and [x[0] for x in a[1]] == ['12 h', '24 h', '48 h', 'Stay'] and all(x[1] == 'radio' for x in a[1])
       and [x[2] for x in a[1]] == ['false', 'true', 'false', 'false'] and [x[3] for x in a[1]] == [-1, 0, -1, -1], a)
    await pg.focus('.vx-seg [aria-checked="true"]'); await pg.keyboard.press('ArrowRight')
    await until(pg, "document.activeElement&&document.activeElement.textContent.trim()==='48 h'&&document.activeElement.getAttribute('aria-checked')==='true'", 3000)
    b = await pg.evaluate(ST + "('.vx-seg')")
    await pg.keyboard.press('End'); await until(pg, "document.activeElement&&document.activeElement.textContent.trim()==='Stay'", 3000)
    c = await pg.evaluate("[document.activeElement.textContent.trim(),document.activeElement.getAttribute('aria-checked')]")
    ok('…→ chooses 48 h and keeps focus on it; End chooses Stay (the arrow keys did nothing)',
       b and [x[2] for x in b[1]] == ['false', 'false', 'true', 'false'] and b[1][2][4] and c == ['Stay', 'true'], [b, c])
    l = await pg.evaluate(ST + "('.lb-seg')")
    await pg.focus('.lb-seg [aria-checked="true"]'); await pg.keyboard.press('ArrowRight')
    await until(pg, "document.activeElement&&document.activeElement.textContent.trim()==='lb'", 3000)
    l2 = await pg.evaluate(ST + "('.lb-seg')")
    ok('…kg | lb is a radio group too, and → chooses lb',
       l and l[0] == 'radiogroup' and [x[2] for x in l[1]] == ['true', 'false'] and l2 and [x[2] for x in l2[1]] == ['false', 'true'] and l2[1][1][4], [l, l2])
    ok('no page errors (Vitals)', not e, e[:2])
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(900)
    w = await pg.evaluate(ST + "('.wl-seg')")
    ok('Tasks: All patients | Your patients are the same width (99 and 111 pt)', w and len(w[1]) == 2 and abs(w[1][0][5] - w[1][1][5]) <= 1, w)
    await ctx.close()

    ctx, pg, e = await ts(br, PORT, view='board')
    s = await pg.evaluate(ST + "('.sb-seg[role=radiogroup]')")
    await pg.focus('.sb-seg[role=radiogroup] [aria-checked="true"]'); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(900)
    s2 = await pg.evaluate("[document.activeElement.textContent.trim(),document.activeElement.getAttribute('aria-checked')]")
    ok('Board: List | Hours are the same width (70 and 86 pt), and → on Hours wraps to List instead of leaving for the patient list',
       s and abs(s[1][0][5] - s[1][1][5]) <= 1 and s[1][1][2] == 'true' and s2 == ['List', 'true'], [s, s2])
    ok('no page errors (board)', not e, e[:2])
    await ctx.close()
