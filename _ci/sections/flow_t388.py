"""Pravix Flow — the n388 build's own checks (Nov 15 2026): the main script's own duplicate helpers go (reorganisation,
stage 3a). app.js declared the markup escape three more times under other names (rdEsc; ctEsc and bcEsc with the
apostrophe), three more times inside functions, and a small "toast if there is one" twice. All of them are the shared
helpers of n385 now. The three old names stay as other names for the same functions, so an older patch still runs."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
rd = lambda *p: open(os.path.join(BUILD, *p), encoding='utf-8').read()
KEEP = 'var rdEsc=pvxEsc, ctEsc=pvxEscQ, bcEsc=pvxEscQ;'


async def ctx(br):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', service_workers='block')
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route); p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

SEED2 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['<img src=x onerror="window.__ran=1">','O\\'Hale <b>x</b>','Exam','Room 1',2,D[0],'Canine',35,'Cough "dry"']]
   .forEach((r,i)=>PATIENTS.push(patient({id:'e'+i,name:r[0],last:r[1],owner:'Synthetic',status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
  renderAll(); return PATIENTS.length; })()"""


@section(id='t388', title='n388 · the main script’s own duplicate helpers go: its three other names for the escape are the shared one, and the copies inside functions are gone',
         apps=['flow'], topics=['performance', 'security'], engines=('chromium', 'webkit'))
async def s_t388(br):
    app = rd('assets', 'flow', 'app.js'); lay = rd('assets', 'flow', 'layers.js') + rd('assets', 'flow', 'layers2.js')
    ok('The main script · rdEsc, ctEsc and bcEsc are no longer declared as functions of their own; one line keeps the three names as other names for pvxEsc and pvxEscQ',
       not re.search(r'function (?:rdEsc|ctEsc|bcEsc)\(', app) and app.count(KEEP) == 1 and app.index(KEEP) < app.index('const STATUSES'))
    rest = app.replace(KEEP, '') + lay
    ok('…and nothing in Flow’s files calls the old names any more (280 calls now name the shared helper)', not re.search(r'\b(?:rdEsc|ctEsc|bcEsc)\b', rest), re.findall(r'\b(?:rdEsc|ctEsc|bcEsc)\b', rest)[:5])
    ok('…the copies of the escape declared inside functions of the main script are gone (there were three), and so are the two copies of “toast if there is one”',
       not re.search(r'function esc\(', app) and not re.search(r'function say\(t\)\{ if\(typeof toast', app) and len(re.findall(r'(?m)^function pvxToast\(', app)) == 1, [len(re.findall(r'function esc\(', app)), len(re.findall(r'function say\(t\)', app))])
    n = len(re.findall(r'\bpvxEsc\(', app)) + len(re.findall(r'\bpvxEscQ\(', app))
    ok('…the main script itself now calls the two shared escapes in more than 250 places', n > 250, n)

    c, p, e = await ctx(br)
    r = await p.evaluate("""(()=>{ const IN=[null,undefined,'',0,'a&b','<img src=x onerror=alert(1)>','"q"',"it's",'&amp;',[1,'<'],'名前 & <b>'];
      return {same:[rdEsc===pvxEsc, ctEsc===pvxEscQ, bcEsc===pvxEscQ], types:[typeof rdEsc, typeof ctEsc, typeof bcEsc, typeof pvxToast], win:[window.rdEsc===pvxEsc, window.bcEsc===pvxEscQ],
        out:[bcEsc("it's <b>"), rdEsc('"<a>"'), ctEsc(null), pvxEsc("it's")], all:IN.every(v=>bcEsc(v)===pvxEscQ(v)&&rdEsc(v)===pvxEsc(v))}; })()""")
    ok('In the page · the old names are the very same functions, so a patch that still calls bcEsc gets the same answer', r['same'] == [True, True, True] and r['types'] == ['function'] * 4 and r['win'] == [True, True] and r['all'], r)
    ok('…and they answer as before: with the apostrophe for bcEsc and ctEsc, without it for rdEsc, nothing for null', r['out'] == ['it&#39;s &lt;b&gt;', '&quot;&lt;a&gt;&quot;', '', "it's"], r['out'])
    await p.evaluate(SEED2); await p.wait_for_timeout(900)
    r = await p.evaluate("""(async()=>{ const w=ms=>new Promise(r=>setTimeout(r,ms)); const o={}; switchView('list'); await w(600); o.list=(document.querySelector('#view-list')||{}).textContent||'';
      switchView('flow'); await w(600); o.board=(document.querySelector('#view-flow, #view-board')||{}).textContent||''; openDrawer('e1'); await w(900); o.drawer=(document.getElementById('drawer')||{}).textContent||'';
      openCareTeam('e1'); await w(600); o.care=!!document.querySelector('.ct-modal.open, #ctModal.open, [id*="careTeam" i].open, .care-team.open'); try{ closeCareTeam(); }catch(e){} closeDrawer();
      o.ran=window.__ran||0; o.imgs=document.querySelectorAll('img[src="x"]').length; o.b=[...document.querySelectorAll('#view-list b, #drawer b, #view-flow b, #view-board b')].filter(x=>x.textContent==='x').length;
      pvxToast('t388 says hello'); await w(300); o.toast=/t388 says hello/.test(document.body.textContent); return o; })()""")
    ok('A stored name written as markup, with an apostrophe and quotes, is still shown as the text it is in the list, on the board and in the drawer, and nothing in it runs',
       r['ran'] == 0 and r['imgs'] == 0 and r['b'] == 0 and '<img src=x' in r['list'] and "O'Hale <b>x</b>" in r['list'] and '<img src=x' in r['board'] and '<img src=x' in r['drawer'], {k: (v if not isinstance(v, str) else len(v)) for k, v in r.items()})
    ok('…and pvxToast shows a short notice', r['toast'], r['toast'])
    ok('No page errors', not newerr(e), newerr(e)[:3]); await c.close()
