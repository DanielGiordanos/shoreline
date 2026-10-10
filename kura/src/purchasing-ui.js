/* Receiving from a packing slip, invoice matching and distributor price lists
   (engine: backend/purchasing.py → state.pricing, state.invoicing; photos read by cloud/functions/label-reader.js).

   Packing slip / invoice: take photos of the pages, Kura reads the lines (photos are not saved) and matches them to
   the order; you check the quantities, lots and dates, then receive in one step. An invoice is matched against the
   order (price) and what was received (quantity) — differences become exceptions to accept or claim a credit for.
   Price lists: import a distributor's CSV; orders then show when another vendor has the same item for less. */
import { el, Button, Dropdown, EmptyState } from './ui/components.js?v=3a7528f6ad';
import { labelReader, photoPanel, readLabel } from './label-reader.js?v=3a7528f6ad';

const money = n => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const UOM = { EA: 'each', EACH: 'each', BX: 'box', BOX: 'box', CS: 'case', CASE: 'case', VL: 'vial', VIAL: 'vial', BG: 'bag', BAG: 'bag', BT: 'bottle', BTL: 'bottle',
  PK: 'pack', PKG: 'pack', TB: 'tube', TU: 'tube', AM: 'ampule', AMP: 'ampule', SY: 'syringe', RL: 'roll', PR: 'pair', KT: 'kit', TAB: 'tablet', CAP: 'capsule', ML: 'mL', GM: 'g', G: 'g' };
const words = s => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').split(' ').filter(w => w.length > 1));
const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.min(A.size, B.size); };
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/* doc unit (BX) → one of the item's units, if it has it */
function unitFor(item, printed) {
  const units = item?.units || {}, u = String(printed || '').trim();
  if (!u) return null;
  if (units[u]) return u;
  const mapped = UOM[u.toUpperCase()];
  if (mapped && units[mapped]) return mapped;
  return Object.keys(units).find(x => x.toLowerCase() === u.toLowerCase()) || null;
}

/* which order line each document line belongs to */
export function matchLines(k, order, doc) {
  const used = new Set(), out = [];
  const lines = order.lines || [];
  for (const d of doc.lines || []) {
    let index = Number.isInteger(d.order_line_index) && d.order_line_index < lines.length ? d.order_line_index : null;
    if (index == null) {
      const scored = lines.map((l, i) => {
        const item = k.find('items', l.item_id) || {};
        let score = 0;
        if (d.vendor_sku && norm(d.vendor_sku) && [item.vendor_sku, item.sku].some(v => norm(v) === norm(d.vendor_sku))) score = 3;
        else if (d.manufacturer_number && norm(d.manufacturer_number) === norm(item.vendor_sku)) score = 3;
        else if (d.barcode && (item.barcodes || []).some(b => String(b).replace(/^0+/, '') === String(d.barcode).replace(/^0+/, ''))) score = 3;
        else score = overlap(d.description, item.name) >= 0.5 ? 1 + overlap(d.description, item.name) : 0;
        return { i, score };
      }).filter(x => x.score > 0 && !used.has(x.i)).sort((a, b) => b.score - a.score);
      index = scored[0]?.i ?? null;
    }
    if (index != null) used.add(index);
    out.push({ ...d, order_line_index: index });
  }
  return out;
}

/* a document quantity in the order line's unit */
function inLineUnit(k, line, d) {
  const item = k.find('items', line.item_id) || {}, from = unitFor(item, d.unit) || line.unit, units = item.units || {};
  if (d.quantity == null) return null;
  return units[from] && units[line.unit] ? d.quantity * Number(units[from]) / Number(units[line.unit]) : d.quantity;
}

function readDocument(k, order, { title, onDoc }) {
  if (!labelReader()) { onDoc(null); return; }
  let dialog;
  const panel = photoPanel({ title: 'Photograph the pages', max: 4, readText: 'Read document', hint: 'One photo per page, flat and in focus.',
    text: 'Up to 4 pages. Kura reads the lines and matches them to this order for you to check. Photos aren’t saved.',
    read: photos => readLabel(photos, { kind: 'document', order_lines: (order.lines || []).map(l => { const it = k.find('items', l.item_id) || {}; return { name: it.name, vendor_sku: it.vendor_sku, quantity: l.quantity, unit: l.unit }; }) }),
    onRead: result => { dialog.dismiss(); onDoc(result?.document || null); } });
  dialog = k.makeDialog({ title, description: `Order ${order.number || order.id.slice(0, 8)} · ${k.vendorName(order.vendor_id)}`,
    children: [el('div', { className: 'stack' }, [panel, el('div', { className: 'form-actions' }, [Button({ label: 'Enter by hand instead', variant: 'ghost', onClick: () => { dialog.dismiss(); onDoc(null); } })])])] });
}

/* ---------- receive from a packing slip ---------- */
export function receiveFromSlip(k, order) {
  readDocument(k, order, { title: 'Receive from packing slip', onDoc: doc => receiveDialog(k, order, doc) });
}

function receiveDialog(k, order, doc) {
  const baseDue = l => Number(l.base_quantity ?? Number(l.quantity) * Number(l.item.units?.[l.unit] || 1)) - Number(l.received ?? l.received_quantity ?? 0);
  const lines = (order.lines || []).map((l, index) => ({ ...l, index, item: k.find('items', l.item_id) || {} })).filter(l => baseDue(l) > 1e-9);
  if (!lines.length) { k.Toast({ message: 'Everything on this order has been received.', tone: 'info' }); return; }
  const matched = doc ? matchLines(k, order, doc) : [];
  const byLine = new Map(matched.filter(m => m.order_line_index != null).map(m => [m.order_line_index, m]));
  const extra = matched.filter(m => m.order_line_index == null);
  const remainingIn = l => baseDue(l) / Number(l.item.units?.[l.unit] || 1);
  const fields = [], initial = {};
  for (const l of lines) {
    const d = byLine.get(l.index), rem = remainingIn(l);
    fields.push({ key: 'q' + l.index, label: `${l.item.name} — arrived (${l.unit}; ${k.fmt(rem)} still due)`, type: 'number', min: 0, wide: !l.item.lot_required });
    initial['q' + l.index] = d ? (inLineUnit(k, l, d) ?? 0) : doc ? 0 : rem;
    if (l.item.lot_required) {
      fields.push({ key: 'lot' + l.index, label: 'Lot', required: false }, { key: 'exp' + l.index, label: 'Expires', type: 'date', required: false });
      initial['lot' + l.index] = d?.lot || ''; initial['exp' + l.index] = d?.expires || '';
    }
  }
  const notes = [];
  if (doc) {
    const short = lines.filter(l => byLine.has(l.index) && inLineUnit(k, l, byLine.get(l.index)) < remainingIn(l) - 1e-9).map(l => l.item.name);
    const missing = lines.filter(l => !byLine.has(l.index)).map(l => l.item.name);
    if (short.length) notes.push(['warning', `Shipped short: ${short.join(', ')}. The rest stays on order.`]);
    if (missing.length) notes.push(['warning', `Not on the slip: ${missing.join(', ')}.`]);
    if (extra.length) notes.push(['warning', `On the slip but not this order: ${extra.map(e => e.description || e.vendor_sku).join(', ')} — a substitution or another order. Receive it separately if it arrived.`]);
    if (doc.unsure?.length) notes.push(['neutral', `Hard to read: ${doc.unsure.join('; ')}.`]);
    if (!notes.length) notes.push(['success', `The slip matches the order (${doc.number ? 'slip ' + doc.number : 'no number read'}).`]);
  }
  const banner = doc ? el('div', { className: 'plan-list' }, notes.map(([tone, text]) => el('article', { className: 'plan-row', 'data-tone': tone }, [el('div', { className: 'plan-main' }, el('p', { className: 'plan-why' }, text)), el('div')]))) : null;
  const isInvoice = doc?.document_type === 'invoice';
  return k.formDialog({ title: doc ? `Receive slip ${doc.number || ''}`.trim() : 'Receive delivery', wide: true,
    description: doc ? 'Check each line against the boxes, then receive. Quantities are in the order’s units.' : 'Enter what arrived. Quantities are in the order’s units.',
    children: [banner].filter(Boolean), initial: { ...initial, location_id: order.location_id, note: doc?.number ? `Packing slip ${doc.number}` : '', also_invoice: isInvoice },
    fields: [...fields, { key: 'location_id', label: 'Receive into', type: 'select', options: () => k.options('locations'), required: true },
      { key: 'note', label: 'Receiving note', wide: true, required: true }, ...(isInvoice ? [{ key: 'also_invoice', label: 'This is the invoice too — match its prices', type: 'checkbox' }] : [])],
    submitLabel: 'Receive',
    onSave: async p => {
      let n = 0;
      for (const l of lines) {
        const q = Number(p['q' + l.index] || 0); if (q <= 0) continue;
        await k.api.command('order.receive', { id: order.id, line_index: l.index, quantity: q, unit: l.unit, location_id: p.location_id,
          ...(p['lot' + l.index] ? { lot_code: p['lot' + l.index] } : {}), ...(p['exp' + l.index] ? { expires: p['exp' + l.index] } : {}), reason: p.note });
        n++;
      }
      if (!n) throw new Error('Enter at least one quantity that arrived.');
      if (p.also_invoice) setTimeout(() => invoiceDialog(k, k.find('orders', order.id) || order, doc), 300);
      return { received: n };
    } });
}

/* ---------- match an invoice ---------- */
export function matchInvoice(k, order) {
  readDocument(k, order, { title: 'Match invoice', onDoc: doc => invoiceDialog(k, order, doc) });
}

function invoiceDialog(k, order, doc) {
  const matched = doc ? matchLines(k, order, doc) : [];
  const byLine = new Map(matched.filter(m => m.order_line_index != null).map(m => [m.order_line_index, m]));
  const extra = matched.filter(m => m.order_line_index == null && (m.quantity || m.unit_price || m.extended));
  const fields = [], initial = { number: doc?.number || '', date: doc?.date || new Date().toISOString().slice(0, 10), freight: doc?.freight ?? 0, tax: doc?.tax ?? 0, total: doc?.total ?? '' };
  (order.lines || []).forEach((l, i) => {
    const item = k.find('items', l.item_id) || {}, d = byLine.get(i);
    const unit = (d && unitFor(item, d.unit)) || l.unit;
    fields.push({ key: 'q' + i, label: `${item.name} — billed (${unit})`, type: 'number', min: 0 }, { key: 'p' + i, label: `Price per ${unit} ($)`, type: 'number', min: 0 });
    initial['q' + i] = d?.quantity ?? (doc ? 0 : Number(l.quantity)); initial['p' + i] = d?.unit_price ?? Number(l.unit_cost || 0); initial['u' + i] = unit;
  });
  const extraBox = extra.length ? el('div', { className: 'plan-list' }, extra.map(e => el('article', { className: 'plan-row', 'data-tone': 'warning' }, [el('div', { className: 'plan-main' }, [
    el('div', { className: 'plan-title' }, [el('strong', {}, e.description || e.vendor_sku || 'Line'), el('span', { className: 'plan-tag', 'data-tone': 'warning' }, 'Not on the order')]),
    el('div', { className: 'plan-meta' }, [e.quantity != null ? el('span', {}, `Qty ${e.quantity} ${e.unit || ''}`) : null, e.unit_price != null ? el('span', {}, money(e.unit_price)) : null].filter(Boolean))]), el('div')]))) : null;
  return k.formDialog({ title: doc?.number ? `Invoice ${doc.number}` : 'Match invoice', wide: true,
    description: 'Kura compares each billed line with the order’s price and with what was received. Lines billed but not on the order are flagged too.',
    initial, children: [extraBox].filter(Boolean),
    fields: [{ key: 'number', label: 'Invoice number', required: true }, { key: 'date', label: 'Invoice date', type: 'date' }, ...fields,
      { key: 'freight', label: 'Freight ($)', type: 'number', min: 0 }, { key: 'tax', label: 'Tax ($)', type: 'number', min: 0 }, { key: 'total', label: 'Invoice total ($)', type: 'number', min: 0 }],
    command: 'invoice.save', submitLabel: 'Match invoice',
    transform: p => ({ order_id: order.id, number: p.number, date: p.date, document: 'invoice', source: doc ? 'photo' : 'manual', freight: p.freight, tax: p.tax, total: p.total === 0 && !doc?.total ? null : p.total,
      lines: [...(order.lines || []).map((l, i) => ({ order_line_index: i, quantity: p['q' + i], unit: initial['u' + i], unit_price: p['p' + i] })).filter(x => x.quantity > 0),
        ...extra.map(e => ({ order_line_index: null, description: e.description || e.vendor_sku, quantity: e.quantity ?? 1, unit_price: e.unit_price ?? e.extended ?? 0 }))] }),
    onSave: inv => { if (inv?.exceptions?.length) exceptionsDialog(k, inv); else k.Toast({ message: 'Invoice matches the order and the receipts.' }); } });
}

export function exceptionsDialog(k, inv) {
  const list = el('div', { className: 'plan-list' }, inv.exceptions.map(e => el('article', { className: 'plan-row', 'data-tone': e.type === 'price' || e.type === 'not_received' ? 'critical' : 'warning' }, [
    el('div', { className: 'plan-main' }, [el('div', { className: 'plan-title' }, [el('strong', {}, { price: 'Price differs', not_received: 'Billed, not received', not_ordered: 'Not on the order', total: 'Total does not add up', unit: 'Unit unclear' }[e.type] || e.type),
      e.amount ? el('span', { className: 'plan-tag', 'data-tone': 'warning' }, money(e.amount)) : null]), el('p', { className: 'plan-why' }, e.text)]), el('div')])));
  return k.formDialog({ title: `Invoice ${inv.number}: ${inv.exceptions.length} to review`, wide: true, description: `Up to ${money(inv.at_risk)} may be billed incorrectly. Accept it, or note that you asked the vendor for a credit.`,
    children: [list], initial: { outcome: 'credit_requested', credit_amount: inv.at_risk },
    fields: [{ key: 'outcome', label: 'Outcome', type: 'select', options: [{ value: 'credit_requested', label: 'Asked the vendor for a credit' }, { value: 'credit_received', label: 'Credit received' }, { value: 'accepted', label: 'Accept as billed' }] },
      { key: 'credit_amount', label: 'Credit amount ($)', type: 'number', min: 0 }, { key: 'note', label: 'Note', type: 'textarea', wide: true, help: 'Rep’s name, credit memo number…' }],
    command: 'invoice.resolve', submitLabel: 'Save', transform: p => ({ id: inv.id, ...p }) });
}

export function invoicesPanel(k) {
  const I = k.state.invoicing || { invoices: [], open: 0, credits_pending: 0 };
  if (!I.invoices.length) return null;
  const tone = s => s === 'matched' || s === 'resolved' ? 'success' : s === 'credit_requested' ? 'warning' : 'critical';
  return el('section', { className: 'stack' }, [el('div', { className: 'inline spaced' }, [el('h2', {}, 'Invoices'), el('p', { className: 'muted small' }, `${I.open} open · ${money(I.credits_pending)} in credits pending`)]),
    el('div', { className: 'plan-list' }, I.invoices.slice(0, 30).map(inv => el('article', { className: 'plan-row', 'data-tone': tone(inv.status) }, [
      el('div', { className: 'plan-main' }, [el('div', { className: 'plan-title' }, [el('strong', {}, `${k.vendorName(inv.vendor_id)} · ${inv.number}`), el('span', { className: 'plan-tag', 'data-tone': tone(inv.status) },
        { matched: 'Matched', exceptions: `${inv.exceptions.length} to review`, credit_requested: 'Credit requested', resolved: inv.outcome === 'credit_received' ? 'Credit received' : 'Accepted' }[inv.status] || inv.status)]),
        el('div', { className: 'plan-meta' }, [inv.date || String(inv.at).slice(0, 10), money(inv.total), inv.at_risk ? `${money(inv.at_risk)} at issue` : null, inv.note || null].filter(Boolean).map(t => el('span', {}, t)))]),
      el('div', { className: 'plan-actions' }, [inv.status === 'exceptions' || inv.status === 'credit_requested' ? k.act(inv.status === 'credit_requested' ? 'Update' : 'Review', () => exceptionsDialog(k, inv), 'invoice.resolve', 'primary') : null].filter(Boolean))])))]);
}

/* ---------- price lists ---------- */
function csvRows(text) {
  const rows = []; let row = [], cell = '', q = false; text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(x => x.trim())) rows.push(row); row = []; cell = ''; }
    else cell += c; }
  if (cell || row.length) { row.push(cell); if (row.some(x => x.trim())) rows.push(row); }
  return rows;
}
const GUESS = { vendor_sku: /^(vendor\s*)?(item|sku|product|catalog|part)\s*(#|no|num|number|code|id)?$|^item$|^sku$|^vendor\s*sku/i, manufacturer_number: /^(mfr|mfg|manufacturer)\s*(#|no|num|number|part|item|code)?/i,
  barcode: /^(ndc|upc|gtin|barcode|ean)/i, description: /desc|^name$|product\s*name|item\s*name/i, unit: /^(uom|unit|unit of measure|sell unit)$/i, pack_size: /pack|per\s*(uom|unit|case|box)|qty\s*per|^count$/i,
  price: /price|cost|amount|net/i };

export function priceImportDialog(k, vendorId) {
  let rows = [], headers = [], dryRun = null, dialog;
  const status = el('p', { className: 'muted small', role: 'status' }, 'Export the price list from the distributor’s site as CSV (MWI, Covetrus, Patterson and Vetcove can all export one).');
  const mapBox = el('div', { className: 'form-grid' }), resultBox = el('div', { className: 'stack' });
  const vendor = Dropdown({ label: 'Vendor', value: vendorId || k.list('vendors')[0]?.id, options: k.options('vendors') });
  const effective = el('input', { type: 'date', className: 'pv-input', value: new Date().toISOString().slice(0, 10), 'aria-label': 'Prices effective' });
  const file = el('input', { type: 'file', accept: '.csv,text/csv', className: 'pv-input', 'aria-label': 'Price list CSV' });
  const selects = {};
  const check = Button({ label: 'Check matches', variant: 'secondary', onClick: () => run(true) });
  const save = Button({ label: 'Import prices', variant: 'primary', onClick: () => run(false) });
  check.disabled = save.disabled = true;
  file.addEventListener('change', async () => {
    try {
      const all = csvRows(await file.files[0].text());
      if (all.length < 2) throw new Error('The file needs a header row and at least one price.');
      headers = all[0].map(h => h.trim()); rows = all.slice(1);
      mapBox.replaceChildren(...Object.keys(GUESS).map(key => {
        const guess = headers.findIndex(h => GUESS[key].test(h)), d = Dropdown({ label: { vendor_sku: 'Vendor item #', manufacturer_number: 'Manufacturer #', barcode: 'NDC / UPC', description: 'Description', unit: 'Unit', pack_size: 'Units per pack', price: 'Price' }[key],
          value: guess >= 0 ? String(guess) : '', options: [{ value: '', label: '—' }, ...headers.map((h, i) => ({ value: String(i), label: h }))] });
        selects[key] = d; return d;
      }));
      status.textContent = `${rows.length} rows. Check the columns, then check matches.`; check.disabled = false;
    } catch (e) { status.textContent = e.message || String(e); }
  });
  const payloadRows = links => rows.map((r, i) => { const o = {}; for (const [key, d] of Object.entries(selects)) if (d.control.value !== '') o[key] = (r[Number(d.control.value)] || '').trim(); if (links[i]) o.item_id = links[i]; return o; });
  const links = {};
  async function run(dry) {
    if (!selects.price?.control.value) { status.textContent = 'Choose the price column.'; return; }
    check.disabled = save.disabled = true; status.textContent = dry ? 'Matching…' : 'Importing…';
    try {
      const out = await k.api.command('price.import', { vendor_id: vendor.control.value, effective: effective.value, file_name: file.files[0]?.name, rows: payloadRows(links), dry_run: dry });
      dryRun = out;
      if (!dry) { k.Toast({ message: `Imported ${out.matched} prices from ${k.vendorName(out.vendor_id)}${out.changed ? ` · ${out.changed} changed` : ''}.` }); dialog.dismiss(); await k.refresh(); return; }
      status.textContent = `${out.matched} of ${out.rows} matched to Kura items · ${out.unmatched} not matched · ${out.unit_problems} with a unit to check. Link any you stock, then import.`;
      const problems = out.results.filter(r => r.status !== 'matched' && r.status !== 'no_price').slice(0, 60);
      resultBox.replaceChildren(el('div', { className: 'plan-list' }, problems.map(r => {
        const pick = Dropdown({ label: 'Kura item', value: links[r.row] || '', options: [{ value: '', label: r.status === 'unit' ? `Unit “${r.unit}” unknown for ${r.item_name}` : 'Not stocked' }, ...k.options('items')], onChange: v => { links[r.row] = v; } });
        return el('article', { className: 'plan-row', 'data-tone': 'warning' }, [el('div', { className: 'plan-main' }, [el('div', { className: 'plan-title' }, [el('strong', {}, r.description || r.vendor_sku || `Row ${r.row + 2}`)]),
          el('div', { className: 'plan-meta' }, [r.vendor_sku, r.unit, r.price != null ? money(r.price) : null].filter(Boolean).map(t => el('span', {}, t)))]), el('div', { className: 'plan-actions' }, [pick])]);
      })));
    } catch (e) { status.textContent = e.message || String(e); }
    check.disabled = false; save.disabled = !dryRun;
  }
  dialog = k.makeDialog({ title: 'Import a price list', description: 'Prices are compared per base unit, so a box of 25 and a single vial compare fairly. Nothing is ordered or changed on your items.',
    children: [el('div', { className: 'stack' }, [el('div', { className: 'form-grid' }, [vendor, el('div', { className: 'pv-field' }, [el('label', { className: 'pv-label' }, 'Prices effective'), effective]), el('div', { className: 'pv-field wide' }, [el('label', { className: 'pv-label' }, 'CSV file'), file])]),
      mapBox, status, resultBox, el('div', { className: 'form-actions' }, [Button({ label: 'Close', onClick: () => dialog.dismiss() }), check, save])])] });
  dialog.classList.add('kura-editor');
}

/* prices for one item, in its drawer */
export function pricePanel(k, item) {
  const rows = k.state.pricing?.items?.[item.id] || [];
  if (!rows.length) return EmptyState({ title: 'No vendor prices yet', icon: 'chart', description: 'Import a distributor price list (Vendors → Import price list) to compare.', action: k.act('Import price list', () => priceImportDialog(k, item.vendor_id), 'price.import') });
  const best = rows[0];
  return el('div', { className: 'plan-list' }, rows.map(r => el('article', { className: 'plan-row', 'data-tone': r === best ? 'success' : 'neutral' }, [
    el('div', { className: 'plan-main' }, [el('div', { className: 'plan-title' }, [el('strong', {}, r.vendor_name), r === best ? el('span', { className: 'plan-tag', 'data-tone': 'success' }, 'Lowest') : null, r.vendor_id === item.vendor_id ? el('span', { className: 'plan-tag' }, 'Preferred') : null]),
      el('div', { className: 'plan-meta' }, [`${money(r.per_base)} per ${item.base_unit}`, r.unit ? `${money(r.price)} per ${r.unit}` : null, r.vendor_sku ? `#${r.vendor_sku}` : null, r.effective ? `from ${r.effective}` : null,
        r.change_pct ? `${r.change_pct > 0 ? '+' : ''}${r.change_pct}% since last list` : null].filter(Boolean).map(t => el('span', {}, t)))]), el('div')])));
}

/* the line hint in the order editor: cheaper elsewhere? */
export function priceHint(k, itemId, vendorId) {
  const rows = k.state.pricing?.items?.[itemId] || [], item = k.find('items', itemId);
  if (!rows.length || !item) return '';
  const mine = rows.find(r => r.vendor_id === vendorId), best = rows[0];
  if (mine && best.vendor_id !== vendorId && mine.per_base > 0) {
    const pct = Math.round((mine.per_base - best.per_base) / mine.per_base * 100);
    if (pct >= 2) return `${best.vendor_name} has this for ${money(best.per_base)} per ${item.base_unit} (${pct}% less).`;
  }
  return mine ? `${k.vendorName(vendorId)} price list: ${money(mine.per_base)} per ${item.base_unit}${mine === best ? ' — the lowest on file.' : '.'}` : '';
}
export function listPrice(k, itemId, vendorId, unit) {
  const r = (k.state.pricing?.items?.[itemId] || []).find(x => x.vendor_id === vendorId), item = k.find('items', itemId);
  return r && item?.units?.[unit] ? Math.round(r.per_base * Number(item.units[unit]) * 100) / 100 : null;
}

export function pricesCard(k) {
  const P = k.state.pricing || { savings: [], increases: [], imports: [] };
  const line = (tone, title, meta, why) => el('article', { className: 'plan-row', 'data-tone': tone }, [el('div', { className: 'plan-main' }, [el('div', { className: 'plan-title' }, [el('strong', {}, title)]),
    el('div', { className: 'plan-meta' }, meta.filter(Boolean).map(t => el('span', {}, t))), why ? el('p', { className: 'plan-why' }, why) : null]), el('div')]);
  return el('section', { className: 'stack' }, [el('div', { className: 'inline spaced' }, [el('h2', {}, 'Prices'), k.act('Import price list', () => priceImportDialog(k), 'price.import', 'secondary', 'upload')]),
    P.imports.length ? el('p', { className: 'muted small' }, `Last import: ${k.vendorName(P.imports[0].vendor_id)}, ${P.imports[0].matched} prices, ${String(P.imports[0].at).slice(0, 10)}.`) : el('p', { className: 'muted small' }, 'No price lists yet. Import one from each distributor you buy from to compare.'),
    P.savings.length ? el('div', { className: 'plan-list' }, P.savings.slice(0, 12).map(s => line('success', s.item_name, [`${s.best.vendor_name}: ${money(s.best.per_base)}/${s.unit}`, `${s.preferred.vendor_name}: ${money(s.preferred.per_base)}/${s.unit}`],
      `${s.percent}% less at ${s.best.vendor_name} than at your preferred vendor.`))) : null,
    P.increases.length ? el('div', { className: 'plan-list' }, P.increases.slice(0, 12).map(r => line('warning', r.item_name, [r.vendor_name, `+${r.change_pct}%`, `now ${money(r.per_base)}/${r.unit}`], 'Price went up since the previous list.'))) : null]);
}
