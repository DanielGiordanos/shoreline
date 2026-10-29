"""Treatment Sheets — the n262 build's own checks: Treatment Sheets against HIG Loading, Managing accounts, Managing
notifications. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
import os, json
import tsh as h
from tsh import *
from core import ok, section, until, BUILD as SITE, PORT, ENGINE

DOC = '{"uid":"u7","email":"resident.a@vca.com","displayName":"Resident A"}'   # the training patients' doctor
KEY = 'temp_lim_20261023_d1_480'
MARK = {'status': 'completed', 'value': '106.5', 'min': 485, 'sched': 480, 'orderId': 'd1', 'by': 'RA'}
SENT = {'at': '2026-10-23T15:12:00.000Z', 'name': 'Tech B'}   # 8:12 AM in Los Angeles; the clock is pinned at 11 AM
# count the tones the page plays (the alert tone is an oscillator)
TONES = """(()=>{window.__tones=[];const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const P=A.prototype.createOscillator;
  A.prototype.createOscillator=function(){const o=P.call(this);const f=o.start.bind(o);o.start=function(){window.__tones.push(o.frequency.value);return f.apply(this,arguments)};return o}})()"""
BANNER = "(()=>{const n=document.getElementById('tsDocAlert');return n?[n.className,n.getAttribute('role'),n.innerText.replace(/\\n+/g,' | ')]:null})()"


@section(id='t262', title='n262 · Treatment Sheets against HIG Loading, Managing accounts, Managing notifications',
         apps=['treatment'], topics=['notifications', 'sign-in', 'feedback'], engines=('chromium', 'webkit'))
async def s_t262(br):
    # ── Managing notifications 1. the alert says when it happened ──
    ctx, pg, e = await ts(br, PORT, view='dash', user=DOC, init=TONES)
    await pg.evaluate("""(async()=>{await firebase.firestore().collection('sheets').doc('sh_train1').update({'marks.20261023_d1_480':%s,'flag_notify.%s':%s});return 1})()""" % (json.dumps(MARK), KEY, json.dumps(SENT)))
    await until(pg, "!!document.getElementById('tsDocAlert')", 4000)
    bn = await pg.evaluate(BANNER); tn = await pg.evaluate("window.__tones||[]")
    ok('Notifications: a doctor’s alert says when the reading was charted and when it was sent — “charted 8:05 AM · sent 8:12 AM from Tech B” (it showed the time now, 11:00 AM)',
       bn and 'charted 8:05 AM · sent 8:12 AM from Tech B' in bn[2] and '11:00 AM' not in bn[2], bn)
    ok('Notifications: a new critical alert still sounds and is announced as an alert', bn and 'crit' in bn[0] and bn[1] == 'alert' and 880 in tn, [bn, tn])
    ok('no page errors (new alert)', not e, e[:2]); await ctx.close()

    # ── 2. reopening Treatment: alerts already seen don't sound again ──
    S = json.loads(h.SEED); sh = S['sheets/sh_train1']
    sh.setdefault('marks', {})['20261023_d1_480'] = MARK; sh.setdefault('flag_notify', {})[KEY] = SENT
    seed = json.dumps(S)
    SEEN = "localStorage.setItem('tsSeenFlags',JSON.stringify({'sh_train1|%s|n%s':Date.now()}));" % (KEY, SENT['at'])
    res = {}
    for nm, init in [('seen', SEEN + TONES), ('new', "localStorage.removeItem('tsSeenFlags');" + TONES)]:
        ctx, pg, e = await ts(br, PORT, view='dash', user=DOC, sheet=None, init=init, seed=seed)
        await until(pg, "!!document.getElementById('tsDocAlert')", 4000)
        res[nm] = [await pg.evaluate(BANNER), await pg.evaluate("window.__tones||[]")]
        if e: res[nm].append(e[:2])
        await ctx.close()
    ok('Notifications: reopening Treatment shows the open alerts again but doesn’t sound for ones already seen (it chimed every time)',
       res['seen'][0] and 'Open to review' in res['seen'][0][2] and not res['seen'][1], res['seen'])
    ok('Notifications: on reopening, an alert not seen before still sounds', res['new'][0] and 880 in res['new'][1], res['new'])

    # ── Managing accounts 3. a turned-off account says what to do ──
    src = open(os.path.join(SITE, 'treatment', 'index.html'), encoding='utf-8').read()
    ok('Accounts: a turned-off account says what to do — “Ask an admin to turn it back on.” (read from the sign-in code; Firebase gives that answer only for a real turned-off account)',
       "'This account is turned off. Ask an admin to turn it back on.'" in src, '')
    ctx, pg, e = await ts(br, PORT, view=None, sheet=None, user='null', wait=3000)
    card = await pg.evaluate("(()=>{const c=document.querySelector('#sbLogin');return c?c.innerText:''})()")
    ok('Accounts: signed out, Treatment says who it’s for and how to sign in (“Hospital staff only. Sign in with your own account.”)',
       'Hospital staff only. Sign in with your own account.' in card and 'Sign in' in card and 'passcode' not in card.lower(), card[:200])
    ok('no page errors (sign-in)', not e, e[:2]); await ctx.close()
