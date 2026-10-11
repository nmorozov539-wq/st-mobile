# Pocket Tavern phone test checklist

All releases use the **0.7.* line**: Chat 0.7.0, Preset 0.7.1, Character content 0.7.2, Character actions 0.7.3, association visibility 0.7.4, association controls 0.7.5, conversation selector 0.7.6 new-chat workflow 0.7.7 Characters/Chats libraries 0.7.8 and Memory 0.7.9. Release numbering does not change the saved-settings schema.

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

## Character association visibility — 0.7.4

- [ ] Existing character-linked persona appears beneath its portrait in both Read and Edit; tap to read its full name.
- [ ] Multiple native persona links show a count and all full names, without selecting one or changing links.
- [ ] Primary lorebook appears first, then additional attachments; unavailable saved names remain visible.
- [ ] A card with only an embedded lorebook says so; no book is silently promoted to primary.
- [ ] Back/outside tap closes the persona sheet and preserves the character draft; test Android Back with the keyboard open.
- [ ] Long names and the sheet remain readable with large text, rotation and your phone width.
- [ ] Reading associations during generation leaves the original generating target and settings unchanged.

Association editing/removal follows in 0.7.5 below; the redesigned chat selector remains upcoming.

## Character association controls — 0.7.5

- [ ] With one linked persona, Edit persona opens its existing editor; Save and Cancel return to the same Character draft, portrait draft and selected greeting.
- [ ] Start a persona Save, return to the Character draft before it finishes, and verify the delayed result preserves that draft.
- [ ] Confirming Remove link removes only that character connection; the persona, default persona and unrelated chat/group/character links remain.
- [ ] Multiple native persona links remain visible without choosing or removing one.
- [ ] Connect an actual saved lorebook as Additional; the card export does not embed additional books.
- [ ] Connect/replace Primary; PNG/JSON exports contain the selected book and retain other native card fields.
- [ ] Unattach Primary with confirmation; the embedded copy is removed and additional books remain separate.
- [ ] Detach a missing additional book or one duplicate; verify other links survive reopening/restart.
- [ ] During generation, browse association sheets; mutation controls stay disabled, the original target/request stays intact and Stop settles.
- [ ] Save an association then immediately open a fresh chat and Send; no stale busy refusal or duplicate request.
- [ ] Change the same native card/settings elsewhere while its sheet is open; verify conflict feedback and inspect saved work before another attempt.
- [ ] Check Back/outside dismissal, long lorebook names, large text, picker scrolling and keyboard-sized Save/Cancel on your phone.

## Character conversation selector — 0.7.6

- [ ] With one chat, verify no current-chat selector appears above the portrait.
- [ ] With multiple chats, open the thin current-chat line, choose an existing chat and verify Character stays open with your unsaved edits retained.
- [ ] Check long names and scrolling on your phone; Done, outside touch and Android Back dismiss only the selector.
- [ ] Start a reply, open Character and switch chats. Confirm the reply stays in its original chat and Stop settles it there.
- [ ] Check per-chat composer drafts and reading position when switching back.
- [ ] Character overflow still opens Conversations. New-before-optional-delete confirmation is the next subphase.
- [ ] Check keyboard, background/reconnect and TalkBack behavior on Android; desktop checks cannot establish these.

## New-chat workflow — 0.7.7 onward

- [ ] Open Start new chat from Character overflow; it names the actual character/source and Delete current starts unchecked each time.
- [ ] Cancel/Back returns to Character without creating a chat or losing your draft/reading position.
- [ ] Start with deletion off: actual greeting and alternatives appear, old chat and its Memory remain, and no AI request is made.
- [ ] Start with deletion on using a disposable conversation: new greeting is saved before old chat deletion; Undo restores the old chat and its Memory while retaining the new one.
- [ ] Check confirmation on small widths, rotation, large text and TalkBack; action explanations and Cancel remain reachable.
- [ ] During a reply, browsing and conversation selection remain available; Start new chat stays blocked, and Stop saves to the original generating target.
- [ ] After an interrupted new-chat save/delete, reconnect and inspect saved work; creation/deletion never repeats automatically. Restore old chat only when it is missing.
- [ ] Incomplete/unsaved cards and independently changed saved chats block creation with a useful explanation.

## Characters and Chats libraries — 0.7.8

- [ ] Character grid stays three columns; long names, missing portraits and Incomplete warnings remain understandable with large text.
- [ ] Tapping a character opens Edit and creates/selects no conversation.
- [ ] Import native PNG/JSON and another supported format; existing cards, unknown fields and chats survive.
- [ ] Create a named incomplete card; Save works, Incomplete appears, Start chat stays unavailable.
- [ ] Complete/save that card; Start chat opens one actual greeting with its saved alternatives, without an AI request.
- [ ] Dirty character edits disable Start chat; Cancel preserves the saved card.
- [ ] Chats + opens the picker; Back creates nothing; picking a complete character always starts fresh.
- [ ] Existing chat row resumes the exact selected conversation.
- [ ] Left swipe reveals Delete without opening the chat; right swipe hides it. Chat ellipsis names the deletion target; Cancel preserves it; Delete/Undo restores messages, valid Memory and native fields.
- [ ] Browse Characters/Chats during generation; draft editing stays available, mutations wait, Stop saves to the original target.
- [ ] Rapidly tap Start chat; exactly one new conversation is created.
- [ ] Interrupt a fresh save by reloading/restarting; saved-work review appears and creation never automatically repeats.
- [ ] Check scrolling/reading positions, navigation icons, keyboard, Android Back and TalkBack on the grid and picker.

## Memory — 0.7.9

- [ ] Gear → Memory opens the full page; Back returns to the same chat and scroll position.
- [ ] Status, Enable/Pause, Summarize now and Save settings work; Save stays disabled until something changes and the keyboard never hides the focused field.
- [ ] Saved memories: layer tabs, Edit, Regenerate (Layer 0 only, cost confirmation) and Delete each change only the chosen snippet and survive leaving and reopening the chat.
- [ ] Injection preview matches what is sent; Refresh updates it after an edit.
- [ ] Turns & layers, prompts (preset, Custom, saved prompts, wrapper, strip patterns) and output limit save and persist after an engine restart.
- [ ] Maintenance: Export saves a JSON file; Import replaces memory after confirmation; Repair; Clear memory (confirmation) then Summarize now rebuilds after a history edit; Reset to defaults keeps memories and saved prompts.
- [ ] Catch-up choice appears in the page and above the chat; All, One batch, Skip and Cancel behave; Stop in the chat bar shows “Summarization stopped · Progress saved”; completion shows “Memory saved”.
- [ ] A non-default Summaryception connection explains itself and Use the main ST connection switches it back.
- [ ] Android system Back, large text and TalkBack on the page, dialogs and file pickers (import/export).
