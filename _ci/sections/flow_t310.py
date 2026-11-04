"""Pravix Rounds — the n310 build's own checks: HIG Feedback, File management, Going full screen and Launching (Nov 2 2026),
on Rounds' own page. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
TOASTS = "window.__toasts=[];document.addEventListener('DOMContentLoaded',()=>{const t=window.toast;});"


async def ctx(br, seed=None):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    return c


async def open_(c, path='/rounds/', demo=True):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(2800)
    await p.evaluate("(()=>{const t=window.toast;window.__toasts=[];window.toast=function(m){window.__toasts.push(String(m));try{return t.apply(this,arguments)}catch(e){}}})()")
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return p, e

POS = "((document.querySelector('#rdMode')||{}).innerText||'').match(/(\\d+) OF (\\d+)/i)?.[0]||null"


@section(id='t310', title='n310 · Rounds follows the HIG Feedback, File management, Going full screen and Launching pages',
         apps=['rounds'], topics=['rounds', 'feedback', 'saving', 'full-screen', 'launching'], engines=('chromium', 'webkit'))
async def s_t310(br):
    # ---- Feedback: Start rounds says why it can't start
    c = await ctx(br); p, e = await open_(c, demo=False)
    await p.click('#rdStartBtn'); await p.wait_for_timeout(300)
    t = await p.evaluate("[window.__toasts,!!document.getElementById('rdMode')]")
    ok('Feedback · with no patients, Start rounds says why it can’t start (it did nothing)', t[1] is False and any('No patients on Rounds yet' in x for x in t[0]), t)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1200)
    await p.fill('#rdSearch', 'zzzz'); await p.wait_for_timeout(400); await p.click('#rdStartBtn'); await p.wait_for_timeout(300)
    t = await p.evaluate("[window.__toasts.slice(-1)[0],!!document.getElementById('rdMode')]")
    ok('…and with filters that match no one, it says to show all patients', t[1] is False and 'No patients match the filters' in (t[0] or ''), t)
    await p.evaluate("document.querySelector('[data-act=clear-filters]').click()"); await p.wait_for_timeout(400)

    # ---- Going full screen: Rounds mode picks up where you left it
    await p.click('#rdStartBtn'); await p.wait_for_timeout(500)
    for _ in range(2): await p.click('#rdMode [data-a=next]'); await p.wait_for_timeout(200)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    lab = await p.evaluate("[document.querySelector('#rdStartBtn .start-title').textContent,document.getElementById('rdStartBtn').getAttribute('aria-label')]")
    ok('Going full screen · after leaving Rounds mode on patient 3, the button reads “Resume rounds” (VoiceOver: “…at patient 3 of 8”)', lab == ['Resume rounds', 'Resume rounds at patient 3 of 8'], lab)
    await p.click('#rdStartBtn'); await p.wait_for_timeout(500)
    a = await p.evaluate(POS); f = await p.evaluate("!!document.querySelector('#rdMode [data-a=first]')")
    ok('…it resumes on patient 3 (it started again at 1), with “Start from patient 1” beside Exit', a == '3 OF 8' and f, (a, f))
    await p.click('#rdMode [data-a=first]'); await p.wait_for_timeout(300)
    ok('…which goes back to the first patient', await p.evaluate(POS) == '1 OF 8')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)

    # ---- File management: what you type is kept
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(700)
    pid = await p.evaluate("document.querySelector('.rd-row.open').dataset.pid")
    await p.fill('.rd-row.open input[data-input=client-id]', '141433'); await p.click('.rd-row.open [aria-label^="Assessment"]'); await p.wait_for_timeout(400)
    cid = await p.evaluate("rdFind(%s).rounds.clientId||null" % json.dumps(pid))
    ok('File management · Client ID saves when you leave the field (it saved only on Return)', cid == '141433', cid)
    await p.fill('.rd-row.open input[aria-label^="Add problem"]', 'Hypokalemia'); await p.wait_for_timeout(100)
    await p.fill('.rd-row.open [aria-label^="Assessment"]', 'Eating well'); await p.keyboard.press('Tab'); await p.wait_for_timeout(500)
    await p.evaluate("rdExpanded=null;renderRdCensus(true)"); await p.wait_for_timeout(300)
    await p.evaluate("document.querySelector('.rd-row[data-pid=%s] .rd-name').click()" % json.dumps(pid)); await p.wait_for_timeout(600)
    dr = await p.evaluate("(document.querySelector('.rd-row.open input[aria-label^=\"Add problem\"]')||{}).value")
    ok('…text typed in an Add field is still there after the patient redraws, or is closed and reopened (it was lost)', dr == 'Hypokalemia', dr)
    await p.focus('.rd-row.open input[aria-label^="Add problem"]'); await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    added = await p.evaluate("[rdFind(%s).rounds.problems.some(x=>/Hypokalemia/i.test(x.label)),(document.querySelector('.rd-row.open input[aria-label^=\"Add problem\"]')||{}).value,window.rdDrafts.size]" % json.dumps(pid))
    ok('…Return adds it and the draft is gone; drafts live in this tab’s memory only', added == [True, '', 0], added)
    st = await p.evaluate("localStorage.getItem('pvx:rounds:state')||''")
    ok('…and nothing typed is saved to the computer (the kept state is ids and filters, no names or text)', 'Hypokalemia' not in st and 'Eating' not in st, st[:120])
    ok('no page errors (feedback, full screen, drafts)', not newerr(e), e[:3]); await c.close()

    # ---- Launching: reopening Rounds restores the open patient and filters
    c = await ctx(br); p, e = await open_(c, path='/', demo=False)
    adm = await p.evaluate("""(async()=>{const x=patient({name:'Clover',last:'Reopen',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(Date.now()-90*60000),prio:2,doctor:'unassigned',species:'Feline',timeline:[]});
      PATIENTS.push(x); renderAll(); await new Promise(r=>setTimeout(r,400)); completePatient(x,'Admitted'); renderAll(); await new Promise(r=>setTimeout(r,1500));
      return {id:x.id, doc:window.__fs['visits/'+x.id]||null}})()""")
    await c.close()
    if not adm['doc']:
        ok('Launching · (Flow admitted the test patient)', False, adm); return
    c = await ctx(br, seed={'visits/' + adm['id']: adm['doc']})
    p, e = await open_(c, demo=False)
    await p.evaluate("document.querySelector('.rd-row[data-pid=%s] .rd-name').click()" % json.dumps(adm['id'])); await p.wait_for_timeout(600)
    await p.evaluate("(k=>document.querySelector('[data-act=svc-filter][data-key='+k+']').click())(rdFind(%s).rounds.service)" % json.dumps(adm['id'])); await p.wait_for_timeout(500)
    want = await p.evaluate("[rdExpanded,rdSvcFilter]")
    await p.reload(); await p.wait_for_timeout(4200)
    got = await p.evaluate("[rdExpanded,rdSvcFilter,!!document.querySelector('.rd-row.open[data-pid=%s]')]" % json.dumps(adm['id']))
    ok('Launching · reopening Rounds brings back the patient you had open and the filter you’d chosen (it came back to the top of an unfiltered census)', got == [want[0], want[1], True], (want, got))
    ok('no page errors (launch)', not newerr(e), e[:3]); await c.close()
