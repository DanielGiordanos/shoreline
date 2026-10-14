/* Pravix PDF — one small API for every PDF job in Pravix (Forms, Flow, the packet).
   Oct 13 2026. The backend today is pdf-lib (MIT) for writing and pdf.js (Apache-2.0) for reading and drawing pages.
   PdfCraft's engine (MIT/Apache-2.0) is meant to slot in behind the same calls once it can be built for the browser;
   nothing outside this file knows which backend is running.

   Everything happens in this browser: no PDF is sent anywhere by this file.

   window.PvxPdf
     .ready()                         → Promise; loads the libraries once (≈1 MB gzipped, only when first needed)
     .inspect(bytes)                  → {pages:[{w,h,rotate}], fields:[{name,type,page,rect,options}], encrypted}
     .renderPage(bytes, i, scale)     → Promise<HTMLCanvasElement>   (i is 0-based)
     .fill(bytes, boxes, values, o)   → Promise<Uint8Array>          a filled, flattened copy (o.at fixes the dates)
     .merge(parts)                    → Promise<Uint8Array>          parts: [{bytes, title}] → one PDF with a bookmark each
     .redact(bytes, regions, o)       → Promise<Uint8Array>          pages with a region are redrawn as pictures: the text is gone
     .sha256(bytes)                   → Promise<string>              the fingerprint, hex
     .check(bytes)                    → Promise<{ok, pages, error}>  re-open the result before anyone relies on it
     .toB64 / .fromB64                 base64 helpers for saving in Firestore parts
     .pdfjs(bytes)                    → Promise<pdf.js document>     for Pravix Find (lib/pvx-find.js)
     .verifyRect(w, h, corner)        → [x,y,w,h]                    where fill's verify code sits on a w×h page (n126)

   fill's o.verify = {url, code, corner:'br'|'bl'|'tr'|'tl', lang} stamps a QR code for the url and the code in words on every
   page, on a small white plate, so anyone holding the paper can check it at /v/. The code is all it carries.

   A "box" is {id, page, rect:[x,y,w,h] in PDF points from the bottom-left, type:'text'|'check'|'signature'|'date',
   field (optional AcroForm field name), size (font pt, optional), align ('left'|'center')}. */
(function () {
  'use strict';
  var BASE = (function () { try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^/]*$/, ''); } catch (e) {} return '/forms/lib/'; })();
  var VER = '20261013a', QV = '20261013n';
  var loading = null, PL = null, PJ = null;

  function loadScript(src) { return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { bad(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); }
  function ready() {
    if (loading) return loading;
    loading = Promise.all([
      window.PDFLib ? Promise.resolve() : loadScript(BASE + 'vendor/pdf-lib.min.js?v=' + VER),
      import(BASE + 'vendor/pdf.min.mjs?v=' + VER)
    ]).then(function (r) {
      PL = window.PDFLib; PJ = r[1];
      PJ.GlobalWorkerOptions.workerSrc = BASE + 'vendor/pdf.worker.min.mjs?v=' + VER;
      if (!PL || !PJ) throw new Error('PDF libraries did not start');
      return true;
    });
    loading.catch(function () { loading = null; });
    return loading;
  }
  function u8(b) { return b instanceof Uint8Array ? b : new Uint8Array(b); }
  function copy(b) { return u8(b).slice(); }   /* pdf.js transfers (detaches) the buffer it gets */

  function sha256(bytes) {
    return crypto.subtle.digest('SHA-256', u8(bytes)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function toB64(bytes) { var b = u8(bytes), s = '', CH = 0x8000; for (var i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, b.subarray(i, i + CH)); return btoa(s); }
  function fromB64(str) { var s = atob(str), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }

  /* WinAnsi only (the standard Helvetica): accents and ñ are fine; anything else becomes '?' instead of failing the save */
  var WIN = /[ -~ -ÿ–—‘’“”•…€]/;
  function clean(t) { return String(t == null ? '' : t).replace(/[\r\n\t]+/g, ' ').split('').map(function (c) { return WIN.test(c) ? c : '?'; }).join(''); }

  function inspect(bytes) {
    return ready().then(function () { return PL.PDFDocument.load(copy(bytes), { ignoreEncryption: true, updateMetadata: false }); }).then(function (doc) {
      var pages = doc.getPages(), out = { pages: [], fields: [], encrypted: !!doc.isEncrypted };
      pages.forEach(function (p) { var s = p.getSize(); out.pages.push({ w: s.width, h: s.height, rotate: (p.getRotation().angle || 0) % 360 }); });
      var annotPage = {};
      pages.forEach(function (p, i) { var a = p.node.Annots && p.node.Annots(); if (a) a.asArray().forEach(function (x) { annotPage[String(x)] = i; }); });
      var form; try { form = doc.getForm(); } catch (e) { form = null; }
      (form ? form.getFields() : []).forEach(function (f) {
        var name = f.getName();
        var kind = f instanceof PL.PDFCheckBox ? 'check' : f instanceof PL.PDFRadioGroup ? 'radio' : (f instanceof PL.PDFDropdown || f instanceof PL.PDFOptionList) ? 'choice' : f instanceof PL.PDFSignature ? 'signature' : f instanceof PL.PDFButton ? 'button' : 'text';
        var options = []; try { if (f.getOptions) options = f.getOptions(); } catch (e) {}
        (f.acroField.getWidgets() || []).forEach(function (w, wi) {
          var r = w.getRectangle(), ref = null; try { ref = doc.context.getObjectRef(w.dict); } catch (e) {}
          var page = ref != null && annotPage[String(ref)] != null ? annotPage[String(ref)] : 0;
          out.fields.push({ name: name, type: kind, page: page, rect: [r.x, r.y, r.width, r.height], options: kind === 'radio' ? [options[wi]].filter(Boolean) : options, widget: wi });
        });
      });
      return out;
    });
  }

  var docCache = new Map();   /* sha → pdf.js document, so drawing pages of the same file doesn't reparse it */
  function pjDoc(bytes) {
    return ready().then(function () { return sha256(bytes); }).then(function (h) {
      if (docCache.has(h)) return docCache.get(h);
      var p = PJ.getDocument({ data: copy(bytes), isEvalSupported: false, enableXfa: false }).promise;
      docCache.set(h, p); if (docCache.size > 6) docCache.delete(docCache.keys().next().value);
      p.catch(function () { docCache.delete(h); });
      return p;
    });
  }
  function renderPage(bytes, i, scale) {
    return pjDoc(bytes).then(function (d) { return d.getPage((i || 0) + 1); }).then(function (pg) {
      var vp = pg.getViewport({ scale: scale || 1.5 }), c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      return pg.render({ canvasContext: ctx, viewport: vp, annotationMode: PJ.AnnotationMode ? PJ.AnnotationMode.ENABLE_FORMS : 2 }).promise.then(function () { c.dataset.scale = String(scale || 1.5); return c; });
    });
  }

  /* ---------- the verify code (n126) ---------- */
  var VQ = 42, VG = 6, VT = 118, VM = 16;   /* QR side, gap, text width, distance from the page edges (points) */
  function verifyRect(w, h, corner) {
    var c = corner || 'br', W = VQ + VG + VT, x = /l$/.test(c) ? VM : w - VM - W, y = /^t/.test(c) ? h - VM - VQ : VM;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10, W, VQ];
  }
  var qrP = null;
  function qrLib() { if (window.qrcode) return Promise.resolve(window.qrcode); if (!qrP) { qrP = loadScript(BASE + 'vendor/qrcode.js?v=' + QV).then(function () { return window.qrcode; }); qrP.catch(function () { qrP = null; }); } return qrP; }
  function stampVerify(doc, helv, v) {
    var qr = window.qrcode(0, 'M'); qr.addData(String(v.url)); qr.make();
    var n = qr.getModuleCount(), es = v.lang === 'es', ink = PL.rgb(0, 0, 0), grey = PL.rgb(0.32, 0.35, 0.40);
    var host = String(v.url).replace(/^https?:\/\//, '').replace(/\/?#.*$/, '').replace(/\/$/, '');
    var l1 = clean((es ? 'Escanee para verificar · ' : 'Scan to verify · ') + host), l2 = clean((es ? 'Código ' : 'Code ') + String(v.code || '').replace(/(.{4})(?=.)/g, '$1 '));
    doc.getPages().forEach(function (page) {
      var sz = page.getSize(), r = verifyRect(sz.width, sz.height, v.corner), left = /l$/.test(v.corner || 'br');
      var qx = left ? r[0] : r[0] + r[2] - VQ, qy = r[1], m = VQ / n;
      page.drawRectangle({ x: qx - 3, y: qy - 3, width: VQ + 6, height: VQ + 6, color: PL.rgb(1, 1, 1) });
      for (var row = 0; row < n; row++) {
        var c = 0;
        while (c < n) { if (!qr.isDark(row, c)) { c++; continue; } var c0 = c; while (c < n && qr.isDark(row, c)) c++;
          page.drawRectangle({ x: qx + c0 * m, y: qy + VQ - (row + 1) * m, width: (c - c0) * m + 0.02, height: m + 0.02, color: ink }); }
      }
      var size = 6; while (size > 4.5 && Math.max(helv.widthOfTextAtSize(l1, size), helv.widthOfTextAtSize(l2, size)) > VT) size -= 0.25;
      var w1 = helv.widthOfTextAtSize(l1, size), w2 = helv.widthOfTextAtSize(l2, size), tw = Math.max(w1, w2), tx = left ? qx + VQ + VG : qx - VG - tw;
      page.drawRectangle({ x: tx - 2, y: qy + VQ / 2 - size * 1.75, width: tw + 4, height: size * 3.4, color: PL.rgb(1, 1, 1) });
      page.drawText(l1, { x: left ? tx : qx - VG - w1, y: qy + VQ / 2 + size * 0.35, size: size, font: helv, color: grey });
      page.drawText(l2, { x: left ? tx : qx - VG - w2, y: qy + VQ / 2 - size * 1.05, size: size, font: helv, color: grey });
    });
  }

  function dataUrlBytes(u) { var i = String(u || '').indexOf(','); return i < 0 ? null : fromB64(u.slice(i + 1)); }

  function fill(bytes, boxes, values, o) {
    o = o || {};
    return ready().then(function () { return o.verify ? qrLib() : null; }).then(function () { return PL.PDFDocument.load(copy(bytes), { updateMetadata: false }); }).then(function (doc) {
      var at = o.at ? new Date(o.at) : new Date(0);
      return doc.embedFont(PL.StandardFonts.Helvetica).then(function (helv) {
        var pages = doc.getPages(), form = null; try { form = doc.getForm(); } catch (e) {}
        /* flatten the form's own fields first (their borders stay, nothing stays editable), then draw the values on top:
           one drawing path for every PDF, scanned or fillable */
        if (form && form.getFields().length) { try { form.flatten({ updateFieldAppearances: false }); } catch (e) { try { form.flatten(); } catch (e2) {} } }
        var jobs = [];
        (boxes || []).forEach(function (b) {
          var v = values ? values[b.id] : undefined, page = pages[b.page | 0]; if (!page || v == null || v === '' || v === false) return;
          var r = b.rect || [0, 0, 0, 0], x = +r[0] || 0, y = +r[1] || 0, w = Math.max(1, +r[2] || 1), h = Math.max(1, +r[3] || 1);
          if (b.type === 'signature') {
            var png = typeof v === 'string' ? dataUrlBytes(v) : (v && v.png ? dataUrlBytes(v.png) : null); if (!png) return;
            jobs.push(doc.embedPng(png).then(function (img) { var k = Math.min(w / img.width, h / img.height); var iw = img.width * k, ih = img.height * k; page.drawImage(img, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, width: iw, height: ih }); }));
            return;
          }
          if (b.type === 'check') {
            /* a drawn tick, so no font is involved */
            var s = Math.min(w, h), cx = x + (w - s) / 2, cy = y + (h - s) / 2, th = Math.max(0.9, s * 0.12), ink = PL.rgb(0, 0, 0);
            page.drawLine({ start: { x: cx + s * 0.18, y: cy + s * 0.52 }, end: { x: cx + s * 0.42, y: cy + s * 0.24 }, thickness: th, color: ink, lineCap: PL.LineCapStyle ? PL.LineCapStyle.Round : undefined });
            page.drawLine({ start: { x: cx + s * 0.42, y: cy + s * 0.24 }, end: { x: cx + s * 0.84, y: cy + s * 0.80 }, thickness: th, color: ink, lineCap: PL.LineCapStyle ? PL.LineCapStyle.Round : undefined });
            return;
          }
          var text = clean(b.type === 'date' && v instanceof Date ? v.toLocaleDateString('en-US') : v);
          var size = b.size || Math.max(6, Math.min(11, h * 0.62));
          while (size > 5 && helv.widthOfTextAtSize(text, size) > w - 4) size -= 0.5;
          var tw = helv.widthOfTextAtSize(text, size), tx = b.align === 'center' ? x + (w - tw) / 2 : x + 2;
          page.drawText(text, { x: tx, y: y + (h - size * 0.72) / 2, size: size, font: helv, color: PL.rgb(0.06, 0.07, 0.09) });
        });
        return Promise.all(jobs).then(function () {
          if (o.verify && o.verify.url) stampVerify(doc, helv, o.verify);
          doc.setProducer('Pravix Forms'); doc.setCreator('Pravix Flow'); doc.setCreationDate(at); doc.setModificationDate(at);
          if (o.title) doc.setTitle(clean(o.title));
          return doc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
        });
      });
    });
  }

  function merge(parts) {
    return ready().then(function () { return PL.PDFDocument.create({ updateMetadata: false }); }).then(function (out) {
      var marks = [];
      return (parts || []).reduce(function (chain, part) {
        return chain.then(function () { return PL.PDFDocument.load(copy(part.bytes), { updateMetadata: false }); }).then(function (src) {
          return out.copyPages(src, src.getPageIndices()).then(function (pp) { marks.push({ title: clean(part.title || 'Document'), page: out.getPageCount() }); pp.forEach(function (p) { out.addPage(p); }); });
        });
      }, Promise.resolve()).then(function () {
        addOutline(out, marks);
        var at = new Date(0); out.setProducer('Pravix Forms'); out.setCreator('Pravix Flow'); out.setCreationDate(at); out.setModificationDate(at);
        return out.save({ useObjectStreams: false });
      });
    });
  }
  /* one bookmark per document (pdf-lib has no outline API; this is the plain PDF structure) */
  function addOutline(doc, marks) {
    if (!marks.length) return;
    var ctx = doc.context, pages = doc.getPages(), PDFName = PL.PDFName, PDFString = PL.PDFHexString || PL.PDFString, PDFNumber = PL.PDFNumber, PDFNull = PL.PDFNull;
    var rootRef = ctx.nextRef(), refs = marks.map(function () { return ctx.nextRef(); });
    marks.forEach(function (m, i) {
      var page = pages[Math.min(m.page, pages.length - 1)];
      var dict = ctx.obj({});
      dict.set(PDFName.of('Title'), PL.PDFHexString.fromText(m.title));
      dict.set(PDFName.of('Parent'), rootRef);
      dict.set(PDFName.of('Dest'), ctx.obj([page.ref, PDFName.of('XYZ'), PDFNull, PDFNull, PDFNull]));
      if (i > 0) dict.set(PDFName.of('Prev'), refs[i - 1]);
      if (i < marks.length - 1) dict.set(PDFName.of('Next'), refs[i + 1]);
      ctx.assign(refs[i], dict);
    });
    var root = ctx.obj({}); root.set(PDFName.of('Type'), PDFName.of('Outlines'));
    root.set(PDFName.of('First'), refs[0]); root.set(PDFName.of('Last'), refs[refs.length - 1]); root.set(PDFName.of('Count'), PDFNumber.of(marks.length));
    ctx.assign(rootRef, root);
    doc.catalog.set(PDFName.of('Outlines'), rootRef);
    doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
  }

  /* regions: [{page, rect:[x,y,w,h]}]. Every page that has a region is redrawn as a picture at o.dpi (default 150) with
     the regions painted black, so the hidden text is not in the file at all. Pages without regions stay as they are. */
  function redact(bytes, regions, o) {
    o = o || {}; var dpi = o.dpi || 150, scale = dpi / 72;
    var byPage = {}; (regions || []).forEach(function (r) { (byPage[r.page | 0] = byPage[r.page | 0] || []).push(r.rect); });
    var idx = Object.keys(byPage).map(Number).sort(function (a, b) { return a - b; });
    return ready().then(function () { return PL.PDFDocument.load(copy(bytes), { updateMetadata: false }); }).then(function (doc) {
      return idx.reduce(function (chain, i) {
        return chain.then(function () { return renderPage(bytes, i, scale); }).then(function (c) {
          var ctx = c.getContext('2d'), pg = doc.getPage(i), sz = pg.getSize(), H = sz.height;
          ctx.fillStyle = '#000';
          byPage[i].forEach(function (r) { ctx.fillRect(Math.floor(r[0] * scale) - 2, Math.floor((H - r[1] - r[3]) * scale) - 2, Math.ceil(r[2] * scale) + 4, Math.ceil(r[3] * scale) + 4); });
          var jpg = dataUrlBytes(c.toDataURL('image/jpeg', 0.9));
          return doc.embedJpg(jpg).then(function (img) {
            var np = doc.insertPage(i, [sz.width, sz.height]); np.drawImage(img, { x: 0, y: 0, width: sz.width, height: sz.height });
            doc.removePage(i + 1);
          });
        });
      }, Promise.resolve()).then(function () {
        var at = new Date(0); doc.setProducer('Pravix Forms'); doc.setCreationDate(at); doc.setModificationDate(at);
        return doc.save({ useObjectStreams: false });
      });
    });
  }

  function check(bytes) {
    return ready().then(function () { return PJ.getDocument({ data: copy(bytes), isEvalSupported: false }).promise; })
      .then(function (d) { var n = d.numPages; return d.getPage(1).then(function () { try { (d.destroy || d.cleanup || function(){}).call(d); } catch (e) {} return { ok: n > 0, pages: n }; }); })
      .catch(function (e) { return { ok: false, pages: 0, error: String(e && e.message || e) }; });
  }

  window.PvxPdf = { ready: ready, inspect: inspect, renderPage: renderPage, fill: fill, merge: merge, redact: redact, sha256: sha256, check: check,
    toB64: toB64, fromB64: fromB64, clean: clean, pdfjs: pjDoc, verifyRect: verifyRect, backend: 'pdf-lib 1.17.1 + pdf.js 6.3.289', version: VER };
})();
