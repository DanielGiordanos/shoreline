"""Setup that several sections share (it used to live inside the first section that needed it).
run.py sets helpers.br to the browser before any section runs."""
from core import *
br = None

# ── from n184: Flow follows the HIG Layout page — FU, flow_page, newerr (the section keeps its own copy of x)
FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
async def flow_page(vp, touch=False, ua=None, extra=None, dark=True):
    kw = dict(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
    if touch: kw.update(has_touch=True, is_mobile=True)
    if ua: kw['user_agent'] = ua
    c = await br.new_context(**kw)
    if not dark: await c.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    if extra: await c.add_init_script(extra)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await p.route('**/*', route)
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2200)
    return c, p, e
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]   # both come from the fake Firestore (n183 has them too)

# ── from n192: drag and drop (HIG Drag and drop) — SEEDP
SEEDP = "(()=>{const now=Date.now();[['Waiting','Lobby'],['Waiting','Lobby'],['Exam','Room 1']].forEach((v,i)=>{PATIENTS.push(patient({name:'Dnd'+i,last:'Test',owner:'Synthetic',status:v[0],room:v[1],arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));}); renderAll();})()"

# ── from n216: segmented controls and sliders across the suite — STUB216
STUB216 = {'firebase-app.js': 'export function initializeApp(){return {}}',
  'firebase-firestore.js': 'export function getFirestore(){return {}} export function doc(){return {}} export function collection(){return {}} export async function getDoc(){return {exists:()=>false,data:()=>({})}} export async function setDoc(){} export function onSnapshot(r,cb){ return ()=>{} }',
  'firebase-analytics.js': 'export function getAnalytics(){return {}}'}

# ── from n222: SGVP catch-up audit (HIG) — p222
FU222 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
CL222 = "(()=>{const D=Date,T=new D('2026-10-19T10:00:00').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()"
async def p222(path, vp=(1440, 900), touch=False, dark=True, user=FU222):
    c, p, e = await new_page(br, user=user, vp=vp, touch=touch, dark=dark)
    await c.add_init_script(CL222)
    await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
    return c, p, e

# ── from n230: Treatment Sheets — HIG Color, Layout, Materials (synthetic training patients) — HUE, SEED230, U230, _re230, ts230
import re as _re230
SEED230 = json.loads(SEED); SEED230.update(json.load(open(os.path.join(HERE, 'seed_ts_n230.json'))))
SEED230 = json.dumps(SEED230)
U230 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
async def ts230(vp=(1440, 900), dark=True, touch=False, media=None, cookie=True, big=False, view='dash', open_sheet=True):
    ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light', **(dict(has_touch=True, is_mobile=True) if touch else {}))
    if cookie: await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED230)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    if big: await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='200%'})")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    if media:
        cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': media})
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2600)
    if open_sheet: await pg.evaluate("tsOpenSheet('sh_train1')"); await pg.wait_for_timeout(900)
    await pg.evaluate(f"selectCTab('{view}')"); await pg.wait_for_timeout(1000)
    return ctx, pg, errs
HUE = "(c=>{const m=String(c).match(/[\\d.]+/g).map(Number);let [r,g,b]=m.map(x=>x/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(d<.12)return -1;let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;return h<0?h+360:h})"

# ── from n232: Treatment Sheets — HIG Motion, SF Symbols, Charting data (synthetic training patient — SEED232, _dt232, _now232, ts232
import datetime as _dt232
try:
    from zoneinfo import ZoneInfo as _ZI232; _now232 = pin_now()
except Exception:
    _now232 = pin_now()
S232 = json.loads(SEED230); _b = S232['sheets/sh_train1']; _b.setdefault('marks', {})
for _oid, _vals in (('d1', [101.5, 102.1, 102.8, 103.4, 102.6, 101.9, 101.4]), ('d2', [120, 128, 135, 142, 130, 118, 112]), ('d3', [28, 30, 34, 36, 32, 28, 26])):
    for _k, _v in enumerate(_vals):
        _t = _now232 - _dt232.timedelta(hours=26 - 4 * _k)
        _m = (_t.hour * 60 + _t.minute) // 60 * 60
        _b['marks'][_t.strftime('%Y%m%d') + '_' + _oid + '_' + str(_m)] = {'orderId': _oid, 'status': 'completed', 'value': str(_v), 'sched': _m, 'min': _m + 5, 'by': 'DG', 'at': None}
for _i, _nm in enumerate(['Pepper', 'Olive', 'Maple', 'Ziggy', 'Nutmeg', 'Clover']):
    _c = json.loads(json.dumps(S232['sheets/sh_train1'])); _c['visit_id'] = 'v_train%d' % (_i + 4); _c['patient']['name'] = _nm; _c['marks'] = {}
    S232['sheets/sh_train%d' % (_i + 4)] = _c
SEED232 = json.dumps(S232)
IV232 = "(()=>{const s=window.setInterval;window.__iv20=[];window.setInterval=function(f,d){const id=s.apply(window,arguments);if(d===2e4)window.__iv20.push(f);return id}})();"
async def ts232(vp=(1440, 900), dark=True, touch=False, media=None, view='sheet', open_sheet=True):
    ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light', **(dict(has_touch=True, is_mobile=True) if touch else {}))
    await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED232)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP); await ctx.add_init_script(IV232)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    if media:
        cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': media})
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2600)
    if open_sheet: await pg.evaluate("tsOpenSheet('sh_train1')"); await pg.wait_for_timeout(900)
    await pg.evaluate(f"selectCTab('{view}')"); await pg.wait_for_timeout(1200)
    return ctx, pg, errs

# ── from n245 + n247: Treatment Sheets — light-mode colours; problem names in Title Case (synthetic — _st, ts245
S245 = json.loads(SEED232); _s = S245['sheets/sh_train1']
_st = (_now232 - _dt232.timedelta(hours=3)).astimezone(_dt232.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
_s['orders']['f245'] = {'id': 'f245', 'type': 'fluid', 'cont': True, 'kind': 'fluid', 'section': 'Continuous Infusions', 'name': 'Lactated Ringer’s (LRS)', 'route': 'IV', 'rate_v': 60, 'rate_u': 'mL/hr', 'rate': '60 mL/hr', 'rates': [{'at': _st, 'v': 60, 'u': 'mL/hr', 'by': 'DG'}], 'started_at': _st, 'start': 0, 'ordered_by': 'DG', 'ordered_at': _st}
_s['orders']['m245'] = {'id': 'm245', 'type': 'med', 'section': 'Medications', 'name': 'Maropitant', 'dose': 1, 'unit': 'mg/kg', 'route': 'IV', 'freq': 'q24h', 'start': 8, 'conc': 10, 'conc_label': 'Maropitant 10 mg/mL', 'ordered_by': 'DG', 'ordered_at': _st}
_s['patient']['problem_list'] = [{'id': 'p1', 'text': 'pericardial effusion', 'added_at': _st, 'added_by': 'DG'}, {'id': 'p2', 'text': 'Vomiting · 3 times', 'added_at': _st, 'added_by': 'DG'}]
SEED245 = json.dumps(S245)
async def ts245(dark=True, vp=(1440, 900), wait=2600):
    ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
    await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED245))
    await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await ctx.route('**/*', route)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
    await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
    return ctx, pg, errs

__all__ = [n for n in dir() if not n.startswith('__')]
