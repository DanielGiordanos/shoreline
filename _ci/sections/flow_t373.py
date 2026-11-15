"""Pravix Flow — the n373 build's own checks (Nov 13 2026): HIG Sliders + Steppers (Flow's first look). Flow has no sliders.
On the way's minutes ("How many minutes away did they say?") is a stepper field: spoken with its unit, "min" shown, ↑ ↓ by 1,
Shift (and Page Up / Page Down) by 10, Home and End to 1 and 240, no tiny browser arrows, and the scroll wheel never changes it."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD, flow_code

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if w <= 820: o.update(has_touch=True, is_mobile=w < 700)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e


async def otw(p):
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(600)
    await p.evaluate("[...document.querySelectorAll('#apArrival .ap-seg-btn')].find(b=>/On the way/.test(b.textContent)).click()"); await p.wait_for_timeout(600)
    await p.fill('#otwFrom', 'Milford'); await p.wait_for_timeout(1500)

ST = """(()=>{ const i=document.getElementById('otwMin'), r=i.getBoundingClientRect(), u=document.querySelector('.otw-minu'), m=document.querySelector('.otw-eta-main b');
  return {v:i.value, type:i.type, role:i.getAttribute('role'), min:i.getAttribute('aria-valuemin'), max:i.getAttribute('aria-valuemax'), now:i.getAttribute('aria-valuenow'),
    text:i.getAttribute('aria-valuetext'), unit:u&&getComputedStyle(u).display!=='none'?u.textContent:null, h:Math.round(r.height), x:r.left+r.width/2, y:r.top+r.height/2,
    label:(i.closest('label')||{textContent:''}).textContent.replace(/\\s+/g,' ').trim(), eta:m?m.textContent:null, focus:document.activeElement===i, im:i.getAttribute('inputmode')}; })()"""


@section(id='t373', title='n373 · Sliders and Steppers: Flow has no sliders; On the way’s minutes is a stepper field (spoken with its unit, ↑ ↓ by 1, Shift by 10, no browser arrows)',
         apps=['flow'], topics=['steppers', 'sliders', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t373(br):
    src = flow_code()   # n383: Flow's code is in assets/flow/
    ok('Sliders · Flow has no slider (no range input, no role="slider"), so nothing to adjust; doses and vitals are always typed (Brand §9.2)',
       not re.search(r'type=["\']range|role=["\']slider', src), 'found')
    ok('…and no browser number field is left in Flow (their arrows are tiny and a scroll wheel can change them)', not re.search(r'type=["\']number', src), 'found')

    c, p, e = await ctx(br)
    await otw(p)
    s0 = await p.evaluate(ST)
    ok('Steppers · On the way’s minutes is a stepper field: role spinbutton, 1 to 240, “min” shown after it, labelled with the question, numeric keypad',
       s0['role'] == 'spinbutton' and s0['type'] == 'text' and (s0['min'], s0['max']) == ('1', '240') and s0['unit'] == 'min' and 'minutes away' in s0['label'] and s0['im'] == 'numeric', s0)
    await p.click('#otwMin'); await p.keyboard.type('20'); await p.wait_for_timeout(200)
    s1 = await p.evaluate(ST)
    ok('…a typed value is said with its unit (“20 minutes”) and sets the expected arrival', s1['now'] == '20' and s1['text'] == '20 minutes' and s1['eta'], s1)
    seq = []
    for k in ['ArrowUp', 'Shift+ArrowUp', 'PageDown', 'Shift+ArrowDown', 'ArrowDown']:
        await p.keyboard.press(k); await p.wait_for_timeout(120); seq.append((await p.evaluate(ST))['v'])
    ok('…↑ adds 1 minute, Shift+↑ adds 10 (HIG Steppers: Shift for 10 times the step), Page Down takes 10, Shift+↓ takes 10, ↓ takes 1',
       seq == ['21', '31', '21', '11', '10'], seq)
    s2 = await p.evaluate(ST)
    ok('…and the expected arrival follows the arrows', s2['eta'] and s2['eta'] != s1['eta'], [s1['eta'], s2['eta']])
    await p.keyboard.press('Home'); await p.wait_for_timeout(120); h = await p.evaluate(ST)
    await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(120); h2 = await p.evaluate(ST)
    await p.keyboard.press('End'); await p.wait_for_timeout(120); en = await p.evaluate(ST)
    await p.keyboard.press('Shift+ArrowUp'); await p.wait_for_timeout(120); en2 = await p.evaluate(ST)
    ok('…Home and End go to 1 (“1 minute”) and 240, and the arrows stop there', (h['v'], h['text'], h2['v'], en['v'], en2['v']) == ('1', '1 minute', '1', '240', '240'), [h, h2['v'], en['v'], en2['v']])
    await p.fill('#otwMin', '45'); await p.focus('#otwMin'); await p.wait_for_timeout(150)
    await p.mouse.move(s0['x'], s0['y']); await p.mouse.wheel(0, 300); await p.wait_for_timeout(300); await p.mouse.wheel(0, -300); await p.wait_for_timeout(300)
    w = await p.evaluate(ST)
    ok('…the scroll wheel over the focused field never changes it (a browser number field could), and there are no tiny browser arrows', w['v'] == '45' and w['type'] == 'text', w)
    ok('…no page errors (Mac)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, 820, 1180)
    await otw(p)
    s = await p.evaluate(ST)
    ok('iPad · the minutes field is 44 pt tall with the number keypad and “min”', s['h'] >= 44 and s['im'] == 'numeric' and s['unit'] == 'min', s)
    ok('…no page errors (iPad)', not newerr(e), newerr(e))
    await c.close()
