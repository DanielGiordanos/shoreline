"""Anesia — the anesthesia record."""
from core import *
from helpers import *


@section(id='anesia_case', title='Anesia: one case from the list to sign-off (list, record, vitals in the Now column, give drug with quick picks, undo, weight change → pumps, infusion rate, event, strike through from the chart, offline, two at once, end, sign)',
         apps=['anesia'], topics=['behaviour', 'drugs', 'offline'])
async def s_anesia_case(br):
    # ── list
    try:
        ctx, pg, errs = await new_page(br)
        await pg.goto(URL); await pg.wait_for_selector('[data-open]')
        ok('list: title and training note', await pg.locator('h1').inner_text() == 'Anesia' and 'not part of the medical record' in await pg.inner_text('.an-lhead'))
        ok('list: in progress shows the 2 open cases', await pg.locator('.an-card').count() == 2)
        ok('top bar: Anesia is the current app', await pg.get_attribute('#navAnesia', 'aria-current') == 'page')
        await shot(pg, '01-list-dark')
    except Exception as _e:
        ok('SECTION ERROR — list', False, repr(_e)[:300])

    # ── record
    try:
        await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart')
        ok('header: weight is its own large control', (await pg.inner_text('#anWeight')).startswith('32.4') and 'Weighed' in await pg.inner_text('#anWeight'))
        ok('header: one line of facts and an info button; ASA in the summary', 'ASA' in await pg.inner_text('.an-sum') and 'II' in await pg.inner_text('.an-sum') and await pg.locator('#anPatient[aria-label="Patient details"]').count() == 1)
        ok('header: timer', '1:20' in await pg.inner_text('.an-clock'))
        nowc = await pg.inner_text('.an-nowcol')
        ok('Now column: latest HR, BP with mean, SpO2, EtCO2', '70' in nowc and '112/62' in nowc and '(79)' in nowc and 'SpO₂' in nowc, nowc[:300])
        ok('Now column: vitals due after 5 minutes', 'Vitals due · 5 min' in nowc and 'vitals due' in (await pg.get_attribute('[data-act=vitals]', 'aria-label')), nowc[:120])
        ok('Now column: gas settings and pumps', 'Isoflurane' in nowc and '1.75' in nowc and '9.72' in nowc and '162' in nowc)
        ok('Now column: trend lines', await pg.locator('.an-tile .an-spark').count() >= 5)
        ok('chart: one row per drug (fentanyl once)', await pg.evaluate("[...document.querySelectorAll('.an-lab b')].filter(b=>b.textContent==='Fentanyl').length") == 1)
        ok('chart: fentanyl row holds its bolus and its infusion', await pg.evaluate("(()=>{const rows=[...document.querySelectorAll('.an-row')].filter(r=>r.querySelector('.an-lab b')?.textContent==='Fentanyl');const t=rows[0].querySelector('.an-trk');return !!t.querySelector('.an-bar')&&!!t.querySelector('.an-mk')})()"))
        ok('chart: fluids in their own group', await pg.locator('.an-lab.grp:has-text("Fluids")').count() == 1)
        ok('chart: blood pressure on one row', await pg.locator('.an-lab b:text-is("BP")').count() == 1 and await pg.locator('.an-lab b:text-is("SAP")').count() == 0)
        ok('chart: one shared clock', await pg.evaluate("new Set([...document.querySelectorAll('.an-trk')].map(e=>e.style.width)).size===1"))
        ok('chart: scrolled to now', await pg.evaluate("(()=>{const c=document.querySelector('.an-chart'),n=document.querySelector('.an-now');const x=n.offsetLeft-c.scrollLeft;return x>0&&x<c.clientWidth})()"))
        cols = await pg.evaluate('''(()=>{const cs=getComputedStyle(document.body),acc=cs.getPropertyValue('--an-accent').trim();
          const nowBg=getComputedStyle(document.querySelector('.an-now')).backgroundColor;
          const mapLine=document.querySelector('.an-graph polyline').getAttribute('stroke');
          const hr=document.querySelector('.an-graph circle[r="4"]').getAttribute('fill');
          const bar=getComputedStyle(document.querySelector('.an-bar.c-opioid'),'::after').backgroundColor;
          return {acc,nowBg,mapLine,hr,bar,iso:getComputedStyle(document.querySelector('.an-bar.gas-iso'),'::after').backgroundColor,sevoVar:cs.getPropertyValue('--an-g-sevo').trim()}})()''')
        ok('colour: the now line is not the accent', 'rgb(56, 189, 210)' not in cols['nowBg'], cols)
        ok('colour: MAP line and HR dots use the vital colours', cols['mapLine'] == 'var(--an-bp)' and cols['hr'] == 'var(--an-hr)', cols)
        ok('colour: fentanyl infusion line is opioid blue, isoflurane purple', cols['bar'] == 'rgb(77, 163, 255)' and cols['iso'] == 'rgb(191, 140, 240)', cols)
        ok('colour: drug rows say their class', 'Opioid' in await pg.inner_text('.an-chart') and 'Induction' in await pg.inner_text('.an-chart'))
        acc_static = await pg.evaluate('''(()=>{const acc='rgb(56, 189, 210)';return [...document.querySelectorAll('#anApp *')].filter(e=>e.offsetParent&&!e.closest('button,a,[role=radio]')).filter(e=>{const c=getComputedStyle(e);return c.backgroundColor===acc||c.borderLeftColor===acc&&c.borderLeftWidth!=='0px'&&c.borderLeftStyle!=='none'}).map(e=>e.className).slice(0,5)})()''')
        ok('colour: cyan appears only on things you can tap', not acc_static, acc_static)
        ok('totals: hidden until asked for at 1440 px (the chart gets the room)', await pg.locator('#anInspector').count() == 0 and await pg.get_attribute('#anInsp', 'aria-pressed') == 'false')
        await shot(pg, '02-record-dark'); await shot(pg, '02b-record-dark-full', True)
        await pg.click('#anInsp'); await pg.wait_for_timeout(800)   # n175: totals count up for 650 ms
        tot = await pg.inner_text('#anInspector .an-tot')
        ok('totals: open on request; propofol 81 mg, fentanyl 405 mcg, struck-through methadone left out', '81 mg' in tot and ('405 mcg' in tot or '406 mcg' in tot) and '9.72 mg' in tot, tot)
        await shot(pg, '03-record-totals')
        await pg.click('#anInsp')
    except Exception as _e:
        ok('SECTION ERROR — record', False, repr(_e)[:300])

    # ── vitals in the Now column
    try:
        await pg.click('[data-act=vitals]'); await pg.wait_for_selector('#anVForm')
        ok('vitals: form opens in the Now column, focus on HR', await pg.evaluate("document.activeElement.id") == 'nv_hr')
        await pg.keyboard.type('84'); await pg.keyboard.press('Enter')
        ok('vitals: Return moves to the next field', await pg.evaluate("document.activeElement.id") == 'nv_rr')
        await pg.fill('#nv_hr', '900'); await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(150)
        ok('vitals: typing slip caught in place', await pg.get_attribute('#nv_hr', 'aria-invalid') == 'true' and 'Enter HR from' in await pg.inner_text('#anVForm'))
        await pg.fill('#nv_hr', '84'); await pg.fill('#nv_sap', '112'); await pg.fill('#nv_dap', '62'); await pg.fill('#nv_spo2', '99')
        await pg.evaluate("window.anesiaApp.render(true)")   # a save or the clock re-renders the page while typing
        ok('vitals: typing survives a re-render', await pg.input_value('#nv_sap') == '112')
        await shot(pg, '04-vitals-inline')
        await pg.focus('#nv_temp'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); v = d['vitals'][-1]
        ok('vitals: Return in the last field saves (MAP worked out: 79)', v.get('hr') == 84 and v.get('map') == 79 and v.get('mapCalc'), v)
        ok('vitals: due marker gone after saving', 'Vitals due' not in await pg.inner_text('.an-nowcol'))
        ok('saving: Saved after the server confirmed', (await pg.inner_text('#anSave')) == 'Saved')
        ok('undo offered', 'Undo' in await pg.inner_text('#anToast'))
        ok('focus back on Vitals now', await pg.evaluate("document.activeElement.getAttribute('data-act')") == 'vitals')
        ok('no "Fill with last values": every value is read off the monitor', await pg.locator('[data-vfill]').count() == 0)
        # motion: the new reading appears in place, the tile flashes once, the sheet eases in
        ok('motion: new vitals cells animate in', await pg.locator('.an-mon.fresh').count() >= 1)
        ok('motion: changed tiles flash', await pg.locator('.an-tile.chg').count() >= 1)
        ok('n170: changed values roll in digit by digit', await pg.locator('.an-tile .an-dg').count() >= 1)
        ok('n170: the new MAP point draws the line out to it', await pg.locator('.an-graph .an-draw').count() == 1 and await pg.locator('.an-graph .an-pt-new').count() >= 1)
        await pg.wait_for_timeout(800); await pg.evaluate("window.anesiaApp.render(true)")
        ok('motion: plays once (not again on the next re-render)', await pg.locator('.an-mon.fresh').count() == 0 and await pg.locator('.an-tile.chg').count() == 0)
        ok('n170: rolling and draw-in play once', await pg.locator('.an-dg').count() == 0 and await pg.locator('.an-draw').count() == 0 and await pg.locator('.an-pt-new').count() == 0)
        # future time
        await pg.click('[data-act=vitals]'); await pg.fill('#nv_hr', '80'); await pg.click('[data-vtime]'); await pg.fill('#nv_time', '16:30'); await pg.click('#anVForm [type=submit]')
        ok('vitals: a time in the future is refused', 'future' in await pg.inner_text('#anVForm'))
        await pg.click('[data-vcancel]'); await (pg.click('[data-vdrop]') if await pg.locator('[data-vdiscard]:not([hidden])').count() else pg.wait_for_timeout(1))
    except Exception as _e:
        ok('SECTION ERROR — vitals in the Now column', False, repr(_e)[:300])

    # ── give drug with quick picks, undo
    try:
        await pg.click('[data-act=dose]')
        ok('motion: the sheet rises in (grows from its button)', await pg.evaluate("getComputedStyle(document.querySelector('#anSheet .an-sheet')).animationName") in ('anRise', 'anMorphBig'))
        await pg.wait_for_timeout(120)
        ok('dose: recent drugs as one-tap picks, focus on the first', await pg.locator('#anSheet [data-pick]').count() >= 4 and await pg.evaluate("document.activeElement.hasAttribute('data-pick')"))
        ok('dose: route and time folded into one line', 'IV · Now' in await pg.inner_text('#anSheet') and not await pg.locator('#anSheet [name=time]').is_visible())
        await pick(pg, 'Propofol')
        ok('dose: picking a drug moves to the dose and uses its last unit', await pg.evaluate("document.activeElement.name") == 'dose' and await pg.input_value('#anSheet input[name=unit]') == 'mg/kg')
        await pg.keyboard.type('1')
        calc = await pg.inner_text('[data-calc]')
        ok('dose: the calculated amount is the hero (32.4 mg · 3.24 mL)', '32.4 mg · 3.24 mL' in calc, calc)
        await shot(pg, '05-dose-sheet')
        await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); nd = len(d['doses'])
        ok('dose: saved', abs(d['doses'][-1]['mg'] - 32.4) < 1e-9)
        await shot(pg, '06-undo-toast')
        await pg.click('#anUndo'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1')
        ok('undo: the dose leaves the record, the history keeps a line', len(d['doses']) == nd - 1 and 'Undid Propofol' in d['audit'][-1]['detail'])
        # Ctrl+Z
        await pg.click('[data-act=gas]'); await pg.click('#anSheet [data-chips=agent] [data-v=iso]'); await pg.click('[data-step="-1"]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); ng = len(d['gases'])
        await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); ok('Ctrl+Z undoes the last change', len(d['gases']) == ng - 1)
        # route change
        await pg.click('[data-act=dose]'); await pick(pg, 'Ketamine'); await pg.fill('#anSheet [name=dose]', '0.5')
        await pg.click('#anSheet [data-chips=unit] [data-v="mg/kg"]')
        await pg.click('[data-ropen]'); await pg.click('#anSheet [data-chips=route] [data-v=IM]')
        await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1')
        ok('dose: a drug from the full list, route changed to IM, one save', d['doses'][-1]['route'] == 'IM' and any(x['name'] == 'Ketamine' for x in d['drugs']))
        # big-dose guard
        await pg.click('[data-act=dose]'); await pick(pg, 'Propofol'); await pg.fill('#anSheet [name=dose]', '10')
        ok('dose: 5× the last dose asks for a check', await pg.locator('[data-big]').is_visible())
        await pg.keyboard.press('Escape')
        ok('Escape with typed values asks first (Discard your changes?)', await pg.locator('#anSheet [data-discard]:not([hidden])').count() == 1 and await pg.locator('#anSheet').count() == 1)
        await pg.click('#anSheet [data-drop]')
        ok('Discard closes the sheet at once (the page is usable while it eases out)', await pg.locator('#anSheet').count() == 0 and not await pg.evaluate("!!document.querySelector('[inert]')"))
        await pg.wait_for_timeout(250); ok('motion: the closing sheet is gone after its animation', await pg.locator('.an-scrim').count() == 0)
    except Exception as _e:
        ok('SECTION ERROR — give drug with quick picks, undo', False, repr(_e)[:300])

    # ── weight change → pumps
    try:
        await pg.click('#anWeight'); await pg.fill('[name=kg]', '30')
        imp = await pg.inner_text('[data-impact]')
        ok('weight: preview shows the new pump rates', '9.72 → 9 mL/h' in imp and '162 → 150 mL/h' in imp, imp)
        await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        ok('weight: banner says set the pumps', 'set the pumps' in await pg.inner_text('#anApp'))
        pumps = await pg.evaluate("[...document.querySelectorAll('.an-inf b')].map(b=>b.textContent)")
        ok('weight: Now column pumps 150 and 9 mL/h', any(x.startswith('150') for x in pumps) and any(x.startswith('9 ') for x in pumps), pumps)
        ok('weight: header shows 30 kg', (await pg.inner_text('#anWeight')).startswith('30'))
        await pg.click('#anPumpsSet')
    except Exception as _e:
        ok('SECTION ERROR — weight change → pumps', False, repr(_e)[:300])

    # ── infusion rate
    try:
        await pg.click('.an-inf li:has-text("Fentanyl") [data-inf]'); await pg.fill('#anSheet [name=rate]', '20')
        ok('infusion: new pump rate while typing (12 mL/h)', '12 mL/h' in await pg.inner_text('[data-pump]'))
        await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); ok('infusion: rate change saved', d['infusions'][1]['changes'][-1]['rate'] == 20)
    except Exception as _e:
        ok('SECTION ERROR — infusion rate', False, repr(_e)[:300])

    # ── event
    try:
        await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.fill('[name=note]', 'Training: hypotension drill'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); ok('event: note saved at now', d['events'][-1]['kind'] == 'note')
    except Exception as _e:
        ok('SECTION ERROR — event', False, repr(_e)[:300])

    # ── strike through from the chart
    try:
        await pg.click('.an-mon >> nth=0'); await pg.wait_for_selector('#anSheet [data-void]')
        await pg.click('[data-void]'); await pg.fill('[name=reason]', 'Artifact — cuff moved'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); ok('strike through: saved with name and reason', d['vitals'][0].get('void', {}).get('by') == 'Resident A')
    except Exception as _e:
        ok('SECTION ERROR — strike through from the chart', False, repr(_e)[:300])

    # ── offline
    try:
        await pg.evaluate("window.__fsOffline=true")
        await vitals_save(pg, {'hr': 81})
        await pg.wait_for_timeout(500); ok('offline: never says Saved', (await pg.inner_text('#anSave')) != 'Saved')
        await pg.wait_for_timeout(4200); ok('offline: says it will save when connected', 'Offline' in await pg.inner_text('#anSave'))
        await pg.reload(); await pg.wait_for_selector('.an-chart'); await pg.evaluate("window.__fsOffline=true")
        ok('offline: kept after a reload', '81' in await pg.inner_text('.an-nowcol'))
        await pg.evaluate("window.__fsOffline=false; window.dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(800)
        d = await store(pg, 'an_train1'); ok('back online: saved', d['vitals'][-1].get('hr') == 81 and (await pg.inner_text('#anSave')) == 'Saved')
    except Exception as _e:
        ok('SECTION ERROR — offline', False, repr(_e)[:300])

    # ── two at once
    try:
        await pg.evaluate("window.__fsOffline=true")
        await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=closure]'); await pg.click('[data-ok]')
        await pg.evaluate("""(()=>{ const A=window.Anesia, k='anesia_records/an_train1'; const cur=window.__fs[k];
            window.__fs[k]=JSON.parse(JSON.stringify(A.apply(cur,{type:'event',kind:'note',note:'From another computer',eid:'e_other'},{by:'Supervisor B',at:window.__anNow()}))); })()""")
        await pg.evaluate("window.__fsOffline=false; window.dispatchEvent(new Event('online'))")
        await until(pg, "(()=>{const d=window.__fs['anesia_records/an_train1'];return d&&d.events.some(e=>e.kind==='closure')&&d.events.some(e=>e.id==='e_other')})()", 6000)
        d = await store(pg, 'an_train1'); kinds = [e['kind'] for e in d['events']]
        ok('two at once: both changes kept', 'closure' in kinds and any(e.get('id') == 'e_other' for e in d['events']))
    except Exception as _e:
        ok('SECTION ERROR — two at once', False, repr(_e)[:300])

    # ── end, sign
    try:
        await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        await pg.click('#anREnd'); await pg.click('#anSheet [data-chips=dest] [data-v=ICU]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)   # n180: recovery first
        await pg.click('#anSign'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
        d = await store(pg, 'an_train1'); ok('end and sign', d['status'] == 'signed')
        ok('n170: signing locks the seal and the record settles', await pg.locator('.an-signed.just .an-seal').count() == 1 and await pg.locator('.an-body.settle').count() == 1)
        ok('n172: Add addendum uses Compose (pencil over a square), not Rename', 'M11 4.5H6.5' in await pg.inner_html('#anAdd'))
        ok('signed: tools and tiles off', await pg.locator('[data-act=vitals][disabled]').count() == 1 and await pg.locator('.an-tile[disabled]').count() == 6, [await pg.locator('[data-act=vitals]').count(), await pg.locator('[data-act=vitals][disabled]').count(), await pg.locator('.an-tile').count(), await pg.locator('.an-tile[disabled]').count(), await pg.locator('#anSheet').count()])
        await pg.click('#anPatient'); ok('signed: info shows details read-only', await pg.locator('#anSheet [data-ok]').count() == 0 and 'Labrador' in await pg.inner_text('#anSheet')); await pg.keyboard.press('Escape')
        await shot(pg, '07-signed')
        ok('no page errors (record flow)', not errs, errs)
        await ctx.close()
    except Exception as _e:
        ok('SECTION ERROR — end, sign', False, repr(_e)[:300])



@section(id='no_weight', title='no weight',
         apps=['anesia'], topics=['behaviour'])
async def s_no_weight(br):
    ctx, pg, errs = await new_page(br)
    await pg.goto(URL + '#r=an_train3'); await pg.wait_for_selector('.an-chart')
    ok('no weight: amber weight control and banner', await pg.locator('.an-wbig.none').count() == 1 and 'No weight on file' in await pg.inner_text('#anApp'))
    ok('empty groups hidden (no Gases, Drugs or Events yet)', await pg.locator('.an-lab.grp').all_inner_texts() == ['Vitals'], await pg.locator('.an-lab.grp').all_inner_texts())
    await pg.click('[data-act=dose]'); await pick(pg, 'Propofol'); await pg.fill('#anSheet [name=dose]', '4')
    ok('no weight: not calculated', 'Needs a weight' in await pg.inner_text('[data-calc]'))
    await pg.click('[data-ok]'); ok('no weight: refused without the typed dose', await pg.get_attribute('[name=mgGiven]', 'aria-invalid') == 'true')
    await pg.fill('[name=mgGiven]', '40'); await pg.click('[data-ok]'); ok('no weight: refused without the confirmation', await pg.locator('#anSheet').count() == 1)
    await pg.check('[name=confirmNoWeight]'); await shot(pg, '08-noweight-dose'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
    d = await store(pg, 'an_train3'); ok('no weight: saved as typed 40 mg', d['doses'][-1]['mg'] == 40 and d['doses'][-1].get('noWeight'))
    await pg.click('[data-act=infusion]'); await pick(pg, 'Fentanyl'); await pg.fill('#anSheet [name=rate]', '5')
    ok('no weight: per-kg infusion blocked', 'Needs a weight' in await pg.inner_text('[data-calc]'))
    await pg.click('[data-ok]'); ok('no weight: infusion not started', await pg.locator('#anSheet').count() == 1)
    await pg.click('[data-x]'); ok('no page errors (no weight)', not errs, errs)
    await ctx.close()


@section(id='new_record', title='new record',
         apps=['anesia'], topics=['behaviour'])
async def s_new_record(br):
    ctx, pg, errs = await new_page(br, seed=False)
    await pg.goto(URL); await pg.wait_for_selector('.an-empty')
    await pg.click('#anNew')
    ok('new: Create waits for a name', await pg.locator('#anSheet [data-ok][disabled]').count() == 1)
    ok('new: ASA is a set of chips', await pg.locator('#anSheet [data-chips=asa] .an-chip').count() == 6)
    await pg.fill('[name=name]', 'Training dog 9'); await pg.fill('[name=kg]', '18.2'); await pg.click('[data-ok]')
    await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    keys = await pg.evaluate("Object.keys(window.__fs).filter(k=>k.startsWith('anesia_records/'))"); d = await store(pg, keys[0].split('/')[1]) if keys else None
    ok('new: created as a training record with weight', d and d['kind'] == 'training' and (d['patient']['weights'] or [{}])[0].get('kg') == 18.2, d and d['patient'])
    ok('n161: a new record is not confirmed: chip, prompt and watermark', await pg.locator('#anConfirm').count() == 1 and await pg.locator('.an-confirm').count() == 1 and await pg.locator('.an-chartp.unconf .an-wm').count() == 1)
    await pg.evaluate("""(()=>{window.__seen170={};const chk=()=>{if(document.querySelector('.an-wm.gone'))__seen170.wm=1;if(document.querySelector('.an-pill.conf.drawn'))__seen170.pill=1;};new MutationObserver(chk).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});})()""")   # n213: record the sweep whenever it happens
    await pg.click('#anStart'); await pg.wait_for_timeout(150)
    ok('n161: Start asks to confirm the patient first', (await pg.inner_text('#anShT')) == 'Confirm patient' and 'Training dog 9' in await pg.inner_text('#anSheet .an-cfm'))
    await pg.click('[data-ok]'); await pg.wait_for_timeout(400)
    ok('n161: after confirming, it carries on to Start', (await pg.inner_text('#anShT')) == 'Start anesthesia')
    await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
    d = await store(pg, keys[0].split('/')[1]); ok('new: anesthesia started', d['status'] == 'active')
    ok('n161: confirmation saved with who and when', d.get('confirmed') and d['confirmed']['by'] == 'Resident A')
    ok('n161: chip turns green, prompt and watermark gone', await pg.locator('.an-pill.conf').count() == 1 and await pg.locator('.an-confirm').count() == 0 and await pg.locator('.an-wm:not(.gone)').count() == 0)
    await until(pg, "!!(window.__seen170&&__seen170.wm&&__seen170.pill)", 1500)
    ok('n170: confirming sweeps the watermark away and draws the check', await pg.evaluate("!!(window.__seen170&&__seen170.wm&&__seen170.pill)"))
    await pg.wait_for_timeout(1000); await pg.evaluate("window.anesiaApp.render(true)")
    ok('n170: and only once', await pg.locator('.an-wm').count() == 0 and await pg.locator('.an-pill.conf.drawn').count() == 0)
    await shot(pg, '09-new-active')
    ok('no page errors (new)', not errs, errs)
    await ctx.close()


@section(id='n155', title='n155: the HIG audit fixes',
         apps=['anesia', 'flow'], topics=['behaviour'])
async def s_n155(br):
    ctx, pg, errs = await new_page(br)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    ok('n155: the patient name is the page heading (h1)', (await pg.inner_text('.an-id h1')).startswith('Training dog 4'))
    ok('n155: every toolbar button has a name and a tooltip with its shortcut', await pg.evaluate("[...document.querySelectorAll('.an-tools [data-act]')].every(b=>b.getAttribute('aria-label')&&/⌥/.test(b.title))"))
    ok('n155: "vitals due" is in the button name', 'vitals due' in (await pg.get_attribute('[data-act=vitals]', 'aria-label')))
    ok('n155: time ticks hidden from VoiceOver', await pg.get_attribute('.an-row.time .an-trk', 'aria-hidden') == 'true')
    g = await pg.get_attribute('.an-graph', 'aria-label')
    ok('n155: the graph has a spoken summary', 'heart rate' in g and 'blood pressure' in g, g)
    ok('n155: rows are headings for the rotor', await pg.locator('.an-chart [role=heading]').count() >= 10)
    ok('n155: axis units shown', 'bpm · mmHg' in await pg.inner_text('.an-legend'))
    hit = await pg.evaluate("getComputedStyle(document.querySelector('.an-mk'),'::after').height")
    ok('n155: chart markers have a 44 pt touch area', hit == '44px', hit)
    ok('n155: one Tab stop per chart row', await pg.evaluate("[...document.querySelectorAll('.an-chart .an-trk')].filter(t=>t.querySelector('button')).every(t=>[...t.querySelectorAll('button')].filter(b=>b.tabIndex===0).length===1)"))
    await pg.focus('.an-mon[tabindex="0"] >> nth=0'); before = await pg.evaluate("document.activeElement.getAttribute('data-entry')")
    await pg.keyboard.press('ArrowLeft'); after = await pg.evaluate("document.activeElement.getAttribute('data-entry')")
    ok('n155: arrow keys move between readings', before != after and after and after.startswith('vitals:'))
    await pg.evaluate("document.querySelector('.an-chart').dataset.keep='1'; window.__anSkip=(window.__anSkip||0)+60000; window.anesiaApp.tick()")
    ok('n155: the clock ticks in place (no rebuild, VoiceOver keeps its place)', await pg.evaluate("document.querySelector('.an-chart').dataset.keep") == '1' and '1:21' in await pg.inner_text('.an-clock'))
    ok('n155: first-run tips shown once', await pg.locator('.an-tips').count() == 1)
    await pg.click('#anTipsOk'); ok('n155: tips dismissed and remembered', await pg.locator('.an-tips').count() == 0 and await pg.evaluate("localStorage.getItem('anesia:v1:tip:value')") == '1')
    await pg.evaluate("firebase.firestore().collection('anesia_presence').doc('an_train1_u2').set({tenant_id:'shoreline',rec:'an_train1',uid:'u2',name:'Supervisor B',at:Date.now()})")
    await pg.wait_for_timeout(200)
    ok('n155: shows who else has the record open', 'Also open: Supervisor B' in await pg.inner_text('.an-id h1'))
    ok('n155: my own presence is written', await pg.evaluate("!!window.__fs['anesia_presence/an_train1_u1']"))
    await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=position]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(250)
    await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=closure]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(250)
    n0 = len((await store(pg, 'an_train1'))['events'])
    await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(250); await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(250)
    ok('n155: ⌘Z steps back through several changes', len((await store(pg, 'an_train1'))['events']) == n0 - 2)
    ok('n155: the message offers Redo and stays (no time limit)', 'Redo' in await pg.inner_text('#anToast'))
    await pg.keyboard.press('Control+Shift+z'); await pg.wait_for_timeout(250)
    ok('n155: ⇧⌘Z redoes', len((await store(pg, 'an_train1'))['events']) == n0 - 1)
    await pg.click('[data-act=event]'); await pg.fill('#anSheet [name=note]', 'half typed'); await pg.mouse.click(5, 400)
    ok('n155: a stray tap outside a sheet with typing asks first', await pg.locator('#anSheet [data-discard]:not([hidden])').count() == 1)
    await pg.click('#anSheet [data-keep]'); ok('n155: Keep editing keeps the text', await pg.input_value('#anSheet [name=note]') == 'half typed')
    await pg.click('#anSheet [data-x]'); await pg.click('#anSheet [data-drop]')
    await pg.click('[data-act=vitals]'); await pg.fill('#nv_hr', '77'); await pg.keyboard.press('Escape')
    ok('n155: Esc in the vitals form asks before discarding', await pg.locator('[data-vdiscard]:not([hidden])').count() == 1)
    await pg.click('[data-vkeep]')
    await pg.fill('#nv_hr', '600'); await pg.focus('#nv_rr'); await pg.wait_for_timeout(50)
    ok('n155: a value is checked when you leave its box', 'Enter HR from' in await pg.inner_text('#nve_hr'))
    await pg.fill('#nv_hr', '77')
    await pg.reload(); await pg.wait_for_selector('.an-chart'); await pg.click('[data-act=vitals]')
    ok('n155: half-typed vitals survive a reload', await pg.input_value('#nv_hr') == '77')
    await pg.click('[data-vcancel]'); await pg.click('[data-vdrop]')
    await pg.click('[data-act=dose]')
    sel = await pg.evaluate("getComputedStyle(document.querySelector('#anSheet [data-chips=unit] [aria-pressed=true]')).backgroundColor")
    ok('n155: a selected chip is tinted, not filled cyan', sel != 'rgb(56, 189, 210)', sel)
    await pg.click('#anSheet [data-pick=other]'); await pg.fill('#anSheet [data-dfind]', 'keta')
    ok('n155: typing filters the drug list', 'Ketamine' in await pg.evaluate("document.querySelector('#anSheet [name=drug]').selectedOptions[0].textContent"))
    ok('n155: hints are read with their field', await pg.evaluate("(()=>{const c=document.querySelector('#anSheet [name=conc]');const id=c.getAttribute('aria-describedby');return !!id&&!!document.getElementById(id.split(' ')[0])})()"))
    await pg.click('#anSheet [data-x]')
    if await pg.locator('#anSheet [data-discard]:not([hidden])').count(): await pg.click('#anSheet [data-drop]')
    await pg.wait_for_timeout(250)
    await pg.click('.an-mk.c-induction >> nth=0')
    ok('n155: entry details open as a popover beside the marker', await pg.locator('#anSheet.pop').count() == 1)
    await pg.click('#anSheet [data-void]')
    ok('n155: strike-through is styled as destructive and says it is final', await pg.locator('#anSheet [data-ok].destr').count() == 1 and 'can’t be undone' in await pg.inner_text('#anSheet'))
    await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(250)
    await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"10\"]').click();0"); await pg.reload(); await pg.wait_for_selector('.an-chart')
    ok('n155: zoom remembered on this device', await pg.get_attribute('[data-zoom="10"]', 'aria-checked') == 'true')
    await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"5\"]').click();0")
    await pg.click('#anInsp'); await pg.wait_for_timeout(700)
    ok('n155: Totals below 1500 px scrolls into view and takes focus', await pg.evaluate("document.activeElement.id") == 'anTotH' and await pg.evaluate("(()=>{const r=document.getElementById('anInspector').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})()"))
    ok('n155: History shows the latest 20 with Show all', await pg.locator('#anHistAll').count() == 1 and await pg.locator('#anInspector .an-hist li').count() == 20)
    await pg.click('#anInsp')
    ok('n155: drug labels wrap instead of cutting words', await pg.evaluate("[...document.querySelectorAll('.an-lab span')].every(s=>s.scrollHeight<=s.clientHeight+1)"))
    await pg.click('#anShare'); await pg.wait_for_timeout(200)
    ok('n155: Share copies the link (or shows it)', 'link' in (await pg.inner_text('#anToast')).lower())
    ok('n155: Home Screen icon and manifest', await pg.evaluate("!!document.querySelector('link[rel=apple-touch-icon]')&&!!document.querySelector('link[rel=manifest]')"))
    mf = await pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())"); ok('n155: manifest is standalone', mf.get('display') == 'standalone')
    await pg.evaluate("location.hash=''"); await pg.wait_for_selector('.an-lhead')
    await pg.evaluate("window.anesiaApp.S.loaded=false; window.anesiaApp.render()")
    ok('n155: placeholders while records load, never "no cases"', await pg.locator('.an-skel').count() == 3 and await pg.locator('.an-empty').count() == 0)
    await pg.evaluate("window.anesiaApp.S.loaded=true; window.anesiaApp.render()")
    ok('n155: the list filter is a radio group with arrow keys', await pg.get_attribute('.an-seg', 'role') == 'radiogroup')
    await pg.focus('[data-f=active]'); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(100)
    ok('n155: arrow keys switch the list filter', await pg.get_attribute('[data-f=ended]', 'aria-checked') == 'true')
    ok('no page errors (n155 block)', not errs, errs)
    await ctx.close()
    ctx, pg, errs = await new_page(br)
    await pg.goto(URL + '#r=an_train2'); await pg.wait_for_selector('.an-chart')
    ok('n155: Print on an ended record', await pg.locator('#anPrint').count() == 1)
    await pg.emulate_media(media='print'); await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    ok('n155: print layout fits the chart to the page', 'scale' in (await pg.evaluate("document.querySelector('.an-chart-in').style.transform")) or await pg.evaluate("document.querySelector('.an-chart-in').scrollWidth<=1000"))
    ok('n155: totals print even when the panel is closed', await pg.evaluate("getComputedStyle(document.querySelector('.an-print-only')).display") == 'block')
    await pg.pdf(path=os.path.join(SHOTS, '16-print.pdf'), landscape=True)
    await pg.emulate_media(media='screen')
    ok('no page errors (print)', not errs, errs)
    await ctx.close()
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, color_scheme='light', timezone_id='America/Los_Angeles')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL); await pg.wait_for_selector('.an-lhead')
    ok('n155: with no saved choice, light device → light Anesia', not await pg.evaluate("document.body.classList.contains('dark')"))
    await ctx.close()
    ctx, pg, errs = await new_page(br, 'null'); await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-gate')
    ok('n155: Sign in on Flow returns here', 'next=%2Fanesia%2F%23r%3Dan_train1' in await pg.get_attribute('.an-gate a', 'href'))
    ok('n155: the sign-in card is not a fake dialog', await pg.locator('.an-gate[role=dialog]').count() == 0)
    await ctx.close()


@section(id='n158', title='n158: glass on the floating layer only, with a guard',
         apps=['anesia'], topics=['materials'])
async def s_n158(br):
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    g = await pg.evaluate("""(()=>{const bf=e=>{const c=getComputedStyle(e);return c.backdropFilter||c.webkitBackdropFilter||'none'};
      return {tools:bf(document.querySelector('.an-tools > .an-group')),tile:bf(document.querySelector('.an-tile')),chart:bf(document.querySelector('.an-chartp')),pos:getComputedStyle(document.querySelector('.an-tools')).position}})()""")
    ok('n158: the toolbar is glass and sticks over the chart', 'blur' in g['tools'] and g['pos'] == 'sticky', g)
    ok('n158: content (tiles, chart) is never glass', g['tile'] == 'none' and g['chart'] == 'none', g)
    await pg.click('[data-act=dose]'); await pg.wait_for_timeout(400)
    ok('n158: sheets are frosted solid (no blur cost)', await pg.evaluate("getComputedStyle(document.querySelector('#anSheet .an-sheet')).backdropFilter") in ('none', ''))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.evaluate("localStorage.setItem('anesia:v1:blur','0')"); await pg.reload(); await pg.wait_for_selector('.an-chart')
    ok('n158: a device that could not keep up stays on frosted solid', await pg.evaluate("document.documentElement.classList.contains('an-noblur') && getComputedStyle(document.querySelector('.an-tools > .an-group')).backdropFilter==='none'"))
    ok('n158: one "Last check" line instead of an age on every tile', 'Last check' in await pg.inner_text('.an-nh') and await pg.locator('.an-tile .f .same').count() >= 5)
    ok('n158: Vitals now has no badge dot', await pg.locator('.an-dot').count() == 0)
    ok('no page errors (n158 block)', not errs, errs)
    await ctx.close()


@section(id='n159', title='n159: grouped glass toolbar, scroll edge, shrink on scroll, morphing popovers',
         apps=['anesia'], topics=['materials', 'toolbars', 'sheets-alerts'])
async def s_n159(br):
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    cl = await pg.evaluate("""(()=>{const g=e=>getComputedStyle(e).color;return {tool:g(document.querySelector('[data-act=dose]')),ink:getComputedStyle(document.body).getPropertyValue('--an-ink').trim(),pills:[...document.querySelectorAll('.an-tools > *')].filter(e=>/blur/.test(getComputedStyle(e).backdropFilter)).length}})()""")
    ok('n159: tool labels on glass are monochrome (only Vitals now is coloured)', cl['tool'] == 'rgb(29, 29, 31)', cl)
    ok('n159: the toolbar is grouped glass pills (Give drug group, zoom; Totals and Vitals now are drawer cards since n174)', cl['pills'] == 2, cl)
    await pg.mouse.wheel(0, 200); await pg.wait_for_timeout(150); await pg.mouse.wheel(0, 200); await pg.wait_for_timeout(250)
    st = await pg.evaluate("[document.documentElement.classList.contains('an-stuck'),document.documentElement.classList.contains('an-compact'),getComputedStyle(document.querySelector('[data-act=dose] .t')).display]")
    ok('n159: scroll edge fade appears once content runs under the bar', st[0], st)
    ok('n159: scrolling down shrinks the toolbar to icons', st[1] and st[2] == 'none', st)
    await pg.mouse.wheel(0, -60)
    # wait for the result rather than a fixed 250 ms: a busy machine delivers the wheel's scroll later (it failed now and then)
    ok('n159: scrolling up brings the labels back', await until(pg, "!document.documentElement.classList.contains('an-compact')", 3000))
    ok('n159: compact tools keep their names for VoiceOver', await pg.get_attribute('[data-act=dose]', 'aria-label') == 'Give drug')
    await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(200)
    await pg.click('.an-mk.c-induction >> nth=0')
    # wait for the popover (it stays .pop.morph while open) instead of a fixed 100 ms, which a busy machine sometimes missed
    ok('n159: the popover grows out of the marker you tapped', await until(pg, "!!document.querySelector('#anSheet.pop.morph')&&/px/.test((document.querySelector('#anSheet .an-sheet')||{style:{}}).style.transformOrigin||'')", 3000))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.click('[data-act=dose]'); await pg.wait_for_timeout(100)
    ok('n159: a sheet grows out of the button that opened it', await pg.locator('#anSheet.morph.big').count() == 1)
    ok('n159: sheets have the larger corner radius', await pg.evaluate("getComputedStyle(document.querySelector('#anSheet .an-sheet')).borderTopLeftRadius") == '28px')
    ok('no page errors (n159 block)', not errs, errs)
    await ctx.close()


@section(id='n161', title='n161: patient summary, outputs and fluid balance, weight method',
         apps=['anesia', 'flow'], topics=['behaviour'])
async def s_n161(br):
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    ok('n161: summary shows code status and allergies as not recorded', 'Not recorded' in await pg.inner_text('.an-sum .none >> nth=0') and await pg.locator('.an-sum .none').count() == 3 and 'Time-out' in await pg.inner_text('.an-sum'))
    ok('n161: records from before n161 need no confirming', await pg.locator('#anConfirm').count() == 0 and await pg.locator('.an-wm').count() == 0)
    await pg.click('.an-sum [data-sum] >> nth=0'); await pg.wait_for_selector('#anSheet [data-chips=cpr]')
    await pg.click('#anSheet [data-chips=cpr] [data-v=DNR]'); await pg.fill('#anSheet [name=allergies]', 'Penicillin'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n161/n177: DNR shows in the Code item with Flow’s flat line', await pg.locator('.an-sum .dnr-pill.mini').count() == 1 and 'DNR' in await pg.inner_text('.an-sum .dnr-pill.mini'))
    ok('n161: allergies show in amber', 'Penicillin' in await pg.inner_text('.an-sum .alg'))
    d = await store(pg, 'an_train1'); ok('n161: code status and allergies saved', d['patient']['cpr'] == 'DNR' and d['patient']['allergies'] == 'Penicillin')
    await pg.click('[data-act=output]'); await pg.wait_for_selector('#anSheet [data-chips=kind]')
    await pg.click('#anSheet [data-chips=kind] [data-v=urine]'); await pg.fill('#anSheet [name=mL]', '45'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    await pg.click('[data-act=output]'); await pg.click('#anSheet [data-chips=kind] [data-v=ebl]'); await pg.fill('#anSheet [name=mL]', '20'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n161: outputs on the chart under Fluids', await pg.locator('.an-mk.out').count() == 2 and 'Output' in await pg.inner_text('.an-chart'))
    ok('n161: fluid balance in the Now column', 'Fluid balance' in await pg.inner_text('.an-nowcol') and 'out 65' in await pg.inner_text('.an-nowcol'))
    await pg.click('#anInsp'); await pg.wait_for_timeout(500)
    bal = await pg.inner_text('.an-bal')
    ok('n161: Totals has a fluid balance: in, out, urine mL/kg/h, net', 'Blood loss' in bal and 'Urine' in bal and 'mL/kg/h' in bal and 'Net' in bal, bal)
    await pg.click('#anInsp'); await pg.wait_for_timeout(700)   # n212: let the Totals pane finish closing before tapping the chart (was a timing flake)
    await pg.click('.an-mk.out.k-urine'); await pg.wait_for_selector('#anShT', timeout=5000)
    ok('n161: an output opens its details', (await pg.inner_text('#anShT')) == 'Urine' and '45 mL' in await pg.inner_text('#anSheet'))
    await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(250)
    await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
    ok('n161: ⌘Z takes back the last output', len((await store(pg, 'an_train1')).get('outputs', [])) == 1)
    await pg.click('#anWeight'); await pg.fill('#anSheet [name=kg]', '32.4'); await pg.click('#anSheet [data-chips=method] [data-v=estimated]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n161: an estimated weight says so', 'Estimated' in await pg.inner_text('#anWeight'))
    ok('no page errors (n161 block)', not errs, errs)
    await ctx.close()


@section(id='n163', title='n163: antibiotics, airway & lines, ventilation, time-out, team, more monitors',
         apps=['anesia'], topics=['behaviour'])
async def s_n163(br):
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    ok('n163: cefazolin shows under Antibiotics with no timer until one is set', await pg.locator('.an-abx.unset').count() == 1 and 'Set timer' in await pg.inner_text('.an-abx'))
    await pg.click('.an-abx'); await pg.wait_for_selector('#anSheet [name=min]')
    ok('n163: the redose sheet says no interval is built in', 'no built-in interval' in await pg.inner_text('#anSheet'))
    await pg.fill('#anSheet [name=min]', '90'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n163: countdown to the redose', 'in ' in await pg.inner_text('.an-abx b') and await pg.locator('.an-abx.ok').count() == 1, await pg.inner_text('.an-abx'))
    await pg.click('[data-act=airway]'); await pg.wait_for_selector('#anSheet [data-chips=kind]')
    await pg.click('#anSheet [data-chips=kind] [data-v=ett]')
    ok('n163: ET tube shows the cuff choice and hides the site', await pg.locator('#anSheet [data-cuffbox]:not([hidden])').count() == 1 and await pg.locator('#anSheet [data-sitebox][hidden]').count() == 1)
    await pg.fill('#anSheet [name=size]', '9.0 mm'); await pg.click('#anSheet [data-chips=cuff] [data-v=cuffed]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n163: airway on the chart and in the Now column', await pg.locator('.an-bar.dev').count() == 1 and 'ET tube' in await pg.inner_text('.an-nowcol'))
    await pg.click('[data-act=airway]'); await pg.click('#anSheet [data-atab=vent]'); await pg.click('#anSheet [data-chips=mode] [data-v=vc]'); await pg.fill('#anSheet [name=tv]', '350'); await pg.fill('#anSheet [name=peep]', '5'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n163: ventilation row with its settings', await pg.locator('.an-bar.vent').count() == 1 and 'TV 350' in await pg.inner_text('.an-bar.vent') and 'Volume control' in await pg.inner_text('.an-nowcol'))
    await pg.click('.an-bar.dev'); await pg.click('#anSheet [data-remove]'); await pg.wait_for_timeout(200); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    d = await store(pg, 'an_train1'); ok('n163: removing the tube records the time', d['devices'][0]['end'] is not None and 'ET tube' not in await pg.inner_text('.an-nowcol'))
    await pg.click('[data-sto]'); await pg.wait_for_selector('#anSheet .an-toi')
    ok('n163: time-out lists 8 items with the facts to check', await pg.locator('#anSheet .an-toi').count() == 8 and 'Training dog 4' in await pg.inner_text('#anSheet .an-toi >> nth=0'))
    for i in range(7): await pg.click(f'#anSheet .an-toi >> nth={i}')
    await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n163: a partial time-out shows what is open', '1 not done' in await pg.inner_text('.an-sum'))
    await pg.click('[data-act=event]'); await pg.wait_for_timeout(150)
    ok('n163: the event sheet reminds you before incision', await pg.locator('#anSheet .an-towarn').count() == 1)
    await pg.click('#anSheet [data-dotimeout]'); await pg.wait_for_selector('#anSheet .an-toi'); await pg.click('#anSheet .an-toi >> nth=7'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    ok('n163: complete time-out shows Done', 'Done' in await pg.inner_text('.an-sum'))
    await pg.click('[data-steam]'); await pg.wait_for_selector('#anSheet .an-team')
    await pg.fill('#anSheet [name=name]', 'Technician C'); await pg.click('#anSheet [data-chips=role] [data-v=technician]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    await pg.click('[data-steam]'); await pg.click('#anSheet [data-hand]'); await pg.wait_for_timeout(200); await pg.fill('#anSheet [name=name]', 'Technician D'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
    d = await store(pg, 'an_train1'); ok('n163: handoff closes one and opens the next', [x['name'] for x in d['staff'] if not x.get('to')] == ['Technician D'] and any(x.get('to') for x in d['staff']))
    await pg.click('[data-act=vitals]'); await pg.click('[data-vmore]'); await pg.fill('#nv_fio2', '98'); await pg.fill('#nv_tof', '4'); await pg.select_option('#nv_ecg', 'sinus'); await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(350)
    ch = await pg.inner_text('.an-chart')
    ok('n163: FiO₂, TOF and ECG rows appear once used', 'FiO₂' in ch and 'TOF' in ch and 'ECG' in ch and 'Sinus' in ch)
    await pg.click('#anInsp'); await pg.wait_for_timeout(400)
    insp_t = await pg.inner_text('#anInspector'); ok('n163: the case log lists airway, ventilation, team and time-out', all(x in insp_t for x in ['ET tube', 'Ventilation', 'Technician D', 'Time-out complete']), insp_t[-400:])
    await pg.click('#anInsp')
    await pg.evaluate("window.__anSkip=(window.__anSkip||0)+95*60000; window.anesiaApp.tick()"); await pg.wait_for_timeout(300)
    ok('n163: a missed redose turns red', await pg.locator('.an-abx.late').count() == 1 and 'late' in await pg.inner_text('.an-abx b'), await pg.inner_text('.an-abx'))
    ok('n170: the antibiotic timer icon nudges once when the redose comes due', await pg.locator('.an-abxic.nudge').count() == 1)
    await pg.wait_for_timeout(900); await pg.evaluate("window.anesiaApp.render(true)")
    ok('n170: the nudge does not repeat', await pg.locator('.an-abxic.nudge').count() == 0)
    ok('no page errors (n163 block)', not errs, errs)
    await ctx.close()


@section(id='n164', title='n164: Apple typography and Larger Text',
         apps=['anesia'], topics=['typography'])
async def s_n164(br):
    TXT = """(()=>{const o=[];const w=document.createTreeWalker(document.querySelector('#anApp'),NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.textContent.trim();if(!t)continue;const e=n.parentElement;const r=e.getBoundingClientRect();if(!r.width)continue;const s=getComputedStyle(e);if(s.visibility==='hidden')continue;o.push({sz:parseFloat(s.fontSize),w:s.fontWeight,ls:s.letterSpacing,seg:!!e.closest('.an-seg,.an-zoomseg'),caps:!!e.closest('.an-wm,.an-sum-i.dnr')});}return o})()"""
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL); await pg.wait_for_selector('.an-lhead'); tx = await pg.evaluate(TXT)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); tx += await pg.evaluate(TXT)
    await pg.click('[data-act=dose]'); await pg.wait_for_timeout(350); tx += await pg.evaluate(TXT); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
    await pg.click('#anInsp'); await pg.wait_for_timeout(350); tx += await pg.evaluate(TXT)
    sizes = sorted(set(x['sz'] for x in tx))
    ok('n164: every text size is an Apple text style (34·28·22·20·17·16·15·13·12)', set(sizes) <= {34, 28, 22, 20, 17, 16, 15, 13, 12}, sizes)
    ok('n164: no light weights; Medium only in segmented controls', all(x['w'] in ('400', '600', '700', '800') or (x['w'] == '500' and x['seg']) for x in tx), sorted(set((x['w'], x['seg']) for x in tx)))
    ok('n164: no hand tracking (SF tracks itself), except all-caps labels', all(x['ls'] == 'normal' or x['caps'] for x in tx), sorted(set(x['ls'] for x in tx)))
    ok('n164: one system family plus SF Rounded for numbers', await pg.evaluate("[...new Set([...document.querySelectorAll('#anApp *')].map(e=>getComputedStyle(e).fontFamily.split(',')[0].trim()))].length") <= 3)
    await ctx.close()
    BIG = """(()=>{const ov=(a,b)=>{if(!a||!b)return false;const r=a.getBoundingClientRect(),s=b.getBoundingClientRect();return r.left<s.right&&s.left<r.right&&r.top<s.bottom&&s.top<r.bottom};
      const tr=[...document.querySelectorAll('#anApp *')].filter(e=>{const s=getComputedStyle(e);return s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1&&e.offsetParent&&!e.closest('[aria-hidden=true]')}).length;   /* the toolbar copy of the name may truncate; the title itself may not */
      const h1=document.querySelector('.an-id h1');return {cls:document.documentElement.className,hs:document.documentElement.scrollWidth>innerWidth,tr:tr,ov:ov(h1,document.querySelector('#anWeight'))||ov(h1,document.querySelector('.an-ract'))}})()"""
    for vp, px in (((1180, 820), 23), ((1180, 820), 28), ((390, 844), 28), ((390, 844), 33), ((1440, 900), 17)):
        ctx, pg, errs = await new_page(br, vp=vp, dark=False)
        await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('#anTipsOk')
        await pg.evaluate(f"document.documentElement.style.fontSize='{px}px'"); await pg.wait_for_timeout(300)
        b = await pg.evaluate(BIG)
        ok(f'n164: {vp[0]} px wide at {px} pt text: no overlap, no cut-off text, no sideways scroll', not b['ov'] and not b['tr'] and not b['hs'], b)
        if px >= 20: ok(f'n164: {vp[0]} px at {px} pt: header stacks for big text', 'an-bigtext' in b['cls'])
        await ctx.close()
    ctx, pg, errs = await new_page(br, vp=(390, 844), dark=False)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    ok('n164: no sideways scroll on a phone (the scroll-edge fade no longer sticks out)', not await pg.evaluate("document.documentElement.scrollWidth>innerWidth"))
    ok('n164: drug names wrap instead of being cut off', await pg.evaluate("[...document.querySelectorAll('.an-lab b')].every(b=>b.scrollWidth<=b.clientWidth+1)"))
    await ctx.close()


@section(id='n165', title='n165: Apple color rules',
         apps=['anesia'], topics=['color'])
async def s_n165(br):
    CR = r"""(sel,bgsel)=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return m.slice(0,3)};const L=a=>{const f=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};
      const el=document.querySelector(sel);if(!el)return null;const fg=P(getComputedStyle(el).color);let b=el,bg;while(b){const c=getComputedStyle(b).backgroundColor;if(c&&!/rgba\(.*,\s*0\)$/.test(c)&&c!=='transparent'){bg=c;break}b=b.parentElement}
      const bb=P(bg||'rgb(255,255,255)');const a=L(fg),c=L(bb);return +((Math.max(a,c)+.05)/(Math.min(a,c)+.05)).toFixed(2)}"""
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    hr = await pg.evaluate("(%s)('.an-tile[data-vk=hr] .tag')" % CR)
    ok('n165: HR label meets 4.5:1 on its tile', hr and hr >= 4.5, hr)
    await pg.click('.an-sum [data-sum] >> nth=0'); await pg.click('#anSheet [data-chips=cpr] [data-v=DNR]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(300)
    dnr = await pg.evaluate("(()=>{const P=c=>c.match(/[\\d.]+/g).map(Number);const L=a=>{const f=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};const el=document.querySelector('.an-sum .dnr-pill .label');const fg=P(getComputedStyle(el).color);const bgs=P(getComputedStyle(el.closest('.an-sum-i')).backgroundColor),page=P(getComputedStyle(document.body).backgroundColor);const al=bgs[3]===undefined?1:bgs[3];const bg=[0,1,2].map(i=>bgs[i]*al+page[i]*(1-al));const a=L(fg),c=L(bg);return +((Math.max(a,c)+.05)/(Math.min(a,c)+.05)).toFixed(2)})()")
    ok('n165/n177: the DNR pill meets 4.5:1', dnr >= 4.5, dnr)
    await pg.click('[data-act=airway]'); await pg.click('#anSheet [data-atab=vent]'); await pg.click('#anSheet [data-chips=mode] [data-v=vc]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(300)
    vc = await pg.evaluate("[getComputedStyle(document.querySelector('.an-bar.vent'),'::after').backgroundColor, getComputedStyle(document.querySelector('.an-tile[data-vk=spo2] .tag')).color]")
    ok('n165: ventilation no longer shares the SpO₂ blue', vc[0] != vc[1], vc)
    ok('no page errors (n165 block)', not errs, errs)
    await ctx.close()
    ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='light', timezone_id='America/Los_Angeles')
    await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': URL}])
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-contrast', 'value': 'more'}, {'name': 'color-gamut', 'value': 'p3'}]})
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    hc = await pg.evaluate("[getComputedStyle(document.body).getPropertyValue('--an-ink-3').trim(), getComputedStyle(document.querySelector('.an-tools > .an-group')).backdropFilter, getComputedStyle(document.querySelector('.an-tile')).boxShadow]")
    ok('n165: Increase Contrast darkens secondary text, makes glass solid and outlines controls', hc[0].lower() == '#48484a' and hc[1] in ('none', '') and 'inset' in hc[2], hc)
    await pg.screenshot(path=os.path.join(SHOTS, '42-increase-contrast.png'))
    await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'color-gamut', 'value': 'p3'}]}); await pg.wait_for_timeout(100)
    p3v = await pg.evaluate("getComputedStyle(document.body).getPropertyValue('--an-spo2').trim()")
    ok('n165: wide-color screens get Display P3 colors', 'display-p3' in p3v, p3v)

    await ctx.close()


@section(id='n167', title='n167: no grey canvas behind the record when the computer is in dark mode and the sheet is light',
         apps=['treatment'], topics=['dark-mode', 'sheets-alerts'])
async def s_n167(br):
    for scheme, cookie in (('dark', 'light'), ('light', 'dark')):
        ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme=scheme, timezone_id='America/Los_Angeles')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': cookie, 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1000)
        await pg.evaluate("localStorage.setItem('tsCurrentSheet','sh_test');Object.assign(VISIT,{patient:'Max',species:'Dog',weight:31.2});selectCTab('anes')"); await pg.wait_for_timeout(1500)
        for step in ('load', 'toggle'):
            if step == 'toggle': await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(250)
            cs = await pg.evaluate("(()=>{const f=document.querySelector('#ctab-anes iframe'),d=f.contentDocument;return [getComputedStyle(f).colorScheme, getComputedStyle(d.documentElement).colorScheme, document.body.classList.contains('dark'), d.body.classList.contains('dark')]})()")
            ok(f'n167: computer {scheme}, sheet {cookie}, after {step}: the record matches the sheet (no grey box)', cs[0] == cs[1] and cs[2] == cs[3], cs)
        await ctx.close()


@section(id='n171', title='n171: Pravix Symbols (SF Symbols rules on our own symbols)',
         apps=['anesia', 'topbar'], topics=['icons'])
async def s_n171(br):
    SYMCHK = """(()=>{const W={100:1.2,200:1.3,300:1.45,400:1.6,500:1.8,600:2,700:2.25,800:2.5,900:2.7};
      const all=[...document.querySelectorAll('svg')].filter(s=>!s.closest('.an-chart,.an-legend,#pvxTopnav,#flmCap')&&!s.classList.contains('an-spark')&&!s.classList.contains('an-chev')&&!s.classList.contains('an-graph')&&s.getBoundingClientRect().width>0);
      const foreign=all.filter(s=>!s.classList.contains('an-ico')).map(s=>s.outerHTML.slice(0,60));
      const ic=all.filter(s=>s.classList.contains('an-ico'));
      const host=s=>{let h=s.parentElement;while(h&&!['BUTTON','A','LABEL','B','STRONG','SPAN','EM','H1','H2','H3','P','DIV','LI'].includes(h.tagName))h=h.parentElement;return h};
      const badW=ic.filter(s=>{const h=host(s);const fw=Math.round(parseInt(getComputedStyle(h).fontWeight)/100)*100;return Math.abs(parseFloat(getComputedStyle(s).strokeWidth)-W[fw])>.01}).map(s=>[s.parentElement.className||s.parentElement.tagName,getComputedStyle(s).strokeWidth,getComputedStyle(host(s)).fontWeight]);
      const badS=ic.filter(s=>{const r=parseFloat(getComputedStyle(s).height)/parseFloat(getComputedStyle(s).fontSize);return ![1,1.2,1.45,1.15].some(x=>Math.abs(r-x)<.03)}).map(s=>[s.parentElement.className,parseFloat(getComputedStyle(s).height)/parseFloat(getComputedStyle(s).fontSize)]);
      const vb=ic.filter(s=>s.getAttribute('viewBox')!=='0 0 24 24').length;
      return {n:ic.length,foreign,badW,badS,vb}})()"""
    for px in (17, 28):
        ctx, pg, errs = await new_page(br, dark=False)
        await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.evaluate(f"document.documentElement.style.fontSize='{px}px'"); await pg.wait_for_timeout(400)
        r = await pg.evaluate(SYMCHK)
        ok(f'n171 at {px} px text: one symbol family on one 24-pt grid (no other icon sets)', r['n'] >= 15 and not r['foreign'] and r['vb'] == 0, r)
        ok(f'n171 at {px} px text: each symbol’s weight matches its label’s font weight', not r['badW'], r['badW'][:6])
        ok(f'n171 at {px} px text: symbols sized small / medium / large relative to the text', not r['badS'], r['badS'][:6])
        await ctx.close()
    ctx, pg, errs = await new_page(br, dark=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('#anTipsOk')
    ok('n171: hierarchical — the secondary layer sits back', await pg.evaluate("getComputedStyle(document.querySelector('#anShare svg .s')).opacity") == '0.45')
    ok('n171: vitals tiles use the fill variant of the same family', await pg.locator('.an-tile svg.an-ico.fill').count() == 6)
    ok('n171: Totals shows the outline symbol while closed', await pg.locator('#anInsp svg.an-ico.fill').count() == 0)
    before = await pg.evaluate("document.querySelector('#anInsp svg').innerHTML")
    await pg.click('#anInsp'); await pg.wait_for_timeout(300)
    ok('n172: selection shows by the toolbar tint; the symbol itself is not swapped (HIG)', await pg.get_attribute('#anInsp', 'aria-pressed') == 'true' and await pg.evaluate("document.querySelector('#anInsp svg').innerHTML") == before and await pg.locator('#anInsp svg.fill').count() == 0)
    await pg.click('#anInsp'); await pg.wait_for_timeout(300)
    await pg.click('#anExpand')
    sym = await until(pg, "(()=>{const e=document.querySelector('#anExpand .ic-in svg');return !!e&&getComputedStyle(e).animationName==='anSymIn'})()", 1000)   # n213: read it while it runs (was a timing flake under load)
    ok('n171: Expand swaps its symbol with a replace animation', sym)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    await pg.click('[data-act=dose]'); await pg.wait_for_timeout(400)
    r = await pg.evaluate(SYMCHK)
    ok('n171: symbols in sheets are weight-matched too', not r['badW'] and not r['foreign'], r)
    await pg.keyboard.press('Escape'); await ctx.close()
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train3'); await pg.wait_for_selector('.an-chart')
    ok('n171: no weight shows the slash variant (unavailable)', await pg.locator('#anWeight svg.an-ico.slash mask').count() == 1)
    await ctx.close()
    ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.emulate_media(contrast='more'); await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    ok('n171: Increase Contrast draws every layer at full strength', await pg.evaluate("getComputedStyle(document.querySelector('#anShare svg .s')).opacity") == '1')
    await ctx.close()


@section(id='n172', title='n172: Apple Icons HIG — optical sizing and centering, labels, right-to-left',
         apps=['anesia'], topics=['icons'])
async def s_n172(br):
    import subprocess, importlib.util
    js = subprocess.run(['node', '-e', """const s=require('fs').readFileSync(process.argv[1],'utf8');const a=s.indexOf('  var SYM = {'),b=s.indexOf('  var SYMOPT = ');const c=s.indexOf(';',b);
      const SYM=eval('('+s.slice(a+12,b).trim().replace(/;$/,'')+')'),OPT=JSON.parse(s.slice(b+15,c));console.log(JSON.stringify([SYM,OPT]))""", os.path.join(BUILD, 'anesia', 'app.js')], capture_output=True, text=True).stdout
    SYMS, OPTS = json.loads(js)
    spec = importlib.util.spec_from_file_location('om', os.path.join(HERE, 'optical_measure.py')); om = importlib.util.module_from_spec(spec); spec.loader.exec_module(om)
    meas = await om.run(SYMS, OPTS)
    import statistics
    ps = {n: om.perceived(m) for n, m in meas.items()}; med = statistics.median(ps.values())
    off = {n: round(ps[n] / med, 3) for n in ps if not .85 <= ps[n] / med <= 1.15}
    ok(f'n172: every symbol looks the same size (optical size within ±15% of the family; {len(SYMS)} symbols)', not off, off)
    offc = {n: (round(m['bx'] * .5 + m['cx'] * .5 - 12, 2), round(m['by'] * .5 + m['cy'] * .5 - 12, 2)) for n, m in meas.items() if abs(m['bx'] * .5 + m['cx'] * .5 - 12) > .3 or abs(m['by'] * .5 + m['cy'] * .5 - 12) > .3}
    ok('n172: every symbol is optically centred (within 0.3 pt of the grid centre)', not offc, offc)
    ok('n172: every symbol has a measured correction', set(OPTS) == set(SYMS))
    ctx, pg, errs = await new_page(br, dark=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    unl = await pg.evaluate("[...document.querySelectorAll('button,a,[role=button]')].filter(b=>b.offsetParent&&b.querySelector('svg')&&!b.innerText.trim()&&!(b.getAttribute('aria-label')||'').trim()&&!b.getAttribute('aria-labelledby')).map(b=>b.outerHTML.slice(0,80))")
    ok('n172: every icon-only control has a spoken label', not unl, unl)
    sw = await pg.evaluate("(()=>{const s=document.querySelector('#anShare svg'),g=s.querySelector('g.os');return [getComputedStyle(s).strokeWidth, g?getComputedStyle(g.querySelector('path')).strokeWidth:null, g?g.style.getPropertyValue('--an-os'):null]})()")
    ok('n172: the optical scale never changes a symbol’s weight (stroke divided by the scale)', sw[1] is not None and abs(float(sw[1][:-2]) * float(sw[2]) - float(sw[0][:-2])) < .02, sw)
    await pg.evaluate("document.documentElement.dir='rtl'"); await pg.wait_for_timeout(100)
    ok('n172: right-to-left mirrors the back chevron, not the share arrow', await pg.evaluate("[getComputedStyle(document.querySelector('.an-back svg')).transform, getComputedStyle(document.querySelector('#anShare svg')).transform]") == ['matrix(-1, 0, 0, 1, 0, 0)', 'none'])
    await ctx.close()


@section(id='n173', title='n173: Apple Writing HIG',
         apps=['anesia'], topics=['behaviour'])
async def s_n173(br):
    src_all = open(os.path.join(BUILD, 'anesia', 'app.js')).read() + open(os.path.join(BUILD, 'anesia', 'engine.js')).read()
    import re as _re
    ui_strings = _re.findall(r"'((?:[^'\\]|\\.){3,})'", src_all)
    ok('n173: no "we" or "our" in any message', not [x for x in ui_strings if _re.search(r"\b(we|we’re|our)\b", x, _re.I) and ' ' in x])
    ok('n173: no "click here", no "oops"', not [x for x in ui_strings if _re.search(r"click here|oops|uh-oh", x, _re.I)])
    ok('n173: errors say what to do (no "must be" rules, no bare "Already …")', not [x for x in ui_strings if _re.search(r" must be |^Already ", x)], [x for x in ui_strings if _re.search(r" must be |^Already ", x)][:5])
    ok('n173: curly apostrophes in messages (no straight can\'t / don\'t)', "n\\'t" not in src_all)
    ok('n173: one perspective (no "my" in labels)', not [x for x in ui_strings if _re.search(r"\bmy\b", x, _re.I) and '<' not in x[:1]])
    ok('n173: one vocabulary (no "crossed out", no "Record dose", no "training cases")', not [x for x in ('crossed out', "'Record dose'", 'training cases in progress', 'Give a dose now') if x in src_all])
    ctx, pg, errs = await new_page(br, dark=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    ok('n173: on a computer the tip says Click, not Tap', 'Click any value' in await pg.inner_text('.an-tips'))
    await ctx.close()
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True, is_mobile=False, timezone_id='America/Los_Angeles')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    tip = await pg.inner_text('.an-tips'); coarse = await pg.evaluate("matchMedia('(pointer:coarse)').matches")
    ok('n173: on a touch screen the tip says Tap', ('Tap any value' in tip) == coarse, [coarse, tip[:40]])
    await ctx.close()
    ctx, pg, errs = await new_page(br, dark=True)
    await pg.goto(URL + '#r=an_train3'); await pg.wait_for_selector('.an-chart')
    ok('n173: the empty vitals chart offers Enter vitals right there', await pg.locator('.an-empty-t button[data-act=vitals]').count() == 1)
    await pg.click('.an-empty-t button[data-act=vitals]'); await pg.wait_for_selector('#anVForm')
    ok('n173: and it opens the vitals form', await pg.locator('#anVForm').count() == 1)
    await pg.fill('#nv_hr', '900'); await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(200)
    ok('n173: a slip says how to fix it ("Enter HR from 20 to 300 bpm")', 'Enter HR from' in await pg.inner_text('#anVForm') and 'must be' not in await pg.inner_text('#anVForm'), await pg.inner_text('#nve_hr'))
    await ctx.close()


@section(id='n174', title="n174: main actions in Flow's patient-drawer card style (Admit / Discharge)",
         apps=['anesia', 'flow'], topics=['behaviour'])
async def s_n174(br):
    for dark in (True, False):
        ctx, pg, errs = await new_page(br, dark=dark)
        await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
        st = await pg.evaluate("""[...document.querySelectorAll('[data-act=vitals].an-btn,#anEnd,#anInsp')].map(b=>{const c=getComputedStyle(b),a=getComputedStyle(b,'::after');return [b.id||b.dataset.act,c.borderTopLeftRadius,c.backgroundImage.slice(0,15),c.backgroundColor,a.content!=='none'&&a.content!=='',c.fontWeight]})""")
        t = 'dark' if dark else 'light'
        ok(f'n174 {t}: Vitals now, End anesthesia and Totals share the drawer-card style (16 px, arrow, semibold)', len(st) == 3 and all(x[1] == '16px' and x[4] and x[5] == '600' for x in st) and all(('gradient' in x[2]) if dark else (x[3] == 'rgb(255, 255, 255)') for x in st), st)
        await ctx.close()


@section(id='n174_2', title="n174: status pills in Flow's P3 / P2 badge colours",
         apps=['anesia', 'flow'], topics=['color'])
async def s_n174_2(br):
    for dark in (True, False):
        ctx, pg, errs = await new_page(br, dark=dark)
        await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
        c = await pg.evaluate("""(()=>{const g=s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return [c.backgroundColor,c.color]};
          return {active:g('.an-rhead .an-pill.active'),due:g('.an-nh .an-pill.warn.due'),dot:getComputedStyle(document.querySelector('.an-rhead .an-pill.active'),'::before').backgroundColor}})()""")
        t = 'dark' if dark else 'light'
        ok(f'n174 {t}: Under anesthesia = P3 green #5CC75A, lettering = page navy #0A1222', c['active'] == ['rgb(92, 199, 90)', 'rgb(10, 18, 34)'] and c['dot'] == 'rgb(10, 18, 34)', c)
        ok(f'n174 {t}: Vitals due = P2 yellow #F2C744, lettering = page navy #0A1222', c['due'] == ['rgb(242, 199, 68)', 'rgb(10, 18, 34)'], c)
        await ctx.close()
    ctx, pg, errs = await new_page(br, dark=True, seed=False)
    await pg.goto(URL); await pg.wait_for_selector('.an-empty'); await pg.click('#anNew')
    await pg.fill('[name=name]', 'Training dog 9'); await pg.fill('[name=kg]', '18.2'); await pg.click('[data-ok]'); await pg.wait_for_selector('#anConfirm')
    await pg.click('#anConfirmB'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_selector('.an-pill.conf')
    cc = await pg.evaluate("(()=>{const e=document.querySelector('.an-pill.conf'),c=getComputedStyle(e);return [c.backgroundColor,c.color,getComputedStyle(e.querySelector('svg')).stroke]})()")
    ok('n174: Confirmed = P3 green, lettering and check = page navy #0A1222', cc == ['rgb(92, 199, 90)', 'rgb(10, 18, 34)', 'rgb(10, 18, 34)'], cc)
    await ctx.close()
    ctx, pg, errs = await new_page(br, dark=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    bg = await pg.evaluate("getComputedStyle(document.body).backgroundColor")
    lt = await pg.evaluate("[getComputedStyle(document.querySelector('.an-rhead .an-pill.active')).color, getComputedStyle(document.querySelector('.an-nh .an-pill.warn.due')).color]")
    ok('n174: pill lettering is exactly the page background colour', lt == [bg, bg], [bg, lt])
    await ctx.close()


@section(id='n175', title='n175: premium motion, round 2',
         apps=['anesia'], topics=['motion'])
async def s_n175(br):
    ctx, pg, errs = await new_page(br, dark=True)
    await pg.goto(URL); await pg.wait_for_selector('.an-card')
    await pg.click('[data-open="an_train1"]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(60)
    ok('n175: opening a record cascades in (header, summary, toolbar, chart rows, tiles)', await pg.evaluate("document.getElementById('anApp').classList.contains('an-enter') && getComputedStyle(document.querySelector('.an-sum')).animationName==='anEnter' && parseFloat(getComputedStyle(document.querySelector('.an-nowcol')).animationDelay)>parseFloat(getComputedStyle(document.querySelector('.an-sum')).animationDelay)"))
    await pg.wait_for_timeout(1200)
    ok('n175: the cascade plays once, not on later re-renders', not await pg.evaluate("window.anesiaApp.render(true), document.getElementById('anApp').classList.contains('an-enter')"))
    await pg.click('#anTipsOk')
    # 2. zoom: marks slide to their new place
    await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"15\"]').click();0"); await pg.wait_for_timeout(40)
    za = await pg.evaluate("[...document.querySelectorAll('.an-chart .an-mk,.an-chart .an-mon,.an-chart .an-bar')].filter(e=>e.getAnimations().some(a=>!(a instanceof CSSAnimation))).length")
    ok('n175: changing minutes per column slides every mark to its new time (no jump)', za >= 5, za)
    await pg.wait_for_timeout(600); await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"5\"]').click();0"); await pg.wait_for_timeout(600)
    # 3. sparkline → trend
    await pg.locator('.an-tile[data-vk=hr] .an-spark').scroll_into_view_if_needed()   # n196: the tip now sits at the foot of the chart, so Got it scrolls the page
    await pg.locator('.an-tile[data-vk=hr] .an-spark').click(); await pg.wait_for_selector('#anSheet .an-trend'); await pg.wait_for_timeout(500)
    tr = await pg.evaluate("[document.getElementById('anShT').textContent, document.querySelectorAll('#anSheet .an-trend circle').length, !!document.getElementById('anVForm')]")
    ok('n175: tapping a tile’s sparkline opens that vital’s trend (not the vitals form)', tr[0] == 'Heart rate' and tr[1] >= 5 and not tr[2], tr)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    await pg.focus('.an-tile[data-vk=bp]'); await pg.keyboard.press('t'); await pg.wait_for_selector('#anSheet .an-trend')
    ok('n175: T on a focused tile opens the trend too (keyboard)', await pg.inner_text('#anShT') == 'Mean arterial pressure')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    # 4. light on the glass toolbar
    gb = await pg.locator('.an-tools>.an-group').bounding_box()
    await pg.mouse.move(gb['x'] + 40, gb['y'] + gb['height'] / 2); await pg.wait_for_timeout(450)
    lt = await pg.evaluate("[document.querySelector('.an-tools').classList.contains('lit'), getComputedStyle(document.querySelector('.an-tools>.an-group'),'::after').opacity, document.querySelector('.an-tools>.an-group').style.getPropertyValue('--lx')]")
    ok('n175: light follows the pointer on the glass toolbar', lt[0] and float(lt[1]) > .9 and lt[2] == '40px', lt)
    await pg.mouse.move(700, 700); await pg.wait_for_timeout(450)
    ok('n175: and fades when the pointer leaves', not await pg.evaluate("document.querySelector('.an-tools').classList.contains('lit')"))
    # 6 + 5. a saved change: the sheet button becomes a check; the undo ring drains; swipe the message away
    await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.fill('#anSheet [name=note]', 'Motion test'); await pg.click('#anSheet [data-ok]')
    ok('n175: the sheet’s button turns into a check as it closes', await pg.evaluate("!!document.querySelector('#anSheetOut [data-ok].an-done svg .dr')"))
    await pg.wait_for_timeout(300)
    ring = await pg.evaluate("(()=>{const b=document.getElementById('anUndo');return [b.classList.contains('ring'), getComputedStyle(b,'::before').animationName, b.style.getPropertyValue('--an-ud'), !!document.querySelector('#anToast .an-tok .dr')]})()")
    ok('n175: Undo shows its 2-minute window as a draining ring, and the message has a check', ring[0] and ring[1] == 'anUndoRing' and ring[2].endswith('ms') and int(ring[2][:-2]) > 100000 and ring[3], ring)
    tb = await pg.locator('#anToast').bounding_box()
    await pg.mouse.move(tb['x'] + 30, tb['y'] + tb['height'] / 2); await pg.mouse.down(); await pg.mouse.move(tb['x'] + 200, tb['y'] + tb['height'] / 2, steps=4); await pg.mouse.up(); await pg.wait_for_timeout(350)
    ok('n175: a sideways swipe sends the undo message away', await pg.evaluate("document.getElementById('anToast').hidden"))
    # 7. totals count up
    await pg.click('#anInsp'); await pg.wait_for_timeout(120)
    mid = await pg.inner_text('#anInspector .an-tot'); await pg.wait_for_timeout(800); fin = await pg.inner_text('#anInspector .an-tot'); await pg.wait_for_timeout(400); fin2 = await pg.inner_text('#anInspector .an-tot')
    ok('n175: totals count up when the panel opens, and land on the true values', mid != fin and fin == fin2 and '1426 mg' in fin, [mid[:60], fin[:60]])
    await pg.click('#anInsp'); await pg.wait_for_timeout(300)
    # 9. press and hold a mark to peek
    mk = await pg.locator('.an-chart .an-mon').last.bounding_box()
    await pg.mouse.move(mk['x'] + mk['width'] / 2, mk['y'] + mk['height'] / 2); await pg.mouse.down(); await pg.wait_for_timeout(600)
    pk = await pg.evaluate("[!!document.querySelector('.pvx-cx-pv'), !!document.querySelector('.pvx-cx.dim'), !!document.querySelector('.an-lifted'), (document.querySelector('.pvx-cx-pv b')||{}).textContent||'']")
    await pg.mouse.up(); await pg.wait_for_timeout(300)
    ok('n175/n201: press and hold a mark lifts it and shows a preview over a softened page', pk[0] and pk[1] and pk[2] and ' at ' in pk[3], pk)
    ok('n201: letting go keeps the preview and its commands open, without opening the entry', await pg.evaluate("!!document.querySelector('.pvx-cx-list [role=menuitem]') && !document.getElementById('anSheet')"))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
    ok('n201: Esc closes it', await pg.evaluate("!document.querySelector('.pvx-cx:not(.out)')"))
    await pg.locator('.an-chart .an-mon').last.click(); await pg.wait_for_selector('#anSheet')
    ok('n175: a normal tap still opens the entry', await pg.locator('#anSheet').count() == 1)
    await pg.keyboard.press('Escape')
    ok('n175: no page errors', not errs, errs)
    await ctx.close()
    # 8. skeleton in the record's shape while the record loads
    ctx, pg, errs = await new_page(br, dark=True)
    await pg.add_init_script("window.__fsDelay=900")
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_timeout(150)
    sk = await pg.evaluate("[!!document.querySelector('.an-skelrec .sk-chart'), !!document.querySelector('.an-spin'), (document.querySelector('.an-loading .an-vh')||{}).textContent||'']")
    await pg.wait_for_selector('.an-chart', timeout=8000)
    ok('n175: loading shows a skeleton in the record’s shape (no spinner), still announced as loading', sk[0] and not sk[1] and 'Loading' in sk[2], sk)
    ok('n175: and the record settles in where the skeleton was', await pg.evaluate("document.getElementById('anApp').classList.contains('an-enter')"))
    await ctx.close()


@section(id='n170', title='n170: premium motion',
         apps=['anesia'], topics=['motion'])
async def s_n170(br):
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='dark', has_touch=True)
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL); await pg.wait_for_selector('.an-card')
    # 2. a record card grows into the record header, and back
    renders = "window.__rn=0;(()=>{const a=document.getElementById('anApp');new MutationObserver(m=>{if(m.some(x=>x.target===a))window.__rn++}).observe(a,{childList:true})})()"
    await pg.evaluate(renders)
    await pg.click('[data-open="an_train1"]'); await pg.wait_for_timeout(100)
    vt = await pg.evaluate("[getComputedStyle(document.querySelector('.an-id')).viewTransitionName, typeof document.startViewTransition]")
    await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
    ok('n170: tapping a record card morphs it into the record header', vt[0] == 'an-hero' and vt[1] == 'function', vt)
    ok('n170: the morph renders the record once (no double redraw)', await pg.evaluate("window.__rn") == 1, await pg.evaluate("window.__rn"))
    ok('n170: morph names are cleared after the transition', await pg.locator('.an-vt').count() == 0)
    # 10. Vitals heart beats once when vitals are due
    ok('n170: the Vitals heart beats once when vitals are due', await pg.locator('[data-act=vitals] .an-beat').count() == 1)
    await pg.wait_for_timeout(1000); await pg.evaluate("window.anesiaApp.render(true)")
    ok('n170: and does not keep beating', await pg.locator('[data-act=vitals] .an-beat').count() == 0)
    # 4. the selection pill slides from 5 to 15 min
    await pg.click('#anTipsOk')
    await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(400)   # n208: pinned, 5 / 10 / 15 becomes a pop-up
    await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"15\"]').click();0"); await pg.wait_for_timeout(60)
    pa = await pg.evaluate("(()=>{const p=document.querySelector('.an-zoomseg .an-segpill');return [!!p, p?p.getAnimations().length:0]})()")
    ok('n170: the selection pill slides to the new segment', pa[0] and pa[1] >= 1, pa)
    await pg.wait_for_timeout(700)
    pe = await pg.evaluate("(()=>{const g=document.querySelector('.an-zoomseg'),p=g.querySelector('.an-segpill').getBoundingClientRect(),b=g.querySelector('[data-zoom=\\'15\\']').getBoundingClientRect();return [Math.round(p.left-b.left),Math.round(p.width-b.width),getComputedStyle(g.querySelector('[data-zoom=\\'15\\']')).backgroundColor]})()")
    ok('n170: and lands exactly on it (the button itself stays clear)', abs(pe[0]) <= 1 and abs(pe[1]) <= 1 and pe[2] in ('rgba(0, 0, 0, 0)', 'transparent'), pe)
    # 2. a vitals tile grows into the vitals form
    await pg.click('.an-tile[data-vk=hr]')
    await until(pg, "!!document.getElementById('anVForm')", 3000)   # was a fixed 80 ms; on a busy machine the form wasn't there yet
    ok('n170: a vitals tile morphs into the vitals form', await pg.evaluate("(document.getElementById('anVForm')&&getComputedStyle(document.getElementById('anVForm')).viewTransitionName)||null") == 'an-hero')
    ok('n170: focus lands in the form', await until(pg, "document.activeElement&&document.activeElement.id==='nv_hr'", 3000))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    # 3. a sheet closes from wherever it is, even while still opening
    # press Esc while the sheet is really mid-opening (15–70 % of its animation), not 90 ms after the click: on a busy
    # machine 90 ms was sometimes before the animation started, and the sheet then closed at once (it failed now and then)
    await pg.click('[data-act=dose]')
    mid = await until(pg, "(()=>{const s=document.querySelector('#anSheet .an-sheet');if(!s)return false;const a=s.getAnimations().find(x=>x instanceof CSSAnimation);if(!a)return false;const t=+a.currentTime,d=+a.effect.getComputedTiming().duration;return t>d*0.15&&t<d*0.7})()", 3000)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(16)
    ok('n170: (set-up) Esc is pressed while the sheet is still opening', mid)
    ia = await pg.evaluate("(()=>{const s=document.querySelector('#anSheetOut .an-sheet');if(!s)return null;const a=s.getAnimations();return [a.length, a.some(x=>!(x instanceof CSSAnimation)), getComputedStyle(s).animationName]})()")
    ok('n170: closing mid-opening retargets from where the sheet is (no restart)', ia and ia[1] and ia[2] == 'none', ia)
    await pg.wait_for_timeout(300)
    # 7. the now line glides
    nl = await pg.evaluate("(()=>{const n=document.querySelector('.an-now'),c=getComputedStyle(n);return [c.transitionDuration,c.transform]})()")
    ok('n170: the now line glides continuously', '15s' in nl[0] and nl[1] != 'none', nl)
    # 5. the name moves into the toolbar as the big title scrolls away
    ok('n170: toolbar title hidden at the top', not await pg.evaluate("document.documentElement.classList.contains('an-titled')"))
    await pg.evaluate("window.scrollTo(0, 420)"); await pg.wait_for_timeout(600)
    tt = await pg.evaluate("[document.documentElement.classList.contains('an-titled'), getComputedStyle(document.querySelector('.an-tbt')).opacity, document.querySelector('.an-tbt').textContent]")
    ok('n170: scrolled, the patient name sits in the toolbar (n208: with the time)', tt[0] and float(tt[1]) > .9 and tt[2].startswith('Training dog 4 · '), tt)
    await shot(pg, '52-title-in-toolbar')
    await pg.evaluate("window.scrollTo(0, 0)"); await pg.wait_for_timeout(400)
    ok('n170: back at the top, it leaves the toolbar', not await pg.evaluate("document.documentElement.classList.contains('an-titled')"))
    # 2. back to the list: the header shrinks into its card, the URL loses the record
    await pg.evaluate("window.__rn=0"); await pg.click('.an-back'); await pg.wait_for_selector('.an-card'); await pg.wait_for_timeout(600)
    ok('n170: Records goes back to the list in one redraw', await pg.evaluate("[location.hash, window.__rn]") == ['', 1], await pg.evaluate("[location.hash, window.__rn]"))
    await pg.go_back(); await pg.wait_for_selector('.an-chart', timeout=3000)
    ok('n170: and the browser Back button returns to the record', '#r=an_train1' in pg.url)
    ok('n170: no page errors', not errs, errs)
    await ctx.close()
    # Reduce Motion: none of it travels
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', reduced_motion='reduce')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"15\"]').click();0"); await pg.wait_for_timeout(40)
    ok('n170 Reduce Motion: the pill moves without sliding', await pg.evaluate("document.querySelector('.an-zoomseg .an-segpill').getAnimations().filter(a=>!(a instanceof CSSAnimation)).length") == 0)
    ok('n170 Reduce Motion: the now line does not glide', await pg.evaluate("getComputedStyle(document.querySelector('.an-now')).transitionDuration") in ('0s',))
    ok('n170 Reduce Motion: no heartbeat', await pg.evaluate("(()=>{const b=document.querySelector('.an-beat svg');return !b||getComputedStyle(b).animationName==='none'})()"))
    await ctx.close()


@section(id='n169', title='n169: Expand on desktop and iPad (standalone)',
         apps=['anesia', 'topbar'], topics=['behaviour'])
async def s_n169(br):
    for nm, vp, touch in (('desktop', (1440, 900), False), ('ipad', (1180, 820), True)):
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', color_scheme='dark', has_touch=touch)
        await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
        await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
        w0 = await pg.evaluate("document.querySelector('.an-chartp').getBoundingClientRect().width")
        ok(f'n169 {nm}: Expand button shown, not pressed', await pg.get_attribute('#anExpand', 'aria-pressed') == 'false' and await pg.locator('#anExpand').is_visible())
        await pg.click('#anExpand'); await pg.wait_for_timeout(450)
        st = await pg.evaluate("[document.documentElement.classList.contains('an-expanded'), getComputedStyle(document.getElementById('pvxTopnav')).display, document.querySelector('.an-chartp').getBoundingClientRect().width, document.getElementById('anExpand').getAttribute('aria-pressed'), document.activeElement.id]")
        ok(f'n169 {nm}: expanded hides the top bar and widens the chart', st[0] and st[1] == 'none' and st[2] >= w0 and st[3] == 'true' and st[4] == 'anExpand', [w0] + st)
        ok(f'n169 {nm}: no sideways scroll when expanded', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        await shot(pg, f'50-expanded-{nm}')
        await pg.click('[data-act=dose]'); await pg.wait_for_selector('#anSheet'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        ok(f'n169 {nm}: Esc closes a sheet first and stays expanded', await pg.evaluate("document.documentElement.classList.contains('an-expanded') && !document.getElementById('anSheet')"))
        await pg.focus('#anExpand'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(450)
        ok(f'n169 {nm}: Esc leaves expanded view', not await pg.evaluate("document.documentElement.classList.contains('an-expanded')"))
        await pg.keyboard.press('Alt+KeyF'); await pg.wait_for_timeout(450)
        ok(f'n169 {nm}: ⌥F expands', await pg.evaluate("document.documentElement.classList.contains('an-expanded')"))
        await pg.evaluate("location.hash=''"); await pg.wait_for_timeout(500)
        ok(f'n169 {nm}: going back to the list leaves expanded view', not await pg.evaluate("document.documentElement.classList.contains('an-expanded')"))
        ok(f'n169 {nm}: no page errors', not errs, errs)
        await ctx.close()
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}, timezone_id='America/Los_Angeles', has_touch=True, is_mobile=True)
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    ok('n169 phone: no Expand button (the record already fills the screen)', not await pg.locator('#anExpand').is_visible())
    # phone sheet: a quick flick closes it, a short slow drag springs back
    await pg.click('[data-act=event]'); await pg.wait_for_selector('#anSheet .an-sheet'); await pg.wait_for_timeout(450)
    drag = """async (o)=>{const z=document.querySelector('#anSheet .an-grab')||document.querySelector('#anSheet .an-sh');const r=z.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      const T=(t,yy)=>{const tc=new Touch({identifier:1,target:z,clientX:x,clientY:yy});z.dispatchEvent(new TouchEvent(t,{touches:t==='touchend'?[]:[tc],changedTouches:[tc],bubbles:true}))};
      T('touchstart',y);for(let i=1;i<=o.n;i++){await new Promise(r=>setTimeout(r,o.ms));T('touchmove',y+o.d*i/o.n)}T('touchend',y+o.d);}"""
    await pg.evaluate(drag, {'n': 6, 'ms': 40, 'd': 40}); await pg.wait_for_timeout(120)
    ok('n169 phone: a short slow drag springs the sheet back', await pg.evaluate("!!document.getElementById('anSheet') && document.querySelector('#anSheet .an-sheet').classList.contains('an-spring')"))
    await pg.wait_for_timeout(450)
    await pg.evaluate(drag, {'n': 3, 'ms': 12, 'd': 60}); await pg.wait_for_timeout(350)
    ok('n169 phone: a quick flick closes the sheet', not await pg.evaluate("!!document.getElementById('anSheet')"))
    await ctx.close()


@section(id='gates', title='gates',
         apps=['anesia'], topics=['behaviour'])
async def s_gates(br):
    ctx, pg, errs = await new_page(br, 'null'); await pg.goto(URL); await pg.wait_for_selector('.an-gate')
    ok('signed out: sign-in card', 'Sign in to use Anesia' in await pg.inner_text('.an-gate')); await ctx.close()
    ctx, pg, errs = await new_page(br, '{"uid":"tv","email":"AU733@vca.com"}'); await pg.goto(URL); await pg.wait_for_selector('.an-gate')
    ok('lobby account: gated', 'lobby screen account' in await pg.inner_text('.an-gate')); await ctx.close()


@section(id='ipad_first_then_desktop_', title='iPad first, then desktop light and phone',
         apps=['anesia'], topics=['behaviour'])
async def s_ipad_first_then_desktop_(br):
    for nm, vp, dark, touch in [('10-ipad-landscape', (1180, 820), True, True), ('11-ipad-pro-landscape', (1366, 1024), False, True), ('12-desktop-light', (1440, 900), False, False), ('13-wide-1680', (1680, 1050), True, False), ('14-phone', (390, 844), True, True)]:
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light', has_touch=touch, is_mobile=touch and vp[0] < 500)
        if not dark: await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
        await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
        ok(nm + ': no sideways page scroll', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
        minh = 44 if touch else 36
        small = await pg.evaluate("""m=>[...document.querySelectorAll('#anApp button,#anApp a,#anApp select,#anApp input')].filter(e=>e.offsetParent&&!e.closest('.an-chart')&&e.type!=='hidden').map(e=>{const r=e.getBoundingClientRect();return [e.textContent.trim().slice(0,18)||e.getAttribute('aria-label')||e.id,Math.round(r.width),Math.round(r.height)]}).filter(x=>x[2]<m||x[1]<m)""", minh)
        ok(nm + f': controls outside the chart at least {minh} px', not small, small)
        minfs = await pg.evaluate("Math.min(...[...document.querySelectorAll('#anApp *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>parseFloat(getComputedStyle(e).fontSize)))")
        ok(nm + ': no text under 12 px', minfs >= 12, minfs)
        if vp[0] >= 1000: ok(nm + ': Now column beside the chart', await pg.evaluate("(()=>{const a=document.querySelector('.an-chartp').getBoundingClientRect(),b=document.querySelector('.an-nowcol').getBoundingClientRect();return b.left>=a.right-1&&Math.abs(b.top-a.top)<2})()"))
        else: ok(nm + ': Now column above the chart', await pg.evaluate("document.querySelector('.an-nowcol').getBoundingClientRect().bottom<=document.querySelector('.an-chartp').getBoundingClientRect().top+1"))
        await shot(pg, nm)
        if nm == '14-phone':
            await pg.click('[data-act=dose]'); await shot(pg, '15-phone-dose-sheet')
        ok(nm + ': no page errors', not errs, errs)
        await ctx.close()


@section(id='n168', title='n168: Liquid Glass switch knob while held',
         apps=['anesia'], topics=['materials'])
async def s_n168(br):
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
    await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    await pg.evaluate("(()=>{const l=document.createElement('label');l.className='an-check';l.id='gsw';l.style.cssText='position:fixed;left:40px;top:300px;z-index:99;width:300px';const i=document.createElement('input');i.type='checkbox';i.className='an-switch';i.setAttribute('role','switch');l.append(i,'Test');document.body.append(l)})()")
    knob = "(()=>{const c=getComputedStyle(document.querySelector('#gsw .an-switch'),'::after');return [c.backgroundColor,c.backdropFilter||c.webkitBackdropFilter,c.scale]})()"
    rest = await pg.evaluate(knob); ok('n168: switch knob is solid white at rest', rest[0] == 'rgb(255, 255, 255)' and rest[1] in ('none', ''), rest)
    box = await pg.locator('#gsw .an-switch').bounding_box(); await pg.mouse.move(box['x'] + 12, box['y'] + 15); await pg.mouse.down(); await pg.wait_for_timeout(300)
    held = await pg.evaluate(knob); await shot(pg, '16-glass-knob-held')
    ok('n168: held knob turns to clear glass (translucent, blurred, lifted)', 'rgba' in held[0] and 'blur' in (held[1] or '') and held[2] not in ('none', '1'), held)
    await pg.mouse.up(); await pg.wait_for_timeout(350)
    ok('n168: released knob settles back to solid', (await pg.evaluate(knob))[0] == 'rgb(255, 255, 255)')
    await pg.evaluate("document.documentElement.classList.add('an-noblur')"); await pg.mouse.move(box['x'] + 30, box['y'] + 15); await pg.mouse.down(); await pg.wait_for_timeout(300)
    nb = await pg.evaluate(knob); await pg.mouse.up()
    ok('n168: on slow devices (glass guard) the held knob stays solid', nb[0] == 'rgb(255, 255, 255)' and nb[1] in ('none', ''), nb)
    await ctx.close()
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', reduced_motion='reduce')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('[data-act=dose]')
    am = await pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('#anSheet .an-sheet'));return [c.animationName,parseFloat(c.animationDuration),c.transform]})()")
    ok('Reduce Motion: sheets fade in (no slide or zoom), briefly', am[0] == 'anFadeIn' and am[1] <= .2 and am[2] == 'none', am)
    await pg.wait_for_timeout(100); await pg.keyboard.press('Escape')
    ok('Reduce Motion: a closing sheet stops blocking the page at once', await pg.evaluate("!document.getElementById('anSheet') && [...document.querySelectorAll('.an-scrim')].every(x=>getComputedStyle(x).pointerEvents==='none')"))
    await pg.wait_for_timeout(200); ok('Reduce Motion: and is gone after its short fade', await pg.locator('.an-scrim').count() == 0)
    await ctx.close()



@section(id='n180', title='n180: recovery phase',
         apps=['anesia', 'treatment', 'or'], topics=['behaviour'])
async def s_n180(br):
    ctx, pg, errs = await new_page(br)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    ok('n180: no recovery while under anesthesia', await pg.locator('.an-rec').count() == 0)
    await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec')
    hd = await pg.evaluate("[document.querySelector('.an-rhead .an-pill.rec')?.innerText, document.querySelector('.an-clock span').innerText, !!document.querySelector('#anREnd'), !!document.querySelector('#anSign'), [...document.querySelectorAll('.an-rmk b')].map(b=>b.innerText), document.querySelector('.an-rec').innerText]")
    ok('n180: ending anesthesia opens recovery: pill, recovery clock, End recovery (no Sign yet)', hd[0] == 'In recovery' and hd[1] == 'Recovery time' and hd[2] and not hd[3], hd)
    ok('n180: four milestones and no checks yet', hd[4] == ['Extubated', 'Head up', 'Sternal', 'Standing'] and 'No checks yet' in hd[5], hd[4])
    await pg.click('[data-rmk=extubation]'); await pg.wait_for_timeout(400)
    d = await store(pg, 'an_train1')
    ok('n180: one tap records extubation, and it is charted as an Extubation event', d['recovery']['marks'].get('extubation') and any(e['kind'] == 'extubation' for e in d['events']) and await pg.locator('.an-rmk.done[data-rmk=extubation]').count() == 1)
    await pg.click('[data-rmk=headup]'); await pg.wait_for_timeout(300)
    await pg.click('[data-rmk=headup]'); await pg.wait_for_selector('#anSheet [data-rclear]'); await pg.click('#anSheet [data-rclear]'); await pg.wait_for_timeout(400)
    d = await store(pg, 'an_train1')
    ok('n180: tapping a recorded milestone lets you change or clear it', 'headup' not in d['recovery']['marks'] and await pg.locator('.an-rmk.done[data-rmk=headup]').count() == 0)
    await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300)
    ok('n180: the check opens on temperature', await pg.evaluate("document.activeElement.id") == 'rc_temp')
    await pg.fill('#rc_temp', '140'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(300)
    ok('n180: an impossible temperature is caught', await pg.locator('#anSheet').count() == 1 and '77–113' in await pg.inner_text('#anSheet [data-ferr=temp]'))
    await pg.fill('#rc_temp', '98.4'); await pg.fill('#rc_hr', '110'); await pg.click('#anSheet [data-chips=pain] [data-v="2"]'); await pg.click('#anSheet [data-chips=mentation] [data-v=quiet]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
    d = await store(pg, 'an_train1'); c0 = d['recovery']['checks'][-1]
    ok('n180: recovery check saved (98.4 °F, HR 110, pain 2, quiet)', c0['temp'] == 98.4 and c0['hr'] == 110 and c0['pain'] == 2 and c0['mentation'] == 'quiet', c0)
    await pg.evaluate("window.__anSkip=(window.__anSkip||0)+16*60000"); await pg.evaluate("window.anesiaApp.render(true)"); await pg.wait_for_timeout(200)
    ok('n180: the next check is due after 15 minutes', 'Check due' in await pg.inner_text('.an-rech'))
    await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300); await pg.fill('#rc_temp', '99.1'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
    rows = await pg.evaluate("[...document.querySelectorAll('.an-rck .vals')].map(x=>x.innerText)")
    ok('n180: checks are listed newest first, with the temperature trend', len(rows) == 2 and rows[0].startswith('99.1 °F') and await pg.locator('.an-rck i.up svg.an-sf').count() == 1 and 'Pain 2/4' in rows[1] and 'Quiet' in rows[1] and 'Check due' not in await pg.inner_text('.an-rech'), rows)
    fc = await pg.evaluate("[document.querySelector('.an-rtemp')?.innerText, document.querySelector('.an-rready')?.innerText]")
    ok('n181: forecast from the trend: rising +2.6 °F/h, about 100 °F by a time', fc[0] and 'Rising +2.6 °F/h · about 100 °F by' in fc[0], fc)
    ok('n181: not ready yet lists the milestones still missing', fc[1] and 'Not ready yet' in fc[1] and 'Head up not recorded' in fc[1] and 'Standing not recorded' in fc[1] and 'Extubated not recorded' not in fc[1], fc)
    await shot(pg, '95-recovery-dark')
    await pg.click('#anREnd'); await pg.wait_for_selector('#anSheet [data-chips=dest]'); await pg.wait_for_timeout(300)
    es = await pg.evaluate("[document.querySelector('#anSheet [data-ok]').disabled, document.querySelector('#anSheet').innerText]")
    ok('n180: End recovery asks where the patient goes and lists what wasn’t recorded', es[0] and 'Not recorded: Head up, Sternal, Standing' in es[1], es)
    ok('n180: the destinations are the sheet’s locations: Wards, ICU, Isolation', await pg.evaluate("[...document.querySelectorAll('#anSheet [data-chips=dest] .an-chip')].map(c=>c.innerText)") == ['Wards', 'ICU', 'Isolation'])
    await pg.click('#anSheet [data-chips=dest] [data-v=Wards]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
    d = await store(pg, 'an_train1')
    st = await pg.evaluate("[document.querySelector('.an-rhead .an-pill.warn')?.innerText, !!document.querySelector('#anSign'), document.querySelector('.an-rech p').innerText, document.querySelectorAll('.an-rmk:disabled').length, !!document.querySelector('#anRCheck')]")
    ok('n180: recovery ended, to Wards; then Sign record', d['recovery']['dest'] == 'Wards' and d['recovery']['end'] and st[0] == 'Ended · not signed' and st[1] and 'to Wards' in st[2] and st[3] == 4 and not st[4], st)
    ok('no page errors (n180)', not errs, errs)
    await ctx.close()
    # a sheet record: the recovery goes to the treatment sheet; Treatment Sheets and the OR show it
    sd = json.loads(SEED); sd['sheets/sh_rec'] = {'tenant_id': 'shoreline', 'status': 'active', 'patient': {'name': 'Rex', 'species': 'Canine', 'weight': 20, 'code': 'CPR'}}
    r1 = json.loads(json.dumps(sd['anesia_records/an_train1'])); r1['id'] = 'an_case10'; r1['kind'] = 'case'; r1['sheet_id'] = 'sh_rec'; r1['patient']['name'] = 'Rex'; sd['anesia_records/an_case10'] = r1
    ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', color_scheme='dark')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL + '?embed=1&sheet=sh_rec#r=an_case10'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec'); await pg.wait_for_timeout(300)
    await pg.click('[data-rmk=extubation]'); await pg.wait_for_timeout(300)
    await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300); await pg.fill('#rc_temp', '98.6'); await pg.click('#anSheet [data-chips=pain] [data-v="1"]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(600)
    sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_rec']||{}).anesthesia||null))")
    ok('n180: the treatment sheet learns the recovery: started, extubated, last check', sm and sm['status'] == 'ended' and sm['recovery'] and sm['recovery']['start'] and not sm['recovery']['end'] and sm['recovery']['marks'].get('extubation') and sm['recovery']['last']['temp'] == 98.6 and sm['recovery']['last']['pain'] == 1, sm and sm.get('recovery'))
    ok('no page errors (n180 sheet)', not errs, errs)
    await ctx.close()
    import time as _t2
    T1 = PIN_MS
    rec_sum = {'v': 1, 'rec': 'an_x', 'status': 'ended', 'start': T1 - 90 * 60000, 'end': T1 - 12 * 60000, 'signed': None, 'confirmed': True, 'asa': '2', 'timeout': True, 'kg': 20, 'last': None,
               'recovery': {'start': T1 - 12 * 60000, 'end': None, 'dest': '', 'marks': {'extubation': T1 - 10 * 60000}, 'last': {'at': T1 - 2 * 60000, 'temp': 98.6, 'hr': 100, 'pain': 1, 'mentation': 'quiet'}}}
    sd2 = json.loads(SEED); sd2['sheets/sh_rec'] = {'tenant_id': 'shoreline', 'status': 'active', 'board': 'IP', 'visit_id': 'v_r', 'patient': {'name': 'Rex', 'species': 'Canine', 'weight': 20, 'code': 'CPR'}, 'orders': {}, 'anesthesia': rec_sum,
        'surgery': {'id': 'case_rec', 'status': 'recovery', 'procedure': 'TPLO', 'roomId': 'or1', 'date': pin_now().strftime('%Y-%m-%d'), 'sched': 600, 'surgeonId': None, 'events': [], 'readiness': {}, 'rman': {}}}
    ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='America/Los_Angeles', color_scheme='light')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd2))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    await ctx.add_init_script("try{localStorage.setItem('tsCurrentSheet','sh_rec')}catch(e){}")
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1500)
    b = await pg.evaluate("(()=>{const el=document.querySelector('#clinSwitcher .seg[data-ctab=anes] .seg-badge.anes');const t=document.querySelector('#clinSwitcher .seg[data-ctab=anes]');return el?[el.className,el.textContent,t.title,getComputedStyle(el).backgroundColor]:null})()")
    ok('n180: Treatment Sheets’ Anesthesia tab says Recovery 12 min (purple), with the last temperature and pain', b and 'rec' in b[0] and b[1] == 'Recovery 12 min' and '98.6 °F' in b[2] and 'pain 1/4' in b[2] and b[3] == 'rgb(139, 77, 181)', b)
    await pg.goto(f'http://127.0.0.1:{PORT}/or/'); await pg.wait_for_timeout(1500)
    om = await pg.evaluate("(()=>{const c=CASES.find(x=>x.id==='case_rec');return c?anOf(c).mode:null})()")
    ok('n180: the OR shows In recovery · extubated (time)', om and om.startswith('In recovery · extubated '), om)
    ok('no page errors (n180 treatment/OR)', not [e for e in errs if 'anes' in e.lower() or 'recovery' in e.lower()], errs)
    await ctx.close()



@section(id='n182', title='n182: dark mode has no cyan-filled buttons (Admit/Discharge card face instead); one calm recovery green',
         apps=['anesia'], topics=['dark-mode'])
async def s_n182(br):
    CY = """(()=>[...document.querySelectorAll('button,a,[role=button]')].filter(e=>e.getClientRects().length).filter(e=>{const m=getComputedStyle(e).backgroundColor.match(/[\\d.]+/g);if(!m)return false;const [r,g,b,a=1]=m.map(Number);return a>.5&&b>150&&g>140&&r<120&&g-r>60}).map(e=>(e.innerText||'').trim()))()"""
    ctx, pg, errs = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('.an-lhead'); found = await pg.evaluate(CY)
    await pg.click('#anNew'); await pg.wait_for_selector('#anSheet [data-ok]'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY)
    face = await pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('#anSheet [data-ok]'));return [c.backgroundImage.includes('gradient'),c.borderTopColor,c.color,c.fontWeight]})()")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
    for a in ('dose', 'infusion'):
        await pg.click('[data-act=%s]' % a); await pg.wait_for_selector('#anSheet'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.click('[data-act=vitals]'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.click('#anEnd'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec')
    await pg.click('#anRCheck'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await shot(pg, '101-dark-sheet-save'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('n182: dark mode — no cyan-filled buttons anywhere (sheets, vitals Save, New record, End, Sign)', not found, found)
    ok('n182: the primary button wears the Admit/Discharge face (gradient card, hairline, white 600)', face[0] and face[2] == 'rgba(245, 248, 252, 0.96)' and face[3] == '600', face)
    for k in ('extubation', 'headup'): await pg.click('[data-rmk=%s]' % k); await pg.wait_for_timeout(250)
    g = await pg.evaluate("(()=>{const t=document.querySelector('.an-rmk.done');return [getComputedStyle(t).backgroundColor,getComputedStyle(t.querySelector('.ic .disc')).fill,getComputedStyle(t.querySelector('.tm')).color]})()")
    ok('n182: finished milestones are neutral tiles with one green check (Pravix #5CC75A)', 'rgb(92, 199, 90)' == g[1] and '72, 184, 136' not in g[0] and '91, 214, 168' not in g[2], g)
    sf = await pg.evaluate("(()=>{const d=document.querySelector('.an-rmk.done[data-rmk=headup] svg.an-sf'),u=document.querySelector('.an-rmk:not(.done) svg.an-sf');return {done:!!(d&&d.querySelector('.disc')&&d.querySelector('.tick')),bounce:d&&d.classList.contains('bounce'),anim:d&&getComputedStyle(d).animationName,open:!!(u&&u.querySelector('.ring')&&!u.querySelector('.disc'))}})()")
    ok('n183: milestones are SF-style: open circle, then checkmark.circle.fill with Bounce on the one just marked', sf['done'] and sf['open'] and sf['bounce'] and sf['anim'] == 'anSfBounce', sf)
    await pg.wait_for_timeout(900); await pg.evaluate("window.anesiaApp.render(true)"); await pg.wait_for_timeout(100)
    ok('n183: the Bounce plays once (not again on the next render)', await pg.locator('.an-rmk svg.an-sf.bounce').count() == 0)
    ok('no page errors (n182)', not errs, errs)
    await ctx.close()
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('[data-act=dose]'); await pg.wait_for_selector('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
    ok('n182: light mode keeps its primary fill', 'rgb(56, 189, 210)' in await pg.evaluate("getComputedStyle(document.querySelector('#anSheet [data-ok]')).backgroundColor") or 'rgb(' in await pg.evaluate("getComputedStyle(document.querySelector('#anSheet [data-ok]')).backgroundColor"))
    await ctx.close()


@section(id='n200', title="n200: a sheet doesn't take focus back from a field already chosen",
         apps=['anesia'], topics=['accessibility', 'sheets-alerts'])
async def s_n200(br):
    ctx, pg, errs = await new_page(br, seed=False)
    await pg.goto(URL); await pg.wait_for_selector('.an-empty')
    f = await pg.evaluate("""(async()=>{document.getElementById('anNew').click();const k=document.querySelector('#anSheet [name=kg]');k.focus();await new Promise(r=>setTimeout(r,120));return [document.activeElement.name, document.activeElement===k]})()""")
    ok('n200: Anesia — choosing a field right after a sheet opens keeps focus there (it no longer jumps back to the first field)', f == ['kg', True], f)
    await pg.keyboard.type('18.2'); await pg.fill('[name=name]', 'Training dog 10'); await pg.click('[data-ok]')
    await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    keys = await pg.evaluate("Object.keys(window.__fs).filter(k=>k.startsWith('anesia_records/'))"); d = await store(pg, keys[0].split('/')[1]) if keys else None
    ok('n200: …so the weight typed there is saved, and the name is untouched', d and d['patient']['name'] == 'Training dog 10' and d['patient']['weights'][0]['kg'] == 18.2, d and d['patient'])
    ok('no new page errors (n200 Anesia)', not errs, errs)
    await ctx.close()


@section(id='n204', title="n204: iPhone — Anesia's charting toolbar stays on screen (HIG Ornaments / Toolbars)",
         apps=['anesia'], topics=['toolbars'])
async def s_n204(br):
    ctx, pg, errs = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    b1 = await pg.evaluate("""(()=>{const t=document.querySelector('.an-tools'),r=t.getBoundingClientRect();const vis=[...t.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0&&getComputedStyle(b).display!=='none').map(b=>b.dataset.act||b.id);return {pos:getComputedStyle(t).position,bottom:Math.round(innerHeight-r.bottom),left:Math.round(r.left),right:Math.round(innerWidth-r.right),h:Math.round(r.height),vis}})()""")
    ok('n204: iPhone — the toolbar docks at the bottom as one row: Vitals now, Give drug, Event, Emergency, More', b1['pos'] == 'fixed' and b1['bottom'] <= 16 and b1['h'] < 64 and b1['vis'] == ['vitals', 'dose', 'event', 'anMore', 'anEmer'] or (b1['pos'] == 'fixed' and sorted(b1['vis']) == sorted(['vitals', 'dose', 'event', 'anMore', 'anEmer']) and b1['h'] < 64), b1)
    await pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight);0"); await pg.wait_for_timeout(400)
    b2 = await pg.evaluate("""(()=>{const t=document.querySelector('.an-tools').getBoundingClientRect();const items=[...document.querySelectorAll('#anApp .an-body *')].filter(e=>e.children.length===0&&e.getBoundingClientRect().height>0);const last=items.reduce((m,e)=>Math.max(m,e.getBoundingClientRect().bottom),0);return {inView:t.top>0&&t.bottom<=innerHeight,lastBottom:Math.round(last),barTop:Math.round(t.top)}})()""")
    await shot(pg, 'n204-phone-bottom-bar')
    ok('n204: …stays visible after scrolling to the end, and the record keeps room for it (nothing hidden under the bar)', b2['inView'] and b2['lastBottom'] <= b2['barTop'] + 1, b2)
    await pg.click('#anMore'); await pg.wait_for_timeout(350)
    m1 = await pg.evaluate("""(()=>{const x=document.querySelector('.pvx-cx:not(.out)');if(!x) return null;return {sheet:x.classList.contains('sheet'),labels:[...x.querySelectorAll('.pvx-cx-list button .l')].map(l=>l.textContent),cancel:!!x.querySelector('.pvx-cx-cancel')}})()""")
    await shot(pg, 'n204-phone-more')
    ok('n204: More opens the rest as an action sheet: Infusion…, Gas…, Output…, Airway…, Minutes per column ›, Totals and history', m1 and m1['sheet'] and m1['cancel'] and m1['labels'] == ['Infusion…', 'Gas…', 'Output…', 'Airway…', 'Minutes per column', 'Totals and history'], m1)
    await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>/Minutes per column/.test(b.textContent)).click();0"); await pg.wait_for_timeout(200)
    z1 = await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button[role=menuitemradio]')].map(b=>[b.querySelector('.l').textContent,b.getAttribute('aria-checked')])")
    await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent.trim()==='10 min').click();0"); await pg.wait_for_timeout(400)
    z2 = await pg.evaluate("(document.querySelector('.an-tools [data-zoom=\"10\"]')||{}).getAttribute&&document.querySelector('.an-tools [data-zoom=\"10\"]').getAttribute('aria-checked')")
    ok('n204: Minutes per column › shows the current choice with a checkmark, and picking 10 min changes the chart', [x[1] for x in z1].count('true') == 1 and z2 == 'true', [z1, z2])
    await pg.click('#anMore'); await pg.wait_for_timeout(300)
    await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent==='Gas…').click();0"); await pg.wait_for_timeout(400)
    g1 = await pg.evaluate("document.getElementById('anShT')&&document.getElementById('anShT').textContent")
    ok('n204: a More item opens the same sheet as the tool (Gas…)', g1 == 'Gas', g1)
    ok('no new page errors (n204 iPhone)', not errs, errs)
    await ctx.close()
    ctx, pg, errs = await new_page(br, vp=(1180, 820), touch=True)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
    i1 = await pg.evaluate("[getComputedStyle(document.querySelector('.an-tools')).position, getComputedStyle(document.getElementById('anMore')).display, getComputedStyle(document.querySelector('.an-tools [data-act=gas]')).display]")
    ok('n204: iPad and Mac keep the sticky toolbar at the top with every tool (no More)', i1[0] == 'sticky' and i1[1] == 'none' and i1[2] != 'none', i1)
    ok('no new page errors (n204 iPad)', not errs, errs)
    await ctx.close()
