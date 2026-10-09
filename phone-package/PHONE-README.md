# Pocket Tavern combined prototype v0.7.7

## Update your existing phone installation

Stop its launcher with Ctrl+C. Put the complete **pocket-tavern-combined-v0.7.7.zip** and matching **repair-pocket.cjs** in Android Downloads. In Termux:

```sh
node ~/storage/downloads/repair-pocket.cjs
```

This installs matching frontend/bridge code, keeps existing data/settings/config, backs up previous code and starts the combined installation with its installed optional proxy. Reload **http://127.0.0.1:8123/st-mobile/**. App connection settings should show frontend and bridge **0.7.7**.

For manual updating from the complete extracted kit:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.7.7
node update-test.cjs ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs --proxy
```

Use plain `node start.cjs` if you do not use the bundled proxy. An isolated mock installation uses `node start.cjs --mock`.

## Fresh normal installation

The kit copies ST 1.19.0 code and installed dependencies from your existing phone installation. It contains no personal data or bundled Node dependencies. It refuses an existing destination.

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.7.7
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

## Character association controls retained from 0.7.5

Open Character to see its saved persona and lorebook associations. Tap the dim persona line for full names; multiple native links remain separate. Primary lorebook comes first, then additional books, including unavailable saved names. With one linked persona, Edit uses the current editor and Remove requires confirmation, preserving other links. Connect lorebook uses actual saved books and chooses Primary or Additional. Primary is embedded in exports; replacing it updates the embedded contents. Unattach requires confirmation; removing Primary also removes its embedded copy and never promotes an additional book. Mutations wait for generation settlement and check saved revisions. Multiple native persona links remain managed in ST. Back/outside tap closes the sheet and keeps your character draft.

## Character actions retained from 0.7.3

The Character overflow expands below its header. PNG/JSON exports use ST’s native saved-card format; Duplicate creates and verifies a separate card without opening its chat. Delete identifies the card name and filename, defaults to retaining its chat files, and offers an explicit checkbox to delete them. Deletion has no Undo. Retained chats require restoring a card with its original filename. Save or cancel drafts before using actions. Exports work during generation; card mutations wait. A native unsaved temporary conversation blocks deletion with an explanation.

## Character content retained from 0.7.2

Open a character from its chat name/avatar or the existing library Fields action. Check Read/Edit, greetings, Creator’s Notes and a save/reopen. Reading/drafting remains available during generation; saving is disabled until settlement. Notes keep their raw source and show an isolated preview; external images and navigation are blocked. Native lorebooks and unrelated links are preserved; the association controls are described above. The full outstanding phone list is included as **PHONE_TEST_CHECKLIST.md**.

## Preset checks retained from 0.7.1

The approved chat and preset phases are implemented. Other libraries/editors keep their current layouts. No Android framework or APK migration is included.

- Open Preset from gear. Switch scope tabs and return: browsing should not change settings. Choose/edit a preset to apply it at that scope; a stronger chat override is explained. Try explicit inheritance and verify model choice stays the same.
- Adjust preset A, select B and adjust it, then return to A. Both should remember their settings after reload. Expand Generation parameters and More generation parameters for native settings; Reset to Global identifies the target and keeps other remembered presets.
- Toggle an entry, then edit its name/text/role. Try placement/depth/order and generation triggers. Main/Post-history prompts expose character-override protection; built-in entries explain their native source. Cancel should discard the draft; Save should persist it without changing the original native preset file.
- While a reply streams, change presets/parameters and browse another chat. Changes should show Pending, then apply after Stop/completion. The running reply must keep its captured settings and target; nothing should be resent.
- Read an existing chat: check the static background, nearly full-width text, character header and chat-name subtitle. A character with only one chat should have no subtitle.
- Tap gear and try Preset, Persona and Memory. Hold an icon for its explanation. Check menus near both ends of the screen and use Android Back/outside taps to dismiss them.
- Open the model panel, expand it and scroll its list. Scope/target/effective information should stay visible. Selection saves immediately. Model scope and preset scope are independent. Existing choices are retained, including unavailable saved models; no automatic substitute is made.
- Send immediately after opening a chat. Stop a reply while text arrives. While another reply runs, browse another chat, type an unsent draft and choose a model at Chat/Character/Global scope. Pending changes should apply after settlement; the generating target and request must stay unchanged.
- Saved-alternative arrows loop without a new request. A deliberate leftward swipe beyond the final saved alternative generates another. The final eligible message's ellipsis also offers Another reply. Native text selection should work without opening a menu.
- Try inline Edit/Save/Cancel, Copy, targeted Delete/Undo, Select messages/multi-delete/Undo and Fork. Fork must keep the original conversation. Generation duration should appear only where ST saved real timestamps.
- Editing summarized history should retain written Memory, show that rebuilding is needed and prevent stale injection. Undo restores matching history and Memory. Full Memory redesign/rebuild tools remain later work.
- Check the actual Android keyboard, text selection handles, clipboard, Back, edge gestures and scrolling. Rotate or resize where supported. Stop/restart the launcher during a reply, then Reconnect and Review saved work. Nothing should be resent automatically; inspect saved history before sending again.

Desktop browser checks cover reduced viewports and touch input, but cannot establish Android keyboard/inset, gesture, clipboard or background-lifetime guarantees. Clearing browser storage loses local drafts/pending work/Undo. World Info editing still links to native ST; saving library/persona changes requires an idle engine. General extension UI, groups, archives, profiles, full Memory functionality and proxy control in the UI remain intended later work. The optional proxy continues to run through the launcher.

Phone testing is deferred at the user’s request. Keep the outstanding checks in the project’s PHONE_TEST_CHECKLIST.md. The latest two-line persona-link draft remains awaiting approval.

## Isolated mock installation

Use a different fresh folder so mock testing cannot touch real-provider data:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.7.7
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

### Character conversation selector — 0.7.6

Open Character from your chat. With more than one saved chat, the current-chat line above the portrait opens a bottom sheet. Selecting a chat preserves your Character draft and leaves a running reply in its original chat. Existing Conversations controls now live in Character overflow. The approved new-before-optional-delete workflow follows in the next subphase. Follow the bundled phone checklist; this release has automated and direct browser checks, but its full Playwright regression runs and real-phone checks remain pending.

## Start new chat — 0.7.7

From the current chat’s Character overflow, choose Start new chat. The confirmation names the saved character and source conversation. Delete current is off by default. Start creates the native greeting and alternatives without an AI request; the new chat inherits current global/character settings and starts with fresh Memory. Selecting deletion verifies the new greeting first, then removes only the captured source. Use Undo promptly to restore the source and its Memory while keeping the new chat. If saving or deletion is uncertain, review saved work; do not repeat the operation. After a restart, review can inspect the replacement or restore the deleted source. Saved-card actions require a complete saved card, no unsaved draft and an idle engine.
