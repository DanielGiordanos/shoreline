"""Run the per-build checks (t255 …) on the site; a file that fails is run once more, and a pass then is a flaky warning.
python3 _ci/tn/run_tn.py SITE            (WK=1 for WebKit)"""
import sys, os, glob, subprocess, re
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.abspath(sys.argv[1])
eng = 'WebKit' if os.environ.get('WK') else 'Chromium'
summary, bad = [f'### Per-build checks — {eng}'], False
for f in sorted(glob.glob(os.path.join(HERE, 't[0-9]*.py'))):
    nm = os.path.basename(f)[:-3]
    out = ''
    for attempt in (1, 2):
        p = subprocess.run([sys.executable, f, SITE], capture_output=True, text=True, timeout=1500)
        out = p.stdout + p.stderr; print(f'::group::{nm} ({eng}, run {attempt})\n{out}\n::endgroup::', flush=True)
        m = re.search(r'^(\d+)/(\d+)\s*$', p.stdout, re.M)
        good = bool(m) and m.group(1) == m.group(2) and p.returncode == 0
        if good or attempt == 2: break
    score = m.group(0).strip() if m else 'stopped'
    if good and attempt == 2:
        print(f'::warning title=Flaky check::{nm} ({eng}) failed, then passed on a second run'); summary.append(f'- ⚠️ {nm}: {score} (passed on the second run)')
    elif good: summary.append(f'- ✅ {nm}: {score}')
    else:
        bad = True; summary.append(f'- ❌ {nm}: {score}')
        for l in out.splitlines():
            if l.startswith('FAIL '): print(f'::error title={nm} ({eng})::{l[5:300]}')
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write('\n'.join(summary) + '\n')
print('\n'.join(summary)); sys.exit(1 if bad else 0)
