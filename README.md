# Pocket Tavern — ST Mobile PC prototype

A separate, responsive frontend backed by a loaded SillyTavern 1.19.0 runtime. Character selection, conversation history, new/renamed chats, local drafts, formatted messages, sending, streaming, stopping, editing, and reply alternatives work against isolated test data and a local mock model.

## Try it

Open [the running preview](http://127.0.0.1:8123/st-mobile/). Choose Moss or Seraphina.

- Send an ordinary message to see a streamed mock reply.
- Send `[slow]`, then press **Stop** after text appears. The partial reply stays saved.
- Send `[fail]` to exercise a provider failure; the submitted user message stays saved. Send ordinary text afterward to recover.
- **Edit** changes a message. Editing an assistant alternative updates that alternative without replacing the others.
- **+ New reply** generates another alternative for the last assistant message. Arrow buttons select saved alternatives; the counter shows the current one.
- **Chats** opens older conversations, starts a new one, or renames the current one. Existing names and unsafe filenames are rejected.
- Drafts stay with their character and conversation in this browser, including after a rename or page reload. They are cleared only after the submitted message is verified as saved.
- Messages support basic Markdown: emphasis, headings, lists, quotes, code blocks, and HTTP(S) links. Character portraits load from the local engine; unavailable images fall back to initials.
- Streaming follows the bottom while you are there. Scrolling up keeps your reading position; **Latest messages** returns to the reply.
- Refresh rereads the engine state. Reload restores the last conversation. If the engine disconnects, restart it and press **Reconnect**.
- Recovery reloads disk-saved state without saving stale partial text. Interrupted writes require you to read the saved conversation and press **I checked the saved chat** before resuming. Nothing is resent automatically.

“Saved chat verified” means messages and chat metadata were compared with an independent server readback, including unknown fields. The exact empty world-info timer object that ST adds while loading a chat is treated as equivalent to its absence; nonempty timers remain protected. Generation failure is reported separately from whether the user's message was saved.

Current v3 phone-kit PC validation sandbox: `/tmp/pocket-phone-v3-engine`. Earlier PC prototype data remains at `/tmp/st-mobile-pc-zqw10qi4`. Its data is disposable and may disappear after reboot. Your original ST data, settings, and credentials were never copied. Ports 8123 and 8124 listen on localhost.

## Start a fresh preview

With Node.js, Python 3, and your existing ST dependencies installed:

```sh
python3 /home/Riv/Projects/st-mobile/scripts/run-pc-prototype.py
```

Wait for ST to finish starting, then open `http://127.0.0.1:8123/st-mobile/`. The fresh defaults configure the mock model and a Tester persona automatically; Moss is an additional disposable fixture. Ctrl+C stops both servers. Existing servers must be stopped first because the ports must be free. Another checkout can be supplied with `--source /absolute/path/to/SillyTavern`.

Preparation copies code and public defaults into a fresh temporary directory and shares installed Node dependencies via a symlink. It excludes personal data/configuration. The launcher's syntax and preparation were checked; the equivalent two server commands were exercised end to end, rather than the combined launcher itself.

## Implementation

`prototype/frontend` contains the standalone interface. `prototype/extension` contains the adapter, ST bindings, and a same-origin MessageChannel bridge. The parent window and origin are checked; only listed commands are exposed. Message HTML is escaped before the small Markdown formatter renders it. Raw HTML, inline images, and unsafe link protocols are not enabled.

The offscreen iframe loads ST's original browser runtime. ST still assembles prompts, runs generation, streams results, cancels requests, selects swipes, and saves chats. Edits update the ST message, synchronize its selected swipe, emit ST edit/update events, refresh its message block, and save. These are plain-text edits; they do not reproduce every original editor feature.

Chat selection updates only the character’s `chat` attribute through ST’s merge endpoint, then reloads through ST. It avoids serializing the entire character editor: in the embedded PC browser, that path produced duplicate form fields and invalid array-valued card settings. New/renamed chats and saved messages are independently checked before success is reported.

One compatibility patch is applied **only to the copied ST tokenizer file**: its async OpenAI token-count request uses fetch with ST's existing CSRF headers. The embedded PC browser otherwise sent the legacy AJAX request without that header, causing incomplete prompts. CSRF remains enabled. `scripts/patch-pc-tokenizer.py` requires the exact tested source fragment and refuses to patch an unfamiliar implementation. Your installed ST source is untouched.

The supplied checkout reports package version 1.19.0 and is one commit beyond the 1.19.0 tag. Compatibility checks use the package version; this is not a byte-for-byte validation of the release tag.

## Validation

See [TEST_REPORT.md](TEST_REPORT.md) for the latest live recovery and chat-management checks. Run `npm test` in this folder. **42 passing tests** cover readiness/version guards, detached metadata, stable character keys, refused/busy selection, stale messages/targets, streaming replacement, cancellation settlement, request deduplication/conflicts, overlap rejection, provider/save failures, swipe preservation, refused updates, JSON-normalized persistence checks, chat namespace/name guards, draft isolation/rename/reload, escaped Markdown, reading-position decisions, interrupted transport, stale connection replies, and narrow character-card updates. Python launch/preparation scripts and frontend/bridge JS syntax were checked.

Live browser tests against isolated data and the local mock verified:

- Character selection and switching between Moss and Seraphina.
- One saved user message per send, normal streamed reply, and recovery after mock HTTP 503.
- Slow accumulated text visibly arriving; Stop retained a partial response shorter than the complete fixture.
- Generation of a second alternative without a new user message; selection of both alternatives.
- Editing only the first alternative and preserving the second; saved-file inspection confirmed both.
- Engine restart/browser reload persistence for the stopped reply, failed user message, and edited alternatives.
- Older conversation browsing, new chat creation, rename, separate character/chat drafts, and restoration after page reload.
- Rich Markdown, escaped malicious HTML/unsafe links, and successfully loaded local portraits.
- A stream grew while scrollTop remained 0; jumping to latest reached the bottom. Stop retained a shorter saved reply.
- Engine interruption during a stream, explicit reconnect/review, no automatic replay, and continued generation afterward.
- Responsive layout at 390 × 844 and the ordinary PC preview viewport.

## Limitations

- This is a web prototype, not an Android APK. The user has tested the Termux kit on Android and reports smooth operation after the fixes, including app switching and phone locking. Long-running background execution, battery behavior, and WebView lifecycle still need broader testing.
- The full ST page remains loaded offscreen, so this is not yet a lightweight independent native engine client.
- Only ordinary text and single-character chats are supported. No groups, attachments, slash commands, tool calling, automatic continuation, or auto-swipe. Reply alternatives use buttons; touch swipe gestures are not implemented.
- Markdown is a limited subset, not the full ST renderer. Tables, inline images/media, reasoning panels, custom HTML, and ST macros are not rendered as rich content. Shared dependencies can cause ST image-codec path warnings; media processing was not validated.
- Arbitrary ST extension compatibility and simultaneous writers are untested. Use one prototype tab, and avoid editing the same chat through another engine tab.
- Request deduplication/status lasts only within one runtime session, capped at 100 generations. A local request journal survives reloads, but it cannot guarantee exactly-once writes across engine restarts. Recovery never automatically repeats a write. Health checks detect engine loss; reconnection is explicit. Drafts and the journal use browser localStorage: clearing browser data/private-mode limits/quota failures can lose them. Drafts are not synced to ST or other devices.
- Stop is enabled after streaming text appears; cancellation during prompt preparation is not tested. A stop can arrive after the model finishes and cannot undo already completed text.
- Only the local mock was tested. No real provider credentials or external model requests were used.

## Phone test kit

Download `pocket-tavern-phone-v3.zip` and follow [PHONE-README.md](phone-package/PHONE-README.md). The Node-only kit makes a separate ST 1.19.0 test instance from the phone’s installed code and public defaults, shares installed dependencies, excludes personal data/config and copied third-party extensions, and runs the local mock. Preparation refuses existing test folders and incompatible versions. It does not install anything into the regular ST instance. The copied phone engine now includes explicit tokenizer CSRF headers, a test-specific session cookie, exact aliases for locally copied codec WASM files, and a fresh-token startup check before settings can load/save. The diagnostic overlay is excluded. Existing test data can be retained with `update-test.cjs`; stop the test servers before updating. Build again with `python3 scripts/build-phone-package.py`.
