# Pocket Tavern — v0.7.12

Pocket Tavern is intended to become an Android app for using SillyTavern 1.19.0 locally through Termux. The current browser build is a proof of concept for the app’s interface, ST integration and operational safeguards; it is not the final delivery format.

For this proof of concept, one prepared Termux folder contains ST, Pocket Tavern and copied installed dependencies; one launcher serves both interfaces. ST owns normal `data/default-user` files and generation. An Android APK is not implemented yet. App packaging, lifecycle and system integration remain future work; the app architecture/framework has not been selected.

## Current release

`pocket-tavern-combined-v0.7.12.zip` and matching `repair-pocket.cjs` are in the project root. The download contains our frontend/bridge and preparation/update tools; preparation copies ST and installed dependencies from your existing phone installation.

For an existing phone installation: stop Pocket Tavern, copy both files to Android Downloads, then run:

```sh
node ~/storage/downloads/repair-pocket.cjs
```

The repair/update flow keeps installed ST data/settings/config, backs up previous code and launches the combined installation with its optional proxy. Reload **http://127.0.0.1:8123/st-mobile/**. Connection settings show frontend and bridge **0.7.8**. See [phone instructions](phone-package/PHONE-README.md) for fresh installation and other launch modes.

## Chat phase

The approved chat screen now has quiet nearly full-width reading, a static blue-violet background, a slim character header and a simple model/Send/Stop composer. Gear opens the Preset/Persona/Memory icon fan; message ellipsis opens the action fan. Text remains selectable. Editing happens in place; targeted deletion, Undo, multi-select, copying and forks remain available.

Saved-alternative arrows loop without generating. A deliberate leftward touch swipe past the final saved alternative can create another reply; the eligible final message also has an accessible Another reply action. Native saved generation timings appear where present; missing details are omitted.

The expandable model panel selects immediately and keeps scope, target and effective model above its scrolling list. Model scope and preset scope now have separate Chat > Character > Global precedence. The additive version-2 migration retains old model choices, disabled copies and unknown fields. Unavailable saved models stay visible. Connection source, credentials and endpoint remain global. The version-3 preset phase remembers scope-local adjustments for each named preset without overwriting native preset files.

## Preset phase

The approved full-page preset editor has browsing-only Global/Character/Chat tabs, a picker with remembered-setting indicators, collapsed generation parameters and an uninterrupted native entry list. Selecting or editing applies to the selected scope; explicit inheritance removes only that scope’s preset override. Model scope remains independent. Entries retain name, role, content, native placement/depth/order, all six generation triggers and applicable character-override protection. Built-in markers explain their native content source. Save/Cancel edits a draft; unknown fields and other native prompt orders survive.

A → B → A restores each preset’s scope-local adjustments after reload. Edits made while generation owns ST are durably pending and preserve the captured request. Reset to Global remains under More generation parameters, confirms its target and retains other remembered presets and model selection. Unavailable saved selections stay visible.

Character 0.7.2 adds the first content subphase: remembered per-card Read/Edit from chat, Edit by default from the library, actual card portraits/tags, Description/Greeting/Advanced, explicit greeting organization, isolated Creator’s Notes and verified native saves. Drafting during generation remains available; saving waits for an idle engine. Native unknown fields, prompt overrides and embedded lorebooks survive. Character 0.7.3 adds the approved inline overflow with native PNG/JSON export, verified duplication and targeted deletion. Delete defaults to keeping chat files; deleting them is an explicit checkbox. Unsaved drafts and stale revisions block actions, and unsaved native temporary conversations block deletion. Exports remain available during generation; mutations wait for settlement. Character 0.7.4 shows native persona and lorebook associations, including multiple persona links, unavailable saved books and embedded-card presence. The persona information sheet reveals full names. Character 0.7.5 adds targeted persona Edit/Remove and actual lorebook Connect/Unattach. Character drafts survive related persona editing and association saves; primary replacement updates embedded export data and detachment removes it without promoting additional books. Native shared settings and card revisions are checked before mutation, writes are verified, and generation blocks mutations. Multiple native persona links remain acknowledged and managed in ST. The approved chat selector is available in 0.7.6; 0.7.7 adds the guarded Start new chat workflow: deletion defaults off, ST creates and verifies the greeting before optional source deletion, and Undo/restart review retain the original chat, Memory and opaque fields. Opening a native greeting never starts an automatic Pocket Memory request.

Characters and Chats 0.7.8 add the approved three-column library, separate Import/Create, incomplete-card warnings, recent rows and a dedicated fresh-character picker. Character taps edit without selecting or creating chats. Start chat requires a saved complete card and creates exactly one native greeting; it never resumes an old chat or generates a model reply. Existing chat rows resume their exact saved target. Named deletion confirmation retains complete Undo. Other screens retain their existing layouts and editors. [Implementation review and roadmap](IMPLEMENTATION_REVIEW.md) records the evaluation, reference review and dependencies for later phases. The two-line Chat/Character persona-link draft remains pending approval.

Memory 0.7.9 replaces the old dialog with the full Summaryception page: saved memories with edit/regenerate/delete, injection preview, global turns/prompt/connection settings, import/export/repair/clear, and the in-chat working, stopped, complete and catch-up states. Writes use verified extension actions; a separate summarizer connection stays in full ST.

World Info 0.7.10 replaces the placeholder with a library of folders and books (source labels such as Global or Character · Primary, entry enable toggles, add entry), a full entry editor, and a global Activation page. Books can be created, imported (native ST or character-book JSON), renamed, duplicated, exported, moved between folders and deleted. Folders are stored as `extensions.folder` inside each book, compatible with WorldInfoDrawer, and never change activation. Every save is revision-guarded and verified by reading the book back.

Settings 0.7.11 adds a full Settings page from the Home gear (and from the model picker): a Connection tab (engine status and Reconnect, Use proxy, endpoint, API key, global model with refresh/manual ID, Connect and a separate Test message) and an Appearance & reading tab (text size, line spacing, Plain/Gradient background, generation time / clock / model icon / token count, with a live preview). The proxy switch changes the saved endpoint and reports whether the proxy answers; starting and stopping the proxy process itself is left to the launcher and the Android package. Reading preferences are stored on this device only.

Home 0.7.12 is the approved lightweight landing page: Pocket Tavern header with the Settings gear, the tagline, Engine and API connection status, and Characters / Chats / Personas counts. API shows Connected only when ST reports a connection, Not connected after a failed check, and otherwise Not checked; opening Home never sends a request. The old Continue/Recent shortcuts and the stop button are gone from Home (Chats and the chat screen keep them).

Browsing and drafting in another chat does not switch the generating ST chat. One generation runs at a time. Committed scoped settings and history edits can wait in a durable queue, with visible Pending/Applied states and explicit restart review. Message actions include editing, copy, deletion, multi-delete and forks. Existing alternatives loop; another reply requires a deliberate gesture or named action. Deletion has brief Undo.

Summaryception has global pause/frequency controls and read-only written memories. Changed summarized history stops stale memory injection and automatic summary work for that chat while retaining the written summaries. Undo restores history and memory together. Sanitized HTML/font colours/collapsible blocks and reasoning remain supported. Messages and large lists render nearby content with a buffer; streaming is batched per animation frame.

Details, storage locations, recovery behavior and deliberate limits: [implementation notes](prototype/IMPLEMENTATION.md).

## Validation and preview

Current verification: **149 automated tests and 283 UI/mock checks pass**. Reproduction and exact evidence are recorded in [the test report](tests/TEST_REPORT.md), including fresh new-chat, Character/association and chat regression checks. Historical native/Preset/HTML evidence is identified separately. All requests use an isolated ST 1.19.0 fixture and local mock, without personal data, keys or paid generation. Android keyboard, gestures, downloads and background behavior remain device checks.

The final packaged mock fixture is `/tmp/pocket-release-engine` at **http://127.0.0.1:8123/st-mobile/**. Temporary fixtures may disappear after reboot; do not assume a test server is running.

Build: `python3 scripts/build-phone-package.py`, then copy the ZIP from `dist` to the project root. `POCKET_REPAIR_FIXTURE=/tmp/pocket-release-engine node tests/repair-kit.cjs` checks the real archive/update preservation flow with launcher ports free. `tests/chat-ui-runner.cjs` owns only a prepared mock engine for repeatable live interruption/recovery checks; its mock provider runs separately with `--many-models`. `tests/workspace-check.html` / `.js` are development-only browser integration checks and are not shipped in the phone frontend. Serve them beside frontend modules in an isolated mock installation only.

## Data and compatibility

Each installation has one engine and its own standard ST data folder. An offline importer can copy a matching `default-user` into a fresh, unstarted normal installation; it refuses merging/overwriting. No automatic synchronization or simultaneous writers to one data folder are supported. Secrets remain in ST; browser storage holds drafts, navigation, pending work and short-lived Undo snapshots.

Prepared-engine compatibility patches retain CSRF/path checks: explicit tokenizer token headers, separate installation cookies, uncached startup session validation and local codec-WASM aliases. Original ST is untouched. Install/update tools require the known ST 1.19.0 implementation and refuse incompatible source fragments.

The user previously confirmed real OpenRouter streaming inside Pocket on Android with the optional proxy. Chat has been confirmed working on the phone. Preset 0.7.1 and Character 0.7.2 through 0.7.8 still need real-phone testing; outstanding checks are tracked in [PHONE_TEST_CHECKLIST.md](PHONE_TEST_CHECKLIST.md). Android packaging/background guarantees, general extension support, groups, archives, profiles, full native library UI parity and Memory rebuilding are deferred. World Info editing currently links to native ST. Library authoring/persona/connection mutations require an idle engine. Recent chats are capped at 1,000 rows and list heights are estimated.

Historical plans, source investigations, reports, screenshots and the early demo are kept locally in ignored `history/`; previously committed material is also recoverable from Git. Current design references remain tracked in `GoalVisuals/`. Generated packages are ignored; the current 0.7.8 package and confirmed-working 0.6.1 fallback remain in the root.

## Design reference

The approved chat phase is implemented; other approved designs remain future phases. Open [interactive design reference](GoalVisuals/interactive-design-reference.html) and read [implementation guide](GoalVisuals/IMPLEMENTATION_GUIDE.md) plus [approved decisions](GoalVisuals/README.md) before coding. Review the chat phase on the phone before starting another major screen.
