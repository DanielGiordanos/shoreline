/* Area-card icons — one small 3D object per kind of area, in the look of Astra's scene (same three.js, materials, colours,
   lights and camera angle; the shapes follow her bed, monitor, cabinet, operating table, pallet, rack and forklift).
   Kura's own code: her scene file is never touched. Icons are drawn once per theme on a small, short-lived canvas, cached as
   PNG data URLs, and the GPU context is freed straight after. Without WebGL, cards keep their 2D drawings. */
import * as THREE from './scene/three.module.min.js';

const PX = 192;
const PAL = {   // Astra's palettes (light/dark) for the materials the icons use
  light: { white: 0xffffff, accent: 0x23439c, metal: 0xc9d2e1, neutral: 0xdde3ed, linen: 0xdfe8f5, wood: 0xc6c9ca, package: 0xffffff, hemi: 2.1, key: 3 },
  dark: { white: 0xdce3ee, accent: 0x38bdd2, metal: 0x34425e, neutral: 0x8091ab, linen: 0x7187a6, wood: 0x637189, package: 0xdce3ee, hemi: 1.5, key: 2 },
};
const cache = new Map();                       // `${key}:${theme}` -> data URL
const pending = new Set();                     // being drawn right now
export const cachedIcon = (key, theme) => cache.get(`${key}:${theme}`) || null;

function kit(theme) {
  const p = PAL[theme] || PAL.light, mats = {};
  const mat = (name, color, extra = {}) => (mats[name] ||= new THREE.MeshStandardMaterial({ color, roughness: .72, ...extra }));
  ['white', 'accent', 'neutral', 'linen', 'wood', 'package'].forEach(n => mat(n, p[n], n === 'white' ? { roughness: .5 } : {}));
  mat('metal', p.metal, { metalness: .2 }); mat('rubber', 0x222b38); mat('dark', 0x263346); mat('glass', 0x647c96, { roughness: .3 });
  mat('monitor', 0x172a40); mat('screen', 0x4699c3, { emissive: 0x215368, emissiveIntensity: .4 });
  const unit = new THREE.BoxGeometry(1, 1, 1), geos = [unit];
  const sc = document.createElement('canvas'); sc.width = sc.height = 64; const g2 = sc.getContext('2d'), gr = g2.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.24)'); gr.addColorStop(.5, 'rgba(0,0,0,.13)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(sc), contactMat = new THREE.MeshBasicMaterial({ color: 0x1e2d50, map: shadowTex, transparent: true, depthWrite: false });
  const plane = new THREE.PlaneGeometry(1, 1); geos.push(plane);
  const mesh = (parent, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, typeof m === 'string' ? mats[m] : m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  const box = (parent, w, h, d, x, y, z, m = 'white') => { const o = mesh(parent, unit, m, x, y, z); o.scale.set(w, h, d); return o; };
  const cyl = (parent, r, h, x, y, z, m = 'metal', axis = 'y', seg = 16) => { const g = new THREE.CylinderGeometry(r, r, h, seg); geos.push(g); const o = mesh(parent, g, m, x, y, z); if (axis === 'z') o.rotation.x = Math.PI / 2; if (axis === 'x') o.rotation.z = Math.PI / 2; return o; };
  const beam = (parent, a, b, w, m = 'metal') => { const p1 = new THREE.Vector3(...a), q = new THREE.Vector3(...b), d = q.clone().sub(p1); const o = box(parent, w, d.length(), w, ...p1.add(q).multiplyScalar(.5).toArray(), m); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o; };
  const contact = (parent, x, z, w, d) => { const o = new THREE.Mesh(plane, contactMat); o.rotation.x = -Math.PI / 2; o.scale.set(w, d, 1); o.position.set(x, .01, z); o.userData.shadow = true; parent.add(o); return o; };
  const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const monitor = (parent, x, y, z) => { const g = group(parent, x, y, z); box(g, .48, .34, .06, 0, 0, 0, 'monitor'); box(g, .40, .25, .009, 0, .007, .038, 'screen'); beam(g, [0, -.15, 0], [0, -.57, 0], .035); box(g, .27, .04, .21, 0, -.57, 0, 'metal'); };
  const bed = (parent, monitored, iv) => {
    const g = group(parent); box(g, 1.62, .20, 2.30, 0, .91, 0, 'metal'); box(g, 1.54, .17, 2.19, 0, 1.09, 0, 'linen'); box(g, 1.22, .14, .48, 0, 1.23, -.70, 'white'); box(g, 1.63, .13, .12, 0, 1.39, -1.18, 'white');
    box(g, 1.58, .09, 1.25, 0, 1.21, .42, 'accent');                                  // blanket
    for (const x of [-.65, .65]) { for (const z of [-.85, .85]) { beam(g, [x, .28, z], [x, .92, z], .065); cyl(g, .105, .075, x, .26, z, 'rubber', 'z'); } beam(g, [x, 1.17, -.53], [x, 1.17, .53], .035); }
    if (monitored) { monitor(g, .93, 1.84, -.95); beam(g, [.93, .24, -.95], [.93, 1.38, -.95], .038); }
    if (iv) { cyl(g, .025, 2.2, -1.05, 1.1, -.9); box(g, .18, .3, .06, -1.05, 2.05, -.9, 'linen'); cyl(g, .25, .04, -1.05, .05, -.9); }
    contact(parent, 0, 0, 2, 2.7);
  };
  const cabinet = parent => { const g = group(parent); box(g, 1.22, 2.55, .88, 0, 1.47, 0, 'white'); box(g, 1.25, .06, .9, 0, 2.78, 0, 'metal'); box(g, 1.12, .10, .75, 0, .20, 0, 'metal'); for (const x of [-.3, .3]) { box(g, .56, 2.32, .026, x, 1.47, .459, 'neutral'); box(g, .035, .23, .035, x + (x < 0 ? .19 : -.19), 1.55, .49, 'metal'); } contact(parent, 0, 0, 1.5, 1.2); };
  const pallet = parent => { const g = group(parent); for (const x of [-.51, 0, .51]) box(g, .17, .10, 1.22, x, .22, 0, 'wood'); for (let i = 0; i < 5; i++) box(g, 1.5, .065, .2, 0, .30, -.49 + i * .244, 'wood'); contact(parent, 0, 0, 1.7, 1.35); };
  const BUILD = {
    emergency: g => { box(g, 1.15, 1.05, .75, 0, .82, 0, 'accent'); for (let i = 0; i < 4; i++) box(g, 1.0, .03, .02, 0, .45 + i * .25, .38, 'white'); box(g, 1.25, .06, .85, 0, 1.37, 0, 'white'); for (const x of [-.45, .45]) for (const z of [-.28, .28]) cyl(g, .1, .07, x, .12, z, 'rubber', 'z', 14); monitor(g, .2, 1.85, -.1); contact(g, 0, 0, 1.8, 1.3); },
    icu: g => bed(g, true), neurology: g => bed(g, true), medicine: g => bed(g, false), oncology: g => bed(g, false, true),
    surgery: g => { box(g, 1.65, .17, 2.45, 0, 1.02, 0, 'metal'); box(g, 1.57, .1, 2.32, 0, 1.15, 0, 'linen'); box(g, 1.6, .07, 1.5, 0, 1.23, .3, 'accent'); box(g, .5, .77, .57, 0, .61, 0, 'metal'); box(g, 1.25, .11, 1.5, 0, .25, 0, 'white');
      cyl(g, .035, 1.25, 1.25, .82, -.7); box(g, .75, .05, .5, 1.25, 1.45, -.7, 'accent'); for (let i = 0; i < 3; i++) box(g, .5, .02, .05, 1.25, 1.49, -.85 + i * .15, 'white'); cyl(g, .22, .05, 1.25, .05, -.7); contact(g, .3, 0, 2.6, 3); },
    pharmacy: g => { const w = 2.3, h = 2.1, d = 1; for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) box(g, .07, h, .07, x, h / 2 + .16, z, 'accent');
      for (let l = 0; l < 3; l++) { const y = .36 + l * (h - .5) / 2; box(g, w + .05, .06, d, 0, y, 0, 'white'); box(g, w, .08, .05, 0, y - .02, d / 2, 'accent'); for (let i = 0; i < 3; i++) box(g, .62, .42, .72, -w / 3 + i * w / 3, y + .25, 0, (i + l) % 3 === 1 ? 'accent' : (i + l) % 3 === 0 ? 'package' : 'neutral'); } contact(g, 0, 0, w + 1, 1.9); },
    supply: g => { pallet(g); for (let l = 0; l < 2; l++) for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) box(g, .62, .45, .52, (c - .5) * .7, .6 + l * .47, (r - .5) * .57, l === 1 && r === 1 && c === 0 ? 'accent' : (l + r + c) % 2 ? 'neutral' : 'package'); },
    lab: g => { box(g, 1.9, .08, .95, 0, 1.05, 0, 'white'); box(g, 1.75, .95, .85, 0, .55, 0, 'neutral'); monitor(g, .35, 1.43, -.15); for (let i = 0; i < 5; i++) cyl(g, .045, .3, -.75 + i * .13, 1.25, .2, i % 2 ? 'accent' : 'glass', 'y', 10); contact(g, 0, 0, 2.4, 1.5); },
    imaging: g => { box(g, 1.9, .08, .95, 0, 1.05, 0, 'white'); box(g, 1.75, .95, .85, 0, .55, 0, 'neutral'); monitor(g, .35, 1.43, -.15); cyl(g, .07, .35, -.6, 1.27, .15, 'dark', 'y', 12); box(g, .35, .05, .3, -.25, 1.12, .2, 'accent'); contact(g, 0, 0, 2.4, 1.5); },
    cart: g => { const b = group(g); box(b, 1.04, .35, .66, -.10, .47, 0, 'white'); box(b, 1.07, .055, .69, -.10, .30, 0, 'accent'); box(b, .40, .22, .67, -.47, .73, 0, 'white'); box(b, .30, .10, .36, -.15, .78, 0, 'dark');
      for (const z of [-.255, .255]) { box(b, .07, 1.45, .07, .45, .98, z, 'metal'); box(b, .07, .38, .07, -.38, 1.29, z, 'white'); box(b, 1.02, .055, .055, .03, 1.49, z, 'white'); box(b, .82, .045, .072, .85, .24, z, 'metal'); }
      for (const x of [-.44, .44]) for (const z of [-.365, .365]) cyl(b, .155, .095, x, .31, z, 'rubber', 'z', 18); box(b, .39, .34, .43, .75, .44, 0, 'accent'); b.rotation.y = Math.PI * .15; contact(g, 0, 0, 1.8, 1.2); },
    storage: g => BUILD.pharmacy(g), area: g => cabinet(g),
  };
  return { BUILD, dispose: () => { geos.forEach(x => x.dispose()); Object.values(mats).forEach(m => m.dispose()); contactMat.dispose(); shadowTex.dispose(); }, p };
}

/* Draw the icons that aren't cached yet, one per frame; onIcon(key, url) runs as each one is ready. */
export function drawIcons(keys, theme, onIcon) {
  const todo = [...new Set(keys)].filter(k => !cache.has(`${k}:${theme}`) && !pending.has(`${k}:${theme}`));
  if (!todo.length) return;
  todo.forEach(k => pending.add(`${k}:${theme}`));
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch { todo.forEach(k => pending.delete(`${k}:${theme}`)); return; }
  renderer.setPixelRatio(1); renderer.setSize(PX, PX, false); renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  const k = kit(theme), scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 120);
  scene.add(new THREE.HemisphereLight(0xf5f8ff, 0x8391aa, k.p.hemi));
  const key = new THREE.DirectionalLight(0xfffaf1, k.p.key); key.position.set(-10, 25, 13); key.castShadow = true; key.shadow.mapSize.set(512, 512);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 60 }); key.shadow.bias = -.00015; key.shadow.normalBias = .028; scene.add(key, key.target);
  const step = () => {
    const name = todo.shift();
    if (!name) { k.dispose(); renderer.dispose(); renderer.forceContextLoss(); return; }
    pending.delete(`${name}:${theme}`);
    const g = new THREE.Group(); (k.BUILD[name] || k.BUILD.area)(g); scene.add(g); g.updateMatrixWorld(true);
    const bb = new THREE.Box3(); g.traverse(o => { if (o.isMesh && !o.userData.shadow) bb.expandByObject(o, false); });
    const c = bb.getCenter(new THREE.Vector3()); cam.position.copy(c).add(new THREE.Vector3(-30, 30, 30)); cam.lookAt(c); cam.updateMatrixWorld(true);
    const ext = new THREE.Box3(); for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) ext.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse));
    const half = Math.max(ext.max.x - ext.min.x, ext.max.y - ext.min.y) / 2 / .94, mx = (ext.min.x + ext.max.x) / 2, my = (ext.min.y + ext.max.y) / 2;
    Object.assign(cam, { left: mx - half, right: mx + half, top: my + half, bottom: my - half }); cam.updateProjectionMatrix();
    key.target.position.copy(c); key.position.copy(c).add(new THREE.Vector3(-10, 25, 13));
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png'); scene.remove(g);
    cache.set(`${name}:${theme}`, url); onIcon?.(name, url);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
