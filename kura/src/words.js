/* Plain words — what Kura shows people instead of the engine's own language.
   - recommendationText: "Order 2 boxes (48 mL) · brings ICU to its 120 mL target", with the facts behind it for "Why?"
   - readable: any record as labelled lines (names instead of IDs, dates instead of timestamps). Never JSON.
   - pairsField: "Field / Value" rows for free-form details, in place of a JSON box.
   - plainError: the few engine messages that need everyday words.
   The engine's text is unchanged (tests and the API rely on it); only what's drawn on screen changes. */
import { el, Button, Input, Dropdown } from './ui/components.js?v=14284a91d4';

const num = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(Number(n) || 0).replace(/^-/, '−');
const sentence = v => { const t = String(v ?? '').replaceAll('_', ' ').toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };

/* "box" → "boxes", "vial" → "vials"; measures and abbreviations stay as they are */
const SAME = new Set(['each', 'ml', 'l', 'g', 'kg', 'mg', 'mcg', 'oz', 'lb', 'cc', 'iu', 'u', 'units', 'unit dose']);
export function plural(unit, n) {
  const u = String(unit || '').trim();
  if (!u || Number(n) === 1 || SAME.has(u.toLowerCase()) || u.length <= 2 || /[A-Z]/.test(u.slice(1)) || /\d/.test(u)) return u;
  if (/(s|x|z|ch|sh)$/i.test(u)) return u + 'es';
  if (/[^aeiou]y$/i.test(u)) return u.slice(0, -1) + 'ies';
  return u + 's';
}
export const qtyText = (n, unit) => `${num(n)} ${plural(unit, n)}`.trim();

/* A replenishment suggestion in one sentence, plus the facts for "Why?". */
export function recommendationText(r, { locationName = id => id, vendorName = id => id } = {}) {
  const unit = r.unit || '', here = r.location_name || locationName(r.location_id);
  const target = Number(r.target) || 0, transfer = r.type === 'transfer' || r.kind === 'transfer';
  const quantity = Number(r.quantity ?? r.suggested_quantity ?? r.order_quantity) || 0;
  const covered = (Number(r.available) || 0) + (Number(r.inbound) || 0) + (Number(r.pending_review) || 0) + (Number(r.internal_coverage) || 0) + quantity;
  const reach = target && covered >= target ? `brings ${here} to its ${qtyText(target, unit)} target` : target ? `gets ${here} closer to its ${qtyText(target, unit)} target` : '';
  let headline;
  if (transfer) headline = `Move ${qtyText(quantity, unit)} from ${r.source_location_name || locationName(r.source_location_id)}`;
  else {
    const packs = Number(r.purchase_quantity) || 0, pu = r.purchase_unit || unit;
    headline = packs && pu && pu !== unit ? `Order ${qtyText(packs, pu)} (${qtyText(quantity, unit)})` : `Order ${qtyText(quantity, unit)}`;
  }
  if (reach) headline += ` · ${reach}`;
  const why = [];
  why.push(`${here} has ${qtyText(r.available, unit)} available.`);
  if (Number(r.minimum) && Number(r.available) <= Number(r.minimum)) why.push(`That’s at or below its minimum of ${qtyText(r.minimum, unit)}.`);
  else if (Number(r.reorder_point)) why.push(`It reorders at ${qtyText(r.reorder_point, unit)}.`);
  if (target) why.push(`Its target is ${qtyText(target, unit)}.`);
  if (Number(r.inbound)) why.push(`${qtyText(r.inbound, unit)} ${Number(r.inbound) === 1 ? 'is' : 'are'} already on order.`);
  if (Number(r.pending_review)) why.push(`${qtyText(r.pending_review, unit)} ${Number(r.pending_review) === 1 ? 'is' : 'are'} on an order waiting for approval.`);
  if (transfer) why.push(`${r.source_location_name || locationName(r.source_location_id)} has more than it needs, so moving it comes before buying.`);
  else {
    if (Number(r.internal_coverage)) why.push(`${qtyText(r.internal_coverage, unit)} can come from other areas first.`);
    const packs = Number(r.purchase_quantity) || 0, pu = r.purchase_unit || unit;
    if (packs && pu !== unit && quantity) why.push(`Rounded up to whole ${plural(pu, 2)} of ${qtyText(quantity / packs, unit)}.`);
    const vendor = r.vendor_name && r.vendor_name !== 'Vendor required' ? r.vendor_name : r.vendor_id ? vendorName(r.vendor_id) : '';
    if (vendor) why.push(`From ${vendor}${Number(r.lead_days) ? `, usually ${num(r.lead_days)} day${Number(r.lead_days) === 1 ? '' : 's'} away` : ''}.`);
    else why.push('No preferred vendor yet — pick one on the order.');
    if (r.vendor_minimum_met === false && Number(r.vendor_minimum)) why.push(`This alone is under the vendor’s $${num(r.vendor_minimum)} minimum order.`);
  }
  return { headline, why, title: `${r.item_name || 'This item'} is low in ${here}` };
}

/* "Why?" — the facts, folded away */
export const whyBox = lines => lines.length ? el('details', { className: 'kura-why' }, [el('summary', {}, 'Why?'), el('ul', {}, lines.map(t => el('li', {}, t)))]) : null;

/* ---------- any record, readable ---------- */
const LABELS = { sku: 'SKU', gtin: 'GTIN', ndc: 'NDC', dea_schedule: 'DEA schedule', base_unit: 'Counted in', purchase_unit: 'Bought in', consume_unit: 'Used in',
  unit_cost: 'Unit cost', vendor_sku: 'Vendor SKU', lot_code: 'Lot', expires: 'Expires', at: 'When', timestamp: 'When', created_at: 'Created', updated_at: 'Changed',
  actor_id: 'By', user_id: 'Person', by: 'By', created_by: 'Created by', item_id: 'Item', location_id: 'Location', source_location_id: 'From', from_location_id: 'From',
  destination_id: 'To', to_location_id: 'To', vendor_id: 'Vendor', lot_id: 'Lot', order_id: 'Order', kit_id: 'Kit', qty: 'Quantity', url: 'Link', csos: 'CSOS number' };
const HIDE = new Set(['id', 'tenant_id', 'version', 'state_signature', 'signature', 'hash', 'key', 'idempotency_key', 'group_id', 'request_id', 'schema']);
const FLAGS = new Set(['restricted', 'hazardous', 'refrigerated', 'controlled']);
const ZERO_MEANS_UNSET = new Set(['minimum', 'reorder_point', 'target', 'safety_stock', 'lead_days', 'order_multiple', 'unit_cost', 'minimum_order']);
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/;
export const humanKey = k => LABELS[k] || sentence(String(k).replace(/_id$/, '').replace(/([a-z])([A-Z])/g, '$1 $2'));

function valueText(key, v, ctx) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (typeof v === 'number') return num(v);
  const s = String(v);
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s.trim())) return num(Number(s));                       // "1E+1" from the engine is 10
  if (/_id$|^by$/.test(key) || key === 'actor_id' || key === 'created_by') {
    const name = /item/.test(key) ? ctx.itemName?.(s) : /location|destination|from|to_/.test(key) ? ctx.locationName?.(s) : /vendor/.test(key) ? ctx.vendorName?.(s)
      : /actor|user|by/.test(key) ? ctx.userName?.(s) : /lot/.test(key) ? ctx.lotName?.(s) : null;
    return name && name !== s ? name : null;             // an ID nobody can read is left out
  }
  if (ISO.test(s) && !Number.isNaN(Date.parse(s))) return s.length <= 10 ? new Date(s + 'T12:00:00').toLocaleDateString([], { dateStyle: 'medium' }) : new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(s) || /^[a-z]+$/.test(s) && s.length < 20 && /status|kind|type|result|state|role|mode|action/.test(key)) return sentence(s);
  return s;
}
/* ctx: { itemName, locationName, vendorName, userName, lotName } — any can be missing */
export function readable(data, ctx = {}, depth = 0) {
  if (data == null || data === '') return el('p', { className: 'muted small' }, 'Nothing recorded.');
  if (Array.isArray(data)) {
    if (!data.length) return el('p', { className: 'muted small' }, 'None.');
    if (data.every(x => x == null || typeof x !== 'object')) return el('p', { className: 'readable-text' }, data.map(x => valueText('', x, ctx)).filter(Boolean).join(', '));
    return el('ol', { className: 'readable-list' }, data.slice(0, 50).map(x => el('li', {}, [readable(x, ctx, depth + 1)])));
  }
  if (typeof data !== 'object') return el('p', { className: 'readable-text' }, valueText('', data, ctx) ?? '');
  const rows = [];
  for (const [k, v] of Object.entries(data)) {
    if (ZERO_MEANS_UNSET.has(k) && Number(v) === 0) continue;
    if (v === false && (/_required$/.test(k) || FLAGS.has(k))) continue;                          // only the flags that are on                                    // a level of 0 means "not set"
    if (k === 'units' && v && typeof v === 'object' && !Array.isArray(v)) {                      // "1 box = 10 ampules"
      const base = data.base_unit || '', lines = Object.entries(v).filter(([u, f]) => u !== base && Number(f) !== 1).map(([u, f]) => `1 ${u} = ${qtyText(Number(f), base)}`);
      if (lines.length) rows.push(el('div', {}, [el('dt', {}, 'Conversions'), el('dd', {}, [el('span', {}, lines.join(' · '))])]));
      continue;
    }
    if (HIDE.has(k) || v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) continue;
    let shown;
    if (typeof v === 'object') shown = depth >= 2 ? el('span', {}, Array.isArray(v) ? `${v.length} entries` : `${Object.keys(v).length} details`) : readable(v, ctx, depth + 1);
    else { const t = valueText(k, v, ctx); if (t == null) continue; shown = el('span', {}, t); }
    rows.push(el('div', {}, [el('dt', {}, humanKey(k)), el('dd', {}, [shown])]));
  }
  return rows.length ? el('dl', { className: 'readable' }, rows) : el('p', { className: 'muted small' }, 'Nothing else recorded.');
}

/* ---------- free-form details: Field / Value rows ---------- */
/* def: { key, label, help, keys?: [names] (a fixed list → the field is a select) }. Values typed as true/false or numbers are kept as such.
   Nested values that can't be typed here are kept unchanged and listed as such. */
export function pairsField(def, value, id) {
  const entries = [], rows = el('div', { className: 'pairs-rows' });
  const base = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const nested = Object.fromEntries(Object.entries(base).filter(([, v]) => v && typeof v === 'object'));
  const add = (name = '', val = '') => {
    const keyNode = def.keys ? Dropdown({ label: 'Field', options: [{ value: '', label: 'Choose a field' }, ...def.keys.map(k => ({ value: k, label: humanKey(k) }))], value: name })
      : Input({ label: 'Field', value: name, placeholder: 'e.g. Contract price' });
    const valNode = Input({ label: 'Value', value: val == null ? '' : String(val) });
    const entry = { keyNode, valNode };
    const row = el('div', { className: 'pairs-row' }, [keyNode, valNode, Button({ label: `Remove ${name || 'field'}`, icon: 'trash', iconOnly: true, variant: 'ghost', onClick: () => { entries.splice(entries.indexOf(entry), 1); row.remove(); } })]);
    entries.push(entry); rows.append(row);
  };
  for (const [k, v] of Object.entries(base)) if (!(k in nested)) add(k, v);
  const keep = Object.keys(nested).length ? el('p', { className: 'pv-help' }, `Kept as they are: ${Object.keys(nested).map(humanKey).join(', ')}.`) : null;
  const node = el('div', { className: 'pv-field wide pairs-field', id }, [el('h3', {}, def.label), def.help ? el('p', { className: 'pv-help' }, def.help) : null, rows, keep,
    Button({ label: 'Add a field', icon: 'plus', size: 'sm', variant: 'ghost', onClick: () => add() })].filter(Boolean));
  node.control = el('input', { type: 'hidden' });
  node.read = () => {
    const out = { ...nested };
    for (const { keyNode, valNode } of entries) {
      const name = String(keyNode.control.value || '').trim(), raw = String(valNode.control.value || '').trim();
      if (!name && !raw) continue;
      if (!name) throw new Error(`${def.label}: every value needs a field name.`);
      if (Object.hasOwn(out, name)) throw new Error(`${def.label}: “${humanKey(name)}” appears twice.`);
      out[name] = raw === 'true' ? true : raw === 'false' ? false : raw !== '' && /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    }
    return out;
  };
  return node;
}

/* ---------- the engine messages that need everyday words ---------- */
const PLAIN = {
  version_conflict: 'Someone else changed this a moment ago. Close it and open it again to see their change.',
  tracking_locked: 'Lot, expiry or serial tracking can’t change once this item has stock history.',
  already_reversed: 'This was already undone.',
  invalid_unit: 'That unit isn’t set up for this item. Add it under Units first.',
  forbidden: 'Your role can’t do this. An administrator can change that in Settings.',
};
export function plainError(err) {
  const code = err?.code || err?.error_code;
  if (code && PLAIN[code]) return PLAIN[code];
  const m = String(err?.message || err || '');
  if (/must contain valid JSON/i.test(m)) return m.replace(/must contain valid JSON\.?/i, 'isn’t filled in correctly.');
  if (/^Failed to fetch|NetworkError/i.test(m)) return 'Kura couldn’t reach the network. Check the connection and try again.';
  return m;
}

/* How an order is named for people: the vendor's reference or order number when there is one; otherwise when it was
   placed. Kura's database ID is never shown. */
export function orderRef(o) { return o ? (o.external_reference || o.number || o.order_number || '') : ''; }
export function orderName(o) {
  const ref = orderRef(o); if (ref) return `#${ref}`;
  const at = o && (o.created_at || o.ordered_at); if (!at) return 'Order';
  return 'Ordered ' + new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
