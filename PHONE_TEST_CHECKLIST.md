# Pocket Tavern — phone test checklist

Every screen built so far, in the order you would meet it. One list, so a testing session can run top to bottom.

All releases are on the **0.7.\* line** and none of them change the saved-settings schema: Chat 0.7.0, Preset 0.7.1, Character content 0.7.2, Character actions 0.7.3, association visibility 0.7.4, association controls 0.7.5, conversation selector 0.7.6, new-chat workflow 0.7.7, Characters/Chats libraries 0.7.8, Memory 0.7.9, World Info 0.7.10, Settings 0.7.11, Home 0.7.12, review pass 0.7.13.

Chat has been confirmed working on the phone. Everything else below is still a device check, even where desktop and mock checks pass — 229 automated tests and the browser suites all pass, and they cannot tell us anything about the on-screen keyboard, system Back, touch targets or real data volumes.

**Before you start:** install the matching ZIP, reload `/st-mobile/`, and set aside a spare character, a spare chat and a spare World Info book for anything destructive.

**When something is wrong**, the useful report is: which screen, what you tapped, what you expected, what happened. A screenshot beats a description.

**Three things I especially want your verdict on**, because I cannot test them here:

1. Typing in the Settings Connection fields — does the keyboard behave, and does focus stay put? (Section 4.)
2. Does the proxy status detect a proxy that is genuinely running? (Section 4.)
3. Do the Export buttons actually download a file on the phone — World Info books, character PNG/JSON, Memory export? (Sections 11, 16, 17.)

---

## 1. Install, update and recovery

- [ ] Install the matching ZIP and repair helper; the app and the engine bridge report the same release (Settings → Connection, at the bottom).
- [ ] Existing characters, chats, personas, settings and local proxy files survive the update.
- [ ] Reconnect after a restart, review saved work, and confirm no generation is repeated automatically.
- [ ] Leave and return to the browser, and lock and unlock the phone: note what happens to an interrupted generation and to recovery.
- [ ] Nothing in SillyTavern's own interface broke — open it on the desktop and check characters, chats, personas and World Info.

## 2. Getting around

- [ ] The five tabs (WI, Characters, Home, Chats, Personas) all work, and the current tab is marked.
- [ ] Every screen fits the phone: no sideways scrolling, nothing cut off at the edges.
- [ ] Nothing hides under the notch, the status bar or the home-gesture bar.
- [ ] Every button, checkbox and switch is comfortably tappable one-handed.
- [ ] Android Back goes back one step rather than leaving the app, on every page: entry editor → World Info, activation → World Info, Settings → where you came from, Memory → chat, persona editor → Personas.
- [ ] Android Back closes an open dialog or sheet without performing the action behind it.
- [ ] Android Back dismisses the keyboard or an open panel before leaving a screen.
- [ ] Edge gestures do not trigger anything by accident — above all, they never start a generation.
- [ ] Rotate to landscape and back on each screen: nothing is lost or stuck.
- [ ] Repeat the pass with the system font set large: text stays readable and layouts hold.
- [ ] TalkBack can reach and announce the controls on each screen.
- [ ] Long names — characters, chats, models, books, personas — wrap or truncate readably rather than overflowing.

---

## 3. Home — 0.7.12

- [ ] Home shows the tagline, Engine and API connection rows, and the Characters / Chats / Personas counts.
- [ ] The counts match your real library.
- [ ] Engine says Connected; during a reply it says Working, and returns to Connected afterwards.
- [ ] Stop the engine or go offline: Engine becomes Not connected without you reloading the page.
- [ ] API connection says Not checked until you actually run Connect or Test message in Settings.
- [ ] After a failed Connect it says Not connected; after a successful one, Connected.
- [ ] Opening Home never causes a provider request or a charge.
- [ ] The gear opens Settings; Back returns to Home.
- [ ] The version in the footer matches the installed release.
- [ ] Home has no Continue / Recent / model shortcuts — those belong to Chats and the chat screen.

## 4. Settings · Connection — 0.7.11

- [ ] The gear on Home and the connection link in the chat model picker both open this page; Back returns where you came from (Home, or straight back into the chat).
- [ ] The engine row shows Connected · Local, and Reconnect works.
- [ ] The endpoint, model and key status shown are your real saved values, not placeholders.
- [ ] **Keyboard:** tap the endpoint field, type, then tap straight into the API key field — focus lands in the key field, your typing is not lost and the keyboard does not close. *(This was broken before 0.7.13; please be thorough.)*
- [ ] The keyboard does not cover the field you are typing in; the page scrolls as needed.
- [ ] The eye button shows and hides the key, and the typed text survives the switch.
- [ ] The key field shows "Saved key · Leave blank to keep" when a key is stored, and leaving it blank keeps that key.
- [ ] Use proxy on: the endpoint switches to `http://127.0.0.1:8001/api/v1` and the label reads Proxy.
- [ ] Use proxy off: your previous direct endpoint comes back — not a blank field — labelled Direct.
- [ ] With the proxy actually running, the line under the switch says Proxy running. **If it says "not detected" while the proxy is clearly running, tell me — that check may not work inside Android's browser.**
- [ ] With the proxy stopped it says Proxy not detected, and Connect fails with a readable message rather than hanging.
- [ ] Connect with a good key reports Connected and the number of models.
- [ ] Connect with a deliberately wrong key or endpoint reports a clear failure, leaves nothing half-saved, and still works after you fix it.
- [ ] The model dropdown lists your provider's models; the one you pick stays picked after Connect.
- [ ] A long model list scrolls and stays usable.
- [ ] "Enter a model ID…" shows a text field, and a manual ID is accepted and used.
- [ ] The refresh button beside the model list reloads it.
- [ ] Test message sends one small request, names the model it used, and shows the reply.
- [ ] Test message on a broken connection fails with a message instead of hanging.
- [ ] After Connect, open a chat and send a message: generation works with the saved settings.
- [ ] Per-chat and per-character model choices still override the global model.
- [ ] While a reply is generating, Connect and Test message are refused with an explanation rather than interfering.
- [ ] With the engine stopped, the gear still opens Settings, Connection shows the problem with a Try again button, and Appearance still works.

## 5. Settings · Appearance & reading — 0.7.11

- [ ] Text size: dragging the slider is smooth, and the preview resizes as you drag.
- [ ] The chosen size applies to real chat messages, not just the preview.
- [ ] Compact / Normal / Spacious change line spacing in a real chat.
- [ ] Plain / Gradient change the chat background, and Plain is genuinely plain.
- [ ] Generation time is on by default and appears under replies that have timing.
- [ ] Clock timestamp, Model icon and Token count are off by default, and appear when switched on.
- [ ] A detail never shows a made-up value: on an older reply without that data, the detail is simply absent.
- [ ] Tapping the model icon under a reply shows the full model name.
- [ ] The settings survive closing and reopening the app, and a phone restart.
- [ ] They change nothing inside SillyTavern itself — they are device-only.
- [ ] Very large text sizes do not break the chat layout or the composer.

---

## 6. Chat — 0.7.0

- [ ] Send immediately after opening a conversation: exactly one user message and one request.
- [ ] Stop a streaming response; the saved partial response is still there after reopening.
- [ ] Browse another conversation and type a draft during generation; the original target is unchanged.
- [ ] Switch scoped models during generation; the running response is unaffected and pending changes settle visibly.
- [ ] Select saved alternatives; deliberately swipe past the final one and try the accessible Another reply action.
- [ ] Select and copy message text; the menus do not interfere with selection.
- [ ] Edit, delete and Undo, multi-select, and fork a test conversation; reopening keeps the expected messages.
- [ ] Memory invalidation and Undo notices stay visible after history changes.
- [ ] Reading position, long replies and scroll-to-latest behave.
- [ ] The gear fan and the model panel work at your phone width, with the keyboard open, with large text, and after rotation.
- [ ] Unavailable saved models stay identified rather than silently replaced.

## 7. Preset — 0.7.1

- [ ] Browse the Global, Character and Chat scopes without changing their saved settings.
- [ ] Adjust preset A, choose B, then A again: the adjustments come back, including after a restart.
- [ ] Preset choices do not change independently scoped models.
- [ ] Explicit inheritance removes only the chosen scope's override.
- [ ] Edit an entry's text, role, placement and generation types; Save applies and Cancel keeps the previous values.
- [ ] Built-in markers explain their source, and their generated content is not presented as editable static text.
- [ ] Change settings during generation; pending changes keep their original scope and target.
- [ ] Reset one preset's remembered adjustments; other remembered presets and model settings survive.
- [ ] Save and Cancel stay reachable above the keyboard, and long entry lists scroll comfortably.

---

## 8. Characters library — 0.7.8

- [ ] The grid stays three columns; long names, missing portraits and Incomplete warnings stay understandable with large text.
- [ ] Tapping a character opens Edit, and creates or selects no conversation.
- [ ] Import a native PNG and JSON, and one other supported format; existing cards, unknown fields and chats survive.
- [ ] Create a named incomplete card: Save works, Incomplete appears, Start chat stays unavailable.
- [ ] Complete and save that card: Start chat opens one actual greeting with its saved alternatives, and makes no AI request.
- [ ] Unsaved character edits disable Start chat; Cancel preserves the saved card.
- [ ] Rapidly tap Start chat: exactly one new conversation is created.
- [ ] Browse the library during generation: draft editing stays available, mutations wait, and Stop saves to the original target.
- [ ] Scrolling, reading positions, navigation icons, keyboard, Back and TalkBack all behave on the grid and the picker.

## 9. Character editor · content — 0.7.2

- [ ] The Read/Edit choice is remembered separately for each character.
- [ ] Description, main greeting, alternate greetings and advanced fields survive a save and reopen.
- [ ] Greeting organization preserves every greeting when reordering or changing the main one.
- [ ] Creator's notes expand safely, and their formatting stays inside the notes preview.
- [ ] Portrait, tags, unknown native fields and the embedded lorebook survive editing.
- [ ] Character drafts stay available during generation, while saved writes wait for an idle engine.

## 10. Character actions — 0.7.3

- [ ] Open the inline overflow from a long scrolled card: it stays visible, and Back restores your reading position before leaving.
- [ ] **Export PNG and JSON: the download completes on the phone and SillyTavern can re-import it.**
- [ ] Duplicate a disposable card: portrait, greetings, lorebook and unknown native fields survive, and your chat does not switch.
- [ ] Actions are blocked for an unsaved draft; cancelling the draft restores them.
- [ ] Delete a disposable card with the chat checkbox off: the chat files remain, and the confirmation names the exact card filename.
- [ ] Delete another disposable card with the checkbox on: only its chats go. Card deletion has no Undo.
- [ ] Cancel the deletion confirmation: the card is intact.
- [ ] Export during generation: the generating target and request are unchanged, while Duplicate and Delete are disabled.
- [ ] An unsaved temporary conversation in SillyTavern blocks deletion visibly and keeps its text.

## 11. Character associations · persona and lorebooks — 0.7.4 and 0.7.5

- [ ] An existing character-linked persona appears beneath its portrait in both Read and Edit; tap to read its full name.
- [ ] Several native persona links show a count and all the full names, without selecting one or changing the links.
- [ ] The primary lorebook appears first, then additional attachments; saved names that no longer exist stay visible.
- [ ] A card with only an embedded lorebook says so, and no book is silently promoted to primary.
- [ ] Back or an outside tap closes the persona sheet and keeps the character draft — test with the keyboard open.
- [ ] With one linked persona, Edit persona opens its editor; Save and Cancel both return to the same character draft, portrait draft and selected greeting.
- [ ] Start a persona Save, return to the character draft before it finishes, and check the delayed result preserves that draft.
- [ ] Confirming Remove link removes only that character connection: the persona, the default persona, and unrelated chat, group and character links remain.
- [ ] Connect a real saved lorebook as Additional: the card export does not embed additional books.
- [ ] Connect or replace Primary: PNG and JSON exports contain the selected book and keep the other native card fields.
- [ ] Unattach Primary with confirmation: the embedded copy goes and additional books stay separate.
- [ ] Detach a missing additional book, or one duplicate: the other links survive reopening and a restart.
- [ ] During generation, association sheets can be browsed, mutation controls stay disabled, the original target and request stay intact, and Stop settles.
- [ ] Save an association, then immediately open a fresh chat and Send: no stale busy refusal and no duplicate request.
- [ ] Change the same card or settings elsewhere while its sheet is open: the conflict is explained, and saved work can be inspected before another attempt.
- [ ] Long lorebook names, picker scrolling and keyboard-sized Save/Cancel all work at your phone width.

## 12. Current-chat selector — 0.7.6

- [ ] With one chat, no current-chat selector appears above the portrait.
- [ ] With several chats, the thin current-chat line opens, and choosing an existing chat keeps Character open with your unsaved edits.
- [ ] Done, an outside touch and Android Back dismiss only the selector.
- [ ] Start a reply, open Character and switch chats: the reply stays in its original chat and Stop settles it there.
- [ ] Per-chat composer drafts and reading position survive switching back.
- [ ] The Character overflow still opens Conversations.

## 13. Start new chat — 0.7.7

- [ ] Start new chat from the Character overflow names the actual character and source, and Delete current starts unchecked every time.
- [ ] Cancel or Back returns to Character without creating a chat or losing your draft and reading position.
- [ ] With deletion off: the real greeting and alternatives appear, the old chat and its Memory remain, and no AI request is made.
- [ ] With deletion on, using a disposable conversation: the new greeting is saved before the old chat is deleted, and Undo restores the old chat and its Memory while keeping the new one.
- [ ] During a reply, browsing and conversation selection stay available, Start new chat stays blocked, and Stop saves to the original target.
- [ ] After an interrupted save or delete, reconnect and inspect saved work: creation and deletion never repeat automatically. Restore the old chat only if it is actually missing.
- [ ] Incomplete or unsaved cards, and saved chats changed elsewhere, block creation with a useful explanation.

## 14. Chats library — 0.7.8

- [ ] Chats + opens the picker; Back creates nothing; picking a complete character always starts fresh.
- [ ] An existing chat row resumes exactly that conversation.
- [ ] A left swipe reveals Delete without opening the chat; a right swipe hides it again.
- [ ] The chat ellipsis names the deletion target; Cancel preserves it; Delete and then Undo restores the messages, valid Memory and native fields.
- [ ] Interrupt a fresh save by reloading or restarting: saved-work review appears and creation never repeats automatically.
- [ ] With a long history, the list scrolls smoothly and the 1,000-chat notice appears where expected.

## 15. Personas

- [ ] The Personas tab lists your personas with portraits; Create persona opens an empty editor.
- [ ] Tapping a persona opens it for editing.
- [ ] The editor saves name, title/comment, description and a chosen portrait, and they survive reopening.
- [ ] A persona without a name is refused with an explanation rather than saved.
- [ ] Cancel leaves the saved persona untouched.
- [ ] Saving while the engine is busy is refused with an explanation.
- [ ] From a chat, the gear → Persona picker shows the current persona with its description, and a tick against the selected one.
- [ ] Choosing a persona changes who you are in the chat, and the chat header reflects it.
- [ ] The picker says whether the current character has a linked persona, and linking from here only affects that character.
- [ ] Portraits, long names and descriptions stay readable at your phone width.

---

## 16. World Info — 0.7.10

### Library

- [ ] The WI tab lists your real books with entry counts.
- [ ] Source labels are right: Global, Character · Name · Primary, Character · Name · Additional, Chat, Persona.
- [ ] A book with no links shows no source line.
- [ ] Tapping a book expands it in place and lists its entries; tapping again collapses it.
- [ ] A large book (50+ entries) opens in reasonable time and scrolls smoothly.
- [ ] Entry rows show the right marker — ● keyword, ◆ always on, ▲ vectorized — and disabled entries are dimmed.
- [ ] The enable checkbox turns an entry on and off, and the change survives leaving and reopening the page.
- [ ] Turning an entry off really stops it activating in a chat (use a keyword you can trigger).
- [ ] With many books the list stays usable and the page does not stall while counting entries.
- [ ] Leaving the tab and coming back shows current data.

### Books

- [ ] + Book creates a book; a duplicate or invalid name is refused with a readable message.
- [ ] Import a SillyTavern lorebook JSON: the entries arrive intact.
- [ ] Import a character-book style JSON (entries as a list): it converts and imports.
- [ ] Importing a book whose name is taken creates a numbered copy instead of overwriting.
- [ ] Importing a JSON that is not a lorebook is refused with a clear message, not a crash.
- [ ] Use globally / Stop using globally changes the Global label, and takes effect in a chat.
- [ ] Rename keeps the entries, and the global, chat and persona links follow the new name.
- [ ] Renaming a character's primary book shows the confirmation: Update cards fixes the character, Skip leaves it pointing at the old name and says so.
- [ ] Duplicate creates a copy with a free name and all the entries.
- [ ] **Export downloads a JSON file**, and that file re-imports successfully.
- [ ] Delete asks first, names what uses the book, and removes it; SillyTavern no longer lists it.
- [ ] Deleting a book a character uses does not break that character's chat.

### Folders

- [ ] Folder creates an empty folder, which is still there after leaving the page.
- [ ] A book's ⋯ → Move to folder moves it, and the book keeps its entries.
- [ ] Move to folder → New folder… creates and moves in one step.
- [ ] Moving a book out ("No folder") returns it to the main list.
- [ ] Renaming a folder keeps its books inside.
- [ ] Deleting a folder keeps its books, which reappear in the main list.
- [ ] Folders change nothing about which entries activate in a chat.
- [ ] If you use the WorldInfoDrawer extension on the desktop, folders set there show up here and the reverse.
- [ ] Folders, and which books are expanded, survive an app reload.

### Entry editor

- [ ] + Add entry creates an entry and opens it.
- [ ] The header shows the book name and UID, and the bottom navigation is hidden.
- [ ] **Keyboard:** typing in Title, Keywords and Content is uninterrupted; the field you are typing in is not covered and does not lose focus by itself.
- [ ] A long entry in Content scrolls and nothing is lost.
- [ ] The expand (⤢) button opens the big content editor: Use text keeps the change, Cancel does not.
- [ ] Strategy Keyword / Always on / Vectorized switches correctly, and the keyword fields disappear for Always on.
- [ ] Position: At depth reveals Depth and Role; Outlet reveals the outlet name field.
- [ ] Order accepts negative numbers.
- [ ] Trigger % refuses values above 100 — the field itself corrects to 100 rather than saving something else.
- [ ] Keywords accept commas, and `/regex/i` patterns are kept exactly.
- [ ] Logic and Optional filter work together as they do in SillyTavern.
- [ ] Per-entry overrides: Scan depth left blank means "use global"; Yes / No / Use global setting save correctly.
- [ ] The recursion and budget checkboxes save, and Delay until recursion reveals its level field.
- [ ] Inclusion group, group weight, and sticky / cooldown / delay save.
- [ ] Character filter names and the Exclude switch save; an entry with tag filters says the tags are kept.
- [ ] Generation types save, and none selected means all.
- [ ] Save returns to the library and the entry row updates.
- [ ] Cancel with unsaved edits asks before discarding, and Back behaves the same way.
- [ ] Cancel with no edits leaves immediately.
- [ ] Open the same entry in SillyTavern on the desktop: every field matches, and the fields Pocket does not show (tags, anything exotic) are untouched.
- [ ] Edit the book in SillyTavern while an entry is open in Pocket, then save in Pocket: it refuses with "this book changed somewhere else" instead of overwriting.
- [ ] Duplicate and delete an entry, and confirm the result in SillyTavern.
- [ ] A saved entry actually fires in a chat when its keyword is used.

### Activation (the sliders icon in the library header)

- [ ] The page opens and shows your real SillyTavern values.
- [ ] **Dragging each slider works with a finger and does not jump or stop mid-drag.** *(This was broken before 0.7.13 for Min activations and Max recursion steps — drag those two carefully.)*
- [ ] The number box beside each slider accepts a typed value, including beyond the slider's range: Scan depth up to 1000, Budget cap up to 65536.
- [ ] Setting Min activations above 0 sets Max recursion steps to 0, and the reverse.
- [ ] Include names, Recursive scan, Insertion strategy and the matching defaults all save.
- [ ] Save reports success, and reopening shows the saved values.
- [ ] SillyTavern's own World Info settings show the same values on the desktop after a reload.
- [ ] Cancel with changes asks before discarding, and Back behaves the same way.
- [ ] The settings genuinely affect a chat — for example, raise Scan depth and confirm an older keyword activates.

## 17. Memory — 0.7.9

- [ ] Gear → Memory opens the full page; Back returns to the same chat and scroll position.
- [ ] Status, Enable/Pause, Summarize now and Save settings work; Save stays disabled until something changes, and the keyboard never hides the focused field.
- [ ] Saved memories: layer tabs, Edit, Regenerate (Layer 0 only, with cost confirmation) and Delete each change only the chosen snippet, and survive leaving and reopening the chat.
- [ ] The injection preview matches what is sent, and Refresh updates it after an edit.
- [ ] Turns & layers, the prompts (preset, Custom, saved prompts, wrapper, strip patterns) and the output limit save and persist across an engine restart.
- [ ] Maintenance: **Export saves a JSON file**; Import replaces memory after confirmation; Repair; Clear memory with confirmation, then Summarize now rebuilds after a history edit; Reset to defaults keeps memories and saved prompts.
- [ ] The catch-up choice appears both on the page and above the chat; All, One batch, Skip and Cancel behave; Stop in the chat bar shows "Summarization stopped · Progress saved"; completion shows "Memory saved".
- [ ] A non-default Summaryception connection explains itself, and "Use the main ST connection" switches it back.
- [ ] The page, its dialogs and the file pickers all work with Back, large text and TalkBack.

---

## 18. While generating, and after interruptions

Cross-cutting behaviour worth one deliberate pass.

- [ ] During a reply: World Info writes, connection changes, character and persona saves, and new-chat creation are all refused with a readable message rather than interfering.
- [ ] During a reply: browsing, drafts, reading and selection all stay available.
- [ ] Stop always settles the reply into the chat that started it, even if you navigated elsewhere.
- [ ] Pull the connection (stop the engine) on each major screen: the page explains the problem instead of failing silently, and recovers after Reconnect.
- [ ] Lock the phone or switch apps on each screen and come back: nothing is lost and no work is repeated.
- [ ] After any interrupted save, the saved-work review appears and nothing repeats automatically.

## 19. Known and deliberate

Not bugs — no need to report these.

- The Use proxy switch changes the endpoint and reports whether the proxy answers. It does not start or stop the proxy itself; that belongs to the launcher and the Android package.
- Novel, Agnai and Risu lorebook formats cannot be imported, because SillyTavern does not expose those converters.
- Empty World Info folders are remembered on this device only; a folder with books in it travels with the books.
- The vectorized marker ▲ is my own choice; the mockups only showed ● and ◆.
- Appearance settings are stored on the device and do not appear in SillyTavern.
- World Info entry tag filters are preserved but can only be edited in SillyTavern.
- Memory summarizes only through the main SillyTavern connection; there is deliberately no separate summarizer endpoint, key or model.
- Character card deletion has no Undo. Chat deletion does.
- Android packaging has not started; this is still the browser build.
