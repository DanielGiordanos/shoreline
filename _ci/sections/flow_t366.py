"""Pravix Flow — the n366 build's own checks (Nov 12 2026): HIG Action sheets + Alerts (second look; n198 and n209 first).
The Hospital alert's question is Flow's own alert (named, described, light or dark, an action sheet on iPhone, no default on
Activate diversion, Esc cancels only the question); ending names the alert that's on; Ctrl+. cancels off a Mac; the duplicate
check names its button; three stacked choices are 44 pt on touch."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900, light=False, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='light' if light else 'dark')
    if touch or w < 700: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    if light: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
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

OPEN = """(async()=>{ window.__act=0; window.activateAlert=function(){ window.__act++; }; openAlertModal(); await new Promise(r=>setTimeout(r,500));
  alertDraftType='diversion'; renderAlertModal(); await new Promise(r=>setTimeout(r,200)); document.getElementById('alertActivateBtn').click(); await new Promise(r=>setTimeout(r,400)); })()"""
BOX = """(()=>{ const b=document.getElementById('confirmBox'), ae=document.activeElement, n=b.getAttribute('aria-labelledby'), d=b.getAttribute('aria-describedby');
  const L=c=>{ const m=String(c).match(/[\\d.]+/g)||[0,0,0]; return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255; };
  return {open:b.classList.contains('open'), role:b.getAttribute('role'), name:n&&document.getElementById(n).textContent, desc:d&&document.getElementById(d).textContent,
    btns:[...b.querySelectorAll('button')].filter(x=>x.offsetParent).map(x=>x.textContent.trim()+(x.classList.contains('danger')?' (red)':'')),
    focus:ae===b?'alert':ae.textContent.trim(), sheet:document.getElementById('alertModal').classList.contains('open'), own:!!document.getElementById('alertConfirm'),
    phone:b.classList.contains('pvx-as'), light:L(getComputedStyle(b).backgroundColor)>0.6,
    order:[...b.querySelectorAll('button')].filter(x=>x.offsetParent).sort((a,c)=>a.getBoundingClientRect().top-c.getBoundingClientRect().top).map(x=>x.textContent.trim())}; })()"""


@section(id='t366', title='n366 · Action sheets and Alerts: the Hospital alert asks with Flow’s own alert, Ctrl+. cancels, buttons named exactly', apps=['flow'], topics=['alerts', 'action-sheets'], engines=('chromium', 'webkit'))
async def s_t366(br):
    c, p, e = await ctx(br)
    await p.evaluate(OPEN); a = await p.evaluate(BOX)
    ok('Alerts · Activate diversion asks with Flow’s own alert: named and described for VoiceOver (alertdialog), Cancel · Activate diversion (red)',
       a['open'] and a['role'] == 'alertdialog' and a['name'] == 'Activate Emergency Service Diversion?' and a['desc'].startswith('The Client Display shows the diversion message') and a['btns'] == ['Cancel', 'Activate diversion (red)'] and not a['own'], a)
    ok('…it has no default: focus is on the alert itself, so Return does nothing until a button is chosen', a['focus'] == 'alert', a)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(200)
    ok('…Return does nothing', await p.evaluate("[window.__act, document.getElementById('confirmBox').classList.contains('open')]") == [0, True], None)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300); b = await p.evaluate(BOX)
    ok('Alerts · Esc cancels only the question: the Hospital alert sheet stays open, nothing is activated', not b['open'] and b['sheet'] and await p.evaluate("window.__act") == 0, b)
    await p.click('#alertActivateBtn'); await p.wait_for_timeout(400); await p.click('#confirmOk'); await p.wait_for_timeout(300)
    ok('…Activate diversion activates it', await p.evaluate("window.__act") == 1, None)
    await p.evaluate("closeAlertModal&&closeAlertModal()"); await p.wait_for_timeout(300)
    await p.evaluate("(async()=>{ currentAlert={type:'limited',headline:'Limited Emergency Intake',message:'High volume',created_at:new Date().toISOString()}; window.endAlert=function(){ window.__end=1; }; openAlertModal(); await new Promise(r=>setTimeout(r,500)); document.getElementById('alertEndBtn').click(); await new Promise(r=>setTimeout(r,400)); })()")
    d = await p.evaluate(BOX)
    ok('Alerts · ending names the alert that’s on (“End Limited Emergency Intake?”, not “…Diversion?”), with End alert as the default', d['name'] == 'End Limited Emergency Intake?' and d['btns'] == ['Cancel', 'End alert'] and d['focus'] == 'End alert', d)
    await p.keyboard.press('Control+Period'); await p.wait_for_timeout(300)
    ok('Alerts · Ctrl+. cancels off a Mac, as ⌘. does on one', not (await p.evaluate(BOX))['open'] and not await p.evaluate("!!window.__end"), None)
    await p.evaluate("closeAlertModal&&closeAlertModal(); currentAlert=null"); await p.wait_for_timeout(300)
    await p.evaluate("(async()=>{ openAddPatient(); await new Promise(r=>setTimeout(r,400)); PATIENTS.push(patient({name:'Dup',last:'Test',owner:'Synthetic',status:'Waiting',room:'Lobby',arrival:new Date(),prio:3,doctor:'unassigned',species:'Canine',timeline:[]})); window.__dup=fxDupAsk({name:'Dup',last:'Test',owner:'Synthetic',ownerPhone:''},()=>{}); })()")
    await p.wait_for_timeout(500); f = await p.evaluate(BOX)
    ok('Alerts · the duplicate check names its button exactly when it guides the choice (“Choose Add new visit only if …”)', f['desc'] and f['desc'].endswith('Choose Add new visit only if this is a different pet.') and 'Add new visit' in f['btns'] and await p.evaluate("window.__dup") is True, f)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, light=True)
    await p.evaluate(OPEN); g = await p.evaluate(BOX)
    ok('Alerts · in light mode the question is light, like every other alert (it was always a dark box)', g['open'] and g['light'], g)
    await c.close()

    c, p, e = await ctx(br, 390, 844)
    await p.evaluate(OPEN); h = await p.evaluate(BOX)
    ok('Action sheets · on iPhone it’s an action sheet: Activate diversion (red) first, Cancel last', h['open'] and h['phone'] and h['order'] == ['Activate diversion', 'Cancel'], h)
    await c.close()

    c, p, e = await ctx(br, 820, 1180, touch=True)
    await p.evaluate("showConfirm('Bella Canine is already checked in.','Open existing',()=>{},{sub:'Choose Add new visit only if this is a different pet.',alt:{label:'Add new visit',act:()=>{}}})"); await p.wait_for_timeout(400)
    hs = await p.evaluate("[...document.querySelectorAll('#confirmBox button')].filter(x=>x.offsetParent).map(x=>Math.round(x.getBoundingClientRect().height))")
    ok('Alerts · three stacked choices are 44 pt on touch (they were 40)', len(hs) == 3 and min(hs) >= 44, hs)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
