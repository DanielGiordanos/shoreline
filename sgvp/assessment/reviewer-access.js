/* Pravix SGVP Assessments — narrowly approved reviewer memberships.
   Uses existing Firebase sign-in; never handles passwords or signup.
   Server rules enforce exact email, authenticated UID, fixed role and tenant,
   and an expiring onboarding window. Password sign-in is accepted for
   the named approved accounts without a separate email verification step. */
(function () {
  'use strict';

  const HEATHER_EMAIL = 'heather.galano@vca.com';
  const APPROVED_REVIEWERS = Object.freeze([
    "sarah.schiff@vca.com",
    "jessica.giannetto@vca.com",
    "kelley.harpin@vca.com",
    "amber.koch@vca.com",
    "marissa.marinaccio@vca.com",
    "dianne.kittrell@vca.com",
    "dawn.nolte@vca.com",
    "kate.taikowski@vca.com",
    "shaylan.meyer@vca.com",
    "michael.mccann@vca.com"
]);
  window.pvxAssessmentApprovedReviewer = email =>
    APPROVED_REVIEWERS.includes(String(email || '').trim().toLowerCase());
  const APPROVED_MEMBERS = Object.freeze({
    [HEATHER_EMAIL]: Object.freeze({
      active: true,
      tenant_id: 'shoreline',
      role: 'management',
      kura_owner: false,
      review_manager: true
    }),
    ...Object.fromEntries(APPROVED_REVIEWERS.map(email => [email, Object.freeze({
      active: true,
      tenant_id: 'shoreline',
      role: 'reviewer',
      kura_owner: false,
      review_manager: false
    })]))
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

    // Only these existing approved identities can self-activate. All
    // others retain their normal membership and assignment permissions.
    const email = String(user.email || '').trim().toLowerCase();
    const expected = APPROVED_MEMBERS[email];
    if (!expected) {
      return Promise.resolve({ ok: true, unchanged: true });
    }

    if (pendingByUid.has(user.uid)) return pendingByUid.get(user.uid);
    const uid = user.uid;

    const work = (async function () {
      try {
        await user.reload();
        await user.getIdToken(true);
        // Avoid using a stale identity after an asynchronous refresh.
        if (String(user.email || '').trim().toLowerCase() !== email ||
            user.uid !== uid) {
          return { ok: false, reason: 'identity-changed' };
        }
        // Like Heather, approved reviewers can activate with her existing Firebase email/
        // password sign-in, without an additional email verification step.
        // Other providers still require verified email ownership.
        const signedInWithPassword = Array.isArray(user.providerData) &&
          user.providerData.some(p => p && p.providerId === 'password');
        if (!user.emailVerified && !signedInWithPassword) {
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
              (VALID_ROLES.indexOf(member.role) < 0 &&
               !(APPROVED_REVIEWERS.includes(email) && member.role === 'reviewer'))) {
            return { ok: false, reason: 'membership-restricted' };
          }
          // Heather requires management review authority. Other reviewers need only
          // normal evaluator access and may retain an existing staff role.
          if (email === HEATHER_EMAIL &&
              !(['owner', 'admin'].includes(member.role) ||
                member.review_manager === true)) {
            return { ok: false, reason: 'review-role-missing' };
          }
          return { ok: true, alreadyActive: true };
        }

        // Only a new UID-keyed record with the exact approved role can be
        // created. Disabled/existing memberships cannot be overwritten.
        await ref.set(expected);
        const confirmed = await ref.get({ source: 'server' });
        const member = confirmed && confirmed.exists && confirmed.data();
        if (!member || Object.keys(expected).some(k => member[k] !== expected[k])) {
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

