"""Pravix Flow — the n336 build's own checks (Nov 7 2026, Daniel: "fix those issues"): patients in urgency order on the board,
the Patients list and the Lobby card; every shared top bar links straight to /rounds/ and /ultrasound/. Chromium and WebKit."""
import os, re, glob
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Nala','Brooks','Waiting','Lobby',3,'unassigned','Canine',8,'Vaccines'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],
 ['Ziggy','Moreau','Diagnostics','Room 3',1,D[2],'Canine',70,'Collapse'],['Pepper','Nakamura','Ultrasound','Room 4',2,D[0],'Canine',55,'Abdominal pain'],
 ['Oscar','Lindqvist','Procedure','Room 5',2,D[1],'Feline',120,'Laceration']]
 .forEach((r,i)=>{ PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})); }); renderAll(); })()"""
CROWD = """(()=>{const now=Date.now(); for(let i=0;i<15;i++) PATIENTS.push(patient({name:'Pt'+i,last:'Synth'+i,owner:'Synthetic',status:'Waiting',room:'Lobby',prio:3,doctor:'unassigned',species:'Canine',arrival:new Date(now-(i+3)*60000),reason:'Recheck',timeline:[]})); renderAll(); })()"""
# where the banner will sit once it has finished growing (its size is set at once and animated, so read the target, not the moving box)
ISL = """(()=>{const i=document.getElementById('critIsland'); if(!i||!i.classList.contains('on')) return null; const H=parseFloat(i.style.height)||i.offsetHeight, W=parseFloat(i.style.width)||i.offsetWidth, top=parseFloat(getComputedStyle(i).top), c=i.style.left?parseFloat(i.style.left):innerWidth/2; return {top, bottom:top+H, left:c-W/2, right:c+W/2, H}})()"""
# the first title, filter or control the banner would sit on, if any (null when it covers nothing)
UNDER = """(v=>{const r=""" + ISL + """; if(!r) return 'no banner'; const hit=[]; document.getElementById(v).querySelectorAll('h1,h2,h3,.col-head,button,a[href],input,select,[role=button],.chip,.kpi,th').forEach(e=>{const b=e.getBoundingClientRect(); if(!b.width||!b.height) return;
  if(b.right>r.left&&b.left<r.right&&b.bottom>r.top&&b.top<r.bottom) hit.push((e.id||e.className||e.tagName).toString().slice(0,30)+' '+(e.textContent||'').trim().slice(0,16))}); return hit.length?hit.slice(0,6):null})"""


async def ctx(br, dark=True, big=False, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light'); o.update(kw)
    c = await br.new_context(**o)
    if not dark: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    if big: await c.add_init_script("document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='200%')")
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


# the order the screens should show: P1 first, then the longest wait (earliest arrival), then the name
ORDER = "(list=>list.slice().sort((a,b)=>((+a.prio||9)-(+b.prio||9))||((+a.arrival)-(+b.arrival))||String(a.name).localeCompare(String(b.name))).map(p=>p.name))"
MORE = """(()=>{const now=Date.now(); [['Ash','Ivey','Waiting',3,2],['Juno','Park','Waiting',1,5],['Kiwi','Lund','Waiting',2,130],['Remy','Soto','Exam',1,12]].forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[2]==='Waiting'?'Lobby':'Room 6',prio:r[3],doctor:r[2]==='Waiting'?'unassigned':DOCTORS[0].id,species:'Canine',arrival:new Date(now-r[4]*60000),reason:'Recheck',timeline:[]}))); renderAll(); })()"""


async def view(p, v, wait=900):
    await p.evaluate(f"document.getElementById('stage').scrollTop=0; switchView('{v}')"); await p.wait_for_timeout(wait)


@section(id='t336', title='n336 · Patients in urgency order (board, Patients, Lobby); top bars link straight to Rounds and Ultrasound', apps=['flow'], topics=['layout', 'navigation'], engines=('chromium', 'webkit'))
async def s_t336(br):
    c, p, e = await ctx(br)
    await p.evaluate(MORE); await p.wait_for_timeout(600)
    await view(p, 'flow')
    b = await p.evaluate("(()=>{const o={}; document.querySelectorAll('#view-flow .col').forEach(c=>{const s=c.dataset.status; o[s]={shown:[...c.querySelectorAll('.card .pvx-open')].map(x=>x.textContent.trim().split(' ')[0]), want:(" + ORDER + ")(PATIENTS.filter(p=>isActive(p)&&p.status===s))}}); return o})()")
    bad = {k: v for k, v in b.items() if v['shown'] != v['want']}
    ok('Board · each column lists the most urgent first: P1, then the longest wait (the order was whatever the database returned, so a P1 waiting 95 min could sit under a P3 who just arrived)', not bad and b['Waiting']['shown'][:2] == ['Bella', 'Juno'], bad or b['Waiting'])
    await view(p, 'list')
    t = await p.evaluate("(()=>({shown:[...document.querySelectorAll('#tableBody .pvx-open')].map(x=>x.textContent.trim().split(' ')[0]), want:(" + ORDER + ")(PATIENTS.filter(isActive))}))()")
    ok('Patients · the list is in the same order: P1s first, longest wait first within a priority', t['shown'] == t['want'], t)
    await view(p, 'rooms')
    r = await p.evaluate("(()=>{const l=document.querySelector('#view-rooms .room[data-room=\"Lobby\"]'); return {shown:[...l.querySelectorAll('.pvx-open[data-pid]')].map(x=>x.textContent.trim().split(' ')[0]), want:(" + ORDER + ")(PATIENTS.filter(p=>isActive(p)&&p.room==='Lobby')).slice(0,3)}})()")
    ok('Rooms · the Lobby card shows the three most urgent waiting patients (it showed whichever three came first, so a P1 could be under “+3 more”)', r['shown'] == r['want'] and r['shown'][0] == 'Bella', r)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # every shared top bar
    old, new, pages = [], 0, 0
    for f in glob.glob(os.path.join(BUILD, '**', '*.html'), recursive=True):
        s = open(f, encoding='utf-8', errors='replace').read()
        if 'id="navUltrasound"' not in s and 'id=\\"navUltrasound\\"' not in s: continue
        pages += 1; rel = os.path.relpath(f, BUILD)
        if re.search(r'href=\\?"[^"\\]*#app=(rounds|ultrasound)\\?"', s): old.append(rel)
        if re.search(r'href=\\?"[^"\\]*/ultrasound/\\?" id=\\?"navUltrasound', s) and re.search(r'href=\\?"[^"\\]*/rounds/\\?" id=\\?"navRounds', s): new += 1
    ok(f'Top bar · on all {pages} pages with the shared top bar, Rounds and Ultrasound link to their own pages (/rounds/, /ultrasound/), not Flow’s old #app= addresses', pages >= 30 and not old and new == pages, {'pages': pages, 'old': old[:6], 'new': new})
    fm = open(os.path.join(BUILD, 'forms', 'index.html'), encoding='utf-8').read()
    ok('…and Forms’ own app list does too', "['Ultrasound','/ultrasound/'," in fm and "['Rounds','/rounds/'," in fm and '#app=ultrasound' not in fm)
    c, p, e = await ctx(br)
    await p.goto(f'http://127.0.0.1:{PORT}/treatment/'); await p.wait_for_timeout(1500)
    h = await p.evaluate("[...document.querySelectorAll('#navUltrasound, #navRounds')].map(a=>a.getAttribute('href'))")
    ok('…in Treatment, Ultrasound and Rounds open their own pages directly (no stop in Flow on the way)', h == ['https://shoreline.pravix.app/ultrasound/', 'https://shoreline.pravix.app/rounds/'] or sorted(h) == sorted(['https://shoreline.pravix.app/ultrasound/', 'https://shoreline.pravix.app/rounds/']), h)
    await c.close()
