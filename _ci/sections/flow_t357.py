"""Pravix Flow — the n357 build's own checks (Nov 10 2026): HIG Buttons + Context menus.
"Waiting on …" on a board card is a real button (name, keyboard, press state, ✕) and its context menu can clear it; Book surgery…
ends in an ellipsis; the context menu draws its chevrons and gives Send a form, Copy and Share their symbols; the Attention
center's patient items have the same context menu as the board, the list and Rooms."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lind','Procedure','Room 5',3,D[1],'Feline',120,'Laceration']]
 .forEach(r=>{ const p=patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}); p.publicToken=p.publicToken||('tok'+r[0]); p.trackCode=p.trackCode||'AB12'; PATIENTS.push(p); });
 const rk=PATIENTS.find(p=>p.name==='Rocky'); rk.waitingOn={text:'Radiographs',at:new Date(now-12*60000).toISOString(),by:'RA'};
 PATIENTS.forEach(p=>{ if(p.prio===1) p.critTakenAt=new Date(); }); renderAll(); })()"""
SHARE = """window.__shared=[]; try{ Object.defineProperty(navigator,'share',{configurable:true,value:function(d){ window.__shared.push(d); return Promise.resolve(); }}); }catch(e){}"""
MENU = """(async(sel)=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const el=document.querySelector(sel); if(!el) return {err:'no '+sel};
  const r=el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+30,clientY:r.top+Math.min(20,r.height/2),button:2})); await w(400);
  const L=document.querySelector('.pvx-cx-list'); if(!L) return {err:'no menu'};
  const o={label:L.getAttribute('aria-label'), items:[...L.children].map(x=>x.getAttribute('role')==='separator'?'—':x.textContent.trim()),
    icons:[...L.querySelectorAll('button')].filter(b=>b.querySelector('.i svg')).map(b=>b.textContent.trim()),
    typed:[...L.querySelectorAll('.c')].map(c=>c.textContent.trim()).filter(Boolean), drawn:L.querySelectorAll('.c svg').length,
    vb:[...L.querySelectorAll('svg')].map(s=>s.getAttribute('viewBox'))};
  return o; })"""


async def ctx(br, touch=False):
    o = dict(viewport={'width': 390, 'height': 844} if touch else {'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP); await c.add_init_script(SHARE)
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


@section(id='t357', title='n357 · Buttons and Context menus: “Waiting on …” is a real button, Book surgery…, drawn chevrons and familiar icons, a context menu on the Attention center too', apps=['flow'], topics=['buttons', 'context-menus'], engines=('chromium', 'webkit'))
async def s_t357(br):
    c, p, e = await ctx(br)
    await p.evaluate("switchView('flow')"); await p.wait_for_timeout(700)
    b = await p.evaluate("""(()=>{ const rk=PATIENTS.find(x=>x.name==='Rocky'); const c=document.querySelector('#board [data-fvwait="'+rk.id+'"]'); if(!c) return {err:'no chip'};
      return {tag:c.tagName, type:c.type, name:c.getAttribute('aria-label'), tip:c.title, x:!!c.querySelector('svg'), tab:c.tabIndex, text:c.textContent.trim()}; })()""")
    ok('Buttons · “Waiting on Radiographs” on the board card is a button named “Waiting on Radiographs, 12 minutes. Clear”, with a ✕ (it was a div that cleared the flag when clicked)', b.get('tag') == 'BUTTON' and b.get('type') == 'button' and (b.get('name') or '').startswith('Waiting on Radiographs, 12 minutes') and b['name'].endswith('Clear') and b.get('x') and b.get('tab') == 0, b)
    ok('…its tooltip says what it does without “Click” (“Clear “Waiting on Radiographs””)', 'Click' not in (b.get('tip') or '') and (b.get('tip') or '').startswith('Clear'), b)
    k = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const rk=PATIENTS.find(x=>x.name==='Rocky'); const c=document.querySelector('#board [data-fvwait="'+rk.id+'"]');
      c.focus(); const f=document.activeElement===c; c.click(); await w(600); const cur=()=>PATIENTS.find(x=>x.name==='Rocky'); const gone=!cur().waitingOn&&!document.querySelector('#board [data-fvwait="'+rk.id+'"]');
      const t=[...document.querySelectorAll('.notify,.fv-notify,.toast,#toast,[class*=notif]')].map(n=>n.textContent).join(' ');
      const u=[...document.querySelectorAll('button')].filter(x=>x.getClientRects().length&&/^Undo$/.test(x.textContent.trim())).pop(); if(u) u.click(); await w(800); return {focus:f, gone, back:!!(cur().waitingOn&&cur().waitingOn.text==='Radiographs'&&document.querySelector('#board [data-fvwait="'+rk.id+'"]')), note:t.slice(0,200)}; })()""")
    ok('…it takes keyboard focus; pressing it clears the flag, and Undo brings it back on the board (Undo restored a copy the live board had already replaced, so nothing came back)', k['focus'] and k['gone'] and k['back'], k)
    rid = await p.evaluate("PATIENTS.find(x=>x.name==='Rocky').id")
    m = await p.evaluate(MENU + "('#board .card[data-pid=\"%s\"]')" % rid)
    ok('Context menus · the card’s menu offers “Clear “Waiting on Radiographs”” with the other status actions, before the separator', 'Clear “Waiting on Radiographs”' in m.get('items', []) and m['items'].index('Clear “Waiting on Radiographs”') < len(m['items']) - 1 - m['items'][::-1].index('—'), m)
    ok('…Send a form…, Copy tracker link and Share tracker link… carry their symbols (the whole group), and nothing else does', m.get('icons') == ['Send a form…', 'Copy tracker link', 'Share tracker link…'], m)
    ok('…the submenu chevrons are drawn symbols on the 24-unit grid, not a typed “›”', not m.get('typed') and m.get('drawn', 0) >= 3 and all(v == '0 0 24 24' for v in m.get('vb', [])), m)
    sub = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); [...document.querySelectorAll('.pvx-cx-list button')].find(b=>b.textContent.trim().startsWith('Room')).click(); await w(300);
      const back=document.querySelector('.pvx-cx-list button.back'); const r={typed:back?back.querySelector('.c').textContent.trim():'?', drawn:!!(back&&back.querySelector('.c svg'))}; document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await w(200); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await w(300); try{ PvxCtx.close(); }catch(e){} return r; })()""")
    ok('…and the submenu’s Back is a drawn chevron too, not a typed “‹”', sub['drawn'] and not sub['typed'], sub)
    await p.evaluate("switchView('dashboard')"); await p.wait_for_timeout(800)
    a = await p.evaluate(MENU + "('#view-dashboard .attn-item[data-pid]')")
    ok('Context menus · an Attention center item for a patient has the same menu as the board and the list (it had none)', (a.get('label') or '').startswith('Actions for ') and a.get('items', [None])[0] == 'Open' and any(x.startswith('Assign doctor') for x in a.get('items', [])), a)
    await p.evaluate("try{ PvxCtx.close(); }catch(e){}"); await p.wait_for_timeout(200)
    s = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); switchView('list'); await w(400); const rk=PATIENTS.find(x=>x.name==='Rocky'); openDrawer(rk.id); await w(1200);
      const b=document.querySelector('#drawer [data-fvor="book"]'); return b?b.textContent.trim():null; })()""")
    ok('Buttons · the drawer’s Book surgery… ends in an ellipsis (it opens the booking sheet)', s == 'Book surgery…', s)
    pr = await p.evaluate('(()=>{ const sel=[]; for(const sh of document.styleSheets){ let rs; try{ rs=sh.cssRules; }catch(e){ continue; } for(const r of rs){ if(r.selectorText&&/:active/.test(r.selectorText)) sel.push(r.selectorText); } } return {row:sel.some(x=>/#tableBody tr\\[data-pid\\]:active/.test(x)), room:sel.some(x=>/#view-rooms \\.room:active/.test(x))}; })()')
    ok('Buttons · Patients rows and Rooms’ tiles, which open something, have a press state (they had none)', pr['row'] and pr['room'], pr)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e = await ctx(br, touch=True)
    t = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); switchView('flow'); await w(800); const rk=PATIENTS.find(x=>x.name==='Rocky'); const b=document.querySelector('#board [data-fvwait="'+rk.id+'"]'); if(!b) return {err:'no chip'};
      b.scrollIntoView({block:'center'}); await w(300); const r=b.getBoundingClientRect(), cx=r.left+Math.min(30,r.width/2), cy=r.top+r.height/2; const hit=d=>{ const h=document.elementFromPoint(cx,cy+d); return !!h&&(h===b||b.contains(h)); };
      return {h:Math.round(r.height), up:hit(-21), down:hit(21), card:Math.round(b.closest('.card').getBoundingClientRect().height)}; })()""")
    ok('Buttons · on iPhone the “Waiting on …” button answers 21 pt above and below its centre (a 44 pt hit region) without growing the card', t.get('up') and t.get('down') and t.get('h', 99) < 32, t)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
