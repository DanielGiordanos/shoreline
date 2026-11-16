"""Pravix OR — the n394 build's own checks (Nov 16 2026): OR's dark mode matched to the rest of Pravix.
Daniel asked whether OR's dark mode looks like all of Pravix; five things didn't. Status colours in dark take the suite's
own (Ready Flow's green, In OR Flow's purple, Closing Flow's yellow, late Treatment's amber), keeping OR's own only where
the suite's would be too faint as words or too close to Critical; secondary text is the suite's #9AB3CC; the suite's font
stack (Segoe UI on Windows); no "Pravix OR" label in the bar; 20 pt card corners. Increase Contrast keeps its own values."""
import core
from core import ok, section
from or_t390 import open_or, CONTRAST

TOK = "(()=>{const s=getComputedStyle(document.body);return ['--st-ready','--st-inor','--st-closing','--or-late','--st-critical','--st-procedure','--ink-500'].map(k=>s.getPropertyValue(k).trim().toUpperCase())})()"


@section(id='t394', title='n394 · OR · dark mode matched to Pravix: the suite’s status colours where they read as words, the suite’s secondary text and font stack, no bar label, 20 pt corners',
         apps=['or'], topics=['color', 'dark-mode', 'typography', 'branding'], engines=('chromium', 'webkit'))
async def s_t394(br):
    c, p, e = await open_or(br, dark=True)
    tok = await p.evaluate(TOK)
    ok('Dark · Ready, In OR, Closing and late are the suite’s green, purple, yellow and amber (Flow #48B888, #A888E0, #EBC95D; Treatment #E8A830); Critical and In surgery stay OR’s (#FF6B6B, #FF9A62); secondary text #9AB3CC',
       tok == ['#48B888', '#A888E0', '#EBC95D', '#E8A830', '#FF6B6B', '#FF9A62', '#9AB3CC'], tok)
    sel = '#view-board .or-stage, #view-board .or-type, #view-board .or-q-time small, #view-board .or-q-time .late, #view-board .or-room-meta, #view-board .or-prog-l span'
    r = await p.evaluate(CONTRAST, sel)
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
    r += await p.evaluate(CONTRAST, '#casesToolbar .cnt, #casesBody .sm, #casesBody .or-stage, #casesBody .or-late, #casesBody .or-tick')
    await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(300)
    await p.evaluate("openDrawer('or390c4')"); await p.wait_for_timeout(700)
    r += await p.evaluate(CONTRAST, '.or-drawer .or-stage, .or-drawer .or-type, .or-drawer .k, .or-drawer .or-btn')
    low = [x for x in r if x[1] < 4.5]
    ok('…and every status word, label and count still reads at 4.5 : 1 or more on its background', len(r) >= 25 and low == [], low or len(r))
    await p.evaluate("closeDrawer()")
    f = await p.evaluate("getComputedStyle(document.body).fontFamily")
    ok('Typography · the suite’s font stack: SF on Apple devices, Segoe UI on Windows (OR fell back to Helvetica or Arial)', f.startswith('-apple-system') and 'Segoe UI' in f and 'system-ui' in f, f)
    lab = await p.evaluate("(()=>{const t=document.querySelector('#subnavOR .subnav-title');return t?t.getBoundingClientRect().width:0})()")
    rad = await p.evaluate("[document.querySelector('#view-board .or-room'), document.querySelector('.or-sched')].filter(Boolean).map(e=>getComputedStyle(e).borderTopLeftRadius)")
    ok('Branding · no “Pravix OR” label in the bar (Flow, Rounds and Treatment show none), and cards have 20 pt corners (were 22)', lab == 0 and rad and all(x == '20px' for x in rad), (lab, rad))
    await p.emulate_media(contrast='more'); await p.wait_for_timeout(300)
    hc = await p.evaluate(TOK)
    ok('…Increase Contrast keeps its own stronger values (the suite colours apply only without it)', hc[0] == '#7DEFAA' and hc[1] == '#D2BEFF' and hc[6] != '#9AB3CC', hc)
    ok('…no page errors', not e, e[:3])
    await c.close()
