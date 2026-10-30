# Pocket Tavern 0.7.8: current implementation

Pocket Tavern’s product goal is an Android app. This document describes the current browser/Termux proof of concept and its storage/operation boundaries, not a decision to ship the final product as a browser page. Android packaging, framework and lifecycle integration remain undecided future work.

## Data ownership

SillyTavern still owns characters, chat JSONL, persona settings, presets, provider secrets, generation and Summaryception. Pocket uses native HTTP routes and native generation, not another chat engine.

Namespaced version-3 settings live in standard ST data:

- Global baseline: `settings.json → extension_settings.pocket_tavern.global`.
- Character copy: character card `data.extensions.pocket_tavern.settings`.
- Chat copy: JSONL header `chat_metadata.pocket_tavern.settings`.
- Each copy retains its preset name, generation fields and unknown native fields. Independent `modelSelection: {enabled, value}` controls its model override. Legacy `copy.model` is preserved; Global uses `global.model`. Connection source, endpoints, credentials and routing are excluded. ST's connection binding for preset selection is disabled.
- Preset and model each use Chat > Character > Global independently. Turning a preset copy off retains it; first use copies the inherited configuration for that scope, excluding stronger overrides. Reset replaces its current preset/generation with Global and keeps it enabled, preserving model selection, opaque copy fields and other remembered presets. Preset tabs only browse; explicit Inherit disables only that scope’s preset override; model Inherit disables only the selected model override.
- Migration is additive: old enabled model copies retain their choice, old disabled copies retain their stored choice while inheriting. Reads normalize old records; writes save the extra field without dropping legacy/foreign fields. Version-1 pending settings guards normalize equivalently and still reject external changes. Future namespace versions are refused. Version 3 adds lazy per-named-preset memory: `presetBank: [{preset, generation}]` inside Global or the local `copy`. Each switch first remembers the existing selection and full generation snapshot; edits update its bank entry. No eager reset of v1/v2 global, character or chat records occurs. Legacy adjustment copies are retained before the first switch; disabled copies remain disabled until selected/edited. Array keys safely support arbitrary native names. Frontend and bridge independently serve identical pure transforms, with a parity check.

These fields travel with ordinary ST backups and imported cards/chats. ST 1.19.0 preserves unknown extension fields; future ST compatibility requires testing rather than a guarantee. Named native preset files remain intact: the shared Pocket editor edits the active *configuration copy*, not the original preset file. Native preset file create/import/edit remains available in the library editor. Selecting a remembered name restores its scoped snapshot; a new name seeds supported generation fields from the native file, with Global fields filling native omissions. Connection fields stay excluded. Original native files remain unchanged. `presetData` is read-only and provides the supported field schema from ST’s `settingsToUpdate`. Unknown stored fields survive. The queue captures preset identity for generation edits and does not coalesce across preset switches; projection uses the same transforms as dispatch. Guard rebasing remains limited to our verified preceding writes.

Drafts and committed pending changes use browser localStorage. Drafts are buffered for approximately one second and flushed on navigation/hiding. Pending edits/settings are written before reporting Pending. They are separate from engine-owned data and do not contain provider keys. Browser storage clearing removes drafts/pending work. A sudden kill within the draft debounce can lose the final second of typing.

## Navigation and controls

Home, Chats, Characters, Personas and WI provide the agreed navigation. Home re-tap continues the last visited chat. Chats use ST's recent-chat endpoint (most recent 1,000, with an explicit limit notice); left swipe reveals Delete and the corner ellipsis opens the same named deletion confirmation. A 12-second Undo restores deletion, including metadata. Characters use a bounded three-column grid with separate Import/Create and native incomplete-card warnings. Taps open Edit without selecting a character or creating a chat. Chats + opens the fresh-character picker. A saved complete Character editor has Start chat; dirty/incomplete/new cards cannot start. Persona and WI retain existing layouts and native editor access.

Inside chat: Back returns to the entry page; character name/avatar opens the existing fields. The icon-only gear fan links to the existing Preset, Persona and Memory destinations. Connection settings remain available on the existing entry screens. The current character fields retain a Conversations action for the existing chat-history/new-chat destination; its redesign belongs to the character phase. The subtitle is the chat name only for characters with multiple saved chats. The composer contains the model picker and Send/Stop. The model bottom panel has fixed scopes/target/effective information, an independently scrolling bounded list, immediate selection and unavailable saved choices. Expand/collapse, outside dismissal, Escape and browser Back are supported.

Message ellipsis opens a viewport-positioned icon fan for edit/copy/delete/multi-select/fork and Another reply where eligible. Editing is in place with Save/Cancel. Delete identifies the saved target before confirmation. Clipboard failure exposes selectable text. Saved-alternative arrows loop without generation; a deliberate touch overswipe beyond the latest eligible final saved alternative generates once. Native text selection does not open a menu. Icon controls have accessible names, focus outlines and hold explanations. There is no permanent New reply button. Actual saved generation timestamps produce the default duration detail; missing/invalid timestamps produce no fabricated detail. The full-page preset editor returns through picker/editor/main states before leaving; Back/Cancel discards only an uncommitted entry draft. Preset scope browsing makes no writes. Pending/errors stay visible; actual save completion governs status. Browser Back dismisses the current dialog before leaving chat; Android may consume Back to dismiss its keyboard first.

Messages use restrained user tint. Sanitized HTML, font colours, details and thinking remain supported. Nearby messages and large library lists use bounded rendering; older content remains scrollable. Streaming updates are batched through requestAnimationFrame without fade-in effects. Reading position and expanded blocks are kept during a session. New thinking inherits the previous assistant reply's expanded choice.

## Engine ownership and pending work

Reading/browsing another saved chat does not activate it in ST. The displayed chat, draft and active generation target are separate. Only one generation runs at a time, and drafts are never auto-sent. Settings/committed edits can wait while generation, saving or Summaryception owns the engine. The queue applies serially after that work finishes, reading each updated durable record before dispatch; repeated setting edits coalesce, preserving the original conflict guard. Apply and pending states are shown. Settings guards are rebased only for components changed by our own verified write. Before Send, the displayed target adopts ST's opened snapshot, including native initialization of swipe metadata, so queued earlier edits use the actual captured history.

A full saved-history revision guards destructive work. Earlier-message edits can accept a strictly unchanged prefix followed by newly generated messages, preserving the new reply. Changed history produces a conflict instead of overwriting it. Queued edits to the same message coalesce; separate edits can be rebased only against our own verified prior edit. Deletions that move another pending edit's target intentionally require review.

After an app/engine restart, pending operations require review/resume. A known same-session generation can be observed; an unknown send is never resent. Already saved results can be inspected and pending records discarded. This first recovery UI is deliberately manual rather than claiming fully automatic conflict reconciliation. Failed generation shows a persistent composer error. Engine health is checked independently of the iframe.

Deletion Undo is a short-lived browser recovery snapshot, separate from the engine file; it is also retained across reload until expiry. Forks copy the retained messages, native metadata and independent settings with a fresh chat integrity identity. The source narrative is untouched. Undo reloads restored saved messages into the native runtime before the next switch; otherwise a stale native copy could overwrite the restored file when opening a fork.

## Memory validity

Memory controls expose global enable/pause and frequency in assistant turns, plus read-only saved layers from the *displayed* chat. Existing backlog choices and Stop remain functional. Full Summaryception menus, memory editing and paid rebuild tools are deferred.

If a change affects summarized history or an early fork truncates it, keep the written memory, mark the chat `pocket_tavern.memoryInvalid`, stop injection and automatic summary work, and show “Memory needs rebuilding after history changes.” Chat also shows real Memory activity/backlog/failure and Stop/access when relevant. Retained messages ghosted by Summaryception are restored; unrelated user-hidden messages retain their flags. Undo restores both the messages and original Memory metadata. Forks after the summarized range reuse unchanged memory without another API request.

## Limits to test on Android

- This is a browser/Termux prototype, not an Android APK. Real WebView/background lifecycle work is deferred.
- No general third-party extension UI support, group chats, archive, profiles or memory rebuild editor.
- World Info editing still opens native ST. Characters/personas retain the existing editor rather than full native UX parity. Connection/persona/library mutations require an idle engine; the durable queue covers scoped generation settings and committed message/history work.
- Recent chats are currently capped at 1,000 native recent rows. Large-list heights are estimated; long messages are measured after rendering, so scroll positioning can settle as content is visited. Photos, extreme message lengths, keyboard resizing and Android gestures need real-phone comfort testing.
- The review screen never silently replays a paid request. Conflicted pending changes must be inspected/discarded and reapplied explicitly.
- Undo expires after 12 seconds. Clearing browser data removes its local recovery copy.
- When an old Summaryception ghost was manually hidden again without a separate user-hidden flag, its original visibility cannot be reconstructed perfectly. Explicit `is_hidden` is preserved.
- Model availability is provider-specific. An unavailable scoped model is reported and requires a new selection; no automatic substitute.
- Standard native behavior can recreate a greeting when a completely empty chat is opened. Deleting the conversation is the reliable way to remove an entire conversation.

No real provider keys, paid model calls or personal data were used for development checks.

Deferred Summaryception work keeps the engine occupied while it waits for the reply/save to finish. Its retry captures the originating chat; if full ST changes that target unexpectedly, the deferred operation is cancelled rather than summarized against the new chat. Stop cancels pending retries as well as active requests.


### Character content milestone 0.7.2

`character-editor.js`, `character-data.js` and `character.css` extend the existing native card authoring path. Unknown data and optimistic native revision guards stay intact. View mode uses a separate per-avatar local preference and never changes ST character settings. Greeting edits affect only the draft; Save uses the existing verified native write. Read/Edit and JSON changes retain draft content. Creator notes are sanitized into an inert template before opaque-origin sandbox rendering with a no-network CSP; raw notes remain unmodified. Read/draft controls remain usable while generation runs, but Save/import remain gated. Association/card/conversation integration remains the next subphase.


## Character card actions — 0.7.3

Approved inline overflow now exports native PNG/JSON, duplicates through ST’s helper and verifies the distinct saved copy, and deletes through a target-specific confirmation with explicit chat deletion (off by default). Native events remain owned by ST. Unknown card fields, portrait and embedded book are preserved through native copy/export; native export intentionally omits private favourite/current-chat fields. Unsaved drafts and stale revisions block actions. An unverified mutation is never retried automatically. Export is read-only during generation; duplication/deletion share its lock. Native welcome scaffolding can close before deletion, while actual unsaved temporary messages, edits or composer text block it visibly. Existing associations are untouched by this UI work; their explicit management and the conversation selector remain next. The two-line persona draft remains pending.

## Character association visibility — 0.7.4

This is the read-only foundation of the association subphase. Native card reads project character-keyed persona connections and filename-keyed `world_info.charLore` without selecting a target or saving settings. The approved single dim persona line remains beneath the portrait; tapping reveals every full name in a bottom sheet. Multiple associations, duplicate additional entries and unavailable saved names remain visible. Primary appears first; an embedded book without a primary is described separately. Malformed links show an error while card content remains available. Existing data/schema and generation ownership are unchanged.

Next: implement targeted persona Edit/Remove and lorebook Connect/Detach with independent card/shared-settings revision guards, verified persistence, native embedded-book removal parity, draft preservation and idle-engine gating. The redesigned conversation selector follows separately. The two-line persona draft remains unapproved. This milestone does not claim association editing is complete and has no placeholder mutation controls.

## Character association controls — 0.7.5

Implements the approved single-link persona sheet Edit/Remove actions and actual lorebook Connect/Unattach sheets. Related persona editing reuses the existing library editor and restores the Character draft/mode/greeting/portrait on Save or Cancel. Multiple native persona associations remain acknowledged and managed in ST; the unapproved two-line draft is unchanged.

The bridge checks card and live/persisted shared-settings revisions, uses the common engine mutation lock, saves through native endpoints/settings and verifies readback. Persona removal targets only the selected character connection. Additional books preserve other rows, duplicates and opaque row fields. Primary connection uses ST 1.19.0's World Info → character-book mapping (or intact native originalData); targeted atomic merge replaces old embedded data. Detachment uses ST's native unset sentinel and never promotes additional books. Unknown card fields and unrelated native associations remain. Failed/uncertain operations require reopening and saved-work review, never automatic replay. No settings migration; schema remains v3.

Next Character subphase: approved current-chat selector and create-new-before-optional-delete workflow. Full Persona, World Info, Memory and library redesigns remain separate roadmap phases.

## Character conversation selector — 0.7.6

The approved thin current-chat line appears above the portrait only for the current character with multiple saved chats. Its bottom sheet reads the character’s complete native history without activating ST, keeps the Character draft and reading state, selects immediately, and dismisses with Done, outside or Back. History reads have captured editor-session guards; stale replies cannot replace a newer pane. The independently scrolling list uses bounded rendering and retains keyboard focus through activity polling. Loading/errors remain visible with retry. Existing Conversations controls are now in Character overflow; their creation/deletion behavior is unchanged in this selector subphase.

No storage migration or generation request is introduced. Native settings schema remains v3. Next: approved Start new chat confirmation with deletion off by default, verified native greeting before optional guarded deletion, durable uncertainty review and Undo. Full Persona/World Info/Memory/libraries remain later phases; the two-line persona-link draft is still awaiting approval.


## Character new-chat workflow — 0.7.7

Start new chat is an explicit saved-card action available from the current Character overflow and existing Conversations destination. The confirmation captures the actual saved card and source chat, defaults deletion off and blocks incomplete cards, unsaved drafts, generation and unresolved work. ST creates its own greeting and saved alternatives without a model call; fresh chat settings inherit normally without copying the source’s Memory or scoped overrides. The replacement is independently verified before optional guarded source deletion. Undo retains the original source, valid Memory and opaque native fields, while retaining the replacement.

The full source snapshot enters the durable journal before mutation. Lost acknowledgements and failed verification require explicit saved-work review; new-chat operations never drain or replay automatically. Review offers inspection and, where requested, restoration of the deleted source. Existing queued deletion backups gain full headers with compatibility for older pending entries. Native Author’s Note initialization follows actual native defaults for missing fields; all other metadata, messages and header fields remain guarded. Unknown source header fields survive ST’s native header reconstruction. Pocket Summaryception ignores native first-message events, including legacy zero-turn configurations, while ordinary generated-message summarization remains available.

Conversation selection captures immutable editor ownership so closing or replacing the selector during a read cannot navigate or dismiss a newer pane. Character management without a selected chat safely hides the line; delayed related-persona saves refresh availability without replacing the resumed draft. No schema migration or Android framework work is included. Full library, Persona, World Info and Memory designs remain separate phases. The two-line persona draft is still pending approval. Device verification remains in PHONE_TEST_CHECKLIST.md; current desktop/mock evidence is in tests/TEST_REPORT.md.

## Characters and Chats libraries — 0.7.8

Approved three-column character grid and recent-chat rows are implemented, with separate Import/Create, accessible incomplete-card warnings, actual timestamps and a dedicated fresh-character picker. A library tap opens Edit without activating native ST or creating any chat. Import retains supported native formats and unknown fields. A valid name permits saving an incomplete card; Start chat requires the saved name, description and main greeting. Existing rows resume exact saved chats; deletion names its target and retains full Undo.

Source-free creation assigns the requested filename before native character selection/reload, avoiding an intermediate default chat. Native welcome scaffolding is allowed; temporary messages, drafts, native editors, groups and unsaved live conversation differences block switching. Saved previous messages/header fields are not rewritten. Native greeting alternatives, inherited independent settings and fresh Memory remain ST-owned. Read-only preparation reserves the action against duplicate clicks and honors Back before mutation. Interrupted writes retain their exact operation identity for explicit saved-work review; nothing automatically retries or requests AI. Settings schema remains v3; no data migration.

Lists remain bounded and load shallow-card details only for rendered rows. Recent chat history is capped at 1,000 with a visible notice; the existing Character selector supplies complete per-character history. Library drafting during generation does not switch the captured target; native mutations wait for settlement. Full Persona, World Info, Memory, Home/Settings and Android packaging are separate future phases. The two-line persona draft is still unapproved.

## Memory — 0.7.9

Memory is now a full page (gear → Memory, or Memory in the in-chat status bar) matching the approved Memory mockups: status, Enable/Pause, Summarize now, and collapsible Saved memories, Injection preview, Turns & layers, Summarizer prompts, Summarizer connection, Layer statistics and Maintenance, with a sticky Save settings. Configuration is global; saved memories belong to the open conversation.

Every write goes through verified Summaryception extension actions, never the page: `settings` (diff-only, whitelisted keys, JSON readback), `snippet` (edit/regenerate/delete, guarded by the expected current text), `clear`, `import`, `export`, `repair` and `reset`. Mutations require the extension to be idle, save the chat and run Pocket's memory-persistence verification. Clear also lifts the post-history-edit rebuild block, so Clear then Summarize now is the rebuild path. Import validates shape, sizes and that the file fits the open chat, and is refused while a rebuild is pending. Regeneration is Layer 0 only, confirms the possible cost first, and can be stopped; failure or Stop keeps the original text.

The in-chat bar shows Summarizing/Waiting with Stop, the inline catch-up choice card, “Summarization stopped · Progress saved” and “Memory saved · Summarization complete”. Cancel in a catch-up card stops the pending operation. Background polling never redraws while a field has focus.

Not implemented, by design: a separate summarizer endpoint/API key/model and Test connection. Pocket summarizes only through the main ST connection (the existing proxy rule) and never stores another provider's key; a non-default source can be switched back to Default from the page. Native import/cancellation/skip semantics are unchanged. Settings schema remains v3; no data migration. The vendored extension needs a restart of the engine to expose the new actions; an older extension degrades to read-only sections with an explanatory note.


## World Info — 0.7.10

World Info is a three-screen feature (library, entry editor, Activation) over a `worldinfo` bridge method. Reads (`list`, `activation`, `book`, `entry`, `export`) work while the engine is busy; writes take the same exclusive lock as other bridge writes and fail with BUSY during generation or Memory work.

Rules live in `extension/worldinfo-data.js` (pure, unit-tested): book-name and folder validation, per-field entry validation, a book revision fingerprint, activation ranges, and the Min Activations / Max Recursion Steps exclusion. `worldinfo.js` performs the ST calls (`saveWorldInfo`, `createWorldInfoEntry`, `duplicateWorldInfoEntry`, `deleteWorldInfoEntry`, `deleteWorldInfo`, `updateWorldInfoSettings`) and verifies by reading back, because ST's own save ignores HTTP failures.

Entry saves send only changed fields. Unknown native fields, `uid`, `displayIndex` and `characterFilter.tags` are preserved; `originalData` (the character-book mirror) is kept in sync. The editor never writes an entry without the revision it was opened from; a stale revision returns STALE_BOOK instead of overwriting.

Renaming saves the new book, deletes the old one, then moves the global selection, additional-character, chat and persona links. Character primary links are updated only after explicit confirmation. Deleting a folder keeps its books. Empty folders are remembered in browser storage (`pocket-tavern.wi-folders.v1`); non-empty ones exist only as book metadata.


## Settings — 0.7.11

Settings is a page (`settings-page.js`) rather than the old dialog; the gear on Home and the model picker's connection link open it, and Back returns to where it was opened from. The legacy dialog markup remains for tests and unused controls.

**Connection** reuses the verified `configure` bridge actions (`endpoint`, `model`, `providerKey`, `connect`, `test`, `source`). Nothing is saved until Connect or Test message; the API key field is cleared as soon as it is sent and a blank field keeps the saved key. Use proxy toggles the draft endpoint between `http://127.0.0.1:8001/api/v1` and the last direct endpoint (remembered locally, default OpenRouter). The status line comes from a short no-CORS probe of the proxy port, so it can say "Proxy not detected" instead of pretending. Test message is the only control that sends a generation request and names the model it uses.

**Appearance & reading** (`appearance.js`) stores text size 13–24 px, line spacing, background and four message-detail switches in browser storage (`pocket-tavern.appearance.v1`) and applies them as CSS variables. Generation time is the only detail on by default. Clock, model icon and token count appear only when the saved message actually has a `send_date`, `extra.model` or `extra.token_count`; nothing is fabricated.


## Home — 0.7.12

`home.js` renders the page and owns the pure status rules (`homeStatus`, `countText`), so they are unit-tested. Engine: Connecting / Connected / Working / Not connected from the bridge state. API: from ST's own `onlineStatus`; Pocket never probes the provider for this, and `no_connection` reads as Not checked until a Connect or Test message in Settings has actually finished. Counts come from the already loaded character, recent-chat and persona lists (chats cap at 1,000 and show `1,000+`). Home re-renders only when one of those values changes (`homeSync`), so it stays current as the engine connects without redrawing on every control update.


## Review pass — 0.7.13

Two rules came out of re-reading the new pages. A control that is being dragged or typed into must never be re-created underneath the person: sliders now re-render on `change` (pointer up), not on `input`, and the Settings endpoint updates its own label instead of redrawing the form. And a page must survive a background re-render: `refresh()` skips `renderPage()` while the focus is inside a field in `#page-content`, so a draining queued change cannot wipe unsaved typing.

A third rule came from an intermittent test failure: every page renders into the same `#page-content` element, so each panel is given a `visible()`/`onPage()` predicate and refuses to paint unless its own page is current. Without it, an in-flight reload could overwrite a page the person had already navigated to.

Settings also loads defensively: a failed `settings` read leaves the page open with the error and a Try again button, because the Appearance tab is device-local and must stay usable while the engine is down.


## Phone-test fixes — 0.7.14

- Portrait lock: `manifest.webmanifest` (standalone, `orientation: portrait`, 192/512 icons) makes the app installable; `app.js` also calls `screen.orientation.lock('portrait')`, which browsers honour only for the installed app or fullscreen.

Back is driven by real history entries. Chrome skips entries that a page pushed without a user gesture, so `chat-controls.js` pushes one on each forward `navigate()` and each `showModal()`, both of which follow a tap. A Back that stays inside the app pays its entry back on the next tap. Back runs the same handler as the on-screen arrow (`#page-back`), so unsaved-change prompts apply to both. Extra entries are harmless: at Home an unhandled Back keeps stepping back until the browser leaves.

Panels must also reset what they leave behind. `renderPage()` clears `#page-content`'s class, and the Memory panel checks `visible()` as the other panels do. Memory writes first activate the chat on screen, the way Send does, because Summaryception only sees the engine's active chat.

The engine frame is treated as disposable. Android freezes a backgrounded tab, so on return (or every 3 s while disconnected) `autoReconnect()` reloads the frame once the local server answers, at most every 15 s and never in the first 45 s after a load. Before a send, `ensureApiConnection()` repeats Settings → Connect if ST's `onlineStatus` dropped. Nothing has been sent at that point, so a failure keeps the draft.


## Phone-test fixes — 0.7.15

Back now uses the CloseWatcher API instead of history entries. Chrome's history intervention could mark the pushed entries skippable, so one Back jumped past several pages and closed the app. `chat-controls.js` keeps one close watcher alive whenever the app is away from Home or a dialog is open; its `close` runs the same step as the on-screen arrow. A modal dialog's own close request may be grouped with that watcher, so a watcher close that coincides with a dialog closing only re-arms it. `reloadEngineFrame()` replaces the iframe element instead of navigating it, so a reconnect adds no history entry.

The engine frame is marked by `name="pocket-engine"`, not a `?mobileRuntime` query string. With any query string, ST's `<base href="/">` makes jQuery UI treat the Backgrounds tab anchors as remote and load the whole ST page into a tab panel, duplicating `#form_create`; every character save then posted the advanced fields twice and ST stored them as two-item lists, which later made `Generate` throw before sending. `card-repair.js` runs once on `APP_READY` (flag `extension_settings.pocket_tavern_repairs.doubledCardFields`), puts the first (live form) value back through `/api/characters/merge-attributes`, and verifies each card. The frame is also `inert`, and a blur guard returns focus to Pocket: with focus inside the engine, Escape and Android Back reached ST instead of Pocket's close watcher.

Token counts for replies without a saved count are batched through the bridge's `tokens` method (ST's `getTokenCountAsync`, at most 100 texts per call). Preset import validates the file, saves it without applying it (the active preset is re-applied afterwards), and numbers a name clash. Several personas per character follow ST's `persona_descriptions[].connections`; a new chat with two or more available linked personas asks once which one to lock to the chat. DeepSeek uses ST's native `deepseek` chat-completion source and `api_key_deepseek` secret; the global model follows the source after each model or source change.
