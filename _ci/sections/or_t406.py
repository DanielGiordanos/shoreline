"""Pravix OR — the n406 build's own checks (Nov 18 2026): HIG Disclosure controls, Labels, Lists and tables.
Lists and tables: Return on a Cases row opened its details and the same key closed them again (focus had moved to Close);
now Return or Space opens them. The list is one Tab stop with ↑ ↓ Home End; the headings sort (aria-sort, an arrow only on
the sorted one, again reverses); the table is named "Cases"; the case whose details are open stays marked in Cases, on the
Board and in the Schedule through redraws; back from a case lands on its row; rows alternate on touch screens.
Disclosure controls: the Board's "Done today" and Pre-op's "N done" lead with a drawn triangle that turns down when open
(a typed › / ⌄ trailed the names, or nothing). Labels: text stays selectable."""
import os
import core
from core import ok, section, BUILD
import or_t390 as T

SORTED = "[...document.querySelectorAll('#casesTable th[aria-sort]')].map(h=>[h.dataset.sort,h.getAttribute('aria-sort'),getComputedStyle(h.querySelector('.or-sortarr')).visibility])"
NAMES = "[...document.querySelectorAll('#casesBody tr .nm b')].map(b=>b.textContent)"
SUM = """(sel)=>{const s=document.querySelector(sel);const b=getComputedStyle(s,'::before');const first=s.querySelector('span').getBoundingClientRect().left;
  return {content:b.content, w:b.width, t:b.transform, after:[...s.querySelectorAll('span')].map(x=>getComputedStyle(x,'::after').content), lead:first-s.getBoundingClientRect().left, text:s.innerText}}"""


@section(id='t406', title='n406 · OR · Disclosure controls, Labels, Lists and tables: Return opens a Cases row, one Tab stop with arrows, sortable headings, the open case marked where it’s listed, focus back on its row; leading disclosure triangles',
         apps=['or'], topics=['lists', 'disclosure'], engines=('chromium', 'webkit'))
async def s_t406(br):
    c, p, e = await T.open_or(br)
    await p.click('#switcher .seg[data-view="cases"]'); await p.wait_for_timeout(400)
    await p.focus('#casesBody tr:nth-child(2)'); await p.keyboard.press('Enter'); await p.wait_for_timeout(600)
    d1 = await p.evaluate("UI.drawerId")
    mk = await p.evaluate("[...document.querySelectorAll('#casesBody tr')].map(r=>r.getAttribute('aria-current')||'')")
    await p.evaluate("render()"); await p.wait_for_timeout(300)
    mk2 = await p.evaluate("[...document.querySelectorAll('#casesBody tr')].map(r=>(r.getAttribute('aria-current')||'')+(r.classList.contains('or-sel')?'*':''))")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    back = await p.evaluate("[UI.drawerId, document.activeElement.dataset&&document.activeElement.dataset.id, [...document.querySelectorAll('#casesBody tr[aria-current]')].length]")
    await p.keyboard.press(' '); await p.wait_for_timeout(600)
    d2 = await p.evaluate("UI.drawerId"); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('Lists and tables · Return on a Cases row opens its details, and Space too (Return opened them and closed them again as focus reached Close)',
       d1 == 'or390c3' and d2 == 'or390c3', (d1, d2))
    ok('…the case whose details are open stays marked in the list (aria-current) through a live redraw, and closing puts focus back on its row',
       mk == ['', 'true', '', '', '', ''] and mk2[1] == 'true*' and back == [None, 'or390c3', 0], (mk, mk2, back))

    tabs = await p.evaluate("[...document.querySelectorAll('#casesBody tr')].map(r=>r.getAttribute('tabindex'))")
    await p.keyboard.press('ArrowDown'); a1 = await p.evaluate("document.activeElement.dataset.id")
    await p.keyboard.press('End'); a2 = await p.evaluate("document.activeElement.dataset.id")
    await p.keyboard.press('Home'); a3 = await p.evaluate("document.activeElement.dataset.id")
    await p.keyboard.press('ArrowUp'); a4 = await p.evaluate("document.activeElement.dataset.id")
    await p.keyboard.press('ArrowDown'); await p.evaluate("render()"); await p.wait_for_timeout(200)
    a6 = await p.evaluate("[document.activeElement.tagName, document.activeElement.dataset&&document.activeElement.dataset.id]")
    await p.keyboard.press('ArrowUp')
    await p.keyboard.press('Tab'); a5 = await p.evaluate("document.activeElement.matches('#casesBody tr')")
    ids = await p.evaluate("[...document.querySelectorAll('#casesBody tr')].map(r=>r.dataset.id)")
    ok('…the list is one Tab stop (each of the 6 rows was one); ↓ ↑ move through the rows, End and Home go to the last and first, and Tab goes on (to the row’s own controls, then out), never to the next row',
       tabs.count('0') == 1 and tabs[1] == '0' and a1 == ids[2] and a2 == ids[-1] and a3 == ids[0] and a4 == ids[0] and a5 is False, (tabs, a1, a2, a3, a4, a5))
    ok('…a live redraw keeps the keyboard on the row it was on (focus fell to the page whenever the list was redrawn)', a6 == ['TR', ids[1]], a6)

    s0 = await p.evaluate(SORTED); n0 = await p.evaluate(NAMES)
    name = await p.evaluate("(()=>{const t=document.getElementById('casesTable');const h=document.getElementById(t.getAttribute('aria-labelledby'));return h&&h.textContent})()")
    await p.click('#casesTable .or-sortbtn[data-sort="pt"]'); await p.wait_for_timeout(300)
    s1 = await p.evaluate(SORTED); n1 = await p.evaluate(NAMES); f1 = await p.evaluate("document.activeElement.dataset.sort")
    await p.click('#casesTable .or-sortbtn[data-sort="pt"]'); await p.wait_for_timeout(300)
    s2 = await p.evaluate(SORTED); n2 = await p.evaluate(NAMES)
    await p.click('#casesTable .or-sortbtn[data-sort="room"]'); await p.wait_for_timeout(300)
    s3 = await p.evaluate(SORTED); n3 = await p.evaluate(NAMES)
    ok('…the table is named “Cases”, and its headings sort it: Patient A to Z, again Z to A, Room · time back to the order it had, with aria-sort and an arrow only on the sorted heading',
       name == 'Cases' and s0 == [['room', 'descending', 'visible']] and s1 == [['pt', 'ascending', 'visible']] and n1 == sorted(n1) and s2 == [['pt', 'descending', 'visible']]
       and n2 == sorted(n2, reverse=True) and s3 == s0 and n3 == n0 and f1 == 'pt'
       and await p.evaluate("[...document.querySelectorAll('#casesTable th:not([aria-sort]) .or-sortarr')].every(a=>getComputedStyle(a).visibility==='hidden')"),
       (name, s0, s1, n1, s2, n2, s3))

    await p.evaluate("openDrawer('or390c4')"); await p.wait_for_timeout(400)
    await p.click('#drawerOpen'); await p.wait_for_timeout(600)
    await p.click('#caseBack'); await p.wait_for_timeout(700)
    fb = await p.evaluate("[UI.view, document.activeElement.tagName, document.activeElement.dataset&&document.activeElement.dataset.id]")
    ok('…back from a case, focus lands on its row in the list you came from (it was lost)', fb == ['cases', 'TR', 'or390c4'], fb)

    await p.click('#switcher .seg[data-view="board"]'); await p.wait_for_timeout(400)
    await p.evaluate("openDrawer('or390c5')"); await p.wait_for_timeout(400)
    bq = await p.evaluate("[...document.querySelectorAll('#view-board [data-id=\"or390c5\"]')].map(x=>x.getAttribute('aria-current')+':'+getComputedStyle(x).outlineStyle)")
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(300)
    bq2 = await p.evaluate("document.querySelectorAll('#view-board [aria-current=\"true\"]').length")
    ok('…on the Board too, the case whose details are open is marked, and the mark goes when they close', bq and all(x.startswith('true:solid') for x in bq) and bq2 == 0, (bq, bq2))

    cl = await p.evaluate(SUM, '#view-board .or-done>summary')
    await p.click('#view-board .or-done>summary')
    await core.until(p, "(()=>{const t=getComputedStyle(document.querySelector('#view-board .or-done>summary'),'::before').transform;return t.startsWith('matrix(')&&Math.abs(parseFloat(t.slice(7).split(',')[1])-1)<0.01})()", 3000)
    op = await p.evaluate(SUM, '#view-board .or-done>summary')
    ok('Disclosure controls · “Done today” leads with a drawn triangle, inward while closed and down while open, and keeps its name (a typed › / ⌄ trailed the names)',
       cl['content'] == '""' and cl['w'] == '12px' and cl['t'] == 'none' and op['t'].startswith('matrix(') and abs(float(op['t'][7:-1].split(',')[1]) - 1) < 0.01
       and cl['lead'] >= 16 and all(a in ('none', 'normal') for a in cl['after'] + op['after']) and cl['text'].startswith('Done today'), (cl, op))
    await p.evaluate("openCase('or390c4','preop')"); await p.wait_for_timeout(700)
    pf = await p.evaluate(SUM, '#caseBody .or-donefold>summary')
    ck = await p.evaluate("(()=>{const o=document.querySelector('#caseBody .or-donefold .ok'), s=o.querySelector('svg');const c=getComputedStyle(s);return [c.fill, c.stroke, getComputedStyle(o).color]})()")
    ok('…and so does Pre-op’s “2 done” (it had no triangle), its check drawn in the label’s green (it was filled black)',
       pf['content'] == '""' and pf['w'] == '12px' and pf['lead'] >= 16 and '2 done' in pf['text'] and ck[0] == 'none' and ck[1] == ck[2], (pf, ck))
    us = await p.evaluate("[...document.querySelectorAll('#caseBody *, #view-board *')].filter(x=>getComputedStyle(x).userSelect==='none'&&x.children.length===0&&x.textContent.trim()&&!x.closest('button,summary,[role=button],[role=tab]')).length")
    ok('Labels · labels stay selectable, so a value can be copied', us == 0, us)
    await p.evaluate("openCase('or390c2','record')"); await p.wait_for_timeout(500)
    await p.click('#caseBody textarea[data-rec-field]'); await p.keyboard.type('Line one')
    await p.evaluate("orYakuriReady()"); await p.keyboard.type(' and two'); await p.wait_for_timeout(200)
    ty = await p.evaluate("[document.activeElement.dataset.recField||null, document.activeElement.value]")
    src = open(os.path.join(BUILD, 'or', 'index.html'), encoding='utf-8').read()
    ok('…a redraw waits while someone types in a case, Yakuri’s too (its library arriving redrew OR at once and took the field away)',
       ty[0] is not None and ty[1].endswith('Line one and two') and 'PvxYakuri.onReady(function(){ window.orYakuriReady(); });' in src, ty)
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await T.open_or(br, vp=(1180, 820), touch=True)
    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(400)
    alt = await p.evaluate("[...document.querySelectorAll('#casesBody tr')].slice(0,4).map(r=>getComputedStyle(r.querySelector('td')).backgroundColor)")
    coarse = await p.evaluate("matchMedia('(hover:none) and (pointer:coarse)').matches")
    ok('Lists and tables · on a touch screen the rows alternate a faint tint, so a row can be followed across', (not coarse) or (alt[0] != alt[1] and alt[0] == alt[2] and alt[1] == alt[3]), (coarse, alt))
    await c.close()
