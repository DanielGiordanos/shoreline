"""Authentication and server-side authorization. No frontend trust decisions."""
import hashlib
import hmac
import json
import re
import secrets
import time
import uuid
from datetime import datetime, timezone

ROLE_PERMISSIONS = {
    'viewer': ['inventory.read', 'audit.view'],
    'clinical': ['inventory.read', 'inventory.consume', 'inventory.use', 'inventory.reserve', 'inventory.emergency', 'audit.view'],
    'associate': ['inventory.read', 'inventory.consume', 'inventory.use', 'inventory.receive', 'inventory.transfer', 'inventory.count', 'inventory.reserve', 'inventory.emergency', 'barcode.manage', 'audit.view'],
    'purchasing': ['inventory.read', 'purchase.manage', 'purchase.approve', 'vendor.edit', 'inventory.receive', 'audit.view'],
    'manager': ['inventory.read', 'inventory.consume', 'inventory.use', 'inventory.receive', 'inventory.transfer', 'inventory.count', 'inventory.reserve', 'inventory.emergency', 'inventory.adjust', 'inventory.reverse', 'inventory.manage', 'item.edit', 'barcode.manage', 'location.configure', 'vendor.edit', 'category.edit', 'lot.manage', 'purchase.manage', 'purchase.approve', 'integrations.manage', 'audit.view'],
    'administrator': ['*'],
}

class AuthError(Exception):
    def __init__(self, message, status=401, code='authentication'):
        super().__init__(message)
        self.status = status
        self.code = code

def initialize(conn):
    conn.executescript('''
    CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY, name TEXT NOT NULL, hospital TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, permissions TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at REAL NOT NULL, last_seen REAL NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS api_keys(id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, permissions TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts(identity TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS command_requests(tenant_id TEXT NOT NULL, request_key TEXT NOT NULL, actor_id TEXT NOT NULL, payload_hash TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(tenant_id,request_key));
    CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    ''')
    conn.execute('INSERT OR IGNORE INTO migrations VALUES(1,?)', (datetime.now(timezone.utc).isoformat(),))

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def password_hash(password):
    if not isinstance(password, str) or len(password) < 12 or len(password) > 1024:
        raise AuthError('Use a password between 12 and 1,024 characters.', 400, 'validation')
    salt = secrets.token_bytes(16)
    result = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 600000)
    return f'pbkdf2_sha256$600000${salt.hex()}${result.hex()}'

def verify_password(password, saved):
    try:
        scheme, rounds, salt, expected = saved.split('$')
        if scheme != 'pbkdf2_sha256' or not isinstance(password, str) or len(password) > 1024:
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

def email_address(value):
    value = str(value or '').strip().casefold()
    if len(value) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
        raise AuthError('Enter a valid email address.', 400, 'validation')
    return value

def permissions(user):
    if user['role'] not in ROLE_PERMISSIONS:
        return []
    extras = json.loads(user['permissions'] or '[]')
    return sorted(set(ROLE_PERMISSIONS[user['role']] + extras))

def public_user(user):
    return {k: user[k] for k in ('id', 'tenant_id', 'email', 'name', 'role', 'active')}

def require(ctx, permission):
    if '*' not in ctx['permissions'] and permission not in ctx['permissions']:
        raise AuthError('Your role does not allow this action.', 403, 'forbidden')

def create_user(conn, tenant_id, name, email, password, role='administrator', extra=None):
    if role not in ROLE_PERMISSIONS:
        raise AuthError('Choose a valid role.', 400, 'validation')
    name = str(name or '').strip()
    if not name or len(name) > 200:
        raise AuthError('Enter an employee name.', 400, 'validation')
    email = email_address(email)
    if conn.execute('SELECT 1 FROM users WHERE email=?', (email,)).fetchone():
        raise AuthError('An account with that email already exists.', 409, 'conflict')
    user_id = str(uuid.uuid4())
    stamp = datetime.now(timezone.utc).isoformat()
    conn.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?,?,?)', (user_id, tenant_id, email, name, password_hash(password), role, json.dumps(extra or []), 1, stamp, stamp))
    return conn.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()

def create_session(conn, user):
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    stamp = time.time()
    conn.execute('DELETE FROM sessions WHERE expires_at<? OR last_seen<?', (stamp, stamp-3600))
    conn.execute('INSERT INTO sessions VALUES(?,?,?,?,?)', (digest(token), user['id'], csrf, stamp+28800, stamp))
    return token, csrf

def authenticate(conn, token=None, api_token=None):
    stamp = time.time()
    if api_token:
        key = conn.execute('SELECT * FROM api_keys WHERE token_hash=? AND active=1', (digest(api_token),)).fetchone()
        if not key:
            raise AuthError('Invalid or revoked API key.')
        user = conn.execute('SELECT * FROM users WHERE id=? AND active=1', (key['user_id'],)).fetchone()
        if not user:
            raise AuthError('The API key owner is inactive.')
        return {'tenant_id':key['tenant_id'], 'user_id':user['id'], 'role':'integration', 'permissions':json.loads(key['permissions']), 'user':public_user(user), 'csrf':None, 'api_key_id':key['id']}
    if not token:
        raise AuthError('Sign in to continue.')
    session = conn.execute('SELECT * FROM sessions WHERE token_hash=?', (digest(token),)).fetchone()
    if not session or session['expires_at'] < stamp or session['last_seen'] < stamp-3600:
        raise AuthError('Your session expired. Sign in again.')
    user = conn.execute('SELECT * FROM users WHERE id=? AND active=1', (session['user_id'],)).fetchone()
    if not user:
        raise AuthError('Your account is inactive.')
    conn.execute('UPDATE sessions SET last_seen=? WHERE token_hash=?', (stamp, digest(token)))
    return {'tenant_id':user['tenant_id'], 'user_id':user['id'], 'role':user['role'], 'permissions':permissions(user), 'user':public_user(user), 'csrf':session['csrf'], 'api_key_id':None}

def login(conn, email, password, peer='local'):
    identity = digest(peer + ':' + str(email).casefold())
    stamp = time.time()
    attempt = conn.execute('SELECT * FROM login_attempts WHERE identity=?', (identity,)).fetchone()
    if attempt and stamp-attempt['window_start'] < 300 and attempt['attempts'] >= 8:
        raise AuthError('Too many sign-in attempts. Try again in five minutes.', 429, 'rate_limit')
    if not attempt or stamp-attempt['window_start'] >= 300:
        conn.execute('INSERT OR REPLACE INTO login_attempts VALUES(?,0,?)', (identity, stamp))
    user = conn.execute('SELECT * FROM users WHERE email=? AND active=1', (str(email).strip().casefold(),)).fetchone()
    valid = user is not None and verify_password(password, user['password_hash'])
    if not valid:
        conn.execute('UPDATE login_attempts SET attempts=attempts+1 WHERE identity=?', (identity,))
        # Persistent attempt counters are committed by the login endpoint, including failure.
        raise AuthError('Email or password is incorrect.')
    conn.execute('DELETE FROM login_attempts WHERE identity=?', (identity,))
    token, csrf = create_session(conn, user)
    return token, {'user':public_user(user), 'csrf':csrf, 'permissions':permissions(user)}
