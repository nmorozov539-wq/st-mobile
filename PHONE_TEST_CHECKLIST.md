# Pocket Tavern phone test checklist

All releases use the **0.7.* line**: Chat 0.7.0, Preset 0.7.1, Character content 0.7.2, Character actions 0.7.3, then further Character subphases. Release numbering does not change the saved-settings schema.

Chat was reported working on the phone. Unchecked items below remain device checks, even when desktop/mock checks pass. Development may continue while phone testing is unavailable; commit each verified milestone. Use a spare/test conversation for destructive checks.

## Installation and recovery

- [ ] Install the matching ZIP and repair helper; frontend and bridge show the same release.
- [ ] Existing characters, chats, personas, settings and local proxy files survive the update.
- [ ] Reconnect after a restart, review saved work and confirm no generation is automatically repeated.
- [ ] Leave and return to the browser, lock/unlock the phone and record interrupted generation or recovery behavior.

## Chat — 0.7.0 onward

- [ ] Send immediately after opening a conversation; exactly one user message and one request result.
- [ ] Stop a streaming response; the saved partial response remains after reopening.
- [ ] Browse another conversation and type a draft during generation; the original target remains unchanged.
- [ ] Switch scoped models during generation; the running response is unaffected and pending changes settle visibly.
- [ ] Select saved alternatives; deliberately swipe past the final alternative and try the accessible Another reply action.
- [ ] Select and copy native message text; confirm menus do not interfere with selection.
- [ ] Edit, delete/Undo, multi-select and fork a test conversation; reopening retains the expected messages.
- [ ] Confirm Memory invalidation and Undo notices remain visible after history changes.
- [ ] Check reading position, long replies and scroll-to-latest behavior.
- [ ] Check fans and model panel at your phone width, with the keyboard open, large text and rotation.
- [ ] Android Back dismisses the keyboard/panel before leaving chat; edge gestures do not accidentally generate.
- [ ] Long character/chat/model names remain readable; unavailable saved models stay identified.

## Preset — 0.7.1 onward

- [ ] Browse Global/Character/Chat scopes without changing their saved settings.
- [ ] Adjust preset A, choose B, then A: adjustments return, including after a restart.
- [ ] Preset choices do not change independently scoped models.
- [ ] Explicit inheritance removes only the chosen scope’s override.
- [ ] Edit an entry’s text, role, placement and generation types; Save applies and Cancel preserves the previous values.
- [ ] Built-in markers explain their source; their generated content is not presented as editable static text.
- [ ] Change settings during generation; pending changes keep their original scope and target.
- [ ] Reset one preset’s remembered adjustments; other remembered presets and model settings remain.
- [ ] Save/Cancel remains reachable above the keyboard; long entry lists scroll comfortably.

## Character content — 0.7.2 onward

- [ ] Read/Edit choice is remembered separately for each character.
- [ ] Description, main greeting, alternate greetings and advanced fields survive a save/reopen.
- [ ] Greeting organization preserves every greeting when reordering or changing the main greeting.
- [ ] Creator notes expand safely; formatting stays inside the notes preview.
- [ ] Portrait, tags, unknown native fields and embedded lorebook survive editing.
- [ ] Character drafts remain available during generation; saved writes require an idle engine.
## Character actions — 0.7.3 onward

- [ ] Open the inline overflow from a long scrolled card; it remains visible, and Back restores your reading position before leaving Character.
- [ ] Export PNG and JSON on Android; confirm the download completes and can be re-imported by ST.
- [ ] Duplicate a disposable card; its portrait, greetings, lorebook and unknown native fields survive without switching your chat.
- [ ] Actions are blocked for an unsaved draft; cancelling the draft restores saved-card actions.
- [ ] Delete a disposable card with the chat checkbox off; chat files remain, and the confirmation identifies the exact card filename.
- [ ] Delete another disposable card with the chat checkbox on; only its chats are removed. Card deletion has no Undo.
- [ ] Cancel the deletion confirmation; the card stays intact.
- [ ] Export during generation; the generating target and request remain unchanged, while Duplicate/Delete are disabled.
- [ ] An unsaved temporary conversation in native ST blocks deletion visibly and retains its text.

## Character integration — upcoming subphase

- [ ] Persona associations preserve multiple links and native precedence; the two-line draft remains pending approval.
- [ ] Test each newly shipped character action here as its subphase is completed.
