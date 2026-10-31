"""Treatment Sheets — the n285 build's own checks: HIG Path controls, Search fields and Sidebars.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

FIND = "(()=>{const f=document.getElementById('tsFind');return f&&f.getClientRects().length?f.innerText.replace(/\\n+/g,' | '):''})()"
VF = 'input[placeholder="Filter vitals by name"]'
ST = "(s)=>{const i=document.querySelector(s);const x=i.parentElement.querySelector('.pvx-sf-x');return {v:i.value,role:i.getAttribute('role'),ekh:i.getAttribute('enterkeyhint'),x:x?!x.hidden&&x.getClientRects().length>0:null,xl:x&&x.getAttribute('aria-label'),ic:!!i.parentElement.querySelector('svg:not(.pvx-sf-x svg)')}}"


@section(id='t285', title='n285 · Treatment Sheets against HIG Path controls, Search fields and Sidebars',
         apps=['treatment'], topics=['searching', 'entering-data'], engines=('chromium', 'webkit'))
async def s_t285(br):
    # 1. ⌘K finds a patient by the record number under the name
    ctx, pg, e = await ts(br, PORT, view='sheet')
    pid = await pg.evaluate("document.querySelector('#tsHdr .tsh-pid').textContent.trim()")
    res = {}
    for q in ('V-TRAIN2', 'train2', 'mochi'):
        await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(250)
        await pg.evaluate("(()=>{const i=document.getElementById('globalSearch');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))})()")
        await pg.keyboard.type(q); await pg.wait_for_timeout(600)
        res[q] = await pg.evaluate(FIND)
    ok('Search (⌘K) finds a patient by the record number shown under the name — V-TRAIN2 or part of it (it found nothing)',
       pid == 'V-TRAIN1' and all('Mochi Training' in res[q] for q in res) and 'Biscuit' not in res['V-TRAIN2'], [pid, res])
    await pg.keyboard.press('Escape'); await pg.keyboard.press('Escape'); await ctx.close()

    # 2. Vitals' filter: Clear, Esc, Return says Search
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(700)
    s0 = await pg.evaluate(ST, VF)
    await pg.click(VF); await pg.keyboard.type('temp'); await pg.wait_for_timeout(400)
    s1 = await pg.evaluate(ST, VF)
    n1 = await pg.evaluate("[...document.querySelectorAll('[id^=vin-]')].filter(x=>x.getClientRects().length).length")
    await pg.click('.v-filter .pvx-sf-x'); await pg.wait_for_timeout(400)
    s2 = await pg.evaluate(ST, VF); f2 = await pg.evaluate("document.activeElement&&document.activeElement.matches('.v-filter input')")
    n2 = await pg.evaluate("[...document.querySelectorAll('[id^=vin-]')].filter(x=>x.getClientRects().length).length")
    ok('Vitals: “Filter vitals by name” is a search field — no Clear button while empty, one once something is typed; Clear empties it, keeps the cursor there and shows every vital again',
       s0['x'] is False and s0['role'] == 'searchbox' and s0['ekh'] == 'search' and s1['x'] and s1['xl'] == 'Clear' and n1 == 1 and s2['v'] == '' and s2['x'] is False and f2 and n2 > 5, [s0, s1, n1, s2, f2, n2])
    await pg.keyboard.type('heart'); await pg.wait_for_timeout(300)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    s3 = await pg.evaluate(ST, VF)
    ok('…and Esc clears what’s typed', s3['v'] == '', s3)
    await ctx.close()

    # 3. Add a charge: the finder has the search symbol and Clear
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("selectCTab('charges')"); await pg.wait_for_timeout(700)
    await pg.locator('button:has-text("Add charge")').first.click(); await pg.wait_for_timeout(500)
    c0 = await pg.evaluate(ST, '.ch-q')
    await pg.click('.ch-q'); await pg.keyboard.type('glucose'); await pg.wait_for_timeout(300)
    c1 = await pg.evaluate(ST, '.ch-q')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    c2 = await pg.evaluate(ST, '.ch-q'); still = await pg.evaluate("!!document.querySelector('#tsOrderSheet .ch-q')")
    ok('Add a charge: the code-or-name finder shows the search symbol and a Clear button once something is typed; Esc clears it and the card stays open',
       c0['ic'] and c0['x'] is False and c0['role'] == 'searchbox' and c1['x'] and c2['v'] == '' and still, [c0, c1, c2, still])
    ok('no page errors', not e, e[:2])
    await ctx.close()
