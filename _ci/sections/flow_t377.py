"""Pravix Flow — the n377 build's own checks (Nov 13 2026): a stored value never runs as script.
A patient's name, age, room, triage values, a staff name or a public check-in's fields, written as markup, are shown as the text
they are: in Flow's messages (an allowlist, built as nodes), the list, the board, the drawer, the Client Display, the Undo toast
and the pickers. Outside scripts carry an integrity hash. Ordinary values look as they did."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]

SRI = {'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js': 'sha384-mLD+wdwynYnAhgHAkdPP5hroWJXJTNy5C2OhPKM55zuiV2vjzFD1LtBohaHq2Ex8',
       'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js': 'sha384-/SBCyt0JELVRyyrOp+QG5CdnpVoAry+uw9hdherLgyZxxePtHjOvQmJU5CHymUhT',
       'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js': 'sha384-NiuRnBs5Z0OgJ12kYJLSeWxANeJN369zH3+Zn0TGVPaCH/TKmbPFqfOmmLtrj+wg',
       'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js': 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k'}


async def ctx(br, w=1440, h=900):
    c = await br.new_context(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    await c.add_init_script("window.__ran=[]; window.__hit=function(f){ window.__ran.push(f); };")
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

# a value that would run if written as markup; no spaces, so a name keeps it whole
PAY = """const pay=f=>'<img/src="x"/onerror="__hit(\\''+f+'\\')">', sleep=ms=>new Promise(r=>setTimeout(r,ms)), now=Date.now(), D=DOCTORS.map(d=>d.id);
  const bad=()=>[...document.querySelectorAll('img[src="x"],[onerror],[onclick*="__hit"],[onload]')].map(e=>{ let n=e,a=[]; while(n&&a.length<3){ a.push(n.tagName+'.'+String(n.className||'').split(' ')[0]); n=n.parentElement; } return a.join('<'); });"""

NOTES = "(async()=>{ " + PAY + """
  const say=(t,s,o)=>{ notify(t,s,o||{}); return document.querySelector('#notes .note:last-child'); };
  const n1=say('Title '+pay('title'), 'Text '+pay('sub')+'<svg/onload="__hit(\\'svg\\')"></svg><script>__hit("script")<\\/script><iframe src="javascript:__hit(\\'frame\\')"></iframe>');
  const n2=say('Links', '<a href="javascript:__hit(\\'jslink\\')" id="l1">one</a> <a href="https://evil.example/x" id="l2">two</a> <a href="/treatment/" target="_blank" style="position:fixed;inset:0" onclick="__hit(\\'click\\')" id="l3">three</a> <b onmouseover="__hit(\\'over\\')" style="font-size:90px">bold</b>');
  const n3=say('Colour', 'x', {color:'red" onmouseover="__hit(\\'color\\')" x="'});
  await sleep(500);
  const A=[...n2.querySelectorAll('a')];
  [...n2.querySelectorAll('a,b')].forEach(e=>{ try{ e.dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); }catch(x){} });
  const b=n2.querySelector('b');
  return {ran:window.__ran.slice(), bad:bad(), tags:[...new Set([...document.querySelectorAll('#notes .n-title *,#notes .n-sub *')].map(e=>e.tagName))],
    text1:n1.querySelector('.n-title').textContent, text1s:n1.querySelector('.n-sub').textContent,
    hrefs:A.map(a=>a.getAttribute('href')), attrs:A.map(a=>[...a.attributes].map(x=>x.name).sort().join(',')), rel:A[2]&&A[2].getAttribute('rel'),
    b:b?[b.textContent,[...b.attributes].length]:null, ic:[...n3.querySelector('.n-ic').attributes].map(x=>x.name).sort().join(','), icBg:n3.querySelector('.n-ic').style.background}; })()"""

REAL = "(async()=>{ " + PAY + """
  const p=patient({name:'Milo',last:'Chen',owner:'Synthetic Chen',status:'Exam',room:'Room 1',prio:2,doctor:D[0],species:'Feline',arrival:new Date(now-40*60000),reason:'Not eating',ageDisplay:'<1 Year',
     timeline:[{label:'Checked in',at:new Date(now-40*60000)}]});
  p.triage={status:'complete',vitals:{temp:'101.2',hr:'>200',rr:'32'},assess:{mm:'Pink & moist'},chief:[],history:'',by:'',at:''};
  PATIENTS.push(p); renderAll(); await sleep(500);
  notify('Couldn’t open a treatment sheet', bcEsc(p.name)+' · <a href="/treatment/" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;text-decoration:none">Open Treatment Sheets ›</a>', {icon:'info'});
  await sleep(300); const a=document.querySelector('#notes .note:last-child a'), cs=a?getComputedStyle(a):null;
  switchView('list'); await sleep(500); const row=[...document.querySelectorAll('.pt-cell')].map(x=>x.textContent).find(t=>/Milo/.test(t))||'';
  openDrawer(p.id); await sleep(800); const tri=(document.querySelector('.tri-vgrid')||document.querySelector('#drawer')).textContent;
  moveRoom(p,'Room 5'); await sleep(300); const moved=[...document.querySelectorAll('#notes .note')].map(n=>n.textContent).find(t=>/Patient moved/.test(t))||'';
  return {link:a?[a.getAttribute('href'),a.getAttribute('target'),a.getAttribute('rel'),a.hasAttribute('style'),cs.fontWeight,cs.textDecorationLine]:null, row:row, tri:tri, moved:moved, ran:window.__ran.slice()}; })()"""

STORED = "(async()=>{ " + PAY + """
  const p=patient({name:pay('name'),last:pay('last'),owner:pay('owner'),status:'Exam',room:'Room 1',prio:2,doctor:D[0],species:'Canine',breed:pay('breed'),arrival:new Date(now-40*60000),reason:pay('reason'),
     ageDisplay:pay('age'),age:pay('age2'),timeline:[{label:pay('tl'),at:new Date(now-30*60000),meta:pay('tlmeta')}]});
  p.triage={status:'complete',vitals:{temp:pay('temp'),hr:pay('hr'),rr:pay('rr'),weight:pay('wt')},assess:{mm:pay('mm'),crt:pay('crt')},chief:[pay('chief')],history:pay('history'),by:pay('by'),at:''};
  p.intake={status:'complete',complaint:pay('complaint'),duration:'',history:'',medications:pay('meds'),allergies:'',conditions:'',q:{},qnotes:{},notes:pay('inotes')};
  const q=patient({name:'Rocky',last:'Hale',owner:'Synthetic Hale',status:'Exam',room:pay('room'),prio:3,doctor:D[1],species:'Canine',arrival:new Date(now-20*60000),reason:'Cough',timeline:[]}); q.hid=pay('hid');
  PATIENTS.push(p,q); renderAll(); await sleep(600);
  const seen={};
  for(const v of ['list','rooms','client','dashboard']){ switchView(v); await sleep(450); seen[v]=bad(); }
  const listTxt=(()=>{ switchView('list'); return document.body.textContent.indexOf(pay('age'))>-1; })(); await sleep(300); switchView('dashboard');
  openDrawer(p.id); await sleep(900); document.querySelectorAll('#drawer .triage-card').forEach(c=>{ try{ c.click(); }catch(e){} }); await sleep(500);
  seen.drawer=bad(); const drawerTxt=document.getElementById('drawer').textContent, shows=['temp','hr','mm','meds'].filter(k=>drawerTxt.indexOf(pay(k))>-1);
  // every message that names a stored value
  const cur=()=>PATIENTS.find(x=>x.id===p.id)||p, curq=()=>PATIENTS.find(x=>x.id===q.id)||q;
  setResusPref(cur(),'DNR'); await sleep(250); const resus=[...document.querySelectorAll('#notes .note')].map(n=>n.textContent).find(t=>/Resuscitation updated/.test(t))||'';
  assignDoctor(cur(),D[2]||D[0]); await sleep(250); const l=(typeof LIAISONS!=='undefined')&&LIAISONS[0]; if(l){ assignLiaison(cur(),l.id); await sleep(250); assignLiaison(cur(),null); await sleep(250); }
  setPriority(cur(),1); await sleep(250); requestRecords(cur()); await sleep(250);
  moveRoom(curq(),'Room 6'); await sleep(250); moveStatus(curq(),'Diagnostics'); await sleep(250); moveStatus(cur(),'Procedure'); await sleep(250);
  try{ showUndo(cur(),'discharge',captureDispSnap(cur())); }catch(e){} await sleep(300);
  const undo=(document.querySelector('#undoToast .ut-msg')||{}).textContent||'';
  seen.after=bad();
  return {ran:window.__ran.slice(), seen:seen, listTxt:listTxt, shows:shows, resus:resus, undo:undo, name:pay('name')}; })()"""

CHECKIN = "(async()=>{ " + PAY + """
  const rec={id:'INT-n377-check-0001',submittedAt:new Date(now-6*60000).toISOString(),status:'awaiting_csr_review',priority:null,doctor:null,location:'Lobby',
    patient:{name:pay('ci-name'),species:'dog',speciesDisplay:'Dog',breed:'Mixed Breed',breedId:'',age:pay('ci-age'),birthday:'',birthdayEstimated:false,approximateAge:null,sex:'male',sexDisplay:'Male',weight:'20'},
    client:{first:'Synthetic',last:pay('ci-owner'),phone:'2035550123',email:''},reason:'Vomiting '+pay('ci-reason'),additionalProblems:[pay('ci-more')]};
  FlowIntakeStore._saveAll([rec]); if(typeof renderClientQueue==='function') renderClientQueue(); renderAll(); await sleep(600);
  const q1=bad(); openIntakeReview(rec.id); await sleep(900); const form={name:document.getElementById('apName').value, age:document.getElementById('apAge').value, sp:document.getElementById('apSpecies').value, sex:document.getElementById('apSex').value};
  const q2=bad(); const before=PATIENTS.length, ids=PATIENTS.map(x=>x.id); apPrio=2; completeIntakeReview(); await sleep(1200);
  const made=PATIENTS.find(x=>ids.indexOf(x.id)<0);
  const seen={queue:q1, review:q2};
  for(const v of ['list','rooms','client','dashboard']){ switchView(v); await sleep(450); seen[v]=bad(); }
  if(made){ openDrawer(made.id); await sleep(800); seen.drawer=bad(); setResusPref(PATIENTS.find(x=>x.id===made.id),'CPR'); await sleep(300); seen.note=bad(); }
  return {ran:window.__ran.slice(), seen:seen, form:form, added:PATIENTS.length-before, made:made?{name:made.name,age:made.ageDisplay}:null, want:{name:pay('ci-name'),age:pay('ci-age')},
          toast:(document.getElementById('toastMsg')||{}).textContent||''}; })()"""


@section(id='t377', title='n377 · Security: a stored value never runs as script — messages, list, board, drawer, Client Display, Undo, pickers, an accepted check-in; outside scripts carry an integrity hash',
         apps=['flow'], topics=['security', 'notifications'], engines=('chromium', 'webkit'))
async def s_t377(br):
    html = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    outside = re.findall(r'<script[^>]*\ssrc="https?://[^"]+"[^>]*>', html)
    ok('Outside scripts · any script the page takes from another site carries an integrity hash and crossorigin="anonymous": a changed file doesn’t run (since n379 Flow hosts them all itself, so there are none)',
       all('integrity="sha384-' in t and 'crossorigin="anonymous"' in t for t in outside) and all(re.search(r'src="([^"]+)"', t).group(1) in SRI for t in outside), outside)
    c, p, e = await ctx(br)
    n = await p.evaluate(NOTES)
    ok('Messages · markup in a title or text never runs or loads: an image, an SVG, a script, a frame, a javascript: link, a handler on an allowed tag, a colour that breaks out of its attribute',
       n['ran'] == [] and n['bad'] == [] and not (set(n['tags']) - {'A', 'B', 'STRONG', 'I', 'EM', 'SPAN', 'SMALL', 'U', 'BR'}) and n['ic'] == 'class,style' and 'red' not in n['icBg'], n)
    ok('…what isn’t allowed is shown as the text it is (“Title <img src="x" …>”), not dropped',
       '<img src="x" onerror=' in n['text1'] and '<img src="x" onerror=' in n['text1s'] and '<svg' in n['text1s'] and '<script>' in n['text1s'] and '<iframe' in n['text1s'], [n['text1'], n['text1s']])
    ok('…a link stays only when it points to this site (javascript: and other sites lose their href), without its style or handlers; bold stays bold, bare',
       n['hrefs'] == [None, None, '/treatment/'] and n['attrs'][2] == 'href,rel,target' and n['rel'] == 'noopener' and n['b'] == ['bold', 0], [n['hrefs'], n['attrs'], n['rel'], n['b']])
    r = await p.evaluate(REAL)
    ok('Ordinary values look as they did · the Treatment Sheets link is a link (bold, not underlined, new tab), styled by the sheet not inline',
       r['link'] and r['link'][:4] == ['/treatment/', '_blank', 'noopener', False] and r['link'][4] in ('700', 'bold') and r['link'][5] == 'none', r['link'])
    ok('…an age of “<1 Year”, a heart rate of “>200” and “Pink & moist” read exactly as typed (list row, triage card); “Patient moved” names the rooms',
       '<1 Year' in r['row'] and '>200' in r['tri'] and 'Milo' in r['moved'] and 'Room 1' in r['moved'] and 'Room 5' in r['moved'] and r['ran'] == [], [r['row'][:120], r['tri'][:160], r['moved']])
    ok('…no page errors (messages)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    s = await p.evaluate(STORED)
    ok('Stored values · a patient whose name, owner, breed, reason, age, triage values, intake notes, room and hospital ID are markup: nothing runs in the list, Rooms, the Client Display, the board or the drawer',
       s['ran'] == [] and all(s['seen'][k] == [] for k in ('list', 'rooms', 'client', 'dashboard', 'drawer')), [s['ran'], s['seen']])
    ok('…nor in any message that names them (resuscitation, doctor, liaison, priority, records, moved, status), or the Undo toast',
       s['ran'] == [] and s['seen']['after'] == [], [s['ran'], s['seen']])
    ok('…each is shown as the text it is: the age in the list, the vitals and medications in the drawer, the name in “Resuscitation updated” and in the Undo toast',
       s['listTxt'] and len(s['shows']) >= 3 and s['name'] in s['resus'] and s['name'] in s['undo'], [s['listTxt'], s['shows'], s['resus'][:120], s['undo'][:120]])
    ok('…no page errors (stored values)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    k = await p.evaluate(CHECKIN)
    ok('A public check-in · a pet name, age, owner and reason written as markup reach the review sheet as text in its fields, and nothing runs in the queue or the sheet',
       k['ran'] == [] and k['seen']['queue'] == [] and k['seen']['review'] == [] and k['form']['name'] == k['want']['name'] and k['form']['age'] == k['want']['age'], [k['ran'], k['seen'], k['form']])
    ok('…accepted, it becomes a patient with that name and age, and still nothing runs: list, Rooms, Client Display, board, drawer, “Resuscitation updated”',
       k['added'] == 1 and k['made'] and k['made']['name'].startswith('<img/src="x"/onerror=') and k['made']['age'] == k['want']['age'] and k['ran'] == [] and all(v == [] for v in k['seen'].values()) and 'note' in k['seen'], [k['added'], k['made'], k['ran'], k['seen'], k['toast']])
    ok('…no page errors (check-in)', not newerr(e), newerr(e))
    await c.close()
