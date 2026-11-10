"""Pravix Flow — the n339 build's own checks (Nov 7 2026): HIG Motion and SF Symbols, Flow's second pass.
Reduce Motion leaves only fades; the drawer and sheets are brief; nothing decorative loops at rest; one Close symbol; no typed › or ×.
Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lindqvist','Procedure','Room 5',2,D[1],'Feline',120,'Laceration']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}))); renderAll(); })()"""

# every animation or transition that starts after each action: [target, properties, duration ms, iterations]
REC = r"""(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));
const sel=e=>{if(!e||!e.tagName)return String(e);let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;const c=[...(e.classList||[])].slice(0,2).join('.');if(c)s+='.'+c;return s};
const snap=()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations!==Infinity).map(a=>{const t=a.effect.getTiming();const props=[...new Set(a.effect.getKeyframes().flatMap(k=>Object.keys(k).filter(x=>!['offset','easing','composite','computedOffset'].includes(x))))].join(',');return [sel(a.effect.target)+(a.effect.pseudoElement||''),props,t.duration,t.delay]});
const pt=PATIENTS.find(x=>x.status==='Exam'); const o={};
const esc=()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
const T=[['the patient drawer',()=>openDrawer(pt.id),()=>closeDrawer()],['Add patient',()=>openAddPatient(),esc],['Care team',()=>openCareTeam(pt.id),esc],['Ultrasound request',()=>openUltrasoundRequest(pt.id),esc],
 ['Alert',()=>openAlertModal(),esc],['Assign',()=>openAssignModal(pt.id),esc],['the add menu',()=>document.getElementById('fabAdd').click(),esc],
 ['search results',()=>{const s=document.getElementById('globalSearch');s.focus();s.value='be';s.dispatchEvent(new Event('input',{bubbles:true}))},()=>{const s=document.getElementById('globalSearch');s.value='';s.dispatchEvent(new Event('input',{bubbles:true}));s.blur()}],
 ['a message',()=>toast('Saved'),null]];
for(const [n,f,c] of T){await w(450); f(); await w(30); const a=snap(); await w(900); if(c) c(); await w(30); const b=snap(); await w(800);
  document.querySelectorAll('.addpt-modal.open,.intake-modal.open,.us-modal.open').forEach(m=>m.classList.remove('open')); o[n]=a.concat(b);}
return o})()"""
MOVES = lambda rec: {k: [x for x in v if any(p in x[1] for p in ('transform', 'translate', 'scale', 'rotate', 'top', 'left')) and x[2] > 0] for k, v in rec.items()}
REST = r"""(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); const o={};
for(const v of ['dashboard','list','flow','rooms','consent']){switchView(v); await w(3200);
  o[v]=document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations===Infinity).map(a=>{const t=a.effect.target;return (t.id||t.className||t.tagName).toString().slice(0,30)+(a.effect.pseudoElement||'')});}
const s=document.getElementById('globalSearch'); s.focus(); await w(3200);
o['search typing']=document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.getTiming().iterations===Infinity&&!a.effect.target.closest?.('#critIsland')).map(a=>{const t=a.effect.target;return (t.id||t.className||t.tagName).toString().slice(0,30)+(a.effect.pseudoElement||'')}); s.blur(); return o})()"""
SYM = r"""(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)); const pt=PATIENTS.find(x=>x.status==='Exam'); const sig=s=>s?[...s.querySelectorAll('line,path,polyline')].map(x=>x.outerHTML.replace(/ (stroke|class|style)[-\w]*="[^"]*"/g,'')).join(''):'(no symbol: '+'“'+'”)';
const o={close:{},typed:[]};
for(const [n,f,id,b] of [['drawer',()=>openDrawer(pt.id),null,'#drawerClose'],['Add patient',()=>openAddPatient(),'apModal','#apClose'],['Care team',()=>openCareTeam(pt.id),'ctModal','#ctClose'],['Ultrasound request',()=>openUltrasoundRequest(pt.id),'usModal','#usX'],['Alert',()=>openAlertModal(),'alertModal','#alertClose']]){
  f(); await w(700); const x=document.querySelector(b); if(x){ o.close[n]=sig(x.querySelector('svg')); if(/[×✕✖]/.test(x.textContent)) o.typed.push(n+' Close “'+x.textContent.trim()+'”'); }
  if(id){ document.getElementById(id).classList.remove('open'); } else closeDrawer(); await w(400); }
switchView('dashboard'); await w(700);
document.querySelectorAll('#view-dashboard .wd-action, #view-dashboard button, #view-dashboard a').forEach(e=>{ if(/^[›‹»→×]$/.test(e.textContent.trim())) o.typed.push('Command '+e.className+' “'+e.textContent.trim()+'”') });
return o})()"""


async def ctx(br, w=1440, h=900, rm=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if rm: o['reduced_motion'] = 'reduce'
    if w < 700: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEEDJS); await p.wait_for_timeout(900); await p.evaluate("switchView('list')"); await p.wait_for_timeout(700)
    return c, p, e


@section(id='t339', title='n339 · Motion and SF Symbols: Reduce Motion leaves only fades, brief sheets, no decorative loops, one Close symbol', apps=['flow'], topics=['motion', 'icons'], engines=('chromium', 'webkit'))
async def s_t339(br):
    for w, h, label in ((1440, 900, 'Mac'), (390, 844, 'iPhone')):
        c, p, e = await ctx(br, w, h, rm=True)
        m = {k: v for k, v in MOVES(await p.evaluate(REC)).items() if v}
        ok(f'{label}, Reduce Motion · the drawer, every sheet, the add menu, search results and messages only fade: nothing slides, zooms or spins (the drawer slid for 0.5 s, sheets moved for 0.4 s)', not m, m)
        ok('…no page errors', not newerr(e), newerr(e))
        await c.close()
    c, p, e = await ctx(br)
    r = await p.evaluate(REC)
    d = max([x[2] for x in r['the patient drawer'] if 'transform' in x[1]] or [0])
    sh = {k: max([x[2] for x in r[k] if 'transform' in x[1]] or [0]) for k in ('Add patient', 'Care team', 'Ultrasound request', 'Alert', 'Assign')}
    long = {k: [x for x in v if x[2] + (x[3] or 0) > 500] for k, v in r.items()}; long = {k: v for k, v in long.items() if v}
    ok('Mac · opening a patient is brief: the drawer slides in 0.3 s (it took 0.5 s, on the action people repeat all day)', 0 < d <= 300, d)
    ok('Mac · sheets fade in and grow from 98 % in 0.2 s (they took 0.42 s with a spring)', all(0 < v <= 200 for v in sh.values()), sh)
    ok('Mac · nothing Flow does on these actions lasts over 0.5 s', not long, long)
    rest = await p.evaluate(REST)
    bad = {k: [x for x in v if 'ci-ic' not in x and 'premium-search-caret' not in x] for k, v in rest.items()}; bad = {k: v for k, v in bad.items() if v}   # the text cursor blinks, as the system's does
    ok('Motion · at rest only the critical banner’s symbol pulses (the one live signal); its red window edge and the search field’s colour glow hold still (they breathed every 2.6 s and 2.8 s)', not bad and any('ci-ic' in x for x in rest['dashboard']), rest)
    s = await p.evaluate(SYM)
    shapes = set(s['close'].values())
    ok('SF Symbols · every Close in Flow’s drawer and sheets is the same xmark symbol (Ultrasound request’s was a typed “×”), and no typed › or × stands in for a symbol', len(s['close']) == 5 and len(shapes) == 1 and '(no symbol' not in next(iter(shapes)) and not s['typed'], s)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
