"""Pravix OR — the n408 build's own checks (Nov 18 2026): HIG Activity views, Buttons, Context menus.
Context menus: a case on the Board, a block on the Schedule and a row in Cases have the shared Pravix menu (PvxCtx), named
for the patient, holding only what applies (the next step only when it can be taken), each item also in the main
interface; it works by right-click and the keyboard, Esc closes it and leaves the details open, the wall display has
none, a phone gets an action sheet with Cancel. Buttons: every button has a press state (darker, 97 % for 0.1 s; rows,
cards and tabs only darken; Reduce Motion keeps only the fill); "Open Anesia" shows arrow.up.right and says it opens a
new tab; "Done today" and "N done" are 44 pt to touch. Activity views: Share… is only offered where the system share
sheet exists."""
import core
from core import ok, section
import or_t390 as T

MENU = "(()=>{const m=document.querySelector('.pvx-cx-list');return m&&[m.getAttribute('role'),m.getAttribute('aria-label'),[...m.children].map(b=>b.getAttribute('role')==='separator'?'—':(b.getAttribute('aria-label')||b.textContent))]})()"
PRESS = "(sel)=>{const b=document.querySelector(sel), s=getComputedStyle(b);return [s.filter, s.scale]}"


def tail(share):
    return ['Copy link'] + (['Share…'] if share else []) + ['Open Anesia, opens in a new tab']


@section(id='t408', title='n408 · OR · Activity views, Buttons, Context menus: a context menu on every case (Board, Schedule, Cases), press states on every button, Open Anesia marked as a new tab, 44 pt disclosures on touch',
         apps=['or'], topics=['menus', 'buttons'], engines=('chromium', 'webkit'))
async def s_t408(br):
    c, p, e = await T.open_or(br)
    share = await p.evaluate("!!navigator.share")
    await p.click('#view-board .or-q[data-id="or390c5"]', button='right'); await p.wait_for_timeout(300)
    m1 = await p.evaluate(MENU)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(250)
    await p.click('#view-board [data-id="or390c4"]', button='right'); await p.wait_for_timeout(300)
    m2 = await p.evaluate(MENU)
    ok('Context menus · a case on the Board has the shared menu, named for the patient: Show details, Open case · the next step, Move…, Report delay… · Copy link, Open Anesia (heard as opening a new tab); Juniper’s “Pre-op complete” is left out until her readiness items are done',
       m1 == ['menu', 'Actions for Otis', ['Show details', 'Open case', '—', 'Patient arrived', 'Move…', 'Report delay…', '—'] + tail(share)]
       and m2 == ['menu', 'Actions for Juniper', ['Show details', 'Open case', '—', 'Move…', 'Report delay…', '—'] + tail(share)], (m1, m2))
    await p.click('.pvx-cx-list button:has-text("Show details")'); await p.wait_for_timeout(500)
    d1 = await p.evaluate("[UI.drawerId, document.getElementById('drawer').classList.contains('open')]")
    await p.click('#view-board [data-id="or390c2"]', button='right'); await p.wait_for_timeout(300)
    m3 = await p.evaluate(MENU)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    d2 = await p.evaluate("[UI.drawerId, !!document.querySelector('.pvx-cx'), document.activeElement.dataset&&document.activeElement.dataset.id]")
    await p.click('#view-board [data-id="or390c2"]', button='right'); await p.wait_for_timeout(300)
    await p.click('.pvx-cx-list button:has-text("Start closing")'); await p.wait_for_timeout(500)
    st = await p.evaluate("caseById('or390c2').status")
    ok('…“Show details” opens them; with the details open beside the board, Maple’s menu offers her next step, Esc closes only the menu (focus back on her card, Juniper’s details stay), and “Start closing” records it',
       d1 == ['or390c4', True] and m3 and m3[2][:4] == ['Show details', 'Open case', '—', 'Start closing'] and d2 == ['or390c4', False, 'or390c2'] and st == 'closing', (d1, m3, d2, st))
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(300)

    await p.click('#switcher .seg[data-view="cases"]'); await p.wait_for_timeout(400)
    await p.focus('#casesBody tr[data-id="or390c6"]')
    await p.evaluate("document.activeElement.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:0,clientY:0}))"); await p.wait_for_timeout(300)
    k1 = await p.evaluate("[document.activeElement.closest('.pvx-cx-list')?document.activeElement.textContent:null, document.querySelector('.pvx-cx-list')&&document.querySelector('.pvx-cx-list').getAttribute('aria-label')]")
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.wait_for_timeout(600)
    k2 = await p.evaluate("[UI.view, UI.caseId||null]")
    ok('…a row in Cases opens it from the keyboard (the context-menu key, ⇧F10) on its first item; ↓ and Return choose “Open case”',
       k1 == ['Show details', 'Actions for Willow'] and k2[0] == 'case' and k2[1] == 'or390c6', (k1, k2))
    await p.click('#caseBack'); await p.wait_for_timeout(500)
    await p.click('#switcher .seg[data-view="schedule"]'); await p.wait_for_timeout(500)
    await p.click('#view-schedule .or-block[data-id="or390c1"]', button='right'); await p.wait_for_timeout(300)
    s1 = await p.evaluate(MENU)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    ok('…a block on the Schedule too, and a finished case offers no step it can’t take', s1 and s1[1] == 'Actions for Biscuit' and s1[2] == ['Show details', 'Open case', '—'] + tail(share), s1)

    await p.click('#switcher .seg[data-view="board"]'); await p.wait_for_timeout(400)
    await p.click('#displayBtn'); await p.wait_for_timeout(800)
    await p.mouse.click(400, 400, button='right'); await p.wait_for_timeout(300)
    tv = await p.evaluate("!!document.querySelector('.pvx-cx')")
    await p.evaluate("exitDisplay()"); await p.wait_for_timeout(500)
    ok('…the wall display has none', tv is False, tv)

    an = await p.evaluate("""(()=>{openDrawer('or390c5');const d=document.getElementById('drawerAnesia');const r=[d.getAttribute('aria-label'),!!d.querySelector('.or-nw svg.or-ext')];closeDrawer();
        openCase('or390c5');const k=document.getElementById('caseAnesia');r.push(k.getAttribute('aria-label'),!!k.querySelector('.or-nw svg.or-ext'));return r})()""")
    ok('…“Open Anesia” opens a new tab, so it carries arrow.up.right with its last word and says “opens in a new tab”, in the details and on the case page',
       an == ['Open Anesia, opens in a new tab', True, 'Open Anesia, opens in a new tab', True], an)
    sh = await p.evaluate("[!!navigator.share, !!document.getElementById('caseShare')]")
    ok('Activity views · Share… is offered only where the system share sheet exists, on the case page and in the menu', sh[0] == sh[1], sh)
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await T.open_or(br)
    # Buttons · press states, on a fresh page (after the wall display, CI's WebKit kept no :active). The pressed look is read with transitions off (a busy CI runner may not advance a 0.1 s
    # transition at all); the 0.1 s itself is read from n408's rule
    dur = await p.evaluate("""[...document.getElementById('pvx-n408-css').sheet.cssRules].filter(r=>r.selectorText&&r.selectorText.includes(':active')&&r.style.filter==='brightness(0.88)'&&r.style.transitionDuration).map(r=>r.style.transitionDuration)""")
    await p.add_style_tag(content='*,*::before,*::after{transition:none!important}')
    await p.evaluate("openDrawer('or390c5')"); await p.wait_for_timeout(500)
    b = await p.locator('#drawerOpen').bounding_box()
    r0 = await p.evaluate(PRESS, '#drawerOpen')
    await p.mouse.move(b['x'] + 20, b['y'] + 10); await p.mouse.down()
    await core.until(p, "getComputedStyle(document.querySelector('#drawerOpen')).filter==='brightness(0.88)'", 2000)
    r1 = await p.evaluate(PRESS, '#drawerOpen'); await p.mouse.move(5, 890); await p.mouse.up(); await p.wait_for_timeout(200)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(300)
    card = p.locator('#view-board .or-q:not(.is-done)').first
    cid = await card.get_attribute('data-id'); q = await card.bounding_box()
    await p.mouse.move(q['x'] + 30, q['y'] + 12); await p.mouse.down()
    await core.until(p, "getComputedStyle(document.querySelector('#view-board .or-q[data-id=\"%s\"]')).filter==='brightness(0.88)'" % cid, 2000)
    r2 = await p.evaluate(PRESS, f'#view-board .or-q[data-id="{cid}"]'); await p.mouse.move(5, 890); await p.mouse.up(); await p.wait_for_timeout(600)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(300)
    ok('Buttons · a button pressed darkens and shrinks to 97 % in 0.1 s (nothing changed while pressed); a case card only darkens',
       r0[0] == 'none' and r0[1] in ('none', '') and r1 == ['brightness(0.88)', '0.97'] and r2[0] == 'brightness(0.88)' and r2[1] in ('none', '')
       and dur and all(d.split(',')[0].strip() in ('0.1s', '.1s') for d in dur), (r0, r1, r2, dur))

    await c.close()

    c, p, e = await T.open_or(br)
    await p.emulate_media(reduced_motion='reduce')
    await p.add_style_tag(content='*,*::before,*::after{transition:none!important}')
    await p.evaluate("openDrawer('or390c5')"); await p.wait_for_timeout(500)
    b = await p.locator('#drawerOpen').bounding_box()
    await p.mouse.move(b['x'] + 20, b['y'] + 10); await p.mouse.down()
    await core.until(p, "getComputedStyle(document.querySelector('#drawerOpen')).filter==='brightness(0.88)'", 2000)
    rm = await p.evaluate(PRESS, '#drawerOpen'); await p.mouse.move(5, 890); await p.mouse.up()
    ok('…with Reduce Motion a press only darkens', rm[0] == 'brightness(0.88)' and rm[1] in ('none', ''), rm)
    await c.close()

    c, p, e = await T.open_or(br, vp=(1180, 820), touch=True)
    h1 = await p.evaluate("Math.round(document.querySelector('#view-board .or-done>summary').getBoundingClientRect().height)")
    await p.evaluate("openCase('or390c4','preop')"); await p.wait_for_timeout(600)
    h2 = await p.evaluate("Math.round(document.querySelector('#caseBody .or-donefold>summary').getBoundingClientRect().height)")
    coarse = await p.evaluate("matchMedia('(pointer:coarse)').matches")
    ok('Buttons · on a touch screen “Done today” and Pre-op’s “N done” are 44 pt tall (36 and 40)', (not coarse) or (h1 >= 44 and h2 >= 44), (coarse, h1, h2))
    await c.close()

    c, p, e = await T.open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("document.querySelector('#view-board [data-id=\"or390c5\"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:100,clientY:300}))")
    await p.wait_for_timeout(300)
    ph = await p.evaluate("[!!document.querySelector('.pvx-cx.sheet'), !!document.querySelector('.pvx-cx-cancel')]")
    if ph[1]:
        await p.click('.pvx-cx-cancel'); await p.wait_for_timeout(300)
    gone = await p.evaluate("!!document.querySelector('.pvx-cx')")
    ok('Context menus · on a phone the menu is an action sheet from the bottom with Cancel', ph == [True, True] and gone is False, (ph, gone))
    await c.close()
