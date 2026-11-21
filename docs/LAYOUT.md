# Layout v4 — discussion and decisions

Design reference for the preserved implementation. As of 21 November 2026, delivery order and extension architecture follow the [STM foundation roadmap](FOUNDATION_ROADMAP.md). Preserve visual intent; old WIhero-specific product commitments do not govern the new foundation.

Updated: 18 November 2026. Status: structural discussion consolidated; detailed design remains open; not implemented.

This is the living record for the current layout conversation. The entire layout is open to reconsideration. This work concerns navigation, hierarchy, interaction and access to functions; styling and branding are separate. Decisions here do not authorize implementation on their own. Update this document as discussion continues, keeping settled decisions distinct from proposals.

## Version history

Layout numbers are a retrospective convention introduced here, not historical release names. Count substantial navigation/interaction generations, not each feature addition, theme or visual adjustment. Layout version, application release, settings schema and theme contract versions are independent.

| Layout | Evidence in Git | Description |
| --- | --- | --- |
| v1 | `f8bef24` through early prototype development | Initial frontend and phone kit, subsequently extended with library editors and settings. |
| v2 | `6bd508d`, then the 0.7 rollout from `9a87e47` | Five-tab navigation, scoped settings and dedicated chat/editor workflows; libraries, Memory, WI, Settings and Home developed through 0.7. |
| v3 | `472ef55`, `8703a1f`, `f675e1b`, `f9baa63`, `fe58221`; completed at `d9e437b` | 0.8 interaction overhaul: chat header and menus, side panels, Home hub, library patterns and grouped Settings. Includes structural changes, not just the token/font refresh. Current implemented baseline. |
| v4 | This document | Layout reopened: navigation, Home configuration access, Library grouping, chat formats and extension interface space. |

## Settled direction

### Navigation and destinations

- Base navigation places Home in the middle. Extensions is a confirmed navigation destination, occupying the fourth or fifth position in the default bar; exact order remains open and ordering will be configurable. The earlier four-destination sequence was WI, Home, Chats, Library.
- Home and Chats are primary destinations. Library belongs toward the right, recalling ST's character access.
- Library contains character cards and personas. Presets do not belong in Library.
- Library opens directly on Characters every time, rather than remembering the last section. At the very top, two tabs/buttons—Characters and Personas—highlight the active page. There is no intermediate Library landing page. Each section provides its own full editor.
- WI remains a separate destination by default, with its full workspace. An optional fold into Library would change its entrance, not reduce its editor space.
- Preserve useful ST functionality through accessible organization. The number of ST controls is not evidence that their functions are unnecessary.

### Home and configuration tools

- Home includes a prominent connection shortcut: first-run setup invitation, compact persistent provider/model status when connected, and a repair route after a failed check. The user's screenshot is conceptual, not a final layout or exact-copy specification.
- Connection access opens the proper, complete connection settings tool.
- Home also provides a prominent preset shortcut opening the full global preset control/editor and generation parameters. It gives Home a configuration role alongside continuing conversations.
- Follow ST's native preset, model and connection behavior. Retire Pocket-specific character/chat configuration copies, inheritance and independent model scopes during implementation; do not replace them with a new Pocket association system. Preserve native ST mechanisms, including its preset selection and Connection Profiles behavior. Existing customizations require a preservation/migration plan before removal; this decision does not authorize deleting saved data.
- Keep contextual entrances elsewhere, including inside chat. Home is not a mandatory intermediate stop.
- Connection and preset shortcuts are informational rows for now: show the current selection/status and open the complete tool on tap. No inline configuration controls.
- Below those shortcuts, Home provides a prominent Continue action for the last conversation, a short recent-chat list and a clear Start new chat action opening the character picker.
- Remove Home's character browsing row; Library provides browsing and the new-chat picker provides selection.
- Keep the Settings entrance in Home's header.
- Settings uses an Android-style category index opening dedicated topic pages within one unified Settings destination. Full tools retain their own space; do not use one continuous settings form or an expanding category tab bar.
- Targeted shortcuts bypass the index and open the relevant full Settings page directly. Back from a shortcut returns to its origin. Opening general Settings shows the category index.
- Do not add a general Settings entrance to chat. Keep the targeted shortcuts already agreed, including Presets. Other settings do not require urgent chat access, and text-display changes have a preview.
- Engine availability, API readiness and unchecked status must remain distinguishable. Exact status presentation remains for detailed design. Home's preset shortcut addresses the active native/global configuration; there is no Pocket-specific scope selector in the proposed design.

### Configurability

Plan for a small set of supported choices, independently of themes:

- Bottom navigation ordering.
- Optional folding of WI into Library; separate WI is the default.
- A messenger-style message presentation alongside long-form reading, selected through a global setting. Scope is message appearance: bubbles, spacing, padding, alignment, width and accompanying name/avatar treatment. Buttons, composer, navigation, features and interactions remain shared between formats. Exact visual values and the default format remain open.

This is not approval for arbitrary rearrangement of every control. Decide supported boundaries during design; implementation timing remains open.

### Extensions and Android

- Extensions are essential to the product direction and continue running inside actual ST.
- Summaryception/Memory loses its privileged built-in product role. Its UI must follow the same extension access/placement rules as other extensions, rather than assuming everyone uses it. This does not authorize deleting saved memories or removing operational safeguards; the technical transition belongs to extension integration.
- The Extensions hub is a confirmed navigation destination in the fourth or fifth default position. Keep a placeholder until extension work begins; hub layout and contextual surfaces remain open. Do not prematurely design or populate the hub.
- Detailed compatibility and bridge work is deferred to [the current architecture research](EXTENSION_ARCHITECTURE_RESEARCH.md) and a dedicated conversation.
- Keep message swiping for saved alternatives and eligible generation, plus Android system Back with appropriate navigation/layer handling.
- Retire the existing header/composer swipe side panels. Their useful tools remain available through explicit controls; Memory follows ordinary extension placement.
- Do not add swiping between main destinations or other new gestures for now. Embedded editors may need horizontal gestures themselves, and configurable navigation makes page-swiping less predictable. Revisit gestures only when a concrete need emerges.

### Chat tools and character content

- The current chat header is acceptable; no redesign is requested at this point.
- Preset access in the chat menu is a shortcut to the full native-behavior preset tool. Retain the persona picker's current form.
- After Memory follows ordinary extension rules, reconsider the chat menu's remaining contents and allow room for useful future actions. Do not assume the menu must contain a fixed number of buttons. The character page already provides a conversation selector; retain it there and do not add another entrance merely to fill the chat menu. Current source also contains an Other chats menu action; its removal as a duplicate remains implementation cleanup to review.
- Replace the persistent Read/Edit mode switch with one stable character page and explicit Edit actions. Save or Cancel returns to that page. Preserve formatted definitions, Creator's Notes previews, greeting organization and metadata editing; detailed editing boundaries remain to be designed.
- Bound the character identity area: portrait, name and creator information, followed by a compact tag summary with Show all. Long tag lists expand deliberately rather than dominating the page. Keep useful formatted reading/preview without two substantially different page compositions.

## Remaining design and implementation questions

The structural discussion is consolidated. Do not reopen settled decisions merely because visual values or implementation mechanisms remain unspecified.

- Exact default navigation order with the confirmed Extensions destination in fourth or fifth position; hub layout waits for dedicated extension work.
- Final Settings category names/grouping and topic-page details; category navigation and direct shortcut return behavior are settled.
- Home's detailed connection/status states, long labels and first-run/empty/error presentation within the agreed structure.
- Messenger bubble geometry, spacing, identity treatment and default format; no separate tools or interactions for this format.
- Character-page editing boundaries and tag expansion details. Keep the existing character conversation selector; review the redundant Other chats action during cleanup.
- Migration/preservation of existing Pocket-scoped configurations before switching to native ST behavior. This is technical implementation work, not an unresolved product choice about retaining scopes.
- Transition Memory UI to ordinary extension rules and integrate optional WIhero. These depend on the dedicated extension work; neither requires a bespoke replacement editor now.

Settings navigation is approved: Android-style category index and dedicated topic pages. Categories are Connection, Presets & generation, Appearance, Layout & reading and About. A dedicated Accessibility category is deferred; preserve basic usability during development, respect reduced-motion preferences, and retain existing text-size/spacing controls in Layout & reading. Implementation remains separately authorized work.

### Connection parity — approved approach

The user approved this approach during the layout discussion. Native-control reuse is the selected direction, subject to the hosting proof below; backend parity and hosting remain unimplemented and unverified.

The current connection UI and bridge are narrowly Chat Completion-oriented. `configuration.js` forces `main_api=openai` when selecting its supported sources, reads OpenAI-family models/presets, and implements provider-specific key/model cases. `connection-check.js` observes only the chat-completions status route, and `connection-test.js` calls the Chat Completion request path. `workspace.js` reapplies Pocket-owned Chat Completion settings during activation. Normal submission already delegates to ST's composer, but retains restrictions including suppressed tool calling; this is not tested backend parity.

ST provides a live native API drawer (`#rm_api_block`), API-dependent visibility through `changeMainAPI()`, a connection dispatch map (`CONNECT_API_MAP`), and API-dependent preset lookup through `getPresetManager()` without a hardcoded API argument. These are useful native mechanisms, not a standalone portable settings renderer.

Approved approach: prove a managed native Connection page using the existing engine document, its original controls and handlers, with Pocket providing page framing and mobile presentation. Do not clone the drawer into a second document or load another engine instance. Investigate overlays, focus, Back, native drawer behavior and persistence before committing to hosting. If practical, this avoids maintaining provider-specific duplicate forms. Native hosting is not yet demonstrated.

In parallel with that integration, remove Pocket configuration reapplication after preserving existing customizations; make status/model/preset projection and connection dispatch API-aware, use native profile behavior, and retain backend-specific test availability. A generic Connect button cannot be assumed for every API. Generation/prompt formatting needs verification across the selected backend families before claiming parity. API-specific controls belong in the complete native-behavior Presets & generation tool rather than a Chat Completion-only form.

Agreed sequence for future implementation: isolated hosting proof; configuration ownership/migration; end-to-end backend adaptation and representative mock/local validation. This conversation remains in design discussion; no application implementation has begun. Do not present new provider options as working solely because their native menu is visible. Text Completion formatting (context/instruct and related native controls) must be accounted for when designing Presets & generation.

### Presets & generation — approved direction

- Reuse ST's native preset/generation tools and behavior, adapting the available controls to the active API, including the relevant Text Completion formatting tools. Present complete functionality within the unified Settings destination.
- Retain useful UX refinements from Pocket's current preset editor where compatible with native behavior: assess presentation, grouping, disclosure, entry access and touch usability during detailed design. Reusing native tools does not require discarding Pocket's interaction improvements.
- UX refinements must not reintroduce Pocket-owned configuration copies, extra scope inheritance or competing preset application logic. Exact retained refinements and technical hosting remain to be verified; do not treat every existing behavior as approved merely because it is already implemented.

### Appearance — approved flow

- Lead with the active theme and a compact chat preview containing both short exchanges and a long reply, rendered in the user's globally selected message format.
- Show theme choices as cards with thumbnail, name and selected indicator. Selecting another theme previews it across the interface; Apply commits and Cancel or Back restores the committed theme.
- Customize opens grouped editable theme properties one level deeper. Save as a personal copy; keep built-in themes recoverable.
- Import/Export supports theme files. Import is previewed before applying; failure leaves the current theme intact.
- Restore default theme resets theme selection only, not layout, accessibility or reading preferences.
- Message format and navigation configuration belong in Layout & reading. A dedicated Accessibility category is deferred; any future accessibility overrides must retain precedence over themes. Explicit user text-size/spacing choices take precedence over theme typography.
- Resolve the existing theme `presentation.messages` overlap: the global reading/messenger choice takes precedence, so applying a theme cannot silently change message format. Exact compatibility handling remains implementation work.
- Existing store preview/import/export/reset primitives are foundations; the approved product flow is not yet implemented or verified.

### Layout & reading — agreed scope

- Retain the existing reading controls and preview; no broader reading-page redesign is needed.
- Add a small Layout section: global Reading/Messenger message format, navigation destination reordering, and WI in Library (off by default).
- Navigation ordering uses a reorder control; the other options use an appropriate selector/toggle. Detailed control presentation remains for implementation.

### About — agreed scope

- A simple page with build/version information and human-readable credits explaining what Pocket uses and what those components do.
- Keep required license/attribution information accessible, without turning the primary page into a technical dependency dump. Derive build/component information from the actual delivered build; exact fields and wording remain for implementation.
- No elaborate About feature set is needed at this stage.

Community collaboration is a possible future step, including comparing findings with another mobile ST frontend. No outreach, partnership or shared implementation is authorized by this record.

## World Info editor and WIhero

- Pocket retains a functioning base WI editor. Keep the current editor as the initial fallback; later improvements can draw on native ST and other editors without duplicating WIhero as a prerequisite.
- WIhero is an optional, preinstalled extension that can be disabled and updated through the extension lifecycle. It is not absorbed as a second Pocket-maintained implementation.
- Pocket is not tied to a normal-only WIhero package. A full WIhero package is also acceptable; its packaging and feature contents are independent of Pocket's layout decisions.
- When enabled and integrated, WIhero supplies the WI editing experience; disabling it restores Pocket's base editor. Hosting and routing require an integration contract and are not implemented yet.
- WIhero provides a concrete stress test for extension integration: opening a substantial replacement workspace, Back/close behavior, native context and operations, and updates without unnecessary Pocket releases. Resolve those technical questions in the dedicated extension conversation.
- Independent extension updates are the intended direction, not a guarantee that arbitrary future WIhero changes work without a compatible host. Android update storage and preservation require investigation.

For messenger appearance, use ST and CrushOn as visual references for messages. CrushOn already informed the project during earlier development: the composer model picker originated from that reference. This work does not reopen that control or adopt CrushOn's layout, buttons or features. The user has not used Janitor; no dependency on researching it is established.

## Reference policy

### Messenger reference research — 18 November 2026

Research is limited to informing message appearance. Earlier recommendations about adopting headers, composers, menus or action placement were rejected as outside this option's scope.

- Inspected CrushOn's public mobile web chat at 390 × 844: content-sized incoming bubble with avatar/name outside it. This does not establish native Android app behavior or outgoing-message treatment; no message was sent.
- [CrushOn reference](https://crushon.ai/character/d51f389d-2c70-424f-a239-c74df596ba21/chat).
- [ST UI customization](https://docs.sillytavern.app/usage/core-concepts/uicustomization/) and local bubble CSS provide references for message containers, padding and separate user/character backgrounds. Its bubble styling alone does not establish alternating alignment.
- No new action menu, composer, header or feature proposal follows from this research. No additional app screenshots are required to continue the broader layout discussion.

The obsolete GoalVisuals directory and old planning/handoff documents were removed on 18 November 2026; tracked versions remain recoverable from Git history. Old approvals, coding prompts and rollout instructions do not freeze this layout or grant current implementation authority. Current source establishes implemented behavior; this document establishes new layout decisions. Preserve data ownership, drafts, target binding and recovery safeguards as the layout changes.
