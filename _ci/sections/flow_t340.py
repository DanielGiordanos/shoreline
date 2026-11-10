"""Pravix Flow — the n340 build's own checks (Nov 7 2026): HIG Writing (with a Typography recheck).
Messages say what happened and how to fix it, in one pattern; plain words for the Directory list; one pattern for optional fields;
sentence case in the source. Chromium and WebKit."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
OLD = ['Client intake failed to sync', 'Could not reach the Client Display. Please try again.', 'Client Display connection unavailable.',
       'Could not activate alert', "toast('Could not send message')", 'Could not save shift assignments', 'Your Pravix access is now active',
       "toast('Room already occupied')", 'Primary clinician must be', "'Select a species'", "'Enter sex'", 'Enter a DOB',
       'Select a medical priority', 'Choose an active intern from Directory.', 'Bundled Directory snapshot', 'Shared roster', 'Cached shared roster',
       'not inferred from manager or shift', 'no timestamp recorded', 'View assignment history / propose handoff', '(never shown publicly)', 'Expected review time (optional)',
       'Clinical Question<', 'Relevant Diagnostics<', 'Relevant History<']


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
    await p.evaluate("""(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id); PATIENTS.push(patient({name:'Rocky',last:'Hale',owner:'Synthetic Hale',status:'Exam',room:'Room 1',prio:2,doctor:D[0],species:'Canine',arrival:new Date(now-35*60000),reason:'Cough',timeline:[]})); renderAll(); })()""")
    await p.wait_for_timeout(800)
    return c, p, e


@section(id='t340', title='n340 · Writing: messages say how to fix it in one pattern, plain words, one pattern for optional fields, sentence case in the source', apps=['flow'], topics=['writing'], engines=('chromium', 'webkit'))
async def s_t340(br):
    s = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    left = [x for x in OLD if x in s]
    ok('Writing · none of the old messages and labels are left: no “please”, “failed to”, “invalid”-style fragments or system words (snapshot, roster, inferred) in Flow’s staff messages', not left, left)
    msgs = re.findall(r"toast\('(Couldn’t[^']*)'\)", s)
    ok('Writing · failure messages share one pattern, “Couldn’t <do what> — <how to fix it>”', len(msgs) >= 5 and all(' — ' in m for m in msgs), msgs)
    c, p, e = await ctx(br)
    t = await p.evaluate("""(async()=>{ openAddPatient(); await new Promise(r=>setTimeout(r,600)); document.getElementById('apName').value='Rocky Hale';
      const sp=document.getElementById('apSpecies'); if(sp) sp.value=''; completeIntakeReview(); await new Promise(r=>setTimeout(r,300));
      const t=document.getElementById('toast'); return t?t.textContent.trim():null })()""")
    ok('Writing · a missing field says what to do (“Choose a species”, not “Select a species”)', t and 'Choose a species' in t, t)
    await p.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); document.getElementById('apModal').classList.remove('open')")
    await p.wait_for_timeout(400)
    d = await p.evaluate("""(async()=>{ const x=PATIENTS.find(p=>p.status==='Exam'); openDrawer(x.id); await new Promise(r=>setTimeout(r,1000));
      const n=document.querySelector('#pv-intern .pv-note, .pv-note'); const h=document.getElementById('pv-history'); return {note:n?n.textContent.trim():null, history:h?h.textContent.trim():null}})()""")
    ok('Writing · the drawer’s note under Intern and Supervising doctor is in plain words (it read “Bundled Directory snapshot — shared updates not connected. Supervisor is assigned explicitly, not inferred from manager or shift.”)',
       d['note'] and 'Directory list' in d['note'] and 'Choose the supervisor here' in d['note'] and not re.search(r'snapshot|roster|inferred|explicitly', d['note']), d)
    ok('Writing · the history button starts with a verb: “See history or hand off…”', d['history'] == 'See history or hand off…', d)
    u = await p.evaluate("""(async()=>{ closeDrawer(); await new Promise(r=>setTimeout(r,400)); openUltrasoundRequest(PATIENTS.find(p=>p.status==='Exam').id); await new Promise(r=>setTimeout(r,700));
      return [...document.querySelectorAll('#usModal .us-lab')].map(l=>l.firstChild&&l.firstChild.textContent.trim())})()""")
    ok('Writing · Ultrasound request’s labels are sentence case in the source too (they show in capitals; VoiceOver reads the source)', u and all(re.match(r'^[A-Z][a-z]+( [a-z]+)*$', x or '') for x in u), u)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
