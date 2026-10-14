/* Pravix Find — finds the blanks on a PDF that has no form fields (Oct 13 2026, n126).
   Underlines, boxed fields and tick boxes are found in a picture of each page; the printed words around them come from
   the PDF's own text, or — on a scan with no text — from OCR (tesseract.js, vendored in vendor/ocr/, loaded only then).
   Everything runs in this browser: no page image or word leaves it, and nothing here is saved.

   window.PvxFind
     .scan(bytes, o)  → Promise<{pages:[Page], ocr:bool}>   o.progress(text) is told what is happening
     .analyze(canvas, scale) → {lines, squares, rects} in canvas pixels (for tests)
   Page = {i, w, h, lines:[{x0,x1,y}], squares:[{x,y,s}], rects:[{x0,x1,y0,y1}], words:[{t,x0,x1,y0,y1}], ocr:bool, rotated:bool}
   in PDF points from the page's bottom-left corner, the same space as a box's rect. PvxForms.boxesFromScan turns it into boxes. */
(function () {
  'use strict';
  var BASE = (function () { try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^/]*$/, ''); } catch (e) {} return '/forms/lib/'; })();

  /* ---------- the picture: thin dark lines and boxes ---------- */
  function runs(B, W, H, G, MIN, horiz, S) {
    var segs = [], active = [], N = horiz ? H : W, L = horiz ? W : H;
    for (var a = 0; a < N; a++) {
      var cur = [], s = -1, last = -1, cnt = 0, b, v;
      for (b = 0; b < L; b++) {
        v = horiz ? B[a * W + b] : B[b * W + a];
        if (v) { if (s < 0) { s = b; cnt = 0; } last = b; cnt++; }
        else if (s >= 0 && b - last > G) { if (last - s + 1 >= MIN) cur.push([s, last, cnt]); s = -1; }
      }
      if (s >= 0 && last - s + 1 >= MIN) cur.push([s, last, cnt]);
      var next = [];
      for (var r = 0; r < cur.length; r++) {
        var c = cur[r], m = null;
        for (var k = 0; k < active.length; k++) { var g = active[k]; if (g.u) continue; if (Math.abs(g.b0 - c[0]) <= 2 * S && Math.abs(g.b1 - c[1]) <= 2 * S) { m = g; break; } }
        if (m) { m.u = true; m.a1 = a; m.b0 = Math.min(m.b0, c[0]); m.b1 = Math.max(m.b1, c[1]); m.n += c[2]; m.rows++; next.push(m); }
        else next.push({ a0: a, a1: a, b0: c[0], b1: c[1], n: c[2], rows: 1, u: true });
      }
      for (k = 0; k < active.length; k++) if (!active[k].u) segs.push(active[k]);
      for (k = 0; k < next.length; k++) next[k].u = false;
      active = next;
    }
    segs = segs.concat(active);
    return segs.map(function (g) { var len = g.b1 - g.b0 + 1; return { a0: g.a0, a1: g.a1, b0: g.b0, b1: g.b1, th: g.a1 - g.a0 + 1, len: len, fill: g.n / (g.rows * len) }; });
  }
  function analyze(canvas, S) {
    var W = canvas.width, H = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, W, H).data, B = new Uint8Array(W * H);
    for (var p = 0, q = 0; q < B.length; p += 4, q++) B[q] = (d[p] * 299 + d[p + 1] * 587 + d[p + 2] * 114) < 150000 ? 1 : 0;
    var G = Math.max(1, Math.round(S * 0.8)), MIN = Math.round(5 * S), TH = 3 * S;
    var hs = runs(B, W, H, G, MIN, true, S).filter(function (g) { return g.th <= TH && g.fill >= 0.8; });
    var vs = runs(B, W, H, G, Math.round(14 * S), false, S).filter(function (g) { return g.th <= TH && g.fill >= 0.8; });
    /* fraction of dark pixels in a column (x) between rows y0..y1, best of x-1..x+2 (edges are a pixel or two wide) */
    var col = function (x, y0, y1) { var best = 0; for (var xx = x - 1; xx <= x + 2; xx++) { if (xx < 0 || xx >= W) continue; var n = 0; for (var y = y0; y <= y1; y++) n += B[y * W + xx]; best = Math.max(best, n / Math.max(1, y1 - y0 + 1)); } return best; };
    var area = function (x0, y0, x1, y1) { var n = 0, t = 0; for (var y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (var x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) { n += B[y * W + x]; t++; } return t ? n / t : 0; };
    var shorts = hs.filter(function (g) { return g.len < 24 * S; }).sort(function (a, b) { return a.a0 - b.a0; });
    var longs = hs.filter(function (g) { return g.len >= 24 * S; }).sort(function (a, b) { return a.a0 - b.a0; });
    var used = new Set(), squares = [], rects = [], lines = [];
    /* tick boxes: a short top edge and a matching bottom edge about as far below as the box is wide, with both sides drawn */
    shorts.forEach(function (A) {
      if (used.has(A)) return;
      for (var j = 0; j < shorts.length; j++) {
        var Bq = shorts[j]; if (Bq === A || used.has(Bq) || Bq.a0 <= A.a1) continue;
        if (Math.abs(A.b0 - Bq.b0) > 1.5 * S || Math.abs(A.b1 - Bq.b1) > 1.5 * S) continue;
        var side = A.len, dist = Bq.a1 - A.a0 + 1; if (dist < 0.75 * side || dist > 1.3 * side) continue;
        if (col(A.b0, A.a0, Bq.a1) < 0.8 || col(A.b1 - 1, A.a0, Bq.a1) < 0.8) continue;
        if (area(A.b0 + A.th + 2, A.a1 + 2, A.b1 - A.th - 2, Bq.a0 - 2) > 0.2) continue;
        used.add(A); used.add(Bq); squares.push({ x0: A.b0, x1: A.b1 + 1, y0: A.a0, y1: Bq.a1 + 1 }); return;
      }
    });
    /* boxed fields: a long top edge and the nearest matching bottom edge 10–70 pt below, joined by both sides */
    longs.forEach(function (A) {
      if (used.has(A)) return;
      for (var j = 0; j < longs.length; j++) {
        var Bq = longs[j]; if (Bq === A || used.has(Bq) || Bq.a0 <= A.a1 + 6 * S) continue;
        if (Bq.a0 - A.a1 > 70 * S) break;
        if (Math.abs(A.b0 - Bq.b0) > 2 * S || Math.abs(A.b1 - Bq.b1) > 2 * S) continue;
        if (col(A.b0, A.a0, Bq.a1) < 0.8 || col(A.b1 - 1, A.a0, Bq.a1) < 0.8) break;
        used.add(A); used.add(Bq); rects.push({ x0: Math.max(A.b0, Bq.b0), x1: Math.min(A.b1, Bq.b1) + 1, y0: A.a1 + 1, y1: Bq.a0 }); return;
      }
    });
    /* underlines: what's left of the long thin lines, unless a table's column lines cross them */
    longs.forEach(function (A) {
      if (used.has(A)) return;
      var y = (A.a0 + A.a1) / 2, cross = vs.filter(function (v) { var x = (v.a0 + v.a1) / 2; return x > A.b0 + 3 * S && x < A.b1 - 3 * S && v.b0 <= y + 2 && v.b1 >= y - 2; }).length;
      if (cross) return;
      lines.push({ x0: A.b0, x1: A.b1 + 1, y0: A.a0, y1: A.a1 + 1 });
    });
    /* a slightly tilted scan breaks one line into steps: join pieces that continue each other */
    lines.sort(function (a, b) { return a.x0 - b.x0; });
    var joined = [];
    var tol = 3 * S + 2;
    lines.forEach(function (l) { var prev = joined.filter(function (j) { return l.x0 <= j.x1 + 3 * S && l.y0 <= j.ye1 + tol && l.y1 >= j.ye0 - tol; })[0];
      if (!prev) { joined.push({ x0: l.x0, x1: l.x1, y0: l.y0, y1: l.y1, ye0: l.y0, ye1: l.y1 }); return; }
      if (l.x1 > prev.x1) { prev.x1 = l.x1; prev.ye0 = l.y0; prev.ye1 = l.y1; }   /* ye: where the line is at its right end */
      prev.y0 = Math.min(prev.y0, l.y0); prev.y1 = Math.max(prev.y1, l.y1); });
    return { lines: joined, squares: squares, rects: rects };
  }

  /* ---------- the words ---------- */
  /* split "Name: ________" so the underscores (which are the blank, not the label) leave the word */
  function trimUnderscores(t, x0, x1) {
    var s = String(t || ''), n = s.length; if (!n) return null;
    var m = s.match(/^([^_]*?)\s*_{2,}.*$/);
    if (!m) { var c = s.replace(/_/g, '').trim(); return c ? { t: c, x0: x0, x1: x1 } : null; }
    var keep = m[1].trim(); if (!keep) return null;
    return { t: keep, x0: x0, x1: x0 + (x1 - x0) * (m[1].length / n) };
  }
  function textWords(page, view) {
    return page.getTextContent().then(function (tc) {
      var out = [];
      (tc.items || []).forEach(function (it) {
        if (!it.str || !it.str.trim()) return; var tr = it.transform || [1, 0, 0, 1, 0, 0], h = Math.hypot(tr[2], tr[3]) || it.height || 10;
        var x0 = tr[4] - view[0], x1 = x0 + (it.width || 0), base = tr[5] - view[1], w = trimUnderscores(it.str, x0, x1); if (!w) return;
        out.push({ t: w.t, x0: w.x0, x1: w.x1, y0: base - 0.2 * h, y1: base + 0.78 * h });
      });
      return out;
    });
  }
  var ocrP = null;
  function loadScript(src) { return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { bad(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); }
  function ocrWorker() {
    if (ocrP) return ocrP;
    var dir = BASE + 'vendor/ocr/';
    ocrP = (window.Tesseract ? Promise.resolve() : loadScript(dir + 'tesseract.min.js')).then(function () {
      return window.Tesseract.createWorker('eng', 1, { workerPath: dir + 'worker.min.js', corePath: dir.replace(/\/$/, ''), langPath: dir.replace(/\/$/, ''), workerBlobURL: false, gzip: true });
    });
    ocrP.catch(function () { ocrP = null; });
    return ocrP;
  }
  function ocrWords(canvas, S, Hpt) {
    return ocrWorker().then(function (w) { return w.recognize(canvas, {}, { tsv: true, text: false }); }).then(function (r) {
      var out = [];
      String(r && r.data && r.data.tsv || '').split('\n').forEach(function (row) {
        var c = row.split('\t'); if (c.length < 12 || c[0] !== '5') return;
        var conf = +c[10], t = (c.slice(11).join(' ') || '').trim(); if (!t || conf < 40) return;
        var L = +c[6], T = +c[7], Wd = +c[8], Hd = +c[9];
        var w = trimUnderscores(t, L / S, (L + Wd) / S); if (!w || /^[\-–—.·•|:;,]+$/.test(w.t)) return;
        out.push({ t: w.t, x0: w.x0, x1: w.x1, y0: Hpt - (T + Hd) / S, y1: Hpt - T / S, ocr: true });
      });
      return out;
    });
  }
  function endOcr() { if (!ocrP) return; var p = ocrP; ocrP = null; p.then(function (w) { try { w.terminate(); } catch (e) {} }).catch(function () {}); }

  /* letters like O and D look like tick boxes, and OCR reads a tick box as "O" or "[]": keep each where it belongs */
  function tidy(res) {
    var over = function (w, q) { var ix = Math.min(w.x1, q.x + q.s) - Math.max(w.x0, q.x), iy = Math.min(w.y1, q.y + q.s) - Math.max(w.y0, q.y); return ix > 0 && iy > 0 ? (ix * iy) / (q.s * q.s) : 0; };
    res.squares = res.squares.filter(function (q) { return q.s >= 7 && q.s <= 24 && !res.words.some(function (w) { return w.t.replace(/[^A-Za-z0-9]/g, '').length >= 2 && over(w, q) > 0.25; }); });
    res.words = res.words.filter(function (w) { return !(w.t.length <= 3 && res.squares.some(function (q) { return over(w, q) > 0.25; })); });
  }

  /* ---------- one page, then the whole file ---------- */
  function pageScan(doc, i, o) {
    return doc.getPage(i + 1).then(function (page) {
      var view = page.view || [0, 0, 612, 792], Wpt = view[2] - view[0], Hpt = view[3] - view[1], rot = ((page.rotate || 0) % 360 + 360) % 360;
      if (rot) return { i: i, w: Wpt, h: Hpt, lines: [], squares: [], rects: [], words: [], ocr: false, rotated: true };
      return textWords(page, view).then(function (words) {
        var chars = words.reduce(function (n, w) { return n + w.t.replace(/\s/g, '').length; }, 0), scanned = chars < 12, S = scanned ? 3 : 2;
        var vp = page.getViewport({ scale: S }), c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
          var a = analyze(c, S), pt = function (v) { return Math.round(v / S * 10) / 10; };
          var res = { i: i, w: Wpt, h: Hpt, ocr: false, rotated: false,
            lines: a.lines.map(function (l) { return { x0: pt(l.x0), x1: pt(l.x1), y: Math.round((Hpt - l.y0 / S) * 10) / 10 }; }),
            squares: a.squares.map(function (s) { var side = (s.x1 - s.x0 + s.y1 - s.y0) / 2; return { x: pt(s.x0), y: Math.round((Hpt - s.y1 / S) * 10) / 10, s: pt(side) }; }),
            rects: a.rects.map(function (r) { return { x0: pt(r.x0), x1: pt(r.x1), y0: Math.round((Hpt - r.y1 / S) * 10) / 10, y1: Math.round((Hpt - r.y0 / S) * 10) / 10 }; }),
            words: words };
          tidy(res);
          if (!scanned || o.ocr === false) { c.width = c.height = 0; return res; }
          if (o.progress) o.progress('Reading the words on page ' + (i + 1) + (o.pages > 1 ? ' of ' + o.pages : '') + '…');
          return ocrWords(c, S, Hpt).then(function (ws) { res.words = ws; res.ocr = true; tidy(res); c.width = c.height = 0; return res; },
            function (e) { console.warn('[find] ocr', e); res.ocrFailed = true; c.width = c.height = 0; return res; });
        });
      });
    });
  }
  function scan(bytes, o) {
    o = o || {};
    return PvxPdf.ready().then(function () { return PvxPdf.pdfjs(bytes); }).then(function (doc) {
      var n = doc.numPages, out = [], ch = Promise.resolve();
      for (var i = 0; i < n; i++) (function (i) { ch = ch.then(function () { if (o.progress) o.progress('Looking for blanks on page ' + (i + 1) + (n > 1 ? ' of ' + n : '') + '…'); return pageScan(doc, i, { progress: o.progress, pages: n, ocr: o.ocr }); }).then(function (p) { out.push(p); }); })(i);
      return ch.then(function () { endOcr(); return { pages: out, ocr: out.some(function (p) { return p.ocr; }), ocrFailed: out.some(function (p) { return p.ocrFailed; }) }; },
        function (e) { endOcr(); throw e; });
    });
  }
  window.PvxFind = { scan: scan, analyze: analyze, version: '20261013n' };
})();
