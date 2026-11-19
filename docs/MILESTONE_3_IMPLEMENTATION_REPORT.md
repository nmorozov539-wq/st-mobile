# Milestone 3 implementation report — Layout v4

Status: browser/Termux release candidate, 19 November 2026. Source baseline: `dev`, `8fa0ea0` (one commit ahead of `origin/dev`). Candidate build: `0.9.0`.

## Result

The bounded browser/Termux Milestone 3 implementation is a release candidate. Pocket Tavern now has the Layout v4 shell, operational Home, unified Library, topic-based Settings, stable character reading/editing, explicit chat tools, Reading and Messenger formats, four complete themes, transactional theme management, native SillyTavern configuration ownership, and a versioned bridge contract.

The three high-risk engineering gates passed with one deliberate product deviation: original SillyTavern Connection and Preset controls are hosted through a controlled full-native fallback in the existing engine iframe, rather than pretending their dependent drawers and portal popups can be safely isolated. The fallback preserves native handlers and persistence, contains the full viewport while active, blocks conflicting mutations and global shortcuts, and restores Pocket state and focus on verified close.

This is not an APK or general extension-host release. A real-phone browser and packaged WebView/IME/Back pass remains required before Milestone 4 can claim Android host readiness.

## Baseline and worktree

- Baseline tests at `8fa0ea0`: 284/285 passed. The existing failure was `repair reports a stalled update instead of exiting quietly as success`, where the subprocess returned empty stderr.
- Final tests: 317/318 passed. The same baseline phone-repair stderr assertion is the only failure; all new Milestone 3 suites pass.
- `git diff --check` passes.
- Pre-existing edits to `ANDROID_PRODUCT_ROADMAP.md`, `docs/README.md`, and the untracked implementation plan were retained and advanced rather than reverted.
- No commit, merge, publish, deployment or live personal SillyTavern data mutation was performed.

## Product structure and responsive layout

The default top-level order is WI, Chats, Home, Library, Extensions. Home remains central in the default five-item layout. Supported layout preferences are stored in a validated versioned record: destination order, WI folded/unfolded placement and message format. Invalid or duplicate destinations are repaired deterministically without losing the stored WI rank.

Home is operational rather than a character gallery: it shows native Connection and Preset state, Continue or first-story guidance, recent chats and a clear new-chat action. Extensions is an honest unavailable-yet destination and makes no compatibility claim. Settings is a focused index with Connection, Presets & generation, Appearance, Layout & reading and About topics.

Library always enters Characters on a fresh visit and keeps Characters and Personas together. On wide screens, a card click selects and reads that exact native character/persona into the adjacent detail pane; editing remains an explicit action. Character detail and whole-card editing share one guarded lifecycle: Save verifies native persistence, Cancel writes nothing, uncertain saves retain the draft, and dirty Back asks before abandoning changes. Conversation management remains reachable without the duplicate “Other chats” route.

Wide Chats is selection-bound and reuses the one chat screen/controller rather than rendering a second transcript. Selecting a row reads the saved target and scopes without activating SillyTavern, then mounts the existing virtualized message history, thinking/details, editing/actions, alternatives, streaming, Stop and composer controls beside the list. Send retains the existing guarded `workspace.activate` path. Per-target drafts and scroll positions survive list selection and wide-to-compact-to-wide resize; histories longer than 40 messages remain reachable. Wide Settings keeps a category column beside the selected topic. These three split layouts collapse on resize below 900 CSS px and when the root UI font reaches 24 px; the evidence journey applies an actual 32 px root font at 1024 px to test 200% UI text scaling.

Reading remains the default message format. Messenger changes presentation only; it shares message DOM, streaming, selection, editing, alternatives and persistence with Reading. Theme selection is independent from message format.

Responsive evidence covers 320×700, 390×844 phone layouts, 800 px collapse, and 1024×768 wide layouts. The shell uses content-width breakpoints at 600 and 900 CSS px, 44 px minimum controls, single-pane compact screens, wide master/detail compositions, and an explicit large-UI-text collapse guard.

Representative captures:

- [Phone Home, Hearth, Reading](milestone-3-evidence/m3-home-390x844-hearth-reading.png)
- [Wide Home, Hearth, Reading](milestone-3-evidence/m3-home-1024x768-hearth-reading.png)
- [Phone Library](milestone-3-evidence/m3-library-390x844-hearth.png)
- [320 px Library with large text](milestone-3-evidence/m3-library-320x700-large-text.png)
- [Wide Library](milestone-3-evidence/m3-library-1024x768-hearth.png)
- [Selection-bound wide Chats](milestone-3-evidence/m3-chats-1024-selection-detail.png)
- [Selection-bound wide Library detail](milestone-3-evidence/m3-library-1024-selection-detail.png)
- [Wide Settings category and topic](milestone-3-evidence/m3-settings-1024-category-topic.png)
- [Settings collapsed at actual 200% UI text](milestone-3-evidence/m3-settings-1024-200pct-collapse.png)
- [Settings index](milestone-3-evidence/m3-settings-index-390x844-hearth.png)
- [Extensions boundary](milestone-3-evidence/m3-extensions-390x844-hearth.png)

## Bridge upgrade

The Pocket–SillyTavern bridge now uses protocol version 2 with matched frontend/bridge build `0.9.0`. Handshake discovery is read-only and reports native-host, configuration-projection and migration capabilities. Malformed and unknown operations fail promptly, and incompatible build/protocol pairs block mutating controls before use.

Configuration projection reports the active API family, source, model, native preset, persona, lorebooks, thinking/tool state, endpoint and only the actions appropriate to that backend. Direct SillyTavern 1.19 character-card responses are accepted in both workspace and asset reads; this corrected fresh-chat and character-read behavior without weakening saved-state verification.

## Gate A — native settings host

Verdict: passed using the explicit `full-native-fallback` mode in the existing iframe.

- Uses the original Connection and Preset roots, handlers and persistence; no cloned controls or second engine.
- Temporarily owns the full native viewport so unrelated SillyTavern navigation cannot escape the hosted session.
- Nested popup Back closes the child before the host; Select2 and real popup layers are handled, while undismissable layers fail rather than being hidden.
- Focus, original class/style state and Pocket framing are restored on close.
- Close waits for `saveSettings` and `/api/settings/get` verification. A second close is rejected, and reconnect joins in-flight teardown.
- Generation, workspace operations, adapter activity, pending recovery, migration, Memory and the complete native-host lifecycle share the engine lock. Saving remains locked.
- Hosted keyboard capture blocks native global shortcuts while preserving ordinary input/control defaults.

Evidence: [Gate A result](milestone-3-evidence/gate-a-native-host.json), [Connection host](milestone-3-evidence/m3-gate-a-native-connection.png), [nested native prompt](milestone-3-evidence/m3-gate-a-nested-prompt.png), [phone Connection](milestone-3-evidence/m3-native-connection-390x844.png), and [phone Presets](milestone-3-evidence/m3-native-presets-390x844.png).

The fallback is intentionally not described as polished general extension hosting. It is bounded to verified native configuration surfaces.

## Gate B — configuration preservation and cutover

Verdict: passed in a disposable pinned SillyTavern fixture.

The migration inventories global, every character, uncapped chat history, per-preset banks and pending configuration operations. Archives retain raw enabled/disabled records and unknown fields while redacting only exact credential fields; token budgets and unrelated fields containing “token” survive. Revisions are compact content digests and every export, verification, materialization and commit re-enumerates the live source, so additions, edits or deletions invalidate stale work.

Pending legacy configuration operations are durably changed to `interrupted` before the migration manifest advances and are never replayed with new semantics. Failed writes/readbacks are fail-closed: durable readback can reconcile a completed write, but uncertain persistence blocks further mutation until disk state can be inspected.

Native preset materialization is Chat Completion only. It is collision-safe, verifies native readback, records the exact source revision, detects later native-preset changes, and preserves model-selection metadata including the v3 `{enabled,value,copyValue}` form. Text Completion refuses false cross-family materialization. Cutover to native ownership happens only after preservation verification and an explicit initial choice; old namespaces and the downloadable archive remain available for recovery, but scoped copies are no longer silently reapplied.

Coverage includes 1,105 histories, failed history reads, future/unknown schemas, new installs, restart/resume, collisions, source changes, interrupted queues, failed writes/readbacks and altered native presets.

Evidence: [Gate B result](milestone-3-evidence/gate-b-migration.json), [before](milestone-3-evidence/m3-migration-before.png), [preserved](milestone-3-evidence/m3-migration-preserved.png), and [native cutover](milestone-3-evidence/m3-migration-native.png).

## Gate C — backend parity

Verdict: passed for the claimed Custom Chat Completion and Generic Text Completion paths.

| Behavior | Chat Completion | Text Completion |
| --- | --- | --- |
| Native Connection and Presets | Yes | Yes |
| Model refresh / test generation / prompt manager | Yes | Not claimed |
| Context / instruct / formatting controls | Not applicable | Yes |
| Streaming and verified save | Yes | Yes |
| Stop with saved partial result | Yes | Yes |
| Provider error without replay | Yes | Yes |
| Saved alternatives | Yes | Yes |
| Cold reconnect restores family | Yes | Yes |

The mock backend records distinct `/v1/chat/completions` and `/v1/completions` families. The live journey exercised stream/save, Stop, alternatives, explicit failure and cold reconnect for both families. Pocket does not claim provider-specific model discovery outside the tested Custom/Generic paths, tool calling through Pocket chat, or cross-family conversion of legacy Chat Completion presets.

Evidence: [Gate C result and support matrix](milestone-3-evidence/gate-c-backends.json), [CC chat](milestone-3-evidence/m3-gate-c-cc-chat.png), [CC presets](milestone-3-evidence/m3-gate-c-cc-presets.png), [TC chat](milestone-3-evidence/m3-gate-c-tc-chat.png), and [TC presets](milestone-3-evidence/m3-gate-c-tc-presets.png).

## Appearance and reading

Hearth, Light Paper, Nocturne Portrait and Monolith are complete built-in themes that vary color, material, geometry, effects and typography. Preview is transactional and remains active while inspecting another top-level destination. Cancel/Back restores the committed theme without writing; Apply persists the built-in ID rather than creating a personal duplicate.

Customize creates a personal theme. Export/import round-trips it, collision-safe imports receive a new identity, invalid input leaves the committed selection untouched, default restore keeps personal themes, and SillyTavern theme import maps safe colors while warning about fallbacks and ignoring CSS. Corrupt storage falls back to Hearth and exposes a small recovery-only control; healthy screens do not show it.

Evidence: [appearance checks](milestone-3-evidence/gate-d-appearance.json), [Hearth](milestone-3-evidence/m3-theme-hearth-home.png), [Nocturne cross-screen preview](milestone-3-evidence/m3-theme-nocturne-library.png), [Paper after Apply/reload](milestone-3-evidence/m3-theme-paper-home.png), [Monolith geometry preview](milestone-3-evidence/m3-theme-monolith-appearance.png), and [personal-theme export](milestone-3-evidence/m3-personal-theme-export.json).

## Gate E — layout and interaction matrix

Verdict: passed in a disposable source fixture.

The live journey covers clean, streaming and failure states in both Reading and Messenger at 390×844. Backend JSON errors are reduced to bounded human-readable composer messages, status text no longer duplicates raw payloads, and the recovery-only Safe theme control is absent from healthy screens. Wide Chats proves that the shared controller keeps more than 40 messages reachable and retains actions, alternatives, streaming, Stop, per-target drafts and scroll positions while row selection remains read-only. It also exercises selection-bound wide Library, wide Settings, 800 px resize collapse, actual 200% root UI text collapse, long character read/edit surfaces and World Info collection/entry editing.

Evidence: [Gate E result](milestone-3-evidence/gate-e-layout-matrix.json), [Reading error](milestone-3-evidence/m3-chat-reading-error.png), [Messenger streaming](milestone-3-evidence/m3-chat-messenger-streaming.png), [long character read](milestone-3-evidence/m3-character-long-read-1024.png), [long character edit](milestone-3-evidence/m3-character-long-edit-1024.png), [WI collection](milestone-3-evidence/m3-wi-library-1024.png), and [WI entry](milestone-3-evidence/m3-wi-entry-1024.png).

## Gate F — packaged asset round-trip

Verdict: passed on a disposable local install made from the final ZIP.

The package was extracted and installed through its bundled `prepare.cjs --mock`, then started through the installed `start.cjs --mock`. The installed extension manifest and frontend report `0.9.0`; handshake reports bridge `0.9.0`, protocol 2, native-host/configuration-projection/migration capabilities. A packaged mock conversation was saved and found after reload, and Light Paper plus Messenger preferences survived reload. The disposable install was removed after evidence was written.

Evidence: [Gate F result](milestone-3-evidence/gate-f-packaged-roundtrip.json) and [packaged saved chat](milestone-3-evidence/m3-packaged-roundtrip-chat.png).

## Validation and package

Commands and results:

- `node tests/run.js` — 317 passed, 1 pre-existing failure, 0 skipped.
- Focused browser journeys — Gates A–F completed with empty browser/evidence error arrays.
- `git diff --check` — passed.
- `python3 scripts/build-phone-package.py` — produced `dist/pocket-tavern-combined-v0.9.0.zip`.
- `unzip -t dist/pocket-tavern-combined-v0.9.0.zip` — all members passed integrity checks.
- Package SHA-256: `ee87979a23c2279282f0a7770154291ad07d37e4983471d7251cd06265bfae57`.
- Packaged extension manifest and frontend build both report `0.9.0`; packaged frontend requires bridge protocol 2.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-package-live.cjs` — packaged install, launch, conversation, reload, preference and handshake round-trip passed.

All live journeys used disposable fixtures and the local deterministic mock model. Reproduction scripts and exact commands are listed in [the evidence README](milestone-3-evidence/README.md). The package was installed locally from its ZIP but was not installed on a real phone in this pass.

## Boundaries and remaining qualification

Deliberately deferred:

- general third-party extension hosting, catalog or compatibility claims;
- WIhero installation/replacement and a new WI workspace;
- moving Summaryception into an Extensions hub or changing its data/lifecycle safeguards;
- APK/Kotlin lifecycle, security, branding and new gesture work;
- provider-specific backends beyond the tested Custom CC and Generic TC paths.

Outstanding release qualification: run a focused real-phone browser and packaged WebView pass for IME resizing, hardware/system Back, focus return, file pickers, viewport/safe-area behavior and nested native dialogs. Until that happens this report remains a browser/Termux release candidate, not a claim of phone or APK readiness.
