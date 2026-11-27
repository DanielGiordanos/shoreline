'use strict';
/*
 * Doctor schedule (scheduling/doctors/) Firestore rules: doctor_roster, doctor_roster_private, doctor_roster_inbox.
 * Uses the Local Emulator Suite ONLY (demo project). Never run against a real Firebase project.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, query, where, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');

const PEOPLE = {
  kelley:  { email: 'kelley.harpin@vca.com',  role: 'doctor' },
  manager: { email: 'pat.manager@vca.com',    role: 'management' },
  mara:    { email: 'mara.kraenzlin@vca.com', role: 'doctor' },
  mike:    { email: 'michael.mccann@vca.com', role: 'doctor' },
  desk:    { email: 'front.desk@vca.com',     role: 'staff' },
  lobby:   { email: 'au733@vca.com',          role: 'staff' },
  stranger:{ email: 'someone@example.com',    role: null },
};

async function main() {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Only run with FIRESTORE_EMULATOR_HOST set by Firebase Emulator Suite');
  const rules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
  const env = await initializeTestEnvironment({ projectId: 'demo-doctor-schedule-rules', firestore: { rules } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, p] of Object.entries(PEOPLE)) {
      if (p.role) await setDoc(doc(db, 'staff_members', uid), { active: true, tenant_id: 'shoreline', role: p.role, email: p.email });
    }
  });
  const as = (uid) => env.authenticatedContext(uid, { email: PEOPLE[uid].email, email_verified: true }).firestore();
  const roster = (db, rev, extra = {}) => ({ record: '{"changed":[]}', base: null, rev, updatedAt: serverTimestamp(), updatedBy: extra.by || null, ...extra.data });
  let n = 0; const ok = async (label, p) => { await assertSucceeds(p); n++; console.log('  ✓', label); };
  const no = async (label, p) => { await assertFails(p); n++; console.log('  ✓', label); };

  console.log('doctor_roster');
  const k = as('kelley'), m = as('manager'), mara = as('mara'), mike = as('mike'), desk = as('desk'), lobby = as('lobby'), stranger = as('stranger');
  await no('a doctor cannot create the roster', setDoc(doc(mara, 'doctor_roster', '2026'), roster(mara, 1, { by: PEOPLE.mara.email })));
  await no('Kelley cannot start at rev 2', setDoc(doc(k, 'doctor_roster', '2026'), roster(k, 2, { by: PEOPLE.kelley.email })));
  await no('Kelley cannot save as someone else', setDoc(doc(k, 'doctor_roster', '2026'), roster(k, 1, { by: PEOPLE.mara.email })));
  await no('a bad year id is refused', setDoc(doc(k, 'doctor_roster', 'x2026'), roster(k, 1, { by: PEOPLE.kelley.email })));
  await ok('Kelley creates 2026 at rev 1', setDoc(doc(k, 'doctor_roster', '2026'), roster(k, 1, { by: PEOPLE.kelley.email })));
  await no('a stale save (rev 1 again) is refused', setDoc(doc(m, 'doctor_roster', '2026'), roster(m, 1, { by: PEOPLE.manager.email })));
  await ok('management saves rev 2', setDoc(doc(m, 'doctor_roster', '2026'), roster(m, 2, { by: PEOPLE.manager.email })));
  await no('extra fields are refused', setDoc(doc(k, 'doctor_roster', '2026'), roster(k, 3, { by: PEOPLE.kelley.email, data: { note: 'x' } })));
  await no('a doctor cannot save', setDoc(doc(mara, 'doctor_roster', '2026'), roster(mara, 3, { by: PEOPLE.mara.email })));
  await ok('a doctor reads it', getDoc(doc(mara, 'doctor_roster', '2026')));
  await ok('the front desk reads it', getDoc(doc(desk, 'doctor_roster', '2026')));
  await ok('staff list the years', getDocs(collection(desk, 'doctor_roster')));
  await no('the lobby screen account cannot read it', getDoc(doc(lobby, 'doctor_roster', '2026')));
  await no('an account without a staff record cannot read it', getDoc(doc(stranger, 'doctor_roster', '2026')));
  await no('signed out cannot read it', getDoc(doc(env.unauthenticatedContext().firestore(), 'doctor_roster', '2026')));
  await no('nobody deletes a year', deleteDoc(doc(k, 'doctor_roster', '2026')));
  await ok('Kelley starts 2027 with its base', setDoc(doc(k, 'doctor_roster', '2027'), roster(k, 1, { by: PEOPLE.kelley.email, data: { base: '{"raw":{}}' } })));

  console.log('doctor_roster_private');
  const fin = (by) => ({ finance: { budget: 90000 }, updatedAt: serverTimestamp(), updatedBy: by });
  await ok('Kelley saves rates and budget', setDoc(doc(k, 'doctor_roster_private', '2026'), fin(PEOPLE.kelley.email)));
  await ok('management reads them', getDoc(doc(m, 'doctor_roster_private', '2026')));
  await no('a doctor cannot read them', getDoc(doc(mara, 'doctor_roster_private', '2026')));
  await no('the front desk cannot read them', getDoc(doc(desk, 'doctor_roster_private', '2026')));
  await no('a doctor cannot write them', setDoc(doc(mara, 'doctor_roster_private', '2026'), fin(PEOPLE.mara.email)));

  console.log('doctor_roster_inbox');
  const item = { id: 1795000000000, kind: 'Trade', doctor: 'mara', recipient: 'mike', shiftId: 12, status: 'requested' };
  const send = (db, uid, extra = {}) => setDoc(doc(db, 'doctor_roster_inbox', `2026_change_${item.id}_${uid}`),
    { year: 2026, kind: 'change', item, uid, by: PEOPLE[uid].email, to: PEOPLE.mike.email, at: serverTimestamp(), ...extra });
  await ok('Mara sends a trade to Mike', send(mara, 'mara'));
  await ok('Mara reads her own', getDoc(doc(mara, 'doctor_roster_inbox', `2026_change_${item.id}_mara`)));
  await ok('Mike reads the one addressed to him', getDocs(query(collection(mike, 'doctor_roster_inbox'), where('to', '==', PEOPLE.mike.email))));
  await ok('Mara lists her own', getDocs(query(collection(mara, 'doctor_roster_inbox'), where('uid', '==', 'mara'))));
  await no('the front desk cannot read it', getDoc(doc(desk, 'doctor_roster_inbox', `2026_change_${item.id}_mara`)));
  await no('the front desk cannot list everything', getDocs(collection(desk, 'doctor_roster_inbox')));
  await ok('Kelley lists the year', getDocs(query(collection(k, 'doctor_roster_inbox'), where('year', '==', 2026))));
  await no('Mike cannot write into Mara’s document', setDoc(doc(mike, 'doctor_roster_inbox', `2026_change_${item.id}_mara`),
    { year: 2026, kind: 'change', item, uid: 'mike', by: PEOPLE.mike.email, to: null, at: serverTimestamp() }));
  await no('Mike cannot send as Mara', send(mike, 'mara'));
  await no('an id that is not the sender’s is refused', setDoc(doc(mike, 'doctor_roster_inbox', `2026_change_${item.id}_mara`),
    { year: 2026, kind: 'change', item, uid: 'mike', by: PEOPLE.mike.email, to: null, at: serverTimestamp() }));
  await no('an unknown kind is refused', setDoc(doc(mara, 'doctor_roster_inbox', `2026_approve_1_mara`),
    { year: 2026, kind: 'approve', item, uid: 'mara', by: PEOPLE.mara.email, to: null, at: serverTimestamp() }));
  await no('the lobby account cannot send', send(lobby, 'lobby'));
  await no('a doctor cannot delete it', deleteDoc(doc(mara, 'doctor_roster_inbox', `2026_change_${item.id}_mara`)));
  await ok('Kelley removes it once merged', deleteDoc(doc(k, 'doctor_roster_inbox', `2026_change_${item.id}_mara`)));

  await env.cleanup();
  console.log(`doctor schedule rules: ${n} checks passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
