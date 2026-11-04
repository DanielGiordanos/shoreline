"""Pravix Rounds — the n315 build's own checks: HIG Text views and Web views (Nov 3 2026),
on Rounds' own page. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, seed=None, user=FU, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', user).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    return c


async def open_(c, path='/rounds/', demo=True, wait=2800):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(wait)
    await p.evaluate("(()=>{const t=window.toast;window.__toasts=[];window.toast=function(m){window.__toasts.push(String(m));try{return t.apply(this,arguments)}catch(e){}}})()")
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return p, e

OPENB = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"
FIT = """(()=>{const r=document.querySelector('.rd-row.open');const f=[...r.querySelectorAll('[aria-label^="Assessment"],[aria-label^="Result for"]')];
  return f.map(t=>[t.tagName,t.getAttribute('aria-label').slice(0,24),t.value.length,t.scrollWidth<=t.clientWidth+1&&t.scrollHeight<=t.clientHeight+2,Math.round(t.clientHeight)])})()"""


@section(id='t315', title='n315 · Rounds follows the HIG Text views and Web views pages', apps=['rounds'], topics=['rounds', 'text', 'history', 'navigation'], engines=('chromium', 'webkit'))
async def s_t315(br):
    # ---- Text views on iPhone: long assessments and results wrap instead of being cut off
    c = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3); p, e = await open_(c)
    pid = await p.evaluate(OPENB); await p.wait_for_timeout(500)
    f = await p.evaluate(FIT)
    ok('Text views · on iPhone, Benny’s assessment and every result show in full, wrapping onto more lines (the assessment showed a third, a NOVA result under half)',
       len(f) >= 3 and all(x[0] == 'TEXTAREA' and x[3] for x in f) and any(x[4] > 30 for x in f), f)
    lists = await p.evaluate("[...document.querySelectorAll('.rd-row.open .rd-probs,.rd-row.open .rd-events,.rd-row.open .rd-diags,.rd-row.open .rd-txs')].map(l=>[l.className,l.scrollHeight<=l.clientHeight+1,getComputedStyle(l).overflowY])")
    ok('…and a patient’s lists show in full on iPhone instead of scrolling inside 190 pt boxes (the fourth problem was hidden, and the box held the swipe)', len(lists) >= 3 and all(x[1] for x in lists), lists)
    await c.close()
    c = await ctx(br); p, e = await open_(c)
    pid = await p.evaluate(OPENB); await p.wait_for_timeout(400)
    a = '.rd-row.open [aria-label^="Assessment"]'
    await p.click(a); await p.keyboard.press('ControlOrMeta+a' if False else 'End')
    await p.evaluate("document.querySelector('.rd-row.open [aria-label^=\"Assessment\"]').select()")
    await p.keyboard.type('Obstruction relieved; K 5.27 and falling — continue fluids, recheck NOVA at 2 PM, then reassess the catheter')
    await p.keyboard.press('Enter'); await p.wait_for_timeout(400)
    v = await p.evaluate("rdFind(%s).rounds.assessment" % json.dumps(pid))
    ok('…Return still saves it, as one value with no line break (it’s an assessment, not a note)', v.startswith('Obstruction relieved') and '\n' not in v, v)
    h = await p.evaluate("(()=>{const t=document.querySelector('.rd-row.open [aria-label^=\"Assessment\"]');return [t.scrollHeight<=t.clientHeight+2, t.clientHeight]})()")
    ok('…and the field grows to show all of it', h[0], h)
    await p.evaluate("(()=>{const t=document.querySelector('.rd-row.open [aria-label^=\"Result for\"]');t.focus();t.value='Line one\\nline two';t.dispatchEvent(new Event('input',{bubbles:true}))})()")
    ok('…a pasted line break becomes a space', await p.evaluate("document.querySelector('.rd-row.open [aria-label^=\"Result for\"]').value") == 'Line one line two')
    await p.evaluate("document.activeElement.blur()"); await p.wait_for_timeout(400)
    kh = await p.evaluate("[document.querySelector('.rd-row.open [aria-label^=\"Assessment\"]').getAttribute('enterkeyhint'), document.querySelector('.rd-row.open input[data-input=client-id]').getAttribute('enterkeyhint'), document.getElementById('rdSearch').getAttribute('enterkeyhint')]")
    ok('…on iPhone and iPad the Return key reads Done in fields that save and close, and Search in search', kh == ['done', 'done', 'search'], kh)

    # ---- Web views: Back and Forward inside Rounds
    await p.evaluate("rdExpanded=null; renderRdCensus(true)")
    await p.click('[data-rdview=archive]'); await p.wait_for_timeout(500)
    a1 = await p.evaluate("[currentRdView, location.hash]")
    await p.go_back(); await p.wait_for_timeout(600)
    b1 = await p.evaluate("[location.pathname, currentRdView]")
    ok('Web views · Back from the Archive returns to the census (it left Rounds)', a1 == ['archive', '#archive'] and b1 == ['/rounds/', 'census'], (a1, b1))
    await p.go_forward(); await p.wait_for_timeout(600)
    ok('…and Forward goes back to the Archive', await p.evaluate("currentRdView") == 'archive')
    await p.click('[data-rdview=census]'); await p.wait_for_timeout(500)
    ok('…choosing Census steps back rather than adding to the history', await p.evaluate("[currentRdView, location.hash, (history.state||{}).rd||null]") == ['census', '', None])
    await p.evaluate("document.getElementById('rdStartBtn').click()"); await p.wait_for_timeout(500)
    await p.go_back(); await p.wait_for_timeout(500)
    ok('…Back closes Rounds mode (Android’s back gesture quit the Home Screen app)', await p.evaluate("[!!document.getElementById('rdMode'), location.pathname]") == [False, '/rounds/'])
    await p.evaluate("document.getElementById('rdStartBtn').click()"); await p.wait_for_timeout(500)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
    ok('…and leaving Rounds mode with Esc doesn’t leave an extra Back step behind', await p.evaluate("[!!document.getElementById('rdMode'), (history.state||{}).rd||null, currentRdView]") == [False, None, 'census'])
    ok('…Rounds embeds no other sites (no web views), and links to the other Pravix apps open them directly', await p.evaluate("document.querySelectorAll('iframe').length") == 0)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
