"""Anesia — the n451 build's own checks (Nov 27 2026): HIG Alerts, Action sheets (Token fields: macOS only).
"Discard your changes?" was an alertdialog that wasn't modal: Tab and taps reached the sheet behind it."""
from core import *
from helpers import *

ST = """(()=>{const w=document.querySelector('#anSheet');if(!w)return null;const d=w.querySelector('[data-discard]');
return {disc:!!d&&!d.hidden, modal:d&&d.getAttribute('aria-modal'), inert:[...w.querySelectorAll('.an-sheet > .an-sh, .an-sheet > form')].map(e=>e.hasAttribute('inert')),
dim:(f=>f?+getComputedStyle(f).opacity:null)(w.querySelector('.an-sheet > form')), focus:document.activeElement&&document.activeElement.textContent.trim().slice(0,20),
note:w.querySelector('textarea')?.value}})()"""


@section(id='a451', title='n451 · Anesia · Alerts: “Discard your changes?” is modal: the sheet behind it is inert and dimmed, Tab stays on its two buttons, Esc keeps editing',
         apps=['anesia'], topics=['alerts', 'sheets', 'keyboard'], engines=('chromium', 'webkit'))
async def s_a451(br):
    errs = []
    ctx, pg, e = await new_page(br, vp=(1440, 900))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    await pg.click('.an-tools [data-act=event]'); await pg.wait_for_timeout(700)
    await pg.locator('#anSheet textarea').first.fill('note x')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    a = await pg.evaluate(ST)
    tabs = []
    for i in range(4):
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(80); tabs.append(await pg.evaluate("document.activeElement.textContent.trim().slice(0,20)"))
    ok('Alerts · closing a sheet you typed in asks “Discard your changes?” as a modal alert: the rest of the sheet is inert and dimmed, focus on Keep editing, and Tab stays on its two buttons (it went on to the chips behind)',
       a['disc'] and a['modal'] == 'true' and a['inert'] == [True, True] and a['dim'] is not None and a['dim'] < .8 and a['focus'] == 'Keep editing'
       and tabs == ['Discard', 'Keep editing', 'Discard', 'Keep editing'], [a, tabs])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    b = await pg.evaluate(ST)
    ok('…Esc keeps editing: the alert goes, the sheet works again, the note is kept and focused',
       b and not b['disc'] and b['inert'] == [False, False] and b['dim'] == 1 and b['note'] == 'note x', b)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    await pg.click('#anSheet [data-drop]'); await pg.wait_for_timeout(600)
    c = await pg.evaluate("!!document.querySelector('#anSheet')")
    ok('…and Discard closes the sheet', c is False, c)
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
