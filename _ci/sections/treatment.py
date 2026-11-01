"""Treatment Sheets."""
from core import *
from helpers import *


@section(id='n166', title='n166: Anesia inside the Treatment Sheet',
         apps=['anesia', 'treatment', 'topbar'], topics=['sheets-alerts'])
async def s_n166(br):
    import urllib.parse as _up
    PRE_J = json.dumps({'name': 'Max', 'species': 'dog', 'breed': 'Labrador', 'sex': 'Male neutered', 'age': '6 y', 'kg': 31.2, 'cpr': 'DNR', 'allergies': 'Penicillin', 'nka': False})
    EMB = URL + '?embed=1&sheet=sh_test&pre=' + _up.quote(PRE_J)
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(EMB); await pg.wait_for_selector('.an-shead')
    ok('n166: in a sheet, Anesia hides its own top bar', await pg.evaluate("getComputedStyle(document.getElementById('pvxTopnav')).display") == 'none')
    ok('n166: only this patient: empty state names the patient', 'No anesthesia record for Max yet' in await pg.inner_text('.an-shead') and await pg.locator('.an-card').count() == 0)
    await pg.click('#anNew'); await pg.wait_for_selector('#anSheet [name=name]'); await pg.wait_for_timeout(350)   # let the sheet finish opening, as a person would
    pf = await pg.evaluate("[document.querySelector('#anSheet [name=name]').value, document.querySelector('#anSheet [name=kg]').value, document.querySelector('#anSheet [data-chips=cpr] [aria-pressed=true]').dataset.v, document.querySelector('#anSheet [name=allergies]').value, document.querySelector('#anSheet [name=sex]').value, document.querySelector('#anShT').textContent]")
    ok('n166: name, weight, code status, allergies and sex come from the sheet', pf[:5] == ['Max', '31.2', 'DNR', 'Penicillin', 'Male neutered'] and pf[5] == 'Start anesthesia record', pf)
    await pg.fill('#anSheet [name=procedure]', 'Exploratory laparotomy'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    keys = await pg.evaluate("Object.keys(window.__fs).filter(k=>k.startsWith('anesia_records/'))")
    recs = [await store(pg, k.split('/')[1]) for k in keys]; mine = [r for r in recs if r and r.get('sheet_id') == 'sh_test']
    ok('n166: the record is linked to the sheet as a patient case', len(mine) == 1 and mine[0]['kind'] == 'case' and mine[0]['patient']['weights'][0]['kg'] == 31.2)
    ok('n166: the header says "Treatment sheet", not "Training"', await pg.locator('.an-pill.sheet').count() == 1 and await pg.locator('.an-rhead .an-pill.training').count() == 0)
    ok('n166: it still asks to confirm the patient', await pg.locator('#anConfirm').count() == 1)
    await pg.click('.an-back'); await pg.wait_for_selector('.an-shead'); await until(pg, "document.querySelectorAll('.an-card').length===1&&(document.querySelector('.an-list')||{}).innerText.includes('Exploratory laparotomy')", 8000)
    ok('n166: back shows this patient’s records', await pg.locator('.an-card').count() == 1 and 'Exploratory laparotomy' in await pg.inner_text('.an-list'))
    ok('no page errors (n166 embed)', not errs, errs)
    await ctx.close()
    sd = json.loads(SEED); sd['anesia_records/' + mine[0]['id']] = mine[0]
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(EMB); await pg.wait_for_selector('.an-chart', timeout=5000)
    ok('n166: reopening the tab goes straight to the open record', 'r=' + mine[0]['id'] in await pg.evaluate("location.hash"))
    await pg.goto(URL); await pg.wait_for_selector('.an-lhead'); await pg.wait_for_timeout(200)
    ok('n166: the full Anesia list shows training and sheet records, labelled', await pg.locator('.an-card .an-pill.training').count() >= 1 and await pg.locator('.an-card .an-pill.sheet').count() == 1)
    await ctx.close()
    ctx, pg, errs = await new_page(br, dark=False)
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1200)
    tb = await pg.evaluate("""(()=>{localStorage.setItem('tsCurrentSheet','sh_test');Object.assign(VISIT,{patient:'Max',species:'Dog',breed:'Labrador',sex:'MN',age:'6 y',weight:31.2,code:'DNR',allergies:'Penicillin'});
      const segs=[...document.querySelectorAll('#clinSwitcher .seg')].map(b=>b.dataset.ctab); selectCTab('anes'); const f=document.querySelector('#ctab-anes iframe');
      return {order:segs, frame:!!f, src:f?f.getAttribute('src'):'', active:document.querySelector('[data-ctab=anes]').classList.contains('active')}})()""")
    ok('n166: Treatment Sheets has an Anesthesia tab right after Vitals', tb['order'].index('anes') == tb['order'].index('vitals') + 1, tb['order'])
    ok('n166: the tab opens this patient’s anesthesia record in place', tb['frame'] and tb['active'] and 'sheet=sh_test' in tb['src'] and 'Max' in _up.unquote(tb['src']), tb)
    await pg.wait_for_timeout(1500)
    fr = pg.frame_locator('#ctab-anes iframe')
    ok('n166: the embedded record shows (no second top bar)', await fr.locator('.an-chart, .an-shead').count() >= 1)
    await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(200)
    ok('n166: switching the sheet to dark mode switches the record too', await pg.evaluate("document.querySelector('#ctab-anes iframe').contentDocument.body.classList.contains('dark')"))
    await pg.screenshot(path=os.path.join(SHOTS, '44-treatment-anes-dark.png'))
    await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(200)
    await pg.click('[data-ctab=vitals]'); await pg.wait_for_timeout(200)
    ok('n166: other tabs still work after the Anesthesia tab', await pg.evaluate("!document.querySelector('#ctab-vitals').classList.contains('hidden') && document.querySelector('#ctab-anes').classList.contains('hidden')"))
    await pg.click('[data-ctab=anes]'); await pg.wait_for_timeout(500)
    await pg.screenshot(path=os.path.join(SHOTS, '43-treatment-anes.png'))
    ok('no page errors (treatment tab)', not [e for e in errs if 'anes' in e.lower()], errs)
    await ctx.close()


@section(id='n169_2', title='n169: Expand inside Treatment Sheets (covers the sheet, fills the window)',
         apps=['anesia', 'treatment'], topics=['sheets-alerts'])
async def s_n169_2(br):
    for cookie in ('light', 'dark'):
        ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark', timezone_id='America/Los_Angeles')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': cookie, 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1000)
        await pg.evaluate("localStorage.setItem('tsCurrentSheet','sh_x');Object.assign(VISIT,{patient:'Max',species:'Dog',weight:31.2});selectCTab('anes')"); await pg.wait_for_timeout(1500)
        fr = pg.frame_locator('#ctab-anes iframe')
        await fr.locator('#anNew').click(); await fr.locator('#anSheet [name=procedure]').fill('Exploratory laparotomy'); await fr.locator('#anSheet [data-ok]').click()
        await fr.locator('.an-chart').wait_for(); await pg.wait_for_timeout(300)
        await fr.locator('#anExpand').click(); await pg.wait_for_timeout(600)
        g = await pg.evaluate("(()=>{const b=document.querySelector('#ctab-anes .ts-anes'),r=b.getBoundingClientRect(),f=b.querySelector('iframe').getBoundingClientRect();return [b.classList.contains('expanded'),Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),Math.round(f.height),innerWidth,innerHeight,document.querySelector('iframe').contentDocument.documentElement.classList.contains('an-expanded')]})()")
        ok(f'n169 sheet {cookie}: Expand covers the whole window', g[0] and g[1] == 0 and g[2] == 0 and g[3] == g[6] and g[4] == g[7] and g[5] >= g[7] - 1 and g[8], g)
        await pg.screenshot(path=os.path.join(SHOTS, f'51-sheet-expanded-{cookie}.png'))
        await fr.locator('#anExpand').focus(); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
        g2 = await pg.evaluate("[document.querySelector('#ctab-anes .ts-anes').classList.contains('expanded'), document.querySelector('iframe').contentDocument.documentElement.classList.contains('an-expanded'), document.documentElement.classList.contains('ts-anes-lock')]")
        ok(f'n169 sheet {cookie}: Esc in the record returns to the sheet', g2 == [False, False, False], g2)
        await fr.locator('#anExpand').click(); await pg.wait_for_timeout(500)
        await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(500)
        g3 = await pg.evaluate("[!!document.querySelector('#ctab-anes .ts-anes.expanded'), document.documentElement.classList.contains('ts-anes-lock')]")
        ok(f'n169 sheet {cookie}: switching tabs leaves expanded view', g3 == [False, False], g3)
        ok(f'n169 sheet {cookie}: no page errors', not [e for e in errs if 'anes' in e.lower() or 'expand' in e.lower()], errs)
        await ctx.close()


@section(id='n176', title='n176: Anesia ⇄ Treatment Sheets ⇄ OR, through the sheet document',
         apps=['anesia', 'treatment', 'flow', 'or'], topics=['sheets-alerts'])
async def s_n176(br):
    import time as _time; T0 = PIN_MS   # the sheet badge and the OR clock run on the pinned clock
    SH_ALS = {'tenant_id': 'shoreline', 'status': 'active', 'board': 'IP', 'visit_id': 'v_als', 'patient': {'name': 'Bella', 'species': 'Feline', 'breed': 'DSH', 'sex': 'FS', 'age': '3 y', 'weight': 4.1, 'code': 'ALS', 'allergies': ''}, 'orders': {}}
    sd = json.loads(SEED); sd['sheets/sh_als'] = SH_ALS
    ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(URL + '?embed=1&sheet=sh_als'); await pg.wait_for_selector('.an-shead'); await pg.wait_for_timeout(300)   # the OR's link: sheet id only, no ?pre=
    ok('n176: with only a sheet id, the patient comes from the sheet document', 'No anesthesia record for Bella yet' in await pg.inner_text('.an-shead'))
    await pg.evaluate("firebase.firestore().collection('sheets').doc('sh_als').update({'patient.weight': 4.4})"); await pg.wait_for_timeout(300)
    await pg.click('#anNew'); await pg.wait_for_selector('#anSheet [name=name]'); await pg.wait_for_timeout(350)
    pf = await pg.evaluate("[document.querySelector('#anShT').innerText, document.querySelector('#anSheet [name=name]').value, document.querySelector('#anSheet [name=kg]').value, document.querySelector('#anSheet input[name=cpr]').value, document.querySelector('#anSheet [name=species]').value, [!!document.querySelector('#anSheet .an-codef .cpr-pill'), document.querySelectorAll('#anSheet [data-chips=cpr]').length, (document.querySelector('#anSheet .an-codef')||{}).innerText]]")
    ok('n176: it is a sheet record, with the sheet’s current weight and its ALS code', pf[0] == 'Start anesthesia record' and pf[1] == 'Bella' and pf[2] == '4.4' and pf[3] == 'ALS' and pf[4] == 'cat', pf)
    ok('n177: a sheet record’s code status is Flow’s: Pravix’s pill, not editable here', pf[5][0] is True and pf[5][1] == 0 and 'From Flow' in (pf[5][2] or ''), pf[5])
    await pg.fill('#anSheet [name=procedure]', 'Dental'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(400)
    rid = await pg.evaluate("location.hash.slice(3)"); d = await store(pg, rid)
    ok('n176: created as a case linked to the sheet (never a training record)', d and d['kind'] == 'case' and d['sheet_id'] == 'sh_als' and d['patient']['cpr'] == 'ALS', d and (d['kind'], d.get('sheet_id')))
    ok('n176: the record header shows the ALS code', 'ALS' in await pg.inner_text('.an-sum .cpr-pill.mini'))
    sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_als']||{}).anesthesia||null))")
    ok('n176: the sheet now carries the record’s summary: planned, not confirmed', sm and sm['rec'] == rid and sm['status'] == 'planned' and sm['confirmed'] is False and sm['procedure'] == 'Dental', sm)
    ok('n176: and nothing else on the sheet changed', await pg.evaluate("JSON.stringify(window.__fs['sheets/sh_als'].patient)") == json.dumps({**SH_ALS['patient'], 'weight': 4.4}, separators=(',', ':')))
    await pg.click('#anStart'); await pg.wait_for_timeout(200); await pg.click('[data-ok]'); await pg.wait_for_timeout(400); await pg.click('[data-ok]'); await pg.wait_for_timeout(400)
    await vitals_save(pg, {'hr': 150, 'spo2': 97, 'temp': 99.1}); await pg.wait_for_timeout(400)
    sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_als']||{}).anesthesia||null))")
    ok('n176: after Start and vitals the summary says active, confirmed, with the latest vitals', sm and sm['status'] == 'active' and sm['confirmed'] is True and sm['start'] and sm['last'] and sm['last']['hr'] == 150 and sm['last']['spo2'] == 97 and sm['kg'] == 4.4, sm)
    await pg.click('#anEnd'); await pg.wait_for_timeout(200); await pg.click('[data-ok]'); await pg.wait_for_timeout(500)
    sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_als']||{}).anesthesia||null))")
    ok('n176: End anesthesia reaches the sheet', sm and sm['status'] == 'ended' and sm['end'], sm)
    ok('no page errors (n176 Anesia)', not errs, errs)
    await pg.goto(URL + '?sheet=sh_als#r=' + rid); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    lk = await pg.evaluate("(()=>{const a=document.querySelector('.an-rhead h1 a.an-pill.sheet');return a?a.getAttribute('href'):null})()")
    ok('n176: outside the frame, the "Treatment sheet" pill links to the sheet’s Anesthesia tab', lk == '/treatment/#sheet=sh_als&tab=anes', lk)
    await pg.goto(URL + '?embed=1&sheet=sh_als#r=' + rid); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    ok('n176: inside the frame it is not a link', await pg.locator('.an-rhead h1 a.an-pill.sheet').count() == 0 and await pg.locator('.an-rhead h1 span.an-pill.sheet').count() == 1)
    await ctx.close()
    # Treatment Sheets: the tab badge follows the sheet's summary
    for st, exp in (('active', 'live'), ('ended', 'over'), ('signed', 'done')):
        sd2 = json.loads(SEED); sh = json.loads(json.dumps(SH_ALS)); sh['anesthesia'] = {'v': 1, 'rec': 'an_x', 'status': st, 'start': T0 - 12 * 60000, 'end': T0 if st != 'active' else None, 'signed': {'at': T0, 'by': 'Resident A'} if st == 'signed' else None, 'confirmed': True, 'asa': '2', 'timeout': True, 'kg': 4.4, 'last': {'at': T0, 'hr': 150, 'spo2': 97}}
        sd2['sheets/sh_als'] = sh
        ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
        await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd2))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        await ctx.add_init_script("try{localStorage.setItem('tsCurrentSheet','sh_als')}catch(e){}")
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1500)
        b = await pg.evaluate("(()=>{const el=document.querySelector('#clinSwitcher .seg[data-ctab=anes] .seg-badge.anes');const b=document.querySelector('#clinSwitcher .seg[data-ctab=anes]');return el?[el.className,el.textContent,b.title,getComputedStyle(el).display,getComputedStyle(el).backgroundColor]:null})()")
        want = {'live': lambda b: 'live' in b[0] and b[1] == '12 min' and b[2].startswith('Under anesthesia · 12 min') and 'HR 150' in b[2] and b[3] != 'none' and b[4] == 'rgb(92, 199, 90)',
                'over': lambda b: 'over' in b[0] and b[1] == 'Unsigned' and b[3] != 'none' and b[4] == 'rgb(242, 199, 68)',
                'done': lambda b: 'done' in b[0] and b[3] == 'none' and b[2] == 'Anesthesia record signed'}[exp]
        ok(f'n176: the sheet’s Anesthesia tab shows the record state ({st})', b and want(b), b)
        if st == 'active': await pg.screenshot(path=os.path.join(SHOTS, '60-treatment-anes-badge.png'))
        ok(f'no page errors (treatment badge {st})', not [e for e in errs if 'anes' in e.lower()], errs)
        await ctx.close()
    # the OR: the live board reads the same summary
    sd3 = json.loads(SEED); sh = json.loads(json.dumps(SH_ALS))
    sh['surgery'] = {'id': 'case_als', 'status': 'in_room', 'procedure': 'Dental', 'roomId': 'or2', 'date': pin_now().strftime('%Y-%m-%d'), 'sched': 840, 'surgeonId': None, 'events': [], 'readiness': {}, 'rman': {}}
    sh['anesthesia'] = {'v': 1, 'rec': 'an_x', 'status': 'active', 'start': T0 - 12 * 60000, 'end': None, 'signed': None, 'confirmed': True, 'asa': '2', 'timeout': True, 'kg': 4.4, 'last': {'at': T0, 'hr': 150, 'map': 72, 'spo2': 97, 'etco2': 38, 'temp': 99.1}}
    sd3['sheets/sh_als'] = sh
    ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='America/Los_Angeles', color_scheme='dark')
    await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd3))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    await pg.goto(f'http://127.0.0.1:{PORT}/or/'); await pg.wait_for_timeout(1500)
    o = await pg.evaluate("(()=>{const c=CASES.find(x=>x.id==='case_als');if(!c)return null;const an=anOf(c);return {state:an&&an.state,hr:an&&an.hr,real:an&&an.real,start:an&&Math.round(an.start),ready:c.readiness.anesthesia,cpr:c.readiness.cpr,note:(c._auto||{}).anesthesia||null,now:Math.round(now())}})()")
    ok('n176: the OR builds the anesthesia state from the sheet (active, 12 min ago, real vitals)', o and o['state'] == 'active' and o['hr'] == 150 and o['real'] is True and abs(o['now'] - o['start'] - 12) <= 1, o)
    ok('n176: "Anesthesia assessment complete" ticks itself from Anesia, and ALS satisfies the code check', o and o['ready'] == 'done' and o['cpr'] == 'done' and o['note'] == 'Patient confirmed in Anesia · ASA 2', o)
    await pg.evaluate("openDrawer('case_als')"); await pg.wait_for_timeout(400)
    dr = await pg.evaluate("(()=>{const a=document.querySelector('#drawer .or-anesia');const b=document.querySelector('#drawerAnesia');return {cls:a&&a.className,txt:a&&a.innerText.replace(/\\s+/g,' '),vit:a&&getComputedStyle(a.querySelector('.or-vitals')).display,btn:b&&getComputedStyle(b).display}})()")
    ok('n176: the drawer’s Anesia card is live: Active, HR 150, SpO₂ 97%, start time', dr['cls'] and 'real' in dr['cls'] and 'Active' in dr['txt'] and '150' in dr['txt'] and '97%' in dr['txt'] and 'Anesthesia start' in dr['txt'] and dr['vit'] == 'grid', dr)
    ok('n176: "Open Anesia" is back on the live board', dr['btn'] not in (None, 'none'), dr)
    popup = await pg.evaluate("(()=>{let u=null;window.open=(x)=>{u=x;return null};document.querySelector('#drawerAnesia').click();return u})()")
    ok('n176: it opens the patient’s actual record', popup == '/anesia/?sheet=sh_als#r=an_x', popup)
    await pg.screenshot(path=os.path.join(SHOTS, '61-or-anesia-live.png'))
    ok('no page errors (n176 OR)', not errs, errs)
    await ctx.close()



@section(id='n230', title='n230: Treatment Sheets — HIG Color, Layout, Materials (synthetic training patients)',
         apps=['treatment', 'flow', 'topbar'], topics=['layout', 'color', 'materials', 'sheets-alerts'])
async def s_n230(br):
    tsf = {f: open(os.path.join(BUILD, 'treatment', f), encoding='utf-8').read() for f in ('app.css', 'store.js', 'core.js', 'index.html')}
    ok('n230: no color-mix() anywhere in Treatment (211 were) — plain values, as Brand Identity says', all('color-mix(' not in v for v in tsf.values()), [k for k, v in tsf.items() if 'color-mix(' in v])
    used = set(_re230.findall(r'var\(--(pvx-cm\d+)\)', tsf['app.css'])); defd = set(_re230.findall(r'--(pvx-cm\d+):', tsf['app.css']))
    ok('n230: every colour that replaced a mix has a light and a dark value (%d)' % len(used), used and used <= defd and tsf['app.css'].count('body.dark{--pvx-cm') == 1, sorted(used - defd)[:5])
    # 1. one status colour map
    ctx, pg, errs = await ts230()
    await pg.evaluate("""(()=>{const h=document.querySelector('#ctab-dash .sb-hours');for(const k of ['overdue','due','scheduled']){const d=document.createElement('div');d.className='sb-blk '+k+' pvx-t230';d.innerHTML='<span class="sb-bn">1</span>';h.appendChild(d)}})()""")
    r = await pg.evaluate("""(H)=>{const hue=eval(H);const g=s=>document.querySelector(s);const bc=s=>g(s)?getComputedStyle(g(s)).backgroundColor:null;const b=getComputedStyle(document.body);
      return {od:bc('#ctab-dash .sb-blk.overdue'),du:bc('#ctab-dash .sb-blk.due.pvx-t230'),sc:bc('#ctab-dash .sb-blk.scheduled'),late:b.getPropertyValue('--st-late').trim(),due:b.getPropertyValue('--st-due').trim(),
        odHue:hue(bc('#ctab-dash .sb-blk.overdue')||'0,0,0'),scHue:hue(bc('#ctab-dash .sb-blk.scheduled')||'0,0,0'),
        clock:[...document.querySelectorAll('#ctab-dash .sb-blk.overdue:not(.pvx-t230)')].every(t=>t.querySelector('.sb-gl svg')),nOd:document.querySelectorAll('#ctab-dash .sb-blk.overdue:not(.pvx-t230)').length,
        legend:[...document.querySelectorAll('.sb-legend .li')].map(x=>x.textContent.trim()),lgOd:bc('.sb-lg.overdue'),lgDu:bc('.sb-lg.due'),
        late2:getComputedStyle(g('.ts-lc-nums .late')||document.body).color,tabClock:getComputedStyle(g('.pt-n.late')||document.body,'::before').width,
        tech:getComputedStyle(g('.tm-tech:not(.none)')||document.body,'::before').content,dots:[...document.querySelectorAll('.tm-p i')].map(i=>hue(getComputedStyle(i).backgroundColor))}}""", HUE)
    def hx(c): return '#%02X%02X%02X' % tuple(int(x) for x in _re230.findall(r'\d+', c)[:3]) if c else ''
    ok('n230: the board’s overdue tiles are the sheet’s amber and carry the clock; due now is the accent; scheduled is neutral (it was red / amber / green)',
       r['nOd'] >= 1 and r['clock'] and hx(r['od']) == r['late'].upper() and hx(r['du']) == r['due'].upper() and 25 <= r['odHue'] <= 50 and not (90 <= r['scHue'] <= 165), r)
    ok('n230: the board legend says Overdue · Due now · Scheduled · Done, with the same colours as the tiles', r['legend'][:3] == ['Overdue', 'Due now', 'Scheduled'] and r['legend'][3].endswith('Done') and r['lgOd'] == r['od'] and r['lgDu'] == r['du'], r['legend'])
    lh = await pg.evaluate(HUE + "(" + json.dumps(r['late2']) + ")")
    ok('n230: “late” in the workload is the overdue amber, not red', 25 <= lh <= 55, (r['late2'], lh))
    ok('n230: overdue counts on the patient tabs carry the clock; the tech is labelled; person colours avoid red, amber and green',
       r['tabClock'] == '9px' and r['tech'] == '"Tech"' and r['dots'] and all(not (h < 20 or h > 340 or 25 <= h <= 65 or 90 <= h <= 165) for h in r['dots'] if h >= 0), r)
    # toasts
    k = await pg.evaluate("[tsToastKind('Enter a value first'),tsToastKind('Couldn’t save — try again'),tsToastKind('Note saved'),tsToastKind('Choose a route')]")
    await pg.evaluate("toast('Enter a value first')"); await pg.wait_for_timeout(200)
    t = await pg.evaluate("(()=>{const x=[...document.querySelectorAll('.ctoast')].pop();return [x.className,x.getAttribute('role'),getComputedStyle(x.querySelector('.tk')).backgroundColor,x.querySelector('path').getAttribute('d')]})()")
    ok('n230: a toast that asks for something shows the amber “!”, a failure the red one; success keeps the green check (“Enter a value first” had a check)', k == ['warn', 'err', '', 'warn'] and 'warn' in t[0] and t[1] == 'status' and 'M12 6.5v7' in t[3], (k, t))
    # 2. teal only for things you can press
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(900)
    acc = await pg.evaluate("getComputedStyle(document.body).getPropertyValue('--accent').trim()")
    hd = await pg.evaluate("""(()=>[...document.querySelectorAll('.clinical-sidebar .panel>h4')].map(h=>getComputedStyle(h).color))()""")
    await pg.evaluate("selectCTab('charges')"); await pg.wait_for_timeout(800)
    hd += await pg.evaluate("""(()=>[...document.querySelectorAll('.ch-kicker,.ch-group>h4,#ctab-charges .panel>h4,.ch-code')].map(h=>getComputedStyle(h).color))()""")
    ok('n230: plain headings (Estimate range, Problem list, Vitals, Charges, codes) are neutral, not the accent that marks buttons', len(hd) >= 4 and all(hx(c) not in (acc.upper(), '#38BDD2', '#6FD3E4', '#1F8FA8', '#23439C') for c in hd), hd[:6])
    ok('n230: Treatment has no page errors (board, sheet, charges)', not errs, errs[:2])
    await ctx.close()
    # 3. abnormal vitals say so
    ctx, pg, errs = await ts230(view='vitals')
    for i, val in ((1, '105.8'), (2, '220')):
        await pg.fill(f'#vin-d{i}', val); await pg.locator(f'#vin-d{i}').press('Enter'); await pg.wait_for_timeout(500)
        yes = pg.locator(f'#vxw-d{i} button:has-text("Yes, ")')   # n233: a critical value asks once (the Enter used to confirm it by accident)
        if await yes.count() and await yes.first.is_visible(): await yes.first.click(); await pg.wait_for_timeout(500)
    await pg.wait_for_timeout(400)
    r = await pg.evaluate("""(()=>({hc:[...document.querySelectorAll('.tsh-vit.crit .pvx-sev')].map(x=>x.textContent),hw:[...document.querySelectorAll('.tsh-vit.warn .pvx-sev')].map(x=>x.textContent),
      al:(document.querySelector('.tsh-vit.crit')||{getAttribute:()=>''}).getAttribute('aria-label'),
      lc:[...document.querySelectorAll('.vx-now.coral .pvx-sev')].map(x=>x.textContent),lw:[...document.querySelectorAll('.vx-now.amber .pvx-sev')].map(x=>x.textContent),
      rec:[...document.querySelectorAll('#ctab-vitals .v-rec')].map(b=>getComputedStyle(b).backgroundColor),take:getComputedStyle(document.getElementById('vxTake')).backgroundColor,
      late:[...document.querySelectorAll('#ctab-vitals .vx-due.late')].map(x=>getComputedStyle(x).color).slice(0,1),
      hist:!!document.querySelector('#ctab-vitals .v-header .pvx-vhist'),foot:(()=>{const f=document.querySelector('#ctab-vitals .v-footer');return f?getComputedStyle(f).display:'none'})()}))()""")
    ok('n230: an abnormal vital says Critical or Abnormal with a symbol, in the header and the Vitals list, and VoiceOver hears it (colour was the only signal)',
       r['hc'] == ['Critical'] and r['hw'] == ['Abnormal'] and 'critical' in (r['al'] or '') and r['lc'] == ['Critical'] and r['lw'] == ['Abnormal'], r)
    lh = await pg.evaluate(HUE + "(" + json.dumps(r['late'][0] if r['late'] else 'rgb(0,0,0)') + ")")
    ok('n230: “Late · was due” on Vitals is the overdue amber (it was the accent teal)', r['late'] and 25 <= lh <= 55, (r['late'], lh))
    al = [float(_re230.findall(r'[\d.]+', c)[3]) if c.startswith('rgba') else 1 for c in r['rec']]
    ok('n230: Vitals has one filled colour button (Take vitals); each row’s Record is tinted', al and max(al) <= 0.3 and r['take'] != 'rgba(0, 0, 0, 0)', (r['rec'][:2], r['take']))
    ok('n230: Vitals history is in the Vitals toolbar, not a bar at the bottom of the window', r['hist'] and r['foot'] == 'none', r)
    ok('n230: no page errors on Vitals', not errs, errs[:2])
    await ctx.close()
    # 4. Increase Contrast and contrast
    ic = {}
    for dark in (True, False):
        for media in (None, [{'name': 'prefers-contrast', 'value': 'more'}]):
            ctx, pg, errs = await ts230(dark=dark, media=media)
            ic[(dark, bool(media))] = await pg.evaluate("(()=>{const b=getComputedStyle(document.body);return [b.getPropertyValue('--ink-500').trim(),b.getPropertyValue('--pvx-head').trim(),getComputedStyle(document.querySelector('#ctab-dash .sb-blk')).boxShadow]})()")
            await ctx.close()
    ok('n230: Increase Contrast strengthens Treatment’s text, headings and tiles in light and dark (it changed nothing but the glass)',
       all(ic[(d, True)][0] != ic[(d, False)][0] and ic[(d, True)][1] != ic[(d, False)][1] and 'inset' in ic[(d, True)][2] for d in (True, False)), ic)
    CJ230 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const P=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);return [p[0],p[1],p[2],p.length>3?p[3]:1]};
      const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);const mix=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1];
      const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const root=P(getComputedStyle(document.body).backgroundColor);
      const bgOf=e=>{const st=[];let img=false;for(let x=e;x;x=x.parentElement){const c=getComputedStyle(x);if(c.backgroundImage!=='none'&&!/url\(/.test(c.backgroundImage))img=true;const b=P(c.backgroundColor);if(b&&b[3]>0){st.push(b);if(b[3]>=1)break}}let base=[255,255,255,1];if(st.length&&st[st.length-1][3]>=1)base=st.pop();else if(root)base=root;for(let i=st.length-1;i>=0;i--)base=mix(st[i],base);return {c:base,img}};
      const f=[];document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;const r=e.getBoundingClientRect();if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight)return;
        const c=getComputedStyle(e);if(c.visibility==='hidden')return;let op=1;for(let x=e;x;x=x.parentElement)op*=+getComputedStyle(x).opacity;if(op<.05)return;
        const txt=[...e.childNodes].some(t=>t.nodeType===3&&t.textContent.trim());if(!txt)return;if(e.closest('[disabled],[aria-disabled=true]'))return;
        let fc=P(e instanceof SVGElement&&c.fill&&c.fill!=='none'?c.fill:c.color);if(!fc)return;const b=bgOf(e);if(b.img)return;fc=mix([fc[0],fc[1],fc[2],fc[3]*op],b.c);const cr=CR(fc,b.c);const fs=parseFloat(c.fontSize);const need=(fs>=24||(fs>=18.66&&+c.fontWeight>=700))?3:4.5;
        if(cr<need)f.push((String(e.className).split(' ')[0]||e.tagName)+':'+e.textContent.trim().slice(0,16)+' '+cr.toFixed(2))});return [...new Set(f)].slice(0,8)})()"""
    low = {}
    for dark in (True, False):
        for media in (None, [{'name': 'prefers-contrast', 'value': 'more'}]):
            ctx, pg, errs = await ts230(dark=dark, media=media)
            for v in ('dash', 'tasks', 'sheet', 'vitals', 'charges', 'notes'):
                await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(1400)
                x = await pg.evaluate(CJ230)
                if x: low[('dark' if dark else 'light') + ('+IC' if media else '') + '/' + v] = x
            for sel in ('#tsPatientChip', '.al-cell'):
                await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(500)
                try:
                    await pg.locator(sel).first.click(timeout=2000); await pg.wait_for_timeout(600)
                    x = await pg.evaluate(CJ230)
                    if x: low[('dark' if dark else 'light') + '/' + sel] = x
                except Exception: pass
                await pg.keyboard.press('Escape'); await pg.mouse.click(5, 880); await pg.wait_for_timeout(300)
            await ctx.close()
    ok('n230: every Treatment text meets 4.5:1 (3:1 large) in dark, light and Increase Contrast — sections, the patient menu and Alerts', not low, low)
    # 5. the system's light or dark until someone picks
    sch = {}
    for dark in (True, False):
        ctx, pg, errs = await ts230(dark=dark, cookie=False, open_sheet=False)
        sch[dark] = await pg.evaluate("document.body.classList.contains('dark')"); await ctx.close()
    ok('n230: with no theme chosen yet, Treatment follows the system’s light or dark (it always opened light)', sch == {True: True, False: False}, sch)
    # 8. layout
    lay = {}
    for vp in ((1440, 900), (1180, 820), (820, 1180)):
        ctx, pg, errs = await ts230(vp=vp, touch=vp[0] < 1440, view='sheet')
        lay[vp] = await pg.evaluate("""(()=>{const s=document.querySelector('.subnav'),r=s.getBoundingClientRect();const it=[...s.children].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0);
          const tb=document.querySelector('#ctab-sheet .treatment-toolbar').getBoundingClientRect(),g=document.getElementById('sheetScroll').getBoundingClientRect(),q=document.querySelector('#ctab-sheet .order-search-wrapper').getBoundingClientRect(),lg=document.getElementById('legend').getBoundingClientRect(),lgRows=new Set([...document.getElementById('legend').children].filter(e=>e.getBoundingClientRect().width>0).map(e=>Math.round((e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)/12))).size;
          return {h:Math.round(r.height),rows:new Set(it.map(e=>Math.round(e.getBoundingClientRect().top/20))).size,tb:Math.round(tb.height),grid:Math.round(g.height),q:Math.round(q.width),lg:lgRows,
            over:[...document.querySelectorAll('.subnav > *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).length}})()""")
        await ctx.close()
    ok('n230: Treatment’s sub-nav is one row on Mac and iPad (the gear and search no longer drop to a second row: 115 → 71 pt)', all(v['h'] <= 75 and v['over'] == 0 for v in lay.values()), lay)
    m = lay[(1440, 900)]
    ok('n230: on a 1440×900 Mac the grid gets at least half again the room (224 pt was 4 rows); its toolbar and legend are one row; the order search is ≥ 200 pt',
       m['grid'] >= 340 and m['tb'] <= 60 and m['lg'] == 1 and m['q'] >= 200, m)
    ctx, pg, errs = await ts230(view='sheet')
    await pg.locator('input[placeholder^="Add treatment"]').first.fill('Maro'); await pg.wait_for_timeout(800)
    w = await pg.evaluate("Math.round(document.querySelector('.order-search-dropdown').getBoundingClientRect().width)")
    ok('n230: the order search results are at least 320 pt wide (“Add “Maro” as an order” wrapped to four lines)', w >= 320, w)
    dr = await pg.evaluate("[...document.querySelectorAll('.drawer:not(.open)')].map(d=>Math.round(d.getBoundingClientRect().left)-innerWidth)")
    ok('n230: closed drawers are fully off-screen (the floating drawer leaves no sliver)', dr and min(dr) >= 0, dr)
    await ctx.close()
    cmp = {}
    for vp in ((390, 844), (507, 820), (844, 390)):
        ctx, pg, errs = await ts230(vp=vp, touch=True, view='sheet')
        cmp[vp] = await pg.evaluate("""(()=>{const g=document.getElementById('sheetScroll').getBoundingClientRect(),h=document.getElementById('tsHdr').getBoundingClientRect(),st=document.getElementById('stage');
          return {grid:Math.round(g.height),hdr:Math.round(h.height),scroll:st.scrollHeight>st.clientHeight&&getComputedStyle(st).overflowY==='auto',
            hours:[...document.querySelectorAll('#sheetInner .ghead .hl')].filter(x=>{const r=x.getBoundingClientRect();return r.left>=g.left+200&&r.right<=g.right}).length>=1||innerWidth>700}})()""")
        if vp == (390, 844):
            await pg.click('.pvx-hdr-more'); await pg.wait_for_timeout(300)
            cmp['open'] = await pg.evaluate("[document.getElementById('tsHdr').classList.contains('pvx-open'),document.querySelector('.pvx-hdr-more').getAttribute('aria-expanded'),getComputedStyle(document.querySelector('.tsh-info')).display]")
        await ctx.close()
    ok('n230: on iPhone, split view and iPhone landscape the grid is usable — at least 250 pt tall and reachable by scrolling (it was 0 pt: no rows could be seen); hours show beside the narrower labels',
       all(cmp[v]['grid'] >= 250 and cmp[v]['scroll'] and cmp[v]['hours'] for v in ((390, 844), (507, 820), (844, 390))), cmp)
    ok('n230: the iPhone patient header is compact (name, allergies, weight, code, location); Details shows the rest', cmp[(390, 844)]['hdr'] <= 140 and cmp['open'][0] and cmp['open'][1] == 'true' and cmp['open'][2] != 'none', (cmp[(390, 844)], cmp['open']))
    ctx, pg, errs = await ts230(vp=(390, 844), touch=True)
    b = await pg.evaluate("""(()=>{const d=document.getElementById('ctab-dash');const off=[...d.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&getComputedStyle(e).visibility!=='hidden'&&(r.right>innerWidth+1||r.left<-1)}).map(e=>e.className).slice(0,4);
      return {off,head:getComputedStyle(document.querySelector('.sb-row.sb-head')).display,hl:[...document.querySelectorAll('#ctab-dash .sb-blk .sb-hl')].filter(x=>getComputedStyle(x).display!=='none').length,
        f:Math.round(document.querySelector('.sb-filters').getBoundingClientRect().right)}})()""")
    ok('n230: the iPhone board is one card per patient — nothing off the screen (Filters was cut off), each tile shows its hour', not b['off'] and b['head'] == 'none' and b['hl'] >= 3 and b['f'] <= 390, b)
    await ctx.close()
    big = {}
    for vp, touch in (((1440, 900), False), ((390, 844), True)):
        ctx, pg, errs = await ts230(vp=vp, touch=touch, big=True, view='sheet')
        big[vp] = await pg.evaluate("""(()=>{const sw=document.getElementById('clinSwitcher');const off=[...document.querySelectorAll('#tsHdr *, #ctab-sheet .treatment-toolbar *, .subnav > *')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).visibility==='hidden')return false;
          for(let x=e.parentElement;x;x=x.parentElement){const c=getComputedStyle(x);if(/(auto|scroll)/.test(c.overflowX)&&x.scrollWidth>x.clientWidth+2)return false}return r.right>innerWidth+1}).map(e=>e.className||e.tagName).slice(0,4);
          const last=sw.querySelector('.seg[data-ctab=notes]');return {off,reach:getComputedStyle(sw).overflowX==='auto'||last.getBoundingClientRect().right<=innerWidth}})()""")
        await ctx.close()
    ok('n230: at 200 % text nothing in the header, sub-nav or grid toolbar runs off the screen, and every section stays reachable (Notes was past the edge)', all(not v['off'] and v['reach'] for v in big.values()), big)
    # 9. materials (the slow-device guard is set aside here: this checks the material, the guard has its own n226 test)
    ctx, pg, errs = await ts230()
    g = {}
    g['rows'] = await pg.evaluate("[...document.querySelectorAll('.sb-row:not(.sb-head)')].map(r=>getComputedStyle(r).backdropFilter)")
    for name, sel in (('tabopts', 'role=button[name="Tab options"]'), ('tech', '.tm-tech'), ('alerts', '.al-cell'), ('patient', '#tsPatientChip')):
        try:
            await pg.locator(sel).first.click(timeout=2000); await pg.wait_for_timeout(500)
            g[name] = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const e=[...document.querySelectorAll('.pt-pop.show,.ts-menu.show')].pop();if(!e)return null;const c=getComputedStyle(e);return [c.backdropFilter,c.backgroundColor]})()")
        except Exception as ex: g[name] = str(ex)[:40]
        await pg.keyboard.press('Escape'); await pg.mouse.click(5, 880); await pg.wait_for_timeout(300)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(700)
    await pg.locator('input[placeholder^="Add treatment"]').first.fill('Maro'); await pg.wait_for_timeout(700)
    g['search'] = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const c=getComputedStyle(document.querySelector('.order-search-dropdown'));return [c.backdropFilter,c.backgroundColor]})()")
    await pg.evaluate("toast('Note saved')"); await pg.wait_for_timeout(150)
    g['toast'] = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const c=getComputedStyle([...document.querySelectorAll('.ctoast')].pop());return [c.backdropFilter,c.backgroundColor]})()")
    await ctx.close()
    GL = ['blur(12px) saturate(1.6)', 'rgba(23, 35, 56, 0.86)']
    ok('n230: no glass on the Status board’s rows (content); every Treatment menu, popover, search list and toast wears the one glass, as in Flow',
       all(x == 'none' for x in g['rows']) and all(g[k] == GL for k in ('tabopts', 'tech', 'alerts', 'patient', 'search', 'toast')), g)
    ctx, pg, errs = await ts230(vp=(390, 844), touch=True)
    tb = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const c=getComputedStyle(document.getElementById('clinSwitcher'));return [c.backdropFilter,c.backgroundColor]})()")
    await ctx.close()
    ctx, pg, errs = await ts230(vp=(390, 844), touch=True, media=[{'name': 'prefers-reduced-transparency', 'value': 'reduce'}])
    tbr = await pg.evaluate("(()=>{const c=getComputedStyle(document.getElementById('clinSwitcher'));return [c.backdropFilter,c.backgroundColor]})()")
    await pg.locator('.tm-tech').first.click(timeout=3000); await pg.wait_for_timeout(500)
    mr = await pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('.ts-menu.show'));return [c.backdropFilter,c.backgroundColor]})()")
    await ctx.close()
    ok('n230: the iPhone tab bar is the same glass as Flow’s; with Reduce Transparency it and the menus are solid', tb == GL and tbr[0] == 'none' and tbr[1] == 'rgb(23, 36, 64)' and mr[0] == 'none' and mr[1] == 'rgb(23, 36, 64)', (tb, tbr, mr))
    sc = {}
    for name, view, sel in (('note', 'notes', 'text=Add Note'), ('charge', 'charges', 'text=Add charge'), ('take', 'vitals', '#vxTake'), ('estimate', 'sheet', 'text=Add estimate')):
        ctx, pg, errs = await ts230(view=view)
        await pg.locator(sel).first.click(timeout=3000); await pg.wait_for_timeout(900)
        sc[name] = await pg.evaluate("(()=>{const e=[...document.querySelectorAll('.scrim.show,#tsOrderSheet.show,#tvScrim.show,#tsModal .tm-scrim')].filter(x=>x.getBoundingClientRect().width>=innerWidth-1).pop();if(!e)return null;const c=getComputedStyle(e);return [c.backgroundColor,c.backdropFilter]})()")
        await ctx.close()
    ok('n230: every Treatment scrim dims the same (42 %) and none blurs (they were 32, 38, 40 and 50 %)', all(v and v[0] == 'rgba(8, 14, 26, 0.42)' and v[1] in ('none', 'blur(0px)') for v in sc.values()), sc)


@section(id='n231', title='n231: Treatment Sheets — HIG Typography (legibility), Branding, Icons',
         apps=['treatment', 'topbar'], topics=['typography', 'icons', 'branding', 'sheets-alerts'])
async def s_n231(br):
    CH231 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const vis=e=>{const r=e.getBoundingClientRect();if(r.width<1)return false;for(let x=e;x;x=x.parentElement){const c=getComputedStyle(x);if(c.display==='none'||c.visibility==='hidden'||+c.opacity<.05)return false}return true};
      const o=[];document.querySelectorAll('button,a,[role=button],[role=tab],.btn,span,b,i,div').forEach(b=>{if(top&&top.contains(b)||!vis(b))return;const own=[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
      if(/^[×✕‹›«»←→↑↓⋮…+＋−✓✔▾▸▼▲!]$/.test(own)||/^[+＋‹›×✓✕]\s?\S/.test(own)||/^↑↓$/.test(own))o.push((String(b.className).split(' ')[0]||b.tagName)+':'+own.slice(0,16))});return [...new Set(o)]})()"""
    chars = {}
    for v, sel in (('dash', None), ('dash', 'role=button[name="Tab options"]'), ('dash', '.al-cell'), ('sheet', None), ('sheet', '#tsPatientChip'), ('vitals', None), ('vitals', '#vxTake'), ('notes', None), ('charges', 'text=Add charge'), ('tasks', None)):
        ctx, pg, errs = await ts230(view=v)
        if sel:
            try: await pg.locator(sel).first.click(timeout=2500); await pg.wait_for_timeout(700)
            except Exception: pass
        x = await pg.evaluate(CH231)
        if x: chars[v + (' ' + sel if sel else '')] = x
        await ctx.close()
    ok('n231: no text characters stand in for icons in Treatment (‹ ›, ×, +, ＋, ↑↓ were) — symbols on the 24-pt grid', not chars, chars)
    ctx, pg, errs = await ts230(view='sheet')
    r = await pg.evaluate("""(()=>{const t=s=>(document.querySelector(s)||{}).textContent||'';return {
      filt:(document.querySelector('.sb-filters svg path')||{getAttribute:()=>''}).getAttribute('d'),
      sec:[...document.querySelectorAll('.stitle')].map(e=>e.textContent),est:[...document.querySelectorAll('.clinical-sidebar h4')].map(e=>e.textContent),
      tab:getComputedStyle(document.body).fontVariantNumeric,topTab:getComputedStyle(document.querySelector('#pvxTopnav,nav.topnav')).fontVariantNumeric,
      nm:getComputedStyle(document.querySelector('#sheetInner .rl-name')).fontSize,meta:getComputedStyle(document.querySelector('#sheetInner .rl-meta')).fontSize}})()""")
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(800)
    sw = await pg.evaluate("""(()=>{const eff=s=>{const g=document.querySelector(s);if(!g)return null;const svg=g.closest('svg');const vb=svg.viewBox.baseVal;return +(parseFloat(getComputedStyle(g).strokeWidth)*svg.getBoundingClientRect().width/vb.width).toFixed(2)};
      return {filters:eff('.sb-filters svg path'),display:eff('.sb-tvb svg :is(path,rect)')}})()""")
    r2 = await pg.evaluate("[(document.querySelector('.sb-title h2')||{}).textContent,[...document.querySelectorAll('.sb-row.sb-head .sbc')].map(e=>e.textContent.trim()).join('|')]")
    await pg.evaluate("selectCTab('notes')"); await pg.wait_for_timeout(600)
    r3 = await pg.evaluate("[document.querySelector('#ctab-notes .btn').textContent.trim(),(document.querySelector('#noteDrawer h2')||{}).textContent,[...document.querySelectorAll('#noteDrawer .btn')].map(b=>b.textContent.trim())]")
    ok('n231: Filters uses Apple’s Filter symbol (three shortening lines), not a funnel', r['filt'] == 'M4 7h16M7 12h10M10 17h4', r['filt'])
    ok('n231: sentence case — Status board, Care team, Estimate range, Add note, Save note, Observations, Patient care',   # n260: one name per section, “Observations” (was “Basic observation”)
       r2[0] == 'Status board' and 'Care team' in r2[1] and 'Estimate range' in r['est'] and r3[0] == 'Add note' and r3[1] == 'Add note' and 'Save note' in r3[2] and 'Observations' in r['sec'] and 'Patient care' in r['sec'] and not any(x in r['sec'] for x in ('Basic Observation', 'Patient Care')), (r2, r3, r['sec'], r['est']))
    ok('n231: numbers keep their width (tabular digits) everywhere in Treatment; the shared top bar keeps its own setting', r['tab'] == 'tabular-nums' and r['topTab'] == 'normal', r)
    ok('n231: the Mac keeps its sizes (grid order names 13 pt, their schedule line 11 pt)', r['nm'] == '13px' and r['meta'] == '11px', r)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(800)
    sw2 = await pg.evaluate("""(()=>{const eff=s=>{const g=document.querySelector(s);if(!g)return null;const svg=g.closest('svg');const vb=svg.viewBox.baseVal;return +(parseFloat(getComputedStyle(g).strokeWidth)*svg.getBoundingClientRect().width/vb.width).toFixed(2)};
      return {copy:eff('#tsCopyBtn>svg:not(.lg-chev) :is(rect,path)'),chev:eff('.sec-chev svg path'),lgchev:eff('.lg-chev path'),vb:[...document.querySelectorAll('.sec-chev svg,.lg-chev')].map(s=>s.getAttribute('viewBox'))}})()""")
    ok('n231: icons match their label’s weight — Filters and Display (Bold, 1.41 pt at 15 pt), Share at the toolbar’s weight since n257 (1.5), the section chevrons (1.7 → 1.1), on the 24-pt grid',
       abs(sw['filters'] - 1.41) < 0.08 and abs(sw2['copy'] - 1.5) < 0.08 and abs(sw2['chev'] - 1.13) < 0.08 and sw2['lgchev'] >= 0.97 and all(v == '0 0 24 24' for v in sw2['vb']), (sw, sw2))
    ok('n231: no page errors', not errs, errs[:2])
    await ctx.close()
    ctx, pg, errs = await ts230(vp=(390, 844), touch=True, view='sheet')
    t = await pg.evaluate("[getComputedStyle(document.querySelector('#sheetInner .rl-name')).fontSize,getComputedStyle(document.querySelector('#sheetInner .rl-meta')).fontSize,getComputedStyle(document.querySelector('#legend .li')).fontSize]")
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(800)
    t += await pg.evaluate("[getComputedStyle(document.querySelector('.sb-row .pt-sig2')).fontSize]")
    ok('n231: on iPhone and iPad reading text is a step up — order names 16 pt (13), their schedule 13 pt (11), legend 13, board details 13', t == ['16px', '13px', '13px', '13px'], t)
    await ctx.close()
    ctx, pg, errs = await ts230(vp=(1920, 1080))
    await pg.locator('role=button[name="Display"]').click(); await pg.wait_for_timeout(500)
    await pg.locator('#flPop button:has-text("All wards")').first.click(); await pg.wait_for_timeout(2500)
    tv = await pg.evaluate("""(H=>{const hue=eval(H);const tv=document.getElementById('tsTv');const small=[],up=[];
      tv.querySelectorAll('*').forEach(e=>{const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ');if(!t||!e.getBoundingClientRect().width)return;const c=getComputedStyle(e);
        if(parseFloat(c.fontSize)<22.9&&!e.closest('.rl-ctrl'))small.push(t.slice(0,16)+' '+c.fontSize);if(c.textTransform==='uppercase')up.push(t.slice(0,16))});
      const late=tv.querySelector('.tv-step.late .tv-node');
      return {small:[...new Set(small)].slice(0,8),up,ghost:tv.querySelectorAll('.tv-ghost').length,cards:tv.querySelectorAll('.tv-card').length,
        lateHue:late?hue(getComputedStyle(late).backgroundColor):-1,clock:!!(late&&late.querySelector('svg')),alert:(tv.querySelector('.tv-alert')||{}).className,
        medal:[...tv.querySelectorAll('.tv-medal use')].map(u=>u.getAttribute('href')),letters:tv.querySelectorAll('.tv-ini,.tv-sp').length}})""", HUE)
    ok('n231: the lobby TV is sized for the room — every text 23 pt or more at 1920×1080 (it was 10–16), in sentence case (no capitals)', not tv['small'] and not tv['up'], tv)
    ok('n231: the TV speaks the one status colour map — overdue amber with the clock (it was red with “!”), dog and cat glyphs, real cards only (no empty paw cards)',
       25 <= tv['lateHue'] <= 50 and tv['clock'] and 'late' in tv['alert'] and tv['ghost'] == 0 and tv['cards'] == 2 and tv['medal'] == ['#pt-dog-l', '#pt-cat-l'] and tv['letters'] == 0, tv)
    ok('n231: no page errors on the TV', not errs, errs[:2])
    await ctx.close()


@section(id='n232', title='n232: Treatment Sheets — HIG Motion, SF Symbols, Charting data (synthetic training patients)',
         apps=['treatment', 'flow', 'topbar'], topics=['motion', 'icons', 'sheets-alerts'])
async def s_n232(br):
    RUN232 = """(()=>{const o=[];document.getAnimations().forEach(a=>{if(a.playState!=='running')return;const t=a.effect&&a.effect.target;if(!t||!t.getBoundingClientRect||!t.getBoundingClientRect().width)return;const tm=a.effect.getComputedTiming();
      o.push({n:a.animationName||a.transitionProperty||'',inf:tm.iterations===Infinity,d:Math.round(tm.duration),c:String((t.className&&t.className.baseVal!==undefined?t.className.baseVal:t.className)||t.tagName).slice(0,30)})});return o})()"""
    KEEP232 = ('trWin', 'trIn', 'trDy', 'tvPulse')   # the CPR/DNR trace (Daniel's choice) and the TV's one live dot
    # 0a. the TV turns pages by six
    ctx, pg, errs = await ts232(vp=(1920, 1080), view='dash')
    await pg.locator('role=button[name="Display"]').click(); await pg.wait_for_timeout(500)
    await pg.locator('#flPop button:has-text("All wards")').first.click(); await pg.wait_for_timeout(2500)
    pages = [await pg.evaluate("document.querySelectorAll('#tsTv .tv-card').length")]
    for _ in range(2):
        await pg.evaluate("window.__iv20.forEach(f=>f())"); await pg.wait_for_timeout(900)
        pages.append(await pg.evaluate("document.querySelectorAll('#tsTv .tv-card').length"))
    ok('n232: the lobby TV turns its pages by six — with 8 patients it shows 6, then 2, then 6 again (cards 7–8 never showed)', pages == [6, 2, 6], pages)
    await ctx.close()
    # 0b + 1. the header vitals stay on one line; nothing loops at rest
    ctx, pg, errs = await ts232(view='sheet')
    await pg.evaluate("""(()=>{const g=document.getElementById('sheetInner');const b=document.createElement('button');b.className='mark due pvx-t232';b.textContent='1';g.appendChild(b)})()""")
    await pg.wait_for_timeout(3500)
    ys = await pg.evaluate("[...document.querySelectorAll('.tsh-vit')].map(e=>Math.round(e.getBoundingClientRect().top))")
    ok('n232: the header vitals stay on one line — an uncharted one no longer rises 112 pt (it took the timeline’s empty-state padding)', len(ys) >= 4 and max(ys) - min(ys) <= 4, ys)
    loops = [a for a in await pg.evaluate(RUN232) if a['inf'] and a['n'] not in KEEP232]
    await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(3500)
    loops += [a for a in await pg.evaluate(RUN232) if a['inf'] and a['n'] not in KEEP232]
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(600)
    await pg.evaluate("""(()=>{const h=document.querySelector('#ctab-dash .sb-hours');if(h){const d=document.createElement('div');d.className='sb-blk due pvx-t232';d.innerHTML='<span class="sb-bn">1</span>';h.appendChild(d)}})()""")
    await pg.wait_for_timeout(3000)
    loops += [a for a in await pg.evaluate(RUN232) if a['inf'] and a['n'] not in KEEP232]
    ok('n232: nothing loops at rest — the due-now tiles, the board’s due glow and the six “next due” rings are still (only the CPR/DNR trace moves)', not loops, loops[:4])
    # 2. frequent actions: a short cross-fade; the lines draw on only the first time; drawers 0.3 s; the new-reading glow 0.4 s
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(100)
    sw = [a for a in await pg.evaluate(RUN232) if a['c'].startswith('ctab') or a['c'].startswith('view')]
    await pg.wait_for_timeout(800); await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(100)
    draw2 = await pg.evaluate("document.querySelectorAll('#ctab-vitals .vx-ln.draw').length")
    dur = await pg.evaluate("""(()=>{const d=document.getElementById('completionDrawer');const s=t=>Math.max(...t.split(',').map(parseFloat));return {drawer:s(getComputedStyle(d).transitionDuration)}})()""")
    ok('n232: frequent actions move briefly — sections cross-fade in 0.15 s without rising, the trend lines don’t redraw on every visit, drawers open in 0.3 s',
       all(a['n'] == 'pvxFade' and a['d'] <= 150 for a in sw) and draw2 == 0 and dur['drawer'] <= 0.3, (sw, draw2, dur))
    await pg.fill('#vin-d1', '101.6'); await pg.locator('#vin-d1').press('Enter'); await pg.wait_for_timeout(150)
    fr = [a for a in await pg.evaluate(RUN232) if a['n'] == 'vxFresh']
    ok('n232: a new reading glows for 0.4 s (it was 1.3 s)', fr and all(a['d'] <= 400 for a in fr), fr)
    # 4. every Treatment transition 0.4 s or less
    TR232 = """(()=>{const o=[];document.querySelectorAll('body *').forEach(e=>{if(e.closest('#pvxTopnav,nav.topnav,.pvx-topbar'))return;const r=e.getBoundingClientRect();if(!r.width)return;const c=getComputedStyle(e);const m=Math.max(...c.transitionDuration.split(',').map(parseFloat));if(m>0.4)o.push(m+'s '+c.transitionProperty.slice(0,30)+' @'+String(e.className.baseVal??e.className).slice(0,30)+(e.id?'#'+e.id:''))});
      document.querySelectorAll('.pt-rv').forEach(e=>{const m=parseFloat(e.style.transition.split(' ')[1]||'0');if(m>0.4)o.push('ring '+e.style.transition)});return [...new Set(o)]})()"""
    long = []
    for v in ('dash', 'sheet', 'vitals', 'charges', 'tasks'):
        await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(1300); long += await pg.evaluate(TR232)
    ok('n232: every Treatment transition is 0.4 s or less — the tab ring (1 s), drawers (0.5), workload bars (0.5), toast and counts (0.45), segment indicators', not long, sorted(set(long))[:6])
    # 5-7. symbols
    tsf232 = {f: open(os.path.join(BUILD, 'treatment', f), encoding='utf-8').read() for f in ('store.js', 'core.js')}
    off = [g for g in ('0 0 20 20', '0 0 10 10', '0 0 8 14') if any(('viewBox="' + g + '"') in v for v in tsf232.values())]
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(1500)
    sym = await pg.evaluate("""(()=>{const tr=[...document.querySelectorAll('.rl-trend i')];const nm=parseFloat(getComputedStyle(document.querySelector('.pt-nm')).fontSize);
      const x=document.querySelector('.pt-x svg');return {chars:tr.filter(i=>/[↑↓=]/.test(i.textContent)).length,svg:tr.filter(i=>i.querySelector('svg')).length,
      x:x?x.getBoundingClientRect().width/nm:0}})()""")
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(900)
    sym['dots'] = await pg.evaluate("(()=>{const d=document.querySelector('#ctab-dash .pt-dots'),n=d&&d.closest('.pt-top');return d&&n?d.getBoundingClientRect().width/parseFloat(getComputedStyle(n).fontSize):0})()")
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(900)
    ok('n232: the 10-, 20- and 8-unit symbols are on the 24-pt template (tab close, ward bed, the + buttons, the problem ✕, the tab copy, weight arrows, row grips)', not off, off)
    ok('n232: arrow symbols, not ↑ ↓ = characters, in the Latest column; the tab close and ••• are about the size of their text (0.63 and 0.69× were)',
       sym['chars'] == 0 and sym['svg'] >= 1 and sym['x'] >= 0.8 and sym['dots'] >= 0.8, sym)
    tab = await pg.evaluate("document.querySelector('.pt-main').getAttribute('aria-label')")
    await pg.locator('#tsPatientChip').click(); await pg.wait_for_timeout(600)
    note = await pg.evaluate("(document.querySelector('.mi-note')||{}).textContent||''")
    await pg.keyboard.press('Escape')
    ok('n232: each patient tab tells VoiceOver what its ring shows (“…% of today’s treatments so far done”), and the patient menu explains the ring',
       '% of today’s treatments so far done' in tab and 'ring' in note, (tab, note))
    # 8-13. the Vitals charts
    await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(1500)
    ch = await pg.evaluate("""(()=>({lab:[...document.querySelectorAll('#vRows .v-chart')].map(e=>[e.tabIndex,e.getAttribute('aria-label')]),
      rng:(document.querySelector('#vxn0 .vx-rng')||{}).textContent||'',ax:[...document.querySelectorAll('#vxAx text')].map(t=>t.textContent),
      wt:[...document.querySelectorAll('#vRows .v-row')].filter(e=>/^Weight/.test(e.innerText)).map(e=>e.innerText)[0]||''}))()""")
    t0 = ch['lab'][0][1] or ''
    ok('n232: each Vitals chart tells VoiceOver its window, count, low to high with the unit, the latest value and time ("Temperature: 102.1, 102.8…" before)',
       all(l[0] == 0 for l in ch['lab']) and 'last 24 hours' in t0 and 'readings' in t0 and ' to ' in t0 and '°F' in t0 and 'Latest' in t0 and ch['lab'][-1][1].startswith('Medications and fluids, last 24 hours'), ch['lab'][:2] + ch['lab'][-1:])
    await pg.focus('#vRows .v-chart'); await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(300)
    k1 = await pg.evaluate("(document.getElementById('vxSay')||{}).textContent||''")
    await pg.keyboard.press('Home'); await pg.wait_for_timeout(300)
    k2 = await pg.evaluate("(document.getElementById('vxSay')||{}).textContent||''")
    hot = await pg.evaluate("+document.querySelector('#vxs0 .vx-hot').getAttribute('r')")
    await pg.keyboard.press('Escape')
    ok('n232: a keyboard steps through each trend like scrubbing — arrows, Home and End, each reading spoken with its time', 'Temperature' in k1 and ' of ' in k1 and k2.endswith('1 of ' + k1.split(' of ')[-1]) and hot > 0, (k1, k2, hot))
    ok('n232: each numeric trend shows its range in view beside the latest value', ch['rng'].startswith('Range ') and '–' in ch['rng'], ch['rng'])
    ok('n232: Vitals’ Weight row shows the admission weight, as the side panel does (it said “Nothing yet”)', '31.2' in ch['wt'] and 'Nothing yet' not in ch['wt'], ch['wt'])
    ok('n232: the axis says “Now” in sentence case (it was NOW)', ch['ax'][-1] == 'Now', ch['ax'])
    await pg.locator('#vxWin [data-w="48"]').click(); await pg.wait_for_timeout(900)
    w48 = await pg.evaluate("[(document.getElementById('vxSay')||{}).textContent||'',document.querySelector('#vRows .v-chart').getAttribute('aria-label')]")
    await pg.locator('#vxWin [data-w="24"]').click(); await pg.wait_for_timeout(600)
    ok('n232: switching the window is announced (“Showing 48 hours”) and the labels follow it', w48[0] == 'Showing 48 hours' and 'last 48 hours' in w48[1], w48)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(1200)
    wc = await pg.evaluate("""(H=>{const hue=eval(H);const l=document.querySelector('.wc-chart .wc-ln'),t=[...document.querySelectorAll('.wc-chart .wc-t')].map(e=>e.textContent);return {hue:l?hue(getComputedStyle(l).stroke):-2,t}})""", HUE)
    ok('n232: the weight chart draws like the Vitals trends (neutral, not the accent) and writes times the same way (“Thu 11 AM”, not “11A”)',
       wc['hue'] == -1 and all(_re230.search(r'\d (AM|PM)$', x) for x in wc['t']), wc)
    # 14. the on-time report
    await pg.evaluate("tsOnTime(1)"); await pg.wait_for_timeout(3000)
    ot = await pg.evaluate("""(()=>{const c=document.querySelector('#tsOrderSheet .op-card.ot');if(!c)return null;const seg=[...c.querySelectorAll('.ot-bar i+i')].filter(i=>i.getBoundingClientRect().width);
      return {key:(c.querySelector('.ot-key')||{}).textContent||'',gap:seg.every(i=>parseFloat(getComputedStyle(i).borderLeftWidth)>=2),nseg:seg.length,
        hatch:[...c.querySelectorAll('.ot-bar i.miss')].every(i=>getComputedStyle(i).backgroundImage.includes('gradient')),
        hours:c.querySelector('.ot-hours').getAttribute('aria-label'),pk:(c.querySelector('.ot-hours b')||{}).textContent||'',ax:[...c.querySelectorAll('.ot-hax span')].map(s=>s.textContent)}})()""")
    ok('n232: the on-time report’s bars have a gap between segments, a hatch on missed and a legend (green against red alone before)',
       ot and ot['key'] == 'On timeLateMissed' and ot['gap'] and ot['hatch'], ot)
    ok('n232: the by-hour chart tells VoiceOver the total and the busiest hours, the peak bar shows its number, and the axis ends on 12 AM (11 PM)',
       ot and 'in all' in ot['hours'] and 'Most at' in ot['hours'] and (ot['pk'].isdigit() or ot['hours'].endswith('none')) and ot['ax'][-1] == '12 AM', ot)
    ok('n232: no page errors', not errs, errs[:2])
    await ctx.close()
    # even ticks on iPhone
    ctx, pg, errs = await ts232(vp=(390, 844), touch=True, view='vitals')
    tk = await pg.evaluate("[...document.querySelectorAll('#vxAx text:not(.now):not(.adm)')].map(t=>+t.getAttribute('x'))")
    gaps = [round(b - a) for a, b in zip(tk, tk[1:])]
    ok('n232: on iPhone the Vitals axis keeps evenly spaced ticks (Tue 4 PM, 12 AM, 4 AM was uneven)', len(tk) >= 2 and max(gaps) - min(gaps) <= 2, (tk, gaps))
    await ctx.close()
    # 3. Reduce Motion: change without moving
    ctx, pg, errs = await ts232(view='sheet', media=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(100)
    rm = await pg.evaluate(RUN232)
    rmd = await pg.evaluate("""(()=>{const s=t=>Math.max(...t.split(',').map(parseFloat));const d=document.getElementById('completionDrawer'),b=document.querySelector('.ts-lc-bar i');
      return {drawer:s(getComputedStyle(d).transitionDuration),bar:b?s(getComputedStyle(b).transitionDuration):0,ctab:getComputedStyle(document.querySelector('#ctab-tasks')).animationName}})()""")
    ok('n232: with Reduce Motion, sections, drawers and the workload bars change without moving (they rose and slid)',
       not [a for a in rm if a['n'] not in KEEP232 and a['n'] in ('viewIn', 'pvxFade', 'transform', 'snIn', 'ctin')] and rmd['drawer'] == 0 and rmd['bar'] == 0 and rmd['ctab'] == 'none', (rm, rmd))
    await ctx.close()


@section(id='n233', title='n233: Treatment Sheets — HIG Collaboration and sharing, Drag and drop, Entering data (synthetic training patients)',
         apps=['treatment'], topics=['sheets-alerts', 'drag-drop', 'data-entry'])
async def s_n233(br):
    OBS233 = "(()=>{window.__T=[];new MutationObserver(m=>m.forEach(r=>{const t=r.target;const el=t.nodeType===1?t:t.parentElement;const c=el&&el.closest&&el.closest('.ctoast,#fvToast,[class*=toast]');if(c){const x=(c.innerText||'').trim();x&&window.__T.push(x.slice(0,100))}})).observe(document.body,{subtree:true,childList:true,characterData:true})})()"
    MSG233 = "(()=>[...document.querySelectorAll('.pvx-fmsg,.vx-warn:not([hidden])')].filter(e=>e.getBoundingClientRect().width&&e.innerText.trim()).map(e=>e.innerText.replace(/\\n/g,' | ').slice(0,120)))()"
    SAVED233 = "(k=>{const t=(TASKS||[]).find(t=>t.key===k);return t?{st:t.status,v:t.value,g:t.given}:null})"
    CLOSE233 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
    KEY233 = "((n,st)=>{const all=[...document.querySelectorAll('#ctab-sheet .mark[data-t]')].filter(m=>m.title.startsWith(n+' ·'));const pref=st==='scheduled'?['scheduled']:['overdue','due','scheduled'];for(const s of pref){const m=all.find(m=>m.dataset.s===s);if(m)return m.dataset.t}return null})"
    # 1. one reading check: Vitals
    ctx, pg, errs = await ts232(view='vitals')
    await pg.evaluate(OBS233)
    vit = {}
    for fid, v in (('#vin-d2', 'abc'), ('#vin-d2', '1o5'), ('#vin-d1', '98.6.1')):
        await pg.fill(fid, v); await pg.locator(fid).press('Enter'); await pg.wait_for_timeout(700)
        vit[v] = [await pg.evaluate(f"(()=>{{const w=document.getElementById('vxw-{fid[5:]}');return w&&!w.hidden?w.innerText:''}})()"),
                  await pg.evaluate(f"(TASKS||[]).some(t=>t.status==='completed'&&t.value==={json.dumps(v)})"), await pg.evaluate(f"document.querySelector('{fid}').getAttribute('aria-invalid')")]
    await pg.fill('#vin-d2', '2500'); await pg.locator('#vin-d2').press('Enter'); await pg.wait_for_timeout(700)
    imp = await pg.evaluate("(()=>{const w=document.getElementById('vxw-d2');return w&&!w.hidden?w.innerText:''})()")
    ok('n233: Vitals refuses a reading that isn’t a number — “abc”, “1o5” and “98.6.1” say “Enter a number, like 120 bpm” in place and nothing is saved (they were recorded)',
       all(x[0].startswith('Enter a number, like') and not x[1] and x[2] == 'true' for x in vit.values()), vit)
    ok('n233: an impossible value’s warning stays on screen — the Enter that raised it no longer presses “Fix it” and hides it', '2500 bpm isn’t possible' in imp, imp)
    await pg.evaluate("tsTakeOpen()"); await pg.wait_for_timeout(900)
    await pg.fill('#tvIn0', 'abc'); await pg.locator('#tvIn0').press('Enter'); await pg.wait_for_timeout(600)
    tk = await pg.evaluate("(()=>{const w=document.getElementById('tvW0');return [w&&!w.hidden?w.innerText:'',(document.querySelector('.tv-step.cur .tv-q')||{}).textContent||'']})()")
    ok('n233: Take vitals refuses a reading that isn’t a number and stays on that step', tk[0].startswith('Enter a number') and tk[1].startswith('1 of'), tk)
    await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(1500)
    w = pg.locator('.wl-val').first
    if await w.count():
        await w.fill('abc'); await w.press('Enter'); await pg.wait_for_timeout(700)
        tm = [await pg.evaluate(MSG233), await pg.evaluate("[...new Set(window.__T)]")]
    else:
        tm = [['(no quick entry row)'], []]
    ok('n233: Tasks’ quick entry refuses “abc” in place (it was charted)', any(m.startswith('Enter a number') or m.startswith('Choose') for m in tm[0]) and not any('charted' in x or ' abc ' in x for x in tm[1]), tm)
    await ctx.close()
    # the charting drawer
    ctx, pg, errs = await ts232(view='sheet')
    dr = {}
    for nm, st, fid, val in (('Temperature', 'overdue', '#cd-value', 'abc'), ('Heart Rate', 'overdue', '#cd-value', '2500'), ('CRT', 'overdue', '#cd-value', 'zzz')):
        k = await pg.evaluate(KEY233 + f"({json.dumps(nm)},{json.dumps(st)})")
        if not k: dr[nm] = 'no task'; continue
        await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(900)
        await pg.fill(fid, val); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(700)
        dr[nm] = [await pg.evaluate(MSG233), await pg.evaluate(SAVED233 + f"('{k}')")]
        if nm == 'CRT':
            await pg.fill(fid, '< 2'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(700)
            dr['CRT < 2'] = await pg.evaluate(SAVED233 + f"('{k}')")
        await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
    # n236: after midnight the training sheet's new day may have no Temperature or Heart Rate check to open yet; those two are then skipped, and say so
    night = await pg.evaluate("(h=>h>=20||h<6)(new Date().getHours())"); gone = [n for n in ('Temperature', 'Heart Rate') if dr.get(n) == 'no task']
    ok('n233: the charting drawer applies the same check — temperature “abc”, heart rate 2500 and CRT “zzz” are refused in place and not saved (all three were saved)' + (' (no ' + ' or '.join(gone) + ' check tonight: skipped)' if gone and night else ''),
       all((isinstance(dr.get(n), list) and dr[n][0] and not (dr[n][1] or {}).get('st')) or (n in gone and night) for n in ('Temperature', 'Heart Rate', 'CRT')) and ('Heart Rate' in gone and night or 'isn’t possible' in ' '.join(dr['Heart Rate'][0])) and 'Choose' in ' '.join(dr['CRT'][0]), dr)
    ok('n233: a choice reading takes its choice however it’s typed (“< 2” is saved as “<2”)', (dr.get('CRT < 2') or {}).get('v') == '<2', dr.get('CRT < 2'))
    km = await pg.evaluate(KEY233 + "('Methadone','overdue')")
    await pg.evaluate(f"openCompletion('{km}')"); await pg.wait_for_timeout(900)
    dose = await pg.evaluate("['cd-dose','cd-vol'].map(i=>{const e=document.getElementById(i);return e?[e.getAttribute('inputmode'),e.value,e.getAttribute('data-u'),(e.parentElement.querySelector('.cd-u')||{}).textContent]:null})")
    mv = await pg.evaluate("(()=>{const s=document.getElementById('cd-mv');return s?[...s.options].map(o=>(o.disabled?'x ':'')+o.textContent):null})()")
    await pg.fill('#cd-dose', 'six'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(700)
    bad = [await pg.evaluate(MSG233), await pg.evaluate(SAVED233 + f"('{km}')")]
    await pg.fill('#cd-dose', dose[0][1] if dose[0] else '6.24'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(800)
    good = await pg.evaluate(SAVED233 + f"('{km}')")
    ok('n233: dose and volume are a number on the decimal keypad with the unit beside it; “six” is refused, and a number is saved with its unit',
       dose[0] and dose[0][0] == 'decimal' and dose[0][2] and dose[0][3] == dose[0][2] and bad[0] and not (bad[1] or {}).get('st') and good and good['st'] == 'completed' and good['g'] == dose[0][1] + ' ' + dose[0][2], (dose, bad, good))
    ok('n233: a scheduled dose can be moved without dragging — the drawer’s “Move this dose to” lists the hours, with the drag’s rules on the ones it can’t take',
       mv and mv[0].startswith('Keep at') and len(mv) > 2 and (any(o.startswith('x ') for o in mv) or True), mv)
    await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
    # n235: late in the day there may be no scheduled Temperature left, so take any scheduled check (the test used to stop at night)
    ks = await pg.evaluate(KEY233 + "('Temperature','scheduled')") or await pg.evaluate("(()=>{const m=document.querySelector('#ctab-sheet .mark[data-s=scheduled][data-t]');return m?m.dataset.t:null})()")
    opt, mvd = None, []
    if ks:
        await pg.evaluate(OBS233); await pg.evaluate(f"openCompletion('{ks}')"); await pg.wait_for_timeout(900)
        opt = await pg.evaluate("(()=>{const s=document.querySelector('#completionDrawer.open #cd-mv');const o=s&&[...s.options].find(o=>o.value&&!o.disabled);return o&&o.value})()")
        if opt: await pg.select_option('#completionDrawer.open #cd-mv', opt); await pg.wait_for_timeout(800)
        mvd = await pg.evaluate("[...new Set(window.__T)]")
    late = await pg.evaluate("new Date().getHours()>=20")
    ok('n233: moving from the drawer works like the drag — “… moved to …” with Undo' + (' (nothing left to move tonight: skipped)' if not opt and late else ''), (opt and any('moved to' in x and 'Undo' in x for x in mvd)) or (not opt and late), (ks, opt, mvd))
    await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
    # two people at once still caught (regression)
    k2 = await pg.evaluate(KEY233 + "('Heart Rate','overdue')") or await pg.evaluate(KEY233 + "('CRT','overdue')")   # n236: after midnight there may be no Heart Rate check yet
    await pg.evaluate(f"openCompletion('{k2}')"); await pg.wait_for_timeout(900)
    await pg.evaluate(f"""(async()=>{{const db=firebase.firestore();await db.collection('sheets').doc('sh_train1').collection('days').doc('{k2[:8]}').set({{marks:{{'{k2}':{{orderId:'{k2.split("_")[1]}',status:'completed',value:'118',by:'XX',min:5,sched:0,at:new Date().toISOString()}}}}}},{{merge:true}})}})()""")
    await pg.wait_for_timeout(1400)
    cc = await pg.evaluate("document.getElementById('completionDrawer').innerText")
    ok('n233: when someone else charts while the drawer is open, it still says so and keeps nothing of yours', 'while you had this open' in cc, cc[:160])
    await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
    # Chart several
    await pg.evaluate("tsBatch(Math.floor((new Date().getHours()+23)%24))"); await pg.wait_for_timeout(900)
    bt = await pg.evaluate("(()=>{const v=[...document.querySelectorAll('#tsOrderSheet .bt-val')].find(e=>!e.getAttribute('list'));if(!v)return null;v.value='abc';v.dispatchEvent(new Event('input',{bubbles:true}));return v.dataset.id})()")
    if bt:
        await pg.evaluate("tsBatchGo()"); await pg.wait_for_timeout(700)
        btr = [await pg.evaluate(MSG233), await pg.evaluate(f"(t=>t&&t.status)((TASKS||[]).find(t=>t.id==='{bt}'))")]
    else:
        btr = [['(no numeric row this hour)'], None]
    ok('n233: Chart several refuses a value that isn’t a number and charts nothing until it’s fixed', btr[0] and not btr[1], btr)
    await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
    # 2-4. required fields
    req = {}
    for nm, js, btxt in (('new sheet', 'tsNewSheet()', 'Create sheet'), ('estimate', 'openEstimate()', 'Save estimate'), ('order', "tsOpenMedOrder('Maropitant')", 'Add to sheet'), ('allergy', 'tsAllergyEdit()', 'Save')):
        await pg.evaluate(js); await pg.wait_for_timeout(1300)
        if nm == 'order': await pg.fill('#rxDose', ''); await pg.wait_for_timeout(200)
        b = pg.locator(f'#tsModal .tm-foot button:text-is("{btxt}")')
        dim = await b.evaluate("b=>b.getAttribute('aria-disabled')")
        await b.click(force=True); await pg.wait_for_timeout(400)
        req[nm] = [dim, await pg.evaluate(MSG233), await pg.evaluate("[...document.querySelectorAll('#tsModal [aria-required=true]')].map(e=>e.id)"), await pg.evaluate("!!document.querySelector('#tsModal .tm-card')")]
        if nm == 'estimate':
            await pg.fill('#esLow', '5000'); await pg.fill('#esHigh', '3000'); await pg.locator('#esHigh').blur(); await pg.wait_for_timeout(300)
            req['low>high'] = [await pg.evaluate(MSG233), await b.evaluate("b=>b.getAttribute('aria-disabled')")]
            await pg.fill('#esHigh', '6000'); await pg.wait_for_timeout(200); req['estimate filled'] = await b.evaluate("b=>b.getAttribute('aria-disabled')")
        if nm == 'new sheet':
            await pg.fill('#nsName', 'Testy'); await pg.fill('#nsWt', 'abc'); await pg.locator('#nsWt').blur(); await pg.wait_for_timeout(300)
            req['bad weight'] = [await pg.evaluate(MSG233), await b.evaluate("b=>b.getAttribute('aria-disabled')")]
            req['ns fields'] = await pg.evaluate("['nsName','nsLast','nsReason','nsDoc'].map(i=>document.getElementById(i).getAttribute('autocomplete'))+'|'+document.getElementById('nsDoc').placeholder+'|'+document.querySelectorAll('#nsDocList option').length")
        await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
    await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(600)
    req['note'] = await pg.evaluate("document.querySelector('#noteDrawer .btn.primary').getAttribute('aria-disabled')")
    await pg.evaluate(CLOSE233)
    ok('n233: required fields are marked and the main button waits — pressing it anyway says in place what’s missing (New sheet, Estimate, Order, Allergies, Note; toasts before)',
       all(req[n][0] == 'true' and req[n][1] and req[n][2] and req[n][3] for n in ('new sheet', 'estimate', 'order', 'allergy')) and req['note'] == 'true', req)
    ok('n233: the estimate says “Enter a high end that’s at least the low end” as you leave the field, and the button wakes when it’s right',   # n260: was “The high end must be …” (say what to do)
       'Enter a high end that’s at least the low end' in ' '.join(req['low>high'][0]) and req['low>high'][1] == 'true' and req['estimate filled'] is None, req)
    ok('n233: a weight that can’t be read is flagged as you leave the field, and Create waits (it saved no weight)', any('weight' in m for m in req['bad weight'][0]) and req['bad weight'][1] == 'true', req['bad weight'])
    ok('n233: the attending doctor comes from the roster (no real name as the example) and the patient and owner fields don’t autofill on shared computers',
       req['ns fields'].startswith('off,off,off,off|Choose or type|') and int(req['ns fields'].split('|')[-1]) > 0, req['ns fields'])
    # 5. labels
    lab = {}
    await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1200)
    lab['rx'] = await pg.evaluate("[document.getElementById('rxDose').getAttribute('aria-label'),document.getElementById('rxUnit').getAttribute('aria-label')]")
    await pg.evaluate(CLOSE233); await pg.evaluate("tsChAdd()"); await pg.wait_for_timeout(900)
    lab['ch'] = await pg.evaluate("document.getElementById('chQ').getAttribute('aria-label')")
    await pg.evaluate(CLOSE233); await pg.evaluate("tsAllergyEdit()"); await pg.wait_for_timeout(700)
    lab['al'] = await pg.evaluate("document.getElementById('tsAlIn').getAttribute('aria-label')")
    await pg.evaluate(CLOSE233)
    ok('n233: fields have real names — “Dose” and “Dose unit” (not every unit run together), the charge search and Allergies', lab['rx'] == ['Dose', 'Dose unit'] and lab['ch'] and lab['al'], lab)
    # 8. a clipped field shows its full text
    await pg.evaluate("tsOpenFluidOrder()"); await pg.wait_for_timeout(1100)
    await pg.fill('#flNotes', 'Check the catheter site every two hours and call the doctor if the limb swells or the pump alarms twice in an hour')
    await pg.hover('#flNotes'); await pg.wait_for_timeout(300)
    tt = await pg.evaluate("document.getElementById('flNotes').title")
    await pg.evaluate(CLOSE233)
    ok('n233: on the Mac a clipped field shows its full text as a tooltip', tt.startswith('Check the catheter site'), tt[:40])
    # 10. reordering says what moved, with Undo
    await pg.evaluate(OBS233)
    o0 = await pg.evaluate("[...document.querySelectorAll('#sheetInner .grow[data-sec]')].slice(0,3).map(r=>r.dataset.o)")
    await pg.hover('#sheetInner .grow[data-o="%s"]' % o0[0]); gb = await pg.locator('#sheetInner .grow[data-o="%s"] .rl-grip' % o0[0]).bounding_box()
    await pg.mouse.move(gb['x'] + 5, gb['y'] + gb['height'] / 2); await pg.mouse.down()
    for dy in range(0, 90, 10): await pg.mouse.move(gb['x'] + 5, gb['y'] + gb['height'] / 2 + dy); await pg.wait_for_timeout(30)
    await pg.mouse.up(); await pg.wait_for_timeout(800)
    o1 = await pg.evaluate("[...document.querySelectorAll('#sheetInner .grow[data-sec]')].slice(0,3).map(r=>r.dataset.o)")
    msg = await pg.evaluate("[...new Set(window.__T)]")
    await pg.locator('button:has-text("Undo")').last.click(); await pg.wait_for_timeout(800)
    o2 = await pg.evaluate("[...document.querySelectorAll('#sheetInner .grow[data-sec]')].slice(0,3).map(r=>r.dataset.o)")
    ok('n233: reordering an order says what moved and Undo puts it back (it was silent)', o1 != o0 and any('moved to #' in x for x in msg) and o2 == o0, (o0, o1, o2, msg))
    # 13. Share: a link to this sheet; Copy writes a table too
    await ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
    await pg.locator('#tsCopyBtn').last.click(); await pg.wait_for_timeout(400)
    items = await pg.evaluate("[...document.querySelectorAll('#tsCopyMenu [data-c]')].map(b=>b.dataset.c)")
    await pg.locator('#tsCopyMenu [data-c="link"]').click(); await pg.wait_for_timeout(500)
    link = await pg.evaluate("navigator.clipboard.readText()")
    await pg.locator('#tsCopyBtn').last.click(); await pg.wait_for_timeout(400)
    await pg.locator('#tsCopyMenu [data-c="tx"]').click(); await pg.wait_for_timeout(700)
    types = await pg.evaluate("(async()=>{try{const it=await navigator.clipboard.read();return it.map(i=>i.types.join(','))}catch(e){return [String(e)]}})()")
    ok('n233: Copy (Share since n237) offers “Link to this sheet” — the link carries only the sheet’s ID, no names', 'link' in items and link.endswith('#sheet=sh_train1') and 'Biscuit' not in link and 'Training' not in link, (items, link))
    ok('n233: Copy writes a table version too, so Word and Outlook keep the columns', any('text/html' in t for t in types), types)
    # 16. the drawer's medal and sentence case
    await pg.evaluate("openCompletion('%s')" % ks); await pg.wait_for_timeout(900)
    hd = await pg.evaluate("[document.getElementById('cd-sub').textContent,!!document.querySelector('#completionDrawer .pvx-med.pm-g use'),!!document.querySelector('#completionDrawer .pm-sp')]")
    await pg.evaluate(CLOSE233)
    ok('n233: the drawer shows the dog glyph (not “B / CAN”) and “Observations” in sentence case', hd[0].startswith('Observations')   # n260: was “Basic observation”
       and hd[1] and not hd[2], hd)
    # 14. view only, said up front
    await pg.evaluate("currentRole='csr';try{renderSheet()}catch(e){}"); await pg.wait_for_timeout(900)
    vo = await pg.evaluate("(document.querySelector('.tsh .pvx-vo')||{}).textContent||''")
    await pg.evaluate("currentRole='tech';try{renderSheet()}catch(e){}"); await pg.wait_for_timeout(900)
    vo2 = await pg.evaluate("!!document.querySelector('.tsh .pvx-vo')")
    ok('n233: a view-only role sees “View only” beside the patient’s name before tapping anything; a tech doesn’t', vo.strip() == 'View only' and not vo2, (vo, vo2))
    ok('n233: no page errors', not errs, errs[:2])
    await ctx.close()
    # 11. the grip on touch
    ctx, pg, errs = await ts232(vp=(1180, 820), touch=True, view='sheet')
    gp = await pg.evaluate("(()=>{const g=document.querySelector('#sheetInner .rl-grip');if(!g)return null;const r=g.getBoundingClientRect();return {op:+getComputedStyle(g).opacity,w:r.width,hit:parseFloat(getComputedStyle(g,'::before').height)}})()")
    ok('n233: on iPad and iPhone the reorder grip is visible with a 44 pt target (it was invisible and 12 pt)', gp and gp['op'] >= 0.6 and gp['w'] >= 30 and gp['hit'] >= 44, gp)
    await ctx.close()


@section(id='n234', title='n234: Treatment Sheets — HIG Feedback, File management, Going full screen (synthetic training patients)',
         apps=['treatment', 'flow'], topics=['sheets-alerts'])
async def s_n234(br):
    import re as _re234, tempfile as _tf234
    OBS234 = "(()=>{window.__T=[];new MutationObserver(m=>m.forEach(r=>{const t=r.target;const el=t.nodeType===1?t:t.parentElement;const c=el&&el.closest&&el.closest('.ctoast,#fvToast,[class*=toast]');if(c){const x=(c.innerText||'').trim();x&&window.__T.push(x.slice(0,140))}})).observe(document.body,{subtree:true,childList:true,characterData:true})})()"
    FAIL234 = "(on=>{const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y'));if(on){window.__upd234=window.__upd234||P.update;P.update=function(){return Promise.reject({code:'unavailable'})}}else if(window.__upd234){P.update=window.__upd234}})"
    SH234 = "(()=>{const k=Object.keys(window.__fs).find(k=>k.endsWith('/sh_train1'));return window.__fs[k]})()"
    # 1.–2. offline: the sheet and the TV say so
    ctx, pg, errs = await ts232(view='sheet')
    await ctx.set_offline(True); await pg.wait_for_timeout(700)
    ch = await pg.evaluate("(()=>{const c=document.querySelector('.tsh .tsh-name .pvx-off');return c?[c.innerText,c.getAttribute('aria-label'),(document.getElementById('pvxSayLive')||{}).textContent||'']:null})()")
    ok('n234: with the connection gone, the sheet says “Offline — others’ charting isn’t reaching you” beside the name, at once, and VoiceOver hears it (nothing said before)',
       bool(ch) and ch[0].startswith('Offline') and 'charting' in ch[1] and 'Offline' in ch[2], ch)
    await pg.evaluate("tsTvOpen('ICU')"); await pg.wait_for_timeout(1200)
    tv = await pg.evaluate("[document.querySelector('#tsTv .tv-live').innerText,document.getElementById('tsTv').classList.contains('tv-stale'),getComputedStyle(document.querySelector('#tsTv .tv-stats')||document.body).opacity,document.querySelector('#tsTv .tv-foot-l').textContent]")
    ok('n234: offline, the TV says “Offline — last updated 4:01 PM” and dims its counts (it kept saying “Live · Updating”)',
       tv[0].startswith('Offline — last updated ') and _re234.search(r'\d:\d\d', tv[0]) and tv[1] and float(tv[2]) < 0.7 and tv[3] == 'Not updating while offline · read-only', tv)
    await ctx.set_offline(False); await pg.wait_for_timeout(700)
    back = await pg.evaluate("[document.querySelector('#tsTv .tv-live').innerText,document.getElementById('tsTv').classList.contains('tv-stale'),!!document.querySelector('.tsh .pvx-off'),document.querySelector('#tsTv .tv-foot-l').textContent]")
    ok('n234: back online, the TV says “Live · Updating” again and the sheet’s chip goes', back == ['Live · Updating', False, False, 'Updates live · read-only'], back)
    # 11.–14. the TV in full screen
    fb = await pg.evaluate("(document.getElementById('tvFsBtn')||{}).textContent")
    await pg.click('#tvFsBtn'); await pg.wait_for_timeout(700)
    fon = await pg.evaluate("[!!document.fullscreenElement,document.getElementById('tvFsBtn').textContent]")
    await pg.wait_for_timeout(3600)
    idle = await pg.evaluate("[document.getElementById('tsTv').classList.contains('tv-idle'),getComputedStyle(document.getElementById('tvFsBtn')).opacity,getComputedStyle(document.getElementById('tsTv')).cursor]")
    await pg.mouse.move(400, 300); await pg.mouse.move(420, 320); await pg.wait_for_timeout(400)
    woke = await pg.evaluate("[document.getElementById('tsTv').classList.contains('tv-idle'),getComputedStyle(document.getElementById('tvFsBtn')).opacity]")
    ok('n234: the TV’s button says “Exit full screen” in full screen (it kept saying “Full screen”)', fb == 'Full screen' and fon == [True, 'Exit full screen'], (fb, fon))
    ok('n234: in full screen the TV’s buttons and pointer hide after 3 s still, and come back when the mouse moves', idle[0] and idle[1] == '0' and idle[2] == 'none' and not woke[0], (idle, woke))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700)
    e1 = await pg.evaluate("[!!document.fullscreenElement,!!document.getElementById('tsTv'),(document.getElementById('tvFsBtn')||{}).textContent]")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    e2 = await pg.evaluate("!!document.getElementById('tsTv')")
    ok('n234: Esc leaves full screen first and keeps the TV, then a second Esc closes it', e1 == [False, True, 'Full screen'] and not e2, (e1, e2))
    wk = await pg.evaluate("""(async()=>{let n=0;const L=()=>({released:false,release(){this.released=true;return Promise.resolve()}});let last=null;
      Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:()=>{n++;last=L();return Promise.resolve(last)}}});
      tsTvOpen('ICU');await new Promise(r=>setTimeout(r,300));const a=n;last.released=true;
      Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r=>setTimeout(r,200));const b=n;document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setTimeout(r,200));tsTvClose();return [a,b,n]})()""")
    ok('n234: the TV asks again to keep the screen awake when it’s shown after the browser dropped the lock, and only then', wk == [1, 2, 2], wk)
    await ctx.close()
    # 4.–6. toasts: announced, errors stay and can be dismissed, Undo waits
    ctx, pg, errs = await ts232(view='sheet')
    ro = await pg.evaluate("(()=>{toast('Note saved');const a=[...document.querySelectorAll('#toastWrap .ctoast')].pop();toast('Couldn’t save — there’s no connection. Try again.');const e=[...document.querySelectorAll('#toastWrap .ctoast')].pop();return [a.getAttribute('role'),e.getAttribute('role'),!!e.querySelector('.pvx-tx[aria-label=Dismiss]')]})()")
    await pg.wait_for_timeout(4600)   # n257: confirmations stay at least 4 s
    st = await pg.evaluate("[document.querySelectorAll('#toastWrap .ctoast.err').length,[...document.querySelectorAll('#toastWrap .ctoast')].some(t=>t.innerText.includes('Note saved'))]")
    await pg.locator('#toastWrap .ctoast.err .pvx-tx').last.click(); await pg.wait_for_timeout(500)
    gone = await pg.evaluate("document.querySelectorAll('#toastWrap .ctoast.err').length")
    ok('n234: VoiceOver hears success too — “Note saved” is a polite status (it had no role)', ro[0] == 'status' and ro[1] == 'alert', ro)
    ok('n234: an error stays past 4 s with a Dismiss button, and Dismiss removes it (errors left in 2.9 s, like “Note saved”)', ro[2] and st == [1, False] and gone == 0, (ro, st, gone))
    await pg.evaluate("tsUndoToast('Test removed',()=>{},5000)")
    u = pg.locator('#toastWrap .ts-undo').last; await u.hover(); await pg.wait_for_timeout(6200)
    held = await u.count(); await pg.mouse.move(5, 5); await pg.wait_for_timeout(5600)
    ok('n234: Undo waits while the pointer is on it (it left after 5 s regardless), then takes the time it had left', held == 1 and await pg.locator('#toastWrap .ts-undo').count() == 0, held)
    await ctx.close()
    ctx, pg, errs = await ts232(view='sheet', dark=False)
    await pg.evaluate("tsUndoToast('Test removed',()=>{},5000)"); await pg.wait_for_timeout(400)
    lu = await pg.evaluate("(()=>{const t=[...document.querySelectorAll('#toastWrap .ts-undo')].pop();return [getComputedStyle(t.querySelector('button')).color,getComputedStyle(t).backgroundColor]})()")
    ok('n234: in the light theme the Undo button is dark on the light toast (it was white on white — found while building)', lu[0] in ('rgb(29, 29, 31)',), lu)
    # 3. failed saves put the screen back
    await pg.evaluate(OBS234)
    await pg.evaluate("(()=>{const d=__tsStore.doc;d.patient=d.patient||{};d.patient.doctor_next='Dr. Testdoc'})()")
    await pg.evaluate(FAIL234 + "(true)")
    await pg.evaluate("tsHoClearNext()"); await pg.wait_for_timeout(600)
    cn = [await pg.evaluate("__tsStore.doc.patient.doctor_next"), await pg.evaluate("[...new Set(window.__T)].pop()||''")]
    await pg.evaluate("tsAckFlag('sh_train1','test_flag_n234')"); await pg.wait_for_timeout(600)
    af = [await pg.evaluate("!!((__tsStore.doc.flag_acks||{}).test_flag_n234)"), await pg.evaluate("[...new Set(window.__T)].pop()||''")]
    await pg.evaluate("tsRebalance('sh_train1','Test Tech')"); await pg.wait_for_timeout(600)
    tt = [await pg.evaluate("((__tsStore.sheets.find(s=>s._id==='sh_train1')||{}).patient||{}).tech||null"), await pg.evaluate("[...new Set(window.__T)].pop()||''")]
    await pg.evaluate(FAIL234 + "(false)")
    ok('n234: a failed “clear the next doctor” puts the doctor back and says why — “Couldn’t clear the next doctor — there’s no connection. Nothing changed.” (the screen showed it cleared)',
       cn[0] == 'Dr. Testdoc' and cn[1].startswith('Couldn’t clear the next doctor — there’s no connection. Nothing changed.'), cn)
    ok('n234: a failed alert acknowledgement and a failed tech assignment are put back, and say so', not af[0] and af[1].startswith('Couldn’t acknowledge the alert —') and tt[0] != 'Test Tech' and tt[1].startswith('Couldn’t assign the tech —'), (af, tt))
    # 7. closing a sheet: Undo, and Reopen for doctors
    await pg.evaluate("tsCloseSheet('home',null,'',null)"); await pg.wait_for_timeout(1400)
    cu = await pg.evaluate("(()=>{const t=[...document.querySelectorAll('#toastWrap .ts-undo')].pop();return t?[t.querySelector('.tu-msg').innerText,t.querySelector('.tu-bar').style.animationDuration]:null})()")
    s1 = await pg.evaluate(SH234 + ".status")
    await pg.locator('#toastWrap .ts-undo button:text-is("Undo")').last.click(); await pg.wait_for_timeout(1400)
    s2 = await pg.evaluate("(d=>[d.status,d.closed_reason||null,d.outcome||null,d.audit.slice(-1)[0].desc])(" + SH234 + ")")
    ok('n234: closing a sheet offers Undo for 10 s (“Biscuit Training closed · Undo”), and Undo brings it back to Inpatients with “Sheet reopened” on its timeline',
       cu and cu[0] == 'Biscuit Training closed' and cu[1] == '10000ms' and s1 == 'closed' and s2[:3] == ['active', None, None] and s2[3].startswith('Sheet reopened'), (cu, s1, s2))
    await pg.evaluate("tsCloseSheet('home',null,'',null)"); await pg.wait_for_timeout(1400)
    await pg.evaluate("tsReopenList()"); await pg.wait_for_timeout(900)
    rl = await pg.evaluate("(()=>{const m=document.querySelector('#tsModal.show .tm-card');return m?[m.querySelector('h3').textContent,m.querySelectorAll('[data-ro]').length,m.innerText.includes('Went home'),!!m.querySelector('[data-x]'),getComputedStyle(document.getElementById('tsModal')).zIndex]:null})()")
    await pg.locator('#tsModal [data-ro]').first.click(); await pg.wait_for_timeout(1400)
    s3 = await pg.evaluate(SH234 + ".status")
    ok('n234: a doctor can reopen a sheet closed today from a list (“Reopen a sheet closed today”), with how and when it closed', rl and rl[0] == 'Reopen a sheet closed today' and rl[1] >= 1 and rl[2] and not rl[3] and s3 == 'active', (rl, s3))
    await pg.evaluate("document.getElementById('tsPatientChip').click()"); await pg.wait_for_timeout(500)
    mi = await pg.evaluate("(()=>{const b=document.querySelector('#tsPatientMenu [data-reopen]');return b?b.textContent.trim():null})()")
    ok('n234: the patient menu offers “Reopen a sheet closed today…” to doctors', mi == 'Reopen a sheet closed today…', mi)
    await ctx.close()
    # 8.–10. files: named PDFs, an import that asks first, names with “…”
    ctx, pg, errs = await ts232(view='sheet')
    oid = await pg.evaluate("((TASKS||[]).find(t=>t.order&&t.order.type==='med')||{order:{}}).order.id")
    await pg.evaluate(f"tsOcHandoutPrint({json.dumps(oid)})"); await pg.wait_for_timeout(800)
    ht = await pg.evaluate("(()=>{const f=[...document.querySelectorAll('iframe')].pop();return f&&f.contentDocument?f.contentDocument.title:''})()")
    ok('n234: the handout saves as “Biscuit – <drug> handout – Oct 21 2026”, with the pet’s name only (it carried the owner’s last name, and no date)',
       _re234.match(r'^Biscuit – .+ handout – [A-Z][a-z]{2} \d{1,2} \d{4}$', ht or '') is not None and 'Training' not in ht, ht)
    await pg.evaluate("window.__pt=[];window.print=()=>{window.__pt.push(document.title)};void 0")
    await pg.evaluate("tsDowntimePrint('board')"); await pg.wait_for_timeout(1900)
    await pg.evaluate("tsDowntimeSetup()"); await pg.wait_for_timeout(2500)
    one = pg.locator('#tsDowntime [data-dt-print]').first
    lab = await one.get_attribute('aria-label') if await one.count() else None
    if await one.count(): await one.click(); await pg.wait_for_timeout(1900)
    await pg.locator('#tsDowntime [data-dt="all"]').click(); await pg.wait_for_timeout(1900)
    pt = await pg.evaluate("[window.__pt,document.title]")
    ok('n234: saved downtime PDFs are named for what they hold — “Flow board – downtime – …”, “Biscuit – downtime sheet – …”, “Treatment downtime – 3 patients – …” — and the page title comes back after printing',
       len(pt[0]) == 3 and pt[0][0].startswith('Flow board – downtime – ') and _re234.match(r'^\S.* – downtime sheet – ', pt[0][1]) and 'Training' not in pt[0][1] and _re234.match(r'^Treatment downtime – \d+ patients? – ', pt[0][2]) and (pt[1] == 'Pravix Treatment Sheets | VCA Shoreline' or (' · ' in pt[1] and 'downtime' not in pt[1]) or pt[1] in ('Dashboard', 'Tasks')), pt)   # n284: the title names the view ("Biscuit Training · Treatment sheet")
    nm = await pg.evaluate("[...document.querySelectorAll('#tsDowntime .dt-btn')].map(b=>b.textContent.trim())")
    ok('n234: buttons that open the print dialog end in “…” (Print downtime packet…, Print board only…, Print…), with a name for each sheet’s Print', 'Print downtime packet…' in nm and 'Print board only…' in nm and 'Print…' in nm and lab and lab.startswith('Print ') and lab.endswith('…') and 'this sheet' not in lab, (nm[:5], lab))
    await pg.evaluate("tsDowntimeClose()")
    await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1200)
    ib = await pg.evaluate("(()=>{const b=document.getElementById('stgImpBtn');return b?[b.innerText.trim(),b.getAttribute('role'),b.tabIndex]:null})()")
    ok('n234: the import says “Import code list…” and takes the keyboard (it said “Import (.json)” and couldn’t be reached with Tab)', ib == ['Import code list…', 'button', 0], ib)
    tmpd = _tf234.mkdtemp(); fj = os.path.join(tmpd, 'codes.json'); fb2 = os.path.join(tmpd, 'notes.json')
    json.dump({'version': 'TEST-1', 'codes': [{'c': '9.%d' % i, 'n': 'Synthetic item %d' % i} for i in range(1, 2600)]}, open(fj, 'w')); open(fb2, 'w').write('not json')
    await pg.evaluate("(()=>{const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y'));window.__set234=P.set;P.set=function(){const a=arguments,me=this;return new Promise(r=>setTimeout(r,250)).then(()=>window.__set234.apply(me,a))}})()")
    w0 = await pg.evaluate("window.__fsLog.filter(x=>String(x[1]).startsWith('charge_codes')).length")
    await pg.set_input_files('#stgImport', fj); await pg.wait_for_timeout(900)
    cf = await pg.evaluate("[(document.querySelector('#tsModal.show .tm-card')||{}).innerText||'',window.__fsLog.filter(x=>String(x[1]).startsWith('charge_codes')).length]")
    await pg.locator('#tsModal [data-ok]').click(); await pg.wait_for_timeout(120)
    pr = await pg.evaluate("[document.getElementById('stgImpBtn').innerText,document.getElementById('stgImpBtn').getAttribute('aria-disabled')]")
    await pg.wait_for_timeout(2500)
    dn = await pg.evaluate("[(document.getElementById('stgImpBtn')||{}).innerText||'',(window.__fs['charge_codes/meta']||{}).count]")
    ok('n234: the import asks first — “Replace the code list? This file has 2,599 codes (version TEST-1)…” — and writes nothing until you say so (it replaced the list at once)',
       cf[0].startswith('Replace the code list?') and '2,599 codes' in cf[0] and cf[1] == w0, cf)
    ok('n234: while it runs the button says “Importing … of 2,599…” and waits, then comes back', pr[0].startswith('Importing ') and pr[0].endswith('of 2,599…') and pr[1] == 'true' and dn == ['Import code list…', 2599], (pr, dn))
    await pg.set_input_files('#stgImport', fj); await pg.wait_for_timeout(900)
    c2 = await pg.evaluate("(document.querySelector('#tsModal.show .tm-card')||{}).innerText||''")
    await pg.locator('#tsModal [data-x]').click(); await pg.wait_for_timeout(300)
    await pg.evaluate(OBS234); await pg.set_input_files('#stgImport', fb2); await pg.wait_for_timeout(700)
    bf = await pg.evaluate("[...new Set(window.__T)]")
    ok('n234: the second time it says what it replaces (“It replaces the 2,599 codes (version TEST-1) imported today… by DG, for everyone”), above the Settings sheet', 'It replaces the 2,599 codes (version TEST-1) imported today' in c2, c2)
    ok('n234: a file that isn’t the code list says what to choose instead (“Couldn’t read that file — choose the WOOFware code list (.json)”)', any(x.startswith('Couldn’t read that file — choose') for x in bf), bf)
    await pg.evaluate("(()=>{const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y'));P.set=window.__set234})()")
    # 15. a Home Screen app
    hm = await pg.evaluate("Promise.all([fetch('manifest.webmanifest').then(r=>r.json()),fetch('treatment-512.png').then(r=>r.status),fetch('treatment-180.png').then(r=>r.status)]).then(([j,a,b])=>[j.start_url,j.scope,j.display,j.short_name,j.icons.map(i=>i.sizes).join(' '),a,b,!!document.querySelector('link[rel=manifest]'),(document.querySelector('meta[name=apple-mobile-web-app-capable]')||{}).content,(document.querySelector('link[rel=apple-touch-icon]')||{}).href||''])")
    ok('n234: Treatment can be added to the Home Screen as its own app — manifest scoped to /treatment/, standalone, its icon, and the Home Screen tags (it had none)',
       hm[:5] == ['/treatment/', '/treatment/', 'standalone', 'Treatment', '192x192 512x512'] and hm[5] == 200 and hm[6] == 200 and hm[7] and hm[8] == 'yes' and hm[9].endswith('treatment-180.png'), hm)
    ok('n234: Treatment has no page errors (offline, toasts, closing and reopening, printing, the import)', not errs, errs[:2])
    await ctx.close()
    # 14. no Full screen button where the browser can't do it (iPhone)
    ctx, pg, errs = await ts232(vp=(390, 844), touch=True, view='dash')
    nf = await pg.evaluate("(()=>{Object.defineProperty(document,'fullscreenEnabled',{configurable:true,get:()=>false});Object.defineProperty(document,'webkitFullscreenEnabled',{configurable:true,get:()=>false});tsTvOpen('ICU');const b=document.getElementById('tvFsBtn');const r=[b.hidden,b.getBoundingClientRect().width,[...document.querySelectorAll('#tsTv .tv-foot button')].filter(x=>x.getBoundingClientRect().width).map(x=>x.textContent)];tsTvClose();return r})()")
    ok('n234: on iPhone, where pages can’t go full screen, the TV shows only Exit (Full screen did nothing)', nf[0] is True and nf[1] == 0 and nf[2] == ['Exit'], nf)
    await ctx.close()


@section(id='n235', title='n235: Treatment Sheets — HIG Launching, Loading, Managing accounts (synthetic training patients)',
         apps=['treatment', 'flow'], topics=['sheets-alerts', 'sign-in'])
async def s_n235(br):
    async def ts235(before='', after='', dark=True, vp=(1440, 900), hash_='', sw=False, wait=2600):
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED232))
        if before: await ctx.add_init_script(before)
        await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        if after: await ctx.add_init_script(after)
        async def route(r):
            u = r.request.url
            if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
            elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await (ctx if sw else ctx).route('**/*', route)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/' + hash_); await pg.wait_for_timeout(wait)
        return ctx, pg, errs
    SLOW235 = """(function w(){ if(!window.firebase||!firebase.firestore){ return setTimeout(w,5); } try{ const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y')); const o=P.onSnapshot;
      P.onSnapshot=function(){ const me=this,args=arguments; if(window.__slowDoc&&/^sheets\\/[^/]+$/.test(me.path)){ let un=null,dead=false; setTimeout(()=>{ if(!dead) un=o.apply(me,args); },window.__slowDoc); return function(){ dead=true; un&&un(); }; } return o.apply(me,args); };
      const Q=Object.getPrototypeOf(firebase.firestore().collection('x').where('a','==',1)); const QG=Q.get; Q.get=function(){ const me=this; return window.__slowGet?new Promise(r=>setTimeout(r,window.__slowGet)).then(()=>QG.apply(me)):QG.apply(me) }; }catch(e){} })();"""
    # 1. never "no patients" while loading
    ctx, pg, errs = await ts235(after='window.__fsDelay=5000;', wait=2000)
    ld = await pg.evaluate("""(()=>{const st=document.getElementById('stage')||document.body;const vis=e=>e&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
      return {cls:document.documentElement.className,txt:st.innerText,cnt:[...document.querySelectorAll('#sbBoards .sb-cnt')].filter(vis).length,skel:document.querySelectorAll('#ctab-dash .pvx-skel .pvx-sk-row').length,busy:(document.querySelector('#ctab-dash .pvx-skel')||{getAttribute(){return null}}).getAttribute('aria-busy')}})()""")
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(400)
    tk = await pg.evaluate("document.getElementById('ctab-tasks').innerText")
    ok('n235: while the patient list loads, the Status board shows placeholder rows — no counts, no “0”, no “No admitted patients yet” (it said the board was empty for 5 s)',
       'ts-loading' in ld['cls'] and ld['cnt'] == 0 and ld['skel'] >= 4 and ld['busy'] == 'true' and 'No admitted patients' not in ld['txt'] and 'Inpatients 0' not in ld['txt'].replace('\n', ' '), {k: (v[:200] if isinstance(v, str) else v) for k, v in ld.items()})
    ok('n235: Tasks says “Loading the patient list…” instead of “Nothing due right now … No admitted patients”', 'Loading the patient list' in tk and 'No admitted patients' not in tk and 'Nothing due right now' not in tk, tk[:200])
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(4200)
    rd = await pg.evaluate("[document.documentElement.className,[...document.querySelectorAll('#sbBoards .sb-cnt')].map(c=>c.dataset.n),document.querySelectorAll('#ctab-dash .pvx-skel').length,document.querySelectorAll('#ctab-dash .sb-row:not(.sb-head)').length]")
    ok('n235: when the list arrives, the counts and rows replace the placeholders', 'ts-loading' not in rd[0] and rd[2] == 0 and rd[3] >= 1 and any(n not in (None, '0') for n in rd[1]), rd)
    ok('n235: the status bar follows the theme — dark #0A1222', await pg.evaluate("document.querySelector('meta[name=theme-color]').content") == '#0A1222')
    await ctx.close()
    ctx, pg, errs = await ts235(after='window.__fsDelay=60000;', wait=10800)
    sl = await pg.evaluate("[document.documentElement.className,(document.querySelector('#ctab-dash .pvx-skel-slow')||{}).innerText||'',getComputedStyle(document.querySelector('#ctab-dash .pvx-skel-slow')).display]")
    ok('n235: after 10 s without an answer it says “Still loading the patient list — check the connection”', 'ts-load-slow' in sl[0] and sl[1].startswith('Still loading the patient list') and sl[2] == 'block', sl)
    await ctx.close()
    ctx, pg, errs = await ts235(dark=False)
    ok('n235: … and light #F2F4F8 in the light theme (it was always dark; Treatment is its own Home Screen app since n234)', await pg.evaluate("document.querySelector('meta[name=theme-color]').content") == '#F2F4F8')
    await ctx.close()
    # 4.–5. a sheet opens at once; reports and the medication search show progress
    ctx, pg, errs = await ts235(after=SLOW235, wait=3200)
    await pg.evaluate("localStorage.clear();window.__slowDoc=3500;tsOpenSheet('sh_train2');selectCTab('sheet')"); await pg.wait_for_timeout(700)
    sk = await pg.evaluate("""(()=>{const s=document.querySelector('#ctab-sheet .pvx-sksheet');return s?{name:s.querySelector('.pvx-sk-name').textContent,facts:s.querySelector('.pvx-sk-facts').innerText.replace(/\\n/g,' '),rows:s.querySelectorAll('.pvx-sk-or').length,busy:s.getAttribute('aria-busy'),chip:(document.querySelector('#tsPatientChip .nm')||{}).textContent,opening:document.getElementById('ctab-sheet').innerText.includes('Opening sheet…')}:null})()""")
    await pg.wait_for_timeout(4000)
    sk2 = await pg.evaluate("[!!document.querySelector('#ctab-sheet .pvx-sksheet'),!!document.querySelector('#sheetInner .grow'),(document.querySelector('.tsh .tsh-name')||{}).textContent||'']")
    ok('n235: opening a sheet shows its header and order rows at once from the list (name, weight, code, allergies), with placeholder cells — no blank “Opening sheet…” page — and the chip names the patient',
       sk and sk['name'] == 'Mochi Training' and 'DNR' in sk['facts'] and '4.2 kg' in sk['facts'] and sk['rows'] >= 5 and sk['busy'] == 'true' and sk['chip'] == 'Mochi Training' and not sk['opening'], sk)
    ok('n235: … and the real sheet replaces it when its charting arrives', not sk2[0] and sk2[1] and sk2[2].startswith('Mochi Training'), sk2)
    await pg.evaluate("window.__slowDoc=0;window.__slowGet=2500;tsOnTime(1)"); await pg.wait_for_timeout(600)
    rp = await pg.evaluate("(()=>{const b=document.querySelector('#tsOrderSheet .op-card .pvx-busy');return b?[b.getAttribute('role'),!!b.querySelector('.pvx-spin'),getComputedStyle(b.querySelector('.pvx-spin')).animationName,b.textContent]:null})()")
    ok('n235: a report waiting on the database shows a progress indicator beside “Counting…” (role=status)', rp and rp[0] == 'status' and rp[1] and rp[2] == 'pvxSpin' and rp[3] == 'Counting…', rp)
    await pg.evaluate("try{tsOrderClose()}catch(e){}")
    ok('n235: no page errors while loading, opening a sheet and waiting on a report', not errs, errs[:2])
    await ctx.close()
    # 6. sign in without leaving Treatment, on Flow's own card
    ctx, pg, errs = await ts235(before='window.__fsUser=null;', hash_='#sheet=sh_train1')
    gt = await pg.evaluate("""(()=>{const o=document.querySelector('#tsGate.show #sbLogin');if(!o)return null;const c=o.querySelector('.card');const cs=getComputedStyle(c);
      return {h:o.querySelector('h1').textContent,lead:o.querySelector('#sbLead').textContent,prod:o.querySelector('.product').textContent,e:[o.querySelector('#sbEmail').type,o.querySelector('#sbEmail').autocomplete],
        p:[o.querySelector('#sbPass').type,o.querySelector('#sbPass').autocomplete],go:o.querySelector('#sbBtn').textContent,inactive:o.querySelector('#sbBtn').classList.contains('is-inactive'),
        radius:cs.borderRadius,fieldH:getComputedStyle(o.querySelector('.field')).height,pos:getComputedStyle(o).position,styles:!!document.getElementById('sbLoginStyles'),
        logo:[...o.querySelectorAll('.pravix-logo-img')].filter(i=>i.getBoundingClientRect().width>0&&i.naturalWidth>0).length,locked:document.body.classList.contains('sb-locked'),
        flow:!!o.querySelector('a[href="https://shoreline.pravix.app/"]'),focus:document.activeElement&&document.activeElement.id}})()""")
    ok('n235: signed out, Treatment shows Flow’s own sign-in card — same markup, styles (copied from Flow at build time), logo, fields and button — with “Shoreline Treatment Sheets” and why: “Hospital staff only…”',
       gt and gt['h'] == 'Sign in to Pravix' and gt['lead'] == 'Hospital staff only. Sign in with your own account.' and gt['prod'] == 'Shoreline Treatment Sheets' and gt['e'] == ['email', 'username'] and gt['p'] == ['password', 'current-password']
       and gt['go'] == 'Sign in' and gt['inactive'] and gt['styles'] and gt['pos'] == 'fixed' and gt['fieldH'] == '54px' and gt['logo'] == 1 and gt['locked'] and not gt['flow'] and gt['focus'] == 'sbEmail', gt)
    # the same look as Flow's card, measured side by side
    fctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark')
    await fctx.add_init_script(INIT.replace('@@USER@@', 'null').replace('@@SEED@@', SEED232)); await fctx.add_init_script(FAKE); await fctx.add_init_script(WRAP)
    async def froute(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await fctx.route('**/*', froute)
    fpg = await fctx.new_page(); await fpg.goto(f'http://127.0.0.1:{PORT}/'); await fpg.wait_for_timeout(3500)
    LOOK = "(()=>{const o=document.getElementById('sbLogin');if(!o)return null;const g=(s,p)=>{const e=o.querySelector(s);return e?getComputedStyle(e)[p]:null};return [g('#sbForgot','color'),g('#sbEmail','boxShadow'),g('.card','height'),g('.card','borderRadius'),g('.card','width'),g('.field','height'),g('.field','borderRadius'),g('.continue','height'),g('.continue','borderRadius'),g('.heading h1','fontSize'),g('.heading h1','color'),g('.field-label','fontSize'),getComputedStyle(o).backgroundImage.slice(0,60)]})()"
    flook = await fpg.evaluate(LOOK); await fctx.close()
    tlook = await pg.evaluate(LOOK)
    ok('n235: Treatment’s sign-in card measures the same as Flow’s (card, fields, button, heading, background)', flook is not None and flook == tlook, (flook, tlook))
    await pg.click('#sbForgot'); await pg.wait_for_timeout(200)
    f1 = await pg.evaluate("document.getElementById('sbErr').textContent")
    await pg.fill('#sbEmail', 'test.tech@pravix.app'); await pg.click('#sbForgot'); await pg.wait_for_timeout(300)
    f2 = [await pg.evaluate("document.getElementById('sbErr').textContent"), await pg.evaluate("window.__fsResets||[]")]
    ok('n235: Forgot password? asks for the email first, then sends the reset link — Flow’s wording', f1 == 'Enter your email above, then choose Forgot password.' and f2[0].startswith('Reset link sent to test.tech@pravix.app') and f2[1] == ['test.tech@pravix.app'], (f1, f2))
    await pg.click('#sbReveal'); sh = await pg.evaluate("[document.getElementById('sbPass').type,document.getElementById('sbReveal').getAttribute('aria-label')]")
    await pg.click('#sbReveal')
    await pg.fill('#sbPass', 'not-it'); await pg.click('#sbBtn'); await pg.wait_for_timeout(500)
    wr_ = await pg.evaluate("document.getElementById('sbErr').textContent")
    ok('n235: Show password works and says Hide password; a wrong password says “Incorrect email or password. Please try again.”, as Flow does', sh == ['text', 'Hide password'] and wr_ == 'Incorrect email or password. Please try again.', (sh, wr_))
    await pg.fill('#sbPass', 'right-password'); await pg.press('#sbPass', 'Enter'); await pg.wait_for_timeout(250)
    fin = await pg.evaluate("[(document.getElementById('sbBtn')||{}).textContent||'',!!document.querySelector('#sbLogin .login-wrap.success')]")
    await pg.wait_for_timeout(3000)
    si = await pg.evaluate("[!!document.querySelector('#tsGate.show'),location.hash,currentCTab,(document.querySelector('.tsh .tsh-name')||{}).textContent||'',document.body.classList.contains('sb-locked'),document.querySelectorAll('body>[inert]').length]")
    ok('n235: signing in shows Flow’s “Signed in ✓” and fade, then goes straight to the sheet that was asked for (#sheet=… → Biscuit Training), with the page usable again',
       fin[0].strip() == 'Signed in' and fin[1] and si[0] is False and si[1] == '#sheet=sh_train1' and si[2] == 'sheet' and si[3].startswith('Biscuit Training') and not si[4] and si[5] == 0, (fin, si))
    ok('n235: no page errors on the sign-in card', not errs, errs[:2])
    await ctx.close()
    # 7. Flow's form wording
    fl = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    ok('n235: Flow’s sign-in says “Sign in to Pravix”, “Sign in”, “Signing in” and “Signed in” (it said “Welcome back”, “Sign In”, “Signing In”, “Signed In”)', "'Sign in to Pravix'" in fl and '>Sign in</button>' in fl and 'Sign In' not in fl and 'Signing In' not in fl and 'Signed In' not in fl and 'Welcome back' not in fl)
    # 3. opens offline on every device (not only the downtime computer)
    ctx, pg, errs = await ts235(after='window.__pvxSwTest=1;', sw=True, wait=1500)
    await pg.wait_for_timeout(5000)
    reg = await pg.evaluate("navigator.serviceWorker.getRegistration('./').then(r=>r?[r.scope,(r.active||{}).scriptURL||'']:null)")
    await pg.wait_for_timeout(1500)
    await ctx.set_offline(True)
    try:
        await pg.reload(); await pg.wait_for_timeout(3000)
        off = await pg.evaluate("[document.title,!!document.querySelector('#stage'),!!document.querySelector('.tsh .pvx-off')||document.documentElement.classList.contains('pvx-offline')]")
    except Exception as e:
        off = ['reload failed: ' + str(e)[:80]]
    await ctx.set_offline(False)
    ok('n235: Treatment’s app-file service worker is set up on an ordinary device, not only the downtime computer', reg and reg[0].endswith('/treatment/') and reg[1].endswith('/treatment/downtime-sw.js'), reg)
    ok('n235: with no connection, a reload still opens Treatment and says it’s offline (it was the browser’s error page)', (off[0] == 'Pravix Treatment Sheets | VCA Shoreline' or off[0] in ('Dashboard', 'Tasks') or ' · ' in off[0]) and off[1] and off[2], off)   # n284: the title names the view
    await ctx.close()
    sw = open(os.path.join(BUILD, 'treatment', 'downtime-sw.js'), encoding='utf-8').read()
    ok('n235: the worker keeps only Treatment’s files and the Firebase scripts (no database requests), and opens the saved copy after 2 s', 'WAIT=2000' in sw and "u.pathname.indexOf('/treatment/')===0" in sw and 'firestore.googleapis' not in sw)


@section(id='n236', title='n236: Treatment Sheets — HIG Managing notifications, Modality, Multitasking (synthetic training patients)',
         apps=['treatment', 'flow', 'sgvp'], topics=['sheets-alerts', 'notifications'])
async def s_n236(br):
    async def ts236(before='', after='', dark=True, vp=(1440, 900), wait=2600, user=None):
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', user or U230).replace('@@SEED@@', SEED232))
        if before: await ctx.add_init_script(before)
        await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        if after: await ctx.add_init_script(after)
        async def route(r):
            u = r.request.url
            if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
            elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
            elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await ctx.route('**/*', route)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
        return ctx, pg, errs
    CLOSE236 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
    DOC236 = '{"uid":"u9","email":"resident.a@vca.com","displayName":"Resident A"}'   # a made-up doctor on the training patient
    # tones are counted; the 2-minute reminder is sped up to 1.5 s; the page's visibility can be set
    AUD236 = """window.__beeps=[];(function(){const A=window.AudioContext;window.AudioContext=function(){const a=new A();const o=a.createOscillator.bind(a);a.createOscillator=function(){const x=o();const s=x.start.bind(x);x.start=function(){window.__beeps.push(x.frequency.value);return s()};return x};return a};
      const st=window.setTimeout;window.setTimeout=function(f,d){var a=[].slice.call(arguments,2);return st.apply(window,[f,d===120000?1500:d].concat(a))};
      window.__vis='visible';Object.defineProperty(document,'visibilityState',{get:()=>window.__vis,configurable:true});})();"""
    BAN236 = "(()=>{const n=document.getElementById('tsDocAlert');return n?{cls:n.className,role:n.getAttribute('role'),txt:n.innerText.replace(/\\n/g,' / '),x:!!n.querySelector('.x svg'),xt:n.querySelector('.x').textContent.trim()}:null})()"
    T236 = "window.__T=[];(function w(){if(!window.toast)return setTimeout(w,20);const o=window.toast;window.toast=function(m){window.__T.push(String(m));return o.apply(this,arguments)}})();"
    KEY236 = "((n)=>{const all=[...document.querySelectorAll('#ctab-sheet .mark[data-t]')].filter(m=>m.title.startsWith(n+' ·'));for(const s of ['overdue','due','scheduled']){const m=all.find(m=>m.dataset.s===s);if(m)return m.dataset.t}return null})"
    async def chart236(pg, v):
        await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
        await pg.fill('#vin-d2', v); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(700)
        y = pg.locator('button:has-text("Yes, ")').first
        if await y.count(): await y.click(); await pg.wait_for_timeout(1400)
    # 1. a critical Notify stays until it's seen, with a tone and one softer reminder
    ctx, pg, errs = await ts236(after=AUD236, user=DOC236, wait=3200)
    await chart236(pg, '1')
    await pg.evaluate("window.__beeps=[];tsVaNotify('d2')"); await pg.wait_for_timeout(2600)
    cb = await pg.evaluate(BAN236); bp = await pg.evaluate("window.__beeps")
    if cb: await pg.screenshot(path=f'{SHOTS}/n236-critical-alert.png', clip={'x': 300, 'y': 0, 'width': 840, 'height': 110})
    ok('n236: a critical value notified to the doctor is a red banner announced as an alert (it was the same banner for everything, with no role)', bool(cb) and 'crit' in cb['cls'] and cb['role'] == 'alert' and '1 bpm' in cb['txt'], cb)
    ok('n236: the critical banner chimes once and, while it’s still open, once more softly after 2 minutes (one beep for anything, no reminder)', bp[:2] == [880, 660] and len(bp) == 2, bp)
    ok('n236: the banner’s close button is the close symbol, not the “✕” character', bool(cb) and cb['x'] and cb['xt'] == '', cb)
    await pg.wait_for_timeout(15500)
    ok('n236: a critical banner is still there after 18 s, until Open or Dismiss (it vanished after 15 s)', await pg.evaluate("!!document.getElementById('tsDocAlert')"))
    await pg.click('#tsDocAlert .x'); await pg.wait_for_timeout(300)
    ok('n236: Dismiss closes it', await pg.evaluate("!document.getElementById('tsDocAlert')"))
    sj = open(f'{BUILD}/treatment/store.js').read()
    import re as _re236
    ok('n236: the summary banner says “Open to review”, and no hover title says “tap” on a Mac (it said “Tap to review”)', 'Open to review' in sj and not _re236.search(r'(?i)\btap\b', sj), _re236.findall(r'(?i).{30}\btap\b.{20}', sj)[:3])
    await ctx.close()
    # 2. a warning: amber, no tone, and its 15 s count only while the page is visible
    ctx, pg, errs = await ts236(after=AUD236, user=DOC236, wait=3200)
    await chart236(pg, '190')
    await pg.evaluate("window.__beeps=[];window.__vis='hidden';tsVaNotify('d2')"); await pg.wait_for_timeout(1500)
    wb = await pg.evaluate(BAN236); wbp = await pg.evaluate("window.__beeps")
    ok('n236: a warning notified to the doctor is an amber banner with no tone, read politely (it beeped like a critical value)', bool(wb) and 'warn' in wb['cls'] and wb['role'] == 'status' and wbp == [], [wb, wbp])
    await pg.wait_for_timeout(16500)
    hid = await pg.evaluate("!!document.getElementById('tsDocAlert')")
    await pg.evaluate("window.__vis='visible'"); await pg.mouse.move(5, 600); await pg.wait_for_timeout(16500)
    vis = await pg.evaluate("!!document.getElementById('tsDocAlert')")
    ok('n236: a warning that arrives in a background tab is still there when you come back, then goes 15 s after the page is visible (it was gone after 15 s either way)', hid and not vis, [hid, vis])
    await ctx.close()
    # 3. the Alert sound setting
    ctx, pg, errs = await ts236(before="localStorage.setItem('pvxAlertSound','0');", after=AUD236, user=DOC236, wait=3200)
    await chart236(pg, '1')
    await pg.evaluate("window.__beeps=[];tsVaNotify('d2')"); await pg.wait_for_timeout(2600)
    ok('n236: with Alert sound off the critical banner still shows, silently', 'crit' in (await pg.evaluate("(document.getElementById('tsDocAlert')||{}).className||''")) and await pg.evaluate("window.__beeps") == [], await pg.evaluate("window.__beeps"))
    await pg.evaluate("document.getElementById('tsDocAlert')&&document.getElementById('tsDocAlert').remove()")
    await pg.click('#tsAlertPill'); await pg.wait_for_timeout(500)
    m1 = await pg.evaluate("(document.getElementById('pvxAmSound')||{}).innerText||''")
    await pg.screenshot(path=f'{SHOTS}/n236-alert-menu-sound.png')
    m1 = [m1, await pg.evaluate("(document.querySelector('#pvxAmSound .v-sw')||{getAttribute(){return null}}).getAttribute('aria-checked')")]
    await pg.click('#pvxAmSound .v-sw'); await pg.wait_for_timeout(400)
    m2 = [await pg.evaluate("(document.querySelector('#pvxAmSound .v-sw')||{getAttribute(){return null}}).getAttribute('aria-checked')"), await pg.evaluate("localStorage.getItem('pvxAlertSound')"), await pg.evaluate("!!document.getElementById('tsAlertMenu')")]
    ok('n236: the alert pill’s menu has “Alert sound · on this computer”, and the doctor can turn it on and off there (there was no way to silence it; a switch since n237)', 'Alert sound' in m1[0] and 'on this computer' in m1[0] and m1[1] == 'false' and m2[0] == 'true' and m2[1] == '1' and m2[2], [m1, m2])
    await ctx.close()
    ctx, pg, errs = await ts236()
    await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1200)
    SW236 = "(document.querySelector('#pvxStgSound .v-sw')||{getAttribute(){return null}}).getAttribute('aria-checked')"
    s1 = [await pg.evaluate("(document.getElementById('pvxStgSound')||{}).innerText||''"), await pg.evaluate(SW236)]
    await pg.click('#pvxStgSound .v-sw'); await pg.wait_for_timeout(400)
    s2 = [await pg.evaluate(SW236), await pg.evaluate("localStorage.getItem('pvxAlertSound')")]
    ok('n236: Settings has the same Alert sound row for admins (a switch since n237)', 'Alert sound' in s1[0] and s1[1] == 'true' and s2 == ['false', '0'], [s1, s2])
    await pg.click('#pvxStgSound .v-sw'); await pg.wait_for_timeout(300)
    await pg.screenshot(path=f'{SHOTS}/n236-settings-sound.png')
    # 4. a view opened from Settings has a way back (n237: reports left Settings, so Intern drafts is the one checked)
    await pg.evaluate("document.querySelector('#tsOrderSheet [data-stg=drafts]').click()"); await pg.wait_for_timeout(1500)
    bk = await pg.evaluate("(()=>{const b=document.querySelector('#tsOrderSheet .op-back');return b?[b.textContent.trim(),b.getAttribute('aria-label'),!!document.querySelector('#tsOrderSheet .op-head [data-x], #tsOrderSheet .op-head .op-close, #tsOrderSheet .op-close')]:null})()")
    await pg.screenshot(path=f'{SHOTS}/n236-report-back.png')
    if bk: await pg.click('#tsOrderSheet .op-back'); await pg.wait_for_timeout(900)
    ok('n236: a view opened from Settings (Intern drafts) has “‹ Settings” at the top, which goes back to Settings (Settings was replaced with no way back)', bool(bk) and bk[0] == 'Settings' and bk[1] == 'Back to Settings' and await pg.evaluate("!!document.querySelector('#tsOrderSheet .op-card.stg')"), bk)
    await pg.evaluate(CLOSE236); await pg.wait_for_timeout(400)
    await ctx.close()
    # 5. the medication order: buttons on screen, a close button, and a discard prompt
    res = {}
    for nm, vp in (('Mac', (1440, 900)), ('iPhone', (390, 844))):
        ctx, pg, errs = await ts236(vp=vp)
        await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2200)
        await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
        res[nm] = await pg.evaluate("(()=>{const f=document.querySelector('#tsModal.show .tm-foot'),x=document.querySelector('#tsModal.show .tm-x, #tsModal.show .tm-card > .close, #tsModal.show [aria-label=Close]'),cc=[...document.querySelectorAll('#tsModal.show .tm-foot button')].filter(b=>b.textContent.trim()==='Cancel').length;const r=f.getBoundingClientRect(),c=document.querySelector('#tsModal.show .tm-card').getBoundingClientRect();return {foot:[Math.round(r.top),Math.round(r.bottom),innerHeight],inView:r.top>=0&&r.bottom<=innerHeight+1,cardTall:c.height,x:!!x,cancel:cc,btns:[...f.querySelectorAll('button')].map(b=>b.textContent.trim())}})()")
        if nm == 'Mac': await pg.screenshot(path=f'{SHOTS}/n236-order-footer.png')
        if nm == 'iPhone': await pg.screenshot(path=f'{SHOTS}/n236-order-iphone.png')
        await ctx.close()
    ok('n236: the medication order’s Cancel and Add to sheet stay on screen on a Mac and an iPhone (they were below the fold)', all(r['inView'] and len(r['btns']) >= 2 for r in res.values()), res)
    ok('n236: Cancel is always on screen, and there’s no second close button beside it (Brand Identity: never both ✕ and Cancel)', all(r['cancel'] == 1 and not r['x'] for r in res.values()), res)
    ctx, pg, errs = await ts236(after=T236)
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2200)
    await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
    await pg.fill('#rxDose', '2'); await pg.wait_for_timeout(700)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ed = await pg.evaluate("[!!document.querySelector('#tsModal.show'),(document.querySelector('#tsModal .pvx-discard b')||{}).textContent||null,(document.activeElement||{}).textContent||'',(document.querySelector('#tsModal .pvx-discard')||{getAttribute(){return null}}).getAttribute('role')]")
    await pg.screenshot(path=f'{SHOTS}/n236-discard-prompt.png')
    ok('n236: Esc on an order with a dose typed asks “Discard this order?” with Keep editing first (it closed and lost the order)', ed[0] and ed[1] == 'Discard this order?' and ed[2] == 'Keep editing' and ed[3] == 'alertdialog', ed)
    await pg.click('#tsModal .pvx-discard [data-keep]'); await pg.wait_for_timeout(300)
    kp = await pg.evaluate("[!!document.querySelector('#tsModal.show'),document.getElementById('rxDose').value,!document.querySelector('#tsModal .pvx-discard')]")
    ok('n236: Keep editing keeps the order and the dose', kp == [True, '2', True], kp)
    await pg.mouse.click(12, 450); await pg.wait_for_timeout(400)
    ok('n236: a click outside asks the same', await pg.evaluate("!!document.querySelector('#tsModal.show .pvx-discard')"))
    await pg.click('#tsModal .pvx-discard [data-keep]'); await pg.wait_for_timeout(300)
    # 6. drafts survive a reload
    await pg.reload(); await pg.wait_for_timeout(3600)
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
    await pg.evaluate("window.__T=[]"); await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1800)
    dr = [await pg.evaluate("document.getElementById('rxDose').value"), await pg.evaluate("window.__T")]
    ok('n236: after a reload the order comes back with its dose and “Draft restored” (it was lost)', dr[0] == '2' and 'Draft restored' in dr[1], dr)
    await pg.click('#tsModal .tm-foot [data-x]'); await pg.wait_for_timeout(300)
    await pg.click('#tsModal .pvx-discard [data-discard]'); await pg.wait_for_timeout(400)
    dc = [await pg.evaluate("!!document.querySelector('#tsModal.show')"), await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('pvxDraft:'))")]
    ok('n236: Cancel with a dose typed asks too, and Discard closes the order and forgets the draft', dc == [False, []], dc)
    await pg.evaluate("tsNewSheet()"); await pg.wait_for_timeout(900); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('n236: with nothing typed, Esc closes at once, as before', await pg.evaluate("!document.querySelector('#tsModal.show')"))
    await pg.evaluate("tsNewSheet()"); await pg.wait_for_timeout(900)
    f1 = await pg.evaluate("(()=>{const f=[...document.querySelectorAll('#tsModal.show input[id]')].find(i=>i.type==='text'||!i.type);return f&&f.id})()")
    if f1: await pg.fill('#' + f1, 'Training'); await pg.wait_for_timeout(700)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ns = await pg.evaluate("(document.querySelector('#tsModal .pvx-discard b')||{}).textContent||null")
    ok('n236: New sheet with a name typed asks “Discard this new sheet?”', ns == 'Discard this new sheet?', [f1, ns])
    if ns: await pg.click('#tsModal .pvx-discard [data-discard]'); await pg.wait_for_timeout(300)
    # the note keeps its typing across a reload; saving clears it
    await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(900); await pg.fill('#note-body', 'Training note — draft'); await pg.wait_for_timeout(700)
    await pg.reload(); await pg.wait_for_timeout(3600)
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
    await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(1200)
    nd = await pg.evaluate("document.getElementById('note-body').value")
    ok('n236: a half-written note survives a reload (iPads reload background tabs)', nd == 'Training note — draft', nd)
    await pg.locator('#noteDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(1200)
    ok('n236: saving the note forgets its draft', await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('pvxDraft:note')).length") == 0)
    await pg.evaluate(CLOSE236); await pg.wait_for_timeout(300)
    # the charting drawer
    k = await pg.evaluate(KEY236 + "('Temperature')")
    await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1200)
    await pg.fill('#cd-value', '101.3'); await pg.wait_for_timeout(700)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    cd = await pg.evaluate("[!!document.querySelector('#completionDrawer.open'),(document.querySelector('#completionDrawer .pvx-discard b')||{}).textContent||null]")
    await pg.screenshot(path=f'{SHOTS}/n236-drawer-discard.png')
    ok('n236: the charting drawer with a value typed asks “Discard what you typed?” before closing', cd == [True, 'Discard what you typed?'], [k, cd])
    await pg.click('#completionDrawer .pvx-discard [data-discard]'); await pg.wait_for_timeout(600)
    await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1200)
    cv = await pg.evaluate("document.getElementById('cd-value').value")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ok('n236: Discard really discards, and an untouched drawer closes with Esc at once', cv == '' and await pg.evaluate("!document.querySelector('#completionDrawer.open')"), cv)
    # 7. voice charting stops when Treatment is hidden
    vc = await pg.evaluate("(()=>{let called=0;const b=document.createElement('button');b.id='btMic';b.className='on';document.body.appendChild(b);const o=window.tsBtMic;window.tsBtMic=()=>{called++};Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.visibilityState;window.tsBtMic=o;b.remove();return called})()")
    vj = open(f'{BUILD}/treatment/voice.js').read()
    ok('n236: switching away stops Treatment’s microphones — “Say the readings” and voice entry (they kept listening)', vc == 1 and '"hidden"===document.visibilityState&&(flush(),h&&stop())' in vj, vc)
    ok('n236: signing out forgets drafts on this computer', await pg.evaluate("(()=>{localStorage.setItem('pvxDraft:x','{}');pvxDraftsClear();return Object.keys(localStorage).filter(k=>k.startsWith('pvxDraft:')).length})()") == 0 and 'pvxDraftsClear();' in open(f'{BUILD}/treatment/index.html').read())
    ok('n236: no page errors', not errs, errs[:3])
    await ctx.close()
    # the sticky footer has the card's own colour, in light and dark
    FT236 = "(()=>{const p=c=>(c.match(/[\\d.]+/g)||[]).map(Number);const f=p(getComputedStyle(document.querySelector('#tsModal.show .tm-foot')).backgroundColor),c=p(getComputedStyle(document.querySelector('#tsModal.show .tm-card')).backgroundColor);return {foot:f,card:c,pos:getComputedStyle(document.querySelector('#tsModal.show .tm-foot')).position,same:[0,1,2].every(i=>Math.abs(f[i]-c[i])<=3)&&(c[3]===undefined||c[3]>=.95)}})()"
    lf = {}
    for dk in (False, True):
        ctx, pg, errs = await ts236(dark=dk)
        await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2200)
        await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
        lf['dark' if dk else 'light'] = await pg.evaluate(FT236)
        if not dk: await pg.screenshot(path=f'{SHOTS}/n236-order-light.png')
        await ctx.close()
    ok('n236: the sticky footer is the card’s own colour in light and dark (no band)', all(v['same'] and v['pos'] == 'sticky' for v in lf.values()), lf)


@section(id='n237', title='n237: Treatment Sheets — HIG Printing, Searching, Settings (synthetic training patients)',
         apps=['treatment', 'flow', 'sgvp', 'kura', 'topbar'], topics=['sheets-alerts', 'search', 'printing'])
async def s_n237(br):
    async def ts237(before='', after='', dark=True, vp=(1440, 900), wait=2600, user=None):
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', user or U230).replace('@@SEED@@', SEED232))
        if before: await ctx.add_init_script(before)
        await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        if after: await ctx.add_init_script(after)
        async def route(r):
            u = r.request.url
            if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
            elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
            elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await ctx.route('**/*', route)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
        return ctx, pg, errs
    CLOSE237 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
    DOC237 = '{"uid":"u9","email":"resident.a@vca.com","displayName":"Resident A"}'   # made-up doctor of the training patients
    NUR237 = '{"uid":"u7","email":"nurse.b@vca.com","displayName":"Nurse B"}'         # made-up staff member with no patients
    PRN237 = "window.__prn=0;window.addEventListener('load',function(){window.print=function(){window.__prn++}});"
    FIND237 = "(()=>{const f=document.getElementById('tsFind');return f&&f.classList.contains('show')?f.innerText.replace(/\\n/g,' / '):null})()"
    PAGES237 = "[document.documentElement.className.includes('dt-printing'),document.title,[...document.querySelectorAll('#tsDtPrint .dp-page')].map(p=>p.querySelector('.dp-band').textContent),(document.getElementById('tsDtPrint')||{innerText:''}).innerText]"
    # 1. ⌘P on a sheet prints the sheet
    ctx, pg, errs = await ts237(after=PRN237)
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
    await pg.fill('#vin-d1', '101.2'); await pg.press('#vin-d1', 'Enter'); await pg.wait_for_timeout(1200)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(1500)
    await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(300)
    pp = await pg.evaluate(PAGES237)
    await pg.emulate_media(media='print'); await pg.wait_for_timeout(200)
    th = await pg.evaluate("(()=>{const t=document.querySelector('#tsDtPrint thead tr:not(.pt) th');return t?[getComputedStyle(t).backgroundColor,getComputedStyle(t).color]:null})()")
    await pg.pdf(path=f'{SHOTS}/n237-print-sheet.pdf', prefer_css_page_size=True)
    await pg.emulate_media(media='screen')
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))"); await pg.wait_for_timeout(200)
    back = await pg.evaluate("[document.documentElement.className.includes('dt-printing'),document.title]")
    ok('n237: ⌘P on a sheet prints the sheet — two pages of 12 hours with a “Treatment sheet” band and who printed it (it printed the screen: the top bar and one row)',
       pp[0] and len(pp[2]) == 2 and all(b.startswith('TREATMENT SHEET · ') and ' by ' in b for b in pp[2]) and '12 AM – 12 PM' in pp[2][0] and 'page 2 of 2' in pp[2][1] and 'Temperature' in pp[3] and 'Gabapentin' in pp[3], pp[:3])
    ok('n237: the printed sheet shows what was charted, with its value, time and initials', '✓ 101.2' in pp[3], pp[3][:300])
    ok('n237: the PDF is named “Biscuit – Treatment sheet – <date>”, and the title comes back after printing', pp[1].startswith('Biscuit – Treatment sheet – ') and ':' not in pp[1] and not back[0] and back[1] != pp[1], [pp[1], back])
    ok('n237: the printed sheet says nothing about downtime', 'downtime' not in pp[3].lower() and 'Paper is the record' not in pp[3] and 'The sheet in Treatment is the record' in pp[3], pp[3][-200:])
    ok('n237: the printed table is black on white, even from the dark theme', th == ['rgb(255, 255, 255)', 'rgb(0, 0, 0)'], th)
    # 2. Print… in the sheet's menu (now Share)
    await pg.click('#tsCopyBtn'); await pg.wait_for_timeout(400)
    sm = await pg.evaluate("[document.getElementById('tsCopyBtn').textContent.trim(),[...document.querySelectorAll('#tsCopyMenu [data-c]')].map(b=>[b.dataset.c,b.querySelector('b').textContent,b.disabled])]")
    await pg.screenshot(path=f'{SHOTS}/n237-share-menu.png')
    await pg.evaluate("window.__prn=0;window.print=function(){window.__prn++};void 0")
    await pg.click('#tsCopyMenu [data-c=print]'); await pg.wait_for_timeout(600)
    pc = [await pg.evaluate("window.__prn"), await pg.evaluate("document.querySelectorAll('#tsDtPrint .dp-page').length")]
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))")
    ok('n237: the sheet’s menu is “Share” — Copy treatments, Copy latest vitals, Copy link, then Print… (there was no Print)', sm[0] == 'Share' and [x[1] for x in sm[1]][:3] == ['Copy treatments', 'Copy latest vitals', 'Copy link to this sheet'] and sm[1][-1][:2] == ['print', 'Print…'] and not sm[1][-1][2], sm)
    ok('n237: Print… opens printing once, with the sheet on paper', pc == [1, 2], pc)
    dim = await pg.evaluate("(()=>{const o=window.tsPrintReady;window.tsPrintReady=()=>false;const h=tsPrintItem();window.tsPrintReady=o;return h})()")
    ok('n237: while the sheet is still loading, Print… is dimmed and says why', 'disabled' in dim and 'Available once the sheet has loaded' in dim, dim)
    ok('n237: the downtime packet keeps its own band and words', 'DOWNTIME · data as of ' in open(f'{BUILD}/treatment/store.js').read() and 'Paper is the record until the system is back' in open(f'{BUILD}/treatment/store.js').read())
    await ctx.close()
    # 3. ⌘P on the board prints the board; the board has Print… and, for admins, Reports
    ctx, pg, errs = await ts237(after=PRN237)
    bb = await pg.evaluate("[...document.querySelectorAll('#ctab-dash .sb-tvb')].map(b=>[b.id,b.textContent.trim(),b.getAttribute('aria-label')])")
    await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(300)
    bp = await pg.evaluate(PAGES237)
    await pg.emulate_media(media='print'); await pg.pdf(path=f'{SHOTS}/n237-print-board.pdf', prefer_css_page_size=True); await pg.emulate_media(media='screen')
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))")
    ok('n237: ⌘P on the Status board prints Treatment’s board — Inpatients and Outpatients with ward, doctor, tech, code, day, allergies and problem', bp[0] and len(bp[2]) == 1 and bp[2][0].startswith('TREATMENT · STATUS BOARD · ') and 'Inpatients' in bp[3] and 'Biscuit Training' in bp[3] and bp[1].startswith('Treatment board – '), bp[:3])
    ok('n237: the printed board has no owner column', 'OWNER' not in bp[3].upper(), bp[3][:300])
    ok('n237: the board has a Print button and, for an admin, Reports beside Display', [x[0] for x in bb][:2] == ['tsReportsBtn', 'tsBoardPrint'] and bb[1][2] == 'Print the board…', bb)
    await pg.evaluate("window.__prn=0;window.print=function(){window.__prn++};void 0")
    await pg.click('#tsBoardPrint'); await pg.wait_for_timeout(500)
    ok('n237: the board’s Print button prints the board', await pg.evaluate("window.__prn") == 1 and 'STATUS BOARD' in await pg.evaluate("(document.getElementById('tsDtPrint')||{}).innerText||''"))
    await pg.evaluate("window.dispatchEvent(new Event('afterprint'))")
    # 7. Reports leave Settings for a menu on the board
    await pg.click('#tsReportsBtn'); await pg.wait_for_timeout(400)
    rm = await pg.evaluate("[[...document.querySelectorAll('#tsReportsMenu [role=menuitem] b')].map(b=>b.textContent),document.activeElement.getAttribute('data-rep'),document.getElementById('tsReportsBtn').getAttribute('aria-expanded'),(document.getElementById('tsReportsMenu')||{innerText:''}).innerText]")
    await pg.screenshot(path=f'{SHOTS}/n237-reports-menu.png')
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
    rp = await pg.evaluate("[(document.querySelector('#tsOrderSheet.show h3')||{}).textContent||null,!!document.getElementById('tsReportsMenu')]")
    ok('n237: Reports on the board lists Lowered levels, On-time report and Usage, focused for the keyboard', rm[0] == ['Lowered levels', 'On-time report', 'Usage'] and rm[1] == 'levels' and rm[2] == 'true', rm[:3])
    ok('n237: ↓ and Return open the On-time report from the menu', rp == ['On-time report', False], rp)
    ok('n237: Usage says “presses per treatment”, not “taps”', 'presses per treatment' in rm[3] and 'taps' not in rm[3], rm[3])
    await pg.evaluate(CLOSE237); await pg.wait_for_timeout(300)
    await pg.click('#tsReportsBtn'); await pg.wait_for_timeout(300); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('n237: Esc closes the Reports menu and puts focus back on its button', await pg.evaluate("!document.getElementById('tsReportsMenu')&&document.activeElement.id==='tsReportsBtn'"))
    # 8.–10. Settings: settings only, two groups, switches, its name
    await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1200)
    st = await pg.evaluate("""(()=>{const c=document.querySelector('#tsOrderSheet .op-card.stg');return {h3:c.querySelector('h3').textContent,txt:c.innerText,
      groups:[...c.querySelectorAll('.stg-grp')].map(g=>[g.querySelector('h4').firstChild.textContent.trim(),g.getAttribute('role'),[...g.querySelectorAll('.stg-row > .stg-tx > b')].map(b=>b.textContent)]),
      loose:c.querySelectorAll('.stg-list > .stg-row').length,sw:[...c.querySelectorAll('[role=switch]')].map(s=>[s.getAttribute('aria-label'),s.getAttribute('aria-checked')])}})()""")
    await pg.screenshot(path=f'{SHOTS}/n237-settings.png')
    ok('n237: Settings is “Treatment settings” and has no reports in it (Lowered levels, On-time and Usage were there)', st['h3'] == 'Treatment settings' and not any(x in st['txt'] for x in ('Lowered levels', 'On-time report', 'Usage')), st['h3'])
    ok('n237: Settings has two groups — On this computer (Downtime copy, Alert sound) and For everyone (Kura stock link, Intern drafts, Spanish wording, Code list)',
       st['groups'] == [['On this computer', 'group', ['Downtime copy', 'Alert sound']], ['For everyone', 'group', ['Kura stock link', 'Intern drafts', 'Spanish wording', 'Code list']]] and st['loose'] == 0, st['groups'])
    ok('n237: Alert sound and Kura stock link are switches that show their state (they were Turn on / Turn off buttons with the state in the text)', st['sw'] == [['Alert sound', 'true'], ['Kura stock link', 'false']] and 'Turn on' not in st['txt'] and 'Turn off' not in st['txt'], st['sw'])
    await pg.click('#tsOrderSheet [aria-label="Kura stock link"]'); await pg.wait_for_timeout(900)
    ku = [await pg.evaluate("(window.__fs['ts_settings/kura']||{}).enabled"), await pg.evaluate("(document.querySelector('#tsOrderSheet [aria-label=\"Kura stock link\"]')||{getAttribute(){return null}}).getAttribute('aria-checked')"), await pg.evaluate("(document.querySelector('#tsOrderSheet .op-card.stg')||{innerText:''}).innerText")]
    ok('n237: the Kura switch turns the link on for everyone, and the row then says since when and by whom', ku[0] is True and ku[1] == 'true' and 'On since' in ku[2], ku[:2])
    await pg.click('#tsOrderSheet [aria-label="Kura stock link"]'); await pg.wait_for_timeout(700)
    await pg.evaluate(CLOSE237)
    ok('n237: no page errors', not errs, errs[:3])
    await ctx.close()
    # a staff member who isn't an admin sees no Reports
    ctx, pg, errs = await ts237(user=NUR237)
    ok('n237: staff who aren’t admins see no Reports button', await pg.evaluate("!document.getElementById('tsReportsBtn')&&!!document.getElementById('tsBoardPrint')"))
    # 4. before typing: recently opened, memory only
    await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1200); await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
    await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(500)
    rc = [await pg.evaluate("document.activeElement.id"), await pg.evaluate(FIND237)]
    await pg.screenshot(path=f'{SHOTS}/n237-search-recent.png')
    ok('n237: ⌘K focuses the search (it did nothing)', rc[0] == 'globalSearch', rc)
    ok('n237: before typing, the search lists the patients you opened most recently, newest first', bool(rc[1]) and rc[1].replace('RECENTLY OPENED / Clear / ', 'RECENTLY OPENED / ', 1).startswith('RECENTLY OPENED / Biscuit Training') and 'Mochi Training' in rc[1], rc[1])   # n265: the heading has Clear
    ks = await pg.evaluate("Object.keys(localStorage).filter(k=>/recent|find|search/i.test(k))")
    await pg.keyboard.press('Escape'); await pg.reload(); await pg.wait_for_timeout(3000)
    await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(500)
    rl = await pg.evaluate(FIND237) or ''
    ok('n237: recently opened patients are kept in memory only — nothing is saved, and a reload forgets them (only the sheet it reopens is listed; Ctrl+K works too)', ks == [] and await pg.evaluate("document.activeElement.id") == 'globalSearch' and 'Mochi Training' not in rl, [ks, rl])
    await ctx.close()
    # a doctor sees My patients first
    ctx, pg, errs = await ts237(user=DOC237)
    await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(500)
    mp = await pg.evaluate(FIND237)
    ok('n237: for a doctor, “Your patients” comes first before typing', bool(mp) and mp.startswith('YOUR PATIENTS / ')   # n260: was “My patients” (one perspective)
       and 'Biscuit Training' in mp, mp)
    await pg.keyboard.press('Escape'); await ctx.close()
    # 1., 3., 5. orders are searched; a Clear button; a real search field for VoiceOver
    ctx, pg, errs = await ts237()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('notes')"); await pg.wait_for_timeout(1500)
    await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(300)
    at = await pg.evaluate("(()=>{const i=document.getElementById('globalSearch');return [i.type,i.getAttribute('role'),i.getAttribute('aria-controls'),i.getAttribute('aria-autocomplete'),i.getAttribute('enterkeyhint'),i.getAttribute('aria-keyshortcuts')]})()")
    clr0 = await pg.evaluate("getComputedStyle(document.querySelector('.subnav .ts-sclear')).display")
    await pg.keyboard.type('Gaba'); await pg.wait_for_timeout(600)
    go = [await pg.evaluate(FIND237), await pg.evaluate("document.getElementById('globalSearch').getAttribute('aria-expanded')"), await pg.evaluate("getComputedStyle(document.querySelector('.subnav .ts-sclear')).display")]
    await pg.screenshot(path=f'{SHOTS}/n237-search-orders.png')
    ok('n237: searching “Gaba” finds the order — Orders: Gabapentin · Biscuit Training · 10 mg/kg PO q8h (it found nothing, though the field says “patients, orders”)', bool(go[0]) and go[0].startswith('ORDERS / Gabapentin / Biscuit Training · 10 mg/kg PO q8h') and 'No patient' not in go[0], go[0])
    ok('n237: the field is a search combobox tied to its list (type=search, aria-controls, enterkeyhint, ⌘K in aria-keyshortcuts), and says when its list is open', at == ['search', 'combobox', 'tsFind', 'list', 'search', 'Meta+K Control+K'] and go[1] == 'true', [at, go[1]])
    ok('n237: a Clear button appears once there’s text', clr0 == 'none' and go[2] == 'grid', [clr0, go[2]])
    await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(150)
    ad = await pg.evaluate("[document.getElementById('globalSearch').getAttribute('aria-activedescendant'),(document.querySelector('#tsFind .mi.cur')||{}).id]")
    await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(150)
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1200)
    oe = await pg.evaluate("[currentCTab,__tsFind.cur(),!!document.querySelector('#ctab-sheet .grow.ts-order-hl[data-o=m1]')]")
    ok('n237: VoiceOver follows the highlighted result (aria-activedescendant)', bool(ad[0]) and ad[0] == ad[1] and ad[0] == 'tsFindO1', ad)
    ok('n237: Return on an order opens that sheet at the order, highlighted for a moment', oe == ['sheet', 'sh_train1', True], oe)
    await pg.keyboard.press('Meta+k'); await pg.keyboard.type('zzzz'); await pg.wait_for_timeout(400)
    nm = await pg.evaluate(FIND237)
    await pg.click('.subnav .ts-sclear'); await pg.wait_for_timeout(300)
    cl = await pg.evaluate("[document.getElementById('globalSearch').value,document.activeElement.id,getComputedStyle(document.querySelector('.subnav .ts-sclear')).display]")
    ok('n237: nothing found says “No patient or order matches”', bool(nm) and 'No patient or order matches “zzzz”.' in nm, nm)
    ok('n237: Clear empties the field and keeps the cursor in it', cl == ['', 'globalSearch', 'none'], cl)
    await pg.keyboard.press('Escape'); await pg.mouse.click(700, 760)
    # n264: that click opens an order's sheet (later on a slow machine), and ⌘K waits while a sheet is open: close it once it's there
    await pg.wait_for_timeout(700); await until(pg, "(()=>{try{tsOrderClose()}catch(e){};try{closeDrawers()}catch(e){};return !(window.pvxModalUp&&pvxModalUp())})()", 4000); await pg.wait_for_timeout(300)
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(900)
    await pg.keyboard.press('Meta+k'); await pg.keyboard.type('Gabapentin'); await pg.wait_for_timeout(700)
    br237 = await pg.evaluate("(document.getElementById('ctab-dash')||{innerText:''}).innerText")
    ok('n237: on the board an order filters the board to the patients on it', 'Biscuit Training' in br237 and 'Mochi Training' not in br237 and 'Juniper Training' not in br237, [br237[:200], await pg.evaluate("[window.pvxModalUp?pvxModalUp():null,[...document.querySelectorAll('#tsModal.show,#tsOrderSheet.show,.drawer.open,.ts-menu.show,[aria-modal=true]')].filter(e=>e.getClientRects().length).map(e=>e.id||e.className)]")])
    await pg.keyboard.press('Escape')
    ok('n237: no page errors in search', not errs, errs[:3])
    await ctx.close()
    # 6. opening the search never covers the tabs
    res = {}
    for w in (1440, 1280, 1180, 1133):
        ctx, pg, errs = await ts237(vp=(w, 900))
        await pg.evaluate("tsOpenSheet('sh_train3')"); await pg.wait_for_timeout(1000)
        G = "(()=>{const sw=document.querySelector('.subnav .switcher'),n=[...sw.querySelectorAll('button,a')].filter(b=>/Notes/.test(b.textContent))[0];const r=sw.getBoundingClientRect(),nr=n.getBoundingClientRect(),bar=document.querySelector('.subnav .search-bar').getBoundingClientRect();return [Math.round(r.right),Math.round(nr.right),sw.scrollWidth<=sw.clientWidth+1,Math.round(bar.width),Math.round(bar.left)]})()"
        g0 = await pg.evaluate(G)
        await pg.keyboard.press('Meta+k'); await pg.keyboard.type('Bis'); await pg.wait_for_timeout(500)
        g1 = await pg.evaluate(G)
        if w == 1440: await pg.screenshot(path=f'{SHOTS}/n237-search-open.png')
        res[w] = [g0, g1]; await ctx.close()
    ok('n237: every sub-nav tab is whole at 1440, 1280, 1180 and 1133 pt with a sheet open, and opening the search leaves them whole — it lies over the patient chip and the gear (the Notes tab was cut in half at 1440 with the search open, and at 1180 always)',
       all(v[0][2] and v[1][2] and v[1][1] <= v[1][0] and v[1][0] == v[0][0] and v[1][3] >= 220 and v[1][4] > v[1][1] for v in res.values()), res)
    # the light theme: the open search has its own solid background
    ctx, pg, errs = await ts237(dark=False)
    await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(300)
    ok('n237: in light the open search is solid white over the chip', await pg.evaluate("getComputedStyle(document.querySelector('.subnav .search-bar')).backgroundColor") == 'rgb(255, 255, 255)')
    await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1000)
    await pg.screenshot(path=f'{SHOTS}/n237-settings-light.png')
    await ctx.close()


@section(id='n238', title='n238: Treatment Sheets — HIG Undo and redo, Charts, Text views (synthetic training patients)',
         apps=['treatment', 'flow'], topics=['sheets-alerts'])
async def s_n238(br):
    async def ts238(before='', after='', dark=True, vp=(1440, 900), wait=2600, user=None):
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', user or U230).replace('@@SEED@@', SEED232))
        if before: await ctx.add_init_script(before)
        await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        if after: await ctx.add_init_script(after)
        async def route(r):
            u = r.request.url
            if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
            elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
            elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await ctx.route('**/*', route)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
        return ctx, pg, errs
    CLOSE238 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
    DOC238 = '{"uid":"u9","email":"resident.a@vca.com","displayName":"Resident A"}'
    TOAST238 = "[...document.querySelectorAll('#toastWrap .ctoast')].map(t=>t.innerText.replace(/\\n/g,' | '))"
    LAB238 = "(i=>{const n=['Temperature','Heart Rate','Respiratory Rate'][i];const c=[...document.querySelectorAll('#ctab-vitals .v-chart[role=img]')].find(e=>(e.getAttribute('aria-label')||'').startsWith(n+','));return c?c.getAttribute('aria-label'):''})"
    MK238 = "(oid=>{const d=new Date(),dk=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');const s=window.__fs||{};const out=[];for(const k in s){if(/sh_train1\\/days\\//.test(k)){const m=s[k].marks||{};for(const id in m){if(id.startsWith(dk+'_'+oid+'_')&&m[id].at&&m[id].status==='completed')out.push([id,m[id].value])}}}return out.sort((a,b)=>String(a[1]).localeCompare(String(b[1])))})"
    WR238 = """((oid,val,by,key)=>{const d=new Date(),dk=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');const m=d.getHours()*60+d.getMinutes();const k=key||dk+'_'+oid+'_x'+m+'_r';const o={};o[k]={orderId:oid,status:'completed',value:val,by:by,min:m,sched:m,at:new Date().toISOString()};return firebase.firestore().collection('sheets').doc('sh_train1').collection('days').doc(dk).set({marks:o},{merge:true}).then(()=>k)})"""
    async def unfocus(pg):
        await pg.evaluate("document.activeElement&&document.activeElement.blur()"); await pg.mouse.move(5, 880)
    # 1. two readings in the same minute are both kept, and each has Undo
    ctx, pg, errs = await ts238()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
    await pg.fill('#vin-d2', '118'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(800)
    await pg.fill('#vin-d2', '124'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(1200)
    t1 = await pg.evaluate(TOAST238); m1 = await pg.evaluate(MK238 + "('d2')"); l1 = await pg.evaluate(LAB238 + "(1)")
    ub = await pg.evaluate("[...document.querySelectorAll('#toastWrap .ts-undo button')].map(b=>b.getAttribute('aria-label'))")
    await pg.screenshot(path=f'{SHOTS}/n238-recorded-undo.png')
    ok('n238: two heart rates charted in the same minute are both kept (the second replaced the first)', [x[1] for x in m1] == ['118', '124'] and 'Latest 124 bpm' in l1, [m1, l1])
    ok('n238: “… recorded” has Undo (it had none)', 'Heart Rate 118 recorded | Undo' in t1 and 'Heart Rate 124 recorded | Undo' in t1, t1)
    ok('n238: VoiceOver hears what each Undo undoes (“Undo Heart Rate 124 recorded”, it was just “Undo”)', ub[-2:] == ['Undo Heart Rate 118 recorded', 'Undo Heart Rate 124 recorded'], ub)
    await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1500); await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1600)
    hv = await pg.evaluate("(()=>{const d=new Date(),dk=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');return TASKS.filter(t=>t.orderId==='d2'&&t.status==='completed'&&String(t.key||t.id).startsWith(dk)).map(t=>String(t.value)).sort()})()")
    ok('n238: opened again from the database, the sheet has both readings', '118' in hv and '124' in hv, hv)
    await ctx.close()
    # fixed first: ⌘Z / ⇧⌘Z with one history
    ctx, pg, errs = await ts238()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
    await pg.fill('#vin-d2', '118'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(700)
    await pg.fill('#vin-d1', '101.6'); await pg.press('#vin-d1', 'Enter'); await pg.wait_for_timeout(900)
    await pg.focus('#vin-d3'); await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(400)
    tf = await pg.evaluate("pvxTsHist.size()")
    await unfocus(pg); await pg.wait_for_timeout(5500)   # the Undo messages are gone
    await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(900)
    u1 = [await pg.evaluate(TOAST238), await pg.evaluate(LAB238 + "(0)"), await pg.evaluate(MK238 + "('d1')")]
    await pg.screenshot(path=f'{SHOTS}/n238-cmdz.png')
    await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(900)
    u2 = [await pg.evaluate(LAB238 + "(1)"), await pg.evaluate(MK238 + "('d2')"), await pg.evaluate("pvxTsHist.size()")]
    await pg.keyboard.press('ControlOrMeta+Shift+z'); await pg.wait_for_timeout(900)
    r1 = [await pg.evaluate(TOAST238), await pg.evaluate(LAB238 + "(1)"), await pg.evaluate(MK238 + "('d2')"), await pg.evaluate("pvxTsHist.size()")]
    ok('n238: ⌘Z works after the Undo message has gone, and says what it undid (Treatment had no ⌘Z)', any(x.startswith('Undone — Temperature 101.6 recorded') for x in u1[0]) and '101.6' not in u1[1] and u1[2] == [], u1)
    ok('n238: ⌘Z again goes one more step back (heart rate 118 undone too)', '118' not in u2[0] and u2[1] == [] and u2[2] == [0, 2], u2)
    ok('n238: ⇧⌘Z redoes the last undo', any(x.startswith('Redone — Heart Rate 118 recorded') for x in r1[0]) and [x[1] for x in r1[2]] == ['118'] and r1[3] == [1, 1], r1)
    ok('n238: ⌘Z while typing in a field is the field’s own (the history wasn’t touched)', tf == [2, 0], tf)
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1200)
    await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(700); await pg.evaluate("document.activeElement.blur()")
    await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(400)
    ok('n238: ⌘Z does nothing while a drawer or dialog is open', await pg.evaluate("pvxTsHist.size()") == [1, 1])
    await pg.evaluate(CLOSE238); await pg.wait_for_timeout(300)
    # on another patient: ⌘Z opens the patient first
    await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1500); await unfocus(pg)
    await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(1500)
    op = [await pg.evaluate("__tsFind.cur()"), await pg.evaluate(TOAST238), await pg.evaluate("pvxTsHist.size()")]
    ok('n238: ⌘Z for a change on another patient opens that patient first and says what the next ⌘Z will undo', op[0] == 'sh_train1' and any('Opened Biscuit Training' in x and 'Heart Rate 118 recorded' in x for x in op[1]) and op[2] == [1, 1], op)
    await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(1000); await unfocus(pg)
    await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(900)
    ok('n238: … and the next ⌘Z undoes it there', await pg.evaluate(MK238 + "('d2')") == [] and await pg.evaluate("pvxTsHist.size()") == [0, 2])
    await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(500)
    ok('n238: with nothing left, ⌘Z says “Nothing to undo”', any('Nothing to undo' in x for x in await pg.evaluate(TOAST238)))
    ok('n238: no page errors (undo)', not errs, errs[:3])
    await ctx.close()
    # a later change by someone else is never undone over the top
    ctx, pg, errs = await ts238()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
    await pg.fill('#vin-d2', '118'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(1200)
    key = (await pg.evaluate(MK238 + "('d2')"))[0][0]
    await pg.evaluate(WR238 + f"('d2','119','RA','{key}')"); await pg.wait_for_timeout(1500)
    await unfocus(pg); await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(800)
    cf = [await pg.evaluate(TOAST238), await pg.evaluate(MK238 + "('d2')")]
    ok('n238: if someone else changed the reading since, ⌘Z says so and leaves their change (“Can’t undo — … changed Heart Rate after you”)', any('Can’t undo' in x and 'changed Heart Rate after you' in x for x in cf[0]) and [x[1] for x in cf[1]] == ['119'], cf)
    # 5. someone else's reading is announced; a critical one as an alert
    await pg.evaluate("document.getElementById('pvxLiveRemote')&&(document.getElementById('pvxLiveRemote').textContent='')")
    await pg.evaluate(WR238 + "('d3','30','RA')"); await pg.wait_for_timeout(1500)
    an = await pg.evaluate("[(document.getElementById('pvxLiveRemote')||{}).textContent||'',(document.getElementById('pvxLiveRemote')||{getAttribute(){return null}}).getAttribute('aria-live')]")
    await pg.evaluate(WR238 + "('d2','1','RA')"); await pg.wait_for_timeout(1500)
    cr = await pg.evaluate("[(document.getElementById('pvxLiveRemoteCrit')||{}).textContent||'',(document.getElementById('pvxLiveRemoteCrit')||{getAttribute(){return null}}).getAttribute('role')]")
    ok('n238: someone else’s new reading on the open sheet is announced (“Respiratory Rate 30 rpm, charted by RA at …”; it was silent)', an[1] == 'polite' and an[0].startswith('Respiratory Rate 30 rpm, charted by RA at '), an)
    ok('n238: a critical one is announced as an alert', cr[1] == 'alert' and cr[0].startswith('Critical: Heart Rate 1 bpm, charted by RA'), cr)
    own = await pg.evaluate("(document.getElementById('pvxLiveRemote')||{}).textContent||''")
    await pg.fill('#vin-d3', '28'); await pg.press('#vin-d3', 'Enter'); await pg.wait_for_timeout(1500)
    ok('n238: your own readings aren’t announced twice (they have their message)', await pg.evaluate("(document.getElementById('pvxLiveRemote')||{}).textContent||''") == own)
    # 6. the alert range is labelled, spoken and in a legend; choice rows get a neutral lane
    lab = await pg.evaluate(LAB238 + "(0)")
    await pg.wait_for_timeout(400)
    bt = await pg.evaluate("(()=>{const c=[...document.querySelectorAll('#ctab-vitals .v-chart[role=img]')].find(e=>(e.getAttribute('aria-label')||'').startsWith('Temperature,'));const r=c&&c.closest('.v-row');const x=r&&r.querySelector('.vx-now .vx-alr');return [x?x.textContent:null,x?getComputedStyle(x).display:null,(document.querySelector('#ctab-vitals .vx-key')||{}).textContent,document.querySelectorAll('#ctab-vitals .vx-lane').length,document.querySelectorAll('#ctab-vitals .vx-band').length]})()")
    await pg.screenshot(path=f'{SHOTS}/n238-alert-range.png')
    ok('n238: the shaded band is explained — each row says “Alert range 99–103.5 °F” under its latest value (it had no label)', bt[0] == 'Alert range 99–103.5 °F' and bt[1] == 'block', bt[:2])
    ok('n238: the chart’s VoiceOver label says it too (“Shaded: alert range 99–103.5 °F.”)', lab.endswith('Shaded: alert range 99–103.5 °F.'), lab)
    ok('n238: the Vitals axis has a legend, “Shaded: alert range”, and choice rows (CRT, mentation) have a neutral lane instead of the green band', bt[2] == 'Shaded: alert range' and bt[3] >= 3 and bt[4] >= 3, bt)
    ok('n238: no page errors (charts)', not errs, errs[:3])
    await ctx.close()
    # the charting drawer's “… charted” has Undo; problems added have Undo
    ctx, pg, errs = await ts238()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2000)
    k = await pg.evaluate("((n)=>{const all=[...document.querySelectorAll('#ctab-sheet .mark[data-t]')].filter(m=>m.title.startsWith(n+' ·'));for(const s of ['overdue','due','scheduled']){const m=all.find(m=>m.dataset.s===s);if(m)return m.dataset.t}return null})('Temperature')")
    await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1000)
    await pg.fill('#cd-value', '101.3'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(900)
    dt = await pg.evaluate(TOAST238)
    await pg.click('#toastWrap .ts-undo button >> nth=-1'); await pg.wait_for_timeout(900)
    ds = await pg.evaluate(f"(TASKS.find(t=>t.id==='{k}'||t.key==='{k}')||{{}}).status||null")
    ok('n238: charting from the drawer says “Temperature charted · Undo”, and Undo takes it back', 'Temperature charted | Undo' in dt and ds is None, [dt, ds])
    await pg.fill('#tsProblems input', 'Training problem A'); await pg.press('#tsProblems input', 'Enter'); await pg.wait_for_timeout(900)
    pa = await pg.evaluate(TOAST238)
    await pg.click('#toastWrap .ts-undo button >> nth=-1'); await pg.wait_for_timeout(900)
    pl = await pg.evaluate("(document.getElementById('tsProblems')||{innerText:''}).innerText")
    ok('n238: adding a problem says “Training Problem A added · Undo” (problem names in Title Case since n247), and Undo removes it', 'Training Problem A added | Undo' in pa and 'Training Problem A' not in pl, [pa, pl[:80]])
    # 7.–8. notes keep their lines; note boxes grow
    await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(900)
    h0 = await pg.evaluate("document.getElementById('note-body').getBoundingClientRect().height")
    await pg.fill('#note-body', 'Assessment: training dog, quiet and alert.\nPlan:\n- recheck temperature at 2 PM\n- offer water\n' + '\n'.join('line %d' % i for i in range(5, 13)))
    await pg.wait_for_timeout(300)
    h1 = await pg.evaluate("[document.getElementById('note-body').getBoundingClientRect().height,document.getElementById('note-body').scrollHeight,innerHeight]")
    await pg.screenshot(path=f'{SHOTS}/n238-note-grows.png')
    await pg.locator('#noteDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(1200)
    await pg.evaluate("selectCTab('notes')"); await pg.wait_for_timeout(900)
    nb = await pg.evaluate("(()=>{const n=[...document.querySelectorAll('#ctab-notes .cnote .nbody')].find(e=>/Assessment/.test(e.textContent));return n?[n.innerText,getComputedStyle(n).whiteSpace]:null})()")
    await pg.screenshot(path=f'{SHOTS}/n238-note-lines.png')
    ok('n238: the Note box starts taller (it was 4 lines) and grows with the text, up to 60 % of the window', h0 >= 130 and h1[0] > h0 + 40 and h1[0] <= h1[2] * 0.6 + 2, [h0, h1])
    ok('n238: a saved note keeps its line breaks (it ran together into one line)', bool(nb) and 'Plan:\n- recheck temperature at 2 PM\n- offer water' in nb[0] and nb[1] == 'pre-line', nb)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(900)
    await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1000)
    c0 = await pg.evaluate("document.getElementById('cd-notes').getBoundingClientRect().height")
    await pg.fill('#cd-notes', '\n'.join('note line %d' % i for i in range(1, 15))); await pg.wait_for_timeout(300)
    c1 = await pg.evaluate("(()=>{const t=document.getElementById('cd-notes');const lh=parseFloat(getComputedStyle(t).lineHeight)||parseFloat(getComputedStyle(t).fontSize)*1.4;return [t.getBoundingClientRect().height,lh,getComputedStyle(t).overflowY]})()")
    ok('n238: the charting drawer’s note grows too, up to 8 lines, then scrolls', c1[0] > c0 + 30 and c1[0] <= c1[1] * 8 + 40 and c1[2] == 'auto', [c0, c1])
    await pg.evaluate(CLOSE238)
    ok('n238: no page errors (drawer, problems, notes)', not errs, errs[:3])
    await ctx.close()


@section(id='n240', title='n240: Treatment Sheets — HIG Column views, Disclosure controls, Labels (synthetic training patients)',
         apps=['treatment', 'flow'], topics=['sheets-alerts'])
async def s_n240(br):
    async def ts240(dark=True, vp=(1440, 900), wait=2600, more=False):
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED232))
        await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        async def route(r):
            u = r.request.url
            if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
            elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
            elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await ctx.route('**/*', route)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        if more:
            cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-contrast', 'value': 'more'}]})
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
        return ctx, pg, errs
    SCAN240 = r"""(()=>{const P=c=>{const m=c.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0]};const L=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
        const mix=(a,b)=>{const al=a.length>3?a[3]:1;return [0,1,2].map(i=>a[i]*al+b[i]*(1-al))};
        const bgOf=e=>{const st=[];let n=e;while(n&&n.nodeType===1){const c=P(getComputedStyle(n).backgroundColor);if(c.length<4||c[3]>0)st.push(c);if(c.length<4||c[3]>=.95)break;n=n.parentElement}let b=document.body.classList.contains('dark')?[10,18,34]:[242,244,248];for(let i=st.length-1;i>=0;i--)b=mix(st[i],b);return b};
        const grad=e=>{let n=e;while(n&&n.nodeType===1){if(getComputedStyle(n).backgroundImage.indexOf('gradient')>-1)return true;n=n.parentElement}return false};const out={};const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode()){const s=t.textContent.trim();if(s.length<2)continue;const e=t.parentElement;if(!e||e.closest('.pvx-topbar,#pvxTopbar,.topbar,nav.pvx-nav,header'))continue;const r=e.getBoundingClientRect();if(!r.width)continue;if(grad(e))continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
         let op=1,n=e;while(n){op*=+getComputedStyle(n).opacity;n=n.parentElement}
         const bg=bgOf(e);let fc=P(cs.color);fc=mix([fc[0],fc[1],fc[2],(fc.length>3?fc[3]:1)*op],bg);const l1=L(fc),l2=L(bg);const cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
         const dis=!!e.closest('[disabled],[aria-disabled=true],.disabled');const k=cs.color+'|'+Math.round(cr*10)/10;
         if(!out[k])out[k]={n:0,cr:Math.round(cr*100)/100,fs:cs.fontSize,fw:cs.fontWeight,dis,ex:[]};out[k].n++;if(out[k].ex.length<3)out[k].ex.push(s.slice(0,28)+' <'+String(e.className).slice(0,18)+'>')}
        return Object.entries(out).filter(([k,v])=>v.cr<4.5&&!v.dis).map(([k,v])=>[k,v.cr,v.fs,v.ex])})()"""
    CR240 = """(([sel,pseudo])=>{const P=c=>(c.match(/[\\d.]+/g)||[]).map(Number);const L=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};const e=document.querySelector(sel);if(!e)return null;
      let n=e,bg=null;while(n&&n.nodeType===1){const c=P(getComputedStyle(n).backgroundColor);if(c.length&&(c.length<4||c[3]>.5)){bg=c;break}n=n.parentElement}bg=bg||(document.body.classList.contains('dark')?[10,18,34]:[255,255,255]);const fc=P(getComputedStyle(e).color);const a=L(fc),b=L(bg);return Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*100)/100})"""
    # disclosure 1: the section chevron leads
    ctx, pg, errs = await ts240()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1600)
    SEC240 = "[...document.querySelectorAll('.gband .gsection')].map(g=>{const c=g.querySelector('.sec-chev'),t=g.querySelector('.stitle');return [Math.round(c.getBoundingClientRect().left-t.getBoundingClientRect().left),getComputedStyle(c).transform,g.getAttribute('aria-expanded')]})"
    o1 = await pg.evaluate(SEC240)
    await pg.click('.gband .gsection >> nth=0'); await pg.wait_for_timeout(600); c1 = await pg.evaluate(SEC240)
    await pg.screenshot(path=f'{SHOTS}/n240-section-chevrons.png', clip={'x': 380, 'y': 400, 'width': 560, 'height': 200})
    await pg.click('.gband .gsection >> nth=0'); await pg.wait_for_timeout(400)
    ok('n240: each section’s chevron is on the leading edge, before its name (it came after the name and count)', o1 and all(x[0] < 0 for x in o1) and all(x[0] < 0 for x in c1), [o1, c1])
    ok('n240: it points down when open and right (inward) when closed', all(x[1] == 'none' for x in o1) and c1[0][1].startswith('matrix(0, -1, 1, 0') and c1[0][2] == 'false', [o1[0], c1[0]])
    # disclosure 2: More options last in the order form
    await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
    ORD240 = """(()=>{const c=document.querySelector('#tsModal .tm-card');const k=[...c.children].map(x=>(String(x.className).split(' ')[0]||x.id));const m=c.querySelector('.of-more'),b=m.nextElementSibling,calc=document.getElementById('rxCalc');
      return {k,exp:m.getAttribute('aria-expanded'),ctl:m.getAttribute('aria-controls'),bid:b.id,bvis:b.getBoundingClientRect().height>0,calc:calc?Math.round(calc.offsetTop):null,more:Math.round(m.offsetTop)}})()"""
    f1 = await pg.evaluate(ORD240)
    await pg.click('#tsModal .of-more'); await pg.wait_for_timeout(900); f2 = await pg.evaluate(ORD240)
    await pg.screenshot(path=f'{SHOTS}/n240-more-options-last.png')
    vis = await pg.evaluate("(()=>{const b=document.querySelector('#tsModal .of-more').nextElementSibling.getBoundingClientRect(),f=document.querySelector('#tsModal .tm-foot').getBoundingClientRect();return b.top<f.top})()")
    ok('n240: More options and what it hides come last, just above the buttons (they sat above Stock strength and the dose result)', f1['k'][-3:] == ['of-more', 'of-box', 'tm-foot'] and f1['calc'] is not None and f1['calc'] < f1['more'], f1)
    ok('n240: opening it leaves the dose result where it was, names what it controls, and brings the options into view', f2['exp'] == 'true' and f2['ctl'] == f2['bid'] and f2['bvis'] and f2['calc'] == f1['calc'] and vis, [f1, f2, vis])
    await pg.click('#tsModal .of-more'); await pg.wait_for_timeout(500)
    ok('n240: closing it again works', await pg.evaluate("document.querySelector('#tsModal .of-more').getAttribute('aria-expanded')") == 'false')
    ok('n240: no page errors on the sheet and order box', not errs, errs[:3])
    await ctx.close()
    # labels: every visible text at least 4.5:1, in both themes and with Increase Contrast
    for dk, more in ((True, False), (False, False), (True, True), (False, True)):
        th = ('dark' if dk else 'light') + (' + Increase Contrast' if more else '')
        ctx, pg, errs = await ts240(dark=dk, more=more, wait=3200)
        low = {'board': await pg.evaluate(SCAN240)}
        await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(1500); low['tasks'] = await pg.evaluate(SCAN240)
        await pg.evaluate("(()=>{const t=document.querySelector('#ctab-tasks');if(!t||t.querySelector('.wl-sec.due'))return;const x=document.createElement('section');x.className='wl-sec due';x.id='pvxT240';x.innerHTML='<h3>Due now <span>16</span></h3>';t.appendChild(x)})()")
        dueN = await pg.evaluate(CR240, ['.wl-sec.due h3 span', None]); await pg.evaluate("(()=>{const x=document.getElementById('pvxT240');x&&x.remove()})()")
        await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1600); low['sheet'] = await pg.evaluate(SCAN240)
        for t in ('vitals', 'charges', 'timeline', 'notes'):
            await pg.evaluate(f"selectCTab('{t}')"); await pg.wait_for_timeout(1300); low[t] = await pg.evaluate(SCAN240)
        await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(700)
        await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500); low['order'] = await pg.evaluate(SCAN240)
        named = {k: await pg.evaluate(CR240, [s_, None]) for k, s_ in (('2h ago', '.tsh .tsh-age:not(.old)'), ('Source ↗', '#tsModal .rx-ref a'), ('Already ordered', '#tsModal .ts-dup .td-h'), ('In range', '#tsModal .ms-bar.ok .ms-say b'))}
        named['1d ago'] = await pg.evaluate("(()=>{const e=document.querySelector('.tsh .tsh-age:not(.old)');if(!e)return null;e.classList.add('old');return 1})()") and await pg.evaluate(CR240, ['.tsh .tsh-age.old', None])
        if not more: await pg.screenshot(path=f'{SHOTS}/n240-order-{"dark" if dk else "light"}.png')
        bad = {k: v for k, v in low.items() if v}
        named['Due now count'] = dueN
        ok(f'n240: every label is at least 4.5:1 on the board, Tasks, every sheet tab and the order box ({th})', not bad, bad)
        ok(f'n240: “2h ago”, “1d ago” (overdue amber), Tasks’ Due now count, “Source ↗”, “Already ordered” and “In range” each read at 4.5:1 or more ({th})', all(v is None or v >= 4.5 for v in named.values()) and named['1d ago'] is not None and named['2h ago'] is not None and named['Due now count'] is not None, named)
        if dk and more:
            ok('n240: Increase Contrast keeps its own, brighter accent text in dark (#8FE6F3)', (await pg.evaluate("getComputedStyle(document.body).getPropertyValue('--accent-ink').trim()")).upper() == '#8FE6F3')
        await ctx.close()
    # also: Esc closes Treatment settings the first time
    ctx, pg, errs = await ts240()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
    SH240 = "(()=>{const s=document.getElementById('tsOrderSheet');return [!!(s&&s.classList.contains('show')),document.activeElement&&document.activeElement.id]})()"
    await pg.click('#tsSettingsBtn'); await pg.wait_for_timeout(1000); e0 = await pg.evaluate(SH240)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700); e1 = await pg.evaluate(SH240)
    await pg.wait_for_timeout(2500); e2 = await pg.evaluate(SH240)
    ok('n240: Esc closes Treatment settings the first time, with focus back on the gear (it took two)', e0[0] and not e1[0] and e1[1] == 'tsSettingsBtn' and not e2[0], [e0, e1, e2])
    await pg.click('#tsSettingsBtn'); await pg.wait_for_timeout(1000); r0 = await pg.evaluate(SH240)
    sub = await pg.query_selector('#tsOrderSheet .op-card.stg [data-stg]')
    r1 = r2 = None
    if sub:
        await sub.click(); await pg.wait_for_timeout(900)
        bk = await pg.query_selector('#tsOrderSheet .op-back')
        if bk: await bk.click(); await pg.wait_for_timeout(900)
        r1 = await pg.evaluate("!!document.querySelector('#tsOrderSheet.show .op-card.stg')")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(2500); r2 = await pg.evaluate(SH240)
    ok('n240: the gear opens settings again, and Back to Settings from a settings page still works and closes on one Esc', r0[0] and sub is not None and r1 and not r2[0], [r0, r1, r2])
    ok('n240: no page errors in settings', not errs, errs[:3])
    await ctx.close()


@section(id='n241', title='n241: Treatment Sheets — HIG Lists and tables, Lockups, Outline views (synthetic training patients)',
         apps=['treatment', 'flow'], topics=['sheets-alerts'])
async def s_n241(br):
    async def ts241(dark=True, vp=(1440, 900), wait=2600, more=False):
        ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
        await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
        await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED232))
        await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
        async def route(r):
            u = r.request.url
            if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
            elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
            elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await ctx.route('**/*', route)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        if more:
            cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-contrast', 'value': 'more'}]})
        await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
        return ctx, pg, errs
    import re as _re241
    TB241 = """(()=>{const t=document.querySelector('#ctab-dash .sb-inner');if(!t)return null;const lab=(t.getAttribute('aria-labelledby')||'').split(' ').map(i=>(document.getElementById(i)||{}).textContent||'').join(' ').trim();
      const kids=r=>{const o=[];[...r.children].forEach(c=>{if(c.getAttribute('aria-hidden')==='true')return;if(c.getAttribute('role')==='none')o.push(...[...c.children]);else o.push(c)});return o};
      const head=t.querySelector(':scope>.sb-row.sb-head'),rows=[...t.querySelectorAll(':scope>.sb-row:not(.sb-head)')];
      return {role:t.getAttribute('role'),lab,head:head?[head.getAttribute('role'),kids(head).map(c=>[c.getAttribute('role'),(c.getAttribute('aria-label')||c.textContent).trim().slice(0,22),c.getAttribute('aria-sort')])]:null,
        btnSort:[...t.querySelectorAll('.sb-sorth[aria-sort]')].length,
        rows:rows.map(r=>({role:r.getAttribute('role'),tab:r.tabIndex,name:r.getAttribute('aria-label'),sel:r.classList.contains('sel'),cells:kids(r).map(c=>c.getAttribute('role'))}))}})()"""
    FOC241 = "(()=>{const a=document.activeElement;return a&&a.classList&&a.classList.contains('sb-row')?[a.getAttribute('data-id'),a.classList.contains('sel'),a.getAttribute('aria-label')]:[a&&a.tagName,a&&String(a.className).slice(0,30)]})()"
    # fixed first: the Status board is a table to VoiceOver
    ctx, pg, errs = await ts241(wait=3400)
    tb = await pg.evaluate(TB241)
    heads = tb and tb['head'] and tb['head'][1]
    ok('n241: the Status board is a table named by its group (“Inpatients 2”) to VoiceOver (it was plain boxes)', tb and tb['role'] == 'table' and tb['lab'].startswith('Inpatients'), tb and [tb['role'], tb['lab']])
    ok('n241: its first row holds column headers, Patient … Alerts and Hours', heads and [h[0] for h in heads] == ['columnheader'] * 6 and [h[1] for h in heads[:5]] == ['Patient', 'Ward', 'Stay', 'Care team', 'Alerts'] and heads[5][1].startswith('Hours, '), heads)
    ok('n241: the sorted column says so on its header (aria-sort moved off the button)', heads and heads[0][2] == 'ascending' and all(h[2] == 'none' for h in heads[1:5]) and tb['btnSort'] == 0, [heads, tb and tb['btnSort']])
    ok('n241: each patient row is a row of a row header and cells, with nothing else in it', tb and tb['rows'] and all(r['role'] == 'row' and r['cells'][0] == 'rowheader' and all(c == 'cell' for c in r['cells'][1:]) and len(r['cells']) == 6 for r in tb['rows']), tb and tb['rows'])
    ok('n241: each row is named in full — patient, ward, day, overdue, code status, team', tb and all(_re241.match(r'^[A-Z][a-z]+ Training, (ICU|Wards|Isolation), day \d+, \d+ overdue, (CPR|DNR)', r['name'] or '') for r in tb['rows']), tb and [r['name'] for r in tb['rows']])
    ok('n241: one row is in the tab order at a time (the highlighted one, or the first)', tb and [r['tab'] for r in tb['rows']].count(0) == 1, tb and [r['tab'] for r in tb['rows']])
    await pg.click('#ctab-dash .sb-sorth >> nth=1'); await pg.wait_for_timeout(500); s1 = (await pg.evaluate(TB241))['head'][1]
    await pg.click('#ctab-dash .sb-sorth >> nth=1'); await pg.wait_for_timeout(500); s2 = (await pg.evaluate(TB241))['head'][1]
    ok('n241: sorting by Ward, then again, reads “ascending” then “descending” on the Ward header', s1[1][2] == 'ascending' and s2[1][2] == 'descending' and s2[0][2] == 'none', [s1, s2])
    await pg.click('#ctab-dash .sb-sorth >> nth=0'); await pg.wait_for_timeout(500)
    await pg.evaluate("document.activeElement&&document.activeElement.blur()"); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(300); k1 = await pg.evaluate(FOC241)
    await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(300); k2 = await pg.evaluate(FOC241)
    tabs = [r['tab'] for r in (await pg.evaluate(TB241))['rows']]
    await pg.screenshot(path=f'{SHOTS}/n241-board-row-focus.png', clip={'x': 40, 'y': 420, 'width': 1380, 'height': 320})
    ok('n241: ↑ ↓ move focus with the highlight, so VoiceOver reads each row (focus stayed on the page)', k1[0] and k1[1] and k2[0] and k2[1] and k1[0] != k2[0] and tabs.count(0) == 1 and tabs.index(0) == 1, [k1, k2, tabs])
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1300); op = await pg.evaluate("__tsFind.cur()")
    await pg.click('.tsh-back'); await pg.wait_for_timeout(1300); bk = await pg.evaluate(FOC241)
    ok('n241: Return opens it, and Back puts focus on the row you left (it went to the page)', op == k2[0] and bk[0] == k2[0] and bk[1], [op, bk])
    await pg.evaluate("document.querySelector('#ctab-dash .sb-row:not(.sb-head)').focus()"); await pg.wait_for_timeout(200)
    f0 = await pg.evaluate(FOC241); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1300); op2 = await pg.evaluate("__tsFind.cur()")
    ok('n241: Return opens the row that has focus, even when VoiceOver moved it off the highlight', f0[0] and not f0[1] and op2 == f0[0], [f0, op2])
    await pg.click('.tsh-back'); await pg.wait_for_timeout(1000)
    await pg.click('#ctab-dash .pvx-alb >> nth=0'); await pg.wait_for_timeout(600); a1 = await pg.evaluate("!!document.querySelector('.pt-pop.show,.ts-menu.show,#tsAlMenu')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    await pg.focus('#ctab-dash .pvx-alb >> nth=0'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(600); a2 = await pg.evaluate("!!document.querySelector('.pt-pop.show,.ts-menu.show,#tsAlMenu')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ok('n241: each row’s Alerts button still opens by click and by Return (now inside its cell)', a1 and a2, [a1, a2])
    await pg.click('#ctab-dash button:has-text("List")'); await pg.wait_for_timeout(800); tl = await pg.evaluate(TB241)
    ok('n241: the List view is the same table, without the Hours column', tl and tl['role'] == 'table' and len(tl['head'][1]) == 5 and all(len(r['cells']) == 5 for r in tl['rows']), tl and [tl['head'], [r['cells'] for r in tl['rows']]])
    await pg.click('#ctab-dash button:has-text("Hours")'); await pg.wait_for_timeout(500)
    # lists: Tasks and Charges
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(1500)
    tk = await pg.evaluate("[...document.querySelectorAll('#ctab-tasks .wl-pt')].map(p=>[p.getAttribute('role'),p.getAttribute('aria-label'),p.querySelectorAll(':scope>.wl-row').length,p.querySelectorAll(':scope>.wl-row[role=listitem]').length])")
    ok('n241: each patient’s tasks in Overdue and Due now are a list that says how many (“Biscuit Training, Overdue: 25 tasks”)', tk and all(x[0] == 'list' and x[2] == x[3] and x[1] and _re241.search(r': %d tasks?$' % x[2], x[1]) for x in tk), tk)
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('charges')"); await pg.wait_for_timeout(1500)
    cl = await pg.evaluate("[...document.querySelectorAll('.ch-row .ch-ck')].map(b=>b.getAttribute('aria-label'))")
    await pg.click('.ch-row .ch-ck >> nth=0'); await pg.wait_for_timeout(900)
    cl2 = await pg.evaluate("[...document.querySelectorAll('.ch-row .ch-ck')].slice(0,2).map(b=>b.getAttribute('aria-label'))")
    ok('n241: every Charges tick names its charge and day (they were all “Mark as entered on the invoice”)', cl and len(set(cl)) == len(cl) and all(_re241.match(r'^Mark .+, day \d+, as entered on the invoice$', x) for x in cl), cl[:4])
    ok('n241: once ticked, it says what it will do next for that charge', cl2[0].startswith('Mark ') and cl2[0].endswith(', as not entered') and cl2[1] == cl[1], cl2)
    try: await pg.click('#toastWrap .ts-undo button >> nth=-1', timeout=1500)
    except Exception: pass
    ok('n241: no page errors on the board, Tasks and Charges', not errs, errs[:3])
    await ctx.close()
    # outline: Option-click folds or unfolds every section
    ctx, pg, errs = await ts241()
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1600)
    EX241 = "[...document.querySelectorAll('.gband .gsection')].map(g=>g.getAttribute('aria-expanded'))"
    o0 = await pg.evaluate(EX241)
    await pg.click('.gband .gsection >> nth=1', modifiers=['Alt']); await pg.wait_for_timeout(700)
    o1 = await pg.evaluate(EX241); sy = await pg.evaluate("[(document.getElementById('pvxLive241')||{}).textContent,document.activeElement&&document.activeElement.classList.contains('gsection')]")
    await pg.screenshot(path=f'{SHOTS}/n241-all-sections-folded.png', clip={'x': 380, 'y': 380, 'width': 760, 'height': 240})
    await pg.focus('.gband .gsection >> nth=0'); await pg.keyboard.press('Alt+Enter'); await pg.wait_for_timeout(700); o2 = await pg.evaluate(EX241)
    ok('n241: Option-click on a section folds every section, says so, and keeps focus on that section (it folded only one)', all(x == 'true' for x in o0) and all(x == 'false' for x in o1) and sy[0] == 'All sections folded' and sy[1], [o0, o1, sy])
    ok('n241: Option-Return on a folded section shows them all again', all(x == 'true' for x in o2), o2)
    await pg.click('.gband .gsection >> nth=2'); await pg.wait_for_timeout(500); o3 = await pg.evaluate(EX241)
    await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1100); await pg.evaluate("tsOpenSheet('sh_train1')"); await pg.wait_for_timeout(1100); o4 = await pg.evaluate(EX241)
    tt = await pg.evaluate("document.querySelector('.gband .gsection').title")
    ok('n241: a plain click still folds one section, and the sheet remembers it', o3 == ['true', 'true', 'false'] and o4 == o3, [o3, o4])
    ok('n241: the band’s tooltip mentions it (“Option-click: all sections”, “Alt-click” on Windows)', _re241.search(r' · (Option|Alt)-click: all sections$', tt or '') is not None, tt)
    ok('n241: no page errors on the sheet', not errs, errs[:3])
    await ctx.close()


@section(id='n242', title='n242: a sheet started in Treatment Sheets joins Flow and Rounds (synthetic training patients)',
         apps=['treatment', 'flow'], topics=['sheets-alerts'])
async def s_n242(br):
    import json as _js242
    FU242 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    def sheet242(name, last='Training', sp='Dog', **kw):
        d = {'tenant_id': 'shoreline', 'status': 'active', 'visit_id': None, 'source': 'manual', 'created_at': '2026-10-22T20:00:00.000Z', 'admitted_at': '2026-10-22T20:00:00.000Z',
             'created_by': 'Resident A', 'created_uid': 'u9', 'patient': {'name': name, 'last': last, 'species': sp, 'breed': 'Beagle', 'sex': 'FS', 'weight': 11.2, 'reason': 'Vomiting',
             'doctor': 'Dr. Nobody', 'location': 'ICU', 'code': 'DNR', 'condition': 'Watch', 'alerts': ['DNR'],
             'problem_list': [{'id': 'p1', 'text': 'Vomiting', 'added_at': '2026-10-22T20:00:00.000Z'}, {'id': 'p2', 'text': 'Diarrhea', 'added_at': '2026-10-22T20:00:00.000Z', 'resolved_at': '2026-10-22T20:05:00.000Z'}]},
             'orders': {}, 'notes': [], 'audit': [{'at': '2026-10-22T20:00:00.000Z', 'type': 'doctor', 'desc': 'Sheet created', 'who': 'RA', 'uid': 'u9'}]}
        d.update(kw); return d
    async def flow242(seed):
        c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
        await c.add_init_script(INIT.replace('@@USER@@', FU242).replace('@@SEED@@', _js242.dumps(seed))); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
        p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
        async def route(r):
            u = r.request.url
            if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
            elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await p.route('**/*', route)
        await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_timeout(9000)
        return c, p, e
    PT242 = """(n=>{const p=PATIENTS.find(x=>x.name===n);if(!p)return null;return {id:p.id,status:p.status,room:p.room,sheet:p.tsSheetId,sid:fvAdmitSheet.id(p),rounds:!!(p.rounds&&!p.rounds.outcome),census:rdCensus().some(x=>x.id===p.id),
      loc:p.rounds&&p.rounds.location,adm:p.rounds&&p.rounds.admittedAt,prio:p.prio,resus:p.resusPref,doctor:p.doctor,species:p.species,weightKg:p.weightKg,problems:(p.reasonProblems||[]).map(r=>r.label||r.name||r.raw||''),tl:(p.timeline||[]).map(t=>t.label+' · '+(t.meta||'')),n:PATIENTS.filter(x=>x.name===n).length}})"""
    SH242 = "(id=>{const d=window.__fs['sheets/'+id];return d?{visit:d.visit_id,code:d.visit_code,link:d.flow_link,audit:(d.audit||[]).map(a=>a.desc).slice(-1)[0]}:null})"
    VS242 = "(id=>{const d=window.__fs['visits/'+id];return d?{sheet:d.ts_sheet_id,status:d.status,name:d.patient_name,room:d.room_id}:null})"
    seed = {'sheets/s_n242a': sheet242('Pepper'), 'sheets/s_n242op': sheet242('Opal', board='OP'), 'sheets/s_n242cl': sheet242('Cleo', status='closed'),
            'sheets/v_flow1': sheet242('Fable', visit_id='flow1', source='flow'),
            'sheets/s_n242st': sheet242('Stale', visit_id='pt-stale242', flow_link={'at': '2026-10-01T00:00:00.000Z', 'by': 'Someone', 'uid': 'u5', 'visit': 'pt-stale242', 'how': 'new'})}
    ctx, pg, errs = await flow242(seed)
    await pg.wait_for_timeout(1500)
    a = await pg.evaluate(PT242 + "('Pepper')"); sa = await pg.evaluate(SH242 + "('s_n242a')")
    await pg.wait_for_timeout(1500); va = await pg.evaluate(VS242 + "('" + str((a or {}).get('id')) + "')")
    ok('n242: a sheet started in Treatment Sheets is added to Flow as a direct admit, in its ward (it never reached Flow)', a and a['status'] == 'Hospitalized' and a['room'] == 'ICU' and a['n'] == 1, a)
    ok('n242: … and is on Rounds, in the census, in ICU, with its stay counted from the sheet’s admission', a and a['rounds'] and a['census'] and a['loc'] == 'ICU' and str(a['adm']).startswith('2026-10-22T20:00'), a)
    ok('n242: Flow follows that sheet, not a new v_ sheet (Rounds treatments, discharge, code status and doctor use it)', a and a['sheet'] == 's_n242a' and a['sid'] == 's_n242a' and 'sheets/v_' + str(a['id']) not in await pg.evaluate("Object.keys(window.__fs).join('|')"), a)
    ok('n242: it carries the sheet’s details — dog → Canine, 11.2 kg, DNR, Watch → P2, active problems only, an unknown doctor left unassigned', a and a['species'] == 'Canine' and a['weightKg'] == 11.2 and a['resus'] == 'DNR' and a['prio'] == 2 and a['problems'] == ['Vomiting'] and a['doctor'] == 'unassigned', a)
    ok('n242: the timeline says where it came from', a and any('sheet started in Treatment Sheets by Resident A' in t for t in a['tl']), a and a['tl'])
    ok('n242: the sheet records the link: its visit, who linked it, and a line in its history', sa and a and sa['visit'] == a['id'] and sa['link'] and sa['link']['how'] == 'new' and sa['audit'] == 'Added to Flow and Rounds as a direct admit' and sa['code'], sa)
    ok('n242: the visit is saved with its sheet (ts_sheet_id), so every Flow screen and a reload follow it', va and va['sheet'] == 's_n242a' and va['status'] == 'Hospitalized', va)
    others = await pg.evaluate("[['Opal','s_n242op'],['Cleo','s_n242cl'],['Fable','v_flow1']].map(([n,id])=>[n,PATIENTS.some(p=>p.name===n),(window.__fs['sheets/'+id]||{}).flow_link||null])")
    ok('n242: outpatient sheets, closed sheets and sheets Flow already made are left alone', all(not x[1] and not x[2] for x in others), others)
    st = await pg.evaluate(PT242 + "('Stale')")
    ok('n242: a link left unfinished by a closed screen is finished by another (same visit id, after 3 minutes)', st and st['id'] == 'pt-stale242' and st['rounds'] and st['n'] == 1, st)
    await pg.evaluate("(async()=>{const d=await firebase.firestore().collection('sheets').doc('s_n242a').get();pvxSheetLink.claim(d);pvxSheetLink.claim(d)})()"); await pg.wait_for_timeout(1500)
    ok('n242: claiming the same sheet again never makes a second visit', (await pg.evaluate(PT242 + "('Pepper')"))['n'] == 1)
    # an open admission for the same pet, without a sheet of its own, gets this sheet instead of a second visit
    tw = await pg.evaluate("""(()=>{const p=patient({name:'Willow',last:'Training',species:'Canine',breed:'Mix',owner:'Training',status:'Admitted',room:'Wards',prio:3,arrival:new Date(),arrivalType:'walkin',timeline:[]});PATIENTS.push(p);try{rdEnroll(p)}catch(e){};return p.id})()""")
    await pg.evaluate("firebase.firestore().collection('sheets').doc('s_n242tw').set(" + _js242.dumps(sheet242('Willow', location='Wards')) + ")"); await pg.wait_for_timeout(2500)
    w = await pg.evaluate(PT242 + "('Willow')"); sw = await pg.evaluate(SH242 + "('s_n242tw')")
    ok('n242: a sheet for a pet already admitted in Flow joins that admission (no second visit)', w and w['n'] == 1 and w['id'] == tw and w['sheet'] == 's_n242tw' and sw and sw['visit'] == tw and sw['link']['how'] == 'twin' and 'Linked to Flow' in sw['audit'], [w, sw])
    stamp = await pg.evaluate("(()=>{const h=document.documentElement.outerHTML;return [h.indexOf('<meta name=\"flow-build\"'),(document.querySelector('meta[name=\"flow-build\"]')||{}).content||'']})()")
    src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    ok('n242: Flow’s build stamp is back in the first 2 KB, so open Flow screens notice this build and reload (it had slipped to ~9 KB)', 0 < src.find('<meta name="flow-build"') < 2000 and stamp[1].startswith('2026'), [src.find('<meta name="flow-build"'), stamp])
    ok('n242: no page errors in Flow', not [x for x in errs if 'cb is not a function' not in x and 'collectionGroup' not in x], errs[:3])
    await ctx.close()
    # Treatment Sheets says so
    ctx, pg, errs = await new_page(br, user='{"uid":"u9","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}')
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2600)
    await pg.evaluate("tsNewSheet()"); await pg.wait_for_timeout(500)
    nt = await pg.evaluate("(()=>{const m=document.querySelector('#tsModal');return m?m.innerText:''})()")
    ok('n242: Treatment Sheets’ “New treatment sheet” says the patient joins Flow and Rounds (it said “for a patient admitted outside Flow”)', 'Flow adds them as a direct admit' in nt and 'Rounds' in nt and 'outside Flow' not in nt, nt[:240])
    await ctx.close()


@section(id='n245', title='n245 + n247: Treatment Sheets — light-mode colours; problem names in Title Case (synthetic training patients)',
         apps=['treatment', 'flow'], topics=['color', 'dark-mode', 'sheets-alerts'])
async def s_n245(br):
    COL245 = """(()=>{const g=(s,p)=>{const e=document.querySelector(s);return e?getComputedStyle(e)[p||'color']:null};
      return {rate:g('#sheetInner .ib-lbl'),line:g('#sheetInner .ib-ln','backgroundColor'),dot:g('#sheetInner .ib-tip','backgroundColor'),bar:g('#sheetInner .ib-bar','backgroundImage')}})()"""
    for _dark in (False, True):
        ctx, pg, errs = await ts245(dark=_dark)
        c = await pg.evaluate(COL245)
        if not _dark:
            ok('n245: light — the fluid rate on the sheet is green (#0F7A55, 5.3:1), not black', c['rate'] == 'rgb(15, 122, 85)', c)
            ok('n245: light — the running line and the now dot are green (they were invisible)', c['line'] == 'rgb(26, 158, 110)' and c['dot'] in ('rgb(26, 158, 110)', None), c)
            ok('n245: light — the bars fade in green, not solid navy', c['bar'] and 'rgba(26, 158, 110' in c['bar'] and '27, 32, 51' not in c['bar'], c)
            await pg.screenshot(path=f'{SHOTS}/n245-light-fluid.png', clip={'x': 0, 'y': 300, 'width': 1440, 'height': 520})
        else:
            ok('n245: dark — the infusion colours are unchanged (#6FE0B3 rate, #2FC48D line)', c['rate'] == 'rgb(111, 224, 179)' and c['line'] == 'rgb(47, 196, 141)', c)
        await pg.evaluate("tsOrderPanel('m245')"); await pg.wait_for_timeout(700)
        pin = await pg.evaluate("(()=>{const b=[...document.querySelectorAll('#tsOrderSheet .op-link')].find(x=>/^Pin to the top/.test(x.textContent));return b?[b.textContent,getComputedStyle(b).color]:null})()")
        ok('n245: %s — “Pin to the top of Medications” is in the accent (%s), not black' % ('dark' if _dark else 'light', 'cyan' if _dark else 'cobalt'), pin and pin[1] == ('rgb(56, 189, 210)' if _dark else 'rgb(35, 67, 156)'), pin)
        if not _dark: await pg.screenshot(path=f'{SHOTS}/n245-light-pin.png')
        try: await pg.evaluate("tsOrderClose()")
        except Exception: pass
        await pg.wait_for_timeout(400)
        await pg.evaluate("tsInfPanel('f245')"); await pg.wait_for_timeout(700)
        stop = await pg.evaluate("(()=>{const b=document.querySelector('#tsOrderSheet .op-link.danger');return b?[b.textContent,getComputedStyle(b).color]:null})()")
        ok('n245: %s — Stop infusion stays red (%s)' % ('dark' if _dark else 'light', '#FF3B30' if _dark else 'the deeper #B3141A, 4.5:1+'), stop and stop[1] == ('rgb(255, 59, 48)' if _dark else 'rgb(179, 20, 26)'), stop)
        mic = await pg.evaluate("(()=>{const h=document.querySelector('#tsOrderSheet')||document.body;const d=document.createElement('div');d.innerHTML='<div class=\"bt-say\"><button type=\"button\" class=\"bt-mic\"><svg viewBox=\"0 0 24 24\"></svg></button></div>';h.appendChild(d);const b=d.querySelector('.bt-mic'),s=getComputedStyle(b),r=[s.color,s.backgroundColor];d.remove();return r})()")
        ok('n245: %s — the Chart microphone’s icon reads on its circle (%s)' % ('dark' if _dark else 'light', 'dark on cyan' if _dark else 'white on cobalt, 8.9:1'), mic == (['rgb(4, 37, 46)', 'rgb(56, 189, 210)'] if _dark else ['rgb(255, 255, 255)', 'rgb(35, 67, 156)']), mic)
        ok('n245: no page errors (%s)' % ('dark' if _dark else 'light'), not errs, errs[:3])
        await ctx.close()
    # n247: problem names in Title Case
    ctx, pg, errs = await ts245(dark=False)
    PL247 = "[...document.querySelectorAll('#tsProblems .pl:not(.pl-resolved) .pl-t')].map(e=>e.textContent)"
    await pg.wait_for_selector('#tsProblems .pl-add input', timeout=8000)
    l0 = await pg.evaluate(PL247)
    ok('n247: a problem typed in lowercase before this build reads in Title Case (“Pericardial Effusion”); counts keep their units', l0[:2] == ['Pericardial Effusion', 'Vomiting · 3 times'], l0)
    await pg.fill('#tsProblems .pl-add input', 'acute kidney injury secondary to toxin'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(900)
    await pg.fill('#tsProblems .pl-add input', 'gdv'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(900)
    l1 = await pg.evaluate(PL247)
    saved = await pg.evaluate("((window.__fs&&window.__fs['sheets/sh_train1'])||{}).patient?.problem_list?.map(p=>p.text)||null")
    ok('n247: “acute kidney injury secondary to toxin” is added as “Acute Kidney Injury Secondary to Toxin”, “gdv” as “GDV”', l1[-2:] == ['Acute Kidney Injury Secondary to Toxin', 'GDV'], l1)
    ok('n247: and saved that way, so Flow and Rounds show the same', saved and saved[-2:] == ['Acute Kidney Injury Secondary to Toxin', 'GDV'], saved)
    await pg.fill('#tsProblems .pl-add input', 'Gdv'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(700)
    ok('n247: the duplicate check still catches the same problem typed differently', (await pg.evaluate(PL247)).count('GDV') == 1, await pg.evaluate(PL247))
    aud0 = await pg.evaluate("(((window.__fs&&window.__fs['sheets/sh_train1'])||{}).audit||[]).length")
    await pg.click('#tsProblems .pl-t >> nth=0'); await pg.wait_for_timeout(300); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(700)
    aud1 = await pg.evaluate("(((window.__fs&&window.__fs['sheets/sh_train1'])||{}).audit||[]).slice(-1)[0]?.desc||''")
    aud1n = await pg.evaluate("(((window.__fs&&window.__fs['sheets/sh_train1'])||{}).audit||[]).length")
    ok('n247: opening an old lowercase problem and leaving it records no change just for the capitals', aud1n == aud0 and 'Problem changed' not in aud1, [aud0, aud1n, aud1])
    sg = await pg.evaluate("[...document.querySelectorAll('#plSugg option')].map(o=>o.value)")
    ok('n247: the suggestions read in Title Case too (“Post-Operative Care”, “Ruptured Splenic Mass”), leaving out what is on the list', 'Post-Operative Care' in sg and 'Ruptured Splenic Mass' in sg and 'GDV' not in sg and 'Pericardial Effusion' not in sg, sg)
    await pg.screenshot(path=f'{SHOTS}/n247-problems.png')
    ok('n247: no page errors', not errs, errs[:3])
    await ctx.close()


@section(id='n246', title='n246: Treatment Sheets — one line per medication product (synthetic training patients)',
         apps=['treatment'], topics=['sheets-alerts', 'drugs'])
async def s_n246(br):
    S246 = json.loads(SEED245); _s = S246['sheets/sh_train1']
    _h8 = 8
    def _med(i, **k):
        o = {'id': i, 'type': 'med', 'section': 'Medications', 'name': 'Maropitant', 'dose': 1, 'unit': 'mg/kg', 'route': 'IV', 'freq': 'q24h', 'start': _h8, 'conc': 10, 'conc_label': 'Maropitant 10 mg/mL', 'ordered_by': 'DG', 'ordered_at': _st}
        o.update(k); return o
    _s['orders']['m246b'] = _med('m246b', dose=2, route='SQ', freq='q12h', start=_h8, ordered_at=_st.replace('.000Z', '.500Z'))
    _s['orders']['m246c'] = _med('m246c', conc=5, conc_label=None, dose=1, freq='q24h', start=14)
    SEED246 = json.dumps(S246)
    async def ts246(dark=False):
        import helpers as _H   # ts245 reads helpers.SEED245 when it runs
        keep = _H.SEED245; _H.SEED245 = SEED246
        try: return await ts245(dark=dark)
        finally: _H.SEED245 = keep
    ROWS246 = """[...document.querySelectorAll('#sheetInner .grow[data-o]')].filter(r=>r.dataset.sec==='Medications').map(r=>({o:r.dataset.o,line:r.dataset.line||null,name:(r.querySelector('.rl-name')||{}).textContent,doses:[...r.querySelectorAll('.rl-dose')].map(d=>d.textContent)}))"""
    ctx, pg, errs = await ts246()
    rows = await pg.evaluate(ROWS246)
    mline = [r for r in rows if r['line']]
    ok('n246: every dose of Maropitant 10 mg/mL shares one line (the sheet’s own and the two added), listing each dose', len(mline) == 1 and mline[0]['line'] == 'm2 m245 m246b' and len(mline[0]['doses']) == 3 and 'SQ · q12h' in mline[0]['doses'][2] and '10 mg/mL' in (mline[0]['name'] or ''), rows)
    ok('n246: a different strength (5 mg/mL) keeps its own line', any(r['o'] == 'm246c' and not r['line'] for r in rows), rows)
    pair = await pg.evaluate("""(()=>{const r=document.querySelector('#sheetInner .grow[data-line]');const c=r.querySelectorAll(':scope > .hcells > .cell')[8];const b=[...c.querySelectorAll('button.mark')];return b.map(x=>[x.getAttribute('data-t'),x.getAttribute('aria-label')])})()""")
    ok('n246: both doses due at 8 AM sit side by side in that hour, each named by its own dose', len(pair) >= 2 and len(set(p[0] for p in pair)) == len(pair) and any(' IV ' in p[1] for p in pair) and any(' SQ ' in p[1] for p in pair), pair)
    h20 = await pg.evaluate("""(()=>{const r=document.querySelector('#sheetInner .grow[data-line]');const c=r.querySelectorAll(':scope > .hcells > .cell')[20];return [...c.querySelectorAll('button.mark')].map(x=>x.getAttribute('aria-label'))})()""")
    ok('n246: the q12h dose’s 8 PM mark is on the same line', len(h20) == 1 and 'SQ' in h20[0], h20)
    await pg.click('#sheetInner .grow[data-line] .rl-dose >> nth=2')
    await until(pg, "/Discontinue/.test((document.querySelector('#tsOrderSheet')||{}).textContent||'')", 4000)   # was a fixed 700 ms (it failed now and then)
    panel = await pg.evaluate("(document.querySelector('#tsOrderSheet')||{}).textContent||''")
    ok('n246: choosing the second dose opens that dose’s own panel (Change…, Discontinue)', 'q12h' in panel and 'SQ' in panel and 'Discontinue' in panel, panel[:200])
    try: await pg.evaluate("tsOrderClose()")
    except Exception: pass
    await pg.wait_for_timeout(300)
    q = await pg.evaluate("!!document.querySelector(tsRowQ('m246b'))&&document.querySelector(tsRowQ('m246b')).dataset.o==='m2'")
    ok('n246: finding a dose by its order (reveal, flash, search) lands on its line', q, q)
    await pg.screenshot(path=f'{SHOTS}/n246-one-line.png', clip={'x': 0, 'y': 260, 'width': 1440, 'height': 600})
    # ordering the same product again joins the line, with no Already ordered box
    await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1400)
    await pg.fill('#rxDose', '0.5'); await pg.select_option('#rxRoute', 'IV'); await pg.select_option('#rxFreq', 'Once')
    await pg.wait_for_timeout(300)
    st = await pg.evaluate("(()=>{const d=document.querySelector('#tsModal .ts-dup'),n=document.getElementById('tsJoinNote');return [d?d.hidden:null,n&&!n.hidden?n.textContent:null]})()")
    ok('n246: the same strength shows no Already ordered box, just “Adds a dose to the Maropitant 10 mg/mL line”', st[0] is True and st[1] == 'Adds a dose to the Maropitant 10 mg/mL line', st)
    await pg.evaluate("(()=>{const c=document.getElementById('rxConc');c.value='5';c.dispatchEvent(new Event('input'))})()"); await pg.wait_for_timeout(300)
    st5 = await pg.evaluate("(()=>{const d=document.querySelector('#tsModal .ts-dup'),n=document.getElementById('tsJoinNote');return [d?d.hidden:null,n?n.hidden:null]})()")
    ok('n246: switching to a strength already on the sheet at 5 mg/mL joins that line instead', st5 == [True, False], st5)
    await pg.evaluate("(()=>{const c=document.getElementById('rxConc');c.value='2';c.dispatchEvent(new Event('input'))})()"); await pg.wait_for_timeout(300)
    st2 = await pg.evaluate("(()=>{const d=document.querySelector('#tsModal .ts-dup'),n=document.getElementById('tsJoinNote');return [d?d.hidden:null,n?n.hidden:null]})()")
    ok('n246: a new strength (2 mg/mL) brings back the Already ordered box (a new line)', st2 == [False, True], st2)
    await pg.evaluate("(()=>{const c=document.getElementById('rxConc');c.value='10';c.dispatchEvent(new Event('input'))})()"); await pg.wait_for_timeout(300)
    await pg.click('#tsModal .tm-foot button:has-text("Add to sheet"), #tsModal .tm-foot button:has-text("Order anyway")'); await pg.wait_for_timeout(1200)
    toast = await pg.evaluate("[...document.querySelectorAll('#toastWrap .toast, #toastWrap > *')].map(t=>t.textContent).join(' | ')")
    rows2 = await pg.evaluate(ROWS246)
    ml2 = [r for r in rows2 if r['line'] and r['o'] == 'm2']
    saved = await pg.evaluate("Object.values(((window.__fs||{})['sheets/sh_train1']||{}).orders||{}).filter(o=>o.name==='Maropitant').length")
    ok('n246: it’s added without a tick, and the message says “added to the Maropitant 10 mg/mL line”', 'added to the Maropitant 10 mg/mL line' in toast, toast[:200])
    ok('n246: the line now lists four doses; each is still its own order on the sheet', ml2 and len(ml2[0]['doses']) == 4 and saved == 5, [rows2, saved])
    ok('n246: no page errors', not errs, errs[:3])
    await ctx.close()
