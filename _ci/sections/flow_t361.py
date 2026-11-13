"""Pravix Flow — the n361 build's own checks (Nov 11 2026): HIG Path controls + Search fields.
Flow's search shows the longest whole placeholder that fits, never one cut mid-word; every search field has its Clear button
(pop-ups, Add flag) and Esc in Add flag clears before closing; names aren't autocorrected; pop-up choices show whole names.
Path controls are a Mac file-system control: Flow has no files or folders to show."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
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

FIT = """(()=>{ const i=document.getElementById('globalSearch'), cs=getComputedStyle(i), c=document.createElement('canvas').getContext('2d');
  c.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily; const room=i.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  return {cw:i.clientWidth, ph:i.placeholder, fits:c.measureText(i.placeholder).width<=room, ac:i.getAttribute('autocorrect'), sp:i.spellcheck}; })()"""
ADD = """(()=>{const now=Date.now();PATIENTS.push(patient({name:'Srch361',last:'Test',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(now-30*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();openDrawer(PATIENTS[PATIENTS.length-1].id);return PATIENTS[PATIENTS.length-1].id;})()"""


@section(id='t361', title='n361 · Search fields: the whole placeholder that fits, a Clear button in every search field, no autocorrect on names; whole names in pop-ups', apps=['flow'], topics=['search-fields', 'path-controls', 'pop-up-buttons'], engines=('chromium', 'webkit'))
async def s_t361(br):
    sizes = {}
    for w, h in ((1440, 900), (1180, 820), (820, 1180)):
        c, p, e = await ctx(br, w, h)
        sizes[w] = await p.evaluate(FIT); await c.close()
    c, p, e = await ctx(br, 390, 844, True); sizes[390] = await p.evaluate(FIT); await c.close()
    ok('Search fields · Flow’s placeholder always fits whole, never cut mid-word (Mac, iPad landscape and portrait, iPhone)', all(v['fits'] for v in sizes.values()), sizes)
    ok('…a wide Mac window shows the whole scope, “Search patients, doctors, rooms”', sizes[1440]['ph'] == 'Search patients, doctors, rooms' and sizes[820]['ph'] == 'Search patients, doctors, rooms', {k: v['ph'] for k, v in sizes.items()})
    ok('…and names aren’t autocorrected or spell-checked there', sizes[1440]['ac'] == 'off' and sizes[1440]['sp'] is False, sizes[1440])
    c, p, e = await ctx(br)
    pid = await p.evaluate(ADD); await p.wait_for_timeout(700)
    await p.evaluate("document.querySelector('#docAssignMount .dd-trigger').click()"); await p.wait_for_timeout(350)
    a = await p.evaluate("(()=>{ const i=document.activeElement, x=document.querySelector('.dd-panel.open .dd-clear'); return {ac:i.getAttribute('autocorrect'), sp:i.spellcheck, hidden:x&&x.hidden, name:x&&x.getAttribute('aria-label')}; })()")
    ok('Search fields · a pop-up’s search field doesn’t autocorrect or underline names, and shows no Clear while empty', a['ac'] == 'off' and a['sp'] is False and a['hidden'] is True and a['name'] == 'Clear search', a)
    await p.keyboard.type('mar'); await p.wait_for_timeout(250)
    b = await p.evaluate("(()=>{ const x=document.querySelector('.dd-panel.open .dd-clear'), r=x.getBoundingClientRect(), i=document.querySelector('.dd-panel.open .dd-search input').getBoundingClientRect(); return {hidden:x.hidden, inside:r.left>i.left&&r.right<=i.right+1&&r.top>=i.top-1&&r.bottom<=i.bottom+1, n:document.querySelectorAll('.dd-panel.open .dd-opt').length}; })()")
    ok('…with text, a Clear button sits inside the field', not b['hidden'] and b['inside'], b)
    await p.evaluate("document.querySelector('.dd-panel.open .dd-clear').click()"); await p.wait_for_timeout(250)
    d = await p.evaluate("(()=>{ const i=document.querySelector('.dd-panel.open .dd-search input'); return {open:!!document.querySelector('.dd-panel.open'), v:i&&i.value, focus:document.activeElement===i, n:document.querySelectorAll('.dd-panel.open .dd-opt').length, hidden:document.querySelector('.dd-panel.open .dd-clear').hidden}; })()")
    ok('…Clear empties it, keeps the list open and the cursor in the field, and brings every choice back', d['open'] and d['v'] == '' and d['focus'] and d['n'] > b['n'] and d['hidden'], [b, d])
    g = await p.evaluate("(()=>{ const o=[...document.querySelectorAll('.dd-panel.open .dd-opt')]; return o.map(x=>{ const n=x.querySelector('.dd-name'); return {t:n.textContent.trim(), cut:n.scrollWidth>n.clientWidth+1||getComputedStyle(n).textOverflow==='ellipsis'}; }); })()")
    ok('Pop-up buttons · every choice shows its whole name and load (a long one wraps), none ends in “…”', g and not any(x['cut'] for x in g), [x for x in g if x['cut']][:3])
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    es = await p.evaluate(f"({{open:!!document.querySelector('.dd-panel.open'), pt:activePatient==='{pid}', drawer:document.getElementById('drawer').classList.contains('open'), focus:document.activeElement===document.querySelector('#docAssignMount .dd-trigger')}})")
    ok('Pop-up buttons · Esc closes only the pop-up: the drawer stays open on the patient, and focus returns to the button', not es['open'] and es['pt'] and es['drawer'] and es['focus'], es)
    nm = await p.evaluate("(async()=>{ const q=PATIENTS.find(x=>x.id===activePatient); const d=DOCTORS.slice().sort((a,b)=>b.name.length-a.name.length)[0]; assignDoctor(q,d.id); await new Promise(r=>setTimeout(r,700)); const n=document.querySelector('#docAssignMount .dd-trigger .dd-name'); return {name:d.name, h:n.scrollHeight<=n.clientHeight+1, t:n.textContent}; })()")
    ok('…the button shows the longest doctor’s whole name (on two lines if it must)', nm['h'] and nm['t'].startswith(nm['name']), nm)
    # Add flag's search
    await p.evaluate("[...document.querySelectorAll('#drawer button')].find(x=>/Add flag/.test(x.textContent)).click()"); await p.wait_for_timeout(450)
    f0 = await p.evaluate("(()=>{ const q=document.getElementById('fgQ'); return {type:q.type, focus:document.activeElement===q, x:!!document.querySelector('#flagsMount .fg-x')}; })()")
    await p.keyboard.type('zzq'); await p.wait_for_timeout(300)
    f1 = await p.evaluate("(()=>{ const x=document.querySelector('#flagsMount .fg-x'); return {x:!!x, name:x&&x.getAttribute('aria-label'), focus:document.activeElement&&document.activeElement.id==='fgQ'}; })()")
    ok('Search fields · Add flag’s “Search or new flag” is a search field, with a Clear button once something is typed', f0['type'] == 'search' and f0['focus'] and not f0['x'] and f1['x'] and f1['name'] == 'Clear search' and f1['focus'], [f0, f1])
    await p.evaluate("document.querySelector('#flagsMount .fg-x').click()"); await p.wait_for_timeout(300)
    f2 = await p.evaluate("(()=>{ const q=document.getElementById('fgQ'); return {v:q&&q.value, focus:document.activeElement===q, x:!!document.querySelector('#flagsMount .fg-x')}; })()")
    ok('…Clear empties it and keeps the cursor there', f2['v'] == '' and f2['focus'] and not f2['x'], f2)
    await p.keyboard.type('abc'); await p.wait_for_timeout(250); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    f3 = await p.evaluate("(()=>{ const q=document.getElementById('fgQ'); return {open:!!q, v:q&&q.value, focus:document.activeElement===q}; })()")
    await p.keyboard.press('Escape')
    try: await p.wait_for_function("!document.getElementById('fgQ') && !!(document.activeElement&&document.activeElement.matches('#flagsMount [data-fg=add]'))", timeout=2500)   # n369: WebKit can take longer than 300 ms to hand focus back
    except Exception: pass
    f4 = await p.evaluate("(()=>({open:!!document.getElementById('fgQ'), focus:!!(document.activeElement&&document.activeElement.matches('#flagsMount [data-fg=add]'))}))()")
    ok('…Esc clears what’s typed first; a second Esc closes the sheet and returns to Add flag', f3['open'] and f3['v'] == '' and f3['focus'] and not f4['open'] and f4['focus'], [f3, f4])
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
