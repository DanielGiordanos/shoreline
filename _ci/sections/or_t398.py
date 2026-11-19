"""Pravix OR — the n398 build's own checks (Nov 16 2026): HIG Drag and drop, Entering data, Feedback.
Drag and drop: a case dragged on the Schedule shows where it will land (time, room, who it pushes back); only an OR case
lights up a room (a file or text did too); the moved case keeps focus; the message says who it pushed back; a drop that
changes nothing says so. Entering data: the delay's minutes are a whole number from 1 to 480, said under the field, with
Save dimmed until right (-5 saved a negative delay); Recovery's temperature and pain score are checked when leaving the field
("1005" went to Flow as 1005.0 °F); Add case and an implant say what's missing under the field, with Add case dimmed until it's
in; a clipped field shows its whole value on hover. Feedback: the implant message never ends in "Lot " with nothing after it;
the dose's question is answered with Cancel."""
import os
import core
from core import ok, section, BUILD
from or_t390 import open_or

DRAG = r"""async ([id, room, minutes, drop])=>{
  const b=[...document.querySelectorAll('.or-block')].find(x=>x.dataset.id===id); const t=document.querySelector(`.or-lane-track[data-room="${room}"]`);
  const dt=new DataTransfer(); b.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));
  const sc=t.closest('.or-sched-scroll'); const r0=t.getBoundingClientRect();
  const x=r0.left+(minutes-SCHED_START)/SCHED_SPAN*r0.width; if(sc){ sc.scrollLeft+= (x - (sc.getBoundingClientRect().left+sc.clientWidth/2)); }
  const r=t.getBoundingClientRect(); const cx=r.left+(minutes-SCHED_START)/SCHED_SPAN*r.width+2, cy=r.top+20;
  const ov=new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:cx,clientY:cy}); t.dispatchEvent(ov);
  const g=t.querySelector('.or-drop-ghost'); const res={prevented:ov.defaultPrevented, over:t.classList.contains('is-over'), ghost:g?g.textContent:null};
  if(drop){ t.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:cx,clientY:cy})); b.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt})); await new Promise(r=>setTimeout(r,250));
    res.after=document.querySelectorAll('.or-drop-ghost').length; res.focus=document.activeElement&&document.activeElement.dataset?(document.activeElement.dataset.id||document.activeElement.tagName+'#'+document.activeElement.id+'.'+document.activeElement.className):null; res.toast=document.getElementById('toastMsg').textContent; }
  return res; }"""


@section(id='t398', title='n398 · OR · Drag and drop, Entering data, Feedback: where a dragged case lands and who it pushes back, focus kept, checked minutes, temperature and pain score, problems under their fields, a whole value on hover, no empty “Lot”',
         apps=['or'], topics=['dragdrop', 'forms', 'feedback'], engines=('chromium', 'webkit'))
async def s_t398(br):
    c, p, e = await open_or(br)
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(800)
    r = await p.evaluate(DRAG, ['or390c5', 'or2', 840, False])
    ok('Drag and drop · dragging a case over a room shows where it lands and who it pushes back (“2:00 PM · OR 2 · Pushes back Willow +…”); nothing showed but a tint',
       r['prevented'] and r['over'] and r['ghost'] and '2:00 PM' in r['ghost'] and 'OR 2' in r['ghost'] and 'Willow' in r['ghost'], r)
    await p.evaluate("typeof orDragEnd==='function'&&orDragEnd()")
    foreign = await p.evaluate("""(()=>{const t=document.querySelector('.or-lane-track[data-room="or2"]');const dt=new DataTransfer();dt.setData('text/plain','hello');
      const ov=new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:t.getBoundingClientRect().left+300,clientY:t.getBoundingClientRect().top+20});t.dispatchEvent(ov);
      return [ov.dataTransfer.dropEffect, t.classList.contains('is-over'), !!t.querySelector('.or-drop-ghost')]})()""")
    ok('…a file or text dragged over a room doesn’t light it up or offer to drop (any drag did)', foreign == ['none', False, False], foreign)
    r = await p.evaluate(DRAG, ['or390c5', 'or2', 840, True])
    ok('…after the drop the moved case keeps focus, the drop marker goes, and the message says who it pushed back (“… · pushes back Willow +… min”, with Undo)',
       r['after'] == 0 and r['focus'] == 'or390c5' and 'moved to OR 2' in r['toast'] and 'pushes back Willow' in r['toast'], r)
    r = await p.evaluate(DRAG, ['or390c5', 'or2', 840, True])
    ok('…and a drop that changes nothing says so (it was silent)', 'Nothing moved' in r['toast'], r['toast'])
    await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(300)

    await p.evaluate("delayModal(caseById('or390c6'))"); await p.wait_for_timeout(400)
    st = await p.evaluate("[document.getElementById('dlMin').type, document.getElementById('dlMin').inputMode]")
    await p.fill('#dlMin', '-5'); await p.wait_for_timeout(100)
    dim = await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().getAttribute('aria-disabled')")
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(200)
    bad = await p.evaluate("[document.getElementById('modal').classList.contains('open'), (document.querySelector('#dlMin').closest('.or-field').querySelector('.or-field-msg')||{}).textContent, document.getElementById('dlMin').getAttribute('aria-invalid'), JSON.stringify(caseById('or390c6').delay||null)]")
    ok('Entering data · the delay’s minutes are whole minutes from 1 to 480, said under the field with Save dimmed (“-5” saved a negative delay; it was the browser’s number field)',
       st == ['text', 'numeric'] and dim == 'true' and bad[0] and 'whole minutes' in (bad[1] or '') and bad[2] == 'true' and bad[3] == 'null', (st, dim, bad))
    await p.fill('#dlMin', '20'); await p.press('#dlMin', 'ArrowUp'); await p.wait_for_timeout(100)
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(300)
    d = await p.evaluate("caseById('or390c6').delay")
    ok('…↑ steps it, and a right value saves (21 min)', d and d['min'] == 21, d)

    await p.evaluate("openCase('or390c3')"); await p.wait_for_timeout(700)
    await p.click('#caseTabs [data-tab="recovery"]'); await p.wait_for_timeout(400)
    async def rec(k, v):
        await p.fill(f'[data-rec="{k}"]', v); await p.press(f'[data-rec="{k}"]', 'Tab'); await p.wait_for_timeout(200)
        return await p.evaluate(f"""[(document.querySelector('[data-rec="{k}"]').closest('.or-field').querySelector('.or-field-msg')||{{}}).textContent||'', caseById('or390c3').recovery['{k}']||null]""")
    t1 = await rec('temp', '1005'); t2 = await rec('temp', '101.2'); p1 = await rec('pain', '7'); p2 = await rec('pain', '2')
    ok('Entering data · Recovery’s temperature and pain score are checked when leaving the field: “1005” and a pain score of 7 are said under the field and not kept; 101.2 and 2 are kept',
       'temperature from 80 to 110' in t1[0] and t1[1] != '1005' and t2 == ['', '101.2'] and 'pain score from 0 to 4' in p1[0] and p1[1] != '7' and p2 == ['', '2'], (t1, t2, p1, p2))

    await p.click('#caseTabs [data-tab="procedure"]'); await p.wait_for_timeout(300)
    await p.click('[data-act="scan"]'); await p.wait_for_timeout(400)
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(200)
    im = await p.evaluate("[(document.querySelector('[data-imp=\"product\"]').closest('.or-field').querySelector('.or-field-msg')||{}).textContent, document.getElementById('toastMsg').textContent]")
    await p.fill('[data-imp="product"]', 'TPLO plate 3.5 mm, 6-hole'); await p.wait_for_timeout(50)
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(300)
    note = await p.evaluate("[...document.querySelectorAll('#notes .note')].map(n=>n.textContent).filter(t=>t.includes('implant')).pop()||''")
    ok('Entering data / Feedback · an implant without its product says so under the field (it was a message at the top), and one saved without a lot says “no lot entered”, never “Lot ” with nothing after it',
       'Enter the product' in (im[0] or '') and 'no lot entered' in note and not note.rstrip().endswith('Lot'), (im, note))
    await p.click('#caseBack'); await p.wait_for_timeout(300)

    await p.click('#addCaseBtn'); await p.wait_for_timeout(500)
    await p.select_option('#acProc', 'TPLO'); await p.wait_for_timeout(150)
    a1 = await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().getAttribute('aria-disabled')")
    await p.evaluate("[...document.querySelectorAll('#modalActions .btn.primary')].pop().click()"); await p.wait_for_timeout(200)
    a2 = await p.evaluate("[document.getElementById('modal').classList.contains('open'), (document.getElementById('acLat').closest('.or-field').querySelector('.or-field-msg')||{}).textContent, document.activeElement.id]")
    await p.select_option('#acLat', 'Left'); await p.wait_for_timeout(150)
    a3 = await p.evaluate("[[...document.querySelectorAll('#modalActions .btn.primary')].pop().getAttribute('aria-disabled'), (document.getElementById('acLat').closest('.or-field').querySelector('.or-field-msg')||{}).textContent||'']")
    ok('Entering data · Add case is dimmed until the side is chosen, says “Choose the side” under the field with focus on it (it was an error at the top), and lights up once chosen',
       a1 == 'true' and a2[0] and 'Choose the side' in (a2[1] or '') and a2[2] == 'acLat' and a3 == ['false', ''], (a1, a2, a3))
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("document.getElementById('orDiscardYes')&&document.getElementById('orDiscardYes').click()"); await p.wait_for_timeout(200)   # n401: a sheet with choices made asks before Esc discards them

    await p.evaluate("openCase('or390c1')"); await p.wait_for_timeout(700)
    await p.click('#caseTabs [data-tab="record"]'); await p.wait_for_timeout(300)
    long = 'Left TPLO, 3.5 mm 6-hole plate, tibial plateau angle corrected from 28 to 5 degrees, meniscus intact, stifle stable'
    sel = await p.evaluate("(()=>{const f=[...document.querySelectorAll('#caseBody input[data-rec-field]')].find(x=>!x.disabled);return f?'#'+(f.id||(f.id='t398f')):null})()")
    tip = None
    if sel:
        await p.fill(sel, long); await p.hover(sel); await p.wait_for_timeout(100)
        tip = await p.evaluate(f"document.querySelector('{sel}').title")
    ok('Entering data · a field too narrow for what’s in it shows the whole value on hover', tip == long, (sel, tip))
    html = open(os.path.join(BUILD, 'or', 'index.html'), encoding='utf-8').read()
    ok('Feedback · the question before removing a dose is answered with Cancel (it was “Keep”)', "label:'Keep',ghost:true},{label:'Remove'" not in html and "{label:'Cancel',ghost:true},{label:'Remove', act:" in html, '')
    ok('…no page errors', not e, e[:3])
    await c.close()
