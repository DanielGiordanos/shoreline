# Tests that run on GitHub

This folder isn't part of the website (GitHub Pages leaves out folders that start with `_`).

## What runs, and when

Every push to a branch other than `main` runs `.github/workflows/tests.yml`:

- **Suite 1/6 to 6/6:** the whole regression suite, split across six machines (about 15 minutes in all).
- **Per-build checks:** the newest builds' checks (`tn/`), in Chromium and in WebKit (the engine Safari uses).

A build goes to its own branch, and these run on it. When they're green, merging the branch into `main` is the deploy.

When a section fails, it's run once more on its own. If it passes then, it's reported as **flaky** (a yellow warning, not a failure), so it can be fixed without blocking a deploy.

## What never comes here

- **The licensed drug library.**
  - It's never in this repository.
  - The sections that need it (Anesia's emergency drugs, Treatment's reference doses, and the check of Yakuri's notes) run only on the build machine, before each deploy.
  - In its place, the suite uses `yk_standin.json`: a stand-in release with one drug name (Maropitant) and no doses, so the order form opens.
- **Staff-only data:** who is off on each holiday, and time off.
  - The two Curriculum sections that use it run only on the build machine.

## Files

| File | What it is |
| --- | --- |
| `suite.py` | The regression suite. It's generated from the full suite by `gen_ci.py` on the build machine, without the sections above. |
| `sections.json` | Every section, and which earlier sections it needs (their setup lines run first). |
| `timings.json` | How long each section took. It's used to split the suite evenly. |
| `run.py` | Runs one shard: `python _ci/run.py . shots --shard 2/6`, or `--all`. |
| `tn/` | The per-build checks: `python _ci/tn/run_tn.py .` (add `WK=1` for WebKit). |
| `fakefs.js`, `seed*.json` | The in-memory stand-in for Firebase, and the synthetic training patients. |
| `yk_standin.json` | The stand-in drug library (one name, no doses). |
| `fonts/` | Maps the Apple system font names to Inter, as on the build machine, so text measures the same. |

## Running it on your own machine

```
pip install playwright==1.56.0 && python -m playwright install chromium webkit
python _ci/run.py . shots --all
```
