"""SGVP — the internship site, curriculum and calendars."""
from core import *
from helpers import *


@section(id='n181', title='n181: ready to leave recovery, temperature forecast, interns',
         apps=['anesia', 'sgvp'], topics=['behaviour'])
async def s_n181(br):
    ctx, pg, errs = await new_page(br)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
    await pg.click('.an-sum [data-steam]'); await pg.wait_for_selector('#anSheet .an-team')
    tm = await pg.evaluate("[...document.querySelectorAll('#anSheet .an-team small')].map(x=>x.innerText)")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('n181: the team says Intern, not Resident', 'Intern' in tm and 'Resident' not in tm, tm)
    await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec'); await pg.wait_for_timeout(300)
    rd = await pg.inner_text('.an-rready')
    ok('n181: at the start: all four milestones and no check yet', all(x in rd for x in ['Extubated not recorded', 'Head up not recorded', 'Sternal not recorded', 'Standing not recorded', 'No recovery check yet']), rd)
    for k in ('extubation', 'headup', 'sternal', 'standing'): await pg.click('[data-rmk=%s]' % k); await pg.wait_for_timeout(250)
    async def chk(temp, pain, ment):
        await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300); await pg.fill('#rc_temp', temp)
        await pg.click('#anSheet [data-chips=pain] [data-v="%s"]' % pain); await pg.click('#anSheet [data-chips=mentation] [data-v=%s]' % ment); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
    await chk('99.0', 3, 'dysphoric')
    rd = await pg.inner_text('.an-rready')
    ok('n181: pain 3/4 and dysphoria at the last check are listed', 'Pain 3/4 at the last check' in rd and 'Dysphoric at the last check' in rd and 'not recorded' not in rd, rd)
    await pg.evaluate("window.__anSkip=(window.__anSkip||0)+10*60000"); await chk('98.6', 1, 'alert')
    fc = await pg.evaluate("[document.querySelector('.an-rtemp')?.innerText, document.querySelector('.an-rtemp')?.className, document.querySelector('.an-rready').innerText]")
    ok('n181: a falling temperature is flagged after two checks', 'Temperature falling · −2.4 °F/h' in fc[0] and 'dn' in fc[1] and 'Temperature falling' in fc[2], fc)
    await pg.evaluate("window.__anSkip=(window.__anSkip||0)+10*60000"); await chk('99.6', 1, 'alert')
    fc = await pg.evaluate("[document.querySelector('.an-rtemp')?.innerText, document.querySelector('.an-rready').className, document.querySelector('.an-rready').innerText]")
    ok('n181: rising again (fit over the last checks): +1.8 °F/h with an ETA; nothing missing → Ready to leave recovery', 'Rising +1.8 °F/h · about 100 °F by' in fc[0] and 'ok' in fc[1] and fc[2].strip() == 'Ready to leave recovery', fc)
    await shot(pg, '100-recovery-ready')
    await pg.click('#anREnd'); await pg.wait_for_selector('#anSheet [data-chips=dest]'); await pg.wait_for_timeout(300)
    ok('n181: End recovery has nothing to warn about when ready', await pg.locator('#anSheet .an-calc.warn').count() == 0)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.click('.an-sum [data-sum] >> nth=0'); await pg.wait_for_selector('#anSheet [name=resident]')
    ok('n181: Patient details labels the field Intern', (await pg.inner_text('#anSheet label[for=pR]')) == 'Intern')
    ok('no page errors (n181)', not errs, errs)
    await ctx.close()



@section(id='n218', title="n218: LIU students' real dates in the curriculum",
         apps=['sgvp'], topics=['behaviour'])
async def s_n218(br):
    FU218 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    LIUQ = """(()=>{const out={};document.querySelectorAll('#currTbody tr').forEach((tr,ri)=>{const svc=(tr.querySelector('.svc-name')||{}).dataset; tr.querySelectorAll('td.block-col').forEach((td,ci)=>{
        const l=[...td.querySelectorAll('.cell-initials')].find(x=>x.textContent.trim().startsWith('LIU')); if(!l) return;
        const chip=td.querySelector('.status-chip'); out[(svc&&svc.id)+'-'+String(ci+1).padStart(2,'0')]={when:(l.querySelector('.pvx-liu-d')||{}).textContent||'',title:l.getAttribute('title')||'',
          chip:chip?chip.className.replace('status-chip','').trim():'',aria:(td.querySelector('.block-cell')||{getAttribute(){return ''}}).getAttribute('aria-label')||''}; }); }); return out; })()"""
    async def liu_page(path, date=None):
        c, p, e = await new_page(br, user=FU218, vp=(1440, 900))
        if date:
            await c.add_init_script("(()=>{const D=Date,T=new D('%s').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()" % date)
        await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2500)
        return c, p, e
    # n219: the Overview now starts with the March group's three blocks, so Block 04 is its 7th column
    ctx, pg, errs = await liu_page('sgvp/')
    lq = await pg.evaluate(LIUQ)
    ok('n218: Block 04 Internal Medicine shows LIU “from Oct 26” and as upcoming today (it showed current from Oct 18)', lq.get('im-07', {}).get('when') == 'from Oct 26' and lq['im-07']['chip'] == 'upcoming', lq)
    ok('n218: the other LIU cells carry their dates — to Jan 17 (Emergency, from the block’s first day), from Mar 29 and to Apr 25 (Internal Medicine)', lq.get('em1-09', {}).get('when') == 'to Jan 17' and lq.get('im-11', {}).get('when') == 'from Mar 29' and lq.get('im-12', {}).get('when') == 'to Apr 25', lq)
    ok('n218: hovering or VoiceOver gives the student, rotation and dates (Caroline Smith (LIU, Year 4) · Small Animal Medicine · Oct 26 – Nov 22; under 75 characters since n222)',
       lq['im-07']['title'] == 'Caroline Smith (LIU, Year 4) · Small Animal Medicine · Oct 26 – Nov 22' and 'Caroline Smith' in lq['im-07']['aria'] and lq['im-07']['aria'].endswith('upcoming'), lq['im-07'])
    cu = await pg.evaluate("""(async()=>{ document.querySelector('#currProgChips [data-f=current]').click(); await new Promise(r=>setTimeout(r,250));
        const cur=[...document.querySelectorAll('#currTbody .cell-initials')].map(x=>x.textContent.trim()).filter(t=>t.startsWith('LIU'));
        document.querySelector('#currProgChips [data-f=upcoming]').click(); await new Promise(r=>setTimeout(r,250));
        const up=[...document.querySelectorAll('#currTbody .cell-initials')].map(x=>x.textContent.trim()).filter(t=>t.startsWith('LIU')); return {cur,up}; })()""")
    ok('n218: the Current filter no longer lists LIU this week; Upcoming does', cu['cur'] == [] and len(cu['up']) >= 1, cu)
    ok('n218: no page errors on the Overview', not errs, errs[:3])
    await ctx.close()
    ctx, pg, errs = await liu_page('sgvp/', '2026-10-27T10:00:00')
    lq2 = await pg.evaluate(LIUQ)
    ok('n218: from Oct 26 the LIU cell is current', lq2.get('im-07', {}).get('chip') == 'current', lq2.get('im-07'))
    await ctx.close()
    ctx, pg, errs = await liu_page('sgvp/interns/kristi-wenger/curriculum/')
    await pg.evaluate("(document.getElementById('btnAllCurr')||{click(){}}).click()"); await pg.wait_for_timeout(400)
    lq3 = await pg.evaluate(LIUQ)
    c4 = [v for k, v in lq3.items() if k.endswith('-04')]
    ok('n218: an intern’s curriculum (Entire class) shows the same LIU dates', len(c4) == 1 and c4[0]['when'] == 'from Oct 26' and c4[0]['chip'] == 'upcoming' and 'Caroline Smith' in c4[0]['title'], lq3)
    ok('n218: no page errors on an intern’s curriculum', not errs, errs[:3])
    await pg.locator('#currTbody').screenshot(path=os.path.join(SHOTS, 'n218-curriculum.png'))
    await ctx.close()


@section(id='n219', title='n219: one curriculum (the Overview takes the intern layout; Monday-to-Sunday schedule)',
         apps=['sgvp', 'topbar'], topics=['layout'])
async def s_n219(br):
    FU219 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    CLOCK = "(()=>{const D=Date,T=new D('%s').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()"
    async def cur_page(path, date='2026-10-19T10:00:00', vp=(1440, 900), dark=True, touch=False):
        c, p, e = await new_page(br, user=FU219, vp=vp, dark=dark, touch=touch)
        if date: await c.add_init_script(CLOCK % date)
        await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
        return c, p, e
    HEADQ = """[...document.querySelectorAll('#currThead th.block-th')].map(th=>({n:(th.querySelector('.block-num')||{}).textContent,
        d:(th.querySelector('.block-dates')||{}).textContent, s:(th.querySelector('.pvx-bsub')||{}).textContent||'', cur:th.classList.contains('is-current'), out:th.dataset.out||''}))"""
    CELLQ = """(svc,i)=>{ const tr=[...document.querySelectorAll('#currTbody tr')].find(t=>t.querySelector('.svc-name')&&t.querySelector('.svc-name').dataset.id===svc);
        if(!tr) return null; return [...tr.children[i+1].querySelectorAll('.cell-initials')].map(x=>x.dataset.init); }"""
    ctx, pg, errs = await cur_page('sgvp/')
    lay = await pg.evaluate("""(()=>({svgIcons:document.querySelectorAll('#currTbody .svc-icon svg').length, emoji:/[\\u{1F300}-\\u{1FAFF}]/u.test(document.getElementById('currTbody').textContent),
        chips:document.querySelectorAll('#currTbody .cell-initials[data-init]').length, journey:!!document.getElementById('journeySvg'), atmos:!!document.querySelector('.curr-hero .hero-atmos'),
        btn:document.querySelector('#currTbody button.svc-name')?.getAttribute('aria-label'), rowh:document.querySelectorAll('#currTbody td[role=rowheader]').length,
        cell:document.querySelector('#currTbody .block-cell[role=button][tabindex="0"]')?.getAttribute('aria-label')||'', view:document.getElementById('viewLabel').textContent,
        allOn:document.getElementById('btnAllCurr').classList.contains('active')}))()""")
    ok('n219: the Overview has the intern layout — line icons (no emoji), initials chips, the journey line and the hero atmosphere', lay['svgIcons'] == 8 and not lay['emoji'] and lay['chips'] > 40 and lay['journey'] and lay['atmos'], lay)
    ok('n219: …and keeps its accessibility — service names are buttons, rows have headers, cells are named buttons', lay['btn'] == 'Open Emergency Medicine I' and lay['rowh'] == 8 and lay['cell'].startswith('Emergency Medicine I, March group Block 01, Mar 16 – Apr 19:'), lay)
    ok('n219: the Overview opens on the Entire class', lay['view'] == 'Entire class' and lay['allOn'], lay)
    hd = await pg.evaluate(HEADQ)
    ok('n219: the Overview shows both groups — 13 blocks from Mar 16, 2026 to Jul 5, 2027, Monday to Sunday', len(hd) == 13 and hd[0]['d'] == 'Mar 16 – Apr 19' and hd[3]['d'] == 'Jul 6 – Aug 9' and hd[12]['d'] == 'May 24 – Jul 5', hd)
    ok('n219: each column names both groups — Block 04 (Oct 19 – Nov 22) is the March group’s 07; the first three are the March group’s own', hd[6]['n'] == 'BLOCK 04' and hd[6]['d'] == 'Oct 19 – Nov 22' and hd[6]['s'] == 'March group: 07' and hd[6]['cur'] and hd[0]['n'] == 'MARCH GROUP' and hd[0]['s'] == 'Block 01' and hd[9]['s'] == '', hd)
    b3 = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',5), im:f('im',5), m1:[f('im',0),f('surg',0),f('gp',0)]}}; }})()")
    ok('n219: Block 03 (Sep 14 – Oct 18) is right — Sarah on Emergency Medicine I, Marissa on Internal Medicine', b3['em1'] == ['SH'] and b3['im'] == ['MP'], b3)
    ok('n219: the March group’s first rotations are on the Overview (Mar 16: Jordan IM, Alexa Surgery, Rachel GP)', b3['m1'] == [['JH'], ['AV'], ['RE']], b3)
    hc = await pg.evaluate("(()=>({b:hbcBlock.textContent,d:hbcDates.textContent,c:hbcCountdown.textContent,n:hbcNext.textContent,g:[...document.querySelectorAll('.pvx-grp-m')].map(x=>x.textContent),bl:[...document.querySelectorAll('.hero-stat-num')][0].textContent}))()")
    ok('n219: on Mon Oct 19 the current block is Block 04, Oct 19 – Nov 22, 35 days left; next begins Mon Nov 23', hc['b'] == 'BLOCK 04' and hc['d'] == 'Oct 19 – Nov 22' and hc['c'] == '35 days remaining' and hc['n'] == 'Next: Block 05 begins Nov 23', hc)
    ok('n219: the hero has both groups’ terms (March group ends Feb 23, 2027; July group Jul 5, 2027)', hc['bl'] == '9 · 10' and 'ends February 23, 2027' in hc['g'][0] and 'ends July 5, 2027' in hc['g'][1] and hc['g'][0].startswith('Week 35 of 52'), hc)
    tl = await pg.evaluate("[...document.querySelectorAll('#pvxTimeline .pvx-tl-group')].map(g=>[...g.querySelectorAll('.pvx-tl-step')].map(s=>[s.querySelector('.pvx-tl-t').textContent,s.querySelector('.pvx-tl-w').textContent,s.className.replace('pvx-tl-step ','')]))")
    ok('n219: the program timeline — March group: orientation Feb 23 – Mar 1, shadow rotations Mar 2 – Mar 15, Blocks 01–09, the last 16 days not assigned yet, ends Tue Feb 23, 2027',
       [s[:2] for s in tl[0]] == [['Orientation', 'Feb 23 – Mar 1'], ['Shadow rotations', 'Mar 2 – Mar 15'], ['Blocks 01–09', 'Mar 16, 2026 – Feb 7, 2027'], ['Not assigned yet', 'Feb 8 – Feb 23'], ['Program ends', 'Tue, Feb 23, 2027']] and tl[0][2][2] == 'is-now', tl)
    ok('n219: …July group: orientation Jun 15 – 21, shadow rotations Jun 22 – Jul 5 (linked to the shadow schedule), Blocks 01–10, ends Mon Jul 5, 2027',
       [s[:2] for s in tl[1]] == [['Orientation', 'Jun 15 – Jun 21'], ['Shadow rotations', 'Jun 22 – Jul 5'], ['Blocks 01–10', 'Jul 6, 2026 – Jul 5, 2027'], ['Program ends', 'Mon, Jul 5, 2027']]
       and await pg.evaluate("document.querySelectorAll('#pvxTimeline a[href=\"/sgvp/shadow-schedule/\"]').length") == 1, tl)
    sr = await pg.evaluate("""(async()=>{ const i=document.getElementById('currSearch'); i.value='kristi'; onCurrSearch('kristi'); await new Promise(r=>setTimeout(r,200));
        const rows=[...document.querySelectorAll('#currTbody .svc-name')].map(x=>x.dataset.id); i.value=''; onCurrSearch(''); return rows; })()""")
    ok('n219: search finds an intern (Kristi’s services stay, the others go)', 'surg' in sr and 'em1' in sr and 'elec' not in sr, sr)
    await pg.focus('#currTbody tr:first-child td.block-col:nth-child(8) .block-cell'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
    dr = await pg.evaluate("(()=>({open:document.getElementById('svcDrawer').classList.contains('open'), t:(document.getElementById('svcDrawerTitle')||{}).textContent}))()")
    ok('n219: Enter on a cell opens the service (no more link to the missing /sgvp/calendar)', dr['open'] and dr['t'] == 'Emergency Medicine I' and 'href="/sgvp/calendar' not in await pg.content(), dr)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    el = await pg.evaluate("""(()=>{const tr=[...document.querySelectorAll('#currTbody tr')].find(t=>t.querySelector('.svc-name')?.dataset.id==='elec'); const td=tr.children[4]; const c=td.querySelector('.cell-initials');
        return {t:c.textContent.replace(/\\s+/g,' ').trim(), title:c.getAttribute('title'), aria:td.querySelector('.block-cell').getAttribute('aria-label')}; })()""")
    ok('n219: Marissa’s Block 01 elective shows “Cardiology”, and names Newtown Veterinary Specialists on hover and to VoiceOver',
       el['t'] == 'MPCardiology' and el['title'] == 'Marissa Peck (Cardiology at Newtown Veterinary Specialists)' and 'Marissa Peck (Cardiology at Newtown Veterinary Specialists)' in el['aria'], el)
    await pg.evaluate("openSvcDrawer('elec')"); await pg.wait_for_timeout(400)
    aw = await pg.evaluate("(()=>{const a=document.querySelector('#svcDrawerBody .pvx-away'); return a?{t:a.innerText.replace(/\\s+/g,' '), mail:a.querySelector('a[href^=\"mailto:\"]')?.getAttribute('href'), tel:a.querySelector('a[href^=\"tel:\"]')?.getAttribute('href'), icons:a.querySelectorAll('.drawer-field-icon svg').length}:null; })()")
    ok('n219: the Elective panel lists the away rotation — Dr. Dana Rucinski, email, phone, address, Monday–Thursday 8 a.m., license and PLIT coverage',
       aw and 'Cardiology · Newtown Veterinary Specialists' in aw['t'] and 'Marissa Peck · Block 01, Jul 6 – Aug 9' in aw['t'] and 'Dr. Dana Rucinski · Cardiology' in aw['t']
       and '52 Church Hill Road, Newtown, CT 06470' in aw['t'] and 'Monday–Thursday, 8 a.m. arrival' in aw['t'] and 'Veterinary license and PLIT coverage documentation' in aw['t']
       and aw['mail'] == 'mailto:dana.rucinski@medvet.com' and aw['tel'] == 'tel:+12032708387' and aw['icons'] == 6, aw)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.evaluate("openSvcDrawer('gp')"); await pg.wait_for_timeout(400)
    gp = await pg.evaluate("(()=>{const b=document.getElementById('svcDrawerBody'); return {t:b.innerText.replace(/\\s+/g,' '), tel:b.querySelector('a[href^=\"tel:\"]')?.getAttribute('href'), prof:b.querySelector('a[href*=\"lee-lipsitz\"]')?.getAttribute('target')}; })()")
    ok('n219: General Practice is at VCA Baybrook — Medical Director Dr. Lee Lipsitz (profile), 56 Quirk Road, Milford, 203-882-8600 (tap to call)',
       'medical director dr. lee lipsitz, dvm, phd' in gp['t'].lower() and 'March group Block 01 Mar 16 – Apr 19 RE' in gp['t'] and 'Block M1' not in gp['t'] and 'VCA Baybrook Animal Hospital' in gp['t'] and '56 Quirk Road, Milford, CT 06460' in gp['t'] and gp['tel'] == 'tel:+12038828600' and gp['prof'] == '_blank', gp)
    rg = await pg.evaluate("document.getElementById('pvxPlanRange').textContent")
    ok('n219: the plan opens on the July group’s Block 01 and says what is shown by date', rg.startswith('Jul 6 – ') and rg.endswith(' shown · scroll for more'), rg)
    # an admin's saved move counts under the Monday date only; the old Sunday-dated record is ignored
    await pg.evaluate("firebase.firestore().collection('curriculum').doc('grid').set({gridByDate:{em1:{'2026-09-13':'MP'}, im:{'2026-09-13':'SH'}, gp:{'2026-11-23':'KW'}}},{merge:true})")
    await pg.wait_for_timeout(600)
    sv = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',5), gp5:f('gp',7)}}; }})()")
    ok('n219: the saved grid — a Monday-dated entry shows, an old Sunday-dated one (the Overview’s swap) does not', sv['em1'] == ['SH'] and sv['gp5'] == ['KW'], sv)
    # ----- the rules pass: type floor, sentence case, flat content, line icons, quiet saving, Move menu with Undo -----
    small = await pg.evaluate("""(()=>{ const out=[]; document.querySelectorAll('body *').forEach(el=>{ if(el.closest('.pvx-sr,[hidden],script,style,svg,#pvxCurrMsgs,#pvxTopnav')) return;
        const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' '); if(!t) return;
        const r=el.getBoundingClientRect(); if(!r.width||!r.height) return; const fs=parseFloat(getComputedStyle(el).fontSize); if(fs<10.95) out.push([t.slice(0,30),fs]); });
        document.querySelectorAll('#currThead th.block-th').forEach(th=>{ const fs=parseFloat(getComputedStyle(th,'::after').fontSize); const ct=getComputedStyle(th,'::after').content; if(ct!=='none'&&ct!=='""'&&ct!=="''"&&fs<10.95) out.push(['th::after',fs]); });
        return out; })()""")
    ok('n219: no text under 11 pt on the Overview', not small, small[:8])
    txt = await pg.evaluate("document.body.innerText")
    tc = [w for w in ['Days Remaining', 'Weeks Left', 'Curriculum Legend', 'Intern Legend', 'Department Info', 'Schedule in this Service', 'Clinical Services', '13 Rotations', 'Resident Coverage', 'Current Block'] if w in txt]
    pw = await pg.evaluate("(()=>{const i=document.getElementById('currSearch'); const c=document.createElement('canvas').getContext('2d'); const cs=getComputedStyle(i); c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily; return [Math.ceil(c.measureText(i.placeholder).width), i.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)]; })()")
    ok('n219: the search placeholder fits its field', pw[0] <= pw[1], pw)
    ok('n219: sentence case (no “Days Remaining”, “Curriculum Legend”, “13 Rotations”…)', not tc and await pg.evaluate("document.getElementById('currSearch').placeholder") == 'Search services, directors and interns', tc)
    bf = await pg.evaluate("['.legend-card','.table-card','#pvxTimeline','.curr-hero','.svc-drawer','.svc-drawer-overlay'].map(q=>{const e=document.querySelector(q); return e?getComputedStyle(e).backdropFilter:'missing';})")
    ok('n219: content is flat — no blur on the cards, the hero, the service panel or its backdrop', all(x == 'none' for x in bf), bf)
    await pg.evaluate("openSvcDrawer('em1')"); await pg.wait_for_timeout(400)
    ic = await pg.evaluate("(()=>{const b=document.getElementById('svcDrawerBody'); return {svg:b.querySelectorAll('.drawer-field-icon svg').length, emoji:/[\\u{1F300}-\\u{1FAFF}]/u.test(b.textContent), st:[...b.querySelectorAll('div')].filter(d=>/^(✓|●|◦) /.test(d.textContent)).map(d=>parseFloat(getComputedStyle(d).fontSize))}; })()")
    ok('n219: the service panel uses Pravix line icons (no emoji) and 11 pt status words', ic['svg'] == 3 and not ic['emoji'] and ic['st'] and min(ic['st']) >= 11, ic)
    await pg.evaluate("closeSvcDrawer()"); await pg.wait_for_timeout(300)
    quiet = await pg.evaluate("(()=>{const t=document.body.innerText; return !/Admin mode|Schedule saved/.test(t); })()")
    ok('n219: saving is silent (no “Admin mode” or “Schedule saved” messages)', quiet)
    chip = await pg.evaluate("(()=>{const tr=[...document.querySelectorAll('#currTbody tr')].find(t=>t.querySelector('.svc-name')?.dataset.id==='em1'); const c=tr.children[7].querySelector('.cell-initials'); return {i:c.dataset.init, role:c.getAttribute('role'), lab:c.getAttribute('aria-label'), pop:c.getAttribute('aria-haspopup'), tab:c.tabIndex}; })()")
    ok('n219: for an admin each intern is a named button that opens a menu (“Move Kristi Wenger…”)', chip == {'i': 'KW', 'role': 'button', 'lab': 'Move Kristi Wenger…', 'pop': 'menu', 'tab': 0}, chip)
    await pg.locator('#currTbody tr:first-child td:nth-child(8) .cell-initials').focus(); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(350)
    mn = await pg.evaluate("(()=>{const l=document.querySelector('.pvx-cx-list[role=menu]'); return l?{lab:l.getAttribute('aria-label'), items:[...l.querySelectorAll('button')].map(b=>[b.textContent.trim(),b.getAttribute('aria-checked')])}:null; })()")
    ok('n219: Return opens “Move Kristi Wenger · Block 04” with every service, Emergency Medicine I checked; no drawer opens',
       mn and mn['lab'] == 'Move Kristi Wenger · Block 04' and len(mn['items']) == 8 and ['Emergency Medicine I', 'true'] in mn['items'] and ['Surgery', 'false'] in mn['items']
       and not await pg.evaluate("document.getElementById('svcDrawer').classList.contains('open')"), mn)
    await pg.locator('.pvx-cx-list button:has-text("Surgery")').click(); await pg.wait_for_timeout(500)
    mv = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',6), surg:f('surg',6), msg:[...document.querySelectorAll('#pvxCurrMsgs .pvx-msg')].map(m=>m.innerText.replace(/\\s+/g,' ')), saved:(window.__fs['curriculum/grid']||{{}}).gridByDate}}; }})()")
    ok('n219: moving Kristi to Surgery moves her, saves under the Monday date, and says so with Undo',
       mv['em1'] == [] and 'KW' in mv['surg'] and mv['msg'][-1] == 'Kristi Wenger moved to Surgery · Block 04 Undo' and 'KW' in mv['saved']['surg']['2026-10-19'], mv)
    await pg.locator('#pvxCurrMsgs .pvx-msg-a').last.click(); await pg.wait_for_timeout(500)
    un = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',6), surg:f('surg',6), saved:window.__fs['curriculum/grid'].gridByDate.em1['2026-10-19']}}; }})()")
    ok('n219: Undo puts her back (and saves that)', un['em1'] == ['KW'] and 'KW' not in un['surg'] and un['saved'] == 'KW', un)
    await pg.keyboard.press('Meta+Shift+z'); await pg.wait_for_timeout(400)
    rd = await pg.evaluate(f"(()=>{{const f={CELLQ}; return f('surg',6); }})()")
    await pg.keyboard.press('Meta+z'); await pg.wait_for_timeout(400)
    ud = await pg.evaluate(f"(()=>{{const f={CELLQ}; return f('em1',6); }})()")
    ok('n219: ⇧⌘Z redoes the move and ⌘Z undoes it again', 'KW' in rd and ud == ['KW'], (rd, ud))
    await pg.evaluate("pvxCurrMsg('Not saved. Check that you’re signed in with an admin account, then try again.',{fail:true})"); await pg.wait_for_timeout(4600)
    fl = await pg.evaluate("(()=>{const m=[...document.querySelectorAll('#pvxCurrMsgs .pvx-msg.is-fail')]; return m.length?{role:m[0].getAttribute('role'), close:!!m[0].querySelector('.pvx-msg-x[aria-label=Close]')}:null; })()")
    ok('n219: a failed save stays (role=alert) until closed', fl == {'role': 'alert', 'close': True}, fl)
    ok('n219: no page errors on the Overview', not errs, errs[:3])
    await pg.locator('.page-content').screenshot(path=os.path.join(SHOTS, 'n219-overview.png'))
    await ctx.close()
    # Sunday Oct 18 is still Block 03
    ctx, pg, errs = await cur_page('sgvp/', '2026-10-18T15:00:00')
    hd = await pg.evaluate(HEADQ)
    ok('n219: on Sunday Oct 18 Block 03 is still current (blocks end on Sunday, the next starts Monday)', hd[5]['cur'] and not hd[6]['cur'], [h['cur'] for h in hd])
    await ctx.close()
    # ?me=JH on the Overview: the March group's own numbering and term
    ctx, pg, errs = await cur_page('sgvp/?me=JH')
    me = await pg.evaluate(f"(()=>({{h:{HEADQ}, v:viewLabel.textContent, b:hbcBlock.textContent, n:hbcNext.textContent, m:progMeta.textContent.replace(/\\s+/g,' ')}}))()")
    ok('n219: ?me=JH on the Overview — Jordan’s own Block 07, her term, and the blocks after Feb 23 marked after her program',
       me['v'] == 'Jordan Hanson' and me['b'] == 'BLOCK 07' and me['n'] == 'Next: Block 08 begins Nov 23' and 'Program ends February 23, 2027' in me['m']
       and [h['out'] for h in me['h']][9:] == ['', 'After program', 'After program', 'After program'] and me['h'][0]['out'] == '', me)
    await ctx.close()
    # an intern page: Jordan (March group)
    ctx, pg, errs = await cur_page('sgvp/interns/jordan-hanson/curriculum/')
    jh = await pg.evaluate(f"(()=>({{h:{HEADQ}, b:hbcBlock.textContent, bl:[...document.querySelectorAll('.hero-stat-num')][0].textContent, m:progMeta.textContent.replace(/\\s+/g,' '), sub:document.querySelector('.hero-sub').textContent, tlg:document.querySelectorAll('#pvxTimeline .pvx-tl-group').length}}))()")
    ok('n219: Jordan’s curriculum — 9 blocks from Mar 16, Block 07 now (Oct 19 – Nov 22), then her final weeks Feb 8 – Feb 23 “Not assigned yet” (no Block 10 after her program)',
       len(jh['h']) == 10 and jh['h'][0]['d'] == 'Mar 16 – Apr 19' and jh['h'][6]['cur'] and jh['h'][6]['d'] == 'Oct 19 – Nov 22' and jh['h'][9]['n'] == 'FINAL WEEKS' and jh['h'][9]['d'] == 'Feb 8 – Feb 23' and jh['h'][9]['s'] == 'Not assigned yet' and jh['bl'] == '9' and jh['b'] == 'BLOCK 07', jh)
    ok('n219: …her term is the agreement’s — 52 weeks, ends February 23, 2027; one timeline (hers)', 'Program ends February 23, 2027' in jh['m'] and ' '.join(jh['sub'].split()) == '9 blocks · 6 clinical services · 52 weeks' and 'Week 35 of 52' in jh['m'] and jh['tlg'] == 1, jh)
    jc = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{onco:f('onco',6), em2:[f('em2',7),f('em2',8)]}}; }})()")
    ok('n219: Jordan: Oncology now (Block 07), ER II in Blocks 08 and 09 (as she confirmed)', jc['onco'] == ['JH'] and jc['em2'] == [['JH', 'RE'], ['JH']], jc)
    ok('n219: no page errors on Jordan’s curriculum', not errs, errs[:3])
    await pg.locator('.page-content').screenshot(path=os.path.join(SHOTS, 'n219-jordan.png'))
    await ctx.close()
    for slug, first, n in [('sarah-herron', 'Jul 6 – Aug 9', 10), ('marissa-peck', 'Jul 6 – Aug 9', 10), ('rachel-eberle', 'Mar 16 – Apr 19', 10), ('alexa-vander-ploeg', 'Mar 16 – Apr 19', 10), ('benjamin-kerns', 'Jul 6 – Aug 9', 10), ('kristi-wenger', 'Jul 6 – Aug 9', 10)]:
        ctx, pg, errs = await cur_page(f'sgvp/interns/{slug}/curriculum/')
        h = await pg.evaluate(HEADQ)
        sw = await pg.evaluate("[...document.querySelectorAll('nav.switcher a')].map(a=>a.getAttribute('href'))")
        ok(f'n219: {slug}: same layout and dates ({first} first), its own sub-nav, no errors', len(h) == n and h[0]['d'] == first and f'/sgvp/interns/{slug}/curriculum/' in sw and not errs, (h[:2], sw, errs[:2]))
        if slug == 'sarah-herron':
            c3 = await pg.evaluate(f"(()=>{{const f={CELLQ}; setView('all'); return {{em1:f('em1',2), im:f('im',2)}}; }})()")
            ok('n219: Sarah’s page has her Block 03 on Emergency Medicine I', 'SH' in (c3['em1'] or []) and 'SH' not in (c3['im'] or []), c3)
        await ctx.close()
    # light mode: the light hero's labels are dark ink
    ctx, pg, errs = await cur_page('sgvp/', dark=False)
    col = await pg.evaluate("[getComputedStyle(document.querySelector('.hero-stat-label')).color, getComputedStyle(document.querySelector('.hbc-label')).color]")
    ok('n219: light mode — the hero labels are readable (dark ink, not white)', col == ['rgb(82, 105, 138)', 'rgb(82, 105, 138)'], col)
    await ctx.close()
    # someone who isn't an admin: interns aren't buttons; a click opens the service
    ctx, pg, errs = await new_page(br, user='{"uid":"u2","email":"resident.a@vca.com","displayName":"Resident A"}', vp=(1440, 900))
    await ctx.add_init_script(CLOCK % '2026-10-19T10:00:00')
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/curriculum/'); await pg.wait_for_timeout(2600)
    na = await pg.evaluate("(()=>{const c=document.querySelector('#currTbody .cell-initials'); const r={role:c.getAttribute('role'), tab:c.getAttribute('tabindex')}; c.click(); return r; })()")
    await pg.wait_for_timeout(400)
    ok('n219: for everyone else the interns are plain text, and clicking one opens the service', na == {'role': None, 'tab': None} and await pg.evaluate("document.getElementById('svcDrawer').classList.contains('open')") and not await pg.evaluate("!!document.querySelector('.pvx-cx-list')"), na)
    await ctx.close()
    # phone: the plan opens at the current block
    ctx, pg, errs = await cur_page('sgvp/interns/kristi-wenger/curriculum/', vp=(390, 844), touch=True)
    vis = await pg.evaluate("(()=>{const sc=pvxPlanScroll, th=document.querySelector('#currThead th.is-current'), r=sc.getBoundingClientRect(), b=th.getBoundingClientRect(); return b.left>=r.left-2&&b.right<=r.right+2; })()")
    ok('n219: on a phone the plan opens at the current block', vis, vis)
    pn = await pg.evaluate("[...document.querySelectorAll('.pvx-pn')].map(b=>[Math.round(b.getBoundingClientRect().width),Math.round(b.getBoundingClientRect().height)])")
    ok('n219: on touch the ‹ › buttons are 44 × 44 pt', pn and all(w >= 44 and h >= 44 for w, h in pn), pn)

    await pg.screenshot(path=os.path.join(SHOTS, 'n219-phone.png'), full_page=False)
    await ctx.close()
    # profiles, mentors
    ctx, pg, errs = await cur_page('sgvp/interns/jordan-hanson/')
    pf = await pg.evaluate("(()=>({tl:[...document.querySelectorAll('#timelineContainer .timeline-item')].map(x=>x.querySelector('.tl-title').textContent+' | '+x.querySelector('.tl-dates').textContent), sd:document.querySelector('[data-key=startDate]').textContent, gd:document.querySelector('[data-key=gradDate]').textContent, dr:document.querySelector('[data-key=daysRemaining]').textContent, cur:document.querySelector('[data-key=currentRotation]').textContent}))()")
    ok('n219: Jordan’s profile — her term (Feb 23, 2026 – Feb 23, 2027), 127 days left on Oct 19, Oncology now, 9 rotations on the Monday dates',
       pf['sd'] == 'February 23, 2026' and pf['gd'] == 'February 23, 2027' and pf['dr'] == '127' and pf['cur'] == 'Oncology' and len(pf['tl']) == 9 and pf['tl'][0] == 'Internal Medicine | Mar 16 – Apr 19, 2026' and pf['tl'][6] == 'Oncology | Oct 19 – Nov 22, 2026', pf)
    ok('n219: no page errors on Jordan’s profile', not errs, errs[:3])
    await ctx.close()
    ctx, pg, errs = await cur_page('sgvp/interns/sarah-herron/')
    pf = await pg.evaluate("[...document.querySelectorAll('#timelineContainer .timeline-item')].map(x=>x.querySelector('.tl-title').textContent+' | '+x.querySelector('.tl-dates').textContent)")
    ok('n219: Sarah’s profile — Block 03 Emergency Medicine I (Sep 14 – Oct 18), ends Jul 5, 2027', pf[2] == 'Emergency Medicine I | Sep 14 – Oct 18, 2026' and pf[-1] == 'Oncology | May 24 – Jul 5, 2027', pf)
    await ctx.close()
    ctx, pg, errs = await cur_page('sgvp/interns/marissa-peck/')
    pf = await pg.evaluate("[...document.querySelectorAll('#timelineContainer .timeline-item')].map(x=>x.querySelector('.tl-title').textContent+' | '+x.querySelector('.tl-dates').textContent)")
    ok('n219: Marissa’s profile — Block 01 is Cardiology · Newtown Veterinary Specialists (Jul 6 – Aug 9), Block 03 Internal Medicine', pf[0] == 'Cardiology · Newtown Veterinary Specialists | Jul 6 – Aug 9, 2026' and pf[2] == 'Internal Medicine | Sep 14 – Oct 18, 2026', pf)
    await ctx.close()
    ctx, pg, errs = await cur_page('sgvp/mentors/')
    mr = await pg.evaluate("(()=>({sh:INTERN_ROTATIONS['Sarah Herron'][2], mp:INTERN_ROTATIONS['Marissa Peck'][0].svc, mp3:INTERN_ROTATIONS['Marissa Peck'][2].svc, jh:INTERN_ROTATIONS['Jordan Hanson'].length}))()")
    ok('n219: the mentors page has the same schedule (Sarah EM I in Block 03, Marissa IM; Marissa’s elective is still Cardiology)', mr['sh'] == {'svc': 'Emergency Medicine I', 'start': '2026-09-14', 'end': '2026-10-19'} and mr['mp3'] == 'Internal Medicine' and mr['mp'] == 'Cardiology' and mr['jh'] == 9, mr)
    await ctx.close()


@section(id='n220', title='n220: schedule check, today at Shoreline, ask the curriculum',
         apps=['sgvp'], topics=['behaviour'])
async def s_n220(br):
    FU220 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    CL220 = "(()=>{const D=Date,T=new D('2026-10-19T10:00:00').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()"
    async def p220(path, vp=(1440, 900), user=FU220, touch=False):
        c, p, e = await new_page(br, user=user, vp=vp, touch=touch)
        await c.add_init_script(CL220)
        await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
        return c, p, e
    ctx, pg, errs = await p220('sgvp/')
    td = await pg.evaluate("[...document.querySelectorAll('#pvxTodayTiles .pvx-td')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())")
    ok('n220: Today at Shoreline — a tile per service: who is on it now, until when, who is next',
       len(td) == 8 and td[0] == 'Emergency Medicine I Kristi Wenger until Nov 22 Next: Marissa from Nov 23' and td[1] == 'Emergency Medicine II Alexa Vander Ploeg Sarah Herron until Nov 22 Next: Jordan, Rachel from Nov 23'
       and td[2].startswith('Internal Medicine LIU student Caroline Smith from Oct 26') and td[7] == 'Elective No intern Next block: no intern yet', td)
    wh = await pg.evaluate("document.getElementById('pvxTodayWhen').textContent")
    ok('n220: …dated, with the block in both numberings', wh == 'Monday, October 19 · Block 04 (March group 07), Oct 19 – Nov 22', wh)
    await pg.locator('#pvxTodayTiles .pvx-td').nth(3).click(); await pg.wait_for_timeout(400)
    ok('n220: a tile opens its service', await pg.evaluate("document.getElementById('svcDrawer').classList.contains('open') && document.getElementById('svcDrawerTitle').textContent==='Surgery'"))
    await pg.evaluate("closeSvcDrawer()"); await pg.wait_for_timeout(300)
    QA = [("Who’s on Surgery?", 'Now (Block 04 · March group 07, Oct 19 – Nov 22): Surgery has Rachel Eberle. Next, from Nov 23: Benjamin Kerns.', 2),
          ('When is Kristi on Oncology?', 'Kristi Wenger is on Oncology in Block 05 (Nov 23 – Jan 3, 2027).', 1),
          ('Where is Jordan on Dec 7?', 'On Mon, Dec 7, Jordan Hanson will be on Emergency Medicine II (Block 08, Nov 23 – Jan 3).', 1),
          ('Is there a student on IM next week?', 'Yes. LIU student Caroline Smith (Year 4) is on Internal Medicine, Oct 26 – Nov 22, 2026.', 1),
          ('Who’s in the ER the week of Dec 7?', 'The week of Dec 7 (Block 05 · March group 08, Nov 23 – Jan 3): Emergency Medicine I — Marissa Peck; Emergency Medicine II — Jordan Hanson and Rachel Eberle.', 2),
          ('When is Rachel in the ER?', 'Rachel Eberle is on Emergency Medicine I in Block 05 (Aug 10 – Sep 13, 2026) and Emergency Medicine II in Block 08 (Nov 23 – Jan 3, 2027).', 2),
          ('Where was Marissa in block 1?', 'In Block 01 (Jul 6 – Aug 9), Marissa Peck was on Cardiology at Newtown Veterinary Specialists (elective).', 1),
          ('When does Sarah graduate?', 'Sarah Herron is in the July group: Jun 15, 2026 to Jul 5, 2027.', 0),
          ('What is VREC?', 'VREC means resident coverage: a resident covers that service instead of an intern.', 0)]
    bad = []
    for q, want, nh in QA:
        await pg.fill('#pvxAskIn', q); await pg.press('#pvxAskIn', 'Enter'); await pg.wait_for_timeout(250)
        got = await pg.evaluate("[document.getElementById('pvxAskOut').textContent, document.querySelectorAll('#currTbody td.pvx-hit').length]")
        if got != [want, nh]: bad.append((q, got))
    ok('n220: Ask the curriculum answers from the schedule and highlights the cells it used (9 questions)', not bad, bad)
    await pg.fill('#pvxAskIn', 'what is the weather'); await pg.press('#pvxAskIn', 'Enter'); await pg.wait_for_timeout(200)
    un = await pg.evaluate("[document.getElementById('pvxAskOut').textContent, document.getElementById('pvxAskOut').getAttribute('role'), document.querySelectorAll('#currTbody td.pvx-hit').length]")
    ok('n220: a question it can’t answer says what it can do (and highlights nothing); answers are announced (role=status)', un[0].startswith('I can answer who’s on a service') and un[1] == 'status' and un[2] == 0, un)
    await pg.locator('#pvxAsk .pvx-ask-ex').nth(1).click(); await pg.wait_for_timeout(250)
    ex = await pg.evaluate("[document.getElementById('pvxAskIn').value, document.getElementById('pvxAskOut').textContent]")
    await pg.focus('#pvxAskIn'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    esc_ = await pg.evaluate("[document.getElementById('pvxAskIn').value, document.getElementById('pvxAskOut').textContent, document.querySelectorAll('#currTbody td.pvx-hit').length]")
    ok('n220: an example question asks itself; Esc clears the question, the answer and the highlights', ex[1] == 'Kristi Wenger is on Oncology in Block 05 (Nov 23 – Jan 3, 2027).' and esc_ == ['', '', 0], (ex, esc_))
    ck = await pg.evaluate("(()=>({k:document.querySelector('#pvxCheck .pvx-tl-key').textContent, items:[...document.querySelectorAll('#pvxCheck .pvx-ck-i')].map(x=>x.querySelector('span').textContent), gaps:[...document.querySelectorAll('#currTbody td.pvx-gap')].map(td=>td.dataset.svc+'-'+td.dataset.block)}))()")
    ok('n220: Schedule check — 6 things: ER II and Surgery empty in Block 07, the March group’s Feb 8 – 23, ER I empty in Blocks 09 and 10, Surgery in Block 10',
       ck['k'] == '6 things to look at' and ck['items'] == ['No intern on Emergency Medicine II · Block 07, Feb 8 – Mar 14', 'No intern on Surgery · Block 07, Feb 8 – Mar 14',
                                                         'March group (Jordan, Rachel, Alexa) · Feb 8 – Feb 23: no rotation assigned yet', 'No intern on Emergency Medicine I · Block 09, Apr 19 – May 23'], ck)
    ok('n223: the plan no longer marks uncovered cells “Not covered” (the gaps stay in the Schedule check)', ck['gaps'] == [] and 'Not covered' not in await pg.evaluate('document.getElementById("currTbody").innerText'), ck['gaps'])
    await pg.locator('#pvxCheck .pvx-ck-more').click(); await pg.wait_for_timeout(200)
    n_all = await pg.evaluate("[document.querySelectorAll('#pvxCheck .pvx-ck-i').length, document.querySelector('#pvxCheck .pvx-ck-more').getAttribute('aria-expanded'), document.activeElement.className]")
    ok('n220: “Show all 6” opens the full list (and keeps focus on it)', n_all == [6, 'true', 'pvx-ck-more'], n_all)
    await pg.locator('#pvxCheck .pvx-ck-b').first.click(); await pg.wait_for_timeout(300)
    hl = await pg.evaluate("[...document.querySelectorAll('#currTbody td.pvx-hit')].map(td=>td.dataset.svc+'-'+td.dataset.block)")
    ok('n220: Show highlights that cell in the plan', hl == ['em2-07'], hl)
    await pg.evaluate("pvxCurrMove('SH','neuro','07','em2','07')"); await pg.wait_for_timeout(500)
    ck2 = await pg.evaluate("[...document.querySelectorAll('#pvxCheck .pvx-ck-i')].map(x=>x.querySelector('span').textContent)")
    ok('n220: the check follows the schedule — moving Sarah to ER II in Block 07 clears that gap and flags Neurology instead',
       'No intern on Emergency Medicine II · Block 07, Feb 8 – Mar 14' not in ck2 and 'No intern on Neurology · Block 07, Feb 8 – Mar 14' in ck2, ck2)
    await pg.evaluate("pvxCurrUndo()"); await pg.wait_for_timeout(400)
    small = await pg.evaluate("""(()=>{ const out=[]; document.querySelectorAll('#pvxAsk *,#pvxCheck *').forEach(el=>{ if(el.closest('.pvx-sr,[hidden],svg')) return;
        const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length; if(!t) return; const fs=parseFloat(getComputedStyle(el).fontSize); if(fs<10.95) out.push([el.className,fs]); }); return out; })()""")
    ok('n220: nothing under 11 pt in the new cards; no page errors', not small and not errs, (small, errs[:2]))
    await pg.locator('#pvxAsk').screenshot(path=os.path.join(SHOTS, 'n220-today.png'))
    await ctx.close()
    ctx, pg, errs = await p220('sgvp/interns/kristi-wenger/curriculum/')
    ki = await pg.evaluate("(()=>({t:document.getElementById('pvxTodayTitle').textContent, tiles:document.getElementById('pvxTodayTiles').hidden, ck:document.getElementById('pvxCheck').hidden}))()")
    await pg.fill('#pvxAskIn', 'Where am I next block?'); await pg.press('#pvxAskIn', 'Enter'); await pg.wait_for_timeout(250)
    ka = await pg.evaluate("document.getElementById('pvxAskOut').textContent")
    ok('n220: an intern’s page — “Ask the curriculum” (no tiles), “I” means Kristi, and no check card when nothing concerns her',
       ki == {'t': 'Ask the curriculum', 'tiles': True, 'ck': True} and ka == 'Next block, Kristi Wenger will be on Oncology (Block 05, Nov 23 – Jan 3).', (ki, ka))
    await ctx.close()
    ctx, pg, errs = await p220('sgvp/interns/jordan-hanson/curriculum/')
    ji = await pg.evaluate("[document.getElementById('pvxCheck').hidden, [...document.querySelectorAll('#pvxCheck .pvx-ck-i')].map(x=>x.querySelector('span').textContent)]")
    ok('n220: Jordan’s page shows only what concerns her — her group’s unassigned Feb 8 – 23', ji == [False, ['March group (Jordan, Rachel, Alexa) · Feb 8 – Feb 23: no rotation assigned yet']], ji)
    await ctx.close()
    ctx, pg, errs = await p220('sgvp/', vp=(390, 844), touch=True)
    ph = await pg.evaluate("(()=>({over:document.documentElement.scrollWidth>innerWidth+1, cols:getComputedStyle(document.getElementById('pvxTodayTiles')).gridTemplateColumns.split(' ').length, go:Math.round(document.querySelector('.pvx-ask-go').getBoundingClientRect().height)}))()")
    ok('n220: on iPhone the cards fit (no sideways scroll), tiles stack, the Ask button is 44 pt', ph == {'over': False, 'cols': 1, 'go': 44}, ph)
    await ctx.close()


@section(id='n222', title='n222: SGVP catch-up audit (HIG)',
         apps=['flow', 'sgvp', 'topbar'], topics=['behaviour'])
async def s_n222(br):
    P222 = open(os.path.join(HERE, 'probe_n222.js')).read()
    PG222 = ['sgvp/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']
    agg = {}
    for path in PG222:
        for vp, touch in (((1440, 900), False), ((390, 844), True)):
            ctx, pg, errs = await p222(path, vp, touch)
            r = await pg.evaluate(P222); r['errs'] = errs[:2]
            r['drop'] = await pg.evaluate("(()=>{const dt=new DataTransfer(); try{dt.items.add(new File(['x'],'x.txt'));}catch(e){} const ev=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}); document.body.dispatchEvent(ev); return ev.defaultPrevented; })()")
            agg[path + '@' + str(vp[0])] = r
            await ctx.close()
    bad = {k: (v['fam'], v['famS']) for k, v in agg.items() if v['fam']}
    ok('n222: every SGVP page uses the system font, like Flow and Anesia (Inter is gone)', not bad, bad)
    bad = {k: v['smallS'] for k, v in agg.items() if v['small']}
    ok('n222: nothing under 11 pt on any SGVP page, Mac or iPhone (outside the shared top bar)', not bad, bad)
    bad = {k: v['glyphS'] for k, v in agg.items() if v['glyph']}
    ok('n222: no emoji or text characters as icons (line icons instead)', not bad, bad)
    bad = {k: v['backdropS'] for k, v in agg.items() if v['backdrop']}
    ok('n222: content is flat — no blur on cards, fields or modal backdrops (only floating controls)', not bad, bad)
    bad = {k: v['anims'] for k, v in agg.items() if v['anims']}
    ok('n222: nothing loops at rest except one live dot', not bad, bad)
    bad = {k: v['fakeS'] for k, v in agg.items() if v['fake']}
    ok('n222: everything clickable is a real button (legends, mentor cards, photos)', not bad, bad)
    bad = {k: v['unnamed'] for k, v in agg.items() if v['unnamed']}
    ok('n222: every control has a name', not bad, bad)
    bad = {k: v['small44S'] for k, v in agg.items() if k.endswith('@390') and v['small44']}
    ok('n222: on iPhone every control is 44 pt to touch (the plan’s initials grow an invisible touch area)', not bad, bad)
    bad = {k: (v['viewport'], v['themeColor']) for k, v in agg.items() if 'viewport-fit=cover' not in (v['viewport'] or '') or v['themeColor'] != ['#0A1222']}
    ok('n222: safe areas (viewport-fit) and a theme colour that matches the dark theme', not bad, bad)
    bad = {k: v['drop'] for k, v in agg.items() if not v['drop']}
    ok('n222: a file dropped on any SGVP page doesn’t replace it', not bad, bad)
    bad = {k: (v['apos'], v['longTips']) for k, v in agg.items() if v['apos'] or v['longTips']}
    ok('n222: curly apostrophes, and tooltips under 75 characters', not bad, bad)
    bad = {k: v['titleCase'] for k, v in agg.items() if v['titleCase']}
    ok('n222: sentence case for buttons, labels and headings', not bad, bad)
    bad = {k: v['errs'] for k, v in agg.items() if v['errs']}
    ok('n222: no page errors', not bad, bad)
    # light theme colour; reduced motion
    ctx, pg, errs = await p222('sgvp/mentors/', dark=False)
    lt = await pg.evaluate("[document.querySelector('meta[name=theme-color]').content, getComputedStyle(document.body).backgroundColor]")
    await pg.evaluate("document.body.classList.add('dark')"); await pg.wait_for_timeout(300)
    lt.append(await pg.evaluate("document.querySelector('meta[name=theme-color]').content"))
    ok('n222: the theme colour follows the theme (light #F2F4F8, then dark #0A1222)', lt == ['#F2F4F8', 'rgb(242, 244, 248)', '#0A1222'], lt)
    await ctx.close()
    rm = {}
    for path in PG222:
        c = await br.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        await c.add_init_script(INIT.replace('@@USER@@', FU222).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(CL222)
        p = await c.new_page()
        async def rt(r):
            u = r.request.url
            if u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await p.route('**/*', rt)
        await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
        n = await p.evaluate("document.getAnimations().filter(a=>a.playState==='running'&&a.effect.getComputedTiming().duration>1&&!(a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('#pvxTopnav'))).length")
        if n: rm[path] = n
        await c.close()
    ok('n222: with Reduce Motion nothing is moving on any SGVP page', not rm, rm)
    # search fields: type=search, Clear, Esc
    ctx, pg, errs = await p222('sgvp/')
    await pg.fill('#currSearch', 'kristi'); await pg.wait_for_timeout(250)
    s1 = await pg.evaluate("[document.getElementById('currSearch').type, document.getElementById('currSearch').getAttribute('enterkeyhint'), !document.querySelector('#currSearch ~ .pvx-clear').hidden, document.querySelector('#currSearch ~ .pvx-clear').getAttribute('aria-label'), document.querySelectorAll('#currTbody .svc-name').length]")
    await pg.click('#currSearch ~ .pvx-clear'); await pg.wait_for_timeout(250)
    s2 = await pg.evaluate("[document.getElementById('currSearch').value, document.activeElement.id, document.querySelectorAll('#currTbody .svc-name').length, document.querySelector('#currSearch ~ .pvx-clear').hidden]")
    await pg.fill('#currSearch', 'neuro'); await pg.press('#currSearch', 'Escape'); await pg.wait_for_timeout(250)
    s3 = await pg.evaluate("[document.getElementById('currSearch').value, document.querySelectorAll('#currTbody .svc-name').length]")
    ok('n222: the curriculum search is a search field with Clear ✕ (keeps focus) and Esc to clear', s1[:4] == ['search', 'search', True, 'Clear search'] and s1[4] < 8 and s2 == ['', 'currSearch', 8, True] and s3 == ['', 8], (s1, s2, s3))
    lg = await pg.evaluate("(()=>{const l=document.querySelector('.legend-item[data-svc=\"surg\"]'); return [l.getAttribute('role'), l.tabIndex, l.getAttribute('aria-pressed'), l.title]})()")
    await pg.focus('.legend-item[data-svc="surg"]'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
    lg2 = await pg.evaluate("document.querySelector('.legend-item[data-svc=\"surg\"]').getAttribute('aria-pressed')")
    ok('n222: the legend is toggle buttons — the keyboard reaches them, Return turns one on, and they say so', lg == ['button', 0, 'false', 'Highlight Surgery in the plan'] and lg2 == 'true', (lg, lg2))
    await ctx.close()
    # alerts instead of confirm(): the profile's Reset
    ctx, pg, errs = await p222('sgvp/interns/kristi-wenger/')
    await pg.evaluate("window.__dlg=0; window.confirm=function(){window.__dlg++;return false}; window.prompt=function(){window.__dlg++;return null}; 0")
    await pg.evaluate("resetSavedData()"); await pg.wait_for_timeout(300)
    al = await pg.evaluate("(()=>{const a=document.querySelector('.pvx-al[role=alertdialog]'); return a?{t:a.querySelector('.pvx-al-t').textContent, b:[...a.querySelectorAll('button')].map(b=>b.textContent), f:document.activeElement===a, d:a.getAttribute('aria-describedby')&&!!document.getElementById(a.getAttribute('aria-describedby')), native:window.__dlg}:null})()")
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
    still = await pg.evaluate("!!document.querySelector('.pvx-al[role=alertdialog]')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    gone = await pg.evaluate("!document.querySelector('.pvx-al')")
    ok('n222: profile Reset asks in a Pravix alert (not the browser’s) — Cancel · Reset, no default, Return does nothing, Esc cancels',
       al == {'t': 'Reset this profile?', 'b': ['Cancel', 'Reset'], 'f': True, 'd': True, 'native': 0} and still and gone, (al, still, gone))
    eb = await pg.evaluate("(()=>{toggleEditMode&&toggleEditMode(); const b=document.getElementById('editBanner'); return [getComputedStyle(b).textTransform, b.innerText.replace(/\\s+/g,' ').trim()]})()")
    ok('n222: the profile’s edit banner is a sentence (sentence case, a real Reset button)', eb[0] == 'none' and eb[1].startswith('Editing: Click a highlighted field to change it, or a photo to replace it.') and 'Reset saved edits…' in eb[1], eb)
    bt = await pg.evaluate("[...document.querySelectorAll('.nav-btn')].map(b=>b.textContent.trim()).filter(Boolean)")
    ok('n222: profile buttons use line icons and sentence case (Print, Export, New intern, Save)', all(x in bt for x in ['Print', 'Export', 'New intern']), bt)
    await ctx.close()
    ctx, pg, errs = await p222('sgvp/interns/kristi-wenger/', vp=(390, 844), touch=True)
    tw = await pg.evaluate("(()=>{toggleEditMode&&toggleEditMode(); return document.querySelector('#editBanner .pvx-tapword').textContent})()")
    ok('n222: on touch the banner says Tap', tw == 'Tap', tw)
    await ctx.close()
    # the shadow schedule's copy: a sheet instead of prompt()
    ctx, pg, errs = await p222('sgvp/shadow-schedule/')
    await pg.evaluate("window.__dlg=0; window.prompt=function(){window.__dlg++;return null}; 0")
    await pg.evaluate("exportSchedule()"); await pg.wait_for_timeout(300)
    sh = await pg.evaluate("(()=>{const a=document.querySelector('.pvx-al[role=dialog]'); return a?{t:a.querySelector('.pvx-al-t').textContent, act:a.querySelector('.pvx-al-a').getAttribute('aria-disabled'), f:document.activeElement.tagName, native:window.__dlg}:null})()")
    await pg.keyboard.type('Block 3'); await pg.wait_for_timeout(100)
    en = await pg.evaluate("document.querySelector('.pvx-al .pvx-al-a').getAttribute('aria-disabled')")
    async with pg.expect_download() as dl:
        await pg.keyboard.press('Enter')
    d = await dl.value
    ok('n222: the shadow schedule’s Save a copy is a Pravix sheet (name field, Save waits for a name), and saves Block 3.html',
       sh == {'t': 'Save a copy', 'act': 'true', 'f': 'INPUT', 'native': 0} and en == 'false' and d.suggested_filename == 'Block 3.html', (sh, en, d.suggested_filename))
    dt = await pg.evaluate("[document.querySelector('.bl-dates').textContent, [...document.querySelectorAll('.block-dates')].slice(0,2).map(e=>e.textContent)]")
    ok('n222: one date style (Jun 22 – Jul 5, Jun 22)', dt == ['Jun 22 – Jul 5', ['Jun 22', 'Jun 23']], dt)
    await ctx.close()
    ctx, pg, errs = await p222('sgvp/assets/')
    at = await pg.evaluate("[document.getElementById('assetsTitleText').textContent, [...document.querySelectorAll('.sec-label')].map(e=>e.childNodes[0].textContent.trim())]")
    ok('n222: Assets — “Assets”, sentence-case sections', at[0] == 'Assets' and at[1][:4] == ['Featured applications', 'Hospital resources', 'Clinical resources', 'Coming soon'], at)
    await ctx.close()
    ctx, pg, errs = await p222('v/')
    vv = await pg.evaluate("[[...document.querySelectorAll('meta[name=theme-color]')].map(m=>m.content), parseFloat(getComputedStyle(document.querySelector('.brand .pvx small')).fontSize)]")
    ok('n222: the verify page has a theme colour, and “Powered by” is 9 pt like the top bar', len(vv[0]) >= 1 and vv[1] == 9, vv)
    await ctx.close()
    await pg.close() if False else None


@section(id='n224', title='n224: HIG Icons on the SGVP pages (standard Export and Save, no emoji, small icons as heavy as their text)',
         apps=['sgvp', 'topbar'], topics=['icons'])
async def s_n224(br):
    W224 = r"""(()=>{const top=document.querySelector('#pvxTopnav');const thin=[];let n=0;
      document.querySelectorAll('svg').forEach(s=>{if(top&&top.contains(s))return;const r=s.getBoundingClientRect();if(!r.width||r.width>15)return;
        const vb=s.viewBox&&s.viewBox.baseVal;if(!vb||!vb.width)return;const sc=r.width/vb.width;
        s.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse').forEach(p=>{const cs=getComputedStyle(p);if(cs.stroke==='none')return;const w=parseFloat(cs.strokeWidth)*sc;n++;if(w<0.97)thin.push((s.parentNode.className||s.parentNode.tagName)+'@'+Math.round(r.width)+':'+w.toFixed(2));});});
      const re=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}↺]/u;const em=[];const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;
      while(t=tw.nextNode()){if(top&&top.contains(t.parentNode))continue;if(t.parentNode.closest('script,style'))continue;if(re.test(t.textContent))em.push(t.textContent.trim().slice(0,24));}
      return {n,thin:thin.slice(0,8),em:em.slice(0,8)};})()"""
    thin224 = {}; emo224 = {}; cnt224 = 0
    for path in ['sgvp/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']:
        for vp, touch in (((1440, 900), False), ((390, 844), True)):
            ctx, pg, errs = await p222(path, vp, touch)
            r = await pg.evaluate(W224); cnt224 += r['n']
            if r['thin']: thin224[path + '@' + str(vp[0])] = r['thin']
            if r['em']: emo224[path + '@' + str(vp[0])] = r['em']
            await ctx.close()
    ok('n224: no small line icon on any SGVP page is lighter than its text (every icon under 15 pt draws at least 1 pt — n227: at its label’s weight), Mac and iPhone', not thin224 and cnt224 > 100, (thin224, cnt224))
    ok('n224: no emoji or ↺ shown on any SGVP page, Assets’ admin previews included', not emo224, emo224)
    # 1. Apple's standard icons: Export (arrow out of a box) and Save (checkmark) on the intern profile
    ctx, pg, errs = await p222('sgvp/interns/kristi-wenger/')
    r = await pg.evaluate("""(()=>{const b=[...document.querySelectorAll('button')];const f=t=>{const x=b.find(e=>e.textContent.trim()===t);return x&&x.querySelector('svg path')?x.querySelector('svg path').getAttribute('d'):null;};
      return [f('Export'), f('Save'), document.documentElement.outerHTML.includes('M5 4h11l3 3v13H5z')];})()""")
    ok('n224: the profile’s Export is an arrow out of a box (square.and.arrow.up) and Save is a checkmark — no floppy disk anywhere', r[0] and r[0].startswith('M12 3.5v11M8 7.5l4-4 4 4') and r[1] == 'M5 12.5l4.5 4.5L19 7.5' and not r[2], r)
    # 2. the weather line is a line icon and words, not an emoji
    wx224 = []
    for code, word in ((61, 'Light rain'), (3, 'Overcast'), (0, 'Clear')):
        def wxf(code):
            async def wxr(rq):
                await rq.fulfill(status=200, content_type='application/json', body=json.dumps({'current': {'temperature_2m': 54.4, 'weather_code': code}}))
            return wxr
        await pg.route('https://api.open-meteo.com/**', wxf(code))
        await pg.evaluate("fetchWeather(); 0"); await pg.wait_for_timeout(400)
        wx224.append(await pg.evaluate("(()=>{const e=document.getElementById('welcomeWeather');return [e.textContent, !!e.querySelector('svg.pvx-ico[aria-hidden=true]'), /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(e.textContent)];})()"))
        await pg.unroute('https://api.open-meteo.com/**')
    ok('n224: the welcome card’s weather is a Pravix line icon with the words (“54°F · Overcast”), never an emoji', all(w[1] and not w[2] and w[0].startswith('54°F · ') for w in wx224) and [w[0] for w in wx224] == ['54°F · Light rain', '54°F · Overcast', '54°F · Clear'], wx224)
    src = await pg.content()
    ok('n224: a new intern’s template keeps the mentor e-mail line icon (no ✉ emoji)', "'mIcon-email':'<svg" in src and "'✉'" not in src, None)
    ok('n224: the intern profile has no page errors', not errs, errs[:3])
    await ctx.close()
    # 3. Assets: the admin's "Coming soon" previews and the wallpaper preview are line icons, also after Reset
    ctx, pg, errs = await p222('sgvp/assets/')
    r = await pg.evaluate("""(()=>{const ids=['sprev-scribe','sprev-anesthesia','sprev-flow','sprev-drug','sprev-treatment','wprev'];
      const a=ids.map(i=>{const e=document.getElementById(i);return e&&!!e.querySelector('svg.pvx-ico')&&!/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(e.textContent);});
      return a;})()""")
    await pg.evaluate("window.__t=[];const o=window.toast;window.toast=function(m){window.__t.push(m);return o&&o.apply(this,arguments)}; resetSoon('scribe'); 0"); await pg.wait_for_timeout(300)
    r2 = await pg.evaluate("[!!document.querySelector('#sprev-scribe svg.pvx-ico'), window.__t.join('|')]")
    ok('n224: Assets’ “Coming soon” background previews and wallpaper preview are line icons (were 🤖 💉 🌊 ⚗️ 📋 🖼), and stay so after Reset', all(r) and r2[0] and '↺' not in r2[1], (r, r2))
    ok('n224: Assets has no page errors', not errs, errs[:3])
    await ctx.close()
    # the shadow schedule's edit-mode Remove buttons: a named line icon (were a text ✕ with no name)
    ctx, pg, errs = await p222('sgvp/shadow-schedule/')
    r = await pg.evaluate("[...document.querySelectorAll('.mini-x')].map(b=>[b.getAttribute('aria-label'), !!b.querySelector('svg.pvx-ico'), b.textContent.trim()])")
    ok('n224: the shadow schedule’s Remove buttons (edit mode) are a line icon named “Remove”, not a text ✕', len(r) >= 9 and all(x == ['Remove', True, ''] for x in r) and not errs, (r[:3], len(r), errs[:2]))
    await ctx.close()
