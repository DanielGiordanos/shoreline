"""Anesia — the n434 build's own checks (Nov 24 2026): HIG Collaboration and sharing, Drag and drop, Entering data.
Sharing a record never said who could open the link; a sheet's number field said nothing about "abc" until its action was
pressed; a value pasted or dropped with the field's own unit ("98 bpm") was refused; and (a correction to round 4's Privacy)
every record charted on a computer stayed in that browser's storage for good, with Vitals drafts kept there too."""
from core import *
from helpers import *

ERR = """(sel=>{const c=document.querySelector(sel); const ids=(c.getAttribute('aria-describedby')||'').split(' ').filter(Boolean);
  return {inv:c.getAttribute('aria-invalid'), said:ids.map(i=>document.getElementById(i)).filter(Boolean).map(x=>x.textContent).filter(Boolean)}})"""
PUT = """(([sel,t,kind])=>{const c=document.querySelector(sel); c.focus(); c.value=''; const dt=new DataTransfer(); dt.setData('text/plain',t);
  const ev= kind==='paste' ? new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}) : new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true});
  c.dispatchEvent(ev); return c.value;})"""
STORE = "[Object.keys(localStorage).filter(k=>k.startsWith('anesia:v1:rec:')||k.startsWith('anesia:v1:draft:')), Object.keys(sessionStorage).filter(k=>k.startsWith('anesia:v1:draft:'))]"
SEED_LS = """localStorage.setItem('anesia:v1:rec:an_train1', JSON.stringify({base:{id:'an_train1',patient:{name:'Copy left on this computer'}},pending:[]}));
  localStorage.setItem('anesia:v1:rec:zz_preview', JSON.stringify({base:{id:'zz_preview'},pending:[]}));
  localStorage.setItem('anesia:v1:rec:an_train2', JSON.stringify({base:{id:'an_train2'},pending:[],at:Date.now()-13*3600000}));
  localStorage.setItem('anesia:v1:rec:an_train3', JSON.stringify({base:{id:'an_train3'},pending:[],at:Date.now()-3600000}));
  localStorage.setItem('anesia:v1:index', JSON.stringify(['an_train1','an_train2','an_train3','zz_preview']));
  localStorage.setItem('anesia:v1:draft:an_old', JSON.stringify({nv_hr:{v:'77'}}));"""


async def drop_sheet(pg):
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    if await pg.locator('[data-drop]:visible').count(): await pg.click('[data-drop]:visible'); await pg.wait_for_timeout(300)


@section(id='a434', title='n434 · Anesia · Collaboration and sharing, Drag and drop, Entering data: sharing says who can open the link; number fields say at once when it isn’t a number; “98 bpm” pasted or dropped keeps its number; saved records aren’t kept in the browser',
         apps=['anesia'], topics=['sharing', 'drag-drop', 'entering-data', 'privacy'], engines=('chromium', 'webkit'))
async def s_a434(br):
    errs = []
    ctx, pg, e = await new_page(br)
    await pg.add_init_script(SEED_LS)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(800)
    st0 = await pg.evaluate(STORE)
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    # Drag and drop / Entering data: Vitals
    await pg.click('.an-tools [data-act=vitals]'); await pg.wait_for_timeout(600)
    P = {'hr paste': await pg.evaluate(PUT, ['#nv_hr', '98 bpm', 'paste']), 'hr drop': await pg.evaluate(PUT, ['#nv_hr', '98 bpm', 'drop']),
         'spo2': await pg.evaluate(PUT, ['#nv_spo2', '97 %', 'paste']), 'temp': await pg.evaluate(PUT, ['#nv_temp', '101.2 °F', 'paste'])}
    other = await pg.evaluate(PUT, ['#nv_hr', '98 mmHg', 'paste'])
    await pg.fill('#nv_hr', '88'); await pg.wait_for_timeout(200)
    st1 = await pg.evaluate(STORE)
    await drop_sheet(pg)
    # Entering data: a sheet's number field
    await pg.click('#anWeight'); await pg.wait_for_timeout(600)
    await pg.fill('#wK', 'abc'); await pg.press('#wK', 'Tab'); await pg.wait_for_timeout(200); w_bad = await pg.evaluate(ERR, '#wK')
    await pg.fill('#wK', '32.4'); await pg.wait_for_timeout(200); w_ok = await pg.evaluate(ERR, '#wK')
    P['weight'] = await pg.evaluate(PUT, ['#wK', '31.9 kg', 'paste'])
    await pg.fill('#wK', '31.9'); await pg.click('.an-scrim [data-ok]'); await pg.wait_for_timeout(1500)
    if await pg.locator('.an-scrim [data-ok]').count(): await drop_sheet(pg)
    st2 = await pg.evaluate(STORE)
    await pg.click('.an-tools [data-act=output]'); await pg.wait_for_timeout(600)
    await pg.fill('#oV', 'lots'); await pg.press('#oV', 'Tab'); await pg.wait_for_timeout(200); o_bad = await pg.evaluate(ERR, '#oV')
    await drop_sheet(pg)
    ok('Entering data · a sheet’s number field says “Enter a number” as soon as it’s left (Weight “abc”, Output “lots”; it said nothing until the action was pressed), VoiceOver hears it, and it clears once the value is a number',
       w_bad['inv'] == 'true' and 'Enter a number' in w_bad['said'] and o_bad['inv'] == 'true' and 'Enter a number' in o_bad['said'] and w_ok['inv'] is None and 'Enter a number' not in w_ok['said'], [w_bad, w_ok, o_bad])
    ok('Drag and drop, Entering data · a value pasted or dropped with the field’s own unit keeps its number (“98 bpm” → 98, “97 %”, “101.2 °F”, “31.9 kg”); it was refused as not a number',
       P == {'hr paste': '98', 'hr drop': '98', 'spo2': '97', 'temp': '101.2', 'weight': '31.9'}, P)
    ok('…and a value with another unit (“98 mmHg” in HR) is left to the browser, not changed', other in ('', '98 mmHg'), other)
    at = await pg.evaluate("(JSON.parse(localStorage.getItem('anesia:v1:rec:an_train1')||'null')||{}).at||0")
    now_ms = await pg.evaluate("Date.now()")
    ok('Privacy · a saved record’s copy is kept for the case only (every record charted on a computer stayed there for good): a copy 13 h old goes, and so does one left by an earlier version; a copy from the last 12 h stays, so the record still opens after a reload with the network down; a Preview record that is only on this computer stays',
       'anesia:v1:rec:an_train1' not in st0[0] and 'anesia:v1:rec:an_train2' not in st0[0] and 'anesia:v1:rec:an_train3' in st0[0] and 'anesia:v1:rec:zz_preview' in st0[0], st0)
    ok('…and a record charted now is kept with the time it was last changed here, so it can go 12 h later', 'anesia:v1:rec:an_train1' in st2[0] and 0 <= now_ms - at < 120000, [st2, now_ms - at])
    ok('…an unsaved Vitals draft is kept for this tab only (sessionStorage), and a draft left by an earlier version moves there',
       'anesia:v1:draft:an_train1' in st1[1] and not [k for k in st1[0] if ':draft:' in k] and 'anesia:v1:draft:an_old' in st0[1], [st0, st1])
    # Collaboration and sharing
    await pg.evaluate("(()=>{ window.__sh=null; try{ Object.defineProperty(navigator,'share',{value:(d)=>{window.__sh=d; return Promise.resolve();}, configurable:true}); }catch(e){} })()")
    await pg.click('#anShare'); await pg.wait_for_timeout(300); sh = await pg.evaluate("window.__sh")
    await pg.evaluate("(()=>{ try{ Object.defineProperty(navigator,'share',{value:undefined, configurable:true}); }catch(e){} if(navigator.clipboard) navigator.clipboard.writeText=()=>Promise.resolve(); })()")
    await pg.click('#anShare'); await pg.wait_for_timeout(500)
    toasts = await pg.evaluate("[...document.querySelectorAll('#anToast *')].map(x=>x.innerText).filter(Boolean)")
    errs += list(e); await ctx.close()
    ok('Collaboration and sharing · sharing says who can open the link: the share sheet’s text “It opens for signed-in staff.”, and Copy link’s message “Link copied — it opens this record for signed-in staff” (it said only “Link copied”)',
       bool(sh) and 'It opens for signed-in staff.' in sh.get('text', '') and sh.get('url', '').endswith('#r=an_train1') and any(t.startswith('Link copied — it opens this record for signed-in staff') for t in toasts), [sh, toasts[:2]])
    # Layout, found here: a longer message used half the iPhone's width
    ctx, pg, e = await new_page(br, vp=(390, 844), touch=True)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
    await pg.evaluate("(()=>{ try{ Object.defineProperty(navigator,'share',{value:undefined, configurable:true}); }catch(e){} if(navigator.clipboard) navigator.clipboard.writeText=()=>Promise.resolve(); })()")
    await pg.click('#anShare'); await pg.wait_for_timeout(700)
    tb = await pg.evaluate("(()=>{const r=document.getElementById('anToast').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.width)]})()")
    errs += list(e); await ctx.close()
    ok('Layout · on iPhone the message uses the screen’s width, inside 16-pt margins (it wrapped at half the width: 195 pt)', tb[2] > 260 and tb[0] >= 15 and tb[1] <= 375, tb)
    ok('no page errors', not errs, errs)
