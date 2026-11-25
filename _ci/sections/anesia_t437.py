"""Anesia — the n437 build's own checks (Nov 25 2026): HIG Managing notifications, Modality, Multitasking.
A sheet that handed over to another sheet dropped what had been typed in it without asking: Event's "Start time-out" lost a
typed note (as did Team's hand-off, the drug options' Give drug, Confirm patient's edit details and a line's Remove…)."""
from core import *
from helpers import *

ST = """[document.querySelector('#anShT')?.innerText, !!document.querySelector('#anSheet [data-discard]:not([hidden])'),
  document.querySelector('#anSheet [data-discard] [data-drop]')?.textContent, document.querySelector('#anSheet [name=note]')?.value,
  document.activeElement?.hasAttribute('data-keep'), document.querySelector('#anSheet [data-discard]')?.getAttribute('role')]"""


@section(id='a437', title='n437 · Anesia · Managing notifications, Modality, Multitasking: a sheet that hands over to another asks first if something was typed (Event’s Start time-out lost a typed note)',
         apps=['anesia'], topics=['modality'], engines=('chromium', 'webkit'))
async def s_a437(br):
    errs = []
    ctx, pg, e = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    # nothing typed: straight to Time-out, as before
    await pg.click('.an-tools [data-act=event]'); await pg.wait_for_timeout(600)
    await pg.click('[data-dotimeout]'); await pg.wait_for_timeout(700); clean = await pg.evaluate(ST)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    if await pg.locator('[data-drop]:visible').count(): await pg.click('[data-drop]:visible'); await pg.wait_for_timeout(400)
    ok('Modality · with nothing typed, Event’s Start time-out goes straight to Time-out, as before', clean[0] == 'Time-out' and not clean[1], clean)
    # a note typed: it asks
    await pg.click('.an-tools [data-act=event]'); await pg.wait_for_timeout(600)
    await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.fill('[name=note]', 'Patient moved to the table'); await pg.wait_for_timeout(200)
    await pg.evaluate("document.querySelector('[data-dotimeout]').click()"); await pg.wait_for_timeout(500); ask = await pg.evaluate(ST)
    ok('…with a note typed it asks first (“Discard your changes?”, an alert dialog with Keep editing focused) instead of dropping the note; Discard says where it goes',
       ask[0] == 'Event' and ask[1] and ask[2] == 'Discard and start time-out' and ask[3] == 'Patient moved to the table' and ask[4] and ask[5] == 'alertdialog', ask)
    await pg.evaluate("document.querySelector('#anSheet [data-discard] [data-keep]').click()"); await pg.wait_for_timeout(400); kept = await pg.evaluate(ST)
    ok('…Keep editing returns to the note, untouched, and Discard is plain Discard again for closing', kept[0] == 'Event' and not kept[1] and kept[3] == 'Patient moved to the table' and kept[2] == 'Discard', kept)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400); esc = await pg.evaluate(ST)
    ok('…closing it still asks the usual way', esc[0] == 'Event' and esc[1] and esc[2] == 'Discard', esc)
    await pg.evaluate("document.querySelector('#anSheet [data-discard] [data-keep]').click()"); await pg.wait_for_timeout(300)
    await pg.evaluate("document.querySelector('[data-dotimeout]').click()"); await pg.wait_for_timeout(400)
    await pg.evaluate("document.querySelector('#anSheet [data-discard] [data-drop]').click()"); await pg.wait_for_timeout(800); gone = await pg.evaluate(ST)
    ok('…and Discard and start time-out does just that', gone[0] == 'Time-out' and not gone[1], gone)
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
