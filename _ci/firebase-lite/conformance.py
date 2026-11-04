import asyncio, json, sys, http.server, threading, socketserver, os, time
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',0),Q); PORT=srv.server_address[1]; threading.Thread(target=srv.serve_forever,daemon=True).start()
from playwright.async_api import async_playwright
async def run(impl, run_id):
    async with async_playwright() as pw:
        br=await pw.chromium.launch(); pg=await br.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append('console.'+m.type+': '+m.text) if m.type in ('error',) else None)
        await pg.goto(f'http://127.0.0.1:{PORT}/{impl}.html?impl={impl}&run={run_id}')
        for i in range(300):
            if await pg.evaluate('!!window.__done'): break
            await pg.wait_for_timeout(100)
        log=await pg.evaluate('window.__log'); await br.close(); return log, errs
async def main():
    rid=str(int(time.time()))
    a,ea=await run('compat',rid+'c'); b,eb=await run('lite',rid+'l')
    da=dict((k,v) for k,v in a); db_=dict((k,v) for k,v in b)
    same=0; diff=0
    for k in da:
        if json.dumps(da[k],sort_keys=True)==json.dumps(db_.get(k),sort_keys=True): same+=1
        else: diff+=1; print('DIFF',k,'\n   compat:',json.dumps(da[k])[:300],'\n   lite:  ',json.dumps(db_.get(k))[:300])
    print('steps same',same,'different',diff,'| errors compat',ea[:2],'lite',eb[:2])
asyncio.run(main())
