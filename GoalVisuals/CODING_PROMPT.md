# Prompt for the first coding session

Paste the text below into the coding chat when ready to authorize the first implementation phase.

---

We are developing Pocket Tavern, a mobile frontend for SillyTavern 1.19.0 running locally on Android through Termux.

Project: `/home/Riv/Projects/st-mobile`. Build 0.6.2 is the current baseline; 0.6.1 is confirmed working and playable on my phone. We have completed a substantial design discussion and saved the references. Your task is to implement the first phase: the approved chat-screen visual and interaction refinement. Do not attempt all screens in one rewrite.

Read, in order:

- `README.md` and `DESIGN_HANDOFF.md`.
- `GoalVisuals/IMPLEMENTATION_GUIDE.md` and `GoalVisuals/README.md`.
- `prototype/IMPLEMENTATION.md` and `tests/TEST_REPORT.md`.

Open and inspect `GoalVisuals/interactive-design-reference.html` in a browser. It is a self-contained offline collection of 24 interactive mockups, with current designs first and older experiments archived. Inspect the approved PNGs as well. Do not treat fixture values, temporary preview state, incomplete editors or historical variants as requirements. The latest two-line character persona-link draft is awaiting approval and is outside this phase.

Before editing, inspect the frontend, native bridge, existing tests and working tree. Give me a concise implementation plan identifying what is already supported and what requires a behavior/storage change. Then implement the authorized chat phase, preserving working functionality. Ask concrete small questions only when an unresolved choice materially affects the result; I am not technical. Explain conflicts with ST or the architecture plainly.

For this phase:

- Quiet nearly full-width chat reading; dark charcoal, broad soft static blue-violet gradient. No animated background.
- Slim header: Back, character avatar/name, gear. Chat-name subtitle only when the character has multiple chats; no model/roleplay subtitle.
- Simple composer: writing area, model picker, Send becoming Stop. Remove the permanent New reply control; deliberately swiping past the final saved alternative can generate another. Preserve saved-alternative controls and a non-gesture generation action.
- Curved icon-only gear fan for Preset, Persona and Memory. Preserve working destination access; do not redesign those full screens in this phase. Keep accessible names and explanations.
- Corner ellipsis opens the tighter curved message-action fan. Preserve native text selection. Edit, copy, fork and delete retain their existing semantics; another reply appears only where eligible. Retain existing functionality such as multi-select without inventing or silently dropping behavior.
- Approved expandable model bottom panel: fixed top information/scope/effective model; independently scrolling model list; immediate selection and Back/outside dismissal. Use real available models. Model and preset must remain independent. If independent model scope requires changing the current shared settings-copy schema, design and verify a compatible migration as part of this change rather than faking the scopes or losing existing data. Returning to each preset's adjustments is a later preset phase.
- Generation duration is the agreed default message detail where actual metadata exists. Do not fabricate timing/model/token metadata or add the full Appearance settings page in this phase.
- Keep errors, saving, pending changes, Memory validity and recovery visible when relevant, even though idle mockups omit them.

Preserve generation ownership, persistence/readback, durable queued changes, Stop settlement, Memory invalidation and Undo, restart review and recovery safeguards. Never replay paid requests automatically. Preserve sanitized HTML/reasoning, reading position, streaming performance and bounded rendering. Do not replace ST storage or discard unknown card/preset/chat fields. No changes to my original `/home/Riv/SillyTavern` installation or personal data; use isolated fixtures and mock requests.

Do not redesign libraries, character/persona editors, World Info, Connection settings or Memory yet. Those approved references guide later phases. Do not introduce new features or revive archived concepts.

Run relevant automated regressions and real UI/mock checks, including first-click Send without artificial idle waits, Stop, alternatives, editing, deletion/Undo, fork, text selection, scoped-model changes during work and reconnect/recovery. Check mobile widths, menu edges and keyboard-related layout where testable. Report Android-only limitations honestly. Update the active docs and test report with verified results.

When this phase is complete and checks pass, prepare a versioned phone package and matching repair helper, keep frontend/bridge versions consistent, and tell me how to test it on my phone. Do not commit or publish without my instruction in this coding chat.
