# Pocket Tavern 0.6.1: implemented proof-of-concept interface

Pocket Tavern’s product goal is an Android app. This document describes the current browser/Termux proof of concept and its storage/operation boundaries, not a decision to ship the final product as a browser page. Android packaging, framework and lifecycle integration remain undecided future work.

## Data ownership

SillyTavern still owns characters, chat JSONL, persona settings, presets, provider secrets, generation and Summaryception. Pocket uses native HTTP routes and native generation, not another chat engine.

Namespaced version-1 settings live in standard ST data:

- Global baseline: `settings.json → extension_settings.pocket_tavern.global`.
- Character copy: character card `data.extensions.pocket_tavern.settings`.
- Chat copy: JSONL header `chat_metadata.pocket_tavern.settings`.
- Each copy contains a preset name, independent generation fields and a separately chosen model. Connection source, endpoints, credentials and provider routing are excluded. ST's connection binding for preset selection is disabled.
- Chat > Character > Global. Turning a copy off retains it; first activation copies the effective configuration. Reset replaces the active independent copy with Global and keeps it enabled. Choosing Global explicitly disables both overrides for this character/chat.

These fields travel with ordinary ST backups and imported cards/chats. ST 1.19.0 preserves unknown extension fields; future ST compatibility requires testing rather than a guarantee. Named native preset files remain intact: the shared Pocket editor edits the active *configuration copy*, not the original preset file. Native preset file create/import/edit remains available in the library editor. Reselecting a named preset loads its saved file into the configuration copy.

Drafts and committed pending changes use browser localStorage. Drafts are buffered for approximately one second and flushed on navigation/hiding. Pending edits/settings are written before reporting Pending. They are separate from engine-owned data and do not contain provider keys. Browser storage clearing removes drafts/pending work. A sudden kill within the draft debounce can lose the final second of typing.

## Navigation and controls

Home, Chats, Characters, Personas and WI provide the agreed navigation. Home re-tap continues the last visited chat. Chats sort through ST's recent-chat endpoint; row swiping exposes Delete and the visible ellipsis offers the same action. A 12-second Undo restores deletion, including metadata. Characters, Personas and WI are interim layouts, with existing editors and a native ST World Info editor link.

Inside chat: Back returns to the entry page; character name/avatar opens fields; chat settings links to the shared preset editor, persona, Memory, connection and history. Model selection has no Save button. Composer shows model/persona/preset/scope and one Send/Stop icon. Message ellipsis exposes edit/copy/delete/multi-select/fork. Alternative arrows loop existing alternatives; New reply is an explicit paid generation. Horizontal message swipe/long press are shortcuts and avoid edges, links, controls, text selection and code/table content.

Messages use restrained user tint. Sanitized HTML, font colours, details and thinking remain supported. Nearby messages and large library lists use bounded rendering; older content remains scrollable. Streaming updates are batched through requestAnimationFrame without fade-in effects. Reading position and expanded blocks are kept during a session. New thinking inherits the previous assistant reply's expanded choice.

## Engine ownership and pending work

Reading/browsing another saved chat does not activate it in ST. The displayed chat, draft and active generation target are separate. Only one generation runs at a time, and drafts are never auto-sent. Settings/committed edits can wait while generation, saving or Summaryception owns the engine. The queue applies serially after that work finishes; repeated setting edits coalesce, preserving the original conflict guard. Apply and pending states are shown.

A full saved-history revision guards destructive work. Earlier-message edits can accept a strictly unchanged prefix followed by newly generated messages, preserving the new reply. Changed history produces a conflict instead of overwriting it. Queued edits to the same message coalesce; separate edits can be rebased only against our own verified prior edit. Deletions that move another pending edit's target intentionally require review.

After an app/engine restart, pending operations require review/resume. A known same-session generation can be observed; an unknown send is never resent. Already saved results can be inspected and pending records discarded. This first recovery UI is deliberately manual rather than claiming fully automatic conflict reconciliation. Failed generation shows a persistent composer error. Engine health is checked independently of the iframe.

Deletion Undo is a short-lived browser recovery snapshot, separate from the engine file; it is also retained across reload until expiry. Forks copy the retained messages, native metadata and independent settings with a fresh chat integrity identity. The source narrative is untouched.

## Memory validity

Memory controls expose global enable/pause and frequency in assistant turns, plus read-only saved layers from the *displayed* chat. Existing backlog choices and Stop remain functional. Full Summaryception menus, memory editing and paid rebuild tools are deferred.

If a change affects summarized history or an early fork truncates it, keep the written memory, mark the chat `pocket_tavern.memoryInvalid`, stop injection and automatic summary work, and show “Memory needs rebuilding after history changes.” Retained messages ghosted by Summaryception are restored; unrelated user-hidden messages retain their flags. Undo restores both the messages and original Memory metadata. Forks after the summarized range reuse unchanged memory without another API request.

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
