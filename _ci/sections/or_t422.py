"""Pravix OR — the n422 build's own checks (Nov 21 2026): HIG Sliders, Steppers, Text fields.
Add implant's Quantity was the browser's number field ("-3" and "2.5" saved, a scroll wheel could change it); it's a
stepper field with a − + stepper now. Delay's Minutes late steps as Brand §9.2 says and is heard with its unit. The
operative record's Implants, Specimens and Complications ran their lines together in one-line fields. No Clear on iPhone,
autocorrect in clinical fields, a text field for Pain score's five values, "—" and "0.1" as hints, missing values said
in a line at the bottom or a passing message."""
import core
from core import ok, section
from or_t390 import open_or

PRIMARY = "[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"
MSG = "(s=>{const f=document.querySelector(s); const m=f&&f.closest('.or-field').querySelector(':scope > .or-field-msg'); return [m?m.textContent:'', f&&f.getAttribute('aria-invalid')]})"
QTY = """(()=>{const i=document.querySelector('#modal [data-imp="qty"]'), b=[...i.closest('.or-step-field').querySelectorAll('.or-step')];
  return {v:i.value, now:i.getAttribute('aria-valuenow'), dis:b.map(x=>x.getAttribute('aria-disabled')), focus:document.activeElement===i}})()"""


@section(id='t422', title='n422 · OR · Sliders, Steppers, Text fields: Quantity is a stepper field (it was the browser’s number field), Minutes late steps by 10 and is heard in minutes, the record keeps one line per implant, Clear on iPhone, keyboards and hints that fit',
         apps=['or'], topics=['steppers', 'text-fields', 'entering-data', 'keyboard'], engines=('chromium', 'webkit'))
async def s_t422(br):
    errs = []
    c, p, e = await open_or(br)
    await p.evaluate("openCase('or390c2','procedure')"); await p.wait_for_timeout(600)
    await p.evaluate("scanModal(caseById('or390c2'))"); await p.wait_for_timeout(500)
    q = await p.evaluate("""(()=>{const i=document.querySelector('#modal [data-imp="qty"]'), f=i.closest('.or-step-field'), b=f?[...f.querySelectorAll('.or-step')]:[], r=i.getBoundingClientRect(), s=f&&f.querySelector('.or-stepper').getBoundingClientRect();
      return {type:i.type, role:i.getAttribute('role'), im:i.inputMode, min:i.getAttribute('aria-valuemin'), max:i.getAttribute('aria-valuemax'), now:i.getAttribute('aria-valuenow'), lab:i.labels&&i.labels[0]&&i.labels[0].textContent,
        btn:b.map(x=>[x.getAttribute('aria-label'), x.tabIndex, x.getAttribute('aria-disabled'), x.title]), same:s?Math.abs(s.height-r.height)<=2&&Math.abs(s.top-r.top)<=2:false, beside:s?s.left>=r.right:false}})()""")
    ok('Steppers · Add implant’s Quantity is a stepper field (it was the browser’s number field): a numeric text field heard as a spin button 1 to 99, with a − + stepper beside it, out of the Tab order, as tall as the field; − is dimmed at 1 and says why',
       q['type'] == 'text' and q['role'] == 'spinbutton' and q['im'] == 'numeric' and [q['min'], q['max'], q['now']] == ['1', '99', '1'] and q['lab'] == 'Quantity'
       and [x[0] for x in q['btn']] == ['Decrease quantity', 'Increase quantity'] and [x[1] for x in q['btn']] == [-1, -1] and [x[2] for x in q['btn']] == ['true', 'false']
       and 'at least 1' in q['btn'][0][3] and q['same'] and q['beside'], q)
    await p.focus('#modal [data-imp="qty"]')
    seq = []
    for k in ['ArrowUp', 'Shift+ArrowUp', 'End', 'Home', 'PageUp', 'ArrowDown']:
        await p.keyboard.press(k); await p.wait_for_timeout(60); seq.append(await p.evaluate(QTY))
    await p.click('#modal .or-step[data-step="1"]'); await p.wait_for_timeout(80); c1 = await p.evaluate(QTY)
    await p.click('#modal .or-step[data-step="-1"]', modifiers=['Shift']); await p.wait_for_timeout(80); c2 = await p.evaluate(QTY)
    ok('…↑ ↓ step by 1, Shift by 10, Page Up by 10, End and Home go to 99 and 1 (+ dims at 99); clicking + adds one and Shift-click − takes ten, stopping at 1, with focus kept in the field',
       [s['v'] for s in seq] == ['2', '12', '99', '1', '11', '10'] and [s['now'] for s in seq] == ['2', '12', '99', '1', '11', '10'] and seq[2]['dis'] == ['false', 'true']
       and c1['v'] == '11' and c2['v'] == '1' and c2['dis'] == ['true', 'false'] and c1['focus'] and c2['focus'], (seq, c1, c2))
    await p.fill('[data-imp="product"]', 'Training plate')
    await p.fill('#modal [data-imp="qty"]', '2.5'); await p.keyboard.press('Tab'); await p.wait_for_timeout(100); m1 = await p.evaluate(MSG, '#modal [data-imp="qty"]')
    await p.fill('#modal [data-imp="qty"]', '-3'); await p.evaluate(PRIMARY); await p.wait_for_timeout(200)
    m2 = await p.evaluate(MSG, '#modal [data-imp="qty"]'); open2 = await p.evaluate("document.getElementById('modal').classList.contains('open')")
    n0 = await p.evaluate("caseById('or390c2').implants.length")
    await p.fill('#modal [data-imp="qty"]', '3'); await p.wait_for_timeout(50); m3 = await p.evaluate(MSG, '#modal [data-imp="qty"]')
    await p.evaluate(PRIMARY); await p.wait_for_timeout(300)
    im = await p.evaluate("caseById('or390c2').implants.slice(-1)[0]")
    ok('…a quantity that isn’t a whole number from 1 to 99 is said under the field when leaving it and on Save, and isn’t saved (“-3” and “2.5” were); typing clears the message and 3 saves as 3',
       'whole number from 1 to 99' in m1[0] and m1[1] == 'true' and 'whole number from 1 to 99' in m2[0] and open2 and m3 == ['', None]
       and im and im['qty'] == 3 and im['product'] == 'Training plate' and n0 + 1 == await p.evaluate("caseById('or390c2').implants.length"), (m1, m2, open2, m3, im))

    # Delay's Minutes late
    await p.evaluate("delayModal(caseById('or390c6'))"); await p.wait_for_timeout(400)
    await p.fill('#dlMin', '20'); await p.wait_for_timeout(50)
    d = [await p.evaluate("(i=>[i.getAttribute('role'), i.getAttribute('aria-valuemin'), i.getAttribute('aria-valuemax'), i.getAttribute('aria-valuenow'), i.getAttribute('aria-valuetext')])(document.getElementById('dlMin'))")]
    for k in ['Shift+ArrowUp', 'PageDown', 'End', 'Home']:
        await p.keyboard.press(k); await p.wait_for_timeout(60)
        d.append(await p.evaluate("(i=>[i.value, i.getAttribute('aria-valuetext')])(document.getElementById('dlMin'))"))
    ok('Steppers · Delay’s Minutes late is heard with its unit (“20 minutes”; it was “20”) and steps as every Pravix stepper field: Shift by 10 (it was 5), Page Down by 10, End and Home to 480 and 1 (“1 minute”)',
       d[0] == ['spinbutton', '1', '480', '20', '20 minutes'] and d[1:] == [['30', '30 minutes'], ['20', '20 minutes'], ['480', '480 minutes'], ['1', '1 minute']], d)
    await p.evaluate("closeModal()"); await p.wait_for_timeout(300)

    # the record keeps one line per implant
    await p.evaluate("""(()=>{const m=caseById('or390c2'); m.implants=[{id:'a',product:'Locking plate',size:'3.5',lot:'L1',qty:1},{id:'b',product:'Cortical screw',size:'3.5 × 24 mm',lot:'L2',qty:6}];
      m.specimens=[{type:'Tissue',site:'Left flank',test:'Histopathology'},{type:'Fluid',site:'Joint',test:'Cytology'}]; m.record=null; })()""")
    await p.evaluate("openCase('or390c2','record')"); await p.wait_for_timeout(600)
    rf = await p.evaluate("[...document.querySelectorAll('#caseBody [data-rec-field]')].filter(n=>/^(implants|specimens|complications)$/.test(n.dataset.recField)).map(n=>[n.tagName, n.value])")
    await p.click('#caseBody [data-rec-field="specimens"]'); await p.keyboard.press('End'); await p.keyboard.press('Control+End'); await p.keyboard.type(' · labelled')
    await p.wait_for_timeout(300)
    sv = await p.evaluate("(caseById('or390c2').record||{}).specimens||''")
    ok('Text fields · the operative record’s Implants, Specimens and Complications are multi-line (one line per item ran together: “Lot L1Cortical screw”), and an edit keeps the lines',
       [x[0] for x in rf] == ['TEXTAREA'] * 3 and rf[0][1] == 'Locking plate · 3.5 · Lot L1\nCortical screw · 3.5 × 24 mm · Lot L2' and '\n' in sv and sv.startswith('Tissue · Left flank · Histopathology\n'), (rf, sv))
    kb = await p.evaluate("""[...document.querySelectorAll('#caseBody [data-rec-field]')].map(n=>[n.tagName, n.getAttribute('autocorrect'), n.getAttribute('spellcheck')])""")
    # Recovery
    await p.evaluate("openCase('or390c3','recovery')"); await p.wait_for_timeout(600)
    pn = await p.evaluate("""(()=>{const s=document.querySelector('#caseBody [data-rec="pain"]'), t=document.querySelector('#caseBody [data-rec="temp"]');
      return [s.tagName, s.labels&&s.labels[0]&&s.labels[0].textContent, [...s.options].map(o=>o.text), t.inputMode, t.placeholder, t.getAttribute('autocorrect'),
        [...document.querySelectorAll('#caseBody input[data-rec]')].map(n=>n.getAttribute('autocorrect')+'/'+n.getAttribute('spellcheck'))]})()""")
    await p.select_option('#caseBody [data-rec="pain"]', '3'); await p.wait_for_timeout(200)
    ps = await p.evaluate("caseById('or390c3').recovery.pain")
    ok('Text fields · Recovery’s Pain score is a pop-up of its five values, “Choose…” until chosen (it was a text field for a fixed set; Brand §9.2); choosing 3 keeps 3. Temperature takes the decimal pad and its hint says “°F or °C” (it was a reading, “99.5 °F”)',
       pn[0] == 'SELECT' and pn[1] == 'Pain score (CSU)' and pn[2] == ['Choose…', '0', '1', '2', '3', '4'] and ps == '3' and pn[3] == 'decimal' and pn[4] == '°F or °C', (pn[:5], ps))
    ok('…no autocorrect in the record’s and Recovery’s fields (clinical words were open to it); the one-line fields drop spelling marks, the record’s paragraphs keep them',
       all(x[1] == 'off' for x in kb) and all(x[2] == 'false' for x in kb if x[0] == 'INPUT') and all(x[2] != 'false' for x in kb if x[0] == 'TEXTAREA') and all(x == 'off/false' for x in pn[6]), (kb, pn[6]))

    # hints and messages in sheets
    await p.evaluate("scanModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    ih = await p.evaluate("[...document.querySelectorAll('#modal [data-imp]')].filter(n=>n.dataset.imp!=='qty').map(n=>[n.dataset.imp, n.placeholder, n.getAttribute('autocorrect'), n.getAttribute('autocapitalize')])")
    await p.evaluate("closeModal()"); await p.wait_for_timeout(300)
    await p.evaluate("LINK.sheetMeds=()=>[]; drugModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    ph = await p.evaluate("[document.getElementById('dgDose').placeholder, document.getElementById('dgNote').getAttribute('autocorrect')]")
    await p.evaluate(PRIMARY); await p.wait_for_timeout(200); g1 = await p.evaluate(MSG, '#dgName')
    await p.fill('#dgName', 'Training drug'); await p.fill('#dgDose', 'abc'); await p.evaluate(PRIMARY); await p.wait_for_timeout(200)
    g2 = await p.evaluate(MSG, '#dgDose'); w2 = await p.evaluate("[document.getElementById('dgWarn').textContent, document.activeElement.id]")
    await p.evaluate("closeModal()"); await p.wait_for_timeout(300)
    await p.evaluate("specimenModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    await p.evaluate("document.getElementById('toastMsg').textContent=''"); await p.evaluate(PRIMARY); await p.wait_for_timeout(200)
    s1 = await p.evaluate(MSG, '#spSite'); s2 = await p.evaluate("[document.getElementById('modal').classList.contains('open'), document.getElementById('toastMsg').textContent, document.activeElement.id, document.getElementById('spSite').getAttribute('autocorrect')]")
    await p.evaluate("closeModal()")
    ok('Text fields · hints say what goes in: the implant’s (they were “—”) and Dose’s, which was “0.1” and read as a suggested dose; lot and serial numbers type in capitals, with no autocorrect in the sheets’ clinical fields',
       [x[1] for x in ih] == ['As on the label', 'As on the label', 'e.g. 3.5 × 24 mm', 'As on the label', 'As on the label', 'YYYY-MM'] and all(x[2] == 'off' for x in ih)
       and [x[3] for x in ih if x[0] in ('lot', 'serial')] == ['characters', 'characters'] and not any(ch.isdigit() for ch in ph[0]) and ph[1] == 'off' and s2[3] == 'off', (ih, ph, s2))
    ok('…a missing or wrong value is said under its field, with focus on it: Drug and Dose (it was one line at the bottom), “abc” as a dose, and Add specimen’s Anatomic site (it was a passing message)',
       g1 == ['Enter the drug.', 'true'] and g2 == ['Enter the dose as a number.', 'true'] and w2 == ['', 'dgDose'] and s1 == ['Enter the anatomic site.', 'true'] and s2[:3] == [True, '', 'spSite'], (g1, g2, w2, s1, s2))
    nomac = await p.evaluate("(async()=>{drugModal(caseById('or390c2')); await new Promise(r=>setTimeout(r,300)); const i=document.getElementById('dgNote'); i.focus(); i.value='x'; i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,50)); const b=document.querySelector('.or-clr:not([hidden])'); closeModal(); return !!b})()")
    errs += list(e); await c.close()

    # iPhone: Clear, and the stepper at 44 pt
    c, p, e = await open_or(br, vp=(390, 844), touch=True)
    await p.evaluate("LINK.sheetMeds=()=>[]; drugModal(caseById('or390c2'))"); await p.wait_for_timeout(600)
    await p.tap('#dgNote'); await p.keyboard.type('Given slowly'); await p.wait_for_timeout(150)
    cl = await p.evaluate("""(()=>{const b=document.querySelector('.or-clr:not([hidden])'), i=document.getElementById('dgNote'); if(!b) return null; const r=b.getBoundingClientRect(), q=i.getBoundingClientRect();
      return {name:b.getAttribute('aria-label'), w:Math.round(r.width), h:Math.round(r.height), end:Math.abs(r.right-q.right)<=2, mid:Math.abs((r.top+r.bottom)/2-(q.top+q.bottom)/2)<=2, tab:b.tabIndex}})()""")
    await p.tap('.or-clr'); await p.wait_for_timeout(150)
    af = await p.evaluate("[document.getElementById('dgNote').value, document.activeElement&&document.activeElement.id, !!document.querySelector('.or-clr:not([hidden])')]")
    await p.evaluate("closeModal()"); await p.wait_for_timeout(400)
    await p.evaluate("scanModal(caseById('or390c2'))"); await p.wait_for_timeout(600)
    await p.tap('#modal [data-imp="qty"]'); await p.wait_for_timeout(150)
    st = await p.evaluate("""(()=>{const b=[...document.querySelectorAll('#modal .or-step')].map(x=>x.getBoundingClientRect()); return {h:b.map(r=>Math.round(r.height)), w:b.map(r=>Math.round(r.width)), in:b.every(r=>r.left>=0&&r.right<=innerWidth), clr:!!document.querySelector('.or-clr:not([hidden])')}})()""")
    await p.tap('#modal .or-step[data-step="1"]'); await p.wait_for_timeout(150)
    tq = await p.evaluate("[document.querySelector('#modal [data-imp=\"qty\"]').value, document.activeElement===document.querySelector('#modal [data-imp=\"qty\"]')]")
    ok('Text fields · on an iPhone a sheet’s text field shows Clear (✕) at its trailing end while it has text and is being typed in (OR had none): 44 pt, out of the Tab order; tapping it empties the field and the keyboard stays. Not on a Mac',
       cl and cl['name'] == 'Clear text' and cl['w'] >= 44 and cl['h'] >= 44 and cl['end'] and cl['mid'] and cl['tab'] == -1 and af == ['', 'dgNote', False] and not nomac, (cl, af, nomac))
    ok('…and Quantity’s − + are 44 pt on touch, inside the screen, with no Clear on the stepper field; tapping + adds one and keeps the field focused',
       st['h'] == [44, 44] and min(st['w']) >= 44 and st['in'] and not st['clr'] and tq == ['2', True], (st, tq))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
