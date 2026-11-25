"""Anesia — the n435 build's own checks (Nov 24 2026): HIG Feedback, File management, Going full screen.
An ended or signed record's vitals tiles counted up from now ("200 min ago") and were all marked late; a signed record's tiles
were switched off though they said "Press T for the trend", so its trends couldn't be opened; Expand hid who was signed in
while entries are charted in that person's name; New training record had no keyboard shortcut."""
from core import *
from helpers import *

TL = """[document.querySelector('.an-nh h2').innerText, document.querySelector('.an-nlast')?.innerText,
  [...document.querySelectorAll('.an-tile')].map(b=>({dis:b.disabled, late:b.classList.contains('stale'), foot:b.querySelector('.f span')?.textContent, label:b.getAttribute('aria-label')}))]"""


@section(id='a435', title='n435 · Anesia · Feedback, File management, Going full screen: an ended record’s readings show their time; a signed record’s trends open; Expand says who is charting; ⌥N for New',
         apps=['anesia'], topics=['feedback', 'files', 'full-screen'], engines=('chromium', 'webkit'))
async def s_a435(br):
    errs = []
    ctx, pg, e = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(500)
    # File management: ⌥N
    nb = await pg.evaluate("[document.querySelector('#anNew').title, document.querySelector('#anNew').getAttribute('aria-keyshortcuts')]")
    await pg.keyboard.press('Alt+KeyN'); await pg.wait_for_timeout(700); t_new = await pg.evaluate("document.querySelector('#anShT')?.innerText")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    if await pg.locator('[data-drop]:visible').count(): await pg.click('[data-drop]:visible'); await pg.wait_for_timeout(300)
    ok('File management · ⌥N opens New training record on the list, and its tooltip and VoiceOver say so (there was no shortcut)',
       t_new == 'New training record' and nb[0].endswith(('(⌥N)', '(Alt+N)')) and nb[1] == 'Alt+N', [t_new, nb])
    # Feedback: an ended record
    await pg.click('.an-seg[aria-label="Show records"] button >> nth=1'); await pg.wait_for_timeout(400)
    await pg.click('text=Training cat 2'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    en = await pg.evaluate(TL)
    import re
    tm = re.compile(r'at \d{1,2}:\d{2} [AP]M')
    ok('Feedback · an ended record’s tiles say when each reading was taken (“HR 158 bpm, at 12:00 PM”), none marked late, under “Last readings” (they counted up from now: “200 min ago”, all late, under “Now”)',
       en[0] == 'Last readings' and len(en[2]) == 6 and all(not x['late'] and tm.search(x['label']) and 'minutes ago' not in x['label'] and 'min ago' not in (x['foot'] or '') for x in en[2] if 'no value' not in x['label']), en)
    # a signed record
    await pg.click('#anSign'); await pg.wait_for_timeout(600); await pg.click('[data-ok]'); await pg.wait_for_timeout(1500)
    sg = await pg.evaluate(TL)
    await pg.evaluate("document.querySelector('.an-tile[data-vk=hr]').click()"); await pg.wait_for_timeout(1000)
    c1 = await pg.evaluate("[document.querySelector('#anShT')?.innerText, !!document.querySelector('#anSheet .an-trend'), !!document.querySelector('#anVForm')]")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
    await pg.evaluate("document.querySelector('.an-tile[data-vk=spo2]').focus()"); await pg.keyboard.press('t'); await pg.wait_for_timeout(900)
    c2 = await pg.evaluate("document.querySelector('#anShT')?.innerText")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
    ok('Feedback · on a signed record a tile opens its trend (by click and by T); it was switched off though it said “Press T for the trend”',
       c1 == ['Heart rate', True, False] and c2 == 'SpO₂' and all(not x['dis'] and x['label'].endswith('Show the trend') and 'Enter' not in x['label'] and 'Press T' not in x['label'] for x in sg[2] if 'no value' not in x['label']), [c1, c2, sg[2][:2]])
    ok('…and nothing can be charted on it (the toolbar is still off)', await pg.evaluate("[...document.querySelectorAll('.an-tools [data-act]')].every(b=>b.disabled)"))
    errs += list(e); await ctx.close()
    # Going full screen: Expand says who is charting
    ctx, pg, e = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    before = await pg.evaluate("getComputedStyle(document.querySelector('.an-who')).display")
    await pg.click('#anExpand'); await pg.wait_for_timeout(900)
    xp = await pg.evaluate("(()=>{const w=document.querySelector('.an-who'), r=w.getBoundingClientRect(), t=document.querySelector('#pvxTopnav'); return [getComputedStyle(w).display, w.textContent, r.width>0&&r.top>=0&&r.bottom<=innerHeight, t?getComputedStyle(t).display:'none']})()")
    live = await pg.evaluate("document.querySelector('.an-nh h2').innerText")
    errs += list(e); await ctx.close()
    ok('Going full screen · the expanded record says who is charting (“Charting as Resident A”); Expand hides the top bar, which said it, and every entry is charted in that name',
       before == 'none' and xp[0] != 'none' and xp[1] == 'Charting as Resident A' and xp[2] and xp[3] == 'none', [before, xp])
    ok('…and a record under anesthesia still says “Now”', live == 'Now', live)
    ok('no page errors', not errs, errs)
