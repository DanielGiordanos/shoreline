"""Pravix Flow — the n386 build's own checks (Nov 15 2026): the layers that watch the whole page share one observer
(reorganisation, stage 2b). Twenty-three blocks each started a MutationObserver on document.body or on <html>, so one change
anywhere built a record for each of them. pvxWatch(fn, options, target) keeps one observer per target and hands each
caller the records its own options would have given it, in the order the callers registered. Watchers on one element,
and the two that use one observer for more than the page, are as they were."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
rd = lambda *p: open(os.path.join(BUILD, *p), encoding='utf-8').read()
COUNT = """(()=>{ const O=MutationObserver.prototype.observe; window.__mo=new Set(); MutationObserver.prototype.observe=function(t,o){ if(t===document.body||t===document.documentElement) window.__mo.add(this); return O.apply(this,arguments); }; })()"""


async def ctx(br):
    c = await br.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark', service_workers='block')
    await c.add_init_script(COUNT); await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        elif u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route); p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    return c, p, e

# the same changes, watched by a real observer and through pvxWatch with the same options: do both receive the same records?
SAME = """(async()=>{ const tick=()=>new Promise(r=>setTimeout(r,30));
  const OPTS=[[{childList:true,subtree:true},'body'],[{childList:true},'body'],[{attributes:true,attributeFilter:['class']},'body'],[{subtree:true,attributes:true,attributeFilter:['class']},'body'],
    [{childList:true,subtree:true,characterData:true},'body'],[{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class']},'body'],[{attributes:true,attributeFilter:['class','style'],subtree:true},'body'],
    [{subtree:true,childList:true,attributes:true,attributeFilter:['aria-checked','class']},'body'],[{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-modal']},'body'],
    [{attributes:true,attributeFilter:['style','class']},'html'],[{childList:true,subtree:true},'html'],[{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed']},'html'],
    [{attributes:true,subtree:true},'body'],[{attributes:true,attributeOldValue:true},'body']];   /* the last two ask for every attribute, listed by a caller or not */
  const sig=(ms,old)=>ms.map(m=>m.type[0]+':'+(m.target.id||m.target.nodeName)+':'+(m.attributeName||'')+':'+m.addedNodes.length+'/'+m.removedNodes.length+(old?':'+m.oldValue:'')).join(' ');
  const real=[], mine=[], obs=[]; OPTS.forEach((o,i)=>{ const t=o[1]==='body'?document.body:document.documentElement; real[i]=[]; mine[i]=[];
    const r=new MutationObserver(ms=>real[i].push(sig(ms,o[0].attributeOldValue))); r.observe(t,o[0]); obs.push(r); obs.push(pvxWatch(ms=>mine[i].push(sig(ms,o[0].attributeOldValue)),o[0],t)); });
  const box=document.createElement('div'); box.id='t386box'; const steps=[
    ()=>document.body.appendChild(box), ()=>{ box.className='a'; box.className='a b'; }, ()=>{ const s=document.createElement('span'); s.id='t386s'; s.textContent='one'; box.appendChild(s); },
    ()=>{ document.getElementById('t386s').firstChild.nodeValue='two'; }, ()=>{ box.style.color='red'; box.hidden=true; box.setAttribute('aria-modal','true'); box.setAttribute('aria-checked','false'); box.setAttribute('aria-pressed','true'); box.setAttribute('data-x','1'); },
    ()=>{ document.body.classList.add('t386'); document.body.classList.remove('t386'); }, ()=>{ document.documentElement.classList.add('t386'); document.documentElement.classList.remove('t386'); document.documentElement.style.setProperty('--t386','1'); document.documentElement.style.removeProperty('--t386'); },
    ()=>{ const st=document.createElement('style'); st.id='t386st'; document.head.appendChild(st); st.remove(); }, ()=>{ box.remove(); } ];
  for(const s of steps){ s(); await tick(); }
  obs.forEach(o=>o.disconnect()); const before=mine.map(x=>x.length); document.body.classList.add('t386z'); await tick(); document.body.classList.remove('t386z'); await tick();
  return {n:OPTS.length, same:OPTS.map((o,i)=>JSON.stringify(real[i])===JSON.stringify(mine[i])), counts:real.map(x=>x.length), quiet:mine.every((x,i)=>x.length===before[i]), first:[real[0].slice(0,2),mine[0].slice(0,2)], bad:OPTS.map((o,i)=>JSON.stringify(real[i])===JSON.stringify(mine[i])?null:[JSON.stringify(o),real[i],mine[i]]).filter(Boolean).slice(0,2)}; })()"""
ORDER = """(async()=>{ const tick=()=>new Promise(r=>setTimeout(r,30)); const log=[]; const errs=[]; const on=e=>{ errs.push(String(e.message)); e.preventDefault(); }; window.addEventListener('error',on);
  const a=pvxWatch(()=>log.push('a'),{attributes:true,attributeFilter:['data-t386']},document.body), b=pvxWatch(()=>{ log.push('b'); throw new Error('t386 on purpose'); },{attributes:true,attributeFilter:['data-t386']},document.body),
        c=pvxWatch(()=>log.push('c'),{attributes:true,attributeFilter:['data-t386']},document.body), d=pvxWatch(()=>log.push('d'),{attributes:true,attributeFilter:['data-t386-other']},document.body);
  document.body.setAttribute('data-t386','1'); await tick(); const first=log.join(''); b.disconnect(); document.body.setAttribute('data-t386','2'); await tick(); const second=log.join('').slice(first.length);
  [a,c,d].forEach(x=>x.disconnect()); document.body.removeAttribute('data-t386'); await tick(); await tick(); window.removeEventListener('error',on);
  return {first,second,after:log.join('').length,errs,handle:[typeof a.disconnect,typeof a.takeRecords,Array.isArray(a.takeRecords())]}; })()"""


@section(id='t386', title='n386 · the layers that watch the whole page share one observer per target (pvxWatch): each still receives what its own options ask for, in order',
         apps=['flow'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t386(br):
    app = rd('assets', 'flow', 'app.js'); lay = rd('assets', 'flow', 'layers.js') + rd('assets', 'flow', 'layers2.js')
    ok('The main script · pvxWatch is declared once, before anything else runs', len(re.findall(r'(?m)^var pvxWatch=', app)) == 1 and app.index('PVX-N386') < app.index('const STATUSES'))
    chain = re.findall(r'new MutationObserver\([^;]{0,400}?\)\.observe\(\s*document\.(?:body|documentElement)', lay)
    calls = [lay.count('pvxWatch('), lay.count('},document.body)'), lay.count('},document.documentElement)')]
    ok('The layer files · no block starts its own observer on document.body or <html> in one go any more; 23 call pvxWatch instead (19 on the body, 4 on <html>)', not chain and calls == [23, 19, 4], [len(chain), calls])
    ok('…the two that use one observer for more than the page are as they were (the overlay registry, and a menu that watches only while it is open)', len(re.findall(r'mo\.observe\(document\.body,', lay)) == 3 and lay.count('new MutationObserver(') >= 25, [len(re.findall(r'mo\.observe\(document\.body,', lay)), lay.count('new MutationObserver(')])

    c, p, e = await ctx(br)
    r = await p.evaluate("""({hubs:pvxWatch.hubs().map(h=>({t:h.target===document.body?'body':(h.target===document.documentElement?'html':'?'),n:h.watchers,o:JSON.parse(h.options)})), total:pvxWatch.count(), page:window.__mo.size})""")
    hubs = {h['t']: h for h in r['hubs']}
    ok('In the page · two observers do the work of 23: one on the body with 19 watchers, one on <html> with 4', set(hubs) == {'body', 'html'} and hubs['body']['n'] == 19 and hubs['html']['n'] == 4 and r['total'] == 23, r['hubs'])
    ok('…each observer asks the browser only for what its watchers asked for between them (the body: nodes, text, and five attributes; <html>: nodes and three attributes)',
       sorted(hubs['body']['o'].get('attributeFilter', [])) == ['aria-checked', 'aria-modal', 'class', 'hidden', 'style'] and hubs['body']['o'].get('characterData') is True and sorted(hubs['html']['o'].get('attributeFilter', [])) == ['aria-pressed', 'class', 'style'] and 'characterData' not in hubs['html']['o'], [hubs['body']['o'], hubs['html']['o']])
    ok('…observers watching the whole page: 7 in all, counting the shared files’ own (there were 28)', r['page'] <= 8, r['page'])
    r = await p.evaluate(SAME)
    ok('The records · for each of 14 sets of options (the 12 the layers use, and two that ask for every attribute), a watcher through pvxWatch receives exactly what a real observer with those options receives, batch for batch (nodes, attributes, text, old values; on the body and on <html>)',
       r['n'] == 14 and all(r['same']) and all(n > 0 for n in r['counts']), r['bad'] or r['counts'])
    ok('…and after disconnect() it receives nothing more', r['quiet'], r)
    r = await p.evaluate(ORDER)
    ok('Order · watchers are called in the order they registered, and one with nothing to receive is not called', r['first'] == 'abc', r)
    ok('…a watcher that throws does not stop the ones after it, and its error is still reported', r['first'] == 'abc' and any('t386 on purpose' in x for x in r['errs']), r['errs'])
    ok('…a watcher that disconnected is skipped, and the handle has disconnect() and takeRecords() like an observer', r['second'] == 'ac' and r['after'] == 5 and r['handle'] == ['function', 'function', True], r)
    # what the watchers are for still happens: things added to the page later are still picked up
    r = await p.evaluate("""(async()=>{ const d=document.createElement('div'); d.innerHTML='<span class="pvx-tapclick" id="t386w">x</span><button id="t386b" aria-label="Close"><svg id="t386v" width="12" height="12"></svg></button>'; document.body.appendChild(d);
      await new Promise(r=>setTimeout(r,700)); const o={word:document.getElementById('t386w').textContent, svg:document.getElementById('t386v').getAttribute('aria-hidden')}; d.remove(); return o; })()""")
    ok('The page · what the watchers are for still happens: a “Click” word added later gets its word, and a picture inside a named button is hidden from screen readers', r['word'] in ('Click', 'Tap') and r['svg'] == 'true', r)
    ok('No page errors', not newerr(e), newerr(e)[:3]); await c.close()
