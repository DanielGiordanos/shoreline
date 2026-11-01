"""Treatment Sheets — the n286 build's own checks: HIG Tab bars, Token fields and Action sheets.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

PROBS = "[...document.querySelectorAll('.pl-row')].map(r=>(r.querySelector('.pl-t')||r).textContent.trim())"
MENU = "(()=>{const m=[...document.querySelectorAll('.ts-pl-menu')].filter(x=>x.getClientRects().length).pop();return m?[m.getAttribute('role'),m.getAttribute('aria-label'),[...m.querySelectorAll('[data-a]')].map(b=>[b.textContent,b.getAttribute('role'),b.className])]:null})()"


@section(id='t286', title='n286 · Treatment Sheets against HIG Tab bars, Token fields and Action sheets',
         apps=['treatment'], topics=['menus', 'entering-data', 'modality'], engines=('chromium', 'webkit'))
async def s_t286(br):
    # 1. problems: ; adds; a trailing , or ; is dropped
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.click('.pl-add input'); await pg.keyboard.type('Vomiting;'); await pg.wait_for_timeout(500)
    a1 = await pg.evaluate(PROBS); v1 = await pg.evaluate("document.querySelector('.pl-add input').value")
    await pg.fill('.pl-add input', 'Diarrhea,'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
    await pg.fill('.pl-add input', 'Lethargy ;'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
    a2 = await pg.evaluate(PROBS)
    ok('Problem list: typing ; adds the problem, as Return does, and a trailing , or ; is dropped (“Diarrhea;” kept it)',
       a1 == ['Vomiting'] and v1 == '' and a2 == ['Vomiting', 'Diarrhea', 'Lethargy'], [a1, v1, a2])

    # 2. a problem's context menu
    await pg.locator('.pl-row').nth(1).locator('.pl-txt').click(button='right'); await pg.wait_for_timeout(400)
    m = await pg.evaluate(MENU)
    ok('Right-clicking a problem opens its menu: Edit, Mark resolved, Move up, Move down, then Remove in red, last (it had none)',
       m and m[0] == 'menu' and m[1] == 'Diarrhea' and [x[0] for x in m[2]] == ['Edit', 'Mark resolved', 'Move up', 'Move down', 'Remove'] and 'danger' in m[2][4][2], m)
    await pg.locator('.ts-pl-menu [data-a="up"]').click(); await pg.wait_for_timeout(600)
    a3 = await pg.evaluate(PROBS)
    await pg.locator('.pl-row').first.locator('.pl-txt').click(button='right'); await pg.wait_for_timeout(400)
    m2 = await pg.evaluate(MENU)
    ok('…Move up moves it (Diarrhea first), and the first problem’s menu leaves out Move up',
       a3 == ['Diarrhea', 'Vomiting', 'Lethargy'] and m2 and 'Move up' not in [x[0] for x in m2[2]] and 'Move down' in [x[0] for x in m2[2]], [a3, m2])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    gone = await pg.evaluate("!document.querySelector('.ts-pl-menu')")
    await pg.locator('.pl-row').first.locator('.pl-grip').focus(); await pg.keyboard.press('Shift+F10'); await pg.wait_for_timeout(400)
    f = await pg.evaluate("[document.activeElement&&document.activeElement.closest('.ts-pl-menu')?document.activeElement.textContent:null]")
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(600)
    a4 = await pg.evaluate(PROBS)
    ok('…Esc closes it; ⇧F10 on the grip opens it with the first item focused, and the arrow keys and Return choose (Move down)',
       gone and f[0] == 'Edit' and a4 == ['Vomiting', 'Diarrhea', 'Lethargy'], [gone, f, a4])
    await pg.locator('.pl-row').nth(2).locator('.pl-txt').click(button='right'); await pg.wait_for_timeout(300)
    await pg.locator('.ts-pl-menu [data-a="edit"]').click(); await pg.wait_for_timeout(300)
    ed = await pg.evaluate("[document.activeElement.className, document.activeElement.value]")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('…Edit opens the problem for editing, as clicking its name does', ed == ['pl-edit', 'Lethargy'], ed)
    ok('no page errors', not e, e[:2])
    await ctx.close()

    # 3. iPhone: confirming steps stack, destructive first
    ctx, pg, e = await ts(br, PORT, view='sheet', vp=(390, 844), touch=True)
    await pg.evaluate("(()=>{const r=[...document.querySelectorAll('#sheetInner .rl')].find(x=>/Methadone/.test(x.innerText));(r.querySelector('.rl-name')||r).click()})()"); await pg.wait_for_timeout(800)
    await pg.evaluate("(()=>{const b=[...document.querySelectorAll('#tsOrderSheet button')].find(b=>b.textContent.trim()==='Discontinue');b&&b.click()})()"); await pg.wait_for_timeout(800)
    dc = await pg.evaluate("(()=>{const a=[...document.querySelectorAll('#tsOrderSheet .op-actions')].filter(x=>x.getClientRects().length&&x.querySelector('.danger.solid')).pop();return a?[...a.children].map(b=>{const r=b.getBoundingClientRect();return [b.textContent.trim(),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}):null})()")
    ok('iPhone: Discontinue stacks its buttons full width — Discontinue Methadone first, Back below (they sat side by side)',
       dc and dc[0][0].startswith('Back') and dc[1][0].startswith('Discontinue') and dc[1][1] < dc[0][1] and min(x[2] for x in dc) > 300 and min(x[3] for x in dc) >= 46, dc)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', vp=(390, 844), touch=True)
    await pg.click('#tsSearch'); await pg.keyboard.type('maropitant'); await pg.wait_for_timeout(500); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(900)
    await pg.evaluate("(()=>{const i=document.getElementById('rxDose');i.value='1';i.dispatchEvent(new Event('input',{bubbles:true}))})()"); await pg.wait_for_timeout(300)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    dp = await pg.evaluate("(()=>{const d=document.querySelector('.pvx-discard');return d?[...d.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return [b.textContent,Math.round(r.top),Math.round(r.width),Math.round(r.height)]}):null})()")
    ok('iPhone: “Discard this order?” stacks Discard (red) above Keep editing, full width and 48 pt tall (Discard wrapped under Keep editing)',
       dp and dp[0][0] == 'Keep editing' and dp[1][0] == 'Discard' and dp[1][1] < dp[0][1] and min(x[2] for x in dp) > 280 and min(x[3] for x in dp) >= 46, dp)
    ok('no page errors (iPhone)', not e, e[:2])
    await ctx.close()
