"""Treatment Sheets — the n269 build's own checks: Treatment Sheets against HIG Lockups, Outline views, Split views.
Written with that build; they run in Chromium and WebKit (Safari's engine)."""
from tsh import *
from core import ok, section, until, PORT

ST = """(()=>{const t=document.querySelector('#ctab-sheet .brief-toggle'),s=document.getElementById('clinSidebar'),x=document.querySelector('#ctab-sheet .ts-expand-btn');
  const vis=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).display!=='none');
  return {full:document.body.classList.contains('ts-expand'),tog:vis(t),exp:t&&t.getAttribute('aria-expanded'),ctl:t&&t.getAttribute('aria-controls'),tt:t&&t.title,
    open:!!(s&&s.classList.contains('open')),side:vis(s),xk:x&&x.getAttribute('aria-keyshortcuts'),xt:x&&x.title,said:(window.__said||[]).slice(-1)[0]||null}})()"""


@section(id='t269', title='n269 · Treatment Sheets against HIG Lockups, Outline views, Split views',
         apps=['treatment'], topics=['keyboard', 'accessibility', 'layout'], engines=('chromium', 'webkit'))
async def s_t269(br):
    ctx, pg, e = await ts(br, PORT, view='sheet', init="window.__said=[];document.addEventListener('DOMContentLoaded',()=>{const f=window.pvxSay;window.pvxSay=function(t){window.__said.push(t);return f&&f.apply(this,arguments)}})")
    await pg.evaluate("window.pvxSay=(f=>function(t){window.__said.push(t);return f&&f.apply(this,arguments)})(window.pvxSay)")
    s0 = await pg.evaluate(ST)
    await pg.mouse.click(5, 880); await pg.keyboard.press('Alt+i'); await pg.wait_for_timeout(300); s1 = await pg.evaluate(ST)
    ok('Split views: on a Mac the patient info pane sits beside the sheet, and ⌥I leaves it there',
       s0['side'] and not s0['full'] and not s0['tog'] and s1['side'] and not s1['open'], [s0, s1])
    await pg.keyboard.press('Alt+e'); await pg.wait_for_timeout(500); s2 = await pg.evaluate(ST)
    ok('Split views: ⌥E turns full view on (the panes hide) and says so; Patient info then says it’s hidden, what it shows, and its key',
       s2['full'] and s2['tog'] and s2['exp'] == 'false' and s2['ctl'] == 'clinSidebar' and s2['tt'].startswith('Show patient info · ') and s2['tt'].endswith('I') and s2['said'] == 'Full view', s2)
    await pg.keyboard.press('Alt+i'); await pg.wait_for_timeout(500); s3 = await pg.evaluate(ST)
    await pg.keyboard.press('Alt+i'); await pg.wait_for_timeout(500); s4 = await pg.evaluate(ST)
    f4 = await pg.evaluate("(document.activeElement||{}).className+''")
    ok('…⌥I shows the patient info and says it’s expanded; ⌥I again hides it and focus goes back to its button (it had no state for VoiceOver and no key)',
       s3['open'] and s3['exp'] == 'true' and s3['tt'].startswith('Hide patient info') and not s4['open'] and s4['exp'] == 'false' and 'brief-toggle' in f4, [s3, s4, f4])
    await pg.keyboard.press('Alt+e'); await pg.wait_for_timeout(500); s5 = await pg.evaluate(ST)
    ok('…and ⌥E turns full view off; the Expand button carries its key in its tooltip and for VoiceOver',
       not s5['full'] and s5['side'] and s5['xk'] == 'Alt+E' and s5['xt'].endswith('E') and s5['said'] == 'Full view off', s5)
    await pg.click('#tsSearch'); await pg.keyboard.press('Alt+e'); await pg.wait_for_timeout(400)
    ok('…the keys never act while typing', not (await pg.evaluate(ST))['full'], '')
    await pg.mouse.click(5, 880); await pg.keyboard.press('Shift+?'); await pg.wait_for_timeout(400)
    ks = await pg.evaluate("(document.querySelector('.pvx-ks')||{innerText:''}).innerText")
    ok('…and both are in Keyboard shortcuts', 'Full view on or off' in ks and 'Show or hide patient info' in ks, ks[:200])
    await pg.keyboard.press('Escape')
    ok('no page errors (Mac)', not e, e[:2]); await ctx.close()

    # iPad portrait: the pane is a drawer from the start; the button says its state
    ctx, pg, e = await ts(br, PORT, vp=(1024, 1366), touch=True, view='sheet')
    p0 = await pg.evaluate(ST); await pg.click('#ctab-sheet .brief-toggle'); await pg.wait_for_timeout(500); p1 = await pg.evaluate(ST)
    ok('Split views: on iPad Patient info says whether it’s showing, before and after it’s chosen', p0['tog'] and p0['exp'] == 'false' and p1['open'] and p1['exp'] == 'true', [p0, p1])
    ok('no page errors (iPad)', not e, e[:2]); await ctx.close()
