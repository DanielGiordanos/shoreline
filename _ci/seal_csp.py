"""Seal Flow's page: write the content policy with a hash for every inline script, and the ?v= of Flow's code files.
Run after any change to an inline script in index.html or to a file in assets/flow/ (every Flow patch ends with this).
python3 seal_csp.py SITE_DIR [--check]
The policy lets a script run only if it is one of the page's own inline scripts (by SHA-256), a file from this site, or Google
Maps' loader (drive times). An inline script that isn't in the list doesn't run, so a page changed without sealing breaks: the
suite (flow_t380) fails first and names this tool.
Since n383 Flow's code is in assets/flow/ (app.js, layers.js, layers2.js), and since n384 its styles too (app.css, layers.css).
The page asks for each as file?v=<the first ten characters of its SHA-256>, in its tag and in its preload, so a changed file is
a new address: no browser or saved copy serves the old one under it. This tool writes those too (flow_t383 and flow_t384 fail
if one is stale).
Since n389 those three script files are BUILT from the pieces in _source/flow/ (see build_flow.py). The seal builds them
first, so the rule is still one command after any change: edit the piece, then seal. A built file that was edited by hand
is refused, not overwritten."""
import sys, os, re, hashlib, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_flow

MARK = '<meta http-equiv="Content-Security-Policy" id="pvxCsp" content="'
# Google Maps' loader (drive times); apis.google.com (Firebase Auth starts its helper frame from there in Safari); reCAPTCHA (should Firebase sign-in ask for it)
HOSTS = ["'self'", "'unsafe-eval'", 'https://maps.googleapis.com', 'https://apis.google.com', 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/']
REST = "; worker-src 'self' blob:; base-uri 'self'"
# comments and styles are matched first, so a "<script>" written inside one of them is not taken for a script (n383)
SCRIPT = re.compile(r'<!--.*?-->|<style\b[^>]*>.*?</style\s*>|<script\b([^>]*)>(.*?)</script\s*>', re.S | re.I)


def inline_hashes(html):
    out = []
    for m in SCRIPT.finditer(html):
        if m.group(0)[:7].lower() != '<script': continue
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


FLOWFILE = re.compile(r'((?:src|href)="/assets/flow/([A-Za-z0-9_.-]+)\?v=)([0-9a-f]*)(")')


def stamp(html, site):
    """the ?v= of every /assets/flow/ file the page names = the start of that file's SHA-256"""
    def one(m):
        with open(os.path.join(site, 'assets', 'flow', m.group(2)), 'rb') as f: h = hashlib.sha256(f.read()).hexdigest()[:10]
        return m.group(1) + h + m.group(4)
    return FLOWFILE.sub(one, html)


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
    src = build_flow.has_source(sys.argv[1])
    if '--check' in sys.argv:
        stale = build_flow.build(sys.argv[1], write=False) if src else []
        ok = current(T) == policy(T) and stamp(T, sys.argv[1]) == T and not stale
        print('sealed' if ok else ('NOT BUILT (' + ', '.join(stale) + '): run python3 seal_csp.py ' if stale else 'NOT SEALED: run python3 seal_csp.py ') + sys.argv[1]); sys.exit(0 if ok else 1)
    changed = build_flow.build(sys.argv[1]) if src else []
    N = seal(stamp(T, sys.argv[1])); open(P, 'w', encoding='utf-8').write(N)
    print(('built ' + (', '.join(changed) if changed else 'nothing new') + ' · ' if src else '') + 'sealed', len(inline_hashes(N)), 'inline scripts,', len(current(N)), 'characters of policy,', len(set(m.group(2) for m in FLOWFILE.finditer(N))), 'files stamped')
