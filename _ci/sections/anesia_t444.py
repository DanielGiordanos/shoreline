"""Anesia — the n444 build's own checks (Nov 26 2026): HIG Lists and tables (Lockups and Outline views don't apply).
On a Mac the records list had four columns with no headings and couldn't be sorted; coming back from a record lost
your place (focus fell to the page, nothing marked the record); stacked rows had no disclosure indicator."""
from core import *
from helpers import *
from anesia_t440 import list_page

NAMES = "[...document.querySelectorAll('[data-open] b')].map(b=>b.innerText)"
HEAD = "(()=>{const c=document.querySelector('.an-list .an-card');return {h:[...document.querySelectorAll('.an-lcol')].filter(b=>b.offsetParent).map(b=>[b.firstChild.textContent.trim(),Math.round(b.getBoundingClientRect().left+parseFloat(getComputedStyle(b).paddingLeft)),Math.round(b.getBoundingClientRect().right-parseFloat(getComputedStyle(b).paddingRight)),b.getAttribute('aria-pressed'),b.innerText.replace(/\\s+/g,' ').trim()]),c:c?[...c.children].map(x=>[Math.round(x.getBoundingClientRect().left),Math.round(x.getBoundingClientRect().right)]):[]}})()"
ACT = "(()=>{const a=document.activeElement;return [a.getAttribute('data-open'),!!a.parentElement&&a.parentElement.classList.contains('an-was'),getComputedStyle(a).backgroundColor]})()"
SR = "document.getElementById('anSr')?.textContent||''"
CLEAR = ('rgba(0, 0, 0, 0)', 'transparent')


@section(id='a444', title='n444 · Anesia · Lists and tables: the Mac’s columns have headings that sort the list, coming back from a record marks and focuses its row, and stacked rows end with a chevron',
         apps=['anesia'], topics=['lists', 'tables'], engines=('chromium', 'webkit'))
async def s_a444(br):
    errs = []
    ctx, pg, e = await list_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
    await pg.click('[data-f=signed]'); await pg.wait_for_timeout(400)
    hd = await pg.evaluate(HEAD); date0 = await pg.evaluate(NAMES)
    labels = [h[0] for h in hd['h']]
    lined = len(hd['h']) == 4 and len(hd['c']) == 4 and all(abs(hd['h'][i][1] - hd['c'][i][0]) <= 2 for i in range(3)) and abs(hd['h'][3][2] - hd['c'][3][1]) <= 2
    ok('Lists and tables · on a Mac the four columns have headings, Patient, Animal, Procedure and Date, each over its column (Date at the trailing edge, over the right-aligned dates)',
       labels == ['Patient', 'Animal', 'Procedure', 'Date'] and lined, hd)
    ok('…the list is in date order, newest first, and the Date heading says so',
       len(hd['h']) == 4 and hd['h'][3][3] == 'true' and 'sorted newest first' in hd['h'][3][4] and all(h[3] == 'false' for h in hd['h'][:3]), hd['h'])
    if len(hd['h']) == 4:
        await pg.click('[data-sort=name]'); await pg.wait_for_timeout(250)
        az = await pg.evaluate(NAMES); f1 = await pg.evaluate("[document.activeElement.getAttribute('data-sort'),document.activeElement.getAttribute('aria-pressed')]"); s1 = await pg.evaluate(SR)
        await pg.click('[data-sort=name]'); await pg.wait_for_timeout(250); za = await pg.evaluate(NAMES); t2 = await pg.evaluate("document.querySelector('[data-sort=name]').innerText")
        want = ['Training cat 5', 'Training cat 6', 'Training cat 7', 'Training dog 11', 'Training dog 12', 'Training dog 14']
        ok('…clicking Patient sorts by name (dog 11 after cat 7, numbers in order), keeps focus on the heading and tells VoiceOver; clicking it again reverses it',
           az == want and za == want[::-1] and f1 == ['name', 'true'] and s1 == 'Sorted by patient, A to Z' and 'Z to A' in t2, [az, za, f1, s1, t2])
        await pg.click('[data-sort=proc]'); await pg.wait_for_timeout(250)
        pr = await pg.evaluate("[...document.querySelectorAll('[data-open]')].map(a=>a.children[2].innerText)")
        await pg.click('[data-sort=date]'); await pg.wait_for_timeout(250); dd = await pg.evaluate(NAMES)
        ok('…Procedure sorts A to Z, and Date goes back to newest first', pr == sorted(pr, key=str.lower) and dd == date0, [pr, dd, date0])
        await pg.click('[data-sort=name]'); await pg.wait_for_timeout(250)
        await pg.reload(); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
        kept = await pg.evaluate(NAMES)
        await pg.set_viewport_size({'width': 820, 'height': 1180}); await pg.wait_for_timeout(300)
        nt = await pg.evaluate("(()=>{const n=document.querySelector('.an-sortnote');return [n&&n.offsetParent?n.innerText.replace(/\\s+/g,' '):null,[...document.querySelectorAll('.an-lcol')].some(b=>b.offsetParent)]})()")
        await pg.click('[data-sort0]'); await pg.wait_for_timeout(250)
        back = await pg.evaluate(NAMES); gone = await pg.evaluate("!!document.querySelector('.an-sortnote')")
        ok('…the sort is kept on the device; on an iPad (no columns, no headings) a line says “Sorted by patient, A to Z”, and Sort by date puts it back',
           kept == want and nt[0] == 'Sorted by patient, A to Z Sort by date' and not nt[1] and back == date0 and not gone, [kept, nt, back, gone])
        await pg.set_viewport_size({'width': 1440, 'height': 900}); await pg.wait_for_timeout(300)
    else:
        ok('…the headings sort the list', False, 'no headings')
    ids = await pg.evaluate("[...document.querySelectorAll('[data-open]')].map(a=>a.getAttribute('data-open'))")
    await pg.click(f'[data-open="{ids[3]}"]'); await pg.wait_for_selector('.an-back'); await pg.wait_for_timeout(900)
    await pg.click('.an-back'); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(250)
    a1 = await pg.evaluate(ACT); await pg.wait_for_timeout(1800); a2 = await pg.evaluate(ACT)
    ok('Lists and tables · Back to the list: the record you came from has focus and is highlighted, and the highlight fades',
       a1[0] == ids[3] and a1[1] and a1[2] not in CLEAR and a2[0] == ids[3] and a2[2] in CLEAR, [ids[3], a1, a2])
    await pg.click(f'[data-open="{ids[1]}"]'); await pg.wait_for_selector('.an-back'); await pg.wait_for_timeout(900)
    await pg.go_back(); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(250)
    a3 = await pg.evaluate(ACT)
    ok('…the same with the browser’s Back', a3[0] == ids[1] and a3[1], [ids[1], a3])
    mac = await pg.evaluate("getComputedStyle(document.querySelector('.an-list .an-card'),'::after').content")
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
    ch = await pg.evaluate("[...document.querySelectorAll('.an-list .an-card')].map(a=>{const s=getComputedStyle(a,'::after'),r=a.getBoundingClientRect();return [s.content,parseFloat(s.borderRightWidth),Math.round(r.right-parseFloat(s.right)),Math.round(r.right),a.scrollWidth<=a.clientWidth]})")
    ok('Lists and tables · on an iPhone each row, which opens a record, ends with a disclosure chevron at its trailing edge; a Mac’s table rows have none',
       len(ch) >= 1 and all(c[0] not in ('none', 'normal') and c[1] >= 1.5 and c[3] - c[2] <= 24 and c[4] for c in ch) and mac in ('none', 'normal'), [ch, mac])
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
