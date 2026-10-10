"""Kura HTTP gateway. Run: python -m backend.server --port 8769.

SQLite files and backups stay outside the static web root. Writes are serialized,
authorized and idempotent at this boundary. Designed for standalone local use;
remote binding requires TLS. Real external systems are not connected by default.
"""
import argparse
import csv
import hashlib
import io
import json
import mimetypes
import os
import secrets
import sqlite3
import ssl
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from http import cookies
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from . import core, workflows, security, connectors

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / 'web'
MAX_BODY = 8 * 1024 * 1024
SERVER_PERMISSIONS = {'user.save':'users.manage', 'user.revoke':'users.manage', 'key.create':'integrations.manage', 'key.revoke':'integrations.manage', 'backup.create':'backups.manage', 'demo.seed':'settings.manage'}
KNOWN_PERMISSIONS = set(sum(security.ROLE_PERMISSIONS.values(), [])) | {'users.manage','settings.manage','inventory.restricted'}
for module in (core, workflows):
    KNOWN_PERMISSIONS.update(getattr(module, 'PERMISSIONS', {}).values())
KNOWN_PERMISSIONS.discard('*')
KNOWN_PERMISSIONS.update(SERVER_PERMISSIONS.values())

def connect(path):
    conn = sqlite3.connect(str(path), timeout=15, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    conn.execute('PRAGMA busy_timeout=15000')
    return conn

def initialize(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=FULL')
        security.initialize(conn)
        core.initialize(conn)
        connectors.initialize(conn)
        conn.execute('''CREATE TABLE IF NOT EXISTS request_cancellations (
            tenant_id TEXT NOT NULL,request_key TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL,
            PRIMARY KEY(tenant_id,request_key))''')
    os.chmod(path, 0o600)

def can(ctx, permission):
    return '*' in ctx['permissions'] or permission in ctx['permissions']

def permission_for(command, payload):
    if command == 'stock.move':
        return {'receive':'inventory.receive', 'return':'inventory.receive', 'opening':'inventory.adjust', 'adjust':'inventory.adjust', 'transfer':'inventory.transfer', 'emergency':'inventory.emergency'}.get(payload.get('kind'), 'inventory.use')
    if command == 'order.status' and payload.get('status') == 'approved':
        return 'purchase.approve'
    return SERVER_PERMISSIONS.get(command) or core.PERMISSIONS.get(command) or workflows.PERMISSIONS.get(command)

def all_commands(ctx):
    commands = {**core.PERMISSIONS, **workflows.PERMISSIONS, **SERVER_PERMISSIONS}
    result = [name for name, perm in commands.items() if can(ctx, perm)]
    if any(can(ctx,p) for p in ('inventory.consume','inventory.receive','inventory.adjust','inventory.transfer','inventory.emergency')):
        result.append('stock.move')
    return sorted(set(ctx['permissions'] + result))

def _contains_credential(value):
    fields={'password','new_password','current_password','secret','token','api_key','authorization'}
    if isinstance(value,dict):
        return any(str(key).lower() in fields or _contains_credential(child) for key,child in value.items())
    return isinstance(value,list) and any(_contains_credential(child) for child in value)

def _command_fingerprint(canonical, payload):
    """Secret-bearing replay fingerprints must not bypass password KDF cost.

    Hash the full canonical operation, with no password-length restriction on
    the operation itself. The stored salt is unique to this request. No raw
    payload or fast digest of credential-bearing content is retained.
    """
    if _contains_credential(payload):
        salt=secrets.token_bytes(16)
        digest=hashlib.pbkdf2_hmac('sha256',canonical.encode(),salt,600000)
        return f'pbkdf2_sha256$600000${salt.hex()}${digest.hex()}'
    return hashlib.sha256(canonical.encode()).hexdigest()

def _fingerprint_matches(saved, canonical):
    if saved.startswith('pbkdf2_sha256$'):
        try:
            algorithm,rounds,salt,expected=saved.split('$')
            if rounds!='600000' or len(salt)!=32 or len(expected)!=64:
                return False
            actual=hashlib.pbkdf2_hmac('sha256',canonical.encode(),bytes.fromhex(salt),600000).hex()
            return secrets.compare_digest(actual,expected)
        except (TypeError,ValueError):
            return False
    # Compatibility for ordinary command fingerprints and pre-hardening files.
    return secrets.compare_digest(saved,hashlib.sha256(canonical.encode()).hexdigest())

def execute_command(conn, ctx, command, payload, key, backup_result=None):
    if not isinstance(command, str) or not isinstance(payload, dict):
        raise core.DomainError('Provide a command name and an object payload.')
    if not isinstance(key,str) or not 8 <= len(key) <= 200:
        raise core.DomainError('A stable idempotency key of 8–200 characters is required.')
    required = permission_for(command, payload)
    if not required:
        raise core.DomainError('Unknown command.',404,'not_found')
    canonical = json.dumps({'command':command,'payload':payload}, sort_keys=True, separators=(',', ':'), allow_nan=False)
    conn.execute('BEGIN IMMEDIATE')
    try:
        old = conn.execute('SELECT * FROM command_requests WHERE tenant_id=? AND request_key=?', (ctx['tenant_id'],key)).fetchone()
        if old:
            if old['actor_id'] != ctx['user_id'] or not _fingerprint_matches(old['payload_hash'],canonical):
                raise core.DomainError('This idempotency key was already used for a different request.',409,'idempotency_conflict')
            conn.execute('COMMIT')
            return json.loads(old['result'])
        cancelled = conn.execute('SELECT actor_id FROM request_cancellations WHERE tenant_id=? AND request_key=?', (ctx['tenant_id'],key)).fetchone()
        if cancelled:
            raise core.DomainError('This unresolved request was cancelled before posting. Review the action before submitting it with a new key.',409,'request_cancelled')
        # Authenticated actors may retrieve their own previously committed result
        # after a role change. Fresh mutations still require current permission.
        security.require(ctx, required)
        fingerprint = _command_fingerprint(canonical,payload)
        if command in SERVER_PERMISSIONS:
            result = server_command(conn,ctx,command,payload,backup_result)
        else:
            try:
                result = core.handle(conn,ctx,command,payload)
            except core.NotHandled:
                result = workflows.handle(conn,ctx,command,payload)
        # Secrets are returned once, never retained in the request replay cache.
        replay = {k:v for k,v in result.items() if k!='token'} if command=='key.create' else result
        if command=='key.create': replay['message']='This key was already created. Revoke it and create another if the original response was lost.'
        conn.execute('INSERT INTO command_requests VALUES(?,?,?,?,?,?)',(ctx['tenant_id'],key,ctx['user_id'],fingerprint,json.dumps(replay,allow_nan=False),core.now()))
        conn.execute('COMMIT')
        return result
    except Exception:
        conn.execute('ROLLBACK')
        raise

def request_outcome(conn, ctx, key, cancel=False):
    """Resolve an authenticated actor's durable intent under the posting lock.

    A read returns unknown when no transaction has posted. Cancellation writes
    a tombstone atomically with that check, preventing even a delayed original
    command from committing after the browser clears an unresolved intent.
    """
    if not isinstance(key,str) or not 8 <= len(key) <= 200:
        raise core.DomainError('Provide a valid request key.')
    conn.execute('BEGIN IMMEDIATE')
    try:
        row=conn.execute('SELECT actor_id,result FROM command_requests WHERE tenant_id=? AND request_key=?',(ctx['tenant_id'],key)).fetchone()
        closed=conn.execute('SELECT actor_id FROM request_cancellations WHERE tenant_id=? AND request_key=?',(ctx['tenant_id'],key)).fetchone()
        if (row and row['actor_id']!=ctx['user_id']) or (closed and closed['actor_id']!=ctx['user_id']):
            raise core.DomainError('Request not found for this account.',404,'not_found')
        if row:
            result={'status':'committed','key':key,'result':json.loads(row['result'])}
        elif closed:
            result={'status':'cancelled','key':key}
        elif cancel:
            conn.execute('INSERT INTO request_cancellations VALUES(?,?,?,?)',(ctx['tenant_id'],key,ctx['user_id'],core.now()))
            core.audit(conn,ctx,'request.cancel',{'request_key':key,'reason':'Unresolved device intent cancelled before posting'})
            result={'status':'cancelled','key':key}
        else:
            result={'status':'unknown','key':key}
        conn.execute('COMMIT')
        return result
    except Exception:
        conn.execute('ROLLBACK')
        raise

def server_command(conn,ctx,command,p,backup_result=None):
    tenant = ctx['tenant_id']
    if command == 'user.save':
        role = p.get('role','viewer')
        if role not in security.ROLE_PERMISSIONS:
            raise core.DomainError('Choose a valid employee role.')
        extra = p.get('permissions',[])
        if not isinstance(extra,list) or any(v not in KNOWN_PERMISSIONS for v in extra):
            raise core.DomainError('One or more permissions are not recognized.')
        if p.get('id'):
            user = conn.execute('SELECT * FROM users WHERE id=? AND tenant_id=?',(p['id'],tenant)).fetchone()
            if not user:
                raise core.DomainError('Employee not found.',404,'not_found')
            name = str(p.get('name',user['name'])).strip()
            if not name or len(name)>200:
                raise core.DomainError('Enter an employee name.')
            active = 1 if p.get('active',True) else 0
            if user['role']=='administrator' and (role!='administrator' or not active):
                others = conn.execute("SELECT COUNT(*) FROM users WHERE tenant_id=? AND role='administrator' AND active=1 AND id<>?",(tenant,user['id'])).fetchone()[0]
                if not others:
                    raise core.DomainError('Keep at least one active administrator.',409,'last_admin')
            conn.execute('UPDATE users SET name=?,email=?,role=?,permissions=?,active=?,updated_at=? WHERE id=? AND tenant_id=?',(name,security.email_address(p.get('email',user['email'])),role,json.dumps(extra),active,core.now(),user['id'],tenant))
            if p.get('password'):
                conn.execute('UPDATE users SET password_hash=? WHERE id=?',(security.password_hash(p['password']),user['id']))
            conn.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
            if role!=user['role'] or sorted(extra)!=sorted(json.loads(user['permissions'])) or not active:
                conn.execute('UPDATE api_keys SET active=0 WHERE user_id=?',(user['id'],))
            result = security.public_user(conn.execute('SELECT * FROM users WHERE id=?',(user['id'],)).fetchone())
        else:
            result = security.public_user(security.create_user(conn,tenant,p.get('name'),p.get('email'),p.get('password'),role,extra))
        core.audit(conn,ctx,command,{'user_id':result['id'],'role':role})
        return result
    if command == 'user.revoke':
        user = conn.execute('SELECT id FROM users WHERE id=? AND tenant_id=?',(p.get('id'),tenant)).fetchone()
        if not user:
            raise core.DomainError('Employee not found.',404,'not_found')
        conn.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
        core.audit(conn,ctx,command,{'user_id':user['id']})
        return {'revoked':True}
    if command == 'key.create':
        scopes = p.get('permissions',['inventory.read','integrations.manage'])
        allowed = {'inventory.read','integrations.manage','inventory.restricted'}
        if not isinstance(scopes,list) or not scopes or any(s not in allowed for s in scopes):
            raise core.DomainError('Integration keys may use inventory.read, integrations.manage and explicitly authorized inventory.restricted only.')
        if 'inventory.restricted' in scopes and not can(ctx,'inventory.restricted'):
            raise security.AuthError('You cannot grant restricted-inventory access that you do not hold.',403,'forbidden')
        token='kura_'+secrets.token_urlsafe(32)
        key_id=core.new_id()
        conn.execute('INSERT INTO api_keys VALUES(?,?,?,?,?,?,?,?)',(key_id,tenant,ctx['user_id'],str(p.get('name','Integration'))[:200],security.digest(token),json.dumps(scopes),1,core.now()))
        core.audit(conn,ctx,command,{'key_id':key_id,'permissions':scopes})
        return {'id':key_id,'token':token,'permissions':scopes,'message':'Copy this key now. It will not be shown again.'}
    if command == 'key.revoke':
        cursor=conn.execute('UPDATE api_keys SET active=0 WHERE id=? AND tenant_id=?',(p.get('id'),tenant))
        if not cursor.rowcount:raise core.DomainError('API key not found.',404,'not_found')
        core.audit(conn,ctx,command,{'key_id':p['id']})
        return {'revoked':True}
    if command == 'backup.create':
        if not backup_result:raise core.DomainError('Backup could not be created.',503,'backup_failed')
        core.audit(conn,ctx,command,{'filename':backup_result['filename']})
        return backup_result
    if command == 'demo.seed':
        if core.list_obj(conn,tenant,'item'):
            raise core.DomainError('Starter data can only be added to an empty inventory.',409,'not_empty')
        return seed_demo(conn,ctx)
    raise core.NotHandled(command)

def seed_demo(conn,ctx):
    """Explicit user action. Never applied to a nonempty inventory."""
    tenant=ctx['tenant_id']
    vendor=core.handle(conn,ctx,'vendor.save',{'name':'Example Medical Supply','contact':'Synthetic supplier','status':'active','lead_days':3})
    locs={}
    for name in ['Central Supply','Emergency','Surgery','ICU']:
        existing=next((x for x in core.list_obj(conn,tenant,'location') if x['name']==name),None)
        locs[name]=existing or core.handle(conn,ctx,'location.save',{'name':name,'type':'storage','status':'active'})
    specs=[('Examination gloves','K-1001','box',{'box':1,'case':10},8,2,10,20,False),('Sterile gauze','K-1002','pack',{'pack':1,'case':20},42,5,10,30,False),('IV extension set','K-1003','each',{'each':1,'box':50},0,3,8,24,True),('Syringe 10 mL','K-1004','each',{'each':1,'box':100},120,15,30,100,False),('Absorbent underpads','K-1005','pack',{'pack':1,'case':4},5,2,6,12,False),('Surgical drape','K-1006','each',{'each':1,'box':10},28,4,10,30,True),('Disinfectant wipes','K-1007','canister',{'canister':1,'case':12},24,4,8,24,True),('Bandage roll','K-1008','roll',{'roll':1,'box':12},36,3,12,36,False)]
    for n,(name,sku,unit,units,qty,minimum,reorder,target,tracked) in enumerate(specs):
        item=core.handle(conn,ctx,'item.save',{'name':name,'sku':sku,'base_unit':unit,'purchase_unit':list(units)[-1],'consume_unit':unit,'units':units,'category':'Clinical supplies','barcodes':['KURA'+str(1001+n)],'vendor_id':vendor['id'],'unit_cost':2.5+n,'minimum':minimum,'reorder_point':reorder,'target':target,'order_multiple':1,'lot_required':tracked,'expiry_required':tracked,'status':'active','notes':'Synthetic starter item — replace with your own catalog.'})
        location=locs[['Central Supply','Emergency','Surgery','ICU'][n%4]]
        core.handle(conn,ctx,'rule.save',{'item_id':item['id'],'location_id':location['id'],'minimum':minimum,'reorder_point':reorder,'target':target,'safety_stock':minimum,'order_multiple':1})
        if qty:
            p={'kind':'opening','item_id':item['id'],'location_id':location['id'],'quantity':qty,'unit':unit,'reason':'Explicit synthetic starter inventory'}
            if tracked:p.update(lot_code=f'DEMO-{n+1}',expires=(datetime.now(timezone.utc)+timedelta(days=45 if n==5 else 365)).date().isoformat())
            core.move(conn,ctx,p)
    core.audit(conn,ctx,'demo.seed',{'items':8,'synthetic':True})
    return {'items_created':8,'locations':4,'synthetic':True}

class KuraServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address,db_path,environment='development',tls=False):
        self.db_path=Path(db_path).resolve()
        self.environment=environment
        self.tls=tls
        self.backup_dir=self.db_path.parent/'backups'
        self.backup_lock=threading.Lock()
        self.backup_error=None
        self.started=time.time()
        self.request_windows={}
        self.request_lock=threading.Lock()
        self.connectors=connectors.Runner(self.db_path,connect,execute_command)
        super().__init__(address,Handler)

    def make_backup(self):
        with self.backup_lock:
            self.backup_dir.mkdir(parents=True,exist_ok=True)
            filename=f'kura-{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")}-{secrets.token_hex(3)}.sqlite3'
            output=self.backup_dir/filename
            try:
                with connect(self.db_path) as source, sqlite3.connect(output) as dest:
                    source.backup(dest)
                    if dest.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Backup integrity validation failed')
                os.chmod(output,0o600)
                self.backup_error=None
                # Only files created by this application are rotated.
                old=sorted(self.backup_dir.glob('kura-*.sqlite3'),key=lambda p:p.stat().st_mtime,reverse=True)
                for stale in old[32:]:stale.unlink()
                return {'filename':filename,'created_at':core.now(),'bytes':output.stat().st_size}
            except Exception:
                self.backup_error='Backup failed. Check storage and retry.'
                if output.exists():output.unlink()
                raise

    def health(self):
        backups=sorted(self.backup_dir.glob('kura-*.sqlite3'),key=lambda p:p.stat().st_mtime,reverse=True) if self.backup_dir.exists() else []
        return {'service':'healthy','database':'connected','environment':self.environment,'uptime_seconds':round(time.time()-self.started),'backup':{'status':'failed' if self.backup_error else 'completed' if backups else 'not_yet_created','last_completed':datetime.fromtimestamp(backups[0].stat().st_mtime,timezone.utc).isoformat() if backups else None,'error':self.backup_error,'interval_minutes':15,'retained':32},'transport':'TLS' if self.tls else 'Local HTTP — loopback only','encryption_at_rest':'Filesystem permissions; disk encryption is configured by the host','external_integrations':'Not connected','email':'Not configured','sso':'Not implemented; identity provider required','mfa':'External identity provider integration required'}

class Handler(BaseHTTPRequestHandler):
    server_version='Kura/1.0'
    def log_message(self,format,*args):
        # No request bodies, cookies, query values or credentials in logs.
        if args and isinstance(args[0],str):print(f'Kura {self.command} {urlparse(self.path).path} {args[1] if len(args)>1 else ""}',flush=True)

    def headers_common(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','same-origin')
        self.send_header('X-Frame-Options','DENY')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")

    def response(self,data,status=200,token=None,clear_cookie=False):
        body=json.dumps(data,ensure_ascii=False,allow_nan=False).encode()
        self.send_response(status)
        self.headers_common()
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        if token:self.send_header('Set-Cookie',f'kura_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'+('; Secure' if self.server.tls else ''))
        if clear_cookie:self.send_header('Set-Cookie','kura_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def binary(self,body,content_type,filename=None):
        self.send_response(200)
        self.headers_common()
        self.send_header('Content-Type',content_type)
        self.send_header('Cache-Control','no-store')
        if filename:self.send_header('Content-Disposition',f'attachment; filename="{filename}"')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def guard(self,write=False):
        host=self.headers.get('Host','')
        expected={f'localhost:{self.server.server_port}',f'127.0.0.1:{self.server.server_port}',f'{self.server.server_name}:{self.server.server_port}'}
        if self.server.tls:
            allowed=os.environ.get('KURA_ALLOWED_HOSTS','')
            expected.update(x.strip() for x in allowed.split(',') if x.strip())
        if host not in expected:raise security.AuthError('Unrecognized host.',403,'host_rejected')
        origin=self.headers.get('Origin')
        if origin and origin!=f'{"https" if self.server.tls else "http"}://{host}':raise security.AuthError('Cross-origin requests are not allowed.',403,'origin_rejected')
        if self.headers.get('Sec-Fetch-Site')=='cross-site':raise security.AuthError('Cross-site requests are not allowed.',403,'origin_rejected')
        with self.server.request_lock:
            peer=self.client_address[0]
            start,count=self.server.request_windows.get(peer,(time.time(),0))
            if time.time()-start>=60:start,count=time.time(),0
            if count>=600:raise security.AuthError('Too many requests. Retry shortly.',429,'rate_limit')
            self.server.request_windows[peer]=(start,count+1)

    def credentials(self):
        cookie=cookies.SimpleCookie()
        try:cookie.load(self.headers.get('Cookie',''))
        except cookies.CookieError:pass
        token=cookie['kura_session'].value if 'kura_session' in cookie else None
        auth=self.headers.get('Authorization','')
        api=auth[7:] if auth.startswith('Bearer ') else None
        return token,api

    def context(self,conn,write=False):
        ctx=security.authenticate(conn,*self.credentials())
        if write and not ctx['api_key_id']:
            if not secrets.compare_digest(self.headers.get('X-CSRF-Token',''),ctx['csrf']):raise security.AuthError('Refresh this page and try again.',403,'csrf')
        return ctx

    def read_json(self):
        if self.headers.get_content_type()!='application/json':raise core.DomainError('Send JSON with Content-Type application/json.',415,'content_type')
        try:size=int(self.headers.get('Content-Length','0'))
        except ValueError:raise core.DomainError('Invalid request size.')
        if not 0<size<=MAX_BODY:raise core.DomainError('Request is empty or exceeds the 8 MB limit.',413,'body_size')
        try:data=json.loads(self.rfile.read(size),parse_constant=lambda x:(_ for _ in ()).throw(ValueError('Non-finite number')))
        except (ValueError,UnicodeDecodeError):raise core.DomainError('Request contains invalid JSON.')
        if not isinstance(data,dict):raise core.DomainError('Send a JSON object.')
        return data

    def dispatch_error(self,error):
        if isinstance(error,(core.DomainError,security.AuthError)):
            self.response({'error':str(error),'code':error.code,'details':getattr(error,'details',None)},error.status)
        elif isinstance(error,sqlite3.IntegrityError):
            self.response({'error':'This change conflicts with an existing record or protected history. Refresh and review it.','code':'conflict'},409)
        elif isinstance(error,sqlite3.OperationalError):
            self.response({'error':'The database is busy or unavailable. Retry the same operation shortly.','code':'database_unavailable'},503)
        else:
            import traceback
            traceback.print_exc()
            self.response({'error':'The request could not be completed. No partial stock change was committed.','code':'internal_error'},500)

    def do_GET(self):
        try:
            self.guard()
            url=urlparse(self.path)
            if not url.path.startswith('/api/'):
                self.static(url.path)
                return
            with connect(self.server.db_path) as conn:
                if url.path=='/api/v1/session':
                    setup=conn.execute('SELECT COUNT(*) FROM tenants').fetchone()[0]==0
                    try:ctx=self.context(conn)
                    except security.AuthError:ctx=None
                    self.response({'setup_required':setup,'user':ctx['user'] if ctx else None,'csrf':ctx['csrf'] if ctx else None,'permissions':all_commands(ctx) if ctx else [],'environment':self.server.environment})
                    return
                ctx=self.context(conn)
                if url.path=='/api/v1/request-outcome':
                    key=parse_qs(url.query).get('key',[''])[0]
                    self.response(request_outcome(conn,ctx,key))
                    return
                if url.path=='/api/v1/state':
                    security.require(ctx,'inventory.read')
                    conn.execute('BEGIN')
                    state={**core.snapshot(conn,ctx),**workflows.snapshot(conn,ctx)}
                    state['audit']=[{**dict(row),'data':json.loads(row['data'])} for row in conn.execute(
                        'SELECT id,timestamp,actor_id,action,data FROM audit_log WHERE tenant_id=? ORDER BY timestamp DESC,id DESC LIMIT 500',(ctx['tenant_id'],))] if can(ctx,'audit.view') else []
                    state['audit_limit']=500
                    if not can(ctx,'audit.view'):
                        state['ledger']=[]
                        state['audit']=[]
                    if not can(ctx,'integrations.manage'):
                        state['events']=[]
                        state['mappings']=[]
                        state['location_mappings']=[]
                        state['exceptions']=[x for x in state.get('exceptions',[]) if x.get('type')=='emergency']
                    if not can(ctx,'settings.manage'):
                        state['settings']=[x for x in state.get('settings',[]) if x['id'] in ('organization','features','appearance')]
                    state.update(user=ctx['user'],permissions=all_commands(ctx),health=self.server.health())
                    link=connectors.public_state(conn,ctx['tenant_id'])
                    state['connectors']=[link] if can(ctx,'integrations.manage') else []
                    state['health']['external_integrations']=('Treatment Sheets connected' if link['connected'] and link['enabled'] else 'Treatment Sheets paused' if link['connected'] else 'Not connected')
                    if can(ctx,'users.manage'):
                        state['users']=[{**security.public_user(x),'permissions':json.loads(x['permissions'])} for x in conn.execute('SELECT * FROM users WHERE tenant_id=? ORDER BY name',(ctx['tenant_id'],))]
                    else:state['users']=[]
                    state['api_keys']=[dict(x) for x in conn.execute('SELECT id,name,permissions,active,created_at FROM api_keys WHERE tenant_id=?',(ctx['tenant_id'],))] if can(ctx,'integrations.manage') else []
                    state['roles']=security.ROLE_PERMISSIONS
                    state['available_permissions']=sorted(KNOWN_PERMISSIONS)
                    conn.execute('COMMIT')
                    self.response(state)
                    return
                if url.path=='/api/v1/export':
                    kind=parse_qs(url.query).get('kind',['items'])[0]
                    if kind not in ('items','ledger','balances'):raise core.DomainError('Choose items, balances, or ledger.')
                    security.require(ctx,'audit.view' if kind=='ledger' else 'inventory.read')
                    rows=core.snapshot(conn,ctx).get(kind,[])
                    output=io.StringIO()
                    keys=list(dict.fromkeys(k for r in rows for k in r))
                    writer=csv.DictWriter(output,fieldnames=keys);writer.writeheader()
                    def clean(v):
                        text=json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else '' if v is None else str(v)
                        return "'"+text if text.startswith(('=','+','-','@','\t','\r')) else text
                    for r in rows:writer.writerow({k:clean(v) for k,v in r.items()})
                    self.binary(output.getvalue().encode('utf-8-sig'),'text/csv; charset=utf-8',f'kura-{kind}.csv')
                    return
                if url.path=='/api/v1/backup':
                    security.require(ctx,'backups.manage')
                    # A full database backup is instance-wide; restrict in multi-tenant hosts.
                    if conn.execute('SELECT COUNT(*) FROM tenants').fetchone()[0]>1:raise security.AuthError('Instance backups are restricted to the host operator in multi-organization deployments.',403,'forbidden')
                    result=self.server.make_backup()
                    self.binary((self.server.backup_dir/result['filename']).read_bytes(),'application/vnd.sqlite3',result['filename'])
                    return
                raise core.DomainError('Endpoint not found.',404,'not_found')
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception as error:self.dispatch_error(error)

    def do_POST(self):
        try:
            self.guard(True)
            p=self.read_json()
            path=urlparse(self.path).path
            with connect(self.server.db_path) as conn:
                if path=='/api/v1/setup':
                    conn.execute('BEGIN IMMEDIATE')
                    try:
                        if conn.execute('SELECT COUNT(*) FROM tenants').fetchone()[0]:raise core.DomainError('This installation has already been set up.',409,'already_setup')
                        organization=str(p.get('organization','')).strip();hospital=str(p.get('hospital','')).strip()
                        if not organization or not hospital or len(organization)>200 or len(hospital)>200:raise core.DomainError('Enter organization and hospital names.')
                        tenant=core.new_id()
                        conn.execute('INSERT INTO tenants VALUES(?,?,?,?)',(tenant,organization,hospital,core.now()))
                        user=security.create_user(conn,tenant,p.get('name'),p.get('email'),p.get('password'))
                        ctx={'tenant_id':tenant,'user_id':user['id'],'role':'administrator','permissions':['*']}
                        location=core.handle(conn,ctx,'location.save',{'name':hospital,'type':'hospital','status':'active'})
                        core.save_obj(conn,tenant,'setting',{'id':'organization','data':{'name':organization,'hospital':hospital,'hospital_location_id':location['id'],'setup_steps':{},'go_live':False}})
                        core.audit(conn,ctx,'organization.setup',{'organization':organization,'hospital':hospital})
                        token,csrf=security.create_session(conn,user)
                        conn.execute('COMMIT')
                    except Exception:
                        conn.execute('ROLLBACK');raise
                    self.response({'user':security.public_user(user),'csrf':csrf,'setup_required':False,'permissions':['*']},201,token)
                    return
                if path=='/api/v1/login':
                    try:token,result=security.login(conn,p.get('email'),p.get('password'),self.client_address[0])
                    finally:
                        if conn.in_transaction:conn.commit()
                    self.response(result,token=token)
                    return
                ctx=self.context(conn,True)
                if path=='/api/v1/request-cancel':
                    self.response(request_outcome(conn,ctx,p.get('key'),cancel=True))
                    return
                if path=='/api/v1/logout':
                    token,_=self.credentials()
                    conn.execute('DELETE FROM sessions WHERE token_hash=?',(security.digest(token or ''),))
                    self.response({'signed_out':True},clear_cookie=True)
                    return
                if path=='/api/v1/command':
                    backup_result=None
                    if p.get('command')=='backup.create':
                        security.require(ctx,'backups.manage')
                        if conn.execute('SELECT COUNT(*) FROM tenants').fetchone()[0]>1:raise security.AuthError('Instance backups require the host operator.',403,'forbidden')
                        backup_result=self.server.make_backup()
                    result=execute_command(conn,ctx,p.get('command'),p.get('payload',{}),p.get('key'),backup_result)
                    self.response({'result':result})
                    return
                if path=='/api/v1/connector':
                    security.require(ctx,'integrations.manage')
                    if ctx['api_key_id']:raise security.AuthError('Connect Treatment Sheets from a signed-in administrator session.',403,'forbidden')
                    action=p.get('action')
                    if conn.in_transaction:conn.commit()
                    if action=='connect':
                        try:link=connectors.connect_account(conn,ctx,p)
                        except connectors.ConnectorError as err:raise core.DomainError(str(err),400,err.code)
                    elif action=='pause':link=connectors.set_enabled(conn,ctx,False)
                    elif action=='resume':link=connectors.set_enabled(conn,ctx,True)
                    elif action=='disconnect':link=connectors.disconnect(conn,ctx)
                    elif action=='sync':link=None
                    else:raise core.DomainError('Choose connect, pause, resume, disconnect or sync.')
                    summary=None
                    if action in ('connect','sync','resume'):
                        summary=self.server.connectors.run_once(ctx['tenant_id'],force=True)
                        link=connectors.public_state(conn,ctx['tenant_id'])
                    self.response({'connector':link,'summary':summary})
                    return
                if path=='/api/v1/inventory-events':
                    security.require(ctx,'integrations.manage')
                    # Event engine separately deduplicates source/event_id; transport
                    # key is per request so failed mapping events can later be retried.
                    result=execute_command(conn,ctx,'integration.event',p,'event-'+str(uuid.uuid4()))
                    self.response({'result':result},202 if result.get('status') in ('failed','needs_review') else 200)
                    return
                raise core.DomainError('Endpoint not found.',404,'not_found')
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception as error:self.dispatch_error(error)

    def static(self,path):
        decoded=unquote(path)
        if decoded=='/':decoded='/index.html'
        file=(WEB/decoded.lstrip('/')).resolve()
        if not file.is_relative_to(WEB) or not file.is_file():
            self.response({'error':'File not found.','code':'not_found'},404);return
        body=file.read_bytes()
        self.send_response(200);self.headers_common()
        content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
        if file.suffix=='.js':content_type='application/javascript'
        self.send_header('Content-Type',content_type)
        self.send_header('Cache-Control','no-cache')
        self.send_header('Content-Length',str(len(body)))
        if file.name=='sw.js':self.send_header('Service-Worker-Allowed','/')
        self.end_headers();self.wfile.write(body)

def main():
    parser=argparse.ArgumentParser(description='Run Kura standalone inventory')
    parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8769)
    parser.add_argument('--db',type=Path,default=ROOT/'data'/'kura.sqlite3')
    parser.add_argument('--environment',choices=['development','testing','staging','production'],default='development')
    parser.add_argument('--tls-cert');parser.add_argument('--tls-key')
    args=parser.parse_args()
    if args.host not in ('127.0.0.1','localhost','::1') and not (args.tls_cert and args.tls_key):parser.error('Remote binding requires --tls-cert and --tls-key. Keep local mode on loopback.')
    os.umask(0o077)
    initialize(args.db)
    server=KuraServer((args.host,args.port),args.db,args.environment,bool(args.tls_cert))
    if args.tls_cert:
        context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.minimum_version=ssl.TLSVersion.TLSv1_2;context.load_cert_chain(args.tls_cert,args.tls_key)
        server.socket=context.wrap_socket(server.socket,server_side=True)
    def backup_loop():
        while True:
            time.sleep(900)
            try:server.make_backup()
            except Exception:print('Scheduled backup failed. See System Health.',flush=True)
    threading.Thread(target=backup_loop,daemon=True).start()
    server.connectors.start()
    print(f'Kura ready at {"https" if server.tls else "http"}://{args.host}:{server.server_port}; environment={args.environment}',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
