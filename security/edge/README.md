# Pravix prelaunch hosting security

**Status:** prepared, **NOT deployed**. The current GitHub Pages host does not add these custom headers and still serves plain HTTP. No GitHub Pages setting or DNS configuration is changed by this directory.

## Step 1 — enable GitHub Pages HTTPS enforcement

Open [repository Pages settings](https://github.com/DanielGiordanos/shoreline/settings/pages).
Under **GitHub Pages**, select **Enforce HTTPS** for `shoreline.pravix.app`, then verify that the HTTP URL gives a 301/308 redirect to HTTPS. If the toggle is unavailable, verify DNS and the custom-domain certificate as described in GitHub's Pages HTTPS documentation. Requires Pages administration access and cannot be accomplished by editing `index.html`.

```bash
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' http://shoreline.pravix.app/
```

## Step 2 — only if an edge service is used, configure security headers

GitHub Pages static files do not support per-path HTTP response-header configuration from repository source. `worker.mjs` is a Cloudflare Worker example which (once deployed on a controlled Cloudflare-proxied `shoreline.pravix.app/*` route):

- Performs a server-side HTTP to HTTPS 308 upgrade, preserving path and query.
- Emits a short HSTS policy initially (`max-age=300`) on HTTPS responses. Extend after confirming TLS/certificates and no unrelated subdomain breakage.
- Adds `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
- Enforces a narrowly scoped header-based anti-framing CSP and `upgrade-insecure-requests`.
- Starts a separate, broader CSP in **Report-Only** mode so that Pravix's inline scripts, Firebase APIs, embedded PDFs and third-party libraries can be audited safely before enforcing a stricter policy.

The worker is deliberately **not** active on GitHub Pages by merely committing it. Deployment requires control of Cloudflare DNS/routes and a valid upstream GitHub Pages configuration. Before installing, verify it does not break QR links, iPad client check-in, Firestore Auth, PDFs, external services, or any legitimate same-origin embedding.

Test this specimen locally with `node security/edge/worker.test.mjs`, then perform live checks *after* the operator deploys it:

```bash
curl -sSI http://shoreline.pravix.app/
curl -sSI https://shoreline.pravix.app/
```

**Do not report the HTTPS/CSP/HSTS findings as closed until the live headers and edge redirect are observed.**

## Outstanding architectural controls

- Public client-intake and tracker writes still need server-side abuse controls (trusted verification tokens, reasonable quotas, and rate limiting). Firestore Rules field validation does not provide per-IP or per-user throttling.
- Signed medical documents have immutable portions and SHA-256 format checks, but self-asserted client hashes cannot establish an independently trusted signature/attestation. Plan a trusted signing backend with versioned audit entries.
- Browser Firestore IndexedDB persistence and multi-workstation conflict handling require authenticated staging tests. Clearing selected localStorage keys is not proof that all private offline data was removed.
