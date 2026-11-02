'use strict';
// One-time authorized provisioning. Never pass email/role/tenant via workflow inputs.
// Does not create Firebase Auth users, change passwords or enable disabled accounts.
const path = require('node:path');
const fs = require('node:fs');
const admin = require(path.join(
  process.env.RUNNER_TEMP || '/nonexistent-runner',
  'pravix-provision', 'node_modules', 'firebase-admin'
));

const projectId = 'shoreline-flow';
const requests = [
  {
    email: 'daniel.giordano@pravix.app',
    membership: {
      active: true,
      tenant_id: 'shoreline',
      role: 'owner',
      kura_owner: true,
      review_manager: true,
    },
  },
  {
    email: 'heather.galano@vca.com',
    membership: {
      active: true,
      tenant_id: 'shoreline',
      role: 'management',
      review_manager: true,
      kura_owner: false,
    },
  },
];

function fail(message) {
  throw new Error(message);
}

async function main() {
  const serialized = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serialized) fail('Credential missing: no accounts changed.');
  let key;
  try { key = JSON.parse(serialized); } catch {
    fail('Credential is not valid JSON: no accounts changed.');
  }
  if (key.project_id !== projectId) {
    fail('Credential belongs to a different Firebase project: no accounts changed.');
  }

  const app = admin.initializeApp({
    credential: admin.credential.cert(key),
    projectId,
  });
  try {
    const auth = admin.auth(app);
    const db = admin.firestore(app);
    const people = [];
    // Both users must already exist, be active, and have verified ownership of
    // the email address. A missing or disabled account stops before any writes.
    for (let i = 0; i < requests.length; i++) {
      let user;
      try { user = await auth.getUserByEmail(requests[i].email); }
      catch (err) {
        fail('Cannot resolve existing Firebase Auth account ' + (i + 1) +
          '; code=' + (err?.code || 'permission-or-user-error') +
          '. No memberships changed.');
      }
      if (user.disabled) fail('Auth account ' + (i + 1) + ' is disabled. No memberships changed.');
      if (!user.emailVerified) fail('Auth account ' + (i + 1) + ' has not verified its email. No memberships changed.');
      if ((user.email || '').toLowerCase() !== requests[i].email) {
        fail('Auth account email mismatch. No memberships changed.');
      }
      if (!user.uid || user.uid.includes('/')) fail('Invalid Firebase UID. No memberships changed.');
      people.push(user);
    }
    if (people[0].uid === people[1].uid) {
      fail('Both addresses unexpectedly resolve to one UID. No memberships changed.');
    }

    const refs = people.map(u => db.collection('staff_members').doc(u.uid));
    // One atomic transaction: check both memberships and commit both together.
    await db.runTransaction(async transaction => {
      const existing = [];
      for (const ref of refs) existing.push(await transaction.get(ref));
      for (let i = 0; i < existing.length; i++) {
        const tenant = existing[i].exists ? existing[i].data()?.tenant_id : null;
        if (tenant && tenant !== 'shoreline') {
          fail('Existing account ' + (i + 1) + ' belongs to a different hospital. No memberships changed.');
        }
      }
      for (let i = 0; i < refs.length; i++) {
        transaction.set(refs[i], requests[i].membership, {merge: true});
      }
    });

    // Read back independently, verify effective membership fields.
    for (let i = 0; i < refs.length; i++) {
      const snap = await refs[i].get();
      const actual = snap.data() || {};
      for (const [field, expected] of Object.entries(requests[i].membership)) {
        if (actual[field] !== expected) fail('Post-write verification failed for account ' + (i + 1));
      }
    }
    console.log('SUCCESS: exactly two verified existing Shoreline Firebase accounts provisioned.');
    console.log('Account 1: owner; Account 2: management + review manager.');
    console.log('No other accounts changed, no passwords handled.');
  } finally {
    await app.delete();
  }
}

main().catch(err => {
  // Never print service-account JSON, tokens, user UIDs or document contents.
  console.error('PROVISIONING NOT COMPLETE:', String(err.message || err).slice(0,300));
  process.exitCode = 1;
});
