# Pocket Tavern — phone test checklist · 0.7.15

This round checks the fixes from your 0.7.14 results, the new features (preset import, several personas per character, direct DeepSeek), and the World Info checks that couldn't be done last time. Work top to bottom. Tick what works, and write a note under anything that doesn't.

Your 0.7.14 results are kept as `PHONE_TEST_CHECKLIST-0.7.14-results.md`. Things that passed there aren't repeated, apart from a few the fixes could have touched.

**Before you start:** do a fresh install (the commands are in the thread), open `http://127.0.0.1:8123/st-mobile/`, and check that Settings → Connection shows **0.7.15** at the bottom for both the frontend and the bridge. Set aside a spare character and chat for the persona checks. Have a DeepSeek API key ready for section 9 (platform.deepseek.com → API keys; it needs a small balance).

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## 1. Damaged character cards (new fix, please check first)

While tracking down a stalled reply, I found that every Pocket version so far opened SillyTavern in a way that loaded a second hidden copy of its page. Whenever SillyTavern saved a character from inside Pocket (for example when a new chat was started), some card fields were saved twice, as a list. A damaged card can make replies hang with "ST is still busy after submission". 0.7.15 stops this, and repairs damaged cards once, the first time the engine starts.

- [ ] After the first start, open a character you've chatted with in Pocket and export it as JSON. Creator, Creator's notes, Personality, Scenario and Tags look like normal text, not like `["text", ""]`.
- [ ] Start a new chat with that character, then export it again. The fields still look normal.
- [ ] Open the same character in SillyTavern itself (`http://127.0.0.1:8123/`). Its fields look as you left them.

## 2. Android Back

- [ ] Fresh open → Chats → a chat → chat gear → Memory. Back returns to the chat, the next Back to Chats, the next Back Home. The app never closes on the way.
- [ ] Repeat it with Home → a chat → Memory. Back walks the same way, ending on Home.
- [ ] Open a chat, open the Preset sheet, close it with Back, then keep pressing Back. Each press goes one step (chat → Chats or Home). The app doesn't close, and Back never does nothing.
- [ ] Same with the Persona picker and the chat menu.
- [ ] After Reconnect (Home → engine row), Back still behaves the same.
- [ ] On Home, Back leaves the app, as before.

## 3. Token count

- [ ] Settings → Appearance → turn on **Token count**. Open an older chat. Every reply shows a token number within a second or two, including old ones.
- [ ] Close and reopen the chat. The numbers are still there.
- [ ] Turn it off. The numbers disappear.

## 4. Regenerate and alternatives

- [ ] Tap **Another reply** (message menu) on the last reply. The old reply disappears straight away and the new one streams in its place.
- [ ] Do it again and press **Stop** early. The reply you had comes back.
- [ ] Swipe between alternatives (or use the ‹ › arrows). No "alternative selected" notice appears.

## 5. Memory · Summarize now

- [ ] In a short chat (fewer replies than the "keep word for word" number), tap **Summarize now**. A notice says there's nothing to summarize yet and gives both numbers (kept word for word, replies in this chat).
- [ ] In a longer chat, tap it again. It says older replies were summarized, or that no new summary was written, and the Memory page shows any new snippets.

## 6. Preset import (new)

- [ ] Chat gear → **Preset** → **Choose preset** → **Import preset…**. Pick a SillyTavern chat-completion preset `.json` from your phone.
- [ ] It says "Imported “Name”. Tap it to use it." and the preset appears in the list. The preset in use doesn't change yet.
- [ ] Tap the imported preset. It becomes the chat's preset and its prompts show in the Preset page.
- [ ] Send a message. The reply follows the imported preset.
- [ ] Import the same file again. It's added as "Name (2)"; the first one is untouched.
- [ ] Try a file that isn't a preset (a character card or a random JSON). It's refused with a readable message and nothing is added.

## 7. Several personas per character (new)

- [ ] Persona picker → a persona → **Link…** → the character. Then do the same with a second persona. The second link is **added**: no "replace" question.
- [ ] The character page shows "2 personas · Name A, Name B". Tapping it lists both, each with its own **Edit** and **Remove link**.
- [ ] Start a new chat with that character. It asks **which persona this chat should use**. Pick one; a notice confirms it.
- [ ] Open the character page from that chat. Under the persona line it shows "This chat · Name".
- [ ] Choose **Not now** in another new chat. Replies still work, using SillyTavern's own choice.
- [ ] **Remove link** on one persona only removes that one. The other stays linked.

## 8. Personas · portrait

- [ ] Edit a persona, change its portrait, Save. The new portrait shows straight away, with no empty-frame flash, both in the list and in chats.

## 9. Direct DeepSeek (new)

- [ ] Settings → Connection → **Provider: DeepSeek**. The endpoint and proxy fields disappear and a **DeepSeek API key** field shows.
- [ ] Paste your key and tap **Connect**. It says "Connected to DeepSeek · N models loaded".
- [ ] Pick **deepseek-chat** in the model list and tap Connect again. Send a message. The reply comes from DeepSeek.
- [ ] Try **deepseek-reasoner**. The reply arrives.
- [ ] With a wrong key, Connect says DeepSeek refused the request (key or balance).
- [ ] Switch **Provider** back to OpenAI-compatible and Connect. Your OpenRouter endpoint, key and model come back, and replies work again.
- [ ] A chat or character that has its own OpenRouter model shows a clear message under DeepSeek instead of failing silently.

## 10. World Info (left over from 0.7.14)

- [ ] Expand a book and a folder, then do a **real reload** (pull to refresh, or close and reopen the app). They're still expanded.
- [ ] Import the generated test book **`Pocket test book (60 entries).json`** (in this release's files). It shows 60 entries; scrolling, search and opening entries stay smooth.
- [ ] "Changed somewhere else", exact steps:
  1. In Pocket, open an entry in that book and change its text, but **don't save**.
  2. In SillyTavern (`http://127.0.0.1:8123/`, another tab), open the same book, change any entry, and wait a moment (ST saves on its own).
  3. Back in Pocket, tap **Save**. It refuses with "changed somewhere else" and keeps your typing. If it saves without asking, note it: that's a bug.

## 11. Quick regression pass

- [ ] Send, Stop and Continue still work in a normal chat.
- [ ] The engine reconnects by itself after 2–3 minutes in the background.
- [ ] Character import/export, World Info edit and save, and Start new chat still work.
- [ ] Note the cold start time to "Engine ready" again, to compare with last time (about 11 s).
