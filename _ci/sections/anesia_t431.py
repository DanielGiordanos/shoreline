"""Anesia — the n431 build's own checks (Nov 24 2026): HIG Icons, Layout, Materials.
On compact widths (iPhone, iPad Split View, Display Zoom) the record's header spent three rows on the patient line beside
the weight (one of them for the ⓘ alone); the list's filter broke "In progress · 2" onto two lines (three at 320 pt); Event's
time-out warning broke "Start time-out" onto three lines and at 320 pt its text ran out of its box; at 320 pt a sheet's
action ("Give drug") broke onto two lines."""
from core import *
from helpers import *

SEG = """(()=>{const g=document.querySelector('.an-seg[aria-label="Show records"]'); const bs=[...g.querySelectorAll('button')];
  const sel=bs.find(x=>x.getAttribute('aria-checked')==='true'||x.getAttribute('aria-selected')==='true'); const pl=g.querySelector('.an-segpill');
  return {lines:bs.map(x=>{const rg=document.createRange(); rg.selectNodeContents(x); return rg.getClientRects().length}), over:g.scrollWidth>g.clientWidth+1,
    pill:pl?Math.abs(pl.getBoundingClientRect().width-sel.getBoundingClientRect().width)<2:true}})()"""
HEAD = """(()=>{const s=document.querySelector('.an-id .sub'), i=document.querySelector('#anPatient'), h=document.querySelector('.an-rhead'), w=document.querySelector('.an-wbig'), t=document.querySelector('.an-id h1');
  const sr=s.getBoundingClientRect(), ir=i.getBoundingClientRect(), wr=w.getBoundingClientRect(), tr=t.getBoundingClientRect();
  return {head:Math.round(h.getBoundingClientRect().height), subH:Math.round(sr.height), infoInline:Math.abs((ir.top+ir.bottom)/2-(sr.top+sr.bottom)/2)<12,
    weightBesideTitle:wr.top<tr.bottom&&wr.left>tr.right-4, hs:document.documentElement.scrollWidth>innerWidth+1}})()"""
TOWARN = """(()=>{const w=document.querySelector('.an-towarn'); if(!w) return null; const b=w.querySelector('.an-btn'), s=w.querySelector('span');
  const rg=document.createRange(); rg.selectNodeContents(b); const wr=w.getBoundingClientRect(), sr=s.getBoundingClientRect(), br=b.getBoundingClientRect();
  return {btnLines:rg.getClientRects().length, holds:sr.bottom<=wr.bottom+1&&sr.top>=wr.top-1&&br.bottom<=wr.bottom+1&&br.right<=wr.right+1}})()"""
BAR = """(()=>{const h=document.querySelector('#anShT'); return {btns:[...document.querySelectorAll('.an-sh>.an-btn')].map(x=>{const rg=document.createRange(); rg.selectNodeContents(x); return rg.getClientRects().length}),
  title:h.textContent, whole:h.scrollWidth<=h.clientWidth+1, centred:(()=>{const b=h.parentElement.getBoundingClientRect(), r=h.getBoundingClientRect(); return Math.abs((r.left+r.right)/2-(b.left+b.right)/2)})()}})()"""


async def measure(br, vp, touch):
    ctx, pg, e = await new_page(br, vp=vp, touch=touch)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(500)
    m = {'seg': await pg.evaluate(SEG)}
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    m['head'] = await pg.evaluate(HEAD)
    await pg.click('.an-tools [data-act=event]'); await pg.wait_for_timeout(700)
    m['towarn'] = await pg.evaluate(TOWARN); m['event'] = await pg.evaluate(BAR)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    await pg.click('.an-tools [data-act=dose]'); await pg.wait_for_timeout(700)
    m['dose'] = await pg.evaluate(BAR)
    errs = list(e); await ctx.close()
    return m, errs


@section(id='a431', title='n431 · Anesia · Icons, Layout, Materials: on iPhone, iPad Split View and Display Zoom the record’s header, the list’s filter, the time-out warning and sheet bars keep their words on one line',
         apps=['anesia'], topics=['layout'], engines=('chromium', 'webkit'))
async def s_a431(br):
    errs = []; M = {}
    for tag, vp, touch in (('iPhone', (390, 844), True), ('Split View', (507, 820), True), ('Display Zoom', (320, 568), True), ('Mac', (1440, 900), False)):
        M[tag], e = await measure(br, vp, touch); errs += e
    ok('Layout · iPhone and iPad Split View: the patient line runs the full width with ⓘ at its end (it wrapped beside the weight, with ⓘ on a row of its own), the weight stays beside the name, and the header is shorter (501 → 453 pt on iPhone)',
       all(M[t]['head']['infoInline'] and M[t]['head']['subH'] <= 36 and M[t]['head']['weightBesideTitle'] and not M[t]['head']['hs'] for t in ('iPhone', 'Split View'))
       and M['iPhone']['head']['head'] <= 460 and M['Display Zoom']['head']['subH'] <= 64 and not M['Display Zoom']['head']['hs'], {t: M[t]['head'] for t in M})
    ok('…the list’s filter keeps every segment on one line at 390 and 320 pt (“In progress · 2” took two lines, and three at 320), nothing spills over, and the selection fits the chosen segment',
       all(M[t]['seg']['lines'] == [1, 1, 1] and not M[t]['seg']['over'] and M[t]['seg']['pill'] for t in M), {t: M[t]['seg'] for t in M})
    ok('…Event’s time-out warning keeps “Start time-out” on one line (it took three) and its box holds its words at every size (at 320 pt they ran out of it)',
       all(M[t]['towarn'] and M[t]['towarn']['btnLines'] == 1 and M[t]['towarn']['holds'] for t in M), {t: M[t]['towarn'] for t in M})
    ok('…a sheet’s Cancel and its action stay on one line at 320 pt (“Give drug” took two), and the title stays whole',
       all(M[t][s]['btns'] == [1, 1] and M[t][s]['whole'] for t in M for s in ('event', 'dose')), {t: (M[t]['event'], M[t]['dose']) for t in M})
    ok('…the Mac is as it was: the header in one band (106 pt), titles centred in sheet bars',
       M['Mac']['head']['head'] <= 110 and M['Mac']['head']['infoInline'] and all(M['Mac'][s]['centred'] < 2 for s in ('event', 'dose')), M['Mac'])
    # larger text (Anesia's own large-text layout, n164) on compact widths
    BIG = {}
    for vp, px in (((390, 844), 28), ((390, 844), 33), ((320, 568), 23)):
        ctx, pg, e = await new_page(br, vp=vp, touch=True)
        await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.evaluate(f"document.documentElement.style.fontSize='{px}px'"); await pg.wait_for_timeout(400)
        r = {'list': await pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1")}
        await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
        for act in ('event', 'dose'):
            await pg.click(f'.an-tools [data-act={act}]'); await pg.wait_for_timeout(600)
            r[act] = await pg.evaluate("""(()=>{const bar=document.querySelector('.an-sh'), h=document.querySelector('#anShT'), sh=document.querySelector('.an-scrim .an-sheet'), w=document.querySelector('.an-towarn');
              const inBar=[...bar.children].every(x=>{const a=x.getBoundingClientRect(), b=bar.getBoundingClientRect(); return a.right<=b.right+1&&a.left>=b.left-1});
              const holds=!w||(()=>{const wr=w.getBoundingClientRect(); return [...w.children].every(x=>{const r=x.getBoundingClientRect(); return r.right<=wr.right+1&&r.bottom<=wr.bottom+1})})();
              return inBar && sh.scrollWidth<=sh.clientWidth+1 && h.scrollWidth<=h.clientWidth+1 && holds})()""")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
        BIG[f'{vp[0]}@{px}'] = r; errs += list(e); await ctx.close()
    ok('…and with larger text (23–33 pt on 390 and 320 pt): the list never scrolls sideways (in Safari the cards were 425 pt wide on a 390-pt screen), sheet bars keep their title and buttons inside the sheet, and the time-out warning holds its words',
       all(all(v.values()) for v in BIG.values()), BIG)
    ok('no page errors', not errs, errs)
