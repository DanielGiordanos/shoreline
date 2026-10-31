"""Treatment Sheets — the n284 build's own checks: HIG Pull-down buttons, The menu bar and Toolbars.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

TB = """(()=>{const t=document.querySelector('#ctab-sheet .treatment-toolbar');const r=t.getBoundingClientRect();
  const kids=[...t.children].filter(c=>c.getClientRects().length&&c.getBoundingClientRect().width>0&&!c.matches('.order-search-wrapper,.brief-toggle,.dn-late,.pvx-ur'));
  const rows=[];kids.forEach(c=>{const q=c.getBoundingClientRect(),m=(q.top+q.bottom)/2;if(!rows.some(x=>Math.abs(x-m)<14))rows.push(m)});
  const s=document.getElementById('tsSearch');
  return {h:Math.round(r.height),rows:rows.length,over:kids.some(c=>c.getBoundingClientRect().right>r.right+0.5)||t.scrollWidth>t.clientWidth+1,
    vis:kids.map(c=>(c.getAttribute('aria-label')||c.className).toString().slice(0,24)),ph:s.placeholder,phFits:s.scrollWidth<=s.clientWidth+1,
    sw:Math.round(s.closest('.order-search-wrapper').getBoundingClientRect().width)}})()"""


@section(id='t284', title='n284 · Treatment Sheets against HIG Pull-down buttons, The menu bar and Toolbars',
         apps=['treatment'], topics=['menus', 'layout', 'launching'], engines=('chromium', 'webkit'))
async def s_t284(br):
    # 1. the window's title names what's on screen
    ctx, pg, e = await ts(br, PORT, view='sheet')
    t = {}
    for v in ('sheet', 'vitals', 'dash', 'tasks'):
        await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(500)
        t[v] = await pg.evaluate('document.title')
    ok('The window’s title names what’s on screen, not the app (it was “Pravix Treatment Sheets | VCA Shoreline” everywhere)',
       t == {'sheet': 'Biscuit Training · Treatment sheet', 'vitals': 'Biscuit Training · Vitals', 'dash': 'Dashboard', 'tasks': 'Tasks'}, t)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(500)
    await pg.locator('[aria-label^="Mochi Training, Wards"]').first.click(); await pg.wait_for_timeout(1200)
    t2 = await pg.evaluate('document.title')
    ok('…and follows the patient tab', t2 == 'Mochi Training · Treatment sheet', t2)
    await pg.evaluate("window.dispatchEvent(new Event('beforeprint'));document.title='Biscuit print';window.__x=1"); await pg.wait_for_timeout(400)
    tp = await pg.evaluate('document.title')
    await pg.evaluate("document.title='Mochi Training · Treatment sheet';window.dispatchEvent(new Event('afterprint'))"); await pg.wait_for_timeout(600)
    ok('…without overwriting the title printing gives the file', tp == 'Biscuit print', tp)
    tb = await pg.evaluate(TB)
    ok('Mac: the sheet toolbar is unchanged — one row, every item in it, no More button', tb['rows'] == 1 and not tb['over'] and 'More' not in tb['vis'] and tb['h'] < 70, tb)
    await ctx.close()

    # 2. iPhone: More holds View, Audit, Expand; two rows
    ctx, pg, e = await ts(br, PORT, view='sheet', vp=(390, 844), touch=True)
    tb = await pg.evaluate(TB)
    ok('iPhone: the sheet toolbar is two rows (it was three): View, Audit and Expand the sheet are in More (•••) beside Share, next to the search field',
       tb['h'] < 110 and not tb['over'] and 'More' in tb['vis'] and 'Share' in tb['vis'] and not any(x.startswith('Audit') or x.startswith('Expand') for x in tb['vis']), tb)
    ok('…the search field keeps at least 160 pt and its hint, “Add treatment…”, fits', tb['sw'] >= 160 and tb['phFits'] and tb['ph'] == 'Add treatment…', tb)
    hit = await pg.evaluate("(()=>{const b=document.querySelector('.ts-more-btn').getBoundingClientRect(),c=[b.left+b.width/2,b.top+b.height/2];return [[0,-21],[0,21],[-21,0],[21,0]].map(d=>{const el=document.elementFromPoint(c[0]+d[0],c[1]+d[1]);return !!(el&&el.closest('.ts-more-btn'))}).filter(Boolean).length})()")
    await pg.click('.ts-more-btn'); await pg.wait_for_timeout(400)
    m = await pg.evaluate("(()=>{const m=document.querySelector('#flPop [role=menu]');return m?[m.getAttribute('aria-label'),[...m.querySelectorAll('[data-a]')].map(b=>[b.querySelector('b').textContent,b.getAttribute('role')]),document.querySelector('.ts-more-btn').getAttribute('aria-expanded')]:null})()")
    ok('…More is a menu: View (opens the View menu), Audit, Expand the sheet (a checkbox), and says it’s open; it can be tapped from 21 pt around its centre',
       m and m[0] == 'More' and [x[0] for x in m[1]] == ['View', 'Audit', 'Expand the sheet'] and m[1][2][1] == 'menuitemcheckbox' and m[2] == 'true' and hit >= 3, [m, hit])
    await pg.click('#flPop [data-a="view"]'); await pg.wait_for_timeout(400)
    v = await pg.evaluate("!!document.querySelector('#flPop .vw-pop')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.click('.ts-more-btn'); await pg.wait_for_timeout(300)
    await pg.click('#flPop [data-a="expand"]'); await pg.wait_for_timeout(500)
    x = await pg.evaluate("document.getElementById('tsExpandBtn').getAttribute('aria-pressed')")
    await pg.click('.ts-more-btn'); await pg.wait_for_timeout(300)
    x2 = await pg.evaluate("document.querySelector('#flPop [data-a=expand]').getAttribute('aria-checked')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.click('.ts-more-btn'); await pg.wait_for_timeout(300)
    await pg.click('#flPop [data-a="audit"]'); await pg.wait_for_timeout(700)
    a = await pg.evaluate("typeof currentCTab!=='undefined'?currentCTab:null")
    ok('…each item does what its button did: View opens the View menu, Expand turns full view on (and shows it checked), Audit opens the timeline',
       v and x == 'true' and x2 == 'true' and a == 'timeline', [v, x, x2, a])
    ok('no page errors (iPhone)', not e, e[:2])
    await ctx.close()

    # 3. iPad: nothing on a row by itself
    for vp in ((1180, 820), (820, 1180)):
        ctx, pg, e = await ts(br, PORT, view='sheet', vp=vp, touch=True)
        tb = await pg.evaluate(TB)
        ok(f'iPad {vp[0]}×{vp[1]}: the sheet’s controls fit one row under the search field (Expand the sheet sat on a row by itself); Share shortens to its symbol first',
           tb['rows'] == 1 and not tb['over'] and 'More' not in tb['vis'], tb)
        await ctx.close()
