"""Anesia — the n441 build's own checks (Nov 26 2026): HIG Charts, Image views, Text views.
A vital's trend was a picture only, didn't take in a reading charted while it was open, and on a touch screen opened only
from the sparkline (which VoiceOver can't reach); struck-through gas and ventilation marks had no spoken name, other
struck-through marks never said so, and an event's note was never read; a note's box stayed 2 lines high."""
from core import *
from helpers import *

HEAD = "document.querySelector('#anSheet .an-trendsum .now')?.innerText.replace(/\\s+/g,' ').trim()"
SL = "(()=>{const s=document.querySelector('#anSheet .an-scrub');return s?[s.getAttribute('role'),s.getAttribute('aria-valuemin'),s.getAttribute('aria-valuemax'),s.getAttribute('aria-valuenow'),s.getAttribute('aria-valuetext')]:null})()"
BOX = "(()=>{const r=document.querySelector('#anSheet .an-scrub').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()"
HRS = "window.__fs['anesia_records/an_train1'].vitals.filter(v=>v.hr!==undefined&&!v.void).sort((a,b)=>a.at-b.at).map(v=>v.hr)"


@section(id='a441', title='n441 · Anesia · Charts, Image views, Text views: a trend you can scrub and step through, that takes in new readings, with a Trends button for touch and VoiceOver; complete names for struck-through marks and notes; a note box that grows',
         apps=['anesia'], topics=['charts', 'accessibility'], engines=('chromium', 'webkit'))
async def s_a441(br):
    errs = []
    ctx, pg, e = await new_page(br)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    hrs = await pg.evaluate(HRS); n = len(hrs)
    tb = await pg.evaluate("(()=>{const b=document.querySelector('#anTrends');return b?[b.innerText.trim(),b.title,b.tagName]:null})()")
    await pg.click('#anTrends'); await pg.wait_for_selector('#anSheet .an-scrub'); await pg.wait_for_timeout(500)
    t1 = await pg.evaluate("[document.querySelector('#anShT').innerText,[...document.querySelectorAll('#anSheet [data-chips=trendk] .an-chip')].map(c=>c.innerText+(c.getAttribute('aria-pressed')==='true'?'*':'')),document.querySelector('#anSheet [data-chips=trendk]').getAttribute('aria-label')]")
    ok('Charts · the vitals graph has a Trends button, which opens the heart rate trend with a row of vitals to switch between',
       tb and tb[0] == 'Trends' and tb[1] and t1[0] == 'Heart rate' and t1[1] == ['HR*', 'MAP', 'SpO₂', 'EtCO₂', 'RR', 'Temp'] and t1[2] == 'Vital', [tb, t1])
    s0 = await pg.evaluate(SL)
    ok('…the trend is an adjustable control, reading by reading, starting at the latest (VoiceOver: swipe up or down)',
       s0 and s0[0] == 'slider' and s0[1] == '1' and s0[2] == str(n) and s0[3] == str(n) and s0[4].startswith(f'{hrs[-1]} bpm at ') and s0[4].endswith(', the latest'), [s0, n])
    await pg.focus('#anSheet .an-scrub'); await pg.keyboard.press('Home'); a = await pg.evaluate(SL); ha = await pg.evaluate(HEAD)
    await pg.keyboard.press('ArrowRight'); b = await pg.evaluate(SL); await pg.keyboard.press('End'); c = await pg.evaluate(SL); hc = await pg.evaluate(HEAD)
    ok('…← → Home End step through the readings, and the headline follows (“96 bpm at 2:05 PM · Reading 1 of 15”); End is the latest again, and the headline is as it was',
       a[3] == '1' and a[4].startswith(f'{hrs[0]} bpm at ') and a[4].endswith(f'reading 1 of {n}') and ha.startswith(f'{hrs[0]} bpm at') and ha.endswith(f'Reading 1 of {n}')
       and b[3] == '2' and b[4].startswith(f'{hrs[1]} bpm') and c[3] == str(n) and 'Reading' not in hc and hc.startswith(f'{hrs[-1]} bpm at'), [a, ha, b, c, hc])
    await pg.locator('#anSheet .an-scrub').blur()
    bx = await pg.evaluate(BOX)
    await pg.mouse.move(bx[0] + bx[2] * .35, bx[1] + bx[3] * .5); await pg.wait_for_timeout(150)
    hv = await pg.evaluate(HEAD); sc = await pg.evaluate("document.querySelector('#anSheet svg.an-trend').classList.contains('scrub')")
    await pg.mouse.move(bx[0] + bx[2] + 300, bx[1] - 150); await pg.wait_for_timeout(150); hl = await pg.evaluate(HEAD)
    import re as _re
    m = _re.match(r'(\d+(?:\.\d+)?) bpm at .* Reading (\d+) of (\d+)$', hv or '')
    ok('…a pointer anywhere over the plot shows the reading under it, with a line and a ring on the point; leaving goes back to the latest',
       m and 1 < int(m.group(2)) < n and float(m.group(1)) == hrs[int(m.group(2)) - 1] and sc and 'Reading' not in hl and hl.startswith(f'{hrs[-1]} bpm'), [hv, sc, hl])
    await pg.click('#anSheet [data-chips=trendk] [data-v=spo2]'); await pg.wait_for_timeout(300)
    sp = await pg.evaluate("[document.querySelector('#anShT').innerText," + HEAD + ",document.querySelector('#anSheet svg.an-trend').getAttribute('class')]")
    await pg.click('#anSheet [data-chips=trendk] [data-v=hr]'); await pg.wait_for_timeout(300)
    last = await pg.evaluate("Math.max(...window.__fs['anesia_records/an_train1'].vitals.map(v=>v.at))")
    await pg.evaluate("t=>firebase.firestore().doc('anesia_records/an_train1').update({vitals:firebase.firestore.FieldValue.arrayUnion({id:'v_t441',at:t,by:'Resident B',ca:t,hr:88})})", last + 300000)
    await pg.wait_for_timeout(1200)
    nw = await pg.evaluate("[" + HEAD + ",document.querySelectorAll('#anSheet svg.an-trend circle:not(.sr)').length,document.getElementById('anSr')?.textContent,document.querySelector('#anSheet svg.an-trend .sr')?.classList.contains('new')]")
    ok('…switching to SpO₂ redraws it in place', sp[0] == 'SpO₂' and 'Reading' not in sp[1] and '%' in sp[1] and 'v-spo2' in sp[2], sp)
    ok('Charts · a reading charted while the trend is open (here or on another device) is taken in and ringed, and VoiceOver says “New reading: 88 bpm at …”',
       nw[0].startswith('88 bpm at') and nw[1] == n + 1 and (nw[2] or '').startswith('New reading: 88 bpm at ') and nw[3], nw)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    cl = await pg.evaluate("[!!document.querySelector('#anSheet'),document.activeElement&&document.activeElement.id]")
    ok('…choosing a vital isn’t a change: Esc closes the trend without asking, back to Trends', cl == [False, 'anTrends'], cl)
    # accessibility labels on struck-through marks and notes
    await pg.evaluate("""(()=>{const r=JSON.parse(JSON.stringify(window.__fs['anesia_records/an_train1']));
      const vd=o=>Object.assign(o,{void:true,voidReason:'Charted on the wrong patient',voidBy:'Resident A',voidAt:o.at+60000});
      r.events[2].note='Smooth induction, no apnea'; vd(r.events[3]); vd(r.gases[r.gases.length-1]); vd(r.vitals[3]); vd(r.infusions[0]);
      r.vitals[5].fio2=98; vd(r.vitals[5]);
      return firebase.firestore().doc('anesia_records/an_train1').set(r)})()""")
    await pg.wait_for_timeout(1000)
    lab = await pg.evaluate("""(()=>{const r=window.__fs['anesia_records/an_train1'];const bs=[...document.querySelectorAll('.an-chart button')];
      const L=b=>b.getAttribute('aria-label')||'';
      return {voids:bs.filter(b=>b.classList.contains('void')).map(L),gas:L(document.querySelector('[data-entry="gas:'+r.gases[r.gases.length-1].id+'"]')),
        ev:[L(document.querySelector('[data-entry="event:'+r.events[2].id+'"]')),document.querySelector('[data-entry="event:'+r.events[2].id+'"]').title],
        dbl:bs.map(L).filter(x=>/  /.test(x)),unnamed:bs.filter(b=>!L(b)&&!b.innerText.trim()||/^[\d.]+$/.test(L(b)||b.innerText.trim())).map(b=>b.className)}})()""")
    ok('Charts · a struck-through gas setting is named in full (“Isoflurane 1.75 % at 2:40 PM, struck through”; it was read as “1.75”)',
       _re.match(r'^(Isoflurane|Sevoflurane|Oxygen) [\d.]+ (%|L/min) at \d+:\d\d (AM|PM), struck through$', lab['gas'] or '') is not None, lab['gas'])
    ok('…every struck-through mark says so (events, infusions and the extra monitors didn’t), and no chart control is unnamed',
       len(lab['voids']) >= 5 and all(x.endswith(', struck through') for x in lab['voids']) and not lab['unnamed'], lab)
    ok('…an event’s note is in its name and, on a Mac, its tooltip; no doubled spaces where a dose has no route',
       lab['ev'][0].endswith(': Smooth induction, no apnea') and lab['ev'][1] == 'Induction · Smooth induction, no apnea' and not lab['dbl'], lab)
    # text views: a note grows with its text, up to 8 lines
    await pg.click('.an-tools [data-act=event]'); await pg.wait_for_timeout(500)
    await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.wait_for_timeout(200)
    h0 = await pg.evaluate("document.querySelector('[name=note]').offsetHeight")
    await pg.focus('[name=note]'); await pg.keyboard.type('Bleeding from the left lateral aspect after a ligature slipped; pressure for three minutes. ' * 2)
    g1 = await pg.evaluate("(()=>{const t=document.querySelector('[name=note]');return [t.offsetHeight,t.scrollHeight,t.clientHeight,getComputedStyle(t).overflowY]})()")
    await pg.fill('[name=note]', ('Line of a long note\n' * 14).strip()); await pg.dispatch_event('[name=note]', 'input')
    g2 = await pg.evaluate("(()=>{const t=document.querySelector('[name=note]'),cs=getComputedStyle(t);return [t.offsetHeight,t.scrollHeight,t.clientHeight,cs.overflowY,parseFloat(cs.lineHeight)]})()")
    ok('Text views · a note’s box grows with what’s typed (it stayed 3 lines and scrolled inside), up to 8 lines, then scrolls',
       g1[0] > h0 and g1[1] <= g1[2] + 2 and g1[3] == 'hidden' and g2[3] == 'auto' and g2[1] > g2[2] and abs(g2[0] - g1[0]) > 0 and g2[0] <= g2[4] * 8 + 40, [h0, g1, g2])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    errs += list(e); await ctx.close()
    # iPhone, touch only: Trends is a full-size target, and a tap on the plot reads the point and keeps it
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    hrs = await pg.evaluate(HRS); n = len(hrs)
    await pg.locator('#anTrends').scroll_into_view_if_needed()
    th = await pg.evaluate("document.querySelector('#anTrends').getBoundingClientRect().height")
    await pg.locator('#anTrends').tap(); await pg.wait_for_selector('#anSheet .an-scrub'); await pg.wait_for_timeout(600)
    bx = await pg.evaluate(BOX)
    await pg.touchscreen.tap(bx[0] + bx[2] * .5, bx[1] + bx[3] * .5); await pg.wait_for_timeout(400)
    tp = await pg.evaluate(SL); ht = await pg.evaluate(HEAD)
    ok('…on an iPhone, Trends is a 44-pt target, and tapping the plot shows the reading there and keeps it after the finger lifts',
       th >= 44 and tp[3] not in (None, str(n)) and ht.endswith(f'Reading {tp[3]} of {n}') and ht.startswith(f'{hrs[int(tp[3]) - 1]} bpm'), [th, tp, ht])
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
