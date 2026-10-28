"""n259 audit — Treatment Sheets motion on n258: what moves on each frequent action, how long, what loops at rest, Reduce Motion.
python3 a15.py SITE OUT.json"""
import sys, os, json, asyncio
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from h import *
from playwright.async_api import async_playwright
SITE, OUT = sys.argv[1], sys.argv[2]; PORT = serve(SITE)
REC = r"""(()=>{window.__mv=[];const d=e=>{if(!e||!e.tagName)return '';let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;const c=(e.getAttribute&&e.getAttribute('class')||'').trim();if(c)s+='.'+c.split(/\s+/).slice(0,2).join('.');const p=e.closest&&e.closest('[id]');return s+(p&&p!==e?' @'+p.id:'')};
 const snap=()=>{document.getAnimations().forEach(a=>{if(a.__seen)return;a.__seen=1;const t=a.effect&&a.effect.target;const tim=a.effect.getComputedTiming();const k=a.effect.getKeyframes?a.effect.getKeyframes():[];
   const props=[...new Set(k.flatMap(f=>Object.keys(f)).filter(p=>!['offset','easing','composite','computedOffset'].includes(p)))];
   window.__mv.push({kind:a.constructor.name,name:a.animationName||a.transitionProperty||'',props,dur:Math.round(tim.duration||0),delay:Math.round(tim.delay||0),it:tim.iterations,target:d(t)})})};
 window.__mvSnap=snap;['transitionrun','animationstart'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(snap,0),true));   /* no wrapper on Element.animate: WebKit refuses it, and the 100 ms polls catch script animations */})()"""
ACTIONS = [
    ('section: dash', "selectCTab('dash')"), ('section: tasks', "selectCTab('tasks')"), ('section: sheet', "selectCTab('sheet')"),
    ('section: vitals', "selectCTab('vitals')"), ('section: timeline', "selectCTab('timeline')"), ('section: charges', "selectCTab('charges')"),
    ('section: notes', "selectCTab('notes')"), ('back to sheet', "selectCTab('sheet')"),
    ('chart a cell (drawer opens)', "document.querySelector('#sheetInner .mark.overdue').click()"),
    ('close the drawer', "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))"),
    ('Share menu', "document.getElementById('tsCopyBtn').click()"), ('close menu', "document.body.click()"),
    ('patient menu', "document.getElementById('tsPatientChip').click()"), ('close menu 2', "document.body.click()"),
    ('switch patient tab', "(()=>{const t=[...document.querySelectorAll('.pt-tab:not(.cur) .pt-main')][0];t&&t.click()})()"),
    ('switch back', "(()=>{const t=[...document.querySelectorAll('.pt-tab:not(.cur) .pt-main')][0];t&&t.click()})()"),
    ('message', "toast('Note saved')"),
    ('Settings sheet', "document.getElementById('tsSettingsBtn').click()"),
    ('close Settings', "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))"),
    ('next day', "(()=>{const b=document.querySelector('[aria-label=\"Previous day\"]');b&&b.click()})()"),
    ('zoom in', "(()=>{const b=document.querySelector('[aria-label^=\"Show fewer hours\"]');b&&b.click()})()"),
    ('View menu', "document.querySelector('.ts-view-btn').click()"), ('close menu 3', "document.body.click()"),
]
REST = r"""(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect.getComputedTiming().iterations===Infinity).map(a=>{const t=a.effect.target;return (a.animationName||a.transitionProperty||a.constructor.name)+' '+(t?(t.id||(t.getAttribute('class')||'').slice(0,30)||t.tagName):'')}))()"""
async def main():
    res = {}
    async with async_playwright() as pw:
        br = await pw.chromium.launch()
        for rm in [False, True]:
            for vp, touch in [((1440, 900), False), ((390, 844), True)]:
                key = f'{"rm" if rm else "default"}/{vp[0]}'
                ctx, pg, e = await ts(br, PORT, vp=vp, touch=touch, view='sheet', media={'reduced_motion': 'reduce'} if rm else None)
                await pg.evaluate(REC); out = []
                for nm, js in ACTIONS:
                    await pg.evaluate("window.__mv=[];document.getAnimations().forEach(a=>a.__seen=1)")
                    try: await pg.evaluate(js)
                    except Exception as ex: out.append([nm, 'ERR ' + str(ex)[:60]]); continue
                    for _ in range(6): await pg.wait_for_timeout(100); await pg.evaluate("window.__mvSnap()")
                    mv = await pg.evaluate("window.__mv")
                    out.append([nm, mv]); await pg.wait_for_timeout(500)
                rest = {}
                for v in ['dash', 'tasks', 'sheet', 'vitals', 'timeline', 'charges', 'notes']:
                    await pg.evaluate(f"selectCTab('{v}')"); await pg.wait_for_timeout(3500); rest[v] = await pg.evaluate(REST)
                res[key] = {'actions': out, 'rest': rest, 'errs': e[:3]}
                await ctx.close()
        await br.close()
    json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False); print('ok')
asyncio.run(main())
