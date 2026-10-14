# Vendored OCR (Pravix Forms, Oct 13 2026)

Used only when a scanned PDF has no text layer, to read the printed labels next to each blank. Runs in this browser;
the page images never leave it.

- tesseract.js 7.0.0 (Apache-2.0) — tesseract.min.js, worker.min.js (source-map comments removed)
- tesseract.js-core 7.0.0 (Apache-2.0) — the three LSTM-only builds (plain, SIMD, relaxed SIMD); the browser loads one
- @tesseract.js-data/eng 1.0.0 (MIT; Tesseract data Apache-2.0) — 4.0.0_best_int/eng.traineddata.gz

From the npm registry with `npm pack`. Nothing is fetched from a CDN: lib/pvx-ocr.js points workerPath, corePath and
langPath at this folder.
