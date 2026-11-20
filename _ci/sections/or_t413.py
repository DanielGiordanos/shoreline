"""Pravix OR — the n413 build's own checks (Nov 19 2026): HIG Path controls, Search fields.
OR's search was 170 pt wide at 1024 pt and 210 at 1180 with room to spare beside it, and its placeholder was cut
mid-word ("Search cas"). It takes 310 pt from 1024 pt and shows the longest whole phrase that fits. Cases' own search
gets Clear and Esc and says Search on the key; neither field autocorrects; the L.U.N.A. button names the same scope."""
import core
from core import ok, section
import or_t390 as T

PH = ['Search cases, patients, rooms…', 'Search cases and patients', 'Search cases', 'Search']
FIT = """()=>{const s=document.getElementById('globalSearch'), st=getComputedStyle(s), c=document.createElement('canvas').getContext('2d');
  c.font=st.fontStyle+' '+st.fontWeight+' '+st.fontSize+' '+st.fontFamily; const room=s.clientWidth-parseFloat(st.paddingLeft)-parseFloat(st.paddingRight);
  const sub=document.getElementById('subnavOR');
  return {ph:s.placeholder, fits:c.measureText(s.placeholder).width<=room, al:s.getAttribute('aria-label'), w:Math.round(document.querySelector('#subnavOR .search').getBoundingClientRect().width),
          page:document.documentElement.scrollWidth<=innerWidth, h:Math.round(sub.getBoundingClientRect().height),
          names:['autocorrect','autocapitalize','spellcheck'].map(a=>s.getAttribute(a))}}"""


@section(id='t413', title='n413 · OR · Path controls, Search fields: the search takes the bar’s room and its placeholder is a whole phrase; Cases’ search has Clear and Esc; no autocorrect',
         apps=['or'], topics=['search'], engines=('chromium', 'webkit'))
async def s_t413(br):
    res, errs = {}, []
    for vp, touch in [((1440, 900), False), ((1024, 768), False), ((1180, 820), True), ((390, 844), True)]:
        c, p, e = await T.open_or(br, vp=vp, touch=touch)
        res[vp[0]] = await p.evaluate(FIT)
        if vp[0] == 1440:
            orb = await p.evaluate("document.getElementById('searchLuna').title")
            await p.evaluate("switchView('cases')"); await p.wait_for_timeout(400)
            rows0 = await p.evaluate("document.querySelectorAll('#casesBody tr[data-id]').length")
            cs = await p.evaluate("(()=>{const i=document.getElementById('casesSearch'), b=document.getElementById('casesSearchClear');return [i.getAttribute('enterkeyhint'), ['autocorrect','autocapitalize','spellcheck'].map(a=>i.getAttribute(a)), !!b&&b.hidden]})()")
            await p.click('#casesSearch'); await p.keyboard.type('zzq'); await p.wait_for_timeout(300)
            typed = await p.evaluate("[document.querySelectorAll('#casesBody tr[data-id]').length, (()=>{const b=document.getElementById('casesSearchClear');return !!b&&!b.hidden&&b.getClientRects().length>0&&b.getAttribute('aria-label')})()]")
            if await p.evaluate("!!document.getElementById('casesSearchClear')"): await p.click('#casesSearchClear')   # on n412 there is none: the check fails, not the section
            else: await p.evaluate("(()=>{const i=document.getElementById('casesSearch'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true}))})()")
            await p.wait_for_timeout(300)
            cleared = await p.evaluate("[document.getElementById('casesSearch').value, document.activeElement.id, document.querySelectorAll('#casesBody tr[data-id]').length, (document.getElementById('casesSearchClear')||{}).hidden]")
            await p.keyboard.type('zzq'); await p.wait_for_timeout(250)
            await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
            esc = await p.evaluate("[document.getElementById('casesSearch').value, document.querySelectorAll('#casesBody tr[data-id]').length]")
        errs += list(e)
        await c.close()
    a, b, d, f = res[1440], res[1024], res[1180], res[390]
    ok('Search fields · the field takes the bar’s room: 310 pt at 1024 and 1180 pt as at 1440 (it was 170 and 210, with room to spare), and the bar still fits without a second row',
       a['w'] == b['w'] == d['w'] == 310 and all(r['page'] for r in res.values()) and b['h'] == a['h'] == d['h'], {k: (v['w'], v['page'], v['h']) for k, v in res.items()})
    ok('…its placeholder is the longest whole phrase that fits (it read “Search cas” and “Search cases, patie”): the full scope on a Mac, a shorter whole phrase on an iPad or iPhone, and VoiceOver always hears the whole scope',
       all(r['ph'] in PH and r['fits'] for r in res.values()) and a['ph'] == PH[0] and b['ph'] == PH[0] and f['ph'] in PH[1:]
       and all(r['al'] == 'Search cases, patients, surgeons, procedures and rooms' for r in res.values()), {k: (v['ph'], v['fits']) for k, v in res.items()})
    ok('…neither field autocorrects, capitalizes or spell-checks (they take names), and the L.U.N.A. button names the field’s scope (it said “patients, staff, procedures and rooms”)',
       all(r['names'] == ['off', 'off', 'false'] for r in res.values()) and cs[1] == ['off', 'off', 'false'] and orb.startswith('Search cases, patients, surgeons, procedures and rooms'), (a['names'], cs, orb))
    ok('…Cases’ own search says Search on the key and shows Clear once something is typed (it had none); Clear empties it, keeps the cursor there and brings the list back',
       cs[0] == 'search' and cs[2] is True and typed == [0, 'Clear search'] and cleared == ['', 'casesSearch', rows0, True] and rows0 > 0, (cs, typed, cleared, rows0))
    ok('…and Esc clears what’s typed (it did nothing)', esc == ['', rows0], esc)
    ok('no page errors', not errs, errs)
