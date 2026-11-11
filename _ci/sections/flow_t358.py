"""Pravix Flow — the n358 build's own checks (Nov 10 2026): HIG Dock menus + Edit menus.
Flow's Dock menu (manifest shortcuts) lists Flow's own commands — New patient, Find a patient, Patients, Client Display —
each with a symbol and each also in the app, and their deep links work; right-click on selected text gives the browser's
menu (Copy, Look Up) instead of Flow's, while right-click elsewhere on a row still opens Flow's."""
import json
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough']]
 .forEach(r=>PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]})));
 PATIENTS.forEach(p=>{ if(p.prio===1) p.critTakenAt=new Date(); }); renderAll(); })()"""


async def ctx(br, hash='', touch=False):
    o = dict(viewport={'width': 390, 'height': 844} if touch else {'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/' + hash); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

STATE = """(()=>({view:currentView, hash:location.hash, focus:document.activeElement&&document.activeElement.id, add:!!document.querySelector('#apModal.open,.addpt-modal.open')}))()"""


@section(id='t358', title='n358 · Dock menus and Edit menus: Flow’s own commands in the Dock menu, with symbols and working links; selected text keeps the browser’s menu', apps=['flow'], topics=['dock-menus', 'edit-menus'], engines=('chromium', 'webkit'))
async def s_t358(br):
    c, p, e = await ctx(br)
    m = await p.evaluate("""(async()=>{ const r=await fetch('/manifest.webmanifest',{cache:'no-store'}); const j=await r.json(); const out=[];
      for(const s of j.shortcuts){ const ic=(s.icons||[])[0]; let ok=false, size=null; if(ic){ const im=new Image(); im.src=ic.src; try{ await im.decode(); ok=true; size=[im.naturalWidth,im.naturalHeight]; }catch(e){} } out.push({name:s.name, url:s.url, icon:ic&&ic.src, ok, size}); }
      return {name:j.name, out}; })()""")
    names = [x['name'] for x in m['out']]
    ok('Dock menus · Flow’s Dock menu lists Flow’s own commands: New patient, Find a patient, Patients, Client Display (it listed Rounds and Ultrasound, which are apps with their own Dock menus)', names == ['New patient', 'Find a patient', 'Patients', 'Client Display'] and not any('/rounds' in x['url'] or '/ultrasound' in x['url'] for x in m['out']), m)
    ok('…every item has its 96 pt symbol (New patient had none), and the app name fits the menu bar (16 characters or fewer)', all(x['ok'] and x['size'] == [96, 96] for x in m['out']) and len(m['name']) <= 16, m)
    inapp = await p.evaluate("""(()=>({newItem:!!document.querySelector('.ops-item[data-op=new]'), search:!!document.getElementById('globalSearch'), list:!!document.querySelector('#subnavFlow [data-view=list]'), client:!!document.querySelector('#subnavFlow [data-view=client]')}))()""")
    ok('…each is also in the app: the + menu’s New patient…, the search field, and the sub-nav’s Patients and Client Display', all(inapp.values()), inapp)
    await p.evaluate(SEEDJS); await p.wait_for_timeout(600)
    s = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); switchView('list'); await w(500);
      const row=[...document.querySelectorAll('#tableBody tr[data-pid]')].find(t=>t.textContent.includes('Bella')); const td=[...row.cells].find(c=>/Vomiting/.test(c.textContent));
      const fire=(el)=>{ const r=el.getBoundingClientRect(); const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+6,clientY:r.top+r.height/2,button:2}); el.dispatchEvent(ev); return ev.defaultPrevented; };
      const o={}; const rg=document.createRange(); rg.selectNodeContents(td); getSelection().removeAllRanges(); getSelection().addRange(rg);
      o.selPrevented=fire(td); await w(300); o.selMenu=!!document.querySelector('.pvx-cx-list'); try{ PvxCtx.close(); }catch(e){}
      getSelection().removeAllRanges(); await w(200); o.plainPrevented=fire(td); await w(300); o.plainMenu=!!document.querySelector('.pvx-cx-list'); try{ PvxCtx.close(); }catch(e){} await w(200);
      const inp=document.getElementById('globalSearch'); inp.value='Bel'; o.fieldPrevented=fire(inp); await w(200); o.fieldMenu=!!document.querySelector('.pvx-cx-list'); inp.value=''; return o; })()""")
    ok('Edit menus · right-click on text selected in a Patients row gives the browser’s menu (Copy, Look Up, Translate), not Flow’s (Flow’s menu took it, so the text couldn’t be copied that way)', not s['selPrevented'] and not s['selMenu'], s)
    ok('…right-click on the row with nothing selected still opens Flow’s menu', s['plainPrevented'] and s['plainMenu'], s)
    ok('…and a text field keeps the browser’s edit menu', not s['fieldPrevented'] and not s['fieldMenu'], s)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    for h, want in [('#view=list', 'list'), ('#view=client', 'client')]:
        c, p, e = await ctx(br, h)
        st = await p.evaluate(STATE)
        ok(f'Dock menus · /{h} opens {"Patients" if want == "list" else "Client Display"}, and the address is tidied', st['view'] == want and st['hash'] == '', st)
        await c.close()
    c, p, e = await ctx(br, '#find')
    st = await p.evaluate(STATE)
    ok('Dock menus · /#find puts the cursor in the search field', st['focus'] == 'globalSearch' and st['hash'] == '', st)
    await c.close()
    c, p, e = await ctx(br, '#op=new')
    st = await p.evaluate(STATE)
    ok('…and /#op=new still opens New patient (n207)', st['add'], st)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e = await ctx(br, '#find', touch=True)
    st = await p.evaluate(STATE)
    ok('Dock menus · on iPhone, /#find puts the cursor in the search field too (Home Screen quick action)', st['focus'] == 'globalSearch', st)
    await c.close()
