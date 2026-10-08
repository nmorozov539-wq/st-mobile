# Interactive design handoff

Start with `interactive-design-reference.html` in this folder. It is one self-contained offline file containing all 24 interactive previews, with bundled Lucide icons. Open it in a browser; select a screen in the sidebar. Earlier experiments are under a separate archive. Width controls and Reset belong to the reference viewer, not Pocket Tavern.

## Product direction

Pocket Tavern is intended as an Android app. The current browser build is a proof of concept for its interface, SillyTavern integration and safeguards. These references describe the intended app experience. Prototype browser limitations do not define the final product; Android packaging/framework/lifecycle work is a separate future phase, not part of the current chat refinement.

## Authority and approval

This is a design reference, not a working frontend or permission to implement. Read `README.md` here for behavior, then project `DESIGN_HANDOFF.md`, `README.md`, `prototype/IMPLEMENTATION.md`, and `tests/TEST_REPORT.md` before coding. Later explicitly approved decisions supersede earlier experiments and stale “pending” notes. Preview clicks and sample values do not change approved defaults.

The character menu's new two-line Chat/Character persona association draft is **awaiting approval**. It is included for review, not an approved replacement. Existing character menu remains the approved base. Chat atmosphere: static Soft still is approved; drift is exploratory. Gear: Curved fan is approved; Vertical is superseded. The full-page model picker with Apply/Cancel is superseded by immediate-selection expandable bottom panel.

## Screen map

| Area | Current preview | Key requirement |
| --- | --- | --- |
| Home | Home | Lightweight status/counts; Settings entry only here |
| Chat | Chat atmosphere, Chat gear, Message actions | Quiet static blue-violet reading; curved gear; corner ellipsis fan |
| Models | Model picker | Fixed information above scrolling list; immediate choice; independent scope |
| Character | Character menu | Read/Edit, greetings, notes, lorebooks, current-chat switcher/actions |
| Persona associations | Character persona links | Pending two-link draft; unlink with target confirmation |
| Presets | Preset editor | Implemented in 0.7.1: scope, preset memory, collapsed generation parameters, uninterrupted entries |
| Persona selection | Persona picker | Blue selected row; explicit link targets; shared editor |
| Memory | Memory | Global full Summaryception configuration; chat-owned memories |
| Chats | Chats | Recent-first list; New always fresh; exact resume |
| Characters | Characters | Three-column circles; separate Import/Create; opens Edit |
| Personas | Personas | Same compact grid; editing does not select/link |
| World Info | World Info, World Info activation | Folder/book/entry browsing; native technical fields above content |
| Settings | Connection settings, Appearance settings | Custom OpenAI-compatible connection/proxy; reading controls |

## Read the visuals correctly

Each screen is an isolated original mockup. The viewer does not wire them into a new product flow. Some buttons are placeholders; fixture changes are temporary. Reset clears the selected preview's session state. No live engine, credentials or paid API requests are involved.

Use saved PNGs for approved states and layout; use interaction to understand expansion, selection, editing and confirmation. Original HTML sources are embedded in the file's JSON data (`screens[].source`), retaining IDs and labels for inspection. The outer viewer and compatibility helpers are reference-only code. Optional host-only tweak controls are not reproduced; the product controls and variant selectors remain available.

Native supported fields and metadata must survive even when a mock editor omits them. Memory snippets/counts, models, portraits, values and connection results are illustrative. Load real ST values; do not hardcode examples. Conditional World Info/preset fields, marker semantics and creator HTML isolation need actual integration work.

## Behavior that the coding session must preserve

- Existing generation, persistence, queued-change, Memory validity, cancellation and recovery safeguards remain mandatory. Changing a picker must not mutate a captured in-flight request or replay requests automatically.
- Model and preset have independent Global/Character/Chat configuration. Chat > Character > Global. Preset identity and adjustments survive A → B → A within the relevant scope. This is future state/storage work, not implemented by these previews.
- Character library never auto-creates chats. New in Chats always creates fresh; existing rows resume exact chats. Fresh starts with greeting, no automatic AI request. Fork preserves original and switches after persistence succeeds.
- Start another chat for current character confirms, with optional deletion of current chat off by default. Create/verify before deletion; retain Undo/recovery.
- Persona selection follows ST last-used/manual/linked behavior. Linking is explicit in the chat picker; unlink stays character menu. Verify native precedence and preserve legacy multiple associations.
- Character save follows ST validation (valid name); Pocket marks missing name/description/main greeting Incomplete and prevents Start chat. No separate draft-card storage.
- Proxy toggle eventually starts/stops the process and switches remembered endpoints safely. It requires launcher/bridge changes. Connection tests explicitly identify the global model.
- Full Summaryception functionality is the intended future target; current bridge limitations are integration gaps. Preserve native import/cancellation/skip semantics.

The initial coding request authorized evaluation, complete reference review and Chat. The user confirmed 0.7.0 on the phone and authorized continuing the roadmap. Release 0.7.1 implements Preset; Character awaits review of this phase. The latest two-line persona-link draft remains pending approval. See `../IMPLEMENTATION_REVIEW.md` for evidence and the staged roadmap.


## Character content rollout — 0.7.2

The first Character subphase implements native content, greeting organization and safe notes previews through the existing verified card editor. Library entry defaults to Edit; chat entry remembers Read/Edit per card. Native links, lorebooks, card actions and new-chat/delete workflows require the next integration subphase. Do not treat the awaiting-approval two-line persona-link draft as accepted. Release numbering stays 0.7.*; storage schema remains independently versioned. Outstanding device checks are in PHONE_TEST_CHECKLIST.md.


## Character card actions — 0.7.3

Approved inline overflow now exports native PNG/JSON, duplicates through ST’s helper and verifies the distinct saved copy, and deletes through a target-specific confirmation with explicit chat deletion (off by default). Native events remain owned by ST. Unknown card fields, portrait and embedded book are preserved through native copy/export; native export intentionally omits private favourite/current-chat fields. Unsaved drafts and stale revisions block actions. An unverified mutation is never retried automatically. Export is read-only during generation; duplication/deletion share its lock. Native welcome scaffolding can close before deletion, while actual unsaved temporary messages, edits or composer text block it visibly. Existing associations are untouched by this UI work; their explicit management and the conversation selector remain next. The two-line persona draft remains pending.
