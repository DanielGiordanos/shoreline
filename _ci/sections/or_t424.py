"""Pravix OR — the n424 build's own checks (Nov 22 2026): HIG Activity rings, Gauges, Progress indicators.
With Reduce Motion the "Retrieving today's cases" bar stood still (a stationary bar reads as stalled): it fades now. A
charted dose said "On the sheet ✓" before the treatment sheet had it, and the Hand-off said "Sent to Flow ✓" before
anything was sent: they say "Charting…" and "Sending to Flow…" until it's done, and a hand-off that can't reach the
sheet says "Not sent" with Try again (the button was gone)."""
import core
from core import ok, section, PORT
import or_t390 as T
from or_t390 import open_or

ANIM = """(s=>{const e=document.querySelector(s); if(!e) return null; return e.getAnimations().map(a=>[a.animationName||'', a.playState, a.effect.getTiming().iterations, Math.round(a.effect.getTiming().duration)])})"""
HOLD = """(()=>{ const ref=firebase.firestore().collection('sheets').doc('or390_2'), pr=Object.getPrototypeOf(ref), up=pr.update;
  window.__wq=[]; pr.update=function(d){ const me=this, a=arguments; if(window.__wmode==='hold') return new Promise((res,rej)=>window.__wq.push({go:()=>up.apply(me,a).then(res,rej), fail:()=>rej({code:'unavailable'})}));
    if(window.__wmode==='fail') return Promise.reject({code:'unavailable'}); return up.apply(me,a); }; return 1 })()"""


@section(id='t424', title='n424 · OR · Activity rings, Gauges, Progress indicators: the loader keeps moving with Reduce Motion, a charted dose says “Charting…” and the Hand-off “Sending to Flow…” until it’s done, and a hand-off that fails says “Not sent” with Try again',
         apps=['or'], topics=['progress', 'loading', 'motion', 'feedback'], engines=('chromium', 'webkit'))
async def s_t424(br):
    errs = []
    # Reduce Motion: the loader fades instead of standing still
    core.SEED, keep = T.SEED, core.SEED
    try:
        c, p, e = await core.new_page(br, vp=(1440, 900))
    finally:
        core.SEED = keep
    await c.add_init_script(core.PINJS); await c.add_init_script("window.__fsDelay=20000")
    await p.emulate_media(reduced_motion='reduce')
    await p.goto(f'http://127.0.0.1:{PORT}/or/'); await p.wait_for_timeout(1200)
    a1 = await p.evaluate(ANIM, '.pvx-ld-track i')
    ops = []   # over one cycle (1.6 s), so two samples can't land on the same level
    for _ in range(9):
        ops.append(await p.evaluate("parseFloat(getComputedStyle(document.querySelector('.pvx-ld-track i')).opacity)")); await p.wait_for_timeout(200)
    o1, o2 = min(ops), max(ops)
    ok('Progress indicators · with Reduce Motion, “Retrieving today’s cases” keeps moving by fading in and out (it stood still as a faint full bar, which reads as stalled): its animation runs without end, slower than a second, and its opacity changes',
       a1 and any(x[1] == 'running' and x[2] in (None, float('inf')) or (x[1] == 'running' and str(x[2]) in ('inf', 'Infinity')) for x in a1) and all(x[3] >= 1000 for x in a1 if x[1] == 'running') and o2 - o1 > 0.1, (a1, ops))
    errs += list(e); await c.close()

    # Drug given: "Charting…" until the sheet has it
    c, p, e = await open_or(br)
    await p.evaluate(HOLD)
    await p.evaluate("openCase('or390c2','procedure')"); await p.wait_for_timeout(500)
    await p.evaluate("window.__wmode='hold'; LINK.sheetMeds=()=>[]; drugModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    await p.fill('#dgName', 'Training drug'); await p.fill('#dgDose', '1'); await p.select_option('#dgUnit', index=1); await p.select_option('#dgRoute', index=1)
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(400)
    ROW = """(()=>{const r=[...document.querySelectorAll('#caseBody .or-drug')].find(x=>x.textContent.includes('Training drug')); return r?[r.querySelector('small').textContent.trim(), !!r.querySelector('.or-spin'), !!r.querySelector('.st.ok')]:null})()"""
    d1 = await p.evaluate(ROW)
    await p.evaluate("window.__wmode=''; window.__wq.splice(0).forEach(w=>w.go())"); await p.wait_for_timeout(500)
    d2 = await p.evaluate(ROW)
    ok('Progress indicators · a charted dose says “Charting…” with a small spinner until the treatment sheet has it (it said “On the sheet ✓” at once), then “On the sheet” with its check',
       d1 and 'Charting…' in d1[0] and 'On the sheet' not in d1[0] and d1[1] and not d1[2] and d2 and 'On the sheet' in d2[0] and not d2[1] and d2[2], (d1, d2))

    # Send to Flow: "Sending to Flow…", then "Not sent" with Try again, then sent
    await p.evaluate("""(()=>{ const c=caseById('or390c3'); c.recovery=c.recovery||{}; c.recovery.destination='ICU'; c.recovery.complete=now()-5; c.recovery.techId=c.recovery.techId||null; setStatus(c,'recovery_complete'); })()""")
    await p.evaluate("openCase('or390c3','recovery')"); await p.wait_for_timeout(500)
    HO = """(()=>{const b=document.querySelector('#caseBody .or-sending,#caseBody .or-sendfail,#caseBody .or-timeout-done:last-of-type'); const c=caseById('or390c3');
      return {text:[...document.querySelectorAll('#caseBody .or-sending,#caseBody .or-sendfail')].map(x=>x.textContent.replace(/\\s+/g,' ').trim()).join('|'), sent:[...document.querySelectorAll('#caseBody b')].some(x=>x.textContent==='Sent to Flow'),
        spin:!!document.querySelector('#caseBody .or-sending .or-spin'), role:(document.querySelector('#caseBody .or-sending,#caseBody .or-sendfail')||{getAttribute(){return null}}).getAttribute('role'),
        retry:!!document.querySelector('#caseBody [data-act="send-retry"]'), flag:c.recovery.sentToFlow}})()"""
    await p.evaluate("window.__wmode='hold'"); await p.click('#caseBody [data-act="send-flow"]'); await p.wait_for_timeout(400)
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(400)
    h1 = await p.evaluate(HO)
    await p.evaluate("window.__wmode=''; window.__wq.splice(0).forEach(w=>w.fail())"); await p.wait_for_timeout(500)
    h2 = await p.evaluate(HO)
    await p.click('#caseBody [data-act="send-retry"]'); await p.wait_for_timeout(600)
    h3 = await p.evaluate(HO)
    log = await p.evaluate("(window.__fsLog||[]).filter(x=>x[0]==='update'&&x[1]==='sheets/or390_3'&&x[2]&&x[2]['patient.location']).length")
    ok('Progress indicators · Send to Flow says “Sending to Flow…” with a spinner in place of its button until the sheet has it (Send to Flow stayed, and the next redraw said “Sent to Flow ✓” before the sheet had it)',
       'Sending to Flow…' in h1['text'] and h1['spin'] and h1['role'] == 'status' and not h1['sent'], h1)
    ok('…when the sheet can’t be reached it says “Not sent” with Try again and the case is no longer marked sent (the error said “try again”, but the panel still said Sent and had no button); Try again sends it',
       h2['text'].startswith('Not sent') and h2['retry'] and h2['role'] == 'alert' and h2['flag'] is False and not h2['sent']
       and h3['sent'] and not h3['text'] and h3['flag'] is True and log == 1, (h2, h3, log))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
