"""Pravix OR — the n419 build's own checks (Nov 21 2026): HIG Sheets, Windows.
On an iPhone OR's sheets were centred cards with their buttons at the bottom, no grabber and no swipe; they rise from the
bottom now, Cancel at the top left and the action at the top right, and a swipe down closes them (asking first after
typing). Where the case details are a sheet, a sheet opened from them stacked on top; they step aside now. The Undo
message and notifications were drawn over an open sheet; a message shows in the sheet, a notification waits. A case can be
opened in a new window: ⌘/Ctrl-click, a middle click, and "Open in new window" in the case menu."""
import core
from core import ok, section
from or_t390 import open_or

SHEET = """(()=>{const m=document.getElementById('modal'), r=m.getBoundingClientRect(), h=m.querySelector('.or-modal-head'), t=document.getElementById('modalTitle').getBoundingClientRect();
  const vis=e=>e&&e.getBoundingClientRect().width>0&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
  const hb=[...h.querySelectorAll('button')].filter(vis).map(b=>{const q=b.getBoundingClientRect();return [b.textContent.trim(),b.getAttribute('aria-label'),Math.round(q.left),Math.round(q.right),Math.round(q.height),b.disabled||b.getAttribute('aria-disabled')==='true']});
  const fb=[...document.querySelectorAll('#modalActions > .btn')].filter(vis).map(b=>b.textContent.trim());
  const g=m.querySelector('.or-grab');
  return {open:m.classList.contains('open'), top:Math.round(r.top), bottom:Math.round(innerHeight-r.bottom), w:Math.round(r.width), vw:innerWidth,
    grab:vis(g), head:hb, foot:fb, title:[Math.round(t.left),Math.round(t.right)], footShown:vis(document.getElementById('modalActions'))}})()"""


async def swipe(p, cdp, d=220):
    b = await p.evaluate("(()=>{const r=document.querySelector('#modal .or-grab').getBoundingClientRect(); return [r.left+r.width/2, r.top+3];})()")
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': b[0], 'y': b[1]}]})
    for k in range(1, 9):
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': b[0], 'y': b[1] + d * k / 8}]}); await p.wait_for_timeout(16)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})


@section(id='t419', title='n419 · OR · Sheets, Windows: iPhone sheets from the bottom with Cancel and the action in the top bar and a swipe; one sheet at a time; nothing over a sheet; a case in a new window',
         apps=['or'], topics=['sheets-alerts', 'windows', 'modality'], engines=('chromium', 'webkit'))
async def s_t419(br):
    errs = []
    chromium = core.ENGINE == 'chromium'
    # ── iPhone ──
    c, p, e = await open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("addCaseModal()"); await p.wait_for_timeout(600)
    ac = await p.evaluate(SHEET)
    ok('Sheets (iOS) · on an iPhone “Add case” rises from the bottom, full width, with a grabber (it was a centred card); Cancel at the top left, “Add case” at the top right and unavailable until the case is filled in, each 44 pt; no buttons left at the bottom',
       ac['open'] and ac['bottom'] <= 1 and ac['w'] == ac['vw'] and ac['grab'] and [h[0] for h in ac['head']] == ['Cancel', 'Add case']
       and ac['head'][0][3] <= ac['title'][0] and ac['head'][1][2] >= ac['title'][1] and ac['head'][0][2] < 40 and ac['head'][1][3] > ac['vw'] - 40
       and ac['head'][1][5] is True and all(h[4] >= 44 for h in ac['head']) and not ac['footShown'], ac)
    await p.evaluate("closeModal()"); await p.wait_for_timeout(500)
    await p.evaluate("delayModal(caseById('or390c2'))"); await p.wait_for_timeout(600)
    dl = await p.evaluate(SHEET)
    ok('…“Delay” has Cancel at the top left (its ✕, which asks before throwing typing away) and “Save delay” at the top right; “Clear delay” stays at the bottom',
       [h[0] for h in dl['head']] == ['Cancel', 'Save delay'] and dl['head'][0][1] == 'Cancel' and dl['foot'] == ['Clear delay'] and dl['grab'], dl)
    await p.evaluate("closeModal()"); await p.wait_for_timeout(500)
    await p.evaluate("openLegend()"); await p.wait_for_timeout(600)
    lg = await p.evaluate(SHEET)
    ok('…a sheet for reading (Icon legend) keeps ✕ Close, at the top left and 44 pt', lg['grab'] and len(lg['head']) == 1 and lg['head'][0][1] == 'Close' and lg['head'][0][2] < 40 and lg['head'][0][4] >= 44, lg)
    await p.evaluate("closeModal()"); await p.wait_for_timeout(500)
    # an alert stays the n416 action sheet
    await p.evaluate("openModal({title:'Reset demo data?', sub:'x', body:'', actions:[{label:'Cancel',ghost:true},{label:'Reset',act:()=>{}}]})"); await p.wait_for_timeout(500)
    al = await p.evaluate("[document.getElementById('modal').className.includes('or-alertsheet'), document.getElementById('modal').className.includes('or-ps'), [...document.querySelectorAll('#modalActions > .btn')].map(b=>b.textContent)]")
    ok('…an alert is still the action sheet (n416), not a sheet with a top bar', al == [True, False, ['Reset', 'Cancel']], al)
    await p.evaluate("closeModal()"); await p.wait_for_timeout(500)
    if chromium:
        cdp = await c.new_cdp_session(p)
        await p.evaluate("specimenModal(caseById('or390c2'))"); await p.wait_for_timeout(600)
        await swipe(p, cdp); await p.wait_for_timeout(700)
        s1 = await p.evaluate("document.getElementById('modal').classList.contains('open')")
        await p.evaluate("specimenModal(caseById('or390c2'))"); await p.wait_for_timeout(600)
        await p.fill('#modalBody input:not([type=hidden])', 'abc'); await p.wait_for_timeout(150)
        await swipe(p, cdp); await p.wait_for_timeout(700)
        s2 = await p.evaluate("[document.getElementById('modal').classList.contains('open'), (document.querySelector('.or-discard')||{}).textContent||'', getComputedStyle(document.getElementById('modalActions')).display!=='none', getComputedStyle(document.getElementById('modal')).transform]")
        ok('…a swipe down closes an untouched sheet; after typing it stays and asks “Discard what you typed?” at the bottom first',
           s1 is False and s2[0] and 'Discard what you typed?' in s2[1] and s2[2] and s2[3] in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), (s1, s2))
        await p.click('#orDiscardYes'); await p.wait_for_timeout(500)
    errs += list(e); await c.close()

    # ── iPad: one sheet at a time ──
    c, p, e = await open_or(br, vp=(820, 1180), touch=True)
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(600)
    await p.evaluate("delayModal(caseById('or390c2'))"); await p.wait_for_timeout(600)
    ip = await p.evaluate("[getComputedStyle(document.getElementById('drawer')).visibility, document.getElementById('modal').classList.contains('open'), (()=>{const r=document.getElementById('modal').getBoundingClientRect();return r.top>40&&innerHeight-r.bottom>40})()]")
    await p.evaluate("closeModal()"); await p.wait_for_timeout(500)
    ip2 = await p.evaluate("[getComputedStyle(document.getElementById('drawer')).visibility, document.getElementById('drawer').classList.contains('open'), document.activeElement&&document.activeElement.id]")
    ok('Sheets · on an iPad, a sheet opened from the case details replaces them while it’s up (it stacked on top) and they come back after, with focus on their Close; iPad sheets stay centred form sheets',
       ip == ['hidden', True, True] and ip2 == ['visible', True, 'drawerClose'], (ip, ip2))
    it = await p.evaluate("orNewWindowItem(caseById('or390c2'))")
    ok('Windows · with touch only, the case menu doesn’t offer Open in new window (as in Flow and Treatment)', it is False, it)
    errs += list(e); await c.close()

    # ── Mac ──
    c, p, e = await open_or(br)
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(600)
    await p.evaluate("delayModal(caseById('or390c2'))"); await p.wait_for_timeout(500)
    mi = await p.evaluate("[document.body.classList.contains('or-inspect'), getComputedStyle(document.getElementById('drawer')).visibility]")
    await p.evaluate("closeModal(); closeDrawer()"); await p.wait_for_timeout(400)
    ok('…on a wide Mac window the details are an inspector beside the page, so they stay', mi == [True, 'visible'], mi)
    await p.evaluate("addCaseModal()"); await p.wait_for_timeout(500)
    mc = await p.evaluate(SHEET)
    await p.evaluate("toast('Maple · Closing',{action:'Undo',run(){window.__undone=1}}); notify('Anesia · Anesthesia started','Maple','var(--st-inor)')"); await p.wait_for_timeout(700)
    ov = await p.evaluate("""(()=>{const m=document.getElementById('modal').getBoundingClientRect(), n=document.querySelector('#modal .or-sheet-note');
      const inside=n&&!n.hidden&&(()=>{const q=n.getBoundingClientRect();return q.top>=m.top&&q.bottom<=m.bottom})();
      return {inSheet:inside, text:n&&n.textContent, floating:document.getElementById('toast').classList.contains('show'), notes:document.querySelectorAll('#notes .note').length}})()""")
    ok('Sheets (macOS) · the Mac sheet is unchanged: centred, Cancel and Add case in its footer, no grabber; a message while it’s open shows in the sheet beside its buttons, with Undo, instead of over it; a notification waits (both were drawn on top)',
       mc['top'] > 40 and mc['bottom'] > 40 and mc['foot'] == ['Cancel', 'Add case'] and not mc['grab'] and ov['inSheet'] and 'Maple · Closing' in ov['text'] and 'Undo' in ov['text']
       and not ov['floating'] and ov['notes'] == 0, (mc, ov))
    await p.evaluate("closeModal()"); await p.wait_for_timeout(900)
    after = await p.evaluate("[document.querySelectorAll('#notes .note').length, document.getElementById('toast').classList.contains('show')]")
    # a message from the action that closes the sheet shows once it has closed
    await p.evaluate("openModal({title:'Test sheet', body:'<input id=x>', actions:[{label:'Cancel',ghost:true},{label:'Save',act:()=>{ toast('Saved the test'); }}]})"); await p.wait_for_timeout(400)
    await p.click('#modalActions .btn.primary'); await p.wait_for_timeout(500)
    sv = await p.evaluate("[document.getElementById('modal').classList.contains('open'), document.getElementById('toast').classList.contains('show'), document.getElementById('toastMsg').textContent]")
    ok('…when the sheet closes, the notification that waited shows; and a message from the action that closed a sheet shows as usual once it has closed',
       after[0] == 1 and sv == [False, True, 'Saved the test'], (after, sv))

    # ── Windows ──
    pages = []
    c.on('page', lambda pg: pages.append(pg))
    await p.evaluate("switchView('board')"); await p.wait_for_timeout(400)
    await p.click('#view-board [data-id="or390c2"]', modifiers=['Meta' if await p.evaluate("/mac|iphone|ipad|ipod/i.test(navigator.platform)") else 'Control'])
    await p.wait_for_timeout(1200)
    st = await p.evaluate("[document.getElementById('drawer').classList.contains('open'), UI.view, location.hash]")
    n1 = len(pages)
    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(500)
    await p.click('#casesTable tr[data-id="or390c3"]', button='middle'); await p.wait_for_timeout(1200)
    n2 = len(pages)
    url1 = pages[0].url if pages else ''
    ok('Windows · ⌘-click on a Mac (Ctrl-click elsewhere) on a board case, and a middle click on a Cases row, each open that case in a new window at #case=<id> (no name); this window stays as it was',
       n1 == 1 and n2 == 2 and url1.endswith('/or/#case=or390c2') and st == [False, 'board', ''], (n1, n2, url1, st))
    # the address the new window opens (its own page here has none of the test's cases, so open the same address in one that does)
    c2, p2, e2 = await open_or(br, path='/or/#case=or390c2'); await p2.wait_for_timeout(1500)
    nw = await p2.evaluate("[UI.view, UI.caseId, location.hash]")
    ok('…that address opens on the case’s page and tidies itself', nw == ['case', 'or390c2', ''], nw)
    errs += list(e2); await c2.close()
    for pg in pages:
        try: await pg.close()
        except Exception: pass
    await p.evaluate("switchView('board')"); await p.wait_for_timeout(300)
    await p.click('#view-board [data-id="or390c2"]', button='right'); await p.wait_for_timeout(500)
    mn = await p.evaluate("(()=>{const m=document.querySelector('.pvx-cx'); return m?[...m.querySelectorAll('[role=menuitem]')].map(b=>b.textContent.trim()):null})()")
    ok('…with a mouse or trackpad, the case menu has “Open in new window” right after “Open case”', mn and 'Open in new window' in mn and mn.index('Open in new window') == mn.index('Open case') + 1, mn)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    await p.click('#view-board [data-id="or390c2"]'); await p.wait_for_timeout(600)
    pl = await p.evaluate("[document.getElementById('drawer').classList.contains('open'), UI.view]")
    ok('…a plain click still opens the case in place', len(pages) == 2 and pl[0] is True, (len(pages), pl))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
