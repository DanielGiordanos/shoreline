"""Pravix OR — the n417 build's own checks (Nov 20 2026): HIG Panels, Popovers, Scroll views.
With nothing focused the scroll keys did nothing (OR scrolls inside #stage); they scroll it now, never while typing or behind
an overlay. The Schedule's sideways timeline stopped flush at both edges; the edge with more fades. Cases' sticky headings
scrolled away with the list (the table's box scrolled sideways); they stay whenever the table fits."""
import core
from core import ok, section
import or_t390 as T

ST = "document.getElementById('stage').scrollTop"


@section(id='t417', title='n417 · OR · Panels, Popovers, Scroll views: the scroll keys scroll OR with nothing focused; the Schedule’s timeline shows it scrolls; Cases’ headings stay',
         apps=['or'], topics=['scroll', 'keyboard'], engines=('chromium', 'webkit'))
async def s_t417(br):
    errs = []
    c, p, e = await T.open_or(br, vp=(1440, 560))   # short enough that a page is less than the whole board
    keys = {}
    for k in ['PageDown', 'Space', 'ArrowDown', 'End']:
        await p.evaluate("document.activeElement&&document.activeElement.blur(); document.getElementById('stage').style.scrollBehavior='auto'; document.getElementById('stage').scrollTop=0; 0")
        await p.keyboard.press(k); await p.wait_for_timeout(700)
        keys[k] = await p.evaluate(ST)
    room = await p.evaluate("(()=>{const s=document.getElementById('stage');return [s.clientHeight, s.scrollHeight]})()")
    await p.keyboard.press('Home'); await p.wait_for_timeout(700)
    home = await p.evaluate(ST)
    ok('Scroll views · with nothing focused, Page Down, Space, ↓ and End scroll OR (they did nothing): a page keeping a line in view, a line, the end; Home goes back to the top',
       room[1] > room[0] + 100 and abs(keys['PageDown'] - min(room[0] - 48, room[1] - room[0])) <= 2 and keys['Space'] == keys['PageDown'] and 20 <= keys['ArrowDown'] <= 60
       and abs(keys['End'] - (room[1] - room[0])) <= 2 and home == 0, (keys, room, home))
    # never while typing or behind an overlay
    await p.click('#globalSearch'); await p.keyboard.press('Space'); await p.wait_for_timeout(400)
    typing = await p.evaluate("[document.getElementById('stage').scrollTop, document.getElementById('globalSearch').value]")
    await p.evaluate("document.getElementById('globalSearch').value=''; document.activeElement.blur(); 0"); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("openModal({title:'Reset demo data?', sub:'x', body:'', actions:[{label:'Cancel',ghost:true},{label:'Reset',act:()=>{}}]}); document.activeElement.blur(); 0"); await p.wait_for_timeout(300)
    await p.keyboard.press('PageDown'); await p.wait_for_timeout(500)
    behind = await p.evaluate(ST)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('…never while typing (Space types a space) or behind a sheet or alert', typing == [0, ' '] and behind == 0, (typing, behind))

    # the Schedule's timeline
    await p.evaluate("switchView('schedule')"); await p.wait_for_timeout(600)
    s1 = await p.evaluate("(()=>{const s=document.querySelector('.or-sched-scroll'), c=getComputedStyle(s); return [s.scrollLeft>2, s.scrollLeft<s.scrollWidth-s.clientWidth-2, (c.webkitMaskImage||c.maskImage)!=='none', s.classList.contains('or-more-start'), s.classList.contains('or-more-end')]})()")
    await p.evaluate("(()=>{const s=document.querySelector('.or-sched-scroll'); s.scrollLeft=0; })()"); await p.wait_for_timeout(300)
    s2 = await p.evaluate("(()=>{const s=document.querySelector('.or-sched-scroll'); return [s.classList.contains('or-more-start'), s.classList.contains('or-more-end')]})()")
    await p.evaluate("(()=>{const s=document.querySelector('.or-sched-scroll'); s.scrollLeft=s.scrollWidth; })()"); await p.wait_for_timeout(300)
    s3 = await p.evaluate("(()=>{const s=document.querySelector('.or-sched-scroll'); return [s.classList.contains('or-more-start'), s.classList.contains('or-more-end')]})()")
    lab = await p.evaluate("(()=>{const s=document.querySelector('.or-sched-scroll'), l=s.querySelector('.or-lane > :first-child'); return [parseFloat(s.style.getPropertyValue('--or-lw')), Math.round(l.getBoundingClientRect().width)]})()")
    ok('…the Schedule’s timeline shows it scrolls sideways (it stopped flush at both edges): the edge with more hours fades, just past the room names, and only that edge',
       s1 == [True, True, True, True, True] and s2 == [False, True] and s3 == [True, False] and lab[0] == lab[1] and lab[1] > 100, (s1, s2, s3, lab))
    errs += list(e); await c.close()

    # Cases' headings stay
    res = {}
    for vp in [(1440, 600), (1024, 600)]:
        c, p, e = await T.open_or(br, vp=vp)
        await p.evaluate("switchView('cases')"); await p.wait_for_timeout(500)
        await p.evaluate("document.getElementById('stage').style.scrollBehavior='auto'; document.getElementById('stage').scrollTop=200; 0"); await p.wait_for_timeout(300)
        res[vp[0]] = await p.evaluate("(()=>{const th=document.querySelector('#casesTable thead th'), st=document.getElementById('stage').getBoundingClientRect(), r=th.getBoundingClientRect(), x=document.elementFromPoint(r.left+20, r.top+r.height/2); return [Math.round(r.top-st.top), !!x&&!!x.closest('thead'), document.getElementById('stage').scrollTop]})()")
        errs += list(e); await c.close()
    ok('Scroll views · Cases’ column headings stay at the top while the list scrolls (they scrolled away with it: the table’s box scrolled sideways)',
       all(v[2] >= 150 and abs(v[0]) <= 2 and v[1] for v in res.values()), res)
    ok('no page errors', not errs, errs)
