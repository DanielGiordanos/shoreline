/* "Fill from photos" — take up to three photos of a product label; Kura's label reader (a Cloud Function, see
   cloud/functions/) reads them with Claude and the item form opens filled in, every filled field marked for review.

   Photos never leave this page except inside that one request: they're shrunk here (≈1.5 MP JPEG), sent over HTTPS
   with the owner's Firebase sign-in, and dropped. Nothing is stored — not on the phone, not in Firebase. Only the
   fields the person saves become part of Kura, exactly as if typed.

   Available on shoreline.pravix.app (kura-web.js sets globalThis.kuraLabelReader); the local Mac version has no
   sign-in token for the function, so the panel isn't shown there. */
import { el, Button, Icon } from './ui/components.js?v=3a7528f6ad';

export const MAX_PHOTOS = 3;
const MAX_SIDE = 1568, QUALITY = 0.85, TIMEOUT_MS = 60000;
export const labelReader = () => globalThis.kuraLabelReader || null;

/* A phone photo → a JPEG no larger than MAX_SIDE on its long edge, as base64 (orientation as the camera took it). */
export async function shrinkPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file isn’t a photo Kura can read.')); i.src = url; });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', QUALITY));
    const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
    canvas.width = canvas.height = 0;
    return { media_type: 'image/jpeg', data, width: w, height: h };
  } finally { URL.revokeObjectURL(url); }
}

/* Send the photos; returns { fields, fda, model } or throws an Error with a message for people. */
export async function readLabel(photos, { barcode = null, categories = [], kind = 'label', order_lines = [] } = {}) {
  const lr = labelReader();
  if (!lr) throw new Error('Reading labels from photos works on shoreline.pravix.app.');
  if (!navigator.onLine) throw new Error('No connection. Reading a label needs the internet.');
  const token = await lr.token();
  if (!token) throw new Error('Sign in to Kura first.');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(lr.url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ photos: photos.map(p => ({ media_type: p.media_type, data: p.data })), barcode, categories, ...(kind === 'document' ? { kind, order_lines } : {}) }) });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? `Reading the ${kind === 'document' ? 'document' : 'label'} took too long. Try again.` : 'Kura couldn’t reach the label reader. Check the connection; if it keeps happening, the reader may not be set up yet.');
  } finally { clearTimeout(t); }
  let body = null; try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(body?.error?.message || (res.status === 404 ? 'The label reader isn’t set up yet.' : `The label reader answered ${res.status}. Try again.`));
  return body;
}

/* ---------- label fields → item form values ---------- */
const slug = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const isDefaultUnits = cur => (!cur.base_unit || cur.base_unit === 'each') && (!cur.units || !Object.keys(cur.units).length || (Object.keys(cur.units).length === 1 && Number(cur.units.each) === 1));
const asList = v => (Array.isArray(v) ? v : String(v || '').split(/[\s,]+/)).map(x => String(x).trim()).filter(Boolean);
// what the reader returns → which item field it lands in (for "check this" marks)
const FIELD_OF = { name: 'name', brand: 'brand', manufacturer: 'manufacturer', generic_name: 'generic_name', category: 'category', description: 'description', manufacturer_number: 'vendor_sku', barcodes: 'barcodes', container_unit: 'base_unit', storage: 'storage' };

/* Only empty fields are filled (a default "each" unit counts as empty); prices, vendors and par levels are left alone. */
export function itemValuesFrom(result, cur = {}, { items = [] } = {}) {
  const f = result?.fields || {}, fda = result?.fda || null;
  const values = {}, filled = [];
  const put = (k, v) => { if (v == null || v === '' || (Array.isArray(v) && !v.length)) return; values[k] = v; filled.push(k); };
  const empty = k => cur[k] == null || String(cur[k]).trim() === '';
  if (empty('name')) put('name', f.name || (fda ? [fda.brand_name || fda.generic_name, fda.strength].filter(Boolean).join(' ') : null));
  for (const k of ['brand', 'manufacturer', 'storage']) if (empty(k)) put(k, f[k]);
  if (empty('generic_name')) put('generic_name', f.generic_name || fda?.generic_name || null);
  if (empty('category') && f.category) {
    const known = [...new Set(items.map(i => i.category).filter(Boolean))].find(c => c.toLowerCase() === f.category.toLowerCase());
    put('category', known || f.category);
  }
  if (empty('description')) put('description', [f.description, f.contents && !String(f.description || '').includes(f.contents) ? `Contains ${f.contents}.` : null].filter(Boolean).join(' ') || null);
  if (empty('vendor_sku')) put('vendor_sku', f.manufacturer_number);
  if (empty('sku')) {
    const taken = new Set(items.map(i => String(i.sku || '').toUpperCase()));
    let sku = slug(f.manufacturer_number || [f.brand, f.contents].filter(Boolean).join(' ') || f.name);
    if (sku) { let n = 2; const base = sku; while (taken.has(sku)) sku = `${base}-${n++}`; put('sku', sku); }
  }
  const notes = [
    ...(f.regulatory || []), f.strength && !String(f.name || '').includes(f.strength) ? `Strength: ${f.strength}` : null,
    f.hazard_note ? `Hazard: ${f.hazard_note}` : null,
    fda ? `FDA record: ${[fda.brand_name, fda.generic_name, fda.strength, fda.dosage_form, fda.labeler, fda.ndc ? `NDC ${fda.ndc}` : null].filter(Boolean).join(' · ')}` : null,
    f.lot || f.expires ? `This box: ${[f.lot ? `lot ${f.lot}` : null, f.expires ? `expires ${f.expires}` : null].filter(Boolean).join(', ')} — enter when receiving` : null,
  ].filter(Boolean);
  if (empty('notes') && notes.length) put('notes', notes.join('\n'));
  // units: the container is the unit people count; a printed pack size becomes the purchase unit
  if (f.container_unit && isDefaultUnits(cur)) {
    const units = { [f.container_unit]: 1 };
    put('base_unit', f.container_unit); put('consume_unit', f.container_unit);
    if (f.pack && f.pack.unit !== f.container_unit) { units[f.pack.unit] = f.pack.count; put('purchase_unit', f.pack.unit); } else put('purchase_unit', f.container_unit);
    put('units', units);
  }
  const codes = [...new Set([...asList(cur.barcodes), ...(f.barcodes || [])])];
  if (codes.length > asList(cur.barcodes).length) put('barcodes', codes);
  if (f.tracks_lot_and_expiry || f.controlled) { if (!cur.lot_required) put('lot_required', true); if (f.tracks_lot_and_expiry && !cur.expiry_required) put('expiry_required', true); }
  if (f.controlled && !cur.restricted) put('restricted', true);
  if (f.hazardous && !cur.hazardous) put('hazardous', true);
  if (f.refrigerated && !cur.refrigerated) put('refrigerated', true);
  const unsure = (f.unsure || []).map(k => FIELD_OF[k]).filter(k => k && filled.includes(k));
  return { values, filled, unsure };
}

/* ---------- the panel at the top of "Add item" ---------- */
export function photoPanel({ onRead, barcode = null, categories = [], autoStart = false, max = MAX_PHOTOS, title = 'Fill from photos', text = null, readText = 'Read label', hint = 'Front, back and the barcode side work best.', read = null }) {
  const MAX_PHOTOS = max, files = [], input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', multiple: true, hidden: true, 'aria-hidden': 'true', tabIndex: -1 });
  const thumbs = el('div', { className: 'label-thumbs', 'aria-live': 'polite' });
  const status = el('p', { className: 'label-status', role: 'status' });
  const take = Button({ label: 'Take photo', icon: 'camera', variant: 'secondary', onClick: () => input.click() });
  const readBtn = Button({ label: readText, icon: 'check', variant: 'primary', onClick: () => go() });
  readBtn.disabled = true;
  const draw = () => {
    thumbs.replaceChildren(...files.map((f, i) => el('span', { className: 'label-thumb' }, [
      el('img', { src: f.preview, alt: `Photo ${i + 1}` }),
      el('button', { type: 'button', className: 'label-thumb-x', 'aria-label': `Remove photo ${i + 1}`, onClick: () => { URL.revokeObjectURL(f.preview); files.splice(i, 1); draw(); } }, Icon('close'))])));
    take.disabled = files.length >= MAX_PHOTOS; readBtn.disabled = !files.length;
    panel.classList.remove('is-error');
    take.lastChild.nodeValue = files.length ? 'Add photo' : 'Take photo';      // Button's label is its last text node
    status.textContent = files.length ? `${files.length} of ${MAX_PHOTOS} photos. ${hint}` : '';
  };
  input.addEventListener('change', () => {
    for (const file of [...input.files].slice(0, MAX_PHOTOS - files.length)) files.push({ file, preview: URL.createObjectURL(file) });
    input.value = ''; draw();
  });
  async function go() {
    readBtn.disabled = take.disabled = true; status.textContent = `${readText.replace(/^Read/, 'Reading')}…`; panel.classList.add('is-busy');
    try {
      const photos = []; for (const f of files) photos.push(await shrinkPhoto(f.file));
      const result = read ? await read(photos) : await readLabel(photos, { barcode, categories });
      files.forEach(f => URL.revokeObjectURL(f.preview)); files.length = 0;      // the photos are done with
      onRead(result, photos.length);
    } catch (e) { draw(); status.textContent = e.message || String(e); panel.classList.add('is-error'); }      // photos kept for another try
    finally { panel.classList.remove('is-busy'); }
  }
  const panel = el('section', { className: 'label-panel', 'aria-label': 'Fill from photos' }, [
    el('div', { className: 'label-head' }, [el('span', { className: 'label-icon', 'aria-hidden': 'true' }, Icon('camera')), el('div', {}, [
      el('strong', {}, title),
      el('span', {}, text || `Take up to ${MAX_PHOTOS} photos of the label. Kura reads them and fills in the form for you to check. Photos aren’t saved.`)])]),
    el('div', { className: 'label-actions' }, [take, thumbs, readBtn]), status, input]);
  if (autoStart) queueMicrotask(() => input.click());
  return panel;
}
