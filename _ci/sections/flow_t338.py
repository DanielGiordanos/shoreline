"""Pravix Flow — the n338 build's own checks (Nov 7 2026): HIG Layout + Materials recheck after n336/n337.
The iPhone tab bar keeps its label size at larger text; the drawer's header keeps clear of Close; the critical banner's wait and reason
wrap at larger text instead of being cut off. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Pepper','Nakamura','Exam','Room 2',3,D[1],'Canine',22,'Abdominal pain'],
 ['Oscar','Lindqvist','Procedure','Room 5',2,D[1],'Feline',120,'Laceration']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}))); renderAll(); })()"""
X = "(a,b)=>a.right>b.left+0.5&&a.left<b.right-0.5&&a.bottom>b.top+0.5&&a.top<b.bottom-0.5"


async def ctx(br, w=1440, h=900, big=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if w < 700: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
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
    await p.evaluate(SEEDJS); await p.wait_for_timeout(1200)
    return c, p, e

TABS = """(()=>{const X=""" + X + """; const t=[...document.querySelectorAll('#subnavFlow #switcher .seg')].filter(s=>s.getClientRects().length&&getComputedStyle(s).display!=='none');
  const lab=t.map(s=>{const r=document.createRange(); const n=[...s.childNodes].find(x=>x.nodeType===3&&x.textContent.trim())||[...s.querySelectorAll('span')].find(x=>x.textContent.trim()&&!x.classList.contains('cf-badge')); if(!n) return null; r.selectNodeContents(n); return r.getBoundingClientRect()});
  const hit=[]; lab.forEach((a,i)=>{ if(!a) return; const s=t[i].getBoundingClientRect(); if(a.left<s.left-0.5||a.right>s.right+0.5) hit.push(t[i].textContent.trim()+' leaves its tab'); lab.forEach((b,j)=>{ if(j>i&&b&&X(a,b)) hit.push(t[i].textContent.trim()+' / '+t[j].textContent.trim()) }) });
  return {n:t.length, fs:[...new Set(t.map(s=>getComputedStyle(s).fontSize))], bottom:t.length?Math.round(t[0].getBoundingClientRect().bottom):0, H:innerHeight, hit}})()"""
HEAD = """(async()=>{const X=""" + X + """; const p=PATIENTS.find(x=>x.status==='Waiting'); openDrawer(p.id); await new Promise(r=>setTimeout(r,1100));
  const c=document.getElementById('drawerClose').getBoundingClientRect(); const o=[];
  document.querySelectorAll('#drawer .drawer-head .d-name-row *').forEach(e=>{ if(!e.getClientRects().length) return; const r=e.getBoundingClientRect(); if(r.width&&X(r,c)) o.push((e.id||e.className||e.tagName).toString().slice(0,24)) });
  const rs=document.querySelector('#drawer .resus-set').getBoundingClientRect(); return {hit:o, gap:Math.round(c.left-rs.right), resusTop:Math.round(rs.top), nameTop:Math.round(document.getElementById('dName').getBoundingClientRect().top)}})()"""
BANNER = """(()=>{const i=document.getElementById('critIsland'); if(!i||!i.classList.contains('on')) return null; const o=[];
  i.querySelectorAll('.ci-meta,.ci-name,.ci-kicker,.ci-take,.ci-main span').forEach(e=>{ if(e.scrollWidth>e.clientWidth+1) o.push(e.className+' '+e.textContent.trim().slice(0,30)) });
  const inn=i.querySelector('.ci-inner'); return {cut:o, fits:inn.offsetHeight<=i.getBoundingClientRect().height+1, meta:i.querySelector('.ci-meta').textContent.trim(), h:Math.round(i.getBoundingClientRect().height)}})()"""


@section(id='t338', title='n338 · Layout recheck: the iPhone tab bar at larger text, the drawer header clears Close, the critical banner wraps instead of cutting off', apps=['flow'], topics=['layout'], engines=('chromium', 'webkit'))
async def s_t338(br):
    # iPhone at 200 % text
    c, p, e = await ctx(br, 390, 844, big=True)
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(900)
    t = await p.evaluate(TABS)
    ok('iPhone, 200 % text · the tab bar’s labels keep the tab bar’s size (11 pt) and stay inside their tabs (they grew to 22 pt and ran into each other: “CommanPatients”, “RooConsent”)', t['n'] == 5 and t['fs'] == ['11px'] and not t['hit'] and t['bottom'] <= t['H'], t)
    b = await p.evaluate(BANNER)
    ok('iPhone, 200 % text · the critical banner shows the whole wait and reason (it read “Waitin…”) and is tall enough for them', b and not b['cut'] and b['fits'], b)
    d = await p.evaluate(HEAD)
    ok('iPhone, 200 % text · the drawer’s name and Resuscitation button keep clear of Close', not d['hit'] and d['gap'] >= 0 or d['resusTop'] > d['nameTop'], d)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    # iPhone at normal text
    c, p, e = await ctx(br, 390, 844)
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(900)
    t = await p.evaluate(TABS)
    ok('iPhone · the tab bar is unchanged at normal text (11 pt, five tabs, nothing overlapping)', t['n'] == 5 and t['fs'] == ['11px'] and not t['hit'], t)
    d = await p.evaluate(HEAD)
    ok('iPhone · the drawer’s Resuscitation button no longer runs under Close (7 pt overlap); it takes the next line when the name needs the room', not d['hit'], d)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    # iPad portrait and Mac: nothing moves
    for w, h in ((820, 1180), (1440, 900)):
        c, p, e = await ctx(br, w, h)
        d = await p.evaluate(HEAD)
        b = await p.evaluate(BANNER)
        ok(f'{w}×{h} · the drawer header keeps Resuscitation beside the name, clear of Close, and the banner is whole', not d['hit'] and d['resusTop'] - d['nameTop'] < 12 and (b is None or not b['cut']), {'head': d, 'banner': b})
        await c.close()
