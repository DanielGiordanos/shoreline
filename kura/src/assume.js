/* Ask less, assume more.
   - This device knows where it is ("This device is in ICU") and uses that as the location everywhere.
   - Ordinary movements fill their own reason ("Used", "Received"); waste, disposal, count corrections, emergencies and
     controlled drugs still ask, because those reasons are the record.
   - A scan asks one thing afterwards: Use, Add, Move or Count.
   - A new item without a SKU gets one from its name (the engine makes the same one: backend/core.py sku_from_name).
   Per-device choices live in this browser only (localStorage), never in the shared inventory. */
import { el, Button, Icon } from './ui/components.js?v=3a7528f6ad';

const DEVICE_KEY = 'kura-device-location', LAST_KEY = 'kura-scan-last';
const read = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
const write = (key, value) => { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* private window: fine */ } };

/* ---------- this device's location ---------- */
export function deviceLocation(list) {
  const id = read(DEVICE_KEY);
  return id && list('locations').some(l => l.id === id && l.status !== 'inactive') ? id : '';
}
export const setDeviceLocation = id => write(DEVICE_KEY, id);

/* "This device is in ICU · Change". A select styled as a pill; choosing saves it for this device. */
export function deviceChip({ list, options, onChange }) {
  const current = deviceLocation(list);
  const select = el('select', { className: 'kura-device-select', 'aria-label': 'This device is in', onChange: e => { setDeviceLocation(e.target.value); document.querySelectorAll('.kura-device-select').forEach(x => { x.value = e.target.value; }); onChange?.(e.target.value); } },
    [el('option', { value: '' }, 'Not set'), ...options('locations').filter(o => o.value).map(o => el('option', { value: o.value }, o.label))]);
  select.value = current;
  return el('label', { className: 'kura-device' }, [Icon('location'), el('span', {}, 'This device is in'), select]);
}

/* The location a movement starts from, when nobody said:
   taking stock out → this device's location if the item is there, else wherever it has the most;
   putting stock in → this device's location, else where the item already lives, else the first area. */
export function bestLocation({ item, kind, list }) {
  const here = deviceLocation(list);
  const avail = new Map();
  for (const b of list('balances')) if (b.item_id === item.id) avail.set(b.location_id, (avail.get(b.location_id) || 0) + Number(b.available || 0));
  const out = ['use', 'waste', 'dispose', 'transfer', 'emergency', 'adjust'].includes(kind);
  if (out) {
    if (here && avail.get(here) > 0) return here;
    const most = [...avail.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
    if (most) return most[0];
  }
  if (here) return here;
  const lives = [...avail.keys()][0];
  return lives || list('locations').find(l => l.type !== 'hospital')?.id || list('locations')[0]?.id || '';
}

/* ---------- reasons ---------- */
export const DEFAULT_REASON = { receive: 'Received', use: 'Used', return: 'Returned to stock', transfer: 'Moved', opening: 'Opening balance' };
/* Does this movement need a typed reason? (The reason is the record for these.) */
export const needsReason = (kind, item) => !DEFAULT_REASON[kind] || !!item?.dea_schedule;

/* ---------- SKU from the name (same rule as backend/core.py sku_from_name) ---------- */
export function skuFromName(name) {
  const words = String(name || '').replace(/\([^)]*\)/g, ' ').match(/[A-Za-z]+|\d+(?:\.\d+)?/g) || [];
  const letters = words.filter(w => /^[A-Za-z]+$/.test(w)), numbers = words.filter(w => !/^[A-Za-z]+$/.test(w));
  if (!letters.length && !numbers.length) return 'ITEM';
  const head = (letters[0] ? letters[0].slice(0, 4) : 'ITEM').toUpperCase();
  const tail = numbers.length ? numbers[0].replace('.', '') : letters[1] ? letters[1].slice(0, 3).toUpperCase() : '';
  return head + (tail ? '-' + tail : '');
}

/* The SKU the engine will give a new item, skipping ones in use (MARO-10, then MARO-10-2…) */
export function nextSku(name, items) {
  const base = skuFromName(name), taken = new Set(items.map(i => String(i.sku || '').toLowerCase()).filter(Boolean));
  let sku = base, n = 2;
  while (taken.has(sku.toLowerCase())) sku = `${base}-${n++}`;
  return sku;
}

/* ---------- after a scan: one question ---------- */
export const SCAN_ACTIONS = [
  { id: 'use', label: 'Use', detail: 'Take from stock', icon: 'minus' },
  { id: 'receive', label: 'Add', detail: 'Receive or put back', icon: 'plus' },
  { id: 'transfer', label: 'Move', detail: 'To another location', icon: 'arrow-right' },
  { id: 'count', label: 'Count', detail: 'Set what’s really here', icon: 'check-circle' },
];
export const lastScanAction = () => read(LAST_KEY) || 'use';

/* k: { makeDialog, list, fmt, locationName, canDo(id), onPick(id, item, prefill), onDetails(item) } */
export function scanSheet(k, item, prefill = {}, note = '') {
  const allowed = SCAN_ACTIONS.filter(a => k.canDo(a.id));
  const here = deviceLocation(k.list);
  const at = (loc) => k.list('balances').filter(b => b.item_id === item.id && (!loc || b.location_id === loc)).reduce((n, b) => n + Number(b.available || 0), 0);
  const where = here ? `${k.fmt(at(here))} ${item.base_unit} in ${k.locationName(here)} · ${k.fmt(at())} in all` : `${k.fmt(at())} ${item.base_unit} available`;
  let dialog;
  const last = lastScanAction();
  const pick = id => { write(LAST_KEY, id); dialog.close(); k.onPick(id, item, prefill); };
  const grid = el('div', { className: 'scan-choices' }, allowed.map(a => el('button', { type: 'button', className: `scan-choice${a.id === last ? ' is-last' : ''}`, 'aria-label': `${a.label}, ${a.detail.toLowerCase()}`, onClick: () => pick(a.id) },
    [el('span', { className: 'scan-choice-icon' }, [Icon(a.icon)]), el('b', {}, a.label), el('small', {}, a.detail)])));
  dialog = k.makeDialog({ title: item.name, description: [where, note].filter(Boolean).join(' · '), children: [grid,
    el('div', { className: 'scan-sheet-foot' }, [Button({ label: 'Item details', variant: 'ghost', size: 'sm', onClick: () => { dialog.close(); k.onDetails(item); } })])] });
  dialog.classList.add('scan-sheet');
  requestAnimationFrame(() => (grid.querySelector('.is-last') || grid.firstChild)?.focus());
  return dialog;
}
