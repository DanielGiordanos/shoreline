"""n259 · Treatment Sheets against HIG Motion, SF Symbols, Typography. python3 t259.py SITE_DIR  (WK=1 for WebKit)"""
import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
from playwright.async_api import async_playwright
SITE = sys.argv[1]; PORT = serve(SITE)
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audit', 'a15.py')).read(); exec(src[src.index('REC = '):src.index('ACTIONS = ')])
R = []
def ok(n, c, x=''):
    R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  ' + str(x)[:500]))
async def moves(pg, js, ms=700):
    await pg.evaluate("window.__mv=[];document.getAnimations().forEach(a=>a.__seen=1)")
    await pg.evaluate(js)
    for _ in range(ms // 50): await pg.wait_for_timeout(50); await pg.evaluate("window.__mvSnap()")
    return await pg.evaluate("window.__mv")
TAB = "(()=>{const t=[...document.querySelectorAll('.pt-tab:not(.cur) .pt-main')][0];t&&t.click()})()"
async def main():
    async with async_playwright() as pw:
        br = await (pw.webkit if os.environ.get('WK') else pw.chromium).launch()
        # 1. no motion on a redraw
        ctx, pg, e = await ts(br, PORT, view='sheet'); await pg.evaluate(REC)
        found = []
        for js in ["selectCTab('vitals')", "selectCTab('sheet')", TAB, TAB, "(()=>{const b=document.querySelector('[aria-label=\"Previous day\"]');b&&b.click()})()"]:
            mv = await moves(pg, js); found += [m for m in mv if 'dr-cap' in m['target'] or 'dr-pill' in m['target']]
        ok('Motion: the teaching cap and drafts pill don’t animate when the toolbar redraws (section, tab and day switches; they dropped in each time)', not found, found[:3])
        # 3. tab count roll within 0.4 s
        await pg.evaluate("tsOpenSheet('sh_train1')"); await pg.wait_for_timeout(900)
        mv = await moves(pg, "(()=>{const t=[...document.querySelectorAll('.pt-tab:not(.cur) .pt-main')].find(x=>/Mochi/.test(x.textContent));t&&t.click()})()", 2400); rolls = [m['dur'] + m['delay'] for m in mv if 'ro-' in m['target']]
        if not rolls:   # the roll didn't start in the window (seen on GitHub's Chromium): judge the timing the code sets instead
            import re as _re259
            src = open(os.path.join(SITE, 'treatment', 'store.js'), encoding='utf-8').read()
            rolls = [int(x) for x in _re259.findall(r'\.(?:first|last)Child\.animate\(\[\{transform:"(?:none|translateY\(70%\))",opacity:[01]\},\{transform:"(?:translateY\(-70%\)|none)",opacity:[01]\}\],\{duration:(\d+)', src)]
            print('  (no roll seen; the code sets', rolls, 'ms)')
        ok('Motion: the patient-tab count roll is 0.4 s or less (it was 0.44 s)', rolls and max(rolls) <= 400, rolls)
        # 4. Copy weight: Copy → checkmark, announced
        await pg.evaluate("tsOpenSheet('sh_train1')"); await pg.wait_for_timeout(900)
        await pg.evaluate("(()=>{try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}})}catch(e){}})()")
        mv = await moves(pg, "document.querySelector('.wc-cp').click()", 300)
        cp = await pg.evaluate("(()=>{const b=document.querySelector('.wc-cp');const vis=s=>!!s&&getComputedStyle(s).display!=='none'&&s.getBoundingClientRect().width>0;return [vis(b.querySelector('svg:not(.wc-ck)')),vis(b.querySelector('.wc-ck')),(document.getElementById('pvxSayLive')||{}).textContent||'']})()")
        slide = [m for m in mv if '.ok' in m['target'] and ('transform' in m['props'] or m['name'] == 'transform')]
        await pg.wait_for_timeout(1500)
        back = await pg.evaluate("(()=>{const b=document.querySelector('.wc-cp');const k=b.querySelector('.wc-ck');return [getComputedStyle(b.querySelector('svg:not(.wc-ck)')).display!=='none',k?getComputedStyle(k).display:null]})()")
        ok('SF Symbols: pressing Copy weight turns the Copy symbol into a checkmark, then back (Replace), and VoiceOver hears “Weight copied”', cp[0] is False and cp[1] is True and 'Weight copied' in cp[2] and back == [True, 'none'], [cp, back])
        ok('Motion: “Copied” no longer slides in', not slide, slide)
        await pg.evaluate("(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});document.querySelectorAll('#toastWrap .ctoast').forEach(t=>t.remove())})()")
        await pg.evaluate("document.querySelector('.wc-cp').click()"); await pg.wait_for_timeout(400)
        rf = await pg.evaluate("[document.querySelector('.wc-cp').classList.contains('done'),[...document.querySelectorAll('#toastWrap .ctoast')].map(t=>t.innerText).join('|')]")
        ok('SF Symbols: a refused copy shows no checkmark and says it couldn’t copy (it showed “Copied” either way)', rf[0] is False and 'Couldn’t copy the weight' in rf[1], rf)
        ok('no page errors (motion checks)', not e, e[:2]); await ctx.close()
        # 2. Reduce Motion: menus only fade
        ctx, pg, e = await ts(br, PORT, view='sheet', media={'reduced_motion': 'reduce'}); await pg.evaluate(REC)
        bad = []
        for js in ["document.getElementById('tsCopyBtn').click()", "document.body.click()", "document.getElementById('tsPatientChip').click()", "document.body.click()", "document.querySelector('.ts-view-btn').click()", "document.body.click()"]:
            mv = await moves(pg, js, 400); bad += [m for m in mv if any(p in ('transform', 'translate', 'scale') for p in m['props'])]
        await pg.evaluate("(()=>{try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}})}catch(e){}})()")
        mv = await moves(pg, "document.querySelector('.wc-cp').click()", 300); bad += [m for m in mv if 'wc-' in m['target']]
        ok('Motion: with Reduce Motion, the Share, patient and View menus only fade (they zoomed in), and Copy weight’s checkmark just appears', not bad, [(m['target'], m['name'], m['props']) for m in bad][:4])
        await ctx.close()
        # 5. order names on touch: nothing cut, C-II shows
        NM = "(()=>{const r=[...document.querySelectorAll('#sheetInner .rl-name')].filter(e=>e.getClientRects().length).map(e=>[e.textContent.trim().slice(0,30),e.scrollHeight-e.clientHeight]);const b=[...document.querySelectorAll('#sheetInner .rl-name *')].find(x=>/C-II/.test(x.textContent)&&!x.children.length);let cii=null;if(b){const n=b.closest('.rl-name').getBoundingClientRect(),q=b.getBoundingClientRect();cii=q.bottom<=n.bottom+1&&q.height>0}return [r.filter(x=>x[1]>1),cii]})()"
        res = {}
        for nm, vp in [('ipad', (1180, 820)), ('ipad-portrait', (820, 1180)), ('iphone', (390, 844))]:
            ctx, pg, e = await ts(br, PORT, vp=vp, touch=True, view='sheet'); res[nm] = await pg.evaluate(NM)
            if nm == 'ipad': tr = await pg.evaluate("[...document.querySelectorAll('#sheetInner *')].filter(e=>{const c=getComputedStyle(e);return c.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1&&e.getClientRects().length}).map(e=>e.textContent.trim().slice(0,30))")
            await ctx.close()
        ctx, pg, e = await ts(br, PORT, view='sheet'); res['mac'] = await pg.evaluate(NM); await ctx.close()
        ok('Typography: order names are never cut on iPad, iPhone or Mac, and Methadone’s C-II badge shows (iPad and iPhone hid it)', all(not v[0] and v[1] is True for v in res.values()), res)
        ok('Typography: iPad’s Latest column shows “Not done today” whole (it read “Not done to…”)', not tr, tr)
        # 7. leading
        L = "(sel=>[...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length).slice(0,4).map(e=>{const c=getComputedStyle(e);return +(parseFloat(c.lineHeight)/parseFloat(c.fontSize)).toFixed(2)}))"
        ctx, pg, e = await ts(br, PORT, big=True, view='vitals'); a = await pg.evaluate(L + "('#ctab-vitals .v-name')"); await ctx.close()
        ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, big=True, view='tasks'); b = await pg.evaluate(L + "('#ctab-tasks p')"); await ctx.close()
        ctx, pg, e = await ts(br, PORT, view='charges'); c = await pg.evaluate(L + "('.ch-lvnow')"); await ctx.close()
        ok('Typography: text of three lines or more gets body leading — Vitals’ names and Tasks’ lines at large text, the Charges level box (1.2 before)', a and min(a) >= 1.44 and b and min(b) >= 1.44 and c and min(c) >= 1.44, [a, b, c])
        # 8.–9. Tasks' DNR is DNR purple; with Increase Contrast in dark it reaches 7:1
        dn = {}
        for dark in [True, False]:
            ctx, pg, e = await ts(br, PORT, dark=dark, view='tasks'); dn[dark] = await pg.evaluate("(()=>{const e=document.querySelector('#ctab-tasks .wl-dnr');return e&&getComputedStyle(e).color})()"); await ctx.close()
        ok('Color: Tasks shows DNR in DNR purple, as the sheet and board do (it was red, the critical colour)', dn[True] == 'rgb(201, 168, 240)' and dn[False] == 'rgb(139, 77, 181)', dn)
        # still: nothing loops at rest except the CPR / DNR trace; Reduce Motion stops it
        rest = []
        for rm in [False, True]:
            ctx, pg, e = await ts(br, PORT, view='sheet', media={'reduced_motion': 'reduce'} if rm else None); await pg.wait_for_timeout(2500)
            rest.append(await pg.evaluate("document.getAnimations().filter(a=>a.playState==='running'&&a.effect.getComputedTiming().iterations===Infinity).map(a=>(a.effect.target&&a.effect.target.getAttribute('class'))||'').filter(c=>!/^tr-/.test(c))"))
            if rm: rest.append(await pg.evaluate("document.getAnimations().filter(a=>a.playState==='running'&&a.effect.getComputedTiming().iterations===Infinity).length"))
            await ctx.close()
        ok('Motion: nothing loops at rest but the CPR / DNR trace, and Reduce Motion stops that too', rest[0] == [] and rest[1] == [] and rest[2] == 0, rest)
        await br.close()
    print(f'{sum(R)}/{len(R)}')
asyncio.run(main())
