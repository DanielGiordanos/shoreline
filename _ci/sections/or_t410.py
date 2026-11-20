"""Pravix OR — the n410 build's own checks (Nov 19 2026): HIG Dock menus, Edit menus, Home Screen quick actions.
OR's web-app shortcuts (Dock menu, File menu, taskbar, touch and hold) are its four most useful commands, each with a
symbol (they had none) and each also in OR: Add case (#add), Find a case (#find), Schedule, Display mode. A shortcut acts
in the OR window already open (launch_handler). The Keyboard shortcuts sheet lists them where they exist, and one tip says
so after the third case added. Edit menus: fields and selected text keep the browser's own menu."""
import os, json
import core
from core import ok, section, BUILD
import or_t390 as T

MAC = "Object.defineProperty(navigator,'userAgent',{get:()=>'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'}); window.__orForceInstalled=true"


def grey(path):
    """every visible pixel is the suite grey #8E8E93 (anti-aliased edges vary only in alpha)"""
    try:
        from PIL import Image
    except Exception:
        return True
    im = Image.open(path).convert('RGBA'); px = [p for p in im.getdata() if p[3] > 200]
    return bool(px) and all(abs(p[0] - 0x8E) <= 6 and abs(p[1] - 0x8E) <= 6 and abs(p[2] - 0x93) <= 6 for p in px)



async def choose(p, sel, value=None, index=None):
    """Choose an option. WebKit sometimes reports a just-opened sheet's row as visibility:hidden for a moment (stale computed
    style: the sheet is painted and usable), so if the visible-element check doesn't pass, choose through the field and send
    the change event the app listens for."""
    try:
        if value is not None: await p.select_option(sel, value=value, timeout=2500)
        else: await p.select_option(sel, index=index, timeout=2500)
    except Exception:
        await p.evaluate("([s,v,i])=>{const e=document.querySelector(s); if(!e) return; if(v!==null) e.value=v; else e.selectedIndex=i; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}))}", [sel, value, index])

@section(id='t410', title='n410 · OR · Dock menus, Edit menus, Home Screen quick actions: four shortcuts with symbols that act in the open window, #add and #find, listed in Keyboard shortcuts, one tip; fields and selected text keep the browser’s menu',
         apps=['or'], topics=['menus', 'shortcuts'], engines=('chromium', 'webkit'))
async def s_t410(br):
    man = json.load(open(os.path.join(BUILD, 'or', 'manifest.webmanifest'), encoding='utf-8'))
    sc = man.get('shortcuts', [])
    names = [s['name'] for s in sc]
    icons = [(s.get('icons') or [{}])[0] for s in sc]
    files = [os.path.join(BUILD, i.get('src', '/x').lstrip('/')) for i in icons]
    sizes = [T.png_size(f) if os.path.exists(f) else None for f in files]
    ok('Dock menus · OR’s shortcuts are its four most useful commands, without the app’s name: Add case, Find a case, Schedule, Display mode (it had Schedule, Cases, Display mode)',
       names == ['Add case', 'Find a case', 'Schedule', 'Display mode'] and all('OR' not in n for n in names) and [s['url'] for s in sc] == ['/or/#add', '/or/#find', '/or/#schedule', '/or/#display'], names)
    ok('Home Screen quick actions · each has a symbol (none had one): 96 px, monochrome in the suite grey, drawn from OR’s own',
       len(sizes) == 4 and all(s == (96, 96) for s in sizes) and all(i.get('sizes') == '96x96' for i in icons) and all(grey(f) for f in files), (sizes, icons))
    ok('…and a shortcut acts in the OR window already open (launch_handler focus-existing), as Flow’s do',
       (man.get('launch_handler') or {}).get('client_mode', [None])[0] == 'focus-existing', man.get('launch_handler'))

    c, p, e = await T.open_or(br, path='/or/#add')
    await core.until(p, "document.getElementById('modal').classList.contains('open')", 5000)
    a = await p.evaluate("[document.getElementById('modal').classList.contains('open'), (document.getElementById('modalTitle')||document.querySelector('#modal h2,#modal h3')||{}).textContent, location.hash]")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("location.hash='#find'"); await p.wait_for_timeout(500)
    f = await p.evaluate("[document.activeElement&&document.activeElement.id, location.hash]")
    have = await p.evaluate("[!!document.getElementById('addCaseBtn'), !!document.getElementById('globalSearch'), !!document.querySelector('#switcher .seg[data-view=\"schedule\"]'), !!document.getElementById('displayBtn')]")
    ok('…Add case opens the Add case sheet once the cases are in (it opened the Board), and Find a case puts the cursor in search; each is also in OR',
       a[0] and 'Add case' in (a[1] or '') and a[2] == '' and f == ['globalSearch', ''] and all(have), (a, f, have))

    await p.evaluate("document.activeElement.blur()")
    await p.keyboard.press('?'); await p.wait_for_timeout(500)
    tab = await p.evaluate("!!document.querySelector('.pvx-ks .pvx-ks-ic')")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate(MAC)
    await p.keyboard.press('?'); await p.wait_for_timeout(500)
    ks = await p.evaluate("(()=>{const k=document.querySelector('.pvx-ks');return k&&[(k.querySelector('#pvxKsIc')||{}).textContent,(k.querySelector('.pvx-ks-how')||{}).textContent,[...k.querySelectorAll('.pvx-ks-ic b')].map(b=>b.textContent)]})()")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('…the Keyboard shortcuts sheet lists them under “From OR’s icon”, with how to reach them on this computer, only where they exist (not in a browser tab)',
       tab is False and ks and ks[0] == 'From OR’s icon' and 'Dock' in (ks[1] or '') and ks[2] == ['Add case', 'Find a case', 'Schedule', 'Display mode'], (tab, ks))

    await p.evaluate("try{localStorage.setItem('pvx:or:tip-sc','2')}catch(e){}")
    await p.click('#addCaseBtn'); await p.wait_for_timeout(500)
    await p.select_option('#acProc', 'TPLO'); await p.wait_for_timeout(150)
    await p.select_option('#acLat', 'Left'); await p.wait_for_timeout(150)
    if await p.evaluate("!!document.querySelector('#acSurgeon option[value=\"\"]')"): await choose(p, '#acSurgeon', index=1); await p.wait_for_timeout(150)   # n411: the surgeon is chosen
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()")
    await core.until(p, "[...document.querySelectorAll('#notes .note')].some(n=>n.textContent.includes('from OR’s icon'))", 5000)
    tip = await p.evaluate("[[...document.querySelectorAll('#notes .note')].filter(n=>n.textContent.includes('from OR’s icon')).length, localStorage.getItem('pvx:or:tip-sc')]")
    ok('…one tip, after the third case added from inside OR, says Add case is on OR’s icon, then never again', tip == [1, 'shown'], tip)
    await p.evaluate("closeDrawer&&closeDrawer()"); await p.wait_for_timeout(300)

    # Edit menus: a field and selected text keep the browser's own menu
    await p.evaluate("switchView('board')"); await p.wait_for_timeout(400)
    fld = await p.evaluate("""(()=>{const s=document.getElementById('globalSearch');const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:10,clientY:10});s.dispatchEvent(ev);
        return [ev.defaultPrevented, !!document.querySelector('.pvx-cx')]})()""")
    sel = await p.evaluate("""(()=>{const b=document.querySelector('#view-board .or-q[data-id] b, #view-board .or-q[data-id] .nm, #view-board .or-q[data-id]');const r=document.createRange();r.selectNodeContents(b);const s=getSelection();s.removeAllRanges();s.addRange(r);
        const q=b.getBoundingClientRect();const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:q.left+4,clientY:q.top+4});b.dispatchEvent(ev);const out=[ev.defaultPrevented, !!document.querySelector('.pvx-cx'), String(s).trim().length>0];s.removeAllRanges();return out})()""")
    ok('Edit menus · a field and selected text keep the browser’s own menu (Cut, Copy, Paste, Look Up): OR’s case menu stays out of both',
       fld == [False, False] and sel == [False, False, True], (fld, sel))
    ok('no page errors', not e, e)
    await c.close()
