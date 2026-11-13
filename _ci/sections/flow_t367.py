"""Pravix Flow — the n367 build's own checks (Nov 12 2026): HIG Panels + Page controls (second look; n210 first).
The patient drawer is an inspector from 1024 pt and on Command's attention items; the Lobby / Treatment panel is a panel
beside the Rooms grid (not modal) on iPad and Mac, and modal only where it fills an iPhone."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEED6 = """(()=>{ const now=Date.now(); [['Ina','Waiting','Lobby',1],['Jax','Waiting','Lobby',2],['Kit','Exam','Room 1',2],['Lou','Exam','Room 2',3]].forEach((r,i)=>PATIENTS.push(patient({name:r[0],last:'Panel',owner:'Synthetic',status:r[1],room:r[2],arrival:new Date(now-(i+3)*600000),prio:r[3],doctor:'unassigned',species:'Canine',timeline:[]}))); renderAll(); })()"""


async def ctx(br, w=1440, h=900, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch or w < 700: o.update(has_touch=True, is_mobile=True)
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
    await p.evaluate(SEED6); await p.wait_for_timeout(500)
    return c, p, e


def pts(view, w):
    return f"""(()=>{{ const seen={{}}, out=[]; [...document.querySelectorAll('#view-{view} [data-pid]')].forEach(e=>{{ const r=e.getBoundingClientRect(), id=e.getAttribute('data-pid');
      if(seen[id]||!e.offsetParent||r.height<24||r.x+30>{w}-470||r.top<170) return; seen[id]=1; out.push([id, r.x+Math.min(30,r.width/2), r.y+r.height/2]); }}); return out.slice(0,2); }})()"""
OPEN = "[document.getElementById('drawer').classList.contains('open'), String(activePatient)]"


async def two(p, view, w, tap=False):
    await p.evaluate(f"switchView('{view}')"); await p.wait_for_timeout(700)
    q = await p.evaluate(pts(view, w))
    if len(q) < 2: return None, q
    for k in (0, 1):
        if tap: await p.touchscreen.tap(q[k][1], q[k][2])
        else: await p.mouse.click(q[k][1], q[k][2])
        await p.wait_for_timeout(700)
        if k == 0: a = await p.evaluate(OPEN)
    b = await p.evaluate(OPEN)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    return (a == [True, q[0][0]], b == [True, q[1][0]], b[0]), q


@section(id='t367', title='n367 · Panels: the patient drawer is an inspector from 1024 pt and on Command; the Lobby / Treatment panel isn’t modal beside the Rooms grid', apps=['flow'], topics=['panels', 'page-controls'], engines=('chromium', 'webkit'))
async def s_t367(br):
    c, p, e = await ctx(br, 1024, 768)
    r, q = await two(p, 'flow', 1024)
    ok('Panels · at 1024 pt, with a patient open, one click on another card on the board opens that patient (it closed the drawer)', r and r[0] and r[1], [r, q])
    r, q = await two(p, 'list', 1024)
    ok('…and on Patients', r and r[0] and r[1], [r, q])
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    r, q = await two(p, 'dashboard', 1440)
    ok('Panels · on Command, another patient’s attention item switches the drawer (it closed it)', r and r[0] and r[1], [r, q])
    await p.evaluate("switchView('rooms')"); await p.wait_for_timeout(600)
    await p.evaluate("openLocDrawer('Lobby')"); await p.wait_for_timeout(700)
    l = await p.evaluate("(()=>{ const d=document.getElementById('locDrawer'); return {role:d.getAttribute('role'), modal:d.getAttribute('aria-modal'), name:document.getElementById(d.getAttribute('aria-labelledby')||'x')?.textContent}; })()")
    ok('Panels · the Lobby panel beside the Rooms grid is a panel, not a modal (aria-modal false), named “Lobby”', l == {'role': 'dialog', 'modal': 'false', 'name': 'Lobby'}, l)
    await p.evaluate("(()=>{ const d=document.getElementById('locDrawer'), f=pvxOverlay.focusables(d); f[f.length-1].focus(); })()")
    await p.keyboard.press('Tab'); await p.wait_for_timeout(150)
    t = await p.evaluate("(()=>{ const d=document.getElementById('locDrawer'); return {trapped:d.contains(document.activeElement), top:pvxOverlay.top()===d}; })()")
    ok('…the keyboard isn’t trapped in it (Tab can leave it for the rooms)', t == {'trapped': False, 'top': False}, t)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    ok('…Esc still closes it', not await p.evaluate("document.getElementById('locDrawer').classList.contains('open')"), None)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, 390, 844)
    await p.evaluate("switchView('rooms'); openLocDrawer('Lobby')"); await p.wait_for_timeout(700)
    m = await p.evaluate("[document.getElementById('locDrawer').getAttribute('aria-modal'), pvxOverlay.top()===document.getElementById('locDrawer')]")
    ok('Panels · on iPhone, where it fills the screen, the Lobby panel stays modal', m == ['true', True], m)
    await c.close()

    c, p, e = await ctx(br, 820, 1180, touch=True)
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(600)
    await p.evaluate("(()=>{ const x=PATIENTS.find(isActive); openDrawer(x.id); })()"); await p.wait_for_timeout(700)
    s = await p.evaluate("[getComputedStyle(document.getElementById('drawer')).width, document.getElementById('drawer').getAttribute('aria-modal')]")
    ok('Panels · below 1024 pt the drawer stays a modal sheet (iPad portrait), as before', s[1] == 'true', s)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
