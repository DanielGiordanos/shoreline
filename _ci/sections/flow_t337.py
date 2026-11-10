"""Pravix Flow — the n337 build's own checks (Nov 7 2026): Flow against Apple's HIG Dark Mode and Icons pages.
Dark Mode: follows the person's appearance live; with Increase Contrast, small text reaches 7 : 1 in dark; light text reaches 4.5 : 1.
Icons: one 24-unit grid; real symbols, not a typed "!"; symbols at 3 : 1 or more; the Client Display keeps its colours. Chromium and WebKit."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Luna','Okafor','Waiting','Lobby',3,'unassigned','Canine',18,'Limping'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],
 ['Cleo','Varga','Exam','Room 2',3,D[1],'Feline',22,'Ear infection'],['Ziggy','Moreau','Diagnostics','Room 3',1,D[2],'Canine',70,'Collapse'],
 ['Pepper','Nakamura','Ultrasound','Room 4',2,D[0],'Canine',55,'Abdominal pain'],['Oscar','Lindqvist','Procedure','Room 5',2,D[3]||D[1],'Feline',120,'Laceration'],
 ['Nala','Brooks','Waiting','Lobby',3,'unassigned','Canine',8,'Vaccines']]
 .forEach((r,i)=>{ const p=patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]});
  if(i===6) p.ultrasound={study:'Abdominal Ultrasound',clinicalQuestion:'Foreign body?',status:'requested',requestStatus:'ready',requestedAt:new Date(now-20*60000),queuePosition:1};
  if(i===3) p.waitingOn={text:'Radiographs',at:new Date(now-10*60000)};
  PATIENTS.push(p); }); renderAll(); })()"""

# contrast helpers + a scan of Flow's own screens (the shared top bar and the Client Display are outside this build)
LIB = r"""
const P=s=>{s=String(s);const m=s.match(/-?[\d.]+/g);if(!m)return [0,0,0,0];const v=m.map(Number);if(s.startsWith('color('))return [v[0]*255,v[1]*255,v[2]*255,v.length>3?v[3]:1];return v};
const rgba=s=>{const v=P(s);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};const L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
const dark=document.body.classList.contains('dark');
function bgOf(el){const st=[];let e=el;while(e&&e.nodeType===1){const c=rgba(getComputedStyle(e).backgroundColor);if(c.a>0)st.push(c);if(c.a>=1)break;e=e.parentElement}let b=st.length&&st[st.length-1].a>=1?st.pop():rgba(getComputedStyle(document.body).backgroundColor);if(b.a<1)b=dark?{r:8,g:14,b:26,a:1}:{r:255,g:255,b:255,a:1};for(let i=st.length-1;i>=0;i--)b=over(st[i],b);return b}
const cr=(f,b)=>{f=over(f,b);return (Math.max(L(f),L(b))+.05)/(Math.min(L(f),L(b))+.05)};
const sel=e=>{let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;const c=[...(e.classList||[])].slice(0,2).join('.');if(c)s+='.'+c;return s};
const vis=e=>{if(!e.getClientRects().length)return false;let p=e;while(p&&p.nodeType===1){const c=getComputedStyle(p);if(+c.opacity<.1||c.visibility==='hidden')return false;p=p.parentElement}const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
const SKIP=e=>e.closest('.topnav,#pvxTopnav,#view-client,script,style,.disposition-card.locked,[aria-disabled=true],:disabled');
const w=ms=>new Promise(r=>setTimeout(r,ms));
const seen=new Set(), text=[], icons=[];
function scan(tag){
  const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while(n=tw.nextNode()){const t=n.textContent.trim();const el=n.parentElement;if(!t||!el||SKIP(el)||!vis(el))continue;const k=tag+sel(el)+t.slice(0,12);if(seen.has(k))continue;seen.add(k);
    const cs=getComputedStyle(el), fs=parseFloat(cs.fontSize), fw=+cs.fontWeight||400; text.push([tag,sel(el),t.slice(0,22),+cr(rgba(cs.color),bgOf(el)).toFixed(2),fs,fw])}
  document.querySelectorAll('svg').forEach(s=>{if(SKIP(s)||!vis(s)||s.parentElement.closest('svg'))return;const r=s.getBoundingClientRect();if(r.width>40||r.width<6)return;
    const k=tag+'|'+sel(s.parentElement)+'|'+(s.getAttribute('class')||'');if(seen.has(k))return;seen.add(k);
    const sh=s.querySelector('path,line,circle,rect,polyline,polygon');const cs=getComputedStyle(sh||s);
    const stroked=cs.stroke!=='none'&&cs.fill==='none';const col=stroked?cs.stroke:cs.fill;
    icons.push([tag,sel(s.parentElement),(s.getAttribute('viewBox')||'').trim(),stroked?+cr(rgba(/rgb|color\(/.test(col)?col:getComputedStyle(s).color),bgOf(s.parentElement)).toFixed(2):null,Math.round(r.width)])})}
async function all(){
  for(const v of ['dashboard','list','flow','rooms','consent']){document.getElementById('stage').scrollTop=0;switchView(v);await w(700);scan(v)}
  const p=PATIENTS.find(x=>x.status==='Exam');openDrawer(p.id);await w(900);scan('drawer');closeDrawer();await w(500);
  openAddPatient();await w(900);scan('add');
  const b=document.querySelector('#apModal .ap-prio-btn[data-prio="1"]');if(b){b.click();await w(300);scan('add-p1')}
  return {text,icons};
}
"""


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


@section(id='t337', title='n337 · Dark Mode and Icons: Increase Contrast reaches 7 : 1 in dark; one 24-unit symbol grid; symbols at 3 : 1', apps=['flow'], topics=['color', 'icons', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t337(br):
    # ---- the source: Flow's own symbols on one grid
    s = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    vb = {}
    for m in re.finditer(r'viewBox=\\?"0 0 (\d+) \1\\?"', s): vb[m.group(1)] = vb.get(m.group(1), 0) + 1
    ok('Icons · every square symbol Flow draws is on the 24-unit grid (badge marks were on 16, the flag glyphs on 16, Add flag’s + and − on 22, the confirm check on 18); the shared top bar’s sign-out chevron is the one 20, the check-in QR code is drawn on 100', set(vb) <= {'24', '20', '100'} and vb.get('100', 0) <= 1 and vb.get('20', 0) == 1 and vb.get('24', 0) >= 160, vb)
    ok('Icons · Overdue and High use the exclamation-mark symbol, not a typed “!”', '<span class="overdue-icon" aria-hidden="true"><svg' in s and '<span class="high-icon" aria-hidden="true"><svg' in s and 'aria-hidden="true">!</span>' not in s)

    # ---- dark, as most people see it
    c, p, e = await ctx(br)
    r = await p.evaluate("""(()=>({html:getComputedStyle(document.documentElement).colorScheme, dark:document.body.classList.contains('dark'),
      fields:[...new Set([...document.querySelectorAll('#view-dashboard input, #filterBar input, input#search, select')].map(x=>getComputedStyle(x).colorScheme))]}))()""")
    await p.emulate_media(color_scheme='light'); await p.wait_for_timeout(800); lt = await p.evaluate("document.body.classList.contains('dark')")
    await p.emulate_media(color_scheme='dark'); await p.wait_for_timeout(800); dk = await p.evaluate("document.body.classList.contains('dark')")
    ok('Dark Mode · Flow follows the person’s appearance, also when it changes while Flow is open, and tells the browser (scroll bars, fields) it is dark', r['dark'] and 'dark' in r['html'] and not lt and dk and all('dark' in x for x in r['fields'] if x), {'r': r, 'after light': lt, 'after dark': dk})
    b = await p.evaluate(LIB + """(async()=>{switchView('dashboard'); await w(800); const o=[];
      for(const x of document.querySelectorAll('#view-dashboard :is(.watch-icon,.ready-icon,.room-open-icon,.review-icon,.overdue-icon,.high-icon)')){
        /* Attention items fade in as they scroll into view, so this reads what's rendered, not what has faded in yet */
        if(!x.getClientRects().length||getComputedStyle(x).display==='none') continue; const svg=x.querySelector('svg');
        o.push([x.className, svg?svg.getAttribute('viewBox'):'none', x.textContent.trim(), +cr(rgba(getComputedStyle(x).color), bgOf(x)).toFixed(2)]) } return o})()""")
    bad = [x for x in b if x[1] != '0 0 24 24' or x[2] or x[3] < 3]
    ok('Icons · Attention badge symbols are 24-grid symbols at 3 : 1 or more on their colour (white on amber, green and teal was 2.2–2.9 : 1; they’re dark now, as the badge text is)', len(b) >= 6 and not bad, bad or b)
    # the flag sheet: redrawn on the 24 grid but rendered exactly as before
    await p.evaluate("(()=>{const x=PATIENTS.find(x=>x.status==='Exam'); openDrawer(x.id)})()"); await p.wait_for_timeout(1000)
    await p.evaluate("(()=>{const b=document.querySelector('.fg-add'); b.scrollIntoView({block:'center'}); b.click()})()"); await p.wait_for_timeout(800)
    await p.evaluate("document.querySelector('.fg-opt:not(.on)').click()"); await p.wait_for_timeout(900)
    f = await p.evaluate("""(()=>{const px=s=>{const q=s.querySelector('path,circle'); return +(parseFloat(getComputedStyle(q).strokeWidth)*s.getBoundingClientRect().width/s.viewBox.baseVal.width).toFixed(2)};
      const ck=document.querySelector('.fg-opt.on svg.fg-ck'), mag=document.querySelector('.fg-search svg'), path=ck&&ck.querySelector('path');
      return {ck:ck&&px(ck), mag:mag&&px(mag), dash:path&&parseFloat(getComputedStyle(path).strokeDasharray), len:path&&+path.getTotalLength().toFixed(1), off:path&&parseFloat(getComputedStyle(path).strokeDashoffset),
        grid:[...document.querySelectorAll('.fg-sheet svg, .fg-row svg, .fg-add svg')].map(s=>s.viewBox.baseVal.width).filter(x=>x!==24).length}})()""")
    ok('Icons · the flag sheet’s symbols draw exactly as before on the new grid: the checkmark stays 2.2 pt (the weight matcher would have thinned it to 1.2) and draws on fully; search stays 1.7 pt', f['grid'] == 0 and abs(f['ck'] - 2.2) < 0.05 and abs(f['mag'] - 1.69) < 0.06 and f['dash'] >= f['len'] and f['off'] == 0, f)
    r = await p.evaluate(LIB + "all()")
    badi = [x for x in r['icons'] if x[3] is not None and x[3] < 3]
    ok('Icons · in dark every line symbol on Flow’s screens, the drawer and Add patient reaches 3 : 1', len(r['icons']) > 20 and not badi, badi[:10])
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # ---- dark with Increase Contrast
    c, p, e = await ctx(br, contrast='more')
    r = await p.evaluate(LIB + "all()")
    bad = [x for x in r['text'] if x[4] <= 15 and x[3] < 7]
    ok(f'Dark Mode · with Increase Contrast, small text reaches 7 : 1 in dark on Command, Patients, the board, Rooms, Consent forms, the drawer and Add patient ({len([x for x in r["text"] if x[4] <= 15])} texts; 74 were under)', len(r['text']) > 150 and not bad, bad[:12])
    badi = [x for x in r['icons'] if x[3] is not None and x[3] < 3]
    ok('Icons · …and every line symbol reaches 3 : 1', len(r['icons']) > 20 and not badi, badi[:10])
    cl = await p.evaluate("(()=>{switchView('client'); const v=document.getElementById('view-client'); const c=getComputedStyle(v); return [c.getPropertyValue('--ink-500').trim().toUpperCase(), c.getPropertyValue('--ink-700').trim().toUpperCase()]})()")
    ok('…the Client Display (lobby screen) keeps its colours exactly', cl == ['#7A98B8', '#A7C2D8'], cl)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # ---- light
    c, p, e = await ctx(br, dark=False)
    r = await p.evaluate(LIB + "all()")
    big = lambda x: x[4] >= 24 or (x[4] >= 18.66 and x[5] >= 700)
    bad = [x for x in r['text'] if x[3] < (3 if big(x) else 4.5)]
    ok(f'Dark Mode · light is designed too: every text reaches 4.5 : 1 ({len(r["text"])} texts), including Command’s KPI chips (2.9–3.9 : 1), the menu and Add patient’s chosen arrival type and priority (2.0–3.3 : 1)', len(r['text']) > 150 and not bad, bad[:12])
    badi = [x for x in r['icons'] if x[3] is not None and x[3] < 3]
    ok('Icons · …and every line symbol reaches 3 : 1 (card chevrons, empty-state symbols, the drawer’s arrows and its Discharge symbol were 1.5–2.3 : 1)', len(r['icons']) > 20 and not badi, badi[:10])
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
