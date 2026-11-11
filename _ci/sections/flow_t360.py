"""Pravix Flow — the n360 build's own checks (Nov 10 2026): HIG Pop-up buttons + Pull-down buttons.
Pop-up choices are read as words ("Klaudia Polak, Free", not "KPKlaudia PolakFree") and the button as "Doctor: Kelley Harpin";
a short pop-up (Priority's three) shows no search field but keeps its keys; the drawer's Doctor pop-up offers "No doctor" once
one is assigned, and removing one says "Doctor removed"."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


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
    return c, p, e

ADD = """(()=>{const now=Date.now();PATIENTS.push(patient({name:'Pop360',last:'Test',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(now-30*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();openDrawer(PATIENTS[PATIENTS.length-1].id);return PATIENTS[PATIENTS.length-1].id;})()"""
TRIG = "(m)=>document.querySelector('#'+m+' .dd-trigger')"
OPEN = """(m)=>{ const t=document.querySelector('#'+m+' .dd-trigger'); t.click(); }"""
PANEL = """(()=>{ const p=document.querySelector('.dd-panel.open'); if(!p) return null; const s=p.querySelector('.dd-search'), r=s.getBoundingClientRect(), i=s.querySelector('input');
  return {short:p.classList.contains('dd-short'), sw:r.width, sh:r.height, focus:document.activeElement===i, name:i.getAttribute('aria-label'), ph:i.getAttribute('placeholder'),
    opts:[...p.querySelectorAll('.dd-opt')].map(o=>({id:o.dataset.id, said:o.getAttribute('aria-label'), text:o.textContent.replace(/\\s+/g,''), none:o.classList.contains('dd-none'), hl:o.classList.contains('hl')})),
    hidden:[...p.querySelectorAll('.dd-av,.dd-badge')].every(a=>a.getAttribute('aria-hidden')==='true'), empty:(p.querySelector('.dd-empty')||{}).textContent||''}; })()"""


@section(id='t360', title='n360 · Pop-up buttons: choices read as words, short pop-ups without a search field, “No doctor” in the drawer; pull-downs unchanged', apps=['flow'], topics=['menus', 'pop-up-buttons', 'pull-down-buttons'], engines=('chromium', 'webkit'))
async def s_t360(br):
    c, p, e = await ctx(br)
    pid = await p.evaluate(ADD); await p.wait_for_timeout(700)
    # Doctor (a long list: keeps its search field)
    await p.evaluate(OPEN, 'docAssignMount'); await p.wait_for_timeout(350)
    d = await p.evaluate(PANEL)
    ok('Pop-up buttons · each doctor is read as words: name, then load (“Klaudia Polak, Free”), never the initials run in', d and len(d['opts']) > 3 and all(o['said'] and ', ' in o['said'] or o['said'] == o['text'] for o in d['opts']) and not any(o['said'][:2].isupper() and o['said'][2:3].isupper() for o in d['opts']) and d['hidden'], d and d['opts'][:3])
    ok('…a long list keeps its search field, focused, named “Search doctors”', d and not d['short'] and d['sw'] > 100 and d['focus'] and d['name'] == 'Search doctors', d and {k: d[k] for k in ('short', 'sw', 'focus', 'name')})
    ok('…while no doctor is assigned there is no “No doctor” choice (the placeholder says it)', d and not any(o['none'] for o in d['opts']), d and d['opts'][:1])
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    t = await p.evaluate(f"({TRIG})('docAssignMount').getAttribute('aria-label')")
    nm = await p.evaluate(f"doc(PATIENTS.find(x=>x.id==='{pid}').doctor).name")
    ok('…the button says “Doctor: <name>”, without the load run in', t == 'Doctor: ' + nm.split('<')[0].strip() and 'active' not in t and 'Free' not in t, [t, nm])
    # No doctor
    await p.evaluate(OPEN, 'docAssignMount'); await p.wait_for_timeout(350)
    d2 = await p.evaluate(PANEL)
    ok('…once one is assigned, “No doctor” is the first choice, set apart', d2 and d2['opts'][0]['none'] and d2['opts'][0]['said'] == 'No doctor' and not any(o['none'] for o in d2['opts'][1:]), d2 and d2['opts'][:2])
    await p.evaluate("document.querySelector('.dd-panel.open .dd-opt.dd-none').click()"); await p.wait_for_timeout(500)
    r = await p.evaluate(f"(()=>{{ const q=PATIENTS.find(x=>x.id==='{pid}'); return {{doc:q.doctor, last:q.timeline[q.timeline.length-1].label, trig:document.querySelector('#docAssignMount .dd-trigger').getAttribute('aria-label'), toast:[...document.querySelectorAll('.toast,.pvx-toast,[class*=toast]')].map(x=>x.textContent).join(' | ').slice(0,300)}}; }})()")
    ok('…choosing it removes the doctor; the timeline and the note say “Doctor removed”, the button “Doctor: none”', r['doc'] == 'unassigned' and r['last'] == 'Doctor removed' and r['trig'] == 'Doctor: none' and 'Unassigned' not in r['toast'], r)
    # Priority (three choices: no search field, keys kept)
    await p.evaluate(OPEN, 'prioMount'); await p.wait_for_timeout(350)
    pr = await p.evaluate(PANEL)
    ok('Pop-up buttons · Priority’s three choices show no search field; the hidden field still has focus and is named “Priority”', pr and pr['short'] and pr['sw'] <= 1 and pr['focus'] and pr['name'] == 'Priority' and not pr['ph'], pr and {k: pr[k] for k in ('short', 'sw', 'sh', 'focus', 'name', 'ph')})
    ok('…each priority is read as words (“P1 · Critical”), not “P1P1 · Critical”', pr and [o['said'] for o in pr['opts']][:1] == ['P1 · Critical'] and pr['hidden'], pr and [o['said'] for o in pr['opts']])
    await p.keyboard.type('c'); await p.wait_for_timeout(150)
    pc = await p.evaluate(PANEL)
    ok('…a letter moves to the choice starting with it (“c” → Critical) without filtering the others out', pc and len(pc['opts']) == 3 and pc['opts'][0]['hl'], pc and pc['opts'])
    await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    pv = await p.evaluate(f"PATIENTS.find(x=>x.id==='{pid}').prio")
    ok('…Return chooses it', pv == 1, pv)
    # an empty search names what it searched
    await p.evaluate(OPEN, 'liaAssignMount'); await p.wait_for_timeout(350)
    await p.keyboard.type('zzq'); await p.wait_for_timeout(150)
    lz = await p.evaluate(PANEL)
    ok('…a search with no result says “No matches for “zzq””, not “No doctors found” in the liaison list', lz and lz['empty'] == 'No matches for “zzq”', lz and lz['empty'])
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    # a live update while a pop-up is open (the board replaces the patient object and refills the drawer)
    await p.evaluate(OPEN, 'docAssignMount'); await p.wait_for_timeout(350)
    lv = await p.evaluate(f"""(async()=>{{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const t0=document.querySelector('#docAssignMount .dd-trigger');
      const k=PATIENTS.findIndex(x=>x.id==='{pid}'); PATIENTS[k]=Object.assign({{}},PATIENTS[k],{{timeline:PATIENTS[k].timeline.slice()}}); fillDrawer(PATIENTS[k]); await w(200);
      const same=t0===document.querySelector('#docAssignMount .dd-trigger'), exp=t0.getAttribute('aria-expanded');
      const o=[...document.querySelectorAll('.dd-panel.open .dd-opt')].find(x=>!x.classList.contains('dd-none')); const id=o.dataset.id; o.click(); await w(400);
      const q=PATIENTS.find(x=>x.id==='{pid}'); return {{same, exp, id, doc:q.doctor, trig:document.querySelector('#docAssignMount .dd-trigger').getAttribute('aria-label'), name:doc(id).name}}; }})()""")
    ok('Pop-up buttons · a live update doesn’t rebuild the drawer under an open list; the choice sticks on the current patient, and the drawer refills after', lv['same'] and lv['exp'] == 'true' and lv['doc'] == lv['id'] and lv['trig'].startswith('Doctor: ') and lv['trig'] != 'Doctor: none', lv)
    o2 = await p.evaluate(f"""(async()=>{{ const w=ms=>new Promise(r=>setTimeout(r,ms)); document.querySelector('#docAssignMount .dd-trigger').click(); await w(300);
      PATIENTS.push(patient({{name:'Other360',last:'Test',owner:'Synthetic',status:'Exam',room:'Room 2',arrival:new Date(Date.now()-20*60000),prio:3,doctor:'unassigned',species:'Feline',timeline:[]}})); const other=PATIENTS[PATIENTS.length-1]; openDrawer(other.id); await w(500);
      return {{open:!!document.querySelector('.dd-panel.open'), shows:activePatient===other.id, name:(document.querySelector('#drawer')||{{}}).textContent.includes(other.name)}}; }})()""")
    ok('…opening another patient with a list open closes the list and shows that patient', not o2['open'] and o2['shows'] and o2['name'], o2)
    # Pull-down buttons: the + menu is unchanged (an action list, ≥ 3 items, its toggles checked)
    pd = await p.evaluate("(()=>{ const b=document.getElementById('fabAdd'), m=document.getElementById('opsMenu'); return {has:b&&b.getAttribute('aria-haspopup'), role:m&&m.getAttribute('role'), n:m?m.querySelectorAll('[role^=menuitem]:not([hidden])').length:0, chk:m?m.querySelectorAll('[role=menuitemcheckbox][aria-checked]').length:0}; })()")
    ok('Pull-down buttons · the + menu is unchanged: it opens a menu of at least three actions, its toggles checked', pd['has'] in ('true', 'menu') and pd['role'] == 'menu' and pd['n'] >= 3 and pd['chk'] >= 1, pd)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
