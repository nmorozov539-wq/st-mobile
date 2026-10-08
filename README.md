# Pocket Tavern — v0.6.2

A mobile browser interface for SillyTavern 1.19.0. One prepared Termux folder contains ST, Pocket Tavern and copied installed dependencies; one launcher serves both interfaces. ST owns normal `data/default-user` files and generation. This is a prototype, not an Android APK.

## Current release

`pocket-tavern-combined-v0.6.2.zip` and matching `repair-pocket.cjs` are in the project root. The download contains our frontend/bridge and preparation/update tools; preparation copies ST and installed dependencies from your existing phone installation.

For an existing phone installation: stop Pocket Tavern, copy both files to Android Downloads, then run:

```sh
node ~/storage/downloads/repair-pocket.cjs
```

The repair/update flow keeps installed ST data/settings/config, backs up previous code and launches the combined installation with its optional proxy. Reload **http://127.0.0.1:8123/st-mobile/**. Connection settings show frontend and bridge **0.6.2**. See [phone instructions](phone-package/PHONE-README.md) for fresh installation and other launch modes.

## Interface skeleton

Home, Chats, Characters, Personas and World Info tabs; chat header and composer chips; immediate model picker; shared preset component with entry toggles and full-screen text editor. Chat/character settings are independent optional copies with Chat > Character > Global precedence. Model and preset choices do not change one another; connection credentials/source/endpoint remain global.

Long-press now takes one second; auto-follow only engages within one CSS pixel of the bottom (for fractional scroll rounding). [Design handoff](DESIGN_HANDOFF.md) records the next stage.

The previous repair removes a no-op Memory activation lock, makes explicit regeneration independent of native overswipe preferences, updates saved alternatives without reloading the whole native chat, and isolates reconnect health checks from the old iframe.

Browsing and drafting in another chat does not switch the generating ST chat. One generation runs at a time. Committed scoped settings and history edits can wait in a durable queue, with visible Pending/Applied states and explicit restart review. Message actions include editing, copy, deletion, multi-delete and forks. Existing alternatives loop; creating another reply is explicit. Deletion has brief Undo.

Summaryception has global pause/frequency controls and read-only written memories. Changed summarized history stops stale memory injection and automatic summary work for that chat while retaining the written summaries. Undo restores history and memory together. Sanitized HTML/font colours/collapsible blocks and reasoning remain supported. Messages and large lists render nearby content with a buffer; streaming is batched per animation frame.

Details, storage locations, recovery behavior and deliberate limits: [implementation notes](prototype/IMPLEMENTATION.md).

## Validation and preview

`npm test`: **94 automated tests**. **28 native ST/mock assertions** plus real-interface checks cover scope persistence, fork preservation, deletion/Undo, Memory validity, generation ownership, Stop/save/readback and cross-chat browsing. Manual UI checks verify a separate draft and two queued sampler changes remain on their originating chat. Results and device limits: [test report](tests/TEST_REPORT.md).

PC mock preview: **http://127.0.0.1:8123/st-mobile/**, fixture `/tmp/pocket-combined-engine`. Temporary fixtures may disappear after reboot. Restart its launcher with `node start.cjs --mock`. Original ST code/personal data were not changed; no real keys or paid model calls were used in development.

Build: `python3 scripts/build-phone-package.py`, then copy the ZIP from `dist` to the project root. `tests/repair-kit.cjs` checks the real archive/update preservation flow with launcher ports free. `tests/workspace-check.html` / `.js` are development-only browser integration checks and are not shipped in the phone frontend. Serve them beside frontend modules in an isolated mock installation only.

## Data and compatibility

Each installation has one engine and its own standard ST data folder. An offline importer can copy a matching `default-user` into a fresh, unstarted normal installation; it refuses merging/overwriting. No automatic synchronization or simultaneous writers to one data folder are supported. Secrets remain in ST; browser storage holds drafts, navigation, pending work and short-lived Undo snapshots.

Prepared-engine compatibility patches retain CSRF/path checks: explicit tokenizer token headers, separate installation cookies, uncached startup session validation and local codec-WASM aliases. Original ST is untouched. Install/update tools require the known ST 1.19.0 implementation and refuse incompatible source fragments.

The user previously confirmed real OpenRouter streaming inside Pocket on Android with the optional proxy. The new 0.6.2 interface still needs real-phone comfort testing. Android packaging/background guarantees, general extension support, groups, archives, profiles, full native library UI parity and Memory rebuilding are deferred. World Info editing currently links to native ST. Library authoring/persona/connection mutations require an idle engine. Recent chats are capped at 1,000 rows and list heights are estimated.

Historical plans, source investigations, reports, screenshots and the early demo are kept locally in ignored `history/`; previously committed material is also recoverable from Git. Current design references remain tracked in `GoalVisuals/`. Generated packages are ignored; the current 0.6.2 package and confirmed-working 0.6.1 fallback remain in the root.

## Design reference

The current design discussion is separate from the implemented build. Open [interactive design reference](GoalVisuals/interactive-design-reference.html) and read [implementation guide](GoalVisuals/IMPLEMENTATION_GUIDE.md) plus [approved decisions](GoalVisuals/README.md) before coding. Implementation remains on hold.
