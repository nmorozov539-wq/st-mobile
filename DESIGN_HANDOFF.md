# Pocket Tavern: handoff for visual and UX refinement

Updated 8 October 2026. Project: `/home/Riv/Projects/st-mobile`.

## What the user wants next

The user confirms 0.6.1 works on Android and is playable. The interface still looks raw and is not convenient. Treat functional stability as the baseline, not proof of design quality. Refine one area at a time, discussing concrete choices in small blocks before implementation. A fresh chat is preferred for visual design and context clarity. Start with the chat screen, the most-used surface; agree on a visual direction before changing other screens. Do not do another broad redesign or invent library systems.

0.6.2 addresses the immediate complaints: message long-press is now one second with cancelled/abandoned press cleanup; auto-follow engages only at the real bottom, with one CSS pixel of fractional rounding tolerance. Phone comfort still needs feedback. Root ZIP and repair script are ready; ordinary phone data remains unchanged by updating.

## Product and data

Pocket Tavern is a mobile browser frontend for ST 1.19.0, served alongside native ST by one Termux launcher. No Android APK yet. It runs a hidden native ST iframe as the engine bridge; ST owns standard `data/default-user` storage, secrets, generation, characters, personas, presets and Summaryception memory. Do not change the original `/home/Riv/SillyTavern` installation or personal data. Development uses an isolated mock fixture, historically `/tmp/pocket-combined-engine`, ports 8123/8124. Check whether it is running rather than assuming temporary files survived.

Frontend: plain JavaScript modules, HTML and CSS in `prototype/frontend`. Native bridge: `prototype/extension`. Phone tools: `phone-package`; builder: `scripts/build-phone-package.py`. Patched Summaryception is vendored in `vendor/Extension-Summaryception` (AGPL). Read README, UI_OVERHAUL and TEST_REPORT before implementation.

## Agreements to preserve

- Five tabs: WI, Characters, Home in the middle, Chats, Personas. Hidden inside chat. Home shows connection/model/preset, Continue and recent chats. Tapping Home while already there continues the last chat; discoverability work is deferred.
- Chat: slim header, character fields accessible through avatar/name, model/preset subtitle, settings. Model chip beside composer; model selection applies without Save. Send becomes Stop during generation.
- Global, optional character copy, optional chat copy; Chat > Character > Global. Turning an override off retains its copy. Reset copies Global without disabling it. Model and preset remain independent; connection credentials/source/endpoint stay global. One shared preset component with visible entry toggles, closed entry contents and a full-screen text editor.
- Browse other saved chats and draft while one generation stays bound to its original target. One generation at a time. Committed settings/history changes may queue durably; drafts never auto-send. After restart, review uncertain saved work; never replay a paid request automatically.
- Existing alternatives loop. New reply is an explicit paid action. Gestures are shortcuts with visible buttons, and Android edges are reserved for system Back. Message menu supports edit/copy/delete/multi-select/fork. Chat swipe reveals Delete; no archive yet. Deletion has short Undo.
- Restrained distinction for user messages; mostly full-width messages. Thinking initially collapsed; a new reply inherits the preceding assistant reply's expansion choice. Sanitized HTML/font colours/details are supported.
- Summaryception enable/pause/frequency is global. Written memories are read-only in this scope. Changed summarized history retains memory but disables stale injection/automatic work; Undo restores history and memory together. No automatic paid rebuild.
- WI/character/persona editors are interim native-compatible placeholders. General extension support is a later goal. Groups, archives, connection profiles, marketplace and APK migration are out of scope.
- Judge performance against comfortable use on a real phone. Streaming batches per animation frame; long lists/messages use rendering windows. Do not introduce fade-in effects or jump scrolling.

## Stability lessons

0.6.0's native harness inserted idle waits and missed the real first-click activation/send race. 0.6.1 fixed no-op Memory reservations, explicit alternative generation independent of ST's overswipe setting, in-place alternative updates and stale reconnect responses. Preserve these boundaries and test actual UI flows, not only isolated calls.

Validation baseline: 94 automated tests pass. 28 real native ST/mock assertions passed for 0.6.1, plus browser checks of Send, New reply, arrows, horizontal drag, deletion leaving a user last, and shutdown → Reconnect → Review → Send. 0.6.2 updates bottom-follow regression boundaries. Android touch/keyboard/appearance validation remains user feedback, not something PC tests establish.

## Useful references and workflow

`demo.zip` is the user's draft visualization, not final styling. `UI_OVERHAUL.md` records behavior/storage/limits. `FOUNDATION_REVIEW.md` records the source investigation. User screenshots and `or-proxy/` are user-provided, untracked files; preserve them.

Run `npm test` for relevant regression coverage. Build a complete versioned ZIP, copy it to the project root and provide its matching root `repair-pocket.cjs`. Keep frontend/bridge stamps and imports consistent. Phone update: stop the launcher, place ZIP + script in Downloads, run `node ~/storage/downloads/repair-pocket.cjs`, reload and check both versions. Back up/preserve ST data. No paid model calls or keys are needed for mock testing.
