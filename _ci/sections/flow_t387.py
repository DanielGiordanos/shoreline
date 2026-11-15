"""Pravix Flow — the n387 build's own checks (Nov 15 2026): a function that layers replaced is one function with its layers
in a list (reorganisation, stage 2c). Fifty-five functions of the main script were replaced by later blocks, 96 times: each
block saved the function as it was and put its own in its place. Now each is NAME(…) → its layers → NAME$base, and a block
adds a layer with pvxBefore, pvxAfter or pvxWrap. The order is the order the blocks ran, as before."""
import os, re
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
rd = lambda *p: open(os.path.join(BUILD, *p), encoding='utf-8').read()
TABLE = re.compile(r'/\* (\w+) · its layers, innermost first: (.*?)   \(PVX-N387; kept true by flow_t387\) \*/\nfunction (\w+)\(([^)]*)\)\{ return pvxRun\(\'(\w+)\',(\w+)\$base,this,arguments\); \}\nfunction (\w+)\$base\(([^)]*)\)')


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
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned','Canine',95,'Vomiting'],['Rocky','Hale','Exam','Room 1',2,D[0],'Canine',35,'Cough']]
   .forEach((r,i)=>PATIENTS.push(patient({id:'s'+i,name:r[0],last:r[1],owner:'Synthetic',status:r[2],room:r[3],prio:r[4],doctor:r[5],species:r[6],arrival:new Date(now-r[7]*60000),reason:r[8],timeline:[{label:'Checked in',at:new Date(now-r[7]*60000)}]})));
  renderAll(); return PATIENTS.length; })()"""
# the order, on a function made for the check: layers added as before/after/wrap run as the old wrappers would have
ORDER = """(()=>{ const log=[]; window.t387$base=function(a,b){ log.push('base:'+a+b+':'+(this&&this.tag||'w')); return 'R'; }; window.t387=function(a,b){ return pvxRun('t387',t387$base,this,arguments); };
  const r0=t387(1,2); const l0=log.splice(0).join(' ');
  pvxAfter('t387',function(a,b){ log.push('after1:'+a+b); return 'ignored'; },'one'); pvxBefore('t387',function(a,b){ log.push('before2:'+a+b); },'two'); pvxAfter('t387',function(){ log.push('after3'); },'three');
  const r1=t387.call({tag:'T'},1,2); const l1=log.splice(0).join(' ');
  pvxWrap('t387',function(inner){ return function(a,b){ log.push('wrap4-in'); if(a==='stop') return 'stopped'; const r=inner.call(this,a,b+1); log.push('wrap4-out'); return r+'!'; }; },'four');
  pvxBefore('t387',function(){ log.push('before5'); },'five'); pvxAfter('t387',function(){ log.push('after6'); },'six');
  const r2=t387(1,2); const l2=log.splice(0).join(' '); const r3=t387('stop'); const l3=log.splice(0).join(' ');
  // a layer added while the function is running takes effect from the next call
  let added=false; pvxAfter('t387',function(){ if(!added){ added=true; pvxAfter('t387',function(){ log.push('late'); },'late'); } log.push('adder'); },'adder'); t387(1,2); const l4=log.splice(0).join(' '); t387(1,2); const l5=log.splice(0).join(' ');
  // a function without a NAME$base is wrapped the old way, with the same three calls
  window.t387plain=function(x){ log.push('plain:'+x); return x*2; }; pvxBefore('t387plain',function(x){ log.push('pb:'+x); }); pvxAfter('t387plain',function(x){ log.push('pa:'+x); }); pvxWrap('t387plain',function(inner){ return function(x){ return inner.call(this,x+1)+1; }; });
  const r6=t387plain(1); const l6=log.splice(0).join(' '); let threw=''; try{ pvxAfter('t387nothing',function(){}); }catch(e){ threw=String(e.message); }
  const of=pvxSteps.of('t387').map(x=>x.who+':'+x.kind).join(' '); delete pvxSteps.s.t387;
  return {r0,l0,r1,l1,r2,l2,r3,l3,l4,l5,r6,l6,threw,of}; })()"""


@section(id='t387', title='n387 · a function that layers replaced is one function with its layers in a list (pvxBefore, pvxAfter, pvxWrap): 55 functions, 96 layers, the same order',
         apps=['flow'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t387(br):
    app = rd('assets', 'flow', 'app.js'); lay = rd('assets', 'flow', 'layers.js') + rd('assets', 'flow', 'layers2.js')
    T = TABLE.findall(app); names = [t[0] for t in T]
    ok('The main script · 55 functions are each NAME(…), which runs NAME$base with its layers, and each has the list of its layers written above it', len(T) == 55 and all(t[0] == t[2] == t[4] == t[5] == t[6] for t in T) and len(set(names)) == 55, len(T))
    ok('…with the same parameters as before, and the runner is declared before anything else runs', all(t[3].replace(' ', '') == t[7].replace(' ', '') for t in T) and app.index('PVX-N387') < app.index('const STATUSES') and len(re.findall(r'(?m)^function pvxRun\(', app)) == 1)
    again = [n for n in names if re.search(r'(?<![\w$.\'])(?:window\.)?' + n + r'\s*=\s*(?:(?:window\.)?' + n + r'\s*=\s*)?function', lay)]
    ok('The layer files · no block puts its own function in place of one of the 55 any more', not again, again)
    kinds = {k: len(re.findall(r'\b' + k + r"\('(?:" + '|'.join(names) + r")',", lay)) for k in ('pvxAfter', 'pvxBefore', 'pvxWrap')}; by_name = len(re.findall(r'pvxWrap\((?:n|name),function\(f\)\{ return function', lay))
    ok('…they add layers instead: 37 that run after the function, 6 before it, and 41 that wrap it (they decide whether it runs, or change what goes in or comes out)', kinds == {'pvxAfter': 37, 'pvxBefore': 6, 'pvxWrap': 41}, kinds)
    ok('…and the four pieces of code that replaced several functions by name (undo for moves, undo for a changed field, nested changes, fitting text fields) add their 12 layers the same way, in their place in the order', by_name == 4 and not re.search(r'window\[(?:n|name)\]\s*=\s*function', lay), by_name)
    want = {t[0]: [x.split(' ', 1)[1] for x in t[1].split(' · ')] for t in T}
    ok('…96 layers in all; fillDrawer has 8 and openDrawer 5, and moveStatus has its four in the order the blocks run (a block’s undo sits between two others, where it was)', len(want.get('fillDrawer', [])) == 8 and len(want.get('openDrawer', [])) == 5 and want['openDrawer'][1].endswith('before') and want.get('moveStatus') == ['#10 wrap', 'n192 wrap', 'n253-admit wrap', 'n350 wrap'] and sum(len(v) for v in want.values()) == 96, [want.get('fillDrawer'), want.get('openDrawer')])
    ok('…the two that could not be written this way are exactly as they were: switchApp (a block keeps the saved copy for another use) and notify (blocks swap it for a moment and put it back)',
       'switchApp$base' not in app and 'notify$base' not in app and re.search(r'window\.switchApp\s*=\s*function', lay) and re.search(r'window\.notify\s*=\s*function', lay))

    c, p, e = await ctx(br)
    r = await p.evaluate("""({names:pvxSteps.names().sort(), of:Object.fromEntries(pvxSteps.names().map(n=>[n,pvxSteps.of(n).map(x=>x.who+' '+x.kind)])), types:pvxSteps.names().map(n=>typeof window[n]+typeof window[n+'$base']+window[n].length+'/'+window[n+'$base'].length), left:[typeof switchApp,typeof notify,typeof window.switchApp$base]})""")
    ok('In the page · the 55 have their layers, and the lists written in app.js are the lists the page really has, name for name and in order', r['names'] == sorted(names) and r['of'] == want, [n for n in names if r['of'].get(n) != want.get(n)][:5])
    ok('…each is a function with the same number of parameters as the one it runs', all(re.fullmatch(r'functionfunction(\d+)/\1', t) for t in r['types']) and r['left'] == ['function', 'function', 'undefined'], [t for t in r['types'] if not re.fullmatch(r'functionfunction(\d+)/\1', t)][:5])
    r = await p.evaluate(ORDER)
    ok('The order · with no layers the function simply runs', r['r0'] == 'R' and r['l0'] == 'base:12:w', [r['r0'], r['l0']])
    ok('…a “before” added later runs before the earlier layers, an “after” added later runs after them; they get the same arguments and the same this, and what an “after” returns is ignored',
       r['r1'] == 'R' and r['l1'] == 'before2:12 base:12:T after1:12 after3', [r['r1'], r['l1']])
    ok('…a wrap sits where it was added: layers added after it run outside it, the earlier ones inside; it can change what goes in and what comes out', r['r2'] == 'R!' and r['l2'] == 'before5 wrap4-in before2:13 base:13:w after1:13 after3 wrap4-out after6', [r['r2'], r['l2']])
    ok('…and it can decide the function does not run at all, as a replacement could', r['r3'] == 'stopped' and r['l3'] == 'before5 wrap4-in after6', [r['r3'], r['l3']])
    ok('…a layer added while the function is running takes effect from the next call', r['l4'].endswith('adder') and 'late' not in r['l4'] and r['l5'].endswith('adder late'), [r['l4'], r['l5']])
    ok('…the same three calls work on a function that has no NAME$base (it is wrapped the old way), and a name that is no function is refused', r['r6'] == 5 and r['l6'] == 'pb:2 plain:2 pa:2' and 'no function named' in r['threw'] and r['of'].startswith('one:after two:before three:after four:wrap'), [r['r6'], r['l6'], r['threw'], r['of']])
    await p.evaluate(SEED2); await p.wait_for_timeout(900); await p.evaluate("openDrawer('s1')"); await p.wait_for_timeout(1200)
    r = await p.evaluate("""({open:document.getElementById('drawer').classList.contains('open'), name:(document.getElementById('dName')||document.querySelector('#drawer h2,#drawer .d-name')||{}).textContent||'',
      flags:(document.getElementById('flagsMount')||{children:[]}).children.length, msgs:(document.getElementById('messagesMount')||{children:[]}).children.length, docs:!!document.querySelector('#drawer [id*="doc" i], #drawer [class*="doc" i]')})""")
    ok('The drawer · opening a patient still fills the drawer and each layer’s part of it (flags, messages, documents)', r['open'] and r['flags'] > 0 and r['msgs'] > 0 and r['docs'], r)
    r = await p.evaluate("""(async()=>{ const o={}; switchView('board'); await new Promise(r=>setTimeout(r,600)); o.board=currentView; switchView('list'); await new Promise(r=>setTimeout(r,600)); o.rows=document.querySelectorAll('#view-list tbody tr').length;
      closeDrawer(); await new Promise(r=>setTimeout(r,500)); o.closed=!document.getElementById('drawer').classList.contains('open'); o.search=(searchIndex('roc')||[]).length; o.title=fmtTitleCase("bella o'neil"); return o; })()""")
    ok('…and the rest of the page works through its layers: the views switch, the list draws its rows, the drawer closes, search finds a patient, a name is put in title case', r['board'] == 'board' and r['rows'] >= 2 and r['closed'] and r['search'] > 0 and r['title'].startswith('Bella'), r)
    ok('No page errors', not newerr(e), newerr(e)[:3]); await c.close()
