# Implementation review and phased rollout

8 October 2026. Product: an Android app for ST 1.19.0 through Termux. Browser delivery and the hidden native iframe are proof-of-concept mechanisms. No Android framework selection or APK migration is part of this work.

## Project evaluation (published before design review)

Baseline checkout: 49af7b6, release 0.6.2; only untracked `or-proxy/` initially. No applicable AGENTS.md was found in the project or its ancestors. User proxy files and ignored historical archives are preserved.

Fresh baseline evidence: 94 automated tests passed; 28 isolated native ST/mock workspace assertions passed; 11 browser HTML checks passed; actual 390 × 844 Pocket first-click Send completed and saved with no page errors. Fixture: `/tmp/st-mobile-pc-2ncsehun`. Source/default ST code was copied read-only from `/home/Riv/SillyTavern`; no personal data, provider keys or external generation requests were used. Adapted Summaryception unit tests ran in this baseline. The initial PC sandbox helper did not install that extension; native checks with the adapted extension are therefore a separate verification requirement.

### What works and how data moves

Pocket's frontend reads characters, saved JSONL chats and settings through its MessageChannel bridge. Saved-chat browsing does not activate the displayed chat in ST. The displayed target, its local draft and the generating target are separate. Generation activates a target, applies its effective settings, invokes ST's normal composer/generation path, batches stream rendering and verifies disk persistence before completion. ST owns provider routing/secrets, native settings/cards/chats/presets/personas and generation. Summaryception owns its existing native memory metadata and algorithms.

The bridge serializes mutations against ST generation, saves and Memory ownership. Native data is cloned/preserved and persistence is read back. History revisions prevent stale overwrite; saved-prefix checks allow earlier edits while retaining newly appended replies. A durable browser journal records committed pending changes before announcing Pending. A generation request journal and runtime IDs distinguish observe/review/settled paths; unknown requests are never replayed. Stop waits for native submission/save settlement. Deletion Undo stores history and memory together. Forks preserve original history and metadata, verify a fresh destination and adjust memory validity when branching before its source range.

### Implementation-relevant findings

| Finding | Evidence/status | Consequence |
| --- | --- | --- |
| Model value and preset name are separate; their scope enablement shares one settings copy | Verified in `workspace.js`, `effectiveScope`, preset scope UI | Independent model scope needs compatible additive storage and conflict/queue tests in chat phase |
| Reselecting a preset reloads saved native fields over local adjustments | Verified in `configure(kind=preset)` | Per-preset adjustment memory needs a later preset migration |
| Character/persona/library/connection mutations generally require idle ST | Verified bridge locks and frontend controls | Browse/edit drafts must be distinguished from committed work; no working-looking unsupported controls |
| Summaryception bridge exposes a subset; separate summarizer connections are rejected in Pocket | Verified adapted extension's registered API | Full approved Memory screen requires actual extension integration, cancellation/import/repair tests |
| Proxy runs through launcher, not a UI process-control API | Verified launcher/setup scripts | Approved switch requires launcher/service integration, not CSS alone |
| Persona display projection uses a simplified first-match association | Verified against native `getConnectedPersonas` multi-choice behavior | Later persona phase must verify precedence and surface ambiguity without reducing associations |
| Frontend code is dense and CSS accumulates overrides | Source inspection | Isolate new chat controls in small modules; retain existing operation machinery; no framework rewrite |
| Recent list is capped at 1,000; rendering estimates heights | Verified read/render code | Not proof of all-library parity or extreme-content performance |
| Browser localStorage holds drafts, pending work and Undo; draft debounce is ~1 second | Verified state/journal/event handlers | Browser clearing loses local work; Android durable storage/lifecycle remains separate future work |

Performance foundations are appropriate: nearby message/list windows, measured message heights and requestAnimationFrame stream batching. Per-chat height/detail/position maps persist for the session; extreme session sizes and long HTML/reasoning remain device/performance follow-up, not verified failures. Rendering an individual very long reply can still cost work even with a bounded message count. Native HTML/reasoning sanitization must remain in the existing formatter.

The bridge provides a useful API boundary for future Android packaging, but ST internals, a full hidden native page, version checks, local HTTP/session startup and Termux process lifetime are prototype dependencies. Android system Back, IME/insets, clipboard, background suspension and restart durability require device testing and eventual architecture work. A browser viewport simulation cannot establish those guarantees.

Prepared-engine phone tools isolate ST data, refuse unsupported 1.19.0 source fragments, retain session/CSRF checks, back up code and preserve data/settings. The initial test-package tooling was tied to an old temporary fixture; this phase adds a fixture parameter for reproducible release verification. No native installation or user data is to be edited.

## Design review and roadmap

The interactive reference and approved images are the behavior/layout authority; sample values and partial schemas are not serialization contracts. The outer viewer is excluded from product UI. The latest two-line Chat/Character persona-link draft remains awaiting approval.

### Reference review

All 24 offline previews opened with no JavaScript errors; 17 current screens and 7 archived experiments were distinguished. The approved PNG set was visually inspected, with full-size inspection of chat, gear, message fan and model sheet. Actual interactions exercised model scope/selection/expansion/independent scrolling/dismissal; gear toggling/focus explanations; message edit/delete/Undo/fork; character Read/Edit/greeting organization; persona edit/return/link; Memory choice/one-batch/Stop; fresh-chat character selection; character/persona creation; World Info entry/long-editor/folder controls; global activation Save/Cancel; Connection proxy/model/test placeholders; and Appearance background changes. One reference-only World Info folder dialog placed its Cancel outside the viewer viewport; its real event handler was inspected via dispatched click. This does not authorize reproducing the viewer's modal-placement problem.

The approved static Soft still atmosphere, curved gear, immediate model sheet and tight message fan supersede older embedded elements. The atmosphere source still contains a permanent New reply button; the later written decision explicitly removes it. Selection scope tabs browse choices; selecting a model applies immediately. The bottom panel retains scope/target/effective source above an independently scrolling list. Save/Cancel remains appropriate for editors, not for that model selection. Message text remains natively selectable; gesture-only actions require accessible equivalents. The fans retain 48px opaque circles and focus/hold explanations; production placement must use the actual viewport and IME-sized space.

### Mapping and dependencies

| Area | UI change | Integration/storage dependency |
| --- | --- | --- |
| Chat | Charcoal/static blue-violet reading, slim identity header, simple composer, fans, real generation duration | Existing generation/history/recovery retained; additive independent-model migration in this phase |
| Preset | Full-page scoped editor; parameters collapsed; uninterrupted native entry order; conditional entry controls | Remember adjustments for each named preset at each scope; preserve markers, placement, triggers, unknown fields and global connection exclusion |
| Character | Read/Edit, isolated creator notes, greetings organizer, lorebooks, current-chat selector and targeted actions | Native card schema/PNG roundtrip, valid-name save, readiness rule, primary vs additional lorebook semantics; no silent association simplification |
| Chats | Recent-first compact portrait rows; + always fresh; exact resume; deletion confirmation/Undo | Existing + currently routes to character/resume behavior and must change in this later phase; create/verify before optional current-chat deletion |
| Characters library | Three-column circles; separate Import/Create; opening defaults to Edit | Existing authoring interface is interim; incomplete imports retained, no chat creation from management |
| Personas | Same compact grid; shared editor; picker selection, explicit links and replacement confirmation | Native last-used/manual/default/linked precedence; preserve multi-associations, saved fields and generation-idle mutation rules |
| Memory | Global configuration/chat-owned contents; saved layers, prompts, connection and maintenance | Registered API currently lacks much of intended full Summaryception UI; real editing/rebuild/import/cancel/skip semantics and verified memory/history coordination required |
| World Info | Folder/book/entry browser, full native technical editor, global activation | Resolve folder metadata compatibility; native conditional fields, entry overrides and Min Activations/Max Recursion Steps exclusion; retain all opaque lorebook fields |
| Home | Branding, engine/API known state and counts; Settings only here | Actual counts/status, no paid status ping; move settings entry off other library headers in that phase |
| Settings | Approved Connection and Appearance tabs | Proxy process ownership/control and remembered direct/proxy endpoints need launcher/bridge API; reading preferences need global persistence and honest saved-message metadata |

Cross-screen navigation remains five tabs with Home centered and tabs hidden in chat. Separate editors must return to their originating picker/library/chat. Native fields omitted by a reference remain supported/preserved. Long names need truncation plus accessible full identity; visible target-specific confirmations are necessary. Empty/loading/offline/unavailable/conflict states must use actual state, retaining local drafts and saved settings. API Not checked is valid; fixtures never become production defaults. Current character Prompt Override settings are preserved rather than silently reset.

Android Back should dismiss the current panel/menu before leaving a screen; keyboard may consume Back first. Touch controls need adequate separation and screen-reader names. IME resizing, edge gestures, interruption/background behavior and clipboard must be tested on Android: desktop emulation verifies placement/state, not OS behavior. Long creator HTML needs isolated sanitization in its own phase. Plain text selection and existing sanitized chat HTML/reasoning stay available now.

### Phased roadmap and release boundaries

1. **Chat (authorized now):** approved reading/header/composer, both fans, in-place edit and targeted delete, saved alternatives plus deliberate overswipe/accessibility action, actual duration, independent scoped models, visible pending/errors/Memory/recovery. Preserve current Preset/Persona/Memory destinations. Verify races, migration and mobile placement; package only after checks. User phone review before another major screen.
2. **Preset:** approved main/picker/entry/generation states, independent preset scope and remembered per-preset adjustments. Deliberate migration plus native prompt-order/marker/trigger/override tests. Do not pretend A → B → A memory is already implemented.
3. **Character and Chats, in reviewable subphases:** character content/editor/greetings/notes/associations and conversation actions; then recent chat list and character library/fresh-chat picker. Preserve ST validation/import/export and original-first fork/create/verify/delete order. Discuss the awaiting-approval two-line persona display here without reopening approved designs.
4. **Persona:** shared library/editor/picker and explicit native Chat/Character link operations with multi-association/precedence tests. Editing does not select/link. Targeted replacement/unlink confirmations.
5. **Memory:** extend adapted Summaryception through tested native APIs for snippets, injection preview, turns/layers, prompts, separate connection, stats and maintenance. Verify cancellation/skip/partial progress/import semantics and explicit rebuild. No automatic paid replay/rebuild or fabricated controls.
6. **World Info:** resolve folder storage before writing it, then browser/book actions, complete entry editor and global activation. Native-field roundtrips and activation/recursion tests precede release.
7. **Home and Settings, as separate coherent reviews:** lightweight Home and reading preferences can ship without service changes. Connection proxy switch requires real launcher/service integration and endpoint/key/model safeguards before showing operational controls. Android packaging/lifecycle remains a separate future decision.

The initial request implemented phase 1. After the user confirmed 0.7.0 chat on the phone and authorized continuing the roadmap, phase 2 (Preset) is the current authorized phase. The user subsequently authorized continuing without waiting for phone testing, requested a running phone-test checklist, and authorized committing each verified milestone. Continue in coherent subphases; record outstanding device checks in PHONE_TEST_CHECKLIST.md.


## Phase 1 outcome

The 0.7.0 chat phase implements the approved static reading/header/composer, viewport-aware accessible fans, inline message editing, targeted deletion/Undo, multi-select and deliberate eligible overswipe. Model selection uses real availability in a fixed-information/scrolling bottom panel, with independent model scope and an additive version-2 migration that retains native/foreign fields and old disabled selections. Generation durations use saved native timestamps only. Pending, saving, provider errors, Memory validity/activity and explicit recovery remain visible.

The rollout retained the existing plain-JavaScript frontend and operation bridge. New chat controls, model panel, icons and scoped-setting helpers are separate small modules. Preset, Persona, Memory and Conversations retain their existing destinations; full later-screen designs were not implemented. At the phase-1 boundary, preset adjustments per named preset, full Summaryception integration, proxy process control, persona multi-association presentation and World Info folder compatibility remain later work. The latest two-line persona-link draft remains pending approval.

Verification exposed and repaired stale queue-guard dispatch, pre-Send native message initialization, native runtime synchronization after Undo and premature Review during reconnect. Undo → Fork now preserves restored source messages and metadata. Full live suite: 65 assertions pass with zero page errors, real touch input, reduced/mobile viewports and an automatically coordinated fixture-only engine interruption/restart; request counters prove no replay. Automated suite: 101 tests pass. Native workspace: 28 assertions pass. ZIP/repair preservation checks pass. Final shipped-launcher smoke and all 11 HTML renderer checks pass; final accessibility expanded-state resets are verified. See `tests/TEST_REPORT.md` for packaged evidence and reproducible conditions.

The user subsequently confirmed chat works on the phone. Preset is now authorized; no APK migration, framework choice, commit or publication has been started. Browser checks do not prove Android IME/system gesture/background behavior.

## Phase 2: Preset

User authorization: “Let’s continue developing … already have a roadmap so you can proceed,” after the phone-confirmed chat phase. The approved Preset preview was exercised again in the offline viewer before implementation; native ST 1.19.0 source was inspected read-only. All six native triggers (including Regenerate) remain supported despite the illustrative five-option mockup.

0.7.1 implements the full-page main/picker/entry editor, browsing-only scope tabs, collapsed generation controls, native order and disabled rows, marker explanations, conditional placement/behavior and override protection. Explicit inheritance affects only the selected preset scope; model state remains separate. Scope-local named-preset banks are additive and retain existing copies before switching. Native files, unknown fields, other prompt orders and connection settings survive. Reset retains other remembered names. Actual native generation consumes edited prompts and samplers; pending changes remain on their originating target and cannot mutate an in-flight request.

Character is the next authorized major screen; phone review is deferred at the user’s request. The two-line persona association draft remains pending. No other major screen is redesigned in this phase.

Phase-2 evidence: 105 automated tests, 42 live preset checks, 65 chat regressions with actual restart/review, 28 native workspace assertions and 11 HTML checks pass. The package/repair checks are recorded in `tests/TEST_REPORT.md`. Android-only behavior remains a phone review requirement.

Delivery validation: matching 0.7.1 ZIP/repair pass; real updater retains 490 isolated data files byte-for-byte. Shipped-launcher handshake, first Send, unavailable selection and keyboard-sized entry footer checks pass.
