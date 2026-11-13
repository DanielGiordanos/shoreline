"""Pravix Flow, Rounds and Ultrasound — the n369 build's own checks (Nov 13 2026): the sign-in's own alert in place of the browser's
confirm(), and in-place notes on the sign-in card in place of the browser's alert() (HIG Alerts; the open item from n366). When an
approved account signs in before its email is verified, each app asks with a Pravix alert (named and described for VoiceOver, Cancel
and Send email, light or dark with the person, an action sheet on iPhone, Esc / Cmd-. / Ctrl-. cancel, Tab stays inside). What
happened is then said on the sign-in card, whose Sign in button comes back. The activation logic is unchanged (it still answers
false, which signs out). Chromium and WebKit."""
import os, json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, path='/', w=1440, h=900, light=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='light' if light else 'dark')
    if w < 700: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    if light: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    await c.add_init_script("window.__pop=0; window.confirm=function(){ window.__pop++; return false; }; window.alert=function(){ window.__pop++; };")
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(2600)
    return c, p, e

# Start the unverified approved-account path without waiting for it: window.__r gets its answer, window.__sent counts emails.
START = """((mode)=>{ window.__r='pending'; window.__sent=0; window.__back=document.activeElement;
  const u={email:mode==='other'?'resident.a@vca.com':'daniel.giordano@pravix.app', emailVerified:false, providerData:[], uid:'u1',
    reload:async()=>{ if(mode==='broken') throw new Error('offline'); }, getIdToken:async()=>'',
    sendEmailVerification:async()=>{ window.__sent++; if(mode==='nosend') throw new Error('quota'); }};
  pvxActivateApprovedStaffMember(u).then(v=>{ window.__r=v; }, x=>{ window.__r='threw '+x; }); })"""
BOX = """(()=>{ const b=document.querySelector('.pvx-aa-box'); if(!b) return {open:false, r:window.__r, pop:window.__pop, sent:window.__sent};
  const n=b.getAttribute('aria-labelledby'), d=b.getAttribute('aria-describedby'), ae=document.activeElement, r=b.getBoundingClientRect();
  const L=c=>{ const m=String(c).match(/[\\d.]+/g)||[0,0,0]; return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255; };
  const bs=[...b.querySelectorAll('button')];
  return {open:true, n:document.querySelectorAll('.pvx-aa').length, role:b.getAttribute('role'), modal:b.getAttribute('aria-modal'),
    name:n&&document.getElementById(n).textContent, desc:d&&document.getElementById(d).textContent,
    btns:bs.map(x=>x.textContent.trim()), focus:ae&&ae.textContent.trim(), light:L(getComputedStyle(b).backgroundColor)>0.6, dark:L(getComputedStyle(b).backgroundColor)<0.3,
    fs:parseFloat(getComputedStyle(bs[0]).fontSize), h:Math.min(...bs.map(x=>x.getBoundingClientRect().height)),
    order:bs.slice().sort((a,c)=>a.getBoundingClientRect().top-c.getBoundingClientRect().top).map(x=>x.textContent.trim()),
    bottom:Math.round(innerHeight-r.bottom), width:Math.round(r.width), top:document.elementFromPoint(r.left+r.width/2,r.top+8)&&b.contains(document.elementFromPoint(r.left+r.width/2,r.top+8)),
    r:window.__r, pop:window.__pop, sent:window.__sent}; })()"""
VERIFY = 'Verify your email to use Pravix'
# The sign-in card as it is mid-sign-in (button busy), as the real sign-in leaves it while access is checked.
CARD = """(()=>{ if(!document.getElementById('sbLogin')) showLogin(); const b=document.getElementById('sbBtn'); b.disabled=true; b.innerHTML='Signing in <span class=\\"signin-progress\\"></span>'; document.getElementById('sbErr').textContent=''; })()"""
# What the sign-out does next (onAuthStateChanged(null) → showLogin()), then what the card says.
OUT = """(()=>{ showLogin(); const c=document.getElementById('sbLogin'), e=document.getElementById('sbErr'), b=document.getElementById('sbBtn'), f=document.getElementById('sbForgot');
  const er=e.getBoundingClientRect(), fr=f.getBoundingClientRect();
  const L=x=>{ const m=String(x).match(/[\\d.]+/g)||[0,0,0]; return {r:+m[0],g:+m[1],b:+m[2]}; }, k=L(getComputedStyle(e).color);
  return {note:e.textContent, role:e.getAttribute('role'), btn:b.textContent.trim(), busy:b.disabled, fits:er.bottom<=fr.top+1 && e.scrollHeight<=e.clientHeight+1, card:!!c,
    info:e.classList.contains('pvx-info'), red:k.r>k.g+60 && k.r>k.b+60}; })()"""
DROP = "(()=>{ const c=document.getElementById('sbLogin'); if(c) c.remove(); })()"


async def run(p, mode):
    await p.evaluate(START + f"('{mode}')"); await p.wait_for_timeout(450)
    return await p.evaluate(BOX)


async def after(p, ms=450):
    await p.wait_for_timeout(ms); return await p.evaluate(BOX)


@section(id='t369', title='n369 · Alerts: the sign-in’s own alerts in place of the browser’s pop-ups, in Flow, Rounds and Ultrasound',
         apps=['flow', 'rounds', 'ultrasound'], topics=['alerts', 'sign-in'], engines=('chromium', 'webkit'))
async def s_t369(br):
    src = {f: open(os.path.join(BUILD, f), encoding='utf-8').read() for f in ('index.html', 'rounds/app.js', 'ultrasound/app.js')}
    ok('No browser pop-ups are left: none of Flow’s page, Rounds’ or Ultrasound’s script calls window.confirm() or window.alert(), and each has the sign-in alert',
       all('window.confirm(' not in t and 'window.alert(' not in t and 'function pvxAuthAlert(' in t for t in src.values()),
       {f: [t.count('window.confirm('), t.count('window.alert('), t.count('function pvxAuthAlert(')] for f, t in src.items()})

    c, p, e = await ctx(br)
    a = await run(p, 'verify')
    ok('Flow · an approved account with its email unverified gets Pravix’s alert, not the browser’s: an alertdialog, modal, named “Verify your email to use Pravix”, described with the address',
       a['open'] and a['n'] == 1 and a['role'] == 'alertdialog' and a['modal'] == 'true' and a['name'] == VERIFY and 'daniel.giordano@pravix.app' in (a['desc'] or '') and a['pop'] == 0, a)
    ok('…its buttons say what they do (Cancel, Send email), Send email has focus, the buttons are 15 pt and at least 44 pt tall, and it’s dark in dark mode',
       a['btns'] == ['Cancel', 'Send email'] and a['focus'] == 'Send email' and a['fs'] == 15 and a['h'] >= 44 and a['dark'] and a['top'], a)
    await p.keyboard.press('Tab'); t1 = await p.evaluate("document.activeElement.textContent.trim()")
    await p.keyboard.press('Tab'); t2 = await p.evaluate("document.activeElement.textContent.trim()")
    await p.keyboard.press('Shift+Tab'); t3 = await p.evaluate("document.activeElement.textContent.trim()")
    ok('…Tab and Shift-Tab stay inside the alert', [t1, t2, t3] == ['Cancel', 'Send email', 'Cancel'], [t1, t2, t3])
    await p.keyboard.press('Escape'); b = await after(p)
    back = await p.evaluate("document.activeElement===window.__back"); o = await p.evaluate(OUT); await p.evaluate(DROP)
    ok('…Esc cancels: the alert closes, no email is sent, focus goes back, the answer is still “not active” (which signs out), and the sign-in card says “Verify your email, then sign in again.”',
       not b['open'] and b['sent'] == 0 and b['r'] is False and back and o['note'] == 'Verify your email, then sign in again.' and o['role'] == 'status', [b, back, o])
    a = await run(p, 'verify'); await p.keyboard.press('Control+Period'); b = await after(p)
    a2 = await run(p, 'verify'); await p.keyboard.press('Meta+Period'); b2 = await after(p); await p.evaluate(DROP)
    ok('…Ctrl-. and Cmd-. cancel too', a['open'] and not b['open'] and b['r'] is False and b['sent'] == 0 and a2['open'] and not b2['open'] and b2['r'] is False, [b, b2])
    await p.evaluate(CARD)
    a = await run(p, 'verify'); await p.keyboard.press('Enter'); b = await after(p)
    o = await p.evaluate(OUT)
    ok('…Return sends the email; no second pop-up: the sign-in card says “Link sent to daniel.giordano@pravix.app. Open it, then sign in again.”, and the answer is “not active”',
       a['open'] and not b['open'] and b['sent'] == 1 and b['r'] is False and o['note'] == 'Link sent to daniel.giordano@pravix.app. Open it, then sign in again.', [b, o])
    ok('…the card’s Sign in button comes back (it stayed on “Signing in” before), the note fits above Forgot password, and it’s in the card’s text colour, not red (it isn’t a problem)',
       o['btn'] == 'Sign in' and not o['busy'] and o['fits'] and o['info'] and not o['red'], o)
    await p.fill('#sbPass', 'y'); r2 = await p.evaluate("(()=>{ const e=document.getElementById('sbErr'); return {t:e.textContent, info:e.classList.contains('pvx-info')}; })()")
    ok('…typing clears the note and its colour, so a later “Incorrect email or password” is red again', r2['t'] == '' and not r2['info'], r2)
    await p.evaluate(CARD)
    a = await run(p, 'nosend'); await p.click('.pvx-aa-box [data-v="1"]'); b = await after(p); o = await p.evaluate(OUT)
    ok('…if the email can’t be sent, the card says so (“The link didn’t send. Try again in a few minutes.”) instead of claiming it was sent',
       not b['open'] and b['sent'] == 1 and b['r'] is False and o['note'] == 'The link didn’t send. Try again in a few minutes.' and o['red'] and not o['info'], [b, o])
    await p.evaluate(CARD)
    a = await run(p, 'broken'); o = await p.evaluate(OUT); await p.evaluate(DROP)
    ok('…when access can’t start, no pop-up: the card says “Pravix couldn’t start your access. Check that your email is verified, then sign in again.”, and the answer is “not active”',
       not a['open'] and a['r'] is False and o['note'] == 'Pravix couldn’t start your access. Check that your email is verified, then sign in again.' and o['btn'] == 'Sign in' and not o['busy'] and o['red'], [a, o])
    a = await run(p, 'verify'); await p.click('.pvx-aa-box [data-v="0"]'); b = await after(p)
    o = await p.evaluate(OUT); await p.evaluate(DROP)
    ok('…opened already signed in (no card yet), the card that the sign-out shows carries the note', not b['open'] and b['r'] is False and o['card'] and o['note'] == 'Verify your email, then sign in again.' and o['info'], [b, o])
    a = await run(p, 'other')
    ok('…other accounts aren’t asked anything (unchanged)', not a['open'] and a['r'] is True, a)
    ok('…no browser pop-ups at any step, and no page errors', a['pop'] == 0 and not newerr(e), [a['pop'], newerr(e)])
    await c.close()

    c, p, e = await ctx(br, light=True)
    a = await run(p, 'verify')
    ok('Flow · light mode: the alert is light', a['open'] and a['light'], a)
    await c.close()

    c, p, e = await ctx(br, w=390, h=844)
    a = await run(p, 'verify')
    ok('Flow · iPhone: an action sheet at the bottom, full width less the margins, Send email above Cancel, 44 pt buttons',
       a['open'] and 0 <= a['bottom'] <= 24 and a['width'] >= 340 and a['order'] == ['Send email', 'Cancel'] and a['h'] >= 44, a)
    await c.close()

    for app in ('rounds', 'ultrasound'):
        c, p, e = await ctx(br, f'/{app}/')
        a = await run(p, 'verify')
        ok(f'{app.title()} · the same alert: named, described, Cancel and Send email with focus on Send email, no browser pop-up',
           a['open'] and a['role'] == 'alertdialog' and a['name'] == VERIFY and a['btns'] == ['Cancel', 'Send email'] and a['focus'] == 'Send email' and a['fs'] == 15 and a['pop'] == 0, a)
        await p.keyboard.press('Escape'); b = await after(p); await p.evaluate(DROP); await p.evaluate(CARD)
        a2 = await run(p, 'verify'); await p.keyboard.press('Enter'); b2 = await after(p); o = await p.evaluate(OUT)
        ok(f'…Esc cancels with no email sent; Send email sends it and the sign-in card says so with Sign in back; both answer “not active”; no page errors',
           not b['open'] and b['sent'] == 0 and b['r'] is False and not b2['open'] and b2['sent'] == 1 and b2['r'] is False and o['note'].startswith('Link sent to ') and o['btn'] == 'Sign in'
           and b2['pop'] == 0 and not newerr(e), [b, b2, o, newerr(e)])
        await c.close()
