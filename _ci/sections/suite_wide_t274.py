"""The whole suite — the n274 build's own checks: the expanding app navigation in the shared top bar (Daniel's approved
design handoff, the Monoline treatment). Runs in Chromium and WebKit (Safari's engine)."""
import os, re, glob, json
from core import ok, section, until, new_page, BUILD as SITE, PORT, ENGINE
from helpers import STUB216

U = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
RES = '{"uid":"u2","email":"resident.a@vca.com","displayName":"Resident A"}'
MAIN = ['navFlow', 'navYakuri', 'navTreatment', 'navRounds', 'navOR', 'navAnesia', 'pvxnMoreBtn']
INMORE = ['navDirectory', 'navAssets', 'navCurriculum', 'navSchedule', 'navUltrasound', 'navGrid', 'navForms']
ST = """(()=>{const n=document.querySelector('nav.topnav');if(!n)return null;const q=s=>n.querySelector(s),R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),r:Math.round(r.right),b:Math.round(r.bottom)}};
 const row=[...n.querySelectorAll('.pvxn-row>*')].map(a=>a.id), pop=[...n.querySelectorAll('.pvxn-pop .nav-item')].map(a=>a.id);
 const cur=n.querySelector('.nav-item[aria-current=page]');
 return {ready:!!(window.pvxNav&&pvxNav.ready),state:window.pvxNav&&pvxNav.state&&pvxNav.state(),row,pop,old:!!n.querySelector('.nav-center'),label:(q('.pvxn-lab')||{}).textContent,
   cur:cur&&cur.id,moreSel:(q('.pvxn-more')||{getAttribute:()=>null}).getAttribute('data-selected'),lip:R(q('.pvxn-lip')),panel:R(q('.pvxn-panel')),nav:R(n),brand:R(q('.brandwrap')),right:R(q('.nav-right')),
   ctl:[...n.querySelectorAll('.nav-right>*')].filter(e=>e.offsetWidth).map(e=>(e.id||e.className)+':'+(getComputedStyle(e).visibility)),vw:document.documentElement.clientWidth,
   travel:R(q('.pvxn-travel')),focus:(document.activeElement||{}).id||(document.activeElement||{}).className}})()"""


async def opn(br, path, vp=(1440, 900), touch=False, user=U, dark=True, reduce=False):
    c, p, e = await new_page(br, user=user, vp=vp, touch=touch, dark=dark)
    if reduce: await p.emulate_media(reduced_motion='reduce')
    async def mod(r): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(r.request.url.rsplit('/', 1)[-1], ''))
    await p.route('https://www.gstatic.com/firebasejs/10.12.0/*', mod)
    await p.goto(f'http://127.0.0.1:{PORT}/' + path)
    await until(p, "!!(window.pvxNav&&pvxNav.ready)", 8000); await p.wait_for_timeout(700)
    return c, p, e


async def hover_in(p, x=200, y=30):
    await p.mouse.move(700, 700); await p.mouse.move(x, y, steps=3)


def topbar_pages():
    out = []
    for f in sorted(glob.glob(SITE + '/**/*.html', recursive=True)):
        t = open(f, encoding='utf-8', errors='ignore').read()
        if 'class="topnav' in t and ('pvx-appearance.js' in t or 'pvx-shell.js' in t) and 'id="logoutBtn"' in t:
            i0 = t.find('class="topnav'); seg = t[i0:t.find('</nav>', i0)]
            ids = [m.group(1) for tag in re.findall(r'<a\s[^>]*>', seg) if re.search(r'class="nav-item\b', tag) for m in [re.search(r'\bid="(nav[A-Za-z]+)"', tag)] if m]
            out.append((os.path.relpath(f, SITE).replace('index.html', ''), sorted(set(ids))))
    return out


@section(id='t274', title='n274 · the expanding app navigation in the shared top bar (approved handoff, Monoline)',
         apps=['treatment', 'flow', 'or', 'anesia', 'sgvp', 'directory', 'scheduling', 'yakuri', 'topbar'], topics=['navigation', 'layout', 'motion', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t274(br):
    # every page with the shared top bar: the lip names the current app, all its links are kept, in the approved places
    pages = topbar_pages(); bad = []
    for path, ids in pages:
        c, p, e = await opn(br, path)
        s = await p.evaluate(ST)
        have = sorted(set(await p.evaluate("[...document.querySelectorAll('nav.topnav .nav-item[id]')].map(a=>a.id)")))
        exp_row = [i for i in MAIN if i in ids or i == 'pvxnMoreBtn']
        if not s or not s['ready'] or s['old'] or s['row'] != exp_row or have != ids or any(i not in INMORE for i in s['pop']) or not s['label'] or s['label'] == 'Apps' or [x for x in e if 'collectionGroup' not in x]:
            bad.append([path, s and {k: s[k] for k in ('ready', 'row', 'pop', 'label', 'old')}, [i for i in ids if i not in have], e[:1]])
        await c.close()
    ok('every page with the shared top bar gets the navigation: the lip names the app, the row is Flow · Yakuri · Treatment · Rounds · OR · Anesia · More, More holds Directory · Assets · Curriculum · Schedule · Ultrasound (+ Grid, Forms), and every one of the page’s links is kept (%d pages)' % len(pages), pages and not bad, bad[:3])

    # Treatment, Mac: at rest only the lip; the brand and the controls keep their places
    c, p, e = await opn(br, 'treatment/')
    r = await p.evaluate(ST)
    ok('at rest: a shallow lip (154 × 24 pt) under the middle of the bar says “Treatment”; Log out, language and light/dark are on the right',
       r['label'] == 'Treatment' and r['lip']['w'] >= 154 and r['lip']['h'] == 24 and abs((r['lip']['x'] + r['lip']['w'] / 2) - r['nav']['w'] / 2) <= 2 and r['lip']['y'] >= r['nav']['b'] - 2
       and any(x.startswith('logoutBtn:visible') for x in r['ctl']) and any(x.startswith('pvxLangBtn:visible') for x in r['ctl']) and any('theme-toggle' in x for x in r['ctl']), r)
    sub0 = await p.evaluate("(()=>{const s=document.querySelector('.subnav');return s?Math.round(s.getBoundingClientRect().top):null})()")
    ok('the lip has its own strip: it never covers the sub-nav (Treatment’s tabs start below it)', sub0 is not None and sub0 >= r['lip']['b'] - 1, [sub0, r['lip']])
    # hover: opens over the page, nothing moves
    await hover_in(p); await p.wait_for_timeout(700)
    o = await p.evaluate(ST)
    sub1 = await p.evaluate("(()=>{const s=document.querySelector('.subnav');return Math.round(s.getBoundingClientRect().top)})()")
    top_el = await p.evaluate("(()=>{const r=document.querySelector('.pvxn-panel').getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height-30);return !!(e&&e.closest('.pvxn-panel'))})()")
    ok('pointing at the bar opens the panel over the page (it’s on top where it covers the sub-nav), and nothing on the page moves', o['state'] == 'open' and o['panel']['w'] > 900 and o['panel']['h'] > 100 and sub1 == sub0 and top_el, [o['state'], o['panel'], sub0, sub1, top_el])
    ok('the controls stay where they were, visible, when it opens', o['right'] == r['right'] and o['brand'] == r['brand'], [o['right'], r['right']])
    # Monoline: no square hover, the current app's halo and underline
    await p.hover('#navOR'); await p.wait_for_timeout(250)
    hv = await p.evaluate("(()=>{const a=document.getElementById('navOR'),s=a.querySelector('svg');return [getComputedStyle(a).backgroundColor,getComputedStyle(a).borderTopWidth,getComputedStyle(s).color,getComputedStyle(a).boxShadow]})()")
    acc = await p.evaluate("(()=>{const d=document.createElement('i');d.style.color=getComputedStyle(document.querySelector('nav.topnav')).getPropertyValue('--pvxn-accent');document.body.appendChild(d);const c=getComputedStyle(d).color;d.remove();return c})()")
    ok('hover is pure light: the icon takes the accent, no square or capsule behind it', hv[0] in ('rgba(0, 0, 0, 0)', 'transparent') and hv[1] == '0px' and hv[2] == acc and hv[3] == 'none', [hv, acc])
    act = await p.evaluate("(()=>{const a=document.getElementById('navTreatment'),s=a.querySelector('svg'),t=document.querySelector('.pvxn-travel').getBoundingClientRect(),r=a.getBoundingClientRect();return [getComputedStyle(a).backgroundColor,getComputedStyle(s).backgroundImage.slice(0,15),getComputedStyle(a).fontWeight,Math.round(t.left+t.width/2-(r.left+r.width/2)),Math.round(r.bottom-t.bottom)]})()")
    ok('the current app has a faint halo behind its icon, brighter text and a short underline under it', act[0] in ('rgba(0, 0, 0, 0)', 'transparent') and act[1].startswith('radial-gradient') and act[2] in ('600', 'bold') and abs(act[3]) <= 1 and 0 <= act[4] <= 3, act)
    # leaving: a short grace, then it closes
    await p.mouse.move(700, 700); await p.wait_for_timeout(110); mid = await p.evaluate("pvxNav.state()")
    await p.wait_for_timeout(500); end = await p.evaluate("pvxNav.state()")
    ok('pointing away: it stays a moment (240 ms), then closes', mid == 'open' and end == 'rest', [mid, end])
    # More keeps it open; Escape closes More first, then the panel
    await hover_in(p); await p.wait_for_timeout(600); await p.click('#pvxnMoreBtn'); await p.wait_for_timeout(300)
    pr = await p.evaluate("(()=>{const m=document.getElementById('pvxnMore').getBoundingClientRect(),b=document.getElementById('pvxnMoreBtn').getBoundingClientRect(),pn=document.querySelector('.pvxn-panel').getBoundingClientRect();return {open:pvxNav.state(),top:Math.round(m.top-pn.bottom),right:Math.round(b.right-m.right),inView:m.left>=0&&m.right<=innerWidth,exp:document.getElementById('pvxnMoreBtn').getAttribute('aria-expanded')}})()")
    ok('More opens its list just under the panel, lined up with More, inside the window', pr['open'] == 'more' and 0 <= pr['top'] <= 16 and pr['inView'] and pr['exp'] == 'true', pr)
    bx = await p.locator('#navDirectory').bounding_box()
    await p.mouse.move(bx['x'] + 20, bx['y'] + 10, steps=6); await p.wait_for_timeout(500)
    await p.mouse.move(60, 600, steps=3); await p.wait_for_timeout(600)
    ok('while More is open the panel stays open, even when the pointer goes to the list or away', await p.evaluate("pvxNav.state()") == 'more', '')
    await p.focus('#navAssets'); await p.keyboard.press('Escape'); await p.wait_for_timeout(150)
    e1 = await p.evaluate("[pvxNav.state(),document.activeElement.id]")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    e2 = await p.evaluate("[pvxNav.state(),document.activeElement.className]")
    ok('Esc closes More first (focus back on More), a second Esc closes the panel (focus on the lip)', e1 == ['open', 'pvxnMoreBtn'] and e2 == ['rest', 'pvxn-lip'], [e1, e2])
    # outside click dismisses
    await hover_in(p); await p.wait_for_timeout(500); await p.click('#pvxnMoreBtn'); await p.wait_for_timeout(200)
    await p.mouse.click(700, 700); await p.wait_for_timeout(300)
    ok('a click elsewhere closes More and the panel', await p.evaluate("pvxNav.state()") == 'rest', '')
    # rapid hover in and out, many times
    for i in range(6):
        await p.mouse.move(200, 30); await p.wait_for_timeout(40); await p.mouse.move(700, 700); await p.wait_for_timeout(40)
    await p.wait_for_timeout(600)
    ok('quick passes in and out leave it closed and the lip labelled', await p.evaluate("[pvxNav.state(),document.querySelector('.pvxn-lab').textContent]") == ['rest', 'Treatment'], '')
    # keyboard: hidden links can't be reached at rest; Return on the lip opens it at Flow; Tab and arrows go through
    await p.mouse.move(700, 700); await p.focus('.pvxn-lip'); await p.keyboard.press('Tab')
    nxt = await p.evaluate("document.activeElement.id||document.activeElement.className")
    ok('at rest, Tab from the lip goes on to the controls — the hidden apps take no focus', nxt in ('logoutBtn',) or 'logout' in nxt, nxt)
    await p.focus('.pvxn-lip'); await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    k1 = await p.evaluate("[pvxNav.state(),document.activeElement.id,document.querySelector('.pvxn-lip').getAttribute('aria-expanded')]")
    await p.keyboard.press('ArrowRight'); k2 = await p.evaluate("document.activeElement.id")
    for _ in range(5): await p.keyboard.press('Tab')
    k3 = await p.evaluate("document.activeElement.id"); await p.keyboard.press('Enter'); await p.wait_for_timeout(250)
    k4 = await p.evaluate("[pvxNav.state(),document.activeElement.id]")
    await p.keyboard.press('ArrowDown'); k5 = await p.evaluate("document.activeElement.id")
    ok('from the keyboard: Return on the lip opens it with focus on Flow, → and Tab move along, Return on More opens it at Directory, ↓ goes down the list',
       k1 == ['open', 'navFlow', 'true'] and k2 == 'navYakuri' and k3 == 'pvxnMoreBtn' and k4 == ['more', 'navDirectory'] and k5 == 'navAssets', [k1, k2, k3, k4, k5])
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    fv = await p.evaluate("(()=>{pvxNav.expand();const a=document.getElementById('navRounds');a.focus();const c=getComputedStyle(a);return [c.outlineStyle,c.outlineWidth]})()")
    ok('focus stays visible on the apps (a ring, though hover has no square)', fv[0] != 'none' and fv[1] != '0px', fv)
    ok('no page errors (Treatment, Mac)', not e, e[:2]); await c.close()

    # Flow switches apps in place: the lip, aria-current and the underline follow; setActive still works
    c, p, e = await opn(br, '')
    await hover_in(p); await p.wait_for_timeout(600)
    u0 = await p.evaluate(ST); await p.click('#navRounds'); await p.wait_for_timeout(700)
    u1 = await p.evaluate(ST)
    ok('Flow: choosing Rounds switches in place — the lip says “Rounds”, Rounds is the current page and the underline travelled to it',
       u1['label'] == 'Rounds' and u1['cur'] == 'navRounds' and u1['travel']['x'] > u0['travel']['x'] + 200 and 'shoreline' not in await p.evaluate("location.host"), [u0['label'], u1['label'], u1['cur'], u0['travel'], u1['travel']])
    await p.evaluate("pvxTopbar.setActive('navUltrasound')"); await p.wait_for_timeout(300)
    u2 = await p.evaluate(ST)
    ok('an app inside More (Ultrasound) marks More as current, and the lip names Ultrasound', u2['label'] == 'Ultrasound' and u2['moreSel'] == 'true' and u2['cur'] == 'navUltrasound', [u2['label'], u2['moreSel'], u2['cur']])
    ok('no page errors (Flow)', not [x for x in e if 'collectionGroup' not in x], e[:2]); await c.close()

    # a page whose app lives in More (Directory)
    c, p, e = await opn(br, 'directory/'); d = await p.evaluate(ST)
    ok('Directory: the lip says Directory and More carries the current mark', d['label'] == 'Directory' and d['moreSel'] == 'true', [d['label'], d['moreSel']])
    await c.close()

    # gates: Grid and Forms only for the accounts that may use them
    c, p, e = await opn(br, 'treatment/', user=RES)
    g = await p.evaluate("['navGrid','navForms'].map(i=>{const a=document.getElementById(i);return a?getComputedStyle(a).display:'gone'})")
    c2, p2, e2 = await opn(br, 'treatment/')
    await p2.evaluate("pvxNav.openMore()"); await p2.wait_for_timeout(300)
    g2 = await p2.evaluate("['navGrid','navForms'].map(i=>{const a=document.getElementById(i);return a?getComputedStyle(a).display:'gone'})")
    ok('Grid and Forms stay hidden for other accounts and show in More for Daniel', all(x in ('none', 'gone') for x in g) and all(x == 'flex' for x in g2), [g, g2])
    await c.close(); await c2.close()

    # colours: the bar's own surface, made solid, in light and dark; the lip is seamless with the bar
    for dark in (True, False):
        c, p, e = await opn(br, 'treatment/', dark=dark)
        col = await p.evaluate("(()=>{const n=document.querySelector('nav.topnav'),l=document.querySelector('.pvxn-panel');return [getComputedStyle(n).backgroundColor,getComputedStyle(l).backgroundColor,document.body.classList.contains('dark')]})()")
        def rgb(s): return [float(x) for x in re.findall(r'[\d.]+', s)[:3]]
        a, b = rgb(col[0]), rgb(col[1])
        ok('%s: the lip and panel are the bar’s own colour (within 6 on each channel), solid' % ('dark' if dark else 'light'), col[2] == dark and all(abs(x - y) <= 6 for x, y in zip(a, b)) and 'rgba' not in col[1].replace('rgba(0, 0, 0, 0)', ''), col)
        await c.close()
    # theme switch: the surface follows
    c, p, e = await opn(br, 'treatment/', dark=True)
    s0 = await p.evaluate("getComputedStyle(document.querySelector('.pvxn-panel')).backgroundColor")
    await p.click('.theme-toggle'); await p.wait_for_timeout(500)
    s1 = await p.evaluate("[getComputedStyle(document.querySelector('.pvxn-panel')).backgroundColor,document.body.classList.contains('dark')]")
    ok('pressing light/dark repaints the lip with the bar (and the switch still works)', s1[1] is False and s1[0] != s0, [s0, s1]); await c.close()

    # iPhone: tap to open and close, 44 pt targets, the controls fit beside the brand
    c, p, e = await opn(br, 'treatment/', vp=(390, 844), touch=True)
    m = await p.evaluate(ST)
    hit = await p.evaluate("(()=>{const r=document.querySelector('.pvxn-lip').getBoundingClientRect(),x=r.left+r.width/2;return [document.elementFromPoint(x,r.top+2),document.elementFromPoint(x,r.bottom+8)].map(e=>!!(e&&e.closest('.pvxn-lip')))})()")
    ok('iPhone: the brand and the controls fit on one row without touching, inside the screen', m['brand']['r'] <= m['right']['x'] and m['right']['r'] <= m['vw'] and m['lip']['h'] == 24, [m['brand'], m['right'], m['vw']])
    ok('iPhone: the lip answers a finger across 44 pt though it looks 24 pt deep', all(hit), hit)
    await p.tap('.pvxn-lip'); await p.wait_for_timeout(600); t1 = await p.evaluate(ST)
    ok('iPhone: a tap opens it, all seven in two rows', t1['state'] == 'open' and len(t1['row']) == 7, t1['state'])
    await p.tap('#pvxnMoreBtn'); await p.wait_for_timeout(300); t2 = await p.evaluate("pvxNav.state()")
    await p.tap('#pvxnMoreBtn'); await p.wait_for_timeout(300); t3 = await p.evaluate("pvxNav.state()")
    await p.tap('.pvxn-lip'); await p.wait_for_timeout(500); t4 = await p.evaluate("pvxNav.state()")
    ok('iPhone: More toggles with taps, and a tap on the lip closes the panel — no hover needed', [t2, t3, t4] == ['more', 'open', 'rest'], [t2, t3, t4])
    ok('no page errors (iPhone)', not e, e[:2]); await c.close()

    # Reduce Motion: no spring, no stagger, no travel — states change at once
    c, p, e = await opn(br, 'treatment/', reduce=True)
    rm = await p.evaluate("(()=>{const pn=document.querySelector('.pvxn-panel'),it=document.getElementById('navFlow');return [getComputedStyle(pn).transitionDuration,getComputedStyle(it).transitionDuration,getComputedStyle(document.querySelector('.pvxn-travel')).transitionDuration]})()")
    await p.evaluate("pvxNav.expand()"); await p.wait_for_timeout(60)
    now = await p.evaluate("[getComputedStyle(document.getElementById('navFlow')).opacity,getComputedStyle(document.getElementById('navFlow')).transform]")
    ok('Reduce Motion: no transitions on the panel, the apps or the underline, and the apps are there at once', all(set(x.replace(' ', '').split(',')) <= {'0s'} for x in rm) and now[0] == '1' and now[1] == 'none', [rm, now])
    await c.close()

    # narrow Mac window and iPad: brand and controls never collide; the panel fits
    for vp in [(1024, 768), (820, 1180), (700, 900)]:
        c, p, e = await opn(br, 'directory/', vp=vp)
        await p.evaluate("pvxNav.expand()"); await p.wait_for_timeout(700); w = await p.evaluate(ST)
        sc = await p.evaluate("document.documentElement.scrollWidth<=innerWidth")
        ok('%d pt: brand and controls apart, the open panel inside the window, no sideways scroll' % vp[0],
           w['brand']['r'] <= w['right']['x'] and w['panel']['x'] >= 0 and w['panel']['r'] <= w['vw'] and sc, [w['brand'], w['right'], w['panel'], sc])
        await c.close()

    # a phone on its side (compact height): the lip sits in the bar's bottom edge, so the sub-nav keeps its row
    c, p, e = await opn(br, 'treatment/', vp=(844, 390), touch=True)
    ch = await p.evaluate("(()=>{const n=document.querySelector('nav.topnav').getBoundingClientRect(),l=document.querySelector('.pvxn-lip').getBoundingClientRect(),s=document.querySelector('.subnav').getBoundingClientRect(),b=document.querySelector('nav.topnav .brandwrap').getBoundingClientRect(),r=document.querySelector('nav.topnav .nav-right').getBoundingClientRect();return {gap:Math.round(s.top-n.bottom),inBar:l.top>=n.top-1&&l.bottom<=n.bottom+1,apart:l.left>=b.right&&l.right<=r.left}})()")
    await p.tap('.pvxn-lip'); await p.wait_for_timeout(600); chs = await p.evaluate("pvxNav.state()")
    ok('compact height (844 × 390): no strip under the bar, the lip sits in the bar’s bottom edge between the brand and the controls, and a tap opens it', ch['gap'] <= 1 and ch['inBar'] and ch['apart'] and chs == 'open', [ch, chs])
    await c.close()

    # the page keeps its Esc, and a resting pointer doesn't open the panel when the page changes under it
    c, p, e = await opn(br, 'treatment/')
    await hover_in(p); await p.wait_for_timeout(500)
    es = await p.evaluate("(()=>{let got=false;const f=()=>{got=true};document.addEventListener('keydown',f);document.querySelector('.subnav button,.subnav a').focus();const ev=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});document.activeElement.dispatchEvent(ev);document.removeEventListener('keydown',f);return [got,ev.defaultPrevented]})()")
    await p.wait_for_timeout(200); es2 = await p.evaluate("pvxNav.state()")
    ok('Esc with focus on the page (the panel open under the pointer) reaches the page, and the panel closes', es == [True, False] and es2 == 'rest', [es, es2])
    await p.mouse.move(200, 30); await p.wait_for_timeout(50); await p.evaluate("pvxNav.collapse()"); await p.wait_for_timeout(500)
    await p.evaluate("(()=>{const d=document.createElement('div');d.id='t274cover';d.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.01)';document.body.appendChild(d)})()"); await p.wait_for_timeout(200)
    await p.evaluate("document.getElementById('t274cover').remove()"); await p.wait_for_timeout(500)
    ok('a sheet closing under a resting pointer doesn’t open the panel (it opens when the pointer moves)', await p.evaluate("pvxNav.state()") == 'rest', '')
    await c.close()


@section(id='t275', title='n275 · the app navigation after the stress test (theme switch, shoulders, sizes, managers, print, resize)',
         apps=['treatment', 'flow', 'directory', 'yakuri', 'topbar'], topics=['navigation', 'color', 'layout'], engines=('chromium', 'webkit'))
async def s_t275(br):
    MGR = '{"uid":"u9","email":"au733@vca.com","displayName":"Manager"}'
    rgb = lambda s: [float(x) for x in re.findall(r'[\d.]+', s)[:3]]
    # Flow fades its bar over 0.4 s: a switch (closed or open) leaves the panel the bar's new colour, not a mid-fade grey
    for start_dark in (False, True):
        c, p, e = await opn(br, '', dark=start_dark)
        await p.click('.theme-toggle'); await p.wait_for_timeout(700)
        await hover_in(p); await p.wait_for_timeout(700)
        a = await p.evaluate("[getComputedStyle(document.querySelector('nav.topnav')).backgroundColor,getComputedStyle(document.querySelector('.pvxn-panel')).backgroundColor,document.body.classList.contains('dark')]")
        await p.click('.theme-toggle'); await p.wait_for_timeout(900)
        b = await p.evaluate("[getComputedStyle(document.querySelector('nav.topnav')).backgroundColor,getComputedStyle(document.querySelector('.pvxn-panel')).backgroundColor,document.body.classList.contains('dark'),pvxNav.state()]")
        same = lambda x: all(abs(i - j) <= 6 for i, j in zip(rgb(x[0]), rgb(x[1])))
        ok('Flow, starting %s: after a switch the panel is the bar’s new colour, and after a switch while it’s open too (was the light bar’s grey in dark)' % ('dark' if start_dark else 'light'),
           a[2] != start_dark and same(a) and b[2] == start_dark and same(b) and b[3] == 'open', [a, b])
        await c.close()
    # the shoulders are drawn inside their own square: nothing above the bar's bottom edge, so the VCA lockup is never cut
    c, p, e = await opn(br, 'treatment/', vp=(1280, 800))
    await hover_in(p); await p.wait_for_timeout(700)
    sh = await p.evaluate("(()=>{const pn=document.querySelector('.pvxn-panel'),n=document.querySelector('nav.topnav').getBoundingClientRect();return ['::before','::after'].map(w=>{const c=getComputedStyle(pn,w);return [c.boxShadow,c.backgroundImage.slice(0,15),Math.round(pn.getBoundingClientRect().top+parseFloat(c.top)-n.bottom)]})})()")
    ok('the shoulders paint no shadow above the bar (a gradient in their own square, starting at the bar’s edge)', all(x[0] == 'none' and x[1].startswith('radial-gradient') and x[2] >= -3 for x in sh), sh)
    await p.set_viewport_size({'width': 700, 'height': 800}); await p.wait_for_timeout(700)
    rz = await p.evaluate("(()=>{const r=document.querySelector('.pvxn-panel').getBoundingClientRect();return [Math.round(r.left),Math.round(r.right),document.documentElement.clientWidth,pvxNav.state()]})()")
    ok('resized while open (1280 → 700 pt): the panel shrinks to the window', rz[0] >= 0 and rz[1] <= rz[2] and rz[3] == 'open', rz)
    await p.emulate_media(media='print'); await p.wait_for_timeout(200)
    pr = await p.evaluate("[getComputedStyle(document.querySelector('.pvxn-dock')).display,getComputedStyle(document.querySelector('nav.topnav')).marginBottom]")
    ok('printing leaves the navigation out (no lip, no strip)', pr == ['none', '0px'], pr)
    await c.close()
    # Directory (an app inside More): the underline is under More once it opens
    c, p, e = await opn(br, 'directory/', dark=False)
    await hover_in(p); await p.wait_for_timeout(800)
    u = await p.evaluate("(()=>{const a=document.getElementById('pvxnMoreBtn').getBoundingClientRect(),t=document.querySelector('.pvxn-travel').getBoundingClientRect();return Math.round(a.left+a.width/2-(t.left+t.width/2))})()")
    ok('Directory: the underline is under More (it was off by the panel’s growth in Safari)', abs(u) <= 1, u)
    await c.close()
    # Yakuri sizes every button 44 pt: the lip stays 24 pt and keeps off its sub-nav
    c, p, e = await opn(br, 'yakuri/')
    y = await p.evaluate("(()=>{const l=document.querySelector('.pvxn-lip').getBoundingClientRect(),s=document.querySelector('.subnav,.pvx-subnav,#pvxSubnav');return [Math.round(l.height),s?Math.round(s.getBoundingClientRect().top-l.bottom):null]})()")
    ok('Yakuri: the lip is 24 pt deep and clear of the sub-nav (Yakuri’s own 44 pt button rule made it cover it)', y[0] == 24 and (y[1] is None or y[1] >= -1), y)
    await c.close()
    # a phone on its side: More's list stays in the window and scrolls
    c, p, e = await opn(br, 'treatment/', vp=(844, 390), touch=True)
    await p.tap('.pvxn-lip'); await p.wait_for_timeout(600); await p.tap('#pvxnMoreBtn'); await p.wait_for_timeout(400)
    m = await p.evaluate("(()=>{const m=document.getElementById('pvxnMore'),r=m.getBoundingClientRect();return [Math.round(r.bottom),innerHeight,m.scrollHeight>m.clientHeight,getComputedStyle(m).overflowY]})()")
    ok('844 × 390: More’s list ends inside the window and scrolls (it ran 230 pt off it)', m[0] <= m[1] and m[2] and m[3] == 'auto', m)
    await c.close()
    # the managers' "Unauthorized" view: the lip and the open panel are above its box, so the apps can still be reached
    c, p, e = await opn(br, 'treatment/', user=MGR)
    await p.wait_for_timeout(600)
    r0 = await p.evaluate("(()=>{const l=document.querySelector('.pvxn-lip').getBoundingClientRect(),h=document.elementFromPoint(l.left+l.width/2,l.top+l.height/2);return [!!document.querySelector('.pvx-ua-box'),!!(h&&h.closest('.pvxn-lip'))]})()")
    await hover_in(p); await p.wait_for_timeout(700)
    r1 = await p.evaluate("(()=>{const a=document.getElementById('navOR').getBoundingClientRect(),h=document.elementFromPoint(a.left+a.width/2,a.top+a.height/2),b=document.querySelector('.pvx-ua-box').getBoundingClientRect(),pn=document.querySelector('.pvxn-panel').getBoundingClientRect();return [!!(h&&h.closest('#navOR')),Math.round(b.top-pn.bottom)]})()")
    ok('managers’ view: “Unauthorized” starts under the lip, and under the panel while it’s open, so the apps are reachable (its box covered both)', r0 == [True, True] and r1[0] and r1[1] >= 0, [r0, r1])
    await c.close()


@section(id='t276', title='n276 · the app navigation draws its apps without a clipping layer (Safari kept a stale clip)',
         apps=['flow', 'treatment', 'topbar'], topics=['navigation', 'motion'], engines=('chromium', 'webkit'))
async def s_t276(br):
    PROBE = """(()=>{window.__fr=[];const pn=document.querySelector('.pvxn-panel');const t0=performance.now();function f(){const p=pn.getBoundingClientRect();const out=[];document.querySelectorAll('.pvxn-row>*').forEach(a=>{const o=+getComputedStyle(a).opacity;if(o<.04)return;const s=a.querySelector('svg').getBoundingClientRect();const lab=(a.querySelector('span')||a).getBoundingClientRect();const L=Math.min(s.left,lab.left),R=Math.max(s.right,lab.right),B=Math.max(s.bottom,lab.bottom);if(L<p.left-1||R>p.right+1||B>p.bottom+1)out.push(a.id)});__fr.push(out);if(performance.now()-t0<900)requestAnimationFrame(f)}requestAnimationFrame(f)})()"""
    for path, vp in (('#app=rounds', (1600, 840)), ('treatment/', (390, 844))):
        c, p, e = await opn(br, path, vp=vp, touch=vp[0] < 500)
        clip = await p.evaluate("[...document.querySelectorAll('.pvxn-dock *')].filter(x=>{if(!(x instanceof HTMLElement))return false;const c=getComputedStyle(x);return /hidden|clip/.test(c.overflowX+c.overflowY)&&parseFloat(c.borderTopLeftRadius+c.borderBottomLeftRadius)>0&&!x.closest('.pvxn-pop')}).map(x=>x.className)")
        await p.evaluate(PROBE + ";pvxNav.expand()"); await p.wait_for_timeout(1100)
        fr = await p.evaluate("__fr")
        vis = await p.evaluate("(()=>{const p=document.querySelector('.pvxn-panel').getBoundingClientRect();return [...document.querySelectorAll('.pvxn-row>*')].map(a=>{const s=a.querySelector('svg').getBoundingClientRect(),l=a.querySelector('span').getBoundingClientRect(),h=document.elementFromPoint(l.left+l.width/2,l.top+l.height/2);return [a.id,getComputedStyle(a).opacity,!!(h&&a.contains(h)),s.bottom<=p.bottom]})})()")
        ok('%s %d pt: no rounded clipping layer in the panel, nothing shows outside the panel while it opens (%d frames), and every app shows in full once open (Daniel’s Rounds screenshot: cut off under the bar in Safari)' % (path, vp[0], len(fr)),
           not clip and not [x for x in fr if x] and all(v[1] == '1' and v[2] and v[3] for v in vis), [clip, [x for x in fr if x][:2], [v for v in vis if not (v[1] == '1' and v[2] and v[3])]])
        await c.close()
