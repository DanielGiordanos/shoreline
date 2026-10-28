"""n255 · Treatment Sheets against HIG Design principles, Accessibility, Color, Layout. python3 t255.py SITE_DIR  (WK=1 for WebKit)"""
import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
from playwright.async_api import async_playwright
SITE = sys.argv[1]; PORT = serve(SITE)
R = []
def ok(n, c, x=''):
    R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  ' + str(x)[:500]))
LUM = "const L=c=>{const m=String(c).match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};"
OVC = """(()=>{let n=0,bad=0;document.querySelectorAll('#sheetInner .rl-off:not([hidden])').forEach(o=>{if(!o.getClientRects().length)return;n++;const r=o.getBoundingClientRect();const L=o.closest('.rl').getBoundingClientRect();if(r.right>L.right+0.5||r.left<L.left-0.5)bad++});return [n,bad]})()"""
FOC = "(()=>{const e=document.activeElement;return e?{t:e.tagName,c:String(e.className),l:e.getAttribute('aria-label')||'',inGrid:!!e.closest('#sheetInner'),dt:e.getAttribute('data-t')||'',row:(e.closest('.grow')||{}).dataset?(e.closest('.grow').dataset.id||[...document.querySelectorAll('#sheetInner .grow')].indexOf(e.closest('.grow'))):null}:null})()"
async def main():
    async with async_playwright() as pw:
        br = await (pw.webkit if os.environ.get('WK') else pw.chromium).launch()
        WK = bool(os.environ.get('WK'))
        # ── Mac, dark ──
        ctx, pg, errs = await ts(br, PORT, view='sheet')
        await pg.evaluate("(()=>{const s=document.getElementById('sheetScroll');s.scrollLeft=s.scrollWidth;s.dispatchEvent(new Event('scroll'))})()"); await pg.wait_for_timeout(500)
        ov = await pg.evaluate(OVC)
        ok('"‹ 5" sits in the name area and never covers a cell (Mac)', ov[0] >= 1 and ov[1] == 0, ov)
        await pg.evaluate("(()=>{const s=document.getElementById('sheetScroll');s.scrollLeft=0;s.dispatchEvent(new Event('scroll'))})()"); await pg.wait_for_timeout(300)
        k = await pg.evaluate("[tsToastKind('Yakuri’s drug library didn’t load. Type each dose yourself.'),tsToastKind('Note saved'),tsToastKind('Couldn’t save — try again')]")
        ok('Feedback: a "didn\'t load" message has the warning symbol, not the success check (success and failure unchanged)', k == ['warn', '', 'err'], k)
        g = await pg.evaluate("""(()=>{const g=document.getElementById('sheetInner');const f=[...g.querySelectorAll('button,[tabindex],a[href]')].filter(e=>e.getClientRects().length&&e.tabIndex>=0);
          return {zero:f.length,cur:f[0]?f[0].className:'',marks:g.querySelectorAll('.mark').length,hint:(document.getElementById(f[0]&&f[0].getAttribute('aria-describedby'))||{}).textContent||''}})()""")
        ok('Keyboard: the grid is one Tab stop (it was one per cell), starting on a mark, and it says the arrow keys move', g['zero'] == 1 and 'mark' in g['cur'] and 'Arrow keys' in g['hint'], g)
        # tab in from the search, then one more Tab leaves the grid
        await pg.evaluate("document.querySelector('#tsSecNav .sn-chip:last-child')&&[...document.querySelectorAll('#tsSecNav .sn-chip')].pop().focus()")
        seq = []
        for i in range(6):
            await pg.keyboard.press('Tab'); await pg.wait_for_timeout(40); seq.append(await pg.evaluate(FOC))
        ing = [s['inGrid'] for s in seq]
        first = ing.index(True) if True in ing else -1
        ok('Keyboard: Tab enters the grid once and the next Tab leaves it', first >= 0 and (first + 1 < len(ing)) and not ing[first + 1] and sum(ing) == 1, [(s['c'][:20], s['inGrid']) for s in seq])
        await pg.evaluate("document.querySelector('#sheetInner [tabindex=\"0\"]').focus()")
        a0 = await pg.evaluate(FOC)
        await pg.keyboard.press('ArrowRight'); a1 = await pg.evaluate(FOC)
        await pg.keyboard.press('ArrowDown'); a2 = await pg.evaluate(FOC)
        await pg.keyboard.press('Home'); a3 = await pg.evaluate(FOC)
        await pg.keyboard.press('End'); a4 = await pg.evaluate(FOC)
        tz = await pg.evaluate("[...document.querySelectorAll('#sheetInner [tabindex=\"0\"]')].length")
        ok('Keyboard: Right moves to the next cell, Down to the next row, Home / End to the row\'s ends; one Tab stop throughout',
           a1['l'] != a0['l'] and 'mark' in a1['c'] and a2['row'] != a1['row'] and 'rl-grip' in a3['c'] and 'mark' in a4['c'] and tz == 1, [a0['l'][:30], a1['l'][:30], a2['l'][:30], a3['c'][:20], a4['l'][:30], tz])
        await pg.evaluate("document.querySelector('#sheetInner .mark.overdue').focus()")
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(700)
        op = await pg.evaluate("!!document.querySelector('#completionDrawer.open')")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
        back = await pg.evaluate(FOC)
        ok('Keyboard: Return on a cell opens it, Escape closes it and focus comes back to the cell', op and back and 'mark' in back['c'], (op, back))
        nb = await pg.evaluate("(()=>{const n=document.querySelector('#sheetInner .rl-name[role=button]');return n?[n.getAttribute('tabindex'),n.getAttribute('aria-label')]:null})()")
        await pg.evaluate("document.querySelector('#sheetInner .rl-name[role=button]').focus()"); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(800)
        od = await pg.evaluate("(()=>{const s=document.getElementById('tsOrderSheet');return !!(s&&s.classList.contains('show'))})()")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700)
        ok('Order details opens from the keyboard: the row name is a button ("Temperature, order details")', nb and nb[1].startswith('Temperature') and 'order details' in nb[1] and od, (nb, od))
        st = await pg.evaluate("(()=>{const s=document.getElementById('tsOrderSheet');return [s.hasAttribute('inert'),s.getAttribute('aria-hidden')]})()")
        ok('A closed order-sheet dialog leaves the accessibility tree (inert, aria-hidden)', st == [True, 'true'], st)
        # grip keeps Up / Down for reordering
        await pg.evaluate("document.querySelector('#sheetInner .rl-grip').focus()")
        await pg.keyboard.press('ArrowRight'); r1 = await pg.evaluate(FOC)
        ok('The reorder grip still takes Up / Down (Right moves on to the next control)', r1 and not 'rl-grip' in r1['c'] and r1['inGrid'], r1)
        sk = await pg.evaluate("(()=>{const a=document.body.firstElementChild;return a&&a.classList.contains('pvx-skip')?a.textContent:null})()")
        await pg.evaluate("document.querySelector('.pvx-skip').click()"); await pg.wait_for_timeout(300)
        sf = await pg.evaluate(FOC)
        ok('"Skip to the treatment sheet" is the first thing on the page and lands in the grid', sk == 'Skip to the treatment sheet' and sf and sf['inGrid'], (sk, sf))
        mains = await pg.evaluate("document.querySelectorAll('main:not([role]),[role=main]').length")
        reg = await pg.evaluate("(()=>{const m=document.querySelector('main.treatment-main');return m?[m.getAttribute('role'),m.getAttribute('aria-label')]:null})()")
        ok('One main landmark; the sheet is a region named "Treatment sheet"', mains == 1 and reg == ['region', 'Treatment sheet'], (mains, reg))
        # Share in the toolbar, menu downward
        sh = await pg.evaluate("(()=>{const b=document.getElementById('tsCopyBtn');return b?[!!b.closest('.treatment-toolbar'),!!b.closest('#legend'),b.getAttribute('aria-label'),document.querySelectorAll('#tsCopyBtn').length]:null})()")
        await pg.evaluate("document.getElementById('tsCopyBtn').click()"); await pg.wait_for_timeout(300)
        mp = await pg.evaluate("(()=>{const m=document.getElementById('tsCopyMenu'),b=document.getElementById('tsCopyBtn');return m?[Math.round(m.getBoundingClientRect().top),Math.round(b.getBoundingClientRect().bottom),Math.round(b.getBoundingClientRect().top),innerHeight]:null})()")
        await pg.keyboard.press('Escape')
        ok('Share is in the sheet toolbar (not the bottom edge) and its menu opens downward', sh and sh[0] and not sh[1] and sh[2] == 'Share' and sh[3] == 1 and mp and mp[0] >= mp[1] and mp[2] < 600, (sh, mp))
        oc = await pg.evaluate(LUM + """(()=>{const o=document.querySelector('#sheetInner .mark.overdue .od');const c=getComputedStyle(o);const l=getComputedStyle(o.querySelector('.od-late'));return CR(l.color,c.backgroundColor)})()""")
        ok('Overdue pill: label and clock at least 4.5:1 on the amber in dark (white was 2.0:1)', oc >= 4.5, oc)
        ad = await pg.evaluate("(()=>{selectCTab('dash');return 1})()"); await pg.wait_for_timeout(800)
        al = await pg.evaluate("[...document.querySelectorAll('#ctab-dash .pvx-alb')].map(e=>e.getAttribute('aria-label')||e.closest('[aria-label]')&&e.closest('[aria-label]').getAttribute('aria-label'))")
        alv = await pg.evaluate("[...document.querySelectorAll('#ctab-dash [aria-label^=\"Add alert for\"],#ctab-dash [aria-label^=\"Alerts for\"]')].map(e=>[e.getAttribute('aria-label'),(e.innerText||'').trim()])")
        ok('Add alert\'s label starts with its visible words (Voice Control "tap Add alert")', alv and all((v[0].startswith('Add alert') and 'Add alert' in v[1]) or v[0].startswith('Alerts for') for v in alv) and any(v[0].startswith('Add alert') for v in alv), alv)
        ok('Mac: no page errors', not errs, errs[:3])
        for vp2 in [(1440, 900), (1280, 800)]:
            c8, p8, e8 = await ts(br, PORT, vp=vp2, view='sheet')
            await p8.evaluate("(()=>{const d=document.querySelector('#ctab-sheet .ts-daynav');if(d&&!d.querySelector('.dn-late')){const b=document.createElement('button');b.type='button';b.className='dn-late';b.textContent='14 from last night';d.appendChild(b)}})()")
            await p8.wait_for_timeout(1200)
            fb = await p8.evaluate("""(()=>{const t=document.querySelector('#ctab-sheet .treatment-toolbar');const r=t.getBoundingClientRect(),edge=r.right-parseFloat(getComputedStyle(t).paddingRight)+0.5;
              const out=[...t.children].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().right>edge).map(e=>e.className);return {fit:t.getAttribute('data-fit'),out,anim:document.getAnimations().filter(a=>a.transitionProperty).length}})()""")
            ok(f'{vp2[0]} Mac with "N from last night": every toolbar control is inside the window (Share, then View, shrink to symbols, then it wraps), and nothing keeps animating', not fb['out'] and fb['anim'] == 0, fb)
            await c8.close()
        await ctx.close()
        # light + Increase Contrast pill
        res = []
        for dark in [False, True]:
            for ic in [None, {'contrast': 'more'}]:
                c2, p2, e2 = await ts(br, PORT, view='sheet', dark=dark, media=ic)
                res.append(await p2.evaluate(LUM + """(()=>{const o=document.querySelector('#sheetInner .mark.overdue .od');const c=getComputedStyle(o);const l=getComputedStyle(o.querySelector('.od-late'));return +CR(l.color,c.backgroundColor).toFixed(2)})()"""))
                if not dark and not ic:
                    k2 = await p2.evaluate("(()=>{const k=[...document.querySelectorAll('.wc-der .k')].map(x=>getComputedStyle(x).color);return k})()")
                    ok('Light: BSA / RER labels are secondary text, not teal', k2 and all(x != 'rgb(23, 115, 138)' for x in k2), k2)
                await c2.close()
        ok('Overdue pill: ≥ 4.5:1 in light and dark, and higher still with Increase Contrast', res[0] >= 4.5 and res[2] >= 4.5 and res[1] > res[0] and res[3] > res[2], res)
        # touch: hit areas
        HIT = """((sel,need)=>{const out=[];[...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length).slice(0,3).forEach(e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
           if(cy-need/2<0||cy+need/2>innerHeight-60)return;const hit=(x,y)=>{const el=document.elementFromPoint(x,y);return el&&(el===e||e.contains(el))};const v=hit(cx,cy-need/2+1)&&hit(cx,cy+need/2-1);const h=r.width>=need-1||(hit(cx-need/2+1,cy)&&hit(cx+need/2-1,cy));out.push([Math.round(r.width),Math.round(r.height),v,h])});return out})"""
        for nm, vp, touch, need in [('iPad', (1180, 820), True, 44), ('Mac', (1440, 900), False, 28)]:
            got = {}
            c3, p3, e3 = await ts(br, PORT, vp=vp, touch=touch, view='sheet')
            if touch:
                await p3.evaluate("(()=>{const s=document.getElementById('sheetScroll');s.scrollLeft=s.scrollWidth;s.dispatchEvent(new Event('scroll'))})()"); await p3.wait_for_timeout(500)
                ov2 = await p3.evaluate(OVC)
                ok('iPad: "‹ 5" never covers a cell (it hid the 7 PM clock)', ov2[0] >= 1 and ov2[1] == 0, ov2)
            await p3.evaluate("selectCTab('charges')"); await p3.wait_for_timeout(700)
            got['Charges day check'] = await p3.evaluate(HIT + f"('.ch-ck',{need})")
            got['Set price'] = await p3.evaluate(HIT + f"('.ch-price',{need})")
            await p3.evaluate("selectCTab('dash')"); await p3.wait_for_timeout(700)
            got['tech name'] = await p3.evaluate(HIT + f"('#ctab-dash .tm-p.tm-tech',{need})")
            got['Add alert'] = await p3.evaluate(HIT + f"('#ctab-dash .c-alerts .pvx-alb',{need})")
            await p3.evaluate("selectCTab('sheet')"); await p3.wait_for_timeout(700)
            got['Problem list +'] = await p3.evaluate(HIT + f"('.pl-plus',{need})")
            if touch:
                await p3.evaluate("selectCTab('tasks')"); await p3.wait_for_timeout(700)
                got['Done'] = await p3.evaluate(HIT + "('#ctab-tasks .wl-done',44)")
                await p3.evaluate("selectCTab('vitals')"); await p3.wait_for_timeout(700)
                got['Record'] = await p3.evaluate(HIT + "('#ctab-vitals .v-rec',44)")
            bad = {k: v for k, v in got.items() if not v or not all(x[2] and x[3] for x in v)}
            ok(f'{nm}: hit areas are at least {need} pt (Charges checks, Set price, tech, Add alert, Problem list +' + (', Done, Record' if touch else '') + ')', not bad, bad)
            if touch:
                await p3.evaluate("selectCTab('sheet')"); await p3.wait_for_timeout(700)
                cl = await p3.evaluate("""(()=>{const m=document.querySelector('#sheetInner .mark.overdue');m.scrollIntoView({block:'center',inline:'center'});const c=m.closest('.cell').getBoundingClientRect(),r=m.getBoundingClientRect();return [c.left+c.width/2,c.top+2,r.top-c.top]})()""")
                await p3.mouse.click(cl[0], cl[1]); await p3.wait_for_timeout(700)
                o2 = await p3.evaluate("!!document.querySelector('#completionDrawer.open')")
                ok('iPad: a mark answers anywhere in its cell (a tap at the cell\'s top edge opens it)', o2 and cl[2] > 4, (o2, cl))
            ok(f'{nm}: no page errors', not e3, e3[:3])
            await c3.close()
        # iPhone
        c4, p4, e4 = await ts(br, PORT, vp=(390, 844), touch=True, view='sheet')
        ip = await p4.evaluate("""(()=>{const o=[...document.querySelectorAll('#sheetInner .rl-off:not([hidden])')].filter(x=>x.getClientRects().length);const n=[...document.querySelectorAll('#sheetInner .rl-name')].slice(0,10);
          const tb=document.querySelector('#ctab-sheet .treatment-toolbar #tsCopyBtn');return {inMeta:o.length&&o.every(x=>x.closest('.rl-meta')),n:o.length,widths:n.map(x=>Math.round(x.getBoundingClientRect().width)),share:tb?[Math.round(tb.getBoundingClientRect().width),getComputedStyle(tb).fontSize]:null}})()""")
        ok('iPhone: "‹ 6" sits at the end of the meta line, so order names keep their width (≥ 100 pt, they broke mid-word at 87)', ip['n'] >= 1 and ip['inMeta'] and min(ip['widths']) >= 100, ip)
        ok('iPhone: Share is an icon in the toolbar (its word hidden, the label still says Share)', ip['share'] and ip['share'][1] == '0px' and ip['share'][0] <= 64, ip['share'])
        tb = await p4.evaluate("""(()=>{const t=document.querySelector('#ctab-sheet .treatment-toolbar');const k=[...t.children].filter(x=>x.getBoundingClientRect().width>0);const rows=new Set(k.map(x=>Math.round(x.getBoundingClientRect().top/10))).size;
          const l=t.querySelector('.dn-late');const lr=l&&l.getBoundingClientRect();const m=t.querySelector('.dn-mid');const q=t.querySelector('.order-search-wrapper').getBoundingClientRect();
          return {rows,late:l?[Math.round(lr.left),Math.round(lr.right),innerWidth,getComputedStyle(l).color]:null,mid:m?[m.innerText.trim(),m.getAttribute('aria-label')||m.textContent]:null,search:Math.round(q.width)}})()""")
        ok('iPhone: the sheet toolbar is 4 rows with "N from last night" (5 before, and that button ran off the edge), and on screen in amber', (tb['rows'] <= 4 and tb['late'] and tb['late'][0] >= 0 and tb['late'][1] <= tb['late'][2] and tb['late'][3] != 'rgb(255, 255, 255)') or (tb['late'] is None and tb['rows'] <= 3), tb)   # the button shows only while last night's doses are uncharted
        ok('iPhone: the day button reads "Today" (its label keeps the date) and the search keeps the row\'s width', tb['mid'] and tb['mid'][0] == 'Today' and 'Today ·' in tb['mid'][1] and tb['search'] >= 240, tb)
        ok('iPhone: no page errors', not e4, e4[:3])
        await c4.close()
        # 200 % text: hour headings don't run together
        c5, p5, e5 = await ts(br, PORT, big=True, view='sheet')
        hl = await p5.evaluate("""(()=>{const h=[...document.querySelectorAll('#sheetInner .hcell .hl')].filter(x=>x.getClientRects().length).map(x=>x.getBoundingClientRect());let o=0;for(let i=1;i<h.length;i++)if(h[i].left<h[i-1].right-1&&Math.abs(h[i].top-h[i-1].top)<4)o++;return [h.length,o,tsFsK()]})()""")
        ok('200 % text: the hour columns grow with the text, so their headings don\'t run together', hl[0] > 3 and hl[1] == 0 and hl[2] == 2, hl)
        nv = await p5.evaluate("(()=>{const n=document.querySelector('#tsPatientChip .nm');return [document.documentElement.classList.contains('pvx-snav-icons'),n.scrollWidth<=n.clientWidth+1,[...document.querySelectorAll('#clinSwitcher .seg')].every(s=>s.title&&s.textContent.trim())]})()")
        ok('200 % text: the section tabs become symbols (named for VoiceOver, with tooltips) so the patient switcher shows the whole name', nv == [True, True, True], nv)
        await c5.close()
        c7, p7, e7 = await ts(br, PORT, view='sheet')
        nv2 = await p7.evaluate("(()=>{const n=document.querySelector('#tsPatientChip .nm');return [document.documentElement.classList.contains('pvx-snav-icons'),n.scrollWidth<=n.clientWidth+1,getComputedStyle(document.querySelector('#clinSwitcher .seg')).fontSize]})()")
        ok('Normal text on Mac: the tabs keep their words', nv2[0] is False and nv2[1] and nv2[2] != '0px', nv2)
        await c7.close()
        # focus ring on Add a problem; charge dialog gives focus back
        c6, p6, e6 = await ts(br, PORT, view='sheet')
        await p6.evaluate("document.querySelector('.pl-plus').focus()"); await p6.keyboard.press('Tab'); await p6.wait_for_timeout(150)
        fr = await p6.evaluate("(()=>{const e=document.activeElement;const c=getComputedStyle(e);return [e.tagName,e.placeholder||'',c.outlineStyle,c.outlineWidth]})()")
        if fr[0] != 'INPUT':
            await p6.evaluate("document.querySelector('.pl-add input').focus()"); await p6.keyboard.press('Shift+Tab'); await p6.keyboard.press('Tab'); await p6.wait_for_timeout(150)
            fr = await p6.evaluate("(()=>{const e=document.activeElement;const c=getComputedStyle(e);return [e.tagName,e.placeholder||'',c.outlineStyle,c.outlineWidth]})()")
        ok('"Add a problem" shows a focus ring', fr[0] == 'INPUT' and fr[2] == 'solid', fr)
        await p6.evaluate("selectCTab('charges')"); await p6.wait_for_timeout(700)
        await p6.evaluate("(()=>{const b=[...document.querySelectorAll('#ctab-charges button')].find(b=>/Add charge/.test(b.textContent));b.focus();b.click()})()"); await p6.wait_for_timeout(800)
        await p6.keyboard.press('Escape'); await p6.wait_for_timeout(800)
        cf = await p6.evaluate("(()=>{const e=document.activeElement;return [e.tagName,(e.textContent||'').trim().slice(0,20)]})()")
        ok('Add a charge: Escape gives focus back to the Add charge button (it went to the page)', cf[0] == 'BUTTON' and 'Add charge' in cf[1], cf)
        if not WK:
            snap = await p6.accessibility.snapshot()
            txt = json.dumps(snap)
            ok('Closed dialogs aren\'t read by VoiceOver (the charge dialog\'s fields are gone from the accessibility tree)', 'Find a charge by code or name' not in txt, '')
        # message with an action lasts and pauses
        ta = await p6.evaluate("typeof toastAct==='function'")
        if ta:
            await p6.evaluate("toastAct('Test was discharged','Close tab',function(){})"); await p6.wait_for_timeout(5200)
            still = await p6.evaluate("[...document.querySelectorAll('.ctoast')].some(t=>/Test was discharged/.test(t.textContent))")
            ok('A message with an action stays past 5 s (it went at 4.2 s)', still, still)
        else:
            src = open(os.path.join(SITE, 'treatment/store.js'), encoding='utf-8').read()
            ok('A message with an action lasts 8 s and pauses on hover / focus (pvxToastLife)', 'pvxToastLife(o,8e3,!0)' in src, '')
        ok('no page errors (focus, charges)', not e6, e6[:3])
        await c6.close()
        await br.close()
    print(f'{sum(R)}/{len(R)}')
asyncio.run(main())
