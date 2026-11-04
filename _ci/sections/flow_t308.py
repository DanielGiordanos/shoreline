"""Pravix Rounds — the n308 build's own checks: HIG Typography, Writing, Layout (text size) and Design principles (Nov 2 2026),
on Rounds' own page. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def page(br, vp=(1440, 900), seed=True, touch=False, dark=True):
    kw = dict(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
    if touch: kw.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**kw)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_selector('#subnavRd', state='attached'); await p.wait_for_timeout(2600)
    if seed: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return c, p, e


@section(id='t308', title='n308 · Rounds follows the HIG Typography, Writing, Layout (text size) and Design principles pages',
         apps=['rounds'], topics=['rounds', 'typography', 'writing', 'layout'], engines=('chromium', 'webkit'))
async def s_t308(br):
    # ---- empty states (Writing: a next step, with a button)
    c, p, e = await page(br, seed=False)
    es = await p.evaluate("""(()=>{const s=document.querySelector('#rdList .rd-emptystate');if(!s)return null;const para=s.querySelector('p'),b=para&&para.querySelector('b');
      const a=[...s.querySelectorAll('a,button')].map(x=>[x.textContent.trim(),x.getAttribute('href')]);
      return {b:b&&getComputedStyle(b).display,lines:para?Math.round(para.getBoundingClientRect().height/parseFloat(getComputedStyle(para).lineHeight)):0,a}})()""")
    ok('Writing · the empty census reads as one sentence (its bold “Admitted” split it over three lines) and offers Open Flow',
       es and es['b'] == 'inline' and es['lines'] <= 2 and ['Open Flow', '/#app=flow'] in es['a'], es)
    ok('no page errors (empty)', not newerr(e), e[:3]); await c.close()

    c, p, e = await page(br)
    await p.fill('#rdSearch', 'zzzz nobody'); await p.wait_for_timeout(500)
    nm = await p.evaluate("(()=>{const s=document.querySelector('#rdList .rd-emptystate');return s?[s.querySelector('b').textContent,[...s.querySelectorAll('button')].map(b=>b.textContent.trim())]:null})()")
    ok('…a search or filter with no match says so and offers “Show all patients”', nm and nm[0] == 'No matching patients' and 'Show all patients' in nm[1], nm)
    await p.evaluate("document.querySelector('#rdList .rd-emptystate [data-act=clear-filters]').click()"); await p.wait_for_timeout(500)
    r = await p.evaluate("[document.querySelectorAll('#rdList .rd-row').length,document.getElementById('rdSearch').value,rdKpiFilter,rdSvcFilter]")
    ok('…which clears the search and filters and brings the census back', r[0] == 10 and r[1] == '' and r[2] is None and r[3] == 'all', r)

    # ---- Writing · one name for one action, sentence case like the suite's other buttons
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(700)
    a = await p.evaluate("(document.querySelector('#rdList .rd-row.open [data-act=review-mark]')||{}).textContent")
    await p.evaluate("document.getElementById('rdStartBtn').click()"); await p.wait_for_timeout(600)
    b = await p.evaluate("(document.querySelector('#rdMode [data-a=rev]')||{}).textContent")
    run = await p.evaluate("document.querySelector('.start-running-label').textContent")
    ok('Writing · marking a patient reviewed is called “Mark reviewed” on the census and in Rounds mode (it was “Mark as Reviewed” and “Mark Reviewed”)', a == 'Mark reviewed' and (b or '').strip() == 'Mark reviewed', (a, b))
    ok('…and “Rounds in progress” is in sentence case', run == 'Rounds in progress', run)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)

    # ---- Typography · one typeface; one style for small capital labels; no tight leading on three lines
    ff = await p.evaluate("""(()=>{const base=getComputedStyle(document.body).fontFamily;return [...document.querySelectorAll('.start-rounds,.rd-attn-toggle,.rd-discharge-toggle')].filter(x=>x.getClientRects().length).map(x=>getComputedStyle(x).fontFamily===base)})()""")
    ok('Typography · Start rounds, Needs Attention and Discharge Readiness use Rounds’ typeface (they drew in the browser’s button font, Arial on Windows)', ff and all(ff), ff)
    tr = await p.evaluate("""(()=>{const s=new Set();document.querySelectorAll('#view-rd-census :is(.rd-handoff .lbl,.rd-finrow .lbl,.rd-locblk .lbl,.rd-svcchip,.rd-sec-h,.rd-extend-label,.rd-team-g .g,.rd-sec .k)').forEach(e=>{if(!e.getClientRects().length)return;const c=getComputedStyle(e);s.add((parseFloat(c.letterSpacing)/parseFloat(c.fontSize)).toFixed(2))});return [...s]})()""")
    ok('…Rounds’ small capital labels share one tracking, 0.08 em (they had five, 0.06–0.10)', tr == ['0.08'], tr)
    ld = await p.evaluate("""[...document.querySelectorAll('.rd-tmr-i .t')].filter(e=>e.getClientRects().length).map(e=>{const c=getComputedStyle(e);return +(parseFloat(c.lineHeight)/parseFloat(c.fontSize)).toFixed(2)})""")
    ok('…Tomorrow’s items, which wrap to three lines, aren’t tightly leaded (1.4, was 1.2)', ld and min(ld) >= 1.35, ld)
    ph = await p.evaluate("""(()=>{const i=document.getElementById('rdSearch'),c=getComputedStyle(i),x=document.createElement('canvas').getContext('2d');x.font=c.fontWeight+' '+c.fontSize+' '+c.fontFamily;
      const w=i.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight);return [i.placeholder,i.getAttribute('aria-label'),x.measureText(i.placeholder).width<=w]})()""")
    ok('…the search hint fits its field on a Mac (it read “Search patients on round”) and keeps its scope, “on rounds” (n212)', ph == ['Search patients on rounds', 'Search patients on rounds', True], ph)
    ok('no page errors (Mac)', not newerr(e), e[:3]); await c.close()

    # ---- Typography · iPhone text sizes; Layout · larger text
    c, p, e = await page(br, (390, 844), touch=True, dark=False)
    fs = await p.evaluate("(()=>{const r=document.querySelector('#rdList .rd-row'),f=s=>parseFloat(getComputedStyle(r.querySelector(s)).fontSize);return [f('.rd-name'),f('.rd-l3'),f('.rd-l2')]})()")
    ok('Typography · on an iPhone the patient row uses iOS’s text sizes: name 17, problems 15, details 13 (they were 15, 13 and 12)', fs == [17, 15, 13], fs)
    await p.evaluate("document.documentElement.style.fontSize='22.4px'"); await p.wait_for_timeout(700)
    big = await p.evaluate("""[document.scrollingElement.scrollWidth,document.querySelector('.rd-head').scrollWidth<=document.querySelector('.rd-head').clientWidth+1,
      [...document.querySelectorAll('#rdList .rd-loc,#rdList .rd-handoff .doc')].filter(e=>e.scrollWidth>e.clientWidth+1).length,
      [...document.querySelectorAll('#rdList .rd-row')].every(r=>r.getBoundingClientRect().right<=390)]""")
    ok('Layout · at 140 % text the header wraps instead of running off the screen, nothing is cut short (“Wards” became “Wa…”), and rows still fit', big == [390, True, 0, True], big)
    ok('no page errors (iPhone)', not newerr(e), e[:3]); await c.close()

    c, p, e = await page(br, (1440, 900))
    await p.evaluate("document.documentElement.style.fontSize='20px'"); await p.wait_for_timeout(700)
    cut = await p.evaluate("[...document.querySelectorAll('#rdList .rd-loc,#rdList .rd-handoff .doc,#rdList .rd-finrow .v')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent.trim())")
    ok('…on a Mac at 125 % text, the row’s fixed columns grow with the text (they were in pixels)', cut == [], cut)
    await c.close()
