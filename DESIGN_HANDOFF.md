# Pocket Tavern design handoff

Updated 9 October 2026. Project: `/home/Riv/Projects/st-mobile`. Current build: 0.7.9 Memory; 0.7.8 Characters and Chats libraries; 0.7.0 chat is user-confirmed working on Android.

## Start here

1. `README.md` — current product, release and development entry points.
2. `GoalVisuals/IMPLEMENTATION_GUIDE.md` — screen map, approval status and integration boundaries.
3. `GoalVisuals/README.md` — current approved visual and behavioral decisions.
4. `GoalVisuals/interactive-design-reference.html` — all 24 interactive previews in one offline file; current designs first, older experiments separate.
5. `prototype/IMPLEMENTATION.md` — implemented storage, operations and deliberate limits, not a specification of the new design.
6. `tests/TEST_REPORT.md` — current validation evidence and device limitations.

`GoalVisuals/CODING_PROMPT.md` contains the suggested first implementation-session prompt. The initial coding request authorized chat; after phone confirmation, the user authorized continuing the roadmap with Preset. Evaluation and the complete reference review preceded implementation. See `IMPLEMENTATION_REVIEW.md` for the evidence and phased roadmap. The latest two-line character persona-link draft awaits explicit approval. Other approved screens are future design targets; no broad rewrite is authorized by this handoff alone.

## Product and architecture

The product goal is an Android app for SillyTavern 1.19.0 running locally through Termux. The current browser build is a proof of concept for the app UI, ST integration and safeguards. Browser delivery is the current testing mechanism, not the final product direction. An APK, app framework and lifecycle integration are not implemented or selected yet.

Design for Android app use: touch targets, keyboard behavior, system Back, icon explanations and continuity through interruptions. Preserve the agreed visuals and behavior when packaging changes. Browser-specific constraints are prototype limitations to evaluate, not permanent product requirements. This does not authorize APK development or selecting a new framework in the chat-refinement phase.

The proof of concept currently uses a hidden native ST iframe/bridge; ST owns normal data, provider secrets, generation, characters, personas, presets and Summaryception. Preserve this ownership. The hidden iframe is the current implementation mechanism, not an already-decided final Android architecture.

- Frontend: `prototype/frontend`, plain JavaScript modules and CSS.
- Native bridge: `prototype/extension`.
- Phone tools: `phone-package`; package builder: `scripts/build-phone-package.py`.
- Adapted Summaryception: `vendor/Extension-Summaryception`, with its license and coordination safeguards.
- Isolated native/mock fixture was `/tmp/pocket-combined-engine`, ports 8123/8124; check availability rather than assuming it survived.
- Original `/home/Riv/SillyTavern` installation and personal data must remain untouched. No real provider keys or paid calls are required for development.

## Current design direction

Quiet nearly full-width reading; dark charcoal and broad soft static blue-violet gradient. Simple composer with model picker and Send/Stop. Header subtitle is the chat name only when the character has multiple chats. Name/avatar opens character content; gear opens the curved Preset/Persona/Memory fan. Message corner ellipsis opens the tighter curved action fan; preserve native text selection.

Normal swiping past the final saved alternative deliberately generates another reply. Remove the permanent New reply control but retain an accessible deliberate generation action. The expandable model panel selects immediately, keeps effective model/scope information above its scrolling list, and separates model scope from preset scope.

Five tabs remain WI, Characters, Home in the center, Chats, Personas; hidden inside chat. App Settings belongs on Home only. Current previews describe separate screens and sample states, not a fully wired app or complete native-field schemas. See the design index for exact behavior, approvals and deferred features.

## Safeguards that survive visual refinement

- One generation remains bound to its original target while the user browses/drafts elsewhere. Drafts never auto-send; state changes must not mutate a captured request.
- Preserve durable pending changes, visible saving/error/pending/recovery states and explicit restart review. Never automatically replay generation or rebuild Memory with paid calls.
- Persist and verify history mutations; preserve conflict protection, deletion Undo, original-preserving forks and Memory invalidation/restoration together with history.
- Retain no-op Memory ownership fixes, Stop settlement, in-place saved-alternative synchronization and initiating-iframe reconnect health checks. Test real click flows without artificial idle waits that hide races.
- Keep sanitized HTML/font colours/details and collapsed Thinking with inherited expansion behavior. Preserve reading position, streaming batching and bounded long-message/list rendering.
- Version-3 settings retain independent model/preset scope and remember per-named-preset adjustments. Migration is additive and tested; preserve unknown native fields and existing settings.

## Validation and delivery

Recorded baseline: 94 automated tests; 28 native ST/mock assertions for the 0.6.1 repairs; 0.6.2 adds interaction-boundary coverage. These are prior results, not evidence that future edits pass. Run checks appropriate to actual changes and update `tests/TEST_REPORT.md`. Android gesture/keyboard/background comfort still requires device feedback.

For an authorized release, build a versioned ZIP and place it plus matching `repair-pocket.cjs` in the root. Keep frontend/bridge stamps and imports consistent. Phone update preserves ST data/settings and uses the documented repair flow. Current 0.7.8, phone-confirmed 0.7.0, previous 0.6.2 and working 0.6.1 ZIPs remain local, ignored generated artifacts.

## Archives

`history/` is a local ignored archive of older plans, investigations, reports, screenshots and the user's early `demo.zip`. Previously tracked material remains recoverable from Git history. User-provided proxy files in `or-proxy/` remain local and untracked; preserve them. Current approved references in `GoalVisuals/` are tracked, separate from historical inputs.


## Current rollout — Character content 0.7.2

Chat has been confirmed working on the phone. Preset was renamed 0.7.1; Character content is 0.7.2. The user cannot currently test and has authorized continued development and commits at verified milestones. PHONE_TEST_CHECKLIST.md records outstanding device checks. Continue Character integration next, preserving native multi-associations and keeping the latest two-line persona-link draft pending approval. No Android framework migration or publication is authorized.


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
