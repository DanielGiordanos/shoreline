"""Anesia — the n443 build's own checks (Nov 26 2026): HIG Column views, Disclosure controls, Labels.
Vitals' "More monitors" had no disclosure indicator, became "Fewer monitors" when open, and closed it hid what it held
(a value typed there was saved unseen); on an iPhone a drug's row label lost its last word ("Running")."""
from core import *
from helpers import *

DISC = "(()=>{const b=document.querySelector('[data-vmore]'),cs=getComputedStyle(b,'::before');return {t:b.textContent.replace(/\\s+/g,' ').trim(),x:b.getAttribute('aria-expanded'),c:b.getAttribute('aria-controls'),tf:cs.transform,w:parseFloat(cs.width),hidden:document.getElementById('anVMore').hidden}})()"


@section(id='a443', title='n443 · Anesia · Column views, Disclosure controls, Labels: More monitors is a disclosure triangle with one label, and closed it says what it holds; a drug’s row label keeps “Running” on an iPhone',
         apps=['anesia'], topics=['disclosure', 'labels'], engines=('chromium', 'webkit'))
async def s_a443(br):
    errs = []
    ctx, pg, e = await new_page(br)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    await pg.click('[data-act=vitals]'); await pg.wait_for_selector('[data-vmore]'); await pg.wait_for_timeout(300)
    a = await pg.evaluate(DISC)
    await pg.click('[data-vmore]'); await pg.wait_for_timeout(350); b = await pg.evaluate(DISC)
    ok('Disclosure controls · More monitors is a disclosure triangle: a chevron that turns from the trailing side to down as it opens, and the same label both ways (it became “Fewer monitors”)',
       a['t'] == 'More monitors' and b['t'] == 'More monitors' and a['x'] == 'false' and b['x'] == 'true' and a['c'] == 'anVMore' and a['hidden'] and not b['hidden']
       and a['w'] > 0 and a['tf'] not in ('none', '') and b['tf'] not in ('none', '') and a['tf'] != b['tf'], [a, b])
    await pg.fill('#nv_fio2', '98'); await pg.select_option('#nv_ecg', 'sinus'); await pg.fill('#nv_hr', '80')
    await pg.click('[data-vmore]'); await pg.wait_for_timeout(300); c = await pg.evaluate(DISC)
    ok('…closed, it says what it holds (“More monitors · FiO₂ 98 % · ECG …”), so nothing is saved unseen',
       c['hidden'] and c['t'].startswith('More monitors · FiO₂ 98 %') and '· ECG Sinus' in c['t'], c)
    n0 = await pg.evaluate("window.__fs['anesia_records/an_train1'].vitals.length")
    await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(900)
    v = await pg.evaluate("window.__fs['anesia_records/an_train1'].vitals.slice(-1)[0]")
    await pg.click('[data-act=vitals]'); await pg.wait_for_selector('[data-vmore]'); await pg.wait_for_timeout(300)
    d = await pg.evaluate(DISC)
    ok('…Save charts what it said (FiO₂ 98, ECG), and an empty one says only “More monitors”',
       await pg.evaluate("window.__fs['anesia_records/an_train1'].vitals.length") == n0 + 1 and v.get('fio2') in (98, '98') and v.get('ecg') == 'sinus' and d['t'] == 'More monitors', [v, d])
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    lab = await pg.evaluate("(()=>{const s=[...document.querySelectorAll('.an-lab span')].find(x=>/Running/.test(x.textContent));if(!s)return null;return [s.textContent,s.scrollHeight,s.clientHeight]})()")
    clipped = await pg.evaluate("[...document.querySelectorAll('.an-lab span')].filter(s=>s.offsetParent&&s.scrollHeight>s.clientHeight+1).map(s=>s.textContent)")
    ok('Labels · on an iPhone no row label of the chart is cut short; “50 mcg/mL · Opioid · Running” shows its last word (it ended “Opioid ·…”)',
       lab and lab[0].endswith('Running') and lab[1] <= lab[2] + 1 and not clipped, [lab, clipped])
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
