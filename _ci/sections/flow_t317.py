"""Pravix Rounds — the n317 build's own checks: HIG Labels, Lists and tables, Lockups and Outline views (Nov 3 2026),
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

HEADS = "[...document.querySelectorAll('#rdList .rd-sechead[data-act]')].map(b=>b.getAttribute('aria-expanded')).join(',')"
AE = "(()=>{const a=document.activeElement; return [a.className, a.getAttribute('aria-expanded'), a.textContent.trim().replace(/\\s+/g,' ').slice(0,30)]})()"


@section(id='t317', title='n317 · Rounds follows the HIG Labels, Lists and tables, Lockups and Outline views pages', apps=['rounds'], topics=['rounds', 'labels', 'lists', 'outline'], engines=('chromium', 'webkit'))
async def s_t317(br):
    c = await ctx(br, color_scheme='light'); p, e = await open_(c)
    # ---- Lists and tables: section headers are level-2 headings that say what their number counts
    h = await p.evaluate("[...document.querySelectorAll('#rdList .rd-sechead[data-act]')].map(b=>{const x=b.closest('h2,[role=heading]');return [x&&(x.getAttribute('aria-level')||x.tagName), b.textContent.trim().replace(/\\s+/g,' ')]})")
    ok('Lists and tables · each census section header is a heading (level 2, above the boxes’ level 3) and reads “Neurology, 1 patient”, not “Neurology 1”',
       len(h) >= 4 and all(x[0] in ('H2', '2') and x[1].endswith(('patient', 'patients')) for x in h) and all(', ' in x[1] for x in h) and any(x[1].endswith(', 1 patient') for x in h), h)
    # ---- Labels: the row's money summary carries its amounts; holds keep full label colours after a redraw
    m = await p.evaluate("document.querySelector('#rdList .rd-finrow[role=button]').getAttribute('aria-label')")
    ok('Labels · a row’s money summary tells VoiceOver its labelled amounts (the button’s name hid them)', m and 'low end $' in m and 'high end $' in m and 'deposit ' in m and 'to low end ' in m, m)
    await p.evaluate("document.querySelector('#rdList .rd-row button[data-act=toggle]').click()"); await p.wait_for_timeout(700)
    op = await p.evaluate("[...document.querySelectorAll('#rdList .rd-row.rd-hold')].map(r=>getComputedStyle(r).opacity)")
    ok('…and Boarding & Holds rows keep full label colours after the census redraws (they dimmed to 82%, taking secondary text to 3.85:1)', op and all(x == '1' for x in op), op)
    t = await p.evaluate("(()=>{const h=[...document.querySelectorAll('#rdList .rd-row.open .rd-sec-h[role=heading]')].find(x=>/Authorization History/.test(x.textContent)); return h?(h.getAttribute('aria-label')||h.textContent.trim()):null})()")
    ok('…and a box title with a note beside it is named by its title alone', t in (None, 'Authorization History'), t)
    # ---- Outline views: keyboard
    await p.evaluate("rdExpanded=null; renderRdCensus(true); document.querySelector('#rdList .rd-sechead[data-act]').focus(); 0"); await p.wait_for_timeout(300)
    seq = []
    for k in ['ArrowDown', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowRight']:
        await p.keyboard.press(k); await p.wait_for_timeout(450); seq.append(await p.evaluate(AE))
    good = (seq[0][0].startswith('rd-name') and seq[0][1] == 'false' and seq[1][0].startswith('rd-name') and seq[1][1] == 'true'
            and seq[2][1] == 'false' and seq[3][0] == 'rd-sechead' and seq[3][1] == 'true' and seq[4][0] == 'rd-sechead' and seq[4][1] == 'false' and seq[5][1] == 'true')
    ok('Outline views · the census moves like an outline from the keyboard: ↓ to a patient, → opens it, ← closes it, ← again goes up to its section, ← closes the section, → opens it, keeping the focus throughout', good, seq)
    await p.keyboard.press('Alt+ArrowLeft'); await p.wait_for_timeout(450); a1 = await p.evaluate(HEADS); f1 = await p.evaluate(AE)
    await p.keyboard.press('Alt+ArrowRight'); await p.wait_for_timeout(450); a2 = await p.evaluate(HEADS)
    await p.locator('#rdList .rd-sechead[data-act]').nth(1).click(modifiers=['Alt']); await p.wait_for_timeout(450); a3 = await p.evaluate(HEADS)
    ok('…⌥← / ⌥→ and Option-click close or open every section at once, as in Finder', set(a1.split(',')) == {'false'} and f1[0] == 'rd-sechead' and set(a2.split(',')) == {'true'} and set(a3.split(',')) == {'false'}, (a1, f1, a2, a3))
    await p.locator('#rdList .rd-sechead[data-act]').nth(1).click(); await p.wait_for_timeout(450)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(450); fe = await p.evaluate(AE)
    ok('…and opening or closing a section with Return keeps the focus on it (it fell to the top of the page)', fe[0] == 'rd-sechead' and fe[1] == 'false', fe)
    sh = await p.evaluate("JSON.stringify(rdShortcutGroups())")
    ok('…listed in the ? sheet', 'Move between sections and patients' in sh and 'Close or open every section' in sh, sh[:200])
    # ---- Outline views: expansion choices kept on the device, cleared at Log out
    await p.evaluate("rdSetAllSections(true); sessionStorage.clear(); 0")
    await p.reload(); await p.wait_for_timeout(2800)
    kept = await p.evaluate("Object.keys(rdCollapse).filter(k=>rdCollapse[k]).length")
    ok('…people’s expansion choices are kept when Rounds is opened again (they were kept for the tab only)', kept >= 4, kept)
    await p.evaluate("rdSetAllSections(false); 0"); await p.wait_for_timeout(200)
    # ---- Lists and tables: the Archive's patients are a list with headings and labelled lines
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    await p.evaluate("switchRdView('archive')"); await p.wait_for_timeout(800)
    a = await p.evaluate("""(()=>{const c=document.querySelector('#rdArchiveBody .rd-arccards'); const cs=[...c.querySelectorAll('.rd-arccard')];
      return [c.getAttribute('role'), c.getAttribute('aria-label'), cs.length, cs.every(x=>x.getAttribute('role')==='listitem'), cs.every(x=>{const h=x.querySelector('[role=heading]');return h&&h.getAttribute('aria-level')==='2'}),
        cs[0]&&cs[0].querySelector('.pr')?cs[0].querySelector('.pr').textContent.slice(0,10):null, cs[0]?cs[0].querySelector('.rd-sr').getBoundingClientRect().width:null]})()""")
    ok('…and the Archive’s patients are a list: each name is a heading and its problems and treatments say what they are, for VoiceOver only (they were a run of text)',
       a[0] == 'list' and a[1].startswith('Patients, ') and a[2] >= 3 and a[3] and a[4] and a[5] == 'Problems: ' and a[6] <= 1, a)
    await p.evaluate("logout(); 0"); await p.wait_for_timeout(600)
    lg = await p.evaluate("localStorage.getItem(RD_COLLAPSE_KEY)")
    ok('…and the kept sections are forgotten at Log out', lg is None, lg)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
