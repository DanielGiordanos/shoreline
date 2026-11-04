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

function validSyntheticIntake(id) {
  const submittedAt = new Date().toISOString();
  return {
    tenant_id: 'shoreline', id, submittedAt,
    record: {
      id, submittedAt, status: 'awaiting_csr_review',
      patient: {name: 'Synthetic Pet', species:'Dog', weight:''},
      client: {first:'Synthetic',last:'Owner',phone:'',email:''},
      reason:'Synthetic staging reason',additionalProblems:[],
      priority:null,doctor:null,location:'Lobby',
    },
  };
}

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
      await setDoc(doc(db, 'staff_members', 'admin-a'), {
        active: true, tenant_id: 'shoreline', role: 'admin',
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
      await setDoc(doc(db, 'shifts', 'shoreline'), {assignments: {day: 'test'}});
      await setDoc(doc(db, 'alerts', 'shoreline'), {active: true, title: 'Test alert'});
      await setDoc(doc(db, 'shifts', 'another-hospital'), {assignments: {}});
      await setDoc(doc(db, 'tenants', 'shoreline', 'directory', 'roster'), {records: []});
      await setDoc(doc(db, 'tenants', 'another-hospital', 'directory', 'roster'), {records: []});
      await setDoc(doc(db, 'sheets', 'sheet-a'), {
        tenant_id: 'shoreline', patient: {name: 'Synthetic'}, status: 'active',
      });
      await setDoc(doc(db, 'sheets', 'sheet-b'), {
        tenant_id: 'another-hospital', patient: {name: 'Synthetic'}, status: 'active',
      });
      await setDoc(doc(db, 'sheets', 'sheet-a', 'days', 'd1'), {note: 'Test'});
      await setDoc(doc(db, 'sheets', 'sheet-b', 'days', 'd1'), {note: 'Test'});
      await setDoc(doc(db, 'ts_settings', 'protected-editors'), {
        editors: ['new-user@example.test'], data: 'safe',
      });
      await setDoc(doc(db, 'sgvp_review_rounds', 'r1'), {status: 'open'});
      await setDoc(doc(db, 'form_requests', 'form-open'), {
        tenant_id: 'shoreline', visit_id: 'visit-a', template_id: 'tpl-1',
        status: 'requested',
      });
      await setDoc(doc(db, 'form_requests', 'form-final'), {
        tenant_id: 'shoreline', visit_id: 'visit-a', template_id: 'tpl-1',
        status: 'signed',
      });
      await setDoc(doc(db, 'form_requests', 'form-other'), {
        tenant_id: 'another-hospital', visit_id: 'visit-b', template_id: 'tpl-1',
        status: 'requested',
      });
      await setDoc(doc(db, 'visit_docs', 'signed-one'), {
        tenant_id: 'shoreline', visit_id: 'visit-a',
        sha256: 'a'.repeat(64),
      });
      await setDoc(doc(db, 'visit_docs', 'signed-foreign'), {
        tenant_id: 'another-hospital', visit_id: 'visit-b',
        sha256: 'a'.repeat(64),
      });
      await setDoc(doc(db, 'visit_docs', 'signed-one', 'parts', '0'), {
        data: 'AAAA', i: 0, n: 1,
      });
      await setDoc(doc(db, 'visit_docs', 'signed-foreign', 'parts', '0'), {
        data: 'AAAA', i: 0, n: 1,
      });
      await setDoc(doc(db, 'pub', 'tracker-open'), {
        tenant_id: 'shoreline', is_active: true,
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
      await setDoc(doc(db, 'pub', 'tracker-closed'), {
        tenant_id: 'shoreline', is_active: false,
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
      await setDoc(doc(db, 'pub', 'tracker-grace'), {
        tenant_id: 'shoreline', is_active: false,
        access_expires_at: new Date(Date.now() + 24*60*60*1000),
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
      await setDoc(doc(db, 'pub', 'tracker-expired'), {
        tenant_id: 'shoreline', is_active: false,
        access_expires_at: new Date(Date.now() - 60*1000),
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
      await setDoc(doc(db, 'pub', 'tracker-revoked'), {
        tenant_id: 'shoreline', is_active: true,
        capability_revoked: true,
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
      await setDoc(doc(db, 'pub', 'tracker-other-tenant'), {
        tenant_id: 'other-hospital', is_active: true,
        resus_pref: null, resus_status: null, resus_recorded_at: null,
      });
      for (const token of ['tracker-closed','tracker-grace','tracker-expired','tracker-revoked','tracker-other-tenant']) {
        await setDoc(doc(db, 'messages', token, 'items', 'old-message'), {
          sender: 'staff', body: 'Synthetic no-patient note',
          created_at: new Date().toISOString(),
        });
      }
    });

    const anon = env.unauthenticatedContext().firestore();
    const unlisted = env.authenticatedContext('unknown-uid', {
      email: 'new-user@example.test',
    }).firestore();
    const admin = env.authenticatedContext('admin-a', {
      email: 'admin@example.test',
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
    await check('anonymous cannot read private staffing shifts', () =>
      assertFails(getDoc(doc(anon, 'shifts', 'shoreline'))));
    await check('anonymous cannot read internal hospital alerts', () =>
      assertFails(getDoc(doc(anon, 'alerts', 'shoreline'))));
    await check('approved staff can read their own shifts', () =>
      assertSucceeds(getDoc(doc(staff, 'shifts', 'shoreline'))));
    await check('foreign-hospital user cannot access Shoreline shifts', () =>
      assertFails(getDoc(doc(otherHospital, 'shifts', 'shoreline'))));
    await check('ordinary doctor cannot rewrite staffing assignments', () =>
      assertFails(updateDoc(doc(staff, 'shifts', 'shoreline'), {assignments: {day: 'forged'}})));
    await check('provisioned admin can edit staffing assignments', () =>
      assertSucceeds(updateDoc(doc(admin, 'shifts', 'shoreline'), {assignments: {day: 'updated'}})));
    await check('doctor cannot change alert without authorization', () =>
      assertFails(updateDoc(doc(staff, 'alerts', 'shoreline'), {title: 'forged'})));
    await check('admin can manage hospital alert', () =>
      assertSucceeds(updateDoc(doc(admin, 'alerts', 'shoreline'), {title: 'updated'})));
    await check('Shoreline staff cannot read another hospital directory', () =>
      assertFails(getDoc(doc(staff, 'tenants', 'another-hospital', 'directory', 'roster'))));
    await check('Shoreline staff can read Shoreline directory', () =>
      assertSucceeds(getDoc(doc(staff, 'tenants', 'shoreline', 'directory', 'roster'))));
    await check('staff cannot edit the directory without editor role', () =>
      assertFails(updateDoc(doc(staff, 'tenants', 'shoreline', 'directory', 'roster'), {records: ['forged']})));
    await check('approved admin may edit the Shoreline directory', () =>
      assertSucceeds(updateDoc(doc(admin, 'tenants', 'shoreline', 'directory', 'roster'), {records: []})));
    await check('Shoreline staff can access own treatment sheet', () =>
      assertSucceeds(getDoc(doc(staff, 'sheets', 'sheet-a'))));
    await check('Shoreline staff cannot access foreign treatment sheet', () =>
      assertFails(getDoc(doc(staff, 'sheets', 'sheet-b'))));
    await check('Shoreline staff cannot create foreign treatment sheet', () =>
      assertFails(setDoc(doc(staff, 'sheets', 'new-foreign-sheet'), {
        tenant_id: 'another-hospital', patient: {}, status: 'active',
      })));
    await check('Shoreline staff cannot retag treatment sheet', () =>
      assertFails(updateDoc(doc(staff, 'sheets', 'sheet-a'), {
        tenant_id: 'another-hospital',
      })));
    await check('Shoreline staff can access own charted subdocument', () =>
      assertSucceeds(getDoc(doc(staff, 'sheets', 'sheet-a', 'days', 'd1'))));
    await check('Shoreline staff cannot access foreign charted subdocument', () =>
      assertFails(getDoc(doc(staff, 'sheets', 'sheet-b', 'days', 'd1'))));
    await check('unapproved email-listed user cannot edit hospital settings', () =>
      assertFails(updateDoc(doc(unlisted, 'ts_settings', 'protected-editors'), {
        data: 'bad',
      })));
    await check('unapproved user cannot become SGVP review manager via email', () =>
      assertFails(getDoc(doc(unlisted, 'sgvp_review_rounds', 'r1'))));
    await check('cross-hospital inventory event is rejected', () =>
      assertFails(setDoc(doc(staff, 'kura_outbox', 'another-hospital', 'events', 'e1'), {
        event_id: 'e1', hospital: 'another-hospital', env: '{}',
        written_at: serverTimestamp(),
      })));
    await check('anonymous pending intake with valid patient/client fields remains possible', () =>
      assertSucceeds(setDoc(doc(anon, 'client_intakes', 'INT-synthetic123456'),
        validSyntheticIntake('INT-synthetic123456'))));
    await check('client cannot claim accepted intake on submission', () => {
      const x = validSyntheticIntake('INT-status999999');
      x.record.status='completed';
      return assertFails(setDoc(doc(anon, 'client_intakes', x.id), x));
    });
    await check('client intake document id must match submitted id', () => {
      const x = validSyntheticIntake('INT-synthetic8888');
      return assertFails(setDoc(doc(anon, 'client_intakes', 'INT-synthetic7777'), x));
    });
    await check('client intake cannot add privileged metadata fields', () => {
      const x = validSyntheticIntake('INT-synthetic5555');
      x.role='admin';
      return assertFails(setDoc(doc(anon, 'client_intakes', x.id), x));
    });
    await check('admin can read a Shoreline form request', () =>
      assertSucceeds(getDoc(doc(admin, 'form_requests', 'form-open'))));
    await check('approved staff cannot read other hospital form request', () =>
      assertFails(getDoc(doc(staff, 'form_requests', 'form-other'))));
    await check('clinician can create a form request in requested state', () =>
      assertSucceeds(setDoc(doc(staff, 'form_requests', 'form-new'), {
        tenant_id: 'shoreline', visit_id: 'visit-a', template_id: 'tpl-1',
        status: 'requested',
      })));
    await check('staff cannot directly create a forged signed request', () =>
      assertFails(setDoc(doc(staff, 'form_requests', 'forged-new'), {
        tenant_id: 'shoreline', visit_id: 'visit-a', template_id: 'tpl-1',
        status: 'signed',
      })));
    await check('staff cannot change form request patient visit', () =>
      assertFails(updateDoc(doc(staff, 'form_requests', 'form-open'), {
        visit_id: 'visit-b',
      })));
    await check('staff cannot change form request template', () =>
      assertFails(updateDoc(doc(staff, 'form_requests', 'form-open'), {
        template_id: 'another',
      })));
    await check('staff may advance form to with-family status', () =>
      assertSucceeds(updateDoc(doc(staff, 'form_requests', 'form-open'), {
        status: 'family',
      })));
    await check('staff may advance form to signed status', () =>
      assertSucceeds(updateDoc(doc(staff, 'form_requests', 'form-open'), {
        status: 'signed', sha256: 'a'.repeat(64), doc_id: 'signed-one',
      })));
    await check('signed form request cannot be reverted', () =>
      assertFails(updateDoc(doc(staff, 'form_requests', 'form-final'), {
        status: 'requested',
      })));
    await check('signed PDF document can be read by approved staff', () =>
      assertSucceeds(getDoc(doc(staff, 'visit_docs', 'signed-one'))));
    await check('signed PDF digest cannot be rewritten after save', () =>
      assertFails(updateDoc(doc(staff, 'visit_docs', 'signed-one'), {
        sha256: 'b'.repeat(64),
      })));
    await check('signed PDF tenant cannot be modified after creation', () =>
      assertFails(updateDoc(doc(staff, 'visit_docs', 'signed-one'), {
        tenant_id: 'another-hospital',
      })));
    await check('badly formatted signed PDF digest is rejected', () =>
      assertFails(setDoc(doc(staff, 'visit_docs', 'bad-signed-pdf'), {
        tenant_id: 'shoreline', visit_id: 'visit-a',
        sha256: 'z'.repeat(64),
      })));
    await check('foreign tenant signed PDF create is rejected', () =>
      assertFails(setDoc(doc(staff, 'visit_docs', 'foreign-signed-pdf'), {
        tenant_id: 'another-hospital', visit_id: 'visit-a',
        sha256: 'b'.repeat(64),
      })));
    await check('valid Shoreline signed PDF metadata is accepted', () =>
      assertSucceeds(setDoc(doc(staff, 'visit_docs', 'new-signed-pdf'), {
        tenant_id: 'shoreline', visit_id: 'visit-a',
        sha256: 'b'.repeat(64),
      })));
    await check('verification receipt must belong to Shoreline', () =>
      assertFails(setDoc(doc(staff, 'doc_verify', 'ABCD2345EFGH6789'), {
        tenant_id: 'another-hospital', v: 1, sha256: 'a'.repeat(64),
        signed_on: '2026-11-01', hospital: 'Foreign', title: 'Consent', pages: 1,
      })));
    await check('verification receipt must use real hex digest', () =>
      assertFails(setDoc(doc(staff, 'doc_verify', 'ABCD2345EFGH6789'), {
        tenant_id: 'shoreline', v: 1, sha256: 'z'.repeat(64),
        signed_on: '2026-11-01', hospital: 'Shoreline', title: 'Consent', pages: 1,
      })));
    await check('foreign signed PDF metadata cannot be read by Shoreline staff', () =>
      assertFails(getDoc(doc(staff, 'visit_docs', 'signed-foreign'))));
    await check('signed PDF list requires tenant restriction', () =>
      assertFails(getDocs(collection(staff, 'visit_docs'))));
    await check('signed PDF Shoreline-specific list succeeds', () =>
      assertSucceeds(getDocs(query(collection(staff, 'visit_docs'),
        where('tenant_id', '==', 'shoreline')))));
    await check('own signed PDF parts remain readable', () =>
      assertSucceeds(getDoc(doc(staff, 'visit_docs', 'signed-one', 'parts', '0'))));
    await check('foreign signed PDF parts cannot be read by Shoreline staff', () =>
      assertFails(getDoc(doc(staff, 'visit_docs', 'signed-foreign', 'parts', '0'))));
    await check('signing workflow can upload typed chunks before parent metadata', () =>
      assertSucceeds(setDoc(doc(staff, 'visit_docs', 'future-pdf', 'parts', '0'), {
        data: 'AAAA', i: 0, n: 1,
      })));
    await check('foreign existing signed PDF cannot receive new chunks', () =>
      assertFails(setDoc(doc(staff, 'visit_docs', 'signed-foreign', 'parts', '1'), {
        data: 'AAAA', i: 1, n: 2,
      })));
    await check('signed PDF chunk metadata cannot be forged with extra fields', () =>
      assertFails(setDoc(doc(staff, 'visit_docs', 'future-other', 'parts', '0'), {
        data: 'AAAA', i: 0, n: 1, privileged: true,
      })));
    // Prelaunch temporary self-activation checks, synthetic Auth JWTs only.
    const verifiedDaniel = env.authenticatedContext('pilot-daniel-uid', {
      email: 'daniel.giordano@pravix.app', email_verified: true,
    }).firestore();
    const verifiedHeather = env.authenticatedContext('pilot-heather-uid', {
      email: 'heather.galano@vca.com', email_verified: true,
    }).firestore();
    const unverifiedDaniel = env.authenticatedContext('pilot-unverified-uid', {
      email: 'daniel.giordano@pravix.app', email_verified: false,
    }).firestore();
    const verifiedOther = env.authenticatedContext('pilot-outsider-uid', {
      email: 'unknown@example.test', email_verified: true,
    }).firestore();
    const unverifiedPasswordHeather = env.authenticatedContext('heather-password-uid', {
      email: 'heather.galano@vca.com', email_verified: false,
      firebase: {sign_in_provider: 'password'},
    }).firestore();
    const unverifiedGoogleHeather = env.authenticatedContext('heather-google-uid', {
      email: 'heather.galano@vca.com', email_verified: false,
      firebase: {sign_in_provider: 'google.com'},
    }).firestore();
    const unverifiedPasswordOther = env.authenticatedContext('outsider-password-uid', {
      email: 'other@example.test', email_verified: false,
      firebase: {sign_in_provider: 'password'},
    }).firestore();
    const unverifiedPasswordDaniel = env.authenticatedContext('daniel-password-uid', {
      email: 'daniel.giordano@pravix.app', email_verified: false,
      firebase: {sign_in_provider: 'password'},
    }).firestore();
    const ownerPayload = {
      active: true, tenant_id: 'shoreline', role: 'owner',
      kura_owner: true, review_manager: true,
    };
    const directorPayload = {
      active: true, tenant_id: 'shoreline', role: 'management',
      kura_owner: false, review_manager: true,
    };
    await check('unverified email cannot self-provision owner', () =>
      assertFails(setDoc(doc(unverifiedDaniel, 'staff_members', 'pilot-unverified-uid'), ownerPayload)));
    await check('verified outsider cannot self-provision staff', () =>
      assertFails(setDoc(doc(verifiedOther, 'staff_members', 'pilot-outsider-uid'), ownerPayload)));
    await check('verified Heather cannot self-provision owner privileges', () =>
      assertFails(setDoc(doc(verifiedHeather, 'staff_members', 'pilot-heather-uid'), ownerPayload)));
    await check('verified owner cannot provision another UID', () =>
      assertFails(setDoc(doc(verifiedDaniel, 'staff_members', 'some-other-uid'), ownerPayload)));
    await check('verified owner cannot inject additional privilege flags', () =>
      assertFails(setDoc(doc(verifiedDaniel, 'staff_members', 'pilot-daniel-uid'), {
        ...ownerPayload, manage_roles: true,
      })));
    await check('verified Daniel may create his exact UID-bound owner membership', () =>
      assertSucceeds(setDoc(doc(verifiedDaniel, 'staff_members', 'pilot-daniel-uid'), ownerPayload)));
    await check('verified Heather may create her exact UID-bound management membership', () =>
      assertSucceeds(setDoc(doc(verifiedHeather, 'staff_members', 'pilot-heather-uid'), directorPayload)));
    await check('unverified Heather with existing Firebase password session can activate', () =>
      assertSucceeds(setDoc(doc(unverifiedPasswordHeather, 'staff_members', 'heather-password-uid'), directorPayload)));
    await check('activated password Heather can read SGVP review rounds', () =>
      assertSucceeds(getDocs(collection(unverifiedPasswordHeather, 'sgvp_review_rounds'))));
    await check('unverified Heather Google session cannot bypass verification', () =>
      assertFails(setDoc(doc(unverifiedGoogleHeather, 'staff_members', 'heather-google-uid'), directorPayload)));
    await check('unverified password outsider cannot self-provision', () =>
      assertFails(setDoc(doc(unverifiedPasswordOther, 'staff_members', 'outsider-password-uid'), directorPayload)));
    await check('unverified Daniel password still cannot self-provision', () =>
      assertFails(setDoc(doc(unverifiedPasswordDaniel, 'staff_members', 'daniel-password-uid'), ownerPayload)));
    await check('unverified Heather password cannot claim owner role', () =>
      assertFails(setDoc(doc(unverifiedPasswordHeather, 'staff_members', 'owner-forbidden'), ownerPayload)));
    await check('Heather membership cannot be elevated after onboarding', () =>
      assertFails(updateDoc(doc(unverifiedPasswordHeather, 'staff_members', 'heather-password-uid'), {role:'owner'})));
    await check('pilot member can read their own membership', () =>
      assertSucceeds(getDoc(doc(verifiedDaniel, 'staff_members', 'pilot-daniel-uid'))));
    await check('pilot management can read Shoreline visits after activation', () =>
      assertSucceeds(getDoc(doc(verifiedHeather, 'visits', 'visit-a'))));
    await check('pilot owner cannot change their privileged role afterward', () =>
      assertFails(updateDoc(doc(verifiedDaniel, 'staff_members', 'pilot-daniel-uid'), {role:'admin'})));
    await check('pilot owner cannot delete their own membership', () =>
      assertFails(deleteDoc(doc(verifiedDaniel, 'staff_members', 'pilot-daniel-uid'))));
    await check('disabled membership cannot reactivate through create-only policy', () =>
      assertFails(setDoc(doc(env.authenticatedContext('staff-disabled', {
        email:'daniel.giordano@pravix.app', email_verified:true,
      }).firestore(), 'staff_members', 'staff-disabled'), ownerPayload)));
    // Tracker bearer tokens: public access is bounded by revocation and expiry.
    await check('active tracker remains readable without sign-in', () =>
      assertSucceeds(getDoc(doc(anon, 'pub', 'tracker-open'))));
    await check('closed legacy tracker without expiry is denied', () =>
      assertFails(getDoc(doc(anon, 'pub', 'tracker-closed'))));
    await check('closed tracker within 48-hour grace can still be read', () =>
      assertSucceeds(getDoc(doc(anon, 'pub', 'tracker-grace'))));
    await check('expired tracker is not readable anonymously', () =>
      assertFails(getDoc(doc(anon, 'pub', 'tracker-expired'))));
    await check('revoked active tracker is not readable anonymously', () =>
      assertFails(getDoc(doc(anon, 'pub', 'tracker-revoked'))));
    await check('other-hospital tracker cannot be read by Shoreline family', () =>
      assertFails(getDoc(doc(anon, 'pub', 'tracker-other-tenant'))));
    await check('staff retain authorized read access to expired tracker', () =>
      assertSucceeds(getDoc(doc(staff, 'pub', 'tracker-expired'))));
    await check('closed legacy tracker conversation is denied', () =>
      assertFails(getDoc(doc(anon, 'messages', 'tracker-closed', 'items', 'old-message'))));
    await check('closed legacy tracker conversation listing is denied', () =>
      assertFails(getDocs(collection(anon, 'messages', 'tracker-closed', 'items'))));
    await check('closed grace-period tracker conversation remains readable', () =>
      assertSucceeds(getDoc(doc(anon, 'messages', 'tracker-grace', 'items', 'old-message'))));
    await check('expired tracker conversation is denied', () =>
      assertFails(getDoc(doc(anon, 'messages', 'tracker-expired', 'items', 'old-message'))));
    await check('revoked active tracker conversation is denied', () =>
      assertFails(getDoc(doc(anon, 'messages', 'tracker-revoked', 'items', 'old-message'))));
    await check('revoked active tracker cannot accept client messages', () =>
      assertFails(setDoc(doc(anon, 'messages', 'tracker-revoked', 'items', 'blocked-message'), {
        sender:'client',body:'synthetic',created_at:new Date().toISOString(),
      })));
    await check('revoked active tracker cannot accept CPR/DNR changes', () =>
      assertFails(updateDoc(doc(anon, 'pub', 'tracker-revoked'), {
        resus_pref:'CPR',resus_status:'client_selected',resus_recorded_at:serverTimestamp(),
      })));
    // Check untrusted intake envelope validation. None are production writes.
    await check('anonymous cannot choose a clinician or priority for intake', () => {
      const x=validSyntheticIntake('INT-priority123');
      x.record.priority=1;
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('anonymous cannot pre-admit into a treatment room', () => {
      const x=validSyntheticIntake('INT-location123');
      x.record.location='ICU';
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('client intake must contain a patient name', () => {
      const x=validSyntheticIntake('INT-emptyname123');
      x.record.patient.name='';
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('client cannot inject privileged patient keys', () => {
      const x=validSyntheticIntake('INT-patientrole1');
      x.record.patient.staff_role='admin';
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('client cannot inject privileged client keys', () => {
      const x=validSyntheticIntake('INT-clientrole12');
      x.record.client.access='admin';
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('oversized free-text complaints rejected', () => {
      const x=validSyntheticIntake('INT-hugereason12');
      x.record.reason='x'.repeat(5001);
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('envelope cannot exceed allowed text field bounds', () => {
      const x=validSyntheticIntake('INT-longclient12');
      x.record.client.first='a'.repeat(101);
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('client intake document status cannot have short or malformed ID', () => {
      const x=validSyntheticIntake('bad');
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    await check('client cannot exceed extra problem list budget', () => {
      const x=validSyntheticIntake('INT-problemlist12');
      x.record.additionalProblems=Array(26).fill('synthetic');
      return assertFails(setDoc(doc(anon,'client_intakes',x.id),x));
    });
    // Yakuri's library: staff read, the owner role publishes, nobody deletes
    const ykStaff = staff.firestore ? staff.firestore() : staff;
    await check('owner can publish Yakuri\'s current pointer and a release part', async () => {
      await assertSucceeds(setDoc(doc(verifiedDaniel, 'yakuri', 'current'), {release: 'r1', sha: {core: 'x', detail: 'y'}}));
      await assertSucceeds(setDoc(doc(verifiedDaniel, 'yakuri', 'r1', 'parts', 'core-00'), {data: 'abc'}));
    });
    await check('staff can read Yakuri\'s library', async () => {
      await assertSucceeds(getDoc(doc(ykStaff, 'yakuri', 'current')));
      await assertSucceeds(getDoc(doc(ykStaff, 'yakuri', 'r1', 'parts', 'core-00')));
    });
    await check('staff who are not the owner cannot publish to Yakuri', () =>
      assertFails(setDoc(doc(ykStaff, 'yakuri', 'current'), {release: 'r2'})));
    await check('management cannot publish to Yakuri', () =>
      assertFails(setDoc(doc(verifiedHeather, 'yakuri', 'r1', 'parts', 'core-01'), {data: 'x'})));
    await check('nobody deletes a Yakuri release, the owner included', () =>
      assertFails(deleteDoc(doc(verifiedDaniel, 'yakuri', 'r1', 'parts', 'core-00'))));
    for (const [nm, ctx] of [['signed-out', anon], ['unprovisioned', unlisted], ['other-hospital', otherHospital], ['disabled', disabled], ['lobby', lobby]]) {
      const db = ctx.firestore ? ctx.firestore() : ctx;
      await check(nm + ' account cannot read Yakuri\'s library', () => assertFails(getDoc(doc(db, 'yakuri', 'current'))));
    }
    process.stdout.write('Passed ' + seen.length + ' emulator authorization tests.\n');
  } finally {
    await env.cleanup();
  }
}
main().catch(err => {
  console.error('Firestore rules regression failure:', err);
  process.exitCode = 1;
});
