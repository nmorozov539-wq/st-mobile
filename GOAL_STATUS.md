# Combined prototype completion audit

The phone test exposed a connection usability failure; a corrective build is under validation. The implementation checkpoint is ready; those checks remain required before claiming completion.

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
| Working preview/tests/documented limits | Local preview running; 53 tests pass; README and TEST_REPORT record scope | Verified |
| Move to real data | Offline copy tool refuses merges/overwrites; synthetic tests pass | Tool ready; personal migration intentionally deferred |

Phone checklist: prepare a fresh combined folder, start it with one command, connect OpenRouter using a key entered only in the app, load/select the intended model, send and stop a reply, inspect any exposed thinking, and reload to check saved content. Check preset/persona/lorebook selections using disposable imported fixtures. Report errors without pasting credentials. The outstanding phone/provider evidence cannot be produced by rerunning PC mock tests.

## Later extension support

The user wants general SillyTavern extension support in later stages. Summaryception (https://github.com/Lodactio/Extension-Summaryception) is the first required compatibility case, not the limit of the extension strategy. Prefer reusing ST's extension loading, events, settings, and chat metadata. Plan a general way to expose extension controls, dialogs, progress, and errors in the mobile frontend; extensions that depend heavily on ST's visible DOM may still require individual adaptations. General compatibility is a future requirement, not a promise that arbitrary extensions already work. Current phone validation takes place before Summaryception integration.

## Usability requirements exposed by phone testing

The user requires character import/create/edit with all relevant card fields, persona import/create/edit, and preset import/create/edit including prompt toggles and manual fields such as requested word count/message length. Selectors alone do not satisfy these requirements. Full ST editors are an interim route, not completed native mobile editing support. Connection must save a pasted key when Connect is pressed, visibly show progress, automatically refresh models, and report failures in Pocket Tavern. No real-provider success is claimed until phone verification.
