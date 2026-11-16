"""Pravix OR — the n391 build's own checks (Nov 15 2026): HIG Color + Layout.
Color: "In surgery" and Critical no longer share a coral (ΔE 5.5 in dark); DNR is purple, as everywhere in Pravix; Add-on is a
grey label, so purple doesn't also mean a booking type; Increase Contrast gives every status colour a stronger value and the
status pills an edge. Layout: messages appear under OR's bar, not at the window's bottom edge or over Log out; with larger text
the Up next times grow instead of running into the names and the bar wraps; search stays on an iPad in portrait and on an
iPhone (it was hidden under 900 pt)."""
import math
import core
from core import ok, section
from or_t390 import open_or


def _lab(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4) for v in c]
    X = (c[0] * .4124 + c[1] * .3576 + c[2] * .1805) / .95047; Y = c[0] * .2126 + c[1] * .7152 + c[2] * .0722; Z = (c[0] * .0193 + c[1] * .1192 + c[2] * .9505) / 1.08883
    f = lambda t: t ** (1 / 3) if t > .008856 else 7.787 * t + 16 / 116
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))


def de2000(a, b):
    L1, a1, b1 = _lab(a); L2, a2, b2 = _lab(b)
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2); Cm = (C1 + C2) / 2; G = .5 * (1 - math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2; C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1 = math.degrees(math.atan2(b1, a1p)) % 360; h2 = math.degrees(math.atan2(b2, a2p)) % 360
    dL, dC, dh = L2 - L1, C2p - C1p, h2 - h1
    if dh > 180: dh -= 360
    elif dh < -180: dh += 360
    dH = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dh / 2)); Lm = (L1 + L2) / 2; Cpm = (C1p + C2p) / 2
    hm = (h1 + h2) / 2 if abs(h1 - h2) <= 180 else (h1 + h2 + 360) / 2
    T = 1 - .17 * math.cos(math.radians(hm - 30)) + .24 * math.cos(math.radians(2 * hm)) + .32 * math.cos(math.radians(3 * hm + 6)) - .2 * math.cos(math.radians(4 * hm - 63))
    SL = 1 + .015 * (Lm - 50) ** 2 / math.sqrt(20 + (Lm - 50) ** 2); SC = 1 + .045 * Cpm; SH = 1 + .015 * Cpm * T
    RT = -2 * math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7)) * math.sin(math.radians(60 * math.exp(-((hm - 275) / 25) ** 2)))
    return math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH))


TOK = "(()=>{const s=getComputedStyle(document.body);return ['--st-critical','--st-procedure','--st-preop','--st-recovery','--or-dnr'].map(k=>s.getPropertyValue(k).trim().toUpperCase())})()"
RGB2HEX = "(c)=>'#'+c.match(/[\\d.]+/g).slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('').toUpperCase()"


@section(id='t391', title='n391 · OR · Color and Layout: In surgery and Critical apart, DNR purple, Add-on grey, Increase Contrast values; messages under the bar; larger text; search on iPad portrait and iPhone',
         apps=['or'], topics=['color', 'layout', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t391(br):
    # ── Color ──
    for dark in (True, False):
        mode = 'dark' if dark else 'light'
        c, p, e = await open_or(br, dark=dark)
        tok = await p.evaluate(TOK)
        d = de2000(tok[0], tok[1])
        ok(f'Color · {mode}: Critical {tok[0]} and the Procedure stage {tok[1]} are told apart (ΔE {d:.1f}; they were 5.5 in dark and 6.5 in light)', d >= 12, tok)
        dnr = await p.evaluate("(()=>{const i=document.querySelector('.or-ico[data-flag=\"dnr\"]');return i?getComputedStyle(i).getPropertyValue('--ic').trim().toUpperCase():null})()")
        ok(f'…{mode}: the DNR flag is purple ({dnr}), as DNR is everywhere in Pravix (it was the critical red)', dnr == tok[4] and dnr in ('#B48BD6', '#8B4DB5'), (dnr, tok[4]))
        ao = await p.evaluate("(()=>{const a=document.querySelector('.or-type.is-addon'), x=document.createElement('span'); x.style.color='var(--ink-700)'; document.body.appendChild(x); const r=[getComputedStyle(a).color, getComputedStyle(x).color, getComputedStyle(document.body).getPropertyValue('--st-inor').trim()]; x.remove(); return r})()")
        ok(f'…{mode}: “Add-on” is written in the plain secondary ink, so purple no longer also means a kind of booking', ao[0] == ao[1], ao)
        await p.emulate_media(contrast='more'); await p.wait_for_timeout(300)
        hc = await p.evaluate(TOK)
        edge = await p.evaluate("(()=>{const s=document.querySelector('.or-stage');return getComputedStyle(s).boxShadow})()")
        want = {'dark': ['#FF9494', '#FFB488', '#A8C8FF', '#86E6F7', '#D9B8F0'], 'light': ['#850E1B', '#6B2C0B', '#163A7A', '#05434F', '#5C2880']}[mode]
        ok(f'…{mode}, Increase Contrast: every status colour and DNR take their stronger value, and status pills get an edge (before, only greys and outlines changed)',
           hc == want and 'inset' in edge, (hc, edge[:60]))
        if not dark:
            await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
            cs = await p.evaluate(__import__('or_t390').CONTRAST, '#casesBody .or-stage')
            ok('…light, Increase Contrast: status words in Cases reach 7 : 1', cs and all(x[1] >= 7 for x in cs), cs)
        ok(f'…no page errors ({mode})', not e, e[:3])
        await c.close()

    # ── Layout: messages under the bar ──
    c, p, e = await open_or(br)
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(500)
    await p.click('#drawerAdvance'); await p.wait_for_timeout(500)
    await p.evaluate("closeDrawer()"); await p.evaluate("notify('Anesia · Anesthesia started','Maple','var(--st-inor)')"); await p.wait_for_timeout(600)
    pos = await p.evaluate("(()=>{const b=document.getElementById('subnavOR').getBoundingClientRect().bottom, t=document.getElementById('toast').getBoundingClientRect(), n=document.querySelector('#notes .note').getBoundingClientRect(), lo=document.querySelector('.topnav').getBoundingClientRect(); return {bar:Math.round(b), toast:Math.round(t.top), note:Math.round(n.top), h:innerHeight, tb:Math.round(t.bottom)}})()")
    ok('Layout · the Undo message and notifications sit just under OR’s bar (the message was at the window’s bottom edge, the notifications over Log out and the light/dark switch)',
       pos['bar'] <= pos['toast'] <= pos['bar'] + 24 and pos['bar'] <= pos['note'] <= pos['bar'] + 24 and pos['tb'] < pos['h'] / 2, pos)
    await c.close()

    # ── Layout: larger text ──
    c, p, e = await open_or(br)
    await p.add_style_tag(content='html{font-size:200%!important}'); await p.wait_for_timeout(700)
    lt = await p.evaluate("(()=>{const rows=[...document.querySelectorAll('#view-board .or-q')]; return {n:rows.length, overlap:rows.filter(r=>{const t=r.querySelector('.or-q-time').getBoundingClientRect(), m=r.querySelector('.or-q-main').getBoundingClientRect(); return t.right>m.left+1;}).length, search:Math.round(document.querySelector('#subnavOR .search').getBoundingClientRect().right), w:document.documentElement.clientWidth}})()")
    ok('Layout · with text at 200 %, the Up next times grow instead of running into the names (“11:30 AMJuniper”), and search stays inside the window',
       lt['n'] >= 4 and lt['overlap'] == 0 and lt['search'] <= lt['w'], lt)
    await c.close()

    # ── Layout: search on iPad portrait and iPhone ──
    for vp, label in (((820, 1180), 'iPad in portrait'), ((390, 844), 'iPhone')):
        c, p, e = await open_or(br, vp=vp, touch=True)
        s = await p.evaluate("(()=>{const i=document.getElementById('globalSearch'), r=i.getBoundingClientRect(), a=document.getElementById('addCaseBtn').getBoundingClientRect(); return {w:Math.round(r.width), h:Math.round(i.closest('.search-bar').getBoundingClientRect().height), add:[Math.round(a.width),Math.round(a.height)], name:document.getElementById('addCaseBtn').textContent.trim(), page:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()")
        ok(f'Layout · {label}: search is there (it was hidden under 900 pt), with room to type, and nothing scrolls sideways',
           s['w'] >= 120 and s['page'] <= 0 and (vp[0] > 600 or (s['add'] == [44, 44] and s['name'] == 'Add case…')), s)
        await p.click('#globalSearch'); await p.keyboard.type('Maple'); await p.wait_for_timeout(700)
        hit = await p.evaluate("(()=>{const r=document.getElementById('searchResults'); return r?r.innerText.indexOf('Maple')>-1:false})()")
        ok(f'…{label}: and it finds a case', hit is True, hit)
        ok(f'…no page errors ({label})', not e, e[:3])
        await c.close()
