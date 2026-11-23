"""Pravix OR — the n390 build's own checks (Nov 15 2026): HIG Design principles, Accessibility, App icons.
Design principles: every step on a case can be undone (the confirmation carries Undo and ⌘Z), and the message waits while it's
pointed at; the live OR never presents a simulation as real (no "Simulated source", no demo summary on Analytics, no pretend
barcode scan); one name for the anesthesia role; the Schedule's hours say "8 AM", not "8 AM AM"; the case header skips empty
fields; on an iPhone the four sections fit one row and Cases is a list, not a table to scroll sideways.
Accessibility: primary buttons never put white words on the bright cyan; light-mode status words, the case tabs and the species
code reach 4.5 : 1; small text links take a 28 pt click on a Mac. App icons: OR has its own Home Screen icon, name and manifest,
and its shortcuts open Schedule, Cases and Display mode."""
import os, json, struct
import core
from core import ok, section, PORT, BUILD

DAY = '2026-10-23'   # the pinned day (core.PIN, 11:00 AM in Los Angeles)


def _sheet(i, name, species, breed, weight, code, proc, room, sched, dur, status, events, surgeon, typ='scheduled', lat=None, svc='Soft Tissue', owner='Training owner'):
    return ('sheets/or390_%d' % i, {
        'tenant_id': 'shoreline', 'status': 'active', 'board': 'IP',
        'patient': {'name': name, 'last': 'Training', 'species': species, 'breed': breed, 'weight': weight, 'age': '6y', 'sex': 'MN', 'owner': owner, 'code': code, 'reason': proc},
        'surgery': {'id': 'or390c%d' % i, 'date': DAY, 'sched': sched, 'dur': dur, 'roomId': room, 'procedure': proc, 'service': svc, 'surgeonId': surgeon,
                    'type': typ, 'priority': 'routine', 'laterality': lat, 'status': status, 'notes': '',
                    'events': [{'status': s, 't': t} for s, t in events]}})


# synthetic training patients, one case each
CASES = dict([
    _sheet(1, 'Biscuit', 'Canine', 'Labrador Retriever', 32, 'CPR', 'TPLO', 'or1', 480, 120, 'complete',
           [('arrived', 440), ('preop', 450), ('ready', 475), ('in_room', 480), ('procedure_started', 500), ('procedure_finished', 590), ('out_of_room', 600), ('complete', 640)], 'galano', lat='Left', svc='Orthopedics'),
    _sheet(2, 'Maple', 'Canine', 'Golden Retriever', 28, 'CPR', 'Hemilaminectomy', 'or1', 630, 150, 'procedure_started',
           [('arrived', 580), ('preop', 590), ('ready', 620), ('in_room', 630), ('anesthesia_started', 635), ('procedure_started', 642)], 'nolte', lat='Right', svc='Neurology', owner=''),
    _sheet(3, 'Pepper', 'Feline', 'Domestic Shorthair', 4.6, 'DNR', 'Mass Removal', 'or2', 615, 60, 'recovery',
           [('arrived', 570), ('preop', 575), ('ready', 605), ('in_room', 615), ('procedure_started', 625), ('procedure_finished', 640), ('out_of_room', 645), ('recovery', 648)], 'giannetto', lat='Left'),
    _sheet(4, 'Juniper', 'Canine', 'Border Collie', 19, 'CPR', 'Exploratory Laparotomy', 'or2', 690, 90, 'preop', [('arrived', 640), ('preop', 650)], 'giannetto', typ='emergency'),
    _sheet(5, 'Otis', 'Canine', 'French Bulldog', 12, '', 'Arthroscopy', 'or1', 795, 75, 'scheduled', [], 'galano', lat='Right', svc='Orthopedics'),
    _sheet(6, 'Willow', 'Feline', 'Maine Coon', 6.1, 'CPR', 'Cystotomy', 'or2', 840, 60, 'scheduled', [], 'nolte', typ='addon'),
])
SEED = json.dumps(dict(json.loads(core.SEED), **CASES))

CONTRAST = r"""(sel)=>{const P=s=>{const m=s.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0]};const rgba=s=>{const v=P(s);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
 const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};const L=c=>.2126*lin(c.r)+.7152*lin(c.g)+.0722*lin(c.b);
 const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
 function bgOf(el){const st=[];let e=el;while(e&&e.nodeType===1){const c=rgba(getComputedStyle(e).backgroundColor);if(c.a>0)st.push(c);if(c.a>=1)break;e=e.parentElement}
  let b=st.length&&st[st.length-1].a>=1?st.pop():rgba(getComputedStyle(document.body).backgroundColor);for(let i=st.length-1;i>=0;i--)b=over(st[i],b);return b}
 return [...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length).map(e=>{const f=rgba(getComputedStyle(e).color),b=bgOf(e);const ff=over(f,b);
  return [e.textContent.trim().slice(0,24), +((Math.max(L(ff),L(b))+.05)/(Math.min(L(ff),L(b))+.05)).toFixed(2)]})}"""
GRAD = r"""(sel)=>{const lin=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};const L=a=>.2126*lin(a[0])+.7152*lin(a[1])+.0722*lin(a[2]);
 const cr=(a,b)=>(Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05);
 return [...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length).map(e=>{const cs=getComputedStyle(e);const fg=cs.color.match(/[\d.]+/g).slice(0,3).map(Number);
  const stops=(cs.backgroundImage.match(/rgba?\([^)]*\)/g)||[]).concat(/rgba?\(0, 0, 0, 0\)/.test(cs.backgroundColor)?[]:[cs.backgroundColor]).map(s=>s.match(/[\d.]+/g).slice(0,3).map(Number));
  return [e.textContent.trim().slice(0,20), stops.length?+Math.min(...stops.map(s=>cr(fg,s))).toFixed(2):0]})}"""


async def open_or(br, vp=(1440, 900), dark=True, touch=False, path='/or/'):
    core.SEED, keep = SEED, core.SEED
    try:
        c, p, e = await core.new_page(br, vp=vp, dark=dark, touch=touch)
    finally:
        core.SEED = keep
    await c.add_init_script(core.PINJS)
    await p.goto(f'http://127.0.0.1:{PORT}{path}')
    await core.until(p, "typeof CASES!=='undefined'&&CASES.length>=6", 6000); await p.wait_for_timeout(600)
    return c, p, e


def png_size(path):
    d = open(path, 'rb').read(24); return struct.unpack('>II', d[16:24])


@section(id='t390', title='n390 · OR · Design principles, Accessibility, App icons: Undo for every step, nothing simulated on the live OR, one anesthesia label, 4.5:1 buttons and status words, iPhone rows, OR’s own Home Screen icon',
         apps=['or'], topics=['accessibility', 'behaviour', 'icons', 'color', 'layout', 'writing'], engines=('chromium', 'webkit'))
async def s_t390(br):
    html = open(os.path.join(BUILD, 'or', 'index.html'), encoding='utf-8').read()

    # ── App icons ──
    head = html[:html.find('</head>')]
    ok('App icons · OR names its own manifest, Home Screen icon and title (before, Add to Home Screen made a screenshot icon called “OR · Pravix”)',
       '<link rel="manifest" href="/or/manifest.webmanifest">' in head and '<link rel="apple-touch-icon" href="/assets/img/or-180.png">' in head
       and '<meta name="apple-mobile-web-app-title" content="OR">' in head and '<meta name="theme-color" content="#0D1730">' in head, '')
    mp = os.path.join(BUILD, 'or', 'manifest.webmanifest')
    m = json.load(open(mp)) if os.path.exists(mp) else {}
    sizes = {}
    for ic in m.get('icons', []):
        f = os.path.join(BUILD, ic['src'].lstrip('/'))
        sizes[ic['src']] = (png_size(f) if os.path.exists(f) else None, ic.get('purpose', 'any'))
    t180 = os.path.join(BUILD, 'assets', 'img', 'or-180.png')
    ok('…its manifest is its own (id /or/, so it never updates an installed Flow), with 192, 512 and maskable icons that exist at those sizes, and a 180 pt icon',
       m.get('id') == '/or/' and m.get('start_url') == '/or/' and m.get('scope') == '/or/' and m.get('short_name') == 'OR' and m.get('display') == 'standalone'
       and sizes.get('/assets/img/or-192.png', (None,))[0] == (192, 192) and sizes.get('/assets/img/or-512.png', (None,))[0] == (512, 512)
       and sizes.get('/assets/img/or-maskable-512.png') == ((512, 512), 'maskable') and os.path.exists(t180) and png_size(t180) == (180, 180), (m.get('id'), sizes))
    sc = [s['url'] for s in m.get('shortcuts', [])]
    ok('…and its shortcuts open OR’s places, Schedule and Display mode among them (n410: Add case and Find a case took Cases’ place)', '/or/#schedule' in sc and '/or/#display' in sc and all(u.startswith('/or/#') for u in sc) and 3 <= len(sc) <= 4, sc)

    c, p, e = await open_or(br, path='/or/#schedule')
    v = await p.evaluate("({view:UI.view, seg:(document.querySelector('#switcher .seg.active')||{}).dataset.view, hash:location.hash})")
    ok('…/or/#schedule opens on Schedule (and the address goes back to /or/)', v == {'view': 'schedule', 'seg': 'schedule', 'hash': ''}, v)
    await c.close()
    c, p, e = await open_or(br, path='/or/#display')
    d = await p.evaluate("document.body.classList.contains('display-mode')")
    ok('…/or/#display opens Display mode', d is True, d)
    await c.close()

    # ── Craft: the Schedule's hours ──
    c, p, e = await open_or(br)
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(500)
    hrs = await p.evaluate("[...document.querySelectorAll('.or-sched-hours .hrs>span')].map(s=>s.textContent.replace(/\\u00a0/g,' ').trim())")
    import re
    ok('Craft · the Schedule’s hours read “8 AM … 12 PM … 8 PM” (they read “8 AM AM”, “12 PM PM”)',
       len(hrs) >= 12 and all(re.fullmatch(r'\d{1,2} (AM|PM)', h) for h in hrs) and '12 PM' in hrs and '8 AM' in hrs, hrs[:8])

    # ── Familiarity: one name for the anesthesia role ──
    await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(400)
    team = await p.evaluate("[...document.querySelectorAll('.or-rnow-team')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())")
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(400)
    cases_sm = await p.evaluate("[...document.querySelectorAll('#casesBody td:nth-child(3) .sm')].map(x=>x.textContent.trim())")
    ok('Familiarity · the board says “Dr. Nolte · Anesthesia: Unassigned” (was “anesthesia Unassigned”)', any(x.startswith('Dr. Nolte · Anesthesia: Unassigned') for x in team) and not any(' anesthesia ' in x for x in team), team)
    ok('…and Cases says “Anesthesia: Unassigned” under each surgeon (was “Anesia · Unassigned”: Anesia is the app, not the role)',
       len(cases_sm) == 6 and all(x == 'Anesthesia: Unassigned' for x in cases_sm), cases_sm)

    # ── Craft: the case header skips empty fields ──
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(900)
    meta = await p.evaluate("document.querySelector('#caseHead .meta').textContent.replace(/\\s+/g,' ').trim()")
    ok('Craft · the case header skips what’s empty (it read “Training owner ·  · OR 1”, with an empty owner it read “ ·  · ”)',
       '·  ·' not in meta and '· ·' not in meta and meta.endswith('OR 1 · Neurology') and 'Canine · Golden Retriever' in meta, meta)

    # ── Accessibility: primary buttons (dark) ──
    pr = await p.evaluate(GRAD, '#caseAdvance, #view-case .or-btn.primary')
    ok('Accessibility · dark: primary buttons carry dark words on the cyan, 7 : 1 and up (were white on the cyan gradient, 2.2–4.3 : 1)', pr and all(x[1] >= 7 for x in pr), pr)
    await c.close()

    # ── Agency: Undo for every step ──
    c, p, e = await open_or(br)
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(600)
    lbl = await p.evaluate("(document.getElementById('drawerAdvance')||{}).textContent")
    await p.click('#drawerAdvance'); await p.wait_for_timeout(700)
    s = await p.evaluate("(()=>{ const c=caseById('or390c2'), t=document.getElementById('toast'), b=document.getElementById('toastAct'); return {st:c.status, n:c.events.length, msg:document.getElementById('toastMsg').textContent, act:b&&!b.hidden?b.textContent:null, show:t.classList.contains('show'), fs:window.__fs['sheets/or390_2'].surgery.status}; })()")
    ok('Agency · a step (here “%s”) is confirmed with Undo, and the sheet has it' % (lbl or '').strip(), s['st'] == 'closing' and s['act'] == 'Undo' and s['show'] and s['msg'] == 'Maple · Closing' and s['fs'] == 'closing', s)
    await p.hover('#toast'); await p.wait_for_timeout(9000)
    held = await p.evaluate("document.getElementById('toast').classList.contains('show')")
    ok('Accessibility · the Undo message waits while it’s pointed at (before, it went after 8 s regardless)', held is True, held)
    await p.click('#toastAct'); await p.wait_for_timeout(700)
    u = await p.evaluate("(()=>{ const c=caseById('or390c2'); return {st:c.status, n:c.events.length, msg:document.getElementById('toastMsg').textContent, fs:window.__fs['sheets/or390_2'].surgery.status, fsn:window.__fs['sheets/or390_2'].surgery.events.length}; })()")
    ok('…Undo puts the status and its time back, on the case and on the sheet (Flow follows from the sheet)',
       u == {'st': 'procedure_started', 'n': 6, 'msg': 'Maple is back to Procedure started', 'fs': 'procedure_started', 'fsn': 6}, u)
    await p.mouse.move(700, 450)
    await p.evaluate("openDrawer('or390c2')"); await p.wait_for_timeout(500)
    await p.click('#drawerAdvance'); await p.wait_for_timeout(500)
    await p.mouse.move(700, 450); await p.evaluate("document.activeElement&&document.activeElement.blur()")
    await p.keyboard.press('Meta+z' if core.ENGINE == 'webkit' else 'Control+z'); await p.wait_for_timeout(600)
    k = await p.evaluate("caseById('or390c2').status")
    ok('…and ⌘Z (Ctrl+Z) does the same while the message shows', k == 'procedure_started', k)
    await p.evaluate("openDrawer('or390c4')"); await p.wait_for_timeout(500)
    await p.click('#drawerAdvance'); await p.wait_for_timeout(400)
    await p.mouse.move(700, 450); await p.wait_for_timeout(8600)
    gone = await p.evaluate("document.getElementById('toast').classList.contains('show')")
    ok('…left alone, the message still goes after 8 s', gone is False, gone)
    await p.evaluate("openCase('or390c4')"); await p.wait_for_timeout(500)
    await c.close()

    # ── Responsibility: nothing simulated on the live OR ──
    c, p, e = await open_or(br)
    await p.evaluate("openDrawer('or390c4')"); await p.wait_for_timeout(700)
    dr = await p.evaluate("document.querySelector('.or-drawer').innerText")
    ok('Responsibility · the drawer’s pending checks name who to contact and no “Simulated source” (the live OR has no simulated sources)',
       'Suggested contact:' in dr and 'imulat' not in dr, [l for l in dr.split('\n') if 'contact' in l.lower()][:2])
    await p.evaluate("closeDrawer()"); await p.click('#switcher [data-view="analytics"]'); await p.wait_for_timeout(700)
    an = await p.evaluate("(()=>{ const ps=[...document.querySelectorAll('#anGrid>.panel')]; return {txt:document.getElementById('view-analytics').innerText, w:ps.slice(0,2).map(x=>Math.round(x.getBoundingClientRect().width)), grid:Math.round(document.getElementById('anGrid').getBoundingClientRect().width)}; })()")
    ok('…Analytics shows no “LUNA · demo summary” of “synthetic” cases, and its two panels share the row',
       'demo' not in an['txt'].lower() and 'ynthetic' not in an['txt'] and len(an['w']) == 2 and abs(an['w'][0] - an['w'][1]) <= 2 and an['w'][0] * 2 + 16 >= an['grid'] - 2, an['w'])
    await p.evaluate("openCase('or390c2','procedure')"); await p.wait_for_timeout(900)
    btn = await p.evaluate("(document.querySelector('[data-act=scan]')||{}).textContent")
    await p.click('[data-act=scan]'); await p.wait_for_timeout(600)
    mo = await p.evaluate("(()=>{ const m=document.querySelector('.or-modal, #modal'); return {t:(document.getElementById('modalTitle')||{}).textContent, sim:!!document.getElementById('simScan'), zone:!!document.getElementById('scanZone'), txt:m?m.innerText:''}; })()")
    ok('…implants are added from the label: “Add implant…”, with no pretend scanner, “Simulate scan” or invented lot (all three were on the live OR)',
       (btn or '').strip() == 'Add implant…' and mo['t'] == 'Add implant' and not mo['sim'] and not mo['zone'] and 'arcode' not in mo['txt'] and 'Synthes' not in html, (btn, mo['t'], mo['sim'], mo['zone']))
    await p.keyboard.press('Escape'); await c.close()

    # ── Accessibility: light mode ──
    c, p, e = await open_or(br, dark=False)
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
    cs = await p.evaluate(CONTRAST, '#casesBody .or-stage, #casesBody .or-type')
    ok('Accessibility · light: the status words in Cases reach 4.5 : 1 (Recovery, Procedure started, Pre-op and Add-on were 4.2–4.4 : 1)', len(cs) >= 7 and all(x[1] >= 4.5 for x in cs), cs)
    lk = await p.evaluate("(()=>{ const a=document.getElementById('casesLegend'), r=a.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2; return {h:Math.round(r.height), up:document.elementFromPoint(x,y-12)===a, down:document.elementFromPoint(x,y+12)===a}; })()")
    ok('…on a Mac the small “Legend…” link takes a 28 pt click without moving anything (it was 14 pt tall)', lk['h'] < 20 and lk['up'] and lk['down'], lk)
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(2600)
    tabs = await p.evaluate(CONTRAST, '#caseTabs button:not(.active), #caseHead .pm-sp')
    ok('…the case page’s tabs and the species code reach 4.5 : 1 (were 4.17–4.18 : 1)', len(tabs) == 5 and all(x[1] >= 4.5 for x in tabs), tabs)
    pl = await p.evaluate(GRAD, '#caseAdvance')
    ok('…and the primary button is white on a deep teal, 4.5 : 1 at every point of its fill (was 2.2 : 1 on the bright cyan)', pl and all(x[1] >= 4.5 for x in pl), pl)
    ok('…no page errors', not e, e[:3])
    await c.close()

    # ── Flexibility: iPhone ──
    c, p, e = await open_or(br, vp=(390, 844), touch=True)
    sw = await p.evaluate("(()=>{ const s=[...document.querySelectorAll('#switcher .seg')].map(b=>b.getBoundingClientRect()); const t=document.querySelector('#subnavOR .subnav-title'); return {tops:[...new Set(s.map(r=>Math.round(r.top)))].length, n:s.length, minH:Math.round(Math.min(...s.map(r=>r.height))), title:t?getComputedStyle(t).display:null}; })()")
    ok('Flexibility · iPhone: Board, Schedule, Cases and Analytics sit in one row of 44 pt buttons (they took two rows under the “Pravix OR” label)', sw == {'tops': 1, 'n': 4, 'minH': 44, 'title': 'none'} or (sw['tops'] == 1 and sw['n'] == 4 and sw['minH'] >= 44 and sw['title'] == 'none'), sw)
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500)
    cr = await p.evaluate("(()=>{ const w=document.querySelector('#view-cases .tablewrap'), r=document.querySelector('#casesBody tr[data-id]'), tds=[...r.children].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.getBoundingClientRect()); return {side:w.scrollWidth-w.clientWidth, page:document.documentElement.scrollWidth-document.documentElement.clientWidth, head:getComputedStyle(document.querySelector('#casesTable thead')).display, rowW:Math.round(r.getBoundingClientRect().width), inside:tds.every(b=>b.right<=r.getBoundingClientRect().right+1)}; })()")
    ok('…and Cases is a list of rows that fits the screen (it was a seven-column table to scroll sideways)', cr['side'] <= 1 and cr['page'] <= 0 and cr['head'] == 'none' and cr['inside'] and cr['rowW'] <= 390, cr)
    ok('…no page errors on iPhone', not e, e[:3])
    await c.close()
