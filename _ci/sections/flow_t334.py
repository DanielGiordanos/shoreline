"""Pravix Flow — the n334 build's own checks: HIG Layout and Materials (Nov 6 2026), on Flow's page. Chromium and WebKit."""
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


async def view(p, v, wait=1100):
    await p.evaluate(f"document.getElementById('stage').scrollTop=0; switchView('{v}')"); await p.wait_for_timeout(wait)


@section(id='t334', title='n334 · Flow follows the HIG Layout and Materials pages', apps=['flow'], topics=['layout', 'materials', 'dynamic-type'], engines=('chromium', 'webkit'))
async def s_t334(br):
    c, p, e = await ctx(br)
    # 1. a busy column
    await view(p, 'flow'); await p.evaluate(CROWD); await p.wait_for_timeout(800)
    k = await p.evaluate("(()=>{const cards=[...document.querySelectorAll('#view-flow .card')], cb=cards[0].closest('.col-body'); return {n:cards.length, squeezed:cards.filter(c=>c.scrollHeight>c.clientHeight+2).map(c=>c.clientHeight+'/'+c.scrollHeight).slice(0,4), scrolls:cb.scrollHeight>cb.clientHeight+20}})()")
    ok('Layout · a busy column (19 waiting) keeps every card whole and scrolls (cards were squeezed to 24 pt slivers once a column overflowed)', k['n'] >= 20 and not k['squeezed'] and k['scrolls'], k)
    # 2. the banner keeps clear of titles and filters at the top of the page, on a Mac
    await view(p, 'list')
    u = await p.evaluate(UNDER + "('view-list')")
    ok('Layout · on a Mac the critical-patient banner no longer sits on the Patients filters', u is None, u)
    await view(p, 'dashboard')
    d = await p.evaluate("(()=>({under:(" + UNDER + ")('view-dashboard'), room:document.getElementById('view-dashboard').hasAttribute('data-pvx-room')}))()")
    ok('…and where it covers nothing (Command on a Mac) the page keeps its layout', d['under'] is None and not d['room'], d)
    # 3. scrolled, the banner floats over the content as before; the room isn't recalculated under the person's finger
    await view(p, 'list')
    s = await p.evaluate("(async()=>{const v=document.getElementById('view-list'), st=document.getElementById('stage'), a=v.style.paddingTop; st.scrollTop=200; await new Promise(r=>setTimeout(r,300)); window.dispatchEvent(new Event('resize')); await new Promise(r=>setTimeout(r,300)); const b=v.style.paddingTop; st.scrollTop=0; await new Promise(r=>setTimeout(r,500)); return {a,b,c:v.style.paddingTop}})()")
    ok('…scrolled, the page doesn’t shift; back at the top the room is still right', s['a'] == s['b'] == s['c'] and s['a'] != '', s)
    # 4. the Client Display (lobby screen) is never touched
    await view(p, 'client')
    cl = await p.evaluate("document.getElementById('view-client').hasAttribute('data-pvx-room')||!!document.getElementById('view-client').style.paddingTop")
    ok('…the Client Display (the lobby screen) is left exactly as it was', not cl, cl)
    # 5. when the banner goes, the room goes
    await view(p, 'list')
    g = await p.evaluate("(async()=>{const x=PATIENTS.find(q=>q.name==='Bella'); x.status='Exam'; x.room='Room 2'; x.prio=2; renderAll(); await new Promise(r=>setTimeout(r,1400)); const i=document.getElementById('critIsland'); return {on:!!(i&&i.classList.contains('on')), room:document.getElementById('view-list').hasAttribute('data-pvx-room'), pad:document.getElementById('view-list').style.paddingTop}})()")
    ok('…when there’s no critical patient the page goes back to its own spacing', not g['room'] and g['pad'] == '', g)
    # 6. materials: glass only on the floating layer (a Mac: nothing in the content is frosted)
    m = await p.evaluate("(()=>{const o=[];document.querySelectorAll('#stage *').forEach(e=>{const cs=getComputedStyle(e),bf=cs.backdropFilter||cs.webkitBackdropFilter; if(bf&&bf!=='none'&&e.getClientRects().length) o.push(e.id||e.className)}); return o.slice(0,5)})()")
    ok('Materials · nothing in the content layer is frosted glass (Pravix is flat; glass is for the floating controls)', not m, m)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # 7. iPad portrait and iPhone: the title and filters are clear of the banner
    for vp, label in (({'width': 820, 'height': 1180}, 'iPad portrait'), ({'width': 390, 'height': 844}, 'iPhone')):
        c, p, e = await ctx(br, viewport=vp, has_touch=True, is_mobile=vp['width'] < 700)
        res = {}
        for v in ('dashboard', 'list', 'flow', 'rooms', 'consent'):
            await view(p, v); res[v] = await p.evaluate(UNDER + f"('view-{v}')")
        ok(f'Layout · {label}: the banner no longer hides the page title or filters (Command, Patients, Flow, Rooms, Consent forms)', not any(res.values()), res)
        if vp['width'] < 700:
            gl = await p.evaluate("(async()=>{const s=document.getElementById('globalSearch'); s.focus(); s.value='Be'; s.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,600)); const o=[]; document.querySelectorAll('body *').forEach(e=>{const cs=getComputedStyle(e),bf=cs.backdropFilter||cs.webkitBackdropFilter; if(!bf||bf==='none'||!e.getClientRects().length) return; let f=e; while(f&&f.nodeType===1&&!/fixed|sticky/.test(getComputedStyle(f).position)) f=f.parentElement; o.push([e.id||e.className, !!(f&&f.nodeType===1)])}); s.blur(); return o})()")
            ok('Materials · iPhone: glass is only on floating controls (tab bar, search results)', gl and all(x[1] for x in gl), gl)
        ok(f'…no page errors ({label})', not newerr(e), newerr(e))
        await c.close()

    # 8. larger text (200 %): names break between words, badges hold their text, the banner shows all of its text
    c, p, e = await ctx(br, big=True)
    await view(p, 'flow')
    t = await p.evaluate("""(()=>{const bad=[]; document.querySelectorAll('#view-flow .card .c-top .pvx-open').forEach(b=>{const tn=b.firstChild; if(!tn||tn.nodeType!==3) return; let i=0; for(const w of tn.textContent.split(' ')){ const r=document.createRange(); r.setStart(tn,i); r.setEnd(tn,i+w.length); const tops=new Set([...r.getClientRects()].map(x=>Math.round(x.top))); if(tops.size>1) bad.push(w); i+=w.length+1; } });
      const prio=[...document.querySelectorAll('#view-flow .card .prio')].filter(x=>x.scrollWidth>x.clientWidth+1).length;
      const i=document.getElementById('critIsland'), inn=i.querySelector('.ci-inner'); return {broken:bad.slice(0,5), prio, fits:inn.offsetHeight<=(parseFloat(i.style.height)||0)+1, root:getComputedStyle(document.documentElement).fontSize}})()""")
    ok('Layout · at 200 % text, card names wrap between words (it read “Peppe r Nakam ura”)', t['root'] == '32px' and not t['broken'], t)
    ok('…priority badges hold their text, and the banner shows all of its text', t['prio'] == 0 and t['fits'], t)
    u = await p.evaluate(UNDER + "('view-flow')")
    ok('…and the taller banner still keeps clear of the board', u is None, u)
    await c.close()

    # 9. the text size changes while the banner is open (iPhone/iPad: back from Settings) — the banner refits
    c, p, e = await ctx(br)
    await view(p, 'flow')
    f = await p.evaluate("(async()=>{const i=document.getElementById('critIsland'); const h0=parseFloat(i.style.height); document.documentElement.style.fontSize='200%'; await new Promise(r=>setTimeout(r,900)); const inn=i.querySelector('.ci-inner'); return {h0, h1:parseFloat(i.style.height), need:inn.offsetHeight}})()")
    ok('…when the text size changes with the banner open, it grows to fit its text (it cut off the name and Take Case)', f['h1'] > f['h0'] and f['need'] <= f['h1'] + 1, f)
    ok('…no page errors (text size)', not newerr(e), newerr(e))
    await c.close()
