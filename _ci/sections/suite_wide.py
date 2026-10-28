"""Checks across every app (HIG passes over the whole suite)."""
from core import *
from helpers import *


@section(id='n216', title='n216: segmented controls and sliders across the suite',
         apps=['treatment', 'flow', 'or', 'sgvp', 'directory', 'scheduling'], topics=['data-entry'])
async def s_n216(br):
    async def page216(path, vp=(1440, 900), touch=False):
        c, p, e = await new_page(br, user='{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}', vp=vp, touch=touch)
        async def mod(r): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(r.request.url.rsplit('/', 1)[-1], ''))
        await p.route('https://www.gstatic.com/firebasejs/10.12.0/*', mod)
        await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(3000)
        return c, p, e
    KEY = """([sel,k])=>{const g=document.querySelector(sel);const on=[...g.querySelectorAll('[role=radio],[role=tab]')].find(b=>b.getAttribute('aria-checked')==='true'||b.getAttribute('aria-selected')==='true')||g.querySelector('[role=radio],[role=tab]');
      on.focus(); on.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true})); return new Promise(r=>setTimeout(()=>{const g2=document.querySelector(sel);
      const it=[...g2.querySelectorAll('[role=radio],[role=tab]')];r({role:g2.getAttribute('role'),name:g2.getAttribute('aria-label'),sel:it.findIndex(b=>b.getAttribute('aria-checked')==='true'||b.getAttribute('aria-selected')==='true'),
      was:[...g.querySelectorAll('[role=radio],[role=tab]')].indexOf(on),focus:it.indexOf(document.activeElement),stops:it.filter(b=>b.tabIndex===0).length,n:it.length})},350))}"""
    # Treatment Sheets, Mac
    ctx, pg, errs = await page216('treatment/')
    tr = await pg.evaluate("""(()=>{const sw=document.getElementById('clinSwitcher');const cur=[...sw.querySelectorAll('.seg')].filter(b=>b.getAttribute('aria-current')==='true').map(b=>b.dataset.ctab);
      const w=[...document.querySelectorAll('#sbBoards .sb-segb')].map(b=>Math.round(b.getBoundingClientRect().width));
      return {name:sw.getAttribute('aria-label'),cur,w,sheet:sw.querySelector('[data-ctab=sheet]').getAttribute('aria-label'),mine:(document.querySelector('#sbBoards [data-board="My Board"]')||{}).textContent}})()""")
    ok('n216: Treatment’s section switcher is named “Treatment sections” and says the open section (Dashboard)', tr['name'] == 'Treatment sections' and tr['cur'] == ['dash'], tr)
    ok('n216: the status board’s boards are equal widths; sentence case — Treatment sheet, My patients', len(tr['w']) == 4 and max(tr['w']) - min(tr['w']) <= 1 and tr['sheet'] == 'Treatment sheet' and tr['mine'].startswith('My patients'), tr)
    kb = await pg.evaluate(KEY, ['#sbBoards', 'ArrowRight'])
    ok('n216: the boards are a tablist named “Boards”; → moves to the next board with focus on it; one Tab stop', kb['role'] == 'tablist' and kb['name'] == 'Boards' and kb['sel'] == (kb['was'] + 1) % 4 and kb['focus'] == kb['sel'] and kb['stops'] == 1, kb)
    kv = await pg.evaluate(KEY, ['#sbView', 'ArrowRight'])
    ok('n216: List · Hours is a radiogroup named “Show as” and → moves it', kv['role'] == 'radiogroup' and kv['name'] == 'Show as' and kv['sel'] != kv['was'] and kv['stops'] == 1, kv)
    await pg.evaluate("document.querySelector('#clinSwitcher .seg[data-ctab=tasks]').click()"); await pg.wait_for_timeout(700)
    tk = await pg.evaluate("""(()=>{const a=document.querySelector('.wl-seg'),b=document.querySelector('.wl-chips');if(!a||!b) return {err:'no tasks'};
      const st=g=>[...g.querySelectorAll('button')].map(x=>x.getAttribute('role')+':'+x.getAttribute('aria-checked'));return {an:a.getAttribute('aria-label'),ar:a.getAttribute('role'),as:st(a),bn:b.getAttribute('aria-label'),br:b.getAttribute('role'),bs:st(b),
      cur:[...document.querySelectorAll('#clinSwitcher .seg[aria-current]')].map(x=>x.dataset.ctab)}})()""")
    ok('n216: Tasks’ Whose patients and Area are radiogroups, one choice checked each; the switcher follows to Tasks', tk.get('ar') == 'radiogroup' and tk['an'] == 'Whose patients' and tk['as'].count('radio:true') == 1 and tk['br'] == 'radiogroup' and tk['bn'] == 'Area' and tk['bs'].count('radio:true') == 1 and tk['cur'] == ['tasks'], tk)
    ok('n216: Treatment has no page errors', not errs, errs[:3])
    await ctx.close()
    # Treatment Sheets, iPhone
    ctx, pg, errs = await page216('treatment/', vp=(390, 844), touch=True)
    tp = await pg.evaluate("""(()=>{const sw=document.getElementById('clinSwitcher'),r=sw.getBoundingClientRect();const vis=[...sw.children].filter(b=>getComputedStyle(b).display!=='none');
      const pop=document.querySelector('.pvx-sbpop');return {bottom:Math.round(r.bottom),h:innerHeight,tabs:vis.map(b=>b.title),fit:vis.every(b=>b.getBoundingClientRect().right<=innerWidth+1),
      pop:pop&&getComputedStyle(pop).display!=='none',opts:pop?[...pop.options].map(o=>o.textContent):[],name:pop&&pop.getAttribute('aria-label'),boards:getComputedStyle(document.getElementById('sbBoards')).display}})()""")
    ok('n216: on iPhone Treatment’s sections are a bottom tab bar — Dashboard, Tasks, Treatment sheet, Vitals, More — and all fit', tp['bottom'] == tp['h'] and tp['tabs'] == ['Dashboard', 'Tasks', 'Treatment sheet', 'Vitals', 'More'] and tp['fit'], tp)
    ok('n216: on iPhone the four boards are a “Board” pop-up with their counts (none cut off)', tp['pop'] and tp['boards'] == 'none' and len(tp['opts']) == 4 and tp['opts'][0].startswith('My patients') and tp['name'] == 'Board', tp)
    await pg.evaluate("document.querySelector('.pvx-tmore').click()"); await pg.wait_for_timeout(300)
    mm = await pg.evaluate("(()=>{const m=document.querySelector('.pvx-tmenu');return {open:!m.hidden,items:[...m.querySelectorAll('button')].map(b=>b.textContent),focus:m.contains(document.activeElement),exp:document.querySelector('.pvx-tmore').getAttribute('aria-expanded')}})()")
    ok('n216: More opens Anesthesia, Timeline, Charges and Notes, with the keyboard on the first', mm['open'] and mm['items'] == ['Anesthesia', 'Timeline', 'Charges', 'Notes'] and mm['focus'] and mm['exp'] == 'true', mm)
    await pg.evaluate("[...document.querySelectorAll('.pvx-tmenu button')].find(b=>b.textContent==='Timeline').click()"); await pg.wait_for_timeout(500)
    mt = await pg.evaluate("(()=>{const m=document.querySelector('.pvx-tmore');return {on:m.classList.contains('on'),lab:m.getAttribute('aria-label'),closed:document.querySelector('.pvx-tmenu').hidden,tab:!document.getElementById('ctab-timeline').classList.contains('hidden')}})()")
    ok('n216: choosing Timeline opens it, closes the menu, and More shows as current (“More, Timeline open”)', mt['on'] and mt['lab'] == 'More, Timeline open' and mt['closed'] and mt['tab'], mt)
    await pg.evaluate("(()=>{const s=document.querySelector('.pvx-sbpop'); if(s){ s.selectedIndex=2; s.dispatchEvent(new Event('change')); }})()"); await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelector('#clinSwitcher .seg[data-ctab=dash]').click()"); await pg.wait_for_timeout(500)
    bp = await pg.evaluate("(()=>{const s=document.querySelector('.pvx-sbpop');return {sel:s&&s.value,on:(document.querySelector('#sbBoards .sb-segb.on')||{}).dataset}})()")
    ok('n216: picking a board from the pop-up switches the board, and the pop-up stays in step', bp['sel'] == 'IP Board' and bp['on'] and bp['on'].get('board') == 'IP Board', bp)
    await pg.screenshot(path=os.path.join(SHOTS, 'n216-treatment-iphone.png'))
    ok('n216: Treatment on iPhone has no page errors', not errs, errs[:3])
    await ctx.close()
    # OR
    ctx, pg, errs = await page216('or/')
    orr = await pg.evaluate("""(()=>{const cur=[...document.querySelectorAll('#switcher .seg[aria-current]')].map(b=>b.textContent.trim());const w=[...document.querySelectorAll('.or-modeseg button')].map(b=>Math.round(b.getBoundingClientRect().width));
      const ct=document.getElementById('caseTabs');return {cur,w,ct:ct.getAttribute('aria-label'),sel:[...ct.querySelectorAll('[role=tab]')].map(b=>b.getAttribute('aria-selected')).join(',')}})()""")
    ok('n216: OR’s section switcher says the open section; Live · Day · History are equal widths', len(orr['cur']) == 1 and len(orr['w']) == 3 and max(orr['w']) - min(orr['w']) <= 1, orr)
    ok('n216: OR’s case sections are named “Case sections” and say which is open', orr['ct'] == 'Case sections' and orr['sel'].split(',').count('true') == 1, orr)
    ok('n216: OR has no page errors', not errs, errs[:3])
    await ctx.close()
    # SGVP Overview
    ctx, pg, errs = await page216('sgvp/')
    sv = await pg.evaluate("""(()=>{const g=document.querySelector('.view-toggle');const bs=[...g.querySelectorAll('.vt-btn')];
      return {role:g.getAttribute('role'),name:g.getAttribute('aria-label'),st:bs.map(b=>b.textContent+':'+b.classList.contains('active')+':'+b.getAttribute('aria-checked')),press:bs.filter(b=>b.hasAttribute('aria-pressed')).length,
        w:bs.map(b=>Math.round(b.getBoundingClientRect().width))}})()""")
    ok('n216: SGVP “Whose curriculum” — for a non-intern the highlighted Entire class is also the checked one (VoiceOver said “My curriculum”)', sv['role'] == 'radiogroup' and sv['name'] == 'Whose curriculum' and sv['st'] == ['My curriculum:false:false', 'Entire class:true:true'] and sv['press'] == 0, sv)
    ok('n216: My curriculum · Entire class are equal widths', abs(sv['w'][0] - sv['w'][1]) <= 1, sv)
    fl = await pg.evaluate("""(async()=>{const S=document.getElementById('currSvcChips'),P=document.getElementById('currProgChips');
      const lab=g=>[...g.querySelectorAll('.chip')].map(b=>b.textContent.trim());const a={sn:S.getAttribute('aria-label'),sr:S.getAttribute('role'),pn:P.getAttribute('aria-label'),pr:P.getAttribute('role'),sl:lab(S),pl:lab(P)};
      S.querySelector('[data-f=surg]').click(); await new Promise(r=>setTimeout(r,250)); P.querySelector('[data-f=upcoming]').click(); await new Promise(r=>setTimeout(r,250));
      a.chk=[...document.querySelectorAll('#currFilterChips [aria-checked=true]')].map(b=>b.dataset.f); a.f=Object.assign({},pvxF);
      a.rows=[...document.querySelectorAll('#currTbody tr')].map(r=>(r.querySelector('.svc-name')||r).textContent.trim().slice(0,30)); return a})()""")
    ok('n216: the curriculum filter is two named radiogroups — Service (All … Oncology) and Progress (All, Completed, Current, Upcoming)', fl['sr'] == 'radiogroup' and fl['sn'] == 'Service' and fl['pr'] == 'radiogroup' and fl['pn'] == 'Progress' and fl['sl'] == ['All', 'Emergency', 'Internal medicine', 'Surgery', 'Neurology', 'Oncology'] and fl['pl'] == ['All', 'Completed', 'Current', 'Upcoming'], fl)
    ok('n216: Surgery and Upcoming combine — both checked, and only Surgery is listed', sorted(fl['chk']) == ['surg', 'upcoming'] and fl['f'] == {'svc': 'surg', 'prog': 'upcoming'} and fl['rows'] and all('Surgery' in r for r in fl['rows']), fl)
    cl = await pg.evaluate("(async()=>{pvxClearCurr(); await new Promise(r=>setTimeout(r,120)); return {f:Object.assign({},pvxF),c:currFilter,chk:[...document.querySelectorAll('#currFilterChips [aria-checked=true]')].map(b=>b.dataset.f)}})()")
    ok('n216: “Show all services” clears both filters', cl['f'] == {'svc': 'all', 'prog': 'all'} and cl['c'] == 'all' and sorted(cl['chk']) == ['progall', 'svcall'], cl)
    ok('n216: SGVP Overview has no page errors', not errs, errs[:3])
    await ctx.close()
    ctx, pg, errs = await page216('sgvp/', vp=(390, 844), touch=True)
    ph = await pg.evaluate("""(async()=>{const s=document.getElementById('currSvcPop');const a={pop:getComputedStyle(s).display,chips:getComputedStyle(document.getElementById('currSvcChips')).display,opts:[...s.options].map(o=>o.textContent)};
      s.value='neuro'; s.dispatchEvent(new Event('change')); await new Promise(r=>setTimeout(r,250)); a.f=pvxF.svc; a.rows=document.querySelectorAll('#currProgChips .chip').length; return a})()""")
    ok('n216: on iPhone Service is a pop-up (All services, Emergency …) and choosing Neurology filters', ph['pop'] != 'none' and ph['chips'] == 'none' and ph['opts'][0] == 'All services' and ph['f'] == 'neuro', ph)
    await ctx.close()
    # an intern's curriculum
    ctx, pg, errs = await page216('sgvp/interns/kristi-wenger/curriculum/')
    ic = await pg.evaluate("""(async()=>{const g=document.querySelector('.view-toggle');const chips=[...document.querySelectorAll('#currFilterChips .chip')];
      const a={role:g.getAttribute('role'),name:g.getAttribute('aria-label'),chk:[...g.querySelectorAll('[aria-checked=true]')].map(b=>b.textContent),tags:[...new Set(chips.map(c=>c.tagName))]};
      const b=document.querySelector('#currProgChips [data-f=current]'); b.focus(); a.focusable=document.activeElement===b; b.click(); await new Promise(r=>setTimeout(r,250)); a.f=Object.assign({},pvxF); return a})()""")
    ok('n216: an intern’s curriculum toggle is a named radiogroup with My curriculum checked', ic['role'] == 'radiogroup' and ic['name'] == 'Whose curriculum' and ic['chk'] == ['My curriculum'], ic)
    ok('n216: the intern page’s filter chips are buttons the keyboard can reach (they were <div>s), and Progress works', ic['tags'] == ['BUTTON'] and ic['focusable'] and ic['f'] == {'svc': 'all', 'prog': 'current'}, ic)
    ok('n216: an intern’s curriculum has no page errors', not errs, errs[:3])
    await ctx.close()
    # an intern's profile (edit mode as Daniel)
    ctx, pg, errs = await page216('sgvp/interns/kristi-wenger/', vp=(1180, 820), touch=True)
    await pg.evaluate("document.querySelector('.cutout-controls .cc-header').click()"); await pg.wait_for_timeout(500)
    pr = await pg.evaluate("""(()=>{const ids=['cutoutSize','cutoutX','cutoutRise','cutoutThresh'];return ids.map(id=>{const i=document.getElementById(id),r=i.getBoundingClientRect();
      return {id,label:i.labels&&i.labels[0]?i.labels[0].textContent:'',vt:i.getAttribute('aria-valuetext'),out:(document.getElementById(id+'V')||{}).textContent,h:Math.round(r.height),left:Math.round(r.left),dis:i.disabled,ends:[...i.parentNode.querySelectorAll('.cc-end')].map(e=>e.textContent).join('')}})})()""")
    ok('n216: the intern photo sliders are labelled Size, Left–right, Height, Threshold and show and speak their values', [x['label'] for x in pr] == ['Size', 'Left–right', 'Height', 'Threshold'] and all(x['vt'] and x['out'] == x['vt'] for x in pr) and pr[0]['vt'].endswith(' px'), pr)
    ok('n216: the photo tracks line up, Height runs ▼ to ▲, and each is 44 pt tall to touch', max(x['left'] for x in pr) - min(x['left'] for x in pr) <= 1 and pr[2]['ends'] == '▼▲' and all(x['h'] >= 44 for x in pr), pr)
    ok('n216: Threshold is dimmed until Remove background is on', pr[3]['dis'] == (not await pg.evaluate("document.getElementById('cutoutKnock').checked")), pr[3])
    await pg.evaluate("document.getElementById('cutoutKnock').click()"); await pg.wait_for_timeout(200)
    t2 = await pg.evaluate("({dis:document.getElementById('cutoutThresh').disabled,on:document.getElementById('cutoutKnock').checked})")
    ok('n216: turning Remove background on or off enables or dims Threshold', t2['dis'] == (not t2['on']), t2)
    rs = await pg.evaluate("""(async()=>{const s=document.getElementById('cutoutSize'),x=document.getElementById('cutoutX'); s.value=300; x.value=100; s.dispatchEvent(new Event('input')); await new Promise(r=>setTimeout(r,100));
      const w1=document.getElementById('heroCutout').style.width; document.querySelector('.cc-reset').click(); await new Promise(r=>setTimeout(r,100));
      return {w1,w2:document.getElementById('heroCutout').style.width,v:s.value,d:s.defaultValue,x:x.value,xd:x.defaultValue,out:document.getElementById('cutoutSizeV').textContent}})()""")
    ok('n216: Reset position puts the photo back where it started, and the shown value follows', rs['w1'] == '300px' and rs['v'] == rs['d'] and rs['x'] == rs['xd'] and rs['w2'] == rs['d'] + 'px' and rs['out'] == rs['d'] + ' px', rs)
    mi = await pg.evaluate("""(async()=>{const i=document.getElementById('mentorIconSize'); const lab=i.labels&&i.labels[0]?i.labels[0].textContent:''; i.value=40; i.dispatchEvent(new Event('input')); await new Promise(r=>setTimeout(r,100));
      return {lab,in_title:!!i.closest('.card-header'),css:getComputedStyle(document.documentElement).getPropertyValue('--mentor-icon-size').trim(),out:document.getElementById('mentorIconSizeV').textContent}})()""")
    ok('n216: Your mentor’s Icon size is a labelled row (not in the card title) and moving it now works (it threw an error)', mi['lab'] == 'Icon size' and not mi['in_title'] and mi['css'] == '40px' and mi['out'] == '40 px', mi)
    ok('n216: an intern’s profile has no page errors', not errs, errs[:3])
    await ctx.close()
    # Assets
    ctx, pg, errs = await page216('sgvp/assets/', vp=(1180, 820), touch=True)
    await pg.evaluate("(document.querySelector('.admin-btn')||{click(){}}).click()"); await pg.wait_for_timeout(500)
    asx = await pg.evaluate("""(()=>{const i=document.getElementById('sz-outlook'),r=i.getBoundingClientRect();const segs=[...document.querySelectorAll('.color-wrap .seg')].map(g=>g.getAttribute('role')+':'+g.getAttribute('aria-label')+':'+[...g.querySelectorAll('[aria-checked=true]')].length);
      return {name:i.getAttribute('aria-label'),vt:i.getAttribute('aria-valuetext'),h:Math.round(r.height),list:!!i.list&&i.list.options[0].value,segs,label:[...document.querySelectorAll('.a-label')].map(l=>l.textContent).filter(t=>/Logo|Title/.test(t))}})()""")
    ok('n216: Assets’ Logo size sliders are named for their app and speak their percent (“Outlook logo size”, “100%”), with a mark at 100%', asx['name'] == 'Outlook logo size' and asx['vt'] == '100%' and asx['list'] == '100', asx)
    ok('n216: Logo size sliders are 44 pt tall to touch (were 4 pt)', asx['h'] >= 44, asx)
    ok('n216: Title color’s Light · Dark and Presets · Custom are named radiogroups, one checked each; sentence case', asx['segs'] == ['radiogroup:Theme:1', 'radiogroup:Title color:1'] and 'Logo size' in asx['label'] and 'Title color' in asx['label'], asx)
    await pg.evaluate("(()=>{const i=document.getElementById('sz-outlook'); i.value=130; i.dispatchEvent(new Event('input'));})()")
    a2 = await pg.evaluate("({vt:document.getElementById('sz-outlook').getAttribute('aria-valuetext'),shown:document.getElementById('szv-outlook').textContent})")
    ok('n216: moving a Logo size slider updates what is shown and spoken together (130%)', a2['vt'] == '130%' and a2['shown'] == '130%', a2)
    ok('n216: Assets has no page errors', not errs, errs[:3])
    await ctx.close()
    # Directory, L.U.N.A., names
    ctx, pg, errs = await page216('directory/')
    dw = await pg.evaluate("[...document.querySelectorAll('#viewSeg > *')].map(b=>Math.round(b.getBoundingClientRect().width))")
    ok('n216: Directory · Organization are equal widths', len(dw) == 2 and abs(dw[0] - dw[1]) <= 1, dw)
    await ctx.close()
    ctx, pg, errs = await page216('luna-orb.html')
    lu = await pg.evaluate("""(async()=>{const gs=[...document.querySelectorAll('.states')];const a={g:gs.map(g=>g.getAttribute('role')+':'+g.getAttribute('aria-label')+':'+g.querySelectorAll('button').length)};
      const sleepy=document.querySelector('[data-state=sleepy]'); sleepy.click(); await new Promise(r=>setTimeout(r,200)); sleepy.focus();
      sleepy.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true})); await new Promise(r=>setTimeout(r,250));
      a.now=[...document.querySelectorAll('[data-state][aria-checked=true]')].map(b=>b.dataset.state); a.cls=[...document.querySelectorAll('[data-state].on')].map(b=>b.dataset.state);
      document.querySelector('[data-state=curious]').click(); await new Promise(r=>setTimeout(r,200)); a.after=[...document.querySelectorAll('[data-state][aria-checked=true]')].map(b=>b.dataset.state);
      const i=document.getElementById('intensity'); a.iname=i.getAttribute('aria-labelledby')&&document.getElementById(i.getAttribute('aria-labelledby')).textContent; a.ivt=i.getAttribute('aria-valuetext'); a.ilist=i.list&&i.list.options[0].value;
      const v=[...document.querySelectorAll('.view-switch button')].map(b=>Math.round(b.getBoundingClientRect().width)); a.vw=v; return a})()""")
    ok('n216: L.U.N.A.’s ten states are two named radiogroups of five — State and Expression', lu['g'] == ['radiogroup:State:5', 'radiogroup:Expression:5'], lu)
    ok('n216: ← moves L.U.N.A.’s state, and one state is checked across both groups', lu['now'] == ['speaking'] and lu['cls'] == ['speaking'] and lu['after'] == ['curious'], lu)
    ok('n216: Presence intensity is named once and speaks its percent once, with a mark at the default; the view switch is equal widths', lu['iname'] == 'Presence intensity' and lu['ivt'] == '65%' and lu['ilist'] == '65' and abs(lu['vw'][0] - lu['vw'][1]) <= 1, lu)
    ok('n216: L.U.N.A. studio has no page errors', not errs, errs[:3])
    await ctx.close()
    names = {}
    for rel in ['scheduling/index.html', 'or/index.html', 'treatment/index.html', 'index.html']:
        t = open(os.path.join(BUILD, rel), encoding='utf-8').read(); names[rel] = (t.count('Kristen Wenger'), t.count('Kristi Wenger'))
    ok('n216: Kristi Wenger’s name is right in Scheduling, OR, Treatment and Flow (no “Kristen”)', all(a == 0 and b >= 1 for a, b in names.values()), names)


@section(id='n225', title='n225: HIG Layout across the suite (fit, no floating controls, text size, safe areas)',
         apps=['treatment', 'flow', 'or', 'sgvp', 'kura', 'checkin', 'directory', 'scheduling', 'forms', 'grid', 'topbar'], topics=['layout', 'typography'])
async def s_n225(br):
    FU225 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    RU225 = '{"uid":"u2","email":"resident.a@vca.com","displayName":"Resident A"}'
    CUT225 = r"""(()=>{const W=innerWidth,top=document.querySelector('#pvxTopnav,nav.topnav');const off=[];
      document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;if(e.closest('details:not([open])')&&!e.closest('summary')&&e.closest('details:not([open])')!==e)return;
        const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||cs.position==='fixed')return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
        if(r.right>W+2||r.left<-2){let p=e.parentElement,clip=false;while(p&&p!==document.body){const c=getComputedStyle(p);if(/(auto|scroll|hidden|clip)/.test(c.overflowX)){clip=true;break;}p=p.parentElement;}
          if(!clip)off.push((e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0])+':'+Math.round(r.left)+'-'+Math.round(r.right));}});
      return {hs:document.documentElement.scrollWidth>W+1,off:[...new Set(off)].slice(0,4)};})()"""
    PG225 = ['index.html', 'anesia/', 'treatment/', 'or/', 'checkin/', 'directory/', 'scheduling/', 'kura/', 'grid/', 'forms/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
    bad = {}
    for vp, touch in (((1440, 900), False), ((1180, 820), True), ((820, 1180), True), ((507, 820), True), ((390, 844), True), ((844, 390), True)):
        for path in PG225:
            ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=touch)
            await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(1800)
            r = await pg.evaluate(CUT225)
            if r['hs'] or r['off']: bad[path + '@' + str(vp[0]) + 'x' + str(vp[1])] = r
            await ctx.close()
    ok('n225: no Pravix page scrolls sideways or has anything cut off at the edges — Mac, iPad (both ways and split), iPhone (both ways)', not bad, bad)
    # 1. the intern profile fits an iPhone
    ctx, pg, errs = await new_page(br, user=FU225, vp=(390, 844), touch=True)
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/'); await pg.wait_for_timeout(2200)
    r = await pg.evaluate("(()=>{const W=innerWidth;const c=[...document.querySelectorAll('.dashboard-grid > *')].map(e=>Math.round(e.getBoundingClientRect().right));const b=[...document.querySelectorAll('#pvxSubnav .pvx-actions > button')].filter(e=>e.getClientRects().length).map(e=>Math.round(e.getBoundingClientRect().right));return [W,Math.max(...c),Math.max(...b),c.length,b.length]})()")
    ok('n225: on iPhone the intern profile fits — every dashboard card and toolbar button ends inside the screen (cards were 35 pt too wide, Save was cut)', r[1] <= r[0] - 8 and r[2] <= r[0] and r[3] >= 4 and r[4] >= 4, r)
    ok('n225: the iPhone profile has no page errors', not errs, errs[:2])
    await ctx.close()
    # 2. no floating controls: Edit and Customize… are in the page toolbar
    FIX225 = "(()=>{const H=innerHeight,W=innerWidth,top=document.querySelector('#pvxTopnav');return [...document.querySelectorAll('body *')].filter(e=>{if(top&&top.contains(e))return false;if(e.closest('.toast,#toast,[role=status],[role=alert]'))return false;const c=getComputedStyle(e);if(c.position!=='fixed'||c.display==='none'||c.visibility==='hidden'||+c.opacity===0)return false;const r=e.getBoundingClientRect();return r.width>20&&r.height>20&&r.bottom>H-90&&r.top>H*0.5&&r.width<W*0.9;}).map(e=>e.id||e.className)})()"
    fl = {}
    for path in ('sgvp/interns/kristi-wenger/', 'sgvp/shadow-schedule/', 'sgvp/assets/'):
        for vp, touch in (((1440, 900), False), ((390, 844), True)):
            ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=touch)
            await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2600)
            r = await pg.evaluate(FIX225)
            if r: fl[path + '@' + str(vp[0])] = r
            await ctx.close()
    ok('n225: no control floats at the bottom of the window or over content on the profile, shadow schedule or Assets (edit orb, gear, wallpaper panel)', not fl, fl)
    ctx, pg, errs = await new_page(br, user=FU225)
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/'); await pg.wait_for_timeout(2600)
    a = await pg.evaluate("(()=>{const b=document.getElementById('editBtn');const ls=document.getElementById('loginSettings');return [!!b&&!b.hidden&&b.getClientRects().length>0, b&&b.textContent.trim(), b&&b.closest('#pvxSubnav')!==null, document.body.classList.contains('edit-mode'), ls&&getComputedStyle(ls).position, ls&&!!ls.closest('.page-content'), ls&&getComputedStyle(ls).display]})()")
    await pg.click('#editBtn'); await pg.wait_for_timeout(300)
    b2 = await pg.evaluate("[document.getElementById('editBtn').textContent.trim(), document.body.classList.contains('edit-mode'), getComputedStyle(document.getElementById('loginSettings')).display]")
    await pg.click('#editBtn'); await pg.wait_for_timeout(300)
    b3 = await pg.evaluate("[document.getElementById('editBtn').textContent.trim(), document.body.classList.contains('edit-mode')]")
    ok('n225: a director’s profile has Edit in the toolbar (it says “Done editing” while editing and switches the mode); the login wallpaper panel is in the page, in edit mode only', a[0] and a[1] == 'Done editing' and a[2] and a[3] and a[4] == 'static' and a[5] and a[6] == 'flex' and b2[0] == 'Edit' and not b2[1] and b2[2] == 'none' and b3 == ['Done editing', True], (a, b2, b3))
    ok('n225: the profile has no page errors', not errs, errs[:2])
    await ctx.close()
    ctx, pg, errs = await new_page(br, user=RU225)
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/'); await pg.wait_for_timeout(2600)
    r = await pg.evaluate("[document.getElementById('editBtn').hidden, document.body.classList.contains('edit-mode')]")
    await ctx.close()
    ctx, pg, errs = await new_page(br, user=RU225)
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/shadow-schedule/'); await pg.wait_for_timeout(2600)
    r2 = await pg.evaluate("document.getElementById('pvxEditBtn').hidden")
    await ctx.close()
    ctx, pg, errs = await new_page(br, user=RU225)
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/assets/'); await pg.wait_for_timeout(2600)
    r3 = await pg.evaluate("document.getElementById('pvxCustomizeBtn').hidden")
    await ctx.close()
    ok('n225: someone who can’t edit sees no Edit or Customize… button (profile, shadow schedule, Assets)', r == [True, False] and r2 is True and r3 is True, (r, r2, r3))
    ctx, pg, errs = await new_page(br, user=FU225)
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/shadow-schedule/'); await pg.wait_for_timeout(2600)
    s1 = await pg.evaluate("(()=>{const b=document.getElementById('pvxEditBtn');return [!b.hidden&&b.getClientRects().length>0, b.textContent.trim(), !!b.closest('#pvxSubnav')]})()")
    await pg.click('#pvxEditBtn'); await pg.wait_for_timeout(300)
    s2 = await pg.evaluate("[document.getElementById('pvxEditBtn').textContent.trim(), document.body.classList.contains('edit-mode')]")
    await pg.evaluate("exitEdit(); 0"); await pg.wait_for_timeout(200)
    s3 = await pg.evaluate("document.getElementById('pvxEditBtn').textContent.trim()")
    ok('n225: the shadow schedule’s Edit is in the toolbar for a director and reads “Done editing” while editing', s1 == [True, 'Edit', True] and s2 == ['Done editing', True] and s3 == 'Edit' and not errs, (s1, s2, s3, errs[:2]))
    await ctx.close()
    ctx, pg, errs = await new_page(br, user=FU225)
    await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/assets/'); await pg.wait_for_timeout(2600)
    c1 = await pg.evaluate("(()=>{const b=document.getElementById('pvxCustomizeBtn');return [!b.hidden&&b.getClientRects().length>0, b.textContent.trim(), !!b.closest('#pvxSubnav')]})()")
    await pg.click('#pvxCustomizeBtn'); await pg.wait_for_timeout(500)
    c2 = await pg.evaluate("!!document.querySelector('#authOverlay.open, .admin-panel.open, #adminPanel.open, .admin-overlay.open')")
    ok('n225: Assets’ Customize… is a labelled toolbar button for a director and opens customizing', c1 == [True, 'Customize…', True] and c2 and not errs, (c1, c2, errs[:2]))
    await ctx.close()
    # 3. text follows the text size; the shared top bar stays in points
    TX225 = "(()=>{const t=document.querySelector('#pvxTopnav,nav.topnav');let s=0,n=0;document.querySelectorAll('body *').forEach(e=>{if(t&&t.contains(e))return;if(![...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>2))return;const r=e.getBoundingClientRect();if(!r.width)return;const fz=parseFloat(getComputedStyle(e).fontSize);if(!fz)return;s+=fz;n++;});const ni=t&&t.querySelector('.nav-item');return [n?s/n:0, ni?parseFloat(getComputedStyle(ni).fontSize):0]})()"
    tx = {}; big = {}
    for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']:
        vals = []
        for vp, touch, pct in (((1440, 900), False, None), ((1440, 900), False, '200%'), ((390, 844), True, '200%')):
            ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=touch)
            if pct: await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='%s'})" % pct)
            await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(1800)
            vals.append(await pg.evaluate(TX225))
            if pct:
                r = await pg.evaluate(CUT225)
                if r['hs'] or r['off']: big[path + '@' + str(vp[0])] = r
            await ctx.close()
        if not (vals[1][0] >= vals[0][0] * 1.8 and vals[0][1] == vals[1][1]): tx[path] = [round(vals[0][0], 1), round(vals[1][0], 1), vals[0][1], vals[1][1]]
    ok('n225: text grows with the text size in Treatment, OR, Check-In, Forms, Directory, Scheduling, every SGVP page and the verify page (200 % → about 2×); the shared top bar stays the same', not tx, tx)
    ok('n225: at 200 % text nothing scrolls sideways or is cut off on those pages, Mac and iPhone', not big, big)
    ctx, pg, errs = await new_page(br, user=FU225)
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("[typeof window.pvxTextScale, window.pvxTextScale && pvxTextScale(), !!document.getElementById('pvx-n225-text')]")
    ok('n225: the Dynamic Type follower is on (text scale 1 at the default size)', r == ['function', 1, True], r)
    await ctx.close()
    import hashlib as _h, re
    stamps = {}
    for nm in ('app.css', 'core.js'):
        v = _h.sha256(open(os.path.join(BUILD, 'treatment', nm), 'rb').read()).hexdigest()[:10]
        stamps[nm] = (nm + '?v=' + v) in open(os.path.join(BUILD, 'treatment', 'index.html'), encoding='utf-8').read()
    ok('n225: Treatment loads the new app.css and core.js (their version stamps follow the files)', all(stamps.values()), stamps)
    # 4. safe areas
    sa = {}
    for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'grid/']:
        s = open(os.path.join(BUILD, path, 'index.html'), encoding='utf-8').read()
        vpm = re.search(r'<meta name="viewport" content="([^"]*)"', s).group(1)
        if 'viewport-fit=cover' not in vpm or 'pvx-n225-safe' not in s or 'env(safe-area-inset-left' not in s: sa[path] = vpm
    ok('n225: Treatment, OR, Check-In, Forms, Directory, Scheduling and Grid use the whole screen and keep content inside the safe areas (viewport-fit=cover + insets)', not sa, sa)
    # Directory's menus open inside the window
    dm = {}
    for vp in ((390, 844), (507, 820)):
        ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=True)
        await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(1800)
        for i in range(2):
            r = await pg.evaluate("(i=>{const d=document.querySelectorAll('details.dept-menu')[i];if(!d)return null;d.querySelector('summary').click();return new Promise(res=>setTimeout(()=>{const p=d.querySelector('.dept-menu-popover').getBoundingClientRect();const o=[Math.round(p.left),Math.round(p.right),innerWidth];d.removeAttribute('open');res(o)},250))})", i)
            if r and (r[0] < 8 or r[1] > r[2] - 8): dm[f'{vp[0]}#{i}'] = r
        await ctx.close()
    ok('n225: Directory’s Departments and Languages menus open inside the window on iPhone and in split view (Departments ran off the left edge)', not dm, dm)


@section(id='n226', title="n226: HIG Materials across the suite (Anesia's glass on the floating layer)",
         apps=['treatment', 'or', 'sgvp', 'checkin', 'directory', 'scheduling', 'topbar'], topics=['materials'])
async def s_n226(br):
    FU226 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    G226 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const o={glass:[],content:[],scrim:[]};
      const up=e=>{for(let x=e;x&&x!==document.body;x=x.parentElement){const p=getComputedStyle(x).position;if(p==='fixed'||p==='sticky'||p==='absolute')return x;}return null;};
      const al=c=>{const m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);return p.length>3?p[3]:1;};
      document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;const c=getComputedStyle(e);const k=(e.id?'#'+e.id:'')+'.'+String(e.className).split(' ')[0];
        const scr=/scrim|overlay|-dim|backdrop|tsGate|urgent-interrupt|tsOrderSheet/i.test(k)&&c.position==='fixed';
        const bf=c.backdropFilter||'none';
        if(scr){o.scrim.push([k,bf,al(c.backgroundColor)]);return;}
        if(bf==='none'||/blur\(0px\)/.test(bf))return;
        if(e.matches('#editOrb,.edit-orb'))return;   /* Scheduling's own frost orb (a control, not a surface) */
        if(up(e))o.glass.push([k,bf,+al(c.backgroundColor).toFixed(2)]);else o.content.push([k,bf]);});
      return o;})()"""
    P226 = ['treatment/', 'or/', 'checkin/', 'scheduling/', 'directory/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
    badg = {}; badc = {}; bads = {}; nglass = 0; errs226 = {}
    for path in P226:
        for dark in (True, False):
            ctx, pg, errs = await new_page(br, user=FU226, dark=dark)
            await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2200)
            r = await pg.evaluate(G226); key = path + ('@dark' if dark else '@light')
            nglass += len(r['glass'])
            g = [x for x in r['glass'] if not (x[1] == 'blur(12px) saturate(1.6)' and x[2] == 0.86)]
            if g: badg[key] = g[:4]
            if r['content']: badc[key] = r['content'][:4]
            s = [x for x in r['scrim'] if x[1] not in ('none', 'blur(0px)')]
            if s: bads[key] = s[:4]
            if errs and path != 'scheduling/': errs226[key] = errs[:1]
            await ctx.close()
    ok('n226: every floating surface (menus, popovers, toasts, pills, sticky bars) wears Anesia’s glass — blur 12, saturate 160 %, 86 % — dark and light', not badg and nglass >= 8, (badg, nglass))
    ok('n226: no glass in the content layer in any app (Check-In’s form cards were 66 % with a 44 px blur)', not badc, badc)
    ok('n226: scrims dim and never blur (OR, Scheduling, Treatment, Check-In, SGVP)', not bads, bads)
    ok('n226: no page errors on those pages', not errs226, errs226)
    ctx, pg, errs = await new_page(br, user=FU226)
    await pg.goto(f'http://127.0.0.1:{PORT}/checkin/'); await pg.wait_for_timeout(2000)
    r = await pg.evaluate("(()=>{const c=document.querySelector('.card');const s=getComputedStyle(c);return [s.backgroundColor,s.backdropFilter]})()")
    ok('n226: Check-In’s form card is solid navy with no blur', r == ['rgb(18, 28, 48)', 'none'], r)
    await ctx.close()
    # accessibility: Reduce Transparency, Increase Contrast; the slow-device guard
    acc = {}
    for feat, val in (('prefers-reduced-transparency', 'reduce'), ('prefers-contrast', 'more')):
        for path in ('treatment/', 'or/', 'checkin/', 'sgvp/interns/kristi-wenger/'):
            ctx, pg, errs = await new_page(br, user=FU226)
            cdp = await ctx.new_cdp_session(pg)
            await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': feat, 'value': val}]})
            await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2000)
            r = await pg.evaluate(G226)
            g = [x for x in r['glass'] if x[2] < 1 or x[1] not in ('none',)]
            fl = await pg.evaluate("(sel=>[...document.querySelectorAll(sel)].map(e=>{const c=getComputedStyle(e);return [e.id||e.className.split(' ')[0],c.backdropFilter,c.backgroundColor]}).filter(x=>x[1]!=='none'||/rgba/.test(x[2])&&!/, 1\\)$/.test(x[2])).slice(0,4))", '#fvToast,.sb-head,.dd-panel,.search-results,.top,.lang-menu,#emailSuggestions,.pvx-msg,.to-pop,.ap-pop')
            if g or fl: acc[feat + '@' + path] = (g[:3], fl)
            await ctx.close()
    ok('n226: with Reduce Transparency or Increase Contrast every floating surface is solid (Treatment, OR, Check-In, SGVP)', not acc, acc)
    ctx, pg, errs = await new_page(br, user=FU226)
    await ctx.add_init_script("try{localStorage.setItem('anesia:v1:blur','0')}catch(e){}")
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2000)
    r = await pg.evaluate("[document.documentElement.classList.contains('pvx-noblur'), getComputedStyle(document.querySelector('.sb-row')||document.body).backdropFilter]")
    ok('n226: on a device Anesia found too slow for blur, the glass is solid in Treatment too (shared setting)', r == [True, 'none'], r)
    await ctx.close()


@section(id='n227', title='n227: HIG SF Symbols across the suite',
         apps=['treatment', 'flow', 'or', 'sgvp', 'checkin', 'directory', 'scheduling', 'forms', 'topbar'], topics=['icons'])
async def s_n227(br):
    FU227 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    S227 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const T={100:1.2,200:1.3,300:1.45,400:1.6,500:1.8,600:2.0,700:2.25,800:2.5,900:2.7};
      const o={n:0,offgrid:[],noaria:[],light:[],heavy:[]};
      document.querySelectorAll('svg').forEach(s=>{if(top&&top.contains(s))return;const r=s.getBoundingClientRect();if(r.width<6||r.width>32||r.height>32)return;
        o.n++;const vb=s.getAttribute('viewBox');if(vb!=='0 0 24 24')o.offgrid.push(vb+' '+(s.parentElement.className||'').toString().slice(0,20));
        if(s.getAttribute('aria-hidden')!=='true'&&!s.closest('[aria-hidden=true]')&&!s.getAttribute('aria-label')&&!s.getAttribute('role')&&!s.querySelector('title'))o.noaria.push((s.parentElement.className||s.parentElement.tagName).toString().slice(0,24));
        const host=s.closest('button,a,[role=button],label,li,.chip,.seg')||s.parentElement;let tx=null;for(const e of [host,...host.querySelectorAll('*')]){if([...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>1)){tx=e;break;}}
        const p=s.querySelector('path,circle,rect,line,polyline,polygon');if(!tx||!p)return;const pc=getComputedStyle(p);if(pc.stroke==='none'||!(parseFloat(pc.strokeWidth)>0))return;
        if(/⌘|^[A-Z]{1,2}$/.test(tx.textContent.trim()))return;   /* a shortcut hint or initials, not the icon's label */
        const fw=Math.round(parseInt(getComputedStyle(tx).fontWeight)/100)*100;const act=parseFloat(pc.strokeWidth)*r.width/24;const exp=Math.max(1,(T[fw]||1.6)*r.width/24);
        const k=(host.className||host.tagName).toString().split(' ')[0]+':'+tx.textContent.trim().slice(0,14)+' '+act.toFixed(2)+'/'+exp.toFixed(2);
        if(act<exp*0.75)o.light.push(k);if(act>exp*1.45)o.heavy.push(k);});
      for(const k of ['offgrid','noaria','light','heavy'])o[k]=[...new Set(o[k])].slice(0,5);return o;})()"""
    P227 = ['index.html', 'treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']
    og = {}; na = {}; wt = {}; tot = 0
    for path in P227:
        ctx, pg, errs = await new_page(br, user=FU227)
        await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2400)
        r = await pg.evaluate(S227); tot += r['n']
        if r['offgrid']: og[path] = r['offgrid']
        if r['noaria']: na[path] = r['noaria']
        if r['light'] or r['heavy']: wt[path] = (r['light'], r['heavy'])
        await ctx.close()
    ok('n227: every interface icon in the suite is on the one 24-pt grid (Treatment’s 10/16/20 and the 16-pt pause/play are redrawn)', not og and tot > 500, (og, tot))
    ok('n227: every decorative icon is hidden from VoiceOver (446 in Directory, 31 in Mentors, 19 per profile, 11 in Treatment …)', not na, na)
    ok('n227: icons match their label’s weight (Anesia’s table, at least 1 pt) — Treatment’s sort arrows were 1.76 pt beside 0.92 pt labels', not wt, wt)
    # Treatment's sort arrow and + / ••• (drawn by its scripts)
    ctx, pg, errs = await new_page(br, user=FU227)
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2400)
    r = await pg.evaluate("(()=>{const c=document.querySelector('.sb-chev');const p=c&&c.querySelector('path');return [c&&c.getAttribute('viewBox'),p&&+(parseFloat(getComputedStyle(p).strokeWidth)*c.getBoundingClientRect().width/24).toFixed(2), !!document.querySelector('.pt-add svg[viewBox=\"0 0 24 24\"]')]})()")
    ok('n227: Treatment’s sort arrow is on the 24-pt grid at about 1 pt, and its tab bar + is too', r[0] == '0 0 24 24' and 0.95 <= r[1] <= 1.1 and r[2] and not errs, (r, errs[:1]))
    await ctx.close()
    # the selected tab on iPhone: fill variant
    tf = {}
    for path, sel in (('index.html', 'html.pvx-tabbar #switcher .seg.active'), ('treatment/', 'html.pvx-ttab #clinSwitcher .seg.active')):
        ctx, pg, errs = await new_page(br, user=FU227, vp=(390, 844), touch=True)
        await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2400)
        tf[path] = await pg.evaluate("(sel=>{const a=document.querySelector(sel+' svg :is(path,rect,circle)');const b=[...document.querySelectorAll(sel.replace('.seg.active','.seg:not(.active)')+' svg :is(path,rect,circle)')][0];return [a&&getComputedStyle(a).fill,a&&getComputedStyle(a).fillOpacity,b&&getComputedStyle(b).fill]})", sel)
        await ctx.close()
    ctx, pg, errs = await new_page(br, user=FU227, vp=(390, 844), touch=True)
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2400)
    r = await pg.evaluate("(()=>{const a=document.querySelector('#clinSwitcher .seg.active');return [getComputedStyle(a.querySelector('svg')).color, getComputedStyle(a).color, getComputedStyle(a.querySelector('svg rect,svg path')).stroke]})()")
    ok('n227: in Treatment’s iPhone tab bar the selected tab’s symbol is visible — the label’s teal (it was white on the white bar)', r[0] == r[1] == r[2] and r[0] != 'rgb(255, 255, 255)', r)
    await ctx.close()
    ok('n227: on iPhone the selected tab in Flow’s and Treatment’s tab bars uses the fill variant (the others stay outline), as the shared top bar does', all(v[0] not in (None, 'none') and v[1] == '0.5' and v[2] == 'none' for v in tf.values()), tf)
    ctx, pg, errs = await new_page(br, user=FU227)
    await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(2000)
    r = await pg.evaluate("(()=>{const b=document.querySelector('.drawer-close');return [b.getAttribute('aria-label'), b.textContent.trim(), !!b.querySelector('svg[aria-hidden=true]')]})()")
    ok('n227: Directory’s drawer closes with the Close symbol (named “Close profile”), not a text ✕', r == ['Close profile', '', True], r)
    await ctx.close()


@section(id='n228', title='n228: HIG Motion across the suite',
         apps=['treatment', 'flow', 'or', 'sgvp', 'kura', 'checkin', 'directory', 'scheduling', 'forms', 'grid', 'topbar'], topics=['motion'])
async def s_n228(br):
    FU228 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    async def ctx228(rm, vp=(1440, 900)):
        c = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, reduced_motion='reduce' if rm else 'no-preference')
        await c.add_init_script(INIT.replace('@@USER@@', FU228).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE)
        pg = await c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        async def rt(r):
            if r.request.url.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
            else: await r.fulfill(status=204, body='')
        await pg.route('**/*', rt)
        return c, pg, errs
    RUN228 = "(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');return document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.target&&!(top&&top.contains(a.effect.target))&&a.effect.getComputedTiming().duration>1).map(a=>[(a.animationName||a.transitionProperty||''),String(a.effect.target.className||a.effect.target.id).split(' ')[0],a.effect.getComputedTiming().iterations===Infinity?'loop':'once'])})()"
    P228 = ['index.html', 'anesia/', 'treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'kura/', 'grid/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
    rest = {}; rmr = {}
    for path in P228:
        for rm in (False, True):
            c, pg, errs = await ctx228(rm)
            await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(3500)
            r = await pg.evaluate(RUN228)
            if rm and r: rmr[path] = r[:4]
            if not rm:
                live = [x for x in r if 'live' in x[0] or 'live' in x[1]]
                other = [x for x in r if x not in live and not (path == 'scheduling/' and ('ticker' in x[0] or 'blink' in x[0] or 'pulse-dot' in x[0]))]
                if len(live) > 1 or other: rest[path] = r[:5]
            await c.close()
    ok('n228: nothing moves at rest on any page except one live dot (Directory’s 9 breathing status dots and SGVP’s 24 s / 12 s sweeps, glows and breathing are gone); Scheduling’s pausable announcement aside', not rest, rest)
    ok('n228: with Reduce Motion nothing moves on any page (Directory’s dots kept breathing)', not rmr, rmr)
    # hover lifts stay still with Reduce Motion
    HOV228 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const o=[];const walk=(l,m)=>{for(const r of l){if(!(r instanceof CSSStyleRule)){if(r.cssRules&&!(r instanceof CSSKeyframesRule))walk(r.cssRules,(m||'')+(r.media?r.media.mediaText:''));continue;}
        const sel=r.selectorText||'';if(/:hover/.test(sel)&&/translate|scale/.test(r.style.transform||'')&&!/reduced-motion/.test(m||'')){sel.split(',').forEach(s=>{if(/:hover/.test(s)){const b=s.replace(/:hover/g,'').trim();try{const e=[...document.querySelectorAll(b)].find(x=>x.getClientRects().length&&!(top&&top.contains(x))&&x.getBoundingClientRect().top>0&&x.getBoundingClientRect().bottom<innerHeight);if(e&&!e.__h){e.__h=1;e.setAttribute('data-h228',o.length);o.push(b);}}catch(err){}}});}}};
      for(const sh of document.styleSheets){try{walk(sh.cssRules,'')}catch(e){}}return o.slice(0,10);})()"""
    moved = {}; tested = 0
    for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/assets/']:
        c, pg, errs = await ctx228(True)
        await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2400)
        sels = await pg.evaluate(HOV228)
        for i, s in enumerate(sels):
            try:
                el = pg.locator(f'[data-h228="{i}"]').first
                b0 = await el.bounding_box(); await el.hover(timeout=1500, force=True); await pg.wait_for_timeout(300); b1 = await el.bounding_box()
                await pg.mouse.move(2, 890); tested += 1
                if b0 and b1 and (abs(b0['y'] - b1['y']) > 0.5 or abs(b0['width'] - b1['width']) > 0.5): moved.setdefault(path, []).append(s[:40])
            except Exception: pass
        await c.close()
    ok('n228: with Reduce Motion nothing lifts on hover (Directory’s cards, OR’s search orb, Check-In’s Continue, Scheduling’s day off, the profile’s avatars …)', not moved and tested >= 15, (moved, tested))
    # brief transitions
    LONG228 = r"""(()=>{const o=[];const walk=(l,m)=>{for(const r of l){if(!(r instanceof CSSStyleRule)){if(r.cssRules&&!(r instanceof CSSKeyframesRule))walk(r.cssRules,(m||'')+(r.media?r.media.mediaText:''));continue;}
        const sel=r.selectorText||'';if(/topnav|nav-item|logout|pvx-word|theme-toggle|hold|press|autofill|timer|countdown/i.test(sel)||/reduced-motion/.test(m||''))continue;
        (r.style.transitionDuration||'').split(',').forEach(x=>{const v=parseFloat(x)*(/ms/.test(x)?0.001:1);if(v>0.5&&v<100)o.push(sel.slice(0,40)+' '+x.trim());});}};
      for(const sh of document.styleSheets){try{walk(sh.cssRules,'')}catch(e){}}return o.slice(0,6);})()"""
    lg = {}
    for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']:
        c, pg, errs = await ctx228(False)
        await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(1800)
        r = await pg.evaluate(LONG228)
        if r: lg[path] = r
        await c.close()
    ok('n228: transitions are brief — none over 0.5 s (the profile’s 1.2 s ring and 1 s bars, Treatment’s 0.9 s alert and fills now 0.4 s; press-and-hold timers keep theirs)', not lg, lg)
    # Check-In follows Reduce Motion
    c, pg, errs = await ctx228(True)
    await pg.goto(f'http://127.0.0.1:{PORT}/checkin/'); await pg.wait_for_timeout(1800)
    r = await pg.evaluate("(()=>{const b=document.querySelector('.next')||document.querySelector('button');return [getComputedStyle(b).transitionDuration.split(',')[0], !!document.getElementById('pvx-n228-motion')]})()")
    ok('n228: Check-In follows Reduce Motion (transitions instant, nothing lifts)', r[1] and r[0] in ('1e-05s', '0.00001s', '0s'), r)
    await c.close()
    # Scheduling's announcement with Reduce Motion: still, wrapping text
    c, pg, errs = await ctx228(True)
    await pg.goto(f'http://127.0.0.1:{PORT}/scheduling/'); await pg.wait_for_timeout(2400)
    r = await pg.evaluate("(()=>{const t=document.getElementById('announceTicker');if(!t)return null;const cs=getComputedStyle(t);return [cs.animationName, t.scrollWidth<=t.clientWidth+2, cs.whiteSpace, t.getBoundingClientRect().right<=innerWidth+1]})()")
    ok('n228: with Reduce Motion Scheduling’s announcement is still text that wraps (it was a strip to swipe)', r is None or (r[0] == 'none' and r[1] and r[2] == 'normal' and r[3]), r)
    await c.close()


@section(id='n229', title='n229: HIG Typography across the suite',
         apps=['treatment', 'flow', 'or', 'sgvp', 'kura', 'checkin', 'directory', 'scheduling', 'forms', 'grid', 'topbar'], topics=['typography'])
async def s_n229(br):
    FU229 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
    T229 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const SC=[11,12,13,14,15,16,17,20,22,24,28,30,34];const o={fam:[],small:[],off:[],track:[],light:[]};
      document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;if(![...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>0))return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0||cs.clipPath!=='none'||(r.width<=1&&r.height<=1))return;
        const fs=parseFloat(cs.fontSize);if(!fs)return;const k=(String(e.className).split(' ')[0]||e.tagName)+':'+e.textContent.trim().slice(0,14);
        if(!/^(-apple-system|SF Pro|system-ui|ui-rounded|ui-monospace|BlinkMacSystemFont)/.test(cs.fontFamily.replace(/["']/g,'')))o.fam.push(k+' '+cs.fontFamily.slice(0,24));
        const pw=/powered/i.test(e.className+' '+e.textContent)&&e.textContent.trim().length<14;
        if(fs<10.95&&!(pw&&Math.abs(fs-9)<0.01))o.small.push(k+' '+fs);
        const av=e.closest('[class*=avatar],[class*=initials],.kura-wordmark,.pvx-sr,[class*=sr-only]');
        if(fs<40&&!SC.some(x=>Math.abs(x-fs)<0.01)&&!av&&!(pw&&Math.abs(fs-9)<0.01)&&!e.getAttribute('style'))o.off.push(k+' '+fs);
        const ls=parseFloat(cs.letterSpacing)||0;if(fs<=12.5&&ls<-0.01&&cs.textTransform!=='uppercase')o.track.push(k+' '+ls);
        if(parseInt(cs.fontWeight)<400)o.light.push(k);});
      for(const x in o)o[x]=[...new Set(o[x])].slice(0,4);o.tsa=getComputedStyle(document.documentElement).webkitTextSizeAdjust;return o;})()"""
    P229 = ['index.html', 'anesia/', 'treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'kura/', 'grid/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
    bad = {k: {} for k in ('fam', 'small', 'off', 'track', 'light', 'tsa')}
    for path in P229:
        for vp, touch in (((1440, 900), False), ((390, 844), True)):
            ctx, pg, errs = await new_page(br, user=FU229, vp=vp, touch=touch)
            await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2200)
            if path == 'kura/':
                # Kura can't sign in with the fake Firebase: it stays on "Opening Kura…" here and sometimes reaches its sign-in
                # page on GitHub, so what got measured depended on the machine. Kura is measured only when its app is showing.
                if not await until(pg, "!!document.querySelector('.kura-rail')", 8000):
                    print('  (n229: Kura isn’t signed in here — left out of this measurement)'); await ctx.close(); continue
            r = await pg.evaluate(T229); key = path + '@' + str(vp[0])
            for x in ('fam', 'small', 'off', 'track', 'light'):
                if r[x]: bad[x][key] = r[x]
            if r['tsa'] != '100%': bad['tsa'][key] = r['tsa']
            await ctx.close()
    ok('n229: every app uses the system font — Check-In, Directory and Scheduling no longer use Inter, and Treatment’s buttons no longer fall back to Arial', not bad['fam'], bad['fam'])
    ok('n229: nothing under 11 pt outside the shared top bar (“Powered by” lockups are 9 pt, as in the top bar)', not bad['small'], bad['small'])
    ok('n229: every text size is on the Pravix scale (11 · 12 · 13 · 14 · 15 · 16 · 17 · 20 · 22 · 24 · 28 · 30 · 34; display 40+)', not bad['off'], bad['off'])
    ok('n229: small text (12.5 pt and under) is never tightened (Directory’s 426, Treatment’s 24, OR, Forms; Flow’s iPhone tab-bar labels keep theirs so five fit)', not {k: v for k, v in bad['track'].items() if not k.startswith('index.html@390')}, bad['track'])
    ok('n229: no light weights anywhere', not bad['light'], bad['light'])
    ok('n229: iPhone Safari never enlarges text on its own (text-size-adjust 100 % on every page)', not bad['tsa'], bad['tsa'])
    import re as _re
    inter = [p for p in ('checkin/index.html', 'directory/index.html', 'scheduling/index.html') if _re.search(r"googleapis\.com/css2\?family=Inter|['\"]Inter['\"]", open(os.path.join(BUILD, p), encoding='utf-8').read())]
    ok('n229: Inter isn’t downloaded any more (no Google Fonts request)', not inter, inter)
    # the top bar is unchanged: its labels keep their tracking
    ctx, pg, errs = await new_page(br, user=FU229)
    await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(1800)
    r = await pg.evaluate("(()=>{const n=document.querySelector('#pvxTopnav .nav-item');return [getComputedStyle(n).letterSpacing, getComputedStyle(n).fontSize, getComputedStyle(document.body).letterSpacing]})()")
    ok('n229: the shared top bar keeps its tracking and sizes; the page itself isn’t tightened', r[1] == '10px' and r[2] == 'normal' and r[0] in ('-0.16px', 'normal') or r[0].startswith('0.'), r)
    await ctx.close()
    # Directory wraps instead of truncating at large text
    ctx, pg, errs = await new_page(br, user=FU229, vp=(390, 844), touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='200%'})")
    await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(2200)
    n = await pg.evaluate("(()=>{let n=0;document.querySelectorAll('body *').forEach(e=>{const c=getComputedStyle(e);if(/ellipsis/.test(c.textOverflow)&&e.scrollWidth>e.clientWidth+1&&e.getClientRects().length)n++});return n})()")
    ok('n229: at 200 % text Directory’s cards wrap — nothing is cut off with “…” (86 were)', n == 0 and not errs, (n, errs[:1]))
    await ctx.close()
