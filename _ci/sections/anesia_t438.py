"""Anesia — the n438 build's own checks (Nov 25 2026): HIG Offering help, Onboarding, Playing audio.
Tooltips named the control instead of saying what it does ("Event (⌥E)", "Totals and history", "Share link"), showed Mac
keys (⌥, ⌘) on Windows, where the shortcut list says Alt and Ctrl, and the keyboard tip did too; the patient's ⓘ had none."""
from core import *
from helpers import *

TIPS = """(()=>{const g=s=>{const e=document.querySelector(s);return e?[e.getAttribute('aria-label')||e.innerText.trim(),e.getAttribute('title')]:null};
  return {tools:[...document.querySelectorAll('.an-tools [data-act]')].map(b=>[b.getAttribute('aria-label').split(',')[0],b.getAttribute('title')]),
    exp:g('#anExpand'), share:g('#anShare'), insp:g('#anInsp'), emer:g('#anEmer'), pat:g('#anPatient'), tip:(document.querySelector('.an-tips')||{}).innerText||''}})()"""
MAC = "Object.defineProperty(Navigator.prototype,'platform',{get:()=>'MacIntel'});try{Object.defineProperty(Navigator.prototype,'userAgentData',{get:()=>({platform:'macOS'})})}catch(e){}"
KB = "try{localStorage.setItem('anesia:v1:tip:value','1');localStorage.setItem('anesia:v1:tip:kbclicks','3')}catch(e){}"
VERB = ('Chart ', 'Start ', 'Set ', 'Show ', 'Hide ', 'Fill ', 'Return ', 'Copy ', 'Share ', 'See ', 'Print ', 'Change ', 'Take ', 'Make ', 'Close', 'Dismiss')


def says(name, title):
    t = (title or '').lower(); n = (name or '').lower()
    return bool(title) and title.startswith(VERB) and len(title) <= 75 and not t.startswith(n)


@section(id='a438', title='n438 · Anesia · Offering help, Onboarding, Playing audio: tooltips say what a control does, in this computer’s keys; the keyboard tip too; ⓘ has one',
         apps=['anesia'], topics=['help', 'tooltips', 'keyboard'], engines=('chromium', 'webkit'))
async def s_a438(br):
    errs = []
    ctx, pg, e = await new_page(br); await pg.add_init_script(KB)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.wait_for_timeout(400)
    nw = await pg.evaluate("document.querySelector('#anNew').getAttribute('title')")
    await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(800)
    s = await pg.evaluate(TIPS)
    bad = [x for x in s['tools'] if not says(*x)]
    ok('Offering help · every charting tool’s tooltip starts with a verb, says what it does in under 75 characters, and doesn’t repeat its name (“Event (⌥E)”, “Gas and oxygen”)',
       not bad and len(s['tools']) == 7, bad or s['tools'])
    ok('…on Windows (and here) the keys are Alt+, as in the shortcut list, not ⌥', all(x[1].endswith(')') and '(Alt+' in x[1] and '⌥' not in x[1] for x in s['tools']) and '(Alt+N)' in nw and '⌥' not in nw, [s['tools'][0], nw])
    ok('…the header’s icons say what they do: Expand, Share (who the link opens for), Totals, Emergency; and the patient’s ⓘ has one (it had none)',
       all(says(*s[k]) for k in ('exp', 'share', 'insp', 'emer', 'pat')) and 'signed-in staff' in s['share'][1], [s[k] for k in ('exp', 'share', 'insp', 'emer', 'pat')])
    ok('…the keyboard tip shows this computer’s keys (“Press Alt+V for vitals”), not ⌥', s['tip'].startswith('Press Alt+V for vitals') and '⌥' not in s['tip'], s['tip'])
    await pg.click('#anExpand'); await pg.wait_for_timeout(500); await pg.click('#anInsp'); await pg.wait_for_timeout(500); s2 = await pg.evaluate(TIPS)
    ok('…and they follow the state: expanded, it says “Return to the usual view (Alt+F or Esc)”; with Totals open, “Hide totals…”',
       s2['exp'][1] == 'Return to the usual view (Alt+F or Esc)' and s2['insp'][1].startswith('Hide totals'), [s2['exp'], s2['insp']])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    await pg.click('#anEmer'); await pg.wait_for_timeout(600)
    x = await pg.evaluate("document.querySelector('#anSheet .an-x')?.getAttribute('title')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    ok('…a view-only sheet’s ✕ names its key (“Close (Esc)”)', x == 'Close (Esc)', x)
    errs += list(e); await ctx.close()
    # on a Mac or iPad with a keyboard, the same tooltips and tip show ⌥
    ctx, pg, e = await new_page(br); await pg.add_init_script(MAC); await pg.add_init_script(KB)
    await pg.goto(URL + '#r=an_train1'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(900)
    m = await pg.evaluate(TIPS)
    ok('…on a Mac they say ⌥ (“(⌥V)”), and so does the tip', all(x[1].endswith(')') and '(⌥' in x[1] for x in m['tools']) and m['tip'].startswith('Press ⌥V for vitals'), [m['tools'][0], m['tip']])
    errs += list(e); await ctx.close()
    ok('no page errors', not errs, errs)
