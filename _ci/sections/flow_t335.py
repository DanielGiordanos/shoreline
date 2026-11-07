"""Pravix Flow — the n335 build's own checks: HIG Typography and Branding (Nov 6 2026), on Flow's page. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

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


async def view(p, v, wait=900):
    await p.evaluate(f"document.getElementById('stage').scrollTop=0; switchView('{v}')"); await p.wait_for_timeout(wait)

# every visible text in a view (outside the shared top bar): [text, size, weight, tracking px, family, numerals, transform, class]
TEXTS = """(v=>{const o=[];const root=v?document.getElementById(v):document.body;const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){const t=n.textContent.trim();const el=n.parentElement;if(!t||!el||!el.getClientRects().length||el.closest('.topnav,#pvxTopnav,script,style,.pvx-more-menu'))continue;
 let q=el,vis=true;while(q&&q.nodeType===1){const c=getComputedStyle(q);if(+c.opacity<.05||c.visibility==='hidden'){vis=false;break}q=q.parentElement}if(!vis)continue;const cs=getComputedStyle(el);
 o.push([t.slice(0,40),parseFloat(cs.fontSize),+cs.fontWeight,cs.letterSpacing==='normal'?0:parseFloat(cs.letterSpacing),cs.fontFamily.split(',')[0].replace(/"/g,''),cs.fontVariantNumeric,cs.textTransform,(el.className+'').split(' ')[0],!!el.closest('#switcher')])}return o})"""
TITLE = "(t=>{const w=t.split(/\\s+/).filter(x=>/^[A-Za-z]/.test(x));if(w.length<2)return false;const r=w.slice(1);return r.some(x=>/^[A-Z][a-z]+$/.test(x))&&r.every(x=>/^[A-Z]/.test(x)||/^(of|and|to|a|an|the|in|on|for|or|by|at|with)$/.test(x))})"
NAMES = ('Client Display', 'In Exam', 'In Procedure', 'Check-in → Exam', 'Comfort Room', 'Pravix Flow', 'VCA Shoreline')


@section(id='t335', title='n335 · Flow follows the HIG Typography and Branding pages', apps=['flow'], topics=['typography', 'branding'], engines=('chromium', 'webkit'))
async def s_t335(br):
    c, p, e = await ctx(br)
    allt = {}
    for v in ('dashboard', 'list', 'flow', 'rooms', 'consent'):
        await view(p, v); allt[v] = await p.evaluate(TEXTS + f"('view-{v}')")
    isl = await p.evaluate(TEXTS + "('critIsland')")
    await p.evaluate("(()=>{const x=PATIENTS.find(q=>q.name==='Rocky'); openDrawer(x.id)})()"); await p.wait_for_timeout(900)
    allt['drawer'] = await p.evaluate(TEXTS + "('drawer')")
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(400)
    rows = [r for v in allt.values() for r in v] + isl
    # Branding · one voice
    names = await p.evaluate("(()=>[...document.querySelectorAll('.pvx-open,.doctag,.dctr,.wd-name,.wd-longest,.secondary,.dd-name,.r-name,.r-spec,#dName,#dOwner,.c-reason,.fv-wait-chip,.cz-head')].map(e=>e.textContent.trim()))()")
    tc = []
    for r in rows:
        if r[6] == 'uppercase' or any(r[0].startswith(x) for x in NAMES) or any(r[0] in n for n in names if n): continue
        if await p.evaluate(TITLE + "(" + repr(r[0]).replace("\\'", "'") + ")"): tc.append(r[0])
    ok('Branding · one voice: titles, labels, buttons and statuses are in sentence case (it read “Command Center”, “Take Case”, “In Use”, “Awaiting Assignment”…)', not tc, tc[:8])
    h = await p.evaluate("(()=>({h1:document.querySelector('#view-dashboard h1').textContent.trim(), take:(document.querySelector('#critIsland .ci-take')||{}).textContent, kick:(document.querySelector('#critIsland .ci-kicker')||{}).textContent}))()")
    ok('…“Command center”, and the banner reads “Critical patient · Lobby” with “Take case”', h['h1'] == 'Command center' and h['take'] == 'Take case' and (h['kick'] or '').startswith('Critical patient ·'), h)
    up = [r[0] for r in rows if r[6] == 'uppercase' and len(r[0].split()) >= 4 and r[7] not in ('vb-prog',)]
    ok('…capitals only on short eyebrow labels, never a sentence (“NO COMPLETIONS YET TODAY”, “READY FOR NEXT PATIENT”, “5 ROOMS IN USE”)', not up and not [r[0] for r in rows if 'ROOMS IN USE' in r[0]], up[:6])
    tm = [r[0] for r in rows if 'iPad' in r[0]]
    ok('Branding · no other company’s trademark in Flow’s words (“the client iPad” → “the check-in tablet”)', not tm, tm)
    # Typography
    fam = sorted({r[4] for r in rows})
    ok('Typography · one typeface: the system font on every text (the Patients filter chips were Arial)', fam == ['-apple-system'], fam)
    wt = sorted({r[2] for r in rows})
    ok('…five weights only, 400–800 (there were 550, 650 and 720)', set(wt) <= {400, 500, 600, 700, 800}, wt)
    tr = [r[:4] for r in rows if r[1] <= 12.5 and r[3] < -0.01 and r[6] != 'uppercase' and not r[8]]
    ok('…the system’s own tracking: no text at 12.5 pt or under is tightened (12 pt card lines were −0.16 pt)', not tr, tr[:6])
    num = [r[0] for r in rows if any(ch.isdigit() for ch in r[0]) and all(ch.isdigit() or ch in ' :.,%·-–+/hmdsAPMtp' for ch in r[0]) and 'tabular-nums' not in r[5]]
    ok('…numbers that change line up (tabular): waits, counts, times, percentages', not num, num[:8])
    cl = await p.evaluate("(async()=>{switchView('client'); await new Promise(r=>setTimeout(r,700)); const t=[...document.querySelectorAll('#view-client *')].find(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>3)); const cs=getComputedStyle(document.getElementById('view-client')); const pi=document.querySelector('#view-client .pm-init'); return {ls:cs.letterSpacing, fvn:cs.fontVariantNumeric, pi:pi?getComputedStyle(pi).fontWeight:'720'}})()")
    ok('…the Client Display (the lobby screen) keeps its type exactly as it was', cl['ls'] not in ('normal', '0px') and cl['fvn'] == 'normal' and cl['pi'] == '720', cl)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # iPhone: fields at 16 pt so Safari doesn't zoom on tap
    c, p, e = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    f = await p.evaluate("""(async()=>{const o=[]; const add=e=>{if(e.getClientRects().length) o.push([e.id||e.className, parseFloat(getComputedStyle(e).fontSize)])};
      add(document.getElementById('globalSearch')); const x=PATIENTS.find(q=>q.name==='Rocky'); openDrawer(x.id); await new Promise(r=>setTimeout(r,900));
      document.querySelectorAll('#drawer select, #drawer input:not([type=checkbox]):not([type=radio]), #drawer textarea').forEach(add); return o})()""")
    ok('Typography · iPhone: search and the drawer’s fields are 16 pt or more, so Safari doesn’t zoom the page on tap (search was 14, the pickers 13)', f and all(x[1] >= 16 for x in f), f)
    tb = await p.evaluate(TEXTS + "('switcher')")
    ok('…the iPhone tab bar keeps its slight tightening, the one exception (five labels fit in 390 pt)', tb and all(r[3] <= 0 for r in tb), tb[:3])
    ok('…no page errors (iPhone)', not newerr(e), newerr(e))
    await c.close()
