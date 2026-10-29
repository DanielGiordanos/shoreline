# Pravix tests

One suite for every app, tagged by app and topic. On GitHub, this folder is `_ci/`; Pages doesn't serve it, because Pages leaves out folders that start with `_`.

## Running
```
python3 tests/run.py SITE                        # everything, in Chromium
python3 tests/run.py SITE --app treatment        # one app
python3 tests/run.py SITE --topic motion         # one topic, across apps
python3 tests/run.py SITE --app treatment --topic typography
python3 tests/run.py SITE --id n230,t259         # named sections
python3 tests/run.py SITE --engine webkit        # the sections written for both engines, in WebKit (Safari's engine)
python3 tests/run.py SITE --list                 # what there is, with its tags
```
- `SITE` is a folder with the website in it: a checkout of the repository, or a build.
- Screenshots go to `--shots`.
- A section that fails is run once more on its own. If it passes then, it's reported as **flaky** (a warning), not as a failure.

**Apps:** anesia, treatment, flow, or, sgvp, kura, checkin, directory, scheduling, forms, grid, yakuri, topbar.

**Topics:** layout, typography, motion, color, accessibility, dark-mode, icons, materials, branding, menus, toolbars, sheets-alerts, search, drag-drop, writing, charts, sharing, notifications, data-entry, calendar, drugs, offline, sign-in, printing, behaviour.

## Layout
| Path | What it is |
| --- | --- |
| `core.py` | Shared setup: the local web server, the fake in-memory Firebase, the synthetic training patients, the pinned clock (Fri Oct 23 2026, 11 AM Los Angeles), `ok()`, `new_page()`, `@section`. |
| `helpers.py` | Page openers that several sections share: `flow_page`, `p222`, `ts230`, `ts232`, `ts245`, and the seeds they use. |
| `tsh.py` | The Treatment harness behind the per-build checks: `ts()` opens a sheet in any size, look and section. |
| `sections/<app>.py` | The tests, one module per app; `suite_wide.py` checks every app at once. |
| `sections/treatment_tNNN.py` | A build's own checks. They run in Chromium and WebKit. |
| `sections/local_*.py` | Build machine only (see below). |
| `fixtures/` | The fake Firebase, seeds, probes, and the stand-in drug library. |
| `fonts/` | Maps the Apple system font names to Inter, so text measures the same everywhere. |
| `timings.json` | How long each section takes. Shards are balanced with it. |

## Adding a build's checks
Add a section to the app's module, or a new `sections/<app>_tNNN.py`:
```python
@section(id='t260', title='n260 · what the build changes', apps=['treatment'], topics=['layout'], engines=('chromium', 'webkit'))
async def s_t260(br):
    ctx, pg, errs = await ts230(view='sheet')
    ok('the thing it fixes, and what it was before', await pg.evaluate("…"), "details shown when it fails")
```
- Every section gets the browser and starts from nothing. Anything it leaves open is closed after it.
- Wait for the condition you're testing with `until(pg, js)`, not a fixed time: GitHub's machines run at a different speed from the build machine.

## What never leaves the build machine
- **`local_licensed.py`** needs the licensed Yakuri library. It runs when `YK_SEED` points at the licensed test release.
  - n177: Anesia's emergency drugs.
  - n239: Treatment's reference doses.
  - t256: one check of Yakuri's hold note.
- **`local_staff.py`** uses staff-only data in `private/`, such as who is off on each holiday. It covers n221 and n223.
- **Elsewhere, both are skipped and listed as skipped.** Without `YK_SEED`, every page gets `fixtures/yk_standin.json` instead: one drug name and no doses.
- **`mkci.py` builds `_ci/` without them.** It stops if anything licensed or staff-only would be copied.
