# Pocket Tavern — phone test checklist · 0.8.0-phase2

This build is the chat screen pass: reading styles, the character's colour, a new header, drop-down menus, side panels and display regex. Behaviour outside the chat screen is unchanged, except the Chat colour row on the character page and the Thinking blocks setting in Appearance.

**Before you start:** copy `pocket-tavern-combined-v0.8.0-phase2.zip` and the new `repair-pocket.cjs` into Downloads (delete the older ones), then run `node repair-pocket.cjs`. It should print "Installed Pocket Tavern 0.8.0-phase2". Settings → Connection should show 0.8.0-phase2 for both the frontend and the bridge. Have Stribog selected as the preset for one chat, with its regex scripts allowed in SillyTavern (Extensions → Regex → preset scripts allowed).

**When something is wrong**, say which screen you were on, what you tapped, what you expected and what happened. A screenshot helps most.

---

## A. Reading

- [ ] **Fonts:** character replies are in Literata (serif). Your own turns are in Rubik (sans), on a faint tinted card that is a little narrower than the replies, with your name on the right.
- [ ] **Text size:** Settings → Appearance → Chat text size. Moving the slider changes both replies and your own turns. Line spacing does the same.
- [ ] **Speech and narration:** text in "quotes" is warm cream, *italics* are the muted grey narration tone, plain text stays plain.
- [ ] **OOC:** send a message with a line starting `OOC:` and another with `((double parentheses))`. The OOC line shows as a small dimmed line with a thin bar on its left; the parentheses part is dimmed inline. Neither turns cream.
- [ ] **Details line:** under replies, the swipe arrows are bigger boxes, and generation time, clock, model name and tokens (whichever are on in Appearance) sit on one small muted line on the right, separated by dots. Tapping the model name shows it in full.

## B. Thinking blocks

- [ ] Settings → Appearance → **Thinking blocks**: Collapsed is the default. Replies with thinking show one small bordered "Thinking" row with an arrow.
- [ ] Switch to **Expanded** and open a chat: every thinking block starts open. Switch back: they start closed.
- [ ] You can still open or close a single block by tapping it; it stays that way while you're in the chat.
- [ ] During a reply that streams thinking, the block follows the setting.

## C. Character colour

- [ ] Open chats with two or three different characters. Each character's name, the faint glow at the top of the chat, the ring around the portrait in the header, and the Send button take a colour from that character's portrait.
- [ ] A mostly grey or black-and-white portrait falls back to brass.
- [ ] Character page → Edit: a **Chat colour** row shows "Automatic, from the portrait". Pick a colour, Save, and open the chat: the new colour is used. Tap **Automatic**, Save: it goes back to the portrait's colour.
- [ ] The hand-picked colour survives a restart of Termux and the app (it's saved in the card).
- [ ] Colours read clearly as text on the dark chat for every character you try. Tell me about any that look muddy or too bright.

## D. Header

- [ ] The header shows the portrait (with the coloured ring), the name, and a line "as *persona* · *model*" with a small preset chip (sliders icon + preset name).
- [ ] Tapping the persona opens the persona picker. Tapping the model opens the model panel. Tapping the preset chip opens the preset panel.
- [ ] Long names (persona, model, preset) are cut with "…" and never push the ⋯ button off screen.
- [ ] Tapping the portrait or the name still opens the character page.
- [ ] The composer is now one row: the text field and Send (or Stop) side by side.

## E. Menus and long-press

- [ ] The ⋯ at the top right opens a drop-down: the chat's name in small text, then Persona, Preset, Memory, and Other chats (only when the character has more than one chat). Each row works.
- [ ] A message's ⋯ opens a drop-down: Edit, Copy, Another reply (latest reply only), Fork from here, Select messages, then Delete in red below a line. Each row works.
- [ ] Near the bottom of the screen the message menu opens upwards and stays fully on screen.
- [ ] Tapping outside a menu or pressing Back closes it.
- [ ] **Long-press** any icon-only button (back arrow, ⋯, Send, the cog on Home, World Info icons…): its name appears at the bottom, and letting go does **not** trigger the button.

## F. Side panels

- [ ] Swipe **left** starting on the header (not from the very edge of the screen): a panel slides in from the right with **Model** and **Preset**, each showing the current value. Tapping a row opens that screen.
- [ ] Swipe **right** starting on the header or on the message box: a panel slides in from the left with **Persona** and **Memory**.
- [ ] The panel follows your finger; a short or slow swipe snaps back without opening.
- [ ] Swipe the panel back towards its edge, tap outside it, or press Back: it closes.
- [ ] Swiping on a message still switches between alternative replies, and does not open a panel.
- [ ] A swipe from the very edge of the screen is still Android's Back.
- [ ] A swipe that starts on the persona/model/preset line does not also tap it.
- [ ] While the keyboard is open, swiping inside the text field doesn't open a panel.

## G. Regex display (Stribog)

In a chat whose preset is Stribog, ask for a reply that uses its tags (a scene mood, a place, a letter or phone note, coloured dialogue, inner chatter).

- [ ] `<scene mood=…>` replies sit in a tinted panel with a coloured left edge. No raw `<scene>` tag shows.
- [ ] `<place>` becomes a small-caps line with a 📍.
- [ ] `<note type=letter>` becomes paper; `phone` becomes a blue bubble; other note types are styled too.
- [ ] `<c=red>"…"</c>` dialogue shows in that colour, not cream.
- [ ] `<inner>` becomes a collapsed "💭 Inner chatter" box that opens on tap.
- [ ] Older messages are styled the same (depth rules work), and turning a script off in SillyTavern stops it applying after you reopen the chat.
- [ ] While a reply is streaming it is already styled.

## H. Model HTML (Freaky Frankenstein)

- [ ] In a chat using Frankenstein, a reply with its HTML (feed, phone screen, terminal, Plot Momentum box) shows its layout and colours. Nothing in the reply covers the header or composer, and the reply can't open links or load pictures from the internet.

## I. Nothing else broke

- [ ] Send, Stop, Another reply, Edit, Copy, Fork, Delete with Undo, Select messages all work as in phase 1.2.
- [ ] Memory notice and Summarize still work from the chat.
- [ ] Android Back from the chat goes to where you came from; with a menu or panel open it closes that first.
