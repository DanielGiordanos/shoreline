"""Anesia — the n445 build's own checks (Nov 27 2026): HIG Split views, Activity views (Tab views doesn't apply).
Totals and history, the record's hideable pane, had no keyboard shortcut (only its toolbar button and the More menu);
the Share button copied a link when there was no share sheet, but VoiceOver still heard "Share link"."""
from core import *
from helpers import *

PANE = "[document.querySelector('#anInsp').getAttribute('aria-pressed'),!!document.querySelector('#anInspector')&&!!document.querySelector('#anInspector').offsetParent,document.activeElement.id]"


@section(id='a445', title='n445 · Anesia · Split views, Activity views: ⌥T shows and hides Totals and history (in its tooltip and the shortcut list), and the Share button’s spoken name says it copies when it does',
         apps=['anesia'], topics=['split-views', 'sharing'], engines=('chromium', 'webkit'))
async def s_a445(br):
    errs = []
    ctx, pg, e = await new_page(br, vp=(1440, 900))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    btn = await pg.evaluate("[document.querySelector('#anInsp').getAttribute('aria-keyshortcuts'),document.querySelector('#anInsp').title]")
    p0 = await pg.evaluate(PANE)
    await pg.keyboard.press('Alt+KeyT'); await pg.wait_for_timeout(700); p1 = await pg.evaluate(PANE)
    await pg.keyboard.press('Alt+KeyT'); await pg.wait_for_timeout(700); p2 = await pg.evaluate(PANE)
    ok('Split views · on a Mac (1440 pt) ⌥T shows Totals and history (under the chart, with focus on its heading) and hides it again; the button says so (aria-keyshortcuts Alt+T, “… (⌥T)” in its tooltip)',
       btn[0] == 'Alt+T' and btn[1].endswith('T)') and p0[:2] == ['false', False] and p1 == ['true', True, 'anTotH'] and p2[:2] == ['false', False], [btn, p0, p1, p2])
    await pg.click('#anPatient'); await pg.wait_for_selector('#anSheet'); await pg.wait_for_timeout(500)
    await pg.keyboard.press('Alt+KeyT'); await pg.wait_for_timeout(400)
    sh = await pg.evaluate("[!!document.querySelector('#anSheet'),document.querySelector('#anInsp').getAttribute('aria-pressed')]")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    ok('…⌥T does nothing while a sheet is open (the sheet stays, the pane stays hidden)', sh == [True, 'false'], sh)
    await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(500)
    ks = await pg.evaluate("(()=>{const x=document.querySelector('.pvx-ks');if(!x)return null;const out=[];x.querySelectorAll('h3').forEach(h=>{const dl=h.nextElementSibling;out.push([h.textContent,dl?[...dl.querySelectorAll('dt')].map(d=>d.textContent.trim()):[]])});return out})()")
    view = [g for g in (ks or []) if g[0] == 'View']
    ok('…the shortcut list’s View group has “Show or hide totals and history”', bool(view) and 'Show or hide totals and history' in view[0][1], ks)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(1728, 1000))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    w0 = await pg.evaluate(PANE)
    await pg.keyboard.press('Alt+KeyT'); await pg.wait_for_timeout(600); w1 = await pg.evaluate(PANE)
    await pg.keyboard.press('Alt+KeyT'); await pg.wait_for_timeout(600); w2 = await pg.evaluate(PANE)
    ok('…on a wide Mac (1728 pt), where the pane sits beside the chart, ⌥T hides it and brings it back', w0[:2] == ['true', True] and w1[:2] == ['false', False] and w2[:2] == ['true', True], [w0, w1, w2])
    copy = await pg.evaluate("[document.querySelector('#anShare').getAttribute('aria-label'),document.querySelector('#anShare').title,!!navigator.share]")
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, vp=(1440, 900))
    await pg.add_init_script("Navigator.prototype.share=function(){return Promise.resolve()}")
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    share = await pg.evaluate("[document.querySelector('#anShare').getAttribute('aria-label'),document.querySelector('#anShare').title]")
    ok('Activity views · without a share sheet the Share button copies, and VoiceOver hears “Copy link to this record”; with one, “Share link to this record”',
       not copy[2] and copy[0] == 'Copy link to this record' and copy[1].startswith('Copy') and share[0] == 'Share link to this record' and share[1].startswith('Share'), [copy, share])
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
