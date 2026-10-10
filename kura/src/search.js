/* Search everything — ⌘K / Ctrl+K, "/", or the search button in the header (and on iPhone).
   One field across items (name, SKU, generic name, barcode), lots, orders, kits, safes, locations, vendors and pages.
   Results are grouped, best first; Enter opens the top one, arrow keys move. Everything is on this device:
   nothing is sent anywhere. */
import { el, Icon } from './ui/components.js?v=3a7528f6ad';
import { ROUTES } from './nav.js?v=3a7528f6ad';

const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/* 3 = exact, 2 = starts with, 1.5 = a word starts with, 1 = contains, 0 = no match */
function score(q, ...fields) {
  let best = 0;
  for (const f of fields) {
    const t = norm(f); if (!t) continue;
    if (t === q) return 3;
    if (t.startsWith(q)) best = Math.max(best, 2);
    else if (t.split(/[\s·,/()-]+/).some(w => w.startsWith(q))) best = Math.max(best, 1.5);
    else if (t.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

/* k: { state, list, find, fmt, locationName, vendorName, navigate, itemDrawer, orderDrawer, locationDrawer, vendorDrawer,
        kitSheet, makeDialog, available } */
export function searchIndex(k, query) {
  const q = norm(query).trim();
  if (!q) return [];
  const groups = [];
  const add = (label, rows, limit = 6) => { const r = rows.filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit); if (r.length) groups.push({ label, rows: r }); };
  const items = k.list('items');
  add('Items', items.map(i => ({ score: score(q, i.name, i.sku, i.generic_name, i.brand, ...(i.barcodes || [])) + (i.status === 'inactive' ? -0.5 : 0),
    title: i.name, detail: [i.sku, `${k.fmt(k.available(i.id))} ${i.base_unit} available`].filter(Boolean).join(' · '), icon: 'package', open: () => k.itemDrawer(i) })));
  add('Lots', k.list('lots').map(l => { const i = k.find('items', l.item_id); return { score: score(q, l.code, l.lot_code) * 1.1,
    title: `Lot ${l.code || l.lot_code}`, detail: [i?.name, l.expires ? `expires ${String(l.expires).slice(0, 10)}` : null, l.status && l.status !== 'active' ? l.status : null].filter(Boolean).join(' · '), icon: 'barcode', open: () => i && k.itemDrawer(i) }; }), 4);
  add('Orders', k.list('orders').map(o => ({ score: Math.max(score(q, o.number, o.order_number, o.id.slice(0, 8)), score(q, k.vendorName(o.vendor_id)) * .8),
    title: `${k.vendorName(o.vendor_id)} · #${o.number || o.order_number || o.id.slice(0, 8)}`, detail: [String(o.status || '').replaceAll('_', ' '), `to ${k.locationName(o.location_id)}`].join(' · '), icon: 'truck', open: () => k.orderDrawer(o) })), 4);
  const kits = (k.state.kits?.kits || []);
  add('Kits & carts', kits.map(x => ({ score: score(q, x.name, x.kind_label, x.seal), title: x.name, detail: [x.kind_label, x.area_name].filter(Boolean).join(' · '), icon: 'clipboard', open: () => k.kitSheet(x.id) })), 4);
  const safes = (k.state.controlled?.safes || []);
  add('Safes', safes.map(x => ({ score: score(q, x.location_name, 'safe'), title: x.location_name, detail: 'Controlled drugs', icon: 'shield', open: () => k.navigate('controlled') })), 3);
  const kitIds = new Set(kits.map(x => x.id)), safeIds = new Set(safes.map(x => x.location_id));
  add('Locations', k.list('locations').filter(l => !kitIds.has(l.id) && !safeIds.has(l.id)).map(l => ({ score: score(q, l.name, l.code), title: l.name, detail: [String(l.type || '').replaceAll('_', ' '), l.parent_id ? `in ${k.locationName(l.parent_id)}` : null].filter(Boolean).join(' · '), icon: 'location', open: () => k.locationDrawer(l) })), 4);
  add('Vendors', k.list('vendors').map(v => ({ score: score(q, v.name, v.account_number), title: v.name, detail: v.contact || v.email || 'Vendor', icon: 'people', open: () => k.vendorDrawer(v) })), 3);
  add('Go to', [...ROUTES, ['brief', 'Morning brief', 'clock']].filter((r, i, a) => a.findIndex(x => x[0] === r[0]) === i).map(([id, label, icon]) => ({ score: score(q, label, id) * .9, title: label, detail: 'Page', icon, open: () => k.navigate(id) })), 3);
  return groups;
}

let open = null;
export function openSearch(k, initial = '') {
  if (open?.isConnected) { open.querySelector('input')?.focus(); return open; }
  const input = el('input', { type: 'search', className: 'kura-search-input', placeholder: 'Search items, lots, orders, kits, places…', 'aria-label': 'Search Kura', autocomplete: 'off', spellcheck: 'false', value: initial });
  const results = el('div', { className: 'kura-search-results', role: 'region', 'aria-live': 'polite', 'aria-label': 'Results' });
  let dialog;
  const go = row => { dialog.dismiss(); setTimeout(() => row.open(), 0); };
  function draw() {
    const groups = searchIndex(k, input.value);
    if (!input.value.trim()) { results.replaceChildren(el('p', { className: 'kura-search-hint' }, 'Type a name, SKU, barcode, lot, order number, kit or place. Enter opens the first result.')); return; }
    if (!groups.length) { results.replaceChildren(el('p', { className: 'kura-search-hint' }, `Nothing matches “${input.value.trim()}”.`)); return; }
    results.replaceChildren(...groups.map(g => el('section', { className: 'kura-search-group' }, [el('h3', {}, g.label),
      el('ul', { role: 'list' }, g.rows.map(r => el('li', {}, [el('button', { type: 'button', className: 'kura-search-row', onClick: () => go(r) },
        [el('span', { className: 'kura-search-icon' }, [Icon(r.icon || 'search')]), el('span', { className: 'kura-search-text' }, [el('b', {}, r.title), r.detail ? el('small', {}, r.detail) : null])])])))])));
  }
  input.addEventListener('input', draw);
  input.addEventListener('keydown', e => {
    const rows = [...results.querySelectorAll('.kura-search-row')];
    if (e.key === 'Escape') { e.preventDefault(); dialog.dismiss(); return; }      // one Esc closes (a search field would only clear)
    if (e.key === 'Enter') { e.preventDefault(); rows[0]?.click(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); rows[0]?.focus(); }
  });
  results.addEventListener('keydown', e => {
    const rows = [...results.querySelectorAll('.kura-search-row')], i = rows.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); rows[Math.min(rows.length - 1, i + 1)]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i <= 0 ? input : rows[i - 1]).focus(); }
  });
  dialog = k.makeDialog({ title: 'Search', children: [el('div', { className: 'kura-search-box' }, [Icon('search'), input]), results] });
  dialog.classList.add('kura-search');
  dialog.addEventListener('close', () => { open = null; }, { once: true });
  open = dialog; draw();
  requestAnimationFrame(() => { input.focus(); input.select(); });
  return dialog;
}
