# Milestone 3 evidence reproduction

All live captures use a disposable SillyTavern 1.19.0 copy and the local deterministic mock model. They must never target personal data. From the repository root:

```sh
python3 scripts/run-pc-prototype.py
```

After the fixture reports `http://127.0.0.1:8123/st-mobile/`, run these in a second terminal. Gate B changes the disposable fixture to native ownership, so preserve this order when reproducing the complete set:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-gate-a-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-gate-b-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-gate-c-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-appearance-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-layout-live.cjs
```

The external Playwright module defaults to the Codex runtime path used for these captures. Set `PLAYWRIGHT_MODULE` if it lives elsewhere. `POCKET_BASE_URL` and `POCKET_EVIDENCE_DIR` can override the layout journey's server and output directory.

The packaged round-trip is separate and starts its own fixture. Stop the source fixture first, then run:

```sh
python3 scripts/build-phone-package.py
unzip -t dist/pocket-tavern-combined-v0.9.0.zip
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-package-live.cjs
```

That script extracts the built ZIP, runs its packaged `prepare.cjs --mock`, starts the installed `start.cjs --mock`, verifies a saved conversation and preferences after reload, records the bridge handshake, and removes its disposable install. It accepts optional archive and SillyTavern source paths as positional arguments.

The JSON files `gate-a` through `gate-f` contain machine-readable assertions and timestamps. PNGs are review evidence, not pixel-golden tests. The removed `live-check.json` was an early pre-gate probe with stale focus and geometry observations; the gate files supersede it.
