"""Pravix OR — the n414 build's own checks (Nov 20 2026): HIG Sidebars, Tab bars, Token fields.
A case page kept none of OR's four sections marked; it now keeps the one it was opened from, and choosing it goes back.
Every switch put a section back at its top; each keeps its place (Flow n363). On an iPhone the sections were a row of
words at the top; they're a bottom tab bar on the floating glass, symbol over label, under every sheet, aside while
typing, and not behind the sign-in card or on the wall display. iPad and Mac keep the row at the top."""
import core
from core import ok, section
import or_t390 as T

SEGS = "[...document.querySelectorAll('#switcher .seg')].map(b=>b.dataset.view+':'+(b.classList.contains('active')?1:0)+':'+(b.getAttribute('aria-current')||''))"
BAR = """()=>{const s=document.getElementById('switcher'), r=s.getBoundingClientRect(), cs=getComputedStyle(s), st=document.getElementById('stage');
  const segs=[...s.querySelectorAll('.seg')].map(b=>{const q=b.getBoundingClientRect(), v=b.querySelector('svg'), vr=v&&v.getBoundingClientRect(), l=b.textContent.trim();
    return {w:Math.round(q.width),h:Math.round(q.height),svg:!!vr&&vr.width>=20&&getComputedStyle(v).display!=='none', above:!!vr&&vr.bottom<=q.bottom-8, l}});
  return {fixed:cs.position, bottom:Math.round(innerHeight-r.bottom), shown:cs.display!=='none'&&r.height>0, h:Math.round(r.height), z:+cs.zIndex||0,
          pad:parseFloat(getComputedStyle(st).paddingBottom)||0, segs, page:document.documentElement.scrollWidth<=innerWidth,
          fill:(()=>{const a=s.querySelector('.seg.active svg :is(rect,path,circle)'); if(!a) return null; const c=getComputedStyle(a); return [c.fill, +c.fillOpacity]})(),
          tabbar:document.documentElement.classList.contains('or-tabbar')}}"""


@section(id='t414', title='n414 · OR · Sidebars, Tab bars, Token fields: a case page keeps its section marked; each section keeps its place; on an iPhone the sections are a bottom tab bar',
         apps=['or'], topics=['navigation', 'tabbar'], engines=('chromium', 'webkit'))
async def s_t414(br):
    errs = []
    # 1 · a case page keeps the section it came from marked; choosing it goes back
    c, p, e = await T.open_or(br)
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(600)
    m1 = await p.evaluate(SEGS)
    await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(600)
    b1 = await p.evaluate("[UI.view, document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.id:null]")
    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(400)
    await p.evaluate("openCase('or390c3')"); await p.wait_for_timeout(600)
    m2 = await p.evaluate(SEGS)
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(500)
    o2 = await p.evaluate("[UI.view, " + SEGS + "]")
    ok('Tab bars · a case page keeps the section it was opened from marked (none was): Board for Maple from the Board, Cases for Pepper from Cases, said as the current section',
       m1 == ['board:1:true', 'schedule:0:', 'cases:0:', 'analytics:0:'] and m2 == ['board:0:', 'schedule:0:', 'cases:1:true', 'analytics:0:'], (m1, m2))
    ok('…choosing that section goes back to where the case was opened, as “‹ Board” does (Maple’s card has focus); another section opens that section',
       b1 == ['board', 'or390c2'] and o2[0] == 'schedule' and o2[1][1] == 'schedule:1:true', (b1, o2))
    errs += list(e)
    await c.close()

    # 2 · each section keeps its place (iPhone, where Cases is a long list)
    c, p, e = await T.open_or(br, vp=(390, 844), touch=True)
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
    await p.evaluate("document.getElementById('stage').scrollTop=320"); await p.wait_for_timeout(300)
    y0 = await p.evaluate("document.getElementById('stage').scrollTop")
    await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(400)
    yb = await p.evaluate("document.getElementById('stage').scrollTop")
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(600)
    y1 = await p.evaluate("document.getElementById('stage').scrollTop")
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(400)
    ys = await p.evaluate("document.getElementById('stage').scrollTop")
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(600)
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(600)
    yt = await p.evaluate("document.getElementById('stage').scrollTop")
    ok('Tab bars · each section keeps its place: Cases scrolled 320 pt, a look at the Board and the Schedule, and Cases comes back where it was (it came back at its top); a section opened for the first time starts at its top',
       y0 > 200 and abs(y1 - y0) <= 3 and yb == 0 and ys == 0, (y0, yb, y1, ys))
    ok('…choosing the section you’re on takes it to its top', yt == 0, yt)

    # 3 · the iPhone tab bar (on the Board: its symbol has shapes to fill; Cases' and Analytics' are lines, which have no fill variant)
    await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(400)
    bar = await p.evaluate(BAR)
    ok('Tab bars (iOS) · on an iPhone OR’s sections are a bottom tab bar (they were a row of words at the top, symbols hidden): four tabs, each at least 44 pt, a symbol over a one-word label, the page leaves room for it, nothing scrolls sideways',
       bar['tabbar'] and bar['fixed'] == 'fixed' and bar['bottom'] == 0 and bar['shown'] and len(bar['segs']) == 4
       and all(s['h'] >= 44 and s['w'] >= 44 and s['svg'] and s['above'] and s['l'] in ('Board', 'Schedule', 'Cases', 'Analytics') for s in bar['segs'])
       and bar['pad'] >= bar['h'] and bar['page'], bar)
    ok('…the selected tab uses the fill variant, half filled (n227; Board here — Cases and Analytics are drawn with lines, which have none)', bool(bar['fill']) and bar['fill'][0] != 'none' and 0.4 <= bar['fill'][1] <= 0.8, bar['fill'])
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(500)
    under = await p.evaluate("(()=>{const b=document.querySelector('#switcher .seg').getBoundingClientRect(); const x=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return !!x&&!x.closest('#switcher')})()")
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(400)
    await p.click('#globalSearch'); await p.wait_for_timeout(300)
    typing = await p.evaluate(BAR)
    await p.evaluate("document.activeElement.blur()"); await p.wait_for_timeout(400)
    after = await p.evaluate(BAR)
    ok('…it sits under a case’s sheet, and steps aside while a field has the keyboard, coming back after',
       under and not typing['shown'] and after['shown'], (under, typing['shown'], after['shown']))
    await p.evaluate("enterDisplay()"); await p.wait_for_timeout(500)
    disp = await p.evaluate("document.documentElement.classList.contains('or-tabbar')")
    await p.evaluate("exitDisplay()"); await p.wait_for_timeout(400)
    await p.evaluate("orLock(true)"); await p.wait_for_timeout(300)
    lock = await p.evaluate("document.documentElement.classList.contains('or-tabbar')")
    await p.evaluate("orLock(false)"); await p.wait_for_timeout(400)
    back = await p.evaluate("document.documentElement.classList.contains('or-tabbar')")
    errs += list(e)
    await c.close()

    # iPad and Mac keep the row at the top
    keep = {}
    for vp, touch in [((820, 1180), True), ((1440, 900), False)]:
        c, p, e = await T.open_or(br, vp=vp, touch=touch)
        keep[vp[0]] = await p.evaluate("(()=>{const s=document.getElementById('switcher'), r=s.getBoundingClientRect(); return [getComputedStyle(s).position, Math.round(r.top)<200, document.documentElement.classList.contains('or-tabbar')]})()")
        errs += list(e)
        await c.close()
    ok('…not on the wall display or behind the sign-in card, and back after; an iPad and a Mac keep the sections at the top',
       back and not disp and not lock and keep.get(820) == ['static', True, False] and keep.get(1440) == ['static', True, False], (back, disp, lock, keep))
    ok('no page errors', not errs, errs)
