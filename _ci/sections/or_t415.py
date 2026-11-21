"""Pravix OR — the n415 build's own checks (Nov 20 2026): a case's five sections fit on an iPhone.
n407 meant them to stay one row and scroll only with larger text, but at the normal text size the row needed 379 pt in a
356 pt box: "Record" sat past the edge. They fit from 375 pt; n407's scroll stays for larger text; iPad and Mac unchanged."""
import core
from core import ok, section
import or_t390 as T

TABS = """()=>{const t=document.getElementById('caseTabs'), r=t.getBoundingClientRect();
  const bs=[...t.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect(); return [b.textContent.trim(), Math.round(q.width), Math.round(q.height), q.left>=r.left-1&&q.right<=r.right+1, b.scrollWidth<=b.clientWidth+1]});
  return {fit:t.scrollWidth<=t.clientWidth+1, rows:new Set(bs.map((b,i)=>Math.round(t.querySelectorAll('button')[i].getBoundingClientRect().top))).size, bs, page:document.documentElement.scrollWidth<=innerWidth}}"""


@section(id='t415', title='n415 · OR · a case’s five sections fit on an iPhone (“Record” sat past the edge)',
         apps=['or'], topics=['tabs', 'layout'], engines=('chromium', 'webkit'))
async def s_t415(br):
    res, errs = {}, []
    for w in (390, 375):
        c, p, e = await T.open_or(br, vp=(w, 844), touch=True)
        await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(700)
        res[w] = await p.evaluate(TABS)
        if w == 390:
            await p.click('#caseTabs [data-tab="record"]'); await p.wait_for_timeout(400)
            rec = await p.evaluate("[UI.caseTab, document.querySelector('#caseTabs [data-tab=\"record\"]').getAttribute('aria-selected')]")
        errs += list(e); await c.close()
    ok('Tab views (iOS) · on an iPhone a case’s five sections fit in one row at the normal text size, each whole and at least 44 pt (the row needed 379 pt in 356 and “Record” sat past the edge), from 375 pt',
       all(v['fit'] and v['rows'] == 1 and v['page'] and len(v['bs']) == 5 and all(b[1] >= 44 and b[2] >= 44 and b[3] and b[4] for b in v['bs']) for v in res.values()),
       {k: (v['fit'], v['rows'], v['bs']) for k, v in res.items()})
    ok('…and Record opens with one tap', rec == ['record', 'true'], rec)
    # larger text: n407's scroll stays; iPad and Mac unchanged
    c, p, e = await T.open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("document.documentElement.style.fontSize='150%'; openCase('or390c2')"); await p.wait_for_timeout(800)
    big = await p.evaluate("(()=>{const t=document.getElementById('caseTabs'), s=getComputedStyle(t); return [s.overflowX, s.flexWrap, document.documentElement.scrollWidth<=innerWidth]})()")
    errs += list(e); await c.close()
    wide = {}
    for vp, touch in [((820, 1180), True), ((1440, 900), False)]:
        c, p, e = await T.open_or(br, vp=vp, touch=touch)
        await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(600)
        wide[vp[0]] = await p.evaluate("[...document.querySelectorAll('#caseTabs button')].map(b=>getComputedStyle(b).paddingLeft)")
        errs += list(e); await c.close()
    ok('…with larger text the row still scrolls rather than wrapping (n407) and the page never does; iPad and Mac keep their tabs as they were',
       big[0] == 'auto' and big[1] == 'nowrap' and big[2] and all(x == '16px' for x in wide.get(820, [])) and all(x == '16px' for x in wide.get(1440, [])) and wide.get(820) and wide.get(1440), (big, wide))
    ok('no page errors', not errs, errs)
