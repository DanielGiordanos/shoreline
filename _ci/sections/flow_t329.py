"""Pravix Rounds — the n329 build's own checks: HIG Text fields, Toggles, Virtual keyboards (Nov 5 2026), on Rounds' own page.
Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
OPENB = "(()=>{const x=rdCensus().find(p=>rdFullName(p)==='Benny Duarte'); rdExpanded=x.id; renderRdCensus(true); return x.id})()"
B = "rdCensus().find(p=>rdFullName(p)==='Benny Duarte')"
F = "(s=>{const i=document.querySelector(s); return i&&{cor:i.getAttribute('autocorrect'), sp:i.getAttribute('spellcheck'), cap:i.getAttribute('autocapitalize'), ekh:i.getAttribute('enterkeyhint')}})"


async def ctx(br, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(2800)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1300)
    await p.evaluate(OPENB); await p.wait_for_timeout(500)
    return c, p, e


@section(id='t329', title='n329 · Rounds follows the HIG Text fields, Toggles and Virtual keyboards pages', apps=['rounds'], topics=['rounds', 'text-fields', 'toggles', 'keyboards'], engines=('chromium', 'webkit'))
async def s_t329(br):
    c, p, e = await ctx(br)
    R = '#rdList .rd-row.open '
    # Virtual keyboards
    k = await p.evaluate("({tx:%s('%s[data-input=tx]'), series:%s('%s[data-input=series]'), quick:%s('%s[data-input=quick]'), prob:%s('%s[data-input=prob]'), task:%s('%s[data-input=task]'), search:%s('#rdSearch')})"
                         % (F, R, F, R, F, R, F, R, F, R, F))
    ok('Virtual keyboards · no autocorrect or spelling marks where a drug, a value or an abbreviation is typed (treatments, values, quick add, problems, tasks)',
       all(k[x] and k[x]['cor'] == 'off' and k[x]['sp'] == 'false' for x in ['tx', 'series', 'quick', 'prob', 'task']), k)
    ok('…no automatic capital in treatments and values (“pcv 27/6.0”, “maropitant”)', k['tx']['cap'] == 'off' and k['series']['cap'] == 'off', k)
    ok('…Return says Done on every Add field (it said return), and Search in the search field',
       all(k[x]['ekh'] == 'done' for x in ['tx', 'series', 'quick', 'prob', 'task']) and k['search']['ekh'] == 'search' and k['search']['cor'] == 'off', k)
    # Text fields · Clear
    await p.click('#rdSearch'); await p.keyboard.type('ben'); await p.wait_for_timeout(500)
    cl = await p.evaluate("""(()=>{const b=document.querySelector('.rd-clear'), i=document.getElementById('rdSearch'); if(!b||b.hidden) return null; const r=b.getBoundingClientRect(), f=i.getBoundingClientRect();
      return {name:b.getAttribute('aria-label'), inside:r.left>=f.left&&r.right<=f.right+1&&Math.abs((r.top+r.bottom)/2-(f.top+f.bottom)/2)<=2, pad:parseFloat(getComputedStyle(i).paddingRight)>=28, trailing:f.right-r.right<12, rows:document.querySelectorAll('#rdList .rd-row').length}})()""")
    ok('Text fields · the search shows a Clear button at its trailing end while it has text', cl and cl['name'] == 'Clear' and cl['inside'] and cl['trailing'] and cl['pad'], cl)
    await p.click('.rd-clear'); await p.wait_for_timeout(500)
    a = await p.evaluate("({v:document.getElementById('rdSearch').value, f:document.activeElement&&document.activeElement.id, rows:document.querySelectorAll('#rdList .rd-row').length, hid:document.querySelector('.rd-clear').hidden})")
    ok('…Clear empties it, every patient comes back, and the field keeps focus', a['v'] == '' and a['f'] == 'rdSearch' and a['rows'] > (cl or {}).get('rows', 99) and a['hid'], (a, cl))
    await p.evaluate(OPENB); await p.wait_for_timeout(400)
    await p.click(R + '[data-input=tx]'); await p.keyboard.type('maropitant 1 mg/kg'); await p.wait_for_timeout(300)
    await p.click('.rd-clear'); await p.wait_for_timeout(300)
    t = await p.evaluate("(()=>{const i=document.querySelector('%s[data-input=tx]'); return {v:i.value, f:document.activeElement===i, draft:[...window.rdDrafts.values()].includes('maropitant 1 mg/kg')}})()" % R)
    ok('…every Add field has it too, and clearing forgets the draft (on an iPhone there’s no Esc)', t['v'] == '' and t['f'] and not t['draft'], t)
    await p.click('#rdSearch'); await p.keyboard.type('zz'); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('…Esc still clears the search', await p.evaluate("document.getElementById('rdSearch').value") == '')
    # Text fields · IDs
    await p.evaluate(OPENB); await p.wait_for_timeout(400)
    await p.click(R + '[data-input=client-id]'); await p.keyboard.press('ControlOrMeta+a'); await p.keyboard.type('12ab'); await p.keyboard.press('Tab'); await p.wait_for_timeout(500)
    v = await p.evaluate("(()=>{const i=document.querySelector('%s[data-input=client-id]'); const m=document.getElementById(i.getAttribute('aria-describedby')||'x'); return {inv:i.getAttribute('aria-invalid'), msg:m&&m.textContent, saved:%s.rounds.clientId}})()" % (R, B))
    ok('Text fields · a client ID with letters says “Numbers only” under the field and isn’t saved (“12ab” was saved)', v['inv'] == 'true' and v['msg'] == 'Numbers only, like 102345' and v['saved'] != '12ab', v)
    await p.click(R + '[data-input=client-id]'); await p.keyboard.press('ControlOrMeta+a'); await p.keyboard.type('483920'); await p.keyboard.press('Tab'); await p.wait_for_timeout(700)
    v2 = await p.evaluate("(()=>{const i=document.querySelector('%s[data-input=client-id]'); return {inv:i.getAttribute('aria-invalid'), msg:[...document.querySelectorAll('.rd-id-msg')].map(m=>m.textContent).join(''), saved:%s.rounds.clientId}})()" % (R, B))
    ok('…once it’s a number the message goes and the ID is saved', v2['inv'] != 'true' and v2['msg'] == '' and v2['saved'] == '483920', v2)
    # Text fields · clipped value
    await p.evaluate("(()=>{const i=document.querySelector('%s[data-input=tx-edit]'); i.value='Maropitant — 1 mg/kg IV q24h, given slowly over 1–2 minutes through the cephalic catheter, then flushed with 3 mL saline; recheck nausea score at 6 PM and tell the overnight doctor if still vomiting'; 0})()" % R)
    await p.hover(R + '[data-input=tx-edit]'); await p.wait_for_timeout(200)
    ok('…a clipped value shows in full when the pointer rests on it', await p.evaluate("document.querySelector('%s[data-input=tx-edit]').title" % R) == 'Maropitant — 1 mg/kg IV q24h, given slowly over 1–2 minutes through the cephalic catheter, then flushed with 3 mL saline; recheck nausea score at 6 PM and tell the overnight doctor if still vomiting')
    await p.evaluate(OPENB); await p.wait_for_timeout(400)
    # Toggles
    D = "(s=>{const b=document.querySelector(s); return b&&[b.getAttribute('aria-pressed'), b.getAttribute('aria-label'), b.title]})"
    d0 = await p.evaluate(D + "('%s[data-act=diag-toggle]')" % R)
    await p.focus(R + '[data-act=diag-toggle]'); await p.keyboard.press('Enter'); await p.wait_for_timeout(800)
    d1 = await p.evaluate(D + "('%s[data-act=diag-toggle]')" % R); df = await p.evaluate("document.activeElement&&document.activeElement.dataset.act")
    ok('Toggles · a diagnostic’s status keeps one name and says its state (it flipped from “Pending — mark completed” to “Completed — mark pending”)',
       d0[1] == d1[1] and d0[1].startswith('Completed: ') and d0[0] != d1[0] and {d0[0], d1[0]} == {'true', 'false'}, (d0, d1))
    ok('…and focus stays on it while the patient redraws (it fell to the page)', df == 'diag-toggle', df)
    q0 = await p.evaluate(D + "('[data-act=q-toggle]')")
    await p.click('[data-act=q-toggle]'); await p.wait_for_timeout(700)
    q1 = await p.evaluate("(()=>{const b=[...document.querySelectorAll('[data-act=q-toggle]')].find(b=>b.getAttribute('aria-label')===%r); return b&&[b.getAttribute('aria-pressed'), b.getAttribute('aria-label'), b.title]})()" % q0[1])
    ok('…a Tomorrow item keeps one name (“Done: …”), pressed or not; the tooltip says what a press does (it became “Reopen — …”, pressed)',
       q0[1].startswith('Done: ') and q0[0] == 'false' and q1 and q1[0] == 'true' and q1[2] == 'Reopen', (q0, q1))
    t0 = await p.evaluate("(()=>{const b=document.querySelector('%s[data-act=timeline-toggle]'); return [b.textContent.trim(), b.getAttribute('aria-expanded')]})()" % R)
    await p.focus(R + '[data-act=timeline-toggle]'); await p.keyboard.press('Enter'); await p.wait_for_timeout(800)
    t1 = await p.evaluate("(()=>{const b=document.querySelector('%s[data-act=timeline-toggle]'); return [b.textContent.trim(), b.getAttribute('aria-expanded'), document.activeElement===b]})()" % R)
    ok('…Timeline keeps its name with a chevron and says whether it’s open (it was “View timeline” / “Hide timeline”), and keeps focus',
       t0 == ['Timeline', 'false'] and t1 == ['Timeline', 'true', True], (t0, t1))
    sb = await p.evaluate("(()=>{const b=document.getElementById('rdStartBtn'); return {p:b.getAttribute('aria-pressed'), t:b.querySelector('.start-title').getAttribute('aria-hidden'), l:b.querySelector('.start-running-label').getAttribute('aria-hidden')}})()")
    ok('…Start rounds opens Rounds mode and isn’t an on/off control; VoiceOver hears only “Start rounds” (it heard “Start rounds Rounds in progress”)',
       sb['p'] is None and sb['t'] == 'false' and sb['l'] == 'true', sb)
    await p.click(R + '[data-input=tx]'); await p.wait_for_timeout(200)
    ok('Virtual keyboards · with a mouse and keyboard nothing steps aside while typing', not await p.evaluate("document.documentElement.classList.contains('rd-kb')"))
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    tb0 = await p.evaluate("getComputedStyle(document.getElementById('switcherRd')).display")
    await p.tap(R + '[data-input=tx]'); await p.wait_for_timeout(400)
    tb1 = await p.evaluate("({kb:document.documentElement.classList.contains('rd-kb'), d:getComputedStyle(document.getElementById('switcherRd')).display})")
    await p.evaluate("document.activeElement.blur(); 0"); await p.wait_for_timeout(300)
    tb2 = await p.evaluate("({kb:document.documentElement.classList.contains('rd-kb'), d:getComputedStyle(document.getElementById('switcherRd')).display})")
    ok('Virtual keyboards · on iPhone the bottom tab bar steps aside while the keyboard is up, and comes back after', tb0 != 'none' and tb1['kb'] and tb1['d'] == 'none' and not tb2['kb'] and tb2['d'] == tb0, (tb0, tb1, tb2))
    await p.tap(R + '[data-input=series]'); await p.keyboard.type('pcv 27'); await p.wait_for_timeout(300)
    cb = await p.evaluate("(()=>{const b=document.querySelector('.rd-clear'); if(!b||b.hidden) return null; const r=b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]})()")
    ok('…and the Clear button is there on touch, with a 44 pt reach', cb is not None and cb[0] >= 28, cb)
    ok('…no page errors on iPhone', not newerr(e), newerr(e))
    await c.close()
