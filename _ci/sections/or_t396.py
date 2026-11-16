"""Pravix OR — the n396 build's own checks (Nov 16 2026): HIG Privacy, SF Symbols.
Privacy: every text field OR draws says autocomplete="off", so a shared hospital computer's browser doesn't keep what was
typed about one patient and offer it on the next (they had no setting); signing the operative record never falls back to the
surgeon's name when OR can't tell who is signed in (it signed "Dr. Galano" with no account); OR asks for no device
permission and keeps nothing about patients in the browser's storage. SF Symbols: a state and its opposite are no longer
one picture (Blood not confirmed / Blood products, Implant unavailable / Implants, Operative note not written / signed):
the "not" state is the slash variant, and Drug reaction is a capsule, no longer the slashed drop; Arrived goes in through
the door and Out of room goes out (they were the other way round); no stage symbol has a badge too small to read."""
import core
from core import ok, section
from or_t390 import open_or

FIELDS = r"""(()=>[...document.querySelectorAll('input,textarea')].filter(e=>e.getClientRects().length&&!e.disabled&&!['checkbox','radio','hidden'].includes(e.type)).map(e=>[e.id||e.dataset.rec||e.dataset.recField||e.dataset.imp||e.placeholder||e.tagName,e.getAttribute('autocomplete')]))()"""
DOOR = r"""(k=>{const d=document.createElement('div');d.style.cssText='position:absolute;left:0;top:0;width:24px;height:24px';d.innerHTML=icoSvg(k);document.body.appendChild(d);
 const s=d.querySelector('svg');const door=s.querySelector('path').getBBox();const head=s.querySelector('polyline').getBBox();const shaft=s.querySelectorAll('path')[1].getBBox();d.remove();
 return {doorL:door.x,doorR:door.x+door.width,headR:head.x+head.width,shaftL:shaft.x}})"""


@section(id='t396', title='n396 · OR · Privacy, SF Symbols: no form history for patient fields, no signing in someone else’s name, no permissions or patient storage; slash variants for the “not” states, a capsule for Drug reaction, Arrived goes in and Out of room goes out, no unreadable badge',
         apps=['or'], topics=['privacy', 'icons', 'behaviour'], engines=('chromium', 'webkit'))
async def s_t396(br):
    c, p, e = await open_or(br)
    await p.evaluate("""(()=>{window.__perm=[];const w=(o,k,n)=>{try{const f=o&&o[k];if(typeof f!=='function')return;o[k]=function(){window.__perm.push(n);return f.apply(this,arguments)}}catch(x){}};
      if(window.Notification)w(Notification,'requestPermission','notifications');if(navigator.mediaDevices)w(navigator.mediaDevices,'getUserMedia','camera');
      if(navigator.geolocation)w(navigator.geolocation,'getCurrentPosition','location');if(navigator.clipboard)w(navigator.clipboard,'readText','clipboard')})()""")
    seen = []
    await p.click('#switcher [data-view="cases"]'); await p.wait_for_timeout(500); seen += await p.evaluate(FIELDS)
    await p.click('#switcher [data-view="board"]'); await p.wait_for_timeout(300)
    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(800)
    for tb in ('recovery', 'record', 'procedure'):
        await p.click(f'#caseTabs [data-tab="{tb}"]'); await p.wait_for_timeout(350); seen += await p.evaluate(FIELDS)
    await p.click('#caseBody .or-btn:has-text("Add event")'); await p.wait_for_timeout(500); seen += await p.evaluate(FIELDS)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.click('#caseBody .or-btn:has-text("Add specimen")'); await p.wait_for_timeout(500); seen += await p.evaluate(FIELDS)
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    ok('Privacy · every text field OR draws says autocomplete="off" (the record, recovery, events, specimens, Cases search had none, so the browser could keep them)',
       len(seen) >= 12 and all(a == 'off' for _, a in seen), [x for x in seen if x[1] != 'off'][:6] or len(seen))

    await p.click('#caseBack'); await p.wait_for_timeout(300)
    await p.evaluate("openCase('or390c1')"); await p.wait_for_timeout(700)
    await p.click('#caseTabs [data-tab="record"]'); await p.wait_for_timeout(300)
    await p.click('[data-act="rec-review"]'); await p.wait_for_timeout(300)
    await p.evaluate("Object.defineProperty(firebase.auth(),'currentUser',{get:()=>null,configurable:true})")
    await p.click('[data-act="rec-sign"]'); await p.wait_for_timeout(400)
    r = await p.evaluate("(()=>{const c=caseById('or390c1');return [c.record.status,c.record.signedBy||null,document.getElementById('toastMsg').textContent]})()")
    ok('Privacy · when OR can’t tell who is signed in, the operative record isn’t signed — it said the surgeon signed it (“Dr. Galano”, no account)',
       r[0] == 'review' and r[1] is None and 'signed in' in r[2], r)
    await c.close()

    c, p, e = await open_or(br)
    await p.evaluate("openCase('or390c1')"); await p.wait_for_timeout(700)
    await p.click('#caseTabs [data-tab="record"]'); await p.wait_for_timeout(300)
    await p.click('[data-act="rec-review"]'); await p.wait_for_timeout(300); await p.click('[data-act="rec-sign"]'); await p.wait_for_timeout(400)
    r = await p.evaluate("(()=>{const c=caseById('or390c1');return [c.record.status,c.record.signedBy,c.record.signedUid]})()")
    ok('…signed in, it is signed by that person and their account', r == ['signed', 'Resident A', 'u1'], r)
    st = await p.evaluate("(()=>{const all=[];for(const S of [localStorage,sessionStorage])for(let i=0;i<S.length;i++){const k=S.key(i);all.push(k+'='+S.getItem(k))}return all.join('\\n')})()")
    perm = await p.evaluate('window.__perm||[]')
    ok('Privacy · OR asks for no device permission and keeps no patient in the browser’s storage live (only appearance and the glass setting)',
       perm == [] and not any(n in st for n in ('Biscuit', 'Maple', 'Pepper', 'Juniper', 'Otis', 'Willow', 'pravix:or:proto')), (perm, st[:200]))

    pics = await p.evaluate("Object.entries(FLAG_DEFS).map(([id,d])=>[id,ICON_SVG[d.icon]||''])")
    by = dict(pics)
    distinct = len(set(v for _, v in pics)) == len(pics)
    SL = '<line x1="4.5" y1="20" x2="19.5" y2="4"/>'
    pairs = [('bloodX', 'blood'), ('implantX', 'implant'), ('noteX', 'note')]
    ok('SF Symbols · a state and its opposite are never one picture: Blood not confirmed, Implant unavailable and Operative note not written are the slash variants of Blood products, Implants and Operative note signed (each pair was the same symbol in a different colour)',
       distinct and all(by[a] != by[b] and SL in by[a] and SL not in by[b] and by[a].replace(SL, '') == by[b] for a, b in pairs), [(a, by[a] == by[b]) for a, b in pairs])
    ok('…and Drug reaction is a capsule, no longer the slashed drop that now means Blood not confirmed', '<rect' in by['allergy'] and 'M12 3.8' not in by['allergy'], by['allergy'][:80])
    a = await p.evaluate(DOOR, 'arrived'); o = await p.evaluate(DOOR, 'out_of_room')
    ok('SF Symbols · Arrived goes in through the door and Out of room goes out (Arrived drew someone leaving, Out of room someone entering)',
       a['shaftL'] < a['doorL'] and a['headR'] < a['doorR'] and o['headR'] > o['doorR'] + 1, (a, o))
    small = await p.evaluate("[...document.querySelectorAll('.or-milestone svg circle')].filter(c=>getComputedStyle(c).fill==='none'&&+c.getAttribute('r')<3).map(c=>c.closest('.or-milestone').getAttribute('aria-label'))")
    ok('…and no stage symbol carries a badge too small to read (Pre-op’s check badge was a dot at Board size)', small == [], small[:4])
    ok('…no page errors', not e, e[:3])
    await c.close()
