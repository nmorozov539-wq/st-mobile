# Pocket Tavern — phone test checklist · 0.8.0-phase1.2

This build fixes how Pocket behaves when the model connection (DeepSeek or OpenRouter) is down while SillyTavern itself is fine. Saving now needs only SillyTavern; the model is only needed to send, get another reply, or summarize. The old "Review pending changes" screen is gone. If a save is ever cut off, one banner asks **Retry** or **Discard**.

**Before you start:** copy `pocket-tavern-combined-v0.8.0-phase1.2.zip` and the new `repair-pocket.cjs` into Downloads (delete the older ones), then run `node repair-pocket.cjs`. It should print "Installed Pocket Tavern 0.8.0-phase1.2" and "Updated code". `pt` should then report 0.8.0-phase1.2, and Settings → Connection should show it for both the frontend and the bridge. Set aside a spare character with two short chats, and one with only one chat.

**If you still had "Review pending changes" items from 0.8.0-phase1.1:** after the update they appear one at a time in the new banner at the top, as "Couldn't save … : it was not confirmed before the engine restarted". Choose **Discard** unless you know the change is missing.

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## A. DeepSeek disconnected

Settings → Connection → DeepSeek. Make the connection fail, for example with airplane mode or a wrong key, so the status says not connected. SillyTavern itself stays running.

- [ ] **Delete chat:** delete a chat of the character that has two. It goes away at once, with Undo. No "connect to DeepSeek first", and no review screen.
- [ ] **Delete the only chat:** delete the only chat of the other character. It goes away, and **no new empty chat appears** in its place. Undo brings back exactly one copy.
- [ ] **Edit and swipe:** in a chat, edit a message and save it. Then swipe between alternatives of the last reply. Both work.
- [ ] **Greeting change:** in a chat that only has the greeting, swipe to another greeting. It changes and stays after reopening the chat.
- [ ] **New chat:** start a new chat from a character. It opens with the greeting.
- [ ] **Preset toggle:** Chat cog → Preset → switch an entry off. It saves straight away ("Changes applied"), and there's no endless "Applying changes".
- [ ] **Persona:** edit a persona's name or description and save. Then pick a different persona for a chat. Both work.
- [ ] **Send:** type a message and tap Send. You get a clear message that the API isn't connected, and your draft is kept. Nothing else is blocked afterwards.
- [ ] **Model name:** the model panel and Settings don't show a made-up lower-case name such as `deepseek-flash` as if you had chosen it.

## B. DeepSeek connected

Turn the connection back on: Settings → Connection → Connect. The status shows how many models loaded.

- [ ] **Model name:** the model panel lists DeepSeek's models with their real capitals. Choosing one keeps exactly that spelling.
- [ ] **Old name repaired:** if you had a lower-case model saved before, send a message. It works, and the model panel now shows the properly capitalised name.
- [ ] **Send and Stop:** a reply streams in. During another reply, Stop stops it.
- [ ] **Another reply:** on the last reply, message menu → Another reply. A new alternative streams in.
- [ ] **Tool-calling preset:** pick a preset that turns tool calling on, then send. The reply arrives normally. Once, a notice says Pocket sends replies without tools and the preset is unchanged. Afterwards, the preset still shows tool calling on.
- [ ] **Summarize now:** in a longer chat, Memory → Summarize now works as before.
- [ ] Repeat **delete chat**, **edit** and **preset toggle** from section A. Same result.

## C. The new banner

The banner only appears when a save is cut off, for example when SillyTavern restarts at that moment.

- [ ] Start a change such as deleting a chat, and immediately stop Termux's server (Ctrl+C). Start it again and reload Pocket. A banner at the top reads "Couldn't save "Delete conversation": …" with **Retry** and **Discard**.
- [ ] **Retry** finishes the change, or, if it had already happened, quietly treats it as done. The banner goes away.
- [ ] Do it once more and choose **Discard**. The banner goes away, with a note that a change which had already reached the engine stays saved.
- [ ] While the banner is showing, other changes such as edits and preset toggles still work.

## D. `--mock`

- [ ] `node ~/pocket-tavern/start.cjs --mock` refuses, and the message gives the exact `node prepare.cjs … ~/pocket-tavern-mock --mock` command and how to start that separate mock install. Running those commands from the unzipped ZIP folder gives you a working mock install. This part is optional.

---

Anything that still asks you to connect the model just to save something is a bug in this build.
