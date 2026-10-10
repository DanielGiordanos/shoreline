/* Kura's navigation: five groups in the sidebar, and on an iPhone a bottom tab bar (Today · Stock · Scan · Orders · More).
   Pages keep their ids (#inventory, #orders…), so links, notifications and tests stay the same. */
import { el, Icon } from './ui/components.js?v=3a7528f6ad';

export const NAV = [
  { id: 'today', label: 'Today', items: [['overview', 'Overview', 'grid'], ['brief', 'Morning brief', 'clock']] },
  { id: 'stock', label: 'Stock', items: [['inventory', 'Inventory', 'package'], ['scan', 'Scan', 'barcode'], ['locations', 'Locations', 'home'], ['expiry', 'Expiry & recalls', 'calendar'], ['kits', 'Kits & carts', 'clipboard'], ['counts', 'Counts', 'check-circle']] },
  { id: 'purchasing', label: 'Purchasing', items: [['replenish', 'Replenish', 'refresh'], ['orders', 'Orders & receiving', 'boxes'], ['vendors', 'Vendors', 'people']] },
  { id: 'records', label: 'Records', items: [['controlled', 'Controlled drugs', 'shield'], ['activity', 'Activity', 'clock'], ['insights', 'Insights', 'layers']] },
  { id: 'settings', label: 'Settings', items: [['integrations', 'Integrations', 'layers'], ['settings', 'Settings & setup', 'settings']] },
];
/* Every page, flat, in sidebar order: [id, label, icon] */
export const ROUTES = NAV.flatMap(g => g.items);
export const groupOf = id => NAV.find(g => g.items.some(([p]) => p === id))?.id || 'today';

/* The phone's five tabs. A tab is "on" for every page in its group. */
const TABS = [
  { id: 'overview', label: 'Today', icon: 'grid', on: p => groupOf(p) === 'today' },
  { id: 'inventory', label: 'Stock', icon: 'package', on: p => groupOf(p) === 'stock' && p !== 'scan' },
  { id: 'scan', label: 'Scan', icon: 'barcode', on: p => p === 'scan', primary: true },
  { id: 'orders', label: 'Orders', icon: 'boxes', on: p => groupOf(p) === 'purchasing' },
  { id: 'more', label: 'More', icon: 'list', on: p => ['records', 'settings'].includes(groupOf(p)) },
];

/* Sidebar: group headings with their pages. `onSelect(id)` navigates. */
export function groupedNav({ activeId, onSelect, counts = {} }) {
  const root = el('nav', { className: 'kura-nav', 'aria-label': 'Kura' });
  for (const g of NAV) {
    const headId = `kura-nav-${g.id}`;
    root.append(el('div', { className: 'kura-nav-group', role: 'group', 'aria-labelledby': headId }, [
      el('div', { className: 'kura-nav-head', id: headId }, g.label),
      el('ul', { className: 'pv-sidebar-list' }, g.items.map(([id, label, icon]) => el('li', {}, [
        el('button', { className: 'pv-sidebar-item', type: 'button', dataset: { id }, 'aria-current': id === activeId ? 'page' : null, onClick: () => onSelect(id) },
          [Icon(icon), el('span', {}, label), counts[id] ? el('em', { className: 'kura-nav-count', 'aria-label': `${counts[id]} need attention` }, String(counts[id])) : null]),
      ]))),
    ]));
  }
  return root;
}
export function markNav(root, id) {
  root?.querySelectorAll('[data-id]').forEach(b => { if (b.dataset.id === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
}

/* iPhone tab bar. `onMore` opens the full grouped list as a sheet. */
export function tabBar({ activeId, onSelect, onMore }) {
  const bar = el('nav', { className: 'kura-tabbar', 'aria-label': 'Sections' }, TABS.map(t => el('button', {
    type: 'button', className: `kura-tab${t.primary ? ' is-primary' : ''}`, dataset: { tab: t.id }, 'aria-current': t.on(activeId) ? 'page' : null,
    onClick: () => t.id === 'more' ? onMore() : onSelect(t.id),
  }, [el('span', { className: 'kura-tab-icon' }, [Icon(t.icon)]), el('span', { className: 'kura-tab-label' }, t.label)])));
  return bar;
}
export function markTabs(bar, id) {
  bar?.querySelectorAll('.kura-tab').forEach(b => { const t = TABS.find(x => x.id === b.dataset.tab); if (t.on(id)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
}
/* A small count beside a page in the sidebar (open alerts beside Overview). 0 hides it. */
export function setNavCount(root, id, n) {
  const b = root?.querySelector(`[data-id="${id}"]`); if (!b) return;
  let c = b.querySelector('.kura-nav-count');
  if (!n) { c?.remove(); return; }
  if (!c) { c = el('em', { className: 'kura-nav-count' }); b.append(c); }
  c.textContent = String(n); c.setAttribute('aria-label', `${n} open alert${n === 1 ? '' : 's'}`);
}
