"""Anesia — the n439 build's own checks (Nov 25 2026): HIG Playing haptics, Printing, Ratings and reviews.
A record printed from dark mode came out dark (dark cards, or pale ink with backgrounds off); the chart printed from where
it was scrolled, so its row names were cut off; the Expand button and "Show the latest 20" printed."""
from core import *
from helpers import *

ST = """(()=>{const ch=document.querySelector('.an-chart'), l=document.querySelector('.an-chart .an-lab'), v=e=>!!e&&getComputedStyle(e).display!=='none';
  const c=ch&&ch.getBoundingClientRect(), r=l&&l.getBoundingClientRect();
  return {dark:document.body.classList.contains('dark'), scroll:ch?Math.round(ch.scrollLeft):null, labIn:!!(c&&r&&r.left>=c.left-1&&r.width>20),
    exp:v(document.querySelector('#anExpand')), more:[...document.querySelectorAll('.an-side .an-btn')].filter(v).map(b=>b.innerText.trim()),
    bg:getComputedStyle(document.body).backgroundColor, ink:getComputedStyle(document.querySelector('.an-id h1')||document.body).color}})()"""


@section(id='a439', title='n439 · Anesia · Playing haptics, Printing, Ratings and reviews: paper is always light, the chart prints from its start with its row names, screen-only buttons stay off the paper',
         apps=['anesia'], topics=['printing'], engines=('chromium', 'webkit'))
async def s_a439(br):
    errs = []
    ctx, pg, e = await new_page(br)   # dark
    await pg.goto(URL + '#r=an_train2'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(900)
    pr = await pg.evaluate("[!!document.querySelector('#anPrint'), document.querySelector('#anPrint')?.getAttribute('aria-label')]")
    s0 = await pg.evaluate(ST)
    await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(500)
    await pg.emulate_media(media='print'); await pg.wait_for_timeout(300); s1 = await pg.evaluate(ST)
    await pg.emulate_media(media='screen'); await pg.evaluate("window.dispatchEvent(new Event('afterprint'))"); await pg.wait_for_timeout(600); s2 = await pg.evaluate(ST)
    ok('Printing · from dark mode the paper is light (it printed dark cards, or pale ink with backgrounds off)', s0['dark'] and not s1['dark'] and s1['ink'] in ('rgb(0, 0, 0)', 'rgb(20, 24, 31)') or (not s1['dark'] and s1['ink'] != s0['ink']), [s0['dark'], s1['dark'], s0['ink'], s1['ink']])
    ok('…the chart prints from its start, with its row names on the page (it printed from where it was scrolled, names cut off)', s0['scroll'] > 0 and s1['scroll'] == 0 and s1['labIn'], [s0['scroll'], s1['scroll'], s1['labIn']])
    ok('…Expand and the history’s “Show the latest 20” stay off the paper', not s1['exp'] and not s1['more'], [s1['exp'], s1['more']])
    ok('…after printing, dark mode and the chart’s place come back', s2['dark'] and s2['scroll'] == s0['scroll'], [s2['dark'], s2['scroll'], s0['scroll']])
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train2'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(900)
    await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(400); l1 = await pg.evaluate(ST)
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))"); await pg.wait_for_timeout(400); l2 = await pg.evaluate(ST)
    ok('…in light mode printing changes nothing about the appearance, before or after', not l1['dark'] and not l2['dark'], [l1['dark'], l2['dark']])
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    act = await pg.evaluate("!!document.querySelector('#anPrint')")
    errs += list(e); await ctx.close()
    ok('…Print is offered where there’s a finished record to print (ended or signed), not on one under anesthesia, as before', pr[0] and pr[1] == 'Print record' and not act, [pr, act])
    ok('no page errors', not errs, errs)
