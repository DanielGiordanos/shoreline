"""Pravix Flow — the n342 build's own checks (Nov 7 2026): HIG Drag and drop + Entering data.
A dragged card keeps its size; Add patient doesn't autofill the signed-in person's own name or phone and capitalises names;
every Triage intake and Edit triage field has a name. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}))); renderAll(); })()"""
NAMES = """(sc=>[...document.querySelectorAll(sc+' input,'+sc+' select,'+sc+' textarea')].filter(e=>e.getClientRects().length).map(e=>{
  const n=(e.labels&&e.labels.length)?e.labels[0].textContent.trim():(e.getAttribute('aria-label')||''); return [e.dataset.field||e.id||e.className, n]}))"""


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
    await p.evaluate(SEEDJS); await p.wait_for_timeout(900)
    return c, p, e


@section(id='t342', title='n342 · Drag and drop, Entering data: a dragged card keeps its size; no autofill of your own details; every triage field has a name', apps=['flow'], topics=['drag-and-drop', 'entering-data'], engines=('chromium', 'webkit'))
async def s_t342(br):
    c, p, e = await ctx(br)
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(900)
    pid = await p.evaluate("PATIENTS.find(x=>x.name==='Milo').id")
    h0 = await p.evaluate(f"document.querySelector('.card[data-pid=\"{pid}\"]').offsetHeight")
    await p.hover(f'.card[data-pid="{pid}"] .card-head, .card[data-pid="{pid}"]'); await p.wait_for_timeout(500)   # the pointer is on the card, as when a drag starts
    d = await p.evaluate("""(async()=>{ const c=document.querySelector('.card[data-pid="PID"]'); const h0=H0;
      c.classList.add('dragging'); const x=c.querySelector('.card-expand'); await new Promise(r=>setTimeout(r,450));
      const cs=x?getComputedStyle(x):null; const h1=c.offsetHeight; c.classList.remove('dragging'); return {h0,h1,expand:cs?[cs.maxHeight,cs.opacity]:null}})()""".replace('PID', pid).replace('H0', str(h0)))
    ok('Drag and drop · a card being dragged keeps its size: its hover details stay closed (they opened mid-drag and pushed the column around)', d['expand'] is None or (d['expand'][0] in ('0px', 'none') and float(d['expand'][1]) == 0) and abs(d['h1'] - d['h0']) < 2, d)
    a = await p.evaluate("""(async()=>{ openAddPatient(); await new Promise(r=>setTimeout(r,700)); const g=id=>{const x=document.getElementById(id); return {ac:x.getAttribute('autocomplete'), cap:x.getAttribute('autocapitalize'), ph:x.placeholder, im:x.getAttribute('inputmode')}};
      return {name:g('apName'), owner:g('apOwner'), phone:g('apPhone'), breed:g('apBreed')} })()""")
    ok('Entering data · Add patient doesn’t offer the signed-in person’s own name or phone for the owner (autofill was on for the owner’s name and phone)', a['owner']['ac'] == 'off' and a['phone']['ac'] == 'off' and a['name']['ac'] == 'off' and a['phone']['im'] == 'tel', a)
    ok('Entering data · names and breeds start with a capital on iPhone and iPad; the owner example is a made-up name', all(a[k]['cap'] == 'words' for k in ('name', 'owner', 'breed')) and 'Giordano' not in a['owner']['ph'], a)
    await p.focus('#apOwner'); await p.keyboard.press('Enter'); await p.wait_for_timeout(200)
    nx = await p.evaluate("document.activeElement&&document.activeElement.id")
    ok('Entering data · Return on the owner’s name moves to the phone number (the keyboard’s key says Next)', nx == 'apPhone', nx)
    await p.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); document.getElementById('apModal').classList.remove('open')"); await p.wait_for_timeout(400)
    t = await p.evaluate("(async()=>{ openIntake(PATIENTS.find(x=>x.name==='Rocky')); await new Promise(r=>setTimeout(r,900)); return (" + NAMES + ")('#intakeBody') })()")
    ok('Entering data · every Triage intake field has a name for VoiceOver and Voice Control (seven had only placeholder text), in sentence case', len(t) >= 7 and all(n and n[0].isupper() and n[1:] == n[1:].lower().replace('dvm', 'DVM') for _, n in t), t)
    await p.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))"); await p.wait_for_timeout(500)
    r = await p.evaluate("(async()=>{ document.getElementById('intakeModal').classList.remove('open'); openTriageEdit(PATIENTS.find(x=>x.name==='Rocky')); await new Promise(r=>setTimeout(r,900)); return (" + NAMES + ")('#triEditBody') })()")
    named = dict(r)
    ok('Entering data · Edit triage’s Chief complaint, History and Completed by fields have names too (they had only a heading above them)', named.get('triEditChief') == 'Chief complaint' and named.get('triEditHistory') == 'History' and named.get('triEditBy') == 'Completed by' and all(n for _, n in r), r)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
