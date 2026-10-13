/* Pravix Forms — the shared model (Forms page + Flow). Oct 13 2026.
   A template is the hospital's own PDF plus "boxes": where each value goes on which page, and where it comes from.

   form_templates/{id}          {tenant_id, name, purpose:'ending'|'visit', kind:'euthanasia'|'died'|null, status:'draft'|'ready',
                                 file:{name,size,sha256,pages:[{w,h}],parts}, boxes:[Box], updated_at, updated_by, created_at, created_by}
   form_templates/{id}/parts/{n} {data: base64 slice}                 the PDF itself, in slices under Firestore's 1 MB limit
   visit_docs/{id}               {tenant_id, visit_id, template_id, title, kind, sha256, size, pages, parts, created_at, created_by,
                                 signed_by, witness, lang, regions:{contact:[...]}}   a signed PDF, written once, never changed
   visit_docs/{id}/parts/{n}     {data}

   Box = {id, page, rect:[x,y,w,h] (PDF points, bottom-left origin), type:'text'|'check'|'signature'|'date',
          src (a key from SOURCES), opt (for a check: the value that ticks it), label {en, es} (questions the family answers),
          required, field (the PDF's own field name, when it had one)} */
(function () {
  'use strict';
  var PART = 700000;   /* base64 characters per part (Firestore documents stop at 1 MiB) */

  /* where a value can come from. who: 'visit' = Flow fills it · 'family' = asked on the iPad (pre-filled when Flow knows it) ·
     'sign' = signatures and their dates · 'staff' = staff type it when they send the form */
  var SOURCES = [
    { k: 'owner.name', g: 'From the visit', t: 'Owner · full name', who: 'family', type: 'text', q: { en: 'Your full name', es: 'Su nombre completo' } },
    { k: 'owner.phone', g: 'From the visit', t: 'Owner · phone', who: 'family', type: 'text', contact: true, q: { en: 'Phone', es: 'Teléfono' } },
    { k: 'pet.name', g: 'From the visit', t: 'Pet · name', who: 'visit', type: 'text' },
    { k: 'pet.species', g: 'From the visit', t: 'Pet · species', who: 'visit', type: 'text' },
    { k: 'pet.breed', g: 'From the visit', t: 'Pet · breed', who: 'visit', type: 'text' },
    { k: 'pet.sex', g: 'From the visit', t: 'Pet · sex', who: 'visit', type: 'text' },
    { k: 'pet.age', g: 'From the visit', t: 'Pet · age', who: 'visit', type: 'text' },
    { k: 'pet.weight', g: 'From the visit', t: 'Pet · weight', who: 'visit', type: 'text' },
    { k: 'visit.number', g: 'From the visit', t: 'Visit number', who: 'visit', type: 'text' },
    { k: 'visit.date', g: 'From the visit', t: 'Visit date', who: 'visit', type: 'date' },
    { k: 'visit.doctor', g: 'From the visit', t: 'Doctor', who: 'visit', type: 'text' },
    { k: 'hospital.name', g: 'From the visit', t: 'Hospital name', who: 'visit', type: 'text' },
    { k: 'family.address', g: 'The family fills in', t: 'Street address', who: 'family', type: 'text', contact: true, q: { en: 'Street address', es: 'Dirección' } },
    { k: 'family.city', g: 'The family fills in', t: 'City', who: 'family', type: 'text', contact: true, q: { en: 'City', es: 'Ciudad' } },
    { k: 'family.state', g: 'The family fills in', t: 'State', who: 'family', type: 'text', contact: true, q: { en: 'State', es: 'Estado' } },
    { k: 'family.zip', g: 'The family fills in', t: 'ZIP', who: 'family', type: 'text', contact: true, q: { en: 'ZIP', es: 'Código postal' } },
    { k: 'family.email', g: 'The family fills in', t: 'Email', who: 'family', type: 'text', contact: true, q: { en: 'Email', es: 'Correo electrónico' } },
    { k: 'family.text', g: 'The family fills in', t: 'Another answer (you name it)', who: 'family', type: 'text', custom: true },
    { k: 'family.check', g: 'The family fills in', t: 'A yes / no box (you name it)', who: 'family', type: 'check', custom: true },
    { k: 'family.choice', g: 'The family fills in', t: 'One of several boxes (same question)', who: 'family', type: 'check', custom: true, group: true },
    { k: 'aftercare.care', g: 'Euthanasia & aftercare', t: 'Care of body · ticks when chosen', who: 'ending', type: 'check', opts: [['private', 'Private cremation'], ['communal', 'Communal cremation'], ['release', 'Release remains'], ['hold', 'Hold for instructions']] },
    { k: 'aftercare.urn', g: 'Euthanasia & aftercare', t: 'Urn', who: 'ending', type: 'text' },
    { k: 'aftercare.clay', g: 'Euthanasia & aftercare', t: 'Clay paw print · ticks when chosen', who: 'ending', type: 'check' },
    { k: 'aftercare.total', g: 'Euthanasia & aftercare', t: 'Fees · total', who: 'ending', type: 'text', fees: true },
    { k: 'sign.owner', g: 'Signatures', t: 'Owner signature', who: 'sign', type: 'signature' },
    { k: 'sign.owner_name', g: 'Signatures', t: 'Owner · printed name', who: 'sign', type: 'text' },
    { k: 'sign.owner_date', g: 'Signatures', t: 'Owner · date signed', who: 'sign', type: 'date' },
    { k: 'sign.witness', g: 'Signatures', t: 'Witness signature (staff in the room)', who: 'sign', type: 'signature' },
    { k: 'sign.witness_name', g: 'Signatures', t: 'Witness · printed name', who: 'sign', type: 'text' },
    { k: 'sign.witness_date', g: 'Signatures', t: 'Witness · date signed', who: 'sign', type: 'date' },
    { k: 'staff.text', g: 'Staff', t: 'Staff type it when sending (you name it)', who: 'staff', type: 'text', custom: true },
    { k: 'none', g: 'Leave blank', t: 'Nothing — leave this box empty', who: 'none', type: 'text' }
  ];
  var BYK = {}; SOURCES.forEach(function (s) { BYK[s.k] = s; });

  /* a first guess from the PDF's own field names, so a fillable PDF arrives mostly mapped */
  var GUESS = [
    [/owner.*(sig)|sig.*owner|client.*sig|^signature$/i, 'sign.owner', 'signature'], [/witness.*sig|sig.*witness/i, 'sign.witness', 'signature'],
    [/witness.*date|date.*witness/i, 'sign.witness_date', 'date'], [/owner.*date|date.*(owner|sign)|^date$/i, 'sign.owner_date', 'date'],
    [/print.*name|name.*print/i, 'sign.owner_name', 'text'],
    [/owner.*(name)|client.*name|^name$|owner$/i, 'owner.name', 'text'], [/phone|tel/i, 'owner.phone', 'text'], [/e-?mail/i, 'family.email', 'text'],
    [/address|street/i, 'family.address', 'text'], [/city|town/i, 'family.city', 'text'], [/state/i, 'family.state', 'text'], [/zip|postal/i, 'family.zip', 'text'],
    [/pet.*name|patient.*name|animal.*name|^pet$/i, 'pet.name', 'text'], [/species/i, 'pet.species', 'text'], [/breed/i, 'pet.breed', 'text'],
    [/weight/i, 'pet.weight', 'text'], [/sex|gender/i, 'pet.sex', 'text'], [/\bage\b/i, 'pet.age', 'text'],
    [/visit|record|case|chart/i, 'visit.number', 'text'], [/doctor|dvm|vet\b|clinician/i, 'visit.doctor', 'text'],
    [/care.*private|private/i, 'aftercare.care', 'check', 'private'], [/care.*communal|communal|group/i, 'aftercare.care', 'check', 'communal'],
    [/care.*release|release/i, 'aftercare.care', 'check', 'release'], [/care.*hold|hold/i, 'aftercare.care', 'check', 'hold'],
    [/urn/i, 'aftercare.urn', 'text'], [/clay|paw/i, 'aftercare.clay', 'check']
  ];
  function guess(field) {
    var n = String(field.name || '');
    for (var i = 0; i < GUESS.length; i++) {
      var g = GUESS[i]; if (!g[0].test(n)) continue;
      if (field.type === 'check' && g[2] !== 'check') continue;
      if (field.type !== 'check' && g[2] === 'check') continue;
      return { src: g[1], type: g[2], opt: g[3] || null };
    }
    return { src: field.type === 'check' ? 'family.check' : (field.type === 'signature' ? 'sign.owner' : null), type: field.type === 'check' ? 'check' : field.type === 'signature' ? 'signature' : 'text', opt: null };
  }
  function boxesFromFields(fields) {
    return (fields || []).filter(function (f) { return f.type !== 'button'; }).map(function (f, i) {
      var g = guess(f), label = humanize(f.name);
      return { id: 'b' + (i + 1).toString(36) + Math.random().toString(36).slice(2, 6), page: f.page | 0, rect: f.rect.map(function (v) { return Math.round(v * 10) / 10; }),
        type: g.type, src: g.src, opt: g.opt, field: f.name, guess: !!g.src, required: g.src && /^sign\.owner$|owner\.name/.test(g.src) ? true : false,
        label: g.src && BYK[g.src] && BYK[g.src].custom ? { en: label, es: '' } : null, group: g.src === 'family.choice' ? humanize(f.name) : null };
    });
  }
  function humanize(n) { return String(n || '').replace(/[_\-.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim().replace(/^./, function (c) { return c.toUpperCase(); }); }

  /* how complete a template is */
  /* a box Pravix guessed from the PDF's field name stays a suggestion (guess:true) until someone confirms or changes it;
     boxes saved before Oct 13 have no flag and count as confirmed */
  function progress(tpl) {
    var B = (tpl && tpl.boxes) || [], done = B.filter(function (b) { return isMapped(b); }).length;
    var toReview = B.filter(function (b) { return isMapped(b) && b.guess; }).length;
    var hasOwnerSig = B.some(function (b) { return b.src === 'sign.owner'; }), hasWitness = B.some(function (b) { return b.src === 'sign.witness'; });
    return { total: B.length, mapped: done, missing: B.length - done, review: toReview, confirmed: done - toReview, hasOwnerSig: hasOwnerSig, hasWitness: hasWitness,
      ready: B.length > 0 && done === B.length && toReview === 0 && hasOwnerSig };
  }
  function isConfirmed(b) { return isMapped(b) && !b.guess; }
  function isMapped(b) {
    if (!b || !b.src) return false; var s = BYK[b.src]; if (!s) return false;
    if (s.custom && !(b.label && String(b.label.en || '').trim())) return false;
    if (b.src === 'family.choice' && !(b.group && String(b.group).trim())) return false;
    if (b.src === 'aftercare.care' && !b.opt) return false;
    return true;
  }

  /* the questions the family answers on the iPad, in page order (top to bottom), choices grouped */
  function questions(tpl) {
    var B = ((tpl && tpl.boxes) || []).filter(function (b) { var s = BYK[b.src]; return s && s.who === 'family'; })
      .slice().sort(function (a, b) { return (a.page - b.page) || (b.rect[1] - a.rect[1]) || (a.rect[0] - b.rect[0]); });
    var out = [], seen = {};
    B.forEach(function (b) {
      var s = BYK[b.src];
      if (b.src === 'family.choice') { var g = String(b.group || 'Choose one'); if (seen['g:' + g]) { seen['g:' + g].options.push({ id: b.id, label: b.label || { en: '', es: '' } }); return; }
        var q = { kind: 'choice', key: 'g:' + g, title: { en: g, es: (b.groupEs || '') }, options: [{ id: b.id, label: b.label || { en: '', es: '' } }], required: !!b.required }; seen['g:' + g] = q; out.push(q); return; }
      var key = s.custom ? b.id : b.src; if (seen[key]) return;
      var q2 = { kind: b.type === 'check' ? 'check' : 'text', key: key, src: b.src, id: b.id, title: s.custom ? (b.label || { en: '', es: '' }) : (s.q || { en: s.t, es: '' }), required: !!b.required, contact: !!s.contact };
      seen[key] = q2; out.push(q2);
    });
    return out;
  }

  function fmtDate(d, lang) { try { return new Date(d).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } }

  /* ctx = {p (Flow visit), answers {key: value} (family + staff answers), aftercare {care, urn, clay, total} (euthanasia form),
           sign {owner:{png,name,at}, witness:{png,name,at}}, hospital, lang} → values for PvxPdf.fill */
  function resolve(tpl, ctx) {
    ctx = ctx || {}; var p = ctx.p || {}, a = ctx.answers || {}, ac = ctx.aftercare || {}, sg = ctx.sign || {}, out = {};
    var pick = function (k) {
      switch (k) {
        case 'owner.name': return a['owner.name'] != null ? a['owner.name'] : (p.owner || '');
        case 'owner.phone': return a['owner.phone'] != null ? a['owner.phone'] : (p.ownerPhone || '');
        case 'pet.name': return p.name || ''; case 'pet.species': return p.species || ''; case 'pet.breed': return p.breed || '';
        case 'pet.sex': return p.sex || ''; case 'pet.age': return p.ageDisplay || p.age || '';
        case 'pet.weight': return p.weight ? (String(p.weight) + (/[a-z]/i.test(String(p.weight)) ? '' : ' kg')) : '';
        case 'visit.number': return p.hid || ''; case 'visit.date': return fmtDate(p.arrival || new Date(), 'en');
        case 'visit.doctor': return (p.doctor && p.doctor !== 'unassigned') ? p.doctor : ''; case 'hospital.name': return ctx.hospital || '';
        case 'aftercare.urn': return ac.care === 'private' ? (ac.urn || '') : ''; case 'aftercare.total': return ac.total != null ? ('$' + Number(ac.total).toFixed(2)) : '';
        case 'sign.owner_name': return sg.owner && sg.owner.name || ''; case 'sign.owner_date': return sg.owner ? fmtDate(sg.owner.at, 'en') : '';
        case 'sign.witness_name': return sg.witness && sg.witness.name || ''; case 'sign.witness_date': return sg.witness ? fmtDate(sg.witness.at, 'en') : '';
        default: return a[k] != null ? a[k] : '';
      }
    };
    ((tpl && tpl.boxes) || []).forEach(function (b) {
      var s = BYK[b.src]; if (!s || b.src === 'none') return;
      if (b.src === 'sign.owner') { if (sg.owner && sg.owner.png) out[b.id] = sg.owner.png; return; }
      if (b.src === 'sign.witness') { if (sg.witness && sg.witness.png) out[b.id] = sg.witness.png; return; }
      if (b.src === 'aftercare.care') { out[b.id] = !!(ac.care && ac.care === b.opt); return; }
      if (b.src === 'aftercare.clay') { out[b.id] = !!(ac.clay || ac.care === 'private'); return; }
      if (b.src === 'family.choice') { out[b.id] = a['g:' + String(b.group || 'Choose one')] === b.id; return; }
      if (s.custom) { out[b.id] = b.type === 'check' ? !!a[b.id] : (a[b.id] || ''); return; }
      var v = pick(b.src); out[b.id] = b.type === 'check' ? !!v : v;
    });
    return out;
  }
  /* where the contact details and fees sit on the page, for the packet's "black out" options */
  function regions(tpl) {
    var r = { contact: [], fees: [] };
    ((tpl && tpl.boxes) || []).forEach(function (b) { var s = BYK[b.src]; if (!s) return; if (s.contact) r.contact.push({ page: b.page, rect: b.rect.slice() }); if (s.fees) r.fees.push({ page: b.page, rect: b.rect.slice() }); });
    return r;
  }

  /* ---------- storage: a PDF in Firestore parts ---------- */
  function putParts(DB, col, id, bytes) {
    var b64 = PvxPdf.toB64(bytes), n = Math.max(1, Math.ceil(b64.length / PART)), writes = [];
    for (var i = 0; i < n; i++) writes.push(DB.collection(col).doc(id).collection('parts').doc(String(i)).set({ data: b64.slice(i * PART, (i + 1) * PART), i: i, n: n }));
    return Promise.all(writes).then(function () { return n; });
  }
  function getParts(DB, col, id, n) {
    var reads = []; for (var i = 0; i < n; i++) reads.push(DB.collection(col).doc(id).collection('parts').doc(String(i)).get());
    return Promise.all(reads).then(function (snaps) {
      var s = snaps.map(function (d) { if (!d.exists) throw new Error('A part of the file is missing'); return (d.data() || {}).data || ''; }).join('');
      return PvxPdf.fromB64(s);
    });
  }
  var bytesCache = {};
  function templateBytes(DB, tpl) {
    var key = tpl.id + ':' + (tpl.file && tpl.file.sha256); if (bytesCache[key]) return bytesCache[key];
    var p = getParts(DB, 'form_templates', tpl.id, (tpl.file && tpl.file.parts) || 1).then(function (b) {
      return PvxPdf.sha256(b).then(function (h) { if (tpl.file && tpl.file.sha256 && h !== tpl.file.sha256) throw new Error('The template file does not match its fingerprint'); return b; });
    });
    bytesCache[key] = p; p.catch(function () { delete bytesCache[key]; }); return p;
  }
  function docBytes(DB, meta) {
    return getParts(DB, 'visit_docs', meta.id, meta.parts || 1).then(function (b) {
      return PvxPdf.sha256(b).then(function (h) { return { bytes: b, sha256: h, intact: h === meta.sha256 }; });
    });
  }
  function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* make a signed copy, check it, save it. Resolves to the saved visit_docs record */
  function fileSigned(DB, o) {
    /* o = {tpl, p, answers, aftercare, sign, lang, title, kind, by, tenant, hospital} */
    var at = (o.sign && o.sign.witness && o.sign.witness.at) || (o.sign && o.sign.owner && o.sign.owner.at) || new Date().toISOString();
    return PvxPdf.ready().then(function () { return templateBytes(DB, o.tpl); }).then(function (src) {
      return PvxPdf.fill(src, o.tpl.boxes, resolve(o.tpl, o), { at: at, title: o.title });
    }).then(function (out) {
      return PvxPdf.check(out).then(function (c) { if (!c.ok) throw new Error('The signed PDF did not open: ' + (c.error || '')); return Promise.all([PvxPdf.sha256(out), c, out]); });
    }).then(function (r) {
      var h = r[0], c = r[1], bytes = r[2], id = newId('vd_');
      var meta = { tenant_id: o.tenant || 'shoreline', visit_id: String(o.p.id), template_id: o.tpl.id, template_name: o.tpl.name || '', title: o.title || o.tpl.name || 'Signed form',
        kind: o.kind || o.tpl.kind || null, sha256: h, size: bytes.length, pages: c.pages, created_at: new Date().toISOString(), created_by: o.by || '', signed_at: at,
        signed_by: (o.sign && o.sign.owner && o.sign.owner.name) || '', witness: (o.sign && o.sign.witness && o.sign.witness.name) || '', lang: o.lang || 'en',
        regions: regions(o.tpl), request_id: o.request_id || null, form_id: o.form_id || null };
      return putParts(DB, 'visit_docs', id, bytes).then(function (n) { meta.parts = n; return DB.collection('visit_docs').doc(id).set(meta); })
        .then(function () { meta.id = id; bytesCache['doc:' + id] = Promise.resolve(bytes); return meta; });
    });
  }

  window.PvxForms = { SOURCES: SOURCES, source: function (k) { return BYK[k] || null; }, guess: guess, boxesFromFields: boxesFromFields, humanize: humanize,
    progress: progress, isMapped: isMapped, isConfirmed: isConfirmed, questions: questions, resolve: resolve, regions: regions, fmtDate: fmtDate,
    putParts: putParts, getParts: getParts, templateBytes: templateBytes, docBytes: docBytes, fileSigned: fileSigned, newId: newId, PART: PART };
})();
