# Pocket Tavern phone test

This kit creates a separate test tavern from your installed SillyTavern 1.19.0 engine. It does not copy your personal `data` directory, config, credentials, characters or chats. Its fresh defaults connect to the included local mock model. Your regular ST is not modified. No APK, Python, npm install, or model API key is needed.

## Update your existing phone test (v3)

Stop the test servers with Ctrl+C in Termux. Extract this ZIP into Download; keep its `pocket-tavern-phone-v3` folder. Then:

```sh
cd ~/storage/downloads/pocket-tavern-phone-v3
node update-test.cjs
node start-test.cjs
```

Reload the phone browser at **http://127.0.0.1:8123/st-mobile/**. Do not rerun preparation on your existing test folder. The updater preserves `data`, `config.yaml` and settings, backs up previous code, and checks the original ST source before applying compatibility fixes. Both test ports must be free before updating. Startup now fetches an uncached session token and verifies it with a ping before loading or saving settings; a rejected token is reread at most twice. No settings-save request is replayed. The new mock accepts `[slow]` or a message starting with `slow`, streams for about 27 seconds, and rejects empty prompts. Your regular ST does not need to stop.

## First run

1. Download `pocket-tavern-phone-v3.zip` onto the phone. Extract it with your phone's file manager into **Download**. Inside you should have `pocket-tavern-phone-v3/prepare-test.cjs`.
2. Open Termux. If ST is occupying its current session, open another Termux session. Leave the regular ST installation alone.
3. If Termux cannot access Downloads, run `termux-setup-storage` and allow the Android storage request. This lets Termux read the downloaded kit.
4. Run these commands one at a time:

```sh
cd ~/storage/downloads/pocket-tavern-phone-v3
node prepare-test.cjs ~/SillyTavern
node start-test.cjs
```

`~/SillyTavern` must be the ST folder containing `server.js` and `package.json`. If yours is elsewhere, replace that argument with its actual path. Preparation checks version 1.19.0 and refuses to overwrite an existing test folder. If extraction created an extra folder, use the folder containing `prepare-test.cjs`.

5. Wait until Termux says **SillyTavern is listening**. On the same phone, open:

**http://127.0.0.1:8123/st-mobile/**

The kit runs ST at port 8123 and its mock model at 8124, both on this phone only. It is independent of the PC preview at the same URL. Neither port should already be in use. It reads shared installed dependencies but does not change them. Allow space for a copy of ST's code and public defaults.

## Reopen later

Do not run preparation again. Open Termux and run:

```sh
cd ~/storage/downloads/pocket-tavern-phone-v3
node start-test.cjs
```

Keep the extracted kit for its launcher. The persistent test data lives in `~/pocket-tavern-phone-test/data`. Ctrl+C stops both test servers. Return to your usual ST address to use your regular installation. Nothing was added to it or needs uninstalling.

## First checks — keep it simple

- Choose Seraphina and send “Hello”. You should receive a reply beginning “The phone bridge works!”. The status should end with **saved chat verified**.
- Open Chats, create a test conversation, type a draft, switch chats and return. Check that the draft stays with its own conversation.
- Send `[slow]`; once text appears, press Stop. The partial reply should stay saved.
- Edit a reply; try `**bold**` and `*italics*`. Try + New reply and the alternative arrows.
- Switch to another phone app, return, and check whether the chat and draft are intact. Then try a short screen lock. Report whether it continued, paused, disconnected, or lost anything.
- For restart recovery, send `[slow]`, stop the test servers with Ctrl+C in Termux, then start them again. In the browser press Reconnect, inspect the disk-saved conversation, then press **I checked the saved chat**. The app should not resend the message automatically.

Start with the first “Hello” test and tell me what you see; we can work through the rest together.

## If something fails

- **Folder does not exist:** ST is installed at a different path, or the extracted folder is nested. Send the command you usually use to start ST and the error text.
- **Wrong version:** do not upgrade your regular ST just for this kit; tell me the version printed by the installer.
- **Test folder already exists:** use the start command. Existing test chats are preserved.
- **Port in use:** stop the other test session; do not close unrelated processes blindly.
- **Waiting for engine:** check Termux's first error. Open `http://127.0.0.1:8123/` to check that the test engine itself loads. This phone kit has no PC diagnostic overlay.
- **No model connection:** open the test engine at that root address and inspect the Custom/OpenAI-compatible connection. Fresh defaults point to `http://127.0.0.1:8124/v1`, model `st-mobile-mock`. No key is needed.
- **Screen lock or switching apps stops it:** report it first. Background execution is exactly what we are testing; this kit does not change battery or background permissions automatically.

## Limits

Preparation, isolation and installer guards were tested on PC. The phone launcher was syntax-checked; actual Android execution and lifecycle still need your phone test. This is a web frontend with the full ST browser runtime loaded offscreen, not an APK. Basic Markdown only; no groups, attachments, slash commands, tools, automatic continuation, or touch swipe gestures. Drafts use browser localStorage and do not sync between browsers or devices. Only the local mock has been validated. Avoid multiple frontend tabs writing the same test chat.

Compatibility fixes apply only inside the copied test engine: explicit CSRF headers for async token counts, a stable test-specific session cookie, and exact local aliases for copied image-codec WASM assets. CSRF and file-path checks remain enabled. Your original ST is untouched. A direct uncached heartbeat checks the server every three seconds while the page is active, and immediately when returning to it. Reload engine is available during review if the hidden runtime is stuck.

ST's official Android documentation: https://docs.sillytavern.app/installation/android-(termux)/

### A settings/CSRF warning in your regular ST

This updater only patches the isolated test engine. The original kit shared ST's cookie name across ports; v2 and v3 use a separate test cookie. After updating, close old ST and Pocket Tavern browser tabs, restart your usual ST, and open its normal address in a fresh tab. Do not delete browser storage or ST data. If the warning returns, note the failing request URL and status from that usual-ST session; the test-only startup change is not evidence that a regular-ST issue is fixed.
