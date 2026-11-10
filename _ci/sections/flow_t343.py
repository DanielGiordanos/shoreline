"""Pravix Flow — the n343 build's own checks (Nov 7 2026): HIG Feedback + Going full screen.
Messages appear clear of search, the top bar's controls and the critical banner; the move message says where the patient is.
Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],['Nala','Brooks','Waiting','Lobby',3,'unassigned','Canine',8,'Vaccines']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}))); renderAll(); })()"""
COVER = """(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); const p=PATIENTS.filter(x=>x.status==='Waiting'&&x.name!=='Bella'); moveStatus(p[0],'Exam'); moveStatus(p[1],'Exam'); await w(700);
  const N=document.getElementById('notes'); const hit=[];
  document.querySelectorAll('#globalSearch,#logoutBtn,.theme-toggle,#critIsland.on,#subnavFlow .seg,.pvx-more-btn').forEach(e=>{ if(!e.getClientRects().length) return; const r=e.getBoundingClientRect();
    [...N.children].forEach(c=>{ const q=c.getBoundingClientRect(); if(q.width&&q.right>r.left&&q.left<r.right&&q.bottom>r.top&&q.top<r.bottom) hit.push((e.id||e.className).toString().slice(0,24)) }) });
  return {n:N.children.length, hit:[...new Set(hit)], first:N.firstElementChild?N.firstElementChild.textContent.replace(/\\s+/g,' ').trim():'', inView:[...N.children].every(c=>c.getBoundingClientRect().bottom<=innerHeight)}})()"""


async def ctx(br, w, h):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if w < 900: o.update(has_touch=True, is_mobile=w < 700)
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
    await p.evaluate(SEEDJS); await p.wait_for_timeout(900); await p.evaluate("switchView('flow')"); await p.wait_for_timeout(800)
    return c, p, e


@section(id='t343', title='n343 · Feedback: messages appear clear of search, the top bar and the critical banner; the move message says where the patient is', apps=['flow'], topics=['feedback'], engines=('chromium', 'webkit'))
async def s_t343(br):
    for w, h, label in ((1440, 900, 'Mac'), (1180, 820, 'iPad landscape'), (820, 1180, 'iPad portrait'), (390, 844, 'iPhone')):
        c, p, e = await ctx(br, w, h)
        r = await p.evaluate(COVER)
        ok(f'{label} · messages after a move cover nothing you need: search, Log out, the light/dark switch, the sections and the critical banner stay clear (they sat on all of these for about 4 s after every move)', r['n'] >= 2 and not r['hit'] and r['inView'], r)
        if label == 'Mac':
            ok('Feedback · the move message says where the patient is: “Moved to Exam · Milo · in Lobby” (it said “now in Lobby”, as if they had gone back)', 'now in' not in r['first'] and '· in Lobby' in r['first'], r['first'])
        ok('…no page errors', not newerr(e), newerr(e))
        await c.close()
