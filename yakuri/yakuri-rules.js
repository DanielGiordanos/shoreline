/* Yakuri hosted rules — a line-for-line JavaScript copy of medical.py, cpr.py, interactions.py and the clinical gate in
   governance.py, for the hosted copy at shoreline.pravix.app/yakuri/ (no Python server there).
   tests/test_hosted_rules.py runs the Python and this file on the same inputs and requires identical answers.
   Change the Python first, then this file, then run that test. Never add an approval path here: the hosted copy is read-only. */
(function (root) {
  'use strict';
  function Blocked(code, message, status) { this.blocked = true; this.code = code; this.message = message; this.status = status === undefined ? 403 : status; }
  var isObj = function (v) { return v !== null && typeof v === 'object' && !Array.isArray(v); };
  var keysEq = function (o, list) { var k = Object.keys(o); if (k.length !== list.length) return false; for (var i = 0; i < list.length; i++) if (!Object.prototype.hasOwnProperty.call(o, list[i])) return false; return true; };
  /* governance.finite_number: int or float, not bool, finite */
  var finite = function (v) { return typeof v === 'number' && isFinite(v); };
  var isInt = function (v) { return typeof v === 'number' && Number.isInteger(v); };
  /* str.casefold() for the names in the formulary and the rules (ASCII plus ß) */
  var fold = function (s) { return String(s).toLowerCase().replace(/ß/g, 'ss'); };
  var LB = 0.45359237;

  /* ───────── medical.py ───────── */
  var VERSION = 'medical-estimates-v2-bcs';
  var SOURCES = {
    bsa: [
      { title: 'Girens et al. (2019), traditional canine BSA equation and limitations', url: 'https://doi.org/10.1111/jvim.15440' },
      { title: 'Lopes & Morris (2026), feline body-surface-area table', url: 'https://eprints.gla.ac.uk/378568/2/378568.pdf' }],
    lean: [{ title: 'AAHA nutrition guidelines: body fat and lean mass', url: 'https://www.aaha.org/resources/2021-aaha-nutrition-and-weight-management-guidelines/screening-evaluation/' }],
    cpr: [{ title: 'Official RECOVER 2024 drug dosing chart (kg)', url: 'https://recoverinitiative.org/wp-content/uploads/2024/07/RECOVER-2024-Drug-Dosing-Charts-KGS-1.pdf' }]
  };
  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };

  /* opts.floatKeys: keys whose JSON literal was written as a float (5.0, 5e0). Python's json gives those a float, and
     medical.py's BCS check accepts only an int, so the hosted layer passes them in from the raw request text. */
  function calculate(payload, opts) {
    var floatKeys = (opts && opts.floatKeys) || [];
    if (!isObj(payload)) throw new Blocked('invalid_request', 'Enter the calculator inputs.', 400);
    var tool = payload.tool;
    if (tool === 'cpr_weight_table') return cprWeightTable(payload);
    if (tool === 'cpr_reference') return cprCalculate(payload);
    if (tool === 'arithmetic_test') return arithmeticTest(payload);
    if (tool === 'cri' || tool === 'cpr')
      throw new Blocked('protocol_review_required', 'Drug calculations are unavailable: no clinically approved ' + (tool === 'cri' ? 'infusion' : 'CPR') + ' protocol is installed. Source verification alone is not clinical approval.');
    if (tool !== 'bsa' && tool !== 'lean') throw new Blocked('unknown_calculator', 'Choose a supported calculator.', 400);
    var fields = ['tool', 'species', 'weight', 'weight_unit'];
    if (tool === 'lean') fields.push('bcs' in payload ? 'bcs' : 'body_fat_percent');
    if (!keysEq(payload, fields)) throw new Blocked('invalid_request', 'Supply only the fields shown for this calculator.', 400);
    var species = payload.species, unit = payload.weight_unit, weight = payload.weight;
    if ((species !== 'dog' && species !== 'cat') || (unit !== 'kg' && unit !== 'lb')) throw new Blocked('invalid_units', 'Choose Dog or Cat and kg or lb.', 400);
    if (!finite(weight) || weight <= 0) throw new Blocked('invalid_weight', 'Enter a finite weight greater than zero.', 400);
    var kg = unit === 'kg' ? weight : weight * LB;
    if (!(0.01 <= kg && kg <= 200)) throw new Blocked('weight_outside_range', 'This dog/cat calculator accepts 0.01–200 kg. Check the weight and unit.', 400);
    var result = { allowed: true, tool: tool, version: VERSION, species: species, weight_kg: kg, inputs: payload, sources: clone(SOURCES[tool]), estimate_only: true, clinical_approval: false };
    if (tool === 'bsa') {
      var k = species === 'dog' ? 0.101 : 0.100;
      result.value = k * Math.pow(kg, 2 / 3); result.unit = 'm²'; result.formula = k.toFixed(3) + ' × weight (kg)^(2/3)';
      result.note = 'Traditional weight-based estimate. Body shape and size affect accuracy. This does not select or authorize a drug dose.';
    } else if ('bcs' in payload) {
      var bcs = payload.bcs;
      if (!isInt(bcs) || floatKeys.indexOf('bcs') >= 0 || !(1 <= bcs && bcs <= 9)) throw new Blocked('invalid_bcs', 'Choose a whole-number BCS on the 1–9 scale.', 400);
      if ([4, 5, 6, 7, 8].indexOf(bcs) < 0) throw new Blocked('bcs_unverified', 'No bounded body-fat estimate is implemented for this BCS. Scores 1–3 need individual assessment; 9 has an open-ended fat range. Use an assessed body-fat percentage instead. Do not assume a dosing weight.', 422);
      var r = { 4: [15, 19], 5: [20, 24], 6: [25, 29], 7: [30, 34], 8: [35, 39] }[bcs], lo = kg * (1 - r[1] / 100), hi = kg * (1 - r[0] / 100);
      result.value = lo; result.value_max = hi; result.value_lb = lo / LB; result.value_lb_max = hi / LB;
      result.ideal_min = lo / 0.8; result.ideal_max = hi / 0.8; result.body_fat_range = [r[0], r[1]]; result.unit = 'kg';
      result.formula = 'Fat-free mass = kg × (1 − estimated body fat / 100); ideal weight estimate = fat-free mass / 0.8';
      result.verification = 'BCS-based estimate; individual body composition unverified';
      result.note = 'BCS ' + bcs + '/9 maps to approximately ' + r[0] + '–' + r[1] + '% body fat in the AAHA table. Lean mass and ideal body weight are different. The ideal-weight estimate assumes 20% body fat and preserved lean mass. Neither is an automatically approved dosing weight.';
    } else {
      var fat = payload.body_fat_percent;
      if (!finite(fat) || !(0 < fat && fat < 100)) throw new Blocked('invalid_body_fat', 'Enter an assessed body-fat percentage greater than 0 and less than 100.', 400);
      var value = kg * (1 - fat / 100);
      result.value = value; result.value_lb = value / LB; result.unit = 'kg'; result.formula = 'weight (kg) × (1 − body fat % / 100)';
      result.note = 'Estimated fat-free mass from the body-fat percentage you supplied. It is not a measured lean mass, ideal body weight, or an automatic dosing weight.';
    }
    if (!isFinite(result.value)) throw new Blocked('numeric_range', 'Result is outside the supported range.', 400);
    return result;
  }

  function arithmeticTest(p) {
    var fields = ['tool', 'kind', 'weight', 'weight_unit', 'dose', 'dose_unit', 'stock_mg_ml', 'hours'];
    if (!keysEq(p, fields) || (p.kind !== 'infusion' && p.kind !== 'bolus')) throw new Blocked('invalid_test', 'Use only the displayed arithmetic-test inputs; drug or approval overrides are not accepted.', 400);
    if ((p.weight_unit !== 'kg' && p.weight_unit !== 'lb') || ['mg/kg/hr', 'mcg/kg/min', 'mg/kg', 'mcg/kg'].indexOf(p.dose_unit) < 0 || typeof p.dose_unit !== 'string')
      throw new Blocked('invalid_test_units', 'Choose supported test units.', 400);
    var infusion = p.kind === 'infusion';
    if (infusion !== (p.dose_unit === 'mg/kg/hr' || p.dose_unit === 'mcg/kg/min')) throw new Blocked('test_unit_mismatch', 'Dose units must match infusion or single-dose arithmetic.', 400);
    ['weight', 'dose', 'stock_mg_ml'].forEach(function (f) { if (!finite(p[f]) || p[f] <= 0) throw new Blocked('invalid_test_value', 'Weight, dose and stock concentration must be finite and greater than zero.', 400); });
    var kg = p.weight * (p.weight_unit === 'lb' ? 0.45359237 : 1);
    if (!(0.01 <= kg && kg <= 200) || !finite(p.hours) || (infusion && !(0 < p.hours && p.hours <= 24)) || (!infusion && p.hours !== 0))
      throw new Blocked('invalid_test_range', 'Test weight must be 0.01–200 kg; infusion duration must be >0–24 hours (single-dose duration must be zero).', 400);
    var amount = kg * p.dose;
    if (p.dose_unit === 'mcg/kg/min') amount = amount * 60 / 1000; else if (p.dose_unit === 'mcg/kg') amount = amount / 1000;
    var volume = amount / p.stock_mg_ml, total = infusion ? volume * p.hours : volume;
    if (![amount, volume, total].every(function (n) { return isFinite(n) && n > 0; })) throw new Blocked('invalid_test_result', 'Test result is outside the numeric range.', 400);
    var out = { allowed: true, test_only: true, clinical_approval: false, version: 'arithmetic-test-v1', kind: p.kind };
    out[infusion ? 'amount_mg_per_hr' : 'amount_mg'] = amount; out[infusion ? 'stock_ml_per_hr' : 'stock_ml'] = volume; out.total_stock_ml = total;
    out.inputs = p; out.note = 'ARITHMETIC TEST ONLY — manually supplied numbers; no drug, indication, dose suitability, route, compatibility, dilution, pump setting or clinical protocol has been verified. No prescription or clinical approval is created.';
    return out;
  }

  /* ───────── cpr.py ───────── */
  var CPR_VERSION = 'recover-2024-vec13391-reference-v1';
  var CPR_SOURCES = [
    { title: 'Burkitt-Creedon et al. · 2024 RECOVER treatment recommendations', url: 'https://doi.org/10.1111/vec.13391' },
    { title: 'Full article · UC Davis repository', url: 'https://escholarship.org/uc/item/4fw7q61v' },
    { title: 'Official RECOVER companion dosing chart', url: 'https://recoverinitiative.org/wp-content/uploads/2024/07/RECOVER-2024-Drug-Dosing-Charts-KGS-1.pdf' }];
  var DRUGS = [
    { id: 'epinephrine', name: 'Epinephrine', dose: 0.01, unit: 'mg', example: 1, ref: 'Table 2; ALS-06/07/08/16' },
    { id: 'vasopressin', name: 'Vasopressin', dose: 0.8, unit: 'U', example: 20, ref: 'Table 2; ALS-16; §8.6–8.7' },
    { id: 'atropine', name: 'Atropine', dose: 0.04, unit: 'mg', example: 0.4, ref: 'ALS-09/19; §8.6' },
    { id: 'lidocaine', name: 'Lidocaine', dose: 2, unit: 'mg', example: 20, ref: 'Table 2; ALS-01' },
    { id: 'amiodarone', name: 'Amiodarone', dose: 5, unit: 'mg', example: 50, ref: 'Table 2; ALS-02' },
    { id: 'esmolol', name: 'Esmolol', dose: 0.5, unit: 'mg', example: 10, ref: 'Table 2; ALS-03' },
    { id: 'naloxone', name: 'Naloxone', dose: 0.04, unit: 'mg', example: 0.4, ref: 'Table 2; ALS-13' },
    { id: 'flumazenil', name: 'Flumazenil', dose: 0.01, unit: 'mg', example: 0.1, ref: 'Table 2; 2012-ALS13' },
    { id: 'atipamezole', name: 'Atipamezole', dose: 0.1, unit: 'mg', example: 5, ref: 'Table 2: 100 mcg/kg = 0.1 mg/kg; 2012-ALS13' },
    { id: 'bicarbonate', name: 'Sodium bicarbonate', dose: 1, unit: 'mEq', example: null, ref: 'Table 2; 2012-ALS16' }];
  var CONDITIONS = ['opioid', 'benzodiazepine', 'alpha2', 'prolonged'];
  var RHYTHMS = { nonshockable: 'Nonshockable · PEA/asystole', first_shock: 'Shockable · before first shock', refractory: 'Shockable · persists after first shock and next 2-minute cycle' };

  function cprCatalog() {
    return { version: CPR_VERSION, clinical_approval: false, sources: clone(CPR_SOURCES),
      drugs: DRUGS.map(function (d) { return { id: d.id, name: d.name, unit: d.unit, example: d.example, dose: d.dose, source_location: d.ref }; }) };
  }

  function cprCalculate(p) {
    var fields = ['tool', 'species', 'weight', 'weight_unit', 'rhythm', 'atropine_status', 'vasopressin_available', 'lidocaine_available', 'amiodarone_formulation', 'conditions', 'concentrations'];
    if (!keysEq(p, fields) || p.tool !== 'cpr_reference') throw new Blocked('invalid_cpr_request', 'Use the reference-calculator fields only; approval and dose overrides are not accepted.', 400);
    if (['species', 'weight_unit', 'rhythm', 'atropine_status', 'amiodarone_formulation'].some(function (k) { return typeof p[k] !== 'string'; })) throw new Blocked('invalid_cpr_context', 'Select valid calculator options.', 400);
    if ((p.species !== 'dog' && p.species !== 'cat') || (p.weight_unit !== 'kg' && p.weight_unit !== 'lb') || !Object.prototype.hasOwnProperty.call(RHYTHMS, p.rhythm))
      throw new Blocked('invalid_cpr_context', 'Choose Dog or Cat, a weight unit and an arrest rhythm.', 400);
    if (!finite(p.weight) || p.weight <= 0) throw new Blocked('invalid_weight', 'Enter a finite positive weight.', 400);
    var kg = p.weight * (p.weight_unit === 'lb' ? 0.45359237 : 1);
    if (!(0.01 <= kg && kg <= 200)) throw new Blocked('invalid_weight', 'Supported test weight: 0.01–200 kg.', 400);
    if (['unknown', 'not_given', 'given'].indexOf(p.atropine_status) < 0 || ['unknown', 'free', 'contains'].indexOf(p.amiodarone_formulation) < 0)
      throw new Blocked('invalid_cpr_context', 'Choose atropine history and amiodarone formulation status.', 400);
    if (['vasopressin_available', 'lidocaine_available'].some(function (k) { return typeof p[k] !== 'boolean'; })) throw new Blocked('invalid_cpr_context', 'Drug availability must be selected explicitly.', 400);
    var conditions = p.conditions, concentrations = p.concentrations;
    if (!isObj(conditions) || !keysEq(conditions, CONDITIONS) || CONDITIONS.some(function (k) { return typeof conditions[k] !== 'boolean'; }))
      throw new Blocked('invalid_cpr_context', 'Supply the four indication selections.', 400);
    if (!isObj(concentrations) || !keysEq(concentrations, DRUGS.map(function (d) { return d.id; }))) throw new Blocked('invalid_concentration', 'Supply each stock concentration or leave it blank.', 400);
    Object.keys(concentrations).forEach(function (k) { var v = concentrations[k]; if (v !== null && (!finite(v) || v <= 0)) throw new Blocked('invalid_concentration', 'Concentrations must be finite positive numbers, or blank.', 400); });
    var rhythm = p.rhythm, dog = p.species === 'dog', refractory = rhythm === 'refractory', nonshock = rhythm === 'nonshockable';
    var rows = [];
    DRUGS.forEach(function (d) {
      var key = d.id, reason = null, note = '', rate = d.dose, c = concentrations[key];
      if (key === 'epinephrine' || key === 'vasopressin') {
        note = 'Alternative vasopressors; not an instruction to give both. Interval: 3–5 minutes.';
        if (rhythm === 'first_shock') reason = 'No vasopressor output before the first shock.';
        else if (key === 'epinephrine' && refractory && p.vasopressin_available) reason = 'Vasopressin selected as available; epinephrine is the fallback here.';
        else if (key === 'vasopressin' && !p.vasopressin_available) reason = 'Vasopressin marked unavailable.';
      } else if (key === 'atropine') {
        note = 'Consider once, early, for nonshockable arrest; do not repeat.';
        if (!nonshock) reason = 'Atropine branch is limited to nonshockable arrest.';
        else if (p.atropine_status !== 'not_given') reason = p.atropine_status === 'given' ? 'Already given — no repeat.' : 'Prior atropine administration unverified; no repeat-dose output.';
        if (c !== null && 0.4 <= c && c <= 0.54) { rate = 0.1 * c; note += ' Uses §8.6 concentration-linked 0.1 mL/kg (0.04–0.054 mg/kg).'; }
        else note += ' Uses ALS-09 0.04 mg/kg; no concentration-linked shortcut outside 0.4–0.54 mg/mL.';
      } else if (key === 'lidocaine' || key === 'amiodarone' || key === 'esmolol') {
        if (!refractory) reason = 'Reserved for a shockable rhythm persisting after the first shock and next CPR cycle.';
        if (key === 'lidocaine') {
          note = 'Give over 2–4 minutes; dog-specific antiarrhythmic branch.';
          if (!dog) reason = 'Lidocaine is not suggested for this feline arrest indication (ALS-01).';
          else if (!p.lidocaine_available) reason = 'Lidocaine marked unavailable.';
        } else if (key === 'amiodarone') {
          note = 'Give over 2–4 minutes.';
          if (dog) {
            if (p.lidocaine_available) reason = 'For dogs, amiodarone is a fallback when lidocaine is unavailable.';
            else if (p.amiodarone_formulation !== 'free') reason = 'Dog formulation must be verified free of polysorbate-80; current status: ' + p.amiodarone_formulation + '.';
          }
        } else note = 'Loading amount over 3–5 minutes; then 50 mcg/kg/min. Infusion preparation is not calculated.';
      } else {
        var condition = { naloxone: 'opioid', flumazenil: 'benzodiazepine', atipamezole: 'alpha2', bicarbonate: 'prolonged' }[key];
        if (!conditions[condition]) reason = 'Applicable indication not selected; not a routine dose.';
        note = { naloxone: 'Recent opioid exposure; after BLS and priority ALS interventions.',
          flumazenil: 'Relevant benzodiazepine exposure; reversal does not replace BLS/ALS.',
          atipamezole: 'Relevant alpha-2 agonist exposure; CPR IV/IO reference, not routine sedation-reversal instructions.',
          bicarbonate: 'May be considered after prolonged arrest (>10–15 minutes); not routine.' }[key];
      }
      var row = { id: key, name: d.name, status: reason ? 'withheld' : 'reference_only', reason: reason, note: note, source_location: d.ref, route: 'IV / IO', unit: d.unit, clinical_approval: false };
      if (!reason) {
        var amount = kg * rate, volume = c === null ? null : amount / c;
        if (!isFinite(amount) || (volume !== null && (!isFinite(volume) || volume <= 0))) throw new Blocked('numeric_range', 'A calculated volume exceeds the numeric range. Check concentration.', 400);
        row.dose_per_kg = rate; row.amount = amount; row.concentration = c; row.volume_ml = volume;
        row.product_verification = 'Unverified against actual vial; confirm concentration and formulation.';
        row.volume_flag = c === null ? 'Concentration missing — volume not calculated.' : volume < 0.1 ? 'Small volume: measurement/dilution plan unverified.' : '';
        if (key === 'esmolol') { row.infusion_mcg_kg_min = 50; row.infusion_mcg_min = kg * 50; }
      }
      rows.push(row);
    });
    var energies = [];
    if (rhythm !== 'nonshockable')
      [['External biphasic', 2, 4], ['Internal biphasic', 0.2, 0.4], ['External monophasic', 4, 6], ['Internal monophasic', 0.5, 1]].forEach(function (e) {
        energies.push({ name: e[0], j_per_kg: [e[1], e[2]], joules: [kg * e[1], kg * e[2]], status: 'Table 2 reference range; device setting unverified' });
      });
    return { allowed: true, test_only: true, clinical_approval: false, version: CPR_VERSION, sources: clone(CPR_SOURCES), inputs: p, weight_kg: kg, rhythm_label: RHYTHMS[rhythm],
      rows: rows, energies: energies,
      external_biphasic: nonshock ? null : { initial_joules: kg * 2, subsequent_joules: kg * 4, note: 'After a failed initial 2 J/kg shock, use twice the initial energy for shock 2 and later shocks; do not keep doubling. Device settings remain unverified.' },
      limitations: ['Private reference preview; not a clinically validated or approved CPR protocol.', 'No high-dose epinephrine option. No intratracheal doses. No neonatal-resuscitation rules.', 'Not an administration record: recheck rhythm and drug history after every cycle. No timers or repeat-dose scheduling.', 'Other interventions, patient-specific contraindications, dilution, compatibility and device limits are not assessed.'] };
  }

  var TABLE_VERSION = 'recover-2024-weight-reference-v1';
  var BICARBONATE_LABEL = { title: 'Sodium bicarbonate 8.4% label · concentration only', url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2f05947f-a489-4298-a871-90db75b2a6c5' };
  var TABLE_NOTES = {
    epinephrine: 'Nonshockable arrest or refractory shockable arrest when vasopressin is unavailable. Not before the first shock. Alternative to vasopressin; 3–5-minute interval. No high-dose option.',
    vasopressin: 'Alternative to epinephrine; 3–5-minute interval. Not before the first shock.',
    atropine: 'Consider once, early, in nonshockable arrest. Do not repeat during CPR. The 0.1 mL/kg shortcut applies only to 0.4–0.54 mg/mL.',
    lidocaine: 'Dogs only for refractory VF/pVT; not suggested for cats in this indication. Over 2–4 minutes.',
    amiodarone: 'Refractory VF/pVT. In dogs, only when lidocaine is unavailable and the formulation is free of polysorbate-80. Over 2–4 minutes.',
    esmolol: 'Refractory VF/pVT. Loading amount over 3–5 minutes, then 50 mcg/kg/min; infusion preparation is not calculated.',
    naloxone: 'Recent opioid exposure; after BLS and priority ALS interventions.',
    flumazenil: 'Relevant benzodiazepine exposure; reversal does not replace BLS/ALS.',
    atipamezole: 'Relevant alpha-2 agonist exposure. CPR reference, not routine sedation-reversal instructions.',
    bicarbonate: 'May be considered after prolonged arrest (>10–15 minutes); not routine. Assumes 8.4% solution (1 mEq/mL).' };

  function cprWeightTable(p) {
    if (!keysEq(p, ['tool', 'weight', 'weight_unit']) || p.tool !== 'cpr_weight_table') throw new Blocked('invalid_cpr_request', 'Supply weight and kg/lb only.', 400);
    if (typeof p.weight_unit !== 'string' || (p.weight_unit !== 'kg' && p.weight_unit !== 'lb')) throw new Blocked('invalid_units', 'Choose kg or lb.', 400);
    if (!finite(p.weight) || p.weight <= 0) throw new Blocked('invalid_weight', 'Enter a finite positive weight.', 400);
    var kg = p.weight * (p.weight_unit === 'lb' ? 0.45359237 : 1);
    if (!(0.01 <= kg && kg <= 200)) throw new Blocked('invalid_weight', 'Supported test weight: 0.01–200 kg.', 400);
    var rows = DRUGS.map(function (d) {
      var c = d.id === 'bicarbonate' ? 1 : d.example, volume = kg * d.dose / c;
      return { id: d.id, name: d.name, dose_per_kg: d.dose, unit: d.unit, amount: kg * d.dose, concentration: c, volume_ml: volume, note: TABLE_NOTES[d.id], source_location: d.ref, clinical_approval: false,
        verification: 'Reference stock only; actual vial and patient suitability unverified.', volume_flag: volume < 0.1 ? 'Small volume: measurement/dilution plan unverified.' : '' };
    });
    var energies = [['Biphasic', 2, 4, 0.2, 0.4], ['Monophasic', 4, 6, 0.5, 1]].map(function (e) { return { name: e[0], external: [kg * e[1], kg * e[2]], internal: [kg * e[3], kg * e[4]] }; });
    return { allowed: true, test_only: true, clinical_approval: false, version: TABLE_VERSION, weight_kg: kg, inputs: p, rows: rows, energies: energies, sources: clone(CPR_SOURCES).concat([clone(BICARBONATE_LABEL)]),
      notice: 'Reference table only. Species, rhythm, indications and prior doses are not assessed. These drugs are not a combined treatment plan. Confirm actual vial concentrations.',
      energy_note: 'For shockable rhythms only. External biphasic: initially 2 J/kg; after an unsuccessful initial shock, 4 J/kg for the second and subsequent shocks. Do not keep doubling. Internal and monophasic entries are Table 2 ranges; device settings remain unverified.' };
  }

  /* ───────── interactions.py (the evidence file is passed in: evidence/interaction-rules.json) ───────── */
  function coverage(EV) {
    var sp = {}; ['dog', 'cat'].forEach(function (s) { sp[s] = EV.rules.filter(function (r) { return r.species.indexOf(s) >= 0; }).length; });
    return { rules_version: EV.version, checked_on: EV.checked_on, covered_pairs: EV.rules.length, species_pairs: sp, clinical_approval: false };
  }
  function check(library, payload, EV) {
    if (!isObj(payload) || !keysEq(payload, ['drug_ids', 'species'])) throw new Blocked('invalid_interaction_request', 'Supply selected drug identifiers and Dog or Cat.', 400);
    var ids = payload.drug_ids, species = payload.species;
    if ((species !== 'dog' && species !== 'cat') || !Array.isArray(ids) || !(1 <= ids.length && ids.length <= 10) || ids.some(function (i) { return typeof i !== 'string'; }) || new Set(ids).size !== ids.length)
      throw new Blocked('invalid_selection', 'Select 1–10 distinct drugs and Dog or Cat.', 400);
    var byid = {}; library.drugs.forEach(function (d) { byid[d.id] = d; });
    if (ids.some(function (i) { return !Object.prototype.hasOwnProperty.call(byid, i); })) throw new Blocked('unknown_drug', 'A selected drug is no longer in the formulary. Reload the list.', 400);
    var selected = ids.map(function (i) { return byid[i]; });
    var result = { species: species, clinical_approval: false };
    var cov = coverage(EV); Object.keys(cov).forEach(function (k) { result[k] = cov[k]; });
    result.scope = 'Limited evidence preview, not comprehensive interaction clearance. No physical/chemical compatibility, supplement screening or multi-drug effects.';
    result.selected = selected.map(function (d) { return { id: d.id, name: d.name, state: d.governance.state }; });
    result.pairs = [];
    for (var i = 0; i < selected.length; i++) for (var j = i + 1; j < selected.length; j++) {
      var a = selected[i], b = selected[j], names = [fold(a.name), fold(b.name)];
      var same = function (r) { var rn = r.names.map(fold); var s1 = new Set(rn), s2 = new Set(names); if (s1.size !== s2.size) return false; var ok = true; s1.forEach(function (x) { if (!s2.has(x)) ok = false; }); return ok; };
      var rule = null; for (var q = 0; q < EV.rules.length; q++) if (same(EV.rules[q])) { rule = EV.rules[q]; break; }
      var pair = { drug_ids: [a.id, b.id], names: [a.name, b.name], clinical_approval: false, classification: 'Not assessed', source_checked: false, scope_match: false,
        verification: 'Unverified — no mapped evidence for this pair in the current checker.', summary: 'No conclusion about safety can be drawn. Review both monographs and an appropriate interaction source.', sources: [] };
      if (rule) {
        var match = rule.species.indexOf(species) >= 0, sources = rule.source_ids.map(function (k) { return clone(EV.sources[k]); });
        var applicable = sources.filter(function (s) { return s.species.indexOf(species) >= 0; }), scope = rule.species.join(' / ');
        pair.classification = match ? rule.classification : 'Unverified species — evidence for ' + scope;
        pair.source_checked = true; pair.scope_match = match; pair.summary = rule.summary;
        pair.verification = match ? 'Source checked; clinical pair assessment pending.' : 'Evidence is scoped to ' + scope + '. Applicability to the selected species is unverified.';
        pair.evidence_scope = rule.mapping; pair.evidence_species = clone(rule.species); pair.sources = match ? applicable : sources;
      }
      result.pairs.push(pair);
    }
    result.mapped_pair_count = result.pairs.filter(function (p) { return p.scope_match; }).length;
    result.unverified_pair_count = result.pairs.length - result.mapped_pair_count;
    return result;
  }

  /* ───────── the clinical gate (governance.authorize), read-only ─────────
     recs: recommendation id → its detail as exported ({…recommendation, state, reason, …}). Nothing is ever allowed here:
     content that isn't Approved is refused exactly as on the Mac, and an Approved item is refused because approvals and
     clinical actions run only in Yakuri on the Mac. */
  var OPERATIONS = ['calculate', 'prescription', 'recommendations'];
  function clinical(operation, payload, recs) {
    if (OPERATIONS.indexOf(operation) < 0) throw new Blocked('unknown_operation', 'Unknown clinical operation.', 404);
    var allowed = ['recommendation_id', 'version', 'context', 'weight_kg'];
    if (!isObj(payload) || Object.keys(payload).some(function (k) { return allowed.indexOf(k) < 0; })) throw new Blocked('invalid_request', 'Only a recommendation identifier, version, context and optional weight are accepted.', 400);
    if (typeof payload.recommendation_id !== 'string') throw new Blocked('invalid_request', 'A recommendation identifier is required.', 400);
    var c = Object.prototype.hasOwnProperty.call(recs, payload.recommendation_id) ? recs[payload.recommendation_id] : null;
    if (!c) throw new Blocked('unknown_recommendation', 'This recommendation is not in the current release.', 404);
    if (c.state !== 'Approved') throw new Blocked(String(c.state).toLowerCase(), c.reason);
    throw new Blocked('hosted_read_only', 'Clinical actions run only in Yakuri on Daniel’s Mac. This hosted copy is read-only.');
  }

  /* top-level keys of a flat JSON object whose number literal is a float (has . e or E) */
  function floatKeysOf(text) {
    var out = [], re = /"((?:[^"\\]|\\.)*)"\s*:\s*(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)(?=\s*[,}])/g, m;
    while ((m = re.exec(String(text)))) if (/[.eE]/.test(m[2])) out.push(JSON.parse('"' + m[1] + '"'));
    return out;
  }
  root.YakuriRules = { Blocked: Blocked, calculate: calculate, floatKeysOf: floatKeysOf, cprCatalog: cprCatalog, coverage: coverage, check: check, clinical: clinical, fold: fold };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.YakuriRules;
})(typeof window !== 'undefined' ? window : globalThis);
