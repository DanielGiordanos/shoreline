"""Pravix Flow — the n370 build's own checks (Nov 13 2026): HIG Sheets + Windows (second look; n210 and n211 first).
The critical-patient banner steps behind an open sheet or alert; on iPhone, Edit triage, Care team, Assign to Dr. … and the
Ultrasound request are iPhone sheets (from the bottom, grabber, swipe down; Cancel or Close leading, the action trailing);
on Mac and iPad a sheet with Cancel has no ✕ as well; and a patient opens in a window of their own (⌘-click, Ctrl-click off a
Mac, a middle click, or Open in new window in the patient's menu)."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEED7 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned',95],['Milo','Chen','Waiting','Lobby',2,'unassigned',42],['Luna','Okafor','Waiting','Lobby',3,'unassigned',18],
   ['Rocky','Hale','Exam','Room 1',2,D[0],35],['Ziggy','Moreau','Diagnostics','Room 3',2,D[1],70]].forEach(r=>{
    PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:'Canine',arrival:new Date(now-r[6]*60000),reason:'Vomiting',
      timeline:[{label:'Checked in',at:new Date(now-r[6]*60000)}]})); });
  renderAll(); return PATIENTS.length; })()"""


async def ctx(br, w=1440, h=900, mac=False, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch or w < 700: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    if mac: await c.add_init_script("try{ Object.defineProperty(Navigator.prototype,'platform',{get:function(){ return 'MacIntel'; }}); }catch(e){}")
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEED7); await p.wait_for_timeout(900)
    return c, p, e

# the sheet on top: where it sits, what's in its top bar, whether the banner covers it
SHEET = """((id)=>{ const m=document.getElementById(id), r=m.getBoundingClientRect(), vis=b=>{ const q=b.getBoundingClientRect(), cs=getComputedStyle(b); return cs.display!=='none'&&cs.visibility!=='hidden'&&q.width>2&&q.height>2; };
  const head=m.querySelector('.addpt-head,.intake-head,.us-head'), hr=head.getBoundingClientRect();
  const top=[...head.querySelectorAll('button')].filter(vis).map(b=>{ const q=b.getBoundingClientRect(); return {t:(b.getAttribute('aria-label')||b.textContent).trim(), x:Math.round(q.left), r:Math.round(innerWidth-q.right), h:Math.round(q.height), dis:!!b.disabled}; });
  const g=m.querySelector('.pvx-grab'), ci=document.getElementById('critIsland');
  const hit=(x,y)=>{ const el=document.elementFromPoint(x,y); return !!(el&&m.contains(el)); };
  return {open:m.classList.contains('open'), bottom:Math.round(innerHeight-r.bottom), w:Math.round(r.width), top, grab:!!(g&&vis(g)), title:(m.querySelector('.aph-t,.ih-t,.us-h-t')||{}).textContent,
    ciOn:!!(ci&&ci.classList.contains('on')), under:document.body.classList.contains('pvx-ci-under'),
    headHit:hit(hr.left+hr.width/2,hr.top+Math.min(20,hr.height/2)) && hit(hr.left+24,hr.top+Math.min(20,hr.height/2)) && hit(hr.right-24,hr.top+Math.min(20,hr.height/2))}; })"""


async def swipe(p, cdp, sel, d=220):
    b = await p.evaluate(f"(()=>{{const r=document.querySelector('{sel}').getBoundingClientRect(); return [r.left+r.width/2, r.top+3];}})()")
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': b[0], 'y': b[1]}]})
    for k in range(1, 9):
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': b[0], 'y': b[1] + d * k / 8}]}); await p.wait_for_timeout(16)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})


@section(id='t370', title='n370 · Sheets and Windows: the banner steps behind sheets, more iPhone sheets, no ✕ beside Cancel, a patient in a new window',
         apps=['flow'], topics=['sheets-alerts', 'windows'], engines=('chromium', 'webkit'))
async def s_t370(br):
    chromium = br.browser_type.name == 'chromium'
    # ---- Mac: the banner and sheets; no ✕ beside Cancel
    c, p, e = await ctx(br)
    ci0 = await p.evaluate("(()=>{ const ci=document.getElementById('critIsland'); return {on:ci.classList.contains('on'), z:+getComputedStyle(ci).zIndex, under:document.body.classList.contains('pvx-ci-under')}; })()")
    await p.evaluate("openTriageEdit(PATIENTS.find(x=>x.name==='Milo'))"); await p.wait_for_timeout(700)
    a = await p.evaluate(SHEET + "('triEditModal')")
    ok('Critical banner · with Edit triage open, the banner steps behind the sheet’s dimmed backdrop: the sheet’s title bar is the sheet’s, end to end (before, the banner covered its title and ✕)',
       ci0['on'] and ci0['z'] > 1000 and not ci0['under'] and a['open'] and a['under'] and a['headHit'], [ci0, a])
    ok('Mac · Edit triage has Cancel and Save triage, and no ✕ beside them (Brand §9.5: never both)', a['top'] == [] and a['title'] == 'Edit triage', a)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
    b = await p.evaluate("[document.getElementById('triEditModal').classList.contains('open'), document.body.classList.contains('pvx-ci-under'), +getComputedStyle(document.getElementById('critIsland')).zIndex]")
    ok('…Esc still closes it, and the banner comes back to the front', not b[0] and not b[1] and b[2] > 1000, b)
    xs = []
    for op, mid in (("openAddPatient()", 'apModal'), ("openShiftSetup()", 'shiftModal'), ("openAssignModal(DOCTORS[0].id)", 'assignModal')):
        await p.evaluate(op); await p.wait_for_timeout(600)
        s = await p.evaluate(SHEET + f"('{mid}')"); xs.append([mid, s['top'], s['under']])
        await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
        xs.append(await p.evaluate(f"document.getElementById('{mid}').classList.contains('open')"))
    ok('…Add new patient, Shift setup and Assign to Dr. … have Cancel and no ✕; Esc closes each; the banner is behind each',
       all(x[1] == [] and x[2] for x in xs[0::2]) and not any(xs[1::2]), xs)
    await p.evaluate("(async()=>{ currentAlert={type:'limited',headline:'Limited Emergency Intake',message:'High volume',created_at:new Date().toISOString()}; openAlertModal(); })()"); await p.wait_for_timeout(700)
    al = await p.evaluate(SHEET + "('alertModal')")
    ok('…the Hospital alert with an alert on (Edit alert · End alert, no Cancel) keeps its ✕, its only way out', [x['t'] for x in al['top']] == ['Close'], al)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    await p.evaluate("openUltrasoundRequest(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(600)
    us = await p.evaluate(SHEET + "('usModal')")
    lab = await p.evaluate("document.getElementById('usModal').getAttribute('aria-labelledby').split(' ').map(i=>document.getElementById(i).textContent).join(' ')")
    ok('…the Ultrasound request is “Ultrasound request” (sentence case) to VoiceOver, keeps its ✕ (its draft is kept, so it closes rather than cancels), and the banner is behind it',
       lab.startswith('Ultrasound request ') and [x['t'] for x in us['top']] == ['Close'] and us['under'] and us['headHit'], [lab, us])
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    await p.evaluate("openDrawer(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(700)
    dr = await p.evaluate("[document.body.classList.contains('pvx-ci-under'), +getComputedStyle(document.getElementById('critIsland')).zIndex]")
    ok('…with only the patient drawer open (an inspector), the banner stays in front beside it, as n332 set', not dr[0] and dr[1] > 1000, dr)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(400)

    # ---- Windows: the patient's menu, ⌘/Ctrl-click, middle click
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(800)
    card = await p.evaluate("(()=>{ const el=[...document.querySelectorAll('#board .card[data-pid]')].find(x=>x.offsetParent&&/Rocky/.test(x.textContent)); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {id:el.getAttribute('data-pid'), x:r.left+r.width/2, y:r.top+Math.min(18,r.height/2)}; })()")
    await p.mouse.click(card['x'], card['y'], button='right'); await p.wait_for_timeout(400)
    items = await p.evaluate("[...document.querySelectorAll('[role=menu]:not([hidden]) [role=menuitem]')].filter(x=>x.offsetParent).map(x=>x.textContent.trim()).slice(0,3)")
    ok('Windows · a patient’s menu offers “Open in new window” right after Open', items[:2] == ['Open', 'Open in new window'], items)
    async with c.expect_page() as pi:
        await p.evaluate("[...document.querySelectorAll('[role=menu]:not([hidden]) [role=menuitem]')].find(x=>x.textContent.trim()==='Open in new window').click()")
    np = await pi.value; await np.wait_for_load_state('domcontentloaded')
    ok('…choosing it opens a window on that patient’s address (#open=<visit id>, no name in it)', np.url.endswith('/#open=' + card['id']), np.url)
    await np.close()
    mk = 'Meta' if await p.evaluate("/Mac|iPhone|iPad|iPod/.test(navigator.platform||'')||/Mac OS X/.test(navigator.userAgent||'')") else 'Control'   # Playwright's WebKit says it's a Mac
    async with c.expect_page() as pi:
        await p.keyboard.down(mk); await p.mouse.click(card['x'], card['y']); await p.keyboard.up(mk)
    np = await pi.value; await np.wait_for_load_state('domcontentloaded'); u2 = np.url; await np.close()
    await p.wait_for_timeout(300)
    d2 = await p.evaluate("document.getElementById('drawer').classList.contains('open')")
    async with c.expect_page() as pi:
        await p.mouse.click(card['x'], card['y'], button='middle')
    np = await pi.value; await np.wait_for_load_state('domcontentloaded'); u3 = np.url; await np.close()
    ok('…Ctrl-click off a Mac (⌘-click on one) and a middle click open it in a new window too, and leave this window as it was', u2.endswith('#open=' + card['id']) and u3.endswith('#open=' + card['id']) and not d2, [u2, u3, d2])
    await p.mouse.click(card['x'], card['y']); await p.wait_for_timeout(600)
    d3 = await p.evaluate("[document.getElementById('drawer').classList.contains('open'), String(activePatient)]")
    ok('…a plain click still opens the patient here', d3[0] and d3[1] == card['id'], d3)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(300)
    # the new window itself
    q = await c.new_page(); q.on('pageerror', lambda x: e.append(str(x)))
    await q.goto(f'http://127.0.0.1:{PORT}/#open=' + card['id']); await q.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await q.wait_for_timeout(1500)
    await q.evaluate(SEED7.replace("renderAll();", "PATIENTS[3].id=" + repr(card['id']) + "; renderAll();")); await q.wait_for_timeout(1400)
    nw = await q.evaluate("({open:document.getElementById('drawer').classList.contains('open'), pid:String(activePatient), hash:location.hash})")
    ok('…the new window opens Flow with that patient’s drawer once the board has them, and tidies its address', nw['open'] and nw['pid'] == card['id'] and nw['hash'] == '', nw)
    await q.close()
    ok('…no page errors (Mac)', not newerr(e), newerr(e))
    await c.close()

    # ---- a Mac: ⌘-click
    c, p, e = await ctx(br, mac=True)
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(800)
    card = await p.evaluate("(()=>{ const el=[...document.querySelectorAll('#board .card[data-pid]')].find(x=>x.offsetParent&&/Ziggy/.test(x.textContent)); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {id:el.getAttribute('data-pid'), x:r.left+r.width/2, y:r.top+Math.min(18,r.height/2)}; })()")
    async with c.expect_page() as pi:
        await p.keyboard.down('Meta'); await p.mouse.click(card['x'], card['y']); await p.keyboard.up('Meta')
    np = await pi.value; await np.wait_for_load_state('domcontentloaded'); u = np.url; await np.close()
    ok('…on a Mac, ⌘-click opens the patient in a new window', u.endswith('#open=' + card['id']), u)
    await c.close()

    # ---- iPhone: the four sheets
    c, p, e = await ctx(br, 390, 844)
    cdp = await c.new_cdp_session(p) if chromium else None
    await p.evaluate("openTriageEdit(PATIENTS.find(x=>x.name==='Milo'))"); await p.wait_for_timeout(800)
    t = await p.evaluate(SHEET + "('triEditModal')")
    ok('iPhone · Edit triage is an iPhone sheet: from the bottom, full width, a grabber, Cancel top left and Save triage top right, no ✕; the banner is behind it',
       t['bottom'] == 0 and t['w'] == 390 and t['grab'] and [x['t'] for x in t['top']] == ['Cancel', 'Save triage'] and t['top'][0]['x'] < 20 and t['top'][1]['r'] < 20
       and all(x['h'] >= 44 for x in t['top']) and t['under'] and t['headHit'], t)
    if cdp:
        await p.fill('#triEditModal input', '38.6'); await p.wait_for_timeout(150)
        await swipe(p, cdp, '#triEditModal .pvx-grab'); await p.wait_for_timeout(500)
        d = await p.evaluate("({open:document.getElementById('triEditModal').classList.contains('open'), conf:document.getElementById('confirmBox').classList.contains('open'), t:document.getElementById('confirmTitle').textContent, k:document.getElementById('confirmCancel').textContent})")
        await p.click('#confirmCancel'); await p.wait_for_timeout(300)
        d2 = await p.evaluate("document.getElementById('triEditModal').classList.contains('open')")
        ok('…swiping it down after typing asks “Discard your changes?” (Keep editing keeps it)', d['open'] and d['conf'] and d['t'] == 'Discard your changes?' and d['k'] == 'Keep editing' and d2, [d, d2])
    await p.evaluate("closeTriageEdit()"); await p.wait_for_timeout(500)
    await p.evaluate("openCareTeam(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(800)
    t = await p.evaluate(SHEET + "('ctModal')")
    ok('…Care team is an iPhone sheet with its ✕ Close at the top left, reachable (before, the banner sat on it)',
       t['bottom'] == 0 and t['grab'] and t['top'][:1] and t['top'][0]['t'] == 'Close care team' and t['top'][0]['x'] < 24 and t['headHit'] and t['under'], t)
    await p.evaluate("closeCareTeam()"); await p.wait_for_timeout(600)
    await p.evaluate("openAssignModal(DOCTORS[0].id)"); await p.wait_for_timeout(800)
    t = await p.evaluate(SHEET + "('assignModal')")
    ok('…Assign to Dr. … is an iPhone sheet with Cancel at the top left and no ✕', t['bottom'] == 0 and t['w'] == 390 and t['grab'] and [x['t'] for x in t['top']] == ['Cancel'] and t['top'][0]['x'] < 20, t)
    if cdp:
        await swipe(p, cdp, '#assignModal .pvx-grab'); await p.wait_for_timeout(700)
        ok('…a swipe down closes it', not await p.evaluate("document.getElementById('assignModal').classList.contains('open')"), 'still open')
    else:
        await p.evaluate("closeAssignModal()")
    await p.wait_for_timeout(400)
    await p.evaluate("openUltrasoundRequest(PATIENTS.find(x=>x.name==='Rocky').id)"); await p.wait_for_timeout(800)
    t = await p.evaluate(SHEET + "('usModal')")
    await p.fill('#usCQ', 'Foreign body?'); await p.wait_for_timeout(150)
    t2 = await p.evaluate(SHEET + "('usModal')")
    ok('…the Ultrasound request is an iPhone sheet: ✕ Close top left, Send top right (VoiceOver: “Send to Ultrasound”), dimmed until there’s a clinical question',
       t['bottom'] == 0 and t['grab'] and [x['t'] for x in t['top']] == ['Close', 'Send to Ultrasound'] and t['top'][0]['x'] < 20 and t['top'][1]['dis'] and not t2['top'][1]['dis']
       and t['title'] == 'Ultrasound request', [t, t2])
    await p.evaluate("closeUltrasound()"); await p.wait_for_timeout(500)
    ok('…iPhone: no page errors', not newerr(e), newerr(e))
    await c.close()

    # ---- iPad with touch: centred sheets, no ✕ beside Cancel; no "Open in new window" without a mouse or trackpad
    c, p, e = await ctx(br, 820, 1180, touch=True)
    await p.evaluate("openTriageEdit(PATIENTS.find(x=>x.name==='Milo'))"); await p.wait_for_timeout(800)
    t = await p.evaluate(SHEET + "('triEditModal')")
    ok('iPad · Edit triage is a centred form sheet (not from the bottom) with no ✕ beside Cancel', t['bottom'] > 40 and t['w'] < 820 and t['top'] == [] and not t['grab'], t)
    await p.evaluate("closeTriageEdit()"); await p.wait_for_timeout(400)
    it = await p.evaluate("(()=>{ const p=PATIENTS[0]; return !!(window.pvxNewWinItem&&pvxNewWinItem(p)); })()")
    ok('…with touch only, the patient’s menu doesn’t offer Open in new window (as in Treatment)', it is False, it)
    ok('…no page errors (iPad)', not newerr(e), newerr(e))
    await c.close()
