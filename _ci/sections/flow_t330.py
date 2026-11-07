"""Pravix Rounds — the n330 build's own checks: HIG Activity rings, Gauges, Progress indicators (Nov 5 2026), on Rounds' own page.
Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
OPENG = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Gunilla Berkowitz'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"


async def ctx(br, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(2800)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return c, p, e


@section(id='t330', title='n330 · Rounds follows the HIG Activity rings, Gauges and Progress indicators pages', apps=['rounds'], topics=['rounds', 'gauges', 'progress-indicators'], engines=('chromium', 'webkit'))
async def s_t330(br):
    c, p, e = await ctx(br)
    ch = await p.evaluate("""[...document.querySelectorAll('#rdList .rd-chip.authover, #rdList .rd-chip.authwarn, #rdList .rd-chip.home')].map(s=>[s.className.split(' ').pop(), s.getAttribute('role'), s.getAttribute('aria-label')])""")
    over = [x for x in ch if x[0] == 'authover']; warn = [x for x in ch if x[0] == 'authwarn']; home = [x for x in ch if x[0] == 'home']
    ok('Gauges · a row’s authorization chip says its value in words (“Care authorization exceeded: 26 of 24 hours used”; VoiceOver read “26h / 24h”)',
       over and over[0][1] == 'img' and over[0][2] == 'Care authorization exceeded: 26 of 24 hours used' and warn and warn[0][2].startswith('Care authorization: ') and warn[0][2].endswith(' hours used'), ch)
    ok('…and so does Going home today (“2 of 5 discharge steps done”; VoiceOver read “2/5” as “two fifths”)',
       home and home[0][1] == 'img' and home[0][2] == 'Going home today: 2 of 5 discharge steps done', home)
    await p.evaluate(OPENG); await p.wait_for_timeout(500)
    await p.click('#rdList .rd-row.open [data-act="row-fin"]'); await p.wait_for_timeout(700)
    g = await p.evaluate("""(()=>{const g=document.querySelector('#rdList .rd-row.open .rd-auth-gauge'); if(!g) return null; const t=g.querySelector('.rd-auth-track'), f=g.querySelector('.rd-auth-fill');
      return {cls:g.className, role:t.getAttribute('role'), label:t.getAttribute('aria-label'), w:Math.round(f.getBoundingClientRect().width/t.getBoundingClientRect().width*100), ends:[...g.querySelectorAll('.rd-auth-ends span')].map(s=>s.textContent),
        fill:getComputedStyle(f).backgroundColor, title:(document.querySelector('#rdList .rd-row.open .rd-careauth-title')||{}).textContent,
        chip:(document.querySelector('#rdList .rd-row.open .rd-carestatus')||{}).textContent}})()""")
    ok('Gauges · the hours authorized are a gauge under “26 of 24 hours used”, full and red once exceeded, its value and both ends labelled (0h, 24h authorized)',
       g and 'over' in g['cls'] and g['role'] == 'img' and g['label'] == 'Care authorization: 26 of 24 hours used, 2 hours past the authorization' and g['w'] == 100 and g['ends'] == ['0h', '24h authorized'] and g['title'] == '26 of 24 hours used', g)
    ok('…an expired authorization reads “EXPIRED”, not “EXPIRED · 0M”', g and g['chip'].strip() == 'EXPIRED', g and g['chip'])
    lines = await p.evaluate("[...document.querySelectorAll('#rdList .rd-row.open .rd-finlines > div > span:first-child')].map(s=>s.textContent).concat([...document.querySelectorAll('#rdList .rd-row.open .rd-caremetrics span')].map(s=>s.textContent))")
    ok('…the money and hours labels are in sentence case (“Low end”, “High end”, “Total authorized”; they were Title Case)',
       'Low end' in lines and 'High end' in lines and 'Total authorized' in lines and not any(x in lines for x in ['Low End', 'High End', 'Total Authorized']), lines)
    tone = await p.evaluate("rdAuthGauge(10,24,'authorized')+'|'+rdAuthGauge(20,24,'expiring')")
    ok('…while authorized it’s green, and amber when it’s running out', 'rd-auth-gauge ok' in tone and 'rd-auth-gauge soon' in tone and '10 of 24 hours used, 14 hours left' in tone, tone[:300])
    # Progress indicators · the Archive
    w = await p.evaluate("""(()=>{const h=document.createElement('div'); h.id='rdArcProbe'; h.innerHTML=rdArcWaitHTML(true); document.body.appendChild(h);
      const r={cls:h.firstElementChild.className, bar:!!h.querySelector('.rd-ld-track.ind[role=progressbar]'), task:h.querySelector('.rd-ld-task').textContent, spin:!!h.querySelector('.rd-arc-spin'), retry:!!h.querySelector('[data-act=arc-retry]')}; h.remove(); return r})()""")
    ok('Progress indicators · while the Archive waits for earlier days it shows the Pravix loader with what it’s doing, like the census (it showed a lone spinner and “Loading earlier days…”)',
       'rd-loading' in w['cls'] and w['bar'] and w['task'] == 'Retrieving earlier days' and not w['spin'] and not w['retry'], w)
    s = await p.evaluate("""(async()=>{ rdArcLoaderHTML(); const T=Date.now; Date.now=()=>T()+10500; const h=rdArcLoaderHTML(); Date.now=T; const d=document.createElement('div'); d.innerHTML=h; return {task:d.querySelector('.rd-ld-task').textContent, retry:(d.querySelector('[data-act=arc-retry]')||{}).textContent, help:d.querySelector('.rd-ld-help').textContent}})()""")
    ok('…after 10 s it says “Taking longer than expected”, why, and offers Try again', s['task'] == 'Taking longer than expected' and s['retry'] == 'Try again' and 'connection' in s['help'], s)
    ok('…no ring-like control stands in for anything (Activity rings are Apple’s Move, Exercise and Stand only)',
       not await p.evaluate("!!document.querySelector('#view-rd-census circle[stroke-dasharray], #view-rd-census [class*=ring]')"))
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, reduced_motion='reduce')
    a = await p.evaluate("""(()=>{const d=document.createElement('div'); d.id='rdArchiveBody'; d.innerHTML=rdArcLoaderHTML()+'<div class="rd-arc-status"><span class="rd-arc-spin"></span></div>'; document.body.appendChild(d);
      const f=d.querySelector('.rd-ld-fill'), s=d.querySelector('.rd-arc-spin'); const r=[getComputedStyle(f).animationName, getComputedStyle(s).animationName]; d.remove(); return r})()""")
    ok('Progress indicators · with Reduce Motion a wait still moves: the bar and the spinner fade in and out (they stood still, which reads as frozen)', a == ['rdLdPulse', 'rdLdPulse'], a)
    ok('…no page errors (Reduce Motion)', not newerr(e), newerr(e))
    await c.close()
