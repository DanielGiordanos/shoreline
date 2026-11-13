"""Pravix Flow — the n363 build's own checks (Nov 11 2026): HIG Sidebars + Tab bars.
Each view keeps its own place when you switch tabs and come back; choosing the current tab again goes to its top;
the Consent forms tab says its badge in words. Sidebars: Flow uses a tab bar first, as the page recommends."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
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
    return c, p, e

SEED30 = """(()=>{ const now=Date.now(); for(let k=0;k<30;k++) PATIENTS.push(patient({name:'Scroll'+k,last:'Test',owner:'Synthetic',status:['Waiting','Exam','Diagnostics'][k%3],room:'Lobby',arrival:new Date(now-(k+5)*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]})); renderAll(); })()"""
same = lambda x, y: bool(x and y and x[0] == y[0] and abs(x[1] - y[1]) <= 6)   # the same patient, within 6 pt
FIRST = """(v)=>{ const st=document.getElementById('stage'), top=st.getBoundingClientRect().top; const c=[...document.querySelectorAll('#view-'+v+' [data-pid]')].find(x=>{ const r=x.getBoundingClientRect(); return r.height&&r.bottom>top+8; }); return c?[c.getAttribute('data-pid'), Math.round(c.getBoundingClientRect().top-top)]:null; }"""


async def place(p):
    await p.evaluate(SEED30); await p.wait_for_timeout(400)
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(600)
    await p.evaluate("(()=>{ const s=document.getElementById('stage'); s.style.scrollBehavior='auto'; s.scrollTop=900; s.style.scrollBehavior=''; })()"); await p.wait_for_timeout(600)
    a = await p.evaluate(FIRST, 'list')
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(600)
    b0 = await p.evaluate("document.getElementById('stage').scrollTop")
    await p.evaluate("(()=>{ const s=document.getElementById('stage'); s.style.scrollBehavior='auto'; s.scrollTop=300; s.style.scrollBehavior=''; })()"); await p.wait_for_timeout(500)
    bf = await p.evaluate(FIRST, 'flow')
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(700)
    c = await p.evaluate(FIRST, 'list')
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(700)
    d = await p.evaluate(FIRST, 'flow')
    await p.evaluate("switchView('rooms')"); await p.wait_for_timeout(500)
    e = await p.evaluate("document.getElementById('stage').scrollTop")
    return dict(a=a, b0=b0, bf=bf, c=c, d=d, rooms=e)


@section(id='t363', title='n363 · Tab bars: each view keeps its place; the current tab again goes to its top; the Consent forms badge in words', apps=['flow'], topics=['tab-bars', 'sidebars'], engines=('chromium', 'webkit'))
async def s_t363(br):
    c, p, e = await ctx(br)
    r = await place(p)
    ok('Tab bars · back on Patients, the same patient is at the same place (Mac)', same(r['a'], r['c']), r)
    ok('…the board keeps its own place too, and a view opened for the first time starts at its top (the board, Rooms)', r['b0'] == 0 and r['rooms'] == 0 and same(r['d'], r['bf']), r)
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(700)
    await p.click('#switcher .seg[data-view=list]'); await p.wait_for_timeout(1000)
    t = await p.evaluate("document.getElementById('stage').scrollTop")
    ok('…choosing the tab you’re on takes the view back to its top', t <= 2, t)
    lab = await p.evaluate("""(async()=>{ const b=document.getElementById('cfBadge'); const s=b.closest('.seg'); const l0=s.getAttribute('aria-label'); b.textContent='2'; b.hidden=false; await new Promise(r=>setTimeout(r,100));
      const l1=s.getAttribute('aria-label'), ah=b.getAttribute('aria-hidden'); b.hidden=true; await new Promise(r=>setTimeout(r,100)); return [l0,l1,ah,s.getAttribute('aria-label')]; })()""")
    ok('Tab bars · the Consent forms tab says its badge in words (“Consent forms, 2 waiting”), not “Consent forms2”', lab == ['Consent forms', 'Consent forms, 2 waiting', 'true', 'Consent forms'], lab)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e = await ctx(br, 390, 844, True)
    r = await place(p)
    ok('…on iPhone too (the critical banner’s room doesn’t move it)', same(r['a'], r['c']) and same(r['d'], r['bf']) and r['b0'] == 0, r)
    ok('…no page errors (iPhone)', not newerr(e), newerr(e))
    await c.close()
