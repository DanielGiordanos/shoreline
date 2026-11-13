"""Pravix Flow — the n365 build's own checks (Nov 12 2026): HIG Gauges + Progress indicators.
Rooms in use says when no room is free and is heard as "5 of 8"; Messages and Documents say what they're getting and
when it stalls; the family's "Saving…" shows it's working; Reduce Motion keeps progress moving; the first load's
placeholders breathe; the Undo countdown waits while the pointer is on it."""
import re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900, rm=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if rm: o['reduced_motion'] = 'reduce'
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

ROOMS = """(()=>{ const c=document.querySelector('.command-kpi--rooms'), r=c&&c.querySelector('.command-kpi__rail');
  return c&&{sub:c.querySelector('.command-kpi__sub').textContent, acc:c.style.getPropertyValue('--kaccent'), vt:r&&r.getAttribute('aria-valuetext'), lab:r&&r.getAttribute('aria-label'),
             val:c.querySelector('.command-kpi__value').textContent.replace(/\\s+/g,' ').trim()}; })()"""
FILL = """(()=>{ const o=execMetrics; window.execMetrics=function(){ const m=o.apply(this,arguments); return Object.assign(m,{inUse:m.totalRooms,util:100}); }; try{ renderOps(); }finally{ window.execMetrics=o; } pvxMeters.sync(); return true; })()"""
SEED3 = """(()=>{ const now=Date.now(); for(let k=0;k<3;k++) PATIENTS.push(patient({name:'Gauge'+k,last:'Test',owner:'Synthetic',status:'Waiting',room:'Lobby',arrival:new Date(now-(k+5)*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]})); renderAll(); })()"""
STALL = """(()=>{ const o=DB.collection.bind(DB); DB.collection=function(n){ return n==='messages'?{doc:()=>({collection:()=>({orderBy:()=>({get:()=>new Promise(()=>{})})})})}:o(n); }; })()"""
MSG = "(()=>{ const t=document.getElementById('msgThread'), w=t&&t.querySelector('[data-pvx-wait]'); return t&&{txt:t.textContent.trim(), spin:!!t.querySelector('.pvx-spin'), role:w&&w.getAttribute('role'), retry:!!t.querySelector('[data-pvx-retry]')}; })()"


@section(id='t365', title='n365 · Gauges and Progress indicators: Rooms in use when full, waits that say what and stall honestly, progress that keeps moving', apps=['flow'], topics=['gauges', 'progress-indicators'], engines=('chromium', 'webkit'))
async def s_t365(br):
    c, p, e = await ctx(br)
    await p.evaluate(SEED3); await p.evaluate("switchView('dashboard')"); await p.wait_for_timeout(600)
    await p.evaluate("pvxMeters.sync()"); a = await p.evaluate(ROOMS)
    ok('Gauges · Rooms in use names its value and range: “0 of 8 · 8 rooms available”, heard “0 of 8” (not “0/8”)',
       a and a['lab'] == 'Rooms in use' and re.match(r'^\d+ of \d+ · \d+ rooms? available', a['vt'] or '') and re.match(r'^\d+/ of \d+$', a['val']) and a['acc'] == 'var(--accent)', a)
    assert await p.evaluate(FILL)
    b = await p.evaluate(ROOMS)
    ok('Gauges · with every room taken, the gauge turns amber and says “No rooms available”', b and b['sub'] == 'No rooms available' and b['acc'] == 'var(--amber)' and b['vt'].startswith('8 of 8 · No rooms available'), b)

    await p.evaluate(STALL)
    await p.evaluate("(()=>{ const x=PATIENTS.find(isActive); x.publicToken='tok-n365'; openDrawer(x.id); })()"); await p.wait_for_timeout(900)
    if await p.evaluate("document.getElementById('commHead').getAttribute('aria-expanded')") != 'true': await p.click('#commHead'); await p.wait_for_timeout(500)
    m = await p.evaluate(MSG)
    ok('Progress · Messages say what they’re getting, with a spinner (not “Loading…”), as a status', m and m['txt'] == 'Getting messages…' and m['spin'] and m['role'] == 'status', m)
    await p.evaluate("document.querySelector('#msgThread [data-pvx-wait]').setAttribute('data-since', Date.now()-11000); pvxWaits.tick()")
    m2 = await p.evaluate(MSG)
    ok('…after 10 s they say the messages haven’t arrived and to check the connection, with Try again', m2 and m2['txt'].startswith('The messages haven’t arrived yet. Check the connection.') and m2['retry'] and not m2['spin'], m2)
    await p.locator('#msgThread [data-pvx-retry]').click(); await p.wait_for_timeout(300)
    ok('…Try again asks again, and waits with the spinner', (await p.evaluate(MSG))['txt'] == 'Getting messages…', await p.evaluate(MSG))
    d = await p.evaluate("[pvxWaitHTML('docs','zz').includes('Getting documents…'), (pvxWaits.docs.zz=Date.now()-11000, pvxWaitHTML('docs','zz').includes('The documents haven’t arrived yet. Check the connection.'))]")
    ok('Progress · Documents say “Getting documents…”, and after 10 s that they haven’t arrived (the same text on every repaint)', d == [True, True], d)
    await p.evaluate("typeof closeDrawer==='function'&&closeDrawer()")

    await p.evaluate("Object.defineProperty(Backend,'_gotVisits',{get:()=>false,set:()=>{},configurable:true}); pvxFlowLoading(0)"); await p.wait_for_timeout(500)
    n = await p.evaluate("[...document.querySelectorAll('#view-dashboard .command-kpi')].filter(k=>{ const s=getComputedStyle(k,'::after'); return s.animationName==='pvxWaitPulse'&&s.animationIterationCount==='infinite'; }).length")
    ok('Progress · while the patient list loads, Command’s placeholders breathe (they don’t stand still)', n >= 8, n)
    await p.evaluate("delete Backend._gotVisits; Backend._gotVisits=true"); await p.wait_for_timeout(400)

    pp = await p.evaluate("(()=>{ const x=PATIENTS.find(isActive); openDrawer(x.id); showUndo(x,'discharge',null); return true; })()")
    await p.wait_for_timeout(300)
    bx = await p.evaluate("(()=>{ const r=document.getElementById('undoToast').getBoundingClientRect(); return [r.x+r.width*0.3, r.y+r.height/2]; })()")
    await p.mouse.move(bx[0], bx[1]); await p.wait_for_timeout(5600)
    u = await p.evaluate("(()=>{ const t=document.getElementById('undoToast'), b=t.querySelector('.undo-progress'); return {open:t.classList.contains('open'), play:b&&getComputedStyle(b).animationPlayState}; })()")
    ok('Progress · the Undo countdown waits while the pointer is on it (open after 5.6 s), and its bar waits too', u['open'] and u['play'] == 'paused', u)
    await p.mouse.move(5, 5); await p.wait_for_timeout(300)
    ok('…and carries on when the pointer leaves', await p.evaluate("getComputedStyle(document.querySelector('#undoToast .undo-progress')).animationPlayState") == 'running', None)
    await p.wait_for_timeout(5400)
    ok('…then closes', not await p.evaluate("document.getElementById('undoToast').classList.contains('open')"), None)
    s = await p.evaluate("""(async()=>{ let done=0; showConfirm('Check','OK',()=>{ done=Date.now(); },{fancyConfirm:true}); const t0=Date.now(); document.getElementById('confirmOk').click();
      await new Promise(r=>setTimeout(r,700)); const rules=[...document.styleSheets].reduce((n,s)=>{ try{ return n+[...s.cssRules].filter(r=>/is-confirming|cfxProgress/.test(r.cssText)).length; }catch(x){ return n; } },0);
      return {acted:done?done-t0:null, fancy:document.getElementById('confirmBox').classList.contains('confirm-fancy'), rules}; })()""")
    ok('Progress · no simulated progress: a confirmation acts at once (the unused staged “Confirming…” fill is gone)', s['acted'] is not None and s['acted'] < 400 and not s['fancy'] and s['rules'] == 0, s)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # Reduce Motion
    c, p, e = await ctx(br, rm=True)
    await p.evaluate(SEED3)
    r = await p.evaluate("""(async()=>{ const box=document.createElement('div'); box.innerHTML='<span class="fvd-spin"></span><span class="otw-spin"></span><span class="pvx-spin"></span>'; document.body.appendChild(box);
      await new Promise(r=>setTimeout(r,200)); const spins=[...box.children].map(s=>{ const cs=getComputedStyle(s); return [cs.animationName, cs.animationIterationCount]; });
      const x=PATIENTS.find(isActive); openDrawer(x.id); showUndo(x,'discharge',null); await new Promise(r=>setTimeout(r,300));
      const b=document.querySelector('#undoToast .undo-progress'), cs=getComputedStyle(b), an=(await new Promise(r=>setTimeout(r,900)), b.getAnimations()[0]); return {spins, undo:[cs.animationName, cs.animationDuration], t:an?Math.round(an.currentTime):null, play:an&&an.playState}; })()""")
    ok('Reduce Motion · spinners fade in and out instead of stopping', all(s == ['pvxSpinFade', 'infinite'] for s in r['spins']), r['spins'])
    ok('Reduce Motion · the Undo bar still counts its 5 seconds (it emptied at once)', r['undo'] == ['undoDeplete', '5s'] and r['play'] == 'running' and 100 < (r['t'] or 0) < 4000, r)
    await p.evaluate("Object.defineProperty(Backend,'_gotVisits',{get:()=>false,set:()=>{},configurable:true}); pvxFlowLoading(0)"); await p.wait_for_timeout(500)
    n = await p.evaluate("[...document.querySelectorAll('#view-dashboard .command-kpi')].filter(k=>{ const s=getComputedStyle(k,'::after'); return s.animationName==='pvxWaitPulse'&&s.animationIterationCount==='infinite'; }).length")
    ok('Reduce Motion · the first load’s placeholders still breathe (a fade)', n >= 8, n)
    await p.evaluate("delete Backend._gotVisits; Backend._gotVisits=true")
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
