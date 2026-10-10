/* Kura's list and action kit — what replaces admin tables with "Action" columns.
   - listView: rows you tap to open; one line of title, one of detail, a value on the right. Same on desktop and iPhone.
   - moreMenu: the "…" button for the actions that aren't the main three.
   - confirmSheet: the one confirmation an irreversible action gets (Reverse, Dismiss, Recall).
   Everything uses Pravix components underneath. */
import { el, Button, EmptyState, ContextMenu, Icon } from './ui/components.js?v=3a7528f6ad';

/* rows: data; row(r) → { title, detail, meta: [strings], value, valueDetail, badge: node, tone, onOpen, label }.
   Paged at pageSize with Previous / Next, like the tables it replaces. */
export function listView({ caption, rows, row, empty, pageSize = 50, className = '' }) {
  const root = el('section', { className: `kl ${className}`.trim(), 'aria-label': caption });
  let page = 0;
  function draw() {
    if (!rows.length) { root.replaceChildren(empty || EmptyState({ title: 'Nothing here yet' })); return; }
    const slice = rows.slice(page * pageSize, (page + 1) * pageSize);
    const list = el('ul', { className: 'kl-list', role: 'list' }, slice.map(r => {
      const v = row(r);
      const inner = [
        v.tone ? el('i', { className: 'kl-dot', 'data-tone': v.tone, 'aria-hidden': 'true' }) : null,
        el('span', { className: 'kl-main' }, [el('strong', { className: 'kl-title' }, v.title),
          v.detail || (v.meta || []).length ? el('span', { className: 'kl-detail' }, [v.detail, ...(v.meta || [])].filter(Boolean).join(' · ')) : null]),
        v.badge || null,
        v.value != null ? el('span', { className: 'kl-value' }, [el('b', {}, String(v.value)), v.valueDetail ? el('small', {}, v.valueDetail) : null]) : null,
        v.onOpen ? el('span', { className: 'kl-chev', 'aria-hidden': 'true' }, [Icon('chevron-right')]) : null,
      ];
      return el('li', { className: 'kl-item', style: v.depth ? { '--depth': String(v.depth) } : undefined }, [v.onOpen
        ? el('button', { type: 'button', className: 'kl-row', 'aria-label': v.label || undefined, onClick: () => v.onOpen() }, inner)
        : el('div', { className: 'kl-row is-static' }, inner)]);
    }));
    const pages = Math.ceil(rows.length / pageSize);
    root.replaceChildren(...[list, pages > 1 ? el('div', { className: 'kl-pages' }, [
      el('span', { className: 'muted small' }, `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, rows.length)} of ${rows.length}`),
      Button({ label: 'Previous', size: 'sm', disabled: page === 0, onClick: () => { page--; draw(); } }),
      Button({ label: 'Next', size: 'sm', disabled: page + 1 >= pages, onClick: () => { page++; draw(); } }),
    ]) : null].filter(Boolean));
  }
  draw();
  return root;
}

/* "…" with the less-used actions. items: [{ label, icon?, onSelect, hidden? }] */
export function moreMenu(items, label = 'More') {
  const shown = items.filter(i => i && !i.hidden);
  if (!shown.length) return null;
  const menu = ContextMenu({ label, items: shown });
  menu.classList.add('kura-more');
  return menu;
}

/* One confirmation for an action that can't simply be undone.
   makeDialog comes from the app so the sheet behaves like every other one. */
export function confirmSheet(makeDialog, { title, message, confirmLabel, danger = true, reason = false, run }) {
  let dialog;
  const note = reason ? el('textarea', { className: 'pv-input', rows: 3, required: true, 'aria-label': 'Reason', placeholder: 'Why — this is kept with the record' }) : null;
  const error = el('p', { className: 'form-error', role: 'alert' });
  const go = Button({ label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: async () => {
    if (note && !note.value.trim()) { note.focus(); error.textContent = 'Add a reason first.'; return; }
    go.disabled = true; error.textContent = '';
    try { await run(note ? note.value.trim() : undefined); dialog.dismiss(); }
    catch (e) { error.textContent = e.message || String(e); go.disabled = false; }
  } });
  dialog = makeDialog({ title, description: message, children: [el('div', { className: 'stack' }, [note, error, el('div', { className: 'form-actions' }, [Button({ label: 'Cancel', onClick: () => dialog.dismiss() }), go])].filter(Boolean))] });
  dialog.classList.add('kura-confirm');
  return dialog;
}
