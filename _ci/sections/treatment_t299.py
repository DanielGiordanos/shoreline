"""Treatment Sheets — the n299 build's own checks: the HIG layers folded out of index.html (step 2 of the performance audit).
index.html keeps the markup and a few early scripts; the layers' styles live in app.css (head) and layers.css (body), their scripts in
src/layers.js → layers.js (minified), and one MutationObserver on document.body serves every layer (pvxWatch). Nothing people see
changes. Written with that build; they run in Chromium and WebKit."""
import os
from tsh import *
from core import ok, section, until, PORT, BUILD

INIT = r"""
window.__w={bodyObs:0,cb:0};
(function(){const seen=new WeakSet();const M=window.MutationObserver;window.MutationObserver=function(cb){const o=new M(function(a,b){__w.cb++;return cb.call(this,a,b)});const ob=o.observe.bind(o);o.observe=function(t,opt){if(t===document.body&&!seen.has(o)){seen.add(o);__w.bodyObs++}return ob(t,opt)};return o};})();"""


@section(id='t299', title='n299 · Treatment Sheets: the layers folded out of index.html, one observer for all of them',
         apps=['treatment'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t299(br):
    T = os.path.join(BUILD, 'treatment')
    idx = open(os.path.join(T, 'index.html'), encoding='utf-8').read()
    inline = [l for l in idx.split('\n') if ('<style id="pvx-n2' in l or '<script id="pvx-n2' in l) and 'pvx-n225-text' not in l and 'pvx-n223-guard' not in l and 'pvx-n267-ts' not in l]
    ok('index.html is the page again: under 40 KB (it was 370 KB) with no inline HIG layer blocks left in <body> (n225\'s text size, the managers\' guard and n267 stay in <head>)',
       len(idx) < 40000 and not inline and idx.count('<style') <= 3, [len(idx), inline[:3], idx.count('<style')])
    files = {f: os.path.exists(os.path.join(T, f)) for f in ('layers.css', 'layers.js', 'src/layers.js', 'src/build.py')}
    src = open(os.path.join(T, 'src/layers.js'), encoding='utf-8').read() if files['src/layers.js'] else ''
    ok('the layers live in layers.css, src/layers.js (readable, with each block named) and layers.js (built by src/build.py), 42 script blocks from n132 to n298 in order',
       all(files.values()) and src.count('/* ════ ') >= 42 and src.index('pvx-n239-ts') < src.index('pvx-n255 ') < src.index('pvx-n293-ts'), files)
    ctx, pg, e = await ts(br, PORT, view='sheet', init=INIT)
    await pg.wait_for_timeout(1200)
    w = await pg.evaluate("[__w.bodyObs, typeof window.pvxWatch==='function'?pvxWatch.count():null, [...document.styleSheets].filter(s=>s.href).map(s=>s.href.split('/').pop().split('?')[0])]")
    ok('one MutationObserver watches document.body for all the layers (there were 27; the app\'s own few remain, 6 at most in all): pvxWatch serves 25 or more subscribers; app.css, anes.css and layers.css are the page\'s stylesheets',
       w[0] <= 6 and w[1] and w[1] >= 25 and 'layers.css' in w[2] and 'app.css' in w[2], w)
    login = await pg.evaluate("[...document.styleSheets].some(s=>{try{return [...s.cssRules].some(r=>r.selectorText&&r.selectorText.indexOf('#sbLogin')===0)}catch(e){return false}})")
    safe = await pg.evaluate("[...document.styleSheets].some(s=>{try{return [...s.cssRules].some(r=>r.cssText&&r.cssText.indexOf('safe-area-inset')>-1)}catch(e){return false}})")
    ok('the head layers\' rules (Flow\'s sign-in card, the safe areas) are in force from app.css', login and safe, [login, safe])
    # the layers still do their work through the shared observer
    await pg.evaluate("__w.cb=0")
    tid = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Temperature/i.test(t.order.name));return t?t.id:null})()")
    await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(500); await pg.fill('#cd-value', '101.5'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
    cb = await pg.evaluate("__w.cb")
    v = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>t.id==='" + str(tid) + "');return t?t.status:null})()")
    ok('charting one value wakes the observers under 200 times (there were ~400–500 callbacks across 27 observers), and the value is charted', cb < 200 and v, [cb, v])
    a = await pg.evaluate("""(async()=>{const b=document.createElement('button');b.type='button';b.textContent='Probe';b.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 4h16"/></svg> Probe';document.getElementById('stage').appendChild(b);
      await new Promise(r=>setTimeout(r,400));const s=b.querySelector('svg');const out=[s.getAttribute('aria-hidden'), !!document.querySelector('#tsModal')];b.remove();return out})()""")
    ok('n227 still hides a decorative icon added beside its label (now checking only what was added), and n133\'s overlay registry still runs', a[0] == 'true' and a[1], a)
    fit = await pg.evaluate("(()=>{const t=document.querySelector('#ctab-sheet .treatment-toolbar');return t?[t.hasAttribute('data-measure'), !!document.querySelector('.pvx-skip'), !!document.querySelector('#clinSwitcher [aria-current]')]:null})()")
    ok('n255\'s skip link and toolbar fit, and n216\'s section switcher state, are in place from layers.js', fit and fit[0] is False and fit[1] and fit[2], fit)
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(900)
    tb = await pg.evaluate("(()=>{const t=document.querySelector('#ctab-dash .sb-inner[role=table]');return t?[t.getAttribute('role'), document.querySelectorAll('#ctab-dash .sb-row[role=row]').length>1]:null})()")
    ok('n241\'s board table semantics arrive through the shared observer', tb and tb[0] == 'table' and tb[1], tb)
    ok('no page errors', not e, e[:3])
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, view='sheet')
    ph = await pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--pvx-stage-h').trim()!=='', !!document.querySelector('#clinSwitcher .pvx-tmore'), getComputedStyle(document.querySelector('#clinSwitcher')).position]")
    ok('iPhone: the folded styles and scripts still shape the phone layout (the stage height variable is set, the section switcher is the fixed tab bar with More)', ph[0] and ph[1] and ph[2] == 'fixed', ph)
    ok('no page errors (iPhone)', not e, e[:3])
    await ctx.close()
