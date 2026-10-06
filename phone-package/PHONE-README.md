# Pocket Tavern combined prototype v0.5.1

This kit prepares one folder containing ST 1.19.0, Pocket Tavern, and copied installed dependencies. It does not include ST or dependencies in the small download: preparation copies your phone's installed code. After preparation, running the combined folder does not depend on the original installation. No Android app yet.

## Fresh normal setup

Extract the ZIP in Downloads. Stop an old Pocket Tavern test session with Ctrl+C; it uses the same port. In Termux:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.5.1
node prepare.cjs ~/SillyTavern ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs
```

Open **http://127.0.0.1:8123/st-mobile/**. The original ST interface is also served at the root address. One ST server owns `~/pocket-tavern/data`; standard user files live in `data/default-user`. Your usual ST data is not copied or changed. Allow space for the full ST code and dependencies; their size depends on your installation. Preparation refuses an existing destination.

Use Settings to select OpenRouter, save your API key in ST, connect, refresh the model list, and choose a model. No model ID is hardcoded. Keys are not returned to the frontend or stored in its localStorage. Sending a message uses your provider and may incur its normal charges. Only mock-provider generation has been verified locally; real OpenRouter testing requires you to configure the phone.

Presets use ST’s native chat-completion files. Manage library can import/create/edit characters, personas and chat-completion presets; global lorebooks are still existing selections. Preset prompt text and toggles are editable. Advanced JSON preserves other fields. Character/chat lore remains intact. Presets may change model/source or other generation options; check the connection afterward. Full ST controls remain available. Automatic continuation, automatic swipe, tools, groups and slash commands remain outside the supported prototype scope.

## Isolated mock testing

Prepare a DIFFERENT fresh folder with explicit mock settings:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.5.1
node prepare.cjs ~/SillyTavern ~/pocket-tavern-combined-test --mock
cd ~/pocket-tavern-combined-test
node start.cjs --mock
```

Try `[think]` for separate reasoning, `[slow]` for a stoppable stream, and `[fail]` for a provider failure. One launcher starts both ST and the local fixture model. Ctrl+C stops both. Normal mode runs ST alone. Mock mode is refused for a normal-data installation to avoid accidentally using real-provider settings during a mock test.

## Update an existing prototype

Stop its launcher first. From the newly extracted kit:

```sh
node update-test.cjs ~/pocket-tavern
```

Then return to the combined folder and run `node start.cjs`. For a combined mock fixture use `--mock`. The updater also supports old isolated test folders such as `~/pocket-tavern-phone-test`; those still start with `node start-test.cjs` from the kit. Updates preserve data/settings/config and back up prior code. Combined folders retain the unpatched ST source fragments needed for compatible updates, so updates do not require the original ST folder.

## Optional controlled copy of existing user data — later

This is a copy, not a format conversion or merge. Make a backup first and stop both ST servers before copying. Use matching ST 1.19.0 data. Prepare a NEW normal combined folder, but do not start it yet. From the extracted kit:

```sh
node import-data.cjs ~/SillyTavern/data/default-user ~/pocket-tavern
```

The importer refuses any existing destination user folder, mock installations and symlinked user files. Original files remain intact. It copies settings, characters, chats, presets, lorebooks, personas and credentials stored within default-user; treat the new folder as private. Server-level configuration and third-party extension code are not migrated. Custom data roots require the actual source default-user path. This does not provide automatic synchronization between installations or support two servers writing one data folder. Do not use it while either server is active.

## Limits and recovery

ST handles prompts/generation/saving. The complete ST browser runtime remains loaded offscreen. The app keeps only drafts/navigation and an interrupted-operation journal in browser localStorage. Browser storage is not a chat database. Engine loss disables writes; reconnection rereads saved data and never resubmits an uncertain write automatically.

Compatibility changes are applied only to the prepared engine: explicit tokenizer CSRF headers, a separate session cookie, uncached startup-token validation, and exact local codec-WASM aliases. Security checks remain enabled. An old regular-ST tab may need closing/reopening after the original kit's cookie collision; your usual installation is not patched.

Android background lifetime and real-provider reasoning behavior still require phone testing. Selecting a preset/persona/lorebook needs saved-state and prompt validation; a successful mock run alone does not establish compatibility with all presets, extensions or providers. Chat deletion asks for confirmation; Pocket Tavern provides no undo.

## Existing OpenRouter TLS proxy

If direct OpenRouter requests fail and your normal ST uses the supplied or-proxy, keep that proxy running as usual. In Pocket Tavern select Custom (OpenAI-compatible / proxy), use `http://127.0.0.1:8001/api/v1`, and paste your token into the Custom endpoint key field. Press Connect. Choose an available model, or enter the exact provider model ID manually. This proxy route uses the Custom key slot, separate from ST’s OpenRouter key slot. You can use your existing proxy or install the optional bundled copy below. A key is not shown in plaintext after saving, and a saved key does not mean the provider accepted it.

## Install the optional bundled proxy

After updating/preparing Pocket Tavern, run once from this extracted kit on your phone:

```sh
node setup-proxy.cjs ~/or-proxy ~/pocket-tavern
```

If your working proxy folder has a different location, use that instead of `~/or-proxy`. It must contain its installed `node_modules` on this same phone. No key needs to be entered into Termux. Stop your previously running proxy, then:

```sh
cd ~/pocket-tavern
node start.cjs --proxy
```

One command starts the bundled proxy and ST; Ctrl+C stops both. Use Custom with `http://127.0.0.1:8001/api/v1` in Settings, enter your key there, and select your model. Plain `node start.cjs` leaves the proxy off. If port 8001 is busy, stop the old proxy first. Setup leaves its original folder untouched. Updates preserve the bundled dependencies and your data.

## Repair a failed extraction/update/proxy setup

Copy repair-pocket.cjs and the v0.5.1 ZIP into phone Downloads. Stop Pocket Tavern and the external proxy first. Run `node ~/storage/downloads/repair-pocket.cjs`. It reads the ZIP directly using ST’s installed yauzl dependency, updates the existing combined folder, installs the bundled proxy from a working same-phone or-proxy dependency folder if absent, then launches explicitly with --proxy. It preserves data and never runs fresh preparation over an existing installation. It accepts duplicate ZIP download names, rejects unexpected archive paths, and reports incomplete files or missing dependencies before launch. If it cannot find the proxy folder, use `node repair-pocket.cjs /path/to/package.zip /path/to/or-proxy`. After startup close the full ST tab, reload /st-mobile/, verify both build IDs are 0.5.1, and select Custom to expose endpoint controls.

## Update the working phone installation to v0.5.1

Stop Pocket Tavern with Ctrl+C. Extract the complete v0.5.1 ZIP, then run:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.5.1
node update-test.cjs ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs --proxy
```

Use plain `node start.cjs` if you do not use the bundled proxy. This updater keeps existing data, configuration and copied proxy dependencies, backs up old code, and installs the pinned Summaryception integration. Reload the phone browser. Settings should show Pocket Tavern and bridge 0.5.1. No repeat preparation or proxy setup is needed.

Test message in Settings sends a tiny real request without adding it to a chat. Your provider may charge for it. Manage library accepts standard character files, persona-backup JSON, and chat-completion preset JSON. Persona JSON backups omit images; choose a portrait manually or keep the default. Presets with an existing name are not overwritten on import. Saving applies the preset, so recheck your model/connection.

Memory exposes Summaryception settings, saved layers, force summary, stop and backlog choices. Use Summaryception’s Default ST connection for this build; it follows your current Custom/OpenRouter connection and proxy. Fresh setups leave memory off. Imported data preserves the original choices. General extension support and Summaryception’s other connection modes/mobile advanced memory editors are still pending.

## Can I copy my real default-user folder?

Yes: it has the standard ST structure. Copying the whole folder into a **fresh, unstarted** normal installation is supported. Do not merge it with the current test user's files or share one live folder between two servers. Stop both engines and keep a backup. Code for extensions installed outside default-user is not included in that folder; Summaryception is bundled separately here. Other extension data is retained, but its features may not work in Pocket yet.

A safer copy uses the included importer into a new installation:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.5.1
node prepare.cjs ~/SillyTavern ~/pocket-tavern-personal
node import-data.cjs ~/SillyTavern/data/default-user ~/pocket-tavern-personal
node update-test.cjs ~/pocket-tavern-personal
node setup-proxy.cjs ~/or-proxy ~/pocket-tavern-personal
cd ~/pocket-tavern-personal
node start.cjs --proxy
```

Skip the proxy setup and flag if not needed. Adjust the source path if your ST stores data elsewhere. Import runs before the first start and refuses existing destination user data, linked files, merges and overwrites. It copies chats, characters, personas, presets, lorebooks, settings and saved credentials; it leaves the original folder untouched. It does not synchronize later changes. Personal migration has not been performed during development.

After importing, the updater also patches a recognized user-local Extension-Summaryception copy if present: ST gives that code priority over the bundled global copy. Previous extension code is backed up; settings/chat files are retained. Keep this update step when migrating data. Other user-local extensions keep their original code and may require future compatibility work.
