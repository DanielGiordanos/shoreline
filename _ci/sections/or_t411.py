"""Pravix OR — the n411 build's own checks (Nov 19 2026): HIG Ornaments, Pop-up buttons.
A pop-up's default is one people are likely to want, never one that records something nobody chose (Brand §9.2, n283):
Drug given started on mg/kg and IV, Add case on the first surgeon, a new delay on "Previous case running long" and 15 min.
They start on "Choose…" (a delay's minutes on how late OR projects the case), and what's missing is said under the field.
The drug lists write doses as Brand §10 does (units, SUBQ), the data unchanged. Add case's Room and Day show whole,
and a focused pop-up keeps its chevron."""
import core
from core import ok, section
import or_t390 as T

FIELD = "(id)=>{const s=document.getElementById(id);if(!s)return [null,null,'',null];const f=s.closest('.or-field');const m=f&&f.querySelector('.or-field-msg');return [s.value, s.selectedOptions[0]&&s.selectedOptions[0].textContent, m?m.textContent:'', s.getAttribute('aria-invalid')]}"
CLIP = """(id)=>{const s=document.getElementById(id); if(!s||!s.selectedOptions[0])return false; const cs=getComputedStyle(s), cv=document.createElement('canvas').getContext('2d'); cv.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
  return cv.measureText(s.selectedOptions[0].textContent).width <= s.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)+1}"""
PRIMARY = "[...document.querySelectorAll('#modalActions .btn.primary')].pop()"


async def pick(p, sel, **kw):
    """choose an option if the sheet is still open (on n410 an earlier press already closed it: the check fails, not the section)"""
    try:
        await p.select_option(sel, timeout=1500, **kw)
    except Exception:
        # WebKit can report a just-opened sheet's row hidden for a moment (stale computed style; it's painted and usable):
        # choose through the field and send the change event. If the sheet has closed (n410), there's nothing to choose.
        await p.evaluate("([s,v,i])=>{const e=document.querySelector(s); if(!e||!document.getElementById('modal').classList.contains('open')) return; if(v!==null) e.value=v; else e.selectedIndex=i; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}))}",
                         [sel, kw.get('value'), kw.get('index')])


@section(id='t411', title='n411 · OR · Ornaments, Pop-up buttons: Drug given’s unit and route, Add case’s surgeon and a delay’s reason are chosen, not defaulted; doses in safe notation; Room and Day show whole; the chevron stays while focused',
         apps=['or'], topics=['popups', 'entering'], engines=('chromium', 'webkit'))
async def s_t411(br):
    c, p, e = await T.open_or(br)
    # Drug given
    await p.evaluate("drugModal(caseById('or390c2'))"); await p.wait_for_timeout(400)
    u0 = await p.evaluate(FIELD, 'dgUnit'); r0 = await p.evaluate(FIELD, 'dgRoute')
    labels = await p.evaluate("[...document.querySelectorAll('#dgUnit option, #dgRoute option')].map(o=>o.textContent)")
    await p.focus('#dgRoute'); await p.wait_for_timeout(250)
    chev = await p.evaluate("getComputedStyle(document.getElementById('dgRoute')).backgroundImage")
    await p.fill('#dgName', 'Hydromorphone'); await p.fill('#dgDose', '0.1')
    await p.evaluate(f"{PRIMARY}.click()"); await p.wait_for_timeout(250)
    u1 = await p.evaluate(FIELD, 'dgUnit'); n1 = await p.evaluate("caseById('or390c2').drugs.length")
    await pick(p, '#dgUnit', value='mg/kg'); await p.evaluate(f"{PRIMARY}.click()"); await p.wait_for_timeout(250)
    r1 = await p.evaluate(FIELD, 'dgRoute')
    await pick(p, '#dgRoute', value='SC'); await p.evaluate(f"{PRIMARY}.click()"); await p.wait_for_timeout(500)
    last = await p.evaluate("(()=>{const d=caseById('or390c2').drugs.slice(-1)[0];return [d.unit,d.route,drugLine(d)]})()")
    ok('Pop-up buttons · Drug given’s unit and route start on “Choose…” (they started on mg/kg and IV, charted to the treatment sheet though nobody chose them), and charting without them says so under the field',
       u0[:2] == ['', 'Choose…'] and r0[:2] == ['', 'Choose…'] and 'Choose the unit' in u1[2] and n1 == 0 and 'Choose the route' in r1[2], (u0, r0, u1, n1, r1))
    ok('…doses are written as Brand §10 writes them (units, SUBQ; never U or SC), and the stored value is unchanged',
       'units/kg' in labels and 'units' in labels and 'SUBQ' in labels and not any(x in ('U', 'U/kg', 'SC') for x in labels)
       and last[0] == 'mg/kg' and last[1] == 'SC' and 'SUBQ' in last[2] and ' SC' not in last[2], (labels, last))

    # Add case
    await p.click('#addCaseBtn'); await p.wait_for_timeout(500)
    s0 = await p.evaluate(FIELD, 'acSurgeon')
    await pick(p, '#acProc', value='TPLO'); await pick(p, '#acLat', value='Left'); await p.wait_for_timeout(150)
    d0 = await p.evaluate(f"{PRIMARY}.getAttribute('aria-disabled')")
    await p.evaluate(f"{PRIMARY}.click()"); await p.wait_for_timeout(250)
    s1 = await p.evaluate(FIELD, 'acSurgeon'); f1 = await p.evaluate("document.activeElement.id")
    whole = [await p.evaluate(CLIP, i) for i in ('acRoom', 'acDate', 'acTime')]
    await pick(p, '#acSurgeon', index=1); await p.wait_for_timeout(150)
    d1 = await p.evaluate(f"{PRIMARY}.getAttribute('aria-disabled')")
    ok('…Add case’s surgeon starts on “Choose…” (it was the first surgeon in the list): Add case stays dimmed until chosen, and pressing it says “Choose the surgeon.” with focus on the field',
       s0[:2] == ['', 'Choose…'] and d0 == 'true' and 'Choose the surgeon' in s1[2] and f1 == 'acSurgeon' and d1 == 'false', (s0, d0, s1, f1, d1))
    ok('…and Room, Day and Time show their whole value (Room read “OR 1 · Orthoped…”, Day “Today · Fri, Oct 2…”)', whole == [True, True, True], whole)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.evaluate("document.getElementById('orDiscardYes')&&document.getElementById('orDiscardYes').click()"); await p.wait_for_timeout(300)

    # Delay
    late = await p.evaluate("lateMin(caseById('or390c5'))")
    await p.evaluate("delayModal(caseById('or390c5'))"); await p.wait_for_timeout(400)
    m0 = await p.evaluate("document.getElementById('dlMin').value"); g0 = await p.evaluate(FIELD, 'dlReason')
    d2 = await p.evaluate(f"{PRIMARY}.getAttribute('aria-disabled')")
    await p.evaluate(f"{PRIMARY}.click()"); await p.wait_for_timeout(250)
    g1 = await p.evaluate(FIELD, 'dlReason'); kept = await p.evaluate("caseById('or390c5').delay")
    await pick(p, '#dlReason', value='Surgeon unavailable'); await p.wait_for_timeout(150)
    d3 = await p.evaluate(f"{PRIMARY}.getAttribute('aria-disabled')")
    await p.evaluate(f"{PRIMARY}.click()"); await p.wait_for_timeout(300)
    saved = await p.evaluate("caseById('or390c5').delay")
    ok('…a new delay starts on how late OR projects the case and no reason (it was 15 min and “Previous case running long”): Save is dimmed until the reason is chosen, says so under the field, then saves',
       late > 0 and m0 == str(late) and g0[:2] == ['', 'Choose…'] and d2 == 'true' and 'Choose the reason' in g1[2] and kept is None
       and d3 == 'false' and saved and saved['reason'] == 'Surgeon unavailable' and saved['min'] == late, (late, m0, g0, d2, g1, kept, d3, saved))
    await p.evaluate("delayModal(caseById('or390c5'))"); await p.wait_for_timeout(400)
    again = await p.evaluate("[document.getElementById('dlReason').value, [...document.getElementById('dlReason').options].some(o=>o.value==='')]")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('…editing a delay shows its reason, with no “Choose…” to go back to', again == ['Surgeon unavailable', False], again)
    ok('…and a pop-up keeps its chevron while focused (a focus rule’s background shorthand wiped it)', chev.startswith('url('), chev[:40])
    ok('no page errors', not e, e)
    await c.close()
