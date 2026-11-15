"""Pravix Flow — the n376 build's own checks (Nov 13 2026): HIG Live Activities + Notifications + Snippets. Notifications: a
family message's note opens the conversation and doesn't tell you to; the Rounds failure says what's true and goes when the
retry works; the treatment-sheet failure carries its link; a note left on screen says how long ago it came; staff notes never
show over the Client Display in full screen or on the lobby TV; the check-in card has no app name. Snippets: Talk to Flow's
confirmation says what it will do. Live Activities: the critical banner has one action and opens its patient."""
import os
from core import ok, section, PORT, INIT, FAKE, WRAP, SEED, BUILD, flow_code

FU = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
newerr = lambda e: [x for x in e if 'cb is not a function' not in x and 'collectionGroup' not in x]
SEED7 = """(()=>{ const now=Date.now(), D=DOCTORS.map(d=>d.id);
  [['Bella','Rivera','Waiting','Lobby',1,'unassigned',95],['Milo','Chen','Waiting','Lobby',2,'unassigned',42],['Rocky','Hale','Exam','Room 1',2,D[0],35],['Pepper','Nakamura','Hospitalized','ICU',2,D[0],55]].forEach(r=>{
    PATIENTS.push(patient({name:r[0],last:r[1],owner:'Synthetic '+r[1],status:r[2],room:r[3],prio:r[4],doctor:r[5],species:'Canine',arrival:new Date(now-r[6]*60000),reason:'Vomiting',
      timeline:[{label:'Checked in',at:new Date(now-r[6]*60000)}]})); });
  renderAll(); return PATIENTS.length; })()"""


async def ctx(br, w=1440, h=900):
    o = dict(viewport={'width': w, 'height': h}, timezone_id='America/Los_Angeles', locale='en-US', color_scheme='dark')
    if w <= 820: o.update(has_touch=True, is_mobile=w < 700)
    c = await br.new_context(**o)
    await c.add_init_script(INIT.replace('@@USER@@', FU).replace('@@SEED@@', SEED)); await c.add_init_script(FAKE); await c.add_init_script(WRAP)
    async def route(r):
        u = r.request.url
        if u.startswith('https://www.gstatic.com/'): await r.fulfill(status=200, content_type='application/javascript', body='')
        elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
        else: await r.fulfill(status=204, body='')
    await c.route('**/*', route)
    p = await c.new_page(); e = []; p.on('pageerror', lambda x: e.append(str(x)))
    await p.goto(f'http://127.0.0.1:{PORT}/'); await p.wait_for_selector('#subnavFlow .switcher.pvx-sw', state='attached'); await p.wait_for_timeout(2400)
    await p.evaluate(SEED7); await p.wait_for_timeout(500)
    return c, p, e

NOTES = "[...document.querySelectorAll('#notes .note')].map(n=>({t:n.querySelector('.n-title').textContent, s:(n.querySelector('.n-sub')||{}).textContent||'', time:n.querySelector('.n-time').textContent, hid:n.querySelector('.n-time').getAttribute('aria-hidden'), sticky:n.classList.contains('sticky')}))"
CMD = """(()=>{ const pn=document.getElementById('fvPanel'); return pn&&pn.classList.contains('show')?{ok:(pn.querySelector('.fv-ok')||{}).textContent, no:(pn.querySelector('.fv-no')||{}).textContent, head:(pn.querySelector('.fv-t b')||{}).textContent}:null; })()"""


async def typed(p, q):
    await p.click('#globalSearch'); await p.keyboard.type(q); await p.wait_for_timeout(400); await p.keyboard.press('Enter'); await p.wait_for_timeout(900)


@section(id='t376', title='n376 · Notifications, Live Activities, Snippets: a family message opens its conversation; failures say what’s true; notes age; none over the Client Display; Talk to Flow’s confirmation says what it does',
         apps=['flow'], topics=['notifications', 'privacy', 'voice'], engines=('chromium', 'webkit'))
async def s_t376(br):
    src = flow_code()   # n383: Flow's code is in assets/flow/
    c, p, e = await ctx(br)
    # Rounds can't be reached for now (set before Flow's own first sweep, 6 s after loading)
    await p.evaluate("(()=>{ const q=PATIENTS.find(x=>x.name==='Pepper'); if(q.rounds) delete q.rounds; window.__rdE=rdEnroll; rdEnroll=function(){ throw new Error('offline'); }; })()")

    # 1. a family message opens its conversation
    ok('Notifications · the family-message note no longer says “open to reply”, and Flow’s own call opens that patient’s conversation',
       'open to reply' not in src and "notify('New message from family'" in src and 'pvxOpenThread(pid)' in src, '')
    await p.evaluate("(()=>{ const q=PATIENTS.find(x=>x.name==='Rocky'); notify('New message from family','Rocky Hale',{icon:'info',color:'#0A84FF',dur:8000,openLabel:'Open the conversation',open:()=>pvxOpenThread(q.id)}); })()")
    await p.wait_for_timeout(500)
    n = await p.evaluate("(()=>{ const n=document.querySelector('#notes .note.n-open'), b=n&&n.querySelector('.n-go'); return n?{btn:b.tagName, name:b.getAttribute('aria-label'), cur:getComputedStyle(n).cursor, sub:n.querySelector('.n-sub').textContent}:null; })()")
    ok('…the note is a button named “New message from family. Open the conversation”, with the patient under it', n and n['btn'] == 'BUTTON' and n['name'] == 'New message from family. Open the conversation' and n['cur'] == 'pointer' and n['sub'] == 'Rocky Hale', n)
    await p.evaluate("document.querySelector('#notes .note.n-open .n-sub').click()"); await p.wait_for_timeout(900)
    o = await p.evaluate("(()=>{ const q=PATIENTS.find(x=>x.name==='Rocky'), h=document.getElementById('commHead'); return {drawer:document.getElementById('drawer').classList.contains('open'), pid:activePatient===q.id, comm:h&&h.getAttribute('aria-expanded'), left:document.querySelectorAll('#notes .note.n-open:not(.hide)').length}; })()")
    ok('…clicking it opens that patient with Messages open, and the note goes (before, it did nothing)', o == {'drawer': True, 'pid': True, 'comm': 'true', 'left': 0}, o)
    await p.keyboard.press('Escape'); await p.evaluate("closeDrawer()"); await p.wait_for_timeout(400)

    # 2. the Rounds failure says what's true and goes when the retry works
    ok('…“Couldn’t add … to Rounds” says “Flow tries again in 5 minutes” (it said to add them in Rounds, which has no Add)',
       'Flow tries again in 5 minutes' in src and 'Open Rounds and add them from the census' not in src, '')
    FAILS = "%s.filter(x=>/^Couldn’t add/.test(x.t))" % NOTES
    await p.evaluate("fvRoundsSweep()")
    for _ in range(28):
        r1 = await p.evaluate(FAILS)
        if r1: break
        await p.wait_for_timeout(250)
    r2 = await p.evaluate("""(async()=>{ rdEnroll=window.__rdE; const D=Date.now; Date.now=()=>D()+6*60000; fvRoundsSweep(); Date.now=D; await new Promise(r=>setTimeout(r,4300));
      return [%s.length, !!PATIENTS.find(x=>x.name==='Pepper').rounds]; })()""" % FAILS)
    ok('…the failure stays until read, and goes by itself when the retry adds the patient (it stayed after it had fixed itself)',
       len(r1) == 1 and r1[0]['t'] == 'Couldn’t add Pepper to Rounds' and r1[0]['s'] == 'Flow tries again in 5 minutes' and r1[0]['sticky'] and r2 == [0, True], [r1, r2])

    # 3. the treatment-sheet failure carries its link
    ok('…“Couldn’t open a treatment sheet” carries the link (Open Treatment Sheets ›) where it only named the place',
       'start one from Treatment Sheets' not in src and '<a href="/treatment/" target="_blank" rel="noopener"' in src and 'Open Treatment Sheets ›' in src, '')

    # 4. a note left on screen says how long ago it came
    a = await p.evaluate("""(()=>{ notify('Not saved','The form changed on another screen',{icon:'info'}); const t=document.querySelector('#notes .note.sticky .n-time'); const a0=[t.textContent,t.getAttribute('aria-hidden')];
      t.setAttribute('data-at', Date.now()-5*60000-2000); pvxNoteTick(); const a1=t.textContent; t.setAttribute('data-at', Date.now()-95*60000); pvxNoteTick(); const a2=t.textContent;
      document.querySelector('#notes .note.sticky .n-x').click(); return [a0,a1,a2]; })()""")
    ok('…a note left on screen says how long ago it came: “now”, “5 min ago”, then the time (it said “now” for ever); the time is for the eye only',
       a[0] == ['now', 'true'] and a[1] == '5 min ago' and ':' in a[2] and 'ago' not in a[2], a)
    await p.wait_for_timeout(600)

    # 5. never over the Client Display in full screen, or on the lobby TV
    v = await p.evaluate("""(async()=>{ notify('Couldn’t save the form','Check the connection and try again',{icon:'info'}); const w=document.getElementById('notes'), d=()=>getComputedStyle(w).display;
      const win=d(); switchView('client'); await new Promise(r=>setTimeout(r,300)); const client=d(); document.body.classList.add('fs-mode'); const fs=d(); document.body.classList.remove('fs-mode');
      document.body.classList.add('tv-mode'); const tv=d(); document.body.classList.remove('tv-mode'); switchView('dashboard'); await new Promise(r=>setTimeout(r,300));
      const back=[d(), document.querySelectorAll('#notes .note.sticky').length]; document.querySelector('#notes .note.sticky .n-x').click(); return {win, client, fs, tv, back}; })()""")
    ok('Privacy · staff notes (patient and owner names) never show over the Client Display in full screen or on the lobby TV; a failure is still there on the way back',
       v['win'] != 'none' and v['client'] != 'none' and v['fs'] == 'none' and v['tv'] == 'none' and v['back'][0] != 'none' and v['back'][1] == 1, v)

    # 6. the check-in card
    ck = await p.evaluate("""(async()=>{ const old=PATIENTS.find(x=>x.name==='Milo'); old.flags=[{id:'f1',k:'safe',t:'Bites when handled',scope:'always'}];
      commitPatient({name:'Milo',last:'Chen',owner:old.owner,status:'Waiting',room:'Lobby',prio:3,doctor:'unassigned',species:'Canine',arrival:new Date(),reason:'Recheck',timeline:[]});
      await new Promise(r=>setTimeout(r,600)); const n=document.querySelector('.fg-ntf'); if(!n) return null;
      const r={head:n.querySelector('.fg-nh span').textContent, title:n.querySelector('b').textContent, acts:[...n.querySelectorAll('.fg-acts button')].map(b=>b.textContent)}; n.remove(); return r; })()""")
    ok('…the check-in card is headed “Check-in”, without the app’s name, and keeps its two actions', ck and ck['head'] == 'Check-in' and 'is here' in ck['title'] and ck['acts'] == ['Keep Flags', 'Review'], ck)

    # Snippets: Talk to Flow's confirmation says what it does
    await typed(p, 'make Rocky critical'); s1 = await p.evaluate(CMD)
    ov = await p.evaluate("(()=>{ const a=document.getElementById('fvPanel').getBoundingClientRect(), i=document.getElementById('critIsland'), b=i.getBoundingClientRect(); return {on:i.classList.contains('on'), overlap:!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom), top:Math.round(a.top), ib:Math.round(b.bottom)}; })()")
    ok('…with a critical patient waiting, the card sits below the critical banner (the banner covered part of it)', ov['on'] and not ov['overlap'] and ov['top'] >= ov['ib'], ov)
    await p.keyboard.press('Escape'); await p.evaluate("document.querySelector('#fvPanel .fv-no')&&document.querySelector('#fvPanel .fv-no').click()"); await p.wait_for_timeout(300)
    await typed(p, 'move Bella to Room 6 and make Rocky critical'); s2 = await p.evaluate(CMD)
    ok('Snippets · Talk to Flow’s confirmation says what it will do: “Set priority” for one change, “Make 2 changes” for two (it said “Confirm”), beside Cancel',
       s1 and s1['ok'] == 'Set priority' and s1['no'] == 'Cancel' and s2 and s2['ok'] == 'Make 2 changes', [s1, s2])
    await p.evaluate("document.querySelector('#fvPanel .fv-ok').click()"); await p.wait_for_timeout(800)
    d = await p.evaluate("[PATIENTS.find(x=>x.name==='Bella').room, PATIENTS.find(x=>x.name==='Rocky').prio]")
    ok('…and pressing it does both', d == ['Room 6', 1], d)

    # Live Activities: the critical banner
    b = await p.evaluate("(()=>{ const i=document.getElementById('critIsland'); if(!i||!i.classList.contains('on')) return null; return {acts:[...i.querySelectorAll('button')].map(x=>x.className.split(' ')[0]), open:(i.querySelector('.ci-main')||{getAttribute:()=>null}).getAttribute('aria-label')}; })()")
    ok('Live Activities · the critical banner (Flow’s nearest thing) shows one patient, opens it, and has one action (Take case)', b and b['acts'] == ['ci-main', 'ci-take'] and (b['open'] or '').startswith('Open '), b)
    ok('…no page errors', not newerr(e), newerr(e))
    await c.close()

    # iPhone: the card stays on screen, below the banner
    c, p, e = await ctx(br, 390, 844)
    await p.tap('#globalSearch'); await p.keyboard.type('make Rocky critical'); await p.wait_for_timeout(400); await p.keyboard.press('Enter'); await p.wait_for_timeout(1000)
    ph = await p.evaluate("(()=>{ const a=document.getElementById('fvPanel').getBoundingClientRect(), i=document.getElementById('critIsland'), b=i.getBoundingClientRect(); const t=document.querySelector('#fvPanel .fv-t b'); return {l:Math.round(a.left), r:Math.round(a.right), w:innerWidth, title:t.textContent, cut:t.scrollWidth>t.clientWidth+1, ok:(document.querySelector('#fvPanel .fv-ok')||{}).textContent, under:i.classList.contains('on')&&!(a.bottom<=b.top||a.top>=b.bottom)}; })()")
    ok('iPhone · Talk to Flow’s card is whole on the screen (it ran off the left edge) and below the critical banner', ph['l'] >= 8 and ph['r'] <= ph['w'] - 8 and ph['ok'] == 'Set priority' and not ph['under'], ph)
    ok('…and it shows the whole “Priority · Rocky Hale” (the name was cut to “Pri…”)', ph['title'] == 'Priority · Rocky Hale' and not ph['cut'], ph)
    ok('…no page errors (iPhone)', not newerr(e), newerr(e))
    await c.close()
