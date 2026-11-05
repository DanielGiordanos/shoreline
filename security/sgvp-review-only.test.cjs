'use strict';
/*
 * ro1 (Nov 4 2026): review-only accounts. A staff_members record with role 'reviewer' opens Intern reviews as an
 * evaluator and nothing else. Emulator only (demo-pravix-security); synthetic users and records.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, query, where, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');

async function main() {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Only run with FIRESTORE_EMULATOR_HOST set by Firebase Emulator Suite');
  const rules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
  const env = await initializeTestEnvironment({ projectId: 'demo-pravix-security', firestore: { rules } });
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; process.stdout.write('PASS ' + name + '\n'); };
  const RV = 'synthetic-reviewer@vca.com', RV2 = 'synthetic-reviewer2@vca.com', DOC = 'synthetic-doctor@vca.com';
  const round = 'r1', intern = 'i1';
  const aid = round + '__' + intern + '__' + RV, aid2 = round + '__' + intern + '__' + RV2, aidD = round + '__' + intern + '__' + DOC;
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'staff_members', 'rev-a'), { active: true, tenant_id: 'shoreline', role: 'reviewer' });
      await setDoc(doc(db, 'staff_members', 'rev-b'), { active: true, tenant_id: 'shoreline', role: 'reviewer' });
      await setDoc(doc(db, 'staff_members', 'rev-off'), { active: false, tenant_id: 'shoreline', role: 'reviewer' });
      await setDoc(doc(db, 'staff_members', 'rev-other'), { active: true, tenant_id: 'another-hospital', role: 'reviewer' });
      await setDoc(doc(db, 'staff_members', 'doc-a'), { active: true, tenant_id: 'shoreline', role: 'doctor' });
      await setDoc(doc(db, 'sgvp_review_rounds', round), { name: 'Mid-year', kind: 'mid', period: 'March', year: 2027, interns: [intern], status: 'open' });
      for (const [id, em] of [[aid, RV], [aid2, RV2], [aidD, DOC]])
        await setDoc(doc(db, 'sgvp_review_assign', id), { round, intern, email: em, evaluator_name: em, record_id: 'SGVP-2627-0001-ASM-01' });
      await setDoc(doc(db, 'sgvp_reviews', aid2), { round, intern, email: RV2, uid: 'rev-b', evaluator_name: RV2, record_id: 'SGVP-2627-0001-ASM-01', status: 'draft', answers: {} });
      await setDoc(doc(db, 'sgvp_profiles', 'p1'), { name: 'Synthetic intern' });
      await setDoc(doc(db, 'curriculum', 'grid'), { weeks: [] });
      await setDoc(doc(db, 'sgvp_roles', DOC), { admin: false });
      await setDoc(doc(db, 'visits', 'v1'), { tenant_id: 'shoreline', name: 'Synthetic pet' });
    });
    const rv = env.authenticatedContext('rev-a', { email: RV, email_verified: true }).firestore();
    const off = env.authenticatedContext('rev-off', { email: 'off@vca.com', email_verified: true }).firestore();
    const oth = env.authenticatedContext('rev-other', { email: 'x@vca.com', email_verified: true }).firestore();
    const dr = env.authenticatedContext('doc-a', { email: DOC, email_verified: true }).firestore();

    await check('a reviewer reads her own staff_members record, and no one else\'s', async () => {
      await assertSucceeds(getDoc(doc(rv, 'staff_members', 'rev-a')));
      await assertFails(getDoc(doc(rv, 'staff_members', 'doc-a')));
      await assertFails(getDocs(collection(rv, 'staff_members')));
    });
    await check('a reviewer cannot change her own record (no promotion to staff)', async () => {
      await assertFails(updateDoc(doc(rv, 'staff_members', 'rev-a'), { role: 'doctor' }));
    });
    await check('a reviewer reads the review rounds', async () => {
      await assertSucceeds(getDoc(doc(rv, 'sgvp_review_rounds', round)));
      await assertSucceeds(getDocs(collection(rv, 'sgvp_review_rounds')));
    });
    await check('a reviewer reads only her own assignments', async () => {
      await assertSucceeds(getDocs(query(collection(rv, 'sgvp_review_assign'), where('email', '==', RV))));
      await assertSucceeds(getDoc(doc(rv, 'sgvp_review_assign', aid)));
      await assertFails(getDoc(doc(rv, 'sgvp_review_assign', aidD)));
      await assertFails(getDocs(collection(rv, 'sgvp_review_assign')));
    });
    await check('a reviewer opens, drafts and submits her own review', async () => {
      await assertSucceeds(getDoc(doc(rv, 'sgvp_reviews', aid)));   // before it exists
      await assertSucceeds(setDoc(doc(rv, 'sgvp_reviews', aid), {
        round, intern, email: RV, uid: 'rev-a', evaluator_name: RV, record_id: 'SGVP-2627-0001-ASM-01',
        answers: {}, notes: '', observations: '', progress: 0, status: 'draft', created_at: serverTimestamp(), updated_at: serverTimestamp() }));
      await assertSucceeds(updateDoc(doc(rv, 'sgvp_reviews', aid), { progress: 10, updated_at: serverTimestamp() }));
      await assertSucceeds(updateDoc(doc(rv, 'sgvp_reviews', aid), { status: 'submitted', submitted_at: serverTimestamp(), updated_at: serverTimestamp() }));
      await assertFails(updateDoc(doc(rv, 'sgvp_reviews', aid), { progress: 20, updated_at: serverTimestamp() }));   // locked
    });
    await check('a reviewer cannot read or write another evaluator\'s review', async () => {
      await assertFails(getDoc(doc(rv, 'sgvp_reviews', aid2)));
      await assertFails(updateDoc(doc(rv, 'sgvp_reviews', aid2), { progress: 5, updated_at: serverTimestamp() }));
      await assertFails(getDoc(doc(rv, 'sgvp_reviews', aidD)));
    });
    await check('a reviewer is not a review manager: no All reviews, rounds or assignments', async () => {
      await assertFails(getDocs(collection(rv, 'sgvp_reviews')));
      await assertFails(setDoc(doc(rv, 'sgvp_review_rounds', 'r2'), { name: 'x', interns: [], status: 'open' }));
      await assertFails(setDoc(doc(rv, 'sgvp_review_assign', 'r1__i1__someone@vca.com'), { round, intern, email: 'someone@vca.com', evaluator_name: 'x', record_id: 'y' }));
    });
    await check('a reviewer reads nothing else in Pravix', async () => {
      await assertFails(getDoc(doc(rv, 'sgvp_profiles', 'p1')));
      await assertFails(getDoc(doc(rv, 'curriculum', 'grid')));
      await assertFails(getDoc(doc(rv, 'sgvp_roles', DOC)));
      await assertFails(getDoc(doc(rv, 'visits', 'v1')));
      await assertFails(setDoc(doc(rv, 'visits', 'v2'), { tenant_id: 'shoreline' }));
    });
    await check('an inactive or other-hospital reviewer record opens nothing', async () => {
      for (const db of [off, oth]) {
        await assertFails(getDoc(doc(db, 'sgvp_review_rounds', round)));
        await assertFails(getDoc(doc(db, 'staff_members', db === off ? 'rev-off' : 'rev-other')));
      }
    });
    await check('a doctor still works as an evaluator, and still reads the rest of Pravix', async () => {
      await assertSucceeds(getDoc(doc(dr, 'sgvp_review_rounds', round)));
      await assertSucceeds(getDoc(doc(dr, 'sgvp_review_assign', aidD)));
      await assertSucceeds(getDoc(doc(dr, 'sgvp_reviews', aidD)));
      await assertSucceeds(getDoc(doc(dr, 'sgvp_profiles', 'p1')));
      await assertSucceeds(getDoc(doc(dr, 'curriculum', 'grid')));
    });
    console.log(passed + ' checks passed');
  } finally { await env.cleanup(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
