"""Anesia — the n430 build's own checks (Nov 24 2026): HIG Branding, Color, Dark Mode.
The page said "light dark", so the system's own controls followed the device rather than Anesia when the person's choice
differed; theme-color stayed #0A1222 over the light page; with Increase Contrast in light, the Now column's vital names
were 5.1-6.7 : 1."""
from core import *
from helpers import *

STATE = """(()=>{ const i=document.createElement('input'); i.type='text'; i.id='zz430'; i.style.cssText='position:fixed;left:8px;top:200px;width:80px;height:24px';
  document.body.appendChild(i); const bg=getComputedStyle(i).backgroundColor; i.remove();
  const m=bg.match(/\\d+/g).map(Number); return {page:document.body.classList.contains('dark')?'dark':'light', scheme:getComputedStyle(document.documentElement).colorScheme,
  field:(m[0]+m[1]+m[2])/3>128?'light':'dark', theme:document.querySelector('meta[name=theme-color]').content}; })()"""

TAGS = """(()=>{ const lin=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};
  const L=c=>{const m=c.match(/[\\d.]+/g).map(Number); return .2126*lin(m[0])+.7152*lin(m[1])+.0722*lin(m[2]);};
  const bgOf=e=>{ while(e){ const c=getComputedStyle(e).backgroundColor, m=c.match(/[\\d.]+/g); if(m&&(m.length<4||+m[3]>0.85)) return c; e=e.parentElement;} return 'rgb(255,255,255)'; };
  return [...document.querySelectorAll('.an-tile .tag')].filter(t=>t.getBoundingClientRect().width).map(t=>{ const a=L(getComputedStyle(t).color), b=L(bgOf(t));
    return [t.textContent.trim(), getComputedStyle(t).color, +((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)]; }); })()"""


async def open_rec(pg):
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)


@section(id='a430', title='n430 · Anesia · Branding, Color, Dark Mode: the system’s controls and the device’s bars follow Anesia’s appearance, and Increase Contrast brings the vital names to 7 : 1 in light',
         apps=['anesia'], topics=['dark-mode', 'color', 'accessibility'], engines=('chromium', 'webkit'))
async def s_a430(br):
    errs = []
    # the person's choice differs from the device's: both ways
    for dev in ('dark', 'light'):
        ctx, pg, e = await new_page(br, dark=(dev == 'dark'))
        await ctx.clear_cookies(); await open_rec(pg)
        s0 = await pg.evaluate(STATE)
        await pg.click('.theme-toggle'); await pg.wait_for_timeout(500)
        s1 = await pg.evaluate(STATE)
        await pg.click('.theme-toggle'); await pg.wait_for_timeout(500)
        s2 = await pg.evaluate(STATE)
        other = 'light' if dev == 'dark' else 'dark'
        bar = {'dark': '#0D1730', 'light': '#FFFFFF'}
        ok(f'Dark Mode · device {dev}, the person chooses {other}: the system’s own controls are drawn {other} too (they followed the device), and the device’s bars take the top bar’s colour ({bar[other]}; they stayed #0A1222); choosing back puts both back',
           s0 == {'page': dev, 'scheme': dev, 'field': dev, 'theme': bar[dev]} and s1 == {'page': other, 'scheme': other, 'field': other, 'theme': bar[other]}
           and s2 == {'page': dev, 'scheme': dev, 'field': dev, 'theme': bar[dev]}, (s0, s1, s2))
        errs += list(e); await ctx.close()
    # no choice: the device's appearance, live
    ctx, pg, e = await new_page(br, dark=True)
    await ctx.clear_cookies(); await open_rec(pg)
    await pg.emulate_media(color_scheme='light'); await pg.wait_for_timeout(700)
    l = await pg.evaluate(STATE)
    await pg.emulate_media(color_scheme='dark'); await pg.wait_for_timeout(700)
    d = await pg.evaluate(STATE)
    ok('…with no choice made, the device switching while Anesia is open switches the controls and the bars with it (Auto)',
       l == {'page': 'light', 'scheme': 'light', 'field': 'light', 'theme': '#FFFFFF'} and d == {'page': 'dark', 'scheme': 'dark', 'field': 'dark', 'theme': '#0D1730'}, (l, d))
    errs += list(e); await ctx.close()
    # Increase Contrast: the Now column's vital names
    res = {}
    for dark in (False, True):
        ctx, pg, e = await new_page(br, dark=dark); await pg.emulate_media(contrast='more'); await open_rec(pg)
        res['dark' if dark else 'light'] = await pg.evaluate(TAGS); errs += list(e); await ctx.close()
    names = lambda r: sorted(x[0] for x in r)
    ok('Color · with Increase Contrast, every vital name in the Now column is 7 : 1 or more in light (HR 6.74, BP 6.70, EtCO₂ and RR 6.66, Temp 5.07 before) and in dark',
       len(res['light']) >= 6 and all(x[2] >= 7 for x in res['light'] + res['dark']) and names(res['light']) == names(res['dark']), res)
    ctx, pg, e = await new_page(br, dark=False); await open_rec(pg)
    std = {x[0]: x[1] for x in await pg.evaluate(TAGS)}
    ok('…and only with Increase Contrast: at the standard contrast the vital colours are as before (HR #1A7F38, SpO₂ #1F6FD1, BP #D1355B, EtCO₂ and RR #946F00, Temp #6E6E73)',
       std == {'HR': 'rgb(26, 127, 56)', 'SpO₂': 'rgb(31, 111, 209)', 'BP': 'rgb(209, 53, 91)', 'EtCO₂': 'rgb(148, 111, 0)', 'RR': 'rgb(148, 111, 0)', 'Temp': 'rgb(110, 110, 115)'}, std)
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
