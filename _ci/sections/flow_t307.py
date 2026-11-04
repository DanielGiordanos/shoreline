"""Pravix Rounds — the n307 build's own checks: HIG Materials, Motion, Privacy and SF Symbols (Nov 2 2026), on Rounds' own page.
Privacy is what changed (who Rounds says you are, and whose "Rounding as" choice it remembers); Materials, Motion and the symbols
already followed the pages and are held here so they keep doing so. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

KEY = 'pravix:shoreline:rounds:actor:v1'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def page(br, user=('u1', 'rounds.tester@vca.com', 'Rounds Tester'), store=None, vp=(1440, 900), motion=None, seed=True):
    kw = dict(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if motion: kw['reduced_motion'] = motion
    c = await br.new_context(**kw)
    fu = json.dumps({'uid': user[0], 'email': user[1], 'displayName': user[2]})
    await c.add_init_script(INIT.replace('@@USER@@', fu).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    if store is not None:
        await c.add_init_script("try{localStorage.setItem(%s,%s)}catch(e){}" % (json.dumps(KEY), json.dumps(store)))
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_selector('#subnavRd', state='attached'); await p.wait_for_timeout(2600)
    if seed: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1200)
    return c, p, e



@section(id='t307', title='n307 · Rounds follows the HIG Materials, Motion, Privacy and SF Symbols pages',
         apps=['rounds'], topics=['rounds', 'privacy', 'motion', 'design'], engines=('chromium', 'webkit'))
async def s_t307(br):
    # ---- Privacy · who Rounds says you are
    src = open(__import__('core').BUILD + '/rounds/app.js', encoding='utf-8').read()
    ok('Privacy · Rounds doesn’t start out as anyone (it began as “Daniel Giordano” until sign-in finished)', "let CURRENT_USER='Daniel Giordano'" not in src and "let CURRENT_USER=''" in src)
    c, p, e = await page(br)
    r = await p.evaluate("[rdActorId,rdActorName(),!!document.getElementById('rdActor')]")
    ok('…once signed in, Rounds signs edits with the person signed in (it kept saying Daniel Giordano), and there’s no “Rounding as” to choose (n320)', r == [None, 'Rounds Tester', False], r)
    await c.close()
    # n320: a doctor's account rounds as that doctor, with nothing to choose
    c, p, e = await page(br, user=('u3', 'sarah.schiff@vca.com', 'Sarah Schiff'), seed=False)
    r = await p.evaluate("[rdActorId,rdActorName()]")
    ok('…a doctor who signs in rounds as that doctor, with nothing to choose (n320)', r == ['sarah-schiff', 'Dr. Schiff'], r)
    await c.close()
    saved = json.dumps({'id': 'sarah-schiff', 'uid': 'u1'})
    c, p, e = await page(br, user=('u2', 'other.doctor@vca.com', 'Other Doctor'), store=saved, seed=False)
    r = await p.evaluate("[rdActorName(),rdActorId,localStorage.getItem(%s)]" % json.dumps(KEY))
    ok('…someone else signing in on that computer never rounds as a doctor saved there before (their edits would have been signed with that doctor’s name)', r == ['Other Doctor', None, None], r)
    await c.close()
    c, p, e = await page(br, store='sarah-schiff', seed=False)
    r = await p.evaluate("[rdActorName(),rdActorId]")
    ok('…a choice saved before n307 (no owner) is set aside', r == ['Rounds Tester', None], r)
    ok('no page errors (signing in)', not newerr(e), e[:3]); await c.close()

    # ---- Materials · Pravix is flat: no blur in the content layer; the census, a patient and Rounds mode are opaque
    c, p, e = await page(br)
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(700)
    blur = await p.evaluate("""[...document.querySelectorAll('#subnavRd *,#view-rd-census *,#rdList *')].filter(e=>{const c=getComputedStyle(e);const b=c.backdropFilter||c.webkitBackdropFilter;return e.getClientRects().length&&b&&b!=='none'&&!/unset/.test(b)}).map(e=>e.className).slice(0,5)""")
    ok('Materials · no blur or glass in Rounds’ content (census, rows, an open patient)', blur == [], blur)
    rt = await p.evaluate("""(()=>{let n=0;for(const s of document.styleSheets){let r;try{r=s.cssRules}catch(e){continue}for(const x of r){if(x.media&&/reduced-transparency/.test(x.media.mediaText)&&/toast|#fvToast|flowNet/.test(x.cssText))n++}}return n})()""")
    ok('…the floating glass (the toast, the connection pill) turns solid with Reduce Transparency', rt >= 1, rt)

    # ---- Motion · nothing moves on frequent actions; no endless motion; one brief animation to open a patient
    mv = await p.evaluate("""(async()=>{const run=()=>document.getAnimations().filter(a=>a.playState==='running').map(a=>(a.effect&&a.effect.target&&a.effect.target.className)+':'+(a.animationName||a.transitionProperty));
      const out={};const s=t=>new Promise(r=>setTimeout(r,t));
      for(let i=0;i<40&&run().length;i++)await s(100);   /* let the loader finish fading first */
      document.querySelector('#rdKpis .rd-kpi.red').click();await s(60);out.kpi=run();await s(500);document.querySelector('#rdKpis .rd-kpi.red').click();await s(500);
      const f=document.querySelectorAll('[data-act=svc-filter]')[2];f&&f.click();await s(60);out.filter=run();await s(500);
      document.querySelector('[data-act=svc-filter][data-key=all]').click();await s(800);
      out.infinite=document.getAnimations().filter(a=>a.effect&&a.effect.getTiming().iterations===Infinity).length;return out})()""")
    ok('Motion · filtering the census (a KPI tile, a service) moves nothing — motion stays off frequent actions', mv['kpi'] == [] and mv['filter'] == [], mv)
    ok('…and nothing in Rounds moves endlessly', mv['infinite'] == 0, mv['infinite'])
    ok('no page errors (materials, motion)', not newerr(e), e[:3]); await c.close()

    c, p, e = await page(br, motion='reduce')
    rm = await p.evaluate("""(async()=>{let beh=null;const o=Element.prototype.scrollIntoView;const so=window.scrollTo;
      document.querySelectorAll('#rdList .rd-row').forEach(r=>{});
      const last=[...document.querySelectorAll('#rdList .rd-row .rd-name')].pop();
      const row=last.closest('.rd-row');const spy=HTMLElement.prototype.scrollIntoView;
      last.click();await new Promise(r=>setTimeout(r,80));
      const anim=document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().duration>20).length;
      return {anim,smooth:getComputedStyle(document.documentElement).scrollBehavior,rm:window.pvxReducedMotion&&pvxReducedMotion()}})()""")
    ok('…with Reduce Motion, opening a patient doesn’t animate, and Rounds’ scripted scrolling knows to jump instead of glide (PVX-N188)', rm['anim'] == 0 and rm['rm'] is True, rm)
    ok('no page errors (Reduce Motion)', not newerr(e), e[:3]); await c.close()

    # ---- SF Symbols · Rounds' own symbols behave like SF Symbols: centred on the text's cap height, weight following the text, hidden from VoiceOver or named
    c, p, e = await page(br)
    sy = await p.evaluate("""(()=>{const o=[];document.querySelectorAll('#subnavRd button svg,#view-rd-census .rd-eyebrow svg,#rdDisplayBtn svg').forEach(s=>{if(!s.getClientRects().length)return;
      const h=s.closest('button,.rd-eyebrow');const tw=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let t;while(t=tw.nextNode()){if(t.textContent.trim()&&!s.contains(t))break}if(!t)return;
      const g=document.createRange();g.selectNodeContents(t);const rr=g.getClientRects()[0],r=s.getBoundingClientRect();const cs=getComputedStyle(t.parentElement);
      const p=s.querySelector('path,line,polyline,circle,rect');const sw=parseFloat(getComputedStyle(p).strokeWidth)*r.width/24;
      o.push({t:t.textContent.trim().slice(0,12),off:Math.abs((r.top+r.height/2)-(rr.top+rr.height/2)),fw:+cs.fontWeight,k:sw/parseFloat(cs.fontSize),hidden:s.getAttribute('aria-hidden')==='true'})});return o})()""")
    ok('SF Symbols · symbols beside text sit on the text’s cap height (within 1 pt) and are hidden from VoiceOver (the text names the control)', sy and all(x['off'] <= 1 and x['hidden'] for x in sy), sy)
    hv = sorted(sy, key=lambda x: x['fw'])
    ok('…and their line weight follows the text’s weight (bolder labels get heavier symbols)', hv[-1]['k'] > hv[0]['k'], [(x['t'], x['fw'], round(x['k'], 3)) for x in hv])
    nm = await p.evaluate("""[...document.querySelectorAll('#view-rd-census button')].filter(b=>b.getClientRects().length&&b.querySelector('svg')&&!b.textContent.trim()&&!(b.getAttribute('aria-label')||b.getAttribute('title'))).length""")
    ok('…every symbol-only button has a name', nm == 0, nm)
    ok('no page errors (symbols)', not newerr(e), e[:3]); await c.close()
