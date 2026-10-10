// Camera barcode scanning. Frames are decoded on this device; no image is stored or sent anywhere.
// Uses the browser's BarcodeDetector where it exists (Chrome, Android) and the bundled ZXing decoder
// elsewhere (iPhone/iPad Safari). Kura serves the decoder itself, so scanning works without the internet.

const ZXING_SRC = new URL('./vendor/zxing-0.21.3.min.js', import.meta.url).href;
const FORMATS = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'itf', 'data_matrix', 'qr_code'];
let zxingLoad;

export function cameraSupport() {
  if (!window.isSecureContext) return { ok: false, reason: 'https', message: 'The camera works only when Kura is opened over HTTPS on this device (or on this computer at 127.0.0.1). Type or use a hardware scanner instead, or open Kura through its secure address.' };
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'unsupported', message: 'This browser does not offer camera access. Type the barcode or use a hardware scanner.' };
  return { ok: true };
}

/** GS1 element strings (DataMatrix / GS1-128 on drug packaging): GTIN (01), expiry (17), lot (10), serial (21). */
export function parseGS1(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  s = s.replace(/^\]([CdQe])\d/, '');                               // symbology identifier
  const out = {};
  if (s.startsWith('(')) {                                            // human-readable form: (01)…(17)…(10)…
    for (const m of s.matchAll(/\((\d{2,4})\)([^()]*)/g)) out[m[1]] = m[2];
  } else {
    const GS = '\u001d', fixed = { '00': 18, '01': 14, '02': 14, '11': 6, '12': 6, '13': 6, '15': 6, '16': 6, '17': 6, '20': 2 };
    let i = 0, guard = 0;
    while (i < s.length && guard++ < 20) {
      if (s[i] === GS) { i++; continue; }
      const ai = s.slice(i, i + 2);
      if (!/^\d{2}$/.test(ai)) return null;
      if (fixed[ai]) { out[ai] = s.slice(i + 2, i + 2 + fixed[ai]); i += 2 + fixed[ai]; continue; }
      if (['10', '21', '22', '30', '37', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'].includes(ai)) {
        const end = s.indexOf(GS, i + 2);
        out[ai] = s.slice(i + 2, end < 0 ? s.length : end); i = end < 0 ? s.length : end + 1; continue;
      }
      return null;                                                    // an AI we don't read: not GS1 as far as we can tell
    }
  }
  if (!out['01'] || !/^\d{14}$/.test(out['01'])) return null;
  const r = { gtin: out['01'], lot: out['10'] || null, serial: out['21'] || null, expires: null };
  if (/^\d{6}$/.test(out['17'] || '')) {
    const y = 2000 + +out['17'].slice(0, 2), mo = +out['17'].slice(2, 4); let d = +out['17'].slice(4, 6);
    if (d === 0) d = new Date(Date.UTC(y, mo, 0)).getUTCDate();      // "00" day = last day of the month
    if (mo >= 1 && mo <= 12) r.expires = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return r;
}

/** Every code the item could be stored under: the scan itself, and for GS1 the GTIN as 14, 13 (EAN) and 12 (UPC) digits. */
export function codeCandidates(raw) {
  const text = String(raw || '').trim(), gs1 = parseGS1(text), out = [text];
  if (gs1) { const g = gs1.gtin; out.push(g, g.replace(/^0/, ''), g.replace(/^00/, '')); }
  else if (/^\d{12,13}$/.test(text)) out.push(text.padStart(14, '0'));
  return { codes: [...new Set(out.filter(Boolean))], gs1 };
}

function loadZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  return zxingLoad ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = ZXING_SRC; script.async = true;
    script.onload = () => window.ZXing ? resolve(window.ZXing) : reject(new Error('The barcode decoder did not load.'));
    script.onerror = () => { zxingLoad = null; reject(new Error('The barcode decoder could not be loaded. Reload Kura and try again.')); };
    document.head.append(script);
  });
}

async function makeDecoder() {
  if ('BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const formats = FORMATS.filter(f => supported.includes(f));
      if (formats.length) {
        const detector = new window.BarcodeDetector({ formats });
        return { name: 'native', decode: async canvas => (await detector.detect(canvas))[0]?.rawValue || null };
      }
    } catch { /* fall through to ZXing */ }
  }
  const Z = await loadZXing();
  const hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A,
    Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.ITF, Z.BarcodeFormat.DATA_MATRIX, Z.BarcodeFormat.QR_CODE]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const reader = new Z.MultiFormatReader(); reader.setHints(hints);
  return { name: 'zxing', decode: async canvas => {
    try {
      const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
      const result = reader.decode(bitmap);
      // ZXing reports the GS1 FNC1 separator as \u001d; keep it so lot/expiry parse correctly.
      return result?.getText() || null;
    } catch { return null; } finally { reader.reset(); }
  } };
}

/**
 * Start the camera inside `host` (the dialog body). Calls onCode(text) once, after the same code is read twice in a row
 * (one-dimensional codes misread more easily) or once for 2D codes. Returns { stop() }.
 */
export async function startScanner({ video, status, onCode, onTorch, signal }) {
  let stream, stopped = false, timer = 0, last = '', seen = 0, busy = false;
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const stop = () => {
    stopped = true; clearTimeout(timer);
    stream?.getTracks().forEach(t => t.stop()); stream = null;
    if (video) video.srcObject = null;
    document.removeEventListener('visibilitychange', onHidden);
  };
  const onHidden = () => { if (document.visibilityState === 'hidden') stop(); };
  document.addEventListener('visibilitychange', onHidden);
  signal?.addEventListener('abort', stop, { once: true });   // the sheet closed: release the camera even mid-start
  if (signal?.aborted) { stop(); return { stop }; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
  } catch (error) {
    stop();
    const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
    throw Object.assign(new Error(denied ? 'Camera access was not allowed. Allow the camera for this site in the browser settings, or type the barcode.' : 'No camera is available on this device. Type the barcode or use a hardware scanner.'), { code: denied ? 'denied' : 'no_camera' });
  }
  if (stopped) { stream.getTracks().forEach(t => t.stop()); stream = null; return { stop }; }
  video.setAttribute('playsinline', ''); video.muted = true; video.srcObject = stream;
  await video.play().catch(() => {});
  const track = stream.getVideoTracks()[0];
  const caps = track?.getCapabilities?.() || {};
  if (caps.torch && onTorch) onTorch(async on => { try { await track.applyConstraints({ advanced: [{ torch: !!on }] }); return true; } catch { return false; } });
  const decoder = await makeDecoder().catch(error => { status(error.message); return null; });
  if (stopped) return { stop };
  if (!decoder) { stop(); throw new Error('The barcode decoder is unavailable. Type the barcode instead.'); }
  status('Point the camera at the barcode');
  const tick = async () => {
    if (stopped) return;
    if (!busy && video.readyState >= 2 && video.videoWidth) {
      busy = true;
      try {
        // Decode the middle of the frame, where the guide is, at a size small enough for a phone to keep up.
        const vw = video.videoWidth, vh = video.videoHeight, side = Math.min(vw, vh) * 0.8, w = Math.min(vw * 0.9, side * 1.6), h = side * 0.75;
        const scale = Math.min(1, 1100 / w);
        canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
        ctx.drawImage(video, (vw - w) / 2, (vh - h) / 2, w, h, 0, 0, canvas.width, canvas.height);
        const text = await decoder.decode(canvas);
        if (text) {
          const twoD = text.length > 20 || /\u001d/.test(text) || !/^[\x20-\x7e]+$/.test(text);
          seen = text === last ? seen + 1 : 1; last = text;
          if (seen >= (twoD ? 1 : 2)) { navigator.vibrate?.(40); stop(); onCode(text, decoder.name); return; }
        }
      } finally { busy = false; }
    }
    timer = setTimeout(tick, 90);
  };
  tick();
  return { stop };
}
