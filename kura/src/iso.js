/* Isometric drawing for the Kura Overview — Kura's own artwork, drawn from data.
   One projection, three face tones per material, painter's order (back to front). */
const SVG = 'http://www.w3.org/2000/svg';
const C = Math.cos(Math.PI / 6), S = 0.5;
export const iso = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z];
export const s = (tag, attrs = {}, children = []) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const c of [].concat(children)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
};
const pts = list => list.map(p => iso(...p).map(v => v.toFixed(1)).join(',')).join(' ');

/* Materials: [top, left (y+ face), right (x+ face)] — classes so light and dark themes recolour them. */
export const MAT = { white: 'iso-white', blue: 'iso-blue', floor: 'iso-floor', wall: 'iso-wall', glass: 'iso-glass', dark: 'iso-dark', soft: 'iso-soft' };

export function box(x, y, z, w, d, h, mat = MAT.white, extra = {}) {
  const g = s('g', { class: `iso-box ${mat}`, ...extra });
  g.append(s('polygon', { class: 'f-l', points: pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]) }));
  g.append(s('polygon', { class: 'f-r', points: pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]) }));
  g.append(s('polygon', { class: 'f-t', points: pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]) }));
  g.dataset.depth = String(x + y + z * 0.01 + w / 2 + d / 2);
  return g;
}
/* A soft contact shadow under an object. */
export function shadow(x, y, w, d, spread = 8) {
  return s('polygon', { class: 'iso-shadow', points: pts([[x - spread * .3, y + spread * .6, 0], [x + w + spread, y + spread * .6, 0], [x + w + spread, y + d + spread, 0], [x - spread * .3, y + d + spread, 0]]) });
}
/* A shelving rack with boxes filling `fill` (0–1) of its slots, front to back, bottom to top. */
export function rack(x, y, w, d, levels, fill, accent = 0.5) {
  // Drawn as one unit in its own back-to-front order: back posts, then each shelf with its boxes, then front posts.
  const g = s('g', { class: 'iso-rack' }), postW = 5, gap = 32, top = levels * gap + 8;
  const per = Math.max(1, Math.floor((w - 10) / 24)), sw = (w - 10) / per;
  const total = per * levels, n = Math.round(total * Math.max(0, Math.min(1, fill)));
  g.append(shadow(x, y, w, d, 12));
  g.append(box(x, y, 0, postW, postW, top, MAT.blue), box(x + w - postW, y, 0, postW, postW, top, MAT.blue), box(x, y + d - postW, 0, postW, postW, top, MAT.blue));
  let k = 0;
  for (let l = 0; l < levels; l++) {
    g.append(box(x, y, l * gap + 4, w, d, 3.5, 'iso-shelf'));
    for (let i = 0; i < per; i++, k++) {
      if (k >= n) continue;
      const blue = ((k * 37) % 100) / 100 < accent;
      g.append(box(x + 5 + i * sw, y + 3, l * gap + 7.5, sw - 3, d - 6, 21 - ((i + l) % 3) * 2.5, blue ? MAT.blue : MAT.white));
    }
  }
  g.append(box(x + w - postW, y + d - postW, 0, postW, postW, top, MAT.blue));
  g.append(box(x, y, top - 2, w, 4, 3, MAT.blue), box(x, y + d - 4, top - 2, w, 4, 3, MAT.blue));
  g.dataset.depth = String(x + y + w / 2 + d / 2);
  return g;
}
/* A small supply cart (Kura's take on the forklift): body, mast, crate. */
export function cart(x, y) {
  return [shadow(x, y, 26, 18, 6), box(x, y, 3, 26, 18, 9, MAT.white), box(x + 18, y + 2, 12, 6, 14, 18, MAT.soft), box(x + 2, y + 2, 12, 14, 14, 12, MAT.blue),
    box(x - 1, y - 1, 0, 5, 5, 4, MAT.dark), box(x + 22, y - 1, 0, 5, 5, 4, MAT.dark), box(x - 1, y + 14, 0, 5, 5, 4, MAT.dark), box(x + 22, y + 14, 0, 5, 5, 4, MAT.dark)];
}
/* A bed with a blue blanket — for wards. */
export function bed(x, y) { return [shadow(x, y, 56, 26, 8), box(x, y, 0, 56, 26, 12, MAT.white), box(x + 2, y + 2, 12, 34, 22, 4, MAT.blue), box(x + 40, y + 4, 12, 12, 18, 5, MAT.white), box(x + 52, y, 0, 4, 26, 26, MAT.soft)]; }
/* A cabinet, a pallet of cases, a crate. */
export function cabinet(x, y, h = 46) { return [shadow(x, y, 22, 20, 7), box(x, y, 0, 22, 20, h, MAT.blue), box(x + 22, y + 3, h * .55, 1, 14, 2, MAT.white)]; }
export function pallet(x, y, n = 6) {
  const out = [shadow(x, y, 44, 44, 8), box(x, y, 0, 44, 44, 5, 'iso-pallet')];
  const spots = [[2, 2, 0], [23, 2, 0], [2, 23, 0], [23, 23, 0], [2, 2, 1], [23, 2, 1], [2, 23, 1], [23, 23, 1]];
  spots.slice(0, n).forEach(([a, b, l], i) => out.push(box(x + a, y + b, 5 + l * 19, 19, 19, 18, i % 5 === 3 ? MAT.blue : MAT.white)));
  return out;
}
/* Painter's sort for a flat list of iso groups (keeps shadows first). */
export function paint(parent, parts) {
  const flat = [].concat(parts).flat(Infinity).filter(Boolean);
  const shadows = flat.filter(p => p.classList && p.classList.contains('iso-shadow'));
  // floors and walls are the room itself: always behind everything standing in it
  const base = flat.filter(p => /\biso-(floor|wall|door)\b/.test(p.getAttribute?.('class') || ''));
  const rest = flat.filter(p => !shadows.includes(p) && !base.includes(p)).sort((a, b) => Number(a.dataset?.depth || 0) - Number(b.dataset?.depth || 0));
  for (const p of [...base, ...shadows, ...rest]) parent.append(p);
}

/* A face-mapped glyph: draws a 24×24 line icon onto the left (y+) face of a cube. */
export function faceGlyph(glyphNode, x, y, z, w, h) {
  // left face spans +x along the face and -z upward; map icon u→x, v→down.
  const [ox, oy] = iso(x, y, z + h);
  const [ux, uy] = iso(1, 0, 0);
  const u = w / 24, v = h / 24;
  glyphNode.setAttribute('transform', `matrix(${(ux * u).toFixed(4)} ${(uy * u).toFixed(4)} 0 ${v.toFixed(4)} ${ox.toFixed(2)} ${oy.toFixed(2)})`);
  glyphNode.setAttribute('class', 'iso-face-glyph');
  return glyphNode;
}
