"""Pravix Flow — the n351 build's own checks (Nov 9 2026): HIG Text views + Web views.
Long texts grow to show what's typed (hospital alert, triage intake); the family message box has a name and a Send key;
Back and Forward close and reopen a patient or a room instead of leaving Flow. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})));
 PATIENTS.forEach(p=>{ if(p.prio===1) p.critTakenAt=new Date(); }); renderAll(); })()"""
LONG = "Owner reports intermittent vomiting for three days, now unable to keep water down; one episode of blood-tinged vomit this morning. "
H = """const w=ms=>new Promise(r=>setTimeout(r,ms)); const D=()=>document.getElementById('drawer').classList.contains('open');
 const typeIn=async(t,v)=>{ t.focus(); t.value=v; t.dispatchEvent(new Event('input',{bubbles:true})); await w(120); const r=t.getBoundingClientRect(); return {h:Math.round(r.height), fits:t.scrollHeight<=t.clientHeight+2, ov:getComputedStyle(t).overflowY}; };"""


async def ctx(br, vp=(1440, 900)):
    c = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
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


@section(id='t351', title='n351 · Text views: long texts grow, the message box has a name and a Send key · Web views: Back and Forward close and reopen a patient or a room', apps=['flow'], topics=['text-views', 'web-views'], engines=('chromium', 'webkit'))
async def s_t351(br):
    c, p, e = await ctx(br)
    a = await p.evaluate("(async()=>{" + H + """ const o={}; openAlertModal(); await w(700); const t=document.getElementById('alertMessage'), n=document.getElementById('alertNote');
      o.h0=Math.round(t.getBoundingClientRect().height); o.long=await typeIn(t, """ + repr(LONG * 3) + """); o.short=await typeIn(t,'Parking lot closed'); o.huge=await typeIn(t, """ + repr(LONG * 30) + """);
      o.max=Math.round(innerHeight*0.4); o.note=await typeIn(n, """ + repr(LONG * 3) + """); return o})()""")
    ok('Text views · the hospital alert’s public message grows to show everything typed (it was a fixed 2-line box that scrolled inside)', a['long']['h'] > a['h0'] + 20 and a['long']['fits'] and a['short']['h'] == a['h0'], a)
    ok('…up to 40% of the window, then it scrolls', abs(a['huge']['h'] - a['max']) <= 2 and a['huge']['ov'] == 'auto', a)
    ok('…the staff note grows the same way', a['note']['h'] > a['h0'] + 20 and a['note']['fits'], a)
    await p.evaluate("document.getElementById('alertClose').click()"); await p.wait_for_timeout(500)
    k = await p.evaluate("(async()=>{" + H + """ openIntake(PATIENTS.find(x=>x.name==='Milo')); await w(800); const o={};
      for(const t of document.querySelectorAll('#intakeModal textarea.ik-area')){ const h0=Math.round(t.getBoundingClientRect().height); const r=await typeIn(t, """ + repr(LONG * 4) + """); o[t.dataset.field]={h0, h:r.h, fits:r.fits}; } return o})()""")
    ok('Text views · the triage intake’s history and notes grow too, instead of scrolling inside a short box', k and all(v['h'] > v['h0'] and v['fits'] for v in k.values()), k)
    await p.evaluate("closeIntake&&closeIntake()"); await p.wait_for_timeout(500)
    m = await p.evaluate("(async()=>{" + H + """ openDrawer(PATIENTS.find(x=>x.name==='Milo').id); await w(900); const b=document.getElementById('msgBox'); return b?{lab:b.getAttribute('aria-label'), ekh:b.getAttribute('enterkeyhint')}:null})()""")
    ok('Text views · the family message box has a name for VoiceOver (“Message to the family”) and its Return key reads Send, because Return sends (it had only a placeholder)', m and m['lab'] == 'Message to the family' and m['ekh'] == 'send', m)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(600)
    b = await p.evaluate("(async()=>{" + H + """ const o={}; switchView('list'); await w(400); const id=PATIENTS.find(x=>x.name==='Milo').id, url=location.href;
      openDrawer(id); await w(600); history.back(); await w(800); o.back={open:D(), same:location.href===url, view:currentView};
      history.forward(); await w(800); o.fwd={open:D(), same:activePatient===id};
      document.querySelector('#drawerClose').click(); await w(700); o.x={open:D(), st:history.state};
      openDrawer(id); await w(500); openDrawer(PATIENTS.find(x=>x.name==='Rocky').id); await w(500); history.back(); await w(800); o.sw={open:D(), same:location.href===url};
      openLocDrawer('Room 1'); await w(600); history.back(); await w(800); o.room=document.getElementById('locDrawer').classList.contains('open');
      return o})()""")
    ok('Web views · Back closes the open patient instead of leaving Flow (it left Flow), and Forward opens the same patient again', not b['back']['open'] and b['back']['same'] and b['back']['view'] == 'list' and b['fwd']['open'] and b['fwd']['same'], b)
    ok('…closing with ✕ takes its step away, so Back doesn’t land on a closed patient', not b['x']['open'] and b['x']['st'] is None, b)
    ok('…moving to another patient in the drawer stays one step: Back closes it, still on Flow', not b['sw']['open'] and b['sw']['same'], b)
    ok('…Back closes an open room the same way', b['room'] is False, b)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
