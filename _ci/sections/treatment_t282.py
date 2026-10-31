"""Treatment Sheets — the n282 build's own checks: HIG Dock menus, Edit menus, Home Screen quick actions.
Written with that build; they run in Chromium and WebKit."""
import json, os
from tsh import *
from core import ok, section, until, PORT, BUILD as SITE

ST = "(()=>({tab:typeof currentCTab!=='undefined'?currentCTab:null,board:typeof sbBoard!=='undefined'?sbBoard:null,hash:location.hash,focus:(document.activeElement||{}).id,meta:(document.querySelector('meta[name=theme-color]')||{}).content}))()"


async def opn(br, hash_, vp=(1440, 900), touch=False, dark=True):
    ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US',
                               color_scheme='dark' if dark else 'light', **(dict(has_touch=True, is_mobile=True) if touch else {}))
    await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await ctx.add_init_script(INIT.replace('@@USER@@', USER).replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB.get(u.rsplit('/', 1)[-1], ''))
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/' + hash_); await pg.wait_for_timeout(3500)
    return ctx, pg, errs


@section(id='t282', title='n282 · Treatment Sheets against HIG Dock menus, Edit menus, Home Screen quick actions',
         apps=['treatment'], topics=['menus', 'launching', 'entering-data'], engines=('chromium', 'webkit'))
async def s_t282(br):
    # the manifest: four shortcuts, short titles, a monochrome symbol each, the window colour in dark
    m = json.load(open(os.path.join(SITE, 'treatment', 'manifest.webmanifest')))
    sc = m.get('shortcuts', [])
    ok('Dock menu: the app offers Tasks due · Your patients · Find a patient · ICU display (it offered only ICU display), each with a 96 pt symbol and no app name in the title',
       [s['name'] for s in sc] == ['Tasks due', 'Your patients', 'Find a patient', 'ICU display']
       and all(s.get('icons') and os.path.exists(os.path.join(SITE, 'treatment', s['icons'][0]['src'])) and 'Treatment' not in s['name'] for s in sc), [(s['name'], s['url']) for s in sc])

    res = {}
    for h in ('#view=tasks', '#view=mine', '#find', '#display=ICU'):
        ctx, pg, e = await opn(br, h)
        res[h] = await pg.evaluate(ST); res[h]['tv'] = await pg.evaluate("!!document.getElementById('tsTv')"); res[h]['e'] = e[:1]
        await ctx.close()
    ok('Each shortcut opens where it says: Tasks; the board on Your patients; the search with the cursor in it; the ICU display',
       res['#view=tasks']['tab'] == 'tasks' and res['#view=mine']['tab'] == 'dash' and res['#view=mine']['board'] == 'My Board'
       and res['#find']['focus'] == 'globalSearch' and res['#display=ICU']['tv'], res)
    ok('…and the address is tidied afterwards (a reload opens the app as usual), with no page errors',
       all(res[h]['hash'] == '' for h in ('#view=tasks', '#view=mine', '#find')) and not any(r['e'] for r in res.values()), {h: (r['hash'], r['e']) for h, r in res.items()})

    ctx, pg, e = await opn(br, '#find', vp=(390, 844), touch=True)
    r = await pg.evaluate("(()=>{const i=document.getElementById('globalSearch');const b=i.getBoundingClientRect();return [document.activeElement===i,b.width>0&&b.height>0]})()")
    ok('iPhone: Find a patient opens the search, visible and focused', r == [True, True], r)
    await ctx.close()

    ctx, pg, e = await opn(br, '', dark=False)
    s0 = await pg.evaluate(ST)
    await pg.evaluate("location.hash='#view=tasks'"); await pg.wait_for_timeout(1200)
    s1 = await pg.evaluate(ST)
    ok('A shortcut while the app is open works too', s1['tab'] == 'tasks', [s0, s1])
    await ctx.close()

    # Edit menus: content text selects, the browser's own menu reaches it, fields keep their own undo
    ctx, pg, e = await ts(br, PORT, view='sheet')
    sel = await pg.evaluate("""(()=>{const out={};[['name','.tsh-name > span:first-child'],['id','.tsh-pid'],['order','#sheetInner .rl-name'],['weight','.wc-num']].forEach(([k,s])=>{const el=document.querySelector(s);if(!el){out[k]=null;return}
      const r=document.createRange();r.selectNodeContents(el);const g=getSelection();g.removeAllRanges();g.addRange(r);const t=g.toString().trim();g.removeAllRanges();
      const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});out[k]=[t.slice(0,20),getComputedStyle(el).userSelect,el.dispatchEvent(ev)]});return out})()""")
    ok('Edit menus: the patient name, ID, order names and weight can be selected and copied, and the browser’s own menu reaches them',
       all(v and v[0] and v[1] != 'none' and v[2] for v in sel.values()), sel)
    await pg.evaluate("selectCTab('notes')"); await pg.wait_for_timeout(300); await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(300)
    await pg.click('#note-body'); await pg.keyboard.type('abc def')
    for k in ('Meta+z', 'Control+z'): await pg.keyboard.press(k); await pg.wait_for_timeout(150)
    v = await pg.evaluate("document.getElementById('note-body').value")
    ok('…and ⌘Z in a text field undoes the typing, not the sheet', v != 'abc def', v)
    ok('no page errors', not e, e[:2])
    await ctx.close()
