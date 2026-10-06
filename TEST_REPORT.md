# Steps 1–3 verification — 6 October 2026

Test environment: copied SillyTavern package 1.19.0, disposable data at `/tmp/st-mobile-pc-zqw10qi4`, local mock on 8124, frontend/engine on 8123. Installed ST source/data were not changed. No real provider requests or credentials were used.

## Automated checks

`npm test`: 34 tests passed. Coverage includes existing send/stop/edit/swipe/persistence guards, history names and collisions, drafts across chat/character/reload/rename, escaped Markdown, scrolling decisions, uncertain transport/reconnect, narrow card updates, and recovery reloading saved state without replaying or saving stale runtime content. JavaScript syntax and Python script compilation passed.

## Live browser checks

- Opened older Moss chats, created a new named conversation, renamed it, and verified the old name disappeared from history.
- Different drafts stayed with the original Moss chat, the new/renamed chat, and Seraphina. Reload restored the selected chat and its draft.
- Edited a greeting to include headings, emphasis, quotes, lists and fenced/inline code. Raw malicious HTML remained visible text; an unsafe JavaScript link never became an active link. Local portraits loaded.
- At a 390 × 844 viewport, scrolling up during a stream left scrollTop at 0 while content height grew from 793 to 879 pixels. Latest messages returned to the bottom. Stop saved a 391-character partial reply, shorter than the complete 425-character saved mock reply.
- Shut down ST during two slow generations. The heartbeat showed a disconnect warning and retained the draft; Send stayed disabled. Reconnect loaded disk-saved messages, removing unsaved partial runtime text. Confirmation reconciled those messages without resending.
- Disk inspection found exactly one user message for each interrupted request. A mock 503 also preserved exactly one user message and reported generation failure separately from saved-data verification. An ordinary send subsequently succeeded.
- Generated a second reply alternative, edited it with Markdown, and verified both alternatives stayed in the saved file.
- Character content remained unchanged through new/rename/open, apart from the selected chat and ST's avatar/card-spec normalization. The bridge avoids the full editor form path that produced invalid duplicate field arrays in this embedded browser.

- Responsive checks found no horizontal overflow at 390 × 844 or 1100 × 800; the desktop sidebar measured 275 pixels. Temporary viewport overrides were reset.

## Scope limits

PC browser plus local mock only. Android/Termux, WebView background lifecycle, real providers, groups, media, gestures, arbitrary ST extensions and concurrent writers remain untested. Markdown is a small safe subset. Local drafts/journal depend on this browser's localStorage; they do not sync or guarantee exactly-once writes across restarts. The offscreen full ST page is still required. The sandbox is temporary; the launcher creates fresh data rather than reopening this test history.


## Phone feedback fixes — kit v2

The supplied `Log.md` showed repeated CSRF rejections, an empty model message list, and image-codec file-path errors from shared dependencies. The copied test server now uses a stable test-specific cookie name; token counting explicitly sends ST's CSRF header; exact codec WASM files are copied inside the test server and aliased while unrelated paths/extensions stay blocked. CSRF protection stays on. These fixes do not modify installed ST.

37 automated tests pass, including direct uncached heartbeat failures/deadlines, installer/update preservation, stable cookie names, and unfamiliar-source rejection before replacing test code. Syntax checks passed on the three patched ST files. A real WASM fetch returned the PNG codec bytes; an unrelated outside WASM path and a JSON file stayed rejected.

Fresh v2 PC preparation passed first character selection and first send with saved chat verified, without a review warning. The server received a full nonempty prompt and the user's message. A message beginning `slow` selected slow mode, remained visibly streaming at 352 characters, and ultimately saved the complete response. Mock chunks now arrive every 500 ms (about 27 seconds total); empty prompts are rejected rather than masked by a normal mock response. Stopping ST while the page remained loaded showed Engine disconnected and disabled chat controls without requiring reload. No codec or CSRF errors appeared during those verified requests.

The test updater was run against a previously prepared v1 PC copy and retained its saved fixture and configuration, backing up the previous code. Its phone CLI requires test servers to be stopped first. The launcher replaces ST's root-address banner with the frontend address. Phone execution of v2 and the observed v1 Android app-switch/lock behavior still need rechecking on the actual phone; they are not PC verification claims.

## Phone startup follow-up — kit v3

After receiving v3, the user reported that everything is working smoothly on the phone. This is user-reported Android validation, separate from the automated and PC checks below.

42 automated tests pass. Test-only ST startup now fetches an uncached session token and checks it with a ping before returning it to ST. A rejected token is reread at most twice; settings writes are never replayed. The token endpoint explicitly prevents caching. Installer/update tests verify code backups and preservation of data/configuration.

A fresh v3 PC test engine loaded the normal ST page and mobile frontend together without console errors. Sending Hello v3 completed through the mock model and the frontend verified the saved chat. The Android startup failure was not reproduced on PC. The user clarified that the warning occurs in their usual ST, which these test-only patches do not modify. ST's original cookie name depends on the hostname, not the port; the v1 test engine could therefore collide with regular ST in one browser. The test-specific cookie introduced in v2 remains in v3. A fresh regular-ST tab on the phone is needed to establish whether the remaining error is stale session state or a separate regular-ST issue.

## Combined setup v0.4 — PC verification

48 automated tests pass. Added coverage checks stale settings and operation locking, deletion/readback failure, separate reasoning events and snapshots, suppression of character-editor submission during blank-chat persona selection, metadata restoration on failure, copied dependencies, one-engine normal launch plans, independent combined updates and non-merging data import. Syntax checks cover JS launchers/frontend/bridge and Python package/fixture scripts.

Fresh preparation copied code and 344 MB of local dependencies into `/tmp/pocket-combined-engine`; node_modules is a real directory with no dependency symlinks. The real combined `node start.cjs --mock` launcher started both services and printed the frontend URL; Ctrl+C stopped both. A restart and code update retained settings/chats. A separate fresh `/tmp/pocket-combined-normal` started with `node start.cjs`, no mock, fresh standard data and OpenRouter selected without credentials. The normal browser settings panel loaded, source switching persisted, and a blank key was rejected before ST's secret-write path. No real key/model-list/provider generation was tested.

Live frontend selection of Pocket Fixture set saved temperature to 0.25. Pocket Tester selected a saved persona and its distinctive text reached the provider request. Switching personas in a fresh one-message chat left the character PNG bytes unchanged; the adapter avoids ST's greeting refresh through its character editor. Global lorebook selection/clearing persisted; Pocket Lore's distinctive constant entry reached the provider request. Mock health reported temperature 0.25 and both persona/lore fixture flags true. Native change events invoke ST's existing preset/source/model handlers; the embedded PC browser did not dispatch ST's jQuery synthetic preset event reliably.

A `[think]` response saved separate reasoning metadata and reopened it in a collapsible block after browser reload. During `[think] [slow]`, the reasoning block was separately expandable while generation remained active. Stop retained a 328-character partial response (shorter than the complete slow fixture) plus reasoning, with saved-state verification. The deletion confirmation named the disposable Combined checks chat; deletion removed its file and switched to another verified saved conversation. No original user data was modified. At a 390 × 844 CSS viewport, the chat and settings dialog fit without horizontal overflow (dialog width 352 px).

The new v0.4 kit still needs phone execution and real OpenRouter verification. Android background behavior, native dependency portability across runtimes, arbitrary presets/extensions and simultaneous writers are not established by these PC checks. The migration tool was tested with synthetic standard files; no personal-data migration or automatic synchronization is claimed.

## Connection indicator v0.4.1

49 automated tests pass. Source audit confirmed that ST's browser secret state is an array of masked key metadata with an active flag. The connection indicator now requires an active key, rather than a truthy collection of stored keys. A regression check covers missing/empty/inactive metadata and proves that the helper never reads key values. This changes the indicator only; it does not rotate, delete or expose credentials. The earlier v0.4 archive remains available unchanged. Phone/provider validation is still pending.

## v0.4.2 connection correction

Phone feedback: pasting a key then Connect had no useful result. Connect now saves a nonempty entered key through ST before connecting, rejects a missing active key visibly, waits for ST loading to finish, refreshes model choices, and displays failed/timeout outcomes. The settings panel shows connecting progress. 51 automated tests pass, including entered-key forwarding/clearing and connection wait/success/failure/timeout cases. Real OpenRouter verification remains pending; these tests do not prove a provider accepts credentials. Full ST editing access is labelled as an interim route for character/persona/preset authoring.

Live isolated PC check for v0.4.2: custom mock Connect settled to Valid; switching to OpenRouter and pressing Connect without a saved key visibly displayed “Enter an OpenRouter API key, then press Connect.” Restored the mock source afterward. No real credential was entered or provider generation performed.

## v0.4.3 observable connection checks

User screenshot shows a saved key, no_connection, empty models, and a clipped settings heading; it does not prove the prior corrected modules loaded. Every relative frontend/bridge import now has the release query. Settings displays frontend and bridge build IDs, plain disconnected status, and a result beside Connect. Connection observes the single native ST status request to distinguish no request, HTTP/provider failure, unreadable reply, network failure, and timeout without exposing provider body or sending a duplicate request. 53 tests pass. Live PC native mock Connect displayed Valid and one model loaded. At 390x760, dialog bounds were 16–744 with no horizontal overflow; corrected the sticky heading offset after this check. Real phone/OpenRouter outcome remains pending.

## v0.4.4 custom OpenAI-compatible/proxy connection

User supplied or-proxy code forwards localhost:8001 paths to https://openrouter.ai using wreq-js Chrome TLS impersonation. Direct OpenRouter mode bypasses it. The Custom connection now exposes base URL, manual model ID, model choices, and the Custom secret slot; Connect saves edited endpoint/model before connecting. OpenRouter and Custom key readiness are separate. 55 automated tests pass. Live isolated PC ST accepted a trailing-slash mock endpoint (normalized to http://127.0.0.1:8124/v1) and fixture/custom-model; independent settings.json readback confirmed both. Native Connect returned Valid and one model, then the model was restored to st-mobile-mock. No real key or Cloudflare/OpenRouter transport test was performed. Existing proxy must run separately; it is neither redistributed nor launched by the kit.

## v0.4.5 optional bundled OpenRouter proxy

Includes proxy.cjs and setup-proxy.cjs. One-time setup validates that wreq-js loads in the current runtime and copies installed dependencies from the working same-phone proxy folder; no secrets, settings, logs, or PID files are copied. `node start.cjs --proxy` owns a loopback proxy on 8001 and ST on 8123, waits for proxy readiness, and stops the session if either child exits. Plain startup keeps the option disabled; mock fixtures reject it. Updater backs up proxy code and preserves installed dependencies and data.

56 automated tests pass, including installation isolation, optional launch plans, and update preservation. `node tests/proxy-integration.cjs` passes local routing, header forwarding, Chrome transport-option selection, SSE forwarding, upstream cancellation, bounded error messages, combined startup/Ctrl+C shutdown, and busy-port refusal without stopping the existing listener. Integration uses an injected fixture transport and fixture ST child, with no external requests or keys. The supplied dependency copy contains Android native bindings, so real wreq/OpenRouter transport cannot be verified on this PC from that copy; Android/provider verification remains required.
