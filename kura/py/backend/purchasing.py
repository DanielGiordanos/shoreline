"""Distributor price lists and invoice matching.

Price lists: a vendor's price file (MWI, Covetrus, Patterson… exported as CSV) is matched to Kura items — by the
vendor's item number, the manufacturer's number, a barcode, or the exact name — and each match becomes that vendor's
current price for the item, kept with its previous prices. Prices are compared per base unit, so a box of 25 and a
single vial compare fairly. Nothing is ordered or changed on the item; orders only show where the same item costs less.

Invoice matching (three-way): an invoice is compared line by line with its purchase order (price) and with what was
actually received (quantity). Billed-but-not-received quantities, price differences beyond the tolerance and lines
that were never ordered become exceptions; each invoice stays open until someone accepts it or asks for a credit.
"""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from .core import DomainError, audit, get_obj, list_obj, now, save_obj

PERMISSIONS = {'price.import': 'purchase.manage', 'invoice.save': 'purchase.manage', 'invoice.resolve': 'purchase.manage'}
MAX_ROWS = 5000
TOLERANCE_PCT, TOLERANCE_AMOUNT = Decimal('1'), Decimal('0.02')       # price differences smaller than both are ignored
CENT = Decimal('0.01')


def _d(value, label='Number', allow_none=False):
    if value in (None, '') and allow_none:
        return None
    try:
        out = Decimal(str(value).replace('$', '').replace(',', '').strip())
    except (InvalidOperation, ValueError):
        raise DomainError(f'{label} must be a number.')
    if not out.is_finite():
        raise DomainError(f'{label} must be a number.')
    return out


def _key(value):
    return re.sub(r'[^A-Z0-9]', '', str(value or '').upper())


def _digits(value):
    return re.sub(r'\D', '', str(value or '')).lstrip('0')


def _money(value):
    return float(Decimal(value).quantize(CENT, ROUND_HALF_UP))


def _per_base(item, unit, pack, price):
    """Price for one base unit, or None when the row's unit can't be converted for this item."""
    units = item.get('units') or {}
    if unit and unit in units and _d(units[unit]) > 0:
        return price / _d(units[unit])
    if pack and pack > 0:
        return price / pack
    if not unit and len(units) == 1:
        return price
    return None


# ---------- matching ----------
def _index(items):
    by = {'sku': defaultdict(list), 'code': defaultdict(list), 'name': defaultdict(list)}
    for item in items:
        for value in (item.get('vendor_sku'), (item.get('metadata') or {}).get('manufacturer_number'), item.get('sku')):
            if _key(value):
                by['sku'][_key(value)].append(item)
        for code in item.get('barcodes') or []:
            if len(_digits(code)) >= 8:
                by['code'][_digits(code)].append(item)
        by['name'][re.sub(r'\s+', ' ', item['name'].strip().casefold())].append(item)
    return by


def match_row(row, by, items_by_id, vendor_id):
    def pick(found, how):
        if not found:
            return None
        preferred = [i for i in found if i.get('vendor_id') == vendor_id]
        chosen = (preferred or found)
        return (chosen[0], how) if len({i['id'] for i in chosen}) == 1 else (None, 'ambiguous')
    if row.get('item_id'):
        item = items_by_id.get(row['item_id'])
        if not item:
            raise DomainError('A linked item no longer exists.')
        return item, 'linked'
    for value, how in ((row.get('vendor_sku'), 'vendor item number'), (row.get('manufacturer_number'), 'manufacturer number')):
        hit = pick(by['sku'].get(_key(value)), how) if _key(value) else None
        if hit:
            return hit
    if len(_digits(row.get('barcode'))) >= 8:
        hit = pick(by['code'].get(_digits(row['barcode'])), 'barcode')
        if hit:
            return hit
    name = re.sub(r'\s+', ' ', str(row.get('description') or '').strip().casefold())
    if name:
        hit = pick(by['name'].get(name), 'name')
        if hit:
            return hit
    return None, None


def price_import(conn, ctx, p):
    tenant = ctx['tenant_id']
    vendor = get_obj(conn, tenant, 'vendor', p.get('vendor_id'))
    rows = p.get('rows')
    if not isinstance(rows, list) or not rows or len(rows) > MAX_ROWS:
        raise DomainError(f'A price list needs 1 to {MAX_ROWS} rows.')
    effective = str(p.get('effective') or date.today().isoformat())[:10]
    try:
        date.fromisoformat(effective)
    except ValueError:
        raise DomainError('Effective date must be a date.')
    items = [i for i in list_obj(conn, tenant, 'item') if i.get('status', 'active') == 'active']
    by, items_by_id = _index(items), {i['id']: i for i in items}
    results, seen = [], set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise DomainError('Each price row must be an object.')
        price = _d(row.get('price'), f'Row {index + 1} price', allow_none=True)
        pack = _d(row.get('pack_size'), f'Row {index + 1} pack size', allow_none=True)
        item, how = match_row(row, by, items_by_id, vendor['id'])
        base = _per_base(item, str(row.get('unit') or '').strip(), pack, price) if item and price is not None and price >= 0 else None
        status = 'no_price' if price is None or price < 0 else 'unmatched' if not item and how != 'ambiguous' else 'ambiguous' if how == 'ambiguous' \
            else 'duplicate' if item['id'] in seen else 'unit' if base is None else 'matched'
        if status == 'matched':
            seen.add(item['id'])
        results.append({'row': index, 'status': status, 'how': how if item else None, 'item_id': item['id'] if item else None,
                        'item_name': item['name'] if item else None, 'description': str(row.get('description') or '')[:200],
                        'vendor_sku': str(row.get('vendor_sku') or '')[:60], 'unit': str(row.get('unit') or '')[:40],
                        'price': float(price) if price is not None else None, 'per_base': float(base) if base is not None else None,
                        'base_unit': item['base_unit'] if item else None})
    summary = {'vendor_id': vendor['id'], 'effective': effective, 'rows': len(rows), 'matched': sum(r['status'] == 'matched' for r in results),
               'unmatched': sum(r['status'] in ('unmatched', 'ambiguous') for r in results), 'unit_problems': sum(r['status'] == 'unit' for r in results)}
    if p.get('dry_run'):
        return {**summary, 'results': results, 'dry_run': True}
    existing = {(x['vendor_id'], x['item_id']): x for x in list_obj(conn, tenant, 'price')}
    changed = 0
    for r in results:
        if r['status'] != 'matched':
            continue
        old = existing.get((vendor['id'], r['item_id']))
        history = list((old or {}).get('history', []))
        if old and (old.get('per_base') != r['per_base'] or old.get('effective') != effective):
            history = ([{'price': old['price'], 'unit': old.get('unit'), 'per_base': old.get('per_base'), 'effective': old.get('effective')}] + history)[:6]
            changed += old.get('per_base') != r['per_base']
        save_obj(conn, tenant, 'price', {'id': f"{vendor['id']}:{r['item_id']}", 'vendor_id': vendor['id'], 'item_id': r['item_id'],
            'vendor_sku': r['vendor_sku'] or None, 'unit': r['unit'] or None, 'price': r['price'], 'per_base': r['per_base'], 'effective': effective,
            'source': str(p.get('file_name') or 'price list')[:120], 'history': history})
    record = save_obj(conn, tenant, 'price_import', {**summary, 'file_name': str(p.get('file_name') or '')[:120], 'at': now(), 'by': ctx['user_id'],
        'changed': changed, 'not_matched': [r for r in results if r['status'] != 'matched'][:300]})
    audit(conn, ctx, 'price.import', {'id': record['id'], 'vendor_id': vendor['id'], 'matched': summary['matched']})
    return {**summary, 'id': record['id'], 'changed': changed, 'results': results}


# ---------- invoices ----------
def _line_base(item, quantity, unit):
    units = item.get('units') or {}
    if unit not in units:
        return None
    return quantity * _d(units[unit])


def invoice_save(conn, ctx, p):
    tenant = ctx['tenant_id']
    order = get_obj(conn, tenant, 'order', p.get('order_id'))
    number = str(p.get('number') or '').strip()[:60]
    if not number:
        raise DomainError('Enter the invoice number.')
    for other in list_obj(conn, tenant, 'invoice'):
        if other.get('vendor_id') == order['vendor_id'] and other.get('number') == number and other['id'] != p.get('id'):
            raise DomainError(f'Invoice {number} from this vendor is already in Kura.', 409, 'duplicate_invoice')
    items = {i['id']: i for i in list_obj(conn, tenant, 'item')}
    settings = next((s.get('data', s) for s in list_obj(conn, tenant, 'setting') if s['id'] == 'procurement'), {})
    pct = _d(settings.get('invoice_tolerance_pct', TOLERANCE_PCT)), _d(settings.get('invoice_tolerance_amount', TOLERANCE_AMOUNT))
    lines_in = p.get('lines')
    if not isinstance(lines_in, list) or not lines_in or len(lines_in) > 500:
        raise DomainError('An invoice needs at least one line.')
    billed = defaultdict(Decimal)
    lines, exceptions = [], []
    for n, line in enumerate(lines_in):
        qty = _d(line.get('quantity'), f'Line {n + 1} quantity')
        price = _d(line.get('unit_price'), f'Line {n + 1} price')
        index = line.get('order_line_index')
        desc = str(line.get('description') or '')[:200]
        if index is None or not isinstance(index, int) or not 0 <= index < len(order['lines']):
            amount = qty * price
            exceptions.append({'type': 'not_ordered', 'line': n, 'description': desc, 'quantity': float(qty), 'amount': _money(amount),
                               'text': f'“{desc or "Line " + str(n + 1)}” was billed but is not on the order.'})
            lines.append({'description': desc, 'quantity': float(qty), 'unit': line.get('unit'), 'unit_price': float(price), 'order_line_index': None})
            continue
        ol = order['lines'][index]
        item = items.get(ol['item_id'], {})
        unit = line.get('unit') or ol.get('unit')
        base = _line_base(item, qty, unit)
        if base is None:
            exceptions.append({'type': 'unit', 'line': n, 'item_id': ol['item_id'], 'item_name': item.get('name'), 'text': f'Unit “{unit}” is not a unit of {item.get("name")}. Check the quantity.'})
            lines.append({'description': desc, 'quantity': float(qty), 'unit': unit, 'unit_price': float(price), 'order_line_index': index})
            continue
        billed[index] += base
        per_base = price * qty / base if base else Decimal(0)
        ordered_per_base = _d(ol.get('unit_cost')) / _d((item.get('units') or {}).get(ol.get('unit'), 1) or 1)
        diff = per_base - ordered_per_base
        if abs(diff) > max(ordered_per_base * pct[0] / 100, pct[1] / _d((item.get('units') or {}).get(unit, 1) or 1)):
            exceptions.append({'type': 'price', 'line': n, 'item_id': ol['item_id'], 'item_name': item.get('name'), 'expected': _money(ordered_per_base * _d(item['units'][unit])),
                               'actual': float(price), 'unit': unit, 'quantity': float(qty), 'amount': _money(diff * base),
                               'text': f'{item.get("name")}: billed ${float(price):,.2f} per {unit}, the order says ${_money(ordered_per_base * _d(item["units"][unit])):,.2f}.'})
        lines.append({'description': desc, 'quantity': float(qty), 'unit': unit, 'unit_price': float(price), 'order_line_index': index, 'item_id': ol['item_id'], 'base_quantity': float(base)})
    for index, base in billed.items():
        ol = order['lines'][index]
        item = items.get(ol['item_id'], {})
        received = _d(ol.get('received'))
        if base > received:
            per = _d(ol.get('unit_cost')) / _d((item.get('units') or {}).get(ol.get('unit'), 1) or 1)
            exceptions.append({'type': 'not_received', 'line': index, 'item_id': ol['item_id'], 'item_name': item.get('name'), 'expected': float(received), 'actual': float(base),
                               'unit': item.get('base_unit'), 'amount': _money((base - received) * per),
                               'text': f'{item.get("name")}: billed {base.normalize():f} {item.get("base_unit")}, received {received.normalize():f}.'})
    subtotal = sum((Decimal(str(l['quantity'])) * Decimal(str(l['unit_price'])) for l in lines), Decimal(0))
    extra = _d(p.get('freight') or 0, 'Freight') + _d(p.get('tax') or 0, 'Tax')
    total = _d(p.get('total'), 'Total', allow_none=True)
    if total is not None and abs(total - (subtotal + extra)) > Decimal('0.05'):
        exceptions.append({'type': 'total', 'amount': _money(total - subtotal - extra), 'text': f'The invoice total ${float(total):,.2f} does not equal its lines (${_money(subtotal + extra):,.2f}).'})
    record = {'order_id': order['id'], 'vendor_id': order['vendor_id'], 'number': number, 'date': str(p.get('date') or '')[:10] or None,
              'document': p.get('document', 'invoice'), 'lines': lines, 'freight': float(_d(p.get('freight') or 0)), 'tax': float(_d(p.get('tax') or 0)),
              'total': float(total) if total is not None else _money(subtotal + extra), 'subtotal': _money(subtotal), 'exceptions': exceptions,
              'at_risk': _money(sum((Decimal(str(e.get('amount') or 0)) for e in exceptions if (e.get('amount') or 0) > 0), Decimal(0))),
              'status': 'exceptions' if exceptions else 'matched', 'at': now(), 'by': ctx['user_id'], 'source': p.get('source', 'manual')}
    if p.get('id'):
        record.update(id=p['id'])
    saved = save_obj(conn, tenant, 'invoice', record)
    audit(conn, ctx, 'invoice.save', {'id': saved['id'], 'order_id': order['id'], 'status': saved['status'], 'exceptions': len(exceptions)})
    return saved


def invoice_resolve(conn, ctx, p):
    tenant = ctx['tenant_id']
    inv = get_obj(conn, tenant, 'invoice', p.get('id'))
    outcome = p.get('outcome')
    if outcome not in ('accepted', 'credit_requested', 'credit_received'):
        raise DomainError('Choose: accept, credit requested or credit received.')
    note = str(p.get('note') or '').strip()
    if outcome != 'accepted' and len(note) < 3:
        raise DomainError('Add a note (for example the rep’s name or the credit memo number).')
    credit = _d(p.get('credit_amount'), 'Credit amount', allow_none=True)
    inv.update(status='resolved' if outcome in ('accepted', 'credit_received') else 'credit_requested', outcome=outcome, note=note[:1000],
               credit_amount=float(credit) if credit is not None else inv.get('credit_amount'), resolved_at=now(), resolved_by=ctx['user_id'])
    saved = save_obj(conn, tenant, 'invoice', inv)
    audit(conn, ctx, 'invoice.resolve', {'id': inv['id'], 'outcome': outcome})
    return saved


def handle(conn, ctx, command, payload):
    return {'price.import': price_import, 'invoice.save': invoice_save, 'invoice.resolve': invoice_resolve}[command](conn, ctx, payload)


# ---------- read models ----------
def pricing_snapshot(state):
    items = {i['id']: i for i in state.get('item') or []}
    vendors = {v['id']: v for v in state.get('vendor') or []}
    per_item = defaultdict(list)
    for pr in state.get('price') or []:
        if pr['item_id'] in items and pr.get('per_base') is not None:
            prev = next((h.get('per_base') for h in pr.get('history') or [] if h.get('per_base') is not None), None)
            per_item[pr['item_id']].append({'vendor_id': pr['vendor_id'], 'vendor_name': vendors.get(pr['vendor_id'], {}).get('name', 'Vendor'),
                'price': pr['price'], 'unit': pr.get('unit'), 'per_base': pr['per_base'], 'effective': pr.get('effective'), 'vendor_sku': pr.get('vendor_sku'),
                'previous_per_base': prev, 'change_pct': round((pr['per_base'] - prev) / prev * 100, 1) if prev else None})
    best, savings, increases = {}, [], []
    for item_id, rows in per_item.items():
        rows.sort(key=lambda r: r['per_base'])
        best[item_id] = rows[0]['vendor_id']
        item = items[item_id]
        mine = next((r for r in rows if r['vendor_id'] == item.get('vendor_id')), None)
        if mine and rows[0]['vendor_id'] != mine['vendor_id'] and mine['per_base'] > 0:
            cut = (mine['per_base'] - rows[0]['per_base']) / mine['per_base'] * 100
            if cut >= 2:
                savings.append({'item_id': item_id, 'item_name': item['name'], 'unit': item['base_unit'], 'preferred': mine, 'best': rows[0], 'percent': round(cut, 1)})
        for r in rows:
            if r['change_pct'] is not None and r['change_pct'] >= 2:
                increases.append({'item_id': item_id, 'item_name': item['name'], 'unit': item['base_unit'], **r})
    savings.sort(key=lambda s: -s['percent'])
    increases.sort(key=lambda r: -r['change_pct'])
    imports = sorted(state.get('price_import') or [], key=lambda r: r['at'], reverse=True)[:20]
    return {'items': dict(per_item), 'best': best, 'savings': savings, 'increases': increases,
            'imports': [{k: r.get(k) for k in ('id', 'vendor_id', 'effective', 'file_name', 'at', 'rows', 'matched', 'unmatched', 'unit_problems', 'changed')} for r in imports]}


def invoices_snapshot(state):
    rows = sorted(state.get('invoice') or [], key=lambda r: r['at'], reverse=True)
    return {'invoices': rows, 'open': sum(r['status'] in ('exceptions', 'credit_requested') for r in rows),
            'credits_pending': _money(sum((Decimal(str(r.get('credit_amount') or r.get('at_risk') or 0)) for r in rows if r['status'] == 'credit_requested'), Decimal(0)))}
