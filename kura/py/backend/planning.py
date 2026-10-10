"""Kura planning: what to use first, what will expire unused, what levels recorded use supports, what to order
before vendors close, what to order instead of a backordered item, and the morning brief.

Everything here is a read-only recommendation computed from the current state. Nothing is saved or moved; each
suggestion is carried out by an existing command (stock.move, rule.save, order.save, lot.quarantine) that a
person reviews first. "Use" means consumption recorded in the ledger (kinds use / emergency, which includes doses
from Treatment Sheets), net of reversals.
"""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

DEFAULTS = {'history_days': 30, 'safety_days': 2, 'cover_days': 7, 'expiry_days': 90, 'timezone': 'America/New_York'}
US_ZONES = {'America/New_York': -5, 'America/Chicago': -6, 'America/Denver': -7, 'America/Phoenix': -7,
            'America/Los_Angeles': -8}
OPEN_ORDERS = {'needs_review', 'approved', 'ordered', 'partially_shipped', 'shipped', 'partially_received', 'backordered'}
INBOUND = {'ordered', 'partially_shipped', 'shipped', 'partially_received'}
USE_KINDS = {'use', 'emergency'}
MIN_OBSERVED_DAYS, MIN_USE_DAYS = 7, 3


def _d(value):
    try:
        return Decimal(str(value if value not in (None, '') else 0))
    except Exception:
        return Decimal(0)


def _n(value):
    """Decimal → plain number for the API (integers stay integers)."""
    value = round(Decimal(value), 3)
    return int(value) if value == value.to_integral_value() else float(value)


def _up(value):
    return Decimal(math.ceil(Decimal(value) - Decimal('0.000001'))) if value > 0 else Decimal(0)


def _day(d):
    return f"{d:%a} {d:%b} {d.day}"


def _parse(stamp):
    return datetime.fromisoformat(str(stamp).replace('Z', '+00:00'))


# ---------- the hospital's calendar ----------
def _nth_weekday(year, month, weekday, n):
    first = date(year, month, 1)
    day = first + timedelta(days=(weekday - first.weekday()) % 7)
    return day + timedelta(weeks=n - 1)


def _last_weekday(year, month, weekday):
    last = (date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)) - timedelta(days=1)
    return last - timedelta(days=(last.weekday() - weekday) % 7)


def local_now(tz='America/New_York', utc=None):
    """US time zones with US daylight saving (2nd Sunday of March to 1st Sunday of November, 2 AM local)."""
    utc = utc or datetime.now(timezone.utc)
    offset = US_ZONES.get(tz, -5)
    standard = utc + timedelta(hours=offset)
    if tz != 'America/Phoenix':
        start = datetime.combine(_nth_weekday(standard.year, 3, 6, 2), datetime.min.time()) + timedelta(hours=2)
        end = datetime.combine(_nth_weekday(standard.year, 11, 6, 1), datetime.min.time()) + timedelta(hours=1)
        if start <= standard.replace(tzinfo=None) < end:
            return standard + timedelta(hours=1)
    return standard


def holidays(year):
    """Days US medical suppliers typically don't deliver, with the observed day when one falls on a weekend."""
    def observed(day):
        return day - timedelta(days=1) if day.weekday() == 5 else day + timedelta(days=1) if day.weekday() == 6 else day
    return {
        observed(date(year, 1, 1)): 'New Year’s Day', _last_weekday(year, 5, 0): 'Memorial Day',
        observed(date(year, 7, 4)): 'Independence Day', _nth_weekday(year, 9, 0, 1): 'Labor Day',
        _nth_weekday(year, 11, 3, 4): 'Thanksgiving', observed(date(year, 12, 25)): 'Christmas',
    }


def closed(day):
    """None when vendors deliver that day, else why not ('Saturday', 'Thanksgiving'…)."""
    name = holidays(day.year).get(day)
    if name:
        return name
    return ('Saturday', 'Sunday')[day.weekday() - 5] if day.weekday() >= 5 else None


def add_open_days(day, n):
    """The date n delivery days after `day` (an order placed on `day` with an n-day lead time arrives then)."""
    n = max(1, int(n))
    while n:
        day += timedelta(days=1)
        if not closed(day):
            n -= 1
    return day


def next_closure(today, within=2):
    """The next stretch of no-delivery days starting within `within` open days of today: (start, end, label)."""
    day, opens = today, 0
    while opens <= within:
        day += timedelta(days=1)
        if closed(day):
            start = day
            while closed(day + timedelta(days=1)):
                day += timedelta(days=1)
            names = {closed(start + timedelta(days=i)) for i in range((day - start).days + 1)} - {'Saturday', 'Sunday'}
            label = next(iter(names)) if names else 'the weekend'
            if names and any(closed(start + timedelta(days=i)) in ('Saturday', 'Sunday') for i in range((day - start).days + 1)):
                label += ' weekend'
            return start, day, label
        opens += 1
    return None


# ---------- usage ----------
def usage(state, today_utc, history_days):
    """Daily use per (item, location) over the last history_days, which items have enough history to plan with,
    the amount used, and how many days of history each item has."""
    entries = state.get('ledger') or []
    reversed_ids = {e.get('reversal_of') for e in entries if e.get('reversal_of')}
    cut = today_utc - timedelta(days=history_days)
    used, use_days, first_seen = defaultdict(Decimal), defaultdict(set), {}
    for e in entries:
        # a dose charted in Treatment Sheets counts on the day it was given, even if Kura received it later
        stamp = _parse((e.get('metadata') or {}).get('event_timestamp') or e['timestamp'])
        first_seen[e['item_id']] = min(first_seen.get(e['item_id'], stamp), stamp)
        if e['id'] in reversed_ids or e.get('reversal_of') or e.get('kind') not in USE_KINDS or stamp < cut:
            continue
        quantity = _d(e.get('quantity'))
        if quantity < 0:
            used[(e['item_id'], e['location_id'])] -= quantity
            use_days[e['item_id']].add(stamp.date())
    daily, enough, observed_days = {}, {}, {}
    for item_id, seen in first_seen.items():
        observed = min(history_days, max(0.0, (today_utc - seen).total_seconds() / 86400))
        enough[item_id] = observed >= MIN_OBSERVED_DAYS and len(use_days[item_id]) >= MIN_USE_DAYS
        observed_days[item_id] = observed
    for (item_id, location_id), amount in used.items():
        daily[(item_id, location_id)] = amount / Decimal(str(max(1.0, observed_days.get(item_id, 1))))
    return daily, enough, used, observed_days


def _stock(state):
    by_lot, by_place = defaultdict(Decimal), defaultdict(lambda: {'available': Decimal(0), 'on_hand': Decimal(0)})
    for b in state.get('balances') or []:
        by_lot[(b['item_id'], b['location_id'], b.get('lot_id'))] += _d(b.get('on_hand'))
        place = by_place[(b['item_id'], b['location_id'])]
        place['available'] += _d(b.get('available'))
        place['on_hand'] += _d(b.get('on_hand'))
    return by_lot, by_place


def _inbound(state):
    inbound = defaultdict(Decimal)
    for order in state.get('order') or []:
        if order.get('status') in INBOUND:
            for line in order.get('lines') or []:
                inbound[(line['item_id'], order['location_id'])] += max(Decimal(0), _d(line.get('base_quantity')) - _d(line.get('received')))
    return inbound


def _levels_of(item, rule):
    source = rule or item
    return {k: _d(source.get(k)) for k in ('minimum', 'reorder_point', 'target', 'safety_stock')}, 'rule' if rule else 'item'


def _lead(item, vendors):
    vendor = vendors.get(item.get('vendor_id')) or {}
    return max(1, int(_d(vendor.get('lead_days')) or _d(item.get('lead_days')) or 1))


# ---------- the plan ----------
def plan(state, settings=None, now_utc=None):
    """state: Kura's internal state (singular kinds: item, location, vendor, rule, lot, order, setting, plus balances
    and ledger). Returns the `planning` block of the API state."""
    stored = next((s.get('data', s) for s in state.get('setting') or [] if s.get('id') == 'planning'), {})
    notify = next((s.get('data', s) for s in state.get('setting') or [] if s.get('id') == 'notifications'), {})
    cfg = {**DEFAULTS, **({'expiry_days': notify['expiration_days']} if notify.get('expiration_days') else {}), **stored, **(settings or {})}
    now_utc = now_utc or datetime.now(timezone.utc)
    local = local_now(cfg['timezone'], now_utc)
    today = local.date()
    items = {i['id']: i for i in state.get('item') or [] if i.get('status', 'active') == 'active'}
    locations = {l['id']: l for l in state.get('location') or [] if l.get('status', 'active') == 'active'}
    vendors = {v['id']: v for v in state.get('vendor') or []}
    lots = {l['id']: l for l in state.get('lot') or []}
    rules = {(r['item_id'], r['location_id']): r for r in state.get('rule') or []}
    daily, enough, used, observed = usage(state, now_utc, int(cfg['history_days']))
    by_lot, by_place = _stock(state)
    inbound = _inbound(state)
    name = lambda kind, i: (items if kind == 'item' else locations).get(i, {}).get('name', '—')

    # --- expiry: every lot with stock that expires within the window, and what to do about it
    expiry, use_first = [], []
    lots_at = defaultdict(list)
    for (item_id, location_id, lot_id), qty in by_lot.items():
        lot = lots.get(lot_id)
        if qty > 0 and lot and lot.get('expires') and item_id in items and location_id in locations:
            lots_at[(item_id, location_id)].append((lot['expires'], lot_id, qty))
    for key, entries in lots_at.items():
        entries.sort()
        usable = [e for e in entries if lots[e[1]].get('status', 'active') == 'active' and e[0] >= today.isoformat()]
        if len(usable) > 1:
            first = usable[0]
            use_first.append({'item_id': key[0], 'location_id': key[1], 'lot_id': first[1], 'lot_code': lots[first[1]].get('code'),
                              'expires': first[0], 'other_lots': len(usable) - 1})
    for (item_id, location_id), entries in lots_at.items():
        rate = daily.get((item_id, location_id), Decimal(0))
        ahead = Decimal(0)                       # stock at this place that expires sooner (used first, FEFO)
        for expires, lot_id, qty in entries:
            lot = lots[lot_id]
            days = (date.fromisoformat(expires[:10]) - today).days
            status = lot.get('status', 'active')
            if days > int(cfg['expiry_days']):
                continue
            will_use = max(Decimal(0), min(qty, rate * max(0, days) - ahead)) if enough.get(item_id) else Decimal(0)
            at_risk = qty - will_use
            row = {'id': f'{lot_id}:{location_id}', 'lot_id': lot_id, 'lot_code': lot.get('code') or lot.get('lot_code'),
                   'item_id': item_id, 'item_name': name('item', item_id), 'location_id': location_id,
                   'location_name': name('location', location_id), 'unit': items[item_id]['base_unit'], 'quantity': _n(qty),
                   'expires': expires[:10], 'days': days, 'lot_status': status,
                   'bucket': 'expired' if days < 0 else '30' if days <= 30 else '60' if days <= 60 else '90',
                   'daily_use': _n(rate) if enough.get(item_id) else None, 'will_use': _n(will_use), 'at_risk': _n(at_risk)}
            if status != 'active':
                row['suggestion'] = {'type': 'held', 'text': 'Recalled — keep it out of use.' if status == 'recalled' else 'On hold — not counted as available.'}
            elif days < 0:
                row['suggestion'] = {'type': 'remove', 'text': 'Expired. Record it as waste or disposal so it leaves stock.'}
            elif not enough.get(item_id):
                row['suggestion'] = {'type': 'watch', 'text': 'Not enough recorded use yet to tell whether it will be used in time. Use it first.'}
            elif at_risk <= 0:
                row['suggestion'] = {'type': 'use_first', 'text': f"{name('location', location_id)} uses about {_n(rate)} {items[item_id]['base_unit']} a day, so this lot should be used up before it expires. Use it first."}
            else:
                best = None
                for (other_item, other_place), other_rate in daily.items():
                    if other_item != item_id or other_place == location_id or other_place not in locations or other_rate <= rate:
                        continue
                    sooner = sum(q for e2, _, q in lots_at.get((item_id, other_place), []) if e2 <= expires)
                    room = _up(other_rate * max(0, days) - sooner) if days > 0 else Decimal(0)
                    amount = min(at_risk, room).to_integral_value(rounding='ROUND_FLOOR')
                    if amount > 0 and (best is None or amount > best[1]):
                        best = (other_place, amount, other_rate)
                if best:
                    row['suggestion'] = {'type': 'transfer', 'location_id': best[0], 'location_name': name('location', best[0]), 'quantity': _n(best[1]),
                        'text': f"Move {_n(best[1])} {items[item_id]['base_unit']} to {name('location', best[0])}. It uses about {_n(best[2])} a day and would finish it before {_day(date.fromisoformat(expires[:10]))}; "
                                + (f"{name('location', location_id)} would use only {_n(will_use)} by then." if rate > 0 else f"{name('location', location_id)} hasn’t used any in {cfg['history_days']} days.")}
                else:
                    row['suggestion'] = {'type': 'at_risk', 'text': f"About {_n(at_risk)} {items[item_id]['base_unit']} may expire unused. No other area uses it faster — consider a vendor return or exchange."}
            expiry.append(row)
            if status == 'active' and days >= 0:
                ahead += qty
    expiry.sort(key=lambda r: (r['days'], r['item_name']))

    # --- levels supported by recorded use, per item and area
    levels = []
    for (item_id, location_id), rate in sorted(daily.items()):
        item = items.get(item_id)
        if not item or location_id not in locations or not enough.get(item_id) or rate <= 0:
            continue
        lead = _lead(item, vendors)
        safety = _up(rate * Decimal(cfg['safety_days']))
        reorder = _up(rate * lead) + safety
        suggested = {'minimum': safety, 'safety_stock': safety, 'reorder_point': reorder, 'target': reorder + _up(rate * Decimal(cfg['cover_days']))}
        rule = rules.get((item_id, location_id))
        current, source = _levels_of(item, rule)
        before, after = current['reorder_point'], suggested['reorder_point']
        if current['target'] > 0 and abs(after - before) < max(Decimal(1), before * Decimal('0.25')):
            continue
        change = 'set' if current['target'] <= 0 else 'raise' if after > before else 'lower'
        levels.append({'id': f'{item_id}:{location_id}', 'item_id': item_id, 'item_name': item['name'], 'location_id': location_id,
            'location_name': name('location', location_id), 'unit': item['base_unit'], 'daily_use': _n(rate),
            'used': _n(used[(item_id, location_id)]), 'history_days': int(cfg['history_days']), 'lead_days': lead,
            'current': {k: _n(v) for k, v in current.items()}, 'current_source': source,
            'suggested': {k: _n(v) for k, v in suggested.items()}, 'change': change,
            'rule_id': rule.get('id') if rule else None, 'rule_version': rule.get('version') if rule else None,
            'order_multiple': _n(_d((rule or {}).get('order_multiple')) or 0),
            'text': f"Used {_n(used[(item_id, location_id)])} {item['base_unit']} in the last {min(int(cfg['history_days']), round(observed.get(item_id, cfg['history_days'])))} days (about {_n(rate)} a day). "
                    f"With a {lead}-day lead time and {cfg['safety_days']} days of safety stock, reorder at {_n(after)} and fill to {_n(suggested['target'])}."})
    levels.sort(key=lambda r: ({'set': 1, 'raise': 0, 'lower': 2}[r['change']], r['item_name'], r['location_name']))

    # --- heads-up before vendors close (weekends and holidays)
    heads_up, closure = [], None if closed(today) else next_closure(today)
    if closure:
        start, end, label = closure
        order_by = start - timedelta(days=1)
        reopen = end + timedelta(days=1)
        while closed(reopen):
            reopen += timedelta(days=1)
        for (item_id, location_id), rate in sorted(daily.items()):
            item = items.get(item_id)
            if not item or location_id not in locations or not enough.get(item_id) or rate <= 0:
                continue
            lead = _lead(item, vendors)
            current, _ = _levels_of(item, rules.get((item_id, location_id)))
            minimum = current['minimum'] or _up(rate * Decimal(cfg['safety_days']))
            target = current['target'] or _up(rate * lead) + minimum + _up(rate * Decimal(cfg['cover_days']))
            have = by_place[(item_id, location_id)]['available'] + inbound[(item_id, location_id)]
            late = add_open_days(reopen - timedelta(days=1), lead)           # an order placed when vendors reopen
            if_wait = have - rate * (late - today).days
            if if_wait >= minimum:
                continue
            arrives = add_open_days(today, lead)
            low_on = today + timedelta(days=int(max(0, (have - minimum) / rate)))
            quantity = _up(target + rate * (arrives - today).days - have)
            heads_up.append({'id': f'{item_id}:{location_id}', 'item_id': item_id, 'item_name': item['name'], 'location_id': location_id,
                'location_name': name('location', location_id), 'unit': item['base_unit'], 'vendor_id': item.get('vendor_id'),
                'available': _n(by_place[(item_id, location_id)]['available']), 'inbound': _n(inbound[(item_id, location_id)]),
                'daily_use': _n(rate), 'minimum': _n(minimum), 'closure': {'start': start.isoformat(), 'end': end.isoformat(), 'label': label},
                'order_by': order_by.isoformat(), 'arrives': arrives.isoformat(), 'arrives_if_wait': late.isoformat(),
                'low_on': low_on.isoformat(), 'quantity': _n(max(Decimal(1), quantity)),
                'text': f"{name('location', location_id)} uses about {_n(rate)} {item['base_unit']} a day and drops below its minimum around {_day(low_on)}. "
                        f"Order by {order_by:%A} and it arrives {_day(arrives)}; wait until after {label} and it wouldn’t arrive until {_day(late)}."})
        heads_up.sort(key=lambda r: (r['low_on'], r['item_name']))

    # --- backordered items and what to order instead
    backorders = []
    for order in state.get('order') or []:
        if order.get('status') != 'backordered':
            continue
        for line in order.get('lines') or []:
            item = items.get(line['item_id'])
            remaining = max(Decimal(0), _d(line.get('base_quantity')) - _d(line.get('received')))
            if not item or remaining <= 0:
                continue
            alternatives = []
            for alt_id in item.get('alternatives') or []:
                alt = items.get(alt_id)
                if not alt or alt_id == item['id']:
                    continue
                here = by_place[(alt_id, order['location_id'])]['available']
                total = sum(v['available'] for (i, _), v in by_place.items() if i == alt_id)
                same = alt.get('base_unit') == item.get('base_unit')
                alternatives.append({'item_id': alt_id, 'item_name': alt['name'], 'unit': alt['base_unit'], 'vendor_id': alt.get('vendor_id'),
                    'available_here': _n(here), 'available_total': _n(total), 'same_unit': same,
                    'quantity': _n(max(Decimal(0), remaining - here)) if same else None})
            backorders.append({'id': f"{order['id']}:{item['id']}", 'order_id': order['id'], 'order_number': order.get('number') or order.get('order_number'),
                'vendor_id': order.get('vendor_id'), 'item_id': item['id'], 'item_name': item['name'], 'location_id': order['location_id'],
                'location_name': name('location', order['location_id']), 'unit': item['base_unit'], 'remaining': _n(remaining),
                'expected_at': order.get('expected_at'), 'alternatives': alternatives})

    return {'as_of': now_utc.isoformat(timespec='seconds').replace('+00:00', 'Z'), 'today': today.isoformat(),
            'settings': cfg, 'expiry': expiry, 'use_first': use_first, 'levels': levels, 'heads_up': heads_up,
            'closure': {'start': closure[0].isoformat(), 'end': closure[1].isoformat(), 'label': closure[2]} if closure else None,
            'backorders': backorders}


def brief(state, planning, alerts, recommendations, kits=None, controlled=None):
    """The morning brief's facts, kept small: the push function picks what's current on the day it sends."""
    items = {i['id']: i for i in state.get('item') or []}
    locations = {l['id']: l for l in state.get('location') or []}
    vendors = {v['id']: v for v in state.get('vendor') or []}
    short = [{'item': a.get('title', '').replace(' needs replenishment', '').replace(' is below its stock threshold', ''),
              'item_id': a.get('item_id'), 'location': locations.get(a.get('location_id'), {}).get('name'), 'severity': a['severity']}
             for a in alerts if a.get('type') == 'stock' and a.get('status') == 'open']
    short.sort(key=lambda s: (s['severity'] != 'critical', s['item'] or ''))
    arriving = []
    for order in state.get('order') or []:
        if order.get('status') in INBOUND | {'backordered'} and order.get('expected_at'):
            arriving.append({'order_id': order['id'], 'vendor': vendors.get(order.get('vendor_id'), {}).get('name', 'Vendor'),
                             'location': locations.get(order['location_id'], {}).get('name'), 'expected': str(order['expected_at'])[:10],
                             'lines': len(order.get('lines') or [])})
    expiring = [{'item': r['item_name'], 'lot': r['lot_code'], 'location': r['location_name'], 'expires': r['expires'], 'quantity': r['quantity'],
                 'unit': r['unit']} for r in planning['expiry'] if r['lot_status'] == 'active' and r['days'] <= 14]
    return {'as_of': planning['as_of'], 'today': planning['today'], 'timezone': planning['settings']['timezone'],
            'short': short[:12], 'short_count': len(short), 'critical_count': sum(s['severity'] == 'critical' for s in short),
            'arriving': sorted(arriving, key=lambda a: a['expected'])[:12], 'expiring': expiring[:12],
            'heads_up': [{'item': h['item_name'], 'location': h['location_name'], 'order_by': h['order_by'], 'closure': h['closure']['label']} for h in planning['heads_up']][:8],
            'backorders': [{'item': b['item_name'], 'location': b['location_name'], 'alternative': (b['alternatives'][0]['item_name'] if b['alternatives'] else None)} for b in planning['backorders']][:8],
            'kits': [{'name': k['name'], 'area': k['area_name'], 'status': k['status']} for k in (kits or {}).get('kits', []) if k['status'] not in ('ready', 'expiring', 'setup')][:8],
            'controlled': {'counts_due': [s['location_name'] for s in (controlled or {}).get('safes', []) if s['due']][:8],
                           'discrepancies': len((controlled or {}).get('open', [])), 'missing': len((controlled or {}).get('needs', []))} if (controlled or {}).get('enabled') else None}
