"""n302 end-to-end: the real Treatment page (no fake Firebase) on firebase-lite, against the Firestore + Auth emulators running the live
rules under the app's project id. Seeds the suite's training sheets, creates a staff user, signs in through the page's own sign-in card,
waits for the patient list, opens a sheet, charts a value, and reads it back from the emulator. python3 e2e.py SITE"""
import sys, os, asyncio, json, time, urllib.request
site=sys.argv[1]
os.environ['PVX_SITE']=os.path.abspath(site); os.environ['PVX_ENGINE']='chromium'
sys.path.insert(0,'/home/claude/ts/tests')
import tsh
from tsh import serve
from playwright.async_api import async_playwright
PORT=serve(os.path.abspath(site))
PROJ='shoreline-flow'; FS='http://127.0.0.1:8085'; AUTH='http://127.0.0.1:9099'
def fsval(v):
    if v is None: return {'nullValue':None}
    if isinstance(v,bool): return {'booleanValue':v}
    if isinstance(v,int): return {'integerValue':str(v)}
    if isinstance(v,float): return {'doubleValue':v}
    if isinstance(v,str): return {'stringValue':v}
    if isinstance(v,list): return {'arrayValue':{'values':[fsval(x) for x in v]}}
    if isinstance(v,dict): return {'mapValue':{'fields':{k:fsval(x) for k,x in v.items()}}}
    raise TypeError(type(v))
def pyval(v):
    k=list(v.keys())[0]
    if k=='nullValue': return None
    if k=='integerValue': return int(v[k])
    if k in ('stringValue','booleanValue','doubleValue'): return v[k]
    if k=='timestampValue': return {'ts':v[k]}
    if k=='arrayValue': return [pyval(x) for x in v[k].get('values',[])]
    if k=='mapValue': return {kk:pyval(x) for kk,x in v[k].get('fields',{}).items()}
    return v
def req(url,method='GET',body=None,auth='owner'):
    r=urllib.request.Request(url,method=method,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','Authorization':'Bearer '+auth})
    with urllib.request.urlopen(r) as f: return json.loads(f.read() or b'{}')
def seed_doc(path,data): req(f'{FS}/v1/projects/{PROJ}/databases/(default)/documents/{path}','PATCH',{'fields':{k:fsval(v) for k,v in data.items()}})
def get_doc(path):
    try: return {k:pyval(v) for k,v in req(f'{FS}/v1/projects/{PROJ}/databases/(default)/documents/{path}')['fields'].items()}
    except Exception as e: return None
async def main():
    req(f'{FS}/emulator/v1/projects/{PROJ}/databases/(default)/documents','DELETE')
    try: req(f'{AUTH}/emulator/v1/projects/{PROJ}/accounts','DELETE')
    except Exception as e: print('auth clear',e, flush=True)
    seed=json.loads(tsh.SEED)
    for path,data in seed.items(): seed_doc(path,data)
    email='e2e.tech@pravix.app'; pw='right-password-123'
    r=json.loads(urllib.request.urlopen(urllib.request.Request(f'{AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake',method='POST',data=json.dumps({'email':email,'password':pw,'returnSecureToken':True}).encode(),headers={'Content-Type':'application/json'})).read())
    uid=r['localId']; print('seeded',len(seed),'docs; user',uid, flush=True)
    seed_doc(f'staff_members/{uid}',{'active':True,'tenant_id':'shoreline','role':'technician','email':email,'name':'E2E Tech'})
    async with async_playwright() as pw_:
        br=await pw_.chromium.launch(); ctx=await br.new_context(viewport={'width':1440,'height':900},color_scheme='dark')
        await ctx.add_init_script("window.__pvxFbEmu={firestore:['127.0.0.1',8085],auth:'http://127.0.0.1:9099'};")
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); cons=[]; pg.on('console',lambda m: cons.append(m.text) if m.type=='error' else None)
        async def route(r):
            u=r.request.url
            if u.startswith(f'http://127.0.0.1:{PORT}/') or '127.0.0.1:8085' in u or '127.0.0.1:9099' in u: await r.continue_()
            else: await r.fulfill(status=204,body='')
        await pg.route('**/*',route)
        t0=time.time(); await pg.goto(f'http://127.0.0.1:{PORT}/treatment/')
        await pg.wait_for_selector('#tsGate.show #sbEmail',timeout=15000); print('sign-in card at %.1fs'%(time.time()-t0), flush=True)
        print('emu wiring', await pg.evaluate("[!!window.__pvxFbEmu, firebase.auth()._raw.emulatorConfig&&firebase.auth()._raw.emulatorConfig.port, firebase.firestore()._raw._settings&&firebase.firestore()._raw._settings.host]"), flush=True)
        await pg.fill('#sbEmail',email); await pg.fill('#sbPass',pw); await pg.press('#sbPass','Enter')
        await pg.wait_for_timeout(2500); print('after submit', await pg.evaluate("[document.getElementById('sbErr')&&document.getElementById('sbErr').textContent, (document.getElementById('sbBtn')||{}).textContent, firebase.auth().currentUser&&firebase.auth().currentUser.email]"), 'console', [c[:140] for c in cons[:4]], flush=True)
        for i in range(300):
            if await pg.evaluate("!!window.tsListReady&&!document.querySelector('#tsGate.show')"): break
            await pg.wait_for_timeout(100)
        print('signed in, list ready at %.1fs'%(time.time()-t0), await pg.evaluate("[firebase.SDK_VERSION, firebase.auth().currentUser&&firebase.auth().currentUser.email, (window.__tsFind&&__tsFind.all()||[]).length]"), flush=True)
        await pg.evaluate("tsOpenSheet('sh_train1');selectCTab('sheet')")
        for i in range(300):
            if await pg.evaluate("!!document.querySelector('#sheetInner .rl')&&(TASKS||[]).length>0"): break
            await pg.wait_for_timeout(100)
        print('sheet drawn at %.1fs'%(time.time()-t0), await pg.evaluate("[document.querySelectorAll('#sheetInner .rl').length,(TASKS||[]).length,document.querySelector('.tsh .tsh-name')&&document.querySelector('.tsh .tsh-name').textContent]"), flush=True)
        tid=await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>!t.status&&t.order&&/Temperature/i.test(t.order.name));return t?t.id:null})()")
        print('task',tid, await pg.evaluate("[(TASKS||[]).filter(t=>!t.status).length, typeof tsChOpen, typeof window.tsRole==='function'?tsRole():null]"), flush=True)
        await pg.evaluate(f"tsChOpen('{tid}')"); await pg.wait_for_timeout(1500)
        print('drawer', await pg.evaluate("[!!document.querySelector('#completionDrawer.open'), !!document.querySelector('#cd-value'), (document.querySelector('.ctoast')||{}).textContent||'']"), flush=True)
        await pg.fill('#cd-value','101.7'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(2500)
        st=await pg.evaluate("(()=>{const t=(TASKS||[]).find(t=>t.id==='"+str(tid)+"');return t?[t.status,String(t.value)]:null})()")
        print('charted on screen',st, flush=True)
        # what reached the emulator
        docs=req(f'{FS}/v1/projects/{PROJ}/databases/(default)/documents/sheets/sh_train1/days')
        found=False
        for d in docs.get('documents',[]):
            f={k:pyval(v) for k,v in d['fields'].items()}
            if '101.7' in json.dumps(f): found=True
        print('value 101.7 in the emulator (sheets/sh_train1/days):',found,'| day docs:',len(docs.get('documents',[])), flush=True)
        sheet=get_doc('sheets/sh_train1'); print('sheet doc still there:', bool(sheet), 'patient', sheet and sheet.get('patient',{}).get('name') if isinstance(sheet,dict) else None, flush=True)
        await pg.evaluate("selectCTab('dash')"); await pg.wait_for_timeout(1500)
        rows=await pg.evaluate("document.querySelectorAll('#ctab-dash .sb-row:not(.sb-head)').length"); print('board rows',rows, flush=True)
        try: await pg.evaluate("logout()")
        except Exception: pass
        await pg.wait_for_timeout(2500)
        try: print('after logout: gate shown', await pg.evaluate("!!document.querySelector('#tsGate.show')"), '| signed out', await pg.evaluate("!firebase.auth().currentUser"), flush=True)
        except Exception as e: print('after logout: page reloaded', str(e)[:80], flush=True)
        print('page errors:',errs[:3]); print('console errors:',[c[:160] for c in cons[:6]], flush=True)
        await br.close()
asyncio.run(main())
