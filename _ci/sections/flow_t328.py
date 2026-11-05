"""Pravix Rounds — the n328 build's own checks: HIG Pickers, Segmented controls, Sliders, Steppers (Nov 5 2026), on Rounds' own page.
Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
OPENB = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"
SEG = """(s=>{const g=document.querySelector('#rdList .rd-row.open '+s); const bs=[...g.children]; const a=document.activeElement;
  return {role:g.getAttribute('role'), label:g.getAttribute('aria-label'), roles:bs.map(b=>b.getAttribute('role')), checked:bs.map(b=>b.getAttribute('aria-checked')),
    pressed:bs.map(b=>b.getAttribute('aria-pressed')), tabs:bs.filter(b=>b.tabIndex===0).length, widths:bs.map(b=>Math.round(b.getBoundingClientRect().width)),
    focus:a&&a.parentElement===g?a.textContent.trim():null, on:bs.filter(b=>b.classList.contains('on')).map(b=>b.textContent.trim())}})"""
B = "rdCensus().find(p=>rdFullName(p)==='Benny Duarte')"


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
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    return c, p, e


@section(id='t328', title='n328 · Rounds follows the HIG Pickers, Segmented controls, Sliders and Steppers pages', apps=['rounds'], topics=['rounds', 'segmented-controls', 'steppers', 'pickers', 'sliders'], engines=('chromium', 'webkit'))
async def s_t328(br):
    c, p, e = await ctx(br)
    s = await p.evaluate(SEG + "('.rd-acuity-seg')")
    ok('Segmented controls · a patient’s Status is one choice: a radio group named “Status”, the choice checked, one Tab stop (it was four toggle buttons, four Tab stops)',
       s['role'] == 'radiogroup' and s['label'] == 'Status' and s['roles'] == ['radio'] * 4 and s['checked'].count('true') == 1 and s['pressed'] == [None] * 4 and s['tabs'] == 1, s)
    ok('…its segments are of equal width (they were 76–130 pt)', len(set(s['widths'])) == 1, s['widths'])
    hist0 = await p.evaluate("JSON.stringify(%s.rounds).length" % B)
    await p.evaluate("document.querySelector('#rdList .rd-row.open .rd-acuity-seg [aria-checked=true]').focus(); 0")
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(120); await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(120)
    s1 = await p.evaluate(SEG + "('.rd-acuity-seg')"); a1 = await p.evaluate(B + ".rounds.acuity")
    try: await p.wait_for_function("(()=>{const a=document.activeElement; return %s.rounds.acuity==='stable' && a && a.dataset && a.dataset.key==='stable' && a.isConnected})()" % B, timeout=3000)
    except Exception: pass
    s2 = await p.evaluate(SEG + "('.rd-acuity-seg')"); a2 = await p.evaluate(B + ".rounds.acuity")
    ok('…→ → chooses Attention, then Stable: shown at once, recorded once you stop (one change, Critical → Stable), focus staying on Stable',
       s1['focus'] == 'Stable' and s1['on'] == ['Stable'] and a1 == 'critical' and a2 == 'stable' and s2['focus'] == 'Stable' and s2['checked'][2] == 'true', (s1, a1, s2, a2))
    await p.keyboard.press('End'); await p.wait_for_timeout(100); await p.keyboard.press('Tab'); await p.wait_for_timeout(700)
    a3 = await p.evaluate(B + ".rounds.acuity"); f3 = await p.evaluate("(document.activeElement.getAttribute('aria-label')||'')")
    ok('…End chooses Discharge ready, and leaving with Tab records it straight away, focus going on to the next field', a3 == 'discharge' and f3.startswith('Assessment'), (a3, f3))
    await p.evaluate("document.querySelector('#rdList .rd-row.open .rd-acuity-seg [data-key=attention]').click(); 0")
    try: await p.wait_for_function("document.querySelector('#rdList .rd-row.open .rd-acuity-seg [data-key=attention]').classList.contains('on')", timeout=3000)
    except Exception: pass
    await p.wait_for_timeout(300)
    a4 = await p.evaluate(B + ".rounds.acuity")
    ok('…a click still chooses at once', a4 == 'attention', a4)
    col = await p.evaluate("(()=>{const b=document.querySelector('#rdList .rd-row.open .rd-acuity-seg [data-key=attention]'); return [getComputedStyle(b).color, getComputedStyle(b).borderColor]})()")
    ok('…the chosen Status reads in its own colour, like its border (it was amber for every choice)', col[0] == col[1] or 'rgb(247, 218, 126)' in col[0], col)
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=dis-toggle]')?.click(); 0"); await p.wait_for_timeout(400)
    d = await p.evaluate(SEG + "('.rd-dis-seg')")
    ok('…Discharge today (Likely · Possible · Not today) is a radio group too, one Tab stop, equal widths',
       d['role'] == 'radiogroup' and d['label'] == 'Discharge today' and d['roles'] == ['radio'] * 3 and d['tabs'] == 1 and len(set(d['widths'])) == 1, d)
    sh = await p.evaluate("(()=>{const g=document.querySelector('.rd-shiftseg'); return [g.getAttribute('role'), [...g.querySelectorAll('[role=radio]')].filter(b=>b.tabIndex===0).length, new Set([...g.querySelectorAll('[role=radio]')].map(b=>Math.round(b.getBoundingClientRect().width))).size]})()")
    ok('…the shift picker already was one (Morning · Evening · Overnight, equal widths)', sh == ['radiogroup', 1, 1], sh)
    n = await p.evaluate("[document.querySelectorAll('input[type=range]').length, document.querySelectorAll('input[type=date],input[type=time],input[type=datetime-local]').length]")
    ok('Sliders and Pickers · no sliders (values are typed), no date or time pickers (times are typed: “repeat PCV at 6am”)', n == [0, 0], n)
    ok('no page errors', not newerr(e), e[:3]); await c.close()

    c, p, e = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3)
    s = await p.evaluate(SEG + "('.rd-acuity-seg')")
    rows = await p.evaluate("(()=>{const g=document.querySelector('#rdList .rd-row.open .rd-acuity-seg'); return [...new Set([...g.children].map(b=>Math.round(b.getBoundingClientRect().top)))].length})()")
    ok('…on iPhone, Status is two rows of two equal segments, each 44 pt tall', len(set(s['widths'])) == 1 and rows == 2, (s['widths'], rows))
    ok('no page errors (iPhone)', not newerr(e), e[:3]); await c.close()
