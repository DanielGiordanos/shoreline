"""Pravix OR — the n426 build's own checks (Nov 23 2026): HIG Machine learning, Multitasking, Keyboards.
Closing OR with a dose or a hand-off still on its way lost it quietly: the browser asks first. The
Keyboard shortcuts sheet said search covered "staff" and Shift stepped Minutes late by five, and left out ⌘. (Esc),
Return's Next field, ← → in a row of choices, Page Up / Down and Home / End, and Quantity."""
import core
from core import ok, section
from or_t390 import open_or
from or_t424 import HOLD

LEAVE = "(()=>{const e=new Event('beforeunload',{cancelable:true}); window.dispatchEvent(e); return e.defaultPrevented})()"


@section(id='t426', title='n426 · OR · Machine learning, Multitasking, Keyboards: leaving with a dose still on its way asks first, and the Keyboard shortcuts sheet says what the keys really do',
         apps=['or'], topics=['multitasking', 'keyboard', 'help'], engines=('chromium', 'webkit'))
async def s_t426(br):
    errs = []
    c, p, e = await open_or(br)
    # Keyboards: the shortcuts sheet
    await p.evaluate("document.activeElement&&document.activeElement.blur()"); await p.keyboard.press('?'); await p.wait_for_timeout(500)
    ks = await p.evaluate("(document.querySelector('.pvx-ks')||{}).innerText||''")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    want = ['Search cases, patients, surgeons, procedures and rooms', 'Ten at a time', 'Page Up', 'The lowest or the highest', 'Minutes late and Quantity',
            'The same as Esc', 'Next field; on a sheet’s last field, its action', 'Choose in a row of choices']
    ok('Keyboards · the Keyboard shortcuts sheet says what the keys do now: search covers cases, patients, surgeons, procedures and rooms (it said “staff”), Shift steps ten (it said five), and it lists Page Up / Page Down, Home / End, Quantity, ⌘. as Esc, Return’s Next field and ← → in a row of choices (all missing)',
       ks and all(w.lower() in ks.lower() for w in want) and 'five minutes' not in ks.lower() and 'staff' not in ks.lower(), [w for w in want if w.lower() not in ks.lower()] or ks[:200])
    errs += list(e); await c.close()
    # Multitasking: leaving with a dose on its way
    c, p, e = await open_or(br)
    await p.evaluate(HOLD)
    await p.evaluate("openCase('or390c2','procedure')"); await p.wait_for_timeout(500)
    l0 = await p.evaluate(LEAVE)
    await p.evaluate("window.__wmode='hold'; LINK.sheetMeds=()=>[]; drugModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    await p.fill('#dgName', 'Training drug'); await p.fill('#dgDose', '1'); await p.select_option('#dgUnit', index=1); await p.select_option('#dgRoute', index=1)
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(400)
    l1 = await p.evaluate(LEAVE)
    await p.evaluate("window.__wmode=''; window.__wq.splice(0).forEach(w=>w.go())"); await p.wait_for_timeout(500)
    l2 = await p.evaluate(LEAVE)
    ok('Multitasking · closing or reloading OR while a dose is still on its way to the treatment sheet asks first (it went quietly); with nothing on its way it doesn’t',
       l0 is False and l1 is True and l2 is False, (l0, l1, l2))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
