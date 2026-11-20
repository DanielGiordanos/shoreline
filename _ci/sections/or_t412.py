"""Pravix OR — the n412 build's own checks (Nov 19 2026): HIG Pull-down buttons, The menu bar, Toolbars.
The window title names what's on screen (it was "OR · Pravix", the app's name, everywhere): Board, Schedule, Cases,
Analytics, "<patient> · <tab>" on a case page, "Display mode" on the wall display; signed out it keeps "OR · Pravix".
On an iPhone the case page keeps the next step in its bar and puts Copy link, Share…, Print… and Open Anesia in a More
(•••) pull-down named for the patient (they took two rows above the tabs). iPad and Mac keep every button."""
import core
from core import ok, section
import or_t390 as T

VIS = "(ids)=>ids.map(i=>{const e=typeof i==='string'&&i[0]!=='.'?document.getElementById(i):document.querySelector('#view-case .or-actions '+i);return !!e&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none'})"


@section(id='t412', title='n412 · OR · Pull-down buttons, The menu bar, Toolbars: the window title names what’s on screen; on an iPhone the case page’s secondary actions are in a More pull-down beside the next step',
         apps=['or'], topics=['toolbars', 'menus'], engines=('chromium', 'webkit'))
async def s_t412(br):
    c, p, e = await T.open_or(br)
    titles = []
    for v in ['board', 'schedule', 'cases', 'analytics']:
        await p.evaluate(f"switchView('{v}')"); await p.wait_for_timeout(250)
        titles.append(await p.evaluate("document.title"))
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(600)
    titles.append(await p.evaluate("document.title"))
    await p.click('#caseTabs [data-tab="procedure"]'); await p.wait_for_timeout(300)
    titles.append(await p.evaluate("document.title"))
    await p.evaluate("leaveCase()"); await p.wait_for_timeout(400)
    titles.append(await p.evaluate("document.title"))
    ok('Toolbars · the window title names what’s on screen, not the app (it was “OR · Pravix” everywhere): Board, Schedule, Cases, Analytics, then “Maple · Overview” and “Maple · Procedure” on her case, back to the view on leaving',
       titles == ['Board', 'Schedule', 'Cases', 'Analytics', 'Maple · Overview', 'Maple · Procedure', 'Analytics'], titles)
    await p.evaluate("enterDisplay()"); await p.wait_for_timeout(400)
    disp = await p.evaluate("document.title")
    await p.evaluate("exitDisplay()"); await p.wait_for_timeout(400)
    back = await p.evaluate("document.title")
    await p.evaluate("orLock(true)"); await p.wait_for_timeout(300)   # what the sign-in gate does when it shows
    gate = await p.evaluate("document.title")
    await p.evaluate("orLock(false)"); await p.wait_for_timeout(300)
    ok('…the wall display is “Display mode” (no patient on a shared screen), and with the page locked for sign-in the window keeps “OR · Pravix”',
       disp == 'Display mode' and back == 'Analytics' and gate == 'OR · Pravix', (disp, back, gate))
    errs = list(e)
    await c.close()

    # iPhone
    c, p, e = await T.open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("window.__an=0; window.openAnesia=function(){ window.__an++; }; 0")   # ends on 0: Playwright calls a function it's handed
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(700)
    vis = await p.evaluate(VIS, ['caseCopy', 'caseAnesia', '.or-print-btn', 'caseMore', 'caseAdvance'])
    geo = await p.evaluate("(()=>{const m=document.getElementById('caseMore'),a=document.getElementById('caseAdvance');if(!m||!a)return null;const r=m.getBoundingClientRect(),s=a.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),Math.round(r.top)===Math.round(s.top),r.right<=s.left,m.getAttribute('aria-label'),m.getAttribute('aria-haspopup'),m.getAttribute('aria-expanded')]})()")
    ok('Toolbars (iOS) · on an iPhone the case page shows the next step and More (•••) in one row (Copy link, Print… and Open Anesia took a row of their own above it); More leads, the next step stays a button on the trailing side',
       vis == [False, False, False, True, True] and geo and geo[0] >= 44 and geo[1] >= 44 and geo[2] and geo[3], (vis, geo))
    menu = None
    if geo:
        await p.click('#caseMore'); await p.wait_for_timeout(400)
        menu = await p.evaluate("[document.getElementById('caseMore').getAttribute('aria-expanded'), [...document.querySelectorAll('.pvx-cx-list button')].map(b=>b.querySelector('.l')?b.querySelector('.l').textContent:b.textContent.trim())]")
    ok('Pull-down buttons · More is a pull-down named for the patient (“More actions for Maple”, aria-haspopup menu) with three or more of the case’s commands: Copy link, Print…, Open Anesia (Share… where the system share sheet exists)',
       geo and geo[4] == 'More actions for Maple' and geo[5] == 'menu' and geo[6] == 'false' and menu and menu[0] == 'true' and menu[1][:1] == ['Copy link'] and 'Print…' in menu[1] and 'Open Anesia' in menu[1] and len(menu[1]) >= 3,
       (geo, menu))
    an = None; fx = None
    if menu:
        await p.evaluate("renderCase()"); await p.wait_for_timeout(150)   # a live redraw between opening the menu and choosing
        await p.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>(b.textContent||'').includes('Open Anesia')).click()"); await p.wait_for_timeout(400)
        an = await p.evaluate("window.__an")
        await p.click('#caseMore'); await p.wait_for_timeout(400)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
        fx = await p.evaluate("[document.activeElement&&document.activeElement.id, document.getElementById('caseMore').getAttribute('aria-expanded')]")
    keep = None
    if geo:
        await p.focus('#caseMore'); await p.evaluate("renderCase()"); await p.wait_for_timeout(200)
        k1 = await p.evaluate("document.activeElement.id")
        await p.focus('#caseAdvance'); await p.evaluate("renderCase()"); await p.wait_for_timeout(200)
        keep = [k1, await p.evaluate("document.activeElement.id")]
    ok('…a live redraw of the case header (about every 6 s) keeps focus on the button that had it, More or the next step (it fell to the page)',
       keep == ['caseMore', 'caseAdvance'], keep)
    ok('…each item runs the case page’s own button, also after a live redraw while the menu was open (Open Anesia opened it once), and Esc closes the menu with focus back on More',
       an == 1 and fx == ['caseMore', 'false'], (an, fx))
    errs += list(e)
    await c.close()

    # iPad and Mac keep every button
    keep = {}
    for vp, touch in [((820, 1180), True), ((1440, 900), False)]:
        c, p, e = await T.open_or(br, vp=vp, touch=touch)
        await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(700)
        keep[vp[0]] = await p.evaluate(VIS, ['caseCopy', 'caseAnesia', '.or-print-btn', 'caseMore', 'caseAdvance'])
        errs += list(e)
        await c.close()
    ok('…on an iPad and a Mac every button stays in the bar, with no More', keep.get(820) == [True, True, True, False, True] and keep.get(1440) == [True, True, True, False, True], keep)
    ok('no page errors', not errs, errs)
