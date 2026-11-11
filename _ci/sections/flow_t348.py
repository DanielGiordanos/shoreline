"""Pravix Flow — the n348 build's own checks (Nov 9 2026): HIG Playing audio + Printing.
Staff views print on white without the screen's chrome; Print is in the + menu, the shortcuts and search; the lobby TV and the
body tag keep their own printing; Talk to Flow lets go of the microphone when it's interrupted. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],['Oscar','Lind','Procedure','Room 5',3,D[1],'Feline',80,'Laceration']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}))); renderAll(); })()"""
FAKES = """(()=>{ window.__printed=[]; window.print=function(){ window.__printed.push({cls:document.body.className, dark:document.body.classList.contains('dark'), head:(document.getElementById('pvxPrintHead')||{}).textContent||''}); };
  class FakeSR{ constructor(){ window.__rec=this; } start(){ window.__recStarted=(window.__recStarted||0)+1; } stop(){ setTimeout(()=>{ this.onend&&this.onend(); },10); } abort(){} }
  window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR;
  try{ navigator.mediaDevices.getUserMedia=async function(){ const C=window.AudioContext||window.webkitAudioContext; const s=new C().createMediaStreamDestination().stream; window.__streams=(window.__streams||[]); window.__streams.push(s); return s; }; }catch(e){}
})()"""
PRINT_ST = """(()=>{const g=s=>{const e=document.querySelector(s); return e?getComputedStyle(e):null}, d=x=>x?x.display:'none';
  return {dark:document.body.classList.contains('dark'), printing:document.body.classList.contains('pvx-printing'), html:getComputedStyle(document.documentElement).backgroundColor,
    top:d(g('.topnav')), sub:d(g('#subnavFlow')), crit:d(g('#critIsland')), notes:d(g('#notes')), drawer:d(g('#drawer')), head:d(g('#pvxPrintHead')), headT:(document.getElementById('pvxPrintHead')||{}).textContent,
    stageOv:g('#stage').overflowY, bodyH:g('body').height, board:g('#board').display, cols:[...document.querySelectorAll('#board > .col')].map(c=>c.getBoundingClientRect().width), bw:document.getElementById('board').getBoundingClientRect().width}})()"""


async def ctx(br, url=''):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP); await c.add_init_script(FAKES)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/{url}'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEEDJS); await p.wait_for_timeout(800)
    return c, p, e


@section(id='t348', title='n348 · Printing: staff views print on white and Print is easy to find; Playing audio: the microphone lets go when Flow is interrupted', apps=['flow'], topics=['printing', 'audio'], engines=('chromium', 'webkit'))
async def s_t348(br):
    c, p, e = await ctx(br)
    # Printing, the list (screen in dark)
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(700)
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.emulate_media(media='print'); await p.wait_for_timeout(300)
    a = await p.evaluate(PRINT_ST)
    ok('Printing · Patients prints on white in ink, whatever the screen’s theme (the dark screen printed dark)', a['printing'] and not a['dark'] and a['html'] in ('rgb(255, 255, 255)', 'rgba(255, 255, 255, 1)'), a)
    ok('Printing · the top bar, sub-nav, critical banner, notes and drawer stay off the page; a line says what was printed and when', all(a[k] == 'none' for k in ('top', 'sub', 'crit', 'notes', 'drawer')) and a['head'] != 'none' and 'Patients' in a['headT'] and 'Printed' in a['headT'], a)
    ok('Printing · the view runs on across pages instead of stopping at the first (the scrolling stage cut it off)', a['stageOv'] == 'visible', a)
    await p.emulate_media(media='screen'); await p.evaluate("window.dispatchEvent(new Event('afterprint'))"); await p.wait_for_timeout(300)
    b = await p.evaluate(PRINT_ST)
    ok('Printing · afterwards the screen is as it was (dark, top bar back)', b['dark'] and not b['printing'] and b['top'] != 'none', b)
    # the board: every stage, full width
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(700)
    await p.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await p.emulate_media(media='print'); await p.wait_for_timeout(300)
    f = await p.evaluate(PRINT_ST)
    ok('Printing · the board prints every stage, one under the other at full width (only the first column fit the page)', f['board'] == 'block' and len(f['cols']) >= 4 and all(w > f['bw'] - 4 for w in f['cols']) and 'Pravix Flow · Board' in f['headT'], f)
    await p.emulate_media(media='screen'); await p.evaluate("window.dispatchEvent(new Event('afterprint'))"); await p.wait_for_timeout(200)
    # the body tag keeps its own print
    t = await p.evaluate("(()=>{document.body.classList.add('end-tagging'); window.dispatchEvent(new Event('beforeprint')); const r=document.body.classList.contains('pvx-printing'); window.dispatchEvent(new Event('afterprint')); document.body.classList.remove('end-tagging'); return r})()")
    ok('…the body tag (and consent copy) keep their own print: no Flow page styling on top', not t, t)
    # + menu
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(500)
    await p.click('#fabAdd'); await p.wait_for_timeout(500)
    m = await p.evaluate("(()=>{const it=document.getElementById('opsPrint'); return {shown:!!it&&!it.hidden&&it.offsetHeight>0, t:it&&it.textContent.replace(/\\s+/g,' ').trim(), role:it&&it.getAttribute('role')}})()")
    ok('Printing · the + menu offers “Print…”, named for the view with its key (“Patients · ⌘P”)', m['shown'] and 'Print…' in m['t'] and 'Patients' in m['t'] and ('⌘P' in m['t'] or 'Ctrl P' in m['t']) and m['role'] == 'menuitem', m)
    await p.click('#opsPrint'); await p.wait_for_timeout(700)
    pr = await p.evaluate("({n:window.__printed.length, last:window.__printed.slice(-1)[0], after:document.body.className})")
    ok('Printing · choosing it prints the page prepared for paper, then puts the screen back', pr['n'] == 1 and 'pvx-printing' in pr['last']['cls'] and not pr['last']['dark'] and 'pvx-printing' not in pr['after'] and 'dark' in pr['after'].split(), pr)
    # search
    await p.click('#globalSearch'); await p.keyboard.type('print'); await p.wait_for_timeout(700)
    s = await p.evaluate("[...document.querySelectorAll('#searchResults .sr-t')].map(x=>x.textContent.trim())")
    ok('Printing · search answers “print” with Print Patients', any(x.startswith('Print Patients') for x in s), s)
    await p.keyboard.press('Escape'); await p.evaluate("document.activeElement&&document.activeElement.blur()"); await p.wait_for_timeout(300)
    # shortcuts sheet
    await p.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true}))"); await p.wait_for_timeout(600)
    k = await p.evaluate("document.body.innerText.includes('Print this view')")
    ok('Printing · the keyboard shortcuts list ⌘P Print this view', k, k)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    # Playing audio: hold Space to talk, then Flow goes to the background
    await p.evaluate("document.activeElement&&document.activeElement.blur()")
    await p.keyboard.down('Space'); await p.wait_for_timeout(500)
    v0 = await p.evaluate("({on:document.getElementById('fvTalk').getAttribute('aria-pressed'), streams:(window.__streams||[]).length})")
    await p.evaluate("""(()=>{ const r=window.__rec; r.onresult&&r.onresult({resultIndex:0, results:[Object.assign([{transcript:'move Milo to Exam'}],{isFinal:false})]});
      Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'}); Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; delete document.hidden; })()""")
    await p.wait_for_timeout(900)
    v1 = await p.evaluate("({on:document.getElementById('fvTalk').getAttribute('aria-pressed'), ended:(window.__streams||[]).every(s=>s.getTracks().every(t=>t.readyState==='ended')), panel:document.getElementById('fvPanel').classList.contains('show'), milo:PATIENTS.find(x=>x.name==='Milo').status})")
    await p.keyboard.up('Space'); await p.wait_for_timeout(300)
    ok('Playing audio · when Flow goes to the background mid-sentence, the microphone closes and nothing half-heard runs (it stayed open up to 15 s, then acted)', v0['on'] == 'true' and v1['on'] == 'false' and v1['ended'] and not v1['panel'] and v1['milo'] == 'Waiting', [v0, v1])
    # hold Space, then the window loses focus (the Space release never arrives)
    await p.keyboard.down('Space'); await p.wait_for_timeout(500)
    await p.evaluate("window.dispatchEvent(new Event('blur'))"); await p.wait_for_timeout(600)
    w = await p.evaluate("document.getElementById('fvTalk').getAttribute('aria-pressed')")
    await p.keyboard.up('Space'); await p.wait_for_timeout(300)
    ok('Playing audio · holding Space when the window loses focus (Cmd-Tab) stops listening too', w == 'false', w)
    # tap to talk keeps going through a window blur
    await p.focus('#fvTalk'); await p.keyboard.press('Enter'); await p.wait_for_timeout(400)
    await p.evaluate("window.dispatchEvent(new Event('blur'))"); await p.wait_for_timeout(300)
    tp = await p.evaluate("document.getElementById('fvTalk').getAttribute('aria-pressed')")
    await p.focus('#fvTalk'); await p.keyboard.press('Enter'); await p.wait_for_timeout(400)
    ok('…a tap to talk (no key held) isn’t cut off by a window blur', tp == 'true', tp)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    # the lobby TV / Client Display is untouched
    c, p, e = await ctx(br)
    await p.evaluate("switchView('client')"); await p.wait_for_timeout(900)
    cl = await p.evaluate("(()=>{ window.dispatchEvent(new Event('beforeprint')); const r=document.body.classList.contains('pvx-printing'); window.dispatchEvent(new Event('afterprint')); return {r, item:(document.getElementById('opsPrint')||{}).hidden, can:window.pvxPrintView()} })()")
    ok('…the Client Display keeps its own printing, and Print isn’t offered there', not cl['r'] and cl['can'] is False, cl)
    await c.close()
