/* Numbers, set the way Apple sets them.
   - Equal-width digits wherever numbers line up (lists, tables, metrics) — CSS in look.css.
   - The unit sits lighter and smaller than the number: "20 mL" → <b>20</b> <small>mL</small>.
   - A true minus sign (−), not a hyphen.
   - A value that changes while you look rolls to its new number instead of jumping (off with reduced motion).
   watchNumbers() does all of it for anything Kura draws, so pages don't have to remember. */
import { el } from './ui/components.js?v=c011573571';

export const MINUS = '\u2212';
const QTY = /^([-−]?\d[\d,.\u202f\u00a0]*)\s([A-Za-z][A-Za-z]{0,11}(?: [a-z]{1,8})?)$/;   // "20 mL", "3 vials", "1,250 each"
const TYPESET = 'td, .kl-value b, .pv-metric-value, .kit-facts dd, .readable dd > span, .cs-balance b';
const ROLL = '.pv-metric-value, .ovx-big, .kl-value b';

/* a quantity as nodes: the number, then a lighter unit */
export function qty(n, unit, fmt = v => String(v)) {
  const text = String(fmt(n)).replace(/^-/, MINUS);
  return el('span', { className: 'kq' }, [el('span', { className: 'kq-n' }, text), unit ? el('span', { className: 'kq-u' }, ` ${unit}`) : null]);
}

function typeset(node) {
  if (node.dataset.kq || node.children.length || !node.firstChild || node.firstChild.nodeType !== 3) return;
  const t = node.textContent.trim();
  const m = QTY.exec(t);
  if (m) { node.dataset.kq = '1'; node.replaceChildren(el('span', { className: 'kq-n' }, m[1].replace(/^-/, MINUS)), el('span', { className: 'kq-u' }, ` ${m[2]}`)); return; }
  if (/^-\d/.test(t)) node.textContent = t.replace(/^-/, MINUS);
}

/* ---------- rolling ---------- */
const last = new Map();
const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
/* automated test browsers read numbers right after a change, so rolling is off there unless a test turns it on */
const automated = () => { try { return navigator.webdriver && localStorage.getItem('kura-roll') !== 'on'; } catch { return !!navigator.webdriver; } };
const parse = s => { const m = /^([^\d−-]{0,12}?)([-−]?)(\d[\d,.\u202f\u00a0]*)(.*)$/.exec(String(s).trim()); if (!m) return null; const v = Number(m[3].replace(/[,\u202f\u00a0]/g, '')); return Number.isFinite(v) ? { v: m[2] ? -v : v, lead: m[1], rest: m[4], decimals: (m[3].split('.')[1] || '').length } : null; };   // "Order 4", "20", "−3", "43%"
function keyOf(n) {
  const scope = n.closest('dialog')?.querySelector('h2, .pv-dialog-title')?.textContent || location.hash || 'page';
  if (n.matches('.kl-value b')) return `${scope}|${n.closest('.kl')?.getAttribute('aria-label') || ''}|${n.closest('.kl-row')?.querySelector('.kl-title')?.textContent || ''}`;
  if (n.matches('.pv-metric-value')) return `${scope}|${n.closest('.pv-metric')?.querySelector('.pv-metric-label')?.textContent || ''}`;
  const same = [...document.querySelectorAll(n.className ? '.' + [...n.classList].join('.') : n.tagName)];
  return `${scope}|${n.className}|${same.indexOf(n)}`;
}
function roll(n) {
  const target = n.querySelector('.kq-n') || n;
  const now = parse(target.textContent);
  if (!now) return;
  const key = keyOf(n), before = last.get(key);
  last.set(key, now.v);
  if (before == null || before === now.v || reduce() || automated() || !n.isConnected) return;
  const from = before, to = now.v, start = performance.now(), ms = 480, fmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: now.decimals, maximumFractionDigits: now.decimals });
  target.dataset.rolling = '1';
  const step = t => {
    if (!target.isConnected) return;
    const p = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - p, 3), v = from + (to - from) * e;
    target.textContent = now.lead + ((p < 1 ? v : to) < 0 ? MINUS : '') + fmt.format(Math.abs(p < 1 ? v : to)) + now.rest;
    if (p < 1) requestAnimationFrame(step); else delete target.dataset.rolling;
  };
  requestAnimationFrame(step);
}

function pass(root) {
  if (!(root instanceof Element)) return;
  const pick = sel => [...(root.matches(sel) ? [root] : []), ...root.querySelectorAll(sel)];
  for (const n of pick(TYPESET)) typeset(n);
  for (const n of pick(ROLL)) if (!n.querySelector('[data-rolling]') && !n.dataset.rolling) roll(n);
}

let watching = false;
export function watchNumbers(root = document.body) {
  if (watching) return; watching = true;
  pass(root);
  new MutationObserver(list => {
    for (const m of list) for (const node of m.addedNodes) if (node.nodeType === 1 && !node.closest?.('[data-rolling]')) pass(node);
  }).observe(root, { childList: true, subtree: true });
}
