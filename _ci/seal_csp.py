"""Seal Flow's page: write the content policy with a hash for every inline script.
Run after any change to an inline script in index.html (every Flow patch ends with this). python3 seal_csp.py SITE_DIR [--check]
The policy lets a script run only if it is one of the page's own inline scripts (by SHA-256), a file from this site, or Google
Maps' loader (drive times). An inline script that isn't in the list doesn't run, so a page changed without sealing breaks: the
suite (flow_t380) fails first and names this tool."""
import sys, os, re, hashlib, base64

MARK = '<meta http-equiv="Content-Security-Policy" id="pvxCsp" content="'
# Google Maps' loader (drive times); apis.google.com (Firebase Auth starts its helper frame from there in Safari); reCAPTCHA (should Firebase sign-in ask for it)
HOSTS = ["'self'", "'unsafe-eval'", 'https://maps.googleapis.com', 'https://apis.google.com', 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/']
REST = "; worker-src 'self' blob:; base-uri 'self'"
SCRIPT = re.compile(r'<script\b([^>]*)>(.*?)</script\s*>', re.S | re.I)


def inline_hashes(html):
    out = []
    for m in SCRIPT.finditer(html):
        attrs, body = m.group(1), m.group(2)
        if re.search(r'\bsrc\s*=', attrs): continue
        t = re.search(r'\btype\s*=\s*["\']?([^"\'\s>]+)', attrs)
        if t and t.group(1).lower() not in ('text/javascript', 'application/javascript', 'module'): continue   # data blocks don't run
        out.append("'sha256-" + base64.b64encode(hashlib.sha256(body.encode('utf-8')).digest()).decode() + "'")
    return out


def policy(html):
    seen, hs = set(), []
    for h in inline_hashes(html):
        if h not in seen: seen.add(h); hs.append(h)
    return 'script-src ' + ' '.join(HOSTS + hs) + REST


def current(html):
    i = html.find(MARK)
    if i < 0: return None
    j = html.index('"', i + len(MARK)); return html[i + len(MARK):j]


def seal(html):
    want = policy(html); tag = MARK + want + '">'
    i = html.find(MARK)
    if i >= 0:
        j = html.index('>', html.index('"', i + len(MARK))) + 1
        return html[:i] + tag + html[j:]
    k = re.search(r'<script\b', html, re.I).start()   # before the first script, so it governs them all (the build stamp stays above it, in the first 2 KB)
    return html[:k] + tag + '\n' + html[k:]


if __name__ == '__main__':
    P = os.path.join(sys.argv[1], 'index.html'); T = open(P, encoding='utf-8').read()
    if '--check' in sys.argv:
        ok = current(T) == policy(T); print('sealed' if ok else 'NOT SEALED: run python3 seal_csp.py ' + sys.argv[1]); sys.exit(0 if ok else 1)
    N = seal(T); open(P, 'w', encoding='utf-8').write(N)
    print('sealed', len(inline_hashes(N)), 'inline scripts,', len(current(N)), 'characters of policy')
