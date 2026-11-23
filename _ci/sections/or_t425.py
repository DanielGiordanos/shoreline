"""Pravix OR — the n425 build's own checks (Nov 23 2026): HIG Notifications, Snippets, Status bars.
Two notes said another Pravix app had done something it hadn't ("Kura · implant recorded": nothing goes to Kura;
"Anesia · Anesthesia started": Anesia doesn't read OR's steps). The status bar was #0A1222 over a #0D1730 top bar in
dark, and #F2F4F8 over a white one in light: it takes the bar's own colour now, and the wall display's on the wall."""
import core
from core import ok, section
from or_t390 import open_or

NOTES = "[...document.querySelectorAll('#notes .note .n-title')].map(n=>n.textContent)"
BAR = """(()=>{const hex=c=>{const m=String(c).match(/\\d+(\\.\\d+)?/g); return '#'+m.slice(0,3).map(x=>('0'+Math.round(+x).toString(16)).slice(-2)).join('').toUpperCase()};
  const top=document.querySelector(document.body.classList.contains('display-mode')?'.or-display':'.topnav'); const bg=getComputedStyle(top).backgroundColor;
  return [document.querySelector('meta[name=theme-color]').content.toUpperCase(), hex(bg), (String(bg).match(/[\\d.]+/g)||[])[3]||'1']})()"""


@section(id='t425', title='n425 · OR · Notifications, Snippets, Status bars: notes no longer say Kura or Anesia did what they didn’t; the status bar takes the colour of the bar under it (top bar, or the wall display)',
         apps=['or'], topics=['notifications', 'status-bars', 'writing'], engines=('chromium', 'webkit'))
async def s_t425(br):
    errs = []
    c, p, e = await open_or(br)
    # Notifications
    await p.evaluate("openCase('or390c2','procedure')"); await p.wait_for_timeout(500)
    await p.evaluate("scanModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    await p.fill('[data-imp="product"]', 'Training plate'); await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(400)
    n1 = await p.evaluate(NOTES)
    await p.evaluate("(()=>{const c=caseById('or390c5'); c.status='in_room'; c.roomId='or2'; })()")
    await p.evaluate("doAdvance(caseById('or390c5'))"); await p.wait_for_timeout(400)
    n2 = await p.evaluate(NOTES); st = await p.evaluate("caseById('or390c5').status")
    ok('Notifications · a note never says another app did what it didn’t: an implant is “Implant recorded” (it said “Kura · implant recorded”; nothing goes to Kura), and starting anesthesia is “Anesthesia started” (it said “Anesia · …”; Anesia doesn’t read OR’s steps)',
       'Implant recorded' in n1 and not any('Kura' in x for x in n1) and st == 'anesthesia_started' and 'Anesthesia started' in n2 and not any('Anesia' in x for x in n2), (n1, n2, st))
    # Status bars
    b1 = await p.evaluate(BAR)
    await p.evaluate("document.body.classList.remove('dark')"); await p.wait_for_timeout(1600)   # the bar fades to its light colour
    b2 = await p.evaluate(BAR)
    await p.evaluate("document.body.classList.add('dark'); enterDisplay()"); await p.wait_for_timeout(500)
    b3 = await p.evaluate(BAR)
    await p.evaluate("exitDisplay()"); await p.wait_for_timeout(500)
    b4 = await p.evaluate(BAR)
    ok('Status bars · the status bar takes the colour of the bar right under it (it was #0A1222 over a #0D1730 bar in dark, #F2F4F8 over white in light): the top bar’s navy and white, the wall display’s own background on the wall, and back',
       b1[0] == b1[1] == '#0D1730' and b2[0] == '#FFFFFF' and float(b2[2]) >= 0.9 and all(int(b2[1][i:i+2], 16) >= 0xF0 for i in (1, 3, 5)) and b3[0] == b3[1] and b4[0] == '#0D1730', (b1, b2, b3, b4))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
