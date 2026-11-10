"""Pravix Flow — the n341 build's own checks (Nov 7 2026): HIG Charting data + Collaboration and sharing.
Command's small charts say what they show with units; the doctors' wait trend is a symbol with words; the visit tracker link
uses the system share sheet on touch and says "copied" only once it is. Chromium and WebKit."""
import re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"resident.a@vca.com","displayName":"Resident A"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEEDJS = """(()=>{const now=Date.now(), D=DOCTORS.map(d=>d.id);
[['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough'],['Oscar','Lindqvist','Procedure','Room 5',2,D[0],'Feline',120,'Laceration']]
 .forEach(r=>{ const p=patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[]}); p.publicToken=p.publicToken||('tok'+r[0]); p.trackCode=p.trackCode||'AB12'; PATIENTS.push(p); }); renderAll(); })()"""


async def ctx(br, touch=False):
    o = dict(viewport={'width': 390, 'height': 844} if touch else {'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if touch: o.update(has_touch=True, is_mobile=True)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    await c.add_init_script("""window.__shared=[]; window.__copyOK=true;
      try{ Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:function(t){ window.__copied=t; return window.__copyOK?Promise.resolve():Promise.reject(new Error('denied')); }}}); }catch(e){}
      try{ Object.defineProperty(navigator,'share',{configurable:true,value:function(d){ window.__shared.push(d); return Promise.resolve(); }}); }catch(e){}""")
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEEDJS); await p.wait_for_timeout(900)
    return c, p, e

DRAWER_COPY = """(async()=>{ const x=PATIENTS.find(q=>q.name==='Rocky'); openDrawer(x.id); await new Promise(r=>setTimeout(r,1000));
  const b=document.getElementById('msgCopyLink'); if(!b) return {err:'no tracker button'}; const label=b.textContent.trim();
  window.__copyOK=COPYOK; window.__copied=null; b.click(); await new Promise(r=>setTimeout(r,500));
  return {label, toast:(document.getElementById('toast')||{}).textContent, copied:window.__copied, shared:window.__shared.map(d=>[d.title,d.url])} })()"""


@section(id='t341', title='n341 · Charting data and sharing: small charts say what they show, the wait trend is a symbol with words, the tracker link shares and copies honestly', apps=['flow'], topics=['charts', 'sharing'], engines=('chromium', 'webkit'))
async def s_t341(br):
    c, p, e = await ctx(br)
    s = await p.evaluate("""(async()=>{const now=Date.now(); ['Avg Wait','Longest','Waiting'].forEach((l,i)=>{CKPI_HIST['top|'+l]=[0,10,20,30].map(k=>({t:now-(40-k)*60000,v:[20,60,3][i]+k/10}))});
      switchView('list'); await new Promise(r=>setTimeout(r,300)); switchView('dashboard'); await new Promise(r=>setTimeout(r,1000));
      const o={}; document.querySelectorAll('.command-kpi__spark[role=img]').forEach(x=>{ o[x.closest('.command-kpi').querySelector('.command-kpi__label').textContent.trim()]=x.getAttribute('aria-label') }); return o})()""")
    aw, lg, wt = s.get('Avg Wait', ''), s.get('Longest', ''), s.get('Waiting', '')
    ok('Charting · Command’s small charts say what they show with units: “Average wait since … : 20 min to 23 min, up 3 min” (they read “Avg Wait … 20 to 23, up 3”, with no unit)',
       aw.startswith('Average wait since') and re.search(r'\d+ (min|minutes?) to \d+ (min|minutes?), up \d+ (min|minutes?)', aw) and re.search(r' (min|minute|hour)', lg) and ' min' not in wt and wt.startswith('Waiting since'), s)   # n350 spells the units out
    t = await p.evaluate("""(async()=>{ const st={}; document.querySelectorAll('#view-dashboard .wd-row').forEach(r=>{ st[r.dataset.doctor]={base:1,ts:Date.now()} });
      localStorage.setItem('wd_trend_v1', JSON.stringify(st)); switchView('list'); await new Promise(r=>setTimeout(r,300)); switchView('dashboard'); await new Promise(r=>setTimeout(r,900));
      return [...document.querySelectorAll('#view-dashboard .wd-trend')].map(x=>({text:x.textContent.trim(), say:x.getAttribute('aria-label'), sym:!!x.querySelector('svg'), cls:x.className}))})()""")
    up = [x for x in t if 'up' in x['cls']]
    ok('Charting · the doctors’ wait trend is an arrow symbol with words for VoiceOver (“Average wait up 2 min…”), not a typed “↑ 2m”', up and all(x['sym'] and '↑' not in x['text'] and (x['say'] or '').startswith('Average wait up') for x in up) and not any('↑' in x['text'] or '↓' in x['text'] for x in t), t)
    d = await p.evaluate(DRAWER_COPY.replace('COPYOK', 'true'))
    ok('Sharing · with a mouse, “Copy tracker link” copies the link and then says so', d.get('label') == 'Copy tracker link' and d.get('copied', '').startswith('http') and 'Tracker link copied' in (d.get('toast') or '') and not d.get('shared'), d)
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(400)
    d = await p.evaluate(DRAWER_COPY.replace('COPYOK', 'false'))
    ok('Sharing · a copy the browser refuses says so and shows the link (it said “Tracker link copied” anyway)', 'Couldn’t copy the link' in (d.get('toast') or '') and 'copied' not in (d.get('toast') or '').lower().replace('couldn’t copy', ''), d)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
    c, p, e = await ctx(br, touch=True)
    d = await p.evaluate(DRAWER_COPY.replace('COPYOK', 'true'))
    ok('Sharing · on iPhone and iPad it’s “Share tracker link…” and opens the system share sheet (Messages, Mail, AirDrop) with the link', d.get('label') == 'Share tracker link…' and d.get('shared') and d['shared'][0][1].startswith('http') and 'Rocky' in (d['shared'][0][0] or ''), d)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()
