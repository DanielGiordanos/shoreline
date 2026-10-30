"""Treatment Sheets — the n271 build's own checks: switching patient tabs is instant (Daniel, Oct 29: every switch showed
the loading placeholder until the database answered). Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

# a slow database: each listener's first answer comes LAG ms late (.get() is not delayed, as a cached read on a phone)
LAGJS = """(()=>{const t=setInterval(()=>{if(!window.firebase||!firebase.firestore)return;clearInterval(t);const db=firebase.firestore();const P=Object.getPrototypeOf(db.collection('x').doc('y'));const o=P.onSnapshot;
  P.onSnapshot=function(cb,c2){if(!window.__lag)return o.call(this,cb,c2);let first=true,dead=false,lag=window.__lag;const f=typeof cb==='function'?cb:c2;
    const un=o.call(this,function(s){if(first){first=false;setTimeout(()=>{if(!dead)f(s)},lag)}else f(s)});return function(){dead=true;un&&un()}}},5)})();
  window.__T=[];document.addEventListener('DOMContentLoaded',()=>{const w=setInterval(()=>{if(!window.toast)return;clearInterval(w);const f=window.toast;window.toast=function(m){window.__T.push(String(m));return f.apply(this,arguments)}},20)})"""
GRID = "(()=>{const g=document.getElementById('sheetInner');return {tab:((document.querySelector('.pt-tab.cur')||{}).textContent||'').trim(),marks:g?[...g.querySelectorAll('.mark[aria-label]')].map(m=>m.getAttribute('aria-label')):null}})()"
TAB = "(i=>{const r=[...document.querySelectorAll('.pt-tab .pt-main')][i].getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})"


async def switch(pg, i, wait=180):
    b = await pg.evaluate(TAB, i); await pg.mouse.click(b[0], b[1]); await pg.wait_for_timeout(wait)
    return await pg.evaluate(GRID)


@section(id='t271', title='n271 · Treatment Sheets: switching patient tabs is instant', apps=['treatment'], topics=['loading', 'tabs'], engines=('chromium', 'webkit'))
async def s_t271(br):
    # what each sheet looks like when opened fresh (the reference)
    ref = {}
    for sh in ('sh_train1', 'sh_train2'):
        ctx, pg, e = await ts(br, PORT, view='sheet', sheet=sh)
        ref[sh] = (await pg.evaluate(GRID))['marks']; await ctx.close()

    ctx, pg, e = await ts(br, PORT, view='sheet', init=LAGJS)
    await pg.evaluate("window.__lag=1500"); await pg.wait_for_timeout(1800)   # the warm-up runs 1.5 s after the sheet is drawn
    g1 = await switch(pg, 1)
    ok('A first switch to another open tab draws its sheet at once, with a database that takes 1.5 s to answer (the hours showed grey placeholder bars until it did)',
       'Mochi' in g1['tab'] and g1['marks'] and len(g1['marks']) > 10, {k: (v[:3] if isinstance(v, list) else v) for k, v in g1.items()})
    ok('…and what it draws is the patient’s sheet as it is (the same doses and states as opening it fresh)', g1['marks'] == ref['sh_train2'], [len(g1['marks'] or []), len(ref['sh_train2'])])
    await pg.wait_for_timeout(1800)
    g2 = await switch(pg, 0)
    ok('Going back to the tab just left is instant too, and unchanged', 'Biscuit' in g2['tab'] and g2['marks'] == ref['sh_train1'], [g2['tab'], len(g2['marks'] or [])])
    await pg.wait_for_timeout(1800)

    # someone else charts on Mochi while Biscuit is on screen; switching shows the kept copy, then the live answer
    k = await pg.evaluate("""(async()=>{const db=firebase.firestore();const s=(await db.collection('sheets').doc('sh_train2').get()).data();
      const id=Object.keys(s.orders).find(x=>{const o=s.orders[x];return o&&!o.dc&&!o.cont&&/q4h/.test(o.freq||'')});const d=new Date();const dk=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
      const key=dk+'_'+id+'_480';const m={};m[key]={status:'completed',value:'101.2',at:new Date().toISOString(),by:'VR',byName:'Vanessa Ruiz'};
      await db.collection('sheets').doc('sh_train2').collection('days').doc(dk).set({dk,marks:m},{merge:true});return [id,s.orders[id].name,key]})()""")
    await pg.wait_for_timeout(400)
    await pg.evaluate("window.__T=[]")
    g3 = await switch(pg, 1, 120)
    await until(pg, f"document.querySelector('#sheetInner [data-t=\"{k[2]}\"]')&&document.querySelector('#sheetInner [data-t=\"{k[2]}\"]').dataset.s==='completed'", 5000)
    st = await pg.evaluate(f"(document.querySelector('#sheetInner [data-t=\"{k[2]}\"]')||{{dataset:{{}}}}).dataset.s")
    msgs = await pg.evaluate("window.__T")
    ok('A dose someone else charted while you were on another tab shows once the live answer comes (the kept copy is only a moment’s stand-in)', g3['marks'] and st == 'completed', [k, st])
    ok('…and isn’t announced as just charted because of the kept copy (opening a sheet never announced older charting)', not any(k[1] in m and 'charted' in m.lower() for m in msgs), msgs)

    # charting right after a switch works
    t = await pg.evaluate("(()=>{const m=[...document.querySelectorAll('#sheetInner .mark.overdue[data-t]')][0];return m&&m.dataset.t})()")
    await pg.evaluate(f"openCompletion('{t}');0"); await until(pg, "!!document.querySelector('#completionDrawer.open')", 4000)
    has = await pg.evaluate("!!document.getElementById('cd-value')&&document.getElementById('cd-value').getClientRects().length>0")
    if has: await pg.fill('#cd-value', '101.3')
    await pg.keyboard.press('Enter'); await until(pg, f"(document.querySelector('#sheetInner [data-t=\"{t}\"]')||{{dataset:{{}}}}).dataset.s==='completed'", 4000)
    await pg.wait_for_timeout(1700)
    c1 = await pg.evaluate(f"(document.querySelector('#sheetInner [data-t=\"{t}\"]')||{{dataset:{{}}}}).dataset.s")
    ok('Charting right after a switch saves and stays charted after the live answer', c1 == 'completed', [t, c1])
    ok('With a normal slow answer there’s no “still connecting” message', not any('still connecting' in m for m in await pg.evaluate("window.__T")), await pg.evaluate("window.__T"))

    # a database that doesn't answer: the kept copy says what it is
    await pg.evaluate("window.__lag=20000;window.__T=[]")
    await switch(pg, 0)
    await until(pg, "window.__T.some(m=>/still connecting/.test(m))", 9000)
    sc = [m for m in await pg.evaluate("window.__T") if 'still connecting' in m]
    ok('If the live answer hasn’t come 6 s after a switch, it says the sheet shows what it had at a time and is still connecting (an old copy is never shown as current without saying so)',
       sc and sc[0].startswith('Showing this sheet as of '), sc)
    ok('no page errors', not e, e[:2])
    await ctx.close()
