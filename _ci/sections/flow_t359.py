"""Pravix Flow — the n359 build's own checks (Nov 10 2026): HIG Home Screen quick actions + Ornaments.
Quick actions and Dock menu items act in the Flow window that's already open (launch_handler focus-existing + launchQueue),
without reloading the board; titles say what they do ("Find a patient"). Ornaments are visionOS only."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
LQ = "try{ Object.defineProperty(window,'launchQueue',{configurable:true,value:{setConsumer:function(f){ window.__lq=f; }}}); }catch(e){}"


async def ctx(br, lq=True, touch=False):
    o = dict(viewport={'width': 390, 'height': 844} if touch else {'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    if lq: await c.add_init_script(LQ)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

LAUNCH = """(async(path)=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); window.__alive=window.__alive||Math.random(); const mark=window.__alive;
  window.__lq({targetURL:/^https?:/.test(path)?path:location.origin+path}); await w(1100);
  return {view:currentView, focus:document.activeElement&&document.activeElement.id, add:!!document.querySelector('#apModal.open'), hash:location.hash, same:window.__alive===mark}; })"""


@section(id='t359', title='n359 · Home Screen quick actions: a quick action or Dock menu item acts in the open Flow window, without reloading; titles say what they do', apps=['flow'], topics=['quick-actions', 'ornaments'], engines=('chromium', 'webkit'))
async def s_t359(br):
    c, p, e = await ctx(br)
    m = await p.evaluate("fetch('/manifest.webmanifest',{cache:'no-store'}).then(r=>r.json()).then(j=>({lh:j.launch_handler, sc:j.shortcuts.map(s=>[s.name,s.short_name,s.url])}))")
    ok('Quick actions · the manifest asks for the open Flow window to be used (launch_handler focus-existing, then auto)', (m.get('lh') or {}).get('client_mode') == ['focus-existing', 'auto'], m)
    ok('…every title says what it does (“Find a patient”, not “Find”), with no app name, four at most', len(m['sc']) <= 4 and all(s[1] and 'Flow' not in s[1] and 'Pravix' not in s[1] for s in m['sc']) and ['Find a patient', 'Find a patient', '/#find'] in m['sc'], m)
    first = await p.evaluate("(async()=>{ window.__lq({targetURL:location.origin+'/'}); await new Promise(r=>setTimeout(r,500)); return {view:currentView, add:!!document.querySelector('#apModal.open')}; })()")
    ok('…the launch that opened the page is left alone (the page handled it already)', not first['add'], first)
    a = await p.evaluate(LAUNCH + "('/#view=list')")
    ok('Quick actions · with Flow open, “Patients” opens Patients in the same window, without reloading the board', a['view'] == 'list' and a['same'] and a['hash'] == '', a)
    b = await p.evaluate(LAUNCH + "('/#find')")
    ok('…“Find a patient” puts the cursor in the search field there', b['focus'] == 'globalSearch' and b['same'], b)
    await p.evaluate("document.activeElement&&document.activeElement.blur()")
    n = await p.evaluate(LAUNCH + "('/#op=new')")
    ok('…“New patient” opens New patient there', n['add'] and n['same'], n)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    d = await p.evaluate(LAUNCH + "('/#view=client')")
    ok('…and “Client Display” opens the lobby screen there', d['view'] == 'client' and d['same'], d)
    await p.evaluate("switchView('dashboard')"); await p.wait_for_timeout(300)
    x = await p.evaluate(LAUNCH + "('https://example.com/#view=list')")
    ok('…a launch for another site does nothing', x['view'] == 'dashboard', x)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e = await ctx(br, lq=False)
    await p.evaluate("0")
    ok('…without a launch queue of ours (the browser’s own, or none), Flow opens as before, with no errors', not newerr(e) and await p.evaluate("typeof currentView") == 'string', newerr(e))
    await c.close()
