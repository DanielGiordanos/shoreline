"""Pravix OR — the n428 build's own checks (Nov 23 2026): HIG Writing.
In the live OR, Pre-op listed six products as sources (only Flow and the treatment sheet answer items), "Required items ·
Kura" said nothing was reserved (nothing reserves through Kura), and the Record listed "Surgeon dictation · Not recorded
(prototype)". The hand-off said "the patient-flow board" and "the surgical episode". Cases said "Try another filter" with
nothing filtered, and had no button; an empty room said "no more cases today"; the lobby notice switched from "your" to
"my"; "your tick", straight apostrophes, "Legend…" beside "Icon legend…", and Redo's name unlike Undo's."""
import core
from core import ok, section
from or_t390 import open_or

TXT = "(document.querySelector('main')||document.body).innerText"


@section(id='t428', title='n428 · OR · Writing: the live OR names only the sources it has, the hand-off says what Send does, empty lists say why and offer the next step, one perspective and one name for each thing',
         apps=['or'], topics=['writing'], engines=('chromium', 'webkit'))
async def s_t428(br):
    errs = []
    c, p, e = await open_or(br)
    # Pre-op and the Record: only real sources
    await p.evaluate("openCase('or390c5','preop')"); await p.wait_for_timeout(500)
    pre = await p.evaluate(f"""(()=>({{chips:!!document.querySelector('.or-sources'), t:{TXT}}}))()""")
    await p.evaluate("openCase('or390c2','record')"); await p.wait_for_timeout(500)
    rec = await p.evaluate(TXT)
    ok('Writing · the live OR names only the sources it has: no product chips on Pre-op (Kura, Anesia, WoofWare and Consent answer nothing there), no “Required items · Kura”, no “Surgeon dictation · Not recorded (prototype)” on the Record; the note says “what you mark”, not “your tick”',
       not pre['chips'] and 'Required items' not in pre['t'] and 'No implants or equipment reserved' not in pre['t'] and 'what you mark always wins' in pre['t'] and 'tick' not in pre['t']
       and 'Surgeon dictation' not in rec and 'prototype' not in rec.lower(), (pre['chips'], pre['t'][-400:], rec[-300:]))
    # Hand-off
    await p.evaluate("(()=>{const c=caseById('or390c3'); c.recovery.destination=null; openCase('or390c3','recovery')})()"); await p.wait_for_timeout(500)
    h0 = await p.evaluate(TXT)
    await p.evaluate("(()=>{const c=caseById('or390c3'); c.recovery.destination='ICU'; renderCase()})()"); await p.wait_for_timeout(400)
    h1 = await p.evaluate(TXT)
    await p.evaluate("(()=>{const c=caseById('or390c3'); c.recovery.destination='Discharge'; renderCase()})()"); await p.wait_for_timeout(400)
    h2 = await p.evaluate(TXT)
    ok('…the hand-off says what Send does, in the alert’s words: “Choose where Pepper goes”, “shows Pepper in ICU in Flow and on the treatment sheet, and completes the case in OR”, and for Discharge “Discharge Pepper from Flow as usual” (it said “the patient-flow board” and “closes the surgical episode”)',
       'Choose where Pepper goes, then send to Flow.' in h0 and 'shows Pepper in ICU in Flow and on the treatment sheet, and completes the case in OR' in h1
       and 'Discharge Pepper from Flow as usual' in h2 and not any(w in h0 + h1 + h2 for w in ('patient-flow board', 'surgical episode', 'selected destination')), (h1[-500:],))
    # Cases: empty lists
    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(400)
    await p.fill('#casesSearch', 'zzzz'); await p.wait_for_timeout(400)
    m = await p.evaluate("(()=>{const e=document.querySelector('#casesBody .empty'); return e&&{t:e.innerText, b:!!document.getElementById('casesShowAll')}})()")
    await p.click('#casesShowAll'); await p.wait_for_timeout(400)
    after = await p.evaluate("({rows:document.querySelectorAll('#casesBody tr[data-id]').length, q:UI.casesQ, f:UI.casesFilter, foc:document.activeElement&&document.activeElement.id})")
    await p.evaluate("(()=>{ CASES.length=0; (window.renderCases||renderCases)(); })()"); await p.wait_for_timeout(400)
    z = await p.evaluate("(()=>{const e=document.querySelector('#casesBody .empty'); return e&&e.innerText})()")
    await p.click('#casesAddFirst'); await p.wait_for_timeout(500)
    sheet = await p.evaluate("(()=>{const m=document.getElementById('modal'); return !!m&&getComputedStyle(m).display!=='none'&&/Add case|New case|Patient/.test(m.innerText)})()")
    ok('Writing · an empty Cases list says why and offers the next step: “No cases match” with Show all cases (it clears the stage, type and search, and focus goes to search), and with no cases at all “No cases yet” with Add case… (it said “Try another filter or search term” with nothing filtered)',
       m and 'No cases match' in m['t'] and m['b'] and 'Try another filter' not in m['t'] and after['rows'] > 0 and after['q'] == '' and after['f'] == 'all' and after['foc'] == 'casesSearch'
       and z and 'No cases yet' in z and 'Try another filter' not in z and sheet, (m, after, z, sheet))
    await p.evaluate("closeModal&&closeModal()"); await p.wait_for_timeout(300)
    # Board: a room with nothing booked
    await p.evaluate("switchView('board')"); await p.wait_for_timeout(500)
    b = await p.evaluate("document.getElementById('roomGrid')?document.getElementById('roomGrid').innerText:''")
    ok('…a room with nothing booked says “nothing booked today” (it said “no more cases today” when there had been none)', 'nothing booked today' in b and 'no more cases today' not in b, b[:300])
    # Words and names
    w = await p.evaluate("""(()=>{ const src=[...document.scripts].map(x=>x.textContent).join('\\n');
       const i=src.indexOf("kind==='lobby'"), gate=i>-1?src.slice(i, i+700):'';
       return {gate:gate, issue:/· can't start until done|can't start yet|>What's missing/.test(src),
         redo:[...document.querySelectorAll('[aria-label^="Redo"],[title^="Redo"]')].map(x=>x.getAttribute('aria-label')||x.getAttribute('title'))}; })()""")
    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(300)
    lg = await p.evaluate("(document.getElementById('casesLegend')||{}).textContent||''")
    ok('…one perspective and one name for each thing: the lobby notice says “your” and its button “Log out” (it said “Sign in with my own account”); curly apostrophes in “can’t start” and “What’s missing”; Cases’ link is “Icon legend…”; Redo’s name follows Undo’s (“nothing to redo yet”)',
       'id="orGateOwn">Log out</button>' in w['gate'] and 'my own account' not in w['gate'] and 'your own Pravix account' in w['gate'] and not w['issue'] and lg == 'Icon legend…'
       and all(r == 'Redo (nothing to redo yet)' or not r.startswith('Redo (nothing') for r in w['redo']), (w, lg))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
