# Pocket Tavern 0.7.2: approved chat and preset phases

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

Home, Chats, Characters, Personas and WI provide the agreed navigation. Home re-tap continues the last visited chat. Chats sort through ST's recent-chat endpoint; row swiping exposes Delete and the visible ellipsis offers the same action. A 12-second Undo restores deletion, including metadata. Characters, Personas and WI are interim layouts, with existing editors and a native ST World Info editor link.

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
