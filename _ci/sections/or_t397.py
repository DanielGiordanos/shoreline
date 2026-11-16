"""Pravix OR — the n397 build's own checks (Nov 16 2026): HIG Typography (second look), Charting data, Collaboration and sharing.
Typography: the wall display is read across the room, so its words reach 23 pt at 1920 × 1080 (the counts' words, the surgeon
line, safety flags, Next and "Not ready" were 19–22). Charting data: each Analytics chart says what it shows in a sentence,
with its window and count, and to VoiceOver bar by bar; data bars are neutral and delays amber (they were the accent, which
means "press me"); the bars draw on once, not on every update; an over-run says by how much (it was colour alone); the
durations are a table to VoiceOver. Collaboration and sharing: the case page has Copy link (and Share… where there's a
share sheet), a link with only the case's id that opens the case after sign-in; each step records who took it and the
timeline says so; a step taken on another screen is announced, your own never."""
import json
import core
from core import ok, section
import or_t390
from or_t390 import open_or, DAY

def _past(i, day, room, sched, dur, proc, delay=None, typ='scheduled'):
    ev = [('arrived', sched - 40), ('preop', sched - 30), ('ready', sched - 5), ('in_room', sched + (delay or 0)),
          ('procedure_started', sched + 15 + (delay or 0)), ('procedure_finished', sched + 15 + dur + (12 if proc == 'TPLO' else 0) + (delay or 0)),
          ('out_of_room', sched + 30 + dur + (delay or 0)), ('recovery', sched + 32 + dur), ('complete', sched + 80 + dur)]
    s = {'id': 'or397h%d' % i, 'date': day, 'sched': sched, 'dur': dur, 'roomId': room, 'procedure': proc, 'service': 'Soft Tissue', 'surgeonId': 'nolte',
         'type': typ, 'priority': 'routine', 'laterality': None, 'status': 'complete', 'notes': '', 'events': [{'status': a, 't': b} for a, b in ev],
         'recovery': {'started': sched + 32 + dur, 'complete': sched + 80 + dur}}
    if delay: s['delay'] = {'min': delay, 'reason': ['Patient not ready', 'Patient not ready', 'Equipment'][i % 3]}
    return ('sheets/or397_%d' % i, {'tenant_id': 'shoreline', 'status': 'active', 'board': 'IP',
            'patient': {'name': 'Hist%d' % i, 'last': 'Training', 'species': 'Canine', 'breed': 'Beagle', 'weight': 12, 'age': '6y', 'sex': 'MN', 'owner': 'Training owner', 'code': 'CPR', 'reason': proc},
            'surgery': s})

HIST = dict(_past(i, d, r, s, du, p, dl) for i, (d, r, s, du, p, dl) in enumerate([
    ('2026-10-22', 'or1', 480, 90, 'TPLO', None), ('2026-10-22', 'or1', 660, 60, 'Cystotomy', 20), ('2026-10-21', 'or2', 495, 60, 'Mass Removal', 15),
    ('2026-10-21', 'or1', 480, 90, 'TPLO', None), ('2026-10-20', 'or2', 600, 60, 'Cystotomy', 30), ('2026-10-20', 'or1', 480, 120, 'Exploratory Laparotomy', None)]))


async def open_hist(br, **kw):
    keep = or_t390.SEED
    or_t390.SEED = json.dumps(dict(json.loads(keep), **HIST))
    try:
        return await open_or(br, **kw)
    finally:
        or_t390.SEED = keep


@section(id='t397', title='n397 · OR · Typography, Charting data, Collaboration and sharing: wall display words at 23 pt, charts that say what they show with neutral bars drawn once and a real table, Copy link to a case, who took each step, other screens’ steps announced',
         apps=['or'], topics=['typography', 'charts', 'sharing'], engines=('chromium', 'webkit'))
async def s_t397(br):
    c, p, e = await open_or(br, vp=(1920, 1080))
    await p.click('#displayBtn'); await p.wait_for_timeout(1200)
    small = await p.evaluate("[...document.querySelectorAll('.or-display *')].filter(e=>!e.closest('.or-display-by,.or-display-exit')&&e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>[e.textContent.trim().slice(0,24),parseFloat(getComputedStyle(e).fontSize)]).filter(x=>x[1]<23)")
    ok('Typography · on a 1920 × 1080 wall display every word is 23 pt or larger (the counts’ words, the surgeon line, “Consent not signed”, Next and “Not ready” were 19–22)', small == [], small[:6])
    ov = await p.evaluate("(()=>{const g=document.querySelector('.or-display');return [g.scrollWidth<=g.clientWidth+1, [...document.querySelectorAll('.or-droom')].every(r=>r.scrollWidth<=r.clientWidth+1)]})()")
    ok('…and the rooms still fit, nothing runs sideways', all(ov), ov)
    await c.close()

    c, p, e = await open_hist(br)
    await p.click('#switcher [data-view="analytics"]'); await p.wait_for_timeout(900)
    an = await p.evaluate("""(()=>{const g=document.getElementById('anGrid');const cs=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
      return {sums:[...g.querySelectorAll('.or-an-sum')].map(x=>x.textContent), titles:[...g.querySelectorAll('.panel-head h3')].map(h=>h.textContent),
        util:[...g.querySelectorAll('.or-bar.is-util')].map(b=>[b.getAttribute('role'),b.getAttribute('aria-label')]), cause:[...g.querySelectorAll('.or-bar.is-cause')].map(b=>b.getAttribute('aria-label')),
        ubg:[...g.querySelectorAll('.or-bar.is-util .track i')].map(i=>getComputedStyle(i).backgroundColor), cbg:[...g.querySelectorAll('.or-bar.is-cause .track i')].map(i=>getComputedStyle(i).backgroundColor),
        accent:getComputedStyle(document.body).getPropertyValue('--accent').trim()}})()""")
    ok('Charting data · each chart says what it shows in a sentence and gives its window (“OR 1 was the busiest, in use …% of a 10-hour day”, “Most often: Patient not ready, 2 of 3 delayed cases”)',
       len(an['sums']) == 2 and 'busiest' in an['sums'][0] + an['sums'][1] or 'Every room' in ''.join(an['sums']), an['sums'])
    ok('…every chart names its window (Delay causes had none)', all('last 30 days' in t for t in an['titles'] if not t.startswith('LUNA')), an['titles'])
    ok('…and VoiceOver hears each bar with what it measures (“OR 1, Orthopedics: in use 45% of a 10-hour day”, “Patient not ready: 2 of 3 delayed cases, 67%”), not a bare “45%”',
       an['util'] and all(r == 'img' and '% of a 10-hour day' in (l or '') for r, l in an['util']) and an['cause'] and all(' of 3 delayed case' in l for l in an['cause']), (an['util'][:2], an['cause'][:2]))
    ok('…data bars are neutral and every delay is amber (they were the accent, the colour of what you can press, and the first cause amber, the rest cyan)',
       an['ubg'] and len(set(an['ubg'])) == 1 and an['cbg'] and len(set(an['cbg'])) == 1 and an['ubg'][0] != an['cbg'][0], (an['ubg'][:2], an['cbg'][:3]))
    tb = await p.evaluate("""(()=>{const t=document.querySelector('#anGrid [role=table]');if(!t)return null;return {h:[...t.querySelectorAll('[role=columnheader]')].map(x=>x.textContent),
      rows:t.querySelectorAll('[role=row]').length, over:[...t.querySelectorAll('.n.over')].map(x=>[x.textContent,x.getAttribute('aria-label')])}})()""")
    ok('…the durations are a table to VoiceOver, and an over-run says by how much (“+12 min”), not by amber alone',
       tb and tb['h'] == ['Procedure', 'Scheduled', 'Avg actual', 'Cases'] and tb['rows'] >= 3 and tb['over'] and all('+' in x[0] and 'over' in (x[1] or '') for x in tb['over']), tb)
    await p.wait_for_timeout(700)
    await p.evaluate("renderAnalytics()"); await p.wait_for_timeout(80)
    w = await p.evaluate("[document.querySelectorAll('#anGrid .track i').length, document.getAnimations().filter(a=>a.effect&&a.effect.target&&a.effect.target.matches&&a.effect.target.matches('#anGrid .track i')).length]")
    ok('…an update redraws the bars where they are (they grew again from zero on every update)', w[0] > 0 and w[1] == 0, w)
    await c.close()

    c, p, e = await open_or(br)
    await p.evaluate("window.__copied=[];try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.__copied.push(t);return Promise.resolve()}}})}catch(x){}")
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(800)
    await p.click('#caseCopy'); await p.wait_for_timeout(300)
    cp = await p.evaluate("[window.__copied, document.getElementById('caseCopy').textContent.trim(), document.getElementById('toastMsg').textContent]")
    ok('Collaboration and sharing · the case page has Copy link: a link with only the case’s id, never a name, and the button says Copied',
       cp[0] and cp[0][0].endswith('/or/#case=or390c2') and 'Maple' not in cp[0][0] and cp[1] == 'Copied' and 'sign-in' in cp[2], cp)
    url = cp[0][0] if cp[0] else ''
    await c.close()
    c, p, e = await open_or(br, path='/or/#case=or390c2'); await p.wait_for_timeout(600)
    opened = await p.evaluate("[!document.getElementById('view-case').classList.contains('hidden'), (document.querySelector('#caseHead h1')||{}).textContent]")
    ok('…and the link opens that case', opened == [True, 'Maple'], (url, opened))
    await c.close()

    c, p, e = await open_or(br)
    await p.evaluate("openCase('or390c6')"); await p.wait_for_timeout(800)
    await p.click('#caseAdvance'); await p.wait_for_timeout(700)
    mine = await p.evaluate("(()=>{const c=caseById('or390c6');const e=c.events[c.events.length-1];return [e.status,e.by||null,[...document.querySelectorAll('#caseBody .tl-item:not(.upcoming) .tl-t span')].map(s=>s.textContent).pop(),[...document.querySelectorAll('#notes .note')].map(n=>n.textContent)]})()")
    ok('Collaboration · a step records who took it and the timeline says so (“10:15 AM · Resident A”); your own step isn’t announced back to you',
       mine[1] == 'Resident A' and (mine[2] or '').endswith('· Resident A') and not any('by Resident A' in n for n in mine[3]), mine)
    await p.click('#caseBack'); await p.wait_for_timeout(300)
    await p.evaluate("""(()=>{const d=firebase.firestore().collection('sheets').doc('or390_5');return d.get().then(s=>{const su=s.data().surgery;const ev=(su.events||[]).concat([{status:'arrived',t:655,by:'Resident B'}]);
      return d.update({'surgery.status':'arrived','surgery.events':ev,updated_by:'Resident B'})})})()""")
    await p.wait_for_timeout(900)
    notes = await p.evaluate("[...document.querySelectorAll('#notes .note')].map(n=>n.textContent)")
    ok('…and a step taken on another screen is announced with who took it (“Otis · Arrived … by Resident B”); it changed the board in silence',
       any('Otis' in n and 'Resident B' in n for n in notes), notes)
    ok('…no page errors', not e, e[:3])
    await c.close()
