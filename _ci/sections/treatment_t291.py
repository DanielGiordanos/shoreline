"""Treatment Sheets — the n291 build's own checks: HIG Steppers, Text fields, Toggles and Virtual keyboards.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

Z = "(()=>{const z=document.querySelector('.ts-zoom');const b=[...z.querySelectorAll('button')];return [b[1].textContent.trim(),b[1].getAttribute('aria-label')]})()"
A = "((q,as)=>{const i=document.querySelector(q);return i?as.map(a=>i.getAttribute(a)):null})"


@section(id='t291', title='n291 · Treatment Sheets against HIG Steppers, Text fields, Toggles and Virtual keyboards',
         apps=['treatment'], topics=['entering-data'], engines=('chromium', 'webkit'))
async def s_t291(br):
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.wait_for_timeout(1700); z0 = await pg.evaluate(Z)
    await pg.click('.ts-zoom button:last-child'); await pg.wait_for_timeout(700); z1 = await pg.evaluate(Z)
    await pg.click('.ts-zoom button:nth-child(2)'); await pg.wait_for_timeout(1700); z2 = await pg.evaluate(Z)
    n = lambda z: int(z[0].split()[0]) if z and z[0].endswith(' h') else -1
    ok('Steppers: at the fitted zoom the sheet’s − / + shows how many hours are on screen, as it does zoomed in (it said “Fit”); the value fits the day again',
       n(z0) > 0 and z0[1] == 'Showing %d hours' % n(z0) and 0 < n(z1) < n(z0) and n(z2) == n(z0), [z0, z1, z2])
    await pg.click('#tsSearch'); await pg.keyboard.type('mar'); await pg.wait_for_timeout(400)
    x = await pg.evaluate("(()=>{const b=document.querySelector('.qadd .pvx-sf-x');return b?[b.hidden,b.getAttribute('aria-label')]:null})()")
    await pg.click('.qadd .pvx-sf-x'); await pg.wait_for_timeout(300)
    after = await pg.evaluate("[document.getElementById('tsSearch').value,document.activeElement.id,document.querySelector('.qadd .pvx-sf-x').hidden]")
    ok('Text fields: “Add treatment or template” has a Clear button once something is typed; it empties the field and keeps the cursor there',
       x == [False, 'Clear'] and after == ['', 'tsSearch', True], [x, after])
    s = await pg.evaluate(A + "('#tsSearch',['autocorrect','autocapitalize','spellcheck','enterkeyhint'])")
    ok('Keyboards: the drug and order search has no autocorrect or auto-capital, and Return reads Search', s == ['off', 'off', 'false', 'search'], s)
    tid = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Temperature/i.test(t.order.name));return t?t.id:null})()")
    await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(900)
    cd = await pg.evaluate(A + "('#cd-value',['inputmode','enterkeyhint'])")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    hrs = await pg.evaluate("[...new Set((TASKS||[]).filter(t=>!t.status&&t.order&&!t.order.cont).map(t=>Math.floor(t.sched/60)))].sort((a,b)=>a-b)")
    bt = None
    for h in hrs[:6]:
        await pg.evaluate(f"tsBatch({h})"); await pg.wait_for_timeout(900)
        bt = await pg.evaluate("[...document.querySelectorAll('#tsOrderSheet input.bt-val')].filter(i=>i.getClientRects().length).map(i=>i.getAttribute('enterkeyhint'))")
        if bt and len(bt) >= 2: break
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('…the charting drawer’s reading says Done on Return (it records, on the decimal pad); Chart several says Next, and Done on its last field',
       cd == ['decimal', 'done'] and bt and len(bt) >= 2 and all(v == 'next' for v in bt[:-1]) and bt[-1] == 'done', [cd, bt])
    ok('no page errors (sheet)', not e, e[:2])
    await ctx.close()

    ctx, pg, e = await ts(br, PORT, view='vitals')
    v = await pg.evaluate("[...document.querySelectorAll('.v-input input')].filter(i=>i.getClientRects().length).map(i=>i.getAttribute('enterkeyhint'))")
    ok('…Vitals’ values and notes say Done on Return (Return records them)', v and all(x == 'done' for x in v), v)
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(700); await pg.evaluate("tsNewSheet()"); await pg.wait_for_timeout(800)
    nm = await pg.evaluate("[" + ",".join(A + f"('{q}',['autocapitalize','autocorrect'])" for q in ('#nsName', '#nsLast', '#nsDoc', '#nsBreed')) + "]")
    ok('…patient, owner and doctor names and Breed start each word with a capital and aren’t autocorrected', all(x == ['words', 'off'] for x in nm), nm)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    if await pg.evaluate("!!document.querySelector('.pvx-discard')"):
        await pg.click('.pvx-discard [data-discard]'); await pg.wait_for_timeout(300)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(600); await pg.evaluate("openEstimate()"); await pg.wait_for_timeout(800)
    es = [await pg.evaluate(A + "('#esIni',['autocapitalize','autocorrect'])"), await pg.evaluate(A + "('#epLo',['inputmode'])")]
    ok('…client initials are capitals without autocorrect, and the stay in days gets the number pad', es[0] == ['characters', 'off'] and (es[1] is None or es[1] == ['numeric']), es)
    ok('no page errors (forms)', not e, e[:2])
    await ctx.close()
