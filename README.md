# Pocket Tavern — combined Termux prototype

Pocket Tavern is a mobile browser interface for SillyTavern 1.19.0. One prepared folder contains ST code, Pocket Tavern and copied dependencies. One command starts the local ST server and serves both interfaces. ST owns ordinary data/default-user files and handles prompts, providers, generation and saving. There is no separate Pocket Tavern chat database and no Android APK yet.

## Current build

`pocket-tavern-combined-v0.4.4.zip` is generated in the project folder for phone transfer. It contains preparation/update tools and our frontend/bridge, not a redistributed ST installation. Preparation copies your installed ST code/defaults/dependencies into a new folder, excluding regular data/settings/configuration and third-party extension code. The resulting folder can run independently of the original installation. Native dependencies must come from the same phone/runtime on which it will run.

Follow [the phone instructions](phone-package/PHONE-README.md). After extracting into Downloads:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.4.4
node prepare.cjs ~/SillyTavern ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs
```

Open http://127.0.0.1:8123/st-mobile/ after ST finishes starting. The original ST interface is at the root address. Ctrl+C stops the launcher and its engine. Stop the previous test session first; both use port 8123. Preparation refuses an existing destination. Normal mode uses fresh ST defaults configured for OpenRouter, with no imported credentials and no mock process.

Settings provides OpenRouter/custom connection selection, saving an OpenRouter key through ST, connecting, refreshing the loaded model list, model selection, existing chat-completion presets, existing personas, thinking visibility and existing global lorebooks. Full ST controls remain available for editors and advanced settings. Keys are never returned through the bridge or persisted in frontend localStorage. Selecting a preset may change model/connection settings. Persona selection preserves an untouched greeting rather than submitting the hidden character editor to regenerate it.

The frontend supports character selection, saved history, new/renamed/deleted chats, per-chat drafts, basic safe Markdown and quoted-dialogue coloring, streaming, stopping, message edits and reply alternatives. Model reasoning streams in its own collapsible block and is rendered from ST's saved message metadata after reload. ST reasoning durations are milliseconds and are displayed as seconds. Chat deletion has explicit confirmation and no frontend undo.

## Isolated PC / phone tests

Use a separate combined mock installation with no original user data:

```sh
node prepare.cjs /path/to/SillyTavern /path/to/pocket-test --mock
cd /path/to/pocket-test
node start.cjs --mock
```

The combined launcher starts ST and a local OpenAI-compatible mock only in explicit mock mode. `[think]` emits separate reasoning, `[slow]` streams slowly, and `[fail]` returns an intentional provider error. Normal/mock launch modes cannot be mixed against one prepared installation. For repeatable configuration fixtures, stop the mock launcher after its first initialization and run `python3 scripts/seed-settings-fixtures.py /path/to/pocket-test`, then restart. The fixture tool rejects normal installations. The mock health endpoint returns only test summary flags and generation parameters, not prompt text.

Current PC mock sandbox: `/tmp/pocket-combined-engine`. Normal-mode sandbox: `/tmp/pocket-combined-normal`. These are disposable and may disappear after reboot. Existing older PC data is retained. Run `npm test`: **49 passing automated tests**. See [TEST_REPORT.md](TEST_REPORT.md) for live results and their limits. Build the kit with `python3 scripts/build-phone-package.py`; copy the ZIP from dist into the project root for phone transfer.

## Data ownership and migration

Prepared installations use their own standard ST `data/default-user` folder. Updates preserve data/settings/config and back up previous code. The combined installation retains unpatched compatibility-source fragments for updates, so it does not need the original checkout later. The older isolated phone test folder is also supported by the updater and keeps its original launcher workflow.

An optional offline importer copies an existing compatible `default-user` into a NEW, unstarted normal installation. It refuses existing destination user data and never merges or overwrites it. Stop both engines and make a backup first. No actual personal-data migration has been performed. See the phone instructions before using it. One engine owns a data folder; two servers sharing it and simultaneous writers across interfaces are unsupported.

Only drafts, navigation and an interrupted-action journal live in browser localStorage. Saved messages/metadata are independently read back from ST before success is reported. Recovery reads saved data without replaying uncertain writes. The bridge admits one operation at a time, checks stale targets/settings and exposes listed commands through a same-origin MessageChannel. Clearing browser storage can lose drafts and the journal.

## Compatibility and limitations

The complete ST browser application remains loaded offscreen. It contains behavior beyond the server endpoints, so this is not yet a lightweight headless client. The tested source reports package version 1.19.0 and is one commit beyond that release tag; installers require exact known compatibility fragments and refuse unfamiliar source implementations.

Prepared-engine patches retain CSRF and path checks: tokenizer requests send explicit CSRF headers, each installation has its own cookie name, startup validates an uncached session token, and exact locally copied codec-WASM aliases handle shared-dependency paths. Original ST code/data are untouched.

PC validation covers mock generation, configuration effects, reasoning, stopping, deletion, persistence, launch/shutdown and update preservation. Earlier isolated v3 phone-kit use was reported smooth by the user, including app switching/locking. New combined v0.4.4 phone operation and real OpenRouter generation/model-list/key handling still need user verification. No real credentials or external model-generation requests were used in development.

This is an essential-controls prototype, not a daily-use release. Preset/persona/lorebook editors, connection-profile management, character/chat lorebook selectors, reasoning editing, groups, media, slash commands, tools, auto-continue/auto-swipe and arbitrary extensions remain outside this build. Touch swipe gestures and the full ST Markdown/HTML renderer are not implemented. Only the current dark interface is provided. Long-running Android background execution, battery behavior and WebView lifecycle need broader testing.

Original design/audit references: [concept](SillyTavern_Mobile_Frontend_Concept_v0.1.md), [architecture](Working_Architecture_v0.2.md), [source audit](ST_Source_Audit.md). Historical test-kit ZIPs remain local and ignored by Git.

### Custom connection through the existing OpenRouter proxy

Choose Custom (OpenAI-compatible / proxy), enter the base URL `http://127.0.0.1:8001/api/v1` for the supplied or-proxy code, and paste the OpenRouter token into the Custom endpoint key field. Connect saves it in ST’s distinct Custom secret slot, then loads models through that endpoint. Select a returned model or enter its exact ID manually. ST adds `/models` and `/chat/completions` automatically. Keep the existing proxy running separately; this kit does not install or start it. The proxy forwards requests to OpenRouter using wreq-js Chrome TLS impersonation. Direct OpenRouter mode bypasses this proxy. A saved key is storage confirmation, not authentication verification; successful models loading does not prove a paid generation succeeds. Connection profiles and secrets are separate ST features.
