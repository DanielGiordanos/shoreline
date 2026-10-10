/* QR labels for shelves, rooms, safes and crash carts.
   A label holds a link to this Kura with #at/<location id>. Scanned in Kura's scanner, or with the iPhone Camera
   (which opens the link), it sets "This device is in …" — or, for a kit, opens its check. Nothing else is in the code:
   no stock, no patient, nothing that changes when the stock does. Drawn with qrcode-generator (MIT, vendor/). */
import { el } from './ui/components.js?v=3a7528f6ad';
import qrcode from './vendor/qrcode-generator-2.0.4.esm.js';

const SVG = 'http://www.w3.org/2000/svg';
export const atLink = id => `${location.origin}${location.pathname.replace(/index\.html$/, '')}#at/${encodeURIComponent(id)}`;

/* "https://…/kura/#at/abc", "#at/abc" or "KURA:AT:abc" → "abc"; anything else → null */
export function atFromCode(raw) {
  const s = String(raw || '').trim();
  const m = /#at\/([^\s?#&]+)/.exec(s) || /^KURA:AT:(\S+)$/i.exec(s);
  return m ? decodeURIComponent(m[1]) : null;
}

/* The code as crisp SVG squares (scales to any print size). */
export function qrSVG(text, label = 'QR code') {
  const q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(), quiet = 4, size = n + quiet * 2;   // the 4-module quiet zone the QR spec asks for
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label);
  svg.setAttribute('shape-rendering', 'crispEdges');
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  const bg = document.createElementNS(SVG, 'rect'); bg.setAttribute('width', size); bg.setAttribute('height', size); bg.setAttribute('fill', '#fff');
  const path = document.createElementNS(SVG, 'path'); path.setAttribute('d', d); path.setAttribute('fill', '#000');
  svg.append(bg, path);
  return svg;
}

/* One printable label. kind: 'kit' | 'safe' | 'place' */
export function qrLabel(loc, { kind = 'place', parentName = '' } = {}) {
  const hint = kind === 'kit' ? 'Scan to check this kit' : kind === 'safe' ? 'Scan here before counting' : 'Scan: this device is here';
  return el('div', { className: 'qr-label' }, [qrSVG(atLink(loc.id), `QR code for ${loc.name}`),
    el('div', { className: 'qr-label-text' }, [el('strong', {}, loc.name), parentName ? el('span', {}, parentName) : null, el('small', {}, hint)])]);
}
