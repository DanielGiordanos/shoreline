/* Kits & carts — crash carts, anesthesia boxes, procedure kits (engine: backend/kits.py → state.kits).
   Each kit shows whether it is ready to use, its seal and earliest expiry, and the one action it needs next:
   a one-tap seal check, or a restock that records what was used, swaps out short-dated stock and refills it. */
import { el, Button, EmptyState, Metric, PageHeader } from './ui/components.js?v=3a7528f6ad';

const STATUS = { ready: ['success', 'Ready'], expiring: ['warning', 'Expiring soon'], check_due: ['warning', 'Check due'], restock: ['critical', 'Needs restock'],
  expired: ['critical', 'Expired inside'], opened: ['critical', 'Opened'], setup: ['neutral', 'Set contents'] };
const ago = h => h == null ? 'never' : h < 1 ? 'under an hour ago' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
const day = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const kitsOf = state => state.kits || { kits: [], kinds: {}, not_ready: 0 };

export function kitEditor(k, kit = null) {
  const K = kitsOf(k.state), kinds = Object.entries(K.kinds || { crash_cart: 'Crash cart', anesthesia: 'Anesthesia box', procedure: 'Procedure kit', transport: 'Transport bag', other: 'Kit' });
  const areas = k.list('locations').filter(l => l.type !== 'kit' && l.type !== 'hospital' && (l.status || 'active') === 'active');
  const rows = el('div', { className: 'kit-lines' }), refs = [];
  const add = (line = {}) => {
    const item = k.field({ key: 'item_id', label: 'Item', type: 'select', options: k.options('items') }, line.item_id || k.list('items')[0]?.id);
    const qty = k.field({ key: 'quantity', label: 'Quantity', type: 'number', min: 0, required: true }, line.target ?? line.quantity ?? 1);
    const ref = { item, qty }, row = el('div', { className: 'order-line kit-line' }, [item, qty, Button({ label: 'Remove', icon: 'trash', iconOnly: true, variant: 'ghost', onClick: () => { refs.splice(refs.indexOf(ref), 1); row.remove(); } })]);
    refs.push(ref); rows.append(row);
  };
  (kit?.lines?.length ? kit.lines : [{}]).forEach(add);
  const s = kit?.settings || {};
  return k.formDialog({ title: kit ? `Edit ${kit.name}` : 'New kit', wide: true, description: 'A kit is stock that must be complete and in date: a crash cart, an anesthesia box, a procedure kit. Its contents are what a full kit holds.',
    initial: { name: kit?.name || '', parent_id: kit?.area_id || areas[0]?.id, kind: s.kind || 'crash_cart', check_every_hours: s.check_every_hours || 24, expiry_warning_days: s.expiry_warning_days ?? 30,
      source_location_id: s.source_location_id || k.list('locations').find(l => /pharm|central|supply/i.test(l.name))?.id || '' },
    fields: [{ key: 'name', label: 'Name', required: true, placeholder: 'ER crash cart' }, { key: 'parent_id', label: 'Lives in', type: 'select', options: areas.map(a => ({ value: a.id, label: a.name })), required: true },
      { key: 'kind', label: 'Type', type: 'select', options: kinds.map(([value, label]) => ({ value, label })) },
      { key: 'source_location_id', label: 'Restock from', type: 'select', options: () => k.options('locations', 'Choose when restocking') },
      { key: 'check_every_hours', label: 'Check every (hours)', type: 'number', min: 1, help: 'Crash carts: 24. Sealed procedure kits: 720 (monthly).' },
      { key: 'expiry_warning_days', label: 'Swap out stock expiring within (days)', type: 'number', min: 0 }],
    children: [el('div', { className: 'stack' }, [el('h3', {}, 'Contents of a full kit'), rows, Button({ label: 'Add item', icon: 'plus', onClick: () => add() })])],
    command: 'kit.save', submitLabel: kit ? 'Save kit' : 'Create kit',
    transform: p => ({ ...(kit ? { id: kit.id, version: kit.version } : {}), name: p.name, parent_id: p.parent_id,
      kit: { kind: p.kind, check_every_hours: Math.round(p.check_every_hours), expiry_warning_days: Math.round(p.expiry_warning_days), source_location_id: p.source_location_id || null },
      contents: refs.map(r => ({ item_id: r.item.read(), quantity: r.qty.read() })) }) });
}

function sealCheck(k, kit) {
  if (kit.seal) return k.execute('kit.check', { kit_id: kit.id, result: 'ok', seal: kit.seal }, `${kit.name}: seal ${kit.seal} intact.`);
  return k.formDialog({ title: `Check ${kit.name}`, description: 'Look over the kit and note its seal number.', fields: [{ key: 'seal', label: 'Seal number', required: true }],
    command: 'kit.check', submitLabel: 'Kit checked', transform: p => ({ kit_id: kit.id, result: 'ok', seal: p.seal }) });
}

function openedDialog(k, kit) {
  return k.formDialog({ title: `${kit.name} opened`, description: 'Record that the seal was broken. Restock it as soon as you can — Kura shows it as not ready until then.',
    fields: [{ key: 'note', label: 'What happened', type: 'textarea', required: true, wide: true, placeholder: 'Code blue, Rex #5521, ICU run 3' }],
    command: 'kit.check', submitLabel: 'Record opened', transform: p => ({ kit_id: kit.id, result: 'opened', note: p.note }) });
}

export function restockDialog(k, kit) {
  const opened = kit.status === 'opened' || kit.last_check?.result === 'opened';
  const lines = kit.lines;
  const fields = lines.map((l, i) => ({ key: 'left' + i, label: `${l.name} — left in kit (of ${k.fmt(l.target)} ${l.unit})`, type: 'number', min: 0, help: l.on_hand !== l.usable ? `${k.fmt(l.on_hand - l.usable)} on record are expired or on hold.` : undefined }));
  const controlledExpired = lines.some(l => l.controlled) && kit.expired;
  return k.formDialog({ title: `Restock ${kit.name}`, wide: true,
    description: `${opened ? 'Count what is left in the kit; the difference is recorded as used. ' : ''}Kura then moves out anything expiring within ${kit.settings.expiry_warning_days} days (expired stock is written off), fills every line from the restock location with long-dated lots, and saves the new seal.`,
    initial: { ...Object.fromEntries(lines.map((l, i) => ['left' + i, l.on_hand])), source_location_id: kit.settings.source_location_id || '', reference: opened ? (kit.last_check?.note || '') : '' },
    fields: [...(opened ? fields : []), { key: 'reference', label: opened ? 'Used for (patient or code)' : 'Reference', wide: true },
      { key: 'source_location_id', label: 'Restock from', type: 'select', options: () => k.options('locations', 'Choose'), required: true },
      { key: 'seal', label: 'New seal number' }, ...(controlledExpired ? [{ key: 'witness', label: 'Witness for writing off expired controlled drugs', required: true }] : [])],
    command: 'kit.restock', submitLabel: 'Restock',
    transform: p => ({ kit_id: kit.id, source_location_id: p.source_location_id, seal: p.seal, reference: p.reference, witness: p.witness,
      counted: opened ? lines.map((l, i) => ({ item_id: l.item_id, left: p['left' + i] })) : [] }),
    onSave: r => { if (r?.short?.length) k.Toast({ message: `Not enough in stock to fill: ${r.short.map(s => `${s.item_name} (${k.fmt(s.missing)} ${s.unit})`).join(', ')}.`, tone: 'warning' }); } });
}

function historyDialog(k, kit) {
  return k.makeDialog({ title: `${kit.name} — history`, children: [el('div', { className: 'plan-list' }, kit.history.length ? kit.history.map(h => el('article', { className: 'plan-row', 'data-tone': h.result === 'ok' ? 'success' : 'warning' }, [
    el('div', { className: 'plan-main' }, [el('div', { className: 'plan-title' }, [el('strong', {}, h.type === 'restock' ? 'Restocked' : h.result === 'opened' ? 'Opened' : h.result === 'issue' ? 'Issue' : 'Checked')]),
      el('div', { className: 'plan-meta' }, [new Date(h.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), k.userName(h.by), h.seal ? `Seal ${h.seal}` : null].filter(Boolean).map(t => el('span', {}, t))),
      h.note || h.reference ? el('p', { className: 'plan-why' }, h.note || h.reference) : null, h.short?.length ? el('p', { className: 'plan-why' }, `Short: ${h.short.map(s => s.item_name).join(', ')}`) : null]),
    el('div', { className: 'plan-actions' })])) : [el('p', { className: 'muted small' }, 'No checks yet.')])] }, true);
}

function kitCard(k, kit) {
  const [tone, label] = STATUS[kit.status] || ['neutral', kit.status];
  const primary = kit.status === 'setup' ? k.act('Set contents', () => kitEditor(k, kit), 'kit.save', 'primary')
    : ['opened', 'restock', 'expired', 'expiring'].includes(kit.status) ? k.act('Restock', () => restockDialog(k, kit), 'kit.restock', 'primary')
      : k.act(kit.seal ? `Seal ${kit.seal} intact` : 'Check kit', () => sealCheck(k, kit), 'kit.check', kit.status === 'check_due' ? 'primary' : 'secondary');
  const facts = [
    ['Seal', kit.seal || (kit.status === 'opened' ? 'Broken' : '—')],
    ['Checked', kit.last_check ? `${ago(kit.hours_since_check)}` : 'Never'],
    ['Earliest expiry', day(kit.earliest_expiry)],
    ['Contents', kit.lines.length ? `${kit.lines.length - kit.missing}/${kit.lines.length} complete` : 'Not set'],
  ];
  return el('section', { className: 'kit-card', 'data-tone': tone }, [
    el('div', { className: 'kit-head' }, [el('div', {}, [el('h3', {}, kit.name), el('p', { className: 'muted small' }, `${kit.kind_label} · ${kit.area_name || '—'}`)]), el('span', { className: 'kit-status', 'data-tone': tone }, label)]),
    el('dl', { className: 'kit-facts' }, facts.map(([a, b]) => el('div', {}, [el('dt', {}, a), el('dd', {}, b)]))),
    kit.missing || kit.expired ? el('p', { className: 'plan-why' }, [kit.missing ? `Missing: ${kit.lines.filter(l => l.missing > 0).map(l => `${l.name} ×${k.fmt(l.missing)}`).join(', ')}.` : null, kit.expired ? ` ${kit.expired} expired lot(s) inside.` : null].filter(Boolean).join('')) : null,
    el('div', { className: 'kit-actions' }, [primary, kit.status !== 'opened' && kit.lines.length ? k.act('Opened…', () => openedDialog(k, kit), 'kit.check', 'ghost') : null,
      k.act('Edit', () => kitEditor(k, kit), 'kit.save', 'ghost'), Button({ label: 'History', variant: 'ghost', onClick: () => historyDialog(k, kit) }),
      k.qrLabels ? Button({ label: 'QR label', variant: 'ghost', onClick: () => k.qrLabels([k.find('locations', kit.id) || { id: kit.id, name: kit.name, type: 'kit' }]) }) : null].filter(Boolean))]);
}

/* A kit by itself — what a scanned QR label on the cart opens: its status and the one thing it needs next. */
export function kitSheet(k, kitId) {
  const kit = kitsOf(k.state).kits.find(x => x.id === kitId);
  if (!kit) return null;
  let d;
  const card = kitCard(k, kit);
  card.addEventListener('click', e => { if (e.target.closest('button')) setTimeout(() => d?.dismiss(), 0); });   // the action opens in its place
  d = k.makeDialog({ title: kit.name, description: `${kit.kind_label} · ${kit.area_name || '—'}`, children: [card] }, true);
  return d;
}

export function kitsPage(k) {
  const K = kitsOf(k.state), kits = K.kits;
  const ready = kits.filter(x => x.status === 'ready' || x.status === 'expiring').length;
  const soonest = kits.map(x => x.earliest_expiry).filter(Boolean).sort()[0];
  return [PageHeader({ title: 'Kits & carts', description: 'Crash carts, anesthesia boxes and procedure kits: complete, in date and sealed. Restocking records what was used and refills with long-dated stock.',
      actions: [k.qrLabels && kits.length ? Button({ label: 'QR labels', onClick: () => k.qrLabels(kits.map(x => k.find('locations', x.id) || { id: x.id, name: x.name, type: 'kit' })) }) : null, k.act('New kit', () => kitEditor(k), 'kit.save', 'primary', 'plus')].filter(Boolean) }),
    kits.length ? el('div', { className: 'metrics' }, [Metric({ label: 'Ready', value: `${ready}/${kits.length}`, tone: ready === kits.length ? 'success' : 'neutral', detail: 'Complete, in date, checked' }),
      Metric({ label: 'Need attention', value: String(K.not_ready), tone: K.not_ready ? 'critical' : 'neutral', detail: 'Opened, short, expired or due' }),
      Metric({ label: 'Soonest expiry inside', value: soonest ? day(soonest) : '—', detail: 'Across all kits' }),
      Metric({ label: 'Checks due', value: String(kits.filter(x => x.status === 'check_due').length), detail: 'Seal and contents' })]) : null,
    kits.length ? el('div', { className: 'kit-grid' }, kits.map(x => kitCard(k, x)))
      : EmptyState({ title: 'No kits yet', icon: 'clipboard', description: 'Add your crash carts and anesthesia boxes. List what a full kit holds; Kura tells you when one is opened, short, expiring or due for its check.', action: k.act('New kit', () => kitEditor(k), 'kit.save', 'primary') })];
}
