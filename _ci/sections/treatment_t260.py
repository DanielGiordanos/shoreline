"""Treatment Sheets — the n260 build's own checks: Treatment Sheets against HIG Writing, Charting data, Collaboration and
sharing, Drag and drop. Written with that build; they run in Chromium and WebKit (Safari's engine)."""
import os, re, json
import tsh as h
from tsh import *
from core import ok, section, until, BUILD as SITE, PORT, ENGINE
from helpers import ts232   # the seed with a vitals history (the range lines need one)

# every visible name, tooltip, label and placeholder (not field values)
WORDS = r"""(sel=>{const vis=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';const o=[];
  const root=document.querySelector(sel)||document.body;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let t;
  while(t=w.nextNode()){const e=t.parentElement;if(e&&vis(e)&&!e.closest('script,style,#pvxTopnav'))o.push(t.nodeValue)}
  root.querySelectorAll('[title],[aria-label],[placeholder]').forEach(e=>{['title','aria-label','placeholder'].forEach(a=>{const v=e.getAttribute(a);if(v)o.push(v)})});return o})"""
FOLDS = "[...document.querySelectorAll('.gband .gsection[role=button]')].map(g=>[(g.querySelector('.stitle')||g).textContent.trim(),g.getAttribute('title')||'',(g.querySelector('.sec-add')||{getAttribute:()=>''}).getAttribute('aria-label')||''])"
NOW = r"""(()=>[...document.querySelectorAll('#ctab-vitals .vx-now')].filter(n=>n.querySelector('.vx-alr')).slice(0,3).map(n=>{const r=n.closest('.v-row'),f=r.querySelector('.v-input input,.v-input select'),fb=f&&f.getBoundingClientRect(),nb=n.getBoundingClientRect();
  const ends=[...n.querySelectorAll('small')].map(s=>{const g=document.createRange();g.selectNodeContents(s);return Math.round(g.getBoundingClientRect().right)});
  const kept=[...n.querySelectorAll('.vx-nw')].every(s=>s.getClientRects().length===1);
  return {txt:[...n.querySelectorAll('small')].map(s=>s.textContent),right:Math.max(...ends),field:fb&&fb.top<nb.bottom&&fb.bottom>nb.top?Math.round(fb.left):null,kept}}))()"""
SHARE_LINK = "(()=>{document.getElementById('tsCopyBtn').click();setTimeout(()=>{const b=document.querySelector('#tsCopyMenu [data-c=\"link\"]');b&&b.click()},250)})()"
TOASTS = "[...document.querySelectorAll('#toastWrap .ctoast')].map(t=>t.innerText.replace(/\\s+/g,' '))"


async def drag(pg, label, dx, release=True):
    b = await pg.locator(f'#sheetInner .mark[aria-label="{label}"]').first.bounding_box(); x, y = b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
    await pg.mouse.move(x, y); await pg.mouse.down()
    for i in range(1, 11): await pg.mouse.move(x + dx * i / 10, y); await pg.wait_for_timeout(30)
    await pg.wait_for_timeout(150)
    if release: await pg.mouse.up()


@section(id='t260', title='n260 · Treatment Sheets against HIG Writing, Charting data, Collaboration and sharing, Drag and drop',
         apps=['treatment'], topics=['writing', 'charts', 'sharing', 'drag-drop', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t260(br):
    # ── Writing 1. one name per section ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    f = await pg.evaluate(FOLDS)
    obs = [x for x in f if x[0].startswith('Observations')]
    ok('Writing: the Observations band, its tooltip and its + button all say “Observations” (they said “Basic observation” / “Basic Observation”)',
       obs and obs[0][1].startswith('Hide Observations') and obs[0][2] == 'Add to Observations', f)
    pc = [x for x in f if x[0].startswith('Patient care')]
    ok('Writing: Patient care is “Patient care” in its tooltip and + button too (they said “Patient Care”)', pc and 'Patient Care' not in pc[0][1] + pc[0][2] and pc[0][2] == 'Add to Patient care', f)
    await pg.evaluate("tsSecAdd('Basic Observation')"); await pg.wait_for_timeout(300)
    ph = await pg.evaluate("(document.getElementById('tsSearch')||{}).placeholder||''")
    ok('Writing: the order search says “Add to Observations…” (it said “Add to Basic Observation…”)', ph == 'Add to Observations…', ph)
    await pg.keyboard.press('Escape'); await pg.evaluate("document.activeElement&&document.activeElement.blur()")
    sw = ' | '.join(await pg.evaluate(WORDS + "('#ctab-sheet,#sheetInner,#tsSecNav')"))
    ok('Writing: nothing on the sheet says “Basic observation” or “Patient Care” any more', not re.search(r'Basic [Oo]bservation|Patient Care|Continuous [Ii]nfusions', sw), re.findall(r'.{0,30}(?:Basic [Oo]bservation|Patient Care|Continuous [Ii]nfusions).{0,20}', sw)[:4])
    await pg.evaluate("selectCTab('vitals')"); await until(pg, "!!document.querySelector('#ctab-vitals .v-chart')", 4000)
    vh = ' | '.join(await pg.evaluate(WORDS + "('#ctab-vitals')"))
    ok('Writing: Vitals heads the group “Observations” (it said “Basic observations”)', 'Observations' in vh and 'Basic observation' not in vh, re.findall(r'.{0,20}bservations.{0,10}', vh)[:3])
    # Writing 2. new sheets start in sentence case
    nm = await pg.evaluate("Object.values(tsDefaultOrders(9)).map(o=>o.name)")
    ok('Writing: a new sheet starts with Heart rate, Respiratory rate, Mucous membrane, Pain score — sentence case like every other order (they were Title Case)',
       all(x in nm for x in ('Heart rate', 'Respiratory rate', 'Mucous membrane', 'Pain score')) and not [x for x in nm if re.search(r' [A-Z][a-z]', x)], nm)
    # Writing 5. one perspective
    await pg.evaluate("selectCTab('tasks')"); await pg.wait_for_timeout(700)
    tw = ' | '.join(await pg.evaluate(WORDS + "('#ctab-tasks')"))
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(700)
    dw = ' | '.join(await pg.evaluate(WORDS + "('#ctab-dash,#sbBoards')"))
    ok('Writing: “Your patients” on Tasks and the status board — no “My patients” beside the app’s “your” (HIG: don’t switch perspective)',
       'Your patients' in tw and 'Your patients' in dw and 'My patients' not in tw + dw, [re.findall(r'.{0,12}(?:My|Your) patients.{0,6}', tw + dw)[:4]])
    # Writing 6. the Option-click tip with a pointer
    await pg.evaluate("selectCTab('sheet')"); await pg.wait_for_timeout(600)
    tip = await pg.evaluate(FOLDS)
    ok('Writing: with a mouse, the band’s tooltip still offers Option/Alt-click for all sections', all('-click: all sections' in x[1] for x in tip if x[1]), tip[:2])
    # Writing 3. the estimate says what to enter
    await pg.evaluate("openEstimate()"); await until(pg, "!!document.getElementById('esHigh')", 3000)
    await pg.fill('#esLow', '5000'); await pg.fill('#esHigh', '1000'); await pg.locator('#esHigh').blur(); await pg.wait_for_timeout(300)
    em = await pg.evaluate("document.querySelector('#tsModal').innerText")
    await pg.fill('#esHigh', '6000'); await pg.fill('#esCur', 'about 900'); await pg.wait_for_timeout(200)
    await pg.evaluate("(()=>{document.querySelectorAll('#toastWrap .ctoast').forEach(t=>t.remove());const b=document.querySelector('#tsModal .tm-foot .primary');b&&b.click()})()"); await pg.wait_for_timeout(400)
    et = await pg.evaluate(TOASTS)
    ok('Writing: the estimate says what to enter — “Enter a high end that’s at least the low end”, “Enter current charges as a number, like 1250” (it said “… must be …”)',
       'Enter a high end that’s at least the low end' in em and any('Enter current charges as a number, like 1250' in x for x in et), [em[-200:], et])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok('no page errors (writing checks)', not e, e[:2]); await ctx.close()
    # Writing 3./4./7./8. the messages that only show on a failure, read from the code the page loads
    src = open(os.path.join(SITE, 'treatment', 'store.js'), encoding='utf-8').read() + open(os.path.join(SITE, 'treatment', 'core.js'), encoding='utf-8').read()
    bad = [p for p in ('must be a number', 'toast("Import failed', 'database rule', 'the dose given"', 'Open the patient first', '>+ Save<', 'toast("Couldn’t copy")', 'My patients') if p in src]
    ok('Writing: no rule-style or database wording left — “Couldn’t import …”, “… isn’t turned on yet. Ask an admin.”, one wording for “No weight on file” and “Open a patient first”, “Save snippet”', not bad and 'Save snippet' in src and 'Couldn’t import' in src, bad)
    # Writing 6. touch: no Option-click tip
    ctx, pg, e = await ts(br, PORT, vp=(1180, 820), touch=True, view='sheet')
    tt = await pg.evaluate(FOLDS)
    ok('Writing: on iPad (touch) the band’s tooltip doesn’t mention Option/Alt-click', not any('-click' in x[1] for x in tt), tt[:2]); await ctx.close()

    # ── Charting data 9. the range lines stay in their column ──
    res = {}
    for nm, vp, touch in [('mac', (1440, 900), False), ('ipad', (1180, 820), True), ('ipad-portrait', (820, 1180), True), ('iphone', (390, 844), True)]:
        ctx, pg, e = await ts232(vp=vp, touch=touch, view='vitals')
        await until(pg, "!!document.querySelector('#ctab-vitals .vx-alr')", 5000)
        res[nm] = await pg.evaluate(NOW); await ctx.close()
    clash = {k: [r for r in v if r['field'] is not None and r['right'] > r['field'] - 4] for k, v in res.items()}
    ok('Charting: Vitals’ Range and Alert range lines end before the value field on Mac, iPad and iPhone (iPad ran 33 pt under it, Mac 10 pt)', all(v for v in res.values()) and not any(clash.values()), clash if any(clash.values()) else res)
    ok('Charting: when those lines wrap, a range’s numbers and unit stay on one line (“99–103.5 °F”)', all(r['kept'] for v in res.values() for r in v) and any('Alert range 99–103.5 °F' == t for v in res.values() for r in v for t in r['txt']), res['ipad'][:1])

    # ── Collaboration 10. Copy link refused ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});history.replaceState(null,'',location.pathname)})()")
    await pg.evaluate(SHARE_LINK); await until(pg, "[...document.querySelectorAll('#toastWrap .ctoast')].some(t=>/link/i.test(t.innerText))", 3000)
    lk = [await pg.evaluate(TOASTS), await pg.evaluate("location.hash")]
    ok('Sharing: when the browser refuses Copy link, the link is in the address bar and the message says to copy it from there (it said “Couldn’t copy”)',
       any('address bar' in x for x in lk[0]) and lk[1] == '#sheet=sh_train1', lk)
    await pg.evaluate("(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}});document.querySelectorAll('#toastWrap .ctoast').forEach(t=>t.remove())})()")
    await pg.evaluate(SHARE_LINK); await until(pg, "[...document.querySelectorAll('#toastWrap .ctoast')].some(t=>/Link copied/.test(t.innerText))", 3000)
    ok('Sharing: Copy link still says “Link copied — it opens this sheet for signed-in staff”', any('Link copied' in x for x in await pg.evaluate(TOASTS)), await pg.evaluate(TOASTS))
    ok('no page errors (sharing checks)', not e, e[:2]); await ctx.close()

    # ── Drag and drop 11.–12. ──
    ctx, pg, e = await ts(br, PORT, view='sheet')
    cw = await pg.evaluate("document.querySelector('#sheetInner .hcells .cell').getBoundingClientRect().width")
    marks = await pg.evaluate("[...document.querySelectorAll('#sheetInner .mark[data-t]')].filter(m=>/Scheduled/.test(m.getAttribute('aria-label')||'')).map(m=>m.getAttribute('aria-label'))")
    lab = [m for m in marks if m.startswith('Temperature, ')][0]
    t0 = re.match(r'Temperature, (\d+):00 (AM|PM)', lab)
    await drag(pg, lab, cw * 2)
    want = 'Temperature, ' + (lambda hh: f"{(hh % 12) or 12}:00 {'AM' if hh < 12 else 'PM'}")(((int(t0.group(1)) % 12) + (12 if t0.group(2) == 'PM' else 0)) + 2)
    fc = await until(pg, f"(document.activeElement&&document.activeElement.getAttribute('aria-label')||'').startsWith({json.dumps(want)})", 2500)
    ok('Drag and drop: after a dose is moved, focus is on the moved dose (it fell to the page)', fc, [want, await pg.evaluate("document.activeElement&&(document.activeElement.getAttribute('aria-label')||document.activeElement.className)")])
    marks = await pg.evaluate("[...document.querySelectorAll('#sheetInner .mark[data-t]')].filter(m=>/Scheduled/.test(m.getAttribute('aria-label')||'')).map(m=>m.getAttribute('aria-label'))")
    lab = [m for m in marks if not m.startswith('Temperature, ')][0]
    await drag(pg, lab, -cw * 8, release=False)
    await pg.mouse.up(); await pg.wait_for_timeout(60)
    mid = await pg.evaluate("(()=>{const g=document.querySelector('.mv-ghost');if(!g)return null;const a=g.getAnimations();return {n:a.length,props:a.flatMap(x=>(x.effect.getKeyframes?x.effect.getKeyframes():[]).flatMap(k=>Object.keys(k))).filter(p=>!['offset','easing','composite','computedOffset'].includes(p))}})()")
    gone = await until(pg, "!document.querySelector('.mv-ghost')&&!document.querySelector('.mv-origin')", 1500)
    ts_ = await pg.evaluate(TOASTS)
    ok('Drag and drop: a dose dropped in the past glides back to its hour, then the reason shows (it vanished on the spot)', mid and mid['n'] and 'transform' in mid['props'] and gone and any('Can’t move into the past' in x for x in ts_), [mid, gone, ts_[-2:]])
    await drag(pg, lab, cw * 3, release=False); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(60)
    esc_ = await pg.evaluate("(()=>{const g=document.querySelector('.mv-ghost');return !!(g&&g.getAnimations().length)})()"); await pg.mouse.up()
    ok('Drag and drop: a drag cancelled with Esc glides back too', esc_ and await until(pg, "!document.querySelector('.mv-ghost')", 1500), esc_)
    # the same with Move to… in the drawer (the keyboard way)
    mk = await pg.evaluate("(()=>{const m=[...document.querySelectorAll('#sheetInner .mark[data-t]')].find(m=>/^Temperature, .*Scheduled/.test(m.getAttribute('aria-label')||''));return m?[m.dataset.t,m.getAttribute('aria-label')]:null})()")
    if mk:
        await pg.evaluate(f"openCompletion({json.dumps(mk[0])})"); await until(pg, "!!document.getElementById('cd-mv')", 3000)
        to = await pg.evaluate("(()=>{const s=document.getElementById('cd-mv');const o=[...s.options].find(o=>o.value&&!o.disabled);if(!o)return null;s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return o.textContent})()")
        fm = to and await until(pg, f"(document.activeElement&&document.activeElement.getAttribute('aria-label')||'').startsWith({json.dumps('Temperature, ' + (to or '').split(' — ')[0])})", 2500)
        ok('Drag and drop: after Move to… in the drawer, focus is on the moved dose too', fm, [mk, to, await pg.evaluate("document.activeElement&&(document.activeElement.getAttribute('aria-label')||document.activeElement.className)")])
    else: ok('Drag and drop: after Move to… in the drawer, focus is on the moved dose too', False, 'no scheduled Temperature dose to move')
    ok('no page errors (drag checks)', not e, e[:2]); await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', media={'reduced_motion': 'reduce'})
    marks = await pg.evaluate("[...document.querySelectorAll('#sheetInner .mark[data-t]')].filter(m=>/Scheduled/.test(m.getAttribute('aria-label')||'')).map(m=>m.getAttribute('aria-label'))")
    await drag(pg, marks[1], -cw * 8, release=False); await pg.mouse.up(); await pg.wait_for_timeout(40)
    rm = await pg.evaluate("(()=>{const g=document.querySelector('.mv-ghost');if(!g)return 'gone';return g.getAnimations().flatMap(x=>(x.effect.getKeyframes?x.effect.getKeyframes():[]).flatMap(k=>Object.keys(k))).filter(p=>!['offset','easing','composite','computedOffset'].includes(p))})()")
    ok('Drag and drop: with Reduce Motion the refused dose fades out instead of travelling', rm == 'gone' or (rm and 'transform' not in rm and 'opacity' in rm), rm)
    await ctx.close()
