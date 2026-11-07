"""Pravix Rounds — the n331 build's own checks: HIG Notifications (Nov 5 2026), on Rounds' own page.
Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(2800)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return c, p, e

NOTES = "[...document.querySelectorAll('#notes .note')].map(n=>({t:n.querySelector('.n-title').textContent, s:(n.querySelector('.n-sub')||{}).textContent||'', role:n.getAttribute('role')}))"


@section(id='t331', title='n331 · Rounds follows the HIG Notifications page', apps=['rounds'], topics=['rounds', 'notifications'], engines=('chromium', 'webkit'))
async def s_t331(br):
    c, p, e = await ctx(br)
    await p.evaluate("(()=>{window.__toasts=[]; const t=toast; toast=function(m){ __toasts.push(String(m)); return t.apply(this,arguments); }; const o=rdQDb; rdQDb=()=>({}); rdQWrite(Promise.reject(new Error('permission-denied'))); rdQDb=o; })()")
    await p.wait_for_timeout(6500)
    f = await p.evaluate("({notes:" + NOTES + ", toasts:__toasts, save:document.getElementById('rdSaveState').textContent, live:(document.getElementById('rdSaveLive')||{}).textContent||''})")
    tl = [n for n in f['notes'] if n['t'] == 'Tomorrow list not saved']
    ok('Notifications · a Tomorrow list that didn’t save says so once, and the message stays until it’s read (it was a toast gone in 3 s)',
       tl and tl[0]['role'] == 'alert' and 'Make it again' in tl[0]['s'] and not f['toasts'], f)
    ok('…and the header says “Not saved”, not “retrying” (nothing retries a Tomorrow list change)', f['save'] == 'Not saved' and 'Retrying' not in f['live'], f)
    s = await p.evaluate("(async()=>{ const o=rdQDb; rdQDb=()=>({}); rdQWrite(Promise.resolve()); rdQDb=o; await new Promise(r=>setTimeout(r,300)); return document.getElementById('rdSaveState').textContent })()")
    ok('…the next change that saves puts the header back to “Saved”', s == 'Saved', s)
    src = await p.evaluate("Promise.all(['/rounds/app-extras.js','/rounds/app.js'].map(u=>fetch(u).then(r=>r.text())))")
    ok('…no message asks for something Rounds can’t do: “Couldn’t add … to Rounds” says Rounds tries again (it said to add them from the census, which has no Add), and a family message says to reply in Flow',
       'Rounds tries again in 5 minutes' in src[0] and 'Open Rounds and add them from the census' not in src[0] and "' · reply in Flow'" in src[1] and "open to reply" not in src[1], '')
    a = await p.evaluate("""(async()=>{ notify('Patient moved','Benny Duarte · ICU 2',{icon:'move',sticky:true}); await new Promise(r=>setTimeout(r,120)); const n=document.querySelector('#notes').lastElementChild, tm=n.querySelector('.n-time');
      return {at:!!n.dataset.at, hidden:tm.getAttribute('aria-hidden'), now:tm.textContent, five:rdNoteAgo(Date.now()-300000), late:rdNoteAgo(Date.now()-2*3600000)} })()""")
    ok('…a banner left on screen says how long ago it came (“5 min ago”, then the time) instead of “now” for ever, for the eye only',
       a['at'] and a['hidden'] == 'true' and a['now'] == 'now' and a['five'] == '5 min ago' and ('AM' in a['late'] or 'PM' in a['late']), a)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    g = await p.evaluate("(()=>{ const n=document.querySelector('#notes .note'); const r=n.getBoundingClientRect(); return {l:Math.round(r.left), r:Math.round(innerWidth-r.right), t:n.querySelector('.n-title').textContent} })()")
    ok('Notifications · on iPhone a banner sits across the top inside the 16 pt margins', g['l'] == 16 and g['r'] == 16, g)
    await p.evaluate("""(()=>{ const n=document.querySelector('#notes .note'), r=n.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
      const ev=(t,yy)=>new PointerEvent(t,{bubbles:true,pointerType:'touch',pointerId:7,clientX:x,clientY:yy});
      n.dispatchEvent(ev('pointerdown',y)); n.dispatchEvent(ev('pointermove',y-20)); n.dispatchEvent(ev('pointermove',y-50)); n.dispatchEvent(ev('pointerup',y-50)); })()""")
    await p.wait_for_timeout(700)
    left = await p.evaluate("[...document.querySelectorAll('#notes .note')].map(n=>n.querySelector('.n-title').textContent)")
    ok('…and swiping it up puts it away (it covered the top bar and the search until it timed out)', g['t'] not in left, (g, left))
    ok('…no page errors (iPhone)', not newerr(e), newerr(e))
    await c.close()
