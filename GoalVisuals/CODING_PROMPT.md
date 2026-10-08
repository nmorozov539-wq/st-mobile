# Prompt for the coding chat

Paste the text below into the new chat. It authorizes evaluation, design review and phased implementation in that order.

---

We are developing **Pocket Tavern as an Android app** for SillyTavern 1.19.0 running locally through Termux. The current web/browser build is a **proof of concept** for the app interface, ST integration and operational safeguards. Android app use is the product direction; browser delivery is the present testing mechanism. No final Android framework or architecture has been selected. Do not start an APK/framework migration as part of this UI work.

Project: `/home/Riv/Projects/st-mobile`. Current build: 0.6.2. The previous 0.6.1 build is confirmed working and playable on my phone. We have spent a substantial discussion designing the interface. I want you to understand and evaluate the project first, review those designs second, and implement them in deliberate phases third. Do not jump directly into rewriting the frontend.

I am not technical. Explain findings plainly, give your own opinions, and push back when an idea conflicts with ST or our architecture. Ask specific, concrete questions in small blocks when a consequential decision is unresolved. Continue authorized work without repeatedly asking for permission.

## 1. Project overview and evaluation

Start by reading:

- `README.md` and `DESIGN_HANDOFF.md`.
- `prototype/IMPLEMENTATION.md` and `tests/TEST_REPORT.md`.
- `GoalVisuals/IMPLEMENTATION_GUIDE.md` and `GoalVisuals/README.md`.

Inspect the working tree, frontend in `prototype/frontend`, native bridge in `prototype/extension`, phone tools/build scripts, tests and adapted Summaryception in `vendor/Extension-Summaryception`. Check applicable repository instructions. Review relevant ST source read-only where needed. Run appropriate baseline checks before edits; prior documented results are not evidence that the current checkout passes.

Present a project overview and an evidence-based evaluation: what works now, how data/generation flow, what remains a prototype limitation, where the architecture supports the intended Android app, and what could obstruct the approved design. Distinguish verified problems from hypotheses and future work. Assess maintainability, state/storage compatibility, performance, recovery and extension integration. Do not propose a new framework or broad rewrite merely because the existing frontend is plain JavaScript.

Keep this evaluation focused on decisions that affect implementation. Publish the overview before beginning the design review, and give me an opportunity to steer while you continue useful independent inspection.

## 2. Review the agreed design

Open `GoalVisuals/interactive-design-reference.html` in a browser and inspect the interactions, not just the source. It is a self-contained offline collection of 24 previews. Review all current screens and the approved PNGs; earlier experiments are explicitly archived. Use the design index and guide as the behavioral authority.

Explain how the agreed design maps onto the current implementation. Identify visual changes, behavior changes, missing integration and storage migrations. Review cross-screen consistency, navigation, Android Back/keyboard/touch behavior, empty/error/loading states and accessibility. The mockups contain sample values, partial editors and placeholder actions; they do not authorize discarding native fields or hardcoding fixtures. Their outer reference viewer is not product UI.

The latest two-line Chat/Character persona-link draft is **awaiting approval**. Do not silently treat it as approved; leave that specific change pending or discuss it when its phase arrives. Preserve existing multiple associations and native semantics. Other previously approved designs should not be reopened without a concrete conflict or missing decision.

Produce a phased implementation roadmap covering the approved screens and their dependencies. Separate UI refinement from significant integration work such as independent scoped model/preset state, remembered per-preset adjustments, proxy process control and full Summaryception functionality. These remain intended requirements; do not fake them with working-looking controls. Identify what can safely ship first and what requires additional verification.

## 3. Implement in phases

After reporting the evaluation and design review, begin the first phase: the approved **chat screen**. This prompt authorizes that work; no additional generic permission request is needed. Complete and verify a coherent phase before moving to another. Review the result with me before starting the next major screen, so I can test it and steer the rollout. Do not attempt all screens in one rewrite.

The first phase includes:

- Quiet nearly full-width reading, dark charcoal and broad soft static blue-violet gradient; no background animation.
- Slim header: Back, character avatar/name, gear. Subtitle is the chat name only when the character has multiple chats; no model/roleplay subtitle.
- Simple composer with model picker and Send becoming Stop. Remove the permanent New reply control. A deliberate swipe past the final saved alternative can generate another; keep saved-alternative controls and an accessible non-gesture generation action.
- Curved icon-only gear fan for Preset, Persona and Memory, with accessible names and explanations. Preserve working destination access; their full redesigns belong to later phases.
- Corner ellipsis opens the tighter curved message-action fan. Preserve native text selection and existing edit/copy/fork/delete semantics. Another reply appears only where eligible. Retain existing functionality such as multi-select through a coherent accessible path rather than silently dropping it.
- Expandable model bottom panel with fixed scope/target/effective-model information above an independently scrolling list. Selection applies immediately; Back/outside dismisses. Use actual available models and preserve unavailable saved selections visibly. Model and preset must remain independent. If the current shared settings-copy schema requires migration for independent model scope, design and verify a compatible migration rather than faking the controls or losing settings. Remembered per-preset adjustments belong to the later preset phase.
- Generation duration is the agreed default message detail where actual metadata exists. Do not fabricate timings, model names or token counts, or add the full Appearance settings page in this phase.
- Keep saving, errors, pending changes, Memory validity and recovery visible when relevant, even though idle mockups omit them.

Do not redesign libraries, character/persona editors, World Info, Connection settings or Memory during the chat phase. Their approved references guide the roadmap. No new features, archived concepts or unrelated refactors.

## Safeguards and verification

ST remains the owner of characters, chats, personas, presets, secrets and generation. Preserve unknown native fields and existing data. The current hidden iframe is an implementation mechanism, not a decision about the final Android architecture.

Preserve generation ownership, verified persistence, conflict guards, durable pending changes, Stop settlement, Memory invalidation and Undo, restart review and recovery. Browsing/drafting elsewhere must not switch the generating target. Setting changes must not mutate captured in-flight requests. Never replay paid requests automatically or rebuild Memory without explicit user action. Preserve sanitized HTML/reasoning, reading position, streaming batching and bounded rendering.

Do not modify my original `/home/Riv/SillyTavern` installation or personal data. Use isolated fixtures and mock requests, without real keys or paid API calls. Preserve local user-provided proxy files. `history/` is an ignored local archive, not the current specification.

Run checks appropriate to each phase, including real UI/mock flows that expose races: first-click Send without artificial idle waits, Stop, alternatives, editing, deletion/Undo, fork, text selection, scoped-model changes during work and reconnect/recovery. Check mobile widths and menu placement. Report Android-only keyboard/gesture/background limitations honestly. Update active documentation and `tests/TEST_REPORT.md` with verified outcomes.

When the first phase is complete and checks pass, prepare a versioned phone package and matching repair helper, with consistent frontend/bridge versions and preserved ST data. Tell me how to test it on my phone. Do not commit or publish without my instruction in this new coding chat.
