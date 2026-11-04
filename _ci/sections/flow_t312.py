"""Pravix Rounds — the n312 build's own checks: HIG Multitasking, Offering help, Onboarding and Playing audio (Nov 3 2026),
on Rounds' own page. Chromium and WebKit."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, seed=None, user=FU, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    sd = SEED if seed is None else json.dumps(dict(json.loads(SEED), **seed))
    await c.add_init_script(INIT.replace('@@USER@@', user).replace('@@SEED@@', sd)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    return c


async def open_(c, path='/rounds/', demo=True, wait=2800):
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}{path}'); await p.wait_for_timeout(wait)
    await p.evaluate("(()=>{const t=window.toast;window.__toasts=[];window.toast=function(m){window.__toasts.push(String(m));try{return t.apply(this,arguments)}catch(e){}}})()")
    if demo: await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    return p, e

AE = "(()=>{const a=document.activeElement,m=document.getElementById('rdMode');return {id:a&&a.id,a:a&&a.dataset&&(a.dataset.a||a.dataset.act)||null,inMode:!!(m&&m.contains(a))}})()"


async def admitted(br):
    """a real visit admitted in Flow (so it's in the store, not session-only sample data)"""
    c = await ctx(br); p, e = await open_(c, path='/', demo=False)
    adm = await p.evaluate("""(async()=>{const x=patient({name:'Clover',last:'Linked',owner:'Synthetic',status:'Exam',room:'Room 1',arrival:new Date(Date.now()-90*60000),prio:2,doctor:'unassigned',species:'Feline',timeline:[]});
      PATIENTS.push(x); renderAll(); await new Promise(r=>setTimeout(r,400)); completePatient(x,'Admitted'); renderAll(); await new Promise(r=>setTimeout(r,1500));
      return {id:x.id, doc:window.__fs['visits/'+x.id]||null}})()""")
    await c.close(); return adm


HIDE = """(s=>{Object.defineProperty(document,'visibilityState',{get:()=>s,configurable:true});Object.defineProperty(document,'hidden',{get:()=>s==='hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'))})"""


@section(id='t312', title='n312 · Rounds follows the HIG Multitasking, Offering help, Onboarding and Playing audio pages',
         apps=['rounds'], topics=['rounds', 'multitasking', 'help', 'tooltips', 'onboarding', 'audio'], engines=('chromium', 'webkit'))
async def s_t312(br):
    # ---- Multitasking: a change made just before switching away is saved at once
    adm = await admitted(br)
    if not adm['doc']:
        ok('Multitasking · (Flow admitted the test patient)', False, adm); return
    c = await ctx(br, seed={'visits/' + adm['id']: adm['doc']}); p, e = await open_(c, demo=False, wait=3500)
    await p.evaluate("document.querySelector('.rd-row[data-pid=%s] .rd-name').click()" % json.dumps(adm['id'])); await p.wait_for_timeout(700)
    before = await p.evaluate("JSON.stringify(window.__fs['visits/'+%s])" % json.dumps(adm['id']))
    await p.evaluate("document.querySelector('.rd-row.open [data-act=review-mark]').click(); (%s)('hidden')" % HIDE)
    await p.wait_for_timeout(80)
    after = await p.evaluate("JSON.stringify(window.__fs['visits/'+%s])" % json.dumps(adm['id']))
    ok('Multitasking · Mark reviewed, then switching away at once: it’s saved right away (it waited 250 ms, which a suspended iPad tab may never get)', after != before, (len(before or ''), len(after or '')))
    await p.evaluate("(()=>{ const a=rdShiftAuto(); rdShift=rdShiftSeen=(a==='morning'?'evening':'morning'); renderRdCensus(); })()")
    await p.evaluate("(%s)('visible')" % HIDE); await p.wait_for_timeout(150)
    ok('…and coming back puts the right shift up at once (it could show the last shift for 30 s)', await p.evaluate("rdShift===rdShiftAuto()"))
    ok('no page errors (multitasking)', not newerr(e), e[:3]); await c.close()

    # ---- Offering help: Rounds' shortcuts, and tooltips that say what a control does
    c = await ctx(br); p, e = await open_(c)
    await p.keyboard.press('Shift+Slash'); await p.wait_for_timeout(500)
    t = await p.evaluate("(document.querySelector('.pvx-ks-box')||{}).innerText||''")
    ok('Offering help · ? on Rounds lists Rounds’ own keys: search, Rounds mode’s ←/→, R, Esc (it listed Flow’s)', 'Rounds mode' in t and 'Search the census' in t and 'Mark reviewed' in t, t[:160])
    ok('…and nothing Rounds doesn’t have (⌘K “Search patients, rooms and commands”)', 'rooms and commands' not in t, t[:160])
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.keyboard.press('Slash'); await p.wait_for_timeout(200)
    ok('…the keys it lists work: / searches the census', await p.evaluate("document.activeElement.id") == 'rdSearch')
    await p.keyboard.press('Escape'); await p.evaluate("document.activeElement.blur()")
    await p.evaluate("document.getElementById('rdStartBtn').click()"); await p.wait_for_timeout(500)
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(300)
    pos = await p.evaluate("((document.querySelector('#rdMode')||{}).innerText||'').match(/(\\d+) OF (\\d+)/i)?.[1]")
    ok('…and → moves to the next patient in Rounds mode', pos == '2', pos)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(700)
    tt = await p.evaluate("""(()=>{const r=document.querySelector('.rd-row.open');const f=[...r.querySelectorAll('.rd-fin-edit[data-fin-key]')].map(e=>[e.title,e.getAttribute('aria-label')]);
      const d=r.querySelector('[data-act=diag-toggle]'), ty=r.querySelector('[data-act=type-menu]'), o=r.querySelector('[data-act=auth-custom]');
      return {f, d:d&&[d.title,d.getAttribute('aria-label')], ty:ty&&ty.title, o:o&&o.title}})()""")
    ok('…an amount’s tooltip names what it edits, and VoiceOver hears which amount (“Edit amount” three times; VoiceOver heard only “$2,560”)',
       [x[0] for x in tt['f']][:3] == ['Edit low end', 'Edit high end', 'Edit deposit'] and tt['f'][0][1].startswith('Low end: '), tt['f'])
    ok('…a diagnostic’s toggle says what it will do (“Toggle pending / completed”)', tt['d'] and tt['d'][0] in ('Mark completed', 'Mark pending') and tt['d'][0].split()[-1] in tt['d'][1].lower(), tt['d'])
    ok('…and tooltips start with a verb instead of repeating the name (“Admission type”, “Other amounts”)', tt['ty'] == 'Change admission type' and tt['o'] == 'Authorize a different number of hours', tt)
    ok('…on a Mac or PC there’s no touch tip', not await p.evaluate("!!document.querySelector('.rd-tip')"))
    ok('no page errors (help)', not newerr(e), e[:3]); await c.close()

    # ---- Onboarding: one tip, on a touchscreen, until it's dismissed
    c = await ctx(br, viewport={'width': 1024, 'height': 1366}, has_touch=True, device_scale_factor=2); p, e = await open_(c)
    tip = await p.evaluate("(()=>{const t=document.querySelector('#rdList .rd-tip');const x=t&&t.querySelector('.rd-tip-x');return t&&[t.innerText.replace(/\\s+/g,' ').trim(), t===document.getElementById('rdList').firstElementChild, Math.round(x.getBoundingClientRect().height), x.getAttribute('aria-label')]})()")
    ok('Onboarding · on an iPad, one short tip above the census says touch and hold reaches Share, Move up or down and Show in Flow', tip and 'Touch and hold a patient' in tip[0] and tip[1] and tip[2] >= 44 and tip[3] == 'Dismiss tip', tip)
    await p.evaluate("document.querySelector('#rdList .rd-row .rd-name').click()"); await p.wait_for_timeout(700)
    ok('…it stays through redraws until dealt with', await p.evaluate("!!document.querySelector('#rdList .rd-tip')"))
    await p.click('.rd-tip-x'); await p.wait_for_timeout(300)
    ok('…✕ dismisses it', not await p.evaluate("!!document.querySelector('.rd-tip')"))
    await p.reload(); await p.wait_for_timeout(2800); await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1200)
    ok('…and it doesn’t come back', not await p.evaluate("!!document.querySelector('.rd-tip')"))
    ok('no page errors (onboarding)', not newerr(e), e[:3]); await c.close()
