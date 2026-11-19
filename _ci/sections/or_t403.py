"""Pravix OR — the n403 build's own checks (Nov 17 2026): HIG Searching, Settings, Undo and redo.
Undo and redo: steps and moves share one history for the visit; ⌘Z undoes again and again after the message has gone, ⇧⌘Z /
Ctrl+Y redoes; each says what it did and shows where it landed; a step someone else has changed since is never undone over
them; ⌘Z in a field is the field's; the shortcuts sheet names what ⌘Z will undo; touch has Undo and Redo buttons.
Searching: the field names what it searches and is a combobox VoiceOver follows; Clear; before typing, the cases in progress
and those opened this visit (memory only, with Clear); a typo finds close matches, opened only by choosing them; nothing is
saved in the browser."""
import core
from core import ok, section
import or_t390 as T

MSG = "document.getElementById('toastMsg').textContent"
ACT = "(()=>{const b=document.getElementById('toastAct');return b&&!b.hidden?b.textContent:null})()"
ST = "(id)=>[caseById(id).status, window.__fs['sheets/'+id.replace('or390c','or390_')].surgery.status]"


@section(id='t403', title='n403 · OR · Searching, Settings, Undo and redo: one undo history (⌘Z again and again, ⇧⌘Z to redo, never over someone else), shown where it lands; a search that names its scope, suggests before typing and finds typos',
         apps=['or'], topics=['undo', 'search'], engines=('chromium', 'webkit'))
async def s_t403(br):
    c, p, e = await T.open_or(br)
    keys0 = await p.evaluate("Object.keys(localStorage).filter(k=>k!=='anesia:v1:blur').sort()")
    await p.evaluate("doAdvance(caseById('or390c2'))"); await p.wait_for_timeout(300)
    await p.evaluate("doAdvance(caseById('or390c5'))"); await p.wait_for_timeout(300)
    s0 = [await p.evaluate(ST, 'or390c2'), await p.evaluate(ST, 'or390c5')]
    await p.wait_for_timeout(8600)
    gone = await p.evaluate("document.getElementById('toast').classList.contains('show')")
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(500)
    u1 = [await p.evaluate(ST, 'or390c5'), await p.evaluate(MSG), await p.evaluate(ACT)]
    flash = await p.evaluate("!!document.querySelector('.or-undo-flash')||!!UI.drawerId")
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(500)
    u2 = [await p.evaluate(ST, 'or390c2'), await p.evaluate(MSG)]
    ok('Undo and redo · ⌘Z undoes the last step after its message has gone, and again for the one before (it reached only the last step, only while its message showed)',
       s0[0] == ['closing', 'closing'] and s0[1][0] == 'arrived' and gone is False and u1[0] == ['scheduled', 'scheduled'] and u2[0] == ['procedure_started', 'procedure_started'], (s0, gone, u1[0], u2[0]))
    ok('…each says what it undid (“Otis is back to Scheduled”) and offers Redo, and the case is shown where it landed',
       u1[1] == 'Otis is back to Scheduled' and u1[2] == 'Redo' and u2[1] == 'Maple is back to Procedure started' and flash, (u1, u2, flash))
    await p.keyboard.press('Control+Shift+z'); await p.wait_for_timeout(500)
    r1 = [await p.evaluate(ST, 'or390c2'), await p.evaluate(MSG), await p.evaluate(ACT)]
    ok('…⇧⌘Z redoes it (“Redone — Maple · Closing”, with Undo); there was no redo', r1[0] == ['closing', 'closing'] and r1[1] == 'Redone — Maple · Closing' and r1[2] == 'Undo', r1)

    await p.keyboard.press('Shift+Slash'); await p.wait_for_timeout(400)
    ks = await p.evaluate("(document.querySelector('.pvx-ks')||{}).textContent||''")
    await p.keyboard.press('Escape'); await p.wait_for_timeout(200)
    ok('…the Keyboard shortcuts sheet names what ⌘Z and ⇧⌘Z will do (“Undo Maple · Closing”, “Redo Otis · Arrived”)', 'Undo Maple · Closing' in ks and 'Redo Otis · Arrived' in ks, ks[:400])

    await p.evaluate("doAdvance(caseById('or390c5'))"); await p.wait_for_timeout(300)
    await p.evaluate("firebase.firestore().collection('sheets').doc('or390_5').update({'surgery.status':'preop','surgery.events':[{status:'arrived',t:655,by:'Resident B'},{status:'preop',t:660,by:'Resident B'}],updated_by:'Resident B'})")
    await p.wait_for_timeout(800)
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(500)
    o = [await p.evaluate(ST, 'or390c5'), await p.evaluate(MSG)]
    ok('…a step someone else has changed since is never undone over them (“Can’t undo — Otis · Arrived has changed since by Resident B”)',
       o[0] == ['preop', 'preop'] and o[1].startswith('Can’t undo — Otis · Arrived has changed since') and 'Resident B' in o[1], o)

    await p.evaluate("(()=>{const c=caseById('or390c6'); const u=moveCase(c,'or1',c.date,900); movedToast(c,'or2',u,null);})()"); await p.wait_for_timeout(300)
    m0 = await p.evaluate("[caseById('or390c6').roomId, caseById('or390c6').sched]")
    await p.keyboard.press('Control+z'); await p.wait_for_timeout(400)
    m1 = await p.evaluate("[caseById('or390c6').roomId, caseById('or390c6').sched]")
    await p.keyboard.press('Control+y'); await p.wait_for_timeout(400)
    m2 = await p.evaluate("[caseById('or390c6').roomId, caseById('or390c6').sched]")
    ok('…moves share the same history: ⌘Z puts Willow back in OR 2 at 2:00 PM, Ctrl+Y moves her again', m0 == ['or1', 900] and m1 == ['or2', 840] and m2 == ['or1', 900], (m0, m1, m2))

    await p.evaluate("switchView('cases')"); await p.wait_for_timeout(300)
    await p.click('#casesSearch'); await p.keyboard.type('Wil'); await p.keyboard.press('Control+z'); await p.wait_for_timeout(300)
    f = await p.evaluate("[caseById('or390c6').roomId, orUndoDepth()[0]]")
    ok('…in a field, ⌘Z is the field’s own (no case changed)', f[0] == 'or1', f)
    await p.evaluate("document.getElementById('casesSearch').value=''; UI.casesQ=''; switchView('board')"); await p.wait_for_timeout(300)

    i = await p.evaluate("(()=>{const i=document.getElementById('globalSearch');return {ph:i.placeholder, role:i.getAttribute('role'), ekh:i.getAttribute('enterkeyhint')}})()")
    await p.click('#globalSearch'); await p.wait_for_timeout(300)
    before = await p.evaluate("document.getElementById('searchResults').innerText")
    await p.keyboard.type('Otis'); await p.wait_for_timeout(300)
    await p.keyboard.press('ArrowDown'); await p.wait_for_timeout(100)
    cb = await p.evaluate("(()=>{const i=document.getElementById('globalSearch');const l=document.getElementById(i.getAttribute('aria-controls'));const ad=i.getAttribute('aria-activedescendant');return {exp:i.getAttribute('aria-expanded'), lb:l&&l.getAttribute('role'), opts:l?l.querySelectorAll('[role=option]').length:0, ad:ad&&document.getElementById(ad)&&document.getElementById(ad).getAttribute('aria-selected'), clear:!document.getElementById('searchClear').hidden}})()")
    ok('Searching · the field names what it searches (it said “Search anything…”) and is a combobox VoiceOver follows: a listbox of options, the highlighted one announced, and Clear once something is typed',
       i == {'ph': 'Search cases, patients, rooms…', 'role': 'combobox', 'ekh': 'search'} and cb == {'exp': 'true', 'lb': 'listbox', 'opts': 2, 'ad': 'true', 'clear': True}, (i, cb))
    await p.click('#searchClear'); await p.wait_for_timeout(300)
    cl = await p.evaluate("[document.getElementById('globalSearch').value, document.activeElement.id]")
    ok('…before typing it shows the cases in progress (it showed nothing); Clear empties it and keeps the cursor there',
       'In progress' in before and 'Maple' in before and cl == ['', 'globalSearch'], (before[:200], cl))
    await p.keyboard.type('Otsi'); await p.wait_for_timeout(300)
    ty = await p.evaluate("document.getElementById('searchResults').innerText")
    await p.keyboard.press('Enter'); await p.wait_for_timeout(300)
    dr = await p.evaluate("UI.drawerId")
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.wait_for_timeout(500)
    dr2 = await p.evaluate("UI.drawerId")
    ok('…a typo finds close matches (“Nothing matches “Otsi” exactly.” · Otis), opened only by choosing one, not by Return (it said “No matches”)',
       'Nothing matches “Otsi” exactly.' in ty and 'Close matches' in ty and 'Otis' in ty and dr is None and dr2 == 'or390c5', (ty[:160], dr, dr2))
    await p.evaluate("closeDrawer()"); await p.wait_for_timeout(300)
    await p.click('#globalSearch'); await p.click('#searchClear'); await p.wait_for_timeout(300)
    rec = await p.evaluate("document.getElementById('searchResults').innerText")
    await p.click('#srClearRecent'); await p.wait_for_timeout(200)
    rec2 = await p.evaluate("document.getElementById('searchResults').innerText")
    keys1 = await p.evaluate("Object.keys(localStorage).filter(k=>k!=='anesia:v1:blur').sort()")
    ok('…“Recently opened” lists the cases opened this visit, in memory only, with Clear; nothing searched is saved in the browser',
       rec.startswith('Recently opened') and 'Otis' in rec and 'Recently opened' not in rec2 and keys1 == keys0, (rec[:120], rec2[:60], keys0, keys1))
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await T.open_or(br, vp=(1180, 820), touch=True)
    coarse = await p.evaluate("matchMedia('(pointer:coarse)').matches")
    await p.evaluate("doAdvance(caseById('or390c2'))"); await p.wait_for_timeout(300)
    ub = await p.evaluate("(()=>{const b=document.getElementById('orUndoBtn');return [getComputedStyle(b).display, b.getAttribute('aria-label'), b.disabled]})()")
    await p.evaluate("document.getElementById('orUndoBtn').click()"); await p.wait_for_timeout(400)
    st = await p.evaluate(ST, 'or390c2')
    ok('Undo and redo · on a touch screen, Undo and Redo are toolbar buttons while there’s something to undo, named for it (“Undo Maple · Closing”); with a keyboard and pointer they stay hidden',
       ub[1] == 'Undo Maple · Closing' and ub[2] is False and (ub[0] != 'none') == coarse and st == ['procedure_started', 'procedure_started'], (coarse, ub, st))
    await c.close()
