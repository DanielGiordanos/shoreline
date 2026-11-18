"""Pravix OR — the n402 build's own checks (Nov 17 2026): HIG Playing audio, Printing, Ratings and reviews.
Printing: ⌘P printed the screen (the dark page, the bars and buttons, the owner's name). Now when printing starts each view
puts its own paper in place — the day's schedule by room, the Cases list as filtered, the case's record, Analytics' figures —
black on white, letter landscape, a band with what it is and who printed it, and never an owner's name; the paper leaves the
page afterwards. Print… is on each view and the case page, dimmed and saying why when there's nothing to print or the cases
are still loading. Playing audio, Ratings and reviews: OR makes no sound and asks for no rating."""
import os
import core
from core import ok, section, BUILD
import or_t390 as T
import or_t400 as L

PAPER = "(()=>{const p=document.getElementById('orPrint');return {txt:p.innerText, rows:p.querySelectorAll('tbody tr:not(.orp-room)').length, rooms:p.querySelectorAll('tr.orp-room').length, h1:(p.querySelector('h1')||{}).textContent||''}})()"
SHOWN = """(()=>{const vis=[...document.body.children].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id||e.className||e.tagName);
  return {vis, bg:getComputedStyle(document.body).backgroundColor, scheme:getComputedStyle(document.documentElement).colorScheme, col:getComputedStyle(document.getElementById('orPrint')).color}})()"""


@section(id='t402', title='n402 · OR · Playing audio, Printing, Ratings and reviews: each view prints its own paper (black on white, no owner names) instead of the screen, Print… on each view, dimmed with a reason, and no sound or rating prompts',
         apps=['or'], topics=['printing', 'audio'], engines=('chromium', 'webkit'))
async def s_t402(br):
    html = open(os.path.join(BUILD, 'or', 'index.html'), encoding='utf-8').read()
    c, p, e = await T.open_or(br)
    b = await p.evaluate("(()=>{const b=document.querySelector('#view-board [data-orprint]');return b?[b.textContent.trim(), b.getAttribute('aria-disabled'), b.title]:null})()")
    ok('Printing · the Board has Print…, saying what it prints and its shortcut (there was no print action anywhere)',
       b and b[0] == 'Print…' and b[1] == 'false' and b[2].startswith('Print the schedule for today (') and b[2].endswith('P)'), b)

    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.emulate_media(media='print'); await p.wait_for_timeout(200)
    pp = await p.evaluate(PAPER); sh = await p.evaluate(SHOWN)
    ok('…when printing starts, the Board’s day goes on paper by room (6 cases in OR 1 and OR 2), with a band saying what it is and who printed it',
       pp['h1'] == 'OR schedule · Friday, October 23' and pp['rows'] == 6 and pp['rooms'] == 2 and 'Printed ' in pp['txt'] and 'by Resident A' in pp['txt'] and 'OR is the record' in pp['txt'], pp)
    ok('…only the paper prints, black on white, even from the dark theme (⌘P printed the dark screen, the bars and buttons)',
       sh['vis'] == ['orPrint'] and sh['bg'] == 'rgb(255, 255, 255)' and sh['scheme'] == 'light' and sh['col'] == 'rgb(0, 0, 0)', sh)
    ok('…and never an owner’s name', 'Training owner' not in pp['txt'], '')
    await p.emulate_media(media='screen'); await p.evaluate("window.dispatchEvent(new Event('afterprint'))"); await p.wait_for_timeout(100)
    gone = await p.evaluate("document.getElementById('orPrint').innerHTML")
    ok('…and the paper leaves the page once printing is done', gone == '', len(gone))

    await p.evaluate("openCase('or390c3')"); await p.wait_for_timeout(600)
    cb = await p.evaluate("(()=>{const b=document.querySelector('#view-case [data-orprint]');return b?[b.getAttribute('aria-disabled'),b.title]:null})()")
    head = await p.evaluate("document.getElementById('caseHead').innerText.includes('Training owner')")
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.wait_for_timeout(100)
    cp = await p.evaluate(PAPER)
    await p.evaluate("window.dispatchEvent(new Event('afterprint'))")
    ok('…a case prints its record: safety, steps, drugs, events, specimens, implants, recovery and the operative record, without the owner the screen shows',
       cb and cb[0] == 'false' and cb[1].startswith('Print this case') and cp['h1'] == 'OR case · Pepper · Mass Removal — Left'
       and all(s in cp['txt'] for s in ['Safety', 'Steps', 'Drugs given', 'Events', 'Specimens', 'Implants', 'Recovery', 'Operative record · Draft · not signed', 'DNR', 'Procedure finished'])
       and head and 'Training owner' not in cp['txt'], (cb, cp['h1'], head))

    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(300)
    await p.click('#casesToolbar .chip[data-f="emergency"]'); await p.wait_for_timeout(300)
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.wait_for_timeout(100)
    lp = await p.evaluate(PAPER)
    await p.evaluate("window.dispatchEvent(new Event('afterprint'))")
    await p.evaluate("switchView('analytics')"); await p.wait_for_timeout(500)
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.wait_for_timeout(100)
    ap = await p.evaluate(PAPER)
    await p.evaluate("window.dispatchEvent(new Event('afterprint'))")
    ok('…Cases prints its list as filtered (Emergency: Juniper), and Analytics its figures',
       lp['h1'] == 'OR cases · Emergency' and lp['rows'] == 1 and 'Juniper' in lp['txt'] and ap['h1'] == 'OR analytics' and 'Last 30 days' in ap['txt'], (lp, ap['h1']))

    await p.evaluate("switchView('schedule')"); await p.wait_for_timeout(300)
    await p.click('#schedNext'); await p.wait_for_timeout(400)
    sb = await p.evaluate("(()=>{const b=document.querySelector('#view-schedule [data-orprint]');return [b.getAttribute('aria-disabled'), b.title]})()")
    await p.evaluate("document.querySelector('#view-schedule [data-orprint]').click()"); await p.wait_for_timeout(300)
    t = await p.evaluate("document.getElementById('toastMsg').textContent")
    ok('Printing · on a day with no cases Print… is dimmed and says why, and pressing it says so (only offered when there’s something to print)',
       sb == ['true', 'No cases tomorrow to print'] and t == 'No cases tomorrow to print', (sb, t))
    await p.keyboard.press('Shift+Slash'); await p.wait_for_timeout(400)
    ks = await p.evaluate("(document.querySelector('.pvx-ks')||{}).textContent||''")
    await p.keyboard.press('Escape')
    ok('…and ⌘P is listed in the Keyboard shortcuts sheet', 'Print what’s open' in ks, '')
    ok('Playing audio, Ratings and reviews · OR plays no sound and asks for no rating or review',
       not any(w in html for w in ['AudioContext', 'new Audio(', 'speechSynthesis', 'requestReview', 'Rate OR', 'Rate this app']), '')
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await L.open_slow(br, 8000)
    await p.wait_for_timeout(1500)
    lb = await p.evaluate("(()=>{const b=document.querySelector('#view-board [data-orprint]');return b?[b.getAttribute('aria-disabled'), b.title]:null})()")
    ok('Printing · while the cases are loading, Print… is dimmed and says it’s available once they’ve loaded', lb == ['true', 'Available once the cases have loaded'], lb)
    await c.close()
