"""Treatment Sheets — the n277 build's own checks, from the Oct 30 stress test (trt/stress.py). They run in Chromium and
WebKit."""
import json, copy
from tsh import *
from core import ok, section, until, PORT

def seed_long():
    d = json.loads(SEED); t = copy.deepcopy(d['sheets/sh_train1'])
    t['patient'].update({'name': 'Sir Reginald Fluffington-Barkworth', 'last': 'Van Der Woodsen-Montgomery', 'allergies': 'Penicillins (urticaria), carprofen (GI bleed), adhesive tape'})
    d['sheets/sh_long'] = t
    return json.dumps(d)

HDR = "[...document.querySelectorAll('section.clinical-patient-header.tsh')].map(e=>[e.getClientRects().length?'visible':'hidden',e.id,(e.querySelector('.tsh-info')||{innerText:''}).innerText.replace(/\\s+/g,' ')])"
REMOTE = "firebase.firestore().collection('sheets').doc('sh_train1').update({'patient.weight':29.4,'patient.tech':'Sam Lee','patient.location':'Isolation'})"


@section(id='t277', title='n277 · Treatment Sheets after a stress test: the header on every section, long names and allergies on a phone, the add box, the hidden Add button, odd doses',
         apps=['treatment'], topics=['layout', 'loading', 'accessibility', 'entering-data'], engines=('chromium', 'webkit'))
async def s_t277(br):
    # 1. the header on the Anesthesia section follows the patient
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("selectCTab('anes')"); await pg.wait_for_timeout(700)
    await pg.evaluate(REMOTE); await pg.wait_for_timeout(1500)
    h = await pg.evaluate(HDR)
    vis = [x for x in h if x[0] == 'visible']
    ok('On the Anesthesia section, a weight, technician or location changed by someone else reaches the header on screen within 2 s (only the hidden copy left by the sheet was refreshed)',
       len(vis) == 1 and '29.4' in vis[0][2] and 'Sam Lee' in vis[0][2] and 'Isolation' in vis[0][2], h)
    for t in ('sheet', 'charges', 'anes', 'sheet'): await pg.evaluate("selectCTab('%s')" % t); await pg.wait_for_timeout(400)
    ids = await pg.evaluate("[document.querySelectorAll('#tsHdr').length, [...document.querySelectorAll('[id]')].map(x=>x.id).filter((v,i,a)=>a.indexOf(v)!==i&&!/^pvx-n2\\d\\d-ts$/.test(v))]")
    ok('After Sheet → Charges → Anesthesia → Sheet the page has one element with id tsHdr, on the section you can see (there were two or three), and no other duplicated ids',
       ids[0] == 1 and not ids[1] and (await pg.evaluate("!!(document.getElementById('tsHdr')&&document.getElementById('tsHdr').getClientRects().length)")), ids)
    await ctx.close()

    # 2. iPhone: a long name and a long allergy line
    ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, sheet='sh_long', view='sheet', seed=seed_long())
    g = await pg.evaluate("""(()=>{const R=s=>{const x=document.querySelector(s);const r=x.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]};
      const h=R('#tsHdr'),al=R('.ts-al'),nm=R('.tsh-name > span'),mini=R('.tsh-mini');const ov=!(mini[1]>=nm[3]-1||mini[0]>=nm[2]-1||mini[2]<=nm[0]+1);
      return {hdr:h,al:al,alEllipsis:getComputedStyle(document.querySelector('.ts-al span')).textOverflow,name:nm,mini:mini,overlap:ov,sw:document.getElementById('tsHdr').scrollWidth,cw:document.getElementById('tsHdr').clientWidth}})()""")
    ok('iPhone: the allergy chip stays inside the header and ends with an ellipsis (it ran 120 pt past the right edge of the screen)', g['al'][2] <= g['hdr'][2] + 1 and g['alEllipsis'] == 'ellipsis' and g['sw'] <= g['cw'] + 1, g)
    ok('iPhone: a long name gets at least 200 pt of width and the weight · code · location row never overlaps it (the name was squeezed into a 76-pt column beside that row)', g['name'][2] - g['name'][0] >= 200 and not g['overlap'], g)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, vp=(390, 844), touch=True, view='sheet')
    g2 = await pg.evaluate("(()=>{const r=document.querySelector('.tsh-name > span').getBoundingClientRect();const b=document.querySelector('.tsh-back').getBoundingClientRect();return [Math.round(r.height),Math.round(b.right),Math.round(r.left)]})()")
    ok('iPhone: a short name sits on one line beside the back chevron', g2[0] < 30 and g2[2] >= g2[1], g2)
    await ctx.close()

    # 3. the add box highlights the row Return will open
    ctx, pg, e = await ts(br, PORT, view='sheet')
    async def typed(q):
        await pg.evaluate("document.getElementById('tsSearch').value='';0"); await pg.click('#tsSearch'); await pg.keyboard.type(q); await pg.wait_for_timeout(450)
        return await pg.evaluate("(()=>{const h=document.querySelector('#tsDrop .ts-item.hi');return h?h.textContent.trim().replace(/\\s+/g,' ').slice(0,40):null})()")
    hi = {q: await typed(q) for q in ('lrs', 'plasma-lyte', 'maropitant', 'fentanyl cri', 'walk')}
    ok('Typing LRS or Plasma-Lyte highlights IV fluids (it highlighted “Add ‘lrs’ as an order”, so Return opened a custom observation); “fentanyl cri” highlights the CRI; a drug or a care task still highlights itself',
       hi['lrs'] and hi['lrs'].startswith('IV fluids') and hi['plasma-lyte'] and hi['plasma-lyte'].startswith('IV fluids') and hi['maropitant'] and hi['maropitant'].startswith('Maropitant')
       and hi['fentanyl cri'] and 'CRI' in hi['fentanyl cri'] and hi['walk'] and hi['walk'].startswith('Walk'), hi)
    await typed('lrs'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(700)
    t = await pg.evaluate("(document.querySelector('#tsModal.show h3')||{}).textContent")
    ok('…and Return on “lrs” opens the IV fluids panel', t == 'IV fluids', t)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    await pg.evaluate("(()=>{const d=document.querySelector('.pvx-discard [data-discard]');d&&d.click()})()"); await pg.wait_for_timeout(300)

    await ctx.close()

    # 4. the problem list's Add button is out of the tab order while hidden
    ctx, pg, e = await ts(br, PORT, view='sheet')
    pl = await pg.evaluate("(()=>{const i=document.querySelector('.pl-add input');i.focus();return !!i})()")
    await pg.keyboard.press('Tab'); f1 = await pg.evaluate("(()=>{const a=document.activeElement;return [a.className,getComputedStyle(a).visibility]})()")
    await pg.wait_for_timeout(300); await pg.fill('.pl-add input', 'Vomiting'); await pg.wait_for_timeout(250)
    v = await pg.evaluate("(()=>{const b=document.querySelector('.pl-go');const c=getComputedStyle(b);return [c.visibility,c.opacity,b.getClientRects().length>0]})()")
    ok('Tab from the empty problem box skips the invisible Add button (it stopped on it); once something is typed the button shows and is reachable',
       pl and f1[0] != 'pl-go' and v[0] == 'visible' and v[1] == '1', [f1, v])
    await pg.fill('.pl-add input', ''); await pg.wait_for_timeout(200)

    # 5. a dose of 1e400 is refused like an empty one
    await typed('maropitant'); await pg.keyboard.press('Enter'); await until(pg, "!!document.querySelector('#tsModal.show #rxDose')", 4000)
    await pg.evaluate("(()=>{const i=document.getElementById('rxDose');i.value='1e400';i.dispatchEvent(new Event('input',{bubbles:true}));const r=document.getElementById('rxRoute');if(r&&!r.value){r.value='IV';r.dispatchEvent(new Event('change',{bubbles:true}))}const f=document.getElementById('rxFreq');if(f&&!f.value){f.value='q24h';f.dispatchEvent(new Event('change',{bubbles:true}))}})()")
    await pg.wait_for_timeout(300)
    inf0 = await pg.evaluate("/Infinity/.test(document.getElementById('tsModal').innerText)")
    await pg.evaluate("[...document.querySelectorAll('#tsModal button')].find(b=>/Add to sheet/.test(b.textContent)).click()"); await pg.wait_for_timeout(500)
    r = await pg.evaluate("[document.getElementById('tsModal').classList.contains('show'), /Enter the dose/.test(document.getElementById('tsModal').innerText), Object.values(window.__fs['sheets/sh_train1'].orders).filter(o=>o.type==='med').map(o=>o.dose)]")
    ok('A dose of 1e400 shows no “Infinity mg” total, is refused (“Enter the dose”) and nothing with an infinite dose reaches the sheet', not inf0 and r[0] and r[1] and all(d is not None and d < 1e9 for d in r[2]), [inf0, r])
    ok('no page errors', not e, e[:2])
    await ctx.close()
