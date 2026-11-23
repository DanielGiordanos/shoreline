"""Pravix OR — the n420 build's own checks (Nov 21 2026): HIG Color wells, Combo boxes, Digit entry views.
Drug given's Drug field was the browser's own suggestion list (a datalist): no heading for the likely choices, nothing at
the end of the field on a Mac, long names cut off, a different look in each browser. It's the Pravix combo box now
(Brand §9.10e): the drugs on the patient's sheet first, then those given in this case; typing narrows it, a typed name is
kept and never added; names wrap; a chevron on a Mac; ↓, Return and Esc (which closes the list, not the sheet).
Add implant's Manufacturer offers the manufacturers OR has recorded. Neither field autocorrects."""
import core
from core import ok, section
from or_t390 import open_or

SEED = """(()=>{LINK.sheetMeds=()=>['Hydromorphone','Cefazolin','Dexmedetomidine','Lactated Ringer’s solution with potassium chloride 20 mEq/L'];
  const m=caseById('or390c2'); m.drugs=m.drugs||[]; if(!m.drugs.some(d=>d.id==='t420g')) m.drugs.push({id:'t420g',name:'Ketamine',dose:1,unit:'mg/kg',route:'IV',t:now()-600,note:''});
  m.implants=m.implants||[]; if(!m.implants.some(i=>i.id==='t420i')) m.implants.push({id:'t420i',manufacturer:'Training implant maker',product:'Plate',size:'3.5',qty:1,t:now()}); return 1})()"""
LIST = """(()=>{const i=document.activeElement&&document.activeElement.getAttribute('role')==='combobox'?document.activeElement:document.getElementById('dgName'); const pn=document.getElementById(i.getAttribute('aria-controls')||'-');
  const open=!!pn&&!pn.hidden; const r=open?pn.getBoundingClientRect():null, q=i.getBoundingClientRect(), lg=open?[...pn.querySelectorAll('.or-cbx-o')].pop():null;
  return {open, expanded:i.getAttribute('aria-expanded'), heads:open?[...pn.querySelectorAll('.or-cbx-h')].map(h=>h.textContent):[], opts:open?[...pn.querySelectorAll('[role=option]')].map(o=>o.textContent):[],
    w:open?[Math.round(r.width),Math.round(q.width),Math.round(r.left),Math.round(q.left)]:null, wrap:lg?getComputedStyle(lg).whiteSpace:null, focus:document.activeElement&&document.activeElement.id,
    ad:i.getAttribute('aria-activedescendant'), adText:(document.getElementById(i.getAttribute('aria-activedescendant')||'-')||{}).textContent||null, adSel:(document.getElementById(i.getAttribute('aria-activedescendant')||'-')||{getAttribute(){return null}}).getAttribute('aria-selected'), value:i.value, modal:document.getElementById('modal').classList.contains('open')}})()"""


@section(id='t420', title='n420 · OR · Color wells, Combo boxes, Digit entry views: Drug given’s Drug and Add implant’s Manufacturer are Pravix combo boxes (likely choices first, a chevron on a Mac, ↓ Return Esc), with no autocorrect',
         apps=['or'], topics=['entering-data', 'combo-boxes', 'keyboard'], engines=('chromium', 'webkit'))
async def s_t420(br):
    errs = []
    # ── Mac ──
    c, p, e = await open_or(br)
    await p.evaluate(SEED)
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(500)
    await p.evaluate("drugModal(caseById('or390c2'))"); await p.wait_for_timeout(500)
    f = await p.evaluate("""(()=>{const i=document.getElementById('dgName'), b=document.querySelector('#modal .or-cbx-btn');
      return {role:i.getAttribute('role'), list:i.getAttribute('list'), datalist:!!document.querySelector('#modal datalist'), ac:[i.getAttribute('autocorrect'),i.getAttribute('autocapitalize'),i.spellcheck],
        btn:b?[b.getAttribute('aria-label'),b.tabIndex,b.getAttribute('aria-expanded'),(()=>{const r=b.getBoundingClientRect(),q=i.getBoundingClientRect();return Math.round(q.right-r.right)})()]:null}})()""")
    ok('Combo boxes · Drug given’s Drug is a combo box (it was the browser’s datalist): role combobox, no datalist, no autocorrect, capitals or spelling marks; on a Mac a pull-down chevron at the end of the field, out of the Tab order, named “Show drugs”',
       f['role'] == 'combobox' and f['list'] is None and not f['datalist'] and f['ac'] == ['off', 'off', False] and f['btn'] and f['btn'][0] == 'Show drugs' and f['btn'][1] == -1 and f['btn'][2] == 'false' and 0 <= f['btn'][3] <= 8, f)
    await p.click('#modal .or-cbx-btn'); await p.wait_for_timeout(300)
    l1 = await p.evaluate(LIST)
    ok('…the chevron opens the list and keeps the cursor in the field: the drugs on Maple’s sheet first, then those given in this case, under headings; the list is the field’s width and long names wrap',
       l1['open'] and l1['expanded'] == 'true' and l1['focus'] == 'dgName' and l1['heads'] == ['On Maple’s sheet', 'Given in this case']
       and l1['opts'] == ['Hydromorphone', 'Cefazolin', 'Dexmedetomidine', 'Lactated Ringer’s solution with potassium chloride 20 mEq/L', 'Ketamine']
       and abs(l1['w'][0] - l1['w'][1]) <= 1 and abs(l1['w'][2] - l1['w'][3]) <= 1 and l1['wrap'] == 'normal', l1)
    await p.click('#modal .or-cbx-btn'); await p.wait_for_timeout(250)
    l2 = await p.evaluate(LIST)
    await p.keyboard.type('dex'); await p.wait_for_timeout(250)
    l3 = await p.evaluate(LIST)
    await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(100)
    l4 = await p.evaluate(LIST)
    await p.keyboard.press('Enter'); await p.wait_for_timeout(250)
    l5 = await p.evaluate(LIST)
    ok('…the chevron closes it again; typing narrows the list (“dex” → Dexmedetomidine), ↓ marks the choice for VoiceOver, Return chooses it and closes the list, and the sheet stays open',
       not l2['open'] and l3['open'] and l3['opts'] == ['Dexmedetomidine'] and l4['adText'] == 'Dexmedetomidine' and l4['adSel'] == 'true' and l5['value'] == 'Dexmedetomidine' and not l5['open'] and l5['modal'], (l2['open'], l3['opts'], l4['adText'], l4['adSel'], l5))
    await p.fill('#dgName', ''); await p.keyboard.type('Zz custom drug'); await p.wait_for_timeout(250)
    l6 = await p.evaluate(LIST)
    await p.fill('#dgName', ''); await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(250)
    l7 = await p.evaluate(LIST)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(250)
    l8 = await p.evaluate(LIST)
    ok('…a name that isn’t in the list is kept as typed (no list shows) and never added to it; ↓ on an empty field opens the whole list; Esc closes the list and leaves the sheet open',
       l6['value'] == 'Zz custom drug' and not l6['open'] and l7['open'] and 'Zz custom drug' not in l7['opts'] and len(l7['opts']) == 5 and not l8['open'] and l8['modal'], (l6, l7['opts'], l8))
    await p.evaluate("closeModal()"); await p.wait_for_timeout(400)
    gone = await p.evaluate("document.querySelectorAll('.or-cbx-panel').length")
    # a case with nothing to choose from keeps a plain field
    await p.evaluate("LINK.sheetMeds=()=>[]; drugModal(caseById('or390c3'))"); await p.wait_for_timeout(400)
    pl = await p.evaluate("[document.getElementById('dgName').getAttribute('role'), !!document.querySelector('#modal .or-cbx-btn'), document.getElementById('dgName').getAttribute('autocorrect')]")
    ok('…closing the sheet takes its list away; with nothing to choose from the field stays a plain field (no chevron), still without autocorrect',
       gone == 0 and pl == [None, False, 'off'], (gone, pl))
    await p.evaluate("closeModal()"); await p.wait_for_timeout(400)
    # Add implant: Manufacturer
    await p.evaluate("scanModal(caseById('or390c2'))"); await p.wait_for_timeout(500)
    await p.click('[data-imp="manufacturer"]'); await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(250)
    mf = await p.evaluate("""(()=>{const i=document.querySelector('[data-imp="manufacturer"]'), pn=document.getElementById(i.getAttribute('aria-controls')||'-'), b=i.parentNode.querySelector('.or-cbx-btn');
      return [i.getAttribute('role'), b&&b.getAttribute('aria-label'), pn&&!pn.hidden&&[...pn.querySelectorAll('.or-cbx-h')].map(h=>h.textContent), pn&&[...pn.querySelectorAll('[role=option]')].map(o=>o.textContent), i.getAttribute('autocorrect'), i.getAttribute('autocapitalize')]})()""")
    ok('…Add implant’s Manufacturer offers the manufacturers OR has recorded, under “Used before in OR” (it offered nothing), with “Show manufacturers”, capitals at each word and no autocorrect',
       mf[0] == 'combobox' and mf[1] == 'Show manufacturers' and mf[2] == ['Used before in OR'] and 'Training implant maker' in mf[3] and mf[4] == 'off' and mf[5] == 'words', mf)
    await p.keyboard.press('Escape'); await p.evaluate("closeModal()"); await p.wait_for_timeout(300)
    errs += list(e); await c.close()

    # ── iPhone: no chevron; choosing the field opens the list, inside the screen ──
    c, p, e = await open_or(br, vp=(390, 844), touch=True)
    await p.evaluate(SEED)
    await p.evaluate("drugModal(caseById('or390c2'))"); await p.wait_for_timeout(600)
    await p.evaluate("document.getElementById('dgName').blur()"); await p.tap('#dgName'); await p.wait_for_timeout(400)
    ph = await p.evaluate(LIST)
    bt = await p.evaluate("!!document.querySelector('#modal .or-cbx-btn')")
    inside = await p.evaluate("(()=>{const pn=document.querySelector('.or-cbx-panel:not([hidden])'); if(!pn) return null; const r=pn.getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})()")
    tall = await p.evaluate("(()=>{const o=document.querySelector('.or-cbx-panel:not([hidden]) .or-cbx-o'); return o?Math.round(o.getBoundingClientRect().height):0})()")
    ok('…on an iPhone there’s no chevron: choosing the field opens the list, at the field’s width, inside the screen, each choice at least 44 pt',
       not bt and ph['open'] and ph['heads'][0] == 'On Maple’s sheet' and abs(ph['w'][0] - ph['w'][1]) <= 1 and inside and tall >= 44, (bt, ph, inside, tall))
    errs += list(e); await c.close()
    ok('no page errors', not errs, errs)
