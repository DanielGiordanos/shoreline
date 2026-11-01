# Pravix security release: shared-device privacy and hosting preparation

## Implemented source changes

- Client check-in (`checkin/index.html` and legacy `flow-client-checkin.html`) now keeps pending intake payloads and analytics in page memory instead of persistent localStorage.
- The page deletes legacy `pravix_client_intakes` and `pravix_intake_analytics` storage keys on startup.
- A server-confirmed check-in clears its pending intake from page memory.
- Flow clears selected clinical and operational localStorage keys on logout and when the Firebase authentication session expires, preserving theme/sound preferences.
- `security/edge/worker.mjs` and its unit test provide an **undeployed** Cloudflare-compatible HTTPS redirect / header configuration for a future operator-controlled edge rollout.
- No change was made to deployed Firestore rules. Existing authenticated access and clinical restrictions remain in place.

## Important product impact

This eliminates the previous *same-browser* history of completed check-ins on the public kiosk. Returning-family matching and the local mock staff panel can no longer depend on another client's stored local intake data. A privacy-preserving returning-client lookup should be implemented through an authenticated/consented backend before that feature is reintroduced. Flow itself still consumes the Firebase-backed intake collection.

## Automated checks

Run `node security/checkin-source.test.cjs`, `node security/flow-privacy.test.cjs`,
`node security/edge/worker.test.mjs`, and existing Firebase emulator tests. These do not
perform live patient database writes.

## Still required before clinical launch

- The GitHub Pages **Enforce HTTPS** toggle requires Pages administrator access, and real CSP/HSTS/clickjacking headers require an authorized CDN or edge configuration.
- Cloudflare example code is not deployed by merging this repository; DNS and deployment access are still needed.
- Public intake rate limits, bot protection, server-verified signatures, immutable audit backend, and authenticated concurrent-write/reconnection checks remain outstanding.
- Verify Firestore IndexedDB clinical cache retention/termination and cross-page logout in an authenticated staging environment. A localStorage purge alone does not clear Firebase's IndexedDB cache.
- Verify the check-in experience, returning-family product requirements, PDF forms, and Flow's intake feed end to end with synthetic records.
