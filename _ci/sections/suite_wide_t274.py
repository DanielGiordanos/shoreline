"""The whole suite — the shared top bar's app links. n274–n276 added an expanding app navigation (a lip under the bar that
opened a panel); n278 (Oct 31 2026, Daniel: "Bring back my old navigation bar") took it out, so these check that every page
with the shared top bar has its own row of app links again. Runs in Chromium and WebKit."""
import os, re, glob
from core import ok, section, until, new_page, BUILD as SITE, PORT, ENGINE
from helpers import STUB216

U = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'


def topbar_pages():
    out = []
    for f in sorted(glob.glob(SITE + '/**/*.html', recursive=True)):
        t = open(f, encoding='utf-8', errors='ignore').read()
        if 'class="topnav' in t and ('pvx-appearance.js' in t or 'pvx-shell.js' in t) and 'id="logoutBtn"' in t:
            out.append(os.path.relpath(f, SITE).replace('index.html', ''))
    return out


ST = """(()=>{const n=document.querySelector('nav.topnav');if(!n)return null;const vis=e=>{if(!e||!e.getClientRects().length)return false;const c=getComputedStyle(e);if(c.visibility==='hidden'||+c.opacity<.05)return false;let p=e;while(p){if(getComputedStyle(p).display==='none')return false;p=p.parentElement}return true};
 const items=[...n.querySelectorAll('.nav-item[id]')].filter(a=>a.getAttribute('style')!=='display:none'&&a.style.display!=='none');
 const shown=items.filter(vis).map(a=>a.id), hidden=items.filter(a=>!vis(a)).map(a=>a.id);
 const hit=items.filter(vis).filter(a=>{const r=a.getBoundingClientRect();if(r.right<0||r.left>innerWidth)return true;const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return h&&(a===h||a.contains(h))}).map(a=>a.id);
 return {nav:!!window.pvxNav,dock:!!document.querySelector('.pvxn-dock,.pvxn-lip,.pvxn-panel'),script:[...document.scripts].some(s=>/pvx-nav\\.js/.test(s.src)),
   wait:document.documentElement.classList.contains('pvxn-wait')||!!document.querySelector('style#pvxn-wait'),shown,hidden,hit,sw:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth}})()"""


@section(id='t278', title='n278 · the old navigation bar is back: every page with the shared top bar shows its own app links, no expanding panel',
         apps=['topbar', 'flow', 'treatment', 'yakuri'], topics=['navigation', 'layout'], engines=('chromium', 'webkit'))
async def s_t278(br):
    pages = topbar_pages()
    ok('there are pages with the shared top bar to check', len(pages) >= 8, pages)
    bad = {}
    for path in pages:
        c, p, e = await new_page(br, user=U, vp=(1440, 900))
        async def mod(r): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(r.request.url.rsplit('/', 1)[-1], ''))
        await p.route('https://www.gstatic.com/firebasejs/10.12.0/*', mod)
        await p.goto(f'http://127.0.0.1:{PORT}/' + path); await p.wait_for_timeout(1800)
        s = await p.evaluate(ST)
        e = [x for x in e if 'collectionGroup' not in x]   # the test's stand-in database has no collectionGroup (Flow's Rounds query); not a page fault
        if not s or s['nav'] or s['dock'] or s['script'] or s['wait'] or not s['shown'] or len(s['hit']) != len(s['shown']) or e:
            bad[path or '/'] = {k: s[k] for k in ('nav', 'dock', 'script', 'wait', 'shown', 'hit')} if s else 'no top bar'
            if e: bad[path or '/'] = [bad[path or '/'], e[:2]]
        await c.close()
    ok('On every page with the shared top bar: no expanding navigation (no lip, no panel, pvx-nav.js not loaded), the page’s own app links show in the bar and each one can be clicked, and no page errors',
       not bad, bad)
    # phone: the bar still fits
    c, p, e = await new_page(br, user=U, vp=(390, 844), touch=True)
    async def mod(r): await r.fulfill(status=200, content_type='application/javascript', body=STUB216.get(r.request.url.rsplit('/', 1)[-1], ''))
    await p.route('https://www.gstatic.com/firebasejs/10.12.0/*', mod)
    await p.goto(f'http://127.0.0.1:{PORT}/treatment/'); await p.wait_for_timeout(1800)
    s = await p.evaluate(ST)
    ok('iPhone (Treatment): no expanding navigation and no sideways scroll', s and not s['dock'] and not s['nav'] and s['sw'] <= s['vw'], s)
    await c.close()
