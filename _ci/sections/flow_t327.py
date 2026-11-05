"""Pravix Rounds — the n327 build's own checks: HIG Color wells, Combo boxes, Digit entry views (Nov 5 2026), on Rounds' own page.
Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
OPENB = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"
FIELD = "document.querySelector('#rdList .rd-row.open input[data-input=\"diag\"]')"


@section(id='t327', title='n327 · Rounds follows the HIG Color wells, Combo boxes and Digit entry views pages', apps=['rounds'], topics=['rounds', 'combo-boxes'], engines=('chromium', 'webkit'))
async def s_t327(br):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(2800)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    await p.evaluate(FIELD + ".focus(); 0"); await p.wait_for_timeout(300)
    d = await p.evaluate("""(()=>{const i=%s, dl=i.list; const names=rdCensus().flatMap(p=>((p.rounds||{}).diagnostics||[]).map(d=>d.name.toLowerCase()));
      const cnt={}; names.forEach(n=>cnt[n]=(cnt[n]||0)+1); const o=dl?[...dl.options].map(x=>x.value):[];
      return {list:i.getAttribute('list'), o, counts:o.map(v=>cnt[v.toLowerCase()]||0), lower:o.map(v=>v.toLowerCase())}})()""" % FIELD)
    ok('Combo boxes · “+ Add diagnostic” offers the tests already on the census (it was typed from scratch every time)', d['list'] == 'rdDiagList' and {'NOVA', 'CBC', 'UA'} <= set(d['o']), d)
    ok('…most used first, each test once (“Abdominal ultrasound” and “Abdominal Ultrasound” are one), and names only, never a result',
       d['counts'] == sorted(d['counts'], reverse=True) and len(set(d['lower'])) == len(d['lower']) and not any(' — ' in v or '(' in v and 'pending' in v for v in d['o']), d)
    await p.evaluate(FIELD + ".value='Lactate — 2.1'; 0")
    await p.evaluate("(()=>{const i=%s; i.focus(); })()" % FIELD); await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    a = await p.evaluate("(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); const d=x.rounds.diagnostics.find(d=>d.name==='Lactate'); return d?[d.status,d.result]:null})()")
    ok('…a test that isn’t on the list is still taken as typed, with its result', a == ['completed', '2.1'], a)
    l = await p.evaluate("(()=>{const r=document.querySelector('#rdList .rd-row.open'); return [r.querySelector('input[data-input=\"diag\"]').getAttribute('list'), r.querySelector('input[data-input=\"prob\"]').getAttribute('list'), r.querySelector('input[data-input=\"tx\"]').getAttribute('list')]})()")
    ok('…the list stays after the patient redraws; problems keep theirs; treatments get none (a suggestion would carry another patient’s dose)', l == ['rdDiagList', 'rdProbList', None], l)
    n = await p.evaluate("[document.querySelectorAll('input[type=color]').length, document.querySelectorAll('input[autocomplete=one-time-code]').length]")
    ok('Color wells and Digit entry views · Rounds has no colour choice and asks for no PIN or code', n == [0, 0], n)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
