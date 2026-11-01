'use strict';
/*
 * Pravix Cloud Firestore rules regression suite.
 * Uses demo-pravix-security + Local Emulator Suite ONLY.
 * Never run against a real Firebase project.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  doc, collection, query, where,
  getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp
} = require('firebase/firestore');

async function main() {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST,
    'Only run with FIRESTORE_EMULATOR_HOST set by Firebase Emulator Suite');
  const rules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
  const env = await initializeTestEnvironment({
    projectId: 'demo-pravix-security',
    firestore: { rules },
  });
  const seen = [];
  const check = async (name, fn) => {
    await fn();
    seen.push(name);
    process.stdout.write('PASS ' + name + '\n');
  };

  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'staff_members', 'staff-a'), {
        active: true, tenant_id: 'shoreline', role: 'doctor',
      });
      await setDoc(doc(db, 'staff_members', 'staff-b'), {
        active: true, tenant_id: 'another-hospital', role: 'doctor',
      });
      await setDoc(doc(db, 'staff_members', 'staff-disabled'), {
        active: false, tenant_id: 'shoreline', role: 'doctor',
      });
      await setDoc(doc(db, 'staff_members', 'lobby-uid'), {
        active: true, tenant_id: 'shoreline', role: 'admin',
      });
      await setDoc(doc(db, 'visits', 'visit-a'), {
        tenant_id: 'shoreline', status: 'Waiting', is_active: true,
      });
      await setDoc(doc(db, 'visits', 'visit-b'), {
        tenant_id: 'another-hospital', status: 'Waiting', is_active: true,
      });
      await setDoc(doc(db, 'pub', 'tracker-open'), {
        tenant_id: 'shoreline', is_active: true,
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
      await setDoc(doc(db, 'pub', 'tracker-closed'), {
        tenant_id: 'shoreline', is_active: false,
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
    });

    const anon = env.unauthenticatedContext().firestore();
    const unlisted = env.authenticatedContext('unknown-uid', {
      email: 'new-user@example.test',
    }).firestore();
    const staff = env.authenticatedContext('staff-a', {
      email: 'approved@example.test',
    }).firestore();
    const otherHospital = env.authenticatedContext('staff-b', {
      email: 'remote@example.test',
    }).firestore();
    const disabled = env.authenticatedContext('staff-disabled', {
      email: 'former@example.test',
    }).firestore();
    const lobby = env.authenticatedContext('lobby-uid', {
      email: 'au733@vca.com',
    }).firestore();

    await check('anonymous cannot read clinical visit', () =>
      assertFails(getDoc(doc(anon, 'visits', 'visit-a'))));
    await check('unlisted signed-in user is NOT staff', () =>
      assertFails(getDoc(doc(unlisted, 'visits', 'visit-a'))));
    await check('disabled account cannot read visits', () =>
      assertFails(getDoc(doc(disabled, 'visits', 'visit-a'))));
    await check('separate hospital account cannot read Shoreline visit', () =>
      assertFails(getDoc(doc(otherHospital, 'visits', 'visit-a'))));
    await check('lobby account cannot use staff permissions', () =>
      assertFails(getDoc(doc(lobby, 'visits', 'visit-a'))));
    await check('approved Shoreline staff can read Shoreline visit', () =>
      assertSucceeds(getDoc(doc(staff, 'visits', 'visit-a'))));
    await check('Shoreline staff cannot read foreign-hospital visit', () =>
      assertFails(getDoc(doc(staff, 'visits', 'visit-b'))));
    await check('Shoreline staff can query Shoreline visits', () =>
      assertSucceeds(getDocs(query(collection(staff, 'visits'),
        where('tenant_id', '==', 'shoreline')))));
    await check('unscoped visits listing is refused', () =>
      assertFails(getDocs(collection(staff, 'visits'))));
    await check('Shoreline staff cannot create foreign-hospital visit', () =>
      assertFails(setDoc(doc(staff, 'visits', 'new-other'),
        {tenant_id: 'another-hospital', status: 'Waiting'})));
    await check('approved Shoreline staff can create Shoreline visit', () =>
      assertSucceeds(setDoc(doc(staff, 'visits', 'new-shoreline'),
        {tenant_id: 'shoreline', status: 'Waiting'})));
    await check('Shoreline staff cannot change visit tenant', () =>
      assertFails(updateDoc(doc(staff, 'visits', 'visit-a'),
        {tenant_id: 'another-hospital'})));
    await check('clinical visits are not deletable by clients', () =>
      assertFails(deleteDoc(doc(staff, 'visits', 'visit-a'))));
    await check('client cannot self-provision staff membership', () =>
      assertFails(setDoc(doc(unlisted, 'staff_members', 'unknown-uid'),
        {active: true, tenant_id: 'shoreline', role: 'admin'})));
    await check('staff cannot elevate membership', () =>
      assertFails(updateDoc(doc(staff, 'staff_members', 'staff-a'),
        {role: 'admin'})));
    await check('anonymous intake cannot target other hospital', () =>
      assertFails(setDoc(doc(anon, 'client_intakes', 'fake-other-hospital'),
        {tenant_id: 'another-hospital', record: {id: 'fake-other-hospital'}})));
    await check('anonymous valid CPR request remains possible', () =>
      assertSucceeds(updateDoc(doc(anon, 'pub', 'tracker-open'), {
        resus_pref: 'CPR',
        resus_status: 'client_selected',
        resus_recorded_at: serverTimestamp(),
      })));
    await check('anonymous cannot forge clinician CPR confirmation', () =>
      assertFails(updateDoc(doc(anon, 'pub', 'tracker-open'), {
        resus_pref: 'DNR',
        resus_status: 'confirmed',
        resus_recorded_at: serverTimestamp(),
      })));
    await check('anonymous cannot change closed visit CPR preference', () =>
      assertFails(updateDoc(doc(anon, 'pub', 'tracker-closed'), {
        resus_pref: 'CPR',
        resus_status: 'client_selected',
        resus_recorded_at: serverTimestamp(),
      })));
    await check('family message works for an active tracker', () =>
      assertSucceeds(setDoc(doc(anon, 'messages', 'tracker-open', 'items', 'message-one'), {
        sender: 'client', body: 'Test message', created_at: new Date().toISOString(),
      })));
    await check('family message cannot masquerade as staff', () =>
      assertFails(setDoc(doc(anon, 'messages', 'tracker-open', 'items', 'message-two'), {
        sender: 'staff', body: 'Forged', created_at: new Date().toISOString(),
      })));
    await check('family message cannot add forged staff metadata', () =>
      assertFails(setDoc(doc(anon, 'messages', 'tracker-open', 'items', 'message-three'), {
        sender: 'client', body: 'Forged metadata', created_at: new Date().toISOString(),
        staff_name: 'Test doctor',
      })));
    await check('closed tracker cannot create new family messages', () =>
      assertFails(setDoc(doc(anon, 'messages', 'tracker-closed', 'items', 'message-four'), {
        sender: 'client', body: 'Post closure', created_at: new Date().toISOString(),
      })));
    process.stdout.write('Passed ' + seen.length + ' emulator authorization tests.\n');
  } finally {
    await env.cleanup();
  }
}
main().catch(err => {
  console.error('Firestore rules regression failure:', err);
  process.exitCode = 1;
});
