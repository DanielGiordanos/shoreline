"""Treatment Sheets — the n294 build's own checks: HIG Live Activities, Notifications, Snippets and Status bars.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

C = """(()=>{const m=document.querySelector('meta[name=theme-color]').content;const n=document.querySelector('nav.topnav');
  const c=getComputedStyle(n).backgroundColor.match(/[\\d.]+/g).map(Number);const h=m.replace('#','');const t=[0,2,4].map(i=>parseInt(h.substr(i,2),16));
  return [m,Math.max(...t.map((v,i)=>Math.abs(v-c[i]))),n.getBoundingClientRect().top]})()"""


@section(id='t294', title='n294 · Treatment Sheets against HIG Live Activities, Notifications, Snippets and Status bars',
         apps=['treatment'], topics=['layout', 'dark-mode'], engines=('chromium', 'webkit'))
async def s_t294(br):
    for dark in (True, False):
        ctx, pg, e = await ts(br, PORT, view='sheet', vp=(390, 844), touch=True, dark=dark)
        r = await pg.evaluate(C)
        ok(f'Status bars ({"dark" if dark else "light"}): the status bar takes the colour of the top bar right under it, so they read as one surface (it was {"#0A1222 over #0D1730" if dark else "the page grey #F2F4F8 over a white bar"})',
           r[0] == ('#0D1730' if dark else '#FFFFFF') and r[1] <= 2 and r[2] <= 1, r)
        ok('no page errors', not e, e[:2])
        await ctx.close()
