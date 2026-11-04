"""Pravix Rounds — the n322 build's own checks: HIG Toolbars, Path controls, Search fields and Sidebars (Nov 4 2026), on Rounds' own page.
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

ITEMS = "[...document.querySelectorAll('.rd-menu [role^=menuitem],.rd-menu [role=separator]')].filter(i=>i.getClientRects().length).map(i=>i.getAttribute('role')==='separator'?'—':i.textContent.trim().replace(/\\s+/g,' '))"
CX = "[...document.querySelectorAll('.pvx-cx [role^=menuitem]:not(.back),.pvx-cx .back~[role=separator]')].filter((i,k,a)=>!(k===0&&i.previousElementSibling&&i.previousElementSibling.classList.contains('back'))).map(i=>i.getAttribute('role')==='separator'?'—':i.textContent.trim().replace(/\\s+/g,' '))"
SURN = lambda s: s.replace(' (you)', '').split(' · ')[0].split(' — ')[0].split()[-1].lower()


async def menu(p, js):
    await p.evaluate(js); await p.wait_for_timeout(350)
    it = await p.evaluate(ITEMS)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    await p.evaluate("typeof rdCloseMenus==='function'&&rdCloseMenus(); 0")
    return it


def docs(items):
    return [i for i in items if i.startswith('Dr. ')]


def az(items):
    s = [SURN(i) for i in items]; return s == sorted(s)



BAR = """(()=>{const h=document.querySelector('#view-rd-census .rd-headr'); const kids=[...h.children].filter(c=>c.getClientRects().length);
  let rows=0, bottom=-1e9; kids.map(c=>[c.offsetTop,c.offsetTop+c.offsetHeight]).sort((a,b)=>a[0]-b[0]).forEach(([t,b])=>{ if(t>=bottom-1){ rows++; bottom=b; } else bottom=Math.max(bottom,b); });
  const lab=id=>{const l=document.querySelector('#'+id+' .rd-pl'); return !!l&&getComputedStyle(l).display!=='none'};
  const r=id=>{const b=document.getElementById(id).getBoundingClientRect(); return [Math.round(b.top),Math.round(b.width),Math.round(b.height)]};
  return {rows, labels:[lab('rdSideBtn'),lab('rdPrintBtn'),lab('rdDisplayBtn')], names:['rdSideBtn','rdPrintBtn','rdDisplayBtn'].map(i=>document.getElementById(i).getAttribute('aria-label')),
    side:r('rdSideBtn'), print:r('rdPrintBtn'), disp:r('rdDisplayBtn'), start:r('rdStartBtn'), seg:r('rdShiftSeg'), cls:h.className}})()"""


async def bar(br, w, h, touch):
    kw = dict(viewport={'width': w, 'height': h})
    if touch: kw.update(has_touch=True, is_mobile=w < 700)
    c = await ctx(br, **kw); p, e = await open_(c)
    await p.wait_for_timeout(300)
    r = await p.evaluate(BAR); await c.close(); return r


@section(id='t322', title='n322 · Rounds follows the HIG Toolbars, Path controls, Search fields and Sidebars pages', apps=['rounds'], topics=['rounds', 'toolbars', 'search-fields', 'sidebars'], engines=('chromium', 'webkit'))
async def s_t322(br):
    # ---- Toolbars
    mac = await bar(br, 1440, 900, False)
    ok('Toolbars · on a Mac the census toolbar is one row with every label: Side panel, Print…, Display, then Start rounds', mac['rows'] == 1 and mac['labels'] == [True, True, True], mac)
    pad = await bar(br, 820, 1180, True)
    ok('…on an iPad in portrait, Display and then Print give way to their symbols so nothing wraps (Start rounds sat alone on a second row)',
       pad['rows'] == 1 and pad['labels'] == [True, False, False] and all(pad['names']), pad)
    ph = await bar(br, 390, 844, True)
    ok('…on an iPhone the bar is two rows, not three: the shift choice, then the three symbols beside Start rounds, each at least 44 pt',
       ph['rows'] == 2 and ph['labels'] == [False, False, False] and ph['side'][0] == ph['print'][0] == ph['disp'][0] == ph['start'][0] and ph['seg'][0] < ph['side'][0]
       and all(x[1] >= 44 and x[2] >= 44 for x in (ph['side'], ph['print'], ph['disp'])) and all(ph['names']), ph)
    # ---- Search fields
    c = await ctx(br); p, e = await open_(c)
    sf = await p.evaluate("(()=>{const s=document.getElementById('rdSearch'); return [s.type,s.getAttribute('enterkeyhint'),s.placeholder]})()")
    ok('Search fields · Rounds’ search is a search field: the Search key, and placeholder text that gives its scope', sf == ['search', 'search', 'Search patients on rounds'], sf)
    async def typ(v):
        await p.fill('#rdSearch', v); await p.wait_for_timeout(450)
        return await p.evaluate("(()=>{const e=document.querySelector('#rdList .rd-emptystate'); return [e?e.textContent.replace(/\\s+/g,' ').trim():'', [...document.querySelectorAll('#rdList [data-act=rd-close-match]')].map(b=>b.textContent.trim())]})()")
    t1 = await typ('Bennny')
    ok('…a misspelt name offers close matches, and the empty state says what was searched for (it only said “No matching patients”)', t1[1] == ['Benny Duarte'] and '“Bennny”' in t1[0], t1)
    await p.evaluate("document.querySelector('#rdList [data-act=rd-close-match]').click(); 0"); await p.wait_for_timeout(450)
    t2 = await p.evaluate("[document.getElementById('rdSearch').value,[...document.querySelectorAll('#rdList .rd-row')].filter(r=>r.getClientRects().length).map(r=>rdFullName(rdFind(r.dataset.pid)))]")
    ok('…choosing one searches for it', t2 == ['Benny Duarte', ['Benny Duarte']], t2)
    t3 = await typ('zzqx')
    t4 = await typ('Dueart benny')
    ok('…nonsense offers none, and two misspelt words still find the patient', t3[1] == [] and 'zzqx' in t3[0] and t4[1] == ['Benny Duarte'], (t3, t4))
    # ---- Sidebars: the side panel is shown by default where there's room, and hides with its button
    sb = await p.evaluate("(()=>{const s=document.getElementById('rdSide'); const b=document.getElementById('rdSideBtn'); return [!!s&&s.getClientRects().length>0, b.getAttribute('aria-expanded'), s.getAttribute('aria-label')]})()")
    ok('Sidebars · the side panel (On Service and Tomorrow) is shown by default at 1440 and says it can be hidden', sb == [True, 'true', 'On Service and Tomorrow'], sb)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
