"""Anesia — the n429 build's own checks (Nov 23 2026): HIG Design principles, Accessibility, App icons.
Markers close together on the chart covered each other ("Anesthesia start" under Intubation and Induction, unreachable);
messages went after 6 s, errors and a link to copy by hand too; no maskable app icon."""
import os, json, math
from core import *
from helpers import *

OVERLAP = """(()=>{ const out=[]; document.querySelectorAll('.an-chart .an-trk').forEach(t=>{ const m=[...t.children].filter(x=>x.classList.contains('an-mk')).map(x=>[x.getAttribute('aria-label'),x.getBoundingClientRect()]);
  for(let i=0;i<m.length;i++)for(let j=i+1;j<m.length;j++){const a=m[i][1],b=m[j][1]; if(a.width&&b.width&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1) out.push(m[i][0]+' / '+m[j][0]);} }); return out; })()"""
CENTER = """(lab)=>{ const m=[...document.querySelectorAll('.an-chart .an-mk')].find(x=>(x.getAttribute('aria-label')||'').startsWith(lab)); const c=document.querySelector('.an-chart');
  c.scrollLeft=Math.max(0,m.offsetLeft-120); m.scrollIntoView({block:'center',inline:'nearest'}); const r=m.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]; }"""


def png_rgb(path):
    """a small PNG reader (8-bit RGB or RGBA, not interlaced), so the check needs no image library on GitHub"""
    import zlib, struct
    b = open(path, 'rb').read(); i = 8; idat = b''; w = h = ct = 0
    while i < len(b):
        n, t = struct.unpack('>I4s', b[i:i + 8]); d = b[i + 8:i + 8 + n]; i += 12 + n
        if t == b'IHDR': w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', d[:13]); assert bd == 8 and ct in (2, 6) and il == 0
        elif t == b'IDAT': idat += d
    raw = zlib.decompress(idat); bpp = 3 if ct == 2 else 4; st = w * bpp; rows = []; prev = bytearray(st); o = 0
    for _ in range(h):
        f = raw[o]; line = bytearray(raw[o + 1:o + 1 + st]); o += 1 + st
        for x in range(st):
            a = line[x - bpp] if x >= bpp else 0; up = prev[x]; c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + up) & 255
            elif f == 3: line[x] = (line[x] + (a + up) // 2) & 255
            elif f == 4:
                pa, pb, pc = abs(up - c), abs(a - c), abs(a + up - 2 * c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else up if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return w, h, (lambda x, y: tuple(rows[y][x * bpp:x * bpp + 3]))


@section(id='a429', title='n429 · Anesia · Design principles, Accessibility, App icons: chart markers never cover each other, errors and a link to copy stay until closed, other messages wait while read, a maskable icon',
         apps=['anesia'], topics=['accessibility', 'layout', 'feedback', 'icons'], engines=('chromium', 'webkit'))
async def s_a429(br):
    errs = []
    # chart markers: Mac and iPhone
    for vp, touch, tag in [((1440, 900), False, 'Mac'), ((390, 844), True, 'iPhone')]:
        ctx, pg, e = await new_page(br, vp=vp, touch=touch)
        await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(700)
        ov = await pg.evaluate(OVERLAP)
        x, y = await pg.evaluate(CENTER, 'Anesthesia start'); await pg.wait_for_timeout(250)
        x, y = await pg.evaluate(CENTER, 'Anesthesia start')
        if touch: await pg.touchscreen.tap(x, y)
        else: await pg.mouse.click(x, y)
        await pg.wait_for_timeout(500)
        sheet = await pg.evaluate("(()=>{const s=document.querySelector('#anSheet'); return s&&!s.hidden? s.innerText.slice(0,120):''})()")
        ok(f'Accessibility · {tag}: no marker on the chart covers another (at 2:00 PM Anesthesia start sat under Intubation and Induction), and Anesthesia start opens when chosen',
           not ov and 'Anesthesia start' in sheet, (ov, sheet))
        errs += list(e); await ctx.close()
    # an error stays until closed and is read at once
    ctx, pg, e = await new_page(br)
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
    await pg.evaluate("window.__fsOffline=true")
    await pg.click('[data-act=event]'); await pg.click('#anSheet [data-chips=kind] [data-v=note]'); await pg.fill('[name=note]', 'Training: offline note'); await pg.click('[data-ok]'); await pg.wait_for_timeout(400)
    await pg.evaluate("(()=>{ const k='anesia_records/an_train1', d=JSON.parse(JSON.stringify(window.__fs[k])); d.status='signed'; d.signed={at:window.__anNow(),by:'Supervisor B'}; window.__fs[k]=d; })()")
    await pg.evaluate("window.__fsOffline=false; window.dispatchEvent(new Event('online'))")
    await until(pg, "(()=>{const t=document.getElementById('anToast'); return t&&!t.hidden&&/couldn’t be saved/.test(t.textContent)})()", 8000)
    t0 = await pg.evaluate("(()=>{const t=document.getElementById('anToast'); return {txt:t.textContent, role:t.getAttribute('role'), x:!!document.getElementById('anToastX')}})()")
    await pg.wait_for_timeout(6800)
    t1 = await pg.evaluate("(()=>{const t=document.getElementById('anToast'); return !t.hidden && /couldn’t be saved/.test(t.textContent)})()")
    await pg.click('#anToastX'); await pg.wait_for_timeout(300)
    t2 = await pg.evaluate("document.getElementById('anToast').hidden")
    ok('Accessibility · “A change couldn’t be saved” is read at once (an alert) and stays until it’s closed (it went after 6 s); Dismiss closes it',
       'couldn’t be saved' in t0['txt'] and t0['role'] == 'alert' and t0['x'] and t1 and t2, (t0, t1, t2))
    errs += list(e); await ctx.close()
    # the link to copy by hand stays; other messages wait while pointed at or while the page is hidden
    ctx, pg, e = await new_page(br)
    await pg.add_init_script("try{ Object.defineProperty(navigator,'share',{value:undefined,configurable:true}); Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('no'))},configurable:true}); }catch(e){}")
    await pg.goto(URL); await pg.wait_for_selector('[data-open]'); await pg.click('text=Training dog 4'); await pg.wait_for_selector('.an-chart'); await pg.wait_for_timeout(500)
    await pg.click('#anShare'); await pg.wait_for_timeout(6800)
    lk = await pg.evaluate("(()=>{const t=document.getElementById('anToast'); return {vis:!t.hidden, txt:t.textContent.slice(0,60), role:t.getAttribute('role'), x:!!document.getElementById('anToastX')}})()")
    ok('…“Copy this link: …” stays until it’s closed, so it can be copied by hand (it went after 6 s); it’s a status, not an alert',
       lk['vis'] and 'Copy this link' in lk['txt'] and lk['x'] and lk['role'] == 'status', lk)
    await pg.click('#anToastX'); await pg.wait_for_timeout(200)
    await pg.evaluate("document.activeElement&&document.activeElement.blur()"); await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
    box = await pg.locator('#anToast').bounding_box()
    await pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); await pg.wait_for_timeout(7000)
    held = await pg.evaluate("(()=>{const t=document.getElementById('anToast'); return !t.hidden && /Nothing to undo/.test(t.textContent)})()")
    await pg.mouse.move(5, 300); await pg.wait_for_timeout(6500)
    gone = await pg.evaluate("document.getElementById('anToast').hidden")
    await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(200)
    await pg.evaluate("Object.defineProperty(document,'hidden',{get:()=>true,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(6800)
    hid = await pg.evaluate("!document.getElementById('anToast').hidden")
    await pg.evaluate("Object.defineProperty(document,'hidden',{get:()=>false,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(7000)
    back = await pg.evaluate("document.getElementById('anToast').hidden")
    ok('…other messages (“Nothing to undo …”) still go by themselves, but not while pointed at or while the page is hidden; they go once the rest of their time has passed',
       held and gone and hid and back, (held, gone, hid, back))
    errs += list(e); await ctx.close()
    # app icons
    man = json.load(open(os.path.join(BUILD, 'anesia', 'manifest.webmanifest'), encoding='utf-8'))
    mk = [i for i in man['icons'] if i.get('purpose') == 'maskable']
    rad = bg = None
    if mk:
        w, h, px = png_rgb(os.path.join(BUILD, 'anesia', mk[0]['src'])); bg = px(0, 0); rad = 0
        for yy in range(0, h, 2):
            for xx in range(0, w, 2):
                if sum(abs(a - b) for a, b in zip(px(xx, yy), bg)) > 120: rad = max(rad, math.hypot(xx - w / 2, yy - h / 2))
    ok('App icons · a maskable icon (as OR, Rounds and Ultrasound have), the stopwatch inside the safe zone (radius under 40 % of the icon) on the same navy',
       mk and mk[0]['sizes'] == '512x512' and rad is not None and rad < 0.4 * 512 and bg == (10, 18, 34), (mk, rad))
    ok('no page errors', not errs, errs)
