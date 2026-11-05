"""Pravix Rounds — the n325 build's own checks: HIG Alerts, Page controls, Panels and Popovers (Nov 4 2026), on Rounds' own page.
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



PICK = "(v=>{const b=[...document.querySelectorAll('.rd-menu button[data-v]')].find(b=>b.dataset.v===v||b.textContent.trim()===v); b&&b.click();})(%r)"
BOX = "(()=>{const b=document.getElementById('confirmBox'), o=document.getElementById('confirmOk'); return {open:b.classList.contains('open'), role:b.getAttribute('role'), desc:b.getAttribute('aria-describedby'), danger:o.classList.contains('danger'), cls:o.className, focus:document.activeElement.id, title:document.getElementById('confirmTitle').textContent}})()"


@section(id='t325', title='n325 · Rounds follows the HIG Alerts, Page controls, Panels and Popovers pages', apps=['rounds'], topics=['rounds', 'alerts', 'page-controls', 'panels', 'popovers'], engines=('chromium', 'webkit'))
async def s_t325(br):
    c = await ctx(br); p, e = await open_(c)
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    # ---- Alerts
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=outcome-menu]').click(); 0"); await p.wait_for_timeout(300)
    await p.evaluate(PICK % 'Discharged'); await p.wait_for_timeout(400)
    a = await p.evaluate(BOX)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    a2 = await p.evaluate(BOX)
    await p.keyboard.press('ControlOrMeta+Period'); await p.wait_for_timeout(300)
    a3 = await p.evaluate(BOX)
    out = await p.evaluate("(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); return !!(x.rounds.outcome)})()")
    ok('Alerts · End admission asks as an alert (named, described), with no default: Return does nothing, and ⌘. cancels', a['role'] == 'alertdialog' and a['desc'] == 'confirmSub' and a['focus'] == 'confirmBox' and a2['open'] and not a3['open'] and not out, (a, a2['open'], a3['open'], out))
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=auth-custom]').click(); 0"); await p.wait_for_timeout(300)
    await p.evaluate(PICK % '12'); await p.wait_for_timeout(500)
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=auth-undo]').click(); 0"); await p.wait_for_timeout(400)
    r = await p.evaluate(BOX)
    await p.evaluate("document.getElementById('confirmCancel').click(); 0"); await p.wait_for_timeout(300)
    ok('…removing an extension you chose to undo isn’t red (the HIG’s Empty Trash case), and has no default, since its message says what the hours become',
       r['open'] and r['title'].startswith('Remove the +12 hours') and not r['danger'] and 'primary' not in r['cls'] and r['focus'] == 'confirmBox', r)
    # ---- Popovers: Set total hours… is a dialog that asks for a value
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=auth-custom]').click(); 0"); await p.wait_for_timeout(300)
    await p.evaluate(PICK % 'set'); await p.wait_for_timeout(500)
    h = await p.evaluate(BOX)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    h2 = await p.evaluate(BOX)
    ok('Popovers · “Set total hours…” is a dialog that asks for a value, not an alert, and Esc closes it; the next alert is an alert again', h['open'] and h['role'] == 'dialog' and not h2['open'] and h2['role'] == 'alertdialog', (h, h2))
    # ---- Page controls: Rounds mode says where you are in words
    await p.evaluate("rdExpanded=null; renderRdCensus(true); document.getElementById('rdStartBtn').click(); 0"); await p.wait_for_timeout(600)
    pc = await p.evaluate("(()=>{const m=document.getElementById('rdMode'); return [m.getAttribute('role'), /\\b1 of \\d+/i.test(m.innerText)]})()")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('Page controls · Rounds mode steps through an ordered list and says “1 of 8” in words, no dots to count', pc == ['dialog', True], pc)
    # ---- Panels: the side panel is a named inspector
    sp = await p.evaluate("(()=>{const s=document.getElementById('rdSide'); return [s.getAttribute('aria-label'), !!s.getClientRects().length]})()")
    sh = await p.evaluate("rdShortcutGroups().flatMap(g=>(g.items||g.rows||[]).map(r=>r.keys.join('+')))")
    ok('…and the shortcuts sheet lists ⌘. (Ctrl+.) beside Esc', 'mod+.' in sh, sh)
    ok('Panels · the side panel is named (“On Service and Tomorrow”) and shown beside the census', sp == ['On Service and Tomorrow', True], sp)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
