"""Pravix OR — the n404 build's own checks (Nov 17 2026): HIG Charts, Image views, Text views.
Charts: the Board's progress bars were hidden from VoiceOver with no value; now each says what it shows ("12% of the
expected time", "Turnover 68% done"), and a case past its expected finish says by how much, in words and in amber, instead
of a full bar. The KPI rails, which repeat the figure above them, are read once. Text views: a signed operative record was
disabled (dimmed, out of the Tab order, unselectable); now it's read-only at full strength, reachable and copyable, and
stays read-only when a past case's lock lifts. The record's long fields grow with what's written. Image views: the footer
logo is drawn at three times the size it's shown, not thirteen."""
import re
import core
from core import ok, section
import or_t390 as T
import or_t399 as S

PROG = """[...document.querySelectorAll('#view-board .or-prog')].map(n=>{const t=n.querySelector('.or-track');
  return {over:n.classList.contains('is-over'), role:t.getAttribute('role'), hidden:t.getAttribute('aria-hidden'), label:t.getAttribute('aria-label'),
          text:n.querySelector('.or-prog-l').innerText.replace(/\\s+/g,' '), col:getComputedStyle(t.firstElementChild).backgroundColor}})"""
LATE = "(()=>{const d=document.createElement('i');d.style.color='var(--or-late)';document.body.appendChild(d);const c=getComputedStyle(d).color;d.remove();return c})()"


@section(id='t404', title='n404 · OR · Charts, Image views, Text views: the Board’s progress bars say what they show and a case past its expected finish says by how much; a signed record is read-only, selectable and full strength; record fields grow; the footer logo is drawn at its size',
         apps=['or'], topics=['charts', 'text', 'images'], engines=('chromium', 'webkit'))
async def s_t404(br):
    c, p, e = await T.open_or(br)
    pr = await p.evaluate(PROG)
    ok('Charts · the Board’s progress bars say what they show to VoiceOver (they were hidden, with no value): “12% of the expected time”, “Turnover 68% done”',
       len(pr) == 2 and [x['role'] for x in pr] == ['img', 'img'] and [x['hidden'] for x in pr] == [None, None]
       and re.fullmatch(r'1[1-4]% of the expected time', pr[0]['label']) and re.fullmatch(r'Turnover (6[6-9]|7[0-2])% done', pr[1]['label']) and not pr[0]['over'], pr)   # the clock runs on a busy machine

    await p.evaluate("switchView('analytics')"); await p.wait_for_timeout(500)
    an = await p.evaluate("""(()=>{const r=[...document.querySelectorAll('#anKpis .command-kpi__rail')];const b=[...document.querySelectorAll('#anGrid .or-bar')];
      return {rails:r.length, hidden:r.every(x=>x.getAttribute('aria-hidden')==='true'), bars:b.length, labelled:b.every(x=>x.getAttribute('role')==='img'&&x.getAttribute('aria-label'))}})()""")
    ok('…the KPI rails, which repeat the figure written above them, are hidden so the figure is read once; Analytics’ bars keep theirs',
       an['rails'] >= 1 and an['hidden'] and an['labelled'], an)
    await p.evaluate("switchView('board')"); await p.wait_for_timeout(300)

    logo = await p.evaluate("(()=>{const i=document.querySelector('.vb-left img');const r=i.getBoundingClientRect();return {nw:i.naturalWidth, nh:i.naturalHeight, h:Math.round(r.height), w:Math.round(r.width), len:i.src.length, alt:i.alt}})()")
    ok('Image views · the footer logo is drawn at three times the size it’s shown (86 × 66 for 29 × 22; it was 302 × 232, 63 KB), and keeps its name',
       logo['nw'] == 86 and logo['nh'] == 66 and logo['h'] == 22 and logo['w'] == 29 and logo['len'] < 20000 and logo['alt'] == 'VCA', logo)

    await p.evaluate("openCase('or390c2')"); await p.wait_for_timeout(700)
    await p.click('#caseTabs [data-tab="record"]'); await p.wait_for_timeout(300)
    ta = '#caseBody textarea[data-rec-field]'
    h0 = await p.evaluate(f"document.querySelector('{ta}').offsetHeight")
    await p.click(ta); await p.keyboard.type('Line one\nLine two\nLine three\nLine four\nLine five\nLine six\nLine seven')
    await p.wait_for_timeout(300)
    h1 = await p.evaluate(f"[document.querySelector('{ta}').offsetHeight, document.querySelector('{ta}').scrollHeight, document.querySelector('{ta}').clientHeight, innerHeight]")
    ok('Text views · the record’s long fields grow with what’s written (they stayed two lines tall and scrolled), up to half the window',
       h1[0] > h0 + 60 and h1[1] <= h1[2] + 2 and h1[0] <= h1[3] * 0.5 + 1, (h0, h1))
    await p.evaluate(f"(()=>{{const t=document.querySelector('{ta}');t.value='';t.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
    await c.close()

    c, p, e = await T.open_or(br)
    await p.evaluate("openCase('or390c1')"); await p.wait_for_timeout(700)
    await p.click('#caseTabs [data-tab="record"]'); await p.wait_for_timeout(300)
    await p.click('[data-act="rec-review"]'); await p.wait_for_timeout(300); await p.click('[data-act="rec-sign"]'); await p.wait_for_timeout(500)
    sg = await p.evaluate("""(()=>{const f=[...document.querySelectorAll('#caseBody [data-rec-field]')];const t=f.find(x=>x.tagName==='TEXTAREA'&&x.value)||f.find(x=>x.value)||f[0];
      const d=document.createElement('i');d.style.color='var(--ink-900)';document.body.appendChild(d);const ink=getComputedStyle(d).color;d.remove();
      return {status:caseById('or390c1').record.status, n:f.length, disabled:f.filter(x=>x.disabled).length, ro:f.every(x=>x.readOnly&&x.getAttribute('aria-readonly')==='true'),
              tab:f.every(x=>x.tabIndex>=0), op:getComputedStyle(t).opacity, col:getComputedStyle(t).color, ink, sel:getComputedStyle(t).userSelect||getComputedStyle(t).webkitUserSelect, id:t.id||(t.id='t404s'), val:t.value}})()""")
    await p.focus('#' + sg['id'])
    sl = await p.evaluate(f"(()=>{{const t=document.getElementById('{sg['id']}');t.select();return [document.activeElement===t, t.selectionEnd-t.selectionStart]}})()")
    await p.keyboard.type('x'); await p.wait_for_timeout(200)
    after = await p.evaluate(f"[document.getElementById('{sg['id']}').value, caseById('or390c1').record.status]")
    ok('Text views · a signed operative record is read-only, not disabled: full strength, reachable with Tab and its text selectable to copy (it was dimmed, skipped and unselectable)',
       sg['status'] == 'signed' and sg['n'] >= 4 and sg['disabled'] == 0 and sg['ro'] and sg['tab'] and sg['op'] == '1' and sg['col'] == sg['ink']
       and sg['sel'] != 'none' and sl[0] and sl[1] == len(sg['val']) and after == [sg['val'], 'signed'], (sg, sl, after))
    await p.evaluate("(()=>{const b=document.getElementById('caseBody');b.querySelectorAll('[data-rec-field]').forEach(x=>x.setAttribute('data-pvx-ro',''));pvxLock(b,caseById('or390c1'))})()")
    ro = await p.evaluate("[...document.querySelectorAll('#caseBody [data-rec-field]')].every(x=>x.readOnly)")
    ok('…and stays read-only when a past case’s lock lifts around it', ro, ro)
    ok('no page errors', not e, e)
    await c.close()

    c, p, e = await S.open_shift(br)
    await p.evaluate("window.__pvxShift=150*60*1000; render()"); await p.wait_for_timeout(500)
    pr = await p.evaluate(PROG); late = await p.evaluate(LATE)
    mp = [x for x in pr if 'Incision' in x['text']]
    ok('Charts · a case past its expected finish says by how much, in words and in amber (“18 min over · expected 1:12 PM”), instead of a full bar',
       len(mp) == 1 and mp[0]['over'] and mp[0]['label'] == 'Past the expected finish by 18 min' and '18 min over · expected 1:12' in mp[0]['text'] and mp[0]['col'] == late, (mp, late))
    ok('no page errors (clock moved on)', not e, e)
    await c.close()
