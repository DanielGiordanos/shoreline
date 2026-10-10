/* The Overview's 3D area view — Astra's three.js scene (scene/kura-area-scene.js, used exactly as she delivered it),
   driven by Kura's own data through its public API only: createAreaScene(container, options) → update / resize / anchor /
   truckAnchor / dispose. Nothing here reaches inside her scene.

   One scene lives while the Overview is open. Live-sync redraws, theme changes and switching areas update it in place (no
   new GPU context, and the truck keeps its place); leaving the Overview disposes it. Without WebGL, or on a phone (where
   the area view is hidden), the caller draws the 2D picture instead.

   What each part of the scene means — nothing is invented:
     kind      the area's kind, from its name (Emergency, ICU, Surgery, Pharmacy, Central Supply, Lab, Imaging; others are wards)
     size      how many items the area stocks, against the area that stocks the most (bigger rooms get another rack)
     fill      stock on hand against each item's target (or its reorder point when no target is set)
     activity  last week's movements in the area (uses, transfers, receipts, waste) against the busiest area; 0 parks the cart
     highlight the rack for the item that most needs attention (its sub-location, when stock is kept in one), toned by its state
     delivery  the area's next order: on the road in the last hours before it's due, at the dock once due, unloading while
               partly received, and leaving with its cases on the receiving pallet for a while after it's received

   Framing: Astra's camera always fits her whole lot (room, dock and access road) into the box it is given. To show the room
   bigger, Kura gives her a larger box ("stage"), placed so the room lands in the part of the page no card covers, and clips
   the rest. stageFor() mirrors her camera direction and rack layout to work that out; if a later version of her scene
   frames differently, only stageFor() needs adjusting. */
const HOUR = 3600000;
const KIND = { emergency: 'emergency', icu: 'icu', surgery: 'surgery', pharmacy: 'pharmacy', supply: 'supply', storage: 'supply', lab: 'lab', imaging: 'imaging' };
export const ROAD_HOURS = 4;          // a truck shows on the road this many hours before it's due
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : 0));
const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* The delivery an order puts in front of the area (see the top of this file). */
export function deliveryOf(order, now = Date.now()) {
  if (!order) return { state: 'received', progress: 1, cases: 0, unloaded: 0 };
  const lines = order.lines || [];
  const cases = Math.max(1, Math.min(63, lines.length));       // one case per order line
  if (order.status === 'received') return { state: 'received', progress: 1, cases, unloaded: 1 };
  if (order.status === 'partially_received') {
    const want = lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0), got = lines.reduce((n, l) => n + Math.min(Number(l.quantity) || 0, Number(l.received) || 0), 0);
    return { state: 'unloading', progress: 1, cases, unloaded: want ? clamp(got / want) : 0 };
  }
  const due = Date.parse(order.expected_at || '');
  if (order.status === 'backordered' || !Number.isFinite(due)) return { state: 'scheduled', progress: 0, cases, unloaded: 0 };
  if (now >= due) return { state: 'at_dock', progress: 1, cases, unloaded: 0 };
  // On the road: 0.3–0.7 of the approach path over the last ROAD_HOURS (the first stretch runs under the delivery card,
  // so the truck starts where it can be seen); the scene backs it in when it's due.
  return { state: 'arriving', progress: 0.3 + 0.4 * clamp(1 - (due - now) / (ROAD_HOURS * HOUR)), cases, unloaded: 0 };
}

/* ---------- Astra's layout, mirrored (read-only) for framing and rack counts ---------- */
function racksFor(kind, size) {
  if (size < .25) return [{ x: -4.5, z: -4.55, w: 2.25, h: 1.9 }];
  const one = [{ x: -4.4, z: -4.55, w: 2.85, h: 2.85 }], two = [{ x: -3.8, z: -4.55, w: 3.05, h: 2.85 }, { x: .15, z: -4.55, w: 3.05, h: 2.85 }];
  let a = ['emergency', 'icu', 'surgery'].includes(kind) ? one : kind === 'pharmacy' ? [{ x: -4.45, z: -4.55, w: 2.8, h: 2.85 }, { x: 0, z: -4.55, w: 2.8, h: 2.85 }, { x: 4.45, z: -4.55, w: 2.8, h: 2.85 }] : two;
  if (size > .6) a = [...a, { x: -4.52, z: .2, w: 2.65, h: 2.85 }];
  return a;
}
// Her camera looks from (-30, 30, 30) towards the room; these are its right and up axes.
const RX = [1 / Math.SQRT2, 0, 1 / Math.SQRT2], UP = [1 / Math.sqrt(6), 2 / Math.sqrt(6), -1 / Math.sqrt(6)];
function extent(points) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y, z] of points) { const u = x * RX[0] + y * RX[1] + z * RX[2], v = x * UP[0] + y * UP[1] + z * UP[2]; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
  return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
const corners = (xs, ys, zs) => xs.flatMap(x => ys.flatMap(y => zs.map(z => [x, y, z])));
function framePoints(kind, size) {
  const racks = racksFor(kind, size).flatMap(r => [[r.x - r.w / 2, r.h + .5, r.z], [r.x + r.w / 2, r.h + .5, r.z]]);
  const room = [...corners([-7.1, 7.1], [0], [-6.1, 6.1]), [-7, 1.72, -6], [7, 1.72, -6], [-7, 3.1, 3], ...racks];
  // what her camera fits (her resize()): the room plus the access road and three high points
  const full = [...room, ...corners([-16.65, -8.45], [0], [-11.05, 9.65]), [0, 4.3, 0], [-12, 3, -7]];
  // what Kura wants to fill the free space: the room, its racks and the dock end of a docked trailer
  const mine = [...room, ...corners([-9.6], [0, 2.7], [1.5, 4.5])];
  return { full: extent(full), room: extent(mine) };
}
/* Where to put her box (px, relative to the visible host) so the room fills `safe` (px insets from the host's edges). */
export function stageFor(kind, size, hostW, hostH, safe) {
  const s = safe || {}, L = s.left || 0, T = s.top || 0, sw = Math.max(40, hostW - L - (s.right || 0)), sh = Math.max(40, hostH - T - (s.bottom || 0));
  const { full, room } = framePoints(kind, size);
  const u = Math.max(room.w / sw, room.h / sh);           // scene units per pixel
  const W = full.w / (.9 * u), H = full.h / (.9 * u);     // her fit pads by 0.9; with this aspect she fits width and height alike
  const dx = (room.cx - full.cx) / u, dy = -(room.cy - full.cy) / u;
  return { left: Math.round(L + sw / 2 - (W / 2 + dx)), top: Math.round(T + sh / 2 - (H / 2 + dy)), width: Math.round(W), height: Math.round(H) };
}
export const rackCount = (kind, size) => racksFor(kind, size).length;

/* Scene options for one area. `zones` is every area (for size and activity, which are relative). */
/* The one accent shared with Treatment Sheets: cobalt in light mode, cyan in dark mode. */
export const ACCENT = { light: '#23439C', dark: '#38BDD2' };
const themeNow = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

export function sceneOptions(z, zones, extra = {}) {
  const maxItems = Math.max(1, ...zones.map(x => x.total)), maxMoves = Math.max(0, ...zones.map(x => x.moves || 0));
  const fills = z.rows.map(r => { const target = Number(r.rule.target || 0) || Number(r.rule.reorder_point || 0); return target > 0 ? clamp(r.available / target) : (r.available > 0 ? 1 : 0); });
  const worst = z.worst, kind = KIND[z.glyph] || 'ward', size = clamp(z.total / maxItems);
  const rack = worst?.branch ? Math.max(0, z.children.indexOf(worst.branch)) : 0;
  return {
    kind, size,
    fill: fills.length ? fills.reduce((a, b) => a + b, 0) / fills.length : 0,
    activity: maxMoves ? clamp((z.moves || 0) / maxMoves) : 0,
    highlight: worst ? rack % rackCount(kind, size) : null,     // Kura counts sub-locations; her rooms have 1–4 racks
    tone: !worst ? 'neutral' : (worst.state === 'out' || worst.state === 'critical') ? 'critical' : (worst.state === 'low' || worst.expiresIn != null && worst.expiresIn <= 30) ? 'warning' : 'neutral',
    delivery: deliveryOf(z.order),
    theme: themeNow(),
    palette: { accent: ACCENT[themeNow()] },   // Treatment Sheets cobalt (light) / cyan (dark), through Astra's palette option
    animate: !reducedMotion() && !idle,
    ...extra,
  };
}

/* What a screen reader hears for the picture, in Kura's words. */
export function sceneLabel(z, o) {
  const d = o.delivery, words = { scheduled: 'an order is placed', arriving: 'a delivery is on the road', at_dock: 'a delivery is at the dock', unloading: `a delivery is being received (${Math.round(d.unloaded * 100)}%)`, received: 'a delivery was just received' };
  return `${z.area.name}: shelves ${Math.round(o.fill * 100)}% of target${z.worst ? `, ${z.worst.item.name} needs the most attention` : ', no stock yet'}; ${z.order ? words[d.state] : 'no delivery on the way'}. Left and right arrows change the area.`;
}
const label = () => { const c = live?.stage.querySelector('canvas'); if (c && live.label) c.setAttribute('aria-label', live.label); };

/* ---------- one live scene ---------- */
let live = null;            // { host, stage, handle, z, areaId, order, options, safe, ready:[], failed:[] }
let loader = null, broken = false, timer = 0;

/* WebGL can be missing or blocked; check once, quietly, before three.js would log an error. */
function hasWebGL() {
  if (broken) return false;
  try { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
}
let webgl = null;
export function canUse3D() {
  if (globalThis.matchMedia?.('(max-width: 48rem)').matches) return false;        // the area view is hidden on phones
  if (webgl === null) webgl = hasWebGL();
  return webgl && !broken;
}

/* Size and place her box for the current area and free space. */
function place() {
  if (!live) return;
  const { host, stage, options, safe } = live, w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  const r = safe ? stageFor(options.kind, options.size, w, h, safe) : { left: 0, top: 0, width: w, height: h };
  const css = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  if (stage.style.cssText !== css) stage.style.cssText = css;        // her ResizeObserver refits her camera
}

/* Put the live scene into `parent` for area `z`. Returns a handle for positioning tags, or null when 3D isn't possible.
   onFail runs (once) if the scene can't start, so the caller can draw the 2D picture. */
export function mountAreaScene(parent, z, zones, { onPick, onTruck, onReady, onFail, safeArea } = {}) {
  if (!canUse3D()) return null;
  const switched = !!live && live.areaId !== z.area.id;
  const options = sceneOptions(z, zones, { onPick, onTruck });
  if (!live) {
    const host = document.createElement('div'), stage = document.createElement('div');
    host.className = 'ovx-scene-3d'; stage.className = 'ovx-scene-stage'; host.append(stage);
    live = { host, stage, handle: null, z, areaId: z.area.id, order: z.order, options, safe: safeArea || null, label: sceneLabel(z, options), ready: [], failed: [] };
    new ResizeObserver(place).observe(host);
    const mine = live;
    loader ||= import('./scene/kura-area-scene.js');
    loader.then(m => {
      if (live !== mine) return;
      place();
      try { mine.handle = m.createAreaScene(stage, mine.options); label(); }
      catch (e) { broken = true; releaseAreaScene(); console.warn('Kura: 3D area view unavailable —', e?.message || e); mine.failed.forEach(f => f()); return; }
      requestAnimationFrame(() => { host.classList.add('is-ready'); mine.ready.splice(0).forEach(f => f()); });
    }, e => { loader = null; broken = true; if (live === mine) releaseAreaScene(); console.warn('Kura: 3D area view failed to load —', e?.message || e); mine.failed.forEach(f => f()); });
  } else {
    live.z = z; live.areaId = z.area.id; live.order = z.order; live.options = options; live.label = sceneLabel(z, options);
    if (safeArea) live.safe = safeArea;
    place();
    if (live.handle) {
      if (switched && options.animate) {
        // Another area: show its delivery as it stands, without replaying how it got there (her update() applies a
        // delivery instantly while motion is off), then turn motion back on.
        live.handle.update({ ...options, animate: false });
        const h = live.handle; requestAnimationFrame(() => { if (live?.handle === h) { h.update({ animate: live.options.animate }); label(); } });
      } else live.handle.update(options);
      label();
    }
  }
  if (onReady) live.handle ? requestAnimationFrame(onReady) : live.ready.push(onReady);
  if (onFail) live.failed = [onFail];
  if (live.host.parentNode !== parent) parent.replaceChildren(live.host);
  // Keep the truck honest as the clock moves (it rolls up the road, then docks when due), and let go of the scene
  // if the Overview went away without saying so.
  clearInterval(timer);
  timer = setInterval(() => {
    if (!live) return clearInterval(timer);
    if (!live.host.isConnected) return releaseAreaScene();
    if (live.handle && live.order) { const delivery = deliveryOf(live.order); live.options = { ...live.options, delivery }; live.label = sceneLabel(live.z, live.options); live.handle.update({ delivery }); label(); }
  }, 20000);
  const view = live;
  const shift = p => (p ? { x: p.x + view.stage.offsetLeft, y: p.y + view.stage.offsetTop } : null);   // her px → host px
  return {
    anchor: () => (view === live && view.handle ? shift(view.handle.anchor()) : null),
    truckAnchor: () => (view === live && view.handle ? shift(view.handle.truckAnchor()) : null),
    highlight: () => (view === live ? view.options.highlight : null),
    host: view.host,
  };
}

/* The overlays moved (resize, layout change): refit the room into the space they leave. */
export function setSceneSafeArea(safeArea) {
  if (!live || JSON.stringify(live.safe) === JSON.stringify(safeArea)) return;
  live.safe = safeArea; place();
}

/* Motion pauses after a quiet minute (battery), and resumes on the next touch, click, key or scroll. */
let idle = false, idleTimer = 0;
function setIdle(v) {
  if (idle === v) return; idle = v;
  if (live?.handle) { live.options = { ...live.options, animate: !reducedMotion() && !idle }; live.handle.update({ animate: live.options.animate }); label(); }
}
function poke() { clearTimeout(idleTimer); setIdle(false); idleTimer = setTimeout(() => setIdle(true), 60000); }
if (globalThis.addEventListener) for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, poke, { passive: true });
poke();

/* Free the GPU context, observers and timers. Safe to call any time (leaving the Overview, signing out). */
export function releaseAreaScene() {
  clearInterval(timer); timer = 0;
  if (!live) return;
  const { host, handle } = live; live = null;
  try { handle?.dispose(); } catch {}
  host.remove();
}
