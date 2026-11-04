"""Treatment Sheets — the n300 build's own checks: the second look's small items (claude/treatment-performance-audit-2026-11-01.md):
the layers' startup path reads less (checkVisibility, one text-size read per frame, segments re-synced only when they changed, the
first measurements after the parse), the logos are WebP and the theme not in use doesn't load its set, the service worker serves
hashed files from its copy first. Nothing people see changes. Written with that build; they run in Chromium and WebKit."""
import os
from tsh import *
from core import ok, section, until, PORT, BUILD

INIT = r"""window.__k={gcs:0,gbcr:0,op:0};(function(){const C=window.getComputedStyle;window.getComputedStyle=function(){__k.gcs++;return C.apply(this,arguments)};
const G=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){__k.gbcr++;return G.apply(this,arguments)};
const d=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetParent');Object.defineProperty(HTMLElement.prototype,'offsetParent',{get:function(){__k.op++;return d.get.call(this)}});})();"""


@section(id='t300', title='n300 · Treatment Sheets: the layers\' startup path reads less; WebP logos; hashed files from the service worker\'s copy',
         apps=['treatment'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t300(br):
    T = os.path.join(BUILD, 'treatment')
    idx = open(os.path.join(T, 'index.html'), encoding='utf-8').read()
    src = open(os.path.join(T, 'src/layers.js'), encoding='utf-8').read()
    sw = open(os.path.join(T, 'downtime-sw.js'), encoding='utf-8').read()
    st = open(os.path.join(T, 'store.js'), encoding='utf-8').read()
    import re
    logos = re.findall(r'<img class="(?:logo|pvx-icon|pvx-mark)[^"]*"\s+src="img/([^"]+)"([^>]*)>', idx)
    ok('the six logos are WebP and load lazily, so the theme not on screen doesn\'t fetch its three (they were eight PNGs, all loaded); the two theme-switch pictures are WebP too',
       len(logos) == 6 and all(n.endswith('.webp') and 'loading="lazy"' in a for n, a in logos) and idx.count('.webp"') >= 8 and '.png"' not in idx.split('<body')[1], [logos[:2], idx.count('.webp"')])
    ok('the service worker serves a file whose address carries its hash from its copy first (Pages\' max-age=600 made every reopen after 10 min revalidate 23 files); index.html stays network first',
       'function hashed(u)' in sw and "if(hashed(u)){ e.respondWith(saved(r)" in sw and "var net=fetch(r)" in sw, [sw.count('hashed(')])
    ok('store.js writes the grid header height to <html> only when it changed (it did on every render, invalidating the whole tree)',
       '!==document.documentElement.style.getPropertyValue("--ts-ghead")' in st, '')
    ok('the layers ask checkVisibility() instead of building a style object per element (segments, overlays, note boxes), read the text size once per frame, and take their first measurements after the parse',
       src.count('checkVisibility') >= 5 and 'fskV' in src and "document.addEventListener('DOMContentLoaded',layout)" in src and 'function touched(ms)' in src, src.count('checkVisibility'))
    ctx, pg, e = await ts(br, PORT, view='board', init=INIT)
    await pg.wait_for_timeout(1500)
    k = await pg.evaluate("JSON.stringify(__k)")
    import json; kk = json.loads(k)
    ok('loading the Status board: under 200 getComputedStyle calls (there were ~350) and under 10 offsetParent reads (there were ~20)', kk['gcs'] < 200 and kk['op'] < 10, kk)
    seg = await pg.evaluate("[document.querySelector('#clinSwitcher .seg[aria-current]')!==null, document.getElementById('sbBoards')&&document.getElementById('sbBoards').getAttribute('role'), [...document.querySelectorAll('#sbBoards .sb-segb')].map(b=>b.getAttribute('aria-selected')).filter(x=>x==='true').length]")
    ok('the segmented controls still get their roles and states (section switcher aria-current, the boards a tablist with one selected tab) from the first sync after the parse', seg[0] and seg[1] == 'tablist' and seg[2] == 1, seg)
    await pg.click('#sbBoards .sb-segb >> nth=1'); await pg.wait_for_timeout(500)
    seg2 = await pg.evaluate("[...document.querySelectorAll('#sbBoards .sb-segb')].map(b=>[b.classList.contains('on'), b.getAttribute('aria-selected')])")
    ok('choosing another board keeps the spoken state with the highlight (the group re-synced because it was the group that changed)', all((on and sel == 'true') or (not on and sel == 'false') for on, sel in seg2) and sum(1 for on, _ in seg2 if on) == 1, seg2)
    lg = await pg.evaluate("[...document.querySelectorAll('img.logo')].map(i=>[i.className, getComputedStyle(i).display, i.complete&&i.naturalWidth>0])")
    await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(900)
    lg2 = await pg.evaluate("[...document.querySelectorAll('img.logo')].map(i=>[i.className, getComputedStyle(i).display, i.complete&&i.naturalWidth>0])")
    shown1 = [l for l in lg if l[1] != 'none']; shown2 = [l for l in lg2 if l[1] != 'none']
    ok('the logo on screen is loaded in each theme, and switching themes brings in the other one', len(shown1) == 1 and shown1[0][2] and len(shown2) == 1 and shown2[0][2] and shown1[0][0] != shown2[0][0], [lg, lg2])
    ok('no page errors (board)', not e, e[:3])
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', init=INIT)
    await pg.wait_for_timeout(1500)
    kk = json.loads(await pg.evaluate("JSON.stringify(__k)"))
    ok('loading a sheet: under 1,000 getComputedStyle calls (there were ~1,270) and under 10 offsetParent reads (there were ~20)', kk['gcs'] < 1000 and kk['op'] < 10, kk)
    closed = await pg.evaluate("[...document.querySelectorAll('aside.drawer, .confirm, #tsOrderSheet')].filter(d=>!d.classList.contains('open')&&!d.classList.contains('show')).map(d=>[d.id||d.className.split(' ')[0], d.classList.contains('pvx-closed'), d.hasAttribute('inert')])")
    ok('n133 still takes the closed drawers and sheets out of the accessibility tree (inert, pvx-closed), judged with checkVisibility', closed and all(c[1] and c[2] for c in closed), closed)
    tid = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Temperature/i.test(t.order.name));return t?t.id:null})()")
    await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(700)
    h0 = await pg.evaluate("(()=>{const t=document.getElementById('cd-notes');return t?t.getBoundingClientRect().height:null})()")
    await pg.fill('#cd-notes', 'line one\nline two\nline three\nline four\nline five\nline six'); await pg.wait_for_timeout(300)
    h1 = await pg.evaluate("(()=>{const t=document.getElementById('cd-notes');return t?t.getBoundingClientRect().height:null})()")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    if await pg.evaluate("!!document.querySelector('.pvx-discard')"): await pg.click('.pvx-discard [data-discard]'); await pg.wait_for_timeout(300)
    ok('n238 still grows a note box with its text (its visibility now read without forcing a layout)', h0 and h1 and h1 > h0 + 20, [h0, h1])
    ok('no page errors (sheet)', not e, e[:3])
    await ctx.close()
