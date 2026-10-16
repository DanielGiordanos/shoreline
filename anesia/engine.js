/* Pravix Anesia — record model and dose engine (n151).
   Pure functions, no DOM: the page (anesia/index.html) and the tests (tests/engine.test.js) both use this file.
   Training records only: patients are teaching cases for anesthesia residents, not the hospital's medical record.

   Rules the engine keeps:
   · Every amount is stored in mg (concentrations in mg/mL). mcg is a display/entry unit only.
   · Per-kg doses and per-kg infusions need a weight. Without one the engine never calculates — it says so ("needs-weight"),
     and the person types what was actually given and confirms it (same rule as Treatment Sheets, n146).
   · An infusion is ordered per kg; the pump rate (mL/h) is derived from the weight in force. When the weight changes during
     a running infusion the engine reports the new pump rate — the record never silently changes what was ordered.
   · Running totals integrate infusions over time, split at every rate and weight change.
   · Nothing is deleted once it has stood: an entry is struck through with a reason. Your own change can be undone for
     2 minutes (it then leaves the record; the audit trail keeps the line). A signed record only takes addenda.
   · Every change goes through apply(), which stamps who and when into the audit trail.
   · op.eid (optional) fixes the new entry's id, so a change replayed on the server copy keeps the same id. */
(function (root) {
  'use strict';
  var MIN = 60000, HOUR = 3600000, UNDO_MS = 2 * 60000;

  /* ---------- numbers ---------- */
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim().replace(',', '.');
    if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
    var n = parseFloat(s); return isFinite(n) ? n : null;
  }
  /* 3 significant figures, never trailing zeros: 0.0462 · 1.25 · 12.5 · 125 · 1250 */
  function sig(n, digits) {
    if (n === null || n === undefined || !isFinite(n)) return '';
    if (n === 0) return '0';
    var d = digits || 3, a = Math.abs(n);
    var p = a >= 1000 ? 0 : Math.max(0, d - 1 - Math.floor(Math.log10(a)));
    var s = n.toFixed(Math.min(p, 6));
    if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  /* ---------- units ---------- */
  var BOLUS_UNITS = ['mg/kg', 'mcg/kg', 'mg', 'mcg', 'mL'];
  var RATE_UNITS = ['mcg/kg/min', 'mcg/kg/h', 'mg/kg/h', 'mg/kg/min', 'mL/kg/h', 'mL/h'];
  function perKg(unit) { return /\/kg/.test(unit); }
  function toMg(v, unit) { return /^mcg/.test(unit) ? v / 1000 : v; }

  /* A bolus: what to draw up. dose in `unit`; conc in mg/mL (optional for mg/mcg doses). */
  function bolus(o) {
    var dose = num(o.dose), unit = o.unit, w = num(o.weightKg), conc = num(o.conc);
    if (BOLUS_UNITS.indexOf(unit) < 0) return { ok: false, error: 'unit' };
    if (dose === null || dose <= 0) return { ok: false, error: 'dose' };
    var mg, mL;
    if (unit === 'mL') {
      if (!conc) return { ok: true, mg: null, mL: dose };          /* volume only (fluids, flushes) */
      mL = dose; mg = dose * conc;
    } else {
      if (perKg(unit)) {
        if (!w || w <= 0) return { ok: false, error: 'needs-weight' };
        mg = toMg(dose, unit) * w;
      } else mg = toMg(dose, unit);
      mL = conc ? mg / conc : null;
    }
    return { ok: true, mg: mg, mL: mL, perKg: perKg(unit), mgPerKg: w ? mg / w : null };
  }

  /* An infusion rate → mg/h and mL/h at a weight. */
  function rate(o) {
    var r = num(o.rate), unit = o.unit, w = num(o.weightKg), conc = num(o.conc);
    if (RATE_UNITS.indexOf(unit) < 0) return { ok: false, error: 'unit' };
    if (r === null || r < 0) return { ok: false, error: 'rate' };
    if (perKg(unit) && (!w || w <= 0)) return { ok: false, error: 'needs-weight' };
    var mgH = null, mLH = null;
    switch (unit) {
      case 'mcg/kg/min': mgH = r * w * 60 / 1000; break;
      case 'mcg/kg/h': mgH = r * w / 1000; break;
      case 'mg/kg/h': mgH = r * w; break;
      case 'mg/kg/min': mgH = r * w * 60; break;
      case 'mL/kg/h': mLH = r * w; break;
      case 'mL/h': mLH = r; break;
    }
    if (mgH !== null) mLH = conc ? mgH / conc : null;
    else if (conc) mgH = mLH * conc;
    return { ok: true, mgPerH: mgH, mLPerH: mLH };
  }

  /* ---------- the record ---------- */
  function uid(prefix) { return (prefix || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function newRecord(o) {
    o = o || {};
    var at = o.at || Date.now();
    return {
      v: 1, id: o.id || uid('an'), tenant_id: 'shoreline', kind: o.kind === 'case' ? 'case' : 'training', sheet_id: o.sheetId || null,
      status: 'planned',                    /* planned → active → ended → signed */
      patient: { name: '', species: 'dog', breed: '', sex: '', age: '', asa: '', emergency: false, cpr: '', allergies: '', nka: false, weights: [] },
      confirmed: null,                      /* {at, by} once a person has confirmed this is the right patient */
      procedure: '', team: { resident: '', supervisor: '' },
      created_at: at, created_by: o.by || '', updated_at: at, updated_by: o.by || '',
      start: null, end: null,
      drugs: [], doses: [], infusions: [], gases: [], vitals: [], events: [], outputs: [], addenda: [],
      devices: [], vents: [], timeouts: [], staff: [],
      audit: [], signed: null
    };
  }

  /* weight in force at time t (the latest weighed at or before t; before the first weighing, the first one) */
  function weightAt(rec, t) {
    var ws = (rec.patient.weights || []).filter(function (x) { return !x.void; }).slice().sort(function (a, b) { return a.at - b.at; });
    if (!ws.length) return null;
    var w = ws[0].kg;
    for (var i = 0; i < ws.length; i++) if (ws[i].at <= t) w = ws[i].kg;
    return w;
  }
  function weightTimes(rec) { return (rec.patient.weights || []).filter(function (x) { return !x.void; }).map(function (x) { return x.at; }); }

  /* records made before n161 have no confirmation field: they count as confirmed */
  function isConfirmed(rec) { return rec.confirmed !== null; }

  /* ---------- antibiotics: redose timer (the interval is set per drug by the team; none is built in) ---------- */
  var ABX = ['cefazolin', 'cefoxitin', 'cefotaxime', 'ceftiofur', 'ampicillin', 'ampicillin-sulbactam', 'amoxicillin-clavulanate', 'clindamycin', 'enrofloxacin', 'marbofloxacin', 'metronidazole', 'penicillin', 'gentamicin', 'amikacin'];
  function isAbx(d) { if (!d || d.kind === 'fluid') return false; if (d.abx !== undefined) return !!d.abx; return ABX.indexOf(String(d.name || '').toLowerCase().split(/[\s(]/)[0]) >= 0; }
  function abxStatus(rec, now) {
    return rec.drugs.filter(isAbx).map(function (d) {
      var ds = rec.doses.filter(function (x) { return x.drugId === d.id && !x.void && x.at <= now; }).sort(function (a, b) { return b.at - a.at; });
      if (!ds.length) return null;
      var last = ds[0].at, iv = d.redoseMin || null, dueAt = iv ? last + iv * MIN : null;
      return { drugId: d.id, name: d.name, last: last, doses: ds.length, redoseMin: iv, dueAt: dueAt, minsLeft: dueAt ? Math.ceil((dueAt - now) / MIN) : null };
    }).filter(Boolean);
  }
  var DEVICES = { ett: 'Endotracheal tube', sga: 'Supraglottic airway', mask: 'Face mask', iv: 'IV catheter', art: 'Arterial line', urinary: 'Urinary catheter', epidural: 'Epidural catheter', other: 'Other' };
  var VENT = { spont: 'Spontaneous', manual: 'Manual (bagging)', vc: 'Volume control', pc: 'Pressure control', psv: 'Pressure support' };
  function ventAt(rec, t) { var v = null; (rec.vents || []).filter(function (x) { return !x.void; }).sort(function (a, b) { return a.at - b.at; }).forEach(function (x) { if (x.at <= t) v = x; }); return v; }
  var TIMEOUT = [['identity', 'Patient, weight and cage card match'], ['procedure', 'Procedure and site agreed'], ['code', 'Consent and code status confirmed'], ['allergies', 'Allergies reviewed'],
    ['abx', 'Antibiotic given, or not needed'], ['machine', 'Machine, circuit and monitors checked'], ['emergency', 'Emergency drugs calculated'], ['plan', 'Plan and concerns shared with the team']];
  function timeoutStatus(rec) {
    var t = (rec.timeouts || []).filter(function (x) { return !x.void; }).sort(function (a, b) { return b.at - a.at; })[0];
    if (!t) return null;
    var open = TIMEOUT.filter(function (i) { return t.items.indexOf(i[0]) < 0; }).map(function (i) { return i[1]; });
    return { at: t.at, by: t.by, open: open, complete: !open.length, id: t.id };
  }
  var ROLES = { resident: 'Resident', supervisor: 'Supervisor', technician: 'Technician', surgeon: 'Surgeon', student: 'Student', other: 'Other' };
  function staffOn(rec, t) { return (rec.staff || []).filter(function (x) { return !x.void && x.from <= t && (!x.to || x.to > t); }); }

  /* ---------- fluid balance ---------- */
  var OUTPUTS = { ebl: 'Blood loss', urine: 'Urine', other: 'Other output' };
  function balance(rec, now) {
    var tot = totals(rec, now), fluids = 0, drugs = 0, out = { ebl: 0, urine: 0, other: 0 };
    tot.forEach(function (r) { if (r.kind === 'fluid') fluids += r.mL; else drugs += r.mL; });
    (rec.outputs || []).forEach(function (o) { if (!o.void && o.at <= now) out[o.kind] = (out[o.kind] || 0) + o.mL; });
    var outT = out.ebl + out.urine + out.other, inT = fluids + drugs, w = weightAt(rec, now), urineRate = null;
    if (rec.start && w && out.urine > 0) { var hrs = ((rec.end && rec.end < now ? rec.end : now) - rec.start) / HOUR; if (hrs > 0) urineRate = out.urine / w / hrs; }
    return { fluids: fluids, drugs: drugs, inTotal: inT, out: out, outTotal: outT, net: inT - outT, urineRate: urineRate };
  }

  function drug(rec, id) { for (var i = 0; i < rec.drugs.length; i++) if (rec.drugs[i].id === id) return rec.drugs[i]; return null; }

  /* rate history of an infusion → [{from,to,rate}] (to = end, or `now` while running) */
  function segments(inf, now) {
    var ch = [{ at: inf.start, rate: inf.rate }].concat((inf.changes || []).filter(function (c) { return !c.void; }))
      .sort(function (a, b) { return a.at - b.at; });
    var stop = inf.end || now, out = [];
    for (var i = 0; i < ch.length; i++) {
      var from = ch[i].at, to = i + 1 < ch.length ? ch[i + 1].at : stop;
      if (to > from) out.push({ from: from, to: Math.min(to, stop), rate: ch[i].rate });
    }
    return out.filter(function (s) { return s.to > s.from; });
  }
  function rateAt(inf, t) {
    if (t < inf.start || (inf.end && t >= inf.end)) return null;
    var r = inf.rate, ch = (inf.changes || []).filter(function (c) { return !c.void; }).slice().sort(function (a, b) { return a.at - b.at; });
    for (var i = 0; i < ch.length; i++) if (ch[i].at <= t) r = ch[i].rate;
    return r;
  }

  /* amount delivered by an infusion up to `now`: split at rate changes and weight changes */
  function infused(rec, inf, now) {
    var d = drug(rec, inf.drugId) || {}, conc = num(d.conc), mg = 0, mL = 0, unknown = false;
    var cuts = weightTimes(rec);
    segments(inf, now).forEach(function (s) {
      var pts = [s.from].concat(cuts.filter(function (t) { return t > s.from && t < s.to; }).sort(function (a, b) { return a - b; })).concat([s.to]);
      for (var i = 0; i + 1 < pts.length; i++) {
        var h = (pts[i + 1] - pts[i]) / HOUR, r = rate({ rate: s.rate, unit: inf.unit, weightKg: weightAt(rec, pts[i]), conc: conc });
        if (!r.ok) { unknown = true; continue; }
        if (r.mgPerH !== null) mg += r.mgPerH * h;
        if (r.mLPerH !== null) mL += r.mLPerH * h;
      }
    });
    return { mg: mg, mL: mL, unknown: unknown };
  }

  /* the pump setting now (mL/h at the weight in force) — what the screen shows next to a running infusion */
  function pumpNow(rec, inf, now) {
    var d = drug(rec, inf.drugId) || {}, r = rateAt(inf, now);
    if (r === null) return null;
    return rate({ rate: r, unit: inf.unit, weightKg: weightAt(rec, now), conc: d.conc });
  }

  /* running totals per drug, and fluids */
  function totals(rec, now) {
    var by = {};
    function row(id) {
      var d = drug(rec, id) || { name: '?', kind: 'drug' };
      return by[id] || (by[id] = { drugId: id, name: d.name, kind: d.kind, mg: 0, mL: 0, boluses: 0, infusionMg: 0, infusionMl: 0, unknown: false, last: null });
    }
    rec.doses.forEach(function (x) {
      if (x.void || x.at > now) return;
      var r = row(x.drugId); r.boluses++;
      if (x.mg !== null && x.mg !== undefined) r.mg += x.mg; else r.unknown = true;
      if (x.mL !== null && x.mL !== undefined) r.mL += x.mL;
      if (!r.last || x.at > r.last) r.last = x.at;
    });
    rec.infusions.forEach(function (inf) {
      if (inf.void || inf.start > now) return;
      var r = row(inf.drugId), a = infused(rec, inf, now);
      r.infusionMg += a.mg; r.infusionMl += a.mL; r.mg += a.mg; r.mL += a.mL; if (a.unknown) r.unknown = true;
    });
    var list = Object.keys(by).map(function (k) { return by[k]; });
    var w = weightAt(rec, now);
    list.forEach(function (r) { r.mgPerKg = w ? r.mg / w : null; });
    return list.sort(function (a, b) { return (a.kind === 'fluid') - (b.kind === 'fluid') || a.name.localeCompare(b.name); });
  }

  /* vaporizer / oxygen setting in force at t */
  function gasAt(rec, agent, t) {
    var v = null;
    rec.gases.filter(function (g) { return !g.void && g.agent === agent; }).sort(function (a, b) { return a.at - b.at; })
      .forEach(function (g) { if (g.at <= t) v = g.value; });
    return v;
  }

  /* ---------- vitals ---------- */
  /* plausible entry ranges — only to catch typing slips (a missing decimal, a value in the wrong box), never clinical limits */
  var VITALS = {
    hr: { label: 'Heart rate', short: 'HR', unit: 'bpm', min: 0, max: 400 },
    rr: { label: 'Respiratory rate', short: 'RR', unit: 'br/min', min: 0, max: 150 },
    sap: { label: 'Systolic', short: 'SAP', unit: 'mmHg', min: 0, max: 350 },
    map: { label: 'Mean', short: 'MAP', unit: 'mmHg', min: 0, max: 300 },
    dap: { label: 'Diastolic', short: 'DAP', unit: 'mmHg', min: 0, max: 250 },
    spo2: { label: 'SpO₂', short: 'SpO₂', unit: '%', min: 0, max: 100 },
    etco2: { label: 'EtCO₂', short: 'EtCO₂', unit: 'mmHg', min: 0, max: 150 },
    temp: { label: 'Temperature', short: 'Temp', unit: '°F', min: 77, max: 113 },
    fio2: { label: 'Inspired O₂', short: 'FiO₂', unit: '%', min: 15, max: 100 },
    etag: { label: 'Expired agent', short: 'Et agent', unit: '%', min: 0, max: 10 },
    tof: { label: 'Train-of-four', short: 'TOF', unit: 'of 4', min: 0, max: 4, whole: true }
  };
  var ECG = { sinus: 'Sinus rhythm', stach: 'Sinus tachycardia', sbrady: 'Sinus bradycardia', sarr: 'Sinus arrhythmia', avb: 'AV block', vpc: 'VPCs', afib: 'Atrial fibrillation', other: 'Other' };
  function checkVitals(v) {
    var out = {}, errors = {}, any = false;
    Object.keys(VITALS).forEach(function (k) {
      if (v[k] === undefined || v[k] === null || v[k] === '') return;
      var n = num(v[k]), L = VITALS[k];
      if (n === null) { errors[k] = 'Enter a number'; return; }
      if (n < L.min || n > L.max) { errors[k] = 'Enter ' + L.short + ' from ' + L.min + ' to ' + L.max + ' ' + L.unit; return; }
      if (L.whole && n % 1) { errors[k] = 'Enter ' + L.short + ' as a whole number from ' + L.min + ' to ' + L.max; return; }
      out[k] = n; any = true;
    });
    if (v.ecg) { if (ECG[v.ecg]) { out.ecg = v.ecg; any = true; } else errors.ecg = 'Choose the rhythm'; }
    if (out.sap !== undefined && out.dap !== undefined && out.dap > out.sap) errors.dap = 'Diastolic is higher than systolic';
    if (out.map === undefined && out.sap !== undefined && out.dap !== undefined && !errors.dap) { out.map = Math.round((out.sap + 2 * out.dap) / 3); out.mapCalc = true; }
    return { ok: any && !Object.keys(errors).length, values: out, errors: errors, empty: !any && !Object.keys(errors).length };
  }

  /* ---------- events ---------- */
  var EVENTS = {
    premed: 'Premedication', induction: 'Induction', intubation: 'Intubation', anesthesia_start: 'Anesthesia start',
    position: 'Positioned', incision: 'Incision', closure: 'Closure', procedure_end: 'Procedure end',
    anesthesia_end: 'Anesthesia end', extubation: 'Extubation', recovery: 'To recovery', note: 'Note'
  };

  /* ---------- changes ---------- */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function fail(msg, code) { var e = new Error(msg); e.code = code || 'invalid'; throw e; }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* apply(rec, op, ctx) → new record. ctx = {by, at}. Throws {code} on anything it refuses. */
  function apply(rec0, op, ctx) {
    var rec = clone(rec0), by = (ctx && ctx.by) || '', at = (ctx && ctx.at) || Date.now(), t = op.at || at, detail = '';
    if (rec.status === 'signed' && op.type !== 'addendum') fail('This record is signed. Add an addendum instead.', 'signed');
    switch (op.type) {
      case 'patient': {
        var idBefore = rec.patient.name + '|' + rec.patient.species;
        ['name', 'species', 'breed', 'sex', 'age', 'asa'].forEach(function (k) { if (op[k] !== undefined) rec.patient[k] = String(op[k]).slice(0, 120); });
        if (op.emergency !== undefined) rec.patient.emergency = !!op.emergency;
        if (op.cpr !== undefined) { if (['', 'CPR', 'DNR'].indexOf(op.cpr) < 0) fail('Choose CPR or DNR.', 'cpr'); rec.patient.cpr = op.cpr; }
        if (op.allergies !== undefined) rec.patient.allergies = String(op.allergies).trim().slice(0, 300);
        if (op.nka !== undefined) rec.patient.nka = !!op.nka && !rec.patient.allergies;
        /* a different name or species is a different patient: it has to be confirmed again */
        var reconfirm = rec.confirmed && idBefore !== rec.patient.name + '|' + rec.patient.species;
        if (reconfirm) rec.confirmed = null;
        if (op.procedure !== undefined) rec.procedure = String(op.procedure).slice(0, 200);
        if (op.resident !== undefined) rec.team.resident = String(op.resident).slice(0, 120);
        if (op.supervisor !== undefined) rec.team.supervisor = String(op.supervisor).slice(0, 120);
        detail = 'Patient details' + (reconfirm ? ' (needs confirming again)' : ''); break;
      }
      case 'confirm': {
        if (!rec.patient.name) fail('Give the patient a name first.', 'name');
        if (rec.confirmed) fail('This patient is already confirmed.', 'confirmed');
        rec.confirmed = { at: at, by: by };
        detail = 'Confirmed patient: ' + rec.patient.name; break;
      }
      case 'redose': {
        var rd = drug(rec, op.drugId); if (!rd) fail('That drug is not on this record.', 'missing');
        var rm = op.min === '' || op.min === null || op.min === undefined ? null : num(op.min);
        if (rm !== null && (rm < 5 || rm > 1440)) fail('Enter 5–1440 minutes, or leave it empty.', 'min');
        rd.redoseMin = rm; if (op.abx !== undefined) rd.abx = !!op.abx;
        detail = rd.name + (rm ? ' redose every ' + sig(rm) + ' min' : ' redose timer off'); break;
      }
      case 'device': {
        if (!DEVICES[op.kind]) fail('Choose the airway or line.', 'kind');
        if (!rec.devices) rec.devices = [];
        rec.devices.push({ id: (op.eid || uid('dv')), kind: op.kind, size: String(op.size || '').trim().slice(0, 30), site: String(op.site || '').trim().slice(0, 60), note: String(op.note || '').trim().slice(0, 200), cuff: op.cuff || '', at: t, end: null, by: by, ca: at });
        detail = DEVICES[op.kind] + (op.size ? ' ' + String(op.size).trim() : '') + (op.site ? ', ' + String(op.site).trim() : ''); break;
      }
      case 'remove': {
        var dv = find(rec.devices || [], op.deviceId); if (!dv || dv.void) fail('That airway or line is not on this record.', 'missing');
        if (dv.end) fail('This is already removed. Its removal time is on the chart.', 'state'); if (t < dv.at) fail('It can’t come out before it went in.', 'time');
        dv.end = t; dv.endBy = by; detail = 'Removed ' + DEVICES[dv.kind] + (dv.size ? ' ' + dv.size : ''); break;
      }
      case 'vent': {
        if (!VENT[op.mode]) fail('Choose the ventilation mode.', 'mode');
        var VL = { tv: [1, 3000, 'Tidal volume', 'mL'], rate: [1, 80, 'Rate', 'br/min'], peep: [0, 30, 'PEEP', 'cmH₂O'], pip: [1, 60, 'Peak pressure', 'cmH₂O'] }, vo = { id: (op.eid || uid('vt')), mode: op.mode, at: t, by: by, ca: at };
        Object.keys(VL).forEach(function (k) { if (op[k] === undefined || op[k] === '' || op[k] === null) return; var n = num(op[k]), L = VL[k]; if (n === null || n < L[0] || n > L[1]) fail('Enter ' + L[2] + ' from ' + L[0] + ' to ' + L[1] + ' ' + L[3] + '.', k); vo[k] = n; });
        if (!rec.vents) rec.vents = []; rec.vents.push(vo);
        detail = 'Ventilation: ' + VENT[op.mode]; break;
      }
      case 'timeout': {
        var items = (op.items || []).filter(function (k) { return TIMEOUT.some(function (i) { return i[0] === k; }); });
        if (!rec.timeouts) rec.timeouts = [];
        rec.timeouts.push({ id: (op.eid || uid('to')), at: t, by: by, ca: at, items: items, note: String(op.note || '').trim().slice(0, 300) });
        detail = 'Time-out' + (items.length === TIMEOUT.length ? ' complete' : ' (' + (TIMEOUT.length - items.length) + ' not done)'); break;
      }
      case 'staff': {
        var sn = String(op.name || '').trim(); if (!sn) fail('Enter the name.', 'name'); if (!ROLES[op.role]) fail('Choose the role.', 'role');
        if (!rec.staff) rec.staff = [];
        rec.staff.push({ id: (op.eid || uid('st')), name: sn.slice(0, 80), role: op.role, from: t, to: null, by: by, ca: at });
        detail = sn + ' joined as ' + ROLES[op.role].toLowerCase(); break;
      }
      case 'handoff': {
        var so = find(rec.staff || [], op.staffId); if (!so || so.void || so.to) fail('That person is not on the case now.', 'missing');
        if (t < so.from) fail('The handoff can’t be before they joined.', 'time');
        so.to = t; so.toBy = by;
        var nn = String(op.name || '').trim();
        if (nn) rec.staff.push({ id: (op.eid || uid('st')), name: nn.slice(0, 80), role: so.role, from: t, to: null, by: by, ca: at, from_handoff: so.id });
        detail = nn ? 'Handoff: ' + so.name + ' → ' + nn : so.name + ' left'; break;
      }
      case 'output': {
        if (!OUTPUTS[op.kind]) fail('Choose what was measured.', 'kind');
        var ml = num(op.mL); if (ml === null || ml <= 0 || ml > 20000) fail('Enter the volume in mL (more than 0).', 'mL');
        if (!rec.outputs) rec.outputs = [];
        rec.outputs.push({ id: (op.eid || uid('o')), at: t, kind: op.kind, mL: ml, note: String(op.note || '').slice(0, 200), by: by, ca: at });
        detail = OUTPUTS[op.kind] + ' ' + sig(ml) + ' mL'; break;
      }
      case 'weight': {
        var kg = num(op.kg); if (kg === null || kg <= 0 || kg > 150) fail('Enter a weight between 0.01 and 150 kg.', 'weight');
        var before = weightAt(rec, t);
        rec.patient.weights.push({ id: (op.eid || uid('w')), at: t, kg: kg, by: by, ca: at, method: op.method === 'estimated' ? 'estimated' : 'measured' });
        detail = 'Weight ' + sig(kg) + ' kg' + (op.method === 'estimated' ? ' (estimated)' : '') + (before ? ' (was ' + sig(before) + ' kg)' : '');
        break;
      }
      case 'drug': {   /* add a drug to this record's list: name, kind (drug|fluid|gas), conc mg/mL */
        var name = String(op.name || '').trim(); if (!name) fail('Name the drug.', 'name');
        var conc = op.conc === '' || op.conc === undefined || op.conc === null ? null : num(op.conc);
        if (conc !== null && conc <= 0) fail('Enter a concentration above 0.', 'conc');
        var id = op.id || (op.eid || uid('d'));
        rec.drugs.push({ id: id, name: name.slice(0, 60), kind: op.kind || 'drug', conc: conc, concLabel: op.concLabel || '', route: op.route || '' });
        detail = 'Added ' + name; break;
      }
      case 'dose': {
        var d = drug(rec, op.drugId); if (!d) fail('Choose a drug.', 'drug');
        var w = weightAt(rec, t), b = bolus({ dose: op.dose, unit: op.unit, weightKg: w, conc: d.conc }), entry;
        if (b.ok) entry = { mg: b.mg, mL: b.mL };
        else if (b.error === 'needs-weight') {
          /* no weight: the person types what was actually given and confirms it */
          var mgGiven = num(op.mgGiven);
          if (mgGiven === null || mgGiven <= 0) fail('No weight on file. Type the dose actually given, in mg.', 'needs-weight');
          if (!op.confirmNoWeight) fail('Confirm the dose given — there is no weight on file.', 'confirm');
          entry = { mg: mgGiven, mL: d.conc ? mgGiven / d.conc : null, noWeight: true };
        } else fail(b.error === 'dose' ? 'Enter the dose.' : 'Choose a unit.', b.error);
        var x = { id: (op.eid || uid('b')), drugId: d.id, at: t, dose: num(op.dose), unit: op.unit, route: op.route || d.route || '', mg: entry.mg, mL: entry.mL, weightKg: w, by: by, ca: at };
        if (entry.noWeight) { x.noWeight = true; x.dose = entry.mg; x.unit = 'mg'; }
        rec.doses.push(x);
        detail = d.name + ' ' + sig(x.mg) + ' mg' + (x.mL !== null ? ' (' + sig(x.mL) + ' mL)' : ''); break;
      }
      case 'infusion': {
        var di = drug(rec, op.drugId); if (!di) fail('Choose a drug or fluid.', 'drug');
        var r0 = rate({ rate: op.rate, unit: op.unit, weightKg: weightAt(rec, t), conc: di.conc });
        if (!r0.ok) fail(r0.error === 'needs-weight' ? 'Add a weight before starting a per-kg infusion.' : r0.error === 'rate' ? 'Enter the rate.' : 'Choose a unit.', r0.error);
        rec.infusions.push({ id: (op.eid || uid('i')), drugId: di.id, unit: op.unit, rate: num(op.rate), start: t, end: null, changes: [], by: by, ca: at });
        detail = di.name + ' started at ' + sig(num(op.rate)) + ' ' + op.unit; break;
      }
      case 'rate': {
        var inf = find(rec.infusions, op.infusionId); if (!inf || inf.void) fail('That infusion is not on this record.', 'missing');
        if (inf.end) fail('That infusion has stopped. Start a new one to continue.', 'stopped');
        var rn = num(op.rate); if (rn === null || rn < 0) fail('Enter the rate.', 'rate');
        if (t < inf.start) fail('A rate change can’t be before the infusion started.', 'time');
        inf.changes.push({ id: (op.eid || uid('c')), at: t, rate: rn, by: by, ca: at });
        detail = (drug(rec, inf.drugId) || {}).name + ' → ' + sig(rn) + ' ' + inf.unit; break;
      }
      case 'stop': {
        var inf2 = find(rec.infusions, op.infusionId); if (!inf2 || inf2.void) fail('That infusion is not on this record.', 'missing');
        if (inf2.end) fail('That infusion has already stopped. Start a new one to continue.', 'stopped');
        if (t < inf2.start) fail('It can’t stop before it started.', 'time');
        inf2.end = t; inf2.endBy = by; inf2.endCa = at; detail = (drug(rec, inf2.drugId) || {}).name + ' stopped'; break;
      }
      case 'gas': {
        var GAS = { iso: [0, 5], sevo: [0, 8], o2: [0, 15] }, lim = GAS[op.agent];
        if (!lim) fail('Choose the agent.', 'agent');
        var gv = num(op.value); if (gv === null || gv < lim[0] || gv > lim[1]) fail('Enter ' + lim[0] + '–' + lim[1] + (op.agent === 'o2' ? ' L/min' : ' %') + '.', 'value');
        rec.gases.push({ id: (op.eid || uid('g')), agent: op.agent, at: t, value: gv, by: by, ca: at });
        detail = { iso: 'Isoflurane', sevo: 'Sevoflurane', o2: 'Oxygen' }[op.agent] + ' ' + sig(gv) + (op.agent === 'o2' ? ' L/min' : ' %'); break;
      }
      case 'vitals': {
        var cv = checkVitals(op.values || {});
        if (cv.empty) fail('Enter at least one value.', 'empty');
        if (!cv.ok) { var e = new Error('Check the highlighted values.'); e.code = 'vitals'; e.errors = cv.errors; throw e; }
        rec.vitals.push(Object.assign({ id: (op.eid || uid('v')), at: t, by: by, ca: at }, cv.values));
        detail = 'Vitals'; break;
      }
      case 'event': {
        if (!EVENTS[op.kind]) fail('Choose the event.', 'kind');
        rec.events.push({ id: (op.eid || uid('e')), at: t, kind: op.kind, note: String(op.note || '').slice(0, 300), by: by, ca: at });
        if (op.kind === 'anesthesia_start' && !rec.start) { rec.start = t; rec.status = 'active'; }
        if (op.kind === 'anesthesia_end' && rec.status === 'active') { rec.end = t; rec.status = 'ended'; }
        detail = EVENTS[op.kind]; break;
      }
      case 'start': {
        if (rec.start) fail('Anesthesia has already started.', 'started');
        rec.start = t; rec.status = 'active';
        rec.events.push({ id: (op.eid || uid('e')), at: t, kind: 'anesthesia_start', note: '', by: by });
        detail = 'Anesthesia started'; break;
      }
      case 'end': {
        if (rec.status !== 'active') fail('Start anesthesia first.', 'state');
        if (t < rec.start) fail('It can’t end before it started.', 'time');
        rec.end = t; rec.status = 'ended';
        rec.infusions.forEach(function (i) { if (!i.void && !i.end) { i.end = t; i.endBy = by; } });
        rec.events.push({ id: (op.eid || uid('e')), at: t, kind: 'anesthesia_end', note: '', by: by });
        detail = 'Anesthesia ended'; break;
      }
      case 'void': {   /* strike an entry through, with a reason; it stays on the record */
        var lists = { dose: 'doses', infusion: 'infusions', gas: 'gases', vitals: 'vitals', event: 'events', output: 'outputs', device: 'devices', vent: 'vents', timeout: 'timeouts', staff: 'staff', weight: null };
        if (lists[op.list] && !rec[lists[op.list]]) rec[lists[op.list]] = [];
        if (!(op.list in lists)) fail('That entry can’t be struck through here. Reload the record and try again.', 'list');
        var arr = op.list === 'weight' ? rec.patient.weights : rec[lists[op.list]], it = find(arr, op.id);
        if (!it) fail('That entry is not on this record.', 'missing');
        if (it.void) fail('This entry is already struck through. Nothing more to do.', 'void');
        var why = String(op.reason || '').trim(); if (why.length < 4) fail('Say why (at least 4 characters).', 'reason');
        it.void = { at: at, by: by, reason: why.slice(0, 200) };
        detail = 'Struck through ' + op.list + ': ' + why; break;
      }
      case 'undo': {   /* take back your own change within UNDO_MS — it leaves the record (a later fix is a strike-through) */
        var mine = function (x) { return x && x.by === by && x.ca && at - x.ca <= UNDO_MS && at >= x.ca; }, what = null;
        if (op.kind === 'stop') {
          var si = find(rec.infusions, op.id);
          if (!si || !si.end || si.endBy !== by || !si.endCa || at - si.endCa > UNDO_MS) fail('Undo works for 2 minutes. Strike the entry through instead.', 'undo');
          if (rec.status !== 'active') fail('Anesthesia has ended; the infusion can’t restart.', 'undo');
          si.end = null; delete si.endBy; delete si.endCa; what = 'stopping ' + ((drug(rec, si.drugId) || {}).name || 'the infusion');
        } else if (op.kind === 'rate') {
          rec.infusions.forEach(function (i) { var c = find(i.changes || [], op.id); if (c && mine(c)) { i.changes.splice(i.changes.indexOf(c), 1); what = 'rate change on ' + ((drug(rec, i.drugId) || {}).name || 'an infusion'); } });
        } else {
          var L = { dose: rec.doses, infusion: rec.infusions, gas: rec.gases, vitals: rec.vitals, event: rec.events, output: rec.outputs || [], device: rec.devices || [], vent: rec.vents || [], timeout: rec.timeouts || [], staff: rec.staff || [], weight: rec.patient.weights }[op.kind];
          if (!L) fail('Nothing to undo.', 'undo');
          var it2 = find(L, op.id);
          if (it2 && op.kind === 'event' && /^anesthesia_/.test(it2.kind)) fail('Anesthesia start and end can’t be undone here.', 'undo');
          if (it2 && op.kind === 'device' && it2.end) fail('This has been removed since; strike it through instead.', 'undo');
          if (it2 && op.kind === 'staff' && it2.to) fail('This person has handed off since; strike it through instead.', 'undo');
          if (it2 && op.kind === 'infusion' && ((it2.changes || []).length || it2.end)) fail('This infusion has changed since; stop it or strike it through instead.', 'undo');
          if (it2 && mine(it2) && !it2.void) { L.splice(L.indexOf(it2), 1); what = op.kind === 'output' ? (OUTPUTS[it2.kind] || 'output').toLowerCase() + ' ' + sig(it2.mL) + ' mL' : op.kind === 'dose' ? ((drug(rec, it2.drugId) || {}).name || 'dose') + ' ' + sig(it2.mg) + ' mg' : op.kind === 'weight' ? 'weight ' + sig(it2.kg) + ' kg' : op.kind; }
        }
        if (!what) fail('Undo works for 2 minutes. Strike the entry through instead.', 'undo');
        detail = 'Undid ' + what; break;
      }
      case 'sign': {
        if (rec.status !== 'ended') fail('End anesthesia before signing.', 'state');
        rec.status = 'signed'; rec.signed = { at: at, by: by };
        detail = 'Signed'; break;
      }
      case 'addendum': {
        if (rec.status !== 'signed') fail('Addenda are for signed records.', 'state');
        var txt = String(op.text || '').trim(); if (txt.length < 4) fail('Write the addendum.', 'text');
        rec.addenda.push({ id: (op.eid || uid('a')), at: at, by: by, text: txt.slice(0, 1000) });
        detail = 'Addendum'; break;
      }
      default: fail('This change isn’t supported by this version of Anesia. Reload the page and try again.', 'op');
    }
    rec.audit.push({ at: at, by: by, op: op.type, detail: detail, t: t });
    if (rec.audit.length > 2000) rec.audit = rec.audit.slice(-2000);
    rec.updated_at = at; rec.updated_by = by;
    return rec;
  }

  /* pump changes a weight change would cause on the running infusions — shown before the weight is saved */
  function weightImpact(rec, kg, now) {
    var trial = clone(rec); trial.patient.weights.push({ id: 'trial', at: now, kg: kg });
    return rec.infusions.filter(function (i) { return !i.void && !i.end && i.start <= now && perKg(i.unit); }).map(function (i) {
      var a = pumpNow(rec, i, now), b = pumpNow(trial, i, now);
      return { infusionId: i.id, name: (drug(rec, i.drugId) || {}).name, from: a && a.ok ? a.mLPerH : null, to: b && b.ok ? b.mLPerH : null };
    });
  }

  /* the time range the chart shows: from 10 minutes before the first entry (or now) to 20 minutes past the last (or now) */
  function span(rec, now) {
    var ts = [];
    ['doses', 'gases', 'vitals', 'events', 'outputs', 'devices', 'vents', 'timeouts'].forEach(function (k) { (rec[k] || []).forEach(function (x) { ts.push(x.at); if (x.end) ts.push(x.end); }); });
    rec.infusions.forEach(function (i) { ts.push(i.start); if (i.end) ts.push(i.end); });
    if (rec.start) ts.push(rec.start); if (rec.end) ts.push(rec.end);
    var live = rec.status === 'active' || rec.status === 'planned';
    var lo = ts.length ? Math.min.apply(null, ts) : now, hi = ts.length ? Math.max.apply(null, ts) : now;
    if (live) { lo = Math.min(lo, now); hi = Math.max(hi, now); }
    var step = 5 * MIN;
    lo = Math.floor((lo - 10 * MIN) / step) * step;
    hi = Math.ceil((hi + 20 * MIN) / step) * step;
    if (hi - lo < HOUR) hi = lo + HOUR;
    return { from: lo, to: hi, step: step };
  }

  var api = {
    num: num, sig: sig, BOLUS_UNITS: BOLUS_UNITS, RATE_UNITS: RATE_UNITS, perKg: perKg,
    bolus: bolus, rate: rate, newRecord: newRecord, weightAt: weightAt, drug: drug, segments: segments, rateAt: rateAt,
    infused: infused, pumpNow: pumpNow, totals: totals, gasAt: gasAt, VITALS: VITALS, checkVitals: checkVitals,
    EVENTS: EVENTS, OUTPUTS: OUTPUTS, ECG: ECG, isAbx: isAbx, abxStatus: abxStatus, DEVICES: DEVICES, VENT: VENT, ventAt: ventAt, TIMEOUT: TIMEOUT, timeoutStatus: timeoutStatus, ROLES: ROLES, staffOn: staffOn, balance: balance, isConfirmed: isConfirmed, UNDO_MS: UNDO_MS, apply: apply, weightImpact: weightImpact, span: span, uid: uid, MIN: MIN, HOUR: HOUR
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Anesia = api;
})(typeof window !== 'undefined' ? window : this);
