"""Anesia — the n446 build's own checks (Nov 27 2026): HIG Buttons, Context menus (Dock menus: nothing to change).
Push buttons that open a sheet asking for more had no ellipsis; on touch the chart's bars were 37 pt (28 under a dose)
and n444's column headings 37 pt; a running infusion's context menu had neither Change rate nor Stop."""
from core import *
from helpers import *
from anesia_t440 import many_records

HIT = """(()=>{return [...document.querySelectorAll('.an-chart .an-bar')].map(b=>{b.scrollIntoView({block:'center',inline:'nearest'});const r=b.getBoundingClientRect();const x=Math.max(r.left+30,Math.min(r.right-30,innerWidth/2));const cy=r.top+r.height/2;
 const at=dy=>{const e=document.elementFromPoint(x,cy+dy);return !!e&&e.closest('.an-bar')===b};let up=0,dn=0;for(let d=1;d<=30;d++){if(at(-d))up=d;else break}for(let d=1;d<=30;d++){if(at(d))dn=d;else break}
 return [b.getAttribute('aria-label').slice(0,30),up+dn+1,b.parentElement.classList.contains('both')]})})()"""
MENU = "(()=>{const m=document.querySelector('.pvx-cx .pvx-cx-list');return m?[...m.children].map(i=>i.getAttribute('role')==='separator'?'---':i.textContent.trim()):null})()"
TXT = "(s=>{const e=document.querySelector(s);return e&&e.offsetParent?e.textContent.replace(/\\s+/g,' ').trim():null})"


async def touch_list(br, vp):
    ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', has_touch=True, is_mobile=True)
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


@section(id='a446', title='n446 · Anesia · Buttons, Context menus: an ellipsis on buttons that ask for more, 44 pt touch targets for the chart’s bars and the list’s headings, and Change rate and Stop in a running infusion’s menu',
         apps=['anesia'], topics=['buttons', 'context-menus'], engines=('chromium', 'webkit'))
async def s_a446(br):
    errs = []
    ctx, pg, e = await new_page(br, vp=(1440, 900))
    lab = {}
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(500)
    lab['new'] = await pg.evaluate(TXT + "('#anNew')")
    for rid, keys in (('an_train3', {'start': '#anStart', 'weight': '.an-banner [data-act=weight]'}), ('an_train1', {'end': '#anEnd', 'dose': '.an-tools [data-act=dose]', 'vitals': '.an-tools [data-act=vitals]'}), ('an_train2', {'sign': '#anSign'})):
        await pg.goto(URL + '#r=' + rid); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
        for k, s in keys.items(): lab[k] = await pg.evaluate(TXT + "('" + s + "')")
    ok('Buttons · a push button that opens a sheet asking for more ends in “…”: New training record…, Start anesthesia…, Add weight…, End anesthesia…',
       lab['new'] == 'New training record…' and lab['start'] == 'Start anesthesia…' and lab['weight'] == 'Add weight…' and lab['end'] == 'End anesthesia…', lab)
    ok('…toolbar items (Give drug, Vitals now) and Sign record, which asks for nothing more, have none',
       lab['dose'] == 'Give drug' and (lab['vitals'] or '').startswith('Vitals now') and not (lab['vitals'] or '').endswith('…') and lab['sign'] == 'Sign record', lab)
    # context menu on a running infusion
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    fen = pg.locator('.an-chart .an-bar[aria-label^="Fentanyl infusion"]').first
    await fen.scroll_into_view_if_needed(); await fen.click(button='right'); await pg.wait_for_timeout(400)
    m1 = await pg.evaluate(MENU)
    await pg.click('.pvx-cx .pvx-cx-list button:has-text("Stop…")'); await pg.wait_for_timeout(600)
    st = await pg.evaluate("[document.querySelector('#anShT')?.textContent,document.querySelector('#anSheet [data-ok]')?.textContent.trim()]")
    await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(700)
    ended = await pg.evaluate("(()=>{const r=window.__fs['anesia_records/an_train1'];const f=(r.infusions||[]).find(i=>/fentanyl/i.test(JSON.stringify(i))||true&&i.drugId&&(r.drugs||[]).some(d=>d.id===i.drugId&&/fentanyl/i.test(d.name)));return f?!!f.end:null})()")
    fen = pg.locator('.an-chart .an-bar[aria-label^="Fentanyl infusion"]').first
    await fen.click(button='right'); await pg.wait_for_timeout(400); m2 = await pg.evaluate(MENU); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('Context menus · a running infusion’s menu leads with Change rate… and Stop… (it had only Show details and Strike through); Stop… asks the time, and stops it',
       m1 == ['Change rate…', 'Stop…', '---', 'Strike through…'] and st == ['Stop Fentanyl infusion', 'Stop'] and ended is True and m2 is not None and m2[0] == 'Show details' and 'Stop…' not in m2, [m1, st, ended, m2])
    lr = pg.locator('.an-chart .an-bar[aria-label^="Lactated"]').first
    await lr.click(button='right'); await pg.wait_for_timeout(400)
    await pg.click('.pvx-cx .pvx-cx-list button:has-text("Change rate…")'); await pg.wait_for_timeout(700)
    cr = await pg.evaluate("[document.querySelector('#anShT')?.textContent,document.activeElement.name]")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ok('…Change rate… opens the infusion with its New rate field ready', cr == ['Lactated Ringer’s infusion', 'rate'], cr)
    errs += list(e); await ctx.close()
    # touch targets
    ctx, pg, e = await new_page(br, vp=(820, 1180), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    hits = await pg.evaluate(HIT)
    ok('Buttons · on a touch iPad every running bar takes a 44 pt tap (it was 37); under a dose it fills its lane below the dose’s own 44 pt area (40 pt or more; it was 28)',
       len(hits) >= 4 and all(h[1] >= 44 for h in hits if not h[2]) and all(h[1] >= 40 for h in hits if h[2]) and any(h[2] for h in hits), hits)
    errs += list(e); await ctx.close()
    ctx, pg, e = await touch_list(br, (1180, 820))
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
    hh = await pg.evaluate("[...document.querySelectorAll('.an-lcol')].filter(b=>b.offsetParent).map(b=>Math.round(b.getBoundingClientRect().height))")
    ok('…on a touch iPad in landscape the list’s column headings are 44 pt tall (they were 37)', len(hh) == 4 and all(h >= 44 for h in hh), hh)
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
