"""Pravix Rounds — the n381 build's own checks (Nov 14 2026): the two checks Flow had, on Rounds.
A stored value never runs as script: Rounds' own screens already showed every field as text; the one place that didn't was
the "Resuscitation updated" message (code shared with Flow), now behind the same allowlist. Rounds does nothing at rest
(it didn't before; this keeps it so). Firebase and the QR library come from this site. Chromium and WebKit."""
import os, re, hashlib
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
VD = os.path.join(BUILD, 'assets', 'vendor')
VF = ['firebase-10.12.5/firebase-app-compat.js', 'firebase-10.12.5/firebase-firestore-compat.js', 'firebase-10.12.5/firebase-auth-compat.js', 'qrcode-generator-1.4.4/qrcode.js']


async def ctx(br, fake=True, seed=True, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    if fake:
        await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    await c.add_init_script("window.__ran=[]; window.__hit=function(f){ window.__ran.push(f); };")
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
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(2800 if fake else 3500)
    if fake and seed: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return c, p, e

PAY = """const pay=f=>'<img/src="x"/onerror="__hit(\\''+f+'\\')">', sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const bad=()=>[...document.querySelectorAll('img[src="x"],[onerror],[data-pvxq]')].map(e=>{ let n=e,a=[]; while(n&&a.length<3){ a.push(n.tagName+'.'+String(n.className||'').split(' ')[0]); n=n.parentElement; } return a.join('<'); });"""

RESUS = "(async()=>{ " + PAY + """
  const p=PATIENTS.filter(x=>x.rounds)[0]; p.name=pay('name'); renderRounds(); await sleep(500);
  rdHandleAct('toggle',{dataset:{pid:p.id}}); await sleep(700);
  const b=document.querySelector('.rd-row[data-pid="'+p.id+'"] [data-act="resus-menu"]'); b.click(); await sleep(300);
  const items=[...document.querySelectorAll('.rd-menu button')], pick=items.find(x=>!x.classList.contains('on'))||items[0]; const label=pick.textContent.trim(); pick.click(); await sleep(600);
  const note=[...document.querySelectorAll('#notes .note')].find(n=>/Resuscitation updated/.test(n.textContent));
  return {ran:window.__ran.slice(), bad:bad(), menu:items.map(x=>x.textContent.trim()), picked:label, sub:note?note.querySelector('.n-sub').textContent:null, kids:note?note.querySelector('.n-sub').children.length:null}; })()"""

NOTES = "(async()=>{ " + PAY + """
  const say=(t,s,o)=>{ notify(t,s,o||{}); return document.querySelector('#notes .note:last-child'); };
  const n1=say('Title '+pay('title'), 'Text '+pay('sub')+'<svg/onload="__hit(\\'svg\\')"></svg><script>__hit("script")<\\/script>');
  const n2=say('Links', '<a href="javascript:__hit(\\'jslink\\')">one</a> <a href="https://evil.example/x">two</a> <a href="/" target="_blank" style="position:fixed;inset:0" onclick="__hit(\\'click\\')">three</a> <b onmouseover="__hit(\\'over\\')">bold</b>');
  const n3=say('Colour', 'x', {color:'red" onmouseover="__hit(\\'color\\')" x="'});
  const n4=say('Patient moved','Benny Duarte · ICU 2',{icon:'move'});
  await sleep(400); const A=[...n2.querySelectorAll('a')]; [...n2.querySelectorAll('a,b')].forEach(e=>{ try{ e.dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); }catch(x){} });
  return {ran:window.__ran.slice(), bad:bad(), tags:[...new Set([...document.querySelectorAll('#notes .n-title *,#notes .n-sub *')].map(e=>e.tagName))].sort(), t1:n1.querySelector('.n-title').textContent, s1:n1.querySelector('.n-sub').textContent,
    hrefs:A.map(a=>a.getAttribute('href')), attrs:A.map(a=>[...a.attributes].map(x=>x.name).sort().join(',')), b:[n2.querySelector('b').textContent,n2.querySelector('b').attributes.length],
    ic:[...n3.querySelector('.n-ic').attributes].map(x=>x.name).sort().join(','), plain:[n4.querySelector('.n-title').textContent,n4.querySelector('.n-sub').textContent,n4.querySelector('.n-time').textContent]}; })()"""

SWEEP = "(async()=>{ " + PAY + """
  const cov={}, cover=()=>{ const h=document.documentElement.innerHTML, re=/__hit\\((?:'|&#39;|&#x27;|&apos;)([A-Za-z0-9_.\\[\\]-]+)/g; let m; while((m=re.exec(h))) cov[m[1]]=1; };
  const TEXT={name:1,last:1,owner:1,breed:1,sex:1,label:1,meta:1,durationText:1,frequencyText:1,admittedBy:1,assessment:1,by:1,text:1,result:1,due:1,detail:1,assignee:1,trigger:1,action:1,scope:1,method:1,lastBy:1,next:1,window:1};
  const deep=(o,path)=>{ if(Array.isArray(o)){ o.forEach((v,i)=>{ if(typeof v==='string') o[i]=pay(path+'[]'); else if(v&&typeof v==='object') deep(v,path+'[]'); }); return; }
    for(const k in o){ const v=o[k]; if(typeof v==='string'){ if(TEXT[k]&&!(k==='next'&&typeof o.docId==='string')) o[k]=pay((path?path+'.':'')+k); } else if(v&&typeof v==='object'&&!(v instanceof Date)) deep(v,(path?path+'.':'')+k); } };
  const ps=PATIENTS.filter(p=>p.rounds); const seen=[];
  ps.forEach(p=>{ const keep={id:p.id,status:p.status,doctor:p.doctor,species:p.species,room:p.room}; deep(p,''); Object.assign(p,keep); p.ageDisplay=pay('ageDisplay'); p.rounds.summary=p.rounds.summary||{text:pay('rounds.summary.text'),by:'x',at:new Date().toISOString()}; });
  ps[1].rounds.location=pay('rounds.location'); renderRounds(); await sleep(800); cover(); seen.push(...bad());
  for(const p of ps.slice(0,3)){ if(rdExpanded!==p.id) rdHandleAct('toggle',{dataset:{pid:p.id}}); await sleep(600); cover(); seen.push(...bad());
    for(const a of ['history-toggle','timeline-toggle','dis-toggle','attn-toggle','share','review-mark','comm-mark','task-toggle','diag-toggle','acuity']){ if(rdExpanded!==p.id) rdHandleAct('toggle',{dataset:{pid:p.id}});
      const el=document.querySelector('.rd-row[data-pid="'+p.id+'"] [data-act="'+a+'"]'); if(el){ try{ el.click(); }catch(e){} await sleep(180); cover(); seen.push(...bad()); try{ rdCloseMenus(); }catch(e){} } }
    for(const a of ['svc-menu','loc-menu','flag-menu','next-menu','cur-menu','type-menu']){ if(rdExpanded!==p.id) rdHandleAct('toggle',{dataset:{pid:p.id}});
      const el=document.querySelector('.rd-row[data-pid="'+p.id+'"] [data-act="'+a+'"]'); if(el){ el.click(); await sleep(200); const it=[...document.querySelectorAll('.rd-menu button')].find(b=>!b.classList.contains('on')); if(it){ it.click(); await sleep(350); } cover(); seen.push(...bad()); try{ rdCloseMenus(); }catch(e){} } } }
  const s=document.getElementById('rdSearch'); s.focus(); s.value='img'; s.dispatchEvent(new Event('input',{bubbles:true})); await sleep(500); cover(); seen.push(...bad()); s.value=''; s.dispatchEvent(new Event('input',{bubbles:true})); s.blur(); await sleep(250);
  try{ (document.getElementById('rdStartBtn')||{click(){ rdStartMode(); }}).click(); }catch(e){} await sleep(800); cover(); seen.push(...bad()); try{ rdModeNav(1); }catch(e){} await sleep(500); cover(); seen.push(...bad()); try{ rdExitMode(); }catch(e){} await sleep(400);
  const d=document.createElement('div'); try{ d.innerHTML=rdPrintHTML(); }catch(e){} document.body.appendChild(d); await sleep(400); cover(); seen.push(...bad()); d.remove();
  try{ rdToggleDisplay(); }catch(e){} await sleep(800); cover(); seen.push(...bad()); try{ rdToggleDisplay(); }catch(e){} await sleep(500);
  const arc=[...document.querySelectorAll('#switcherRd .seg')].find(x=>/Archive/.test(x.textContent)); if(arc){ arc.click(); await sleep(800); cover(); seen.push(...bad()); const cen=[...document.querySelectorAll('#switcherRd .seg')].find(x=>/Census/.test(x.textContent)); if(cen) cen.click(); await sleep(500); }
  return {ran:window.__ran.slice(), seen:[...new Set(seen)], shown:Object.keys(cov).sort()}; })()"""

REST = """(async(ms)=>{ const rec=[]; const o=new MutationObserver(r=>r.forEach(x=>rec.push(x))); o.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
  await new Promise(r=>setTimeout(r,ms)); o.disconnect(); return rec.length; })"""


@section(id='t381', title='n381 · Rounds: a stored value never runs as script (the resuscitation message did); Rounds does nothing at rest; its libraries come from this site',
         apps=['rounds'], topics=['rounds', 'security', 'performance'], engines=('chromium', 'webkit'))
async def s_t381(br):
    idx = open(os.path.join(BUILD, 'rounds', 'index.html'), encoding='utf-8').read()
    app = open(os.path.join(BUILD, 'rounds', 'app.js'), encoding='utf-8').read()
    srcs = re.findall(r'<script[^>]*\ssrc="([^"]+)"', idx)
    ok('Libraries · Rounds loads Firebase (app, Firestore, Auth) and the QR library from this site (assets/vendor/), in order, and takes no script from another site',
       [s for s in srcs if '/vendor/' in s] == ['/assets/vendor/' + f for f in VF] and not [s for s in srcs if re.match(r'https?://', s)] and 'gstatic.com/firebasejs' not in idx and 'jsdelivr' not in idx,
       [s for s in srcs if '/vendor/' in s or re.match(r'https?://', s)])
    v = re.search(r'/rounds/app\.js\?v=([0-9a-f]{10})', idx)
    ok('…and the page asks for the changed app.js under a new address, so no browser keeps the old one', v and v.group(1) == hashlib.sha256(app.encode('utf-8')).hexdigest()[:10], v and v.group(1))

    c, p, e = await ctx(br)
    r = await p.evaluate(RESUS)
    ok('The one place that ran · a patient whose name is markup: choosing CPR or DNR from the patient’s Resuscitation menu runs nothing',
       r['ran'] == [] and r['bad'] == [] and len(r['menu']) == 2 and r['sub'] is not None, r)
    ok('…and “Resuscitation updated” shows the name as the text it is', r['sub'] and '<img/src="x"/onerror=' in r['sub'] and r['kids'] == 0, r)
    n = await p.evaluate(NOTES)
    ok('Messages · markup in a title or text never runs or loads (image, SVG, script, javascript: link, a handler on an allowed tag, a colour that breaks out of its attribute)',
       n['ran'] == [] and n['bad'] == [] and not (set(n['tags']) - {'A', 'B', 'STRONG', 'I', 'EM', 'SPAN', 'SMALL', 'U', 'BR'}) and n['ic'] == 'class,style', n)
    ok('…what isn’t allowed is shown as text; a link stays only when it points to this site, bare; bold stays bold',
       '<img src="x" onerror=' in n['t1'] and '<svg' in n['s1'] and '<script>' in n['s1'] and n['hrefs'] == [None, None, '/'] and n['attrs'][2] == 'href,rel,target' and n['b'] == ['bold', 0], n)
    ok('…an ordinary message reads as it did (“Patient moved”, “Benny Duarte · ICU 2”, “now”)', n['plain'] == ['Patient moved', 'Benny Duarte · ICU 2', 'now'], n['plain'])
    ok('…no page errors (messages)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    s = await p.evaluate(SWEEP)
    ok('Every stored text field as markup · nothing runs anywhere: the census, three open rows with their toggles, actions and menus, search, Rounds mode, print, the display, the archive',
       s['ran'] == [] and s['seen'] == [], [s['ran'], s['seen'][:5]])
    ok('…and at least 25 of those fields were on screen as the text they are (name, owner, assessment, problems, events, diagnostics, treatments, tasks, plans, flags, …)',
       len(s['shown']) >= 25, [len(s['shown']), s['shown']])
    ok('…no page errors (sweep)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    await p.wait_for_timeout(7000)
    q = await p.evaluate(REST, 3000)
    await p.evaluate("rdHandleAct('toggle',{dataset:{pid:PATIENTS.filter(p=>p.rounds)[0].id}})"); await p.wait_for_timeout(4000)
    q2 = await p.evaluate(REST, 3000)
    ok('At rest · Rounds leaves the page alone, census and with a patient open (no sweep on every frame, as Flow had: that would be hundreds of changes)', q <= 120 and q2 <= 120, [q, q2])
    await c.close()

    c, p, e = await ctx(br, fake=False)
    f = await p.evaluate("""(()=>{ const pw=document.querySelector('input[type="password"]'); return {sdk:window.firebase&&firebase.SDK_VERSION, apps:window.firebase?firebase.apps.length:null, qr:typeof window.qrcode, signin:!!pw&&pw.getClientRects().length>0,
      outside:performance.getEntriesByType('resource').map(x=>x.name).filter(n=>/gstatic\\.com\\/firebasejs|jsdelivr/.test(n))}; })()""")
    ok('The real Firebase 10.12.5 starts from the hosted files on Rounds’ page (no fake): the app initialised, the QR library present, the sign-in screen shown, nothing asked of gstatic or jsDelivr, no page error',
       f['sdk'] == '10.12.5' and f['apps'] == 1 and f['qr'] == 'function' and f['signin'] and f['outside'] == [] and not e, [f, e[:3]])
    await c.close()
