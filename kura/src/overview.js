/* Kura Overview — the hospital at a glance.
   Everything here is read from Kura's own state: balances, par levels, lots, orders, Treatment Sheets events and the
   engine's insights (days of coverage are the engine's estimate, shown only when it has enough history). Nothing is
   invented: an area with no stock says so, and a number Kura can't know is shown as "—".
   Areas are the locations directly under the hospital; anything below them (carts, fridges, shelves) rolls up. */
import { el, Button, EmptyState, Icon } from './ui/components.js?v=3a7528f6ad';
import * as I from './iso.js?v=3a7528f6ad';
import { mountAreaScene, releaseAreaScene, deliveryOf, setSceneSafeArea } from './overview-scene.js?v=3a7528f6ad';
import { cachedIcon, drawIcons } from './area-icons.js?v=3a7528f6ad';
export { releaseAreaScene };

const SVG = 'http://www.w3.org/2000/svg';
const DAY = 86400000;
const TS_SOURCE = 'pravix-treatment';
const NO_PAR = { minimum: 0, reorder_point: 0 };
const MOVES = new Set(['use', 'transfer', 'receive', 'waste']);        // what keeps an area's cart busy
const ORDER_RANK = { partially_received: 0, shipped: 1, partially_shipped: 1, ordered: 2, backordered: 3 };   // which order an area's truck is

/* ---------- area glyphs: one stroke style, 24×24, matched by name, then by type ---------- */
const GLYPHS = {
  emergency: ['M12 4v16', 'M4 12h16', 'M7.5 7.5h0', 'rect:3,3,18,18,4'],
  icu: ['M3 12h4l2-5 3 10 2.5-7 1.5 2H21', 'rect:2.5,4,19,16,3'],
  surgery: ['M5 19 15.5 8.5', 'M15.5 8.5l3-3a1.5 1.5 0 0 0-2-2l-3 3', 'M13.5 6.5l4 4', 'M4 20h4'],
  medicine: ['M6 3v5a4 4 0 0 0 8 0V3', 'M10 12v3a4 4 0 0 0 8 0v-1', 'circle:18,12,2'],
  neurology: ['M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1Z', 'M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1'],
  oncology: ['M12 3c2.5 3 2.5 6 0 9s-2.5 6 0 9', 'M9 7.5c3 0 6-.5 6-3', 'circle:12,12,8.5'],
  imaging: ['rect:3,4,18,13,2.5', 'M7 21h10', 'M12 17v4', 'M8 12a4 4 0 0 1 8 0'],
  pharmacy: ['rect:6,8,12,13,2.5', 'M8 4h8v4H8z', 'M12 11.5v6', 'M9 14.5h6'],
  supply: ['M3 8l9-4.5L21 8v8l-9 4.5L3 16Z', 'M3 8l9 4.5L21 8', 'M12 12.5v8'],
  lab: ['M9 3h6', 'M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3', 'M7.5 15h9'],
  cart: ['rect:4,5,16,11,2', 'M4 10.5h16', 'circle:8,19,1.5', 'circle:16,19,1.5'],
  storage: ['rect:4,4,16,16,2.5', 'M4 10h16', 'M4 15h16', 'M10 7h4'],
  area: ['M4 20V9l8-5 8 5v11', 'M9 20v-6h6v6'],
};
function glyphFor(loc) {
  const n = String(loc.name || '').toLowerCase();
  const by = [[/emerg|\ber\b|triage/, 'emergency'], [/icu|intensive|critical care|ccu/, 'icu'], [/surg|\bor\b|operat|anesth/, 'surgery'],
    [/internal|medicine/, 'medicine'], [/neuro/, 'neurology'], [/onco|chemo/, 'oncology'], [/imag|ultra|radio|x-?ray|\bct\b|mri/, 'imaging'],
    [/pharm|drug|controlled/, 'pharmacy'], [/supply|stock|store|warehouse|receiv/, 'supply'], [/\blab/, 'lab'], [/cart/, 'cart']];
  for (const [re, key] of by) if (re.test(n)) return key;
  return loc.type === 'storage' || loc.type === 'shelf' ? 'storage' : loc.type === 'cart' ? 'cart' : 'area';
}
function glyph(key, size = 22) {
  const svg = document.createElementNS(SVG, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(k, v);
  for (const part of GLYPHS[key] || GLYPHS.area) {
    let node;
    if (part.startsWith('rect:')) { const [x, y, w, h, r] = part.slice(5).split(',').map(Number); node = document.createElementNS(SVG, 'rect'); Object.entries({ x, y, width: w, height: h, rx: r }).forEach(([a, b]) => node.setAttribute(a, b)); }
    else if (part.startsWith('circle:')) { const [cx, cy, r] = part.slice(7).split(',').map(Number); node = document.createElementNS(SVG, 'circle'); Object.entries({ cx, cy, r }).forEach(([a, b]) => node.setAttribute(a, b)); }
    else { node = document.createElementNS(SVG, 'path'); node.setAttribute('d', part); }
    svg.append(node);
  }
  return svg;
}
const s = (tag, attrs = {}, children = []) => { const n = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v); for (const c of [].concat(children)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c))); return n; };

/* ---------- the numbers ---------- */
export function computeOverview(k) {
  const { list, find } = k;
  const now = Date.now();
  const locations = list('locations').filter(l => l.status !== 'inactive');
  const hospital = locations.find(l => l.type === 'hospital') || null;
  const byId = new Map(locations.map(l => [l.id, l]));
  // An area is a location directly under the hospital (or a top-level non-hospital location).
  const areaOf = id => { let cur = byId.get(id), guard = 0; while (cur && guard++ < 50) { const parent = cur.parent_id && byId.get(cur.parent_id); if (!parent || parent.type === 'hospital') return cur.type === 'hospital' ? null : cur.id; cur = parent; } return null; };
  const areas = locations.filter(l => l.type !== 'hospital' && (!l.parent_id || byId.get(l.parent_id)?.type === 'hospital'));
  const items = new Map(list('items').filter(i => i.status !== 'inactive').map(i => [i.id, i]));
  const rules = new Map(list('rules').map(r => [r.item_id + '|' + r.location_id, r]));
  const lots = new Map(list('lots').map(l => [l.id, l]));
  const supply = new Map((k.state.insights?.items || []).map(x => [x.item_id, x]));

  const stateOf = (available, rule) => available <= 0 ? 'out' : available <= Number(rule.minimum || 0) ? 'critical' : available <= Number(rule.reorder_point || 0) ? 'low' : 'well';
  const perArea = new Map(areas.map(a => [a.id, { area: a, items: new Map(), value: 0, expiring: 0, moves: 0, order: null,
    children: locations.filter(l => l.parent_id === a.id).sort((x, y) => String(x.name).localeCompare(String(y.name))).map(l => l.id) }]));
  // The sub-location of an area that holds a location (a shelf inside a cabinet counts as the cabinet).
  const branchOf = (id, areaId) => { let cur = byId.get(id), guard = 0; while (cur && guard++ < 50) { if (cur.parent_id === areaId) return cur.id; cur = byId.get(cur.parent_id); } return null; };
  const totals = new Map();                      // item -> {available,onHand}
  for (const b of list('balances')) {
    const item = items.get(b.item_id); if (!item) continue;
    const t = totals.get(b.item_id) || { available: 0, onHand: 0, where: new Map() };
    t.available += Number(b.available) || 0; t.onHand += Number(b.on_hand) || 0;
    const area = areaOf(b.location_id);
    if (area) t.where.set(area, (t.where.get(area) || 0) + (Number(b.on_hand) || 0));
    totals.set(b.item_id, t);
    const z = area && perArea.get(area); if (!z) continue;
    // An area is judged against its own par level. The item's hospital-wide par would make every ward look short.
    const rule = rules.get(b.item_id + '|' + area) || rules.get(b.item_id + '|' + b.location_id) || null;
    const row = z.items.get(b.item_id) || { item, available: 0, onHand: 0, rule: rule || NO_PAR, hasPar: !!rule };
    if (rule && !row.hasPar) { row.rule = rule; row.hasPar = true; }
    row.available += Number(b.available) || 0; row.onHand += Number(b.on_hand) || 0;
    if (!row.branch && b.location_id !== area) row.branch = branchOf(b.location_id, area);
    z.items.set(b.item_id, row);
    z.value += (Number(b.on_hand) || 0) * (Number(item.unit_cost) || 0);
    const lot = b.lot_id && lots.get(b.lot_id);
    if (lot && lot.expires && Number(b.on_hand) > 0) { const t2 = Date.parse(lot.expires); if (t2 > now && t2 <= now + 30 * DAY) z.expiring++;
      if (t2 <= now + 90 * DAY) { const days = Math.ceil((t2 - now) / DAY); row.expiresIn = row.expiresIn == null ? days : Math.min(row.expiresIn, days); } }
  }
  // Par levels set for an area count even before any stock arrives (that item is out).
  for (const r of list('rules')) { const z = perArea.get(areaOf(r.location_id)); const item = items.get(r.item_id); if (z && item && !z.items.has(r.item_id)) z.items.set(r.item_id, { item, available: 0, onHand: 0, rule: r, hasPar: true }); }
  // Last week's movements per area, and the order each area's truck stands for.
  const weekAgo = now - 7 * DAY;
  for (const m of list('ledger')) { if (!MOVES.has(m.kind) || !(Date.parse(m.timestamp) >= weekAgo)) continue; const z = perArea.get(areaOf(m.location_id)); if (z) z.moves++; }
  const rankOf = o => o.status in ORDER_RANK ? ORDER_RANK[o.status] : (o.status === 'received' && now - Date.parse(o.updated_at || o.created_at) < 2 * 3600000 ? 9 : null);
  for (const o of list('orders')) {
    const z = perArea.get(areaOf(o.location_id)), r = rankOf(o); if (!z || r == null) continue;
    const cur = z.order, rc = cur && rankOf(cur);
    if (!cur || r < rc || (r === rc && String(o.expected_at || '9999') < String(cur.expected_at || '9999'))) z.order = o;
  }
  const rank = { out: 0, critical: 1, low: 2, well: 3 };
  const zones = [...perArea.values()].map(z => {
    const rows = [...z.items.values()].map(r => ({ ...r, state: stateOf(r.available, r.rule) }));
    const worst = [...rows].sort((a, b) => (rank[a.state] - rank[b.state]) || ((a.expiresIn ?? 999) - (b.expiresIn ?? 999)))[0] || null;
    const count = st => rows.filter(r => r.state === st).length;
    const well = count('well'), low = count('low'), critical = count('critical') + count('out');
    const total = rows.length;
    return { ...z, rows, worst, total, well, low, critical, out: count('out'), pars: rows.filter(r => r.hasPar).length, pct: total ? Math.round(well / total * 100) : null,
      tone: !total ? 'neutral' : critical ? 'critical' : (low || z.expiring) ? 'warning' : 'success', glyph: glyphFor(z.area) };
  });

  // Hospital-wide item states (the same rule the Inventory page uses: total available vs the item's par).
  const itemRows = [...items.values()].map(item => {
    const t = totals.get(item.id) || { available: 0, onHand: 0, where: new Map() };
    const st = stateOf(t.available, item);
    const itemLots = list('lots').filter(l => l.item_id === item.id && l.expires && list('balances').some(b => b.lot_id === l.id && Number(b.on_hand) > 0));
    const nextExpiry = itemLots.map(l => l.expires).sort()[0] || null;
    const mainArea = [...t.where.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const sup = supply.get(item.id);
    return { item, available: t.available, onHand: t.onHand, state: st, nextExpiry, area: mainArea ? byId.get(mainArea) : null,
      days: sup && sup.estimated_days_supply != null ? sup.estimated_days_supply : null, stocked: t.onHand > 0 || st !== 'well' };
  });
  const tracked = itemRows.filter(r => r.stocked || Number(r.item.reorder_point || 0) > 0 || Number(r.item.minimum || 0) > 0);
  const states = { well: tracked.filter(r => r.state === 'well'), low: tracked.filter(r => r.state === 'low'), critical: tracked.filter(r => r.state === 'critical' || r.state === 'out') };
  const median = rows => { const d = rows.map(r => r.days).filter(v => v != null).sort((a, b) => a - b); return d.length ? d[Math.floor(d.length / 2)] : null; };

  // Expiry buckets by lot with stock on hand.
  const buckets = [30, 60, 90].map(days => ({ days, lots: 0, value: 0 }));
  let expired = 0;
  for (const b of list('balances')) {
    const lot = b.lot_id && lots.get(b.lot_id); const item = items.get(b.item_id);
    if (!lot || !lot.expires || !item || !(Number(b.on_hand) > 0)) continue;
    const t = Date.parse(lot.expires); if (Number.isNaN(t)) continue;
    if (t <= now) { expired++; continue; }
    for (const bucket of buckets) if (t <= now + bucket.days * DAY) { bucket.lots++; bucket.value += Number(b.on_hand) * (Number(item.unit_cost) || 0); break; }
  }

  // Lots with stock on hand that expire within 30 days (soonest first), for "Needs you now".
  const expiringLots = [];
  for (const b of list('balances')) {
    const lot = b.lot_id && lots.get(b.lot_id), item = items.get(b.item_id); if (!lot || !lot.expires || !item || !(Number(b.on_hand) > 0)) continue;
    const t = Date.parse(lot.expires); if (!(t > now && t <= now + 30 * DAY)) continue;
    const ar = areaOf(b.location_id);
    expiringLots.push({ item, lot, onHand: Number(b.on_hand), area: ar ? byId.get(ar) : null, days: Math.ceil((t - now) / DAY) });
  }
  expiringLots.sort((x, y) => x.days - y.days);

  // Treatment Sheets doses and open deliveries.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tsEvents = list('events').filter(e => e.source === TS_SOURCE).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const dosesToday = tsEvents.filter(e => e.status === 'accepted' && Date.parse(e.created_at) >= today.getTime() && (e.envelope || {}).event_type !== 'InventoryReversed');
  const waiting = tsEvents.filter(e => e.status === 'failed').length;
  const deliveries = list('orders').filter(o => ['ordered', 'partially_received', 'approved'].includes(o.status))
    .sort((a, b) => String(a.expected_at || '9999').localeCompare(String(b.expected_at || '9999')));
  const dueToday = deliveries.filter(o => o.expected_at && new Date(o.expected_at).toDateString() === new Date().toDateString());

  return { hospital, zones, itemRows, tracked, states, median, buckets, expired, expiringLots, tsEvents, dosesToday, waiting, deliveries, dueToday,
    value: Number(k.state.insights?.inventory_value) || 0, usage30: Number(k.state.insights?.usage_cost_30d) || 0, find };
}

/* ---------- the page ---------- */
const BLUE_LEVEL = { success: 'Well', warning: 'Low', critical: 'Needs stock', neutral: 'No stock yet' };
const pctOf = (a, b) => (b ? Math.round(a / b * 100) : 0);
const big = (value, unit) => el('span', { className: 'ovx-big' }, [String(value), unit ? el('small', {}, unit) : null]);
const roundIcon = (name, label, onClick, badge) => el(onClick ? 'button' : 'span', { className: 'ovx-round', type: onClick ? 'button' : undefined, 'aria-label': label, title: label, onClick }, [Icon(name), badge ? el('i', { className: 'ovx-badge' }, String(badge)) : null]);
const expandBtn = (label, onClick) => el('button', { type: 'button', className: 'ovx-round ovx-expand', 'aria-label': label, title: label, onClick }, [ (() => { const g = document.createElementNS(SVG, 'svg'); g.setAttribute('viewBox', '0 0 24 24'); g.setAttribute('aria-hidden', 'true'); g.append(s('path', { d: 'M14 5h5v5M10 19H5v-5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })); return g; })() ]);
function glyphGroup(key) { const src = glyph(key, 24); const g = s('g'); for (const c of [...src.childNodes]) g.append(c); g.setAttribute('fill', 'none'); g.setAttribute('stroke', 'currentColor'); g.setAttribute('stroke-width', '2'); g.setAttribute('stroke-linecap', 'round'); g.setAttribute('stroke-linejoin', 'round'); return g; }

/* The area's icon: a small isometric vignette of what's in that kind of area. */
function areaIcon(key) {
  const svg = s('svg', { viewBox: '-62 -66 124 92', class: 'ovx-icon', 'aria-hidden': 'true' });
  let parts, face = null;
  if (key === 'supply') parts = I.pallet(-26, -26, 8);
  else if (key === 'pharmacy') parts = I.rack(-34, -12, 64, 22, 2, 1, .55);
  else { parts = [I.shadow(-24, -24, 40, 40, 10), I.box(-28, -28, 0, 40, 40, 38, I.MAT.blue), I.box(16, -6, 0, 22, 22, 20, I.MAT.white), I.box(16, -6, 20, 22, 22, 3, I.MAT.soft)]; face = [-24, 12, 5, 32, 30]; }
  I.paint(svg, parts);
  if (face) svg.append(I.faceGlyph(glyphGroup(key), ...face));
  return svg;
}

/* The isometric hospital floor: one plot per area, a corridor with a supply cart, shelves filled to each area's par. */
/* A close-up of one area, drawn like a room seen from above: furniture for that kind of area, shelves filled to its
   par level, a supply route through the door, and the item that most needs attention picked out on its rack. */
function areaScene(z) {
  const W = 380, D = 260, k = z.glyph, fill = z.total ? z.well / z.total : 0;
  const corners = [[-56, -10, 0], [W + 16, -10, 0], [W + 16, D + 20, 0], [-56, D + 20, 0], [0, 0, 125], [W, 0, 125]].map(c => I.iso(...c));
  const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
  const svg = s('svg', { viewBox: [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map(v => v.toFixed(0)).join(' '), class: 'ovx-scene-svg', role: 'img', 'aria-label': `${z.area.name}: ${z.total ? `${z.well} of ${z.total} items at par` : 'no stock yet'}` });
  svg.append(s('defs', {}, [s('filter', { id: 'ovx-soft', x: '-30%', y: '-30%', width: '160%', height: '160%' }, s('feGaussianBlur', { stdDeviation: '8' }))]));
  const P2 = list => list.map(([a, b, c = 0]) => I.iso(a, b, c).join(',')).join(' ');
  svg.append(s('polygon', { class: 'ovx-ground', points: P2([[-56, -10], [W + 16, -10], [W + 16, D + 20], [-56, D + 20]]) }));
  const parts = [I.box(0, 0, -10, W, D, 10, I.MAT.floor), I.box(0, 0, 0, W, 8, 40, I.MAT.wall), I.box(0, 0, 0, 8, D - 72, 40, I.MAT.wall), I.box(0, D - 26, 0, 8, 26, 40, I.MAT.wall)];
  const rackSpots = [];
  const pal = (x, y, share) => I.pallet(x, y, z.total ? Math.max(0, Math.round(8 * share)) : 0);
  if (k === 'pharmacy') { rackSpots.push([36, 24, 300, 32, 3], [36, 96, 300, 32, 3], [36, 168, 200, 32, 3]); parts.push(pal(268, 182, fill)); }
  else if (k === 'supply') { parts.push(pal(56, 178, 1), pal(116, 178, fill), pal(176, 178, fill * .8), pal(236, 178, fill * .5)); rackSpots.push([36, 24, 300, 32, 3], [36, 98, 300, 32, 3]); }
  else if (k === 'emergency') { parts.push(I.bed(56, 120), I.bed(146, 120), I.cabinet(300, 110, 56), I.cart(240, 200), pal(60, 186, fill)); rackSpots.push([36, 24, 300, 32, 3]); }
  else if (k === 'icu') { parts.push(I.bed(52, 104), I.bed(146, 104), I.bed(240, 104), I.box(106, 108, 0, 12, 12, 42, I.MAT.soft), I.box(102, 104, 42, 18, 8, 16, I.MAT.blue), I.box(200, 108, 0, 12, 12, 42, I.MAT.soft), I.box(196, 104, 42, 18, 8, 16, I.MAT.blue), pal(60, 186, fill), pal(122, 186, fill * .6)); rackSpots.push([36, 24, 300, 32, 3]); }
  else if (k === 'surgery') { parts.push(I.box(120, 112, 0, 110, 52, 30, I.MAT.white), I.box(156, 122, 30, 34, 28, 4, I.MAT.blue), I.cabinet(286, 120, 60), I.cabinet(314, 120, 60), pal(60, 186, fill), pal(122, 186, fill * .7)); rackSpots.push([36, 24, 300, 32, 3]); }
  else { parts.push(I.cabinet(300, 170, 56), I.cabinet(328, 170, 56), pal(60, 182, fill), pal(122, 182, fill * .7), pal(184, 182, fill * .4)); rackSpots.push([36, 24, 300, 32, 3], [36, 98, 240, 30, 2]); }
  rackSpots.forEach(([x, y, w, d, lv], i) => parts.push(I.rack(x, y, w, d, lv, fill, k === 'pharmacy' ? .55 : .4)));
  I.paint(svg, parts);
  // route: from outside the door, along the floor, to the racks
  const route = [[-55, D - 47], [20, D - 47], [20, 76], [W - 24, 76]];
  const routeD = route.map((p, i) => { const [a, b] = I.iso(...p); return `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`; }).join(' ');
  svg.append(s('path', { d: routeD, class: 'ovx-route-glow' }));
  svg.append(s('path', { d: routeD, class: 'ovx-route' }));
  const cartG = s('g', { class: 'ovx-cart' }); I.paint(cartG, I.cart(-13, -9)); svg.append(cartG);
  if (!(globalThis.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) cartG.append(s('animateMotion', { dur: '16s', repeatCount: 'indefinite', path: routeD, keyPoints: '0;1;0', keyTimes: '0;0.5;1', calcMode: 'linear' }));
  else { const [a, b] = I.iso(24, 160); cartG.setAttribute('transform', `translate(${a},${b})`); }
  // the rack that holds the item needing the most attention gets the selection prism
  const [rx, ry, rw, rd, rl] = rackSpots[0];
  const H = rl * 32 + 26, sel = s('g', { class: 'ovx-select is-on' }), P = (a, b, c) => I.iso(rx + a, ry + b, c).join(',');
  sel.append(s('polygon', { class: 'ovx-select-fill', points: [P(0, 0, H), P(rw, 0, H), P(rw, rd, H), P(0, rd, H)].join(' ') }));
  for (const [a1, b1] of [[rw, 0], [rw, rd], [0, rd]]) { const [x1, y1] = I.iso(rx + a1, ry + b1, 0), [x2, y2] = I.iso(rx + a1, ry + b1, H); sel.append(s('line', { class: 'ovx-select-edge', x1, y1, x2, y2 })); }
  sel.append(s('polygon', { class: 'ovx-select-edge', points: [P(0, 0, H), P(rw, 0, H), P(rw, rd, H), P(0, rd, H)].join(' ') }));
  sel.append(s('polyline', { class: 'ovx-select-edge', points: [P(0, rd, 0), P(rw, rd, 0), P(rw, 0, 0)].join(' ') }));
  for (const [a1, b1, c1] of [[0, 0, H], [rw, 0, H], [rw, rd, H], [0, rd, H], [rw, rd, 0], [0, rd, 0], [rw, 0, 0]]) { const [cx, cy] = I.iso(rx + a1, ry + b1, c1); sel.append(s('circle', { class: 'ovx-select-dot', cx, cy, r: 4.5 })); }
  svg.append(sel);
  const anchor = s('circle', { cx: I.iso(rx + rw * .6, ry, H)[0], cy: I.iso(rx + rw * .6, ry, H)[1], r: 1, class: 'ovx-anchor' });
  svg.append(anchor);
  return { svg, anchor };
}

/* A small floor plan of every area: tap to look at one. */
function miniMap(zones, currentId, onPick) {
  const cols = Math.min(5, Math.max(1, Math.ceil(zones.length / 2)));
  return el('div', { className: 'ovx-minimap', role: 'group', 'aria-label': 'Areas' }, [
    el('span', { className: 'ovx-minimap-label' }, 'All areas'),
    el('div', { className: 'ovx-minimap-grid', style: `grid-template-columns:repeat(${cols},1fr)` }, zones.map(z => el('button', { type: 'button', className: 'ovx-cell' + (z.area.id === currentId ? ' is-current' : ''), 'data-tone': z.tone, title: `${z.area.name} — ${z.total ? `${z.pct}% at par` : 'no stock yet'}`, 'aria-label': `Show ${z.area.name}`, onClick: () => onPick(z) }))),
  ]);
}

/* Alerts live on Today: the ⚠ button opens them. Each has one obvious next step; "Seen" acknowledges it in one tap. */
const ALERT_STEP = { stock: ['Order', 'replenish'], expiration: ['Review', 'expiry'], backorder: ['Open orders', 'orders'], count: ['Reconcile', 'counts'] };
export function alertsSheet(k, d) {
  const { list, navigate, itemDrawer, find, can } = k;
  const all = list('alerts'), open = all.filter(a => a.status !== 'acknowledged'), seen = all.filter(a => a.status === 'acknowledged');
  const rank = a => (a.severity === 'critical' ? 0 : 1);
  let dialog;
  const go = page => { dialog?.close(); navigate(page); };
  const row = a => {
    const [label, page] = ALERT_STEP[a.type] || ['Review', 'integrations'];
    const item = a.item_id ? find('items', a.item_id) : null;
    return el('li', { className: 'ovx-alert', 'data-tone': a.severity === 'critical' ? 'critical' : 'warning' }, [
      el('i', { className: 'ovx-dot' }),
      el('span', { className: 'ovx-alert-main' }, [el('b', {}, a.title), el('small', {}, a.message)]),
      el('span', { className: 'ovx-alert-actions' }, [
        item && a.type !== 'stock' ? Button({ label: 'Item', size: 'sm', variant: 'ghost', onClick: () => { dialog?.close(); itemDrawer(item); } }) : null,
        Button({ label, size: 'sm', onClick: () => go(page) }),
        can('alert.resolve') ? Button({ label: 'Seen', size: 'sm', variant: 'ghost', 'aria-label': `Mark seen: ${a.title}`, onClick: async e => { e.currentTarget.disabled = true; await k.execute('alert.resolve', { id: a.id, reason: 'Seen on Today' }, 'Marked as seen.'); dialog?.close(); } }) : null,
      ]),
    ]);
  };
  const doses = d?.waiting ? el('li', { className: 'ovx-alert', 'data-tone': 'warning' }, [el('i', { className: 'ovx-dot' }),
    el('span', { className: 'ovx-alert-main' }, [el('b', {}, `${d.waiting} Treatment Sheets dose${d.waiting === 1 ? '' : 's'} to review`), el('small', {}, 'Kura couldn’t match these to stock yet.')]),
    el('span', { className: 'ovx-alert-actions' }, [Button({ label: 'Review', size: 'sm', onClick: () => go('integrations') })])]) : null;
  const children = [
    open.length || doses ? el('ul', { className: 'ovx-alerts' }, [doses, ...open.slice().sort((a, b) => rank(a) - rank(b)).map(row)].filter(Boolean))
      : EmptyState({ title: 'No alerts', description: 'Low stock, expiring lots, backorders and count differences show up here.', icon: 'check-circle' }),
    seen.length ? el('details', { className: 'ovx-alerts-seen' }, [el('summary', {}, `${seen.length} seen`), el('ul', { className: 'ovx-alerts' }, seen.slice(0, 20).map(a => el('li', { className: 'ovx-alert is-seen' }, [el('i', { className: 'ovx-dot' }), el('span', { className: 'ovx-alert-main' }, [el('b', {}, a.title), el('small', {}, a.message)])])))]) : null,
  ].filter(Boolean);
  dialog = k.makeDialog({ title: 'Alerts', description: open.length + (doses ? 1 : 0) ? `${open.length + (doses ? 1 : 0)} open` : 'All clear', children }, true);
  return dialog;
}

let liveIcons = null;
export function overviewDashboard(k) {
  const d = computeOverview(k);
  const { fmt, money, navigate, itemDrawer, movementDialog, can, list } = k;
  const hasItems = list('items').length > 0;
  const zones = d.zones;
  const tracked = d.tracked.length, wellN = d.states.well.length, lowN = d.states.low.length, critN = d.states.critical.length;
  const health = pctOf(wellN, tracked);
  const outN = d.tracked.filter(r => r.state === 'out').length;
  const zoneCards = new Map();
  let hotId = null, detail = null;

  const attentionOrder = z => (z.critical ? 0 : z.low ? 1 : z.expiring ? 2 : z.total ? 3 : 4);
  let currentId = (zones.slice().sort((a, b) => attentionOrder(a) - attentionOrder(b))[0] || {}).area?.id || null;
  function setHot(id) { hotId = id; for (const [zid, n] of zoneCards) n.classList.toggle('is-hot', zid === (id || currentId)); }
  function show(z) { if (!z || z.area.id === currentId) return; currentId = z.area.id; drawScene(); setHot(null); }
  function pick(z) { show(z); zoneDrawer(z); }

  /* one headline: how much of the hospital is at par, in words with one number; the rest lives in the cards below */
  const alerts = list('alerts').filter(a => a.status !== 'acknowledged');
  const alertCount = alerts.length + (d.waiting ? 1 : 0);
  const actions = el('div', { className: 'ovx-actions' }, [roundIcon('barcode', 'Scan a barcode', () => navigate('scan')),
    roundIcon('alert', alertCount ? `Alerts: ${alertCount} open` : 'Alerts', () => alertsSheet(k, d), alertCount || null),
    can('stock.move') ? el('button', { type: 'button', className: 'ovx-primary', onClick: () => movementDialog() }, [Icon('plus'), 'Record movement']) : null]);
  const toFix = lowN + critN;
  const headlineWords = !tracked ? 'Record what’s on the shelves to begin.'
    : !toFix ? 'Everything is at par.'
    : `${fmt(toFix)} ${toFix === 1 ? 'item needs' : 'items need'} reordering${outN ? `, ${fmt(outN)} out of stock` : ''}.`;
  const headline = el('button', { type: 'button', className: 'ovx-headline', 'data-tone': !tracked ? 'neutral' : outN || critN ? 'critical' : lowN ? 'warning' : 'success', onClick: () => navigate(toFix ? 'replenish' : 'inventory') }, [
    big(tracked ? health : '—', tracked ? '%' : ''),
    el('span', { className: 'ovx-headline-text' }, [el('span', { className: 'ovx-headline-label' }, 'of items at par'), el('span', { className: 'ovx-headline-sub' }, [el('i', { className: 'ovx-dot' }), headlineWords])]),
  ]);
  const titleRow = el('div', { className: 'ovx-titlerow' }, [
    el('div', { className: 'ovx-title' }, [el('h1', {}, 'Today'), el('p', {}, [new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }), d.hospital?.name && d.hospital.name !== 'Hospital' ? ` · ${d.hospital.name}` : ''].join(''))]),
    headline,
    actions,
  ]);

  /* 1: what needs someone now — each one tap, into the right dialog already filled in */
  const theme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const todoItems = [];
  const shortOf = zones.filter(z => z.worst && z.worst.state !== 'well').sort((a, b) => attentionOrder(a) - attentionOrder(b));
  for (const z of shortOf.slice(0, 2)) {
    const r = z.worst, target = Number(r.rule.target || 0) || Number(r.rule.reorder_point || 0), canOrder = can('order.save') && k.orderEditor;
    todoItems.push({ tone: r.state === 'low' ? 'warning' : 'critical', text: [canOrder ? 'Order ' : 'Check ', el('b', {}, r.item.name), ` for ${z.area.name}`],
      sub: target ? `${fmt(r.available)} of ${fmt(target)} ${r.item.base_unit}` : `${fmt(r.available)} ${r.item.base_unit} on hand`,
      run: () => (canOrder ? k.orderEditor({ location_id: z.area.id, vendor_id: r.item.vendor_id }, r.item, Math.max(0, target - r.available)) : itemDrawer(r.item)) });
  }
  for (const o of d.deliveries) {
    const dl = deliveryOf(o); if (dl.state !== 'at_dock' && dl.state !== 'unloading') continue;
    todoItems.push({ tone: 'info', text: [dl.state === 'unloading' ? 'Finish receiving ' : 'Receive ', el('b', {}, k.vendorName(o.vendor_id)), ' order'], sub: `${k.locationName(o.location_id)} · ${(o.lines || []).length} lines`, run: () => k.orderDrawer?.(o) });
  }
  const soon = d.expiringLots || [];
  if (soon.length) todoItems.push({ tone: 'warning', text: ['Check ', el('b', {}, `${soon.length} lot${soon.length === 1 ? '' : 's'}`), ' expiring this month'], sub: soon.slice(0, 2).map(x => x.item.name).join(', ') + (soon.length > 2 ? '…' : ''), run: () => navigate('expiry') });
  const plan = k.state.planning || {};
  const heads = plan.heads_up || [];
  if (heads.length && can('order.save')) todoItems.push({ tone: 'warning', text: ['Order ', el('b', {}, heads.length === 1 ? heads[0].item_name : `${heads.length} items`), ` before ${plan.closure?.label || 'the weekend'}`],
    sub: heads.length === 1 ? `${heads[0].location_name} · by ${new Date(heads[0].order_by + 'T12:00:00').toLocaleDateString([], { weekday: 'long' })}` : heads.slice(0, 2).map(h => h.item_name).join(', ') + (heads.length > 2 ? '…' : ''),
    run: () => (heads.length === 1 && k.orderEditor ? k.orderEditor({ location_id: heads[0].location_id, vendor_id: heads[0].vendor_id }, k.find('items', heads[0].item_id), heads[0].quantity) : navigate('replenish')) });
  for (const b of (plan.backorders || []).slice(0, 1)) {
    const alt = b.alternatives.find(a => a.quantity == null || a.quantity > 0) || null;
    todoItems.push({ tone: 'warning', text: alt ? ['Order ', el('b', {}, alt.item_name), ` — ${b.item_name} is backordered`] : [el('b', {}, b.item_name), ' is backordered'],
      sub: alt ? `${b.location_name} · ${fmt(b.remaining)} ${b.unit} still due` : 'Link an alternative so Kura can suggest one',
      run: () => (alt && k.orderEditor ? k.orderEditor({ location_id: b.location_id, vendor_id: alt.vendor_id || b.vendor_id }, k.find('items', alt.item_id), alt.quantity ?? undefined) : alt ? navigate('replenish') : k.alternativesEditor?.(k.find('items', b.item_id))) });
  }
  if (d.waiting) todoItems.push({ tone: 'warning', text: ['Review ', el('b', {}, `${d.waiting} dose${d.waiting === 1 ? '' : 's'}`), ' from Treatment Sheets'], sub: 'Not matched to an item or area yet', run: () => navigate('integrations') });
  const KIT_LABEL = { opened: 'opened, needs restock', expired: 'has expired stock inside', restock: 'needs restock', check_due: 'check due' };
  const kitsBad = (k.state.kits?.kits || []).filter(x => KIT_LABEL[x.status]);
  if (kitsBad.length) todoItems.push({ tone: kitsBad.some(x => x.status !== 'check_due') ? 'critical' : 'warning',
    text: kitsBad.length === 1 ? [el('b', {}, kitsBad[0].name), ` ${KIT_LABEL[kitsBad[0].status]}`] : [el('b', {}, `${kitsBad.length} kits`), ' not ready'],
    sub: kitsBad.length === 1 ? (kitsBad[0].area_name || 'Kits & carts') : kitsBad.slice(0, 2).map(x => x.name).join(', ') + (kitsBad.length > 2 ? '…' : ''), run: () => navigate('kits') });
  const ctl = k.state.controlled;
  if (ctl?.enabled && ctl.open.length) todoItems.push({ tone: 'critical', text: ['Explain a ', el('b', {}, 'controlled-drug discrepancy')], sub: `${ctl.open.length} open · DEA record`, run: () => navigate('controlled') });
  const dueSafes = ctl?.enabled ? ctl.safes.filter(x => x.due) : [];
  if (dueSafes.length) todoItems.push({ tone: 'warning', text: ['Count ', el('b', {}, dueSafes.length === 1 ? dueSafes[0].location_name : `${dueSafes.length} safes`)], sub: `Controlled drugs · every ${ctl.count_every_hours} h`, run: () => navigate('controlled') });
  const TONE_RANK = { critical: 0, info: 1, warning: 2 };
  const todo = el('section', { className: 'ovx-todo', 'aria-label': 'Needs you now' }, [
    el('span', { className: 'ovx-todo-label' }, 'Needs you now'),
    ...(todoItems.length ? todoItems.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]).slice(0, 4).map(t => el('button', { type: 'button', className: 'ovx-todo-item', 'data-tone': t.tone, onClick: t.run }, [
      el('i', { className: 'ovx-dot' }), el('span', { className: 'ovx-todo-text' }, [el('span', {}, t.text), el('small', {}, t.sub)]), Icon('chevron-right')]))
      : [el('span', { className: 'ovx-todo-clear' }, [Icon('check-circle'), 'Nothing needs you right now'])]),
  ]);
  function expiringDialog(lotsList) {
    k.makeDialog({ title: 'Expiring this month', description: `${lotsList.length} lot${lotsList.length === 1 ? '' : 's'} with stock on hand expire within 30 days.`, children: [
      el('div', { className: 'ov-drawer-list' }, lotsList.map(x => el('button', { type: 'button', className: 'ov-drawer-row', onClick: () => itemDrawer(x.item) }, [
        el('span', {}, [el('strong', {}, x.item.name), el('small', {}, [`Lot ${x.lot.lot_code || '—'}`, x.area ? x.area.name : null, `${fmt(x.onHand)} ${x.item.base_unit}`].filter(Boolean).join(' · '))]),
        el('span', { className: 'ovx-pill', 'data-state': x.days <= 10 ? 'critical' : 'low' }, [el('i'), x.days <= 0 ? 'Today' : `${x.days} day${x.days === 1 ? '' : 's'}`])])))] }, true);
  }

  /* next delivery card (floats over the scene): the area's own order when it has one, else the hospital's next */
  const floatEl = el('aside', { className: 'ovx-float', 'aria-live': 'polite' });
  let floatTimer = 0, floatOrderId;
  const RECEIVABLE = ['ordered', 'partially_shipped', 'shipped', 'partially_received', 'backordered'];
  function fillDelivery(z) {
    const hospitalNext = d.deliveries.find(o => o.expected_at && Date.parse(o.expected_at) > Date.now()) || d.deliveries[0];
    const next = (z && z.order && z.order.status !== 'received') ? z.order : hospitalNext;
    if ((next?.id || null) === floatOrderId && floatEl.childElementCount) return;
    floatOrderId = next?.id || null; clearInterval(floatTimer);
    const allBtn = el('button', { type: 'button', className: 'ovx-link', onClick: () => navigate('orders') }, d.deliveries.length ? `All deliveries (${d.deliveries.length})` : 'Orders');
    if (!next) { floatEl.replaceChildren(el('span', { className: 'ovx-float-label' }, 'Next delivery'), el('div', { className: 'ovx-timer is-empty' }, '— — : — —'), el('span', { className: 'ovx-float-sub' }, 'No orders on the way'), el('span', { className: 'ovx-float-gap' }), can('order.save') && k.orderEditor ? el('button', { type: 'button', className: 'ovx-cta', onClick: () => k.orderEditor() }, 'Create an order') : null, allBtn); return; }
    const timer = el('div', { className: 'ovx-timer' }, ''), due = next.expected_at ? Date.parse(next.expected_at) : null;
    const tick = () => { if (!timer.isConnected && timer.dataset.started) return clearInterval(floatTimer); timer.dataset.started = '1'; if (!due) { timer.textContent = 'No date'; return; } const ms = Math.max(0, due - Date.now()), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; timer.textContent = ms ? (h > 47 ? `${Math.floor(h / 24)} days` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`) : 'Due now'; };
    floatTimer = setInterval(tick, 1000); tick();
    const lines = next.lines || [], here = z && next === z.order;
    const started = Date.parse(next.created_at || '') || Date.now(), span = due ? Math.max(1, due - started) : 1, progress = due ? Math.min(1, Math.max(0, (Date.now() - started) / span)) : 0;
    const receive = RECEIVABLE.includes(next.status) && can('order.receive') && k.orderDrawer ? el('button', { type: 'button', className: 'ovx-cta', onClick: () => k.orderDrawer(next) }, 'Receive') : el('button', { type: 'button', className: 'ovx-cta', onClick: () => k.orderDrawer ? k.orderDrawer(next) : navigate('orders') }, 'Open order');
    floatEl.replaceChildren(
      el('span', { className: 'ovx-float-label' }, [here ? 'This area’s next delivery' : 'Next delivery', el('small', {}, ` · ${k.locationName(next.location_id)}`)]), timer,
      el('div', { className: 'ovx-lines', 'aria-label': 'On this order' }, [
        ...lines.slice(0, 3).map(l => el('div', { className: 'ovx-line' }, [el('span', {}, l.item_name || k.find('items', l.item_id)?.name || 'Item'), el('b', {}, `${fmt(l.quantity)} ${l.unit || ''}`.trim())])),
        lines.length > 3 ? el('div', { className: 'ovx-line is-more' }, `+${lines.length - 3} more`) : null]),
      el('span', { className: 'ovx-float-gap' }),
      el('div', { className: 'ovx-next' }, [
        el('div', { className: 'ovx-next-top' }, [el('span', {}, k.vendorName(next.vendor_id)), el('small', {}, next.id.slice(0, 8).toUpperCase())]),
        el('div', { className: 'ovx-next-mid' }, [el('span', {}, `${lines.length} line${lines.length === 1 ? '' : 's'}`), el('span', {}, due ? new Date(due).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—')]),
        el('div', { className: 'ovx-slider', style: `--p:${(progress * 100).toFixed(1)}%` }, [el('i'), el('b')]),
      ]),
      receive, allBtn);
  }

  /* scene: one area up close, with a floating tag on the rack that matters most */
  detail = el('div', { className: 'ovx-detail' });
  const sceneHost = el('div', { className: 'ovx-scene-host' });
  const header = el('div', { className: 'ovx-scene-head' });
  const mapHost = el('div');
  const truckTag = el('div', { className: 'ovx-truck-tag', hidden: true, 'aria-hidden': 'true' });
  let sc = null;                  // { anchor(), truckAnchor() } in scene-box pixels, for whichever picture is showing
  const offset = node => { const b = sceneBox.getBoundingClientRect(), r = node.getBoundingClientRect(); return [r.left - b.left, r.top - b.top]; };
  function placeDetail() {
    if (!sceneBox.isConnected || detail.hidden) return;
    const b = sceneBox.getBoundingClientRect(), a = sc?.anchor();
    if (!a) { detail.style.left = (b.width * .55) + 'px'; detail.style.top = '90px'; return; }
    detail.style.left = Math.max(8, Math.min(b.width - 220, a.x - 100)) + 'px'; detail.style.top = Math.max(70, a.y - 100) + 'px';
    detail.dataset.ax = a.x.toFixed(0); detail.dataset.ay = a.y.toFixed(0);       // the rack top it points at (scene-box px)
  }
  const truckWords = (o, dl) => {
    const due = o.expected_at ? new Date(o.expected_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    return { scheduled: o.status === 'backordered' ? 'Backordered' : 'Ordered', arriving: due ? `Arriving ${due}` : 'On the way', at_dock: 'At the dock', unloading: `Unloading · ${Math.round(dl.unloaded * 100)}%`, received: 'Received' }[dl.state];
  };
  function placeTruck(z) {
    const a = z.order && sc?.truckAnchor?.();
    if (!a) { truckTag.hidden = true; return; }
    const b = sceneBox.getBoundingClientRect();
    if (a.x < 0 || a.y < 0 || a.x > b.width || a.y > b.height) { truckTag.hidden = true; return; }
    truckTag.hidden = false;
    const words = [k.vendorName(z.order.vendor_id), truckWords(z.order, deliveryOf(z.order))].join(' · ');
    if (truckTag.textContent !== words) truckTag.textContent = words;
    // keep the tag clear of the delivery card when the truck is beside it
    const f = floatEl.getBoundingClientRect(), minX = f.right - b.left + truckTag.offsetWidth / 2 + 8, x = f.height > b.height * .5 ? Math.max(a.x, minX) : a.x;
    truckTag.style.transform = `translate(${x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
    truckTag.dataset.x = a.x.toFixed(0); truckTag.dataset.y = a.y.toFixed(0);     // where the truck itself is (scene-box px)
  }
  function draw2D(z) {
    const svg = areaScene(z);
    sceneHost.replaceChildren(svg.svg);
    sc = { anchor: () => { if (!svg.anchor.isConnected) return null; const [x, y] = offset(svg.anchor); return { x, y }; }, truckAnchor: null };
  }
  // The part of the scene no overlay covers: right of the delivery card (or below it on narrow screens), under the area
  // switcher, above the footnote. The 3D room is fitted into it; the rest of the scene runs under the overlays.
  // On a wide screen the 3D scene is the backdrop of the whole left column: it runs up behind the title row and under
  // the cards below, fading out at both ends, as in the reference.
  function safeArea() {
    const b = sceneBox.getBoundingClientRect(); if (!b.width) return null;
    sceneBox.style.setProperty('--ovx-bleed-top', Math.max(0, Math.round(b.top - titleRow.getBoundingClientRect().top)) + 'px');
    const hb = sceneHost.getBoundingClientRect(), f = floatEl.getBoundingClientRect(), h = header.getBoundingClientRect(), side = f.height > b.height * .5;
    const below = sceneBox.nextElementSibling?.getBoundingClientRect(), floorEnd = below && below.top > b.top ? Math.min(hb.bottom, below.top) : b.bottom;
    return { left: side ? Math.round(f.right - hb.left - 36) : 16, top: Math.round(Math.max(h.bottom - hb.top - 6, side ? 0 : f.bottom - hb.top + 12)), right: 12, bottom: Math.max(24, Math.round(hb.bottom - floorEnd + 10)) };
  }
  function drawScene() {
    const z = zones.find(x => x.area.id === currentId);
    if (!z) { releaseAreaScene(); sc = null; truckTag.hidden = true; sceneHost.replaceChildren(el('div', { className: 'ovx-scene-empty' }, [el('strong', {}, 'No areas yet'), el('span', {}, 'Add the hospital’s areas in Locations and they appear here.'), el('button', { type: 'button', className: 'ovx-cta is-small', onClick: () => navigate('locations') }, 'Open Locations')])); detail.hidden = true; header.replaceChildren(); return; }
    const live = mountAreaScene(sceneHost, z, zones, {
      onPick: rack => (z.worst && live && rack === live.highlight() ? itemDrawer(z.worst.item) : zoneDrawer(z)), onTruck: z.order && k.orderDrawer ? () => k.orderDrawer(z.order) : null,
      onReady: () => { setSceneSafeArea(safeArea()); placeDetail(); placeTruck(z); }, onFail: () => { if (sceneBox.isConnected) drawScene(); },
      safeArea: sceneBox.isConnected ? safeArea() : null,
    });
    sceneBox.classList.toggle('has-3d', !!live);
    if (live) {
      const toBox = p => { if (!p) return null; const [x, y] = offset(live.host); return { x: p.x + x, y: p.y + y }; };
      sc = { anchor: () => toBox(live.anchor()), truckAnchor: () => toBox(live.truckAnchor()) };
    } else { draw2D(z); truckTag.hidden = true; }
    const idx = zones.indexOf(z), step = dir => show(zones[(idx + dir + zones.length) % zones.length]);
    header.replaceChildren(
      el('button', { type: 'button', className: 'ovx-round ovx-step', 'aria-label': 'Previous area', onClick: () => step(-1) }, Icon('chevron-left')),
      el('button', { type: 'button', className: 'ovx-scene-title', onClick: () => zoneDrawer(z) }, [el('i', { className: 'ovx-dot', 'data-tone': z.tone === 'success' ? 'well' : z.tone === 'warning' ? 'low' : z.tone === 'critical' ? 'critical' : '' }), el('span', {}, z.area.name), el('b', {}, z.total ? `${z.pct}%` : '—')]),
      el('button', { type: 'button', className: 'ovx-round ovx-step', 'aria-label': 'Next area', onClick: () => step(1) }, Icon('chevron-right')),
      el('span', { className: 'ovx-round ovx-info', tabIndex: 0, role: 'note', 'aria-label': INFO, 'data-tip': INFO }, Icon('info')));
    fillDelivery(z);
    mapHost.replaceChildren(miniMap(zones, currentId, show));
    const worst = z.worst;
    detail.hidden = false;
    if (worst) {
      const par = Number(worst.rule.reorder_point || 0);
      detail.replaceChildren(el('span', {}, worst.item.name), el('strong', {}, par ? [`${fmt(worst.available)}`, el('b', {}, `/${fmt(par)}`), ` ${worst.item.base_unit}`] : `${fmt(worst.available)} ${worst.item.base_unit} on hand`), el('span', { className: 'ovx-thin-bar', 'data-state': worst.state }, el('i', { style: `width:${par ? Math.min(100, Math.round(worst.available / par * 100)) : 100}%` })));
    } else detail.replaceChildren(el('span', {}, z.area.name), el('strong', {}, 'No stock yet'), el('span', { className: 'ovx-thin-bar' }, el('i', { style: 'width:0%' })));
    requestAnimationFrame(placeDetail);
    // The truck tag follows the truck while it moves; it stops when this Overview is gone.
    clearInterval(truckLoop); truckLoop = setInterval(() => { if (!sceneBox.isConnected) return clearInterval(truckLoop); placeTruck(z); }, 120);
    setHot(null);
  }
  let truckLoop = 0;
  const INFO = 'Shelves show stock against each item’s target. The outlined rack holds the item that needs the most attention: tap it to open that item. The truck is this area’s next delivery. Left and right arrows change the area.';
  const sceneBox = el('section', { className: 'ovx-scene', 'aria-label': 'Area view' }, [sceneHost, floatEl, header, detail, truckTag, mapHost]);
  // arrow keys step through the areas while the area view has focus
  sceneBox.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; const z = zones.find(x => x.area.id === currentId); if (!z) return; e.preventDefault(); const i = zones.indexOf(z); show(zones[(i + (e.key === 'ArrowRight' ? 1 : -1) + zones.length) % zones.length]); });
  drawScene();
  new ResizeObserver(() => { if (sceneBox.classList.contains('has-3d')) setSceneSafeArea(safeArea()); placeDetail(); }).observe(sceneBox);

  /* area cards — icons are small 3D renders in the scene's look (2D drawings until they're ready, or without WebGL) */
  const iconImg = url => el('img', { className: 'ovx-icon is-3d', src: url, alt: '', 'aria-hidden': 'true', draggable: 'false' });
  const cardIcon = key => { const url = cachedIcon(key, theme()); return url ? iconImg(url) : areaIcon(key); };
  const TYPE = { department: 'Department', storage: 'Stockroom', ward: 'Ward', room: 'Room', clinic: 'Clinic', pharmacy: 'Pharmacy' };
  const typeLabel = z => TYPE[z.area.type] || (z.area.type ? z.area.type[0].toUpperCase() + z.area.type.slice(1) : 'Area');
  const zoneCard = z => {
    const sub = z.total ? ([z.critical ? `${z.critical} need stock` : null, z.low ? `${z.low} low` : null, z.expiring ? `${z.expiring} expiring` : null].filter(Boolean).join(' · ') || `${typeLabel(z)} · at par`) : typeLabel(z);
    const card = el('button', { type: 'button', className: 'ovx-zone' + (z.area.id === currentId ? ' is-hot' : ''), 'data-tone': z.tone, onClick: () => pick(z), onMouseenter: () => { clearTimeout(card._t); card._t = setTimeout(() => show(z), 140); }, onMouseleave: () => clearTimeout(card._t) }, [
      cardIcon(z.glyph),
      el('span', { className: 'ovx-zone-body' }, [
        el('span', { className: 'ovx-zone-head' }, [el('span', { className: 'ovx-zone-name' }, z.area.name), z.total ? big(z.pct, '%') : el('span', { className: 'ovx-big is-muted' }, '—')]),
        el('span', { className: 'ovx-zone-sub', 'data-tone': z.tone }, sub),
        el('span', { className: 'ovx-track', 'data-tone': z.tone }, el('i', { style: `width:${z.pct || 0}%` })),
        el('span', { className: 'ovx-zone-foot' }, z.total ? ['Items at par: ', el('b', {}, String(z.well)), `/${z.total}`] : 'Nothing stocked yet'),
      ])]);
    zoneCards.set(z.area.id, card);
    return card;
  };
  // problems first; areas that are all at par fold into one row (they're still on the minimap and one tap away)
  const byAttention = zones.slice().sort((a, b) => attentionOrder(a) - attentionOrder(b));
  const fine = byAttention.filter(z => z.tone === 'success'), needs = byAttention.filter(z => z.tone !== 'success');
  const fold = fine.length >= 3;
  const foldList = el('div', { className: 'ovx-fold-list', hidden: true }, fold ? fine.map(zoneCard) : []);
  const foldBtn = fold ? el('button', { type: 'button', className: 'ovx-fold', 'aria-expanded': 'false', onClick: () => { const open = foldList.hidden; foldList.hidden = !open; foldBtn.setAttribute('aria-expanded', String(open)); foldBtn.querySelector('.ovx-fold-act').textContent = open ? 'Hide' : 'Show'; } }, [
    el('span', { className: 'ovx-fold-icons', 'aria-hidden': 'true' }, fine.slice(0, 4).map(z => el('i', { 'data-tone': 'success' }))),
    el('span', { className: 'ovx-fold-text' }, [el('b', {}, `${fine.length} areas`), ' at par']), el('span', { className: 'ovx-fold-act' }, 'Show')]) : null;
  const zoneList = [...needs.map(zoneCard), ...(fold ? [foldBtn, foldList] : fine.map(zoneCard))];
  // draw the 3D icons after the page is up, one per frame, and swap them in as they arrive
  liveIcons = { zones, zoneCards };
  requestAnimationFrame(() => requestAnimationFrame(() => { if (!sceneBox.isConnected) return; drawIcons(zones.map(z => z.glyph), theme(), (key, url) => {
    // icons can finish after a redraw (live sync, instant start): put them on the cards that are on screen now
    const { zones: zs, zoneCards: cards } = liveIcons || {};
    for (const z of zs || []) { if (z.glyph !== key) continue; const old = cards.get(z.area.id)?.querySelector('svg.ovx-icon'); if (old) { const img = iconImg(url); img.classList.add('is-new'); old.replaceWith(img); } } }); }));
  const summary = el('section', { className: 'ovx-summary' }, [
    el('div', { className: 'ovx-card-head' }, [el('h2', {}, 'On hand'), expandBtn('Open inventory', () => navigate('inventory'))]),
    el('div', { className: 'ovx-summary-row' }, [big(money(d.value)), el('span', { className: 'ovx-summary-label' }, tracked ? `${fmt(tracked)} item${tracked === 1 ? '' : 's'} across ${fmt(zones.filter(z => z.total).length)} area${zones.filter(z => z.total).length === 1 ? '' : 's'}` : 'Nothing stocked yet')]),
    el('span', { className: 'ovx-track is-wide', role: 'img', 'aria-label': `${health}% of items at par` }, el('i', { style: `width:${health}%` })),
  ]);
  const right = el('div', { className: 'ovx-right' }, [el('div', { className: 'ovx-zones' }, zoneList), summary]);

  /* inventory list */
  const order = { out: 0, critical: 1, low: 2, well: 3 };
  const rows = d.itemRows.filter(r => r.stocked).sort((a, b) => (order[a.state] - order[b.state]) || a.item.name.localeCompare(b.item.name)).slice(0, 6);
  const pill = st => el('span', { className: 'ovx-pill', 'data-state': st }, [el('i'), { out: 'Out', critical: 'Critical', low: 'Low', well: 'Well' }[st]]);
  const invCard = el('section', { className: 'ovx-card ovx-inv' }, [
    el('div', { className: 'ovx-card-head' }, [el('h2', {}, 'Inventory list'), expandBtn('Open inventory', () => navigate('inventory'))]),
    rows.length ? el('div', { className: 'ovx-table', role: 'table', 'aria-label': 'Inventory list' }, [
      el('div', { className: 'ovx-tr is-head', role: 'row' }, ['Code', 'Product', 'Stock available', 'Location', 'State'].map(h => el('span', { role: 'columnheader' }, h))),
      ...rows.map(r => el('button', { type: 'button', className: 'ovx-tr', role: 'row', onClick: () => itemDrawer(r.item) }, [
        el('span', { role: 'cell', className: 'ovx-code' }, r.item.sku || '—'), el('span', { role: 'cell', className: 'ovx-prod' }, r.item.name),
        el('span', { role: 'cell', className: 'ovx-qty' }, `${fmt(r.available)} ${r.item.base_unit}`), el('span', { role: 'cell', className: 'ovx-loc' }, r.area ? r.area.name : '—'), el('span', { role: 'cell' }, pill(r.state))]))])
      : el('div', { className: 'ovx-empty' }, [el('strong', {}, hasItems ? 'Nothing stocked yet' : 'No items yet'), el('span', {}, hasItems ? 'Record opening balances and the lowest stock appears here first.' : 'Add items, then record what’s on the shelves.'), el('button', { type: 'button', className: 'ovx-cta is-small', onClick: () => navigate('inventory') }, hasItems ? 'Open inventory' : 'Add items')]),
  ]);

  /* distribution by state */
  const median = rows => d.median(rows);
  const cov = rows => { const m = median(rows); return m == null ? null : `${Math.round(m)}-day coverage`; };
  const legend = (tone, label, n, rowsFor) => el('div', { className: 'ovx-leg' }, [el('span', { className: 'ovx-leg-name' }, [el('i', { className: 'ovx-dot', 'data-tone': tone }), label]), el('span', { className: 'ovx-chip' }, cov(rowsFor) || `${fmt(n)} item${n === 1 ? '' : 's'}`)]);
  const blocks = [['is-well', wellN], ['is-low', lowN], ['is-critical', critN]].filter(([, n]) => n);
  const distCard = el('section', { className: 'ovx-card ovx-dist' }, [
    el('div', { className: 'ovx-card-head' }, [el('h2', {}, 'Distribution by state'), el('span', { className: 'ovx-head-actions' }, [expandBtn('Open replenish', () => navigate('replenish'))])]),
    el('div', { className: 'ovx-dist-body' }, [
      el('div', { className: 'ovx-legs' }, [legend('well', 'Well', wellN, d.states.well), legend('low', 'Low', lowN, d.states.low), legend('critical', 'Critical', critN, d.states.critical)]),
      el('div', { className: 'ovx-dist-right' }, [el('span', { className: 'ovx-muted-label' }, 'Items tracked'), big(tracked ? fmt(tracked) : '—'),
        el('div', { className: 'ovx-blocks' }, tracked ? blocks.map(([cls, n]) => el('div', { className: 'ovx-block-col', style: `flex:${Math.max(n, tracked * .12)}` }, [el('span', {}, `${pctOf(n, tracked)}%`), el('i', { className: `ovx-block ${cls}` })])) : [el('div', { className: 'ovx-block-col', style: 'flex:1' }, [el('span', {}, '—'), el('i', { className: 'ovx-block is-empty' })])]),
      ]),
    ]),
  ]);

  /* treatment sheets + expiring strip under the lists */
  const ago = t => { const m = Math.round((Date.now() - Date.parse(t)) / 60000); return m < 1 ? 'now' : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : new Date(t).toLocaleDateString(); };
  const doseRows = d.tsEvents.slice(0, 4).map(e => { const env = e.envelope || {}, rev = env.event_type === 'InventoryReversed'; return el('div', { className: 'ovx-dose', 'data-tone': e.status === 'failed' ? 'warning' : rev ? 'neutral' : 'success' }, [el('i', { className: 'ovx-dot' }), el('span', { className: 'ovx-dose-main' }, [el('b', {}, rev ? 'Dose undone' : (env.external_item_id || 'Dose')), el('small', {}, [env.external_location_id, env.patient, env.quantity && env.unit ? `${env.quantity} ${env.unit}` : null].filter(Boolean).join(' · '))]), el('span', { className: 'ovx-dose-time' }, e.status === 'failed' ? 'Needs review' : ago(env.timestamp || e.created_at))]); });
  const doseCard = el('section', { className: 'ovx-card ovx-doses' }, [
    el('div', { className: 'ovx-card-head' }, [el('h2', {}, 'Treatment Sheets'), el('span', { className: 'ovx-head-actions' }, [el('span', { className: 'ovx-chip' }, `${fmt(d.dosesToday.length)} today`), expandBtn('Open Integrations', () => navigate('integrations'))])]),
    doseRows.length ? el('div', { className: 'ovx-dose-list' }, doseRows) : el('div', { className: 'ovx-empty' }, [el('strong', {}, 'No doses yet'), el('span', {}, 'Doses charted on treatment sheets appear here.')]),
  ]);
  const expCard = el('section', { className: 'ovx-card ovx-exp' }, [
    el('div', { className: 'ovx-card-head' }, [el('h2', {}, 'Expiring'), expandBtn('Open inventory', () => navigate('inventory'))]),
    el('div', { className: 'ovx-exp-row' }, d.buckets.map((b, i) => el('div', { className: 'ovx-exp-cell', 'data-tone': b.lots ? (i === 0 ? 'critical' : 'warning') : 'neutral' }, [el('span', {}, `${b.days} days`), big(fmt(b.lots)), el('small', {}, b.lots ? money(b.value) : 'None')]))),
  ]);

  function zoneDrawer(z) {
    const zr = [...z.rows].sort((a, b) => (order[a.state] - order[b.state]) || a.item.name.localeCompare(b.item.name));
    k.makeDialog({ title: z.area.name, description: z.total ? `${z.well} of ${z.total} items at par · ${money(z.value)} on hand` : 'Nothing is stocked here yet.', children: [
      el('div', { className: 'stack' }, [
        zr.length ? el('div', { className: 'ov-drawer-list' }, zr.map(r => el('button', { type: 'button', className: 'ov-drawer-row', onClick: () => itemDrawer(r.item) }, [
          el('span', {}, [el('strong', {}, r.item.name), el('small', {}, `${fmt(r.available)} ${r.item.base_unit} available${r.hasPar ? ` · reorder at ${fmt(r.rule.reorder_point)}` : ''}${r.expiresIn != null ? ` · ${r.expiresIn <= 0 ? 'a lot has expired' : `a lot expires in ${r.expiresIn} day${r.expiresIn === 1 ? '' : 's'}`}` : ''}`)]), pill(r.state)]))) :
          EmptyState({ title: 'No stock here yet', description: 'Receive stock or record an opening balance for this area.', icon: 'package' }),
        el('div', { className: 'inline' }, [can('stock.move') ? Button({ label: 'Record movement', variant: 'primary', icon: 'plus', onClick: () => movementDialog(undefined, 'receive', { location_id: z.area.id }) }) : null, Button({ label: 'Open Locations', onClick: () => navigate('locations') })]),
      ])] }, true);
  }

  return [el('div', { className: 'ovx' }, [
    titleRow,
    hasItems ? todo : null,
    !hasItems ? el('div', { className: 'ovx-setup' }, [el('span', {}, [el('b', {}, 'Your areas are ready. '), 'Add items and record what’s on the shelves — the shelves fill in as stock arrives.']), el('button', { type: 'button', className: 'ovx-cta is-small', onClick: () => navigate('inventory') }, 'Add items')]) : null,
    el('div', { className: 'ovx-grid' }, [
      el('div', { className: 'ovx-left' }, [sceneBox, el('div', { className: 'ovx-lower' }, [invCard, distCard]), el('div', { className: 'ovx-lower is-even' }, [doseCard, expCard])]),
      right,
    ]),
  ])];
}
