# Pocket Tavern — v0.7.2

Pocket Tavern is intended to become an Android app for using SillyTavern 1.19.0 locally through Termux. The current browser build is a proof of concept for the app’s interface, ST integration and operational safeguards; it is not the final delivery format.

For this proof of concept, one prepared Termux folder contains ST, Pocket Tavern and copied installed dependencies; one launcher serves both interfaces. ST owns normal `data/default-user` files and generation. An Android APK is not implemented yet. App packaging, lifecycle and system integration remain future work; the app architecture/framework has not been selected.

## Current release

`pocket-tavern-combined-v0.7.2.zip` and matching `repair-pocket.cjs` are in the project root. The download contains our frontend/bridge and preparation/update tools; preparation copies ST and installed dependencies from your existing phone installation.

For an existing phone installation: stop Pocket Tavern, copy both files to Android Downloads, then run:

```sh
node ~/storage/downloads/repair-pocket.cjs
```

The repair/update flow keeps installed ST data/settings/config, backs up previous code and launches the combined installation with its optional proxy. Reload **http://127.0.0.1:8123/st-mobile/**. Connection settings show frontend and bridge **0.7.2**. See [phone instructions](phone-package/PHONE-README.md) for fresh installation and other launch modes.

## Chat phase

The approved chat screen now has quiet nearly full-width reading, a static blue-violet background, a slim character header and a simple model/Send/Stop composer. Gear opens the Preset/Persona/Memory icon fan; message ellipsis opens the action fan. Text remains selectable. Editing happens in place; targeted deletion, Undo, multi-select, copying and forks remain available.

Saved-alternative arrows loop without generating. A deliberate leftward touch swipe past the final saved alternative can create another reply; the eligible final message also has an accessible Another reply action. Native saved generation timings appear where present; missing details are omitted.

The expandable model panel selects immediately and keeps scope, target and effective model above its scrolling list. Model scope and preset scope now have separate Chat > Character > Global precedence. The additive version-2 migration retains old model choices, disabled copies and unknown fields. Unavailable saved models stay visible. Connection source, credentials and endpoint remain global. The version-3 preset phase remembers scope-local adjustments for each named preset without overwriting native preset files.

## Preset phase

The approved full-page preset editor has browsing-only Global/Character/Chat tabs, a picker with remembered-setting indicators, collapsed generation parameters and an uninterrupted native entry list. Selecting or editing applies to the selected scope; explicit inheritance removes only that scope’s preset override. Model scope remains independent. Entries retain name, role, content, native placement/depth/order, all six generation triggers and applicable character-override protection. Built-in markers explain their native content source. Save/Cancel edits a draft; unknown fields and other native prompt orders survive.

A → B → A restores each preset’s scope-local adjustments after reload. Edits made while generation owns ST are durably pending and preserve the captured request. Reset to Global remains under More generation parameters, confirms its target and retains other remembered presets and model selection. Unavailable saved selections stay visible.

Character 0.7.2 adds the first content subphase: remembered per-card Read/Edit from chat, Edit by default from the library, actual card portraits/tags, Description/Greeting/Advanced, explicit greeting organization, isolated Creator’s Notes and verified native saves. Drafting during generation remains available; saving waits for an idle engine. Native unknown fields, prompt overrides and embedded lorebooks survive. Character associations, export/duplicate/delete and the redesigned chat selector remain the next Character subphase; their controls are not simulated.

Other screens retain their existing layouts and editors. [Implementation review and roadmap](IMPLEMENTATION_REVIEW.md) records the evaluation, reference review and dependencies for later phases. The two-line Chat/Character persona-link draft remains pending approval.

Browsing and drafting in another chat does not switch the generating ST chat. One generation runs at a time. Committed scoped settings and history edits can wait in a durable queue, with visible Pending/Applied states and explicit restart review. Message actions include editing, copy, deletion, multi-delete and forks. Existing alternatives loop; another reply requires a deliberate gesture or named action. Deletion has brief Undo.

Summaryception has global pause/frequency controls and read-only written memories. Changed summarized history stops stale memory injection and automatic summary work for that chat while retaining the written summaries. Undo restores history and memory together. Sanitized HTML/font colours/collapsible blocks and reasoning remain supported. Messages and large lists render nearby content with a buffer; streaming is batched per animation frame.

Details, storage locations, recovery behavior and deliberate limits: [implementation notes](prototype/IMPLEMENTATION.md).

## Validation and preview

Fresh verification: **101 automated tests**, **65 live chat UI assertions**, **28 native ST/mock assertions**, **11 HTML checks**, and the real ZIP/repair/final-launcher flow pass. Evidence and reproduction are recorded in [the test report](tests/TEST_REPORT.md). Tests use isolated ST 1.19.0, the adapted Summaryception and local mock requests, with no personal data, real keys or paid generation. Preset checks cover real entry injection, per-preset memory, independent scopes, queueing during generation and native-file preservation. Chat checks cover actual first-click Send, Stop, queued scope/history races, alternatives, edits, Undo, forks, text selection, model scrolling and recovery. Android keyboard, gestures and background behavior still need device testing.

The final packaged mock fixture is `/tmp/pocket-release-engine` at **http://127.0.0.1:8123/st-mobile/**. Temporary fixtures may disappear after reboot; do not assume a test server is running.

Build: `python3 scripts/build-phone-package.py`, then copy the ZIP from `dist` to the project root. `POCKET_REPAIR_FIXTURE=/tmp/pocket-release-engine node tests/repair-kit.cjs` checks the real archive/update preservation flow with launcher ports free. `tests/chat-ui-runner.cjs` owns only a prepared mock engine for repeatable live interruption/recovery checks; its mock provider runs separately with `--many-models`. `tests/workspace-check.html` / `.js` are development-only browser integration checks and are not shipped in the phone frontend. Serve them beside frontend modules in an isolated mock installation only.

## Data and compatibility

Each installation has one engine and its own standard ST data folder. An offline importer can copy a matching `default-user` into a fresh, unstarted normal installation; it refuses merging/overwriting. No automatic synchronization or simultaneous writers to one data folder are supported. Secrets remain in ST; browser storage holds drafts, navigation, pending work and short-lived Undo snapshots.

Prepared-engine compatibility patches retain CSRF/path checks: explicit tokenizer token headers, separate installation cookies, uncached startup session validation and local codec-WASM aliases. Original ST is untouched. Install/update tools require the known ST 1.19.0 implementation and refuse incompatible source fragments.

The user previously confirmed real OpenRouter streaming inside Pocket on Android with the optional proxy. Chat has been confirmed working on the phone. Preset 0.7.1 and Character 0.7.2 still need real-phone testing; outstanding checks are tracked in [PHONE_TEST_CHECKLIST.md](PHONE_TEST_CHECKLIST.md). Android packaging/background guarantees, general extension support, groups, archives, profiles, full native library UI parity and Memory rebuilding are deferred. World Info editing currently links to native ST. Library authoring/persona/connection mutations require an idle engine. Recent chats are capped at 1,000 rows and list heights are estimated.

Historical plans, source investigations, reports, screenshots and the early demo are kept locally in ignored `history/`; previously committed material is also recoverable from Git. Current design references remain tracked in `GoalVisuals/`. Generated packages are ignored; the current 0.7.2 package and confirmed-working 0.6.1 fallback remain in the root.

## Design reference

The approved chat phase is implemented; other approved designs remain future phases. Open [interactive design reference](GoalVisuals/interactive-design-reference.html) and read [implementation guide](GoalVisuals/IMPLEMENTATION_GUIDE.md) plus [approved decisions](GoalVisuals/README.md) before coding. Review the chat phase on the phone before starting another major screen.
