"""SGVP intern reviews — the asm1 build's own checks (Nov 13 2026). Dr. Schiff found ratings missing from a submitted review:
a double-click or double-tap on a rating set it and cleared it again, and Submit locked the review without waiting for
unsaved changes. Checks: a quick second click or tap keeps the rating; a deliberate later click still clears it (with Undo);
a failed save retries by itself and says "Not saved yet"; Submit never locks with anything unsaved and locks what's on
the screen; a review started on another device (this device's cache says it doesn't exist) keeps both copies; long-polling
auto-detect is on."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, ENGINE

EM = 'sarah.schiff@vca.com'
AID = 'r1__sarah-herron__' + EM
PATH = 'sgvp_reviews/' + AID
ROUND = {'name': 'Mid-year review · July group', 'kind': 'mid', 'period': 'Jul–Dec 2026', 'year': 2026, 'interns': ['sarah-herron'], 'status': 'open'}
ASSIGN = {'round': 'r1', 'intern': 'sarah-herron', 'email': EM, 'evaluator_name': 'Sarah Schiff, DVM', 'record_id': 'SGVP-2026-0004-REV-01'}
RV = json.dumps({"uid": "rv1", "email": EM, "displayName": "Sarah Schiff"})
APP = "(function w(){ if(window.firebase){ if(!firebase.app) firebase.app=function(){ return {options:{projectId:'shoreline-flow'}}; }; return; } setTimeout(w,20); })();"
# what the real database does that the fake doesn't: the rules refuse creating a review that already exists; plus
# switches for a failing connection (__failUpd) and a stale cached copy that says the review doesn't exist (__staleMiss)
HOOKS = """(function(){ var db=firebase.firestore(), P=Object.getPrototypeOf(db.doc('x/y')), set0=P.set, upd0=P.update, get0=P.get, snap0=P.onSnapshot;
  window.__settings=[]; db.settings=function(o){ window.__settings.push(o); };
  P.update=function(d){ if(window.__failUpd && this.path.indexOf('sgvp_reviews/')===0 && Object.keys(d).some(function(k){ return /^answers\\./.test(k); })) return Promise.reject({code:'unavailable'}); return upd0.apply(this,arguments); };
  P.set=function(d,o){ if(this.path.indexOf('sgvp_reviews/')===0 && window.__fs[this.path] && !(o&&o.merge)) return Promise.reject({code:'permission-denied'}); return set0.apply(this,arguments); };
  P.get=function(opt){ if(window.__staleMiss===this.path && !(opt&&opt.source==='server')){ var id=this.id; return Promise.resolve({exists:false,id:id,data:function(){ return undefined; },metadata:{fromCache:true}}); } return get0.apply(this,arguments); };
  P.onSnapshot=function(cb,c2){ if(window.__staleMiss===this.path) return function(){}; return snap0.apply(this,arguments); };
})();"""

Q = """((qi)=>{ const g=document.querySelectorAll('.a-q')[qi], B=[...g.querySelectorAll('.a-score')];
  return {key:B[0].dataset.key, q:B[0].dataset.q, scores:B.map(b=>b.dataset.score), checked:B.findIndex(b=>b.getAttribute('aria-checked')==='true')}; })"""
DB = "(()=>JSON.stringify((window.__fs['" + PATH + "']||{})))()"
NOTE = "(()=>{ const n=document.querySelector('.a-note'); return n?n.textContent:''; })()"


async def ctx(br, seed_review=None, stale=False):
    touch = ENGINE == 'webkit'
    seed = {'sgvp_review_rounds/r1': ROUND, 'sgvp_review_assign/' + AID: ASSIGN}
    if seed_review: seed[PATH] = seed_review
    o = dict(viewport={'width': 820, 'height': 1180}, has_touch=True, is_mobile=True) if touch else dict(viewport={'width': 1440, 'height': 900})
    c = await br.new_context(timezone_id='America/Los_Angeles', locale='en-US', **o)
    for s in (INIT.replace('@@USER@@', RV).replace('@@SEED@@', json.dumps(seed)), FAKE, WRAP, APP, HOOKS,
              "window.__staleMiss=%s;" % (json.dumps(PATH) if stale else 'null')):
        await c.add_init_script(s)
    async def route(r):
        u = r.request.url
        if u.startswith('https://firestore.googleapis.com/'):
            await r.fulfill(status=200, content_type='application/json', body=json.dumps({'fields': {'active': {'booleanValue': True}, 'tenant_id': {'stringValue': 'shoreline'}, 'role': {'stringValue': 'reviewer'}}}))
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)[:200]))
    await p.goto(f'http://127.0.0.1:{PORT}/sgvp/assessment/#review/' + AID)
    await p.wait_for_selector('.a-q .a-score', timeout=15000); await p.wait_for_timeout(800)
    return c, p, e, touch


async def at(p, qi, si):
    return await p.evaluate("""(([qi,si])=>{ const b=document.querySelectorAll('.a-q')[qi].querySelectorAll('.a-score')[si]; b.scrollIntoView({block:'center'});
      const r=b.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]; })""", [qi, si])


async def press(p, touch, qi, si, twice_ms=None):
    x, y = await at(p, qi, si)
    if touch:
        await p.touchscreen.tap(x, y)
        if twice_ms is not None: await p.wait_for_timeout(twice_ms); await p.touchscreen.tap(x, y)
    elif twice_ms is not None: await p.mouse.dblclick(x, y)
    else: await p.mouse.click(x, y)


async def until(p, js, ms=8000):
    for _ in range(ms // 250):
        if await p.evaluate(js): return True
        await p.wait_for_timeout(250)
    return False


@section(id='asm1', title='asm1 · intern reviews: a double-click or double-tap keeps the rating; Submit never locks with anything unsaved; a review started elsewhere keeps both copies',
         apps=['sgvp'], topics=['behaviour', 'saving'], engines=('chromium', 'webkit'))
async def s_asm1(br):
    how = 'two quick taps (iPad)' if ENGINE == 'webkit' else 'a double-click (Mac)'
    c, p, e, touch = await ctx(br)
    st = await p.evaluate("window.__settings")
    ok('Firestore auto-detects long-polling (Safari and filtering proxies), as Flow does', any(x.get('experimentalAutoDetectLongPolling') for x in st), st)

    # 1. a double-click or double-tap keeps the rating
    q0 = await p.evaluate(f"({Q})(0)"); key, S = q0['key'], q0['scores']
    await press(p, touch, 0, 2, twice_ms=250); await p.wait_for_timeout(1600)
    a = await p.evaluate(f"({Q})(0)"); d = json.loads(await p.evaluate(DB))
    ok(f'{how} on a rating keeps it chosen, and it is saved (before, the second one cleared it and the item stayed blank)',
       a['checked'] == 2 and (d.get('answers') or {}).get(key, {}).get(q0['q']) == S[2], [a, d.get('answers')])
    await press(p, touch, 0, 4, twice_ms=250); await p.wait_for_timeout(1600)
    a = await p.evaluate(f"({Q})(0)"); d = json.loads(await p.evaluate(DB))
    ok('…the same on a different rating while one is chosen: the new one is kept', a['checked'] == 4 and d['answers'][key][q0['q']] == S[4], [a, d.get('answers')])
    # a deliberate later click still clears, with Undo
    await p.wait_for_timeout(800)   # past the 2-second window in which quick changes to one rating are one Undo step
    await press(p, touch, 0, 4); await p.wait_for_timeout(300); n = await p.evaluate(NOTE); await p.wait_for_timeout(1300)
    a = await p.evaluate(f"({Q})(0)"); d = json.loads(await p.evaluate(DB))
    ok('…a deliberate click on the chosen rating later still clears it, with “Rating cleared · Undo”',
       a['checked'] == -1 and q0['q'] not in (d['answers'].get(key) or {}) and 'Rating cleared' in n and 'Undo' in n, [a, d.get('answers'), n])
    await press(p, touch, 0, 2); await p.wait_for_timeout(1600)
    a = await p.evaluate(f"({Q})(0)")
    ok('…and a single click chooses it again', a['checked'] == 2, a)

    # 2. a failing save: retries by itself, says so, and Submit won't lock
    await p.evaluate("window.__failUpd=true")
    q1 = await p.evaluate(f"({Q})(1)")
    await press(p, touch, 1, 3); await p.wait_for_timeout(1500)
    n = await p.evaluate(NOTE)
    ok('A save that fails says “Not saved yet” and that the page keeps trying (before, only the next change retried it)', 'Not saved yet' in n and 'keeps trying' in n, n)
    await p.evaluate("document.querySelector('[data-act=submit]').click()"); await p.wait_for_selector('[data-ok]'); await p.wait_for_timeout(400)
    await p.evaluate("document.querySelector('[data-ok]').click()")
    await until(p, "!!document.querySelector('.a-note') && /submitted/.test(document.querySelector('.a-note').textContent)", 12000)
    d = json.loads(await p.evaluate(DB)); n = await p.evaluate(NOTE)
    ok('Submit with a change that can’t save: the review is not submitted and stays a draft, and it says so (before, it locked without it)',
       d.get('status') == 'draft' and 'wasn’t submitted' in n and 'still a draft' in n and q1['q'] not in (d['answers'].get(key) or {}), [d.get('status'), n, d.get('answers')])
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("window.__failUpd=false")
    saved = await until(p, "(()=>{ const d=window.__fs['" + PATH + "']; return !!(d&&d.answers&&d.answers['" + key + "']&&d.answers['" + key + "']['" + q1['q'] + "']==='" + S[3] + "'); })()", 9000)
    ok('…when the connection is back, the waiting change saves by itself within a few seconds', saved, await p.evaluate(DB))
    await p.evaluate("document.querySelector('[data-act=submit]').click()"); await p.wait_for_selector('[data-ok]'); await p.wait_for_timeout(400)
    await p.evaluate("document.querySelector('[data-ok]').click()")
    await until(p, "!!document.querySelector('.a-lock')", 8000)
    d = json.loads(await p.evaluate(DB)); scr = [await p.evaluate(f"({Q})(0)"), await p.evaluate(f"({Q})(1)")]
    ok('…then Submit locks it with exactly the ratings on the screen', d.get('status') == 'submitted' and d['answers'][key] == {q0['q']: S[2], q1['q']: S[3]}
       and [x['checked'] for x in scr] == [2, 3] and await p.evaluate("!!document.querySelector('.a-lock')"), [d.get('status'), d.get('answers'), scr])
    ok('…no page errors', not e, e)
    await c.close()

    # 3. started on another device; this device's cached copy says the review doesn't exist yet
    seed = dict(ASSIGN, uid='rv1', status='draft', answers={key: {'1': S[1]}}, notes={}, observations={}, progress={'rated': 1, 'total': 60})
    c, p, e, touch = await ctx(br, seed_review=seed, stale=True)
    await press(p, touch, 0, 3); await p.wait_for_timeout(2500)
    d = json.loads(await p.evaluate(DB)); n = await p.evaluate(NOTE); scr = [await p.evaluate(f"({Q})(0)"), await p.evaluate(f"({Q})(1)")]
    ok('A review started on another device (stale cache here): the first rating still saves and both copies are kept (before, every save was refused)',
       d['answers'][key] == {'0': S[3], '1': S[1]} and d.get('status') == 'draft' and 'didn’t save' not in n and [x['checked'] for x in scr] == [3, 1], [d.get('answers'), n, scr])
    await press(p, touch, 1, 4); await p.wait_for_timeout(1600)
    d = json.loads(await p.evaluate(DB))
    ok('…and later ratings save as usual', d['answers'][key] == {'0': S[3], '1': S[4]}, d.get('answers'))
    ok('…no page errors (stale cache)', not e, e)
    await c.close()
