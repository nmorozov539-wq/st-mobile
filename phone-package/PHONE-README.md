# Pocket Tavern combined prototype v0.6.1

## Update your existing phone installation

Stop its launcher with Ctrl+C. Put the complete **pocket-tavern-combined-v0.6.1.zip** and matching **repair-pocket.cjs** in Android Downloads. In Termux:

```sh
node ~/storage/downloads/repair-pocket.cjs
```

This installs matching frontend/bridge code, keeps existing data/settings/config, backs up previous code and starts the combined installation with its installed optional proxy. Reload **http://127.0.0.1:8123/st-mobile/**. App connection settings should show frontend and bridge **0.6.1**.

For manual updating from the complete extracted kit:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.6.1
node update-test.cjs ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs --proxy
```

Use plain `node start.cjs` if you do not use the bundled proxy. An isolated mock installation uses `node start.cjs --mock`.

## Fresh normal installation

The kit copies ST 1.19.0 code and installed dependencies from your existing phone installation. It contains no personal data or bundled Node dependencies. It refuses an existing destination.

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.6.1
node prepare.cjs ~/SillyTavern ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs
```

One server serves Pocket at `/st-mobile/` and native ST at `/`. Standard data is `~/pocket-tavern/data/default-user`. Your usual ST data/code are not changed. Ctrl+C stops the launcher and its children.

## Optional OpenRouter proxy

If you already have the working `~/or-proxy` dependency folder on this phone, install the bundled optional proxy from the extracted kit once:

```sh
node setup-proxy.cjs ~/or-proxy ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs --proxy
```

Choose Custom, endpoint **http://127.0.0.1:8001/api/v1**, save your key in ST's Custom slot and Connect. ST adds `/models` and `/chat/completions`. The launcher waits for the proxy before ST and stops both together. A busy port prevents startup. Setup copies dependencies only, no keys/logs/settings, and refuses overwriting an installed proxy. Plain `start.cjs` does not start it. Direct OpenRouter mode bypasses it.

Connect loads model availability; Test message sends a tiny provider request without adding to a chat. Keys stay in ST and never enter Pocket's pending-change journal. A provider may charge for generation/test requests.

## What to test in 0.6.1

This repair targets first-click Send/New reply locks, existing-alternative gestures and engine reconnect recovery. Deleting the last assistant reply leaves your user message in place; nothing is generated automatically, and a following Send continues normally.

- Home/Chats/Characters/Personas/WI navigation; tapping Home again continues the last visited chat. Back returns to the entry screen.
- Model picker and preset entry switches. Global/Character/Chat copies stay independent; Reset copies Global without disabling the override. Preset and model choices do not change each other.
- While a reply runs, browse another chat and type a draft. Only one generation is allowed. Commit sampler edits and check Pending → Applied after generation/save/Memory finish. Drafts are never sent automatically.
- Message edit/delete/multi-delete/fork. Swipe alternatives loops existing replies; New reply is explicit. Swipe a chat row to reveal Delete, or use its ellipsis. Delete has 12-second Undo.
- Read-only Memory layers, global pause and frequency. Changing summarized history keeps the written memory but marks it invalid and stops its injection/automatic summaries. Undo restores the matching memory/history.
- Sanitized HTML colours/details, thinking expansion, scrolling older messages and Jump to latest.

This is a browser/Termux skeleton. World Info editing links to native ST; the library reuses the existing field editors. Connection/persona/library writes require an idle engine. No APK, groups, archive, profiles, general extension UI or Memory rebuild editor yet. Native ST remains available for advanced controls. Phone gestures, keyboard resizing, very long chats, battery behavior and background lifetime need device testing.

## Isolated mock installation

Use a different fresh folder so mock testing cannot touch real-provider data:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.6.1
node prepare.cjs ~/SillyTavern ~/pocket-tavern-combined-test --mock
cd ~/pocket-tavern-combined-test
node start.cjs --mock
```

Try `[think]`, `[slow]` or `[fail]`. One launcher starts ST and the local mock. Normal/mock modes cannot be mixed on one installation.

## Optional offline data copy

Back up and stop both engines first. Prepare a NEW normal combined folder and do not start it yet. From the extracted kit:

```sh
node import-data.cjs ~/SillyTavern/data/default-user ~/pocket-tavern
```

The importer refuses existing destination user data, merges, mock installs and symlinked user files. It copies normal settings/cards/chats/presets/lorebooks/personas/credentials; original files remain intact. Server config and third-party extension code are separate. Use the actual path if your usual data root differs. One engine owns a data folder; sharing it between running servers is unsupported.

## Recovery

Browser storage keeps drafts, committed pending changes and short-lived deletion recovery. Drafts flush roughly one second after typing and on navigation/hiding. Clearing browser storage removes them. An uncertain request is never auto-resent. After a restart, review saved data and pending work before Resume; discard conflicts and reapply explicitly. A same-session generation can be observed. Undo expires after 12 seconds.

ST 1.19.0 compatibility patches keep CSRF/path checks enabled. Each installation has its own cookie; startup validates the token before saving settings. The original ST installation is not patched. Future ST versions and Android lifecycle behavior require separate validation.
