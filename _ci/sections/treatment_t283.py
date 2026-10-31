"""Treatment Sheets — the n283 build's own checks: HIG Menus, Ornaments and Pop-up buttons.
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

AUD = "(window.__fs['sheets/sh_train1'].audit||[]).length"


@section(id='t283', title='n283 · Treatment Sheets against HIG Menus, Ornaments and Pop-up buttons',
         apps=['treatment'], topics=['menus', 'entering-data', 'accessibility'], engines=('chromium', 'webkit'))
async def s_t283(br):
    # Tab options: commands only; Keyboard shortcuts opens the sheet, which has every tab shortcut
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.click('[aria-label="Tab options"]'); await pg.wait_for_timeout(400)
    m = await pg.evaluate("[...document.querySelectorAll('.pt-pop.show .pt-mi')].map(b=>[b.innerText.replace(/\\n/g,' / '),b.getAttribute('role'),b.getAttribute('aria-checked')])")
    ok('Tab options: no rows that do nothing when chosen (Go to tab 1–9, Next / previous tab, Move a tab); one Keyboard shortcuts command instead',
       not any('Go to tab' in x[0] or 'Next / previous' in x[0] or 'Move a tab' in x[0] for x in m) and any(x[0].startswith('Keyboard shortcuts') for x in m), m)
    ok('…and Open my patients automatically is heard as a checked item (it was a plain menu item with a checkmark)',
       m[0][0].startswith('Open my patients') and m[0][1] == 'menuitemcheckbox' and m[0][2] in ('true', 'false'), m[0])
    await pg.locator('.pt-pop.show .pt-mi:has-text("Keyboard shortcuts")').click(); await pg.wait_for_timeout(500)
    ks = await pg.evaluate("(()=>{const d=document.querySelector('.pvx-ks');return d?d.innerText:''})()")
    ok('…which opens the Keyboard shortcuts sheet, now listing Next or previous tab and Move the tab left or right',
       'Keyboard shortcuts' in ks and 'Next or previous tab' in ks and 'Move the tab left or right' in ks, ks[:300])
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await ctx.close()
    ctx, pg, e = await ts(br, PORT, view='sheet', vp=(1180, 820), touch=True)
    await pg.click('[aria-label="Tab options"]'); await pg.wait_for_timeout(400)
    t = await pg.evaluate("[...document.querySelectorAll('.pt-pop.show .pt-mi')].map(b=>b.innerText)")
    ok('On a touch screen without a keyboard, Tab options has no Keyboard shortcuts item', t and not any('Keyboard' in x for x in t), t)
    await ctx.close()

    # Tech: the current tech is listed and checked; choosing it again changes nothing; typing jumps
    ctx, pg, e = await ts(br, PORT, view='sheet')
    a0 = await pg.evaluate(AUD)
    await pg.locator('button:has-text("TECH")').first.click(); await pg.wait_for_timeout(400)
    tm = await pg.evaluate("""(()=>{const m=document.querySelector('.ts-tech-menu.show');const b=[...m.querySelectorAll('button')];
      const on=b.filter(x=>x.getAttribute('aria-checked')==='true');
      return {n:b.length,first:b[0].innerText.trim(),sep:!!m.querySelector('[role=separator]'),on:on.map(x=>x.querySelector('b').innerText.trim()),
        role:b[1].getAttribute('role'),ck:on.length?getComputedStyle(on[0],'::before').content:''}})()""")
    ok('Tech: the current technician is in the menu and checked, after Unassigned and a separator (they were missing when not on the roster)',
       tm['first'] == 'Unassigned' and tm['sep'] and tm['on'] == ['Daniel Giordano'] and tm['role'] == 'menuitemradio' and tm['ck'] != 'none', tm)
    await pg.keyboard.type('ma'); await pg.wait_for_timeout(150)
    f = await pg.evaluate("document.activeElement.innerText.trim()")
    ok('…typing “ma” moves to the first name starting with it', f.startswith('Ma'), f)
    await pg.locator('.ts-tech-menu.show button:has-text("Daniel Giordano")').click(); await pg.wait_for_timeout(600)
    a1 = await pg.evaluate(AUD)
    ok('…choosing the current tech again writes nothing (it logged “Tech assigned” again)', a1 == a0, [a0, a1])

    # Location: No location first, the current one checked
    await pg.locator('button:has-text("LOCATION")').first.click(); await pg.wait_for_timeout(400)
    lm = await pg.evaluate("(()=>{const m=document.querySelector('.ts-loc-menu.show');const b=[...m.querySelectorAll('button')];return [b.map(x=>x.innerText.trim()),b.map(x=>x.getAttribute('aria-checked')),!!m.querySelector('[role=separator]')]})()")
    ok('Location: “No location” comes first, then a separator and the locations, with the current one checked (“Clear location” sat among them)',
       lm[0][0] == 'No location' and 'Clear location' not in lm[0] and lm[2] and lm[1][lm[0].index('ICU')] == 'true', lm)
    await pg.locator('.ts-loc-menu.show button:has-text("ICU")').click(); await pg.wait_for_timeout(600)
    a2 = await pg.evaluate(AUD)
    ok('…choosing the current location again writes nothing', a2 == a1, [a1, a2])
    await ctx.close()

    # Add estimate: not yet approved until someone says so
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.locator('button:has-text("Add estimate")').first.click(); await pg.wait_for_timeout(500)
    v = await pg.evaluate("(()=>{const s=document.getElementById('esBy');return [s.value,[...s.options].map(o=>o.text)]})()")
    ok('Add estimate › Approved starts on “Not yet approved”, listed first (it started on “Client — in person”)', v[0] == 'Not yet approved' and v[1][0] == 'Not yet approved', v)
    await pg.fill('#esLow', '1200'); await pg.fill('#esHigh', '1800')
    await pg.locator('button:has-text("Save estimate")').click(); await pg.wait_for_timeout(700)
    es = await pg.evaluate("(window.__fs['sheets/sh_train1'].estimate||{})")
    ok('…so saving only the amounts records no client approval', es.get('approved_by') == 'Not yet approved' and not es.get('approved_at') and es.get('low') == 1200, es)
    await ctx.close()

    # Display: a menu that says so; arrows move through it
    ctx, pg, e = await ts(br, PORT, view='sheet')
    await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(600)
    b0 = await pg.evaluate("(()=>{const b=document.querySelector('.sb-tvb[onclick^=tsTvPick]'),f=document.querySelector('.sb-filters');return [b.getAttribute('aria-haspopup'),b.getAttribute('aria-expanded'),f&&f.getAttribute('aria-haspopup')]})()")
    await pg.focus('.sb-tvb[onclick^=tsTvPick]'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
    await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(100); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(100)
    d = await pg.evaluate("(()=>{const m=document.querySelector('#flPop [role=menu]');return [document.querySelector('.sb-tvb[onclick^=tsTvPick]').getAttribute('aria-expanded'),m&&m.getAttribute('aria-label'),m?[...m.querySelectorAll('[role=menuitem]')].length:0,document.activeElement.innerText.trim(),document.activeElement.getAttribute('role')]})()")
    ok('Board: Display and Filters say they open something; Display’s list is a menu of menu items and ↓ moves through it',
       b0[0] == 'menu' and b0[1] == 'false' and b0[2] and d[0] == 'true' and d[1] == 'Inpatients on a TV' and d[2] >= 3 and d[4] == 'menuitem' and d[3] == 'Wards', [b0, d])
    ok('no page errors', not e, e[:2])
    await ctx.close()
