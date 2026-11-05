"""Pravix — ro1's own checks: review-only accounts (Daniel, Nov 4 2026: Sarah Schiff and Mara Kraenzlin, Intern reviews
only). A staff_members record with role 'reviewer' opens Intern reviews and is shown the way there on every other page.
The rules themselves are checked in the emulator (security/sgvp-review-only.test.cjs). Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

RV = '{"uid":"rv1","email":"sarah.schiff@vca.com","displayName":"Sarah Schiff"}'
DR = '{"uid":"dr1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
APP = "(function w(){ if(window.firebase){ if(!firebase.app) firebase.app=function(){ return {options:{projectId:'shoreline-flow'}}; }; return; } setTimeout(w,20); })();"
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, user, role, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    for s in (INIT.replace('@@USER@@', user).replace('@@SEED@@', SEED), FAKE, WRAP, APP): await c.add_init_script(s)
    reads = []
    async def route(r):
        u = r.request.url
        if u.startswith('https://firestore.googleapis.com/'):
            reads.append(u.split('/documents/')[-1])
            if role is None: await r.fulfill(status=403, content_type='application/json', body='{"error":{"code":403}}')
            else: await r.fulfill(status=200, content_type='application/json', body=json.dumps({'fields': {
                'active': {'booleanValue': True}, 'tenant_id': {'stringValue': 'shoreline'}, 'role': {'stringValue': role}}}))
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    c._reads = reads
    return c


STATE = """()=>{const d=document.documentElement,b=document.querySelector('.pvx-scope-box');
  const vis=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
  const open=[...document.body.children].filter(c=>c!==b&&!/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(c.tagName)&&!c.hasAttribute('inert')&&vis(c)).length;
  return {ro:d.classList.contains('pvx-scope-ro'), box:!!b, title:b?b.querySelector('h1').textContent:'', text:b?b.querySelector('p').textContent:'',
    dialog:b?[b.getAttribute('role'),b.getAttribute('aria-modal'),b.getAttribute('aria-labelledby')]:null, focus:document.activeElement&&document.activeElement.id,
    go:b?b.querySelector('a').getAttribute('href'):'', open,
    navs:[...document.querySelectorAll('.nav-item, #pvxSubnav .seg')].filter(vis).map(a=>a.getAttribute('href'))};}"""


async def page(c, path):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}')
    try: await p.wait_for_function("window.pvxScope && window.pvxScope.role !== undefined && document.readyState==='complete'", timeout=6000)
    except Exception: pass
    await p.wait_for_timeout(1800)
    return p, e


@section(id='ro1', title='ro1 · review-only accounts: Intern reviews and nothing else', apps=['sgvp', 'rounds', 'flow', 'treatment', 'yakuri'], topics=['security', 'accounts', 'sgvp'], engines=('chromium', 'webkit'))
async def s_ro1(br):
    c = await ctx(br, RV, 'reviewer')
    p, e = await page(c, '/sgvp/assessment/'); s = await p.evaluate(STATE)
    ok('A reviewer opens Intern reviews: no card, and the top bar and sub-nav show only Assessments', s['ro'] and not s['box'] and s['navs'] == ['/sgvp/assessment/'], s)
    ok('…the page itself loads (My reviews)', await p.evaluate("/My reviews|No reviews assigned/.test(document.body.innerText)"), await p.evaluate("document.body.innerText.slice(0,300)"))
    ok('…her role comes from her own staff_members record', c._reads[:1] == ['staff_members/rv1'], c._reads)
    ok('no page errors', not newerr(e), e[:3]); await p.close()
    for path in ['/', '/rounds/', '/treatment/', '/sgvp/', '/yakuri/']:
        p, e = await page(c, path); s = await p.evaluate(STATE)
        ok(f'On {path} a reviewer sees one card: "Intern reviews only", her email, and the way to Intern reviews',
           s['box'] and s['title'] == 'Intern reviews only' and 'sarah.schiff@vca.com' in s['text'] and s['go'] == '/sgvp/assessment/', s)
        ok('…it is a modal dialog with focus on Open Intern reviews, and nothing behind it can be reached',
           s['dialog'] == ['dialog', 'true', 'pvxScopeT'] and s['focus'] == 'pvxScopeGo' and s['open'] == 0, s)
        await p.close()
    p, e = await page(c, '/rounds/')
    await p.click('#pvxScopeOut'); await p.wait_for_timeout(700)
    s = await p.evaluate(STATE); out = await p.evaluate("({user:!!firebase.auth().currentUser, hint:localStorage.getItem('pvx_scope_ro')})")
    ok('Log out signs her out and takes the card away', not s['box'] and not s['ro'] and not out['user'] and out['hint'] is None, [s, out])
    await c.close()

    for role, name in [('doctor', 'a doctor'), (None, 'an account with no record')]:
        c = await ctx(br, DR, role)
        for path in ['/sgvp/assessment/', '/rounds/']:
            p, e = await page(c, path); s = await p.evaluate(STATE)
            ok(f'For {name}, {path} is unchanged (no card, the whole top bar)', not s['ro'] and not s['box'] and len(s['navs']) > 3, s)
            await p.close()
        await c.close()
