/* Pravix Treatment Sheets · scoped owner onboarding.
   Uses Firebase's existing signed-in identity; never handles passwords.
   Firestore Security Rules independently validate UID, verified email,
   exact role/tenant and the temporary 2026-11-16 activation deadline. */
(function () {
  'use strict';

  var OWNER_EMAIL = 'daniel.giordano@pravix.app';
  var EXPECTED = Object.freeze({
    active: true,
    tenant_id: 'shoreline',
    role: 'owner',
    kura_owner: true,
    review_manager: true
  });
  var VALID_ROLES = ['owner', 'admin', 'management', 'doctor',
    'technician', 'liaison', 'intern', 'staff'];
  var pendingByUid = new Map();

  window.pvxTreatmentOwnerIssue = null;

  function issue(code) {
    window.pvxTreatmentOwnerIssue = code;
    return false;
  }

  window.pvxTreatmentEnsureOwner = function (user, db) {
    // Other staff retain their existing auth/rules path. This is not a
    // general-purpose enrollment or role escalation function.
    if (!user || String(user.email || '').trim().toLowerCase() !== OWNER_EMAIL) {
      return Promise.resolve(true);
    }
    if (!user.uid || !db) return Promise.resolve(issue('connection'));

    var uid = user.uid;
    if (pendingByUid.has(uid)) return pendingByUid.get(uid);
    var promise = (async function () {
      window.pvxTreatmentOwnerIssue = null;
      try {
        // Refresh claims before checking verified email ownership.
        await user.reload();
        await user.getIdToken(true);
        if (String(user.email || '').trim().toLowerCase() !== OWNER_EMAIL) {
          return issue('identity');
        }
        if (!user.emailVerified) return issue('email-unverified');

        var ref = db.collection('staff_members').doc(uid);
        var existing = null;
        try {
          existing = await ref.get({source: 'server'});
        } catch (error) {
          // A missing membership is intentionally unreadable under the
          // permanent deny-by-default staff rule.
          if (error && error.code !== 'permission-denied') {
            throw error;
          }
        }

        if (existing && existing.exists) {
          var member = existing.data() || {};
          // Do not override disabled, foreign or unapproved memberships.
          if (member.active !== true ||
              member.tenant_id !== 'shoreline' ||
              VALID_ROLES.indexOf(member.role) === -1) {
            return issue('membership-restricted');
          }
          if (member.role !== 'owner') {
            window.pvxTreatmentOwnerIssue = 'owner-role-review';
          }
          return true;
        }

        // Only a newly created, UID-bound membership with these exact
        // fields can pass the temporary rules; existing records cannot
        // be overwritten or reactivated from the browser.
        await ref.set(EXPECTED);
        var confirmed = await ref.get({source: 'server'});
        var member = confirmed && confirmed.exists && confirmed.data();
        if (!member || Object.keys(EXPECTED).some(function (k) {
          return member[k] !== EXPECTED[k];
        })) {
          return issue('membership-unconfirmed');
        }
        return true;
      } catch (error) {
        if (error && error.code === 'permission-denied') return issue('membership-denied');
        return issue('connection');
      }
    })();

    pendingByUid.set(uid, promise);
    promise.finally(function () {
      if (pendingByUid.get(uid) === promise) pendingByUid.delete(uid);
    }).catch(function () {});
    return promise;
  };
})();
