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

**Topics:** layout, typography, motion, color, accessibility, dark-mode, icons, materials, branding, menus, toolbars, sheets-alerts, search, drag-drop, writing, charts, sharing, feedback, notifications, data-entry, calendar, drugs, offline, sign-in, printing, behaviour.

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
| `seal_csp.py` | Seals Flow's page: writes its content policy with a hash for every inline script (n380) and the `?v=` of Flow's files (n383, n384). See below. |

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

## After changing Flow (n380, n383–n389)
**Where Flow is.** `index.html` has the markup, three small styles that paint before anything loads, and about twenty small scripts that run before the app. The page loads five files from `assets/flow/`:

| File | What it is | Edit it? |
| --- | --- | --- |
| `app.css` | The styles that sat in `<head>`: the base sheet and the blocks after it, each under a heading with the id it had. | yes, here |
| `layers.css` | The styles that sat in `<body>` (`pvx-n144-css` … ). Linked in `<body>`, so it comes after the styles the shared assets add to `<head>`. | yes, here |
| `app.js` | Flow's main script. | **no: built** |
| `layers.js` | The blocks that follow it, in the order they run. | **no: built** |
| `layers2.js` | The blocks that run after the Yakuri library: n254 on. | **no: built** |

**The three script files are built from pieces (n389).** The code is in `_source/flow/`, one small file per piece, named `feature.piece.js`:

- `drawer.fill-drawer.js`, `care-team.care-team.js`, `add-patient.breeds.js` … are pieces of the main script;
- `disposition.endings.js`, `flags.patient-flags.js`, `hig.n370-sheets-and-windows.js` … are blocks (`hig.` is a pass over the whole app for one Human Interface Guidelines page);
- `order.json` lists the pieces of each built file **in the order they run**;
- `INDEX.md` (written by the build) lists every piece by feature, and every function that has layers with the pieces that add them. Start there.

To change Flow's code: edit the piece. To add a block: add `feature.name.js` to `_source/flow/` and one line at the end of `layers2.js` in `order.json` (`{"file": "feature.name.js", "title": "pvx-n400-js"}`); the build gives it its heading and its own `try{ … }catch`, so write the block's code only. Then run the seal, which builds first.

- **Never edit `assets/flow/app.js`, `layers.js` or `layers2.js`.** Each carries the SHA-256 of its body; the seal refuses a built file that was changed by hand and says so. `flow_t389` fails on it too.
- **Don't move a piece in `order.json`** unless the order is the change: a layer added later is outermost, a listener added later runs later.
- A new style block goes at the end of `layers.css` under a heading like the others. Later wins, as it did in the page.
- An address in a style is written from the site's root (`url("/assets/img/…")`).
- `_source/` is not served by the site (GitHub Pages skips folders that start with `_`, as it does `_ci/`).

**After any change, run the seal:**
```
python3 _ci/seal_csp.py .            # after a change to a piece in _source/flow/, to an inline script in index.html, or to a style file in assets/flow/
python3 _ci/seal_csp.py . --check    # says whether the page is sealed
```
- **The policy (n380).** Flow's `index.html` carries a content security policy that lists every inline script by its SHA-256. An inline script that isn't in the list doesn't run. `flow_t380` fails first if the seal was missed, and names this tool.
- **The `?v=` (n383, n384).** The page asks for each of the five files as `file?v=<the start of its SHA-256>`, in its tag and in its preload. The seal writes those, so a changed file is a new address. `flow_t383` and `flow_t384` fail if one is stale.
- **The build (n389).** The seal first runs `_ci/build_flow.py`: it joins the pieces into the three script files and rewrites `INDEX.md`. `python3 _ci/build_flow.py . --check` alone says whether the built files are what the pieces give.
- Markup needs no seal.

**Three things a block no longer does for itself (n385, n386, n387).** They are declared in `core.helpers.js`, `core.watch.js` and `core.steps.js`, the first pieces of `app.js`.

| Instead of | A block writes | Why |
| --- | --- | --- |
| its own `esc`, `typing`, `pad`, `byId` … (or the old `bcEsc`, `ctEsc`, `rdEsc`, which still work) | `pvxEsc(text)`, `pvxEscQ(text)`, `pvxTyping()`, `pvxPad2(n)`, `pvxPatientById(id)` and the other helpers in the n385 section | One copy of each. A helper goes in that section only if it uses nothing but page-wide names. |
| `new MutationObserver(fn).observe(document.body, options)` | `pvxWatch(fn, options, document.body)` (or `document.documentElement`) | One observer per target for every block. Each caller still gets only the records its options ask for, in the order the callers registered. A watcher on one element keeps its own observer. |
| `var old=fillDrawer; fillDrawer=function(p){ var r=old.apply(this,arguments); …; return r; }` | `pvxAfter('fillDrawer', function(p){ … }, 'n400')` | The function stays one function with a list of layers. `pvxBefore` runs before it; `pvxWrap(name, function(inner){ return function(p){ … }; }, who)` is for a layer that decides whether the function runs or changes what goes in or comes out. |

- The order of layers is the order the blocks run: the last one added is outermost. `pvxSteps.of('fillDrawer')` lists them in the console, and the same list is written above the function in its piece (`INDEX.md` says which piece). `flow_t387` fails if the two differ, so **after adding a layer, add it to that comment**.
- The function's own code is `NAME$base`. A function nobody has added to yet has no `NAME$base`; the three calls then wrap it the old way, so they work for any page-wide function.
- Never put a function in place of one of these by assignment (`fillDrawer=function…`): the layers added after it would run inside it, in the wrong order.
- An inline `on…=` handler can't be sealed and won't run: add a listener in a script instead.
- Only Flow's page has the policy. Rounds, Treatment and the other apps are unchanged.
- **A check that reads Flow's source** uses `core.flow_code()`: the page and its five files as one text. `core.flow_style('pvx-n184-css')` gives one style block by the id it had.

## What never leaves the build machine
- **`local_licensed.py`** needs the licensed Yakuri library. It runs when `YK_SEED` points at the licensed test release.
  - n177: Anesia's emergency drugs.
  - n239: Treatment's reference doses.
  - t256: one check of Yakuri's hold note.
- **`local_staff.py`** uses staff-only data in `private/`, such as who is off on each holiday. It covers n221 and n223.
- **Elsewhere, both are skipped and listed as skipped.** Without `YK_SEED`, every page gets `fixtures/yk_standin.json` instead: one drug name and no doses.
- **`mkci.py` builds `_ci/` without them.** It stops if anything licensed or staff-only would be copied.

## Notes
- **Nov 11 2026:** a note added to start a fresh GitHub Pages build. The build for the n356–n361 merge (ce6ce4e) failed to start during a GitHub Actions and Pages incident, and re-runs of it kept failing.
