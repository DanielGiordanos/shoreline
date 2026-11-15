"""Pravix Flow — the n385 build's own checks (Nov 15 2026): one copy of each shared helper (reorganisation, stage 2a).
Twenty-one small helpers were declared again in block after block of the layer files, 61 declarations in all, with the same
code: the escape for markup thirteen times. Each is declared once in assets/flow/app.js under a page-wide name (pvxEsc,
pvxEscQ, pvxTyping, pvxPatientById …) and the blocks call that. Nothing a person sees changes."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
rd = lambda *p: open(os.path.join(BUILD, *p), encoding='utf-8').read()
ONE = ['pvxEsc', 'pvxEscQ', 'pvxTyping', 'pvxPatientById', 'pvxActivePatient', 'pvxWho', 'pvxMe', 'pvxUid', 'pvxEmail', 'pvxPad2', 'pvxHm', 'pvxMinsSince', 'pvxTenant', 'pvxDb', 'pvxNote',
       'pvxFullName', 'pvxShown', 'pvxView', 'pvxReduceMotion', 'pvxUnpark', 'pvxGrabZone']


async def ctx(br):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', service_workers='block')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route); p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

SEED2 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['<img src=x onerror="window.__ran=1">','<b>Hale</b>','Exam','Room 1',2,D[0],'Canine',35,'Cough']]
   .forEach((r,i)=>PATIENTS.push(patient({id:'h'+i,name:r[0],last:r[1],owner:'Synthetic',status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
  renderAll(); return PATIENTS.length; })()"""


@section(id='t385', title='n385 · one copy of each shared helper: 21 helpers the layer blocks each declared for themselves are declared once in app.js, and the blocks call that one',
         apps=['flow'], topics=['performance', 'security'], engines=('chromium', 'webkit'))
async def s_t385(br):
    app = rd('assets', 'flow', 'app.js'); lay = rd('assets', 'flow', 'layers.js') + rd('assets', 'flow', 'layers2.js')
    decl = {n: len(re.findall(r'(?m)^function ' + n + r'\(', app)) for n in ONE}
    ok('The main script · each of the 21 helpers is declared once, in its own section at the top of app.js', all(v == 1 for v in decl.values()) and 'PVX-N385' in app and app.index('PVX-N385') < app.index('const STATUSES'), {k: v for k, v in decl.items() if v != 1})
    ok('…and no layer block declares one of those names again', not re.findall(r'function (?:' + '|'.join(ONE) + r')\(', lay))
    # the copies are gone: the escape was declared 17 times with these two bodies
    e4 = re.findall(r'function esc\((\w)\)\s*\{\s*return String\(\1\s*==\s*null\s*\?\s*\'\'\s*:\s*\1\)\.replace\(/\[&<>"\]/g', lay); e5 = re.findall(r'function esc\((\w)\)\s*\{\s*return String\(\1\s*==\s*null\s*\?\s*\'\'\s*:\s*\1\)\.replace\(/\[&<>"\'\]/g', lay)
    left = re.findall(r'function esc\(', lay)
    ok('The layer files · no block carries its own copy of the escape any more (it was declared 17 times with the same two bodies); the two that remain are different functions', not e4 and not e5 and len(left) == 2, [len(e4), len(e5), len(left)])
    gone = {'typing': r'function typing\(\)\{ var a=document\.activeElement; return !!\(a&&', 'pad': r'function pad\(n\)\{ return \(n<10\?\'0\':\'\'\)\+n; \}', 'byId': r'function byId\(id\)\{ try\{ return PATIENTS\.find', 'me': r'function me\(\)\{ var u=null; try\{ u=\(typeof AUTH'}
    ok('…nor of typing, pad, byId or me', not any(re.search(v, lay) for v in gone.values()), [k for k, v in gone.items() if re.search(v, lay)])
    uses = {n: len(re.findall(r'\b' + n + r'\(', lay)) for n in ONE}
    ok('…and the blocks call the one copy (the two escapes are called from more than 300 places between them)', uses['pvxEsc'] + uses['pvxEscQ'] > 300 and all(v > 0 for v in uses.values()), {k: v for k, v in uses.items() if v < 1})

    c, p, e = await ctx(br)
    r = await p.evaluate("""(()=>{ const IN=[null,undefined,'',0,1.5,true,'a&b','<img src=x onerror=alert(1)>','"q"',"it's",'&amp;','<<>>""&&\\'\\'',[1,'<'],{toString(){return '<o>';}},'名前 & <b>'];
      return {types:%s.map(n=>typeof window[n]), esc:IN.map(v=>pvxEsc(v)), same4:IN.every(v=>pvxEsc(v)===rdEsc(v)), same5:IN.every(v=>pvxEscQ(v)===bcEsc(v)), q:pvxEscQ("it's <b>"), n:pvxEsc(null)+'|'+pvxEsc(undefined)+'|'+pvxEsc(0)}; })()""" % repr(ONE))
    ok('In the page · all 21 are there as functions', r['types'] == ['function'] * 21, r['types'])
    ok('…pvxEsc turns & < > " into text, leaves nothing for null, and answers exactly as the main script’s own escape on 15 awkward inputs; pvxEscQ also turns \' and matches the main script’s',
       r['esc'][7] == '&lt;img src=x onerror=alert(1)&gt;' and r['esc'][8] == '&quot;q&quot;' and r['n'] == '||0' and r['same4'] and r['same5'] and r['q'] == 'it&#39;s &lt;b&gt;', r)
    await p.evaluate(SEED2); await p.wait_for_timeout(900)
    r = await p.evaluate("""(async()=>{ const o={}; o.who=pvxWho(); o.me=pvxMe(); o.uid=pvxUid(); o.email=pvxEmail(); o.pad=[pvxPad2(7),pvxPad2(12)]; o.tenant=pvxTenant(); o.db=!!pvxDb(); o.view=[pvxView(),currentView];
      o.byId=(pvxPatientById('h0')||{}).name; o.none=pvxPatientById('nope'); o.cur0=pvxActivePatient(); o.name=pvxFullName({name:'Bella',last:'Rivera'}); o.mins=pvxMinsSince(new Date(Date.now()-5*60000).toISOString());
      o.typing0=pvxTyping(); const i=document.getElementById('globalSearch'); if(i){ i.focus(); o.typing1=pvxTyping(); i.blur(); }
      const b=document.querySelector('#subnavFlow button'); o.shown=pvxShown(b); const h=document.createElement('button'); h.style.display='none'; document.body.appendChild(h); o.hidden=pvxShown(h); h.remove();
      o.reduce=typeof pvxReduceMotion(); openDrawer('h0'); await new Promise(r=>setTimeout(r,500)); o.cur1=(pvxActivePatient()||{}).id; closeDrawer(); return o; })()""")
    ok('…who is signed in: pvxWho, pvxMe (name, account, initials), pvxUid and pvxEmail answer for the signed-in person', r['who'] == 'Daniel Giordano' and r['me'] == {'name': 'Daniel Giordano', 'uid': 'u1', 'initials': 'DG'} and r['uid'] == 'u1' and 'pravix.app' in r['email'], [r['who'], r['me'], r['uid'], r['email']])
    ok('…patients: pvxPatientById finds one and gives null for none, pvxActivePatient is null until a drawer is open, pvxFullName joins the two names',
       r['byId'] == 'Bella' and r['none'] is None and r['cur0'] is None and r['cur1'] == 'h0' and r['name'] == 'Bella Rivera', [r['byId'], r['none'], r['cur0'], r['cur1'], r['name']])
    ok('…and the rest: two-digit numbers, minutes since a time, the hospital, the database, the view on screen, typing in a field, an element that can be clicked',
       r['pad'] == ['07', '12'] and r['mins'] == 5 and r['tenant'] == 'shoreline' and r['db'] and r['view'][0] == r['view'][1] and r['typing0'] is False and r.get('typing1') is True and r['shown'] is True and r['hidden'] is False and r['reduce'] == 'boolean', r)
    # what the escape is for: a stored name written as markup is shown as text wherever a block draws it
    await p.evaluate("switchView('list')"); await p.wait_for_timeout(700); await p.evaluate("openDrawer('h1')"); await p.wait_for_timeout(900)
    r = await p.evaluate("""({ran:window.__ran||0, imgs:document.querySelectorAll('img[src="x"]').length, bold:[...document.querySelectorAll('#view-list b, #drawer b')].filter(b=>b.textContent==='Hale').length,
      list:/<img src=x/.test((document.querySelector('#view-list')||{}).textContent||''), drawer:/<img src=x/.test((document.getElementById('drawer')||{}).textContent||'')})""")
    ok('A stored name written as markup is still shown as the text it is in the list and the drawer (the blocks that draw it now use the one escape), and nothing in it runs',
       r['ran'] == 0 and r['imgs'] == 0 and r['bold'] == 0 and r['list'] and r['drawer'], r)
    ok('No page errors', not newerr(e), newerr(e)[:3]); await c.close()
