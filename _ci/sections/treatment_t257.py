"""Treatment Sheets — the n257 build's own checks: Treatment Sheets against HIG Accessibility, Color, Dark Mode, Icons.
Written with that build; they run in Chromium and WebKit (Safari's engine)."""
import os, json
import tsh as h
from tsh import *
from core import ok, section, BUILD as SITE, PORT, ENGINE, YKSEED, LICENSED

# from the n257 audit (a11.py)
LUMJS = r"""const P=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [a[0],a[1],a[2],a.length>3?a[3]:1]};
const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const CR=(a,b)=>(Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05);
const blend=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1];
const bgOf=e=>{const st=[];let p=e;while(p&&p.nodeType===1){const b=P(getComputedStyle(p).backgroundColor);if(b&&b[3]>0){st.push(b);if(b[3]>=.99)break}p=p.parentElement}
  let base=st.length&&st[st.length-1][3]>=.99?st.pop():(document.documentElement.classList.contains('light')||document.body.classList.contains('light')?[255,255,255,1]:[12,18,28,1]);for(let i=st.length-1;i>=0;i--)base=blend(st[i],base);return base};"""
SEVEN = VIS + DESC + LUMJS + r"""
(()=>{const out={n:0,u7:0,u45:0,ex:[]};const seen=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:t=>t.nodeValue.trim()?1:2});let t;const top=document.querySelector('nav.topnav');
 while(t=w.nextNode()){const e=t.parentElement;if(!e||seen.has(e))continue;seen.add(e);if(vis(e)!==true||(top&&top.contains(e))||e.closest('svg'))continue;if(e.closest('[disabled],[aria-disabled=true]'))continue;const c=getComputedStyle(e);const px=parseFloat(c.fontSize);if(px>15)continue;
  let fg=P(c.color);if(!fg)continue;const bg=bgOf(e);fg=blend([fg[0],fg[1],fg[2],fg[3]*+c.opacity],bg);const r=CR(fg,bg);out.n++;if(r<7){out.u7++;if(out.ex.length<400)out.ex.push([where(e),desc(e),t.nodeValue.trim().slice(0,28),+r.toFixed(2),Math.round(px),c.color])}if(r<4.5)out.u45++}
 return out})()"""
SECS = ['dash', 'tasks', 'sheet', 'vitals', 'timeline', 'charges', 'notes']
LIFE = r"""(async(m,hover)=>{toast(m);await new Promise(r=>setTimeout(r,60));const el=[...document.querySelectorAll('#toastWrap .ctoast')].pop();
  if(hover)el.dispatchEvent(new MouseEvent('mouseenter'));const t0=performance.now();
  let seen=false;   /* gone = removed, or faded out after it was shown (WebKit can start the fade-in late, so 0 at first isn't gone) */
  for(let i=0;i<120;i++){await new Promise(r=>setTimeout(r,100));const op=el.isConnected?+getComputedStyle(el).opacity:0;if(op>.5)seen=true;if(!el.isConnected||(seen&&op<.05))return {life:Math.round(performance.now()-t0),close:!!el.querySelector('.pvx-tx')}}
  return {life:null,close:!!el.querySelector('.pvx-tx')}})"""
UNIT = r"""(sel=>{const s=document.querySelector(sel);if(!s)return null;const r=s.getBoundingClientRect();return +(Math.max(...[...s.querySelectorAll('path,rect,circle,line')].map(p=>parseFloat(getComputedStyle(p).strokeWidth)||0))*24/s.viewBox.baseVal.width).toFixed(2)})"""
async def bare(br, sysdark, cookie=None):
    ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark' if sysdark else 'light')
    if cookie: await ctx.add_cookies([{'name': 'pvx_theme', 'value': cookie, 'url': f'http://127.0.0.1:{PORT}/'}])
    await ctx.add_init_script(h.INIT.replace('@@USER@@', h.USER).replace('@@SEED@@', h.SEED)); await ctx.add_init_script(h.FAKE)
    pg = await ctx.new_page()
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=h.STUB.get(u.rsplit('/', 1)[-1], ''))
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2400)
    return ctx, pg


@section(id='t257', title='n257 · Treatment Sheets against HIG Accessibility, Color, Dark Mode, Icons',
         apps=['treatment'], topics=['accessibility', 'color', 'dark-mode', 'icons'], engines=('chromium', 'webkit'))
async def s_t257(br):
    # 1. messages
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("document.querySelectorAll('#toastWrap .ctoast').forEach(t=>t.remove())")
    a = await pg.evaluate(LIFE + "('Note saved',false)")
    ok('Accessibility: an ordinary message stays at least 4 s (it went after 2.6 s)', a['life'] and a['life'] >= 3900, a)
    b = await pg.evaluate(LIFE + "('The estimate was updated for Biscuit Training, and the owner’s deposit now covers the next two days of care',false)")
    ok('Accessibility: a long message stays longer than a short one (reading time)', b['life'] and a['life'] and b['life'] >= a['life'] + 1500, [a, b])
    c = await pg.evaluate(LIFE + "('Yakuri’s drug library didn’t load. Type each dose yourself.',false)")
    ok('Accessibility: “Yakuri’s drug library didn’t load” stays until closed, and has Close (it went after 2.6 s)', c['life'] is None and c['close'], c)
    d = await pg.evaluate(LIFE + "('Couldn’t save — check the connection',false)")
    ok('Accessibility: an error stays until closed, with Close (it went after 8 s)', d['life'] is None and d['close'], d)
    w = await pg.evaluate(LIFE + "('Enter a dose first',false)")
    ok('Accessibility: other warnings stay at least 6 s, with Close (they went after 2.6 s, with no Close)', w['life'] and w['life'] >= 5900 and w['close'], w)
    hv = await pg.evaluate(LIFE + "('Note saved',true)")
    ok('Accessibility: a message waits while the pointer is on it', hv['life'] is None, hv)
    await pg.evaluate("document.querySelectorAll('#toastWrap .ctoast').forEach(t=>t.remove())")
    n = await pg.evaluate("(async()=>{toast('Yakuri’s drug library didn’t load. Type each dose yourself.');toast('Yakuri’s drug library didn’t load. Type each dose yourself.');toast('Yakuri’s drug library didn’t load. Type each dose yourself.');await new Promise(r=>setTimeout(r,200));return document.querySelectorAll('#toastWrap .ctoast').length})()")
    ok('Accessibility: the same message shown three times appears once', n == 1, n)
    cl = await pg.evaluate("(async()=>{const x=document.querySelector('#toastWrap .ctoast .pvx-tx');if(!x)return -1;x.click();await new Promise(r=>setTimeout(r,500));return document.querySelectorAll('#toastWrap .ctoast').length})()")
    ok('Accessibility: Close removes it', cl == 0, cl)
    ok('messages: no page errors', not e, e[:2]); await ctx.close()
    # 2. grips at least 3:1
    GR = LUMJS + "(sel=>[...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length).slice(0,6).map(e=>{const bg=bgOf(e);return +CR(P(getComputedStyle(e).color),bg).toFixed(2)}))"
    res = {}
    for dark in [True, False]:
        ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, dark=dark, view='sheet'); res['grip/' + str(dark)] = await pg.evaluate(GR + "('#sheetInner .rl-grip')"); await ctx.close()
        ctx, pg, e = await ts(br, PORT, dark=dark, view='dash'); res['dots/' + str(dark)] = await pg.evaluate(GR + "('.sb-row .pt-dots')"); await ctx.close()
    ok('Accessibility: the reorder grips and the board’s row handles are at least 3:1, dark and light (2.2 and 1.9 before)', all(v and min(v) >= 3 for v in res.values()), res)
    # 3. Increase Contrast in dark: small text 7:1
    tot = {'n': 0, 'u7': 0, 'ex': []}
    for v in SECS:
        ctx, pg, e = await ts(br, PORT, dark=True, media={'contrast': 'more'}, view=v)
        s = await pg.evaluate(SEVEN); tot['n'] += s['n']; tot['u7'] += s['u7']; tot['ex'] += [[v] + x[:5] for x in s['ex']]; await ctx.close()
    ok('Color: with Increase Contrast in dark, every small text is at least 7:1 (64 of about 800 weren’t)', tot['n'] > 500 and tot['u7'] == 0, [tot['n'], tot['u7'], tot['ex'][:8]])
    # 4. Auto: follows the system while open, unless someone chose
    ctx, pg = await bare(br, True)
    a0 = await pg.evaluate("document.body.classList.contains('dark')"); await pg.emulate_media(color_scheme='light'); await pg.wait_for_timeout(400)
    a1 = await pg.evaluate("[document.body.classList.contains('dark'),document.querySelector('meta[name=theme-color]').content]"); await pg.emulate_media(color_scheme='dark'); await pg.wait_for_timeout(400)
    a2 = await pg.evaluate("document.body.classList.contains('dark')"); await ctx.close()
    ok('Dark Mode: with no choice saved, the sheet follows the system when it switches while open (it stayed until a reload)', a0 is True and a1[0] is False and a1[1] in ('#F2F4F8', '#FFFFFF') and a2 is True, [a0, a1, a2])
    # a choice made with the top bar's switch holds when the system switches (n258: it is the person's choice)
    ctx, pg = await bare(br, False); await pg.click('.theme-toggle'); await pg.wait_for_timeout(400)
    await pg.emulate_media(color_scheme='dark'); await pg.wait_for_timeout(300); await pg.emulate_media(color_scheme='light'); await pg.wait_for_timeout(400)
    k = await pg.evaluate("document.body.classList.contains('dark')"); await ctx.close()
    ok('Dark Mode: a choice made with the top bar’s switch still wins', k is True, k)
    # 5. color-scheme
    cs = {}
    for dark in [True, False]:
        ctx, pg, e = await ts(br, PORT, dark=dark, view='dash')
        cs[dark] = await pg.evaluate("[getComputedStyle(document.documentElement).colorScheme,getComputedStyle(document.body).colorScheme,[...document.querySelectorAll('#ctab-dash select')].map(s=>getComputedStyle(s).colorScheme)]")
        await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(200)
        cs[str(dark) + '-toggled'] = await pg.evaluate("getComputedStyle(document.body).colorScheme"); await ctx.close()
    ok('Dark Mode: the page tells the browser its appearance, so the Ward pickers, fields and scroll bars are drawn dark in dark and light in light (it was “normal”)',
       'dark' in cs[True][0] and cs[True][1] == 'dark' and cs[True][2] and all(x == 'dark' for x in cs[True][2]) and cs[False][1] == 'light' and cs['True-toggled'] == 'light' and cs['False-toggled'] == 'dark', cs)
    # 6. icons
    ctx, pg, e = await ts(br, PORT, view='sheet')
    u = await pg.evaluate("[" + ",".join(UNIT + f"({json.dumps(q)})" for q in ['#tsCopyBtn>svg:not(.lg-chev)', '.treatment-toolbar .ts-view-btn svg', '.treatment-toolbar .ts-audit-ic, .treatment-toolbar [class*=audit] svg', '.treatment-toolbar .dr-cap svg', '#sheetInner .mark.overdue .od-ic']) + "]")
    cp = await pg.evaluate("(()=>{const b=document.querySelector('.wc-cp svg');return b?b.innerHTML:''})()")
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='dash'); g = await pg.evaluate(UNIT + "('#ctab-dash .sb-gl svg')"); await ctx.close()
    ok('Icons: Share and the teaching cap use the toolbar’s line weight (2.25, like View and Audit; Share was 1.75, the cap 1.8)', u[0] == u[1] == u[3] == 2.25 and (u[2] in (None, 2.25)), u)
    ok('Icons: the board’s overdue clock is drawn like the sheet’s (2.3; it was 2.6)', g == u[4] == 2.3, [g, u[4]])
    ok('Icons: Copy weight is Apple’s Copy symbol (document.on.document), not two squares', 'V11H19' in cp and '<rect' not in cp, cp[:120])
    # no new contrast failures
    bad = []
    for dark in [True, False]:
        for v in SECS:
            ctx, pg, e = await ts(br, PORT, dark=dark, view=v); c = await pg.evaluate(CONTRAST)
            bad += [[dark, v] + f[:5] for f in c['fails'] if f[2] != 'Add note']
            if e: bad.append(['err', v, e[:1]])
            await ctx.close()
    ctx, pg, e = await ts(br, PORT, dark=True, view='charges')
    mb = await pg.evaluate(LUMJS + "(()=>{const b=[...document.querySelectorAll('#ctab-charges button')].find(b=>/Mark all entered/.test(b.innerText));if(!b)return null;const c=getComputedStyle(b);return [c.backgroundColor,+CR(P(c.color),bgOf(b)).toFixed(2)]})()")
    await ctx.close()
    ok('Dark Mode: Charges’ Mark all entered is a Pravix button, not the browser’s light grey one', mb is None or (mb[0] not in ('rgb(239, 239, 239)', 'rgb(107, 107, 107)') and mb[1] >= 7), mb)
    ok('no text below AA in dark or light, and no page errors', not bad, bad[:6])
