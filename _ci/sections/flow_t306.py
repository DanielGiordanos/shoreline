"""Pravix Rounds — the n306 build's own checks: HIG Dark Mode, Icons, Images and Layout (Nov 2 2026), on Rounds' own page
(/rounds/) with the sample census. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]

CR = """(el)=>{const P=s=>(s.match(/[\\d.]+/g)||[0,0,0]).map(Number),rgba=s=>{const v=P(s);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)},L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
const st=[];let e=el;while(e&&e.nodeType===1){const c=rgba(getComputedStyle(e).backgroundColor);if(c.a>0)st.push(c);if(c.a>=1)break;e=e.parentElement}
let b=st.length&&st[st.length-1].a>=1?st.pop():rgba(getComputedStyle(document.body).backgroundColor);for(let i=st.length-1;i>=0;i--)b=over(st[i],b);
const f=over(rgba(getComputedStyle(el).color),b);return +((Math.max(L(f),L(b))+.05)/(Math.min(L(f),L(b))+.05)).toFixed(2)}"""

ROWS = """(()=>{const R=e=>e?e.getBoundingClientRect():null;return [...document.querySelectorAll('#rdList .rd-row')].map(r=>{const n=R(r.querySelector('.rd-name')),
 loc=R(r.querySelector('.rd-locblk')),lb=R(r.querySelector('.rd-locblk .lbl')),st=R(r.querySelector('.rd-chev')),sv=r.querySelector('.rd-svcchip'),row=R(r);
 return {sec:r.closest('.rd-secgroup').dataset.sec||[...r.closest('.rd-secgroup').classList].join(' '),svc:!!(sv&&sv.getClientRects().length),svcTop:sv&&sv.getClientRects().length?R(sv).top:null,svcLeft:sv&&sv.getClientRects().length?R(sv).left:null,
  nameTop:n.top,nameLeft:n.left,loc:loc?Math.round(loc.left):null,lblTop:lb?lb.top:null,chevR:st?Math.round(st.right):null,rowL:Math.round(row.left),rowR:Math.round(row.right),h:Math.round(row.height)}})})()"""


async def page(br, vp=(1440, 900), dark=True, touch=False):
    kw = dict(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
    if touch: kw.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**kw)
    if not dark: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_selector('#subnavRd', state='attached'); await p.wait_for_timeout(2600)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1400)
    return c, p, e


@section(id='t306', title='n306 · Rounds follows the HIG Dark Mode, Icons, Images and Layout pages',
         apps=['rounds'], topics=['rounds', 'layout', 'design'], engines=('chromium', 'webkit'))
async def s_t306(br):
    # ---- Layout · iPhone
    c, p, e = await page(br, (390, 844), dark=False, touch=True)
    rows = await p.evaluate(ROWS)
    ok('Layout · on an iPhone every census row fits the screen (it was 527 pt wide on a 390 pt screen, cutting off the doctors, pending and chevron)',
       rows and all(r['rowR'] <= 390 - 15 and r['rowL'] >= 15 for r in rows) and all(r['chevR'] and r['chevR'] <= 390 - 16 for r in rows), [(r['rowL'], r['rowR'], r['chevR']) for r in rows[:4]])
    g = await p.evaluate("[getComputedStyle(document.getElementById('view-rd-census')).paddingLeft,getComputedStyle(document.getElementById('subnavRd')).paddingLeft,document.scrollingElement.scrollWidth]")
    ok('…with 16 pt margins on the census and its sub-navigation, and no sideways scrolling', g[0] == '16px' and g[1] == '16px' and g[2] <= 390, g)
    st = await p.evaluate("(()=>{const r=document.querySelector('#rdList .rd-row'),R=s=>r.querySelector(s).getBoundingClientRect();return [R('.rd-name').bottom<=R('.rd-right').top+1,R('.rd-chev').top<R('.rd-name').bottom]})()")
    ok('…the row stacks: the patient first, then location and doctors; the chevron stays at the top right', st == [True, True], st)
    ok('no page errors (iPhone)', not newerr(e), e[:3]); await c.close()

    # ---- Layout · Mac
    c, p, e = await page(br, (1440, 900))
    rows = await p.evaluate(ROWS)
    svc = [r for r in rows if r['sec'] not in ('new',) and 'holds' not in r['sec']]
    new = [r for r in rows if r['sec'] == 'new']
    ok('Layout · in a service group the service isn’t repeated beside every patient (the group heading already says it)', svc and not any(r['svc'] for r in svc), [r['sec'] for r in svc if r['svc']])
    ok('…under New Admits it sits above the name, on the name’s left edge', new and all(r['svc'] and r['svcTop'] < r['nameTop'] and abs(r['svcLeft'] - r['nameLeft']) <= 1 for r in new), new[:2])
    locs = {r['loc'] for r in rows if r['loc'] is not None}; chev = {r['chevR'] for r in rows}
    ok('…Location, the doctors and the money line up from row to row (fixed widths), and so do the chevrons', len(locs) == 1 and len(chev) == 1, (locs, chev))
    ok('…the fields hang from the name’s line instead of floating in the middle of a tall row', all(abs(r['lblTop'] - r['nameTop']) <= 8 for r in rows if r['lblTop'] is not None), [(round(r['lblTop']), round(r['nameTop'])) for r in rows[:4]])
    w = await p.evaluate("Math.round(document.querySelector('#rdList .rd-secgroup.by-svc .rd-row .rd-main').getBoundingClientRect().width)")
    ok('…so the patient gets the room: the name, flags and problems column is at least 320 pt wide at 1440 (it was about 210)', w >= 320, w)

    # ---- Icons
    gl = await p.evaluate("(()=>{const t=document.getElementById('view-rd-census').textContent;return ['▶','▼','⌄','⌃'].filter(x=>t.includes(x))})()")
    ok('Icons · no text glyphs as disclosure icons (▶ ▼ ⌄ ⌃): every chevron is the same drawn symbol', gl == [] and await p.evaluate("document.querySelectorAll('.rd-sechead .tri svg.pvx-gi-chev').length") >= 3, gl)
    hd = await p.evaluate("""(async()=>{const h=document.querySelector('.rd-secgroup.by-svc .rd-sechead');const k=h.dataset.key;const a=h.getAttribute('aria-expanded');h.click();await new Promise(r=>setTimeout(r,300));
      const h2=document.querySelector('.rd-sechead[data-key="'+k+'"]');const b=h2.getAttribute('aria-expanded'),tr=getComputedStyle(h2.querySelector('.tri svg')).transform;h2.click();await new Promise(r=>setTimeout(r,300));
      return [a,b,tr!=='none',document.querySelector('.rd-sechead[data-key="'+k+'"]').getAttribute('aria-expanded')]})()""")
    ok('…section heads tell VoiceOver whether they’re open, and the chevron turns when one is closed', hd == ['true', 'false', True, 'true'], hd)
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(800)
    ic = await p.evaluate("""(async()=>{const up=document.querySelector('#rdList .rd-row.open [data-act=prob-up] svg.pvx-gi-up');const t=document.querySelector('#rdList .rd-row.open .rd-attn-toggle');
      let r=null;if(t){const a=t.getAttribute('aria-expanded');t.click();await new Promise(r=>setTimeout(r,300));const t2=document.querySelector('#rdList .rd-row.open .rd-attn-toggle');r=[a,t2.getAttribute('aria-expanded'),!!t2.querySelector('.rd-attn-chevron svg.pvx-gi-chev')]}
      return [!!up,r]})()""")
    ok('…“Move up” is a drawn arrow like its neighbours (check, cross), and Needs Attention’s chevron is the same symbol', ic[0] and (ic[1] is None or ic[1][2]), ic)

    # ---- Dark Mode
    dm = await p.evaluate("[getComputedStyle(document.documentElement).colorScheme,document.querySelector('meta[name=theme-color]').content,getComputedStyle(document.body).backgroundColor]")
    ok('Dark Mode · the page tells the browser it is dark (form controls and scroll bars match) and the window tint follows', dm[0] == 'dark' and dm[1].upper() == '#0A1222', dm)
    ok('no page errors (Mac)', not newerr(e), e[:3]); await c.close()

    for dark in (False, True):
        c, p, e = await page(br, (1440, 900), dark=dark)
        await p.evaluate("document.getElementById('rdStartBtn').click()"); await p.wait_for_timeout(700)
        out = []
        for _ in range(8):
            r = await p.evaluate("(el=>el?[el.textContent,(" + CR + ")(el)]:null)(document.querySelector('#rdMode .rdm-acu'))")
            if r: out.append(r)
            await p.evaluate("(document.querySelector('#rdMode [data-a=next]')||document.querySelector('#rdMode .rdm-next')||{click(){}}).click()"); await p.wait_for_timeout(250)
        pend = await p.evaluate("document.querySelectorAll('#rdMode .r.pend svg.pvx-gi-circle').length+'/'+document.querySelectorAll('#rdMode .r.pend').length")
        ck = await p.evaluate("(()=>{const b=document.querySelector('#rdMode .rdm-ck');if(!b)return null;const r=b.getBoundingClientRect(),c=document.elementFromPoint(r.left+r.width/2,r.top-3);return [Math.round(r.width),c===b]})()")
        th = 'dark' if dark else 'light'
        ok(f'Dark Mode · in Rounds mode ({th}) the status word reads at 4.5:1 or better (Attention was 1.5:1 in light, Critical under 4.5 in both)', out and all(x[1] >= 4.5 for x in out), out)
        ok(f'…pending diagnostics use the open circle, as on the census, and the tick circles take a click 3 pt outside their edge ({th})', (pend.split('/')[0] == pend.split('/')[1]) and (ck is None or ck[1]), (pend, ck))
        ok(f'no page errors (Rounds mode, {th})', not newerr(e), e[:3]); await c.close()

    # ---- Layout · iPad sizes
    for vp in ((820, 1180), (1180, 820)):
        c, p, e = await page(br, vp, dark=False, touch=True)
        rows = await p.evaluate(ROWS)
        ok(f'Layout · at {vp[0]} pt every row fits and its chevron is inside the row', all(r['rowR'] <= vp[0] and r['chevR'] <= r['rowR'] for r in rows) and await p.evaluate("document.scrollingElement.scrollWidth") <= vp[0], [(r['rowR'], r['chevR']) for r in rows[:3]])
        await c.close()
