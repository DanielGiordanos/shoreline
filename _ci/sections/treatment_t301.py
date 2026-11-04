"""Treatment Sheets — the n301 build's own checks: less style recalculation (claude/treatment-performance-audit-2026-11-01.md, second look).
The root's colour scheme follows a class instead of a :has() on <html>; the grid's cells are born with the keyboard grid's attributes;
the "N earlier" chip, the Undo/Redo group and the toolbar fit write only what changed; n255 re-applies only when the grid changed.
Nothing people see changes. Written with that build; they run in Chromium and WebKit."""
import os
from tsh import *
from core import ok, section, until, PORT, BUILD

MUT = "window.__m={a:0};new MutationObserver(ms=>{for(const m of ms) if(m.type==='attributes') __m.a++}).observe(document.documentElement,{attributes:true,subtree:true})"


@section(id='t301', title='n301 · Treatment Sheets: fewer style recalculations — a class instead of :has() on the root, cells born with their attributes, writes only on change',
         apps=['treatment'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t301(br):
    T = os.path.join(BUILD, 'treatment')
    lc = open(os.path.join(T, 'layers.css'), encoding='utf-8').read(); core = open(os.path.join(T, 'core.js'), encoding='utf-8').read(); src = open(os.path.join(T, 'src/layers.js'), encoding='utf-8').read()
    ok('layers.css sets the root\'s colour scheme from html.pvx-dark, not html:has(body.dark) (which re-evaluated the root on every change of body\'s class list)',
       'html.pvx-dark,body.dark{color-scheme:dark}' in lc and 'html:has(' not in lc, '')
    ok('core.js: the grid\'s marks, row names and "N earlier" chips carry tabindex (and role) in their markup; the chip\'s title, label and hidden are written only when they change; the morph leaves the chip\'s state alone',
       core.count('<button type="button" tabindex="-1" class="mark ') == 2 and '<div class="rl-name" role="button" tabindex="-1"' in core and 'n.title!==ti&&(n.title=ti' in core and 'n.hidden||(n.hidden=!0)' in core and 'k=e.classList&&e.classList.contains("rl-off")' in core, '')
    ok('n255 re-applies the keyboard grid only when the grid changed, measures each control once, and fitBar skips a bar that hasn\'t changed; n266 writes only what changed',
       'function gridTouched(ms)' in src and 'X.set(e,e.getBoundingClientRect().left)' in src and 'if(sig===fitSig) return;' in src and "var sa=function(e,k,v)" in src, '')
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.wait_for_timeout(1200)
    cs = await pg.evaluate("[document.documentElement.classList.contains('pvx-dark'), getComputedStyle(document.documentElement).colorScheme, document.body.classList.contains('dark')]")
    await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(400)
    cs2 = await pg.evaluate("[document.documentElement.classList.contains('pvx-dark'), getComputedStyle(document.documentElement).colorScheme, document.body.classList.contains('dark')]")
    await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(400)
    ok('the root\'s colour scheme still follows the theme: dark with body.dark, light after a switch, dark again after switching back',
       cs == [True, 'dark', True] and cs2 == [False, 'light', False] and (await pg.evaluate("getComputedStyle(document.documentElement).colorScheme")) == 'dark', [cs, cs2])
    tb = await pg.evaluate("(()=>{const m=[...document.querySelectorAll('#sheetInner .mark')];const n=[...document.querySelectorAll('#sheetInner .rl-name')];return [m.length, m.filter(x=>x.getAttribute('tabindex')==='-1').length, m.filter(x=>x.getAttribute('tabindex')==='0').length, n.length, n.filter(x=>x.getAttribute('role')==='button'&&x.getAttribute('tabindex')==='-1'&&/order details$/.test(x.getAttribute('aria-label')||'')).length]})()")
    ok('the grid is still one Tab stop: every mark but the current one is tabindex −1 (now from the markup), and every row name is a named button', tb[0] > 20 and tb[1] + tb[2] == tb[0] and tb[2] <= 1 and tb[3] > 10 and tb[4] == tb[3], tb)
    await pg.evaluate(MUT)
    tid = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Temperature/i.test(t.order.name));return t?t.id:null})()")
    await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(600); await pg.fill('#cd-value', '101.5'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
    mu = await pg.evaluate("__m.a")
    v = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>t.id==='" + str(tid) + "');return t?t.status:null})()")
    ok('charting one value changes under 700 attributes on the page (it changed ~1,100: tabindex on every cell, the chips\' titles, the toolbar\'s data-fit); the value is charted', mu < 700 and v == 'completed', [mu, v])
    off = await pg.evaluate("(()=>{const o=[...document.querySelectorAll('#sheetInner .rl-off')];return [o.length, o.filter(b=>!b.hidden).length, o.filter(b=>!b.hidden&&/overdue earlier today/.test(b.title)).length]})()")
    ok('the "N earlier" chips still show for rows with overdue treatments scrolled out of view, with their titles (the morph no longer undoes them each render)', off[0] > 0 and off[1] == off[2], off)
    ok('no page errors', not e, e[:3])
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, vp=(1180, 820), touch=True, view='sheet')
    await pg.wait_for_timeout(1200)
    ur = await pg.evaluate("(()=>{const g=document.querySelector('#ctab-sheet .pvx-ur');return g?[g.hidden, g.querySelector('.pvx-u').getAttribute('aria-label')]:null})()")
    tid = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Heart/i.test(t.order.name));return t?t.id:null})()")
    await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(600); await pg.fill('#cd-value', '120'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
    ur2 = await pg.evaluate("(()=>{const g=document.querySelector('#ctab-sheet .pvx-ur');return g?[g.hidden, g.querySelector('.pvx-u').getAttribute('aria-label'), g.querySelector('.pvx-u').title]:null})()")
    ok('iPad: the Undo button still appears after a charted value, named for the step (n266), written only when it changed', ur and ur[0] is True and ur2 and ur2[0] is False and ur2[1].startswith('Undo ') and ur2[2] == ur2[1], [ur, ur2])
    ok('no page errors (iPad)', not e, e[:3])
    await ctx.close()
