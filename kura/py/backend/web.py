"""Kura in the browser (Pyodide) — the same engine and gateway, with Firebase as the shared, ordered history.

How it works
- Every device keeps a full SQLite copy of the workspace in memory (this module), built from a checkpoint and the
  ordered log in Firestore kura/{space}/log/{seq}.
- A change is computed on the device that makes it, by the unchanged engine (core, workflows, server.execute_command)
  inside an outer transaction. Triggers record every row it inserted, updated or deleted (_kchg). The browser then
  commits those row changes as the next log entry in a Firestore transaction on the head document — so all devices see
  one order. Only if that commit succeeds is the local transaction committed; otherwise it is rolled back and the device
  catches up and recomputes.
- Other devices apply the recorded rows exactly (apply_changes). They never re-run the logic, so replay cannot diverge.
- Accounts: Firebase signs people in. Kura keeps one user row per allowed email; no Kura passwords exist here.
"""
from __future__ import annotations

import csv
import io
import json
import sys
import types

try:  # server.py imports ssl for its HTTPS listener; the browser never listens.
    import ssl  # noqa: F401
except ImportError:  # pragma: no cover - Pyodide
    sys.modules['ssl'] = types.ModuleType('ssl')

import sqlite3

from . import connectors, core, security, server, workflows

ENGINE_VERSION = 'kura-web-1'
TABLES = {  # table -> primary key columns. Every row change in these tables is shared.
    'tenants': ('id',),
    'users': ('id',),
    'objects': ('tenant_id', 'kind', 'id'),
    'barcodes': ('tenant_id', 'barcode'),
    'ledger': ('tenant_id', 'id'),
    'audit_log': ('tenant_id', 'id'),
    'command_requests': ('tenant_id', 'request_key'),
    'request_cancellations': ('tenant_id', 'request_key'),
}
APPEND_ONLY = {'ledger', 'audit_log'}
WEB_BLOCKED = {'user.save', 'user.revoke', 'key.create', 'key.revoke', 'backup.create'}   # Firebase owns accounts; backups are a download
_conn = None
_outer = False


class _SavepointConnection:
    """execute_command opens BEGIN IMMEDIATE/COMMIT; inside the outer transaction those become a named savepoint."""

    def __init__(self, conn):
        self._c = conn

    def execute(self, sql, *args):
        s = sql.strip().upper()
        if s.startswith('BEGIN'):
            return self._c.execute('SAVEPOINT kweb_cmd')
        if s == 'COMMIT':
            return self._c.execute('RELEASE kweb_cmd')
        if s == 'ROLLBACK':
            self._c.execute('ROLLBACK TO kweb_cmd')
            return self._c.execute('RELEASE kweb_cmd')
        return self._c.execute(sql, *args)

    def __getattr__(self, name):
        return getattr(self._c, name)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _columns(conn, table):
    return [r[1] for r in conn.execute(f'PRAGMA table_info({table})')]


def _install_change_log(conn, temp=True):
    conn.execute('CREATE TABLE IF NOT EXISTS _kchg(seq INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, op TEXT NOT NULL, row TEXT NOT NULL)')
    conn.execute('CREATE TABLE IF NOT EXISTS _kmeta(k TEXT PRIMARY KEY, v TEXT NOT NULL)')
    for table in TABLES:
        cols = _columns(conn, table)
        new = 'json_object(' + ','.join(f"'{c}',NEW.{c}" for c in cols) + ')'
        old = 'json_object(' + ','.join(f"'{c}',OLD.{c}" for c in cols) + ')'
        kind = 'TEMP TRIGGER' if temp else 'TRIGGER'
        conn.execute(f"CREATE {kind} IF NOT EXISTS kchg_{table}_i AFTER INSERT ON {table} BEGIN INSERT INTO _kchg(tbl,op,row) VALUES('{table}','i',{new}); END")
        if table not in APPEND_ONLY:
            conn.execute(f"CREATE {kind} IF NOT EXISTS kchg_{table}_u AFTER UPDATE ON {table} BEGIN INSERT INTO _kchg(tbl,op,row) VALUES('{table}','u',{new}); END")
            conn.execute(f"CREATE {kind} IF NOT EXISTS kchg_{table}_d AFTER DELETE ON {table} BEGIN INSERT INTO _kchg(tbl,op,row) VALUES('{table}','d',{old}); END")


def _schema(conn):
    security.initialize(conn)
    core.initialize(conn)
    conn.execute('''CREATE TABLE IF NOT EXISTS request_cancellations (
        tenant_id TEXT NOT NULL,request_key TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL,
        PRIMARY KEY(tenant_id,request_key))''')


def open_db(data=None):
    """Start from nothing, or from a checkpoint (bytes of a serialized SQLite database)."""
    global _conn, _outer
    conn = sqlite3.connect(':memory:', isolation_level=None)
    conn.row_factory = sqlite3.Row
    if data:
        conn.deserialize(bytes(data))
    conn.execute('PRAGMA foreign_keys=ON')
    _schema(conn)
    _install_change_log(conn)
    conn.execute('DELETE FROM _kchg')
    _conn, _outer = conn, False
    return {'seq': seq(), 'engine': ENGINE_VERSION}


def serialize():
    if _outer:
        raise RuntimeError('Cannot checkpoint during a change.')
    return _conn.serialize()


def seq():
    row = _conn.execute("SELECT v FROM _kmeta WHERE k='seq'").fetchone()
    return int(row[0]) if row else 0


def _set_seq(n):
    _conn.execute("INSERT OR REPLACE INTO _kmeta VALUES('seq',?)", (str(int(n)),))


# ---------- one change at a time: begin → compute → (browser commits to Firestore) → commit or roll back ----------
def _begin():
    global _outer
    if _outer:
        raise RuntimeError('A change is already in progress.')
    _conn.execute('BEGIN IMMEDIATE')
    _conn.execute('DELETE FROM _kchg')
    _outer = True


def _changes():
    return [{'t': r['tbl'], 'o': r['op'], 'r': json.loads(r['row'])} for r in _conn.execute('SELECT tbl,op,row FROM _kchg ORDER BY seq')]


def finish(ok, new_seq=None):
    """ok=True after the log entry is safely in Firestore; ok=False to undo the computed change."""
    global _outer
    if not _outer:
        return {'ok': False}
    try:
        if ok:
            _set_seq(new_seq)
            _conn.execute('DELETE FROM _kchg')
            _conn.execute('COMMIT')
        else:
            _conn.execute('ROLLBACK')
    finally:
        _outer = False
    return {'ok': True, 'seq': seq()}


def _mutate(fn):
    """Run fn inside the outer transaction. Returns {result, changes} — or {error} with nothing left changed."""
    _begin()
    try:
        result = fn(_SavepointConnection(_conn))
    except (core.DomainError, security.AuthError) as err:
        finish(False)
        return {'error': {'message': str(err), 'code': getattr(err, 'code', 'validation'), 'status': getattr(err, 'status', 400),
                          'details': getattr(err, 'details', None)}}
    except Exception:
        finish(False)
        raise
    changes = _changes()
    if not changes:   # a replayed request or a read-only outcome: nothing to share
        finish(True, seq())
        return {'result': result}
    # Kept as text end to end: the browser stores it without parsing, so large integers never pass through JavaScript numbers.
    return {'result': result, 'changes': json.dumps(changes, ensure_ascii=False, allow_nan=False, separators=(',', ':')), 'pending': True}


def apply_changes(entry_seq, changes):
    """Apply another device's recorded row changes, exactly, in order."""
    if _outer:
        raise RuntimeError('Cannot apply history during a local change.')
    if entry_seq != seq() + 1:
        raise ValueError(f'Out of order: have {seq()}, got {entry_seq}')
    _conn.execute('BEGIN IMMEDIATE')
    try:
        for ch in changes:
            table, op, row = ch['t'], ch['o'], ch['r']
            if table not in TABLES:
                raise ValueError('Unknown table ' + table)
            keys = TABLES[table]
            if op == 'd':
                _conn.execute(f'DELETE FROM {table} WHERE ' + ' AND '.join(f'{k}=?' for k in keys), [row[k] for k in keys])
            elif op == 'i' and table in APPEND_ONLY:
                cols = list(row)
                _conn.execute(f'INSERT OR IGNORE INTO {table} ({",".join(cols)}) VALUES ({",".join("?" for _ in cols)})', [row[c] for c in cols])
            else:
                cols = list(row)
                _conn.execute(f'INSERT OR REPLACE INTO {table} ({",".join(cols)}) VALUES ({",".join("?" for _ in cols)})', [row[c] for c in cols])
        _conn.execute('DELETE FROM _kchg')
        _set_seq(entry_seq)
        _conn.execute('COMMIT')
    except Exception:
        _conn.execute('ROLLBACK')
        raise
    return {'seq': seq()}


# ---------- who is signed in ----------
def _ctx(email):
    email = str(email or '').strip().casefold()
    tenant = _conn.execute('SELECT id FROM tenants ORDER BY created_at LIMIT 1').fetchone()
    if not tenant:
        raise security.AuthError('Set up Kura first.', 409, 'setup_required')
    user = _conn.execute('SELECT * FROM users WHERE email=? AND active=1', (email,)).fetchone()
    if not user:
        raise security.AuthError('This account does not have access to Kura.', 403, 'forbidden')
    return {'tenant_id': user['tenant_id'], 'user_id': user['id'], 'role': user['role'], 'permissions': security.permissions(user),
            'user': security.public_user(user), 'csrf': None, 'api_key_id': None}


def _permissions(ctx):
    # '*' is spelled out so the page hides what the web version cannot do (accounts and API keys live in Firebase).
    names = set(server.all_commands(ctx))
    if '*' in names:
        names |= set(server.KNOWN_PERMISSIONS)
    return sorted(p for p in names if p != '*' and p not in WEB_BLOCKED)


def session(email):
    setup = _conn.execute('SELECT COUNT(*) FROM tenants').fetchone()[0] == 0
    if setup:
        return {'setup_required': True, 'user': None, 'permissions': [], 'environment': 'production'}
    ctx = _ctx(email)
    return {'setup_required': False, 'user': ctx['user'], 'csrf': 'firebase', 'permissions': _permissions(ctx), 'environment': 'production'}


def setup(email, name, organization, hospital):
    """First run: one organization, one hospital location, one administrator — the signed-in Firebase account."""
    email = security.email_address(email)
    def go(conn):
        if conn.execute('SELECT COUNT(*) FROM tenants').fetchone()[0]:
            raise core.DomainError('This workspace has already been set up.', 409, 'already_setup')
        org, hosp, person = str(organization or '').strip(), str(hospital or '').strip(), str(name or '').strip()
        if not org or not hosp or len(org) > 200 or len(hosp) > 200:
            raise core.DomainError('Enter organization and hospital names.')
        if not person or len(person) > 200:
            raise core.DomainError('Enter your name.')
        tenant, user_id, stamp = core.new_id(), core.new_id(), core.now()
        conn.execute('INSERT INTO tenants VALUES(?,?,?,?)', (tenant, org, hosp, stamp))
        # No Kura password exists in the browser version: sign-in is Firebase's. This hash can never match a password.
        conn.execute('INSERT INTO users VALUES(?,?,?,?,?,?,?,?,?,?)', (user_id, tenant, email, person, '!firebase-sign-in', 'administrator', '[]', 1, stamp, stamp))
        ctx = {'tenant_id': tenant, 'user_id': user_id, 'role': 'administrator', 'permissions': ['*']}
        location = core.handle(conn, ctx, 'location.save', {'name': hosp, 'type': 'hospital', 'status': 'active'})
        core.save_obj(conn, tenant, 'setting', {'id': 'organization', 'data': {'name': org, 'hospital': hosp, 'hospital_location_id': location['id'], 'setup_steps': {}, 'go_live': False}})
        core.audit(conn, ctx, 'organization.setup', {'organization': org, 'hospital': hosp, 'sign_in': 'firebase'})
        user = conn.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
        return {'user': security.public_user(user), 'csrf': 'firebase', 'setup_required': False, 'permissions': _permissions(ctx)}
    return _mutate(go)


def command(email, name, payload, key):
    ctx = _ctx(email)
    if name in WEB_BLOCKED:
        return {'error': {'message': 'Accounts are managed in Firebase for the web version of Kura.', 'code': 'not_available', 'status': 409}}
    return _mutate(lambda conn: server.execute_command(conn, ctx, name, payload, key))


def outcome(email, key, cancel=False):
    ctx = _ctx(email)
    return _mutate(lambda conn: server.request_outcome(conn, ctx, key, cancel=cancel))


def state(email):
    ctx = _ctx(email)
    conn = _conn
    security.require(ctx, 'inventory.read')
    data = {**core.snapshot(conn, ctx), **workflows.snapshot(conn, ctx)}
    data['audit'] = [{**dict(r), 'data': json.loads(r['data'])} for r in conn.execute(
        'SELECT id,timestamp,actor_id,action,data FROM audit_log WHERE tenant_id=? ORDER BY timestamp DESC,id DESC LIMIT 500', (ctx['tenant_id'],))] if server.can(ctx, 'audit.view') else []
    data['audit_limit'] = 500
    if not server.can(ctx, 'audit.view'):
        data['ledger'], data['audit'] = [], []
    if not server.can(ctx, 'integrations.manage'):
        data['events'], data['mappings'], data['location_mappings'] = [], [], []
        data['exceptions'] = [x for x in data.get('exceptions', []) if x.get('type') == 'emergency']
    data.update(user=ctx['user'], permissions=_permissions(ctx))
    data['users'] = [{**security.public_user(x), 'permissions': json.loads(x['permissions'])} for x in conn.execute('SELECT * FROM users WHERE tenant_id=? ORDER BY name', (ctx['tenant_id'],))]
    data['api_keys'] = []
    data['roles'] = security.ROLE_PERMISSIONS
    data['available_permissions'] = sorted(server.KNOWN_PERMISSIONS)
    return data


def export_csv(email, kind):
    ctx = _ctx(email)
    if kind not in ('items', 'ledger', 'balances'):
        raise core.DomainError('Choose items, balances, or ledger.')
    security.require(ctx, 'audit.view' if kind == 'ledger' else 'inventory.read')
    rows = core.snapshot(_conn, ctx).get(kind, [])
    out = io.StringIO()
    keys = list(dict.fromkeys(k for r in rows for k in r))
    writer = csv.DictWriter(out, fieldnames=keys)
    writer.writeheader()
    def clean(v):
        text = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else '' if v is None else str(v)
        return "'" + text if text.startswith(('=', '+', '-', '@', '\t', '\r')) else text
    for r in rows:
        writer.writerow({k: clean(v) for k, v in r.items()})
    return '﻿' + out.getvalue()


def find_event(source, event_id):
    """Has Kura already recorded this source event? (Treatment Sheets link)"""
    tenant = _conn.execute('SELECT id FROM tenants ORDER BY created_at LIMIT 1').fetchone()
    if not tenant:
        return None
    found = workflows._find(_conn, tenant[0], 'event', {'source': source, 'event_id': event_id})
    return {'status': found[0]['status'], 'error': found[0].get('error')} if found else None


def event_statuses(source):
    tenant = _conn.execute('SELECT id FROM tenants ORDER BY created_at LIMIT 1').fetchone()
    if not tenant:
        return {}
    out = {}
    for obj in core.list_obj(_conn, tenant[0], 'event'):
        if obj.get('source') == source:
            err = obj.get('error') or {}
            out[obj['event_id']] = {'status': obj['status'], 'message': err.get('message') or obj.get('ignore_reason') or ''}
    return out


def ts_check(doc_id, env_text, doc_hospital, hospital):
    """The Treatment Sheets connector's own checks (connectors._envelope), on an outbox document read by the browser."""
    fields = {'env': {'stringValue': env_text}, 'written_at': {'nullValue': None}}
    if doc_hospital is not None:
        fields['hospital'] = {'stringValue': doc_hospital}
    try:
        env, _ = connectors._envelope({'name': 'kura_outbox/' + hospital + '/events/' + doc_id, 'fields': fields}, {'hospital': hospital})
    except connectors.ConnectorError as err:
        return {'error': {'message': str(err), 'code': err.code}}
    return {'env': env, 'key': 'tsconn-' + __import__('hashlib').sha256((connectors.SOURCE + ':' + env['event_id']).encode()).hexdigest()[:40]}


def rpc(op, args_json):
    """Single entry point from the browser worker: JSON in, JSON out."""
    a = json.loads(args_json or '{}')
    try:
        if op == 'session':
            out = session(a.get('email'))
        elif op == 'setup':
            out = setup(a.get('email'), a.get('name'), a.get('organization'), a.get('hospital'))
        elif op == 'command':
            out = command(a.get('email'), a.get('command'), a.get('payload') if isinstance(a.get('payload'), dict) else a.get('payload'), a.get('key'))
        elif op == 'outcome':
            out = outcome(a.get('email'), a.get('key'), bool(a.get('cancel')))
        elif op == 'state':
            out = state(a.get('email'))
        elif op == 'export':
            out = {'csv': export_csv(a.get('email'), a.get('kind'))}
        elif op == 'finish':
            out = finish(bool(a.get('ok')), a.get('seq'))
        elif op == 'apply':
            out = apply_changes(int(a['seq']), json.loads(a['changes']) if isinstance(a['changes'], str) else a['changes'])
        elif op == 'seq':
            out = {'seq': seq()}
        elif op == 'find_event':
            out = {'event': find_event(a.get('source'), a.get('event_id'))}
        elif op == 'event_statuses':
            out = {'statuses': event_statuses(a.get('source'))}
        elif op == 'ts_check':
            out = ts_check(a.get('doc_id'), a.get('env'), a.get('doc_hospital'), a.get('hospital'))
        else:
            raise core.DomainError('Unknown operation.', 404, 'not_found')
    except (core.DomainError, security.AuthError) as err:
        out = {'error': {'message': str(err), 'code': getattr(err, 'code', 'validation'), 'status': getattr(err, 'status', 400),
                         'details': getattr(err, 'details', None)}}
    return json.dumps(out, ensure_ascii=False, allow_nan=False, default=str)
