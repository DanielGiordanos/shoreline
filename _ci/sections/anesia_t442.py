"""Anesia — the n442 build's own checks (Nov 26 2026): HIG Web views, Boxes, Collections.
The records list was a grid of text cards (4 across on a Mac, 2 on an iPad), read across and then down though it's in
date order; a record arriving from another device gave no sign; the chart's tip was a filled box inside the chart's box."""
from core import *
from helpers import *
from anesia_t440 import list_page

ROWS = "[...document.querySelectorAll('.an-list .an-card')].map(a=>{const r=a.getBoundingClientRect(),s=[...a.children].map(c=>Math.round(c.getBoundingClientRect().left));return {l:Math.round(r.left),t:Math.round(r.top),b:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height),cols:s}})"
LISTW = "(()=>{const l=document.querySelector('.an-list'),cs=getComputedStyle(l),a=getComputedStyle(document.querySelector('.an-list .an-card'));return {w:Math.round(l.getBoundingClientRect().width),r:parseFloat(cs.borderTopLeftRadius),cbg:a.backgroundColor,cr:parseFloat(a.borderTopLeftRadius)}})()"


@section(id='a442', title='n442 · Anesia · Web views, Boxes, Collections: the records are one list (columns on a Mac, stacked rows when narrower), a record that arrives shows itself, and the chart’s tip is a line, not a box in a box',
         apps=['anesia'], topics=['collections', 'boxes'], engines=('chromium', 'webkit'))
async def s_a442(br):
    errs = []
    ctx, pg, e = await list_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
    await pg.click('[data-f=signed]'); await pg.wait_for_timeout(400)
    rows = await pg.evaluate(ROWS); lw = await pg.evaluate(LISTW)
    one = len(rows) == 6 and len({r['l'] for r in rows}) == 1 and all(abs(r['w'] - lw['w']) <= 2 for r in rows)
    tight = all(0 <= rows[i + 1]['t'] - rows[i]['b'] <= 1 for i in range(len(rows) - 1))
    ok('Collections · on a Mac the 6 signed records are one list: a full-width row each, one under the other (they were 4 cards across)',
       one and tight and all(r['h'] >= 44 for r in rows) and lw['r'] > 0 and lw['cbg'] in ('rgba(0, 0, 0, 0)', 'transparent') and lw['cr'] == 0, [rows[:3], lw])
    cols = [r['cols'] for r in rows]
    ok('…with its parts in columns: patient and state, animal, procedure, date and resident start at the same place on every row',
       all(len(c) == 4 for c in cols) and all(len({c[i] for c in cols}) == 1 for i in range(4)) and cols[0][0] < cols[0][1] < cols[0][2] < cols[0][3], cols[:3])
    await pg.set_viewport_size({'width': 820, 'height': 1000}); await pg.wait_for_timeout(300)
    rp = await pg.evaluate(ROWS); lp = await pg.evaluate(LISTW)
    ok('…on an iPad (820 pt) the same list, rows stacked, not 2 cards across', len(rp) == 6 and len({r['l'] for r in rp}) == 1 and all(abs(r['w'] - lp['w']) <= 2 for r in rp) and all(r['h'] >= 44 for r in rp), rp[:2])
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(700)
    ri = await pg.evaluate(ROWS); li = await pg.evaluate(LISTW)
    first = await pg.evaluate("document.querySelectorAll('.an-arrive').length")
    ok('…on an iPhone, full-width rows of at least 44 pt; nothing is marked new on opening the list',
       len(ri) == 2 and all(abs(r['w'] - li['w']) <= 2 and r['h'] >= 44 for r in ri) and first == 0, [ri, first])
    await pg.evaluate("""(()=>{const s=JSON.parse(JSON.stringify(window.__fs['anesia_records/an_train1']));s.id='an_t442';s.patient.name='Training dog 21';s.start=Date.now();s.created_at=Date.now();return firebase.firestore().doc('anesia_records/an_t442').set(s)})()""")
    await pg.wait_for_timeout(250)
    ar = await pg.evaluate("[[...document.querySelectorAll('.an-list>li')].map(li=>li.querySelector('b').innerText+(li.classList.contains('an-arrive')?'*':'')),document.getElementById('anSr')?.textContent]")
    await pg.wait_for_timeout(1900); gone = await pg.evaluate("document.querySelectorAll('.an-arrive').length")
    await pg.click('[data-f=signed]'); await pg.wait_for_timeout(300); await pg.click('[data-f=active]'); await pg.wait_for_timeout(300)
    sw = await pg.evaluate("document.querySelectorAll('.an-arrive').length")
    ok('Collections · a record started on another device arrives marked (and VoiceOver hears “New record: Training dog 21”); the mark goes, and switching tabs marks nothing',
       ar[0][0] == 'Training dog 21*' and all(not x.endswith('*') for x in ar[0][1:]) and ar[1] == 'New record: Training dog 21' and gone == 0 and sw == 0, [ar, gone, sw])
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(1440, 900))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    tip = await pg.evaluate("(()=>{const t=document.querySelector('.an-tips.an-hint');if(!t)return null;const cs=getComputedStyle(t);return [!!t.closest('.an-panel'),cs.backgroundColor,parseFloat(cs.borderTopLeftRadius),parseFloat(cs.borderTopWidth)]})()")
    ok('Boxes · the chart’s tip sits in the chart’s box as a line under a hairline, not a filled box inside it',
       tip and tip[0] and tip[1] in ('rgba(0, 0, 0, 0)', 'transparent') and tip[2] == 0 and tip[3] >= 1, tip)
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
