"""Treatment Sheets — the n261 build's own checks: Treatment Sheets against HIG Entering data, Feedback, Going full screen,
Loading, Live-viewing apps. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
import os, re, json
import tsh as h
from tsh import *
from core import ok, section, until, BUILD as SITE, PORT, ENGINE
from helpers import ts232   # nine patients, so the inpatients display has two pages

TOASTS = "[...document.querySelectorAll('#toastWrap .ctoast')].map(t=>t.innerText.replace(/\\s+/g,' '))"
CLEAR = "document.querySelectorAll('#toastWrap .ctoast').forEach(t=>t.remove())"
SAID = "(document.getElementById('pvxSayLive')||{}).textContent||''"


@section(id='t261', title='n261 · Treatment Sheets against HIG Entering data, Feedback, Going full screen, Loading, Live-viewing apps',
         apps=['treatment'], topics=['data-entry', 'feedback', 'behaviour', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t261(br):
    ctx, pg, e = await ts(br, PORT, view='sheet')
    # ── Entering data 1. the estimate's money fields are checked as you leave them ──
    await pg.evaluate("openEstimate()"); await until(pg, "!!document.getElementById('esCur')", 3000); await pg.wait_for_timeout(1000)   # its checks attach just after it opens
    MSG = "[...document.querySelectorAll('#tsModal .pvx-fmsg')].filter(e=>e.getClientRects().length).map(e=>e.innerText.trim()).join(' | ')"
    # one field at a time: a message puts focus back in its field, so the next field waits until this one is fixed
    async def leave(sel, val, want):
        for _ in range(3):
            await pg.fill(sel, val); await pg.locator(sel).blur()
            if await until(pg, MSG + f".includes({json.dumps(want)})", 2000): break
        return [await pg.evaluate(MSG), await pg.evaluate(f"document.querySelector('{sel}').getAttribute('aria-invalid')")]
    await pg.fill('#esLow', '1000'); await pg.fill('#esHigh', '2000')
    cur = await leave('#esCur', 'about 900', 'Enter current charges as a number, like 1250')
    await pg.fill('#esCur', '1,250'); await pg.locator('#esCur').blur(); await pg.wait_for_timeout(400)
    fixed = await pg.evaluate(MSG)
    dep = await leave('#esDep', 'half', 'Enter the deposit as a number, like 500')
    ok('Entering data: the estimate checks Current charges and Deposit as you leave them — “Enter current charges as a number, like 1250”, “Enter the deposit as a number, like 500” (they were refused only on Save)',
       'Enter current charges as a number, like 1250' in cur[0] and cur[1] == 'true' and 'Enter the deposit as a number, like 500' in dep[0] and dep[1] == 'true', [cur, dep])
    ok('Entering data: a real amount (“1,250”) clears the message', 'current charges' not in fixed, fixed)
    await pg.fill('#esDep', '500'); await pg.locator('#esDep').blur(); await pg.wait_for_timeout(300)
    await pg.evaluate("(()=>{try{closeModal(true)}catch(e){}try{closeModal()}catch(e){}})()"); await until(pg, "!document.querySelector('#tsModal.show')", 2000); await pg.wait_for_timeout(300)

    # ── Feedback 2. buttons that can't act say why ──
    nd = await pg.evaluate("(()=>{const b=document.querySelector('.ts-daynav .dn-next');return b?[b.disabled,b.getAttribute('aria-disabled'),b.title,b.tabIndex]:null})()")
    await pg.evaluate(CLEAR); await pg.evaluate("document.querySelector('.ts-daynav .dn-next').click()"); await pg.wait_for_timeout(400)
    ndt = await pg.evaluate(TOASTS)
    ok('Feedback: on today, Next day is dimmed, not disabled — it keeps its tooltip “Today is the newest day”, stays reachable, and pressing it says so',
       nd and nd[0] is False and nd[1] == 'true' and nd[2] == 'Today is the newest day' and nd[3] >= 0 and any('Today is the newest day' in x for x in ndt), [nd, ndt])
    zm = await pg.evaluate("[...document.querySelectorAll('.ts-zoom .zm-b')].map(b=>[b.getAttribute('aria-label'),b.disabled,b.getAttribute('aria-disabled'),b.title])")
    lim = [z for z in zm if z[2] == 'true']
    await pg.evaluate(CLEAR); await pg.evaluate("(()=>{const b=[...document.querySelectorAll('.ts-zoom .zm-b')].find(b=>b.getAttribute('aria-disabled')==='true');b&&b.click()})()"); await pg.wait_for_timeout(400)
    zt = await pg.evaluate(TOASTS)
    ok('Feedback: the hours control at its limit is dimmed with its reason (“Already showing the most hours”) and says it when pressed; nothing is plain disabled',
       lim and not any(z[1] for z in zm) and lim[0][3] in ('Already showing the most hours', 'The hours are as large as they go') and any(lim[0][3] in x for x in zt), [zm, zt])
    for _ in range(8): await pg.evaluate("tsZoom(1)"); await pg.wait_for_timeout(120)
    big = await pg.evaluate("(()=>{const b=document.querySelector('.ts-zoom .zm-b[aria-label^=\"Show fewer\"]');return b?[b.getAttribute('aria-disabled'),b.title]:null})()")
    await pg.evaluate("tsZoom(0)"); await pg.wait_for_timeout(300)
    ok('Feedback: at the largest hours, “Larger hours” is dimmed and says “The hours are as large as they go”', big == ['true', 'The hours are as large as they go'], big)

    # ── Feedback 3. removing a shared snippet has Undo ──
    await pg.evaluate("tsOpenMedOrder('Maropitant')"); await until(pg, "!!document.querySelector('#tsModal .sn-bar')", 4000); await pg.wait_for_timeout(800)
    RXV = "(()=>{const r=document.getElementById('rxNotes');return !!r&&r.getClientRects().length>0&&getComputedStyle(r).visibility!=='hidden'})()"
    if not await pg.evaluate(RXV):   # inside More options when it's closed
        await pg.evaluate("(()=>{const b=[...document.querySelectorAll('#tsModal button[aria-expanded]')].find(b=>/More options/.test(b.innerText)&&b.getAttribute('aria-expanded')!=='true');b&&b.click()})()")
        await until(pg, RXV, 3000)
    await pg.fill('#rxNotes', 'Give slowly over 2 min'); await pg.locator('#tsModal .sn-save').click(); await pg.wait_for_timeout(500)
    shown = await pg.evaluate("""(()=>{const c=[...document.querySelectorAll('#tsModal .sn-chip')].find(x=>x.dataset.t==='Give slowly over 2 min'),b=c&&c.closest('.sn-bar');if(!c)return null;const r=c.getBoundingClientRect(),q=b.getBoundingClientRect();return r.left>=q.left-1&&r.right<=q.right+1})()""")
    ok('Feedback: a snippet just saved is in view — the bar scrolls back to where it went (it stayed scrolled at Save)', shown is True, shown)
    chip = '#tsModal .sn-chip[data-t="Give slowly over 2 min"]'
    XS = '#tsModal .sn-x[data-snx="Give slowly over 2 min"]'
    nm = await pg.evaluate(f"(()=>{{const x=document.querySelector('{XS}');return x?x.getAttribute('aria-label'):null}})()")
    await pg.evaluate(CLEAR); await pg.locator(XS).click(); await pg.wait_for_timeout(500)
    gone = await pg.evaluate(f"!document.querySelector('{chip}')"); st = await pg.evaluate(TOASTS)
    await pg.evaluate("(()=>{const b=[...document.querySelectorAll('#toastWrap .ctoast button')].find(b=>/Undo/.test(b.innerText));b&&b.click()})()"); await pg.wait_for_timeout(500)
    back = await pg.evaluate(f"!!document.querySelector('{chip}')")
    ok('Feedback: removing a shared snippet says it’s removed for everyone, with Undo, and Undo brings it back (it never removed anything)',
       gone and any('removed for everyone' in x and 'Undo' in x for x in st) and back, [gone, st, back])
    ok('Feedback: the snippet’s × is named for it (“Remove snippet Give slowly over 2 min”, it was just “Remove”)', nm == 'Remove snippet Give slowly over 2 min', nm)
    xb = await pg.evaluate(f"(()=>{{const x=document.querySelector('#tsModal .sn-x[data-snx=\"Give slowly over 2 min\"]');return x?[x.tagName,!!x.closest('.sn-chip'),x.tabIndex]:null}})()")
    ok('Feedback: the × is a button of its own, reachable by keyboard (it sat inside the chip and showed only on hover)', xb == ['BUTTON', False, 0], xb)
    await pg.evaluate("(()=>{try{closeModal(true)}catch(e){}try{closeModal()}catch(e){}})()"); await until(pg, "!document.querySelector('#tsModal.show')", 2000); await pg.wait_for_timeout(300)

    # ── Live-viewing 5. Today brings the sheet back to now ──
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(500)
    await pg.evaluate("tsZoom(1)"); await pg.wait_for_timeout(300); await pg.evaluate("tsZoom(1)"); await pg.wait_for_timeout(400)   # so the day doesn't fit
    NOWIN = "(()=>{const s=document.getElementById('sheetScroll');const lw=typeof GRID_LW!=='undefined'?GRID_LW:328,hw=typeof GRID_HW!=='undefined'?GRID_HW:54;const x=lw+nowMin()/60*hw-s.scrollLeft;return s.scrollLeft>0&&x>=lw&&x<=s.clientWidth-hw/2})()"
    await pg.evaluate("document.getElementById('sheetScroll').scrollLeft=0"); await pg.wait_for_timeout(300)
    away = await pg.evaluate(NOWIN)
    t0 = await pg.evaluate("(()=>{const b=document.querySelector('.ts-daynav .dn-mid');return b?b.title:null})()")
    await pg.evaluate("(()=>{window.__said=[];const f=window.pvxSay;window.pvxSay=function(m){window.__said.push(String(m));return f&&f.apply(this,arguments)}})()")
    await pg.evaluate("document.querySelector('.ts-daynav .dn-mid').click()")
    back = await until(pg, NOWIN, 2000)
    said = ' | '.join(await pg.evaluate("window.__said"))
    ok('Live: on today, Today (“Go to now”) brings the sheet back to the current hour and says “Now, …” (it did nothing)', away is False and t0 == 'Go to now' and back and said.startswith('Now, '), [away, t0, back, said])
    await pg.evaluate("tsZoom(0)")
    ok('no page errors (sheet checks)', not e, e[:2]); await ctx.close()

    # ── Going full screen, Live-viewing 4. the inpatients display ──
    ctx, pg, e = await ts232(vp=(1920, 1080), view='dash')
    await pg.evaluate("tsTvOpen('All')"); await until(pg, "!!document.querySelector('#tsTv .tv-card')", 4000)
    P = "(()=>{const p=document.querySelector('#tsTv .tv-pager');return p?[p.getAttribute('role'),p.getAttribute('aria-label'),[...p.querySelectorAll('i')].findIndex(i=>i.classList.contains('on'))]:null})()"
    p1 = await pg.evaluate(P)
    await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(400); p2 = await pg.evaluate(P); s2 = await pg.evaluate(SAID)
    await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(400); p3 = await pg.evaluate(P)
    ok('Full screen: the inpatients display turns pages with ← → (it only turned by itself every 20 s), and says “Page 2 of 2”',
       p1 and p1[2] == 0 and p2 and p2[2] == 1 and p3[2] == 0 and 'Page 2 of 2' in s2, [p1, p2, p3, s2])
    ok('Full screen: the page dots say which page this is to VoiceOver (“Page 1 of 2”; they were unnamed)', p1 and p1[0] == 'img' and p1[1] == 'Page 1 of 2', p1)
    src = open(os.path.join(SITE, 'treatment', 'store.js'), encoding='utf-8').read()
    ok('Full screen: while the display is hidden its pages wait, and a page turned by hand holds for a full turn (read from the code: the 20 s turn needs 20 s to see)',
       'jr.t=setInterval(function(){if(document.hidden)return;if(jr.hold)return void(jr.hold=0);' in src, '')
    ok('no page errors (display)', not e, e[:2]); await ctx.close()
