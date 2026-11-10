"""Pravix Flow — the n354 build's own checks (Nov 9 2026): HIG Lists and tables + Lockups.
The open patient's row and card stay highlighted; Patients' column headings sort (natural, reversed, back to most urgent),
with aria-sort and a "Most urgent first" reset; the order holds through redraws. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lind','Procedure','Room 5',3,D[1],'Feline',120,'Laceration'],['Nala','Brooks','Waiting','Lobby',3,'unassigned','Canine',8,'Vaccines']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})));
 PATIENTS.forEach(p=>{ if(p.prio===1) p.critTakenAt=new Date(); }); renderAll(); })()"""
H = """const w=ms=>new Promise(r=>setTimeout(r,ms)); const names=()=>[...document.querySelectorAll('#tableBody tr[data-pid] .pvx-open')].map(b=>b.textContent.split(' ')[0]);
 const th=k=>document.querySelector('#view-list thead th[data-sort='+k+']'); const click=async k=>{ th(k).querySelector('.pvx-th').click(); await w(200); };"""


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


@section(id='t354', title='n354 · Lists and tables: the open patient stays highlighted; column headings sort Patients', apps=['flow'], topics=['lists'], engines=('chromium', 'webkit'))
async def s_t354(br):
    c, p, e = await ctx(br)
    s = await p.evaluate("(async()=>{" + H + """ const o={}; switchView('list'); await w(500); o.def=names();
      o.btn=[...document.querySelectorAll('#view-list thead th')].map(t=>[t.getAttribute('scope'), !!t.querySelector('button.pvx-th')]);
      await click('wait'); o.wait=names(); o.waitS=th('wait').getAttribute('aria-sort'); o.lab=th('wait').querySelector('.pvx-th').getAttribute('aria-label'); o.reset=!document.getElementById('pvxSortReset').hidden;
      await click('wait'); o.wait2=names(); o.waitS2=th('wait').getAttribute('aria-sort');
      await click('wait'); o.back=names(); o.waitS3=th('wait').getAttribute('aria-sort'); o.reset3=!document.getElementById('pvxSortReset').hidden;
      await click('patient'); o.az=names(); renderAll(); await w(300); o.azAfter=names();
      document.getElementById('pvxSortReset').click(); await w(200); o.reset4=names();
      return o })()""")
    ok('Lists · every column heading is a button that sorts Patients (the list had one order, most urgent first)', all(x == ['col', True] for x in s['btn']), s['btn'])
    ok('…the first click sorts the natural way for the column (Wait: longest first), says so to VoiceOver (aria-sort, “Wait, sorted longest first”), and offers “Most urgent first”', s['wait'][:2] == ['Oscar', 'Bella'] and s['waitS'] == 'descending' and s['lab'] == 'Wait, sorted longest first' and s['reset'], s)
    ok('…the second click reverses it, the third goes back to most urgent first', s['wait2'][0] == 'Nala' and s['waitS2'] == 'ascending' and s['back'] == s['def'] and s['waitS3'] is None and not s['reset3'], s)
    ok('…a sort holds while the list redraws, and “Most urgent first” puts Flow’s order back', s['az'] == sorted(s['az']) and s['azAfter'] == s['az'] and s['reset4'] == s['def'], s)
    h = await p.evaluate("(async()=>{" + H + """ const o={}; const id=PATIENTS.find(x=>x.name==='Milo').id; openDrawer(id); await w(700);
      o.list=[...document.querySelectorAll('#tableBody tr.pvx-current')].map(t=>[t.getAttribute('data-pid')===String(id), t.getAttribute('aria-current')]);
      renderTable(); await w(300); o.redraw=!!document.querySelector('#tableBody tr.pvx-current[data-pid="'+id+'"]');
      openDrawer(PATIENTS.find(x=>x.name==='Rocky').id); await w(500); o.moved=[...document.querySelectorAll('#tableBody tr.pvx-current')].map(t=>t.textContent.includes('Rocky'));
      closeDrawer(); await w(500); o.closed=document.querySelectorAll('.pvx-current,[aria-current=true]').length;
      switchView('flow'); await w(500); openDrawer(id); await w(600); o.board=[...document.querySelectorAll('#board .card.pvx-current')].map(c=>c.getAttribute('data-pid')===String(id));
      closeDrawer(); await w(400); return o })()""")
    ok('Lists · while a patient is open, their row stays highlighted and is marked current for VoiceOver, through redraws (nothing marked it)', h['list'] == [[True, 'true']] and h['redraw'] and h['moved'] == [True], h)
    ok('…on the board too, and the mark goes when the drawer closes', h['board'] == [True] and h['closed'] == 0, h)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
