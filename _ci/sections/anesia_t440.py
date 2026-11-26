"""Anesia — the n440 build's own checks (Nov 25 2026): HIG Searching, Settings, Undo and redo.
The list had no search, though records stay in it for good; after one Undo the message only offered Redo, so on a touch
screen only the last change could be taken back; the shortcut list left out ⌥N."""
import json, copy
from core import *
from helpers import *

def many_records(SEED):
    s = json.loads(SEED); base = {k: v for k, v in s.items() if k.startswith('anesia_records/')}
    src = [base['anesia_records/an_train1'], base['anesia_records/an_train2']]
    names = [('Training dog 11','Dog','Beagle','Dental cleaning','signed'),('Training cat 5','Cat','DSH','Neuter','signed'),('Training dog 12','Dog','Boxer','Mass removal','signed'),
             ('Training cat 6','Cat','Maine Coon','Spay','signed'),('Training dog 13','Dog','Poodle','TPLO, left','ended'),('Training dog 14','Dog','Greyhound','Gastropexy','signed'),('Training cat 7','Cat','Siamese','Dental, extractions','signed')]
    for i, (n, sp, br, pr, st) in enumerate(names):
        r = copy.deepcopy(src[1]); rid = 'an_more%d' % i; r['id'] = rid
        r['patient']['name'] = n; r['patient']['species'] = sp.lower(); r['patient']['breed'] = br; r['procedure'] = pr; r['status'] = st
        if st == 'signed': r['signed'] = {'at': r.get('end') or r.get('start'), 'by': 'Resident A'}
        for k in ('start', 'end', 'created_at'):
            if r.get(k): r[k] = r[k] - (i + 1) * 86400000
        s['anesia_records/' + rid] = r
    return json.dumps(s)

async def list_page(br):
    ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', many_records(SEED)))
    await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda x: errs.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    return ctx, pg, errs

NAMES = "[...document.querySelectorAll('[data-open] b')].map(b=>b.innerText)"
TOAST = "(()=>{const t=document.querySelector('#anToast');return t?[t.innerText.replace(/\\s+/g,' ').trim(),[...t.querySelectorAll('.an-tbtn')].map(b=>b.id+':'+b.innerText.trim())]:null})()"


@section(id='a440', title='n440 · Anesia · Searching, Settings, Undo and redo: a search field on a long list, scoped to its tab; Undo more than once on a touch screen; ⌥N and / in the shortcut list',
         apps=['anesia'], topics=['search', 'undo'], engines=('chromium', 'webkit'))
async def s_a440(br):
    errs = []
    # a short list has no search field
    ctx, pg, e = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    short = await pg.evaluate("!!document.querySelector('#anFind')")
    errs += list(e); await ctx.close()
    ctx, pg, e = await list_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(500)
    await pg.click('[data-f=signed]'); await pg.wait_for_timeout(400)
    f = await pg.evaluate("(()=>{const i=document.querySelector('#anFind');return i?[i.placeholder,i.getAttribute('aria-label'),i.type,!!i.closest('[role=search]')]:null})()")
    ok('Searching · a list of 7 records or more has a search field that names what it searches (“Search signed records”); a short list has none',
       not short and f and f[0] == 'Search signed records' and f[1] == 'Search signed records' and f[2] == 'search' and f[3], [short, f])
    await pg.keyboard.press('/'); await pg.keyboard.type('cat'); await pg.wait_for_timeout(400)
    a = await pg.evaluate("[document.activeElement && document.activeElement.id, " + NAMES + "]")
    await pg.keyboard.type(' dental'); await pg.wait_for_timeout(400); b = await pg.evaluate(NAMES)
    ok('…/ goes to it, and it filters as you type, every word counting (name, species, procedure…)', a[0] == 'anFind' and a[1] == ['Training cat 5', 'Training cat 6', 'Training cat 7'] and b == ['Training cat 7'], [a, b])
    await pg.fill('#anFind', 'tplo'); await pg.wait_for_timeout(400)
    n = await pg.evaluate("[document.querySelector('.an-empty')?.innerText.replace(/\\s+/g,' ').trim(), [...document.querySelectorAll('[data-f2]')].map(b=>b.innerText)]")
    ok('…with nothing in this tab it says so, and where else there are matches', n[0].startswith('No signed records match “tplo”') and n[1] == ['In progress · 1', 'To sign · 1'], n)
    await pg.click('[data-f2=ended]'); await pg.wait_for_timeout(400)
    j = await pg.evaluate("[document.querySelector('[data-f][aria-checked=true]').getAttribute('data-f'), " + NAMES + ", document.querySelector('#anFind').placeholder, document.activeElement.id]")
    ok('…and takes you there, keeping the search (the field now says “Search records to sign”)', j[0] == 'ended' and j[1] == ['Training dog 13'] and j[2] == 'Search records to sign' and j[3] == 'anFind', j)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    c = await pg.evaluate("[document.querySelector('#anFind').value, document.querySelectorAll('[data-open]').length]")
    await pg.fill('#anFind', 'boxer'); await pg.wait_for_timeout(300); await pg.reload(); await pg.wait_for_selector('[data-f]'); await pg.wait_for_timeout(600)
    kept = await pg.evaluate("[document.querySelector('#anFind')?.value, Object.keys(localStorage).filter(k=>/boxer/i.test(localStorage.getItem(k)||'')).length]")
    ok('…Esc clears it; nothing searched is kept (gone after a reload, nothing in the browser’s storage)', c == ['', 2] and kept == ['', 0], [c, kept])
    errs += list(e); await ctx.close()
    # Undo and redo on a touch screen
    ctx, pg, e = await new_page(br, vp=(1180, 820), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(900)
    ev0 = await pg.evaluate("window.__fs['anesia_records/an_train1'].events.length")
    for t in ('first note', 'second note'):
        await pg.click('.an-tools [data-act=event]'); await pg.wait_for_timeout(500)
        await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.fill('[name=note]', t); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(700)
    await pg.click('#anUndo'); await pg.wait_for_timeout(700); u1 = await pg.evaluate(TOAST)
    await pg.click('#anUndoMore'); await pg.wait_for_timeout(700); u2 = await pg.evaluate(TOAST)
    ev = await pg.evaluate("window.__fs['anesia_records/an_train1'].events.length")
    ok('Undo and redo · after one Undo the message offers Undo again as well as Redo, so a touch screen can take back more than the last change (it offered only Redo)',
       u1 and u1[0].startswith('Undid:') and 'anUndo:Redo' in u1[1] and 'anUndoMore:Undo' in u1[1] and ev == ev0, [u1, ev0, ev])
    ok('…once nothing more can be undone, only Redo is offered', u2 and u2[1] == ['anUndo:Redo'], u2)
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(500)
    msg = await pg.evaluate("document.querySelector('#anToast')?.innerText||''")
    await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(500)
    ks = await pg.evaluate("document.querySelector('.pvx-ks')?.innerText.replace(/\\s+/g,' ')||''")
    errs += list(e); await ctx.close()
    ok('…“Nothing to undo” says how to correct an older entry (strike it through on the chart)', 'strike it through' in msg and '2 minutes' in msg, msg)
    ok('…the shortcut list has the list’s keys: New training record (⌥N, missing before) and / to search', 'RECORDS' in ks.upper() and 'New training record' in ks and 'Search the records' in ks, ks[:300])
    ok('no page errors', not errs, errs)
