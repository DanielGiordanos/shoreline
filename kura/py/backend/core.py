"""Kura's tenant-scoped inventory engine. No helper commits a transaction.

The HTTP gateway MUST own BEGIN IMMEDIATE / rollback / commit for each command.
Quantities are integer millionths in SQLite; API quantities use base-unit numbers.
move() returns {group_id, entries: [public ledger rows], exception?: object}.
Each public ledger row also has quantity_micros for exact downstream calculations.
Reservations store allocations [{lot_id, quantity_micros}], never shadow balances.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sqlite3
import uuid
from collections import defaultdict
from decimal import Decimal, InvalidOperation

SCALE = 1_000_000
MAX_MICROS = 9_000_000_000_000_000
MASTER_KINDS = {'item', 'location', 'vendor', 'category', 'rule', 'mapping', 'location_mapping'}
KINDS = MASTER_KINDS | {'lot', 'reservation', 'order', 'count', 'event', 'exception', 'alert', 'setting', 'override', 'preview'}
PERMISSIONS = {
    'item.save': 'item.edit', 'item.merge': 'item.edit',
    'location.save': 'location.configure', 'vendor.save': 'vendor.edit',
    'category.save': 'item.edit', 'rule.save': 'item.edit',
    'barcode.save': 'barcode.manage', 'barcode.remove': 'barcode.manage',
    'stock.move': 'inventory.move', 'stock.reverse': 'inventory.adjust',
    'reservation.create': 'inventory.reserve', 'reservation.release': 'inventory.reserve',
    'reservation.consume': 'inventory.use',
    'lot.quarantine': 'inventory.adjust', 'lot.release': 'inventory.adjust', 'lot.recall': 'inventory.adjust',
}


class DomainError(Exception):
    def __init__(self, message, status=400, code='validation', details=None):
        super().__init__(message)
        self.message, self.status, self.code, self.details = message, status, code, details


class NotHandled(Exception):
    pass


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='microseconds').replace('+00:00', 'Z')


def new_id():
    return str(uuid.uuid4())


def _json(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def initialize(conn):
    """Create version-one schema without executescript's implicit transaction commit."""
    statements = [
        '''CREATE TABLE IF NOT EXISTS objects (
            tenant_id TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,
            version INTEGER NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
            PRIMARY KEY(tenant_id,kind,id))''',
        'CREATE INDEX IF NOT EXISTS objects_kind ON objects(tenant_id,kind)',
        "CREATE UNIQUE INDEX IF NOT EXISTS item_sku_unique ON objects(tenant_id,lower(json_extract(data,'$.sku'))) WHERE kind='item' AND json_extract(data,'$.sku')<>''",
        "CREATE UNIQUE INDEX IF NOT EXISTS lot_code_unique ON objects(tenant_id,json_extract(data,'$.item_id'),json_extract(data,'$.code')) WHERE kind='lot'",
        "CREATE INDEX IF NOT EXISTS reservation_item ON objects(tenant_id,json_extract(data,'$.item_id'),json_extract(data,'$.location_id')) WHERE kind='reservation'",
        "CREATE UNIQUE INDEX IF NOT EXISTS event_source_unique ON objects(tenant_id,json_extract(data,'$.source'),json_extract(data,'$.event_id')) WHERE kind='event'",
        "CREATE UNIQUE INDEX IF NOT EXISTS mapping_source_unique ON objects(tenant_id,json_extract(data,'$.source'),json_extract(data,'$.external_item_id')) WHERE kind='mapping'",
        "CREATE UNIQUE INDEX IF NOT EXISTS location_mapping_unique ON objects(tenant_id,json_extract(data,'$.source'),json_extract(data,'$.external_location_id')) WHERE kind='location_mapping'",
        "CREATE INDEX IF NOT EXISTS exception_event_record ON objects(tenant_id,json_extract(data,'$.event_record_id')) WHERE kind='exception'",
        '''CREATE TABLE IF NOT EXISTS barcodes (
            tenant_id TEXT NOT NULL, barcode TEXT NOT NULL,item_id TEXT NOT NULL,
            PRIMARY KEY(tenant_id,barcode))''',
        '''CREATE TABLE IF NOT EXISTS ledger (
            tenant_id TEXT NOT NULL,id TEXT NOT NULL,timestamp TEXT NOT NULL,
            item_id TEXT NOT NULL,location_id TEXT NOT NULL,lot_id TEXT NOT NULL DEFAULT '',
            quantity_micros INTEGER NOT NULL CHECK(typeof(quantity_micros)='integer'),
            kind TEXT NOT NULL,actor_id TEXT NOT NULL,reference TEXT NOT NULL DEFAULT '',reason TEXT NOT NULL,
            group_id TEXT NOT NULL,source TEXT NOT NULL,reversal_of TEXT NOT NULL DEFAULT '',metadata TEXT NOT NULL,
            PRIMARY KEY(tenant_id,id))''',
        'CREATE INDEX IF NOT EXISTS ledger_balance ON ledger(tenant_id,item_id,location_id,lot_id)',
        'CREATE INDEX IF NOT EXISTS ledger_group ON ledger(tenant_id,group_id)',
        'CREATE INDEX IF NOT EXISTS ledger_time ON ledger(tenant_id,timestamp)',
        "CREATE UNIQUE INDEX IF NOT EXISTS ledger_single_reversal ON ledger(tenant_id,reversal_of) WHERE reversal_of<>''",
        '''CREATE TRIGGER IF NOT EXISTS ledger_no_update BEFORE UPDATE ON ledger
           BEGIN SELECT RAISE(ABORT,'Inventory ledger is immutable'); END''',
        '''CREATE TRIGGER IF NOT EXISTS ledger_no_delete BEFORE DELETE ON ledger
           BEGIN SELECT RAISE(ABORT,'Inventory ledger is immutable'); END''',
        '''CREATE TABLE IF NOT EXISTS audit_log (
            tenant_id TEXT NOT NULL,id TEXT NOT NULL,timestamp TEXT NOT NULL,actor_id TEXT NOT NULL,
            action TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(tenant_id,id))''',
        '''CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_log
           BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END''',
        '''CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_log
           BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END''',
    ]
    for sql in statements:
        conn.execute(sql)


def _rowdict(cursor):
    names = [d[0] for d in cursor.description]
    return [dict(zip(names, row)) for row in cursor.fetchall()]


def _object(row):
    data = json.loads(row['data'])
    return {**data, 'id': row['id'], 'version': row['version'],
            'created_at': row['created_at'], 'updated_at': row['updated_at']}


def get_obj(conn, tenant, kind, id):
    if not isinstance(id, str) or not id or len(id) > 200:
        raise DomainError(f'{kind.capitalize()} not found.', 404, 'not_found')
    rows = _rowdict(conn.execute('SELECT * FROM objects WHERE tenant_id=? AND kind=? AND id=?', (tenant, kind, id)))
    if not rows:
        raise DomainError(f'{kind.capitalize()} not found.', 404, 'not_found')
    return _object(rows[0])


def list_obj(conn, tenant, kind):
    return [_object(row) for row in _rowdict(conn.execute(
        'SELECT * FROM objects WHERE tenant_id=? AND kind=? ORDER BY created_at,id', (tenant, kind)))]


def save_obj(conn, tenant, kind, data, expected_version=None):
    if kind not in KINDS or not isinstance(data, dict):
        raise DomainError('Invalid record type or data.')
    obj = dict(data)
    ident = obj.pop('id', None) or new_id()
    supplied_version = obj.pop('version', None)
    expected = expected_version if expected_version is not None else supplied_version
    obj.pop('created_at', None)
    obj.pop('updated_at', None)
    existing = conn.execute('SELECT version FROM objects WHERE tenant_id=? AND kind=? AND id=?', (tenant, kind, ident)).fetchone()
    timestamp = now()
    if existing:
        if kind in MASTER_KINDS and expected is None:
            raise DomainError('Reload this record before saving; its version is required.', 409, 'version_required')
        if expected is not None and expected != existing[0]:
            raise DomainError('This record changed. Reload it before saving your edits.', 409, 'version_conflict')
        conn.execute('UPDATE objects SET version=version+1,data=?,updated_at=? WHERE tenant_id=? AND kind=? AND id=?',
                     (_json(obj), timestamp, tenant, kind, ident))
    else:
        if expected not in (None, 0):
            raise DomainError('This record no longer exists.', 409, 'version_conflict')
        conn.execute('INSERT INTO objects(tenant_id,kind,id,version,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
                     (tenant, kind, ident, 1, _json(obj), timestamp, timestamp))
    return get_obj(conn, tenant, kind, ident)


def audit(conn, ctx, action, data):
    record = {'id': new_id(), 'timestamp': now(), 'actor_id': ctx['user_id'], 'action': action, 'data': data}
    conn.execute('INSERT INTO audit_log VALUES(?,?,?,?,?,?)',
                 (ctx['tenant_id'], record['id'], record['timestamp'], record['actor_id'], action, _json(data)))
    return record


def decimal_value(value, label='Quantity', nonnegative=True):
    if isinstance(value, bool) or value is None:
        raise DomainError(f'{label} must be a number.')
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise DomainError(f'{label} must be a number.')
    if not result.is_finite() or (nonnegative and result < 0) or abs(result) > MAX_MICROS:
        raise DomainError(f'{label} is outside the supported range.')
    return result


def from_micros(value):
    n = int(value)
    return n // SCALE if n % SCALE == 0 else float(Decimal(n) / SCALE)


def quantity_micros(item, quantity, unit=None):
    unit = unit or item.get('base_unit')
    if unit not in item.get('units', {}):
        raise DomainError(f'Unknown unit {unit!r}. Configure an explicit conversion first.', 400, 'invalid_unit')
    n = decimal_value(quantity) * decimal_value(item['units'][unit], 'Unit factor') * SCALE
    if n != n.to_integral_value():
        raise DomainError('Quantity is more precise than one millionth of the base unit.', 400, 'unit_precision')
    if n > MAX_MICROS:
        raise DomainError('Quantity is too large.')
    return int(n)


def _text(value, label, required=False, limit=10000):
    if value is None:
        value = ''
    if not isinstance(value, str):
        raise DomainError(f'{label} must be text.')
    value = value.strip()
    if (required and not value) or len(value) > limit:
        raise DomainError(f'{label} is required.' if not value else f'{label} is too long.')
    return value


def _reason(payload):
    return _text(payload.get('reason'), 'Reason', True, 2000)


def _active(conn, tenant, kind, ident):
    result = get_obj(conn, tenant, kind, ident)
    if result.get('status', 'active') != 'active' or result.get('merged_into'):
        raise DomainError(f'This {kind} is inactive.', 409, 'inactive')
    return result


def _restricted(ctx, item):
    permissions = ctx.get('permissions', [])
    if item.get('restricted') and ctx.get('role') not in ('admin', 'administrator') and '*' not in permissions and 'inventory.restricted' not in permissions:
        raise DomainError('You do not have permission to handle restricted inventory.', 403, 'forbidden')


def _bool(value, label):
    if not isinstance(value, bool):
        raise DomainError(f'{label} must be true or false.')
    return value


def _validate_item(conn, tenant, p, old=None):
    p = dict(p)
    p['name'] = _text(p.get('name'), 'Item name', True, 200)
    p['base_unit'] = _text(p.get('base_unit'), 'Base unit', True, 40)
    p['sku'] = _text(p.get('sku'), 'SKU', False, 120)
    units = p.get('units') or {p['base_unit']: 1}
    if not isinstance(units, dict) or not units or len(units) > 50:
        raise DomainError('Provide explicit unit conversions.')
    converted = {}
    for unit, factor in units.items():
        unit = _text(unit, 'Unit name', True, 40)
        f = decimal_value(factor, 'Unit factor')
        if f <= 0 or f > 1_000_000_000:
            raise DomainError('Unit factors must be positive and within supported range.')
        converted[unit] = str(f.normalize())
    if p['base_unit'] not in converted or Decimal(converted[p['base_unit']]) != 1:
        raise DomainError('The base unit must have a conversion factor of exactly 1.')
    p['units'] = converted
    for field in ('purchase_unit', 'consume_unit'):
        p[field] = p.get(field) or p['base_unit']
        if p[field] not in converted:
            raise DomainError(f'{field.replace("_", " ").capitalize()} needs an explicit conversion.')
    for field in ('minimum', 'reorder_point', 'target', 'safety_stock', 'order_multiple', 'lead_days', 'unit_cost'):
        value = decimal_value(p.get(field, 0), field.replace('_', ' ').capitalize())
        p[field] = float(value)
    if p['target'] and p['target'] < p['reorder_point']:
        raise DomainError('Target must be at least the reorder point.')
    if p['reorder_point'] and p['reorder_point'] < p['minimum']:
        raise DomainError('Reorder point must be at least the minimum.')
    for field in ('lot_required', 'expiry_required', 'serial_required', 'restricted', 'hazardous', 'refrigerated'):
        p[field] = _bool(p.get(field, False), field)
    if p['expiry_required'] or p['serial_required']:
        p['lot_required'] = True
    p['status'] = p.get('status', 'active')
    if p['status'] not in ('active', 'inactive'):
        raise DomainError('Item status must be active or inactive.')
    for field, kind in [('vendor_id', 'vendor')]:
        if p.get(field):
            get_obj(conn, tenant, kind, p[field])
    alternatives = p.get('alternatives', [])
    if not isinstance(alternatives, list):
        raise DomainError('Alternatives must be a list of item IDs.')
    for ident in alternatives:
        get_obj(conn, tenant, 'item', ident)
        if ident == p.get('id'):
            raise DomainError('An item cannot be its own alternative.')
    if not isinstance(p.get('metadata', {}), dict):
        raise DomainError('Item metadata must be an object.')
    barcodes = p.get('barcodes', [])
    if not isinstance(barcodes, list) or len(barcodes) > 100:
        raise DomainError('Barcodes must be a list with at most 100 entries.')
    p['barcodes'] = list(dict.fromkeys(_text(x, 'Barcode', True, 200) for x in barcodes))
    for code in p['barcodes']:
        row = conn.execute('SELECT item_id FROM barcodes WHERE tenant_id=? AND barcode=?', (tenant, code)).fetchone()
        if row and row[0] != p.get('id'):
            raise DomainError('Barcode is already assigned to another item.', 409, 'duplicate_barcode', {'barcode': code})
    if p['sku']:
        other = conn.execute("SELECT id FROM objects WHERE tenant_id=? AND kind='item' AND lower(json_extract(data,'$.sku'))=lower(?) AND json_extract(data,'$.sku')<>''", (tenant, p['sku'])).fetchone()
        if other and other[0] != p.get('id'):
            raise DomainError('An item with this SKU already exists.', 409, 'duplicate_sku')
    if old:
        has_ledger = conn.execute('SELECT 1 FROM ledger WHERE tenant_id=? AND item_id=? LIMIT 1', (tenant, old['id'])).fetchone()
        if has_ledger and p['base_unit'] != old['base_unit']:
            raise DomainError('Base unit cannot change after stock history exists. Create a new item.', 409, 'unit_locked')
        if has_ledger and any(p[f] != old.get(f, False) for f in ('lot_required', 'expiry_required', 'serial_required')):
            raise DomainError('Tracking requirements cannot change after stock history exists. Migrate stock explicitly.', 409, 'tracking_locked')
        history = list(old.get('cost_history', []))
        if Decimal(str(old.get('unit_cost', 0))) != Decimal(str(p['unit_cost'])):
            history.append({'timestamp': now(), 'from': old.get('unit_cost', 0), 'to': p['unit_cost']})
        p['cost_history'] = history
        if old.get('merged_into'):
            p['merged_into'] = old['merged_into']
            p['status'] = 'inactive'
    return p


def _save_entity(conn, ctx, kind, payload):
    tenant = ctx['tenant_id']
    p = dict(payload)
    old = get_obj(conn, tenant, kind, p['id']) if p.get('id') else None
    # Master edits may be partial but must carry an optimistic version.
    if old:
        if 'version' not in p:
            raise DomainError('Record version is required. Reload before saving.', 409, 'version_required')
        p = {**old, **p}
    if kind == 'item':
        p = _validate_item(conn, tenant, p, old)
        _restricted(ctx, old or p)
        _restricted(ctx, p)
        if p['status'] == 'inactive' and old and old.get('status', 'active') == 'active':
            totals, reserved = _raw_balances(conn, tenant, old['id'])
            if any(totals.values()) or any(reserved.values()):
                raise DomainError('Move or reconcile stock and release reservations before deactivating this item.', 409, 'item_has_stock')
    elif kind in ('location', 'vendor', 'category'):
        p['name'] = _text(p.get('name'), f'{kind.capitalize()} name', True, 200)
        p['status'] = p.get('status', 'active')
        if p['status'] not in ('active', 'inactive'):
            raise DomainError('Status must be active or inactive.')
        if kind == 'location':
            p['type'] = p.get('type', 'storage')
            if p['type'] not in ('hospital', 'department', 'storage', 'shelf', 'cart', 'organization', 'region'):
                raise DomainError('Unknown location type.')
            parent = p.get('parent_id')
            visited = {p.get('id')} if p.get('id') else set()
            while parent:
                if parent in visited:
                    raise DomainError('Location hierarchy cannot contain a cycle.')
                visited.add(parent)
                ancestor = get_obj(conn, tenant, 'location', parent)
                if p['status'] == 'active' and ancestor.get('status', 'active') != 'active':
                    raise DomainError('An active location cannot belong to an inactive parent.')
                parent = ancestor.get('parent_id')
            if p['status'] == 'inactive' and old:
                if any(b['on_hand'] or b['reserved'] for b in balances(conn, tenant) if b['location_id'] == old['id']):
                    raise DomainError('Move or reconcile stock before deactivating this location.', 409, 'location_has_stock')
                if any(o.get('parent_id') == old['id'] and o.get('status', 'active') == 'active' for o in list_obj(conn, tenant, 'location')):
                    raise DomainError('Move or deactivate child locations first.', 409, 'location_has_children')
        elif kind == 'vendor':
            for field in ('lead_days', 'minimum_order'):
                p[field] = float(decimal_value(p.get(field, 0), field.replace('_', ' ')))
    elif kind == 'rule':
        item = get_obj(conn, tenant, 'item', p.get('item_id'))
        get_obj(conn, tenant, 'location', p.get('location_id'))
        for field in ('minimum', 'reorder_point', 'target', 'safety_stock', 'order_multiple'):
            p[field] = from_micros(quantity_micros(item, p.get(field, 0), item['base_unit']))
        if p['target'] < p['reorder_point'] or p['reorder_point'] < p['minimum']:
            raise DomainError('Rule must satisfy minimum ≤ reorder point ≤ target.')
        for other in list_obj(conn, tenant, 'rule'):
            if other['id'] != p.get('id') and (other['item_id'], other['location_id']) == (p['item_id'], p['location_id']):
                raise DomainError('A rule for this item and location already exists.', 409, 'duplicate_rule')
    saved = save_obj(conn, tenant, kind, p)
    if kind == 'item':
        conn.execute('DELETE FROM barcodes WHERE tenant_id=? AND item_id=?', (tenant, saved['id']))
        for code in saved['barcodes']:
            conn.execute('INSERT INTO barcodes VALUES(?,?,?)', (tenant, code, saved['id']))
    audit(conn, ctx, kind + '.save', {'id': saved['id'], 'before': old, 'after': saved})
    return saved


def ledger_entries(conn, tenant):
    return [_entry_public(r) for r in _rowdict(conn.execute('SELECT * FROM ledger WHERE tenant_id=? ORDER BY timestamp,id', (tenant,)))]


def _entry_public(row):
    d = dict(row)
    d.pop('tenant_id', None)
    d['quantity'] = from_micros(d['quantity_micros'])
    d['lot_id'] = d['lot_id'] or None
    d['reversal_of'] = d['reversal_of'] or None
    d['metadata'] = json.loads(d['metadata']) if isinstance(d['metadata'], str) else d['metadata']
    return d


def _raw_balances(conn, tenant, item_id=None, location_id=None):
    totals = defaultdict(int)
    where, args = 'tenant_id=?', [tenant]
    if item_id:
        where += ' AND item_id=?'
        args.append(item_id)
    if location_id:
        where += ' AND location_id=?'
        args.append(location_id)
    for row in conn.execute('SELECT item_id,location_id,lot_id,SUM(quantity_micros) FROM ledger WHERE ' + where + ' GROUP BY item_id,location_id,lot_id', args):
        totals[(row[0], row[1], row[2] or '')] = row[3]
    reserved = defaultdict(int)
    reservation_where, reservation_args = "tenant_id=? AND kind='reservation'", [tenant]
    if item_id:
        reservation_where += " AND json_extract(data,'$.item_id')=?"
        reservation_args.append(item_id)
    if location_id:
        reservation_where += " AND json_extract(data,'$.location_id')=?"
        reservation_args.append(location_id)
    for row in _rowdict(conn.execute('SELECT * FROM objects WHERE ' + reservation_where, reservation_args)):
        r = _object(row)
        if r.get('status') == 'active':
            for a in r['allocations']:
                reserved[(r['item_id'], r['location_id'], a.get('lot_id') or '')] += a['quantity_micros']
    return totals, reserved


def _lot_unavailable(lot):
    expired = bool(lot and lot.get('expires') and lot['expires'] < dt.datetime.now(dt.timezone.utc).date().isoformat())
    quarantined = bool(lot and lot.get('status', 'active') in ('quarantined', 'recalled'))
    return expired, quarantined


def balances(conn, tenant):
    totals, reserved = _raw_balances(conn, tenant)
    lots = {o['id']: o for o in list_obj(conn, tenant, 'lot')}
    items = {o['id']: o for o in list_obj(conn, tenant, 'item')}
    output = []
    for key in sorted(totals.keys() | reserved.keys()):
        item_id, location_id, lot_id = key
        amount, hold = totals[key], reserved[key]
        expired, quarantined = _lot_unavailable(lots.get(lot_id))
        output.append({'item_id': item_id, 'location_id': location_id, 'lot_id': lot_id or None,
                       'on_hand': from_micros(amount), 'reserved': from_micros(hold),
                       'available': from_micros(0 if expired or quarantined else max(0, amount - hold)),
                       'quarantined': from_micros(amount if quarantined else 0),
                       'expired': from_micros(amount if expired else 0), 'unit': items[item_id]['base_unit']})
    return output


def _write_entry(conn, ctx, item_id, location_id, lot_id, amount, kind, reason, group, payload, reversal_of=''):
    metadata = dict(payload.get('metadata') or {})
    item = get_obj(conn, ctx['tenant_id'], 'item', item_id)
    # Valuation is captured at the time of movement, so changing the current
    # master cost never silently rewrites historical usage and waste cost.
    if 'base_unit_cost' not in metadata:
        if payload.get('unit_cost') is not None and payload.get('unit') in item.get('units', {}):
            metadata['base_unit_cost'] = float(decimal_value(payload['unit_cost'], 'Unit cost') / Decimal(str(item['units'][payload['unit']])))
        else:
            metadata['base_unit_cost'] = item.get('unit_cost', 0)
    for k in ('event_id', 'source_transaction_id', 'unit_cost', 'patient', 'device', 'unit', 'quantity'):
        if k in payload:
            metadata[k] = payload[k]
    previous = conn.execute('SELECT COALESCE(SUM(quantity_micros),0) FROM ledger WHERE tenant_id=? AND item_id=? AND location_id=? AND lot_id=?',
                            (ctx['tenant_id'], item_id, location_id, lot_id or '')).fetchone()[0]
    if abs(previous + amount) > MAX_MICROS:
        raise DomainError('Resulting stock quantity is too large.')
    metadata['previous_quantity'] = from_micros(previous)
    metadata['resulting_quantity'] = from_micros(previous + amount)
    row = {'tenant_id': ctx['tenant_id'], 'id': new_id(), 'timestamp': now(), 'item_id': item_id,
           'location_id': location_id, 'lot_id': lot_id or '', 'quantity_micros': amount, 'kind': kind,
           'actor_id': ctx['user_id'], 'reference': _text(payload.get('reference'), 'Reference', False, 1000),
           'reason': reason, 'group_id': group, 'source': _text(payload.get('source') or 'manual', 'Source', True, 200),
           'reversal_of': reversal_of or '', 'metadata': _json(metadata)}
    conn.execute('INSERT INTO ledger (' + ','.join(row) + ') VALUES (' + ','.join('?' for _ in row) + ')', tuple(row.values()))
    return _entry_public(row)


def _find_lot(conn, tenant, item, p, incoming=False):
    """Resolve a declared lot; an omitted lot is handled only by explicit FEFO for outflow."""
    if p.get('lot_id'):
        lot = get_obj(conn, tenant, 'lot', p['lot_id'])
        if lot['item_id'] != item['id']:
            raise DomainError('This lot belongs to a different item.', 400, 'lot_item_mismatch')
        if p.get('expires') and p['expires'] != lot.get('expires'):
            raise DomainError('Expiration does not match the existing lot.')
        if p.get('lot_code') and p['lot_code'] != lot.get('code'):
            raise DomainError('Lot code does not match the existing lot.')
        return lot
    code = _text(p.get('lot_code'), 'Lot code', False, 200)
    if code:
        matches = _rowdict(conn.execute("SELECT * FROM objects WHERE tenant_id=? AND kind='lot' AND json_extract(data,'$.item_id')=? AND json_extract(data,'$.code')=?", (tenant, item['id'], code)))
        if matches:
            lot = _object(matches[0])
            if p.get('expires') and p['expires'] != lot.get('expires'):
                raise DomainError('Expiration does not match the existing lot.')
            return lot
        if not incoming:
            raise DomainError('Lot code was not found.', 404, 'unknown_lot')
        expires = p.get('expires') or None
        if expires:
            try:
                if dt.date.fromisoformat(expires).isoformat() != expires:
                    raise ValueError()
            except (ValueError, TypeError):
                raise DomainError('Expiration must be a valid YYYY-MM-DD date.')
        if item.get('expiry_required') and not expires:
            raise DomainError('Expiration is required for this item.')
        return save_obj(conn, tenant, 'lot', {'item_id': item['id'], 'code': code, 'expires': expires,
                       'status': 'active', 'received_at': now(), 'vendor_id': item.get('vendor_id'),
                       'serial': p.get('serial') or (code if item.get('serial_required') else None)})
    if incoming and item.get('lot_required'):
        raise DomainError('Lot is required for this item.', 400, 'lot_required')
    if p.get('expires'):
        raise DomainError('Provide a lot code with its expiration date.')
    return None


def _allocate(conn, tenant, item, location, amount, lot=None, allow_unavailable=False):
    totals, reserved = _raw_balances(conn, tenant, item['id'], location)
    candidates = []
    for key, on_hand in totals.items():
        iid, lid, lot_id = key
        if iid != item['id'] or lid != location or (lot and lot_id != lot['id']):
            continue
        lot_obj = get_obj(conn, tenant, 'lot', lot_id) if lot_id else None
        expired, quarantined = _lot_unavailable(lot_obj)
        if not allow_unavailable and (expired or quarantined):
            continue
        free = max(0, on_hand - reserved[key])
        if free:
            candidates.append((lot_obj.get('expires') or '9999-12-31' if lot_obj else '9999-12-31',
                               lot_obj.get('created_at', '') if lot_obj else '', lot_id, free))
    candidates.sort()
    allocations, remaining = [], amount
    for _, _, lot_id, free in candidates:
        take = min(free, remaining)
        if take:
            allocations.append((lot_id, take))
            remaining -= take
        if remaining == 0:
            break
    return allocations, remaining


def move(conn, ctx, payload):
    p = dict(payload)
    if not isinstance(p.get('metadata', {}), dict):
        raise DomainError('Movement metadata must be an object.')
    tenant = ctx['tenant_id']
    kind = p.get('kind')
    if kind not in ('receive', 'use', 'waste', 'return', 'dispose', 'adjust', 'opening', 'transfer', 'emergency'):
        raise DomainError('Unknown stock movement type.')
    if kind == 'receive':
        try:
            features = get_obj(conn, tenant, 'setting', 'features').get('data', {})
        except DomainError as exc:
            if exc.status != 404:
                raise
            features = {}
        receiving = features.get('receiving', 'on')
        if receiving in ('off', False):
            raise DomainError('Receiving is disabled by your administrator.', 409, 'feature_disabled')
        if receiving == 'pilot':
            p['metadata'] = {**(p.get('metadata') or {}), 'feature_mode': 'receiving_pilot'}
    reason = _reason(p)
    item = _active(conn, tenant, 'item', p.get('item_id'))
    _restricted(ctx, item)
    location = _active(conn, tenant, 'location', p.get('location_id'))
    p['unit'] = _text(p.get('unit'), 'Unit', True, 40)
    amount = quantity_micros(item, p.get('actual_quantity', p.get('quantity')) if kind == 'adjust' else p.get('quantity'), p.get('unit'))
    if kind != 'adjust' and amount <= 0:
        raise DomainError('Quantity must be greater than zero.')
    if item.get('serial_required') and amount not in ((0, SCALE) if kind == 'adjust' else (SCALE,)):
        raise DomainError('Serialized stock must be moved one base unit at a time.')
    if p.get('unit_cost') is not None:
        p['unit_cost'] = float(decimal_value(p['unit_cost'], 'Unit cost'))
    destination = None
    if kind == 'transfer':
        destination = _active(conn, tenant, 'location', p.get('destination_id'))
        if destination['id'] == location['id']:
            raise DomainError('Choose a different destination location.')
    incoming = kind in ('receive', 'return', 'opening', 'adjust')
    lot = _find_lot(conn, tenant, item, p, incoming)
    if item.get('serial_required') and lot is None:
        raise DomainError('Select a serial/lot for this movement.')
    if item.get('expiry_required') and lot and not lot.get('expires'):
        raise DomainError('This item requires an expiration date.')
    group, entries, exception = new_id(), [], None
    if kind == 'adjust':
        # A count is explicitly scoped to one lot; never infer which lot changed.
        if item.get('lot_required') and not lot:
            raise DomainError('Select the lot being counted.')
        totals, reserved = _raw_balances(conn, tenant, item['id'], location['id'])
        key = (item['id'], location['id'], lot['id'] if lot else '')
        current = totals[key]
        if p.get('expected_quantity') is not None and quantity_micros(item, p['expected_quantity'], item['base_unit']) != current:
            raise DomainError('Stock changed since this count was opened. Recount before applying the correction.', 409, 'count_conflict')
        delta = amount - current
        if amount < reserved[key]:
            raise DomainError('Actual count is below reserved stock. Release reservations and investigate first.', 409, 'reserved_stock')
        if item.get('serial_required') and delta > 0:
            total = conn.execute('SELECT COALESCE(SUM(quantity_micros),0) FROM ledger WHERE tenant_id=? AND item_id=? AND lot_id=?',
                                 (tenant, item['id'], lot['id'])).fetchone()[0]
            if total + delta > SCALE:
                raise DomainError('This serial is already present in another location.', 409, 'duplicate_serial')
        if delta:
            entries.append(_write_entry(conn, ctx, item['id'], location['id'], key[2], delta, kind, reason, group, p))
    elif incoming:
        if item.get('serial_required'):
            total = conn.execute('SELECT COALESCE(SUM(quantity_micros),0) FROM ledger WHERE tenant_id=? AND item_id=? AND lot_id=?',
                                 (tenant, item['id'], lot['id'])).fetchone()[0]
            if total > 0:
                raise DomainError('This serial is already present in inventory.', 409, 'duplicate_serial')
        entries.append(_write_entry(conn, ctx, item['id'], location['id'], lot['id'] if lot else '', amount, kind, reason, group, p))
    else:
        allow_unavailable = kind in ('waste', 'dispose')
        if lot and any(_lot_unavailable(lot)) and not allow_unavailable:
            raise DomainError('Expired, quarantined or recalled stock cannot be used or transferred.', 409, 'stock_unavailable')
        allocation, short = _allocate(conn, tenant, item, location['id'], amount, lot, allow_unavailable)
        if short and kind != 'emergency':
            raise DomainError('Insufficient available stock. Check the location, lot and reservations.', 409, 'insufficient_stock',
                              {'requested': from_micros(amount), 'available': from_micros(amount - short)})
        for lot_id, quantity in allocation:
            entries.append(_write_entry(conn, ctx, item['id'], location['id'], lot_id, -quantity,
                                       'transfer_out' if destination else kind, reason, group, p))
            if destination:
                entries.append(_write_entry(conn, ctx, item['id'], destination['id'], lot_id, quantity, 'transfer_in', reason, group, p))
        if short:
            exception = save_obj(conn, tenant, 'exception', {'type': 'emergency_shortage', 'status': 'needs_review',
                 'item_id': item['id'], 'location_id': location['id'], 'requested_quantity': from_micros(amount),
                 'recorded_quantity': from_micros(amount - short), 'unresolved_quantity': from_micros(short),
                 'unit': item['base_unit'], 'reason': reason, 'reference': p.get('reference', ''), 'group_id': group,
                 'message': 'Reported emergency use exceeds available stock. The shortage needs physical reconciliation.'})
    audit(conn, ctx, 'stock.' + kind, {'group_id': group, 'entries': [e['id'] for e in entries],
                                     'exception_id': exception['id'] if exception else None, 'reason': reason})
    result = {'group_id': group, 'entries': entries}
    if exception:
        result['exception'] = exception
    return result


def reverse(conn, ctx, payload):
    reason = _reason(payload)
    tenant = ctx['tenant_id']
    selected = _rowdict(conn.execute('SELECT * FROM ledger WHERE tenant_id=? AND id=?', (tenant, payload.get('transaction_id'))))
    if not selected:
        raise DomainError('Transaction not found.', 404, 'not_found')
    original = selected[0]
    if original['reversal_of']:
        raise DomainError('A reversal cannot itself be reversed. Record an explicit corrective movement.', 409, 'reversal_of_reversal')
    originals = _rowdict(conn.execute('SELECT * FROM ledger WHERE tenant_id=? AND group_id=? ORDER BY timestamp,id', (tenant, original['group_id'])))
    if any(row['kind'].startswith('merge_') for row in originals):
        raise DomainError('A merge preserves identity mapping and cannot be reversed as stock. Create a documented correction.', 409, 'merge_reversal')
    for row in originals:
        if conn.execute('SELECT 1 FROM ledger WHERE tenant_id=? AND reversal_of=?', (tenant, row['id'])).fetchone():
            raise DomainError('This transaction group has already been reversed.', 409, 'already_reversed')
        item = get_obj(conn, tenant, 'item', row['item_id'])
        _restricted(ctx, item)
        if item.get('merged_into'):
            raise DomainError('This item has been merged. Correct the target item with a documented adjustment.', 409, 'merged_item')
    totals, reserved = _raw_balances(conn, tenant)
    deltas = defaultdict(int)
    for row in originals:
        deltas[(row['item_id'], row['location_id'], row['lot_id'])] -= row['quantity_micros']
    for key, delta in deltas.items():
        if totals[key] + delta < reserved[key]:
            raise DomainError('Reversal would remove unavailable or reserved stock. Reconcile subsequent movements first.', 409, 'reversal_stock_conflict')
    serial_deltas = defaultdict(int)
    for (item_id, location_id, lot_id), delta in deltas.items():
        if get_obj(conn, tenant, 'item', item_id).get('serial_required'):
            serial_deltas[(item_id, lot_id)] += delta
    for (item_id, lot_id), delta in serial_deltas.items():
        total = conn.execute('SELECT COALESCE(SUM(quantity_micros),0) FROM ledger WHERE tenant_id=? AND item_id=? AND lot_id=?', (tenant, item_id, lot_id)).fetchone()[0]
        if total + delta > SCALE:
            raise DomainError('Reversal would duplicate a serial already in inventory.', 409, 'duplicate_serial')
    orders, receipt_deltas, consumed_reservations = {}, defaultdict(int), {}
    for row in originals:
        metadata = json.loads(row['metadata'])
        if row['kind'] == 'use' and metadata.get('reservation_id'):
            reservation = get_obj(conn, tenant, 'reservation', metadata['reservation_id'])
            if reservation.get('consumed_group_id') == original['group_id']:
                consumed_reservations[reservation['id']] = reservation
        if row['kind'] == 'receive' and metadata.get('order_id'):
            order_id, index = metadata['order_id'], metadata.get('line_index')
            order = orders.setdefault(order_id, get_obj(conn, tenant, 'order', order_id))
            if not isinstance(index, int) or not 0 <= index < len(order.get('lines', [])):
                raise DomainError('The receipt no longer matches its purchase order line.', 409, 'receipt_conflict')
            line = order['lines'][index]
            if line['item_id'] != row['item_id'] or not any(r.get('group_id') == original['group_id'] and not r.get('reversed_at') for r in line.get('receipts', [])):
                raise DomainError('The purchase order receipt history does not match this stock movement.', 409, 'receipt_conflict')
            receipt_deltas[(order_id, index)] += row['quantity_micros']
    for (order_id, index), amount in receipt_deltas.items():
        line = orders[order_id]['lines'][index]
        if Decimal(str(line['received'])) * SCALE < amount:
            raise DomainError('The receipt reversal would make purchase order receipts negative.', 409, 'receipt_conflict')
    group, entries = new_id(), []
    for row in originals:
        entries.append(_write_entry(conn, ctx, row['item_id'], row['location_id'], row['lot_id'], -row['quantity_micros'],
                                   'reversal', reason, group, {**payload, 'reference': payload.get('reference') or row['reference'],
                                                            'metadata': {**(payload.get('metadata') or {}), 'original_group_id': original['group_id'],
                                                                         'base_unit_cost': json.loads(row['metadata']).get('base_unit_cost', 0)}}, row['id']))
    for (order_id, index), amount in receipt_deltas.items():
        line = orders[order_id]['lines'][index]
        received = Decimal(str(line['received'])) - Decimal(amount) / SCALE
        factor = Decimal(str(line['base_quantity'])) / Decimal(str(line['quantity']))
        line['received'] = float(received)
        line['received_quantity'] = float(received / factor)
        line['remaining'] = float((Decimal(str(line['base_quantity'])) - received) / factor)
        for receipt in line.get('receipts', []):
            if receipt.get('group_id') == original['group_id']:
                receipt.update(reversed_at=now(), reversal_group_id=group, reversal_reason=reason)
    for order in orders.values():
        status = order['status'] if order['status'] == 'cancelled' else ('partially_received' if any(Decimal(str(l['received'])) > 0 for l in order['lines']) else 'ordered')
        order.setdefault('history', []).append({'from': order['status'], 'to': status, 'actor_id': ctx['user_id'], 'timestamp': now(),
                                              'reason': reason, 'action': 'receipt_reversed', 'group_id': group})
        order['status'] = status
        save_obj(conn, tenant, 'order', order)
        audit(conn, ctx, 'order.receipt_reversed', {'id': order['id'], 'group_id': group, 'reason': reason})
    for reservation in consumed_reservations.values():
        reservation.update(status='reversed', consumption_reversed_at=now(), consumption_reversal_group_id=group,
                           consumption_reversal_reason=reason)
        save_obj(conn, tenant, 'reservation', reservation)
        audit(conn, ctx, 'reservation.consumption_reversed', {'id': reservation['id'], 'group_id': group, 'reason': reason})
    audit(conn, ctx, 'stock.reverse', {'original_group_id': original['group_id'], 'group_id': group, 'reason': reason})
    return {'group_id': group, 'entries': entries}


def _reserve(conn, ctx, p):
    tenant = ctx['tenant_id']
    item = _active(conn, tenant, 'item', p.get('item_id'))
    _restricted(ctx, item)
    loc = _active(conn, tenant, 'location', p.get('location_id'))
    _text(p.get('unit'), 'Unit', True, 40)
    amount = quantity_micros(item, p.get('quantity'), p.get('unit'))
    if not isinstance(p.get('metadata', {}), dict):
        raise DomainError('Reservation metadata must be an object.')
    if amount <= 0:
        raise DomainError('Reservation quantity must be greater than zero.')
    reason = _reason(p)
    allocations, short = _allocate(conn, tenant, item, loc['id'], amount)
    if short:
        raise DomainError('Insufficient available stock for this reservation.', 409, 'insufficient_stock')
    record = save_obj(conn, tenant, 'reservation', {'item_id': item['id'], 'location_id': loc['id'],
                 'quantity': from_micros(amount), 'unit': item['base_unit'], 'quantity_micros': amount,
                 'allocations': [{'lot_id': ident or None, 'quantity_micros': qty} for ident, qty in allocations],
                 'reference': _text(p.get('reference'), 'Reference', True, 1000), 'reason': reason,
                 'actor_id': ctx['user_id'], 'status': 'active', 'source': p.get('source') or 'manual',
                 'metadata': p.get('metadata') or {}})
    audit(conn, ctx, 'reservation.create', record)
    return record


def _consume_reservation(conn, ctx, p):
    tenant, reason = ctx['tenant_id'], _reason(p)
    if not isinstance(p.get('metadata', {}), dict):
        raise DomainError('Reservation consumption metadata must be an object.')
    reservation = get_obj(conn, tenant, 'reservation', p.get('id'))
    if reservation.get('status') != 'active':
        raise DomainError('Only an active reservation can be consumed.', 409, 'reservation_closed')
    item = _active(conn, tenant, 'item', reservation['item_id'])
    _restricted(ctx, item)
    location = _active(conn, tenant, 'location', reservation['location_id'])
    totals, reserved = _raw_balances(conn, tenant, item['id'], location['id'])
    allocations = reservation['allocations']
    if sum(a['quantity_micros'] for a in allocations) != reservation['quantity_micros']:
        raise DomainError('Reservation allocations do not match its quantity. Reconcile before using it.', 409, 'reservation_conflict')
    for allocation in allocations:
        lot_id, quantity = allocation.get('lot_id') or '', allocation['quantity_micros']
        if quantity <= 0:
            raise DomainError('Reservation allocation is invalid.', 409, 'reservation_conflict')
        if lot_id:
            lot = get_obj(conn, tenant, 'lot', lot_id)
            if lot['item_id'] != item['id'] or any(_lot_unavailable(lot)):
                raise DomainError('A reserved lot is expired, quarantined or recalled. Review the reservation; no substitute lot was used.', 409, 'stock_unavailable')
        key = (item['id'], location['id'], lot_id)
        if totals[key] < reserved[key] or reserved[key] < quantity:
            raise DomainError('Reserved stock no longer matches physical inventory. Reconcile before using it.', 409, 'reservation_conflict')
    group, entries = new_id(), []
    payload = {**p, 'reference': p.get('reference') or reservation.get('reference', ''),
               'unit': item['base_unit'], 'metadata': {**(p.get('metadata') or {}), 'reservation_id': reservation['id'], 'reservation_reference': reservation.get('reference')}}
    for allocation in allocations:
        entries.append(_write_entry(conn, ctx, item['id'], location['id'], allocation.get('lot_id'),
            -allocation['quantity_micros'], 'use', reason, group, payload))
    reservation.update(status='consumed', consumed_at=now(), consumed_by=ctx['user_id'],
                       consume_reason=reason, consumed_group_id=group)
    reservation = save_obj(conn, tenant, 'reservation', reservation)
    audit(conn, ctx, 'reservation.consume', {'id': reservation['id'], 'group_id': group, 'reason': reason})
    return {'reservation': reservation, 'group_id': group, 'entries': entries}


def _merge(conn, ctx, p):
    tenant, reason = ctx['tenant_id'], _reason(p)
    source = _active(conn, tenant, 'item', p.get('source_id'))
    target = _active(conn, tenant, 'item', p.get('target_id'))
    _restricted(ctx, source)
    _restricted(ctx, target)
    if source['id'] == target['id']:
        raise DomainError('Select two different items.')
    if source['base_unit'] != target['base_unit'] or source['units'] != target['units']:
        raise DomainError('Merge requires identical base units and explicit conversions.', 409, 'incompatible_units')
    if any(source.get(f) != target.get(f) for f in ('lot_required', 'expiry_required', 'serial_required')):
        raise DomainError('Merge requires identical tracking requirements.', 409, 'incompatible_tracking')
    if any(r.get('status') == 'active' and r['item_id'] in (source['id'], target['id']) for r in list_obj(conn, tenant, 'reservation')):
        raise DomainError('Release active reservations before merging these items.', 409, 'merge_reserved')
    if any(any(line.get('item_id') == source['id'] for line in o.get('lines', [])) and o.get('status') not in ('received', 'cancelled') for o in list_obj(conn, tenant, 'order')):
        raise DomainError('Resolve open purchase orders for the source item before merging.', 409, 'merge_ordered')
    lots = {o['id']: o for o in list_obj(conn, tenant, 'lot')}
    totals, _ = _raw_balances(conn, tenant)
    group, entries, lot_mapping = new_id(), [], {}
    for (iid, lid, lot_id), amount in totals.items():
        if iid != source['id'] or not amount:
            continue
        target_lot = ''
        if lot_id:
            if lot_id not in lot_mapping:
                source_lot = lots[lot_id]
                matches = [l for l in lots.values() if l['item_id'] == target['id'] and l['code'] == source_lot['code']]
                if matches:
                    match = matches[0]
                    if (match.get('expires'), match.get('status')) != (source_lot.get('expires'), source_lot.get('status')) or source.get('serial_required'):
                        raise DomainError('Conflicting lot or serial details prevent this merge.', 409, 'merge_lot_conflict')
                else:
                    match = save_obj(conn, tenant, 'lot', {k: v for k, v in {**source_lot, 'item_id': target['id'], 'merged_from': source_lot['id']}.items()
                                                          if k not in ('id', 'version', 'created_at', 'updated_at')})
                    lots[match['id']] = match
                lot_mapping[lot_id] = match['id']
            target_lot = lot_mapping[lot_id]
        entries.append(_write_entry(conn, ctx, source['id'], lid, lot_id, -amount, 'merge_out', reason, group, p))
        entries.append(_write_entry(conn, ctx, target['id'], lid, target_lot, amount, 'merge_in', reason, group, p))
    source['status'], source['merged_into'], source['barcodes'] = 'inactive', target['id'], []
    conn.execute('UPDATE barcodes SET item_id=? WHERE tenant_id=? AND item_id=?', (target['id'], tenant, source['id']))
    target['barcodes'] = list(dict.fromkeys(target.get('barcodes', []) + get_obj(conn, tenant, 'item', source['id']).get('barcodes', [])))
    source = save_obj(conn, tenant, 'item', source)
    target = save_obj(conn, tenant, 'item', target)
    for mapping in list_obj(conn, tenant, 'mapping'):
        if mapping.get('item_id') == source['id']:
            mapping['item_id'] = target['id']
            save_obj(conn, tenant, 'mapping', mapping)
    audit(conn, ctx, 'item.merge', {'source_id': source['id'], 'target_id': target['id'], 'lot_mapping': lot_mapping, 'group_id': group, 'reason': reason})
    return {'source': source, 'target': target, 'lot_mapping': lot_mapping, 'group_id': group, 'entries': entries}


def handle(conn, ctx, command, payload):
    if not isinstance(payload, dict):
        raise DomainError('Payload must be an object.')
    if command in ('item.save', 'location.save', 'vendor.save', 'category.save', 'rule.save'):
        return _save_entity(conn, ctx, command.split('.')[0], payload)
    if command == 'item.merge':
        return _merge(conn, ctx, payload)
    if command in ('barcode.save', 'barcode.remove'):
        item = get_obj(conn, ctx['tenant_id'], 'item', payload.get('item_id'))
        barcode = _text(payload.get('barcode'), 'Barcode', True, 200)
        current = list(item.get('barcodes', []))
        if command == 'barcode.save':
            current = list(dict.fromkeys(current + [barcode]))
        else:
            if barcode not in current:
                raise DomainError('Barcode is not assigned to this item.', 404, 'not_found')
            current.remove(barcode)
        saved = _save_entity(conn, ctx, 'item', {**item, 'barcodes': current})
        audit(conn, ctx, command, {'item_id': item['id'], 'barcode': barcode})
        return saved
    if command == 'stock.move':
        return move(conn, ctx, payload)
    if command == 'stock.reverse':
        return reverse(conn, ctx, payload)
    if command == 'reservation.create':
        return _reserve(conn, ctx, payload)
    if command == 'reservation.consume':
        return _consume_reservation(conn, ctx, payload)
    if command == 'reservation.release':
        r = get_obj(conn, ctx['tenant_id'], 'reservation', payload.get('id'))
        _restricted(ctx, get_obj(conn, ctx['tenant_id'], 'item', r['item_id']))
        reason = _reason(payload)
        if r.get('status') != 'active':
            raise DomainError('This reservation is already released.', 409, 'already_released')
        r.update(status='released', released_at=now(), released_by=ctx['user_id'], release_reason=reason)
        r = save_obj(conn, ctx['tenant_id'], 'reservation', r)
        audit(conn, ctx, command, {'id': r['id'], 'reason': reason})
        return r
    if command in ('lot.quarantine', 'lot.release', 'lot.recall'):
        lot = get_obj(conn, ctx['tenant_id'], 'lot', payload.get('id'))
        _restricted(ctx, get_obj(conn, ctx['tenant_id'], 'item', lot['item_id']))
        reason = _reason(payload)
        lot['status'] = {'lot.quarantine': 'quarantined', 'lot.release': 'active', 'lot.recall': 'recalled'}[command]
        lot['status_reason'], lot['status_actor_id'] = reason, ctx['user_id']
        lot = save_obj(conn, ctx['tenant_id'], 'lot', lot)
        audit(conn, ctx, command, {'id': lot['id'], 'reason': reason})
        return lot
    raise NotHandled(command)


def snapshot(conn, ctx):
    tenant = ctx['tenant_id']
    names = {'items': 'item', 'locations': 'location', 'vendors': 'vendor', 'categories': 'category',
             'rules': 'rule', 'lots': 'lot', 'reservations': 'reservation'}
    data = {plural: list_obj(conn, tenant, kind) for plural, kind in names.items()}
    data['balances'] = balances(conn, tenant)
    data['ledger'] = ledger_entries(conn, tenant)
    return data
