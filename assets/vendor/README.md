# Libraries Flow hosts itself (n379, Nov 13 2026)

Flow loads these from this site, not from Google's or jsDelivr's servers, so it starts whenever the site does and nobody else's
server can change what runs. The files are the publishers' own, byte for byte: the suite checks each against its published hash
(`_ci/sections/flow_t379.py`).

| File | Version | From | SHA-384 | Licence |
|---|---|---|---|---|
| `firebase-10.12.5/firebase-app-compat.js` | 10.12.5 | `https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js` | `mLD+wdwynYnAhgHAkdPP5hroWJXJTNy5C2OhPKM55zuiV2vjzFD1LtBohaHq2Ex8` | Apache 2.0 (`firebase-10.12.5/LICENSE`) |
| `firebase-10.12.5/firebase-firestore-compat.js` | 10.12.5 | `https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js` | `/SBCyt0JELVRyyrOp+QG5CdnpVoAry+uw9hdherLgyZxxePtHjOvQmJU5CHymUhT` | Apache 2.0 |
| `firebase-10.12.5/firebase-auth-compat.js` | 10.12.5 | `https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js` | `NiuRnBs5Z0OgJ12kYJLSeWxANeJN369zH3+Zn0TGVPaCH/TKmbPFqfOmmLtrj+wg` | Apache 2.0 |
| `qrcode-generator-1.4.4/qrcode.js` | 1.4.4 | `https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js` | `8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k` | MIT (in the file) |

To change a version: add the new files under a new folder name, update the four addresses in `index.html` and the list in
`sw.js`, and update the hashes here and in the test. Never edit a file in place.

Flow (`/index.html`, n379) and Rounds (`/rounds/`, n381) use these. Ultrasound and the other apps still load Firebase from gstatic.
