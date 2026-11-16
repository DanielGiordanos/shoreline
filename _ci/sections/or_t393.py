"""Pravix OR — the n393 build's own checks (Nov 15 2026): HIG Branding, Color, Dark Mode.
Color + Dark Mode: a stage's symbol is in its stage's colour in light as in dark (every light symbol was the pre-op blue);
the page tells the browser its appearance, so the system's own menus, pickers and scroll bars follow it (they were light on
the dark page), and the device's bars follow it too (theme-color stayed navy over the light page); with Increase Contrast
small text reaches 7 : 1 in both appearances (the red issue rows, Emergency and the drawer's stage in dark; Live / Day /
History, the case tabs, the Legend links and the late amber in light stopped short).
Branding: the wall display's counts in sentence case; the accent stays on what's selected and the one primary action; no
other company's trademarks in OR's words."""
import re
import core
from core import ok, section
from or_t390 import open_or, CONTRAST

MARKS = r"""(sel)=>[...document.querySelectorAll(sel)].filter(m=>m.getBoundingClientRect().width>0).map(m=>[m.getAttribute('aria-label')||'',getComputedStyle(m).color,getComputedStyle(m.parentElement).color])"""
ACC = r"""(()=>{const x=document.createElement('span');x.style.color='var(--accent)';document.body.appendChild(x);const A=getComputedStyle(x).color;x.remove();
 return [...document.querySelectorAll('#stage *, #subnavOR *')].filter(e=>{const r=e.getBoundingClientRect();if(r.width<1||r.bottom<0||r.top>innerHeight)return false;const cs=getComputedStyle(e);
 return (cs.color===A&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))||cs.backgroundColor===A}).map(e=>(e.textContent||'').trim().slice(0,16))})()"""
TM = re.compile(r'\b(iPad|iPhone|Apple|macOS|iOS|Siri|Spotlight|Dynamic Island|Quick Look|AirDrop|FaceTime|Liquid Glass|iCloud|Face ID|Touch ID|Apple Watch)\b')


@section(id='t393', title='n393 · OR · Branding, Color, Dark Mode: stage symbols in their own colour in light, the browser told the appearance (menus, pickers, bars), 7 : 1 small text with Increase Contrast, sentence case on the wall display, the accent kept for what’s selected',
         apps=['or'], topics=['color', 'dark-mode', 'branding', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t393(br):
    # ── Color + Dark Mode: symbols ──
    for dark in (True, False):
        mode = 'dark' if dark else 'light'
        c, p, e = await open_or(br, dark=dark)
        m = await p.evaluate(MARKS, '#view-board .or-milestone')
        await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
        m += await p.evaluate(MARKS, '#casesBody .or-milestone')
        await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(300)
        await p.click('#displayBtn'); await p.wait_for_timeout(1000)
        d = await p.evaluate(MARKS, '.dstage .or-milestone, #displayGrid .or-milestone')
        ok(f'Color · {mode}: every stage symbol is in its stage’s colour, on the board, in Cases and on the wall display (in light all were the pre-op blue)',
           len(m) >= 6 and len(d) >= 1 and all(x[1] == x[2] for x in m + d) and len({x[1] for x in m + d}) >= 3, (m + d)[:8])
        summ = await p.evaluate("document.getElementById('displaySummary').innerText.replace(/\\s+/g,' ')")
        ok(f'Branding · {mode}: the wall display’s counts are in sentence case (“1 room in use · 0 blocked”, not “1 Room in use · 0 Blocked”)',
           re.search(r'\d+ rooms? in use', summ) and re.search(r'\d+ blocked', summ) and re.search(r'\d+ delayed', summ) and re.search(r'\d+ ready', summ), summ)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
        ok(f'…no page errors ({mode})', not e, e[:3])
        await c.close()

    # ── Dark Mode: the browser and the bars follow the appearance ──
    c, p, e = await open_or(br, dark=True)
    s1 = await p.evaluate("({root:getComputedStyle(document.documentElement).colorScheme,meta:document.querySelector('meta[name=theme-color]').content})")
    await p.click('#addCaseBtn'); await p.wait_for_timeout(500)
    sel = await p.evaluate("[...document.querySelectorAll('.or-field select, .or-field input')].filter(e=>e.getBoundingClientRect().width>0).map(e=>getComputedStyle(e).colorScheme)")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('Dark Mode · the page tells the browser it’s dark, so Add case’s menus, the date and time pickers and the scroll bars are dark too (they were light), and the device’s bars are navy',
       s1['root'] == 'dark' and sel and all(x == 'dark' for x in sel) and s1['meta'].upper() == '#0A1222', (s1, sel))
    await p.evaluate("document.body.classList.remove('dark')"); await p.wait_for_timeout(300)
    s2 = await p.evaluate("({root:getComputedStyle(document.documentElement).colorScheme,meta:document.querySelector('meta[name=theme-color]').content})")
    ok('…and when the appearance changes while OR is open, both follow (the bars stayed navy over the light page)', s2['root'] == 'light' and s2['meta'].upper() == '#F2F4F8', s2)
    await c.close()

    # ── Dark Mode + Increase Contrast: 7 : 1 small text ──
    c, p, e = await open_or(br, dark=True); await p.emulate_media(contrast='more'); await p.wait_for_timeout(300)
    r = await p.evaluate(CONTRAST, '#view-board .or-issue.is-block b, #view-board .or-issue.is-block .or-issue-why, #view-board .or-type.is-emergency')
    await p.evaluate("openDrawer('or390c4')"); await p.wait_for_timeout(700)
    r += await p.evaluate(CONTRAST, '.or-drawer .dh-tags .or-stage, #drawerAnesia')
    ok('Dark Mode · dark, Increase Contrast: the red issue rows, Emergency, the drawer’s stage and Open Anesia reach 7 : 1 (they were 6.6–6.9)', len(r) >= 4 and all(x[1] >= 7 for x in r), r)
    await c.close()
    c, p, e = await open_or(br, dark=False); await p.emulate_media(contrast='more'); await p.wait_for_timeout(300)
    r = await p.evaluate(CONTRAST, '#boardMode button, #view-board .or-sum-chip.warn, #view-board .or-sum-chip.warn b')
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
    r += await p.evaluate(CONTRAST, '#casesLegend, #casesBody .or-late')
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(1500)
    r += await p.evaluate(CONTRAST, '#caseTabs button')
    ok('…light, Increase Contrast: Live / Day / History, the case tabs, the Legend links and the late amber reach 7 : 1 (4.6–6.8)', len(r) >= 8 and all(x[1] >= 7 for x in r), [x for x in r if x[1] < 7] or r[:4])
    ok('…no page errors (Increase Contrast)', not e, e[:3])
    await c.close()

    # ── Branding: the accent and the words ──
    c, p, e = await open_or(br, dark=True)
    a = await p.evaluate(ACC)
    words = await p.evaluate("(()=>{const out=new Set();document.querySelectorAll('#stage *, #subnavOR *').forEach(e=>{if(e.getBoundingClientRect().width<1)return;[...e.childNodes].forEach(n=>{if(n.nodeType===3&&n.textContent.trim())out.add(n.textContent.trim())});['title','aria-label','placeholder'].forEach(k=>{const v=e.getAttribute(k);if(v)out.add(v)})});return [...out]})()")
    tm = [w for w in words if TM.search(w)]
    ok('Branding · the accent marks only what’s selected and the one primary action (Board, Live, Add case), and OR’s words name no other company’s products',
       len(a) <= 4 and tm == [], (a, tm))
    await c.close()
