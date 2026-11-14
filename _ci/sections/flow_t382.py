"""Pravix Rounds — the n382 build's own checks (Nov 14 2026): only the rows that changed are drawn again.
Opening or closing a patient, a change to one patient, a filter, a search or a collapsed section keeps every row whose drawing
is the same (the same elements, not copies), and what is on screen is what a full redraw gives. A row something has added to
since is drawn again, as before. Chromium and WebKit."""
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED

FU = '{"uid":"u1","email":"rounds.tester@vca.com","displayName":"Rounds Tester"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]


async def ctx(br, **kw):
    o = dict(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark'); o.update(kw)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/rounds/'); await p.wait_for_timeout(2800)
    await p.evaluate("rdSeedDemo()"); await p.wait_for_timeout(1500)
    return c, p, e

LIB = """const sleep=ms=>new Promise(r=>setTimeout(r,ms)), list=document.getElementById('rdList'), ps=PATIENTS.filter(p=>p.rounds);
  const rows=()=>[...list.querySelectorAll('.rd-row[data-pid]')];
  const tag=()=>{ window.__gen=(window.__gen||0)+1; rows().forEach(r=>{ r.__tag=window.__gen; }); return window.__gen; };
  const kept=g=>rows().filter(r=>r.__tag===g).map(r=>r.dataset.pid), fresh=g=>rows().filter(r=>r.__tag!==g).map(r=>r.dataset.pid);
  /* what a full redraw gives: everything marked changed, drawn again, compared as HTML (the symbol decorator's marks, the entry animation's class and the timed "up to date" footer aside) */
  const norm=()=>{ const c=list.cloneNode(true); c.querySelectorAll('.rd-ready').forEach(x=>x.remove());   /* the "up to date" footer shows for a moment after loading: it depends on the clock */
     c.querySelectorAll('svg').forEach(v=>{ v.classList.remove('pvx-sym'); v.removeAttribute('aria-hidden'); v.style.removeProperty('--pvx-symw'); if(!v.getAttribute('style')) v.removeAttribute('style'); if(!v.getAttribute('class')) v.removeAttribute('class'); });
     c.querySelectorAll('.rd-in').forEach(x=>x.classList.remove('rd-in'));
     return c.innerHTML.replace(/class="([^"]*)"/g,(m,k)=>'class="'+k.trim().split(/\\s+/).filter(Boolean).join(' ')+'"').replace(/\\s{2,}/g,' '); };
  const full=async()=>{ list.querySelectorAll('*').forEach(n=>{ if(n.__s!==undefined) n.__d=true; }); list._rd248dirty=true; renderRdCensus(true); await sleep(900); return norm(); };
  const same=async()=>{ await sleep(900); const inc=norm(), fu=await full(); if(inc===fu) return true; let i=0; while(i<inc.length&&inc[i]===fu[i]) i++; return {inc:inc.slice(Math.max(0,i-70),i+110), full:fu.slice(Math.max(0,i-70),i+110)}; };"""

OPEN = "(async()=>{ " + LIB + """
  const A=ps[0].id, B=ps[3].id, out={n:rows().length};
  let g=tag(); rdHandleAct('toggle',{dataset:{pid:A}}); await sleep(400);
  out.openA={kept:kept(g).length, fresh:fresh(g), st:Object.assign({},rdN382Last), open:rows().filter(r=>r.classList.contains('open')).map(r=>r.dataset.pid)}; out.openA.same=await same();
  rdHandleAct('toggle',{dataset:{pid:A}}); await sleep(600);
  g=tag(); rdHandleAct('toggle',{dataset:{pid:B}}); await sleep(400);
  out.openB={kept:kept(g).length, fresh:fresh(g).sort(), open:rows().filter(r=>r.classList.contains('open')).map(r=>r.dataset.pid)}; out.openB.same=await same();
  rdHandleAct('toggle',{dataset:{pid:B}}); await sleep(600);
  g=tag(); rdHandleAct('toggle',{dataset:{pid:A}}); await sleep(400); rdHandleAct('toggle',{dataset:{pid:B}}); await sleep(500);
  out.switch={fresh:fresh(g).sort(), want:[A,B].sort(), open:rows().filter(r=>r.classList.contains('open')).map(r=>r.dataset.pid), B:B}; out.switch.same=await same();
  g=tag(); rdHandleAct('toggle',{dataset:{pid:B}}); await sleep(500);
  out.close={kept:kept(g).length, fresh:fresh(g), open:rows().filter(r=>r.classList.contains('open')).length}; out.close.same=await same();
  g=tag(); renderRdCensus(true); renderRdCensus(); await sleep(300); out.idle={kept:kept(g).length, fresh:fresh(g)};
  out.A=A; out.B=B; return out; })()"""

CHANGE = "(async()=>{ " + LIB + """
  const out={n:rows().length}; let g=tag(); const p=ps[2], order0=rows().map(r=>r.dataset.pid);
  rdSetAcuity(p, p.rounds.acuity==='critical'?'stable':'critical'); renderRdCensus(true); await sleep(500);
  out.acuity={fresh:fresh(g), pid:p.id, cls:(rows().find(r=>r.dataset.pid===p.id)||{}).className||''}; out.acuity.same=await same();
  g=tag(); const sec=list.querySelector('[data-act="sec-toggle"]'), key=sec.dataset.key, inSec=[...list.querySelectorAll('.rd-secgroup[data-sec="'+key+'"] .rd-row')].map(r=>r.dataset.pid);
  sec.click(); await sleep(500); out.collapse={gone:inSec.every(id=>!rows().some(r=>r.dataset.pid===id)), freshElsewhere:fresh(g)}; out.collapse.same=await same();
  g=tag(); list.querySelector('[data-act="sec-toggle"][data-key="'+key+'"]').click(); await sleep(500); out.expand={fresh:fresh(g).sort(), want:inSec.slice().sort()}; out.expand.same=await same();
  g=tag(); const chip=[...document.querySelectorAll('[data-act="svc-filter"]')].find(b=>/Emergency/.test(b.textContent)); chip.click(); await sleep(600);
  out.filter={shown:rows().length, keptRows:kept(g).length, st:Object.assign({},rdN382Last)}; out.filter.same=await same();
  document.querySelector('[data-act="svc-filter"]').click(); await sleep(600); out.clear={shown:rows().length}; out.clear.same=await same();
  const s=document.getElementById('rdSearch'); g=tag(); s.value='mon'; s.dispatchEvent(new Event('input',{bubbles:true})); await sleep(700); out.search={shown:rows().length}; out.search.same=await same();
  s.value=''; s.dispatchEvent(new Event('input',{bubbles:true})); await sleep(700); out.searchClear={shown:rows().length, order:rows().map(r=>r.dataset.pid).join()===rows().map(r=>r.dataset.pid).join()}; out.searchClear.same=await same();
  // something added to a row since it was drawn (an editor, say): that row is drawn again; the others stay
  await sleep(300); g=tag(); const victim=rows()[1]; const extra=document.createElement('span'); extra.id='pvxT382'; extra.textContent='left behind'; victim.appendChild(extra); await sleep(100);
  renderRdCensus(true); await sleep(400); out.dirty={fresh:fresh(g), victim:victim.dataset.pid, left:!!document.getElementById('pvxT382'), kept:kept(g).length};
  // a change made a moment ago, with no time for it to be reported: still drawn again
  g=tag(); const v2=rows()[2]; const e2=document.createElement('span'); e2.id='pvxT382b'; v2.appendChild(e2); renderRdCensus(true); out.dirtyNow={fresh:fresh(g), victim:v2.dataset.pid, left:!!document.getElementById('pvxT382b')};
  // the list emptied behind Rounds' back comes back whole
  list.innerHTML=''; renderRdCensus(true); await sleep(300); out.wiped={shown:rows().length};
  out.tips=document.querySelectorAll('.rd-tip').length; out.dupIds=(()=>{ const ids=[...list.querySelectorAll('[id]')].map(x=>x.id); return ids.length-new Set(ids).size; })(); out.dupRows=rows().length-new Set(rows().map(r=>r.dataset.pid)).size;
  return out; })()"""


@section(id='t382', title='n382 · Rounds draws again only the rows that changed: opening or closing a patient keeps every other row as it is, and the screen is what a full redraw gives',
         apps=['rounds'], topics=['rounds', 'performance'], engines=('chromium', 'webkit'))
async def s_t382(br):
    c, p, e = await ctx(br)
    o = await p.evaluate(OPEN)
    n = o['n']
    ok('Opening a patient draws that row again and keeps every other row’s own elements (it drew the whole census again)',
       n >= 8 and o['openA']['fresh'] == [o['A']] and o['openA']['kept'] == n - 1 and o['openA']['open'] == [o['A']] and o['openA']['st']['drawn'] <= 2, o['openA'])
    ok('…and the screen is exactly what a full redraw gives', o['openA']['same'] is True and o['openB']['same'] is True, [o['openA']['same'], o['openB']['same']])
    ok('…going from one open patient to another draws those two rows and no others', o['switch']['fresh'] == o['switch']['want'] and o['switch']['open'] == [o['switch']['B']] and o['switch']['same'] is True, o['switch'])
    ok('…closing draws only the row that was open', len(o['close']['fresh']) == 1 and o['close']['kept'] == n - 1 and o['close']['open'] == 0 and o['close']['same'] is True, o['close'])
    ok('…a redraw with nothing changed keeps every row (as n248 did)', o['idle']['fresh'] == [] and o['idle']['kept'] == n, o['idle'])
    ok('…no page errors (open and close)', not newerr(e), newerr(e))
    await c.close()

    c, p, e = await ctx(br)
    h = await p.evaluate(CHANGE)
    ok('A change to one patient (Critical ↔ Stable) draws that patient’s row and keeps the rest; the screen matches a full redraw',
       h['acuity']['fresh'] == [h['acuity']['pid']] and h['acuity']['same'] is True, h['acuity'])
    ok('…collapsing a section removes its rows and touches no row elsewhere; expanding draws just its rows again; both match a full redraw',
       h['collapse']['gone'] and h['collapse']['freshElsewhere'] == [] and h['collapse']['same'] is True and h['expand']['fresh'] == h['expand']['want'] and h['expand']['same'] is True, [h['collapse'], h['expand']])
    ok('…a service filter keeps the rows that stay (they aren’t rebuilt), and filter, clear, search and clearing the search each match a full redraw',
       h['filter']['shown'] >= 1 and h['filter']['keptRows'] >= 1 and h['filter']['same'] is True and h['clear']['same'] is True and h['clear']['shown'] == h['n']
       and h['search']['same'] is True and h['searchClear']['same'] is True and h['searchClear']['shown'] == h['n'], [h['filter'], h['clear'], h['search'], h['searchClear']])
    ok('…a row something was added to since it was drawn (an open editor, say) is drawn again clean, as before; the others stay',
       h['dirty']['fresh'] == [h['dirty']['victim']] and not h['dirty']['left'] and h['dirty']['kept'] == h['n'] - 1, h['dirty'])
    ok('…even when that change was made the moment before the redraw', h['dirtyNow']['fresh'] == [h['dirtyNow']['victim']] and not h['dirtyNow']['left'], h['dirtyNow'])
    ok('…a list emptied behind Rounds’ back is drawn whole again; no row or id is ever doubled', h['wiped']['shown'] == h['n'] and h['dupRows'] == 0 and h['dupIds'] == 0 and h['tips'] <= 1, [h['wiped'], h['dupRows'], h['dupIds'], h['tips']])
    ok('…no page errors (changes)', not newerr(e), newerr(e))
    await c.close()
