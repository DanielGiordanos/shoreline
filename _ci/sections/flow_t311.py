"""Pravix Rounds — the n311 build's own checks: HIG Loading, Managing accounts, Managing notifications and Modality (Nov 3 2026),
on Rounds' own page. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, seed=None, user=FU, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', user).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    return c


async def open_(c, path='/rounds/', demo=True, wait=2800):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(wait)
    await p.evaluate("(()=>{const t=window.toast;window.__toasts=[];window.toast=function(m){window.__toasts.push(String(m));try{return t.apply(this,arguments)}catch(e){}}})()")
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return p, e

AE = "(()=>{const a=document.activeElement,m=document.getElementById('rdMode');return {id:a&&a.id,a:a&&a.dataset&&(a.dataset.a||a.dataset.act)||null,inMode:!!(m&&m.contains(a))}})()"


async def admitted(br):
    """a real visit admitted in Flow (so it's in the store, not session-only sample data)"""
    c = await ctx(br); p, e = await open_(c, path='/', demo=False)
    adm = await p.evaluate("""(async()=>{const x=patient({name:'Clover',last:'Linked',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(Date.now()-90*60000),prio:2,doctor:'unassigned',species:'Feline',timeline:[]});
      PATIENTS.push(x); renderAll(); await new Promise(r=>setTimeout(r,400)); completePatient(x,'Admitted'); renderAll(); await new Promise(r=>setTimeout(r,1500));
      return {id:x.id, doc:window.__fs['visits/'+x.id]||null}})()""")
    await c.close(); return adm


@section(id='t311', title='n311 · Rounds follows the HIG Loading, Managing accounts, Managing notifications and Modality pages',
         apps=['rounds'], topics=['rounds', 'loading', 'accounts', 'sign-out', 'notifications', 'modality'], engines=('chromium', 'webkit'))
async def s_t311(br):
    # ---- Loading: the Archive while earlier days load, and when they can't
    c = await ctx(br); p, e = await open_(c, demo=False)
    await p.evaluate("window.__rel=null; window.fvVisitHistory=()=>new Promise((res,rej)=>{window.__rel={res,rej};}); rdOld=null; rdOldLoading=false; rdOldFailed=false; Backend._visitsMode='recent'; switchRdView('archive')")
    await p.wait_for_timeout(400)
    t = await p.evaluate("document.getElementById('rdArchiveBody').innerText")
    ok('Loading · while earlier days load, the Archive says so (it said “No rounds history yet”)', 'Loading earlier days' in t and 'No rounds history yet' not in t, t[:80])
    await p.evaluate("window.__rel.rej(new Error('offline'))"); await p.wait_for_timeout(400)
    t = await p.evaluate("[document.getElementById('rdArchiveBody').innerText, !!document.querySelector('#rdArchiveBody [data-act=arc-retry]')]")
    ok('…if they can’t be loaded it says that, with Try again (it said “No rounds history yet”)', 'Couldn’t load earlier days' in t[0] and t[1], t)
    await p.evaluate("window.fvVisitHistory=()=>Promise.resolve([])"); await p.click('#rdArchiveBody [data-act=arc-retry]'); await p.wait_for_timeout(500)
    t = await p.evaluate("document.getElementById('rdArchiveBody').innerText")
    ok('…and Try again loads them', 'No rounds history yet' in t and 'Couldn’t' not in t, t[:80])
    await p.evaluate("switchRdView('census')"); await p.wait_for_timeout(300)

    # ---- Managing notifications: a long message stays long enough to read
    await p.evaluate("toast('No patients on Rounds yet — admitted patients appear here from Flow')"); await p.wait_for_timeout(3600)
    ok('Managing notifications · a long message is still showing at 3.6 s (every message went at 2.6 s)', await p.evaluate("document.getElementById('toast').classList.contains('show')"))
    await p.wait_for_timeout(1600)
    ok('…and then goes', not await p.evaluate("document.getElementById('toast').classList.contains('show')"))
    ok('no page errors (loading, messages)', not newerr(e), e[:3]); await c.close()

    # ---- Modality: Rounds mode is a modal for keyboard and VoiceOver
    c = await ctx(br); p, e = await open_(c)
    await p.focus('#rdStartBtn'); await p.keyboard.press('Enter'); await p.wait_for_timeout(600)
    d = await p.evaluate("(()=>{const m=document.getElementById('rdMode');const n=(m.getAttribute('aria-labelledby')||'').split(' ').map(i=>(document.getElementById(i)||{}).textContent||'').join(' ');return [m.getAttribute('role'),m.getAttribute('aria-modal'),n.replace(/\\s+/g,' ').trim()]})()")
    ok('Modality · Rounds mode is a dialog named for its task and patient (it had no role or name)', d[0] == 'dialog' and d[1] == 'true' and d[2].lower().startswith('rounds · 1 of') and len(d[2]) > 16, d)
    a = await p.evaluate(AE)
    ok('…focus moves into it (it stayed on Start rounds, behind it)', a['inMode'], a)
    ins = []
    for _ in range(7): await p.keyboard.press('Tab'); ins.append((await p.evaluate(AE))['inMode'])
    ok('…and Tab stays inside it (it walked the census underneath)', all(ins), ins)
    await p.focus('#rdMode [data-a=next]'); await p.keyboard.press('Enter'); await p.wait_for_timeout(400)
    a = await p.evaluate(AE)
    ok('…Next keeps focus on Next as the next patient comes in (focus was dropped)', a['a'] == 'next' and a['inMode'], a)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    a = await p.evaluate(AE)
    ok('…Esc closes it and focus goes back to the Rounds button', a['id'] == 'rdStartBtn' and not await p.evaluate("!!document.getElementById('rdMode')"), a)
    ok('…and the census can be used again', not await p.evaluate("!!document.querySelector('.app[inert]')"))

    # ---- Modality: ending an admission has no default button
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(700)
    await p.click('.rd-row.open [data-act=outcome-menu]'); await p.wait_for_timeout(400)
    await p.locator('.rd-menu button:visible').first.click(); await p.wait_for_timeout(500)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    st = await p.evaluate("[document.getElementById('confirmBox').classList.contains('open'), !!document.querySelector('.rd-row.open')]")
    ok('Modality · Return doesn’t end an admission: the alert has no default button (Return marked the patient discharged)', st == [True, True], st)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
    a = await p.evaluate("[document.getElementById('confirmBox').classList.contains('open'), !!document.querySelector('.rd-row.open'), document.activeElement.dataset.act||document.activeElement.tagName]")
    ok('…Esc closes only the alert (it also closed the patient behind it), and focus goes back to End admission…', a == [False, True, 'outcome-menu'], a)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(400); await p.locator('.rd-menu button:visible').first.click(); await p.wait_for_timeout(400)
    await p.click('#confirmOk'); await p.wait_for_timeout(900)
    a = await p.evaluate("[document.activeElement.dataset.act||document.activeElement.id||document.activeElement.tagName, !!document.activeElement.closest('.rd-row')]")
    ok('…and after ending it, focus goes to the next patient (it was lost)', a == ['toggle', True], a)
    ok('no page errors (modality)', not newerr(e), e[:3]); await c.close()

    # ---- Modality on iPhone: Rounds mode's dismiss button reads Done, and the header stacks
    c = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3); p, e = await open_(c)
    await p.evaluate("document.getElementById('rdStartBtn').click()"); await p.wait_for_timeout(600)
    x = await p.evaluate("(()=>{const b=document.querySelector('#rdMode [data-a=exit]'),n=document.querySelector('#rdMode .rdm-title');return [b.innerText.trim(), Math.round(n.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]})()")
    ok('Modality · on iPhone, Rounds mode’s close button reads “Done” (it read “Esc · Exit”), 44 pt tall, with the patient across the full width', x[0] == 'Done' and x[1] >= 300 and x[2] >= 44, x)
    await c.close()

    # ---- Managing accounts: signing out leaves nothing of the last person on Rounds
    c = await ctx(br); p, e = await open_(c)
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(700)
    await p.fill('.rd-row.open input[aria-label^="Add problem"]', 'Hypokalemia'); await p.wait_for_timeout(100)
    await p.evaluate("document.getElementById('rdStartBtn').click()"); await p.wait_for_timeout(400)
    await p.click('#rdMode [data-a=next]'); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("logout()"); await p.wait_for_timeout(1200)
    s = await p.evaluate("""(()=>{const vis=id=>{const el=document.getElementById(id);return !!el&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().height>0};
      return {drafts:window.rdDrafts.size, census:vis('view-rd-census'), actor:vis('rdActor')&&/Rounds Tester/.test(document.getElementById('rdActor').textContent),
        state:localStorage.getItem('pvx:rounds:state'), resume:localStorage.getItem('pvx:rounds:resume'), queue:JSON.stringify(rdQueues).includes('Violet')}})()""")
    ok('Managing accounts · after Log out, what the last person typed is gone (a half-typed problem waited for the next person)', s['drafts'] == 0, s)
    ok('…the census, Tomorrow list and “Rounding as” name don’t show behind the sign-in card (they were readable through it)', not s['census'] and not s['actor'] and not s['queue'], s)
    ok('…and Rounds won’t reopen at their patient or resume their rounds for someone else', s['state'] is None and s['resume'] is None, s)
    t = await p.evaluate("(document.querySelector('#sbLogin .product')||{}).textContent")
    ok('…the sign-in card on Rounds says Rounds (it said “Shoreline Patient Flow”)', t == 'Shoreline Rounds', t)
    ok('no page errors (sign-out)', not newerr(e), e[:3]); await c.close()

    # ---- Managing accounts: a kept place belongs to the person who left it
    adm = await admitted(br)
    if not adm['doc']:
        ok('Managing accounts · (Flow admitted the test patient)', False, adm); return
    seed = {'visits/' + adm['id']: adm['doc']}
    c = await ctx(br, seed=seed); p, e = await open_(c, demo=False, wait=600)
    await p.evaluate("localStorage.setItem('pvx:rounds:state',JSON.stringify({at:Date.now(),uid:'someone-else',view:'census',open:%s,svc:'all',kpi:null}))" % json.dumps(adm['id']))
    await p.reload(); await p.wait_for_timeout(4000)
    ok('Managing accounts · Rounds doesn’t reopen another person’s patient on a shared computer', await p.evaluate("rdExpanded") in (None, ''), await p.evaluate("rdExpanded"))
    await c.close()

    # ---- Managing accounts, Loading: a shared link opened before signing in waits for sign-in
    c = await ctx(br, seed=seed, user='null'); p, e = await open_(c, path='/rounds/#patient=' + adm['id'], demo=False, wait=1500)
    lead = await p.evaluate("(document.getElementById('sbLead')||{}).textContent")
    ok('Managing accounts · the sign-in card says why: “Sign in to open the patient you were sent.”', lead == 'Sign in to open the patient you were sent.', lead)
    await p.wait_for_timeout(20500)
    ok('…it still waits after 20 s (it said “That patient is no longer on Rounds” and forgot the link)', not await p.evaluate("window.__toasts.length"), await p.evaluate("window.__toasts"))
    await p.evaluate("firebase.auth().signInWithEmailAndPassword('rounds.tester@vca.com','right-password')"); await p.wait_for_timeout(5000)
    got = await p.evaluate("[rdExpanded, !!document.querySelector('.rd-row.open[data-pid=%s]'), location.hash]" % json.dumps(adm['id']))
    ok('…and once signed in, the patient opens', got[0] == adm['id'] and got[1] and got[2] == '', got)
    ok('no page errors (accounts)', not newerr(e), e[:3]); await c.close()
