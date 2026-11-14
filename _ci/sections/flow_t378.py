"""Pravix Flow — the n378 build's own checks (Nov 13 2026): Flow at rest does nothing.
The critical-banner placement removed a class from the drawer on every run, present or not; that counts as a change, so every
page-wide watcher ran again on the next frame, for ever. Now a value is written only when it differs, the once-a-second code
leaves equal values alone, and the banner's clock changes its text in place. What the banner, the groups, the meters and the
figures do is as before."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900):
    c = await br.new_context(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
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

SEED9 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],['Luna','Okafor','Waiting','Lobby',3,'unassigned','Canine',18,'Limping'],
   ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Cleo','Varga','Exam','Room 2',3,D[1],'Feline',22,'Ear infection'],['Ziggy','Moreau','Diagnostics','Room 3',1,D[2],'Canine',70,'Collapse'],
   ['Pepper','Nakamura','Procedure','Room 4',2,D[0],'Canine',55,'Abdominal pain'],['Oscar','Lindqvist','Procedure','Room 5',2,D[1],'Feline',120,'Laceration'],['Nala','Brooks','Waiting','Lobby',3,'unassigned','Canine',8,'Vaccines']]
   .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
  renderAll(); return PATIENTS.length; })()"""

# every change to the page over ms: how many, how many to the drawer's class, how many replaced a node or an attribute
REST = """(async(ms)=>{ const rec=[]; const o=new MutationObserver(r=>r.forEach(x=>rec.push(x))); o.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
  await new Promise(r=>setTimeout(r,ms)); o.disconnect(); const dr=document.getElementById('drawer');
  const where=x=>{ let n=x.target.nodeType===3?x.target.parentElement:x.target; return x.type+(x.attributeName?'['+x.attributeName+']':'')+' '+(n?(n.id?'#'+n.id:n.tagName.toLowerCase()+'.'+String(n.className&&n.className.baseVal!==undefined?n.className.baseVal:n.className||'').split(' ')[0]):'?'); };
  const top={}; rec.forEach(x=>{ const k=where(x); top[k]=(top[k]||0)+1; });
  return {n:rec.length, drawer:rec.filter(x=>x.target===dr).length, structural:rec.filter(x=>x.type!=='characterData').length, top:Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5),
          banner:!!document.querySelector('#critIsland.on'), open:dr.classList.contains('open')}; })"""

SEM = """(()=>{ const q=s=>[...document.querySelectorAll(s)];
  const grp=id=>{ const b=q('#'+id+' button'); return {n:b.length, radio:b.every(x=>x.getAttribute('role')==='radio'), checked:b.filter(x=>x.getAttribute('aria-checked')==='true').length, tab0:b.filter(x=>x.tabIndex===0).length}; };
  const seg=q('#switcher .seg'), cur=seg.filter(x=>x.getAttribute('aria-current')), rails=q('.command-kpi__rail');
  const b=document.getElementById('cfBadge');
  return {arr:grp('apArrival'), prio:grp('apPrio'), cur:cur.length, curIsActive:cur.every(x=>x.classList.contains('active')), curVal:cur.map(x=>x.getAttribute('aria-current')),
    rails:rails.length, meters:rails.filter(r=>r.getAttribute('role')==='meter'&&r.getAttribute('aria-valuemin')==='0'&&r.getAttribute('aria-valuemax')==='100'&&r.hasAttribute('aria-valuenow')&&r.getAttribute('aria-valuetext')).length,
    groups:q('#view-dashboard .panel[role="group"][aria-labelledby]').length, badge:b?[b.getAttribute('aria-hidden'), b.closest('.seg').getAttribute('aria-label')]:null,
    kpi:q('#kpiRow .command-kpi__value').map(x=>x.textContent.trim())}; })()"""


@section(id='t378', title='n378 · Efficiency: Flow at rest leaves the page alone (it re-swept it on every frame); the banner, the groups, the meters and the figures behave as before',
         apps=['flow'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t378(br):
    c, p, e = await ctx(br)
    await p.evaluate(SEED9); await p.evaluate("switchView('dashboard')"); await p.wait_for_timeout(9000)   # past Flow's own start-up sweeps
    r = await p.evaluate(REST, 3000)
    ok('At rest · Command with a critical patient waiting: in 3 seconds the page changes only for the banner’s clock (it changed hundreds of times: a sweep on every frame)',
       r['banner'] and r['n'] <= 12 and r['drawer'] == 0, r)
    ok('…and that clock changes its text in place: nothing is added, removed or re-marked', r['structural'] <= 2, r)
    t1 = await p.evaluate("(()=>{ const w=document.querySelector('#critIsland .ci-wait'); window.__n=w.firstChild; return w.textContent; })()")
    await p.wait_for_timeout(2200)
    t2 = await p.evaluate("(()=>{ const w=document.querySelector('#critIsland .ci-wait'); return [w.textContent, w.firstChild===window.__n, w.childNodes.length]; })()")
    ok('…the clock still counts (“Waiting 1:35:12”, then a later time)', t1.startswith('Waiting ') and t2[0].startswith('Waiting ') and t2[0] != t1 and t2[1] and t2[2] == 1, [t1, t2])

    s = await p.evaluate(SEM)
    ok('What the sweeps mark is still there · Arrival and Priority are radio groups with one choice checked and one Tab stop; the open section is the only one marked current',
       s['arr']['n'] >= 2 and s['arr']['radio'] and s['arr']['checked'] == 1 and s['arr']['tab0'] == 1 and s['prio']['n'] == 3 and s['prio']['radio'] and s['prio']['tab0'] == 1
       and s['cur'] == 1 and s['curIsActive'], s)
    ok('…every Command meter has its role, range, value and spoken value; the panels are named groups; the Consent forms badge is hidden from VoiceOver and its tab named',
       s['rails'] >= 1 and s['meters'] == s['rails'] and s['groups'] >= 2 and s['badge'] and s['badge'][0] == 'true' and s['badge'][1].startswith('Consent forms'), s)
    k1 = s['kpi']
    await p.evaluate("""(()=>{ const now=Date.now(); for(let i=0;i<3;i++) PATIENTS.push(patient({name:'Kpi'+i,last:'Test',owner:'Synthetic Test',status:'Waiting',room:'Lobby',prio:3,doctor:'unassigned',species:'Canine',arrival:new Date(now-5*60000),reason:'Cough',timeline:[]})); renderAll(); })()""")
    await p.wait_for_timeout(2500)
    k2 = await p.evaluate("[...document.querySelectorAll('#kpiRow .command-kpi__value')].map(x=>x.textContent.trim())")
    ok('…and the Command figures still follow the patients (three more waiting changes them)', k1 != k2 and len(k2) == len(k1) and len(k1) >= 3, [k1, k2])

    # the drawer open beside the banner (wide window): at rest, and the banner moves beside it
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(5000)
    d = await p.evaluate(REST, 3000)
    pl = await p.evaluate("(()=>{ const i=document.getElementById('critIsland'), dr=document.getElementById('drawer'), a=i.getBoundingClientRect(), b=dr.getBoundingClientRect(); return {left:i.style.left, pad:dr.classList.contains('pvx-ci-pad'), clear:a.right<=b.left+1||a.bottom<=b.top+1||dr.classList.contains('pvx-ci-pad')}; })()")
    ok('A patient open · at rest too (the drawer’s class is left alone), and the banner sits beside the drawer, not over it', d['open'] and d['n'] <= 12 and d['drawer'] == 0 and (pl['left'] or pl['pad']) and pl['clear'], [d, pl])
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(900)
    cl = await p.evaluate("(()=>{ const i=document.getElementById('critIsland'), dr=document.getElementById('drawer'); return {left:i.style.left, pad:dr.classList.contains('pvx-ci-pad'), v:dr.style.getPropertyValue('--pvx-ci-pad')}; })()")
    ok('…closing the patient puts the banner back in the middle', cl['left'] == '' and not cl['pad'] and cl['v'] == '', cl)
    for v in ('list', 'rooms'):
        await p.evaluate(f"switchView('{v}')"); await p.wait_for_timeout(3500)
        x = await p.evaluate(REST, 2500)
        ok(f'…at rest on {"Patients" if v == "list" else "Rooms"} as well', x['n'] <= 12 and x['drawer'] == 0, x)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # a narrow window: no room beside the drawer, so the drawer makes room under the banner
    c, p, e = await ctx(br, 1000, 800)
    await p.evaluate(SEED9); await p.evaluate("switchView('dashboard')"); await p.wait_for_timeout(2500)
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(6000)
    n = await p.evaluate("(()=>{ const i=document.getElementById('critIsland'), dr=document.getElementById('drawer'); return {on:i.classList.contains('on'), pad:dr.classList.contains('pvx-ci-pad'), v:dr.style.getPropertyValue('--pvx-ci-pad'), left:i.style.left}; })()")
    x = await p.evaluate(REST, 3000)
    ok('A narrow window · with no room beside it, the open patient starts under the banner (as before), and Flow is at rest there too',
       n['on'] and ((n['pad'] and n['v'].endswith('px')) or n['left']) and x['n'] <= 12 and x['drawer'] == 0, [n, x])
    ok('…no page errors (narrow)', not newerr(e), newerr(e))
    await c.close()
