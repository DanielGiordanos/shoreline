"""Pravix Flow — the n350 build's own checks (Nov 9 2026): HIG Undo and redo + Charts.
Priority, doctor and liaison changes undo and redo; every Undo button is in the Cmd-Z history (discharge, taking a case);
the result of an undo is shown; chart descriptions use spoken units and real time spans. Chromium and WebKit."""
import re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lind','Procedure','Room 5',3,D[1],'Feline',80,'Laceration']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})));
 renderAll(); })()"""
KH = """(()=>{ const now=Date.now(), a=[]; for(let i=40;i>=0;i-=4) a.push({t:now-i*60000, v:20+(40-i)*2}); try{ localStorage.setItem('pvx:kpi:v1', JSON.stringify({'top|Avg Wait':a,'top|Longest':a.map(x=>({t:x.t,v:x.v+60}))})); }catch(e){} })()"""
H = """const w=ms=>new Promise(r=>setTimeout(r,ms)); const K=(k,s)=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,metaKey:true,ctrlKey:false,shiftKey:!!s,bubbles:true}));
 const note=()=>{ const n=[...document.querySelectorAll('#notes > *')].pop(); return n?n.textContent.replace(/\\s+/g,' ').trim():''; }; const P=n=>PATIENTS.find(x=>x.name===n);"""


async def ctx(br, extra=''):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    if extra: await c.add_init_script(extra)
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


@section(id='t350', title='n350 · Undo and redo: priority, doctor, liaison; every Undo in the Cmd-Z history; the result shown · Charts: spoken units and real spans', apps=['flow'], topics=['undo', 'charts'], engines=('chromium', 'webkit'))
async def s_t350(br):
    c, p, e = await ctx(br)
    r = await p.evaluate("(async()=>{" + H + """ const o={}; switchView('list'); await w(500); document.activeElement&&document.activeElement.blur();
      setPriority(P('Milo'),1); await w(500); o.n1=note(); o.btn=!![...document.querySelectorAll('#notes > *')].pop().querySelector('button');
      K('z'); await w(500); o.p2=P('Milo').prio; o.n2=note(); o.tl=(P('Milo').timeline||[]).some(x=>x.label==='Priority set to P1');
      o.touched=!!document.querySelector('#view-list tr.pvx-touched[data-pid="'+P('Milo').id+'"]');
      o.stale=[...document.querySelectorAll('#notes > *')].filter(n=>/Priority updated/.test(n.textContent)).some(n=>[...n.querySelectorAll('button')].some(b=>b.textContent.trim()==='Undo'));
      K('z',1); await w(500); o.p3=P('Milo').prio;
      assignDoctor(P('Milo'),DOCTORS[1].id); await w(400); K('z'); await w(500); o.d=P('Milo').doctor; o.nd=note();
      assignLiaison(P('Milo'),LIAISONS[0].id); await w(400); K('z'); await w(500); o.l=P('Milo').liaison||null; o.nl=note();
      return o})()""")
    ok('Undo · a priority change offers Undo, and Cmd-Z puts it back: “Priority change undone · Milo · back to P2 · Urgent” (only moves could be undone)', r['btn'] and r['p2'] == 2 and 'Priority change undone' in r['n2'] and 'back to P2' in r['n2'] and not r['tl'], r)
    ok('Undo · the result is shown: Milo’s row is outlined for a moment, and the note that offered Undo no longer offers it', r['touched'] and not r['stale'], r)
    ok('Redo · Shift-Cmd-Z makes the change again', r['p3'] == 1, r)
    ok('Undo · doctor and liaison changes undo the same way (“back to no doctor”, “back to no liaison”)', r['d'] == 'unassigned' and 'Doctor change undone' in r['nd'] and 'back to no doctor' in r['nd'] and r['l'] is None and 'Liaison change undone' in r['nl'], r)
    # a discharge: Cmd-Z right after undoes the discharge, not an older move
    d = await p.evaluate("(async()=>{" + H + """ const o={}; moveRoom(P('Rocky'),'Room 6'); await w(400); openDrawer(P('Rocky').id); await w(800);
      document.querySelector('#drawer .disposition-card.discharge').click(); await w(500); document.querySelector('#dispConfirm [data-cf=go]').click(); await w(1600);
      o.st1=P('Rocky').status; closeDrawer(); await w(700); K('z'); await w(900); o.st2=P('Rocky').status; o.room=P('Rocky').room; o.n=note(); return o})()""")
    ok('Undo · Cmd-Z right after a discharge undoes the discharge (Cmd-Z went to the change before it, and the discharge stayed)', d['st1'] == 'Discharged' and d['st2'] == 'Exam' and d['room'] == 'Room 6' and 'Reverted' in d['n'], d)
    d2 = await p.evaluate("(async()=>{" + H + """ const o={}; openDrawer(P('Rocky').id); await w(800);
      document.querySelector('#drawer .disposition-card.discharge').click(); await w(500); document.querySelector('#dispConfirm [data-cf=go]').click(); await w(1600);
      closeDrawer(); await w(5200); K('z'); await w(600); o.n1=note(); o.st1=P('Rocky').status; K('z'); await w(700); o.n2=note(); o.st2=P('Rocky').status; return o})()""")
    ok('Undo · once the discharge’s Undo has gone, Cmd-Z says so (“Can’t undo · … for 5 seconds after”) and leaves it; the next Cmd-Z can’t reach past it either (the patient has moved since)', 'Can’t undo' in d2['n1'] and '5 seconds' in d2['n1'] and d2['st1'] == 'Discharged' and d2['st2'] == 'Discharged' and 'Can’t undo' in d2['n2'], d2)
    k = await p.evaluate("(()=>{ document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); return document.body.innerText.includes('Undo the last change'); })()")
    ok('…the shortcuts list Cmd-Z as “Undo the last change”', k, k)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    # taking a critical case
    c, p, e = await ctx(br)
    t = await p.evaluate("(async()=>{" + H + """ const o={}; await w(2600); const b=P('Bella'); window.critTakeCase(b.id, DOCTORS[0].id); await w(600); o.t1=!!P('Bella').critTakenAt; o.top=pvxUndo.top()&&pvxUndo.top().label;
      document.activeElement&&document.activeElement.blur(); K('z'); await w(700); o.t2=!!P('Bella').critTakenAt; o.doc=P('Bella').doctor; o.n=note(); return o})()""")
    ok('Undo · taking a critical case is in the Cmd-Z history too: Cmd-Z puts Bella back to waiting for a doctor', t['t1'] and t['top'] == 'Case taken' and not t['t2'] and t['doc'] == 'unassigned' and 'Take undone' in t['n'], t)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    # charts
    c, p, e = await ctx(br, KH)
    ch = await p.evaluate("(async()=>{" + H + """ await w(600); const s=[...document.querySelectorAll('#kpiRow .command-kpi__spark[role=img]')].map(x=>x.getAttribute('aria-label'));
      const tr=[...document.querySelectorAll('#view-dashboard .wd-trend')].map(x=>[x.getAttribute('role'),x.getAttribute('aria-label'),x.getAttribute('aria-hidden')]);
      const rail=document.querySelector('.command-kpi__rail'); return {s, tr, rail:rail&&rail.getAttribute('aria-label')}; })()""")
    aw = [x for x in ch['s'] if x and x.startswith('Average wait')]
    ok('Charts · the wait sparkline is described in words VoiceOver says plainly: “… 20 minutes to 1 hour …, up 1 hour 20 minutes”, not “20 min”', aw and 'minutes' in aw[0] and 'hour' in aw[0] and not re.search(r'\d\s?(min|m|h)\b', aw[0]), ch['s'])
    ok('Charts · each doctor’s wait trend names its real span (“… in the last 8 minutes”, not “the last few minutes” or “steady”), and a trend with no earlier reading is hidden instead of an empty image', all((r2[0] == 'img' and 'in the last 8 minutes' in (r2[1] or '')) or (r2[2] == 'true' and not r2[0]) for r2 in ch['tr']) and not any('steady' in (r2[1] or '') or 'few' in (r2[1] or '') for r2 in ch['tr']), ch['tr'])
    ok('Charts · the rooms meter reads “Rooms in use” (it read “Rooms In Use”)', ch['rail'] == 'Rooms in use', ch['rail'])
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
