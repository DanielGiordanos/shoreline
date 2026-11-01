"""Treatment Sheets — the n292 build's own checks: HIG Activity rings, Gauges, Progress indicators and Rating indicators.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

LT = """(()=>{const d=document.createElement('div');d.id='pvxLT';d.innerHTML=pvxSkelRows(3,'board');document.body.appendChild(d);
  const t=d.querySelector('.pvx-ld-track');return [d.querySelector('.pvx-ld-task')?d.querySelector('.pvx-ld-task').innerText.trim():null,
  t?t.getAttribute('role'):null,t?t.getAttribute('aria-label'):null,t?t.hasAttribute('aria-valuenow'):null,
  t&&t.firstElementChild?getComputedStyle(t.firstElementChild).animationName:null]})()"""
EST = """(()=>{const b=document.querySelector('.est-card.fin2 .est-bar');if(!b)return null;const g=b.nextElementSibling;
  const r=x=>{const q=x.getBoundingClientRect();return [Math.round(q.left),Math.round(q.right)]};
  const lo=g&&g.querySelector('.lo'),hi=g&&g.querySelector('.hi'),mk=b.querySelector('.est-lo');
  return [b.getAttribute('aria-label'),g&&g.classList.contains('pvx-gends')?g.getAttribute('aria-hidden'):null,lo&&lo.textContent,hi&&hi.textContent,
    lo&&r(lo),hi&&r(hi),mk&&r(mk),r(b)]})()"""


async def estimate(pg, lo, hi, cur):
    await pg.evaluate("openEstimate()"); await pg.wait_for_timeout(800)
    for k, v in (('esLow', lo), ('esHigh', hi), ('esCur', cur), ('esDep', '1500')):
        await pg.fill('#' + k, v)
    await pg.click('#tsModal .tm-foot button:has-text("Save estimate")')
    await until(pg, "!!document.querySelector('.est-card.fin2 .est-bar')&&!!document.querySelector('.est-card.fin2 .pvx-gends')", 6000)
    await pg.wait_for_timeout(500)
    return await pg.evaluate(EST)


@section(id='t292', title='n292 · Treatment Sheets against HIG Activity rings, Gauges, Progress indicators and Rating indicators',
         apps=['treatment'], topics=['loading', 'charts'], engines=('chromium', 'webkit'))
async def s_t292(br):
    ctx, pg, e = await ts(br, PORT, view='board')
    await pg.evaluate("document.documentElement.classList.add('ts-loading')")
    a = await pg.evaluate(LT)
    ok('Progress: while the patient list waits, it says “Retrieving the patient list” over a moving bar (indeterminate: no value) — it had still grey rows and no visible word',
       a and a[0] == 'Retrieving the patient list' and a[1] == 'progressbar' and a[2] == 'Retrieving the patient list' and a[3] is False and a[4] == 'pvxLdInd', a)
    await pg.evaluate("document.documentElement.classList.add('ts-load-slow')"); await pg.wait_for_timeout(150)
    s = await pg.evaluate("[document.querySelector('#pvxLT .pvx-ld-task').innerText.trim(),document.querySelector('#pvxLT .pvx-skel-slow').innerText.trim()]")
    ok('…after 10 s it says “Taking longer than expected” and what to check', s[0] == 'Taking longer than expected' and 'Check the connection' in s[1], s)
    await pg.evaluate("document.documentElement.classList.remove('ts-loading','ts-load-slow');document.getElementById('pvxLT').remove()")
    k = await pg.evaluate("(()=>{const d=document.createElement('div');d.innerHTML=pvxSheetSkel('sh_train2');const t=d.querySelector('.pvx-ld-track');return [d.querySelector('.pvx-ld-task')&&d.querySelector('.pvx-ld-task').textContent,t&&t.getAttribute('role')]})()")
    ok('…a sheet opened for the first time says “Opening Mochi Training’s sheet” with the same bar', k == ['Opening Mochi Training’s sheet', 'progressbar'], k)
    await until(pg, "!!document.querySelector('.ts-load-card .ts-lc-lvl')", 5000)
    w = await pg.evaluate("[...document.querySelectorAll('.ts-load-card')].map(c=>[c.querySelector('.ts-lc-lvl').textContent,c.querySelector('.ts-lc-bar').getAttribute('role'),c.querySelector('.ts-lc-bar').getAttribute('aria-label'),getComputedStyle(c.querySelector('.ts-lc-bar')).backgroundColor])")
    ok('Gauges: each workload card says its level in words (colour was the only sign), and VoiceOver hears the tech, level and counts; the bar’s track shows',
       w and all(x[0] in ('Light', 'Busy', 'Heavy') and x[1] == 'img' and x[2].startswith('Daniel Giordano: ' + x[0].lower() + ' workload, ') and 'due within the hour' in x[2] and x[3] != 'rgba(0, 0, 0, 0.06)' for x in w), w)
    ok('no page errors (board)', not e, e[:2])
    await ctx.close()

    ctx, pg, e = await ts(br, PORT, view='sheet')
    r1 = await estimate(pg, '3000', '4500', '1200')
    ok('Gauges: the estimate bar names its value and both ends to VoiceOver (it said only “of the $3,000 low end”)',
       r1 and r1[0] == 'Charges $1,200: $1,800 left to the $3,000 low end. High end $4,500.', r1)
    ok('…and on screen: “Low end” under its mark and “High end” at the end, not overlapping (they were only under Details)',
       r1 and r1[1] == 'true' and r1[2] == 'Low end' and r1[3] == 'High end' and abs((r1[4][0] + r1[4][1]) / 2 - (r1[6][0] + r1[6][1]) / 2) <= 3
       and r1[4][1] < r1[5][0] and abs(r1[5][1] - r1[7][1]) <= 2, r1)
    r2 = await estimate(pg, '3000', '4500', '5200')
    ok('…past the high end it says so (“of the $3,000 low end” before)', r2 and r2[0] == 'Charges $5,200: $700 past the $4,500 high end. Low end $3,000.', r2)
    ok('no page errors (sheet)', not e, e[:2])
    await ctx.close()
