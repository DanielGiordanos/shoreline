"""Treatment Sheets — the n265 build's own checks: Treatment Sheets against HIG Playing audio, Printing, Ratings and
reviews, Searching. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
from tsh import *
from core import ok, section, until, PORT

# headings are shown in capitals (CSS), so their words are compared without case
FIND = "(()=>{const f=document.getElementById('tsFind');return f&&f.classList.contains('show')?f.innerText.replace(/\\n+/g,' / '):null})()"
PAPER = "(()=>{const p=document.getElementById('tsDtPrint');return [document.documentElement.classList.contains('dt-printing'),document.title,p?(p.querySelector('.dp-band')||{}).textContent:'',p?[...p.querySelectorAll('h4')].map(h=>h.textContent):[],p?p.querySelectorAll('tbody tr').length:0,p?[...p.querySelectorAll('thead th')].slice(0,5).map(t=>t.textContent):[]]})()"
OTHER = '{"uid":"u9","email":"relief.tech@vca.com","displayName":"Relief Tech"}'   # not on any training patient's care team


@section(id='t265', title='n265 · Treatment Sheets against HIG Playing audio, Printing, Ratings and reviews, Searching',
         apps=['treatment'], topics=['search', 'printing'], engines=('chromium', 'webkit'))
async def s_t265(br):
    # ── Searching 1. a typo still finds it ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("tsOpenSheet('sh_train2')"); await until(pg, "/Mochi/.test((document.querySelector('.pt-tab.cur')||{}).textContent||'')", 6000)
    res = {}
    for q in ['Biscut', 'gabapentn', 'Mochie', 'zzzz', 'Bis']:
        await pg.keyboard.press('Control+k'); await pg.keyboard.press('Control+a'); await pg.keyboard.type(q); await pg.wait_for_timeout(500)
        res[q] = await pg.evaluate(FIND)
    ok('Searching: a typo finds it under “Close matches” — “Biscut” → Biscuit Training, “gabapentn” → Gabapentin, “Mochie” → Mochi Training (they found nothing)',
       all(res[q] and 'close matches' in res[q].lower() and ('Nothing matches “%s” exactly.' % q) in res[q] for q in ['Biscut', 'gabapentn', 'Mochie'])
       and 'Biscuit Training' in res['Biscut'] and 'Gabapentin' in res['gabapentn'] and 'Mochi Training' in res['Mochie'], res)
    ok('…an exact match is still shown as before, and nothing close still says “No patient or order matches”',
       res['Bis'] and 'close matches' not in res['Bis'].lower() and 'Biscuit Training' in res['Bis'] and res['zzzz'] and 'No patient or order matches “zzzz”.' in res['zzzz'], [res['Bis'], res['zzzz']])
    await pg.keyboard.press('Control+a'); await pg.keyboard.type('Biscut'); await pg.wait_for_timeout(500)
    await pg.keyboard.press('Enter'); await until(pg, "/Biscuit/.test((document.querySelector('.pt-tab.cur')||{}).textContent||'')", 4000)
    ok('…and a close match opens only when chosen (Return opens Biscuit Training)', 'Biscuit' in await pg.evaluate("(document.querySelector('.pt-tab.cur')||{}).textContent||''"), '')
    ok('no page errors (search)', not e, e[:2]); await ctx.close()

    # ── 2. Recently opened can be cleared ──
    ctx, pg, e = await ts(br, PORT, view='sheet', user=OTHER, init="window.__said=[];")
    await pg.evaluate("window.pvxSay=function(t){window.__said.push(t)};tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(900)
    await pg.evaluate("tsOpenSheet('sh_train3')"); await pg.wait_for_timeout(900)
    await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(500); r0 = await pg.evaluate(FIND)
    await pg.click('#tsFind [data-clear-recent]'); await pg.wait_for_timeout(400)
    r1 = [await pg.evaluate(FIND), await pg.evaluate("(document.activeElement||{}).id"), await pg.evaluate("window.__said")]
    ok('Searching: Recently opened has Clear; it empties the list, keeps the search open and says “Recently opened cleared” (there was no way to clear it)',
       r0 and 'recently opened' in r0.lower() and 'Clear' in r0 and not (r1[0] and 'recently opened' in r1[0].lower()) and r1[1] == 'globalSearch' and 'Recently opened cleared' in r1[2], [r0, r1])
    ok('no page errors (recent)', not e, e[:2]); await ctx.close()

    # ── Printing 3. Tasks prints the task list ──
    ctx, pg, e = await ts(br, PORT, view='tasks')
    await until(pg, "!!document.querySelector('#ctab-tasks .wl-print')", 3000)
    n = await pg.evaluate("document.querySelectorAll('#ctab-tasks .wl-sec .wl-row').length")
    await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(400); p1 = await pg.evaluate(PAPER)
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))"); await pg.wait_for_timeout(300)
    ok('Printing: ⌘P on Tasks prints the task list — its sections, every task, blank Value and Initials columns (it printed the Status board)',
       p1[0] and p1[1].startswith('Treatment tasks – ') and ':' not in p1[1] and p1[2].startswith('TREATMENT · TASKS') and ('%d tasks' % n) in p1[2]
       and any(h.startswith('Overdue') for h in p1[3]) and p1[4] == n and p1[5] == ['Time', 'Patient', 'Task', 'Value', 'Initials'], [n, p1])
    await pg.click('#ctab-tasks .wl-chip:has-text("ICU")'); await pg.wait_for_timeout(500)
    n2 = await pg.evaluate("document.querySelectorAll('#ctab-tasks .wl-sec .wl-row').length")
    await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(400); p2 = await pg.evaluate(PAPER)
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))"); await pg.wait_for_timeout(300)
    ok('…it prints what the view shows: the ICU filter prints ICU’s tasks and says so', p2[0] and 'ICU' in p2[2] and p2[4] == n2, [n2, p2[2], p2[4]])
    pb = await pg.evaluate("(()=>{const b=document.querySelector('#ctab-tasks .wl-print');return b?[b.getAttribute('aria-label'),b.getAttribute('aria-disabled'),b.title]:null})()")
    await pg.evaluate("window.__p=0;window.print=function(){window.__p++};0"); await pg.click('#ctab-tasks .wl-print'); await pg.wait_for_timeout(400)
    ok('Printing: Tasks has a Print… button, as the board has, and it prints', pb and pb[0] == 'Print the task list…' and pb[1] is None and await pg.evaluate("window.__p") == 1, pb)
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))")
    ok('no page errors (printing)', not e, e[:2]); await ctx.close()

    # ── 4. Print… says which day ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    t0 = await pg.evaluate("tsPrintItem().replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim()")
    await pg.click('.ts-daynav .dn-prev'); await pg.wait_for_timeout(900)
    t1 = await pg.evaluate("tsPrintItem().replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim()")
    ok('Printing: on an earlier day Print… says that day (“This sheet, Thu, Oct 22”; it said “today”)', 'This sheet, today' in t0 and 'This sheet, Thu, Oct 22' in t1, [t0, t1])
    await ctx.close()
