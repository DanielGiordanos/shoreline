"""Treatment Sheets — the n267 build's own checks: Treatment Sheets against HIG Text views, Web views, Boxes,
Collections. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
from tsh import *
from core import ok, section, until, PORT

# someone else charts heart rate on the same patient while Vitals is open
REMOTE = """(async()=>{await firebase.firestore().collection('sheets').doc('sh_train1').update({'marks.20261023_d2_240':{status:'completed',value:'120',min:242,sched:240,orderId:'d2',by:'TB'}});return 1})()"""
ACT = "(()=>{const a=document.activeElement;let s=null;try{s=a.selectionStart}catch(e){}return [a.id||a.tagName,a.value,s]})()"


@section(id='t267', title='n267 · Treatment Sheets against HIG Text views, Web views, Boxes, Collections',
         apps=['treatment'], topics=['collaboration', 'entering-data', 'layout'], engines=('chromium', 'webkit'))
async def s_t267(br):
    # ── Collections 1. typing in Vitals survives someone else's change ──
    ctx, pg, e = await ts(br, PORT, view='vitals')
    await pg.click('#ctab-vitals #vin-d1'); await pg.keyboard.type('101.4'); await pg.keyboard.press('ArrowLeft')
    b = await pg.evaluate(ACT)
    rows0 = await pg.evaluate("document.querySelector('#ctab-vitals #vRows')?document.querySelector('#ctab-vitals #vRows').innerText.length:0")
    await pg.evaluate(REMOTE); await pg.wait_for_timeout(1300)
    a = await pg.evaluate(ACT)
    redrawn = await pg.evaluate("/120/.test((document.querySelector('#ctab-vitals')||{innerText:''}).innerText)")
    ok('Collections: a value half-typed in Vitals stays — text and cursor — when someone else charts on the patient and the list redraws (it was wiped)',
       b == ['vin-d1', '101.4', 4] and a == ['vin-d1', '101.4', 4] and redrawn, [b, a, redrawn])
    await pg.keyboard.type('5'); await pg.wait_for_timeout(100)
    ok('…and typing carries on where it was', await pg.evaluate("document.getElementById('vin-d1').value") == '101.54', '')
    ok('no page errors (Vitals)', not e, e[:2]); await ctx.close()

    # ── Boxes 2. one level deep in Charges ──
    ctx, pg, e = await ts(br, PORT, view='charges')
    await until(pg, "!!document.querySelector('#ctab-charges .ch-lvnow')", 4000)
    bx = await pg.evaluate("(()=>{const n=document.querySelector('#ctab-charges .ch-lvnow');const c=getComputedStyle(n);return [c.backgroundColor,c.backgroundImage,c.borderTopStyle,parseFloat(c.borderTopWidth),c.borderTopLeftRadius,n.innerText.replace(/\\s+/g,' ').slice(0,40)]})()")
    ok('Boxes: the hospitalization level’s summary is a plain line under the choice, not a filled box inside the level card', bx[0] in ('rgba(0, 0, 0, 0)', 'transparent') and bx[1] == 'none' and bx[2] == 'solid' and bx[3] >= 1 and bx[4] == '0px' and 'Level' in bx[5], bx)
    ok('no page errors (Charges)', not e, e[:2]); await ctx.close()
