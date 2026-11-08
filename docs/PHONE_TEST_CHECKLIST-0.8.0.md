# Pocket Tavern — phone test checklist · 0.8.0

0.8.0 is the whole 0.8 design pass in one build. It includes the chat screen (phase 2) and Home (phase 3), so run those two checklists on this build first:

- [Phase 2: chat screen](PHONE_TEST_CHECKLIST-0.8.0-phase2.md)
- [Phase 3: Home](PHONE_TEST_CHECKLIST-0.8.0-phase3.md) (it now says "POCKET TAVERN 0.8.0" in the corner)

This checklist covers what's new on top: the list pages, the character page, Settings, the sheets, states, and accessibility.

**Before you start:** on the laptop run `git fetch origin` and `git checkout 0.8-phase4-6`, or take `pocket-tavern-combined-v0.8.0.zip` and `repair-pocket.cjs` from the release folder. Copy both into Downloads (delete the older ones), then run `node repair-pocket.cjs`. It should print "Installed Pocket Tavern 0.8.0". Settings → About should show 0.8.0 for both Pocket Tavern and the engine bridge.

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## A. Tab bar and headers

- [ ] Only the tab you're on is lit: its icon is brass on a soft pill and its name is brighter. Home is no longer bold on every page.
- [ ] Chats, Characters, Personas and WI all have the title on the left and their actions as icons on the right. The main action (+) is brass.
  - Chats: + (new chat)
  - Characters: upload (import a card), + (create)
  - Personas: + (create persona)
  - WI: upload (import a lorebook), folder (new folder), + (new book), sliders (activation)
- [ ] Long-press any of those icons: its name shows at the bottom, and letting go doesn't trigger it.
- [ ] Once a list has 8 or more items, a search field appears under the title. Typing filters the list straight away, and × clears it.

## B. Chats

- [ ] Each row shows the portrait, the name, the time and a clean preview with no markdown. The chat's own name only shows when that character has more than one chat.
- [ ] **Recent | By character** at the top. By character groups the chats under each character with a count. The first three groups start open; tap a group to open or close it. Inside a group, rows show the chat's name.
- [ ] Your choice is remembered after you leave the tab and after a restart.
- [ ] Swipe-to-delete and the ⋯ on a row still work as before.

## C. Characters

- [ ] By default characters show as **two-column portrait cards** with the name and up to two tags. The circles button switches to **three-column circles**. The choice is remembered.
- [ ] The sort menu has **Recent** (characters you chatted with most recently first), **Name** and **Newest**. Favourites (★ in SillyTavern) always come first.
- [ ] A row of tag chips filters by tag. Tapping the same chip again, or All, clears the filter. If your cards have no tags in SillyTavern, the row doesn't appear.
- [ ] Search matches names and tags.
- [ ] With no characters at all, the page says "No characters yet" with **Import a card** and **Create one**.

## D. Character page (workshop)

- [ ] Opening a character shows the workshop: a large portrait with a ring in the character's colour, the name in that colour, creator and version if the card has them, and tags.
- [ ] **Start chat** does what the old Start chat button did. **Edit** switches to the editor, and the Read/Edit switch appears in the header there.
- [ ] Below come Description, Greeting (arrows when there are alternate greetings), Lore (linked lorebooks, same controls as before), Preset, Persona and Advanced definitions.
- [ ] **Preset** shows the preset this character uses. If you set one for the character from a chat (preset chip → This character), it shows that name with "chosen for this character". Otherwise it shows your global preset.
- [ ] The ⋯ menu (duplicate, export, delete and so on) and Chats still work.
- [ ] Editing, Save in ST and Cancel work as before. The Chat colour row is in the editor.

## E. Personas and Lore

- [ ] Personas are one row each: portrait, name, and the title or start of the description. Your current persona has a **Current** tag. Tapping a row opens the editor.
- [ ] World Info looks the same apart from the header icons. Creating a book, a folder and importing a lorebook all work from the header.

## F. Settings

- [ ] The gear on Home opens a grouped list:
  - **Connection:** the engine status with Reconnect, and Chat completion (provider and model)
  - **Chats:** Presets and Appearance & reading
  - **About:** the version
- [ ] Chat completion opens the Connection page; the title says "Connection". Back returns to the list, and Back again leaves Settings.
- [ ] Appearance & reading opens its own page with the same controls as before.
- [ ] **Presets** opens the preset manager set to Everywhere: choose, edit, import.
- [ ] Tapping the status dot on Home goes straight to the Connection page.

## G. Sheets

- [ ] In a chat, the preset chip opens the preset sheet. At the top, "Use this preset for" offers **This chat**, **This character** and **Everywhere**, with a line under it explaining what each covers.
- [ ] Choosing This character and a preset, then opening another chat with the same character, uses that preset. A different character still uses the global one.
- [ ] Choosing This chat overrides the character's preset for that chat only.
- [ ] The model sheet uses the same three labels.
- [ ] Memory: Enable Summaryception and Pause summarization are now switches. The status line is green when memory is up to date.

## H. States

- [ ] Right after starting the app, Home says "Opening your tavern…" and the dot pulses amber with "Connecting…". Chats, Characters and Personas say "Loading…" instead of "No chats yet".
- [ ] Stop the engine (or Termux), then use the app. The "Engine disconnected" banner appears **above** the page and pushes it down; it doesn't cover the header. Home and the lists say "Can't reach the engine".
- [ ] Reconnect brings everything back.

## I. Accessibility

- [ ] Small grey text (times, the version, hints) is easier to read than in phase 3.
- [ ] With a keyboard (or a Bluetooth keyboard on the phone), Tab shows a brass focus ring on every control.
- [ ] Small controls (tag chips, the layout switch, the status dot, the chips in the chat header) are easy to hit with a thumb.

## J. Nothing else broke

- [ ] The phase 2 and phase 3 checklists still pass.
- [ ] Import a character card, create a character, create a persona, and switch persona from a chat.
- [ ] Android Back from every page goes to the place you came from.
