"""Kits and carts: crash carts, anesthesia boxes, procedure kits — anything that must be complete and in date.

A kit is a location of type "kit" inside an area, so its stock, lots and expiry are ordinary Kura stock. What it
should contain is its location rules (one per item, quantity = target). The kit's own settings live on the location
(kit: {kind, check_every_hours, expiry_warning_days, source_location_id}); each check, seal and restock is a
kitcheck record. Restocking is one atomic step: record what was used (from what is physically left), send soon-to-
expire stock back to the source, write off expired stock, fill every line from the source with long-dated lots, and
note the new seal.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from . import core
from .core import DomainError, audit, balances, get_obj, list_obj, move, now, save_obj

PERMISSIONS = {'kit.save': 'location.configure', 'kit.check': 'inventory.count', 'kit.restock': 'inventory.transfer'}
KINDS = {'crash_cart': 'Crash cart', 'anesthesia': 'Anesthesia box', 'procedure': 'Procedure kit', 'transport': 'Transport bag', 'other': 'Kit'}
DEFAULTS = {'kind': 'other', 'check_every_hours': 24, 'expiry_warning_days': 30}


def _d(v):
    return Decimal(str(v if v not in (None, '') else 0))


def _settings(loc):
    k = {**DEFAULTS, **(loc.get('kit') or {})}
    return k


def _int(value, label, low, high):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise DomainError(f'{label} must be a whole number from {low} to {high}.')
    return value


def save(conn, ctx, p):
    """Create or update a kit: its location (name, area, settings) and its contents (rules)."""
    tenant = ctx['tenant_id']
    kit = {**DEFAULTS, **(p.get('kit') or {})}
    if kit['kind'] not in KINDS:
        raise DomainError('Unknown kit type.')
    kit['check_every_hours'] = _int(kit['check_every_hours'], 'Check every (hours)', 1, 24 * 90)
    kit['expiry_warning_days'] = _int(kit['expiry_warning_days'], 'Expiry warning (days)', 0, 365)
    if kit.get('source_location_id'):
        get_obj(conn, tenant, 'location', kit['source_location_id'])
    if not p.get('parent_id'):
        raise DomainError('Choose the area this kit belongs to.')
    loc = {'name': p.get('name'), 'type': 'kit', 'status': p.get('status', 'active'), 'parent_id': p['parent_id'], 'kit': kit}
    if p.get('id'):
        loc.update(id=p['id'], version=p.get('version'))
    location = core.handle(conn, ctx, 'location.save', loc)
    contents = p.get('contents')
    if contents is not None:
        if not isinstance(contents, list) or len(contents) > 300:
            raise DomainError('Kit contents must be a list of items and quantities.')
        rules = {r['item_id']: r for r in list_obj(conn, tenant, 'rule') if r['location_id'] == location['id']}
        wanted = {}
        for line in contents:
            qty = _d(line.get('quantity'))
            if qty < 0:
                raise DomainError('Kit quantities cannot be negative.')
            wanted[line.get('item_id')] = qty
        for item_id in set(wanted) | set(rules):
            qty = wanted.get(item_id, Decimal(0))
            rule = rules.get(item_id)
            if rule and _d(rule.get('target')) == qty:
                continue
            payload = {'item_id': item_id, 'location_id': location['id'], 'minimum': float(qty), 'reorder_point': float(qty), 'target': float(qty),
                       'safety_stock': 0, 'order_multiple': 0}
            if rule:
                payload.update(id=rule['id'], version=rule['version'])
            core.handle(conn, ctx, 'rule.save', payload)
    audit(conn, ctx, 'kit.save', {'id': location['id']})
    return location


def check(conn, ctx, p):
    """A check of the kit: seal intact (one tap), or opened — e.g. used in a code — with a note."""
    tenant = ctx['tenant_id']
    loc = get_obj(conn, tenant, 'location', p.get('kit_id'))
    if loc.get('type') != 'kit':
        raise DomainError('That location is not a kit.')
    result = p.get('result', 'ok')
    if result not in ('ok', 'opened', 'issue'):
        raise DomainError('A kit check is ok, opened or issue.')
    seal = str(p.get('seal') or '').strip()[:40] or None
    note = str(p.get('note') or '').strip()[:1000]
    if result != 'ok' and len(note) < 3:
        raise DomainError('Say what happened (for example "Opened for a code, patient Max").')
    record = save_obj(conn, tenant, 'kitcheck', {'kit_id': loc['id'], 'type': 'check', 'result': result, 'seal': seal, 'note': note, 'at': now(), 'by': ctx['user_id']})
    audit(conn, ctx, 'kit.check', {'id': record['id'], 'kit_id': loc['id'], 'result': result})
    return record


def _lot_balances(conn, tenant, item_id, location_id):
    lots = {l['id']: l for l in list_obj(conn, tenant, 'lot') if l['item_id'] == item_id}
    out = []
    for b in balances(conn, tenant):
        if b['item_id'] == item_id and b['location_id'] == location_id and _d(b['on_hand']) > 0:
            out.append((b.get('lot_id'), lots.get(b.get('lot_id')), _d(b['on_hand']), _d(b['available'])))
    return out


def restock(conn, ctx, p):
    tenant = ctx['tenant_id']
    loc = get_obj(conn, tenant, 'location', p.get('kit_id'))
    if loc.get('type') != 'kit':
        raise DomainError('That location is not a kit.')
    cfg = _settings(loc)
    source_id = p.get('source_location_id') or cfg.get('source_location_id')
    if not source_id:
        raise DomainError('Choose where the restock comes from.')
    source = get_obj(conn, tenant, 'location', source_id)
    reference = str(p.get('reference') or '').strip()[:300]
    today = date.today()
    warn = today + timedelta(days=int(cfg['expiry_warning_days']))
    items = {i['id']: i for i in list_obj(conn, tenant, 'item')}
    template = {r['item_id']: _d(r.get('target')) for r in list_obj(conn, tenant, 'rule') if r['location_id'] == loc['id'] and _d(r.get('target')) > 0}
    used, returned, wasted, filled, short = [], [], [], [], []
    name = loc['name']

    def apply():
        # 1. what was used: the kit's record minus what is physically there now
        for line in p.get('counted') or []:
            item = items.get(line.get('item_id'))
            if not item:
                raise DomainError('Unknown item in the count.')
            have = sum(q for _, _, q, _ in _lot_balances(conn, tenant, item['id'], loc['id']))
            left = _d(line.get('left'))
            if left < 0:
                raise DomainError('Counted quantities cannot be negative.')
            if left < have:
                if item.get('dea_schedule') and not reference:
                    raise DomainError(f'{item["name"]} is a controlled drug: enter the patient or code it was used for.', 400, 'controlled_patient')
                used.append(move(conn, ctx, {'kind': 'use', 'item_id': item['id'], 'location_id': loc['id'], 'quantity': float(have - left), 'unit': item['base_unit'],
                                             'reference': reference, 'reason': f'Used from {name}' + (f' — {reference}' if reference else '')}))
            elif left > have:
                raise DomainError(f'{item["name"]}: more is in the kit than Kura has on record. Count the kit with “Set actual count” first.', 409, 'count_first')
        # 2. lots that expire inside the warning window leave the kit: back to the source, or written off when expired
        for item_id in template:
            item = items[item_id]
            for lot_id, lot, qty, _ in _lot_balances(conn, tenant, item_id, loc['id']):
                expires = lot.get('expires') if lot else None
                if not expires or date.fromisoformat(expires[:10]) > warn:
                    continue
                if date.fromisoformat(expires[:10]) < today:
                    meta = {'witness': p.get('witness')} if item.get('dea_schedule') else {}
                    if item.get('dea_schedule') and not p.get('witness'):
                        raise DomainError(f'{item["name"]} in the kit has expired. Writing off a controlled drug needs a witness.', 400, 'controlled_record')
                    wasted.append(move(conn, ctx, {'kind': 'waste', 'item_id': item_id, 'location_id': loc['id'], 'lot_id': lot_id, 'quantity': float(qty),
                                                   'unit': item['base_unit'], 'reason': f'Expired in {name}', 'metadata': meta}))
                else:
                    returned.append(move(conn, ctx, {'kind': 'transfer', 'item_id': item_id, 'location_id': loc['id'], 'destination_id': source['id'], 'lot_id': lot_id,
                                                     'quantity': float(qty), 'unit': item['base_unit'], 'reason': f'Expires soon — swapped out of {name}'}))
        # 3. fill every line from the source with lots that outlast the warning window (soonest of those first)
        for item_id, target in template.items():
            item = items[item_id]
            have = sum(q for _, _, q, _ in _lot_balances(conn, tenant, item_id, loc['id']))
            need = target - have
            if need <= 0:
                continue
            candidates = []
            for lot_id, lot, _, avail in _lot_balances(conn, tenant, item_id, source['id']):
                expires = (lot or {}).get('expires')
                if avail <= 0 or (lot and (lot.get('status', 'active') != 'active')):
                    continue
                if expires and date.fromisoformat(expires[:10]) <= warn:
                    continue
                candidates.append((expires or '9999-12-31', lot_id, avail))
            for _, lot_id, avail in sorted(candidates, key=lambda c: c[0]):
                take = min(need, avail)
                if take <= 0:
                    break
                filled.append(move(conn, ctx, {'kind': 'transfer', 'item_id': item_id, 'location_id': source['id'], 'destination_id': loc['id'], 'lot_id': lot_id,
                                               'quantity': float(take), 'unit': item['base_unit'], 'reason': f'Restock {name}'}))
                need -= take
            if need > 0:
                short.append({'item_id': item_id, 'item_name': item['name'], 'missing': float(need), 'unit': item['base_unit']})
        seal = str(p.get('seal') or '').strip()[:40] or None
        record = save_obj(conn, tenant, 'kitcheck', {'kit_id': loc['id'], 'type': 'restock', 'result': 'ok' if not short else 'issue', 'seal': seal,
            'note': str(p.get('note') or '')[:1000], 'reference': reference or None, 'at': now(), 'by': ctx['user_id'],
            'used': len(used), 'returned': len(returned), 'wasted': len(wasted), 'filled': len(filled), 'short': short})
        return record

    from .workflows import _atomic
    record = _atomic(conn, apply)
    audit(conn, ctx, 'kit.restock', {'kit_id': loc['id'], 'record': record['id'], 'short': len(short)})
    return {**record, 'short': short}


def handle(conn, ctx, command, payload):
    return {'kit.save': save, 'kit.check': check, 'kit.restock': restock}[command](conn, ctx, payload)


# ---------- readiness (state.kits) ----------
def snapshot(state, now_utc=None):
    now_utc = now_utc or datetime.now(timezone.utc)
    today = now_utc.date()
    locations = {l['id']: l for l in state.get('location') or []}
    items = {i['id']: i for i in state.get('item') or []}
    lots = {l['id']: l for l in state.get('lot') or []}
    checks = sorted(state.get('kitcheck') or [], key=lambda c: c['at'], reverse=True)
    stock = defaultdict(list)
    for b in state.get('balances') or []:
        if _d(b['on_hand']) > 0:
            stock[(b['location_id'], b['item_id'])].append(b)
    out = []
    for kit in (l for l in locations.values() if l.get('type') == 'kit' and l.get('status', 'active') == 'active'):
        cfg = _settings(kit)
        warn = today + timedelta(days=int(cfg['expiry_warning_days']))
        lines, earliest, expired, expiring = [], None, 0, 0
        for r in (r for r in state.get('rule') or [] if r['location_id'] == kit['id'] and _d(r.get('target')) > 0):
            item = items.get(r['item_id'], {})
            usable, total = Decimal(0), Decimal(0)
            for b in stock[(kit['id'], r['item_id'])]:
                lot = lots.get(b.get('lot_id')) or {}
                q = _d(b['on_hand'])
                total += q
                exp = lot.get('expires')
                if exp:
                    d = date.fromisoformat(exp[:10])
                    earliest = min(earliest, d) if earliest else d
                    if d < today:
                        expired += 1
                        continue
                    if d <= warn:
                        expiring += 1
                if lot.get('status', 'active') == 'active':
                    usable += q
            target = _d(r['target'])
            lines.append({'item_id': r['item_id'], 'name': item.get('name', '—'), 'unit': item.get('base_unit'), 'target': float(target),
                          'on_hand': float(total), 'usable': float(usable), 'missing': float(max(Decimal(0), target - usable)),
                          'controlled': bool(item.get('dea_schedule'))})
        mine = [c for c in checks if c['kit_id'] == kit['id']]
        last = mine[0] if mine else None
        last_seal = next((c.get('seal') for c in mine if c.get('seal')), None)
        hours = (now_utc - datetime.fromisoformat(last['at'].replace('Z', '+00:00'))).total_seconds() / 3600 if last else None
        opened = bool(last and last.get('result') == 'opened')
        missing = [l for l in lines if l['missing'] > 0]
        if not lines:
            status = 'setup'
        elif opened:
            status = 'opened'
        elif expired:
            status = 'expired'
        elif missing:
            status = 'restock'
        elif hours is None or hours >= int(cfg['check_every_hours']):
            status = 'check_due'
        elif expiring:
            status = 'expiring'
        else:
            status = 'ready'
        parent = locations.get(kit.get('parent_id')) or {}
        out.append({'id': kit['id'], 'name': kit['name'], 'version': kit.get('version'), 'area_id': parent.get('id'), 'area_name': parent.get('name'),
            'kind': cfg['kind'], 'kind_label': KINDS.get(cfg['kind'], 'Kit'), 'settings': cfg, 'status': status, 'lines': lines,
            'missing': len(missing), 'expired': expired, 'expiring': expiring, 'earliest_expiry': earliest.isoformat() if earliest else None,
            'seal': last_seal if not opened else None, 'last_check': {k: last.get(k) for k in ('at', 'by', 'result', 'type', 'note', 'seal')} if last else None,
            'hours_since_check': round(hours, 1) if hours is not None else None,
            'history': [{k: c.get(k) for k in ('at', 'by', 'result', 'type', 'note', 'seal', 'reference', 'short')} for c in mine[:20]]})
    order = {'opened': 0, 'expired': 1, 'restock': 2, 'check_due': 3, 'expiring': 4, 'setup': 5, 'ready': 6}
    out.sort(key=lambda k: (order[k['status']], k['area_name'] or '', k['name']))
    return {'kits': out, 'kinds': KINDS, 'not_ready': sum(k['status'] not in ('ready', 'expiring') for k in out)}
