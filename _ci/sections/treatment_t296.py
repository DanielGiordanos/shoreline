"""Treatment Sheets — the n296 build's own checks: HIG iMessage apps and stickers, and Siri (LUNA's answers).
Written with that build; they run in Chromium and WebKit."""
from tsh import *
from core import ok, section, until, PORT

MAC = "Object.defineProperty(navigator,'platform',{get:()=>'MacIntel'})"
WIN = "Object.defineProperty(navigator,'platform',{get:()=>'Win32'})"
SUB = "(()=>{const s=[...document.querySelectorAll('.fv-sub')].filter(x=>x.getClientRects().length).pop();return s?s.textContent:null})()"


async def typed(br, init):
    ctx, pg, e = await ts(br, PORT, view='sheet', init=init)
    await until(pg, "!!(window.__tsVoice&&__tsVoice.handle)", 5000)
    await pg.evaluate("__tsVoice.handle('temperature 101.5',{typed:true})")
    await until(pg, "!!document.querySelector('.fv-sub')", 4000)
    s = [await pg.evaluate(SUB)]
    await pg.evaluate("__tsVoice.handle('no')"); await pg.wait_for_timeout(300)
    await pg.evaluate("__tsVoice.handle('temperature 101.5')"); await pg.wait_for_timeout(500)
    s.append(await pg.evaluate(SUB))
    await pg.evaluate("__tsVoice.handle('no')")
    return ctx, pg, e, s


@section(id='t296', title='n296 · Treatment Sheets against HIG iMessage apps and stickers, and Siri',
         apps=['treatment'], topics=['writing', 'voice'], engines=('chromium', 'webkit'))
async def s_t296(br):
    ctx, pg, e, s = await typed(br, MAC)
    ok('Siri (dialogue): LUNA’s confirmation names the key on a Mac — “Press Return to save.” typed, “Say “yes” or press Return to save.” spoken', s[0] and s[0].startswith('Press Return to save.') and s[1] and s[1].startswith('Say “yes” or press Return to save.'), s)
    vj = await pg.evaluate("fetch([...document.scripts].find(x=>/voice\\.js/.test(x.src)).src).then(r=>r.text())")
    ok('…no filler (“Nothing overdue. Nice work.” is “Nothing overdue.”)', 'Nice work' not in vj and 'ans("Nothing overdue.")' in vj, '')
    ok('…errors name this app and work on any device: the blocked microphone says Treatment, not Flow, and no “click”; an unsupported browser says where voice works and what still does',
       'allow the microphone for Flow' not in vj and 'The microphone is blocked for Treatment. Allow it in the browser’s settings for this site, then try again.' in vj
       and 'Voice works in Chrome and Safari. You can still type commands in the search bar.' in vj and 'on this computer.' not in vj, '')
    ok('no page errors (Mac)', not e, e[:2])
    await ctx.close()
    ctx, pg, e, s = await typed(br, WIN)
    ok('…and Enter on Windows, in both (a typed command said Return, a spoken one Enter)', s[0] and s[0].startswith('Press Enter to save.') and s[1] and s[1].startswith('Say “yes” or press Enter to save.'), s)
    ok('no page errors (Windows)', not e, e[:2])
    await ctx.close()
