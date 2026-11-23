"""Pravix OR — the n405 build's own checks (Nov 18 2026): HIG Web views, Boxes, Column views.
Web views: Back and Forward work inside OR — each section chosen and each case is a history entry (only the case had one,
and Forward did nothing); tabs, redraws and the restore after a reload add none; Back restores the section's filter. OR
embeds no web page, and Anesia opens in its own tab. Boxes: inside a panel nothing is boxed again — the case's facts are a
list with hairlines (a grid of tiles), Pre-op's missing items are rows with Mark done on the same line (tinted boxes with the
button underneath, two screens tall), and Anesia's summary isn't a box in the box named Anesia; each panel is named by its
title for VoiceOver, and the Board's rooms are headings. Column views: OR has no hierarchy to browse."""
import os, re
import core
from core import ok, section, BUILD
import or_t390 as T

BACK = "history.back()"
FWD = "history.forward()"
WHERE = "[UI.view, UI.view==='case'?UI.caseId:null, UI.casesFilter]"
BOXED = """(sel)=>[...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length).map(e=>{const c=getComputedStyle(e);
  return [c.backgroundColor, c.borderLeftWidth==='0px'||c.borderLeftStyle==='none'?'0':c.borderLeftWidth]})"""


@section(id='t405', title='n405 · OR · Web views, Boxes, Column views: Back and Forward walk the sections and cases opened; no box in a box (facts, Pre-op rows, Anesia), each panel named by its title, the Board’s rooms headings',
         apps=['or'], topics=['navigation', 'boxes'], engines=('chromium', 'webkit'))
async def s_t405(br):
    html = open(os.path.join(BUILD, 'or', 'index.html'), encoding='utf-8').read()
    c, p, e = await T.open_or(br)
    n0 = await p.evaluate("history.length")
    await p.click('#switcher .seg[data-view="schedule"]'); await p.wait_for_timeout(300)
    await p.click('#switcher .seg[data-view="cases"]'); await p.wait_for_timeout(300)
    await p.click('#casesType [data-k="emergency"]'); await p.wait_for_timeout(400)   # n421: Type is its own control
    n1 = await p.evaluate("history.length")
    await p.evaluate(BACK); await p.wait_for_timeout(400); b1 = await p.evaluate(WHERE)
    await p.evaluate(BACK); await p.wait_for_timeout(400); b2 = await p.evaluate(WHERE)
    await p.evaluate(FWD); await p.wait_for_timeout(400); f1 = await p.evaluate(WHERE)
    await p.evaluate(FWD); await p.wait_for_timeout(400); f2 = await p.evaluate(WHERE)
    ok('Web views · each section chosen is a history entry: Back walks Cases → Schedule → Board and Forward walks back again, with the Cases filter as it was (only a case had an entry; Back from a section left OR)',
       n1 == n0 + 2 and b1[0] == 'schedule' and b2[0] == 'board' and f1[0] == 'schedule' and f2[0] == 'cases' and f2[2] == 'emergency', (n0, n1, b1, b2, f1, f2))

    await p.evaluate("openCase('or390c4')"); await p.wait_for_timeout(600)
    n2 = await p.evaluate("history.length")
    for tb in ('preop', 'procedure', 'record'):
        await p.click(f'#caseTabs [data-tab="{tb}"]'); await p.wait_for_timeout(250)
    await p.evaluate("render()"); await p.wait_for_timeout(200)
    n3 = await p.evaluate("history.length")
    await p.evaluate(BACK); await p.wait_for_timeout(500); cb = await p.evaluate(WHERE)
    await p.evaluate(FWD); await p.wait_for_timeout(500); cf = await p.evaluate(WHERE + ".concat([UI.caseTab])")
    ok('…a case is an entry and its tabs aren’t; Back returns to Cases and Forward reopens the case on the tab it was on (Forward did nothing)',
       n2 == n1 + 1 and n3 == n2 and cb[0] == 'cases' and cf[0] == 'case' and cf[1] == 'or390c4' and cf[3] == 'record', (n1, n2, n3, cb, cf))

    await p.click('#switcher .seg[data-view="analytics"]'); await p.wait_for_timeout(400)
    await p.evaluate(BACK); await p.wait_for_timeout(500); ab = await p.evaluate(WHERE)
    await p.click('#caseBack'); await p.wait_for_timeout(500); cb2 = await p.evaluate(WHERE)
    ok('…choosing a section from a case is an entry too: Back reopens the case, and the case’s own Back returns to Cases',
       ab[0] == 'case' and ab[1] == 'or390c4' and cb2[0] == 'cases', (ab, cb2))
    # n419 adds the second '_blank': a case in a new window, which is OR's own address (orCaseLink), also with noopener
    ok('Web views · OR embeds no web page, and its one outside link (Anesia) opens in its own tab without access back to OR',
       '<iframe' not in html and html.count("'_blank'") == 2 and "'_blank', 'noopener'" in html and "window.open(orCaseLink(c),'_blank','noopener')" in html, '')
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await T.open_or(br)
    rooms = await p.evaluate("[...document.querySelectorAll('#view-board .or-room-name')].map(h=>[h.getAttribute('role'),h.getAttribute('aria-level'),h.textContent])")
    qh = await p.evaluate("[...document.querySelectorAll('#view-board .or-qh')].map(h=>h.getAttribute('role')+':'+h.getAttribute('aria-level'))")
    ok('Boxes · the Board’s rooms are headings with their lists under them, so VoiceOver can move room by room (the Board had no heading but “Operating rooms”)',
       [r[:2] for r in rooms] == [['heading', '2'], ['heading', '2']] and [r[2] for r in rooms] == ['OR 1', 'OR 2'] and qh and all(x == 'heading:3' for x in qh), (rooms, qh))

    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(700)
    named = await p.evaluate("[...document.querySelectorAll('#caseBody section.panel')].map(s=>{const h=document.getElementById(s.getAttribute('aria-labelledby'));return h&&s.contains(h)?h.textContent.trim():null})")
    cells = await p.evaluate(BOXED, '#caseBody .panel .d-cell')
    an = await p.evaluate(BOXED, '#caseBody .panel .or-anesia')
    anb = await p.evaluate("(()=>{const b=document.querySelector('#caseBody .panel .or-anesia .brand');return b?getComputedStyle(b).display:'none'})()")
    ok('Boxes · each panel is named by its title for VoiceOver (“Patient”, “Case”, “Anesia”…), as a region it can predict',
       len(named) >= 4 and None not in named and named[:2] == ['Patient', 'Case'] and 'Anesia' in named, named)
    ok('…the case’s facts are a list with hairlines, not a grid of boxes in the box, and Anesia’s summary isn’t a box in the panel named Anesia (nor says “Anesia” twice)',
       len(cells) >= 12 and all(x == ['rgba(0, 0, 0, 0)', '0'] for x in cells) and an and all(x == ['rgba(0, 0, 0, 0)', '0'] for x in an) and anb == 'none', (cells[:3], an, anb))

    await p.click('#caseBack'); await p.wait_for_timeout(300)
    await p.evaluate("openCase('or390c4','preop')"); await p.wait_for_timeout(700)
    chk = await p.evaluate(BOXED, '#caseBody .panel .or-check.blocked')
    row = await p.evaluate("""(()=>{const r=[...document.querySelectorAll('#caseBody .or-check.blocked')];const same=r.every(x=>{const m=x.querySelector('.or-mark'),l=x.querySelector('.lbl');if(!m)return false;const a=m.getBoundingClientRect(),b=l.getBoundingClientRect();return a.top<b.bottom&&a.bottom>b.top&&a.left>b.right});
      const pnl=r[0].closest('.panel');return {n:r.length, same, h:Math.round(pnl.getBoundingClientRect().height), look:getComputedStyle(document.querySelector('#caseBody .or-check.is-look.blocked .box')).borderTopColor, hard:getComputedStyle(document.querySelector('#caseBody .or-check.is-hard.blocked .box')).borderTopColor}})()""")
    ok('…Pre-op’s missing items are rows with Mark done on the same line, must-haves red and the rest amber, so the panel is about a screen (each was a tinted box with its button underneath, 1,640 px tall)',
       row['n'] == 13 and row['same'] and row['h'] < 1150 and all(x[0] == 'rgba(0, 0, 0, 0)' for x in chk) and row['look'] != row['hard'], row)
    ok('no page errors', not e, e)
    await c.close()
