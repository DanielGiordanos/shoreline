"""Pravix Flow — the n374 build's own checks (Nov 13 2026): HIG Text fields + Toggles + Virtual keyboards (Flow's first look;
Treatment n291, Rounds n329). Keyboards that fit the text (no autocorrect in clinical and list-backed fields, capitals on names);
a Clear button in sheets on iPhone and iPad; the iPhone tab bar steps aside while the keyboard is up; the family form's Language
and Text size are radio groups; the family zoom button isn't a pressed toggle."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if w <= 820: o.update(has_touch=True, is_mobile=w < 700)
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
    return c, p, e

SEED7 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned',95],['Milo','Chen','Waiting','Lobby',2,'unassigned',42],['Rocky','Hale','Exam','Room 1',2,D[0],35]].forEach(r=>{
    PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:'Canine',arrival:new Date(now-r[6]*60000),reason:'Vomiting',
      timeline:[{label:'Checked in',at:new Date(now-r[6]*60000)}]})); });
  renderAll(); return PATIENTS.length; })()"""
KB = """((sel)=>[...document.querySelectorAll(sel)].map(i=>[i.id||i.placeholder.slice(0,16), i.getAttribute('autocorrect'), i.getAttribute('spellcheck'), i.getAttribute('autocapitalize')]))"""
FAM = """(()=>{ const p=PATIENTS.find(x=>x.name==='Rocky'); p.consentForm={id:'cf1',status:'family',lang:'en',owner:{name:'Jordan Lee'}}; window.fvConsent.open(p); })()"""
GRP = """((cls)=>{ const g=document.querySelector('#cfFamily .'+cls); if(!g) return null; const B=[...g.querySelectorAll('button')], a=document.activeElement;
  return {role:g.getAttribute('role'), name:g.getAttribute('aria-label'), roles:[...new Set(B.map(b=>b.getAttribute('role')))], pressed:B.some(b=>b.hasAttribute('aria-pressed')),
    checked:B.findIndex(b=>b.getAttribute('aria-checked')==='true'), tabs:B.map(b=>b.tabIndex).join(','), focus:B.indexOf(a), lang:(document.querySelector('#cfFamily .cff')||{}).lang,
    ts:document.getElementById('cfFamily').getAttribute('data-ts')}; })"""
CLR = """(()=>{ const b=document.querySelector('.pvx-clr'), a=document.activeElement; if(!b||b.hidden) return {shown:false, focus:a&&a.id};
  const r=b.getBoundingClientRect(), f=a.getBoundingClientRect(), s=getComputedStyle(b,'::before');
  return {shown:true, name:b.getAttribute('aria-label'), inside:r.left>=f.left&&r.right<=f.right+1&&r.top>=f.top-1&&r.bottom<=f.bottom+1, hit:Math.round(r.width-2*parseFloat(s.left||0)), focus:a.id,
    x:r.left+r.width/2, y:r.top+r.height/2}; })()"""


@section(id='t374', title='n374 · Text fields, Toggles, Virtual keyboards: keyboards that fit the text, Clear in sheets on touch, the tab bar steps aside, family Language and Text size are radio groups',
         apps=['flow'], topics=['text-fields', 'toggles', 'keyboards', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t374(br):
    c, p, e = await ctx(br)
    await p.evaluate(SEED7); await p.wait_for_timeout(400)
    # keyboards that fit the text
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(400)
    await p.evaluate("[...document.querySelectorAll('#apArrival .ap-seg-btn')].find(b=>/ER transfer/.test(b.textContent)).click()"); await p.wait_for_timeout(500)
    a = await p.evaluate(f"({KB})('#apReason,#apTransferNotes,#apBreed,#apRefHosp')")
    ok('Virtual keyboards · Add patient: no autocorrect or spelling marks in Reason for visit, Transfer notes, Breed and Referring hospital (autocorrect could change a complaint or a breed)',
       len(a) == 4 and all(x[1] == 'off' and x[2] == 'false' for x in a), a)
    await p.evaluate("closeAddPatient&&closeAddPatient()"); await p.wait_for_timeout(300)
    await p.evaluate("openTriageEdit(PATIENTS[0])"); await p.wait_for_timeout(500)
    t = await p.evaluate(f"({KB})('#triEditChief,#triEditHistory,#triEditBy')")
    ok('…Edit triage: none in the complaint, history and clinician; the clinician’s name gets a capital on each word', len(t) == 3 and all(x[1] == 'off' and x[2] == 'false' for x in t) and t[2][3] == 'words', t)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("openIntake(PATIENTS[0])"); await p.wait_for_timeout(500)
    ik = await p.evaluate(f"({KB})('#intakeModal input:not([type=checkbox]):not([type=radio]),#intakeModal textarea')")
    med = await p.evaluate("[...document.querySelectorAll('#intakeModal input')].filter(i=>/medications/i.test(i.placeholder)).map(i=>i.getAttribute('autocapitalize'))")
    ok('…Intake: none in any field, and Current medications gets no automatic capital (drug names)', len(ik) >= 5 and all(x[1] == 'off' and x[2] == 'false' for x in ik) and med == ['off'], ik)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    # no Clear on a Mac
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(400); await p.click('#apName'); await p.keyboard.type('Cookie'); await p.wait_for_timeout(200)
    ok('…on a Mac (a pointer and Esc), text fields show no extra Clear button', not (await p.evaluate(CLR))['shown'])
    await p.evaluate("closeAddPatient&&closeAddPatient()"); await p.wait_for_timeout(300)
    # family form
    await p.evaluate(FAM); await p.wait_for_timeout(800)
    l0 = await p.evaluate(f"({GRP})('cff-lang')"); s0 = await p.evaluate(f"({GRP})('cff-ts')")
    ok('Toggles · the family form’s Language and Text size are radio groups (English · Español, Standard · Large · Extra large), the chosen one checked and the only Tab stop (they were pressed buttons)',
       l0 and s0 and l0['role'] == s0['role'] == 'radiogroup' and l0['roles'] == s0['roles'] == ['radio'] and not l0['pressed'] and not s0['pressed'] and l0['checked'] == 0 and s0['checked'] == 0
       and l0['tabs'] == '0,-1' and s0['tabs'] == '0,-1,-1', [l0, s0])
    await p.evaluate("document.querySelector('#cfFamily .cff-lang [aria-checked=\"true\"]').focus()")
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(500); l1 = await p.evaluate(f"({GRP})('cff-lang')")
    await p.keyboard.press('ArrowLeft'); await p.wait_for_timeout(500); l2 = await p.evaluate(f"({GRP})('cff-lang')")
    ok('…→ chooses Español (the form turns Spanish) and focus stays on it through the redraw; ← goes back to English',
       l1['checked'] == 1 and l1['lang'] == 'es' and l1['focus'] == 1 and l2['checked'] == 0 and l2['lang'] == 'en' and l2['focus'] == 0, [l1, l2])
    await p.evaluate("document.querySelector('#cfFamily .cff-ts [aria-checked=\"true\"]').focus()")
    await p.keyboard.press('ArrowRight'); await p.wait_for_timeout(400); s1 = await p.evaluate(f"({GRP})('cff-ts')")
    await p.evaluate("document.querySelectorAll('#cfFamily .cff-ts button')[2].click()"); await p.wait_for_timeout(400); s2 = await p.evaluate(f"({GRP})('cff-ts')")
    ok('…→ in Text size chooses Large and the text grows; a tap still chooses (Extra large), and no pressed state comes back',
       s1['checked'] == 1 and s1['ts'] == 'l' and s1['focus'] == 1 and s2['checked'] == 2 and not s2['pressed'], [s1, s2])
    f = {x[0]: x[3] for x in await p.evaluate(f"({KB})('#cffOwner,#cffAddr,#cffCity,#cffPet,#cffState')")}
    ok('Virtual keyboards · the family’s name, street, city and pet’s name get a capital on each word, and State gets capitals',
       f == {'cffOwner': 'words', 'cffAddr': 'words', 'cffCity': 'words', 'cffPet': 'words', 'cffState': 'characters'}, f)
    await p.evaluate("document.querySelector('#cfFamily .cff').insertAdjacentHTML('beforeend','<button type=\"button\" class=\"fvf-zbtn\" data-fvd=\"fzoom\" aria-pressed=\"false\">Make it bigger</button>')"); await p.wait_for_timeout(300)
    z = await p.evaluate("document.querySelector('#cfFamily [data-fvd=\"fzoom\"]').hasAttribute('aria-pressed')")
    ok('Toggles · the family’s zoom button (“Make it bigger” / “Make it smaller”) is an action named for what it does, not also a pressed toggle', z is False, z)
    ok('…no page errors (Mac)', not newerr(e), newerr(e))
    await c.close()

    # iPad: Clear in sheets
    c, p, e = await ctx(br, 820, 1180)
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(500)
    await p.tap('#apName'); await p.keyboard.type('Cookie'); await p.wait_for_timeout(300)
    k = await p.evaluate(CLR)
    ok('Text fields · iPad: a field in a sheet shows a Clear button at its trailing end while it has text (44 pt to tap)', k['shown'] and k['name'] == 'Clear' and k['inside'] and k['hit'] >= 44, k)
    await p.touchscreen.tap(k['x'], k['y']); await p.wait_for_timeout(300)
    k2 = await p.evaluate(CLR); v = await p.evaluate("document.getElementById('apName').value")
    ok('…tapping it empties the field, keeps the keyboard on it, and the button goes away until something is typed', v == '' and not k2['shown'] and k2['focus'] == 'apName', [v, k2])
    await p.tap('#apAge'); await p.keyboard.type('4'); await p.wait_for_timeout(300)
    ok('…not on fields with their own trailing controls (Age with Years · Months)', not (await p.evaluate(CLR))['shown'])
    ok('…no page errors (iPad)', not newerr(e), newerr(e))
    await c.close()

    # iPhone: the tab bar steps aside while the keyboard is up
    c, p, e = await ctx(br, 390, 844)
    tb0 = await p.evaluate("getComputedStyle(document.querySelector('#subnavFlow #switcher')).display")
    await p.tap('#globalSearch'); await p.wait_for_timeout(300)
    tb1 = await p.evaluate("[document.documentElement.classList.contains('pvx-kb'), getComputedStyle(document.querySelector('#subnavFlow #switcher')).display]")
    await p.evaluate("document.activeElement.blur()"); await p.wait_for_timeout(300)
    tb2 = await p.evaluate("[document.documentElement.classList.contains('pvx-kb'), getComputedStyle(document.querySelector('#subnavFlow #switcher')).display]")
    ok('Virtual keyboards · iPhone: while typing, the bottom tab bar steps aside (in Safari it rides above the keyboard) and comes back after',
       tb0 != 'none' and tb1 == [True, 'none'] and tb2[0] is False and tb2[1] == tb0, [tb0, tb1, tb2])
    ok('…no page errors (iPhone)', not newerr(e), newerr(e))
    await c.close()
