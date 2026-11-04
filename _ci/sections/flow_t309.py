"""Pravix Rounds — the n309 build's own checks: HIG Charting data, Collaboration and sharing, Drag and drop, Entering data
(Nov 2 2026), on Rounds' own page (and the one reader n309 adds to Flow's page). Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
CLIP = "window.__copied=[];try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.__copied.push(t);return Promise.resolve()}}})}catch(e){}"


async def page(br, path='/rounds/', seed=None, demo=True, vp=(1440, 900)):
    c = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    await c.add_init_script(CLIP)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(2800)
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return c, p, e

HOLD = """(async(el)=>{const r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',button:0,clientX:r.left+20,clientY:r.top+5,bubbles:true,isPrimary:true,pointerId:7}));
  await new Promise(r=>setTimeout(r,1600));return [...document.querySelectorAll('[role=menuitem]')].filter(e=>e.getClientRects().length).map(x=>x.textContent.trim())})"""


@section(id='t309', title='n309 · Rounds follows the HIG Charting data, Collaboration and sharing, Drag and drop and Entering data pages',
         apps=['rounds', 'flow'], topics=['rounds', 'charts', 'sharing', 'drag-and-drop', 'entering-data'], engines=('chromium', 'webkit'))
async def s_t309(br):
    c, p, e = await page(br)
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(800)
    # ---- Charting data
    rw = await p.evaluate("(()=>{const r=document.querySelector('.rd-row.open'),t=r.querySelector('.rd-est-track');return [t.getAttribute('role'),t.getAttribute('aria-label'),!!r.querySelector('.rd-est-dot'),(r.querySelector('.rd-est-none')||{}).textContent]})()")
    ok('Charting data · with no charges entered, the estimate runway doesn’t draw them as $0, says so, and describes itself to VoiceOver',
       rw[0] == 'img' and 'Current charges not entered' in (rw[1] or '') and rw[2] is False and rw[3] == 'Current charges not entered', rw)
    rw = await p.evaluate("""(async()=>{const row=document.querySelector('.rd-row.open'),p=rdFind(row.dataset.pid),a=rdAuth(p);a.bill=Math.round((a.estimate||1000)*.5);renderRdCensus(true);await new Promise(r=>setTimeout(r,300));
      const r=document.querySelector('.rd-row.open'),t=r.querySelector('.rd-est-track');return [t.getAttribute('aria-label'),!!r.querySelector('.rd-est-dot'),!r.querySelector('.rd-est-none')]})()""")
    ok('…with charges, it draws them and says them: “Current charges $X: N% of the $Y high end; low end $Z.”', rw[1] and rw[2] and '% of the' in rw[0] and rw[0].startswith('Current charges $'), rw)
    sp = await p.evaluate("""(()=>{const s=document.createElement('div');s.innerHTML='<svg class="rd-spark up"><polyline points="0,0 1,1"/></svg><svg class="rd-spark down"><polyline points="0,0 1,1"/></svg>';
      document.querySelector('.rd-row.open .rd-work').appendChild(s);const c=[...s.querySelectorAll('polyline')].map(x=>getComputedStyle(x).stroke);s.remove();return c})()""")
    ok('…a trend’s line shows its direction, and its colour doesn’t judge it (a falling value was drawn in the warning amber)', sp[0] == sp[1], sp)

    # ---- Entering data
    en = await p.evaluate("""(async()=>{const s=t=>new Promise(r=>setTimeout(r,t));const row=document.querySelector('.rd-row.open'),pid=row.dataset.pid,a=()=>rdAuth(rdFind(pid));
      const before=a().deposited;let fe=row.querySelector('.rd-fin-edit[data-fin-key=deposited]');fe.click();await s(150);let i=document.querySelector('.rd-fin-inline');
      i.value='4,7o0';i.dispatchEvent(new Event('input'));await s(30);const bad=[i.getAttribute('aria-invalid'),(document.querySelector('.rd-fin-msg')||{}).textContent,i.getAttribute('aria-label')];
      i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await s(80);const stays=!!document.querySelector('.rd-fin-inline')&&a().deposited===before;
      i.blur();await s(400);const kept=a().deposited===before&&!document.querySelector('.rd-fin-inline');
      fe=document.querySelector('.rd-row.open .rd-fin-edit[data-fin-key=deposited]');fe.click();await s(150);i=document.querySelector('.rd-fin-inline');i.value='$4,720.50';i.dispatchEvent(new Event('input'));
      i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await s(300);
      return {bad,stays,kept,good:a().deposited}})()""")
    ok('Entering data · an amount is checked as it’s typed: “4,7o0” is flagged beside the field, named for VoiceOver, and Return doesn’t save it (it saved $47)',
       en['bad'] == ['true', 'Numbers only, like 4,720.50', 'Deposit'] and en['stays'], en)
    ok('…leaving the field with a typo keeps the amount it had; a real amount (“$4,720.50”) saves', en['kept'] and en['good'] == 4720.5, en)
    ac = await p.evaluate("[...document.querySelectorAll('#view-rd-census input[type=text]')].filter(x=>x.getClientRects().length).map(x=>x.getAttribute('autocorrect')+'/'+x.getAttribute('spellcheck'))")
    ok('…Rounds’ fields hold clinical shorthand, so autocorrect and spelling suggestions are off (“midaz”, “pcv 27/6.0”)', ac and set(ac) == {'off/false'}, sorted(set(ac)))

    # ---- Collaboration and sharing
    pid = await p.evaluate("document.querySelector('.rd-row.open').dataset.pid")
    await p.evaluate("document.querySelector('.rd-row.open [data-act=share]').click()"); await p.wait_for_timeout(400)
    cp = await p.evaluate("window.__copied")
    ok('Collaboration and sharing · an open patient has Share…; on a Mac it copies a link to that patient on Rounds, with no name in it', cp == [f'http://127.0.0.1:{PORT}/rounds/#patient={pid}'], cp)

    # ---- Drag and drop: the touch-and-hold menu moves a patient without dragging
    await p.evaluate("document.querySelector('.rd-row.open .rd-name').click()"); await p.wait_for_timeout(500)
    grp = "document.querySelectorAll('#rdList .rd-secgroup.by-svc')[0]"
    before = await p.evaluate(f"[...{grp}.querySelectorAll(':scope > .rd-row')].map(r=>r.dataset.pid)")
    items = await p.evaluate(HOLD + f"({grp}.querySelector('.rd-row .rd-l2'))")
    ok('Drag and drop · rows you can drag into the rounds order can also be moved from the touch-and-hold menu: Move up, Move down (and Share…)', all(x in items for x in ['Move up', 'Move down', 'Share…', 'Show in Flow']), items)
    await p.evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.textContent.trim()==='Move down').click()"); await p.wait_for_timeout(600)
    after = await p.evaluate(f"[...{grp}.querySelectorAll(':scope > .rd-row')].map(r=>r.dataset.pid)")
    ok('…Move down moves it one place, like dragging it', len(before) >= 2 and after[:2] == [before[1], before[0]], (before, after))
    ok('no page errors (Rounds)', not newerr(e), e[:3]); await c.close()

    # ---- a real visit: Flow admits it; Rounds' link opens it; Rounds' "Show in Flow" opens its drawer in Flow
    c, p, e = await page(br, path='/', demo=False)
    adm = await p.evaluate("""(async()=>{const x=patient({name:'Juniper',last:'Linkfield',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(Date.now()-90*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]});
      PATIENTS.push(x); renderAll(); await new Promise(r=>setTimeout(r,400)); completePatient(x,'Admitted'); renderAll(); await new Promise(r=>setTimeout(r,1500));
      return {id:x.id, doc:window.__fs['visits/'+x.id]||null}})()""")
    await c.close()
    if not adm['doc']:
        ok('…(Flow admitted the test patient)', False, adm); return
    seed = {'visits/' + adm['id']: adm['doc']}
    c, p, e = await page(br, path='/rounds/#patient=' + adm['id'], seed=seed, demo=False)
    await p.wait_for_timeout(800)
    r = await p.evaluate("[rdExpanded,!!document.querySelector('.rd-row.open[data-pid=\"%s\"]'),location.hash]" % adm['id'])
    ok('Collaboration and sharing · that link opens Rounds with the patient open, and the address goes back to /rounds/', r == [adm['id'], True, ''], r)
    items = await p.evaluate(HOLD + "(document.querySelector('.rd-row[data-pid=\"%s\"] .rd-l2'))" % adm['id'])
    async with p.expect_navigation():
        await p.evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.textContent.trim()==='Show in Flow').click()")
    await p.wait_for_timeout(3500)
    fl = await p.evaluate("[location.pathname,typeof activePatient!=='undefined'?String(activePatient):null,!!document.querySelector('#drawer.open,.drawer.open')]")
    ok('…and “Show in Flow” opens that patient in Flow, now another page (it opened Flow’s board only)', fl[0] == '/' and (fl[1] == adm['id'] or fl[2]), fl)
    ok('no page errors (link, Flow)', not newerr(e), e[:3]); await c.close()
