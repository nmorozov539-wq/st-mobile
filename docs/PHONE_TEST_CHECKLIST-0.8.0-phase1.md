# Pocket Tavern — phone test checklist · 0.8.0-phase1.1

This build changes only how Pocket looks: the new charcoal and brass colours, the Rubik and Literata fonts, Lucide icons, and the new buttons and controls. Nothing should behave differently from 0.7.15. Work top to bottom. Tick what works, and write a note under anything that doesn't.

**Before you start:** install from `pocket-tavern-combined-v0.8.0-phase1.1.zip` with the usual repair/update flow (`node repair-pocket.cjs`, with the ZIP beside it or in Downloads). Open `http://127.0.0.1:8123/st-mobile/` and fully reload once. Check that Settings → Connection shows **0.8.0-phase1.1** for both the frontend and the bridge.

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## 1. Fonts load offline

- [ ] Turn on airplane mode (Termux keeps running), then reload Pocket. Headings, buttons and labels use Rubik: round, even letters, not the phone's usual font.
- [ ] In a chat, character replies use Literata, a book-like serif, and its *italics* look like real italics, not slanted upright letters.
- [ ] Your own messages use Rubik.
- [ ] Nothing looks blank or late. The text is never invisible while the page loads.
- [ ] Turn airplane mode off again.

## 2. Colours on every tab

The background is near-black charcoal and the accent is brass (warm gold). No blue or violet should be left anywhere.

- [ ] **Home:** the active tab in the bottom bar is brass, and the other tabs are grey. The status dots are green when connected.
- [ ] **Chats:** the list rows have thin dividers, and the + in the header is brass.
- [ ] **Characters:** avatars are rounded squares, not circles. Import and Create read clearly.
- [ ] **Personas:** avatars are rounded squares. The selected persona's check mark is brass.
- [ ] **World Info:** the Book button is brass with dark text. Import and Folder are outlined.
- [ ] **Settings:** the selected tab is underlined in brass, and Connect is a brass button.
- [ ] Error messages (for example a failed send) appear in a muted red box, and the text stays readable.
- [ ] Notices at the bottom (Undo and similar) sit on a dark card, with the action in brass.

## 3. Icons everywhere

Every icon is a thin line drawing. You should see no leftover text symbols such as ⚙ × ‹ ⋯ ✓ ▸ 📁 ⚡ ↻.

- [ ] The bottom bar icons, the Home settings cog, and the chat header back arrow and cog.
- [ ] The ⋯ button on each message opens the action fan. Its icons are edit, copy, branch, bin and select. **Another reply** (circular arrows) appears only on the latest character reply, as in 0.7.15.
- [ ] Send is an up arrow and Stop is a square.
- [ ] Dialogs with a close button in the top corner (for example Characters → Import, or Start new chat) show it as a thin × icon, not a text ×.
- [ ] Long-press a button in the chat-cog or message fan. Its name appears in a small label at the bottom of the screen, as before.
- [ ] In the Model panel and the preset list, the chosen item has a check icon.
- [ ] "Latest messages" (scroll up in a long chat) has a down-arrow icon.

## 4. Background: Gradient and Plain

- [ ] Settings → Appearance → Background **Gradient**. Home, Chats and the chat show a faint warm glow at the top. It is not blue-violet.
- [ ] Switch to **Plain**. Those screens become flat charcoal. The live preview follows.
- [ ] Switch back to Gradient. The setting is still remembered after a reload.

## 5. Text size and spacing still drive chat text

- [ ] Settings → Appearance → move **Chat text size** up and down. The live preview and a real chat grow and shrink with it.
- [ ] Change **Line spacing** between Compact, Normal and Spacious. Chat lines get closer or wider.
- [ ] At the default (16 px, Normal), the chat text is comfortable to read. Speech in quotes is a warm cream, and narration in italics is grey.

## 6. Character page

- [ ] Characters → open one. The header, portrait, tags and text read clearly. The tags are small outlined chips.
- [ ] Switch between Read and Edit. Edit fields have dark boxes with rounded corners.
- [ ] The greeting arrows (‹ ›) are icons and still step through the greetings.
- [ ] The conversation line above the portrait shows the chat name with a small down-chevron icon. Tapping it still opens the chat picker.
- [ ] Save and Cancel work as before.

## 7. Memory

- [ ] Chat cog → Memory. **Summarize now** is a brass button with a lightning icon.
- [ ] The sections open and close, with a chevron that turns.
- [ ] **Refresh** has a circular-arrow icon. Delete and Clear buttons are red-outlined.
- [ ] The saved snippets sit on cards.

## 8. Edit persona

- [ ] Personas → open one → Edit. The fields, the avatar (rounded square) and **Save** (brass) look right.
- [ ] Save a small change. It saves as before.
- [ ] The Link persona dialog and the replace-link confirmation read clearly.

## 9. World Info

- [ ] Book rows show a chevron that turns when opened, the folder rows show a folder icon, and the ⋯ menus are icons.
- [ ] Entry marks: keyword is a brass circle, Always on is an amber diamond, and Vectorized is a grey triangle.
- [ ] Open an entry. The expand-content button is an icon. The strategy dropdown reads "Keyword", "Always on" and "Vectorized" (no symbols).
- [ ] Add entry and Save still work. (There is no Delete for single entries yet; that is a separate feature.)

## 10. Preset sheet

- [ ] Chat cog → Preset. The scope switch (Global / Character / Chat) is a segmented control, with the chosen one raised.
- [ ] The entry toggles are brass when on and grey when off. Toggling one still saves.
- [ ] Generation parameters opens with a chevron. Edit an entry, then Save (brass) and Cancel.

## 11. Send and Stop

- [ ] Type a message and tap **Send** (a brass rounded square). The reply streams in as before.
- [ ] During a reply, **Stop** (a dark square with an outline) stops it.
- [ ] The model chip in the composer still opens the Model panel. Its scope switch is a segmented control.

---

Anything that looks wrong but behaves correctly is a style issue for phase 2. Anything that behaves differently from 0.7.15 is a bug in this build.
