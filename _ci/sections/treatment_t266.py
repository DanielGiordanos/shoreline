"""Treatment Sheets — the n266 build's own checks: Treatment Sheets against HIG Settings, Undo and redo, Charts, Image
views. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
from tsh import *
from core import ok, section, until, PORT

DONE = "document.querySelectorAll('#ctab-sheet .mark[data-s=completed]').length"
UR = "(()=>{const g=document.querySelector('#ctab-sheet .pvx-ur')||document.querySelector('.pvx-ur');if(!g)return null;const u=g.querySelector('.pvx-u'),r=g.querySelector('.pvx-r'),b=u.getBoundingClientRect();return [g.hidden,u.getAttribute('aria-label'),u.getAttribute('aria-disabled'),r.getAttribute('aria-label'),r.getAttribute('aria-disabled'),Math.round(b.width),Math.round(b.height),!!g.closest('.treatment-toolbar,.toolbar,[class*=toolbar]')]})()"
TOASTS = "[...document.querySelectorAll('#toastWrap .ctoast')].filter(e=>e.getClientRects().length).map(t=>t.innerText.replace(/\\n+/g,' ').trim())"


async def chart3(pg):
    await pg.evaluate("tsBatch(8)"); await pg.wait_for_timeout(800)
    await pg.click('#tsOrderSheet .op-card button:has-text("Complete")'); await pg.wait_for_timeout(1200)


@section(id='t266', title='n266 · Treatment Sheets against HIG Settings, Undo and redo, Charts, Image views',
         apps=['treatment'], topics=['undo', 'accessibility', 'charts'], engines=('chromium', 'webkit'))
async def s_t266(br):
    # ── Undo and redo 1. on iPad, Undo and Redo in the toolbar ──
    ctx, pg, e = await ts(br, PORT, vp=(1024, 1366), touch=True, view='sheet')
    u0 = await pg.evaluate(UR)
    await chart3(pg); n1 = await pg.evaluate(DONE)
    await pg.evaluate("document.querySelectorAll('#toastWrap .ctoast').forEach(t=>t.remove())"); await pg.wait_for_timeout(300)
    u1 = await pg.evaluate(UR)
    ok('Undo: on iPad, Undo appears in the sheet’s toolbar once there’s something to undo, named for it (“Undo 3 tasks charted · 8:00 AM”), 44 pt (there was no way back once the message had gone)',
       u0 is not None and u0[0] is True and n1 == 3 and u1 and u1[0] is False and u1[1] == 'Undo 3 tasks charted · 8:00 AM' and u1[2] is None and u1[4] == 'true' and u1[5] >= 44 and u1[6] >= 44 and u1[7], [u0, n1, u1])
    await pg.click('#ctab-sheet .pvx-ur .pvx-u'); await pg.wait_for_timeout(1200)
    n2 = await pg.evaluate(DONE); t2 = await pg.evaluate(TOASTS); u2 = await pg.evaluate(UR)
    ok('…choosing it undoes all three at once and says “Undone — 3 tasks charted · 8:00 AM”, with no keyboard shortcut in the message on a touch screen',
       n2 == 0 and any(t.startswith('Undone — 3 tasks charted · 8:00 AM') for t in t2) and not any('⌘' in t or 'Ctrl' in t for t in t2), [n2, t2])
    ok('…then Redo is named for it, and Undo is dimmed with nothing left', u2 and u2[3] == 'Redo 3 tasks charted · 8:00 AM' and u2[4] is None and u2[2] == 'true' and u2[1] == 'Nothing to undo', u2)
    await pg.click('#ctab-sheet .pvx-ur .pvx-r'); await pg.wait_for_timeout(1200)
    ok('…and Redo charts them again', await pg.evaluate(DONE) == 3, '')
    ok('no page errors (iPad)', not e, e[:2]); await ctx.close()
    ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, view='tasks')
    await until(pg, "!!document.querySelector('#ctab-tasks .pvx-ur')", 3000)
    ok('Undo: Tasks has the same Undo and Redo on iPhone', await pg.evaluate("!!document.querySelector('#ctab-tasks .wl-top .pvx-ur')"), '')
    await ctx.close()
    # with a mouse and keyboard nothing is added; ⌘Z / Ctrl+Z works as before
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await chart3(pg); await pg.mouse.click(5, 880); await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(1200)
    k = [await pg.evaluate("document.querySelectorAll('.pvx-ur').length"), await pg.evaluate(DONE), await pg.evaluate(TOASTS)]
    ok('…with a mouse and keyboard the toolbar is unchanged and Ctrl+Z / ⌘Z still undoes, offering its redo shortcut', k[0] == 0 and k[1] == 0 and any('to redo' in t for t in k[2]), k)
    await ctx.close()

    # ── Charts 2. times in words for VoiceOver ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.wait_for_timeout(400)
    lb = await pg.evaluate(r"""(()=>{const a=[...document.querySelectorAll('#ctab-sheet [aria-label]')].map(e=>e.getAttribute('aria-label'));const m=document.querySelector('#ctab-sheet .mark[data-s=overdue]');
      return {mark:m&&[m.getAttribute('aria-label'),m.title],short:a.filter(t=>/(^|[^\w.])\d+(\.\d+)?\s?(h|min|d)\b(?![\w\/])/.test(t)).slice(0,3),wt:a.filter(t=>/^Weight latest/.test(t)),q:a.filter(t=>/\bq\d+h\b/.test(t)).length}})()""")
    ok('Charts: VoiceOver hears “Overdue (11 hours late)” and “7 days ago”, never “11 h” or “7 d”; the tooltip keeps its short form',
       lb['mark'] and 'hours late)' in lb['mark'][0] and ' h late)' in lb['mark'][1] and not lb['short'] and lb['wt'] and 'days ago' in lb['wt'][0], lb)
    ok('no page errors (labels)', not e, e[:2]); await ctx.close()
