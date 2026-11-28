"""Anesia — the n450 build's own checks (Nov 27 2026): HIG Search fields (Sidebars: none; Tab bars: the suite's).
The list's search named the other tabs' matches only when the open tab had none, and listed a date match
before the patient whose name was searched."""
from core import *
from helpers import *
from anesia_t440 import list_page

ST = """(()=>({cards:[...document.querySelectorAll('.an-card b')].map(b=>b.textContent),
also:document.querySelector('.an-also')?.innerText.replace(/\\s+/g,' ').trim()||null,
btn:[...document.querySelectorAll('.an-also [data-f2]')].map(b=>b.getAttribute('data-f2')),
st:[...document.querySelectorAll('.an-vh[role=status]')].map(e=>e.textContent).filter(Boolean),
tab:document.querySelector('[data-f][aria-checked=true]')?.getAttribute('data-f')}))()"""


async def find(pg, text):
    await pg.fill('#anFind', text); await pg.dispatch_event('#anFind', 'input'); await pg.wait_for_timeout(450)
    return await pg.evaluate(ST)


@section(id='a450', title='n450 · Anesia · Search fields: matches in the other tabs are named (“Also in To sign · 1”); the patient whose name was searched comes first',
         apps=['anesia'], topics=['search', 'list'], engines=('chromium', 'webkit'))
async def s_a450(br):
    ctx, pg, errs = await list_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
    await pg.click('[data-f=signed]'); await pg.wait_for_timeout(300)
    c = await find(pg, '14')
    ok('Search fields · the most relevant first: searching Signed for “14” lists Training dog 14 before Training cat 5, whose date is the 14th (the date sort put the cat first)',
       c['cards'] == ['Training dog 14', 'Training cat 5'], c)
    a = await find(pg, 'dog 13')
    ok('…searching Signed for “dog 13” shows what matches there and says “Also in To sign · 1” (Training dog 13 went unmentioned), and VoiceOver hears it',
       a['tab'] == 'signed' and len(a['cards']) >= 1 and a['also'] == 'Also in To sign · 1' and a['btn'] == ['ended'] and any(', 1 in To sign' in s for s in a['st']), a)
    await pg.click('.an-also [data-f2=ended]'); await pg.wait_for_timeout(500)
    b = await pg.evaluate(ST); fv = await pg.evaluate("[document.querySelector('#anFind')?.value, document.activeElement?.id]")
    ok('…the button opens To sign, still searching, with Training dog 13 first and focus back in the field',
       b['tab'] == 'ended' and b['cards'][:1] == ['Training dog 13'] and fv == ['dog 13', 'anFind'], [b, fv])
    d = await find(pg, 'zzzz')
    ok('…with no match anywhere there is no “Also in” line', d['also'] is None and not d['cards'], d)
    await pg.fill('#anFind', ''); await pg.dispatch_event('#anFind', 'input'); await pg.wait_for_timeout(400)
    e = await pg.evaluate(ST)
    ok('…and an empty field lists the tab as before, with no line', e['also'] is None and len(e['cards']) >= 2, e)
    await ctx.close()
    ok('no page errors', not errs, errs)
