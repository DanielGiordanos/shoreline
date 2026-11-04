"""Pravix Rounds — the n323 build's own checks: HIG Tab bars, Token fields and Action sheets (Nov 4 2026), on Rounds' own page.
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



PROBS = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); return (rdFind(x.id).rounds.problems||[]).filter(p=>p.active!==false).map(p=>p.label)})()"
CXM = "[...document.querySelectorAll('.pvx-cx [role^=menuitem]:not(.back), .pvx-cx [role=separator]')].map(i=>i.getAttribute('role')==='separator'?'—':i.textContent.trim()+(i.classList.contains('danger')?' (red)':''))"


async def ctxm(p, sel, key=False):
    if key:
        await p.evaluate("(s=>{const e=document.querySelector(s); e.focus(); e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:0,clientY:0}));})(%r)" % sel)
    else:
        await p.evaluate("(s=>{const e=document.querySelector(s); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+12,clientY:r.top+r.height/2,button:2}));})(%r)" % sel)
    await p.wait_for_timeout(300)
    return await p.evaluate(CXM)


async def pick(p, label):
    await p.evaluate("(l=>{const b=[...document.querySelectorAll('.pvx-cx [role^=menuitem]')].find(i=>i.textContent.trim()===l); b&&b.click();})(%r)" % label)
    await p.wait_for_timeout(500)


@section(id='t323', title='n323 · Rounds follows the HIG Tab bars, Token fields and Action sheets pages', apps=['rounds'], topics=['rounds', 'tab-bars', 'token-fields', 'action-sheets'], engines=('chromium', 'webkit'))
async def s_t323(br):
    c = await ctx(br); p, e = await open_(c)
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    PI = '#rdList .rd-row.open input[data-input="prob"]'
    async def typ(v, key):
        await p.fill(PI, v); await p.press(PI, key); await p.wait_for_timeout(450)
        return await p.evaluate(PROBS)
    a = await typ('Diarrhea;', 'Enter')
    b = await typ('Lethargy', ';')
    fo = await p.evaluate("document.activeElement.matches('%s')" % PI)
    c2 = await typ('Fever; Cough,', 'Enter')
    d = await typ('Vomiting, 3 times', 'Enter')
    ok('Token fields · ; adds a problem as Return does, and keeps you in the field; a trailing , or ; is dropped (“Diarrhea;” was saved as typed)',
       a[-1] == 'Diarrhea' and b[-1] == 'Lethargy' and fo and c2[-2:] == ['Fever', 'Cough'] and d[-1] == 'Vomiting, 3 times', (a[-1:], b[-1:], fo, c2[-2:], d[-1:]))
    sg = await p.evaluate("[document.querySelector('%s').getAttribute('list'), document.getElementById('rdProbList').options.length]" % PI)
    ok('…and it suggests the problems already used on the census as you type', sg[0] == 'rdProbList' and sg[1] > 0, sg)
    m1 = await ctxm(p, '#rdList .rd-row.open .rd-probs > li:first-child > .t'); await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    m2 = await ctxm(p, '#rdList .rd-row.open .rd-probs > li:nth-child(2) > .t')
    ok('…every problem has a context menu: Edit, Mark resolved, Move up, Move down, then Remove in red, without the move that would do nothing (there was none)',
       m2 == ['Edit', 'Mark resolved', 'Move up', 'Move down', '—', 'Remove (red)'] and 'Move up' not in m1 and m1[0] == 'Edit', (m1, m2))
    before = await p.evaluate(PROBS)
    await pick(p, 'Move down')
    after = await p.evaluate(PROBS)
    ok('…and its items work: Move down', after[1] == before[2] and after[2] == before[1], (before[:3], after[:3]))
    await p.evaluate("document.querySelector('#rdList .rd-row.open .rd-probs > li:first-child > .t').click(); 0"); await p.wait_for_timeout(250)
    ed = await p.evaluate("(document.querySelector('#rdList .rd-row.open .rd-pedit')||{}).value")
    await p.fill('#rdList .rd-row.open .rd-pedit', 'Urethral obstruction, recurrent;'); await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    e1 = await p.evaluate(PROBS)
    fe = await p.evaluate("[document.activeElement.className, document.activeElement.textContent.trim()]")
    await p.evaluate("document.querySelector('#rdList .rd-row.open .rd-probs > li:first-child > .t').click(); 0"); await p.wait_for_timeout(250)
    await p.fill('#rdList .rd-row.open .rd-pedit', 'Something else'); await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
    e2 = await p.evaluate(PROBS)
    ok('…clicking a problem edits it in place: Return saves (a trailing , or ; dropped) and keeps the focus on it, Esc keeps it as it was',
       ed and e1[0] == 'Urethral obstruction, recurrent' and fe == ['t', 'Urethral obstruction, recurrent'] and e2[0] == 'Urethral obstruction, recurrent', (ed, e1[:1], fe, e2[:1]))
    await p.focus(PI); await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(150)
    lt = await p.evaluate("[document.activeElement.className, document.activeElement.textContent.trim()]")
    km = await ctxm(p, '#rdList .rd-row.open .rd-probs > li:last-child > .t', key=True); await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    ok('…from the empty field ← goes to the last problem, and the keyboard’s context-menu key opens its menu there', lt[0] == 't' and lt[1] == e2[-1] and km and km[0] == 'Edit' and 'Move down' not in km, (lt, km))
    await p.evaluate("document.querySelector('#rdList .rd-row.open .rd-probs > li:first-child [data-act=prob-resolve]').click(); 0"); await p.wait_for_timeout(500)
    rm = await ctxm(p, '#rdList .rd-row.open .rd-resolved-chip'); await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=flag-menu]').click(); 0"); await p.wait_for_timeout(300)
    await p.evaluate("document.querySelector('.rd-menu [data-v]').click(); 0"); await p.wait_for_timeout(500)
    fm = await ctxm(p, '#rdList .rd-row.open .rd-flag')
    n0 = await p.evaluate("document.querySelectorAll('#rdList .rd-row.open .rd-flag').length")
    await pick(p, 'Remove flag')
    n1 = await p.evaluate("document.querySelectorAll('#rdList .rd-row.open .rd-flag').length")
    ok('…a resolved problem’s menu offers Restore, then Remove; a safety flag’s offers Remove flag, which removes it', rm == ['Restore', '—', 'Remove (red)'] and fm == ['Remove flag (red)'] and n1 == n0 - 1, (rm, fm, n0, n1))
    # ---- Tab bars
    tb = await p.evaluate("[...document.querySelectorAll('#switcherRd .seg')].map(b=>[b.textContent.trim(),!!b.querySelector('svg'),b.getAttribute('aria-current'),b.disabled])")
    ok('Tab bars · Census and Archive are navigation only, each a symbol and one word, the current one marked, neither hidden nor disabled', tb == [['Census', True, 'page', False], ['Archive', True, None, False]], tb)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
    c = await ctx(br); p, e = await open_(c, demo=False)
    await p.evaluate("switchRdView('archive'); 0"); await p.wait_for_timeout(700)
    ae = await p.evaluate("document.getElementById('view-rd-archive').innerText")
    ok('…an empty Archive explains why it’s empty instead of being hidden', 'No rounds history yet' in ae, ae[:80])
    await c.close()
    # ---- Action sheets (iPhone)
    c = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True); p, e = await open_(c)
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=outcome-menu]').click(); 0"); await p.wait_for_timeout(400)
    sh = await p.evaluate("[...document.querySelectorAll('.rd-menu.rd-as button')].map(b=>b.textContent.trim())")
    await p.evaluate("[...document.querySelectorAll('.rd-menu button[data-v]')].find(b=>b.textContent.trim()==='Discharged').click(); 0"); await p.wait_for_timeout(500)
    cf = await p.evaluate("[...document.querySelectorAll('#confirmBox button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect(); return [b.id,Math.round(r.top),Math.round(r.width),Math.round(r.height)]})")
    await p.evaluate("document.getElementById('confirmCancel').click(); 0"); await p.wait_for_timeout(300)
    ok('Action sheets · on iPhone, End admission… is an action sheet with Cancel at the bottom, and its confirmation stacks full-width buttons, the action above Cancel',
       sh[-1] == 'Cancel' and len(sh) == 5 and len(cf) == 2 and cf[0][0] == 'confirmCancel' and cf[1][1] < cf[0][1] and all(x[2] >= 300 and x[3] >= 44 for x in cf), (sh, cf))
    ok('no page errors (iPhone)', not newerr(e), e[:3]); await c.close()
