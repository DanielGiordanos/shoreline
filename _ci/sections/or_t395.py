"""Pravix OR — the n395 build's own checks (Nov 16 2026): HIG Icons, Layout (second look), Motion.
Motion: switching sections is a 0.15 s cross-fade (it was a 0.5 s rise every time); the case page's timeline is simply there
(it rose item by item on every visit, about a second) and its current step no longer pulses; drawers open in 0.3 s (0.5);
close buttons don't spin on hover. Icons: the alert marks are drawn symbols, silent to VoiceOver (they were typed "!" and
"i"); symbol lines follow their labels' weight. Layout: the Schedule packs by the width each block is drawn at, so a short
case's block no longer covers the next one (Pepper's covered Juniper's)."""
import core
from core import ok, section
from or_t390 import open_or

ANIM = "(()=>document.getAnimations().map(a=>{const t=a.effect.getTiming();const k=a.effect.getKeyframes?a.effect.getKeyframes():[];return {el:String(a.effect.target&&a.effect.target.className||''),name:a.animationName||a.transitionProperty||'',d:t.duration,delay:t.delay,it:t.iterations,move:k.some(f=>f.transform&&f.transform!=='none')}}))()"
OVERLAP = "(()=>{const out=[];document.querySelectorAll('.or-lane').forEach(l=>{const b=[...l.querySelectorAll('.or-block')].map(x=>[x.querySelector('.n').textContent,x.getBoundingClientRect()]);for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){const A=b[i][1],B=b[j][1];if(Math.min(A.right,B.right)-Math.max(A.left,B.left)>1&&Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top)>1)out.push([b[i][0],b[j][0]])}});return [out,document.querySelectorAll('.or-block').length]})()"


@section(id='t395', title='n395 · OR · Icons, Layout, Motion: 0.15 s section fades, a still case timeline, 0.3 s drawers, no spinning close; drawn alert symbols with lines by label weight; Schedule blocks never cover each other',
         apps=['or'], topics=['motion', 'icons', 'layout'], engines=('chromium', 'webkit'))
async def s_t395(br):
    c, p, e = await open_or(br)
    seen = []
    for v in ['schedule', 'cases', 'analytics', 'board']:
        await p.click(f'#switcher [data-view="{v}"]'); await p.wait_for_timeout(40)
        seen += [a for a in await p.evaluate(ANIM) if a['el'].startswith('view')]
        await p.wait_for_timeout(400)
    ok('Motion · switching sections is a 0.15 s cross-fade (it was a 0.5 s rise, every time)', seen and all(a['d'] <= 200 and not a['move'] for a in seen), seen[:3])
    await p.evaluate("openDrawer('or390c4')"); await p.wait_for_timeout(40)
    d = [a for a in await p.evaluate(ANIM) if a['el'].split(' ')[0] in ('drawer', 'scrim')]
    ok('…the drawer slides in 0.3 s and the scrim fades with it (0.5 s and 0.4 s)', len(d) >= 2 and all(a['d'] <= 300 for a in d), d)
    await p.wait_for_timeout(500)
    await p.hover('#drawerClose'); await p.wait_for_timeout(350)
    rot = await p.evaluate("getComputedStyle(document.getElementById('drawerClose')).transform")
    ok('…and its close button doesn’t spin on hover (it turned 90°)', rot in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), rot)
    ai = await p.evaluate("[...document.querySelectorAll('.or-drawer .or-alert .ai')].map(a=>[a.textContent.trim(), !!a.querySelector('svg'), a.getAttribute('aria-hidden')])")
    ok('Icons · the drawer’s alert marks are drawn symbols, silent to VoiceOver (they were a typed “!”, read as “exclamation mark”)',
       ai and all(x[0] == '' and x[1] and x[2] == 'true' for x in ai), ai)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(350)
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(60)
    tl = [a for a in await p.evaluate(ANIM) if a['el'].startswith('tl-')]
    await p.wait_for_timeout(1500)
    rest = [a for a in await p.evaluate(ANIM) if a['it'] in (None,) or str(a['it']) in ('Infinity', 'inf') or (isinstance(a['it'], float) and a['it'] > 1e9)]
    ok('Motion · the case timeline is simply there (it rose item by item on every visit, about a second), and nothing pulses at rest (its current step did)',
       tl and all(a['d'] <= 200 and (a['delay'] or 0) == 0 and not a['move'] for a in tl) and rest == [], (tl[:2], rest[:2]))
    await p.evaluate("openCase('or390c5')"); await p.wait_for_timeout(1200)   # Otis, 27 min late: the case page shows the delay
    ai2 = await p.evaluate("[...document.querySelectorAll('#view-case .or-alert .ai')].map(a=>[a.textContent.trim(), !!a.querySelector('svg')])")
    ok('…and the case page’s alert marks are drawn symbols too', ai2 and all(x[0] == '' and x[1] for x in ai2), ai2)
    sw = await p.evaluate("(()=>{const g=s=>[...document.querySelectorAll(s)].map(x=>parseFloat(getComputedStyle(x).strokeWidth));return {stage:g('#view-case .or-stage .or-milestone svg, #view-board .or-stage .or-milestone svg'),bar:g('#subnavOR #displayBtn svg, #subnavOR #addCaseBtn svg')}})()")
    await p.click('#caseBack'); await p.wait_for_timeout(400)
    sw['to'] = await p.evaluate("[...document.querySelectorAll('#view-board .or-to svg')].map(x=>parseFloat(getComputedStyle(x).strokeWidth))")
    await p.click('#displayBtn'); await p.wait_for_timeout(900)
    sw['display'] = await p.evaluate("[...document.querySelectorAll('.dstage .or-milestone svg')].map(x=>parseFloat(getComputedStyle(x).strokeWidth))")
    ok('Icons · symbol lines follow their labels’ weight: stage 2.0 (was 1.9), wall display 2.5 (1.9), time out 2.0 (2.4), Display mode and Add case 2.25 (2.0, 2.2)',
       sw['stage'] and all(x == 2 for x in sw['stage']) and sw['bar'] and all(x == 2.25 for x in sw['bar']) and sw['to'] and all(x == 2 for x in sw['to'])
       and sw['display'] and all(x == 2.5 for x in sw['display']), sw)
    ok('…no page errors', not e, e[:3])
    await c.close()

    for vp in ((1440, 900), (1024, 768)):
        c, p, e = await open_or(br, vp=vp)
        await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(700)
        o = await p.evaluate(OVERLAP)
        ok(f'Layout · {vp[0]} pt: no Schedule block covers another (Pepper’s ran 17 pt over Juniper’s and hid “Mass Removal”)', o[1] >= 6 and o[0] == [], o)
        await c.close()
