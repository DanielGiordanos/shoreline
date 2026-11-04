"""Pravix Rounds — the n319 build's own checks: HIG Buttons, Context menus and Dock menus (Nov 4 2026), on Rounds' own page.
Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, seed=None, user=FU, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', user).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    return c


async def open_(c, path='/rounds/', demo=True, wait=2800):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(wait)
    await p.evaluate("(()=>{const t=window.toast;window.__toasts=[];window.toast=function(m){window.__toasts.push(String(m));try{return t.apply(this,arguments)}catch(e){}}})()")
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return p, e

OPENB = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"
HIT = """(([sel,R])=>{const b=document.querySelector(sel); if(!b) return 'none'; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  return [[0,-R],[0,R],[-R,0],[R,0]].map(([dx,dy])=>{const e=document.elementFromPoint(cx+dx,cy+dy); return !!e&&(e===b||b.contains(e));}).every(Boolean)})"""
MENU = "[...document.querySelectorAll('.pvx-cx [role^=menuitem]')].map(i=>i.textContent.trim().replace(/\\s+/g,' '))"


async def ctxmenu(p, sel):
    el = p.locator(sel).first; await el.scroll_into_view_if_needed(); b = await el.bounding_box()
    await p.mouse.click(b['x'] + b['width'] * 0.6, b['y'] + 12, button='right'); await p.wait_for_timeout(400)
    items = await p.evaluate(MENU); await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    return items


@section(id='t319', title='n319 · Rounds follows the HIG Buttons, Context menus and Dock menus pages', apps=['rounds'], topics=['rounds', 'buttons', 'context-menus', 'dock-menus'], engines=('chromium', 'webkit'))
async def s_t319(br):
    # ---- Buttons: Print… is dimmed with its reason, not disabled, when there's nothing to print
    c = await ctx(br); p, e = await open_(c, demo=False)
    pr = await p.evaluate("(()=>{const b=document.getElementById('rdPrintBtn');return [b.textContent.trim(),b.disabled,b.getAttribute('aria-disabled'),b.title]})()")
    await p.evaluate("document.getElementById('rdPrintBtn').click(); 0"); await p.wait_for_timeout(300)
    t = await p.evaluate("window.__toasts.slice(-1)[0]||''")
    ok('Buttons · Print… ends in an ellipsis (it opens the print dialog), and with nothing to print it is dimmed with its reason, not disabled', pr[0] == 'Print…' and pr[1] is False and pr[2] == 'true' and 'Nothing to print' in t, (pr, t))
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    pr2 = await p.evaluate("document.getElementById('rdPrintBtn').getAttribute('aria-disabled')")
    ok('…and it is available once there are patients', pr2 == 'false', pr2)
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    me = await p.evaluate("[...document.querySelectorAll('#view-rd-census [aria-haspopup]')].filter(b=>b.getAttribute('aria-expanded')!=='false').map(b=>b.dataset.act||b.textContent.trim())")
    ok('…every menu button says it is collapsed before it is opened (CPR / DNR, admission type, location and service gave no state)', me == [], me)
    pu = await p.evaluate("(()=>{const b=document.querySelector('#rdList .rd-row.open [data-act=prob-up]');return b&&[b.disabled,b.getAttribute('aria-disabled'),b.title]})()")
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=prob-up]').click(); 0"); await p.wait_for_timeout(300)
    t2 = await p.evaluate("window.__toasts.slice(-1)[0]||''")
    ok('…Move up on the first problem is dimmed with its reason, not disabled', pu == [False, 'true', 'Already at the top'] and 'top' in t2, (pu, t2))
    hits = {s: await p.evaluate("(%s)(['%s',13])" % (HIT, s)) for s in ['#rdSide .rd-tmr-i .x', '#rdSide .rd-tmr-i .ck', '#rdList .rd-row:not(.open) .doc[data-act=cur-menu]', '#rdList .rd-row:not(.open) .doc[data-act=next-menu]']}
    gw = await p.evaluate("""(()=>{const g=document.querySelector('#rdList .rd-grip'); g.scrollIntoView({block:'center'}); const r=g.getBoundingClientRect(), y=r.top+r.height/2; return [1,14,27].map(dx=>{const e=document.elementFromPoint(r.left+dx,y); return !!e&&(e===g||g.contains(e));})})()""")
    ok('…with a mouse Tomorrow’s remove (24×14) and the rounds-order grip (11 pt wide) reach 28 pt, like the done box and the doctor names', all(hits.values()) and all(gw), (hits, gw))
    await p.evaluate("document.querySelector('#rdSide .rd-tmr-i .x').focus(); 0"); await p.wait_for_timeout(100)
    fo = await p.evaluate("getComputedStyle(document.querySelector('#rdSide .rd-tmr-i .x')).opacity")
    ok('…and Tomorrow’s remove button shows when it has keyboard focus (it stayed invisible)', fo == '1', fo)
    # ---- Context menus
    await p.evaluate("rdExpanded=null; renderRdCensus(true); 0"); await p.wait_for_timeout(400)
    m1 = await ctxmenu(p, '#rdList .rd-secgroup[data-sec=ecc] .rd-row >> nth=0')
    m2 = await ctxmenu(p, '#rdList .rd-secgroup[data-sec=ecc] .rd-row >> nth=1')
    m3 = await ctxmenu(p, '#rdList .rd-secgroup.holds .rd-row')
    ok('Context menus · a patient’s menu hides what would do nothing: no Move up on the first in a section, no Move down on the last, neither on Boarding & Holds',
       'Move up' not in m1 and 'Move down' in m1 and 'Move up' in m2 and 'Move down' not in m2 and 'Move up' not in m3 and 'Move down' not in m3 and 'Share…' in m1, (m1, m2, m3))
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    sf = await p.evaluate("(()=>{const b=document.querySelector('#rdList .rd-row.open [data-act=show-flow]');return b&&[b.textContent.trim(),b.previousElementSibling&&b.previousElementSibling.dataset.act]})()")
    pid = await p.evaluate(OPENB)
    await p.wait_for_timeout(400)
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=show-flow]').click(); 0")
    await p.wait_for_timeout(1500)
    ok('…and everything in it is also in the patient: Show in Flow sits beside Share… and opens Flow (it was only in the menu)', sf == ['Show in Flow', 'share'] and '/rounds/' not in p.url, (sf, p.url))
    # ---- found while checking: focus survives a later redraw (a save echoing back from the database)
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(2800); await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    await p.evaluate("document.querySelector('#rdList .rd-sechead[data-act]').focus(); 0"); await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(300)
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(300)
    await p.evaluate("renderRdCensus(true); setTimeout(()=>renderRdCensus(true),300); 0"); await p.wait_for_timeout(800)
    fk = await p.evaluate("[document.activeElement.className, document.activeElement.getAttribute('aria-expanded')]")
    await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(400)
    fk2 = await p.evaluate("[document.activeElement.className, document.activeElement.getAttribute('aria-expanded')]")
    ok('…and a patient opened from the keyboard keeps the focus through later redraws (a save coming back redrew the census and dropped it)', fk[0].startswith('rd-name') and fk[1] == 'true' and fk2[1] == 'false', (fk, fk2))
    ok('no page errors', not newerr(e), e[:3]); await c.close()
    # ---- Buttons on touch: Tomorrow's remove shows
    c = await ctx(br, viewport={'width': 1180, 'height': 820}, has_touch=True); p, e = await open_(c)
    to = await p.evaluate("getComputedStyle(document.querySelector('#rdSide .rd-tmr-i .x')).opacity")
    ok('…on iPad Tomorrow’s remove button is shown (it appeared only on hover, so it was never seen)', to == '1', to)
    await c.close()
    # ---- Dock menus
    c = await ctx(br); await c.add_init_script("document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#rdStartBtn')) sessionStorage.setItem('__sc','1'); },true)")
    p, e = await open_(c, demo=False)
    man = await p.evaluate("fetch('/rounds/manifest.webmanifest').then(r=>r.json()).then(m=>m.shortcuts.map(s=>[s.name,s.url,s.icons&&s.icons[0].src,s.icons&&s.icons[0].sizes]))")
    sizes = await p.evaluate("Promise.all(['start','find','review','archive'].map(n=>new Promise(r=>{const i=new Image(); i.onload=()=>r(i.naturalWidth+'x'+i.naturalHeight); i.onerror=()=>r('missing'); i.src='/assets/img/sc-rounds-'+n+'.png';})))")
    ok('Dock menus · the Dock menu offers Start rounds, Find a patient, Not reviewed and Archive, each with a 96 pt symbol (it had Archive alone, with none)',
       [m[0] for m in man] == ['Start rounds', 'Find a patient', 'Not reviewed', 'Archive'] and all(m[3] == '96x96' for m in man) and sizes == ['96x96'] * 4, (man, sizes))
    res = {}
    for h in ['find', 'review', 'start']:
        await p.goto(f'http://127.0.0.1:{PORT}/rounds/?dock={h}#{h}'); await p.wait_for_timeout(3500)
        res[h] = await p.evaluate("[location.hash, document.activeElement.id, typeof rdKpiFilter!=='undefined'?rdKpiFilter:null, sessionStorage.getItem('__sc')]")
    ok('…and each one does it once Rounds is open: Find focuses the search, Not reviewed filters the census, Start rounds starts (the address tidied)',
       res['find'][0] == '' and res['find'][1] == 'rdSearch' and res['review'][2] == 'review' and res['start'][3] == '1', res)
    ok('no page errors (dock)', not newerr(e), e[:3]); await c.close()
