"""Pull connector: Pravix Treatment Sheets → Kura.

Treatment Sheets runs online (Firebase). Kura runs on a hospital computer. Instead of exposing Kura to the
internet, Treatment Sheets writes each charted dose as a version-1 inventory event into a Firestore outbox
(kura_outbox/{hospital}/events/{event_id}) and this connector reads that outbox over HTTPS, then hands each
envelope to Kura's normal event pipeline (integration.event) — the same validation, mappings, idempotency and
failure queue as any other producer. Nothing here changes stock directly.

Credentials: an administrator types the Treatment Sheets account email + password once. The password is used
for a single Firebase sign-in and is never stored; Kura keeps only the Firebase refresh token, in its own table,
never in state, exports or command replays. Disconnect forgets it.
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

from . import core, security, workflows

SOURCE = 'pravix-treatment'
CONNECTOR_ID = 'treatment-sheets'
ALLOWED_EVENTS = {'MedicationAdministered', 'InventoryReversed'}
# Kura IDs never come from the sheet; items and locations resolve only through explicit Kura mappings.
FORBIDDEN_FIELDS = ('item_id', 'location_id', 'lot_id', 'organization', 'tenant_id', 'hospital', 'department')
AUTO_RETRY_CODES = ['mapping_missing', 'location_mapping_missing', 'original_event_missing']
OVERLAP = timedelta(minutes=3)        # re-read a short window each pass; event IDs make re-reads harmless
PAGE = 200
DEFAULT_INTERVAL = 30


class ConnectorError(Exception):
    def __init__(self, message, code='connector'):
        super().__init__(message)
        self.code = code


def initialize(conn):
    conn.execute('''CREATE TABLE IF NOT EXISTS connectors(
        tenant_id TEXT NOT NULL, id TEXT NOT NULL, config TEXT NOT NULL, secret TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL, PRIMARY KEY(tenant_id,id))''')


# ---------- transport (replaceable in tests) ----------
class HttpTransport:
    timeout = 20

    def request(self, method, url, body=None, headers=None, form=False):
        data = None
        headers = dict(headers or {})
        if body is not None:
            if form:
                data = urllib.parse.urlencode(body).encode()
                headers['Content-Type'] = 'application/x-www-form-urlencoded'
            else:
                data = json.dumps(body).encode()
                headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                raw = res.read()
                return res.status, json.loads(raw or b'null')
        except urllib.error.HTTPError as err:
            try:
                payload = json.loads(err.read() or b'null')
            except ValueError:
                payload = None
            return err.code, payload
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            raise ConnectorError('Kura could not reach Firebase from this computer. Check the network, then sync again.', 'network') from err


def _firebase_message(payload, fallback):
    try:
        msg = (payload.get('error') or {}).get('message') or ''
    except AttributeError:
        msg = ''
    friendly = {
        'INVALID_LOGIN_CREDENTIALS': 'That email and password were not accepted by Firebase.',
        'INVALID_PASSWORD': 'That email and password were not accepted by Firebase.',
        'EMAIL_NOT_FOUND': 'That email and password were not accepted by Firebase.',
        'USER_DISABLED': 'This Firebase account is disabled.',
        'TOKEN_EXPIRED': 'The saved sign-in expired. Connect again with the account password.',
        'INVALID_REFRESH_TOKEN': 'The saved sign-in is no longer valid. Connect again with the account password.',
        'TOO_MANY_ATTEMPTS_TRY_LATER': 'Firebase is limiting sign-in attempts. Wait a few minutes.',
        'API_KEY_INVALID': 'The Firebase Web API key is not valid.',
        'PERMISSION_DENIED': 'Firestore refused access. Publish the kura_outbox rule, then sync again.',
    }
    for key, text in friendly.items():
        if msg.startswith(key) or key in msg:
            return text
    return fallback + (f' ({msg})' if msg else '')



def _host(name):
    """Real Google endpoints, or a local fake when KURA_FIREBASE_BASE is set (automated tests only)."""
    base = os.environ.get('KURA_FIREBASE_BASE')
    real = {'idt': 'https://identitytoolkit.googleapis.com', 'sts': 'https://securetoken.googleapis.com',
            'fs': 'https://firestore.googleapis.com'}
    return (base.rstrip('/') + '/' + name) if base else real[name]


class Firebase:
    def __init__(self, config, transport=None):
        self.config = config
        self.http = transport or HttpTransport()

    def sign_in(self, email, password):
        status, data = self.http.request('POST', _host('idt') + '/v1/accounts:signInWithPassword?key='
                                         + urllib.parse.quote(self.config['web_api_key']),
                                         {'email': email, 'password': password, 'returnSecureToken': True})
        if status != 200 or not data or not data.get('refreshToken'):
            raise ConnectorError(_firebase_message(data, 'Firebase sign-in failed.'), 'sign_in')
        return {'refresh_token': data['refreshToken'], 'id_token': data['idToken'], 'uid': data.get('localId'),
                'expires': time.time() + int(data.get('expiresIn', 3600)) - 120}

    def refresh(self, refresh_token):
        status, data = self.http.request('POST', _host('sts') + '/v1/token?key='
                                         + urllib.parse.quote(self.config['web_api_key']),
                                         {'grant_type': 'refresh_token', 'refresh_token': refresh_token}, form=True)
        if status != 200 or not data or not data.get('id_token'):
            raise ConnectorError(_firebase_message(data, 'Firebase did not renew the sign-in.'), 'token')
        return {'refresh_token': data.get('refresh_token') or refresh_token, 'id_token': data['id_token'],
                'uid': data.get('user_id'), 'expires': time.time() + int(data.get('expires_in', 3600)) - 120}

    def _base(self):
        return (_host('fs') + '/v1/projects/' + urllib.parse.quote(self.config['project_id'])
                + '/databases/(default)/documents')

    def outbox_query(self, id_token, since_iso):
        parent = self._base() + '/kura_outbox/' + urllib.parse.quote(self.config['hospital'], safe='')
        body = {'structuredQuery': {
            'from': [{'collectionId': 'events'}],
            'where': {'fieldFilter': {'field': {'fieldPath': 'written_at'}, 'op': 'GREATER_THAN_OR_EQUAL',
                                      'value': {'timestampValue': since_iso}}},
            'orderBy': [{'field': {'fieldPath': 'written_at'}, 'direction': 'ASCENDING'}],
            'limit': PAGE}}
        status, data = self.http.request('POST', parent + ':runQuery', body, {'Authorization': 'Bearer ' + id_token})
        if status != 200 or not isinstance(data, list):
            raise ConnectorError(_firebase_message(data if isinstance(data, dict) else (data[0] if data else None),
                                                   'Firestore did not return the Treatment Sheets outbox.'), 'query')
        return [row['document'] for row in data if isinstance(row, dict) and row.get('document')]

    def acknowledge(self, id_token, doc_name, status, message):
        url = _host('fs') + '/v1/' + doc_name + '?updateMask.fieldPaths=kura&currentDocument.exists=true'
        fields = {'status': {'stringValue': status}, 'message': {'stringValue': (message or '')[:300]},
                  'at': {'timestampValue': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')}}
        code, _ = self.http.request('PATCH', url, {'fields': {'kura': {'mapValue': {'fields': fields}}}},
                                    {'Authorization': 'Bearer ' + id_token})
        return code == 200


def _value(v):
    """Decode a Firestore REST typed value."""
    if not isinstance(v, dict):
        return None
    for key in ('stringValue', 'booleanValue', 'timestampValue', 'referenceValue'):
        if key in v:
            return v[key]
    if 'integerValue' in v:
        return int(v['integerValue'])
    if 'doubleValue' in v:
        return v['doubleValue']
    if 'nullValue' in v:
        return None
    if 'mapValue' in v:
        return {k: _value(x) for k, x in (v['mapValue'].get('fields') or {}).items()}
    if 'arrayValue' in v:
        return [_value(x) for x in v['arrayValue'].get('values') or []]
    return None


# ---------- storage ----------
def _row(conn, tenant):
    row = conn.execute('SELECT * FROM connectors WHERE tenant_id=? AND id=?', (tenant, CONNECTOR_ID)).fetchone()
    if not row:
        return None
    return {'config': json.loads(row['config']), 'secret': row['secret'], 'status': json.loads(row['status'] or '{}')}


def _write(conn, tenant, config=None, secret=None, status=None):
    current = _row(conn, tenant) or {'config': {}, 'secret': '', 'status': {}}
    config = current['config'] if config is None else config
    secret = current['secret'] if secret is None else secret
    status = current['status'] if status is None else status
    conn.execute('INSERT OR REPLACE INTO connectors VALUES(?,?,?,?,?,?)',
                 (tenant, CONNECTOR_ID, json.dumps(config), secret, json.dumps(status), core.now()))


def public_state(conn, tenant):
    """What the browser may see. Never the refresh token."""
    row = _row(conn, tenant)
    if not row:
        return {'id': CONNECTOR_ID, 'source': SOURCE, 'connected': False, 'enabled': False, 'config': {}, 'status': {}}
    c = row['config']
    return {'id': CONNECTOR_ID, 'source': SOURCE, 'connected': bool(row['secret']), 'enabled': bool(c.get('enabled')),
            'config': {k: c.get(k) for k in ('project_id', 'web_api_key', 'hospital', 'email', 'interval', 'owner_name')},
            'status': row['status']}


def _clean_config(p):
    def text(name, label, maximum=200, required=True):
        v = str(p.get(name) or '').strip()
        if required and not v:
            raise core.DomainError(f'Enter the {label}.')
        if len(v) > maximum:
            raise core.DomainError(f'{label.capitalize()} is too long.')
        return v
    cfg = {'project_id': text('project_id', 'Firebase project ID', 100),
           'web_api_key': text('web_api_key', 'Firebase Web API key', 200),
           'hospital': text('hospital', 'Treatment Sheets hospital ID', 100),
           'email': security.email_address(p.get('email'))}
    if any(ch in cfg['project_id'] + cfg['hospital'] for ch in '/?#'):
        raise core.DomainError('Project and hospital IDs cannot contain / ? or #.')
    try:
        interval = int(p.get('interval') or DEFAULT_INTERVAL)
    except (TypeError, ValueError):
        interval = DEFAULT_INTERVAL
    cfg['interval'] = max(15, min(600, interval))
    return cfg


# ---------- actions (called by the HTTP gateway, outside any DB transaction while the network is used) ----------
def connect_account(conn, ctx, p, transport=None):
    security.require(ctx, 'integrations.manage')
    cfg = _clean_config(p)
    password = p.get('password')
    row = _row(conn, ctx['tenant_id'])
    keep_secret = row and row['secret'] and not password and row['config'].get('email') == cfg['email'] \
        and row['config'].get('project_id') == cfg['project_id']
    if not keep_secret:
        if not isinstance(password, str) or not password:
            raise core.DomainError('Enter the Treatment Sheets account password to connect. Kura uses it once and does not keep it.')
        token = Firebase(cfg, transport).sign_in(cfg['email'], password)
        secret, uid = token['refresh_token'], token['uid']
    else:
        secret, uid = row['secret'], row['status'].get('uid')
    cfg.update(enabled=p.get('enabled', True) is not False, owner_user_id=ctx['user_id'],
               owner_name=(ctx.get('user') or {}).get('name'))
    status = {**(row['status'] if row else {}), 'uid': uid, 'connected_at': core.now(), 'last_error': None}
    if not row or row['config'].get('hospital') != cfg['hospital'] or row['config'].get('project_id') != cfg['project_id']:
        status['cursor'] = None
    conn.execute('BEGIN IMMEDIATE')
    try:
        _write(conn, ctx['tenant_id'], cfg, secret, status)
        core.audit(conn, ctx, 'connector.connected', {'connector': CONNECTOR_ID, 'project_id': cfg['project_id'],
                                                      'hospital': cfg['hospital'], 'email': cfg['email']})
        conn.execute('COMMIT')
    except Exception:
        conn.execute('ROLLBACK')
        raise
    return public_state(conn, ctx['tenant_id'])


def set_enabled(conn, ctx, enabled):
    security.require(ctx, 'integrations.manage')
    row = _row(conn, ctx['tenant_id'])
    if not row:
        raise core.DomainError('Connect Treatment Sheets first.')
    cfg = {**row['config'], 'enabled': bool(enabled)}
    conn.execute('BEGIN IMMEDIATE')
    try:
        _write(conn, ctx['tenant_id'], cfg)
        core.audit(conn, ctx, 'connector.' + ('resumed' if enabled else 'paused'), {'connector': CONNECTOR_ID})
        conn.execute('COMMIT')
    except Exception:
        conn.execute('ROLLBACK')
        raise
    return public_state(conn, ctx['tenant_id'])


def disconnect(conn, ctx):
    security.require(ctx, 'integrations.manage')
    row = _row(conn, ctx['tenant_id'])
    if not row:
        return public_state(conn, ctx['tenant_id'])
    conn.execute('BEGIN IMMEDIATE')
    try:
        _write(conn, ctx['tenant_id'], {**row['config'], 'enabled': False}, '', {**row['status'], 'disconnected_at': core.now()})
        core.audit(conn, ctx, 'connector.disconnected', {'connector': CONNECTOR_ID})
        conn.execute('COMMIT')
    except Exception:
        conn.execute('ROLLBACK')
        raise
    return public_state(conn, ctx['tenant_id'])


def _owner_ctx(conn, tenant, cfg):
    user = conn.execute('SELECT * FROM users WHERE id=? AND tenant_id=? AND active=1', (cfg.get('owner_user_id'), tenant)).fetchone()
    if not user:
        raise ConnectorError('The Kura employee who connected Treatment Sheets is inactive. An administrator must connect again.', 'owner')
    ctx = {'tenant_id': tenant, 'user_id': user['id'], 'role': user['role'], 'permissions': security.permissions(user),
           'user': security.public_user(user), 'csrf': None, 'api_key_id': None, 'connector': CONNECTOR_ID}
    try:
        security.require(ctx, 'integrations.manage')
    except security.AuthError:
        raise ConnectorError('The Kura employee who connected Treatment Sheets no longer has integration permission.', 'owner')
    return ctx


def _envelope(doc, cfg):
    """Turn one outbox document into the exact version-1 envelope, or explain why it is unusable."""
    fields = {k: _value(v) for k, v in (doc.get('fields') or {}).items()}
    raw = fields.get('env')
    if not isinstance(raw, str):
        raise ConnectorError('Outbox document has no event envelope.', 'malformed')
    try:
        env = json.loads(raw)
    except ValueError:
        raise ConnectorError('Outbox event envelope is not valid JSON.', 'malformed')
    if not isinstance(env, dict):
        raise ConnectorError('Outbox event envelope must be an object.', 'malformed')
    doc_id = doc['name'].rsplit('/', 1)[-1]
    if env.get('event_id') != doc_id:
        raise ConnectorError('Outbox document ID does not match its event ID.', 'malformed')
    if env.get('source') != SOURCE:
        raise ConnectorError(f'Only {SOURCE} events are read from this outbox.', 'wrong_source')
    if env.get('event_type') not in ALLOWED_EVENTS:
        raise ConnectorError('Treatment Sheets may send only MedicationAdministered and InventoryReversed.', 'wrong_type')
    if fields.get('hospital') not in (None, cfg['hospital']):
        raise ConnectorError('Outbox event belongs to another hospital.', 'wrong_hospital')
    for name in FORBIDDEN_FIELDS:
        if name in env:
            raise ConnectorError(f'Treatment Sheets events cannot set {name}; Kura resolves it through a mapping.', 'forbidden_field')
    return env, _norm(fields.get('written_at'))


def _norm(ts):
    """Firestore timestamps vary in fractional digits; normalise so comparisons are exact."""
    if not ts:
        return None
    try:
        return datetime.fromisoformat(str(ts).replace('Z', '+00:00')).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    except ValueError:
        return None


def _record_status(obj):
    error = obj.get('error') or {}
    if obj.get('status') == 'accepted':
        return 'accepted', 'Stock updated in Kura'
    if obj.get('status') == 'ignored':
        return 'ignored', obj.get('ignore_reason') or 'Ignored in Kura'
    return 'needs_review', error.get('message') or 'Needs review in Kura'


def sync(db_path, tenant, transport=None, force=False, connect=None, execute=None):
    """One pass: renew sign-in, read new outbox events, feed Kura's event pipeline, retry, acknowledge."""
    if connect is None or execute is None:
        from .server import connect as default_connect, execute_command as default_execute
        connect, execute = connect or default_connect, execute or default_execute
    execute_command = execute
    with connect(db_path) as conn:
        row = _row(conn, tenant)
        if not row or not row['secret']:
            return {'skipped': 'not_connected'}
        cfg, status = row['config'], dict(row['status'])
        if not cfg.get('enabled') and not force:
            return {'skipped': 'paused'}
        if not force and status.get('last_sync_at'):
            try:
                last = datetime.fromisoformat(status['last_sync_at']).timestamp()
                if time.time() - last < cfg.get('interval', DEFAULT_INTERVAL) - 1:
                    return {'skipped': 'interval'}
            except ValueError:
                pass
        summary = {'read': 0, 'new': 0, 'accepted': 0, 'needs_review': 0, 'rejected': 0, 'retried': 0, 'acknowledged': 0}
        fb = Firebase(cfg, transport)
        try:
            ctx = _owner_ctx(conn, tenant, cfg)
            token = fb.refresh(row['secret'])
            if token['refresh_token'] != row['secret']:
                conn.execute('BEGIN IMMEDIATE'); _write(conn, tenant, secret=token['refresh_token']); conn.execute('COMMIT')
            cursor = status.get('cursor')
            since = (datetime.fromisoformat(cursor.replace('Z', '+00:00')) - OVERLAP) if cursor else datetime(2026, 1, 1, tzinfo=timezone.utc)
            since_iso = since.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')
            rejected = dict(status.get('rejected') or {})
            for _page in range(20):
                docs = fb.outbox_query(token['id_token'], since_iso)
                summary['read'] += len(docs)
                newest = None
                for doc in docs:
                    try:
                        env, written = _envelope(doc, cfg)
                    except ConnectorError as err:
                        doc_id = doc.get('name', '').rsplit('/', 1)[-1][:200]
                        if doc_id not in rejected:
                            summary['rejected'] += 1
                            rejected[doc_id] = {'code': err.code, 'message': str(err), 'at': core.now()}
                            try:
                                fb.acknowledge(token['id_token'], doc['name'], 'rejected', str(err))
                            except ConnectorError:
                                pass
                        written = _norm(_value((doc.get('fields') or {}).get('written_at')))
                        newest = written or newest
                        continue
                    newest = written or newest
                    if workflows._find(conn, tenant, 'event', {'source': SOURCE, 'event_id': str(env.get('event_id'))}):
                        continue        # already in Kura (re-read window or an earlier pass)
                    key = 'tsconn-' + hashlib.sha256((SOURCE + ':' + env['event_id']).encode()).hexdigest()[:40]
                    try:
                        result = execute_command(conn, ctx, 'integration.event', env, key)
                    except core.DomainError as err:
                        doc_id = env['event_id'][:200]
                        if doc_id not in rejected:
                            summary['rejected'] += 1
                            rejected[doc_id] = {'code': getattr(err, 'code', 'validation'), 'message': str(err), 'at': core.now()}
                        continue
                    summary['new'] += 1
                    summary['accepted' if result.get('status') == 'accepted' else 'needs_review'] += 1
                if newest:
                    status['cursor'] = max(status.get('cursor') or '', newest)
                if len(docs) < PAGE:
                    break
                next_since = newest
                if not next_since or next_since == since_iso:
                    break
                since_iso = next_since
            # Originals first, then reversals: retry what a new mapping or an arrived original now allows.
            retry = execute_command(conn, ctx, 'integration.retry_source',
                                    {'source': SOURCE, 'codes': AUTO_RETRY_CODES, 'limit': 200}, 'tsretry-' + str(uuid.uuid4()))
            summary['retried'] = retry.get('accepted', 0)
            # Tell Treatment Sheets what happened to each event whose Kura status changed.
            acks = dict(status.get('acks') or {})
            for obj in core.list_obj(conn, tenant, 'event'):
                if obj.get('source') != SOURCE:
                    continue
                state, message = _record_status(obj)
                if acks.get(obj['event_id']) == state:
                    continue
                name = ('projects/' + cfg['project_id'] + '/databases/(default)/documents' + '/kura_outbox/' + cfg['hospital'] + '/events/' + obj['event_id'])
                try:
                    if fb.acknowledge(token['id_token'], name, state, message):
                        acks[obj['event_id']] = state
                        summary['acknowledged'] += 1
                except ConnectorError:
                    break
            if len(acks) > 5000:
                acks = dict(list(acks.items())[-4000:])
            if len(rejected) > 500:
                rejected = dict(list(rejected.items())[-400:])
            totals = status.get('totals') or {}
            for k in ('new', 'accepted', 'needs_review', 'rejected', 'retried'):
                totals[k] = totals.get(k, 0) + summary[k]
            status.update(last_sync_at=core.now(), last_ok_at=core.now(), last_error=None, last_summary=summary,
                          totals=totals, acks=acks, rejected=rejected, uid=token.get('uid') or status.get('uid'))
        except (ConnectorError, security.AuthError, core.DomainError) as err:
            status.update(last_sync_at=core.now(), last_error={'message': str(err), 'code': getattr(err, 'code', 'connector'), 'at': core.now()})
            summary['error'] = str(err)
        conn.execute('BEGIN IMMEDIATE')
        _write(conn, tenant, status=status)
        conn.execute('COMMIT')
        return summary


class Runner:
    """Background loop inside the Kura service. One pass at a time; a failed pass is recorded, never fatal."""

    def __init__(self, db_path, connect, execute, transport=None, tick=5):
        self.db_path, self.transport, self.tick = db_path, transport, tick
        self.connect, self.execute = connect, execute
        self.lock = threading.Lock()
        self.stopped = threading.Event()

    def run_once(self, tenant, force=False):
        with self.lock:
            return sync(self.db_path, tenant, self.transport, force=force, connect=self.connect, execute=self.execute)

    def loop(self):
        while not self.stopped.wait(self.tick):
            try:
                with self.connect(self.db_path) as conn:
                    tenants = [r[0] for r in conn.execute("SELECT tenant_id FROM connectors WHERE secret<>''")]
                for tenant in tenants:
                    self.run_once(tenant)
            except Exception:
                print('Treatment Sheets connector pass failed; it will retry.', flush=True)

    def start(self):
        threading.Thread(target=self.loop, daemon=True, name='kura-connectors').start()
        return self
