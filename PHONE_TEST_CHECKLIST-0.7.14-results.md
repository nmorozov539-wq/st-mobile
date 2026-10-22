# Pocket Tavern — phone test checklist · 0.7.14

This round has two jobs. First, confirm the fixes from your 0.7.13 results. Second, cover the checks that went untested last time. Work top to bottom. Tick what works, and write a note under anything that doesn't.

Your 0.7.13 results are kept as `PHONE_TEST_RESULTS_0.7.13.md`. Items that passed there aren't repeated here, apart from a few that the fixes could have affected.

**Before you start:** do a fresh install (the commands are in the thread), open `http://127.0.0.1:8123/st-mobile/`, and check that Settings → Connection shows **0.7.14** at the bottom for both the frontend and the bridge. Set aside a spare character, chat and World Info book for the destructive checks.

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## 1. Install as an app · portrait lock (new)

- [x] In Chrome's ⋮ menu, **Install app** (or **Add to Home screen**) is offered for Pocket Tavern.
- [x] The home-screen icon opens Pocket Tavern full screen, with no address bar.
- [x] Opened from that icon, turning the phone sideways keeps the screen upright.
- [x] In a normal Chrome tab it still rotates. That's expected: browsers don't allow a tab to lock rotation.
- [x] The loading screen starts in the dark theme. There should be no flash of the old colours.

## 2. Engine and API connection

- [x] Background the browser for 2–3 minutes, then return. The engine reconnects by itself, without Reconnect or a reload. It can take up to about 15 seconds.
- [x] Switch to another app *while the engine is still starting*, then come back. It finishes starting or retries by itself.
- [x] Lock the phone for a few minutes, then unlock it. Same result.
- [x] After a reconnect, **send a message straight away** without opening Settings. Send connects the API first, and the reply arrives.
- [x] Stop the launcher, restart it, then tap Reconnect. Home's API row goes back to Not checked or Connected, and Send still works.
- [x] Note roughly how long the first "Engine ready" takes after a cold start, so we have a number for "irritating".
Compiling fron end libraries 3225 ms + roughly 8 seconds in the app
## 3. Android Back (gesture or button)

Each Back should do exactly what the on-screen ‹ arrow does. It should never leave the app on the first press.

- [x] Chat → Back goes to where you opened the chat from (Home or Chats).
- [x] Persona editor → Back goes to Personas.
- [x] Preset entry editor → Back goes to the preset, then to the chat.
- [x] World Info entry editor *with unsaved typing* → Back asks **Discard changes?**. Cancel keeps your typing; Discard returns to World Info.
- [x] World Info entry editor with no changes → Back returns to World Info.
- [x] Activation settings → Back returns to World Info. With unsaved changes, it asks first.
- [x] Memory → Back returns to the same chat.
- [x] Settings → Back returns to wherever you opened it from.
- [x] Any tab page (WI, Characters, Chats, Personas) → Back goes Home.
- [x] An open dialog, sheet or menu → Back closes only that, and doesn't carry out the action behind it.
- [x] Repeated quick Backs never skip a step or exit unexpectedly.


## 4. Settings · Connection

- [x] The eye button shows and hides a key you've just typed. With an empty field and a saved key, it explains that the saved key can't be shown.
- [x] Under the model list, **Type a model ID instead** opens a text field. A typed ID is accepted and used for the next reply.
- [x] The button beside the model list looks like a refresh icon and reloads the list.
- [x] Connect with a **wrong OpenRouter key** reports that the key was rejected. Fix the key, Connect again, and it works.
- [x] Connect with a good key reports the number of models.
- [x] With the proxy running (`node start.cjs --proxy`), Use proxy says **Proxy running**.
- [x] Start without `--proxy`, then turn Use proxy on. It says **Proxy not detected**, and Connect fails with a readable message.
- [x] Test message now shows the model's reply most of the time. The "no reply arrived" note should be rare, and should only appear for reasoning models.
- [x] With the engine stopped, the error notification doesn't cover the error text in Settings.

## 5. Settings · Appearance

- [ ] Turn on **Token count**. Replies show token numbers, including older ones.
Still no token count

- [x] The preview message colours its dialogue the same way the chat does.
- [x] Open SillyTavern itself (`http://127.0.0.1:8123/`) and check that none of the Appearance choices changed anything there.

## 6. Notifications and colours

- [x] Toasts (the small notices at the bottom) use the new colours, are compact, and close when tapped.
- [x] The bottom tab bar on Home uses the new theme.
- [x] Dialogs, the recovery bar and the send-error line all use the new colours.
- [x] Note any screen that still shows old colours.

## 7. Chat

- [x] Regenerate a reply. When it finishes, it *replaces* the old one rather than appearing below it, both visually and after reopening the chat.
On the new reply tokens appeared. Not on the old ones though. And a small clarification, it not that the old version showed two alternate replies one after another. It's that during the generation it shows under one another. Native st just hides the old message right away and I would prefer this behavior here as well

- [x] Swipe left past the last alternative several times in a row. Each swipe makes a new reply; it never loops back to the first. If you can make it loop, note exactly what you did.
- [x] Choosing a persona in the chat's Persona picker applies to new messages only. That's intended; just confirm it.

I don't like the notifications that tell me that the alternative was selected. Like no shit, Sherlock. I literally see it. Would be better if that notification was gone

## 8. Chats library · fresh chats

- [x] Open character A's chat. Then go to Chats → + → character A. The new chat contains **only the greeting**, not a copy of the old messages.
- [x] The old chat is still listed and unchanged.

## 9. Start new chat from a character (rewritten section 13)

This is the second way to start a chat. Open any chat → tap the **character's name or avatar** at the top → tap **⋯** (top right of the character page) → **Start new chat**.

- [x] The confirmation names the character and the chat you're leaving. the box for deleting the current chat is **unticked**.
- [x] Cancel, or Back, returns to the character page and creates nothing.
- [x] Start with the box unticked. A new chat opens with the greeting, and no AI request is made. The old chat is still in Chats.
- [x] Using a **spare** chat: start with the box ticked. The new chat opens, the spare one disappears, and **Undo** in the notice brings it back.
- [x] While a reply is being written, Start new chat is unavailable and explains why.

## 10. Personas

- [x] Create a persona *with a portrait* and Save. You return to Personas with no error, and the portrait shows straight away.
It still kinda shows that empty screen for one frame

- [x] Edit an existing persona's text and Save. There's no "reading draft" error.
- [x] Persona picker in a chat → link persona B to the character while persona A is already linked. It asks to replace; confirm. Only B is linked now.
- [x] Same steps, but press **Cancel** in that confirmation. Nothing changes, and A still shows on the character card.
- [x] Link a persona to **This chat**. It applies and reports success, with no "chat changed, reload" message.
- [x] Saving a persona during a reply is refused with an explanation.

## 11. Characters

- [x] Import a character card with an **embedded lorebook**. Pocket offers to import the book. Accept, then open WI: the book is there with its entries and is linked to the character as **Primary**.
- [x] Import the same card again. The book arrives as a numbered copy, and the first book isn't overwritten.
- [x] Decline the offer on another import. No book is created.
- [x] Export during generation: the reply isn't affected, and Duplicate and Delete are disabled.
- [x] Edit a character while a reply is being written. Your edits stay, and Save becomes available once the reply finishes. That's intended: saving waits for the engine.

## 12. Character associations (left untested last time)

- [ ] A character with **several** linked personas shows a count and all their names.
I literally can not link more than one persona. And chat specific one is showed nowhere 

- [x] Primary lorebook listed first, then additional books. A book that was deleted still shows its name, marked as missing.
- [x] Connect a saved lorebook as **Additional**, then export the card as JSON. The additional book is *not* inside the file.
- [x] Replace **Primary**, then export as PNG and JSON. The new book is inside, and the other card fields are unchanged.
- [x] Unattach Primary (with confirmation). Additional books stay.

## 13. World Info

- [x] Expand two books and open a folder, then reload the page. They're still open.
If by reloading you mean switch between tabs, then yes. Reloading the app/page - no

- [x] Import a character-style lorebook JSON (export one from a character's embedded book in ST, or use the card from step 11). It imports.
- [ ] A book with 50+ entries opens and scrolls smoothly. Skip this if you don't have one.
Don't have one

- [x] Open the same entry in SillyTavern on the desktop. Every field matches, and tags are untouched.
Not on the desktop, but opened st itself. All seems to be working

- [ ] Edit the book in SillyTavern while the entry is open in Pocket, then Save in Pocket. It refuses with "changed somewhere else".
Couldn't replicate.

- [x] Duplicate and delete an entry, and check the result in SillyTavern.
Works

- [x] Activation: raise Scan depth and confirm that an older keyword now activates.

## 14. Memory

- [x] Open a chat → gear → Memory. The page names *this* chat.
- [ ] **Summarize now** works. There's no "engine selected another chat" message.
Can't tell if it's working or not. I press the button, it kinda looks like it's working. But then nothing. Can it be because I'm trying on a chat with 3 messages total?

- [x] **Save settings** saves and confirms.
- [x] Leave Memory and open WI, Characters and Personas. The Memory page never appears over them.
Strange behavior. Right after opening I'm going chats → chat → memory and when pressing about back it closes the app on the second step back without returning to the chats menu

- [ ] Saved memories: Edit, Regenerate (Layer 0, with a cost warning) and Delete each change only the chosen snippet.
- [ ] Export saves a JSON file. Import replaces memory after a confirmation.
- [ ] The catch-up choice (All / One batch / Skip) appears and works. Stop in the chat bar shows "Progress saved".

I will probably have to play it a bit for real to test properly 
## 15. Still on the list (not in 0.7.14)

Known gaps, so there's no need to report them:

- No **Resend** after deleting an AI reply.
- The proxy switch doesn't start or stop the proxy; the launcher still does that.
- No picker for keys you saved earlier.
- Swipe-to-delete in Chats has no animation.
- Greeting organisation is unclear and gives little feedback.
- System font size has only a small effect on the chat.
- TalkBack hasn't been checked. And we don't need one.
-  still no preset import!!! That's the biggest missing feature 

## 16. Overall impressions

Anything else: speed, looks, things that felt wrong.
Overall much better than the first run. 
For the next pass you can skip the proxy switcher, swipe animation, greeting organization and fonts