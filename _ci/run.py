"""Run the Pravix tests.

  python3 tests/run.py SITE                       every section (Chromium)
  python3 tests/run.py SITE --app treatment       one app (anesia, treatment, flow, sgvp, kura, or, checkin, directory, …)
  python3 tests/run.py SITE --topic motion        one topic (layout, typography, motion, color, accessibility, dark-mode, icons, …)
  python3 tests/run.py SITE --id n230,t259        named sections
  python3 tests/run.py SITE --engine webkit       the sections written for both engines, in WebKit (Safari's engine)
  python3 tests/run.py SITE --shard 2/6           one of six even parts (GitHub)
  python3 tests/run.py SITE --list                what there is, with its tags

Filters combine (--app treatment --topic motion). Screenshots go to --shots (default: shots/ beside the site).
Sections marked local run only where their data is: 'licensed' needs YK_SEED pointing at the licensed Yakuri release,
'staff-only' needs tests/private/. Elsewhere (GitHub) they are skipped and say so.
A section that fails is run once more on its own; if it passes then, it's reported as flaky, not failed."""
import sys, os, json, time, asyncio, argparse, importlib, glob
ROOT = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('site'); ap.add_argument('--shots'); ap.add_argument('--app', action='append'); ap.add_argument('--topic', action='append')
ap.add_argument('--id'); ap.add_argument('--engine', default='chromium', choices=['chromium', 'webkit']); ap.add_argument('--shard')
ap.add_argument('--list', action='store_true'); ap.add_argument('--no-retry', action='store_true'); ap.add_argument('--results')
ap.add_argument('--skip-local', action='store_true', help='leave out the local-only sections even where their data exists')
a = ap.parse_args()
os.environ['PVX_SITE'] = os.path.abspath(a.site)
os.environ['PVX_SHOTS'] = os.path.abspath(a.shots or os.path.join(os.path.dirname(os.path.abspath(a.site)), 'shots'))
os.environ['PVX_ENGINE'] = a.engine
os.makedirs(os.environ['PVX_SHOTS'], exist_ok=True)
sys.path.insert(0, ROOT)
import warnings; warnings.simplefilter('ignore', SyntaxWarning)
import core, helpers
ORDER = ['anesia', 'flow', 'other_apps', 'kura', 'sgvp', 'suite_wide', 'treatment']
mods = sorted((os.path.basename(p)[:-3] for p in glob.glob(os.path.join(ROOT, 'sections', '*.py'))),
              key=lambda m: (m.startswith('local_'), ORDER.index(m) if m in ORDER else len(ORDER), m))
sys.path.insert(0, os.path.join(ROOT, 'sections'))
for m in mods: importlib.import_module(m)
ALL = core.SECTIONS
T = {}
tp = os.path.join(ROOT, 'timings.json')
if os.path.exists(tp): T = json.load(open(tp))
cost = lambda s: T.get(s['id'], 20.0)

def available(s):
    if s['local'] == 'licensed': return core.LICENSED
    if s['local'] == 'staff-only': return os.path.isdir(core.PRIVATE) and bool(os.listdir(core.PRIVATE))
    return True

sel = [s for s in ALL if a.engine in s['engines']]
if a.app: sel = [s for s in sel if set(a.app) & set(s['apps'])]
if a.topic: sel = [s for s in sel if set(a.topic) & set(s['topics'])]
if a.id: want = a.id.split(','); sel = [s for s in sel if s['id'] in want]
skipped = [s for s in sel if s['local'] and (a.skip_local or not available(s))]
sel = [s for s in sel if s not in skipped]
if a.shard:
    i, n = map(int, a.shard.split('/'))
    total = sum(cost(s) for s in sel); parts, cur, acc = [], [], 0.0
    best = None
    for slack in [x / 100 for x in range(80, 131, 2)]:
        target, parts, cur, acc = total / n * slack, [], [], 0.0
        for s in sel:
            if cur and acc + cost(s) > target and len(parts) < n - 1: parts.append(cur); cur, acc = [], 0.0
            cur.append(s); acc += cost(s)
        parts.append(cur)
        if len(parts) == n:
            load = max(sum(cost(s) for s in p) for p in parts)
            if best is None or load < best[0]: best = (load, parts)
    sel = best[1][i - 1]
if a.list:
    for s in sel: print(f"{s['id']:<26} {s['module']:<16} {','.join(s['apps']):<34} {','.join(s['topics']):<30} {'+'.join(s['engines']):<16} {s['local'] or ''}")
    print(len(sel), 'sections'); sys.exit(0)
GH = bool(os.environ.get('GITHUB_ACTIONS'))
tag = f"{a.engine}" + (f" shard {a.shard}" if a.shard else '')
print(f"{'::notice::' if GH else ''}{tag}: {len(sel)} sections" + (f" ({sel[0]['id']} … {sel[-1]['id']})" if sel else '') +
      (f"; {len(skipped)} local-only left out: {', '.join(s['id'] for s in skipped)}" if skipped else ''), flush=True)

async def main():
    from playwright.async_api import async_playwright
    times = {}
    async with async_playwright() as p:
        br = await getattr(p, a.engine).launch()
        _nc = br.new_context
        async def _nc_pinned(*x, **k):
            c = await _nc(*x, **k); await c.add_init_script(core.PINJS); return c
        br.new_context = _nc_pinned
        helpers.br = br
        async def run_one(s):
            core.CURRENT[0] = s['id']; t0 = time.time()
            print(f"@@BEGIN {s['id']}", flush=True)
            try: await s['fn'](br)
            except Exception as e: core.ok('SECTION ERROR — ' + s['title'], False, repr(e)[:300])
            finally:
                for c in list(br.contexts):   # nothing a section left open reaches the next one
                    try: await c.close()
                    except Exception: pass
            times[s['id']] = round(time.time() - t0, 1); print(f"@@SEC {s['id']} {times[s['id']]}", flush=True)
        for s in sel: await run_one(s)
        first = list(core.results)
        failed = [s for s in sel if any(k == s['id'] and not c for k, _, c, *_ in first)]
        flaky, still = [], failed
        if failed and len(failed) <= 6 and not a.no_retry:
            print(f"\n{'::group::' if GH else '── '}retrying {len(failed)} failing section(s) once: {', '.join(s['id'] for s in failed)}", flush=True)
            core.results.clear()
            for s in failed: await run_one(s)
            if GH: print('::endgroup::')
            again = list(core.results)
            flaky = [s for s in failed if not any(k == s['id'] and not c for k, _, c, *_ in again)]
            still = [s for s in failed if s not in flaky]
        await br.close()
    return first, flaky, still, times

first, flaky, still, times = asyncio.run(main())
NAMES = {'anesia': 'Anesia', 'flow': 'Flow', 'other_apps': 'Other apps', 'kura': 'Kura', 'sgvp': 'SGVP', 'suite_wide': 'Whole suite', 'treatment': 'Treatment',
         'local_licensed': 'Local (licensed)', 'local_staff': 'Local (staff-only)'}
by_app = {}
for s in sel:
    rs = [c for k, _, c, *_ in first if k == s['id']]
    grp = NAMES.get(s['module'], 'Treatment' if s['module'].startswith('treatment') else s['module'])
    b = by_app.setdefault(grp, [0, 0]); b[0] += sum(rs); b[1] += len(rs)
n_ok = sum(1 for _, _, c, *_ in first if c)
lines = [f"### Tests — {tag}: {n_ok}/{len(first)} checks passed on the first run",
         ' · '.join(f"{g} {x}/{y}" for g, (x, y) in by_app.items())]
for s in flaky:
    lines.append(f"- ⚠️ flaky: {s['id']} — {s['title']} (failed, then passed on its own)")
    if GH: print(f"::warning title=Flaky: {s['id']}::{s['title']} failed, then passed when run again")
for s in still:
    lines.append(f"- ❌ {s['id']} — {s['title']}")
    for k, nm, c, x in first:
        if k == s['id'] and not c:
            lines.append(f"  - {nm[:200]} — {x[:300]}")
            if GH: print(f"::error title={s['id']}: {s['title'][:50]}::{nm[:300]} — {x[:600]}")
for s in skipped: lines.append(f"- (local only, not run here) {s['id']} — {s['title']}")
if not still: lines.append('All sections pass.' + (' (some only on a second run)' if flaky else ''))
print('\n' + '\n'.join(lines))
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write('\n'.join(lines) + '\n')
if a.results:
    json.dump({'results': [[k, nm, c] for k, nm, c, _ in first], 'flaky': [s['id'] for s in flaky], 'failed': [s['id'] for s in still], 'times': times},
              open(a.results, 'w'), ensure_ascii=False, indent=0)
sys.exit(0 if first and not still else 1)
