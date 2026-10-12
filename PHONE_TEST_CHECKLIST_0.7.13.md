# Phone test checklist — World Info, Settings and Home (0.7.13)

Covers everything added in 0.7.10 (World Info), 0.7.11 (Settings) and 0.7.12 (Home), plus the 0.7.13 fixes. The older checklist (`PHONE_TEST_CHECKLIST.md`) still covers Chat, Preset, Character, Persona and Memory; nothing here replaces it.

Install `pocket-tavern-combined-v0.7.13.zip`, reload `/st-mobile/`, and check that Settings → Connection shows the same release for the app and the engine bridge. Use a **spare book, a spare chat and a spare character** for anything destructive. Everything below was checked in a desktop browser at 390×844 against a real SillyTavern 1.19.0; the point of this pass is the phone itself — touch targets, the on-screen keyboard, system Back, and real data volumes.

Report anything surprising with: the screen, what you tapped, what you expected, what happened.

---

## 0. First impressions (do this before the detail passes)

- [ ] Every screen fits the phone: no sideways scrolling, nothing cut off at the edges.
- [ ] Nothing hides under the notch, the status bar or the home-gesture bar.
- [ ] Every button and checkbox is comfortably tappable one-handed.
- [ ] Text is readable without zooming; long book, character and model names wrap instead of overflowing.
- [ ] Rotate to landscape and back on each new page: nothing is lost or stuck.

---

## 1. Home

- [ ] Home shows the tagline, Engine and API connection rows, and the Characters / Chats / Personas counts.
- [ ] The counts match your real library.
- [ ] Engine says Connected; during a reply it says Working and returns to Connected afterwards.
- [ ] Stop the engine (or go offline): Engine becomes Not connected without you reloading the page.
- [ ] API connection says Not checked until you actually run Connect or Test message in Settings.
- [ ] After a failed Connect, API says Not connected; after a successful one, Connected.
- [ ] Opening Home never causes a provider request or charge.
- [ ] The gear opens Settings; Back returns to Home.
- [ ] The version in the footer matches the installed release.
- [ ] Home has no Continue / Recent / model shortcuts (they belong to Chats and the chat screen).

---

## 2. Settings — Connection

- [ ] The gear on Home and the connection link in the chat model picker both open this page; Back returns to where you came from (Home, or straight back into the chat).
- [ ] The engine row shows Connected · Local, and Reconnect works.
- [ ] The endpoint, model and key status shown are your real saved values, not placeholders.
- [ ] **Keyboard:** tap the endpoint field, type, then tap straight into the API key field — focus lands in the key field, your typing is not lost and the keyboard does not close. *(This was broken before 0.7.13; please be thorough.)*
- [ ] The keyboard does not cover the field you are typing in; the page scrolls as needed.
- [ ] The eye button shows and hides the key; the typed text survives the switch.
- [ ] The key field shows "Saved key · Leave blank to keep" when a key is stored; leaving it blank and pressing Connect keeps the old key.
- [ ] Use proxy on: the endpoint switches to `http://127.0.0.1:8001/api/v1` and the label reads Proxy.
- [ ] Use proxy off: your previous direct endpoint comes back (not a blank field), labelled Direct.
- [ ] With the proxy actually running, the line under the switch says Proxy running. **If it says "not detected" while the proxy is clearly running, tell me — that check may not work inside Android's browser.**
- [ ] With the proxy stopped, it says Proxy not detected and Connect fails with a readable message rather than a silent hang.
- [ ] Connect with a good key: it reports Connected and the number of models.
- [ ] Connect with a deliberately wrong key or endpoint: it reports a clear failure, nothing is left half-saved, and chatting still works after you fix it.
- [ ] The model dropdown lists your provider's models; pick one and it stays picked after Connect.
- [ ] A long model list is scrollable and usable on the phone.
- [ ] "Enter a model ID…" shows a text field; a manual ID is accepted and used.
- [ ] The refresh button next to the model list reloads it.
- [ ] Test message sends one small request, names the model it used, and shows the reply.
- [ ] Test message with a broken connection fails with a message instead of hanging.
- [ ] After Connect, open a chat and send a message: generation still works with the saved settings.
- [ ] Per-chat and per-character model choices still override the global model.
- [ ] While a reply is generating, Connect and Test message are refused with an explanation rather than interfering.
- [ ] With the engine stopped, the gear still opens Settings, the Connection tab shows the problem with a Try again button, and the Appearance tab still works.

## 3. Settings — Appearance & reading

- [ ] Text size: dragging the slider is smooth and the preview resizes as you drag.
- [ ] The chosen size applies to real chat messages, not just the preview.
- [ ] Compact / Normal / Spacious change line spacing in a real chat.
- [ ] Plain / Gradient change the chat background; Plain is genuinely plain.
- [ ] Generation time is on by default and appears under replies that have timing.
- [ ] Clock timestamp, Model icon and Token count are off by default and appear when switched on.
- [ ] A detail never shows a made-up value: on an old reply without that data, the detail is simply absent.
- [ ] Tapping the model icon under a reply shows the full model name.
- [ ] Settings survive closing and reopening the app, and a phone restart.
- [ ] Settings do not change anything in SillyTavern itself (they are device-only).
- [ ] Very large text sizes do not break the chat layout or the composer.

---

## 4. World Info — library

- [ ] The WI tab lists your real books, with entry counts.
- [ ] Source labels are right: Global, Character · Name · Primary, Character · Name · Additional, Chat, Persona.
- [ ] A book with no links shows no source line.
- [ ] Tapping a book expands it in place and lists its entries; tapping again collapses it.
- [ ] A large book (50+ entries) opens in reasonable time and scrolls smoothly.
- [ ] Entry rows show the right marker: ● keyword, ◆ always on, ▲ vectorized; disabled entries are dimmed.
- [ ] The enable checkbox turns an entry on and off, and the change survives leaving and reopening the page.
- [ ] Turning an entry off really stops it activating in a chat (check with a keyword you can trigger).
- [ ] With many books, the list is still usable and the page does not stall while counting entries.
- [ ] Leaving the WI tab and coming back shows current data.

## 5. World Info — books

- [ ] + Book creates a book; a duplicate or an invalid name is refused with a readable message.
- [ ] Import a SillyTavern lorebook JSON: entries arrive intact.
- [ ] Import a character-book style JSON (entries as a list): it converts and imports.
- [ ] Importing a book whose name is taken creates a numbered copy instead of overwriting.
- [ ] Importing a non-lorebook JSON is refused with a clear message, not a crash.
- [ ] Use globally / Stop using globally changes the Global source label, and takes effect in a chat.
- [ ] Rename: the book keeps its entries, and its global/chat/persona links follow the new name.
- [ ] Rename a character's primary book: the confirmation appears; choosing Update cards fixes the character, choosing Skip leaves it pointing at the old name and says so.
- [ ] Duplicate creates a copy with a free name and all entries.
- [ ] Export downloads a JSON file. **If nothing downloads on the phone, tell me — that may need a different approach in a mobile browser.**
- [ ] An exported book re-imports successfully.
- [ ] Delete asks first, names what uses the book, and removes it. SillyTavern no longer lists it.
- [ ] Deleting a book that a character uses does not break that character's chat.

## 6. World Info — folders

- [ ] Folder creates an empty folder, which stays after leaving the page.
- [ ] A book's ⋯ → Move to folder moves it; the book keeps its entries.
- [ ] Move to folder → New folder… creates and moves in one step.
- [ ] Moving a book out ("No folder") returns it to the main list.
- [ ] Renaming a folder keeps its books inside.
- [ ] Deleting a folder keeps its books, which reappear in the main list.
- [ ] Folders do not change which entries activate in a chat.
- [ ] If you use the WorldInfoDrawer extension on the desktop, folders set there show up here and the reverse.
- [ ] Folders and expand/collapse state survive an app reload.

## 7. World Info — entry editor

- [ ] + Add entry creates an entry and opens it.
- [ ] The header shows the book name and UID; the bottom navigation is hidden.
- [ ] **Keyboard:** typing in Title, Keywords and Content is uninterrupted; the field you are typing in is not covered by the keyboard and does not lose focus by itself.
- [ ] Typing a long entry in Content: the field scrolls and nothing is lost.
- [ ] The expand (⤢) button opens the big content editor; Use text keeps the change, Cancel does not.
- [ ] Strategy Keyword / Always on / Vectorized switches correctly; the keyword fields disappear for Always on.
- [ ] Position: choosing At depth shows Depth and Role; choosing Outlet shows the outlet name field.
- [ ] Order accepts negative numbers.
- [ ] Trigger % refuses values above 100 (the field itself should correct to 100, not silently save something else).
- [ ] Keywords accept commas, and `/regex/i` patterns are kept exactly.
- [ ] Logic and Optional filter work together as they do in SillyTavern.
- [ ] Per-entry overrides: Scan depth left blank means "use global"; Yes / No / Use global setting save correctly.
- [ ] The recursion and budget checkboxes save; Delay until recursion reveals its level field.
- [ ] Inclusion group, group weight, sticky / cooldown / delay save.
- [ ] Character filter names and the Exclude switch save; an entry with tag filters says the tags are kept.
- [ ] Generation types save; none selected means all.
- [ ] Save returns to the library and the entry row updates.
- [ ] Cancel with unsaved edits asks before discarding; Back behaves the same way.
- [ ] Cancel with no edits leaves immediately.
- [ ] Open the same entry in SillyTavern on the desktop: every field you set matches, and fields Pocket does not show (tags, anything exotic) are untouched.
- [ ] Edit the book in SillyTavern while an entry is open in Pocket, then save in Pocket: it refuses with "this book changed somewhere else" instead of overwriting.
- [ ] Duplicate and delete an entry from the library (via the editor flow), and confirm in SillyTavern.
- [ ] A saved entry actually fires in a chat when its keyword is used.

## 8. World Info — activation (the sliders icon on the library header)

- [ ] The page opens and shows your real SillyTavern values.
- [ ] **Dragging each slider works with a finger and does not jump or stop mid-drag.** *(This was broken before 0.7.13 for Min activations and Max recursion steps — please drag those two carefully.)*
- [ ] The number box next to each slider accepts a typed value, including values above the slider's range (Scan depth up to 1000, Budget cap up to 65536).
- [ ] Setting Min activations above 0 sets Max recursion steps to 0, and the reverse.
- [ ] Include names, Recursive scan, Insertion strategy and the matching defaults save.
- [ ] Save reports success; reopening shows the saved values.
- [ ] Open SillyTavern's own World Info settings on the desktop and confirm the same values (after a reload).
- [ ] Cancel with changes asks before discarding; Back behaves the same way.
- [ ] The settings genuinely affect a chat (for example, raise Scan depth and confirm an older keyword activates).

---

## 9. Across the whole app

- [ ] Android Back on each new page goes back one step instead of leaving the app: entry editor → library, activation → library, Settings → where you came from.
- [ ] Android Back closes an open dialog (delete confirmation, rename, move) without doing the action.
- [ ] Lock the phone / switch apps on each page and come back: nothing is lost and no work is repeated.
- [ ] During generation, World Info writes and connection changes are refused with a readable message.
- [ ] After a disconnect, the pages explain the problem rather than failing silently, and recover after Reconnect.
- [ ] Saved work and recovery still behave as before (see the main checklist).
- [ ] Nothing in SillyTavern's own interface broke: open it on the desktop and check characters, chats, personas and World Info.

## 10. Known and deliberate

Not bugs — no need to report these:

- The Use proxy switch changes the endpoint and reports whether the proxy answers. It does not start or stop the proxy itself; that belongs to the launcher and the Android package.
- Novel, Agnai and Risu lorebook formats cannot be imported (SillyTavern does not expose those converters).
- Empty folders are remembered on this device only; a folder with books in it travels with the books.
- The vectorized marker ▲ is my own choice; the mockups only showed ● and ◆.
- Appearance settings are stored on the device and do not appear in SillyTavern.
- Entry tag filters are preserved but can only be edited in SillyTavern.
