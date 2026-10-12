/* Grid · Weekly reports (Oct 2026)
   The Monday job (GitHub Actions) saves each week's leadership report in grid_reports/{monday}: the figures, the visits
   behind each number (pet name + visit ID only), the workbook and the PDF packets. This file is Grid's side of it:
     · the Reports panel: every week, its status, Open in Grid / Excel / PDF, and "Mark reviewed" (nothing is emailed
       until a week is reviewed; the job sends each director their copy within about 15 minutes after that);
     · who gets it (grid_config/recipients) and what was promised at the huddle (grid_config/commitments);
     · the links inside the workbook and the emails:  #report/<week>[/<service>]   #visits/<week>/<slug>   #trend/<slug>
   Only Grid's accounts can read any of it (Firestore rules). Owner names, phones and messages are never in it. */
(function () {
  'use strict';
  const SERVICES = ['ER', 'ICU', 'Surgery'];
  const SVC_NAME = { ER: 'Emergency & Critical Care', ICU: 'Intensive care unit', Surgery: 'Surgery' };
  const STATUS = { ready: ['Ready for review', 'amber'], reviewed: ['Reviewed · sending soon', 'green'], sending: ['Sending…', 'green'], sent: ['Sent', 'blue'] };
  const TITLES = {
    'patients': 'Every visit this week', 'patients-seen': 'Every visit this week', 'door-to-doctor': 'Longest waits for a doctor',
    'er-visit-length': 'Longest ER visits (went home)', 'admitted': 'Admitted', 'p2-decision': 'P2: doctor → decision, longest first',
    'busy-window': 'The busiest four hours', 'surgeries': 'Surgeries', 'late-starts': 'Surgeries that started 30+ min late',
    'icu-occupancy': 'In the ICU this week', 'triage-p1': 'P1 critical', 'triage-p2': 'P2 urgent', 'triage-p3': 'P3 stable'
  };
  const ALIAS = {   // the workbook's link names → the lists the job saves
    'patients-seen': 'patients', 'arrivals': 'patients', 'arrivals-by-day': 'patients', 'arrivals-by-hour': 'busy-window', 'tri': 'patients',
    'waits-by-day': 'door-to-doctor', 'first-case-on-time': 'surgeries', 'room-turnover': 'surgeries', 'days-with-surgery': 'surgeries',
    'started-30-min-late': 'late-starts', 'recovery-to-rounds': 'surgeries', 'the-patient-s-visit-step-by-step': 'patients', 'all-patients': 'patients',
    'p1-critical': 'triage-p1', 'p2-urgent': 'triage-p2', 'p3-stable': 'triage-p3', 'left-before-seen': null, 'report': 'patients'
  };
  const TREND = {   // Last 8 weeks rows
    'patients': ['Patients seen', v => v.toLocaleString()], 'door-to-doctor': ['Door to doctor', v => v + ' min'],
    'er-visit-length': ['ER visit length', hm], 'left-before-seen': ['Left before seen', String], 'admitted': ['Admitted', String],
    'surgeries': ['Surgeries', String], 'icu-occupancy': ['ICU occupancy, 7 AM', v => Math.round(v * 100) + '%'], 'p2-decision': ['P2 doctor → decision', v => v + ' min']
  };
  const H8 = ['patients', 'door-to-doctor', 'er-visit-length', 'left-before-seen', 'admitted', 'surgeries', 'icu-occupancy', 'p2-decision'];
  function hm(m) { if (m == null) return '—'; m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + ' min'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function nameOf(u) { if (u.displayName) return u.displayName; return (u.email || '').split('@')[0].split(/[._]/).map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' '); }
  function when(iso) { try { const d = new Date(iso); return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso || ''; } }

  let DB = null, USER = null, WEEKS = [], CUR = null;
  const $ = id => document.getElementById(id);

  /* ───────── data ───────── */
  async function loadWeeks() {
    const q = await DB.collection('grid_reports').orderBy('week_id', 'desc').limit(12).get();
    WEEKS = []; q.forEach(d => WEEKS.push(Object.assign({ _id: d.id }, d.data())));
    return WEEKS;
  }
  async function week(id) { const w = WEEKS.find(x => x._id === id); if (w) return w; const d = await DB.collection('grid_reports').doc(id).get(); return d.exists ? Object.assign({ _id: d.id }, d.data()) : null; }
  async function file(weekId, fid) {   // a file the job saved, in ≤900 KB chunks
    const ref = DB.collection('grid_reports').doc(weekId).collection('files').doc(fid), meta = await ref.get();
    if (!meta.exists) throw new Error('not saved yet');
    const m = meta.data(), q = await ref.collection('chunks').orderBy('i').get(), parts = [];
    q.forEach(c => parts.push(c.data().data.toUint8Array()));
    const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let at = 0; parts.slice(0, m.chunks).forEach(p => { out.set(p, at); at += p.length; });
    return { bytes: out, name: m.name, mime: m.mime };
  }
  function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function save(f) { const url = URL.createObjectURL(new Blob([f.bytes], { type: f.mime })), a = document.createElement('a'); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); }

  /* ───────── UI shell ───────── */
  function mount() {
    if ($('rp-pill')) return;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    document.body.insertAdjacentHTML('beforeend',
      '<button id="rp-pill" type="button" hidden aria-haspopup="dialog"><i></i><span>Weekly report</span></button>' +
      '<div id="rp-scrim" hidden></div><aside id="rp" hidden role="dialog" aria-modal="true" aria-labelledby="rp-title"><div id="rp-in"></div></aside>' +
      '<div id="rp-toast" role="status" aria-live="polite" hidden></div>');
    $('rp-pill').addEventListener('click', () => { location.hash = '#report/' + (WEEKS[0] ? WEEKS[0]._id : ''); });
    $('rp-scrim').addEventListener('click', close);
    addEventListener('keydown', e => { if (e.key === 'Escape' && !$('rp').hidden) close(); });
    addEventListener('hashchange', route);
  }
  function show(html, wide) { const p = $('rp'); $('rp-in').innerHTML = html; p.classList.toggle('wide', !!wide); p.hidden = false; $('rp-scrim').hidden = false; const f = p.querySelector('[data-focus]') || p.querySelector('button'); if (f) f.focus(); }
  function close() { $('rp').hidden = true; $('rp-scrim').hidden = true; if (/^#(report|visits|trend)\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); }
  function toast(t) { const el = $('rp-toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 3600); }
  function head(kicker, title, sub) { return '<div class="rp-h"><div><div class="rp-k">' + esc(kicker) + '</div><h2 id="rp-title">' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div><button type="button" class="rp-x" aria-label="Close" onclick="window.__rpClose()">×</button></div>'; }
  window.__rpClose = close;
  function pill() {
    const w = WEEKS[0], b = $('rp-pill'); if (!w) { b.hidden = true; return; }
    const st = STATUS[w.status] || ['', '']; b.hidden = false; b.dataset.tone = st[1];
    b.querySelector('span').textContent = 'Weekly report · ' + (w.labels ? w.labels.short : w._id) + ' · ' + st[0];
  }

  /* ───────── #report/<week>[/<service>] ───────── */
  async function showReport(id, svc) {
    const w = id ? await week(id) : WEEKS[0];
    if (!w) return show(head('Weekly leadership', 'No report yet', 'The first one is built on Monday at 5:30 AM from the week before.') + '<div class="rp-b"></div>');
    CUR = w; svc = SERVICES.includes(svc) ? svc : 'ER';
    const st = STATUS[w.status] || ['—', ''], S = (w.services || {})[svc];
    const reviewed = w.review && w.review.by;
    const flag = w.flag_line || ['', ''];
    const html = head('Weekly leadership · ' + (w.labels ? w.labels.long : w._id), w.verdict || '', '') +
      '<div class="rp-b">' +
      '<div class="rp-status" data-tone="' + st[1] + '"><b>' + esc(st[0]) + '</b>' +
        (reviewed ? '<span>Reviewed by ' + esc(w.review.by) + ' · ' + esc(when(w.review.at)) + '</span>' : '<span>Read it, then mark it reviewed. Nothing is emailed before that.</span>') +
        (w.status === 'sent' && w.sent ? '<span>Emailed ' + esc(when(w.sent.at)) + ' · ' + (w.sent.emails || []).length + ' emails</span>' : '') + '</div>' +
      '<div class="rp-acts">' +
        '<button type="button" class="rp-btn pri" data-act="open" data-focus>Open in Grid</button>' +
        '<button type="button" class="rp-btn" data-act="xlsx">Excel</button>' +
        (w.status === 'sent' ? SERVICES.map(s => '<button type="button" class="rp-btn" data-act="pdf" data-svc="' + s + '">PDF · ' + s + '</button>').join('') : '<button type="button" class="rp-btn" data-act="draft">Draft PDF · ER</button>') +
        (w.status === 'ready' ? '<button type="button" class="rp-btn ok" data-act="review">Mark reviewed</button>' : '') +
        (w.status === 'reviewed' ? '<button type="button" class="rp-btn" data-act="unreview">Undo review</button>' : '') +
      '</div>' +
      '<div class="rp-seg" role="group" aria-label="Service">' + SERVICES.map(s => '<button type="button" data-svc="' + s + '" aria-pressed="' + (s === svc) + '">' + s + '</button>').join('') + '</div>' +
      (S ? '<div class="rp-svc"><div class="rp-k acc">Your service first</div><h3>' + esc(S.name) + '</h3><div class="rp-stats">' +
        S.stats.map((x, i) => '<a class="rp-stat" href="#visits/' + w._id + '/' + ['patients', 'door-to-doctor', 'er-visit-length', 'admitted'][i] + '"><b class="' + (x[2] ? 'focus' : '') + '">' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></a>').join('') + '</div></div>' : '') +
      '<a class="rp-flag' + (flag[0] ? '' : ' calm') + '" href="#trend/' + ((w.flags || [])[0] || 'patients') + '"><b>' + esc(flag[0]) + '</b> ' + esc(flag[1]) + '</a>' +
      '<h4>Worth a look</h4><ul class="rp-list">' + (w.looks || []).map(x => '<li><i class="sev ' + esc(x[0]) + '"></i><span><b>' + esc(x[1]) + ':</b> ' + esc(x[2]) + '</span></li>').join('') + '</ul>' +
      '<h4>Last 8 weeks</h4><div class="rp-trends">' + H8.filter(k => k !== 'left-before-seen').map(k => trendTile(w, k)).join('') + '</div>' +
      '<h4>Last week we said · this week we saw</h4><ul class="rp-list">' + ((w.acts || []).length ? w.acts.map(a => '<li><i class="sev ' + (/Done/.test(a[3]) ? 'ok' : /progress/.test(a[3]) ? 'p2' : 'acc') + '"></i><span><b>' + esc(a[0]) + '</b>' + (a[2] ? ' → ' + esc(a[2]) : '') + ' <em>' + esc(String(a[3]).replace('●', '').trim()) + '</em></span></li>').join('') : '<li class="mute">Nothing was recorded at last week’s huddle.</li>') + '</ul>' +
      commitmentsForm(w) + recipientsForm() +
      ((w.missing || []).length ? '<h4>Not recorded yet</h4><ul class="rp-list mute">' + w.missing.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '') +
      '<h4>Earlier weeks</h4><ul class="rp-weeks">' + WEEKS.filter(x => x._id !== w._id).map(x => '<li><a href="#report/' + x._id + '"><b>' + esc(x.labels ? x.labels.short : x._id) + '</b><span>' + esc((STATUS[x.status] || ['—'])[0]) + '</span></a></li>').join('') + '</ul>' +
      '<p class="rp-foot">Figures only. Pet names and visit IDs open here for signed-in staff; owner details never reach Grid.</p></div>';
    show(html, true);
    const p = $('rp');
    p.querySelectorAll('.rp-seg button').forEach(b => b.addEventListener('click', () => { location.hash = '#report/' + w._id + '/' + b.dataset.svc; }));
    p.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act, w, b.dataset.svc || svc, b)));
    wireForms(w);
  }
  function trendTile(w, k) {
    const H = w.history || {}, h = (H[k] || []).slice(), cur = (H.this || [])[H8.indexOf(k)], T = TREND[k];
    if (cur == null && h.every(v => v == null)) return '';
    const flagged = (w.flags || []).includes(k);
    return '<a class="rp-tt' + (flagged ? ' un' : '') + '" href="#trend/' + k + '/' + w._id + '"><span>' + (flagged ? '● ' : '') + esc(T[0]) + '</span><b>' + esc(cur == null ? '—' : T[1](cur)) + '</b>' + spark(h.concat([cur]), 120, 30, flagged) + '</a>';
  }
  function spark(vals, W, H, flagged) {
    const xs = vals.map((v, i) => [i, v]).filter(p => p[1] != null); if (xs.length < 2) return '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"></svg>';
    const prev = vals.slice(0, 7).filter(v => v != null), lo = Math.min(...prev), hi = Math.max(...prev), all = xs.map(p => p[1]), mn = Math.min(...all), mx = Math.max(...all), sp = (mx - mn) || 1;
    const y = v => H - 3 - (v - mn) / sp * (H - 8), x = i => 3 + i * (W - 6) / 7;
    let g = prev.length >= 2 ? '<rect x="2" y="' + y(hi).toFixed(1) + '" width="' + (W - 4) + '" height="' + Math.max(2, y(lo) - y(hi)).toFixed(1) + '" rx="3" class="band"/>' : '';
    g += '<polyline points="' + xs.map(p => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ') + '" class="ln"/>';
    const last = xs[xs.length - 1]; g += '<circle cx="' + x(last[0]).toFixed(1) + '" cy="' + y(last[1]).toFixed(1) + '" r="3.5" class="' + (flagged ? 'dot un' : 'dot') + '"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + g + '</svg>';
  }

  /* commitments (for the next report's "Last week we said") and recipients */
  let COMMIT = {}, RECIP = [];
  async function loadConfig() {
    const [c, r] = await Promise.all([DB.collection('grid_config').doc('commitments').get(), DB.collection('grid_config').doc('recipients').get()]);
    COMMIT = (c.exists && c.data().weeks) || {}; RECIP = (r.exists && r.data().list) || [];
  }
  function commitmentsForm(w) {
    const rows = (COMMIT[w._id] || []).concat([{}]).slice(0, 4);
    return '<h4>This huddle’s commitments</h4><p class="rp-note">What the team agrees to try this week. Next Monday’s report checks them in “Last week we said”.</p><div class="rp-form" id="rp-commit">' +
      rows.map((c, i) => '<div class="rp-row"><input aria-label="We said" placeholder="We said…" data-k="said" value="' + esc(c.said || '') + '"><input aria-label="Owner" placeholder="Owner" data-k="owner" value="' + esc(c.owner || '') + '">' +
        '<input aria-label="This week we saw" placeholder="This week we saw (optional)" data-k="saw" value="' + esc(c.saw || '') + '">' +
        '<select aria-label="Status" data-k="status">' + ['New', 'In progress', 'Done'].map(s => '<option' + ((c.status || 'New') === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>').join('') +
      '<button type="button" class="rp-btn" data-save="commit">Save commitments</button></div>';
  }
  function recipientsForm() {
    const rows = (RECIP.length ? RECIP : [{ email: USER.email, services: SERVICES }]).concat([{ email: '', services: [] }]);
    return '<h4>Who gets it</h4><p class="rp-note">Each person gets one email per service ticked. Until this is saved, every copy goes to ' + esc(USER.email) + ' only.</p><div class="rp-form" id="rp-recip">' +
      rows.map(r => '<div class="rp-row r"><input type="email" aria-label="Email" placeholder="name@vca.com" data-k="email" value="' + esc(r.email || '') + '">' +
        SERVICES.map(s => '<label class="rp-chk"><input type="checkbox" data-s="' + s + '"' + ((r.services || []).includes(s) ? ' checked' : '') + '>' + s + '</label>').join('') + '</div>').join('') +
      '<button type="button" class="rp-btn" data-save="recip">Save recipients</button></div>';
  }
  function wireForms(w) {
    const p = $('rp');
    p.querySelector('[data-save="commit"]').addEventListener('click', async () => {
      const list = [...p.querySelectorAll('#rp-commit .rp-row')].map(r => { const o = {}; r.querySelectorAll('[data-k]').forEach(i => o[i.dataset.k] = i.value.trim()); return o; }).filter(o => o.said);
      try { await DB.collection('grid_config').doc('commitments').set({ weeks: { [w._id]: list }, updated_at: new Date().toISOString(), updated_by: USER.email }, { merge: true }); COMMIT[w._id] = list; toast('Saved. Next Monday’s report will check ' + list.length + ' commitment' + (list.length === 1 ? '' : 's') + '.'); }
      catch (e) { toast(e.code === 'permission-denied' ? 'Not saved: the database rules for Grid aren’t published yet.' : 'Not saved. Check the connection.'); }
    });
    p.querySelector('[data-save="recip"]').addEventListener('click', async () => {
      const list = [...p.querySelectorAll('#rp-recip .rp-row')].map(r => ({ email: r.querySelector('[data-k=email]').value.trim().toLowerCase(), services: [...r.querySelectorAll('[data-s]')].filter(c => c.checked).map(c => c.dataset.s) }))
        .filter(r => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email) && r.services.length);
      if (!list.length) return toast('Add at least one email with a service ticked.');
      try { await DB.collection('grid_config').doc('recipients').set({ list, updated_at: new Date().toISOString(), updated_by: USER.email }); RECIP = list; toast('Saved. ' + list.length + ' recipient' + (list.length === 1 ? '' : 's') + ' from the next send.'); }
      catch (e) { toast(e.code === 'permission-denied' ? 'Not saved: the database rules for Grid aren’t published yet.' : 'Not saved. Check the connection.'); }
    });
  }

  async function act(what, w, svc, btn) {
    try {
      if (what === 'open') { btn.disabled = true; btn.textContent = 'Opening…'; const f = await file(w._id, 'xlsx'); window.__gridOpen = { name: f.name, base64: b64(f.bytes) }; if (window.__gridStart) window.__gridStart(); close(); toast('Opening ' + f.name + ' in Grid…'); return; }
      if (what === 'xlsx') { save(await file(w._id, 'xlsx')); return; }
      if (what === 'pdf') { save(await file(w._id, 'packet-' + svc)); return; }
      if (what === 'draft') { save(await file(w._id, 'draft-ER')); return; }
      if (what === 'review' || what === 'unreview') {
        if (what === 'review' && !confirm('You’ve read this week’s report?\n\nGrid emails each director their copy within about 15 minutes, signed “Reviewed by ' + nameOf(USER) + '”.')) return;
        const upd = what === 'review' ? { review: { by: nameOf(USER), email: USER.email, at: new Date().toISOString() }, status: 'reviewed' } : { review: null, status: 'ready' };
        await DB.collection('grid_reports').doc(w._id).update(upd); Object.assign(w, upd); pill(); showReport(w._id, svc);
        toast(what === 'review' ? 'Reviewed. Directors get their copy within about 15 minutes.' : 'Review undone. Nothing will be sent.');
      }
    } catch (e) { console.warn('[reports]', e); toast(e.code === 'permission-denied' ? 'Grid can’t reach the reports yet: the database rules need publishing.' : (String(e.message || e).includes('not saved') ? 'That file isn’t ready yet.' : 'That didn’t work. Check the connection.')); if (btn) { btn.disabled = false; } }
  }

  /* ───────── #visits/<week>/<slug> ───────── */
  async function showVisits(id, slug) {
    const w = await week(id); if (!w) return show(head('Visits', 'Report not found', 'That week isn’t in Grid.') + '<div class="rp-b"></div>');
    let key = slug in ALIAS ? ALIAS[slug] : slug, note = '';
    if (key && key.indexOf('my-service/') === 0) key = 'patients';
    if (/^doctor-\d+$/.test(slug) || /^day-\d$/.test(slug)) key = slug;
    const D = w.drill || {};
    if (key === null) return show(head('Visits · ' + (w.labels ? w.labels.short : ''), 'Not recorded yet', 'Flow doesn’t record this yet, so there are no visits to list.') + '<div class="rp-b"></div>');
    if (!D[key]) { note = 'The visits behind this number are listed with every visit for the week.'; key = 'patients'; }
    const L = D[key] || [];
    const html = head('Visits · ' + (w.labels ? w.labels.short : w._id), TITLES[slug] || TITLES[key] || slug.replace(/-/g, ' '), (L.length ? L.length + ' shown' : 'None this week') + (note ? ' · ' + note : '')) +
      '<div class="rp-b"><div class="rp-recs">' + L.map(x => {
        const sid = String(x.id || ''), link = sid ? '/treatment/#sheet=' + encodeURIComponent(/^(v|s)_/.test(sid) ? sid : 'v_' + sid) : null;
        return '<div class="rp-rec">' + (x.tri ? '<span class="tri ' + esc(x.tri.toLowerCase()) + '">' + esc(x.tri) + '</span>' : '<span class="tri"></span>') +
          '<span class="nm">' + esc(x.pet) + ' <small>' + esc([x.species, x.code, when(x.when)].filter(Boolean).join(' · ')) + '</small></span>' +
          '<span class="vl">' + esc(x.value) + '<small>' + esc(x.sub) + '</small></span>' +
          (link && /Admitted|ICU|Ward|in the ICU/.test((x.value || '') + (x.sub || '')) ? '<a class="go" href="' + link + '" aria-label="Open the treatment sheet">Sheet</a>' : '') + '</div>';
      }).join('') + '</div><div class="rp-acts"><a class="rp-btn" href="#report/' + w._id + '">The whole report</a></div>' +
      '<p class="rp-foot">Pet name and visit ID only. Admitted patients open their treatment sheet.</p></div>';
    show(html);
  }

  /* ───────── #trend/<slug>[/<week>] ───────── */
  async function showTrend(slug, id) {
    const w = id ? await week(id) : WEEKS[0], T = TREND[slug];
    if (!w || !T) return show(head('Last 8 weeks', 'Not found', '') + '<div class="rp-b"></div>');
    const H = w.history || {}, vals = (H[slug] || []).concat([(H.this || [])[H8.indexOf(slug)]]), weeks = H.weeks || [];
    const prev = vals.slice(0, 7).filter(v => v != null), flagged = (w.flags || []).includes(slug);
    const html = head('Last 8 weeks · ' + (w.labels ? w.labels.short : ''), T[0], prev.length >= 2 ? 'Usual range ' + T[1](Math.min(...prev)) + '–' + T[1](Math.max(...prev)) + (flagged ? ' · this week is outside it' : '') : 'Grid needs two earlier weeks to show a usual range') +
      '<div class="rp-b"><div class="rp-big' + (flagged ? ' un' : '') + '">' + spark(vals, 360, 120, flagged) + '</div><table class="rp-tbl"><thead><tr><th>Week of</th><th>' + esc(T[0]) + '</th></tr></thead><tbody>' +
      vals.map((v, i) => '<tr' + (i === 7 ? ' class="now"' : '') + '><td>' + esc(weeks[i] || '') + (i === 7 ? ' · this week' : '') + '</td><td>' + (v == null ? '—' : esc(T[1](v))) + '</td></tr>').join('') + '</tbody></table>' +
      '<div class="rp-acts"><a class="rp-btn" href="#visits/' + w._id + '/' + slug + '">This week’s visits</a><a class="rp-btn" href="#report/' + w._id + '">The whole report</a></div></div>';
    show(html);
  }

  async function route() {
    const h = decodeURIComponent(location.hash || '').replace(/^#/, ''), p = h.split('/');
    try {
      if (p[0] === 'report') return showReport(p[1] || '', p[2]);
      if (p[0] === 'visits') return showVisits(p[1], p.slice(2).join('/') || 'patients');
      if (p[0] === 'trend') return showTrend(p[1], p[2]);
    } catch (e) { console.warn('[reports]', e); show(head('Weekly reports', 'Grid can’t read the reports yet', e.code === 'permission-denied' ? 'The database rules for Grid need publishing (Firebase console).' : 'Check the connection and try again.') + '<div class="rp-b"></div>'); }
  }
  /* routes that don't need the spreadsheet engine (a link from an email or the workbook) open without loading it */
  window.__gridReportsWantsEngine = function () { return !/^#(visits|trend)\//.test(location.hash || ''); };
  window.__gridReports = async function (user) {
    USER = user; DB = firebase.firestore(); mount();
    try { await Promise.all([loadWeeks(), loadConfig()]); } catch (e) { console.warn('[reports] not readable yet', e && e.code); }
    pill(); route();
  };

  const CSS = `
  #rp[hidden],#rp-pill[hidden],#rp-toast[hidden],#rp-scrim[hidden]{display:none!important}
  #rp-pill{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:20;display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--hair);background:var(--card);color:var(--ink);font:600 13px/1 var(--font);box-shadow:0 6px 22px -10px rgba(10,20,40,.35);cursor:pointer}
  #rp-pill i{width:8px;height:8px;border-radius:50%;background:var(--accent)} #rp-pill[data-tone=amber] i{background:#E8A830} #rp-pill[data-tone=green] i{background:#34C759}
  #rp-pill:focus-visible,#rp button:focus-visible,#rp a:focus-visible,#rp input:focus-visible,#rp select:focus-visible{outline:3px solid var(--ring);outline-offset:2px}
  #rp-scrim{position:fixed;inset:0;z-index:30;background:rgba(8,14,26,.32)}
  #rp{position:fixed;z-index:31;top:0;right:0;bottom:0;width:min(440px,100%);background:var(--card);color:var(--ink);box-shadow:-14px 0 44px rgba(10,20,40,.22);display:flex;flex-direction:column;font:14px/1.45 var(--font);padding-top:env(safe-area-inset-top,0px)}
  #rp.wide{width:min(560px,100%)} #rp-in{display:flex;flex-direction:column;min-height:0;flex:1}
  .rp-h{display:flex;gap:12px;align-items:flex-start;padding:20px 22px 14px;border-bottom:1px solid var(--hair)}
  .rp-h h2{margin:4px 0 0;font-size:18px;line-height:1.3;letter-spacing:-.01em;font-weight:700} .rp-h p{margin:4px 0 0;color:var(--ink2);font-size:13px}
  .rp-k{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink2)} .rp-k.acc{color:var(--accent)}
  .rp-x{margin-left:auto;flex:none;width:34px;height:34px;border-radius:10px;border:0;background:var(--bg);color:var(--ink2);font-size:20px;cursor:pointer}
  .rp-b{flex:1;overflow:auto;padding:16px 22px calc(24px + env(safe-area-inset-bottom,0px))}
  .rp-b h4{margin:20px 0 6px;font-size:13.5px} .rp-note{margin:0 0 8px;color:var(--ink2);font-size:12.5px}
  .rp-status{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:12px;background:var(--bg);font-size:12.5px;color:var(--ink2)}
  .rp-status b{color:var(--ink);font-size:13.5px} .rp-status[data-tone=amber] b{color:#B25000} .rp-status[data-tone=green] b{color:#248A3D}
  :root[data-theme=dark] .rp-status[data-tone=amber] b{color:#F2B451} :root[data-theme=dark] .rp-status[data-tone=green] b{color:#30D158}
  .rp-acts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
  .rp-btn{display:inline-flex;align-items:center;height:36px;padding:0 13px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:600 13px var(--font);text-decoration:none;cursor:pointer}
  .rp-btn.pri{background:var(--primary);border-color:transparent;color:#fff} .rp-btn.ok{background:#248A3D;border-color:transparent;color:#fff} .rp-btn:disabled{opacity:.6}
  .rp-seg{display:inline-flex;padding:3px;border-radius:11px;background:var(--bg);margin-top:4px}
  .rp-seg button{height:30px;padding:0 13px;border:0;border-radius:8px;background:transparent;color:var(--ink2);font:500 13px var(--font);cursor:pointer}
  .rp-seg button[aria-pressed=true]{background:var(--card);color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(10,20,40,.14)}
  .rp-svc{margin-top:10px;padding:14px 16px;border-radius:14px;background:var(--bg);border-left:3px solid var(--accent)} .rp-svc h3{margin:3px 0 8px;font-size:16px}
  .rp-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px} .rp-stat{color:inherit;text-decoration:none;display:flex;flex-direction:column}
  .rp-stat b{font-size:22px;letter-spacing:-.02em;font-variant-numeric:tabular-nums} .rp-stat b.focus{color:var(--accent)} .rp-stat span{font-size:12px;color:var(--ink2)}
  .rp-flag{display:block;margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(178,80,0,.09);color:inherit;text-decoration:none;font-size:13px}
  .rp-flag b{color:#B25000} :root[data-theme=dark] .rp-flag b{color:#F2B451} .rp-flag.calm{background:var(--bg)}
  .rp-list{list-style:none;margin:0;padding:0} .rp-list li{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--hair);font-size:13px} .rp-list li:last-child{border-bottom:0}
  .rp-list .sev{flex:none;width:8px;height:8px;border-radius:50%;margin-top:6px;background:var(--ink2)} .sev.p1{background:#C42A3A} .sev.p2{background:#B98A0E} .sev.ok{background:#248A3D} .sev.acc{background:var(--accent)}
  .rp-list em{font-style:normal;font-weight:600;color:var(--ink2)} .rp-list.mute li,.rp-list .mute{color:var(--ink2)}
  .rp-trends{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  .rp-tt{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:12px;background:var(--bg);color:inherit;text-decoration:none}
  .rp-tt span{font-size:12px;color:var(--ink2)} .rp-tt b{font-size:17px;font-variant-numeric:tabular-nums} .rp-tt.un span,.rp-tt.un b{color:#B25000} :root[data-theme=dark] .rp-tt.un span,:root[data-theme=dark] .rp-tt.un b{color:#F2B451}
  .rp-tt svg,.rp-big svg{width:100%;height:auto;display:block;margin-top:4px}
  #rp .band{fill:var(--hair)} #rp .ln{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round} #rp .dot{fill:var(--accent);stroke:var(--card);stroke-width:2} #rp .dot.un{fill:#B25000}
  .rp-big{padding:12px;border-radius:14px;background:var(--bg)}
  .rp-tbl{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px} .rp-tbl th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2);padding:6px 0;border-bottom:1px solid var(--line)}
  .rp-tbl th:last-child,.rp-tbl td:last-child{text-align:right} .rp-tbl td{padding:7px 0;border-bottom:1px solid var(--hair);font-variant-numeric:tabular-nums} .rp-tbl tr.now td{font-weight:700}
  .rp-recs{display:flex;flex-direction:column} .rp-rec{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--hair)}
  .rp-rec .tri{font-size:11px;font-weight:700;padding:3px 6px;border-radius:6px;color:#fff;background:var(--ink2);min-width:22px;text-align:center} .tri.p1{background:#C42A3A} .tri.p2{background:#B98A0E} .tri.p3{background:#2F55BE} .rp-rec .tri:empty{background:transparent;min-width:0;padding:0}
  .rp-rec .nm{font-weight:600} .rp-rec small{display:block;font-weight:400;color:var(--ink2);font-size:12px} .rp-rec .vl{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
  .rp-rec .go{font-size:12.5px;font-weight:600;color:var(--accent);text-decoration:none}
  .rp-form{display:flex;flex-direction:column;gap:8px} .rp-row{display:grid;grid-template-columns:2fr 1fr;gap:6px} .rp-row.r{grid-template-columns:minmax(0,1fr) auto auto auto;align-items:center}
  .rp-row input,.rp-row select{height:36px;border-radius:9px;border:1px solid var(--line);background:var(--field);color:var(--ink);font:13px var(--font);padding:0 10px;min-width:0}
  .rp-chk{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--ink2)} .rp-form .rp-btn{align-self:flex-start}
  .rp-weeks{list-style:none;margin:0;padding:0} .rp-weeks a{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--hair);color:inherit;text-decoration:none;font-size:13px} .rp-weeks span{color:var(--ink2)}
  .rp-foot{margin:20px 0 0;color:var(--ink2);font-size:12px}
  #rp-toast{position:fixed;left:50%;bottom:calc(64px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:40;background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:12px;font:500 13.5px var(--font);max-width:calc(100% - 32px)}
  @media (max-width:560px){ .rp-row{grid-template-columns:1fr} .rp-row.r{grid-template-columns:1fr auto auto auto} #rp-pill span{max-width:62vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} }
  @media (prefers-reduced-motion:reduce){ *{transition:none!important} }`;
})();
