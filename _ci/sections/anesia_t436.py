"""Anesia — the n436 build's own checks (Nov 25 2026): HIG Launching, Loading, Managing accounts.
A slow first answer from the database left the list (or a record opened from a link) on its placeholders with nothing said,
under a status that read "Saved"; an account the database refuses saw the placeholders for ever and "Not saved · no access"."""
from core import *
from helpers import *

DENY = """(()=>{ const t=setInterval(()=>{ if(!window.firebase||!firebase.firestore) return; clearInterval(t); const q=firebase.firestore().collection('x'); const P=Object.getPrototypeOf(q.where?q.where('a','==',1):q); const o=P.onSnapshot;
  P.onSnapshot=function(cb,err){ if(window.__deny){ setTimeout(()=>{ (typeof err==='function'?err:null) && err({code:'permission-denied', message:'Missing or insufficient permissions.'}); },60); return ()=>{}; } return o.apply(this,arguments); }; },1); })()"""
STATE = """(()=>{ const s=document.querySelector('.an-slow'), n=document.querySelector('.an-noaccess'), sv=document.querySelector('#anSave');
  return {slow:s?s.textContent:null, slowRole:s&&s.getAttribute('role'), noacc:n?n.innerText.replace(/\\s+/g,' '):null, noRole:n&&n.getAttribute('role'),
    other:!!document.querySelector('#anOther'), skel:document.querySelectorAll('.an-skel,.an-skelrec').length, cards:document.querySelectorAll('[data-open]').length,
    save:sv?sv.textContent:null, newBtn:!!document.querySelector('#anNew')}; })()"""


@section(id='a436', title='n436 · Anesia · Launching, Loading, Managing accounts: a slow first load says so and its status reads “Loading…”; an account without access is told why, with Sign in with another account',
         apps=['anesia'], topics=['loading', 'accounts', 'launching'], engines=('chromium', 'webkit'))
async def s_a436(br):
    errs = []
    # a slow first answer (10 s)
    ctx, pg, e = await new_page(br); await pg.add_init_script("window.__fsDelay=10000")
    await pg.goto(URL); await pg.wait_for_timeout(2000); early = await pg.evaluate(STATE)
    await pg.wait_for_timeout(5500); late = await pg.evaluate(STATE)
    await pg.wait_for_timeout(4500); done = await pg.evaluate(STATE)
    errs += list(e); await ctx.close()
    ok('Loading · after 6 s of waiting the list says it’s still loading, beside its placeholders (they were the only sign, however long it took)',
       early['slow'] is None and early['skel'] >= 3 and late['slow'] and late['slow'].startswith('Still loading.') and late['slowRole'] == 'status' and late['skel'] >= 3, [early, late])
    ok('…and once the records arrive the list replaces it all', done['slow'] is None and done['skel'] == 0 and done['cards'] >= 2, done)
    ok('…until they arrive the status says “Loading…”, not “Saved”; then “Saved”', early['save'] == 'Loading…' and done['save'] == 'Saved', [early['save'], done['save']])
    ctx, pg, e = await new_page(br); await pg.add_init_script("window.__fsDelay=10000")
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_timeout(7500); rl = await pg.evaluate(STATE)
    await pg.wait_for_timeout(4000); rd = await pg.evaluate("!!document.querySelector('.an-chart')")
    errs += list(e); await ctx.close()
    ok('…a record opened from a link says the same while it waits, then opens', rl['slow'] and rl['slow'].startswith('Still loading.') and rl['skel'] >= 1 and rd, [rl, rd])
    # an account the database refuses
    ctx, pg, e = await new_page(br); await pg.add_init_script("window.__deny=true"); await pg.add_init_script(DENY)
    await pg.goto(URL); await pg.wait_for_timeout(1500); dn = await pg.evaluate(STATE)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_timeout(1500); dr = await pg.evaluate(STATE)
    errs += list(e); await ctx.close()
    ok('Managing accounts · an account without access is told so, who can give it, and offered Sign in with another account (it saw placeholders for ever under “Not saved · no access”)',
       dn['noacc'] and dn['noacc'].startswith('This account can’t open Anesia’s records') and 'Shoreline staff' in dn['noacc'] and dn['noRole'] == 'alert' and dn['other'] and dn['skel'] == 0 and dn['save'] == 'No access', dn)
    ok('…New training record isn’t offered on it, and a record opened from a link says the same', not dn['newBtn'] and dr['noacc'] and dr['other'] and dr['skel'] == 0, [dn['newBtn'], dr])
    # the sign-in page, for the record
    ctx, pg, e = await new_page(br, user='null'); await pg.goto(URL); await pg.wait_for_timeout(1200)
    g = await pg.evaluate("[document.querySelector('.an-gate h1')?.innerText, document.querySelector('.an-gate a')?.innerText, document.querySelector('.an-gate a')?.getAttribute('href')]")
    errs += list(e); await ctx.close()
    ok('…signed out, it says why it needs an account and names the way in (“Sign in on Flow”), which comes back here', g[0] == 'Sign in to use Anesia' and g[1] == 'Sign in on Flow' and g[2].endswith('?next=%2Fanesia%2F'), g)
    ok('no page errors', not errs, errs)
