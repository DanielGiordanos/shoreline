"""Treatment Sheets — the n268 build's own checks: Treatment Sheets against HIG Column views, Disclosure controls,
Labels, Lists and tables. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
from tsh import *
from core import ok, section, until, PORT

ZEBRA = """(()=>{const z=document.querySelector('#sheetInner .grow.zb[data-o]'),p=[...document.querySelectorAll('#sheetInner .grow[data-o]')].find(r=>!r.classList.contains('zb'));
  const bg=e=>getComputedStyle(e.querySelector('.hcells')).backgroundColor, sh=e=>getComputedStyle(e.querySelector('.rl')).boxShadow;
  return z&&p?[bg(z),bg(p),sh(z)!=='none',sh(p)]:null})()"""
CLEAR = ('rgba(0, 0, 0, 0)', 'transparent')


@section(id='t268', title='n268 · Treatment Sheets against HIG Column views, Disclosure controls, Labels, Lists and tables',
         apps=['treatment'], topics=['lists', 'disclosure'], engines=('chromium', 'webkit'))
async def s_t268(br):
    # ── Lists and tables 1. alternate rows on touch screens ──
    res = {}
    for nm, vp, touch, dark in [('ipad', (1024, 1366), True, True), ('iphone-light', (390, 844), True, False), ('mac', (1440, 900), False, True)]:
        ctx, pg, e = await ts(br, PORT, vp=vp, touch=touch, dark=dark, view='sheet')
        res[nm] = await pg.evaluate(ZEBRA); res[nm + '-err'] = e[:1]; await ctx.close()
    ok('Lists: on iPad and iPhone every other row of the sheet has a faint tint, label and hours alike, to follow a row across the hours (there was nothing to follow it by on touch)',
       all(res[k] and res[k][0] not in CLEAR and res[k][1] in CLEAR and res[k][2] and res[k][3] == 'none' for k in ['ipad', 'iphone-light']), res)
    ok('…with a mouse the rows stay plain (pointing lights the row and its hour)', res['mac'] and res['mac'][0] in CLEAR and not res['mac'][2], res['mac'])
    ok('no page errors (rows)', not any(res[k] for k in res if k.endswith('-err')), [res[k] for k in res if k.endswith('-err')])

    # ── Disclosure controls 2. Details keeps its name ──
    ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, view='sheet')
    D = "(()=>{const b=document.querySelector('.pvx-hdr-more');const c=b&&document.getElementById(b.getAttribute('aria-controls')||'');return b?[b.textContent.trim(),b.getAttribute('aria-expanded'),!!c,c?c.getClientRects().length>0&&getComputedStyle(c).display!=='none':null]:null})()"
    d0 = await pg.evaluate(D); await pg.click('.pvx-hdr-more'); await pg.wait_for_timeout(500); d1 = await pg.evaluate(D)
    ok('Disclosure: the iPhone header’s Details keeps its name when open (it said “Less”), says it’s expanded, and names what it shows, which appears',
       d0 and d0[:3] == ['Details', 'false', True] and d0[3] is False and d1 and d1 == ['Details', 'true', True, True], [d0, d1])
    ok('no page errors (Details)', not e, e[:2]); await ctx.close()
