import { Icon } from './icons.js?v=3a7528f6ad';
export { Icon } from './icons.js?v=3a7528f6ad';

let sequence = 0;
const uid = (prefix = 'pv') => `${prefix}-${++sequence}`;

function appendChildren(node, children) {
  for (const child of [children].flat(Infinity)) {
    if (child === null || child === undefined || typeof child === 'boolean') continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Text and DOM nodes only. No HTML parsing or innerHTML escape hatch. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (/^on[A-Z]/.test(key) && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'className') node.className = value;
    else if (key === 'textContent') node.textContent = value;
    else if (key === 'value') node.value = value;
    else if (key === 'checked') node.checked = Boolean(value);
    else if (key === 'style' && typeof value === 'object') {
      for (const [property, setting] of Object.entries(value)) node.style.setProperty(property, setting);
    } else if (key === 'dataset' && typeof value === 'object') Object.assign(node.dataset, value);
    else if (key === 'innerHTML' || key === 'outerHTML') throw new TypeError('Pravix components accept text and DOM nodes, not HTML strings.');
    else if (typeof value === 'boolean' && !key.startsWith('aria-') && !key.startsWith('data-')) {
      if (value) node.setAttribute(key, '');
    } else node.setAttribute(key, String(value));
  }
  return appendChildren(node, children);
}

export function Button({ label, icon, variant = 'secondary', size = 'md', onClick, disabled = false, type = 'button', iconOnly = false, className = '', ...attributes } = {}) {
  if (!label && !attributes['aria-label']) throw new TypeError('A button requires a visible or accessible label.');
  const node = el('button', { ...attributes, type, disabled, className: `pv-button pv-button--${variant} pv-button--${size}${iconOnly ? ' pv-icon-button' : ''} ${className}`.trim(), onClick }, [icon ? Icon(icon) : null, iconOnly ? null : label]);
  if (iconOnly) node.setAttribute('aria-label', attributes['aria-label'] || label);
  return node;
}

export function Input({ id = uid('field'), label, type = 'text', value = '', placeholder, help, error, onInput, required = false, ...attributes } = {}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const input = el('input', { ...attributes, id, className: 'pv-input', type, value, placeholder, required, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': [help && helpId, error && errorId].filter(Boolean).join(' ') || undefined });
  if (onInput) input.addEventListener('input', event => onInput(input.value, event));
  const node = el('div', { className: 'pv-field', 'data-invalid': Boolean(error) }, [label ? el('label', { className: 'pv-label', for: id }, [label, required ? el('span', { 'aria-hidden': 'true', className: 'pv-required' }, ' *') : null]) : null, input, help ? el('p', { className: 'pv-help', id: helpId }, help) : null, error ? el('p', { className: 'pv-error', id: errorId }, error) : null]);
  node.control = input;
  return node;
}

export function Search({ id = uid('search'), label = 'Search', placeholder = 'Search…', value = '', onInput } = {}) {
  const input = el('input', { id, className: 'pv-input', type: 'search', value, placeholder, 'aria-label': label, autocomplete: 'off' });
  if (onInput) input.addEventListener('input', event => onInput(input.value, event));
  const node = el('div', { className: 'pv-search', role: 'search', 'aria-label': label }, [Icon('search'), input]);
  node.control = input;
  return node;
}

export function Dropdown({ id = uid('select'), label, options = [], value, onChange, disabled = false } = {}) {
  const select = el('select', { id, className: 'pv-select', disabled, 'aria-label': label || 'Select an option' }, options.map(option => el('option', { value: option.value, disabled: option.disabled }, option.label)));
  if (value !== undefined) select.value = value;
  if (onChange) select.addEventListener('change', event => onChange(select.value, event));
  const node = el('div', { className: 'pv-field' }, [label ? el('label', { className: 'pv-label', for: id }, label) : null, select]);
  node.control = select;
  return node;
}

export function Card({ title, description, action, children = [], className = '' } = {}) {
  const titleId = uid('card-title');
  return el('section', { className: `pv-card ${className}`.trim(), 'aria-labelledby': title ? titleId : undefined }, [title || description || action ? el('div', { className: 'pv-card-head' }, [el('div', {}, [title ? el('h2', { id: titleId }, title) : null, description ? el('p', {}, description) : null]), action]) : null, el('div', { className: 'pv-card-body' }, children)]);
}

export function StatusBadge({ label, tone = 'neutral' } = {}) {
  return el('span', { className: 'pv-badge', 'data-tone': tone }, [el('span', { className: 'pv-badge-dot', 'aria-hidden': 'true' }), label]);
}

export function Alert({ title, description, tone = 'info', action } = {}) {
  return el('div', { className: 'pv-alert', 'data-tone': tone }, [Icon(tone === 'critical' || tone === 'warning' ? 'alert' : tone === 'success' ? 'check-circle' : 'info'), el('div', { className: 'pv-alert-content' }, [el('strong', {}, title), description ? el('p', {}, description) : null]), action]);
}

export function UserAvatar({ name = 'User', initials, size = 'md' } = {}) {
  const letters = initials || name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  return el('span', { className: `pv-avatar pv-avatar--${size}`, role: 'img', 'aria-label': name }, letters);
}

export function PageHeader({ title, description, actions = [] } = {}) {
  return el('header', { className: 'pv-page-header' }, [el('div', {}, [el('h1', {}, title), description ? el('p', {}, description) : null]), el('div', { className: 'pv-page-header-actions' }, actions)]);
}

export function Toolbar({ children = [], label = 'Page controls' } = {}) {
  // A group retains ordinary Tab navigation; role=toolbar would require roving focus.
  return el('div', { className: 'pv-toolbar', role: 'group', 'aria-label': label }, children);
}

export function Metric({ label, value, detail, tone = 'neutral', badge } = {}) {
  return el('div', { className: 'pv-metric', 'data-tone': tone }, [el('div', { className: 'pv-metric-head' }, [el('span', { className: 'pv-metric-label' }, label), badge]), el('div', { className: 'pv-metric-value' }, value), detail ? el('div', { className: 'pv-metric-detail' }, detail) : null]);
}

export function EmptyState({ title, description, icon = 'search', action } = {}) {
  return el('div', { className: 'pv-empty' }, [Icon(icon), el('h3', {}, title), description ? el('p', {}, description) : null, action]);
}

export function LoadingState({ label = 'Loading…', rows = 3 } = {}) {
  const node = el('div', { className: 'pv-loading', role: 'status', 'aria-label': label }, [el('span', { className: 'pv-sr-only' }, label), ...Array.from({ length: Math.max(1, Math.min(20, rows)) }, () => el('div', { className: 'pv-skeleton', 'aria-hidden': 'true' }))]);
  return node;
}

export function Tabs({ id = uid('tabs'), items = [], activeId, onChange } = {}) {
  const selected = items.some(item => item.id === activeId) ? activeId : items[0]?.id;
  const list = el('div', { className: 'pv-tab-list', role: 'tablist', 'aria-label': 'Views' });
  const panels = [];
  const buttons = [];
  const root = el('div', { className: 'pv-tabs', id }, [list]);
  function select(itemId, focus = false, notify = true) {
    const index = items.findIndex(item => item.id === itemId);
    if (index < 0) return;
    items.forEach((item, i) => {
      const active = i === index;
      buttons[i].setAttribute('aria-selected', String(active));
      buttons[i].tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    root.activeId = itemId;
    if (focus) buttons[index].focus();
    if (notify && onChange) onChange(itemId);
  }
  items.forEach((item, index) => {
    const tabId = `${id}-tab-${index}`;
    const panelId = `${id}-panel-${index}`;
    const button = el('button', { id: tabId, type: 'button', className: 'pv-tab', role: 'tab', 'aria-controls': panelId, 'aria-selected': 'false', tabindex: '-1', onClick: () => select(item.id) }, item.label);
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % items.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = items.length - 1;
      if (next !== undefined) { event.preventDefault(); select(items[next].id, true); }
    });
    buttons.push(button);
    list.append(button);
    panels.push(el('div', { id: panelId, className: 'pv-tab-panel', role: 'tabpanel', 'aria-labelledby': tabId, tabindex: '0', hidden: true }, item.content));
  });
  root.append(...panels);
  root.select = itemId => select(itemId);
  select(selected, false, false);
  return root;
}

export function Table({ caption, columns = [], rows = [], empty, onRowClick } = {}) {
  const table = el('table', { className: 'pv-table' }, [caption ? el('caption', { className: 'pv-sr-only' }, caption) : null, el('thead', {}, el('tr', {}, columns.map(column => el('th', { scope: 'col', className: column.numeric ? 'pv-table-numeric' : '', 'data-numeric': column.numeric ? 'true' : undefined }, column.label))))]);
  const body = el('tbody');
  if (rows.length === 0) body.append(el('tr', {}, el('td', { colspan: Math.max(1, columns.length) }, empty || EmptyState({ title: 'No results', description: 'Try changing your search or filters.' }))));
  rows.forEach(row => {
    const tr = el('tr');
    columns.forEach((column, index) => {
      const value = column.render ? column.render(row) : row[column.key];
      const content = onRowClick && index === 0 ? el('button', { type: 'button', className: 'pv-table-row-action', onClick: () => onRowClick(row) }, value) : value;
      tr.append(el(index === 0 ? 'th' : 'td', { scope: index === 0 ? 'row' : undefined, className: column.numeric ? 'pv-table-numeric' : '', 'data-numeric': column.numeric ? 'true' : undefined }, content));
    });
    body.append(tr);
  });
  table.append(body);
  return el('div', { className: 'pv-table-wrap', role: 'region', 'aria-label': caption || 'Data table', tabindex: '0' }, table);
}

export function ContextMenu({ label = 'Actions', items = [] } = {}) {
  const panelId = uid('menu');
  const trigger = Button({ label, icon: 'more', variant: 'ghost', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': panelId });
  const panel = el('div', { id: panelId, className: 'pv-menu-panel', role: 'menu', 'aria-label': label, hidden: true });
  const root = el('div', { className: 'pv-menu' }, [trigger, panel]);
  const buttons = [];
  function close(restoreFocus = false) {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside);
    document.removeEventListener('focusin', onFocusOutside);
    window.removeEventListener('resize', positionPanel);
    document.removeEventListener('scroll', positionPanel, true);
    if (restoreFocus) trigger.focus();
  }
  function onOutside(event) { if (!root.contains(event.target)) close(); }
  function onFocusOutside(event) { if (!root.contains(event.target)) close(); }
  function positionPanel() {
    if (panel.hidden) return;
    const anchor = trigger.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(panel).paddingTop) || 0;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    panel.style.position = 'fixed';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.minWidth = `min(var(--pv-menu-width), ${viewportWidth - gap * 2}px)`;
    panel.style.maxWidth = `${viewportWidth - gap * 2}px`;
    const availableBelow = Math.max(0, viewportHeight - anchor.bottom - gap * 2);
    const availableAbove = Math.max(0, anchor.top - gap * 2);
    const upward = panel.scrollHeight > availableBelow && availableAbove > availableBelow;
    panel.style.maxHeight = `${upward ? availableAbove : availableBelow}px`;
    panel.style.overflowY = 'auto';
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(gap, Math.min(anchor.right - rect.width, viewportWidth - rect.width - gap))}px`;
    panel.style.top = `${upward ? anchor.top - rect.height - gap : anchor.bottom + gap}px`;
  }
  function open(last = false) {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('focusin', onFocusOutside);
    positionPanel();
    window.addEventListener('resize', positionPanel);
    document.addEventListener('scroll', positionPanel, true);
    const available = buttons.filter(button => !button.disabled);
    available[last ? available.length - 1 : 0]?.focus();
  }
  items.forEach(item => {
    const button = el('button', { className: 'pv-menu-item', role: 'menuitem', type: 'button', tabindex: '-1', disabled: item.disabled, onClick: () => { close(true); item.onSelect?.(); } }, [item.icon ? Icon(item.icon) : null, item.label]);
    panel.append(button);
    buttons.push(button);
  });
  trigger.addEventListener('click', () => panel.hidden ? open() : close());
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(event.key === 'ArrowUp'); }
  });
  panel.addEventListener('keydown', event => {
    const available = buttons.filter(button => !button.disabled);
    const index = available.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % available.length;
    if (event.key === 'ArrowUp') next = (index - 1 + available.length) % available.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = available.length - 1;
    if (next !== undefined) { event.preventDefault(); available[next]?.focus(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    if (event.key === 'Tab') close(true);
    if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const ordered = [...available.slice(index + 1), ...available.slice(0, index + 1)];
      const matching = ordered.find(button => button.textContent.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
      if (matching) { event.preventDefault(); matching.focus(); }
    }
  });
  root.dismiss = () => close(true);
  return root;
}

let bodyLockCount = 0;
let bodyOverflow = '';
let bodyPadding = '';
function lockBody() {
  if (bodyLockCount++ > 0) return;
  bodyOverflow = document.body.style.overflow;
  bodyPadding = document.body.style.paddingRight;
  const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  if (gap) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`;
  document.body.style.overflow = 'hidden';
}
function unlockBody() {
  if (bodyLockCount === 0 || --bodyLockCount > 0) return;
  document.body.style.overflow = bodyOverflow;
  document.body.style.paddingRight = bodyPadding;
}

function createDialog({ title, description, children = [], actions = [] } = {}, isDrawer = false) {
  const titleId = uid('dialog-title');
  const descriptionId = uid('dialog-description');
  const node = el('dialog', { className: isDrawer ? 'pv-dialog pv-drawer' : 'pv-dialog', 'aria-labelledby': titleId, 'aria-describedby': description ? descriptionId : undefined });
  const closeButton = Button({ label: isDrawer ? 'Close details' : 'Close dialog', icon: 'close', iconOnly: true, variant: 'ghost', onClick: () => node.dismiss() });
  const heading = el('h2', { id: titleId, tabindex: '-1' }, title);
  node.append(el('div', { className: 'pv-dialog-head' }, [el('div', {}, [heading, description ? el('p', { id: descriptionId }, description) : null]), closeButton]), el('div', { className: 'pv-dialog-body' }, children));
  if ([actions].flat().filter(Boolean).length) node.append(el('div', { className: 'pv-dialog-actions' }, actions));
  let returnTo = null;
  let locked = false;
  // HTMLDialogElement already has a boolean .open accessor. Define an own method
  // rather than assigning through that setter; state uses the native attribute.
  Object.defineProperty(node, 'open', { value: trigger => {
    if (node.hasAttribute('open')) return;
    returnTo = trigger instanceof HTMLElement ? trigger : document.activeElement;
    if (!node.isConnected) document.body.append(node);
    node.showModal();
    lockBody();
    locked = true;
    // Heading gives context without unexpectedly opening a mobile keyboard.
    heading.focus({ preventScroll: true });
  } });
  node.dismiss = () => { if (node.hasAttribute('open')) node.close(); };
  node.addEventListener('close', () => {
    if (locked) { unlockBody(); locked = false; }
    if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
  });
  node.addEventListener('click', event => {
    if (event.target !== node) return;
    const rect = node.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) node.dismiss();
  });
  node.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || event.defaultPrevented) return;
    const controls = [...node.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')].filter(control => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length && !control.closest('[hidden], [inert]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); heading.focus(); }
    else if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  // showModal supplies background inertness and Escape; boundary wrapping keeps
  // Tab inside the component rather than transferring focus to browser chrome.
  return node;
}

export function Modal(options) { return createDialog(options); }
export function Drawer(options) { return createDialog(options, true); }

export function Toast({ message, tone = 'success', action } = {}) {
  const previousFocus = document.activeElement;
  let region = document.getElementById('pv-toast-region');
  if (!region) {
    region = el('div', { id: 'pv-toast-region', className: 'pv-toast-region', 'aria-label': 'Notifications' });
    document.body.append(region);
  }
  const node = el('div', { className: 'pv-toast', 'data-tone': tone }, [Icon(tone === 'critical' || tone === 'warning' ? 'alert' : tone === 'success' ? 'check-circle' : 'info'), el('span', { className: 'pv-toast-message', role: tone === 'critical' ? 'alert' : 'status', 'aria-live': tone === 'critical' ? 'assertive' : 'polite', 'aria-atomic': 'true' }), action]);
  let timer;
  let startedAt;
  let remaining = 6000;
  let hovered = false;
  let focused = false;
  let dismissed = false;
  function pause() {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  }
  function resume() {
    if (hovered || focused || dismissed || timer) return;
    startedAt = Date.now();
    timer = setTimeout(() => node.dismiss(), remaining);
  }
  node.dismiss = () => {
    const restoreFocus = node.contains(document.activeElement);
    dismissed = true;
    clearTimeout(timer);
    node.remove();
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  node.append(Button({ label: 'Dismiss notification', icon: 'close', iconOnly: true, variant: 'ghost', onClick: () => node.dismiss() }));
  node.addEventListener('mouseenter', () => { hovered = true; pause(); });
  node.addEventListener('mouseleave', () => { hovered = false; resume(); });
  node.addEventListener('focusin', () => { focused = true; pause(); });
  node.addEventListener('focusout', event => { if (!node.contains(event.relatedTarget)) { focused = false; resume(); } });
  region.append(node);
  // Populate after insertion so assistive technology observes a live-region update.
  requestAnimationFrame(() => { if (!dismissed) node.querySelector('.pv-toast-message').textContent = message; });
  resume();
  return node;
}

export function Sidebar({ label = 'Application navigation', items = [], activeId } = {}) {
  const root = el('nav', { className: 'pv-sidebar', 'aria-label': label });
  const list = el('ul', { className: 'pv-sidebar-list' });
  const buttons = [];
  function select(id) {
    buttons.forEach(({ item, button }) => {
      if (item.id === id) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    root.activeId = id;
  }
  items.forEach(item => {
    const button = el('button', { className: 'pv-sidebar-item', type: 'button', onClick: () => { select(item.id); item.onSelect?.(item.id); } }, [item.icon ? Icon(item.icon) : null, el('span', {}, item.label)]);
    buttons.push({ item, button });
    list.append(el('li', {}, button));
  });
  root.append(list);
  root.select = select;
  select(activeId);
  return root;
}

export function Tooltip({ text, trigger } = {}) {
  if (!(trigger instanceof HTMLElement)) throw new TypeError('Tooltip requires a focusable HTML element as its trigger.');
  const id = uid('tooltip');
  const tip = el('span', { id, className: 'pv-tooltip-content', role: 'tooltip', hidden: true }, text);
  const describedBy = trigger.getAttribute('aria-describedby');
  trigger.setAttribute('aria-describedby', [describedBy, id].filter(Boolean).join(' '));
  const root = el('span', { className: 'pv-tooltip' }, [trigger, tip]);
  let timer;
  let focused = false;
  let hovered = false;
  const show = () => { clearTimeout(timer); tip.hidden = false; };
  const hide = () => { clearTimeout(timer); tip.hidden = true; };
  root.addEventListener('mouseenter', () => { hovered = true; clearTimeout(timer); timer = setTimeout(show, 350); });
  root.addEventListener('mouseleave', () => {
    hovered = false;
    if (!focused) {
      clearTimeout(timer);
      // Allow the pointer to cross the visual gap between trigger and tooltip.
      timer = setTimeout(hide, 180);
    }
  });
  trigger.addEventListener('focus', () => { focused = true; show(); });
  trigger.addEventListener('blur', () => { focused = false; if (!hovered) hide(); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && !tip.hidden) { event.stopPropagation(); hide(); } });
  return root;
}
