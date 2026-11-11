"""Pravix Flow — the n356 build's own checks (Nov 10 2026): HIG Tab views + Activity views.
The system share sheet wherever the browser has one (a Mac's Safari too), beside Copy, with Apple's Share symbol; without one,
Copy alone. The Patients filter chips filter Patients only; the board shows everyone, and search still applies to both."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Milo','Chen','Waiting','Lobby',2,'unassigned','Feline',42,'Not eating'],
 ['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lind','Procedure','Room 5',3,D[1],'Feline',120,'Laceration']]
 .forEach(r=>{ const p=patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}); p.publicToken=p.publicToken||('tok'+r[0]); p.trackCode=p.trackCode||'AB12'; PATIENTS.push(p); });
 PATIENTS.forEach(p=>{ if(p.prio===1) p.critTakenAt=new Date(); }); renderAll(); })()"""
MOCK = """window.__shared=[]; window.__copied=null;
try{ Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:function(t){ window.__copied=t; return Promise.resolve(); }}}); }catch(e){}
SHARE"""
WITH = "try{ Object.defineProperty(navigator,'share',{configurable:true,value:function(d){ window.__shared.push(d); return Promise.resolve(); }}); }catch(e){}"
WITHOUT = "try{ Object.defineProperty(navigator,'share',{configurable:true,value:undefined}); }catch(e){}"


async def ctx(br, share=True, touch=False):
    o = dict(viewport={'width': 390, 'height': 844} if touch else {'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    await c.add_init_script(MOCK.replace('SHARE', WITH if share else WITHOUT))
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

CARD = """(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const x=PATIENTS.find(q=>q.name==='Rocky'); openDrawer(x.id); await w(1000);
  const c=document.getElementById('msgCopyLink'), s=document.getElementById('msgShareLink'); if(!c||!s) return {err:'no buttons'};
  const o={copy:c.textContent.trim(), share:s.textContent.trim(), shareName:s.getAttribute('aria-label'), shareHidden:s.hidden||!s.getClientRects().length,
    copySym:!!c.querySelector('svg[aria-hidden=true]'), shareSym:(s.querySelector('svg path')||{getAttribute:()=>''}).getAttribute('d'), h:[c.getBoundingClientRect().height, s.getBoundingClientRect().height]};
  c.click(); await w(400); o.copied=window.__copied; o.sharedAfterCopy=window.__shared.length; o.toast=(document.getElementById('toast')||{}).textContent;
  if(!o.shareHidden){ s.click(); await w(400); o.shared=window.__shared.map(d=>[d.title,d.url]); }
  closeDrawer(); await w(400); return o; })()"""
MENU = """(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); switchView('list'); await w(500);
  const row=[...document.querySelectorAll('#tableBody tr[data-pid]')].find(t=>t.textContent.includes('Rocky')); const r=row.getBoundingClientRect();
  row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+60,clientY:r.top+r.height/2})); await w(500);
  const items=[...document.querySelectorAll('[role=menuitem]')].filter(m=>m.getClientRects().length).map(m=>m.textContent.trim());
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await w(300); return items; })()"""


@section(id='t356', title='n356 · Tab views and Activity views: the share sheet wherever the browser has one, beside Copy; the Patients filters stay in Patients', apps=['flow'], topics=['activity-views', 'tab-views'], engines=('chromium', 'webkit'))
async def s_t356(br):
    c, p, e = await ctx(br, share=True)
    d = await p.evaluate(CARD)
    ok('Activity views · on a Mac with a share sheet (Safari), the tracker card has “Share…” beside “Copy tracker link” (it was offered only on touch screens)', d.get('copy') == 'Copy tracker link' and d.get('share') == 'Share…' and not d.get('shareHidden') and (d.get('shareName') or '').startswith('Share'), d)
    ok('…each carries its symbol: Copy’s two pages, and Apple’s Share symbol (an arrow out of a box)', d.get('copySym') and (d.get('shareSym') or '').startswith('M12 15V3'), d)
    ok('…Copy copies and says so, without opening the share sheet; Share… opens it with the link and the patient’s name', (d.get('copied') or '').startswith('http') and d.get('sharedAfterCopy') == 0 and 'Tracker link copied' in (d.get('toast') or '') and d.get('shared') and d['shared'][0][1].startswith('http') and 'Rocky' in d['shared'][0][0], d)
    m = await p.evaluate(MENU)
    ok('…the row’s context menu has both: “Copy tracker link” and “Share tracker link…”', 'Copy tracker link' in m and 'Share tracker link…' in m, m)
    f = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const o={}; switchView('list'); await w(400);
      [...document.querySelectorAll('#filterBar button')].find(b=>/^P1/.test(b.textContent.trim())).click(); await w(400);
      o.list=[...document.querySelectorAll('#tableBody tr[data-pid]')].length; switchView('flow'); await w(600);
      o.board=document.querySelectorAll('#board .card[data-pid]').length; o.all=PATIENTS.filter(isActive).length;
      const inp=document.querySelector('#searchInput,#globalSearch,input[type=search]'); inp.value='Rocky'; inp.dispatchEvent(new Event('input',{bubbles:true})); await w(600);
      o.boardSearch=document.querySelectorAll('#board .card[data-pid]').length; o.scope=(document.querySelector('#view-flow .pvx-scope')||{}).textContent||'';
      inp.value=''; inp.dispatchEvent(new Event('input',{bubbles:true})); try{ closeSearch(); }catch(e){} await w(400);
      switchView('list'); await w(400); o.listStill=[...document.querySelectorAll('#tableBody tr[data-pid]')].length;
      [...document.querySelectorAll('#filterBar button')].find(b=>/^P1/.test(b.textContent.trim())).click(); await w(300); return o; })()""")
    ok('Tab views · a Patients filter (P1) filters Patients only; the board still shows every patient (it showed only the P1s, with nothing saying so)', f['list'] < f['all'] and f['board'] == f['all'] and f['listStill'] == f['list'], f)
    ok('…search still applies to both views and the board says so (“Matching “Rocky” · 1 of …”)', f['boardSearch'] == 1 and 'Rocky' in f['scope'] and ('1 of %d' % f['all']) in f['scope'], f)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e = await ctx(br, share=False)
    d = await p.evaluate(CARD)
    ok('Activity views · where the browser has no share sheet, only “Copy tracker link” shows, and it copies', d.get('shareHidden') and (d.get('copied') or '').startswith('http'), d)
    m = await p.evaluate(MENU)
    ok('…and the menu has Copy only', 'Copy tracker link' in m and not any(x.startswith('Share') for x in m), m)
    await c.close()
    c, p, e = await ctx(br, share=True, touch=True)
    d = await p.evaluate(CARD)
    ok('Activity views · on iPhone both buttons are 44 pt tall', d.get('h') and min(d['h']) >= 44, d)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
