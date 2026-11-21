"""Treatment Sheets — the n415 build's own check (Nov 20 2026): a section opens at its top in Safari too.
selectCTab() reset the stage to its top with the stage's smooth scrolling, so in Safari's WebKit the reset animated, and when
the stage was still moving (the status board scrolling to the selected patient) it stopped part way: the sheet opened
280 pt down with its toolbar under the bars (what t270 and t284 caught on the newer WebKit). The switch now jumps."""
from tsh import *
from core import ok, section, PORT

ST = "(()=>{const s=document.querySelector('.stage');return [Math.round(s.scrollTop), s.style.scrollBehavior, getComputedStyle(s).scrollBehavior]})()"


@section(id='t415ts', title='n415 · Treatment Sheets: a section opens at its top in Safari too (the switch jumps; a smooth scroll in flight stops)',
         apps=['treatment'], topics=['navigation', 'touch'], engines=('chromium', 'webkit'))
async def s_t415(br):
    ctx, pg, e = await ts(br, PORT, view='dash', vp=(390, 844), touch=True)
    room = await pg.evaluate("(()=>{const s=document.querySelector('.stage');return s.scrollHeight-s.clientHeight})()")
    # the status board is moving (as when it scrolls to the selected patient), and the sheet is opened
    now = await pg.evaluate("""(()=>{const s=document.querySelector('.stage'); s.scrollTo({top:Math.min(260,s.scrollHeight-s.clientHeight),behavior:'smooth'});
      return new Promise(r=>setTimeout(()=>{const mid=Math.round(s.scrollTop); selectCTab('sheet'); r([mid, Math.round(s.scrollTop)])},90))})()""")
    await pg.wait_for_timeout(900)
    after = await pg.evaluate(ST)
    hit = await pg.evaluate("(()=>{const b=document.querySelector('.ts-more-btn');if(!b)return null;const r=b.getBoundingClientRect(),x=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!x&&!!x.closest('.ts-more-btn')})()")
    ok('a section opens at its top: the sheet chosen while the status board is still scrolling is at its top at once and stays there, its toolbar in reach (in Safari it stopped part way down, the toolbar under the bars)',
       room > 120 and now[0] > 0 and now[1] == 0 and after[0] <= 2 and hit, (room, now, after, hit))
    # in-page jumps keep their smooth scroll
    ok('…the stage still scrolls smoothly for jumps inside a section (only the switch jumps)', after[1] == '' and after[2] == 'smooth', after)
    ok('no page errors', not e, e)
    await ctx.close()
