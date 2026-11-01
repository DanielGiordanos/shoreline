"""Treatment Sheets — the n287 build's own checks: HIG Alerts, Page controls and Panels.
Written with that build; they run in Chromium and WebKit."""
import json
from tsh import *
from core import ok, section, until, PORT

INFO = """(()=>{const m=document.getElementById('tsModal');if(!m||!m.classList.contains('show'))return 'closed';const c=m.querySelector('.tm-card');const a=document.activeElement;
 const d=c.getAttribute('aria-describedby'),l=c.getAttribute('aria-labelledby');const k=c.querySelector('[data-ok]');
 return {role:c.getAttribute('role'),label:l&&document.getElementById(l)?document.getElementById(l).textContent:null,desc:d&&document.getElementById(d)?document.getElementById(d).textContent.trim().length:0,
  ok:k?k.textContent:null,red:!!(k&&k.classList.contains('danger')),prim:!!(k&&k.classList.contains('primary')),focus:a===c?'CARD':(a?a.textContent.trim().slice(0,24):null)}})()"""


@section(id='t287', title='n287 · Treatment Sheets against HIG Alerts, Page controls and Panels',
         apps=['treatment'], topics=['modality', 'entering-data'], engines=('chromium', 'webkit'))
async def s_t287(br):
    # 1. a destructive confirmation: an alert, described, with no default; ⌘. cancels
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("tsDowntimeSetup()"); await until(pg, "!!document.querySelector('#tsDowntime [data-dt=off]')", 5000)
    await pg.evaluate("document.querySelector('#tsDowntime [data-dt=off]').click()"); await pg.wait_for_timeout(700)
    a = await pg.evaluate(INFO)
    ok('“Stop the downtime copy on this computer?” is an alert to VoiceOver — role alertdialog, named by its title and described by its message (a plain dialog, no description)',
       isinstance(a, dict) and a['role'] == 'alertdialog' and (a['label'] or '').startswith('Stop the downtime copy') and a['desc'] > 10, a)
    ok('…it replaces nothing by default: focus is on the alert, not on “Stop keeping a copy”, which no longer looks like a default and isn’t red (the person chose it)',
       isinstance(a, dict) and a['focus'] == 'CARD' and not a['prim'] and not a['red'], a)
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(500)
    b = await pg.evaluate(INFO)
    await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(500)
    c = await pg.evaluate(INFO)
    ok('…so Return does nothing, and ⌘. cancels it as Esc does (Return confirmed it; ⌘. did nothing)', isinstance(b, dict) and c == 'closed', [b, c])
    ok('no page errors (downtime)', not e, e[:2])
    await ctx.close()

    # 2. a non-destructive question keeps its default; Ctrl+. cancels
    ctx, pg, e = await ts(br, PORT, view='sheet', sheet='sh_train3')
    await pg.evaluate("tsAdmitAsk()"); await pg.wait_for_timeout(700)
    a = await pg.evaluate(INFO)
    await pg.keyboard.press('Control+Period'); await pg.wait_for_timeout(500)
    c = await pg.evaluate(INFO)
    ok('“Admit …?” is an alert too, but keeps Admit as its default; Ctrl+. cancels it',
       isinstance(a, dict) and a['role'] == 'alertdialog' and a['desc'] > 0 and a['focus'] == 'Admit' and a['prim'] and c == 'closed', [a, c])
    await ctx.close()

    # 3. ⌘. closes the order panel, a drawer and Keyboard shortcuts; on “Discard …?” it keeps editing
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("(()=>{const r=[...document.querySelectorAll('#sheetInner .rl')].find(x=>/Methadone/.test(x.innerText));(r.querySelector('.rl-name')||r).click()})()"); await pg.wait_for_timeout(800)
    o1 = await pg.evaluate("document.getElementById('tsOrderSheet').classList.contains('show')")
    await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(600)
    o2 = await pg.evaluate("document.getElementById('tsOrderSheet').classList.contains('show')")
    await pg.evaluate("openDrawer('noteDrawer')"); await pg.wait_for_timeout(400)
    d1 = await pg.evaluate("document.getElementById('noteDrawer').classList.contains('open')")
    await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(500)
    d2 = await pg.evaluate("document.getElementById('noteDrawer').classList.contains('open')")
    await pg.keyboard.press('Shift+?'); await pg.wait_for_timeout(400)
    k1 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
    await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(500)
    k2 = await pg.evaluate("!!document.querySelector('.pvx-ks')")
    ok('⌘. closes the order panel, the Add note drawer and Keyboard shortcuts, as Esc does (only Esc did)',
       o1 and not o2 and d1 and not d2 and k1 and not k2, [o1, o2, d1, d2, k1, k2])
    await pg.click('#tsSearch'); await pg.keyboard.type('maropitant'); await pg.wait_for_timeout(500); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(900)
    await pg.evaluate("(()=>{const i=document.getElementById('rxDose');i.value='1';i.dispatchEvent(new Event('input',{bubbles:true}))})()"); await pg.wait_for_timeout(300)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
    p1 = await pg.evaluate("!!document.querySelector('.pvx-discard')")
    await pg.keyboard.press('Meta+Period'); await pg.wait_for_timeout(500)
    p2 = await pg.evaluate("[!!document.querySelector('.pvx-discard'),!!document.querySelector('#tsModal.show #rxDose'),(document.getElementById('rxDose')||{}).value]")
    ok('…and on “Discard this order?” ⌘. means Keep editing: the prompt goes, the order stays with what was typed',
       p1 and p2 == [False, True, '1'], [p1, p2])
    ok('no page errors (⌘.)', not e, e[:2])
    await ctx.close()

    # 4. the inpatients display: more than 10 pages read as words (more inpatients: copies of the first training patient)
    def many(n):
        seed = json.loads(SEED); base = seed['sheets/sh_train1']
        for i in range(n):
            d = json.loads(json.dumps(base)); d['visit_id'] = 'v_many%02d' % i; d['patient']['name'] = 'Copy %02d' % i
            seed['sheets/sh_many%02d' % i] = d
        return json.dumps(seed)
    PG = "(()=>{const p=document.querySelector('#tsTv .tv-pager');const t=p.querySelector('.tv-pg-txt');return [p.querySelectorAll('i').length,t?t.textContent:null,p.getAttribute('aria-label')]})()"
    out = []
    for n in (10, 66):
        ctx, pg, e = await ts(br, PORT, view='sheet', seed=many(n))
        await pg.evaluate("tsTvOpen('All')"); await until(pg, "!!document.querySelector('#tsTv .tv-card')", 5000); await pg.wait_for_timeout(600)
        out.append(await pg.evaluate(PG)); await ctx.close()
    few, many = out
    ok('Inpatients display: past 10 pages the pager reads “Page 1 of 12” instead of a row of dots (one dot a page); fewer pages keep the dots',
       few[0] == 2 and not few[1] and few[2] == 'Page 1 of 2' and many[0] == 0 and many[1] and many[1].startswith('Page 1 of ') and int(many[1].split()[-1]) > 10 and many[2] == many[1], [few, many])
    ok('no page errors (display)', not e, e[:2])
