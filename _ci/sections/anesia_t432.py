"""Anesia — the n432 build's own checks (Nov 24 2026): HIG Motion, Privacy, SF Symbols.
Opening a record, it came in row by row (the last vitals tile fully shown after about 1 s) and the page held taps for about
0.6 s while the card grew into the record; six fields offered what had been typed before on a shared computer."""
from core import *
from helpers import *

HOOK = """(()=>{ const o=document.startViewTransition&&document.startViewTransition.bind(document); if(!o) return;
  document.startViewTransition=function(f){ const v=o(f); window.__vt=window.__vt||[];
    v.ready.then(()=>{ const a=document.getAnimations().filter(x=>x.effect&&x.effect.pseudoElement&&/view-transition/.test(x.effect.pseudoElement));
      window.__vt.push(Math.max(0,...a.map(x=>{const t=x.effect.getTiming(); return (t.delay||0)+(+t.duration||0)}))); },()=>{}); return v; }; })()"""
ENTER = """(()=>{ const els=[...document.querySelectorAll('.an-rhead>*, .an-sum, .an-chartp, .an-nowcol, .an-chart .an-row, .an-tile, .an-tools')];
  const a=els.flatMap(e=>e.getAnimations()).filter(x=>/anEnter|anFadeIn/.test(x.animationName||''));
  return {n:a.length, end:Math.max(0,...a.map(x=>{const t=x.effect.getTiming(); return (t.delay||0)+(+t.duration||0)})), names:[...new Set(a.map(x=>x.animationName))]}; })()"""
FIELDS = """(()=>[...document.querySelectorAll('.an-scrim input, .an-scrim textarea')].filter(i=>!['hidden','checkbox','radio'].includes(i.type)).map(i=>[(i.id||i.name), i.getAttribute('autocomplete')]))()"""


async def open_record(pg):
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(500)
    await pg.evaluate("[...document.querySelectorAll('[data-open]')].find(x=>/Training dog 4/.test(x.textContent)).click()")
    await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(80)
    return await pg.evaluate(ENTER)


@section(id='a432', title='n432 · Anesia · Motion, Privacy, SF Symbols: a record opens in a quarter of a second and can be tapped sooner; no field offers what was typed before on a shared computer',
         apps=['anesia'], topics=['motion', 'privacy'], engines=('chromium', 'webkit'))
async def s_a432(br):
    errs = []
    ctx, pg, e = await new_page(br); await pg.add_init_script(HOOK)
    en = await open_record(pg); await pg.wait_for_timeout(900)
    vt = await pg.evaluate("window.__vt||[]")
    ok('Motion · opening a record, everything settles in at once, within 0.25 s (it came in row by row: the last vitals tile was invisible for 0.42 s and fully shown at 0.92 s)',
       en['n'] >= 10 and en['end'] <= 260, en)
    ok('…and the card grows into the record in 0.28 s (0.44 s), so the page, which can’t be tapped while it grows, is ready sooner',
       all(d <= 300 for d in vt), vt)
    errs += list(e); await ctx.close()
    ctx, pg, e = await new_page(br); await pg.emulate_media(reduced_motion='reduce')
    en = await open_record(pg)
    ok('…with Reduce Motion the record only fades in (no movement), in 0.15 s at most', set(en['names']) <= {'anFadeIn'} and en['end'] <= 160, en)
    errs += list(e); await ctx.close()
    # Privacy: every field in the sheets
    ctx, pg, e = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    F = {}
    await pg.click('#anNew'); await pg.wait_for_timeout(600); F['New training record'] = await pg.evaluate(FIELDS); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    await pg.click('#anPatient'); await pg.wait_for_timeout(600); F['Patient'] = await pg.evaluate(FIELDS); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    for act in ('vitals', 'event', 'dose', 'infusion', 'gas', 'output', 'airway'):
        btn = pg.locator(f'.an-tools [data-act={act}]')
        if not await btn.count() or not await btn.first.is_visible(): continue
        await btn.first.click(); await pg.wait_for_timeout(600); F[act] = await pg.evaluate(FIELDS)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
        if await pg.locator('[data-drop]:visible').count(): await pg.click('[data-drop]:visible'); await pg.wait_for_timeout(300)
    bad = {k: [f for f in v if f[1] != 'off'] for k, v in F.items() if any(f[1] != 'off' for f in v)}
    ok('Privacy · no field in Anesia’s sheets offers what was typed before on this computer (breed, age, procedure, resident, supervisor and the event note did); every one says autocomplete=off',
       not bad and sum(len(v) for v in F.values()) >= 15 and len(F) >= 6, bad or {k: len(v) for k, v in F.items()})
    ok('…and the tab’s title never names the patient, and the address carries only the record’s id',
       await pg.evaluate("document.title") in ('Anesia · Pravix', 'Anesthesia record') and  # n449: the record's own title, still without the patient
       await pg.evaluate("/^#r=[A-Za-z0-9_-]+$/.test(location.hash)"))
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
