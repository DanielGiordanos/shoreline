"""Pravix OR — the n392 build's own checks (Nov 15 2026): HIG Materials, Typography, Accessibility.
Materials: the Undo message, the notifications and the search suggestions are the floating controls layer and wear Pravix's one
glass, in both appearances (the Undo message was a near-black slab even in light, the notifications solid cards, and OR's own
#searchResults rule cancelled the suggestions' glass); each turns solid with Reduce Transparency, Increase Contrast (with an edge)
or no blur; content stays flat and the scrim dims without blurring.
Typography: five weights (OR used nine); OR's bar labels hold at about 1.5× while content keeps growing; at large text the
Schedule is the list per room (the timeline's blocks cut names and dropped the status line); symbols that carry meaning grow
with the text; suggestions wrap instead of ending in "…"; numbers keep their width; no negative tracking at 12 pt; body leading
for small multi-line text; Cases keeps "OR 1 · 8:00 AM" on one line.
Accessibility: on touch screens fields are 16 pt (so iPhone Safari never zooms), secondary lines 13 pt and names 16 pt."""
import core
from core import ok, section
from or_t390 import open_or

STYLE = r"""(sel)=>{const e=document.querySelector(sel);if(!e)return null;const cs=getComputedStyle(e);const bg=cs.backgroundColor.match(/[\d.]+/g).map(Number);
return {bf:cs.backdropFilter||cs.webkitBackdropFilter||'none',a:bg.length>3?bg[3]:1,lum:(bg[0]+bg[1]+bg[2])/3,color:cs.color,shadow:cs.boxShadow,
 ink:getComputedStyle(document.body).getPropertyValue('--pvx-glass-ink').trim()}}"""
INK = "(()=>{const x=document.createElement('span');x.style.color='var(--pvx-glass-ink)';document.body.appendChild(x);const c=getComputedStyle(x).color;x.remove();return c})()"
WEIGHTS = "(()=>{const w=new Set();document.querySelectorAll('#stage *, .or-drawer *, .confirm *, #searchResults *, .toast, #notes *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width<1)return;if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;w.add(getComputedStyle(e).fontWeight)});return [...w].sort()})()"


async def messages(p):
    """Show the Undo message, a notification and the suggestions."""
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(500)
    await p.click('#drawerAdvance'); await p.wait_for_timeout(400)
    await p.evaluate("closeDrawer()"); await p.evaluate("notify('Anesia · Anesthesia started','Maple','var(--st-inor)')"); await p.wait_for_timeout(500)


@section(id='t392', title='n392 · OR · Materials, Typography, Accessibility: messages and suggestions on the glass (solid with Reduce Transparency and Increase Contrast), five weights, bar labels hold while content grows, the Schedule list at large text, symbols grow, suggestions wrap, 16 pt fields and 13 pt secondary lines on touch',
         apps=['or'], topics=['materials', 'typography', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t392(br):
    # ── Materials ──
    for dark in (True, False):
        mode = 'dark' if dark else 'light'
        c, p, e = await open_or(br, dark=dark)
        # the slow-device guard samples frames after clicks and may turn the blur off on a busy test machine; hold it on
        await p.evaluate("(()=>{const d=document.documentElement;window.__allowNoblur=false;d.classList.remove('pvx-noblur');new MutationObserver(()=>{if(!window.__allowNoblur&&d.classList.contains('pvx-noblur'))d.classList.remove('pvx-noblur')}).observe(d,{attributes:true,attributeFilter:['class']})})()")
        await messages(p)
        ink = await p.evaluate(INK)
        t = await p.evaluate(STYLE, '.toast'); n = await p.evaluate(STYLE, '#notes .note')
        ok(f'Materials · {mode}: the Undo message is on the floating glass in the page’s appearance, its words in the glass ink (it was a near-black slab, even on the white page)',
           t and 'blur' in t['bf'] and t['a'] < 1 and t['color'] == ink and ((t['lum'] < 80) if dark else (t['lum'] > 200)), (t, ink))
        ok(f'…{mode}: so are the notifications (they were solid cards)', n and 'blur' in n['bf'] and n['a'] < 1, n)
        await p.click('#globalSearch'); await p.keyboard.type('Ma'); await p.wait_for_timeout(600)
        s = await p.evaluate(STYLE, '#searchResults')
        ok(f'…{mode}: and the search suggestions (OR’s own rule had cancelled their glass)', s and 'blur' in s['bf'] and s['a'] < 1, s)
        flat = await p.evaluate("(()=>{const out=[];document.querySelectorAll('#stage *').forEach(e=>{const cs=getComputedStyle(e);const b=cs.backdropFilter||cs.webkitBackdropFilter;if(b&&b!=='none'&&e.getBoundingClientRect().width>0)out.push(e.className)});return out})()")
        ok(f'…{mode}: content stays flat (nothing in the board blurs)', flat == [], flat[:4])
        # no blur (the slow-device guard, and the same rules as Reduce Transparency's)
        await p.evaluate("window.__allowNoblur=true;document.documentElement.classList.add('pvx-noblur')"); await p.wait_for_timeout(800)
        s2 = await p.evaluate(STYLE, '#searchResults'); t2 = await p.evaluate(STYLE, '.toast')
        ok(f'…{mode}, no blur (a slow device): the suggestions and the Undo message turn solid', s2['bf'] == 'none' and s2['a'] == 1 and t2['bf'] == 'none' and t2['a'] == 1, (s2, t2))
        await p.evaluate("window.__allowNoblur=false;document.documentElement.classList.remove('pvx-noblur')")
        await p.emulate_media(contrast='more'); await p.wait_for_timeout(300)
        s3 = await p.evaluate(STYLE, '#searchResults'); n3 = await p.evaluate(STYLE, '#notes .note')
        ok(f'…{mode}, Increase Contrast: solid, with an edge', s3['bf'] == 'none' and s3['a'] == 1 and n3['a'] == 1 and '0px 0px 0px 1px' in s3['shadow'], (s3['bf'], s3['a'], s3['shadow'][:40]))
        await p.emulate_media(contrast='no-preference')
        if core.ENGINE == 'chromium':
            cdp = await c.new_cdp_session(p)
            await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-transparency', 'value': 'reduce'}]}); await p.wait_for_timeout(300)
            s4 = await p.evaluate(STYLE, '#searchResults'); n4 = await p.evaluate(STYLE, '#notes .note')
            ok(f'…{mode}, Reduce Transparency: solid', s4['bf'] == 'none' and s4['a'] == 1 and n4['bf'] == 'none' and n4['a'] == 1, (s4, n4))
        ok(f'…no page errors ({mode})', not e, e[:3])
        await c.close()

    # ── Typography ──
    c, p, e = await open_or(br)
    seen = set()
    seen.update(await p.evaluate(WEIGHTS))
    for v in ['schedule', 'cases', 'analytics', 'board']:
        await p.click(f'#switcher [data-view="{v}"]'); await p.wait_for_timeout(600); seen.update(await p.evaluate(WEIGHTS))
    await p.evaluate("openDrawer('or390c4')"); await p.wait_for_timeout(700); seen.update(await p.evaluate(WEIGHTS))
    await p.evaluate("closeDrawer()"); await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(1500); seen.update(await p.evaluate(WEIGHTS))
    ok('Typography · five weights: 400, 500, 600, 700, 800 (OR also used 450, 460, 550, 650, 720, 750, 760 and 780)', seen <= {'400', '500', '600', '700', '800'}, sorted(seen))
    await p.evaluate("location.hash='';"); await c.close()

    c, p, e = await open_or(br)
    num = await p.evaluate("[...document.querySelectorAll('#view-board .or-q-time b, #boardSub, #view-board .or-rnow-big')].map(x=>getComputedStyle(x).fontVariantNumeric)")
    sm = await p.evaluate("(()=>{const b=document.createElement('button');b.className='or-btn sm';b.textContent='Icon legend…';document.getElementById('stage').appendChild(b);const r=getComputedStyle(b).letterSpacing;b.remove();return r})()")
    ok('Typography · times and counts keep their width (tabular digits), and the small buttons have no negative tracking',
       num and all('tabular-nums' in x for x in num) and sm in ('0px', 'normal'), (num, sm))
    ico0 = await p.evaluate("document.querySelector('#view-board .or-ico svg').getBoundingClientRect().width")
    await p.add_style_tag(content='html{font-size:200%!important}'); await p.wait_for_timeout(800)
    big = await p.evaluate("(()=>{const f=s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null};return {seg:f('#subnavOR .seg'),add:f('#addCaseBtn'),search:f('#globalSearch'),title:f('#subnavOR .subnav-title'),name:f('#view-board .or-q-nm b'),ico:document.querySelector('#view-board .or-ico svg').getBoundingClientRect().width}})()")
    ok('Typography · at 200 % text, OR’s bar labels hold at 20 pt or less while names keep growing (the bar had taken two rows of 26 pt labels)',
       big['seg'] <= 20 and big['add'] <= 20 and big['search'] <= 20 and big['title'] <= 17 and big['name'] >= 28, big)
    ok('…and symbols that carry meaning grow with the text (the flags were 14 pt at every size)', big['ico'] >= ico0 * 1.8, (ico0, big['ico']))
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(800)
    sch = await p.evaluate("(()=>{const cut=[...document.querySelectorAll('#view-schedule *')].filter(e=>getComputedStyle(e).textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1).length;return {list:!!document.querySelector('#view-schedule .or-slist'),blocks:document.querySelectorAll('#view-schedule .or-block').length,cut}})()")
    ok('…at large text the Schedule is the list per room, nothing cut short (the timeline’s blocks read “Hemilaminectomy …” and lost the status line)',
       sch['list'] and sch['blocks'] == 0 and sch['cut'] == 0, sch)
    await p.evaluate("document.querySelectorAll('style').forEach(s=>{if(s.textContent.indexOf('font-size:200%')>-1)s.remove()})"); await p.wait_for_timeout(900)
    back = await p.evaluate("({list:!!document.querySelector('#view-schedule .or-slist'),blocks:document.querySelectorAll('#view-schedule .or-block').length})")
    ok('…and back at the default size, the timeline returns by itself', not back['list'] and back['blocks'] >= 6, back)
    await p.click('#switcher [data-view="analytics"]'); await p.wait_for_timeout(500)
    lh = await p.evaluate("(()=>{const e=document.querySelector('.command-kpi__sub');const cs=getComputedStyle(e);return parseFloat(cs.lineHeight)/parseFloat(cs.fontSize)})()")
    ok('…small text that runs to three lines gets body leading (Analytics’ notes were 1.35)', lh >= 1.44, lh)
    ok('…no page errors (text size)', not e, e[:3])
    await c.close()

    # ── Accessibility · touch ──
    for vp, label in (((390, 844), 'iPhone'), ((1180, 820), 'iPad')):
        c, p, e = await open_or(br, vp=vp, touch=True)
        f = await p.evaluate("(()=>{const f=s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null};return {search:f('#globalSearch'),stage:f('#view-board .or-stage'),time:f('#view-board .or-prog-l span'),name:f('#view-board .or-q-nm b')}})()")
        await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
        f['cases'] = await p.evaluate("parseFloat(getComputedStyle(document.getElementById('casesSearch')).fontSize)")
        f['roomtime'] = await p.evaluate("(()=>{const r=document.querySelector('#casesBody .or-roomtime');if(!r)return null;const g=document.createRange();g.selectNodeContents(r);return new Set([...g.getClientRects()].map(x=>Math.round(x.top))).size})()")
        await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(300)
        await p.click('#addCaseBtn'); await p.wait_for_timeout(600)
        f['fields'] = await p.evaluate("[...document.querySelectorAll('.confirm input, .confirm select, .or-field input, .or-field select')].filter(e=>e.getBoundingClientRect().width>0).map(e=>parseFloat(getComputedStyle(e).fontSize))")
        f['labels'] = await p.evaluate("[...document.querySelectorAll('.or-field label')].filter(e=>e.getBoundingClientRect().width>0).map(e=>parseFloat(getComputedStyle(e).fontSize))")
        ok(f'Accessibility · {label}: every field is 16 pt, so iPhone Safari never zooms the page (they were 13 and 15)',
           f['search'] >= 16 and f['cases'] >= 16 and f['fields'] and min(f['fields']) >= 16, f)
        ok(f'…{label}: secondary lines are at least 13 pt (stages, times, field labels were 11–12) and names 16 pt',
           f['stage'] >= 13 and f['time'] >= 13 and f['labels'] and min(f['labels']) >= 13 and f['name'] >= 16, f)
        if label == 'iPad':
            ok('…iPad: Cases keeps “OR 1 · 8:00 AM” on one line (it broke after the room)', f['roomtime'] == 1, f['roomtime'])
        await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
        if label == 'iPhone':
            await p.click('#globalSearch'); await p.keyboard.type('Ma'); await p.wait_for_timeout(700)
            cut = await p.evaluate("[...document.querySelectorAll('#searchResults .sr-t, #searchResults .sr-s')].filter(e=>e.getBoundingClientRect().width>0&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent.slice(0,24))")
            n = await p.evaluate("document.querySelectorAll('#searchResults .sr-t').length")
            ok('…iPhone: suggestions wrap instead of ending in “…” (“Maple · Hemilaminectom…”)', n >= 3 and cut == [], (n, cut))
        ok(f'…no page errors ({label})', not e, e[:3])
        await c.close()
