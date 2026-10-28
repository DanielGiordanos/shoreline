"""Treatment Sheets — the n256 build's own checks: Treatment Sheets against HIG Materials, Typography, Branding.
Written with that build; they run in Chromium and WebKit (Safari's engine)."""
import os, json
import tsh as h
from tsh import *
from core import ok, section, BUILD as SITE, PORT, ENGINE, YKSEED, LICENSED

YK = json.loads(YKSEED) if LICENSED else None   # the licensed library: only on the build machine
LUM = "const L=c=>{const m=String(c).match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};"
ICN = r"""(()=>{const q=s=>{const e=[...document.querySelectorAll(s)].find(x=>x.getClientRects().length&&x.getBoundingClientRect().width>0);return e?e.getBoundingClientRect().width:null};
 return {od:q('#sheetInner .mark.overdue .od-ic'),tb:q('.treatment-toolbar .ts-expand-btn svg'),sec:q('#tsSecNav .sn-chip svg'),tab:q('#clinSwitcher .seg svg'),pt:q('.pt-track svg'),name:parseFloat(getComputedStyle(document.querySelector('#sheetInner .rl-name')).fontSize)}})()"""
TYPE = VIS + r"""
(()=>{const bad={w:[],tab:[],tr:[]};const seen=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:t=>t.nodeValue.trim()?1:2});let t;const top=document.querySelector('nav.topnav');
 while(t=w.nextNode()){const e=t.parentElement;if(!e||seen.has(e))continue;seen.add(e);if(vis(e)!==true||(top&&top.contains(e)))continue;const c=getComputedStyle(e);const px=parseFloat(c.fontSize);if(!px)continue;const s=t.nodeValue.trim();
  if(!['400','500','600','700','800'].includes(c.fontWeight))bad.w.push(c.fontWeight+' '+s.slice(0,16));
  if(/\d/.test(s)&&!/tabular/.test(c.fontVariantNumeric))bad.tab.push(s.slice(0,16));
  const ls=c.letterSpacing==='normal'?0:parseFloat(c.letterSpacing);if(px<=12.5&&ls<-0.01)bad.tr.push(s.slice(0,16)+' '+ls)}
 return bad})()"""


@section(id='t256', title='n256 · Treatment Sheets against HIG Materials, Typography, Branding',
         apps=['treatment'], topics=['materials', 'typography', 'branding'], engines=('chromium', 'webkit'))
async def s_t256(br):
    # 1. materials: Share's menu on the glass
    res = []
    for dark in [True, False]:
        c, p, e = await ts(br, PORT, view='sheet', dark=dark)
        await p.evaluate("document.getElementById('tsCopyBtn').click()"); await p.wait_for_timeout(500)
        res.append(await p.evaluate(LUM + """(()=>{const m=document.getElementById('tsCopyMenu');const bg=getComputedStyle(m).backgroundColor;return [...m.querySelectorAll('small')].map(s=>+CR(getComputedStyle(s).color,bg).toFixed(2))})()"""))
        await c.close()
    ok('Materials: Share\'s menu second lines are at least 4.5:1 on the glass, dark and light (4.4 before)', all(x and min(x) >= 4.5 for x in res), res)
    # 2. icons grow with the text
    c, p, e = await ts(br, PORT, view='sheet'); a = await p.evaluate(ICN); await c.close()
    c, p, e = await ts(br, PORT, view='sheet', big=True); b = await p.evaluate(ICN)
    ok('Typography: at 200 % text the overdue clock grows with the sheet (2×; it stayed 18 pt)', b['od'] >= a['od'] * 1.9, (a['od'], b['od']))
    grow = {k: round(b[k] / a[k], 2) for k in ('tb', 'sec', 'tab', 'pt') if a.get(k) and b.get(k)}
    ok('Typography: toolbar, section, sub-nav and patient-tab symbols grow with their labels to 1.5× and hold (n255\'s tab symbols reached 2.4×)', len(grow) == 4 and all(1.3 <= v <= 1.55 for v in grow.values()), grow)
    bd = await p.evaluate("""(()=>{const h=document.querySelector('#sheetInner .grow.ghead'),b=document.querySelector('#sheetInner .grow.gband'),w=document.querySelector('.wc-v');
       document.getElementById('sheetScroll')&&b.scrollIntoView({block:'start'});const s=document.getElementById('sheetScroll');return [parseFloat(getComputedStyle(b).top),Math.round(h.getBoundingClientRect().height),w?w.scrollHeight<=w.clientHeight+1:null]})()""")
    ok('Typography: at 200 % the section band sticks below the taller column header ("Basic" was hidden) and the sidebar\'s weight isn\'t cut off', bd[0] >= bd[1] - 10 and bd[2] is True, bd)
    ok('200 %: no page errors', not e, e[:2]); await c.close()
    # 3. touch: secondary lines and safety labels at least 13 pt
    for v, sel in [('sheet', "#sheetInner .rl-latest :is(small,b,.rl-due)"), ('sheet', ".ts-resus .tr-lbl"), ('sheet', ".ts-al"), ('dash', "#ctab-dash :is(.io-time,.al-empty,.sb-legend .li)"), ('vitals', '#ctab-vitals small')]:
        c, p, e = await ts(br, PORT, vp=(390, 844), touch=True, view=v)
        sz = await p.evaluate(f"[...document.querySelectorAll({json.dumps(sel)})].filter(x=>x.getClientRects().length).map(x=>parseFloat(getComputedStyle(x).fontSize))")
        ok(f'Touch: {sel} is at least 13 pt', sz and min(sz) >= 13, sz[:6]); await c.close()
    # 4. Yakuri's notes are safety text (needs the licensed library: local runs only)
    if YK:
        old = h.SEED; s = json.loads(old); s.update(YK); s['sheets/s_yk'] = {'tenant_id': 'shoreline', 'status': 'active', 'board': 'IP', 'visit_id': None, 'source': 'manual', 'created_at': '2026-10-26T15:00:00.000Z', 'admitted_at': '2026-10-26T15:00:00.000Z', 'created_by': 'X', 'created_uid': 'u9', 'patient': {'name': 'Opal', 'last': 'Training', 'species': 'Dog', 'breed': 'Mix', 'weight': 10, 'reason': 'Vomiting', 'doctor': '', 'location': 'Wards', 'code': 'ALS', 'condition': 'Stable', 'alerts': []}, 'orders': {}, 'notes': [], 'audit': []}
        h.SEED = json.dumps(s)
        for touch in [False, True]:
            c, p, e = await h.ts(br, PORT, vp=(1440, 900) if not touch else (1180, 820), touch=touch, view='sheet', sheet='s_yk', wait=5500)
            await p.evaluate("tsOpenMedOrder('Terbutaline')"); await p.wait_for_timeout(1800)
            n = await p.evaluate("(()=>{const n=document.querySelector('#tsModal.show .pvx-yk-note');if(!n)return null;const c=getComputedStyle(n);return [parseFloat(c.fontSize),parseFloat(c.lineHeight)/parseFloat(c.fontSize),n.classList.contains('hold')]})()")
            need = 16 if touch else 15
            ok(f'Typography: Yakuri\'s hold note is safety text — {need} pt with body leading ({"touch" if touch else "Mac"}; it was 13)', n and n[0] >= need and n[1] >= 1.44 and n[2], n); await c.close()
        h.SEED = old
    # 5–7. weights, tabular digits, tracking across every section
    bad = {}
    for v in ['dash', 'tasks', 'sheet', 'vitals', 'timeline', 'charges', 'notes']:
        for vp, t in [((1440, 900), False), ((390, 844), True)]:
            c, p, e = await ts(br, PORT, vp=vp, touch=t, view=v); r = await p.evaluate(TYPE)
            for k2, val in r.items():
                if val: bad.setdefault(k2, set()).update(val[:3])
            await c.close()
    ok('Typography: five weights only (400–800) — no 550 or 650 anywhere in Treatment (45 rules had them)', not bad.get('w'), bad.get('w'))
    ok('Typography: every number has tabular digits (the Vitals range, "Due now · 9", the weight and the board\'s Done count didn\'t)', not bad.get('tab'), bad.get('tab'))
    ok('Typography: no negative tracking at 12.5 pt or under (hour labels, "kcal/day")', not bad.get('tr'), bad.get('tr'))
    # 8. leading
    c, p, e = await ts(br, PORT, vp=(390, 844), touch=True, view='charges')
    await p.evaluate("toast('A longer message that wraps onto several lines on a phone, so its leading matters for reading')"); await p.wait_for_timeout(300)
    lh = await p.evaluate("(()=>{const t=[...document.querySelectorAll('#toastWrap .ctoast')].pop();const n=document.querySelector('#ctab-charges .ch-lvnote');const f=x=>{const c=getComputedStyle(x);return +(parseFloat(c.lineHeight)/parseFloat(c.fontSize)).toFixed(2)};return [f(t),n?f(n):null]})()")
    ok('Typography: the message toast and the Charges level note get body leading (1.2 → 1.45)', lh[0] >= 1.44 and (lh[1] is None or lh[1] >= 1.44), lh)
    ok('no page errors', not e, e[:2]); await c.close()
