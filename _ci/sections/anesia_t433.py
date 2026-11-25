"""Anesia — the n433 build's own checks (Nov 24 2026): HIG Typography, Writing, Charting data.
A vital's trend was drawn 560 wide and shrunk to fit, so on iPhone its labels were 7 pt (6 pt with larger text), and it had no
words beyond its title; "New training record" was cut short in its sheet bar on iPhone; "Ended · not signed" and "· running"
broke the capitals after a middle dot; a vitals tile told touch-only devices to "Press T"."""
from core import *
from helpers import *

TREND = r"""(()=>{ const s=document.querySelector('#anSheet .an-trend'); if(!s) return null; const m=s.getScreenCTM(), k=Math.hypot(m.a,m.b);
  const tx=[...s.querySelectorAll('text')].map(t=>{const r=t.getBoundingClientRect(); return {t:t.textContent, px:parseFloat(getComputedStyle(t).fontSize)*k, r:r.right, l:r.left}});
  const g=s.querySelector('line.g').getBoundingClientRect(); const ys=tx.slice(0,3);
  const sum=document.querySelector('#anSheet .an-trendsum');
  return {min:Math.min(...tx.map(x=>x.px)), clear:ys.every(x=>x.r<=g.left+1), inside:tx.every(x=>x.l>=s.getBoundingClientRect().left-1&&x.r<=s.getBoundingClientRect().right+1),
    root:parseFloat(getComputedStyle(document.documentElement).fontSize), label:s.getAttribute('aria-label'),
    now:sum&&sum.querySelector('.now').innerText.replace(/\s+/g,' ').trim(), rng:sum&&sum.querySelector('.rng').innerText.trim()} })()"""
BARS = """(()=>{const h=document.querySelector('#anShT'), bar=document.querySelector('.an-sh'); const rg=document.createRange(); rg.selectNodeContents(h);
  const lines=new Set([...rg.getClientRects()].map(r=>Math.round(r.top))).size;
  const btn=[...bar.querySelectorAll(':scope>.an-btn')].map(b=>{const q=document.createRange(); q.selectNodeContents(b); return new Set([...q.getClientRects()].map(r=>Math.round(r.top))).size});
  return {t:h.textContent, whole:h.scrollWidth<=h.clientWidth+1, lines, btn1:btn.every(n=>n<=1), pad:getComputedStyle(bar.querySelector('.an-btn')).paddingLeft}})()"""


async def open_trend(pg, k='hr'):
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    await pg.locator(f'[data-vk={k}] .an-spark').click(); await pg.wait_for_selector('#anSheet .an-trend'); await pg.wait_for_timeout(700)
    return await pg.evaluate(TREND)


@section(id='a433', title='n433 · Anesia · Typography, Writing, Charting data: a trend’s labels are text-sized and it opens with a summary; sheet titles stay whole on iPhone; one capital style after middle dots',
         apps=['anesia'], topics=['typography', 'writing', 'charts'], engines=('chromium', 'webkit'))
async def s_a433(br):
    errs = []
    # Typography and Charting data: the trend at every size
    T = {}
    for nm, vp, touch, px in (('Mac', (1440, 900), False, None), ('iPhone', (390, 844), True, None), ('320', (320, 568), True, None), ('iPhone at 28 pt', (390, 844), True, 28)):
        ctx, pg, e = await new_page(br, vp=vp, touch=touch)
        await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
        if px: await pg.evaluate(f"document.documentElement.style.fontSize='{px}px'"); await pg.wait_for_timeout(300)
        T[nm] = await open_trend(pg); errs += list(e); await ctx.close()
    ok('Typography · a trend’s labels are at least 11 pt at every size (on iPhone they were 7 pt, 6 pt with larger text)',
       all(t and t['min'] >= 10.9 for t in T.values()), {k: t and round(t['min'], 1) for k, t in T.items()})
    ok('…they follow the text size (0.75 rem: 21 pt at a 28-pt text size), and the value labels clear the plot and stay inside the chart',
       T['iPhone at 28 pt']['min'] >= 20.5 and all(t['clear'] and t['inside'] for t in T.values()), {k: (round(t['min'], 1), t['clear'], t['inside']) for k, t in T.items()})
    t = T['iPhone']
    import re
    vals = [float(x) for x in re.search(r'In order: ([\d., ]+)\.$', t['label'] or '').group(1).split(', ')] if t['label'] and 'In order:' in t['label'] else []
    f = lambda v: ('%g' % v)
    ok('Charting data · the trend opens with a headline: the latest value with its unit and time, then the lowest, the highest and how many readings (it had only its title)',
       bool(vals) and re.fullmatch(r'%s bpm at \d{1,2}:\d{2} [AP]M' % f(vals[-1]), t['now'] or '') is not None
       and t['rng'] == 'Lowest %s · Highest %s · %d readings' % (f(min(vals)), f(max(vals)), len(vals)), [t['now'], t['rng']])
    ok('…and its VoiceOver label starts with the same summary before the readings in order',
       bool(vals) and re.match(r'Heart rate, %d readings from \d{1,2}:\d{2} [AP]M to \d{1,2}:\d{2} [AP]M; lowest %s, highest %s, latest %s bpm\. In order: '
                               % (len(vals), f(min(vals)), f(max(vals)), f(vals[-1])), t['label']) is not None, t['label'])
    # Typography: sheet titles whole on iPhone
    B = {}
    for vp, touch in (((390, 844), True), ((375, 667), True), ((320, 568), True), ((1440, 900), False)):
        ctx, pg, e = await new_page(br, vp=vp, touch=touch)
        await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
        await pg.click('#anNew'); await pg.wait_for_timeout(700); B[f'{vp[0]} New'] = await pg.evaluate(BARS); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        if await pg.locator('[data-drop]:visible').count(): await pg.click('[data-drop]:visible'); await pg.wait_for_timeout(300)
        await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
        for act in ('vitals', 'event', 'dose', 'more'):
            btn = pg.locator(f'.an-tools [data-act={act}]')
            if not await btn.count() or not await btn.first.is_visible(): continue
            await btn.first.click(); await pg.wait_for_timeout(600)
            if await pg.locator('#anShT').count(): B[f'{vp[0]} {act}'] = await pg.evaluate(BARS)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            if await pg.locator('[data-drop]:visible').count(): await pg.click('[data-drop]:visible'); await pg.wait_for_timeout(300)
        errs += list(e); await ctx.close()
    bad = {k: v for k, v in B.items() if not (v['btn1'] and (v['whole'] if not k.startswith('320') else (v['whole'] and v['lines'] <= 2)))}
    ok('Typography · every sheet title stays whole on iPhone (“New training record” was cut short at 390 and 375 pt); at 320 pt a title may take two lines, and Cancel and the action stay on one line',
       not bad and len(B) >= 12, bad or {k: v['t'] for k, v in B.items()})
    ok('…and the Mac’s sheet bars are as they were', B['1440 New']['pad'] == '20px' and B['1440 New']['lines'] == 1, B['1440 New'])
    # Writing
    ctx, pg, e = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    txt = ''
    for i in range(3):
        await pg.click(f'.an-seg[aria-label="Show records"] button >> nth={i}'); await pg.wait_for_timeout(400); txt += await pg.evaluate("document.querySelector('#anApp').innerText")
    await pg.click('.an-seg[aria-label="Show records"] button >> nth=0'); await pg.wait_for_timeout(300)
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    txt += await pg.evaluate("document.querySelector('#anApp').innerText")
    mac = await pg.evaluate("[document.querySelector('[data-vk=hr]').getAttribute('aria-label'), document.querySelector('[data-vk=hr]').getAttribute('aria-keyshortcuts')]")
    errs += list(e); await ctx.close()
    ok('Writing · every part after a middle dot starts with a capital: “Ended · Not signed”, “Opioid · Running” (they were lower case)',
       'Ended · Not signed' in txt and '· Running' in txt and not re.search(r' · (not signed|running)\b', txt), re.findall(r'[^\n]{0,20} · (?:[Nn]ot signed|[Rr]unning)', txt))
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    tch = await pg.evaluate("[(matchMedia('(any-pointer:fine)').matches||matchMedia('(any-hover:hover)').matches), document.querySelector('[data-vk=hr]').getAttribute('aria-label'), document.querySelector('[data-vk=hr]').getAttribute('aria-keyshortcuts')]")
    errs += list(e); await ctx.close()
    ok('…a vitals tile says “Press T for the trend” only where there’s a keyboard and pointer (not on a touch-only iPhone); the shortcut stays declared',
       mac[0].endswith('Press T for the trend') and mac[1] == 'T' and (tch[0] or 'Press T' not in tch[1]) and tch[2] == 'T', [mac, tch])
    ok('no page errors', not errs, errs)
