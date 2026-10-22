# Pocket Tavern — phone test checklist · 0.7.14

This round has two jobs. First, confirm the fixes from your 0.7.13 results. Second, cover the checks that went untested last time. Work top to bottom. Tick what works, and write a note under anything that doesn't.

Your 0.7.13 results are kept as `PHONE_TEST_RESULTS_0.7.13.md`. Items that passed there aren't repeated here, apart from a few that the fixes could have affected.

**Before you start:** do a fresh install (the commands are in the thread), open `http://127.0.0.1:8123/st-mobile/`, and check that Settings → Connection shows **0.7.14** at the bottom for both the frontend and the bridge. Set aside a spare character, chat and World Info book for the destructive checks.

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## 1. Install as an app · portrait lock (new)

- [ ] In Chrome's ⋮ menu, **Install app** (or **Add to Home screen**) is offered for Pocket Tavern.
- [ ] The home-screen icon opens Pocket Tavern full screen, with no address bar.
- [ ] Opened from that icon, turning the phone sideways keeps the screen upright.
- [ ] In a normal Chrome tab it still rotates. That's expected: browsers don't allow a tab to lock rotation.
- [ ] The loading screen starts in the dark theme. There should be no flash of the old colours.

## 2. Engine and API connection

- [ ] Background the browser for 2–3 minutes, then return. The engine reconnects by itself, without Reconnect or a reload. It can take up to about 15 seconds.
- [ ] Switch to another app *while the engine is still starting*, then come back. It finishes starting or retries by itself.
- [ ] Lock the phone for a few minutes, then unlock it. Same result.
- [ ] After a reconnect, **send a message straight away** without opening Settings. Send connects the API first, and the reply arrives.
- [ ] Stop the launcher, restart it, then tap Reconnect. Home's API row goes back to Not checked or Connected, and Send still works.
- [ ] Note roughly how long the first "Engine ready" takes after a cold start, so we have a number for "irritating".

## 3. Android Back (gesture or button)

Each Back should do exactly what the on-screen ‹ arrow does. It should never leave the app on the first press.

- [ ] Chat → Back goes to where you opened the chat from (Home or Chats).
- [ ] Persona editor → Back goes to Personas.
- [ ] Preset entry editor → Back goes to the preset, then to the chat.
- [ ] World Info entry editor *with unsaved typing* → Back asks **Discard changes?**. Cancel keeps your typing; Discard returns to World Info.
- [ ] World Info entry editor with no changes → Back returns to World Info.
- [ ] Activation settings → Back returns to World Info. With unsaved changes, it asks first.
- [ ] Memory → Back returns to the same chat.
- [ ] Settings → Back returns to wherever you opened it from.
- [ ] Any tab page (WI, Characters, Chats, Personas) → Back goes Home.
- [ ] An open dialog, sheet or menu → Back closes only that, and doesn't carry out the action behind it.
- [ ] Repeated quick Backs never skip a step or exit unexpectedly.

## 4. Settings · Connection

- [ ] The eye button shows and hides a key you've just typed. With an empty field and a saved key, it explains that the saved key can't be shown.
- [ ] Under the model list, **Type a model ID instead** opens a text field. A typed ID is accepted and used for the next reply.
- [ ] The button beside the model list looks like a refresh icon and reloads the list.
- [ ] Connect with a **wrong OpenRouter key** reports that the key was rejected. Fix the key, Connect again, and it works.
- [ ] Connect with a good key reports the number of models.
- [ ] With the proxy running (`node start.cjs --proxy`), Use proxy says **Proxy running**.
- [ ] Start without `--proxy`, then turn Use proxy on. It says **Proxy not detected**, and Connect fails with a readable message.
- [ ] Test message now shows the model's reply most of the time. The "no reply arrived" note should be rare, and should only appear for reasoning models.
- [ ] With the engine stopped, the error notification doesn't cover the error text in Settings.

## 5. Settings · Appearance

- [ ] Turn on **Token count**. Replies show token numbers, including older ones.
- [ ] The preview message colours its dialogue the same way the chat does.
- [ ] Open SillyTavern itself (`http://127.0.0.1:8123/`) and check that none of the Appearance choices changed anything there.

## 6. Notifications and colours

- [ ] Toasts (the small notices at the bottom) use the new colours, are compact, and close when tapped.
- [ ] The bottom tab bar on Home uses the new theme.
- [ ] Dialogs, the recovery bar and the send-error line all use the new colours.
- [ ] Note any screen that still shows old colours.

## 7. Chat

- [ ] Regenerate a reply. When it finishes, it *replaces* the old one rather than appearing below it, both visually and after reopening the chat.
- [ ] Swipe left past the last alternative several times in a row. Each swipe makes a new reply; it never loops back to the first. If you can make it loop, note exactly what you did.
- [ ] Choosing a persona in the chat's Persona picker applies to new messages only. That's intended; just confirm it.

## 8. Chats library · fresh chats

- [ ] Open character A's chat. Then go to Chats → + → character A. The new chat contains **only the greeting**, not a copy of the old messages.
- [ ] The old chat is still listed and unchanged.

## 9. Start new chat from a character (rewritten section 13)

This is the second way to start a chat. Open any chat → tap the **character's name or avatar** at the top → tap **⋯** (top right of the character page) → **Start new chat**.

- [ ] The confirmation names the character and the chat you're leaving. the box for deleting the current chat is **unticked**.
- [ ] Cancel, or Back, returns to the character page and creates nothing.
- [ ] Start with the box unticked. A new chat opens with the greeting, and no AI request is made. The old chat is still in Chats.
- [ ] Using a **spare** chat: start with the box ticked. The new chat opens, the spare one disappears, and **Undo** in the notice brings it back.
- [ ] While a reply is being written, Start new chat is unavailable and explains why.

## 10. Personas

- [ ] Create a persona *with a portrait* and Save. You return to Personas with no error, and the portrait shows straight away.
- [ ] Edit an existing persona's text and Save. There's no "reading draft" error.
- [ ] Persona picker in a chat → link persona B to the character while persona A is already linked. It asks to replace; confirm. Only B is linked now.
- [ ] Same steps, but press **Cancel** in that confirmation. Nothing changes, and A still shows on the character card.
- [ ] Link a persona to **This chat**. It applies and reports success, with no "chat changed, reload" message.
- [ ] Saving a persona during a reply is refused with an explanation.

## 11. Characters

- [ ] Import a character card with an **embedded lorebook**. Pocket offers to import the book. Accept, then open WI: the book is there with its entries and is linked to the character as **Primary**.
- [ ] Import the same card again. The book arrives as a numbered copy, and the first book isn't overwritten.
- [ ] Decline the offer on another import. No book is created.
- [ ] Export during generation: the reply isn't affected, and Duplicate and Delete are disabled.
- [ ] Edit a character while a reply is being written. Your edits stay, and Save becomes available once the reply finishes. That's intended: saving waits for the engine.

## 12. Character associations (left untested last time)

- [ ] A character with **several** linked personas shows a count and all their names.
- [ ] Primary lorebook listed first, then additional books. A book that was deleted still shows its name, marked as missing.
- [ ] Connect a saved lorebook as **Additional**, then export the card as JSON. The additional book is *not* inside the file.
- [ ] Replace **Primary**, then export as PNG and JSON. The new book is inside, and the other card fields are unchanged.
- [ ] Unattach Primary (with confirmation). Additional books stay.

## 13. World Info

- [ ] Expand two books and open a folder, then reload the page. They're still open.
- [ ] Import a character-style lorebook JSON (export one from a character's embedded book in ST, or use the card from step 11). It imports.
- [ ] A book with 50+ entries opens and scrolls smoothly. Skip this if you don't have one.
- [ ] Open the same entry in SillyTavern on the desktop. Every field matches, and tags are untouched.
- [ ] Edit the book in SillyTavern while the entry is open in Pocket, then Save in Pocket. It refuses with "changed somewhere else".
- [ ] Duplicate and delete an entry, and check the result in SillyTavern.
- [ ] Activation: raise Scan depth and confirm that an older keyword now activates.

## 14. Memory

- [ ] Open a chat → gear → Memory. The page names *this* chat.
- [ ] **Summarize now** works. There's no "engine selected another chat" message.
- [ ] **Save settings** saves and confirms.
- [ ] Leave Memory and open WI, Characters and Personas. The Memory page never appears over them.
- [ ] Saved memories: Edit, Regenerate (Layer 0, with a cost warning) and Delete each change only the chosen snippet.
- [ ] Export saves a JSON file. Import replaces memory after a confirmation.
- [ ] The catch-up choice (All / One batch / Skip) appears and works. Stop in the chat bar shows "Progress saved".

## 15. Still on the list (not in 0.7.14)

Known gaps, so there's no need to report them:

- No **Resend** after deleting an AI reply.
- The proxy switch doesn't start or stop the proxy; the launcher still does that.
- No picker for keys you saved earlier.
- Swipe-to-delete in Chats has no animation.
- Greeting organisation is unclear and gives little feedback.
- System font size has only a small effect on the chat.
- TalkBack hasn't been checked.

## 16. Overall impressions

Anything else: speed, looks, things that felt wrong.
