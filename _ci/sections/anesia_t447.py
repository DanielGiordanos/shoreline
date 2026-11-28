"""Anesia — the n447 build's own checks (Nov 27 2026): HIG Menus, Home Screen quick actions (Edit menus: nothing to change).
The More menu's Totals and history toggled the pane without saying which it would do; the installed app's quick
actions had no icons, unlike Flow's, OR's and Rounds'."""
import json, os
from core import *
from helpers import *

MENU = "(()=>{const m=document.querySelector('.pvx-cx .pvx-cx-list');return m?[...m.children].filter(i=>i.getAttribute('role')!=='separator').map(i=>i.textContent.trim()):null})()"


@section(id='a447', title='n447 · Anesia · Menus, Home Screen quick actions: the More menu says Show or Hide totals and history, and the quick actions have the suite’s icons',
         apps=['anesia'], topics=['menus', 'quick-actions'], engines=('chromium', 'webkit'))
async def s_a447(br):
    errs = []
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    await pg.click('#anMore'); await pg.wait_for_timeout(400); m1 = await pg.evaluate(MENU)
    await pg.click('.pvx-cx .pvx-cx-list button:has-text("totals and history")'); await pg.wait_for_timeout(800)
    open1 = await pg.evaluate("[document.querySelector('#anInsp').getAttribute('aria-pressed'),!!document.querySelector('#anInspector')]")
    await pg.click('#anMore'); await pg.wait_for_timeout(400); m2 = await pg.evaluate(MENU)
    await pg.click('.pvx-cx .pvx-cx-list button:has-text("totals and history")'); await pg.wait_for_timeout(800)
    open2 = await pg.evaluate("document.querySelector('#anInsp').getAttribute('aria-pressed')")
    ok('Menus · the More menu’s toggled item says what it will do: “Show totals and history”, then, with the pane open, “Hide totals and history”',
       m1 and m1[-1] == 'Show totals and history' and open1 == ['true', True] and m2 and m2[-1] == 'Hide totals and history' and open2 == 'false', [m1, open1, m2, open2])
    errs += list(e)
    man = await pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
    srcs = [(s['name'], [i['src'] for i in s.get('icons', [])]) for s in man['shortcuts']]
    sizes = []
    for _, ic in srcs:
        for src in ic:
            sizes.append(await pg.evaluate("(src=>new Promise(res=>{const i=new Image();i.onload=()=>res([i.naturalWidth,i.naturalHeight]);i.onerror=()=>res(null);i.src=src}))('" + src + "')"))
    ok('Home Screen quick actions · New training record and All records each have a 96 pt icon, the suite’s plus and list (they had none)',
       srcs == [('New training record', ['/assets/img/sc-or-add.png']), ('All records', ['/assets/img/sc-flow-patients.png'])] and sizes == [[96, 96], [96, 96]], [srcs, sizes])
    await ctx.close()
    ok('no page errors', not errs, errs)
