"""Treatment Sheets — the n288 build's own checks: HIG Popovers, Scroll views, Sheets and Windows.
Written with that build; they run in Chromium and WebKit."""
import json
from tsh import *
from core import ok, section, until, PORT

FP = "(()=>{const f=document.getElementById('flPop');if(!f)return null;const r=f.getBoundingClientRect();return [f.classList.contains('pvx-as-sheet'),Math.round(r.left),Math.round(r.width),Math.round(r.bottom),!!document.querySelector('.pvx-pop-scrim')]})()"


async def swipe(ctx, pg, x, y, steps=12):
    """a finger dragged down from (x, y), as touch events (Chromium and WebKit)"""
    await pg.evaluate("""([x,y,n])=>new Promise(res=>{const el=document.elementFromPoint(x,y);
      const T=(cy)=>new Touch({identifier:7,target:el,clientX:x,clientY:cy,pageX:x,pageY:cy});
      const fire=(type,cy)=>{const t=type==='touchend'?[]:[T(cy)];el.dispatchEvent(new TouchEvent(type,{touches:t,targetTouches:t,changedTouches:[T(cy)],bubbles:true,cancelable:true,composed:true}))};
      fire('touchstart',y);let k=1;const step=()=>{if(k<n){fire('touchmove',y+k*25);k++;setTimeout(step,16)}else{fire('touchend',y+n*25);res()}};setTimeout(step,16)})""", [x, y, steps])
    await pg.wait_for_timeout(700)

TOUCH = "typeof Touch==='function'&&(()=>{try{new Touch({identifier:1,target:document.body,clientX:0,clientY:0});return true}catch(e){return false}})()"


@section(id='t288', title='n288 · Treatment Sheets against HIG Popovers, Scroll views, Sheets and Windows',
         apps=['treatment'], topics=['modality', 'layout'], engines=('chromium', 'webkit'))
async def s_t288(br):
    from core import ENGINE
    # 1. keyboard scrolling with nothing focused
    ctx, pg, e = await ts(br, PORT, view='sheet')
    SC = "document.getElementById('sheetScroll').scrollTop"
    await pg.keyboard.press('PageDown'); await pg.wait_for_timeout(1000); a = await pg.evaluate(SC)
    await pg.keyboard.press('End'); await pg.wait_for_timeout(1000); b = await pg.evaluate("[document.getElementById('sheetScroll').scrollTop,document.getElementById('sheetScroll').scrollHeight-document.getElementById('sheetScroll').clientHeight]")
    await pg.keyboard.press('Home'); await pg.wait_for_timeout(1000); h = await pg.evaluate(SC)
    ok('Scroll views: with nothing focused, Page Down, End and Home scroll the sheet (they did nothing)', a > 100 and abs(b[0] - b[1]) <= 2 and h == 0, [a, b, h])
    # Mac: View stays a popover
    await pg.click('.ts-view-btn'); await pg.wait_for_timeout(500); v = await pg.evaluate(FP)
    ok('…on the Mac, View is still a popover beside its button', v and not v[0] and v[2] < 400, v)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)

    # 5. windows: Ctrl/⌘-click a patient tab, and the tab menu
    pages = []; ctx.on('page', lambda p: pages.append(p))
    mod = 'Meta' if await pg.evaluate("/Mac OS X/.test(navigator.userAgent)") else 'Control'   # ⌘ where the browser says it's a Mac
    await pg.locator('.pt-tab .pt-main').nth(1).click(modifiers=[mod]); await pg.wait_for_timeout(1500)
    here = await pg.evaluate("location.hash")
    w = None
    if pages:
        await until(pages[0], "location.hash==='#sheet=sh_train2'&&typeof currentCTab!=='undefined'&&currentCTab==='sheet'", 12000)
        w = await pages[0].evaluate("[location.hash,typeof currentCTab!=='undefined'?currentCTab:null,localStorage.getItem('tsCurrentSheet')]")
    ok('Windows: Ctrl-click (⌘-click on a Mac) on a patient tab opens that sheet in a new window, on its sheet; this window stays put',
       len(pages) == 1 and w and w[0] == '#sheet=sh_train2' and w[1] == 'sheet' and here == '#sheet=sh_train1', [len(pages), w, here])
    await pg.locator('.pt-tab .pt-main').nth(2).click(button='right'); await pg.wait_for_timeout(400)
    m = await pg.evaluate("[...document.querySelectorAll('.pt-pop.show .pt-mi')].map(b=>b.textContent.trim())")
    await pg.click('.pt-pop.show [data-k=pvxwin]'); await pg.wait_for_timeout(1200)
    mo = await pg.evaluate("!!document.querySelector('.pt-pop.show')")
    ok('…and the patient tab’s menu starts with “Open in new window”, which opens it and closes the menu',
       m and m[0] == 'Open in new window' and len(pages) == 2 and 'sheet=sh_train3' in pages[1].url and not mo, [m, [p.url[-24:] for p in pages], mo])
    ok('no page errors', not e, e[:2])
    await ctx.close()

    # 2–4. iPhone
    ctx, pg, e = await ts(br, PORT, view='sheet', vp=(390, 844), touch=True)
    g = await pg.evaluate("[document.querySelector('.stage').clientHeight,document.getElementById('sheetScroll').clientHeight]")
    ok('iPhone: the sheet’s grid is as tall as the area it scrolls in (it ran 142 pt under the tab bar)', abs(g[0] - g[1]) <= 1, g)
    await pg.evaluate("document.querySelector('.ts-more-btn').click()"); await pg.wait_for_timeout(500); mm = await pg.evaluate(FP)
    await pg.evaluate("(()=>{const b=[...document.querySelectorAll('#flPop button')].find(x=>/View/.test(x.textContent));b&&b.click()})()"); await pg.wait_for_timeout(600)
    v = await pg.evaluate(FP)
    ok('iPhone: View opens as a sheet from the bottom, full width with the page dimmed (it was a popover); More stays a menu',
       mm and not mm[0] and v and v[0] and v[1] == 0 and v[2] == 390 and abs(v[3] - await pg.evaluate('innerHeight')) <= 12 and v[4], [mm, v])
    can = await pg.evaluate(TOUCH)   # a test can build touch events in Chromium only; the gesture code is the same in both
    if can:
        f = await pg.evaluate("(()=>{const r=document.getElementById('flPop').getBoundingClientRect();return [r.left+r.width/2,r.top+10]})()")
        await swipe(ctx, pg, f[0], f[1]); await pg.wait_for_timeout(500)
        gone = await pg.evaluate("[!document.getElementById('flPop'),!document.querySelector('.pvx-pop-scrim')]")
        ok('…a swipe down closes it', gone == [True, True], gone)
    else:
        await pg.evaluate("_closePop()"); await pg.wait_for_timeout(600)
    await pg.click('#tsSearch'); await pg.keyboard.type('maropitant'); await pg.wait_for_timeout(500); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(900)
    rx = await pg.evaluate("(()=>{const c=document.querySelector('#tsModal .tm-card');const r=c.getBoundingClientRect();const f=c.querySelector('.tm-foot');const fr=f.getBoundingClientRect();const bs=[...f.querySelectorAll('button')].map(b=>[b.textContent.trim(),Math.round(b.getBoundingClientRect().left)]);return [Math.round(r.bottom),Math.round(r.width),Math.round(fr.top-r.top),bs]})()")
    ok('iPhone: an order form rises from the bottom with Cancel at the top left and Add to sheet at the top right (they were at the bottom)',
       abs(rx[0] - await pg.evaluate('innerHeight')) <= 12 and rx[1] == 390 and rx[2] <= 1 and rx[3][0][0] == 'Cancel' and rx[3][0][1] < 40 and rx[3][1][0] == 'Add to sheet' and rx[3][1][1] > 200, rx)
    if can:
        await pg.evaluate("(()=>{const i=document.getElementById('rxDose');i.value='1';i.dispatchEvent(new Event('input',{bubbles:true}))})()"); await pg.wait_for_timeout(300)
        f = await pg.evaluate("(()=>{const r=document.querySelector('#tsModal .tm-foot').getBoundingClientRect();return [r.left+r.width/2,r.top+8]})()")
        await swipe(ctx, pg, f[0], f[1])
        d = await pg.evaluate("[!!document.querySelector('#tsModal.show'),!!document.querySelector('.pvx-discard'),(document.getElementById('rxDose')||{}).value]")
        ok('…a swipe down with a dose typed asks “Discard this order?” first, as Cancel does', d == [True, True, '1'], d)
        await pg.click('.pvx-discard [data-discard]'); await pg.wait_for_timeout(500)
        await pg.evaluate("(()=>{const r=[...document.querySelectorAll('#sheetInner .rl')].find(x=>/Methadone/.test(x.innerText));(r.querySelector('.rl-name')||r).click()})()"); await pg.wait_for_timeout(900)
        o1 = await pg.evaluate("document.getElementById('tsOrderSheet').classList.contains('show')")
        f = await pg.evaluate("(()=>{const r=[...document.querySelectorAll('#tsOrderSheet .op-card')].filter(x=>x.getClientRects().length).pop().getBoundingClientRect();return [r.left+r.width/3,r.top+12]})()")
        await swipe(ctx, pg, f[0], f[1])
        o2 = await pg.evaluate("document.getElementById('tsOrderSheet').classList.contains('show')")
        ok('…and a swipe down closes the order panel (it stayed open)', o1 and not o2, [o1, o2])
    ok('no page errors (iPhone)', not e, e[:2])
    await ctx.close()

    # board: Filters as a sheet on iPhone; a middle click opens a row in a new window
    ctx, pg, e = await ts(br, PORT, view='board', vp=(390, 844), touch=True)
    await pg.evaluate("document.querySelector('.sb-filters').click()"); await pg.wait_for_timeout(500); fl = await pg.evaluate(FP)
    ok('iPhone: the board’s Filters opens as a sheet too', fl and fl[0] and fl[2] == 390, fl)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='board'); pages = []; ctx.on('page', lambda p: pages.append(p))
    await pg.locator('.sb-row[data-id="sh_train2"]').click(button='middle'); await pg.wait_for_timeout(1500)
    w = None
    if pages:
        await until(pages[0], "location.hash==='#sheet=sh_train2'&&typeof currentCTab!=='undefined'&&currentCTab==='sheet'", 12000)
        w = await pages[0].evaluate("[location.hash,typeof currentCTab!=='undefined'?currentCTab:null]")
    ok('Windows: a middle click on a Status board row opens that sheet in a new window, on its sheet', len(pages) == 1 and w == ['#sheet=sh_train2', 'sheet'], [len(pages), w])
    await ctx.close()
