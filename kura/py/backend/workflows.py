"""Transactional Kura operational workflows; the HTTP gateway owns commits.

Amounts cross the API in explicit item units and are converted with Decimal.
Integrations retain failed envelopes for operator review instead of losing them.
"""
from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_CEILING

from . import core, planning, controlled, kits, purchasing
from .core import DomainError, audit, balances, get_obj, list_obj, move, new_id, now, save_obj

PERMISSIONS = {
    'order.save': 'purchase.manage', 'order.status': 'purchase.manage',
    'order.receive': 'inventory.receive', 'count.create': 'inventory.count',
    'count.record': 'inventory.count', 'count.reconcile': 'inventory.adjust',
    'mapping.save': 'integrations.manage', 'location_mapping.save': 'integrations.manage',
    'integration.event': 'integrations.manage', 'integration.retry_source': 'integrations.manage',
    'integration.retry': 'integrations.manage', 'integration.ignore': 'integrations.manage',
    'import.preview': 'inventory.manage', 'import.commit': 'inventory.manage',
    'bulk.preview': 'inventory.manage', 'bulk.apply': 'inventory.manage',
    'setting.save': 'settings.manage', 'recommendation.dismiss': 'purchase.manage',
    'alert.resolve': 'inventory.manage',
    'exception.resolve': 'inventory.adjust',
    **controlled.PERMISSIONS, **kits.PERMISSIONS, **purchasing.PERMISSIONS,
}
ORDER_STATUSES = {
    'needs_review': {'approved', 'cancelled'},
    'approved': {'ordered', 'needs_review', 'cancelled'},
    'ordered': {'partially_shipped', 'shipped', 'backordered', 'cancelled'},
    'partially_shipped': {'shipped', 'backordered', 'cancelled'},
    'shipped': {'backordered', 'cancelled'},
    'partially_received': {'backordered', 'shipped', 'cancelled'},
    'backordered': {'ordered', 'partially_shipped', 'shipped', 'cancelled'},
    'received': set(), 'cancelled': set(),
}
RECEIVABLE = {'ordered', 'partially_shipped', 'shipped', 'partially_received', 'backordered'}
OPEN_ORDER = {'needs_review', 'approved'} | RECEIVABLE
CONSUMPTION_EVENTS = {'InventoryConsumed', 'MedicationAdministered', 'MedicationDispensed', 'TreatmentCompleted',
                      'ProcedureSupplyUsed', 'AnesthesiaDrugUsed', 'ControlledDrugWithdrawn'}
WASTE_EVENTS = {'InventoryWasted', 'MedicationWasted', 'ControlledDrugWasted'}
REVERSAL_EVENTS = {'InventoryReversed', 'TreatmentReversed', 'ProcedureCancelled'}
LIFECYCLE_EVENTS = {'SurgeryStarted', 'SurgeryCompleted'}
SUPPORTED_EVENTS = CONSUMPTION_EVENTS | WASTE_EVENTS | REVERSAL_EVENTS | LIFECYCLE_EVENTS | {
    'InventoryReservationCreated', 'InventoryReservationReleased'}
MICRO = Decimal('1000000')
MAX_ROWS = 10000


def _require(ctx, permission):
    permissions = ctx.get('permissions', [])
    if '*' not in permissions and permission not in permissions:
        raise DomainError('This action requires ' + permission + '.', 403, 'permission_denied')


def _s(value, name, required=True, maximum=1000):
    if value is None:
        value = ''
    if not isinstance(value, str):
        raise DomainError(name + ' must be text.')
    value = value.strip()
    if required and not value:
        raise DomainError(name + ' is required.')
    if len(value) > maximum:
        raise DomainError(name + ' is too long.')
    return value


def _d(value, name='Quantity', zero=False):
    if isinstance(value, bool):
        raise DomainError(name + ' must be a number.')
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise DomainError(name + ' must be a number.')
    if not number.is_finite() or abs(number) > Decimal('1000000000'):
        raise DomainError(name + ' is outside the supported range.')
    if number < 0 or (number == 0 and not zero):
        raise DomainError(name + (' must not be negative.' if zero else ' must be greater than zero.'))
    return number


def _num(number):
    number = Decimal(str(number))
    return int(number) if number == number.to_integral_value() else float(number)


def _quantity(item, value, unit):
    quantity = _d(value)
    units = item.get('units') or {item['base_unit']: 1}
    if unit not in units:
        raise DomainError('Unknown unit ' + str(unit) + ' for ' + item['name'] + '.', 400, 'invalid_unit')
    result = quantity * _d(units[unit], 'Unit conversion')
    if result * MICRO != (result * MICRO).to_integral_value():
        raise DomainError('Quantity is more precise than one millionth of a base unit.')
    return result


def _hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def _tenant(ctx):
    return ctx['tenant_id']


def _ref(conn, ctx, kind, identifier):
    obj = get_obj(conn, _tenant(ctx), kind, _s(identifier, kind.title() + ' ID'))
    if obj.get('status') in {'inactive', 'merged'}:
        raise DomainError(kind.title() + ' is inactive.')
    return obj


def _save(conn, ctx, kind, obj, action):
    result = save_obj(conn, _tenant(ctx), kind, obj)
    audit(conn, ctx, action, {'kind': kind, 'id': result['id']})
    return result


def _ledger(conn, tenant):
    return core.ledger_entries(conn, tenant)


def _data(conn, tenant, kind, state=None):
    if state is not None and kind in state:
        return state[kind]
    if kind == 'balances':
        return balances(conn, tenant)
    if kind == 'ledger':
        return _ledger(conn, tenant)
    return list_obj(conn, tenant, kind)


def _find(conn, tenant, kind, fields):
    # All JSON field names are internal constants; values remain bound parameters.
    allowed = {'source', 'event_id', 'external_item_id', 'external_location_id', 'event_record_id'}
    if set(fields) - allowed:
        raise RuntimeError('Unsupported internal lookup field')
    where = ' AND '.join("json_extract(data,'$." + name + "')=?" for name in fields)
    ids = conn.execute('SELECT id FROM objects WHERE tenant_id=? AND kind=? AND ' + where,
                       (tenant, kind, *fields.values())).fetchall()
    return [get_obj(conn, tenant, kind, row[0]) for row in ids]


def _feature(conn, ctx, name, state=None):
    settings = _data(conn, _tenant(ctx), 'setting', state)
    features = next((s.get('data', s) for s in settings if s['id'] == 'features'), {})
    return features.get(name, 'on')


def _atomic(conn, fn):
    """A failed retained event or preview must not leak partially written stock."""
    name = 'wf_' + new_id().replace('-', '')
    conn.execute('SAVEPOINT ' + name)
    try:
        result = fn()
    except Exception:
        conn.execute('ROLLBACK TO ' + name)
        conn.execute('RELEASE ' + name)
        raise
    conn.execute('RELEASE ' + name)
    return result


def _order_save(conn, ctx, p):
    previous = get_obj(conn, _tenant(ctx), 'order', _s(p['id'], 'Order ID')) if p.get('id') else None
    if previous and previous['status'] != 'needs_review':
        raise DomainError('Only an order awaiting review can be edited.', 409, 'order_locked')
    if previous and p.get('version') != previous['version']:
        raise DomainError('This order changed. Reload it before saving.', 409, 'version_conflict')
    vendor = _ref(conn, ctx, 'vendor', p.get('vendor_id'))
    location = _ref(conn, ctx, 'location', p.get('location_id'))
    incoming = p.get('lines')
    if not isinstance(incoming, list) or not 1 <= len(incoming) <= 500:
        raise DomainError('An order requires between 1 and 500 lines.')
    lines, seen = [], set()
    for line in incoming:
        if not isinstance(line, dict):
            raise DomainError('Each order line must be an object.')
        item = _ref(conn, ctx, 'item', line.get('item_id'))
        if item['id'] in seen:
            raise DomainError('Combine duplicate item lines before saving this order.')
        seen.add(item['id'])
        unit = _s(line.get('unit'), 'Purchase unit')
        base = _quantity(item, line.get('quantity'), unit)
        default_cost = Decimal(str(item.get('unit_cost', 0))) * base / _d(line['quantity'])
        cost = _d(line.get('unit_cost', default_cost), 'Unit cost', True)
        lines.append({'item_id': item['id'], 'item_name': item['name'], 'quantity': _num(_d(line['quantity'])),
                      'unit': unit, 'base_quantity': _num(base), 'unit_cost': _num(cost), 'received': 0,
                      'received_quantity': 0, 'remaining': _num(_d(line['quantity'])), 'receipts': []})
    obj = {'vendor_id': vendor['id'], 'location_id': location['id'], 'lines': lines,
           'status': 'needs_review', 'notes': _s(p.get('notes'), 'Notes', False, 10000),
           'created_at': previous.get('created_at', now()) if previous else now(),
           'created_by': previous.get('created_by', ctx['user_id']) if previous else ctx['user_id'],
           'total': _num(sum(Decimal(str(line['quantity'])) * Decimal(str(line['unit_cost'])) for line in lines)),
           'history': previous.get('history', []) if previous else []}
    if previous:
        obj.update(id=previous['id'], version=p['version'])
    return _save(conn, ctx, 'order', obj, 'order.saved')


def _order_status(conn, ctx, p):
    obj = get_obj(conn, _tenant(ctx), 'order', _s(p.get('id'), 'Order'))
    desired = _s(p.get('status'), 'Order status')
    if desired not in ORDER_STATUSES.get(obj['status'], set()):
        raise DomainError('Cannot move order from ' + obj['status'] + ' to ' + desired + '.', 409, 'invalid_transition')
    if desired == 'approved':
        _require(ctx, 'purchase.approve')
    reason = _s(p.get('reason'), 'Reason')
    expected_at = _s(p.get('expected_at'), 'Expected arrival', False)
    if expected_at:
        try:
            datetime.fromisoformat(expected_at.replace('Z', '+00:00'))
        except ValueError:
            raise DomainError('Expected arrival must be an ISO date or timestamp.')
        obj['expected_at'] = expected_at
    if p.get('external_reference'):
        obj['external_reference'] = _s(p['external_reference'], 'External reference')
    obj.setdefault('history', []).append({'from': obj['status'], 'to': desired,
        'actor_id': ctx['user_id'], 'timestamp': now(), 'reason': reason})
    obj['status'] = desired
    return _save(conn, ctx, 'order', obj, 'order.' + desired)


def _order_receive(conn, ctx, p):
    if _feature(conn, ctx, 'receiving') == 'off':
        raise DomainError('Receiving is disabled by an administrator feature setting.', 409, 'feature_disabled')
    obj = get_obj(conn, _tenant(ctx), 'order', _s(p.get('id'), 'Order'))
    if obj['status'] not in RECEIVABLE:
        raise DomainError('This order is not open for receiving.', 409, 'invalid_transition')
    index = p.get('line_index')
    if isinstance(index, bool) or not isinstance(index, int) or not 0 <= index < len(obj['lines']):
        raise DomainError('Choose a valid order line.')
    line = obj['lines'][index]
    item = _ref(conn, ctx, 'item', line['item_id'])
    location_id = p.get('location_id') or obj['location_id']
    _ref(conn, ctx, 'location', location_id)
    unit = _s(p.get('unit'), 'Received unit')
    quantity = _quantity(item, p.get('quantity'), unit)
    received = Decimal(str(line['received'])) + quantity
    if received > Decimal(str(line['base_quantity'])):
        raise DomainError('Receipt exceeds the remaining ordered quantity.', 409, 'over_receipt')
    reason = _s(p.get('reason'), 'Receiving reason')
    def apply():
        base_cost = Decimal(str(line['unit_cost'])) / (Decimal(str(line['base_quantity'])) / Decimal(str(line['quantity'])))
        result = move(conn, ctx, {'kind': 'receive', 'item_id': item['id'], 'location_id': location_id,
            'quantity': p['quantity'], 'unit': unit, 'lot_id': p.get('lot_id'), 'lot_code': p.get('lot_code'),
            'expires': p.get('expires'), 'reason': reason, 'reference': obj['id'],
            'unit_cost': _num(base_cost * Decimal(str(item['units'][unit]))),
            'metadata': {'order_id': obj['id'], 'line_index': index, 'vendor_id': obj['vendor_id'], 'base_unit_cost': _num(base_cost)}})
        line['received'] = _num(received)
        factor = Decimal(str(line['base_quantity'])) / Decimal(str(line['quantity']))
        line['received_quantity'] = _num(received / factor)
        line['remaining'] = _num((Decimal(str(line['base_quantity'])) - received) / factor)
        line['receipts'].append({'quantity': _num(quantity), 'unit': item['base_unit'],
            'location_id': location_id, 'timestamp': now(), 'group_id': result['group_id']})
        status = 'received' if all(Decimal(str(l['received'])) == Decimal(str(l['base_quantity'])) for l in obj['lines']) else 'partially_received'
        obj.setdefault('history', []).append({'from': obj['status'], 'to': status, 'actor_id': ctx['user_id'], 'timestamp': now(), 'reason': reason})
        obj['status'] = status
        return {'order': _save(conn, ctx, 'order', obj, 'order.received'), 'movement': result}
    return _atomic(conn, apply)


def _key(row):
    return (row['item_id'], row['location_id'], row.get('lot_id') or '')


def _count_tokens(conn, tenant):
    tokens = defaultdict(list)
    for row in _ledger(conn, tenant):
        tokens[_key(row)].append(row['id'])
    return {key: _hash(sorted(ids)) for key, ids in tokens.items()}


def _count_scope_token(conn, tenant, item_ids, location_ids):
    item_ids, location_ids = set(item_ids), set(location_ids)
    return _hash(sorted(row['id'] for row in _ledger(conn, tenant)
                        if row['item_id'] in item_ids and row['location_id'] in location_ids))


def _count_create(conn, ctx, p):
    location_id = p.get('location_id') or None
    if location_id:
        _ref(conn, ctx, 'location', location_id)
    name = _s(p.get('name'), 'Count name')
    count_type = _s(p.get('type', 'cycle'), 'Count type')
    if count_type not in {'full', 'department', 'cycle', 'category', 'high_value', 'controlled', 'spot', 'random'}:
        raise DomainError('Unknown count type.')
    location_scope = {location_id} if location_id else None
    if count_type == 'department' and location_id:
        # A department count includes its cabinets, shelves and carts.
        location_records = list_obj(conn, _tenant(ctx), 'location')
        while True:
            descendants = {l['id'] for l in location_records if l.get('parent_id') in location_scope
                           and l.get('status', 'active') == 'active'}
            expanded = location_scope | descendants
            if expanded == location_scope:
                break
            location_scope = expanded
    items = {i['id']: i for i in list_obj(conn, _tenant(ctx), 'item') if i.get('status', 'active') == 'active'}
    selected_ids = p.get('item_ids')
    if selected_ids is not None:
        if not isinstance(selected_ids, list) or len(selected_ids) > MAX_ROWS:
            raise DomainError('Item selection must be a list.')
        for item_id in selected_ids:
            _ref(conn, ctx, 'item', item_id)
    category = p.get('category') or None
    if category and not any(i.get('category') == category for i in items.values()):
        raise DomainError('No items belong to the selected category.')
    eligible = {k: i for k, i in items.items() if (not category or i.get('category') == category)
        and (not selected_ids or k in selected_ids) and (count_type != 'controlled' or i.get('restricted'))
        and (count_type != 'high_value' or Decimal(str(i.get('unit_cost', 0))) >= _d(p.get('minimum_value', 100), 'Minimum item value', True))}
    rows = {_key(b): b for b in balances(conn, _tenant(ctx)) if b['item_id'] in eligible and (location_scope is None or b['location_id'] in location_scope)}
    for rule in list_obj(conn, _tenant(ctx), 'rule'):
        key = (rule['item_id'], rule['location_id'], '')
        if rule['item_id'] in eligible and (location_scope is None or rule['location_id'] in location_scope) and not eligible[rule['item_id']].get('lot_required'):
            rows.setdefault(key, {'item_id': key[0], 'location_id': key[1], 'lot_id': '', 'on_hand': 0})
    if location_id:
        for item in eligible.values():
            if not item.get('lot_required'):
                key = (item['id'], location_id, '')
                rows.setdefault(key, {'item_id': key[0], 'location_id': key[1], 'lot_id': '', 'on_hand': 0})
    if count_type == 'random':
        # Stable pseudorandom ordering for reproducibility, sampled only once.
        seed = new_id()
        size = p.get('sample_size', 20)
        if isinstance(size, bool) or not isinstance(size, int) or not 1 <= size <= 100:
            raise DomainError('Random count sample size must be an integer from 1 to 100.')
        rows = dict(sorted(rows.items(), key=lambda kv: _hash([seed, kv[0]]))[:size])
    if not rows:
        raise DomainError('No inventory or configured stock locations match this count.')
    tokens = _count_tokens(conn, _tenant(ctx))
    lines = [{'item_id': key[0], 'location_id': key[1], 'lot_id': key[2], 'item_name': eligible[key[0]]['name'],
        'unit': eligible[key[0]]['base_unit'], 'expected': row['on_hand'], 'actual': None, 'difference': None,
        'ledger_token': tokens.get(key, _hash([]))} for key, row in sorted(rows.items())]
    scope_items = sorted({line['item_id'] for line in lines})
    scope_locations = sorted({line['location_id'] for line in lines})
    return _save(conn, ctx, 'count', {'name': name, 'type': count_type, 'location_id': location_id, 'category': category,
        'status': 'open', 'state': 'open', 'created_at': now(), 'created_by': ctx['user_id'], 'lines': lines,
        'scope_item_ids': scope_items, 'scope_location_ids': scope_locations,
        'scope_token': _count_scope_token(conn, _tenant(ctx), scope_items, scope_locations)}, 'count.created')


def _count_record(conn, ctx, p):
    obj = get_obj(conn, _tenant(ctx), 'count', _s(p.get('id'), 'Count'))
    if obj['status'] == 'reconciled':
        raise DomainError('This count has already been reconciled.', 409, 'count_closed')
    key = (p.get('item_id'), p.get('location_id'), p.get('lot_id') or '')
    line = next((l for l in obj['lines'] if _key(l) == key), None)
    if line is None:
        raise DomainError('Item, location and lot are not part of this count.')
    actual = _d(p.get('actual'), 'Actual quantity', True)
    if actual * MICRO != (actual * MICRO).to_integral_value():
        raise DomainError('Actual quantity supports at most six decimal places.')
    line.update(actual=_num(actual), difference=_num(actual - Decimal(str(line['expected']))), recorded_by=ctx['user_id'], recorded_at=now())
    obj['status'] = obj['state'] = 'review' if all(l['actual'] is not None for l in obj['lines']) else 'open'
    return _save(conn, ctx, 'count', obj, 'count.recorded')


def _count_reconcile(conn, ctx, p):
    obj = get_obj(conn, _tenant(ctx), 'count', _s(p.get('id'), 'Count'))
    if obj['status'] != 'review':
        raise DomainError('Record every count line before reconciliation.', 409, 'count_incomplete')
    reason = _s(p.get('reason'), 'Reconciliation reason')
    tokens = _count_tokens(conn, _tenant(ctx))
    changed = [l for l in obj['lines'] if tokens.get(_key(l), _hash([])) != l['ledger_token']]
    scope_changed = obj.get('scope_token') and obj['scope_token'] != _count_scope_token(
        conn, _tenant(ctx), obj['scope_item_ids'], obj['scope_location_ids'])
    if changed or scope_changed:
        raise DomainError('Stock moved after this count began. Start a fresh count for the changed inventory.', 409, 'stale_count')
    def apply():
        transactions = []
        for line in obj['lines']:
            if line['difference']:
                transactions.append(move(conn, ctx, {'kind': 'adjust', 'item_id': line['item_id'],
                    'location_id': line['location_id'], 'lot_id': line['lot_id'] or None, 'unit': line['unit'],
                    'actual_quantity': line['actual'], 'quantity': line['actual'], 'reason': reason,
                    'reference': obj['id'], 'metadata': {'count_id': obj['id'], 'expected': line['expected']}}))
        obj.update(status='reconciled', state='reconciled', reconciled_at=now(), reconciled_by=ctx['user_id'], reason=reason,
                   accuracy=round(100 * sum(l['difference'] == 0 for l in obj['lines']) / len(obj['lines']), 1))
        return {'count': _save(conn, ctx, 'count', obj, 'count.reconciled'), 'movements': transactions}
    return _atomic(conn, apply)


def _mapping_save(conn, ctx, p):
    item = _ref(conn, ctx, 'item', p.get('item_id'))
    source = _s(p.get('source'), 'Source', maximum=100)
    external_id = _s(p.get('external_item_id'), 'External item ID', maximum=200)
    unit = _s(p.get('unit'), 'Kura unit', maximum=100)
    _quantity(item, 1, unit)
    factor = _d(p.get('factor', 1), 'Conversion factor')
    for mapping in _find(conn, _tenant(ctx), 'mapping', {'source': source, 'external_item_id': external_id}):
        if mapping['id'] != p.get('id'):
            raise DomainError('This source item already has a mapping.', 409, 'duplicate_mapping')
    obj = {'source': source, 'external_item_id': external_id, 'item_id': item['id'], 'unit': unit,
           'external_unit': _s(p.get('external_unit', unit), 'External unit', maximum=100), 'factor': _num(factor)}
    if p.get('id'):
        previous = get_obj(conn, _tenant(ctx), 'mapping', _s(p['id'], 'Mapping ID'))
        if p.get('version') != previous['version']:
            raise DomainError('Mapping changed. Reload before editing.', 409, 'version_conflict')
        obj.update(id=p['id'], version=p['version'])
    return _save(conn, ctx, 'mapping', obj, 'mapping.saved')


def _location_mapping_save(conn, ctx, p):
    location = _ref(conn, ctx, 'location', p.get('location_id'))
    source = _s(p.get('source'), 'Source', maximum=100)
    external_id = _s(p.get('external_location_id'), 'Source location', maximum=200)
    for mapping in _find(conn, _tenant(ctx), 'location_mapping', {'source': source, 'external_location_id': external_id}):
        if mapping['id'] != p.get('id'):
            raise DomainError('This source location already has a mapping.', 409, 'duplicate_mapping')
    obj = {'source': source, 'external_location_id': external_id, 'location_id': location['id']}
    if p.get('id'):
        previous = get_obj(conn, _tenant(ctx), 'location_mapping', _s(p['id'], 'Mapping ID'))
        if p.get('version') != previous['version']:
            raise DomainError('Mapping changed. Reload before editing.', 409, 'version_conflict')
        obj.update(id=p['id'], version=p['version'])
    return _save(conn, ctx, 'location_mapping', obj, 'location_mapping.saved')


def _event_location(conn, ctx, envelope):
    """A Kura location ID, or an explicit source-location mapping. Never guessed from a name."""
    if envelope.get('location_id') and envelope.get('external_location_id'):
        raise DomainError('Provide either a Kura location ID or a source location, not both.', 400, 'ambiguous_location')
    if envelope.get('external_location_id'):
        external = _s(envelope.get('external_location_id'), 'Source location', maximum=200)
        matches = _find(conn, _tenant(ctx), 'location_mapping', {'source': envelope['source'], 'external_location_id': external})
        if len(matches) != 1:
            raise DomainError(f'No location mapping exists for "{external}". Map it to a Kura location, then retry.', 409, 'location_mapping_missing')
        return _ref(conn, ctx, 'location', matches[0]['location_id'])
    return _ref(conn, ctx, 'location', envelope.get('location_id'))


def _event_apply(conn, ctx, envelope):
    event_type = envelope.get('event_type')
    if envelope.get('event_version') != 1 or isinstance(envelope.get('event_version'), bool):
        raise DomainError('Only event version 1 is supported.', 400, 'unsupported_version')
    if event_type not in SUPPORTED_EVENTS:
        raise DomainError('Unsupported inventory event type.', 400, 'unsupported_event')
    if envelope.get('metadata') is not None and not isinstance(envelope['metadata'], dict):
        raise DomainError('Event metadata must be an object.')
    timestamp = _s(envelope.get('timestamp'), 'Event timestamp')
    try:
        parsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            raise ValueError()
    except ValueError:
        raise DomainError('Event timestamp must include an explicit time zone.', 400, 'invalid_timestamp')
    if parsed > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise DomainError('Event timestamp is in the future.', 400, 'future_event')
    if envelope.get('organization') and envelope['organization'] != _tenant(ctx):
        raise DomainError('Event organization does not match authenticated organization.', 403, 'tenant_mismatch')
    if envelope.get('tenant_id') and envelope['tenant_id'] != _tenant(ctx):
        raise DomainError('Event tenant does not match authenticated organization.', 403, 'tenant_mismatch')
    for field in ('hospital', 'department'):
        if envelope.get(field):
            _ref(conn, ctx, 'location', envelope[field])
    # Validate even optional references for non-mutating lifecycle events.
    for field, kind in (('item_id', 'item'), ('location_id', 'location'), ('lot_id', 'lot')):
        if envelope.get(field):
            linked = _ref(conn, ctx, kind, envelope[field])
            if kind == 'lot' and envelope.get('item_id') and linked['item_id'] != envelope['item_id']:
                raise DomainError('Lot does not belong to the event item.', 400, 'lot_mismatch')
    if event_type in LIFECYCLE_EVENTS:
        if envelope.get('location_id'):
            _ref(conn, ctx, 'location', envelope['location_id'])
        return {'stock_changed': False, 'message': 'Lifecycle event recorded. No inventory consumption is implied.'}
    if event_type in REVERSAL_EVENTS:
        prior_key = _s(envelope.get('reversal_of'), 'Original source event ID')
        matches = _find(conn, _tenant(ctx), 'event', {'source': envelope['source'], 'event_id': prior_key})
        prior = matches[0] if matches else None
        if not prior or prior['status'] != 'accepted':
            raise DomainError('The original event has not been accepted. Retry after it arrives.', 409, 'original_event_missing')
        if prior.get('reversed_by'):
            raise DomainError('This event was already reversed.', 409, 'already_reversed')
        entries = prior.get('result', {}).get('entries', [])
        if entries:
            result = core.handle(conn, ctx, 'stock.reverse', {'transaction_id': entries[0]['id'],
                'reason': 'Integration reversal ' + envelope['event_id'], 'source': envelope['source'],
                'event_id': envelope['event_id'], 'source_transaction_id': envelope.get('source_transaction_id'),
                'metadata': {'reversal_event_id': envelope['event_id'], 'original_event_id': prior_key}})
        elif prior.get('result', {}).get('reservation_id'):
            result = core.handle(conn, ctx, 'reservation.release', {'id': prior['result']['reservation_id'],
                'reason': 'Integration reversal ' + envelope['event_id']})
        else:
            raise DomainError('The original event has no reversible stock or reservation action.', 409, 'no_reversible_action')
        prior['reversed_by'] = envelope['event_id']
        save_obj(conn, _tenant(ctx), 'event', prior)
        return result
    if event_type == 'InventoryReservationReleased':
        reservation_id = (envelope.get('metadata') or {}).get('reservation_id')
        reservation = get_obj(conn, _tenant(ctx), 'reservation', _s(reservation_id, 'Reservation ID in metadata'))
        if envelope.get('item_id') and reservation['item_id'] != envelope['item_id']:
            raise DomainError('Reservation item does not match the event.')
        if envelope.get('location_id') and reservation['location_id'] != envelope['location_id']:
            raise DomainError('Reservation location does not match the event.')
        return core.handle(conn, ctx, 'reservation.release', {'id': reservation_id, 'reason': 'Integration ' + envelope['event_id']})
    if envelope.get('item_id') and envelope.get('external_item_id'):
        raise DomainError('Provide either a Kura item ID or an external item ID, not both.', 400, 'ambiguous_mapping')
    quantity = envelope.get('quantity')
    unit = envelope.get('unit')
    if envelope.get('item_id'):
        item = _ref(conn, ctx, 'item', envelope['item_id'])
    else:
        external_id = _s(envelope.get('external_item_id'), 'External item ID')
        matches = _find(conn, _tenant(ctx), 'mapping', {'source': envelope['source'], 'external_item_id': external_id})
        if len(matches) != 1:
            raise DomainError('No unambiguous item mapping exists. Add a mapping, then retry.', 409, 'mapping_missing')
        mapping = matches[0]
        if unit != mapping.get('external_unit', mapping['unit']):
            raise DomainError('Event unit does not match the explicit mapping conversion.', 400, 'mapping_unit_mismatch')
        item = _ref(conn, ctx, 'item', mapping['item_id'])
        quantity = _num(_d(quantity) * _d(mapping['factor']))
        unit = mapping['unit']
    _quantity(item, quantity, unit)
    location = _event_location(conn, ctx, envelope)
    reference = _s(envelope.get('reference'), 'Reference', False)
    metadata = envelope.get('metadata') or {}
    if not isinstance(metadata, dict):
        raise DomainError('Event metadata must be an object.')
    metadata = {**metadata, 'event_id': envelope['event_id'], 'event_timestamp': timestamp,
        'event_type': event_type, 'source_transaction_id': envelope.get('source_transaction_id'),
        'employee': envelope.get('employee'), 'patient': envelope.get('patient')}
    if event_type == 'InventoryReservationCreated':
        result = core.handle(conn, ctx, 'reservation.create', {'item_id': item['id'], 'location_id': location['id'],
            'quantity': quantity, 'unit': unit, 'reference': reference or envelope['event_id'],
            'reason': 'Integration ' + envelope['event_id'], 'source': envelope['source'], 'metadata': metadata})
        # Core reservation commands return the object itself.
        return {**result, 'reservation_id': result.get('id') or result.get('reservation', {}).get('id')}
    return move(conn, ctx, {'kind': 'waste' if event_type in WASTE_EVENTS else 'use',
        'item_id': item['id'], 'location_id': location['id'], 'quantity': quantity, 'unit': unit,
        'lot_id': envelope.get('lot_id'), 'reference': reference, 'reason': event_type,
        'source': envelope['source'], 'event_id': envelope['event_id'],
        'source_transaction_id': envelope.get('source_transaction_id'), 'metadata': metadata})


def _process_event(conn, ctx, obj):
    obj['attempts'] = obj.get('attempts', 0) + 1
    obj['last_attempt_at'] = now()
    try:
        obj['result'] = _atomic(conn, lambda: _event_apply(conn, ctx, obj['envelope']))
        obj['status'] = 'accepted'
        obj['error'] = None
        for exception in _find(conn, _tenant(ctx), 'exception', {'event_record_id': obj['id']}):
            if exception.get('status') == 'open':
                exception.update(status='resolved', resolved_at=now(), reason='Event retry succeeded')
                save_obj(conn, _tenant(ctx), 'exception', exception)
    except DomainError as exc:
        obj['status'] = 'failed'
        obj['error'] = {'message': str(exc), 'code': getattr(exc, 'code', 'validation')}
        previous_matches = _find(conn, _tenant(ctx), 'exception', {'event_record_id': obj['id']})
        previous = previous_matches[0] if previous_matches else None
        issue = {**(previous or {}), 'event_record_id': obj['id'], 'type': 'integration', 'status': 'open',
            'title': 'Integration event needs review', 'message': str(exc), 'code': getattr(exc, 'code', 'validation'),
            'source': obj['source'], 'created_at': previous.get('created_at', now()) if previous else now()}
        save_obj(conn, _tenant(ctx), 'exception', issue)
    return _save(conn, ctx, 'event', obj, 'integration.' + obj['status'])


def _integration_event(conn, ctx, p):
    if not isinstance(p, dict):
        raise DomainError('An event must be an object.')
    event_id = _s(p.get('event_id'), 'Event ID', maximum=200)
    source = _s(p.get('source'), 'Source application', maximum=100)
    try:
        digest = _hash(p)
    except (ValueError, TypeError):
        raise DomainError('Event must contain finite JSON values.')
    matches = _find(conn, _tenant(ctx), 'event', {'source': source, 'event_id': event_id})
    existing = matches[0] if matches else None
    if existing:
        if existing['payload_hash'] != digest:
            raise DomainError('Event ID was already used with different content.', 409, 'idempotency_conflict')
        return {**existing, 'duplicate': True}
    if len(json.dumps(p)) > 100000:
        raise DomainError('Event exceeds the maximum envelope size.')
    obj = save_obj(conn, _tenant(ctx), 'event', {'event_id': event_id, 'source': source,
        'event_type': p.get('event_type'), 'event_version': p.get('event_version'), 'envelope': p,
        'payload_hash': digest, 'status': 'pending', 'attempts': 0, 'created_at': now()})
    return _process_event(conn, ctx, obj)


def _integration_retry(conn, ctx, p):
    obj = get_obj(conn, _tenant(ctx), 'event', _s(p.get('id'), 'Event record'))
    if obj['status'] != 'failed':
        raise DomainError('Only failed events can be retried.', 409, 'event_not_failed')
    return _process_event(conn, ctx, obj)


RETRYABLE_CODES = {'mapping_missing', 'location_mapping_missing', 'original_event_missing', 'insufficient_stock'}


def _event_time(obj):
    return str((obj.get('envelope') or {}).get('timestamp') or obj.get('created_at') or '')


def _integration_retry_source(conn, ctx, p):
    """Retry a source's failed events oldest first, so an original is accepted before its reversal."""
    source = _s(p.get('source'), 'Source application', maximum=100)
    codes = set(p.get('codes') or RETRYABLE_CODES)
    failed = [e for e in _find(conn, _tenant(ctx), 'event', {'source': source})
              if e.get('status') == 'failed' and (e.get('error') or {}).get('code') in codes]
    failed.sort(key=lambda e: (_event_time(e), e.get('created_at', '')))
    results = {'retried': 0, 'accepted': 0, 'still_failed': 0}
    for obj in failed[:int(p.get('limit') or 500)]:
        done = _process_event(conn, ctx, obj)
        results['retried'] += 1
        results['accepted' if done['status'] == 'accepted' else 'still_failed'] += 1
    return results


def _integration_ignore(conn, ctx, p):
    obj = get_obj(conn, _tenant(ctx), 'event', _s(p.get('id'), 'Event record'))
    if obj['status'] != 'failed':
        raise DomainError('Only a failed event can be marked ignored.', 409, 'event_not_failed')
    reason = _s(p.get('reason'), 'Reason for ignoring the event')
    obj.update(status='ignored', ignored_by=ctx['user_id'], ignored_at=now(), ignore_reason=reason)
    for issue in _find(conn, _tenant(ctx), 'exception', {'event_record_id': obj['id']}):
        issue.update(status='ignored', reason=reason, resolved_at=now())
        save_obj(conn, _tenant(ctx), 'exception', issue)
    return _save(conn, ctx, 'event', obj, 'integration.ignored')


IMPORT_FIELDS = {'name','sku','category','brand','generic_name','manufacturer','description','base_unit','purchase_unit',
    'consume_unit','units','barcodes','vendor_id','vendor_sku','unit_cost','lot_required','expiry_required','serial_required',
    'restricted','hazardous','refrigerated','storage','minimum','reorder_point','target','safety_stock','lead_days','order_multiple',
    'status','notes','alternatives','metadata'}
BULK_FIELDS = {
    'item': {'vendor_id','category','minimum','reorder_point','target','safety_stock','lead_days','order_multiple','status','notes'},
    'location': {'status','notes'}, 'vendor': {'status','lead_days','minimum_order','shipping_terms','notes'},
    'rule': {'minimum','reorder_point','target','safety_stock','order_multiple'},
}


def _import_rows(p):
    rows = p.get('rows')
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_ROWS:
        raise DomainError('Import requires between 1 and 10,000 item rows.')
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            raise DomainError('Row ' + str(i + 1) + ' must be an item object.')
        forbidden = set(row) - IMPORT_FIELDS
        if forbidden:
            raise DomainError('Row ' + str(i + 1) + ' contains unsupported fields: ' + ', '.join(sorted(forbidden)))
    return rows


def _dry_run(conn, operations):
    """Validate the whole dataset together, so within-file duplicates are caught."""
    name = 'preview_' + new_id().replace('-', '')
    conn.execute('SAVEPOINT ' + name)
    errors, results = [], []
    try:
        for index, operation in enumerate(operations):
            try:
                results.append(_atomic(conn, operation))
            except DomainError as exc:
                errors.append({'row': index + 1, 'message': str(exc), 'code': getattr(exc, 'code', 'validation')})
    finally:
        conn.execute('ROLLBACK TO ' + name)
        conn.execute('RELEASE ' + name)
    return results, errors


def _preview(conn, ctx, mode, data, operations, versions=None):
    results, errors = _dry_run(conn, operations)
    obj = save_obj(conn, _tenant(ctx), 'preview', {'mode': mode, 'payload_hash': _hash(data), 'versions': versions or {},
        'valid': not errors, 'actor_id': ctx['user_id'], 'created_at': now(), 'used': False})
    return {'preview_id': obj['id'], 'valid': not errors, 'errors': errors, 'count': len(operations),
            'rows': results if mode == 'import' else [], 'items': results if mode == 'bulk' else [], 'changes': data.get('changes')}


def _check_preview(conn, ctx, p, mode, data):
    obj = get_obj(conn, _tenant(ctx), 'preview', _s(p.get('preview_id'), 'Preview ID'))
    if obj['mode'] != mode or obj['payload_hash'] != _hash(data) or obj['actor_id'] != ctx['user_id']:
        raise DomainError('The submitted changes do not match your preview.', 409, 'preview_mismatch')
    if not obj['valid'] or obj.get('used'):
        raise DomainError('Create a new valid preview before applying these changes.', 409, 'invalid_preview')
    if datetime.fromisoformat(obj['created_at'].replace('Z', '+00:00')) < datetime.now(timezone.utc) - timedelta(hours=1):
        raise DomainError('This preview expired. Review the changes again.', 409, 'preview_expired')
    return obj


def _import(conn, ctx, command, p):
    rows = _import_rows(p)
    data = {'rows': rows}
    operations = [lambda row=row: core.handle(conn, ctx, 'item.save', row) for row in rows]
    if command == 'import.preview':
        return _preview(conn, ctx, 'import', data, operations)
    preview = _check_preview(conn, ctx, p, 'import', data)
    def apply():
        results = [operation() for operation in operations]
        preview['used'] = True
        save_obj(conn, _tenant(ctx), 'preview', preview)
        audit(conn, ctx, 'import.committed', {'count': len(results), 'preview_id': preview['id']})
        return {'count': len(results), 'items': results}
    return _atomic(conn, apply)


def _bulk(conn, ctx, command, p):
    kind = p.get('kind')
    if not isinstance(kind, str) or kind not in BULK_FIELDS:
        raise DomainError('This entity type cannot be bulk edited.')
    ids = p.get('ids')
    if not isinstance(ids, list) or not 1 <= len(ids) <= MAX_ROWS or any(not isinstance(i, str) for i in ids) or len(set(ids)) != len(ids):
        raise DomainError('Select between 1 and 10,000 unique records.')
    changes = p.get('changes')
    if not isinstance(changes, dict) or not changes or set(changes) - BULK_FIELDS[kind]:
        raise DomainError('Bulk changes contain unsupported or protected fields.')
    records = [get_obj(conn, _tenant(ctx), kind, identifier) for identifier in ids]
    versions = {obj['id']: obj['version'] for obj in records}
    data = {'kind': kind, 'ids': ids, 'changes': changes}
    operations = [lambda obj=obj: core.handle(conn, ctx, kind + '.save', {**obj, **changes}) for obj in records]
    if command == 'bulk.preview':
        return _preview(conn, ctx, 'bulk', data, operations, versions)
    preview = _check_preview(conn, ctx, p, 'bulk', data)
    if preview['versions'] != versions:
        raise DomainError('Records changed after the preview. Review the changes again.', 409, 'version_conflict')
    def apply():
        results = [operation() for operation in operations]
        preview['used'] = True
        save_obj(conn, _tenant(ctx), 'preview', preview)
        audit(conn, ctx, 'bulk.applied', {'kind': kind, 'count': len(results), 'changes': changes, 'preview_id': preview['id']})
        return {'count': len(results), 'items': results}
    return _atomic(conn, apply)


def _setting_save(conn, ctx, p):
    identifier = _s(p.get('id'), 'Setting name', maximum=100)
    if identifier not in {'notifications', 'features', 'setup', 'procurement', 'counts', 'appearance', 'planning', 'dea'}:
        raise DomainError('Unknown setting group.')
    data = p.get('data')
    if not isinstance(data, dict) or len(json.dumps(data)) > 50000:
        raise DomainError('Settings must be an object smaller than 50 KB.')
    if identifier == 'notifications':
        if 'expiration_days' in data:
            days = data['expiration_days']
            if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 365:
                raise DomainError('Expiration alert days must be between 1 and 365.')
        if 'recipients' in data and (not isinstance(data['recipients'], list) or any(not isinstance(r, str) or '@' not in r for r in data['recipients'])):
            raise DomainError('Notification recipients must be a list of email addresses.')
        data = {**data, 'delivery': 'in_app', 'email_connected': False}
    if identifier == 'features':
        allowed = {'forecasting', 'transfer_suggestions', 'receiving'}
        if set(data) - allowed or any(value not in {'off', 'pilot', 'on'} for value in data.values()):
            raise DomainError('Feature values must be off, pilot or on for supported features.')
    if identifier == 'dea':
        if set(data) - {'registrant', 'dea_number', 'address', 'count_every_hours'}:
            raise DomainError('DEA settings are registrant, dea_number, address and count_every_hours.')
        if data.get('dea_number') and not controlled.valid_dea_number(data['dea_number']):
            raise DomainError('That DEA number does not look right (two letters, seven digits, and the check digit must match).')
        if data.get('dea_number'):
            data = {**data, 'dea_number': data['dea_number'].strip().upper()}
        hours = data.get('count_every_hours', 24)
        if isinstance(hours, bool) or not isinstance(hours, int) or not 4 <= hours <= 168:
            raise DomainError('Count every (hours) must be from 4 to 168.')
    if identifier == 'planning':
        limits = {'history_days': (14, 90), 'safety_days': (0, 14), 'cover_days': (1, 30)}
        if set(data) - set(limits) - {'timezone'}:
            raise DomainError('Planning settings are history_days, safety_days, cover_days and timezone.')
        for key, (low, high) in limits.items():
            if key in data and (isinstance(data[key], bool) or not isinstance(data[key], int) or not low <= data[key] <= high):
                raise DomainError(f'{key.replace("_", " ").capitalize()} must be a whole number from {low} to {high}.')
        if 'timezone' in data and data['timezone'] not in planning.US_ZONES:
            raise DomainError('Choose a US time zone.')
    previous = next((s for s in list_obj(conn, _tenant(ctx), 'setting') if s['id'] == identifier), None)
    obj = {'id': identifier, 'data': data}
    if previous:
        obj['version'] = previous['version']
    return _save(conn, ctx, 'setting', obj, 'setting.saved')


def _dismiss(conn, ctx, p):
    item = _ref(conn, ctx, 'item', p.get('item_id'))
    location = _ref(conn, ctx, 'location', p.get('location_id'))
    reason = _s(p.get('reason'), 'Override reason')
    current = [r for r in recommendations(conn, ctx) if r['item_id'] == item['id'] and r['location_id'] == location['id']]
    if not current:
        raise DomainError('No current recommendation exists for this item and location.', 409, 'recommendation_changed')
    return _save(conn, ctx, 'override', {'item_id': item['id'], 'location_id': location['id'],
        'reason': reason, 'created_at': now(), 'actor_id': ctx['user_id'], 'recommendation_hash': _hash(current),
        'state_signature': current[0]['state_signature']}, 'recommendation.dismissed')


def _alert_resolve(conn, ctx, p):
    identifier = _s(p.get('id'), 'Alert ID')
    reason = _s(p.get('reason'), 'Resolution reason')
    alerts = _alerts(conn, ctx)
    current = next((a for a in alerts if a['id'] == identifier), None)
    if not current:
        raise DomainError('This alert is no longer active.', 409, 'alert_changed')
    existing = next((a for a in list_obj(conn, _tenant(ctx), 'alert') if a['id'] == identifier), None)
    return _save(conn, ctx, 'alert', {**(existing or {}), 'id': identifier, 'status': 'acknowledged',
        'reason': reason, 'acknowledged_at': now(), 'acknowledged_by': ctx['user_id'],
        'state_signature': current['state_signature']}, 'alert.acknowledged')


def _exception_resolve(conn, ctx, p):
    issue = get_obj(conn, _tenant(ctx), 'exception', _s(p.get('id'), 'Exception'))
    if issue.get('status') not in {'open', 'needs_review'}:
        raise DomainError('This exception is already resolved.', 409, 'exception_closed')
    if issue.get('type') == 'integration':
        raise DomainError('Retry or ignore the original integration event instead.', 409, 'integration_resolution_required')
    reason = _s(p.get('reason'), 'Reconciliation reason')
    count = get_obj(conn, _tenant(ctx), 'count', _s(p.get('count_id'), 'Reconciled count ID'))
    if count.get('status') != 'reconciled':
        raise DomainError('The evidence count must be fully reconciled.', 409, 'count_incomplete')
    if count.get('created_at', '') < issue['created_at'] or count.get('reconciled_at', '') < issue['created_at']:
        raise DomainError('Count evidence must have been collected after this exception.', 409, 'stale_evidence')
    evidence = [line for line in count['lines'] if line['item_id'] == issue.get('item_id') and line['location_id'] == issue.get('location_id')]
    if not evidence:
        raise DomainError('The count does not include the exception item and location.', 409, 'evidence_mismatch')
    issue.update(status='resolved', resolved_at=now(), resolved_by=ctx['user_id'], resolution_reason=reason,
                 count_id=count['id'], evidence_lines=evidence,
                 resolution='Physical inventory reconciled; original reported shortage and transaction history preserved.')
    return _save(conn, ctx, 'exception', issue, 'exception.resolved')


def recommendations(conn, ctx, state=None):
    tenant = _tenant(ctx)
    items = {i['id']: i for i in _data(conn, tenant, 'item', state) if i.get('status', 'active') == 'active'}
    locations = {l['id']: l for l in _data(conn, tenant, 'location', state) if l.get('status', 'active') == 'active'}
    vendors = {v['id']: v for v in _data(conn, tenant, 'vendor', state)}
    stock = defaultdict(lambda: {'available': Decimal(0), 'on_hand': Decimal(0), 'reserved': Decimal(0)})
    for b in _data(conn, tenant, 'balances', state):
        if b['item_id'] in items and b['location_id'] in locations:
            for field in ('available', 'on_hand', 'reserved'):
                stock[(b['item_id'], b['location_id'])][field] += Decimal(str(b.get(field, 0)))
    rules = {(r['item_id'], r['location_id']): r for r in _data(conn, tenant, 'rule', state) if r['item_id'] in items and r['location_id'] in locations}
    for key in stock:
        rules.setdefault(key, {**items[key[0]], 'item_id': key[0], 'location_id': key[1]})
    inbound, pending_review = defaultdict(Decimal), defaultdict(Decimal)
    for order in _data(conn, tenant, 'order', state):
        if order.get('status') not in OPEN_ORDER:
            continue
        for line in order['lines']:
            key = (line['item_id'], order['location_id'])
            remaining = Decimal(str(line['base_quantity'])) - Decimal(str(line['received']))
            (pending_review if order['status'] in {'needs_review', 'approved'} else inbound)[key] += remaining
    excess = {key: max(Decimal(0), stock[key]['available'] - max(Decimal(str(rule.get('target', 0))), Decimal(str(rule.get('safety_stock', 0)))))
              for key, rule in rules.items()}
    sources = defaultdict(list)
    for key in excess:
        sources[key[0]].append(key)
    result, dismissed = [], _data(conn, tenant, 'override', state)
    dismissed_by_key = defaultdict(list)
    for override in dismissed:
        dismissed_by_key[(override['item_id'], override['location_id'])].append(override)
    transfer_feature = _feature(conn, ctx, 'transfer_suggestions', state)
    for key, rule in sorted(rules.items()):
        item_id, location_id = key
        item = items[item_id]
        available = stock[key]['available']
        threshold = Decimal(str(rule.get('reorder_point', item.get('reorder_point', 0))))
        minimum = Decimal(str(rule.get('minimum', item.get('minimum', 0))))
        target = max(Decimal(str(rule.get('target', item.get('target', 0)))), threshold,
                     Decimal(str(rule.get('safety_stock', item.get('safety_stock', 0)))))
        if target <= 0 or available > threshold:
            continue
        needed = max(Decimal(0), target - available - inbound[key] - pending_review[key])
        signature = _hash({'available': str(available), 'inbound': str(inbound[key]), 'pending_review': str(pending_review[key]),
                           'target': str(target), 'threshold': str(threshold), 'rule_version': rule.get('version'),
                           'supplies': sorted((k[1], str(excess[k])) for k in sources[item_id])})
        is_dismissed = any(o.get('state_signature') == signature for o in dismissed_by_key[key])
        common = {'item_id': item_id, 'item_name': item['name'], 'location_id': location_id,
            'location_name': locations[location_id]['name'], 'unit': item['base_unit'], 'available': _num(available),
            'reserved': _num(stock[key]['reserved']), 'minimum': _num(minimum), 'reorder_point': _num(threshold),
            'target': _num(target), 'inbound': _num(inbound[key]), 'pending_review': _num(pending_review[key]),
            'severity': 'critical' if available <= minimum else 'warning', 'state_signature': signature,
            'dismissed': is_dismissed, 'automation': 'recommendation', 'requires_approval': True}
        if needed <= 0:
            continue
        internal_coverage = Decimal(0)
        for source_key, supply in sorted(((k, excess[k]) for k in sources[item_id]), key=lambda kv: (-kv[1], kv[0])):
            if source_key[0] != item_id or source_key[1] == location_id or supply <= 0 or needed <= 0:
                continue
            amount = min(needed, supply)
            if transfer_feature != 'off':
                result.append({**common, 'id': 'transfer:' + ':'.join([item_id, source_key[1], location_id]),
                    'type': 'transfer', 'kind': 'transfer', 'source_location_id': source_key[1],
                    'source_location_name': locations[source_key[1]]['name'], 'quantity': _num(amount), 'rollout': transfer_feature,
                    'explanation': f"Available {_num(available)}; target {_num(target)}; {_num(inbound[key])} on order and {_num(pending_review[key])} in purchasing review. {locations[source_key[1]]['name']} has {_num(supply)} above its target and safety stock. Transfer {_num(amount)} before purchasing."})
            excess[source_key] -= amount
            needed -= amount
            internal_coverage += amount
        if needed > 0:
            purchase_unit = item.get('purchase_unit') or item['base_unit']
            factor = _d((item.get('units') or {}).get(purchase_unit, 1), 'Purchase unit conversion')
            order_multiple = _d(rule.get('order_multiple', item.get('order_multiple', 1)) or 1, 'Order multiple')
            packs = (needed / factor / order_multiple).to_integral_value(rounding=ROUND_CEILING) * order_multiple
            quantity = packs * factor
            vendor = vendors.get(item.get('vendor_id'), {})
            base_cost = Decimal(str(item.get('unit_cost', 0)))
            estimate = quantity * base_cost
            result.append({**common, 'id': 'purchase:' + item_id + ':' + location_id, 'type': 'purchase', 'kind': 'purchase',
                'vendor_id': item.get('vendor_id'), 'vendor_name': vendor.get('name', 'Vendor required'),
                'quantity': _num(quantity), 'purchase_quantity': _num(packs), 'purchase_unit': purchase_unit,
                'estimated_cost': _num(estimate), 'lead_days': vendor.get('lead_days', item.get('lead_days', 0)),
                'internal_coverage': _num(internal_coverage), 'transfer_suggestions': transfer_feature,
                'vendor_minimum': vendor.get('minimum_order', 0), 'vendor_minimum_met': estimate >= Decimal(str(vendor.get('minimum_order', 0))),
                'alternatives': item.get('alternatives', []),
                'explanation': f"Available {_num(available)}; target {_num(target)}; {_num(inbound[key])} on order and {_num(pending_review[key])} in purchasing review. Internal excess can cover {_num(internal_coverage)}. Remaining need {_num(needed)} rounds to {_num(packs)} {purchase_unit} ({_num(quantity)} {item['base_unit']}). Vendor minimum and delivery constraints require purchaser review."})
    return result


def insights(conn, ctx, state=None):
    tenant = _tenant(ctx)
    entries = _data(conn, tenant, 'ledger', state)
    items = {i['id']: i for i in _data(conn, tenant, 'item', state)}
    stocks = _data(conn, tenant, 'balances', state)
    current = datetime.now(timezone.utc)
    cut = current - timedelta(days=30)
    previous_cut = current - timedelta(days=60)
    usage, prior_usage, waste, cost, waste_cost = defaultdict(Decimal), defaultdict(Decimal), defaultdict(Decimal), defaultdict(Decimal), defaultdict(Decimal)
    department_cost = defaultdict(Decimal)
    first_seen, days = {}, defaultdict(set)
    reversed_ids = {e.get('reversal_of') for e in entries if e.get('reversal_of')}
    for entry in entries:
        item_id = entry['item_id']
        timestamp = datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00'))
        first_seen[item_id] = min(first_seen.get(item_id, timestamp), timestamp)
        if entry['id'] in reversed_ids or entry.get('reversal_of'):
            continue
        quantity = Decimal(str(entry['quantity']))
        if quantity >= 0:
            continue
        metadata = entry.get('metadata') or {}
        item = items.get(item_id, {})
        if metadata.get('base_unit_cost') is not None:
            unit_cost = Decimal(str(metadata['base_unit_cost']))
        elif metadata.get('unit_cost') is not None:
            factor = Decimal(str(item.get('units', {}).get(metadata.get('unit', item.get('base_unit')), 1)))
            unit_cost = Decimal(str(metadata['unit_cost'])) / factor
        else:
            unit_cost = Decimal(str(item.get('unit_cost', 0)))
        if entry['kind'] in {'use', 'emergency'}:
            if timestamp >= cut:
                usage[item_id] -= quantity
                cost[item_id] -= quantity * unit_cost
                department_cost[entry['location_id']] -= quantity * unit_cost
                days[item_id].add(timestamp.date().isoformat())
            elif timestamp >= previous_cut:
                prior_usage[item_id] -= quantity
        if entry['kind'] in {'waste', 'dispose'} and timestamp >= cut:
            waste[item_id] -= quantity
            waste_cost[item_id] -= quantity * unit_cost
    availability, on_hand = defaultdict(Decimal), defaultdict(Decimal)
    for balance in stocks:
        availability[balance['item_id']] += Decimal(str(balance['available']))
        on_hand[balance['item_id']] += Decimal(str(balance['on_hand']))
    details = []
    forecasting = _feature(conn, ctx, 'forecasting', state)
    for item_id, item in items.items():
        observed = min(30, max(0, (current - first_seen.get(item_id, current)).total_seconds() / 86400))
        adequate = observed >= 7 and len(days[item_id]) >= 3 and forecasting != 'off'
        average = usage[item_id] / Decimal(str(max(1, observed)))
        depletion = availability[item_id] / average if average > 0 and adequate else None
        change = (_num((usage[item_id] - prior_usage[item_id]) / prior_usage[item_id] * 100)
                  if prior_usage[item_id] > 0 and first_seen.get(item_id, current) <= previous_cut else None)
        details.append({'item_id': item_id, 'item_name': item['name'], 'unit': item['base_unit'],
            'used_30d': _num(usage[item_id]), 'wasted_30d': _num(waste[item_id]), 'usage_cost_30d': _num(cost[item_id]),
            'waste_cost_30d': _num(waste_cost[item_id]), 'average_daily_usage': round(float(average), 3) if adequate else None,
            'estimated_days_supply': round(float(depletion), 1) if depletion is not None else None,
            'days_supply_range': [round(float(depletion * Decimal('.75')), 1), round(float(depletion * Decimal('1.25')), 1)] if depletion is not None else None,
            'confidence': 'disabled' if forecasting == 'off' else ('descriptive_estimate' if adequate else 'insufficient_data'), 'observed_days': round(observed, 1),
            'usage_change_percent': change,
            'explanation': 'Forecasting is disabled by an administrator. Recorded usage remains available.' if forecasting == 'off' else ('Uses recorded consumption over up to 30 days; ±25% is a scenario range, not a statistical confidence interval. Unrecorded demand is unknown.' if adequate else 'At least seven days of inventory history and consumption on three distinct days are required. No depletion date is asserted.')})
    counts = [c for c in _data(conn, tenant, 'count', state) if c.get('status') == 'reconciled']
    counted = sum(len(c['lines']) for c in counts)
    matching = sum(sum(l.get('difference') == 0 for l in c['lines']) for c in counts)
    return {'inventory_value': _num(sum(on_hand[k] * Decimal(str(item.get('unit_cost', 0))) for k, item in items.items())),
        'valuation_method': 'Current acquisition cost estimate; not FIFO financial valuation.',
        'usage_cost_30d': _num(sum(cost.values())), 'waste_cost_30d': _num(sum(waste_cost.values())),
        'cost_basis': 'Recorded movement cost when available, otherwise current acquisition cost estimate; never client charges.',
        'inventory_accuracy': round(100 * matching / counted, 1) if counted else None,
        'counted_lines': counted, 'items': details,
        'department_consumption': [{'location_id': key, 'cost': _num(value)} for key, value in department_cost.items()],
        'automation': 'recommendation_only', 'forecasting': forecasting, 'as_of': now()}


def _alerts(conn, ctx, state=None, recs=None):
    tenant = _tenant(ctx)
    result = []
    stock_alert_ids = set()
    for recommendation in recs if recs is not None else recommendations(conn, ctx, state):
        key = 'stock:' + recommendation['item_id'] + ':' + recommendation['location_id']
        if key not in stock_alert_ids:
            stock_alert_ids.add(key)
            result.append({'id': key, 'type': 'stock', 'severity': recommendation['severity'], 'title': recommendation['item_name'] + ' needs replenishment',
                'message': recommendation['explanation'], 'item_id': recommendation['item_id'], 'location_id': recommendation['location_id'],
                'state_signature': recommendation['state_signature'], 'status': 'open'})
    # Low stock remains an actionable condition even if covered by an open PO,
    # or if automatic transfer suggestions are disabled.
    items = {i['id']: i for i in _data(conn, tenant, 'item', state) if i.get('status', 'active') == 'active'}
    stock = defaultdict(Decimal)
    for balance in _data(conn, tenant, 'balances', state):
        stock[(balance['item_id'], balance['location_id'])] += Decimal(str(balance['available']))
    rules = {(r['item_id'], r['location_id']): r for r in _data(conn, tenant, 'rule', state)}
    for key in stock:
        if key[0] in items:
            rules.setdefault(key, items[key[0]])
    for (item_id, location_id), rule in rules.items():
        if item_id not in items:
            continue
        available = stock[(item_id, location_id)]
        threshold = Decimal(str(rule.get('reorder_point', 0)))
        target = Decimal(str(rule.get('target', 0)))
        minimum = Decimal(str(rule.get('minimum', 0)))
        identifier = 'stock:' + item_id + ':' + location_id
        if target > 0 and available <= threshold and identifier not in stock_alert_ids:
            stock_alert_ids.add(identifier)
            result.append({'id': identifier, 'type': 'stock', 'severity': 'critical' if available <= minimum else 'warning',
                'title': items[item_id]['name'] + ' is below its stock threshold',
                'message': f"{_num(available)} {items[item_id]['base_unit']} available; reorder threshold {_num(threshold)}. Review incoming orders and internal stock before purchasing.",
                'item_id': item_id, 'location_id': location_id, 'status': 'open',
                'state_signature': _hash([item_id, location_id, str(available), str(threshold), str(target)])})
    settings = {s['id']: s.get('data', s) for s in _data(conn, tenant, 'setting', state)}
    expiration_days = settings.get('notifications', {}).get('expiration_days', 90)
    current_date = datetime.now(timezone.utc).date()
    balances_by_lot = defaultdict(Decimal)
    for balance in _data(conn, tenant, 'balances', state):
        balances_by_lot[balance.get('lot_id')] += Decimal(str(balance['on_hand']))
    for lot in _data(conn, tenant, 'lot', state):
        expires = lot.get('expires') or lot.get('expiration')
        if expires and balances_by_lot[lot['id']] > 0:
            days = (datetime.fromisoformat(expires.replace('Z', '+00:00')).date() - current_date).days
            if days <= expiration_days:
                result.append({'id': 'expiry:' + lot['id'], 'type': 'expiration', 'severity': 'critical' if days <= 0 else 'warning',
                    'title': 'Expired lot' if days < 0 else 'Lot approaching expiration', 'message': f"Lot {lot.get('code', lot.get('lot_code', lot['id']))}: {_num(balances_by_lot[lot['id']])} remaining; expiration {expires}.",
                    'lot_id': lot['id'], 'item_id': lot['item_id'], 'status': 'open', 'state_signature': _hash([expires, str(balances_by_lot[lot['id']])])})
    for issue in _data(conn, tenant, 'exception', state):
        if issue.get('status') in {'open', 'needs_review'}:
            result.append({'id': 'exception:' + issue['id'], 'type': issue.get('type', 'exception'), 'severity': 'critical',
                'title': issue.get('title', 'Inventory exception'), 'message': issue.get('message', issue.get('reason', 'Needs review')),
                'exception_id': issue['id'], 'status': 'open', 'state_signature': _hash([issue['id'], issue['version']])})
    for order in _data(conn, tenant, 'order', state):
        if order['status'] == 'backordered':
            result.append({'id': 'backorder:' + order['id'], 'type': 'backorder', 'severity': 'warning', 'title': 'Order backordered',
                'message': 'Review outstanding supply and expected delivery.', 'order_id': order['id'], 'status': 'open', 'state_signature': _hash(order)})
    for count in _data(conn, tenant, 'count', state):
        if count['status'] == 'review' and any(l.get('difference') for l in count['lines']):
            result.append({'id': 'count:' + count['id'], 'type': 'count', 'severity': 'warning', 'title': 'Count discrepancy needs reconciliation',
                'message': count['name'], 'count_id': count['id'], 'status': 'open', 'state_signature': _hash(count)})
    acknowledgments = {a['id']: a for a in _data(conn, tenant, 'alert', state)}
    for issue in result:
        ack = acknowledgments.get(issue['id'])
        if ack and ack.get('state_signature') == issue['state_signature']:
            issue.update(status='acknowledged', reason=ack.get('reason'), acknowledged_at=ack.get('acknowledged_at'))
    return result


def _readiness(conn, ctx, state=None):
    tenant = _tenant(ctx)
    items, locations, vendors = (_data(conn, tenant, kind, state) for kind in ('item', 'location', 'vendor'))
    entries = _data(conn, tenant, 'ledger', state)
    blockers, improvements = [], []
    if not items:
        blockers.append({'code': 'items_missing', 'message': 'Create or import inventory items.', 'count': 0})
    if not locations:
        blockers.append({'code': 'locations_missing', 'message': 'Create stock locations.', 'count': 0})
    metrics = {'items': len(items), 'barcodes_mapped': sum(bool(i.get('barcodes')) for i in items),
        'missing_barcodes': sum(not i.get('barcodes') for i in items), 'missing_vendors': sum(not i.get('vendor_id') for i in items),
        'missing_reorder_thresholds': sum(not i.get('target') for i in items), 'invalid_conversions': 0, 'duplicate_candidates': 0,
        'locations': len(locations), 'vendors': len(vendors), 'opening_entries': sum(e['kind'] == 'opening' for e in entries)}
    names = defaultdict(list)
    for item in items:
        names[item['name'].casefold().strip()].append(item['id'])
    metrics['duplicate_candidates'] = sum(len(ids) - 1 for ids in names.values() if len(ids) > 1)
    for code in ('missing_barcodes', 'missing_vendors', 'missing_reorder_thresholds', 'duplicate_candidates'):
        if metrics[code]:
            improvements.append({'code': code, 'count': metrics[code], 'message': code.replace('_', ' ').capitalize()})
    failed = sum(e['status'] == 'failed' for e in _data(conn, tenant, 'event', state))
    if failed:
        blockers.append({'code': 'failed_events', 'message': 'Review failed inventory events.', 'count': failed})
    if items and not metrics['opening_entries'] and not entries:
        improvements.append({'code': 'opening_inventory', 'message': 'Establish verified opening inventory before operational use.', 'count': 0})
    return {**metrics, 'blockers': blockers, 'improvements': improvements,
        'data_ready': not blockers, 'production_certified': False,
        'message': 'Data readiness only. Hosting, security, restore and hospital workflow validation are separate deployment requirements.'}


def snapshot(conn, ctx):
    tenant = _tenant(ctx)
    kinds = ('item','location','vendor','rule','lot','order','count','mapping','location_mapping','event','exception','setting','override','alert',
             'ccount','kitcheck','invoice','price','price_import')
    state = {kind: list_obj(conn, tenant, kind) for kind in kinds}
    state.update(balances=balances(conn, tenant), ledger=_ledger(conn, tenant))
    recs = recommendations(conn, ctx, state)
    alerts = _alerts(conn, ctx, state, recs)
    plan = planning.plan(state)
    ctl_state, kit_state = controlled.snapshot(state), kits.snapshot(state)
    return {**{kind + 's': state[kind] for kind in ('order', 'count', 'mapping', 'location_mapping', 'event', 'exception', 'setting')},
        'alerts': alerts, 'recommendations': recs, 'planning': {**plan, 'brief': planning.brief(state, plan, alerts, recs, kit_state, ctl_state)},
        'controlled': ctl_state, 'kits': kit_state, 'pricing': purchasing.pricing_snapshot(state), 'invoicing': purchasing.invoices_snapshot(state),
        'insights': insights(conn, ctx, state), 'readiness': _readiness(conn, ctx, state)}


def handle(conn, ctx, command, payload):
    if command not in PERMISSIONS:
        raise core.NotHandled()
    _require(ctx, PERMISSIONS[command])
    if not isinstance(payload, dict):
        raise DomainError('Command payload must be an object.')
    commands = {'order.save': _order_save, 'order.status': _order_status, 'order.receive': _order_receive,
        'count.create': _count_create, 'count.record': _count_record, 'count.reconcile': _count_reconcile,
        'mapping.save': _mapping_save, 'location_mapping.save': _location_mapping_save,
        'integration.event': _integration_event, 'integration.retry': _integration_retry,
        'integration.retry_source': _integration_retry_source,
        'integration.ignore': _integration_ignore, 'setting.save': _setting_save,
        'recommendation.dismiss': _dismiss, 'alert.resolve': _alert_resolve, 'exception.resolve': _exception_resolve}
    if command in commands:
        return commands[command](conn, ctx, payload)
    for module in (controlled, kits, purchasing):
        if command in module.PERMISSIONS:
            return module.handle(conn, ctx, command, payload)
    if command.startswith('import.'):
        return _import(conn, ctx, command, payload)
    return _bulk(conn, ctx, command, payload)
