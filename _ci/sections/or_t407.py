"""Pravix OR — the n407 build's own checks (Nov 18 2026): HIG Lockups, Outline views, Split views, Tab views.
Tab views: → on the case's sections moved twice (Overview → Procedure, skipping Pre-op): two keyboard handlers ran. Each
tab names its pane and the pane is named by the open tab, on the case page and the Board; Pre-op's count says what it
counts; on a phone the five sections are one row that scrolls with a fade. Split views: on a wide window the case details
are an inspector — one click on another case shows it (the first click only closed them), the page isn't dimmed or shut
out; a narrower window keeps the sheet. Lockups: the wall display's room cards are one size."""
import core
from core import ok, section
import or_t390 as T

PANE = "(()=>{const p=document.getElementById('caseBody'), t=document.getElementById(p.getAttribute('aria-labelledby'));return [p.getAttribute('role'), t&&t.dataset.tab, t&&t.getAttribute('aria-selected'), t&&t.getAttribute('aria-controls')]})()"


@section(id='t407', title='n407 · OR · Lockups, Outline views, Split views, Tab views: one move per arrow on the case’s sections, tabs and panes name each other, one row on a phone; the case details are an inspector on a wide window',
         apps=['or'], topics=['tabs', 'split'], engines=('chromium', 'webkit'))
async def s_t407(br):
    c, p, e = await T.open_or(br)
    await p.evaluate("openCase('or390c4')"); await p.wait_for_timeout(600)
    await p.focus('#caseTabs button[aria-selected="true"]')
    seq = []
    for k in ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home']:
        await p.keyboard.press(k); await p.wait_for_timeout(250); seq.append(await p.evaluate("[UI.caseTab, document.activeElement.dataset.tab]"))
    ok('Tab views · each arrow moves one section: → Pre-op, → Procedure, ← Pre-op, End Record, Home Overview (→ from Overview skipped Pre-op)',
       seq == [['preop', 'preop'], ['procedure', 'procedure'], ['preop', 'preop'], ['record', 'record'], ['overview', 'overview']], seq)
    p0 = await p.evaluate(PANE)
    await p.click('#caseTabs [data-tab="record"]'); await p.wait_for_timeout(300)
    p1 = await p.evaluate(PANE)
    named = await p.get_by_role('tab', name='Pre-op, 13 missing').count()
    ok('…each tab names its pane and the pane is named by the open tab (role tabpanel); Pre-op’s count is heard as “Pre-op, 13 missing” (it was “Pre-op13”)',
       p0 == ['tabpanel', 'overview', 'true', 'caseBody'] and p1 == ['tabpanel', 'record', 'true', 'caseBody'] and named == 1, (p0, p1, named))
    await p.click('#caseBack'); await p.wait_for_timeout(400)
    b0 = await p.evaluate("(()=>{const g=document.getElementById('roomGrid'), t=document.getElementById(g.getAttribute('aria-labelledby'));return [g.getAttribute('role'), t&&t.dataset.mode, t&&t.getAttribute('aria-controls')]})()")
    await p.click('#boardMode [data-mode="day"]'); await p.wait_for_timeout(300)
    b1 = await p.evaluate("(()=>{const g=document.getElementById('roomGrid'), t=document.getElementById(g.getAttribute('aria-labelledby'));return [t&&t.dataset.mode, t&&t.getAttribute('aria-selected')]})()")
    await p.click('#boardMode [data-mode="live"]'); await p.wait_for_timeout(300)
    ok('…and the Board’s Live, Day and History name the rooms they show', b0 == ['tabpanel', 'live', 'roomGrid'] and b1 == ['day', 'true'], (b0, b1))

    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(500)
    s0 = await p.evaluate("[document.querySelector('.app').inert, document.getElementById('drawer').getAttribute('aria-modal'), getComputedStyle(document.getElementById('scrim')).opacity, getComputedStyle(document.getElementById('scrim')).pointerEvents]")
    lay = await p.evaluate("""(()=>{const d=document.getElementById('drawer').getBoundingClientRect(), sn=document.getElementById('subnavOR').getBoundingClientRect(),
        q=document.getElementById('globalSearch').getBoundingClientRect(), g=document.getElementById('roomGrid').getBoundingClientRect(), b=document.getElementById('drawerBody'), f=document.getElementById('drawerFoot').getBoundingClientRect();
        return {below:d.top>=sn.bottom, search:q.bottom<=d.top, beside:g.right<=d.left, foot:f.bottom<=innerHeight, scroll:['auto','scroll'].includes(getComputedStyle(b).overflowY)}})()""")
    await p.click('#view-board .or-q[data-id="or390c5"]'); await p.wait_for_timeout(600)
    s1 = await p.evaluate("[UI.drawerId, document.querySelector('#view-board .or-q[data-id=\"or390c5\"]').getAttribute('aria-current')]")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    s2 = await p.evaluate("[UI.drawerId, document.body.classList.contains('or-inspect')]")
    ok('Split views · on a wide window the case details are an inspector: the page stays live and in reach (not inert, not dimmed, not aria-modal), one click on Otis shows Otis (the first click only closed Maple’s), Esc closes',
       s0 == [False, 'false', '0', 'none'] and s1 == ['or390c5', 'true'] and s2 == [None, False], (s0, s1, s2))
    ok('…and the two panes sit side by side: the details start under the app’s bars (search and Add case stay in reach), the rooms make room for them, and the details scroll with their buttons in view',
       lay == {'below': True, 'search': True, 'beside': True, 'foot': True, 'scroll': True}, lay)
    await p.click('#displayBtn'); await p.wait_for_timeout(800)
    cards = await p.evaluate("[...document.querySelectorAll('.or-droom')].map(x=>{const r=x.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})")
    ok('Lockups · the wall display’s room cards are one size, side by side', len(cards) == 2 and cards[0] == cards[1], cards)
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await T.open_or(br, vp=(900, 1000))
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(500)
    n = await p.evaluate("[document.querySelector('.app').inert, document.getElementById('drawer').getAttribute('aria-modal'), document.body.classList.contains('or-inspect')]")
    ok('…a narrower window keeps the details as a sheet over the page (modal, page inert)', n == [True, 'true', False], n)
    await c.close()

    c, p, e = await T.open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("openCase('or390c4')"); await p.wait_for_timeout(700)
    r0 = await p.evaluate("(()=>{const t=document.getElementById('caseTabs');return {tops:[...new Set([...t.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().top)))].length, more:t.scrollWidth>t.clientWidth, end:t.classList.contains('or-more-end'), w:document.documentElement.scrollWidth}})()")
    await p.click('#caseTabs [data-tab="recovery"]'); await p.wait_for_timeout(400)
    await p.evaluate("document.querySelector('#caseTabs [data-tab=\"record\"]').click()"); await p.wait_for_timeout(500)
    r1 = await p.evaluate("(()=>{const t=document.getElementById('caseTabs').getBoundingClientRect(), b=document.querySelector('#caseTabs [data-tab=\"record\"]').getBoundingClientRect();return [Math.round(b.left)>=Math.round(t.left), Math.round(b.right)<=Math.round(t.right)+1]})()")
    ok('Tab views · on a phone the five sections are one row (they wrapped to two), fading at the edge with more and keeping the open one in view, with no sideways page scroll',
       r0['tops'] == 1 and (not r0['more'] or r0['end']) and r0['w'] <= 390 and r1 == [True, True], (r0, r1))
    await c.close()
