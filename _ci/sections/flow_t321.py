"""Pravix Rounds — the n321 build's own checks: HIG Ornaments, Pop-up buttons, Pull-down buttons and The menu bar (Nov 4 2026), on Rounds' own page.
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



ROLES = "[...document.querySelectorAll('.rd-menu [role^=menuitem]')].filter(i=>i.getClientRects().length).map(i=>[i.textContent.trim().replace(/\\s+/g,' '),i.getAttribute('role'),i.getAttribute('aria-checked')])"


async def roles(p, js):
    await p.evaluate(js); await p.wait_for_timeout(350)
    it = await p.evaluate(ROLES)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    await p.evaluate("typeof rdCloseMenus==='function'&&rdCloseMenus(); 0")
    return it


@section(id='t321', title='n321 · Rounds follows the HIG Ornaments, Pop-up buttons, Pull-down buttons and The menu bar pages', apps=['rounds'], topics=['rounds', 'pop-up-buttons', 'pull-down-buttons', 'menu-bar'], engines=('chromium', 'webkit'))
async def s_t321(br):
    c = await ctx(br); p, e = await open_(c)
    # ---- Pop-up buttons
    JP = "rdCensus().find(p=>rdFullName(p)==='Jet Parkes')"
    jb = await p.evaluate("(()=>{const x=%s; return [document.querySelector('#rdList .rd-row[data-pid=\"'+x.id+'\"] [data-act=cur-menu]').textContent.trim(), rdCareList(x).length, (x.rounds.audit||[]).length]})()" % JP)
    jm = await roles(p, "document.querySelector('#rdList .rd-row[data-pid=\"'+%s.id+'\"] [data-act=cur-menu]').click()" % JP)
    await p.evaluate("document.querySelector('#rdList .rd-row[data-pid=\"'+%s.id+'\"] [data-act=cur-menu]').click(); 0" % JP); await p.wait_for_timeout(350)
    await p.evaluate("const b=[...document.querySelectorAll('.rd-menu [role^=menuitem]')].find(i=>i.getAttribute('aria-checked')==='true'); (b||{click(){}}).click(); 0"); await p.wait_for_timeout(400)
    ja = await p.evaluate("(()=>{const x=%s; return [rdCareList(x).length, (x.rounds.audit||[]).length]})()" % JP)
    ok('Pop-up buttons · the current doctor is always in the menu, checked: Neurology’s Dr. Galano showed on the button but wasn’t listed, so nothing was checked',
       jm and jm[0][0].startswith(jb[0]) and jm[0][2] == 'true' and sum(1 for i in jm if i[2] == 'true') == 1, (jb, jm[:3]))
    ok('…and choosing the doctor it already has changes nothing', ja == jb[1:], (jb, ja))
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    rm = await roles(p, "document.querySelector('#rdList .rd-row.open [data-act=resus-menu]').click()")
    ok('…a menu of choices is one even before anything is chosen: CPR / DNR “not set” offered plain menu items',
       len(rm) == 2 and all(i[1] == 'menuitemradio' and i[2] == 'false' for i in rm), rm)
    la = await p.evaluate("(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); return [x.rounds.location,(x.rounds.audit||[]).length,(x.timeline||[]).length]})()")
    await p.evaluate("document.querySelector('#rdList .rd-row.open [data-act=loc-menu]').click(); 0"); await p.wait_for_timeout(350)
    await p.evaluate("const b=[...document.querySelectorAll('.rd-menu [role^=menuitem]')].find(i=>i.getAttribute('aria-checked')==='true'); (b||{click(){}}).click(); 0"); await p.wait_for_timeout(400)
    lb = await p.evaluate("(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); return [x.rounds.location,(x.rounds.audit||[]).length,(x.timeline||[]).length]})()")
    ok('…choosing the location it already has changes nothing (it wrote “Location ICU → ICU” to the patient’s history)', la == lb, (la, lb))
    # ---- Pull-down buttons: menus of actions stay plain commands
    fm = await roles(p, "document.querySelector('#rdList .rd-row.open [data-act=flag-menu]').click()")
    om = await roles(p, "document.querySelector('#rdList .rd-row.open [data-act=outcome-menu]').click()")
    ok('Pull-down buttons · Add flag and End admission… list commands, not choices, with three or more items', len(fm) >= 3 and len(om) >= 3 and all(i[1] == 'menuitem' for i in fm + om), (fm, om))
    # ---- The menu bar: window titles, ⌘K
    t = {}
    t['open'] = await p.evaluate("document.title")
    await p.evaluate("rdExpanded=null; renderRdCensus(true); 0"); await p.wait_for_timeout(300); t['census'] = await p.evaluate("document.title")
    await p.evaluate("switchRdView('archive'); 0"); await p.wait_for_timeout(400); t['archive'] = await p.evaluate("document.title")
    await p.evaluate("switchRdView('census'); 0"); await p.wait_for_timeout(400)
    await p.evaluate("document.getElementById('rdStartBtn').click(); 0"); await p.wait_for_timeout(500); t['mode'] = await p.evaluate("document.title")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400); t['back'] = await p.evaluate("document.title")
    await p.evaluate("dispatchEvent(new Event('beforeprint')); 0"); t['print'] = await p.evaluate("document.title")
    await p.evaluate("dispatchEvent(new Event('afterprint')); 0"); await p.wait_for_timeout(100); t['after'] = await p.evaluate("document.title")
    ok('The menu bar · the window title names what’s on screen, not the app (the Window menu, the tab and the Dock all said “Rounds · Pravix”)',
       t['open'] == 'Benny Duarte · Census' and t['census'] == 'Census' and t['archive'] == 'Archive' and t['mode'].endswith(' · Rounds mode') and t['back'] == 'Census', t)
    ok('…the printed sheet names its PDF “Rounds sheet · <day>”, and the title comes back after', t['print'].startswith('Rounds sheet · ') and t['after'] == 'Census', t)
    await p.evaluate("document.body.focus(); document.activeElement&&document.activeElement.blur&&document.activeElement.blur(); 0")
    await p.keyboard.press('ControlOrMeta+k'); await p.wait_for_timeout(200)
    k = await p.evaluate("document.activeElement.id")
    sh = await p.evaluate("rdShortcutGroups()[0].items.slice(0,2).map(r=>r.keys.join('+'))")
    fe = await p.evaluate("(()=>{const ev=new KeyboardEvent('keydown',{key:'f',metaKey:true,ctrlKey:true,bubbles:true,cancelable:true}); document.body.dispatchEvent(ev); return ev.defaultPrevented})()")
    ok('…⌘K (Ctrl+K) searches, as in Treatment, and the shortcuts sheet says so; ⌘F stays the browser’s Find', k == 'rdSearch' and sh == ['/', 'mod+K'] and fe is False, (k, sh, fe))
    sb = await p.evaluate("(()=>{const b=document.getElementById('rdSideBtn'); const a=b.getAttribute('aria-expanded'); rdToggleSide(); const c=b.getAttribute('aria-expanded'); const tt=b.title; rdToggleSide(); return [a,c,tt]})()")
    ok('…Show or hide the side panel says which it will do, and its state (the View menu rule)', sb[0] == 'true' and sb[1] == 'false' and sb[2].startswith('Show'), sb)
    await p.evaluate("logout()"); await p.wait_for_timeout(800)
    lo = await p.evaluate("document.title")
    ok('…signed out, the title is the app’s name again, so no patient’s name stays in the title bar', lo == 'Rounds · Pravix', lo)
    ok('no page errors', not newerr(e), e[:3]); await c.close()
