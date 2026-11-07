"""Pravix Rounds — the n304 build's own checks: HIG Accessibility, App icons, Branding and Color (Nov 2 2026), on the sample census.
Rounds only: Flow's board, Ultrasound and the waiting room are checked unchanged. Chromium and WebKit."""
import os, json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'   # not one of the two accounts main enrolls on sign-in (that path needs a real Firebase user)
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]

# every visible text in Rounds against its own background (alpha layers composited); WCAG AA as the HIG's Accessibility page uses it
CONTRAST = """(()=>{const root=[document.getElementById('subnavRd'),document.getElementById('view-rd-census')].filter(Boolean);
const P=s=>(s.match(/[\\d.]+/g)||[0,0,0]).map(Number),rgba=s=>{const v=P(s);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)},L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
function bgOf(el){const st=[];let e=el;while(e&&e.nodeType===1){const c=rgba(getComputedStyle(e).backgroundColor);if(c.a>0)st.push(c);if(c.a>=1)break;e=e.parentElement}
 let b=st.length&&st[st.length-1].a>=1?st.pop():rgba(getComputedStyle(document.body).backgroundColor);if(b.a<1)b={r:13,g:23,b:48,a:1};for(let i=st.length-1;i>=0;i--)b=over(st[i],b);return b}
const vis=e=>{if(!e.getClientRects().length)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&+cs.opacity>=.1};
const low=[];let n=0,minFs=99;root.forEach(R=>{const w=document.createTreeWalker(R,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode()){if(!t.textContent.trim())continue;const el=t.parentElement;if(!vis(el))continue;n++;
 const cs=getComputedStyle(el),fs=parseFloat(cs.fontSize),fw=+cs.fontWeight||400;minFs=Math.min(minFs,fs);const b=bgOf(el);let f=rgba(cs.color);f=over({...f,a:f.a*(+cs.opacity)},b);
 const cr=(Math.max(L(f),L(b))+.05)/(Math.min(L(f),L(b))+.05),need=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5;if(cr<need)low.push([el.className||el.tagName,t.textContent.trim().slice(0,22),+cr.toFixed(2)])}});
return {n,minFs,low:low.slice(0,12),lowN:low.length}})()"""


async def page(br, vp=(1440, 900), dark=True, contrast=None, touch=False, seed=True):
    kw = dict(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
    if contrast: kw['contrast'] = contrast
    if touch: kw.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**kw)
    if not dark: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_selector('#subnavRd', state='attached'); await p.wait_for_timeout(2600)   # n305: Rounds' own page
    if seed: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1000)
    return c, p, e


async def open_row(p, i=0):
    await p.evaluate(f"document.querySelectorAll('#rdList .rd-row .rd-name')[{i}].click()"); await p.wait_for_timeout(800)


@section(id='t304', title='n304 · Rounds follows the HIG Accessibility, App icons, Branding and Color pages', apps=['flow'], topics=['accessibility', 'color', 'rounds', 'hig'], engines=('chromium', 'webkit'))
async def s_t304(br):
    # 1 · contrast, both themes, census and an open patient; Increase Contrast
    res = {}
    for dark in (True, False):
        c, p, e = await page(br, dark=dark)
        a = await p.evaluate(CONTRAST); await open_row(p); await open_row(p, 1); b = await p.evaluate(CONTRAST)
        res['dark' if dark else 'light'] = [a['n'], a['lowN'], a['low'], b['n'], b['lowN'], b['low'], min(a['minFs'], b['minFs'])]
        if not dark:
            col = await p.evaluate("['.rd-chip.authwarn','.rd-chip.due','.rd-eyebrow'].map(s=>{const e=document.querySelector('#view-rd-census '+s);return e?getComputedStyle(e).color:null})")
        ok(f"no page errors ({'dark' if dark else 'light'})", not newerr(e), e[:2]); await c.close()
    ok('Dark: every visible text in the census and in two open patients is at least 4.5:1 (3:1 large); the white-on-red chips were 4.35:1, the over-budget red 4.25:1',
       res['dark'][0] > 250 and res['dark'][1] == 0 and res['dark'][3] > 300 and res['dark'][4] == 0, res['dark'])
    ok('Light: the same, where the amber chips (“AUTH 14h / 24h”, “OWNER UPDATE DUE”), “Deposit below 75% minimum” and the eyebrow were 1.4–2.0:1 and the teal links 3.4:1',
       res['light'][0] > 250 and res['light'][1] == 0 and res['light'][3] > 300 and res['light'][4] == 0, res['light'])
    ok('…light mode takes the suite’s readable inks, not the dark-mode amber (#EBC95D)', col[0] == col[1] and col[0] != 'rgb(235, 201, 93)' and col[2] != 'rgb(56, 189, 210)', col)
    ok('No text under 11 pt', res['dark'][6] >= 11 and res['light'][6] >= 11, [res['dark'][6], res['light'][6]])
    hc = {}
    for dark in (True, False):
        c, p, e = await page(br, dark=dark, contrast='more')
        hc['dark' if dark else 'light'] = await p.evaluate("(()=>{const r=document.querySelector('#rdList .rd-row.acu-critical');const ch=document.querySelector('#rdList .rd-chip.crit');return [getComputedStyle(r).borderLeftWidth,getComputedStyle(ch).backgroundColor,getComputedStyle(document.querySelector('.rd-eyebrow')).color]})()")
        await c.close()
    ok('Increase Contrast: the status edge is 5 pt (was 3), the critical chip a deeper red, and the accent firmer, in dark and light', all(v[0] == '5px' and v[1] == 'rgb(165, 26, 20)' for v in hc.values()) and hc['dark'][2] != hc['light'][2], hc)

    # 2 · status by shape as well as colour, named for VoiceOver
    c, p, e = await page(br)
    st = await p.evaluate("""(()=>{const sh=d=>{const cs=getComputedStyle(d);return cs.clipPath==='none'?(cs.boxShadow!=='none'&&cs.backgroundColor==='rgba(0, 0, 0, 0)'?'ring':'dot'):(/50% 0(px)?, 100% 50%/.test(cs.clipPath)?'diamond':/50% 0(px)?, 100% 100%/.test(cs.clipPath)?'triangle':cs.clipPath)};
      const out={};document.querySelectorAll('#rdList .rd-row').forEach(r=>{const d=r.querySelector('.rd-dot');const k=[...r.classList].find(x=>/^acu-|^rd-hold$/.test(x));out[k]=[sh(d),d.getAttribute('role'),d.getAttribute('aria-label'),d.getAttribute('aria-hidden')]});return out})()""")
    ok('Each status has its own shape and a VoiceOver name: Critical ◆, Attention ▲, Stable ●; holds have no status dot for VoiceOver',
       st.get('acu-critical', [None])[:3] == ['diamond', 'img', 'Status: Critical'] and st.get('acu-attention', [None])[:3] == ['triangle', 'img', 'Status: Attention']
       and st.get('acu-stable', [None])[:3] == ['dot', 'img', 'Status: Stable'] and st.get('rd-hold', [None])[3] == 'true', st)
    await open_row(p)
    seg = await p.evaluate("[...document.querySelectorAll('#rdList .rd-row.open .rd-acuity-seg button')].map(b=>{const d=b.querySelector('.rd-shp .rd-dot');const cs=d&&getComputedStyle(d);return [b.textContent.trim(),!!d,d&&b.querySelector('.rd-shp').getAttribute('aria-hidden'),cs&&(cs.clipPath!=='none'?'clip':cs.boxShadow!=='none'&&cs.backgroundColor==='rgba(0, 0, 0, 0)'?'ring':'dot')]})")
    ok('The Status buttons show the same shapes (hidden from VoiceOver, the word says it): Critical, Attention, Stable, Discharge ready',
       [x[0] for x in seg] == ['Critical', 'Attention', 'Stable', 'Discharge ready'] and all(x[1] and x[2] == 'true' for x in seg) and [x[3] for x in seg] == ['clip', 'clip', 'dot', 'ring'], seg)
    # 3 · focus you can see on fields
    fo = await p.evaluate("""(async()=>{const o=[];for(const s of ['input[data-input=client-id]','.rd-assess textarea, .rd-assess input, input[data-input=assessment]']){const i=document.querySelector('#rdList .rd-row.open '+s);if(!i){o.push(null);continue}i.focus();await new Promise(r=>setTimeout(r,250));const w=i.closest('.rd-id-field,.rd-assess'),cs=getComputedStyle(w);o.push([cs.boxShadow!=='none'&&/3px/.test(cs.boxShadow),cs.borderTopColor]);i.blur()}return o})()""")
    ok('The client ID and assessment fields show a 3 pt ring and a full-strength border when focused (they went from 10 % to 34–42 % cyan)', all(x and x[0] for x in fo), fo)
    # 4 · targets with a mouse: at least 28 pt to hit, layout unchanged
    hit = await p.evaluate("""(()=>{const t=(s,dy)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2+dy;const h=document.elementFromPoint(x,y);return !!h&&(h===e||e.contains(h))};
      const o={};for(const s of ['#rdList .rd-handoff .doc','#rdList .rd-tmr-i .ck, .rd-tmr-i .ck','#rdList .rd-row.open .rd-fin-edit']){const e=document.querySelector(s);o[s]=e?[Math.round(e.getBoundingClientRect().height),t(s,-13),t(s,13)]:null}return o})()""")
    ok('With a mouse, the doctor names (17 pt tall), Tomorrow’s checkboxes (15) and the editable amounts (20) can be hit 13 pt above and below their centre — a 28 pt target — without moving anything',
       all(v and v[1] and v[2] for v in hit.values()), hit)
    ok('no page errors (status, focus, targets)', not newerr(e), e[:2]); await c.close()

    # 5 · the undo bar waits while you're on it; ⌘Z / Ctrl+Z brings the removal back
    c, p, e = await page(br)
    await open_row(p)
    n0 = await p.evaluate("document.querySelectorAll('#rdList .rd-row.open [data-act=prob-del]').length")
    await p.click('#rdList .rd-row.open [data-act=prob-del] >> nth=0'); await p.wait_for_timeout(300)
    u = await p.evaluate("(()=>{const t=document.getElementById('rdUndo');return [t&&t.classList.contains('open'),t&&t.querySelector('.ru-undo').getAttribute('aria-keyshortcuts'),t&&t.querySelector('.ru-key').textContent]})()")
    await p.hover('#rdUndo .ru-undo'); await p.wait_for_timeout(9000)
    held = await p.evaluate("document.getElementById('rdUndo').classList.contains('open')")
    await p.mouse.move(5, 300); await p.wait_for_timeout(3000)
    still = await p.evaluate("document.getElementById('rdUndo').classList.contains('open')"); await p.wait_for_timeout(5600)
    gone = await p.evaluate("!document.getElementById('rdUndo').classList.contains('open')")
    ok('Removing a problem offers Undo with its shortcut shown; pointing at the bar holds it past the 8 s it used to vanish at; leaving gives back the time it had (at least 4 s), then it goes',
       u[0] and u[1] in ('Meta+Z', 'Control+Z') and u[2] in ('⌘Z', 'Ctrl+Z') and held and still and gone and n0 >= 1, [u, held, still, gone, n0])
    n1 = await p.evaluate("document.querySelectorAll('#rdList .rd-row.open [data-act=prob-del]').length")
    await p.keyboard.press('Meta+z' if u[1] == 'Meta+Z' else 'Control+z'); await p.wait_for_timeout(500)
    n2 = await p.evaluate("document.querySelectorAll('#rdList .rd-row.open [data-act=prob-del]').length")
    ok('…after the bar has gone, ⌘Z / Ctrl+Z (outside a text field) still brings the problem back: the removal is in the suite’s one undo history', n1 == n0 - 1 and n2 == n0, [n0, n1, n2])
    await p.keyboard.press('Meta+z' if u[1] == 'Meta+Z' else 'Control+z'); await p.wait_for_timeout(300)
    ok('…and pressing it again doesn’t bring back anything twice', await p.evaluate("document.querySelectorAll('#rdList .rd-row.open [data-act=prob-del]').length") == n0)
    ok('no page errors (undo)', not newerr(e), e[:2]); await c.close()

    # 6 · Rounds is Rounds (its own page since n305): title, address, Home Screen name and icon, install manifest; Flow keeps its own
    c, p, e = await page(br, seed=False)
    r = await p.evaluate("[document.title,location.pathname,document.querySelector('link[rel=apple-touch-icon]').getAttribute('href'),document.querySelector('meta[name=apple-mobile-web-app-title]').content,document.querySelector('link[rel=manifest]').getAttribute('href'),(document.querySelector('.rd-eyebrow')||{}).textContent]")
    async with p.expect_navigation(): await p.evaluate("switchApp('flow')")
    await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(800)
    f = await p.evaluate("[document.title,location.pathname,document.querySelector('link[rel=apple-touch-icon]').getAttribute('href'),document.querySelector('meta[name=apple-mobile-web-app-title]').content,document.querySelector('link[rel=manifest]').getAttribute('href')]")
    ok('In Rounds the tab names what’s on screen (“Census”, n321), the address is /rounds/, and Add to Home Screen / Install get the name Rounds, its icon and its manifest',
       r[:5] == ['Census', '/rounds/', '/assets/img/rounds-180.png', 'Rounds', '/rounds/manifest.webmanifest'], r)
    ok('Flow keeps Flow’s title, address, name, icon and manifest', f == ['Pravix Flow | Veterinary Patient Flow Software', '/', '/assets/img/apple-touch-icon.png', 'Flow', '/manifest.webmanifest'], f)
    ok('The header names the page (“Inpatient census”), not the brand the top bar already shows', r[5].strip() == 'INPATIENT CENSUS', r[5])
    await c.close()
    man = json.load(open(os.path.join(BUILD, 'rounds', 'manifest.webmanifest'), encoding='utf-8')); flow = json.load(open(os.path.join(BUILD, 'manifest.webmanifest'), encoding='utf-8'))
    def ihdr(name):   # width, height, colour type (2 RGB, 6 RGBA) from the PNG header: CI has no Pillow
        b = open(os.path.join(BUILD, 'assets', 'img', name), 'rb').read(29)
        return int.from_bytes(b[16:20], 'big'), int.from_bytes(b[20:24], 'big'), b[25]
    ims = {k: ihdr(k) for k in ['rounds-180.png', 'rounds-192.png', 'rounds-512.png', 'rounds-maskable-512.png', 'sc-rounds.png']}
    c = await br.new_context(); p = await c.new_page()
    await p.goto(f'http://127.0.0.1:{PORT}/assets/img/rounds-512.png')
    px = await p.evaluate("(async()=>{const i=new Image();i.src='/assets/img/rounds-512.png';await i.decode();const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.drawImage(i,0,0);return [[...x.getImageData(4,4,1,1).data].slice(0,3),[...x.getImageData(126,256,1,1).data].slice(0,3)]})()")
    await c.close()
    ok('Rounds’ manifest: its own id and scope (/rounds/, never Flow’s app), opens Rounds, 192/512 icons and a maskable one; the icons are the top-bar glyph in the accent on #0A1222, square and unmasked',
       man['id'] == '/rounds/' and man['start_url'] == '/rounds/' and man['scope'] == '/rounds/' and man['short_name'] == 'Rounds' and [i['sizes'] for i in man['icons']] == ['192x192', '512x512', '512x512']
       and all(v[0] == v[1] for v in ims.values()) and ims['rounds-512.png'][2] == 2 and ims['sc-rounds.png'][2] == 6 and px[0] == [10, 18, 34] and px[1] == [56, 189, 210], [man.get('id'), ims, px])
    ok('Flow’s Rounds shortcut has the Rounds icon (and, since n333, Ultrasound’s has Ultrasound’s); New patient is unchanged', [s.get('icons', [{}])[0].get('src') for s in flow['shortcuts']] == [None, '/assets/img/sc-rounds.png', '/assets/img/sc-ultrasound.png'], flow['shortcuts'])

    # 7 · Flow and the waiting room are untouched
    c, p, e = await page(br, seed=False)
    await p.goto(f'http://127.0.0.1:{PORT}/#app=flow'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(1200)
    un = await p.evaluate("""(async()=>{const a=[document.title,!!document.getElementById('n304-css')&&[...document.getElementById('n304-css').sheet.cssRules].length,getComputedStyle(document.querySelector('.topnav')).backgroundColor];
      switchView('client');await new Promise(r=>setTimeout(r,800));const cl=document.getElementById('view-client');const b=[cl&&!cl.classList.contains('hidden'),document.title,location.hash];
      return [a,b]})()""")
    ok('Flow and the waiting room keep Flow’s title and address, and carry none of n304’s Rounds rules', un[0][0] == 'Pravix Flow | Veterinary Patient Flow Software' and not un[0][1] and un[1][0] and un[1][1] == un[0][0], un)
    ok('no page errors (identity, Flow)', not newerr(e), e[:2]); await c.close()
