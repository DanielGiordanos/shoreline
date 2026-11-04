"""Pravix Rounds — the n320 build's own checks: HIG Edit menus, Home Screen quick actions and Menus (Nov 4 2026), on Rounds' own page.
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


@section(id='t320', title='n320 · Rounds follows the HIG Edit menus, Home Screen quick actions and Menus pages', apps=['rounds'], topics=['rounds', 'edit-menus', 'quick-actions', 'menus'], engines=('chromium', 'webkit'))
async def s_t320(br):
    c = await ctx(br); p, e = await open_(c)
    # ---- Menus: the doctor menus are in a findable order
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    cur = await menu(p, "document.querySelector('#rdList .rd-row.open [data-act=cur-menu]').click()")
    ok('Menus · the current-doctor menu lists the doctors A–Z by surname (it followed the roster: the ER list, then IM’s)', len(docs(cur)) >= 10 and az(docs(cur)) and '—' not in cur, cur)
    nx = await menu(p, "document.querySelector('#rdList .rd-row.open [data-act=next-menu]').click()")
    ok('…the next-doctor menu puts None first, set apart, then the doctors A–Z', nx[:2] == ['None', '—'] and nx.count('None') == 1 and az(docs(nx)) and len(docs(nx)) == len(docs(cur)), nx)
    # with a shift board: the patient's service team comes first, marked, then everyone else
    sid = await p.evaluate("(()=>{const d=DOCTORS.find(d=>/Schiff/.test(d.name))||DOCTORS[DOCTORS.length-1]; shiftAssign.morning=d.id; renderRdCensus(true); return drName(d.name)})()")
    await p.wait_for_timeout(400); await p.evaluate(OPENB); await p.wait_for_timeout(400)
    cur2 = await menu(p, "document.querySelector('#rdList .rd-row.open [data-act=cur-menu]').click()")
    ok('…with today’s shift board, the doctors on the patient’s service come first, marked “on service”, then everyone else A–Z',
       cur2[0].startswith(sid + ' · on service') and cur2[1] == '—' and az(docs(cur2)[1:]) and sum('on service' in i for i in cur2) == 1, (sid, cur2))
    im = await p.evaluate("(()=>{const x=rdCensus().find(p=>p.rounds&&p.rounds.service==='im'); rdExpanded=x.id; renderRdCensus(true); return x.id})()")
    await p.wait_for_timeout(400)
    cur3 = await menu(p, "document.querySelector('#rdList .rd-row.open [data-act=cur-menu]').click()")
    team = [i for i in cur3[:cur3.index('—')]] if '—' in cur3 else []
    ok('…an Internal Medicine patient lists IM’s doctors first', len(team) == 2 and all('on service' in i for i in team) and az(team), cur3)
    # the patient's touch-and-hold menu: Take case
    await p.evaluate("rdExpanded=null; renderRdCensus(true); 0"); await p.wait_for_timeout(400)
    row = p.locator('#rdList .rd-secgroup[data-sec=ecc] .rd-row >> nth=0'); await row.scroll_into_view_if_needed(); b = await row.bounding_box()
    await p.mouse.click(b['x'] + b['width'] * 0.6, b['y'] + 12, button='right'); await p.wait_for_timeout(400)
    await p.evaluate("[...document.querySelectorAll('.pvx-cx [role^=menuitem]')].find(i=>i.textContent.trim().startsWith('Take case')).click(); 0"); await p.wait_for_timeout(350)
    tk = await p.evaluate(CX); curdoc = await p.evaluate("(()=>{const r=document.querySelector('#rdList .rd-secgroup[data-sec=ecc] .rd-row'); const x=rdFind(r.dataset.pid); const d=rdAllDoctors().find(d=>d.id===rdCurrentDocId(x)); return d?drName(d.name):''})()")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200); await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    td = docs(tk); body = td[1:] if td and 'on service' in td[0] else td
    ok('…the patient’s menu orders Take case the same way, without the current doctor and with no stray separators',
       len(td) >= 9 and az(body) and tk[0] != '—' and tk[-1] != '—' and all(SURN(curdoc) != SURN(i) for i in td) if curdoc else len(td) >= 9, (curdoc, tk))
    # ---- Edit menus: right-clicking text you've selected in a row keeps the browser's menu (Copy, Look Up)
    await p.evaluate("window.__dp=null; document.addEventListener('contextmenu',e=>{ window.__dp=e.defaultPrevented; e.preventDefault(); });   0")
    nm = p.locator('#rdList .rd-secgroup[data-sec=ecc] .rd-row .rd-name >> nth=0'); await nm.scroll_into_view_if_needed(); nb = await nm.bounding_box()
    await p.mouse.click(nb['x'] + 4, nb['y'] + nb['height'] / 2, button='right'); await p.wait_for_timeout(400)
    plain = [await p.evaluate("window.__dp"), await p.evaluate("!!document.querySelector('.pvx-cx')")]
    await p.keyboard.press('Escape'); await p.wait_for_timeout(250)
    await p.evaluate("(()=>{const n=document.querySelector('#rdList .rd-secgroup[data-sec=ecc] .rd-row .rd-name'); const r=document.createRange(); r.selectNodeContents(n); const s=getSelection(); s.removeAllRanges(); s.addRange(r); window.__dp=null;})()")
    await p.wait_for_timeout(100)
    await p.evaluate("""(()=>{const n=document.querySelector('#rdList .rd-secgroup[data-sec=ecc] .rd-row .rd-name'); const r=n.getBoundingClientRect();
      n.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+4,clientY:r.top+r.height/2,button:2}));})()""")
    await p.wait_for_timeout(400)
    sel = [await p.evaluate("window.__dp"), await p.evaluate("!!document.querySelector('.pvx-cx')"), await p.evaluate("String(getSelection()).trim().length>0")]
    ok('Edit menus · right-clicking text you’ve selected in a patient’s row gives the browser’s menu (Copy, Look Up); with nothing selected it gives the patient’s menu',
       plain == [True, True] and sel == [False, False, True], (plain, sel))
    # ---- Home Screen quick actions: the manifest's shortcuts are short, titled, at most four, with symbols
    man = await p.evaluate("fetch('/rounds/manifest.webmanifest').then(r=>r.json()).then(m=>m.shortcuts.map(s=>[s.name,s.short_name,!!(s.icons&&s.icons.length)]))")
    ok('Home Screen quick actions · four at most, each a short title with a symbol, none naming the app', 0 < len(man) <= 4 and all(m[2] and len(m[1]) <= 14 and 'Rounds' not in m[0] for m in man), man)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
    # ---- Rounds rounds as the doctor who is signed in (Daniel's call, Nov 4): no "Rounding as" to choose
    DOC = '{"uid":"u3","email":"sarah.schiff@vca.com","displayName":"Sarah Schiff"}'
    c = await ctx(br, user=DOC); p, e = await open_(c)
    r = await p.evaluate("[!!document.getElementById('rdActor'), document.body.innerText.includes('Rounding as'), rdActorId, rdActorName()]")
    await p.evaluate(OPENB); await p.wait_for_timeout(400)
    cm = await menu(p, "document.querySelector('#rdList .rd-row.open [data-act=cur-menu]').click()")
    sig = await p.evaluate("(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdAudit(x,'n320 check'); return x.rounds.audit.slice(-1)[0].by})()")
    ok('Rounding as · it’s gone: a doctor who signs in rounds as that doctor, marked “(you)” in the doctor menus, and their edits are signed with their name',
       r == [False, False, 'sarah-schiff', 'Dr. Schiff'] and any(i.startswith('Dr. Schiff') and i.endswith('(you)') for i in cm) and sig == 'Dr. Schiff', (r, cm, sig))
    await p.evaluate("logout()"); await p.wait_for_timeout(800)
    lo = await p.evaluate("[rdActorId, typeof rdActor==='function'&&!!rdActor()]")
    ok('…and Log out forgets it', lo == [None, False], lo)
    ok('no page errors (signed-in doctor)', not newerr(e), e[:3]); await c.close()
    c = await ctx(br); p, e = await open_(c, demo=False)
    r = await p.evaluate("[rdActorId, rdActorName()]")
    ok('…someone who isn’t on the doctor lists signs with their own name, as before', r == [None, 'Rounds Tester'], r)
    await c.close()
