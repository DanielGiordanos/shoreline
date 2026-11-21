"""Pravix OR — the n416 build's own checks (Nov 20 2026): HIG Action sheets, Alerts, Page controls.
OR's confirmations (Remove this dose?, Send … to …?, Reset demo data?) were plain dialogs with nothing focused, no ⌘., focus
lost on closing, and a centred box with half-width buttons on a phone. They're alerts now: alertdialog with its message,
focus on the alert for a destructive choice and on the action otherwise, an action sheet on a phone, focus back on what
opened it. "Discard what you typed?" says Keep editing and stacks on a phone. ⌘. is Esc."""
import core
from core import ok, section
import or_t390 as T

DOSE = """(()=>{const m=CASES.find(c=>c.id==='or390c2'); m.drugs=m.drugs||[];
  if(!m.drugs.some(d=>d.id==='t416d')) m.drugs.push({id:'t416d',key:'t416',name:'Hydromorphone',dose:0.1,unit:'mg/kg',route:'IV',t:Math.floor(now())-600,note:''}); return 1})()"""
AL = """()=>{const m=document.getElementById('modal'), r=m.getBoundingClientRect(), a=document.activeElement, sub=document.getElementById(m.getAttribute('aria-describedby')||'-');
  const bs=[...document.querySelectorAll('#modalActions > .btn')].map(b=>{const q=b.getBoundingClientRect();return [b.textContent.trim(),Math.round(q.left),Math.round(q.top),Math.round(q.width),Math.round(q.height)]});
  return {open:m.classList.contains('open'), role:m.getAttribute('role'), desc:sub?sub.textContent.trim().slice(0,40):null, focus:a===m?'alert':(a&&a.textContent.trim()), bottom:Math.round(innerHeight-r.bottom), top:Math.round(r.top), w:Math.round(r.width), vw:innerWidth, bs}}"""


async def dose_alert(p):
    await p.evaluate(DOSE); await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(500)
    for tab in ('procedure', 'overview', 'preop', 'recovery', 'record'):
        await p.click(f'#caseTabs [data-tab="{tab}"]'); await p.wait_for_timeout(300)
        if await p.evaluate("!!document.querySelector('[data-undo=\"t416d\"]')"): break
    await p.focus('[data-undo="t416d"]'); await p.click('[data-undo="t416d"]'); await p.wait_for_timeout(500)
    return await p.evaluate(AL)


@section(id='t416', title='n416 · OR · Action sheets, Alerts, Page controls: confirmations are alerts (focus, ⌘., an action sheet on a phone, focus back); Discard says Keep editing',
         apps=['or'], topics=['alerts', 'modality', 'keyboard'], engines=('chromium', 'webkit'))
async def s_t416(br):
    errs = []
    # Mac
    c, p, e = await T.open_or(br)
    mac = await dose_alert(p)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    ent = await p.evaluate("[document.getElementById('modal').classList.contains('open'), !!CASES.find(c=>c.id==='or390c2').drugs.find(d=>d.id==='t416d')]")
    await p.keyboard.press('Meta+Period' if core.ENGINE == 'webkit' else 'Control+Period'); await p.wait_for_timeout(500)
    dot = await p.evaluate("[document.getElementById('modal').classList.contains('open'), document.activeElement&&document.activeElement.getAttribute('data-undo')]")
    ok('Alerts · “Remove this dose?” is an alert (it was a plain dialog): VoiceOver hears it with its message; focus is on the alert itself, so Return removes nothing (nothing had focus); on a Mac Cancel and Remove sit side by side, the same width',
       mac['open'] and mac['role'] == 'alertdialog' and mac['desc'] and mac['focus'] == 'alert' and [b[0] for b in mac['bs']] == ['Cancel', 'Remove']
       and mac['bs'][0][3] == mac['bs'][1][3] and mac['bs'][0][1] < mac['bs'][1][1] and ent == [True, True], (mac, ent))
    ok('…⌘. (Ctrl+. on Windows) cancels it, as Esc does, and focus goes back to the dose’s Remove button (it fell to the page)', dot == [False, 't416d'], dot)
    await p.focus('[data-undo="t416d"]'); await p.evaluate("renderCase()"); await p.wait_for_timeout(200)
    kept = await p.evaluate("document.activeElement&&document.activeElement.getAttribute('data-undo')")
    ok('…and a live redraw of the case page keeps focus on that button (the page redraws about every 6 s; focus fell to the page, as it did in the header before n412)', kept == 't416d', kept)
    # a non-destructive confirmation: the action is the default
    await p.evaluate("openModal({title:'Send Maple to ICU?', sub:'Flow and the treatment sheet show Maple in ICU.', body:'<div class=\"or-impact ok\"><div><b>Maple → ICU</b></div></div>', actions:[{label:'Cancel',ghost:true},{label:'Send',act:()=>{window.__sent=1}}]})")
    await p.wait_for_timeout(400)
    snd = await p.evaluate(AL)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    form = await p.evaluate("(()=>{delayModal(caseById('or390c2')); const m=document.getElementById('modal'); return [m.getAttribute('role'), m.classList.contains('or-alert')]})()")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    title = await p.evaluate("String(sendToFlow).includes('to ${dest}?`')")
    ok('…a confirmation that isn’t destructive (Send) makes its action the default; a sheet with fields stays a dialog; the hand-off’s title is a question (“Send Maple to ICU?”)',
       snd['role'] == 'alertdialog' and snd['focus'] == 'Send' and form == ['dialog', False] and title, (snd['focus'], form, title))
    errs += list(e); await c.close()

    # iPhone: an action sheet
    c, p, e = await T.open_or(br, vp=(390, 844), touch=True)
    ph = await dose_alert(p)
    ok('Action sheets (iOS) · on an iPhone it’s an action sheet from the bottom (it was a centred box with half-width buttons): Remove first, Cancel last, each full width and at least 48 pt',
       ph['role'] == 'alertdialog' and ph['bottom'] <= 50 and ph['top'] > 844 / 2 and [b[0] for b in ph['bs']] == ['Remove', 'Cancel']
       and all(b[3] >= ph['vw'] - 80 and b[4] >= 48 for b in ph['bs']) and ph['bs'][0][2] < ph['bs'][1][2], ph)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    # Discard what you typed?
    await p.evaluate("delayModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    await p.fill('#dlNote', 'abc'); await p.keyboard.press('Escape'); await p.wait_for_timeout(400)
    dq = await p.evaluate("(()=>{const q=document.querySelector('.or-discard'); if(!q) return null; return {focus:document.activeElement.textContent, btns:[...q.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect(); return [b.textContent, Math.round(r.top), Math.round(r.width), Math.round(r.height)]})}})()")
    ok('Alerts · “Discard what you typed?” says Keep editing (it said Cancel), focused; on an iPhone Discard and Keep editing stack full width under the question (Cancel was squeezed beside it)',
       dq and dq['focus'] == 'Keep editing' and [b[0] for b in dq['btns']] == ['Discard', 'Keep editing'] and dq['btns'][0][1] < dq['btns'][1][1] and all(b[2] >= 280 and b[3] >= 48 for b in dq['btns']), dq)
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
