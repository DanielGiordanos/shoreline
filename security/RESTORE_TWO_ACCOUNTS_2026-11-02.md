# Temporary, verified-email bootstrap for two existing Shoreline accounts

This migration restores access to two existing Firebase Authentication accounts **without**
restoring the old "any authenticated user is staff" rule.

**Status:** Requires Firestore rules deployment before the login activation can succeed.
**Window:** Through **2026-11-15** inclusive (rules deny creation starting 2026-11-16 UTC).

## Intended access

- `daniel.giordano@pravix.app`: `owner`, `kura_owner:true`, `review_manager:true`
- `heather.galano@vca.com`: `management`, `kura_owner:false`, `review_manager:true`

Each must **already exist** in Firebase Authentication, be able to log in via the
existing Pravix UI and have a **verified email**. No new Auth accounts are created.
Existing disabled membership documents cannot be modified through this feature.

## Activate

1. Open `https://shoreline.pravix.app/` and sign in using the existing Pravix login.
2. Firebase checks that the email is verified. If not, use the confirmation prompt
   to request a verification email, verify, and sign in again.
3. Pravix attempts to create a new `staff_members/{uid}` document. The deployed
   rules validate the signed email-verified claim, exact UID, fixed tenant/role
   and all submitted fields. A stranger or unverified email cannot bootstrap.
4. Once successful, Pravix enters Flow normally. Reload and test other modules.

The bootstrap has no password fields of its own. It runs **only after** Firebase's
existing authentication has succeeded. It does not modify credentials or bypass
the Firebase UID membership model.

## Rules safety properties

- Only two exact email addresses with `email_verified:true`
- `uid == request.auth.uid`
- Exact immutable membership fields, approved roles and Shoreline tenant
- `allow create` only — **no update or delete** by clients
- Server-enforced end date; retains UID records after expiration
- Signed-in but unapproved identities remain blocked by Firestore rules

## Removal / post-activation

After both identities have successfully created membership documents, remove
the temporary `verifiedPilot` / `validPilotMembership` helpers and `allow create`
exception from Firestore rules, and remove `pvxActivateApprovedStaffMember`
from Flow login. Keep the permanent UID-based `staff()` rules and existing
membership records. Do not delete the records when retiring bootstrap.

For any account that does not exist in Firebase Auth, is disabled, or cannot
verify its email, use a trusted Firebase administrative process; **do not**
enable public signup or broadly loosen rules.

## Validation

`Security Rules Tests` must pass including negative tests for anonymous,
unverified, outsider, other-UID, wrong-role, extra-field and membership
update/delete attempts. Verify the actual Firebase rules deployment separately
before asking either person to sign in.
