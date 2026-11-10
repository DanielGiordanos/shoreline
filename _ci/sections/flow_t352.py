"""Pravix Flow — the n352 build's own checks (Nov 9 2026): HIG Boxes + Column views.
Every box says what it holds: section titles are headings, boxes are named groups, the intern supervision box has a title,
the Triage intake box can be opened from the keyboard, Command's panels and tiles are named. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Pepper','Nakamura','Ultrasound','Room 4',2,D[0],'Canine',55,'Abdominal pain'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})));
 renderAll(); })()"""
GN = "x=>{const l=x.getAttribute('aria-labelledby'); return (l?(document.getElementById(l)||{}).textContent:x.getAttribute('aria-label'))||''}"


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


@section(id='t352', title='n352 · Boxes: section titles are headings, boxes are named groups, intern supervision has a title, Triage intake opens from the keyboard', apps=['flow'], topics=['boxes'], engines=('chromium', 'webkit'))
async def s_t352(br):
    c, p, e = await ctx(br)
    d = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); switchView('list'); await w(300); openDrawer(PATIENTS.find(x=>x.name==='Pepper').id); await w(1200);
      const D=document.getElementById('drawer'), vis=x=>!!x.offsetParent;
      const heads=[...D.querySelectorAll('[role=heading][aria-level="3"],h3')].filter(vis).map(x=>x.textContent.replace(/\\s+/g,' ').trim());
      const inBtn=[...D.querySelectorAll('[role=heading],h1,h2,h3,h4')].filter(x=>x.closest('button,[role=button]')).length;
      const groups=[...D.querySelectorAll('[role=group],section[aria-labelledby]')].filter(vis).map(""" + GN + """).map(s=>s.replace(/\\s+/g,' ').trim());
      const pi=document.getElementById('pv-intern'), pit=pi&&pi.querySelector('.pvx-box-t');
      return {heads, inBtn, groups, intern:pit?{t:pit.textContent, shown:vis(pit)}:null} })()""")
    ok('Boxes · the patient drawer’s sections are headings VoiceOver can move between: Flags, Assigned doctor, Liaison, pDVM records, Surgery, Documents, Move to stage… (the patient’s name was the only heading)',
       all(any(h.startswith(x) for h in d['heads']) for x in ('Flags', 'Assigned doctor', 'Liaison', 'pDVM records', 'Surgery', 'Documents', 'Move to stage')) and d['inBtn'] == 0, d)
    ok('Boxes · each box is a group named by its title (Flags, pDVM records, Surgery, Triage, Documents, Messages, Intern supervision)',
       all(any(g.startswith(x) for g in d['groups']) for x in ('Flags', 'pDVM records', 'Surgery', 'Triage', 'Documents', 'Messages', 'Intern supervision')), d['groups'])
    ok('Boxes · the intern supervision box has a title, “Intern supervision” (it had none)', d['intern'] and d['intern']['t'] == 'Intern supervision' and d['intern']['shown'], d['intern'])
    k = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const i=document.getElementById('intakeCard'); const o={tab:i.tabIndex, role:i.getAttribute('role'), lab:i.getAttribute('aria-label')};
      i.focus(); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await w(800); o.open=document.getElementById('intakeModal').classList.contains('open'); return o })()""")
    ok('Boxes · the Triage intake box is a button: Tab reaches it, VoiceOver hears “Triage intake — Not started…”, and Return opens the intake (Tab never reached it)', k['tab'] == 0 and k['role'] == 'button' and (k['lab'] or '').startswith('Triage intake — ') and k['open'], k)
    await p.evaluate("closeIntake(); closeDrawer()"); await p.wait_for_timeout(600)
    m = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); switchView('dashboard'); await w(900);
      return [...document.querySelectorAll('#view-dashboard [role=group]')].map(""" + GN + """).map(s=>s.trim()) })()""")
    ok('Boxes · Command’s panels and number tiles are named groups in sentence case: “Attention center”, “Client queue”, “Current wait by doctor”, “Average wait”, “Rooms in use”…',
       all(x in m for x in ('Attention center', 'Client queue', 'Current wait by doctor', 'On floor', 'Average wait', 'Rooms in use', 'Discharged today')), m)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
