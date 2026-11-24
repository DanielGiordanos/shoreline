"""Pravix OR — the n427 build's own check (Nov 23 2026): Analytics' On-time first cases without a made-up target.
The card turned green at 80% or more and amber below, though nobody has agreed on 80% for Shoreline and the words
never said so (n424). It's the suite grey now, whatever the figure, with its percentage and what it counts."""
import core
from core import ok, section
from or_t390 import open_or

CARD = """(pct)=>{ const real=window.__orAn||(window.__orAn=analytics);
  window.analytics=function(){ const a=real.apply(this,arguments); a.nFirst=a.nFirst||4; a.onTimePct=pct; return a; };
  renderAnalytics();
  const k=[...document.querySelectorAll('#anKpis .command-kpi')].find(x=>/On-time first cases/.test(x.textContent));
  const today=[...document.querySelectorAll('#anKpis .command-kpi')].find(x=>/Cases today/.test(x.textContent));
  return k&&{accent:k.style.getPropertyValue('--kaccent').trim(), rail:getComputedStyle(k.querySelector('.command-kpi__rail i')).backgroundColor,
    todayRail: today&&today.querySelector('.command-kpi__rail i')?getComputedStyle(today.querySelector('.command-kpi__rail i')).backgroundColor:null,
    text:k.innerText}; }"""


@section(id='t427', title='n427 · OR · Analytics: On-time first cases is the suite grey whatever the figure (it was green at 80% or more and amber below, a target nobody had set)',
         apps=['or'], topics=['charts', 'color'], engines=('chromium', 'webkit'))
async def s_t427(br):
    errs = []
    c, p, e = await open_or(br)
    await p.evaluate("switchView('analytics')"); await p.wait_for_timeout(500)
    low = await p.evaluate(CARD, 50); high = await p.evaluate(CARD, 95)
    await p.evaluate("document.body.classList.remove('dark')"); await p.wait_for_timeout(400)
    light = await p.evaluate(CARD, 50)
    ok('Analytics · On-time first cases has one neutral colour, the suite grey of “Cases today”, at 50% and at 95%, in dark and light (it was amber below 80% and green above, a target nobody had agreed)',
       low and high and light and low['accent'] == high['accent'] == light['accent'] == 'var(--st-complete)' and low['rail'] == high['rail'] == low['todayRail'] and light['rail'] == light['todayRail'],
       (low, high, light))
    ok('…it still says its figure and what it counts, and never a target or a verdict',
       '50' in low['text'] and '95' in high['text'] and 'In room within 10 min of schedule' in low['text'] and not any(w in (low['text'] + high['text']).lower() for w in ('target', 'below', 'goal')),
       (low['text'], high['text']))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
