# Pocket Tavern — phone test checklist · 0.8.0-phase3

This build turns Home into a starting point. It includes everything from 0.8.0-phase2, so you can run both checklists on this one build: do the [phase 2 checklist](PHONE_TEST_CHECKLIST-0.8.0-phase2.md) first, then this one. Apart from Home, the only other change is how chat previews look in the Chats list.

**Before you start:** on the laptop, `git pull` on the `0.8-phase3-home` branch, or take `pocket-tavern-combined-v0.8.0-phase3.zip` and `repair-pocket.cjs` from the release folder. Copy both into Downloads (delete the older ones), then run `node repair-pocket.cjs`. It should print "Installed Pocket Tavern 0.8.0-phase3".

**When something is wrong**, say what you tapped, what you expected and what happened. A screenshot helps most.

---

## A. Corner

- [ ] The top left shows a small, muted "POCKET TAVERN 0.8.0-phase3" with a dot after it. The gear is on the right. There's no big title, tagline or Engine/API rows any more.
- [ ] The dot is green when everything is connected. While connecting it is amber and pulses, with "Connecting…" next to it. If the engine drops it is red with "Not connected". If the API check failed it is amber with "API not connected".
- [ ] Tapping the dot opens Settings → Connection, the same as the gear. Long-pressing the dot shows its status as a label.

## B. Continue card

- [ ] The top card shows the chat you used last: portrait with a coloured ring, the character's name in their colour, the chat name and time, and up to three lines of the last message.
- [ ] The last message reads as plain text: no `*asterisks*`, `#`, `>` or tags like `<scene>`.
- [ ] Tapping **Continue**, or anywhere else on the card, opens that chat. Back returns to Home.
- [ ] The card's colour matches that character's colour in the chat.

## C. Recent and Characters

- [ ] **Recent** lists the next three chats (portrait, name, time, one line of preview). Tapping one opens it. **All chats** opens the Chats tab.
- [ ] **Characters** is one row of round portraits that scrolls sideways. The characters you chatted with most recently come first. Long names are cut with "…".
- [ ] Tapping a portrait opens that character's page. **Add** (dashed + at the end) and **All** open the Characters tab.

## D. Empty states

- [ ] With characters but no chats, the top card says "Start your first story" and **Choose a character** opens the New chat picker. (Only if you can check it safely, for example on a fresh install.)
- [ ] With no characters at all, Home says "Your tavern is empty" with **Import a card** and **Create one**. Both work. (Same: only on a fresh install.)
- [ ] Right after starting the app, Home says "Opening your tavern…" instead of flashing the empty screen.

## E. Chats list

- [ ] Previews in the Chats tab are plain text, with no markdown marks or tags.

## F. Nothing else broke

- [ ] Tapping the Home tab while already on Home still opens your last chat.
- [ ] Android Back from a chat opened from Home returns to Home.
