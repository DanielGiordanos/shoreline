"""Pravix OR — the n399 build's own checks (Nov 17 2026): HIG File management, Going full screen, Launching.
Launching: a reload puts back where this tab was — the section, the open case and its tab (and Back still returns to the
list it came from), how far down — kept in the tab's own history entry, with nothing in the browser's storage and no names;
a day that has passed goes back to Today. File management: a Recovery value typed and then left by hiding the page is
saved (it was lost). Going full screen: Display mode opened without full screen offers Full screen; the pointer and the
controls hide when the pointer rests and come back with a move or a key; Display mode comes back after a reload; the
screen is brought up to date the moment it's shown again; at night the wall display starts the new day in place, staying
full screen (OR's nightly reload took it out of full screen and back to the Board); anywhere else the reload keeps the place."""
import json
import core
from core import ok, section, PORT
import or_t390 as T

# the suite pins the clock (core.PINJS); this wraps whatever Date the page has so a check can move it forward
SHIFTPIN = ("(()=>{if(window.__pvxShiftOn)return;window.__pvxShiftOn=1;const B=Date;const S=()=>{ const m=/^pvxshift:(\\d+)$/.exec(window.name||''); return m?+m[1]:(window.__pvxShift||0); };"
            "class G extends B{constructor(...a){ if(a.length) super(...a); else super(B.now()+S()); } static now(){ return B.now()+S(); }} window.Date=G; })()")
READY = "typeof CASES!=='undefined'&&CASES.length>=6"
HIDE = "(h)=>{ Object.defineProperty(document,'hidden',{configurable:true,get:()=>h}); Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>h?'hidden':'visible'}); document.dispatchEvent(new Event('visibilitychange')); }"


async def open_shift(br, vp=(1440, 900), path='/or/', touch=False):
    core.SEED, keep = T.SEED, core.SEED
    try:
        c, p, e = await core.new_page(br, vp=vp, dark=True, touch=touch)
    finally:
        core.SEED = keep
    await c.add_init_script(core.PINJS); await c.add_init_script(SHIFTPIN)
    await p.goto(f'http://127.0.0.1:{PORT}{path}')
    await core.until(p, READY, 6000); await p.wait_for_timeout(600)
    return c, p, e


async def reload(p):
    await p.reload(); await core.until(p, READY, 6000); await p.wait_for_timeout(800)


@section(id='t399', title='n399 · OR · File management, Going full screen, Launching: a reload puts back the section, case, tab and place; a typed value kept when the page is hidden; Full screen offered, the pointer rests, the screen current when shown again, and the wall display’s new day in place',
         apps=['or'], topics=['behaviour', 'launch', 'display'], engines=('chromium', 'webkit'))
async def s_t399(br):
    c, p, e = await open_shift(br)
    KEYS = "[Object.keys(localStorage).filter(k=>k!=='anesia:v1:blur').sort(), Object.keys(sessionStorage).sort()]"   # the glass guard's own device setting (n226) comes and goes
    store0 = await p.evaluate(KEYS)
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(600)
    await reload(p)
    v = await p.evaluate("[UI.view, (document.querySelector('#switcher .seg.active')||{}).dataset.view]")
    ok('Launching · a reload puts back the section you were in (Schedule; it always opened the Board)', v == ['schedule', 'schedule'], v)

    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(400)
    await p.fill('#casesSearch', 'Pepper'); await p.wait_for_timeout(400)
    await p.evaluate("openCase('or390c3')"); await p.wait_for_timeout(600)
    await p.click('#caseTabs [data-tab="recovery"]'); await p.wait_for_timeout(600)
    await reload(p)
    r = await p.evaluate("({view:UI.view, id:UI.caseId, tab:UI.caseTab, sel:(document.querySelector('#caseTabs [aria-selected=\"true\"]')||{}).dataset?.tab})")
    await p.go_back(); await p.wait_for_timeout(700)
    back = await p.evaluate("UI.view")
    ok('…and the open case and its tab (Pepper · Recovery), with Back still going to the list it was opened from (Cases)',
       r == {'view': 'case', 'id': 'or390c3', 'tab': 'recovery', 'sel': 'recovery'} and back == 'cases', (r, back))
    st = await p.evaluate("JSON.stringify(history.state||{})")
    store1 = await p.evaluate(KEYS)
    ok('…kept in the tab’s own history entry: nothing new in the browser’s storage, and no names (the Cases search “Pepper” isn’t kept)',
       store1 == store0 and '"pvxOr"' in st and 'Pepper' not in st and 'Biscuit' not in st, (store0, store1, st))
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(300)
    await p.click('#schedNext'); await p.wait_for_timeout(700)
    await p.evaluate("window.name='pvxshift:'+(24*3600*1000)")   # the next day, when the tab comes back
    await reload(p)
    d = await p.evaluate("[UI.view, UI.schedDate, TODAY, document.getElementById('schedDateLabel').textContent]")
    await p.evaluate("window.name=''")
    ok('…a day that has passed goes back to Today (the section is kept)', d[0] == 'schedule' and d[2] == '2026-10-24' and d[1] == d[2] and d[3].startswith('Today'), d)
    await c.close()

    c, p, e = await open_shift(br, vp=(390, 844), touch=True)
    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(500)
    await p.evaluate("document.getElementById('stage').scrollTop=260"); await p.wait_for_timeout(600)
    y0 = await p.evaluate("document.getElementById('stage').scrollTop")
    await reload(p)
    y1 = await p.evaluate("[UI.view, document.getElementById('stage').scrollTop]")
    ok('…and how far down you were (iPhone, Cases)', y0 > 100 and y1[0] == 'cases' and abs(y1[1] - y0) <= 2, (y0, y1))
    await c.close()

    c, p, e = await open_shift(br)
    await p.evaluate("openCase('or390c3')"); await p.wait_for_timeout(600)
    await p.click('#caseTabs [data-tab="recovery"]'); await p.wait_for_timeout(400)
    await p.fill('[data-rec="o2"]', 'Flow-by 2 L'); await p.wait_for_timeout(100)
    await p.evaluate(HIDE, True); await p.wait_for_timeout(400)
    kept = await p.evaluate("[caseById('or390c3').recovery.o2||null, ((window.__fs['sheets/or390_3'].surgery||{}).recovery||{}).o2||null]")
    await p.evaluate(HIDE, False)
    ok('File management · a Recovery value typed and then left by switching tab or app is saved, as leaving the field saves it (it was lost)',
       kept == ['Flow-by 2 L', 'Flow-by 2 L'], kept)
    await c.close()

    c, p, e = await open_shift(br, vp=(1920, 1080), path='/or/#display')
    await p.wait_for_timeout(900)
    fs = await p.evaluate("({mode:document.body.classList.contains('display-mode'), en:!!document.fullscreenEnabled, full:!!document.fullscreenElement, btn:!document.getElementById('displayFull').hidden})")
    await p.wait_for_timeout(3200)
    rest0 = await p.evaluate("[document.body.classList.contains('or-idle'), getComputedStyle(document.getElementById('displayCtl')).opacity]")
    ok('…opened straight into Display mode (focus on Exit, nobody at a keyboard), the controls still rest after 3 s', rest0[0] is True and float(rest0[1]) < 0.05, rest0)
    await p.mouse.move(1500, 60); await p.wait_for_timeout(300)
    entered = None
    if fs['en']:
        await p.click('#displayFull'); await p.wait_for_timeout(700)
        entered = await p.evaluate("[!!document.fullscreenElement, document.getElementById('displayFull').hidden, document.body.classList.contains('display-mode')]")
    ok('Going full screen · Display mode opened without full screen (the Home Screen shortcut) offers Full screen, which goes full screen and then steps aside; where there’s no full screen it isn’t offered',
       fs['mode'] and not fs['full'] and ((fs['en'] and fs['btn'] and entered == [True, True, True]) or (not fs['en'] and not fs['btn'])), (fs, entered))
    await p.mouse.move(900, 500); await p.wait_for_timeout(3600)
    idle = await p.evaluate("(()=>{const k=getComputedStyle(document.getElementById('displayCtl'));return [document.body.classList.contains('or-idle'), getComputedStyle(document.getElementById('displayGrid')).cursor, k.opacity, k.pointerEvents]})()")
    await p.mouse.move(700, 400); await p.wait_for_timeout(500)
    woke = await p.evaluate("[document.body.classList.contains('or-idle'), getComputedStyle(document.getElementById('displayCtl')).opacity]")
    await p.wait_for_timeout(3600); await p.keyboard.press('Tab'); await p.wait_for_timeout(500)
    key = await p.evaluate("[document.body.classList.contains('or-idle'), getComputedStyle(document.getElementById('displayCtl')).opacity, document.activeElement&&document.activeElement.closest('#displayCtl')?document.activeElement.id:null]")
    ok('…when the pointer rests for 3 s the pointer and the controls go (they stayed all day on the wall); a move or a key brings them back, with focus on a control',
       idle[0] and idle[1] == 'none' and float(idle[2]) < 0.05 and idle[3] == 'none' and woke[0] is False and float(woke[1]) > 0.9
       and key[0] is False and float(key[1]) > 0.9 and key[2] in ('displayFull', 'displayExit'), (idle, woke, key))
    esc1 = None
    if fs['en']:
        await p.evaluate("document.fullscreenElement||document.documentElement.requestFullscreen()"); await p.wait_for_timeout(500)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
        await p.evaluate("document.fullscreenElement&&document.exitFullscreen()"); await p.wait_for_timeout(600)
        esc1 = await p.evaluate("[document.body.classList.contains('display-mode'), !document.getElementById('displayFull').hidden]")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
    esc2 = await p.evaluate("document.body.classList.contains('display-mode')")
    ok('…Esc leaves full screen first and Display mode stays, offering Full screen again; the next Esc leaves Display mode (leaving full screen took Display mode with it)',
       (esc1 == [True, True] or (not fs['en'] and esc1 is None)) and esc2 is False, (esc1, esc2))
    await p.evaluate("document.body.classList.contains('display-mode')||enterDisplay()"); await p.wait_for_timeout(700)
    await reload(p)
    back = await p.evaluate("[document.body.classList.contains('display-mode'), !document.getElementById('displayFull').hidden||!document.fullscreenEnabled]")
    ok('…a reload of the wall screen comes back in Display mode (it came back as the Board), offering Full screen', back == [True, True], back)

    n0 = await p.evaluate("window.__n399rd=0; const f=renderDisplay; renderDisplay=function(){ window.__n399rd++; return f.apply(this,arguments); }; 0")
    await p.evaluate(HIDE, True); await p.wait_for_timeout(200); await p.evaluate(HIDE, False); await p.wait_for_timeout(200)
    n1 = await p.evaluate("window.__n399rd")
    ok('…shown again after another tab or app, the screen is brought up to date at once (elapsed times and late flags waited up to 30 s)', n1 >= 1, n1)
    await c.close()

    c, p, e = await open_shift(br, vp=(1920, 1080), path='/or/#display'); await p.wait_for_timeout(900)
    en = await p.evaluate("!!document.fullscreenEnabled")
    if en:
        await p.click('#displayFull'); await p.wait_for_timeout(700)
    await p.evaluate("window.__n399stay=1; window.__pvxShift=(13*3600+40)*1000")   # 00:00:40 the next day, when OR starts the new day
    night = await p.evaluate("typeof orNight==='function'?orNight():'none'"); await p.wait_for_timeout(900)
    wall = await p.evaluate("[window.__n399stay===1, TODAY, document.body.classList.contains('display-mode'), !!document.fullscreenElement, document.querySelectorAll('#displayGrid [data-id]').length, document.getElementById('displayGrid').textContent.includes('Maple')]")
    ok('…at night (00:00:40, when OR starts the new day) the wall display turns the day over in place and stays in Display mode and full screen (OR reloaded it: out of full screen, back as the Board)',
       night is True and wall[0] and wall[1] == '2026-10-24' and wall[2] and wall[3] == en and not wall[5], (night, en, wall))
    await c.close()

    c, p, e = await open_shift(br)
    await p.click('#switcher [data-view="schedule"]'); await p.wait_for_timeout(600)
    await p.evaluate("window.name='pvxshift:'+((13*3600+40)*1000)")
    await p.evaluate("typeof orNight==='function'?orNight():location.reload()")
    await p.wait_for_timeout(1500); await core.until(p, READY, 6000); await p.wait_for_timeout(800)
    away = await p.evaluate("[UI.view, TODAY, UI.schedDate]")
    await p.evaluate("window.name=''")
    ok('…anywhere else it still reloads, and keeps the place (Schedule, on the new Today)', away == ['schedule', '2026-10-24', '2026-10-24'], away)
    ok('no page errors', not e, e)
    await c.close()
