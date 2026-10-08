# Pocket Tavern goal visuals

Visual references for the intended Pocket Tavern Android app. The current web build is a proof of concept for its UI, ST integration and safeguards. These are mockups, not implemented application screens; Android packaging/framework decisions remain a separate future phase.

Implementation status, 8 October 2026: the authorized 0.7.0 chat phase follows these references; other screens remain later phases. Historical “on hold” notes below record design-only approval at the time. The two-line persona-link draft still awaits approval. See [review and rollout](../IMPLEMENTATION_REVIEW.md).

## Coding-session entry point

Open [interactive-design-reference.html](interactive-design-reference.html) for the single offline collection of all 24 previews. Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for current screen mapping, approval status and integration requirements. The latest character Chat/Character persona-link draft is included but awaits approval. Earlier experiments are archived separately in the viewer. This reference does not authorize application implementation.

## Chat — agreed direction, 8 October 2026

`chat-design.png`: quiet, nearly full-width reading layout; dark charcoal with a broad, soft blue-violet gradient; blue accents; subtly tinted user messages; visible subdued message menus.

- Slim header: Back, portrait/name opening the character panel, chat settings.
- The subtitle is the chat name, displayed only when the character has multiple chats. No model/preset subtitle.
- Simple composer: writing area, small model picker, Send becoming Stop during generation. Persona/preset/scope shortcuts move into settings.
- Saved reply counter and arrows remain. Remove the permanent New reply button. Normal swipes past the final saved alternative explicitly generate another reply; recovery must never replay a request automatically. A non-gesture action remains accessible through the message menu.
- Thinking remains collapsed by default, preserving the existing inherited expansion behavior.
- Static gradient is the baseline. Very slow drift is a liked exploration, not a finalized implementation requirement.
- Saving, errors, pending changes, Memory validity and recovery remain visible when relevant; the reference depicts a normal idle state.
- `chat-02-gear-curved-open.png`: approved open gear menu. Three circular icon-only shortcuts form an inward curved fan below the top-right gear: Preset (sliders), Persona (person), Memory (brain). Opening overlays the conversation without shifting messages. Gear/outside tap closes; hold explains each icon. Curved fan selected over vertical/horizontal strips. Reference source: `pocket-gear-layouts.html`, Curved fan variant. Destination screens are the approved Preset, Persona and Memory menus below. Approval is visual only, not authorization to implement the app.

## Character menu — approved design, 8 October 2026

The numbered `character-*.png` pictures show the approved layout and its states. Portrait, character content, persona and lorebooks are illustrative fixtures.

| Picture | State |
| --- | --- |
| `character-01-read.png` | Read mode; notes and advanced definitions collapsed |
| `character-02-creators-notes-expanded.png` | Creator's Notes expanded with a sample author HTML panel |
| `character-03-edit.png` | Edit mode, with Save/Cancel |
| `character-04-alternate-greeting.png` | An alternate greeting selected using the arrows |
| `character-05-organize-greetings.png` | Add, reorder and explicitly set a greeting as main |
| `character-06-creators-notes-source.png` | Raw Creator's Notes in Advanced → Creator's metadata |
| `character-07-character-actions.png` | Export PNG/JSON, Duplicate, Delete in the overflow menu |
| `character-08-persona-sheet.png` | Linked persona bottom sheet |
| `character-09-remove-persona-link-confirmation.png` | Confirm removing the character association |
| `character-10-connect-lorebook-sheet.png` | Choose a lorebook and attachment type |
| `character-11-primary-lorebook-selection.png` | Primary selected, with export/replacement explanation |
| `character-12-unattach-lorebook-confirmation.png` | Confirm detaching a lorebook |
| `character-13-no-persona-or-lorebooks.png` | Empty associations with a quiet Connect lorebook action |

Agreed behavior:

- Tapping the character name/avatar opens this panel. Remember Read/Edit separately per card.
- Preserve ST's basic Description/Greeting/Advanced structure; use comfortable editors for long fields.
- Greeting counter includes the main greeting; buttons only, no gestures or generation. With no alternatives, show Add alternate greeting. Organize supports adding/deleting/reordering and explicitly setting the main greeting.
- Creator's Notes appear below portrait/tags only in Read, only if nonempty, initially collapsed. Preserve original Markdown/HTML/CSS and render an isolated, sanitized preview. Scripts do not run. Raw source remains in Advanced in Edit.
- A dim persona line below the portrait shows the character association, unchanged between Read/Edit. Truncate long names and reveal the full name on tap. Bottom sheet offers Edit persona and Remove link, with confirmation for unlinking. This does not delete the persona or remove unrelated chat links.
- Legacy multiple-persona management is out of scope. Preserve existing multiple links and acknowledge them instead of silently choosing/removing them. New explicit chat/character linking is approved in the updated persona picker below.
- Character lorebooks sit below Creator's Notes: primary first, then additional attachments; connect opens a bottom sheet and detach opens a confirmation dialog. Primary is included in card export. Additional attachments remain separate. No silent promotion after unlinking.
- Card export PNG/JSON, Duplicate and Delete live in the top overflow menu. Destructive actions need clear target confirmation.
- Chat-specific character copies are a separate deferred discussion, not part of this approved design.

Character content is implemented in the 0.7.2 subphase: Read/Edit, greetings, advanced fields and isolated Creator’s Notes. Native card actions are implemented in 0.7.3 using the approved inline overflow. Native association visibility is implemented in 0.7.4, preserving the single-line persona layout, multiple links, primary/additional order and unavailable saved names. Approved single-link persona editing/removal and actual lorebook Connect/Unattach controls are implemented in 0.7.5. The updated chat selector remains the next integration subphase. Multiple native persona management remains in ST and the two-line draft remains pending. The approved design remains the authority.

## Preset menu — approved design, 8 October 2026

Approved reference: `pocket-preset-menu.html` in the thread visualization directory. Implemented in the authorized 0.7.1 preset phase after the user confirmed chat on the phone. Sample names, parameter values and entry contents are illustrative, not real user presets. Generation controls shown are a layout sample, not an exhaustive supported-field list.

| Picture | State |
| --- | --- |
| `preset-01-main.png` | Global/Character/Chat selector, preset selection, collapsed generation block and full uninterrupted entry list |
| `preset-02-generation-expanded.png` | Generation parameters expanded above entries |
| `preset-03-selection.png` | Preset picker with remembered-adjustment indicators |
| `preset-04-entry-editor.png` | Name, role, prompt text, collapsed placement/behavior and Save/Cancel |
| `preset-05-entry-placement-and-triggers.png` | In-chat depth/order and generation triggers |
| `preset-06-entry-override-protection.png` | Applicable character-override protection |
| `preset-07-built-in-entry.png` | Built-in content explanation instead of editable prompt text |

Entries remain as supplied, in their original order, with no filtering, grouping or collapsed entry sections. Disabled entries stay visible. Each entry has an enable switch; tapping its name opens the editor. Placement/behavior expands within that editor, with dependent fields shown when applicable. Scope-local adjustments must survive switching presets; existing engine and recovery safeguards remain required.

## Memory menu — approved design, 8 October 2026

Reference: `pocket-memory-menu.html` in the thread visualization directory. The user approved the proposed layout and its visual states. App implementation remains on hold. Sample memories, statistics, values and requests are illustrative; the mockup is not an operational Summaryception integration.

| Picture | State |
| --- | --- |
| `memory-01-main.png` | Status, enable/pause, summarize action and collapsed sections |
| `memory-02-saved-snippets.png` | Layer navigation and snippet edit/regenerate/delete actions |
| `memory-03-edit-snippet.png` | Snippet editor with Save/Cancel |
| `memory-04-injection-preview.png` | Combined memory injection preview |
| `memory-05-turns-and-layers.png` | Recent turns, summary batches, promotions, depth and message visibility |
| `memory-06-prompts.png` | Summary prompt configuration |
| `memory-07-custom-prompts.png` | Saved custom prompts and import/export controls |
| `memory-08-separate-connection.png` | OpenAI-compatible summarizer connection example |
| `memory-09-layer-statistics.png` | Layer overview |
| `memory-10-maintenance.png` | Import/export/repair/clear, debug/trace and reset |
| `memory-11-clear-confirmation.png` | Explicit memory-clear confirmation |
| `memory-12-catch-up-choice.png` | Backlog decision in Memory |
| `memory-13-choice-in-chat.png` | Same decision visible in chat |
| `memory-14-working-in-chat.png` | Summarization status with Stop |
| `memory-15-stopped-in-chat.png` | Stop notification with saved-progress message |
| `memory-16-completed-in-chat.png` | Completion notification |

Global configuration is explicitly identified; memories belong to the current conversation. Saved memories start collapsed. Full Summaryception functionality is the target, not limited by today's bridge. Destructive actions have confirmation. Chat preview depicts Memory questions/status placement, not a replacement for the previously approved complete chat layout. Production behavior must use actual extension state, source availability, native import semantics and exact cancellation/skip effects; simulated counts or messages must not be hardcoded.

## Chats menu — approved design, 8 October 2026

The revised small-round-portrait design is approved, superseding the preceding under-review status. Source: `pocket-chats-menu.html` in the thread visualization directory.

- Flat recent-first list with small circular character portraits, character name as the main label, quiet last-active date, chat name and subdued two-line latest-message preview. Thin separators; no grouping/filter/archive system.
- Header + opens the existing-character picker and always starts a fresh chat, never resumes one. Existing rows open their exact conversation. Preserve the five-tab navigation with Home in the center.
- Visible row actions provide deletion confirmation and Undo. Existing swipe-to-reveal deletion remains required for implementation even though this mockup demonstrates the button route only.
- `chats-01-recent-list.png`: approved list.
- `chats-02-new-chat-character-picker.png`: fresh-chat character picker.
- `chats-03-delete-confirmation.png`: target-specific deletion confirmation.
- `chats-04-deletion-undo.png`: deletion with Undo.
- Names, dates, portraits and previews are illustrative. The mockup's partial chat-opening preview is not a replacement for the approved chat screen. App implementation remains on hold.

## Settings: Connection tab — approved design, 8 October 2026

Source: `pocket-connection-settings.html` in the thread visualization directory. Approved as a Settings tab reached from Home; other Settings tabs remain to be discussed. This supersedes the earlier tentative layout.

- Engine status and Reconnect; Chat Completion → Custom/OpenAI-compatible identity; prominent proxy switch; active endpoint and API key; global model picker with model-list refresh/manual ID; Connect/check; separate explicit Test message with its model identified.
- Proxy toggle represents starting/stopping the bundled proxy and changing the saved endpoint. Chat/character model overrides remain independent. Connection/profile fields use ST storage and behavior; no additional provider or profile-management redesign is approved by this visual.
- No custom request headers/body editor or Advanced Formatting. Sample URLs, models, connection states and test replies are fixtures, not verified runtime support or live user settings. The mockup makes no network calls and stores no credentials in widget state.
- `settings-connection-01-proxy-on.png`: main tab with proxy enabled.
- `settings-connection-02-proxy-off.png`: direct endpoint with proxy off.
- `settings-connection-03-global-model-picker.png`: model selection and manual model ID.
- `settings-connection-04-test-result.png`: separate generation-test result.
- Design/save approval only. App implementation remains on hold.

## Settings: Appearance & reading — approved design, 8 October 2026

Source: `pocket-reading-settings.html` in the thread visualization directory. Design approval only; application implementation remains on hold.

- Global reading preferences: text size with live preview, Compact/Normal/Spacious spacing, Plain/Gradient background. Default draft uses 16px, Normal spacing and the approved static blue-violet gradient. Background motion remains deferred.
- Generation time (time until the reply finishes) is the only message-detail option enabled by default. Clock timestamp, model indicator and token count are optional and off by default.
- Model indicator should identify the model that generated that saved reply, with full name available on hold. Use a generic fallback when an appropriate family icon is unavailable; the draft sparkles icon is illustrative. Token counts and generation timing must reflect available real metadata, never fabricated values.
- Preview responds immediately to the controls. No custom CSS, expanded theme system or unrelated layout redesign is introduced.
- `settings-reading-01-default.png`: approved default appearance and generation-time-only details.
- `settings-reading-02-preview-options.png`: illustrative Plain background, Spacious spacing, larger text and optional details enabled. This demonstrates controls, not a change to defaults.
- Preview interactions recorded by the visualization host are experiments, not additional agreed default settings.

## Characters library — approved design, 8 October 2026

Source: `pocket-character-library.html` in the thread visualization directory.

- Three-column grid, small round portraits (70px maximum in this draft) and names only. No search, tag filtering or creator labels for now. Portrait initials in references are placeholders for real card pictures.
- Separate Import and Create buttons. Import accepts PNG/JSON; existing ST card content must be preserved. The mock file picker does not upload or parse cards.
- Opening a library card defaults to Edit, overriding the previously discussed per-card last-mode default for this entry point. Reuse the approved character menu; opening/managing cards never automatically creates chats.
- Create opens an empty, unsaved editor. Save requires a valid nonempty name consistent with ST validation. Description and main greeting may be empty for saving. Saved cards use ST character storage; no separate Pocket draft library is approved.
- Pocket readiness rule: missing name, description or main greeting marks a card Incomplete and disables Start chat. Imported incomplete cards are preserved rather than rejected. Quiet warning badge on portrait and missing-fields notice in editor.
- Explicit Start chat creates a fresh conversation after successful saving. Export/duplicate/delete, lorebooks, persona associations, greetings and advanced definitions reuse previously approved character-menu behavior. Simplified mock controls are placeholders, not replacements for those requirements.
- `characters-01-library.png`: approved smaller-circle grid.
- `characters-02-new-card.png`: empty editor, saving disabled.
- `characters-03-named-incomplete.png`: valid name allows saving; missing description/greeting still prevents starting chat.
- `characters-04-import.png`: device-file import entry.
- Application implementation remains on hold; mock saving affects illustrative preview data only.

## Persona management and chat-picker linking — approved design, 8 October 2026

Sources: `pocket-persona-management.html` and `pocket-persona-picker-linked.html` in the thread visualization directory. The original picker remains an earlier reference; its placeholder Edit action is superseded.

- Persona library reuses the three-column, small round portrait/name grid. Opening a persona edits its picture, name, optional ST title/comment and description. Editing a library entry must not silently select it for chatting or create links.
- A simple Create persona entry is shown in the approved draft. Picture selection is a mock placeholder; production storage/validation follows ST. Character-card PNG/JSON importing rules do not automatically apply to personas.
- Chat picker retains the selected-row blue highlight/check, 40px round list portraits and title/comment without description previews. Current-persona information remains above the list.
- Edit persona from the chat picker opens the same editor and returns to that picker after Save/Cancel. Saves update persona content, not associations.
- Separate Link action offers the explicitly named current Chat or Character target; no implicit last-opened-chat linking from the global library. Choosing a persona alone does not create a link. Preserve native last-used/linked-persona selection behavior.
- Replacing a different existing link requires target-specific confirmation. Unlinking remains in the character menu; its existing information/actions must distinguish chat and character links. Legacy multiple-character associations must not be silently overwritten or reduced; their management remains outside this iteration.
- Mock links are illustrative local state, not evidence of native association precedence or migration behavior. Implementation must verify ST semantics and retain request-idle, generation, persistence and recovery safeguards.
- `persona-02-library.png`: persona grid.
- `persona-03-editor.png`: shared simple editor.
- `persona-04-picker-with-link.png`: updated chat picker.
- `persona-05-link-targets.png`: named Chat/Character choices.
- `persona-06-replace-link.png`: explicit replacement confirmation.
- Design/save approval only; no application implementation authorized.

## World Info — approved initial design, 8 October 2026

Source: `pocket-world-info.html` in the thread visualization directory. Inspired by lazuli-s/SillyTavern-WorldInfoDrawer browsing/editor separation, not a wholesale adoption of its extension or desktop tools.

- Folder → expandable lorebook → entry-title browser. Books expand in place; entry taps open a full-page editor. Ungrouped books remain directly in the library.
- Simple folder create/rename/delete and move-book controls. Deleting a folder keeps its books. Folder metadata/storage compatibility with the referenced extension must be decided before implementation; folders must not alter ST lorebook activation semantics.
- Compact entry rows show title, enabled control and activation indicator; source/link information stays subdued under book names. Import/create book actions and book rename/export/duplicate/delete are shown.
- Technical controls precede content, following native ST familiarity: title/strategy/placement/order/probability, keywords/logic/filter, per-entry overrides and recursion/budget flags. Content follows; inclusion/timing and character/generation filters remain accessible below. Conditional role/depth/outlet controls and all supported ST fields must be retained in implementation; this illustrative editor is not a complete serialization contract.
- The initial global activation placeholder is superseded by the approved activation screen below. Search, bulk tools and entry-specific management actions have not been settled by this first draft.
- Mock Save persists only a subset of illustrative fields; it does not justify dropping any actual field or metadata. Existing generation, persistence, Memory and recovery safeguards remain requirements. Application code is unchanged.
- `world-info-01-library.png`: expanded folder/book with enabled and disabled entry rows.
- `world-info-02-entry-editor.png`: technical controls above content, with further native controls accessible below.

## World Info global activation — approved design, 8 October 2026

Source: `pocket-world-info-activation.html` in the thread visualization directory. Supersedes the global-activation placeholder in the first World Info draft.

- Full page reached through the World Info header control; global scope only. Numeric controls retain native slider and exact-number entry, followed by matching options.
- Scan Depth, Context %, Budget Cap, Include Names; Min Activations, Max Depth, Max Recursion Steps, Recursive Scan and Insertion Strategy; Case-sensitive, Match Whole Words, Use Group Scoring and Alert On Overflow.
- Preserve native Min Activations / Max Recursion Steps mutual exclusion and entry-level override behavior. Load actual ST settings, preserving existing values; displayed fixture values are not newly approved defaults.
- Save/Cancel illustrated. No requests or engine writes occur in the preview.
- `world-info-03-global-activation.png`: approved full panel.

## Home — accepted lightweight direction, 8 October 2026

Source: `pocket-home.html` in the thread visualization directory.

- Deliberately simple and open to future revision: branding/atmosphere, Engine and API status, settings gear and character/chat/persona counts. No duplicate chat shortcuts, activity statistics or speculative feature sections.
- API indicator reflects known connection/request state and allows Not checked; never generate a paid request just to refresh it. Counts/status in the visual are fixtures.
- `home-01-main.png`: accepted landing-page reference.
- Behavior/polish settings (screen awake, confirmation preferences, haptics) deferred by user. No implementation authorization.

## Chat model picker — approved design, 8 October 2026

Source: `pocket-chat-model-sheet.html` in the thread visualization directory. Supersedes the unapproved full-page Apply/Cancel draft.

- Opens as an expandable bottom panel from the composer. Back/outside closes it; model selection applies immediately, with no Apply/Cancel buttons. Scope browsing alone does not change the active model.
- Fixed top information contains Global/Character/Chat controls, explicit target, effective model and its source. Remaining space scrolls the model list independently; effective-model information never requires scrolling to the bottom. Compact and expanded heights illustrated.
- Model selection is remembered independently for each scope, with Chat > Character > Global precedence. Inheritance choice removes the applicable local override. A quiet note explains when a stronger override keeps the current chat on another model.
- Actual connection supplies available models; names, generic icons and 40 sample list entries are fixtures. Do not hardcode this list or change the connection source. Preserve unavailable saved selections and allow clear real error handling rather than silently replacing them.
- Immediate selection is desired UX, not permission to modify in-flight requests. Existing generation/Memory/persistence queueing and pending-change visibility remain required; current work must retain its captured model.
- `model-01-bottom-panel.png`: compact open panel.
- `model-02-expanded.png`: expanded panel with selected model.
- App implementation remains on hold.

## Chat message actions — approved design, 8 October 2026

Source: `pocket-message-actions.html` in the thread visualization directory. User approved the playful curved fan with the action circles moved closer to the ⋯ trigger. The final reference reduces the distance from the trigger while retaining the 48px circular touch targets.

- Keep quiet corner ellipsis buttons. Opening overlays a curved fan of circular, opaque-backed actions and dims surrounding chat while identifying the selected message. No message hold handler: native text selection remains available. Outside tap/Escape closes.
- Edit, Copy whole message, Fork from here and Delete; Generate another reply only on the latest eligible assistant reply. Normal alternative swiping remains unchanged. Icons have accessible names and explanations.
- Edit in place with Save/Cancel. Delete confirmation names the targeted message and keeps Undo/recovery. Fork preserves original and switches only after successful persistence. Generation must require a deliberate user action; mock action makes no request.
- Native rules and existing generation/persistence/Memory validity safeguards determine eligibility. Preserve other existing message functionality; the fan is not authorization to remove existing controls.
- Prototype adjusts inward/upward near its frame edges; production placement must account for the actual viewport, keyboard and long messages, preserve separated touch targets, and avoid clipped menus.
- Clipboard fallback shows selectable whole-message text if browser permissions block direct copying. Mock deletion/fork/edit manipulate sample data only; no actual chat history changes occur.
- `chat-03-message-action-fan.png`: approved tighter fan.
- `chat-04-message-delete-confirm.png`: target-specific deletion confirmation.
- App implementation remains on hold.

## Character persona-link information — awaiting approval

The combined reference includes `pocket-character-persona-links.html`: two dim lines beneath the portrait distinguish Chat and Character links. Tapping opens compact edit/unlink rows with target-specific removal confirmation. This latest draft has not been explicitly approved. Keep the approved character menu as the implementation base until resolved.

## Starting and switching conversations — approved behavior

- Character management never creates chats automatically. Chats + selects an existing character and always starts fresh; existing rows resume their exact conversation. A new chat starts with a greeting, without automatic model generation.
- Character menu has a thin current-chat selector above the portrait only when more than one chat exists. See `character-14-chat-switcher-line.png` and `character-15-chat-selection.png`.
- Start another chat is in character overflow; confirm with optional Delete current chat off by default. Create and verify before deleting; preserve Undo/recovery and idle safeguards. See `character-16-actions-with-new-chat.png`, `character-17-new-chat-confirmation.png`, `character-18-new-chat-delete-current.png`.
- Fork copies through the selected message, preserves original and switches after successful persistence. Preserve settings/persona metadata and applicable Memory validity. Checkpoints remain deferred.

## Cross-screen scope and defaults

Model and preset have independent Global/Character/Chat controls, Chat > Character > Global. Preset identity and scope-local adjustments must survive A → B → A. Existing storage/queueing needs a deliberate compatible migration before implementation. Connection configuration remains global. Persona uses ST last-used/manual/linked behavior; Memory configuration is global, contents chat-owned.

Only three gear destinations: Preset, Persona, Memory. No Other or Advanced Formatting menu. Desired future default: ignore character Prompt Overrides unless explicitly enabled; no new override-control screen is approved and existing user settings must not be silently reset.
