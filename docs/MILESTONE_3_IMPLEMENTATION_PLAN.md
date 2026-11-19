# Milestone 3 implementation plan — Layout v4

Prepared: 18 November 2026. Source baseline: `dev`, `8fa0ea0`.

Status: coding handoff, not implemented. This document turns the approved [Layout v4 decisions](LAYOUT.md) and [Milestone 3 roadmap](ANDROID_PRODUCT_ROADMAP.md) into executable work. On 18 November the user delegated most technical decisions to the planning agent. Defaults specified here are selected implementation decisions, subject to the evidence gates below; occurrences of “proposed” identify decisions made in this plan rather than earlier product approvals. Application implementation starts when the coding agent is instructed to execute this handoff.

## 1. Outcome and boundaries

Deliver the new phone/tablet product structure through the existing browser/Termux workflow: navigation, operational Home, unified Library, topic-based Settings, stable character reading/editing, explicit chat tools, two message formats and complete theme management. Replace Pocket's configuration scopes with native ST ownership only after preservation and hosting gates pass.

Extension integration is deliberately excluded from this pass:

- Extensions gets a destination and a plain unavailable-yet message only. No catalog, extension cards, settings host or compatibility claims.
- No WIhero installation, hosting, update system or replacement WI workspace. Retain the base WI editor.
- Do not build a general extension-host API from the native Connection/Presets experiment.
- Do not migrate Summaryception into a new hub, change its lifecycle, or remove its saved data and mutation safeguards. Temporarily retain its existing explicit menu access and operational notices/Stop controls. Remove its swipe-panel entrance with the other retired panels. Ordinary extension placement remains a later pass.
- Changes inside `prototype/extension/` are still necessary: this directory also contains Pocket's core bridge. Excluding third-party extension integration does not exclude core configuration, navigation or generation bridge work.
- APK bundling, Kotlin lifecycle/security work, branding, new gestures and a framework rewrite are outside scope. Record WebView risks for the packaging milestone; do not make APK builds the daily product loop.

Preserve engine-owned data, unknown native fields, target binding, draft retention, conflict guards, pending-operation review and the prohibition on silently replaying generation. Browsing another conversation must remain distinct from activating it in ST.

## 2. Proposed layout specification

### Navigation and shared shell

Proposed default order: **WI · Chats · Home · Library · Extensions**. This puts Home centrally, Library toward the right and Extensions fifth. Reordering changes presentation only; route identities remain stable.

Use a single route/layer controller rather than extending the current collection of `page`, `entryPage`, `settingsFrom` and dialog-specific return rules. Suggested route families:

| Destination | Child routes | Entry behavior |
| --- | --- | --- |
| Home | None | Operational summary, never a mandatory intermediate stop |
| Chats | Conversation, new-chat picker | Preserve list query and scroll on return |
| Library | Characters, Personas, character detail/edit, persona editor | Each fresh navigation entry opens Characters; Back from an editor restores its originating section |
| WI | Workspace, entry editor, activation settings | Existing complete editor and dirty-state handling |
| Settings | Index, Connection, Presets & generation, Appearance/customize, Layout & reading, About | General entrance opens index; targeted shortcut opens its topic with origin retained |
| Extensions | Placeholder only | Honest statement that integration is deferred |

Settings is a secondary destination entered from Home's header. Chat retains targeted preset/model/persona entrances and has no new general Settings entrance. Proposed Home re-tap behavior is to stay on Home; Continue is the explicit conversation action, replacing the existing hidden re-tap shortcut.

Keep bottom navigation on top-level destinations. Proposed focused routes—chat, full editors and Settings topics—use their own Back/header and no bottom bar, preserving vertical space and avoiding accidental abandonment. Settings index may use the same focused shell. Decide this once in the first layout fixture, then apply consistently.

Back priority: keyboard dismissal where supplied by the platform, native/modal child layer, uncommitted editor or theme-preview handling, topic/detail route, originating destination. Back from a Home shortcut returns to Home; Back from chat Presets returns to that same conversation with draft, selection and reading position intact. A nested native popup closes before its hosting page. Escape uses the same layer policy where applicable. Theme preview Back cancels; dirty character edits require the existing explicit leave decision. Native tools retain their own save semantics: Back must not imply that already-applied native settings were undone.

Persist only supported layout preferences in a versioned, validated record: destination order, WI placement and message format. Reject duplicates/unknown IDs and append missing required destinations deterministically. Keep WI's rank stored while folded so unfolding restores its position. With WI folded, Library gains a WI entrance/tab without shrinking the workspace; the remaining four bottom items follow their saved order. Home's exact center position applies to the default five-item configuration, not every customization.

### Phone composition

```text
HOME                             LIBRARY
Pocket Tavern        Settings    Library
Connection: provider / model     Characters | Personas
Preset: active native selection  Search             Import / Create
Continue: character / chat       Responsive card grid or persona list
Recent conversations             Full available scrolling workspace
Start new chat
WI | Chats | HOME | Library | …   WI | Chats | Home | LIBRARY | …

SETTINGS INDEX                   CHAT
Back  Settings                   Existing header + explicit tools
Connection                       Scrollable message history
Presets & generation             Conditional recovery/activity notice
Appearance                       Composer + Send/Stop
Layout & reading                 Keyboard / safe-area space
About
```

These are hierarchy diagrams, not final visual artwork. Start with 16 CSS px horizontal content gutters, 12–16 px between related blocks and 24 px between sections; refine in fixtures. Use at least 44 × 44 CSS px interactive targets independently of theme geometry. Keep primary titles and actions above decorative content. Long labels wrap or truncate with accessible full text; they must not push actions offscreen.

Use one primary scrolling region per page, except independently scrolling master/detail panes on wide screens and genuine modal content. Headers, composer and safe-area padding must not overlap content. Measure browser dynamic viewport and keyboard behavior before locking heights; do not rely solely on `100vh`. Chat has no always-visible configuration banner stack: show contextual warnings only while relevant.

### Home states and hierarchy

Order: compact header; Connection and Preset informational rows; prominent Continue card; short recent list; clear Start new chat. Remove character browsing and move build details to About. Proposed recent limit: three, excluding the Continue target, with a View all Chats action. Continue prefers the last visited valid saved conversation, falling back to the latest available one. Missing/deleted targets are handled explicitly, never silently sent to or recreated.

| State | Connection row | Conversation area |
| --- | --- | --- |
| Engine starting/unreachable | Engine state and reconnect/recovery route | Keep available saved/draft information; gate actions that need the engine |
| First setup | Set up a connection | Empty-state explanation and available character/new-chat routes |
| API configured, not checked | Provider/model plus “Not checked” | Browsing works; do not advertise readiness |
| Checking | In-progress state | No duplicate check dispatch |
| Ready | Compact provider/model and verified status | Normal actions |
| Failed | Failure summary and repair shortcut | Do not clear selection or imply the engine itself failed |

Represent engine availability, API check state and generation activity independently. Switching provider, endpoint, model or native profile invalidates relevant prior check evidence. Show no preset selection as an honest state; do not invent a fallback preset. Status text accompanies color indicators. Detailed errors belong inside the complete Connection tool.

### Library and character flow

Keep Characters/Personas tabs at the top, with section-specific search, Import/Create and full editors. Preserve existing card actions and race guards. Use a responsive grid with a minimum useful card width rather than forcing three columns at every size; validate long names, missing portraits and large text. Persona management remains a full editor, and chat's persona picker retains its current form.

Character detail becomes one stable reading page. Proposed order: existing conversation selector where eligible; bounded identity block; compact tag summary; primary Start chat/Edit actions; formatted definition content, greetings, Creator's Notes and metadata. Show a two-line tag summary with Show all/Show less; expansion must not hide the primary actions. Limit portrait height on narrow screens and use a side identity column on wide detail pages.

Use one whole-card edit draft initially, with section Edit links scrolling/focusing the relevant section in that draft. Save/Cancel returns to the stable reading page and restores section position. Avoid multiple independently saved partial drafts in this pass. Preserve greeting order, metadata, unknown fields, formatted previews, sanitized Creator's Notes, associations and portrait handling. Cancel writes nothing; failed/uncertain Save retains the draft and requires saved-state review. Preserve current busy/revision guards.

Retain the character conversation selector and Conversations management actions. Remove the chat menu's Other chats duplicate only after verifying that rename/delete/new-chat/history capabilities remain reachable through the retained path.

### Chat and message formats

Keep the existing header, composer, persona picker, message actions and alternative-generation gestures. Remove header/composer swipe side panels and their handlers only after mapping every useful tool to explicit controls. Remove scope selectors when native ownership ships, not merely as a CSS change.

Proposed default message format: **Reading**, preserving long-form usage. Messenger changes only message containers, spacing, alignment, width and name/avatar treatment. Start with incoming messages left-aligned, outgoing right-aligned, content-sized bubbles capped at 88% on narrow screens; lengthy content may use that full cap. Reading uses a shared bounded text column. Validate these proposed values rather than treating them as theme tokens that may change functionality.

Both formats share DOM semantics, streaming updates, sanitization, thinking/details, message actions, selection, editing, swipe eligibility, anchoring and virtualization. Do not fork message controllers. Long code, tables, URLs and expanded content must not overflow the page or steal horizontal swipes intended for their own content.

Only show context-capacity information from trustworthy backend/token data. Distinguish measured values from estimates; use unknown/unavailable where appropriate. Do not display an invented utilization percentage or copy Chat Completion accounting onto Text Completion.

### Tablet composition

Proposed starting breakpoints: compact below 600 CSS px, medium 600–899, wide from 900. Use available content width, not device identity, and collapse split panes when text scaling makes either pane unusable.

- Home: configuration/Continue in the primary column, recent conversations alongside; retain one reading order and one Start new chat action.
- Chats: list plus selected conversation at wide widths. Selecting a row displays it; activation still occurs only through the guarded engine workflow. Each pane preserves its scroll state.
- Library: collection plus detail when space permits; full editor receives adequate width and collapses to a single page on smaller viewports.
- Settings: category list plus selected topic on wide screens; targeted shortcuts still preserve origin. Native Connection/Presets surfaces occupy the topic pane with their popups contained correctly.
- Chat text retains a comfortable maximum measure (initial target 65–75 characters), rather than stretching across the tablet. Keep the agreed configurable destination bar; a different rail-navigation system is not needed for this pass.

## 3. Implementation architecture and native ownership

### Source responsibilities

| Existing area | Planned change |
| --- | --- |
| `frontend/app.js`, `index.html`, `chat-controls.js` | Extract route/layer composition; wire destinations and origin-aware Back; remove obsolete DOM only after callers migrate |
| `home.js`, `home.css`, `libraries.js`, `libraries.css` | Operational Home, Library grouping and responsive compositions |
| `library.js`, `character-editor.js`, `character.css` | Stable detail plus explicit edit lifecycle; keep guarded native persistence |
| `settings-page.js`, `settings.css` | Split index/topic composition from provider-specific forms and reading controls |
| `appearance.js`, `color-theme-store.js`, `color-theme.js`, `st-theme-import.js` | Preference precedence, preview transactions, import/export and recovery |
| `chat.css`, `format.js`, `app.js` message rendering | Shared rendering with message-format attributes and anchoring preservation |
| `side-panels.js`, `model-panel.js`, `preset-panel.js`, `scoped-settings.js` | Retire swipe surfaces; replace scoped ownership only after migration; retain compatible interaction refinements |
| `extension/configuration.js`, `connection-check.js`, `connection-test.js`, `workspace.js`, `runtime.js` | Native API-aware projection/dispatch, preservation and removal of scope reapplication |
| `transport.js`, bridge handshake/build files | Capability reporting and mismatched-build recovery as bridge operations change |

Paths in this table are relative to `prototype/`. Proposed new focused modules: `navigation.js`, `layout-preferences.js`, `settings-router.js`, `appearance-page.js`, and a narrow native-settings host pair on frontend/bridge. Names may change during implementation; keep pure normalization and navigation transitions independently testable. Do not replace the vanilla JS stack or extract every old module as unrelated cleanup.

### Gate A: isolated native-control hosting proof

Use an isolated pinned ST fixture and the existing single engine iframe/document. Prove that original Connection controls, handlers and API-specific dependencies can be framed as a Pocket topic page. Prefer showing/styling the original subtree in place; cloning controls or introducing a second engine is forbidden. Confirm the exact preset/generation/context/instruct surfaces from the pinned source rather than assuming the API drawer contains them all.

The present engine frame is hidden, and `app.js` deliberately blurs it to keep Back in Pocket. The proof must replace that behavior only during an active hosting session. Specify mount/open, ready, close, error and disconnected states; restore styles, focus, drawer state and event subscriptions on teardown. Validate native popup portals, file inputs, autocomplete, nested drawers, keyboard resizing, scroll locking, browser history and reconnect while a page is open. Scope injected styling; do not hide native error/confirmation surfaces accidentally.

Do not let native controls bypass Pocket's engine lock. Block conflicting configuration changes during generation, saving, pending mutation drain, recovery review and Memory activity; establish how native events acquire/release the lock before exposing editable surfaces. A disabled Pocket wrapper alone is insufficient if native keyboard handlers still mutate state.

Deliver a small executable proof, screenshots, selector/dependency inventory and pass/fail evidence. If hosting fails, document the concrete failure and assess a controlled full-native-settings escape hatch in the same engine as the first fallback. Any fallback must preserve native ownership and return/recovery behavior; it does not count as polished mobile parity without review. Other layout slices can proceed while this gate is unresolved.

### Gate B: preserve scoped configuration before cutover

Current source stores global, character and chat copies, per-preset banks, model overrides and opaque fields. `workspace.initialize()` disables native preset binding, `activate()` reapplies scoped copies and `prepareGeneration()` restores a scoped model. Removing only the visible selectors would leave old ownership active.

Implement an additive, resumable migration:

1. Inventory schema versions, global settings, character namespaces, chat-header namespaces and pending configure operations. Use complete native enumeration, not the recent-chat list capped at 1,000. Preserve disabled records and unknown fields as well as effective values.
2. Produce a versioned, downloadable preservation archive with original identities, raw scoped records, preset banks and a manifest of processed/skipped/failed records. Exclude provider secrets. Preserve original namespaces in place during this milestone; the archive is additional recovery, not justification to delete them.
3. Keep a durable progress journal and verify readback/integrity before advancing checkpoints. Interrupted export, unreadable records, storage exhaustion and future schema versions must not report successful migration. Rescans must detect changed records and remain idempotent.
4. Quarantine legacy pending configure operations for explicit review; never replay them through native configuration APIs with changed meaning. Continue to preserve unrelated queued chat edits and uncertain generation records.
5. Present a review mapping each retained configuration to a possible new native preset, with source identity and collision-safe name. Materialize only through the active API's native preset manager, with native readback. Retain fields without an equivalent in the archive and disclose them; do not silently drop them or manufacture Connection Profiles containing incomplete credentials.
6. Let the user explicitly choose the initial native configuration. Do not merge multiple scoped models into a fictitious global result or overwrite existing named native presets. Provide a clear way to inspect/export legacy records later.
7. Persist the cutover checkpoint only after required preservation verification. Stop scope application in initialization, activation, generation preparation, model selection and preset selection together. Remove writes to the old ownership schema; preserve native profile/binding choices without unconditionally forcing them on or off.

Offer safe retry and export on migration failure; keep unaffected browsing available and block unsafe configuration cutover. New installations can enter native mode without a legacy migration. Rollback must be explicit: preserve archive and old data, but do not silently re-enable scoped reapplication on newly edited native state. Test a restoration rehearsal in a disposable copy before release; never recommend an untested downgrade against live data.

### Gate C: backend behavior, beyond visible controls

Define a capability projection containing active API family/source, provider/model label, native preset identity, connection/check state and available actions. Model enumeration, Connect and test generation may be unavailable or different by API. Present unsupported actions honestly rather than dispatching Chat Completion handlers for every selection.

Use native preset lookup for the active API and native Connection Profiles behavior. Presets & generation must include the applicable prompt manager or Text Completion context/instruct/formatting controls. Assess Pocket's grouping, disclosure, entry navigation and touch refinements against those original tools; reuse presentation without retaining competing apply logic.

Validate at least a Chat Completion-compatible mock and a Text Completion-compatible local/mock path. Extend `scripts/mock-model.js` if its routes do not cover the selected family. Verify API switching, profile changes, native preset persistence, model refresh, prompt formatting, streaming, Stop, errors, saved alternatives and reconnect. Audit existing generation restrictions, including suppressed tool calling, and publish an explicit supported/unsupported matrix. Native controls being visible is not proof that all providers or generation features work.

## 4. Appearance and theme development

Build Appearance with active-theme preview, theme cards, full-interface preview, Apply/Cancel, Customize, import/export and Restore default theme. The compact preview includes short messages and a long reply in the user's selected format. Preview navigation must let users inspect real screens while a stable Apply/Cancel surface remains accessible; close it transactionally on Cancel/Back. Reload returns to the committed theme, never a partially previewed one.

Adapt the existing store deliberately:

- Applying an existing theme must select its existing ID. `commitPreview()` currently creates a unique personal copy; reserve copy creation for customization/import where needed.
- Track committed selection separately from preview content and preview origin. A persistence failure leaves the previous committed choice valid and shows a recoverable error.
- Restore default theme changes selection only. Existing `reset()` clears personal themes; do not wire it directly to the product's restore-default action.
- Customize saves a named personal copy. Built-ins remain immutable and recoverable. Handle duplicate import IDs explicitly.
- Import ST themes as reviewed color mappings on a safe base; show conversion warnings and preview before commit. Never apply imported CSS/scripts.
- Provide an unthemed or minimally fixed recovery control reachable even after a broken visual application. Test it with corrupted storage and an intentionally invalid theme.

Precedence: minimum interaction/accessibility constraints, then explicit layout/reading preferences, then theme presentation, then safe defaults. Store message format separately. Map legacy `presentation.messages` (`reading`, `bubbles`, `cards`) to decorative treatment within the selected global format; applying a theme cannot change Reading/Messenger. Propose Reading for first migration when no explicit global choice exists, and retain the old theme value for file compatibility. Keep text size/spacing preferences effective across theme changes.

Use four themes during implementation: Hearth, Light Paper, a dark portrait-lit theme and a geometry/material stress theme (for example, opaque angular surfaces with minimal elevation). The extra themes must differ beyond hue. Keep colors/geometry/material/typography in the existing manifest contract; add a role only for a demonstrated reusable need, with schema compatibility tests. Low-resolution/missing portraits need a stable accent fallback.

Capture Home, chat, Library, character detail/edit, Settings index, native settings, Appearance and WI across the themes. Inspect light/dark contrast, focus, overlays, empty/error states and reduced motion; do not defer new-theme checks until the layout is complete.

## 5. Delivery sequence and completion evidence

| Slice | Work and dependencies | Required exit evidence |
| --- | --- | --- |
| M3.0 — baseline and layout fixtures | Record current checks; build deterministic phone/tablet fixtures for the proposed shell, Home, Library, Settings and both chat formats | Reviewable captures at 390×844 and 1024×768, with 320 px/large-text probes; choices recorded separately from settled decisions |
| M3.1 — native hosting proof | Gate A; can be investigated independently of shell work | Original handlers/persistence work; Back/focus/IME/locks tested; fallback decision if needed |
| M3.2 — shell and navigation | Route/layer controller, configurable destination bar, Settings index/topics, Library entry, Extensions placeholder | Origin/Back matrix passes; drafts survive navigation; no new swipe gestures or hidden destinations |
| M3.3 — Home and collection structure | Operational Home, status model, Characters/Personas grouping, WI folding | First-run/loading/offline/error/long-label states; preserved searches and return positions; no character browsing row |
| M3.4 — configuration preservation and cutover | Gates B/C after hosting decision; native Connection/Presets tools, model projection and scope retirement | Migration interruption/collision/retry/readback tests; preserved opaque data; CC/TC evidence; no remaining scoped reapplication |
| M3.5 — character and chat interactions | Stable detail/Edit/Save/Cancel; explicit tools; side-panel removal; duplicate-route review | Dirty/cancel/conflict and target-race checks; all retained tools reachable; message gestures unchanged |
| M3.6 — Appearance and reading | Transactional theme flow, layout preferences, two formats and extra themes | Apply/Cancel/reload/failure/reset/import tests; personal themes survive default restore; format independent of theme |
| M3.7 — tablet and release qualification | Refine responsive composition already exercised in earlier slices; complete regression and Termux package | Full acceptance matrix, reviewed references, phone/browser checks, package round-trip and documented limitations |

Appearance and character work do not need to wait for native integration; final scope-selector removal and native shortcut wiring do. Each slice includes its own styling, responsive behavior, tests and screenshots. Avoid shipping an intermediate release that hides scope controls while silently preserving their old effects. Keep unfinished experiments isolated from the default product path and remove temporary switches when the slice is complete.

## 6. Validation and release gates

Before implementation, run `npm test` and capture the baseline at the actual starting revision. The roadmap records an older phone-repair subprocess failure; reproduce and classify any current failure rather than assuming that note excuses it. This planning pass has not run the application tests or established a fresh passing baseline.

Extend existing behavior suites around navigation, Home, characters, appearance/themes, workspace/configuration and connection checks. Update obsolete UI assertions only after replacement acceptance is covered; do not delete tests simply because they mention scopes. Add focused tests for migration and the native host lifecycle. Existing `.cjs` browser harnesses are separate from `npm test`; run the relevant ones explicitly against disposable fixtures, plus new v4 journeys. Use the repository's external Playwright setup and fixture guards; do not point destructive tests at personal ST data.

Required journeys:

1. First start → Connection → check → Home → character picker → new chat → send/Stop → reload and inspect saved history.
2. Existing chat/draft → Presets → nested native popup → Back → same chat/draft/scroll; repeat during busy/error/reconnect states.
3. Library always enters Characters; persona edit returns to Personas; character Save/Cancel retains its origin and selector.
4. Preview another theme → inspect other destinations → Cancel/Back; then Apply/reload, Customize/export/import, invalid import and default restore.
5. Reorder navigation and fold/unfold WI → reload → verify every destination, keyboard access and stable return paths.
6. Reading/Messenger switch during long/streaming content → anchored history, accessible actions, unchanged saved messages and alternate-swipe behavior.
7. Migrate mixed enabled/disabled scopes, duplicate preset names, opaque fields, missing characters, more than 1,000 chats and pending operations; interrupt each checkpoint and resume without data loss or repeated writes.
8. Switch CC/TC/native profiles → inspect correct presets/formatting → mock generation → verify no retired Pocket copy overrides the native selection.
9. Edit/fork/delete history with existing Summaryception state → preserve current invalidation, locking, notices and Stop safeguards despite deferred extension placement.

Visual/device matrix: 320, 390 and 600 CSS px compact/medium widths; 900/1024 wide layouts; portrait/landscape; default and 200% text scaling; reduced motion; all four themes; both message formats. Use pairwise combinations for broad coverage and test every high-risk layout at the extremes. Include long multilingual names, keyboard-open composer/editor, no portraits, long tags, large histories, nested dialogs and empty/error/loading states. Check touch targets, visible focus, accessible names and no accidental page-level horizontal scrolling.

Generate deterministic captures using the existing theme-reference approach, extending it to real screen fixtures. Store viewport, theme, format, fixture/build revision and capture instructions beside references. Review hierarchy and usability instead of demanding cross-platform pixel identity. Do not overwrite accepted references automatically during tests.

Run `python3 scripts/build-phone-package.py` at the final browser/Termux checkpoint and validate the installed packaged assets, bridge/frontend version match, reading/theme persistence and a mock conversation. Perform a focused real-phone browser check. Use an available WebView harness for host-sensitive focus/Back/IME findings where feasible; record untested packaged WebView behavior explicitly for Milestone 4 rather than claiming APK readiness.

Milestone 3 is complete for this bounded pass when all approved non-extension layout flows work, preservation/cutover is verified, native behavior has a proven host or reviewed evidence-based fallback, theme/format precedence and recovery pass, and reproducible visual/behavior evidence is recorded. Deferred extension work is a declared boundary, not a failing placeholder to be filled opportunistically.

## 7. Selected defaults and coder discretion

Implement these defaults: WI/Chats/Home/Library/Extensions order; Reading format; focused screens including the Settings index without bottom navigation; Home re-tap stays Home; three recent conversations; two-line collapsed tags; whole-card editing; content-width breakpoints at 600/900 px. Validate them together in M3.0, then proceed without a separate preference-approval round. They do not reopen the approved destination set, Settings categories, native ownership or Library structure.

Highest-risk decisions require evidence rather than visual preference: native popup/focus hosting, mutation lock enforcement, complete legacy-data enumeration, native preset materialization and CC/TC generation parity. Resolve them at their gates before retiring working behavior. Final screen dimensions, exact theme styling and supported backend claims must follow observed results.

The coder may adjust spacing, breakpoints, module boundaries and native selectors based on tests and rendered evidence. Record material deviations with the reason and affected acceptance criteria. Do not ask the user to choose internal APIs or routine implementation mechanics. Escalate only when every viable solution changes an approved product requirement, risks unpreserved data, or requires extending the excluded scope. A failed proof is an engineering finding: first implement or assess the bounded fallback below and continue independent slices.

## 8. Required core bridge upgrade

**Upgrade the Pocket–ST bridge in this milestone.** It is a dependency of native configuration ownership and honest UI status, not optional extension integration. Retain the same-origin engine iframe, MessageChannel transport, pinned ST version and guarded native operations. Do not introduce another service, engine or general extension protocol.

### Wire contract

Keep the existing `{id, method, argument}` request envelope, `{id, result}` / `{id, error:{code,message}}` responses and event envelope. Add a versioned contract to the handshake:

```js
{
  bridgeBuild,                 // existing matched frontend/bridge build check
  protocolVersion: 2,          // v4 contract; previous unversioned contract is legacy
  sessionId,
  capabilities: {
    nativeSettingsHost: { connection: true, presets: true },
    configurationProjection: true,
    legacyConfigurationMigration: true
  }
}
```

These capability values are examples of a successful proof, not constants to advertise before implementation. Report false for unavailable surfaces. Backend-specific model/test/generation capabilities belong in configuration state and change with the active API. Reject incompatible protocol/build combinations before exposing mutating controls; preserve existing draft/recovery access. Unknown methods must return `UNSUPPORTED_OPERATION` promptly instead of silently timing out. Validate arguments at the bridge boundary and keep the current origin/source checks.

Keep handshake discovery read-only with respect to user configuration. The current handshake calls `workspace.initialize()`, which saves settings and disables native binding: split readiness/discovery from explicit legacy migration and remove this side effect. A frontend reconnect must not change presets, profile binding or migration state merely by handshaking.

Add three narrow RPC methods rather than extending the generic third-party `extensions` method:

| Method | Actions | Responsibility |
| --- | --- | --- |
| `configurationState` | `read` | Return native API/source/model/preset/profile projection, revision, readiness and action capabilities; never return secrets |
| `nativeSettings` | `open`, `back`, `close`, `read` | Own one original native Connection or Presets surface in the existing engine document; report session/layer state |
| `configurationMigration` | `inspect`, `scan`, `exportChunk`, `materialize`, `commit` | Resumable preservation, explicit native preset creation and verified ownership cutover |

Keep existing generation, asset, WI, chat mutation and recovery RPCs intact unless a tested backend adaptation requires changes. Existing `configure` actions that remain useful, such as persona selection, must not be removed along with scoped configuration. After cutover, reject legacy workspace configuration writes with `LEGACY_CONFIGURATION_RETIRED`; do not silently reinterpret them.

Native surface requests carry a session-bound `surfaceId`; migration mutations carry an operation ID and expected inventory/configuration revision. Use existing stale-target/conflict semantics. A timeout is an uncertain outcome: inspect durable state before retrying. Native preset materialization needs deterministic source-to-result identity and verified readback so restarting it cannot create duplicate presets.

Emit configuration invalidation and native-surface state events after relevant native changes. The frontend then reads an authoritative projection; it does not reproduce provider logic. Include engine session identity, discard stale responses after reconnect and coalesce refreshes. Retain health polling as a recovery mechanism, not a second settings owner.

### Hosting and concurrency decisions

Keep original controls in their original engine document and position the existing iframe inside the Pocket topic area. The bridge owns engine-side visibility/styles; the frontend owns outer frame bounds, route, heading and return origin. Do not move native DOM into the parent document. Maintain an allowlist of native settings roots and their required popup surfaces, with reversible styling; missing required roots fail the hosting proof visibly.

Acquire a native-settings session through the shared mutation coordinator before exposing editable native controls. While open, suspend Pocket mutation drain and reject conflicting sends/activations/mutations. Do not open editable native settings while generation, native saving, Memory work or unresolved mutation recovery owns the engine. Close only after observed native saves settle, refresh the projection, then release the session and resume guarded work. Release or invalidate abandoned sessions on disconnect and teardown. Test native keyboard/event paths, not only pointer clicks. If native code cannot be contained by this policy, classify the managed host as failed rather than pretending outer UI disabling is sufficient.

Gate A fallback is a controlled full-native-settings view in that same iframe, preserving origin/Back and exclusive-session rules. Use it when selective mobile framing fails but native persistence and safe lifecycle work. Record which mobile refinements remain unavailable. If safe lifecycle/locking also fails, leave configuration cutover gated, complete independent layout work and report the concrete blocker; do not recreate provider forms or claim completion.

### Migration storage and cutover decisions

Keep legacy namespaces unchanged and store a small versioned migration journal under `extension_settings.pocket_tavern.migration`. Track inventory revision, checkpoints and native preset mapping; do not copy entire histories or archives into global settings/localStorage. Preserve all unrelated namespace fields on every write. Stream/export only configuration records in bounded chunks with a manifest; complete the full enumeration before enabling cutover. Browser download initiation alone is not verification: validate archive serialization and provide re-import integrity verification, with durable original records retained regardless.

Create native presets only for user-selected legacy configurations, not automatically for every chat. Naming starts with `Pocket legacy — <source label> — <preset name>` and a collision suffix; never overwrite an existing preset. Unsupported fields remain in the retained record/archive and are listed in the mapping result. The user chooses one initial native configuration; unselected configurations remain preserved and recoverable without retaining automatic scopes. This migration choice is a product interaction, not a technical question for the implementation agent to ask in chat.

Use an explicit durable ownership state (`legacy`, `preparing`, `native`) in the migration journal. Switch to `native` only after preservation verification and native initial-selection readback. All activation/generation entry points consult the same ownership state; `preparing` blocks cutover-sensitive operations. New installations initialize native ownership through an explicit initialization action after discovery. Future/unknown records block destructive migration, not read-only browsing. Never infer completion from the absence of a visible scope selector.

### Bridge completion gate

Require tests for read-only handshake, build/protocol mismatch, unsupported RPC, stale sessions, failed host open/close, save-in-flight teardown, conflicting native/Pocket operations, reconnect, duplicate migration requests, API-switch invalidation and retained legacy metadata. Add integration journeys proving that both CC and TC changes survive native save/reload and that opening a chat or sending no longer reapplies a retired scope. Ship frontend and bridge from the same build, updating cache/version references together; do not distribute a frontend-only cutover.

## 9. Coding-agent handoff

Execute M3.0–M3.7 against the current `dev` checkout, checking for newer source and local changes first. Read this plan, Layout v4, the Theme API and applicable repository instructions. Preserve settled requirements; use section 7 decisions without additional approval loops. Keep extension hosting, WIhero and Memory relocation out of scope.

Start with baseline checks and deterministic layout fixtures, then prove native settings hosting early. Deliver working vertical slices with behavior checks and visual captures. The core bridge upgrade in section 8 is mandatory; scope retirement must follow verified preservation, not precede it. Track gate results and deviations in a milestone implementation report. Continue independent work when one gate is blocked, but do not describe unverified migration/backend behavior as complete.

Final handoff evidence must identify changed behavior, tests actually run, screenshot paths, migration/rollback results, supported backend paths, remaining platform limitations and excluded extension work. Application code has not been changed by this planning conversation.
