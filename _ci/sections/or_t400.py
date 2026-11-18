"""Pravix OR — the n400 build's own checks (Nov 17 2026): HIG Loading, Managing accounts, Managing notifications.
Loading: until the first answer each view shows the Pravix loader over quiet placeholders — no "Free · no more cases
today", no "0 cases", no "No cases match", no counts, and no red alert; after 10 s "Taking longer than expected"; VoiceOver
hears "OR ready · 6 cases today"; offline is said in amber, as a status. Managing accounts: signed out, OR shows Flow's
sign-in card on its own page (it sent people to Flow), and nothing read stays on the page or within reach; signing in there
brings OR back. Managing notifications: the symbol says what kind of note it is; a case booked on another screen is
announced, an emergency as an alert that stays until dismissed; a note about a case opens it; the same note never stacks."""
import os, json
import core
from core import ok, section, PORT, BUILD
import or_t390 as T

READY = "typeof CASES!=='undefined'&&CASES.length>=6"
NOTES = "[...document.querySelectorAll('#notes .note')].map(n=>({k:n.dataset.kind, role:n.getAttribute('role'), t:n.querySelector('.n-title').textContent, check:!!n.querySelector('.n-ic polyline'), open:!!n.querySelector('.n-open'), x:!!n.querySelector('.n-x')}))"


async def open_slow(br, delay):
    core.SEED, keep = T.SEED, core.SEED
    try:
        c, p, e = await core.new_page(br, vp=(1440, 900))
    finally:
        core.SEED = keep
    await c.add_init_script(core.PINJS); await c.add_init_script("window.__fsDelay=%d" % delay)
    await p.goto(f'http://127.0.0.1:{PORT}/or/')
    return c, p, e


@section(id='t400', title='n400 · OR · Loading, Managing accounts, Managing notifications: the loader instead of “Free · 0 cases” while loading, offline said, Flow’s sign-in card on OR’s own page with nothing left behind, notes by urgency and a case booked elsewhere announced',
         apps=['or'], topics=['loading', 'accounts', 'notifications'], engines=('chromium', 'webkit'))
async def s_t400(br):
    html = open(os.path.join(BUILD, 'or', 'index.html'), encoding='utf-8').read()

    c, p, e = await open_slow(br, 12000)
    await p.wait_for_timeout(1500)
    b = await p.evaluate("""(()=>{const v=document.getElementById('view-board').innerText, s=document.getElementById('storageStatus');
      return {free:/\\bFree\\b|no more cases today|\\b0 cases\\b/.test(v), ld:!!document.querySelector('#roomGrid .pvx-ld-track[role="progressbar"]'), task:v.includes('Retrieving today’s cases'),
              busy:document.getElementById('stage').getAttribute('aria-busy'), alert:!s.hidden&&s.textContent}})()""")
    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(300)
    cs = await p.evaluate("""(()=>{const v=document.getElementById('view-cases').innerText; const c=document.querySelector('#casesToolbar .cnt');
      return {empty:v.includes('No cases match'), cnt:c?getComputedStyle(c).visibility:null, res:getComputedStyle(document.querySelector('#casesToolbar .result')).visibility, ld:!!document.querySelector('#casesBody .pvx-ld')}})()""")
    await p.evaluate("switchView('analytics')"); await p.wait_for_timeout(300)
    an = await p.evaluate("(()=>{const v=document.getElementById('view-analytics').innerText; return {empty:/No cases today|No completed cases|Not enough data/.test(v), ld:!!document.querySelector('#anGrid .pvx-ld')}})()")
    await p.evaluate("switchView('board')")
    ok('Loading · until the database answers, each view shows the Pravix loader (“Retrieving today’s cases”) over placeholders: no “Free · no more cases today”, “0 cases”, “No cases match” or “No cases today”, no counts, busy for VoiceOver, and no red alert (“Connecting to the OR…” was role=alert in the critical colour)',
       not b['free'] and b['ld'] and b['task'] and b['busy'] == 'true' and not b['alert'] and not cs['empty'] and cs['cnt'] == 'hidden' and cs['res'] == 'hidden' and cs['ld']
       and not an['empty'] and an['ld'], (b, cs, an))
    await p.wait_for_timeout(9300)
    slow = await p.evaluate("[document.documentElement.classList.contains('or-load-slow'), document.getElementById('view-board').innerText.includes('Taking longer than expected')]")
    ok('…after 10 s it says “Taking longer than expected” and why (it said nothing)', slow == [True, True], slow)
    await core.until(p, READY, 6000); await p.wait_for_timeout(700)
    done = await p.evaluate("[document.getElementById('stage').getAttribute('aria-busy'), document.getElementById('orReady').textContent, document.getElementById('roomGrid').innerText.includes('Maple'), document.body.classList.contains('or-wait')]")
    ok('…and when it’s in, the board replaces the loader and VoiceOver hears “OR ready · 6 cases today”', done == ['false', 'OR ready · 6 cases today', True, False], done)
    await c.close()

    c, p, e = await T.open_or(br)
    await c.set_offline(True); await p.wait_for_timeout(400)
    o = await p.evaluate("(()=>{const n=document.getElementById('orOffline');return {shown:!n.hidden, role:n.getAttribute('role'), txt:n.textContent, col:getComputedStyle(n).color, alert:!document.getElementById('storageStatus').hidden}})()")
    await p.click('#displayBtn'); await p.wait_for_timeout(600)
    od = await p.evaluate("(()=>{const n=document.getElementById('displayOffline');return n&&!n.hidden?n.textContent:null})()")
    await p.evaluate("exitDisplay()"); await c.set_offline(False); await p.wait_for_timeout(400)
    back = await p.evaluate("document.getElementById('orOffline').hidden")
    ok('Loading · offline, OR says so in amber, as a status (not a failure), with when it last heard — on the wall display too — and stops when the connection is back (it said nothing)',
       o['shown'] and o['role'] == 'status' and o['txt'].startswith('Offline') and 'Last updated' in o['txt'] and not o['alert'] and od and od.startswith('Offline') and back is True, (o, od, back))

    await p.evaluate("openCase('or390c3')"); await p.wait_for_timeout(600)
    await p.evaluate("firebase.auth().signOut()"); await p.wait_for_timeout(1000)
    g = await p.evaluate("""(()=>{const g=document.getElementById('orGate'), s=g.querySelector('#sbLogin');
      return {card:!!s, prod:s?s.querySelector('.product').textContent:null, em:s?s.querySelector('#sbEmail').autocomplete:null, pw:s?s.querySelector('#sbPass').autocomplete:null,
              flow:!!g.querySelector('a[href*="shoreline.pravix.app"]'), styles:!!document.getElementById('sbLoginStyles'), pos:s?getComputedStyle(s).position:null}})()""")
    ok('Managing accounts · signed out, OR shows Flow’s sign-in card on its own page (Email, Password, Forgot password?), with Flow’s styles; it said “Sign in on Flow, then come back to this page”',
       g['card'] and g['prod'] == 'Shoreline Operating Room' and g['em'] == 'username' and g['pw'] == 'current-password' and not g['flow'] and g['styles'] and g['pos'] == 'fixed', g)
    await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab')
    left = await p.evaluate("""(()=>({cases:CASES.length, sheets:document.body.innerText.includes('Pepper')||document.body.innerText.includes('Maple'), inert:document.querySelector('.app').inert,
      focus:!!(document.activeElement&&document.activeElement.closest('#orGate')), view:UI.view}))()""")
    ok('…and nothing read stays: the cases are cleared, no patient is on the page, and the page behind the card can’t be reached (the board stayed behind a 92 % veil, reachable with Tab)',
       left == {'cases': 0, 'sheets': False, 'inert': True, 'focus': True, 'view': 'board'}, left)
    await p.fill('#sbEmail', 'resident.a@vca.com'); await p.fill('#sbPass', 'wrong'); await p.click('#sbBtn'); await p.wait_for_timeout(500)
    err = await p.evaluate("document.getElementById('sbErr').textContent")
    await p.fill('#sbPass', 'right-password'); await p.click('#sbBtn'); await p.wait_for_timeout(300)
    signed = await p.evaluate("(document.getElementById('sbBtn')||{}).textContent||''")
    await core.until(p, READY, 6000); await p.wait_for_timeout(900)
    after = await p.evaluate("[document.getElementById('orGate').classList.contains('show'), document.querySelector('.app').inert, CASES.length, document.getElementById('roomGrid').innerText.includes('Maple')]")
    ok('…a wrong password says so; the right one says “Signed in” and OR carries on, with its cases back',
       'Incorrect email or password' in err and signed.startswith('Signed in') and after == [False, False, 6, True], (err, signed, after))
    ok('…and a refusal from the database while signed out shows the sign-in, not “ask Daniel to check your access”',
       "showGate(AUTH&&!AUTH.currentUser?'signin':'rules')" in html, '')
    await c.close()

    c, p, e = await T.open_or(br)
    await p.evaluate("firebase.firestore().collection('sheets').doc('or390_5').update({'surgery.status':'arrived','surgery.events':[{status:'arrived',t:655,by:'Resident B'}]})")
    await p.wait_for_timeout(700)
    n1 = await p.evaluate(NOTES)
    path, sh = T._sheet(7, 'Ziggy', 'Canine', 'Beagle', 11, 'CPR', 'Foreign Body Removal', 'or1', 900, 60, 'scheduled', [], 'nolte', typ='emergency')
    sh['updated_by'] = 'Front Desk B'
    path8, sh8 = T._sheet(8, 'Clover', 'Feline', 'Ragdoll', 5, 'CPR', 'Dental Extraction', 'or2', 960, 45, 'scheduled', [], 'giannetto', typ='addon')
    sh8['updated_by'] = 'Front Desk B'
    await p.evaluate("([a,b,c,d])=>Promise.all([firebase.firestore().doc(a).set(b), firebase.firestore().doc(c).set(d)])", [path, sh, path8, sh8])
    await p.wait_for_timeout(900)
    n2 = await p.evaluate(NOTES)
    step = [x for x in n1 if x['t'].startswith('Otis')]
    em = [x for x in n2 if x['t'] == 'Emergency add\u2011on · Ziggy']
    ad = [x for x in n2 if x['t'] == 'Add-on · Clover']
    ok('Managing notifications · another screen’s step has its stage colour and an arrow, not a done check, and opens the case; it’s polite',
       len(step) == 1 and step[0]['k'] == 'step' and not step[0]['check'] and step[0]['open'] and step[0]['role'] is None, n1)
    ok('…an emergency booked on another screen is announced as an alert with a red “!” and Dismiss; an add-on is said politely (a case booked elsewhere wasn’t announced at all)',
       len(em) == 1 and em[0]['k'] == 'urgent' and em[0]['role'] == 'alert' and em[0]['x'] and em[0]['open'] and not em[0]['check']
       and len(ad) == 1 and ad[0]['k'] == 'info' and ad[0]['role'] is None, n2)
    await p.wait_for_timeout(9000)
    n3 = await p.evaluate(NOTES)
    ok('…the emergency stays until dismissed, while the others go by themselves (every note went in 4.2 s)',
       [x['t'] for x in n3] == ['Emergency add\u2011on · Ziggy'], n3)
    await p.click('#notes .note.is-urgent .n-open'); await p.wait_for_timeout(700)
    op = await p.evaluate("[UI.view, UI.caseId, document.querySelectorAll('#notes .note.is-urgent').length]")
    ok('…and Open opens the case it’s about', op == ['case', 'or390c7', 0], op)
    await p.evaluate("notify('Kura · implant recorded','TPLO plate · no lot entered','var(--accent)'); notify('Kura · implant recorded','TPLO plate · no lot entered','var(--accent)')")
    await p.wait_for_timeout(200)
    same = await p.evaluate("[...document.querySelectorAll('#notes .note')].filter(n=>n.textContent.includes('implant recorded')).map(n=>[n.dataset.kind, !!n.querySelector('.n-ic polyline')])")
    ok('…the same note never stacks, and a done thing keeps its check', same == [['done', True]], same)
    ok('no page errors', not e, e)
    await c.close()
