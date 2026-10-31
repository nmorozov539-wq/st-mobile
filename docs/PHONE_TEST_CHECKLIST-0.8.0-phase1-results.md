# Pocket Tavern — phone test checklist · 0.8.0-phase1

This build changes only how Pocket looks: the new charcoal and brass colours, the Rubik and Literata fonts, Lucide icons, and the new buttons and controls. Nothing should behave differently from 0.7.15. Work top to bottom. Tick what works, and write a note under anything that doesn't.

**Before you start:** install from `pocket-tavern-combined-v0.8.0-phase1.zip` with the usual repair/update flow (`node repair-pocket.cjs`, with the ZIP beside it or in Downloads). Open `http://127.0.0.1:8123/st-mobile/` and fully reload once. Check that Settings → Connection shows **0.8.0-phase1** for both the frontend and the bridge.

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## 1. Fonts load offline

- [x] Turn on airplane mode (Termux keeps running), then reload Pocket. Headings, buttons and labels use Rubik: round, even letters, not the phone's usual font.
- [x] In a chat, character replies use Literata, a book-like serif, and its *italics* look like real italics, not slanted upright letters.
- [ ] Your own messages use Rubik.
Found a funny big here. Having no API connection and trying to send the message makes an error. But that not the point. The point is that the whole thing jumps like there is a keyboard but there is none. Maybe even worse than with the keyboard. I'll attach the screenshot. And the error message doesn't seem to go away whatever I try to do.
Also the second thing: a fresh DeepSeek API connection demands to turn off the tool calling. Should've tested on a mock model but it isn't starting on a simple --mock flag so I didn't because I'm lazy

- [x] Nothing looks blank or late. The text is never invisible while the page loads.
- [x] Turn airplane mode off again.

## 2. Colours on every tab

The background is near-black charcoal and the accent is brass (warm gold). No blue or violet should be left anywhere.

- [x] **Home:** the active tab in the bottom bar is brass, and the other tabs are grey. The status dots are green when connected.
- [x] **Chats:** the list rows have thin dividers, and the + in the header is brass.
- [x] **Characters:** avatars are rounded squares, not circles. Import and Create read clearly.
- [x] **Personas:** avatars are rounded squares. The selected persona's check mark is brass.
Small sanitizing needed. Leaving a space after a persona name prevents saving and demands to not use special symbols
- [x] **World Info:** the Book button is brass with dark text. Import and Folder are outlined.
- [x] **Settings:** the selected tab is underlined in brass, and Connect is a brass button.
Settings icon seems to be off centre. Moved up a bit 
- [x] Error messages (for example a failed send) appear in a muted red box, and the text stays readable.
- [x] Notices at the bottom (Undo and similar) sit on a dark card, with the action in brass.
Very weird behavior with DeepSeek API noticed here. When it's selected, connected, then disconnected it shows a model deepseek-flash. Which the engine says does not exist. Because the real name uses capital letters. Why is it here in the first place. Then I tried deleting the chat and it kept saying that I need to connect to DeepSeek first. And then even asked me to review pending changes.
This whole review pending changes is really annoying actually because I have no clue how it works. Pressing reconnect seems to try reconnecting working engine and fails. Nothing besides discarding changes works there as well. It really is stupid. Probably needs a revisit or needs to go.
And by the way at the end of these manipulations I now have to chats that are the same. Weird
And it also doesn't let me change alternative greeting because DeepSeek is not connected. Like why the fuck does he care!?
## 3. Icons everywhere

Every icon is a thin line drawing. You should see no leftover text symbols such as ⚙ × ‹ ⋯ ✓ ▸ 📁 ⚡ ↻.

- [x] The bottom bar icons, the Home settings cog, and the chat header back arrow and cog.
- [ ] The ⋯ button on each message opens the action fan. Its icons are edit, copy, branch, bin, another reply and select.
There is no another reply button there

- [x] Send is an up arrow and Stop is a square.
- [ ] The close buttons in dialogs are an ×-shaped line icon.
No idea what is that about 

- [x] Long-press a button in the chat-cog or message fan. Its name still appears in a small label.
In notification at the bottom.
- [x] In the Model panel and the preset list, the chosen item has a check icon.
- [x] "Latest messages" (scroll up in a long chat) has a down-arrow icon.

## 4. Background: Gradient and Plain

- [x] Settings → Appearance → Background **Gradient**. Home, Chats and the chat show a faint warm glow at the top. It is not blue-violet.
- [x] Switch to **Plain**. Those screens become flat charcoal. The live preview follows.
- [x] Switch back to Gradient. The setting is still remembered after a reload.

## 5. Text size and spacing still drive chat text

- [x] Settings → Appearance → move **Chat text size** up and down. The live preview and a real chat grow and shrink with it.
- [x] Change **Line spacing** between Compact, Normal and Spacious. Chat lines get closer or wider.
- [x] At the default (16 px, Normal), the chat text is comfortable to read. Speech in quotes is a warm cream, and narration in italics is grey.

## 6. Character page

- [x] Characters → open one. The header, portrait, tags and text read clearly. The tags are small outlined chips.
In both mods a bot with a veeeery long author's name widens the page. All content stays the same but the page is wider 

- [x] Switch between Read and Edit. Edit fields have dark boxes with rounded corners.
- [x] The greeting arrows (‹ ›) are icons and still step through the greetings.
- [x] The conversation line above the portrait shows the chat name with a small down-chevron icon. Tapping it still opens the chat picker.
The text in that thing seems to be not centered properly. To the left top.
- [x] Save and Cancel work as before.

## 7. Memory

- [x] Chat cog → Memory. **Summarize now** is a brass button with a lightning icon.
- [x] The sections open and close, with a chevron that turns.
- [x] **Refresh** has a circular-arrow icon. Delete and Clear buttons are red-outlined.
- [x] The saved snippets sit on cards.

## 8. Edit persona

- [x] Personas → open one → Edit. The fields, the avatar (rounded square) and **Save** (brass) look right.
- [x] Save a small change. It saves as before.
- [x] The Link persona dialog and the replace-link confirmation read clearly.

## 9. World Info

- [x] Book rows show a chevron that turns when opened, the folder rows show a folder icon, and the ⋯ menus are icons.
- [x] Entry marks: keyword is a brass circle, Always on is an amber diamond, and Vectorized is a grey triangle.
- [x] Open an entry. The expand-content button is an icon. The strategy dropdown reads "Keyword", "Always on" and "Vectorized" (no symbols).
- [x] Add entry, Save and Delete still work.

Wait there is no delete entry button. Or I'm blind.

## 10. Preset sheet

- [ ] Chat cog → Preset. The scope switch (Global / Character / Chat) is a segmented control, with the chosen one raised.
No visual indication of a chosen strategy

- [ ] The entry toggles are brass when on and grey when off. Toggling one still saves.
DeepSeek again doesn't let me change shit. Nor do open ai comparable actually. Toggling a preset entry makes the engine apply changes infinitely or at least for a long time. 
Wait actually it does work. I toggle on/off, it says applying changes. Then I exit that menu back to the chat. Discard changes. And the toggled entry stays toggled the way I wanted. Weird.

- [ ] Generation parameters opens with a chevron. Edit an entry, then Save (brass) and Cancel.
Same issue here as above

## 11. Send and Stop


DeepSeek misbehaving and my openrouter account ran dry so no tests on an actual model this pass

- [ ] Type a message and tap **Send** (a brass rounded square). The reply streams in as before.
- [ ] During a reply, **Stop** (a dark square with an outline) stops it.
- [ ] The model chip in the composer still opens the Model panel. Its scope switch is a segmented control.

---

Anything that looks wrong but behaves correctly is a style issue for phase 2. Anything that behaves differently from 0.7.15 is a bug in this build.
