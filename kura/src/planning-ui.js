/* Kura planning screens: Expiry & recalls, levels from recorded use, the before-the-weekend heads-up, backorder
   swaps and the morning brief. The numbers come from the engine (backend/planning.py → state.planning); every
   action opens an existing, reviewed dialog (move, waste, order, rule, lot hold). Nothing here changes stock on its own. */
import { el, Button, Card, EmptyState, Icon, Metric, PageHeader, Search, Tabs } from './ui/components.js?v=3a7528f6ad';

const DAY = 86400000;
const plural = (n, one, many = one + 's') => `${n} ${Number(n) === 1 ? one : many}`;
const when = days => days < 0 ? `expired ${plural(-days, 'day')} ago` : days === 0 ? 'expires today' : `in ${plural(days, 'day')}`;
const longDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
export const planOf = state => state.planning || { expiry: [], use_first: [], levels: [], heads_up: [], backorders: [], brief: null, settings: {} };

/* One flat row: what, where, why, and the one or two things to do about it. */
function planRow({ tone = 'neutral', title, meta = [], why, actions = [], tag }) {
  return el('article', { className: 'plan-row', 'data-tone': tone }, [
    el('div', { className: 'plan-main' }, [
      el('div', { className: 'plan-title' }, [el('strong', {}, title), tag ? el('span', { className: 'plan-tag', 'data-tone': tone }, tag) : null]),
      meta.length ? el('div', { className: 'plan-meta' }, meta.filter(Boolean).map(m => el('span', {}, m))) : null,
      why ? el('p', { className: 'plan-why' }, why) : null]),
    el('div', { className: 'plan-actions' }, actions.filter(Boolean))]);
}
const planList = (rows, empty) => rows.length ? el('div', { className: 'plan-list' }, rows) : empty;

/* ---------- Expiry & recalls ---------- */
const TONE = { remove: 'critical', transfer: 'warning', at_risk: 'warning', use_first: 'success', watch: 'neutral', held: 'neutral' };
const TAG = { remove: 'Expired', transfer: 'Move', at_risk: 'May expire unused', use_first: 'Use first', watch: 'Use first', held: 'On hold' };

function expiryRow(k, r) {
  const item = k.find('items', r.item_id), s = r.suggestion || {};
  const move = (destination, quantity) => k.movementDialog(item, 'transfer', { location_id: r.location_id, destination_id: destination, lot_id: r.lot_id, quantity: quantity ?? r.quantity, reason: `Expiry rotation: lot ${r.lot_code} ${when(r.days)}` });
  const actions = s.type === 'transfer' ? [k.act(`Move ${k.fmt(s.quantity)} to ${s.location_name}`, () => move(s.location_id, s.quantity), 'stock.move', 'primary')]
    : s.type === 'remove' ? [k.act('Record waste', () => k.movementDialog(item, 'waste', { location_id: r.location_id, lot_id: r.lot_id, quantity: r.quantity, reason: `Expired lot ${r.lot_code}` }), 'stock.move', 'primary')]
    : s.type === 'held' ? [k.act('Release hold', () => k.reasonCommand('Release lot', 'lot.release', { id: r.lot_id }), 'lot.release')]
    : s.type === 'at_risk' ? [k.act('Move…', () => move('', r.at_risk), 'stock.move')]
    : [];
  if (s.type !== 'held' && s.type !== 'remove') actions.push(k.act('Hold', () => k.reasonCommand('Put lot on hold', 'lot.quarantine', { id: r.lot_id }), 'lot.quarantine'));
  return planRow({ tone: TONE[s.type] || 'neutral', tag: TAG[s.type], title: r.item_name,
    meta: [`Lot ${r.lot_code}`, r.location_name, `${k.fmt(r.quantity)} ${r.unit}`, `${longDate(r.expires)} · ${when(r.days)}`],
    why: s.text, actions });
}

function recallFinder(k) {
  const results = el('div', { className: 'plan-recall-results', 'aria-live': 'polite' });
  const search = Search({ label: 'Find a lot', placeholder: 'Scan or type a lot number…', onInput: v => draw(v) });
  function draw(q) {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 2) { results.replaceChildren(); return; }
    const lots = k.list('lots').filter(l => String(l.code || l.lot_code || '').toLowerCase().includes(q)).slice(0, 20);
    if (!lots.length) { results.replaceChildren(el('p', { className: 'muted small' }, `No lot matching “${q}”.`)); return; }
    results.replaceChildren(...lots.map(lot => {
      const item = k.find('items', lot.item_id), places = k.list('balances').filter(b => b.lot_id === lot.id && Number(b.on_hand) > 0);
      const total = places.reduce((n, b) => n + Number(b.on_hand), 0), status = lot.status || 'active';
      return planRow({ tone: status === 'recalled' ? 'critical' : status === 'quarantined' ? 'warning' : 'neutral', tag: status === 'active' ? null : status === 'recalled' ? 'Recalled' : 'On hold',
        title: `${item?.name || 'Item'} · lot ${lot.code || lot.lot_code}`,
        meta: [lot.expires ? `Expires ${longDate(lot.expires)}` : 'No expiry', total ? `${k.fmt(total)} ${item?.base_unit || ''} on hand` : 'None on hand',
          ...places.map(b => `${k.locationName(b.location_id)}: ${k.fmt(b.on_hand)}`)],
        why: total ? 'Holding or recalling a lot takes every unit of it out of available stock, in every area, until it is released.' : 'Nothing from this lot is in stock now.',
        actions: status === 'active' ? [k.act('Put on hold', () => k.reasonCommand('Put lot on hold', 'lot.quarantine', { id: lot.id }), 'lot.quarantine'), k.act('Mark recalled', () => k.reasonCommand('Mark lot recalled', 'lot.recall', { id: lot.id }), 'lot.recall', 'primary')]
          : [k.act('Release', () => k.reasonCommand('Release lot', 'lot.release', { id: lot.id }), 'lot.release')] });
    }));
  }
  return Card({ title: 'Recall lookup', description: 'Find every box of a lot, in every area, and take it out of use in one step.', children: [search, results], className: 'plan-recall' });
}

export function expiryPage(k) {
  const P = planOf(k.state), rows = P.expiry || [], days = P.settings?.expiry_days || 90;
  const by = b => rows.filter(r => r.bucket === b);
  const atRisk = rows.filter(r => r.lot_status === 'active' && r.days >= 0 && ['transfer', 'at_risk'].includes(r.suggestion?.type));
  const tab = (id, label, list, empty) => ({ id, label: `${label} (${list.length})`, content: planList(list.map(r => expiryRow(k, r)), EmptyState({ title: empty, icon: 'check-circle' })) });
  return [
    PageHeader({ title: 'Expiry & recalls', description: `Lots expiring in the next ${days} days, whether each area will use them in time, and what to move, use first or remove. Nothing changes until you confirm.`,
      actions: [k.act('Planning settings', () => planningSettings(k), 'setting.save', 'secondary', 'settings')] }),
    el('div', { className: 'metrics' }, [
      Metric({ label: 'Expired, still in stock', value: String(by('expired').length), tone: by('expired').length ? 'critical' : 'neutral', detail: 'Record as waste or disposal' }),
      Metric({ label: 'Next 30 days', value: String(by('30').length), detail: 'Lots to use first' }),
      Metric({ label: 'May expire unused', value: String(atRisk.length), tone: atRisk.length ? 'warning' : 'neutral', detail: 'At today’s rate of use' }),
      Metric({ label: 'On hold or recalled', value: String(rows.filter(r => r.lot_status !== 'active').length + k.list('lots').filter(l => (l.status || 'active') !== 'active' && !rows.some(r => r.lot_id === l.id) && k.list('balances').some(b => b.lot_id === l.id && Number(b.on_hand) > 0)).length), detail: 'Not counted as available' })]),
    recallFinder(k),
    Tabs({ items: [
      tab('soon', 'Next 30 days', [...by('expired'), ...by('30')], 'Nothing expires in the next 30 days'),
      tab('60', '31–60 days', by('60'), 'Nothing expires in 31–60 days'),
      tab('90', `61–${days} days`, by('90'), `Nothing expires in 61–${days} days`)] })];
}

/* ---------- Levels from recorded use ---------- */
export function levelsPanel(k) {
  const P = planOf(k.state), rows = P.levels || [], cfg = P.settings || {};
  const apply = r => k.execute('rule.save', { ...(r.rule_id ? { id: r.rule_id, version: r.rule_version } : {}), item_id: r.item_id, location_id: r.location_id,
    minimum: r.suggested.minimum, reorder_point: r.suggested.reorder_point, target: r.suggested.target, safety_stock: r.suggested.safety_stock, order_multiple: r.order_multiple || 0 },
    `Levels saved for ${r.item_name} in ${r.location_name}.`);
  const applyAll = async () => { for (const r of rows) { if (!(await apply(r))) break; } };
  const fmtLv = v => `${k.fmt(v.minimum)} / ${k.fmt(v.reorder_point)} / ${k.fmt(v.target)}`;
  const intro = el('div', { className: 'plan-intro' }, [
    el('p', { className: 'muted small' }, `From the last ${cfg.history_days || 30} days of recorded use (including Treatment Sheets doses), each vendor’s lead time, ${cfg.safety_days ?? 2} days of safety stock and ${cfg.cover_days || 7} days of cover between orders. Shown as minimum / reorder at / fill to. Items need at least a week of history and use on 3 different days.`),
    el('div', { className: 'inline' }, [rows.length > 1 ? k.act(`Apply all ${rows.length}`, applyAll, 'rule.save', 'secondary') : null, k.act('Planning settings', () => planningSettings(k), 'setting.save', 'ghost', 'settings')])]);
  return el('div', { className: 'stack' }, [intro, planList(rows.map(r => planRow({
    tone: r.change === 'raise' ? 'warning' : r.change === 'lower' ? 'success' : 'neutral', tag: { raise: 'Raise', lower: 'Lower', set: 'Not set yet' }[r.change],
    title: r.item_name, meta: [r.location_name, `${k.fmt(r.daily_use)} ${r.unit}/day`, r.current.target > 0 ? `Now ${fmtLv(r.current)}` : null, `Suggested ${fmtLv(r.suggested)}`],
    why: r.text, actions: [k.act('Apply', () => apply(r), 'rule.save', 'primary'), k.act('Edit…', () => k.ruleEditor({ ...(r.rule_id ? k.find('rules', r.rule_id) : {}), item_id: r.item_id, location_id: r.location_id, ...r.suggested, order_multiple: r.order_multiple || 0 }), 'rule.save')] })),
    EmptyState({ title: 'Levels match recorded use', description: 'Kura suggests a change when an area’s use differs from its levels by a quarter or more, or when no levels are set.', icon: 'check-circle' }))]);
}

/* ---------- Before vendors close ---------- */
export function headsUpRows(k) {
  return (planOf(k.state).heads_up || []).map(h => planRow({ tone: 'warning', tag: `Order by ${new Date(h.order_by + 'T12:00:00').toLocaleDateString([], { weekday: 'long' })}`,
    title: h.item_name, meta: [h.location_name, `${k.fmt(h.available)} ${h.unit} available`, h.inbound ? `${k.fmt(h.inbound)} on order` : null, `${k.fmt(h.daily_use)}/day`],
    why: h.text, actions: [k.act(`Order ${k.fmt(h.quantity)} ${h.unit}`, () => k.orderEditor({ location_id: h.location_id, vendor_id: h.vendor_id }, k.find('items', h.item_id), h.quantity), 'order.save', 'primary')] }));
}
export function headsUpCard(k) {
  const P = planOf(k.state), rows = headsUpRows(k);
  if (!P.closure || !rows.length) return null;
  return Card({ title: `Before ${P.closure.label}`, className: 'plan-headsup', description: `Vendors don’t deliver ${longDate(P.closure.start)}${P.closure.end !== P.closure.start ? ` – ${longDate(P.closure.end)}` : ''}. These would run low before an order placed afterwards could arrive.`, children: [planList(rows)] });
}

/* ---------- Backorders ---------- */
export function backorderRows(k) {
  return (planOf(k.state).backorders || []).map(b => {
    const item = k.find('items', b.item_id), order = k.find('orders', b.order_id);
    const swaps = b.alternatives.map(a => k.act(a.available_here > 0 && a.quantity === 0 ? `Use ${a.item_name} (${k.fmt(a.available_here)} here)` : `Order ${a.item_name} instead`,
      () => a.available_here > 0 && a.quantity === 0 ? k.itemDrawer(k.find('items', a.item_id)) : k.orderEditor({ location_id: b.location_id, vendor_id: a.vendor_id || b.vendor_id }, k.find('items', a.item_id), a.quantity ?? undefined), a.available_here > 0 && a.quantity === 0 ? null : 'order.save', 'primary'));
    const alt = b.alternatives;
    return planRow({ tone: 'warning', tag: 'Backordered', title: b.item_name,
      meta: [b.location_name, `${k.fmt(b.remaining)} ${b.unit} still due`, b.order_number ? `Order ${b.order_number}` : null, b.expected_at ? `Expected ${String(b.expected_at).slice(0, 10)}` : null],
      why: alt.length ? alt.map(a => `${a.item_name}: ${k.fmt(a.available_total)} ${a.unit} in the hospital${a.available_here ? `, ${k.fmt(a.available_here)} in ${b.location_name}` : ''}${a.same_unit ? '' : ' (different unit — check the quantity)'}.`).join(' ')
        : 'No alternative is linked to this item yet. Link one so Kura can offer it the next time this happens.',
      actions: [...swaps, k.act(alt.length ? 'Alternatives…' : 'Link an alternative', () => alternativesEditor(k, item), 'item.save', alt.length ? 'ghost' : 'secondary'), order ? k.act('Order', () => k.orderDrawer(order), null, 'ghost') : null] });
  });
}

export function alternativesEditor(k, item) {
  if (!item) return;
  const chosen = new Set(item.alternatives || []), boxes = el('div', { className: 'alt-list', role: 'group', 'aria-label': 'Alternative items' });
  const others = k.list('items').filter(i => i.id !== item.id && (i.status || 'active') === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const draw = q => boxes.replaceChildren(...others.filter(i => !q || `${i.name} ${i.sku || ''} ${i.generic_name || ''}`.toLowerCase().includes(q.toLowerCase())).map(i => {
    const id = 'alt-' + i.id, box = el('input', { type: 'checkbox', id, checked: chosen.has(i.id), onChange: e => e.target.checked ? chosen.add(i.id) : chosen.delete(i.id) });
    return el('label', { className: 'alt-option', for: id }, [box, el('span', {}, [el('strong', {}, i.name), el('small', {}, [i.sku, i.base_unit === item.base_unit ? null : `counted in ${i.base_unit}`].filter(Boolean).join(' · '))])]);
  }));
  draw('');
  const generic = item.generic_name ? others.filter(i => i.generic_name && i.generic_name.toLowerCase() === item.generic_name.toLowerCase()) : [];
  return k.formDialog({ title: `Alternatives for ${item.name}`, description: 'When this item is backordered, Kura offers these instead. Pick items that can be used in its place.',
    children: [Search({ label: 'Find items', placeholder: 'Search items…', onInput: draw }), generic.length ? el('p', { className: 'muted small' }, `Same generic name: ${generic.map(i => i.name).join(', ')}.`) : null, boxes],
    command: 'item.save', submitLabel: 'Save alternatives', transform: () => ({ ...itemPayload(item), alternatives: [...chosen] }) });
}
// item.save takes the item's own fields back (the engine checks the version)
const itemPayload = item => Object.fromEntries(Object.entries(item).filter(([key]) => !['created_at', 'updated_at', 'tenant_id', 'kind'].includes(key)));

/* ---------- Morning brief ---------- */
export function briefSections(k, brief, { compact = false } = {}) {
  if (!brief) return [];
  const today = brief.today, soon = d => d && (new Date(d + 'T12:00:00') - new Date(today + 'T12:00:00')) / DAY;
  const arriving = (brief.arriving || []).filter(a => soon(a.expected) >= 0 && soon(a.expected) <= 1);
  const section = (icon, title, rows, empty, go) => el('section', { className: 'brief-section' }, [
    el('div', { className: 'brief-head' }, [el('span', { className: 'brief-icon', 'aria-hidden': 'true' }, Icon(icon)), el('h3', {}, title), go ? el('button', { type: 'button', className: 'link-button', onClick: go }, 'Open') : null]),
    rows.length ? el('ul', { className: 'brief-lines' }, rows.slice(0, compact ? 3 : 12).map(r => el('li', {}, r))) : el('p', { className: 'muted small' }, empty)]);
  return [
    section('alert', brief.short_count ? `${plural(brief.short_count, 'item')} low${brief.critical_count ? ` · ${brief.critical_count} critical` : ''}` : 'Stock', (brief.short || []).map(s => `${s.item} — ${s.location}${s.severity === 'critical' ? ' (critical)' : ''}`), 'Everything is at or above its reorder level.', () => k.navigate('replenish')),
    section('truck', arriving.length ? `${plural(arriving.length, 'delivery', 'deliveries')} today or tomorrow` : 'Deliveries', arriving.map(a => `${a.vendor} → ${a.location} · ${plural(a.lines, 'line')} · ${soon(a.expected) === 0 ? 'today' : 'tomorrow'}`), 'No deliveries expected today or tomorrow.', () => k.navigate('orders')),
    section('calendar', expiryTitle(brief.expiring || [], soon), (brief.expiring || []).map(e => `${e.item} · lot ${e.lot} · ${e.location} · ${soon(e.expires) < 0 ? 'expired' : 'expires'} ${longDate(e.expires)}`), 'Nothing expires in the next two weeks.', () => k.navigate('expiry')),
    (brief.heads_up || []).length ? section('clock', `Order before ${brief.heads_up[0].closure}`, brief.heads_up.map(h => `${h.item} — ${h.location} · by ${longDate(h.order_by)}`), '', () => k.navigate('replenish')) : null,
    (brief.kits || []).length ? section('clipboard', `${plural(brief.kits.length, 'kit')} not ready`, brief.kits.map(x => `${x.name} — ${x.area || ''} · ${{ opened: 'opened', expired: 'expired stock inside', restock: 'needs restock', check_due: 'check due' }[x.status] || x.status}`), '', () => k.navigate('kits')) : null,
    brief.controlled && (brief.controlled.counts_due.length || brief.controlled.discrepancies || brief.controlled.missing) ? section('shield', 'Controlled drugs', [
      ...brief.controlled.counts_due.map(n => `Count due: ${n}`), brief.controlled.discrepancies ? `${plural(brief.controlled.discrepancies, 'discrepancy', 'discrepancies')} to explain` : null,
      brief.controlled.missing ? `${plural(brief.controlled.missing, 'entry', 'entries')} missing a patient or witness` : null].filter(Boolean), '', () => k.navigate('controlled')) : null,
    (brief.backorders || []).length ? section('refresh', 'Backordered', brief.backorders.map(b => `${b.item} — ${b.location}${b.alternative ? ` · try ${b.alternative}` : ''}`), '', () => k.navigate('replenish')) : null,
  ].filter(Boolean);
}

function expiryTitle(rows, soon) {
  const gone = rows.filter(e => soon(e.expires) < 0).length, coming = rows.length - gone;
  if (!rows.length) return 'Expiry';
  if (!coming) return `${plural(gone, 'expired lot')} still in stock`;
  return `${plural(coming, 'lot')} expiring within 2 weeks${gone ? ` · ${gone} expired` : ''}`;
}

export function briefPage(k, push) {
  const brief = planOf(k.state).brief;
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
  return [PageHeader({ title: 'Morning brief', description: `${greeting}. What needs attention today, as of ${brief?.as_of ? new Date(brief.as_of).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'now'}.`,
      actions: [Button({ label: 'Back to Overview', variant: 'secondary', onClick: () => k.navigate('overview') })] }),
    el('div', { className: 'brief-grid' }, briefSections(k, brief)),
    push ? push.card() : null];
}

/* ---------- Settings ---------- */
export function planningSettings(k) {
  const cfg = planOf(k.state).settings || {};
  return k.formDialog({ title: 'Planning settings', description: 'Used for suggested levels, the before-the-weekend heads-up and expiry. Changing them never changes stock or saved levels.',
    initial: { history_days: cfg.history_days || 30, safety_days: cfg.safety_days ?? 2, cover_days: cfg.cover_days || 7, timezone: cfg.timezone || 'America/New_York' },
    fields: [{ key: 'history_days', label: 'Days of use to learn from', type: 'number', min: 14, help: '14 to 90 days.' },
      { key: 'safety_days', label: 'Safety stock (days of use)', type: 'number', min: 0, help: 'Extra on hand for a busy night. 0 to 14.' },
      { key: 'cover_days', label: 'Days of cover between orders', type: 'number', min: 1, help: 'How far above the reorder level to fill. 1 to 30.' },
      { key: 'timezone', label: 'Hospital time zone', type: 'select', options: [['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'], ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific']].map(([value, label]) => ({ value, label })) }],
    command: 'setting.save', transform: p => ({ id: 'planning', data: { history_days: Math.round(p.history_days), safety_days: Math.round(p.safety_days), cover_days: Math.round(p.cover_days), timezone: p.timezone } }) });
}
