"""Yakuri — the n303 build's own checks: the HIG technology pages (Machine learning, Siri). Label & voice in the hosted copy says what it
does with a photo (it doesn't read it; it stays in this browser), a label with no recorded name match offers a search instead of a dead end,
and when the speech guess isn't a command but another thing it heard is, those are offered (they fill the field; applying stays explicit).
Written with that build; they run in Chromium and WebKit."""
import json, gzip, base64, hashlib
import core
from core import ok, section, new_page, shot, PORT, ENGINE

U = '{"uid":"u1","email":"daniel.giordano@pravix.app","displayName":"Daniel Giordano"}'
# a stand-in for on-device speech: available() says the English model is there; start() hands back three alternatives
SPEECH = """window.__heard=['oppen the safety','show safety','show references'];
class FakeRec{static available(){return Promise.resolve('available')}start(){window.__recStarted=this;setTimeout(()=>{const r=window.__heard.map(t=>({transcript:t,confidence:.5}));this.onresult&&this.onresult({results:[r]});this.onend&&this.onend()},60)}abort(){}stop(){}}
FakeRec.prototype.processLocally=false;window.SpeechRecognition=FakeRec;window.webkitSpeechRecognition=FakeRec;"""


LIB_EXTRA = {'counts': {'original': 1, 'catalog': 1}, 'sources': {}, 'integration': {'counts': {'Draft': 1, 'Approved': 0, 'Held': 0}}}
DRUG_EXTRA = {'findings': [], 'sections': [], 'editorial': None, 'references': [], 'origin': 'CI stand-in', 'kind': 'drug'}


def with_detail():
    """the stand-in release has only a core part (Treatment's doses read just that); the Yakuri page also reads the detail, so give it an empty one"""
    yk = json.loads(core.YKSEED); cur = dict(yk['yakuri/current'])
    raw = json.dumps({'recommendations': {}, 'history': {}, 'source_versions': {}}).encode()
    cur['parts'] = dict(cur['parts'], detail=1); cur['sha256'] = dict(cur['sha256'], detail=hashlib.sha256(raw).hexdigest())
    part = 'yakuri/%s/parts/core-00' % cur['release']
    c = json.loads(gzip.decompress(base64.b64decode(yk[part]['data'])))
    lib = c['library']; lib.update(LIB_EXTRA); lib['drugs'] = [dict(d, **DRUG_EXTRA) for d in lib['drugs']]
    craw = json.dumps(c).encode(); cur['sha256'] = dict(cur['sha256'], core=hashlib.sha256(craw).hexdigest())
    seed = json.loads(core.SEED); seed['yakuri/current'] = cur; seed[part] = {'data': base64.b64encode(gzip.compress(craw)).decode()}
    seed['yakuri/%s/parts/detail-00' % cur['release']] = {'data': base64.b64encode(gzip.compress(raw)).decode()}
    return json.dumps(seed)


async def open_yakuri(br):
    keep = core.SEED; core.SEED = with_detail()
    try: c, p, e = await new_page(br, user=U, vp=(1440, 900))
    finally: core.SEED = keep
    await c.add_init_script(SPEECH)
    await p.goto(f'http://127.0.0.1:{PORT}/yakuri/#drug=ci_maropitant')   # the stand-in has one drug (no Alteplase, the default)
    for _ in range(80):
        if await p.evaluate("!!(window.YakuriHosted&&YakuriHosted.ready)&&!!document.querySelector('#c-capture:not([aria-disabled=\"true\"])')"): break
        await p.wait_for_timeout(100)
    return c, p, e


@section(id='t303', title='n303 · Yakuri: Label & voice follows the Machine learning page — honest about what the hosted copy does with a photo, a way forward when nothing matches, and the other things speech heard',
         apps=['yakuri'], topics=['accessibility', 'hig'], engines=('chromium', 'webkit'))
async def s_t303(br):
    c, p, e = await open_yakuri(br)
    st = await p.evaluate("[!!(window.YakuriHosted&&YakuriHosted.ready), document.querySelector('#c-capture')&&document.querySelector('#c-capture').outerHTML.slice(0,300), document.querySelector('#article').innerText.slice(0,200)]")
    ok('the hosted library is ready and Label & voice is in the toolbar, enabled', st[0] and st[1] and 'aria-disabled' not in st[1], st)
    await p.click('#c-capture'); await p.wait_for_timeout(300)
    n = await p.evaluate("[document.querySelector('.c-dialog .r-notice')?.textContent||'', document.querySelector('#c-engine')?.textContent||'']")
    await p.wait_for_timeout(500)
    n = await p.evaluate("[document.querySelector('.c-dialog .r-notice')?.textContent||'', document.querySelector('#c-engine')?.textContent||'']")
    ok('the hosted copy says a photo is not read and stays in this browser (not "read on this Mac … temporary server files")',
       'stays in this browser' in n[0] and 'on this Mac' not in n[0] and 'server files' not in n[0] and 'Text and images are not saved' in n[0], n[0])
    ok('its status line names this copy, not "this computer"', n[1].startswith('This copy of Yakuri can’t read text from photos'), n[1])
    # no match → a search, not a dead end
    await p.fill('#c-text', 'Zylotrexin 50 mg tablets\nLot 12345'); await p.click('#c-match'); await p.wait_for_timeout(200)
    m = await p.evaluate("(()=>{const b=document.querySelector('#c-matches [data-c-search]');return [document.querySelector('#c-matches h3')?.textContent, b&&b.textContent, b&&b.dataset.cSearch, /manually/.test(document.querySelector('#c-matches').textContent)]})()")
    ok('no recorded match: it says nothing was identified and offers "Search the library for" the first line of the label text',
       m[0] == '0 possible reference matches' and m[1] == 'Search the library for “Zylotrexin 50 mg tablets”' and m[2] == 'Zylotrexin 50 mg tablets' and not m[3], m)
    await p.wait_for_timeout(500)
    vis = await p.evaluate("(()=>{const b=document.querySelector('#c-matches [data-c-search]').getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight})()")
    ok('the results are brought into view: the search button is on screen without scrolling', vis)
    if ENGINE == 'chromium': await shot(p, 't303-label-no-match')
    await p.click('#c-matches [data-c-search]'); await p.wait_for_timeout(500)
    sp = await p.evaluate("(()=>{const i=[...document.querySelectorAll('input')].find(x=>x.offsetParent&&x.value==='Zylotrexin 50 mg tablets');return [!document.querySelector('.c-dialog[open]'), !!i]})()")
    ok('choosing it closes the sheet and opens search with that text in it', sp[0] and sp[1], sp)
    await p.reload(); await p.wait_for_selector('#c-capture:not([aria-disabled="true"])', timeout=15000)
    # empty text → a hint instead of a search button
    await p.click('#c-capture'); await p.wait_for_timeout(300); await p.click('#c-match'); await p.wait_for_timeout(200)
    ok('with no label text there is no empty search button, just the hint to type the generic name',
       await p.evaluate("!document.querySelector('#c-matches [data-c-search]')&&/Type the generic name from the label/.test(document.querySelector('#c-matches').textContent)"))
    # voice: the guess isn't a command, other alternatives are
    await p.click('#c-tab-voice'); await p.wait_for_timeout(400)
    ok('voice: on-device recognition is offered (stand-in model available)', await p.evaluate("!document.querySelector('#c-listen').disabled"))
    await p.click('#c-listen'); await p.wait_for_timeout(400)
    v = await p.evaluate("[window.__recStarted&&window.__recStarted.maxAlternatives, window.__recStarted&&window.__recStarted.processLocally, document.querySelector('#c-command').value, [...document.querySelectorAll('#c-alts button')].map(b=>b.textContent), document.querySelector('#c-alts').hidden, document.querySelector('.c-dialog .r-status').textContent, document.querySelector('#c-command-preview').textContent]")
    ok('it asks for three alternatives, still on device; the first guess goes in the field, and the two other things it heard that are commands are offered under "Also heard"',
       v[0] == 3 and v[1] is True and v[2] == 'oppen the safety' and v[3] == ['show safety', 'show references'] and v[4] is False and 'something else it heard is' in v[5], v)
    if ENGINE == 'chromium': await shot(p, 't303-voice-also-heard')
    ok('nothing is applied or previewed by hearing alone', v[6] == '' and await p.evaluate("!!document.querySelector('.c-dialog[open]')"), v[6])
    await p.click('#c-alts button >> nth=0'); await p.wait_for_timeout(150)
    w = await p.evaluate("[document.querySelector('#c-command').value, document.querySelector('#c-alts').hidden, document.activeElement&&document.activeElement.id, document.querySelector('#c-command-preview').textContent]")
    ok('choosing one fills the field and puts focus there; the offers go away; still nothing applied until Preview, then Apply', w[0] == 'show safety' and w[1] and w[2] == 'c-command' and w[3] == '', w)
    await p.click('#c-preview'); await p.wait_for_timeout(150)
    ok('Preview shows the navigation with its own Apply button', await p.evaluate("/Navigate to:/.test(document.querySelector('#c-command-preview').textContent)&&!!document.querySelector('#c-apply')"))
    # the first guess is a command → no offers
    await p.evaluate("window.__heard=['show references','show safety']"); await p.click('#c-listen'); await p.wait_for_timeout(400)
    ok('when the first guess is already a command, nothing else is offered', await p.evaluate("document.querySelector('#c-command').value==='show references'&&document.querySelector('#c-alts').hidden&&!document.querySelectorAll('#c-alts button').length"))
    # typing clears the offers
    await p.evaluate("window.__heard=['blah','open interactions']"); await p.click('#c-listen'); await p.wait_for_timeout(400)
    a1 = await p.evaluate("document.querySelectorAll('#c-alts button').length")
    await p.fill('#c-command', 'show overview')
    ok('editing the field by hand clears the offers', a1 == 1 and await p.evaluate("document.querySelector('#c-alts').hidden&&!document.querySelectorAll('#c-alts button').length"), a1)
    ok('no page errors', not e, e[:3])
    await c.close()
