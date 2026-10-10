/* Controlled drugs — the DEA record for Schedule II–V items (engine: backend/controlled.py → state.controlled).
   Safes and when each was last counted, open discrepancies, doses missing a patient or witness, the log with
   running balances, counts with a second person, and the initial / biennial inventory and destruction records.
   Every change goes through an engine command; nothing here edits a record after the fact. */
import { el, Button, Card, Dropdown, EmptyState, Metric, PageHeader, Tabs } from './ui/components.js?v=3a7528f6ad';

const KIND = { receive: 'Received', use: 'Given', emergency: 'Given (emergency)', waste: 'Wasted', dispose: 'Disposed', adjust: 'Count correction', opening: 'Opening balance',
  return: 'Returned to stock', transfer: 'Moved', reverse: 'Reversal' };
const when = iso => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const ago = h => h == null ? 'never' : h < 1 ? 'under an hour ago' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
const cplan = state => state.controlled || { enabled: false, safes: [], log: {}, needs: [], open: [], counts: [], items: [] };
const sched = s => el('span', { className: 'cs-badge', 'data-schedule': s }, `C-${s}`);
const row = (tone, title, meta, why, actions, tag) => el('article', { className: 'plan-row', 'data-tone': tone }, [
  el('div', { className: 'plan-main' }, [el('div', { className: 'plan-title' }, [el('strong', {}, title), tag ? el('span', { className: 'plan-tag', 'data-tone': tone }, tag) : null]),
    meta?.length ? el('div', { className: 'plan-meta' }, meta.filter(Boolean).map(m => el('span', {}, m))) : null, why ? el('p', { className: 'plan-why' }, why) : null]),
  el('div', { className: 'plan-actions' }, (actions || []).filter(Boolean))]);

/* ---------- counting a safe (blind: the expected amounts stay hidden until you save) ---------- */
export function countDialog(k, locationId, purpose = 'shift') {
  const C = cplan(k.state), all = purpose !== 'shift';
  const safes = all ? C.safes : C.safes.filter(s => s.location_id === locationId);
  const lines = safes.flatMap(s => s.drugs.flatMap(d => d.lots.map(l => ({ ...l, item_id: d.item_id, name: d.name, unit: d.unit, schedule: d.schedule, location_id: s.location_id, location_name: s.location_name }))));
  if (!lines.length) { k.Toast({ message: 'No controlled drugs are on record here.', tone: 'info' }); return; }
  const fields = lines.map((l, i) => ({ key: 'l' + i, label: `${all ? l.location_name + ' · ' : ''}${l.name}${l.code ? ` · lot ${l.code}` : ''} (${l.unit})`, type: 'number', min: 0, required: true }));
  const title = purpose === 'shift' ? `Count ${safes[0]?.location_name || 'safe'}` : purpose === 'biennial' ? 'Biennial inventory' : 'Initial inventory';
  return k.formDialog({ title, wide: true,
    description: `${purpose === 'shift' ? 'Count every controlled drug here' : 'Count every controlled drug in the hospital'} with a second person. Enter what you see — Kura shows any difference after you save.${purpose !== 'shift' ? ' DEA: an inventory is an exact physical count, taken at the opening or close of business; keep it for at least two years.' : ''}`,
    fields: [...fields, { key: 'witness', label: 'Second person (witness)', required: true, help: 'Their full name. They count with you.' }, { key: 'note', label: 'Note', type: 'textarea', wide: true }],
    command: 'controlled.count', submitLabel: 'Save count',
    transform: p => ({ purpose, location_id: all ? null : locationId, witness: p.witness, note: p.note, lines: lines.map((l, i) => ({ item_id: l.item_id, location_id: l.location_id, lot_id: l.lot_id, actual: p['l' + i] })) }),
    onSave: result => { if (result?.status === 'discrepancy') resolveDialog(k, result); else k.Toast({ message: 'Count matches the record.' }); } });
}

export function resolveDialog(k, rec) {
  const off = (rec.lines || []).filter(l => l.difference);
  const summary = el('div', { className: 'plan-list' }, off.map(l => row(l.difference < 0 ? 'critical' : 'warning', k.itemName(l.item_id), [k.locationName(l.location_id), l.lot_code ? `Lot ${l.lot_code}` : null,
    `Record ${k.fmt(l.expected)} ${l.unit}`, `Counted ${k.fmt(l.actual)} ${l.unit}`], `${l.difference < 0 ? 'Short' : 'Over'} by ${k.fmt(Math.abs(l.difference))} ${l.unit}.`)));
  const form = k.formDialog({ title: 'Resolve a count discrepancy', wide: true,
    description: `Counted ${when(rec.at)} with ${rec.witness}. Explain what happened. If it was a significant loss or theft, DEA requires a written report within one business day of discovery and DEA Form 106 once the investigation is complete; tell your state board and local police too.`,
    children: [summary],
    initial: { adjust: true },
    fields: [{ key: 'explanation', label: 'What happened', type: 'textarea', required: true, wide: true, help: 'For example: “0.5 mL waste at 02:10 for Max was not logged; Dr. Lee confirmed.” This stays in the DEA record.' },
      { key: 'adjust', label: 'Correct Kura’s stock to the counted amount', type: 'checkbox' },
      { key: 'significant_loss', label: 'This is a significant loss or theft', type: 'checkbox' },
      { key: 'form_106', label: 'DEA Form 106 reference (when filed)' }],
    command: 'controlled.resolve', submitLabel: 'Resolve', transform: p => ({ id: rec.id, ...p }) });
  return form;
}

function attestDialog(k, need) {
  return k.formDialog({ title: need.missing === 'witness' ? 'Add the witness' : 'Add the patient',
    description: `${need.item_name} · ${k.fmt(need.quantity)} · ${when(need.timestamp)}. The original entry stays as it was; this adds a signed note to it.`,
    fields: need.missing === 'witness' ? [{ key: 'witness', label: 'Witness (full name)', required: true }, { key: 'note', label: 'Note', type: 'textarea', wide: true }]
      : [{ key: 'patient', label: 'Patient (name and record number)', required: true }, { key: 'note', label: 'Note', type: 'textarea', wide: true }],
    command: 'controlled.attest', submitLabel: 'Add', transform: p => ({ entry_id: need.entry_id, ...p }) });
}

export function deaSettings(k) {
  const d = k.settingData('dea', {});
  return k.formDialog({ title: 'DEA registration', description: 'Printed on the inventory and destruction records. Kura checks the DEA number’s check digit.',
    initial: { registrant: d.registrant || '', dea_number: d.dea_number || '', address: d.address || '', count_every_hours: d.count_every_hours || 24 },
    fields: [{ key: 'registrant', label: 'Registrant (practitioner or hospital)', wide: true }, { key: 'dea_number', label: 'DEA registration number' },
      { key: 'count_every_hours', label: 'Count each safe every (hours)', type: 'number', min: 4, help: '12 for every shift, 24 for daily.' }, { key: 'address', label: 'Registered address', type: 'textarea', wide: true }],
    command: 'setting.save', transform: p => ({ id: 'dea', data: { registrant: p.registrant, dea_number: p.dea_number, address: p.address, count_every_hours: Math.round(p.count_every_hours) } }) });
}

function markControlled(k) {
  const items = k.list('items').filter(i => (i.status || 'active') === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const likely = i => /morph|hydromorph|fentanyl|buprenorph|butorphanol|methadone|ketamine|midazolam|diazepam|alprazolam|phenobarb|pentobarb|tramadol|gabapentin|testosterone|tiletamine|telazol|euthan/i.test(`${i.name} ${i.generic_name || ''}`);
  const sorted = [...items.filter(likely), ...items.filter(i => !likely(i))];
  return k.formDialog({ title: 'Mark controlled drugs', wide: true, description: 'Choose each item’s DEA schedule. Likely candidates are listed first — check the schedule printed on the label (C-II to C-V). Some states also schedule drugs that are not federally controlled, so check Connecticut’s list too.',
    fields: sorted.slice(0, 120).map(i => ({ key: i.id, label: i.name, type: 'select', options: [{ value: '', label: 'Not controlled' }, ...['II', 'III', 'IV', 'V'].map(s => ({ value: s, label: `Schedule ${s}` }))] })),
    initial: Object.fromEntries(items.map(i => [i.id, i.dea_schedule || ''])),
    submitLabel: 'Save schedules',
    onSave: async p => { for (const i of items) if ((p[i.id] ?? '') !== (i.dea_schedule || '') && Object.hasOwn(p, i.id)) { const { created_at, updated_at, ...rest } = i; await k.api.command('item.save', { ...rest, dea_schedule: p[i.id] || null }); } } });
}

/* ---------- printable records ---------- */
function printRecord(k, title, intro, sections) {
  const reg = cplan(k.state).registrant || {};
  const body = el('div', { className: 'cs-print' }, [
    el('header', {}, [el('h2', {}, title), el('p', {}, [reg.registrant || 'Registrant: ________', ' · DEA ', reg.dea_number || '________']), reg.address ? el('p', {}, reg.address) : null, el('p', {}, intro)]),
    ...sections.map(([heading, columns, rows]) => el('section', {}, [el('h3', {}, heading), el('table', { className: 'cs-print-table' }, [
      el('thead', {}, el('tr', {}, columns.map(c => el('th', {}, c)))), el('tbody', {}, rows.length ? rows.map(r => el('tr', {}, r.map(c => el('td', {}, String(c ?? '—'))))) : el('tr', {}, el('td', { colspan: columns.length }, 'None')))])])),
    el('footer', {}, [el('p', {}, 'Signature of registrant: ______________________   Date: ____________'), el('p', {}, 'Witness: ______________________')])]);
  const dialog = k.makeDialog({ title, children: [body, el('div', { className: 'form-actions' }, [Button({ label: 'Close', onClick: () => dialog.dismiss() }), Button({ label: 'Print', variant: 'primary', icon: 'download', onClick: () => { dialog.classList.add('printing'); window.print(); } })])] });
  dialog.classList.add('kura-editor');
}

function inventoryRecord(k, countId) {
  const c = cplan(k.state).counts.find(x => x.id === countId);
  if (!c) return;
  const by = s => c.lines.filter(l => (s === 'II') === (l.schedule === 'II'));
  const rowsOf = ls => ls.map(l => [k.itemName(l.item_id), `C-${l.schedule}`, k.locationName(l.location_id), l.lot_code, `${k.fmt(l.actual)} ${l.unit}`]);
  printRecord(k, `${c.purpose === 'biennial' ? 'Biennial' : 'Initial'} inventory of controlled substances`,
    `Taken ${new Date(c.at).toLocaleString()} by ${k.userName(c.by)} with ${c.witness}. Exact physical count of every controlled substance on hand.`,
    [['Schedule II (kept separate)', ['Drug, form and strength', 'Schedule', 'Location', 'Lot', 'Quantity'], rowsOf(by('II'))],
     ['Schedules III–V', ['Drug, form and strength', 'Schedule', 'Location', 'Lot', 'Quantity'], rowsOf(by('other'))]]);
}

function destructionRecord(k) {
  const C = cplan(k.state);
  const rows = Object.values(C.log).flat().filter(r => r.kind === 'dispose').map(r => [when(r.timestamp), k.itemName(r.item_id), r.lot_code, `${k.fmt(Math.abs(r.quantity))}`, r.method, r.distributor || [r.witness, r.witness_2].filter(Boolean).join(' & '), r.dea_order_ref]);
  printRecord(k, 'Controlled substances disposed of', 'On-site destruction (the DEA Form 41 record, with two witnesses) and returns to a reverse distributor.',
    [['Disposals', ['When', 'Drug', 'Lot', 'Quantity', 'How', 'Witnesses / distributor', 'Form 222'], rows]]);
}

function exportLog(k, itemId) {
  const C = cplan(k.state), rows = C.log[itemId] || [];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [['When', 'What', 'Quantity', 'Balance', 'Location', 'From', 'To', 'Lot', 'Patient or reference', 'By', 'Witness', 'Second witness', 'Form 222 / CSOS', 'Disposal', 'Reverse distributor', 'Reason']]
    .concat(rows.map(r => [r.timestamp, KIND[r.kind] || r.kind, r.quantity, r.balance, r.location, r.from, r.to, r.lot_code, r.reference, k.userName(r.actor_id), r.witness, r.witness_2, r.dea_order_ref, r.method, r.distributor, r.reason]))
    .map(r => r.map(q).join(',')).join('\n');
  const a = el('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `controlled-log-${k.itemName(itemId).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv` });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- the page ---------- */
let chosenDrug = null;
export function controlledPage(k) {
  const C = cplan(k.state);
  if (!C.enabled) return [PageHeader({ title: 'Controlled drugs', description: 'The DEA record for Schedule II–V drugs: every dose, waste, return and count, with running balances.' }),
    EmptyState({ title: 'No controlled drugs yet', icon: 'shield', description: 'Give each controlled item its DEA schedule. From then on Kura asks for the patient on every dose, a witness for waste, and keeps the log.',
      action: k.act('Mark controlled drugs', () => markControlled(k), 'item.save', 'primary') })];
  const reg = C.registrant || {};
  const due = C.safes.filter(s => s.due);
  const alerts = [
    ...C.open.map(c => row('critical', `Discrepancy in ${c.location_id ? k.locationName(c.location_id) : 'the hospital inventory'}`, [when(c.at), `with ${c.witness}`, `${c.lines.filter(l => l.difference).length} drug(s) off`],
      'Explain it before the next count. Kura only corrects stock if you choose to.', [k.act('Resolve', () => resolveDialog(k, c), 'controlled.resolve', 'primary')], 'Open')),
    ...due.map(s => row('warning', `Count ${s.location_name}`, [`Last counted ${ago(s.hours_since_count)}`, `${s.drugs.length} drug(s)`], null, [k.act('Count now', () => countDialog(k, s.location_id), 'controlled.count', 'primary')], 'Due')),
    ...C.needs.slice(0, 10).map(n => row('warning', n.item_name, [when(n.timestamp), `${k.fmt(n.quantity)}`], n.missing === 'witness' ? 'Wasted without a witness on record.' : 'Given without a patient on record (it came from Treatment Sheets or an older entry).',
      [k.act(n.missing === 'witness' ? 'Add witness' : 'Add patient', () => attestDialog(k, n), 'controlled.attest')], n.missing === 'witness' ? 'No witness' : 'No patient'))];
  const safes = el('div', { className: 'cs-safes' }, C.safes.map(s => el('section', { className: 'cs-safe', 'data-due': String(s.due) }, [
    el('div', { className: 'cs-safe-head' }, [el('div', {}, [el('h3', {}, s.location_name), el('p', { className: 'muted small' }, s.last_count ? `Counted ${ago(s.hours_since_count)} · ${k.userName(s.last_count.by)} with ${s.last_count.witness}` : 'Not counted yet')]),
      k.act('Count', () => countDialog(k, s.location_id), 'controlled.count', s.due ? 'primary' : 'secondary')]),
    el('ul', { className: 'cs-drugs' }, s.drugs.map(d => el('li', {}, [sched(d.schedule), el('span', {}, d.name), el('b', {}, `${k.fmt(d.on_hand)} ${d.unit}`)])))])));
  chosenDrug = C.items.some(i => i.item_id === chosenDrug) ? chosenDrug : C.items[0]?.item_id;
  const logBox = el('div');
  const drawLog = () => {
    const rows = C.log[chosenDrug] || [], item = C.items.find(i => i.item_id === chosenDrug);
    logBox.replaceChildren(el('div', { className: 'cs-log-head' }, [
      Dropdown({ label: 'Drug', value: chosenDrug, options: C.items.map(i => ({ value: i.item_id, label: `${i.name} (C-${i.schedule})` })), onChange: v => { chosenDrug = v; drawLog(); } }),
      item ? el('div', { className: 'cs-balance' }, [el('small', {}, 'Balance on record'), el('strong', {}, `${k.fmt(item.balance)} ${item.unit}`)]) : null,
      Button({ label: 'Export CSV', icon: 'download', variant: 'secondary', onClick: () => exportLog(k, chosenDrug) })]),
      k.pagedTable({ caption: 'Controlled substance log', rows, columns: [
        { label: 'When', render: r => when(r.timestamp) }, { label: 'What', render: r => el('span', {}, [KIND[r.kind] || r.kind, r.reversal ? ' (reversed)' : '']) },
        { label: 'Qty', numeric: true, render: r => r.kind === 'transfer' ? k.fmt(r.quantity) : (r.quantity > 0 ? '+' : '') + k.fmt(r.quantity) },
        { label: 'Balance', numeric: true, render: r => k.fmt(r.balance) },
        { label: 'Where', render: r => r.kind === 'transfer' ? `${r.from} → ${r.to}` : r.location },
        { label: 'Patient / reference', render: r => r.reference || (['use', 'emergency'].includes(r.kind) ? el('span', { className: 'cs-missing' }, 'Missing') : '—') },
        { label: 'By', render: r => k.userName(r.actor_id) },
        { label: 'Witness / record', render: r => [r.witness, r.witness_2].filter(Boolean).join(' & ') || r.distributor || r.dea_order_ref || (r.kind === 'waste' ? el('span', { className: 'cs-missing' }, 'Missing') : '—') }],
        empty: EmptyState({ title: 'No movements yet', icon: 'list' }) }));
  };
  drawLog();
  const counts = el('div', { className: 'plan-list' }, C.counts.filter(c => c.type === 'count').map(c => row(c.status === 'discrepancy' ? 'critical' : c.status === 'resolved' ? 'warning' : 'success',
    `${c.purpose === 'shift' ? (c.location_id ? k.locationName(c.location_id) : 'Hospital') : c.purpose === 'biennial' ? 'Biennial inventory' : 'Initial inventory'}`,
    [when(c.at), `${k.userName(c.by)} with ${c.witness}`, `${c.lines.length} line(s)`], c.explanation || c.note || null,
    [c.purpose !== 'shift' ? Button({ label: 'Print', variant: 'secondary', onClick: () => inventoryRecord(k, c.id) }) : null, c.status === 'discrepancy' ? k.act('Resolve', () => resolveDialog(k, c), 'controlled.resolve', 'primary') : null],
    { ok: 'Matched', discrepancy: 'Discrepancy', resolved: c.adjusted ? 'Resolved · corrected' : 'Resolved' }[c.status])));
  const reports = el('div', { className: 'stack' }, [
    Card({ title: 'Initial and biennial inventory', description: C.last_inventory ? `Last: ${C.last_inventory.purpose} inventory ${when(C.last_inventory.at)}. Next one due by ${new Date(C.biennial_due + 'T12:00:00').toLocaleDateString([], { dateStyle: 'medium' })} (every two years).` : 'No inventory on record. DEA requires one when you start handling controlled drugs and then at least every two years.',
      children: [el('div', { className: 'inline' }, [k.act(C.last_inventory ? 'Take biennial inventory' : 'Take initial inventory', () => countDialog(k, null, C.last_inventory ? 'biennial' : 'initial'), 'controlled.count', 'primary'),
        C.last_inventory ? Button({ label: 'Print last inventory', variant: 'secondary', onClick: () => inventoryRecord(k, C.last_inventory.id) }) : null])] }),
    Card({ title: 'Disposals', description: 'On-site destruction with two witnesses (the DEA Form 41 record) and returns to a reverse distributor.', children: [Button({ label: 'Print disposal record', variant: 'secondary', onClick: () => destructionRecord(k) })] }),
    Card({ title: 'Which drugs are controlled', description: 'Set or change DEA schedules.', children: [k.act('Mark controlled drugs', () => markControlled(k), 'item.save', 'secondary')] })]);
  return [PageHeader({ title: 'Controlled drugs', description: 'The DEA record for Schedule II–V drugs: every dose, waste, return and count, with running balances. Kura keeps the record; the registrant remains responsible for it.',
      actions: [k.act('DEA registration', () => deaSettings(k), 'setting.save', 'secondary', 'shield'), due[0] ? k.act(`Count ${due[0].location_name}`, () => countDialog(k, due[0].location_id), 'controlled.count', 'primary') : null] }),
    el('div', { className: 'cs-registrant', 'data-ok': String(!!reg.dea_number && C.dea_number_valid !== false) }, reg.dea_number
      ? [el('strong', {}, reg.registrant || 'Registrant'), el('span', {}, ` · DEA ${reg.dea_number}`), C.dea_number_valid === false ? el('span', { className: 'cs-missing' }, ' · check digit does not match') : null]
      : [el('span', {}, 'Add your DEA registration so it prints on the records. '), k.act('Add', () => deaSettings(k), 'setting.save', 'ghost')]),
    el('div', { className: 'metrics' }, [Metric({ label: 'Safes due for a count', value: String(due.length), tone: due.length ? 'warning' : 'neutral', detail: `Every ${C.count_every_hours} h` }),
      Metric({ label: 'Open discrepancies', value: String(C.open.length), tone: C.open.length ? 'critical' : 'neutral', detail: 'Need an explanation' }),
      Metric({ label: 'Missing patient or witness', value: String(C.needs.length), tone: C.needs.length ? 'warning' : 'neutral', detail: 'Add it to the record' }),
      Metric({ label: 'Controlled drugs', value: String(C.items.length), detail: `${C.items.filter(i => i.schedule === 'II').length} Schedule II` })]),
    alerts.length ? el('div', { className: 'plan-list' }, alerts) : null,
    safes,
    Tabs({ items: [{ id: 'log', label: 'Log', content: logBox }, { id: 'counts', label: `Counts (${C.counts.filter(c => c.type === 'count').length})`, content: counts }, { id: 'reports', label: 'Records', content: reports }] })];
}
