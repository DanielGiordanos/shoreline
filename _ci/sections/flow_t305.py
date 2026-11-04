"""Pravix Rounds — the n305 build's own checks: Rounds is its own app at /rounds/ (Nov 2 2026, Daniel: "separate Rounds from Flow …
it should be shoreline.pravix.app/rounds"). Rounds has its own page, styles and scripts; Flow keeps only what it needs to put an
admitted patient on Rounds; both read and write the same visit records. Chromium and WebKit."""
import os, re, json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'   # not an account main enrols at sign-in
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def open_page(br, path, seed=None, vp=(1440, 900)):
    c = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    gets = []
    async def route(r):
        u = r.request.url
        if u.startswith(f'http://127.0.0.1:{PORT}/'): gets.append(u.split(str(PORT), 1)[1].split('?')[0]); await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(2600)
    return c, p, e, gets


@section(id='t305', title='n305 · Rounds is its own app at /rounds/: its own page, styles and scripts; Flow keeps only admitting to Rounds; the same records',
         apps=['flow', 'rounds'], topics=['navigation', 'rounds'], engines=('chromium', 'webkit'))
async def s_t305(br):
    R = os.path.join(BUILD, 'rounds')
    files = {f: os.path.getsize(os.path.join(R, f)) for f in os.listdir(R)}
    ok('Rounds has its own folder: index.html, rounds.css, app.js, app-extras.js and its manifest', {'index.html', 'rounds.css', 'app.js', 'app-extras.js', 'manifest.webmanifest'} <= set(files), files)
    idx = open(os.path.join(R, 'index.html'), encoding='utf-8').read()
    ok('…the page itself is small (its code and styles are separate files) and has no inline <style>', files['index.html'] < 80000 and '<style' not in re.sub(r'<script[\s\S]*?</script>|<!--[\s\S]*?-->', '', idx), files['index.html'])
    man = json.load(open(os.path.join(R, 'manifest.webmanifest'), encoding='utf-8'))
    ok('Rounds’ Home Screen app opens /rounds/ (its own id and scope), named Rounds, with its own icons', man['id'] == '/rounds/' and man['start_url'] == '/rounds/' and man['scope'] == '/rounds/' and man['short_name'] == 'Rounds' and len(man['icons']) == 3, man)

    # the Rounds page
    c, p, e, gets = await open_page(br, '/rounds/')
    r = await p.evaluate("""[document.title,location.pathname,currentApp,!document.getElementById('view-rd-census').classList.contains('hidden'),
      ['subnavFlow','view-dashboard','view-list','view-flow','view-client','view-us-today','drawer','apModal'].filter(i=>document.getElementById(i)),
      document.getElementById('navRounds').getAttribute('aria-current'),document.getElementById('switcherRd').getAttribute('aria-label'),document.getElementById('navRounds').getAttribute('href'),document.getElementById('navFlow').getAttribute('href'),
      document.querySelector('link[rel=manifest]').getAttribute('href'),document.querySelector('link[rel=apple-touch-icon]').getAttribute('href'),document.querySelector('meta[name=apple-mobile-web-app-title]').content]""")
    ok('/rounds/ opens Rounds straight away: titled “Rounds · Pravix”, the census showing, Rounds the current app in the top bar, its views named “Rounds views”', r[:4] == ['Rounds · Pravix', '/rounds/', 'rounds', True] and r[5] == 'page' and r[6] == 'Rounds views', r)
    r = r[:6] + r[7:]
    ok('…none of Flow’s screens are on it (no board, patients, flow, waiting room, ultrasound, drawer or add-patient sheet)', r[4] == [], r[4])
    ok('…its top bar links are real addresses (Rounds /rounds/, Flow /#app=flow — Flow’s item opens Flow, n243), and its manifest, Home Screen icon and name are Rounds’', r[6:] == ['/rounds/', '/#app=flow', '/rounds/manifest.webmanifest', '/assets/img/rounds-180.png', 'Rounds'], r[6:])
    ok('…it loads its own files', all(x in gets for x in ['/rounds/rounds.css', '/rounds/app.js', '/rounds/app-extras.js']), [g for g in gets if g.startswith('/rounds')])
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1200)
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(800)
    w = await p.evaluate("[document.querySelectorAll('#rdList .rd-row').length,!!document.querySelector('#rdList .rd-row.open .rd-work'),document.querySelectorAll('#rdKpis .rd-kpi').length]")
    ok('…the sample census works on it: 10 rows, the tiles, a patient opens', w[0] == 10 and w[1] and w[2] == 7, w)
    async with p.expect_navigation(): await p.evaluate("switchApp('flow')")
    await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(500)
    ok('…asking for Flow from Rounds goes to Flow’s page', await p.evaluate("[location.pathname,currentApp]") == ['/', 'flow'])
    ok('no page errors (Rounds page)', not newerr(e), e[:3]); await c.close()

    # the Flow page
    flow = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    c, p, e, gets = await open_page(br, '/')
    f = await p.evaluate("""[['subnavRd','view-rd-census','view-rd-archive'].filter(i=>document.getElementById(i)),document.getElementById('navRounds').getAttribute('href'),
      typeof rdEnroll,typeof rdNorm,typeof rdmMerge,typeof rdWorkHTML,typeof rdRowHTML,typeof rdSeedDemo,
      [...document.styleSheets].reduce((n,s)=>{try{return n+[...s.cssRules].filter(r=>r.selectorText&&/\\.rd-row\\b|\\.rdx-app\\b/.test(r.selectorText)).length}catch(x){return n}},0)]""")
    ok('Flow’s page has no Rounds screens, and its Rounds tab is a link to /rounds/', f[0] == [] and f[1] == '/rounds/', f[:2])
    ok('…it keeps the Rounds data model it needs (enrolling, normalising, merging) and none of Rounds’ screen code', f[2:5] == ['function'] * 3 and f[5:8] == ['undefined'] * 3, f[2:8])
    ok('…and none of Rounds’ styles', f[8] == 0, f[8])
    ok('…and it is lighter than before (Rounds’ code and styles left)', len(flow) < 1800000, len(flow))
    # admitting in Flow puts the patient on Rounds (the visit record carries rounds), and Rounds shows them
    adm = await p.evaluate("""(async()=>{const x=patient({name:'Mochi',last:'Separate',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(Date.now()-90*60000),prio:2,doctor:'unassigned',species:'Feline',timeline:[]});
      PATIENTS.push(x); renderAll(); await new Promise(r=>setTimeout(r,400)); completePatient(x,'Admitted'); renderAll(); await new Promise(r=>setTimeout(r,1500));
      const d=window.__fs['visits/'+x.id]; return {id:x.id, doc:d||null}})()""")
    ok('Admitting a patient in Flow enrols them on Rounds and saves it in the visit record', adm['doc'] and adm['doc'].get('rounds') and adm['doc'].get('status') in ('Admitted', 'Hospitalized'), {k: (v if k != 'doc' else bool(v)) for k, v in adm.items()})
    ok('no page errors (Flow page)', not newerr(e), e[:3]); await c.close()
    if adm['doc']:
        c, p, e, gets = await open_page(br, '/rounds/', seed={'visits/' + adm['id']: adm['doc']})
        seen = await p.evaluate("[...document.querySelectorAll('#rdList .rd-row')].map(r=>r.textContent).some(t=>/Mochi/i.test(t))")
        ok('…and Rounds’ own page shows that patient from the same record', seen)
        ok('no page errors (Rounds with Flow’s record)', not newerr(e), e[:3]); await c.close()

    # old links
    c, p, e, gets = await open_page(br, '/#app=rounds')
    ok('Old links (/#app=rounds from other apps’ top bars, bookmarks, Treatment and OR) open /rounds/ before Flow loads', await p.evaluate("[location.pathname,location.hash,document.title]") == ['/rounds/', '', 'Rounds · Pravix'])
    await c.close()
    c, p, e, gets = await open_page(br, '/rounds/#archive')
    ok('/rounds/#archive (the Home Screen shortcut) opens the Archive', await p.evaluate("currentRdView") == 'archive')
    await c.close()
