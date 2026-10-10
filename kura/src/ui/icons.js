/** Authored 24px line icons: one stroke weight throughout the Pravix family. */
const shapes = {
  search: [['circle', { cx: 10.5, cy: 10.5, r: 6.5 }], ['path', { d: 'm16 16 4.5 4.5' }]],
  camera: [['path', { d: 'M4 8h3l1.6-2.4A1.4 1.4 0 0 1 9.8 5h4.4a1.4 1.4 0 0 1 1.2.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z' }], ['circle', { cx: 12, cy: 13, r: 3.5 }]],
  flashlight: [['path', { d: 'M8 3h8v4l-2 3v10a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V10L8 7V3Zm0 4h8M12 13v2' }]],
  close: [['path', { d: 'm6 6 12 12M6 18 18 6' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  minus: [['path', { d: 'M5 12h14' }]],
  check: [['path', { d: 'm5 12 4 4L19 6' }]],
  'check-circle': [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'm8 12 3 3 5-6' }]],
  'chevron-down': [['path', { d: 'm7 10 5 5 5-5' }]],
  'chevron-right': [['path', { d: 'm10 7 5 5-5 5' }]],
  'chevron-left': [['path', { d: 'm14 7-5 5 5 5' }]],
  'arrow-right': [['path', { d: 'M4 12h16m-6-6 6 6-6 6' }]],
  'arrow-up-right': [['path', { d: 'M6 18 18 6M6 6h12v12' }]],
  'arrow-down': [['path', { d: 'M12 4v16m-6-6 6 6 6-6' }]],
  package: [['path', { d: 'm12 3 9 5v8l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5M12 13v8M7.5 5.5l9 5' }]],
  boxes: [['path', { d: 'm12 2 5 3v6l-5 3-5-3V5l5-3Zm-5 9-5 3v6l5 3 5-3v-6m5-3 5 3v6l-5 3-5-3M7 17v6m10-6v6M2 14l5 3 5-3 5 3 5-3M7 5l5 3 5-3m-5 3v6' }]],
  grid: [['rect', { x: 3, y: 3, width: 7, height: 7, rx: 1 }], ['rect', { x: 14, y: 3, width: 7, height: 7, rx: 1 }], ['rect', { x: 3, y: 14, width: 7, height: 7, rx: 1 }], ['rect', { x: 14, y: 14, width: 7, height: 7, rx: 1 }]],
  list: [['path', { d: 'M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1' }]],
  layers: [['path', { d: 'm12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6' }]],
  home: [['path', { d: 'm3 10 9-7 9 7v10H3V10Zm6 10v-8h6v8' }]],
  people: [['path', { d: 'M3 21v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3m1-8a5 5 0 0 1 5 5v3M16 3a4 4 0 0 1 0 8' }], ['circle', { cx: 9, cy: 7, r: 4 }]],
  user: [['circle', { cx: 12, cy: 7, r: 4 }], ['path', { d: 'M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3' }]],
  calendar: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }], ['path', { d: 'M7 3v4m10-4v4M3 11h18' }]],
  clock: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 6v6l4 2' }]],
  filter: [['path', { d: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z' }]],
  settings: [['path', { d: 'M4 7h16M4 17h16M8 4v6m8 4v6' }]],
  more: [['circle', { cx: 5, cy: 12, r: 1 }], ['circle', { cx: 12, cy: 12, r: 1 }], ['circle', { cx: 19, cy: 12, r: 1 }]],
  edit: [['path', { d: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L5 15l-1 5Z' }]],
  trash: [['path', { d: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7' }]],
  copy: [['rect', { x: 8, y: 8, width: 13, height: 13, rx: 2 }], ['path', { d: 'M16 8V3H3v13h5' }]],
  download: [['path', { d: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5' }]],
  upload: [['path', { d: 'M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5' }]],
  refresh: [['path', { d: 'M20 8A8 8 0 0 0 6 5L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5' }]],
  alert: [['path', { d: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v.5' }]],
  info: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v6m0-10v.5' }]],
  bell: [['path', { d: 'M5 9a7 7 0 0 1 14 0v6l2 3H3l2-3V9Zm5 12h4' }]],
  sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5' }]],
  moon: [['path', { d: 'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z' }]],
  monitor: [['rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }], ['path', { d: 'M12 17v4M7 21h10' }]],
  clipboard: [['path', { d: 'M8 5H5v17h14V5h-3M8 12h8M8 16h5' }], ['rect', { x: 8, y: 2, width: 8, height: 5, rx: 1 }]],
  chart: [['path', { d: 'M3 3v18h18M7 16v-5m5 5V6m5 10V9' }]],
  menu: [['path', { d: 'M3 6h18M3 12h18M3 18h18' }]],
  logout: [['path', { d: 'M9 3H3v18h6m5-5 4-4-4-4m-6 4h13' }]],
  location: [['path', { d: 'M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z' }], ['circle', { cx: 12, cy: 9, r: 2.5 }]],
  truck: [['path', { d: 'M1 4h13v13H1V4Zm13 5h5l4 5v3h-9' }], ['circle', { cx: 6, cy: 18, r: 3 }], ['circle', { cx: 18, cy: 18, r: 3 }]],
  shield: [['path', { d: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6' }]],
  barcode: [['path', { d: 'M3 4v16M6 4v16M10 4v16M13 4v16M18 4v16M21 4v16' }]],
  book: [['path', { d: 'M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3V3Zm9 2v17' }]],
  flow: [['rect', { x: 3, y: 3, width: 4, height: 18, rx: 1 }], ['rect', { x: 10, y: 3, width: 4, height: 12, rx: 1 }], ['rect', { x: 17, y: 3, width: 4, height: 7, rx: 1 }]],
};

const aliases = { inventory: 'package', overview: 'grid', dashboard: 'grid', command: 'grid', users: 'people', patients: 'people', rooms: 'home', stock: 'boxes', checkCircle: 'check-circle', 'alert-triangle': 'alert', warning: 'alert', x: 'close', dots: 'more', 'more-horizontal': 'more', 'bar-chart': 'chart', orders: 'clipboard', reports: 'chart', chevronDown: 'chevron-down', chevronRight: 'chevron-right', 'map-pin': 'location', 'shopping-cart': 'truck' };

/** Icons are decorative; their containing control owns the accessible label. */
export function Icon(name = 'package') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'pv-icon' };
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, value);
  for (const [tag, attributes] of shapes[aliases[name] || name] || shapes.package) {
    const part = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) part.setAttribute(key, String(value));
    svg.append(part);
  }
  return svg;
}

export const iconNames = Object.freeze(Object.keys(shapes));
