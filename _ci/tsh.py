"""The Treatment harness the per-build checks use (was n255/audit/h.py): fake Firebase, the synthetic training patients,
the stand-in drug library, the pinned clock, and ts() to open a sheet in any size, look and section."""
import os, json, threading, functools, http.server, socketserver
SUITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures')
FAKE = open(os.path.join(SUITE, 'fakefs.js')).read()
SEED = json.loads(open(os.path.join(SUITE, 'seed.json')).read())
SEED.update(json.load(open(os.path.join(SUITE, 'seed_ts_n230.json'))))
# a stand-in drug library (one name, no doses), so pages don't show the persistent "didn't load" message, which covered
# the iPad's lowest buttons (the "flaky" tech-name tap area)
if os.path.exists(os.path.join(SUITE, 'yk_standin.json')): SEED.update(json.load(open(os.path.join(SUITE, 'yk_standin.json'))))
SEED = json.dumps(SEED)
NOW = '2026-10-16T22:20:00Z'
INIT = """(function(){ var T0=Date.parse('%s'), p0=performance.now(); window.__anNow=function(){ return T0+(performance.now()-p0); }; })();
window.__fsSeed=@@SEED@@; window.__fsUser=@@USER@@;""" % NOW
# pinned clock, as in the suite: Friday Oct 23 2026, 11 AM in Los Angeles (checks that depend on what's due this hour
# gave different answers at night)
import datetime as _dtp
PIN = '2026-10-23T18:00:00Z'; PIN_MS = int(_dtp.datetime.fromisoformat(PIN.replace('Z', '+00:00')).timestamp() * 1000)
PINJS = "(()=>{if(window.__pvxPin)return;window.__pvxPin=1;const D=Date,T=%d,o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()" % PIN_MS
from playwright.async_api import Browser as _Browser
if not getattr(_Browser, '_pvx_pinned', False):
    _nc0 = _Browser.new_context
    async def _nc_pinned(self, *a, **k):
        c = await _nc0(self, *a, **k); await c.add_init_script(PINJS); return c
    _Browser.new_context = _nc_pinned; _Browser._pvx_pinned = True
USER = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
STUB = {'firebase-app.js': 'export function initializeApp(){return {}}',
        'firebase-firestore.js': 'export function getFirestore(){return {}} export function doc(){return {}} export function collection(){return {}} export async function getDoc(){return {exists:()=>false,data:()=>({})}} export async function setDoc(){} export function onSnapshot(r,cb){ return ()=>{} }',
        'firebase-analytics.js': 'export function getAnalytics(){return {}}'}

def serve(site):
    H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=site)
    class Q(H.func):
        def log_message(self, *a): pass
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=site))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]

async def ts(br, port, vp=(1440, 900), dark=True, touch=False, media=None, big=False, view='sheet', sheet='sh_train1', user=USER, wait=2600, init=None, seed=None):
    ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US',
                               color_scheme='dark' if dark else 'light', **(dict(has_touch=True, is_mobile=True) if touch else {}))
    await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{port}/'}])
    await ctx.add_init_script(INIT.replace('@@USER@@', user).replace('@@SEED@@', seed or SEED)); await ctx.add_init_script(FAKE)
    if init: await ctx.add_init_script(init)   # n262: a section's own setup before the page loads (stored state, hooks)
    if big: await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='200%'})")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB.get(u.rsplit('/', 1)[-1], ''))
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{port}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    if media:
        await pg.emulate_media(**media)
    await pg.goto(f'http://127.0.0.1:{port}/treatment/'); await pg.wait_for_timeout(wait)
    if sheet: await pg.evaluate(f"tsOpenSheet('{sheet}')"); await pg.wait_for_timeout(900)
    if view: await pg.evaluate(f"selectCTab('{view}')"); await pg.wait_for_timeout(900)
    await settle(pg)
    return ctx, pg, errs

SETTLE = """(()=>{const g=document.getElementById('sheetInner'),s=document.getElementById('sheetScroll');
  return [document.readyState, g?g.querySelectorAll('.mark').length:-1, g?[...g.querySelectorAll('.rl-off')].filter(e=>!e.hidden).length:-1,
          s?s.scrollWidth:-1, document.querySelectorAll('[tabindex="0"]').length, document.body.className].join('|')})()"""
async def settle(pg, timeout=6000):
    """wait until the page stops changing (three looks 120 ms apart agree). A cold browser on a busy machine was still
    laying out the sheet when the first check looked — t255 failed on GitHub's WebKit now and then."""
    last, same, waited = None, 0, 0
    while waited < timeout and same < 2:
        cur = await pg.evaluate(SETTLE)
        same = same + 1 if cur == last else 0
        last = cur; await pg.wait_for_timeout(120); waited += 120

# ---- probes (JS) ----
VIS = r"""const vis=e=>{if(!e.getClientRects().length)return false;const c=getComputedStyle(e);if(c.visibility==='hidden'||+c.opacity===0)return false;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return false;
  if(r.bottom<0||r.right<0||r.top>innerHeight*3||r.left>innerWidth)return false;let p=e;while(p&&p!==document.body){if(p.hidden||getComputedStyle(p).display==='none')return false;if(p.getAttribute&&p.getAttribute('aria-hidden')==='true')return 'ah';p=p.parentElement}return true};"""
DESC = r"""const desc=e=>{let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;if(e.className&&typeof e.className==='string')s+='.'+e.className.trim().split(/\s+/).slice(0,3).join('.');return s};
const where=e=>{const m=e.closest('[id^=ctab-],.modal,.mdl,[role=dialog],header,nav,#tsTop,.ts-top');return m?(m.id||m.className.split(' ')[0]):'page'};"""

NAMES = VIS + DESC + r"""
(()=>{const I='button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=option],[tabindex]:not([tabindex="-1"]),summary';
 const name=e=>{let n=e.getAttribute('aria-label');if(n&&n.trim())return n.trim();const lb=e.getAttribute('aria-labelledby');if(lb){const t=lb.split(/\s+/).map(i=>(document.getElementById(i)||{}).textContent||'').join(' ').trim();if(t)return t}
   if(e.labels&&e.labels.length){const t=[...e.labels].map(l=>l.textContent).join(' ').trim();if(t)return t}
   const t=(e.innerText||e.textContent||'').trim();if(t)return t;const im=e.querySelector('img[alt]');if(im&&im.alt.trim())return im.alt.trim();const st=e.querySelector('svg title');if(st&&st.textContent.trim())return st.textContent.trim();
   if(e.title&&e.title.trim())return e.title.trim();if(e.placeholder)return '(placeholder) '+e.placeholder;if(e.value&&e.type==='button')return e.value;return ''};
 const out=[],nameless=[],mismatch=[],clickdiv=[];let total=0;
 document.querySelectorAll(I).forEach(e=>{const v=vis(e);if(v!==true)return;total++;const n=name(e);if(!n||/^\(placeholder\)/.test(n))nameless.push([where(e),desc(e),n,(e.outerHTML||'').slice(0,140)]);
   const al=e.getAttribute('aria-label'),vt=(e.innerText||'').trim().replace(/\s+/g,' ');if(al&&vt&&vt.length>1&&vt.length<40&&!al.toLowerCase().includes(vt.toLowerCase().split(' ')[0]))mismatch.push([where(e),desc(e),vt,al])});
 document.querySelectorAll('div,span,li,td,tr,svg,i,img,p,section,label').forEach(e=>{if(vis(e)!==true)return;const c=getComputedStyle(e).cursor;if(c!=='pointer')return;if(e.closest(I))return;if(e.matches(I))return;
   if(e.tagName==='LABEL'&&(e.control||e.querySelector('input')))return; if(e.parentElement&&getComputedStyle(e.parentElement).cursor==='pointer'&&!e.parentElement.matches(I)&&e.parentElement.closest(':not(body)'))return;clickdiv.push([where(e),desc(e),(e.innerText||'').trim().slice(0,40)])});
 return {total,nameless,mismatch,clickdiv}})()"""

CONTRAST = VIS + DESC + r"""
(()=>{const visC=e=>{const v=vis(e);return v==='ah'?true:v};const P=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [a[0],a[1],a[2],a.length>3?a[3]:1]};
 const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const blend=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1];
 const bgOf=e=>{const st=[];let p=e;let img=false;while(p&&p.nodeType===1){const c=getComputedStyle(p);if(c.backgroundImage&&c.backgroundImage!=='none'&&!/^url/.test(c.backgroundImage))img=true;const b=P(c.backgroundColor);if(b&&b[3]>0){st.push(b);if(b[3]>=.99)break}p=p.parentElement}
   let base=st.length&&st[st.length-1][3]>=.99?st.pop():(document.body.classList.contains('dark')?[12,18,28,1]:[255,255,255,1]);for(let i=st.length-1;i>=0;i--)base=blend(st[i],base);return [base,img]};
 const fails=[];let n=0;const seen=new Set();
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:t=>t.nodeValue.trim()?1:2});let t;
 while(t=w.nextNode()){const e=t.parentElement;if(!e||seen.has(e))continue;seen.add(e);if(visC(e)!==true)continue;const c=getComputedStyle(e);if(e.closest('svg'))continue;
   let fg=P(c.color);if(!fg)continue;const op=+c.opacity;let [bg,img]=bgOf(e);fg=blend([fg[0],fg[1],fg[2],fg[3]*op],bg);
   const r=(Math.max(L(fg),L(bg))+.05)/(Math.min(L(fg),L(bg))+.05);const px=parseFloat(c.fontSize),wt=+c.fontWeight;const need=(px>=24||(px>=18.66&&wt>=700)||wt>=700&&px>=14)?3:4.5;
   const dis=e.closest('[disabled],[aria-disabled=true],.disabled');n++;
   if(r<need&&!dis&&!/::placeholder/.test(''))fails.push([where(e),desc(e),t.nodeValue.trim().slice(0,40),+r.toFixed(2),need,Math.round(px),img?'img-bg':'' ])}
 // placeholders
 const ph=[];document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(e=>{if(vis(e)!==true)return;const c=getComputedStyle(e,'::placeholder');let fg=P(c.color);if(!fg)return;let [bg]=bgOf(e);fg=blend(fg,bg);const r=(Math.max(L(fg),L(bg))+.05)/(Math.min(L(fg),L(bg))+.05);if(r<4.5)ph.push([where(e),e.placeholder.slice(0,30),+r.toFixed(2)])});
 return {n,fails,ph}})()"""

SIZES = VIS + DESC + r"""
((touch)=>{const I='button,a[href],input:not([type=hidden]):not([type=checkbox]):not([type=radio]),input[type=checkbox],input[type=radio],select,textarea,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=option],summary,[tabindex="0"]';
 const out=[];let n=0;const minD=touch?44:28,minH=touch?28:20;
 document.querySelectorAll(I).forEach(e=>{if(vis(e)!==true)return;const r=e.getBoundingClientRect();n++;
   // effective hit area: include ::before/::after hit extenders via padding? approximate with elementFromPoint expansion test
   let w=r.width,h=r.height;
   const hit=(x,y)=>{const el=document.elementFromPoint(x,y);return el&&(el===e||e.contains(el))};
   let ew=w,eh=h;const cx=r.left+r.width/2,cy=r.top+r.height/2;
   if(h<minD&&cy>0&&cy<innerHeight){let up=0,dn=0;for(let d=1;d<=(minD-h)/2+1;d++){if(hit(cx,r.top-d))up=d;else break}for(let d=1;d<=(minD-h)/2+1;d++){if(hit(cx,r.bottom+d))dn=d;else break}eh=h+up+dn}
   if(w<minD&&cy>0&&cy<innerHeight){let l=0,rr=0;for(let d=1;d<=(minD-w)/2+1;d++){if(hit(r.left-d,cy))l=d;else break}for(let d=1;d<=(minD-w)/2+1;d++){if(hit(r.right+d,cy))rr=d;else break}ew=w+l+rr}
   if(ew<minD-0.5||eh<minD-0.5)out.push([where(e),desc(e),(e.innerText||e.getAttribute('aria-label')||e.title||'').trim().replace(/\s+/g,' ').slice(0,30),Math.round(ew),Math.round(eh),(ew<minH||eh<minH)?'below-min':'']);});
 return {n,small:out}})"""

TEXTSIZE = VIS + DESC + r"""
((min)=>{const out={};let n=0;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:t=>t.nodeValue.trim()?1:2});let t;const seen=new Set();
 while(t=w.nextNode()){const e=t.parentElement;if(!e||seen.has(e))continue;seen.add(e);if(vis(e)!==true)continue;n++;const px=parseFloat(getComputedStyle(e).fontSize);if(px<min){const k=Math.round(px*10)/10+'px';(out[k]=out[k]||[]).push(where(e)+' '+desc(e)+' “'+t.nodeValue.trim().slice(0,24)+'”')}}
 return {n,small:out}})"""

ANIM = r"""(()=>{const a=document.getAnimations().map(x=>{const t=x.effect&&x.effect.target;const k=x.effect&&x.effect.getKeyframes?x.effect.getKeyframes():[];const props=[...new Set(k.flatMap(f=>Object.keys(f)).filter(p=>!['offset','easing','composite','computedOffset'].includes(p)))];
  const tim=x.effect.getComputedTiming();return {name:x.animationName||x.transitionProperty||x.constructor.name,props,inf:tim.iterations===Infinity,dur:tim.duration,target:t?(t.id||t.className&&String(t.className).slice(0,40)||t.tagName):''}});return a})()"""

__all__ = [n for n in dir() if not n.startswith('__')]
