"""Treatment Sheets — the n264 build's own checks: Treatment Sheets against HIG Modality, Multitasking, Offering help and
Onboarding. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
import json
from tsh import *
from core import ok, section, until, PORT

HIDE = """(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__hid?'hidden':'visible'});Object.defineProperty(document,'hidden',{configurable:true,get:()=>!!window.__hid});
 window.__setHid=v=>{window.__hid=v;document.dispatchEvent(new Event('visibilitychange'))}})()"""
MENU = "[...document.querySelectorAll('.ts-menu.show')].filter(e=>e.getClientRects().length).length"
ACT = "(()=>{const a=document.activeElement;return a?[a.className+'',a.getAttribute('role')||'',(a.closest('.ts-menu')||{}).id||'']:null})()"
CUR = "(document.querySelector('.pt-tab.cur')||{}).textContent||''"
# three overdue marks at the same hour, on different orders
SAME = """(()=>{const g={};document.querySelectorAll('#ctab-sheet .mark[data-t][data-s=overdue]').forEach(m=>{const p=m.dataset.t.split('_');const k=p[0]+'_'+Math.floor(+p[p.length-1]/60);(g[k]=g[k]||[]).push(m.dataset.t)});
  const k=Object.keys(g).find(k=>new Set(g[k].map(t=>t.split('_').slice(1,-1).join('_'))).size>=3);return k?g[k].slice(0,3):null})()"""


@section(id='t264', title='n264 · Treatment Sheets against HIG Modality, Multitasking, Offering help, Onboarding',
         apps=['treatment'], topics=['menus', 'dialogs', 'feedback', 'help', 'keyboard'], engines=('chromium', 'webkit'))
async def s_t264(br):
    # ── Modality 1. menus close with Esc and work from the keyboard ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.click('.ts-chip'); await pg.wait_for_timeout(400); o1 = await pg.evaluate(MENU)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    m1 = [o1, await pg.evaluate(MENU), await pg.evaluate("(document.activeElement||{}).className+''")]
    await pg.focus('.ts-chip'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400); k1 = await pg.evaluate(ACT)
    await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(100); k2 = await pg.evaluate(ACT)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); k3 = [await pg.evaluate(MENU), await pg.evaluate("(document.activeElement||{}).className+''")]
    ok('Modality: Esc closes the patient menu and focus goes back to its button (it stayed open)', m1[0] == 1 and m1[1] == 0 and 'ts-chip' in m1[2], m1)
    ok('Modality: opened from the keyboard, focus goes into the menu, ↓ moves through it, Esc closes it and returns to the button',
       k1 and k1[2] == 'tsPatientMenu' and k2 and k2[2] == 'tsPatientMenu' and k2 != k1 and k3[0] == 0 and 'ts-chip' in k3[1], [k1, k2, k3])
    await pg.click('.tsh-item:has-text("TECH")'); await pg.wait_for_timeout(400); t1 = await pg.evaluate(MENU)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('Modality: the Tech picker closes with Esc too', t1 == 1 and await pg.evaluate(MENU) == 0, t1)
    ok('no page errors (menus)', not e, e[:2]); await ctx.close()

    # ── 2. shortcuts wait while a dialog is open ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("tsOpenSheet('sh_train2')"); await until(pg, "/Mochi/.test(" + CUR + ")", 6000); await pg.wait_for_timeout(300); a = await pg.evaluate(CUR)   # a slow machine opens it later
    await pg.click('.ts-gear'); await pg.wait_for_timeout(500)
    await pg.keyboard.press('Alt+1'); await pg.wait_for_timeout(500)
    await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(400)
    r = [a, await pg.evaluate(CUR), await pg.evaluate("!!document.querySelector('.search.is-open,.search.is-focus')"), await pg.evaluate("!!document.querySelector('#tsOrderSheet.show')")]
    ok('Modality: with Treatment settings open, ⌥1 doesn’t switch the patient behind it and Ctrl K doesn’t open the search over it', 'Mochi' in r[0] and r[0] == r[1] and not r[2] and r[3], r)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(400)
    ok('…and once it’s closed, Ctrl K opens the search again', await pg.evaluate("!!document.querySelector('.search.is-open,.search.is-focus')"), '')
    await ctx.close()

    # ── 3. a view-only card closes with its ✕ only ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.click('.rl-trend:has-text("Not given") >> nth=0'); await pg.wait_for_timeout(600)
    cl = await pg.evaluate("(()=>{const c=[...document.querySelectorAll('#tsOrderSheet .op-card')].pop();return c?[...c.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>b.getAttribute('aria-label')||b.textContent.trim()):null})()")
    ok('Modality: the dose clock (view only) has one way out, its ✕ (it also had Close at the bottom)', cl is not None and cl.count('Close') == 1 and 'Close' in cl, cl)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('…and Esc still closes it', not await pg.evaluate("!!document.querySelector('#tsOrderSheet.show')"), '')
    await ctx.close()

    # ── 4. typing straight away is protected too ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.click('.ts-al'); await pg.wait_for_timeout(150)
    await pg.locator('#tsModal .tm-card input').first.click(); await pg.keyboard.type('Penicillin'); await pg.wait_for_timeout(900)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ask = await pg.evaluate("[...document.querySelectorAll('.pvx-discard button')].filter(b=>b.getClientRects().length).map(b=>b.textContent.trim())")
    ok('Modality: what’s typed in the first moment after a form opens is protected — Esc asks “Discard …?” (it closed and lost it)', ask == ['Keep editing', 'Discard'], ask)
    ok('no page errors (forms)', not e, e[:2]); await ctx.close()

    # ── Multitasking 5. a message waits while Treatment is hidden ──
    ctx, pg, e = await ts(br, PORT, view='sheet', init=HIDE)
    await pg.evaluate("toast('Heart rate 124 recorded')"); await pg.wait_for_timeout(200)
    await pg.evaluate("__setHid(true)"); await pg.wait_for_timeout(9000); await pg.evaluate("__setHid(false)"); await pg.wait_for_timeout(1500)
    back = await pg.evaluate("[...document.querySelectorAll('#toastWrap .ctoast')].filter(e=>e.getClientRects().length).map(e=>e.textContent.trim())")
    await pg.wait_for_timeout(5000)
    gone = await pg.evaluate("[...document.querySelectorAll('#toastWrap .ctoast')].filter(e=>e.getClientRects().length).length")
    ok('Multitasking: a message waits while Treatment is hidden — “Heart rate 124 recorded” is still there after 9 s in another app (it had gone), and then goes',
       any('Heart rate 124 recorded' in t for t in back) and gone == 0, [back, gone])
    await ctx.close()

    # ── Offering help 6. tooltips say what a control does ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    for sel in ['.seg[data-ctab=vitals]', '.ts-gear', '.ts-search-open']:
        await pg.hover(sel); await pg.wait_for_timeout(80)
    tt = await pg.evaluate("[document.querySelector('.seg[data-ctab=vitals]').title,document.querySelector('.ts-gear').title,document.querySelector('.ts-search-open').title,(document.querySelector('.pl-plus')||{}).title]")
    dw = await pg.evaluate("[...document.querySelectorAll('[title]')].map(e=>e.title).filter(t=>/uses this weight|Dosing weight/.test(t))")
    ok('Help: a tab’s tooltip says what it does, not its name again (“See readings and trends, and take vitals”; it said “Vitals”); the gear, search and + too',
       tt[0] == 'See readings and trends, and take vitals' and tt[1] == 'Open Treatment settings' and tt[2] == 'Search patients and orders' and tt[3] == 'Add the problem you typed', tt)
    ok('Help: the dosing weight’s tooltip fits 75 characters', dw and all(len(t) <= 75 for t in dw), dw)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, vp=(1100, 820), view='sheet')
    await pg.hover('.seg[data-ctab=vitals]'); await pg.wait_for_timeout(80)
    io = await pg.evaluate("[document.documentElement.classList.contains('pvx-snav-icons'),document.querySelector('.seg[data-ctab=vitals]').title]")
    ok('Help: when the tabs show only their symbols, the tooltip adds the name (“Vitals — see readings …”)', io[1] == 'Vitals — see readings and trends, and take vitals', io)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='dash')
    for sel in ['.sb-segb[data-board="IP Board"]', '.sb-segb[data-key=H] >> nth=0', '.sb-filters']:
        await pg.hover(sel); await pg.wait_for_timeout(80)
    bt = await pg.evaluate("[document.querySelector('.sb-segb[data-board=\"IP Board\"]').dataset.tip,document.querySelector('.sb-segb[data-key=H]').dataset.tip,document.querySelector('.sb-filters').dataset.tip]")
    ok('Help: the board’s choices say what they show (“Show admitted patients”, “Show each patient’s day by the hour”, “Choose which patients the board shows”)',
       bt[0] == 'Show admitted patients' and bt[1] in ('Show each patient’s day by the hour', 'Show the patients as a list') and bt[2] == 'Choose which patients the board shows', bt)
    await ctx.close()

    # ── 7. the Keyboard shortcuts sheet ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.keyboard.press('Shift+?'); await pg.wait_for_timeout(400)
    ks = await pg.evaluate("(()=>{const b=document.querySelector('.pvx-ks .pvx-ks-box');return b?[b.getAttribute('role'),b.innerText.replace(/\\n+/g,' | ').slice(0,900)]:null})()")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); kc = await pg.evaluate("!document.querySelector('.pvx-ks')")
    ok('Help: ? opens Keyboard shortcuts — search, patient tabs, the sheet’s keys, Undo, the board, the display — and Esc closes it (? did nothing)',
       ks and ks[0] == 'dialog' and all(w in ks[1] for w in ['Keyboard shortcuts', 'Search patients and orders', 'Go to patient tab 1 to 9', 'Move around the sheet', 'Undo', 'Hours or list', 'Turn the page']) and kc, ks)
    await pg.click('.ts-gear'); await pg.wait_for_timeout(400); await pg.keyboard.press('Shift+?'); await pg.wait_for_timeout(300)
    ok('…but not over an open dialog', not await pg.evaluate("!!document.querySelector('.pvx-ks')"), '')
    ok('no page errors (shortcuts)', not e, e[:2]); await ctx.close()

    # ── 8. one tip: a whole hour at once ──
    async def three(pg):
        ts3 = await pg.evaluate(SAME)
        for t in ts3 or []:
            await pg.evaluate("(t=>{document.querySelector('#ctab-sheet .mark[data-t=\"'+t+'\"]').click()})", t)
            await pg.wait_for_timeout(500); await pg.evaluate("try{closeDrawers()}catch(e){}"); await pg.wait_for_timeout(300)
        return ts3
    TIP = "(()=>{const t=document.getElementById('pvxTipHour');return t&&t.getClientRects().length?[t.getAttribute('role'),t.innerText.trim()]:null})()"
    ctx, pg, e = await ts(br, PORT, view='sheet', init="localStorage.removeItem('pvxTipHour')")
    t0 = await pg.evaluate(TIP); used = await three(pg); t1 = await pg.evaluate(TIP)
    ok('Help: after charting three treatments at the same hour one at a time, a one-line tip says “Chart a whole hour at once: click its time at the top of the sheet.”',
       t0 is None and used and t1 and t1[1] == 'Chart a whole hour at once: click its time at the top of the sheet.' and t1[0] == 'status', [t0, used, t1])
    await pg.click('#pvxTipHour .pvx-tip-x'); await pg.wait_for_timeout(200)
    st = await pg.evaluate("[!document.getElementById('pvxTipHour'),localStorage.getItem('pvxTipHour')]")
    ok('…its ✕ closes it for good', st[0] and st[1] and json.loads(st[1]).get('done') == 1, st)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', init="localStorage.setItem('pvxTipHour',JSON.stringify({shown:new Date().toDateString()}))")
    await three(pg); once = await pg.evaluate(TIP)
    ok('Help: the tip shows at most once a day', once is None, once)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', init="localStorage.removeItem('pvxTipHour')")
    await pg.evaluate("(()=>{const h=document.querySelector('#ctab-sheet .hcell');h.click()})()"); await pg.wait_for_timeout(500); await pg.evaluate("try{closeModal()}catch(e){};try{closeDrawers()}catch(e){}")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await three(pg); after = await pg.evaluate(TIP)
    ok('Help: someone who already charts an hour at once never sees it', after is None and json.loads(await pg.evaluate("localStorage.getItem('pvxTipHour')") or '{}').get('done') == 1, after)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, view='sheet', init="localStorage.removeItem('pvxTipHour')")
    await three(pg); tt2 = await pg.evaluate(TIP)
    ok('Help: on iPhone and iPad it says “tap”', tt2 and 'tap its time' in tt2[1], tt2)
    ok('no page errors (tip)', not e, e[:2]); await ctx.close()
