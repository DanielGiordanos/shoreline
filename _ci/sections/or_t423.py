"""Pravix OR — the n423 build's own checks (Nov 22 2026): HIG Toggles, Virtual keyboards.
Recovery's Destination was four plain buttons (nothing chosen for VoiceOver, four Tab stops, no arrows): a radio group
now. Checking a Pre-op item with Space moved it into the closed "Done" list and focus fell to the page: it goes to the
next item now. Return did nothing in OR's fields: it says Next and moves on, and on a sheet's last field Done does the
sheet's action. On a touch screen the keyboard covered the lower part of a sheet: the sheet sits above it now."""
import core
from core import ok, section
from or_t390 import open_or

A = "(()=>{const a=document.activeElement; return a?[a.tagName, a.id, a.dataset&&(a.dataset.r||a.dataset.to||a.dataset.dest)||null, a.getAttribute('aria-checked'), a.getAttribute('enterkeyhint')]:null})()"
HINTS = """(()=>[...document.querySelectorAll('#modal.open input')].filter(i=>i.getClientRects().length&&!i.disabled&&!i.readOnly).map(i=>(document.activeElement===i||i.focus(),[i.id||Object.values(i.dataset)[0], i.getAttribute('enterkeyhint')])))()"""


async def log_event(p):
    await p.click('#caseBody .or-btn:has-text("Add event")'); await p.wait_for_timeout(400)
    await p.click('#menu .dd-opt:has-text("Hypotension")'); await p.wait_for_timeout(500)


@section(id='t423', title='n423 · OR · Toggles, Virtual keyboards: Recovery’s Destination is a radio group, a checked Pre-op item hands focus to the next, Return says Next or Done and does it, and a sheet stays above the touch keyboard',
         apps=['or'], topics=['toggles', 'virtual-keyboards', 'keyboard', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t423(br):
    errs = []
    c, p, e = await open_or(br)
    # Destination
    await p.evaluate("openCase('or390c3','recovery')"); await p.wait_for_timeout(600)
    d0 = await p.evaluate("""(()=>{const g=document.querySelector('#caseBody [data-dest]').parentNode; return [g.getAttribute('role'), g.getAttribute('aria-label'),
      [...g.querySelectorAll('[data-dest]')].map(b=>[b.textContent, b.getAttribute('role'), b.getAttribute('aria-checked'), b.getAttribute('tabindex')])]})()""")
    await p.focus('#caseBody [data-dest][tabindex="0"]'); await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(300)
    d1 = [await p.evaluate(A), await p.evaluate("caseById('or390c3').recovery.destination"), await p.evaluate("[...document.querySelectorAll('#caseBody [data-dest]')].map(b=>b.getAttribute('tabindex')).join('')")]
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(300)
    d2 = [await p.evaluate(A), await p.evaluate("caseById('or390c3').recovery.destination")]
    await p.keyboard.press('Tab'); await p.wait_for_timeout(100)
    d3 = await p.evaluate("!!(document.activeElement&&document.activeElement.closest('[role=radiogroup][aria-label=Destination]'))")
    ok('Toggles · Recovery’s Destination is one choice of four, a radio group (it was four plain buttons: nothing chosen for VoiceOver, four Tab stops, the arrows did nothing): one Tab stop, → chooses Treatment and keeps focus on it, ← wraps to Discharge, Tab leaves',
       d0[0] == 'radiogroup' and d0[1] == 'Destination' and [x[0] for x in d0[2]] == ['ICU', 'Treatment', 'Ward', 'Discharge'] and all(x[1] == 'radio' and x[2] == 'false' for x in d0[2])
       and [x[3] for x in d0[2]] == ['0', '-1', '-1', '-1'] and d1[0][2:4] == ['Treatment', 'true'] and d1[1] == 'Treatment' and d1[2] == '-10-1-1'
       and d2[0][2:4] == ['Discharge', 'true'] and d2[1] == 'Discharge' and not d3, (d0, d1, d2, d3))

    # the Pre-op checklist
    await p.evaluate("openCase('or390c5','preop')"); await p.wait_for_timeout(600)
    await p.focus('#caseBody .or-check[data-r="consent"]'); await p.keyboard.press(' '); await p.wait_for_timeout(400)
    k1 = [await p.evaluate(A), await p.evaluate("caseById('or390c5').readiness.consent")]
    await p.keyboard.press(' '); await p.wait_for_timeout(400)
    k2 = [await p.evaluate(A), await p.evaluate("caseById('or390c5').readiness.procedure")]
    await p.evaluate("(()=>{const d=document.querySelector('#caseBody .or-check[data-r=\"consent\"]').closest('details'); if(d) d.open=true})()"); await p.wait_for_timeout(100)
    await p.focus('#caseBody .or-check[data-r="consent"]'); await p.keyboard.press(' '); await p.wait_for_timeout(400)
    k3 = [await p.evaluate(A), await p.evaluate("caseById('or390c5').readiness.consent"), await p.evaluate("!!document.activeElement.closest('details')")]
    await p.evaluate("openCase('or390c4','preop')"); await p.wait_for_timeout(500)
    na = await p.evaluate("[...document.querySelectorAll('#caseBody .or-check.na')].filter(n=>n.tabIndex<0).map(n=>[n.dataset.r, n.getAttribute('aria-disabled')])")
    ok('Toggles · checking a Pre-op item with Space moves it into the closed “Done” list and hands focus to the next item to do (focus fell to the page, so the keyboard started again at the top); unchecking one keeps focus on it; the item that can’t be changed is heard as dimmed',
       k1[0][2:4] == ['procedure', 'false'] and k1[1] == 'done' and k2[0][2:4] == ['patient', 'false'] and k2[1] == 'done'
       and k3[0][2:4] == ['consent', 'false'] and k3[1] != 'done' and not k3[2] and na and all(x[1] == 'true' for x in na), (k1, k2, k3, na))

    # Return: Next and Done
    await p.evaluate("LINK.sheetMeds=()=>[]; drugModal(caseById('or390c2'))"); await p.wait_for_timeout(500)
    h = await p.evaluate(HINTS)
    await p.focus('#dgName'); await p.keyboard.press('Enter'); await p.wait_for_timeout(80); r1 = await p.evaluate(A)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(80); r2 = await p.evaluate(A)
    await p.focus('#dgNote'); await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    r3 = [await p.evaluate(A), await p.evaluate("document.getElementById('modal').classList.contains('open')"),
          await p.evaluate("(document.querySelector('#dgName').closest('.or-field').querySelector(':scope > .or-field-msg')||{}).textContent||''")]
    ok('Virtual keyboards · in a sheet the Return key says Next on every field but the last, which says Done (it said “return” and did nothing): Next moves to the next field, Drug → Dose → Unit, and Done on Note does the sheet’s action (Chart it), which says what’s missing',
       h == [['dgName', 'next'], ['dgDose', 'next'], ['dgNote', 'done']] and r1[1] == 'dgDose' and r2[1] == 'dgUnit' and r3[0][1] == 'dgName' and r3[1] and r3[2] == 'Enter the drug.', (h, r1, r2, r3))
    await p.evaluate("closeModal()"); await p.wait_for_timeout(300)
    await p.evaluate("openCase('or390c2','procedure')"); await p.wait_for_timeout(500)
    n0 = await p.evaluate("caseById('or390c2').intraop.length")
    await log_event(p)
    ev = await p.evaluate("[document.activeElement.id, document.activeElement.getAttribute('enterkeyhint')]")
    await p.keyboard.type('Training note'); await p.keyboard.press('Enter'); await p.wait_for_timeout(400)
    ev2 = await p.evaluate("[document.getElementById('modal').classList.contains('open'), caseById('or390c2').intraop.length, (caseById('or390c2').intraop.slice(-1)[0]||{}).note]")
    await p.evaluate("openCase('or390c3','recovery')"); await p.wait_for_timeout(500)
    await p.focus('#caseBody [data-rec="temp"]'); t1 = await p.evaluate(A); await p.keyboard.press('Enter'); await p.wait_for_timeout(80); t2 = await p.evaluate(A)
    await p.focus('#caseBody [data-rec="complications"]'); t3 = await p.evaluate(A); await p.keyboard.type('Mild'); await p.keyboard.press('Enter'); await p.wait_for_timeout(250)
    t4 = [await p.evaluate("document.activeElement===document.body"), await p.evaluate("caseById('or390c3').recovery.complications")]
    ok('…Log event’s one field says Done and Return logs the event; on the case page Return goes to the next field (Temperature → Pain score) and on the last says Done, closing the keyboard and keeping the value',
       ev == ['evNote', 'done'] and ev2[0] is False and ev2[1] == n0 + 1 and ev2[2] == 'Training note'
       and t1[4] == 'next' and t2[0] == 'SELECT' and t3[4] == 'done' and t4 == [True, 'Mild'], (ev, ev2, n0, t1, t2, t3, t4))
    errs += list(e); await c.close()

    # iPhone: the sheet stays above the keyboard; Done works from the top bar
    c, p, e = await open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("LINK.sheetMeds=()=>[]; drugModal(caseById('or390c2'))"); await p.wait_for_timeout(800)
    await p.tap('#dgNote'); await p.wait_for_timeout(200)
    BOX = """(()=>{const r=e=>{const b=e.getBoundingClientRect(); return [Math.round(b.top),Math.round(b.bottom)]}; return {m:r(document.getElementById('modal')), f:r(document.activeElement), head:r(document.querySelector('#modal .or-modal-head')),
      act:(b=>b?r(b):null)(document.querySelector('#modal .or-ps-r'))}})()"""
    b0 = await p.evaluate(BOX)
    await p.evaluate("window.__vv=window.orVisibleViewport; window.orVisibleViewport=()=>({top:0,height:508}); window.dispatchEvent(new Event('resize'))"); await p.wait_for_timeout(300)
    b1 = await p.evaluate(BOX)
    await p.evaluate("window.orVisibleViewport=window.__vv; window.dispatchEvent(new Event('resize'))"); await p.wait_for_timeout(300)
    b2 = await p.evaluate(BOX)
    ok('Virtual keyboards · on an iPhone a sheet stays above the keyboard (it covered the sheet’s lower half): with 336 pt of keyboard the sheet ends where the keyboard starts, no taller than what’s left, with the field being typed in and the sheet’s action in view; it goes back when the keyboard does',
       b0['m'][1] == 844 and b1['m'][1] <= 508 and b1['m'][0] >= 0 and 0 <= b1['f'][0] and b1['f'][1] <= 508 and b1['head'][0] >= 0 and b1['act'] and b1['act'][0] >= 0
       and b2['m'] == b0['m'], (b0, b1, b2))
    await p.evaluate("closeModal()"); await p.wait_for_timeout(400)
    await p.evaluate("openCase('or390c2','procedure')"); await p.wait_for_timeout(600)
    n0 = await p.evaluate("caseById('or390c2').intraop.length")
    await p.evaluate("eventMenu(caseById('or390c2'), document.querySelector('#caseBody .or-btn'))"); await p.wait_for_timeout(300)
    await p.click('#menu .dd-opt:has-text("Hypotension")'); await p.wait_for_timeout(700)
    await p.tap('#evNote'); await p.keyboard.type('Phone note'); await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    ph = await p.evaluate("[document.getElementById('modal').classList.contains('open'), caseById('or390c2').intraop.length, (caseById('or390c2').intraop.slice(-1)[0]||{}).note]")
    ok('…and on an iPhone, where the sheet’s action sits in its top bar, Done on Log event’s note logs the event', ph == [False, n0 + 1, 'Phone note'], (ph, n0))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
