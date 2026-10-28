"""Run one shard of the CI suite, retry a failing section once, and report.
python3 _ci/run.py SITE SHOTS --shard 2/4        (or --all, or --sections 87,90)

Shards are contiguous runs of sections balanced by the times in timings.json. Sections that use names defined by an
earlier section (sections.json "needs") get that section run first, silently. A section that fails, then passes
when run again by itself, is reported as flaky (a warning) rather than a failure.
"""
import sys, os, json, subprocess, time
HERE = os.path.dirname(os.path.abspath(__file__))
SITE, SHOTS = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
META = json.load(open(os.path.join(HERE, 'sections.json'), encoding='utf-8'))
T = {int(k): v for k, v in json.load(open(os.path.join(HERE, 'timings.json'))).items()} if os.path.exists(os.path.join(HERE, 'timings.json')) else {}
IDX = [m['i'] for m in META]; NAME = {m['i']: m['name'] for m in META}; NEED = {m['i']: m['needs'] for m in META}
cost = lambda k: T.get(k, 20.0)

def closure(sel):
    out, todo = set(), list(sel)
    while todo:
        for n in NEED.get(todo.pop(), []):
            if n not in out: out.add(n); todo.append(n)
    return sorted(out - set(sel))

def shards(n):
    """contiguous split; each shard's load counts the helpers it must also run"""
    best = None
    total = sum(cost(k) for k in IDX)
    for slack in [x / 100 for x in range(80, 131, 2)]:
        target, parts, cur, acc = total / n * slack, [], [], 0.0
        for k in IDX:
            if cur and acc + cost(k) > target and len(parts) < n - 1: parts.append(cur); cur, acc = [], 0.0
            cur.append(k); acc += cost(k)
        parts.append(cur)
        if len(parts) != n: continue
        load = max(sum(cost(k) for k in p) + sum(cost(h) for h in closure(p)) for p in parts)
        if best is None or load < best[0]: best = (load, parts)
    return best[1]

DETAIL = {}
def run(sel, tag):
    env = dict(os.environ, PYTHONUNBUFFERED='1', SECTIONS=','.join(map(str, sel)), HELPERS=','.join(map(str, closure(sel))), RESULTS=os.path.join(SHOTS, f'results-{tag}.json'))
    t0 = time.time()
    p = subprocess.Popen([sys.executable, os.path.join(HERE, 'suite.py'), SITE, SHOTS], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    for line in p.stdout:   # shown live, and each failure's details kept for the annotations
        sys.stdout.write(line)
        if line.startswith('FAIL '): DETAIL.setdefault(line[5:].split('  ', 1)[0].strip(), line[5:].strip())
    p.wait()
    try: res = json.load(open(env['RESULTS'], encoding='utf-8'))
    except Exception: res = None
    return res, time.time() - t0, p.returncode

os.makedirs(SHOTS, exist_ok=True)
if '--all' in args: sel, tag = IDX, 'all'
elif '--sections' in args: sel, tag = [int(x) for x in args[args.index('--sections') + 1].split(',')], 'some'
else:
    i, n = map(int, args[args.index('--shard') + 1].split('/')); sel, tag = shards(n)[i - 1], f'{i}of{n}'
print(f'::notice::shard {tag}: {len(sel)} sections ({NAME[sel[0]][:30]} … {NAME[sel[-1]][:30]}), helpers {closure(sel)}', flush=True)
res, secs, rc = run(sel, tag)
summary = [f'### Suite shard {tag} — {len(sel)} sections, {secs / 60:.1f} min']
if res is None:
    print('::error::the suite stopped before it reported (see the log above)'); summary.append('The suite stopped before it reported.'); ok_all = False
else:
    failed = sorted({k for k, _, c in res if not c})
    seen = {k for k, _, _ in res}
    missing = [k for k in sel if k not in seen]
    flaky, still = [], []
    if failed and len(failed) <= 6:
        print(f'\n::group::retrying {len(failed)} failing section(s) once: {failed}', flush=True)
        res2, _, _ = run(failed, tag + '-retry')
        print('::endgroup::')
        bad2 = {k for k, _, c in (res2 or []) if not c} | ({k for k in failed} if res2 is None else set())
        flaky = [k for k in failed if k not in bad2]; still = [k for k in failed if k in bad2]
    else: still = failed
    n_ok = sum(1 for _, _, c in res if c)
    summary.append(f'{n_ok}/{len(res)} checks passed on the first run.')
    for k in flaky:
        print(f'::warning title=Flaky section::{NAME[k]} failed, then passed when run again')
        summary.append(f'- ⚠️ flaky: {NAME[k]}')
    for k in still:
        for kk, nm, c in res:
            if kk == k and not c:
                d = DETAIL.get(nm.strip(), nm)
                print(f'::error title={NAME[k][:60]}::{d[:900]}'); summary.append(f'  - {d[:400]}')
        summary.append(f'- ❌ {NAME[k]}')
    for k in missing: summary.append(f'- (no checks reported) {NAME[k]}')
    ok_all = not still
    if ok_all: summary.append('All sections pass.' + (' (some only on a second run)' if flaky else ''))
if os.environ.get('GITHUB_STEP_SUMMARY'):
    open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write('\n'.join(summary) + '\n')
print('\n'.join(summary))
sys.exit(0 if ok_all else 1)
