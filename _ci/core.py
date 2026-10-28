"""Shared setup for every test: the local web server for the site, the fake in-memory Firebase (fixtures/fakefs.js),
the synthetic training patients, the pinned clock, ok(), and page helpers. run.py sets PVX_SITE and PVX_SHOTS first."""
import sys, os, json, asyncio, threading, functools, http.server, socketserver
from playwright.async_api import async_playwright
BUILD, SHOTS = os.environ['PVX_SITE'], os.environ['PVX_SHOTS']
ENGINE = os.environ.get('PVX_ENGINE', 'chromium')
os.makedirs(SHOTS, exist_ok=True)
ROOT = os.path.dirname(os.path.abspath(__file__))
HERE = os.path.join(ROOT, 'fixtures')
PRIVATE = os.path.join(ROOT, 'private')   # staff-only data: never copied to GitHub
FAKE = open(os.path.join(HERE, 'fakefs.js')).read()
# every page also gets a Yakuri drug library release. YK_SEED points at the licensed test release on the build machine;
# without it (GitHub) a stand-in with one drug name and no doses is used. The licensed one is never in the repository.
YK_SEED = os.environ.get('YK_SEED') or os.path.join(HERE, 'yk_standin.json')
YKSEED = open(YK_SEED).read()
LICENSED = 'r_ci_standin' not in YKSEED[:400]
FAKE = 'window.__fsSeed=Object.assign({},'+YKSEED+',window.__fsSeed||{});\n' + FAKE
SEED = open(os.path.join(HERE, 'seed.json')).read()
NOW = '2026-10-16T22:20:00Z'
# pinned clock: Friday Oct 23 2026, 11 AM in Los Angeles, 2 PM in New York (away from midnight and 11 PM in both)
PIN = '2026-10-23T18:00:00Z'
import datetime as _dtp; PIN_MS = int(_dtp.datetime.fromisoformat(PIN.replace('Z', '+00:00')).timestamp() * 1000)
def pin_now(tz='America/Los_Angeles'):
    from zoneinfo import ZoneInfo; return _dtp.datetime.fromtimestamp(PIN_MS / 1000, ZoneInfo(tz))
PINJS = "(()=>{if(window.__pvxPin)return;window.__pvxPin=1;const D=Date,T=%d,o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()" % PIN_MS
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=BUILD)
class Q(H.func):
    def log_message(self, *a): pass
socketserver.ThreadingTCPServer.daemon_threads = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=BUILD)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/anesia/'
results = []          # (section id, check, passed, details when it failed)
CURRENT = ['']        # the section running now (run.py sets it)
def ok(name, cond, extra=''):
    results.append((CURRENT[0], name, bool(cond), '' if cond else str(extra)[:900])); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(extra)[:900]), flush=True)

INIT = """
(function(){ var T0=Date.parse('NOWISO'), p0=performance.now(); window.__anNow=function(){ return T0+(performance.now()-p0)*(window.__anSpeed||1)+(window.__anSkip||0); }; })();
window.__fsSeed=@@SEED@@; window.__fsUser=@@USER@@;
""".replace('NOWISO', NOW)
WRAP = """
(function(){ var db=firebase.firestore(), rt=db.runTransaction;
  db.runTransaction=function(fn){ if(window.__fsOffline) return new Promise(function(_,rej){ setTimeout(function(){ rej({code:'unavailable'}); },50); }); return rt.call(db,fn); }; })();
"""

async def new_page(br, user='{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}', vp=(1440, 900), dark=True, seed=True, touch=False):
    ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light', **(dict(has_touch=True, is_mobile=True) if touch else {}))
    if not dark: await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
    init = INIT.replace('@@USER@@', user).replace('@@SEED@@', SEED if seed else '{}')
    await ctx.add_init_script(init); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await pg.route('**/*', route)
    return ctx, pg, errs

async def shot(pg, name, full=False):
    await pg.wait_for_timeout(250); await pg.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=full)

async def store(pg, id_):
    return await pg.evaluate("id=>JSON.parse(JSON.stringify(window.__fs['anesia_records/'+id]||null))", id_)

async def vitals_save(pg, vals, submit=True):
    await pg.click('[data-act=vitals]'); await pg.wait_for_selector('#anVForm')
    for k, v in vals.items(): await pg.fill('#nv_' + k, str(v))
    if submit: await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(300)

async def until(pg, js, timeout=4000):
    """wait for a condition instead of a fixed time (the test machine's speed varies)"""
    try: await pg.wait_for_function(js, timeout=timeout); return True
    except Exception: return False

async def pick(pg, name):
    if await pg.locator(f'#anSheet [data-pick]:has-text("{name}")').count(): await pg.click(f'#anSheet [data-pick]:has-text("{name}")')
    else:
        if await pg.locator('#anSheet [data-pick="other"]').count(): await pg.click('#anSheet [data-pick="other"]')
        opts = await pg.evaluate("[...document.querySelectorAll('#anSheet [name=drug] option')].map(o=>o.textContent)")
        lab = [o for o in opts if o.startswith(name)][0]
        await pg.select_option('#anSheet [name=drug]', label=lab)


# ── sections register themselves here ──
SECTIONS = []
def section(id, title, apps, topics, engines=('chromium',), local=None):
    """apps: which apps it opens; topics: what it checks; engines: chromium and/or webkit;
    local: 'licensed' or 'staff-only' when it must never run on GitHub"""
    def deco(fn):
        SECTIONS.append(dict(id=id, title=title, apps=list(apps), topics=list(topics), engines=list(engines), local=local, fn=fn, module=fn.__module__.split('.')[-1]))
        return fn
    return deco

__all__ = [n for n in dir() if not n.startswith('__')]   # names starting with _ are shared too
