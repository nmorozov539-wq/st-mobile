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

- [x] Install the matching ZIP and repair helper; the app and the engine bridge report the same release (Settings → Connection, at the bottom).
- [x] Existing characters, chats, personas, settings and local proxy files survive the update.
- used a fresh install
- [x] Reconnect after a restart, review saved work, and confirm no generation is repeated automatically.
- [ ] Leave and return to the browser, and lock and unlock the phone: note what happens to an interrupted generation and to recovery.
- [ ] Nothing in SillyTavern's own interface broke — open it on the desktop and check characters, chats, personas and World Info.

## 2. Getting around

- [x] The five tabs (WI, Characters, Home, Chats, Personas) all work, and the current tab is marked.
- [x] Every screen fits the phone: no sideways scrolling, nothing cut off at the edges.
- [x] Nothing hides under the notch, the status bar or the home-gesture bar.
- [x] Every button, checkbox and switch is comfortably tappable one-handed.
- [ ] Android Back goes back one step rather than leaving the app, on every page: entry editor → World Info, activation → World Info, Settings → where you came from, Memory → chat, persona editor → Personas.
- [ ] Android Back closes an open dialog or sheet without performing the action behind it.
- [x] Android Back dismisses the keyboard or an open panel before leaving a screen.
- [x] Edge gestures do not trigger anything by accident — above all, they never start a generation.
- [x] Rotate to landscape and back on each screen: nothing is lost or stuck.
- [x] Repeat the pass with the system font set large: text stays readable and layouts hold.
- [ ] TalkBack can reach and announce the controls on each screen.
- [x] Long names — characters, chats, models, books, personas — wrap or truncate readably rather than overflowing.

- Engine connecting takes an irritating period of time. Not really long. Just not short.
- leaving the browser in background for a while and returning to he page looses the engine connection. Doesn't reconnect without page reload
- Tabs bar on a home screen still uses old theme. Other screens use the right color theme
- androids "back" doesn't seem to work. Not working for "persona editing→back, preset entry → back". It sorta stops and nothing happens. Repeated attempts exit the web page. Howere character editing puts me back to character menu 
- switching to another app without waiting for the engine to connect seems to stop the process entirely and it doesn't restart unless the page reloaded. Reconnect button not tested.
- "android back" in chat behaves the same as the same not working pints from above
- leaving the browser in the background seems to disconnect the engine. Here reconnect button works. Maybe I didn't wait enough in tries before
- pocket doesn't seem to have any gestures besides changing between messages. Doesn't generate new responses. Not a critique, just a full feedback.
- Rotating seems to work fine but landscape is completely unusable. Don't know if we need it to be. Probably not and it could be locked horizontally. 
- changing system font leaves the interface of chat readable. Moreover doesn't seem to affect it much at all. Like there is definitely an effect. But it isn't of the same scale as the system. 
- talk back not tested.
---

## 3. Home — 0.7.12

- [x] Home shows the tagline, Engine and API connection rows, and the Characters / Chats / Personas counts.
- [x] The counts match your real library.
- [x] Engine says Connected; during a reply it says Working, and returns to Connected afterwards.
- [x] Stop the engine or go offline: Engine becomes Not connected without you reloading the page.
Tested on engine stopping. (Why should it say not connected engine on offline?). It does say not connected. After restarting it in terminal and pressing reconnect it says API is not connected instead of not tested untill I press connect

- [x] API connection says Not checked until you actually run Connect or Test message in Settings.
- [x] After a failed Connect it says Not connected; after a successful one, Connected.
- [x] Opening Home never causes a provider request or a charge.
- [x] The gear opens Settings; Back returns to Home.
The arrow in the interface returns. Android "back" Doesn't. I'm using gesture control if that is important but I don't see how it's different from buttons

- [x] The version in the footer matches the installed release.
- [x] Home has no Continue / Recent / model shortcuts — those belong to Chats and the chat screen.

- While testing this noticed that while I was editing this file and the browser was backgrounded, returning to browser showed API not connected after a while

## 4. Settings · Connection — 0.7.11

- [x] The gear on Home and the connection link in the chat model picker both open this page; Back returns where you came from (Home, or straight back into the chat).
- While testing didn't find "connection link in the chat model picker". Chat model picker opens a drawer


- [x] The engine row shows Connected · Local, and Reconnect works.
- [x] The endpoint, model and key status shown are your real saved values, not placeholders.
- [x] **Keyboard:** tap the endpoint field, type, then tap straight into the API key field — focus lands in the key field, your typing is not lost and the keyboard does not close. *(This was broken before 0.7.13; please be thorough.)*
- [x] The keyboard does not cover the field you are typing in; the page scrolls as needed.
- [ ] The eye button shows and hides the key, and the typed text survives the switch.
Eye button does nothing

- [x] The key field shows "Saved key · Leave blank to keep" when a key is stored, and leaving it blank keeps that key.
- [x] Use proxy on: the endpoint switches to `http://127.0.0.1:8001/api/v1` and the label reads Proxy.
- [x] Use proxy off: your previous direct endpoint comes back — not a blank field — labelled Direct.
- [x] With the proxy actually running, the line under the switch says Proxy running. **If it says "not detected" while the proxy is clearly running, tell me — that check may not work inside Android's browser.**
This one is actually interesting because I can't really tell what is happening. Previous without proxy in st API requests would be refused. Now with proxy off it works. With proxy on it actually says "proxy not detected" even though it should be running. But it both works. With proxy on and off replies arrive.

### While testing noticed a huge bug here. Regenerating a message doesn't actually replace anything. It just shows the new message right below the old one. Not sure if that's just how it is visually or how it is actually written in chat. While pressing delete on the latest deletes both. So I suspect it's just a visual bug. Plus a small thing: after deleting ai message the last is from the user. And there is no "resend" or "continue"

- [ ] With the proxy stopped it says Proxy not detected, and Connect fails with a readable message rather than hanging.
Again, previous big still here, not sure how to nut run proxy on start

- [x] Connect with a good key reports Connected and the number of models.
- [ ] Connect with a deliberately wrong key or endpoint reports a clear failure, leaves nothing half-saved, and still works after you fix it.
"Connect button" shows nothing, like the key is fine and even connects. Only at test message it replies "not authorized". Moreover there is no way of choosing a previously saved key

- [x] The model dropdown lists your provider's models; the one you pick stays picked after Connect.
- [x] A long model list scrolls and stays usable.
- [ ] "Enter a model ID…" shows a text field, and a manual ID is accepted and used.
There is no "enter model id" field

- [x] The refresh button beside the model list reloads it.
Can't say it reloads it but it definitely goes busy for a second. Moreover the button doesn't look like a refresh icon.

- [x] Test message sends one small request, names the model it used, and shows the reply.
More often than not, or maybe even most of the time, it says that "no reply arrived but it's fine"

- [x] Test message on a broken connection fails with a message instead of hanging.
Again, like in a fake key situation, shows "unauthorized"

- [x] After Connect, open a chat and send a message: generation works with the saved settings.
- [x] Per-chat and per-character model choices still override the global model.
Per chat model selection seems to straight up override global

- [x] While a reply is generating, Connect and Test message are refused with an explanation rather than interfering.
- [x] With the engine stopped, the gear still opens Settings, Connection shows the problem with a Try again button, and Appearance still works.
It does but the notification covers it the error message in the settings

- Engine shows "working" When trying to connect to the API. Not sure if that's a bug or a feature
## 5. Settings · Appearance & reading — 0.7.11

- [x] Text size: dragging the slider is smooth, and the preview resizes as you drag.
- [x] The chosen size applies to real chat messages, not just the preview.
- [x] Compact / Normal / Spacious change line spacing in a real chat.
- [x] Plain / Gradient change the chat background, and Plain is genuinely plain.
- [x] Generation time is on by default and appears under replies that have timing.
- [ ] Clock timestamp, Model icon and Token count are off by default, and appear when switched on.
Token count shows nothing. Neither with other toggles on or off

- [x] A detail never shows a made-up value: on an older reply without that data, the detail is simply absent.
Seems to be

- [x] Tapping the model icon under a reply shows the full model name.
- [x] The settings survive closing and reopening the app, and a phone restart.
- [ ] They change nothing inside SillyTavern itself — they are device-only.
Didn't test starting the engine st separately

- [x] Very large text sizes do not break the chat layout or the composer.

- The preview message shows no dialogue coloring

---

## 6. Chat — 0.7.0

- [x] Send immediately after opening a conversation: exactly one user message and one request.
- [x] Stop a streaming response; the saved partial response is still there after reopening.

- [x] Browse another conversation and type a draft during generation; the original target is unchanged.
- [x] Switch scoped models during generation; the running response is unaffected and pending changes settle visibly.
- [x] Select saved alternatives; deliberately swipe past the final one and try the accessible Another reply action.
- [x] Select and copy message text; the menus do not interfere with selection.
- [x] Edit, delete and Undo, multi-select, and fork a test conversation; reopening keeps the expected messages.
- [x] Memory invalidation and Undo notices stay visible after history changes.
- [x] Reading position, long replies and scroll-to-latest behave.
- [x] The gear fan and the model panel work at your phone width, with the keyboard open, with large text, and after rotation.
- [x] Unavailable saved models stay identified rather than silently replaced.

- the bug i so dramatically labeled above with regenerated messages isn't actually that bad because I didn't notice that it appears like that only while generating. When reply has arrived properly it is appearing fine
- for some reasons at some point swiping past the last message to make a new one just looped back to the first. I don't know how I did it or how to duplicate it. 
## 7. Preset — 0.7.1

- [x] Browse the Global, Character and Chat scopes without changing their saved settings.
- [ ] Adjust preset A, choose B, then A again: the adjustments come back, including after a restart.
There is no import preset button. Didn't test further 

- [ ] Preset choices do not change independently scoped models.
- [ ] Explicit inheritance removes only the chosen scope's override.
- [ ] Edit an entry's text, role, placement and generation types; Save applies and Cancel keeps the previous values.
- [ ] Built-in markers explain their source, and their generated content is not presented as editable static text.
- [ ] Change settings during generation; pending changes keep their original scope and target.
- [ ] Reset one preset's remembered adjustments; other remembered presets and model settings survive.
- [ ] Save and Cancel stay reachable above the keyboard, and long entry lists scroll comfortably.

---

## 8. Characters library — 0.7.8

- [x] The grid stays three columns; long names, missing portraits and Incomplete warnings stay understandable with large text.
- [x] Tapping a character opens Edit, and creates or selects no conversation.
- [x] Import a native PNG and JSON, and one other supported format; existing cards, unknown fields and chats survive.
- [x] Create a named incomplete card: Save works, Incomplete appears, Start chat stays unavailable.
- [x] Complete and save that card: Start chat opens one actual greeting with its saved alternatives, and makes no AI request.
- [x] Unsaved character edits disable Start chat; Cancel preserves the saved card.
- [x] Rapidly tap Start chat: exactly one new conversation is created.
- [x] Browse the library during generation: draft editing stays available, mutations wait, and Stop saves to the original target.
- [x] Scrolling, reading positions, navigation icons, keyboard, Back and TalkBack all behave on the grid and the picker.

## 9. Character editor · content — 0.7.2

- [ ] The Read/Edit choice is remembered separately for each character.
Is not remembered at all. I don't think it should be remembered 

- [x] Description, main greeting, alternate greetings and advanced fields survive a save and reopen.
- [ ] Greeting organization preserves every greeting when reordering or changing the main one.
Greeting organization is super unintuitive and doesn't provide any feedback aside from setting as main.

- [x] Creator's notes expand safely, and their formatting stays inside the notes preview.
- [x] Portrait, tags, unknown native fields and the embedded lorebook survive editing.
- [ ] Character drafts stay available during generation, while saved writes wait for an idle engine.
Drafting is not saved. Buttons to start chat and save are blocked

## 10. Character actions — 0.7.3

- [x] Open the inline overflow from a long scrolled card: it stays visible, and Back restores your reading position before leaving.
- [x] **Export PNG and JSON: the download completes on the phone and SillyTavern can re-import it.**
- [x] Duplicate a disposable card: portrait, greetings, lorebook and unknown native fields survive, and your chat does not switch.

- [x] Actions are blocked for an unsaved draft; cancelling the draft restores them.
- [x] Delete a disposable card with the chat checkbox off: the chat files remain, and the confirmation names the exact card filename.
- [x] Delete another disposable card with the checkbox on: only its chats go. Card deletion has no Undo.
- [x] Cancel the deletion confirmation: the card is intact.
- [ ] Export during generation: the generating target and request are unchanged, while Duplicate and Delete are disabled.
- [ ] An unsaved temporary conversation in SillyTavern blocks deletion visibly and keeps its text.
Last two not tested yet
## 11. Character associations · persona and lorebooks — 0.7.4 and 0.7.5

- [x] An existing character-linked persona appears beneath its portrait in both Read and Edit; tap to read its full name.
- [ ] Several native persona links show a count and all the full names, without selecting one or changing the links.
Isn't working 

- [ ] The primary lorebook appears first, then additional attachments; saved names that no longer exist stay visible.
Didn't test.

- [ ] A card with only an embedded lorebook says so, and no book is silently promoted to primary.
An attached lorebook is there but I can not for the life of me figure out what the second part is supposed to mean

- [x] Back or an outside tap closes the persona sheet and keeps the character draft — test with the keyboard open.
No idea which draft is meant to be tested. Chat? Char edits? Back/tap outside of persona sub menu closes it properly. Tested with no draft or keyboard 

- [x] With one linked persona, Edit persona opens its editor; Save and Cancel both return to the same character draft, portrait draft and selected greeting.
- [x] Start a persona Save, return to the character draft before it finishes, and check the delayed result preserves that draft.
Happens too fast. Or I'm not testing it correctly. But if I am then it works properly 

- [ ] Confirming Remove link removes only that character connection: the persona, the default persona, and unrelated chat, group and character links remain.
- [ ] Connect a real saved lorebook as Additional: the card export does not embed additional books.
- [ ] Connect or replace Primary: PNG and JSON exports contain the selected book and keep the other native card fields.
- [ ] Unattach Primary with confirmation: the embedded copy goes and additional books stay separate.
- [ ] Detach a missing additional book, or one duplicate: the other links survive reopening and a restart.
- [ ] During generation, association sheets can be browsed, mutation controls stay disabled, the original target and request stay intact, and Stop settles.
- [ ] Save an association, then immediately open a fresh chat and Send: no stale busy refusal and no duplicate request.
- [ ] Change the same card or settings elsewhere while its sheet is open: the conflict is explained, and saved work can be inspected before another attempt.
- [ ] Long lorebook names, picker scrolling and keyboard-sized Save/Cancel all work at your phone width.

- Saving a persona jumps to a blank page with "new persona" at top left and back button. Pressing back returns to persona manager and changes are there.
- Tapping (selecting) a persona in the chat instantly closes the menu and returns to the chat
- Can't link two personas. When one is already linked and I tap a different one, then press "link" it shows an alert. Pressing cancel here seems to do nothing with an actual link but visually it's no longer in the character card
- "this chat" links only show a notification "this chat changed, reload before applying" or something like that and does nothing 
- Other unchecked boxes not tested
## 12. Current-chat selector — 0.7.6

- [x] With one chat, no current-chat selector appears above the portrait.
- [x] With several chats, the thin current-chat line opens, and choosing an existing chat keeps Character open with your unsaved edits.
- [x] Done, an outside touch and Android Back dismiss only the selector.
- [x] Start a reply, open Character and switch chats: the reply stays in its original chat and Stop settles it there.
- [x] Per-chat composer drafts and reading position survive switching back.
- [x] The Character overflow still opens Conversations.

- Found here: not tested API connection status literally stops attempting to get a reply from an llm. Need to go to the settings and tap connect. And only then it works. Should reconnect automatically or at least have an option to

## 13. Start new chat — 0.7.7

- [ ] Start new chat from the Character overflow names the actual character and source, and Delete current starts unchecked every time. 
A mess of a sentence. Not clear what to test

- [ ] Cancel or Back returns to Character without creating a chat or losing your draft and reading position.
- [ ] With deletion off: the real greeting and alternatives appear, the old chat and its Memory remain, and no AI request is made.
- [ ] With deletion on, using a disposable conversation: the new greeting is saved before the old chat is deleted, and Undo restores the old chat and its Memory while keeping the new one.
- [ ] During a reply, browsing and conversation selection stay available, Start new chat stays blocked, and Stop saves to the original target.
- [ ] After an interrupted save or delete, reconnect and inspect saved work: creation and deletion never repeat automatically. Restore the old chat only if it is actually missing.
- [ ] Incomplete or unsaved cards, and saved chats changed elsewhere, block creation with a useful explanation.

This whole block is a mess that I don't understand. Where am I supposed to test it from?
## 14. Chats library — 0.7.8

- [x] Chats + opens the picker; Back creates nothing; picking a complete character always starts fresh.
- [x] An existing chat row resumes exactly that conversation.
- [x] A left swipe reveals Delete without opening the chat; a right swipe hides it again.
Clunky, happens without an animation

- [x] The chat ellipsis names the deletion target; Cancel preserves it; Delete and then Undo restores the messages, valid Memory and native fields.
Not tested on memory

- [ ] Interrupt a fresh save by reloading or restarting: saved-work review appears and creation never repeats automatically.
Didn't test

- [ ] With a long history, the list scrolls smoothly and the 1,000-chat notice appears where expected.
Didn't test 

## 15. Personas

- [x] The Personas tab lists your personas with portraits; Create persona opens an empty editor.
- [x] Tapping a persona opens it for editing.
- [x] The editor saves name, title/comment, description and a chosen portrait, and they survive reopening.
Portraits are not working. Trying to save with them added says "can not read properties of null (reading draft)". Same with or without editing any text fields
- [x] A persona without a name is refused with an explanation rather than saved.
- [x] Cancel leaves the saved persona untouched.
- [ ] Saving while the engine is busy is refused with an explanation.
Couldn't test

- [x] From a chat, the gear → Persona picker shows the current persona with its description, and a tick against the selected one.
- [x] Choosing a persona changes who you are in the chat, and the chat header reflects it.
For new messages only

- [x] The picker says whether the current character has a linked persona, and linking from here only affects that character.
As described earlier, persona linking works weirdly. Chat links don't work.

- [x] Portraits, long names and descriptions stay readable at your phone width.

At some point the portrait just appeared where I tried to add it a minute ago. Further text changes apply after the "save" but still show the same error message like when I was trying to save a portrait 

---

## 16. World Info — 0.7.10

### Library

- [x] The WI tab lists your real books with entry counts.
- [x] Source labels are right: Global, Character · Name · Primary, Character · Name · Additional, Chat, Persona. 
Weird wording. Weird info block as a whole. But seems to be right

- [x] A book with no links shows no source line.
- [x] Tapping a book expands it in place and lists its entries; tapping again collapses it.
- [ ] A large book (50+ entries) opens in reasonable time and scrolls smoothly.
Didn't test, have no book like that

- [x] Entry rows show the right marker — ● keyword, ◆ always on, ▲ vectorized — and disabled entries are dimmed.
- [x] The enable checkbox turns an entry on and off, and the change survives leaving and reopening the page.
Tested only visually.

- [x] Turning an entry off really stops it activating in a chat (use a keyword you can trigger).
Now actually tested

- [ ] With many books the list stays usable and the page does not stall while counting entries.
Not tested

- [x] Leaving the tab and coming back shows current data.

### Books

- [x] + Book creates a book; a duplicate or invalid name is refused with a readable message.
- [ ] Import a SillyTavern lorebook JSON: the entries arrive intact.
Don't have a separate lorebook file

- [ ] Import a character-book style JSON (entries as a list): it converts and imports.
Not sure what that one means

- [x] Importing a book whose name is taken creates a numbered copy instead of overwriting.
- [x] Importing a JSON that is not a lorebook is refused with a clear message, not a crash.
- [x] Use globally / Stop using globally changes the Global label, and takes effect in a chat.
- [x] Rename keeps the entries, and the global, chat and persona links follow the new name.
Dunno how the persona is connected to a book though 

- [x] Renaming a character's primary book shows the confirmation: Update cards fixes the character, Skip leaves it pointing at the old name and says so.
- [x] Duplicate creates a copy with a free name and all the entries.
- [x] **Export downloads a JSON file**, and that file re-imports successfully.
- [x] Delete asks first, names what uses the book, and removes it; SillyTavern no longer lists it.
- [x] Deleting a book a character uses does not break that character's chat.

### Huge bug! Importing a character with a lorebook attached does not important the lorebook. But the lorebook is in the JSON (visible when viewing the full json)
### Folders

- [x] Folder creates an empty folder, which is still there after leaving the page.
- [x] A book's ⋯ → Move to folder moves it, and the book keeps its entries.
- [x] Move to folder → New folder… creates and moves in one step.
- [x] Moving a book out ("No folder") returns it to the main list.
- [x] Renaming a folder keeps its books inside.
- [x] Deleting a folder keeps its books, which reappear in the main list.
- [x] Folders change nothing about which entries activate in a chat.
- [ ] If you use the WorldInfoDrawer extension on the desktop, folders set there show up here and the reverse.
Not tested

- [ ] Folders, and which books are expanded, survive an app reload.
If by reload we mean page reload... Still no
### Entry editor

- [x] + Add entry creates an entry and opens it.
- [x] The header shows the book name and UID, and the bottom navigation is hidden.
What is bottom navigation? If cancel and save then it is not hidden and looks weird. Background doesn't cover the whole row

- [x] **Keyboard:** typing in Title, Keywords and Content is uninterrupted; the field you are typing in is not covered and does not lose focus by itself.
- [x] A long entry in Content scrolls and nothing is lost.
- [x] The expand (⤢) button opens the big content editor: Use text keeps the change, Cancel does not.
- [x] Strategy Keyword / Always on / Vectorized switches correctly, and the keyword fields disappear for Always on.
- [x] Position: At depth reveals Depth and Role; Outlet reveals the outlet name field.
- [x] Order accepts negative numbers.
- [x] Trigger % refuses values above 100 — the field itself corrects to 100 rather than saving something else.
- [x] Keywords accept commas, and `/regex/i` patterns are kept exactly.
Not tested on regex.

- [ ] Logic and Optional filter work together as they do in SillyTavern.
Not tested

- [x] Per-entry overrides: Scan depth left blank means "use global"; Yes / No / Use global setting save correctly.
- [x] The recursion and budget checkboxes save, and Delay until recursion reveals its level field.
- [x] Inclusion group, group weight, and sticky / cooldown / delay save.
- [ ] Character filter names and the Exclude switch save; an entry with tag filters says the tags are kept.
Probably 

- [x] Generation types save, and none selected means all.
- [x] Save returns to the library and the entry row updates.
- [x] Cancel with unsaved edits asks before discarding, and Back behaves the same way.
Back does not. It moves back to home screen without saving any changes

- [x] Cancel with no edits leaves immediately.
- [ ] Open the same entry in SillyTavern on the desktop: every field matches, and the fields Pocket does not show (tags, anything exotic) are untouched.
Not tested

- [ ] Edit the book in SillyTavern while an entry is open in Pocket, then save in Pocket: it refuses with "this book changed somewhere else" instead of overwriting.
Not tested

- [ ] Duplicate and delete an entry, and confirm the result in SillyTavern.

Not tested

- [x] A saved entry actually fires in a chat when its keyword is used.

### Activation (the sliders icon in the library header)

- [x] The page opens and shows your real SillyTavern values.
- [x] **Dragging each slider works with a finger and does not jump or stop mid-drag.** *(This was broken before 0.7.13 for Min activations and Max recursion steps — drag those two carefully.)*
- [x] The number box beside each slider accepts a typed value, including beyond the slider's range: Scan depth up to 1000, Budget cap up to 65536.
Normalizes to the cap

- [x] Setting Min activations above 0 sets Max recursion steps to 0, and the reverse.
- [x] Include names, Recursive scan, Insertion strategy and the matching defaults all save.
- [x] Save reports success, and reopening shows the saved values.
- [ ] SillyTavern's own World Info settings show the same values on the desktop after a reload.
Not tested

- [x] Cancel with changes asks before discarding, and Back behaves the same way.
Cancel behaves, back moves to home screen with no saving

- [ ] The settings genuinely affect a chat — for example, raise Scan depth and confirm an older keyword activates.
Not tested
## 17. Memory — 0.7.9

- [x] Gear → Memory opens the full page; Back returns to the same chat and scroll position.
- [x] Status, Enable/Pause, Summarize now and Save settings work; Save stays disabled until something changes, and the keyboard never hides the focused field.
- [ ] Saved memories: layer tabs, Edit, Regenerate (Layer 0 only, with cost confirmation) and Delete each change only the chosen snippet, and survive leaving and reopening the chat.
- [ ] The injection preview matches what is sent, and Refresh updates it after an edit.
- [ ] Turns & layers, the prompts (preset, Custom, saved prompts, wrapper, strip patterns) and the output limit save and persist across an engine restart.
- [ ] Maintenance: **Export saves a JSON file**; Import replaces memory after confirmation; Repair; Clear memory with confirmation, then Summarize now rebuilds after a history edit; Reset to defaults keeps memories and saved prompts.
- [ ] The catch-up choice appears both on the page and above the chat; All, One batch, Skip and Cancel behave; Stop in the chat bar shows "Summarization stopped · Progress saved"; completion shows "Memory saved".
- [ ] A non-default Summaryception connection explains itself, and "Use the main ST connection" switches it back.
- [ ] The page, its dialogs and the file pickers all work with Back, large text and TalkBack.

The memory is broken. Pressing save shows nothing. Pressing summarize shows "the engine selected another chat", does nothing. Moreover the memory window now doesn't close and follows everywhere, covering everything. Literally jumpscares on every window.
Not tested beyond first two boxes

---

## 18. While generating, and after interruptions

Cross-cutting behaviour worth one deliberate pass.

- [x] During a reply: World Info writes, connection changes, character and persona saves, and new-chat creation are all refused with a readable message rather than interfering.
- [x] During a reply: browsing, drafts, reading and selection all stay available.
- [x] Stop always settles the reply into the chat that started it, even if you navigated elsewhere.
- [x] Pull the connection (stop the engine) on each major screen: the page explains the problem instead of failing silently, and recovers after Reconnect.
- [x] Lock the phone or switch apps on each screen and come back: nothing is lost and no work is repeated.
- [x] After any interrupted save, the saved-work review appears and nothing repeats automatically.

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


# 20. Overall impressions
- All notifications look absolutely horrible. They are not responsive, take space too much sometimes. But the worst crime is that they are all in old color pallet. Notifications as a whole need work
- Overall the interface still have traces of old color pallet. And it jusmpscares you immediately at the first frames of the page loading.
- Overall interface design quickly stopped looking good after taking a deep dive into it. I don't know how to explain it. Just a vibe. It's still fine. But here and there there are little things that don't look nice. Editing fields that don't look nice. But the interface is for now least of our worries. Got to catch bugs