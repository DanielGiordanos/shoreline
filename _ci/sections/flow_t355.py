"""Pravix Flow — the n355 build's own checks (Nov 9 2026): HIG Outline views + Split views.
With a patient open, ⌥↓ / ⌥↑ move through the patients in the order the view shows; one click on another patient behind the
drawer switches to them on a wide window (n210); text fields keep their arrow keys. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lind','Procedure','Room 5',3,D[1],'Feline',120,'Laceration']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})));
 PATIENTS.forEach(p=>{ if(p.prio===1) p.critTakenAt=new Date(); }); renderAll(); })()"""
H = """const w=ms=>new Promise(r=>setTimeout(r,ms)); const nm=()=>{ const p=PATIENTS.find(x=>x.id===activePatient); return p?p.name:null; };
 const K=k=>(document.activeElement||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:k,altKey:true,bubbles:true,cancelable:true}));
 const live=()=>(document.getElementById('pvxDndLive')||{}).textContent||'';"""


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


@section(id='t355', title='n355 · Split views: ⌥↓ / ⌥↑ move through patients with one open; one click switches on a wide window', apps=['flow'], topics=['split-views'], engines=('chromium', 'webkit'))
async def s_t355(br):
    c, p, e = await ctx(br)
    r = await p.evaluate("(async()=>{" + H + """ const o={}; switchView('list'); await w(500);
      const order=()=>[...document.querySelectorAll('#tableBody tr[data-pid] .pvx-open')].map(b=>b.textContent.split(' ')[0]); o.order=order();
      openDrawer(document.querySelector('#tableBody tr[data-pid]').getAttribute('data-pid')); await w(600); o.a=nm();
      K('ArrowDown'); await w(500); o.b=nm(); o.say=live(); o.hl=[...document.querySelectorAll('#tableBody tr.pvx-current .pvx-open')].map(b=>b.textContent.split(' ')[0]);
      K('ArrowUp'); await w(500); o.c=nm();
      K('ArrowUp'); await w(500); o.d=nm(); o.say2=live();
      closeDrawer(); await w(400); window.pvxListSort('patient'); await w(200); o.az=order();
      openDrawer(PATIENTS.find(x=>x.name===o.az[0]).id); await w(600); K('ArrowDown'); await w(500); o.e=nm(); window.pvxListSort(null);
      return o })()""")
    n = len(r['order'])
    ok('Split views · with a patient open, ⌥↓ goes to the next patient in the list and the drawer follows; VoiceOver hears “Ziggy Moreau, 2 of …” and the row stays highlighted', r['a'] == r['order'][0] and r['b'] == r['order'][1] and r['say'].startswith(r['order'][1]) and (', 2 of %d' % n) in r['say'] and r['hl'] == [r['order'][1]], r)
    ok('…⌥↑ goes back, and at the top it stays and says “First patient”', r['c'] == r['order'][0] and r['d'] == r['order'][0] and r['say2'] == 'First patient', r)
    ok('…it follows the order the list shows, sorted too (by name: the second name A to Z)', r['e'] == r['az'][1], r)
    b = await p.evaluate("(async()=>{" + H + """ const o={}; closeDrawer(); await w(300); switchView('flow'); await w(600);
      const cards=[...document.querySelectorAll('#board .card[data-pid]')].map(c=>c.getAttribute('data-pid')); const names=cards.map(id=>PATIENTS.find(x=>x.id===id).name);
      openDrawer(cards[0]); await w(600); K('ArrowDown'); await w(500); o.board=[nm(), names[1]];
      const box=document.getElementById('msgBox'); if(box){ document.getElementById('commHead').click(); await w(300); box.focus(); const before=nm(); K('ArrowDown'); await w(400); o.typing=[before, nm()]; box.blur(); }
      return o })()""")
    ok('Split views · on the board it moves card by card, stage by stage', b['board'][0] == b['board'][1], b)
    ok('…while typing in a field, ⌥↓ is the field’s own (it doesn’t change patients)', b.get('typing') and b['typing'][0] == b['typing'][1], b)
    await p.evaluate("closeDrawer(); switchView('list')"); await p.wait_for_timeout(600)
    ids = await p.evaluate("[...document.querySelectorAll('#tableBody tr[data-pid]')].map(t=>t.getAttribute('data-pid'))")
    await p.evaluate("id=>openDrawer(id)", ids[0]); await p.wait_for_timeout(700)
    box = await p.evaluate("(()=>{ const r=document.querySelector('#tableBody tr[data-pid=\"%s\"]').getBoundingClientRect(); return [r.left+80, r.top+r.height/2]; })()" % ids[2])
    await p.mouse.click(box[0], box[1]); await p.wait_for_timeout(700)
    one = await p.evaluate("[document.getElementById('drawer').classList.contains('open'), activePatient]")
    ok('Split views · on a wide window, one click on another patient behind the drawer opens them (no close-then-open)', one[0] and one[1] == ids[2], [one, ids[2]])
    k = await p.evaluate("(async()=>{ closeDrawer(); await new Promise(r=>setTimeout(r,500)); document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); await new Promise(r=>setTimeout(r,500)); return document.body.innerText.includes('Next patient, with one open'); })()")
    ok('…the keyboard shortcuts list ⌥↓ and ⌥↑', k, k)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
