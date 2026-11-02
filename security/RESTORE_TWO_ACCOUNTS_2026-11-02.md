# Temporary verified owner + password-authenticated director bootstrap

This migration restores access to two existing Firebase Authentication accounts **without**
restoring the old "any authenticated user is staff" rule.

**Status:** The Firebase rules publication and GitHub Pages deployments completed successfully on 2026-11-02. Actual membership creation still requires each existing account holder to sign in through Pravix.
**Window:** Through **2026-11-15** inclusive (rules deny creation starting 2026-11-16 UTC).

## Intended access

- `daniel.giordano@pravix.app`: `owner`, `kura_owner:true`, `review_manager:true`
- `heather.galano@vca.com`: `management`, `kura_owner:false`, `review_manager:true`

Both must already exist in Firebase Authentication and be able to sign in with their established account credentials. Daniel still requires verified email ownership. Heather may use her existing Firebase **email/password** sign-in without separately verifying her mailbox; an unverified OAuth/social-provider login cannot use this exception. No new Auth accounts are created.
Existing disabled membership documents cannot be modified through this feature.

## Activate

1. Open `https://shoreline.pravix.app/sgvp/assessment/#mine` for Heather or Pravix Flow for Daniel, and sign in normally with the existing account password.
2. Daniel must verify his email if requested. Heather's already-existing Firebase password login no longer requires a **separate email-verification message** for this prelaunch bootstrap.
3. The Firebase Rules validate the signed Auth identity, expected email, UID, exact tenant/role fields and short expiry. Heather's exception additionally requires `firebase.sign_in_provider == 'password'` if her email is not verified.
4. The permanent UID-bound membership is created on first successful approved sign-in. Access then works across the authorized modules.

The bootstrap has no password fields of its own. It runs **only after** Firebase's
existing authentication has succeeded. It does not modify credentials or bypass
the Firebase UID membership model.

## Rules safety properties

- Exactly two allowlisted signed Firebase identities: Daniel still needs `email_verified:true`; Heather needs **either** a verified email or the **password** sign-in provider. This temporary exemption reduces mailbox-ownership assurance but does not bypass normal authentication.
- `uid == request.auth.uid`
- Exact immutable membership fields, approved roles and Shoreline tenant
- `allow create` only — **no update or delete** by clients
- Server-enforced end date; retains UID records after expiration
- Signed-in but unapproved identities remain blocked by Firestore rules

## Removal / post-activation

After both identities have successfully created membership documents, remove
the temporary `verifiedPilot` / `heatherPasswordPilot` / `validPilotMembership` helpers and `allow create`
exception from Firestore rules, and remove `pvxActivateApprovedStaffMember`
from Flow login. Keep the permanent UID-based `staff()` rules and existing
membership records. Do not delete the records when retiring bootstrap.

For an account that does not exist in Firebase Auth, is disabled, or cannot authenticate with its normal provider, use a trusted Firebase administrative process; do not enable public signup, relax other roles or bypass MFA policies. Retire Heather's temporary no-email-verification exception immediately after her UID membership exists.

## Validation

`Security Rules Tests` must pass including negative tests for anonymous,
unverified, outsider, other-UID, wrong-role, extra-field and membership
update/delete attempts. Verify the actual Firebase rules deployment separately
before asking either person to sign in.
