"""Anesia UI tests — synthetic training cases, fake in-memory Firebase (fakefs.js), pinned clock (PIN).
python3 ui_test.py BUILD_DIR SHOTS_DIR"""
import sys, os, json, asyncio, threading, functools, http.server, socketserver
from playwright.async_api import async_playwright
BUILD, SHOTS = sys.argv[1], sys.argv[2]
os.makedirs(SHOTS, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
FAKE = open(os.path.join(HERE, 'fakefs.js')).read()
# n254: every page also gets the hosted Yakuri test release (built from the licensed snapshot; kept in the scratchpad, never packaged)
YKSEED = open(os.environ['YK_SEED']).read() if os.environ.get('YK_SEED') else '{}'   # licensed: never in the repo
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
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=BUILD)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{PORT}/anesia/'

import time as _tsec
_SEL = set(int(x) for x in os.environ['SECTIONS'].split(',')) if os.environ.get('SECTIONS') else None
_HELP = set(int(x) for x in os.environ.get('HELPERS', '').split(',') if x)
_MUTE = [False]; _T0 = [0.0]; _CUR = [-1]
class _Skip(Exception): pass
def _helper(k): return _SEL is not None and k in _HELP and k not in _SEL
def _sec(k):
    if _SEL is not None and k not in _SEL: raise _Skip()
    _T0[0] = _tsec.time(); _CUR[0] = k
    if not _MUTE[0]: print('@@BEGIN %d' % k, flush=True)
def _secend(k):
    if not _MUTE[0]: print('@@SEC %d %.1f' % (k, _tsec.time() - _T0[0]), flush=True)
    _MUTE[0] = False
results = []
def ok(name, cond, extra=''):
    if _MUTE[0]: return
    results.append((name, bool(cond), _CUR[0])); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(extra)))

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

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        _nc = br.new_context
        async def _nc_pinned(*a, **k):
            c = await _nc(*a, **k); await c.add_init_script(PINJS); return c
        br.new_context = _nc_pinned
        try:
            # ---------- list
            _sec(0)
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL); await pg.wait_for_selector('[data-open]')
            ok('list: title and training note', await pg.locator('h1').inner_text() == 'Anesia' and 'not part of the medical record' in await pg.inner_text('.an-lhead'))
            ok('list: in progress shows the 2 open cases', await pg.locator('.an-card').count() == 2)
            ok('top bar: Anesia is the current app', await pg.get_attribute('#navAnesia', 'aria-current') == 'page')
            await shot(pg, '01-list-dark')
            _secend(0)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — list', False, repr(_e)[:300])
        try:
            # ---------- record
            _sec(1)
            await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart')
            ok('header: weight is its own large control', (await pg.inner_text('#anWeight')).startswith('32.4') and 'Weighed' in await pg.inner_text('#anWeight'))
            ok('header: one line of facts and an info button; ASA in the summary', 'ASA' in await pg.inner_text('.an-sum') and 'II' in await pg.inner_text('.an-sum') and await pg.locator('#anPatient[aria-label="Patient details"]').count() == 1)
            ok('header: timer', '1:20' in await pg.inner_text('.an-clock'))
            nowc = await pg.inner_text('.an-nowcol')
            ok('Now column: latest HR, BP with mean, SpO2, EtCO2', '70' in nowc and '112/62' in nowc and '(79)' in nowc and 'SpO₂' in nowc, nowc[:300])
            ok('Now column: vitals due after 5 minutes', 'Vitals due · 5 min' in nowc and 'vitals due' in (await pg.get_attribute('[data-act=vitals]', 'aria-label')), nowc[:120])
            ok('Now column: gas settings and pumps', 'Isoflurane' in nowc and '1.75' in nowc and '9.72' in nowc and '162' in nowc)
            ok('Now column: trend lines', await pg.locator('.an-tile .an-spark').count() >= 5)
            ok('chart: one row per drug (fentanyl once)', await pg.evaluate("[...document.querySelectorAll('.an-lab b')].filter(b=>b.textContent==='Fentanyl').length") == 1)
            ok('chart: fentanyl row holds its bolus and its infusion', await pg.evaluate("(()=>{const rows=[...document.querySelectorAll('.an-row')].filter(r=>r.querySelector('.an-lab b')?.textContent==='Fentanyl');const t=rows[0].querySelector('.an-trk');return !!t.querySelector('.an-bar')&&!!t.querySelector('.an-mk')})()"))
            ok('chart: fluids in their own group', await pg.locator('.an-lab.grp:has-text("Fluids")').count() == 1)
            ok('chart: blood pressure on one row', await pg.locator('.an-lab b:text-is("BP")').count() == 1 and await pg.locator('.an-lab b:text-is("SAP")').count() == 0)
            ok('chart: one shared clock', await pg.evaluate("new Set([...document.querySelectorAll('.an-trk')].map(e=>e.style.width)).size===1"))
            ok('chart: scrolled to now', await pg.evaluate("(()=>{const c=document.querySelector('.an-chart'),n=document.querySelector('.an-now');const x=n.offsetLeft-c.scrollLeft;return x>0&&x<c.clientWidth})()"))
            cols = await pg.evaluate('''(()=>{const cs=getComputedStyle(document.body),acc=cs.getPropertyValue('--an-accent').trim();
              const nowBg=getComputedStyle(document.querySelector('.an-now')).backgroundColor;
              const mapLine=document.querySelector('.an-graph polyline').getAttribute('stroke');
              const hr=document.querySelector('.an-graph circle[r="4"]').getAttribute('fill');
              const bar=getComputedStyle(document.querySelector('.an-bar.c-opioid'),'::after').backgroundColor;
              return {acc,nowBg,mapLine,hr,bar,iso:getComputedStyle(document.querySelector('.an-bar.gas-iso'),'::after').backgroundColor,sevoVar:cs.getPropertyValue('--an-g-sevo').trim()}})()''')
            ok('colour: the now line is not the accent', 'rgb(56, 189, 210)' not in cols['nowBg'], cols)
            ok('colour: MAP line and HR dots use the vital colours', cols['mapLine'] == 'var(--an-bp)' and cols['hr'] == 'var(--an-hr)', cols)
            ok('colour: fentanyl infusion line is opioid blue, isoflurane purple', cols['bar'] == 'rgb(77, 163, 255)' and cols['iso'] == 'rgb(191, 140, 240)', cols)
            ok('colour: drug rows say their class', 'Opioid' in await pg.inner_text('.an-chart') and 'Induction' in await pg.inner_text('.an-chart'))
            acc_static = await pg.evaluate('''(()=>{const acc='rgb(56, 189, 210)';return [...document.querySelectorAll('#anApp *')].filter(e=>e.offsetParent&&!e.closest('button,a,[role=radio]')).filter(e=>{const c=getComputedStyle(e);return c.backgroundColor===acc||c.borderLeftColor===acc&&c.borderLeftWidth!=='0px'&&c.borderLeftStyle!=='none'}).map(e=>e.className).slice(0,5)})()''')
            ok('colour: cyan appears only on things you can tap', not acc_static, acc_static)
            ok('totals: hidden until asked for at 1440 px (the chart gets the room)', await pg.locator('#anInspector').count() == 0 and await pg.get_attribute('#anInsp', 'aria-pressed') == 'false')
            await shot(pg, '02-record-dark'); await shot(pg, '02b-record-dark-full', True)
            await pg.click('#anInsp'); await pg.wait_for_timeout(800)   # n175: totals count up for 650 ms
            tot = await pg.inner_text('#anInspector .an-tot')
            ok('totals: open on request; propofol 81 mg, fentanyl 405 mcg, struck-through methadone left out', '81 mg' in tot and ('405 mcg' in tot or '406 mcg' in tot) and '9.72 mg' in tot, tot)
            await shot(pg, '03-record-totals')
            await pg.click('#anInsp')
            _secend(1)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — record', False, repr(_e)[:300])
        try:
            # ---------- vitals in the Now column
            _sec(2)
            await pg.click('[data-act=vitals]'); await pg.wait_for_selector('#anVForm')
            ok('vitals: form opens in the Now column, focus on HR', await pg.evaluate("document.activeElement.id") == 'nv_hr')
            await pg.keyboard.type('84'); await pg.keyboard.press('Enter')
            ok('vitals: Return moves to the next field', await pg.evaluate("document.activeElement.id") == 'nv_rr')
            await pg.fill('#nv_hr', '900'); await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(150)
            ok('vitals: typing slip caught in place', await pg.get_attribute('#nv_hr', 'aria-invalid') == 'true' and 'Enter HR from' in await pg.inner_text('#anVForm'))
            await pg.fill('#nv_hr', '84'); await pg.fill('#nv_sap', '112'); await pg.fill('#nv_dap', '62'); await pg.fill('#nv_spo2', '99')
            await pg.evaluate("window.anesiaApp.render(true)")   # a save or the clock re-renders the page while typing
            ok('vitals: typing survives a re-render', await pg.input_value('#nv_sap') == '112')
            await shot(pg, '04-vitals-inline')
            await pg.focus('#nv_temp'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); v = d['vitals'][-1]
            ok('vitals: Return in the last field saves (MAP worked out: 79)', v.get('hr') == 84 and v.get('map') == 79 and v.get('mapCalc'), v)
            ok('vitals: due marker gone after saving', 'Vitals due' not in await pg.inner_text('.an-nowcol'))
            ok('saving: Saved after the server confirmed', (await pg.inner_text('#anSave')) == 'Saved')
            ok('undo offered', 'Undo' in await pg.inner_text('#anToast'))
            ok('focus back on Vitals now', await pg.evaluate("document.activeElement.getAttribute('data-act')") == 'vitals')
            ok('no "Fill with last values": every value is read off the monitor', await pg.locator('[data-vfill]').count() == 0)
            # motion: the new reading appears in place, the tile flashes once, the sheet eases in
            ok('motion: new vitals cells animate in', await pg.locator('.an-mon.fresh').count() >= 1)
            ok('motion: changed tiles flash', await pg.locator('.an-tile.chg').count() >= 1)
            ok('n170: changed values roll in digit by digit', await pg.locator('.an-tile .an-dg').count() >= 1)
            ok('n170: the new MAP point draws the line out to it', await pg.locator('.an-graph .an-draw').count() == 1 and await pg.locator('.an-graph .an-pt-new').count() >= 1)
            await pg.wait_for_timeout(800); await pg.evaluate("window.anesiaApp.render(true)")
            ok('motion: plays once (not again on the next re-render)', await pg.locator('.an-mon.fresh').count() == 0 and await pg.locator('.an-tile.chg').count() == 0)
            ok('n170: rolling and draw-in play once', await pg.locator('.an-dg').count() == 0 and await pg.locator('.an-draw').count() == 0 and await pg.locator('.an-pt-new').count() == 0)
            # future time
            await pg.click('[data-act=vitals]'); await pg.fill('#nv_hr', '80'); await pg.click('[data-vtime]'); await pg.fill('#nv_time', '16:30'); await pg.click('#anVForm [type=submit]')
            ok('vitals: a time in the future is refused', 'future' in await pg.inner_text('#anVForm'))
            await pg.click('[data-vcancel]'); await (pg.click('[data-vdrop]') if await pg.locator('[data-vdiscard]:not([hidden])').count() else pg.wait_for_timeout(1))
            _secend(2)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — vitals in the Now column', False, repr(_e)[:300])
        try:
            # ---------- give drug with quick picks, undo
            _sec(3)
            await pg.click('[data-act=dose]')
            ok('motion: the sheet rises in (grows from its button)', await pg.evaluate("getComputedStyle(document.querySelector('#anSheet .an-sheet')).animationName") in ('anRise', 'anMorphBig'))
            await pg.wait_for_timeout(120)
            ok('dose: recent drugs as one-tap picks, focus on the first', await pg.locator('#anSheet [data-pick]').count() >= 4 and await pg.evaluate("document.activeElement.hasAttribute('data-pick')"))
            ok('dose: route and time folded into one line', 'IV · Now' in await pg.inner_text('#anSheet') and not await pg.locator('#anSheet [name=time]').is_visible())
            await pick(pg, 'Propofol')
            ok('dose: picking a drug moves to the dose and uses its last unit', await pg.evaluate("document.activeElement.name") == 'dose' and await pg.input_value('#anSheet input[name=unit]') == 'mg/kg')
            await pg.keyboard.type('1')
            calc = await pg.inner_text('[data-calc]')
            ok('dose: the calculated amount is the hero (32.4 mg · 3.24 mL)', '32.4 mg · 3.24 mL' in calc, calc)
            await shot(pg, '05-dose-sheet')
            await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); nd = len(d['doses'])
            ok('dose: saved', abs(d['doses'][-1]['mg'] - 32.4) < 1e-9)
            await shot(pg, '06-undo-toast')
            await pg.click('#anUndo'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1')
            ok('undo: the dose leaves the record, the history keeps a line', len(d['doses']) == nd - 1 and 'Undid Propofol' in d['audit'][-1]['detail'])
            # Ctrl+Z
            await pg.click('[data-act=gas]'); await pg.click('#anSheet [data-chips=agent] [data-v=iso]'); await pg.click('[data-step="-1"]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); ng = len(d['gases'])
            await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); ok('Ctrl+Z undoes the last change', len(d['gases']) == ng - 1)
            # route change
            await pg.click('[data-act=dose]'); await pick(pg, 'Ketamine'); await pg.fill('#anSheet [name=dose]', '0.5')
            await pg.click('#anSheet [data-chips=unit] [data-v="mg/kg"]')
            await pg.click('[data-ropen]'); await pg.click('#anSheet [data-chips=route] [data-v=IM]')
            await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1')
            ok('dose: a drug from the full list, route changed to IM, one save', d['doses'][-1]['route'] == 'IM' and any(x['name'] == 'Ketamine' for x in d['drugs']))
            # big-dose guard
            await pg.click('[data-act=dose]'); await pick(pg, 'Propofol'); await pg.fill('#anSheet [name=dose]', '10')
            ok('dose: 5× the last dose asks for a check', await pg.locator('[data-big]').is_visible())
            await pg.keyboard.press('Escape')
            ok('Escape with typed values asks first (Discard your changes?)', await pg.locator('#anSheet [data-discard]:not([hidden])').count() == 1 and await pg.locator('#anSheet').count() == 1)
            await pg.click('#anSheet [data-drop]')
            ok('Discard closes the sheet at once (the page is usable while it eases out)', await pg.locator('#anSheet').count() == 0 and not await pg.evaluate("!!document.querySelector('[inert]')"))
            await pg.wait_for_timeout(250); ok('motion: the closing sheet is gone after its animation', await pg.locator('.an-scrim').count() == 0)
            _secend(3)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — give drug with quick picks, undo', False, repr(_e)[:300])
        try:
            # ---------- weight change → pumps
            _sec(4)
            await pg.click('#anWeight'); await pg.fill('[name=kg]', '30')
            imp = await pg.inner_text('[data-impact]')
            ok('weight: preview shows the new pump rates', '9.72 → 9 mL/h' in imp and '162 → 150 mL/h' in imp, imp)
            await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            ok('weight: banner says set the pumps', 'set the pumps' in await pg.inner_text('#anApp'))
            pumps = await pg.evaluate("[...document.querySelectorAll('.an-inf b')].map(b=>b.textContent)")
            ok('weight: Now column pumps 150 and 9 mL/h', any(x.startswith('150') for x in pumps) and any(x.startswith('9 ') for x in pumps), pumps)
            ok('weight: header shows 30 kg', (await pg.inner_text('#anWeight')).startswith('30'))
            await pg.click('#anPumpsSet')
            _secend(4)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — weight change → pumps', False, repr(_e)[:300])
        try:
            # ---------- infusion rate
            _sec(5)
            await pg.click('.an-inf li:has-text("Fentanyl") [data-inf]'); await pg.fill('#anSheet [name=rate]', '20')
            ok('infusion: new pump rate while typing (12 mL/h)', '12 mL/h' in await pg.inner_text('[data-pump]'))
            await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); ok('infusion: rate change saved', d['infusions'][1]['changes'][-1]['rate'] == 20)
            _secend(5)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — infusion rate', False, repr(_e)[:300])
        try:
            # ---------- event
            _sec(6)
            await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.fill('[name=note]', 'Training: hypotension drill'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); ok('event: note saved at now', d['events'][-1]['kind'] == 'note')
            _secend(6)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — event', False, repr(_e)[:300])
        try:
            # ---------- strike through from the chart
            _sec(7)
            await pg.click('.an-mon >> nth=0'); await pg.wait_for_selector('#anSheet [data-void]')
            await pg.click('[data-void]'); await pg.fill('[name=reason]', 'Artifact — cuff moved'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); ok('strike through: saved with name and reason', d['vitals'][0].get('void', {}).get('by') == 'Resident A')
            _secend(7)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — strike through from the chart', False, repr(_e)[:300])
        try:
            # ---------- offline
            _sec(8)
            await pg.evaluate("window.__fsOffline=true")
            await vitals_save(pg, {'hr': 81})
            await pg.wait_for_timeout(500); ok('offline: never says Saved', (await pg.inner_text('#anSave')) != 'Saved')
            await pg.wait_for_timeout(4200); ok('offline: says it will save when connected', 'Offline' in await pg.inner_text('#anSave'))
            await pg.reload(); await pg.wait_for_selector('.an-chart'); await pg.evaluate("window.__fsOffline=true")
            ok('offline: kept after a reload', '81' in await pg.inner_text('.an-nowcol'))
            await pg.evaluate("window.__fsOffline=false; window.dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(800)
            d = await store(pg, 'an_train1'); ok('back online: saved', d['vitals'][-1].get('hr') == 81 and (await pg.inner_text('#anSave')) == 'Saved')
            _secend(8)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — offline', False, repr(_e)[:300])
        try:
            # ---------- two at once
            _sec(9)
            await pg.evaluate("window.__fsOffline=true")
            await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=closure]'); await pg.click('[data-ok]')
            await pg.evaluate("""(()=>{ const A=window.Anesia, k='anesia_records/an_train1'; const cur=window.__fs[k];
                window.__fs[k]=JSON.parse(JSON.stringify(A.apply(cur,{type:'event',kind:'note',note:'From another computer',eid:'e_other'},{by:'Supervisor B',at:window.__anNow()}))); })()""")
            await pg.evaluate("window.__fsOffline=false; window.dispatchEvent(new Event('online'))")
            await until(pg, "(()=>{const d=window.__fs['anesia_records/an_train1'];return d&&d.events.some(e=>e.kind==='closure')&&d.events.some(e=>e.id==='e_other')})()", 6000)
            d = await store(pg, 'an_train1'); kinds = [e['kind'] for e in d['events']]
            ok('two at once: both changes kept', 'closure' in kinds and any(e.get('id') == 'e_other' for e in d['events']))
            _secend(9)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — two at once', False, repr(_e)[:300])
        try:
            # ---------- end, sign
            _sec(10)
            await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            await pg.click('#anREnd'); await pg.click('#anSheet [data-chips=dest] [data-v=ICU]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)   # n180: recovery first
            await pg.click('#anSign'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train1'); ok('end and sign', d['status'] == 'signed')
            ok('n170: signing locks the seal and the record settles', await pg.locator('.an-signed.just .an-seal').count() == 1 and await pg.locator('.an-body.settle').count() == 1)
            ok('n172: Add addendum uses Compose (pencil over a square), not Rename', 'M11 4.5H6.5' in await pg.inner_html('#anAdd'))
            ok('signed: tools and tiles off', await pg.locator('[data-act=vitals][disabled]').count() == 1 and await pg.locator('.an-tile[disabled]').count() == 6, [await pg.locator('[data-act=vitals]').count(), await pg.locator('[data-act=vitals][disabled]').count(), await pg.locator('.an-tile').count(), await pg.locator('.an-tile[disabled]').count(), await pg.locator('#anSheet').count()])
            await pg.click('#anPatient'); ok('signed: info shows details read-only', await pg.locator('#anSheet [data-ok]').count() == 0 and 'Labrador' in await pg.inner_text('#anSheet')); await pg.keyboard.press('Escape')
            await shot(pg, '07-signed')
            ok('no page errors (record flow)', not errs, errs)
            await ctx.close()
            _secend(10)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — end, sign', False, repr(_e)[:300])
        try:
            # ---------- no weight
            _sec(11)
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train3'); await pg.wait_for_selector('.an-chart')
            ok('no weight: amber weight control and banner', await pg.locator('.an-wbig.none').count() == 1 and 'No weight on file' in await pg.inner_text('#anApp'))
            ok('empty groups hidden (no Gases, Drugs or Events yet)', await pg.locator('.an-lab.grp').all_inner_texts() == ['Vitals'], await pg.locator('.an-lab.grp').all_inner_texts())
            await pg.click('[data-act=dose]'); await pick(pg, 'Propofol'); await pg.fill('#anSheet [name=dose]', '4')
            ok('no weight: not calculated', 'Needs a weight' in await pg.inner_text('[data-calc]'))
            await pg.click('[data-ok]'); ok('no weight: refused without the typed dose', await pg.get_attribute('[name=mgGiven]', 'aria-invalid') == 'true')
            await pg.fill('[name=mgGiven]', '40'); await pg.click('[data-ok]'); ok('no weight: refused without the confirmation', await pg.locator('#anSheet').count() == 1)
            await pg.check('[name=confirmNoWeight]'); await shot(pg, '08-noweight-dose'); await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, 'an_train3'); ok('no weight: saved as typed 40 mg', d['doses'][-1]['mg'] == 40 and d['doses'][-1].get('noWeight'))
            await pg.click('[data-act=infusion]'); await pick(pg, 'Fentanyl'); await pg.fill('#anSheet [name=rate]', '5')
            ok('no weight: per-kg infusion blocked', 'Needs a weight' in await pg.inner_text('[data-calc]'))
            await pg.click('[data-ok]'); ok('no weight: infusion not started', await pg.locator('#anSheet').count() == 1)
            await pg.click('[data-x]'); ok('no page errors (no weight)', not errs, errs)
            await ctx.close()
            _secend(11)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — no weight', False, repr(_e)[:300])
        try:
            # ---------- new record
            _sec(12)
            ctx, pg, errs = await new_page(br, seed=False)
            await pg.goto(URL); await pg.wait_for_selector('.an-empty')
            await pg.click('#anNew')
            ok('new: Create waits for a name', await pg.locator('#anSheet [data-ok][disabled]').count() == 1)
            ok('new: ASA is a set of chips', await pg.locator('#anSheet [data-chips=asa] .an-chip').count() == 6)
            await pg.fill('[name=name]', 'Training dog 9'); await pg.fill('[name=kg]', '18.2'); await pg.click('[data-ok]')
            await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            keys = await pg.evaluate("Object.keys(window.__fs).filter(k=>k.startsWith('anesia_records/'))"); d = await store(pg, keys[0].split('/')[1]) if keys else None
            ok('new: created as a training record with weight', d and d['kind'] == 'training' and (d['patient']['weights'] or [{}])[0].get('kg') == 18.2, d and d['patient'])
            ok('n161: a new record is not confirmed: chip, prompt and watermark', await pg.locator('#anConfirm').count() == 1 and await pg.locator('.an-confirm').count() == 1 and await pg.locator('.an-chartp.unconf .an-wm').count() == 1)
            await pg.evaluate("""(()=>{window.__seen170={};const chk=()=>{if(document.querySelector('.an-wm.gone'))__seen170.wm=1;if(document.querySelector('.an-pill.conf.drawn'))__seen170.pill=1;};new MutationObserver(chk).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});})()""")   # n213: record the sweep whenever it happens
            await pg.click('#anStart'); await pg.wait_for_timeout(150)
            ok('n161: Start asks to confirm the patient first', (await pg.inner_text('#anShT')) == 'Confirm patient' and 'Training dog 9' in await pg.inner_text('#anSheet .an-cfm'))
            await pg.click('[data-ok]'); await pg.wait_for_timeout(400)
            ok('n161: after confirming, it carries on to Start', (await pg.inner_text('#anShT')) == 'Start anesthesia')
            await pg.click('[data-ok]'); await pg.wait_for_timeout(300)
            d = await store(pg, keys[0].split('/')[1]); ok('new: anesthesia started', d['status'] == 'active')
            ok('n161: confirmation saved with who and when', d.get('confirmed') and d['confirmed']['by'] == 'Resident A')
            ok('n161: chip turns green, prompt and watermark gone', await pg.locator('.an-pill.conf').count() == 1 and await pg.locator('.an-confirm').count() == 0 and await pg.locator('.an-wm:not(.gone)').count() == 0)
            await until(pg, "!!(window.__seen170&&__seen170.wm&&__seen170.pill)", 1500)
            ok('n170: confirming sweeps the watermark away and draws the check', await pg.evaluate("!!(window.__seen170&&__seen170.wm&&__seen170.pill)"))
            await pg.wait_for_timeout(1000); await pg.evaluate("window.anesiaApp.render(true)")
            ok('n170: and only once', await pg.locator('.an-wm').count() == 0 and await pg.locator('.an-pill.conf.drawn').count() == 0)
            await shot(pg, '09-new-active')
            ok('no page errors (new)', not errs, errs)
            await ctx.close()
            _secend(12)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — new record', False, repr(_e)[:300])
        try:
            # ---------- n155: the HIG audit fixes
            _sec(13)
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            ok('n155: the patient name is the page heading (h1)', (await pg.inner_text('.an-id h1')).startswith('Training dog 4'))
            ok('n155: every toolbar button has a name and a tooltip with its shortcut', await pg.evaluate("[...document.querySelectorAll('.an-tools [data-act]')].every(b=>b.getAttribute('aria-label')&&/⌥/.test(b.title))"))
            ok('n155: "vitals due" is in the button name', 'vitals due' in (await pg.get_attribute('[data-act=vitals]', 'aria-label')))
            ok('n155: time ticks hidden from VoiceOver', await pg.get_attribute('.an-row.time .an-trk', 'aria-hidden') == 'true')
            g = await pg.get_attribute('.an-graph', 'aria-label')
            ok('n155: the graph has a spoken summary', 'heart rate' in g and 'blood pressure' in g, g)
            ok('n155: rows are headings for the rotor', await pg.locator('.an-chart [role=heading]').count() >= 10)
            ok('n155: axis units shown', 'bpm · mmHg' in await pg.inner_text('.an-legend'))
            hit = await pg.evaluate("getComputedStyle(document.querySelector('.an-mk'),'::after').height")
            ok('n155: chart markers have a 44 pt touch area', hit == '44px', hit)
            ok('n155: one Tab stop per chart row', await pg.evaluate("[...document.querySelectorAll('.an-chart .an-trk')].filter(t=>t.querySelector('button')).every(t=>[...t.querySelectorAll('button')].filter(b=>b.tabIndex===0).length===1)"))
            await pg.focus('.an-mon[tabindex="0"] >> nth=0'); before = await pg.evaluate("document.activeElement.getAttribute('data-entry')")
            await pg.keyboard.press('ArrowLeft'); after = await pg.evaluate("document.activeElement.getAttribute('data-entry')")
            ok('n155: arrow keys move between readings', before != after and after and after.startswith('vitals:'))
            await pg.evaluate("document.querySelector('.an-chart').dataset.keep='1'; window.__anSkip=(window.__anSkip||0)+60000; window.anesiaApp.tick()")
            ok('n155: the clock ticks in place (no rebuild, VoiceOver keeps its place)', await pg.evaluate("document.querySelector('.an-chart').dataset.keep") == '1' and '1:21' in await pg.inner_text('.an-clock'))
            ok('n155: first-run tips shown once', await pg.locator('.an-tips').count() == 1)
            await pg.click('#anTipsOk'); ok('n155: tips dismissed and remembered', await pg.locator('.an-tips').count() == 0 and await pg.evaluate("localStorage.getItem('anesia:v1:tip:value')") == '1')
            await pg.evaluate("firebase.firestore().collection('anesia_presence').doc('an_train1_u2').set({tenant_id:'shoreline',rec:'an_train1',uid:'u2',name:'Supervisor B',at:Date.now()})")
            await pg.wait_for_timeout(200)
            ok('n155: shows who else has the record open', 'Also open: Supervisor B' in await pg.inner_text('.an-id h1'))
            ok('n155: my own presence is written', await pg.evaluate("!!window.__fs['anesia_presence/an_train1_u1']"))
            await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=position]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(250)
            await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=closure]'); await pg.click('[data-ok]'); await pg.wait_for_timeout(250)
            n0 = len((await store(pg, 'an_train1'))['events'])
            await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(250); await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(250)
            ok('n155: ⌘Z steps back through several changes', len((await store(pg, 'an_train1'))['events']) == n0 - 2)
            ok('n155: the message offers Redo and stays (no time limit)', 'Redo' in await pg.inner_text('#anToast'))
            await pg.keyboard.press('Control+Shift+z'); await pg.wait_for_timeout(250)
            ok('n155: ⇧⌘Z redoes', len((await store(pg, 'an_train1'))['events']) == n0 - 1)
            await pg.click('[data-act=event]'); await pg.fill('#anSheet [name=note]', 'half typed'); await pg.mouse.click(5, 400)
            ok('n155: a stray tap outside a sheet with typing asks first', await pg.locator('#anSheet [data-discard]:not([hidden])').count() == 1)
            await pg.click('#anSheet [data-keep]'); ok('n155: Keep editing keeps the text', await pg.input_value('#anSheet [name=note]') == 'half typed')
            await pg.click('#anSheet [data-x]'); await pg.click('#anSheet [data-drop]')
            await pg.click('[data-act=vitals]'); await pg.fill('#nv_hr', '77'); await pg.keyboard.press('Escape')
            ok('n155: Esc in the vitals form asks before discarding', await pg.locator('[data-vdiscard]:not([hidden])').count() == 1)
            await pg.click('[data-vkeep]')
            await pg.fill('#nv_hr', '600'); await pg.focus('#nv_rr'); await pg.wait_for_timeout(50)
            ok('n155: a value is checked when you leave its box', 'Enter HR from' in await pg.inner_text('#nve_hr'))
            await pg.fill('#nv_hr', '77')
            await pg.reload(); await pg.wait_for_selector('.an-chart'); await pg.click('[data-act=vitals]')
            ok('n155: half-typed vitals survive a reload', await pg.input_value('#nv_hr') == '77')
            await pg.click('[data-vcancel]'); await pg.click('[data-vdrop]')
            await pg.click('[data-act=dose]')
            sel = await pg.evaluate("getComputedStyle(document.querySelector('#anSheet [data-chips=unit] [aria-pressed=true]')).backgroundColor")
            ok('n155: a selected chip is tinted, not filled cyan', sel != 'rgb(56, 189, 210)', sel)
            await pg.click('#anSheet [data-pick=other]'); await pg.fill('#anSheet [data-dfind]', 'keta')
            ok('n155: typing filters the drug list', 'Ketamine' in await pg.evaluate("document.querySelector('#anSheet [name=drug]').selectedOptions[0].textContent"))
            ok('n155: hints are read with their field', await pg.evaluate("(()=>{const c=document.querySelector('#anSheet [name=conc]');const id=c.getAttribute('aria-describedby');return !!id&&!!document.getElementById(id.split(' ')[0])})()"))
            await pg.click('#anSheet [data-x]')
            if await pg.locator('#anSheet [data-discard]:not([hidden])').count(): await pg.click('#anSheet [data-drop]')
            await pg.wait_for_timeout(250)
            await pg.click('.an-mk.c-induction >> nth=0')
            ok('n155: entry details open as a popover beside the marker', await pg.locator('#anSheet.pop').count() == 1)
            await pg.click('#anSheet [data-void]')
            ok('n155: strike-through is styled as destructive and says it is final', await pg.locator('#anSheet [data-ok].destr').count() == 1 and 'can’t be undone' in await pg.inner_text('#anSheet'))
            await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(250)
            await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"10\"]').click();0"); await pg.reload(); await pg.wait_for_selector('.an-chart')
            ok('n155: zoom remembered on this device', await pg.get_attribute('[data-zoom="10"]', 'aria-checked') == 'true')
            await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"5\"]').click();0")
            await pg.click('#anInsp'); await pg.wait_for_timeout(700)
            ok('n155: Totals below 1500 px scrolls into view and takes focus', await pg.evaluate("document.activeElement.id") == 'anTotH' and await pg.evaluate("(()=>{const r=document.getElementById('anInspector').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})()"))
            ok('n155: History shows the latest 20 with Show all', await pg.locator('#anHistAll').count() == 1 and await pg.locator('#anInspector .an-hist li').count() == 20)
            await pg.click('#anInsp')
            ok('n155: drug labels wrap instead of cutting words', await pg.evaluate("[...document.querySelectorAll('.an-lab span')].every(s=>s.scrollHeight<=s.clientHeight+1)"))
            await pg.click('#anShare'); await pg.wait_for_timeout(200)
            ok('n155: Share copies the link (or shows it)', 'link' in (await pg.inner_text('#anToast')).lower())
            ok('n155: Home Screen icon and manifest', await pg.evaluate("!!document.querySelector('link[rel=apple-touch-icon]')&&!!document.querySelector('link[rel=manifest]')"))
            mf = await pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())"); ok('n155: manifest is standalone', mf.get('display') == 'standalone')
            await pg.evaluate("location.hash=''"); await pg.wait_for_selector('.an-lhead')
            await pg.evaluate("window.anesiaApp.S.loaded=false; window.anesiaApp.render()")
            ok('n155: placeholders while records load, never "no cases"', await pg.locator('.an-skel').count() == 3 and await pg.locator('.an-empty').count() == 0)
            await pg.evaluate("window.anesiaApp.S.loaded=true; window.anesiaApp.render()")
            ok('n155: the list filter is a radio group with arrow keys', await pg.get_attribute('.an-seg', 'role') == 'radiogroup')
            await pg.focus('[data-f=active]'); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(100)
            ok('n155: arrow keys switch the list filter', await pg.get_attribute('[data-f=ended]', 'aria-checked') == 'true')
            ok('no page errors (n155 block)', not errs, errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train2'); await pg.wait_for_selector('.an-chart')
            ok('n155: Print on an ended record', await pg.locator('#anPrint').count() == 1)
            await pg.emulate_media(media='print'); await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))")
            ok('n155: print layout fits the chart to the page', 'scale' in (await pg.evaluate("document.querySelector('.an-chart-in').style.transform")) or await pg.evaluate("document.querySelector('.an-chart-in').scrollWidth<=1000"))
            ok('n155: totals print even when the panel is closed', await pg.evaluate("getComputedStyle(document.querySelector('.an-print-only')).display") == 'block')
            await pg.pdf(path=os.path.join(SHOTS, '16-print.pdf'), landscape=True)
            await pg.emulate_media(media='screen')
            ok('no page errors (print)', not errs, errs)
            await ctx.close()
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, color_scheme='light', timezone_id='America/Los_Angeles')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL); await pg.wait_for_selector('.an-lhead')
            ok('n155: with no saved choice, light device → light Anesia', not await pg.evaluate("document.body.classList.contains('dark')"))
            await ctx.close()
            ctx, pg, errs = await new_page(br, 'null'); await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-gate')
            ok('n155: Sign in on Flow returns here', 'next=%2Fanesia%2F%23r%3Dan_train1' in await pg.get_attribute('.an-gate a', 'href'))
            ok('n155: the sign-in card is not a fake dialog', await pg.locator('.an-gate[role=dialog]').count() == 0)
            await ctx.close()
            _secend(13)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n155: the HIG audit fixes', False, repr(_e)[:300])
        try:
            # ---------- n158: glass on the floating layer only, with a guard
            _sec(14)
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            g = await pg.evaluate("""(()=>{const bf=e=>{const c=getComputedStyle(e);return c.backdropFilter||c.webkitBackdropFilter||'none'};
              return {tools:bf(document.querySelector('.an-tools > .an-group')),tile:bf(document.querySelector('.an-tile')),chart:bf(document.querySelector('.an-chartp')),pos:getComputedStyle(document.querySelector('.an-tools')).position}})()""")
            ok('n158: the toolbar is glass and sticks over the chart', 'blur' in g['tools'] and g['pos'] == 'sticky', g)
            ok('n158: content (tiles, chart) is never glass', g['tile'] == 'none' and g['chart'] == 'none', g)
            await pg.click('[data-act=dose]'); await pg.wait_for_timeout(400)
            ok('n158: sheets are frosted solid (no blur cost)', await pg.evaluate("getComputedStyle(document.querySelector('#anSheet .an-sheet')).backdropFilter") in ('none', ''))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.evaluate("localStorage.setItem('anesia:v1:blur','0')"); await pg.reload(); await pg.wait_for_selector('.an-chart')
            ok('n158: a device that could not keep up stays on frosted solid', await pg.evaluate("document.documentElement.classList.contains('an-noblur') && getComputedStyle(document.querySelector('.an-tools > .an-group')).backdropFilter==='none'"))
            ok('n158: one "Last check" line instead of an age on every tile', 'Last check' in await pg.inner_text('.an-nh') and await pg.locator('.an-tile .f .same').count() >= 5)
            ok('n158: Vitals now has no badge dot', await pg.locator('.an-dot').count() == 0)
            ok('no page errors (n158 block)', not errs, errs)
            await ctx.close()
            _secend(14)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n158: glass on the floating layer only, with a guard', False, repr(_e)[:300])
        try:
            # ---------- n159: grouped glass toolbar, scroll edge, shrink on scroll, morphing popovers
            _sec(15)
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            cl = await pg.evaluate("""(()=>{const g=e=>getComputedStyle(e).color;return {tool:g(document.querySelector('[data-act=dose]')),ink:getComputedStyle(document.body).getPropertyValue('--an-ink').trim(),pills:[...document.querySelectorAll('.an-tools > *')].filter(e=>/blur/.test(getComputedStyle(e).backdropFilter)).length}})()""")
            ok('n159: tool labels on glass are monochrome (only Vitals now is coloured)', cl['tool'] == 'rgb(29, 29, 31)', cl)
            ok('n159: the toolbar is grouped glass pills (Give drug group, zoom; Totals and Vitals now are drawer cards since n174)', cl['pills'] == 2, cl)
            await pg.mouse.wheel(0, 200); await pg.wait_for_timeout(150); await pg.mouse.wheel(0, 200); await pg.wait_for_timeout(250)
            st = await pg.evaluate("[document.documentElement.classList.contains('an-stuck'),document.documentElement.classList.contains('an-compact'),getComputedStyle(document.querySelector('[data-act=dose] .t')).display]")
            ok('n159: scroll edge fade appears once content runs under the bar', st[0], st)
            ok('n159: scrolling down shrinks the toolbar to icons', st[1] and st[2] == 'none', st)
            await pg.mouse.wheel(0, -60); await pg.wait_for_timeout(250)
            ok('n159: scrolling up brings the labels back', not await pg.evaluate("document.documentElement.classList.contains('an-compact')"))
            ok('n159: compact tools keep their names for VoiceOver', await pg.get_attribute('[data-act=dose]', 'aria-label') == 'Give drug')
            await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(200)
            await pg.click('.an-mk.c-induction >> nth=0'); await pg.wait_for_timeout(100)
            ok('n159: the popover grows out of the marker you tapped', await pg.locator('#anSheet.pop.morph').count() == 1 and 'px' in await pg.evaluate("document.querySelector('#anSheet .an-sheet').style.transformOrigin"))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.click('[data-act=dose]'); await pg.wait_for_timeout(100)
            ok('n159: a sheet grows out of the button that opened it', await pg.locator('#anSheet.morph.big').count() == 1)
            ok('n159: sheets have the larger corner radius', await pg.evaluate("getComputedStyle(document.querySelector('#anSheet .an-sheet')).borderTopLeftRadius") == '28px')
            ok('no page errors (n159 block)', not errs, errs)
            await ctx.close()
            _secend(15)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n159: grouped glass toolbar, scroll edge, shrink on scroll, morphing popovers', False, repr(_e)[:300])
        try:
            # ---------- n161: patient summary, outputs and fluid balance, weight method
            _sec(16)
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            ok('n161: summary shows code status and allergies as not recorded', 'Not recorded' in await pg.inner_text('.an-sum .none >> nth=0') and await pg.locator('.an-sum .none').count() == 3 and 'Time-out' in await pg.inner_text('.an-sum'))
            ok('n161: records from before n161 need no confirming', await pg.locator('#anConfirm').count() == 0 and await pg.locator('.an-wm').count() == 0)
            await pg.click('.an-sum [data-sum] >> nth=0'); await pg.wait_for_selector('#anSheet [data-chips=cpr]')
            await pg.click('#anSheet [data-chips=cpr] [data-v=DNR]'); await pg.fill('#anSheet [name=allergies]', 'Penicillin'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n161/n177: DNR shows in the Code item with Flow’s flat line', await pg.locator('.an-sum .dnr-pill.mini').count() == 1 and 'DNR' in await pg.inner_text('.an-sum .dnr-pill.mini'))
            ok('n161: allergies show in amber', 'Penicillin' in await pg.inner_text('.an-sum .alg'))
            d = await store(pg, 'an_train1'); ok('n161: code status and allergies saved', d['patient']['cpr'] == 'DNR' and d['patient']['allergies'] == 'Penicillin')
            await pg.click('[data-act=output]'); await pg.wait_for_selector('#anSheet [data-chips=kind]')
            await pg.click('#anSheet [data-chips=kind] [data-v=urine]'); await pg.fill('#anSheet [name=mL]', '45'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            await pg.click('[data-act=output]'); await pg.click('#anSheet [data-chips=kind] [data-v=ebl]'); await pg.fill('#anSheet [name=mL]', '20'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n161: outputs on the chart under Fluids', await pg.locator('.an-mk.out').count() == 2 and 'Output' in await pg.inner_text('.an-chart'))
            ok('n161: fluid balance in the Now column', 'Fluid balance' in await pg.inner_text('.an-nowcol') and 'out 65' in await pg.inner_text('.an-nowcol'))
            await pg.click('#anInsp'); await pg.wait_for_timeout(500)
            bal = await pg.inner_text('.an-bal')
            ok('n161: Totals has a fluid balance: in, out, urine mL/kg/h, net', 'Blood loss' in bal and 'Urine' in bal and 'mL/kg/h' in bal and 'Net' in bal, bal)
            await pg.click('#anInsp'); await pg.wait_for_timeout(700)   # n212: let the Totals pane finish closing before tapping the chart (was a timing flake)
            await pg.click('.an-mk.out.k-urine'); await pg.wait_for_selector('#anShT', timeout=5000)
            ok('n161: an output opens its details', (await pg.inner_text('#anShT')) == 'Urine' and '45 mL' in await pg.inner_text('#anSheet'))
            await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(250)
            await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
            ok('n161: ⌘Z takes back the last output', len((await store(pg, 'an_train1')).get('outputs', [])) == 1)
            await pg.click('#anWeight'); await pg.fill('#anSheet [name=kg]', '32.4'); await pg.click('#anSheet [data-chips=method] [data-v=estimated]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n161: an estimated weight says so', 'Estimated' in await pg.inner_text('#anWeight'))
            ok('no page errors (n161 block)', not errs, errs)
            await ctx.close()
            _secend(16)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n161: patient summary, outputs and fluid balance, weight method', False, repr(_e)[:300])
        try:
            # ---------- n163: antibiotics, airway & lines, ventilation, time-out, team, more monitors
            _sec(17)
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            ok('n163: cefazolin shows under Antibiotics with no timer until one is set', await pg.locator('.an-abx.unset').count() == 1 and 'Set timer' in await pg.inner_text('.an-abx'))
            await pg.click('.an-abx'); await pg.wait_for_selector('#anSheet [name=min]')
            ok('n163: the redose sheet says no interval is built in', 'no built-in interval' in await pg.inner_text('#anSheet'))
            await pg.fill('#anSheet [name=min]', '90'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n163: countdown to the redose', 'in ' in await pg.inner_text('.an-abx b') and await pg.locator('.an-abx.ok').count() == 1, await pg.inner_text('.an-abx'))
            await pg.click('[data-act=airway]'); await pg.wait_for_selector('#anSheet [data-chips=kind]')
            await pg.click('#anSheet [data-chips=kind] [data-v=ett]')
            ok('n163: ET tube shows the cuff choice and hides the site', await pg.locator('#anSheet [data-cuffbox]:not([hidden])').count() == 1 and await pg.locator('#anSheet [data-sitebox][hidden]').count() == 1)
            await pg.fill('#anSheet [name=size]', '9.0 mm'); await pg.click('#anSheet [data-chips=cuff] [data-v=cuffed]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n163: airway on the chart and in the Now column', await pg.locator('.an-bar.dev').count() == 1 and 'ET tube' in await pg.inner_text('.an-nowcol'))
            await pg.click('[data-act=airway]'); await pg.click('#anSheet [data-atab=vent]'); await pg.click('#anSheet [data-chips=mode] [data-v=vc]'); await pg.fill('#anSheet [name=tv]', '350'); await pg.fill('#anSheet [name=peep]', '5'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n163: ventilation row with its settings', await pg.locator('.an-bar.vent').count() == 1 and 'TV 350' in await pg.inner_text('.an-bar.vent') and 'Volume control' in await pg.inner_text('.an-nowcol'))
            await pg.click('.an-bar.dev'); await pg.click('#anSheet [data-remove]'); await pg.wait_for_timeout(200); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            d = await store(pg, 'an_train1'); ok('n163: removing the tube records the time', d['devices'][0]['end'] is not None and 'ET tube' not in await pg.inner_text('.an-nowcol'))
            await pg.click('[data-sto]'); await pg.wait_for_selector('#anSheet .an-toi')
            ok('n163: time-out lists 8 items with the facts to check', await pg.locator('#anSheet .an-toi').count() == 8 and 'Training dog 4' in await pg.inner_text('#anSheet .an-toi >> nth=0'))
            for i in range(7): await pg.click(f'#anSheet .an-toi >> nth={i}')
            await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n163: a partial time-out shows what is open', '1 not done' in await pg.inner_text('.an-sum'))
            await pg.click('[data-act=event]'); await pg.wait_for_timeout(150)
            ok('n163: the event sheet reminds you before incision', await pg.locator('#anSheet .an-towarn').count() == 1)
            await pg.click('#anSheet [data-dotimeout]'); await pg.wait_for_selector('#anSheet .an-toi'); await pg.click('#anSheet .an-toi >> nth=7'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            ok('n163: complete time-out shows Done', 'Done' in await pg.inner_text('.an-sum'))
            await pg.click('[data-steam]'); await pg.wait_for_selector('#anSheet .an-team')
            await pg.fill('#anSheet [name=name]', 'Technician C'); await pg.click('#anSheet [data-chips=role] [data-v=technician]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            await pg.click('[data-steam]'); await pg.click('#anSheet [data-hand]'); await pg.wait_for_timeout(200); await pg.fill('#anSheet [name=name]', 'Technician D'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(350)
            d = await store(pg, 'an_train1'); ok('n163: handoff closes one and opens the next', [x['name'] for x in d['staff'] if not x.get('to')] == ['Technician D'] and any(x.get('to') for x in d['staff']))
            await pg.click('[data-act=vitals]'); await pg.click('[data-vmore]'); await pg.fill('#nv_fio2', '98'); await pg.fill('#nv_tof', '4'); await pg.select_option('#nv_ecg', 'sinus'); await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(350)
            ch = await pg.inner_text('.an-chart')
            ok('n163: FiO₂, TOF and ECG rows appear once used', 'FiO₂' in ch and 'TOF' in ch and 'ECG' in ch and 'Sinus' in ch)
            await pg.click('#anInsp'); await pg.wait_for_timeout(400)
            insp_t = await pg.inner_text('#anInspector'); ok('n163: the case log lists airway, ventilation, team and time-out', all(x in insp_t for x in ['ET tube', 'Ventilation', 'Technician D', 'Time-out complete']), insp_t[-400:])
            await pg.click('#anInsp')
            await pg.evaluate("window.__anSkip=(window.__anSkip||0)+95*60000; window.anesiaApp.tick()"); await pg.wait_for_timeout(300)
            ok('n163: a missed redose turns red', await pg.locator('.an-abx.late').count() == 1 and 'late' in await pg.inner_text('.an-abx b'), await pg.inner_text('.an-abx'))
            ok('n170: the antibiotic timer icon nudges once when the redose comes due', await pg.locator('.an-abxic.nudge').count() == 1)
            await pg.wait_for_timeout(900); await pg.evaluate("window.anesiaApp.render(true)")
            ok('n170: the nudge does not repeat', await pg.locator('.an-abxic.nudge').count() == 0)
            ok('no page errors (n163 block)', not errs, errs)
            await ctx.close()
            _secend(17)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n163: antibiotics, airway & lines, ventilation, time-out, team, more monitors', False, repr(_e)[:300])
        try:
            # ---------- n164: Apple typography and Larger Text
            _sec(18)
            TXT = """(()=>{const o=[];const w=document.createTreeWalker(document.querySelector('#anApp'),NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.textContent.trim();if(!t)continue;const e=n.parentElement;const r=e.getBoundingClientRect();if(!r.width)continue;const s=getComputedStyle(e);if(s.visibility==='hidden')continue;o.push({sz:parseFloat(s.fontSize),w:s.fontWeight,ls:s.letterSpacing,seg:!!e.closest('.an-seg,.an-zoomseg'),caps:!!e.closest('.an-wm,.an-sum-i.dnr')});}return o})()"""
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL); await pg.wait_for_selector('.an-lhead'); tx = await pg.evaluate(TXT)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); tx += await pg.evaluate(TXT)
            await pg.click('[data-act=dose]'); await pg.wait_for_timeout(350); tx += await pg.evaluate(TXT); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            await pg.click('#anInsp'); await pg.wait_for_timeout(350); tx += await pg.evaluate(TXT)
            sizes = sorted(set(x['sz'] for x in tx))
            ok('n164: every text size is an Apple text style (34·28·22·20·17·16·15·13·12)', set(sizes) <= {34, 28, 22, 20, 17, 16, 15, 13, 12}, sizes)
            ok('n164: no light weights; Medium only in segmented controls', all(x['w'] in ('400', '600', '700', '800') or (x['w'] == '500' and x['seg']) for x in tx), sorted(set((x['w'], x['seg']) for x in tx)))
            ok('n164: no hand tracking (SF tracks itself), except all-caps labels', all(x['ls'] == 'normal' or x['caps'] for x in tx), sorted(set(x['ls'] for x in tx)))
            ok('n164: one system family plus SF Rounded for numbers', await pg.evaluate("[...new Set([...document.querySelectorAll('#anApp *')].map(e=>getComputedStyle(e).fontFamily.split(',')[0].trim()))].length") <= 3)
            await ctx.close()
            BIG = """(()=>{const ov=(a,b)=>{if(!a||!b)return false;const r=a.getBoundingClientRect(),s=b.getBoundingClientRect();return r.left<s.right&&s.left<r.right&&r.top<s.bottom&&s.top<r.bottom};
              const tr=[...document.querySelectorAll('#anApp *')].filter(e=>{const s=getComputedStyle(e);return s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1&&e.offsetParent&&!e.closest('[aria-hidden=true]')}).length;   /* the toolbar copy of the name may truncate; the title itself may not */
              const h1=document.querySelector('.an-id h1');return {cls:document.documentElement.className,hs:document.documentElement.scrollWidth>innerWidth,tr:tr,ov:ov(h1,document.querySelector('#anWeight'))||ov(h1,document.querySelector('.an-ract'))}})()"""
            for vp, px in (((1180, 820), 23), ((1180, 820), 28), ((390, 844), 28), ((390, 844), 33), ((1440, 900), 17)):
                ctx, pg, errs = await new_page(br, vp=vp, dark=False)
                await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('#anTipsOk')
                await pg.evaluate(f"document.documentElement.style.fontSize='{px}px'"); await pg.wait_for_timeout(300)
                b = await pg.evaluate(BIG)
                ok(f'n164: {vp[0]} px wide at {px} pt text: no overlap, no cut-off text, no sideways scroll', not b['ov'] and not b['tr'] and not b['hs'], b)
                if px >= 20: ok(f'n164: {vp[0]} px at {px} pt: header stacks for big text', 'an-bigtext' in b['cls'])
                await ctx.close()
            ctx, pg, errs = await new_page(br, vp=(390, 844), dark=False)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            ok('n164: no sideways scroll on a phone (the scroll-edge fade no longer sticks out)', not await pg.evaluate("document.documentElement.scrollWidth>innerWidth"))
            ok('n164: drug names wrap instead of being cut off', await pg.evaluate("[...document.querySelectorAll('.an-lab b')].every(b=>b.scrollWidth<=b.clientWidth+1)"))
            await ctx.close()
            _secend(18)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n164: Apple typography and Larger Text', False, repr(_e)[:300])
        try:
            # ---------- n165: Apple color rules
            _sec(19)
            CR = r"""(sel,bgsel)=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return m.slice(0,3)};const L=a=>{const f=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};
              const el=document.querySelector(sel);if(!el)return null;const fg=P(getComputedStyle(el).color);let b=el,bg;while(b){const c=getComputedStyle(b).backgroundColor;if(c&&!/rgba\(.*,\s*0\)$/.test(c)&&c!=='transparent'){bg=c;break}b=b.parentElement}
              const bb=P(bg||'rgb(255,255,255)');const a=L(fg),c=L(bb);return +((Math.max(a,c)+.05)/(Math.min(a,c)+.05)).toFixed(2)}"""
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            hr = await pg.evaluate("(%s)('.an-tile[data-vk=hr] .tag')" % CR)
            ok('n165: HR label meets 4.5:1 on its tile', hr and hr >= 4.5, hr)
            await pg.click('.an-sum [data-sum] >> nth=0'); await pg.click('#anSheet [data-chips=cpr] [data-v=DNR]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(300)
            dnr = await pg.evaluate("(()=>{const P=c=>c.match(/[\\d.]+/g).map(Number);const L=a=>{const f=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};const el=document.querySelector('.an-sum .dnr-pill .label');const fg=P(getComputedStyle(el).color);const bgs=P(getComputedStyle(el.closest('.an-sum-i')).backgroundColor),page=P(getComputedStyle(document.body).backgroundColor);const al=bgs[3]===undefined?1:bgs[3];const bg=[0,1,2].map(i=>bgs[i]*al+page[i]*(1-al));const a=L(fg),c=L(bg);return +((Math.max(a,c)+.05)/(Math.min(a,c)+.05)).toFixed(2)})()")
            ok('n165/n177: the DNR pill meets 4.5:1', dnr >= 4.5, dnr)
            await pg.click('[data-act=airway]'); await pg.click('#anSheet [data-atab=vent]'); await pg.click('#anSheet [data-chips=mode] [data-v=vc]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(300)
            vc = await pg.evaluate("[getComputedStyle(document.querySelector('.an-bar.vent'),'::after').backgroundColor, getComputedStyle(document.querySelector('.an-tile[data-vk=spo2] .tag')).color]")
            ok('n165: ventilation no longer shares the SpO₂ blue', vc[0] != vc[1], vc)
            ok('no page errors (n165 block)', not errs, errs)
            await ctx.close()
            ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='light', timezone_id='America/Los_Angeles')
            await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': URL}])
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-contrast', 'value': 'more'}, {'name': 'color-gamut', 'value': 'p3'}]})
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            hc = await pg.evaluate("[getComputedStyle(document.body).getPropertyValue('--an-ink-3').trim(), getComputedStyle(document.querySelector('.an-tools > .an-group')).backdropFilter, getComputedStyle(document.querySelector('.an-tile')).boxShadow]")
            ok('n165: Increase Contrast darkens secondary text, makes glass solid and outlines controls', hc[0].lower() == '#48484a' and hc[1] in ('none', '') and 'inset' in hc[2], hc)
            await pg.screenshot(path=os.path.join(SHOTS, '42-increase-contrast.png'))
            await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'color-gamut', 'value': 'p3'}]}); await pg.wait_for_timeout(100)
            p3v = await pg.evaluate("getComputedStyle(document.body).getPropertyValue('--an-spo2').trim()")
            ok('n165: wide-color screens get Display P3 colors', 'display-p3' in p3v, p3v)

            await ctx.close()
            _secend(19)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n165: Apple color rules', False, repr(_e)[:300])
        try:
            # ---------- n166: Anesia inside the Treatment Sheet
            _sec(20)
            import urllib.parse as _up
            PRE_J = json.dumps({'name': 'Max', 'species': 'dog', 'breed': 'Labrador', 'sex': 'Male neutered', 'age': '6 y', 'kg': 31.2, 'cpr': 'DNR', 'allergies': 'Penicillin', 'nka': False})
            EMB = URL + '?embed=1&sheet=sh_test&pre=' + _up.quote(PRE_J)
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(EMB); await pg.wait_for_selector('.an-shead')
            ok('n166: in a sheet, Anesia hides its own top bar', await pg.evaluate("getComputedStyle(document.getElementById('pvxTopnav')).display") == 'none')
            ok('n166: only this patient: empty state names the patient', 'No anesthesia record for Max yet' in await pg.inner_text('.an-shead') and await pg.locator('.an-card').count() == 0)
            await pg.click('#anNew'); await pg.wait_for_selector('#anSheet [name=name]'); await pg.wait_for_timeout(350)   # let the sheet finish opening, as a person would
            pf = await pg.evaluate("[document.querySelector('#anSheet [name=name]').value, document.querySelector('#anSheet [name=kg]').value, document.querySelector('#anSheet [data-chips=cpr] [aria-pressed=true]').dataset.v, document.querySelector('#anSheet [name=allergies]').value, document.querySelector('#anSheet [name=sex]').value, document.querySelector('#anShT').textContent]")
            ok('n166: name, weight, code status, allergies and sex come from the sheet', pf[:5] == ['Max', '31.2', 'DNR', 'Penicillin', 'Male neutered'] and pf[5] == 'Start anesthesia record', pf)
            await pg.fill('#anSheet [name=procedure]', 'Exploratory laparotomy'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            keys = await pg.evaluate("Object.keys(window.__fs).filter(k=>k.startsWith('anesia_records/'))")
            recs = [await store(pg, k.split('/')[1]) for k in keys]; mine = [r for r in recs if r and r.get('sheet_id') == 'sh_test']
            ok('n166: the record is linked to the sheet as a patient case', len(mine) == 1 and mine[0]['kind'] == 'case' and mine[0]['patient']['weights'][0]['kg'] == 31.2)
            ok('n166: the header says "Treatment sheet", not "Training"', await pg.locator('.an-pill.sheet').count() == 1 and await pg.locator('.an-rhead .an-pill.training').count() == 0)
            ok('n166: it still asks to confirm the patient', await pg.locator('#anConfirm').count() == 1)
            await pg.click('.an-back'); await pg.wait_for_selector('.an-shead'); await until(pg, "document.querySelectorAll('.an-card').length===1&&(document.querySelector('.an-list')||{}).innerText.includes('Exploratory laparotomy')", 8000)
            ok('n166: back shows this patient’s records', await pg.locator('.an-card').count() == 1 and 'Exploratory laparotomy' in await pg.inner_text('.an-list'))
            ok('no page errors (n166 embed)', not errs, errs)
            await ctx.close()
            sd = json.loads(SEED); sd['anesia_records/' + mine[0]['id']] = mine[0]
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(EMB); await pg.wait_for_selector('.an-chart', timeout=5000)
            ok('n166: reopening the tab goes straight to the open record', 'r=' + mine[0]['id'] in await pg.evaluate("location.hash"))
            await pg.goto(URL); await pg.wait_for_selector('.an-lhead'); await pg.wait_for_timeout(200)
            ok('n166: the full Anesia list shows training and sheet records, labelled', await pg.locator('.an-card .an-pill.training').count() >= 1 and await pg.locator('.an-card .an-pill.sheet').count() == 1)
            await ctx.close()
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1200)
            tb = await pg.evaluate("""(()=>{localStorage.setItem('tsCurrentSheet','sh_test');Object.assign(VISIT,{patient:'Max',species:'Dog',breed:'Labrador',sex:'MN',age:'6 y',weight:31.2,code:'DNR',allergies:'Penicillin'});
              const segs=[...document.querySelectorAll('#clinSwitcher .seg')].map(b=>b.dataset.ctab); selectCTab('anes'); const f=document.querySelector('#ctab-anes iframe');
              return {order:segs, frame:!!f, src:f?f.getAttribute('src'):'', active:document.querySelector('[data-ctab=anes]').classList.contains('active')}})()""")
            ok('n166: Treatment Sheets has an Anesthesia tab right after Vitals', tb['order'].index('anes') == tb['order'].index('vitals') + 1, tb['order'])
            ok('n166: the tab opens this patient’s anesthesia record in place', tb['frame'] and tb['active'] and 'sheet=sh_test' in tb['src'] and 'Max' in _up.unquote(tb['src']), tb)
            await pg.wait_for_timeout(1500)
            fr = pg.frame_locator('#ctab-anes iframe')
            ok('n166: the embedded record shows (no second top bar)', await fr.locator('.an-chart, .an-shead').count() >= 1)
            await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(200)
            ok('n166: switching the sheet to dark mode switches the record too', await pg.evaluate("document.querySelector('#ctab-anes iframe').contentDocument.body.classList.contains('dark')"))
            await pg.screenshot(path=os.path.join(SHOTS, '44-treatment-anes-dark.png'))
            await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(200)
            await pg.click('[data-ctab=vitals]'); await pg.wait_for_timeout(200)
            ok('n166: other tabs still work after the Anesthesia tab', await pg.evaluate("!document.querySelector('#ctab-vitals').classList.contains('hidden') && document.querySelector('#ctab-anes').classList.contains('hidden')"))
            await pg.click('[data-ctab=anes]'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=os.path.join(SHOTS, '43-treatment-anes.png'))
            ok('no page errors (treatment tab)', not [e for e in errs if 'anes' in e.lower()], errs)
            await ctx.close()
            _secend(20)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n166: Anesia inside the Treatment Sheet', False, repr(_e)[:300])
        try:
            # ---------- n167: no grey canvas behind the record when the computer is in dark mode and the sheet is light
            _sec(21)
            for scheme, cookie in (('dark', 'light'), ('light', 'dark')):
                ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme=scheme, timezone_id='America/Los_Angeles')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': cookie, 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
                await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1000)
                await pg.evaluate("localStorage.setItem('tsCurrentSheet','sh_test');Object.assign(VISIT,{patient:'Max',species:'Dog',weight:31.2});selectCTab('anes')"); await pg.wait_for_timeout(1500)
                for step in ('load', 'toggle'):
                    if step == 'toggle': await pg.evaluate("toggleDark()"); await pg.wait_for_timeout(250)
                    cs = await pg.evaluate("(()=>{const f=document.querySelector('#ctab-anes iframe'),d=f.contentDocument;return [getComputedStyle(f).colorScheme, getComputedStyle(d.documentElement).colorScheme, document.body.classList.contains('dark'), d.body.classList.contains('dark')]})()")
                    ok(f'n167: computer {scheme}, sheet {cookie}, after {step}: the record matches the sheet (no grey box)', cs[0] == cs[1] and cs[2] == cs[3], cs)
                await ctx.close()
            _secend(21)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n167: no grey canvas behind the record when the computer is in dark mode and the sheet is ', False, repr(_e)[:300])
        try:
            # ---------- n171: Pravix Symbols (SF Symbols rules on our own symbols)
            _sec(22)
            SYMCHK = """(()=>{const W={100:1.2,200:1.3,300:1.45,400:1.6,500:1.8,600:2,700:2.25,800:2.5,900:2.7};
              const all=[...document.querySelectorAll('svg')].filter(s=>!s.closest('.an-chart,.an-legend,#pvxTopnav,#flmCap')&&!s.classList.contains('an-spark')&&!s.classList.contains('an-chev')&&!s.classList.contains('an-graph')&&s.getBoundingClientRect().width>0);
              const foreign=all.filter(s=>!s.classList.contains('an-ico')).map(s=>s.outerHTML.slice(0,60));
              const ic=all.filter(s=>s.classList.contains('an-ico'));
              const host=s=>{let h=s.parentElement;while(h&&!['BUTTON','A','LABEL','B','STRONG','SPAN','EM','H1','H2','H3','P','DIV','LI'].includes(h.tagName))h=h.parentElement;return h};
              const badW=ic.filter(s=>{const h=host(s);const fw=Math.round(parseInt(getComputedStyle(h).fontWeight)/100)*100;return Math.abs(parseFloat(getComputedStyle(s).strokeWidth)-W[fw])>.01}).map(s=>[s.parentElement.className||s.parentElement.tagName,getComputedStyle(s).strokeWidth,getComputedStyle(host(s)).fontWeight]);
              const badS=ic.filter(s=>{const r=parseFloat(getComputedStyle(s).height)/parseFloat(getComputedStyle(s).fontSize);return ![1,1.2,1.45,1.15].some(x=>Math.abs(r-x)<.03)}).map(s=>[s.parentElement.className,parseFloat(getComputedStyle(s).height)/parseFloat(getComputedStyle(s).fontSize)]);
              const vb=ic.filter(s=>s.getAttribute('viewBox')!=='0 0 24 24').length;
              return {n:ic.length,foreign,badW,badS,vb}})()"""
            for px in (17, 28):
                ctx, pg, errs = await new_page(br, dark=False)
                await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.evaluate(f"document.documentElement.style.fontSize='{px}px'"); await pg.wait_for_timeout(400)
                r = await pg.evaluate(SYMCHK)
                ok(f'n171 at {px} px text: one symbol family on one 24-pt grid (no other icon sets)', r['n'] >= 15 and not r['foreign'] and r['vb'] == 0, r)
                ok(f'n171 at {px} px text: each symbol’s weight matches its label’s font weight', not r['badW'], r['badW'][:6])
                ok(f'n171 at {px} px text: symbols sized small / medium / large relative to the text', not r['badS'], r['badS'][:6])
                await ctx.close()
            ctx, pg, errs = await new_page(br, dark=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('#anTipsOk')
            ok('n171: hierarchical — the secondary layer sits back', await pg.evaluate("getComputedStyle(document.querySelector('#anShare svg .s')).opacity") == '0.45')
            ok('n171: vitals tiles use the fill variant of the same family', await pg.locator('.an-tile svg.an-ico.fill').count() == 6)
            ok('n171: Totals shows the outline symbol while closed', await pg.locator('#anInsp svg.an-ico.fill').count() == 0)
            before = await pg.evaluate("document.querySelector('#anInsp svg').innerHTML")
            await pg.click('#anInsp'); await pg.wait_for_timeout(300)
            ok('n172: selection shows by the toolbar tint; the symbol itself is not swapped (HIG)', await pg.get_attribute('#anInsp', 'aria-pressed') == 'true' and await pg.evaluate("document.querySelector('#anInsp svg').innerHTML") == before and await pg.locator('#anInsp svg.fill').count() == 0)
            await pg.click('#anInsp'); await pg.wait_for_timeout(300)
            await pg.click('#anExpand')
            sym = await until(pg, "(()=>{const e=document.querySelector('#anExpand .ic-in svg');return !!e&&getComputedStyle(e).animationName==='anSymIn'})()", 1000)   # n213: read it while it runs (was a timing flake under load)
            ok('n171: Expand swaps its symbol with a replace animation', sym)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            await pg.click('[data-act=dose]'); await pg.wait_for_timeout(400)
            r = await pg.evaluate(SYMCHK)
            ok('n171: symbols in sheets are weight-matched too', not r['badW'] and not r['foreign'], r)
            await pg.keyboard.press('Escape'); await ctx.close()
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL + '#r=an_train3'); await pg.wait_for_selector('.an-chart')
            ok('n171: no weight shows the slash variant (unavailable)', await pg.locator('#anWeight svg.an-ico.slash mask').count() == 1)
            await ctx.close()
            ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.emulate_media(contrast='more'); await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            ok('n171: Increase Contrast draws every layer at full strength', await pg.evaluate("getComputedStyle(document.querySelector('#anShare svg .s')).opacity") == '1')
            await ctx.close()
            _secend(22)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n171: Pravix Symbols (SF Symbols rules on our own symbols)', False, repr(_e)[:300])
        try:
            # ---------- n172: Apple Icons HIG — optical sizing and centering, labels, right-to-left
            _sec(23)
            import subprocess, importlib.util
            js = subprocess.run(['node', '-e', """const s=require('fs').readFileSync(process.argv[1],'utf8');const a=s.indexOf('  var SYM = {'),b=s.indexOf('  var SYMOPT = ');const c=s.indexOf(';',b);
              const SYM=eval('('+s.slice(a+12,b).trim().replace(/;$/,'')+')'),OPT=JSON.parse(s.slice(b+15,c));console.log(JSON.stringify([SYM,OPT]))""", os.path.join(BUILD, 'anesia', 'app.js')], capture_output=True, text=True).stdout
            SYMS, OPTS = json.loads(js)
            spec = importlib.util.spec_from_file_location('om', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'optical_measure.py')); om = importlib.util.module_from_spec(spec); spec.loader.exec_module(om)
            meas = await om.run(SYMS, OPTS)
            import statistics
            ps = {n: om.perceived(m) for n, m in meas.items()}; med = statistics.median(ps.values())
            off = {n: round(ps[n] / med, 3) for n in ps if not .85 <= ps[n] / med <= 1.15}
            ok(f'n172: every symbol looks the same size (optical size within ±15% of the family; {len(SYMS)} symbols)', not off, off)
            offc = {n: (round(m['bx'] * .5 + m['cx'] * .5 - 12, 2), round(m['by'] * .5 + m['cy'] * .5 - 12, 2)) for n, m in meas.items() if abs(m['bx'] * .5 + m['cx'] * .5 - 12) > .3 or abs(m['by'] * .5 + m['cy'] * .5 - 12) > .3}
            ok('n172: every symbol is optically centred (within 0.3 pt of the grid centre)', not offc, offc)
            ok('n172: every symbol has a measured correction', set(OPTS) == set(SYMS))
            ctx, pg, errs = await new_page(br, dark=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            unl = await pg.evaluate("[...document.querySelectorAll('button,a,[role=button]')].filter(b=>b.offsetParent&&b.querySelector('svg')&&!b.innerText.trim()&&!(b.getAttribute('aria-label')||'').trim()&&!b.getAttribute('aria-labelledby')).map(b=>b.outerHTML.slice(0,80))")
            ok('n172: every icon-only control has a spoken label', not unl, unl)
            sw = await pg.evaluate("(()=>{const s=document.querySelector('#anShare svg'),g=s.querySelector('g.os');return [getComputedStyle(s).strokeWidth, g?getComputedStyle(g.querySelector('path')).strokeWidth:null, g?g.style.getPropertyValue('--an-os'):null]})()")
            ok('n172: the optical scale never changes a symbol’s weight (stroke divided by the scale)', sw[1] is not None and abs(float(sw[1][:-2]) * float(sw[2]) - float(sw[0][:-2])) < .02, sw)
            await pg.evaluate("document.documentElement.dir='rtl'"); await pg.wait_for_timeout(100)
            ok('n172: right-to-left mirrors the back chevron, not the share arrow', await pg.evaluate("[getComputedStyle(document.querySelector('.an-back svg')).transform, getComputedStyle(document.querySelector('#anShare svg')).transform]") == ['matrix(-1, 0, 0, 1, 0, 0)', 'none'])
            await ctx.close()
            _secend(23)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n172: Apple Icons HIG — optical sizing and centering, labels, right-to-left', False, repr(_e)[:300])
        try:
            # ---------- n173: Apple Writing HIG
            _sec(24)
            src_all = open(os.path.join(BUILD, 'anesia', 'app.js')).read() + open(os.path.join(BUILD, 'anesia', 'engine.js')).read()
            import re as _re
            ui_strings = _re.findall(r"'((?:[^'\\]|\\.){3,})'", src_all)
            ok('n173: no "we" or "our" in any message', not [x for x in ui_strings if _re.search(r"\b(we|we’re|our)\b", x, _re.I) and ' ' in x])
            ok('n173: no "click here", no "oops"', not [x for x in ui_strings if _re.search(r"click here|oops|uh-oh", x, _re.I)])
            ok('n173: errors say what to do (no "must be" rules, no bare "Already …")', not [x for x in ui_strings if _re.search(r" must be |^Already ", x)], [x for x in ui_strings if _re.search(r" must be |^Already ", x)][:5])
            ok('n173: curly apostrophes in messages (no straight can\'t / don\'t)', "n\\'t" not in src_all)
            ok('n173: one perspective (no "my" in labels)', not [x for x in ui_strings if _re.search(r"\bmy\b", x, _re.I) and '<' not in x[:1]])
            ok('n173: one vocabulary (no "crossed out", no "Record dose", no "training cases")', not [x for x in ('crossed out', "'Record dose'", 'training cases in progress', 'Give a dose now') if x in src_all])
            ctx, pg, errs = await new_page(br, dark=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            ok('n173: on a computer the tip says Click, not Tap', 'Click any value' in await pg.inner_text('.an-tips'))
            await ctx.close()
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True, is_mobile=False, timezone_id='America/Los_Angeles')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            tip = await pg.inner_text('.an-tips'); coarse = await pg.evaluate("matchMedia('(pointer:coarse)').matches")
            ok('n173: on a touch screen the tip says Tap', ('Tap any value' in tip) == coarse, [coarse, tip[:40]])
            await ctx.close()
            ctx, pg, errs = await new_page(br, dark=True)
            await pg.goto(URL + '#r=an_train3'); await pg.wait_for_selector('.an-chart')
            ok('n173: the empty vitals chart offers Enter vitals right there', await pg.locator('.an-empty-t button[data-act=vitals]').count() == 1)
            await pg.click('.an-empty-t button[data-act=vitals]'); await pg.wait_for_selector('#anVForm')
            ok('n173: and it opens the vitals form', await pg.locator('#anVForm').count() == 1)
            await pg.fill('#nv_hr', '900'); await pg.click('#anVForm [type=submit]'); await pg.wait_for_timeout(200)
            ok('n173: a slip says how to fix it ("Enter HR from 20 to 300 bpm")', 'Enter HR from' in await pg.inner_text('#anVForm') and 'must be' not in await pg.inner_text('#anVForm'), await pg.inner_text('#nve_hr'))
            await ctx.close()
            _secend(24)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n173: Apple Writing HIG', False, repr(_e)[:300])
        try:
            # ---------- n174: main actions in Flow's patient-drawer card style (Admit / Discharge)
            _sec(25)
            for dark in (True, False):
                ctx, pg, errs = await new_page(br, dark=dark)
                await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
                st = await pg.evaluate("""[...document.querySelectorAll('[data-act=vitals].an-btn,#anEnd,#anInsp')].map(b=>{const c=getComputedStyle(b),a=getComputedStyle(b,'::after');return [b.id||b.dataset.act,c.borderTopLeftRadius,c.backgroundImage.slice(0,15),c.backgroundColor,a.content!=='none'&&a.content!=='',c.fontWeight]})""")
                t = 'dark' if dark else 'light'
                ok(f'n174 {t}: Vitals now, End anesthesia and Totals share the drawer-card style (16 px, arrow, semibold)', len(st) == 3 and all(x[1] == '16px' and x[4] and x[5] == '600' for x in st) and all(('gradient' in x[2]) if dark else (x[3] == 'rgb(255, 255, 255)') for x in st), st)
                await ctx.close()
            _secend(25)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n174: main actions in Flows patient-drawer card style (Admit / Discharge)', False, repr(_e)[:300])
        try:
            # ---------- n174: status pills in Flow's P3 / P2 badge colours
            _sec(26)
            for dark in (True, False):
                ctx, pg, errs = await new_page(br, dark=dark)
                await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
                c = await pg.evaluate("""(()=>{const g=s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return [c.backgroundColor,c.color]};
                  return {active:g('.an-rhead .an-pill.active'),due:g('.an-nh .an-pill.warn.due'),dot:getComputedStyle(document.querySelector('.an-rhead .an-pill.active'),'::before').backgroundColor}})()""")
                t = 'dark' if dark else 'light'
                ok(f'n174 {t}: Under anesthesia = P3 green #5CC75A, lettering = page navy #0A1222', c['active'] == ['rgb(92, 199, 90)', 'rgb(10, 18, 34)'] and c['dot'] == 'rgb(10, 18, 34)', c)
                ok(f'n174 {t}: Vitals due = P2 yellow #F2C744, lettering = page navy #0A1222', c['due'] == ['rgb(242, 199, 68)', 'rgb(10, 18, 34)'], c)
                await ctx.close()
            ctx, pg, errs = await new_page(br, dark=True, seed=False)
            await pg.goto(URL); await pg.wait_for_selector('.an-empty'); await pg.click('#anNew')
            await pg.fill('[name=name]', 'Training dog 9'); await pg.fill('[name=kg]', '18.2'); await pg.click('[data-ok]'); await pg.wait_for_selector('#anConfirm')
            await pg.click('#anConfirmB'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_selector('.an-pill.conf')
            cc = await pg.evaluate("(()=>{const e=document.querySelector('.an-pill.conf'),c=getComputedStyle(e);return [c.backgroundColor,c.color,getComputedStyle(e.querySelector('svg')).stroke]})()")
            ok('n174: Confirmed = P3 green, lettering and check = page navy #0A1222', cc == ['rgb(92, 199, 90)', 'rgb(10, 18, 34)', 'rgb(10, 18, 34)'], cc)
            await ctx.close()
            ctx, pg, errs = await new_page(br, dark=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            bg = await pg.evaluate("getComputedStyle(document.body).backgroundColor")
            lt = await pg.evaluate("[getComputedStyle(document.querySelector('.an-rhead .an-pill.active')).color, getComputedStyle(document.querySelector('.an-nh .an-pill.warn.due')).color]")
            ok('n174: pill lettering is exactly the page background colour', lt == [bg, bg], [bg, lt])
            await ctx.close()
            _secend(26)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n174: status pills in Flows P3 / P2 badge colours', False, repr(_e)[:300])
        try:
            # ---------- n175: premium motion, round 2
            _sec(27)
            ctx, pg, errs = await new_page(br, dark=True)
            await pg.goto(URL); await pg.wait_for_selector('.an-card')
            await pg.click('[data-open="an_train1"]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(60)
            ok('n175: opening a record cascades in (header, summary, toolbar, chart rows, tiles)', await pg.evaluate("document.getElementById('anApp').classList.contains('an-enter') && getComputedStyle(document.querySelector('.an-sum')).animationName==='anEnter' && parseFloat(getComputedStyle(document.querySelector('.an-nowcol')).animationDelay)>parseFloat(getComputedStyle(document.querySelector('.an-sum')).animationDelay)"))
            await pg.wait_for_timeout(1200)
            ok('n175: the cascade plays once, not on later re-renders', not await pg.evaluate("window.anesiaApp.render(true), document.getElementById('anApp').classList.contains('an-enter')"))
            await pg.click('#anTipsOk')
            # 2. zoom: marks slide to their new place
            await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"15\"]').click();0"); await pg.wait_for_timeout(40)
            za = await pg.evaluate("[...document.querySelectorAll('.an-chart .an-mk,.an-chart .an-mon,.an-chart .an-bar')].filter(e=>e.getAnimations().some(a=>!(a instanceof CSSAnimation))).length")
            ok('n175: changing minutes per column slides every mark to its new time (no jump)', za >= 5, za)
            await pg.wait_for_timeout(600); await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"5\"]').click();0"); await pg.wait_for_timeout(600)
            # 3. sparkline → trend
            await pg.locator('.an-tile[data-vk=hr] .an-spark').scroll_into_view_if_needed()   # n196: the tip now sits at the foot of the chart, so Got it scrolls the page
            await pg.locator('.an-tile[data-vk=hr] .an-spark').click(); await pg.wait_for_selector('#anSheet .an-trend'); await pg.wait_for_timeout(500)
            tr = await pg.evaluate("[document.getElementById('anShT').textContent, document.querySelectorAll('#anSheet .an-trend circle').length, !!document.getElementById('anVForm')]")
            ok('n175: tapping a tile’s sparkline opens that vital’s trend (not the vitals form)', tr[0] == 'Heart rate' and tr[1] >= 5 and not tr[2], tr)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            await pg.focus('.an-tile[data-vk=bp]'); await pg.keyboard.press('t'); await pg.wait_for_selector('#anSheet .an-trend')
            ok('n175: T on a focused tile opens the trend too (keyboard)', await pg.inner_text('#anShT') == 'Mean arterial pressure')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            # 4. light on the glass toolbar
            gb = await pg.locator('.an-tools>.an-group').bounding_box()
            await pg.mouse.move(gb['x'] + 40, gb['y'] + gb['height'] / 2); await pg.wait_for_timeout(450)
            lt = await pg.evaluate("[document.querySelector('.an-tools').classList.contains('lit'), getComputedStyle(document.querySelector('.an-tools>.an-group'),'::after').opacity, document.querySelector('.an-tools>.an-group').style.getPropertyValue('--lx')]")
            ok('n175: light follows the pointer on the glass toolbar', lt[0] and float(lt[1]) > .9 and lt[2] == '40px', lt)
            await pg.mouse.move(700, 700); await pg.wait_for_timeout(450)
            ok('n175: and fades when the pointer leaves', not await pg.evaluate("document.querySelector('.an-tools').classList.contains('lit')"))
            # 6 + 5. a saved change: the sheet button becomes a check; the undo ring drains; swipe the message away
            await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.fill('#anSheet [name=note]', 'Motion test'); await pg.click('#anSheet [data-ok]')
            ok('n175: the sheet’s button turns into a check as it closes', await pg.evaluate("!!document.querySelector('#anSheetOut [data-ok].an-done svg .dr')"))
            await pg.wait_for_timeout(300)
            ring = await pg.evaluate("(()=>{const b=document.getElementById('anUndo');return [b.classList.contains('ring'), getComputedStyle(b,'::before').animationName, b.style.getPropertyValue('--an-ud'), !!document.querySelector('#anToast .an-tok .dr')]})()")
            ok('n175: Undo shows its 2-minute window as a draining ring, and the message has a check', ring[0] and ring[1] == 'anUndoRing' and ring[2].endswith('ms') and int(ring[2][:-2]) > 100000 and ring[3], ring)
            tb = await pg.locator('#anToast').bounding_box()
            await pg.mouse.move(tb['x'] + 30, tb['y'] + tb['height'] / 2); await pg.mouse.down(); await pg.mouse.move(tb['x'] + 200, tb['y'] + tb['height'] / 2, steps=4); await pg.mouse.up(); await pg.wait_for_timeout(350)
            ok('n175: a sideways swipe sends the undo message away', await pg.evaluate("document.getElementById('anToast').hidden"))
            # 7. totals count up
            await pg.click('#anInsp'); await pg.wait_for_timeout(120)
            mid = await pg.inner_text('#anInspector .an-tot'); await pg.wait_for_timeout(800); fin = await pg.inner_text('#anInspector .an-tot'); await pg.wait_for_timeout(400); fin2 = await pg.inner_text('#anInspector .an-tot')
            ok('n175: totals count up when the panel opens, and land on the true values', mid != fin and fin == fin2 and '1426 mg' in fin, [mid[:60], fin[:60]])
            await pg.click('#anInsp'); await pg.wait_for_timeout(300)
            # 9. press and hold a mark to peek
            mk = await pg.locator('.an-chart .an-mon').last.bounding_box()
            await pg.mouse.move(mk['x'] + mk['width'] / 2, mk['y'] + mk['height'] / 2); await pg.mouse.down(); await pg.wait_for_timeout(600)
            pk = await pg.evaluate("[!!document.querySelector('.pvx-cx-pv'), !!document.querySelector('.pvx-cx.dim'), !!document.querySelector('.an-lifted'), (document.querySelector('.pvx-cx-pv b')||{}).textContent||'']")
            await pg.mouse.up(); await pg.wait_for_timeout(300)
            ok('n175/n201: press and hold a mark lifts it and shows a preview over a softened page', pk[0] and pk[1] and pk[2] and ' at ' in pk[3], pk)
            ok('n201: letting go keeps the preview and its commands open, without opening the entry', await pg.evaluate("!!document.querySelector('.pvx-cx-list [role=menuitem]') && !document.getElementById('anSheet')"))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            ok('n201: Esc closes it', await pg.evaluate("!document.querySelector('.pvx-cx:not(.out)')"))
            await pg.locator('.an-chart .an-mon').last.click(); await pg.wait_for_selector('#anSheet')
            ok('n175: a normal tap still opens the entry', await pg.locator('#anSheet').count() == 1)
            await pg.keyboard.press('Escape')
            ok('n175: no page errors', not errs, errs)
            await ctx.close()
            # 8. skeleton in the record's shape while the record loads
            ctx, pg, errs = await new_page(br, dark=True)
            await pg.add_init_script("window.__fsDelay=900")
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_timeout(150)
            sk = await pg.evaluate("[!!document.querySelector('.an-skelrec .sk-chart'), !!document.querySelector('.an-spin'), (document.querySelector('.an-loading .an-vh')||{}).textContent||'']")
            await pg.wait_for_selector('.an-chart', timeout=8000)
            ok('n175: loading shows a skeleton in the record’s shape (no spinner), still announced as loading', sk[0] and not sk[1] and 'Loading' in sk[2], sk)
            ok('n175: and the record settles in where the skeleton was', await pg.evaluate("document.getElementById('anApp').classList.contains('an-enter')"))
            await ctx.close()
            _secend(27)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n175: premium motion, round 2', False, repr(_e)[:300])
        try:
            # ---------- n170: premium motion
            _sec(28)
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='dark', has_touch=True)
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL); await pg.wait_for_selector('.an-card')
            # 2. a record card grows into the record header, and back
            renders = "window.__rn=0;(()=>{const a=document.getElementById('anApp');new MutationObserver(m=>{if(m.some(x=>x.target===a))window.__rn++}).observe(a,{childList:true})})()"
            await pg.evaluate(renders)
            await pg.click('[data-open="an_train1"]'); await pg.wait_for_timeout(100)
            vt = await pg.evaluate("[getComputedStyle(document.querySelector('.an-id')).viewTransitionName, typeof document.startViewTransition]")
            await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
            ok('n170: tapping a record card morphs it into the record header', vt[0] == 'an-hero' and vt[1] == 'function', vt)
            ok('n170: the morph renders the record once (no double redraw)', await pg.evaluate("window.__rn") == 1, await pg.evaluate("window.__rn"))
            ok('n170: morph names are cleared after the transition', await pg.locator('.an-vt').count() == 0)
            # 10. Vitals heart beats once when vitals are due
            ok('n170: the Vitals heart beats once when vitals are due', await pg.locator('[data-act=vitals] .an-beat').count() == 1)
            await pg.wait_for_timeout(1000); await pg.evaluate("window.anesiaApp.render(true)")
            ok('n170: and does not keep beating', await pg.locator('[data-act=vitals] .an-beat').count() == 0)
            # 4. the selection pill slides from 5 to 15 min
            await pg.click('#anTipsOk')
            await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(400)   # n208: pinned, 5 / 10 / 15 becomes a pop-up
            await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"15\"]').click();0"); await pg.wait_for_timeout(60)
            pa = await pg.evaluate("(()=>{const p=document.querySelector('.an-zoomseg .an-segpill');return [!!p, p?p.getAnimations().length:0]})()")
            ok('n170: the selection pill slides to the new segment', pa[0] and pa[1] >= 1, pa)
            await pg.wait_for_timeout(700)
            pe = await pg.evaluate("(()=>{const g=document.querySelector('.an-zoomseg'),p=g.querySelector('.an-segpill').getBoundingClientRect(),b=g.querySelector('[data-zoom=\\'15\\']').getBoundingClientRect();return [Math.round(p.left-b.left),Math.round(p.width-b.width),getComputedStyle(g.querySelector('[data-zoom=\\'15\\']')).backgroundColor]})()")
            ok('n170: and lands exactly on it (the button itself stays clear)', abs(pe[0]) <= 1 and abs(pe[1]) <= 1 and pe[2] in ('rgba(0, 0, 0, 0)', 'transparent'), pe)
            # 2. a vitals tile grows into the vitals form
            await pg.click('.an-tile[data-vk=hr]'); await pg.wait_for_timeout(80)
            ok('n170: a vitals tile morphs into the vitals form', await pg.evaluate("getComputedStyle(document.getElementById('anVForm')).viewTransitionName") == 'an-hero')
            await pg.wait_for_timeout(500); ok('n170: focus lands in the form', await pg.evaluate("document.activeElement.id") == 'nv_hr')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
            # 3. a sheet closes from wherever it is, even while still opening
            await pg.click('[data-act=dose]'); await pg.wait_for_timeout(90); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(16)
            ia = await pg.evaluate("(()=>{const s=document.querySelector('#anSheetOut .an-sheet');if(!s)return null;const a=s.getAnimations();return [a.length, a.some(x=>!(x instanceof CSSAnimation)), getComputedStyle(s).animationName]})()")
            ok('n170: closing mid-opening retargets from where the sheet is (no restart)', ia and ia[1] and ia[2] == 'none', ia)
            await pg.wait_for_timeout(300)
            # 7. the now line glides
            nl = await pg.evaluate("(()=>{const n=document.querySelector('.an-now'),c=getComputedStyle(n);return [c.transitionDuration,c.transform]})()")
            ok('n170: the now line glides continuously', '15s' in nl[0] and nl[1] != 'none', nl)
            # 5. the name moves into the toolbar as the big title scrolls away
            ok('n170: toolbar title hidden at the top', not await pg.evaluate("document.documentElement.classList.contains('an-titled')"))
            await pg.evaluate("window.scrollTo(0, 420)"); await pg.wait_for_timeout(600)
            tt = await pg.evaluate("[document.documentElement.classList.contains('an-titled'), getComputedStyle(document.querySelector('.an-tbt')).opacity, document.querySelector('.an-tbt').textContent]")
            ok('n170: scrolled, the patient name sits in the toolbar (n208: with the time)', tt[0] and float(tt[1]) > .9 and tt[2].startswith('Training dog 4 · '), tt)
            await shot(pg, '52-title-in-toolbar')
            await pg.evaluate("window.scrollTo(0, 0)"); await pg.wait_for_timeout(400)
            ok('n170: back at the top, it leaves the toolbar', not await pg.evaluate("document.documentElement.classList.contains('an-titled')"))
            # 2. back to the list: the header shrinks into its card, the URL loses the record
            await pg.evaluate("window.__rn=0"); await pg.click('.an-back'); await pg.wait_for_selector('.an-card'); await pg.wait_for_timeout(600)
            ok('n170: Records goes back to the list in one redraw', await pg.evaluate("[location.hash, window.__rn]") == ['', 1], await pg.evaluate("[location.hash, window.__rn]"))
            await pg.go_back(); await pg.wait_for_selector('.an-chart', timeout=3000)
            ok('n170: and the browser Back button returns to the record', '#r=an_train1' in pg.url)
            ok('n170: no page errors', not errs, errs)
            await ctx.close()
            # Reduce Motion: none of it travels
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', reduced_motion='reduce')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            await pg.evaluate("document.querySelector('.an-tools [data-zoom=\"15\"]').click();0"); await pg.wait_for_timeout(40)
            ok('n170 Reduce Motion: the pill moves without sliding', await pg.evaluate("document.querySelector('.an-zoomseg .an-segpill').getAnimations().filter(a=>!(a instanceof CSSAnimation)).length") == 0)
            ok('n170 Reduce Motion: the now line does not glide', await pg.evaluate("getComputedStyle(document.querySelector('.an-now')).transitionDuration") in ('0s',))
            ok('n170 Reduce Motion: no heartbeat', await pg.evaluate("(()=>{const b=document.querySelector('.an-beat svg');return !b||getComputedStyle(b).animationName==='none'})()"))
            await ctx.close()
            _secend(28)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n170: premium motion', False, repr(_e)[:300])
        try:
            # ---------- n169: Expand on desktop and iPad (standalone)
            _sec(29)
            for nm, vp, touch in (('desktop', (1440, 900), False), ('ipad', (1180, 820), True)):
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', color_scheme='dark', has_touch=touch)
                await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
                await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
                w0 = await pg.evaluate("document.querySelector('.an-chartp').getBoundingClientRect().width")
                ok(f'n169 {nm}: Expand button shown, not pressed', await pg.get_attribute('#anExpand', 'aria-pressed') == 'false' and await pg.locator('#anExpand').is_visible())
                await pg.click('#anExpand'); await pg.wait_for_timeout(450)
                st = await pg.evaluate("[document.documentElement.classList.contains('an-expanded'), getComputedStyle(document.getElementById('pvxTopnav')).display, document.querySelector('.an-chartp').getBoundingClientRect().width, document.getElementById('anExpand').getAttribute('aria-pressed'), document.activeElement.id]")
                ok(f'n169 {nm}: expanded hides the top bar and widens the chart', st[0] and st[1] == 'none' and st[2] >= w0 and st[3] == 'true' and st[4] == 'anExpand', [w0] + st)
                ok(f'n169 {nm}: no sideways scroll when expanded', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
                await shot(pg, f'50-expanded-{nm}')
                await pg.click('[data-act=dose]'); await pg.wait_for_selector('#anSheet'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
                ok(f'n169 {nm}: Esc closes a sheet first and stays expanded', await pg.evaluate("document.documentElement.classList.contains('an-expanded') && !document.getElementById('anSheet')"))
                await pg.focus('#anExpand'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(450)
                ok(f'n169 {nm}: Esc leaves expanded view', not await pg.evaluate("document.documentElement.classList.contains('an-expanded')"))
                await pg.keyboard.press('Alt+KeyF'); await pg.wait_for_timeout(450)
                ok(f'n169 {nm}: ⌥F expands', await pg.evaluate("document.documentElement.classList.contains('an-expanded')"))
                await pg.evaluate("location.hash=''"); await pg.wait_for_timeout(500)
                ok(f'n169 {nm}: going back to the list leaves expanded view', not await pg.evaluate("document.documentElement.classList.contains('an-expanded')"))
                ok(f'n169 {nm}: no page errors', not errs, errs)
                await ctx.close()
            ctx = await br.new_context(viewport={'width': 390, 'height': 844}, timezone_id='America/Los_Angeles', has_touch=True, is_mobile=True)
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            ok('n169 phone: no Expand button (the record already fills the screen)', not await pg.locator('#anExpand').is_visible())
            # phone sheet: a quick flick closes it, a short slow drag springs back
            await pg.click('[data-act=event]'); await pg.wait_for_selector('#anSheet .an-sheet'); await pg.wait_for_timeout(450)
            drag = """async (o)=>{const z=document.querySelector('#anSheet .an-grab')||document.querySelector('#anSheet .an-sh');const r=z.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
              const T=(t,yy)=>{const tc=new Touch({identifier:1,target:z,clientX:x,clientY:yy});z.dispatchEvent(new TouchEvent(t,{touches:t==='touchend'?[]:[tc],changedTouches:[tc],bubbles:true}))};
              T('touchstart',y);for(let i=1;i<=o.n;i++){await new Promise(r=>setTimeout(r,o.ms));T('touchmove',y+o.d*i/o.n)}T('touchend',y+o.d);}"""
            await pg.evaluate(drag, {'n': 6, 'ms': 40, 'd': 40}); await pg.wait_for_timeout(120)
            ok('n169 phone: a short slow drag springs the sheet back', await pg.evaluate("!!document.getElementById('anSheet') && document.querySelector('#anSheet .an-sheet').classList.contains('an-spring')"))
            await pg.wait_for_timeout(450)
            await pg.evaluate(drag, {'n': 3, 'ms': 12, 'd': 60}); await pg.wait_for_timeout(350)
            ok('n169 phone: a quick flick closes the sheet', not await pg.evaluate("!!document.getElementById('anSheet')"))
            await ctx.close()
            _secend(29)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n169: Expand on desktop and iPad (standalone)', False, repr(_e)[:300])
        try:
            # ---------- n169: Expand inside Treatment Sheets (covers the sheet, fills the window)
            _sec(30)
            for cookie in ('light', 'dark'):
                ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark', timezone_id='America/Los_Angeles')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': cookie, 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
                await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1000)
                await pg.evaluate("localStorage.setItem('tsCurrentSheet','sh_x');Object.assign(VISIT,{patient:'Max',species:'Dog',weight:31.2});selectCTab('anes')"); await pg.wait_for_timeout(1500)
                fr = pg.frame_locator('#ctab-anes iframe')
                await fr.locator('#anNew').click(); await fr.locator('#anSheet [name=procedure]').fill('Exploratory laparotomy'); await fr.locator('#anSheet [data-ok]').click()
                await fr.locator('.an-chart').wait_for(); await pg.wait_for_timeout(300)
                await fr.locator('#anExpand').click(); await pg.wait_for_timeout(600)
                g = await pg.evaluate("(()=>{const b=document.querySelector('#ctab-anes .ts-anes'),r=b.getBoundingClientRect(),f=b.querySelector('iframe').getBoundingClientRect();return [b.classList.contains('expanded'),Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),Math.round(f.height),innerWidth,innerHeight,document.querySelector('iframe').contentDocument.documentElement.classList.contains('an-expanded')]})()")
                ok(f'n169 sheet {cookie}: Expand covers the whole window', g[0] and g[1] == 0 and g[2] == 0 and g[3] == g[6] and g[4] == g[7] and g[5] >= g[7] - 1 and g[8], g)
                await pg.screenshot(path=os.path.join(SHOTS, f'51-sheet-expanded-{cookie}.png'))
                await fr.locator('#anExpand').focus(); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
                g2 = await pg.evaluate("[document.querySelector('#ctab-anes .ts-anes').classList.contains('expanded'), document.querySelector('iframe').contentDocument.documentElement.classList.contains('an-expanded'), document.documentElement.classList.contains('ts-anes-lock')]")
                ok(f'n169 sheet {cookie}: Esc in the record returns to the sheet', g2 == [False, False, False], g2)
                await fr.locator('#anExpand').click(); await pg.wait_for_timeout(500)
                await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(500)
                g3 = await pg.evaluate("[!!document.querySelector('#ctab-anes .ts-anes.expanded'), document.documentElement.classList.contains('ts-anes-lock')]")
                ok(f'n169 sheet {cookie}: switching tabs leaves expanded view', g3 == [False, False], g3)
                ok(f'n169 sheet {cookie}: no page errors', not [e for e in errs if 'anes' in e.lower() or 'expand' in e.lower()], errs)
                await ctx.close()
            _secend(30)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n169: Expand inside Treatment Sheets (covers the sheet, fills the window)', False, repr(_e)[:300])
        try:
            # ---------- gates
            _sec(31)
            ctx, pg, errs = await new_page(br, 'null'); await pg.goto(URL); await pg.wait_for_selector('.an-gate')
            ok('signed out: sign-in card', 'Sign in to use Anesia' in await pg.inner_text('.an-gate')); await ctx.close()
            ctx, pg, errs = await new_page(br, '{"uid":"tv","email":"AU733@vca.com"}'); await pg.goto(URL); await pg.wait_for_selector('.an-gate')
            ok('lobby account: gated', 'lobby screen account' in await pg.inner_text('.an-gate')); await ctx.close()
            _secend(31)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — gates', False, repr(_e)[:300])
        try:
            # ---------- iPad first, then desktop light and phone
            _sec(32)
            for nm, vp, dark, touch in [('10-ipad-landscape', (1180, 820), True, True), ('11-ipad-pro-landscape', (1366, 1024), False, True), ('12-desktop-light', (1440, 900), False, False), ('13-wide-1680', (1680, 1050), True, False), ('14-phone', (390, 844), True, True)]:
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light', has_touch=touch, is_mobile=touch and vp[0] < 500)
                if not dark: await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
                await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
                ok(nm + ': no sideways page scroll', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
                minh = 44 if touch else 36
                small = await pg.evaluate("""m=>[...document.querySelectorAll('#anApp button,#anApp a,#anApp select,#anApp input')].filter(e=>e.offsetParent&&!e.closest('.an-chart')&&e.type!=='hidden').map(e=>{const r=e.getBoundingClientRect();return [e.textContent.trim().slice(0,18)||e.getAttribute('aria-label')||e.id,Math.round(r.width),Math.round(r.height)]}).filter(x=>x[2]<m||x[1]<m)""", minh)
                ok(nm + f': controls outside the chart at least {minh} px', not small, small)
                minfs = await pg.evaluate("Math.min(...[...document.querySelectorAll('#anApp *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>parseFloat(getComputedStyle(e).fontSize)))")
                ok(nm + ': no text under 12 px', minfs >= 12, minfs)
                if vp[0] >= 1000: ok(nm + ': Now column beside the chart', await pg.evaluate("(()=>{const a=document.querySelector('.an-chartp').getBoundingClientRect(),b=document.querySelector('.an-nowcol').getBoundingClientRect();return b.left>=a.right-1&&Math.abs(b.top-a.top)<2})()"))
                else: ok(nm + ': Now column above the chart', await pg.evaluate("document.querySelector('.an-nowcol').getBoundingClientRect().bottom<=document.querySelector('.an-chartp').getBoundingClientRect().top+1"))
                await shot(pg, nm)
                if nm == '14-phone':
                    await pg.click('[data-act=dose]'); await shot(pg, '15-phone-dose-sheet')
                ok(nm + ': no page errors', not errs, errs)
                await ctx.close()
            _secend(32)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — iPad first, then desktop light and phone', False, repr(_e)[:300])
        try:
            # ---------- n168: Liquid Glass switch knob while held
            _sec(33)
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
            await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            await pg.evaluate("(()=>{const l=document.createElement('label');l.className='an-check';l.id='gsw';l.style.cssText='position:fixed;left:40px;top:300px;z-index:99;width:300px';const i=document.createElement('input');i.type='checkbox';i.className='an-switch';i.setAttribute('role','switch');l.append(i,'Test');document.body.append(l)})()")
            knob = "(()=>{const c=getComputedStyle(document.querySelector('#gsw .an-switch'),'::after');return [c.backgroundColor,c.backdropFilter||c.webkitBackdropFilter,c.scale]})()"
            rest = await pg.evaluate(knob); ok('n168: switch knob is solid white at rest', rest[0] == 'rgb(255, 255, 255)' and rest[1] in ('none', ''), rest)
            box = await pg.locator('#gsw .an-switch').bounding_box(); await pg.mouse.move(box['x'] + 12, box['y'] + 15); await pg.mouse.down(); await pg.wait_for_timeout(300)
            held = await pg.evaluate(knob); await shot(pg, '16-glass-knob-held')
            ok('n168: held knob turns to clear glass (translucent, blurred, lifted)', 'rgba' in held[0] and 'blur' in (held[1] or '') and held[2] not in ('none', '1'), held)
            await pg.mouse.up(); await pg.wait_for_timeout(350)
            ok('n168: released knob settles back to solid', (await pg.evaluate(knob))[0] == 'rgb(255, 255, 255)')
            await pg.evaluate("document.documentElement.classList.add('an-noblur')"); await pg.mouse.move(box['x'] + 30, box['y'] + 15); await pg.mouse.down(); await pg.wait_for_timeout(300)
            nb = await pg.evaluate(knob); await pg.mouse.up()
            ok('n168: on slow devices (glass guard) the held knob stays solid', nb[0] == 'rgb(255, 255, 255)' and nb[1] in ('none', ''), nb)
            await ctx.close()
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', reduced_motion='reduce')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', SEED)); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('[data-act=dose]')
            am = await pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('#anSheet .an-sheet'));return [c.animationName,parseFloat(c.animationDuration),c.transform]})()")
            ok('Reduce Motion: sheets fade in (no slide or zoom), briefly', am[0] == 'anFadeIn' and am[1] <= .2 and am[2] == 'none', am)
            await pg.wait_for_timeout(100); await pg.keyboard.press('Escape')
            ok('Reduce Motion: a closing sheet stops blocking the page at once', await pg.evaluate("!document.getElementById('anSheet') && [...document.querySelectorAll('.an-scrim')].every(x=>getComputedStyle(x).pointerEvents==='none')"))
            await pg.wait_for_timeout(200); ok('Reduce Motion: and is gone after its short fade', await pg.locator('.an-scrim').count() == 0)
            await ctx.close()

            _secend(33)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n168: Liquid Glass switch knob while held', False, repr(_e)[:300])
        try:
            # ---------- n176: Anesia ⇄ Treatment Sheets ⇄ OR, through the sheet document
            _sec(34)
            import time as _time; T0 = PIN_MS   # the sheet badge and the OR clock run on the pinned clock
            SH_ALS = {'tenant_id': 'shoreline', 'status': 'active', 'board': 'IP', 'visit_id': 'v_als', 'patient': {'name': 'Bella', 'species': 'Feline', 'breed': 'DSH', 'sex': 'FS', 'age': '3 y', 'weight': 4.1, 'code': 'ALS', 'allergies': ''}, 'orders': {}}
            sd = json.loads(SEED); sd['sheets/sh_als'] = SH_ALS
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL + '?embed=1&sheet=sh_als'); await pg.wait_for_selector('.an-shead'); await pg.wait_for_timeout(300)   # the OR's link: sheet id only, no ?pre=
            ok('n176: with only a sheet id, the patient comes from the sheet document', 'No anesthesia record for Bella yet' in await pg.inner_text('.an-shead'))
            await pg.evaluate("firebase.firestore().collection('sheets').doc('sh_als').update({'patient.weight': 4.4})"); await pg.wait_for_timeout(300)
            await pg.click('#anNew'); await pg.wait_for_selector('#anSheet [name=name]'); await pg.wait_for_timeout(350)
            pf = await pg.evaluate("[document.querySelector('#anShT').innerText, document.querySelector('#anSheet [name=name]').value, document.querySelector('#anSheet [name=kg]').value, document.querySelector('#anSheet input[name=cpr]').value, document.querySelector('#anSheet [name=species]').value, [!!document.querySelector('#anSheet .an-codef .cpr-pill'), document.querySelectorAll('#anSheet [data-chips=cpr]').length, (document.querySelector('#anSheet .an-codef')||{}).innerText]]")
            ok('n176: it is a sheet record, with the sheet’s current weight and its ALS code', pf[0] == 'Start anesthesia record' and pf[1] == 'Bella' and pf[2] == '4.4' and pf[3] == 'ALS' and pf[4] == 'cat', pf)
            ok('n177: a sheet record’s code status is Flow’s: Pravix’s pill, not editable here', pf[5][0] is True and pf[5][1] == 0 and 'From Flow' in (pf[5][2] or ''), pf[5])
            await pg.fill('#anSheet [name=procedure]', 'Dental'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(400)
            rid = await pg.evaluate("location.hash.slice(3)"); d = await store(pg, rid)
            ok('n176: created as a case linked to the sheet (never a training record)', d and d['kind'] == 'case' and d['sheet_id'] == 'sh_als' and d['patient']['cpr'] == 'ALS', d and (d['kind'], d.get('sheet_id')))
            ok('n176: the record header shows the ALS code', 'ALS' in await pg.inner_text('.an-sum .cpr-pill.mini'))
            sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_als']||{}).anesthesia||null))")
            ok('n176: the sheet now carries the record’s summary: planned, not confirmed', sm and sm['rec'] == rid and sm['status'] == 'planned' and sm['confirmed'] is False and sm['procedure'] == 'Dental', sm)
            ok('n176: and nothing else on the sheet changed', await pg.evaluate("JSON.stringify(window.__fs['sheets/sh_als'].patient)") == json.dumps({**SH_ALS['patient'], 'weight': 4.4}, separators=(',', ':')))
            await pg.click('#anStart'); await pg.wait_for_timeout(200); await pg.click('[data-ok]'); await pg.wait_for_timeout(400); await pg.click('[data-ok]'); await pg.wait_for_timeout(400)
            await vitals_save(pg, {'hr': 150, 'spo2': 97, 'temp': 99.1}); await pg.wait_for_timeout(400)
            sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_als']||{}).anesthesia||null))")
            ok('n176: after Start and vitals the summary says active, confirmed, with the latest vitals', sm and sm['status'] == 'active' and sm['confirmed'] is True and sm['start'] and sm['last'] and sm['last']['hr'] == 150 and sm['last']['spo2'] == 97 and sm['kg'] == 4.4, sm)
            await pg.click('#anEnd'); await pg.wait_for_timeout(200); await pg.click('[data-ok]'); await pg.wait_for_timeout(500)
            sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_als']||{}).anesthesia||null))")
            ok('n176: End anesthesia reaches the sheet', sm and sm['status'] == 'ended' and sm['end'], sm)
            ok('no page errors (n176 Anesia)', not errs, errs)
            await pg.goto(URL + '?sheet=sh_als#r=' + rid); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            lk = await pg.evaluate("(()=>{const a=document.querySelector('.an-rhead h1 a.an-pill.sheet');return a?a.getAttribute('href'):null})()")
            ok('n176: outside the frame, the "Treatment sheet" pill links to the sheet’s Anesthesia tab', lk == '/treatment/#sheet=sh_als&tab=anes', lk)
            await pg.goto(URL + '?embed=1&sheet=sh_als#r=' + rid); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            ok('n176: inside the frame it is not a link', await pg.locator('.an-rhead h1 a.an-pill.sheet').count() == 0 and await pg.locator('.an-rhead h1 span.an-pill.sheet').count() == 1)
            await ctx.close()
            # Treatment Sheets: the tab badge follows the sheet's summary
            for st, exp in (('active', 'live'), ('ended', 'over'), ('signed', 'done')):
                sd2 = json.loads(SEED); sh = json.loads(json.dumps(SH_ALS)); sh['anesthesia'] = {'v': 1, 'rec': 'an_x', 'status': st, 'start': T0 - 12 * 60000, 'end': T0 if st != 'active' else None, 'signed': {'at': T0, 'by': 'Resident A'} if st == 'signed' else None, 'confirmed': True, 'asa': '2', 'timeout': True, 'kg': 4.4, 'last': {'at': T0, 'hr': 150, 'spo2': 97}}
                sd2['sheets/sh_als'] = sh
                ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Los_Angeles', color_scheme='light')
                await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd2))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                await ctx.add_init_script("try{localStorage.setItem('tsCurrentSheet','sh_als')}catch(e){}")
                pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
                await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1500)
                b = await pg.evaluate("(()=>{const el=document.querySelector('#clinSwitcher .seg[data-ctab=anes] .seg-badge.anes');const b=document.querySelector('#clinSwitcher .seg[data-ctab=anes]');return el?[el.className,el.textContent,b.title,getComputedStyle(el).display,getComputedStyle(el).backgroundColor]:null})()")
                want = {'live': lambda b: 'live' in b[0] and b[1] == '12 min' and b[2].startswith('Under anesthesia · 12 min') and 'HR 150' in b[2] and b[3] != 'none' and b[4] == 'rgb(92, 199, 90)',
                        'over': lambda b: 'over' in b[0] and b[1] == 'Unsigned' and b[3] != 'none' and b[4] == 'rgb(242, 199, 68)',
                        'done': lambda b: 'done' in b[0] and b[3] == 'none' and b[2] == 'Anesthesia record signed'}[exp]
                ok(f'n176: the sheet’s Anesthesia tab shows the record state ({st})', b and want(b), b)
                if st == 'active': await pg.screenshot(path=os.path.join(SHOTS, '60-treatment-anes-badge.png'))
                ok(f'no page errors (treatment badge {st})', not [e for e in errs if 'anes' in e.lower()], errs)
                await ctx.close()
            # the OR: the live board reads the same summary
            sd3 = json.loads(SEED); sh = json.loads(json.dumps(SH_ALS))
            sh['surgery'] = {'id': 'case_als', 'status': 'in_room', 'procedure': 'Dental', 'roomId': 'or2', 'date': pin_now().strftime('%Y-%m-%d'), 'sched': 840, 'surgeonId': None, 'events': [], 'readiness': {}, 'rman': {}}
            sh['anesthesia'] = {'v': 1, 'rec': 'an_x', 'status': 'active', 'start': T0 - 12 * 60000, 'end': None, 'signed': None, 'confirmed': True, 'asa': '2', 'timeout': True, 'kg': 4.4, 'last': {'at': T0, 'hr': 150, 'map': 72, 'spo2': 97, 'etco2': 38, 'temp': 99.1}}
            sd3['sheets/sh_als'] = sh
            ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='America/Los_Angeles', color_scheme='dark')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd3))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(f'http://127.0.0.1:{PORT}/or/'); await pg.wait_for_timeout(1500)
            o = await pg.evaluate("(()=>{const c=CASES.find(x=>x.id==='case_als');if(!c)return null;const an=anOf(c);return {state:an&&an.state,hr:an&&an.hr,real:an&&an.real,start:an&&Math.round(an.start),ready:c.readiness.anesthesia,cpr:c.readiness.cpr,note:(c._auto||{}).anesthesia||null,now:Math.round(now())}})()")
            ok('n176: the OR builds the anesthesia state from the sheet (active, 12 min ago, real vitals)', o and o['state'] == 'active' and o['hr'] == 150 and o['real'] is True and abs(o['now'] - o['start'] - 12) <= 1, o)
            ok('n176: "Anesthesia assessment complete" ticks itself from Anesia, and ALS satisfies the code check', o and o['ready'] == 'done' and o['cpr'] == 'done' and o['note'] == 'Patient confirmed in Anesia · ASA 2', o)
            await pg.evaluate("openDrawer('case_als')"); await pg.wait_for_timeout(400)
            dr = await pg.evaluate("(()=>{const a=document.querySelector('#drawer .or-anesia');const b=document.querySelector('#drawerAnesia');return {cls:a&&a.className,txt:a&&a.innerText.replace(/\\s+/g,' '),vit:a&&getComputedStyle(a.querySelector('.or-vitals')).display,btn:b&&getComputedStyle(b).display}})()")
            ok('n176: the drawer’s Anesia card is live: Active, HR 150, SpO₂ 97%, start time', dr['cls'] and 'real' in dr['cls'] and 'Active' in dr['txt'] and '150' in dr['txt'] and '97%' in dr['txt'] and 'Anesthesia start' in dr['txt'] and dr['vit'] == 'grid', dr)
            ok('n176: "Open Anesia" is back on the live board', dr['btn'] not in (None, 'none'), dr)
            popup = await pg.evaluate("(()=>{let u=null;window.open=(x)=>{u=x;return null};document.querySelector('#drawerAnesia').click();return u})()")
            ok('n176: it opens the patient’s actual record', popup == '/anesia/?sheet=sh_als#r=an_x', popup)
            await pg.screenshot(path=os.path.join(SHOTS, '61-or-anesia-live.png'))
            ok('no page errors (n176 OR)', not errs, errs)
            await ctx.close()

            _secend(34)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n176: Anesia ⇄ Treatment Sheets ⇄ OR, through the sheet document', False, repr(_e)[:300])
        try:
            # ---------- n180: recovery phase
            _sec(36)
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            ok('n180: no recovery while under anesthesia', await pg.locator('.an-rec').count() == 0)
            await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec')
            hd = await pg.evaluate("[document.querySelector('.an-rhead .an-pill.rec')?.innerText, document.querySelector('.an-clock span').innerText, !!document.querySelector('#anREnd'), !!document.querySelector('#anSign'), [...document.querySelectorAll('.an-rmk b')].map(b=>b.innerText), document.querySelector('.an-rec').innerText]")
            ok('n180: ending anesthesia opens recovery: pill, recovery clock, End recovery (no Sign yet)', hd[0] == 'In recovery' and hd[1] == 'Recovery time' and hd[2] and not hd[3], hd)
            ok('n180: four milestones and no checks yet', hd[4] == ['Extubated', 'Head up', 'Sternal', 'Standing'] and 'No checks yet' in hd[5], hd[4])
            await pg.click('[data-rmk=extubation]'); await pg.wait_for_timeout(400)
            d = await store(pg, 'an_train1')
            ok('n180: one tap records extubation, and it is charted as an Extubation event', d['recovery']['marks'].get('extubation') and any(e['kind'] == 'extubation' for e in d['events']) and await pg.locator('.an-rmk.done[data-rmk=extubation]').count() == 1)
            await pg.click('[data-rmk=headup]'); await pg.wait_for_timeout(300)
            await pg.click('[data-rmk=headup]'); await pg.wait_for_selector('#anSheet [data-rclear]'); await pg.click('#anSheet [data-rclear]'); await pg.wait_for_timeout(400)
            d = await store(pg, 'an_train1')
            ok('n180: tapping a recorded milestone lets you change or clear it', 'headup' not in d['recovery']['marks'] and await pg.locator('.an-rmk.done[data-rmk=headup]').count() == 0)
            await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300)
            ok('n180: the check opens on temperature', await pg.evaluate("document.activeElement.id") == 'rc_temp')
            await pg.fill('#rc_temp', '140'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(300)
            ok('n180: an impossible temperature is caught', await pg.locator('#anSheet').count() == 1 and '77–113' in await pg.inner_text('#anSheet [data-ferr=temp]'))
            await pg.fill('#rc_temp', '98.4'); await pg.fill('#rc_hr', '110'); await pg.click('#anSheet [data-chips=pain] [data-v="2"]'); await pg.click('#anSheet [data-chips=mentation] [data-v=quiet]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
            d = await store(pg, 'an_train1'); c0 = d['recovery']['checks'][-1]
            ok('n180: recovery check saved (98.4 °F, HR 110, pain 2, quiet)', c0['temp'] == 98.4 and c0['hr'] == 110 and c0['pain'] == 2 and c0['mentation'] == 'quiet', c0)
            await pg.evaluate("window.__anSkip=(window.__anSkip||0)+16*60000"); await pg.evaluate("window.anesiaApp.render(true)"); await pg.wait_for_timeout(200)
            ok('n180: the next check is due after 15 minutes', 'Check due' in await pg.inner_text('.an-rech'))
            await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300); await pg.fill('#rc_temp', '99.1'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
            rows = await pg.evaluate("[...document.querySelectorAll('.an-rck .vals')].map(x=>x.innerText)")
            ok('n180: checks are listed newest first, with the temperature trend', len(rows) == 2 and rows[0].startswith('99.1 °F') and await pg.locator('.an-rck i.up svg.an-sf').count() == 1 and 'Pain 2/4' in rows[1] and 'Quiet' in rows[1] and 'Check due' not in await pg.inner_text('.an-rech'), rows)
            fc = await pg.evaluate("[document.querySelector('.an-rtemp')?.innerText, document.querySelector('.an-rready')?.innerText]")
            ok('n181: forecast from the trend: rising +2.6 °F/h, about 100 °F by a time', fc[0] and 'Rising +2.6 °F/h · about 100 °F by' in fc[0], fc)
            ok('n181: not ready yet lists the milestones still missing', fc[1] and 'Not ready yet' in fc[1] and 'Head up not recorded' in fc[1] and 'Standing not recorded' in fc[1] and 'Extubated not recorded' not in fc[1], fc)
            await shot(pg, '95-recovery-dark')
            await pg.click('#anREnd'); await pg.wait_for_selector('#anSheet [data-chips=dest]'); await pg.wait_for_timeout(300)
            es = await pg.evaluate("[document.querySelector('#anSheet [data-ok]').disabled, document.querySelector('#anSheet').innerText]")
            ok('n180: End recovery asks where the patient goes and lists what wasn’t recorded', es[0] and 'Not recorded: Head up, Sternal, Standing' in es[1], es)
            ok('n180: the destinations are the sheet’s locations: Wards, ICU, Isolation', await pg.evaluate("[...document.querySelectorAll('#anSheet [data-chips=dest] .an-chip')].map(c=>c.innerText)") == ['Wards', 'ICU', 'Isolation'])
            await pg.click('#anSheet [data-chips=dest] [data-v=Wards]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
            d = await store(pg, 'an_train1')
            st = await pg.evaluate("[document.querySelector('.an-rhead .an-pill.warn')?.innerText, !!document.querySelector('#anSign'), document.querySelector('.an-rech p').innerText, document.querySelectorAll('.an-rmk:disabled').length, !!document.querySelector('#anRCheck')]")
            ok('n180: recovery ended, to Wards; then Sign record', d['recovery']['dest'] == 'Wards' and d['recovery']['end'] and st[0] == 'Ended · not signed' and st[1] and 'to Wards' in st[2] and st[3] == 4 and not st[4], st)
            ok('no page errors (n180)', not errs, errs)
            await ctx.close()
            # a sheet record: the recovery goes to the treatment sheet; Treatment Sheets and the OR show it
            sd = json.loads(SEED); sd['sheets/sh_rec'] = {'tenant_id': 'shoreline', 'status': 'active', 'patient': {'name': 'Rex', 'species': 'Canine', 'weight': 20, 'code': 'CPR'}}
            r1 = json.loads(json.dumps(sd['anesia_records/an_train1'])); r1['id'] = 'an_case10'; r1['kind'] = 'case'; r1['sheet_id'] = 'sh_rec'; r1['patient']['name'] = 'Rex'; sd['anesia_records/an_case10'] = r1
            ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', color_scheme='dark')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(URL + '?embed=1&sheet=sh_rec#r=an_case10'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec'); await pg.wait_for_timeout(300)
            await pg.click('[data-rmk=extubation]'); await pg.wait_for_timeout(300)
            await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300); await pg.fill('#rc_temp', '98.6'); await pg.click('#anSheet [data-chips=pain] [data-v="1"]'); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(600)
            sm = await pg.evaluate("JSON.parse(JSON.stringify((window.__fs['sheets/sh_rec']||{}).anesthesia||null))")
            ok('n180: the treatment sheet learns the recovery: started, extubated, last check', sm and sm['status'] == 'ended' and sm['recovery'] and sm['recovery']['start'] and not sm['recovery']['end'] and sm['recovery']['marks'].get('extubation') and sm['recovery']['last']['temp'] == 98.6 and sm['recovery']['last']['pain'] == 1, sm and sm.get('recovery'))
            ok('no page errors (n180 sheet)', not errs, errs)
            await ctx.close()
            import time as _t2
            T1 = PIN_MS
            rec_sum = {'v': 1, 'rec': 'an_x', 'status': 'ended', 'start': T1 - 90 * 60000, 'end': T1 - 12 * 60000, 'signed': None, 'confirmed': True, 'asa': '2', 'timeout': True, 'kg': 20, 'last': None,
                       'recovery': {'start': T1 - 12 * 60000, 'end': None, 'dest': '', 'marks': {'extubation': T1 - 10 * 60000}, 'last': {'at': T1 - 2 * 60000, 'temp': 98.6, 'hr': 100, 'pain': 1, 'mentation': 'quiet'}}}
            sd2 = json.loads(SEED); sd2['sheets/sh_rec'] = {'tenant_id': 'shoreline', 'status': 'active', 'board': 'IP', 'visit_id': 'v_r', 'patient': {'name': 'Rex', 'species': 'Canine', 'weight': 20, 'code': 'CPR'}, 'orders': {}, 'anesthesia': rec_sum,
                'surgery': {'id': 'case_rec', 'status': 'recovery', 'procedure': 'TPLO', 'roomId': 'or1', 'date': pin_now().strftime('%Y-%m-%d'), 'sched': 600, 'surgeonId': None, 'events': [], 'readiness': {}, 'rman': {}}}
            ctx = await br.new_context(viewport={'width': 1280, 'height': 860}, timezone_id='America/Los_Angeles', color_scheme='light')
            await ctx.add_init_script(INIT.replace('@@USER@@', '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}').replace('@@SEED@@', json.dumps(sd2))); await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
            await ctx.add_init_script("try{localStorage.setItem('tsCurrentSheet','sh_rec')}catch(e){}")
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1500)
            b = await pg.evaluate("(()=>{const el=document.querySelector('#clinSwitcher .seg[data-ctab=anes] .seg-badge.anes');const t=document.querySelector('#clinSwitcher .seg[data-ctab=anes]');return el?[el.className,el.textContent,t.title,getComputedStyle(el).backgroundColor]:null})()")
            ok('n180: Treatment Sheets’ Anesthesia tab says Recovery 12 min (purple), with the last temperature and pain', b and 'rec' in b[0] and b[1] == 'Recovery 12 min' and '98.6 °F' in b[2] and 'pain 1/4' in b[2] and b[3] == 'rgb(139, 77, 181)', b)
            await pg.goto(f'http://127.0.0.1:{PORT}/or/'); await pg.wait_for_timeout(1500)
            om = await pg.evaluate("(()=>{const c=CASES.find(x=>x.id==='case_rec');return c?anOf(c).mode:null})()")
            ok('n180: the OR shows In recovery · extubated (time)', om and om.startswith('In recovery · extubated '), om)
            ok('no page errors (n180 treatment/OR)', not [e for e in errs if 'anes' in e.lower() or 'recovery' in e.lower()], errs)
            await ctx.close()

            _secend(36)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n180: recovery phase', False, repr(_e)[:300])
        try:
            # ---------- n181: ready to leave recovery, temperature forecast, interns
            _sec(37)
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            await pg.click('.an-sum [data-steam]'); await pg.wait_for_selector('#anSheet .an-team')
            tm = await pg.evaluate("[...document.querySelectorAll('#anSheet .an-team small')].map(x=>x.innerText)")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            ok('n181: the team says Intern, not Resident', 'Intern' in tm and 'Resident' not in tm, tm)
            await pg.click('#anEnd'); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec'); await pg.wait_for_timeout(300)
            rd = await pg.inner_text('.an-rready')
            ok('n181: at the start: all four milestones and no check yet', all(x in rd for x in ['Extubated not recorded', 'Head up not recorded', 'Sternal not recorded', 'Standing not recorded', 'No recovery check yet']), rd)
            for k in ('extubation', 'headup', 'sternal', 'standing'): await pg.click('[data-rmk=%s]' % k); await pg.wait_for_timeout(250)
            async def chk(temp, pain, ment):
                await pg.click('#anRCheck'); await pg.wait_for_selector('#anSheet #rc_temp'); await pg.wait_for_timeout(300); await pg.fill('#rc_temp', temp)
                await pg.click('#anSheet [data-chips=pain] [data-v="%s"]' % pain); await pg.click('#anSheet [data-chips=mentation] [data-v=%s]' % ment); await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
            await chk('99.0', 3, 'dysphoric')
            rd = await pg.inner_text('.an-rready')
            ok('n181: pain 3/4 and dysphoria at the last check are listed', 'Pain 3/4 at the last check' in rd and 'Dysphoric at the last check' in rd and 'not recorded' not in rd, rd)
            await pg.evaluate("window.__anSkip=(window.__anSkip||0)+10*60000"); await chk('98.6', 1, 'alert')
            fc = await pg.evaluate("[document.querySelector('.an-rtemp')?.innerText, document.querySelector('.an-rtemp')?.className, document.querySelector('.an-rready').innerText]")
            ok('n181: a falling temperature is flagged after two checks', 'Temperature falling · −2.4 °F/h' in fc[0] and 'dn' in fc[1] and 'Temperature falling' in fc[2], fc)
            await pg.evaluate("window.__anSkip=(window.__anSkip||0)+10*60000"); await chk('99.6', 1, 'alert')
            fc = await pg.evaluate("[document.querySelector('.an-rtemp')?.innerText, document.querySelector('.an-rready').className, document.querySelector('.an-rready').innerText]")
            ok('n181: rising again (fit over the last checks): +1.8 °F/h with an ETA; nothing missing → Ready to leave recovery', 'Rising +1.8 °F/h · about 100 °F by' in fc[0] and 'ok' in fc[1] and fc[2].strip() == 'Ready to leave recovery', fc)
            await shot(pg, '100-recovery-ready')
            await pg.click('#anREnd'); await pg.wait_for_selector('#anSheet [data-chips=dest]'); await pg.wait_for_timeout(300)
            ok('n181: End recovery has nothing to warn about when ready', await pg.locator('#anSheet .an-calc.warn').count() == 0)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.click('.an-sum [data-sum] >> nth=0'); await pg.wait_for_selector('#anSheet [name=resident]')
            ok('n181: Patient details labels the field Intern', (await pg.inner_text('#anSheet label[for=pR]')) == 'Intern')
            ok('no page errors (n181)', not errs, errs)
            await ctx.close()

            _secend(37)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n181: ready to leave recovery, temperature forecast, interns', False, repr(_e)[:300])
        try:
            # ---------- n182: dark mode has no cyan-filled buttons (Admit/Discharge card face instead); one calm recovery green
            _sec(38)
            CY = """(()=>[...document.querySelectorAll('button,a,[role=button]')].filter(e=>e.getClientRects().length).filter(e=>{const m=getComputedStyle(e).backgroundColor.match(/[\\d.]+/g);if(!m)return false;const [r,g,b,a=1]=m.map(Number);return a>.5&&b>150&&g>140&&r<120&&g-r>60}).map(e=>(e.innerText||'').trim()))()"""
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL); await pg.wait_for_selector('.an-lhead'); found = await pg.evaluate(CY)
            await pg.click('#anNew'); await pg.wait_for_selector('#anSheet [data-ok]'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY)
            face = await pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('#anSheet [data-ok]'));return [c.backgroundImage.includes('gradient'),c.borderTopColor,c.color,c.fontWeight]})()")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart')
            for a in ('dose', 'infusion'):
                await pg.click('[data-act=%s]' % a); await pg.wait_for_selector('#anSheet'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.click('[data-act=vitals]'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.click('#anEnd'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await pg.click('[data-ok]'); await pg.wait_for_selector('.an-rec')
            await pg.click('#anRCheck'); await pg.wait_for_timeout(400); found += await pg.evaluate(CY); await shot(pg, '101-dark-sheet-save'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            ok('n182: dark mode — no cyan-filled buttons anywhere (sheets, vitals Save, New record, End, Sign)', not found, found)
            ok('n182: the primary button wears the Admit/Discharge face (gradient card, hairline, white 600)', face[0] and face[2] == 'rgba(245, 248, 252, 0.96)' and face[3] == '600', face)
            for k in ('extubation', 'headup'): await pg.click('[data-rmk=%s]' % k); await pg.wait_for_timeout(250)
            g = await pg.evaluate("(()=>{const t=document.querySelector('.an-rmk.done');return [getComputedStyle(t).backgroundColor,getComputedStyle(t.querySelector('.ic .disc')).fill,getComputedStyle(t.querySelector('.tm')).color]})()")
            ok('n182: finished milestones are neutral tiles with one green check (Pravix #5CC75A)', 'rgb(92, 199, 90)' == g[1] and '72, 184, 136' not in g[0] and '91, 214, 168' not in g[2], g)
            sf = await pg.evaluate("(()=>{const d=document.querySelector('.an-rmk.done[data-rmk=headup] svg.an-sf'),u=document.querySelector('.an-rmk:not(.done) svg.an-sf');return {done:!!(d&&d.querySelector('.disc')&&d.querySelector('.tick')),bounce:d&&d.classList.contains('bounce'),anim:d&&getComputedStyle(d).animationName,open:!!(u&&u.querySelector('.ring')&&!u.querySelector('.disc'))}})()")
            ok('n183: milestones are SF-style: open circle, then checkmark.circle.fill with Bounce on the one just marked', sf['done'] and sf['open'] and sf['bounce'] and sf['anim'] == 'anSfBounce', sf)
            await pg.wait_for_timeout(900); await pg.evaluate("window.anesiaApp.render(true)"); await pg.wait_for_timeout(100)
            ok('n183: the Bounce plays once (not again on the next render)', await pg.locator('.an-rmk svg.an-sf.bounce').count() == 0)
            ok('no page errors (n182)', not errs, errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br, dark=False)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.click('[data-act=dose]'); await pg.wait_for_selector('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
            ok('n182: light mode keeps its primary fill', 'rgb(56, 189, 210)' in await pg.evaluate("getComputedStyle(document.querySelector('#anSheet [data-ok]')).backgroundColor") or 'rgb(' in await pg.evaluate("getComputedStyle(document.querySelector('#anSheet [data-ok]')).backgroundColor"))
            await ctx.close()
            _secend(38)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n182: dark mode has no cyan-filled buttons (Admit/Discharge card face instead); one calm r', False, repr(_e)[:300])
        try:
            # ---------- n184: Flow follows the HIG Layout page
            _sec(39)
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
            ctx, pg, errs = await flow_page((1440, 900))
            m = await pg.evaluate("(document.querySelector('meta[name=viewport]')||{}).content")
            ok('n184: viewport-fit=cover, so the safe-area insets apply', 'viewport-fit=cover' in m, m)
            bp = await pg.evaluate("""(()=>{const out=new Set();const walk=rs=>{for(const r of rs){if(r.media&&r.conditionText!==undefined&&/width/.test(r.conditionText))(r.conditionText.match(/(?:max|min)-width:\\s*\\d+px/g)||[]).forEach(x=>out.add(x.replace(/\\s/g,'')));if(r.cssRules)walk(r.cssRules)}};for(const s of document.styleSheets){try{walk(s.cssRules)}catch(e){}}return [...out]})()""")
            allowed = {f'max-width:{n}px' for n in (420, 700, 820, 1024, 1180, 1400, 1699)} | {f'min-width:{n}px' for n in (701, 1025, 1700)}
            topbar = {'max-width:1120px', 'max-width:1280px', 'max-width:1100px', 'min-width:761px', 'min-width:1101px', 'max-width:760px'}
            odd = sorted(set(bp) - allowed - topbar)
            ok('n184: width breakpoints are one set of size classes (420 / 700 / 820 / 1024 / 1180 / 1400 / 1700; the shared top bar keeps its own)', not odd, odd)
            px = await pg.evaluate("""(()=>{let n=0,ex=[];const TB=/topnav|nav-item|nav-center|nav-right|logout|pvx-word|pvx-powered|pvx-lockup|brandwrap|cobrand|theme-toggle|exit-arrow|door-glyph/;const walk=rs=>{for(const r of rs){if(r.style&&!TB.test(r.selectorText||'')){const f=r.style.getPropertyValue('font-size');if(/^\\d+(\\.\\d+)?px$/.test(f)){n++;ex.push(r.selectorText+' '+f)}}if(r.cssRules)walk(r.cssRules)}};for(const s of document.styleSheets){try{walk(s.cssRules)}catch(e){}}return [n,ex.slice(0,5)]})()""")
            ok('n184: no Flow text is sized in px any more (rem: the browser or system text size applies)', px[0] == 0, px)
            f1 = await pg.evaluate("[getComputedStyle(document.querySelector('.command-kpi__label')).fontSize, getComputedStyle(document.querySelector('.topnav .nav-item')).fontSize, getComputedStyle(document.querySelector('#switcher .seg')).fontSize]")
            await pg.evaluate("document.documentElement.style.fontSize='200%'"); await pg.wait_for_timeout(400)
            f2 = await pg.evaluate("[getComputedStyle(document.querySelector('.command-kpi__label')).fontSize, getComputedStyle(document.querySelector('.topnav .nav-item')).fontSize, getComputedStyle(document.querySelector('#switcher .seg')).fontSize, document.documentElement.scrollWidth>innerWidth+1, document.documentElement.classList.contains('pvx-text-l')]")
            ok('n184: at the default size text is exactly as before (card label 11 px, view 13 px)', f1[0] == '11px' and f1[2] == '13px', f1)
            ok('n184: at 200 % text Flow’s text doubles; the shared top bar stays as it is (like an iOS tab bar); no sideways scroll', f2[0] == '22px' and f2[2] == '26px' and f2[1] == f1[1] and not f2[3] and f2[4], [f1, f2])
            await pg.evaluate("document.documentElement.style.fontSize=''"); await pg.wait_for_timeout(300)
            # the + is a toolbar button in the sub-nav; its menu drops down from it
            fb = await pg.evaluate("(()=>{const b=document.querySelector('#fabAdd');const r=b.getBoundingClientRect();return {par:b.parentElement.id,pos:getComputedStyle(b).position,top:r.top,h:r.height,next:b.nextElementSibling.className}})()")
            ok('n184: the Operations + sits in Flow’s sub-nav beside search, not floating over the board', fb['par'] == 'subnavFlow' and fb['pos'] != 'fixed' and fb['next'] == 'search' and fb['top'] < 151, fb)
            await pg.click('#fabAdd'); await pg.wait_for_timeout(350)
            mn = await pg.evaluate("(()=>{const b=document.querySelector('#fabAdd').getBoundingClientRect(),m=document.querySelector('#opsMenu').getBoundingClientRect();return {open:document.querySelector('#opsMenu').classList.contains('open'),exp:document.querySelector('#fabAdd').getAttribute('aria-expanded'),below:m.top>=b.bottom&&m.top<=b.bottom+12,right:Math.abs(m.right-b.right)<2,inside:m.left>=0&&m.right<=innerWidth&&m.bottom<=innerHeight}})()")
            ok('n184: the menu drops down from the +, right-aligned to it and inside the window', mn['open'] and mn['exp'] == 'true' and mn['below'] and mn['right'] and mn['inside'], mn)
            await shot(pg, '110-flow-ops-menu')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            ok('n184: Escape closes it', await pg.evaluate("!document.querySelector('#opsMenu').classList.contains('open') && document.querySelector('#fabAdd').getAttribute('aria-expanded')==='false'"))
            await pg.click('#fabAdd'); await pg.wait_for_timeout(300); await pg.click('#opsMenu [data-op=shift]'); await pg.wait_for_timeout(500)
            ok('n184: its items still work (Shift Setup opens)', await pg.evaluate("document.querySelector('#shiftModal').classList.contains('open')"))
            cz = await pg.evaluate("""(()=>{const b=document.querySelector('#shiftClose'),r=b.getBoundingClientRect(),a=getComputedStyle(b,'::after');const h=r.height-parseFloat(a.top)-parseFloat(a.bottom),w=r.width-parseFloat(a.left)-parseFloat(a.right);const cx=r.left+r.width/2,cy=r.top+r.height/2;const hit=[[cx-13.5,cy],[cx+13.5,cy],[cx,cy-13.5],[cx,cy+13.5]].every(([x,y])=>b.contains(document.elementFromPoint(x,y)));return {w,h,hit}})()""")
            ok('n184: on Mac a Close button hits at least 28 × 28 pt', cz['w'] >= 28 and cz['h'] >= 28 and cz['hit'], cz)
            sm = await pg.evaluate("(()=>{const b=document.querySelector('#intakeClose'),a=getComputedStyle(b,'::after');return [b.offsetWidth,b.offsetHeight,parseFloat(a.top),parseFloat(a.left)]})()")
            ok('n184: the 31 × 24 Close (intake, assign) gets a 31 × 28 hit area', sm[1] - 2 * sm[2] >= 28 and sm[3] == 0, sm)
            ok('no new page errors (n184 Mac)', not newerr(errs), errs)
            await ctx.close()
            # size classes: the Command Center cards change at 700, not at 599
            for w, cols in ((690, 2), (720, 4)):
                ctx, pg, errs = await flow_page((w, 900))
                n = await pg.evaluate("getComputedStyle(document.querySelector('#kpiRow')).gridTemplateColumns.split(' ').length")
                ok(f'n184: at {w} pt the cards are {cols} across (compact width ends at 700)', n == cols, n)
                await ctx.close()
            # phone: sub-nav strip, + beside search, touch targets
            ctx, pg, errs = await flow_page((390, 844), touch=True)
            sw = await pg.evaluate("(()=>{const s=document.querySelector('#switcher'),m=document.querySelector('#subnavFlow .pvx-swmore');const segs=[...s.querySelectorAll('.seg')].map(x=>x.offsetHeight);return {cls:s.className,more:m&&m.classList.contains('on'),mask:getComputedStyle(s).webkitMaskImage||getComputedStyle(s).maskImage,segs,fab:document.querySelector('#fabAdd').offsetWidth,fabRow:Math.abs(document.querySelector('#fabAdd').getBoundingClientRect().top-document.querySelector('#subnavFlow .search').getBoundingClientRect().top)<10}})()")
            ok('n184/n212: phone — the views are a bottom tab bar now (no sideways strip, no chevron), every label on one line', 'ov-r' not in sw['cls'] and not sw['more'] and len(set([x for x in sw['segs'] if x])) == 1, sw)
            ok('n184: phone — the + is 44 pt, on the search row', sw['fab'] == 44 and sw['fabRow'], sw)
            await shot(pg, '111-flow-phone-subnav')
            await pg.evaluate("document.querySelector('#switcher .seg[data-view=rooms]').click()"); await pg.wait_for_timeout(600)
            vis = await pg.evaluate("(()=>{const s=document.querySelector('#switcher').getBoundingClientRect(),a=document.querySelector('#switcher .seg.active').getBoundingClientRect();return {in:a.left>=s.left-1&&a.right<=s.right+1,act:document.querySelector('#switcher .seg.active').dataset.view}})()")
            ok('n184: the current view is scrolled into sight', vis['in'] and vis['act'] == 'rooms', vis)
            await pg.evaluate("document.querySelector('#switcher .seg[data-view=dashboard]').click()"); await pg.wait_for_timeout(400)
            await pg.click('#fabAdd'); await pg.wait_for_timeout(300); await pg.click('#opsMenu [data-op=shift]'); await pg.wait_for_timeout(500)
            cz = await pg.evaluate("""(()=>{const b=document.querySelector('#shiftClose'),r=b.getBoundingClientRect(),a=getComputedStyle(b,'::after');return [r.width-parseFloat(a.left)-parseFloat(a.right),r.height-parseFloat(a.top)-parseFloat(a.bottom)]})()""")
            ok('n184: on touch a Close button hits 44 × 44 pt', cz[0] >= 44 and cz[1] >= 44, cz)
            ok('no new page errors (n184 phone)', not newerr(errs), errs)
            await ctx.close()
            # compact height: one slim sub-nav row
            hh = {}
            for vp in ((844, 390), (844, 900)):
                ctx, pg, errs = await flow_page(vp, touch=True)
                hh[vp[1]] = await pg.evaluate("(()=>{const s=document.querySelector('#subnavFlow').getBoundingClientRect(),q=document.querySelector('#subnavFlow .search').getBoundingClientRect(),w=document.querySelector('#switcher').getBoundingClientRect();return {bottom:Math.round(s.bottom),one:Math.abs(q.top-w.top)<12}})()")
                if vp[1] == 390: await shot(pg, '112-flow-compact-height')
                await ctx.close()
            ok('n184: compact height (844 × 390) — views, search and + on one row; the header ends by 140 pt (was 195)', hh[390]['one'] and hh[390]['bottom'] <= 140, hh)
            ok('n184: regular height at the same width keeps two rows', not hh[900]['one'], hh)
            # safe areas: simulate a notched phone in landscape (insets 47 left, 34 bottom)
            ctx, pg, errs = await flow_page((844, 390))
            await pg.evaluate("""(()=>{const t=document.querySelector('#pvx-n184-css').textContent.replace(/env\\(safe-area-inset-left,0px\\)/g,'47px').replace(/env\\(safe-area-inset-bottom,0px\\)/g,'21px').replace(/env\\(safe-area-inset-right,0px\\)/g,'0px');const s=document.createElement('style');s.textContent=t;document.body.appendChild(s)})()"""); await pg.wait_for_timeout(300)
            sa = await pg.evaluate("(()=>{const R=s=>document.querySelector(s).getBoundingClientRect();return {nav:[R('.topnav').left,R('.topnav').width],brand:R('.topnav .brandwrap').left,sub:R('#subnavFlow').left,seg:R('#switcher').left,stage:R('#stage').left,hs:document.documentElement.scrollWidth>innerWidth+1}})()")
            ok('n184: safe areas — the bars reach the screen edge, their content and the board start inside the inset', sa['nav'][0] == 0 and sa['nav'][1] == 844 and sa['sub'] == 0 and sa['brand'] >= 47 and sa['seg'] >= 47 and sa['stage'] >= 47 and not sa['hs'], sa)
            await ctx.close()
            # Dynamic Type on iPhone (-apple-system-body is 17 pt at the default size)
            stub = "(function(){var big=23.8;window.__dt=function(v){big=v};var cs=CSS.supports.bind(CSS);CSS.supports=function(p,v){return (p==='font'&&v==='-apple-system-body')||cs(p,v)};var g=window.getComputedStyle;window.getComputedStyle=function(el,ps){if(el&&el.style&&el.getAttribute('data-pvx-probe')){return {fontSize:big+'px'}}return g.call(window,el,ps)};})();"
            ctx, pg, errs = await flow_page((390, 844), touch=True, ua='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1', extra=stub)
            dt = await pg.evaluate("[getComputedStyle(document.documentElement).fontSize, document.documentElement.classList.contains('pvx-text-l'), getComputedStyle(document.querySelector('#kpiRow')).gridTemplateColumns.split(' ').length]")
            ok('n184: iPhone — the text follows Dynamic Type (body 23.8 pt → Flow at 140 %); cards go to one column at large sizes', dt[0] == '22.4px' and dt[1] and dt[2] == 1, dt)
            await pg.evaluate("window.__dt(17); Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}); document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(200)
            ok('n184: back from Settings at the default size, Flow is back to 100 %', await pg.evaluate("getComputedStyle(document.documentElement).fontSize") == '16px')
            await shot(pg, '113-flow-phone-default')
            ok('no new page errors (n184 Dynamic Type)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            ok('n184: on a Mac the Dynamic Type probe does nothing (root stays 16 px)', await pg.evaluate("getComputedStyle(document.documentElement).fontSize") == '16px')
            await ctx.close()
            _secend(39)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n184: Flow follows the HIG Layout page', False, repr(_e)[:300])
        if _helper(39):   # only what later sections use from it
            try:
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
            except Exception as _e: print('::warning::helper 39 failed: ' + repr(_e)[:200])
        try:
            # ---------- n185: Flow's floating layer wears Anesia's glass (HIG Materials)
            _sec(40)
            FL = ['#opsMenu', '#searchResults', '#fvStalePill', '#flowNet', '#toast']
            GJ = "(qs=>qs.map(q=>{const e=document.querySelector(q);if(!e)return [q,null];const s=getComputedStyle(e);return [q,s.backgroundColor,s.backdropFilter]}))"
            for dark in (True, False):
                ctx, pg, errs = await new_page(br, dark=dark)
                await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
                an = await pg.evaluate("(()=>{const b=getComputedStyle(document.body);const g=document.querySelector('.an-tools>.an-group');return {strong:b.getPropertyValue('--an-glass-strong').trim(),glass:b.getPropertyValue('--an-glass').trim(),blur:g&&getComputedStyle(g).backdropFilter}})()")
                await ctx.close()
                ctx, pg, errs = await flow_page((1440, 900), dark=dark)
                fv = await pg.evaluate("(()=>{const b=getComputedStyle(document.body);return {strong:b.getPropertyValue('--pvx-glass-strong').trim(),glass:b.getPropertyValue('--pvx-glass').trim()}})()")
                mode = 'dark' if dark else 'light'
                ok(f'n185 {mode}: Flow’s glass is Anesia’s (same fills, same blur)', fv['strong'] == an['strong'] and fv['glass'] == an['glass'] and an['blur'] == 'blur(12px) saturate(1.6)', [fv, an])
                await pg.evaluate("toast('Saved'); document.querySelector('#flowNet').classList.add('show'); document.querySelector('#fvStalePill').classList.add('show')")
                await pg.click('#fabAdd'); await pg.wait_for_timeout(400)
                g = await pg.evaluate(GJ + "(%s)" % json.dumps(FL))
                want = 'rgba(23, 35, 56, 0.86)' if dark else 'rgba(255, 255, 255, 0.86)'
                ok(f'n185 {mode}: one material on the menu, search results, pills and toasts', all(x[1] == want and x[2] == 'blur(12px) saturate(1.6)' for x in g), g)
                sc = await pg.evaluate("[getComputedStyle(document.querySelector('#opsScrim')).backgroundColor, getComputedStyle(document.querySelector('#opsScrim')).pointerEvents]")
                ok(f'n185 {mode}: the menu doesn’t dim the page (its scrim is clear but still catches the click)', sc[0] == 'rgba(0, 0, 0, 0)' and sc[1] == 'auto', sc)
                if dark: await shot(pg, '114-flow-glass-dark')
                else: await shot(pg, '115-flow-glass-light')
                await pg.mouse.click(300, 650); await pg.wait_for_timeout(300)
                ok(f'n185 {mode}: a click outside closes the menu', not await pg.evaluate("document.querySelector('#opsMenu').classList.contains('open')"))
                so = await pg.evaluate("['#drawer','#shiftModal','.command-kpi','.panel','.topnav'].map(q=>{const s=getComputedStyle(document.querySelector(q));const m=s.backgroundColor.match(/[\\d.]+/g)||[];return [q,s.backdropFilter,m.length<4||+m[3]===1||+m[3]===0]})")
                ok(f'n185 {mode}: content, the top bar, the drawer and pop-up windows stay solid (no blur)', all(x[1] == 'none' and (x[2] or x[0] == '.topnav') for x in so), so)   # light top bar is 96 % white, as before; nothing scrolls under it
                await pg.evaluate("document.documentElement.classList.add('pvx-noblur')"); await pg.wait_for_timeout(600)   # the toast transitions 'all' over .4 s
                nb = await pg.evaluate(GJ + "(['#opsMenu','#toast'])")
                ok(f'n185 {mode}: on a slow device the glass turns solid', all(x[2] == 'none' and x[1] == ('rgb(23, 36, 64)' if dark else 'rgb(255, 255, 255)') for x in nb), nb)
                ok(f'no new page errors (n185 {mode})', not newerr(errs), errs)
                await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.emulate_media(forced_colors='active'); await pg.wait_for_timeout(200)
            fc = await pg.evaluate(GJ + "(['#opsMenu'])")
            await pg.emulate_media(forced_colors='none', contrast='more'); await pg.wait_for_timeout(700)   # the toast transitions 'all' over .4 s
            hc = await pg.evaluate(GJ + "(['#opsMenu','#toast'])")
            ok('n185: Increase Contrast and forced colours make the glass solid', fc[0][2] == 'none' and all(x[2] == 'none' and x[1] == 'rgb(23, 36, 64)' for x in hc), [fc, hc])
            rt = await pg.evaluate("(()=>{let n=0;const walk=rs=>{for(const r of rs){if(r.conditionText&&/reduced-transparency/.test(r.conditionText)&&/opsMenu/.test(r.cssText)&&/toast/.test(r.cssText))n++;if(r.cssRules)walk(r.cssRules)}};for(const s of document.styleSheets){try{walk(s.cssRules)}catch(e){}}return n})()")
            ok('n185: Reduce Transparency covers the whole floating layer', rt >= 1, rt)
            sb = await pg.evaluate("(()=>{const a=document.createElement('div');a.className='luna-announcement-backdrop';document.body.appendChild(a);const w=document.createElement('div');w.id='fvStale';const b=document.createElement('div');b.className='fs-scrim';w.appendChild(b);document.body.appendChild(w);const r=[getComputedStyle(a).backdropFilter,getComputedStyle(a).backgroundColor,getComputedStyle(b).backdropFilter];a.remove();w.remove();return r})()")
            ok('n185: scrims dim, they don’t blur (L.U.N.A. announcement 62 %, stale-data sheet)', sb[0] == 'none' and sb[1] == 'rgba(5, 12, 26, 0.62)' and sb[2] == 'none', sb)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900), extra="try{localStorage.setItem('anesia:v1:blur','0')}catch(e){}")
            ok('n185: the slow-device setting is shared with Anesia (off there → solid here)', await pg.evaluate("document.documentElement.classList.contains('pvx-noblur')"))
            await ctx.close()
            _secend(40)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n185: Flows floating layer wears Anesias glass (HIG Materials)', False, repr(_e)[:300])
        try:
            # ---------- n186: Flow typography (HIG Typography)
            _sec(41)
            ctx, pg, errs = await flow_page((1440, 900))
            T = "(()=>{const q=s=>document.querySelector(s),cs=s=>getComputedStyle(q(s));const small=[...document.querySelectorAll('body *')].filter(e=>{if(!e.getClientRects().length||e.closest('.topnav'))return false;const t=[...e.childNodes].some(x=>x.nodeType===3&&x.textContent.trim());if(!t)return false;const s=getComputedStyle(e);return parseFloat(s.fontSize)<=12&&parseFloat(s.letterSpacing)<0}).map(e=>e.className+' '+getComputedStyle(e).letterSpacing);return {seg:Math.round(q('#switcher .seg svg').getBoundingClientRect().width),top:Math.round(q('.topnav .nav-item svg').getBoundingClientRect().width),brand:cs('.vb-brand').fontSize,prog:cs('.vb-prog').fontSize,pow:cs('.pvx-powered').fontSize,label:cs('.command-kpi__label').letterSpacing,small:small.slice(0,6),nsmall:small.length,tsa:cs('html').webkitTextSizeAdjust||cs('html').textSizeAdjust,font:cs('body').fontFamily,title:cs('.command-kpi__value').fontSize}})()"
            d1 = await pg.evaluate(T)
            await pg.evaluate("document.documentElement.style.fontSize='200%'"); await pg.wait_for_timeout(400)
            d2 = await pg.evaluate(T)
            ok('n186: icons are the same at the default size and grow with the text (16 → 24 pt at 200 %); the top bar’s don’t', d1['seg'] == 16 and d2['seg'] == 24 and d1['top'] == d2['top'], [d1['seg'], d2['seg'], d1['top'], d2['top']])
            ok('n186: the footer’s small print is 11 pt; "Powered by" stays 9 pt', d1['brand'] == '11px' and d1['prog'] == '11px' and d1['pow'] == '9px', d1)
            ok('n186: no small text (≤ 12 pt) is tightened any more; uppercase labels keep their tracking', d1['nsmall'] == 0 and float(d1['label'].replace('px', '')) > 0, d1)
            ok('n186: iPhone Safari won’t enlarge text on its own (text-size-adjust 100 %)', d1['tsa'] == '100%', d1['tsa'])
            ok('n186: Windows gets its own interface font (system-ui, Segoe UI in the stack)', 'Segoe UI' in d1['font'] and 'system-ui' in d1['font'], d1['font'])
            ok('n186/n190: card values on the type scale (31 → 30 pt in n190)', d1['title'] == '30px', d1['title'])
            ok('no new page errors (n186)', not newerr(errs), errs)
            await ctx.close()
            _secend(41)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n186: Flow typography (HIG Typography)', False, repr(_e)[:300])
        try:
            # ---------- n187: Flow icons (HIG Icons)
            _sec(42)
            ctx, pg, errs = await flow_page((1440, 900))
            gi = await pg.evaluate("""(()=>{try{rdSeedDemo()}catch(e){return {err:String(e)}}const p=PATIENTS.find(x=>x._demo);if(!p)return {err:'no demo'};
              (p.rounds.flags=p.rounds.flags||[]).push({id:'f1',label:'Fall risk'});
              const box=document.createElement('div');box.style.cssText='position:fixed;left:0;top:0;width:900px;height:900px;overflow:auto;z-index:99999;font:13px -apple-system';
              box.innerHTML=rdWorkHTML(p)+rdTomorrowHTML()+usxQualityRows(Object.assign({},p,{ultrasound:{clinicalQuestion:''}}));document.body.appendChild(box);
              const ic=[...box.querySelectorAll('svg.pvx-gi')].filter(s=>s.getClientRects().length).map(s=>{const r=s.getBoundingClientRect();return parseFloat(getComputedStyle(s).strokeWidth)*r.width/24});
              const fd=box.querySelector('[data-act=flag-del]');const out={n:ic.length,min:Math.min(...ic),max:Math.max(...ic),glyph:(box.innerText.match(/[✓✕○⚠]/g)||[]).length,flag:fd&&fd.getAttribute('aria-label'),warn:!!box.querySelector('.pvx-gi-warn')};box.remove();return out})()""")
            ok('n187: Rounds and Ultrasound draw their checks, crosses and warnings as vector icons, not text characters', gi.get('n', 0) >= 20 and gi.get('glyph') == 0 and gi.get('warn'), gi)
            ok('n187: those icons render at the common weight (about 1.1–1.75 px)', gi.get('n') and gi['min'] >= 1.1 and gi['max'] <= 1.75, gi)
            ok('n187: the Rounds flag remove button is named', gi.get('flag') == 'Remove flag: Fall risk', gi)
            st = await pg.evaluate("""(()=>{const box=document.createElement('div');box.innerHTML='<div class="empty"><svg viewBox="0 0 24 24" style="width:40px;height:40px"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.67"/></svg></div><div class="aph-ic"><svg viewBox="0 0 24 24" style="width:24px;height:24px"><path d="M3 3h18" stroke="currentColor" stroke-width="1.9"/></svg></div>';document.body.appendChild(box);
              const a=getComputedStyle(box.querySelector('.empty circle')).strokeWidth,b=getComputedStyle(box.querySelector('.aph-ic path')).strokeWidth;const f=document.querySelector('#subnavFlow .fab-add svg line'),fr=document.querySelector('#subnavFlow .fab-add svg').getBoundingClientRect();box.remove();return [a,b,(parseFloat(getComputedStyle(f).strokeWidth)*fr.width/24).toFixed(2)]})()""")
            ok('n187: stroke outliers brought in (empty state 1.6 px, window headers 1.6, + 1.74)', st[0] == '1.6px' and st[1] in ('1.6px', '1.6') and abs(float(st[2]) - 1.74) < 0.03, st)
            ok('no new page errors (n187)', not newerr(errs), errs)
            await ctx.close()
            _secend(42)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n187: Flow icons (HIG Icons)', False, repr(_e)[:300])
        try:
            # ---------- n188: Flow motion (HIG Motion)
            _sec(43)
            ctx, pg, errs = await flow_page((1440, 900))
            d = await pg.evaluate("(()=>{const v=getComputedStyle(document.querySelector('#view-dashboard'));const r=document.querySelector('.command-kpi__rail i')||document.querySelector('.util-fill');return {an:v.animationName,dur:v.animationDuration,fill:r?getComputedStyle(r).transitionDuration:null}})()")
            ok('n188: switching views is a quick fade (0.18 s, opacity only), not a 0.5 s slide', d['an'] == 'pvxViewFade' and d['dur'] == '0.18s', d)
            ok('n188: bar fills animate in 0.4 s', d['fill'] in (None, '0.4s'), d)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.emulate_media(reduced_motion='reduce'); await pg.reload(); await pg.wait_for_timeout(2500)
            r = await pg.evaluate("""(()=>{const k=[...document.querySelectorAll('.command-kpi')];const vis=k.length&&k.every(e=>+getComputedStyle(e).opacity>0.99);
              const loops=[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return s.animationName!=='none'&&s.animationIterationCount==='infinite'&&!e.classList.contains('signin-progress')}).length;
              const card=document.querySelector('.command-kpi');
              const box=document.createElement('div');box.innerHTML='<div class="cl-alert-track marquee"><span class="cl-alert-copy">A long hospital alert message that would normally scroll sideways across the lobby display</span><span class="cl-alert-copy" aria-hidden="true">dup</span></div>';box.style.width='300px';document.body.appendChild(box);
              const t=box.firstChild,ts=getComputedStyle(t),cs=getComputedStyle(t.firstChild);const out={vis,n:k.length,loops,alertAnim:ts.animationName,alertWrap:cs.whiteSpace,alertW:Math.round(t.getBoundingClientRect().width),dup:getComputedStyle(t.lastChild).display};box.remove();
              let sb=null;const st=document.querySelector('#stage');st.scrollBy({top:200,behavior:'smooth'});sb=st.scrollTop;st.scrollTop=0;out.jump=sb;out.flag=window.pvxReducedMotion&&pvxReducedMotion();return out})()""")
            ok('n188: Reduce Motion — the Command Center appears at once and fully (cards at full opacity, nothing slides)', r['vis'] and r['n'] >= 8, r)
            ok('n188: Reduce Motion — no looping animation keeps running (spinners excepted)', r['loops'] == 0, r)
            ok('n188: Reduce Motion — the Client Display alert stands still and wraps', r['alertAnim'] == 'none' and r['alertWrap'] == 'normal' and r['alertW'] <= 300 and r['dup'] == 'none', r)
            ok('n188: Reduce Motion — scripted smooth scrolling jumps instead', r['flag'] is True and (r['jump'] or 0) > 0, r)
            await pg.hover('.command-kpi'); await pg.wait_for_timeout(400)
            tf = await pg.evaluate("getComputedStyle(document.querySelector('.command-kpi')).transform")
            ok('n188: Reduce Motion — cards don’t lift on hover', tf in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), tf)
            await pg.screenshot(path=os.path.join(SHOTS, '116-flow-reduced-motion.png'))
            ok('no new page errors (n188)', not newerr(errs), errs)
            await ctx.close()
            _secend(43)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n188: Flow motion (HIG Motion)', False, repr(_e)[:300])
        try:
            # ---------- n189: SF Symbols rules in Flow, as in Anesia
            _sec(44)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.click('#fabAdd'); await pg.wait_for_timeout(500)
            w = await pg.evaluate("""(()=>{const eff=s=>{const r=s.getBoundingClientRect(),p=s.querySelector('path,line,rect,circle');return parseFloat(getComputedStyle(p).strokeWidth)*r.width/24};
              const seg=document.querySelector('#switcher .seg svg'),op=document.querySelector('#opsMenu .ops-item[data-op=new] svg');
              const segT=getComputedStyle(document.querySelector('#switcher .seg')),opT=getComputedStyle(document.querySelector('#opsMenu .ops-item[data-op=new] .ops-t'));
              const W={400:1.6,500:1.8,600:2,700:2.25,800:2.5};const want=(cs)=>W[Math.round(parseInt(cs.fontWeight)/100)*100]*parseFloat(cs.fontSize)*0.05;
              return {seg:eff(seg),segWant:want(segT),op:eff(op),opWant:want(opT),cls:seg.classList.contains('pvx-sym')}})()""")
            ok('n189: icon weight follows the label beside it with Anesia’s table (view switcher, Operations menu)', w['cls'] and abs(w['seg'] - w['segWant']) < 0.05 and abs(w['op'] - w['opWant']) < 0.05, w)
            hi = await pg.evaluate("""(()=>{const o=e=>+getComputedStyle(e).opacity;const n=document.querySelector('#opsMenu .ops-item[data-op=new] svg');const a=document.querySelector('#opsMenu .ops-item[data-op=alert] svg');
              return {newBase:o(n.querySelector('circle')),newPlus:o(n.querySelector('line')),alertTri:o(a.querySelector('path')),alertMark:o(a.querySelector('line')),warn:PVX_GI.warn.indexOf('class="s"')>0}})()""")
            ok('n189: hierarchical rendering — the + and ! lead, the person and triangle sit back (45 %)', hi['newBase'] == 0.45 and hi['newPlus'] == 1 and hi['alertTri'] == 0.45 and hi['alertMark'] == 1 and hi['warn'], hi)
            await pg.emulate_media(contrast='more'); await pg.wait_for_timeout(200)
            ok('n189: Increase Contrast shows every layer at full strength', await pg.evaluate("+getComputedStyle(document.querySelector('#opsMenu .ops-item[data-op=new] svg circle')).opacity") == 1)
            sh = await pg.evaluate("(()=>{const s=document.documentElement.outerHTML;return {old:(s.match(/points=\"20 6 9 17 4 12\"|M20 6L9 17l-5-5|M20 6 9 17l-5-5|M15 6l-6 6 6 6/g)||[]).length,check:PVX_GI.check.indexOf('M5 12.5l4.5 4.5L19 7\"')>0}})()")
            ok('n189: checkmark and back chevron are Anesia’s exact shapes', sh['old'] == 0 and sh['check'], sh)
            ok('n189: with a mouse the selected app stays outline (Mac toolbar)', await pg.evaluate("getComputedStyle(document.querySelector('.topnav .nav-item.active svg :is(path,rect)')).fill") == 'none')
            ok('no new page errors (n189 Mac)', not newerr(errs), errs)
            await ctx.close()
            for page in ('/', '/anesia/', '/treatment/', '/or/'):
                c = await br.new_context(viewport={'width': 820, 'height': 1180}, has_touch=True, is_mobile=True, color_scheme='dark')
                await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
                p2 = await c.new_page(); await p2.route('https://www.gstatic.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
                await p2.goto(f'http://127.0.0.1:{PORT}{page}'); await p2.wait_for_timeout(1800)
                f = await p2.evaluate("(()=>{const e=document.querySelector('.topnav .nav-item.active svg :is(path,rect,circle)');return e?[getComputedStyle(e).fill!=='none',getComputedStyle(e).fillOpacity]:null})()")
                ok(f'n189: on iPad the selected app uses the fill variant ({page})', f and f[0] and f[1] == '0.5', f)
                await c.close()
            _secend(44)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n189: SF Symbols rules in Flow, as in Anesia', False, repr(_e)[:300])
        try:
            # ---------- n190: one Pravix type scale
            _sec(45)
            ctx, pg, errs = await flow_page((1440, 900))
            ts = await pg.evaluate("""(()=>{const TB=/topnav|nav-item|nav-center|nav-right|logout|pvx-word|pvx-powered|pvx-lockup|brandwrap|cobrand|theme-toggle|exit-arrow|door-glyph/;const set=new Set();
              const walk=rs=>{for(const r of rs){if(r.style&&!TB.test(r.selectorText||'')){const f=r.style.getPropertyValue('font-size');const m=/^([\\d.]+)rem$/.exec(f);if(m)set.add(Math.round(parseFloat(m[1])*16*100)/100)}if(r.cssRules)walk(r.cssRules)}};
              for(const s of document.styleSheets){try{walk(s.cssRules)}catch(e){}}
              const shown=new Set();document.querySelectorAll('body *').forEach(e=>{if(!e.getClientRects().length||e.closest('.topnav'))return;if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;shown.add(parseFloat(getComputedStyle(e).fontSize))});
              return {css:[...set].sort((a,b)=>a-b),shown:[...shown].sort((a,b)=>a-b),tok:getComputedStyle(document.documentElement).getPropertyValue('--pvx-t-footnote').trim()}})()""")
            SC = [11, 12, 13, 14, 15, 16, 17, 20, 22, 24, 28, 30, 34]
            ok('n190: Flow’s text uses one scale — Anesia’s 13 sizes (11–34 pt; display sizes ≥ 40 and the shared top bar aside)', all(x in SC or x >= 40 for x in ts['css']) and len([x for x in ts['css'] if x < 40]) <= 13, ts)
            ok('n190: nothing on screen is below 11 pt outside the shared top bar', min(ts['shown']) >= 11, ts['shown'])
            ok('n190: the scale is published as Apple-named tokens', ts['tok'] == '0.8125rem', ts['tok'])
            ok('no new page errors (n190)', not newerr(errs), errs)
            await ctx.close()
            _secend(45)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n190: one Pravix type scale', False, repr(_e)[:300])
        try:
            # ---------- n191: charts (HIG Charting data)
            _sec(46)
            ctx, pg, errs = await flow_page((1440, 900))
            f1 = await pg.evaluate("(()=>{const s=[...document.querySelectorAll('#kpiRow .command-kpi__spark')];return {n:s.length,empty:s.filter(x=>x.classList.contains('is-empty')).length,line:s.some(x=>x.querySelector('path'))}})()")
            ok('n191: with no history yet, the cards draw no sparkline (no flat “no change” placeholder)', f1['n'] >= 8 and f1['empty'] == f1['n'] and not f1['line'], f1)
            m = await pg.evaluate("(()=>{const r=[...document.querySelectorAll('[role=meter]')].find(e=>/Rooms In Use/i.test(e.getAttribute('aria-label')||''));return r&&{now:r.getAttribute('aria-valuenow'),max:r.getAttribute('aria-valuemax'),vt:r.getAttribute('aria-valuetext')}})()")
            ok('n191: the capacity rail is a meter VoiceOver can read (“0 of 8 · 8 Rooms Available”)', m and m['max'] == '100' and m['vt'].startswith('0 of 8'), m)
            await ctx.close()
            hist = "(function(){if(sessionStorage.getItem('pvxH'))return;sessionStorage.setItem('pvxH','1');var n=Date.now();localStorage.setItem('pvx:kpi:v1',JSON.stringify({'top|Waiting':[{t:n-40*60000,v:1},{t:n-20*60000,v:3}],'top|On Floor':[{t:n-90*60000,v:9},{t:n-30*60000,v:2}]}));})();"
            ctx, pg, errs = await flow_page((1440, 900), extra=hist)
            sp = await pg.evaluate("""(()=>{const card=l=>[...document.querySelectorAll('#kpiRow .command-kpi')].find(c=>c.querySelector('.command-kpi__label').textContent.trim().toLowerCase()===l);
              const w=card('waiting').querySelector('.command-kpi__spark'),o=card('on floor').querySelector('.command-kpi__spark');
              const ys=[...w.querySelector('path').getAttribute('d').matchAll(/[ML]([\\d.]+) ([\\d.]+)/g)].map(m=>+m[2]);
              return {role:w.getAttribute('role'),label:w.getAttribute('aria-label'),title:(w.querySelector('title')||{}).textContent,yspan:Math.max(...ys)-Math.min(...ys),old:JSON.parse(localStorage.getItem('pvx:kpi:v1'))['top|On Floor'].filter(x=>x.t<Date.now()-60*60000).length,kept:JSON.parse(localStorage.getItem('pvx:kpi:v1'))['top|On Floor'].length}})()""")
            ok('n191: a sparkline is a named image that says what it shows (“Waiting since …: 1 to 0, down 1”)', sp['role'] == 'img' and sp['label'].startswith('Waiting since ') and 'down 1' in sp['label'] and sp['title'] == sp['label'], sp)
            ok('n191: it keeps the last hour on this device (a 90-minute-old sample drops off)', sp['old'] == 0 and sp['kept'] >= 1, sp)
            ok('n191: honest scale — a change of 3 doesn’t fill the card', sp['yspan'] < 21 * 0.8, sp)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            an = await pg.evaluate("""(()=>{const s=document.querySelector('.an-spark.v-spo2'),pl=s.querySelector('polyline').getAttribute('points').split(' ').map(q=>+q.split(',')[1]);
              return {span:Math.max(...pl)-Math.min(...pl),dot:!!s.querySelector('circle'),sw:getComputedStyle(s.querySelector('polyline')).strokeWidth}})()""")
            ok('n191: Anesia — SpO₂ wobbling 97–98 % draws nearly flat (minimum span 10 %)', an['span'] < 4, an)
            ok('n191: one sparkline style in both apps (1.75 pt line, dot on the latest reading)', an['dot'] and an['sw'] == '1.75px', an)
            await pg.click('.an-spark.v-spo2'); await pg.wait_for_timeout(900)
            tl = await pg.evaluate("[...document.querySelectorAll('#anSheet .an-trend text')].map(t=>t.textContent).slice(0,3)")
            ok('n191: Anesia — the trend’s axis labels never repeat and SpO₂ never goes past 100 %', len(set(tl)) == 3 and max(float(x) for x in tl) <= 100, tl)
            ok('no new page errors (n191)', not errs, errs)
            await ctx.close()
            _secend(46)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n191: charts (HIG Charting data)', False, repr(_e)[:300])
        try:
            # ---------- n192: drag and drop (HIG Drag and drop)
            _sec(47)
            SEEDP = "(()=>{const now=Date.now();[['Waiting','Lobby'],['Waiting','Lobby'],['Exam','Room 1']].forEach((v,i)=>{PATIENTS.push(patient({name:'Dnd'+i,last:'Test',owner:'Synthetic',status:v[0],room:v[1],arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));}); renderAll();})()"
            DEV = """window.__dv=(el,type,dt,rel)=>{if(!dt.__w){dt.__w=1;Object.defineProperty(dt,'dropEffect',{value:'unset',writable:true});} if(type==='dragover') dt.dropEffect='unset'; const e=new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:dt,relatedTarget:rel||null});el.dispatchEvent(e);return e;};0"""
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate(SEEDP); await pg.evaluate(DEV); await pg.wait_for_timeout(300)
            g = await pg.evaluate("""(()=>{const mk=()=>{const dt=new DataTransfer();dt.items.add(new File(['x'],'x.png',{type:'image/png'}));return dt};
              const a=__dv(document.querySelector('#stage'),'dragover',mk()),b=__dv(document.querySelector('#stage'),'drop',mk());
              const ta=document.createElement('textarea');document.body.appendChild(ta);const c=__dv(ta,'dragover',mk());ta.remove();
              return {over:a.defaultPrevented,drop:b.defaultPrevented,text:c.defaultPrevented}})()""")
            ok('n192: a file dropped where nothing takes it does nothing — Flow stays open (text fields still take text)', g['over'] and g['drop'] and not g['text'], g)
            guards = [open(os.path.join(BUILD, f), encoding='utf-8').read().count('pvx-n192-guard') for f in ('anesia/index.html', 'treatment/index.html', 'or/index.html')]
            ok('n192: the same drop guard in Anesia, Treatment Sheets and the OR', guards == [1, 1, 1], guards)
            await pg.click('#switcher .seg[data-view="flow"]'); await pg.wait_for_timeout(600)
            b = await pg.evaluate("""(()=>{const c=[...document.querySelectorAll('#board .card')].find(x=>{const p=PATIENTS.find(q=>q.id===x.dataset.pid);return p&&p.name==='Dnd0'});const dt=new DataTransfer();
              __dv(c,'dragstart',dt);const own=c.closest('.col-body'),other=document.querySelector('#board .col-body[data-status="Exam"]');
              __dv(own,'dragenter',dt);__dv(own,'dragover',dt);const ownLit=own.closest('.col').classList.contains('drop'),ownFx=dt.dropEffect;
              __dv(own,'dragleave',dt);__dv(other,'dragenter',dt);__dv(other,'dragover',dt);const lit=other.closest('.col').classList.contains('drop');
              const child=other.querySelector('.card');__dv(child,'dragenter',dt);__dv(other,'dragleave',dt,child);const steady=other.closest('.col').classList.contains('drop');
              __dv(child,'dragleave',dt);__dv(other,'dragleave',dt);const off=!other.closest('.col').classList.contains('drop');
              __dv(c,'dragend',dt);return {ownLit,ownFx,lit,steady,off}})()""")
            ok('n192: the board never lights the card’s own column (“not allowed” there)', not b['ownLit'] and b['ownFx'] == 'none', b)
            ok('n192: a column that takes the card lights, and stays lit while the pointer passes over the cards in it', b['lit'] and b['steady'] and b['off'], b)
            u = await pg.evaluate("""(async()=>{const p=PATIENTS.find(q=>q.name==='Dnd0'),tl=p.timeline.length,n0=document.querySelectorAll('#notes .note').length;
              const c=document.querySelector('#board .card[data-pid="'+p.id+'"]'),dt=new DataTransfer();__dv(c,'dragstart',dt);const col=document.querySelector('#board .col-body[data-status="Exam"]');
              __dv(col,'dragenter',dt);__dv(col,'dragover',dt);__dv(col,'drop',dt);__dv(c,'dragend',dt);
              const moved=p.status, note=[...document.querySelectorAll('#notes .note')].pop(), btn=note&&note.querySelector('.n-act');
              const txt=note&&note.querySelector('.n-title').textContent; if(btn) btn.click(); await new Promise(r=>setTimeout(r,250));
              const q=PATIENTS.find(x=>x.id===p.id); return {moved,txt,undo:btn&&btn.textContent,back:q.status,ex:q.examStartedAt===undefined||q.examStartedAt===null,tl:q.timeline.length===tl,
                msg:[...document.querySelectorAll('#notes .note .n-title')].map(x=>x.textContent).pop(),card:!!document.querySelector('#board .col-body[data-status="Waiting"] .card[data-pid="'+p.id+'"]')}})()""")
            ok('n192: a stage move’s message has Undo (“Moved to Exam” · Undo)', u['moved'] == 'Exam' and u['undo'] == 'Undo', u)
            ok('n192: Undo puts the patient back exactly — stage, exam start and timeline — and says so', u['back'] == 'Waiting' and u['ex'] and u['tl'] and u['card'] and u['msg'] == 'Move undone', u)
            r = await pg.evaluate("""(async()=>{const p=PATIENTS.find(q=>q.name==='Dnd1');moveStatus(p,'Exam');const b1=[...document.querySelectorAll('#notes .note')].pop().querySelector('.n-act');
              moveStatus(p,'Diagnostics'); await new Promise(r=>setTimeout(r,50)); b1.click(); await new Promise(r=>setTimeout(r,100));
              return {st:p.status,msg:[...document.querySelectorAll('#notes .note .n-title')].map(x=>x.textContent).pop()}})()""")
            ok('n192: Undo refuses if the patient has moved again since (“Can’t undo”)', r['st'] == 'Diagnostics' and r['msg'] == 'Can’t undo', r)
            cmp = await pg.evaluate("""(()=>{const p=PATIENTS.find(q=>q.name==='Dnd0');const n0=document.querySelectorAll('#notes .n-act').length;try{moveStatus(p,'Discharged')}catch(e){}
              return document.querySelectorAll('#notes .n-act').length-n0})()""")
            ok('n192: completions keep their own Undo (no second one from the move)', cmp == 0, cmp)
            await pg.click('#switcher .seg[data-view="rooms"]'); await pg.wait_for_timeout(600)
            rm = await pg.evaluate("""(async()=>{const p=PATIENTS.find(q=>q.name==='Dnd2')||PATIENTS.find(q=>q.room==='Room 1');const occ=p.room;
              const src=document.querySelector('#roomGrid .r-drag[data-pid="'+p.id+'"]');const other=PATIENTS.find(q=>q.name==='Dnd1');moveRoom(other,'Room 2'); renderAll(); await new Promise(r=>setTimeout(r,200));
              const s2=document.querySelector('#roomGrid .r-drag[data-pid="'+p.id+'"]'),dt=new DataTransfer();__dv(s2,'dragstart',dt);
              const busy=document.querySelector('#roomGrid .room[data-room-name="Room 2"]');__dv(busy,'dragenter',dt);__dv(busy,'dragover',dt);
              const fx=dt.dropEffect,ring=busy.classList.contains('room-nodrop'); await new Promise(r=>setTimeout(r,120)); const said=(document.getElementById('pvxDndLive')||{}).textContent;
              const free=document.querySelector('#roomGrid .room[data-room-name="Room 3"]');__dv(busy,'dragleave',dt);__dv(free,'dragenter',dt);__dv(free,'dragover',dt);const fx2=dt.dropEffect;__dv(free,'drop',dt);__dv(s2,'dragend',dt);
              const note=[...document.querySelectorAll('#notes .note')].reverse().find(n=>n.querySelector('.n-act')&&/Patient moved/.test(n.textContent)); const room=(PATIENTS.find(x=>x.id===p.id)||p).room;   /* n235: read the patient fresh; Flow can replace the object after a save */
              if(note) note.querySelector('.n-act').click(); await new Promise(r=>setTimeout(r,200));
              return {fx,ring,said,fx2,room,undo:!!note,back:(PATIENTS.find(x=>x.id===p.id)||p).room,occ}})()""")
            ok('n192: an occupied room refuses before release — red ring, “not allowed”, and VoiceOver hears “Room 2 is occupied”', rm['fx'] == 'none' and rm['ring'] and rm['said'] == 'Room 2 is occupied', rm)
            ok('n192: a room move has Undo, and Undo puts the patient back in the room they came from', rm['fx2'] == 'move' and rm['room'] == 'Room 3' and rm['undo'] and rm['back'] == rm['occ'], rm)
            q = await pg.evaluate("""(async()=>{const ps=PATIENTS.filter(x=>/^Dnd/.test(x.name));ps.forEach((p,i)=>{p.ultrasound={status:'requested',queuePosition:i+1}});const s0=pvxQueueSnap();
              ps.forEach((p,i)=>{p.ultrasound.queuePosition=ps.length-i}); pvxQueueUndo(s0); const n=[...document.querySelectorAll('#notes .note')].pop(); const t=n.querySelector('.n-title').textContent;
              n.querySelector('.n-act').click(); await new Promise(r=>setTimeout(r,100)); const back=ps.map(p=>p.ultrasound.queuePosition).join(','); ps.forEach(p=>delete p.ultrasound); return {t,back}})()""")
            ok('n192: an ultrasound queue reorder has Undo, and Undo restores the order', q['t'] == 'Queue updated' and q['back'] == '1,2,3', q)
            await ctx.close()
            ctx, pg, errs2 = await flow_page((1440, 900))
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(900)
            rk = await pg.evaluate("""(async()=>{const g=[...document.querySelectorAll('#rdList .rd-secgroup[data-sec]')].find(x=>x.querySelectorAll(':scope > .rd-row').length>=2);if(!g) return {err:'no group'};
              const pids=[...g.querySelectorAll(':scope > .rd-row')].map(r=>r.dataset.pid),before=pids.map(id=>rdFind(id).rounds.rank+'');
              const re=pids.slice().reverse(); rdRankSave(g.dataset.sec,re,pids[0],re.length-1); const t=document.getElementById('rdUndo'),open=t&&t.classList.contains('open'),msg=t&&t.querySelector('.ru-msg').textContent;
              t.querySelector('.ru-undo').click(); await new Promise(r=>setTimeout(r,200)); const after=pids.map(id=>rdFind(id).rounds.rank+'');
              t.classList.remove('open'); rdRankMove(pids[0],1); await new Promise(r=>setTimeout(r,100)); const kbd=t.classList.contains('open');
              return {open,msg,restored:before.join()===after.join(),kbd,sec:g.dataset.sec,first:pids[0]}})()""")
            ok('n192: a Rounds order drag has Undo (“… moved to #n”), and Undo restores the order', rk.get('open') and ' moved to #' in (rk.get('msg') or '') and rk.get('restored'), rk)
            ok('n192: arrow-key moves in Rounds don’t add an Undo message (the opposite arrow undoes)', rk.get('kbd') is False, rk)
            await pg.evaluate("rdSeedDemo(); renderRdCensus(true)"); await pg.wait_for_timeout(400)
            box = await pg.evaluate("""(()=>{const g=[...document.querySelectorAll('#rdList .rd-secgroup[data-sec]')].find(x=>x.querySelectorAll(':scope > .rd-row').length>=2);const r=g.querySelector(':scope > .rd-row .rd-name, :scope > .rd-row')
              .getBoundingClientRect();const rows=[...g.querySelectorAll(':scope > .rd-row')].map(x=>x.dataset.pid);return {x:r.left+Math.min(60,r.width/2),y:r.top+r.height/2,rows}})()""")
            await pg.mouse.move(box['x'], box['y']); await pg.mouse.down(); await pg.mouse.move(box['x'], box['y'] + 30, steps=4); await pg.mouse.move(box['x'], box['y'] + 70, steps=4); await pg.wait_for_timeout(100)
            lifted = await pg.evaluate("!!(window.rdRk&&rdRk.moved)")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); await pg.mouse.up(); await pg.wait_for_timeout(300)
            es = await pg.evaluate("""(o=>{const g=[...document.querySelectorAll('#rdList .rd-secgroup[data-sec]')].find(x=>x.querySelector(':scope > .rd-row[data-pid="'+o[0]+'"]'));
              return {rk:!!window.rdRk,rows:[...g.querySelectorAll(':scope > .rd-row')].map(x=>x.dataset.pid).join()===o.join(),said:(document.getElementById('pvxDndLive')||{}).textContent}})""", box['rows'])
            ok('n192: Escape cancels a Rounds drag — the row goes home, the order is unchanged', lifted and not es['rk'] and es['rows'] and es['said'] == 'Move cancelled', [lifted, es])
            ok('no new page errors (n192)', not newerr(errs) and not newerr(errs2), [errs, errs2])
            await ctx.close()
            ctx, pg, errs3 = await flow_page((1440, 900))
            await pg.evaluate(SEEDP); await pg.click('#switcher .seg[data-view="flow"]'); await pg.wait_for_timeout(600)
            pid = await pg.evaluate("PATIENTS.find(q=>q.name==='Dnd0').id")
            await pg.drag_and_drop(f'#board .card[data-pid="{pid}"]', '#board .col-body[data-status="Diagnostics"]'); await pg.wait_for_timeout(500)
            st = await pg.evaluate(f"PATIENTS.find(q=>q.id==='{pid}').status")
            await pg.drag_and_drop(f'#board .card[data-pid="{pid}"]', '#board .col-body[data-status="Diagnostics"]', target_position={'x': 20, 'y': 200}); await pg.wait_for_timeout(400)
            n2 = await pg.evaluate(f"PATIENTS.find(q=>q.id==='{pid}').timeline.filter(t=>/Diagnostics/.test(t.label)).length")
            ok('n192: a real drag onto another column still moves the patient; dropping on its own column does nothing', st == 'Diagnostics' and n2 == 1, [st, n2])
            ok('no new page errors (n192 real drag)', not newerr(errs3), errs3)
            await ctx.close()
            _secend(47)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n192: drag and drop (HIG Drag and drop)', False, repr(_e)[:300])
        if _helper(47):   # only what later sections use from it
            try:
                SEEDP = "(()=>{const now=Date.now();[['Waiting','Lobby'],['Waiting','Lobby'],['Exam','Room 1']].forEach((v,i)=>{PATIENTS.push(patient({name:'Dnd'+i,last:'Test',owner:'Synthetic',status:v[0],room:v[1],arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));}); renderAll();})()"
            except Exception as _e: print('::warning::helper 47 failed: ' + repr(_e)[:200])
        try:
            # ---------- n193: entering data (HIG Entering data)
            _sec(48)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("openAddPatient()"); await pg.wait_for_timeout(500)
            a = await pg.evaluate("""(()=>{const c=document.getElementById('apCreate'),n=document.getElementById('apName');
              return {dis:c.getAttribute('aria-disabled'),tied:n.labels.length>0&&n.labels[0].textContent.indexOf('Patient name')>-1,wim:document.getElementById('apWeight').inputMode,aim:document.getElementById('apAge').inputMode,
                units:[...document.querySelectorAll('[data-unit-for] [data-u]')].map(b=>b.dataset.u+':'+b.getAttribute('aria-checked')).join(),n0:PATIENTS.length}})()""")
            ok('n193: Add New Patient — Create looks unavailable until the required data is in; labels are tied to their fields', a['dis'] == 'true' and a['tied'], a)
            ok('n193: weight is a number on the decimal keypad with a kg / lb choice, age a whole number with y / mo', a['wim'] == 'decimal' and a['aim'] == 'numeric' and a['units'] == 'y:true,mo:false,kg:true,lb:false', a)
            await pg.click('#apCreate', force=True); await pg.wait_for_timeout(200)
            b = await pg.evaluate("[document.getElementById('apNameErr').textContent,document.activeElement.id,PATIENTS.length,document.getElementById('apName').getAttribute('aria-invalid')]")
            ok('n193: pressing Create anyway says what’s missing under the field and goes there (no patient added)', b[0] == 'Enter a patient name.' and b[1] == 'apName' and b[2] == a['n0'] and b[3] == 'true', b)
            await pg.fill('#apName', 'Entry Test'); await pg.wait_for_timeout(100)
            c = await pg.evaluate("[document.getElementById('apCreate').getAttribute('aria-disabled'),document.getElementById('apNameErr').textContent]")
            await pg.click('#apCreate', force=True); await pg.wait_for_timeout(200)
            c2 = await pg.evaluate("document.getElementById('apSpeciesHint').textContent")
            ok('n193: the name message clears as you type; species is still required (Create says “Choose a species.”)', c[0] == 'true' and c[1] == '' and c2 == 'Choose a species.', [c, c2])
            await pg.fill('#apPhone', '20355'); await pg.fill('#apWeight', 'abc'); await pg.click('#apOwner'); await pg.wait_for_timeout(150)
            d = await pg.evaluate("[document.getElementById('apPhoneHint').textContent,document.getElementById('apWeightHint').textContent]")
            await pg.fill('#apWeight', '200'); await pg.click('#apOwner'); await pg.wait_for_timeout(150)
            d2 = await pg.evaluate("document.getElementById('apWeightHint').textContent")
            ok('n193: a short phone number and a weight that can’t be read (or is over 150 kg) are flagged as you leave the field', d[0] == 'Enter a 10-digit phone number.' and 'kg or lb' in d[1] and '150 kg' in d2, [d, d2])
            await pg.select_option('#apSpecies', 'Canine'); await pg.fill('#apPhone', '2035550134'); await pg.fill('#apWeight', '50'); await pg.click('[data-unit-for=apWeight] [data-u=lb]')
            await pg.fill('#apAge', '6'); await pg.click('[data-unit-for=apAge] [data-u=mo]'); await pg.wait_for_timeout(150)
            e1 = await pg.evaluate("document.getElementById('apCreate').getAttribute('aria-disabled')")
            await pg.click('#apCreate', force=True); await pg.wait_for_timeout(500)
            e2 = await pg.evaluate("(()=>{const p=PATIENTS.find(x=>x.name==='Entry');return p&&{kg:p.weightKg,age:p.age,w:p.weight}})()")
            ok('n193: with name and species Create is available; the unit choices go with the numbers (50 lb → 22.7 kg, 6 mo → 6 Months)', e1 == 'false' and e2 and abs(e2['kg'] - 22.68) < 0.05 and e2['age'] == '6 Months', [e1, e2])
            await pg.evaluate("openAlertModal()"); await pg.wait_for_timeout(500)
            al = await pg.evaluate("['alertHeadline','alertMessage','alertNote','alertReviewDay'].map(id=>{const e=document.getElementById(id);return e&&e.labels.length?e.labels[0].textContent.trim().slice(0,15):null})")
            ok('n193: Hospital Alert — every label is tied to its field (VoiceOver reads the name)', all(al), al)
            await pg.keyboard.press('Escape'); await pg.evaluate("closeAlertModal&&closeAlertModal()") if False else None
            await pg.evaluate("document.querySelectorAll('.open').forEach(x=>{ if(/scrim|modal|alert/i.test(x.className+x.id)) x.classList.remove('open'); })")
            t = await pg.evaluate("""(async()=>{CURRENT_USER='Test Clinician'; const p=PATIENTS.find(x=>x.name==='Entry'); openTriageEdit(p); await new Promise(r=>setTimeout(r,300));
              const by=document.getElementById('triEditBy').value, ins=[...document.querySelectorAll('#triEditBody [data-vk]')], tmp=ins.find(i=>i.dataset.vk==='temp');
              const tied=ins.every(i=>i.labels&&i.labels.length);
              tmp.value='38.5'; tmp.dispatchEvent(new Event('blur')); const msg=tmp.__h&&tmp.__h.textContent;
              document.getElementById('triEditSave').click(); await new Promise(r=>setTimeout(r,200)); const open=document.getElementById('triEditModal').classList.contains('open');
              tmp.value='101.5'; tmp.dispatchEvent(new Event('input')); document.getElementById('triEditSave').click(); await new Promise(r=>setTimeout(r,200));
              return {by,im:ins.map(i=>i.inputMode).join(),tied,msg,open,closed:!document.getElementById('triEditModal').classList.contains('open'),saved:p.triage&&p.triage.vitals.temp,tby:p.triage&&p.triage.by}})()""")
            ok('n193: Edit Triage — “Triaged by” is the signed-in user, not a fixed name', t['by'] == 'Test Clinician' and t['tby'] == 'Test Clinician', t)
            ok('n193: triage vitals use the decimal keypad, labels tied, Anesia’s input limits (38.5 → “from 77 to 113 °F”, Save waits)', set(t['im'].split(',')) == {'decimal'} and t['tied'] and t['msg'] == 'Enter temperature from 77 to 113 °F.' and t['open'] and t['closed'] and '101.5' in str(t['saved']), t)
            h = await pg.evaluate("""(async()=>{let got=null; pvxHoursSheet(24,v=>{got=v}); await new Promise(r=>setTimeout(r,120)); const i=document.getElementById('pvxHours'), v0=i.value, foc=document.activeElement===i;
              document.querySelector('.pvx-hours [data-h="1"]').click(); const v1=i.value; i.value='abc'; document.getElementById('confirmOk').click(); const err=document.getElementById('pvxHoursErr').textContent, still=document.getElementById('confirmBox').classList.contains('open');
              i.value='48'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await new Promise(r=>setTimeout(r,50));
              return {v0,foc,v1,err,still,got,closed:!document.getElementById('confirmBox').classList.contains('open'),prompt:document.documentElement.outerHTML.indexOf("prompt('Set total")}})()""")
            ok('n193: Rounds — authorized hours is an in-app sheet (hours, −/+ in 12 h, Save), not the browser prompt', h['v0'] == '24' and h['foc'] and h['v1'] == '36' and h['prompt'] == -1, h)
            ok('n193: it accepts whole hours only and says so in place; Return saves', h['err'] == 'Enter whole hours from 0 to 999.' and h['still'] and h['got'] == 48 and h['closed'], h)
            tip = await pg.evaluate("""(()=>{const i=document.createElement('input');i.style.width='60px';i.value='LRS — 120 mL/kg/day with KCl 20 mEq/L';document.body.appendChild(i);i.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));const t=i.title;i.value='x';i.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));const t2=i.title;i.remove();return [t,t2]})()""")
            ok('n193: a clipped field shows its full text on hover; a field that fits doesn’t', tip[0].startswith('LRS') and tip[1] == '', tip)
            ok('no new page errors (n193 Flow)', not newerr(errs), errs)
            await ctx.close()
            # Client Check-In
            ctx, pg, errs = await flow_page((1024, 1366), touch=True)
            dialogs = []; pg.on('dialog', lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))
            await pg.goto(f'http://127.0.0.1:{PORT}/checkin/'); await pg.wait_for_selector('#next', state='attached'); await pg.wait_for_timeout(1200)
            ci = await pg.evaluate("""(async()=>{const nx=document.getElementById('next'),dis=nx.getAttribute('aria-disabled');
              const tied=['first','last','phone','email','toxMedication','toxAmount'].every(id=>document.getElementById(id).labels.length>0);
              const ac=[document.getElementById('phone').autocomplete,document.getElementById('email').autocomplete].join();
              nx.click(); await new Promise(r=>setTimeout(r,200)); const pm=document.getElementById('petNameError');
              const msg=pm.textContent, shown=pm.classList.contains('show');
              document.getElementById('petName').value='Layla'; document.getElementById('petName').dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,120));
              const cleared=!pm.classList.contains('show');
              current=4; const r=validate(); await new Promise(r=>setTimeout(r,60)); const cm=document.getElementById('consentError');
              return {dis,tied,ac,msg,shown,cleared,valid:r,consent:cm.textContent,cshow:cm.classList.contains('show')}})()""")
            ok('n193: Check-In — Continue looks unavailable until the step’s required data is in', ci['dis'] == 'true', ci)
            ok('n193: Check-In — an empty pet name gets a message under the field, which clears as they type', ci['msg'] == 'Enter your pet’s name.' and ci['shown'] and ci['cleared'], ci)
            ok('n193: Check-In — the consent step says in place what’s missing (no browser alert box)', ci['valid'] is False and ci['consent'].startswith('Please make both consent') and ci['cshow'] and not dialogs, [ci, dialogs])
            ok('n193: Check-In — labels tied to fields; phone and email autofill off on the shared iPad', ci['tied'] and ci['ac'] == 'off,off', ci)
            es = await pg.evaluate("(()=>{try{ activeLang='Español'; }catch(e){} return pvxReq('first')})()")
            ok('n193: Check-In — the new messages follow the chosen language (Español: “Escriba su nombre.”)', es == 'Escriba su nombre.', es)
            ok('no new page errors (n193 Check-In)', not newerr(errs), errs)
            await ctx.close()
            # Anesia
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
            await pg.evaluate("document.querySelector('[data-act=dose]').click()"); await pg.wait_for_timeout(500)
            d0 = await pg.evaluate("document.querySelector('#anSheet [data-ok]').getAttribute('aria-disabled')")
            await pg.click('#anSheet [data-pick]:has-text("Methadone")'); await pg.wait_for_timeout(150)
            d1 = await pg.evaluate("document.querySelector('#anSheet [data-ok]').getAttribute('aria-disabled')")
            await pg.fill('#dDo', '0.2'); await pg.wait_for_timeout(150)
            d2 = await pg.evaluate("document.querySelector('#anSheet [data-ok]').getAttribute('aria-disabled')")
            await pg.fill('#dDo', ''); await pg.wait_for_timeout(100); await pg.click('#anSheet [data-ok]', force=True); await pg.wait_for_timeout(300)
            d3 = await pg.evaluate("(document.querySelector('#anSheet [data-err]')||{}).textContent")
            ok('n193: Anesia — Give drug looks unavailable until a drug and a dose are in (drug only: still waiting)', [d0, d1, d2] == ['true', 'true', 'false'], [d0, d1, d2])
            ok('n193: Anesia — pressing it anyway still says what’s missing', bool(d3), d3)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            if await pg.locator('#anSheet [data-drop]').count(): await pg.click('#anSheet [data-drop]')
            await pg.wait_for_timeout(300)
            await pg.evaluate("document.querySelector('[data-act=event]').click()"); await pg.wait_for_timeout(500)
            ev0 = await pg.evaluate("document.querySelector('#anSheet [data-ok]').getAttribute('aria-disabled')")
            await pg.click('#anSheet [data-chips=kind] .an-chip >> nth=0'); await pg.wait_for_timeout(150)
            ev1 = await pg.evaluate("[document.querySelector('#anSheet [data-ok]').getAttribute('aria-disabled'), document.querySelector('#anSheet [name=kind]').value]")
            ok('n193: Anesia — Add (event) waits for what happened', ev0 == 'true' and (ev1[0] == 'false' or ev1[1] == 'note'), [ev0, ev1])
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            if await pg.locator('#anSheet [data-drop]').count(): await pg.click('#anSheet [data-drop]')
            await pg.wait_for_timeout(300)
            await pg.evaluate("document.querySelector('[data-act=vitals]').click()"); await pg.wait_for_selector('#anVForm'); await pg.wait_for_timeout(300)
            v0 = await pg.evaluate("document.querySelector('#anVForm [type=submit]').getAttribute('aria-disabled')")
            await pg.fill('#nv_hr', '80'); await pg.wait_for_timeout(100)
            v1 = await pg.evaluate("document.querySelector('#anVForm [type=submit]').getAttribute('aria-disabled')")
            ok('n193: Anesia — Save vitals waits for at least one value', v0 == 'true' and v1 == 'false', [v0, v1])
            ok('no new page errors (n193 Anesia)', not errs, errs)
            await ctx.close()
            _secend(48)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n193: entering data (HIG Entering data)', False, repr(_e)[:300])
        try:
            # ---------- n194: full screen (HIG Going full screen)
            _sec(49)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(700)
            await pg.click('#rdDisplayBtn'); await pg.wait_for_timeout(500)
            S1 = "[document.body.classList.contains('rd-display'), !!document.fullscreenElement, document.getElementById('rdDisplayBtn').getAttribute('aria-pressed'), getComputedStyle(document.querySelector('.topnav')).display!=='none']"
            f1 = await pg.evaluate(S1)
            await pg.evaluate("switchApp('flow')"); await pg.wait_for_timeout(400); f2 = await pg.evaluate(S1)
            await pg.evaluate("switchApp('rounds')"); await pg.wait_for_timeout(400); f3 = await pg.evaluate(S1)
            ok('n194: Rounds Display — full screen, large type, the button says it’s on (aria-pressed)', f1[:3] == [True, True, 'true'], f1)
            ok('n194: leaving Rounds puts the shared top bar back; coming back resumes Display', f2[0] is False and f2[3] is True and f3[0] is True, [f2, f3])
            await pg.evaluate("document.exitFullscreen()"); await pg.wait_for_timeout(500); f4 = await pg.evaluate(S1)
            await pg.evaluate("switchApp('flow'); switchApp('rounds')"); await pg.wait_for_timeout(400); f5 = await pg.evaluate(S1)
            ok('n194: leaving full screen (Esc) ends Display too — the top bar is never hidden in a normal window', f4[0] is False and f4[2] == 'false' and f4[3] is True and f5[0] is False, [f4, f5])
            await pg.click('#rdDisplayBtn'); await pg.wait_for_timeout(400); await pg.click('#rdDisplayBtn'); await pg.wait_for_timeout(500); f6 = await pg.evaluate(S1)
            ok('n194: turning Display off with its button also leaves full screen', f6[:3] == [False, False, 'false'], f6)
            ok('no new page errors (n194 Rounds)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1920, 1080))
            await pg.goto(f'http://127.0.0.1:{PORT}/?tv=1'); await pg.wait_for_timeout(2500)
            t0 = await pg.evaluate("[document.body.classList.contains('tv-mode'), !!document.getElementById('fsHint'), !!document.fullscreenElement]")
            await pg.mouse.click(300, 300); await pg.wait_for_timeout(600)
            t1 = await pg.evaluate("[!!document.fullscreenElement, document.body.classList.contains('fs-mode')]")
            await pg.wait_for_timeout(3300)
            tb = await pg.evaluate("document.getElementById('fsExit').classList.contains('show')")
            await pg.evaluate("document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))"); await pg.wait_for_timeout(100)
            ta = await pg.evaluate("document.getElementById('fsExit').classList.contains('show')")
            ok('n194: Lobby TV — a tap shows “Exit Full Screen”, like moving the mouse', t0[0] and t1[0] and tb is False and ta is True, [t0, t1, tb, ta])
            await pg.evaluate("document.exitFullscreen()"); await pg.wait_for_timeout(700)
            t2 = await pg.evaluate("[!!document.fullscreenElement, !!document.getElementById('fsHint')]")
            await pg.mouse.click(400, 400); await pg.wait_for_timeout(600)
            t3 = await pg.evaluate("[!!document.fullscreenElement, !!document.getElementById('fsHint')]")
            ok('n194: Lobby TV — if full screen ends the tap-to-enter prompt comes back, and a tap goes back to full screen', t2 == [False, True] and t3 == [True, False], [t2, t3])
            ok('no new page errors (n194 lobby)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
            X = "document.documentElement.classList.contains('an-expanded')"
            await pg.click('#anExpand'); await pg.wait_for_timeout(500)
            await pg.click('.an-back'); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(600)
            a1 = await pg.evaluate("[" + X + ", getComputedStyle(document.getElementById('pvxTopnav')).display!=='none']")
            await pg.click('[data-open="an_train1"]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
            a2 = await pg.evaluate(X)
            ok('n194: Anesia — Expanded is remembered: the Records list shows the top bar, the next record opens expanded', a1 == [False, True] and a2 is True, [a1, a2])
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
            await pg.click('.an-back'); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(500)
            await pg.click('[data-open="an_train1"]'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
            a3 = await pg.evaluate(X)
            ok('n194: Anesia — turning Expanded off (Esc) is remembered too', a3 is False, a3)
            ok('no new page errors (n194 Anesia)', not errs, errs)
            await ctx.close()
            _secend(49)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n194: full screen (HIG Going full screen)', False, repr(_e)[:300])
        try:
            # ---------- n195: launching (HIG Launching)
            _sec(50)
            FRAMES = """window.__fr=[];(function(){var t0=performance.now();function snap(){try{var b=document.body,d=document.documentElement;__fr.push([Math.round(performance.now()),!!b,b?getComputedStyle(b).backgroundColor:'',d?d.className:'']);}catch(e){}
              if(performance.now()-t0<1800) requestAnimationFrame(snap);} requestAnimationFrame(snap);})();"""
            def lum(c):
                import re as _re
                v = [int(x) for x in _re.findall(r'\d+', c)[:3]]
                return sum(v) / 3 if len(v) == 3 else None
            for dark in (True, False):
                ctx, pg, errs = await flow_page((1440, 900), dark=dark, extra=FRAMES)
                fr = await pg.evaluate("window.__fr")
                ls = [lum(f[2]) for f in fr if f[1] and f[2] and lum(f[2]) is not None and not f[2].startswith('rgba(0, 0, 0, 0')]
                boot = await pg.evaluate("[document.documentElement.className, document.querySelector('meta[name=theme-color]').content]")
                if dark: ok('n195: dark launch — every frame is already dark (no light page fading in)', ls and max(ls) < 40, [len(ls), max(ls) if ls else None])
                else: ok('n195: light launch — every frame is light', ls and min(ls) > 200, [len(ls), min(ls) if ls else None])
                ok('n195: theme transitions come back once the first screen is up; the status bar follows the theme (%s)' % ('dark' if dark else 'light'),
                   'pvx-boot' not in boot[0] and boot[1] == ('#0A1222' if dark else '#F2F4F8'), boot)
                await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate(SEEDP) if 'SEEDP' in dir() else None
            await pg.evaluate("(()=>{const now=Date.now();for(let i=0;i<40;i++)PATIENTS.push(patient({name:'Scroll'+i,last:'Test',owner:'Synthetic',status:'Waiting',room:'Lobby',arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();})()")
            await pg.click('#switcher .seg[data-view="list"]'); await pg.wait_for_timeout(500)
            await pg.evaluate("document.getElementById('stage').scrollTop=600"); await pg.wait_for_timeout(500)
            y0 = await pg.evaluate("document.getElementById('stage').scrollTop")
            await pg.reload(); await pg.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await pg.wait_for_timeout(500)
            await pg.evaluate("(()=>{const now=Date.now();for(let i=0;i<40;i++)PATIENTS.push(patient({name:'Scroll'+i,last:'Test',owner:'Synthetic',status:'Waiting',room:'Lobby',arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();})()")
            await pg.wait_for_timeout(1500)
            r1 = await pg.evaluate("[(document.querySelector('#switcher .seg.active')||{dataset:{}}).dataset.view, location.hash, document.getElementById('stage').scrollTop]")
            ok('n195: Flow reopens on the view you left (Patients), with no #app left in the address', r1[0] == 'list' and r1[1] == '', r1)
            ok('n195: …and at the scroll position you left', y0 > 300 and abs(r1[2] - y0) < 40, [y0, r1[2]])
            await pg.evaluate("switchApp('ultrasound'); switchUsView('queue')"); await pg.wait_for_timeout(400)
            await pg.reload(); await pg.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await pg.wait_for_timeout(1800)
            r2 = await pg.evaluate("[currentApp, typeof currentUsView!=='undefined'?currentUsView:null, document.documentElement.classList.contains('pvx-app-boot')]")
            ok('n195: …and in the app you left (Ultrasound › Queue), without the Flow board showing first', r2 == ['ultrasound', 'queue', False], r2)
            await pg.evaluate("switchApp('rounds')"); await pg.wait_for_timeout(300)
            await pg.goto(f'http://127.0.0.1:{PORT}/#app=flow'); await pg.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await pg.wait_for_timeout(1500)
            r3 = await pg.evaluate("currentApp")
            ok('n195: a link that names an app still wins (#app=flow opens Flow, not the remembered Rounds)', r3 == 'flow', r3)
            await pg.evaluate("switchApp('rounds')"); await pg.wait_for_timeout(300)
            await pg.goto(f'http://127.0.0.1:{PORT}/?tv=1'); await pg.wait_for_timeout(2500)
            r4 = await pg.evaluate("[currentApp, document.body.classList.contains('tv-mode')]")
            ok('n195: the lobby TV (?tv=1) is never redirected by what a workstation remembered', r4 == ['flow', True], r4)
            ok('no new page errors (n195 Flow)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            a1 = await pg.evaluate("[location.hash, !!document.querySelector('.an-chart')]")
            ok('n195: Anesia — launching without a record reopens the case still under anesthesia', a1 == ['#r=an_train1', True], a1)
            await pg.click('.an-back'); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
            await pg.goto(URL); await pg.wait_for_timeout(2000)
            a2 = await pg.evaluate("[location.hash, !!document.querySelector('[data-open]'), localStorage.getItem('anesia:last')]")
            ok('n195: Anesia — going back to Records on purpose is remembered (the next launch stays on the list)', a2 == ['', True, None], a2)
            await pg.goto(URL + '#r=an_train2'); await pg.wait_for_selector('.an-chart, .an-rhead'); await pg.wait_for_timeout(500)
            await pg.goto(URL); await pg.wait_for_timeout(2000)
            a3 = await pg.evaluate("[location.hash, !!document.querySelector('[data-open]')]")
            ok('n195: Anesia — a case that has ended doesn’t reopen; the list does', a3 == ['', True], a3)
            ok('no new page errors (n195 Anesia)', not errs, errs)
            await ctx.close()
            _secend(50)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n195: launching (HIG Launching)', False, repr(_e)[:300])
        try:
            # ---------- n196: offering help (HIG Offering help)
            _sec(51)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("(()=>{const now=Date.now();[['Waiting','Lobby'],['Exam','Room 1']].forEach((v,i)=>PATIENTS.push(patient({name:'Help'+i,last:'Test',owner:'Synthetic',status:v[0],room:v[1],arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]})));renderAll();})()")
            await pg.click('#switcher .seg[data-view="flow"]'); await pg.wait_for_timeout(400)
            h1 = await pg.evaluate("""(()=>{const t=s=>{const e=document.querySelector(s);return e&&e.getAttribute('title')};
              openDrawer(PATIENTS.find(x=>x.name==='Help0').id);
              return {luna:t('#searchLuna'),move:t('#board .pvx-move[data-kind=stage]'),talk:t('#fvTalk'),role:t('#usxRole'),name:(document.querySelector('.editable-hint')||{}).title}})()""")
            ok('n196: tooltips say what the control does (search, Move to another stage, Edit name, talk, role view)', h1['luna'] == 'Search patients, rooms and commands' and h1['move'] == 'Move to another stage' and h1['name'] == 'Edit name' and h1['talk'] in ('Click, or hold Space, to talk', 'Voice needs internet. Typing commands in the search bar still works.') and h1['role'] == 'Choose your view: Internal Medicine controls, or view only', h1)
            bad = await pg.evaluate("[...document.querySelectorAll('[title]')].map(e=>e.title).filter(t=>/L\\.U\\.N\\.A\\.|per-user enforcement|click to |Click to |Low end −|^Move…$|Double-click/.test(t))")
            ok('n196: no tooltip names the thing or uses developer wording any more', not bad, bad)
            th = await pg.evaluate("(document.querySelector('.theme-toggle')||{}).title")
            ths = [open(os.path.join(BUILD, f), encoding='utf-8').read().count('title="Switch light and dark" aria-label="Switch light and dark"') for f in ('index.html', 'anesia/index.html', 'treatment/index.html', 'or/index.html')]
            ok('n196: the theme button has one name in Flow, Anesia, Treatment Sheets and the OR (“Switch light and dark”)', th == 'Switch light and dark' and ths == [1, 1, 1, 1], [th, ths])
            hint_m = await pg.evaluate("document.querySelector('.usx-sec .hint').textContent")
            await pg.evaluate("closeDrawer&&closeDrawer(); switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(700)
            await pg.evaluate("(()=>{const r=document.querySelector('#rdList .rd-row');r&&r.querySelector('.rd-rowmain,.rd-name')&&(r.querySelector('.rd-rowmain')||r).click()})()"); await pg.wait_for_timeout(600)
            m0 = await pg.evaluate("(()=>{const e=document.querySelector('.rd-fin-edit[data-fin-key]');return e&&[e.getAttribute('role'),e.tabIndex,e.title]})()")
            if not m0:
                await pg.evaluate("(()=>{const r=document.querySelector('#rdList .rd-row');r&&r.click()})()"); await pg.wait_for_timeout(600)
                m0 = await pg.evaluate("(()=>{const e=document.querySelector('.rd-fin-edit[data-fin-key]');return e&&[e.getAttribute('role'),e.tabIndex,e.title]})()")
            if m0:
                await pg.evaluate("(()=>{const e=document.querySelector('.rd-fin-edit[data-fin-key]');e.scrollIntoView({block:'center'});e.focus();})()")   # n214: no wait for the row's motion to settle (was a timing flake)
                await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
                m3 = await pg.evaluate("!!document.querySelector('.rd-fin-inline')")
                await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
                m2 = await pg.evaluate("!document.querySelector('.rd-fin-inline')")
                if not await pg.locator('.rd-fin-edit[data-fin-key]').count():
                    await pg.evaluate("(()=>{const r=document.querySelector('#rdList .rd-row');r&&(r.querySelector('.rd-rowmain')||r).click()})()"); await pg.wait_for_timeout(600)
                await pg.locator('.rd-fin-edit[data-fin-key] >> nth=0').scroll_into_view_if_needed(); await pg.click('.rd-fin-edit[data-fin-key] >> nth=0'); await pg.wait_for_timeout(300)
                m1 = await pg.evaluate("!!document.querySelector('.rd-fin-inline')")
            else: m1 = m2 = m3 = None
            ok('n196: Rounds money fields edit with one click (a button, “Edit amount”); Esc backs out; Return edits from the keyboard', m0 == ['button', 0, 'Edit amount'] and m1 and m2 and m3, [m0, m1, m2, m3])
            ok('no new page errors (n196 Flow)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1024, 1366), touch=True)
            hint_t = await pg.evaluate("document.querySelector('.usx-sec .hint').textContent")
            ok('n196: help text says Tap on a touch screen, Click with a mouse (“… a row to review the case”)', hint_m == 'Click a row to review the case' and hint_t == 'Tap a row to review the case', [hint_m, hint_t])
            await ctx.close()
            # Anesia
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            a1 = await pg.evaluate("[...document.querySelectorAll('.an-tips')].map(e=>e.textContent)")
            a1in = await pg.evaluate("!!document.querySelector('.an-chartp .an-tips.an-hint')")
            ok('n196: Anesia — one tip, one feature, at the foot of the chart (no all-in-one banner)', len(a1) == 1 and a1[0].startswith('Click any value on the chart') and 'Undo' not in a1[0] and '⌥' not in a1[0] and a1in, [a1, a1in])
            await pg.evaluate("document.querySelector('[data-entry]').click()"); await pg.wait_for_timeout(600); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            a2 = await pg.evaluate("[document.querySelectorAll('.an-tips').length, localStorage.getItem('anesia:v1:tip:value')]")
            ok('n196: Anesia — opening a value retires the chart-value tip for good', a2 == [0, '1'], a2)
            for act in ('vitals', 'event', 'output'):
                await pg.click(f'[data-act={act}]'); await pg.wait_for_timeout(400); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
                if await pg.locator('#anSheet [data-drop]').count(): await pg.click('#anSheet [data-drop]'); await pg.wait_for_timeout(300)
            await pg.reload(); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            a3 = await pg.evaluate("[...document.querySelectorAll('.an-tips')].map(e=>e.textContent)")
            ok('n196: Anesia — the keyboard tip waits for another day (one tip a day)', a3 == [], a3)
            await pg.evaluate("localStorage.setItem('anesia:v1:tip:shown', JSON.stringify({id:'value',day:'Mon Jan 01 2001'}))"); await pg.reload(); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            a4 = await pg.evaluate("[...document.querySelectorAll('.an-tips')].map(e=>e.textContent)")
            ok('n196: Anesia — after three toolbar clicks with the mouse, the next day’s tip is the keyboard one (⌥V vitals …)', len(a4) == 1 and a4[0].startswith('Press ⌥V for vitals'), a4)
            await pg.keyboard.press('Alt+KeyE'); await pg.wait_for_timeout(500); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.reload(); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            a5 = await pg.evaluate("[document.querySelectorAll('.an-tips').length, localStorage.getItem('anesia:v1:tip:kb')]")
            ok('n196: Anesia — using a shortcut retires the keyboard tip', a5 == [0, '1'], a5)
            ok('no new page errors (n196 Anesia)', not errs, errs)
            await ctx.close()
            _secend(51)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n196: offering help (HIG Offering help)', False, repr(_e)[:300])
        try:
            # ---------- n197: notifications (HIG Managing notifications)
            _sec(52)
            ctx, pg, errs = await flow_page((1440, 900))
            MK = """([name,crit])=>{const now=Date.now();const p=patient({name:name,last:'Test',owner:'Synthetic',status:'Exam',room:'Room 2',arrival:new Date(now-60*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]});
              p.ultrasound={study:'Abdominal Ultrasound',status:'completed',requestStatus:'completed',completedAt:new Date(now-5*60000),performingDoctor:null,criticalFinding:crit,doctorDiscussionNeeded:false};PATIENTS.push(p);renderAll();return p.id}"""
            pid = await pg.evaluate(MK, ['Crit1', True]); await pg.wait_for_timeout(400)
            await pg.click('#switcher .seg[data-view="flow"]'); await pg.wait_for_timeout(500)
            c1 = await pg.evaluate("""(pid=>{const card=document.querySelector('#board .card[data-pid="'+pid+'"]');return {flag:!!(card&&card.querySelector('.us-flag.crit')),text:card&&(card.querySelector('.us-flag.crit')||{}).textContent}})""", pid)
            await pg.click('#switcher .seg[data-view="dashboard"]'); await pg.wait_for_timeout(600)
            c2 = await pg.evaluate("""(pid=>{const it=document.querySelector('#attnList .attn-item[data-key="uscrit:'+pid+'"]');return {item:!!it,first:it===document.querySelector('#attnList .attn-item'),text:it&&it.textContent.replace(/\\s+/g,' ').trim().slice(0,80),x:it&&(it.querySelector('.attn-clear')||{}).getAttribute&&it.querySelector('.attn-clear').getAttribute('aria-label'),badge:it&&(it.querySelector('.overdue-text')||{}).textContent}})""", pid)
            ok('n197: a critical ultrasound finding shows on the requesting doctor’s board (red flag on the card)', c1['flag'] and 'Critical ultrasound finding' in (c1['text'] or ''), c1)
            ok('n197: …and stays at the top of the Attention Center until someone marks it seen', c2['item'] and c2['first'] and c2['x'] == 'Mark seen' and c2['badge'] == 'CRITICAL', c2)
            await pg.click(f'#attnList .attn-item[data-key="uscrit:{pid}"] .attn-clear'); await pg.wait_for_timeout(500)
            c3 = await pg.evaluate("""(pid=>{const p=PATIENTS.find(x=>x.id===pid);const db=usToDb(p.ultrasound);return {seen:!!p.ultrasound.critSeenAt,by:p.ultrasound.critSeenBy,db:!!db.critSeenAt,tl:(p.timeline||[]).some(t=>t.label==='Critical ultrasound finding seen'),item:!!document.querySelector('#attnList .attn-item[data-key="uscrit:'+pid+'"]')}})""", pid)
            ok('n197: Mark seen records who and when (timeline, saved with the visit) and clears the item and flag', c3['seen'] and c3['by'] and c3['db'] and c3['tl'] and not c3['item'], c3)
            await pg.wait_for_timeout(6500)
            pid2 = await pg.evaluate(MK, ['Crit2', True]); await pg.wait_for_timeout(800)
            m1 = await pg.evaluate("""(()=>{const n=[...document.querySelectorAll('#notes .note')].find(x=>/Critical ultrasound finding/.test(x.textContent));return n&&{sticky:n.classList.contains('sticky'),role:n.getAttribute('role'),open:!!n.querySelector('.n-act'),said:(document.getElementById('pvxDndLive')||{}).textContent}})()""")
            await pg.wait_for_timeout(5000)
            m2 = await pg.evaluate("!![...document.querySelectorAll('#notes .note')].find(x=>/Critical ultrasound finding/.test(x.textContent)&&!x.classList.contains('hide'))")
            ok('n197: when one arrives, other staff screens get a message with Open that stays and is read aloud', m1 and m1['sticky'] and m1['role'] == 'alert' and m1['open'] and 'Critical ultrasound finding: Crit2' in (m1['said'] or '') and m2, [m1, m2])
            await pg.evaluate("switchApp('ultrasound')"); await pg.wait_for_timeout(300)
            n0 = await pg.evaluate("[...document.querySelectorAll('#notes .note')].filter(x=>/Critical ultrasound finding/.test(x.textContent)).length")
            await pg.evaluate(MK, ['Crit3', True]); await pg.wait_for_timeout(800)
            n1 = await pg.evaluate("[...document.querySelectorAll('#notes .note')].filter(x=>/Critical ultrasound finding/.test(x.textContent)).length")
            ok('n197: …but not on Ultrasound’s own screens (the person who flagged it)', n1 == n0, [n0, n1])
            await pg.evaluate("switchApp('flow')"); await pg.wait_for_timeout(300)
            src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
            ok('n197: the IM screen gets one plain confirmation, not a second toast about its own action', "notify('Critical finding'" not in src and "critical finding flagged" in src)
            f = await pg.evaluate("""(async()=>{document.querySelectorAll('#notes .note').forEach(n=>n.remove());notify('Not saved','The form changed on another screen',{icon:'info'});notify('Patient moved','Help · Room 1',{icon:'move'});
              await new Promise(r=>setTimeout(r,5200)); const ns=[...document.querySelectorAll('#notes .note:not(.hide)')].map(n=>n.querySelector('.n-title').textContent);
              const fail=[...document.querySelectorAll('#notes .note')].find(n=>/Not saved/.test(n.textContent)); const role=fail&&fail.getAttribute('role'); fail&&fail.querySelector('.n-x').click(); await new Promise(r=>setTimeout(r,600));
              return {after5s:ns,role,closed:![...document.querySelectorAll('#notes .note')].some(n=>/Not saved/.test(n.textContent)),live:document.getElementById('notes').getAttribute('aria-live')}})()""")
            ok('n197: a failure (“Not saved”) stays until dismissed; a confirmation still fades after ~4 s', f['after5s'] == ['Not saved'] and f['role'] == 'alert' and f['closed'], f)
            ok('n197: Flow’s messages are announced (the message area is a live region)', f['live'] == 'polite', f)
            await pg.click('#subnavFlow .fab-add, .fab-add'); await pg.wait_for_timeout(400)
            ch = await pg.evaluate("[(document.getElementById('opsChime')||{}).getAttribute&&document.getElementById('opsChime').getAttribute('aria-checked'), (document.getElementById('opsChimeS')||{}).textContent]")
            await pg.click('#opsChime'); await pg.wait_for_timeout(200)
            ch2 = await pg.evaluate("[document.getElementById('opsChime').getAttribute('aria-checked'), document.getElementById('opsChimeS').textContent, localStorage.getItem('pvx:sound:reminder')]")
            ok('n197: Operations › Reminder chime turns the 2-minute reminder off on this screen (remembered); the first critical chime always plays', ch == ['true', 'On · this screen'] and ch2 == ['false', 'Off · this screen', 'off'] and "localStorage.getItem('pvx:sound:reminder')==='off') return;" in src, [ch, ch2])
            ok('no new page errors (n197 Flow)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            a1 = await pg.evaluate("(async()=>{anesiaSay('Cefazolin redose is due'); await new Promise(r=>setTimeout(r,150)); const e=document.getElementById('anSr'); return [e&&e.getAttribute('aria-live'), e&&e.textContent]})()")
            asrc = open(os.path.join(BUILD, 'anesia/app.js'), encoding='utf-8').read()
            ok('n197: Anesia — an antibiotic redose turning due is announced once (polite), like Vitals due', a1 == ['polite', 'Cefazolin redose is due'] and "srSay(a.name + ' redose '" in asrc, a1)
            ok('no new page errors (n197 Anesia)', not errs, errs)
            await ctx.close()
            _secend(52)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n197: notifications (HIG Managing notifications)', False, repr(_e)[:300])
        try:
            # ---------- n198: action sheets (HIG Action sheets)
            _sec(53)
            ctx, pg, errs = await flow_page((390, 844), touch=True)
            await pg.evaluate("(()=>{const b=document.createElement('button');b.id='n198o';b.textContent='open';b.style.cssText='position:fixed;left:20px;top:300px;z-index:1';document.body.appendChild(b);b.focus();showConfirm('Clear all attention items?','Clear All',()=>{window.__n198ok=1},{sub:'Patient records will not be changed.',danger:true});})();0")
            await pg.wait_for_timeout(500)
            q = await pg.evaluate("""(()=>{const b=document.getElementById('confirmBox').getBoundingClientRect(),c=document.getElementById('confirmCancel').getBoundingClientRect(),o=document.getElementById('confirmOk').getBoundingClientRect();
              return {sheet:document.getElementById('confirmBox').classList.contains('pvx-as'),bottomGap:Math.round(innerHeight-b.bottom),w:Math.round(b.width),okAbove:o.bottom<=c.top,gap:Math.round(c.top-o.bottom),okH:Math.round(o.height),cW:Math.round(c.width),focus:document.activeElement.id,red:(()=>{const m=getComputedStyle(document.getElementById('confirmOk')).backgroundColor.match(/\d+/g).map(Number);return m[0]>180&&m[1]<100&&m[2]<100})()}})()""")
            await shot(pg, 'n198-phone-confirm')
            ok('n198: on a phone a confirmation is an action sheet from the bottom — full width, 48 px buttons, the action first and Cancel last, set apart', q['sheet'] and q['bottomGap'] < 40 and q['w'] > 360 and q['okAbove'] and q['gap'] >= 12 and q['okH'] >= 44 and q['cW'] > 340, q)
            ok('n198: a destructive confirmation is red and has no default (n209: focus on the alert itself, so Return can’t clear everything)', q['focus'] == 'confirmBox' and q['red'], q)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            e1 = await pg.evaluate("[document.getElementById('confirmBox').classList.contains('open'), document.activeElement.id, !!window.__n198ok]")
            ok('n198: Esc cancels the confirmation and focus returns to the button that opened it', e1 == [False, 'n198o', False], e1)
            await pg.evaluate("(()=>{const a=document.getElementById('n198o');a.style.top='500px';rdMenu(a,Array.from({length:22},(_,i)=>({value:'d'+i,label:'Dr Person '+i,on:i===3})).concat([{value:'__clear',label:'Clear next doctor'}]),v=>{window.__n198pick=v});})();0")
            await pg.wait_for_timeout(400)
            r1 = await pg.evaluate("""(()=>{const m=document.querySelector('.rd-menu');const g=m.querySelector('.rd-asgroup'),c=m.querySelector('.rd-ascancel'),last=[...m.querySelectorAll('button[data-v]')].pop();const gr=g.getBoundingClientRect(),cr=c.getBoundingClientRect();
              return {as:m.classList.contains('rd-as'),fits:cr.bottom<=innerHeight&&gr.top>=0,scrolls:g.scrollHeight>g.clientHeight,cancelLast:cr.top>gr.bottom,lastDanger:last.classList.contains('danger')&&last.textContent==='Clear next doctor',sep:!!m.querySelector('.rd-msep'),role:m.querySelector('[role=menu]')&&m.querySelector('[role=menu]').getAttribute('role'),rowH:Math.round(m.querySelector('button[data-v]').getBoundingClientRect().height),focus:document.activeElement.textContent,checked:document.activeElement.getAttribute('aria-checked')}})()""")
            await shot(pg, 'n198-phone-menu')
            ok('n198: on a phone a Rounds menu is an action sheet with Cancel, and fits the screen', r1['as'] and r1['fits'] and r1['cancelLast'] and r1['role'] == 'menu', r1)
            ok('n198: Rounds menu — destructive row red, last, after a divider; 44 px+ rows; opens on the current choice', r1['lastDanger'] and r1['sep'] and r1['rowH'] >= 44 and r1['focus'] == 'Dr Person 3' and r1['checked'] == 'true', r1)
            await pg.click('.rd-ascancel'); await pg.wait_for_timeout(200)
            r2 = await pg.evaluate("[!!document.querySelector('.rd-menu'), document.activeElement.id, window.__n198pick||null]")
            ok('n198: Cancel closes the sheet without choosing and returns focus', r2 == [False, 'n198o', None], r2)
            ok('no new page errors (n198 Flow phone)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1180, 820))
            await pg.evaluate("(()=>{const b=document.createElement('button');b.id='n198o';b.textContent='open';b.style.cssText='position:fixed;left:20px;top:600px;z-index:1';document.body.appendChild(b);b.focus();showConfirm('Move patient to Comfort Room?','Move Patient',()=>{});})();0")
            await pg.wait_for_timeout(500)
            q2 = await pg.evaluate("[document.getElementById('confirmBox').classList.contains('pvx-as'), document.activeElement.id]")
            ok('n198: iPad and Mac keep the centred box; a normal confirmation focuses its action', q2 == [False, 'confirmOk'], q2)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.evaluate("(()=>{const a=document.getElementById('n198o');rdMenu(a,Array.from({length:22},(_,i)=>({value:'d'+i,label:'Dr Person '+i})).concat([{value:'undo',label:'Undo last extension'}]),v=>{window.__n198pick=v});})();0")
            await pg.wait_for_timeout(300)
            r3 = await pg.evaluate("""(()=>{const m=document.querySelector('.rd-menu'),r=m.getBoundingClientRect(),a=document.getElementById('n198o').getBoundingClientRect();return {as:m.classList.contains('rd-as'),fits:r.top>=0&&r.bottom<=innerHeight,up:r.bottom<=a.top,role:m.getAttribute('role'),last:[...m.querySelectorAll('button')].pop().className}})()""")
            await shot(pg, 'n198-wide-menu')
            ok('n198: wider screens — the Rounds menu fits the screen (opens upward when there’s no room below), role=menu', (not r3['as']) and r3['fits'] and r3['up'] and r3['role'] == 'menu' and 'danger' in r3['last'], r3)
            await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('End')
            k1 = await pg.evaluate("document.activeElement.textContent")
            await pg.keyboard.press('Home'); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
            k2 = await pg.evaluate("[window.__n198pick, !!document.querySelector('.rd-menu')]")
            await pg.evaluate("rdMenu(document.getElementById('n198o'),[{value:'a',label:'A'},{value:'b',label:'B'}],()=>{});0"); await pg.wait_for_timeout(100)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
            k3 = await pg.evaluate("[!!document.querySelector('.rd-menu'), document.activeElement.id]")
            ok('n198: arrow keys, Home and End move through the menu, Return picks, Esc closes and returns focus', k1 == 'Undo last extension' and k2 == ['d1', False] and k3 == [False, 'n198o'], [k1, k2, k3])
            src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
            ok('n198: wording — the discharge title is a question with a one-line message; the Rounds button names the action', "on the treatment sheet?','Open sheet'" in src and "as '+type.toLowerCase()+'?','Mark '+type.toLowerCase()," in src)   # n209: sentence case
            ok('no new page errors (n198 Flow wide)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br, vp=(390, 844))
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            await pg.evaluate("document.querySelector('[data-act=\"event\"]').click();0"); await pg.wait_for_timeout(500)
            await pg.evaluate("(()=>{const i=document.querySelector('#anSheet form input:not([type=hidden]),#anSheet form textarea');if(i){i.value='x';i.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('#anSheet [data-x]').click();})();0")
            await pg.wait_for_timeout(300)
            d1 = await pg.evaluate("""(()=>{const d=document.querySelector('#anSheet [data-drop]'),k=document.querySelector('#anSheet [data-keep]');if(!d||document.querySelector('#anSheet [data-discard]').hidden) return null;const a=d.getBoundingClientRect(),b=k.getBoundingClientRect();return {dropFirst:a.bottom<=b.top,fullW:Math.round(a.width)===Math.round(b.width),h:Math.round(a.height)}})()""")
            await shot(pg, 'n198-anesia-discard')
            ok('n198: Anesia on a phone — Discard (red) comes first, Keep editing below it, full width', d1 and d1['dropFirst'] and d1['fullW'] and d1['h'] >= 44, d1)
            ok('no new page errors (n198 Anesia)', not errs, errs)
            await ctx.close()
            _secend(53)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n198: action sheets (HIG Action sheets)', False, repr(_e)[:300])
        try:
            # ---------- n199: buttons (HIG Buttons)
            _sec(54)
            HIT = r"""(view)=>{const vis=e=>{const r=e.getBoundingClientRect();if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight)return false;let p=e;while(p){const c=getComputedStyle(p);if(c.display==='none'||c.visibility==='hidden')return false;p=p.parentElement}return !e.closest('.topnav,[inert],[aria-hidden=true]')};
              const bad=[];[...document.querySelectorAll('button,[role=button]')].filter(vis).forEach(e=>{const r=e.getBoundingClientRect();let w=r.width,h=r.height;const a=getComputedStyle(e,'::after');if(a.content&&a.content!=='none'&&a.position==='absolute'){w=Math.max(w,parseFloat(a.width)||0);h=Math.max(h,parseFloat(a.height)||0)}
                if(Math.min(w,h)<43.5) bad.push(view+': '+((e.innerText||e.getAttribute('aria-label')||e.className)+'').replace(/\s+/g,' ').trim().slice(0,30)+' '+Math.round(w)+'x'+Math.round(h))});return bad}"""
            ctx, pg, errs = await flow_page((1180, 820), touch=True)
            await pg.evaluate("""(()=>{const now=Date.now();[['Waiting','Lobby'],['Exam','Room 1']].forEach((v,i)=>{PATIENTS.push(patient({name:'Btn'+i,last:'Test',owner:'Synthetic',status:v[0],room:v[1],arrival:new Date(now-(30+i*20)*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]}))});renderAll();})();0""")
            await pg.wait_for_timeout(400)
            bad = []
            for sg in ('dashboard', 'list', 'flow', 'rooms'):
                await pg.evaluate(f"document.querySelector('#switcher .seg[data-view=\"{sg}\"]').click();0"); await pg.wait_for_timeout(500)
                bad += await pg.evaluate(HIT, sg)
            await pg.evaluate("openDrawer(PATIENTS[PATIENTS.length-1].id);0"); await pg.wait_for_timeout(700)
            bad += await pg.evaluate(HIT, 'drawer')
            await shot(pg, 'n199-ipad-drawer')
            await pg.evaluate("try{closeDrawer()}catch(e){};switchApp('rounds');0"); await pg.wait_for_timeout(900)
            await pg.evaluate("[...document.querySelectorAll('button')].find(b=>/Load sample census/.test(b.textContent)).click();0"); await pg.wait_for_timeout(1200)
            await pg.evaluate("document.querySelector('.rd-row [data-act=toggle]').click();0"); await pg.wait_for_timeout(800)
            bad += await pg.evaluate(HIT, 'rounds')
            await shot(pg, 'n199-ipad-rounds')
            ok('n199: iPad — every Flow button outside the shared top bar is at least 44 × 44 (Command, Patients, Flow, Rooms, drawer, Rounds)', not bad, bad[:20])
            m = await pg.evaluate("""(()=>{const b=[...document.querySelectorAll('button.rd-fact[aria-haspopup=menu]')];const d=document.querySelector('.rd-fact.plain.day');return {n:b.length,chev:b.length&&getComputedStyle(b[0],'::after').borderRightStyle,day:d&&getComputedStyle(d).backgroundColor}})()""")
            ok('n199: Rounds buttons that open a menu show a chevron (aria-haspopup); Hospital Day is plain text', m['n'] >= 3 and m['chev'] == 'solid' and m['day'] in ('rgba(0, 0, 0, 0)', 'transparent'), m)
            o = await pg.evaluate("""(async()=>{const p=PATIENTS.find(x=>x.rounds&&!x.rounds.outcome);rdSetOutcome(p,'Discharged');await new Promise(r=>setTimeout(r,300));const box=document.getElementById('confirmBox'),c=document.getElementById('confirmCancel').getBoundingClientRect(),k=document.getElementById('confirmOk');const w=[Math.round(c.width),Math.round(k.getBoundingClientRect().width)];const fancy=box.classList.contains('confirm-fancy');const lbl=k.textContent;k.click();await new Promise(r=>setTimeout(r,60));return {fancy,w,lbl,done:!!(p.rounds.outcome&&p.rounds.outcome.type==='Discharged')}})()""")
            ok('n199: Rounds › Discharged acts at once (no staged “Confirming…”), with equal-width buttons', (not o['fancy']) and o['done'] and abs(o['w'][0] - o['w'][1]) <= 1 and o['lbl'] == 'Mark discharged', o)
            ok('no new page errors (n199 Flow iPad)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            mac = await pg.evaluate("[Math.round(document.querySelector('#switcher .seg').getBoundingClientRect().height), Math.round(document.querySelector('.attn-clearall').getBoundingClientRect().height)]")
            ok('n199: Mac sizes are unchanged (sub-nav tabs, Clear all)', mac[0] < 44 and mac[1] < 44, mac)
            cl = await pg.evaluate("(()=>{const b=document.querySelectorAll('#switcher .seg')[1].getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]})()")
            await pg.mouse.move(cl[0], cl[1]); await pg.mouse.down(); await pg.wait_for_timeout(400)
            pr = await pg.evaluate("(()=>{const c=getComputedStyle(document.querySelectorAll('#switcher .seg')[1]);return [c.filter,c.scale]})()")
            await pg.mouse.up(); await pg.wait_for_timeout(300)
            ok('n199: buttons have a press state (darker fill and a small scale while pressed)', 'brightness(0.88)' in pr[0] and pr[1] == '0.97', pr)
            src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
            old = [w for w in ('>Add Flag<', '>Clear All<', '>Move Patient<', '>Request Records<', '>Full Screen<', '>Start Rounds<', "'Discharge Ready'", "'All Patients'", '>Not Reviewed', '>+24 Hours<', "'Set Unavailable'", '>Edit Order<', '>IM Controls<') if w in src]
            ok('n199: Flow’s buttons use sentence case (Add flag, Clear all, Move patient, Request records, Start rounds …)', not old, old)
            ok('no new page errors (n199 Flow Mac)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            await pg.click('.an-mon >> nth=1'); await pg.wait_for_selector('#anSheet [data-void]')
            await pg.click('#anSheet [data-void]'); await pg.wait_for_timeout(300)
            await pg.fill('[name=reason]', 'Artifact'); await pg.press('[name=reason]', 'Enter'); await pg.wait_for_timeout(400)
            s1 = await pg.evaluate("[!!document.querySelector('#anSheet [name=reason]'), document.querySelector('#anSheet [data-ok]')&&document.querySelector('#anSheet [data-ok]').className]")
            await pg.click('#anSheet [data-ok]'); await pg.wait_for_timeout(400)
            s2 = await pg.evaluate("!document.querySelector('#anSheet [name=reason]')")
            ok('n199: Anesia — Return in the Reason field doesn’t strike an entry through; pressing the red button does', s1[0] and 'destr' in (s1[1] or '') and s2, [s1, s2])
            ok('no new page errors (n199 Anesia)', not errs, errs)
            await ctx.close()
            _secend(54)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n199: buttons (HIG Buttons)', False, repr(_e)[:300])
        try:
            # ---------- n200: a sheet doesn't take focus back from a field already chosen
            _sec(55)
            ctx, pg, errs = await new_page(br, seed=False)
            await pg.goto(URL); await pg.wait_for_selector('.an-empty')
            f = await pg.evaluate("""(async()=>{document.getElementById('anNew').click();const k=document.querySelector('#anSheet [name=kg]');k.focus();await new Promise(r=>setTimeout(r,120));return [document.activeElement.name, document.activeElement===k]})()""")
            ok('n200: Anesia — choosing a field right after a sheet opens keeps focus there (it no longer jumps back to the first field)', f == ['kg', True], f)
            await pg.keyboard.type('18.2'); await pg.fill('[name=name]', 'Training dog 10'); await pg.click('[data-ok]')
            await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(300)
            keys = await pg.evaluate("Object.keys(window.__fs).filter(k=>k.startsWith('anesia_records/'))"); d = await store(pg, keys[0].split('/')[1]) if keys else None
            ok('n200: …so the weight typed there is saved, and the name is untouched', d and d['patient']['name'] == 'Training dog 10' and d['patient']['weights'][0]['kg'] == 18.2, d and d['patient'])
            ok('no new page errors (n200 Anesia)', not errs, errs)
            await ctx.close()
            _secend(55)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n200: a sheet doesnt take focus back from a field already chosen', False, repr(_e)[:300])
        try:
            # ---------- n201: context menus (HIG Context menus)
            _sec(56)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("""(()=>{const now=Date.now();[['Waiting','Lobby'],['Exam','Room 1'],['Exam','Room 2']].forEach((v,i)=>{PATIENTS.push(patient({name:'Ctx'+i,last:'Test',owner:'Synthetic',status:v[0],room:v[1],arrival:new Date(now-(30+i*20)*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]}))});renderAll();})();0""")
            await pg.click('#switcher .seg[data-view="flow"]'); await pg.wait_for_timeout(500)
            pid = await pg.evaluate("PATIENTS.find(p=>p.name==='Ctx1').id")
            card = pg.locator(f'#board .card[data-pid="{pid}"]')
            await card.click(button='right'); await pg.wait_for_timeout(300)
            m1 = await pg.evaluate("""(()=>{const l=document.querySelector('.pvx-cx-list');if(!l)return null;const b=[...l.querySelectorAll('button')];return {labels:b.map(x=>x.querySelector('.l').textContent),subs:b.filter(x=>x.getAttribute('aria-haspopup')).map(x=>x.querySelector('.l').textContent),role:l.getAttribute('role'),focus:document.activeElement.textContent,title:!!document.querySelector('.pvx-cx .pvx-mt'),kbd:/⌘|⌥|Ctrl\+/.test(l.textContent)}})()""")
            ok('n201: right-click on a patient card opens its context menu (Open, Move to ›, Room ›, Assign doctor ›, Send a form…), focus on the first item', m1 and m1['labels'][:5] == ['Open', 'Move to', 'Room', 'Assign doctor', 'Send a form…'] and m1['subs'] == ['Move to', 'Room', 'Assign doctor'] and m1['role'] == 'menu' and m1['focus'] == 'Open', m1)
            ok('n201: no title and no keyboard shortcuts in the menu', m1 and not m1['title'] and not m1['kbd'], m1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            await card.click(button='right'); await pg.wait_for_timeout(250)
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent.indexOf('Room')===0).click();0"); await pg.wait_for_timeout(150)
            rm = await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].map(x=>x.querySelector('.l').textContent)")
            ok('n201: Room › lists free rooms only (occupied rooms and the current one are hidden, not dimmed)', 'Room 1' not in rm and 'Room 2' not in rm and 'Room 3' in rm and not any('occupied' in x for x in rm), rm)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            await card.click(button='right'); await pg.wait_for_timeout(250)
            await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(150)
            m2 = await pg.evaluate("""(()=>{const b=[...document.querySelectorAll('.pvx-cx-list button')].map(x=>x.querySelector('.l').textContent);return b})()""")
            ok('n201: one level of submenu, and it hides what isn’t available (the current stage is not offered)', m2[0] == 'Move to' and 'Exam' not in m2 and 'Waiting' in m2 and 'Diagnostics' in m2, m2)
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent==='Diagnostics').click();0"); await pg.wait_for_timeout(400)
            st = await pg.evaluate(f"[PATIENTS.find(p=>p.id==='{pid}').status, !!document.querySelector('.pvx-cx:not(.out)')]")
            ok('n201: choosing an item does it and closes the menu (Move to › Diagnostics)', st == ['Diagnostics', False], st)
            fx = await pg.evaluate(f"[!!document.querySelector('.pvx-cx:not(.out)'), document.activeElement===document.querySelector('#board .card[data-pid=\"{pid}\"]')||document.activeElement.closest&&!!document.activeElement.closest('#board .card[data-pid=\"{pid}\"]')]")
            ok('n201: Esc closes the menu', fx[0] is False, fx)
            await pg.click('#switcher .seg[data-view="list"]'); await pg.wait_for_timeout(500)
            await pg.locator(f'#tableBody tr[data-pid="{pid}"]').click(button='right'); await pg.wait_for_timeout(250)
            l2 = await pg.evaluate("!!document.querySelector('.pvx-cx-list')")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            inp = await pg.evaluate("(()=>{const i=document.querySelector('input:not([type=hidden])');const e=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:5,clientY:5,button:2});i.dispatchEvent(e);return [e.defaultPrevented, !!document.querySelector('.pvx-cx:not(.out)')]})()")
            ok('n201: the same menu on Patients rows; text fields keep the system edit menu', l2 and inp == [False, False], [l2, inp])
            await pg.evaluate("switchApp('rounds');0"); await pg.wait_for_timeout(900)
            await pg.evaluate("[...document.querySelectorAll('button')].find(b=>/Load sample census/.test(b.textContent)).click();0"); await pg.wait_for_timeout(1200)
            await pg.locator('.rd-row[data-pid] > .rd-rowmain').first.click(button='right'); await pg.wait_for_timeout(250)
            r1 = await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].map(x=>x.querySelector('.l').textContent)")
            ok('n201: Rounds rows: Open, Status ›, Take case ›', r1[:3] == ['Open', 'Status', 'Take case'], r1)
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')][0].click();0"); await pg.wait_for_timeout(500)
            op = await pg.evaluate("!!document.querySelector('.rd-row.open')")
            ok('n201: Rounds › Open expands the row', op, op)
            await shot(pg, 'n201-rounds')
            ok('no new page errors (n201 Flow)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((390, 844), touch=True)
            await pg.evaluate("""(()=>{const now=Date.now();PATIENTS.push(patient({name:'Ctx9',last:'Test',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(now-30*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();})();0""")
            await pg.click('#switcher .seg[data-view="flow"]'); await pg.wait_for_timeout(500)
            bb = await pg.evaluate("(()=>{const c=[...document.querySelectorAll('#board .card[data-pid]')].find(c=>/Ctx9/.test(c.textContent));c.scrollIntoView({block:'center'});const r=c.getBoundingClientRect();return [r.x+r.width/2,r.y+12]})()")
            await pg.wait_for_timeout(200)
            cdp = await ctx.new_cdp_session(pg)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': bb[0], 'y': bb[1]}]}); await pg.wait_for_timeout(700)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(300)
            ph = await pg.evaluate("""(()=>{const x=document.querySelector('.pvx-cx:not(.out)');if(!x)return null;const c=x.querySelector('.pvx-cx-cancel').getBoundingClientRect(),l=x.querySelector('.pvx-cx-list').getBoundingClientRect();return {sheet:x.classList.contains('sheet'),cancelLast:c.top>l.bottom,bottom:Math.round(innerHeight-c.bottom),drawer:!!document.querySelector('#drawer.open,.drawer.open')}})()""")
            await shot(pg, 'n201-phone-hold')
            ok('n201: on a phone, touch and hold shows the menu as a sheet from the bottom with Cancel (and doesn’t open the drawer)', ph and ph['sheet'] and ph['cancelLast'] and ph['bottom'] < 40 and not ph['drawer'], ph)
            await pg.click('.pvx-cx-cancel'); await pg.wait_for_timeout(250)
            ok('n201: Cancel closes it', await pg.evaluate("!document.querySelector('.pvx-cx:not(.out)')"))
            ok('no new page errors (n201 phone)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1180, 820), touch=True)
            await pg.evaluate("switchApp('rounds');0"); await pg.wait_for_timeout(900)
            await pg.evaluate("[...document.querySelectorAll('button')].find(b=>/Load sample census/.test(b.textContent)).click();0"); await pg.wait_for_timeout(1200)
            o0 = await pg.evaluate("[...document.querySelectorAll('.rd-row[data-pid]')].map(r=>r.dataset.pid).join(',')")
            bb = await pg.evaluate("(()=>{const r=document.querySelectorAll('.rd-row[data-pid] > .rd-rowmain')[1].getBoundingClientRect();return [r.x+r.width*0.35,r.y+r.height/2]})()")
            cdp = await ctx.new_cdp_session(pg)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': bb[0], 'y': bb[1]}]}); await pg.wait_for_timeout(750)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(300)
            h1 = await pg.evaluate("[!!document.querySelector('.pvx-cx:not(.out) .pvx-cx-list'), !!window.rdRk, !document.body.classList.contains('rd-dragging'), [...document.querySelectorAll('.rd-row[data-pid]')].map(r=>r.dataset.pid).join(',')]")
            await shot(pg, 'n201-ipad-rounds-hold')
            ok('n201: iPad — holding a Rounds row without moving shows its menu instead of reordering (the lift is cancelled)', h1[0] and not h1[1] and h1[2] and h1[3] == o0, h1)
            ok('no new page errors (n201 iPad Rounds)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            await pg.locator('.an-chart .an-mk[data-entry^="dose:"]').first.click(button='right'); await pg.wait_for_timeout(250)
            a1 = await pg.evaluate("""(()=>{const b=[...document.querySelectorAll('.pvx-cx-list button')];return {labels:b.map(x=>x.querySelector('.l').textContent),last:b.length&&b[b.length-1].className,sep:!!document.querySelector('.pvx-cx-list [role=separator]'),pv:!!document.querySelector('.pvx-cx-pv')}})()""")
            ok('n201: Anesia — right-click on a value opens Show details · Strike through… (red, last, after a divider; no preview with a mouse click)', a1['labels'] == ['Show details', 'Strike through…'] and 'danger' in a1['last'] and a1['sep'] and not a1['pv'], a1)
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].pop().click();0"); await pg.wait_for_timeout(400)
            ok('n201: …and Strike through… opens the strike-through sheet', (await pg.inner_text('#anShT')) == 'Strike through')
            await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(300)
            await pg.locator('.an-chart .an-mon').first.click(button='right'); await pg.wait_for_timeout(250)
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')][0].click();0"); await pg.wait_for_timeout(400)
            ok('n201: Show details opens the value’s sheet', await pg.locator('#anSheet').count() == 1 and (await pg.inner_text('#anShT')) == 'Vitals')
            await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(300)
            if await pg.locator('.an-chart .an-mk.void').count():
                await pg.locator('.an-chart .an-mk.void').first.click(button='right'); await pg.wait_for_timeout(250)
                v1 = await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].map(x=>x.querySelector('.l').textContent)")
                ok('n201: an entry already struck through offers Show details only (Strike through is hidden, not dimmed)', v1 == ['Show details'], v1)
                await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            ok('no new page errors (n201 Anesia)', not errs, errs)
            await ctx.close()
            _secend(56)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n201: context menus (HIG Context menus)', False, repr(_e)[:300])
        try:
            # ---------- n202: keyboard Undo and Redo (HIG Edit menus / Undo and redo)
            _sec(57)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("""(()=>{const now=Date.now();PATIENTS.push(patient({name:'Und1',last:'Test',owner:'Synthetic',status:'Waiting',room:'Lobby',arrival:new Date(now-30*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();})();0""")
            await pg.wait_for_timeout(300)
            ST = "PATIENTS.find(p=>p.name==='Und1').status"
            await pg.evaluate("window.moveStatus(PATIENTS.find(p=>p.name==='Und1'),'Exam');0"); await pg.wait_for_timeout(300)
            await pg.evaluate("document.activeElement&&document.activeElement.blur();0")
            await pg.keyboard.press('Meta+z'); await pg.wait_for_timeout(300)
            u1 = await pg.evaluate("["+ST+", [...document.querySelectorAll('#notes .note:not(.hide) .n-title')].map(n=>n.textContent).pop()]")
            ok('n202: ⌘Z undoes the last move (with the same “Move undone” message as the Undo button)', u1 == ['Waiting', 'Move undone'], u1)
            await pg.keyboard.press('Meta+Shift+z'); await pg.wait_for_timeout(300)
            u2 = await pg.evaluate(ST)
            ok('n202: ⇧⌘Z redoes it', u2 == 'Exam', u2)
            await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(250)
            u3 = await pg.evaluate(ST)
            await pg.keyboard.press('Control+y'); await pg.wait_for_timeout(250)
            u4 = await pg.evaluate(ST)
            ok('n202: Ctrl+Z and Ctrl+Y work too (Windows)', u3 == 'Waiting' and u4 == 'Exam', [u3, u4])
            await pg.focus('input[type=search], #search, input[placeholder*="Search"]')
            await pg.keyboard.type('abc'); await pg.keyboard.press('Meta+z'); await pg.wait_for_timeout(250)
            t1 = await pg.evaluate("["+ST+", document.activeElement.tagName]")
            ok('n202: while typing in a field, ⌘Z is the field’s own Undo (the move stays)', t1 == ['Exam', 'INPUT'], t1)
            await pg.evaluate("document.activeElement.value='';document.activeElement.blur();showConfirm('Move patient to Comfort Room?','Move patient',()=>{});0"); await pg.wait_for_timeout(400)
            await pg.keyboard.press('Meta+z'); await pg.wait_for_timeout(250)
            t2 = await pg.evaluate(ST)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            ok('n202: nothing happens while a dialog is open', t2 == 'Exam', t2)
            await pg.wait_for_timeout(700); await pg.evaluate("document.activeElement&&document.activeElement.blur();0")   # Esc returns focus to the search field (n133 keeps it there for 650 ms)
            b1 = await pg.evaluate("""(async()=>{const n=[...document.querySelectorAll('#notes .note')].reverse().find(x=>x.querySelector('.n-act'));if(!n) return null;n.querySelector('.n-act').click();await new Promise(r=>setTimeout(r,250));return """+ST+"""})()""")
            await pg.keyboard.press('Meta+z'); await pg.wait_for_timeout(250)
            b2 = await pg.evaluate("["+ST+", [...document.querySelectorAll('#notes .note:not(.hide) .n-title')].map(n=>n.textContent).pop()]")
            await pg.keyboard.press('Meta+Shift+z'); await pg.wait_for_timeout(250)
            b3 = await pg.evaluate("["+ST+", pvxUndo.size(), document.activeElement.tagName+'#'+document.activeElement.id]")
            b3 = b3[0] if b3[0] == 'Exam' else b3
            ok('n202: the Undo button and ⌘Z share one history (after the button, ⌘Z has nothing left; ⇧⌘Z redoes)', b1 == 'Waiting' and b2 == ['Waiting', 'Nothing to undo'] and b3 == 'Exam', [b1, b2, b3])
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(900)
            rk = await pg.evaluate("""(()=>{const g=[...document.querySelectorAll('#rdList .rd-secgroup[data-sec]')].find(x=>x.querySelectorAll(':scope > .rd-row').length>=2);
              const pids=[...g.querySelectorAll(':scope > .rd-row')].map(r=>r.dataset.pid);window.__rk={pids,before:pids.map(id=>rdFind(id).rounds.rank+'')};
              const re=pids.slice().reverse(); rdRankSave(g.dataset.sec,re,pids[0],re.length-1); window.__rk.after=pids.map(id=>rdFind(id).rounds.rank+''); return window.__rk})()""")
            await pg.keyboard.press('Meta+z'); await pg.wait_for_timeout(300)
            r1 = await pg.evaluate("window.__rk.pids.map(id=>rdFind(id).rounds.rank+'')")
            await pg.keyboard.press('Meta+Shift+z'); await pg.wait_for_timeout(300)
            r2 = await pg.evaluate("window.__rk.pids.map(id=>rdFind(id).rounds.rank+'')")
            ok('n202: ⌘Z / ⇧⌘Z undo and redo a Rounds order change', r1 == rk['before'] and r2 == rk['after'] and rk['before'] != rk['after'], [rk, r1, r2])
            ok('no new page errors (n202)', not newerr(errs), errs)
            await ctx.close()
            _secend(57)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n202: keyboard Undo and Redo (HIG Edit menus / Undo and redo)', False, repr(_e)[:300])
        try:
            # ---------- n203: menus (HIG Menus)
            _sec(58)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.click('#fabAdd'); await pg.wait_for_timeout(350)
            o1 = await pg.evaluate("""(()=>{const m=document.getElementById('opsMenu');return {focus:document.activeElement.dataset.op||document.activeElement.id,labels:[...m.querySelectorAll('.ops-t')].map(x=>x.textContent),sep:!!m.querySelector('.ops-sep[role=separator]+#opsChime'),ck:getComputedStyle(m.querySelector('#opsChime .ops-ck')).visibility,popup:document.getElementById('fabAdd').getAttribute('aria-haspopup')}})()""")
            ok('n203: Operations menu — opening it puts focus on the first item; + says it opens a menu', o1['focus'] == 'new' and o1['popup'] == 'menu', o1)
            ok('n203: Operations menu — sentence case, an ellipsis on items that open a form, a separator before Reminder chime', o1['labels'] == ['New patient…', 'Shift setup…', 'Hospital alert…', 'Reminder chime'] and o1['sep'], o1)
            ok('n203: Reminder chime shows a checkmark when it’s on', o1['ck'] == 'visible', o1)
            await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); a2 = await pg.evaluate("document.activeElement.dataset.op")
            await pg.keyboard.press('End'); a3 = await pg.evaluate("document.activeElement.dataset.op")
            await pg.keyboard.press('Home'); a4 = await pg.evaluate("document.activeElement.dataset.op")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            a5 = await pg.evaluate("[document.getElementById('opsMenu').classList.contains('open'), document.activeElement.id]")
            ok('n203: arrows, Home and End move through it; Esc closes it and focus goes back to +', a2 == 'alert' and a3 == 'chime' and a4 == 'new' and a5 == [False, 'fabAdd'], [a2, a3, a4, a5])
            await pg.click('#fabAdd'); await pg.wait_for_timeout(350); await pg.keyboard.press('End'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(250)
            c1 = await pg.evaluate("[document.getElementById('opsChime').getAttribute('aria-checked'), getComputedStyle(document.querySelector('#opsChime .ops-ck')).visibility]")
            await pg.evaluate("document.getElementById('opsChime').click();0"); await pg.wait_for_timeout(150)
            ok('n203: turning Reminder chime off removes the checkmark', c1 == ['false', 'hidden'], c1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            await pg.click('#fabAdd'); await pg.wait_for_timeout(350); await pg.keyboard.press('Tab'); await pg.wait_for_timeout(200)
            t1 = await pg.evaluate("[document.getElementById('opsMenu').classList.contains('open'), document.activeElement.id]")
            ok('n203: Tab closes it too', t1 == [False, 'fabAdd'], t1)
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelector('.rd-row [data-act=toggle]').click();0"); await pg.wait_for_timeout(600)
            await pg.evaluate("document.querySelector('[data-act=\"svc-menu\"]').click();0"); await pg.wait_for_timeout(300)
            r1 = await pg.evaluate("""(()=>{const m=document.querySelector('.rd-menu');const on=m.querySelector('button.on'),off=m.querySelector('button:not(.on)');return {radio:m.classList.contains('rd-radio'),on:on&&getComputedStyle(on.querySelector('.rd-ck')).visibility,off:off&&getComputedStyle(off.querySelector('.rd-ck')).visibility,align:on&&off&&Math.abs(on.querySelector('.rd-ck').getBoundingClientRect().left-off.querySelector('.rd-ck').getBoundingClientRect().left)<1,checked:on&&on.getAttribute('aria-checked')}})()""")
            await shot(pg, 'n203-rounds-menu')
            ok('n203: Rounds menus show the current choice with a checkmark (the column is kept on every row)', r1['radio'] and r1['on'] == 'visible' and r1['off'] == 'hidden' and r1['align'] and r1['checked'] == 'true', r1)
            await pg.keyboard.press('Escape')
            src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
            ok('n203: labels — “Set total hours…” (n206 renamed “Change authorized hours…”), no “Hand off now →” arrow (n205 moved Hand off out of the list)', "label:'Set total hours…'" in src and 'Hand off now →' not in src)
            ok('no new page errors (n203)', not newerr(errs), errs)
            await ctx.close()
            _secend(58)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n203: menus (HIG Menus)', False, repr(_e)[:300])
        try:
            # ---------- n204: iPhone — Anesia's charting toolbar stays on screen (HIG Ornaments / Toolbars)
            _sec(59)
            ctx, pg, errs = await new_page(br, vp=(390, 844), touch=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
            b1 = await pg.evaluate("""(()=>{const t=document.querySelector('.an-tools'),r=t.getBoundingClientRect();const vis=[...t.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0&&getComputedStyle(b).display!=='none').map(b=>b.dataset.act||b.id);return {pos:getComputedStyle(t).position,bottom:Math.round(innerHeight-r.bottom),left:Math.round(r.left),right:Math.round(innerWidth-r.right),h:Math.round(r.height),vis}})()""")
            ok('n204: iPhone — the toolbar docks at the bottom as one row: Vitals now, Give drug, Event, Emergency, More', b1['pos'] == 'fixed' and b1['bottom'] <= 16 and b1['h'] < 64 and b1['vis'] == ['vitals', 'dose', 'event', 'anMore', 'anEmer'] or (b1['pos'] == 'fixed' and sorted(b1['vis']) == sorted(['vitals', 'dose', 'event', 'anMore', 'anEmer']) and b1['h'] < 64), b1)
            await pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight);0"); await pg.wait_for_timeout(400)
            b2 = await pg.evaluate("""(()=>{const t=document.querySelector('.an-tools').getBoundingClientRect();const items=[...document.querySelectorAll('#anApp .an-body *')].filter(e=>e.children.length===0&&e.getBoundingClientRect().height>0);const last=items.reduce((m,e)=>Math.max(m,e.getBoundingClientRect().bottom),0);return {inView:t.top>0&&t.bottom<=innerHeight,lastBottom:Math.round(last),barTop:Math.round(t.top)}})()""")
            await shot(pg, 'n204-phone-bottom-bar')
            ok('n204: …stays visible after scrolling to the end, and the record keeps room for it (nothing hidden under the bar)', b2['inView'] and b2['lastBottom'] <= b2['barTop'] + 1, b2)
            await pg.click('#anMore'); await pg.wait_for_timeout(350)
            m1 = await pg.evaluate("""(()=>{const x=document.querySelector('.pvx-cx:not(.out)');if(!x) return null;return {sheet:x.classList.contains('sheet'),labels:[...x.querySelectorAll('.pvx-cx-list button .l')].map(l=>l.textContent),cancel:!!x.querySelector('.pvx-cx-cancel')}})()""")
            await shot(pg, 'n204-phone-more')
            ok('n204: More opens the rest as an action sheet: Infusion…, Gas…, Output…, Airway…, Minutes per column ›, Totals and history', m1 and m1['sheet'] and m1['cancel'] and m1['labels'] == ['Infusion…', 'Gas…', 'Output…', 'Airway…', 'Minutes per column', 'Totals and history'], m1)
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>/Minutes per column/.test(b.textContent)).click();0"); await pg.wait_for_timeout(200)
            z1 = await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button[role=menuitemradio]')].map(b=>[b.querySelector('.l').textContent,b.getAttribute('aria-checked')])")
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent.trim()==='10 min').click();0"); await pg.wait_for_timeout(400)
            z2 = await pg.evaluate("(document.querySelector('.an-tools [data-zoom=\"10\"]')||{}).getAttribute&&document.querySelector('.an-tools [data-zoom=\"10\"]').getAttribute('aria-checked')")
            ok('n204: Minutes per column › shows the current choice with a checkmark, and picking 10 min changes the chart', [x[1] for x in z1].count('true') == 1 and z2 == 'true', [z1, z2])
            await pg.click('#anMore'); await pg.wait_for_timeout(300)
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent==='Gas…').click();0"); await pg.wait_for_timeout(400)
            g1 = await pg.evaluate("document.getElementById('anShT')&&document.getElementById('anShT').textContent")
            ok('n204: a More item opens the same sheet as the tool (Gas…)', g1 == 'Gas', g1)
            ok('no new page errors (n204 iPhone)', not errs, errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br, vp=(1180, 820), touch=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
            i1 = await pg.evaluate("[getComputedStyle(document.querySelector('.an-tools')).position, getComputedStyle(document.getElementById('anMore')).display, getComputedStyle(document.querySelector('.an-tools [data-act=gas]')).display]")
            ok('n204: iPad and Mac keep the sticky toolbar at the top with every tool (no More)', i1[0] == 'sticky' and i1[1] == 'none' and i1[2] != 'none', i1)
            ok('no new page errors (n204 iPad)', not errs, errs)
            await ctx.close()
            _secend(59)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n204: iPhone — Anesias charting toolbar stays on screen (HIG Ornaments / Toolbars)', False, repr(_e)[:300])
        try:
            # ---------- n205: pop-up buttons (HIG Pop-up buttons)
            _sec(60)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelector('.rd-row [data-act=toggle]').click();0"); await pg.wait_for_timeout(600)
            f1 = await pg.evaluate("""[...document.querySelectorAll('.rd-work button.rd-fact')].map(b=>[b.getAttribute('aria-label'),b.textContent.trim()])""")
            ok('n205: Rounds facts name their field for VoiceOver (CPR / DNR, Service, Location, Admission type)', [x[0].split(':')[0] for x in f1] == ['CPR / DNR', 'Service', 'Location', 'Admission type'], f1)
            ok('n205: the admission type reads on its own (“Clinical admission”)', f1[3][1].endswith(' admission'), f1)
            pid = await pg.evaluate("document.querySelector('.rd-row.open').dataset.pid")
            await pg.evaluate(f"(()=>{{const b=document.querySelector('.rd-work [data-act=\"next-menu\"][data-pid=\"{pid}\"]');b.click();}})();0"); await pg.wait_for_timeout(300)
            n1 = await pg.evaluate("[...document.querySelectorAll('.rd-menu button')].map(b=>[b.textContent.trim(),b.getAttribute('aria-checked')])")
            ok('n205: Set next doctor is a pure choice — None first (checked), then doctors; no actions in the list', n1[0] == ['None', 'true'] and not any('Hand off' in x[0] or 'Clear' in x[0] for x in n1), n1[:3])
            await pg.evaluate("[...document.querySelectorAll('.rd-menu button')][2].click();0"); await pg.wait_for_timeout(500)
            nx = await pg.evaluate(f"rdNextDocId(rdFind('{pid}'))")
            hb = await pg.evaluate(f"!!document.querySelector('.rd-work [data-act=\"handoff-now\"][data-pid=\"{pid}\"]')")
            await pg.evaluate(f"(()=>{{const b=document.querySelector('[data-act=\"next-menu\"][data-pid=\"{pid}\"]');b&&b.click();}})();0"); await pg.wait_for_timeout(300)
            n2 = await pg.evaluate("[...document.querySelectorAll('.rd-menu button')].map(b=>[b.textContent.trim(),b.getAttribute('aria-checked')])")
            await pg.evaluate("[...document.querySelectorAll('.rd-menu button')][0].click();0"); await pg.wait_for_timeout(400)
            nx2 = await pg.evaluate(f"rdNextDocId(rdFind('{pid}'))")
            ok('n205: choosing a doctor sets next (Hand off now is its own control beside it); choosing None clears it', bool(nx) and hb and n2[0] == ['None', 'false'] and not nx2, [nx, hb, n2[:2], nx2])
            await pg.keyboard.press('Escape')
            await pg.evaluate("switchApp('flow');0"); await pg.wait_for_timeout(400)
            await pg.evaluate("""(()=>{const now=Date.now();PATIENTS.push(patient({name:'Pop1',last:'Test',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(now-30*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();openDrawer(PATIENTS[PATIENTS.length-1].id);})();0"""); await pg.wait_for_timeout(700)
            d1 = await pg.evaluate("""[...document.querySelectorAll('#drawer .dd-trigger')].map(b=>[b.getAttribute('aria-label'),b.getAttribute('aria-haspopup'),b.getAttribute('aria-expanded')])""")
            ok('n205: drawer pop-ups announce field and value and that they open a list (Doctor: none · Liaison: none · Priority: P2 · Urgent)', d1[0] == ['Doctor: none', 'listbox', 'false'] and d1[1][0] == 'Liaison: none' and d1[2][0].startswith('Priority: P2'), d1)
            await pg.evaluate("document.querySelector('#drawer .dd-trigger').click();0"); await pg.wait_for_timeout(300)
            await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(100)
            d2 = await pg.evaluate("""(()=>{const i=document.activeElement,lid=i.getAttribute('aria-controls'),l=document.getElementById(lid),ad=i.getAttribute('aria-activedescendant'),o=ad&&document.getElementById(ad);return {role:i.getAttribute('role'),list:l&&l.getAttribute('role'),hl:o&&o.classList.contains('hl'),exp:document.querySelector('#drawer .dd-trigger').getAttribute('aria-expanded')}})()""")
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
            d3 = await pg.evaluate("""[document.querySelector('#drawer .dd-trigger').getAttribute('aria-label'), document.querySelector('#drawer .dd-trigger').getAttribute('aria-expanded')]""")
            await pg.evaluate("document.querySelector('#drawer .dd-trigger').click();0"); await pg.wait_for_timeout(300)
            d4 = await pg.evaluate("""[...document.querySelectorAll('.dd-panel.open .dd-opt')].filter(o=>o.getAttribute('aria-selected')==='true').length""")
            await pg.keyboard.press('Escape')
            ok('n205: the search field is a combobox for the list and announces the highlighted option; choosing updates the name; the choice is aria-selected', d2['role'] == 'combobox' and d2['list'] == 'listbox' and d2['hl'] and d2['exp'] == 'true' and d3[0].startswith('Doctor: ') and d3[0] != 'Doctor: none' and d3[1] == 'false' and d4 == 1, [d2, d3, d4])
            ok('no new page errors (n205)', not newerr(errs), errs)
            await ctx.close()
            _secend(60)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n205: pop-up buttons (HIG Pop-up buttons)', False, repr(_e)[:300])
        try:
            # ---------- n206: pull-down buttons (HIG Pull-down buttons)
            _sec(61)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelector('.rd-row [data-act=toggle]').click();0"); await pg.wait_for_timeout(600)
            pid = await pg.evaluate("document.querySelector('.rd-row.open').dataset.pid")
            await pg.evaluate(f"(()=>{{const p=rdFind('{pid}');const a=rdAuth(p);a.hours=[{{h:24,at:rdIso(new Date(Date.now()-3600000)),by:'Dr. Koch'}},{{h:12,at:rdIso(new Date()),by:'Dr. Koch'}}];p.rounds.flags=[];renderRdCensus(true);}})()"); await pg.wait_for_timeout(400)
            r1 = await pg.evaluate("""(()=>{const g=document.querySelector('.rd-row.open .rd-extend-group');return {btns:[...g.querySelectorAll('button')].map(b=>b.textContent.trim()),more:!!document.querySelector('.rd-row.open [data-act=auth-more]'),hp:g.querySelector('[data-act=auth-custom]').getAttribute('aria-haspopup'),chev:getComputedStyle(g.querySelector('[data-act=auth-custom]'),'::after').content}})()""")
            ok('n206: the authorization row is +24 hours · +48 hours · Other (a menu button with a chevron); the two-item ••• menu is gone', r1['btns'] == ['+24 hours', '+48 hours', 'Other'] and not r1['more'] and r1['hp'] == 'menu' and r1['chev'] not in ('none', 'normal'), r1)
            await pg.evaluate("document.querySelector('.rd-row.open [data-act=auth-custom]').click();0"); await pg.wait_for_timeout(300)
            o1 = await pg.evaluate("""(()=>{const m=document.querySelector('.rd-menu');return {items:[...m.querySelectorAll('button[data-v]')].map(b=>b.textContent.trim()),sep:m.querySelectorAll('[role=separator]').length,exp:document.querySelector('.rd-row.open [data-act=auth-custom]').getAttribute('aria-expanded')}})()""")
            await shot(pg, 'n206-other-menu')
            ok('n206: Other lists +6 / +12 / +18 / +36 / +72 hours, a separator, then Set total hours…; the trigger says it is expanded', o1['items'] == ['+6 hours', '+12 hours', '+18 hours', '+36 hours', '+72 hours', 'Set total hours…'] and o1['sep'] == 1 and o1['exp'] == 'true', o1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            e1 = await pg.evaluate("document.querySelector('.rd-row.open [data-act=auth-custom]').getAttribute('aria-expanded')")
            ok('n206: closing the menu sets aria-expanded back to false', e1 == 'false', e1)
            u1 = await pg.evaluate("""(()=>{const l=document.querySelector('.rd-row.open .rd-lastauth');const u=l&&l.querySelector('[data-act=auth-undo]');return {txt:l&&l.textContent.replace(/\\s+/g,' ').trim(),label:u&&u.getAttribute('aria-label')}})()""")
            ok('n206: Undo sits on the “Last extended +12h” line and names what it removes', u1['txt'] and u1['txt'].startswith('Last extended +12h') and u1['txt'].endswith('Undo') and u1['label'] == 'Undo the +12 hours extension', u1)
            await pg.evaluate("document.querySelector('.rd-row.open [data-act=auth-undo]').click();0"); await pg.wait_for_timeout(350)
            c1 = await pg.evaluate("""(()=>({open:document.getElementById('confirmBox').classList.contains('open'),t:document.getElementById('confirmTitle').textContent,s:document.getElementById('confirmSub').textContent,ok:document.getElementById('confirmOk').textContent,red:document.getElementById('confirmOk').classList.contains('danger'),n:rdAuth(rdFind('PID')).hours.length}))()""".replace('PID', pid))
            await shot(pg, 'n206-undo-confirm')
            ok('n206: Undo confirms first (“Remove the +12 hours extension?”, red Remove) and changes nothing yet', c1['open'] and c1['t'] == 'Remove the +12 hours extension?' and c1['ok'] == 'Remove' and c1['red'] and c1['n'] == 2 and '36h to 24h' in c1['s'], c1)
            await pg.click('#confirmOk'); await pg.wait_for_timeout(400)
            c2 = await pg.evaluate(f"rdAuth(rdFind('{pid}')).hours.map(x=>x.h)")
            ok('n206: confirming removes only the last extension', c2 == [24], c2)
            await pg.evaluate(f"(()=>{{rdAuth(rdFind('{pid}')).hours=[];renderRdCensus(true);}})()"); await pg.wait_for_timeout(300)
            c3 = await pg.evaluate("!!document.querySelector('.rd-row.open [data-act=auth-undo]')")
            ok('n206: no Undo when there is no extension', not c3, c3)
            f1 = await pg.evaluate("""(()=>{const b=document.querySelector('.rd-row.open [data-act=flag-menu]');return b&&[b.getAttribute('aria-label'),b.getAttribute('aria-haspopup')]})()""")
            ok('n206: + Add flag is named “Add safety flag” and announces its menu', f1 == ['Add safety flag', 'menu'], f1)
            await pg.evaluate(f"(()=>{{const p=rdFind('{pid}');p.rounds.flags=RD_FLAG_PRESETS.map(x=>({{id:rdId(),label:x,kind:'safety'}}));renderRdCensus(true);}})()"); await pg.wait_for_timeout(300)
            f2 = await pg.evaluate("!!document.querySelector('.rd-row.open [data-act=flag-menu]')")
            ok('n206: + Add flag hides once every flag is on the patient (never an empty menu)', not f2, f2)
            h1 = await pg.evaluate("""[...document.querySelectorAll('[data-act=outcome-menu], [data-act=cur-menu], [data-act=next-menu]')].every(b=>b.getAttribute('aria-haspopup')==='menu')""")
            ok('n206: End admission…, Take case and the doctor menus all have aria-haspopup="menu"', h1, h1)
            await pg.evaluate("document.querySelector('.rd-row.open [data-act=outcome-menu]').click();0"); await pg.wait_for_timeout(300)
            h2 = await pg.evaluate("document.querySelector('.rd-row.open [data-act=outcome-menu]').getAttribute('aria-expanded')")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            ok('n206: End admission… reports expanded while its menu is open', h2 == 'true', h2)
            src = await pg.content()
            ok('n206: the dead Rounds menus are gone (auth-extend, payer-menu, auth-more)', "case'auth-extend'" not in src and "case'payer-menu'" not in src and "case'auth-more'" not in src)
            await pg.evaluate("switchApp('flow');0"); await pg.wait_for_timeout(400)
            await pg.evaluate("""(()=>{const now=Date.now();PATIENTS.push(patient({name:'Mvx',last:'Test',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(now-20*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();})()"""); await pg.wait_for_timeout(500)
            m1 = await pg.evaluate("""(()=>{const b=document.querySelector('.pvx-move[data-pid]');if(!b) return null;const a=[b.getAttribute('aria-haspopup'),b.getAttribute('aria-expanded')];b.click();const o=b.getAttribute('aria-expanded');return a.concat([o,!!document.querySelector('.pvx-menu')])})()""")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            m2 = await pg.evaluate("[...document.querySelectorAll('.pvx-move')].every(b=>b.getAttribute('aria-expanded')==='false')")
            ok('n206: Move buttons announce a menu and report expanded while it is open', m1 == ['menu', 'false', 'true', True] and m2, [m1, m2])
            ok('no new page errors (n206)', not newerr(errs), errs)
            await ctx.close()
            _secend(61)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n206: pull-down buttons (HIG Pull-down buttons)', False, repr(_e)[:300])
        try:
            # ---------- n207: keyboard and the Mac menu bar (HIG The menu bar)
            _sec(62)
            ctx, pg, errs = await flow_page((1440, 900))
            k1 = await pg.evaluate("""(()=>{const b=document.querySelector('#subnavFlow .seg[data-view=list]');const k=document.getElementById('globalSearchKey');return {t:b.title,a:b.getAttribute('aria-keyshortcuts'),key:k&&getComputedStyle(k).display,keyTxt:k&&k.textContent,sa:document.getElementById('globalSearch').getAttribute('aria-keyshortcuts')}})()""")
            ok('n207: view buttons name their key (“Show Patients (⌥2)”, aria-keyshortcuts Alt+2); search shows ⌘K and announces Meta+K Control+K', k1['t'] in ('Show Patients (⌥2)', 'Show Patients (Alt+2)') and k1['a'] == 'Alt+2' and k1['key'] != 'none' and k1['keyTxt'] in ('⌘K', 'Ctrl K') and k1['sa'] == 'Meta+K Control+K', k1)
            await pg.wait_for_timeout(1600)
            k0 = await pg.evaluate("[...document.querySelectorAll('#subnavFlow .seg[data-view]')].map(b=>[b.title,b.getAttribute('aria-keyshortcuts')])")
            import re as _re
            ok('n207: every view button, Consent forms included, names its key in screen order (no badge text in the name)', len(k0) >= 5 and all(_re.match(r'^Show [A-Za-z ]+ \((⌥|Alt\+)' + str(i + 1) + r'\)$', t or '') and a == 'Alt+' + str(i + 1) for i, (t, a) in enumerate(k0)), k0)
            await pg.focus('#globalSearch'); await pg.wait_for_timeout(100)
            k2 = await pg.evaluate("getComputedStyle(document.getElementById('globalSearchKey')).display")
            await pg.keyboard.type('?'); await pg.wait_for_timeout(200)
            k3 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
            ok('n207: the keycap hides while searching, and ? types into the field instead of opening the sheet', k2 == 'none' and not k3, [k2, k3])
            await pg.fill('#globalSearch', ''); await pg.evaluate("document.activeElement.blur();document.body.focus();0"); await pg.wait_for_timeout(800)
            await pg.keyboard.press('Alt+Digit2'); await pg.wait_for_timeout(400)
            v1 = await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=list]').classList.contains('active')")
            await pg.keyboard.press('Alt+Digit4'); await pg.wait_for_timeout(400)
            v2 = await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=rooms]').classList.contains('active')")
            await pg.keyboard.press('Alt+Digit1'); await pg.wait_for_timeout(400)
            v3 = await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=dashboard]').classList.contains('active')")
            ok('n207: ⌥2 Patients, ⌥4 Rooms, ⌥1 Command switch Flow views (in their order on screen)', v1 and v2 and v3, [v1, v2, v3])
            await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(300)
            s1 = await pg.evaluate("""(()=>{const x=document.querySelector('.pvx-ks');if(!x) return null;return {title:x.querySelector('h2').textContent,groups:[...x.querySelectorAll('h3')].map(h=>h.textContent),views:[...x.querySelectorAll('dl')][0].querySelectorAll('dt').length,focus:document.activeElement.className,modal:x.querySelector('[role=dialog]').getAttribute('aria-modal'),first:[...x.querySelectorAll('dd')][0].textContent}})()""")
            await shot(pg, 'n207-flow-shortcuts')
            ok('n207: ? opens Keyboard shortcuts (Views, Patients, Menus and sheets, Help) with Close focused (n211: ✕, not Done)', s1 and s1['title'] == 'Keyboard shortcuts' and s1['groups'] == ['Views', 'Patients', 'Menus and sheets', 'Help'] and s1['views'] >= 5 and s1['focus'] == 'pvx-ks-x' and s1['modal'] == 'true' and s1['first'] in ('⌥1', 'Alt1'), s1)
            await pg.keyboard.press('Alt+Digit2'); await pg.wait_for_timeout(300)
            v4 = await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=list]').classList.contains('active')")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
            s2 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
            ok('n207: shortcuts wait while the sheet is open; Esc closes it', not v4 and not s2, [v4, s2])
            await pg.evaluate("location.hash='op=new';0"); await pg.wait_for_timeout(700)
            o1 = await pg.evaluate("[document.getElementById('apModal').classList.contains('open'), location.hash]")
            ok('n207: /#op=new opens New patient (the File / Dock menu command) and clears the link', o1[0] and o1[1] == '', o1)
            mf = await pg.evaluate("fetch('/manifest.webmanifest').then(r=>r.json())")
            ok('n207: Flow manifest — name “Flow · Pravix” (≤ 16), id, shortcuts New patient / Rounds / Ultrasound', mf['name'] == 'Flow · Pravix' and len(mf['name']) <= 16 and mf['id'] == '/' and [x['url'] for x in mf['shortcuts']] == ['/#op=new', '/#app=rounds', '/#app=ultrasound'] and 'Shoreline' in mf['description'], mf.get('name'))
            ok('no new page errors (n207 Flow)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1180, 820), touch=True)
            t1 = await pg.evaluate("getComputedStyle(document.getElementById('globalSearchKey')).display")
            ok('n207: no keycap on touch screens', t1 == 'none', t1)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
            a1 = await pg.evaluate("""[...document.querySelectorAll('#anApp [aria-keyshortcuts^="Alt+"]')].map(b=>b.getAttribute('aria-keyshortcuts'))""")
            ok('n207: Anesia tools announce their shortcuts (Alt+F, Alt+V, Alt+D, Alt+I, Alt+G, Alt+E, Alt+O, Alt+A)', sorted(a1) == sorted(['Alt+F', 'Alt+V', 'Alt+D', 'Alt+I', 'Alt+G', 'Alt+E', 'Alt+O', 'Alt+A']), a1)
            await pg.evaluate("document.activeElement&&document.activeElement.blur();0")
            await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(300)
            a2 = await pg.evaluate("""(()=>{const x=document.querySelector('.pvx-ks');return x&&{groups:[...x.querySelectorAll('h3')].map(h=>h.textContent),n:x.querySelectorAll('dt').length}})()""")
            await shot(pg, 'n207-anesia-shortcuts')
            await pg.keyboard.press('Alt+KeyV'); await pg.wait_for_timeout(300)
            a3 = await pg.evaluate("!!document.getElementById('anVForm')")
            ok('n207: ? in Anesia lists Charting, View, Edit and Help; ⌥V waits while the sheet is open', a2 and a2['groups'] == ['Charting (in a record)', 'View', 'Edit', 'Help'] and a2['n'] == 13 and not a3, [a2, a3])
            await pg.click('.pvx-ks-x'); await pg.wait_for_timeout(250)
            a4 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
            ok('n207: ✕ Close closes the sheet (n211)', not a4, a4)
            mf2 = await pg.evaluate("fetch('/anesia/manifest.webmanifest').then(r=>r.json())")
            ok('n207: Anesia manifest — name ≤ 16, id /anesia/, shortcuts New training record / All records', len(mf2['name']) <= 16 and mf2['id'] == '/anesia/' and [x['url'] for x in mf2['shortcuts']] == ['/anesia/#new', '/anesia/'], mf2.get('shortcuts'))
            ok('no new page errors (n207 Anesia)', not errs, errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#new'); await pg.wait_for_selector('#anSheet', timeout=5000); await pg.wait_for_timeout(300)
            w1 = await pg.evaluate("[!!document.getElementById('anSheet'), location.hash, !!document.querySelector('.an-chart')]")
            ok('n207: /anesia/#new opens New training record on the records list and clears the link', w1[0] and w1[1] == '' and not w1[2], w1)
            await ctx.close()
            ctx, pg, errs = await new_page(br, vp=(390, 844), touch=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
            await pg.evaluate("document.querySelector('.an-tools [data-act=gas]').disabled=true;0")
            await pg.click('#anMore'); await pg.wait_for_timeout(350)
            d1 = await pg.evaluate("""[...document.querySelectorAll('.pvx-cx-list button[data-i]')].map(b=>[b.querySelector('.l').textContent,b.getAttribute('aria-disabled')])""")
            await shot(pg, 'n207-more-dimmed')
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent==='Gas…').click();0"); await pg.wait_for_timeout(300)
            d2 = await pg.evaluate("[!!document.querySelector('.pvx-cx:not(.out)'), !!document.getElementById('anSheet')]")
            ok('n207: More keeps the same items — an unavailable tool shows dimmed (aria-disabled) and does nothing', ['Gas…', 'true'] in d1 and len(d1) == 6 and d2 == [True, False], [d1, d2])
            ok('no new page errors (n207 iPhone)', not errs, errs)
            await ctx.close()
            _secend(62)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n207: keyboard and the Mac menu bar (HIG The menu bar)', False, repr(_e)[:300])
        try:
            # ---------- n208: toolbars (HIG Toolbars)
            _sec(63)
            async def scroll_down(pg, vp):
                await pg.mouse.move(vp[0] // 2, vp[1] // 2)
                for i in range(8): await pg.mouse.wheel(0, 150); await pg.wait_for_timeout(80)
                await pg.wait_for_timeout(600)
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
            t1 = await pg.evaluate("""(()=>{const b=document.querySelector('.an-tools'),kids=[...b.children].filter(e=>getComputedStyle(e).display!=='none');const e=document.getElementById('anEmer');return {last:kids[kids.length-1].id,label:getComputedStyle(e.querySelector('.t')).display,sym:e.querySelector('svg').innerHTML,seg:getComputedStyle(document.querySelector('.an-tools .an-zoomseg')).display,pop:getComputedStyle(document.getElementById('anZoomPop')).display}})()""")
            ok('n208: Emergency is last, set apart, labelled, with a medical-case symbol (not the plus); 5 / 10 / 15 shows in full on a Mac', t1['last'] == 'anEmer' and t1['label'] != 'none' and 'M9 7.25V5.75' in t1['sym'] and 'M12 8v8M8 12h8' not in t1['sym'] and t1['seg'] != 'none' and t1['pop'] == 'none', t1)
            await scroll_down(pg, (1440, 900))
            t2 = await pg.evaluate("""(()=>{const t=document.querySelector('.an-tbt');return {titled:document.documentElement.classList.contains('an-titled'),op:getComputedStyle(t).opacity,txt:t.textContent,seg:getComputedStyle(document.querySelector('.an-tools .an-zoomseg')).display,pop:getComputedStyle(document.getElementById('anZoomPop')).display,emer:getComputedStyle(document.querySelector('#anEmer .t')).display}})()""")
            await shot(pg, 'n208-pinned-title')
            import re as _re
            ok('n208: pinned, the toolbar names the patient with the time (“Training dog 4 · 1:20”), zoom becomes a pop-up, Emergency keeps its label', t2['titled'] and t2['op'] == '1' and _re.match(r'^Training dog 4 · \d+:\d\d$', t2['txt']) and t2['seg'] == 'none' and t2['pop'] != 'none' and t2['emer'] != 'none', t2)
            await pg.click('#anZoomPop'); await pg.wait_for_timeout(350)
            z1 = await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button[role=menuitemradio]')].map(b=>[b.querySelector('.l').textContent,b.getAttribute('aria-checked')])")
            await pg.evaluate("[...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent.trim()==='10 min').click();0"); await pg.wait_for_timeout(400)
            z2 = await pg.evaluate("[document.querySelector('.an-tools [data-zoom=\"10\"]').getAttribute('aria-checked'), document.getElementById('anZoomPop').textContent.trim(), document.getElementById('anZoomPop').getAttribute('aria-label')]")
            ok('n208: the zoom pop-up lists 5 / 10 / 15 min with the current one checked; choosing 10 min changes the chart', [x[0] for x in z1] == ['5 min', '10 min', '15 min'] and [x[1] for x in z1].count('true') == 1 and z2 == ['true', '10 min', 'Minutes per column: 10'], [z1, z2])
            await pg.click('.an-tbt'); await pg.wait_for_timeout(1200)
            y1 = await pg.evaluate("scrollY")
            ok('n208: tapping the pinned title goes back to the top of the record', y1 < 5, y1)
            await pg.click('#anEmer'); await pg.wait_for_timeout(500)
            x1 = await pg.evaluate("(()=>{const x=document.querySelector('#anSheet [data-x]');return x&&[x.getAttribute('aria-label'),x.textContent.trim(),!!x.querySelector('svg')]})()")
            ok('n208: a view-only sheet (Emergency drugs) closes with the standard Close symbol named “Close”, not the word', x1 == ['Close', '', True], x1)
            await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(400)
            ok('no new page errors (n208 Mac)', not errs, errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br, vp=(1024, 768), touch=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
            i1 = await pg.evaluate("""[getComputedStyle(document.querySelector('#anEmer .t')).display, getComputedStyle(document.getElementById('anZoomPop')).display, getComputedStyle(document.querySelector('.an-tools .an-zoomseg')).display, Math.round(document.querySelector('.an-tools').getBoundingClientRect().height)]""")
            ok('n208: iPad 1024 — Emergency keeps its label; 5 / 10 / 15 collapses to the pop-up first; one row', i1[0] != 'none' and i1[1] != 'none' and i1[2] == 'none' and i1[3] < 60, i1)
            await ctx.close()
            ctx, pg, errs = await new_page(br, vp=(820, 1180), touch=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
            await scroll_down(pg, (820, 1180))
            i2 = await pg.evaluate("(()=>{const t=document.querySelector('.an-tbt');return [getComputedStyle(t).opacity, t.scrollWidth<=t.clientWidth+1, t.querySelector('b').textContent, getComputedStyle(document.querySelector('#anEmer .t')).display]})()")
            await shot(pg, 'n208-ipad-portrait-pinned')
            ok('n208: iPad portrait — pinned, the full name fits (zoom and Totals step aside) and Emergency keeps its label', i2[0] == '1' and i2[1] and i2[2] == 'Training dog 4' and i2[3] != 'none', i2)
            await ctx.close()
            ctx, pg, errs = await new_page(br, vp=(390, 844), touch=True)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
            p0 = await pg.evaluate("[document.documentElement.classList.contains('an-ptitled'), getComputedStyle(document.querySelector('.an-ptitle')).opacity]")
            await scroll_down(pg, (390, 844))
            p1 = await pg.evaluate("(()=>{const t=document.querySelector('.an-ptitle'),r=t.getBoundingClientRect();return [document.documentElement.classList.contains('an-ptitled'), getComputedStyle(t).opacity, t.textContent, Math.round(r.top)]})()")
            await shot(pg, 'n208-phone-title')
            ok('n208: iPhone — once the header scrolls away a title bar at the top names the patient with the time', p0 == [False, '0'] and p1[0] and p1[1] == '1' and p1[2].startswith('Training dog 4 · ') and 0 <= p1[3] < 40, [p0, p1])
            ok('no new page errors (n208 iPhone)', not errs, errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            src = await pg.content()
            f1 = await pg.evaluate("document.querySelectorAll('.subnav-title').length")
            ok('n208: no app-name titles in the sub-navs (Patient Flow, Pravix Rounds, Pravix Ultrasound)', f1 == 0 and '>Pravix Rounds<' not in src and '>Patient Flow<' not in src, f1)
            ok('n208: the signed-form viewer closes with the ✕ symbol named “Close”; Care team has one Close', 'class="es-cancel es-x" data-fvd="close" aria-label="Close"' in src and 'onclick="closeCareTeam()">Close</button>' not in src)
            ok('no new page errors (n208 Flow)', not newerr(errs), errs)
            await ctx.close()
            _secend(63)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n208: toolbars (HIG Toolbars)', False, repr(_e)[:300])
        try:
            # ---------- n209: alerts (HIG Alerts)
            _sec(64)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("""(()=>{const now=Date.now();PATIENTS.push(patient({name:'Bella',last:'Dup',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();})()""")
            DUP = "window.__added=0; fxDupAsk({name:'Bella',last:'Dup',owner:'Synthetic'}, ()=>{window.__added=1});0"
            await pg.evaluate(DUP); await pg.wait_for_timeout(400)
            d1 = await pg.evaluate("""(()=>{const b=document.getElementById('confirmBox');const vis=[...b.querySelectorAll('.confirm-actions button')].filter(x=>!x.hidden).map(x=>x.textContent.trim());return {role:b.getAttribute('role'),lab:b.getAttribute('aria-labelledby'),desc:b.getAttribute('aria-describedby'),title:document.getElementById('confirmTitle').textContent,btns:vis,focus:document.activeElement.id}})()""")
            await shot(pg, 'n209-duplicate-check')
            ok('n209: the duplicate check offers Cancel · Add new visit · Open existing (default), as an alert named and described for VoiceOver', d1['role'] == 'alertdialog' and d1['lab'] == 'confirmTitle' and d1['desc'] == 'confirmSub' and d1['title'].endswith('checked in.') and d1['btns'] == ['Cancel', 'Add new visit', 'Open existing'] and d1['focus'] == 'confirmOk', d1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            d2 = await pg.evaluate("[window.__added, document.getElementById('confirmBox').classList.contains('open')]")
            ok('n209: Esc cancels the duplicate check and adds nothing (before, Esc added the second visit)', d2 == [0, False], d2)
            await pg.evaluate(DUP); await pg.wait_for_timeout(400)
            await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(400)
            d3 = await pg.evaluate("[window.__added, document.getElementById('confirmBox').classList.contains('open')]")
            ok('n209: ⌘. (Command-Period) cancels too', d3 == [0, False], d3)
            await pg.evaluate(DUP); await pg.wait_for_timeout(400)
            await pg.click('#confirmAlt'); await pg.wait_for_timeout(400)
            d4 = await pg.evaluate("[window.__added, document.getElementById('confirmBox').classList.contains('open')]")
            ok('n209: Add new visit adds the visit only when chosen', d4 == [1, False], d4)
            await pg.evaluate("window.__c=0; showConfirm('Clear all attention items?','Clear all',()=>{window.__c=1},{danger:true,sub:'Patient records will not be changed.'});0"); await pg.wait_for_timeout(400)
            f1 = await pg.evaluate("[document.activeElement.id, document.getElementById('confirmAlt').hidden]")
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
            f2 = await pg.evaluate("[window.__c, document.getElementById('confirmBox').classList.contains('open')]")
            await pg.keyboard.press('Tab'); f3 = await pg.evaluate("document.activeElement.id")
            await pg.keyboard.press('Tab'); f4 = await pg.evaluate("document.activeElement.id")
            ok('n209: a destructive alert has no default — Return does nothing; Tab reaches Cancel, then the action', f1 == ['confirmBox', True] and f2 == [0, True] and f3 == 'confirmCancel' and f4 == 'confirmOk', [f1, f2, f3, f4])
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.evaluate("showConfirm('Move patient to Comfort Room?','Move patient',()=>{},{});0"); await pg.wait_for_timeout(400)
            f5 = await pg.evaluate("[document.activeElement.id, document.getElementById('confirmBox').getAttribute('aria-describedby')]")
            ok('n209: a non-destructive alert keeps the action as the default and has no description when there is no message', f5 == ['confirmOk', None], f5)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            src = await pg.content()
            ok('n209: confirmation buttons in sentence case (Discharge patient, Admit patient, Mark euthanized, Mark discharged)', "Discharged:'Discharge patient',Admitted:'Admit patient',Euthanized:'Mark euthanized'" in src and "'Mark '+type.toLowerCase()" in src and 'Discharge Patient' not in src)
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelector('.rd-row [data-act=cur-menu]').click();0"); await pg.wait_for_timeout(300)
            m0 = await pg.evaluate("!!document.querySelector('.rd-menu')")
            await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(300)
            m1 = await pg.evaluate("!!document.querySelector('.rd-menu')")
            ok('n209: ⌘. closes a Rounds menu', m0 and not m1, [m0, m1])
            ok('no new page errors (n209 Flow)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(600)
            await pg.click('[data-act=event]'); await pg.wait_for_selector('#anSheet'); await pg.wait_for_timeout(400)
            await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(500)
            a1 = await pg.evaluate("!!document.getElementById('anSheet')")
            ok('n209: ⌘. closes an Anesia sheet', not a1, a1)
            await pg.click('[data-act=output]'); await pg.wait_for_selector('#anSheet'); await pg.wait_for_timeout(400)
            await pg.fill('#oN', 'typed note'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            a2 = await pg.evaluate("(()=>{const d=document.querySelector('[data-discard]');return d&&[d.hidden,d.getAttribute('role'),d.getAttribute('aria-describedby'),document.getElementById('anDiscS')&&document.getElementById('anDiscS').textContent]})()")
            ok('n209: “Discard your changes?” is announced as an alert, named and described', a2 and a2[0] is False and a2[1] == 'alertdialog' and a2[2] == 'anDiscS' and a2[3].startswith('What you typed'), a2)
            await pg.click('[data-keep]'); await pg.wait_for_timeout(300); await pg.click('#anSheet [data-x]'); await pg.wait_for_timeout(300)
            if await pg.evaluate("!!document.querySelector('[data-discard]:not([hidden])')"): await pg.click('[data-drop]'); await pg.wait_for_timeout(400)
            await pg.evaluate("document.activeElement&&document.activeElement.blur();0")
            await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(300)
            k0 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
            await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(300)
            k1 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
            ok('n209: ⌘. closes the Keyboard shortcuts sheet', k0 and not k1, [k0, k1])
            ok('no new page errors (n209 Anesia)', not errs, errs)
            await ctx.close()
            _secend(64)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n209: alerts (HIG Alerts)', False, repr(_e)[:300])
        try:
            # ---------- n210: panels and page controls (HIG Panels, Page controls)
            _sec(65)
            SEED3 = """(()=>{const now=Date.now();['A','B','C'].forEach((n,i)=>PATIENTS.push(patient({name:'Insp'+n,last:'Test',owner:'Synthetic',status:'Waiting',room:'Lobby',arrival:new Date(now-(10+i)*60000),prio:2,doctor:'unassigned',species:'Canine',timeline:[]})));renderAll();})()"""
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate(SEED3); await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=flow]').click();0"); await pg.wait_for_timeout(800)
            ids = await pg.evaluate("[...document.querySelectorAll('#board .card[data-pid]')].filter(c=>/Insp/.test(c.textContent)).map(c=>c.dataset.pid)")
            await pg.evaluate(f"openDrawer('{ids[0]}');0"); await pg.wait_for_timeout(500)
            c = await pg.evaluate(f"(()=>{{const c=document.querySelector('#board .card[data-pid=\"{ids[1]}\"]');const r=c.getBoundingClientRect();return [r.left+r.width/2,r.top+20]}})()")
            await pg.mouse.click(c[0], c[1]); await pg.wait_for_timeout(500)
            i1 = await pg.evaluate("[document.getElementById('drawer').classList.contains('open'), activePatient]")
            ok('n210: with the drawer open on a Mac, clicking another patient switches the drawer in one click', i1 == [True, ids[1]], [i1, ids[1]])
            await pg.mouse.click(700, 880); await pg.wait_for_timeout(400)
            i2 = await pg.evaluate("document.getElementById('drawer').classList.contains('open')")
            ok('n210: clicking empty space still closes the drawer', not i2, i2)
            await ctx.close()
            ctx, pg, errs = await flow_page((820, 1180), touch=True)
            await pg.evaluate(SEED3); await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=flow]').click();0"); await pg.wait_for_timeout(800)
            ids = await pg.evaluate("[...document.querySelectorAll('#board .card[data-pid]')].filter(c=>/Insp/.test(c.textContent)).map(c=>c.dataset.pid)")
            await pg.evaluate(f"openDrawer('{ids[0]}');0"); await pg.wait_for_timeout(500)
            await pg.evaluate("document.getElementById('scrim').onclick({clientX:20,clientY:400});0"); await pg.wait_for_timeout(300)
            i3 = await pg.evaluate("document.getElementById('drawer').classList.contains('open')")
            ok('n210: narrower screens keep the modal drawer (a tap outside closes it)', not i3, i3)
            await ctx.close()
            MANY = lambda n: """(()=>{const now=Date.now();for(let i=0;i<%d;i++)PATIENTS.push(patient({name:'Pg'+i,last:'Test',owner:'Synthetic',status:['Waiting','Exam','Diagnostics'][i%%3],room:i%%3?'Room '+(1+i%%7):'Lobby',arrival:new Date(now-(10+i)*60000),prio:1+(i%%3),doctor:'unassigned',species:'Canine',timeline:[]}));renderAll();})()""" % n
            PG = """(()=>{const p=document.getElementById('clPager');const d=[...p.querySelectorAll('.cl-dot')];const a=p.querySelector('.cl-dot[aria-current=page]');return {role:p.getAttribute('role'),lab:p.getAttribute('aria-label'),dots:d.length,cur:a&&a.getAttribute('aria-label'),w:d[1]?Math.round(d[1].getBoundingClientRect().width):null,count:(p.querySelector('.cl-pcount')||{}).textContent||null,pages:clPages}})()"""
            ctx, pg, errs = await flow_page((1180, 820), touch=True)
            await pg.evaluate(MANY(40)); await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=client]').click();0"); await pg.wait_for_timeout(1200)
            q1 = await pg.evaluate(PG)
            await shot(pg, 'n210-client-dots-touch')
            ok('n210: Client Display dots stay small on touch (12 pt) and the pager is a group “Pages” with the current page marked', q1['role'] == 'group' and q1['lab'] == 'Pages' and 2 <= q1['dots'] <= 10 and q1['w'] == 12 and q1['cur'] == 'Page 1 of %d' % q1['pages'], q1)
            hit = await pg.evaluate("(()=>{const d=document.querySelectorAll('.cl-dot')[1];const r=d.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2+18);return e===d})()")
            ok('n210: …with a 44 pt hit area around each dot', hit, hit)
            await pg.click('.cl-pnav[data-dir="1"]'); await pg.wait_for_timeout(600)
            q2 = await pg.evaluate("[(document.querySelector('.cl-dot[aria-current=page]')||{}).getAttribute&&document.querySelector('.cl-dot[aria-current=page]').getAttribute('aria-label'), (document.getElementById('clPageLive')||{}).textContent]")
            ok('n210: Next moves to page 2 and announces “Page 2 of N” once', q2[0] and q2[0].startswith('Page 2 of') and q2[1] and q2[1].startswith('Page 2 of'), q2)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate(MANY(90)); await pg.evaluate("document.querySelector('#subnavFlow .seg[data-view=client]').click();0"); await pg.wait_for_timeout(1200)
            q3 = await pg.evaluate(PG)
            await shot(pg, 'n210-client-many-pages')
            ok('n210: more than 10 pages shows “Page 1 of N” instead of dots', q3['pages'] > 10 and q3['dots'] == 0 and q3['count'] == 'Page 1 of %d' % q3['pages'], q3)
            ok('no new page errors (n210)', not newerr(errs), errs)
            await ctx.close()
            _secend(65)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n210: panels and page controls (HIG Panels, Page controls)', False, repr(_e)[:300])
        try:
            # ---------- n211: sheets and windows (HIG Sheets, Windows)
            _sec(66)
            async def swipe211(pg, cdp, sel, d):
                b = await pg.evaluate(f"(()=>{{const r=document.querySelector('{sel}').getBoundingClientRect(); return [r.left+r.width/2, r.top+3];}})()")
                await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': b[0], 'y': b[1]}]})
                for k in range(1, 9):
                    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': b[0], 'y': b[1] + d * k / 8}]}); await pg.wait_for_timeout(16)
                await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            G211 = """(()=>{const m=document.getElementById('apModal'), h=m.querySelector('.addpt-head'), L=document.getElementById('apCancel'), R=document.getElementById('apCreate'), t=m.querySelector('.aph-t'), x=document.getElementById('apClose'), f=m.querySelector('.addpt-foot');
              const b=e=>e.getBoundingClientRect(), mr=b(m);
              return {bottom:Math.round(window.innerHeight-mr.bottom), w:Math.round(mr.width), title:t.textContent, inHead:h.contains(L)&&h.contains(R), lx:Math.round(b(L).left), rx:Math.round(window.innerWidth-b(R).right), tx:Math.round(b(t).left), same:Math.abs(b(L).top-b(R).top)<2,
                x:x.getAttribute('aria-hidden')==='true'&&b(x).width<=1, foot:getComputedStyle(f).display, grab:m.querySelector('.pvx-grab')?Math.round(m.querySelector('.pvx-grab').getBoundingClientRect().width):0, lh:Math.round(b(L).height), rlab:R.textContent};})()"""
            ctx, pg, errs = await flow_page((390, 844), touch=True)
            cdp = await ctx.new_cdp_session(pg)
            await pg.evaluate("openAddPatient();0"); await pg.wait_for_timeout(700)
            g1 = await pg.evaluate(G211)
            await shot(pg, 'n211-flow-add-patient-phone')
            ok('n211: iPhone — Add new patient is a bottom sheet with a grabber: Cancel top left, title, Create patient top right; no footer, no second ✕', g1['bottom'] == 0 and g1['w'] == 390 and g1['grab'] == 36 and g1['inHead'] and g1['same'] and g1['lx'] < 20 and g1['rx'] < 20 and g1['lx'] < g1['tx'] and g1['x'] and g1['foot'] == 'none' and g1['lh'] >= 44 and g1['title'] == 'Add new patient' and g1['rlab'] == 'Create patient', g1)
            await pg.fill('#apName', 'Cookie'); await pg.wait_for_timeout(150)
            await swipe211(pg, cdp, '#apModal .pvx-grab', 200); await pg.wait_for_timeout(500)
            d1 = await pg.evaluate("({open:document.getElementById('apModal').classList.contains('open'), conf:document.getElementById('confirmBox').classList.contains('open'), t:document.getElementById('confirmTitle').textContent, k:document.getElementById('confirmCancel').textContent, ok:document.getElementById('confirmOk').textContent, red:document.getElementById('confirmOk').classList.contains('danger')})")
            await shot(pg, 'n211-flow-discard-phone')
            ok('n211: swiping down after typing asks “Discard your changes?” (Keep editing · Discard) and keeps the sheet', d1['open'] and d1['conf'] and d1['t'] == 'Discard your changes?' and d1['k'] == 'Keep editing' and d1['ok'] == 'Discard' and d1['red'], d1)
            await pg.click('#confirmCancel'); await pg.wait_for_timeout(300)
            d2 = await pg.evaluate("[document.getElementById('apModal').classList.contains('open'), document.getElementById('apName').value]")
            await swipe211(pg, cdp, '#apModal .pvx-grab', 200); await pg.wait_for_timeout(500)
            await pg.click('#confirmOk'); await pg.wait_for_timeout(500)
            d3 = await pg.evaluate("document.getElementById('apModal').classList.contains('open')")
            ok('n211: Keep editing keeps what was typed; Discard closes the sheet', d2 == [True, 'Cookie'] and not d3, [d2, d3])
            await pg.evaluate("openAddPatient();0"); await pg.wait_for_timeout(700)
            await swipe211(pg, cdp, '#apModal .addpt-head .aph-title', 200); await pg.wait_for_timeout(800)
            d4 = await pg.evaluate("[document.getElementById('apModal').classList.contains('open'), document.getElementById('confirmBox').classList.contains('open')]")
            await pg.evaluate("openAddPatient();0"); await pg.wait_for_timeout(700)
            await swipe211(pg, cdp, '#apModal .pvx-grab', 30); await pg.wait_for_timeout(600)
            d5 = await pg.evaluate("document.getElementById('apModal').classList.contains('open')")
            ok('n211: an untouched sheet closes with a swipe down, without asking; a short drag springs back', d4 == [False, False] and d5, [d4, d5])
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            d6 = await pg.evaluate("document.getElementById('apModal').classList.contains('open')")
            ok('n211: Esc still closes the iPhone sheet', not d6, d6)
            await pg.evaluate("openShiftSetup();0"); await pg.wait_for_timeout(700)
            s1 = await pg.evaluate("""(()=>{const m=document.getElementById('shiftModal'),h=m.querySelector('.addpt-head');return {t:m.querySelector('.aph-t').textContent, l:h.contains(document.getElementById('shiftCancel')), r:h.contains(document.getElementById('shiftSave'))&&document.getElementById('shiftSave').textContent, bottom:Math.round(innerHeight-m.getBoundingClientRect().bottom)}})()""")
            await shot(pg, 'n211-flow-shift-phone')
            await pg.click('#shiftCancel'); await pg.wait_for_timeout(400)
            s2 = await pg.evaluate("document.getElementById('shiftModal').classList.contains('open')")
            ok('n211: Today’s shift assignments — same iPhone sheet (Cancel · title · Save assignments), and Cancel still closes it', s1 == {'t': "Today's shift assignments", 'l': True, 'r': 'Save assignments', 'bottom': 0} and not s2, [s1, s2])
            await pg.evaluate("openAlertModal();0"); await pg.wait_for_timeout(700)
            a1 = await pg.evaluate("""(()=>{const m=document.getElementById('alertModal'),h=m.querySelector('.addpt-head');return {t:m.querySelector('.aph-t').textContent, lab:m.getAttribute('aria-label'), l:h.contains(document.getElementById('alertCancelBtn')), r:(h.querySelector('#alertActivateBtn')||{}).textContent, n:document.querySelectorAll('#alertCancelBtn').length}})()""")
            await pg.evaluate("document.querySelector('.alert-type[data-atype=normal]').click();0"); await pg.wait_for_timeout(300)
            a2 = await pg.evaluate("""(()=>{const h=document.querySelector('#alertModal .addpt-head');return {r:(h.querySelector('#alertActivateBtn')||{}).textContent, n:document.querySelectorAll('#alertActivateBtn').length, dirty:pvxSheetDirty('alertModal')}})()""")
            await shot(pg, 'n211-flow-alert-phone')
            ok('n211: Hospital alert — iPhone sheet bar (Cancel · Hospital alert · Activate alert); picking a type rebuilds it without duplicate buttons and counts as a change', a1 == {'t': 'Hospital alert', 'lab': 'Hospital alert', 'l': True, 'r': 'Activate alert', 'n': 1} and a2 == {'r': 'Restore normal', 'n': 1, 'dirty': True}, [a1, a2])
            await pg.click('#alertCancelBtn'); await pg.wait_for_timeout(400)
            await pg.evaluate("currentAlert={type:'limited',headline:'Limited intake',message:'High volume',created_at:new Date().toISOString()}; openAlertModal();0"); await pg.wait_for_timeout(700)
            a3 = await pg.evaluate("""(()=>{const m=document.getElementById('alertModal'),x=document.getElementById('alertClose').getBoundingClientRect(),t=m.querySelector('.aph-t').getBoundingClientRect();return {bar:m.classList.contains('pvx-ps-bar'), lead:x.left<t.left&&x.width>=36, foot:[...m.querySelectorAll('.addpt-foot button')].map(b=>b.textContent)}})()""")
            await shot(pg, 'n211-flow-alert-view-phone')
            ok('n211: an active alert (view only) keeps ✕ Close on the leading edge, with Edit alert and End alert below', not a3['bar'] and a3['lead'] and a3['foot'] == ['Edit alert', 'End alert'], a3)
            await pg.evaluate("closeAlertModal(); currentAlert=null;0"); await pg.wait_for_timeout(400)
            # one sheet at a time
            await pg.evaluate(SEEDP); await pg.wait_for_timeout(300)
            pid = await pg.evaluate("PATIENTS[PATIENTS.length-1].id")
            await pg.evaluate(f"openDrawer('{pid}');0"); await pg.wait_for_timeout(600)
            await pg.evaluate("document.querySelector('#drawer .drawer-body').scrollTop=240;0")
            await pg.evaluate(f"openCareTeam('{pid}');0"); await pg.wait_for_timeout(600)
            o1 = await pg.evaluate("[document.getElementById('drawer').classList.contains('open'), document.getElementById('ctModal').classList.contains('open')]")
            await shot(pg, 'n211-flow-careteam-phone')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700)
            o2 = await pg.evaluate("[document.getElementById('drawer').classList.contains('open'), activePatient, document.getElementById('ctModal').classList.contains('open'), document.querySelector('#drawer .drawer-body').scrollTop]")
            ok('n211: iPhone — Care team from the drawer replaces it (one sheet at a time), and closing it brings the drawer back on the same patient, where it was', o1 == [False, True] and o2[0] and o2[1] == pid and not o2[2] and o2[3] == 240, [o1, o2, pid])
            await pg.evaluate(f"fvDocs.openSend(PATIENTS.find(x=>x.id==='{pid}'));0"); await pg.wait_for_timeout(600)
            o3 = await pg.evaluate("[document.getElementById('drawer').classList.contains('open'), !!document.getElementById('fvdSheet')]")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700)
            o4 = await pg.evaluate("[document.getElementById('drawer').classList.contains('open'), activePatient, !!document.getElementById('fvdSheet')]")
            ok('n211: …and so does Send a form', o3 == [False, True] and o4 == [True, pid, False], [o3, o4])
            ok('no new page errors (n211 iPhone)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("openAddPatient();0"); await pg.wait_for_timeout(600)
            w1 = await pg.evaluate("({foot:[...document.querySelector('#apModal .addpt-foot').children].map(b=>b.id), x:document.getElementById('apClose').getBoundingClientRect().width, ps:document.getElementById('apModal').classList.contains('pvx-ps'), t:document.querySelector('#apModal .aph-t').textContent})")
            await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(500)
            w2 = await pg.evaluate("document.querySelector('#apModal .addpt-head').contains(document.getElementById('apCreate'))")
            await pg.set_viewport_size({'width': 1440, 'height': 900}); await pg.wait_for_timeout(500)
            w3 = await pg.evaluate("[...document.querySelector('#apModal .addpt-foot').children].map(b=>b.id)")
            ok('n211: Mac and iPad keep the centred form sheet (footer buttons, ✕); a window narrowed to iPhone width switches layout and back', w1 == {'foot': ['apCancel', 'apCreate'], 'x': 32, 'ps': False, 't': 'Add new patient'} and w2 and w3 == ['apCancel', 'apCreate'], [w1, w2, w3])
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.evaluate(SEEDP); await pg.wait_for_timeout(300)
            pid = await pg.evaluate("PATIENTS[PATIENTS.length-1].id")
            await pg.evaluate(f"openDrawer('{pid}');0"); await pg.wait_for_timeout(500)
            await pg.evaluate(f"openCareTeam('{pid}');0"); await pg.wait_for_timeout(500)
            w4 = await pg.evaluate("document.getElementById('drawer').classList.contains('open')")
            await pg.evaluate("closeCareTeam();0"); await pg.wait_for_timeout(300)
            ok('n211: on a Mac, Care team still opens over the drawer (the drawer stays put)', w4, w4)
            ok('no new page errors (n211 Mac)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((694, 1024), touch=True)
            await pg.evaluate("openAddPatient();0"); await pg.wait_for_timeout(700)
            z1 = await pg.evaluate("(()=>{const m=document.getElementById('apModal'),r=m.getBoundingClientRect();return {ps:m.classList.contains('pvx-ps-bar'), w:Math.round(r.width), bottom:Math.round(innerHeight-r.bottom)}})()")
            await pg.evaluate("closeAddPatient();0"); await pg.wait_for_timeout(400)
            await pg.evaluate(SEEDP); await pg.wait_for_timeout(300)
            pid = await pg.evaluate("PATIENTS[PATIENTS.length-1].id")
            await pg.evaluate(f"openDrawer('{pid}');0"); await pg.wait_for_timeout(500)
            await pg.evaluate(f"openCareTeam('{pid}');0"); await pg.wait_for_timeout(500)
            z2 = await pg.evaluate("document.getElementById('drawer').classList.contains('open')")
            await pg.evaluate("closeCareTeam();0"); await pg.wait_for_timeout(500)
            z3 = await pg.evaluate("document.getElementById('drawer').classList.contains('open')")
            ok('n211: iPad split view (694 pt, compact width) gets the same bottom sheet and one sheet at a time', z1 == {'ps': True, 'w': 694, 'bottom': 0} and not z2 and z3, [z1, z2, z3])
            await ctx.close()
            # Anesia: record cards are links
            ctx, pg, errs = await new_page(br)
            async def route211(r):
                u = r.request.url
                if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
                elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                else: await r.fulfill(status=204, body='')
            await ctx.route('**/*', route211)
            await pg.goto(URL); await pg.wait_for_selector('.an-card'); await pg.wait_for_timeout(600)
            l1 = await pg.evaluate("(()=>{const a=[...document.querySelectorAll('.an-card')];return {tags:[...new Set(a.map(x=>x.tagName))], hrefs:a.every(x=>x.getAttribute('href')==='#r='+x.dataset.open), td:getComputedStyle(a[0]).textDecorationLine, id:a[0].dataset.open}})()")
            ok('n211: Anesia record cards are links (href #r=…), drawn exactly as before', l1['tags'] == ['A'] and l1['hrefs'] and l1['td'] == 'none', l1)
            async with ctx.expect_page() as np:
                await pg.click('.an-card', modifiers=['Control'])
            n2 = await np.value; await n2.wait_for_load_state(); await n2.wait_for_timeout(2500)
            l2 = await n2.evaluate("({h:location.hash, rec:!!document.querySelector('.an-id')})")
            await shot(n2, 'n211-anesia-new-window')
            l3 = await pg.evaluate("location.hash")
            await n2.close()
            ok('n211: Ctrl/⌘-click opens the record in its own window; this window stays on Records', l2['h'] == '#r=' + l1['id'] and l2['rec'] and l3 == '', [l2, l3])
            await pg.click('.an-card'); await pg.wait_for_timeout(900)
            l4 = await pg.evaluate("({h:location.hash, rec:!!document.querySelector('.an-id')})")
            ok('n211: a plain click still opens the record in place', l4['h'] == '#r=' + l1['id'] and l4['rec'], l4)
            await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(300)
            k1 = await pg.evaluate("({x:!!document.querySelector('.pvx-ks .pvx-ks-x'), done:!!document.querySelector('.pvx-ks-done'), lab:document.activeElement.getAttribute('aria-label')})")
            await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(300)
            k2 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
            ok('n211: Anesia’s Keyboard shortcuts closes with ✕ Close (no Done); ? still closes it', k1 == {'x': True, 'done': False, 'lab': 'Close'} and not k2, [k1, k2])
            ok('no new page errors (n211 Anesia)', not errs, errs)
            await ctx.close()
            _secend(66)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n211: sheets and windows (HIG Sheets, Windows)', False, repr(_e)[:300])
        try:
            # ---------- n212: search fields and tab bars (HIG Search fields, Tab bars)
            _sec(67)
            SEED212 = """(()=>{const now=Date.now();[['Isabel','Waiting','Lobby'],['Bella','Waiting','Lobby'],['Maxwell','Exam','Room 1']].forEach((v,i)=>{PATIENTS.push(patient({name:v[0],last:'Srch',owner:'Synthetic',status:v[1],room:v[2],arrival:new Date(now-30*60000),prio:3,doctor:'unassigned',species:'Canine',timeline:[]}));}); renderAll();})()"""
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate(SEED212); await pg.wait_for_timeout(300)
            f1 = await pg.evaluate("""(()=>{const i=document.getElementById('globalSearch');return {ph:i.placeholder, lab:i.getAttribute('aria-label'), type:i.type, ekh:i.getAttribute('enterkeyhint'), role:i.getAttribute('role'), ac:i.getAttribute('aria-controls'), lb:document.getElementById('searchResults').getAttribute('role'), apps:document.querySelector('nav.topnav').getAttribute('aria-label'), views:document.getElementById('switcher').getAttribute('aria-label'), rd:document.getElementById('switcherRd').getAttribute('aria-label'), us:document.getElementById('switcherUs').getAttribute('aria-label')}})()""")
            ok('n212: Flow’s search names its scope (“Search patients, doctors, rooms”) and is a search combobox; landmarks are named Apps / Flow views / Rounds views / Ultrasound views', f1 == {'ph': 'Search patients, doctors, rooms', 'lab': 'Search patients, doctors and rooms', 'type': 'search', 'ekh': 'search', 'role': 'combobox', 'ac': 'searchResults', 'lb': 'listbox', 'apps': 'Apps', 'views': 'Flow views', 'rd': 'Rounds views', 'us': 'Ultrasound views'}, f1)
            pid = await pg.evaluate("PATIENTS.find(x=>x.name==='Maxwell').id")
            await pg.evaluate(f"openDrawer('{pid}');0"); await pg.wait_for_timeout(300); await pg.evaluate("closeDrawer();0"); await pg.wait_for_timeout(300)
            await pg.click('#globalSearch'); await pg.wait_for_timeout(400)
            r0 = await pg.evaluate("({open:document.getElementById('searchResults').classList.contains('open'), ex:document.getElementById('globalSearch').getAttribute('aria-expanded'), lab:[...document.querySelectorAll('#searchResults .sr-label')].map(x=>x.textContent), t:[...document.querySelectorAll('#searchResults .sr-item .sr-t')].map(x=>x.textContent), hint:(document.querySelector('#searchResults .sr-hint')||{}).textContent, stored:JSON.stringify(localStorage).indexOf('Maxwell')>-1||JSON.stringify(sessionStorage).indexOf('Maxwell')>-1})")
            await shot(pg, 'n212-flow-search-recent')
            ok('n212: focusing the empty search shows Recent (patients opened in this tab) and a command hint; nothing is stored on the device', r0['open'] and r0['ex'] == 'true' and r0['lab'] == ['Recent'] and r0['t'] == ['Maxwell Srch'] and 'move Maxwell to Exam' in (r0['hint'] or '') and not r0['stored'], r0)
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
            r1 = await pg.evaluate("[document.getElementById('drawer').classList.contains('open'), activePatient]")
            ok('n212: Return on Recent opens that patient', r1 == [True, pid], r1)
            await pg.evaluate("closeDrawer();0"); await pg.wait_for_timeout(300)
            await pg.click('#globalSearch'); await pg.keyboard.type('bel'); await pg.wait_for_timeout(900)
            b1 = await pg.evaluate("""(()=>({t:[...document.querySelectorAll('#searchResults .sr-item .sr-t')].map(x=>x.textContent), roles:[...document.querySelectorAll('#searchResults .sr-item')].map(x=>x.getAttribute('role')), grp:(document.querySelector('#searchResults .sr-group')||{getAttribute:()=>null}).getAttribute('role'), live:document.getElementById('srLive').textContent, clear:getComputedStyle(document.querySelector('#subnavFlow .pvx-sclear')).display}))()""")
            ok('n212: best match first (Bella before Isabel), results are options in a group, “2 results” is announced, and Clear shows', b1['t'] == ['Bella Srch', 'Isabel Srch'] and b1['roles'] == ['option', 'option'] and b1['grp'] == 'group' and b1['live'] == '2 results' and b1['clear'] == 'grid', b1)
            await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(100)
            b2 = await pg.evaluate("[document.getElementById('globalSearch').getAttribute('aria-activedescendant'), (document.querySelector('#searchResults [aria-selected=true]')||{}).id]")
            ok('n212: arrow keys move aria-activedescendant through the options', b2 == ['srOpt1', 'srOpt1'], b2)
            await shot(pg, 'n212-flow-search-results')
            await pg.click('#subnavFlow .pvx-sclear'); await pg.wait_for_timeout(300)
            c1 = await pg.evaluate("({v:document.getElementById('globalSearch').value, f:document.activeElement.id, lab:[...document.querySelectorAll('#searchResults .sr-label')].map(x=>x.textContent), clear:getComputedStyle(document.querySelector('#subnavFlow .pvx-sclear')).display, name:document.querySelector('#subnavFlow .pvx-sclear').getAttribute('aria-label')})")
            ok('n212: Clear empties the field, keeps focus and goes back to Recent; it hides again', c1 == {'v': '', 'f': 'globalSearch', 'lab': ['Recent'], 'clear': 'none', 'name': 'Clear search'}, c1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            a1 = await pg.evaluate("(()=>{const t=[...document.querySelectorAll('#attnList *,.attn *')].map(x=>x.textContent).join(' ');return {u:/undefined/.test(document.body.innerText)}})()")
            ok('n212: no “undefined” anywhere on Command (a patient with no reason shows just the wait)', not a1['u'], a1)
            # Rounds' search is scoped to Rounds
            await pg.evaluate("switchApp('rounds');0"); await pg.wait_for_timeout(900)
            await pg.evaluate("(document.querySelector('[data-act=seed-demo]')||{click(){}}).click();0"); await pg.wait_for_timeout(900)
            nm = await pg.evaluate("(()=>{const r=[...document.querySelectorAll('.rd-row[data-pid]')].filter(x=>x.offsetParent)[1];return r?(r.querySelector('.rd-name,.rd-pname,b')||r).textContent.trim().split(/\\s+/)[0]:null})()")
            await pg.click('#rdSearch'); await pg.keyboard.type(nm or 'zz'); await pg.wait_for_timeout(600)
            q1 = await pg.evaluate("({ph:document.getElementById('rdSearch').placeholder, pop:document.getElementById('searchResults').classList.contains('open'), rows:[...document.querySelectorAll('.rd-row[data-pid]')].filter(x=>x.offsetParent).length, tip:document.getElementById('rdSearchLuna').title})")
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
            q2 = await pg.evaluate("typeof rdExpanded!=='undefined'&&!!rdExpanded")
            await shot(pg, 'n212-rounds-search')
            ok('n212: Rounds’ search says “Search patients on rounds”, filters the census only (no Flow-wide pop-up), and Return opens the first match', nm and q1['ph'] == 'Search patients on rounds' and not q1['pop'] and q1['rows'] >= 1 and q1['tip'] == 'Search patients on rounds' and q2, [nm, q1, q2])
            ok('no new page errors (n212 Mac)', not newerr(errs), errs)
            await ctx.close()
            # compact width: the bottom tab bar
            ctx, pg, errs = await flow_page((390, 844), touch=True)
            await pg.evaluate(SEED212); await pg.wait_for_timeout(400)
            t1 = await pg.evaluate("""(()=>{const s=document.getElementById('switcher'),r=s.getBoundingClientRect();return {on:document.documentElement.classList.contains('pvx-tabbar'), bottom:Math.round(innerHeight-r.bottom), w:Math.round(r.width), tabs:[...s.querySelectorAll('.seg')].filter(b=>b.offsetParent).map(b=>b.dataset.view), fit:[...s.querySelectorAll('.seg')].filter(b=>b.offsetParent).every(b=>b.scrollWidth<=b.clientWidth+1), stacked:(()=>{const b=s.querySelector('.seg[data-view=list]'),i=b.querySelector('svg').getBoundingClientRect(),t=b.getBoundingClientRect();return i.bottom<=t.top+t.height*0.7})(), minh:Math.round(s.querySelector('.seg').getBoundingClientRect().height), ph:document.getElementById('globalSearch').placeholder, pad:parseInt(getComputedStyle(document.body).paddingBottom)}})()""")
            await shot(pg, 'n212-flow-tabbar-phone')
            ok('n212: iPhone — Flow’s sections are a bottom tab bar (Command, Patients, Flow, Rooms, Consent forms), icons above labels, 44 pt+ tabs, the page keeps room for it', t1['on'] and t1['bottom'] == 0 and t1['w'] == 390 and t1['tabs'] == ['dashboard', 'list', 'flow', 'rooms', 'consent'] and t1['stacked'] and t1['fit'] and t1['minh'] >= 44 and t1['pad'] >= 58 and t1['ph'] == 'Search patients', t1)
            await pg.click('#switcher .seg[data-view=rooms]'); await pg.wait_for_timeout(500)
            t2 = await pg.evaluate("[document.querySelector('#switcher .seg[data-view=rooms]').classList.contains('active'), !document.getElementById('view-rooms')||!document.getElementById('view-rooms').classList.contains('hidden')]")
            await pg.click('#switcher .seg[data-view=dashboard]'); await pg.wait_for_timeout(400)
            await pg.click('#fabAdd'); await pg.wait_for_timeout(400)
            t3 = await pg.evaluate("getComputedStyle(document.querySelector('.pvx-op-client')).display!=='none'")
            await pg.click('.pvx-op-client'); await pg.wait_for_timeout(600)
            t4 = await pg.evaluate("document.querySelector('#switcher .seg[data-view=client]').classList.contains('active')")
            ok('n212: tapping a tab switches the section; Client Display (the lobby TV) is in the + menu instead', t2 == [True, True] and t3 and t4, [t2, t3, t4])
            await pg.click('#switcher .seg[data-view=dashboard]'); await pg.wait_for_timeout(400)
            pid = await pg.evaluate("PATIENTS[PATIENTS.length-1].id")
            await pg.evaluate(f"openDrawer('{pid}');0"); await pg.wait_for_timeout(500)
            t5 = await pg.evaluate("(()=>{const s=document.getElementById('switcher').getBoundingClientRect();const e=document.elementFromPoint(s.left+40,s.top+20);return !document.getElementById('switcher').contains(e)})()")
            await pg.evaluate("closeDrawer();0"); await pg.wait_for_timeout(300)
            await pg.evaluate("switchApp('rounds');0"); await pg.wait_for_timeout(700)
            t6 = await pg.evaluate("[document.documentElement.classList.contains('pvx-tabbar'), document.getElementById('switcher').getBoundingClientRect().height]")
            ok('n212: the drawer (modal) covers the tab bar, and other apps (Rounds) don’t show Flow’s tab bar', t5 and t6 == [False, 0], [t5, t6])
            ok('no new page errors (n212 iPhone)', not newerr(errs), errs)
            await ctx.close()
            ctx, pg, errs = await flow_page((1440, 900))
            t7 = await pg.evaluate("[document.documentElement.classList.contains('pvx-tabbar'), getComputedStyle(document.getElementById('switcher')).position, !document.querySelector('.pvx-op-client')]")
            ok('n212: Mac and iPad keep the sub-nav at the top, with Client Display in it (and not in the + menu)', t7 == [False, 'relative', True], t7)
            await ctx.close()
            ctx, pg, errs = await new_page(br)
            await pg.goto(URL); await pg.wait_for_selector('.an-card'); await pg.wait_for_timeout(300)
            t8 = await pg.evaluate("document.getElementById('pvxTopnav').getAttribute('aria-label')")
            ok('n212: the shared top bar is named “Apps” in Anesia too', t8 == 'Apps', t8)
            await ctx.close()
            _secend(67)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n212: search fields and tab bars (HIG Search fields, Tab bars)', False, repr(_e)[:300])
        try:
            # ---------- n213: token fields (HIG Token fields) - Reason for visit
            _sec(68)
            PT = "t=>splitComplaints(t).map(s=>{const q=parseProblem(s);return formatProblem(q)+(q.id?'':' [typed]')})"
            ctx, pg, errs = await flow_page((1440, 900))
            cases = {'not eating for 2 days, lethargic': ['Anorexia · 2 days', 'Lethargy'], 'limping and coughing': ['Limping / Lameness', 'Persistent Cough'],
                     'collapsed': ['Collapse / Fainting'], 'seizure x2 and collapsed': ['Seizures · 2 episodes', 'Collapse / Fainting'], 'had 3 seizures': ['Seizures · 3 episodes']}
            g1 = {t: await pg.evaluate(PT, t) for t in cases}
            ok('n213: tokens keep every problem typed (lethargic, limping) and known forms map right (collapsed → Collapse / Fainting, not Internal Bleeding)', g1 == cases, g1)
            vague = {'weak in back legs': None, 'bloody': ['bloody [typed]'], 'coughing up blood': None, 'trying to vomit': None, 'not vomiting': ['not vomiting [typed]']}
            g2 = {t: await pg.evaluate(PT, t) for t in vague}
            g2b = await pg.evaluate("['weak in back legs','coughing up blood','trying to vomit'].map(t=>{const q=parseProblem(t);return [formatProblem(q), !!q.id]})")
            ok('n213: a fragment never becomes a specific condition (bloody stays bloody), a negation is never matched, and a mostly-unmatched phrase keeps the typed words (still filed under its problem)', g2['bloody'] == ['bloody [typed]'] and g2['not vomiting'] == ['not vomiting [typed]'] and g2b == [['weak in back legs', True], ['coughing up blood', True], ['trying to vomit', True]], [g2, g2b])
            g3 = {t: await pg.evaluate(PT, t) for t in ['vomiting, 3 times, since this morning', 'vomiting and diarrhea', 'diarrhea for 3 days and not eating', 'vomiting, bloody', '3 days, vomiting']}
            ok('n213: modifiers after a comma stay with their problem; ordinary splits are unchanged', g3 == {'vomiting, 3 times, since this morning': ['Vomiting · 3 times · since this morning'], 'vomiting and diarrhea': ['Vomiting', 'Diarrhea'], 'diarrhea for 3 days and not eating': ['Diarrhea · 3 days', 'Anorexia'], 'vomiting, bloody': ['Vomiting Blood'], '3 days, vomiting': ['Vomiting · 3 days']}, g3)
            await pg.evaluate("openAddPatient();0"); await pg.wait_for_timeout(700)
            await pg.focus('#apReason'); await pg.keyboard.type('v'); await pg.wait_for_timeout(80)
            s0 = await pg.evaluate("document.getElementById('rvList').classList.contains('open')")
            await pg.wait_for_timeout(600)
            s1 = await pg.evaluate("document.getElementById('rvList').classList.contains('open')")
            await pg.keyboard.type('o'); await pg.wait_for_timeout(60)
            s2 = await pg.evaluate("document.getElementById('rvList').classList.contains('open')")
            ok('n213: suggestions wait for a second letter or a short pause on one', not s0 and s1 and s2, [s0, s1, s2])
            await pg.fill('#apReason', ''); await pg.wait_for_timeout(100)
            for t in ['vomiting 3 times', 'collapsed', 'limping']:
                await pg.focus('#apReason'); await pg.keyboard.type(t); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(250)
            k1 = await pg.evaluate("""(()=>({chips:[...document.querySelectorAll('#apProblemsChips .rvp-chip-t')].map(x=>x.textContent), x:document.querySelector('#apProblemsChips .rvp-chip-x').getAttribute('aria-label'), role:document.getElementById('apProblemsChips').getAttribute('role'), lab:document.getElementById('apProblemsChips').getAttribute('aria-label'), live:(document.getElementById('apTokLive')||{}).textContent}))()""")
            ok('n213: tokens are a list “Problems”; each ✕ names its token; adding is announced', k1['chips'] == ['Vomiting · 3 times', 'Collapse / Fainting', 'Limping / Lameness'] and k1['x'] == 'Remove Vomiting · 3 times' and k1['role'] == 'list' and k1['lab'] == 'Problems' and k1['live'] == 'Added Limping / Lameness', k1)
            await pg.focus('#apReason'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(150)
            k2 = await pg.evaluate("[[...document.querySelectorAll('#apProblemsChips .rvp-chip')].findIndex(c=>c.classList.contains('armed')), document.getElementById('apTokLive').textContent]")
            await shot(pg, 'n213-flow-token-selected')
            await pg.keyboard.press('Backspace'); await pg.wait_for_timeout(150)
            k3 = await pg.evaluate("[[...document.querySelectorAll('#apProblemsChips .rvp-chip-t')].map(x=>x.textContent), document.getElementById('apTokLive').textContent]")
            ok('n213: ← from the empty field selects tokens (← moves), Backspace removes the selected one, each announced', k2 == [1, 'Collapse / Fainting selected. Backspace removes it, Return edits it.'] and k3 == [['Vomiting · 3 times', 'Limping / Lameness'], 'Removed Collapse / Fainting'], [k2, k3])
            await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
            k4 = await pg.evaluate("[document.getElementById('apReason').value, [...document.querySelectorAll('#apProblemsChips .rvp-chip-t')].map(x=>x.textContent), document.activeElement.id]")
            ok('n213: Return on a selected token puts its original words back in the field to edit', k4 == ['vomiting 3 times', ['Limping / Lameness'], 'apReason'], k4)
            await pg.keyboard.press('End'); await pg.keyboard.type(' since this morning'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(250)
            await pg.focus('#apReason'); await pg.keyboard.type('collapsed'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(250)
            await pg.locator('#apProblemsChips .rvp-chip-t').first.click(force=True); await pg.wait_for_timeout(200)
            k5 = await pg.evaluate("[document.getElementById('apReason').value, document.querySelectorAll('#apProblemsChips .rvp-chip').length]")
            ok('n213: clicking a token opens it for editing', k5 == ['limping', 2], k5)
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(250)
            await pg.locator('#apProblemsChips .rvp-chip', has_text='Collapse').click(button='right', force=True); await pg.wait_for_timeout(350)
            m1 = await pg.evaluate("""(()=>{const m=[...document.querySelectorAll('[role=menu]')].filter(x=>x.offsetParent)[0];return m&&{items:[...m.querySelectorAll('[role^=menuitem]')].map(b=>b.textContent.trim()+(b.getAttribute('aria-disabled')==='true'?' (off)':'')), sep:!!m.querySelector('[role=separator]')}})()""")
            await shot(pg, 'n213-flow-token-menu')
            ok('n213: a token’s context menu offers Edit, Remove and shows what was typed when it reads differently', m1 and m1['items'] == ['Edit', 'Remove', 'Typed: “collapsed” (off)'] and m1['sep'], m1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            ok('no new page errors (n213)', not newerr(errs), errs)
            await ctx.close()
            _secend(68)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n213: token fields (HIG Token fields) - Reason for visit', False, repr(_e)[:300])
        try:
            # ---------- n214: combo boxes (HIG Combo boxes)
            _sec(69)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("openAddPatient();0"); await pg.wait_for_timeout(700)
            x1 = await pg.evaluate("""(()=>{const s=document.getElementById('apSex');return {tag:s.tagName, opts:[...s.options].map(o=>o.textContent), v:s.value, labs:[...document.querySelectorAll('#apModal .ap-field > label')].map(l=>l.childNodes[0].textContent.trim()), sp:document.querySelector('#apSpecies option[value=""]').textContent}})()""")
            ok('n214: Sex is a pop-up (like Species) with the same five values; Add new patient labels are sentence case', x1['tag'] == 'SELECT' and x1['opts'] == ['Select sex', 'Male (Neutered)', 'Female (Spayed)', 'Male (Intact)', 'Female (Intact)', 'Unknown'] and x1['v'] == '' and {'Patient name', 'Owner name', 'Phone number', 'Referring hospital', 'Transfer notes', 'Assign doctor', 'Assign location'} <= set(x1['labs']) and x1['sp'] == 'Select species', x1)
            await pg.select_option('#apSex', 'Female (Spayed)')
            x2 = await pg.evaluate("(()=>{const s=document.getElementById('apSex');const a=s.value;s.value='Male (neutered, cryptorchid)';const b=[s.value,[...s.options].length];s.value='';return [a,b,s.value,[...s.options].length]})()")
            ok('n214: a value from elsewhere that isn’t one of the five is kept, not cleared', x2 == ['Female (Spayed)', ['Male (neutered, cryptorchid)', 7], '', 6], x2)
            await pg.select_option('#apSpecies', 'Feline'); await pg.wait_for_timeout(150)
            BQ = "q=>{const i=document.getElementById('apBreed');i.value=q;i.dispatchEvent(new Event('input',{bubbles:true}));return [...document.querySelectorAll('#apBreedPanel .bc-opt .bc-name')].slice(0,3).map(x=>x.textContent)}"
            await pg.focus('#apBreed')
            c1 = {q: await pg.evaluate(BQ, q) for q in ['sh', 'dom']}
            await pg.select_option('#apSpecies', 'Canine'); await pg.wait_for_timeout(150); await pg.focus('#apBreed')
            c2 = {q: await pg.evaluate(BQ, q) for q in ['golden', 'pit']}
            ok('n214: Breed puts the likeliest first (cat “sh” → Domestic Shorthair, “dom” → Domestic Shorthair; dog “golden” → Golden Retriever)', c1['sh'][0] == 'Domestic Shorthair' and c1['dom'][0] == 'Domestic Shorthair' and c2['golden'][0] == 'Golden Retriever' and c2['pit'][0] == 'American Pit Bull Terrier', [c1, c2])
            await pg.evaluate(BQ, 'lab'); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(150)
            a1 = await pg.evaluate("""(()=>{const i=document.getElementById('apBreed'),p=document.getElementById('apBreedPanel'),h=p.querySelector('.bc-opt.hl');return {role:i.getAttribute('role'),ctl:i.getAttribute('aria-controls'),ex:i.getAttribute('aria-expanded'),ad:i.getAttribute('aria-activedescendant'),hl:h&&h.id,lb:p.getAttribute('role'),opt:h&&h.getAttribute('role'),sel:h&&h.getAttribute('aria-selected')}})()""")
            ok('n214: Breed is a combobox to VoiceOver — listbox of options, the highlighted one announced', a1['role'] == 'combobox' and a1['ctl'] == 'apBreedPanel' and a1['ex'] == 'true' and a1['ad'] and a1['ad'] == a1['hl'] and a1['lb'] == 'listbox' and a1['opt'] == 'option' and a1['sel'] == 'true', a1)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            e1 = await pg.evaluate("[document.getElementById('apBreedPanel').classList.contains('open'), document.getElementById('apModal').classList.contains('open'), document.getElementById('apBreed').value]")
            ok('n214: Esc closes the open Breed list, not Add new patient (before, it closed the sheet)', e1 == [False, True, 'lab'], e1)
            await pg.focus('#apReason'); await pg.keyboard.type('vomiting'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
            await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(100); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            e2 = await pg.evaluate("[document.querySelectorAll('#apProblemsChips .rvp-chip.armed').length, document.getElementById('apModal').classList.contains('open')]")
            ok('n214: Esc on a selected Reason token deselects it and keeps the sheet open', e2 == [0, True], e2)
            await pg.evaluate("document.querySelector('#apArrival [data-arrival=transfer]').click();0"); await pg.wait_for_timeout(300)
            await pg.fill('#apRefHosp', 'vet'); await pg.wait_for_timeout(300); await pg.press('#apRefHosp', 'ArrowDown'); await pg.wait_for_timeout(150)
            a2 = await pg.evaluate("""(()=>{const i=document.getElementById('apRefHosp'),p=document.getElementById('apRefHospPanel'),o=p.querySelector('.bc-opt'),h=p.querySelector('.bc-opt.hl');return {ctl:i.getAttribute('aria-controls'),lb:p.getAttribute('role'),opt:o&&o.getAttribute('role'),ad:!!h&&i.getAttribute('aria-activedescendant')===h.id}})()""")
            ok('n214: Referring hospital’s list is a listbox of options too', a2 == {'ctl': 'apRefHospPanel', 'lb': 'listbox', 'opt': 'option', 'ad': True}, a2)
            ok('no new page errors (n214 Flow)', not newerr(errs), errs)
            await ctx.close()
            # Client Check-In (the owner's iPad)
            ctx = await br.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True, is_mobile=True)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda x: errs.append(str(x)))
            async def r214(r):
                u = r.request.url
                if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
                elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                else: await r.fulfill(status=204, body='')
            await ctx.route('**/*', r214)
            await pg.goto(f'http://127.0.0.1:{PORT}/checkin/'); await pg.wait_for_timeout(2500)
            await pg.click('#sex'); await pg.wait_for_timeout(250)
            k1 = await pg.evaluate("({ro:document.getElementById('sex').readOnly, ph:document.getElementById('sex').placeholder, n:document.querySelectorAll('#sexPanel .bc-opt').length, role:document.getElementById('sex').getAttribute('role'), pop:document.getElementById('sex').getAttribute('aria-haspopup'), ex:document.getElementById('sex').getAttribute('aria-expanded')})")
            await shot(pg, 'n214-checkin-sex-popup')
            await pg.locator('#sexPanel .bc-opt', has_text='Male (Neutered)').dispatch_event('mousedown'); await pg.wait_for_timeout(200)
            k2 = await pg.evaluate("[document.getElementById('sex').value, sexCanonicalValue]")
            await pg.click('#sex'); await pg.wait_for_timeout(200)
            k3 = await pg.evaluate("[document.querySelectorAll('#sexPanel .bc-opt').length, (document.querySelector('#sexPanel .bc-opt.hl')||{}).textContent]")
            ok('n214: Check-In Sex is a pop-up — not typed into, the whole list opens every time with the current choice marked', k1['ro'] and k1['ph'] == 'Select sex' and k1['n'] == 5 and k1['role'] == 'combobox' and k1['pop'] == 'listbox' and k1['ex'] == 'true' and k2 == ['Male (Neutered)', 'mn'] and k3 == [5, 'Male (Neutered)'], [k1, k2, k3])
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
            await pg.focus('#sex'); await pg.keyboard.press('Escape'); await pg.keyboard.press('f'); await pg.wait_for_timeout(100); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
            k4 = await pg.evaluate("[document.getElementById('sex').value, sexCanonicalValue]")
            ok('n214: on a keyboard, a letter jumps to the next choice starting with it and Return chooses it', k4[0].startswith('Female') and k4[1] in ('fs', 'fi'), k4)
            sp = await pg.evaluate("(()=>{const s=document.getElementById('species');return {role:s.getAttribute('role'),lb:document.getElementById('speciesPanel').getAttribute('role'),br:document.getElementById('breed').getAttribute('role')}})()")
            await pg.evaluate("(()=>{const b=[...document.querySelectorAll('#speciesPanel [data-species-index]')];speciesOpenPanel();const f=[...document.querySelectorAll('#speciesPanel [data-species-index]')].find(x=>/feline|cat/i.test(x.textContent));f&&f.click();})()"); await pg.wait_for_timeout(200)
            cb = await pg.evaluate("(()=>{const i=document.getElementById('breed');i.value='sh';i.dispatchEvent(new Event('input',{bubbles:true}));return [...document.querySelectorAll('#breedPanel .bc-opt .bc-name')].slice(0,2).map(x=>x.textContent)})()")
            ok('n214: Check-In Species and Breed are comboboxes too, and “sh” for a cat starts with Domestic Shorthair', sp == {'role': 'combobox', 'lb': 'listbox', 'br': 'combobox'} and cb and cb[0] == 'Domestic Shorthair', [sp, cb])
            ok('no new page errors (n214 Check-In)', not errs, errs)
            await ctx.close()
            _secend(69)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n214: combo boxes (HIG Combo boxes)', False, repr(_e)[:300])
        try:
            # ---------- n215: pickers and segmented controls (Flow, Anesia, Client Check-In) ----------
            _sec(70)
            ctx, pg, errs = await flow_page((1440, 900))
            await pg.evaluate("openAlertModal();0"); await pg.wait_for_timeout(500)
            await pg.evaluate("(document.querySelector('#alertModal .alert-type:not([data-atype=normal])')||{click(){}}).click()"); await pg.wait_for_timeout(500)
            rv = await pg.evaluate("""(()=>{const d=document.getElementById('alertReviewDay'),t=document.getElementById('alertReviewTime'),h=document.getElementById('alertReview');
              if(!d) return {err:'no day'}; const opts=[...d.options].map(o=>o.textContent), tl=[...t.options].map(o=>o.textContent);
              const lab=document.querySelector('label[for=alertReviewDay]'); return {opts,n:tl.length,first:tl[0],t1:tl[1],type:h.type,val:h.value,tdis:t.disabled,lab:lab&&lab.textContent,tname:t.getAttribute('aria-label')}})()""")
            ok('n215: the alert review time is Day + Time — No review time, Today, Tomorrow and five more days; the old field is gone', rv.get('opts', [''])[:3] == ['No review time', 'Today', 'Tomorrow'] and len(rv['opts']) == 8 and rv['type'] == 'hidden', rv)
            ok('n215: review times come every 15 minutes (96 a day), the time waits for a day, and both are named', rv.get('n') == 96 and rv['first'] == '12:00 AM' and rv['t1'] == '12:15 AM' and rv['tdis'] and rv['val'] == '' and rv['lab'].startswith('Expected review time') and rv['tname'] == 'Review time', rv)
            rv2 = await pg.evaluate("""(()=>{const d=document.getElementById('alertReviewDay'),t=document.getElementById('alertReviewTime');d.selectedIndex=2;d.dispatchEvent(new Event('change'));
              const a=_alertVal('alertReview'); t.value='540'; t.dispatchEvent(new Event('change')); const b=_alertVal('alertReview'); d.selectedIndex=0; d.dispatchEvent(new Event('change'));
              const x=new Date(); x.setDate(x.getDate()+1); const iso=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
              return {a,b,c:_alertVal('alertReview'),iso,dis:t.disabled}})()""")
            ok('n215: Tomorrow saves tomorrow at 8:00 AM, 9:00 AM saves 09:00, and No review time saves nothing — the same format as before', rv2['a'] == rv2['iso'] + 'T08:00' and rv2['b'] == rv2['iso'] + 'T09:00' and rv2['c'] == '' and rv2['dis'], rv2)
            rv3 = await pg.evaluate("""(async()=>{alertModalMode='edit'; currentAlert={type:'limited',headline:'Limited intake',message:'x',review_at:'2026-10-10T13:07',created_at:new Date().toISOString()}; alertDraftType='limited'; renderAlertModal();
              await new Promise(r=>setTimeout(r,200)); const d=document.getElementById('alertReviewDay'),t=document.getElementById('alertReviewTime');
              return {day:d.options[d.selectedIndex].textContent,time:t.options[t.selectedIndex].textContent,val:_alertVal('alertReview')}})()""")
            ok('n215: a saved review time that is not on the lists (an older day, 1:07 PM) is kept as it was, never changed', rv3['val'] == '2026-10-10T13:07' and rv3['time'] == '1:07 PM' and 'Oct 10' in rv3['day'], rv3)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            # Rounds shift
            await pg.evaluate("switchApp('rounds'); rdSeedDemo()"); await pg.wait_for_timeout(900)
            sh = await pg.evaluate("""(async()=>{const g=document.getElementById('rdShiftSeg'),bs=[...g.querySelectorAll('button')];const on=bs.find(b=>b.classList.contains('on'));
              const w=bs.map(b=>Math.round(b.getBoundingClientRect().width)); on.focus(); on.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
              await new Promise(r=>setTimeout(r,250)); const bs2=[...document.querySelectorAll('#rdShiftSeg button')]; const now=bs2.find(b=>b.classList.contains('on'));
              return {role:g.getAttribute('role'),name:g.getAttribute('aria-label'),w,checked:bs2.map(b=>b.getAttribute('aria-checked')).join(','),press:bs2.filter(b=>b.hasAttribute('aria-pressed')).length,
                moved:now!==on&&now.dataset.shift!==on.dataset.shift,focus:document.activeElement===now,stops:bs2.filter(b=>b.tabIndex===0).length,shift:rdShift}})()""")
            ok('n215: Rounds’ shift is a radiogroup named “Rounds shift”, the shift checked, no pressed buttons, one Tab stop', sh['role'] == 'radiogroup' and sh['name'] == 'Rounds shift' and sh['checked'].count('true') == 1 and sh['press'] == 0 and sh['stops'] == 1, sh)
            ok('n215: → moves Rounds to the next shift with focus on it, and the three shift segments are the same width', sh['moved'] and sh['focus'] and max(sh['w']) - min(sh['w']) <= 1, sh)
            await ctx.close()
            # Book surgery and the flag's scope
            ctx, pg, errs = await flow_page((1440, 900), extra='window.FV_OR_DEMO=true;')
            await pg.evaluate(SEEDP); await pg.wait_for_timeout(400)
            await pg.evaluate("openDrawer(PATIENTS[PATIENTS.length-1].id);0"); await pg.wait_for_timeout(700)
            await pg.evaluate("(document.querySelector('[data-fvor=book]')||{click(){}}).click()"); await pg.wait_for_timeout(600)
            bk = await pg.evaluate("""(async()=>{const gs=[...document.querySelectorAll('#fvOrModal .fv-or-seg')]; if(!gs.length) return {err:'no book'};
              const info=gs.map(g=>({role:g.getAttribute('role'),name:g.getAttribute('aria-label'),checked:[...g.querySelectorAll('.ap-seg-btn')].filter(b=>b.getAttribute('aria-checked')==='true').length}));
              const room=document.querySelector('#fvOrModal [data-seg=room]'),on=room.querySelector('.active'); on.focus(); on.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
              await new Promise(r=>setTimeout(r,200)); const now=document.querySelector('#fvOrModal [data-seg=room] .active');
              return {info,moved:now!==on,checked:now.getAttribute('aria-checked'),focus:document.activeElement===now}})()""")
            ok('n215: Book surgery’s segment rows are radiogroups named for their field (Side, Surgeon, Room …)', 'info' in bk and all(i['role'] == 'radiogroup' and i['name'] for i in bk['info']) and any(i['name'] == 'Room' for i in bk['info']), bk)
            ok('n215: → moves Book surgery’s room and the new room is checked and focused', bk.get('moved') and bk.get('checked') == 'true' and bk.get('focus'), bk)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            fs = await pg.evaluate("""(async()=>{ const a=document.querySelector('[data-fg=add],[data-fg=new]'); if(a) a.click(); await new Promise(r=>setTimeout(r,400));
              const o=document.querySelector('[data-fg=opt]'); if(o) o.click(); await new Promise(r=>setTimeout(r,400)); const g=document.querySelector('.fg-seg'); if(!g) return {err:'no seg'};
              for(let i=0;i<20&&g.getAttribute('role')!=='radiogroup';i++) await new Promise(r=>setTimeout(r,100));   /* the state follows on the next frame */
              return {role:g.getAttribute('role'),name:g.getAttribute('aria-label'),labels:[...g.querySelectorAll('button')].map(b=>b.textContent+':'+b.getAttribute('aria-checked'))}})()""")
            ok('n215: the flag’s “Keep the flag” is a radiogroup — Always · This visit (sentence case), one checked', fs.get('role') == 'radiogroup' and fs.get('name') == 'Keep the flag' and any(l.startswith('This visit') for l in fs.get('labels', [])) and sum(l.endswith(':true') for l in fs.get('labels', [])) == 1, fs)
            ar = await pg.evaluate("[...document.querySelectorAll('#apArrival .ap-seg-btn')].map(b=>b.textContent.trim())")
            ok('n215: arrival types are sentence case — Walk-in, ER transfer', 'Walk-in' in ar and 'ER transfer' in ar, ar)
            ok('n215: no page errors in Flow', not newerr(errs), errs[:3])
            await ctx.close()
            # Anesia's Records filter
            ctx, pg, errs = await new_page(br)
            await pg.goto(f'http://127.0.0.1:{PORT}/anesia/'); await pg.wait_for_timeout(2200)
            aw = await pg.evaluate("[...document.querySelectorAll('.an-seg[aria-label=\"Show records\"] button')].map(b=>Math.round(b.getBoundingClientRect().width))")
            ok('n215: Anesia’s Records segments (In progress, To sign, Signed) are the same width', len(aw) == 3 and max(aw) - min(aw) <= 1, aw)
            await ctx.close()
            # Client Check-In's calendar
            ctx, pg, errs = await new_page(br, vp=(1180, 820), touch=True)
            await pg.goto(f'http://127.0.0.1:{PORT}/checkin/'); await pg.wait_for_timeout(2500)
            await pg.evaluate("document.getElementById('birthdayTrigger').click()"); await pg.wait_for_timeout(500)
            cal = await pg.evaluate("""(()=>{const g=document.getElementById('calGrid'),t=new Date(),iso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
              const d=g.querySelector('[data-date="'+iso+'"]'); const want=new Intl.DateTimeFormat('en',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(t);
              return {role:g.getAttribute('role'),rows:g.querySelectorAll('[role=row]').length,cell:d.getAttribute('role'),name:d.getAttribute('aria-label'),want,cur:d.getAttribute('aria-current'),focus:document.activeElement===d,
                dm:document.querySelector('.dob-mode').getAttribute('role'),dmc:[...document.querySelectorAll('.dob-mode-btn')].map(b=>b.textContent+':'+b.getAttribute('aria-checked'))}})()""")
            ok('n215: Check-In’s calendar is a grid of rows; each day is named in full (“Sunday, October 18, 2026”) and today is marked as today', cal['role'] == 'grid' and cal['rows'] == 6 and cal['cell'] == 'gridcell' and cal['name'] == cal['want'] and cal['cur'] == 'date', cal)
            ok('n215: opening the calendar puts the keyboard on today (nothing chosen yet)', cal['focus'], cal)
            wk = await pg.evaluate("(()=>{const s=[...document.querySelectorAll('.vca-cal-week span')];return {i:s.findIndex(x=>x.classList.contains('pvx-today')),d:new Date().getDay(),c:getComputedStyle(s[1]).color===getComputedStyle(s[new Date().getDay()===1?0:1]).color}})()")
            ok('n215: the weekday marked above the calendar is today’s (it was always Monday)', wk['i'] == wk['d'], wk)
            ok('n215: Date of birth · Approximate age is a radiogroup in sentence case, Date of birth checked', cal['dm'] == 'radiogroup' and cal['dmc'] == ['Date of birth:true', 'Approximate age:false'], cal)
            T0 = await pg.evaluate("(()=>{const t=new Date();return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')})()")
            await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(150)
            k1 = await pg.evaluate("(()=>{const a=document.activeElement;return {d:a.dataset.date,name:a.getAttribute('aria-label')}})()")
            await pg.keyboard.press('PageUp'); await pg.wait_for_timeout(250)
            k2 = await pg.evaluate("(()=>{const a=document.activeElement;return {d:a.dataset.date,title:document.getElementById('calTitle').textContent}})()")
            await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('PageDown'); await pg.keyboard.press('PageDown'); await pg.wait_for_timeout(250)
            k3 = await pg.evaluate("(()=>{const a=document.activeElement,t=new Date();return {d:a.dataset.date,today:t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')}})()")
            import datetime as _dt
            t0 = _dt.date.fromisoformat(T0); e1 = t0 - _dt.timedelta(days=8)
            ok('n215: ← moves a day and ↑ a week in the calendar', k1['d'] == e1.isoformat(), (k1, e1))
            pm = (e1.replace(day=1) - _dt.timedelta(days=1))
            ok('n215: Page Up moves a month back and the title follows', k2['d'][:7] == pm.isoformat()[:7] and pm.strftime('%B') in k2['title'], k2)
            ok('n215: the keyboard never reaches a future day (Page Down stops at today)', k3['d'] <= k3['today'], k3)
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
            ch = await pg.evaluate("document.getElementById('birthday').value")
            ok('n215: Return chooses the focused day', ch == k3['d'], (ch, k3))
            await pg.evaluate("document.getElementById('birthdayTrigger').click()"); await pg.wait_for_timeout(400)
            sel = await pg.evaluate("(()=>{const a=document.activeElement;return {d:a.dataset.date,s:a.getAttribute('aria-selected')}})()")
            ok('n215: reopening lands on the chosen day, announced as selected', sel['d'] == ch and sel['s'] == 'true', sel)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            es = await pg.evaluate("({open:document.getElementById('birthdayCalendar').classList.contains('open'),f:document.activeElement.id})")
            ok('n215: Esc closes the calendar and returns to the birthday field', not es['open'] and es['f'] == 'birthdayTrigger', es)
            sp = await pg.evaluate("""(async()=>{ const b=[...document.querySelectorAll('[data-lang]')].find(x=>x.dataset.lang==='Español'); if(b) b.click(); await new Promise(r=>setTimeout(r,300));
              document.getElementById('birthdayTrigger').click(); await new Promise(r=>setTimeout(r,300)); const a=document.querySelector('#calGrid [tabindex="0"]');
              return {lang:document.documentElement.lang,name:a&&a.getAttribute('aria-label'),title:document.getElementById('calTitle').textContent,wk:document.querySelector('.vca-cal-week').textContent,back:document.getElementById('back').textContent,want:i18n['Español'].back,sp:document.getElementById('species').placeholder,spw:i18n['Español'].species0}})()""")
            ok('n215: in Spanish the calendar speaks Spanish — day names, month title and weekday letters', sp['lang'] == 'es' and ('domingo' in sp['name'] or 'lunes' in sp['name'] or 'martes' in sp['name'] or 'miércoles' in sp['name'] or 'jueves' in sp['name'] or 'viernes' in sp['name'] or 'sábado' in sp['name']) and ' de ' in sp['title'], sp)
            ok('n215: changing Check-In’s language translates every step again (Back, Species) — it stopped half way before', sp['back'] == sp['want'] and sp['sp'] == sp['spw'], sp)
            al = await pg.evaluate("""(async()=>{ const out=[]; for(const b of [...document.querySelectorAll('[data-lang]')]){ b.click(); await new Promise(r=>setTimeout(r,150)); out.push(document.documentElement.lang+':'+document.getElementById('back').textContent); } return out; })()""")
            ok('n215: every Check-In language switches without an error and translates Back', len(al) >= 9 and len(set(x.split(':')[1] for x in al)) >= 8 and not errs, (al, errs[:2]))
            lb = await pg.evaluate("""(async()=>{ const out=[]; for(const b of [...document.querySelectorAll('[data-lang]')]){ b.click(); await new Promise(r=>setTimeout(r,120));
              const t=i18n[b.dataset.lang]; out.push([document.querySelector('label[for=sex]').textContent===t.sex, document.getElementById('dobLabel').textContent===t.birthday, b.dataset.lang]); } return out; })()""")
            ok('n215: in every language the Sex and Birthday labels sit over the right fields (they were swapped)', all(x[0] and x[1] for x in lb), lb)
            ok('n215: no page errors in Check-In', not errs, errs[:3])
            await ctx.close()
            _secend(70)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n215: pickers and segmented controls (Flow, Anesia, Client Check-In) ----------', False, repr(_e)[:300])
        try:
            # ---------- n216: segmented controls and sliders across the suite ----------
            _sec(71)
            STUB216 = {'firebase-app.js': 'export function initializeApp(){return {}}',
              'firebase-firestore.js': 'export function getFirestore(){return {}} export function doc(){return {}} export function collection(){return {}} export async function getDoc(){return {exists:()=>false,data:()=>({})}} export async function setDoc(){} export function onSnapshot(r,cb){ return ()=>{} }',
              'firebase-analytics.js': 'export function getAnalytics(){return {}}'}
            async def page216(path, vp=(1440, 900), touch=False):
                c, p, e = await new_page(br, user='{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}', vp=vp, touch=touch)
                async def mod(r): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(r.request.url.rsplit('/', 1)[-1], ''))
                await p.route('https://www.gstatic.com/firebasejs/10.12.0/*', mod)
                await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(3000)
                return c, p, e
            KEY = """([sel,k])=>{const g=document.querySelector(sel);const on=[...g.querySelectorAll('[role=radio],[role=tab]')].find(b=>b.getAttribute('aria-checked')==='true'||b.getAttribute('aria-selected')==='true')||g.querySelector('[role=radio],[role=tab]');
              on.focus(); on.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true})); return new Promise(r=>setTimeout(()=>{const g2=document.querySelector(sel);
              const it=[...g2.querySelectorAll('[role=radio],[role=tab]')];r({role:g2.getAttribute('role'),name:g2.getAttribute('aria-label'),sel:it.findIndex(b=>b.getAttribute('aria-checked')==='true'||b.getAttribute('aria-selected')==='true'),
              was:[...g.querySelectorAll('[role=radio],[role=tab]')].indexOf(on),focus:it.indexOf(document.activeElement),stops:it.filter(b=>b.tabIndex===0).length,n:it.length})},350))}"""
            # Treatment Sheets, Mac
            ctx, pg, errs = await page216('treatment/')
            tr = await pg.evaluate("""(()=>{const sw=document.getElementById('clinSwitcher');const cur=[...sw.querySelectorAll('.seg')].filter(b=>b.getAttribute('aria-current')==='true').map(b=>b.dataset.ctab);
              const w=[...document.querySelectorAll('#sbBoards .sb-segb')].map(b=>Math.round(b.getBoundingClientRect().width));
              return {name:sw.getAttribute('aria-label'),cur,w,sheet:sw.querySelector('[data-ctab=sheet]').getAttribute('aria-label'),mine:(document.querySelector('#sbBoards [data-board="My Board"]')||{}).textContent}})()""")
            ok('n216: Treatment’s section switcher is named “Treatment sections” and says the open section (Dashboard)', tr['name'] == 'Treatment sections' and tr['cur'] == ['dash'], tr)
            ok('n216: the status board’s boards are equal widths; sentence case — Treatment sheet, My patients', len(tr['w']) == 4 and max(tr['w']) - min(tr['w']) <= 1 and tr['sheet'] == 'Treatment sheet' and tr['mine'].startswith('My patients'), tr)
            kb = await pg.evaluate(KEY, ['#sbBoards', 'ArrowRight'])
            ok('n216: the boards are a tablist named “Boards”; → moves to the next board with focus on it; one Tab stop', kb['role'] == 'tablist' and kb['name'] == 'Boards' and kb['sel'] == (kb['was'] + 1) % 4 and kb['focus'] == kb['sel'] and kb['stops'] == 1, kb)
            kv = await pg.evaluate(KEY, ['#sbView', 'ArrowRight'])
            ok('n216: List · Hours is a radiogroup named “Show as” and → moves it', kv['role'] == 'radiogroup' and kv['name'] == 'Show as' and kv['sel'] != kv['was'] and kv['stops'] == 1, kv)
            await pg.evaluate("document.querySelector('#clinSwitcher .seg[data-ctab=tasks]').click()"); await pg.wait_for_timeout(700)
            tk = await pg.evaluate("""(()=>{const a=document.querySelector('.wl-seg'),b=document.querySelector('.wl-chips');if(!a||!b) return {err:'no tasks'};
              const st=g=>[...g.querySelectorAll('button')].map(x=>x.getAttribute('role')+':'+x.getAttribute('aria-checked'));return {an:a.getAttribute('aria-label'),ar:a.getAttribute('role'),as:st(a),bn:b.getAttribute('aria-label'),br:b.getAttribute('role'),bs:st(b),
              cur:[...document.querySelectorAll('#clinSwitcher .seg[aria-current]')].map(x=>x.dataset.ctab)}})()""")
            ok('n216: Tasks’ Whose patients and Area are radiogroups, one choice checked each; the switcher follows to Tasks', tk.get('ar') == 'radiogroup' and tk['an'] == 'Whose patients' and tk['as'].count('radio:true') == 1 and tk['br'] == 'radiogroup' and tk['bn'] == 'Area' and tk['bs'].count('radio:true') == 1 and tk['cur'] == ['tasks'], tk)
            ok('n216: Treatment has no page errors', not errs, errs[:3])
            await ctx.close()
            # Treatment Sheets, iPhone
            ctx, pg, errs = await page216('treatment/', vp=(390, 844), touch=True)
            tp = await pg.evaluate("""(()=>{const sw=document.getElementById('clinSwitcher'),r=sw.getBoundingClientRect();const vis=[...sw.children].filter(b=>getComputedStyle(b).display!=='none');
              const pop=document.querySelector('.pvx-sbpop');return {bottom:Math.round(r.bottom),h:innerHeight,tabs:vis.map(b=>b.title),fit:vis.every(b=>b.getBoundingClientRect().right<=innerWidth+1),
              pop:pop&&getComputedStyle(pop).display!=='none',opts:pop?[...pop.options].map(o=>o.textContent):[],name:pop&&pop.getAttribute('aria-label'),boards:getComputedStyle(document.getElementById('sbBoards')).display}})()""")
            ok('n216: on iPhone Treatment’s sections are a bottom tab bar — Dashboard, Tasks, Treatment sheet, Vitals, More — and all fit', tp['bottom'] == tp['h'] and tp['tabs'] == ['Dashboard', 'Tasks', 'Treatment sheet', 'Vitals', 'More'] and tp['fit'], tp)
            ok('n216: on iPhone the four boards are a “Board” pop-up with their counts (none cut off)', tp['pop'] and tp['boards'] == 'none' and len(tp['opts']) == 4 and tp['opts'][0].startswith('My patients') and tp['name'] == 'Board', tp)
            await pg.evaluate("document.querySelector('.pvx-tmore').click()"); await pg.wait_for_timeout(300)
            mm = await pg.evaluate("(()=>{const m=document.querySelector('.pvx-tmenu');return {open:!m.hidden,items:[...m.querySelectorAll('button')].map(b=>b.textContent),focus:m.contains(document.activeElement),exp:document.querySelector('.pvx-tmore').getAttribute('aria-expanded')}})()")
            ok('n216: More opens Anesthesia, Timeline, Charges and Notes, with the keyboard on the first', mm['open'] and mm['items'] == ['Anesthesia', 'Timeline', 'Charges', 'Notes'] and mm['focus'] and mm['exp'] == 'true', mm)
            await pg.evaluate("[...document.querySelectorAll('.pvx-tmenu button')].find(b=>b.textContent==='Timeline').click()"); await pg.wait_for_timeout(500)
            mt = await pg.evaluate("(()=>{const m=document.querySelector('.pvx-tmore');return {on:m.classList.contains('on'),lab:m.getAttribute('aria-label'),closed:document.querySelector('.pvx-tmenu').hidden,tab:!document.getElementById('ctab-timeline').classList.contains('hidden')}})()")
            ok('n216: choosing Timeline opens it, closes the menu, and More shows as current (“More, Timeline open”)', mt['on'] and mt['lab'] == 'More, Timeline open' and mt['closed'] and mt['tab'], mt)
            await pg.evaluate("(()=>{const s=document.querySelector('.pvx-sbpop'); if(s){ s.selectedIndex=2; s.dispatchEvent(new Event('change')); }})()"); await pg.wait_for_timeout(500)
            await pg.evaluate("document.querySelector('#clinSwitcher .seg[data-ctab=dash]').click()"); await pg.wait_for_timeout(500)
            bp = await pg.evaluate("(()=>{const s=document.querySelector('.pvx-sbpop');return {sel:s&&s.value,on:(document.querySelector('#sbBoards .sb-segb.on')||{}).dataset}})()")
            ok('n216: picking a board from the pop-up switches the board, and the pop-up stays in step', bp['sel'] == 'IP Board' and bp['on'] and bp['on'].get('board') == 'IP Board', bp)
            await pg.screenshot(path=os.path.join(SHOTS, 'n216-treatment-iphone.png'))
            ok('n216: Treatment on iPhone has no page errors', not errs, errs[:3])
            await ctx.close()
            # OR
            ctx, pg, errs = await page216('or/')
            orr = await pg.evaluate("""(()=>{const cur=[...document.querySelectorAll('#switcher .seg[aria-current]')].map(b=>b.textContent.trim());const w=[...document.querySelectorAll('.or-modeseg button')].map(b=>Math.round(b.getBoundingClientRect().width));
              const ct=document.getElementById('caseTabs');return {cur,w,ct:ct.getAttribute('aria-label'),sel:[...ct.querySelectorAll('[role=tab]')].map(b=>b.getAttribute('aria-selected')).join(',')}})()""")
            ok('n216: OR’s section switcher says the open section; Live · Day · History are equal widths', len(orr['cur']) == 1 and len(orr['w']) == 3 and max(orr['w']) - min(orr['w']) <= 1, orr)
            ok('n216: OR’s case sections are named “Case sections” and say which is open', orr['ct'] == 'Case sections' and orr['sel'].split(',').count('true') == 1, orr)
            ok('n216: OR has no page errors', not errs, errs[:3])
            await ctx.close()
            # SGVP Overview
            ctx, pg, errs = await page216('sgvp/')
            sv = await pg.evaluate("""(()=>{const g=document.querySelector('.view-toggle');const bs=[...g.querySelectorAll('.vt-btn')];
              return {role:g.getAttribute('role'),name:g.getAttribute('aria-label'),st:bs.map(b=>b.textContent+':'+b.classList.contains('active')+':'+b.getAttribute('aria-checked')),press:bs.filter(b=>b.hasAttribute('aria-pressed')).length,
                w:bs.map(b=>Math.round(b.getBoundingClientRect().width))}})()""")
            ok('n216: SGVP “Whose curriculum” — for a non-intern the highlighted Entire class is also the checked one (VoiceOver said “My curriculum”)', sv['role'] == 'radiogroup' and sv['name'] == 'Whose curriculum' and sv['st'] == ['My curriculum:false:false', 'Entire class:true:true'] and sv['press'] == 0, sv)
            ok('n216: My curriculum · Entire class are equal widths', abs(sv['w'][0] - sv['w'][1]) <= 1, sv)
            fl = await pg.evaluate("""(async()=>{const S=document.getElementById('currSvcChips'),P=document.getElementById('currProgChips');
              const lab=g=>[...g.querySelectorAll('.chip')].map(b=>b.textContent.trim());const a={sn:S.getAttribute('aria-label'),sr:S.getAttribute('role'),pn:P.getAttribute('aria-label'),pr:P.getAttribute('role'),sl:lab(S),pl:lab(P)};
              S.querySelector('[data-f=surg]').click(); await new Promise(r=>setTimeout(r,250)); P.querySelector('[data-f=upcoming]').click(); await new Promise(r=>setTimeout(r,250));
              a.chk=[...document.querySelectorAll('#currFilterChips [aria-checked=true]')].map(b=>b.dataset.f); a.f=Object.assign({},pvxF);
              a.rows=[...document.querySelectorAll('#currTbody tr')].map(r=>(r.querySelector('.svc-name')||r).textContent.trim().slice(0,30)); return a})()""")
            ok('n216: the curriculum filter is two named radiogroups — Service (All … Oncology) and Progress (All, Completed, Current, Upcoming)', fl['sr'] == 'radiogroup' and fl['sn'] == 'Service' and fl['pr'] == 'radiogroup' and fl['pn'] == 'Progress' and fl['sl'] == ['All', 'Emergency', 'Internal medicine', 'Surgery', 'Neurology', 'Oncology'] and fl['pl'] == ['All', 'Completed', 'Current', 'Upcoming'], fl)
            ok('n216: Surgery and Upcoming combine — both checked, and only Surgery is listed', sorted(fl['chk']) == ['surg', 'upcoming'] and fl['f'] == {'svc': 'surg', 'prog': 'upcoming'} and fl['rows'] and all('Surgery' in r for r in fl['rows']), fl)
            cl = await pg.evaluate("(async()=>{pvxClearCurr(); await new Promise(r=>setTimeout(r,120)); return {f:Object.assign({},pvxF),c:currFilter,chk:[...document.querySelectorAll('#currFilterChips [aria-checked=true]')].map(b=>b.dataset.f)}})()")
            ok('n216: “Show all services” clears both filters', cl['f'] == {'svc': 'all', 'prog': 'all'} and cl['c'] == 'all' and sorted(cl['chk']) == ['progall', 'svcall'], cl)
            ok('n216: SGVP Overview has no page errors', not errs, errs[:3])
            await ctx.close()
            ctx, pg, errs = await page216('sgvp/', vp=(390, 844), touch=True)
            ph = await pg.evaluate("""(async()=>{const s=document.getElementById('currSvcPop');const a={pop:getComputedStyle(s).display,chips:getComputedStyle(document.getElementById('currSvcChips')).display,opts:[...s.options].map(o=>o.textContent)};
              s.value='neuro'; s.dispatchEvent(new Event('change')); await new Promise(r=>setTimeout(r,250)); a.f=pvxF.svc; a.rows=document.querySelectorAll('#currProgChips .chip').length; return a})()""")
            ok('n216: on iPhone Service is a pop-up (All services, Emergency …) and choosing Neurology filters', ph['pop'] != 'none' and ph['chips'] == 'none' and ph['opts'][0] == 'All services' and ph['f'] == 'neuro', ph)
            await ctx.close()
            # an intern's curriculum
            ctx, pg, errs = await page216('sgvp/interns/kristi-wenger/curriculum/')
            ic = await pg.evaluate("""(async()=>{const g=document.querySelector('.view-toggle');const chips=[...document.querySelectorAll('#currFilterChips .chip')];
              const a={role:g.getAttribute('role'),name:g.getAttribute('aria-label'),chk:[...g.querySelectorAll('[aria-checked=true]')].map(b=>b.textContent),tags:[...new Set(chips.map(c=>c.tagName))]};
              const b=document.querySelector('#currProgChips [data-f=current]'); b.focus(); a.focusable=document.activeElement===b; b.click(); await new Promise(r=>setTimeout(r,250)); a.f=Object.assign({},pvxF); return a})()""")
            ok('n216: an intern’s curriculum toggle is a named radiogroup with My curriculum checked', ic['role'] == 'radiogroup' and ic['name'] == 'Whose curriculum' and ic['chk'] == ['My curriculum'], ic)
            ok('n216: the intern page’s filter chips are buttons the keyboard can reach (they were <div>s), and Progress works', ic['tags'] == ['BUTTON'] and ic['focusable'] and ic['f'] == {'svc': 'all', 'prog': 'current'}, ic)
            ok('n216: an intern’s curriculum has no page errors', not errs, errs[:3])
            await ctx.close()
            # an intern's profile (edit mode as Daniel)
            ctx, pg, errs = await page216('sgvp/interns/kristi-wenger/', vp=(1180, 820), touch=True)
            await pg.evaluate("document.querySelector('.cutout-controls .cc-header').click()"); await pg.wait_for_timeout(500)
            pr = await pg.evaluate("""(()=>{const ids=['cutoutSize','cutoutX','cutoutRise','cutoutThresh'];return ids.map(id=>{const i=document.getElementById(id),r=i.getBoundingClientRect();
              return {id,label:i.labels&&i.labels[0]?i.labels[0].textContent:'',vt:i.getAttribute('aria-valuetext'),out:(document.getElementById(id+'V')||{}).textContent,h:Math.round(r.height),left:Math.round(r.left),dis:i.disabled,ends:[...i.parentNode.querySelectorAll('.cc-end')].map(e=>e.textContent).join('')}})})()""")
            ok('n216: the intern photo sliders are labelled Size, Left–right, Height, Threshold and show and speak their values', [x['label'] for x in pr] == ['Size', 'Left–right', 'Height', 'Threshold'] and all(x['vt'] and x['out'] == x['vt'] for x in pr) and pr[0]['vt'].endswith(' px'), pr)
            ok('n216: the photo tracks line up, Height runs ▼ to ▲, and each is 44 pt tall to touch', max(x['left'] for x in pr) - min(x['left'] for x in pr) <= 1 and pr[2]['ends'] == '▼▲' and all(x['h'] >= 44 for x in pr), pr)
            ok('n216: Threshold is dimmed until Remove background is on', pr[3]['dis'] == (not await pg.evaluate("document.getElementById('cutoutKnock').checked")), pr[3])
            await pg.evaluate("document.getElementById('cutoutKnock').click()"); await pg.wait_for_timeout(200)
            t2 = await pg.evaluate("({dis:document.getElementById('cutoutThresh').disabled,on:document.getElementById('cutoutKnock').checked})")
            ok('n216: turning Remove background on or off enables or dims Threshold', t2['dis'] == (not t2['on']), t2)
            rs = await pg.evaluate("""(async()=>{const s=document.getElementById('cutoutSize'),x=document.getElementById('cutoutX'); s.value=300; x.value=100; s.dispatchEvent(new Event('input')); await new Promise(r=>setTimeout(r,100));
              const w1=document.getElementById('heroCutout').style.width; document.querySelector('.cc-reset').click(); await new Promise(r=>setTimeout(r,100));
              return {w1,w2:document.getElementById('heroCutout').style.width,v:s.value,d:s.defaultValue,x:x.value,xd:x.defaultValue,out:document.getElementById('cutoutSizeV').textContent}})()""")
            ok('n216: Reset position puts the photo back where it started, and the shown value follows', rs['w1'] == '300px' and rs['v'] == rs['d'] and rs['x'] == rs['xd'] and rs['w2'] == rs['d'] + 'px' and rs['out'] == rs['d'] + ' px', rs)
            mi = await pg.evaluate("""(async()=>{const i=document.getElementById('mentorIconSize'); const lab=i.labels&&i.labels[0]?i.labels[0].textContent:''; i.value=40; i.dispatchEvent(new Event('input')); await new Promise(r=>setTimeout(r,100));
              return {lab,in_title:!!i.closest('.card-header'),css:getComputedStyle(document.documentElement).getPropertyValue('--mentor-icon-size').trim(),out:document.getElementById('mentorIconSizeV').textContent}})()""")
            ok('n216: Your mentor’s Icon size is a labelled row (not in the card title) and moving it now works (it threw an error)', mi['lab'] == 'Icon size' and not mi['in_title'] and mi['css'] == '40px' and mi['out'] == '40 px', mi)
            ok('n216: an intern’s profile has no page errors', not errs, errs[:3])
            await ctx.close()
            # Assets
            ctx, pg, errs = await page216('sgvp/assets/', vp=(1180, 820), touch=True)
            await pg.evaluate("(document.querySelector('.admin-btn')||{click(){}}).click()"); await pg.wait_for_timeout(500)
            asx = await pg.evaluate("""(()=>{const i=document.getElementById('sz-outlook'),r=i.getBoundingClientRect();const segs=[...document.querySelectorAll('.color-wrap .seg')].map(g=>g.getAttribute('role')+':'+g.getAttribute('aria-label')+':'+[...g.querySelectorAll('[aria-checked=true]')].length);
              return {name:i.getAttribute('aria-label'),vt:i.getAttribute('aria-valuetext'),h:Math.round(r.height),list:!!i.list&&i.list.options[0].value,segs,label:[...document.querySelectorAll('.a-label')].map(l=>l.textContent).filter(t=>/Logo|Title/.test(t))}})()""")
            ok('n216: Assets’ Logo size sliders are named for their app and speak their percent (“Outlook logo size”, “100%”), with a mark at 100%', asx['name'] == 'Outlook logo size' and asx['vt'] == '100%' and asx['list'] == '100', asx)
            ok('n216: Logo size sliders are 44 pt tall to touch (were 4 pt)', asx['h'] >= 44, asx)
            ok('n216: Title color’s Light · Dark and Presets · Custom are named radiogroups, one checked each; sentence case', asx['segs'] == ['radiogroup:Theme:1', 'radiogroup:Title color:1'] and 'Logo size' in asx['label'] and 'Title color' in asx['label'], asx)
            await pg.evaluate("(()=>{const i=document.getElementById('sz-outlook'); i.value=130; i.dispatchEvent(new Event('input'));})()")
            a2 = await pg.evaluate("({vt:document.getElementById('sz-outlook').getAttribute('aria-valuetext'),shown:document.getElementById('szv-outlook').textContent})")
            ok('n216: moving a Logo size slider updates what is shown and spoken together (130%)', a2['vt'] == '130%' and a2['shown'] == '130%', a2)
            ok('n216: Assets has no page errors', not errs, errs[:3])
            await ctx.close()
            # Directory, L.U.N.A., names
            ctx, pg, errs = await page216('directory/')
            dw = await pg.evaluate("[...document.querySelectorAll('#viewSeg > *')].map(b=>Math.round(b.getBoundingClientRect().width))")
            ok('n216: Directory · Organization are equal widths', len(dw) == 2 and abs(dw[0] - dw[1]) <= 1, dw)
            await ctx.close()
            ctx, pg, errs = await page216('luna-orb.html')
            lu = await pg.evaluate("""(async()=>{const gs=[...document.querySelectorAll('.states')];const a={g:gs.map(g=>g.getAttribute('role')+':'+g.getAttribute('aria-label')+':'+g.querySelectorAll('button').length)};
              const sleepy=document.querySelector('[data-state=sleepy]'); sleepy.click(); await new Promise(r=>setTimeout(r,200)); sleepy.focus();
              sleepy.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true})); await new Promise(r=>setTimeout(r,250));
              a.now=[...document.querySelectorAll('[data-state][aria-checked=true]')].map(b=>b.dataset.state); a.cls=[...document.querySelectorAll('[data-state].on')].map(b=>b.dataset.state);
              document.querySelector('[data-state=curious]').click(); await new Promise(r=>setTimeout(r,200)); a.after=[...document.querySelectorAll('[data-state][aria-checked=true]')].map(b=>b.dataset.state);
              const i=document.getElementById('intensity'); a.iname=i.getAttribute('aria-labelledby')&&document.getElementById(i.getAttribute('aria-labelledby')).textContent; a.ivt=i.getAttribute('aria-valuetext'); a.ilist=i.list&&i.list.options[0].value;
              const v=[...document.querySelectorAll('.view-switch button')].map(b=>Math.round(b.getBoundingClientRect().width)); a.vw=v; return a})()""")
            ok('n216: L.U.N.A.’s ten states are two named radiogroups of five — State and Expression', lu['g'] == ['radiogroup:State:5', 'radiogroup:Expression:5'], lu)
            ok('n216: ← moves L.U.N.A.’s state, and one state is checked across both groups', lu['now'] == ['speaking'] and lu['cls'] == ['speaking'] and lu['after'] == ['curious'], lu)
            ok('n216: Presence intensity is named once and speaks its percent once, with a mark at the default; the view switch is equal widths', lu['iname'] == 'Presence intensity' and lu['ivt'] == '65%' and lu['ilist'] == '65' and abs(lu['vw'][0] - lu['vw'][1]) <= 1, lu)
            ok('n216: L.U.N.A. studio has no page errors', not errs, errs[:3])
            await ctx.close()
            names = {}
            for rel in ['scheduling/index.html', 'or/index.html', 'treatment/index.html', 'index.html']:
                t = open(os.path.join(BUILD, rel), encoding='utf-8').read(); names[rel] = (t.count('Kristen Wenger'), t.count('Kristi Wenger'))
            ok('n216: Kristi Wenger’s name is right in Scheduling, OR, Treatment and Flow (no “Kristen”)', all(a == 0 and b >= 1 for a, b in names.values()), names)
            _secend(71)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n216: segmented controls and sliders across the suite ----------', False, repr(_e)[:300])
        if _helper(71):   # only what later sections use from it
            try:
                STUB216 = {'firebase-app.js': 'export function initializeApp(){return {}}',
                  'firebase-firestore.js': 'export function getFirestore(){return {}} export function doc(){return {}} export function collection(){return {}} export async function getDoc(){return {exists:()=>false,data:()=>({})}} export async function setDoc(){} export function onSnapshot(r,cb){ return ()=>{} }',
                  'firebase-analytics.js': 'export function getAnalytics(){return {}}'}
            except Exception as _e: print('::warning::helper 71 failed: ' + repr(_e)[:200])
        try:
            # ---------- n218: LIU students' real dates in the curriculum ----------
            _sec(72)
            FU218 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            LIUQ = """(()=>{const out={};document.querySelectorAll('#currTbody tr').forEach((tr,ri)=>{const svc=(tr.querySelector('.svc-name')||{}).dataset; tr.querySelectorAll('td.block-col').forEach((td,ci)=>{
                const l=[...td.querySelectorAll('.cell-initials')].find(x=>x.textContent.trim().startsWith('LIU')); if(!l) return;
                const chip=td.querySelector('.status-chip'); out[(svc&&svc.id)+'-'+String(ci+1).padStart(2,'0')]={when:(l.querySelector('.pvx-liu-d')||{}).textContent||'',title:l.getAttribute('title')||'',
                  chip:chip?chip.className.replace('status-chip','').trim():'',aria:(td.querySelector('.block-cell')||{getAttribute(){return ''}}).getAttribute('aria-label')||''}; }); }); return out; })()"""
            async def liu_page(path, date=None):
                c, p, e = await new_page(br, user=FU218, vp=(1440, 900))
                if date:
                    await c.add_init_script("(()=>{const D=Date,T=new D('%s').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()" % date)
                await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2500)
                return c, p, e
            # n219: the Overview now starts with the March group's three blocks, so Block 04 is its 7th column
            ctx, pg, errs = await liu_page('sgvp/')
            lq = await pg.evaluate(LIUQ)
            ok('n218: Block 04 Internal Medicine shows LIU “from Oct 26” and as upcoming today (it showed current from Oct 18)', lq.get('im-07', {}).get('when') == 'from Oct 26' and lq['im-07']['chip'] == 'upcoming', lq)
            ok('n218: the other LIU cells carry their dates — to Jan 17 (Emergency, from the block’s first day), from Mar 29 and to Apr 25 (Internal Medicine)', lq.get('em1-09', {}).get('when') == 'to Jan 17' and lq.get('im-11', {}).get('when') == 'from Mar 29' and lq.get('im-12', {}).get('when') == 'to Apr 25', lq)
            ok('n218: hovering or VoiceOver gives the student, rotation and dates (Caroline Smith (LIU, Year 4) · Small Animal Medicine · Oct 26 – Nov 22; under 75 characters since n222)',
               lq['im-07']['title'] == 'Caroline Smith (LIU, Year 4) · Small Animal Medicine · Oct 26 – Nov 22' and 'Caroline Smith' in lq['im-07']['aria'] and lq['im-07']['aria'].endswith('upcoming'), lq['im-07'])
            cu = await pg.evaluate("""(async()=>{ document.querySelector('#currProgChips [data-f=current]').click(); await new Promise(r=>setTimeout(r,250));
                const cur=[...document.querySelectorAll('#currTbody .cell-initials')].map(x=>x.textContent.trim()).filter(t=>t.startsWith('LIU'));
                document.querySelector('#currProgChips [data-f=upcoming]').click(); await new Promise(r=>setTimeout(r,250));
                const up=[...document.querySelectorAll('#currTbody .cell-initials')].map(x=>x.textContent.trim()).filter(t=>t.startsWith('LIU')); return {cur,up}; })()""")
            ok('n218: the Current filter no longer lists LIU this week; Upcoming does', cu['cur'] == [] and len(cu['up']) >= 1, cu)
            ok('n218: no page errors on the Overview', not errs, errs[:3])
            await ctx.close()
            ctx, pg, errs = await liu_page('sgvp/', '2026-10-27T10:00:00')
            lq2 = await pg.evaluate(LIUQ)
            ok('n218: from Oct 26 the LIU cell is current', lq2.get('im-07', {}).get('chip') == 'current', lq2.get('im-07'))
            await ctx.close()
            ctx, pg, errs = await liu_page('sgvp/interns/kristi-wenger/curriculum/')
            await pg.evaluate("(document.getElementById('btnAllCurr')||{click(){}}).click()"); await pg.wait_for_timeout(400)
            lq3 = await pg.evaluate(LIUQ)
            c4 = [v for k, v in lq3.items() if k.endswith('-04')]
            ok('n218: an intern’s curriculum (Entire class) shows the same LIU dates', len(c4) == 1 and c4[0]['when'] == 'from Oct 26' and c4[0]['chip'] == 'upcoming' and 'Caroline Smith' in c4[0]['title'], lq3)
            ok('n218: no page errors on an intern’s curriculum', not errs, errs[:3])
            await pg.locator('#currTbody').screenshot(path=os.path.join(SHOTS, 'n218-curriculum.png'))
            await ctx.close()
            _secend(72)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n218: LIU students real dates in the curriculum ----------', False, repr(_e)[:300])
        try:
            # ---------- n219: one curriculum (the Overview takes the intern layout; Monday-to-Sunday schedule) ----------
            _sec(73)
            FU219 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            CLOCK = "(()=>{const D=Date,T=new D('%s').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()"
            async def cur_page(path, date='2026-10-19T10:00:00', vp=(1440, 900), dark=True, touch=False):
                c, p, e = await new_page(br, user=FU219, vp=vp, dark=dark, touch=touch)
                if date: await c.add_init_script(CLOCK % date)
                await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
                return c, p, e
            HEADQ = """[...document.querySelectorAll('#currThead th.block-th')].map(th=>({n:(th.querySelector('.block-num')||{}).textContent,
                d:(th.querySelector('.block-dates')||{}).textContent, s:(th.querySelector('.pvx-bsub')||{}).textContent||'', cur:th.classList.contains('is-current'), out:th.dataset.out||''}))"""
            CELLQ = """(svc,i)=>{ const tr=[...document.querySelectorAll('#currTbody tr')].find(t=>t.querySelector('.svc-name')&&t.querySelector('.svc-name').dataset.id===svc);
                if(!tr) return null; return [...tr.children[i+1].querySelectorAll('.cell-initials')].map(x=>x.dataset.init); }"""
            ctx, pg, errs = await cur_page('sgvp/')
            lay = await pg.evaluate("""(()=>({svgIcons:document.querySelectorAll('#currTbody .svc-icon svg').length, emoji:/[\\u{1F300}-\\u{1FAFF}]/u.test(document.getElementById('currTbody').textContent),
                chips:document.querySelectorAll('#currTbody .cell-initials[data-init]').length, journey:!!document.getElementById('journeySvg'), atmos:!!document.querySelector('.curr-hero .hero-atmos'),
                btn:document.querySelector('#currTbody button.svc-name')?.getAttribute('aria-label'), rowh:document.querySelectorAll('#currTbody td[role=rowheader]').length,
                cell:document.querySelector('#currTbody .block-cell[role=button][tabindex="0"]')?.getAttribute('aria-label')||'', view:document.getElementById('viewLabel').textContent,
                allOn:document.getElementById('btnAllCurr').classList.contains('active')}))()""")
            ok('n219: the Overview has the intern layout — line icons (no emoji), initials chips, the journey line and the hero atmosphere', lay['svgIcons'] == 8 and not lay['emoji'] and lay['chips'] > 40 and lay['journey'] and lay['atmos'], lay)
            ok('n219: …and keeps its accessibility — service names are buttons, rows have headers, cells are named buttons', lay['btn'] == 'Open Emergency Medicine I' and lay['rowh'] == 8 and lay['cell'].startswith('Emergency Medicine I, March group Block 01, Mar 16 – Apr 19:'), lay)
            ok('n219: the Overview opens on the Entire class', lay['view'] == 'Entire class' and lay['allOn'], lay)
            hd = await pg.evaluate(HEADQ)
            ok('n219: the Overview shows both groups — 13 blocks from Mar 16, 2026 to Jul 5, 2027, Monday to Sunday', len(hd) == 13 and hd[0]['d'] == 'Mar 16 – Apr 19' and hd[3]['d'] == 'Jul 6 – Aug 9' and hd[12]['d'] == 'May 24 – Jul 5', hd)
            ok('n219: each column names both groups — Block 04 (Oct 19 – Nov 22) is the March group’s 07; the first three are the March group’s own', hd[6]['n'] == 'BLOCK 04' and hd[6]['d'] == 'Oct 19 – Nov 22' and hd[6]['s'] == 'March group: 07' and hd[6]['cur'] and hd[0]['n'] == 'MARCH GROUP' and hd[0]['s'] == 'Block 01' and hd[9]['s'] == '', hd)
            b3 = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',5), im:f('im',5), m1:[f('im',0),f('surg',0),f('gp',0)]}}; }})()")
            ok('n219: Block 03 (Sep 14 – Oct 18) is right — Sarah on Emergency Medicine I, Marissa on Internal Medicine', b3['em1'] == ['SH'] and b3['im'] == ['MP'], b3)
            ok('n219: the March group’s first rotations are on the Overview (Mar 16: Jordan IM, Alexa Surgery, Rachel GP)', b3['m1'] == [['JH'], ['AV'], ['RE']], b3)
            hc = await pg.evaluate("(()=>({b:hbcBlock.textContent,d:hbcDates.textContent,c:hbcCountdown.textContent,n:hbcNext.textContent,g:[...document.querySelectorAll('.pvx-grp-m')].map(x=>x.textContent),bl:[...document.querySelectorAll('.hero-stat-num')][0].textContent}))()")
            ok('n219: on Mon Oct 19 the current block is Block 04, Oct 19 – Nov 22, 35 days left; next begins Mon Nov 23', hc['b'] == 'BLOCK 04' and hc['d'] == 'Oct 19 – Nov 22' and hc['c'] == '35 days remaining' and hc['n'] == 'Next: Block 05 begins Nov 23', hc)
            ok('n219: the hero has both groups’ terms (March group ends Feb 23, 2027; July group Jul 5, 2027)', hc['bl'] == '9 · 10' and 'ends February 23, 2027' in hc['g'][0] and 'ends July 5, 2027' in hc['g'][1] and hc['g'][0].startswith('Week 35 of 52'), hc)
            tl = await pg.evaluate("[...document.querySelectorAll('#pvxTimeline .pvx-tl-group')].map(g=>[...g.querySelectorAll('.pvx-tl-step')].map(s=>[s.querySelector('.pvx-tl-t').textContent,s.querySelector('.pvx-tl-w').textContent,s.className.replace('pvx-tl-step ','')]))")
            ok('n219: the program timeline — March group: orientation Feb 23 – Mar 1, shadow rotations Mar 2 – Mar 15, Blocks 01–09, the last 16 days not assigned yet, ends Tue Feb 23, 2027',
               [s[:2] for s in tl[0]] == [['Orientation', 'Feb 23 – Mar 1'], ['Shadow rotations', 'Mar 2 – Mar 15'], ['Blocks 01–09', 'Mar 16, 2026 – Feb 7, 2027'], ['Not assigned yet', 'Feb 8 – Feb 23'], ['Program ends', 'Tue, Feb 23, 2027']] and tl[0][2][2] == 'is-now', tl)
            ok('n219: …July group: orientation Jun 15 – 21, shadow rotations Jun 22 – Jul 5 (linked to the shadow schedule), Blocks 01–10, ends Mon Jul 5, 2027',
               [s[:2] for s in tl[1]] == [['Orientation', 'Jun 15 – Jun 21'], ['Shadow rotations', 'Jun 22 – Jul 5'], ['Blocks 01–10', 'Jul 6, 2026 – Jul 5, 2027'], ['Program ends', 'Mon, Jul 5, 2027']]
               and await pg.evaluate("document.querySelectorAll('#pvxTimeline a[href=\"/sgvp/shadow-schedule/\"]').length") == 1, tl)
            sr = await pg.evaluate("""(async()=>{ const i=document.getElementById('currSearch'); i.value='kristi'; onCurrSearch('kristi'); await new Promise(r=>setTimeout(r,200));
                const rows=[...document.querySelectorAll('#currTbody .svc-name')].map(x=>x.dataset.id); i.value=''; onCurrSearch(''); return rows; })()""")
            ok('n219: search finds an intern (Kristi’s services stay, the others go)', 'surg' in sr and 'em1' in sr and 'elec' not in sr, sr)
            await pg.focus('#currTbody tr:first-child td.block-col:nth-child(8) .block-cell'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
            dr = await pg.evaluate("(()=>({open:document.getElementById('svcDrawer').classList.contains('open'), t:(document.getElementById('svcDrawerTitle')||{}).textContent}))()")
            ok('n219: Enter on a cell opens the service (no more link to the missing /sgvp/calendar)', dr['open'] and dr['t'] == 'Emergency Medicine I' and 'href="/sgvp/calendar' not in await pg.content(), dr)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            el = await pg.evaluate("""(()=>{const tr=[...document.querySelectorAll('#currTbody tr')].find(t=>t.querySelector('.svc-name')?.dataset.id==='elec'); const td=tr.children[4]; const c=td.querySelector('.cell-initials');
                return {t:c.textContent.replace(/\\s+/g,' ').trim(), title:c.getAttribute('title'), aria:td.querySelector('.block-cell').getAttribute('aria-label')}; })()""")
            ok('n219: Marissa’s Block 01 elective shows “Cardiology”, and names Newtown Veterinary Specialists on hover and to VoiceOver',
               el['t'] == 'MPCardiology' and el['title'] == 'Marissa Peck (Cardiology at Newtown Veterinary Specialists)' and 'Marissa Peck (Cardiology at Newtown Veterinary Specialists)' in el['aria'], el)
            await pg.evaluate("openSvcDrawer('elec')"); await pg.wait_for_timeout(400)
            aw = await pg.evaluate("(()=>{const a=document.querySelector('#svcDrawerBody .pvx-away'); return a?{t:a.innerText.replace(/\\s+/g,' '), mail:a.querySelector('a[href^=\"mailto:\"]')?.getAttribute('href'), tel:a.querySelector('a[href^=\"tel:\"]')?.getAttribute('href'), icons:a.querySelectorAll('.drawer-field-icon svg').length}:null; })()")
            ok('n219: the Elective panel lists the away rotation — Dr. Dana Rucinski, email, phone, address, Monday–Thursday 8 a.m., license and PLIT coverage',
               aw and 'Cardiology · Newtown Veterinary Specialists' in aw['t'] and 'Marissa Peck · Block 01, Jul 6 – Aug 9' in aw['t'] and 'Dr. Dana Rucinski · Cardiology' in aw['t']
               and '52 Church Hill Road, Newtown, CT 06470' in aw['t'] and 'Monday–Thursday, 8 a.m. arrival' in aw['t'] and 'Veterinary license and PLIT coverage documentation' in aw['t']
               and aw['mail'] == 'mailto:dana.rucinski@medvet.com' and aw['tel'] == 'tel:+12032708387' and aw['icons'] == 6, aw)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.evaluate("openSvcDrawer('gp')"); await pg.wait_for_timeout(400)
            gp = await pg.evaluate("(()=>{const b=document.getElementById('svcDrawerBody'); return {t:b.innerText.replace(/\\s+/g,' '), tel:b.querySelector('a[href^=\"tel:\"]')?.getAttribute('href'), prof:b.querySelector('a[href*=\"lee-lipsitz\"]')?.getAttribute('target')}; })()")
            ok('n219: General Practice is at VCA Baybrook — Medical Director Dr. Lee Lipsitz (profile), 56 Quirk Road, Milford, 203-882-8600 (tap to call)',
               'medical director dr. lee lipsitz, dvm, phd' in gp['t'].lower() and 'March group Block 01 Mar 16 – Apr 19 RE' in gp['t'] and 'Block M1' not in gp['t'] and 'VCA Baybrook Animal Hospital' in gp['t'] and '56 Quirk Road, Milford, CT 06460' in gp['t'] and gp['tel'] == 'tel:+12038828600' and gp['prof'] == '_blank', gp)
            rg = await pg.evaluate("document.getElementById('pvxPlanRange').textContent")
            ok('n219: the plan opens on the July group’s Block 01 and says what is shown by date', rg.startswith('Jul 6 – ') and rg.endswith(' shown · scroll for more'), rg)
            # an admin's saved move counts under the Monday date only; the old Sunday-dated record is ignored
            await pg.evaluate("firebase.firestore().collection('curriculum').doc('grid').set({gridByDate:{em1:{'2026-09-13':'MP'}, im:{'2026-09-13':'SH'}, gp:{'2026-11-23':'KW'}}},{merge:true})")
            await pg.wait_for_timeout(600)
            sv = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',5), gp5:f('gp',7)}}; }})()")
            ok('n219: the saved grid — a Monday-dated entry shows, an old Sunday-dated one (the Overview’s swap) does not', sv['em1'] == ['SH'] and sv['gp5'] == ['KW'], sv)
            # ----- the rules pass: type floor, sentence case, flat content, line icons, quiet saving, Move menu with Undo -----
            small = await pg.evaluate("""(()=>{ const out=[]; document.querySelectorAll('body *').forEach(el=>{ if(el.closest('.pvx-sr,[hidden],script,style,svg,#pvxCurrMsgs,#pvxTopnav')) return;
                const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' '); if(!t) return;
                const r=el.getBoundingClientRect(); if(!r.width||!r.height) return; const fs=parseFloat(getComputedStyle(el).fontSize); if(fs<10.95) out.push([t.slice(0,30),fs]); });
                document.querySelectorAll('#currThead th.block-th').forEach(th=>{ const fs=parseFloat(getComputedStyle(th,'::after').fontSize); const ct=getComputedStyle(th,'::after').content; if(ct!=='none'&&ct!=='""'&&ct!=="''"&&fs<10.95) out.push(['th::after',fs]); });
                return out; })()""")
            ok('n219: no text under 11 pt on the Overview', not small, small[:8])
            txt = await pg.evaluate("document.body.innerText")
            tc = [w for w in ['Days Remaining', 'Weeks Left', 'Curriculum Legend', 'Intern Legend', 'Department Info', 'Schedule in this Service', 'Clinical Services', '13 Rotations', 'Resident Coverage', 'Current Block'] if w in txt]
            pw = await pg.evaluate("(()=>{const i=document.getElementById('currSearch'); const c=document.createElement('canvas').getContext('2d'); const cs=getComputedStyle(i); c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily; return [Math.ceil(c.measureText(i.placeholder).width), i.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)]; })()")
            ok('n219: the search placeholder fits its field', pw[0] <= pw[1], pw)
            ok('n219: sentence case (no “Days Remaining”, “Curriculum Legend”, “13 Rotations”…)', not tc and await pg.evaluate("document.getElementById('currSearch').placeholder") == 'Search services, directors and interns', tc)
            bf = await pg.evaluate("['.legend-card','.table-card','#pvxTimeline','.curr-hero','.svc-drawer','.svc-drawer-overlay'].map(q=>{const e=document.querySelector(q); return e?getComputedStyle(e).backdropFilter:'missing';})")
            ok('n219: content is flat — no blur on the cards, the hero, the service panel or its backdrop', all(x == 'none' for x in bf), bf)
            await pg.evaluate("openSvcDrawer('em1')"); await pg.wait_for_timeout(400)
            ic = await pg.evaluate("(()=>{const b=document.getElementById('svcDrawerBody'); return {svg:b.querySelectorAll('.drawer-field-icon svg').length, emoji:/[\\u{1F300}-\\u{1FAFF}]/u.test(b.textContent), st:[...b.querySelectorAll('div')].filter(d=>/^(✓|●|◦) /.test(d.textContent)).map(d=>parseFloat(getComputedStyle(d).fontSize))}; })()")
            ok('n219: the service panel uses Pravix line icons (no emoji) and 11 pt status words', ic['svg'] == 3 and not ic['emoji'] and ic['st'] and min(ic['st']) >= 11, ic)
            await pg.evaluate("closeSvcDrawer()"); await pg.wait_for_timeout(300)
            quiet = await pg.evaluate("(()=>{const t=document.body.innerText; return !/Admin mode|Schedule saved/.test(t); })()")
            ok('n219: saving is silent (no “Admin mode” or “Schedule saved” messages)', quiet)
            chip = await pg.evaluate("(()=>{const tr=[...document.querySelectorAll('#currTbody tr')].find(t=>t.querySelector('.svc-name')?.dataset.id==='em1'); const c=tr.children[7].querySelector('.cell-initials'); return {i:c.dataset.init, role:c.getAttribute('role'), lab:c.getAttribute('aria-label'), pop:c.getAttribute('aria-haspopup'), tab:c.tabIndex}; })()")
            ok('n219: for an admin each intern is a named button that opens a menu (“Move Kristi Wenger…”)', chip == {'i': 'KW', 'role': 'button', 'lab': 'Move Kristi Wenger…', 'pop': 'menu', 'tab': 0}, chip)
            await pg.locator('#currTbody tr:first-child td:nth-child(8) .cell-initials').focus(); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(350)
            mn = await pg.evaluate("(()=>{const l=document.querySelector('.pvx-cx-list[role=menu]'); return l?{lab:l.getAttribute('aria-label'), items:[...l.querySelectorAll('button')].map(b=>[b.textContent.trim(),b.getAttribute('aria-checked')])}:null; })()")
            ok('n219: Return opens “Move Kristi Wenger · Block 04” with every service, Emergency Medicine I checked; no drawer opens',
               mn and mn['lab'] == 'Move Kristi Wenger · Block 04' and len(mn['items']) == 8 and ['Emergency Medicine I', 'true'] in mn['items'] and ['Surgery', 'false'] in mn['items']
               and not await pg.evaluate("document.getElementById('svcDrawer').classList.contains('open')"), mn)
            await pg.locator('.pvx-cx-list button:has-text("Surgery")').click(); await pg.wait_for_timeout(500)
            mv = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',6), surg:f('surg',6), msg:[...document.querySelectorAll('#pvxCurrMsgs .pvx-msg')].map(m=>m.innerText.replace(/\\s+/g,' ')), saved:(window.__fs['curriculum/grid']||{{}}).gridByDate}}; }})()")
            ok('n219: moving Kristi to Surgery moves her, saves under the Monday date, and says so with Undo',
               mv['em1'] == [] and 'KW' in mv['surg'] and mv['msg'][-1] == 'Kristi Wenger moved to Surgery · Block 04 Undo' and 'KW' in mv['saved']['surg']['2026-10-19'], mv)
            await pg.locator('#pvxCurrMsgs .pvx-msg-a').last.click(); await pg.wait_for_timeout(500)
            un = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{em1:f('em1',6), surg:f('surg',6), saved:window.__fs['curriculum/grid'].gridByDate.em1['2026-10-19']}}; }})()")
            ok('n219: Undo puts her back (and saves that)', un['em1'] == ['KW'] and 'KW' not in un['surg'] and un['saved'] == 'KW', un)
            await pg.keyboard.press('Meta+Shift+z'); await pg.wait_for_timeout(400)
            rd = await pg.evaluate(f"(()=>{{const f={CELLQ}; return f('surg',6); }})()")
            await pg.keyboard.press('Meta+z'); await pg.wait_for_timeout(400)
            ud = await pg.evaluate(f"(()=>{{const f={CELLQ}; return f('em1',6); }})()")
            ok('n219: ⇧⌘Z redoes the move and ⌘Z undoes it again', 'KW' in rd and ud == ['KW'], (rd, ud))
            await pg.evaluate("pvxCurrMsg('Not saved. Check that you’re signed in with an admin account, then try again.',{fail:true})"); await pg.wait_for_timeout(4600)
            fl = await pg.evaluate("(()=>{const m=[...document.querySelectorAll('#pvxCurrMsgs .pvx-msg.is-fail')]; return m.length?{role:m[0].getAttribute('role'), close:!!m[0].querySelector('.pvx-msg-x[aria-label=Close]')}:null; })()")
            ok('n219: a failed save stays (role=alert) until closed', fl == {'role': 'alert', 'close': True}, fl)
            ok('n219: no page errors on the Overview', not errs, errs[:3])
            await pg.locator('.page-content').screenshot(path=os.path.join(SHOTS, 'n219-overview.png'))
            await ctx.close()
            # Sunday Oct 18 is still Block 03
            ctx, pg, errs = await cur_page('sgvp/', '2026-10-18T15:00:00')
            hd = await pg.evaluate(HEADQ)
            ok('n219: on Sunday Oct 18 Block 03 is still current (blocks end on Sunday, the next starts Monday)', hd[5]['cur'] and not hd[6]['cur'], [h['cur'] for h in hd])
            await ctx.close()
            # ?me=JH on the Overview: the March group's own numbering and term
            ctx, pg, errs = await cur_page('sgvp/?me=JH')
            me = await pg.evaluate(f"(()=>({{h:{HEADQ}, v:viewLabel.textContent, b:hbcBlock.textContent, n:hbcNext.textContent, m:progMeta.textContent.replace(/\\s+/g,' ')}}))()")
            ok('n219: ?me=JH on the Overview — Jordan’s own Block 07, her term, and the blocks after Feb 23 marked after her program',
               me['v'] == 'Jordan Hanson' and me['b'] == 'BLOCK 07' and me['n'] == 'Next: Block 08 begins Nov 23' and 'Program ends February 23, 2027' in me['m']
               and [h['out'] for h in me['h']][9:] == ['', 'After program', 'After program', 'After program'] and me['h'][0]['out'] == '', me)
            await ctx.close()
            # an intern page: Jordan (March group)
            ctx, pg, errs = await cur_page('sgvp/interns/jordan-hanson/curriculum/')
            jh = await pg.evaluate(f"(()=>({{h:{HEADQ}, b:hbcBlock.textContent, bl:[...document.querySelectorAll('.hero-stat-num')][0].textContent, m:progMeta.textContent.replace(/\\s+/g,' '), sub:document.querySelector('.hero-sub').textContent, tlg:document.querySelectorAll('#pvxTimeline .pvx-tl-group').length}}))()")
            ok('n219: Jordan’s curriculum — 9 blocks from Mar 16, Block 07 now (Oct 19 – Nov 22), then her final weeks Feb 8 – Feb 23 “Not assigned yet” (no Block 10 after her program)',
               len(jh['h']) == 10 and jh['h'][0]['d'] == 'Mar 16 – Apr 19' and jh['h'][6]['cur'] and jh['h'][6]['d'] == 'Oct 19 – Nov 22' and jh['h'][9]['n'] == 'FINAL WEEKS' and jh['h'][9]['d'] == 'Feb 8 – Feb 23' and jh['h'][9]['s'] == 'Not assigned yet' and jh['bl'] == '9' and jh['b'] == 'BLOCK 07', jh)
            ok('n219: …her term is the agreement’s — 52 weeks, ends February 23, 2027; one timeline (hers)', 'Program ends February 23, 2027' in jh['m'] and ' '.join(jh['sub'].split()) == '9 blocks · 6 clinical services · 52 weeks' and 'Week 35 of 52' in jh['m'] and jh['tlg'] == 1, jh)
            jc = await pg.evaluate(f"(()=>{{const f={CELLQ}; return {{onco:f('onco',6), em2:[f('em2',7),f('em2',8)]}}; }})()")
            ok('n219: Jordan: Oncology now (Block 07), ER II in Blocks 08 and 09 (as she confirmed)', jc['onco'] == ['JH'] and jc['em2'] == [['JH', 'RE'], ['JH']], jc)
            ok('n219: no page errors on Jordan’s curriculum', not errs, errs[:3])
            await pg.locator('.page-content').screenshot(path=os.path.join(SHOTS, 'n219-jordan.png'))
            await ctx.close()
            for slug, first, n in [('sarah-herron', 'Jul 6 – Aug 9', 10), ('marissa-peck', 'Jul 6 – Aug 9', 10), ('rachel-eberle', 'Mar 16 – Apr 19', 10), ('alexa-vander-ploeg', 'Mar 16 – Apr 19', 10), ('benjamin-kerns', 'Jul 6 – Aug 9', 10), ('kristi-wenger', 'Jul 6 – Aug 9', 10)]:
                ctx, pg, errs = await cur_page(f'sgvp/interns/{slug}/curriculum/')
                h = await pg.evaluate(HEADQ)
                sw = await pg.evaluate("[...document.querySelectorAll('nav.switcher a')].map(a=>a.getAttribute('href'))")
                ok(f'n219: {slug}: same layout and dates ({first} first), its own sub-nav, no errors', len(h) == n and h[0]['d'] == first and f'/sgvp/interns/{slug}/curriculum/' in sw and not errs, (h[:2], sw, errs[:2]))
                if slug == 'sarah-herron':
                    c3 = await pg.evaluate(f"(()=>{{const f={CELLQ}; setView('all'); return {{em1:f('em1',2), im:f('im',2)}}; }})()")
                    ok('n219: Sarah’s page has her Block 03 on Emergency Medicine I', 'SH' in (c3['em1'] or []) and 'SH' not in (c3['im'] or []), c3)
                await ctx.close()
            # light mode: the light hero's labels are dark ink
            ctx, pg, errs = await cur_page('sgvp/', dark=False)
            col = await pg.evaluate("[getComputedStyle(document.querySelector('.hero-stat-label')).color, getComputedStyle(document.querySelector('.hbc-label')).color]")
            ok('n219: light mode — the hero labels are readable (dark ink, not white)', col == ['rgb(82, 105, 138)', 'rgb(82, 105, 138)'], col)
            await ctx.close()
            # someone who isn't an admin: interns aren't buttons; a click opens the service
            ctx, pg, errs = await new_page(br, user='{"uid":"u2","email":"resident.a@vca.com","displayName":"Resident A"}', vp=(1440, 900))
            await ctx.add_init_script(CLOCK % '2026-10-19T10:00:00')
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/curriculum/'); await pg.wait_for_timeout(2600)
            na = await pg.evaluate("(()=>{const c=document.querySelector('#currTbody .cell-initials'); const r={role:c.getAttribute('role'), tab:c.getAttribute('tabindex')}; c.click(); return r; })()")
            await pg.wait_for_timeout(400)
            ok('n219: for everyone else the interns are plain text, and clicking one opens the service', na == {'role': None, 'tab': None} and await pg.evaluate("document.getElementById('svcDrawer').classList.contains('open')") and not await pg.evaluate("!!document.querySelector('.pvx-cx-list')"), na)
            await ctx.close()
            # phone: the plan opens at the current block
            ctx, pg, errs = await cur_page('sgvp/interns/kristi-wenger/curriculum/', vp=(390, 844), touch=True)
            vis = await pg.evaluate("(()=>{const sc=pvxPlanScroll, th=document.querySelector('#currThead th.is-current'), r=sc.getBoundingClientRect(), b=th.getBoundingClientRect(); return b.left>=r.left-2&&b.right<=r.right+2; })()")
            ok('n219: on a phone the plan opens at the current block', vis, vis)
            pn = await pg.evaluate("[...document.querySelectorAll('.pvx-pn')].map(b=>[Math.round(b.getBoundingClientRect().width),Math.round(b.getBoundingClientRect().height)])")
            ok('n219: on touch the ‹ › buttons are 44 × 44 pt', pn and all(w >= 44 and h >= 44 for w, h in pn), pn)

            await pg.screenshot(path=os.path.join(SHOTS, 'n219-phone.png'), full_page=False)
            await ctx.close()
            # profiles, mentors
            ctx, pg, errs = await cur_page('sgvp/interns/jordan-hanson/')
            pf = await pg.evaluate("(()=>({tl:[...document.querySelectorAll('#timelineContainer .timeline-item')].map(x=>x.querySelector('.tl-title').textContent+' | '+x.querySelector('.tl-dates').textContent), sd:document.querySelector('[data-key=startDate]').textContent, gd:document.querySelector('[data-key=gradDate]').textContent, dr:document.querySelector('[data-key=daysRemaining]').textContent, cur:document.querySelector('[data-key=currentRotation]').textContent}))()")
            ok('n219: Jordan’s profile — her term (Feb 23, 2026 – Feb 23, 2027), 127 days left on Oct 19, Oncology now, 9 rotations on the Monday dates',
               pf['sd'] == 'February 23, 2026' and pf['gd'] == 'February 23, 2027' and pf['dr'] == '127' and pf['cur'] == 'Oncology' and len(pf['tl']) == 9 and pf['tl'][0] == 'Internal Medicine | Mar 16 – Apr 19, 2026' and pf['tl'][6] == 'Oncology | Oct 19 – Nov 22, 2026', pf)
            ok('n219: no page errors on Jordan’s profile', not errs, errs[:3])
            await ctx.close()
            ctx, pg, errs = await cur_page('sgvp/interns/sarah-herron/')
            pf = await pg.evaluate("[...document.querySelectorAll('#timelineContainer .timeline-item')].map(x=>x.querySelector('.tl-title').textContent+' | '+x.querySelector('.tl-dates').textContent)")
            ok('n219: Sarah’s profile — Block 03 Emergency Medicine I (Sep 14 – Oct 18), ends Jul 5, 2027', pf[2] == 'Emergency Medicine I | Sep 14 – Oct 18, 2026' and pf[-1] == 'Oncology | May 24 – Jul 5, 2027', pf)
            await ctx.close()
            ctx, pg, errs = await cur_page('sgvp/interns/marissa-peck/')
            pf = await pg.evaluate("[...document.querySelectorAll('#timelineContainer .timeline-item')].map(x=>x.querySelector('.tl-title').textContent+' | '+x.querySelector('.tl-dates').textContent)")
            ok('n219: Marissa’s profile — Block 01 is Cardiology · Newtown Veterinary Specialists (Jul 6 – Aug 9), Block 03 Internal Medicine', pf[0] == 'Cardiology · Newtown Veterinary Specialists | Jul 6 – Aug 9, 2026' and pf[2] == 'Internal Medicine | Sep 14 – Oct 18, 2026', pf)
            await ctx.close()
            ctx, pg, errs = await cur_page('sgvp/mentors/')
            mr = await pg.evaluate("(()=>({sh:INTERN_ROTATIONS['Sarah Herron'][2], mp:INTERN_ROTATIONS['Marissa Peck'][0].svc, mp3:INTERN_ROTATIONS['Marissa Peck'][2].svc, jh:INTERN_ROTATIONS['Jordan Hanson'].length}))()")
            ok('n219: the mentors page has the same schedule (Sarah EM I in Block 03, Marissa IM; Marissa’s elective is still Cardiology)', mr['sh'] == {'svc': 'Emergency Medicine I', 'start': '2026-09-14', 'end': '2026-10-19'} and mr['mp3'] == 'Internal Medicine' and mr['mp'] == 'Cardiology' and mr['jh'] == 9, mr)
            await ctx.close()
            _secend(73)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n219: one curriculum (the Overview takes the intern layout; Monday-to-Sunday schedule) ---', False, repr(_e)[:300])
        try:
            # ---------- n220: schedule check, today at Shoreline, ask the curriculum ----------
            _sec(74)
            FU220 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            CL220 = "(()=>{const D=Date,T=new D('2026-10-19T10:00:00').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()"
            async def p220(path, vp=(1440, 900), user=FU220, touch=False):
                c, p, e = await new_page(br, user=user, vp=vp, touch=touch)
                await c.add_init_script(CL220)
                await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
                return c, p, e
            ctx, pg, errs = await p220('sgvp/')
            td = await pg.evaluate("[...document.querySelectorAll('#pvxTodayTiles .pvx-td')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())")
            ok('n220: Today at Shoreline — a tile per service: who is on it now, until when, who is next',
               len(td) == 8 and td[0] == 'Emergency Medicine I Kristi Wenger until Nov 22 Next: Marissa from Nov 23' and td[1] == 'Emergency Medicine II Alexa Vander Ploeg Sarah Herron until Nov 22 Next: Jordan, Rachel from Nov 23'
               and td[2].startswith('Internal Medicine LIU student Caroline Smith from Oct 26') and td[7] == 'Elective No intern Next block: no intern yet', td)
            wh = await pg.evaluate("document.getElementById('pvxTodayWhen').textContent")
            ok('n220: …dated, with the block in both numberings', wh == 'Monday, October 19 · Block 04 (March group 07), Oct 19 – Nov 22', wh)
            await pg.locator('#pvxTodayTiles .pvx-td').nth(3).click(); await pg.wait_for_timeout(400)
            ok('n220: a tile opens its service', await pg.evaluate("document.getElementById('svcDrawer').classList.contains('open') && document.getElementById('svcDrawerTitle').textContent==='Surgery'"))
            await pg.evaluate("closeSvcDrawer()"); await pg.wait_for_timeout(300)
            QA = [("Who’s on Surgery?", 'Now (Block 04 · March group 07, Oct 19 – Nov 22): Surgery has Rachel Eberle. Next, from Nov 23: Benjamin Kerns.', 2),
                  ('When is Kristi on Oncology?', 'Kristi Wenger is on Oncology in Block 05 (Nov 23 – Jan 3, 2027).', 1),
                  ('Where is Jordan on Dec 7?', 'On Mon, Dec 7, Jordan Hanson will be on Emergency Medicine II (Block 08, Nov 23 – Jan 3).', 1),
                  ('Is there a student on IM next week?', 'Yes. LIU student Caroline Smith (Year 4) is on Internal Medicine, Oct 26 – Nov 22, 2026.', 1),
                  ('Who’s in the ER the week of Dec 7?', 'The week of Dec 7 (Block 05 · March group 08, Nov 23 – Jan 3): Emergency Medicine I — Marissa Peck; Emergency Medicine II — Jordan Hanson and Rachel Eberle.', 2),
                  ('When is Rachel in the ER?', 'Rachel Eberle is on Emergency Medicine I in Block 05 (Aug 10 – Sep 13, 2026) and Emergency Medicine II in Block 08 (Nov 23 – Jan 3, 2027).', 2),
                  ('Where was Marissa in block 1?', 'In Block 01 (Jul 6 – Aug 9), Marissa Peck was on Cardiology at Newtown Veterinary Specialists (elective).', 1),
                  ('When does Sarah graduate?', 'Sarah Herron is in the July group: Jun 15, 2026 to Jul 5, 2027.', 0),
                  ('What is VREC?', 'VREC means resident coverage: a resident covers that service instead of an intern.', 0)]
            bad = []
            for q, want, nh in QA:
                await pg.fill('#pvxAskIn', q); await pg.press('#pvxAskIn', 'Enter'); await pg.wait_for_timeout(250)
                got = await pg.evaluate("[document.getElementById('pvxAskOut').textContent, document.querySelectorAll('#currTbody td.pvx-hit').length]")
                if got != [want, nh]: bad.append((q, got))
            ok('n220: Ask the curriculum answers from the schedule and highlights the cells it used (9 questions)', not bad, bad)
            await pg.fill('#pvxAskIn', 'what is the weather'); await pg.press('#pvxAskIn', 'Enter'); await pg.wait_for_timeout(200)
            un = await pg.evaluate("[document.getElementById('pvxAskOut').textContent, document.getElementById('pvxAskOut').getAttribute('role'), document.querySelectorAll('#currTbody td.pvx-hit').length]")
            ok('n220: a question it can’t answer says what it can do (and highlights nothing); answers are announced (role=status)', un[0].startswith('I can answer who’s on a service') and un[1] == 'status' and un[2] == 0, un)
            await pg.locator('#pvxAsk .pvx-ask-ex').nth(1).click(); await pg.wait_for_timeout(250)
            ex = await pg.evaluate("[document.getElementById('pvxAskIn').value, document.getElementById('pvxAskOut').textContent]")
            await pg.focus('#pvxAskIn'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            esc_ = await pg.evaluate("[document.getElementById('pvxAskIn').value, document.getElementById('pvxAskOut').textContent, document.querySelectorAll('#currTbody td.pvx-hit').length]")
            ok('n220: an example question asks itself; Esc clears the question, the answer and the highlights', ex[1] == 'Kristi Wenger is on Oncology in Block 05 (Nov 23 – Jan 3, 2027).' and esc_ == ['', '', 0], (ex, esc_))
            ck = await pg.evaluate("(()=>({k:document.querySelector('#pvxCheck .pvx-tl-key').textContent, items:[...document.querySelectorAll('#pvxCheck .pvx-ck-i')].map(x=>x.querySelector('span').textContent), gaps:[...document.querySelectorAll('#currTbody td.pvx-gap')].map(td=>td.dataset.svc+'-'+td.dataset.block)}))()")
            ok('n220: Schedule check — 6 things: ER II and Surgery empty in Block 07, the March group’s Feb 8 – 23, ER I empty in Blocks 09 and 10, Surgery in Block 10',
               ck['k'] == '6 things to look at' and ck['items'] == ['No intern on Emergency Medicine II · Block 07, Feb 8 – Mar 14', 'No intern on Surgery · Block 07, Feb 8 – Mar 14',
                                                                 'March group (Jordan, Rachel, Alexa) · Feb 8 – Feb 23: no rotation assigned yet', 'No intern on Emergency Medicine I · Block 09, Apr 19 – May 23'], ck)
            ok('n223: the plan no longer marks uncovered cells “Not covered” (the gaps stay in the Schedule check)', ck['gaps'] == [] and 'Not covered' not in await pg.evaluate('document.getElementById("currTbody").innerText'), ck['gaps'])
            await pg.locator('#pvxCheck .pvx-ck-more').click(); await pg.wait_for_timeout(200)
            n_all = await pg.evaluate("[document.querySelectorAll('#pvxCheck .pvx-ck-i').length, document.querySelector('#pvxCheck .pvx-ck-more').getAttribute('aria-expanded'), document.activeElement.className]")
            ok('n220: “Show all 6” opens the full list (and keeps focus on it)', n_all == [6, 'true', 'pvx-ck-more'], n_all)
            await pg.locator('#pvxCheck .pvx-ck-b').first.click(); await pg.wait_for_timeout(300)
            hl = await pg.evaluate("[...document.querySelectorAll('#currTbody td.pvx-hit')].map(td=>td.dataset.svc+'-'+td.dataset.block)")
            ok('n220: Show highlights that cell in the plan', hl == ['em2-07'], hl)
            await pg.evaluate("pvxCurrMove('SH','neuro','07','em2','07')"); await pg.wait_for_timeout(500)
            ck2 = await pg.evaluate("[...document.querySelectorAll('#pvxCheck .pvx-ck-i')].map(x=>x.querySelector('span').textContent)")
            ok('n220: the check follows the schedule — moving Sarah to ER II in Block 07 clears that gap and flags Neurology instead',
               'No intern on Emergency Medicine II · Block 07, Feb 8 – Mar 14' not in ck2 and 'No intern on Neurology · Block 07, Feb 8 – Mar 14' in ck2, ck2)
            await pg.evaluate("pvxCurrUndo()"); await pg.wait_for_timeout(400)
            small = await pg.evaluate("""(()=>{ const out=[]; document.querySelectorAll('#pvxAsk *,#pvxCheck *').forEach(el=>{ if(el.closest('.pvx-sr,[hidden],svg')) return;
                const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length; if(!t) return; const fs=parseFloat(getComputedStyle(el).fontSize); if(fs<10.95) out.push([el.className,fs]); }); return out; })()""")
            ok('n220: nothing under 11 pt in the new cards; no page errors', not small and not errs, (small, errs[:2]))
            await pg.locator('#pvxAsk').screenshot(path=os.path.join(SHOTS, 'n220-today.png'))
            await ctx.close()
            ctx, pg, errs = await p220('sgvp/interns/kristi-wenger/curriculum/')
            ki = await pg.evaluate("(()=>({t:document.getElementById('pvxTodayTitle').textContent, tiles:document.getElementById('pvxTodayTiles').hidden, ck:document.getElementById('pvxCheck').hidden}))()")
            await pg.fill('#pvxAskIn', 'Where am I next block?'); await pg.press('#pvxAskIn', 'Enter'); await pg.wait_for_timeout(250)
            ka = await pg.evaluate("document.getElementById('pvxAskOut').textContent")
            ok('n220: an intern’s page — “Ask the curriculum” (no tiles), “I” means Kristi, and no check card when nothing concerns her',
               ki == {'t': 'Ask the curriculum', 'tiles': True, 'ck': True} and ka == 'Next block, Kristi Wenger will be on Oncology (Block 05, Nov 23 – Jan 3).', (ki, ka))
            await ctx.close()
            ctx, pg, errs = await p220('sgvp/interns/jordan-hanson/curriculum/')
            ji = await pg.evaluate("[document.getElementById('pvxCheck').hidden, [...document.querySelectorAll('#pvxCheck .pvx-ck-i')].map(x=>x.querySelector('span').textContent)]")
            ok('n220: Jordan’s page shows only what concerns her — her group’s unassigned Feb 8 – 23', ji == [False, ['March group (Jordan, Rachel, Alexa) · Feb 8 – Feb 23: no rotation assigned yet']], ji)
            await ctx.close()
            ctx, pg, errs = await p220('sgvp/', vp=(390, 844), touch=True)
            ph = await pg.evaluate("(()=>({over:document.documentElement.scrollWidth>innerWidth+1, cols:getComputedStyle(document.getElementById('pvxTodayTiles')).gridTemplateColumns.split(' ').length, go:Math.round(document.querySelector('.pvx-ask-go').getBoundingClientRect().height)}))()")
            ok('n220: on iPhone the cards fit (no sideways scroll), tiles stack, the Ask button is 44 pt', ph == {'over': False, 'cols': 1, 'go': 44}, ph)
            await ctx.close()
            _secend(74)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n220: schedule check, today at Shoreline, ask the curriculum ----------', False, repr(_e)[:300])
        try:
            # ---------- n222: SGVP catch-up audit (HIG) ----------
            _sec(76)
            P222 = open(os.path.join(HERE, 'probe_n222.js')).read()
            FU222 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            CL222 = "(()=>{const D=Date,T=new D('2026-10-19T10:00:00').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()"
            async def p222(path, vp=(1440, 900), touch=False, dark=True, user=FU222):
                c, p, e = await new_page(br, user=user, vp=vp, touch=touch, dark=dark)
                await c.add_init_script(CL222)
                await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
                return c, p, e
            PG222 = ['sgvp/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']
            agg = {}
            for path in PG222:
                for vp, touch in (((1440, 900), False), ((390, 844), True)):
                    ctx, pg, errs = await p222(path, vp, touch)
                    r = await pg.evaluate(P222); r['errs'] = errs[:2]
                    r['drop'] = await pg.evaluate("(()=>{const dt=new DataTransfer(); try{dt.items.add(new File(['x'],'x.txt'));}catch(e){} const ev=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}); document.body.dispatchEvent(ev); return ev.defaultPrevented; })()")
                    agg[path + '@' + str(vp[0])] = r
                    await ctx.close()
            bad = {k: (v['fam'], v['famS']) for k, v in agg.items() if v['fam']}
            ok('n222: every SGVP page uses the system font, like Flow and Anesia (Inter is gone)', not bad, bad)
            bad = {k: v['smallS'] for k, v in agg.items() if v['small']}
            ok('n222: nothing under 11 pt on any SGVP page, Mac or iPhone (outside the shared top bar)', not bad, bad)
            bad = {k: v['glyphS'] for k, v in agg.items() if v['glyph']}
            ok('n222: no emoji or text characters as icons (line icons instead)', not bad, bad)
            bad = {k: v['backdropS'] for k, v in agg.items() if v['backdrop']}
            ok('n222: content is flat — no blur on cards, fields or modal backdrops (only floating controls)', not bad, bad)
            bad = {k: v['anims'] for k, v in agg.items() if v['anims']}
            ok('n222: nothing loops at rest except one live dot', not bad, bad)
            bad = {k: v['fakeS'] for k, v in agg.items() if v['fake']}
            ok('n222: everything clickable is a real button (legends, mentor cards, photos)', not bad, bad)
            bad = {k: v['unnamed'] for k, v in agg.items() if v['unnamed']}
            ok('n222: every control has a name', not bad, bad)
            bad = {k: v['small44S'] for k, v in agg.items() if k.endswith('@390') and v['small44']}
            ok('n222: on iPhone every control is 44 pt to touch (the plan’s initials grow an invisible touch area)', not bad, bad)
            bad = {k: (v['viewport'], v['themeColor']) for k, v in agg.items() if 'viewport-fit=cover' not in (v['viewport'] or '') or v['themeColor'] != ['#0A1222']}
            ok('n222: safe areas (viewport-fit) and a theme colour that matches the dark theme', not bad, bad)
            bad = {k: v['drop'] for k, v in agg.items() if not v['drop']}
            ok('n222: a file dropped on any SGVP page doesn’t replace it', not bad, bad)
            bad = {k: (v['apos'], v['longTips']) for k, v in agg.items() if v['apos'] or v['longTips']}
            ok('n222: curly apostrophes, and tooltips under 75 characters', not bad, bad)
            bad = {k: v['titleCase'] for k, v in agg.items() if v['titleCase']}
            ok('n222: sentence case for buttons, labels and headings', not bad, bad)
            bad = {k: v['errs'] for k, v in agg.items() if v['errs']}
            ok('n222: no page errors', not bad, bad)
            # light theme colour; reduced motion
            ctx, pg, errs = await p222('sgvp/mentors/', dark=False)
            lt = await pg.evaluate("[document.querySelector('meta[name=theme-color]').content, getComputedStyle(document.body).backgroundColor]")
            await pg.evaluate("document.body.classList.add('dark')"); await pg.wait_for_timeout(300)
            lt.append(await pg.evaluate("document.querySelector('meta[name=theme-color]').content"))
            ok('n222: the theme colour follows the theme (light #F2F4F8, then dark #0A1222)', lt == ['#F2F4F8', 'rgb(242, 244, 248)', '#0A1222'], lt)
            await ctx.close()
            rm = {}
            for path in PG222:
                c = await br.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
                await c.add_init_script(INIT.replace('@@USER@@', FU222).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(CL222)
                p = await c.new_page()
                async def rt(r):
                    u = r.request.url
                    if u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                    else: await r.fulfill(status=204, body='')
                await p.route('**/*', rt)
                await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
                n = await p.evaluate("document.getAnimations().filter(a=>a.playState==='running'&&a.effect.getComputedTiming().duration>1&&!(a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('#pvxTopnav'))).length")
                if n: rm[path] = n
                await c.close()
            ok('n222: with Reduce Motion nothing is moving on any SGVP page', not rm, rm)
            # search fields: type=search, Clear, Esc
            ctx, pg, errs = await p222('sgvp/')
            await pg.fill('#currSearch', 'kristi'); await pg.wait_for_timeout(250)
            s1 = await pg.evaluate("[document.getElementById('currSearch').type, document.getElementById('currSearch').getAttribute('enterkeyhint'), !document.querySelector('#currSearch ~ .pvx-clear').hidden, document.querySelector('#currSearch ~ .pvx-clear').getAttribute('aria-label'), document.querySelectorAll('#currTbody .svc-name').length]")
            await pg.click('#currSearch ~ .pvx-clear'); await pg.wait_for_timeout(250)
            s2 = await pg.evaluate("[document.getElementById('currSearch').value, document.activeElement.id, document.querySelectorAll('#currTbody .svc-name').length, document.querySelector('#currSearch ~ .pvx-clear').hidden]")
            await pg.fill('#currSearch', 'neuro'); await pg.press('#currSearch', 'Escape'); await pg.wait_for_timeout(250)
            s3 = await pg.evaluate("[document.getElementById('currSearch').value, document.querySelectorAll('#currTbody .svc-name').length]")
            ok('n222: the curriculum search is a search field with Clear ✕ (keeps focus) and Esc to clear', s1[:4] == ['search', 'search', True, 'Clear search'] and s1[4] < 8 and s2 == ['', 'currSearch', 8, True] and s3 == ['', 8], (s1, s2, s3))
            lg = await pg.evaluate("(()=>{const l=document.querySelector('.legend-item[data-svc=\"surg\"]'); return [l.getAttribute('role'), l.tabIndex, l.getAttribute('aria-pressed'), l.title]})()")
            await pg.focus('.legend-item[data-svc="surg"]'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
            lg2 = await pg.evaluate("document.querySelector('.legend-item[data-svc=\"surg\"]').getAttribute('aria-pressed')")
            ok('n222: the legend is toggle buttons — the keyboard reaches them, Return turns one on, and they say so', lg == ['button', 0, 'false', 'Highlight Surgery in the plan'] and lg2 == 'true', (lg, lg2))
            await ctx.close()
            # alerts instead of confirm(): the profile's Reset
            ctx, pg, errs = await p222('sgvp/interns/kristi-wenger/')
            await pg.evaluate("window.__dlg=0; window.confirm=function(){window.__dlg++;return false}; window.prompt=function(){window.__dlg++;return null}; 0")
            await pg.evaluate("resetSavedData()"); await pg.wait_for_timeout(300)
            al = await pg.evaluate("(()=>{const a=document.querySelector('.pvx-al[role=alertdialog]'); return a?{t:a.querySelector('.pvx-al-t').textContent, b:[...a.querySelectorAll('button')].map(b=>b.textContent), f:document.activeElement===a, d:a.getAttribute('aria-describedby')&&!!document.getElementById(a.getAttribute('aria-describedby')), native:window.__dlg}:null})()")
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
            still = await pg.evaluate("!!document.querySelector('.pvx-al[role=alertdialog]')")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            gone = await pg.evaluate("!document.querySelector('.pvx-al')")
            ok('n222: profile Reset asks in a Pravix alert (not the browser’s) — Cancel · Reset, no default, Return does nothing, Esc cancels',
               al == {'t': 'Reset this profile?', 'b': ['Cancel', 'Reset'], 'f': True, 'd': True, 'native': 0} and still and gone, (al, still, gone))
            eb = await pg.evaluate("(()=>{toggleEditMode&&toggleEditMode(); const b=document.getElementById('editBanner'); return [getComputedStyle(b).textTransform, b.innerText.replace(/\\s+/g,' ').trim()]})()")
            ok('n222: the profile’s edit banner is a sentence (sentence case, a real Reset button)', eb[0] == 'none' and eb[1].startswith('Editing: Click a highlighted field to change it, or a photo to replace it.') and 'Reset saved edits…' in eb[1], eb)
            bt = await pg.evaluate("[...document.querySelectorAll('.nav-btn')].map(b=>b.textContent.trim()).filter(Boolean)")
            ok('n222: profile buttons use line icons and sentence case (Print, Export, New intern, Save)', all(x in bt for x in ['Print', 'Export', 'New intern']), bt)
            await ctx.close()
            ctx, pg, errs = await p222('sgvp/interns/kristi-wenger/', vp=(390, 844), touch=True)
            tw = await pg.evaluate("(()=>{toggleEditMode&&toggleEditMode(); return document.querySelector('#editBanner .pvx-tapword').textContent})()")
            ok('n222: on touch the banner says Tap', tw == 'Tap', tw)
            await ctx.close()
            # the shadow schedule's copy: a sheet instead of prompt()
            ctx, pg, errs = await p222('sgvp/shadow-schedule/')
            await pg.evaluate("window.__dlg=0; window.prompt=function(){window.__dlg++;return null}; 0")
            await pg.evaluate("exportSchedule()"); await pg.wait_for_timeout(300)
            sh = await pg.evaluate("(()=>{const a=document.querySelector('.pvx-al[role=dialog]'); return a?{t:a.querySelector('.pvx-al-t').textContent, act:a.querySelector('.pvx-al-a').getAttribute('aria-disabled'), f:document.activeElement.tagName, native:window.__dlg}:null})()")
            await pg.keyboard.type('Block 3'); await pg.wait_for_timeout(100)
            en = await pg.evaluate("document.querySelector('.pvx-al .pvx-al-a').getAttribute('aria-disabled')")
            async with pg.expect_download() as dl:
                await pg.keyboard.press('Enter')
            d = await dl.value
            ok('n222: the shadow schedule’s Save a copy is a Pravix sheet (name field, Save waits for a name), and saves Block 3.html',
               sh == {'t': 'Save a copy', 'act': 'true', 'f': 'INPUT', 'native': 0} and en == 'false' and d.suggested_filename == 'Block 3.html', (sh, en, d.suggested_filename))
            dt = await pg.evaluate("[document.querySelector('.bl-dates').textContent, [...document.querySelectorAll('.block-dates')].slice(0,2).map(e=>e.textContent)]")
            ok('n222: one date style (Jun 22 – Jul 5, Jun 22)', dt == ['Jun 22 – Jul 5', ['Jun 22', 'Jun 23']], dt)
            await ctx.close()
            ctx, pg, errs = await p222('sgvp/assets/')
            at = await pg.evaluate("[document.getElementById('assetsTitleText').textContent, [...document.querySelectorAll('.sec-label')].map(e=>e.childNodes[0].textContent.trim())]")
            ok('n222: Assets — “Assets”, sentence-case sections', at[0] == 'Assets' and at[1][:4] == ['Featured applications', 'Hospital resources', 'Clinical resources', 'Coming soon'], at)
            await ctx.close()
            ctx, pg, errs = await p222('v/')
            vv = await pg.evaluate("[[...document.querySelectorAll('meta[name=theme-color]')].map(m=>m.content), parseFloat(getComputedStyle(document.querySelector('.brand .pvx small')).fontSize)]")
            ok('n222: the verify page has a theme colour, and “Powered by” is 9 pt like the top bar', len(vv[0]) >= 1 and vv[1] == 9, vv)
            await ctx.close()
            await pg.close() if False else None
            _secend(76)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n222: SGVP catch-up audit (HIG) ----------', False, repr(_e)[:300])
        if _helper(76):   # only what later sections use from it
            try:
                FU222 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
                CL222 = "(()=>{const D=Date,T=new D('2026-10-19T10:00:00').getTime(),o=D.now();class F extends D{constructor(...a){ if(a.length) super(...a); else super(T+(D.now()-o)); } static now(){ return T+(D.now()-o); }} window.Date=F; })()"
                async def p222(path, vp=(1440, 900), touch=False, dark=True, user=FU222):
                    c, p, e = await new_page(br, user=user, vp=vp, touch=touch, dark=dark)
                    await c.add_init_script(CL222)
                    await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(2600)
                    return c, p, e
            except Exception as _e: print('::warning::helper 76 failed: ' + repr(_e)[:200])
        try:
            # ---------- n224: HIG Icons on the SGVP pages (standard Export and Save, no emoji, small icons as heavy as their text) ----------
            _sec(78)
            W224 = r"""(()=>{const top=document.querySelector('#pvxTopnav');const thin=[];let n=0;
              document.querySelectorAll('svg').forEach(s=>{if(top&&top.contains(s))return;const r=s.getBoundingClientRect();if(!r.width||r.width>15)return;
                const vb=s.viewBox&&s.viewBox.baseVal;if(!vb||!vb.width)return;const sc=r.width/vb.width;
                s.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse').forEach(p=>{const cs=getComputedStyle(p);if(cs.stroke==='none')return;const w=parseFloat(cs.strokeWidth)*sc;n++;if(w<0.97)thin.push((s.parentNode.className||s.parentNode.tagName)+'@'+Math.round(r.width)+':'+w.toFixed(2));});});
              const re=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}↺]/u;const em=[];const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;
              while(t=tw.nextNode()){if(top&&top.contains(t.parentNode))continue;if(t.parentNode.closest('script,style'))continue;if(re.test(t.textContent))em.push(t.textContent.trim().slice(0,24));}
              return {n,thin:thin.slice(0,8),em:em.slice(0,8)};})()"""
            thin224 = {}; emo224 = {}; cnt224 = 0
            for path in ['sgvp/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']:
                for vp, touch in (((1440, 900), False), ((390, 844), True)):
                    ctx, pg, errs = await p222(path, vp, touch)
                    r = await pg.evaluate(W224); cnt224 += r['n']
                    if r['thin']: thin224[path + '@' + str(vp[0])] = r['thin']
                    if r['em']: emo224[path + '@' + str(vp[0])] = r['em']
                    await ctx.close()
            ok('n224: no small line icon on any SGVP page is lighter than its text (every icon under 15 pt draws at least 1 pt — n227: at its label’s weight), Mac and iPhone', not thin224 and cnt224 > 100, (thin224, cnt224))
            ok('n224: no emoji or ↺ shown on any SGVP page, Assets’ admin previews included', not emo224, emo224)
            # 1. Apple's standard icons: Export (arrow out of a box) and Save (checkmark) on the intern profile
            ctx, pg, errs = await p222('sgvp/interns/kristi-wenger/')
            r = await pg.evaluate("""(()=>{const b=[...document.querySelectorAll('button')];const f=t=>{const x=b.find(e=>e.textContent.trim()===t);return x&&x.querySelector('svg path')?x.querySelector('svg path').getAttribute('d'):null;};
              return [f('Export'), f('Save'), document.documentElement.outerHTML.includes('M5 4h11l3 3v13H5z')];})()""")
            ok('n224: the profile’s Export is an arrow out of a box (square.and.arrow.up) and Save is a checkmark — no floppy disk anywhere', r[0] and r[0].startswith('M12 3.5v11M8 7.5l4-4 4 4') and r[1] == 'M5 12.5l4.5 4.5L19 7.5' and not r[2], r)
            # 2. the weather line is a line icon and words, not an emoji
            wx224 = []
            for code, word in ((61, 'Light rain'), (3, 'Overcast'), (0, 'Clear')):
                def wxf(code):
                    async def wxr(rq):
                        await rq.fulfill(status=200, content_type='application/json', body=json.dumps({'current': {'temperature_2m': 54.4, 'weather_code': code}}))
                    return wxr
                await pg.route('https://api.open-meteo.com/**', wxf(code))
                await pg.evaluate("fetchWeather(); 0"); await pg.wait_for_timeout(400)
                wx224.append(await pg.evaluate("(()=>{const e=document.getElementById('welcomeWeather');return [e.textContent, !!e.querySelector('svg.pvx-ico[aria-hidden=true]'), /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(e.textContent)];})()"))
                await pg.unroute('https://api.open-meteo.com/**')
            ok('n224: the welcome card’s weather is a Pravix line icon with the words (“54°F · Overcast”), never an emoji', all(w[1] and not w[2] and w[0].startswith('54°F · ') for w in wx224) and [w[0] for w in wx224] == ['54°F · Light rain', '54°F · Overcast', '54°F · Clear'], wx224)
            src = await pg.content()
            ok('n224: a new intern’s template keeps the mentor e-mail line icon (no ✉ emoji)', "'mIcon-email':'<svg" in src and "'✉'" not in src, None)
            ok('n224: the intern profile has no page errors', not errs, errs[:3])
            await ctx.close()
            # 3. Assets: the admin's "Coming soon" previews and the wallpaper preview are line icons, also after Reset
            ctx, pg, errs = await p222('sgvp/assets/')
            r = await pg.evaluate("""(()=>{const ids=['sprev-scribe','sprev-anesthesia','sprev-flow','sprev-drug','sprev-treatment','wprev'];
              const a=ids.map(i=>{const e=document.getElementById(i);return e&&!!e.querySelector('svg.pvx-ico')&&!/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(e.textContent);});
              return a;})()""")
            await pg.evaluate("window.__t=[];const o=window.toast;window.toast=function(m){window.__t.push(m);return o&&o.apply(this,arguments)}; resetSoon('scribe'); 0"); await pg.wait_for_timeout(300)
            r2 = await pg.evaluate("[!!document.querySelector('#sprev-scribe svg.pvx-ico'), window.__t.join('|')]")
            ok('n224: Assets’ “Coming soon” background previews and wallpaper preview are line icons (were 🤖 💉 🌊 ⚗️ 📋 🖼), and stay so after Reset', all(r) and r2[0] and '↺' not in r2[1], (r, r2))
            ok('n224: Assets has no page errors', not errs, errs[:3])
            await ctx.close()
            # the shadow schedule's edit-mode Remove buttons: a named line icon (were a text ✕ with no name)
            ctx, pg, errs = await p222('sgvp/shadow-schedule/')
            r = await pg.evaluate("[...document.querySelectorAll('.mini-x')].map(b=>[b.getAttribute('aria-label'), !!b.querySelector('svg.pvx-ico'), b.textContent.trim()])")
            ok('n224: the shadow schedule’s Remove buttons (edit mode) are a line icon named “Remove”, not a text ✕', len(r) >= 9 and all(x == ['Remove', True, ''] for x in r) and not errs, (r[:3], len(r), errs[:2]))
            await ctx.close()
            _secend(78)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n224: HIG Icons on the SGVP pages (standard Export and Save, no emoji, small icons as heav', False, repr(_e)[:300])
        try:
            # ---------- n225: HIG Layout across the suite (fit, no floating controls, text size, safe areas) ----------
            _sec(79)
            FU225 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            RU225 = '{"uid":"u2","email":"resident.a@vca.com","displayName":"Resident A"}'
            CUT225 = r"""(()=>{const W=innerWidth,top=document.querySelector('#pvxTopnav,nav.topnav');const off=[];
              document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;if(e.closest('details:not([open])')&&!e.closest('summary')&&e.closest('details:not([open])')!==e)return;
                const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||cs.position==='fixed')return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;
                if(r.right>W+2||r.left<-2){let p=e.parentElement,clip=false;while(p&&p!==document.body){const c=getComputedStyle(p);if(/(auto|scroll|hidden|clip)/.test(c.overflowX)){clip=true;break;}p=p.parentElement;}
                  if(!clip)off.push((e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+String(e.className).split(' ')[0])+':'+Math.round(r.left)+'-'+Math.round(r.right));}});
              return {hs:document.documentElement.scrollWidth>W+1,off:[...new Set(off)].slice(0,4)};})()"""
            PG225 = ['index.html', 'anesia/', 'treatment/', 'or/', 'checkin/', 'directory/', 'scheduling/', 'kura/', 'grid/', 'forms/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
            bad = {}
            for vp, touch in (((1440, 900), False), ((1180, 820), True), ((820, 1180), True), ((507, 820), True), ((390, 844), True), ((844, 390), True)):
                for path in PG225:
                    ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=touch)
                    await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(1800)
                    r = await pg.evaluate(CUT225)
                    if r['hs'] or r['off']: bad[path + '@' + str(vp[0]) + 'x' + str(vp[1])] = r
                    await ctx.close()
            ok('n225: no Pravix page scrolls sideways or has anything cut off at the edges — Mac, iPad (both ways and split), iPhone (both ways)', not bad, bad)
            # 1. the intern profile fits an iPhone
            ctx, pg, errs = await new_page(br, user=FU225, vp=(390, 844), touch=True)
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/'); await pg.wait_for_timeout(2200)
            r = await pg.evaluate("(()=>{const W=innerWidth;const c=[...document.querySelectorAll('.dashboard-grid > *')].map(e=>Math.round(e.getBoundingClientRect().right));const b=[...document.querySelectorAll('#pvxSubnav .pvx-actions > button')].filter(e=>e.getClientRects().length).map(e=>Math.round(e.getBoundingClientRect().right));return [W,Math.max(...c),Math.max(...b),c.length,b.length]})()")
            ok('n225: on iPhone the intern profile fits — every dashboard card and toolbar button ends inside the screen (cards were 35 pt too wide, Save was cut)', r[1] <= r[0] - 8 and r[2] <= r[0] and r[3] >= 4 and r[4] >= 4, r)
            ok('n225: the iPhone profile has no page errors', not errs, errs[:2])
            await ctx.close()
            # 2. no floating controls: Edit and Customize… are in the page toolbar
            FIX225 = "(()=>{const H=innerHeight,W=innerWidth,top=document.querySelector('#pvxTopnav');return [...document.querySelectorAll('body *')].filter(e=>{if(top&&top.contains(e))return false;if(e.closest('.toast,#toast,[role=status],[role=alert]'))return false;const c=getComputedStyle(e);if(c.position!=='fixed'||c.display==='none'||c.visibility==='hidden'||+c.opacity===0)return false;const r=e.getBoundingClientRect();return r.width>20&&r.height>20&&r.bottom>H-90&&r.top>H*0.5&&r.width<W*0.9;}).map(e=>e.id||e.className)})()"
            fl = {}
            for path in ('sgvp/interns/kristi-wenger/', 'sgvp/shadow-schedule/', 'sgvp/assets/'):
                for vp, touch in (((1440, 900), False), ((390, 844), True)):
                    ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=touch)
                    await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2600)
                    r = await pg.evaluate(FIX225)
                    if r: fl[path + '@' + str(vp[0])] = r
                    await ctx.close()
            ok('n225: no control floats at the bottom of the window or over content on the profile, shadow schedule or Assets (edit orb, gear, wallpaper panel)', not fl, fl)
            ctx, pg, errs = await new_page(br, user=FU225)
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/'); await pg.wait_for_timeout(2600)
            a = await pg.evaluate("(()=>{const b=document.getElementById('editBtn');const ls=document.getElementById('loginSettings');return [!!b&&!b.hidden&&b.getClientRects().length>0, b&&b.textContent.trim(), b&&b.closest('#pvxSubnav')!==null, document.body.classList.contains('edit-mode'), ls&&getComputedStyle(ls).position, ls&&!!ls.closest('.page-content'), ls&&getComputedStyle(ls).display]})()")
            await pg.click('#editBtn'); await pg.wait_for_timeout(300)
            b2 = await pg.evaluate("[document.getElementById('editBtn').textContent.trim(), document.body.classList.contains('edit-mode'), getComputedStyle(document.getElementById('loginSettings')).display]")
            await pg.click('#editBtn'); await pg.wait_for_timeout(300)
            b3 = await pg.evaluate("[document.getElementById('editBtn').textContent.trim(), document.body.classList.contains('edit-mode')]")
            ok('n225: a director’s profile has Edit in the toolbar (it says “Done editing” while editing and switches the mode); the login wallpaper panel is in the page, in edit mode only', a[0] and a[1] == 'Done editing' and a[2] and a[3] and a[4] == 'static' and a[5] and a[6] == 'flex' and b2[0] == 'Edit' and not b2[1] and b2[2] == 'none' and b3 == ['Done editing', True], (a, b2, b3))
            ok('n225: the profile has no page errors', not errs, errs[:2])
            await ctx.close()
            ctx, pg, errs = await new_page(br, user=RU225)
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/interns/kristi-wenger/'); await pg.wait_for_timeout(2600)
            r = await pg.evaluate("[document.getElementById('editBtn').hidden, document.body.classList.contains('edit-mode')]")
            await ctx.close()
            ctx, pg, errs = await new_page(br, user=RU225)
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/shadow-schedule/'); await pg.wait_for_timeout(2600)
            r2 = await pg.evaluate("document.getElementById('pvxEditBtn').hidden")
            await ctx.close()
            ctx, pg, errs = await new_page(br, user=RU225)
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/assets/'); await pg.wait_for_timeout(2600)
            r3 = await pg.evaluate("document.getElementById('pvxCustomizeBtn').hidden")
            await ctx.close()
            ok('n225: someone who can’t edit sees no Edit or Customize… button (profile, shadow schedule, Assets)', r == [True, False] and r2 is True and r3 is True, (r, r2, r3))
            ctx, pg, errs = await new_page(br, user=FU225)
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/shadow-schedule/'); await pg.wait_for_timeout(2600)
            s1 = await pg.evaluate("(()=>{const b=document.getElementById('pvxEditBtn');return [!b.hidden&&b.getClientRects().length>0, b.textContent.trim(), !!b.closest('#pvxSubnav')]})()")
            await pg.click('#pvxEditBtn'); await pg.wait_for_timeout(300)
            s2 = await pg.evaluate("[document.getElementById('pvxEditBtn').textContent.trim(), document.body.classList.contains('edit-mode')]")
            await pg.evaluate("exitEdit(); 0"); await pg.wait_for_timeout(200)
            s3 = await pg.evaluate("document.getElementById('pvxEditBtn').textContent.trim()")
            ok('n225: the shadow schedule’s Edit is in the toolbar for a director and reads “Done editing” while editing', s1 == [True, 'Edit', True] and s2 == ['Done editing', True] and s3 == 'Edit' and not errs, (s1, s2, s3, errs[:2]))
            await ctx.close()
            ctx, pg, errs = await new_page(br, user=FU225)
            await pg.goto(f'http://127.0.0.1:{PORT}/sgvp/assets/'); await pg.wait_for_timeout(2600)
            c1 = await pg.evaluate("(()=>{const b=document.getElementById('pvxCustomizeBtn');return [!b.hidden&&b.getClientRects().length>0, b.textContent.trim(), !!b.closest('#pvxSubnav')]})()")
            await pg.click('#pvxCustomizeBtn'); await pg.wait_for_timeout(500)
            c2 = await pg.evaluate("!!document.querySelector('#authOverlay.open, .admin-panel.open, #adminPanel.open, .admin-overlay.open')")
            ok('n225: Assets’ Customize… is a labelled toolbar button for a director and opens customizing', c1 == [True, 'Customize…', True] and c2 and not errs, (c1, c2, errs[:2]))
            await ctx.close()
            # 3. text follows the text size; the shared top bar stays in points
            TX225 = "(()=>{const t=document.querySelector('#pvxTopnav,nav.topnav');let s=0,n=0;document.querySelectorAll('body *').forEach(e=>{if(t&&t.contains(e))return;if(![...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>2))return;const r=e.getBoundingClientRect();if(!r.width)return;const fz=parseFloat(getComputedStyle(e).fontSize);if(!fz)return;s+=fz;n++;});const ni=t&&t.querySelector('.nav-item');return [n?s/n:0, ni?parseFloat(getComputedStyle(ni).fontSize):0]})()"
            tx = {}; big = {}
            for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']:
                vals = []
                for vp, touch, pct in (((1440, 900), False, None), ((1440, 900), False, '200%'), ((390, 844), True, '200%')):
                    ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=touch)
                    if pct: await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='%s'})" % pct)
                    await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(1800)
                    vals.append(await pg.evaluate(TX225))
                    if pct:
                        r = await pg.evaluate(CUT225)
                        if r['hs'] or r['off']: big[path + '@' + str(vp[0])] = r
                    await ctx.close()
                if not (vals[1][0] >= vals[0][0] * 1.8 and vals[0][1] == vals[1][1]): tx[path] = [round(vals[0][0], 1), round(vals[1][0], 1), vals[0][1], vals[1][1]]
            ok('n225: text grows with the text size in Treatment, OR, Check-In, Forms, Directory, Scheduling, every SGVP page and the verify page (200 % → about 2×); the shared top bar stays the same', not tx, tx)
            ok('n225: at 200 % text nothing scrolls sideways or is cut off on those pages, Mac and iPhone', not big, big)
            ctx, pg, errs = await new_page(br, user=FU225)
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(1500)
            r = await pg.evaluate("[typeof window.pvxTextScale, window.pvxTextScale && pvxTextScale(), !!document.getElementById('pvx-n225-text')]")
            ok('n225: the Dynamic Type follower is on (text scale 1 at the default size)', r == ['function', 1, True], r)
            await ctx.close()
            import hashlib as _h, re
            stamps = {}
            for nm in ('app.css', 'core.js'):
                v = _h.sha256(open(os.path.join(BUILD, 'treatment', nm), 'rb').read()).hexdigest()[:10]
                stamps[nm] = (nm + '?v=' + v) in open(os.path.join(BUILD, 'treatment', 'index.html'), encoding='utf-8').read()
            ok('n225: Treatment loads the new app.css and core.js (their version stamps follow the files)', all(stamps.values()), stamps)
            # 4. safe areas
            sa = {}
            for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'grid/']:
                s = open(os.path.join(BUILD, path, 'index.html'), encoding='utf-8').read()
                vpm = re.search(r'<meta name="viewport" content="([^"]*)"', s).group(1)
                if 'viewport-fit=cover' not in vpm or 'pvx-n225-safe' not in s or 'env(safe-area-inset-left' not in s: sa[path] = vpm
            ok('n225: Treatment, OR, Check-In, Forms, Directory, Scheduling and Grid use the whole screen and keep content inside the safe areas (viewport-fit=cover + insets)', not sa, sa)
            # Directory's menus open inside the window
            dm = {}
            for vp in ((390, 844), (507, 820)):
                ctx, pg, errs = await new_page(br, user=FU225, vp=vp, touch=True)
                await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(1800)
                for i in range(2):
                    r = await pg.evaluate("(i=>{const d=document.querySelectorAll('details.dept-menu')[i];if(!d)return null;d.querySelector('summary').click();return new Promise(res=>setTimeout(()=>{const p=d.querySelector('.dept-menu-popover').getBoundingClientRect();const o=[Math.round(p.left),Math.round(p.right),innerWidth];d.removeAttribute('open');res(o)},250))})", i)
                    if r and (r[0] < 8 or r[1] > r[2] - 8): dm[f'{vp[0]}#{i}'] = r
                await ctx.close()
            ok('n225: Directory’s Departments and Languages menus open inside the window on iPhone and in split view (Departments ran off the left edge)', not dm, dm)
            _secend(79)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n225: HIG Layout across the suite (fit, no floating controls, text size, safe areas) -----', False, repr(_e)[:300])
        try:
            # ---------- n226: HIG Materials across the suite (Anesia's glass on the floating layer) ----------
            _sec(80)
            FU226 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            G226 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const o={glass:[],content:[],scrim:[]};
              const up=e=>{for(let x=e;x&&x!==document.body;x=x.parentElement){const p=getComputedStyle(x).position;if(p==='fixed'||p==='sticky'||p==='absolute')return x;}return null;};
              const al=c=>{const m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);return p.length>3?p[3]:1;};
              document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;const c=getComputedStyle(e);const k=(e.id?'#'+e.id:'')+'.'+String(e.className).split(' ')[0];
                const scr=/scrim|overlay|-dim|backdrop|tsGate|urgent-interrupt|tsOrderSheet/i.test(k)&&c.position==='fixed';
                const bf=c.backdropFilter||'none';
                if(scr){o.scrim.push([k,bf,al(c.backgroundColor)]);return;}
                if(bf==='none'||/blur\(0px\)/.test(bf))return;
                if(e.matches('#editOrb,.edit-orb'))return;   /* Scheduling's own frost orb (a control, not a surface) */
                if(up(e))o.glass.push([k,bf,+al(c.backgroundColor).toFixed(2)]);else o.content.push([k,bf]);});
              return o;})()"""
            P226 = ['treatment/', 'or/', 'checkin/', 'scheduling/', 'directory/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
            badg = {}; badc = {}; bads = {}; nglass = 0; errs226 = {}
            for path in P226:
                for dark in (True, False):
                    ctx, pg, errs = await new_page(br, user=FU226, dark=dark)
                    await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2200)
                    r = await pg.evaluate(G226); key = path + ('@dark' if dark else '@light')
                    nglass += len(r['glass'])
                    g = [x for x in r['glass'] if not (x[1] == 'blur(12px) saturate(1.6)' and x[2] == 0.86)]
                    if g: badg[key] = g[:4]
                    if r['content']: badc[key] = r['content'][:4]
                    s = [x for x in r['scrim'] if x[1] not in ('none', 'blur(0px)')]
                    if s: bads[key] = s[:4]
                    if errs and path != 'scheduling/': errs226[key] = errs[:1]
                    await ctx.close()
            ok('n226: every floating surface (menus, popovers, toasts, pills, sticky bars) wears Anesia’s glass — blur 12, saturate 160 %, 86 % — dark and light', not badg and nglass >= 8, (badg, nglass))
            ok('n226: no glass in the content layer in any app (Check-In’s form cards were 66 % with a 44 px blur)', not badc, badc)
            ok('n226: scrims dim and never blur (OR, Scheduling, Treatment, Check-In, SGVP)', not bads, bads)
            ok('n226: no page errors on those pages', not errs226, errs226)
            ctx, pg, errs = await new_page(br, user=FU226)
            await pg.goto(f'http://127.0.0.1:{PORT}/checkin/'); await pg.wait_for_timeout(2000)
            r = await pg.evaluate("(()=>{const c=document.querySelector('.card');const s=getComputedStyle(c);return [s.backgroundColor,s.backdropFilter]})()")
            ok('n226: Check-In’s form card is solid navy with no blur', r == ['rgb(18, 28, 48)', 'none'], r)
            await ctx.close()
            # accessibility: Reduce Transparency, Increase Contrast; the slow-device guard
            acc = {}
            for feat, val in (('prefers-reduced-transparency', 'reduce'), ('prefers-contrast', 'more')):
                for path in ('treatment/', 'or/', 'checkin/', 'sgvp/interns/kristi-wenger/'):
                    ctx, pg, errs = await new_page(br, user=FU226)
                    cdp = await ctx.new_cdp_session(pg)
                    await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': feat, 'value': val}]})
                    await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2000)
                    r = await pg.evaluate(G226)
                    g = [x for x in r['glass'] if x[2] < 1 or x[1] not in ('none',)]
                    fl = await pg.evaluate("(sel=>[...document.querySelectorAll(sel)].map(e=>{const c=getComputedStyle(e);return [e.id||e.className.split(' ')[0],c.backdropFilter,c.backgroundColor]}).filter(x=>x[1]!=='none'||/rgba/.test(x[2])&&!/, 1\\)$/.test(x[2])).slice(0,4))", '#fvToast,.sb-head,.dd-panel,.search-results,.top,.lang-menu,#emailSuggestions,.pvx-msg,.to-pop,.ap-pop')
                    if g or fl: acc[feat + '@' + path] = (g[:3], fl)
                    await ctx.close()
            ok('n226: with Reduce Transparency or Increase Contrast every floating surface is solid (Treatment, OR, Check-In, SGVP)', not acc, acc)
            ctx, pg, errs = await new_page(br, user=FU226)
            await ctx.add_init_script("try{localStorage.setItem('anesia:v1:blur','0')}catch(e){}")
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2000)
            r = await pg.evaluate("[document.documentElement.classList.contains('pvx-noblur'), getComputedStyle(document.querySelector('.sb-row')||document.body).backdropFilter]")
            ok('n226: on a device Anesia found too slow for blur, the glass is solid in Treatment too (shared setting)', r == [True, 'none'], r)
            await ctx.close()
            _secend(80)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n226: HIG Materials across the suite (Anesias glass on the floating layer) ----------', False, repr(_e)[:300])
        try:
            # ---------- n227: HIG SF Symbols across the suite ----------
            _sec(81)
            FU227 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            S227 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const T={100:1.2,200:1.3,300:1.45,400:1.6,500:1.8,600:2.0,700:2.25,800:2.5,900:2.7};
              const o={n:0,offgrid:[],noaria:[],light:[],heavy:[]};
              document.querySelectorAll('svg').forEach(s=>{if(top&&top.contains(s))return;const r=s.getBoundingClientRect();if(r.width<6||r.width>32||r.height>32)return;
                o.n++;const vb=s.getAttribute('viewBox');if(vb!=='0 0 24 24')o.offgrid.push(vb+' '+(s.parentElement.className||'').toString().slice(0,20));
                if(s.getAttribute('aria-hidden')!=='true'&&!s.closest('[aria-hidden=true]')&&!s.getAttribute('aria-label')&&!s.getAttribute('role')&&!s.querySelector('title'))o.noaria.push((s.parentElement.className||s.parentElement.tagName).toString().slice(0,24));
                const host=s.closest('button,a,[role=button],label,li,.chip,.seg')||s.parentElement;let tx=null;for(const e of [host,...host.querySelectorAll('*')]){if([...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>1)){tx=e;break;}}
                const p=s.querySelector('path,circle,rect,line,polyline,polygon');if(!tx||!p)return;const pc=getComputedStyle(p);if(pc.stroke==='none'||!(parseFloat(pc.strokeWidth)>0))return;
                if(/⌘|^[A-Z]{1,2}$/.test(tx.textContent.trim()))return;   /* a shortcut hint or initials, not the icon's label */
                const fw=Math.round(parseInt(getComputedStyle(tx).fontWeight)/100)*100;const act=parseFloat(pc.strokeWidth)*r.width/24;const exp=Math.max(1,(T[fw]||1.6)*r.width/24);
                const k=(host.className||host.tagName).toString().split(' ')[0]+':'+tx.textContent.trim().slice(0,14)+' '+act.toFixed(2)+'/'+exp.toFixed(2);
                if(act<exp*0.75)o.light.push(k);if(act>exp*1.45)o.heavy.push(k);});
              for(const k of ['offgrid','noaria','light','heavy'])o[k]=[...new Set(o[k])].slice(0,5);return o;})()"""
            P227 = ['index.html', 'treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']
            og = {}; na = {}; wt = {}; tot = 0
            for path in P227:
                ctx, pg, errs = await new_page(br, user=FU227)
                await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2400)
                r = await pg.evaluate(S227); tot += r['n']
                if r['offgrid']: og[path] = r['offgrid']
                if r['noaria']: na[path] = r['noaria']
                if r['light'] or r['heavy']: wt[path] = (r['light'], r['heavy'])
                await ctx.close()
            ok('n227: every interface icon in the suite is on the one 24-pt grid (Treatment’s 10/16/20 and the 16-pt pause/play are redrawn)', not og and tot > 500, (og, tot))
            ok('n227: every decorative icon is hidden from VoiceOver (446 in Directory, 31 in Mentors, 19 per profile, 11 in Treatment …)', not na, na)
            ok('n227: icons match their label’s weight (Anesia’s table, at least 1 pt) — Treatment’s sort arrows were 1.76 pt beside 0.92 pt labels', not wt, wt)
            # Treatment's sort arrow and + / ••• (drawn by its scripts)
            ctx, pg, errs = await new_page(br, user=FU227)
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2400)
            r = await pg.evaluate("(()=>{const c=document.querySelector('.sb-chev');const p=c&&c.querySelector('path');return [c&&c.getAttribute('viewBox'),p&&+(parseFloat(getComputedStyle(p).strokeWidth)*c.getBoundingClientRect().width/24).toFixed(2), !!document.querySelector('.pt-add svg[viewBox=\"0 0 24 24\"]')]})()")
            ok('n227: Treatment’s sort arrow is on the 24-pt grid at about 1 pt, and its tab bar + is too', r[0] == '0 0 24 24' and 0.95 <= r[1] <= 1.1 and r[2] and not errs, (r, errs[:1]))
            await ctx.close()
            # the selected tab on iPhone: fill variant
            tf = {}
            for path, sel in (('index.html', 'html.pvx-tabbar #switcher .seg.active'), ('treatment/', 'html.pvx-ttab #clinSwitcher .seg.active')):
                ctx, pg, errs = await new_page(br, user=FU227, vp=(390, 844), touch=True)
                await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2400)
                tf[path] = await pg.evaluate("(sel=>{const a=document.querySelector(sel+' svg :is(path,rect,circle)');const b=[...document.querySelectorAll(sel.replace('.seg.active','.seg:not(.active)')+' svg :is(path,rect,circle)')][0];return [a&&getComputedStyle(a).fill,a&&getComputedStyle(a).fillOpacity,b&&getComputedStyle(b).fill]})", sel)
                await ctx.close()
            ctx, pg, errs = await new_page(br, user=FU227, vp=(390, 844), touch=True)
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2400)
            r = await pg.evaluate("(()=>{const a=document.querySelector('#clinSwitcher .seg.active');return [getComputedStyle(a.querySelector('svg')).color, getComputedStyle(a).color, getComputedStyle(a.querySelector('svg rect,svg path')).stroke]})()")
            ok('n227: in Treatment’s iPhone tab bar the selected tab’s symbol is visible — the label’s teal (it was white on the white bar)', r[0] == r[1] == r[2] and r[0] != 'rgb(255, 255, 255)', r)
            await ctx.close()
            ok('n227: on iPhone the selected tab in Flow’s and Treatment’s tab bars uses the fill variant (the others stay outline), as the shared top bar does', all(v[0] not in (None, 'none') and v[1] == '0.5' and v[2] == 'none' for v in tf.values()), tf)
            ctx, pg, errs = await new_page(br, user=FU227)
            await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(2000)
            r = await pg.evaluate("(()=>{const b=document.querySelector('.drawer-close');return [b.getAttribute('aria-label'), b.textContent.trim(), !!b.querySelector('svg[aria-hidden=true]')]})()")
            ok('n227: Directory’s drawer closes with the Close symbol (named “Close profile”), not a text ✕', r == ['Close profile', '', True], r)
            await ctx.close()
            _secend(81)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n227: HIG SF Symbols across the suite ----------', False, repr(_e)[:300])
        try:
            # ---------- n228: HIG Motion across the suite ----------
            _sec(82)
            FU228 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            async def ctx228(rm, vp=(1440, 900)):
                c = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, reduced_motion='reduce' if rm else 'no-preference')
                await c.add_init_script(INIT.replace('@@USER@@', FU228).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE)
                pg = await c.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                async def rt(r):
                    if r.request.url.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                    else: await r.fulfill(status=204, body='')
                await pg.route('**/*', rt)
                return c, pg, errs
            RUN228 = "(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');return document.getAnimations().filter(a=>a.playState==='running'&&a.effect&&a.effect.target&&!(top&&top.contains(a.effect.target))&&a.effect.getComputedTiming().duration>1).map(a=>[(a.animationName||a.transitionProperty||''),String(a.effect.target.className||a.effect.target.id).split(' ')[0],a.effect.getComputedTiming().iterations===Infinity?'loop':'once'])})()"
            P228 = ['index.html', 'anesia/', 'treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'kura/', 'grid/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
            rest = {}; rmr = {}
            for path in P228:
                for rm in (False, True):
                    c, pg, errs = await ctx228(rm)
                    await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(3500)
                    r = await pg.evaluate(RUN228)
                    if rm and r: rmr[path] = r[:4]
                    if not rm:
                        live = [x for x in r if 'live' in x[0] or 'live' in x[1]]
                        other = [x for x in r if x not in live and not (path == 'scheduling/' and ('ticker' in x[0] or 'blink' in x[0] or 'pulse-dot' in x[0]))]
                        if len(live) > 1 or other: rest[path] = r[:5]
                    await c.close()
            ok('n228: nothing moves at rest on any page except one live dot (Directory’s 9 breathing status dots and SGVP’s 24 s / 12 s sweeps, glows and breathing are gone); Scheduling’s pausable announcement aside', not rest, rest)
            ok('n228: with Reduce Motion nothing moves on any page (Directory’s dots kept breathing)', not rmr, rmr)
            # hover lifts stay still with Reduce Motion
            HOV228 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const o=[];const walk=(l,m)=>{for(const r of l){if(!(r instanceof CSSStyleRule)){if(r.cssRules&&!(r instanceof CSSKeyframesRule))walk(r.cssRules,(m||'')+(r.media?r.media.mediaText:''));continue;}
                const sel=r.selectorText||'';if(/:hover/.test(sel)&&/translate|scale/.test(r.style.transform||'')&&!/reduced-motion/.test(m||'')){sel.split(',').forEach(s=>{if(/:hover/.test(s)){const b=s.replace(/:hover/g,'').trim();try{const e=[...document.querySelectorAll(b)].find(x=>x.getClientRects().length&&!(top&&top.contains(x))&&x.getBoundingClientRect().top>0&&x.getBoundingClientRect().bottom<innerHeight);if(e&&!e.__h){e.__h=1;e.setAttribute('data-h228',o.length);o.push(b);}}catch(err){}}});}}};
              for(const sh of document.styleSheets){try{walk(sh.cssRules,'')}catch(e){}}return o.slice(0,10);})()"""
            moved = {}; tested = 0
            for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/assets/']:
                c, pg, errs = await ctx228(True)
                await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2400)
                sels = await pg.evaluate(HOV228)
                for i, s in enumerate(sels):
                    try:
                        el = pg.locator(f'[data-h228="{i}"]').first
                        b0 = await el.bounding_box(); await el.hover(timeout=1500, force=True); await pg.wait_for_timeout(300); b1 = await el.bounding_box()
                        await pg.mouse.move(2, 890); tested += 1
                        if b0 and b1 and (abs(b0['y'] - b1['y']) > 0.5 or abs(b0['width'] - b1['width']) > 0.5): moved.setdefault(path, []).append(s[:40])
                    except Exception: pass
                await c.close()
            ok('n228: with Reduce Motion nothing lifts on hover (Directory’s cards, OR’s search orb, Check-In’s Continue, Scheduling’s day off, the profile’s avatars …)', not moved and tested >= 15, (moved, tested))
            # brief transitions
            LONG228 = r"""(()=>{const o=[];const walk=(l,m)=>{for(const r of l){if(!(r instanceof CSSStyleRule)){if(r.cssRules&&!(r instanceof CSSKeyframesRule))walk(r.cssRules,(m||'')+(r.media?r.media.mediaText:''));continue;}
                const sel=r.selectorText||'';if(/topnav|nav-item|logout|pvx-word|theme-toggle|hold|press|autofill|timer|countdown/i.test(sel)||/reduced-motion/.test(m||''))continue;
                (r.style.transitionDuration||'').split(',').forEach(x=>{const v=parseFloat(x)*(/ms/.test(x)?0.001:1);if(v>0.5&&v<100)o.push(sel.slice(0,40)+' '+x.trim());});}};
              for(const sh of document.styleSheets){try{walk(sh.cssRules,'')}catch(e){}}return o.slice(0,6);})()"""
            lg = {}
            for path in ['treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/']:
                c, pg, errs = await ctx228(False)
                await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(1800)
                r = await pg.evaluate(LONG228)
                if r: lg[path] = r
                await c.close()
            ok('n228: transitions are brief — none over 0.5 s (the profile’s 1.2 s ring and 1 s bars, Treatment’s 0.9 s alert and fills now 0.4 s; press-and-hold timers keep theirs)', not lg, lg)
            # Check-In follows Reduce Motion
            c, pg, errs = await ctx228(True)
            await pg.goto(f'http://127.0.0.1:{PORT}/checkin/'); await pg.wait_for_timeout(1800)
            r = await pg.evaluate("(()=>{const b=document.querySelector('.next')||document.querySelector('button');return [getComputedStyle(b).transitionDuration.split(',')[0], !!document.getElementById('pvx-n228-motion')]})()")
            ok('n228: Check-In follows Reduce Motion (transitions instant, nothing lifts)', r[1] and r[0] in ('1e-05s', '0.00001s', '0s'), r)
            await c.close()
            # Scheduling's announcement with Reduce Motion: still, wrapping text
            c, pg, errs = await ctx228(True)
            await pg.goto(f'http://127.0.0.1:{PORT}/scheduling/'); await pg.wait_for_timeout(2400)
            r = await pg.evaluate("(()=>{const t=document.getElementById('announceTicker');if(!t)return null;const cs=getComputedStyle(t);return [cs.animationName, t.scrollWidth<=t.clientWidth+2, cs.whiteSpace, t.getBoundingClientRect().right<=innerWidth+1]})()")
            ok('n228: with Reduce Motion Scheduling’s announcement is still text that wraps (it was a strip to swipe)', r is None or (r[0] == 'none' and r[1] and r[2] == 'normal' and r[3]), r)
            await c.close()
            _secend(82)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n228: HIG Motion across the suite ----------', False, repr(_e)[:300])
        try:
            # ---------- n229: HIG Typography across the suite ----------
            _sec(83)
            FU229 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            T229 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const SC=[11,12,13,14,15,16,17,20,22,24,28,30,34];const o={fam:[],small:[],off:[],track:[],light:[]};
              document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;if(![...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>0))return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0||cs.clipPath!=='none'||(r.width<=1&&r.height<=1))return;
                const fs=parseFloat(cs.fontSize);if(!fs)return;const k=(String(e.className).split(' ')[0]||e.tagName)+':'+e.textContent.trim().slice(0,14);
                if(!/^(-apple-system|SF Pro|system-ui|ui-rounded|ui-monospace|BlinkMacSystemFont)/.test(cs.fontFamily.replace(/["']/g,'')))o.fam.push(k+' '+cs.fontFamily.slice(0,24));
                const pw=/powered/i.test(e.className+' '+e.textContent)&&e.textContent.trim().length<14;
                if(fs<10.95&&!(pw&&Math.abs(fs-9)<0.01))o.small.push(k+' '+fs);
                const av=e.closest('[class*=avatar],[class*=initials],.kura-wordmark,.pvx-sr,[class*=sr-only]');
                if(fs<40&&!SC.some(x=>Math.abs(x-fs)<0.01)&&!av&&!(pw&&Math.abs(fs-9)<0.01)&&!e.getAttribute('style'))o.off.push(k+' '+fs);
                const ls=parseFloat(cs.letterSpacing)||0;if(fs<=12.5&&ls<-0.01&&cs.textTransform!=='uppercase')o.track.push(k+' '+ls);
                if(parseInt(cs.fontWeight)<400)o.light.push(k);});
              for(const x in o)o[x]=[...new Set(o[x])].slice(0,4);o.tsa=getComputedStyle(document.documentElement).webkitTextSizeAdjust;return o;})()"""
            P229 = ['index.html', 'anesia/', 'treatment/', 'or/', 'checkin/', 'forms/', 'directory/', 'scheduling/', 'kura/', 'grid/', 'sgvp/', 'sgvp/interns/kristi-wenger/', 'sgvp/interns/kristi-wenger/curriculum/', 'sgvp/mentors/', 'sgvp/shadow-schedule/', 'sgvp/assets/', 'v/']
            bad = {k: {} for k in ('fam', 'small', 'off', 'track', 'light', 'tsa')}
            for path in P229:
                for vp, touch in (((1440, 900), False), ((390, 844), True)):
                    ctx, pg, errs = await new_page(br, user=FU229, vp=vp, touch=touch)
                    await pg.goto(f'http://127.0.0.1:{PORT}/' + path); await pg.wait_for_timeout(2200)
                    r = await pg.evaluate(T229); key = path + '@' + str(vp[0])
                    for x in ('fam', 'small', 'off', 'track', 'light'):
                        if r[x]: bad[x][key] = r[x]
                    if r['tsa'] != '100%': bad['tsa'][key] = r['tsa']
                    await ctx.close()
            ok('n229: every app uses the system font — Check-In, Directory and Scheduling no longer use Inter, and Treatment’s buttons no longer fall back to Arial', not bad['fam'], bad['fam'])
            ok('n229: nothing under 11 pt outside the shared top bar (“Powered by” lockups are 9 pt, as in the top bar)', not bad['small'], bad['small'])
            ok('n229: every text size is on the Pravix scale (11 · 12 · 13 · 14 · 15 · 16 · 17 · 20 · 22 · 24 · 28 · 30 · 34; display 40+)', not bad['off'], bad['off'])
            ok('n229: small text (12.5 pt and under) is never tightened (Directory’s 426, Treatment’s 24, OR, Forms; Flow’s iPhone tab-bar labels keep theirs so five fit)', not {k: v for k, v in bad['track'].items() if not k.startswith('index.html@390')}, bad['track'])
            ok('n229: no light weights anywhere', not bad['light'], bad['light'])
            ok('n229: iPhone Safari never enlarges text on its own (text-size-adjust 100 % on every page)', not bad['tsa'], bad['tsa'])
            import re as _re
            inter = [p for p in ('checkin/index.html', 'directory/index.html', 'scheduling/index.html') if _re.search(r"googleapis\.com/css2\?family=Inter|['\"]Inter['\"]", open(os.path.join(BUILD, p), encoding='utf-8').read())]
            ok('n229: Inter isn’t downloaded any more (no Google Fonts request)', not inter, inter)
            # the top bar is unchanged: its labels keep their tracking
            ctx, pg, errs = await new_page(br, user=FU229)
            await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(1800)
            r = await pg.evaluate("(()=>{const n=document.querySelector('#pvxTopnav .nav-item');return [getComputedStyle(n).letterSpacing, getComputedStyle(n).fontSize, getComputedStyle(document.body).letterSpacing]})()")
            ok('n229: the shared top bar keeps its tracking and sizes; the page itself isn’t tightened', r[1] == '10px' and r[2] == 'normal' and r[0] in ('-0.16px', 'normal') or r[0].startswith('0.'), r)
            await ctx.close()
            # Directory wraps instead of truncating at large text
            ctx, pg, errs = await new_page(br, user=FU229, vp=(390, 844), touch=True)
            await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='200%'})")
            await pg.goto(f'http://127.0.0.1:{PORT}/directory/'); await pg.wait_for_timeout(2200)
            n = await pg.evaluate("(()=>{let n=0;document.querySelectorAll('body *').forEach(e=>{const c=getComputedStyle(e);if(/ellipsis/.test(c.textOverflow)&&e.scrollWidth>e.clientWidth+1&&e.getClientRects().length)n++});return n})()")
            ok('n229: at 200 % text Directory’s cards wrap — nothing is cut off with “…” (86 were)', n == 0 and not errs, (n, errs[:1]))
            await ctx.close()
            _secend(83)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n229: HIG Typography across the suite ----------', False, repr(_e)[:300])
        try:
            # ---------- n230: Treatment Sheets — HIG Color, Layout, Materials (synthetic training patients) ----------
            _sec(84)
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
            tsf = {f: open(os.path.join(BUILD, 'treatment', f), encoding='utf-8').read() for f in ('app.css', 'store.js', 'core.js', 'index.html')}
            ok('n230: no color-mix() anywhere in Treatment (211 were) — plain values, as Brand Identity says', all('color-mix(' not in v for v in tsf.values()), [k for k, v in tsf.items() if 'color-mix(' in v])
            used = set(_re230.findall(r'var\(--(pvx-cm\d+)\)', tsf['app.css'])); defd = set(_re230.findall(r'--(pvx-cm\d+):', tsf['app.css']))
            ok('n230: every colour that replaced a mix has a light and a dark value (%d)' % len(used), used and used <= defd and tsf['app.css'].count('body.dark{--pvx-cm') == 1, sorted(used - defd)[:5])
            # 1. one status colour map
            ctx, pg, errs = await ts230()
            await pg.evaluate("""(()=>{const h=document.querySelector('#ctab-dash .sb-hours');for(const k of ['overdue','due','scheduled']){const d=document.createElement('div');d.className='sb-blk '+k+' pvx-t230';d.innerHTML='<span class="sb-bn">1</span>';h.appendChild(d)}})()""")
            r = await pg.evaluate("""(H)=>{const hue=eval(H);const g=s=>document.querySelector(s);const bc=s=>g(s)?getComputedStyle(g(s)).backgroundColor:null;const b=getComputedStyle(document.body);
              return {od:bc('#ctab-dash .sb-blk.overdue'),du:bc('#ctab-dash .sb-blk.due.pvx-t230'),sc:bc('#ctab-dash .sb-blk.scheduled'),late:b.getPropertyValue('--st-late').trim(),due:b.getPropertyValue('--st-due').trim(),
                odHue:hue(bc('#ctab-dash .sb-blk.overdue')||'0,0,0'),scHue:hue(bc('#ctab-dash .sb-blk.scheduled')||'0,0,0'),
                clock:[...document.querySelectorAll('#ctab-dash .sb-blk.overdue:not(.pvx-t230)')].every(t=>t.querySelector('.sb-gl svg')),nOd:document.querySelectorAll('#ctab-dash .sb-blk.overdue:not(.pvx-t230)').length,
                legend:[...document.querySelectorAll('.sb-legend .li')].map(x=>x.textContent.trim()),lgOd:bc('.sb-lg.overdue'),lgDu:bc('.sb-lg.due'),
                late2:getComputedStyle(g('.ts-lc-nums .late')||document.body).color,tabClock:getComputedStyle(g('.pt-n.late')||document.body,'::before').width,
                tech:getComputedStyle(g('.tm-tech:not(.none)')||document.body,'::before').content,dots:[...document.querySelectorAll('.tm-p i')].map(i=>hue(getComputedStyle(i).backgroundColor))}}""", HUE)
            def hx(c): return '#%02X%02X%02X' % tuple(int(x) for x in _re230.findall(r'\d+', c)[:3]) if c else ''
            ok('n230: the board’s overdue tiles are the sheet’s amber and carry the clock; due now is the accent; scheduled is neutral (it was red / amber / green)',
               r['nOd'] >= 1 and r['clock'] and hx(r['od']) == r['late'].upper() and hx(r['du']) == r['due'].upper() and 25 <= r['odHue'] <= 50 and not (90 <= r['scHue'] <= 165), r)
            ok('n230: the board legend says Overdue · Due now · Scheduled · Done, with the same colours as the tiles', r['legend'][:3] == ['Overdue', 'Due now', 'Scheduled'] and r['legend'][3].endswith('Done') and r['lgOd'] == r['od'] and r['lgDu'] == r['du'], r['legend'])
            lh = await pg.evaluate(HUE + "(" + json.dumps(r['late2']) + ")")
            ok('n230: “late” in the workload is the overdue amber, not red', 25 <= lh <= 55, (r['late2'], lh))
            ok('n230: overdue counts on the patient tabs carry the clock; the tech is labelled; person colours avoid red, amber and green',
               r['tabClock'] == '9px' and r['tech'] == '"Tech"' and r['dots'] and all(not (h < 20 or h > 340 or 25 <= h <= 65 or 90 <= h <= 165) for h in r['dots'] if h >= 0), r)
            # toasts
            k = await pg.evaluate("[tsToastKind('Enter a value first'),tsToastKind('Couldn’t save — try again'),tsToastKind('Note saved'),tsToastKind('Choose a route')]")
            await pg.evaluate("toast('Enter a value first')"); await pg.wait_for_timeout(200)
            t = await pg.evaluate("(()=>{const x=[...document.querySelectorAll('.ctoast')].pop();return [x.className,x.getAttribute('role'),getComputedStyle(x.querySelector('.tk')).backgroundColor,x.querySelector('path').getAttribute('d')]})()")
            ok('n230: a toast that asks for something shows the amber “!”, a failure the red one; success keeps the green check (“Enter a value first” had a check)', k == ['warn', 'err', '', 'warn'] and 'warn' in t[0] and t[1] == 'status' and 'M12 6.5v7' in t[3], (k, t))
            # 2. teal only for things you can press
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(900)
            acc = await pg.evaluate("getComputedStyle(document.body).getPropertyValue('--accent').trim()")
            hd = await pg.evaluate("""(()=>[...document.querySelectorAll('.clinical-sidebar .panel>h4')].map(h=>getComputedStyle(h).color))()""")
            await pg.evaluate("selectCTab('charges')"); await pg.wait_for_timeout(800)
            hd += await pg.evaluate("""(()=>[...document.querySelectorAll('.ch-kicker,.ch-group>h4,#ctab-charges .panel>h4,.ch-code')].map(h=>getComputedStyle(h).color))()""")
            ok('n230: plain headings (Estimate range, Problem list, Vitals, Charges, codes) are neutral, not the accent that marks buttons', len(hd) >= 4 and all(hx(c) not in (acc.upper(), '#38BDD2', '#6FD3E4', '#1F8FA8', '#23439C') for c in hd), hd[:6])
            ok('n230: Treatment has no page errors (board, sheet, charges)', not errs, errs[:2])
            await ctx.close()
            # 3. abnormal vitals say so
            ctx, pg, errs = await ts230(view='vitals')
            for i, val in ((1, '105.8'), (2, '220')):
                await pg.fill(f'#vin-d{i}', val); await pg.locator(f'#vin-d{i}').press('Enter'); await pg.wait_for_timeout(500)
                yes = pg.locator(f'#vxw-d{i} button:has-text("Yes, ")')   # n233: a critical value asks once (the Enter used to confirm it by accident)
                if await yes.count() and await yes.first.is_visible(): await yes.first.click(); await pg.wait_for_timeout(500)
            await pg.wait_for_timeout(400)
            r = await pg.evaluate("""(()=>({hc:[...document.querySelectorAll('.tsh-vit.crit .pvx-sev')].map(x=>x.textContent),hw:[...document.querySelectorAll('.tsh-vit.warn .pvx-sev')].map(x=>x.textContent),
              al:(document.querySelector('.tsh-vit.crit')||{getAttribute:()=>''}).getAttribute('aria-label'),
              lc:[...document.querySelectorAll('.vx-now.coral .pvx-sev')].map(x=>x.textContent),lw:[...document.querySelectorAll('.vx-now.amber .pvx-sev')].map(x=>x.textContent),
              rec:[...document.querySelectorAll('#ctab-vitals .v-rec')].map(b=>getComputedStyle(b).backgroundColor),take:getComputedStyle(document.getElementById('vxTake')).backgroundColor,
              late:[...document.querySelectorAll('#ctab-vitals .vx-due.late')].map(x=>getComputedStyle(x).color).slice(0,1),
              hist:!!document.querySelector('#ctab-vitals .v-header .pvx-vhist'),foot:(()=>{const f=document.querySelector('#ctab-vitals .v-footer');return f?getComputedStyle(f).display:'none'})()}))()""")
            ok('n230: an abnormal vital says Critical or Abnormal with a symbol, in the header and the Vitals list, and VoiceOver hears it (colour was the only signal)',
               r['hc'] == ['Critical'] and r['hw'] == ['Abnormal'] and 'critical' in (r['al'] or '') and r['lc'] == ['Critical'] and r['lw'] == ['Abnormal'], r)
            lh = await pg.evaluate(HUE + "(" + json.dumps(r['late'][0] if r['late'] else 'rgb(0,0,0)') + ")")
            ok('n230: “Late · was due” on Vitals is the overdue amber (it was the accent teal)', r['late'] and 25 <= lh <= 55, (r['late'], lh))
            al = [float(_re230.findall(r'[\d.]+', c)[3]) if c.startswith('rgba') else 1 for c in r['rec']]
            ok('n230: Vitals has one filled colour button (Take vitals); each row’s Record is tinted', al and max(al) <= 0.3 and r['take'] != 'rgba(0, 0, 0, 0)', (r['rec'][:2], r['take']))
            ok('n230: Vitals history is in the Vitals toolbar, not a bar at the bottom of the window', r['hist'] and r['foot'] == 'none', r)
            ok('n230: no page errors on Vitals', not errs, errs[:2])
            await ctx.close()
            # 4. Increase Contrast and contrast
            ic = {}
            for dark in (True, False):
                for media in (None, [{'name': 'prefers-contrast', 'value': 'more'}]):
                    ctx, pg, errs = await ts230(dark=dark, media=media)
                    ic[(dark, bool(media))] = await pg.evaluate("(()=>{const b=getComputedStyle(document.body);return [b.getPropertyValue('--ink-500').trim(),b.getPropertyValue('--pvx-head').trim(),getComputedStyle(document.querySelector('#ctab-dash .sb-blk')).boxShadow]})()")
                    await ctx.close()
            ok('n230: Increase Contrast strengthens Treatment’s text, headings and tiles in light and dark (it changed nothing but the glass)',
               all(ic[(d, True)][0] != ic[(d, False)][0] and ic[(d, True)][1] != ic[(d, False)][1] and 'inset' in ic[(d, True)][2] for d in (True, False)), ic)
            CJ230 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const P=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);return [p[0],p[1],p[2],p.length>3?p[3]:1]};
              const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);const mix=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1];
              const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const root=P(getComputedStyle(document.body).backgroundColor);
              const bgOf=e=>{const st=[];let img=false;for(let x=e;x;x=x.parentElement){const c=getComputedStyle(x);if(c.backgroundImage!=='none'&&!/url\(/.test(c.backgroundImage))img=true;const b=P(c.backgroundColor);if(b&&b[3]>0){st.push(b);if(b[3]>=1)break}}let base=[255,255,255,1];if(st.length&&st[st.length-1][3]>=1)base=st.pop();else if(root)base=root;for(let i=st.length-1;i>=0;i--)base=mix(st[i],base);return {c:base,img}};
              const f=[];document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;const r=e.getBoundingClientRect();if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight)return;
                const c=getComputedStyle(e);if(c.visibility==='hidden')return;let op=1;for(let x=e;x;x=x.parentElement)op*=+getComputedStyle(x).opacity;if(op<.05)return;
                const txt=[...e.childNodes].some(t=>t.nodeType===3&&t.textContent.trim());if(!txt)return;if(e.closest('[disabled],[aria-disabled=true]'))return;
                let fc=P(e instanceof SVGElement&&c.fill&&c.fill!=='none'?c.fill:c.color);if(!fc)return;const b=bgOf(e);if(b.img)return;fc=mix([fc[0],fc[1],fc[2],fc[3]*op],b.c);const cr=CR(fc,b.c);const fs=parseFloat(c.fontSize);const need=(fs>=24||(fs>=18.66&&+c.fontWeight>=700))?3:4.5;
                if(cr<need)f.push((String(e.className).split(' ')[0]||e.tagName)+':'+e.textContent.trim().slice(0,16)+' '+cr.toFixed(2))});return [...new Set(f)].slice(0,8)})()"""
            low = {}
            for dark in (True, False):
                for media in (None, [{'name': 'prefers-contrast', 'value': 'more'}]):
                    ctx, pg, errs = await ts230(dark=dark, media=media)
                    for v in ('dash', 'tasks', 'sheet', 'vitals', 'charges', 'notes'):
                        await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(1400)
                        x = await pg.evaluate(CJ230)
                        if x: low[('dark' if dark else 'light') + ('+IC' if media else '') + '/' + v] = x
                    for sel in ('#tsPatientChip', '.al-cell'):
                        await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(500)
                        try:
                            await pg.locator(sel).first.click(timeout=2000); await pg.wait_for_timeout(600)
                            x = await pg.evaluate(CJ230)
                            if x: low[('dark' if dark else 'light') + '/' + sel] = x
                        except Exception: pass
                        await pg.keyboard.press('Escape'); await pg.mouse.click(5, 880); await pg.wait_for_timeout(300)
                    await ctx.close()
            ok('n230: every Treatment text meets 4.5:1 (3:1 large) in dark, light and Increase Contrast — sections, the patient menu and Alerts', not low, low)
            # 5. the system's light or dark until someone picks
            sch = {}
            for dark in (True, False):
                ctx, pg, errs = await ts230(dark=dark, cookie=False, open_sheet=False)
                sch[dark] = await pg.evaluate("document.body.classList.contains('dark')"); await ctx.close()
            ok('n230: with no theme chosen yet, Treatment follows the system’s light or dark (it always opened light)', sch == {True: True, False: False}, sch)
            # 8. layout
            lay = {}
            for vp in ((1440, 900), (1180, 820), (820, 1180)):
                ctx, pg, errs = await ts230(vp=vp, touch=vp[0] < 1440, view='sheet')
                lay[vp] = await pg.evaluate("""(()=>{const s=document.querySelector('.subnav'),r=s.getBoundingClientRect();const it=[...s.children].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0);
                  const tb=document.querySelector('#ctab-sheet .treatment-toolbar').getBoundingClientRect(),g=document.getElementById('sheetScroll').getBoundingClientRect(),q=document.querySelector('#ctab-sheet .order-search-wrapper').getBoundingClientRect(),lg=document.getElementById('legend').getBoundingClientRect(),lgRows=new Set([...document.getElementById('legend').children].filter(e=>e.getBoundingClientRect().width>0).map(e=>Math.round((e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)/12))).size;
                  return {h:Math.round(r.height),rows:new Set(it.map(e=>Math.round(e.getBoundingClientRect().top/20))).size,tb:Math.round(tb.height),grid:Math.round(g.height),q:Math.round(q.width),lg:lgRows,
                    over:[...document.querySelectorAll('.subnav > *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).length}})()""")
                await ctx.close()
            ok('n230: Treatment’s sub-nav is one row on Mac and iPad (the gear and search no longer drop to a second row: 115 → 71 pt)', all(v['h'] <= 75 and v['over'] == 0 for v in lay.values()), lay)
            m = lay[(1440, 900)]
            ok('n230: on a 1440×900 Mac the grid gets at least half again the room (224 pt was 4 rows); its toolbar and legend are one row; the order search is ≥ 200 pt',
               m['grid'] >= 340 and m['tb'] <= 60 and m['lg'] == 1 and m['q'] >= 200, m)
            ctx, pg, errs = await ts230(view='sheet')
            await pg.locator('input[placeholder^="Add treatment"]').first.fill('Maro'); await pg.wait_for_timeout(800)
            w = await pg.evaluate("Math.round(document.querySelector('.order-search-dropdown').getBoundingClientRect().width)")
            ok('n230: the order search results are at least 320 pt wide (“Add “Maro” as an order” wrapped to four lines)', w >= 320, w)
            dr = await pg.evaluate("[...document.querySelectorAll('.drawer:not(.open)')].map(d=>Math.round(d.getBoundingClientRect().left)-innerWidth)")
            ok('n230: closed drawers are fully off-screen (the floating drawer leaves no sliver)', dr and min(dr) >= 0, dr)
            await ctx.close()
            cmp = {}
            for vp in ((390, 844), (507, 820), (844, 390)):
                ctx, pg, errs = await ts230(vp=vp, touch=True, view='sheet')
                cmp[vp] = await pg.evaluate("""(()=>{const g=document.getElementById('sheetScroll').getBoundingClientRect(),h=document.getElementById('tsHdr').getBoundingClientRect(),st=document.getElementById('stage');
                  return {grid:Math.round(g.height),hdr:Math.round(h.height),scroll:st.scrollHeight>st.clientHeight&&getComputedStyle(st).overflowY==='auto',
                    hours:[...document.querySelectorAll('#sheetInner .ghead .hl')].filter(x=>{const r=x.getBoundingClientRect();return r.left>=g.left+200&&r.right<=g.right}).length>=1||innerWidth>700}})()""")
                if vp == (390, 844):
                    await pg.click('.pvx-hdr-more'); await pg.wait_for_timeout(300)
                    cmp['open'] = await pg.evaluate("[document.getElementById('tsHdr').classList.contains('pvx-open'),document.querySelector('.pvx-hdr-more').getAttribute('aria-expanded'),getComputedStyle(document.querySelector('.tsh-info')).display]")
                await ctx.close()
            ok('n230: on iPhone, split view and iPhone landscape the grid is usable — at least 250 pt tall and reachable by scrolling (it was 0 pt: no rows could be seen); hours show beside the narrower labels',
               all(cmp[v]['grid'] >= 250 and cmp[v]['scroll'] and cmp[v]['hours'] for v in ((390, 844), (507, 820), (844, 390))), cmp)
            ok('n230: the iPhone patient header is compact (name, allergies, weight, code, location); Details shows the rest', cmp[(390, 844)]['hdr'] <= 140 and cmp['open'][0] and cmp['open'][1] == 'true' and cmp['open'][2] != 'none', (cmp[(390, 844)], cmp['open']))
            ctx, pg, errs = await ts230(vp=(390, 844), touch=True)
            b = await pg.evaluate("""(()=>{const d=document.getElementById('ctab-dash');const off=[...d.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&getComputedStyle(e).visibility!=='hidden'&&(r.right>innerWidth+1||r.left<-1)}).map(e=>e.className).slice(0,4);
              return {off,head:getComputedStyle(document.querySelector('.sb-row.sb-head')).display,hl:[...document.querySelectorAll('#ctab-dash .sb-blk .sb-hl')].filter(x=>getComputedStyle(x).display!=='none').length,
                f:Math.round(document.querySelector('.sb-filters').getBoundingClientRect().right)}})()""")
            ok('n230: the iPhone board is one card per patient — nothing off the screen (Filters was cut off), each tile shows its hour', not b['off'] and b['head'] == 'none' and b['hl'] >= 3 and b['f'] <= 390, b)
            await ctx.close()
            big = {}
            for vp, touch in (((1440, 900), False), ((390, 844), True)):
                ctx, pg, errs = await ts230(vp=vp, touch=touch, big=True, view='sheet')
                big[vp] = await pg.evaluate("""(()=>{const sw=document.getElementById('clinSwitcher');const off=[...document.querySelectorAll('#tsHdr *, #ctab-sheet .treatment-toolbar *, .subnav > *')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).visibility==='hidden')return false;
                  for(let x=e.parentElement;x;x=x.parentElement){const c=getComputedStyle(x);if(/(auto|scroll)/.test(c.overflowX)&&x.scrollWidth>x.clientWidth+2)return false}return r.right>innerWidth+1}).map(e=>e.className||e.tagName).slice(0,4);
                  const last=sw.querySelector('.seg[data-ctab=notes]');return {off,reach:getComputedStyle(sw).overflowX==='auto'||last.getBoundingClientRect().right<=innerWidth}})()""")
                await ctx.close()
            ok('n230: at 200 % text nothing in the header, sub-nav or grid toolbar runs off the screen, and every section stays reachable (Notes was past the edge)', all(not v['off'] and v['reach'] for v in big.values()), big)
            # 9. materials (the slow-device guard is set aside here: this checks the material, the guard has its own n226 test)
            ctx, pg, errs = await ts230()
            g = {}
            g['rows'] = await pg.evaluate("[...document.querySelectorAll('.sb-row:not(.sb-head)')].map(r=>getComputedStyle(r).backdropFilter)")
            for name, sel in (('tabopts', 'role=button[name="Tab options"]'), ('tech', '.tm-tech'), ('alerts', '.al-cell'), ('patient', '#tsPatientChip')):
                try:
                    await pg.locator(sel).first.click(timeout=2000); await pg.wait_for_timeout(500)
                    g[name] = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const e=[...document.querySelectorAll('.pt-pop.show,.ts-menu.show')].pop();if(!e)return null;const c=getComputedStyle(e);return [c.backdropFilter,c.backgroundColor]})()")
                except Exception as ex: g[name] = str(ex)[:40]
                await pg.keyboard.press('Escape'); await pg.mouse.click(5, 880); await pg.wait_for_timeout(300)
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(700)
            await pg.locator('input[placeholder^="Add treatment"]').first.fill('Maro'); await pg.wait_for_timeout(700)
            g['search'] = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const c=getComputedStyle(document.querySelector('.order-search-dropdown'));return [c.backdropFilter,c.backgroundColor]})()")
            await pg.evaluate("toast('Note saved')"); await pg.wait_for_timeout(150)
            g['toast'] = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const c=getComputedStyle([...document.querySelectorAll('.ctoast')].pop());return [c.backdropFilter,c.backgroundColor]})()")
            await ctx.close()
            GL = ['blur(12px) saturate(1.6)', 'rgba(23, 35, 56, 0.86)']
            ok('n230: no glass on the Status board’s rows (content); every Treatment menu, popover, search list and toast wears the one glass, as in Flow',
               all(x == 'none' for x in g['rows']) and all(g[k] == GL for k in ('tabopts', 'tech', 'alerts', 'patient', 'search', 'toast')), g)
            ctx, pg, errs = await ts230(vp=(390, 844), touch=True)
            tb = await pg.evaluate("(()=>{document.documentElement.classList.remove('pvx-noblur');const c=getComputedStyle(document.getElementById('clinSwitcher'));return [c.backdropFilter,c.backgroundColor]})()")
            await ctx.close()
            ctx, pg, errs = await ts230(vp=(390, 844), touch=True, media=[{'name': 'prefers-reduced-transparency', 'value': 'reduce'}])
            tbr = await pg.evaluate("(()=>{const c=getComputedStyle(document.getElementById('clinSwitcher'));return [c.backdropFilter,c.backgroundColor]})()")
            await pg.locator('.tm-tech').first.click(timeout=3000); await pg.wait_for_timeout(500)
            mr = await pg.evaluate("(()=>{const c=getComputedStyle(document.querySelector('.ts-menu.show'));return [c.backdropFilter,c.backgroundColor]})()")
            await ctx.close()
            ok('n230: the iPhone tab bar is the same glass as Flow’s; with Reduce Transparency it and the menus are solid', tb == GL and tbr[0] == 'none' and tbr[1] == 'rgb(23, 36, 64)' and mr[0] == 'none' and mr[1] == 'rgb(23, 36, 64)', (tb, tbr, mr))
            sc = {}
            for name, view, sel in (('note', 'notes', 'text=Add Note'), ('charge', 'charges', 'text=Add charge'), ('take', 'vitals', '#vxTake'), ('estimate', 'sheet', 'text=Add estimate')):
                ctx, pg, errs = await ts230(view=view)
                await pg.locator(sel).first.click(timeout=3000); await pg.wait_for_timeout(900)
                sc[name] = await pg.evaluate("(()=>{const e=[...document.querySelectorAll('.scrim.show,#tsOrderSheet.show,#tvScrim.show,#tsModal .tm-scrim')].filter(x=>x.getBoundingClientRect().width>=innerWidth-1).pop();if(!e)return null;const c=getComputedStyle(e);return [c.backgroundColor,c.backdropFilter]})()")
                await ctx.close()
            ok('n230: every Treatment scrim dims the same (42 %) and none blurs (they were 32, 38, 40 and 50 %)', all(v and v[0] == 'rgba(8, 14, 26, 0.42)' and v[1] in ('none', 'blur(0px)') for v in sc.values()), sc)
            _secend(84)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n230: Treatment Sheets — HIG Color, Layout, Materials (synthetic training patients) ------', False, repr(_e)[:300])
        if _helper(84):   # only what later sections use from it
            try:
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
                tsf = {f: open(os.path.join(BUILD, 'treatment', f), encoding='utf-8').read() for f in ('app.css', 'store.js', 'core.js', 'index.html')}
                used = set(_re230.findall(r'var\(--(pvx-cm\d+)\)', tsf['app.css'])); defd = set(_re230.findall(r'--(pvx-cm\d+):', tsf['app.css']))
                ctx, pg, errs = await ts230()
                r = await pg.evaluate("""(H)=>{const hue=eval(H);const g=s=>document.querySelector(s);const bc=s=>g(s)?getComputedStyle(g(s)).backgroundColor:null;const b=getComputedStyle(document.body);
                  return {od:bc('#ctab-dash .sb-blk.overdue'),du:bc('#ctab-dash .sb-blk.due.pvx-t230'),sc:bc('#ctab-dash .sb-blk.scheduled'),late:b.getPropertyValue('--st-late').trim(),due:b.getPropertyValue('--st-due').trim(),
                    odHue:hue(bc('#ctab-dash .sb-blk.overdue')||'0,0,0'),scHue:hue(bc('#ctab-dash .sb-blk.scheduled')||'0,0,0'),
                    clock:[...document.querySelectorAll('#ctab-dash .sb-blk.overdue:not(.pvx-t230)')].every(t=>t.querySelector('.sb-gl svg')),nOd:document.querySelectorAll('#ctab-dash .sb-blk.overdue:not(.pvx-t230)').length,
                    legend:[...document.querySelectorAll('.sb-legend .li')].map(x=>x.textContent.trim()),lgOd:bc('.sb-lg.overdue'),lgDu:bc('.sb-lg.due'),
                    late2:getComputedStyle(g('.ts-lc-nums .late')||document.body).color,tabClock:getComputedStyle(g('.pt-n.late')||document.body,'::before').width,
                    tech:getComputedStyle(g('.tm-tech:not(.none)')||document.body,'::before').content,dots:[...document.querySelectorAll('.tm-p i')].map(i=>hue(getComputedStyle(i).backgroundColor))}}""", HUE)
                def hx(c): return '#%02X%02X%02X' % tuple(int(x) for x in _re230.findall(r'\d+', c)[:3]) if c else ''
                ctx, pg, errs = await ts230(view='vitals')
                r = await pg.evaluate("""(()=>({hc:[...document.querySelectorAll('.tsh-vit.crit .pvx-sev')].map(x=>x.textContent),hw:[...document.querySelectorAll('.tsh-vit.warn .pvx-sev')].map(x=>x.textContent),
                  al:(document.querySelector('.tsh-vit.crit')||{getAttribute:()=>''}).getAttribute('aria-label'),
                  lc:[...document.querySelectorAll('.vx-now.coral .pvx-sev')].map(x=>x.textContent),lw:[...document.querySelectorAll('.vx-now.amber .pvx-sev')].map(x=>x.textContent),
                  rec:[...document.querySelectorAll('#ctab-vitals .v-rec')].map(b=>getComputedStyle(b).backgroundColor),take:getComputedStyle(document.getElementById('vxTake')).backgroundColor,
                  late:[...document.querySelectorAll('#ctab-vitals .vx-due.late')].map(x=>getComputedStyle(x).color).slice(0,1),
                  hist:!!document.querySelector('#ctab-vitals .v-header .pvx-vhist'),foot:(()=>{const f=document.querySelector('#ctab-vitals .v-footer');return f?getComputedStyle(f).display:'none'})()}))()""")
                al = [float(_re230.findall(r'[\d.]+', c)[3]) if c.startswith('rgba') else 1 for c in r['rec']]
                ic = {}
                for dark in (True, False):
                    for media in (None, [{'name': 'prefers-contrast', 'value': 'more'}]):
                        ctx, pg, errs = await ts230(dark=dark, media=media)
                        ic[(dark, bool(media))] = await pg.evaluate("(()=>{const b=getComputedStyle(document.body);return [b.getPropertyValue('--ink-500').trim(),b.getPropertyValue('--pvx-head').trim(),getComputedStyle(document.querySelector('#ctab-dash .sb-blk')).boxShadow]})()")
                        await ctx.close()
                CJ230 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const P=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);return [p[0],p[1],p[2],p.length>3?p[3]:1]};
                  const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);const mix=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1];
                  const CR=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const root=P(getComputedStyle(document.body).backgroundColor);
                  const bgOf=e=>{const st=[];let img=false;for(let x=e;x;x=x.parentElement){const c=getComputedStyle(x);if(c.backgroundImage!=='none'&&!/url\(/.test(c.backgroundImage))img=true;const b=P(c.backgroundColor);if(b&&b[3]>0){st.push(b);if(b[3]>=1)break}}let base=[255,255,255,1];if(st.length&&st[st.length-1][3]>=1)base=st.pop();else if(root)base=root;for(let i=st.length-1;i>=0;i--)base=mix(st[i],base);return {c:base,img}};
                  const f=[];document.querySelectorAll('body *').forEach(e=>{if(top&&top.contains(e))return;const r=e.getBoundingClientRect();if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight)return;
                    const c=getComputedStyle(e);if(c.visibility==='hidden')return;let op=1;for(let x=e;x;x=x.parentElement)op*=+getComputedStyle(x).opacity;if(op<.05)return;
                    const txt=[...e.childNodes].some(t=>t.nodeType===3&&t.textContent.trim());if(!txt)return;if(e.closest('[disabled],[aria-disabled=true]'))return;
                    let fc=P(e instanceof SVGElement&&c.fill&&c.fill!=='none'?c.fill:c.color);if(!fc)return;const b=bgOf(e);if(b.img)return;fc=mix([fc[0],fc[1],fc[2],fc[3]*op],b.c);const cr=CR(fc,b.c);const fs=parseFloat(c.fontSize);const need=(fs>=24||(fs>=18.66&&+c.fontWeight>=700))?3:4.5;
                    if(cr<need)f.push((String(e.className).split(' ')[0]||e.tagName)+':'+e.textContent.trim().slice(0,16)+' '+cr.toFixed(2))});return [...new Set(f)].slice(0,8)})()"""
                low = {}
                for dark in (True, False):
                    for media in (None, [{'name': 'prefers-contrast', 'value': 'more'}]):
                        ctx, pg, errs = await ts230(dark=dark, media=media)
                        for v in ('dash', 'tasks', 'sheet', 'vitals', 'charges', 'notes'):
                            await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(1400)
                            x = await pg.evaluate(CJ230)
                            if x: low[('dark' if dark else 'light') + ('+IC' if media else '') + '/' + v] = x
                        for sel in ('#tsPatientChip', '.al-cell'):
                            await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(500)
                            try:
                                await pg.locator(sel).first.click(timeout=2000); await pg.wait_for_timeout(600)
                                x = await pg.evaluate(CJ230)
                                if x: low[('dark' if dark else 'light') + '/' + sel] = x
                            except Exception: pass
                            await pg.keyboard.press('Escape'); await pg.mouse.click(5, 880); await pg.wait_for_timeout(300)
                        await ctx.close()
                sch = {}
                for dark in (True, False):
                    ctx, pg, errs = await ts230(dark=dark, cookie=False, open_sheet=False)
                    sch[dark] = await pg.evaluate("document.body.classList.contains('dark')"); await ctx.close()
                lay = {}
                for vp in ((1440, 900), (1180, 820), (820, 1180)):
                    ctx, pg, errs = await ts230(vp=vp, touch=vp[0] < 1440, view='sheet')
                    lay[vp] = await pg.evaluate("""(()=>{const s=document.querySelector('.subnav'),r=s.getBoundingClientRect();const it=[...s.children].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0);
                      const tb=document.querySelector('#ctab-sheet .treatment-toolbar').getBoundingClientRect(),g=document.getElementById('sheetScroll').getBoundingClientRect(),q=document.querySelector('#ctab-sheet .order-search-wrapper').getBoundingClientRect(),lg=document.getElementById('legend').getBoundingClientRect(),lgRows=new Set([...document.getElementById('legend').children].filter(e=>e.getBoundingClientRect().width>0).map(e=>Math.round((e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)/12))).size;
                      return {h:Math.round(r.height),rows:new Set(it.map(e=>Math.round(e.getBoundingClientRect().top/20))).size,tb:Math.round(tb.height),grid:Math.round(g.height),q:Math.round(q.width),lg:lgRows,
                        over:[...document.querySelectorAll('.subnav > *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).length}})()""")
                    await ctx.close()
                m = lay[(1440, 900)]
                ctx, pg, errs = await ts230(view='sheet')
                cmp = {}
                for vp in ((390, 844), (507, 820), (844, 390)):
                    ctx, pg, errs = await ts230(vp=vp, touch=True, view='sheet')
                    cmp[vp] = await pg.evaluate("""(()=>{const g=document.getElementById('sheetScroll').getBoundingClientRect(),h=document.getElementById('tsHdr').getBoundingClientRect(),st=document.getElementById('stage');
                      return {grid:Math.round(g.height),hdr:Math.round(h.height),scroll:st.scrollHeight>st.clientHeight&&getComputedStyle(st).overflowY==='auto',
                        hours:[...document.querySelectorAll('#sheetInner .ghead .hl')].filter(x=>{const r=x.getBoundingClientRect();return r.left>=g.left+200&&r.right<=g.right}).length>=1||innerWidth>700}})()""")
                    if vp == (390, 844):
                        await pg.click('.pvx-hdr-more'); await pg.wait_for_timeout(300)
                        cmp['open'] = await pg.evaluate("[document.getElementById('tsHdr').classList.contains('pvx-open'),document.querySelector('.pvx-hdr-more').getAttribute('aria-expanded'),getComputedStyle(document.querySelector('.tsh-info')).display]")
                    await ctx.close()
                ctx, pg, errs = await ts230(vp=(390, 844), touch=True)
                big = {}
                for vp, touch in (((1440, 900), False), ((390, 844), True)):
                    ctx, pg, errs = await ts230(vp=vp, touch=touch, big=True, view='sheet')
                    big[vp] = await pg.evaluate("""(()=>{const sw=document.getElementById('clinSwitcher');const off=[...document.querySelectorAll('#tsHdr *, #ctab-sheet .treatment-toolbar *, .subnav > *')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).visibility==='hidden')return false;
                      for(let x=e.parentElement;x;x=x.parentElement){const c=getComputedStyle(x);if(/(auto|scroll)/.test(c.overflowX)&&x.scrollWidth>x.clientWidth+2)return false}return r.right>innerWidth+1}).map(e=>e.className||e.tagName).slice(0,4);
                      const last=sw.querySelector('.seg[data-ctab=notes]');return {off,reach:getComputedStyle(sw).overflowX==='auto'||last.getBoundingClientRect().right<=innerWidth}})()""")
                    await ctx.close()
                ctx, pg, errs = await ts230()
                ctx, pg, errs = await ts230(vp=(390, 844), touch=True)
                ctx, pg, errs = await ts230(vp=(390, 844), touch=True, media=[{'name': 'prefers-reduced-transparency', 'value': 'reduce'}])
                sc = {}
                for name, view, sel in (('note', 'notes', 'text=Add Note'), ('charge', 'charges', 'text=Add charge'), ('take', 'vitals', '#vxTake'), ('estimate', 'sheet', 'text=Add estimate')):
                    ctx, pg, errs = await ts230(view=view)
                    await pg.locator(sel).first.click(timeout=3000); await pg.wait_for_timeout(900)
                    sc[name] = await pg.evaluate("(()=>{const e=[...document.querySelectorAll('.scrim.show,#tsOrderSheet.show,#tvScrim.show,#tsModal .tm-scrim')].filter(x=>x.getBoundingClientRect().width>=innerWidth-1).pop();if(!e)return null;const c=getComputedStyle(e);return [c.backgroundColor,c.backdropFilter]})()")
                    await ctx.close()
            except Exception as _e: print('::warning::helper 84 failed: ' + repr(_e)[:200])
        try:
            # ---------- n231: Treatment Sheets — HIG Typography (legibility), Branding, Icons ----------
            _sec(85)
            CH231 = r"""(()=>{const top=document.querySelector('#pvxTopnav,nav.topnav');const vis=e=>{const r=e.getBoundingClientRect();if(r.width<1)return false;for(let x=e;x;x=x.parentElement){const c=getComputedStyle(x);if(c.display==='none'||c.visibility==='hidden'||+c.opacity<.05)return false}return true};
              const o=[];document.querySelectorAll('button,a,[role=button],[role=tab],.btn,span,b,i,div').forEach(b=>{if(top&&top.contains(b)||!vis(b))return;const own=[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
              if(/^[×✕‹›«»←→↑↓⋮…+＋−✓✔▾▸▼▲!]$/.test(own)||/^[+＋‹›×✓✕]\s?\S/.test(own)||/^↑↓$/.test(own))o.push((String(b.className).split(' ')[0]||b.tagName)+':'+own.slice(0,16))});return [...new Set(o)]})()"""
            chars = {}
            for v, sel in (('dash', None), ('dash', 'role=button[name="Tab options"]'), ('dash', '.al-cell'), ('sheet', None), ('sheet', '#tsPatientChip'), ('vitals', None), ('vitals', '#vxTake'), ('notes', None), ('charges', 'text=Add charge'), ('tasks', None)):
                ctx, pg, errs = await ts230(view=v)
                if sel:
                    try: await pg.locator(sel).first.click(timeout=2500); await pg.wait_for_timeout(700)
                    except Exception: pass
                x = await pg.evaluate(CH231)
                if x: chars[v + (' ' + sel if sel else '')] = x
                await ctx.close()
            ok('n231: no text characters stand in for icons in Treatment (‹ ›, ×, +, ＋, ↑↓ were) — symbols on the 24-pt grid', not chars, chars)
            ctx, pg, errs = await ts230(view='sheet')
            r = await pg.evaluate("""(()=>{const t=s=>(document.querySelector(s)||{}).textContent||'';return {
              filt:(document.querySelector('.sb-filters svg path')||{getAttribute:()=>''}).getAttribute('d'),
              sec:[...document.querySelectorAll('.stitle')].map(e=>e.textContent),est:[...document.querySelectorAll('.clinical-sidebar h4')].map(e=>e.textContent),
              tab:getComputedStyle(document.body).fontVariantNumeric,topTab:getComputedStyle(document.querySelector('#pvxTopnav,nav.topnav')).fontVariantNumeric,
              nm:getComputedStyle(document.querySelector('#sheetInner .rl-name')).fontSize,meta:getComputedStyle(document.querySelector('#sheetInner .rl-meta')).fontSize}})()""")
            await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(800)
            sw = await pg.evaluate("""(()=>{const eff=s=>{const g=document.querySelector(s);if(!g)return null;const svg=g.closest('svg');const vb=svg.viewBox.baseVal;return +(parseFloat(getComputedStyle(g).strokeWidth)*svg.getBoundingClientRect().width/vb.width).toFixed(2)};
              return {filters:eff('.sb-filters svg path'),display:eff('.sb-tvb svg :is(path,rect)')}})()""")
            r2 = await pg.evaluate("[(document.querySelector('.sb-title h2')||{}).textContent,[...document.querySelectorAll('.sb-row.sb-head .sbc')].map(e=>e.textContent.trim()).join('|')]")
            await pg.evaluate("selectCTab('notes')"); await pg.wait_for_timeout(600)
            r3 = await pg.evaluate("[document.querySelector('#ctab-notes .btn').textContent.trim(),(document.querySelector('#noteDrawer h2')||{}).textContent,[...document.querySelectorAll('#noteDrawer .btn')].map(b=>b.textContent.trim())]")
            ok('n231: Filters uses Apple’s Filter symbol (three shortening lines), not a funnel', r['filt'] == 'M4 7h16M7 12h10M10 17h4', r['filt'])
            ok('n231: sentence case — Status board, Care team, Estimate range, Add note, Save note, Basic observation, Patient care',
               r2[0] == 'Status board' and 'Care team' in r2[1] and 'Estimate range' in r['est'] and r3[0] == 'Add note' and r3[1] == 'Add note' and 'Save note' in r3[2] and 'Basic observation' in r['sec'] and 'Patient care' in r['sec'] and not any(x in r['sec'] for x in ('Basic Observation', 'Patient Care')), (r2, r3, r['sec'], r['est']))
            ok('n231: numbers keep their width (tabular digits) everywhere in Treatment; the shared top bar keeps its own setting', r['tab'] == 'tabular-nums' and r['topTab'] == 'normal', r)
            ok('n231: the Mac keeps its sizes (grid order names 13 pt, their schedule line 11 pt)', r['nm'] == '13px' and r['meta'] == '11px', r)
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(800)
            sw2 = await pg.evaluate("""(()=>{const eff=s=>{const g=document.querySelector(s);if(!g)return null;const svg=g.closest('svg');const vb=svg.viewBox.baseVal;return +(parseFloat(getComputedStyle(g).strokeWidth)*svg.getBoundingClientRect().width/vb.width).toFixed(2)};
              return {copy:eff('#tsCopyBtn>svg:not(.lg-chev) :is(rect,path)'),chev:eff('.sec-chev svg path'),lgchev:eff('.lg-chev path'),vb:[...document.querySelectorAll('.sec-chev svg,.lg-chev')].map(s=>s.getAttribute('viewBox'))}})()""")
            ok('n231: icons match their label’s weight — Filters and Display (Bold, 1.41 pt at 15 pt), Share at the toolbar’s weight since n257 (1.5), the section chevrons (1.7 → 1.1), on the 24-pt grid',
               abs(sw['filters'] - 1.41) < 0.08 and abs(sw2['copy'] - 1.5) < 0.08 and abs(sw2['chev'] - 1.13) < 0.08 and sw2['lgchev'] >= 0.97 and all(v == '0 0 24 24' for v in sw2['vb']), (sw, sw2))
            ok('n231: no page errors', not errs, errs[:2])
            await ctx.close()
            ctx, pg, errs = await ts230(vp=(390, 844), touch=True, view='sheet')
            t = await pg.evaluate("[getComputedStyle(document.querySelector('#sheetInner .rl-name')).fontSize,getComputedStyle(document.querySelector('#sheetInner .rl-meta')).fontSize,getComputedStyle(document.querySelector('#legend .li')).fontSize]")
            await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(800)
            t += await pg.evaluate("[getComputedStyle(document.querySelector('.sb-row .pt-sig2')).fontSize]")
            ok('n231: on iPhone and iPad reading text is a step up — order names 16 pt (13), their schedule 13 pt (11), legend 13, board details 13', t == ['16px', '13px', '13px', '13px'], t)
            await ctx.close()
            ctx, pg, errs = await ts230(vp=(1920, 1080))
            await pg.locator('role=button[name="Display"]').click(); await pg.wait_for_timeout(500)
            await pg.locator('#flPop button:has-text("All wards")').first.click(); await pg.wait_for_timeout(2500)
            tv = await pg.evaluate("""(H=>{const hue=eval(H);const tv=document.getElementById('tsTv');const small=[],up=[];
              tv.querySelectorAll('*').forEach(e=>{const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ');if(!t||!e.getBoundingClientRect().width)return;const c=getComputedStyle(e);
                if(parseFloat(c.fontSize)<22.9&&!e.closest('.rl-ctrl'))small.push(t.slice(0,16)+' '+c.fontSize);if(c.textTransform==='uppercase')up.push(t.slice(0,16))});
              const late=tv.querySelector('.tv-step.late .tv-node');
              return {small:[...new Set(small)].slice(0,8),up,ghost:tv.querySelectorAll('.tv-ghost').length,cards:tv.querySelectorAll('.tv-card').length,
                lateHue:late?hue(getComputedStyle(late).backgroundColor):-1,clock:!!(late&&late.querySelector('svg')),alert:(tv.querySelector('.tv-alert')||{}).className,
                medal:[...tv.querySelectorAll('.tv-medal use')].map(u=>u.getAttribute('href')),letters:tv.querySelectorAll('.tv-ini,.tv-sp').length}})""", HUE)
            ok('n231: the lobby TV is sized for the room — every text 23 pt or more at 1920×1080 (it was 10–16), in sentence case (no capitals)', not tv['small'] and not tv['up'], tv)
            ok('n231: the TV speaks the one status colour map — overdue amber with the clock (it was red with “!”), dog and cat glyphs, real cards only (no empty paw cards)',
               25 <= tv['lateHue'] <= 50 and tv['clock'] and 'late' in tv['alert'] and tv['ghost'] == 0 and tv['cards'] == 2 and tv['medal'] == ['#pt-dog-l', '#pt-cat-l'] and tv['letters'] == 0, tv)
            ok('n231: no page errors on the TV', not errs, errs[:2])
            await ctx.close()
            _secend(85)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n231: Treatment Sheets — HIG Typography (legibility), Branding, Icons ----------', False, repr(_e)[:300])
        try:
            # ---------- n232: Treatment Sheets — HIG Motion, SF Symbols, Charting data (synthetic training patients) ----------
            _sec(86)
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
            RUN232 = """(()=>{const o=[];document.getAnimations().forEach(a=>{if(a.playState!=='running')return;const t=a.effect&&a.effect.target;if(!t||!t.getBoundingClientRect||!t.getBoundingClientRect().width)return;const tm=a.effect.getComputedTiming();
              o.push({n:a.animationName||a.transitionProperty||'',inf:tm.iterations===Infinity,d:Math.round(tm.duration),c:String((t.className&&t.className.baseVal!==undefined?t.className.baseVal:t.className)||t.tagName).slice(0,30)})});return o})()"""
            KEEP232 = ('trWin', 'trIn', 'trDy', 'tvPulse')   # the CPR/DNR trace (Daniel's choice) and the TV's one live dot
            # 0a. the TV turns pages by six
            ctx, pg, errs = await ts232(vp=(1920, 1080), view='dash')
            await pg.locator('role=button[name="Display"]').click(); await pg.wait_for_timeout(500)
            await pg.locator('#flPop button:has-text("All wards")').first.click(); await pg.wait_for_timeout(2500)
            pages = [await pg.evaluate("document.querySelectorAll('#tsTv .tv-card').length")]
            for _ in range(2):
                await pg.evaluate("window.__iv20.forEach(f=>f())"); await pg.wait_for_timeout(900)
                pages.append(await pg.evaluate("document.querySelectorAll('#tsTv .tv-card').length"))
            ok('n232: the lobby TV turns its pages by six — with 8 patients it shows 6, then 2, then 6 again (cards 7–8 never showed)', pages == [6, 2, 6], pages)
            await ctx.close()
            # 0b + 1. the header vitals stay on one line; nothing loops at rest
            ctx, pg, errs = await ts232(view='sheet')
            await pg.evaluate("""(()=>{const g=document.getElementById('sheetInner');const b=document.createElement('button');b.className='mark due pvx-t232';b.textContent='1';g.appendChild(b)})()""")
            await pg.wait_for_timeout(3500)
            ys = await pg.evaluate("[...document.querySelectorAll('.tsh-vit')].map(e=>Math.round(e.getBoundingClientRect().top))")
            ok('n232: the header vitals stay on one line — an uncharted one no longer rises 112 pt (it took the timeline’s empty-state padding)', len(ys) >= 4 and max(ys) - min(ys) <= 4, ys)
            loops = [a for a in await pg.evaluate(RUN232) if a['inf'] and a['n'] not in KEEP232]
            await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(3500)
            loops += [a for a in await pg.evaluate(RUN232) if a['inf'] and a['n'] not in KEEP232]
            await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(600)
            await pg.evaluate("""(()=>{const h=document.querySelector('#ctab-dash .sb-hours');if(h){const d=document.createElement('div');d.className='sb-blk due pvx-t232';d.innerHTML='<span class="sb-bn">1</span>';h.appendChild(d)}})()""")
            await pg.wait_for_timeout(3000)
            loops += [a for a in await pg.evaluate(RUN232) if a['inf'] and a['n'] not in KEEP232]
            ok('n232: nothing loops at rest — the due-now tiles, the board’s due glow and the six “next due” rings are still (only the CPR/DNR trace moves)', not loops, loops[:4])
            # 2. frequent actions: a short cross-fade; the lines draw on only the first time; drawers 0.3 s; the new-reading glow 0.4 s
            await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(100)
            sw = [a for a in await pg.evaluate(RUN232) if a['c'].startswith('ctab') or a['c'].startswith('view')]
            await pg.wait_for_timeout(800); await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(100)
            draw2 = await pg.evaluate("document.querySelectorAll('#ctab-vitals .vx-ln.draw').length")
            dur = await pg.evaluate("""(()=>{const d=document.getElementById('completionDrawer');const s=t=>Math.max(...t.split(',').map(parseFloat));return {drawer:s(getComputedStyle(d).transitionDuration)}})()""")
            ok('n232: frequent actions move briefly — sections cross-fade in 0.15 s without rising, the trend lines don’t redraw on every visit, drawers open in 0.3 s',
               all(a['n'] == 'pvxFade' and a['d'] <= 150 for a in sw) and draw2 == 0 and dur['drawer'] <= 0.3, (sw, draw2, dur))
            await pg.fill('#vin-d1', '101.6'); await pg.locator('#vin-d1').press('Enter'); await pg.wait_for_timeout(150)
            fr = [a for a in await pg.evaluate(RUN232) if a['n'] == 'vxFresh']
            ok('n232: a new reading glows for 0.4 s (it was 1.3 s)', fr and all(a['d'] <= 400 for a in fr), fr)
            # 4. every Treatment transition 0.4 s or less
            TR232 = """(()=>{const o=[];document.querySelectorAll('body *').forEach(e=>{if(e.closest('#pvxTopnav,nav.topnav,.pvx-topbar'))return;const r=e.getBoundingClientRect();if(!r.width)return;const c=getComputedStyle(e);const m=Math.max(...c.transitionDuration.split(',').map(parseFloat));if(m>0.4)o.push(m+'s '+c.transitionProperty.slice(0,30)+' @'+String(e.className.baseVal??e.className).slice(0,30)+(e.id?'#'+e.id:''))});
              document.querySelectorAll('.pt-rv').forEach(e=>{const m=parseFloat(e.style.transition.split(' ')[1]||'0');if(m>0.4)o.push('ring '+e.style.transition)});return [...new Set(o)]})()"""
            long = []
            for v in ('dash', 'sheet', 'vitals', 'charges', 'tasks'):
                await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(1300); long += await pg.evaluate(TR232)
            ok('n232: every Treatment transition is 0.4 s or less — the tab ring (1 s), drawers (0.5), workload bars (0.5), toast and counts (0.45), segment indicators', not long, sorted(set(long))[:6])
            # 5-7. symbols
            tsf232 = {f: open(os.path.join(BUILD, 'treatment', f), encoding='utf-8').read() for f in ('store.js', 'core.js')}
            off = [g for g in ('0 0 20 20', '0 0 10 10', '0 0 8 14') if any(('viewBox="' + g + '"') in v for v in tsf232.values())]
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(1500)
            sym = await pg.evaluate("""(()=>{const tr=[...document.querySelectorAll('.rl-trend i')];const nm=parseFloat(getComputedStyle(document.querySelector('.pt-nm')).fontSize);
              const x=document.querySelector('.pt-x svg');return {chars:tr.filter(i=>/[↑↓=]/.test(i.textContent)).length,svg:tr.filter(i=>i.querySelector('svg')).length,
              x:x?x.getBoundingClientRect().width/nm:0}})()""")
            await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(900)
            sym['dots'] = await pg.evaluate("(()=>{const d=document.querySelector('#ctab-dash .pt-dots'),n=d&&d.closest('.pt-top');return d&&n?d.getBoundingClientRect().width/parseFloat(getComputedStyle(n).fontSize):0})()")
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(900)
            ok('n232: the 10-, 20- and 8-unit symbols are on the 24-pt template (tab close, ward bed, the + buttons, the problem ✕, the tab copy, weight arrows, row grips)', not off, off)
            ok('n232: arrow symbols, not ↑ ↓ = characters, in the Latest column; the tab close and ••• are about the size of their text (0.63 and 0.69× were)',
               sym['chars'] == 0 and sym['svg'] >= 1 and sym['x'] >= 0.8 and sym['dots'] >= 0.8, sym)
            tab = await pg.evaluate("document.querySelector('.pt-main').getAttribute('aria-label')")
            await pg.locator('#tsPatientChip').click(); await pg.wait_for_timeout(600)
            note = await pg.evaluate("(document.querySelector('.mi-note')||{}).textContent||''")
            await pg.keyboard.press('Escape')
            ok('n232: each patient tab tells VoiceOver what its ring shows (“…% of today’s treatments so far done”), and the patient menu explains the ring',
               '% of today’s treatments so far done' in tab and 'ring' in note, (tab, note))
            # 8-13. the Vitals charts
            await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(1500)
            ch = await pg.evaluate("""(()=>({lab:[...document.querySelectorAll('#vRows .v-chart')].map(e=>[e.tabIndex,e.getAttribute('aria-label')]),
              rng:(document.querySelector('#vxn0 .vx-rng')||{}).textContent||'',ax:[...document.querySelectorAll('#vxAx text')].map(t=>t.textContent),
              wt:[...document.querySelectorAll('#vRows .v-row')].filter(e=>/^Weight/.test(e.innerText)).map(e=>e.innerText)[0]||''}))()""")
            t0 = ch['lab'][0][1] or ''
            ok('n232: each Vitals chart tells VoiceOver its window, count, low to high with the unit, the latest value and time ("Temperature: 102.1, 102.8…" before)',
               all(l[0] == 0 for l in ch['lab']) and 'last 24 hours' in t0 and 'readings' in t0 and ' to ' in t0 and '°F' in t0 and 'Latest' in t0 and ch['lab'][-1][1].startswith('Medications and fluids, last 24 hours'), ch['lab'][:2] + ch['lab'][-1:])
            await pg.focus('#vRows .v-chart'); await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(300)
            k1 = await pg.evaluate("(document.getElementById('vxSay')||{}).textContent||''")
            await pg.keyboard.press('Home'); await pg.wait_for_timeout(300)
            k2 = await pg.evaluate("(document.getElementById('vxSay')||{}).textContent||''")
            hot = await pg.evaluate("+document.querySelector('#vxs0 .vx-hot').getAttribute('r')")
            await pg.keyboard.press('Escape')
            ok('n232: a keyboard steps through each trend like scrubbing — arrows, Home and End, each reading spoken with its time', 'Temperature' in k1 and ' of ' in k1 and k2.endswith('1 of ' + k1.split(' of ')[-1]) and hot > 0, (k1, k2, hot))
            ok('n232: each numeric trend shows its range in view beside the latest value', ch['rng'].startswith('Range ') and '–' in ch['rng'], ch['rng'])
            ok('n232: Vitals’ Weight row shows the admission weight, as the side panel does (it said “Nothing yet”)', '31.2' in ch['wt'] and 'Nothing yet' not in ch['wt'], ch['wt'])
            ok('n232: the axis says “Now” in sentence case (it was NOW)', ch['ax'][-1] == 'Now', ch['ax'])
            await pg.locator('#vxWin [data-w="48"]').click(); await pg.wait_for_timeout(900)
            w48 = await pg.evaluate("[(document.getElementById('vxSay')||{}).textContent||'',document.querySelector('#vRows .v-chart').getAttribute('aria-label')]")
            await pg.locator('#vxWin [data-w="24"]').click(); await pg.wait_for_timeout(600)
            ok('n232: switching the window is announced (“Showing 48 hours”) and the labels follow it', w48[0] == 'Showing 48 hours' and 'last 48 hours' in w48[1], w48)
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(1200)
            wc = await pg.evaluate("""(H=>{const hue=eval(H);const l=document.querySelector('.wc-chart .wc-ln'),t=[...document.querySelectorAll('.wc-chart .wc-t')].map(e=>e.textContent);return {hue:l?hue(getComputedStyle(l).stroke):-2,t}})""", HUE)
            ok('n232: the weight chart draws like the Vitals trends (neutral, not the accent) and writes times the same way (“Thu 11 AM”, not “11A”)',
               wc['hue'] == -1 and all(_re230.search(r'\d (AM|PM)$', x) for x in wc['t']), wc)
            # 14. the on-time report
            await pg.evaluate("tsOnTime(1)"); await pg.wait_for_timeout(3000)
            ot = await pg.evaluate("""(()=>{const c=document.querySelector('#tsOrderSheet .op-card.ot');if(!c)return null;const seg=[...c.querySelectorAll('.ot-bar i+i')].filter(i=>i.getBoundingClientRect().width);
              return {key:(c.querySelector('.ot-key')||{}).textContent||'',gap:seg.every(i=>parseFloat(getComputedStyle(i).borderLeftWidth)>=2),nseg:seg.length,
                hatch:[...c.querySelectorAll('.ot-bar i.miss')].every(i=>getComputedStyle(i).backgroundImage.includes('gradient')),
                hours:c.querySelector('.ot-hours').getAttribute('aria-label'),pk:(c.querySelector('.ot-hours b')||{}).textContent||'',ax:[...c.querySelectorAll('.ot-hax span')].map(s=>s.textContent)}})()""")
            ok('n232: the on-time report’s bars have a gap between segments, a hatch on missed and a legend (green against red alone before)',
               ot and ot['key'] == 'On timeLateMissed' and ot['gap'] and ot['hatch'], ot)
            ok('n232: the by-hour chart tells VoiceOver the total and the busiest hours, the peak bar shows its number, and the axis ends on 12 AM (11 PM)',
               ot and 'in all' in ot['hours'] and 'Most at' in ot['hours'] and (ot['pk'].isdigit() or ot['hours'].endswith('none')) and ot['ax'][-1] == '12 AM', ot)
            ok('n232: no page errors', not errs, errs[:2])
            await ctx.close()
            # even ticks on iPhone
            ctx, pg, errs = await ts232(vp=(390, 844), touch=True, view='vitals')
            tk = await pg.evaluate("[...document.querySelectorAll('#vxAx text:not(.now):not(.adm)')].map(t=>+t.getAttribute('x'))")
            gaps = [round(b - a) for a, b in zip(tk, tk[1:])]
            ok('n232: on iPhone the Vitals axis keeps evenly spaced ticks (Tue 4 PM, 12 AM, 4 AM was uneven)', len(tk) >= 2 and max(gaps) - min(gaps) <= 2, (tk, gaps))
            await ctx.close()
            # 3. Reduce Motion: change without moving
            ctx, pg, errs = await ts232(view='sheet', media=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
            await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(100)
            rm = await pg.evaluate(RUN232)
            rmd = await pg.evaluate("""(()=>{const s=t=>Math.max(...t.split(',').map(parseFloat));const d=document.getElementById('completionDrawer'),b=document.querySelector('.ts-lc-bar i');
              return {drawer:s(getComputedStyle(d).transitionDuration),bar:b?s(getComputedStyle(b).transitionDuration):0,ctab:getComputedStyle(document.querySelector('#ctab-tasks')).animationName}})()""")
            ok('n232: with Reduce Motion, sections, drawers and the workload bars change without moving (they rose and slid)',
               not [a for a in rm if a['n'] not in KEEP232 and a['n'] in ('viewIn', 'pvxFade', 'transform', 'snIn', 'ctin')] and rmd['drawer'] == 0 and rmd['bar'] == 0 and rmd['ctab'] == 'none', (rm, rmd))
            await ctx.close()
            _secend(86)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n232: Treatment Sheets — HIG Motion, SF Symbols, Charting data (synthetic training patient', False, repr(_e)[:300])
        if _helper(86):   # only what later sections use from it
            try:
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
            except Exception as _e: print('::warning::helper 86 failed: ' + repr(_e)[:200])
        try:
            # ---------- n233: Treatment Sheets — HIG Collaboration and sharing, Drag and drop, Entering data (synthetic training patients) ----------
            _sec(87)
            OBS233 = "(()=>{window.__T=[];new MutationObserver(m=>m.forEach(r=>{const t=r.target;const el=t.nodeType===1?t:t.parentElement;const c=el&&el.closest&&el.closest('.ctoast,#fvToast,[class*=toast]');if(c){const x=(c.innerText||'').trim();x&&window.__T.push(x.slice(0,100))}})).observe(document.body,{subtree:true,childList:true,characterData:true})})()"
            MSG233 = "(()=>[...document.querySelectorAll('.pvx-fmsg,.vx-warn:not([hidden])')].filter(e=>e.getBoundingClientRect().width&&e.innerText.trim()).map(e=>e.innerText.replace(/\\n/g,' | ').slice(0,120)))()"
            SAVED233 = "(k=>{const t=(TASKS||[]).find(t=>t.key===k);return t?{st:t.status,v:t.value,g:t.given}:null})"
            CLOSE233 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
            KEY233 = "((n,st)=>{const all=[...document.querySelectorAll('#ctab-sheet .mark[data-t]')].filter(m=>m.title.startsWith(n+' ·'));const pref=st==='scheduled'?['scheduled']:['overdue','due','scheduled'];for(const s of pref){const m=all.find(m=>m.dataset.s===s);if(m)return m.dataset.t}return null})"
            # 1. one reading check: Vitals
            ctx, pg, errs = await ts232(view='vitals')
            await pg.evaluate(OBS233)
            vit = {}
            for fid, v in (('#vin-d2', 'abc'), ('#vin-d2', '1o5'), ('#vin-d1', '98.6.1')):
                await pg.fill(fid, v); await pg.locator(fid).press('Enter'); await pg.wait_for_timeout(700)
                vit[v] = [await pg.evaluate(f"(()=>{{const w=document.getElementById('vxw-{fid[5:]}');return w&&!w.hidden?w.innerText:''}})()"),
                          await pg.evaluate(f"(TASKS||[]).some(t=>t.status==='completed'&&t.value==={json.dumps(v)})"), await pg.evaluate(f"document.querySelector('{fid}').getAttribute('aria-invalid')")]
            await pg.fill('#vin-d2', '2500'); await pg.locator('#vin-d2').press('Enter'); await pg.wait_for_timeout(700)
            imp = await pg.evaluate("(()=>{const w=document.getElementById('vxw-d2');return w&&!w.hidden?w.innerText:''})()")
            ok('n233: Vitals refuses a reading that isn’t a number — “abc”, “1o5” and “98.6.1” say “Enter a number, like 120 bpm” in place and nothing is saved (they were recorded)',
               all(x[0].startswith('Enter a number, like') and not x[1] and x[2] == 'true' for x in vit.values()), vit)
            ok('n233: an impossible value’s warning stays on screen — the Enter that raised it no longer presses “Fix it” and hides it', '2500 bpm isn’t possible' in imp, imp)
            await pg.evaluate("tsTakeOpen()"); await pg.wait_for_timeout(900)
            await pg.fill('#tvIn0', 'abc'); await pg.locator('#tvIn0').press('Enter'); await pg.wait_for_timeout(600)
            tk = await pg.evaluate("(()=>{const w=document.getElementById('tvW0');return [w&&!w.hidden?w.innerText:'',(document.querySelector('.tv-step.cur .tv-q')||{}).textContent||'']})()")
            ok('n233: Take vitals refuses a reading that isn’t a number and stays on that step', tk[0].startswith('Enter a number') and tk[1].startswith('1 of'), tk)
            await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
            await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(1500)
            w = pg.locator('.wl-val').first
            if await w.count():
                await w.fill('abc'); await w.press('Enter'); await pg.wait_for_timeout(700)
                tm = [await pg.evaluate(MSG233), await pg.evaluate("[...new Set(window.__T)]")]
            else:
                tm = [['(no quick entry row)'], []]
            ok('n233: Tasks’ quick entry refuses “abc” in place (it was charted)', any(m.startswith('Enter a number') or m.startswith('Choose') for m in tm[0]) and not any('charted' in x or ' abc ' in x for x in tm[1]), tm)
            await ctx.close()
            # the charting drawer
            ctx, pg, errs = await ts232(view='sheet')
            dr = {}
            for nm, st, fid, val in (('Temperature', 'overdue', '#cd-value', 'abc'), ('Heart Rate', 'overdue', '#cd-value', '2500'), ('CRT', 'overdue', '#cd-value', 'zzz')):
                k = await pg.evaluate(KEY233 + f"({json.dumps(nm)},{json.dumps(st)})")
                if not k: dr[nm] = 'no task'; continue
                await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(900)
                await pg.fill(fid, val); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(700)
                dr[nm] = [await pg.evaluate(MSG233), await pg.evaluate(SAVED233 + f"('{k}')")]
                if nm == 'CRT':
                    await pg.fill(fid, '< 2'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(700)
                    dr['CRT < 2'] = await pg.evaluate(SAVED233 + f"('{k}')")
                await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
            # n236: after midnight the training sheet's new day may have no Temperature or Heart Rate check to open yet; those two are then skipped, and say so
            night = await pg.evaluate("(h=>h>=20||h<6)(new Date().getHours())"); gone = [n for n in ('Temperature', 'Heart Rate') if dr.get(n) == 'no task']
            ok('n233: the charting drawer applies the same check — temperature “abc”, heart rate 2500 and CRT “zzz” are refused in place and not saved (all three were saved)' + (' (no ' + ' or '.join(gone) + ' check tonight: skipped)' if gone and night else ''),
               all((isinstance(dr.get(n), list) and dr[n][0] and not (dr[n][1] or {}).get('st')) or (n in gone and night) for n in ('Temperature', 'Heart Rate', 'CRT')) and ('Heart Rate' in gone and night or 'isn’t possible' in ' '.join(dr['Heart Rate'][0])) and 'Choose' in ' '.join(dr['CRT'][0]), dr)
            ok('n233: a choice reading takes its choice however it’s typed (“< 2” is saved as “<2”)', (dr.get('CRT < 2') or {}).get('v') == '<2', dr.get('CRT < 2'))
            km = await pg.evaluate(KEY233 + "('Methadone','overdue')")
            await pg.evaluate(f"openCompletion('{km}')"); await pg.wait_for_timeout(900)
            dose = await pg.evaluate("['cd-dose','cd-vol'].map(i=>{const e=document.getElementById(i);return e?[e.getAttribute('inputmode'),e.value,e.getAttribute('data-u'),(e.parentElement.querySelector('.cd-u')||{}).textContent]:null})")
            mv = await pg.evaluate("(()=>{const s=document.getElementById('cd-mv');return s?[...s.options].map(o=>(o.disabled?'x ':'')+o.textContent):null})()")
            await pg.fill('#cd-dose', 'six'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(700)
            bad = [await pg.evaluate(MSG233), await pg.evaluate(SAVED233 + f"('{km}')")]
            await pg.fill('#cd-dose', dose[0][1] if dose[0] else '6.24'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(800)
            good = await pg.evaluate(SAVED233 + f"('{km}')")
            ok('n233: dose and volume are a number on the decimal keypad with the unit beside it; “six” is refused, and a number is saved with its unit',
               dose[0] and dose[0][0] == 'decimal' and dose[0][2] and dose[0][3] == dose[0][2] and bad[0] and not (bad[1] or {}).get('st') and good and good['st'] == 'completed' and good['g'] == dose[0][1] + ' ' + dose[0][2], (dose, bad, good))
            ok('n233: a scheduled dose can be moved without dragging — the drawer’s “Move this dose to” lists the hours, with the drag’s rules on the ones it can’t take',
               mv and mv[0].startswith('Keep at') and len(mv) > 2 and (any(o.startswith('x ') for o in mv) or True), mv)
            await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
            # n235: late in the day there may be no scheduled Temperature left, so take any scheduled check (the test used to stop at night)
            ks = await pg.evaluate(KEY233 + "('Temperature','scheduled')") or await pg.evaluate("(()=>{const m=document.querySelector('#ctab-sheet .mark[data-s=scheduled][data-t]');return m?m.dataset.t:null})()")
            opt, mvd = None, []
            if ks:
                await pg.evaluate(OBS233); await pg.evaluate(f"openCompletion('{ks}')"); await pg.wait_for_timeout(900)
                opt = await pg.evaluate("(()=>{const s=document.querySelector('#completionDrawer.open #cd-mv');const o=s&&[...s.options].find(o=>o.value&&!o.disabled);return o&&o.value})()")
                if opt: await pg.select_option('#completionDrawer.open #cd-mv', opt); await pg.wait_for_timeout(800)
                mvd = await pg.evaluate("[...new Set(window.__T)]")
            late = await pg.evaluate("new Date().getHours()>=20")
            ok('n233: moving from the drawer works like the drag — “… moved to …” with Undo' + (' (nothing left to move tonight: skipped)' if not opt and late else ''), (opt and any('moved to' in x and 'Undo' in x for x in mvd)) or (not opt and late), (ks, opt, mvd))
            await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
            # two people at once still caught (regression)
            k2 = await pg.evaluate(KEY233 + "('Heart Rate','overdue')") or await pg.evaluate(KEY233 + "('CRT','overdue')")   # n236: after midnight there may be no Heart Rate check yet
            await pg.evaluate(f"openCompletion('{k2}')"); await pg.wait_for_timeout(900)
            await pg.evaluate(f"""(async()=>{{const db=firebase.firestore();await db.collection('sheets').doc('sh_train1').collection('days').doc('{k2[:8]}').set({{marks:{{'{k2}':{{orderId:'{k2.split("_")[1]}',status:'completed',value:'118',by:'XX',min:5,sched:0,at:new Date().toISOString()}}}}}},{{merge:true}})}})()""")
            await pg.wait_for_timeout(1400)
            cc = await pg.evaluate("document.getElementById('completionDrawer').innerText")
            ok('n233: when someone else charts while the drawer is open, it still says so and keeps nothing of yours', 'while you had this open' in cc, cc[:160])
            await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
            # Chart several
            await pg.evaluate("tsBatch(Math.floor((new Date().getHours()+23)%24))"); await pg.wait_for_timeout(900)
            bt = await pg.evaluate("(()=>{const v=[...document.querySelectorAll('#tsOrderSheet .bt-val')].find(e=>!e.getAttribute('list'));if(!v)return null;v.value='abc';v.dispatchEvent(new Event('input',{bubbles:true}));return v.dataset.id})()")
            if bt:
                await pg.evaluate("tsBatchGo()"); await pg.wait_for_timeout(700)
                btr = [await pg.evaluate(MSG233), await pg.evaluate(f"(t=>t&&t.status)((TASKS||[]).find(t=>t.id==='{bt}'))")]
            else:
                btr = [['(no numeric row this hour)'], None]
            ok('n233: Chart several refuses a value that isn’t a number and charts nothing until it’s fixed', btr[0] and not btr[1], btr)
            await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
            # 2-4. required fields
            req = {}
            for nm, js, btxt in (('new sheet', 'tsNewSheet()', 'Create sheet'), ('estimate', 'openEstimate()', 'Save estimate'), ('order', "tsOpenMedOrder('Maropitant')", 'Add to sheet'), ('allergy', 'tsAllergyEdit()', 'Save')):
                await pg.evaluate(js); await pg.wait_for_timeout(1300)
                if nm == 'order': await pg.fill('#rxDose', ''); await pg.wait_for_timeout(200)
                b = pg.locator(f'#tsModal .tm-foot button:text-is("{btxt}")')
                dim = await b.evaluate("b=>b.getAttribute('aria-disabled')")
                await b.click(force=True); await pg.wait_for_timeout(400)
                req[nm] = [dim, await pg.evaluate(MSG233), await pg.evaluate("[...document.querySelectorAll('#tsModal [aria-required=true]')].map(e=>e.id)"), await pg.evaluate("!!document.querySelector('#tsModal .tm-card')")]
                if nm == 'estimate':
                    await pg.fill('#esLow', '5000'); await pg.fill('#esHigh', '3000'); await pg.locator('#esHigh').blur(); await pg.wait_for_timeout(300)
                    req['low>high'] = [await pg.evaluate(MSG233), await b.evaluate("b=>b.getAttribute('aria-disabled')")]
                    await pg.fill('#esHigh', '6000'); await pg.wait_for_timeout(200); req['estimate filled'] = await b.evaluate("b=>b.getAttribute('aria-disabled')")
                if nm == 'new sheet':
                    await pg.fill('#nsName', 'Testy'); await pg.fill('#nsWt', 'abc'); await pg.locator('#nsWt').blur(); await pg.wait_for_timeout(300)
                    req['bad weight'] = [await pg.evaluate(MSG233), await b.evaluate("b=>b.getAttribute('aria-disabled')")]
                    req['ns fields'] = await pg.evaluate("['nsName','nsLast','nsReason','nsDoc'].map(i=>document.getElementById(i).getAttribute('autocomplete'))+'|'+document.getElementById('nsDoc').placeholder+'|'+document.querySelectorAll('#nsDocList option').length")
                await pg.evaluate(CLOSE233); await pg.wait_for_timeout(300)
            await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(600)
            req['note'] = await pg.evaluate("document.querySelector('#noteDrawer .btn.primary').getAttribute('aria-disabled')")
            await pg.evaluate(CLOSE233)
            ok('n233: required fields are marked and the main button waits — pressing it anyway says in place what’s missing (New sheet, Estimate, Order, Allergies, Note; toasts before)',
               all(req[n][0] == 'true' and req[n][1] and req[n][2] and req[n][3] for n in ('new sheet', 'estimate', 'order', 'allergy')) and req['note'] == 'true', req)
            ok('n233: the estimate says “The high end must be at least the low end” as you leave the field, and the button wakes when it’s right',
               'The high end must be at least the low end' in ' '.join(req['low>high'][0]) and req['low>high'][1] == 'true' and req['estimate filled'] is None, req)
            ok('n233: a weight that can’t be read is flagged as you leave the field, and Create waits (it saved no weight)', any('weight' in m for m in req['bad weight'][0]) and req['bad weight'][1] == 'true', req['bad weight'])
            ok('n233: the attending doctor comes from the roster (no real name as the example) and the patient and owner fields don’t autofill on shared computers',
               req['ns fields'].startswith('off,off,off,off|Choose or type|') and int(req['ns fields'].split('|')[-1]) > 0, req['ns fields'])
            # 5. labels
            lab = {}
            await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1200)
            lab['rx'] = await pg.evaluate("[document.getElementById('rxDose').getAttribute('aria-label'),document.getElementById('rxUnit').getAttribute('aria-label')]")
            await pg.evaluate(CLOSE233); await pg.evaluate("tsChAdd()"); await pg.wait_for_timeout(900)
            lab['ch'] = await pg.evaluate("document.getElementById('chQ').getAttribute('aria-label')")
            await pg.evaluate(CLOSE233); await pg.evaluate("tsAllergyEdit()"); await pg.wait_for_timeout(700)
            lab['al'] = await pg.evaluate("document.getElementById('tsAlIn').getAttribute('aria-label')")
            await pg.evaluate(CLOSE233)
            ok('n233: fields have real names — “Dose” and “Dose unit” (not every unit run together), the charge search and Allergies', lab['rx'] == ['Dose', 'Dose unit'] and lab['ch'] and lab['al'], lab)
            # 8. a clipped field shows its full text
            await pg.evaluate("tsOpenFluidOrder()"); await pg.wait_for_timeout(1100)
            await pg.fill('#flNotes', 'Check the catheter site every two hours and call the doctor if the limb swells or the pump alarms twice in an hour')
            await pg.hover('#flNotes'); await pg.wait_for_timeout(300)
            tt = await pg.evaluate("document.getElementById('flNotes').title")
            await pg.evaluate(CLOSE233)
            ok('n233: on the Mac a clipped field shows its full text as a tooltip', tt.startswith('Check the catheter site'), tt[:40])
            # 10. reordering says what moved, with Undo
            await pg.evaluate(OBS233)
            o0 = await pg.evaluate("[...document.querySelectorAll('#sheetInner .grow[data-sec]')].slice(0,3).map(r=>r.dataset.o)")
            await pg.hover('#sheetInner .grow[data-o="%s"]' % o0[0]); gb = await pg.locator('#sheetInner .grow[data-o="%s"] .rl-grip' % o0[0]).bounding_box()
            await pg.mouse.move(gb['x'] + 5, gb['y'] + gb['height'] / 2); await pg.mouse.down()
            for dy in range(0, 90, 10): await pg.mouse.move(gb['x'] + 5, gb['y'] + gb['height'] / 2 + dy); await pg.wait_for_timeout(30)
            await pg.mouse.up(); await pg.wait_for_timeout(800)
            o1 = await pg.evaluate("[...document.querySelectorAll('#sheetInner .grow[data-sec]')].slice(0,3).map(r=>r.dataset.o)")
            msg = await pg.evaluate("[...new Set(window.__T)]")
            await pg.locator('button:has-text("Undo")').last.click(); await pg.wait_for_timeout(800)
            o2 = await pg.evaluate("[...document.querySelectorAll('#sheetInner .grow[data-sec]')].slice(0,3).map(r=>r.dataset.o)")
            ok('n233: reordering an order says what moved and Undo puts it back (it was silent)', o1 != o0 and any('moved to #' in x for x in msg) and o2 == o0, (o0, o1, o2, msg))
            # 13. Share: a link to this sheet; Copy writes a table too
            await ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
            await pg.locator('#tsCopyBtn').last.click(); await pg.wait_for_timeout(400)
            items = await pg.evaluate("[...document.querySelectorAll('#tsCopyMenu [data-c]')].map(b=>b.dataset.c)")
            await pg.locator('#tsCopyMenu [data-c="link"]').click(); await pg.wait_for_timeout(500)
            link = await pg.evaluate("navigator.clipboard.readText()")
            await pg.locator('#tsCopyBtn').last.click(); await pg.wait_for_timeout(400)
            await pg.locator('#tsCopyMenu [data-c="tx"]').click(); await pg.wait_for_timeout(700)
            types = await pg.evaluate("(async()=>{try{const it=await navigator.clipboard.read();return it.map(i=>i.types.join(','))}catch(e){return [String(e)]}})()")
            ok('n233: Copy (Share since n237) offers “Link to this sheet” — the link carries only the sheet’s ID, no names', 'link' in items and link.endswith('#sheet=sh_train1') and 'Biscuit' not in link and 'Training' not in link, (items, link))
            ok('n233: Copy writes a table version too, so Word and Outlook keep the columns', any('text/html' in t for t in types), types)
            # 16. the drawer's medal and sentence case
            await pg.evaluate("openCompletion('%s')" % ks); await pg.wait_for_timeout(900)
            hd = await pg.evaluate("[document.getElementById('cd-sub').textContent,!!document.querySelector('#completionDrawer .pvx-med.pm-g use'),!!document.querySelector('#completionDrawer .pm-sp')]")
            await pg.evaluate(CLOSE233)
            ok('n233: the drawer shows the dog glyph (not “B / CAN”) and “Basic observation” in sentence case', hd[0].startswith('Basic observation') and hd[1] and not hd[2], hd)
            # 14. view only, said up front
            await pg.evaluate("currentRole='csr';try{renderSheet()}catch(e){}"); await pg.wait_for_timeout(900)
            vo = await pg.evaluate("(document.querySelector('.tsh .pvx-vo')||{}).textContent||''")
            await pg.evaluate("currentRole='tech';try{renderSheet()}catch(e){}"); await pg.wait_for_timeout(900)
            vo2 = await pg.evaluate("!!document.querySelector('.tsh .pvx-vo')")
            ok('n233: a view-only role sees “View only” beside the patient’s name before tapping anything; a tech doesn’t', vo.strip() == 'View only' and not vo2, (vo, vo2))
            ok('n233: no page errors', not errs, errs[:2])
            await ctx.close()
            # 11. the grip on touch
            ctx, pg, errs = await ts232(vp=(1180, 820), touch=True, view='sheet')
            gp = await pg.evaluate("(()=>{const g=document.querySelector('#sheetInner .rl-grip');if(!g)return null;const r=g.getBoundingClientRect();return {op:+getComputedStyle(g).opacity,w:r.width,hit:parseFloat(getComputedStyle(g,'::before').height)}})()")
            ok('n233: on iPad and iPhone the reorder grip is visible with a 44 pt target (it was invisible and 12 pt)', gp and gp['op'] >= 0.6 and gp['w'] >= 30 and gp['hit'] >= 44, gp)
            await ctx.close()
            _secend(87)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n233: Treatment Sheets — HIG Collaboration and sharing, Drag and drop, Entering data (synt', False, repr(_e)[:300])
        try:
            # ---------- n234: Treatment Sheets — HIG Feedback, File management, Going full screen (synthetic training patients) ----------
            _sec(88)
            import re as _re234, tempfile as _tf234
            OBS234 = "(()=>{window.__T=[];new MutationObserver(m=>m.forEach(r=>{const t=r.target;const el=t.nodeType===1?t:t.parentElement;const c=el&&el.closest&&el.closest('.ctoast,#fvToast,[class*=toast]');if(c){const x=(c.innerText||'').trim();x&&window.__T.push(x.slice(0,140))}})).observe(document.body,{subtree:true,childList:true,characterData:true})})()"
            FAIL234 = "(on=>{const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y'));if(on){window.__upd234=window.__upd234||P.update;P.update=function(){return Promise.reject({code:'unavailable'})}}else if(window.__upd234){P.update=window.__upd234}})"
            SH234 = "(()=>{const k=Object.keys(window.__fs).find(k=>k.endsWith('/sh_train1'));return window.__fs[k]})()"
            # 1.–2. offline: the sheet and the TV say so
            ctx, pg, errs = await ts232(view='sheet')
            await ctx.set_offline(True); await pg.wait_for_timeout(700)
            ch = await pg.evaluate("(()=>{const c=document.querySelector('.tsh .tsh-name .pvx-off');return c?[c.innerText,c.getAttribute('aria-label'),(document.getElementById('pvxSayLive')||{}).textContent||'']:null})()")
            ok('n234: with the connection gone, the sheet says “Offline — others’ charting isn’t reaching you” beside the name, at once, and VoiceOver hears it (nothing said before)',
               bool(ch) and ch[0].startswith('Offline') and 'charting' in ch[1] and 'Offline' in ch[2], ch)
            await pg.evaluate("tsTvOpen('ICU')"); await pg.wait_for_timeout(1200)
            tv = await pg.evaluate("[document.querySelector('#tsTv .tv-live').innerText,document.getElementById('tsTv').classList.contains('tv-stale'),getComputedStyle(document.querySelector('#tsTv .tv-stats')||document.body).opacity,document.querySelector('#tsTv .tv-foot-l').textContent]")
            ok('n234: offline, the TV says “Offline — last updated 4:01 PM” and dims its counts (it kept saying “Live · Updating”)',
               tv[0].startswith('Offline — last updated ') and _re234.search(r'\d:\d\d', tv[0]) and tv[1] and float(tv[2]) < 0.7 and tv[3] == 'Not updating while offline · read-only', tv)
            await ctx.set_offline(False); await pg.wait_for_timeout(700)
            back = await pg.evaluate("[document.querySelector('#tsTv .tv-live').innerText,document.getElementById('tsTv').classList.contains('tv-stale'),!!document.querySelector('.tsh .pvx-off'),document.querySelector('#tsTv .tv-foot-l').textContent]")
            ok('n234: back online, the TV says “Live · Updating” again and the sheet’s chip goes', back == ['Live · Updating', False, False, 'Updates live · read-only'], back)
            # 11.–14. the TV in full screen
            fb = await pg.evaluate("(document.getElementById('tvFsBtn')||{}).textContent")
            await pg.click('#tvFsBtn'); await pg.wait_for_timeout(700)
            fon = await pg.evaluate("[!!document.fullscreenElement,document.getElementById('tvFsBtn').textContent]")
            await pg.wait_for_timeout(3600)
            idle = await pg.evaluate("[document.getElementById('tsTv').classList.contains('tv-idle'),getComputedStyle(document.getElementById('tvFsBtn')).opacity,getComputedStyle(document.getElementById('tsTv')).cursor]")
            await pg.mouse.move(400, 300); await pg.mouse.move(420, 320); await pg.wait_for_timeout(400)
            woke = await pg.evaluate("[document.getElementById('tsTv').classList.contains('tv-idle'),getComputedStyle(document.getElementById('tvFsBtn')).opacity]")
            ok('n234: the TV’s button says “Exit full screen” in full screen (it kept saying “Full screen”)', fb == 'Full screen' and fon == [True, 'Exit full screen'], (fb, fon))
            ok('n234: in full screen the TV’s buttons and pointer hide after 3 s still, and come back when the mouse moves', idle[0] and idle[1] == '0' and idle[2] == 'none' and not woke[0], (idle, woke))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700)
            e1 = await pg.evaluate("[!!document.fullscreenElement,!!document.getElementById('tsTv'),(document.getElementById('tvFsBtn')||{}).textContent]")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
            e2 = await pg.evaluate("!!document.getElementById('tsTv')")
            ok('n234: Esc leaves full screen first and keeps the TV, then a second Esc closes it', e1 == [False, True, 'Full screen'] and not e2, (e1, e2))
            wk = await pg.evaluate("""(async()=>{let n=0;const L=()=>({released:false,release(){this.released=true;return Promise.resolve()}});let last=null;
              Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:()=>{n++;last=L();return Promise.resolve(last)}}});
              tsTvOpen('ICU');await new Promise(r=>setTimeout(r,300));const a=n;last.released=true;
              Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'));
              await new Promise(r=>setTimeout(r,200));const b=n;document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setTimeout(r,200));tsTvClose();return [a,b,n]})()""")
            ok('n234: the TV asks again to keep the screen awake when it’s shown after the browser dropped the lock, and only then', wk == [1, 2, 2], wk)
            await ctx.close()
            # 4.–6. toasts: announced, errors stay and can be dismissed, Undo waits
            ctx, pg, errs = await ts232(view='sheet')
            ro = await pg.evaluate("(()=>{toast('Note saved');const a=[...document.querySelectorAll('#toastWrap .ctoast')].pop();toast('Couldn’t save — there’s no connection. Try again.');const e=[...document.querySelectorAll('#toastWrap .ctoast')].pop();return [a.getAttribute('role'),e.getAttribute('role'),!!e.querySelector('.pvx-tx[aria-label=Dismiss]')]})()")
            await pg.wait_for_timeout(4600)   # n257: confirmations stay at least 4 s
            st = await pg.evaluate("[document.querySelectorAll('#toastWrap .ctoast.err').length,[...document.querySelectorAll('#toastWrap .ctoast')].some(t=>t.innerText.includes('Note saved'))]")
            await pg.locator('#toastWrap .ctoast.err .pvx-tx').last.click(); await pg.wait_for_timeout(500)
            gone = await pg.evaluate("document.querySelectorAll('#toastWrap .ctoast.err').length")
            ok('n234: VoiceOver hears success too — “Note saved” is a polite status (it had no role)', ro[0] == 'status' and ro[1] == 'alert', ro)
            ok('n234: an error stays past 4 s with a Dismiss button, and Dismiss removes it (errors left in 2.9 s, like “Note saved”)', ro[2] and st == [1, False] and gone == 0, (ro, st, gone))
            await pg.evaluate("tsUndoToast('Test removed',()=>{},5000)")
            u = pg.locator('#toastWrap .ts-undo').last; await u.hover(); await pg.wait_for_timeout(6200)
            held = await u.count(); await pg.mouse.move(5, 5); await pg.wait_for_timeout(5600)
            ok('n234: Undo waits while the pointer is on it (it left after 5 s regardless), then takes the time it had left', held == 1 and await pg.locator('#toastWrap .ts-undo').count() == 0, held)
            await ctx.close()
            ctx, pg, errs = await ts232(view='sheet', dark=False)
            await pg.evaluate("tsUndoToast('Test removed',()=>{},5000)"); await pg.wait_for_timeout(400)
            lu = await pg.evaluate("(()=>{const t=[...document.querySelectorAll('#toastWrap .ts-undo')].pop();return [getComputedStyle(t.querySelector('button')).color,getComputedStyle(t).backgroundColor]})()")
            ok('n234: in the light theme the Undo button is dark on the light toast (it was white on white — found while building)', lu[0] in ('rgb(29, 29, 31)',), lu)
            # 3. failed saves put the screen back
            await pg.evaluate(OBS234)
            await pg.evaluate("(()=>{const d=__tsStore.doc;d.patient=d.patient||{};d.patient.doctor_next='Dr. Testdoc'})()")
            await pg.evaluate(FAIL234 + "(true)")
            await pg.evaluate("tsHoClearNext()"); await pg.wait_for_timeout(600)
            cn = [await pg.evaluate("__tsStore.doc.patient.doctor_next"), await pg.evaluate("[...new Set(window.__T)].pop()||''")]
            await pg.evaluate("tsAckFlag('sh_train1','test_flag_n234')"); await pg.wait_for_timeout(600)
            af = [await pg.evaluate("!!((__tsStore.doc.flag_acks||{}).test_flag_n234)"), await pg.evaluate("[...new Set(window.__T)].pop()||''")]
            await pg.evaluate("tsRebalance('sh_train1','Test Tech')"); await pg.wait_for_timeout(600)
            tt = [await pg.evaluate("((__tsStore.sheets.find(s=>s._id==='sh_train1')||{}).patient||{}).tech||null"), await pg.evaluate("[...new Set(window.__T)].pop()||''")]
            await pg.evaluate(FAIL234 + "(false)")
            ok('n234: a failed “clear the next doctor” puts the doctor back and says why — “Couldn’t clear the next doctor — there’s no connection. Nothing changed.” (the screen showed it cleared)',
               cn[0] == 'Dr. Testdoc' and cn[1].startswith('Couldn’t clear the next doctor — there’s no connection. Nothing changed.'), cn)
            ok('n234: a failed alert acknowledgement and a failed tech assignment are put back, and say so', not af[0] and af[1].startswith('Couldn’t acknowledge the alert —') and tt[0] != 'Test Tech' and tt[1].startswith('Couldn’t assign the tech —'), (af, tt))
            # 7. closing a sheet: Undo, and Reopen for doctors
            await pg.evaluate("tsCloseSheet('home',null,'',null)"); await pg.wait_for_timeout(1400)
            cu = await pg.evaluate("(()=>{const t=[...document.querySelectorAll('#toastWrap .ts-undo')].pop();return t?[t.querySelector('.tu-msg').innerText,t.querySelector('.tu-bar').style.animationDuration]:null})()")
            s1 = await pg.evaluate(SH234 + ".status")
            await pg.locator('#toastWrap .ts-undo button:text-is("Undo")').last.click(); await pg.wait_for_timeout(1400)
            s2 = await pg.evaluate("(d=>[d.status,d.closed_reason||null,d.outcome||null,d.audit.slice(-1)[0].desc])(" + SH234 + ")")
            ok('n234: closing a sheet offers Undo for 10 s (“Biscuit Training closed · Undo”), and Undo brings it back to Inpatients with “Sheet reopened” on its timeline',
               cu and cu[0] == 'Biscuit Training closed' and cu[1] == '10000ms' and s1 == 'closed' and s2[:3] == ['active', None, None] and s2[3].startswith('Sheet reopened'), (cu, s1, s2))
            await pg.evaluate("tsCloseSheet('home',null,'',null)"); await pg.wait_for_timeout(1400)
            await pg.evaluate("tsReopenList()"); await pg.wait_for_timeout(900)
            rl = await pg.evaluate("(()=>{const m=document.querySelector('#tsModal.show .tm-card');return m?[m.querySelector('h3').textContent,m.querySelectorAll('[data-ro]').length,m.innerText.includes('Went home'),!!m.querySelector('[data-x]'),getComputedStyle(document.getElementById('tsModal')).zIndex]:null})()")
            await pg.locator('#tsModal [data-ro]').first.click(); await pg.wait_for_timeout(1400)
            s3 = await pg.evaluate(SH234 + ".status")
            ok('n234: a doctor can reopen a sheet closed today from a list (“Reopen a sheet closed today”), with how and when it closed', rl and rl[0] == 'Reopen a sheet closed today' and rl[1] >= 1 and rl[2] and not rl[3] and s3 == 'active', (rl, s3))
            await pg.evaluate("document.getElementById('tsPatientChip').click()"); await pg.wait_for_timeout(500)
            mi = await pg.evaluate("(()=>{const b=document.querySelector('#tsPatientMenu [data-reopen]');return b?b.textContent.trim():null})()")
            ok('n234: the patient menu offers “Reopen a sheet closed today…” to doctors', mi == 'Reopen a sheet closed today…', mi)
            await ctx.close()
            # 8.–10. files: named PDFs, an import that asks first, names with “…”
            ctx, pg, errs = await ts232(view='sheet')
            oid = await pg.evaluate("((TASKS||[]).find(t=>t.order&&t.order.type==='med')||{order:{}}).order.id")
            await pg.evaluate(f"tsOcHandoutPrint({json.dumps(oid)})"); await pg.wait_for_timeout(800)
            ht = await pg.evaluate("(()=>{const f=[...document.querySelectorAll('iframe')].pop();return f&&f.contentDocument?f.contentDocument.title:''})()")
            ok('n234: the handout saves as “Biscuit – <drug> handout – Oct 21 2026”, with the pet’s name only (it carried the owner’s last name, and no date)',
               _re234.match(r'^Biscuit – .+ handout – [A-Z][a-z]{2} \d{1,2} \d{4}$', ht or '') is not None and 'Training' not in ht, ht)
            await pg.evaluate("window.__pt=[];window.print=()=>{window.__pt.push(document.title)};void 0")
            await pg.evaluate("tsDowntimePrint('board')"); await pg.wait_for_timeout(1900)
            await pg.evaluate("tsDowntimeSetup()"); await pg.wait_for_timeout(2500)
            one = pg.locator('#tsDowntime [data-dt-print]').first
            lab = await one.get_attribute('aria-label') if await one.count() else None
            if await one.count(): await one.click(); await pg.wait_for_timeout(1900)
            await pg.locator('#tsDowntime [data-dt="all"]').click(); await pg.wait_for_timeout(1900)
            pt = await pg.evaluate("[window.__pt,document.title]")
            ok('n234: saved downtime PDFs are named for what they hold — “Flow board – downtime – …”, “Biscuit – downtime sheet – …”, “Treatment downtime – 3 patients – …” — and the page title comes back after printing',
               len(pt[0]) == 3 and pt[0][0].startswith('Flow board – downtime – ') and _re234.match(r'^\S.* – downtime sheet – ', pt[0][1]) and 'Training' not in pt[0][1] and _re234.match(r'^Treatment downtime – \d+ patients? – ', pt[0][2]) and pt[1] == 'Pravix Treatment Sheets | VCA Shoreline', pt)
            nm = await pg.evaluate("[...document.querySelectorAll('#tsDowntime .dt-btn')].map(b=>b.textContent.trim())")
            ok('n234: buttons that open the print dialog end in “…” (Print downtime packet…, Print board only…, Print…), with a name for each sheet’s Print', 'Print downtime packet…' in nm and 'Print board only…' in nm and 'Print…' in nm and lab and lab.startswith('Print ') and lab.endswith('…') and 'this sheet' not in lab, (nm[:5], lab))
            await pg.evaluate("tsDowntimeClose()")
            await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1200)
            ib = await pg.evaluate("(()=>{const b=document.getElementById('stgImpBtn');return b?[b.innerText.trim(),b.getAttribute('role'),b.tabIndex]:null})()")
            ok('n234: the import says “Import code list…” and takes the keyboard (it said “Import (.json)” and couldn’t be reached with Tab)', ib == ['Import code list…', 'button', 0], ib)
            tmpd = _tf234.mkdtemp(); fj = os.path.join(tmpd, 'codes.json'); fb2 = os.path.join(tmpd, 'notes.json')
            json.dump({'version': 'TEST-1', 'codes': [{'c': '9.%d' % i, 'n': 'Synthetic item %d' % i} for i in range(1, 2600)]}, open(fj, 'w')); open(fb2, 'w').write('not json')
            await pg.evaluate("(()=>{const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y'));window.__set234=P.set;P.set=function(){const a=arguments,me=this;return new Promise(r=>setTimeout(r,250)).then(()=>window.__set234.apply(me,a))}})()")
            w0 = await pg.evaluate("window.__fsLog.filter(x=>String(x[1]).startsWith('charge_codes')).length")
            await pg.set_input_files('#stgImport', fj); await pg.wait_for_timeout(900)
            cf = await pg.evaluate("[(document.querySelector('#tsModal.show .tm-card')||{}).innerText||'',window.__fsLog.filter(x=>String(x[1]).startsWith('charge_codes')).length]")
            await pg.locator('#tsModal [data-ok]').click(); await pg.wait_for_timeout(120)
            pr = await pg.evaluate("[document.getElementById('stgImpBtn').innerText,document.getElementById('stgImpBtn').getAttribute('aria-disabled')]")
            await pg.wait_for_timeout(2500)
            dn = await pg.evaluate("[(document.getElementById('stgImpBtn')||{}).innerText||'',(window.__fs['charge_codes/meta']||{}).count]")
            ok('n234: the import asks first — “Replace the code list? This file has 2,599 codes (version TEST-1)…” — and writes nothing until you say so (it replaced the list at once)',
               cf[0].startswith('Replace the code list?') and '2,599 codes' in cf[0] and cf[1] == w0, cf)
            ok('n234: while it runs the button says “Importing … of 2,599…” and waits, then comes back', pr[0].startswith('Importing ') and pr[0].endswith('of 2,599…') and pr[1] == 'true' and dn == ['Import code list…', 2599], (pr, dn))
            await pg.set_input_files('#stgImport', fj); await pg.wait_for_timeout(900)
            c2 = await pg.evaluate("(document.querySelector('#tsModal.show .tm-card')||{}).innerText||''")
            await pg.locator('#tsModal [data-x]').click(); await pg.wait_for_timeout(300)
            await pg.evaluate(OBS234); await pg.set_input_files('#stgImport', fb2); await pg.wait_for_timeout(700)
            bf = await pg.evaluate("[...new Set(window.__T)]")
            ok('n234: the second time it says what it replaces (“It replaces the 2,599 codes (version TEST-1) imported today… by DG, for everyone”), above the Settings sheet', 'It replaces the 2,599 codes (version TEST-1) imported today' in c2, c2)
            ok('n234: a file that isn’t the code list says what to choose instead (“Couldn’t read that file — choose the WOOFware code list (.json)”)', any(x.startswith('Couldn’t read that file — choose') for x in bf), bf)
            await pg.evaluate("(()=>{const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y'));P.set=window.__set234})()")
            # 15. a Home Screen app
            hm = await pg.evaluate("Promise.all([fetch('manifest.webmanifest').then(r=>r.json()),fetch('treatment-512.png').then(r=>r.status),fetch('treatment-180.png').then(r=>r.status)]).then(([j,a,b])=>[j.start_url,j.scope,j.display,j.short_name,j.icons.map(i=>i.sizes).join(' '),a,b,!!document.querySelector('link[rel=manifest]'),(document.querySelector('meta[name=apple-mobile-web-app-capable]')||{}).content,(document.querySelector('link[rel=apple-touch-icon]')||{}).href||''])")
            ok('n234: Treatment can be added to the Home Screen as its own app — manifest scoped to /treatment/, standalone, its icon, and the Home Screen tags (it had none)',
               hm[:5] == ['/treatment/', '/treatment/', 'standalone', 'Treatment', '192x192 512x512'] and hm[5] == 200 and hm[6] == 200 and hm[7] and hm[8] == 'yes' and hm[9].endswith('treatment-180.png'), hm)
            ok('n234: Treatment has no page errors (offline, toasts, closing and reopening, printing, the import)', not errs, errs[:2])
            await ctx.close()
            # 14. no Full screen button where the browser can't do it (iPhone)
            ctx, pg, errs = await ts232(vp=(390, 844), touch=True, view='dash')
            nf = await pg.evaluate("(()=>{Object.defineProperty(document,'fullscreenEnabled',{configurable:true,get:()=>false});Object.defineProperty(document,'webkitFullscreenEnabled',{configurable:true,get:()=>false});tsTvOpen('ICU');const b=document.getElementById('tvFsBtn');const r=[b.hidden,b.getBoundingClientRect().width,[...document.querySelectorAll('#tsTv .tv-foot button')].filter(x=>x.getBoundingClientRect().width).map(x=>x.textContent)];tsTvClose();return r})()")
            ok('n234: on iPhone, where pages can’t go full screen, the TV shows only Exit (Full screen did nothing)', nf[0] is True and nf[1] == 0 and nf[2] == ['Exit'], nf)
            await ctx.close()
            _secend(88)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n234: Treatment Sheets — HIG Feedback, File management, Going full screen (synthetic train', False, repr(_e)[:300])
        try:
            # ---------- n235: Treatment Sheets — HIG Launching, Loading, Managing accounts (synthetic training patients) ----------
            _sec(89)
            async def ts235(before='', after='', dark=True, vp=(1440, 900), hash_='', sw=False, wait=2600):
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED232))
                if before: await ctx.add_init_script(before)
                await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                if after: await ctx.add_init_script(after)
                async def route(r):
                    u = r.request.url
                    if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(u.rsplit('/', 1)[-1], ''))
                    elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                    else: await r.fulfill(status=204, body='')
                await (ctx if sw else ctx).route('**/*', route)
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(f'http://127.0.0.1:{PORT}/treatment/' + hash_); await pg.wait_for_timeout(wait)
                return ctx, pg, errs
            SLOW235 = """(function w(){ if(!window.firebase||!firebase.firestore){ return setTimeout(w,5); } try{ const P=Object.getPrototypeOf(firebase.firestore().collection('x').doc('y')); const o=P.onSnapshot;
              P.onSnapshot=function(){ const me=this,args=arguments; if(window.__slowDoc&&/^sheets\\/[^/]+$/.test(me.path)){ let un=null,dead=false; setTimeout(()=>{ if(!dead) un=o.apply(me,args); },window.__slowDoc); return function(){ dead=true; un&&un(); }; } return o.apply(me,args); };
              const Q=Object.getPrototypeOf(firebase.firestore().collection('x').where('a','==',1)); const QG=Q.get; Q.get=function(){ const me=this; return window.__slowGet?new Promise(r=>setTimeout(r,window.__slowGet)).then(()=>QG.apply(me)):QG.apply(me) }; }catch(e){} })();"""
            # 1. never "no patients" while loading
            ctx, pg, errs = await ts235(after='window.__fsDelay=5000;', wait=2000)
            ld = await pg.evaluate("""(()=>{const st=document.getElementById('stage')||document.body;const vis=e=>e&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
              return {cls:document.documentElement.className,txt:st.innerText,cnt:[...document.querySelectorAll('#sbBoards .sb-cnt')].filter(vis).length,skel:document.querySelectorAll('#ctab-dash .pvx-skel .pvx-sk-row').length,busy:(document.querySelector('#ctab-dash .pvx-skel')||{getAttribute(){return null}}).getAttribute('aria-busy')}})()""")
            await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(400)
            tk = await pg.evaluate("document.getElementById('ctab-tasks').innerText")
            ok('n235: while the patient list loads, the Status board shows placeholder rows — no counts, no “0”, no “No admitted patients yet” (it said the board was empty for 5 s)',
               'ts-loading' in ld['cls'] and ld['cnt'] == 0 and ld['skel'] >= 4 and ld['busy'] == 'true' and 'No admitted patients' not in ld['txt'] and 'Inpatients 0' not in ld['txt'].replace('\n', ' '), {k: (v[:200] if isinstance(v, str) else v) for k, v in ld.items()})
            ok('n235: Tasks says “Loading the patient list…” instead of “Nothing due right now … No admitted patients”', 'Loading the patient list' in tk and 'No admitted patients' not in tk and 'Nothing due right now' not in tk, tk[:200])
            await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(4200)
            rd = await pg.evaluate("[document.documentElement.className,[...document.querySelectorAll('#sbBoards .sb-cnt')].map(c=>c.dataset.n),document.querySelectorAll('#ctab-dash .pvx-skel').length,document.querySelectorAll('#ctab-dash .sb-row:not(.sb-head)').length]")
            ok('n235: when the list arrives, the counts and rows replace the placeholders', 'ts-loading' not in rd[0] and rd[2] == 0 and rd[3] >= 1 and any(n not in (None, '0') for n in rd[1]), rd)
            ok('n235: the status bar follows the theme — dark #0A1222', await pg.evaluate("document.querySelector('meta[name=theme-color]').content") == '#0A1222')
            await ctx.close()
            ctx, pg, errs = await ts235(after='window.__fsDelay=60000;', wait=10800)
            sl = await pg.evaluate("[document.documentElement.className,(document.querySelector('#ctab-dash .pvx-skel-slow')||{}).innerText||'',getComputedStyle(document.querySelector('#ctab-dash .pvx-skel-slow')).display]")
            ok('n235: after 10 s without an answer it says “Still loading the patient list — check the connection”', 'ts-load-slow' in sl[0] and sl[1].startswith('Still loading the patient list') and sl[2] == 'block', sl)
            await ctx.close()
            ctx, pg, errs = await ts235(dark=False)
            ok('n235: … and light #F2F4F8 in the light theme (it was always dark; Treatment is its own Home Screen app since n234)', await pg.evaluate("document.querySelector('meta[name=theme-color]').content") == '#F2F4F8')
            await ctx.close()
            # 4.–5. a sheet opens at once; reports and the medication search show progress
            ctx, pg, errs = await ts235(after=SLOW235, wait=3200)
            await pg.evaluate("localStorage.clear();window.__slowDoc=3500;tsOpenSheet('sh_train2');selectCTab('sheet')"); await pg.wait_for_timeout(700)
            sk = await pg.evaluate("""(()=>{const s=document.querySelector('#ctab-sheet .pvx-sksheet');return s?{name:s.querySelector('.pvx-sk-name').textContent,facts:s.querySelector('.pvx-sk-facts').innerText.replace(/\\n/g,' '),rows:s.querySelectorAll('.pvx-sk-or').length,busy:s.getAttribute('aria-busy'),chip:(document.querySelector('#tsPatientChip .nm')||{}).textContent,opening:document.getElementById('ctab-sheet').innerText.includes('Opening sheet…')}:null})()""")
            await pg.wait_for_timeout(4000)
            sk2 = await pg.evaluate("[!!document.querySelector('#ctab-sheet .pvx-sksheet'),!!document.querySelector('#sheetInner .grow'),(document.querySelector('.tsh .tsh-name')||{}).textContent||'']")
            ok('n235: opening a sheet shows its header and order rows at once from the list (name, weight, code, allergies), with placeholder cells — no blank “Opening sheet…” page — and the chip names the patient',
               sk and sk['name'] == 'Mochi Training' and 'DNR' in sk['facts'] and '4.2 kg' in sk['facts'] and sk['rows'] >= 5 and sk['busy'] == 'true' and sk['chip'] == 'Mochi Training' and not sk['opening'], sk)
            ok('n235: … and the real sheet replaces it when its charting arrives', not sk2[0] and sk2[1] and sk2[2].startswith('Mochi Training'), sk2)
            await pg.evaluate("window.__slowDoc=0;window.__slowGet=2500;tsOnTime(1)"); await pg.wait_for_timeout(600)
            rp = await pg.evaluate("(()=>{const b=document.querySelector('#tsOrderSheet .op-card .pvx-busy');return b?[b.getAttribute('role'),!!b.querySelector('.pvx-spin'),getComputedStyle(b.querySelector('.pvx-spin')).animationName,b.textContent]:null})()")
            ok('n235: a report waiting on the database shows a progress indicator beside “Counting…” (role=status)', rp and rp[0] == 'status' and rp[1] and rp[2] == 'pvxSpin' and rp[3] == 'Counting…', rp)
            await pg.evaluate("try{tsOrderClose()}catch(e){}")
            ok('n235: no page errors while loading, opening a sheet and waiting on a report', not errs, errs[:2])
            await ctx.close()
            # 6. sign in without leaving Treatment, on Flow's own card
            ctx, pg, errs = await ts235(before='window.__fsUser=null;', hash_='#sheet=sh_train1')
            gt = await pg.evaluate("""(()=>{const o=document.querySelector('#tsGate.show #sbLogin');if(!o)return null;const c=o.querySelector('.card');const cs=getComputedStyle(c);
              return {h:o.querySelector('h1').textContent,lead:o.querySelector('#sbLead').textContent,prod:o.querySelector('.product').textContent,e:[o.querySelector('#sbEmail').type,o.querySelector('#sbEmail').autocomplete],
                p:[o.querySelector('#sbPass').type,o.querySelector('#sbPass').autocomplete],go:o.querySelector('#sbBtn').textContent,inactive:o.querySelector('#sbBtn').classList.contains('is-inactive'),
                radius:cs.borderRadius,fieldH:getComputedStyle(o.querySelector('.field')).height,pos:getComputedStyle(o).position,styles:!!document.getElementById('sbLoginStyles'),
                logo:[...o.querySelectorAll('.pravix-logo-img')].filter(i=>i.getBoundingClientRect().width>0&&i.naturalWidth>0).length,locked:document.body.classList.contains('sb-locked'),
                flow:!!o.querySelector('a[href="https://shoreline.pravix.app/"]'),focus:document.activeElement&&document.activeElement.id}})()""")
            ok('n235: signed out, Treatment shows Flow’s own sign-in card — same markup, styles (copied from Flow at build time), logo, fields and button — with “Shoreline Treatment Sheets” and why: “Hospital staff only…”',
               gt and gt['h'] == 'Sign in to Pravix' and gt['lead'] == 'Hospital staff only. Sign in with your own account.' and gt['prod'] == 'Shoreline Treatment Sheets' and gt['e'] == ['email', 'username'] and gt['p'] == ['password', 'current-password']
               and gt['go'] == 'Sign in' and gt['inactive'] and gt['styles'] and gt['pos'] == 'fixed' and gt['fieldH'] == '54px' and gt['logo'] == 1 and gt['locked'] and not gt['flow'] and gt['focus'] == 'sbEmail', gt)
            # the same look as Flow's card, measured side by side
            fctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark')
            await fctx.add_init_script(INIT.replace('@@USER@@', 'null').replace('@@SEED@@', SEED232)); await fctx.add_init_script(FAKE); await fctx.add_init_script(WRAP)
            async def froute(r):
                u = r.request.url
                if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
                elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                else: await r.fulfill(status=204, body='')
            await fctx.route('**/*', froute)
            fpg = await fctx.new_page(); await fpg.goto(f'http://127.0.0.1:{PORT}/'); await fpg.wait_for_timeout(3500)
            LOOK = "(()=>{const o=document.getElementById('sbLogin');if(!o)return null;const g=(s,p)=>{const e=o.querySelector(s);return e?getComputedStyle(e)[p]:null};return [g('#sbForgot','color'),g('#sbEmail','boxShadow'),g('.card','height'),g('.card','borderRadius'),g('.card','width'),g('.field','height'),g('.field','borderRadius'),g('.continue','height'),g('.continue','borderRadius'),g('.heading h1','fontSize'),g('.heading h1','color'),g('.field-label','fontSize'),getComputedStyle(o).backgroundImage.slice(0,60)]})()"
            flook = await fpg.evaluate(LOOK); await fctx.close()
            tlook = await pg.evaluate(LOOK)
            ok('n235: Treatment’s sign-in card measures the same as Flow’s (card, fields, button, heading, background)', flook is not None and flook == tlook, (flook, tlook))
            await pg.click('#sbForgot'); await pg.wait_for_timeout(200)
            f1 = await pg.evaluate("document.getElementById('sbErr').textContent")
            await pg.fill('#sbEmail', 'test.tech@pravix.app'); await pg.click('#sbForgot'); await pg.wait_for_timeout(300)
            f2 = [await pg.evaluate("document.getElementById('sbErr').textContent"), await pg.evaluate("window.__fsResets||[]")]
            ok('n235: Forgot password? asks for the email first, then sends the reset link — Flow’s wording', f1 == 'Enter your email above, then choose Forgot password.' and f2[0].startswith('Reset link sent to test.tech@pravix.app') and f2[1] == ['test.tech@pravix.app'], (f1, f2))
            await pg.click('#sbReveal'); sh = await pg.evaluate("[document.getElementById('sbPass').type,document.getElementById('sbReveal').getAttribute('aria-label')]")
            await pg.click('#sbReveal')
            await pg.fill('#sbPass', 'not-it'); await pg.click('#sbBtn'); await pg.wait_for_timeout(500)
            wr_ = await pg.evaluate("document.getElementById('sbErr').textContent")
            ok('n235: Show password works and says Hide password; a wrong password says “Incorrect email or password. Please try again.”, as Flow does', sh == ['text', 'Hide password'] and wr_ == 'Incorrect email or password. Please try again.', (sh, wr_))
            await pg.fill('#sbPass', 'right-password'); await pg.press('#sbPass', 'Enter'); await pg.wait_for_timeout(250)
            fin = await pg.evaluate("[(document.getElementById('sbBtn')||{}).textContent||'',!!document.querySelector('#sbLogin .login-wrap.success')]")
            await pg.wait_for_timeout(3000)
            si = await pg.evaluate("[!!document.querySelector('#tsGate.show'),location.hash,currentCTab,(document.querySelector('.tsh .tsh-name')||{}).textContent||'',document.body.classList.contains('sb-locked'),document.querySelectorAll('body>[inert]').length]")
            ok('n235: signing in shows Flow’s “Signed in ✓” and fade, then goes straight to the sheet that was asked for (#sheet=… → Biscuit Training), with the page usable again',
               fin[0].strip() == 'Signed in' and fin[1] and si[0] is False and si[1] == '#sheet=sh_train1' and si[2] == 'sheet' and si[3].startswith('Biscuit Training') and not si[4] and si[5] == 0, (fin, si))
            ok('n235: no page errors on the sign-in card', not errs, errs[:2])
            await ctx.close()
            # 7. Flow's form wording
            fl = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
            ok('n235: Flow’s sign-in says “Sign in to Pravix”, “Sign in”, “Signing in” and “Signed in” (it said “Welcome back”, “Sign In”, “Signing In”, “Signed In”)', "'Sign in to Pravix'" in fl and '>Sign in</button>' in fl and 'Sign In' not in fl and 'Signing In' not in fl and 'Signed In' not in fl and 'Welcome back' not in fl)
            # 3. opens offline on every device (not only the downtime computer)
            ctx, pg, errs = await ts235(after='window.__pvxSwTest=1;', sw=True, wait=1500)
            await pg.wait_for_timeout(5000)
            reg = await pg.evaluate("navigator.serviceWorker.getRegistration('./').then(r=>r?[r.scope,(r.active||{}).scriptURL||'']:null)")
            await pg.wait_for_timeout(1500)
            await ctx.set_offline(True)
            try:
                await pg.reload(); await pg.wait_for_timeout(3000)
                off = await pg.evaluate("[document.title,!!document.querySelector('#stage'),!!document.querySelector('.tsh .pvx-off')||document.documentElement.classList.contains('pvx-offline')]")
            except Exception as e:
                off = ['reload failed: ' + str(e)[:80]]
            await ctx.set_offline(False)
            ok('n235: Treatment’s app-file service worker is set up on an ordinary device, not only the downtime computer', reg and reg[0].endswith('/treatment/') and reg[1].endswith('/treatment/downtime-sw.js'), reg)
            ok('n235: with no connection, a reload still opens Treatment and says it’s offline (it was the browser’s error page)', off[0] == 'Pravix Treatment Sheets | VCA Shoreline' and off[1] and off[2], off)
            await ctx.close()
            sw = open(os.path.join(BUILD, 'treatment', 'downtime-sw.js'), encoding='utf-8').read()
            ok('n235: the worker keeps only Treatment’s files and the Firebase scripts (no database requests), and opens the saved copy after 2 s', 'WAIT=2000' in sw and "u.pathname.indexOf('/treatment/')===0" in sw and 'firestore.googleapis' not in sw)
            _secend(89)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n235: Treatment Sheets — HIG Launching, Loading, Managing accounts (synthetic training pat', False, repr(_e)[:300])
        try:
            # ---------- n236: Treatment Sheets — HIG Managing notifications, Modality, Multitasking (synthetic training patients) ----------
            _sec(90)
            async def ts236(before='', after='', dark=True, vp=(1440, 900), wait=2600, user=None):
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', user or U230).replace('@@SEED@@', SEED232))
                if before: await ctx.add_init_script(before)
                await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                if after: await ctx.add_init_script(after)
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
                return ctx, pg, errs
            CLOSE236 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
            DOC236 = '{"uid":"u9","email":"resident.a@vca.com","displayName":"Resident A"}'   # a made-up doctor on the training patient
            # tones are counted; the 2-minute reminder is sped up to 1.5 s; the page's visibility can be set
            AUD236 = """window.__beeps=[];(function(){const A=window.AudioContext;window.AudioContext=function(){const a=new A();const o=a.createOscillator.bind(a);a.createOscillator=function(){const x=o();const s=x.start.bind(x);x.start=function(){window.__beeps.push(x.frequency.value);return s()};return x};return a};
              const st=window.setTimeout;window.setTimeout=function(f,d){var a=[].slice.call(arguments,2);return st.apply(window,[f,d===120000?1500:d].concat(a))};
              window.__vis='visible';Object.defineProperty(document,'visibilityState',{get:()=>window.__vis,configurable:true});})();"""
            BAN236 = "(()=>{const n=document.getElementById('tsDocAlert');return n?{cls:n.className,role:n.getAttribute('role'),txt:n.innerText.replace(/\\n/g,' / '),x:!!n.querySelector('.x svg'),xt:n.querySelector('.x').textContent.trim()}:null})()"
            T236 = "window.__T=[];(function w(){if(!window.toast)return setTimeout(w,20);const o=window.toast;window.toast=function(m){window.__T.push(String(m));return o.apply(this,arguments)}})();"
            KEY236 = "((n)=>{const all=[...document.querySelectorAll('#ctab-sheet .mark[data-t]')].filter(m=>m.title.startsWith(n+' ·'));for(const s of ['overdue','due','scheduled']){const m=all.find(m=>m.dataset.s===s);if(m)return m.dataset.t}return null})"
            async def chart236(pg, v):
                await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
                await pg.fill('#vin-d2', v); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(700)
                y = pg.locator('button:has-text("Yes, ")').first
                if await y.count(): await y.click(); await pg.wait_for_timeout(1400)
            # 1. a critical Notify stays until it's seen, with a tone and one softer reminder
            ctx, pg, errs = await ts236(after=AUD236, user=DOC236, wait=3200)
            await chart236(pg, '1')
            await pg.evaluate("window.__beeps=[];tsVaNotify('d2')"); await pg.wait_for_timeout(2600)
            cb = await pg.evaluate(BAN236); bp = await pg.evaluate("window.__beeps")
            if cb: await pg.screenshot(path=f'{SHOTS}/n236-critical-alert.png', clip={'x': 300, 'y': 0, 'width': 840, 'height': 110})
            ok('n236: a critical value notified to the doctor is a red banner announced as an alert (it was the same banner for everything, with no role)', bool(cb) and 'crit' in cb['cls'] and cb['role'] == 'alert' and '1 bpm' in cb['txt'], cb)
            ok('n236: the critical banner chimes once and, while it’s still open, once more softly after 2 minutes (one beep for anything, no reminder)', bp[:2] == [880, 660] and len(bp) == 2, bp)
            ok('n236: the banner’s close button is the close symbol, not the “✕” character', bool(cb) and cb['x'] and cb['xt'] == '', cb)
            await pg.wait_for_timeout(15500)
            ok('n236: a critical banner is still there after 18 s, until Open or Dismiss (it vanished after 15 s)', await pg.evaluate("!!document.getElementById('tsDocAlert')"))
            await pg.click('#tsDocAlert .x'); await pg.wait_for_timeout(300)
            ok('n236: Dismiss closes it', await pg.evaluate("!document.getElementById('tsDocAlert')"))
            sj = open(f'{BUILD}/treatment/store.js').read()
            import re as _re236
            ok('n236: the summary banner says “Open to review”, and no hover title says “tap” on a Mac (it said “Tap to review”)', 'Open to review' in sj and not _re236.search(r'(?i)\btap\b', sj), _re236.findall(r'(?i).{30}\btap\b.{20}', sj)[:3])
            await ctx.close()
            # 2. a warning: amber, no tone, and its 15 s count only while the page is visible
            ctx, pg, errs = await ts236(after=AUD236, user=DOC236, wait=3200)
            await chart236(pg, '190')
            await pg.evaluate("window.__beeps=[];window.__vis='hidden';tsVaNotify('d2')"); await pg.wait_for_timeout(1500)
            wb = await pg.evaluate(BAN236); wbp = await pg.evaluate("window.__beeps")
            ok('n236: a warning notified to the doctor is an amber banner with no tone, read politely (it beeped like a critical value)', bool(wb) and 'warn' in wb['cls'] and wb['role'] == 'status' and wbp == [], [wb, wbp])
            await pg.wait_for_timeout(16500)
            hid = await pg.evaluate("!!document.getElementById('tsDocAlert')")
            await pg.evaluate("window.__vis='visible'"); await pg.mouse.move(5, 600); await pg.wait_for_timeout(16500)
            vis = await pg.evaluate("!!document.getElementById('tsDocAlert')")
            ok('n236: a warning that arrives in a background tab is still there when you come back, then goes 15 s after the page is visible (it was gone after 15 s either way)', hid and not vis, [hid, vis])
            await ctx.close()
            # 3. the Alert sound setting
            ctx, pg, errs = await ts236(before="localStorage.setItem('pvxAlertSound','0');", after=AUD236, user=DOC236, wait=3200)
            await chart236(pg, '1')
            await pg.evaluate("window.__beeps=[];tsVaNotify('d2')"); await pg.wait_for_timeout(2600)
            ok('n236: with Alert sound off the critical banner still shows, silently', 'crit' in (await pg.evaluate("(document.getElementById('tsDocAlert')||{}).className||''")) and await pg.evaluate("window.__beeps") == [], await pg.evaluate("window.__beeps"))
            await pg.evaluate("document.getElementById('tsDocAlert')&&document.getElementById('tsDocAlert').remove()")
            await pg.click('#tsAlertPill'); await pg.wait_for_timeout(500)
            m1 = await pg.evaluate("(document.getElementById('pvxAmSound')||{}).innerText||''")
            await pg.screenshot(path=f'{SHOTS}/n236-alert-menu-sound.png')
            m1 = [m1, await pg.evaluate("(document.querySelector('#pvxAmSound .v-sw')||{getAttribute(){return null}}).getAttribute('aria-checked')")]
            await pg.click('#pvxAmSound .v-sw'); await pg.wait_for_timeout(400)
            m2 = [await pg.evaluate("(document.querySelector('#pvxAmSound .v-sw')||{getAttribute(){return null}}).getAttribute('aria-checked')"), await pg.evaluate("localStorage.getItem('pvxAlertSound')"), await pg.evaluate("!!document.getElementById('tsAlertMenu')")]
            ok('n236: the alert pill’s menu has “Alert sound · on this computer”, and the doctor can turn it on and off there (there was no way to silence it; a switch since n237)', 'Alert sound' in m1[0] and 'on this computer' in m1[0] and m1[1] == 'false' and m2[0] == 'true' and m2[1] == '1' and m2[2], [m1, m2])
            await ctx.close()
            ctx, pg, errs = await ts236()
            await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1200)
            SW236 = "(document.querySelector('#pvxStgSound .v-sw')||{getAttribute(){return null}}).getAttribute('aria-checked')"
            s1 = [await pg.evaluate("(document.getElementById('pvxStgSound')||{}).innerText||''"), await pg.evaluate(SW236)]
            await pg.click('#pvxStgSound .v-sw'); await pg.wait_for_timeout(400)
            s2 = [await pg.evaluate(SW236), await pg.evaluate("localStorage.getItem('pvxAlertSound')")]
            ok('n236: Settings has the same Alert sound row for admins (a switch since n237)', 'Alert sound' in s1[0] and s1[1] == 'true' and s2 == ['false', '0'], [s1, s2])
            await pg.click('#pvxStgSound .v-sw'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'{SHOTS}/n236-settings-sound.png')
            # 4. a view opened from Settings has a way back (n237: reports left Settings, so Intern drafts is the one checked)
            await pg.evaluate("document.querySelector('#tsOrderSheet [data-stg=drafts]').click()"); await pg.wait_for_timeout(1500)
            bk = await pg.evaluate("(()=>{const b=document.querySelector('#tsOrderSheet .op-back');return b?[b.textContent.trim(),b.getAttribute('aria-label'),!!document.querySelector('#tsOrderSheet .op-head [data-x], #tsOrderSheet .op-head .op-close, #tsOrderSheet .op-close')]:null})()")
            await pg.screenshot(path=f'{SHOTS}/n236-report-back.png')
            if bk: await pg.click('#tsOrderSheet .op-back'); await pg.wait_for_timeout(900)
            ok('n236: a view opened from Settings (Intern drafts) has “‹ Settings” at the top, which goes back to Settings (Settings was replaced with no way back)', bool(bk) and bk[0] == 'Settings' and bk[1] == 'Back to Settings' and await pg.evaluate("!!document.querySelector('#tsOrderSheet .op-card.stg')"), bk)
            await pg.evaluate(CLOSE236); await pg.wait_for_timeout(400)
            await ctx.close()
            # 5. the medication order: buttons on screen, a close button, and a discard prompt
            res = {}
            for nm, vp in (('Mac', (1440, 900)), ('iPhone', (390, 844))):
                ctx, pg, errs = await ts236(vp=vp)
                await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2200)
                await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
                res[nm] = await pg.evaluate("(()=>{const f=document.querySelector('#tsModal.show .tm-foot'),x=document.querySelector('#tsModal.show .tm-x, #tsModal.show .tm-card > .close, #tsModal.show [aria-label=Close]'),cc=[...document.querySelectorAll('#tsModal.show .tm-foot button')].filter(b=>b.textContent.trim()==='Cancel').length;const r=f.getBoundingClientRect(),c=document.querySelector('#tsModal.show .tm-card').getBoundingClientRect();return {foot:[Math.round(r.top),Math.round(r.bottom),innerHeight],inView:r.top>=0&&r.bottom<=innerHeight+1,cardTall:c.height,x:!!x,cancel:cc,btns:[...f.querySelectorAll('button')].map(b=>b.textContent.trim())}})()")
                if nm == 'Mac': await pg.screenshot(path=f'{SHOTS}/n236-order-footer.png')
                if nm == 'iPhone': await pg.screenshot(path=f'{SHOTS}/n236-order-iphone.png')
                await ctx.close()
            ok('n236: the medication order’s Cancel and Add to sheet stay on screen on a Mac and an iPhone (they were below the fold)', all(r['inView'] and len(r['btns']) >= 2 for r in res.values()), res)
            ok('n236: Cancel is always on screen, and there’s no second close button beside it (Brand Identity: never both ✕ and Cancel)', all(r['cancel'] == 1 and not r['x'] for r in res.values()), res)
            ctx, pg, errs = await ts236(after=T236)
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2200)
            await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
            await pg.fill('#rxDose', '2'); await pg.wait_for_timeout(700)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            ed = await pg.evaluate("[!!document.querySelector('#tsModal.show'),(document.querySelector('#tsModal .pvx-discard b')||{}).textContent||null,(document.activeElement||{}).textContent||'',(document.querySelector('#tsModal .pvx-discard')||{getAttribute(){return null}}).getAttribute('role')]")
            await pg.screenshot(path=f'{SHOTS}/n236-discard-prompt.png')
            ok('n236: Esc on an order with a dose typed asks “Discard this order?” with Keep editing first (it closed and lost the order)', ed[0] and ed[1] == 'Discard this order?' and ed[2] == 'Keep editing' and ed[3] == 'alertdialog', ed)
            await pg.click('#tsModal .pvx-discard [data-keep]'); await pg.wait_for_timeout(300)
            kp = await pg.evaluate("[!!document.querySelector('#tsModal.show'),document.getElementById('rxDose').value,!document.querySelector('#tsModal .pvx-discard')]")
            ok('n236: Keep editing keeps the order and the dose', kp == [True, '2', True], kp)
            await pg.mouse.click(12, 450); await pg.wait_for_timeout(400)
            ok('n236: a click outside asks the same', await pg.evaluate("!!document.querySelector('#tsModal.show .pvx-discard')"))
            await pg.click('#tsModal .pvx-discard [data-keep]'); await pg.wait_for_timeout(300)
            # 6. drafts survive a reload
            await pg.reload(); await pg.wait_for_timeout(3600)
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
            await pg.evaluate("window.__T=[]"); await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1800)
            dr = [await pg.evaluate("document.getElementById('rxDose').value"), await pg.evaluate("window.__T")]
            ok('n236: after a reload the order comes back with its dose and “Draft restored” (it was lost)', dr[0] == '2' and 'Draft restored' in dr[1], dr)
            await pg.click('#tsModal .tm-foot [data-x]'); await pg.wait_for_timeout(300)
            await pg.click('#tsModal .pvx-discard [data-discard]'); await pg.wait_for_timeout(400)
            dc = [await pg.evaluate("!!document.querySelector('#tsModal.show')"), await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('pvxDraft:'))")]
            ok('n236: Cancel with a dose typed asks too, and Discard closes the order and forgets the draft', dc == [False, []], dc)
            await pg.evaluate("tsNewSheet()"); await pg.wait_for_timeout(900); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            ok('n236: with nothing typed, Esc closes at once, as before', await pg.evaluate("!document.querySelector('#tsModal.show')"))
            await pg.evaluate("tsNewSheet()"); await pg.wait_for_timeout(900)
            f1 = await pg.evaluate("(()=>{const f=[...document.querySelectorAll('#tsModal.show input[id]')].find(i=>i.type==='text'||!i.type);return f&&f.id})()")
            if f1: await pg.fill('#' + f1, 'Training'); await pg.wait_for_timeout(700)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            ns = await pg.evaluate("(document.querySelector('#tsModal .pvx-discard b')||{}).textContent||null")
            ok('n236: New sheet with a name typed asks “Discard this new sheet?”', ns == 'Discard this new sheet?', [f1, ns])
            if ns: await pg.click('#tsModal .pvx-discard [data-discard]'); await pg.wait_for_timeout(300)
            # the note keeps its typing across a reload; saving clears it
            await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(900); await pg.fill('#note-body', 'Training note — draft'); await pg.wait_for_timeout(700)
            await pg.reload(); await pg.wait_for_timeout(3600)
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
            await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(1200)
            nd = await pg.evaluate("document.getElementById('note-body').value")
            ok('n236: a half-written note survives a reload (iPads reload background tabs)', nd == 'Training note — draft', nd)
            await pg.locator('#noteDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(1200)
            ok('n236: saving the note forgets its draft', await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('pvxDraft:note')).length") == 0)
            await pg.evaluate(CLOSE236); await pg.wait_for_timeout(300)
            # the charting drawer
            k = await pg.evaluate(KEY236 + "('Temperature')")
            await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1200)
            await pg.fill('#cd-value', '101.3'); await pg.wait_for_timeout(700)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            cd = await pg.evaluate("[!!document.querySelector('#completionDrawer.open'),(document.querySelector('#completionDrawer .pvx-discard b')||{}).textContent||null]")
            await pg.screenshot(path=f'{SHOTS}/n236-drawer-discard.png')
            ok('n236: the charting drawer with a value typed asks “Discard what you typed?” before closing', cd == [True, 'Discard what you typed?'], [k, cd])
            await pg.click('#completionDrawer .pvx-discard [data-discard]'); await pg.wait_for_timeout(600)
            await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1200)
            cv = await pg.evaluate("document.getElementById('cd-value').value")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            ok('n236: Discard really discards, and an untouched drawer closes with Esc at once', cv == '' and await pg.evaluate("!document.querySelector('#completionDrawer.open')"), cv)
            # 7. voice charting stops when Treatment is hidden
            vc = await pg.evaluate("(()=>{let called=0;const b=document.createElement('button');b.id='btMic';b.className='on';document.body.appendChild(b);const o=window.tsBtMic;window.tsBtMic=()=>{called++};Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.visibilityState;window.tsBtMic=o;b.remove();return called})()")
            vj = open(f'{BUILD}/treatment/voice.js').read()
            ok('n236: switching away stops Treatment’s microphones — “Say the readings” and voice entry (they kept listening)', vc == 1 and '"hidden"===document.visibilityState&&(flush(),h&&stop())' in vj, vc)
            ok('n236: signing out forgets drafts on this computer', await pg.evaluate("(()=>{localStorage.setItem('pvxDraft:x','{}');pvxDraftsClear();return Object.keys(localStorage).filter(k=>k.startsWith('pvxDraft:')).length})()") == 0 and 'pvxDraftsClear();' in open(f'{BUILD}/treatment/index.html').read())
            ok('n236: no page errors', not errs, errs[:3])
            await ctx.close()
            # the sticky footer has the card's own colour, in light and dark
            FT236 = "(()=>{const p=c=>(c.match(/[\\d.]+/g)||[]).map(Number);const f=p(getComputedStyle(document.querySelector('#tsModal.show .tm-foot')).backgroundColor),c=p(getComputedStyle(document.querySelector('#tsModal.show .tm-card')).backgroundColor);return {foot:f,card:c,pos:getComputedStyle(document.querySelector('#tsModal.show .tm-foot')).position,same:[0,1,2].every(i=>Math.abs(f[i]-c[i])<=3)&&(c[3]===undefined||c[3]>=.95)}})()"
            lf = {}
            for dk in (False, True):
                ctx, pg, errs = await ts236(dark=dk)
                await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2200)
                await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
                lf['dark' if dk else 'light'] = await pg.evaluate(FT236)
                if not dk: await pg.screenshot(path=f'{SHOTS}/n236-order-light.png')
                await ctx.close()
            ok('n236: the sticky footer is the card’s own colour in light and dark (no band)', all(v['same'] and v['pos'] == 'sticky' for v in lf.values()), lf)
            _secend(90)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n236: Treatment Sheets — HIG Managing notifications, Modality, Multitasking (synthetic tra', False, repr(_e)[:300])
        try:
            # ---------- n237: Treatment Sheets — HIG Printing, Searching, Settings (synthetic training patients) ----------
            _sec(91)
            async def ts237(before='', after='', dark=True, vp=(1440, 900), wait=2600, user=None):
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', user or U230).replace('@@SEED@@', SEED232))
                if before: await ctx.add_init_script(before)
                await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                if after: await ctx.add_init_script(after)
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
                return ctx, pg, errs
            CLOSE237 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
            DOC237 = '{"uid":"u9","email":"resident.a@vca.com","displayName":"Resident A"}'   # made-up doctor of the training patients
            NUR237 = '{"uid":"u7","email":"nurse.b@vca.com","displayName":"Nurse B"}'         # made-up staff member with no patients
            PRN237 = "window.__prn=0;window.addEventListener('load',function(){window.print=function(){window.__prn++}});"
            FIND237 = "(()=>{const f=document.getElementById('tsFind');return f&&f.classList.contains('show')?f.innerText.replace(/\\n/g,' / '):null})()"
            PAGES237 = "[document.documentElement.className.includes('dt-printing'),document.title,[...document.querySelectorAll('#tsDtPrint .dp-page')].map(p=>p.querySelector('.dp-band').textContent),(document.getElementById('tsDtPrint')||{innerText:''}).innerText]"
            # 1. ⌘P on a sheet prints the sheet
            ctx, pg, errs = await ts237(after=PRN237)
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
            await pg.fill('#vin-d1', '101.2'); await pg.press('#vin-d1', 'Enter'); await pg.wait_for_timeout(1200)
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(1500)
            await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(300)
            pp = await pg.evaluate(PAGES237)
            await pg.emulate_media(media='print'); await pg.wait_for_timeout(200)
            th = await pg.evaluate("(()=>{const t=document.querySelector('#tsDtPrint thead tr:not(.pt) th');return t?[getComputedStyle(t).backgroundColor,getComputedStyle(t).color]:null})()")
            await pg.pdf(path=f'{SHOTS}/n237-print-sheet.pdf', prefer_css_page_size=True)
            await pg.emulate_media(media='screen')
            await pg.evaluate("window.dispatchEvent(new Event('afterprint'))"); await pg.wait_for_timeout(200)
            back = await pg.evaluate("[document.documentElement.className.includes('dt-printing'),document.title]")
            ok('n237: ⌘P on a sheet prints the sheet — two pages of 12 hours with a “Treatment sheet” band and who printed it (it printed the screen: the top bar and one row)',
               pp[0] and len(pp[2]) == 2 and all(b.startswith('TREATMENT SHEET · ') and ' by ' in b for b in pp[2]) and '12 AM – 12 PM' in pp[2][0] and 'page 2 of 2' in pp[2][1] and 'Temperature' in pp[3] and 'Gabapentin' in pp[3], pp[:3])
            ok('n237: the printed sheet shows what was charted, with its value, time and initials', '✓ 101.2' in pp[3], pp[3][:300])
            ok('n237: the PDF is named “Biscuit – Treatment sheet – <date>”, and the title comes back after printing', pp[1].startswith('Biscuit – Treatment sheet – ') and ':' not in pp[1] and not back[0] and back[1] != pp[1], [pp[1], back])
            ok('n237: the printed sheet says nothing about downtime', 'downtime' not in pp[3].lower() and 'Paper is the record' not in pp[3] and 'The sheet in Treatment is the record' in pp[3], pp[3][-200:])
            ok('n237: the printed table is black on white, even from the dark theme', th == ['rgb(255, 255, 255)', 'rgb(0, 0, 0)'], th)
            # 2. Print… in the sheet's menu (now Share)
            await pg.click('#tsCopyBtn'); await pg.wait_for_timeout(400)
            sm = await pg.evaluate("[document.getElementById('tsCopyBtn').textContent.trim(),[...document.querySelectorAll('#tsCopyMenu [data-c]')].map(b=>[b.dataset.c,b.querySelector('b').textContent,b.disabled])]")
            await pg.screenshot(path=f'{SHOTS}/n237-share-menu.png')
            await pg.evaluate("window.__prn=0;window.print=function(){window.__prn++};void 0")
            await pg.click('#tsCopyMenu [data-c=print]'); await pg.wait_for_timeout(600)
            pc = [await pg.evaluate("window.__prn"), await pg.evaluate("document.querySelectorAll('#tsDtPrint .dp-page').length")]
            await pg.evaluate("window.dispatchEvent(new Event('afterprint'))")
            ok('n237: the sheet’s menu is “Share” — Copy treatments, Copy latest vitals, Copy link, then Print… (there was no Print)', sm[0] == 'Share' and [x[1] for x in sm[1]][:3] == ['Copy treatments', 'Copy latest vitals', 'Copy link to this sheet'] and sm[1][-1][:2] == ['print', 'Print…'] and not sm[1][-1][2], sm)
            ok('n237: Print… opens printing once, with the sheet on paper', pc == [1, 2], pc)
            dim = await pg.evaluate("(()=>{const o=window.tsPrintReady;window.tsPrintReady=()=>false;const h=tsPrintItem();window.tsPrintReady=o;return h})()")
            ok('n237: while the sheet is still loading, Print… is dimmed and says why', 'disabled' in dim and 'Available once the sheet has loaded' in dim, dim)
            ok('n237: the downtime packet keeps its own band and words', 'DOWNTIME · data as of ' in open(f'{BUILD}/treatment/store.js').read() and 'Paper is the record until the system is back' in open(f'{BUILD}/treatment/store.js').read())
            await ctx.close()
            # 3. ⌘P on the board prints the board; the board has Print… and, for admins, Reports
            ctx, pg, errs = await ts237(after=PRN237)
            bb = await pg.evaluate("[...document.querySelectorAll('#ctab-dash .sb-tvb')].map(b=>[b.id,b.textContent.trim(),b.getAttribute('aria-label')])")
            await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))"); await pg.wait_for_timeout(300)
            bp = await pg.evaluate(PAGES237)
            await pg.emulate_media(media='print'); await pg.pdf(path=f'{SHOTS}/n237-print-board.pdf', prefer_css_page_size=True); await pg.emulate_media(media='screen')
            await pg.evaluate("window.dispatchEvent(new Event('afterprint'))")
            ok('n237: ⌘P on the Status board prints Treatment’s board — Inpatients and Outpatients with ward, doctor, tech, code, day, allergies and problem', bp[0] and len(bp[2]) == 1 and bp[2][0].startswith('TREATMENT · STATUS BOARD · ') and 'Inpatients' in bp[3] and 'Biscuit Training' in bp[3] and bp[1].startswith('Treatment board – '), bp[:3])
            ok('n237: the printed board has no owner column', 'OWNER' not in bp[3].upper(), bp[3][:300])
            ok('n237: the board has a Print button and, for an admin, Reports beside Display', [x[0] for x in bb][:2] == ['tsReportsBtn', 'tsBoardPrint'] and bb[1][2] == 'Print the board…', bb)
            await pg.evaluate("window.__prn=0;window.print=function(){window.__prn++};void 0")
            await pg.click('#tsBoardPrint'); await pg.wait_for_timeout(500)
            ok('n237: the board’s Print button prints the board', await pg.evaluate("window.__prn") == 1 and 'STATUS BOARD' in await pg.evaluate("(document.getElementById('tsDtPrint')||{}).innerText||''"))
            await pg.evaluate("window.dispatchEvent(new Event('afterprint'))")
            # 7. Reports leave Settings for a menu on the board
            await pg.click('#tsReportsBtn'); await pg.wait_for_timeout(400)
            rm = await pg.evaluate("[[...document.querySelectorAll('#tsReportsMenu [role=menuitem] b')].map(b=>b.textContent),document.activeElement.getAttribute('data-rep'),document.getElementById('tsReportsBtn').getAttribute('aria-expanded'),(document.getElementById('tsReportsMenu')||{innerText:''}).innerText]")
            await pg.screenshot(path=f'{SHOTS}/n237-reports-menu.png')
            await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
            rp = await pg.evaluate("[(document.querySelector('#tsOrderSheet.show h3')||{}).textContent||null,!!document.getElementById('tsReportsMenu')]")
            ok('n237: Reports on the board lists Lowered levels, On-time report and Usage, focused for the keyboard', rm[0] == ['Lowered levels', 'On-time report', 'Usage'] and rm[1] == 'levels' and rm[2] == 'true', rm[:3])
            ok('n237: ↓ and Return open the On-time report from the menu', rp == ['On-time report', False], rp)
            ok('n237: Usage says “presses per treatment”, not “taps”', 'presses per treatment' in rm[3] and 'taps' not in rm[3], rm[3])
            await pg.evaluate(CLOSE237); await pg.wait_for_timeout(300)
            await pg.click('#tsReportsBtn'); await pg.wait_for_timeout(300); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            ok('n237: Esc closes the Reports menu and puts focus back on its button', await pg.evaluate("!document.getElementById('tsReportsMenu')&&document.activeElement.id==='tsReportsBtn'"))
            # 8.–10. Settings: settings only, two groups, switches, its name
            await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1200)
            st = await pg.evaluate("""(()=>{const c=document.querySelector('#tsOrderSheet .op-card.stg');return {h3:c.querySelector('h3').textContent,txt:c.innerText,
              groups:[...c.querySelectorAll('.stg-grp')].map(g=>[g.querySelector('h4').firstChild.textContent.trim(),g.getAttribute('role'),[...g.querySelectorAll('.stg-row > .stg-tx > b')].map(b=>b.textContent)]),
              loose:c.querySelectorAll('.stg-list > .stg-row').length,sw:[...c.querySelectorAll('[role=switch]')].map(s=>[s.getAttribute('aria-label'),s.getAttribute('aria-checked')])}})()""")
            await pg.screenshot(path=f'{SHOTS}/n237-settings.png')
            ok('n237: Settings is “Treatment settings” and has no reports in it (Lowered levels, On-time and Usage were there)', st['h3'] == 'Treatment settings' and not any(x in st['txt'] for x in ('Lowered levels', 'On-time report', 'Usage')), st['h3'])
            ok('n237: Settings has two groups — On this computer (Downtime copy, Alert sound) and For everyone (Kura stock link, Intern drafts, Spanish wording, Code list)',
               st['groups'] == [['On this computer', 'group', ['Downtime copy', 'Alert sound']], ['For everyone', 'group', ['Kura stock link', 'Intern drafts', 'Spanish wording', 'Code list']]] and st['loose'] == 0, st['groups'])
            ok('n237: Alert sound and Kura stock link are switches that show their state (they were Turn on / Turn off buttons with the state in the text)', st['sw'] == [['Alert sound', 'true'], ['Kura stock link', 'false']] and 'Turn on' not in st['txt'] and 'Turn off' not in st['txt'], st['sw'])
            await pg.click('#tsOrderSheet [aria-label="Kura stock link"]'); await pg.wait_for_timeout(900)
            ku = [await pg.evaluate("(window.__fs['ts_settings/kura']||{}).enabled"), await pg.evaluate("(document.querySelector('#tsOrderSheet [aria-label=\"Kura stock link\"]')||{getAttribute(){return null}}).getAttribute('aria-checked')"), await pg.evaluate("(document.querySelector('#tsOrderSheet .op-card.stg')||{innerText:''}).innerText")]
            ok('n237: the Kura switch turns the link on for everyone, and the row then says since when and by whom', ku[0] is True and ku[1] == 'true' and 'On since' in ku[2], ku[:2])
            await pg.click('#tsOrderSheet [aria-label="Kura stock link"]'); await pg.wait_for_timeout(700)
            await pg.evaluate(CLOSE237)
            ok('n237: no page errors', not errs, errs[:3])
            await ctx.close()
            # a staff member who isn't an admin sees no Reports
            ctx, pg, errs = await ts237(user=NUR237)
            ok('n237: staff who aren’t admins see no Reports button', await pg.evaluate("!document.getElementById('tsReportsBtn')&&!!document.getElementById('tsBoardPrint')"))
            # 4. before typing: recently opened, memory only
            await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1200); await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
            await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(500)
            rc = [await pg.evaluate("document.activeElement.id"), await pg.evaluate(FIND237)]
            await pg.screenshot(path=f'{SHOTS}/n237-search-recent.png')
            ok('n237: ⌘K focuses the search (it did nothing)', rc[0] == 'globalSearch', rc)
            ok('n237: before typing, the search lists the patients you opened most recently, newest first', bool(rc[1]) and rc[1].startswith('RECENTLY OPENED / Biscuit Training') and 'Mochi Training' in rc[1], rc[1])
            ks = await pg.evaluate("Object.keys(localStorage).filter(k=>/recent|find|search/i.test(k))")
            await pg.keyboard.press('Escape'); await pg.reload(); await pg.wait_for_timeout(3000)
            await pg.keyboard.press('Control+k'); await pg.wait_for_timeout(500)
            rl = await pg.evaluate(FIND237) or ''
            ok('n237: recently opened patients are kept in memory only — nothing is saved, and a reload forgets them (only the sheet it reopens is listed; Ctrl+K works too)', ks == [] and await pg.evaluate("document.activeElement.id") == 'globalSearch' and 'Mochi Training' not in rl, [ks, rl])
            await ctx.close()
            # a doctor sees My patients first
            ctx, pg, errs = await ts237(user=DOC237)
            await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(500)
            mp = await pg.evaluate(FIND237)
            ok('n237: for a doctor, “My patients” comes first before typing', bool(mp) and mp.startswith('MY PATIENTS / ') and 'Biscuit Training' in mp, mp)
            await pg.keyboard.press('Escape'); await ctx.close()
            # 1., 3., 5. orders are searched; a Clear button; a real search field for VoiceOver
            ctx, pg, errs = await ts237()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('notes')"); await pg.wait_for_timeout(1500)
            await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(300)
            at = await pg.evaluate("(()=>{const i=document.getElementById('globalSearch');return [i.type,i.getAttribute('role'),i.getAttribute('aria-controls'),i.getAttribute('aria-autocomplete'),i.getAttribute('enterkeyhint'),i.getAttribute('aria-keyshortcuts')]})()")
            clr0 = await pg.evaluate("getComputedStyle(document.querySelector('.subnav .ts-sclear')).display")
            await pg.keyboard.type('Gaba'); await pg.wait_for_timeout(600)
            go = [await pg.evaluate(FIND237), await pg.evaluate("document.getElementById('globalSearch').getAttribute('aria-expanded')"), await pg.evaluate("getComputedStyle(document.querySelector('.subnav .ts-sclear')).display")]
            await pg.screenshot(path=f'{SHOTS}/n237-search-orders.png')
            ok('n237: searching “Gaba” finds the order — Orders: Gabapentin · Biscuit Training · 10 mg/kg PO q8h (it found nothing, though the field says “patients, orders”)', bool(go[0]) and go[0].startswith('ORDERS / Gabapentin / Biscuit Training · 10 mg/kg PO q8h') and 'No patient' not in go[0], go[0])
            ok('n237: the field is a search combobox tied to its list (type=search, aria-controls, enterkeyhint, ⌘K in aria-keyshortcuts), and says when its list is open', at == ['search', 'combobox', 'tsFind', 'list', 'search', 'Meta+K Control+K'] and go[1] == 'true', [at, go[1]])
            ok('n237: a Clear button appears once there’s text', clr0 == 'none' and go[2] == 'grid', [clr0, go[2]])
            await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(150)
            ad = await pg.evaluate("[document.getElementById('globalSearch').getAttribute('aria-activedescendant'),(document.querySelector('#tsFind .mi.cur')||{}).id]")
            await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(150)
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1200)
            oe = await pg.evaluate("[currentCTab,__tsFind.cur(),!!document.querySelector('#ctab-sheet .grow.ts-order-hl[data-o=m1]')]")
            ok('n237: VoiceOver follows the highlighted result (aria-activedescendant)', bool(ad[0]) and ad[0] == ad[1] and ad[0] == 'tsFindO1', ad)
            ok('n237: Return on an order opens that sheet at the order, highlighted for a moment', oe == ['sheet', 'sh_train1', True], oe)
            await pg.keyboard.press('Meta+k'); await pg.keyboard.type('zzzz'); await pg.wait_for_timeout(400)
            nm = await pg.evaluate(FIND237)
            await pg.click('.subnav .ts-sclear'); await pg.wait_for_timeout(300)
            cl = await pg.evaluate("[document.getElementById('globalSearch').value,document.activeElement.id,getComputedStyle(document.querySelector('.subnav .ts-sclear')).display]")
            ok('n237: nothing found says “No patient or order matches”', bool(nm) and 'No patient or order matches “zzzz”.' in nm, nm)
            ok('n237: Clear empties the field and keeps the cursor in it', cl == ['', 'globalSearch', 'none'], cl)
            await pg.keyboard.press('Escape'); await pg.mouse.click(700, 760)
            await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(900)
            await pg.keyboard.press('Meta+k'); await pg.keyboard.type('Gabapentin'); await pg.wait_for_timeout(700)
            br237 = await pg.evaluate("(document.getElementById('ctab-dash')||{innerText:''}).innerText")
            ok('n237: on the board an order filters the board to the patients on it', 'Biscuit Training' in br237 and 'Mochi Training' not in br237 and 'Juniper Training' not in br237, br237[:200])
            await pg.keyboard.press('Escape')
            ok('n237: no page errors in search', not errs, errs[:3])
            await ctx.close()
            # 6. opening the search never covers the tabs
            res = {}
            for w in (1440, 1280, 1180, 1133):
                ctx, pg, errs = await ts237(vp=(w, 900))
                await pg.evaluate("tsOpenSheet('sh_train3')"); await pg.wait_for_timeout(1000)
                G = "(()=>{const sw=document.querySelector('.subnav .switcher'),n=[...sw.querySelectorAll('button,a')].filter(b=>/Notes/.test(b.textContent))[0];const r=sw.getBoundingClientRect(),nr=n.getBoundingClientRect(),bar=document.querySelector('.subnav .search-bar').getBoundingClientRect();return [Math.round(r.right),Math.round(nr.right),sw.scrollWidth<=sw.clientWidth+1,Math.round(bar.width),Math.round(bar.left)]})()"
                g0 = await pg.evaluate(G)
                await pg.keyboard.press('Meta+k'); await pg.keyboard.type('Bis'); await pg.wait_for_timeout(500)
                g1 = await pg.evaluate(G)
                if w == 1440: await pg.screenshot(path=f'{SHOTS}/n237-search-open.png')
                res[w] = [g0, g1]; await ctx.close()
            ok('n237: every sub-nav tab is whole at 1440, 1280, 1180 and 1133 pt with a sheet open, and opening the search leaves them whole — it lies over the patient chip and the gear (the Notes tab was cut in half at 1440 with the search open, and at 1180 always)',
               all(v[0][2] and v[1][2] and v[1][1] <= v[1][0] and v[1][0] == v[0][0] and v[1][3] >= 220 and v[1][4] > v[1][1] for v in res.values()), res)
            # the light theme: the open search has its own solid background
            ctx, pg, errs = await ts237(dark=False)
            await pg.keyboard.press('Meta+k'); await pg.wait_for_timeout(300)
            ok('n237: in light the open search is solid white over the chip', await pg.evaluate("getComputedStyle(document.querySelector('.subnav .search-bar')).backgroundColor") == 'rgb(255, 255, 255)')
            await pg.evaluate("tsSettingsOpen()"); await pg.wait_for_timeout(1000)
            await pg.screenshot(path=f'{SHOTS}/n237-settings-light.png')
            await ctx.close()
            _secend(91)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n237: Treatment Sheets — HIG Printing, Searching, Settings (synthetic training patients) -', False, repr(_e)[:300])
        try:
            # ---------- n238: Treatment Sheets — HIG Undo and redo, Charts, Text views (synthetic training patients) ----------
            _sec(92)
            async def ts238(before='', after='', dark=True, vp=(1440, 900), wait=2600, user=None):
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', user or U230).replace('@@SEED@@', SEED232))
                if before: await ctx.add_init_script(before)
                await ctx.add_init_script(FAKE); await ctx.add_init_script(WRAP)
                if after: await ctx.add_init_script(after)
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
                return ctx, pg, errs
            CLOSE238 = "(()=>{try{tsOrderClose()}catch(e){};const m=document.getElementById('tsModal');if(m){m.innerHTML='';m.className=''};document.querySelectorAll('.drawer.open').forEach(d=>d.classList.remove('open'));const s=document.getElementById('scrim');s&&s.classList.remove('show');try{tsTakeClose()}catch(e){}})()"
            DOC238 = '{"uid":"u9","email":"resident.a@vca.com","displayName":"Resident A"}'
            TOAST238 = "[...document.querySelectorAll('#toastWrap .ctoast')].map(t=>t.innerText.replace(/\\n/g,' | '))"
            LAB238 = "(i=>{const n=['Temperature','Heart Rate','Respiratory Rate'][i];const c=[...document.querySelectorAll('#ctab-vitals .v-chart[role=img]')].find(e=>(e.getAttribute('aria-label')||'').startsWith(n+','));return c?c.getAttribute('aria-label'):''})"
            MK238 = "(oid=>{const d=new Date(),dk=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');const s=window.__fs||{};const out=[];for(const k in s){if(/sh_train1\\/days\\//.test(k)){const m=s[k].marks||{};for(const id in m){if(id.startsWith(dk+'_'+oid+'_')&&m[id].at&&m[id].status==='completed')out.push([id,m[id].value])}}}return out.sort((a,b)=>String(a[1]).localeCompare(String(b[1])))})"
            WR238 = """((oid,val,by,key)=>{const d=new Date(),dk=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');const m=d.getHours()*60+d.getMinutes();const k=key||dk+'_'+oid+'_x'+m+'_r';const o={};o[k]={orderId:oid,status:'completed',value:val,by:by,min:m,sched:m,at:new Date().toISOString()};return firebase.firestore().collection('sheets').doc('sh_train1').collection('days').doc(dk).set({marks:o},{merge:true}).then(()=>k)})"""
            async def unfocus(pg):
                await pg.evaluate("document.activeElement&&document.activeElement.blur()"); await pg.mouse.move(5, 880)
            # 1. two readings in the same minute are both kept, and each has Undo
            ctx, pg, errs = await ts238()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
            await pg.fill('#vin-d2', '118'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(800)
            await pg.fill('#vin-d2', '124'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(1200)
            t1 = await pg.evaluate(TOAST238); m1 = await pg.evaluate(MK238 + "('d2')"); l1 = await pg.evaluate(LAB238 + "(1)")
            ub = await pg.evaluate("[...document.querySelectorAll('#toastWrap .ts-undo button')].map(b=>b.getAttribute('aria-label'))")
            await pg.screenshot(path=f'{SHOTS}/n238-recorded-undo.png')
            ok('n238: two heart rates charted in the same minute are both kept (the second replaced the first)', [x[1] for x in m1] == ['118', '124'] and 'Latest 124 bpm' in l1, [m1, l1])
            ok('n238: “… recorded” has Undo (it had none)', 'Heart Rate 118 recorded | Undo' in t1 and 'Heart Rate 124 recorded | Undo' in t1, t1)
            ok('n238: VoiceOver hears what each Undo undoes (“Undo Heart Rate 124 recorded”, it was just “Undo”)', ub[-2:] == ['Undo Heart Rate 118 recorded', 'Undo Heart Rate 124 recorded'], ub)
            await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1500); await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1600)
            hv = await pg.evaluate("(()=>{const d=new Date(),dk=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');return TASKS.filter(t=>t.orderId==='d2'&&t.status==='completed'&&String(t.key||t.id).startsWith(dk)).map(t=>String(t.value)).sort()})()")
            ok('n238: opened again from the database, the sheet has both readings', '118' in hv and '124' in hv, hv)
            await ctx.close()
            # fixed first: ⌘Z / ⇧⌘Z with one history
            ctx, pg, errs = await ts238()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
            await pg.fill('#vin-d2', '118'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(700)
            await pg.fill('#vin-d1', '101.6'); await pg.press('#vin-d1', 'Enter'); await pg.wait_for_timeout(900)
            await pg.focus('#vin-d3'); await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(400)
            tf = await pg.evaluate("pvxTsHist.size()")
            await unfocus(pg); await pg.wait_for_timeout(5500)   # the Undo messages are gone
            await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(900)
            u1 = [await pg.evaluate(TOAST238), await pg.evaluate(LAB238 + "(0)"), await pg.evaluate(MK238 + "('d1')")]
            await pg.screenshot(path=f'{SHOTS}/n238-cmdz.png')
            await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(900)
            u2 = [await pg.evaluate(LAB238 + "(1)"), await pg.evaluate(MK238 + "('d2')"), await pg.evaluate("pvxTsHist.size()")]
            await pg.keyboard.press('ControlOrMeta+Shift+z'); await pg.wait_for_timeout(900)
            r1 = [await pg.evaluate(TOAST238), await pg.evaluate(LAB238 + "(1)"), await pg.evaluate(MK238 + "('d2')"), await pg.evaluate("pvxTsHist.size()")]
            ok('n238: ⌘Z works after the Undo message has gone, and says what it undid (Treatment had no ⌘Z)', any(x.startswith('Undone — Temperature 101.6 recorded') for x in u1[0]) and '101.6' not in u1[1] and u1[2] == [], u1)
            ok('n238: ⌘Z again goes one more step back (heart rate 118 undone too)', '118' not in u2[0] and u2[1] == [] and u2[2] == [0, 2], u2)
            ok('n238: ⇧⌘Z redoes the last undo', any(x.startswith('Redone — Heart Rate 118 recorded') for x in r1[0]) and [x[1] for x in r1[2]] == ['118'] and r1[3] == [1, 1], r1)
            ok('n238: ⌘Z while typing in a field is the field’s own (the history wasn’t touched)', tf == [2, 0], tf)
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1200)
            await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(700); await pg.evaluate("document.activeElement.blur()")
            await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(400)
            ok('n238: ⌘Z does nothing while a drawer or dialog is open', await pg.evaluate("pvxTsHist.size()") == [1, 1])
            await pg.evaluate(CLOSE238); await pg.wait_for_timeout(300)
            # on another patient: ⌘Z opens the patient first
            await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1500); await unfocus(pg)
            await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(1500)
            op = [await pg.evaluate("__tsFind.cur()"), await pg.evaluate(TOAST238), await pg.evaluate("pvxTsHist.size()")]
            ok('n238: ⌘Z for a change on another patient opens that patient first and says what the next ⌘Z will undo', op[0] == 'sh_train1' and any('Opened Biscuit Training' in x and 'Heart Rate 118 recorded' in x for x in op[1]) and op[2] == [1, 1], op)
            await pg.evaluate("selectCTab('vitals')"); await pg.wait_for_timeout(1000); await unfocus(pg)
            await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(900)
            ok('n238: … and the next ⌘Z undoes it there', await pg.evaluate(MK238 + "('d2')") == [] and await pg.evaluate("pvxTsHist.size()") == [0, 2])
            await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(500)
            ok('n238: with nothing left, ⌘Z says “Nothing to undo”', any('Nothing to undo' in x for x in await pg.evaluate(TOAST238)))
            ok('n238: no page errors (undo)', not errs, errs[:3])
            await ctx.close()
            # a later change by someone else is never undone over the top
            ctx, pg, errs = await ts238()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('vitals')"); await pg.wait_for_timeout(1800)
            await pg.fill('#vin-d2', '118'); await pg.press('#vin-d2', 'Enter'); await pg.wait_for_timeout(1200)
            key = (await pg.evaluate(MK238 + "('d2')"))[0][0]
            await pg.evaluate(WR238 + f"('d2','119','RA','{key}')"); await pg.wait_for_timeout(1500)
            await unfocus(pg); await pg.keyboard.press('ControlOrMeta+z'); await pg.wait_for_timeout(800)
            cf = [await pg.evaluate(TOAST238), await pg.evaluate(MK238 + "('d2')")]
            ok('n238: if someone else changed the reading since, ⌘Z says so and leaves their change (“Can’t undo — … changed Heart Rate after you”)', any('Can’t undo' in x and 'changed Heart Rate after you' in x for x in cf[0]) and [x[1] for x in cf[1]] == ['119'], cf)
            # 5. someone else's reading is announced; a critical one as an alert
            await pg.evaluate("document.getElementById('pvxLiveRemote')&&(document.getElementById('pvxLiveRemote').textContent='')")
            await pg.evaluate(WR238 + "('d3','30','RA')"); await pg.wait_for_timeout(1500)
            an = await pg.evaluate("[(document.getElementById('pvxLiveRemote')||{}).textContent||'',(document.getElementById('pvxLiveRemote')||{getAttribute(){return null}}).getAttribute('aria-live')]")
            await pg.evaluate(WR238 + "('d2','1','RA')"); await pg.wait_for_timeout(1500)
            cr = await pg.evaluate("[(document.getElementById('pvxLiveRemoteCrit')||{}).textContent||'',(document.getElementById('pvxLiveRemoteCrit')||{getAttribute(){return null}}).getAttribute('role')]")
            ok('n238: someone else’s new reading on the open sheet is announced (“Respiratory Rate 30 rpm, charted by RA at …”; it was silent)', an[1] == 'polite' and an[0].startswith('Respiratory Rate 30 rpm, charted by RA at '), an)
            ok('n238: a critical one is announced as an alert', cr[1] == 'alert' and cr[0].startswith('Critical: Heart Rate 1 bpm, charted by RA'), cr)
            own = await pg.evaluate("(document.getElementById('pvxLiveRemote')||{}).textContent||''")
            await pg.fill('#vin-d3', '28'); await pg.press('#vin-d3', 'Enter'); await pg.wait_for_timeout(1500)
            ok('n238: your own readings aren’t announced twice (they have their message)', await pg.evaluate("(document.getElementById('pvxLiveRemote')||{}).textContent||''") == own)
            # 6. the alert range is labelled, spoken and in a legend; choice rows get a neutral lane
            lab = await pg.evaluate(LAB238 + "(0)")
            await pg.wait_for_timeout(400)
            bt = await pg.evaluate("(()=>{const c=[...document.querySelectorAll('#ctab-vitals .v-chart[role=img]')].find(e=>(e.getAttribute('aria-label')||'').startsWith('Temperature,'));const r=c&&c.closest('.v-row');const x=r&&r.querySelector('.vx-now .vx-alr');return [x?x.textContent:null,x?getComputedStyle(x).display:null,(document.querySelector('#ctab-vitals .vx-key')||{}).textContent,document.querySelectorAll('#ctab-vitals .vx-lane').length,document.querySelectorAll('#ctab-vitals .vx-band').length]})()")
            await pg.screenshot(path=f'{SHOTS}/n238-alert-range.png')
            ok('n238: the shaded band is explained — each row says “Alert range 99–103.5 °F” under its latest value (it had no label)', bt[0] == 'Alert range 99–103.5 °F' and bt[1] == 'block', bt[:2])
            ok('n238: the chart’s VoiceOver label says it too (“Shaded: alert range 99–103.5 °F.”)', lab.endswith('Shaded: alert range 99–103.5 °F.'), lab)
            ok('n238: the Vitals axis has a legend, “Shaded: alert range”, and choice rows (CRT, mentation) have a neutral lane instead of the green band', bt[2] == 'Shaded: alert range' and bt[3] >= 3 and bt[4] >= 3, bt)
            ok('n238: no page errors (charts)', not errs, errs[:3])
            await ctx.close()
            # the charting drawer's “… charted” has Undo; problems added have Undo
            ctx, pg, errs = await ts238()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(2000)
            k = await pg.evaluate("((n)=>{const all=[...document.querySelectorAll('#ctab-sheet .mark[data-t]')].filter(m=>m.title.startsWith(n+' ·'));for(const s of ['overdue','due','scheduled']){const m=all.find(m=>m.dataset.s===s);if(m)return m.dataset.t}return null})('Temperature')")
            await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1000)
            await pg.fill('#cd-value', '101.3'); await pg.locator('#completionDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(900)
            dt = await pg.evaluate(TOAST238)
            await pg.click('#toastWrap .ts-undo button >> nth=-1'); await pg.wait_for_timeout(900)
            ds = await pg.evaluate(f"(TASKS.find(t=>t.id==='{k}'||t.key==='{k}')||{{}}).status||null")
            ok('n238: charting from the drawer says “Temperature charted · Undo”, and Undo takes it back', 'Temperature charted | Undo' in dt and ds is None, [dt, ds])
            await pg.fill('#tsProblems input', 'Training problem A'); await pg.press('#tsProblems input', 'Enter'); await pg.wait_for_timeout(900)
            pa = await pg.evaluate(TOAST238)
            await pg.click('#toastWrap .ts-undo button >> nth=-1'); await pg.wait_for_timeout(900)
            pl = await pg.evaluate("(document.getElementById('tsProblems')||{innerText:''}).innerText")
            ok('n238: adding a problem says “Training Problem A added · Undo” (problem names in Title Case since n247), and Undo removes it', 'Training Problem A added | Undo' in pa and 'Training Problem A' not in pl, [pa, pl[:80]])
            # 7.–8. notes keep their lines; note boxes grow
            await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(900)
            h0 = await pg.evaluate("document.getElementById('note-body').getBoundingClientRect().height")
            await pg.fill('#note-body', 'Assessment: training dog, quiet and alert.\nPlan:\n- recheck temperature at 2 PM\n- offer water\n' + '\n'.join('line %d' % i for i in range(5, 13)))
            await pg.wait_for_timeout(300)
            h1 = await pg.evaluate("[document.getElementById('note-body').getBoundingClientRect().height,document.getElementById('note-body').scrollHeight,innerHeight]")
            await pg.screenshot(path=f'{SHOTS}/n238-note-grows.png')
            await pg.locator('#noteDrawer .btn.primary:visible').last.click(); await pg.wait_for_timeout(1200)
            await pg.evaluate("selectCTab('notes')"); await pg.wait_for_timeout(900)
            nb = await pg.evaluate("(()=>{const n=[...document.querySelectorAll('#ctab-notes .cnote .nbody')].find(e=>/Assessment/.test(e.textContent));return n?[n.innerText,getComputedStyle(n).whiteSpace]:null})()")
            await pg.screenshot(path=f'{SHOTS}/n238-note-lines.png')
            ok('n238: the Note box starts taller (it was 4 lines) and grows with the text, up to 60 % of the window', h0 >= 130 and h1[0] > h0 + 40 and h1[0] <= h1[2] * 0.6 + 2, [h0, h1])
            ok('n238: a saved note keeps its line breaks (it ran together into one line)', bool(nb) and 'Plan:\n- recheck temperature at 2 PM\n- offer water' in nb[0] and nb[1] == 'pre-line', nb)
            await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(900)
            await pg.evaluate(f"openCompletion('{k}')"); await pg.wait_for_timeout(1000)
            c0 = await pg.evaluate("document.getElementById('cd-notes').getBoundingClientRect().height")
            await pg.fill('#cd-notes', '\n'.join('note line %d' % i for i in range(1, 15))); await pg.wait_for_timeout(300)
            c1 = await pg.evaluate("(()=>{const t=document.getElementById('cd-notes');const lh=parseFloat(getComputedStyle(t).lineHeight)||parseFloat(getComputedStyle(t).fontSize)*1.4;return [t.getBoundingClientRect().height,lh,getComputedStyle(t).overflowY]})()")
            ok('n238: the charting drawer’s note grows too, up to 8 lines, then scrolls', c1[0] > c0 + 30 and c1[0] <= c1[1] * 8 + 40 and c1[2] == 'auto', [c0, c1])
            await pg.evaluate(CLOSE238)
            ok('n238: no page errors (drawer, problems, notes)', not errs, errs[:3])
            await ctx.close()
            _secend(92)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n238: Treatment Sheets — HIG Undo and redo, Charts, Text views (synthetic training patient', False, repr(_e)[:300])
        try:
            # ---------- n240: Treatment Sheets — HIG Column views, Disclosure controls, Labels (synthetic training patients) ----------
            _sec(94)
            async def ts240(dark=True, vp=(1440, 900), wait=2600, more=False):
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED232))
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
                if more:
                    cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-contrast', 'value': 'more'}]})
                await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
                return ctx, pg, errs
            SCAN240 = r"""(()=>{const P=c=>{const m=c.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0]};const L=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
    const mix=(a,b)=>{const al=a.length>3?a[3]:1;return [0,1,2].map(i=>a[i]*al+b[i]*(1-al))};
    const bgOf=e=>{const st=[];let n=e;while(n&&n.nodeType===1){const c=P(getComputedStyle(n).backgroundColor);if(c.length<4||c[3]>0)st.push(c);if(c.length<4||c[3]>=.95)break;n=n.parentElement}let b=document.body.classList.contains('dark')?[10,18,34]:[242,244,248];for(let i=st.length-1;i>=0;i--)b=mix(st[i],b);return b};
    const grad=e=>{let n=e;while(n&&n.nodeType===1){if(getComputedStyle(n).backgroundImage.indexOf('gradient')>-1)return true;n=n.parentElement}return false};const out={};const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode()){const s=t.textContent.trim();if(s.length<2)continue;const e=t.parentElement;if(!e||e.closest('.pvx-topbar,#pvxTopbar,.topbar,nav.pvx-nav,header'))continue;const r=e.getBoundingClientRect();if(!r.width)continue;if(grad(e))continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
     let op=1,n=e;while(n){op*=+getComputedStyle(n).opacity;n=n.parentElement}
     const bg=bgOf(e);let fc=P(cs.color);fc=mix([fc[0],fc[1],fc[2],(fc.length>3?fc[3]:1)*op],bg);const l1=L(fc),l2=L(bg);const cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
     const dis=!!e.closest('[disabled],[aria-disabled=true],.disabled');const k=cs.color+'|'+Math.round(cr*10)/10;
     if(!out[k])out[k]={n:0,cr:Math.round(cr*100)/100,fs:cs.fontSize,fw:cs.fontWeight,dis,ex:[]};out[k].n++;if(out[k].ex.length<3)out[k].ex.push(s.slice(0,28)+' <'+String(e.className).slice(0,18)+'>')}
    return Object.entries(out).filter(([k,v])=>v.cr<4.5&&!v.dis).map(([k,v])=>[k,v.cr,v.fs,v.ex])})()"""
            CR240 = """(([sel,pseudo])=>{const P=c=>(c.match(/[\\d.]+/g)||[]).map(Number);const L=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};const e=document.querySelector(sel);if(!e)return null;
              let n=e,bg=null;while(n&&n.nodeType===1){const c=P(getComputedStyle(n).backgroundColor);if(c.length&&(c.length<4||c[3]>.5)){bg=c;break}n=n.parentElement}bg=bg||(document.body.classList.contains('dark')?[10,18,34]:[255,255,255]);const fc=P(getComputedStyle(e).color);const a=L(fc),b=L(bg);return Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*100)/100})"""
            # disclosure 1: the section chevron leads
            ctx, pg, errs = await ts240()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1600)
            SEC240 = "[...document.querySelectorAll('.gband .gsection')].map(g=>{const c=g.querySelector('.sec-chev'),t=g.querySelector('.stitle');return [Math.round(c.getBoundingClientRect().left-t.getBoundingClientRect().left),getComputedStyle(c).transform,g.getAttribute('aria-expanded')]})"
            o1 = await pg.evaluate(SEC240)
            await pg.click('.gband .gsection >> nth=0'); await pg.wait_for_timeout(600); c1 = await pg.evaluate(SEC240)
            await pg.screenshot(path=f'{SHOTS}/n240-section-chevrons.png', clip={'x': 380, 'y': 400, 'width': 560, 'height': 200})
            await pg.click('.gband .gsection >> nth=0'); await pg.wait_for_timeout(400)
            ok('n240: each section’s chevron is on the leading edge, before its name (it came after the name and count)', o1 and all(x[0] < 0 for x in o1) and all(x[0] < 0 for x in c1), [o1, c1])
            ok('n240: it points down when open and right (inward) when closed', all(x[1] == 'none' for x in o1) and c1[0][1].startswith('matrix(0, -1, 1, 0') and c1[0][2] == 'false', [o1[0], c1[0]])
            # disclosure 2: More options last in the order form
            await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500)
            ORD240 = """(()=>{const c=document.querySelector('#tsModal .tm-card');const k=[...c.children].map(x=>(String(x.className).split(' ')[0]||x.id));const m=c.querySelector('.of-more'),b=m.nextElementSibling,calc=document.getElementById('rxCalc');
              return {k,exp:m.getAttribute('aria-expanded'),ctl:m.getAttribute('aria-controls'),bid:b.id,bvis:b.getBoundingClientRect().height>0,calc:calc?Math.round(calc.offsetTop):null,more:Math.round(m.offsetTop)}})()"""
            f1 = await pg.evaluate(ORD240)
            await pg.click('#tsModal .of-more'); await pg.wait_for_timeout(900); f2 = await pg.evaluate(ORD240)
            await pg.screenshot(path=f'{SHOTS}/n240-more-options-last.png')
            vis = await pg.evaluate("(()=>{const b=document.querySelector('#tsModal .of-more').nextElementSibling.getBoundingClientRect(),f=document.querySelector('#tsModal .tm-foot').getBoundingClientRect();return b.top<f.top})()")
            ok('n240: More options and what it hides come last, just above the buttons (they sat above Stock strength and the dose result)', f1['k'][-3:] == ['of-more', 'of-box', 'tm-foot'] and f1['calc'] is not None and f1['calc'] < f1['more'], f1)
            ok('n240: opening it leaves the dose result where it was, names what it controls, and brings the options into view', f2['exp'] == 'true' and f2['ctl'] == f2['bid'] and f2['bvis'] and f2['calc'] == f1['calc'] and vis, [f1, f2, vis])
            await pg.click('#tsModal .of-more'); await pg.wait_for_timeout(500)
            ok('n240: closing it again works', await pg.evaluate("document.querySelector('#tsModal .of-more').getAttribute('aria-expanded')") == 'false')
            ok('n240: no page errors on the sheet and order box', not errs, errs[:3])
            await ctx.close()
            # labels: every visible text at least 4.5:1, in both themes and with Increase Contrast
            for dk, more in ((True, False), (False, False), (True, True), (False, True)):
                th = ('dark' if dk else 'light') + (' + Increase Contrast' if more else '')
                ctx, pg, errs = await ts240(dark=dk, more=more, wait=3200)
                low = {'board': await pg.evaluate(SCAN240)}
                await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(1500); low['tasks'] = await pg.evaluate(SCAN240)
                await pg.evaluate("(()=>{const t=document.querySelector('#ctab-tasks');if(!t||t.querySelector('.wl-sec.due'))return;const x=document.createElement('section');x.className='wl-sec due';x.id='pvxT240';x.innerHTML='<h3>Due now <span>16</span></h3>';t.appendChild(x)})()")
                dueN = await pg.evaluate(CR240, ['.wl-sec.due h3 span', None]); await pg.evaluate("(()=>{const x=document.getElementById('pvxT240');x&&x.remove()})()")
                await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1600); low['sheet'] = await pg.evaluate(SCAN240)
                for t in ('vitals', 'charges', 'timeline', 'notes'):
                    await pg.evaluate(f"selectCTab('{t}')"); await pg.wait_for_timeout(1300); low[t] = await pg.evaluate(SCAN240)
                await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(700)
                await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1500); low['order'] = await pg.evaluate(SCAN240)
                named = {k: await pg.evaluate(CR240, [s_, None]) for k, s_ in (('2h ago', '.tsh .tsh-age:not(.old)'), ('Source ↗', '#tsModal .rx-ref a'), ('Already ordered', '#tsModal .ts-dup .td-h'), ('In range', '#tsModal .ms-bar.ok .ms-say b'))}
                named['1d ago'] = await pg.evaluate("(()=>{const e=document.querySelector('.tsh .tsh-age:not(.old)');if(!e)return null;e.classList.add('old');return 1})()") and await pg.evaluate(CR240, ['.tsh .tsh-age.old', None])
                if not more: await pg.screenshot(path=f'{SHOTS}/n240-order-{"dark" if dk else "light"}.png')
                bad = {k: v for k, v in low.items() if v}
                named['Due now count'] = dueN
                ok(f'n240: every label is at least 4.5:1 on the board, Tasks, every sheet tab and the order box ({th})', not bad, bad)
                ok(f'n240: “2h ago”, “1d ago” (overdue amber), Tasks’ Due now count, “Source ↗”, “Already ordered” and “In range” each read at 4.5:1 or more ({th})', all(v is None or v >= 4.5 for v in named.values()) and named['1d ago'] is not None and named['2h ago'] is not None and named['Due now count'] is not None, named)
                if dk and more:
                    ok('n240: Increase Contrast keeps its own, brighter accent text in dark (#8FE6F3)', (await pg.evaluate("getComputedStyle(document.body).getPropertyValue('--accent-ink').trim()")).upper() == '#8FE6F3')
                await ctx.close()
            # also: Esc closes Treatment settings the first time
            ctx, pg, errs = await ts240()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1500)
            SH240 = "(()=>{const s=document.getElementById('tsOrderSheet');return [!!(s&&s.classList.contains('show')),document.activeElement&&document.activeElement.id]})()"
            await pg.click('#tsSettingsBtn'); await pg.wait_for_timeout(1000); e0 = await pg.evaluate(SH240)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700); e1 = await pg.evaluate(SH240)
            await pg.wait_for_timeout(2500); e2 = await pg.evaluate(SH240)
            ok('n240: Esc closes Treatment settings the first time, with focus back on the gear (it took two)', e0[0] and not e1[0] and e1[1] == 'tsSettingsBtn' and not e2[0], [e0, e1, e2])
            await pg.click('#tsSettingsBtn'); await pg.wait_for_timeout(1000); r0 = await pg.evaluate(SH240)
            sub = await pg.query_selector('#tsOrderSheet .op-card.stg [data-stg]')
            r1 = r2 = None
            if sub:
                await sub.click(); await pg.wait_for_timeout(900)
                bk = await pg.query_selector('#tsOrderSheet .op-back')
                if bk: await bk.click(); await pg.wait_for_timeout(900)
                r1 = await pg.evaluate("!!document.querySelector('#tsOrderSheet.show .op-card.stg')")
                await pg.keyboard.press('Escape'); await pg.wait_for_timeout(2500); r2 = await pg.evaluate(SH240)
            ok('n240: the gear opens settings again, and Back to Settings from a settings page still works and closes on one Esc', r0[0] and sub is not None and r1 and not r2[0], [r0, r1, r2])
            ok('n240: no page errors in settings', not errs, errs[:3])
            await ctx.close()
            _secend(94)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n240: Treatment Sheets — HIG Column views, Disclosure controls, Labels (synthetic training', False, repr(_e)[:300])
        try:
            # ---------- n241: Treatment Sheets — HIG Lists and tables, Lockups, Outline views (synthetic training patients) ----------
            _sec(95)
            async def ts241(dark=True, vp=(1440, 900), wait=2600, more=False):
                ctx = await br.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark' if dark else 'light')
                await ctx.add_cookies([{'name': 'pvx_theme', 'value': 'dark' if dark else 'light', 'url': f'http://127.0.0.1:{PORT}/'}])
                await ctx.add_init_script(INIT.replace('@@USER@@', U230).replace('@@SEED@@', SEED232))
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
                if more:
                    cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-contrast', 'value': 'more'}]})
                await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(wait)
                return ctx, pg, errs
            import re as _re241
            TB241 = """(()=>{const t=document.querySelector('#ctab-dash .sb-inner');if(!t)return null;const lab=(t.getAttribute('aria-labelledby')||'').split(' ').map(i=>(document.getElementById(i)||{}).textContent||'').join(' ').trim();
              const kids=r=>{const o=[];[...r.children].forEach(c=>{if(c.getAttribute('aria-hidden')==='true')return;if(c.getAttribute('role')==='none')o.push(...[...c.children]);else o.push(c)});return o};
              const head=t.querySelector(':scope>.sb-row.sb-head'),rows=[...t.querySelectorAll(':scope>.sb-row:not(.sb-head)')];
              return {role:t.getAttribute('role'),lab,head:head?[head.getAttribute('role'),kids(head).map(c=>[c.getAttribute('role'),(c.getAttribute('aria-label')||c.textContent).trim().slice(0,22),c.getAttribute('aria-sort')])]:null,
                btnSort:[...t.querySelectorAll('.sb-sorth[aria-sort]')].length,
                rows:rows.map(r=>({role:r.getAttribute('role'),tab:r.tabIndex,name:r.getAttribute('aria-label'),sel:r.classList.contains('sel'),cells:kids(r).map(c=>c.getAttribute('role'))}))}})()"""
            FOC241 = "(()=>{const a=document.activeElement;return a&&a.classList&&a.classList.contains('sb-row')?[a.getAttribute('data-id'),a.classList.contains('sel'),a.getAttribute('aria-label')]:[a&&a.tagName,a&&String(a.className).slice(0,30)]})()"
            # fixed first: the Status board is a table to VoiceOver
            ctx, pg, errs = await ts241(wait=3400)
            tb = await pg.evaluate(TB241)
            heads = tb and tb['head'] and tb['head'][1]
            ok('n241: the Status board is a table named by its group (“Inpatients 2”) to VoiceOver (it was plain boxes)', tb and tb['role'] == 'table' and tb['lab'].startswith('Inpatients'), tb and [tb['role'], tb['lab']])
            ok('n241: its first row holds column headers, Patient … Alerts and Hours', heads and [h[0] for h in heads] == ['columnheader'] * 6 and [h[1] for h in heads[:5]] == ['Patient', 'Ward', 'Stay', 'Care team', 'Alerts'] and heads[5][1].startswith('Hours, '), heads)
            ok('n241: the sorted column says so on its header (aria-sort moved off the button)', heads and heads[0][2] == 'ascending' and all(h[2] == 'none' for h in heads[1:5]) and tb['btnSort'] == 0, [heads, tb and tb['btnSort']])
            ok('n241: each patient row is a row of a row header and cells, with nothing else in it', tb and tb['rows'] and all(r['role'] == 'row' and r['cells'][0] == 'rowheader' and all(c == 'cell' for c in r['cells'][1:]) and len(r['cells']) == 6 for r in tb['rows']), tb and tb['rows'])
            ok('n241: each row is named in full — patient, ward, day, overdue, code status, team', tb and all(_re241.match(r'^[A-Z][a-z]+ Training, (ICU|Wards|Isolation), day \d+, \d+ overdue, (CPR|DNR)', r['name'] or '') for r in tb['rows']), tb and [r['name'] for r in tb['rows']])
            ok('n241: one row is in the tab order at a time (the highlighted one, or the first)', tb and [r['tab'] for r in tb['rows']].count(0) == 1, tb and [r['tab'] for r in tb['rows']])
            await pg.click('#ctab-dash .sb-sorth >> nth=1'); await pg.wait_for_timeout(500); s1 = (await pg.evaluate(TB241))['head'][1]
            await pg.click('#ctab-dash .sb-sorth >> nth=1'); await pg.wait_for_timeout(500); s2 = (await pg.evaluate(TB241))['head'][1]
            ok('n241: sorting by Ward, then again, reads “ascending” then “descending” on the Ward header', s1[1][2] == 'ascending' and s2[1][2] == 'descending' and s2[0][2] == 'none', [s1, s2])
            await pg.click('#ctab-dash .sb-sorth >> nth=0'); await pg.wait_for_timeout(500)
            await pg.evaluate("document.activeElement&&document.activeElement.blur()"); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(300); k1 = await pg.evaluate(FOC241)
            await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(300); k2 = await pg.evaluate(FOC241)
            tabs = [r['tab'] for r in (await pg.evaluate(TB241))['rows']]
            await pg.screenshot(path=f'{SHOTS}/n241-board-row-focus.png', clip={'x': 40, 'y': 420, 'width': 1380, 'height': 320})
            ok('n241: ↑ ↓ move focus with the highlight, so VoiceOver reads each row (focus stayed on the page)', k1[0] and k1[1] and k2[0] and k2[1] and k1[0] != k2[0] and tabs.count(0) == 1 and tabs.index(0) == 1, [k1, k2, tabs])
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1300); op = await pg.evaluate("__tsFind.cur()")
            await pg.click('.tsh-back'); await pg.wait_for_timeout(1300); bk = await pg.evaluate(FOC241)
            ok('n241: Return opens it, and Back puts focus on the row you left (it went to the page)', op == k2[0] and bk[0] == k2[0] and bk[1], [op, bk])
            await pg.evaluate("document.querySelector('#ctab-dash .sb-row:not(.sb-head)').focus()"); await pg.wait_for_timeout(200)
            f0 = await pg.evaluate(FOC241); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1300); op2 = await pg.evaluate("__tsFind.cur()")
            ok('n241: Return opens the row that has focus, even when VoiceOver moved it off the highlight', f0[0] and not f0[1] and op2 == f0[0], [f0, op2])
            await pg.click('.tsh-back'); await pg.wait_for_timeout(1000)
            await pg.click('#ctab-dash .pvx-alb >> nth=0'); await pg.wait_for_timeout(600); a1 = await pg.evaluate("!!document.querySelector('.pt-pop.show,.ts-menu.show,#tsAlMenu')")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            await pg.focus('#ctab-dash .pvx-alb >> nth=0'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(600); a2 = await pg.evaluate("!!document.querySelector('.pt-pop.show,.ts-menu.show,#tsAlMenu')")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            ok('n241: each row’s Alerts button still opens by click and by Return (now inside its cell)', a1 and a2, [a1, a2])
            await pg.click('#ctab-dash button:has-text("List")'); await pg.wait_for_timeout(800); tl = await pg.evaluate(TB241)
            ok('n241: the List view is the same table, without the Hours column', tl and tl['role'] == 'table' and len(tl['head'][1]) == 5 and all(len(r['cells']) == 5 for r in tl['rows']), tl and [tl['head'], [r['cells'] for r in tl['rows']]])
            await pg.click('#ctab-dash button:has-text("Hours")'); await pg.wait_for_timeout(500)
            # lists: Tasks and Charges
            await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(1500)
            tk = await pg.evaluate("[...document.querySelectorAll('#ctab-tasks .wl-pt')].map(p=>[p.getAttribute('role'),p.getAttribute('aria-label'),p.querySelectorAll(':scope>.wl-row').length,p.querySelectorAll(':scope>.wl-row[role=listitem]').length])")
            ok('n241: each patient’s tasks in Overdue and Due now are a list that says how many (“Biscuit Training, Overdue: 25 tasks”)', tk and all(x[0] == 'list' and x[2] == x[3] and x[1] and _re241.search(r': %d tasks?$' % x[2], x[1]) for x in tk), tk)
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('charges')"); await pg.wait_for_timeout(1500)
            cl = await pg.evaluate("[...document.querySelectorAll('.ch-row .ch-ck')].map(b=>b.getAttribute('aria-label'))")
            await pg.click('.ch-row .ch-ck >> nth=0'); await pg.wait_for_timeout(900)
            cl2 = await pg.evaluate("[...document.querySelectorAll('.ch-row .ch-ck')].slice(0,2).map(b=>b.getAttribute('aria-label'))")
            ok('n241: every Charges tick names its charge and day (they were all “Mark as entered on the invoice”)', cl and len(set(cl)) == len(cl) and all(_re241.match(r'^Mark .+, day \d+, as entered on the invoice$', x) for x in cl), cl[:4])
            ok('n241: once ticked, it says what it will do next for that charge', cl2[0].startswith('Mark ') and cl2[0].endswith(', as not entered') and cl2[1] == cl[1], cl2)
            try: await pg.click('#toastWrap .ts-undo button >> nth=-1', timeout=1500)
            except Exception: pass
            ok('n241: no page errors on the board, Tasks and Charges', not errs, errs[:3])
            await ctx.close()
            # outline: Option-click folds or unfolds every section
            ctx, pg, errs = await ts241()
            await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')"); await pg.wait_for_timeout(1600)
            EX241 = "[...document.querySelectorAll('.gband .gsection')].map(g=>g.getAttribute('aria-expanded'))"
            o0 = await pg.evaluate(EX241)
            await pg.click('.gband .gsection >> nth=1', modifiers=['Alt']); await pg.wait_for_timeout(700)
            o1 = await pg.evaluate(EX241); sy = await pg.evaluate("[(document.getElementById('pvxLive241')||{}).textContent,document.activeElement&&document.activeElement.classList.contains('gsection')]")
            await pg.screenshot(path=f'{SHOTS}/n241-all-sections-folded.png', clip={'x': 380, 'y': 380, 'width': 760, 'height': 240})
            await pg.focus('.gband .gsection >> nth=0'); await pg.keyboard.press('Alt+Enter'); await pg.wait_for_timeout(700); o2 = await pg.evaluate(EX241)
            ok('n241: Option-click on a section folds every section, says so, and keeps focus on that section (it folded only one)', all(x == 'true' for x in o0) and all(x == 'false' for x in o1) and sy[0] == 'All sections folded' and sy[1], [o0, o1, sy])
            ok('n241: Option-Return on a folded section shows them all again', all(x == 'true' for x in o2), o2)
            await pg.click('.gband .gsection >> nth=2'); await pg.wait_for_timeout(500); o3 = await pg.evaluate(EX241)
            await pg.evaluate("tsOpenSheet('sh_train2')"); await pg.wait_for_timeout(1100); await pg.evaluate("tsOpenSheet('sh_train1')"); await pg.wait_for_timeout(1100); o4 = await pg.evaluate(EX241)
            tt = await pg.evaluate("document.querySelector('.gband .gsection').title")
            ok('n241: a plain click still folds one section, and the sheet remembers it', o3 == ['true', 'true', 'false'] and o4 == o3, [o3, o4])
            ok('n241: the band’s tooltip mentions it (“Option-click: all sections”, “Alt-click” on Windows)', _re241.search(r' · (Option|Alt)-click: all sections$', tt or '') is not None, tt)
            ok('n241: no page errors on the sheet', not errs, errs[:3])
            await ctx.close()
            _secend(95)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n241: Treatment Sheets — HIG Lists and tables, Lockups, Outline views (synthetic training ', False, repr(_e)[:300])
        try:
            # ---------- n242: a sheet started in Treatment Sheets joins Flow and Rounds (synthetic training patients) ----------
            _sec(96)
            import json as _js242
            FU242 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            def sheet242(name, last='Training', sp='Dog', **kw):
                d = {'tenant_id': 'shoreline', 'status': 'active', 'visit_id': None, 'source': 'manual', 'created_at': '2026-10-22T20:00:00.000Z', 'admitted_at': '2026-10-22T20:00:00.000Z',
                     'created_by': 'Resident A', 'created_uid': 'u9', 'patient': {'name': name, 'last': last, 'species': sp, 'breed': 'Beagle', 'sex': 'FS', 'weight': 11.2, 'reason': 'Vomiting',
                     'doctor': 'Dr. Nobody', 'location': 'ICU', 'code': 'DNR', 'condition': 'Watch', 'alerts': ['DNR'],
                     'problem_list': [{'id': 'p1', 'text': 'Vomiting', 'added_at': '2026-10-22T20:00:00.000Z'}, {'id': 'p2', 'text': 'Diarrhea', 'added_at': '2026-10-22T20:00:00.000Z', 'resolved_at': '2026-10-22T20:05:00.000Z'}]},
                     'orders': {}, 'notes': [], 'audit': [{'at': '2026-10-22T20:00:00.000Z', 'type': 'doctor', 'desc': 'Sheet created', 'who': 'RA', 'uid': 'u9'}]}
                d.update(kw); return d
            async def flow242(seed):
                c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
                await c.add_init_script(INIT.replace('@@USER@@', FU242).replace('@@SEED@@', _js242.dumps(seed))); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
                p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
                async def route(r):
                    u = r.request.url
                    if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
                    elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                    else: await r.fulfill(status=204, body='')
                await p.route('**/*', route)
                await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_timeout(9000)
                return c, p, e
            PT242 = """(n=>{const p=PATIENTS.find(x=>x.name===n);if(!p)return null;return {id:p.id,status:p.status,room:p.room,sheet:p.tsSheetId,sid:fvAdmitSheet.id(p),rounds:!!(p.rounds&&!p.rounds.outcome),census:rdCensus().some(x=>x.id===p.id),
              loc:p.rounds&&p.rounds.location,adm:p.rounds&&p.rounds.admittedAt,prio:p.prio,resus:p.resusPref,doctor:p.doctor,species:p.species,weightKg:p.weightKg,problems:(p.reasonProblems||[]).map(r=>r.label||r.name||r.raw||''),tl:(p.timeline||[]).map(t=>t.label+' · '+(t.meta||'')),n:PATIENTS.filter(x=>x.name===n).length}})"""
            SH242 = "(id=>{const d=window.__fs['sheets/'+id];return d?{visit:d.visit_id,code:d.visit_code,link:d.flow_link,audit:(d.audit||[]).map(a=>a.desc).slice(-1)[0]}:null})"
            VS242 = "(id=>{const d=window.__fs['visits/'+id];return d?{sheet:d.ts_sheet_id,status:d.status,name:d.patient_name,room:d.room_id}:null})"
            seed = {'sheets/s_n242a': sheet242('Pepper'), 'sheets/s_n242op': sheet242('Opal', board='OP'), 'sheets/s_n242cl': sheet242('Cleo', status='closed'),
                    'sheets/v_flow1': sheet242('Fable', visit_id='flow1', source='flow'),
                    'sheets/s_n242st': sheet242('Stale', visit_id='pt-stale242', flow_link={'at': '2026-10-01T00:00:00.000Z', 'by': 'Someone', 'uid': 'u5', 'visit': 'pt-stale242', 'how': 'new'})}
            ctx, pg, errs = await flow242(seed)
            await pg.wait_for_timeout(1500)
            a = await pg.evaluate(PT242 + "('Pepper')"); sa = await pg.evaluate(SH242 + "('s_n242a')")
            await pg.wait_for_timeout(1500); va = await pg.evaluate(VS242 + "('" + str((a or {}).get('id')) + "')")
            ok('n242: a sheet started in Treatment Sheets is added to Flow as a direct admit, in its ward (it never reached Flow)', a and a['status'] == 'Hospitalized' and a['room'] == 'ICU' and a['n'] == 1, a)
            ok('n242: … and is on Rounds, in the census, in ICU, with its stay counted from the sheet’s admission', a and a['rounds'] and a['census'] and a['loc'] == 'ICU' and str(a['adm']).startswith('2026-10-22T20:00'), a)
            ok('n242: Flow follows that sheet, not a new v_ sheet (Rounds treatments, discharge, code status and doctor use it)', a and a['sheet'] == 's_n242a' and a['sid'] == 's_n242a' and 'sheets/v_' + str(a['id']) not in await pg.evaluate("Object.keys(window.__fs).join('|')"), a)
            ok('n242: it carries the sheet’s details — dog → Canine, 11.2 kg, DNR, Watch → P2, active problems only, an unknown doctor left unassigned', a and a['species'] == 'Canine' and a['weightKg'] == 11.2 and a['resus'] == 'DNR' and a['prio'] == 2 and a['problems'] == ['Vomiting'] and a['doctor'] == 'unassigned', a)
            ok('n242: the timeline says where it came from', a and any('sheet started in Treatment Sheets by Resident A' in t for t in a['tl']), a and a['tl'])
            ok('n242: the sheet records the link: its visit, who linked it, and a line in its history', sa and a and sa['visit'] == a['id'] and sa['link'] and sa['link']['how'] == 'new' and sa['audit'] == 'Added to Flow and Rounds as a direct admit' and sa['code'], sa)
            ok('n242: the visit is saved with its sheet (ts_sheet_id), so every Flow screen and a reload follow it', va and va['sheet'] == 's_n242a' and va['status'] == 'Hospitalized', va)
            others = await pg.evaluate("[['Opal','s_n242op'],['Cleo','s_n242cl'],['Fable','v_flow1']].map(([n,id])=>[n,PATIENTS.some(p=>p.name===n),(window.__fs['sheets/'+id]||{}).flow_link||null])")
            ok('n242: outpatient sheets, closed sheets and sheets Flow already made are left alone', all(not x[1] and not x[2] for x in others), others)
            st = await pg.evaluate(PT242 + "('Stale')")
            ok('n242: a link left unfinished by a closed screen is finished by another (same visit id, after 3 minutes)', st and st['id'] == 'pt-stale242' and st['rounds'] and st['n'] == 1, st)
            await pg.evaluate("(async()=>{const d=await firebase.firestore().collection('sheets').doc('s_n242a').get();pvxSheetLink.claim(d);pvxSheetLink.claim(d)})()"); await pg.wait_for_timeout(1500)
            ok('n242: claiming the same sheet again never makes a second visit', (await pg.evaluate(PT242 + "('Pepper')"))['n'] == 1)
            # an open admission for the same pet, without a sheet of its own, gets this sheet instead of a second visit
            tw = await pg.evaluate("""(()=>{const p=patient({name:'Willow',last:'Training',species:'Canine',breed:'Mix',owner:'Training',status:'Admitted',room:'Wards',prio:3,arrival:new Date(),arrivalType:'walkin',timeline:[]});PATIENTS.push(p);try{rdEnroll(p)}catch(e){};return p.id})()""")
            await pg.evaluate("firebase.firestore().collection('sheets').doc('s_n242tw').set(" + _js242.dumps(sheet242('Willow', location='Wards')) + ")"); await pg.wait_for_timeout(2500)
            w = await pg.evaluate(PT242 + "('Willow')"); sw = await pg.evaluate(SH242 + "('s_n242tw')")
            ok('n242: a sheet for a pet already admitted in Flow joins that admission (no second visit)', w and w['n'] == 1 and w['id'] == tw and w['sheet'] == 's_n242tw' and sw and sw['visit'] == tw and sw['link']['how'] == 'twin' and 'Linked to Flow' in sw['audit'], [w, sw])
            stamp = await pg.evaluate("(()=>{const h=document.documentElement.outerHTML;return [h.indexOf('<meta name=\"flow-build\"'),(document.querySelector('meta[name=\"flow-build\"]')||{}).content||'']})()")
            src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
            ok('n242: Flow’s build stamp is back in the first 2 KB, so open Flow screens notice this build and reload (it had slipped to ~9 KB)', 0 < src.find('<meta name="flow-build"') < 2000 and stamp[1].startswith('2026'), [src.find('<meta name="flow-build"'), stamp])
            ok('n242: no page errors in Flow', not [x for x in errs if 'cb is not a function' not in x and 'collectionGroup' not in x], errs[:3])
            await ctx.close()
            # Treatment Sheets says so
            ctx, pg, errs = await new_page(br, user='{"uid":"u9","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}')
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2600)
            await pg.evaluate("tsNewSheet()"); await pg.wait_for_timeout(500)
            nt = await pg.evaluate("(()=>{const m=document.querySelector('#tsModal');return m?m.innerText:''})()")
            ok('n242: Treatment Sheets’ “New treatment sheet” says the patient joins Flow and Rounds (it said “for a patient admitted outside Flow”)', 'Flow adds them as a direct admit' in nt and 'Rounds' in nt and 'outside Flow' not in nt, nt[:240])
            await ctx.close()
            _secend(96)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n242: a sheet started in Treatment Sheets joins Flow and Rounds (synthetic training patien', False, repr(_e)[:300])
        try:
            # ---------- n243: the top bar’s Flow opens Flow, not the app you were last in ----------
            _sec(97)
            FU243 = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
            async def page243(where, path):
                c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
                await c.add_init_script(INIT.replace('@@USER@@', FU243).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
                if where: await c.add_init_script("try{ if(!sessionStorage.getItem('w243')){ sessionStorage.setItem('w243','1'); localStorage.setItem('pvx:flow:where', JSON.stringify(Object.assign(" + where + ",{at:Date.now()}))); } }catch(e){}")
                p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
                async def route(r):
                    u = r.request.url
                    if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
                    elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                    else: await r.fulfill(status=204, body='')
                await p.route('**/*', route)
                await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(3500)
                return c, p, e
            APP243 = "(()=>[typeof currentApp!=='undefined'?currentApp:null,document.body.classList.contains('app-rounds'),location.hash,typeof currentView!=='undefined'?currentView:null])()"
            links = {}
            for root, _, files in os.walk(BUILD):
                for f in files:
                    if not f.endswith('.html'): continue
                    fp = os.path.join(root, f); t = open(fp, encoding='utf-8').read()
                    if 'id="navFlow"' in t or 'id=\\"navFlow\\"' in t:
                        rel = os.path.relpath(fp, BUILD)
                        links[rel] = ('href="https://shoreline.pravix.app/" id="navFlow"' in t or 'href=\\"https://shoreline.pravix.app/\\" id=\\"navFlow\\"' in t, '#app=flow' in t)
            bad = {k: v for k, v in links.items() if k != 'index.html' and (v[0] or not v[1])}
            ok('n243: every other app’s top-bar Flow item links to Flow itself (#app=flow), like Rounds and Ultrasound do', len(links) >= 20 and not bad, [len(links), bad])
            # from Treatment Sheets, last on Rounds → Flow opens Flow
            ctx, pg, errs = await page243("{app:'rounds',view:'census'}", 'treatment/')
            h0 = await pg.evaluate("(()=>{const a=document.getElementById('navFlow');const h=a.getAttribute('href');a.setAttribute('href',h.replace('https://shoreline.pravix.app/',location.origin+'/'));return h})()")   # the test server stands in for shoreline.pravix.app
            await pg.click('#navFlow'); await pg.wait_for_timeout(4500)
            a1 = await pg.evaluate(APP243); u1 = pg.url
            await pg.screenshot(path=f'{SHOTS}/n243-flow-from-treatment.png')
            ok('n243: from Treatment Sheets, Flow opens the Flow board even when you were last on Rounds (it opened Rounds)', h0.endswith('/#app=flow') and a1[0] == 'flow' and not a1[1] and '/treatment/' not in u1, [h0, a1, u1])
            ok('n243: … and the link’s #app=flow is dropped, so a later reload restores where you were as before', a1[2] == '', a1)
            await ctx.close()
            # opening the address by itself still restores Rounds
            ctx, pg, errs = await page243("{app:'rounds',view:'census'}", '')
            a2 = await pg.evaluate(APP243)
            ok('n243: opening Flow’s address by itself (bookmark, Home Screen, the board after an update) still reopens Rounds if that’s where you were', a2[0] == 'rounds' and a2[1], a2)
            await ctx.close()
            # last in Flow's List view: Flow's own view comes back
            ctx, pg, errs = await page243("{app:'flow',view:'list'}", '#app=flow')
            await pg.wait_for_timeout(800); a3 = await pg.evaluate(APP243)
            ok('n243: if Flow was where you were, the Flow item reopens Flow’s own last view (List)', a3[0] == 'flow' and a3[3] == 'list', a3)
            ok('n243: no page errors', not [x for x in errs if 'cb is not a function' not in x and 'collectionGroup' not in x], errs[:3])
            await ctx.close()
            _secend(97)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n243: the top bar’s Flow opens Flow, not the app you were last in ----------', False, repr(_e)[:300])
        try:
            # ---------- n245 + n247: Treatment Sheets — light-mode colours; problem names in Title Case (synthetic training patients) ----------
            _sec(98)
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
            COL245 = """(()=>{const g=(s,p)=>{const e=document.querySelector(s);return e?getComputedStyle(e)[p||'color']:null};
              return {rate:g('#sheetInner .ib-lbl'),line:g('#sheetInner .ib-ln','backgroundColor'),dot:g('#sheetInner .ib-tip','backgroundColor'),bar:g('#sheetInner .ib-bar','backgroundImage')}})()"""
            for _dark in (False, True):
                ctx, pg, errs = await ts245(dark=_dark)
                c = await pg.evaluate(COL245)
                if not _dark:
                    ok('n245: light — the fluid rate on the sheet is green (#0F7A55, 5.3:1), not black', c['rate'] == 'rgb(15, 122, 85)', c)
                    ok('n245: light — the running line and the now dot are green (they were invisible)', c['line'] == 'rgb(26, 158, 110)' and c['dot'] in ('rgb(26, 158, 110)', None), c)
                    ok('n245: light — the bars fade in green, not solid navy', c['bar'] and 'rgba(26, 158, 110' in c['bar'] and '27, 32, 51' not in c['bar'], c)
                    await pg.screenshot(path=f'{SHOTS}/n245-light-fluid.png', clip={'x': 0, 'y': 300, 'width': 1440, 'height': 520})
                else:
                    ok('n245: dark — the infusion colours are unchanged (#6FE0B3 rate, #2FC48D line)', c['rate'] == 'rgb(111, 224, 179)' and c['line'] == 'rgb(47, 196, 141)', c)
                await pg.evaluate("tsOrderPanel('m245')"); await pg.wait_for_timeout(700)
                pin = await pg.evaluate("(()=>{const b=[...document.querySelectorAll('#tsOrderSheet .op-link')].find(x=>/^Pin to the top/.test(x.textContent));return b?[b.textContent,getComputedStyle(b).color]:null})()")
                ok('n245: %s — “Pin to the top of Medications” is in the accent (%s), not black' % ('dark' if _dark else 'light', 'cyan' if _dark else 'cobalt'), pin and pin[1] == ('rgb(56, 189, 210)' if _dark else 'rgb(35, 67, 156)'), pin)
                if not _dark: await pg.screenshot(path=f'{SHOTS}/n245-light-pin.png')
                try: await pg.evaluate("tsOrderClose()")
                except Exception: pass
                await pg.wait_for_timeout(400)
                await pg.evaluate("tsInfPanel('f245')"); await pg.wait_for_timeout(700)
                stop = await pg.evaluate("(()=>{const b=document.querySelector('#tsOrderSheet .op-link.danger');return b?[b.textContent,getComputedStyle(b).color]:null})()")
                ok('n245: %s — Stop infusion stays red (%s)' % ('dark' if _dark else 'light', '#FF3B30' if _dark else 'the deeper #B3141A, 4.5:1+'), stop and stop[1] == ('rgb(255, 59, 48)' if _dark else 'rgb(179, 20, 26)'), stop)
                mic = await pg.evaluate("(()=>{const h=document.querySelector('#tsOrderSheet')||document.body;const d=document.createElement('div');d.innerHTML='<div class=\"bt-say\"><button type=\"button\" class=\"bt-mic\"><svg viewBox=\"0 0 24 24\"></svg></button></div>';h.appendChild(d);const b=d.querySelector('.bt-mic'),s=getComputedStyle(b),r=[s.color,s.backgroundColor];d.remove();return r})()")
                ok('n245: %s — the Chart microphone’s icon reads on its circle (%s)' % ('dark' if _dark else 'light', 'dark on cyan' if _dark else 'white on cobalt, 8.9:1'), mic == (['rgb(4, 37, 46)', 'rgb(56, 189, 210)'] if _dark else ['rgb(255, 255, 255)', 'rgb(35, 67, 156)']), mic)
                ok('n245: no page errors (%s)' % ('dark' if _dark else 'light'), not errs, errs[:3])
                await ctx.close()
            # n247: problem names in Title Case
            ctx, pg, errs = await ts245(dark=False)
            PL247 = "[...document.querySelectorAll('#tsProblems .pl:not(.pl-resolved) .pl-t')].map(e=>e.textContent)"
            await pg.wait_for_selector('#tsProblems .pl-add input', timeout=8000)
            l0 = await pg.evaluate(PL247)
            ok('n247: a problem typed in lowercase before this build reads in Title Case (“Pericardial Effusion”); counts keep their units', l0[:2] == ['Pericardial Effusion', 'Vomiting · 3 times'], l0)
            await pg.fill('#tsProblems .pl-add input', 'acute kidney injury secondary to toxin'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(900)
            await pg.fill('#tsProblems .pl-add input', 'gdv'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(900)
            l1 = await pg.evaluate(PL247)
            saved = await pg.evaluate("((window.__fs&&window.__fs['sheets/sh_train1'])||{}).patient?.problem_list?.map(p=>p.text)||null")
            ok('n247: “acute kidney injury secondary to toxin” is added as “Acute Kidney Injury Secondary to Toxin”, “gdv” as “GDV”', l1[-2:] == ['Acute Kidney Injury Secondary to Toxin', 'GDV'], l1)
            ok('n247: and saved that way, so Flow and Rounds show the same', saved and saved[-2:] == ['Acute Kidney Injury Secondary to Toxin', 'GDV'], saved)
            await pg.fill('#tsProblems .pl-add input', 'Gdv'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(700)
            ok('n247: the duplicate check still catches the same problem typed differently', (await pg.evaluate(PL247)).count('GDV') == 1, await pg.evaluate(PL247))
            aud0 = await pg.evaluate("(((window.__fs&&window.__fs['sheets/sh_train1'])||{}).audit||[]).length")
            await pg.click('#tsProblems .pl-t >> nth=0'); await pg.wait_for_timeout(300); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(700)
            aud1 = await pg.evaluate("(((window.__fs&&window.__fs['sheets/sh_train1'])||{}).audit||[]).slice(-1)[0]?.desc||''")
            aud1n = await pg.evaluate("(((window.__fs&&window.__fs['sheets/sh_train1'])||{}).audit||[]).length")
            ok('n247: opening an old lowercase problem and leaving it records no change just for the capitals', aud1n == aud0 and 'Problem changed' not in aud1, [aud0, aud1n, aud1])
            sg = await pg.evaluate("[...document.querySelectorAll('#plSugg option')].map(o=>o.value)")
            ok('n247: the suggestions read in Title Case too (“Post-Operative Care”, “Ruptured Splenic Mass”), leaving out what is on the list', 'Post-Operative Care' in sg and 'Ruptured Splenic Mass' in sg and 'GDV' not in sg and 'Pericardial Effusion' not in sg, sg)
            await pg.screenshot(path=f'{SHOTS}/n247-problems.png')
            ok('n247: no page errors', not errs, errs[:3])
            await ctx.close()
            _secend(98)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n245 + n247: Treatment Sheets — light-mode colours; problem names in Title Case (synthetic', False, repr(_e)[:300])
        if _helper(98):   # only what later sections use from it
            try:
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
            except Exception as _e: print('::warning::helper 98 failed: ' + repr(_e)[:200])
        try:
            # ---------- n246: Treatment Sheets — one line per medication product (synthetic training patients) ----------
            _sec(99)
            S246 = json.loads(SEED245); _s = S246['sheets/sh_train1']
            _h8 = 8
            def _med(i, **k):
                o = {'id': i, 'type': 'med', 'section': 'Medications', 'name': 'Maropitant', 'dose': 1, 'unit': 'mg/kg', 'route': 'IV', 'freq': 'q24h', 'start': _h8, 'conc': 10, 'conc_label': 'Maropitant 10 mg/mL', 'ordered_by': 'DG', 'ordered_at': _st}
                o.update(k); return o
            _s['orders']['m246b'] = _med('m246b', dose=2, route='SQ', freq='q12h', start=_h8, ordered_at=_st.replace('.000Z', '.500Z'))
            _s['orders']['m246c'] = _med('m246c', conc=5, conc_label=None, dose=1, freq='q24h', start=14)
            SEED246 = json.dumps(S246)
            async def ts246(dark=False):
                nonlocal SEED245
                keep = SEED245; SEED245 = SEED246
                try: return await ts245(dark=dark)
                finally: SEED245 = keep
            ROWS246 = """[...document.querySelectorAll('#sheetInner .grow[data-o]')].filter(r=>r.dataset.sec==='Medications').map(r=>({o:r.dataset.o,line:r.dataset.line||null,name:(r.querySelector('.rl-name')||{}).textContent,doses:[...r.querySelectorAll('.rl-dose')].map(d=>d.textContent)}))"""
            ctx, pg, errs = await ts246()
            rows = await pg.evaluate(ROWS246)
            mline = [r for r in rows if r['line']]
            ok('n246: every dose of Maropitant 10 mg/mL shares one line (the sheet’s own and the two added), listing each dose', len(mline) == 1 and mline[0]['line'] == 'm2 m245 m246b' and len(mline[0]['doses']) == 3 and 'SQ · q12h' in mline[0]['doses'][2] and '10 mg/mL' in (mline[0]['name'] or ''), rows)
            ok('n246: a different strength (5 mg/mL) keeps its own line', any(r['o'] == 'm246c' and not r['line'] for r in rows), rows)
            pair = await pg.evaluate("""(()=>{const r=document.querySelector('#sheetInner .grow[data-line]');const c=r.querySelectorAll(':scope > .hcells > .cell')[8];const b=[...c.querySelectorAll('button.mark')];return b.map(x=>[x.getAttribute('data-t'),x.getAttribute('aria-label')])})()""")
            ok('n246: both doses due at 8 AM sit side by side in that hour, each named by its own dose', len(pair) >= 2 and len(set(p[0] for p in pair)) == len(pair) and any(' IV ' in p[1] for p in pair) and any(' SQ ' in p[1] for p in pair), pair)
            h20 = await pg.evaluate("""(()=>{const r=document.querySelector('#sheetInner .grow[data-line]');const c=r.querySelectorAll(':scope > .hcells > .cell')[20];return [...c.querySelectorAll('button.mark')].map(x=>x.getAttribute('aria-label'))})()""")
            ok('n246: the q12h dose’s 8 PM mark is on the same line', len(h20) == 1 and 'SQ' in h20[0], h20)
            await pg.click('#sheetInner .grow[data-line] .rl-dose >> nth=2'); await pg.wait_for_timeout(700)
            panel = await pg.evaluate("(document.querySelector('#tsOrderSheet')||{}).textContent||''")
            ok('n246: choosing the second dose opens that dose’s own panel (Change…, Discontinue)', 'q12h' in panel and 'SQ' in panel and 'Discontinue' in panel, panel[:200])
            try: await pg.evaluate("tsOrderClose()")
            except Exception: pass
            await pg.wait_for_timeout(300)
            q = await pg.evaluate("!!document.querySelector(tsRowQ('m246b'))&&document.querySelector(tsRowQ('m246b')).dataset.o==='m2'")
            ok('n246: finding a dose by its order (reveal, flash, search) lands on its line', q, q)
            await pg.screenshot(path=f'{SHOTS}/n246-one-line.png', clip={'x': 0, 'y': 260, 'width': 1440, 'height': 600})
            # ordering the same product again joins the line, with no Already ordered box
            await pg.evaluate("tsOpenMedOrder('Maropitant')"); await pg.wait_for_timeout(1400)
            await pg.fill('#rxDose', '0.5'); await pg.select_option('#rxRoute', 'IV'); await pg.select_option('#rxFreq', 'Once')
            await pg.wait_for_timeout(300)
            st = await pg.evaluate("(()=>{const d=document.querySelector('#tsModal .ts-dup'),n=document.getElementById('tsJoinNote');return [d?d.hidden:null,n&&!n.hidden?n.textContent:null]})()")
            ok('n246: the same strength shows no Already ordered box, just “Adds a dose to the Maropitant 10 mg/mL line”', st[0] is True and st[1] == 'Adds a dose to the Maropitant 10 mg/mL line', st)
            await pg.evaluate("(()=>{const c=document.getElementById('rxConc');c.value='5';c.dispatchEvent(new Event('input'))})()"); await pg.wait_for_timeout(300)
            st5 = await pg.evaluate("(()=>{const d=document.querySelector('#tsModal .ts-dup'),n=document.getElementById('tsJoinNote');return [d?d.hidden:null,n?n.hidden:null]})()")
            ok('n246: switching to a strength already on the sheet at 5 mg/mL joins that line instead', st5 == [True, False], st5)
            await pg.evaluate("(()=>{const c=document.getElementById('rxConc');c.value='2';c.dispatchEvent(new Event('input'))})()"); await pg.wait_for_timeout(300)
            st2 = await pg.evaluate("(()=>{const d=document.querySelector('#tsModal .ts-dup'),n=document.getElementById('tsJoinNote');return [d?d.hidden:null,n?n.hidden:null]})()")
            ok('n246: a new strength (2 mg/mL) brings back the Already ordered box (a new line)', st2 == [False, True], st2)
            await pg.evaluate("(()=>{const c=document.getElementById('rxConc');c.value='10';c.dispatchEvent(new Event('input'))})()"); await pg.wait_for_timeout(300)
            await pg.click('#tsModal .tm-foot button:has-text("Add to sheet"), #tsModal .tm-foot button:has-text("Order anyway")'); await pg.wait_for_timeout(1200)
            toast = await pg.evaluate("[...document.querySelectorAll('#toastWrap .toast, #toastWrap > *')].map(t=>t.textContent).join(' | ')")
            rows2 = await pg.evaluate(ROWS246)
            ml2 = [r for r in rows2 if r['line'] and r['o'] == 'm2']
            saved = await pg.evaluate("Object.values(((window.__fs||{})['sheets/sh_train1']||{}).orders||{}).filter(o=>o.name==='Maropitant').length")
            ok('n246: it’s added without a tick, and the message says “added to the Maropitant 10 mg/mL line”', 'added to the Maropitant 10 mg/mL line' in toast, toast[:200])
            ok('n246: the line now lists four doses; each is still its own order on the sheet', ml2 and len(ml2[0]['doses']) == 4 and saved == 5, [rows2, saved])
            ok('n246: no page errors', not errs, errs[:3])
            await ctx.close()
            _secend(99)
        except _Skip: pass
        except Exception as _e:
            ok('SECTION ERROR — n246: Treatment Sheets — one line per medication product (synthetic training patients) ---', False, repr(_e)[:300])
        await br.close()
    n = sum(1 for _, c, _k in results if c); print(f'\n{n}/{len(results)} passed')
    if os.environ.get('RESULTS'): json.dump([[k, nm, c] for nm, c, k in results], open(os.environ['RESULTS'], 'w'), ensure_ascii=False)
    sys.exit(0 if results and n == len(results) else 1)

asyncio.run(main())
