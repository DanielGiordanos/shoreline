"""Pravix Flow — the n372 build's own checks (Nov 13 2026): HIG Digit entry views + Pickers + Segmented controls (second look;
n214, n215 and n216 first). The Hospital alert's type is a named radio group (one Tab stop, arrows choose, focus kept through the
redraw); On the way's Leaving and the units are one Tab stop with arrows; Arrival type is text only on iPad and Mac; the review
time offers no time already past today. No PIN entry in Flow."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if w < 700: o.update(has_touch=True, is_mobile=True)
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

AT = """(()=>{ const g=document.querySelector('#alertModal .alert-types'), R=[...g.querySelectorAll('.alert-type')], a=document.activeElement;
  return {role:g.getAttribute('role'), name:g.getAttribute('aria-label'), roles:[...new Set(R.map(r=>r.getAttribute('role')))], checked:R.filter(r=>r.getAttribute('aria-checked')==='true').map(r=>r.querySelector('.at-t').textContent),
    tabs:R.map(r=>r.tabIndex).join(','), focus:a&&a.classList&&a.classList.contains('alert-type')?a.querySelector('.at-t').textContent:(a&&a.tagName), draft:alertDraftType}; })()"""
GRP = """((sel)=>{ const R=[...document.querySelector(sel).querySelectorAll('[role=radio]')], a=document.activeElement;
  return {tabs:R.map(r=>r.tabIndex).join(','), checked:R.findIndex(r=>r.getAttribute('aria-checked')==='true'), focus:R.indexOf(a)}; })"""


@section(id='t372', title='n372 · Pickers and Segmented controls: the alert type is a radio group, one Tab stop per choice, text-only Arrival type, no past review times',
         apps=['flow'], topics=['segmented-controls', 'pickers', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t372(br):
    src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    ok('Digit entry views · nothing in Flow asks for a PIN or a row of digits (the page is for tvOS)', not re.search(r'digit-entry|pin-entry|autocomplete="one-time-code"', src), 'found')

    c, p, e = await ctx(br)
    await p.evaluate("openAlertModal()"); await p.wait_for_timeout(600)
    a = await p.evaluate(AT)
    ok('Hospital alert · the alert type is a named radio group (“Alert type”): four radios, the chosen one checked, and it is the only Tab stop',
       a['role'] == 'radiogroup' and a['name'] == 'Alert type' and a['roles'] == ['radio'] and len(a['checked']) == 1 and a['tabs'].count('0') == 1 and a['tabs'].count('-1') == 3, a)
    await p.evaluate("document.querySelector('#alertModal .alert-type[aria-checked=\"true\"]').focus()")
    d0 = a['draft']
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(400)
    a1 = await p.evaluate(AT)
    await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(400)
    a2 = await p.evaluate(AT)
    ok('…→ and ↓ choose the next type, the sheet redraws and focus stays on the chosen card (before, it fell to the page)',
       a1['draft'] != d0 and a1['focus'] == a1['checked'][0] and a2['draft'] != a1['draft'] and a2['focus'] == a2['checked'][0], [a, a1, a2])
    await p.keyboard.press('End'); await p.wait_for_timeout(400); a3 = await p.evaluate(AT)
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(400); a4 = await p.evaluate(AT)
    order = await p.evaluate("[...document.querySelectorAll('#alertModal .alert-type .at-t')].map(x=>x.textContent)")
    ok('…End goes to the last, and → from the last wraps to the first', a3['checked'][0] == order[-1] and a4['checked'][0] == order[0] and a4['focus'] == order[0], [a3, a4, order])
    await p.evaluate("document.querySelectorAll('#alertModal .alert-type')[2].click()"); await p.wait_for_timeout(400)
    a5 = await p.evaluate(AT)
    ok('…a click still chooses, and the radios follow it', a5['checked'][0] == order[2] and a5['focus'] == order[2], a5)
    # the review time
    await p.evaluate("(()=>{ alertDraftType='custom'; renderAlertModal(); })()"); await p.wait_for_timeout(300)
    rv = await p.evaluate("""(()=>{ const d=document.getElementById('alertReviewDay'); d.value=d.options[1].value; d.dispatchEvent(new Event('change',{bubbles:true}));
      return new Promise(r=>setTimeout(()=>{ const s=document.getElementById('alertReviewTime'), n=new Date(), now=n.getHours()*60+n.getMinutes();
        const opts=[...s.options]; r({today:d.options[1].text, pastOff:opts.filter(o=>+o.value<=now).every(o=>o.disabled), futureOn:opts.filter(o=>+o.value>now).every(o=>!o.disabled), sel:+s.value>now, step:+opts[1].value-+opts[0].value}); },120)); })()""")
    rv2 = await p.evaluate("""(()=>{ const d=document.getElementById('alertReviewDay'); d.value=d.options[2].value; d.dispatchEvent(new Event('change',{bubbles:true}));
      return new Promise(r=>setTimeout(()=>{ const s=document.getElementById('alertReviewTime'); r([d.options[2].text, [...s.options].every(o=>!o.disabled)]); },120)); })()""")
    ok('Pickers · the review time keeps its 15-minute steps; for Today, times already past can’t be chosen (the chosen time is still ahead); Tomorrow offers them all',
       rv['today'] == 'Today' and rv['step'] == 15 and (rv['pastOff'] and rv['futureOn'] and rv['sel']) and rv2 == ['Tomorrow', True], [rv, rv2])
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("closeAlertModal()"); await p.wait_for_timeout(300)

    # Add patient: Arrival type text only, Leaving and units
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(600)
    ar = await p.evaluate("[...document.querySelectorAll('#apArrival .ap-seg-btn')].map(b=>{ const s=b.querySelector('svg'); return {t:b.textContent.trim(), icon:!!(s&&getComputedStyle(s).display!=='none'), w:Math.round(b.getBoundingClientRect().width)}; })")
    ok('Segmented controls · on a Mac, Arrival type is text only (Walk-in · ER transfer · On the way · Hospitalized), equal widths',
       [x['t'] for x in ar] == ['Walk-in', 'ER transfer', 'On the way', 'Hospitalized'] and not any(x['icon'] for x in ar) and len(set(x['w'] for x in ar)) == 1, ar)
    u = await p.evaluate(f"({GRP})('.pvx-unit')")
    ok('…the age unit (Years · Months) is one Tab stop, on the chosen unit', u['tabs'] == '0,-1' and u['checked'] == 0, u)
    await p.evaluate("[...document.querySelectorAll('#apArrival .ap-seg-btn')].find(b=>/On the way/.test(b.textContent)).click()"); await p.wait_for_timeout(600)
    l0 = await p.evaluate(f"({GRP})('.otw-leave')")
    await p.evaluate("document.querySelector('.otw-leave [aria-checked=\"true\"]').focus()")
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(200); l1 = await p.evaluate(f"({GRP})('.otw-leave')")
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(200); l2 = await p.evaluate(f"({GRP})('.otw-leave')")
    ok('…On the way’s Leaving (Now · In 10 min · In 20 min) is one Tab stop, and the arrows choose and wrap (before, 3 Tab stops and the arrows did nothing)',
       l0['tabs'] == '0,-1,-1' and l1 == {'tabs': '-1,0,-1', 'checked': 1, 'focus': 1} and l2 == {'tabs': '-1,-1,0', 'checked': 2, 'focus': 2}, [l0, l1, l2])
    ok('…no page errors (Mac)', not newerr(e), newerr(e))
    await c.close()

    # iPhone: Arrival type keeps its symbols in the stacked list
    c, p, e = await ctx(br, 390, 844)
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(700)
    ph = await p.evaluate("[...document.querySelectorAll('#apArrival .ap-seg-btn')].map(b=>{ const s=b.querySelector('svg'); return !!(s&&getComputedStyle(s).display!=='none'); })")
    ok('iPhone · Arrival type is a stacked list there, and keeps its symbols', len(ph) == 4 and all(ph), ph)
    ok('…no page errors (iPhone)', not newerr(e), newerr(e))
    await c.close()
