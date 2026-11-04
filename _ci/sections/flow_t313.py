"""Pravix Rounds — the n313 build's own checks: HIG Playing haptics, Printing, Ratings and reviews, Searching (Nov 3 2026),
on Rounds' own page. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, seed=None, user=FU, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', user).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    return c


async def open_(c, path='/rounds/', demo=True, wait=2800):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(wait)
    await p.evaluate("(()=>{const t=window.toast;window.__toasts=[];window.toast=function(m){window.__toasts.push(String(m));try{return t.apply(this,arguments)}catch(e){}}})()")
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return p, e

NAMES = "[...document.querySelectorAll('#rdList .rd-row[data-pid] .rd-name')].map(e=>e.textContent.trim())"


@section(id='t313', title='n313 · Rounds follows the HIG Playing haptics, Printing, Ratings and reviews and Searching pages',
         apps=['rounds'], topics=['rounds', 'haptics', 'printing', 'searching'], engines=('chromium', 'webkit'))
async def s_t313(br):
    chromium = br.browser_type.name == 'chromium'
    # ---- Printing: a rounds sheet, from a Print button or ⌘P
    c = await ctx(br); p, e = await open_(c)
    b = await p.evaluate("(()=>{const b=document.getElementById('rdPrintBtn'),d=document.getElementById('rdDisplayBtn');return b&&[b.disabled,b.getAttribute('aria-label'),b.nextElementSibling===d,b.innerText.trim()]})()")
    ok('Printing · a Print button sits beside Display (there was no way to print the census)', b and b[0] is False and b[1] == 'Print the rounds sheet' and b[2] and b[3] in ('Print', 'Print…'), b)
    await p.evaluate("window.__printed=0; window.print=()=>{window.__printed++}; 0")
    await p.click('#rdPrintBtn'); await p.wait_for_timeout(300)
    s = await p.evaluate("""(()=>{const r=document.getElementById('rdPrint');return {n:window.__printed,cls:document.body.classList.contains('rd-printing'),blocks:r?r.querySelectorAll('.rp-pt').length:0,
      want:rdFiltered().length,names:rdFiltered().every(x=>r.innerText.includes(rdFullName(x))),money:/\\$\\s?\\d/.test(r.innerText),top:(r.querySelector('.rp-meta')||{}).innerText||''}})()""")
    ok('…it opens the print dialog once with a rounds sheet of every patient shown (⌘P printed one screen: the top bar and the first two patients)', s['n'] == 1 and s['cls'] and s['blocks'] == s['want'] and s['want'] >= 8 and s['names'], s)
    ok('…the sheet says what it covers, when and by whom, and carries no money', 'All patients · %d patients' % s['want'] in s['top'] and 'Printed' in s['top'] and not s['money'], s['top'])
    await p.emulate_media(media='print')
    v = await p.evaluate("[getComputedStyle(document.querySelector('.app')).display, getComputedStyle(document.getElementById('rdPrint')).display, getComputedStyle(document.querySelector('#rdPrint .rp')).color]")
    ok('…on paper only the sheet prints, black on white (the dark screen printed as pale text)', v == ['none', 'block', 'rgb(0, 0, 0)'], v)
    if chromium:
        pdf = await p.pdf(format='Letter'); pages = pdf.count(b'/Type /Page') - pdf.count(b'/Type /Pages')
        ok('…and the eight patients run over several pages instead of being cut off at one', pages >= 3, pages)
    await p.emulate_media(media='screen')
    await p.evaluate("window.dispatchEvent(new Event('afterprint'))"); await p.wait_for_timeout(100)
    ok('…the screen is back to normal after printing', not await p.evaluate("document.body.classList.contains('rd-printing')"))
    await p.evaluate("document.querySelector('[data-act=svc-filter][data-key=im]').click()"); await p.wait_for_timeout(400)
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.wait_for_timeout(100)
    s = await p.evaluate("[document.querySelectorAll('#rdPrint .rp-pt').length, (document.querySelector('#rdPrint .rp-meta')||{}).innerText||'', document.body.classList.contains('rd-printing')]")
    ok('…⌘P prints the same sheet, for what the filters show (Internal Medicine · 2 patients)', s[0] == 2 and 'Internal Medicine · 2 patients' in s[1] and s[2], s)
    await p.evaluate("window.dispatchEvent(new Event('afterprint'))")
    await p.fill('#rdSearch', 'zzzz'); await p.wait_for_timeout(400)
    ok('…and Print is dimmed when there’s nothing to print', await p.evaluate("(b=>b.disabled||b.getAttribute('aria-disabled')==='true')(document.getElementById('rdPrintBtn'))"))
    await p.fill('#rdSearch', ''); await p.evaluate("document.querySelector('[data-act=svc-filter][data-key=all]').click()"); await p.wait_for_timeout(300)
    await p.evaluate("switchRdView('archive')"); await p.wait_for_timeout(500)
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.wait_for_timeout(100)
    a = await p.evaluate("[document.body.classList.contains('rd-print-screen'), document.body.classList.contains('dark')]")
    await p.evaluate("window.dispatchEvent(new Event('afterprint'))"); await p.wait_for_timeout(100)
    a2 = await p.evaluate("[document.body.classList.contains('rd-print-screen'), document.body.classList.contains('dark')]")
    ok('…the Archive prints as it looks but in light colours, and dark mode comes back afterwards', a == [True, False] and a2 == [False, True], (a, a2))
    await p.evaluate("switchRdView('census')"); await p.wait_for_timeout(300)

    # ---- Searching: every word, accents, more of the record, the Archive, and a count for VoiceOver
    async def q(s):
        await p.fill('#rdSearch', s); await p.wait_for_timeout(350); return await p.evaluate(NAMES)
    r = {s: await q(s) for s in ['duarte benny', 'ward dean', 'lrs', 'will bite', 'alvés']}
    ok('Searching · every word you type counts, in any order (“duarte benny” found nothing)', r['duarte benny'] == ['Benny Duarte'] and 'Dean Alves' in r['ward dean'], r)
    ok('…it searches treatments and safety flags too (“lrs”, “will bite” found nothing)', len(r['lrs']) >= 3 and r['will bite'] == ['Jet Parkes'], r)
    ok('…and accents don’t matter (“alvés” found nothing)', r['alvés'] == ['Dean Alves'], r)
    await p.evaluate("(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Tess Dubrosky'); x.rounds.clientId='5531902'; renderRdCensus(true)})()")
    ok('…including the Client ID', await q('5531902') == ['Tess Dubrosky'])
    await q('benny'); await p.wait_for_timeout(900)
    ok('…VoiceOver hears how many match (“1 patient matches”)', await p.evaluate("document.getElementById('rdSearchLive').textContent") == '1 patient matches')
    await p.evaluate("switchRdView('archive')"); await p.wait_for_timeout(600)
    ar = await p.evaluate("[document.getElementById('rdSearch').placeholder, [...document.querySelectorAll('#rdArchiveBody .rd-arccard')].map(c=>c.innerText.split('\\n')[0])]")
    ok('…on the Archive it says so and searches the Archive (it stayed filled in and the Archive ignored it)', ar[0] == 'Search the archive' and len(ar[1]) >= 1 and all('BENNY' in x.upper() for x in ar[1]), ar)
    await q('zzzz'); await p.wait_for_timeout(300)
    ok('…with a clear message when nothing on that day matches', 'match “zzzz”' in await p.evaluate("document.getElementById('rdArchiveBody').innerText"))
    await p.evaluate("switchRdView('census')"); await q('')
    ok('…and on the census it says “Search patients on rounds” again', await p.evaluate("document.getElementById('rdSearch').placeholder") == 'Search patients on rounds')

    # ---- Ratings and reviews: Rounds never asks
    ok('Ratings and reviews · Rounds never asks for a rating or review', not await p.evaluate("/rate (us|rounds|this app)|leave a review|enjoying rounds/i.test(document.body.innerText)"))
    ok('no page errors (printing, searching)', not newerr(e), e[:3]); await c.close()

    # ---- Playing haptics: one touch and hold, one tick
    if chromium:
        c = await ctx(br, viewport={'width': 1180, 'height': 820}, has_touch=True); p, e = await open_(c)
        await p.evaluate("window.__vib=[]; navigator.vibrate=function(x){ __vib.push(x); return true; }; 0")
        await p.evaluate("document.querySelectorAll('.rd-row[data-pid] > .rd-rowmain')[1].scrollIntoView({block:'center'})"); await p.wait_for_timeout(400)
        bb = await p.evaluate("(()=>{const r=document.querySelectorAll('.rd-row[data-pid] > .rd-rowmain')[1].getBoundingClientRect();return [r.x+r.width*0.35,r.y+r.height/2]})()")
        cdp = await c.new_cdp_session(p)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': bb[0], 'y': bb[1]}]}); await p.wait_for_timeout(800)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await p.wait_for_timeout(400)
        h = await p.evaluate("[window.__vib, !!document.querySelector('.pvx-cx:not(.out) .pvx-cx-list')]")
        ok('Playing haptics · touch and hold on a patient plays one short tick and opens its menu (it buzzed twice: for the lift, then for the menu)', h[1] and len([x for x in h[0] if x]) == 1, h)
        await c.close()
