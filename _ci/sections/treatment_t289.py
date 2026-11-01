"""Treatment Sheets — the n289 build's own checks: HIG Color wells, Combo boxes and Digit entry views.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

F = "(id=>{const e=document.getElementById(id);if(!e)return null;return [e.tagName,e.value,[...(e.options||[])].map(o=>o.textContent),Math.round(e.getBoundingClientRect().width)]})"


@section(id='t289', title='n289 · Treatment Sheets against HIG Color wells, Combo boxes and Digit entry views',
         apps=['treatment'], topics=['entering-data', 'menus'], engines=('chromium', 'webkit'))
async def s_t289(br):
    ctx, pg, e = await ts(br, PORT, view='vitals')
    f = await pg.evaluate(F + "('vin-d5')")
    ok('Vitals: Mucous membrane is a pop-up of its values, “Choose…” until one is chosen (it was a 74 pt text field that said “Select”)',
       f and f[0] == 'SELECT' and f[1] == '' and f[2] == ['Choose…', 'Pink', 'Pale Pink', 'Pale', 'White', 'Injected', 'Cyanotic'] and f[3] >= 110, f)
    await pg.select_option('#vin-d5', 'Pale Pink'); await pg.wait_for_timeout(200)
    await pg.evaluate("tsVFilter('')"); await pg.wait_for_timeout(600)
    kept = await pg.evaluate(F + "('vin-d5')")
    ok('…a choice not yet recorded survives Vitals redrawing (someone else charting)', kept and kept[0] == 'SELECT' and kept[1] == 'Pale Pink', kept)
    await pg.focus('#vin-d5'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1200)
    rec = await pg.evaluate("[(document.getElementById('vin-d5')||{}).value,(document.getElementById('vxn4')||{textContent:''}).textContent]")
    await pg.evaluate("tsVFilter('')"); await pg.wait_for_timeout(600)
    after = await pg.evaluate(F + "('vin-d5')")
    ok('…Return records it (“Pale Pink”), the pop-up goes back to “Choose…”, and a redraw doesn’t bring the old choice back',
       rec[0] == '' and 'Pale Pink' in rec[1] and after and after[1] == '', [rec, after])
    others = await pg.evaluate("[...document.querySelectorAll('.v-input .v-in')].filter(x=>x.getClientRects().length).map(x=>x.tagName+':'+(x.getAttribute('aria-label')||'').split(' value')[0])")
    ok('…every reading with a fixed set of values is a pop-up; numbers stay text fields',
       all(x.startswith('SELECT') for x in others if any(k in x for k in ('CRT', 'Mucous', 'Mentation', 'Pain', 'Food', 'Water'))) and any(x.startswith('INPUT:Temperature') or x.startswith('INPUT:Heart') for x in others) and not await pg.evaluate("document.querySelectorAll('.v-input input[list]').length"), others)
    ok('no page errors (Vitals)', not e, e[:2])
    await ctx.close()

    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("tsOpenFluidOrder()"); await pg.wait_for_timeout(700)
    fl = await pg.evaluate("(()=>{const i=document.getElementById('flName');return i?[i.tagName,!!i.getAttribute('list'),i.value]:null})()")
    ok('IV fluids’ Fluid stays a combo box: a list you can also type your own into, starting on Lactated Ringer’s (LRS)', fl == ['INPUT', True, 'Lactated Ringer’s (LRS)'], fl)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    hrs = await pg.evaluate("[...new Set((TASKS||[]).filter(t=>!t.status&&t.order&&/Mentation|Mucous|CRT|Pain/i.test(t.order.name)).map(t=>Math.floor(t.sched/60)))].sort((a,b)=>a-b)")
    bt = None
    for h in hrs[:4]:
        await pg.evaluate(f"tsBatch({h})"); await pg.wait_for_timeout(900)
        bt = await pg.evaluate("[...document.querySelectorAll('.bt-val')].filter(x=>x.getClientRects().length).map(x=>[x.tagName,(x.getAttribute('aria-label')||'').split(',')[0],x.options?x.options.length:0])")
        if bt and any(x[0] == 'SELECT' or 'Mentation' in x[1] or 'Mucous' in x[1] for x in bt): break
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ch = [x for x in (bt or []) if any(k in x[1] for k in ('Mentation', 'Mucous', 'CRT', 'Pain'))]
    ok('Chart several: the same readings are pop-ups there too', ch and all(x[0] == 'SELECT' and x[2] > 2 for x in ch), [hrs[:4], bt])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    tid = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Mentation/i.test(t.order.name));return t?t.id:null})()")
    if tid:
        await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(900)
    dr = await pg.evaluate("(()=>{const i=document.getElementById('cd-value');return i?[i.placeholder,[...document.querySelectorAll('.cd-opts .cd-opt')].map(b=>b.textContent)]:null})()")
    ok('The sheet’s charting drawer says what its field takes: “Choose below, or type one”, with Mentation’s values as buttons (it said “Choose or type”)',
       dr and dr[0] == 'Choose below, or type one' and dr[1][:2] == ['BAR', 'QAR'], [tid, dr])
    ok('no page errors (sheet)', not e, e[:2])
    await ctx.close()
