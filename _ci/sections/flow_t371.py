"""Pravix Flow — the n371 build's own checks (Nov 13 2026): HIG Color wells + Combo boxes (Flow's first look).
Referring hospital lists every hospital, recent ones first, with addresses that wrap; On the way offers the towns families most
often come from; Breed and Referring hospital have a pull-down button on a Mac (not on touch), out of the Tab order. Typed
values are kept as typed and never added to a list. Flow has no colour wells."""
import os
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, w=1440, h=900, touch=False):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch or w < 700: o.update(has_touch=True, is_mobile=True)
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

DOG = "(()=>{ const s=document.getElementById('apSpecies'); s.value=[...s.options].find(o=>/canine|dog/i.test(o.value+o.text)).value; s.dispatchEvent(new Event('change',{bubbles:true})); })()"
ARRIVE = "(k)=>{ const b=[...document.querySelectorAll('#apModal button,#apModal [role=radio]')].find(x=>new RegExp(k,'i').test(x.textContent)); b.click(); }"
PANEL = """(id)=>{ const p=document.getElementById(id), vis=p.classList.contains('open')&&p.getBoundingClientRect().height>4;
  const opts=[...p.querySelectorAll('[role=option]')], heads=[...p.querySelectorAll('.pvx-grp')].map(h=>h.textContent.trim());
  const cut=[...p.querySelectorAll('.hv-opt *')].slice(0,600).filter(el=>el.children.length===0&&el.scrollWidth>el.clientWidth+1).length;
  return {open:vis, n:opts.length, first:opts.slice(0,3).map(o=>(o.querySelector('.hv-name')||o).textContent.trim()), heads, cut}; }"""
CBX = """(id)=>{ const i=document.getElementById(id), b=i.parentNode.querySelector('.pvx-cbx'); if(!b) return null; const r=b.getBoundingClientRect(), ir=i.getBoundingClientRect();
  return {label:b.getAttribute('aria-label'), tab:b.tabIndex, ctl:b.getAttribute('aria-controls'), exp:b.getAttribute('aria-expanded'), shown:getComputedStyle(b).display!=='none'&&r.width>0,
    inside:r.left>=ir.left&&r.right<=ir.right+1&&r.top>=ir.top-1&&r.bottom<=ir.bottom+1, x:r.left+r.width/2, y:r.top+r.height/2, focus:document.activeElement===i}; }"""


@section(id='t371', title='n371 · Color wells and Combo boxes: the whole hospital list, recent first; towns families come from; a pull-down button on a Mac',
         apps=['flow'], topics=['combo-boxes', 'text-fields'], engines=('chromium', 'webkit'))
async def s_t371(br):
    src = open(os.path.join(BUILD, 'index.html'), encoding='utf-8').read()
    ok('Color wells · Flow has no colour well or colour picker to check (its colours carry meaning and aren’t chosen)', 'type="color"' not in src and "type='color'" not in src, 'colour input found')

    c, p, e = await ctx(br)
    await p.evaluate("try{ localStorage.removeItem('pvx:flow:refhosp'); }catch(e){}")
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(600)
    await p.evaluate(DOG); await p.wait_for_timeout(300)
    await p.evaluate("document.getElementById('apName').focus()")
    b = await p.evaluate(f"({CBX})('apBreed')")
    ok('Combo boxes · Breed has a pull-down button inside the field on a Mac: “Show breeds”, controls the list, out of the Tab order',
       b and b['shown'] and b['inside'] and b['label'] == 'Show breeds' and b['tab'] == -1 and b['ctl'] == 'apBreedPanel', b)
    await p.mouse.click(b['x'], b['y']); await p.wait_for_timeout(400)
    s1 = await p.evaluate(f"({PANEL})('apBreedPanel')"); b1 = await p.evaluate(f"({CBX})('apBreed')")
    await p.mouse.click(b['x'], b['y']); await p.wait_for_timeout(300)
    s2 = await p.evaluate(f"({PANEL})('apBreedPanel')"); b2 = await p.evaluate(f"({CBX})('apBreed')")
    ok('…clicking it opens the breed list (Mixed Breed Dog first) with the cursor in the field; clicking again closes it',
       s1['open'] and s1['n'] > 100 and 'Mixed Breed Dog' in s1['first'][0] and b1['exp'] == 'true' and b1['focus'] and not s2['open'] and b2['exp'] == 'false' and b2['focus'], [s1, b1, s2, b2])
    await p.fill('#apBreed', 'Pomsky cross'); await p.keyboard.press('Tab'); await p.wait_for_timeout(200)
    bv = await p.evaluate("document.getElementById('apBreed').value")
    ok('…a breed that isn’t in the list is kept as typed', bv == 'Pomsky cross', bv)

    # Referring hospital
    await p.evaluate(f"({ARRIVE})('Transfer')"); await p.wait_for_timeout(400)
    await p.evaluate("document.getElementById('apRefHosp').focus()"); await p.wait_for_timeout(400)
    h1 = await p.evaluate(f"({PANEL})('apRefHospPanel')"); total = await p.evaluate("CT_VET_HOSPITALS.length")
    ok('Referring hospital · an empty field lists every hospital (it stopped at 60, A to about H), A to Z, with no address cut off',
       h1['open'] and h1['n'] == total and h1['heads'] == [] and h1['cut'] == 0, [h1, total])
    rb = await p.evaluate(f"({CBX})('apRefHosp')")
    ok('…it has its pull-down button too (“Show hospitals”)', rb and rb['shown'] and rb['label'] == 'Show hospitals' and rb['tab'] == -1, rb)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    await p.mouse.click(rb['x'], rb['y']); await p.wait_for_timeout(400)
    h1b = await p.evaluate(f"({PANEL})('apRefHospPanel')")
    ok('…its button opens the list', h1b['open'] and h1b['n'] == total, h1b)
    pick = await p.evaluate("[...document.querySelectorAll('#apRefHospPanel .hv-opt')].find(o=>/Bethel Veterinary Hospital/.test(o.textContent)).querySelector('.hv-name').textContent")
    await p.evaluate("(()=>{ const o=[...document.querySelectorAll('#apRefHospPanel .hv-opt')].find(o=>/Bethel Veterinary Hospital/.test(o.textContent)); o.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true})); })()"); await p.wait_for_timeout(200)
    await p.fill('#apName', 'Combo Test'); await p.wait_for_timeout(100)
    await p.evaluate("document.getElementById('apCreate').click()"); await p.wait_for_timeout(900)
    made = await p.evaluate("[!document.getElementById('apModal').classList.contains('open'), (PATIENTS.find(x=>x.name==='Combo')||{}).referringHospital||null, JSON.parse(localStorage.getItem('pvx:flow:refhosp')||'[]')]")
    ok('…a transfer created with a hospital from the list remembers it on this workstation (the name only)', made[0] and made[1] == pick and made[2] == [pick], made)
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(600)
    await p.evaluate(f"({ARRIVE})('Transfer')"); await p.wait_for_timeout(400)
    await p.evaluate("document.getElementById('apRefHosp').focus()"); await p.wait_for_timeout(400)
    h2 = await p.evaluate(f"({PANEL})('apRefHospPanel')")
    ok('…next time it’s first, under “Recent”, then “All hospitals” (each hospital once)', h2['heads'] == ['Recent', 'All hospitals'] and h2['first'][0] == pick and h2['n'] == total, h2)
    await p.evaluate(DOG); await p.fill('#apRefHosp', 'Long Island Veterinary Specialists'); await p.wait_for_timeout(300)
    await p.fill('#apName', 'Typed Hospital'); await p.evaluate("document.getElementById('apCreate').click()"); await p.wait_for_timeout(900)
    two = await p.evaluate("[(PATIENTS.find(x=>x.name==='Typed')||{}).referringHospital||null, JSON.parse(localStorage.getItem('pvx:flow:refhosp')||'[]')]")
    ok('…a hospital typed by hand is kept as typed and isn’t added to the list', two[0] == 'Long Island Veterinary Specialists' and two[1] == [pick], two)

    # On the way
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(600)
    await p.evaluate(f"({ARRIVE})('On the way')"); await p.wait_for_timeout(1500)   # the arrival log has loaded
    await p.evaluate("(()=>{ const L=pvxOtw371.log(); [['shelton'],['milford'],['milford'],['06460'],['milford'],['shelton']].forEach(r=>L.push({town:r[0],predicted_min:20,actual_min:24})); })()")
    await p.evaluate("document.getElementById('otwFrom').blur()"); await p.click('#otwFrom'); await p.wait_for_timeout(300)
    t1 = await p.evaluate("(()=>{ const p=document.getElementById('otwTowns'); return {open:p.classList.contains('open'), head:(p.querySelector('.pvx-grp')||{}).textContent, towns:[...p.querySelectorAll('[data-town]')].map(b=>b.dataset.town), exp:document.getElementById('otwFrom').getAttribute('aria-expanded')}; })()")
    ok('On the way · an empty “Coming from” offers the places families most often come from (“Often from”: Milford, Shelton, 06460)',
       t1['open'] and t1['head'] == 'Often from' and t1['towns'] == ['Milford', 'Shelton', '06460'] and t1['exp'] == 'true', t1)
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    t2 = await p.evaluate("[document.getElementById('otwFrom').value, document.getElementById('otwTowns').classList.contains('open')]")
    ok('…↓ and Return choose the first one', t2 == ['Milford', False], t2)
    await p.fill('#otwFrom', 'mil'); await p.wait_for_timeout(300)
    t3 = await p.evaluate("[...document.querySelectorAll('#otwTowns [data-town]')].map(b=>b.dataset.town)")
    ok('…typing still matches towns as before', t3[:2] == ['Milford', 'New Milford'], t3)
    ok('…no page errors (Mac)', not newerr(e), newerr(e))
    await c.close()

    # touch: no pull-down button (combo boxes are a Mac control)
    c, p, e = await ctx(br, 820, 1180, touch=True)
    await p.evaluate("openAddPatient()"); await p.wait_for_timeout(600)
    tb = await p.evaluate(f"({CBX})('apBreed')")
    ok('iPad with touch · no pull-down button; the list opens when the field is tapped, as before', tb is None or not tb['shown'], tb)
    ok('…no page errors (iPad)', not newerr(e), newerr(e))
    await c.close()
