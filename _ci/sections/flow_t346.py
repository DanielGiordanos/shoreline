"""Pravix Flow — the n346 build's own checks (Nov 8 2026): HIG Modality + Multitasking.
Esc cancels only the topmost thing (a Discharge question inside the drawer); a sheet over the drawer keeps Tab inside it and
gives focus back to what opened it. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}))); renderAll(); })()"""
ST = "({drawer:document.getElementById('drawer').classList.contains('open'), q:!!document.querySelector('#dispConfirm .confirmation'), ct:document.getElementById('ctModal').classList.contains('open'), a:document.activeElement&&(document.activeElement.id||document.activeElement.className.toString().slice(0,40))})"
TOP_HAS_FOCUS = "(()=>{const m=document.getElementById('ctModal'); return m.classList.contains('open')&&m.contains(document.activeElement)})()"


async def ctx(br):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEEDJS); await p.wait_for_timeout(800)
    return c, p, e


@section(id='t346', title='n346 · Modality: Esc cancels only the topmost thing; a sheet over the drawer keeps focus inside and gives it back', apps=['flow'], topics=['modality'], engines=('chromium', 'webkit'))
async def s_t346(br):
    c, p, e = await ctx(br)
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(900)
    await p.click('#drawer .disposition-card.discharge'); await p.wait_for_timeout(600)
    a = await p.evaluate(ST)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
    b = await p.evaluate(ST)
    ok('Modality · Esc on “Discharge Rocky?” cancels just the question: the drawer stays open and focus goes back to Discharge (Esc closed the drawer too and left focus on the page)', a['q'] and b['drawer'] and not b['q'] and 'discharge' in (b['a'] or ''), [a, b])
    await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
    d = await p.evaluate(ST)
    ok('Modality · a second Esc closes the drawer', not d['drawer'], d)
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(900)
    await p.focus('#drawer #careTeamCard'); await p.keyboard.press('Enter'); await p.wait_for_timeout(700)
    stray = 0
    for _ in range(25):
        await p.keyboard.press('Tab')
        if not await p.evaluate(TOP_HAS_FOCUS): stray += 1
    ok('Modality · Tab stays inside Care team while it’s open over the drawer (it wandered into the drawer behind 17 times in 25)', stray == 0, stray)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(700)
    f = await p.evaluate(ST)
    ok('Modality · closing Care team gives focus back to the Care team card in the drawer, and the drawer works again', not f['ct'] and f['drawer'] and f['a'] == 'careTeamCard' and not await p.evaluate("document.getElementById('drawer').inert"), f)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
