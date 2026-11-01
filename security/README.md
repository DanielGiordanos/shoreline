# Pravix security patch: staff membership migration

**Source:** PR #30 (merged 2026-11-01).  
**Status:** Firebase rules published successfully to `shoreline-flow` on 2026-11-01 via GitHub Actions. App hosting published the source merge. Future Firestore deployments are manual-only. No production patient information was used in the synthetic authorization tests.

**Operational access notice:** All staff access now requires an explicit approved `staff_members/{uid}` record. If staff have not yet been provisioned, they cannot use the protected application. Provision and test approved accounts before hospital go-live.

## Changes made in this branch

- Replace the legacy `staff() = any authenticated user except lobby` check with a UID-keyed approved membership, active status, Shoreline tenant, and approved role.
- Replace email-keyed administrative authority with the `owner`/`admin` roles in the protected membership document.
- Kura requires the `kura_owner: true` flag on an approved member.
- Scope clinical `visits` reads/writes to the Shoreline tenant and deny direct client deletion.
- Reject unauthenticated client intake submissions claiming a different tenant.
- Accept only provisional `CPR`/`DNR` family requests from active Shoreline tracker tokens; a client cannot write a clinical `confirmed` status.
- Allow anonymous family messaging only to active Shoreline tracker tokens, with the expected message fields and no forged staff metadata.
- Keep the production Firestore publication GitHub Action *manual only*.
- Add Firebase Local Emulator tests with exclusively synthetic users and records.

## Required provisioning BEFORE staff go-live

1. Confirm the deployed rules and hosting branch match the reviewed revision. Back up the existing Firestore ruleset and prepare a tested rollback.
2. Confirm the list of active staff identities with hospital leadership. Do not export clinical patient data. Confirm each Firebase Auth **UID**, not just email address.
3. Using Firebase Admin SDK with privileged service credentials on a trusted admin workstation (NEVER in browser code or this repository), create `staff_members/{uid}` with the schema below. Secure provisioning and deprovisioning workflows are required. Reject unverified, unapproved or disabled accounts.
4. Ensure all active authorized employees, automation/service identities, and required on-call/temporary staff have appropriate membership. Include Shoreline's admin/owner account and assign `kura_owner` only to the intended operator.
5. Verify that the lobby/shared account is *not* a general staff member; its deliberately narrow curriculum access continues to be governed by a separate rule.
6. Check migration of earlier records whose `tenant_id` may be missing or inconsistent. Do not rewrite, delete, or bulk-export medical data to diagnose this in production.
7. Run security emulator tests; then run authenticated staging smoke tests for Flow, Rounds, Visit, Forms, Treatment, OR, SGVP, Anesia, and other linked apps with separate synthetic staff identities.
8. Review all unmodified legacy collections in `firestore.rules`; this branch is **not** a comprehensive least-privilege rewrite. Audit anonymous writes, consent, form state transitions, role-sensitive actions, Storage rules, and any Cloud Functions before claiming completion.
9. Obtain explicit owner approval to deploy the reviewed commit to staging, then production during a planned change window with an immediate rollback option.
10. Monitor denials, sign-in failures, patient flow availability, clinical operation errors and client check-in. Stop rollout on unexpected denial or stalled patient workflows.

### Trusted membership record (illustrative only)

Document path: `staff_members/<firebase-auth-uid>`

```json
{
  "active": true,
  "tenant_id": "shoreline",
  "role": "doctor",
  "kura_owner": false
}
```

The document must be created **only through trusted Admin SDK provisioning**. No client API or Firestore rule permits creating or elevating membership. Do not derive these fields from client-submitted role, hospital, name, or email. Revocation sets `active: false` and must be verified promptly. The `owner`/`admin` roles grant `sgvpAdmin()` access and require special approval.

## Execute local synthetic security tests

Requirements: Java 21, Node 20+, Firebase Emulator Suite.

```sh
npm install --prefix security
npx --yes firebase-tools@13.29.1 emulators:exec --only firestore --project demo-pravix-security "node security/firestore.rules.test.cjs"
```

The tests require `FIRESTORE_EMULATOR_HOST`, enforced by the script. **They cannot connect to the live Firebase project.**

## Release constraints

- This patch is purposely *fail closed*. Staff without membership provisioning are now intentionally denied access; approved users must be provisioned before hospital go-live. The former email-based authority is gone.
- This release does not change GitHub Pages' HTTPS edge policy or inject headers. Those require hosting/CDN changes and separate compatibility testing.
- Firestore rules were separately deployed by the successful GitHub Actions Firebase publish workflow; changing the static GitHub Pages source alone would not have been sufficient.
- Do not re-enable automatic production rules deployment without signed-off staging tests and approval.
- Known open work: exact clinical roles by operation; hospital isolation for all collections; consent/signature immutability; client intake rate limiting; safe offline writes; concurrent patient-edit conflict handling; storage and server-side authorization.
