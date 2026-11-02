"""Treatment Sheets — the n298 build's own checks: the performance audit's quick wins (claude/treatment-performance-audit-2026-11-01.md, fix #1).
The layers listen to the app's events instead of polling, the toolbar / stage / estimate are measured only when they changed, and the two
big scripts are preloaded. Nothing people see changes, so most checks here are that the old behaviour still happens, by the new route.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

# counters for what the page does on its own: timers created and fired, layout reads, observer callbacks
INIT = r"""
window.__k={ints:[],fires:0,gbcr:0,gcs:0,efp:0,mo:0};
(function(){const SI=window.setInterval;window.setInterval=function(f,ms){__k.ints.push(+ms||0);const g=typeof f==='function'?function(){__k.fires++;return f.apply(this,arguments)}:f;return SI(g,ms)};
const G=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){__k.gbcr++;return G.apply(this,arguments)};
const C=window.getComputedStyle;window.getComputedStyle=function(){__k.gcs++;return C.apply(this,arguments)};
const E=Document.prototype.elementFromPoint;Document.prototype.elementFromPoint=function(){__k.efp++;return E.apply(this,arguments)};
const M=window.MutationObserver;window.MutationObserver=function(cb){return new M(function(a,b){__k.mo++;return cb.call(this,a,b)})};})();"""
RESET = "(()=>{__k.fires=0;__k.gbcr=0;__k.gcs=0;__k.efp=0;__k.mo=0})()"
SNAP = "JSON.parse(JSON.stringify({fires:__k.fires,gbcr:__k.gbcr,gcs:__k.gcs,efp:__k.efp,mo:__k.mo}))"
ST = "(()=>{const s=history.state||{};return [s.pvx?s.area:null,s.pvx?s.sheet:null,location.hash,typeof currentCTab!=='undefined'?currentCTab:null]})()"


@section(id='t298', title='n298 · Treatment Sheets: the performance audit’s quick wins, with nothing people see changed',
         apps=['treatment'], topics=['performance'], engines=('chromium', 'webkit'))
async def s_t298(br):
    ctx, pg, e = await ts(br, PORT, view='sheet', init=INIT)
    await pg.wait_for_timeout(1200)
    bus = await pg.evaluate("[typeof (window.tsHooks&&tsHooks.on), typeof window.pvxOn, Object.keys((window.tsHooks&&tsHooks.list&&tsHooks.list())||{}).filter(k=>/^(tab|sheet\\.opening|sheet\\.drawn|header\\.refresh|rendered)$/.test(k)).length]")
    ok('the app’s event bus is open to the page (tsHooks.on), the layers have their subscribe helper, and the five events they use have listeners',
       bus[0] == 'function' and bus[1] == 'function' and bus[2] == 5, bus)
    ints = sorted(await pg.evaluate("__k.ints.slice()"))
    polls = [p for p in ints if p in (120, 700, 800, 1500)]
    ok('the layers’ polls are gone: no 120 ms (tab), 700 ms (Clear button), 800 ms (anesthesia frame) or 1.5 s (hours shown) timers; at most 20 intervals on the page (there were 26)',
       not polls and len(ints) <= 20, [polls, len(ints), ints])
    pre = await pg.evaluate("(()=>{const l=[...document.querySelectorAll('link[rel=preload][as=script]')].map(l=>l.getAttribute('href'));const s=[...document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src')).filter(s=>/^(core|store)\\.js\\?v=/.test(s));return {l,s}})()")
    ok('core.js and store.js are preloaded from the head, under the same versioned addresses the page loads them by', set(pre['s']) <= set(pre['l']) and len(pre['s']) == 2, pre)
    # idle: the page should mostly sleep
    await pg.evaluate(RESET); await pg.wait_for_timeout(5000); idle = await pg.evaluate(SNAP)
    ok('5 s idle on an open sheet: under 80 timer fires (there were ~140), under 500 getBoundingClientRect and 600 getComputedStyle reads (there were ~1,100 and ~1,450), under 50 elementFromPoint (there were ~100)',
       idle['fires'] < 80 and idle['gbcr'] < 500 and idle['gcs'] < 600 and idle['efp'] < 50, idle)
    # the old behaviour, by the new route
    sh = await pg.evaluate("__tsFind.cur()")
    s0 = await pg.evaluate(ST)
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(250); s1 = await pg.evaluate(ST)
    await pg.evaluate("history.back()"); await pg.wait_for_timeout(600); s2 = await pg.evaluate(ST)
    ok('Back and Forward (n239) still follow the section without a poll: Tasks is its own history entry, and Back returns to the sheet',
       s0[0] == 'sheet' and s0[1] == sh and s1[0] == 'tasks' and s2[0] == 'sheet' and s2[3] == 'sheet', [s0, s1, s2])
    other = await pg.evaluate("(()=>{const a=(__tsFind.all()||[]).map(x=>x._id||x.id).filter(Boolean);return a.find(x=>x!==__tsFind.cur())||null})()")
    if other:
        await pg.evaluate(f"tsOpenSheet('{other}')"); await pg.wait_for_timeout(500); s3 = await pg.evaluate(ST)
        await pg.evaluate("history.back()"); await pg.wait_for_timeout(900); s4 = await pg.evaluate("[__tsFind.cur(), (history.state||{}).sheet]")
        ok('…opening another patient is noticed from the app’s sheet.opening event (a new entry, the address names the patient), and Back reopens the first',
           s3[1] == other and ('sheet=' + other) in s3[2] and s4[0] == sh and s4[1] == sh, [other, s3, s4])
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(300)
    await pg.evaluate("document.activeElement&&document.activeElement.blur()")
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(700)
    fo = await pg.evaluate("(()=>{const a=document.activeElement;return a?[a.className,a.getAttribute('role'),a.tabIndex]:null})()")
    ok('coming back to the Status board puts focus on its row (n241), from the tab event, not a 120 ms poll', fo and 'sb-row' in fo[0] and fo[1] == 'row' and fo[2] == 0, fo)
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(600)
    st = await pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--pvx-stage-h').trim(), document.getElementById('stage').clientHeight+'px']")
    await pg.set_viewport_size({'width': 1440, 'height': 760}); await pg.wait_for_timeout(500)
    st2 = await pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--pvx-stage-h').trim(), document.getElementById('stage').clientHeight+'px']")
    ok('the grid’s height variable (n288) still equals the stage’s height, and follows a resize, written from a ResizeObserver', st[0] == st[1] and st2[0] == st2[1] and st2[0] != st[0], [st, st2])
    await pg.set_viewport_size({'width': 1440, 'height': 900}); await pg.wait_for_timeout(500)
    await pg.click('#tsSearch'); await pg.keyboard.type('mar'); await pg.wait_for_timeout(300)
    x0 = await pg.evaluate("document.querySelector('.qadd .pvx-sf-x').hidden")
    await pg.evaluate("document.getElementById('tsSearch').value=''; tsEmit('rendered')"); await pg.wait_for_timeout(120)
    x1 = await pg.evaluate("document.querySelector('.qadd .pvx-sf-x').hidden")
    await pg.evaluate("document.getElementById('tsSearch').value='me'; document.body.click()"); await pg.wait_for_timeout(120)
    x2 = await pg.evaluate("document.querySelector('.qadd .pvx-sf-x').hidden")
    ok('the add-treatment field’s Clear button (n291) shows while there is text and follows the app emptying or filling the field at once, on a redraw event or a click (no 700 ms poll)', x0 is False and x1 is True and x2 is False, [x0, x1, x2])
    await pg.keyboard.press('Escape'); await pg.evaluate("document.getElementById('tsSearch').value=''; document.body.click()"); await pg.wait_for_timeout(200)
    z = await pg.evaluate("(()=>{const b=[...document.querySelectorAll('.ts-zoom button')];return b.length===3?[b[1].textContent.trim(),b[1].getAttribute('aria-label')]:null})()")
    ok('the zoom still says how many hours are on screen (n291), counted after the grid’s changes, not every 1.5 s', z and z[0].endswith(' h') and z[1] and z[1].startswith('Showing '), z)
    an = await pg.evaluate("(()=>{const b=document.querySelector('#clinSwitcher .seg[data-ctab=anes] .seg-badge.anes');return b?[b.className, typeof (window.tsAnes&&tsAnes.sheetId)]:null})()")
    ok('the Anesthesia tab’s state badge (anes.js) is placed for the open sheet from the sheet events, not a 1 s poll', an and an[1] == 'function', an)
    tb = await pg.evaluate("(()=>{const t=document.querySelector('#ctab-sheet .treatment-toolbar');return t?[t.hasAttribute('data-measure'), t.getAttribute('data-fit')]:null})()")
    ok('the sheet toolbar is measured and left clean (n255: no data-measure left behind)', tb and tb[0] is False, tb)
    ok('no page errors', not e, e[:3])
    await ctx.close()

    # iPad width, where the toolbar needs fitting: the fit still happens, from the toolbar's own changes and resizes
    ctx, pg, e = await ts(br, PORT, vp=(1180, 820), view='sheet', init=INIT)
    await pg.evaluate("(()=>{const d=document.querySelector('#ctab-sheet .ts-daynav');if(d&&!d.querySelector('.dn-late')){const b=document.createElement('button');b.type='button';b.className='dn-late';b.textContent='14 from last night';d.appendChild(b)}})()")
    await pg.wait_for_timeout(900)
    fb = await pg.evaluate("""(()=>{const t=document.querySelector('#ctab-sheet .treatment-toolbar');const r=t.getBoundingClientRect(),edge=r.right-parseFloat(getComputedStyle(t).paddingRight)+0.5;
      const out=[...t.children].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().right>edge).map(e=>e.className);return {fit:t.getAttribute('data-fit'),out}})()""")
    ok('1180 iPad with “14 from last night” added to the toolbar: every control is still inside the window (the fit ran for the toolbar’s change)', not fb['out'], fb)
    await pg.evaluate(RESET)
    tid = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Temperature/i.test(t.order.name));return t?t.id:null})()")
    await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(500); await pg.fill('#cd-value', '101.5'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
    ch = await pg.evaluate(SNAP)
    v = await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>t.id==='" + str(tid) + "');return t?[t.status,String(t.value||t.val||'')]:null})()")
    ok('charting one value: under 120 elementFromPoint calls (there were ~160) and under 1,200 getBoundingClientRect (there were ~1,300–1,700); the value is charted',
       ch['efp'] < 120 and ch['gbcr'] < 1200 and v and v[0], [ch, v])
    ok('no page errors (iPad)', not e, e[:3])
    await ctx.close()
