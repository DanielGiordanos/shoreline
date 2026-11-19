"""Pravix OR — the n401 build's own checks (Nov 17 2026): HIG Modality, Offering help, Onboarding.
Modality: a sheet with typing in it asks "Discard what you typed?" before Esc, ✕, a click outside or Cancel throws it away
(it asked nothing); an untouched sheet closes at once and saving never asks; an editing sheet has Cancel and no ✕, a
view-only one ✕ and no second Close; on a phone a sheet from the case drawer replaces it and the drawer comes back.
Offering help: ? opens the Keyboard shortcuts sheet (it opened the icon legend, now L); no "tap" on a Mac; tooltips start
with a verb, stay under 75 characters and end without a full stop; search says what it searches and its shortcut.
Onboarding: OR opens straight onto the Board, with nothing to get through first."""
import os
import core
from core import ok, section, BUILD
import or_t390 as T

SHEET = "(()=>({open:document.getElementById('modal').classList.contains('open'), ask:(document.querySelector('#modalActions .or-discard')||{}).textContent||null, focus:document.activeElement&&document.activeElement.id, x:!document.getElementById('modalClose').hidden&&getComputedStyle(document.getElementById('modalClose')).display!=='none', acts:[...document.querySelectorAll('#modalActions > .btn')].map(b=>b.textContent)}))()"


@section(id='t401', title='n401 · OR · Modality, Offering help, Onboarding: “Discard what you typed?” before a sheet throws typing away, Cancel or ✕ (not both), one sheet at a time on a phone, the Keyboard shortcuts sheet on ?, device words and verb tooltips',
         apps=['or'], topics=['modality', 'help', 'onboarding'], engines=('chromium', 'webkit'))
async def s_t401(br):
    html = open(os.path.join(BUILD, 'or', 'index.html'), encoding='utf-8').read()
    c, p, e = await T.open_or(br)
    first = await p.evaluate("[document.getElementById('modal').classList.contains('open'), !!document.querySelector('.pvx-ks'), !!document.querySelector('#orGate.show'), UI.view]")
    ok('Onboarding · OR opens straight onto the Board: no tour, splash, tip or sheet to get through first', first == [False, False, False, 'board'], first)

    await p.click('#addCaseBtn'); await p.wait_for_timeout(400)
    s0 = await p.evaluate(SHEET)
    await p.evaluate("(()=>{const s=document.getElementById('acPatient'); s.selectedIndex=1; s.dispatchEvent(new Event('change',{bubbles:true}));})()"); await p.wait_for_timeout(150)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(250)
    s1 = await p.evaluate(SHEET)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(250)
    s2 = await p.evaluate(SHEET)
    ok('Modality · Esc on a sheet with a choice made asks “Discard what you typed?” in the sheet itself, with Cancel focused; Esc again keeps editing (it closed and lost it)',
       s1['open'] and s1['ask'] and 'Discard what you typed?' in s1['ask'] and s1['focus'] == 'orDiscardNo' and s2['open'] and s2['ask'] is None, (s1, s2))
    await p.click('#modalActions > .btn.ghost'); await p.wait_for_timeout(250)
    s3 = await p.evaluate(SHEET)
    await p.click('#orDiscardYes'); await p.wait_for_timeout(300)
    s4 = await p.evaluate(SHEET)
    ok('…Cancel asks the same, and Discard closes it', s3['open'] and s3['ask'] and s4['open'] is False, (s3, s4))
    ok('…an editing sheet has Cancel and no ✕ (it had both)', s0['x'] is False and 'Cancel' in s0['acts'], s0)

    await p.click('#addCaseBtn'); await p.wait_for_timeout(400)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    s5 = await p.evaluate(SHEET)
    ok('…an untouched sheet closes at once', s5['open'] is False, s5)

    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(600)
    await p.click('#caseTabs [data-tab="procedure"]'); await p.wait_for_timeout(300)
    await p.click('[data-act="specimen"]'); await p.wait_for_timeout(400)
    ta = await p.evaluate("(()=>{const f=document.querySelector('#modalBody input:not([type=hidden]),#modalBody textarea');return f?(f.id?'#'+f.id:null):null})()")
    f = await p.query_selector('#modalBody input:not([type=hidden]), #modalBody textarea')
    await f.fill('Left axillary mass, margins inked')
    await p.mouse.click(8, 450); await p.wait_for_timeout(250)
    s6 = await p.evaluate(SHEET)
    await p.click('#orDiscardYes'); await p.wait_for_timeout(300)
    ok('…a click outside a sheet with typing asks too', s6['open'] and s6['ask'] is not None, s6)

    await p.evaluate("delayModal(caseById('or390c6'))"); await p.wait_for_timeout(400)
    sd = await p.evaluate(SHEET)
    await p.fill('#dlMin', '20'); await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(300)
    s7 = await p.evaluate(SHEET)
    ok('…saving never asks (Delay: 20 min saved and closed)', s7['open'] is False and s7['ask'] is None, (sd, s7))
    await p.evaluate("openLegend()"); await p.wait_for_timeout(300)
    sl = await p.evaluate(SHEET)
    await p.evaluate("closeModal()")
    ok('…a view-only sheet (Icon legend) has ✕ and no second Close (it had both)', sl['x'] is True and sl['acts'] == [], sl)

    await p.evaluate("closeModal(); switchView('board')"); await p.wait_for_timeout(300)
    await p.keyboard.press('Shift+Slash'); await p.wait_for_timeout(400)
    ks = await p.evaluate("(()=>{const k=document.querySelector('.pvx-ks');return k?{t:k.querySelector('h2').textContent, txt:k.textContent}:null})()")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    gone = await p.evaluate("!document.querySelector('.pvx-ks')")
    await p.keyboard.press('l'); await p.wait_for_timeout(300)
    lg = await p.evaluate("[document.getElementById('modal').classList.contains('open'), document.getElementById('modalTitle').textContent]")
    await p.evaluate("closeModal()")
    ok('Offering help · ? opens the Keyboard shortcuts sheet (search, undo, the legend on L, tabs, Display mode) as in every Pravix app; it opened the icon legend, which is now L',
       ks and ks['t'] == 'Keyboard shortcuts' and 'Search patients, staff, procedures and rooms' in ks['txt'] and 'Show the icon legend' in ks['txt'] and gone and lg == [True, 'Icon legend'], (ks, gone, lg))
    ok('…words that work on every device: no “tap” on a Mac (“Tap each step as it happens”, “tap to retry”); “choose” and “mark” instead',
       all(w not in html for w in ['Tap any item', 'Tap each step', 'tap to retry', 'tap if needed']) and 'Mark each step as it happens' in html, '')
    allt = []
    for v in ['board', 'schedule', 'cases', 'analytics']:
        await p.evaluate(f"switchView('{v}')"); await p.wait_for_timeout(250)
        allt += await p.evaluate("[...document.querySelectorAll('[title]')].filter(n=>n.getClientRects().length&&!n.closest('#pvxTopnav,.topnav,nav,.or-block,.pvx-topnav,header .pvx-nav')).map(n=>n.title)")
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(500)
    await p.click('#caseTabs [data-tab="procedure"]'); await p.wait_for_timeout(300)
    allt += await p.evaluate("[...document.querySelectorAll('#view-case [title]')].filter(n=>n.getClientRects().length).map(n=>n.title)")
    bad = sorted(set(t for t in allt if len(t) > 75 or t.rstrip().endswith('.')))
    lu = await p.evaluate("(document.querySelector('[title^=\"Search patients\"]')||{}).title||''")
    nav = await p.evaluate("[document.getElementById('datePrev').title, document.getElementById('caseCopy').title]")
    spec = await p.evaluate("[...document.querySelectorAll('[data-specnext]')].map(b=>b.title)")
    ok('…OR’s tooltips say what the control does, starting with a verb, under 75 characters, without a full stop (“Previous day”, “Advance status”, “L.U.N.A.”, a two-sentence Copy link)',
       not bad and nav[0] == 'Go to the previous day' and nav[1] == 'Copy a link that opens this case after sign-in, without a name'
       and lu.startswith('Search patients, staff, procedures and rooms (') and lu.endswith('K)') and (not spec or all(t.startswith('Mark it ') or t == 'The lab has it' for t in spec)), (bad, lu, nav, spec))
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await T.open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("openDrawer('or390c5')"); await p.wait_for_timeout(600)
    await p.evaluate("[...document.querySelectorAll('#drawer button')].find(b=>b.textContent.trim()==='Move…').click()"); await p.wait_for_timeout(500)
    held = await p.evaluate("[document.getElementById('modal').classList.contains('open'), getComputedStyle(document.getElementById('drawer')).visibility]")
    await p.evaluate("[...document.querySelectorAll('#modalActions > .btn')].find(b=>b.textContent==='Cancel').click()"); await p.wait_for_timeout(500)
    back = await p.evaluate("[document.getElementById('modal').classList.contains('open'), getComputedStyle(document.getElementById('drawer')).visibility, !!(document.activeElement&&document.activeElement.closest('#drawer'))]")
    ok('Modality · on a phone, a sheet opened from the case drawer replaces it (both were stacked), and the drawer comes back, with focus, when it closes',
       held == [True, 'hidden'] and back == [False, 'visible', True], (held, back))
    await c.close()
