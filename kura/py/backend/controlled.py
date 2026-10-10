"""Controlled substances: the DEA record for scheduled items (Schedules II–V).

What Kura keeps, on top of the append-only ledger every item already has:
- requirements on each movement of a scheduled item (check_move): a patient or case for each dose, a witness for
  waste, two witnesses for on-site destruction (the DEA Form 41 record), the reverse distributor for returns, and the
  DEA Form 222 / CSOS order number when Schedule II stock is received or returned;
- counts of a safe (or of the whole hospital, for the initial and biennial inventory) with a second person, and
  discrepancies that stay open until someone explains them — with the stock corrected only when they choose to;
- a witness or patient added afterwards to a dose that arrived without one (from Treatment Sheets), as a separate
  attestation — the original entry is never changed;
- the log itself (snapshot): every movement of every scheduled item with the running balance.

Kura helps keep these records; it does not replace the registrant's own review of DEA and Connecticut requirements.
"""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from .core import DomainError, audit, balances, get_obj, list_obj, move, now, save_obj

PERMISSIONS = {'controlled.count': 'inventory.count', 'controlled.resolve': 'inventory.adjust',
               'controlled.attest': 'inventory.count'}
SCHEDULES = ('II', 'III', 'IV', 'V')
METHODS = {'destroyed_on_site': 'Destroyed on site (Form 41)', 'reverse_distributor': 'Returned to a reverse distributor'}
DEFAULT_COUNT_HOURS = 24


def _name(value, label, required=True):
    text = re.sub(r'\s+', ' ', str(value or '')).strip()
    if required and len(text) < 2:
        raise DomainError(f'{label} is required for a controlled drug.', 400, 'controlled_record')
    if len(text) > 120:
        raise DomainError(f'{label} is too long.')
    return text


def valid_dea_number(number):
    """Two letters and seven digits; the last digit is the DEA check digit."""
    m = re.fullmatch(r'([A-Z]{2})(\d{7})', str(number or '').strip().upper())
    if not m:
        return False
    d = [int(c) for c in m.group(2)]
    return (d[0] + d[2] + d[4] + 2 * (d[1] + d[3] + d[5])) % 10 == d[6]


def schedule_of(item):
    return item.get('dea_schedule') if item.get('dea_schedule') in SCHEDULES else None


# ---------- every movement of a scheduled item ----------
def check_move(conn, ctx, payload):
    """Raise before the movement is recorded when a DEA record field is missing. Fields land in the entry's metadata."""
    try:
        item = get_obj(conn, ctx['tenant_id'], 'item', payload.get('item_id'))
    except DomainError:
        return                                            # move() reports the unknown item
    schedule = schedule_of(item)
    if not schedule:
        return
    kind, meta = payload.get('kind'), payload.setdefault('metadata', {}) if isinstance(payload.get('metadata', {}), dict) else {}
    meta['dea_schedule'] = schedule
    if kind in ('use', 'emergency'):
        if not str(payload.get('reference') or payload.get('patient') or '').strip():
            raise DomainError(f'{item["name"]} is Schedule {schedule}. Enter the patient (or case) it was given to.', 400, 'controlled_patient')
    elif kind == 'waste':
        meta['witness'] = _name(meta.get('witness'), 'A witness')
    elif kind == 'dispose':
        method = meta.get('disposal_method')
        if method not in METHODS:
            raise DomainError('Choose how the controlled drug left: destroyed on site or returned to a reverse distributor.', 400, 'controlled_method')
        if method == 'destroyed_on_site':
            meta['witness'] = _name(meta.get('witness'), 'The first witness')
            meta['witness_2'] = _name(meta.get('witness_2'), 'The second witness')
            if meta['witness'].casefold() == meta['witness_2'].casefold():
                raise DomainError('On-site destruction needs two different witnesses.', 400, 'controlled_record')
        else:
            meta['distributor'] = _name(meta.get('distributor'), 'The reverse distributor')
            if schedule == 'II':
                meta['dea_order_ref'] = _name(meta.get('dea_order_ref'), 'The DEA Form 222 number for this Schedule II return')
    elif kind == 'receive' and schedule == 'II':
        meta['dea_order_ref'] = _name(meta.get('dea_order_ref'), 'The DEA Form 222 or CSOS order number')
    elif kind == 'adjust' and len(str(payload.get('reason') or '').strip()) < 10:
        raise DomainError('Explain a controlled-drug correction in a full sentence (it becomes part of the DEA record).', 400, 'controlled_record')


# ---------- counts ----------
def _scheduled(conn, tenant):
    return {i['id']: i for i in list_obj(conn, tenant, 'item') if schedule_of(i)}


def _token(conn, tenant, item_id, location_id, lot_id):
    row = conn.execute("SELECT COUNT(*), COALESCE(MAX(timestamp),'') FROM ledger WHERE tenant_id=? AND item_id=? AND location_id=? AND lot_id=?",
                       (tenant, item_id, location_id, lot_id or '')).fetchone()
    return f'{row[0]}:{row[1]}'


def count(conn, ctx, p):
    """A count of every scheduled drug in one safe (location_id), or in the whole hospital for an inventory."""
    tenant = ctx['tenant_id']
    purpose = p.get('purpose', 'shift')
    if purpose not in ('shift', 'initial', 'biennial'):
        raise DomainError('Count purpose must be shift, initial or biennial.')
    location_id = p.get('location_id') or None
    if location_id:
        get_obj(conn, tenant, 'location', location_id)
    elif purpose == 'shift':
        raise DomainError('Choose the safe or area being counted.')
    witness = _name(p.get('witness'), 'A second person (witness)')
    items = _scheduled(conn, tenant)
    lots = {l['id']: l for l in list_obj(conn, tenant, 'lot')}
    expected = {}
    for b in balances(conn, tenant):
        if b['item_id'] in items and (location_id is None or b['location_id'] == location_id) and Decimal(str(b['on_hand'])) != 0:
            expected[(b['item_id'], b['location_id'], b.get('lot_id') or '')] = Decimal(str(b['on_hand']))
    given = {}
    for line in p.get('lines') or []:
        key = (line.get('item_id'), line.get('location_id') or location_id, line.get('lot_id') or '')
        if key[0] not in items:
            raise DomainError('Only scheduled drugs belong in a controlled count.')
        if not key[1]:
            raise DomainError('Each line needs its location.')
        try:
            actual = Decimal(str(line.get('actual')))
        except Exception:
            raise DomainError('Enter the counted quantity for every line.')
        if actual < 0:
            raise DomainError('Counted quantities cannot be negative.')
        given[key] = actual
    missing = [k for k in expected if k not in given]
    if missing:
        names = sorted({items[k[0]]['name'] for k in missing})
        raise DomainError('Count every controlled drug here: ' + ', '.join(names[:5]) + ('…' if len(names) > 5 else '') + '.', 400, 'count_incomplete')
    lines = []
    for key in sorted(set(expected) | set(given)):
        item, exp, act = items[key[0]], expected.get(key, Decimal(0)), given.get(key, expected.get(key, Decimal(0)))
        lines.append({'item_id': key[0], 'location_id': key[1], 'lot_id': key[2] or None, 'lot_code': (lots.get(key[2]) or {}).get('code'),
                      'schedule': schedule_of(item), 'unit': item['base_unit'], 'expected': float(exp), 'actual': float(act),
                      'difference': float(act - exp), 'token': _token(conn, tenant, *key)})
    off = [l for l in lines if l['difference'] != 0]
    record = save_obj(conn, tenant, 'ccount', {'type': 'count', 'purpose': purpose, 'location_id': location_id, 'at': now(),
        'by': ctx['user_id'], 'witness': witness, 'note': str(p.get('note') or '')[:1000], 'lines': lines,
        'status': 'discrepancy' if off else 'ok'})
    audit(conn, ctx, 'controlled.count', {'id': record['id'], 'location_id': location_id, 'purpose': purpose, 'discrepancies': len(off)})
    return record


def resolve(conn, ctx, p):
    tenant = ctx['tenant_id']
    record = get_obj(conn, tenant, 'ccount', p.get('id'))
    if record.get('type') != 'count' or record.get('status') != 'discrepancy':
        raise DomainError('This count has no open discrepancy.', 409, 'not_open')
    explanation = str(p.get('explanation') or '').strip()
    if len(explanation) < 10:
        raise DomainError('Explain what happened (at least a sentence). It stays in the DEA record.')
    corrections = []
    if p.get('adjust'):
        for line in record['lines']:
            if not line['difference']:
                continue
            if _token(conn, tenant, line['item_id'], line['location_id'], line.get('lot_id')) != line['token']:
                raise DomainError('Stock moved after this count. Count the safe again, then resolve the new count.', 409, 'stale_count')
            item = get_obj(conn, tenant, 'item', line['item_id'])
            corrections.append(move(conn, ctx, {'kind': 'adjust', 'item_id': line['item_id'], 'location_id': line['location_id'],
                'lot_id': line.get('lot_id'), 'unit': item['base_unit'], 'actual_quantity': line['actual'], 'quantity': line['actual'],
                'expected_quantity': line['expected'], 'reason': f'Controlled count discrepancy: {explanation}', 'reference': record['id'],
                'metadata': {'controlled_count_id': record['id'], 'dea_schedule': line['schedule']}}))
    record.update(status='resolved', resolved_at=now(), resolved_by=ctx['user_id'], explanation=explanation[:2000],
                  adjusted=bool(p.get('adjust')), significant_loss=bool(p.get('significant_loss')),
                  form_106=str(p.get('form_106') or '')[:120] or None)
    saved = save_obj(conn, tenant, 'ccount', record)
    audit(conn, ctx, 'controlled.resolve', {'id': record['id'], 'adjusted': saved['adjusted'], 'significant_loss': saved['significant_loss']})
    return {**saved, 'corrections': corrections}


def attest(conn, ctx, p):
    """Add the witness or patient a ledger entry is missing (e.g. a dose charted in Treatment Sheets). The ledger stays as it was."""
    tenant = ctx['tenant_id']
    entry_id = str(p.get('entry_id') or '')
    row = conn.execute('SELECT item_id, kind FROM ledger WHERE tenant_id=? AND id=?', (tenant, entry_id)).fetchone()
    if not row:
        raise DomainError('That log entry was not found.', 404, 'not_found')
    if not schedule_of(get_obj(conn, tenant, 'item', row[0])):
        raise DomainError('Only controlled-drug entries take an attestation.')
    witness = _name(p.get('witness'), 'The witness', required=False)
    patient = _name(p.get('patient'), 'The patient', required=False)
    if not witness and not patient:
        raise DomainError('Add the witness, the patient, or both.')
    record = save_obj(conn, tenant, 'ccount', {'type': 'attestation', 'entry_id': entry_id, 'witness': witness or None, 'patient': patient or None,
                                                'note': str(p.get('note') or '')[:1000], 'at': now(), 'by': ctx['user_id']})
    audit(conn, ctx, 'controlled.attest', {'id': record['id'], 'entry_id': entry_id})
    return record


def handle(conn, ctx, command, payload):
    return {'controlled.count': count, 'controlled.resolve': resolve, 'controlled.attest': attest}[command](conn, ctx, payload)


# ---------- the log and the safes (read-only, for state.controlled) ----------
def snapshot(state, now_utc=None):
    now_utc = now_utc or datetime.now(timezone.utc)
    items = {i['id']: i for i in state.get('item') or [] if schedule_of(i)}
    settings = next((s.get('data', s) for s in state.get('setting') or [] if s.get('id') == 'dea'), {})
    every = int(settings.get('count_every_hours') or DEFAULT_COUNT_HOURS)
    if not items:
        return {'enabled': False, 'registrant': settings, 'count_every_hours': every, 'safes': [], 'log': {}, 'needs': [], 'open': [], 'counts': []}
    locations = {l['id']: l for l in state.get('location') or []}
    lots = {l['id']: l for l in state.get('lot') or []}
    records = state.get('ccount') or []
    attest_for = defaultdict(list)
    for r in records:
        if r.get('type') == 'attestation':
            attest_for[r['entry_id']].append(r)
    # the log: every entry of a scheduled item, oldest first, with the hospital-wide running balance per drug
    entries = sorted((e for e in state.get('ledger') or [] if e['item_id'] in items), key=lambda e: (e['timestamp'], e['id']))
    running, log, needs = defaultdict(Decimal), defaultdict(list), []
    groups = defaultdict(list)
    is_transfer = lambda e: e['kind'] in ('transfer', 'transfer_in', 'transfer_out')
    for e in entries:
        if is_transfer(e):
            groups[(e.get('group_id'), 'transfer')].append(e)
    seen = set()
    for e in entries:
        meta = e.get('metadata') or {}
        if is_transfer(e):
            key = (e.get('group_id'), 'transfer')
            if key in seen:
                continue
            seen.add(key)
            legs = groups[key]
            out = next((x for x in legs if Decimal(str(x['quantity'])) < 0), e)
            into = next((x for x in legs if Decimal(str(x['quantity'])) > 0), None)
            row = {'id': e['id'], 'timestamp': e['timestamp'], 'kind': 'transfer', 'quantity': abs(float(out['quantity'])),
                   'from': (locations.get(out['location_id']) or {}).get('name'), 'to': (locations.get(into['location_id']) or {}).get('name') if into else None}
        else:
            qty = Decimal(str(e['quantity']))
            running[e['item_id']] += qty
            row = {'id': e['id'], 'timestamp': e['timestamp'], 'kind': e['kind'], 'quantity': float(qty),
                   'location': (locations.get(e['location_id']) or {}).get('name')}
        found = attest_for.get(e['id'], [])
        row.update(item_id=e['item_id'], lot_code=(lots.get(e.get('lot_id')) or {}).get('code'), balance=float(running[e['item_id']]),
                   reference=('Count discrepancy' if meta.get('controlled_count_id') else e.get('reference')) or meta.get('patient') or next((a['patient'] for a in found if a.get('patient')), None),
                   actor_id=e.get('actor_id'), source=e.get('source'), reason=e.get('reason'),
                   witness=meta.get('witness') or next((a['witness'] for a in found if a.get('witness')), None), witness_2=meta.get('witness_2'),
                   dea_order_ref=meta.get('dea_order_ref'), method=METHODS.get(meta.get('disposal_method')), distributor=meta.get('distributor'),
                   attested=bool(found), reversal=bool(e.get('reversal_of')))
        if e['kind'] in ('use', 'emergency') and not row['reference'] and not e.get('reversal_of'):
            needs.append({'entry_id': e['id'], 'item_id': e['item_id'], 'item_name': items[e['item_id']]['name'], 'timestamp': e['timestamp'], 'missing': 'patient', 'quantity': abs(float(e['quantity']))})
        if e['kind'] == 'waste' and not row['witness'] and not e.get('reversal_of'):
            needs.append({'entry_id': e['id'], 'item_id': e['item_id'], 'item_name': items[e['item_id']]['name'], 'timestamp': e['timestamp'], 'missing': 'witness', 'quantity': abs(float(e['quantity']))})
        log[e['item_id']].append(row)
    for rows in log.values():
        rows.reverse()                                            # newest first
    # the safes: every location holding scheduled stock, what is in it, and when it was last counted
    held = defaultdict(lambda: defaultdict(Decimal))
    lot_rows = defaultdict(list)
    for b in state.get('balances') or []:
        if b['item_id'] in items and Decimal(str(b['on_hand'])) != 0:
            held[b['location_id']][b['item_id']] += Decimal(str(b['on_hand']))
            lot_rows[(b['location_id'], b['item_id'])].append({'lot_id': b.get('lot_id'), 'code': (lots.get(b.get('lot_id')) or {}).get('code'),
                'expires': (lots.get(b.get('lot_id')) or {}).get('expires'), 'on_hand': float(b['on_hand'])})
    counts = sorted((r for r in records if r.get('type') == 'count'), key=lambda r: r['at'], reverse=True)
    safes = []
    for loc_id, drugs in held.items():
        last = next((c for c in counts if c.get('location_id') in (loc_id, None)), None)
        age = (now_utc - datetime.fromisoformat(last['at'].replace('Z', '+00:00'))).total_seconds() / 3600 if last else None
        safes.append({'location_id': loc_id, 'location_name': (locations.get(loc_id) or {}).get('name', '—'),
            'drugs': sorted(({'item_id': i, 'name': items[i]['name'], 'schedule': schedule_of(items[i]), 'unit': items[i]['base_unit'],
                              'on_hand': float(q), 'lots': lot_rows[(loc_id, i)]} for i, q in drugs.items()), key=lambda d: (d['schedule'], d['name'])),
            'last_count': {'id': last['id'], 'at': last['at'], 'by': last['by'], 'witness': last['witness'], 'status': last['status']} if last else None,
            'hours_since_count': round(age, 1) if age is not None else None, 'due': age is None or age >= every})
    safes.sort(key=lambda s: (not s['due'], s['location_name']))
    inventories = [c for c in counts if c.get('purpose') in ('initial', 'biennial')]
    last_inventory = inventories[0] if inventories else None
    biennial_due = None
    if last_inventory:
        biennial_due = (datetime.fromisoformat(last_inventory['at'].replace('Z', '+00:00')) + timedelta(days=730)).date().isoformat()
    return {'enabled': True, 'registrant': {k: settings.get(k) for k in ('registrant', 'dea_number', 'address')},
            'dea_number_valid': valid_dea_number(settings.get('dea_number')) if settings.get('dea_number') else None,
            'count_every_hours': every, 'safes': safes, 'log': dict(log), 'needs': needs[-50:][::-1],
            'open': [c for c in counts if c['status'] == 'discrepancy'], 'counts': counts[:60],
            'items': sorted(({'item_id': i, 'name': it['name'], 'schedule': schedule_of(it), 'unit': it['base_unit'], 'balance': float(running[i])}
                             for i, it in items.items()), key=lambda d: (d['schedule'], d['name'])),
            'last_inventory': {'id': last_inventory['id'], 'at': last_inventory['at'], 'purpose': last_inventory['purpose']} if last_inventory else None,
            'biennial_due': biennial_due}
