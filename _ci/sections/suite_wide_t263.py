"""The whole suite — the n263 build's own checks: who is signed in, in the shared top bar (Daniel chose options B and C
of the Oct 29 mock-up). Runs in Chromium and WebKit (Safari's engine)."""
import os, re, glob, json
from core import ok, section, until, new_page, BUILD as SITE, PORT
from helpers import STUB216

U = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
BTN = "(()=>{const b=document.getElementById('logoutBtn');if(!b)return null;const r=b.getBoundingClientRect();return {txt:b.innerText.trim().replace(/\\s*\\n\\s*/g,' / '),aria:b.getAttribute('aria-label'),pop:b.getAttribute('aria-haspopup'),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),vw:innerWidth}})()"
CARD = "(()=>{const c=document.getElementById('pvxAccountCard');if(!c)return null;const r=c.getBoundingClientRect();return {txt:c.innerText.replace(/\\n+/g,' | '),role:c.getAttribute('role'),inView:r.left>=0&&r.right<=innerWidth&&r.top>=0,focus:document.activeElement&&document.activeElement.className}})()"
# the small name's contrast on what is under it (the button's own fill, a gradient), and whether light was chosen
CON = ("""(()=>{const s=document.querySelector('#logoutBtn .pvx-two small');const L=c=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
      let el=s,bg='rgba(0, 0, 0, 0)';while(el&&(bg==='rgba(0, 0, 0, 0)'||bg==='transparent')){const cs=getComputedStyle(el),gi=cs.backgroundImage.match(/rgba?\\([^)]*\\)/);bg=gi?gi[0]:cs.backgroundColor;el=el.parentElement}
      const a=L(getComputedStyle(s).color),b=L(bg);return [getComputedStyle(s).color,bg,+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2),document.documentElement.classList.contains('pvx-ac-light')]})()""")


async def opn(br, path, vp=(1440, 900), touch=False, user=U, dark=True):
    c, p, e = await new_page(br, user=user, vp=vp, touch=touch, dark=dark)
    async def mod(r): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(r.request.url.rsplit('/', 1)[-1], ''))
    await p.route('https://www.gstatic.com/firebasejs/10.12.0/*', mod)
    await p.goto(f'http://127.0.0.1:{PORT}/' + path)
    await until(p, "!!document.querySelector('#logoutBtn .pvx-two')", 6000)
    return c, p, e


@section(id='t263', title='n263 · who is signed in, in the shared top bar (the name on Log out, and an account card)',
         apps=['treatment', 'flow', 'or', 'sgvp', 'directory', 'scheduling', 'topbar'], topics=['sign-in', 'accessibility', 'menus'], engines=('chromium', 'webkit'))
async def s_t263(br):
    # C · every page with the shared top bar names the person on Log out, at the same size
    pages = sorted(os.path.relpath(p, SITE).replace('index.html', '') for p in glob.glob(SITE + '/**/*.html', recursive=True)
                   if 'id="logoutBtn"' in open(p, encoding='utf-8', errors='ignore').read() and 'pvx-appearance.js' in open(p, encoding='utf-8', errors='ignore').read())
    bad = []
    for path in pages:
        c, p, e = await opn(br, path)
        b = await p.evaluate(BTN)
        if not b or b['txt'] != 'Daniel G. / Log out' or b['aria'] != 'Log out Daniel Giordano' or b['w'] > 140: bad.append([path, b])
        await c.close()
    ok('C: every page with the shared top bar names who is signed in on its Log out button — “Daniel G. / Log out”, VoiceOver “Log out Daniel Giordano” (%d pages; it said only “Logout”)' % len(pages), pages and not bad, bad[:3])
    # the button keeps its size, Mac and iPhone; signed out it's as it was
    c, p, e = await opn(br, 'treatment/'); mac = await p.evaluate(BTN)
    # B · the card: the pointer rests on the button
    await p.hover('#logoutBtn'); hv = await until(p, "!!document.getElementById('pvxAccountCard')", 2000); cd = await p.evaluate(CARD)
    ok('B: resting the pointer on Log out opens the account card — name, email, “VCA Shoreline”, Log out and “Not you? …” — inside the window',
       hv and cd and 'Daniel Giordano' in cd['txt'] and 'daniel.giordano@pravix.app' in cd['txt'] and 'VCA Shoreline' in cd['txt'] and 'Log out' in cd['txt'] and 'Not you? Log out, so the next person charts as themselves.' in cd['txt'] and cd['role'] == 'dialog' and cd['inView'], cd)
    await p.mouse.move(400, 500); gone = await until(p, "!document.getElementById('pvxAccountCard')", 2000)
    ok('B: pointing away closes it', gone, '')
    # keyboard: ↓ opens with focus on Log out, Esc closes and focus returns
    await p.focus('#logoutBtn'); await p.keyboard.press('ArrowDown'); await until(p, "!!document.getElementById('pvxAccountCard')", 1500)
    kf = await p.evaluate("(document.activeElement||{}).className||''")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    back = await p.evaluate("[!document.getElementById('pvxAccountCard'),(document.activeElement||{}).id]")
    ok('B: from the keyboard, ↓ on Log out opens the card with focus on its Log out; Esc closes it and focus goes back', kf == 'pac-out' and back == [True, 'logoutBtn'], [kf, back])
    # one click still logs out, at once
    await p.evaluate("window.__lo=0;window.logout=function(){window.__lo++};0")
    await p.mouse.move(400, 500); await p.wait_for_timeout(100)
    await p.evaluate("document.getElementById('logoutBtn').click()"); one = await p.evaluate("window.__lo")
    await p.evaluate("pvxAccount.open(false)"); await p.wait_for_timeout(200); await p.click('#pvxAccountCard .pac-out'); two = await p.evaluate("window.__lo")
    ok('C: one click on the button still logs out, and so does the card’s Log out', one == 1 and two == 2, [one, two])
    ok('no page errors (Mac)', not e, e[:2]); await c.close()
    # iPhone: same size, a long press opens the card and doesn't log out
    c, p, e = await opn(br, 'treatment/', vp=(390, 844), touch=True); ph = await p.evaluate(BTN)
    ok('C: the button keeps its size and fits (Mac %s pt, iPhone %s pt wide, 40 pt tall)' % (mac and mac['w'], ph and ph['w']), mac and ph and mac['h'] == 40 and ph['h'] == 40 and mac['w'] <= 140 and ph['w'] <= 140 and ph['right'] <= ph['vw'], [mac, ph])
    await p.evaluate("window.__lo=0;window.logout=function(){window.__lo++};0")
    bb = await p.locator('#logoutBtn').bounding_box(); x, y = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    await p.evaluate("""([x,y])=>{const b=document.getElementById('logoutBtn');const o={bubbles:true,cancelable:true,clientX:x,clientY:y,pointerType:'touch',pointerId:7,isPrimary:true};
       b.dispatchEvent(new PointerEvent('pointerdown',o));setTimeout(()=>{b.dispatchEvent(new PointerEvent('pointerup',o));b.click()},700)}""", [x, y])
    await p.wait_for_timeout(1000)
    lp = [await p.evaluate("!!document.getElementById('pvxAccountCard')"), await p.evaluate("window.__lo"), await p.evaluate(CARD)]
    ok('B: on touch, a long press on Log out opens the card instead of logging out, inside the screen', lp[0] and lp[1] == 0 and lp[2] and lp[2]['inView'], lp)
    ok('no page errors (iPhone)', not e, e[:2]); await c.close()
    # light and dark: the small name reads at 4.5:1 or more on the button
    c, p, e = await opn(br, 'treatment/', dark=False); con = await p.evaluate(CON)
    ok('C: in light, the name reads at 4.5:1 or more on the button', con[2] >= 4.5 and con[3], con)
    await c.close()
    c, p, e = await opn(br, 'treatment/', dark=True); con = await p.evaluate(CON)
    ok('C: in dark, too', con[2] >= 4.5 and not con[3], con); await c.close()
    # signed out: the button is as it was
    c, p, e = await new_page(br, user='null')
    await p.goto(f'http://127.0.0.1:{PORT}/treatment/'); await p.wait_for_timeout(2500)
    so = await p.evaluate(BTN)
    ok('signed out, the button is unchanged (“Logout”)', so is None or ('Logout' in so['txt'] and 'Daniel' not in so['txt']), so)
    await c.close()
