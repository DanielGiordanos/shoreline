"""Pravix Rounds — the n272 build's own checks: Rounds says it's loading until Flow's first real answer (Daniel, Oct 29:
it said "No patients in Rounds" with 0 in every tile while still connecting). Chromium and WebKit."""
from core import ok, section, until, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
QLAG = """window.__qlag=@@LAG@@;(()=>{const t=setInterval(()=>{if(!window.firebase||!firebase.firestore)return;clearInterval(t);const db=firebase.firestore();const P=Object.getPrototypeOf(db.collection('visits'));
  /* Firestore with an empty local cache on a slow network: an empty answer "from cache" at once, the server's answer later */
  const g=P.get;P.get=function(){const r=g.apply(this,arguments);if(!/^visits/.test(this.n))return r;return new Promise(res=>setTimeout(()=>res(r),window.__qlag))};
  const o=P.onSnapshot;P.onSnapshot=function(cb,c2,c3){const fs=[cb,c2,c3].filter(x=>typeof x==='function');if(!/^visits/.test(this.n))return o.apply(this,arguments);const f=fs[0];let dead=false,ready=false,un=null;
    setTimeout(()=>{if(!dead&&!ready)f({docs:[],empty:true,size:0,forEach(){},docChanges(){return[]},metadata:{hasPendingWrites:false,fromCache:true}})},0);
    setTimeout(()=>{if(dead)return;ready=true;un=o.call(this,f,fs[1])},window.__qlag);return function(){dead=true;un&&un()}}},1)})()"""
ST = """(()=>{const l=document.getElementById('rdList'),ld=l&&l.querySelector('.rd-loading');const b=ld&&ld.querySelector('.beam'),base=ld&&ld.querySelector('.base'),sl=ld&&ld.querySelector('.rd-load-slow');
  return {load:!!ld,role:ld&&ld.getAttribute('role'),said:ld?(ld.querySelector('.rd-vh')||{}).textContent:null,label:ld?(ld.querySelector('.rd-load-l')||{}).innerText:null,
    empty:!!(l&&l.querySelector('.rd-emptystate')),sample:!!(l&&l.querySelector('[data-act=seed-demo]')),kpis:[...document.querySelectorAll('#rdKpis .rd-kpi .n')].map(n=>n.textContent),
    beam:b?getComputedStyle(b).display+'|'+getComputedStyle(b).animationName:null,base:base?getComputedStyle(base).animationName:null,slow:sl?+getComputedStyle(sl).opacity:null}})()"""


async def page(br, lag, rm=False):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', reduced_motion='reduce' if rm else 'no-preference')
    if lag: await c.add_init_script(QLAG.replace('@@LAG@@', str(lag)))
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached')
    return c, p, e
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]   # both from the fake Firestore


@section(id='t272', title='n272 · Pravix Rounds says it’s loading until Flow’s first answer', apps=['flow'], topics=['loading', 'rounds'], engines=('chromium', 'webkit'))
async def s_t272(br):
    c, p, e = await page(br, 13000)
    await p.evaluate("switchApp('rounds')"); await p.wait_for_timeout(1200)
    s1 = await p.evaluate(ST)
    ok('Rounds while Flow is still connecting (an empty answer from the local cache, the server slow): a heartbeat trace with LOADING, as a status VoiceOver reads as “Loading patients” — not “No patients in Rounds” (it said that, offered Load sample census and showed 0s)',
       s1['load'] and s1['role'] == 'status' and s1['said'] == 'Loading patients' and s1['label'] == 'LOADING' and not s1['empty'] and not s1['sample'], s1)
    ok('…the tiles show quiet placeholders, no counts', len(s1['kpis']) == 7 and all(k == '' for k in s1['kpis']), s1['kpis'])
    ok('…the trace sweeps (Reduce Motion off)', (s1['beam'] or '').endswith('rdEcgSweep'), s1['beam'])
    await p.wait_for_timeout(10200)
    s2 = await p.evaluate(ST)
    ok('…after 10 s, “Still loading — check the connection” shows', s2['load'] and s2['slow'] is not None and s2['slow'] > 0.9, s2)
    await until(p, "!document.querySelector('#rdList .rd-loading')", 6000); await p.wait_for_timeout(400)
    s3 = await p.evaluate(ST)
    ok('…and once the server answers, Rounds shows what is there (here, no patients yet: the empty state and 0s)', not s3['load'] and s3['empty'] and s3['kpis'] and all(k == '0' for k in s3['kpis']), s3)
    ok('no page errors (slow start)', not newerr(e), e[:2]); await c.close()

    c, p, e = await page(br, 13000, rm=True)
    await p.evaluate("switchApp('rounds')"); await p.wait_for_timeout(1200)
    s4 = await p.evaluate(ST)
    ok('With Reduce Motion the trace doesn’t sweep; it breathes', s4['load'] and s4['beam'] and s4['beam'].startswith('none') and s4['base'] == 'rdEcgFade', s4)
    await c.close()

    c, p, e = await page(br, 0)
    await p.wait_for_timeout(1500); await p.evaluate("switchApp('rounds')"); await p.wait_for_timeout(300)
    s5 = await p.evaluate(ST)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(600)
    rows = await p.evaluate("document.querySelectorAll('#rdList .rd-row').length")
    ok('With the answer already in, Rounds never shows the loading trace, and the sample census still loads', not s5['load'] and s5['empty'] and rows > 0, [s5, rows])
    ok('no page errors', not newerr(e), e[:2]); await c.close()
