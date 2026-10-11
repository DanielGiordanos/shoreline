/* Insights (Records › Insights): what gets used, what it's worth and what's wasted.
   Layout: a summary card with eight weekly bars, an inventory-value card with the top areas, a filter bar, and a
   board with Items · Waste · Running low tabs, an item list and the chosen item's detail.
   All numbers come from the engine's insights report (backend/workflows.py → insights). Nothing here changes stock. */
import { el, Button, Icon, PageHeader, EmptyState } from './ui/components.js?v=cf69b844c0';

const view = { tab: 'all', area: '', q: '', selected: null };          // kept while Kura redraws the page
const SVG = 'http://www.w3.org/2000/svg';
const arrow = () => { const s = document.createElementNS(SVG, 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('aria-hidden', 'true'); s.classList.add('ins-arrow');
  const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', 'M5 11 11 5M6 5h5v5'); s.append(p); return s; };
/* Status badges in Flow's style (Flow's .overdue-badge / .high-badge / .review-badge): tinted pill, solid icon dot, small caps. */
const GLYPH = { low: 'M8 4.2v4.6M8 11.4v.4', waste: 'M4.6 5.6h6.8M6.6 5.6V4.4h2.8v1.2M5.6 5.6l.5 6h3.8l.5-6', use: 'M4.8 8.3l2.1 2.1 4.3-4.6', idle: 'M5 8h6' };
const badge = (label, tone) => { const s = document.createElementNS(SVG, 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', GLYPH[tone]); s.append(p);
  return el('span', { className: `ins-badge is-${tone}` }, [el('span', { className: 'ins-badge-icon' }, s), el('span', { className: 'ins-badge-text' }, label)]); };
const initials = name => { const n = String(name || '?').trim(); if (n.length <= 3 && !/\s/.test(n)) return n.toUpperCase();
  const w = n.split(/[\s/&-]+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : n.slice(0, 2)).toUpperCase(); };
const short = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function insightsView(ctx) {
  const { insights: R = {}, money, fmt, download, locationName, find, itemDrawer, orderItem, navigate, lowIds = new Set() } = ctx;
  const items = (R.items || []).map(r => ({ ...r, low: lowIds.has(r.item_id) || (r.estimated_days_supply != null && r.estimated_days_supply < 7) }));
  const unitOf = r => find('items', r.item_id)?.base_unit || r.unit || '';
  const cash = (n, cls = '') => { const s = money(n), m = /^(-?)([^\d-]*)(.*)$/.exec(s);
    return el('span', { className: `ins-cash ${cls}`.trim() }, [m[1] ? '−' : null, el('span', { className: 'ins-cur' }, m[2]), m[3]]); };
  const big = (value, unit) => el('span', { className: 'ins-big' }, [value, unit ? el('span', { className: 'ins-unit' }, ` ${unit}`) : null]);
  const chip = id => el('span', { className: 'ins-chip', title: locationName(id) }, initials(locationName(id)));

  /* ---------- summary: used, wasted, count accuracy + eight weeks ---------- */
  const weeks = R.weekly || [], wmax = Math.max(1, ...weeks.map(w => Number(w.use_cost) + Number(w.waste_cost)));
  const accuracy = R.inventory_accuracy == null ? null : R.inventory_accuracy;
  const hero = el('section', { className: 'ins-card ins-hero', 'aria-label': 'Last 30 days' }, [
    el('div', { className: 'ins-stats' }, [
      el('div', {}, [el('span', { className: 'ins-label' }, 'Used · 30 days'), cash(R.usage_cost_30d, 'ins-big')]),
      el('div', {}, [el('span', { className: 'ins-label' }, 'Wasted · 30 days'), cash(R.waste_cost_30d, `ins-big${Number(R.waste_cost_30d) > 0 ? ' is-waste' : ''}`)]),
      el('div', {}, [el('span', { className: 'ins-label' }, 'Count accuracy'), accuracy == null ? big('—', 'no counts yet') : big(fmt(accuracy), '%')]),
    ]),
    el('ol', { className: 'ins-weeks', 'aria-label': 'Stock used each week, last 8 weeks' }, weeks.map((w, i) => {
      const use = Number(w.use_cost) || 0, waste = Number(w.waste_cost) || 0;
      return el('li', { className: `ins-week${i === weeks.length - 1 ? ' is-now' : ''}`, 'aria-label': `Week of ${short(w.start)}: ${money(use)} used${waste ? `, ${money(waste)} wasted` : ''}` }, [
        el('span', { className: 'ins-week-label' }, i === weeks.length - 1 ? 'This week' : short(w.start)),
        el('span', { className: 'ins-track', 'aria-hidden': 'true' }, [
          el('span', { className: 'ins-fill', style: { width: `${use / wmax * 100}%` } }),
          waste ? el('span', { className: 'ins-fill is-waste', style: { width: `${Math.max(2, waste / wmax * 100)}%` } }) : null]),
        el('span', { className: 'ins-chips' }, (w.top_locations || []).map(chip)),
      ]);
    })),
  ]);

  /* ---------- inventory value + the areas holding the most ---------- */
  const areas = (R.location_value || []).slice(0, 3);
  const areaTabs = el('div', { className: 'ins-tabs', role: 'group', 'aria-label': 'Show one area' });
  // each area's bar is as tall as its share of the biggest area's value (like the payout cards in Daniel's reference)
  const vmax = Math.max(1, ...areas.map(a => Number(a.value) || 0));
  const drawAreaTabs = () => areaTabs.replaceChildren(...areas.map(a => el('button', { type: 'button', className: `ins-tab${view.area === a.location_id ? ' is-on' : ''}`, 'aria-pressed': String(view.area === a.location_id),
    style: { '--h': `${(4.5 + 4 * (Number(a.value) || 0) / vmax).toFixed(2)}rem` },
    onClick: () => setArea(view.area === a.location_id ? '' : a.location_id) }, [cash(a.value), el('span', { className: 'ins-tab-name' }, locationName(a.location_id))])));
  const valueCard = el('section', { className: 'ins-card ins-value', 'aria-label': 'Inventory value' }, [
    el('div', { className: 'ins-value-head' }, [
      el('div', {}, [el('span', { className: 'ins-label' }, 'Inventory value'), el('div', { className: 'ins-value-line' }, [cash(R.inventory_value, 'ins-big'), el('span', { className: 'ins-pill' }, 'On hand')])]),
      el('button', { type: 'button', className: 'ins-round', 'aria-label': 'Open inventory', onClick: () => navigate('inventory') }, arrow())]),
    el('div', { className: 'ins-value-foot' }, [areaTabs, el('button', { type: 'button', className: 'ins-white', onClick: e => download.run(e) }, 'Export')]),
  ]);

  /* ---------- filters ---------- */
  const areaSelect = el('select', { className: 'ins-field', 'aria-label': 'Area', onChange: e => setArea(e.target.value) },
    [el('option', { value: '' }, 'All areas'), ...ctx.locations.map(l => el('option', { value: l.id }, l.name))]);
  const search = el('input', { className: 'ins-field', type: 'search', placeholder: 'Find an item', 'aria-label': 'Find an item', value: view.q,
    onInput: e => { view.q = e.target.value; drawBoard(); } });
  const count = el('span', { className: 'ins-count' });
  const filters = el('div', { className: 'ins-filters' }, [el('span', { className: 'ins-filters-label' }, ['Filters ', count]),
    el('label', { className: 'ins-select' }, [areaSelect, Icon('location')]), el('span', { className: 'ins-field is-static' }, 'Last 30 days'),
    el('label', { className: 'ins-search' }, [search, Icon('search')])]);

  /* ---------- the board ---------- */
  const tabs = el('div', { className: 'ins-notch', role: 'tablist', 'aria-label': 'Which items' });
  const listBox = el('div', { className: 'ins-list', role: 'listbox', 'aria-label': 'Items' }), detail = el('div', { className: 'ins-detail', 'aria-live': 'polite' });
  const board = el('section', { className: 'ins-board', 'aria-label': 'Items, last 30 days' }, [tabs,
    el('div', { className: 'ins-board-head' }, [el('h2', {}, 'Items · last 30 days'), el('div', { className: 'ins-board-tools' }, [
      el('button', { type: 'button', className: 'ins-round is-light', 'aria-label': 'Export balances', onClick: e => download.run(e) }, Icon('download')),
      el('button', { type: 'button', className: 'ins-round is-light', 'aria-label': 'Open activity', onClick: () => navigate('activity') }, Icon('clock'))])]),
    el('div', { className: 'ins-board-body' }, [listBox, detail])]);

  const inArea = r => !view.area || (r.by_location || []).some(b => b.location_id === view.area) || ctx.balances.some(b => b.item_id === r.item_id && b.location_id === view.area && Number(b.on_hand) > 0);
  const named = r => !view.q || `${r.item_name} ${find('items', r.item_id)?.sku || ''}`.toLowerCase().includes(view.q.trim().toLowerCase());
  const active = r => Number(r.used_30d) > 0 || Number(r.wasted_30d) > 0 || Number(r.on_hand) > 0;
  const TABS = [['all', 'All items', r => active(r)], ['waste', 'Waste', r => Number(r.wasted_30d) > 0], ['low', 'Running low', r => r.low]];
  const status = r => Number(r.wasted_30d) > 0 ? ['Wasted', 'waste'] : r.low ? ['Low', 'low'] : Number(r.used_30d) > 0 ? ['In use', 'use'] : ['Not used', 'idle'];
  const where = r => r.by_location?.[0]?.location_id;
  const daysText = r => r.estimated_days_supply == null ? null : `${fmt(r.estimated_days_supply)} days left`;

  function setArea(id) { view.area = id; areaSelect.value = id; drawAreaTabs(); drawBoard(); }

  function drawDetail(r) {
    if (!r) { detail.replaceChildren(EmptyState({ title: 'Nothing here yet', description: view.q || view.area ? 'Try another area or search.' : 'Insights build from recorded stock movements.', icon: 'chart' })); return; }
    const unit = unitOf(r), [label, tone] = status(r), it = find('items', r.item_id);
    const open = () => itemDrawer(it);
    const cell = (title, value, sub) => el('button', { type: 'button', className: 'ins-cell', onClick: open, 'aria-label': `${title}: open ${r.item_name}` }, [arrow(), el('div', { className: 'ins-cell-value' }, value), el('span', { className: 'ins-cell-title' }, title), sub ? el('span', { className: 'ins-cell-sub' }, sub) : null]);
    const change = r.usage_change_percent;
    detail.replaceChildren(
      el('div', { className: 'ins-detail-top' }, [
        el('div', { className: 'ins-detail-name' }, [el('span', { className: 'ins-label' }, 'Item'), el('div', { className: 'ins-name-line' }, [el('strong', {}, r.item_name), badge(label, tone)])]),
        el('div', {}, [el('span', { className: 'ins-label' }, 'Used most in'), el('div', { className: 'ins-where' }, where(r) ? locationName(where(r)) : '—')]),
        el('div', {}, [el('span', { className: 'ins-label' }, 'Days of supply'), r.estimated_days_supply == null ? el('div', { className: 'ins-where muted' }, r.confidence === 'disabled' ? 'Forecasting off' : 'Not enough history') : big(fmt(r.estimated_days_supply), 'days')]),
      ]),
      el('div', { className: 'ins-cells' }, [
        cell('Used · 30 days', cash(r.usage_cost_30d), `${fmt(r.used_30d)} ${unit}`),
        cell('Wasted · 30 days', cash(r.waste_cost_30d), `${fmt(r.wasted_30d)} ${unit}`),
        cell('Change in use', change == null ? '—' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${fmt(Math.abs(change))}%`, change == null ? 'Needs 60 days of history' : 'vs the 30 days before'),
        orderItem ? el('button', { type: 'button', className: 'ins-cell is-add', onClick: () => orderItem(it), 'aria-label': `Order ${r.item_name}` }, [el('span', { className: 'ins-plus' }, Icon('plus')), el('span', { className: 'ins-cell-title' }, 'Order')]) : null,
      ]),
      el('div', { className: 'ins-totals' }, [
        el('div', {}, [el('span', { className: 'ins-label' }, 'On hand'), big(fmt(r.on_hand), unit)]),
        el('div', {}, [el('span', { className: 'ins-label' }, 'Available'), big(fmt(r.available), unit)]),
        el('div', {}, [el('span', { className: 'ins-label' }, 'Used · 30 days'), big(fmt(r.used_30d), unit)]),
        el('div', { className: 'ins-totals-actions' }, [
          el('button', { type: 'button', className: 'ins-round', 'aria-label': `Open ${r.item_name}`, onClick: open }, Icon('package')),
          el('button', { type: 'button', className: 'ins-round', 'aria-label': 'Open activity', onClick: () => navigate('activity') }, Icon('clock')),
          orderItem ? Button({ label: 'Order', variant: 'primary', className: 'ins-go', onClick: () => orderItem(it) }) : null]),
      ]));
  }

  function drawBoard() {
    const base = items.filter(inArea).filter(named);
    const counts = Object.fromEntries(TABS.map(([id, , f]) => [id, base.filter(f).length]));
    tabs.replaceChildren(...TABS.map(([id, label]) => el('button', { type: 'button', role: 'tab', className: `ins-notch-tab${view.tab === id ? ' is-on' : ''}`, 'aria-selected': String(view.tab === id),
      onClick: () => { view.tab = id; drawBoard(); } }, [label, id === 'all' ? null : el('span', { className: 'ins-notch-count' }, String(counts[id]))])));
    const rows = base.filter(TABS.find(t => t[0] === view.tab)[2]).sort((a, b) => (Number(b.usage_cost_30d) + Number(b.waste_cost_30d)) - (Number(a.usage_cost_30d) + Number(a.waste_cost_30d)) || a.item_name.localeCompare(b.item_name));
    if (!rows.some(r => r.item_id === view.selected)) view.selected = rows[0]?.item_id || null;
    listBox.replaceChildren(...(rows.length ? rows.map(r => {
      const [label, tone] = status(r), on = r.item_id === view.selected;
      return el('button', { type: 'button', role: 'option', className: `ins-row${on ? ' is-on' : ''}`, 'aria-selected': String(on), onClick: () => { view.selected = r.item_id; drawBoard(); if (matchMedia('(max-width: 48rem)').matches) detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, [
        el('span', { className: 'ins-row-name' }, [el('strong', {}, r.item_name), el('small', {}, [where(r) ? locationName(where(r)) : 'No use in 30 days', daysText(r) ? ` · ${daysText(r)}` : ''].join(''))]),
        badge(label, tone),
        cash(view.tab === 'waste' ? r.waste_cost_30d : r.usage_cost_30d, 'ins-row-cash')]);
    }) : [el('p', { className: 'ins-none' }, view.tab === 'waste' ? 'Nothing wasted in the last 30 days.' : view.tab === 'low' ? 'Nothing is running low.' : 'No items match.')]));
    drawDetail(rows.find(r => r.item_id === view.selected));
    const n = (view.area ? 1 : 0) + (view.q ? 1 : 0); count.textContent = String(n); count.hidden = !n;
  }

  areaSelect.value = view.area; drawAreaTabs(); drawBoard();
  return [
    PageHeader({ title: 'Insights', description: 'What gets used, what it’s worth and what’s wasted. Every estimate says what it’s based on.', actions: [download.button] }),
    el('div', { className: 'ins-top' }, [hero, valueCard]), filters, board,
    el('p', { className: 'ins-foot' }, `${R.valuation_method || 'Inventory value uses acquisition cost, not client prices.'} ${R.cost_basis || ''} Days of supply need at least 7 days of history with use on 3 different days.`),
  ];
}
