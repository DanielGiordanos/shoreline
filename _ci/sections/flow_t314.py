"""Pravix Rounds — the n314 build's own checks: HIG Settings, Undo and redo, Charts and Image views (Nov 3 2026),
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

B = "rdCensus().find(p=>rdFullName(p)==='Benny Duarte')"
ST = "(()=>{const x=" + B + ";return {acu:x.rounds.acuity,loc:x.rounds.location,rev:!!rdReviewed(x),probs:(x.rounds.problems||[]).length}})()"
TOAST = "(document.getElementById('toastMsg')||{}).textContent"


@section(id='t314', title='n314 · Rounds follows the HIG Settings, Undo and redo, Charts and Image views pages',
         apps=['rounds'], topics=['rounds', 'undo', 'redo', 'charts', 'images', 'settings'], engines=('chromium', 'webkit'))
async def s_t314(br):
    mod = 'Meta' if br.browser_type.name == 'webkit' else 'Control'
    c = await ctx(br); p, e = await open_(c)
    await p.evaluate("[...document.querySelectorAll('#rdList .rd-row')].find(r=>/Benny/i.test(r.innerText)).querySelector('.rd-name').click()"); await p.wait_for_timeout(700)
    s0 = await p.evaluate(ST)
    async def z(shift=False):
        await p.evaluate("document.activeElement&&document.activeElement.blur()")
        await p.keyboard.press(mod + ('+Shift+z' if shift else '+z')); await p.wait_for_timeout(450)
    # ---- Undo: a status change, a location from the menu, Mark reviewed — in reverse order
    await p.click('.rd-row.open [data-act=acuity]:not(.on) >> nth=0'); await p.wait_for_timeout(350)
    s1 = await p.evaluate(ST)
    await p.click('.rd-row.open [data-act=loc-menu]'); await p.wait_for_timeout(400)
    await p.locator('.rd-menu button:visible >> nth=2').click(); await p.wait_for_timeout(400)
    s2 = await p.evaluate(ST)
    await p.click('.rd-row.open [data-act=review-mark]'); await p.wait_for_timeout(400)
    s3 = await p.evaluate(ST)
    await z(); u1 = await p.evaluate(ST); t1 = await p.evaluate(TOAST)
    ok('Undo · ⌘Z undoes Mark reviewed (only removals and the rounds order could be undone)', s3['rev'] and not u1['rev'] and u1['loc'] == s2['loc'], (s3, u1))
    ok('…and says what it undid', (t1 or '').startswith('Undone · '), t1)
    await z(); u2 = await p.evaluate(ST); t2 = await p.evaluate(TOAST)
    ok('…again: the location goes back, and the message names it (“Undone · Location … → …”)', u2['loc'] == s0['loc'] and 'Location' in (t2 or ''), (u2, t2))
    flashed = await p.evaluate("!!document.querySelector('.rd-row.rd-undone')")
    await z(); u3 = await p.evaluate(ST)
    ok('…and again: the status goes back; the patient it changed is shown with a ring', u3['acu'] == s0['acu'] and flashed, (u3, flashed))
    await z(shift=True); r1 = await p.evaluate(ST)
    ok('Redo · ⇧⌘Z redoes it', r1['acu'] == s1['acu'], r1)
    await z(); r2 = await p.evaluate(ST)
    ok('…and something redone can be undone again (it said “Nothing to undo”)', r2['acu'] == s0['acu'], r2)
    # ---- a removal redoes too
    await p.click('.rd-row.open [data-act=prob-del] >> nth=0'); await p.wait_for_timeout(400)
    await z(); a = await p.evaluate(ST); await z(shift=True); b = await p.evaluate(ST)
    ok('…removing a problem: ⌘Z brings it back and ⇧⌘Z removes it again (Redo did nothing)', a['probs'] == s0['probs'] and b['probs'] == s0['probs'] - 1, (a, b))
    await z()
    # ---- someone else's newer change wins
    await p.click('.rd-row.open [data-act=acuity]:not(.on) >> nth=0'); await p.wait_for_timeout(350)
    await p.evaluate("(()=>{const x=" + B + "; x.rounds.acuity=x.rounds.acuity==='stable'?'discharge':'stable'; renderRdCensus(true);})()"); await p.wait_for_timeout(300)
    before = await p.evaluate(ST); await z(); after = await p.evaluate(ST); t = await p.evaluate(TOAST)
    ok('…an undo never overwrites a newer change from another screen: it says so and leaves it', after['acu'] == before['acu'] and 'has changed since' in (t or ''), (before, after, t))
    # ---- a sync isn't the person's to undo
    await p.wait_for_timeout(3200)
    n0 = await p.evaluate("pvxUndo.size()[0]")
    await p.evaluate("(()=>{const x=" + B + "; x.rounds.assessment='Synced from the treatment sheet'; rdTouch(x,'Synced');})()"); await p.wait_for_timeout(300)
    ok('…and a change no one just made (a sync) doesn’t go into the undo history', await p.evaluate("pvxUndo.size()[0]") == n0)
    # ---- Tomorrow items: Undo bar and ⌘Z
    qid = await p.evaluate("document.querySelector('[data-act=q-del]').dataset.id")
    await p.evaluate("document.querySelector('[data-act=q-del]').click()"); await p.wait_for_timeout(400)
    gone = await p.evaluate("!document.querySelector('[data-act=q-del][data-id=\"'+%s+'\"]')" % json.dumps(qid))
    bar = await p.evaluate("(()=>{const t=document.getElementById('rdUndo');return t&&t.classList.contains('open')?t.innerText:''})()")
    await p.click('#rdUndo .ru-undo'); await p.wait_for_timeout(500)
    back = await p.evaluate("!!document.querySelector('[data-act=q-del][data-id=\"'+%s+'\"]')" % json.dumps(qid))
    ok('…removing a Tomorrow item offers Undo too, and it comes back (it couldn’t be undone)', gone and 'Tomorrow item removed' in bar and back, (gone, bar, back))
    # ---- Charts: trend lines
    sp = await p.evaluate("(()=>{const s=document.querySelector('.rd-row.open .rd-spark');return s&&[s.getAttribute('role'),s.getAttribute('aria-label')||'',s.getAttribute('aria-hidden'),!!s.querySelector('circle.rd-spark-last')]})()")
    ok('Charts · a trend line tells VoiceOver every reading with its time (it was hidden), and marks the latest', sp and sp[0] == 'img' and sp[1].startswith('K, 2 readings: 10.13') and ' at ' in sp[1] and sp[2] is None and sp[3], sp)
    h = await p.evaluate("""(()=>{const d=document.createElement('div');d.innerHTML=rdSpark([{v:4.0,at:new Date()},{v:4.1,at:new Date()}],'k')+rdSpark([{v:10.13,at:new Date()},{v:5.27,at:new Date()}],'k');
      const ys=[...d.querySelectorAll('polyline')].map(pl=>pl.getAttribute('points').split(' ').map(x=>+x.split(',')[1]));return ys.map(y=>Math.abs(y[0]-y[1]))})()""")
    ok('…and a small change draws small: K 4.0 → 4.1 barely moves, 10.13 → 5.27 spans the line (both filled the height)', h[0] < 5 and h[1] > 12, h)
    # ---- Image views and Settings
    im = await p.evaluate("[...document.querySelectorAll('img')].filter(i=>i.getBoundingClientRect().width>0).every(i=>i.hasAttribute('alt')&&(!i.closest('[onclick]')||i.closest('button')))")
    ok('Image views · every image has alt text (or is marked decorative), and a clickable image is a button', im)
    ok('Settings · Rounds keeps its options where they apply: shift, filters, Display and “Rounding as” are on the census, with no settings screen', await p.evaluate("!!document.getElementById('rdShiftSeg')&&!!document.getElementById('rdActor')&&!!document.getElementById('rdDisplayBtn')"))
    ok('no page errors', not newerr(e), e[:3]); await c.close()
