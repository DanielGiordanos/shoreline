"""Pravix Flow — the n332 build's own checks: HIG Design principles, Accessibility, Color (Nov 6 2026), on Flow's page
(with Ultrasound). Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Nala','Brooks','Waiting','Lobby',3,'unassigned','Canine',8,'Vaccines'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],
 ['Ziggy','Moreau','Diagnostics','Room 3',1,D[2],'Canine',70,'Collapse'],['Pepper','Nakamura','Ultrasound','Room 4',2,D[0],'Canine',55,'Abdominal pain']]
 .forEach((r,i)=>{ const p=patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]});
   if(i===5) p.ultrasound={study:'Abdominal Ultrasound',clinicalQuestion:'Foreign body?',status:'requested',requestStatus:'ready',requestedAt:new Date(now-20*60000),queuePosition:1};
   PATIENTS.push(p); }); renderAll(); })()"""
CR = """(el=>{const P=s=>{const m=s.match(/[\\d.]+/g);return m.map(Number)};const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};
  const L=c=>.2126*lin(c[0])+.7152*lin(c[1])+.0722*lin(c[2]);const over=(f,b)=>[0,1,2].map(i=>f[i]*f[3]+b[i]*(1-f[3]));
  let st=[],e=el;while(e){const c=P(getComputedStyle(e).backgroundColor);if(c.length<4)c.push(1);if(c[3]>0)st.push(c);if(c[3]>=1)break;e=e.parentElement}
  let b=st.length&&st[st.length-1][3]>=1?st.pop():(document.body.classList.contains('dark')?[8,14,26,1]:[255,255,255,1]);for(let i=st.length-1;i>=0;i--)b=over(st[i],b).concat(1);
  let f=P(getComputedStyle(el).color);if(f.length<4)f.push(1);f=over(f,b);return +((Math.max(L(f),L(b))+.05)/(Math.min(L(f),L(b))+.05)).toFixed(2)})"""


async def ctx(br, dark=True, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light'); o.update(kw)
    c = await br.new_context(**o)
    if not dark: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEEDJS); await p.wait_for_timeout(900)
    return c, p, e


@section(id='t332', title='n332 · Flow follows the HIG Design principles, Accessibility and Color pages', apps=['flow'], topics=['accessibility', 'color', 'design-principles'], engines=('chromium', 'webkit'))
async def s_t332(br):
    c, p, e = await ctx(br, dark=False)
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(700)
    w = await p.evaluate("(()=>{const el=[...document.querySelectorAll('#view-flow .card .wait.warn')].find(x=>x.offsetParent); return el&&{cr:(" + CR + ")(el), pill:getComputedStyle(el).borderRadius, glyph:getComputedStyle(el,'::before').content, sr:(el.querySelector('.pvx-sr332')||{}).textContent}})()")
    ok('Accessibility · in light mode a long wait reads at 4.5 : 1 or more (it was 1.46 : 1, the dark-mode amber on white)', w and w['cr'] >= 4.5, w)
    ok('…and it isn’t colour alone: a pill with a clock, and VoiceOver hears “long wait”', w and w['pill'] != '0px' and w['glyph'] not in ('none', 'normal', '') and w['sr'] == ' (long wait)', w)
    sp = await p.evaluate("(()=>{const card=[...document.querySelectorAll('#view-flow .card')].find(c=>/Bella/.test(c.textContent)); const s=card.querySelector('.pm-sp'); return {reason:card.querySelector('.c-reason').textContent.trim(), hidden:!s||getComputedStyle(s).display==='none'}})()")
    ok('Accessibility · nothing under 11 pt: a card says its species in words (“Canine · Vomiting”), not in 4.8 pt letters in the avatar', sp['reason'] == 'Canine · Vomiting' and sp['hidden'], sp)
    await p.evaluate("(()=>{const x=PATIENTS.find(q=>q.name==='Rocky'); openDrawer(x.id)})()"); await p.wait_for_timeout(900)
    d = await p.evaluate("(()=>{const b=document.getElementById('recRequest'); return {cr:b?(" + CR + ")(b):null, sub:document.getElementById('dSub').textContent}})()")
    ok('…the drawer’s Request records reads at 4.5 : 1 in light (it was 2.07 : 1)', d['cr'] and d['cr'] >= 4.5, d)
    ok('Design principles · no empty separators under the name (it read “Canine · ·”)', d['sub'] == 'Canine', d)
    g = await p.evaluate("(()=>{const i=document.getElementById('critIsland').getBoundingClientRect(), dr=document.getElementById('drawer').getBoundingClientRect(); return {iR:Math.round(i.right), dL:Math.round(dr.left)}})()")
    ok('Design principles · on a Mac the critical-patient banner moves beside an open patient instead of over its header', g['iR'] <= g['dL'], g)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(500)
    await p.goto(f'http://127.0.0.1:{PORT}/ultrasound/'); await p.wait_for_selector('#subnavUs', state='attached'); await p.wait_for_timeout(2000)   # n333: its own page
    await p.evaluate(SEEDJS); await p.evaluate("switchUsView('today')"); await p.wait_for_timeout(1200)
    u = await p.evaluate("(()=>{const t=[...document.querySelectorAll('#view-us-today .target-label')].find(x=>x.offsetParent), n=document.getElementById('umNext'); return {cr:t?(" + CR + ")(t):null, nTop:Math.round(n.getBoundingClientRect().top), iB:Math.round(document.getElementById('critIsland').getBoundingClientRect().bottom)}})()")
    ok('…Ultrasound’s “30m target” reads at 4.5 : 1 in light (it was 1.34 : 1)', u['cr'] and u['cr'] >= 4.5, u)
    ok('…and on Ultrasound Today the banner no longer covers Next Up', u['nTop'] >= u['iB'], u)
    ok('…no page errors (light)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    await p.evaluate("switchView('dashboard')"); await p.wait_for_timeout(900)
    a = await p.evaluate("(()=>{const it=[...document.querySelectorAll('#view-dashboard .attn-item')].filter(n=>/has no doctor assigned/.test(n.textContent)); return it.map(n=>[n.querySelector('.patient').textContent, n.getAttribute('role'), n.tabIndex, n.getAttribute('aria-label')])})()")
    ok('Design principles · the Attention Center lists the sickest first: P1 Bella, then P2 Milo, then P3 Nala (Nala, a vaccine visit, came first)', [x[0] for x in a][:3] == ['Bella', 'Milo', 'Nala'], a)
    ok('Accessibility · each alert is a button you can Tab to, named by what it says', a and all(x[1] == 'button' and x[2] == 0 and x[3] and x[3].startswith(x[0] + ' has no doctor assigned, ') for x in a), a[:2])
    await p.focus('#view-dashboard .attn-item[role=button]'); await p.keyboard.press('Enter'); await p.wait_for_timeout(800)
    op = await p.evaluate("(()=>{const d=document.getElementById('drawer'); return d.classList.contains('open')&&document.getElementById('dName').textContent})()")
    ok('…and Return opens that patient', op and 'Bella' in op, op)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(400)
    ch = await p.evaluate("(()=>{const c=[...document.querySelectorAll('.command-kpi__chip')].find(x=>/target/i.test(x.textContent)); return c&&{t:c.textContent, ok:c.classList.contains('is-ok'), warn:c.classList.contains('is-warn'), col:getComputedStyle(c).color}})()")
    ok('Color · the Longest tile’s tag is green “On target” or red “Above target”, sentence case (it was red “On Target”)', ch and ((ch['t'] == 'On target' and ch['ok']) or (ch['t'] == 'Above target' and ch['warn'])), ch)
    await p.wait_for_timeout(1200)
    t = await p.evaluate("(document.querySelector('#critIsland .ci-wait')||{}).textContent||''")
    import re as _re
    ok('Design principles · the critical banner counts hours (“Waiting 1:35:02”; it read “95:02”)', bool(_re.fullmatch(r'Waiting 1:3[5-6]:\d\d', t)), t)
    f = await p.evaluate("(()=>{const d=[...document.querySelectorAll('.site-footer > div')].pop(); return (" + CR + ")(d)})()")
    ok('Accessibility · the footer’s “All program data is confidential” reads at 4.5 : 1 (it was 2.21 : 1)', f >= 4.5, f)
    await p.evaluate("switchView('client')"); await p.wait_for_timeout(900)
    cl = await p.evaluate("(()=>{const s=[...document.querySelectorAll('#view-client .pm-sp')].find(x=>x.offsetParent); return s?getComputedStyle(s).display:'none-found'})()")
    ok('…the lobby TV (Client Display) is left exactly as it was', cl != 'none', cl)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(600)
    await p.evaluate("(()=>{const x=PATIENTS.find(q=>q.name==='Milo'); openDrawer(x.id)})()"); await p.wait_for_timeout(1000)
    m = await p.evaluate("(()=>{const i=document.getElementById('critIsland').getBoundingClientRect(), x=document.querySelector('#drawer .x,#drawer [aria-label=Close],#drawer .close,#drawer .d-close'), n=document.getElementById('dName').getBoundingClientRect(); return {iB:Math.round(i.bottom), nT:Math.round(n.top), xT:x?Math.round(x.getBoundingClientRect().top):null}})()")
    ok('Design principles · on iPhone the banner no longer hides the open patient’s name and Close (it sat on top of both)', m['nT'] >= m['iB'] and (m['xT'] is None or m['xT'] >= m['iB']), m)
    ok('…no page errors (iPhone)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, dark=False, contrast='more')
    v = await p.evaluate("getComputedStyle(document.body).getPropertyValue('--ink-400').trim().toUpperCase()")
    ok('Increase Contrast · Flow’s quiet text and inks get firmer (only a few controls changed before)', v == '#4A4A50', v)
    await c.close()
