"""Pravix OR — the n421 build's own checks (Nov 21 2026): HIG Pickers, Segmented controls.
Cases' filter was one row of eight chips mixing two filters (stage and type), with no chosen one for VoiceOver, eight Tab
stops and four rows on an iPhone. It's two radio groups now, Stage and Type, with counts, equal widths, one Tab stop each
and ← → that wrap; they combine; on an iPhone Stage is a pop-up. Add case's Case type and Priority: one Tab stop, ← →."""
import core
from core import ok, section
from or_t390 import open_or, CONTRAST

GROUPS = """(()=>{const vis=e=>e&&e.offsetParent!==null; return [...document.querySelectorAll('#casesToolbar [role=radiogroup]')].filter(vis).map(g=>({id:g.id, name:g.getAttribute('aria-label'),
  items:[...g.querySelectorAll('[role=radio]')].map(r=>[r.childNodes[0].textContent, r.getAttribute('aria-checked'), r.tabIndex, Math.round(r.getBoundingClientRect().width), r.querySelector('.cnt').textContent])}))})()"""
ROWS = "[...document.querySelectorAll('#casesTable tbody tr[data-id]')].map(r=>r.dataset.id).sort()"


@section(id='t421', title='n421 · OR · Pickers, Segmented controls: Cases’ filter is two radio groups, Stage and Type (it was eight chips mixing both); Add case’s Case type and Priority are one Tab stop with ← →',
         apps=['or'], topics=['segmented-controls', 'keyboard', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t421(br):
    errs = []
    c, p, e = await open_or(br)
    await p.evaluate("switchView('cases'); document.getElementById('stage').scrollTop=0"); await p.wait_for_timeout(500)
    g = await p.evaluate(GROUPS)
    chips = await p.evaluate("document.querySelectorAll('#casesToolbar .chip').length")
    st, ty = (g + [None, None])[:2]
    ok('Segmented controls · Cases has two filters, Stage and Type (it was eight chips mixing them): each a named radio group with its counts, one chosen, one Tab stop, equal widths',
       chips == 0 and st and ty and st['name'] == 'Stage' and ty['name'] == 'Type'
       and [i[0] for i in st['items']] == ['All stages', 'Scheduled', 'Active', 'Recovery', 'Complete', 'Cancelled'] and [i[0] for i in ty['items']] == ['All types', 'Add-on', 'Emergency']
       and [i[1] for i in st['items']].count('true') == 1 and st['items'][0][1] == 'true' and [i[2] for i in st['items']] == [0, -1, -1, -1, -1, -1]
       and [i[2] for i in ty['items']] == [0, -1, -1] and len({i[3] for i in st['items']}) == 1 and len({i[3] for i in ty['items']}) == 1
       and st['items'][0][4] == '6' and ty['items'][2][4] == '1', (chips, g))
    # they combine: Emergency, then Scheduled
    await p.click('#casesType [data-k="emergency"]'); await p.wait_for_timeout(300)
    r1 = await p.evaluate(ROWS); g1 = await p.evaluate(GROUPS)
    await p.click('#casesStage [data-k="scheduled"]'); await p.wait_for_timeout(300)
    r2 = await p.evaluate(ROWS); f2 = await p.evaluate("UI.casesFilter")
    await p.click('#casesStage [data-k="recovery"]'); await p.wait_for_timeout(300)
    r3 = await p.evaluate(ROWS); e3 = await p.evaluate("(document.querySelector('#view-cases .or-empty, #casesTable tbody')||{}).textContent||''")
    ok('…they combine (“Emergency cases in recovery” couldn’t be asked): Emergency shows Juniper; with Stage, the counts follow the other filter (Scheduled 1 among emergencies), and Recovery + Emergency shows none',
       r1 == ['or390c4'] and [i[4] for i in g1[0]['items']][:2] == ['1', '1'] and r2 == ['or390c4'] and f2 == 'scheduled+emergency' and r3 == [], (r1, [i[4] for i in g1[0]['items']], r2, f2, r3))
    # the keyboard
    await p.click('#casesStage [data-k="all"]'); await p.click('#casesType [data-k="all"]'); await p.wait_for_timeout(300)
    await p.focus('#casesStage [aria-checked="true"]')
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(250)
    k1 = await p.evaluate("[UI.casesFilter, document.activeElement.dataset.k, document.activeElement.closest('[role=radiogroup]').id]")
    await p.keyboard.press('End'); await p.wait_for_timeout(250)
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(250)
    k2 = await p.evaluate("[UI.casesFilter, document.activeElement.dataset.k]")
    await p.keyboard.press('Tab'); await p.wait_for_timeout(150)
    k3 = await p.evaluate("[document.activeElement.closest('[role=radiogroup]')&&document.activeElement.closest('[role=radiogroup]').id, document.activeElement.dataset.k]")
    await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(250)
    k4 = await p.evaluate("[UI.casesFilter, document.activeElement.dataset.k]")
    ok('…from the keyboard each is one Tab stop: → chooses the next stage and focus stays on it while the list redraws, End goes to the last, → wraps to the first; Tab goes on to Type, where ← wraps to Emergency',
       k1 == ['scheduled', 'scheduled', 'casesStage'] and k2 == ['all', 'all'] and k3 == ['casesType', 'all'] and k4 == ['emergency', 'emergency'], (k1, k2, k3, k4))
    # Back keeps both
    await p.click('#casesStage [data-k="scheduled"]'); await p.wait_for_timeout(300)
    await p.click('#casesTable tbody tr[data-id="or390c4"]'); await p.wait_for_timeout(600)
    v1 = await p.evaluate("UI.view")
    if v1 != 'case':
        await p.evaluate("openCase('or390c4')"); await p.wait_for_timeout(500)
    await p.evaluate("history.back()"); await p.wait_for_timeout(900)
    bk = await p.evaluate("[UI.view, UI.casesFilter, [...document.querySelectorAll('#casesTable tbody tr[data-id]')].map(r=>r.dataset.id), [...document.querySelectorAll('#casesToolbar [aria-checked=true]')].map(r=>r.dataset.k)]")
    ok('…Back from a case returns to Cases with both filters as they were', bk[0] == 'cases' and bk[1] == 'scheduled+emergency' and bk[2] == ['or390c4'] and bk[3] == ['scheduled', 'emergency'], bk)
    # a search that shows everything clears both
    await p.evaluate("UI.casesFilter='all'; renderCases()"); await p.wait_for_timeout(300)
    cl = await p.evaluate("[...document.querySelectorAll('#casesToolbar [aria-checked=true]')].map(r=>r.dataset.k)")
    ok('…and anything that asks for all cases (a search result) clears both', cl == ['all', 'all'], cl)
    # Add case
    await p.evaluate("addCaseModal()"); await p.wait_for_timeout(500)
    ac = await p.evaluate("[...document.querySelectorAll('#modal .or-pills[role=radiogroup]')].map(g=>[g.id,[...g.querySelectorAll('[role=radio]')].map(r=>r.tabIndex)])")
    await p.focus('#acType [aria-checked="true"]'); await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(200)
    a1 = await p.evaluate("[document.activeElement.dataset.type, [...document.querySelectorAll('#acType [role=radio]')].map(r=>[r.getAttribute('aria-checked'), r.tabIndex])]")
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(200)
    a2 = await p.evaluate("[document.activeElement.dataset.type, document.getElementById('acPrioF').hidden]")
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(150)
    await p.keyboard.press('Tab'); await p.wait_for_timeout(150)
    a3 = await p.evaluate("document.activeElement.closest('[role=radiogroup]')?'radio':document.activeElement.id")
    ok('Segmented controls · Add case’s Case type and Priority are one Tab stop each (every option was), and ← → choose and keep focus on the choice (they did nothing), wrapping from Scheduled to Emergency',
       ac == [['acType', [0, -1, -1]], ['acPrio', [0, -1]]] and a1[0] == 'addon' and [x[0] for x in a1[1]] == ['false', 'true', 'false'] and [x[1] for x in a1[1]] == [-1, 0, -1]
       and a2 == ['emergency', True] and a3 == 'acPatient', (ac, a1, a2, a3))
    sg = await p.evaluate("[...document.getElementById('acSurgeon').options].map(o=>o.text)")
    ok('Pickers · Add case’s Surgeon list is A to Z (it was the roster’s order: Galano, Nolte, Giannetto)', sg == ['Choose…', 'Dr. Galano', 'Dr. Giannetto', 'Dr. Nolte'], sg)
    await p.evaluate("closeModal()")
    errs += list(e); await c.close()

    # the words and counts read at 4.5 : 1 in both appearances
    low = []
    for dark in (True, False):
        c, p, e = await open_or(br, dark=dark)
        await p.evaluate("switchView('cases'); document.getElementById('stage').scrollTop=0"); await p.wait_for_timeout(500)
        low += [x for x in await p.evaluate(CONTRAST, '#casesToolbar .or-cf button, #casesToolbar .or-cf .cnt') if x[1] < 4.5]
        errs += list(e); await c.close()
    ok('…their words and counts read at 4.5 : 1 or more, chosen or not, in dark and in light', not low, low)

    # iPhone: Stage is a pop-up
    c, p, e = await open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("switchView('cases'); document.getElementById('stage').scrollTop=0"); await p.wait_for_timeout(500)
    ph = await p.evaluate("""(()=>{const s=document.getElementById('casesStageSel'), l=document.querySelector('label[for=casesStageSel]'), ty=document.getElementById('casesType'), b=[...ty.querySelectorAll('[role=radio]')].map(r=>r.getBoundingClientRect());
      return {sel:!!s&&s.offsetParent!==null, label:l&&l.textContent, opts:s?[...s.options].map(o=>o.text):[], stageSeg:document.getElementById('casesStage').offsetParent!==null,
        typeW:b.map(r=>Math.round(r.width)), typeH:Math.min(...b.map(r=>r.height)), fits:b.every(r=>r.left>=0&&r.right<=innerWidth), h:Math.round(document.getElementById('casesToolbar').getBoundingClientRect().height)}})()""")
    await p.select_option('#casesStageSel', 'recovery'); await p.wait_for_timeout(400)
    pr = await p.evaluate("[UI.casesFilter, document.activeElement&&document.activeElement.id, [...document.querySelectorAll('#casesTable tbody tr[data-id]')].length]")
    ok('…on an iPhone Stage (six choices) is a pop-up labelled Stage with its counts, and Type stays three equal segments, 44 pt, inside the screen (the chips took four rows); choosing Recovery filters and keeps focus on the pop-up',
       ph['sel'] and ph['label'] == 'Stage' and ph['opts'][0] == 'All stages · 6' and not ph['stageSeg'] and len(set(ph['typeW'])) == 1 and ph['typeH'] >= 44 and ph['fits']
       and pr[0] == 'recovery' and pr[1] == 'casesStageSel' and pr[2] == 1, (ph, pr))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
