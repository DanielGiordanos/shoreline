# Pravix P1 security hardening — deployment record and remaining infrastructure work

**Date:** November 2, 2026  
**Status:** Commit changes only after emulator and source tests pass; the two infrastructure controls described below are **not deployed** by this repository.

## Changes in this patch

### Expiring and revocable family tracker access

- During an active visit, the holder of the high-entropy `?t=` capability can read the projected tracker document and its family chat.
- After a visit closes, Flow publishes `access_expires_at` as a Firestore Timestamp **48 hours after the recorded completion time**; the family receives read-only access for that bounded interval.
- After expiration, the backend refuses anonymous reads of both `pub/{token}` and `messages/{token}/items`. A legacy closed visit without an explicit expiration becomes inaccessible to families, while approved staff retain their legitimate records.
- To revoke a tracker immediately, an approved staff administrator must write `capability_revoked: true` on `pub/{token}` via a trusted staff workflow. This flag overrides active and grace-period access; Flow's ordinary merge updates intentionally do not reset it.
- Public CPR/DNR changes and new family messages require an active, nonrevoked Shoreline tracker.
- The family tracker clears the in-browser projected data and chat after a server permission denial or its local expiry timer, and no longer displays an expired cached page.
- Flow removes all predictable `Math.random()` generation for family tracker codes/tokens and requires Web Crypto. This is independent of Firebase authentication.
- Test with disposable synthetic visits including active, 1-day discharged, expired, revoked, legacy closed and other-tenant tokens before real patient use.

**Important product consequence:** Previously closed legacy tracker links that lack `access_expires_at` will stop opening for families; this does **not** delete the corresponding clinical records. This deliberately favors confidentiality before go-live. If historical access is required, carry out a separately reviewed data migration using authorized clinical retention policy rather than disabling the restriction.

### Anonymous check-in schema

- The public check-in service remains deliberately unauthenticated and compatible with the two deployed client forms.
- Firestore now requires a consistent `INT-` record ID; pending status; matching submission timestamps; unassigned doctor/priority and Lobby location; allowlisted nested patient/client fields; bounded patient name, contact fields, reason text, additional problems, and a smaller 128-KB request limit.
- The CSR must still confirm all client-entered details. A public intake must never become a clinician-signed chart/order merely by being written.
- These structural changes **do not** supply IP/device rate limiting. An adversary can generate many valid synthetic pending records; do not mark anonymous intake abuse as fully fixed.

### Interim browser privacy

- Added `<meta name="referrer" content="no-referrer">` to Flow, Treatment, SGVP Assessments, Forms, OR and both client check-in variants. Visit tracking already had it. This reduces the chance of leaking query data through outgoing browser referrers.
- This does **not** set HSTS, prevent external iframe embedding, or add HTTP response headers at GitHub Pages. The previously staged `security/edge/worker.mjs` can provide server-side redirects, anti-framing CSP, `nosniff`, HSTS and other headers **only when an operator deploys it on a controlled proxy/hosting route**.
- The existing GitHub Pages host remains unable to supply custom response headers directly. Never claim CSP/header protection live based on static source or successful unit tests alone.

## Remaining actions requiring Firebase/hosting administration

1. **Protect anonymous intake end-to-end:** Prefer an authenticated server-side callable intake ingress that verifies Firebase App Check (reCAPTCHA Enterprise is unobtrusive on web) and an independent per-IP/device/hospital submission budget, strict schema, replay/idempotency control, alerts and cost monitoring. Registration of a reCAPTCHA Enterprise site key, rollout of App Check initialization across *all* Pravix modules, project policy changes and Cloud Functions deployment require Firebase administration; none were performed in this branch.
2. Only after that endpoint and every client check-in route have passed synthetic end-to-end tests should Firestore public `client_intakes` creates be **disabled**, so attackers cannot bypass the ingress by calling Firestore REST directly. If the direct Firestore rule remains, App Check alone is not sufficient to prevent volumetric spam from verified web clients.
3. **Browser headers:** Control the HTTPS edge (Cloudflare or approved replacement hosting), deploy `security/edge/worker.mjs` on the reviewed domain, enforce HTTPS, and verify `Content-Security-Policy: frame-ancestors 'self'`, `X-Frame-Options`, HSTS, `X-Content-Type-Options` and Referrer-Policy on *live HTTP responses*. Stage Report-Only CSP and validate inline scripts, Firebase, QR, forms and iPad check-in before a restrictive script CSP.
4. GitHub Pages **Enforce HTTPS** is still not enabled. The earlier GitHub Actions Pages settings request returned HTTP 403 because the connected token lacked Pages administration rights. An authorized Pages administrator must enable it at https://github.com/DanielGiordanos/shoreline/settings/pages or configure the new controlled edge.
5. Review whether final-visit links should remain readable for a different period. The current explicit default is **48 hours** and may be shortened or removed only with approved retention/privacy policy.
6. Confirm `pub.capability_revoked` is easily accessible through an authorized staff UI for emergency invalidation; adding such a control is a follow-up workflow enhancement. Do not place it on the unauthenticated tracker.

## Release acceptance checks

- Firestore Emulator: existing roles and 23 new privacy/abuse scenarios pass, including a functioning valid client intake.
- Source checks: secure token generation; tracker UI permission denial clears visible data; explicit expiration field; browser referrer policy and ready-to-deploy edge header contract.
- Live after deploy: `/firestore.rules`, Flow, check-in and tracker have the new code; anonymous random nonexistent private reads remain 403; no production write probes, token guessing or patient records are used in validation.
- **Unresolved until external setup:** edge headers/HTTPS and trusted anonymous intake quotas.

This is a targeted security patch, not full pentest certification or permission to operate live clinical care.
