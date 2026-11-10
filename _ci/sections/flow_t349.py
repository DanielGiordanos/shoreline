"""Pravix Flow — the n349 build's own checks (Nov 9 2026): HIG Searching + Settings.
Search corrects a typo, says why a patient matched, offers P1 / stage filters, shows its scope on Patients and the board,
and Recent can be cleared (and is forgotten at sign-out); Talk to Flow is a per-screen setting in the + menu. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lind','Procedure','Room 5',3,D[1],'Feline',80,'Laceration']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})));
 PATIENTS.forEach(p=>{ if(p.prio===1) p.critTakenAt=new Date(); }); renderAll(); })()"""
FAKE_SR = """(()=>{ class FakeSR{ constructor(){ window.__rec=this; } start(){ window.__recStarted=(window.__recStarted||0)+1; } stop(){ setTimeout(()=>{ this.onend&&this.onend(); },10); } abort(){} }
  window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR;
  try{ navigator.mediaDevices.getUserMedia=async function(){ const C=window.AudioContext||window.webkitAudioContext; return new C().createMediaStreamDestination().stream; }; }catch(e){} })()"""
NO_SR = "(()=>{ window.SpeechRecognition=undefined; window.webkitSpeechRecognition=undefined; })()"
TYPE = """async q=>{ const inp=document.getElementById('globalSearch'); inp.focus(); inp.value=q; inp.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,450));
  return [...document.querySelectorAll('#searchResults .sr-item, #searchResults .sr-none, #searchResults .sr-hint, #searchResults .sr-label')].map(x=>x.textContent.replace(/\\s+/g,' ').trim()) }"""


async def ctx(br, sr=FAKE_SR):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP); await c.add_init_script(sr)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def load():
        await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
        await p.evaluate(SEEDJS); await p.wait_for_timeout(800)
    await load()
    return c, p, e, load


async def typed(p, q):
    return await p.evaluate("(" + TYPE + ")(" + repr(q) + ")")


@section(id='t349', title='n349 · Searching: corrections, why it matched, filters, a visible scope, clearable Recent; Settings: Talk to Flow per screen', apps=['flow'], topics=['searching', 'settings'], engines=('chromium', 'webkit'))
async def s_t349(br):
    c, p, e, load = await ctx(br)
    r = await typed(p, 'Bela')
    ok('Searching · a typo shows the closest name: “No matches for “Bela”. Showing Bella.” with Bella Rivera (it said “No matches”)', any('Showing Bella' in x for x in r) and any(x.startswith('BR') and 'Bella Rivera' in x for x in r), r)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(700)
    d = await p.evaluate("document.getElementById('drawer').classList.contains('open') && document.getElementById('drawer').textContent.includes('Bella')")
    ok('…and Return opens her', d, d)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(500)
    r = await typed(p, 'Synthetic Ri')
    ok('Searching · a match on the owner says so: “… · Owner Synthetic Rivera”', any('Bella Rivera' in x and 'Owner Synthetic Rivera' in x for x in r), r)
    r1 = await typed(p, 'p1'); r2 = await typed(p, 'critical'); r3 = await typed(p, 'wait')
    ok('Searching · “p1” and “critical” offer the P1 · Critical filter; a stage name offers everyone in it (they said “No matches”)', any('P1 · Critical patients' in x for x in r1) and any('P1 · Critical patients' in x for x in r2) and any('All patients in Waiting' in x for x in r3), [r1, r2, r3])
    await typed(p, 'p1'); await p.keyboard.press('Enter'); await p.wait_for_timeout(700)
    f = await p.evaluate("({view:currentView, prio:filters.prio, q:document.getElementById('globalSearch').value, chip:!!document.querySelector('#filterBar .chip.active[data-f=prio][data-v=\"1\"]')})")
    ok('…choosing it opens Patients with P1 on, and the search cleared', f['view'] == 'list' and f['prio'] == 1 and f['q'] == '' and f['chip'], f)
    await p.evaluate("filters={status:null,prio:null,doctor:null,liaison:null}; renderFilterBar(); renderTable();")
    hid = await p.evaluate("PATIENTS.find(x=>x.name==='Bella').hid")
    await typed(p, hid); await p.evaluate("document.body.click(); document.getElementById('globalSearch').blur()"); await p.wait_for_timeout(400)
    h = await p.evaluate("[...document.querySelectorAll('#tableBody tr')].map(t=>t.textContent.includes('Bella'))")
    ok('Searching · a patient ID filters the list the same as it finds her in search (the list said “No patients match”)', h == [True], [hid, h])
    # scope
    await typed(p, 'mil'); await p.evaluate("document.body.click(); document.getElementById('globalSearch').blur()"); await p.wait_for_timeout(400)
    s = await p.evaluate("({sc:document.querySelector('#view-list .pvx-scope.on')?.textContent.replace(/\\s+/g,' ').trim(), rc:document.getElementById('resCount').textContent})")
    ok('Searching · Patients says what it’s filtered by, “Matching “mil” · Clear search”, and the count reads “1 patient” (was “1 Patients”, with nothing saying why)', s['sc'] and 'Matching “mil”' in s['sc'] and 'Clear search' in s['sc'] and s['rc'] == '1 patient', s)
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(600)
    b = await p.evaluate("({sc:document.querySelector('#view-flow .pvx-scope.on')?.textContent.replace(/\\s+/g,' ').trim(), empty:[...document.querySelectorAll('#board .empty-mini b')].map(x=>x.textContent)})")
    ok('Searching · the board says it too, with the count (“· 1 of 4”), and its emptied columns say “No matches here” rather than “No exams in progress”', b['sc'] and 'Matching “mil” · 1 of 4' in b['sc'] and b['empty'] and all(x == 'No matches here' for x in b['empty']), b)
    await p.click('#view-flow .pvx-scope button[data-clear]'); await p.wait_for_timeout(500)
    k = await p.evaluate("({q:document.getElementById('globalSearch').value, on:!!document.querySelector('#view-flow .pvx-scope.on'), f:document.activeElement&&document.activeElement.tagName})")
    ok('…“Clear search” there clears it and puts focus on the view’s title', k['q'] == '' and not k['on'] and k['f'] == 'H1', k)
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(400)
    await typed(p, 'Bela'); await p.evaluate("document.body.click(); document.getElementById('globalSearch').blur()"); await p.wait_for_timeout(400)
    fx = await p.evaluate("document.querySelector('#view-list .pvx-scope button[data-fix]')?.textContent")
    if fx: await p.click('#view-list .pvx-scope button[data-fix]'); await p.wait_for_timeout(500)
    fx2 = await p.evaluate("({q:document.getElementById('globalSearch').value, rows:document.querySelectorAll('#tableBody tr').length})")
    ok('Searching · when nothing matches, the scope line offers the correction (“Search “Bella””) and it works', fx == 'Search “Bella”' and fx2['q'] == 'Bella' and fx2['rows'] == 1, [fx, fx2])
    await p.evaluate("(()=>{const i=document.getElementById('globalSearch'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); i.blur();})()"); await p.wait_for_timeout(300)
    # Recent
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(600); await p.evaluate("closeDrawer()"); await p.wait_for_timeout(500)
    r = await typed(p, '')
    await p.click('#searchResults .pvx-rclear'); await p.wait_for_timeout(300)
    r2 = await typed(p, '')
    ok('Searching · Recent has “Clear”, and it clears (Recent had no way to clear it)', any(x.startswith('Recent') for x in r) and any('Rocky Hale' in x for x in r) and not any('Rocky Hale' in x for x in r2), [r, r2])
    await p.evaluate("document.getElementById('globalSearch').blur(); openDrawer(PATIENTS.find(x=>x.name==='Milo').id)"); await p.wait_for_timeout(600); await p.evaluate("closeDrawer()"); await p.wait_for_timeout(400)
    lo = await p.evaluate("(()=>{ const a=pvxRecent.list().length; logout(); return [a, pvxRecent.list().length]; })()")
    ok('…and signing out forgets it, so the next person doesn’t see who was opened (it came back once the board reloaded)', lo == [1, 0], lo)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    # Settings: Talk to Flow
    c, p, e, load = await ctx(br)
    await p.click('#fabAdd'); await p.wait_for_timeout(500)
    v0 = await p.evaluate("(()=>{const b=document.getElementById('opsVoice'); return {shown:!b.hidden&&b.offsetHeight>0, ck:b.getAttribute('aria-checked'), role:b.getAttribute('role'), s:document.getElementById('opsVoiceS').textContent, talk:!document.getElementById('fvTalk').hidden}})()")
    ok('Settings · the + menu has “Talk to Flow · On · this screen”, a checkbox item beside Reminder chime (it could only be turned off with ?voice=off in the address)', v0['shown'] and v0['ck'] == 'true' and v0['role'] == 'menuitemcheckbox' and v0['s'] == 'On · this screen' and v0['talk'], v0)
    await p.click('#opsVoice'); await p.wait_for_timeout(300)
    v1 = await p.evaluate("({ck:document.getElementById('opsVoice').getAttribute('aria-checked'), s:document.getElementById('opsVoiceS').textContent, talk:getComputedStyle(document.getElementById('fvTalk')).display, ls:localStorage.getItem('flowVoice')})")
    await p.keyboard.press('Escape'); await p.evaluate("document.activeElement&&document.activeElement.blur()")
    st0 = await p.evaluate("window.__recStarted||0"); await p.keyboard.down('Space'); await p.wait_for_timeout(300); await p.keyboard.up('Space'); st1 = await p.evaluate("window.__recStarted||0")
    ok('Settings · turning it off hides the mic and Space no longer listens; it’s kept for this screen', v1['ck'] == 'false' and v1['s'] == 'Off · this screen' and v1['talk'] == 'none' and v1['ls'] == 'off' and st1 == st0, [v1, st0, st1])
    await load()
    await p.click('#fabAdd'); await p.wait_for_timeout(500)
    v2 = await p.evaluate("({ck:document.getElementById('opsVoice').getAttribute('aria-checked'), talk:getComputedStyle(document.getElementById('fvTalk')).display})")
    await p.click('#opsVoice'); await p.wait_for_timeout(300)
    v3 = await p.evaluate("({ck:document.getElementById('opsVoice').getAttribute('aria-checked'), talk:getComputedStyle(document.getElementById('fvTalk')).display, ls:localStorage.getItem('flowVoice')})")
    ok('Settings · after reloading it’s still off, and turning it back on works at once, no reload (before, a screen opted out had no mic until ?voice=on)', v2['ck'] == 'false' and v2['talk'] == 'none' and v3['ck'] == 'true' and v3['talk'] != 'none' and v3['ls'] is None, [v2, v3])
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e, load = await ctx(br, NO_SR)
    await p.click('#fabAdd'); await p.wait_for_timeout(500)
    ns = await p.evaluate("({item:document.getElementById('opsVoice').hidden, talk:!!document.getElementById('fvTalk')})")
    ok('Settings · where the browser can’t do speech, the item isn’t offered', ns['item'] and not ns['talk'], ns)
    await c.close()
