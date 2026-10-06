# Combined prototype completion audit

The goal is active. The implementation checkpoint is ready; phone and real-provider verification remain required before claiming completion.

| Requirement | Evidence | Status |
| --- | --- | --- |
| Combined folder and one launch command | prepare.cjs copies ST/defaults/dependencies; start.cjs exercised in normal and mock modes | PC verified |
| Independent installed dependencies | Real copied node_modules directory, zero symlinks in the PC fixture | PC verified; phone copy pending |
| Standard ST data ownership | Launcher uses installation/data; mutations go through ST; persistence readback and migration fixtures pass | Verified with isolated data |
| ST generation and saving | Local mock received complete prompts; streamed/stopped replies and reasoning read back from disk | PC verified |
| Connection/model controls | Source switching and empty-key guard exercised; ST secret/model handlers audited | Real OpenRouter key, model list and generation pending |
| Presets/personas/global lorebooks | Live selections persisted; mock saw temperature 0.25 and both distinctive prompt fixtures | PC verified |
| Thinking display and chat deletion | Live collapsible reasoning during streaming/reload; confirmed deletion removed a disposable file and loaded a saved replacement | PC verified |
| Android/Termux combined operation | Earlier separate v3 kit was user-validated; combined v0.4 feedback requested | Pending; earlier kit is not proof of this build |
| Working preview/tests/documented limits | Local preview running; 49 tests pass; README and TEST_REPORT record scope | Verified |
| Move to real data | Offline copy tool refuses merges/overwrites; synthetic tests pass | Tool ready; personal migration intentionally deferred |

Phone checklist: prepare a fresh combined folder, start it with one command, connect OpenRouter using a key entered only in the app, load/select the intended model, send and stop a reply, inspect any exposed thinking, and reload to check saved content. Check preset/persona/lorebook selections using disposable imported fixtures. Report errors without pasting credentials. The outstanding phone/provider evidence cannot be produced by rerunning PC mock tests.
