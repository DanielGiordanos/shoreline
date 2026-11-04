# firebase-lite — how it's checked (n302, Nov 2 2026)

`treatment/firebase-lite.js` is the Firebase modular SDK (app, firestore, auth 10.12.5) tree-shaken behind the compat shapes Treatment and the
shared assets call. Source: `treatment/src/firebase-lite.mjs`. Rebuild: `npm i firebase@10.12.5 esbuild` beside the source, then
`python3 treatment/src/build.py --firebase` (or `npx esbuild treatment/src/firebase-lite.mjs --bundle --minify --format=iife --target=es2019 --outfile=treatment/firebase-lite.js`).

Two checks, both against the Firebase emulators (`npm i firebase-tools`; Java needed):
- `conformance.py` runs `conformance.html` once with the three compat scripts (`compat.js`, concatenated from gstatic) and once with the facade
  (`lite.js`), the same script of auth and Firestore operations, and compares the two logs step for step. Emulators: `firebase emulators:start --only firestore,auth --project demo-lite` with open rules.
- `e2e.py SITE` loads the real Treatment page (no fake Firebase) on the facade, pointed at the emulators (`window.__pvxFbEmu`) running the live
  `firestore.rules` under project `shoreline-flow`: seeds the suite's training sheets, creates a staff user, signs in through the page's card,
  waits for the patient list, opens a sheet, charts a value, reads it back from the emulator.
The Treatment suite itself runs on its fake Firebase, which the facade leaves in place (it defines `window.firebase` only when nothing has).
