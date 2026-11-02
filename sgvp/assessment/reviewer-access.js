/* Pravix SGVP Assessments — verified reviewer membership activation.
   Uses the already authenticated Firebase user, never passwords or public
   signup. The deployed Firestore Security Rules independently restrict UID,
   verified email, exact fields, role, hospital and the 2026-11-16 deadline. */
(function () {
  'use strict';

  const APPROVED_EMAIL = 'heather.galano@vca.com';
  const EXPECTED = Object.freeze({
    active: true,
    tenant_id: 'shoreline',
    role: 'management',
    kura_owner: false,
    review_manager: true
  });
  const VALID_ROLES = [
    'owner', 'admin', 'management', 'doctor',
    'technician', 'liaison', 'intern', 'staff'
  ];
  const pendingByUid = new Map();

  window.pvxAssessmentEnsureReviewer = function (user, db) {
    if (!user || !db || !user.uid) {
      return Promise.resolve({ ok: false, reason: 'authentication' });
    }

    // All other evaluators use their normal membership and assignment
    // permissions. No new privileges or roles are granted here.
    const email = String(user.email || '').trim().toLowerCase();
    if (email !== APPROVED_EMAIL) {
      return Promise.resolve({ ok: true, unchanged: true });
    }

    if (pendingByUid.has(user.uid)) return pendingByUid.get(user.uid);
    const uid = user.uid;

    const work = (async function () {
      try {
        await user.reload();
        await user.getIdToken(true);
        // Avoid using a stale identity after an asynchronous refresh.
        if (String(user.email || '').trim().toLowerCase() !== APPROVED_EMAIL ||
            user.uid !== uid) {
          return { ok: false, reason: 'identity-changed' };
        }
        if (!user.emailVerified) {
          return { ok: false, reason: 'email-unverified' };
        }

        const ref = db.collection('staff_members').doc(uid);
        let existing = null;
        try {
          existing = await ref.get({ source: 'server' });
        } catch (error) {
          // Missing memberships are intentionally unreadable until approved.
          // Other server errors should not be mistaken for missing accounts.
          if (!error || error.code !== 'permission-denied') throw error;
        }

        if (existing && existing.exists) {
          const member = existing.data() || {};
          if (member.active !== true ||
              member.tenant_id !== 'shoreline' ||
              VALID_ROLES.indexOf(member.role) < 0) {
            return { ok: false, reason: 'membership-restricted' };
          }
          if (!(['owner', 'admin'].includes(member.role) ||
                member.review_manager === true)) {
            return { ok: false, reason: 'review-role-missing' };
          }
          return { ok: true, alreadyActive: true };
        }

        // Only a new document with this exact UID and immutable values
        // satisfies the temporary policy. A disabled/existing membership
        // cannot be overwritten or elevated by this code.
        await ref.set(EXPECTED);
        const confirmed = await ref.get({ source: 'server' });
        const member = confirmed && confirmed.exists && confirmed.data();
        if (!member || Object.keys(EXPECTED).some(k => member[k] !== EXPECTED[k])) {
          return { ok: false, reason: 'membership-unconfirmed' };
        }
        return { ok: true, activated: true };
      } catch (error) {
        return {
          ok: false,
          reason: error && error.code === 'permission-denied'
            ? 'membership-denied' : 'connection'
        };
      }
    })();

    pendingByUid.set(uid, work);
    work.finally(() => {
      if (pendingByUid.get(uid) === work) pendingByUid.delete(uid);
    }).catch(() => {});
    return work;
  };
})();
