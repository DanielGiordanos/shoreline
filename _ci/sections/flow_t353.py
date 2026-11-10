"""Pravix Flow — the n353 build's own checks (Nov 9 2026): HIG Disclosure controls + Labels.
The drawer's in-place reveals (Triage details, Messages, Timeline) are leading disclosure triangles; Triage details work from the
keyboard and hide from VoiceOver when closed; a missing age or reason leaves no dangling "·". Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Pepper','Nakamura','Exam','Room 4',2,D[0],'Canine',55,''],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
 renderAll(); })()"""
# which way each chevron points: its drawing's own direction plus its rotation (0 = right, 90 = down)
DIR = """(sel,base)=>{ const e=document.querySelector(sel); if(!e) return null; const m=getComputedStyle(e).transform; let a=0;
  if(m&&m!=='none'){ const v=m.match(/matrix\\(([^)]+)\\)/)[1].split(',').map(Number); a=Math.round(Math.atan2(v[1],v[0])*180/Math.PI); }
  return ((base+a)%360+360)%360; }"""


async def ctx(br):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEEDJS); await p.wait_for_timeout(800)
    return c, p, e


@section(id='t353', title='n353 · Disclosure controls: one kind of reveal in the drawer, Triage details from the keyboard · Labels: no dangling “·”', apps=['flow'], topics=['disclosure', 'labels'], engines=('chromium', 'webkit'))
async def s_t353(br):
    c, p, e = await ctx(br)
    r = await p.evaluate("(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const dir=" + DIR + """;
      switchView('list'); await w(300); openDrawer(PATIENTS.find(x=>x.name==='Pepper').id); await w(1100);
      const lead=(row,ch)=>{ const R=document.querySelector(row), C=document.querySelector(ch); if(!R||!C) return null; const t=R.querySelector('.tri-title,.sect-title,.timeline-title'); return C.getBoundingClientRect().right<=t.getBoundingClientRect().left+1; };
      const o={}; o.lead=[lead('#triHead','#triHead .tri-chev'), lead('#commHead','#commHead .comm-chev'), lead('#dTimelineHead','#dTimelineHead .tl-chevron')];
      o.closed=[dir('#triHead .tri-chev',90), dir('#commHead .comm-chev',270), dir('#dTimelineHead .tl-chevron',0)];
      document.getElementById('triHead').click(); document.getElementById('commHead').click(); document.getElementById('dTimelineHead').click(); await w(600);
      o.open=[dir('#triHead .tri-chev',90), dir('#commHead .comm-chev',270), dir('#dTimelineHead .tl-chevron',0)];
      return o })()""")
    ok('Disclosure · the drawer’s three in-place reveals (Triage details, Messages, Timeline) are one kind of control: a triangle at the leading edge (two were trailing disclosure buttons, one a trailing arrow)', r['lead'] == [True, True, True], r)
    ok('…pointing in when closed and down when open (the disclosure buttons pointed down, then up)', r['closed'] == [0, 0, 0] and r['open'] == [90, 90, 90], r)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(600)
    k = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); openDrawer(PATIENTS.find(x=>x.name==='Pepper').id); await w(1100);
      const ch=document.querySelector('#triHead .tri-chev'), det=document.querySelector('#triCard .tri-detail'), card=document.getElementById('triCard'); const o={};
      o.a={role:ch.getAttribute('role'), tab:ch.tabIndex, exp:ch.getAttribute('aria-expanded'), ctl:ch.getAttribute('aria-controls')===det.id, lab:ch.getAttribute('aria-label'), hid:det.getAttribute('aria-hidden')};
      ch.focus(); ch.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await w(500);
      o.b={open:card.classList.contains('open'), exp:ch.getAttribute('aria-expanded'), hid:det.getAttribute('aria-hidden'), vis:getComputedStyle(det).visibility};
      document.getElementById('triCollapse').focus(); document.getElementById('triCollapse').click(); await w(700);
      o.c={open:card.classList.contains('open'), exp:ch.getAttribute('aria-expanded'), hid:det.getAttribute('aria-hidden'), vis:getComputedStyle(det).visibility, focus:document.activeElement===ch};
      return o })()""")
    ok('Disclosure · Triage details open and close from the keyboard: its triangle is a button (“Triage details”, collapsed) that Return opens (the row only answered a click)', k['a']['role'] == 'button' and k['a']['tab'] == 0 and k['a']['exp'] == 'false' and k['a']['ctl'] and k['a']['lab'] == 'Triage details' and k['b']['open'] and k['b']['exp'] == 'true', k)
    ok('…closed details are hidden from VoiceOver (they were read out while closed); open, they’re there', k['a']['hid'] == 'true' and k['b']['hid'] is None and k['b']['vis'] == 'visible' and k['c']['hid'] == 'true' and k['c']['vis'] == 'hidden', k)
    ok('…“Collapse” closes them and puts focus back on the triangle', not k['c']['open'] and k['c']['exp'] == 'false' and k['c']['focus'], k)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(500)
    lb = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); switchView('list'); await w(500);
      const row=document.querySelector('#tableBody tr[data-pid="'+PATIENTS.find(x=>x.name==='Pepper').id+'"] .nm span'); const o={list:row&&row.textContent.trim()};
      switchView('rooms'); await w(700); o.rooms=[...document.querySelectorAll('#view-rooms .r-pt')].map(x=>x.textContent.replace(/\\s+/g,' ').trim()).filter(t=>/Pepper/.test(t));
      return o })()""")
    ok('Labels · a patient with no age on file reads “Canine”, not “Canine ·”, and an empty reason leaves no dangling “·” elsewhere', lb['list'] == 'Canine' and lb['rooms'] and not any(t.rstrip().endswith('·') or '· ·' in t for t in lb['rooms']), lb)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
