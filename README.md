# Pocket Tavern — combined Termux prototype

Pocket Tavern is a mobile browser interface for SillyTavern 1.19.0. One prepared folder contains ST code, Pocket Tavern and copied dependencies. One command starts the local ST server and serves both interfaces. ST owns ordinary data/default-user files and handles prompts, providers, generation and saving. There is no separate Pocket Tavern chat database and no Android APK yet.

## Current build

`pocket-tavern-combined-v0.5.4.zip` is generated in the project folder for phone transfer. It contains preparation/update tools and our frontend/bridge, not a redistributed ST installation. Preparation copies your installed ST code/defaults/dependencies into a new folder, excluding regular data/settings/configuration and third-party extension code; the pinned Pocket-adapted Summaryception is supplied separately in the kit. The resulting folder can run independently of the original installation. Native dependencies must come from the same phone/runtime on which it will run.

Follow [the phone instructions](phone-package/PHONE-README.md). After extracting into Downloads:

```sh
cd ~/storage/downloads/pocket-tavern-combined-v0.5.4
node prepare.cjs ~/SillyTavern ~/pocket-tavern
cd ~/pocket-tavern
node start.cjs
```

Open http://127.0.0.1:8123/st-mobile/ after ST finishes starting. The original ST interface is at the root address. Ctrl+C stops the launcher and its engine. Stop the previous test session first; both use port 8123. Preparation refuses an existing destination. Normal mode uses fresh ST defaults configured for OpenRouter, with no imported credentials and no mock process.

Settings provides OpenRouter/custom connection selection, saving an OpenRouter key through ST, connecting, refreshing the loaded model list, model selection, existing chat-completion presets, existing personas, thinking visibility and existing global lorebooks. Manage library provides character, persona and chat-completion preset import/create/edit. Standard card fields and portraits have controls; embedded lorebooks and opaque extension fields remain editable in Advanced JSON. Preset prompt blocks and order toggles are editable, including manual length instructions. Other primitive preset fields are retained in a collapsible section. Full ST remains available for unsupported advanced workflows. Keys are never returned through the bridge or persisted in frontend localStorage. Selecting a preset may change model/connection settings. Persona selection preserves an untouched greeting rather than submitting the hidden character editor to regenerate it.

The frontend supports character selection, saved history, new/renamed/deleted chats, per-chat drafts, basic safe Markdown and quoted-dialogue coloring, streaming, stopping, message edits and reply alternatives. Model reasoning streams in its own collapsible block and is rendered from ST's saved message metadata after reload. ST reasoning durations are milliseconds and are displayed as seconds. Chat deletion has explicit confirmation and no frontend undo.

## Isolated PC / phone tests

Use a separate combined mock installation with no original user data:

```sh
node prepare.cjs /path/to/SillyTavern /path/to/pocket-test --mock
cd /path/to/pocket-test
node start.cjs --mock
```

The combined launcher starts ST and a local OpenAI-compatible mock only in explicit mock mode. `[think]` emits separate reasoning, `[slow]` streams slowly, and `[fail]` returns an intentional provider error. Normal/mock launch modes cannot be mixed against one prepared installation. For repeatable configuration fixtures, stop the mock launcher after its first initialization and run `python3 scripts/seed-settings-fixtures.py /path/to/pocket-test`, then restart. The fixture tool rejects normal installations. The mock health endpoint returns only test summary flags and generation parameters, not prompt text.

Current PC mock sandbox: `/tmp/pocket-combined-engine`. Normal-mode sandbox: `/tmp/pocket-combined-normal`. These are disposable and may disappear after reboot. Existing older PC data is retained. Run `npm test`: **68 passing automated tests**. See [TEST_REPORT.md](TEST_REPORT.md) for live results and their limits. Build the kit with `python3 scripts/build-phone-package.py`; copy the ZIP from dist into the project root for phone transfer.

## Data ownership and migration

Prepared installations use their own standard ST `data/default-user` folder. Updates preserve data/settings/config and back up previous code. The combined installation retains unpatched compatibility-source fragments for updates, so it does not need the original checkout later. The older isolated phone test folder is also supported by the updater and keeps its original launcher workflow.

An optional offline importer copies an existing compatible `default-user` into a NEW, unstarted normal installation. It refuses existing destination user data and never merges or overwrites it. Stop both engines and make a backup first. No actual personal-data migration has been performed. See the phone instructions before using it. One engine owns a data folder; two servers sharing it and simultaneous writers across interfaces are unsupported.

Only drafts, navigation and an interrupted-action journal live in browser localStorage. Saved messages/metadata are independently read back from ST before success is reported. Recovery reads saved data without replaying uncertain writes. The bridge admits one operation at a time, checks stale targets/settings and exposes listed commands through a same-origin MessageChannel. Clearing browser storage can lose drafts and the journal.

## Compatibility and limitations

The complete ST browser application remains loaded offscreen. It contains behavior beyond the server endpoints, so this is not yet a lightweight headless client. The tested source reports package version 1.19.0 and is one commit beyond that release tag; installers require exact known compatibility fragments and refuse unfamiliar source implementations.

Prepared-engine patches retain CSRF and path checks: tokenizer requests send explicit CSRF headers, each installation has its own cookie name, startup validates an uncached session token, and exact locally copied codec-WASM aliases handle shared-dependency paths. Original ST code/data are untouched.

PC validation covers mock generation, configuration effects, reasoning, stopping, deletion, persistence, launch/shutdown and update preservation. Earlier isolated v3 phone-kit use was reported smooth by the user, including app switching/locking. The user confirmed a real OpenRouter streaming response inside Pocket Tavern on Android with the bundled proxy. v0.5.0 authoring and memory changes still need phone verification. No real credentials or external model-generation requests were used in development.

This is an essential-controls prototype, not a daily-use release. Lorebook editors, connection-profile management, character/chat lorebook selectors, reasoning editing, groups, media, slash commands, tools, auto-continue/auto-swipe and arbitrary extension compatibility remain outside this build. Summaryception 5.5.4 is bundled with a Pocket integration; its Default ST connection, memory settings, force summary, stop, backlog choices and saved layers are supported. Alternative Summaryception connections, memory import/clear/snippet editing and advanced controls still require full ST. This is not general extension support. Touch swipe gestures and the full ST Markdown/HTML renderer are not implemented. Only the current dark interface is provided. Long-running Android background execution, battery behavior and WebView lifecycle need broader testing.

Original design/audit references: [concept](SillyTavern_Mobile_Frontend_Concept_v0.1.md), [architecture](Working_Architecture_v0.2.md), [source audit](ST_Source_Audit.md). Historical test-kit ZIPs remain local and ignored by Git.

### Custom connection through the existing OpenRouter proxy

Choose Custom (OpenAI-compatible / proxy), enter the base URL `http://127.0.0.1:8001/api/v1` for the supplied or-proxy code, and paste the OpenRouter token into the Custom endpoint key field. Connect saves it in ST’s distinct Custom secret slot, then loads models through that endpoint. Select a returned model or enter its exact ID manually. ST adds `/models` and `/chat/completions` automatically. The proxy is optional: see the bundled setup below. The proxy forwards requests to OpenRouter using wreq-js Chrome TLS impersonation. Direct OpenRouter mode bypasses this proxy. A saved key is storage confirmation, not authentication verification; successful models loading does not prove a paid generation succeeds. Connection profiles and secrets are separate ST features.

### Optional bundled OpenRouter proxy

The kit includes proxy code based on the supplied or-proxy, with the same wreq-js Chrome transport and OpenRouter target. On the phone, run `node setup-proxy.cjs ~/or-proxy ~/pocket-tavern` from the extracted kit once. This copies only installed dependencies from your working proxy folder, checks they load under the current Node runtime, and installs the bundled code into Pocket Tavern’s `.pocket-proxy` folder. It copies no logs, PID files, secrets, or settings, and refuses overwriting an installed proxy. Use a working dependency folder on the same phone, not the Android dependencies on your PC.

Stop the previous external proxy and launch `node start.cjs --proxy` from `~/pocket-tavern`. This waits for the loopback proxy on port 8001 before starting ST; Ctrl+C stops both, and either child exiting stops the session. A busy port prevents startup. Choose Custom with base URL `http://127.0.0.1:8001/api/v1` and save the key in the Custom slot. Plain `node start.cjs` leaves the proxy off. The proxy option is refused for mock fixtures. Frontend updates also update bundled proxy code, back up the old code, and preserve its copied dependencies and ST data.

## v0.5.0 authoring and memory

Settings → Test message sends one quiet completion through ST using just “Reply with OK.”, a 16-output-token budget and one completion. It does not append chat messages. Progress, reply/error and a timeout appear beside the button. It is a real provider request and may cost money; a reasoning model may use that small budget without visible reply text. Prompt/provider options from the selected connection can still apply.

Manage library imports PNG/JSON/YAML/CHARX/BYAF character cards, ST persona-backup JSON and chat-completion preset JSON. New characters/personas can use an uploaded portrait or a default image. Persona backup JSON has no portrait bytes; existing portraits are retained and missing images use the default. Persona filename collisions are skipped; preset name collisions are refused. Renaming a preset saves a copy. Saving a preset applies it, so check the connection afterward. Unknown character/persona/preset fields are preserved; character attribute updates use ST's merge endpoint, so omitting a key in Advanced JSON does not delete the old attribute. Keep the editor's existing fields. Invalid or stale edits are rejected. If a write cannot be verified, refresh/reopen the item; never assume it failed or repeat creation automatically.

Memory controls run the pinned [Summaryception](https://github.com/Lodactio/Extension-Summaryception) algorithm in the existing ST runtime, using native extension settings and chat metadata. Backlog choices appear in Pocket. A shared busy state prevents chat/config/library changes during its complete processing/save pipeline. Stop cancels ST's quiet generation and waits for it to unwind before releasing the lock. Fresh preparation starts memory disabled; imported data preserves its choices. Current support is single-character chats using Summaryception's Default ST connection. Existing separate connection settings are retained, but select Default in full ST before using memory in Pocket. Check summary quality yourself: the mock proves routing/storage, not useful real-model summaries. Review older-message edits and branches in full ST; memory may need rebuilding.

The adapted extension's complete source, pinned commit and original license are in vendor/Extension-Summaryception and included in the phone ZIP. Its automatic updating is disabled to retain the coordination patch. The extension registry gives future integrations a common read/control route, but other extensions have no automatic mobile UI adaptation yet.

After importing real data, run the kit’s updater before the first launch. It backs up and updates recognized user-local Summaryception/bridge code as well as the bundled global code, because ST gives user-local extensions priority. Other extension code and all chat/settings files are retained.

## v0.5.1 visibility fixes

The chat shows the active ST persona and chat-completion preset. User bylines use the current persona without rewriting stored messages. Preset entries show On/Off switches alongside their text, in native ST prompt order. The editor defaults to ST 1.19’s active global order (100001); other saved orders are selectable and retain independent states. Save in ST applies changes. Entry reordering remains in the full ST editor.

## v0.5.2 send diagnostics and preset access

Settings has an Edit preset entries · On / Off button; the current preset badge also opens its editor. Send failures remain in a visible error box and the browser console, without logging message text or keys. Mixed frontend/engine builds are rejected before sending. The reported Android send failure has not been reproduced on PC; its cause remains unconfirmed. The phone reported both build IDs as 0.5.0, so the new files were not being loaded. Use the ZIP repair helper to update the actual installation directly.

## v0.5.3 tool calling control

The phone rejection was identified as TOOLS_ENABLED: a preset enabled native tool calling. Settings now exposes Tool calling enabled in ST. Uncheck it to use Pocket’s text chat; the change uses ST’s native control, saves settings, and verifies persisted function_calling. Another preset can re-enable this setting. Full tool calling support remains outside the current text-chat prototype.

## v0.5.4 chat HTML

Chat and thinking text use ST’s Showdown parser and DOMPurify sanitizer. Supported HTML includes font color, details/summary, basic text formatting, lists and tables. Scripts, event handlers, custom CSS, embeds, images and forms are excluded. HTTP(S) links open separately. Code blocks remain literal. Explicit font color overrides quoted-dialogue highlighting.
