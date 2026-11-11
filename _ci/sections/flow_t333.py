"""Pravix Ultrasound — the n333 build's own checks: Ultrasound is its own app at /ultrasound/ (Nov 6 2026, Daniel: "Move Ultrasound to
its own site. shoreline.pravix.app/ultrasound"), as Rounds became /rounds/ in n305. Ultrasound has its own page, styles and scripts;
Flow keeps Send to Ultrasound, the card flag, the queue count and critical-finding alerts; both read and write the same visit records.
Chromium and WebKit."""
import os, re, json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
ADD = """(()=>{const now=Date.now(); const p=patient({name:'Pepper',last:'Nakamura',owner:'Synthetic',status:'Ultrasound',room:'Room 4',prio:2,doctor:DOCTORS[0].id,species:'Canine',arrival:new Date(now-55*60000),reason:'Abdominal pain',timeline:[]});
  p.ultrasound={study:'Abdominal Ultrasound',clinicalQuestion:'Foreign body?',status:'requested',requestStatus:'ready',requestedAt:new Date(now-20*60000),queuePosition:1}; PATIENTS.push(p); renderAll(); return p.id; })()"""


async def open_page(br, path, seed=None, vp=(1440, 900), ls=None):
    c = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    if ls: await c.add_init_script("try{ if(!sessionStorage.getItem('__ls')){ sessionStorage.setItem('__ls','1'); " + ''.join(f"localStorage.setItem({json.dumps(k)},{json.dumps(v)});" for k, v in ls.items()) + " } }catch(e){}")
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    gets = []
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): gets.append(u.split(str(PORT), 1)[1].split('?')[0]); await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(2600)
    return c, p, e, gets


@section(id='t333', title='n333 · Ultrasound is its own app at /ultrasound/: its own page, styles and scripts; Flow keeps Send to Ultrasound; the same records',
         apps=['flow', 'ultrasound'], topics=['navigation', 'ultrasound'], engines=('chromium', 'webkit'))
async def s_t333(br):
    U = os.path.join(BUILD, 'ultrasound')
    files = {f: os.path.getsize(os.path.join(U, f)) for f in os.listdir(U)}
    ok('Ultrasound has its own folder: index.html, ultrasound.css, ultrasound-page.css, app.js, app-extras.js and its manifest',
       {'index.html', 'ultrasound.css', 'ultrasound-page.css', 'app.js', 'app-extras.js', 'manifest.webmanifest'} <= set(files), files)
    idx = open(os.path.join(U, 'index.html'), encoding='utf-8').read()
    ok('…the page itself is small (its code and styles are separate files) and has no inline <style>', files['index.html'] < 80000 and '<style' not in re.sub(r'<script[\s\S]*?</script>|<!--[\s\S]*?-->', '', idx), files['index.html'])
    man = json.load(open(os.path.join(U, 'manifest.webmanifest'), encoding='utf-8'))
    icons_ok = all(os.path.exists(os.path.join(BUILD, x['src'].lstrip('/'))) for x in man['icons'])
    ok('Ultrasound’s Home Screen app opens /ultrasound/ (its own id and scope), named Ultrasound, with its own icons and Queue / Completed shortcuts',
       man['id'] == '/ultrasound/' and man['start_url'] == '/ultrasound/' and man['scope'] == '/ultrasound/' and man['short_name'] == 'Ultrasound' and len(man['icons']) == 3 and icons_ok
       and [x['url'] for x in man['shortcuts']] == ['/ultrasound/#queue', '/ultrasound/#completed'], man)

    # the Ultrasound page
    c, p, e, gets = await open_page(br, '/ultrasound/')
    r = await p.evaluate("""[document.title,location.pathname,currentApp,currentUsView,!document.getElementById('view-us-today').classList.contains('hidden'),
      ['subnavFlow','view-dashboard','view-list','view-flow','view-rooms','view-client','drawer','apModal','subnavRd','view-rd-census'].filter(i=>document.getElementById(i)),
      document.getElementById('navUltrasound').classList.contains('active'),document.getElementById('navUltrasound').getAttribute('href'),document.getElementById('navFlow').getAttribute('href'),document.getElementById('navRounds').getAttribute('href'),
      document.querySelector('link[rel=manifest]').getAttribute('href'),document.querySelector('link[rel=apple-touch-icon]').getAttribute('href'),document.querySelector('meta[name=apple-mobile-web-app-title]').content,
      document.getElementById('switcherUs').getAttribute('aria-label')]""")
    ok('/ultrasound/ opens Ultrasound straight away: titled “Ultrasound · Pravix”, Today showing, Ultrasound the current app in the top bar, its views named “Ultrasound views”',
       r[:5] == ['Ultrasound · Pravix', '/ultrasound/', 'ultrasound', 'today', True] and r[6] and r[-1] == 'Ultrasound views', r[:7] + r[-1:])
    r = r[:-1]
    ok('…none of Flow’s or Rounds’ screens are on it (no board, patients, flow, rooms, waiting room, drawer or add-patient sheet)', r[5] == [], r[5])
    ok('…its top bar links are real addresses (Ultrasound /ultrasound/, Flow /#app=flow, Rounds /rounds/), and its manifest, Home Screen icon and name are Ultrasound’s',
       r[7:] == ['/ultrasound/', '/#app=flow', '/rounds/', '/ultrasound/manifest.webmanifest', '/assets/img/ultrasound-180.png', 'Ultrasound'], r[7:])
    mo = await p.evaluate("""(()=>{const b=document.querySelector('.pvx-more-btn'), u=document.getElementById('navUltrasound');
      return {inMore:!!u.closest('.pvx-more-menu'), cur:u.getAttribute('aria-current'), moreOn:b.classList.contains('active'), bar:[...document.querySelectorAll('.nav-center > .nav-item')].filter(a=>a.offsetParent).map(a=>a.id)}})()""")
    ok('…Ultrasound sits in More even on its own page (Daniel, Nov 6): More shows as current, and Ultrasound in it is marked current',
       mo['inMore'] and mo['cur'] == 'page' and mo['moreOn'] and 'navUltrasound' not in mo['bar'], mo)
    await p.evaluate("(()=>{PATIENTS.push(patient({name:'Bella',last:'Rivera',owner:'Synthetic',status:'Waiting',room:'Lobby',prio:1,doctor:'unassigned',species:'Canine',arrival:new Date(Date.now()-40*60000),reason:'Vomiting',timeline:[]})); renderAll();})()")
    await p.wait_for_timeout(1800)
    shown = await p.evaluate("(()=>{const i=document.getElementById('critIsland'); return !!i&&i.classList.contains('on')&&getComputedStyle(i).opacity})()")
    await p.click('.pvx-more-btn'); await p.wait_for_timeout(600)
    hid = await p.evaluate("new Promise(r=>{let n=0;(function t(){const o=getComputedStyle(document.getElementById('critIsland')).opacity; if(o==='0'||++n>20) r(o); else setTimeout(t,100);})()})")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(600)
    back = await p.evaluate("getComputedStyle(document.getElementById('critIsland')).opacity")
    ok('…and an open More menu isn’t covered by the critical-patient banner: the banner steps aside while it’s open and comes back after', shown == '1' and hid == '0' and back == '1', [shown, hid, back])
    ok('…it loads its own files', all(x in gets for x in ['/ultrasound/ultrasound.css', '/ultrasound/ultrasound-page.css', '/ultrasound/app.js', '/ultrasound/app-extras.js']), [g for g in gets if g.startswith('/ultrasound')])
    pid = await p.evaluate(ADD); await p.wait_for_timeout(900)
    w = await p.evaluate("[(document.getElementById('umNext')||{}).textContent||'', (switchUsView('queue'), (document.getElementById('usbWaiting')||{}).textContent||'')]")
    ok('…a waiting request shows on Today (Next Up) and in the Queue', 'PEPPER' in w[0] and 'Foreign body?' in w[1], [x[:80] for x in w])
    await p.evaluate("openUsxCase(" + json.dumps(pid) + ")"); await p.wait_for_timeout(700)
    ok('…and its case workspace opens', await p.evaluate("document.getElementById('usxDrawer').classList.contains('open')"))
    await p.evaluate("closeUsxCase()"); await p.wait_for_timeout(300)
    async with p.expect_navigation(): await p.evaluate("switchApp('flow')")
    await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(500)
    ok('…asking for Flow from Ultrasound goes to Flow’s page', await p.evaluate("[location.pathname,currentApp]") == ['/', 'flow'])
    ok('no page errors (Ultrasound page)', not newerr(e), e[:3]); await c.close()

    # the Flow page
    flow = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    c, p, e, gets = await open_page(br, '/')
    f = await p.evaluate("""[['subnavUs','view-us-today','view-us-queue','view-us-completed'].filter(i=>document.getElementById(i)),document.getElementById('navUltrasound').getAttribute('href'),
      typeof openUltrasoundRequest,typeof sendUltrasound,typeof usFlag,typeof usQueue,typeof usToDb,typeof usToApp,typeof renderUstNext,typeof renderUsxBoard,typeof usbCardHTML,
      [...document.styleSheets].reduce((n,s)=>{try{return n+[...s.cssRules].filter(r=>r.selectorText&&/\\.usb-card\\b|\\.um-next\\b|\\.usx-app\\b/.test(r.selectorText)).length}catch(x){return n}},0)]""")
    ok('Flow’s page has no Ultrasound screens, and its Ultrasound item is a link to /ultrasound/', f[0] == [] and f[1] == '/ultrasound/', f[:2])
    ok('…it keeps what it uses itself (Send to Ultrasound, the card flag, the queue, the record mapping) and none of Ultrasound’s screen code',
       f[2:8] == ['function'] * 6 and f[8:11] == ['undefined'] * 3, f[2:11])
    ok('…and none of Ultrasound’s screen styles', f[11] == 0, f[11])
    ok('…and it is lighter than before (Ultrasound’s code and styles left)', len(flow) < 1733000, len(flow))   # n348: the bar is the page before n333 (1,733,139); 1,660,000 left no room for later Flow work
    mf = json.load(open(os.path.join(BUILD, 'manifest.webmanifest'), encoding='utf-8'))
    sc = [x for x in mf['shortcuts'] if '/ultrasound' in x['url']]
    ok('…Ultrasound’s shortcuts live in its own manifest; Flow’s Dock menu keeps Flow’s own commands (n358)', not sc, sc)
    # sending a request in Flow writes the visit record, and Ultrasound's page shows it
    sent = await p.evaluate("""(async()=>{const x=patient({name:'Mochi',last:'Separate',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(Date.now()-40*60000),prio:2,doctor:DOCTORS[0].id,species:'Feline',timeline:[]});
      PATIENTS.push(x); renderAll(); await new Promise(r=>setTimeout(r,300)); openUltrasoundRequest(x.id); await new Promise(r=>setTimeout(r,300));
      const cq=document.getElementById('usCQ'); cq.value='Free fluid?'; cq.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('usSend').click(); await new Promise(r=>setTimeout(r,1500));
      switchView('flow'); await new Promise(r=>setTimeout(r,500)); const note=[...document.querySelectorAll('#notes .note')].map(n=>n.textContent).find(t=>/Sent to Ultrasound/.test(t));
      return {id:x.id, doc:window.__fs['visits/'+x.id]||null, note:!!note, flag:!!document.querySelector('#board .card[data-pid="'+x.id+'"] .us-flag')}})()""")
    ok('Send to Ultrasound still works in Flow: it says so and saves the request in the visit record',
       sent['note'] and sent['doc'] and 'Free fluid?' in json.dumps(sent['doc'].get('ultrasound') or {}), {k: (v if k != 'doc' else bool(v)) for k, v in sent.items()})
    ok('no page errors (Flow page)', not newerr(e), e[:3]); await c.close()
    if sent['doc']:
        c, p, e, gets = await open_page(br, '/ultrasound/#queue', seed={'visits/' + sent['id']: sent['doc']})
        seen = await p.evaluate("[currentUsView,(document.getElementById('usbWaiting')||{}).textContent||'']")
        ok('…and Ultrasound’s own page shows that request from the same record (and #queue, the Home Screen shortcut, opens the Queue)', seen[0] == 'queue' and 'MOCHI' in seen[1].upper(), [seen[0], seen[1][:120]])
        ok('no page errors (Ultrasound with Flow’s record)', not newerr(e), e[:3]); await c.close()

    # old links and where you were
    c, p, e, gets = await open_page(br, '/#app=ultrasound')
    ok('Old links (/#app=ultrasound from other apps’ top bars and bookmarks) open /ultrasound/ before Flow loads', await p.evaluate("[location.pathname,location.hash,document.title]") == ['/ultrasound/', '', 'Ultrasound · Pravix'])
    await c.close()
    c, p, e, gets = await open_page(br, '/')
    await p.evaluate("localStorage.setItem('pvx:flow:where',JSON.stringify({app:'ultrasound',at:Date.now()}))")
    async with p.expect_navigation(): await p.goto(f'http://127.0.0.1:{PORT}/')
    await p.wait_for_timeout(1500)
    ok('Flow’s address opened by itself reopens Ultrasound if that’s where you were (n243)', await p.evaluate("location.pathname") == '/ultrasound/')
    await p.evaluate("switchUsView('completed')"); await p.wait_for_timeout(300)
    await p.goto(f'http://127.0.0.1:{PORT}/ultrasound/'); await p.wait_for_timeout(2200)
    ok('…and Ultrasound reopens on the view you left (Completed)', await p.evaluate("currentUsView") == 'completed')
    await c.close()
