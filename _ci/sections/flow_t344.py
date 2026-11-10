"""Pravix Flow — the n344 build's own checks (Nov 8 2026): HIG Launching + Loading.
Until the patient list has arrived, Flow says it's loading instead of claiming the hospital is empty. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
STATE = """(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const o={};
  for(const v of ['dashboard','flow','rooms','list']){ switchView(v); await w(350);
    o[v]=[...document.querySelectorAll('#view-'+v+' :is(.empty,.empty-mini,#tableEmpty,.board-empty-state,.r-empty)')].filter(e=>e.getClientRects().length).map(e=>getComputedStyle(e,'::after').content.replace(/"/g,'')); }
  switchView('dashboard'); await w(300);
  o.kpi=[...document.querySelectorAll('#view-dashboard .command-kpi__value')].map(e=>getComputedStyle(e).visibility);
  switchView('rooms'); await w(300); o.roomst={pills:[...document.querySelectorAll('#view-rooms .r-state')].filter(e=>e.getClientRects().length).map(e=>getComputedStyle(e).visibility), text:[...document.querySelectorAll('#view-rooms .r-empty')].map(e=>getComputedStyle(e).color)}; switchView('dashboard'); await w(200);
  o.say=(document.getElementById('pvxLoadSay')||{}).textContent||''; o.cls=document.documentElement.className; return o })()"""


async def ctx(br, url=''):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/{url}'); await p.wait_for_timeout(2600)
    return c, p, e


@section(id='t344', title='n344 · Loading: until the patient list arrives, Flow says it is loading instead of saying the hospital is empty', apps=['flow'], topics=['loading', 'launching'], engines=('chromium', 'webkit'))
async def s_t344(br):
    c, p, e = await ctx(br)
    done = await p.evaluate("({cls:document.documentElement.className, got:Backend._gotVisits})")
    ok('Launching · once the patient list has arrived, nothing says “loading”', done['got'] and 'pvx-flow-loading' not in done['cls'], done)
    await p.evaluate("Backend._gotVisits=false; pvxFlowLoading(0)")
    s = await p.evaluate(STATE)
    empties = [x for v in ('dashboard', 'flow', 'rooms', 'list') for x in s[v]]
    ok('Loading · while the list loads, the empty states on Command, the board, Rooms and Patients say “Loading patients…” (they said “No attention items · All current patients are clear”, “No active patients in the hospital”, “Ready for next patient”)',
       empties and all(x == 'Loading patients…' for x in empties), s)
    ok('Loading · Rooms says “Loading patients…” instead of “Available” and “Ready for next patient” in every room', s['roomst']['pills'] and all(x == 'hidden' for x in s['roomst']['pills']) and all(x in ('rgba(0, 0, 0, 0)', 'transparent') for x in s['roomst']['text']), s['rooms'])
    ok('Loading · Command’s numbers are placeholders, not 0 (it showed “0 patients”, “On target”, “8 rooms available”), and VoiceOver hears “Loading patients…”', s['kpi'] and all(x == 'hidden' for x in s['kpi']) and s['say'] == 'Loading patients…', s)
    await p.evaluate("pvxFlowLoading(13000)")
    s2 = await p.evaluate(STATE)
    ok('Loading · after 12 s it says “Still loading patients — check the connection”', all(x.startswith('Still loading patients') for v in ('dashboard', 'flow') for x in s2[v]) and s2['say'].startswith('Still loading'), s2)
    await p.evaluate("Backend._gotVisits=true"); await p.wait_for_timeout(500)
    s3 = await p.evaluate(STATE)
    ok('Loading · as soon as the list arrives, the real numbers and empty states come back', 'pvx-flow-loading' not in s3['cls'] and all(x == 'visible' for x in s3['kpi']) and not any(x.startswith(('Loading', 'Still')) for v in ('dashboard', 'flow') for x in s3[v]), s3)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e = await ctx(br, '?display=1')
    t = await p.evaluate("document.documentElement.className")
    ok('…the lobby TV (Client Display) never shows the loading state', 'pvx-flow-loading' not in t, t)
    await c.close()
