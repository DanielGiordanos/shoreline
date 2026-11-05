"""Pravix Rounds — the n326 build's own checks: HIG Scroll views, Sheets and Windows (Nov 4 2026), on Rounds' own page.
Chromium and WebKit (the swipe checks build touch events, so they run in Chromium; the gesture code is the same)."""
import json
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
    return c


async def open_(c, wait=2800):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(wait)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    await p.evaluate("window.__opened=[]; window.open=function(u){ window.__opened.push(String(u)); return null; }; 0")
    return p, e

OPENB = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"
PID = "rdCensus().find(p=>rdFullName(p)==='Benny Duarte').id"
MODE = """(()=>{const m=document.getElementById('rdMode'), nx=m.querySelector('[data-a=next]').getBoundingClientRect(), dn=m.querySelector('.rdm-x:not(.rdm-first)').getBoundingClientRect(),
  top=m.querySelector('.rdm-top'), ft=m.querySelector('.rdm-foot'), mini=m.querySelector('.rdm-mini');
  return {name:document.getElementById('rdmName').textContent, st:m.scrollTop, sh:m.scrollHeight, ch:m.clientHeight, vh:innerHeight, nextBottom:Math.round(nx.bottom), doneTop:Math.round(dn.top), doneBottom:Math.round(dn.bottom),
    topH:top.offsetHeight, footH:ft.offsetHeight, mini:mini&&getComputedStyle(mini).display!=='none'?mini.textContent:'', cls:m.className, lb:m.getAttribute('aria-labelledby')}})()"""
SHEET = """(()=>{const d=document.getElementById('confirmBox'), r=d.getBoundingClientRect(), q=s=>{const e=d.querySelector(s); if(!e||!e.getClientRects().length) return null; const b=e.getBoundingClientRect(); return {l:Math.round(b.left),t:Math.round(b.top),r:Math.round(b.right),b:Math.round(b.bottom)}};
  return {open:d.classList.contains('open'), sheet:d.classList.contains('pvx-hsheet'), role:d.getAttribute('role'), l:Math.round(r.left), r:Math.round(r.right), b:Math.round(r.bottom), vw:innerWidth, vh:innerHeight,
    grab:q('.pvx-hgrab'), grabName:(d.querySelector('.pvx-hgrab')||{getAttribute:()=>null}).getAttribute('aria-label'), cancel:q('#confirmCancel'), title:q('.confirm-title'), save:q('#confirmOk'), field:q('#pvxHours'),
    ask:(d.querySelector('.pvx-hdisc p')||{}).textContent||'', focus:document.activeElement&&(document.activeElement.className||document.activeElement.id)}})()"""
HOURS = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); return JSON.stringify((x.rounds.auth||{}).hours||x.rounds.hours||x.rounds.auth||null)})()"


async def hours(p):
    await p.evaluate(OPENB); await p.wait_for_timeout(400)
    await p.evaluate("(()=>{const b=document.querySelector('#rdList .rd-row.open [data-act=auth-custom]'); b.scrollIntoView({block:'center',behavior:'instant'}); b.click();})()"); await p.wait_for_timeout(400)
    await p.evaluate("(()=>{const i=[...document.querySelectorAll('.rd-menu button')].find(e=>e.getClientRects().length&&/Set total/.test(e.textContent)); i.click();})()"); await p.wait_for_timeout(700)


async def swipe(p, y0, dist=240):
    cdp = await p.context.new_cdp_session(p)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 195, 'y': y0}]})
    for k in range(1, 9):
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 195, 'y': y0 + k * dist / 8}]}); await p.wait_for_timeout(16)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await p.wait_for_timeout(600)


@section(id='t326', title='n326 · Rounds follows the HIG Scroll views, Sheets and Windows pages', apps=['rounds'], topics=['rounds', 'scroll-views', 'sheets', 'windows'], engines=('chromium', 'webkit'))
async def s_t326(br):
    eng = br.browser_type.name
    # ---- Scroll views: Rounds mode keeps its bars (iPhone)
    c = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3)
    p, e = await open_(c)
    await p.evaluate("document.getElementById('rdStartBtn').click(); 0"); await p.wait_for_timeout(900)
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(600)
    m0 = await p.evaluate(MODE)
    await p.evaluate("document.getElementById('rdMode').scrollTop=400"); await p.wait_for_timeout(400)
    m1 = await p.evaluate(MODE)
    ok('Scroll views · on iPhone, Rounds mode keeps Previous · Mark reviewed · Next on screen while the patient scrolls (they sat below the screen)',
       m0['sh'] > m0['ch'] + 200 and m0['nextBottom'] <= m0['vh'] and m1['nextBottom'] <= m1['vh'], (m0, m1))
    ok('…and “Rounds · 2 of 8 … Done” stays at the top, naming the patient once the name has scrolled away',
       m1['doneTop'] >= 0 and m1['doneBottom'] <= m1['topH'] + 4 and m1['mini'] == m1['name'] == 'Benny Duarte' and m0['mini'] == '' and m1['lb'] == 'rdmProg rdmName', (m0, m1))
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(600)
    m2 = await p.evaluate(MODE)
    ok('…the next patient starts at the top', m2['name'] != m1['name'] and m2['st'] == 0, m2)
    ok('no page errors (iPhone)', not newerr(e), e[:3]); await c.close()

    c = await ctx(br, viewport={'width': 390, 'height': 700})
    p, e = await open_(c)
    await p.evaluate("document.getElementById('rdStartBtn').click(); 0"); await p.wait_for_timeout(900)
    for _ in range(4): await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(300)
    await p.mouse.move(200, 400)
    await p.keyboard.press('PageDown'); await p.wait_for_timeout(600)
    k = await p.evaluate(MODE)
    ok('…Page Down pages by the part between the bars, keeping some of the last page in view', 0 < k['st'] <= k['ch'] - k['topH'] - k['footH'], k)
    await c.close()

    for vp, nm in [((1440, 900), 'Mac'), ((1180, 820), 'iPad')]:
        c = await ctx(br, viewport={'width': vp[0], 'height': vp[1]})
        p, e = await open_(c)
        await p.evaluate("document.getElementById('rdStartBtn').click(); 0"); await p.wait_for_timeout(900)
        worst = 0
        for _ in range(8):
            mm = await p.evaluate(MODE); worst = max(worst, mm['nextBottom'] - mm['vh'])
            await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(300)
        ok(f'…on a {nm} too, no patient pushes the bar off the screen', worst <= 0, worst)
        await c.close()

    # ---- Sheets: Set total hours… on iPhone
    c = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3)
    p, e = await open_(c)
    before = await p.evaluate(HOURS)
    await hours(p); s = await p.evaluate(SHEET)
    row = s['cancel'] and s['save'] and s['title'] and abs(s['cancel']['t'] - s['save']['t']) <= 2 and s['cancel']['r'] <= s['title']['l'] and s['save']['l'] >= s['title']['r']
    ok('Sheets · on iPhone, Set total hours… rises from the bottom, full width, with a grabber (“Close” to VoiceOver)',
       s['open'] and s['sheet'] and s['l'] == 0 and s['r'] == s['vw'] and s['b'] == s['vh'] and s['grab'] and s['grabName'] == 'Close' and s['role'] == 'dialog', s)
    ok('…Cancel at the leading edge of its top bar and Save at the trailing edge, above the number', row and s['field'] and s['save']['b'] <= s['field']['t'], s)
    if eng == 'chromium':
        await swipe(p, s['grab']['t'] + 10); s1 = await p.evaluate(SHEET)
        ok('…a swipe down closes it when nothing changed', not s1['open'], s1)
        await hours(p); await p.evaluate("document.querySelector('#confirmBox [data-h=\"1\"]').click(); 0"); await p.wait_for_timeout(200)
        await swipe(p, s['title']['t'] + 10); s2 = await p.evaluate(SHEET)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(300); s3 = await p.evaluate(SHEET)
        ok('…after a change, the swipe asks first (“Discard this change?”, Keep editing focused), and Esc keeps editing',
           s2['open'] and s2['ask'] == 'Discard this change?' and 'pvx-hd-keep' in (s2['focus'] or '') and s3['open'] and not s3['ask'] and s3['focus'] == 'pvxHours', (s2, s3))
        await swipe(p, s['title']['t'] + 10)
        await p.evaluate("document.querySelector('.pvx-hd-discard').click(); 0"); await p.wait_for_timeout(500)
        s4 = await p.evaluate(SHEET); after = await p.evaluate(HOURS)
        ok('…Discard closes it and leaves the hours as they were', not s4['open'] and after == before, (s4, before, after))
    await hours(p); await p.evaluate("document.querySelector('#confirmBox [data-h=\"1\"]').click(); 0"); await p.wait_for_timeout(200)
    await p.evaluate("document.getElementById('confirmOk').click(); 0"); await p.wait_for_timeout(500)
    s5 = await p.evaluate(SHEET); saved = await p.evaluate(HOURS)
    ok('…Save in the bar saves the new total', not s5['open'] and saved != before, (before, saved))
    await hours(p); await p.evaluate("document.getElementById('confirmCancel').click(); 0"); await p.wait_for_timeout(500)
    s6 = await p.evaluate(SHEET)
    await p.evaluate(OPENB); await p.wait_for_timeout(300)
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=outcome-menu]').click(); 0"); await p.wait_for_timeout(300)
    await p.evaluate("(()=>{const b=[...document.querySelectorAll('.rd-menu button')].find(b=>/Discharged/.test(b.textContent)); b&&b.click();})()"); await p.wait_for_timeout(500)
    s7 = await p.evaluate(SHEET)
    await p.evaluate("document.getElementById('confirmCancel').click(); 0"); await p.wait_for_timeout(400)
    ok('…Cancel closes it, and the next question is an action sheet again (no grabber, no bar)', not s6['open'] and s7['open'] and not s7['sheet'] and not s7['grab'] and s7['role'] == 'alertdialog', (s6, s7))
    win = await p.evaluate("window.rdWinOK()")
    ok('Windows · on a touchscreen the patient’s menu doesn’t offer a new window', win is False, win)
    ok('no page errors (iPhone sheet)', not newerr(e), e[:3]); await c.close()

    # ---- Sheets on the Mac, and Windows
    c = await ctx(br); p, e = await open_(c)
    await hours(p); s = await p.evaluate(SHEET)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('Sheets · on a Mac it stays the centred dialog (no grabber), and Esc closes it', s['open'] and not s['sheet'] and not s['grab'] and s['l'] > 200, s)
    await p.evaluate("rdExpanded=null; renderRdCensus(true); 0"); await p.wait_for_timeout(300)
    pid = await p.evaluate(PID)
    xy = await p.evaluate("""(id=>{const r=document.querySelector('.rd-row[data-pid="'+id+'"]'); r.scrollIntoView({block:'center',behavior:'instant'}); const b=r.querySelector('.rd-rowmain').getBoundingClientRect(); return [Math.round(b.left+60),Math.round(b.top+20)]})""", pid)
    await p.wait_for_timeout(300)
    MOD = 'Meta' if await p.evaluate("/Mac|iPhone|iPad/.test(navigator.platform||'')||/Mac OS X/.test(navigator.userAgent)") else 'Control'
    await p.keyboard.down(MOD); await p.mouse.click(xy[0], xy[1]); await p.keyboard.up(MOD); await p.wait_for_timeout(500)
    w1 = await p.evaluate("[window.__opened.slice(), rdExpanded]")
    url = f'http://127.0.0.1:{PORT}/rounds/#patient={pid}'
    ok('Windows · ⌘-click (Ctrl-click on Windows and Linux) on a patient opens it in a new window, on that patient; this one stays as it was', w1[0] == [url] and w1[1] in (None, ''), (w1, url))
    await p.mouse.click(xy[0], xy[1], button='middle'); await p.wait_for_timeout(500)
    w2 = await p.evaluate("[window.__opened.length, rdExpanded]")
    ok('…a middle click does the same', w2[0] == 2 and w2[1] in (None, ''), w2)
    await p.mouse.click(xy[0], xy[1], button='right'); await p.wait_for_timeout(500)
    items = await p.evaluate("[...document.querySelectorAll('.pvx-cx [role^=menuitem]')].filter(i=>i.getClientRects().length).map(i=>i.textContent.trim().replace(/\\s+/g,' '))")
    fine = await p.evaluate("window.rdWinOK()")
    if fine:
        await p.evaluate("[...document.querySelectorAll('.pvx-cx [role^=menuitem]')].find(i=>/new window/.test(i.textContent)).click(); 0"); await p.wait_for_timeout(500)
    else:   # this engine's test browser reports no fine pointer: the item is left out, and the window is opened the way the item would
        await p.keyboard.press('Escape'); await p.wait_for_timeout(200); await p.evaluate("rdOpenInWindow(%r); 0" % pid)
    w3 = await p.evaluate("window.__opened.length")
    ok('…and the patient’s menu has Open in new window, after Open (with a mouse or trackpad)', (items[:2] == ['Open', 'Open in new window'] if fine else 'Open in new window' not in items) and w3 == 3, (fine, items, w3))
    await p.mouse.click(xy[0], xy[1]); await p.wait_for_timeout(600)
    w4 = await p.evaluate("[window.__opened.length, rdExpanded]")
    ok('…a plain click still opens the patient in place', w4 == [3, pid], w4)
    await p.evaluate("rdExpanded=null; renderRdCensus(true); 0"); await p.wait_for_timeout(300)
    b = await p.evaluate("""(id=>{const r=document.querySelector('.rd-row[data-pid="'+id+'"]'); const x=r.querySelector('.rd-rowmain button'); if(!x) return null; x.scrollIntoView({block:'center',behavior:'instant'}); const q=x.getBoundingClientRect(); return [Math.round(q.left+q.width/2),Math.round(q.top+q.height/2)]})""", pid)
    if b:
        await p.keyboard.down(MOD); await p.mouse.click(b[0], b[1]); await p.keyboard.up(MOD); await p.wait_for_timeout(400)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    w5 = await p.evaluate("window.__opened.length")
    ok('…a ⌘-click on a control in the row is that control’s, not a new window', w5 == 3, (b, w5))
    ok('no page errors', not newerr(e), e[:3]); await c.close()
