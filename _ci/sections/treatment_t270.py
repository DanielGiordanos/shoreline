"""Treatment Sheets — the n270 build's own checks: Treatment Sheets against HIG Tab views, Activity views, Buttons,
Context menus. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
from tsh import *
from core import ok, section, until, PORT, ENGINE

# a control's hit region: the points 21 pt above, below, left and right of its centre are the control (or inside it).
# The first visible one of each selector is scrolled to the middle of the screen first.
HIT = """(sels=>{const bad=[];for(const sel of sels){const e=[...document.querySelectorAll(sel)].find(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden');
  if(!e){bad.push([sel,'missing']);continue}e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const own=(x,y)=>{const t=document.elementFromPoint(x,y);return !!t&&(t===e||e.contains(t))};
  const pts=[[cx,cy-21],[cx,cy+21],[cx-21,cy],[cx+21,cy]].filter(p=>p[0]>=0&&p[1]>=0&&p[0]<innerWidth&&p[1]<innerHeight);
  const miss=pts.filter(p=>!own(p[0],p[1])).map(p=>{const t=document.elementFromPoint(p[0],p[1]);return Math.round(p[0]-cx)+','+Math.round(p[1]-cy)+':'+(t?(t.className+'').slice(0,18):'')});
  if(miss.length)bad.push([sel,Math.round(r.width)+'x'+Math.round(r.height),miss])}return bad})"""
BARS = ['.treatment-toolbar .brief-toggle', '.treatment-toolbar .dn-prev', '.treatment-toolbar .today', '.treatment-toolbar .dn-next', '.treatment-toolbar .zm-b',
        '.treatment-toolbar .zm-mid', '.treatment-toolbar .ts-seen', '.treatment-toolbar .ts-view-btn', '.treatment-toolbar .ts-audit-btn', '.treatment-toolbar .lg-act',
        '.treatment-toolbar .ts-expand-btn', '#clinSwitcher .seg', '.subnav .ts-chip', '.subnav .ts-gear', '.search-bar .ts-search-open', '.pt-tab.cur .pt-main', '.pt-row .pt-add',
        '.pt-row .pt-more', '#tsSecNav .sn-chip', '.tsh-flags .ts-al']
GRID = ['#sheetInner .gsection', '#sheetInner .gsection .sec-add', '#sheetInner .rl > .rl-off', '#sheetInner .rl-trend']
VIEWS = {'vitals': ['#ctab-vitals .v-header .btn', '#vxTake', '#vxWin button', '#ctab-vitals .v-sw'], 'tasks': ['#ctab-tasks .wl-seg button', '#ctab-tasks .wl-chip'],
         'timeline': ['#ctab-timeline .tl-filters .chip'], 'charges': ['#ctab-charges .ch-acts .btn', '#ctab-charges .ch-lv', '#ctab-charges .ch-day > summary'],
         'notes': ['#ctab-notes .btn.primary'], 'dash': ['#ctab-dash .sb-segb', '#ctab-dash .sb-tvb', '#ctab-dash .sb-filters', '#ctab-dash .sb-sorth', '#ctab-dash .ward-sel']}
MENU = """(()=>{const m=document.querySelector('.pt-pop.show');if(!m)return null;return {label:m.getAttribute('aria-label'),
  kids:[...m.children].map(e=>e.classList.contains('pt-psep')?'-':e.classList.contains('pt-ph')?'TITLE':e.textContent.trim()+(e.querySelector('svg')?'+icon':'')+(e.querySelector('.pt-k')?'+keys':''))}})()"""
TAB = "(i=>{const r=[...document.querySelectorAll('.pt-tab .pt-main')][i].getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})"


async def tabmenu(pg, i):
    b = await pg.evaluate(TAB, i)
    await pg.mouse.click(b[0], b[1], button='right'); await until(pg, "!!document.querySelector('.pt-pop.show')", 3000)
    m = await pg.evaluate(MENU); await pg.keyboard.press('Escape'); await until(pg, "!document.querySelector('.pt-pop.show')", 3000)
    return m


@section(id='t270', title='n270 · Treatment Sheets against HIG Tab views, Activity views, Buttons, Context menus',
         apps=['treatment'], topics=['touch', 'buttons', 'menus', 'share'], engines=('chromium', 'webkit'))
async def s_t270(br):
    # ── Buttons 1. 44 pt hit regions on touch screens ──
    ctx, pg, e = await ts(br, PORT, vp=(1024, 1366), touch=True, view='sheet')
    b1 = await pg.evaluate(HIT, BARS)
    ok('Buttons: on iPad the toolbar, sub-nav, section switcher, patient tabs, section chips and the allergy chip all answer a tap 21 pt from their centre (they were 26–39 pt)', not b1, b1)
    b2 = await pg.evaluate(HIT, GRID)
    ok('…and so do the sheet’s section bands, their +, “‹ 2” and the latest values', not b2, b2)
    b3 = {}
    for v, sels in VIEWS.items():
        await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(700)
        r = await pg.evaluate(HIT, sels)
        if r: b3[v] = r
    ok('…and the controls of Vitals, Tasks, Timeline, Charges, Notes and the board', not b3, b3)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(700)
    await pg.evaluate("tsOpenMedOrder('Maropitant');0"); await until(pg, "!!document.getElementById('rxDose')", 4000); await pg.wait_for_timeout(400)
    b4 = await pg.evaluate(HIT, ['#tsModal .ts-btn', '#tsModal select', '#tsModal .td-o button', '#tsModal .td-ok', '#tsModal .rx-chip'])
    await pg.keyboard.press('Escape'); await until(pg, "!document.querySelector('#tsModal.show')", 3000)
    await pg.evaluate("openCompletion('20261023_d1_0');0"); await until(pg, "!!document.querySelector('#completionDrawer.open')", 4000); await pg.wait_for_timeout(500)
    b4 += await pg.evaluate(HIT, ['#completionDrawer .close', '#completionDrawer .sn-bar .sn-chip'])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    await pg.click('.pt-more'); await until(pg, "!!document.querySelector('.pt-pop.show')", 3000)
    b4 += await pg.evaluate(HIT, ['.pt-pop.show .pt-mi'])
    await pg.keyboard.press('Escape')
    ok('…and inside the order form, the charting drawer and menus', not b4, b4)
    ok('no page errors (iPad)', not e, e[:2]); await ctx.close()

    ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, view='sheet')
    i1 = await pg.evaluate(HIT, ['.treatment-toolbar .brief-toggle', '.treatment-toolbar .today', '.treatment-toolbar .lg-act', '.pvx-hdr-more', '.pt-row .pt-cur', '.pt-row .pt-open'])
    rows = await pg.evaluate("(()=>{const t=document.querySelector('.treatment-toolbar');return [...new Set([...t.children].filter(k=>k.getClientRects().length).map(k=>Math.round(k.getBoundingClientRect().top)))].length})()")
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(700)
    i2 = await pg.evaluate(HIT, ['#ctab-dash .sb-row .tm-p.tm-tech'])
    ok('Buttons: on iPhone too (the toolbar, Details, the patient bar, and the Tech name, which Add alert’s hit area covered), and the toolbar keeps its rows (3)', not i1 and not i2 and rows == 3, [i1, i2, rows])
    ok('no page errors (iPhone)', not e, e[:2]); await ctx.close()

    if ENGINE == 'chromium':   # WebKit on Linux draws a 15 pt scrollbar an iPhone doesn't have, so 375 pt there is narrower than a phone
        ctx, pg, e = await ts(br, PORT, vp=(375, 667), touch=True, view='sheet')
        rows = await pg.evaluate("(()=>{const t=document.querySelector('.treatment-toolbar');return [...new Set([...t.children].filter(k=>k.getClientRects().length).map(k=>Math.round(k.getBoundingClientRect().top)))].length})()")
        h = await pg.evaluate(HIT, ['.treatment-toolbar .dn-prev', '.treatment-toolbar .dn-next', '.treatment-toolbar .ts-seen'])
        ok('…and on a 375 pt iPhone the toolbar still has 3 rows, with the day arrows and Approval mode at 44 pt', rows == 3 and not h, [rows, h]); await ctx.close()

    # with a mouse, Mac sizes stay compact
    ctx, pg, e = await ts(br, PORT, view='sheet')
    mac = await pg.evaluate("(()=>{const h=s=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().height):null},w=s=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().width):null};return [h('.pt-tab'),h('.treatment-toolbar .dn-prev'),w('.treatment-toolbar .zm-b'),h('#sheetInner .gsection'),h('#tsSecNav .sn-chip'),getComputedStyle(document.querySelector('.treatment-toolbar .dn-prev'),'::after').content]})()")
    ok('…with a mouse, Mac sizes stay as they were (tabs 32, day buttons 34, − 32 wide, bands 28, chips 26) and there are no extra hit areas', mac == [32, 34, 32, 28, 26, 'none'], mac)

    # ── Buttons 2. press state ──
    async def pressed(sel):
        b = await pg.evaluate("(s=>{const e=[...document.querySelectorAll(s)].find(x=>x.getClientRects().length);const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})", sel)
        await pg.mouse.move(b[0], b[1]); await pg.mouse.down(); await pg.wait_for_timeout(250)
        st = await pg.evaluate("(s=>{const c=getComputedStyle([...document.querySelectorAll(s)].find(x=>x.getClientRects().length));return [c.filter,c.scale]})", sel)
        await pg.mouse.up(); await pg.wait_for_timeout(300)
        return st
    p1, p2 = await pressed('#clinSwitcher .seg.active'), await pressed('.pt-tab.cur .pt-main')
    ok('Buttons: pressing a button darkens it and scales it to 0.97 (Treatment’s section switcher had no press state); a wide tab only darkens',
       p1[0].startswith('brightness(0.8') and p1[1].startswith('0.97') and p2[0].startswith('brightness(0.8') and p2[1] in ('none', '1'), [p1, p2])
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', media={'reduced_motion': 'reduce'})
    p3 = await pressed('#clinSwitcher .seg.active')
    ok('…with Reduce Motion only the fill changes', p3[0].startswith('brightness(0.8') and p3[1] in ('none', '1'), p3)
    await ctx.close()

    # ── Context menus: the patient tab menu ──
    ctx, pg, e = await ts(br, PORT, view='sheet', init="window.__shared=[];Object.defineProperty(navigator,'share',{value:function(d){window.__shared.push(d);return Promise.resolve()},configurable:true})")
    m0, m1, m2 = await tabmenu(pg, 0), await tabmenu(pg, 1), await tabmenu(pg, 2)
    allk = (m0 or {}).get('kids', []) + (m1 or {}).get('kids', []) + (m2 or {}).get('kids', [])
    ok('Context menus: the patient tab menu has no title and no shortcut glyphs; VoiceOver hears whose tab it is (the menu’s name)',
       m0 and 'TITLE' not in allk and not any('+keys' in k for k in allk) and m0['label'] == 'Biscuit Training' and m1['label'] == 'Mochi Training', [m0, m1])
    ok('…Move left and Move right appear only where the tab can move (first: right only, middle: both, last: left only)',
       'Move left' not in m0['kids'] and 'Move right' in m0['kids'] and 'Move left' in m1['kids'] and 'Move right' in m1['kids'] and 'Move left' in m2['kids'] and 'Move right' not in m2['kids'], [m0, m1, m2])
    ok('…three groups at most: Pin (the only icon) on its own, the moves, then Close other tabs and Close tab last',
       m1['kids'] == ['Pin+icon', '-', 'Move left', 'Move right', '-', 'Close other tabs', 'Close tab'], m1['kids'])
    # Pin from the main interface
    await pg.click('.pt-more'); await until(pg, "!!document.querySelector('.pt-pop.show')", 3000)
    o1 = await pg.evaluate(MENU)
    await pg.click('.pt-pop.show [data-k=pin]'); await pg.wait_for_timeout(500)
    pin = await pg.evaluate("document.querySelector('.pt-tab.cur').classList.contains('pinned')")
    await pg.click('.pt-more'); await until(pg, "!!document.querySelector('.pt-pop.show')", 3000)
    o2 = await pg.evaluate(MENU); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    m3 = await tabmenu(pg, 1)
    ok('Context menus: every item is also in the main interface — Tab options has “Pin this tab”, which pins it and then reads “Unpin this tab”',
       o1 and 'Pin this tab' in o1['kids'] and pin and 'Unpin this tab' in o2['kids'], [o1, pin, o2])
    ok('…and a tab next to a pinned one can’t move onto it, so its menu doesn’t offer that', 'Move left' not in m3['kids'] and 'Move right' in m3['kids'], m3)
    # one tab left: nothing to move or close
    await pg.evaluate("(()=>{const r=[...document.querySelectorAll('.pt-tab.cur .pt-main')][0];r.click()})()")
    b = await pg.evaluate(TAB, 0); await pg.mouse.click(b[0], b[1], button='right'); await until(pg, "!!document.querySelector('.pt-pop.show')", 3000)
    await pg.click('.pt-pop.show [data-k=pin]'); await pg.wait_for_timeout(400)   # unpin it again
    b = await pg.evaluate(TAB, 0); await pg.mouse.click(b[0], b[1], button='right'); await until(pg, "!!document.querySelector('.pt-pop.show')", 3000)
    await pg.click('.pt-pop.show [data-k=others]'); await pg.wait_for_timeout(600)
    n = await pg.evaluate("document.querySelectorAll('.pt-tab').length")
    m4 = await tabmenu(pg, 0)
    ok('…with one tab, the menu holds only Pin and Close tab (Move and Close other tabs would do nothing)', n == 1 and m4 and m4['kids'] == ['Pin+icon', '-', 'Close tab'], [n, m4])
    # keyboard: Shift-F10 on a tab opens the same menu
    await pg.focus('.pt-tab .pt-main'); await pg.keyboard.press('Shift+F10'); await until(pg, "!!document.querySelector('.pt-pop.show')", 3000)
    k = await pg.evaluate(MENU); await pg.keyboard.press('Escape')
    ok('…and ⇧F10 on a tab opens it from the keyboard', k and k['kids'][0] == 'Pin+icon', k)

    # ── Activity views: the system share sheet ──
    await pg.click('#tsCopyBtn'); await until(pg, "!!document.getElementById('tsCopyMenu')", 3000)
    sm = await pg.evaluate("[...document.querySelectorAll('#tsCopyMenu [data-c]')].map(b=>b.dataset.c)")
    if 'share' in sm: await pg.click('#tsCopyMenu [data-c=share]'); await pg.wait_for_timeout(400)
    sh = await pg.evaluate("window.__shared")
    ok('Activity views: on a Mac whose browser has a share sheet (Safari), Share offers “Share link…” before Print…, and it hands the system share sheet the sheet’s link (it was touch screens only)',
       sm == ['tx', 'v', 'link', 'share', 'print'] and sh and sh[0]['url'].endswith('#sheet=sh_train1') and 'Biscuit' not in sh[0]['url'], [sm, sh])
    ok('no page errors (menus)', not e, e[:2]); await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', init="try{Object.defineProperty(navigator,'share',{value:undefined,configurable:true})}catch(e){}")
    await pg.click('#tsCopyBtn'); await until(pg, "!!document.getElementById('tsCopyMenu')", 3000)
    sm2 = await pg.evaluate("[...document.querySelectorAll('#tsCopyMenu [data-c]')].map(b=>b.dataset.c)")
    ok('…and where there is no share sheet, no “Share link…” (Copy link to this sheet is there)', 'share' not in sm2 and 'link' in sm2, sm2)
    await ctx.close()
