"""Pravix OR — the n418 build's own check (Nov 21 2026): the Undo message animates only its entrance.
It had `transition: all`, so when the slow-device guard turned the floating glass solid, its blur and fill animated
away over 0.4 s (and on a slow machine it stayed part glass for most of a second, which is what made or_t392's no-blur
check fail on GitHub's WebKit). The material switches at once now; the entrance still animates."""
import core
from core import ok, section
from or_t390 import open_or
from or_t392 import STYLE, messages


@section(id='t418', title='n418 · OR · the Undo message animates only its entrance: on a slow device its glass turns solid at once (it animated away over 0.4 s)',
         apps=['or'], topics=['materials', 'motion'], engines=('chromium', 'webkit'))
async def s_t418(br):
    errs = []
    for dark in (True, False):
        mode = 'dark' if dark else 'light'
        c, p, e = await open_or(br, dark=dark)
        # hold the slow-device guard off until the check turns it on itself (as or_t392 does)
        await p.evaluate("(()=>{const d=document.documentElement;window.__allowNoblur=false;d.classList.remove('pvx-noblur');new MutationObserver(()=>{if(!window.__allowNoblur&&d.classList.contains('pvx-noblur'))d.classList.remove('pvx-noblur')}).observe(d,{attributes:true,attributeFilter:['class']})})()")
        await messages(p)
        t0 = await p.evaluate(STYLE, '.toast')
        tr = await p.evaluate("(()=>{const cs=getComputedStyle(document.querySelector('.toast'));return [cs.transitionProperty.replace(/\\s/g,''), cs.transitionDuration.replace(/\\s/g,'')]})()")
        # turn the blur off and read in the same task: no frame passes, so anything still animating shows its start value
        now = await p.evaluate("(sel)=>{window.__allowNoblur=true;document.documentElement.classList.add('pvx-noblur');const cs=getComputedStyle(document.querySelector(sel));const bg=cs.backgroundColor.match(/[\\d.]+/g).map(Number);return {bf:cs.backdropFilter||cs.webkitBackdropFilter||'none',a:bg.length>3?bg[3]:1}}", '.toast')
        await p.wait_for_timeout(60)
        soon = await p.evaluate(STYLE, '.toast')
        ok(f'Materials · {mode}: the Undo message is on the glass, then solid the moment the slow-device guard turns blur off — read at once and 60 ms later (it animated its blur and fill away over 0.4 s)',
           t0 and 'blur' in t0['bf'] and t0['a'] < 1 and now['bf'] == 'none' and now['a'] == 1 and soon['bf'] == 'none' and soon['a'] == 1, (t0['bf'], t0['a'], now, soon['bf'], soon['a']))
        ok(f'…{mode}: only its entrance animates — opacity and position, 0.4 s (it was every property)', tr[0] == 'opacity,transform' and tr[1] == '0.4s,0.4s', tr)
        errs += list(e); await c.close()
    # the entrance still animates: showing the message starts exactly two transitions, opacity and position, 0.4 s each.
    # Read from the browser's own list of running transitions in one task, so no clock or frame rate is involved.
    c, p, e = await open_or(br)
    ent = await p.evaluate("""(()=>{const t=document.getElementById('toast'); t.classList.remove('show','has-act'); t.getAnimations().forEach(a=>a.finish());
      const o0=parseFloat(getComputedStyle(t).opacity); toast('Maple · Closing',{action:'Undo',run(){}});
      const o1=parseFloat(getComputedStyle(t).opacity);                      /* a style flush: the transitions start here */
      const an=t.getAnimations().filter(a=>a.transitionProperty); const list=an.map(a=>[a.transitionProperty,a.effect.getTiming().duration]).sort();
      an.forEach(a=>a.finish()); return {o0,o1,list,end:parseFloat(getComputedStyle(t).opacity)}})()""")
    ok('Motion · the message still fades and rises in: showing it starts two transitions, opacity and position, 0.4 s each, from hidden to fully in',
       ent['o0'] == 0 and ent['o1'] < 1 and ent['list'] == [['opacity', 400], ['transform', 400]] and ent['end'] == 1, ent)
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
