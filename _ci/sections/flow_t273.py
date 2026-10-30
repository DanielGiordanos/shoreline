"""Pravix Rounds — the n273 build's own checks: Daniel's approved loading design, on real work (Oct 30). Chromium and WebKit.
The visits feed is simulated as a slow hospital network: an empty answer from the local cache at once, then each census
list from the server after its own delay; Flow's server reads wait, or fail."""
from core import ok, section, until, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
QSIM = """window.__qlag=@@LAG@@;window.__qget=@@GET@@;window.__qfail=false;window.__gets=0;window.__refetch=0;
(()=>{const t=setInterval(()=>{if(!window.firebase||!firebase.firestore)return;clearInterval(t);const db=firebase.firestore();const P=Object.getPrototypeOf(db.collection('visits'));
  const g=P.get;P.get=function(){if(!/^visits/.test(this.n))return g.apply(this,arguments);window.__gets++;const self=this,a=arguments;
    return new Promise((res,rej)=>setTimeout(()=>{if(window.__qfail)rej({code:'unavailable',message:'offline (simulated)'});else res(g.apply(self,a))},window.__qget))};
  let k=0;const o=P.onSnapshot;P.onSnapshot=function(cb,c2,c3){const fs=[cb,c2,c3].filter(x=>typeof x==='function');if(!/^visits/.test(this.n))return o.apply(this,arguments);const f=fs[0];let dead=false,un=null,mine=k++;
    setTimeout(()=>{if(!dead&&!un)f({docs:[],empty:true,size:0,forEach(){},docChanges(){return[]},metadata:{hasPendingWrites:false,fromCache:true}})},0);
    const lag=Array.isArray(window.__qlag)?window.__qlag[mine%window.__qlag.length]:window.__qlag;
    if(lag!=null)setTimeout(()=>{if(dead)return;un=o.call(this,f,fs[1])},lag);return function(){dead=true;un&&un()}}},1)})();
document.addEventListener('DOMContentLoaded',()=>{const w=setInterval(()=>{if(typeof Backend==='undefined'||!Backend.refetch)return;clearInterval(w);const r=Backend.refetch;Backend.refetch=function(){window.__refetch++;return r.apply(this,arguments)}},5)});"""

ST = """(()=>{const l=document.getElementById('rdList'),d=l&&l.querySelector('.rd-loading:not(.rd-ld-out)');const tr=d&&d.querySelector('.rd-ld-track'),b=d&&d.querySelector('.rd-ld-retry');
 return {st:d?d.dataset.state:null,task:d?d.querySelector('.rd-ld-task').textContent:null,pct:d?d.querySelector('.rd-ld-pct').textContent:null,role:tr&&tr.getAttribute('role'),now:tr&&tr.getAttribute('aria-valuenow'),
  ind:tr?tr.classList.contains('ind'):null,help:d?d.querySelector('.rd-ld-help').textContent:null,retry:b?!b.hidden:null,rh:b&&!b.hidden?Math.round(b.getBoundingClientRect().height):0,
  said:(document.getElementById('rdLoadLive')||{}).textContent||'',live:(document.getElementById('rdLoadLive')||{getAttribute(){return null}}).getAttribute('aria-live'),
  empty:!!(l&&l.querySelector('.rd-emptystate')),sample:!!(l&&l.querySelector('.rd-emptystate [data-act=seed-demo]')),
  kpis:[...document.querySelectorAll('#rdKpis .rd-kpi .n')].map(n=>n.textContent),ready:(()=>{const r=document.querySelector('#rdList .rd-ready');return r&&+getComputedStyle(r).opacity>0.5?r.textContent:''})(),
  fill:d?getComputedStyle(d.querySelector('.rd-ld-fill')).backgroundColor:null,shimmer:d?getComputedStyle(d.querySelector('.rd-ld-fill'),'::after').display:null,
  fillanim:d?getComputedStyle(d.querySelector('.rd-ld-fill')).animationName:null,runs:window.RdLoad?RdLoad.runs||0:0,
  foc:(document.activeElement||{}).className||'',w:d?Math.round(d.getBoundingClientRect().right):0,vw:innerWidth}})()"""


async def page(br, lag='null', get=60000, vp=(1440, 900), dark=True, rm=False):
    c = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light',
                             reduced_motion='reduce' if rm else 'no-preference', **(dict(has_touch=True, is_mobile=True) if vp[0] < 600 else {}))
    if not dark: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await c.add_init_script(QSIM.replace('@@LAG@@', str(lag)).replace('@@GET@@', str(get)))
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached')
    await p.evaluate("switchApp('rounds')")
    return c, p, e
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]   # both from the fake Firestore


@section(id='t273', title='n273 · Pravix Rounds loading (Daniel’s approved design) on real work', apps=['flow'], topics=['loading', 'rounds'], engines=('chromium', 'webkit'))
async def s_t273(br):
    # slow: the lists answer one by one; Flow's own server read comes last
    c, p, e = await page(br, '[1500,3000,4500]', 9500)
    await p.wait_for_timeout(500); s0 = await p.evaluate(ST)
    ok('Slow start: Rounds keeps its header, tiles and filters, and the list shows the loader — never “No patients in Rounds” or “Load sample census”, and no 0 in the tiles',
       s0['st'] is not None and not s0['empty'] and not s0['sample'] and len(s0['kpis']) == 7 and all(k == '' for k in s0['kpis']), s0)
    seen = []
    for i in range(24):
        s = await p.evaluate(ST)
        if s['st'] and (not seen or seen[-1][:2] != [s['task'], s['pct']]): seen.append([s['task'], s['pct'], s['now'], s['ind'], s['role']])
        if not s['st']: break
        await p.wait_for_timeout(300)
    pre = [x for x in seen if x[0] == 'Preparing rounds']
    cnt = [x for x in seen if x[1]]
    ok('…before the census can be counted it is indeterminate: no percentage, a progressbar with no value', pre and all(x[1] == '' and x[2] is None and x[3] and x[4] == 'progressbar' for x in pre), seen)
    ok('…then the percentage is the census lists actually answered (0 → 33 → 67 %), never invented, and the bar carries the same value',
       [x[1] for x in cnt][:3] == ['0%', '33%', '67%'] and all(x[2] == x[1][:-1] and not x[3] for x in cnt), seen)
    await until(p, "!document.querySelector('#rdList .rd-loading:not(.rd-ld-out)')", 8000); await p.wait_for_timeout(450)   # after the 0.22 s crossfade
    s1 = await p.evaluate(ST)
    ok('Once the census is in, the list appears (here, the census is empty: the empty state and real 0s), with a quiet “Census up to date” and a check; VoiceOver hears “Rounds ready”, politely',
       s1['empty'] and all(k == '0' for k in s1['kpis']) and 'Census up to date' in s1['ready'] and s1['said'].startswith('Rounds ready') and s1['live'] == 'polite', s1)
    await p.wait_for_timeout(6800)
    ok('…and the confirmation goes away by itself', (await p.evaluate(ST))['ready'] == '', '')
    ok('no page errors (slow)', not newerr(e), e[:2]); await c.close()

    # nothing answers: after 10 s it says so, with a working Try again (keyboard), which fails, then works
    c, p, e = await page(br, 'null', 60000)
    await p.wait_for_timeout(10800); s2 = await p.evaluate(ST)
    ok('Delayed: after 10 s “Taking longer than expected”, why, and Try again (44 pt)', s2['task'] == 'Taking longer than expected' and 'hasn’t responded' in s2['help'] and s2['retry'] and s2['rh'] >= 44, s2)
    await p.evaluate("window.__qfail=true;window.__qget=2500")
    await p.focus('#rdList .rd-ld-retry'); await p.keyboard.press('Enter'); await p.wait_for_timeout(100)
    await p.keyboard.press('Enter'); await p.keyboard.press('Space')   # pressed again while it's trying
    s3 = await p.evaluate(ST)
    await until(p, "(document.querySelector('#rdList .rd-loading')||{dataset:{}}).dataset.state==='failed'", 6000); s4 = await p.evaluate(ST)
    ok('Try again connects again for real, once at a time (pressed three times: one try), and says so', s3['st'] == 'retry' and s3['task'] == 'Connecting again' and s4['runs'] == 1, [s3, s4['runs']])
    ok('…a failed try says “Couldn’t load the census” and how to recover, keeps Try again, and keeps focus on it', s4['task'] == 'Couldn’t load the census' and 'Check the connection' in s4['help'] and s4['retry'] and 'rd-ld-retry' in s4['foc'], s4)
    await p.evaluate("window.__qfail=false;window.__qget=300")
    await p.keyboard.press('Space')
    await until(p, "!document.querySelector('#rdList .rd-loading:not(.rd-ld-out)')", 6000); await p.wait_for_timeout(200)
    s5 = await p.evaluate(ST)
    ok('…and the next try loads the census: the list appears and focus moves into it (it was on Try again)', s5['st'] is None and s5['empty'] and s5['foc'] and 'rd-ld-retry' not in s5['foc'] and s5['foc'] != 'dark app-rounds', s5)
    ok('no page errors (retry)', not newerr(e), e[:2]); await c.close()

    # normal: the census is already in, no loader at all
    c, p, e = await page(br, 0, 0)
    await p.wait_for_timeout(1500); s6 = await p.evaluate(ST)
    ok('Normal: with the answer already in, Rounds never shows the loader', s6['st'] is None and s6['empty'] and s6['said'] == '', s6); await c.close()

    # themes, narrow, reduced motion
    res = {}
    for nm, kw in [('dark', {}), ('light', dict(dark=False)), ('iphone', dict(vp=(390, 844))), ('rm', dict(rm=True))]:
        c, p, e = await page(br, '[1500,60000,60000]', 60000, **kw)
        await p.wait_for_timeout(5000); res[nm] = await p.evaluate(ST); await c.close()
    ok('One version in the current theme: Treatment’s cobalt #23439C in light, cyan #63CDDD in dark', res['light']['fill'] == 'rgb(35, 67, 156)' and res['dark']['fill'] == 'rgb(99, 205, 221)', [res['light']['fill'], res['dark']['fill']])
    ok('…a narrow shimmer on the bar; on a 390 pt iPhone the loader fits the screen', res['dark']['shimmer'] == 'block' and res['iphone']['st'] and res['iphone']['w'] <= res['iphone']['vw'], [res['dark']['shimmer'], res['iphone']['w'], res['iphone']['vw']])
    ok('…with Reduce Motion, no shimmer and nothing travels', res['rm']['st'] and res['rm']['shimmer'] == 'none' and res['rm']['fillanim'] in ('none', ''), res['rm'])
