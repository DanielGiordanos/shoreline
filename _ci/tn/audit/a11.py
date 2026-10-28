"""n257 audit — Treatment Sheets against HIG Dark Mode, Icons (and Accessibility / Color rechecks) on n256.
python3 a11.py SITE OUT.json"""
import sys, os, json, asyncio
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import h
from h import *
from playwright.async_api import async_playwright
SITE, OUT = sys.argv[1], sys.argv[2]
PORT = serve(SITE)
SECS = ['dash', 'tasks', 'sheet', 'vitals', 'timeline', 'charges', 'notes']

LUMJS = r"""const P=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [a[0],a[1],a[2],a.length>3?a[3]:1]};
const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const CR=(a,b)=>(Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05);
const blend=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1];
const bgOf=e=>{const st=[];let p=e;while(p&&p.nodeType===1){const b=P(getComputedStyle(p).backgroundColor);if(b&&b[3]>0){st.push(b);if(b[3]>=.99)break}p=p.parentElement}
  let base=st.length&&st[st.length-1][3]>=.99?st.pop():(document.documentElement.classList.contains('light')||document.body.classList.contains('light')?[255,255,255,1]:[12,18,28,1]);for(let i=st.length-1;i>=0;i--)base=blend(st[i],base);return base};"""

# small text under 7:1 (Dark Mode: "strive for 7:1, especially in small text")
SEVEN = VIS + DESC + LUMJS + r"""
(()=>{const out={n:0,u7:0,u45:0,ex:[]};const seen=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:t=>t.nodeValue.trim()?1:2});let t;const top=document.querySelector('nav.topnav');
 while(t=w.nextNode()){const e=t.parentElement;if(!e||seen.has(e))continue;seen.add(e);if(vis(e)!==true||(top&&top.contains(e))||e.closest('svg'))continue;if(e.closest('[disabled],[aria-disabled=true]'))continue;const c=getComputedStyle(e);const px=parseFloat(c.fontSize);if(px>15)continue;
  let fg=P(c.color);if(!fg)continue;const bg=bgOf(e);fg=blend([fg[0],fg[1],fg[2],fg[3]*+c.opacity],bg);const r=CR(fg,bg);out.n++;if(r<7){out.u7++;if(out.ex.length<400)out.ex.push([where(e),desc(e),t.nodeValue.trim().slice(0,28),+r.toFixed(2),Math.round(px),c.color])}if(r<4.5)out.u45++}
 return out})()"""

# icons: every visible svg outside the shared top bar
ICONS = VIS + DESC + LUMJS + r"""
(()=>{const top=document.querySelector('nav.topnav');const out=[];
 document.querySelectorAll('svg').forEach(s=>{if(top&&top.contains(s))return;const v=vis(s);if(v===false)return;const r=s.getBoundingClientRect();if(r.width<6||r.width>64)return;
  const vb=s.viewBox&&s.viewBox.baseVal&&s.viewBox.baseVal.width?s.viewBox.baseVal.width:r.width;const k=r.width/vb;
  const shapes=[...s.querySelectorAll('path,line,circle,rect,polyline,polygon,ellipse,use')];
  const sw=[...new Set(shapes.map(p=>{const c=getComputedStyle(p);return c.stroke!=='none'&&parseFloat(c.strokeWidth)>0?+(parseFloat(c.strokeWidth)*k).toFixed(2):null}).filter(x=>x!==null))];
  const filled=shapes.some(p=>{const c=getComputedStyle(p);return c.fill!=='none'&&!/rgba\(0, 0, 0, 0\)/.test(c.fill)&&(c.stroke==='none'||parseFloat(c.strokeWidth)===0)});
  const ctl=s.closest('button,a,[role=button],[role=tab],[role=menuitem],[tabindex]');
  const c=getComputedStyle(shapes[0]||s);let col=P(c.stroke!=='none'?c.stroke:c.fill)||P(getComputedStyle(s).color);
  let cr=null;if(col){const bg=bgOf(s);cr=+CR(blend([col[0],col[1],col[2],col[3]*+getComputedStyle(s).opacity],bg),bg).toFixed(2)}
  // geometric ink centre vs its control's centre
  let off=null;try{const bb=s.getBBox();const m=s.getScreenCTM();if(m&&bb.width){const cx=m.a*(bb.x+bb.width/2)+m.e,cy=m.d*(bb.y+bb.height/2)+m.f;const host=ctl&&ctl.getBoundingClientRect();if(host&&host.width<70&&host.height<70&&!(ctl.innerText||'').trim())off=[+(cx-(host.left+host.width/2)).toFixed(1),+(cy-(host.top+host.height/2)).toFixed(1)]}}catch(e){}
  const label=ctl?(ctl.getAttribute('aria-label')||(ctl.innerText||'').trim().replace(/\s+/g,' ')||ctl.title||''):'';
  const txt=ctl?(ctl.innerText||'').trim():'';const tw=ctl&&txt?getComputedStyle(ctl).fontWeight:null;
  out.push({w:where(s),cls:(s.getAttribute('class')||'').slice(0,30),ctl:ctl?desc(ctl):null,label:label.slice(0,40),size:Math.round(r.width),sw,filled,cr,hidden:s.getAttribute('aria-hidden')==='true'||v==='ah',named:!!label,off,tw,txt:!!txt,
            d:(shapes.map(p=>p.getAttribute('d')||p.tagName).join('|')).slice(0,160)})});
 const emoji=[];const re=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{274C}\u{26A0}]/u;const seen=new Set();
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode()){if(re.test(t.nodeValue)&&!(top&&top.contains(t.parentElement))&&vis(t.parentElement)===true){const s=t.nodeValue.trim().slice(0,30);if(!seen.has(s)){seen.add(s);emoji.push([where(t.parentElement),s])}}}
 const imgs=[...document.querySelectorAll('img')].filter(i=>vis(i)===true&&!(top&&top.contains(i))).map(i=>[where(i),i.src.split('/').pop().slice(0,40),i.alt,Math.round(i.getBoundingClientRect().width)]);
 return {icons:out,emoji,imgs}})()"""

# backgrounds: page / card / overlay luminance (Dark Mode: base vs elevated)
ELEV = LUMJS + r"""
((sel)=>{const r={};for(const [k,s] of Object.entries(sel)){const e=[...document.querySelectorAll(s)].find(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden');if(!e){r[k]=null;continue}const b=bgOf(e);r[k]=[b.map(Math.round).slice(0,3).join(','),+L(b).toFixed(4)]}return r})"""

SCHEME = r"""(()=>{const h=document.documentElement,c=getComputedStyle(h);return {cls:h.className+' | '+document.body.className,scheme:c.colorScheme,bodyBg:getComputedStyle(document.body).backgroundColor,
  meta:[...document.querySelectorAll('meta[name=theme-color],meta[name=color-scheme]')].map(m=>(m.getAttribute('name'))+'='+m.content+(m.media?' ('+m.media+')':'')),
  inputs:[...document.querySelectorAll('input,select,textarea')].filter(e=>e.getClientRects().length).slice(0,40).map(e=>getComputedStyle(e).colorScheme).filter((v,i,a)=>a.indexOf(v)===i)}})()"""

COLORONLY = VIS + DESC + r"""
(()=>{const out=[];
 // patient tabs: is the activity ring's status in text/label too?
 document.querySelectorAll('.pt-track [role=tab], .pt-track .pt-tab, .pt-tab').forEach(t=>{if(vis(t)!==true)return;out.push(['tab',(t.getAttribute('aria-label')||t.innerText||'').trim().replace(/\s+/g,' ').slice(0,80),t.title||'',t.className.slice(0,60)])});
 // vitals values flagged abnormal
 document.querySelectorAll('[class*=abn],[class*=high],[class*=low],[class*=crit],.v-hi,.v-lo').forEach(e=>{if(vis(e)!==true)return;out.push(['flag',desc(e),(e.innerText||'').trim().slice(0,40),e.getAttribute('aria-label')||'',!!e.querySelector('svg')])});
 return out.slice(0,80)})()"""

TOASTS = r"""(async()=>{const kinds={info:'Note saved',warn:'Yakuri’s drug library didn’t load. Type each dose yourself.',err:'Couldn’t save — check the connection'};const r={};
 for(const [k,m] of Object.entries(kinds)){toast(m);const t0=performance.now();await new Promise(x=>setTimeout(x,80));const el=[...document.querySelectorAll('#toastWrap .ctoast')].pop();
   const cls=el?el.className:'';let life=null;for(let i=0;i<300;i++){await new Promise(x=>setTimeout(x,100));if(!el||!el.isConnected||getComputedStyle(el).opacity<.05||el.classList.contains('out')){life=Math.round(performance.now()-t0);break}}
   r[k]={cls,life,role:el&&(el.getAttribute('role')||el.parentElement.getAttribute('aria-live')),close:!!(el&&el.querySelector('button'))}}
 return r})()"""

SPACING = VIS + DESC + r"""
(()=>{const I='button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=switch]';const top=document.querySelector('nav.topnav');
 const els=[...document.querySelectorAll(I)].filter(e=>vis(e)===true&&!(top&&top.contains(e))&&!e.closest('#sheetInner')).map(e=>[e,e.getBoundingClientRect()]).filter(([e,r])=>r.top<innerHeight&&r.bottom>0);
 const out=[];for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const [a,ra]=els[i],[b,rb]=els[j];if(a.contains(b)||b.contains(a))continue;
   const vo=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top),ho=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left);let gap=null;
   if(vo>4)gap=Math.max(ra.left,rb.left)-Math.min(ra.right,rb.right);else if(ho>4)gap=Math.max(ra.top,rb.top)-Math.min(ra.bottom,rb.bottom);if(gap===null||gap<0||gap>=4)continue;
   const sm=Math.min(ra.width,ra.height,rb.width,rb.height);if(sm>=44)continue;
   out.push([where(a),((a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,18)),((b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,18)),Math.round(gap),Math.round(sm)])}
 return out.slice(0,60)})()"""

async def main():
    res = {}
    async with async_playwright() as pw:
        br = await pw.chromium.launch()
        # 1. appearance follows the system, also live (Auto), with no saved choice
        for sysdark in [True, False]:
            ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark' if sysdark else 'light')
            await ctx.add_init_script(h.INIT.replace('@@USER@@', h.USER).replace('@@SEED@@', h.SEED)); await ctx.add_init_script(h.FAKE)
            pg = await ctx.new_page()
            async def route(r):
                u = r.request.url
                if u.startswith('https://www.gstatic.com/firebasejs/'): await r.fulfill(status=200, content_type='application/javascript', body=h.STUB.get(u.rsplit('/', 1)[-1], ''))
                elif u.startswith(f'http://127.0.0.1:{PORT}/'): await r.continue_()
                else: await r.fulfill(status=204, body='')
            await pg.route('**/*', route)
            await pg.goto(f'http://127.0.0.1:{PORT}/treatment/'); await pg.wait_for_timeout(2600)
            await pg.evaluate("tsOpenSheet('sh_train1')"); await pg.wait_for_timeout(800)
            a = await pg.evaluate(SCHEME)
            await pg.emulate_media(color_scheme='light' if sysdark else 'dark'); await pg.wait_for_timeout(900)
            b = await pg.evaluate(SCHEME)
            res[f'auto/{"dark" if sysdark else "light"}'] = [a, b]
            await ctx.close()
        # 2. settings: any in-app appearance option?
        ctx, pg, e = await ts(br, PORT, view='sheet')
        await pg.evaluate("document.getElementById('tsSettingsBtn').click()"); await pg.wait_for_timeout(700)
        res['settings'] = await pg.evaluate("(()=>{const c=document.querySelector('#tsOrderSheet.show')||document.querySelector('[role=dialog]:not([hidden])');return c?c.innerText.slice(0,1500):null})()")
        res['topbar-theme'] = await pg.evaluate("[...document.querySelectorAll('nav.topnav button,nav.topnav a')].map(b=>b.getAttribute('aria-label')||b.title||'').filter(x=>/light|dark|theme|appearance/i.test(x))")
        await ctx.close()
        # 3. dark: contrast with IC / RT / both, and 7:1 small text
        def rt(): return None
        for nm, media in [('def', None), ('ic', {'contrast': 'more'})]:
            for rtx in [False, True]:
                for dark in [True, False]:
                    key = f'{nm}{"+rt" if rtx else ""}/{"dark" if dark else "light"}'
                    tot = {'fails': [], 'n': 0, 'seven': {'n': 0, 'u7': 0, 'ex': []}}
                    for v in SECS:
                        ctx, pg, e = await ts(br, PORT, dark=dark, media=media, view=v)
                        if rtx:
                            cdp = await ctx.new_cdp_session(pg); await cdp.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-transparency', 'value': 'reduce'}] + ([{'name': 'prefers-contrast', 'value': 'more'}] if media else []) + [{'name': 'prefers-color-scheme', 'value': 'dark' if dark else 'light'}]})
                            await pg.wait_for_timeout(300)
                        c = await pg.evaluate(CONTRAST); tot['n'] += c['n']; tot['fails'] += [[v] + f for f in c['fails']] + [[v, 'ph'] + f for f in c.get('ph', [])]
                        if dark and nm == 'def' and not rtx:
                            s = await pg.evaluate(SEVEN); tot['seven']['n'] += s['n']; tot['seven']['u7'] += s['u7']; tot['seven']['ex'] += [[v] + x for x in s['ex']]
                        await ctx.close()
                    res['contrast/' + key] = tot
        # 4. elevation in dark and light
        SEL = {'page': '#stage', 'card': '.clinical-workspace .panel, .panel', 'grid': '#sheetInner .grow:not(.ghead)', 'toolbar': '.treatment-toolbar'}
        for dark in [True, False]:
            ctx, pg, e = await ts(br, PORT, dark=dark, view='sheet')
            el = await pg.evaluate(ELEV + f"({json.dumps(SEL)})")
            for k, js, s in [('share', "document.getElementById('tsCopyBtn').click()", '#tsCopyMenu'), ('patient', "document.getElementById('tsPatientChip').click()", '#tsPatientMenu'),
                             ('settings', "document.getElementById('tsSettingsBtn').click()", '#tsOrderSheet.show .op-card, #tsOrderSheet.show > *'), ('drawer', "document.querySelector('#sheetInner .mark.overdue').click()", '#completionDrawer'),
                             ('order', "tsOpenMedOrder('Maropitant')", '#tsModal.show .tm-card, #tsModal.show > *')]:
                await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
                try:
                    await pg.evaluate(js); await pg.wait_for_timeout(700)
                    el[k] = (await pg.evaluate(ELEV + f"({json.dumps({k: s})})"))[k]
                except Exception as ex: el[k] = str(ex)[:80]
            res['elev/' + ('dark' if dark else 'light')] = el
            await ctx.close()
        # 5. icons in every section, Mac dark + light, iPhone
        for nm, vp, touch, dark in [('mac', (1440, 900), False, True), ('mac-light', (1440, 900), False, False), ('iphone', (390, 844), True, True)]:
            allic = []; emo = []; imgs = []
            for v in SECS:
                ctx, pg, e = await ts(br, PORT, vp=vp, touch=touch, dark=dark, view=v)
                r = await pg.evaluate(ICONS); allic += [dict(x, sec=v) for x in r['icons']]; emo += r['emoji']; imgs += r['imgs']
                if nm == 'mac' and v == 'sheet':
                    for js in ["document.getElementById('tsCopyBtn').click()", "document.querySelector('.ts-view-btn').click()", "document.getElementById('tsPatientChip').click()", "document.querySelector('#sheetInner .mark.overdue').click()"]:
                        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
                        try:
                            await pg.evaluate(js); await pg.wait_for_timeout(600); r = await pg.evaluate(ICONS); allic += [dict(x, sec='overlay') for x in r['icons']]
                        except Exception: pass
                await ctx.close()
            res['icons/' + nm] = {'icons': allic, 'emoji': emo, 'imgs': imgs}
        # 6. colour alone, toasts, spacing
        ctx, pg, e = await ts(br, PORT, view='sheet'); res['coloronly'] = await pg.evaluate(COLORONLY); res['toasts'] = await pg.evaluate(TOASTS); await ctx.close()
        sp = {}
        for nm, vp in [('iphone', (390, 844)), ('ipad', (1180, 820))]:
            for v in SECS:
                ctx, pg, e = await ts(br, PORT, vp=vp, touch=True, view=v); sp[f'{nm}/{v}'] = await pg.evaluate(SPACING); await ctx.close()
        res['spacing'] = sp
        await br.close()
    json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print('ok')
asyncio.run(main())
