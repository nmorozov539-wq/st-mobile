# ST 1.19.1 extension compatibility inventory

21 November 2026. Planning evidence, not an implementation decision or runtime certification.

Pocket must accommodate existing, unmodified ST extensions without extension-specific adapters or required author cooperation. Compatibility spans settings, actions, workspaces, persistent panels, message controls, composer controls, slash commands and function tools. Group chats are excluded. Appearance should follow ST palette variables first; common control styling can follow. A full rewrite remains available if the evidence requires it.

## Baseline

- ST checkout: `/home/Riv/SillyTavern`, package **1.19.1**, HEAD `82b64a45c34facbc98ff4b9f33c067d3ccab6a17`.
- Pocket checkout: `/home/Riv/Projects/st-mobile`, HEAD `0919ea64d37e61229300004da8d49028e8a7573e`.
- Pocket still passes `supportedVersion: '1.19.0'` to its adapter. The adapter rejects a different runtime version. This is an actual compatibility gate, not just outdated display text. Qualification against 1.19.1 must precede implementation claims; changing the string alone would not qualify it.
- Findings below come from local source inspection. No extensions were installed, modified or executed for this inventory. ST bundled extensions demonstrate attachment patterns, not a representative third-party compatibility pass rate.

## Compatibility inventory

“Native path present” means the relevant ST machinery remains in the engine; it does not mean Pocket integration has passed a test.

| Capability | How extensions attach to ST | Pocket position | Required evidence of compatibility |
|---|---|---|---|
| Discovery and loading | Manifests, script/style loading, minimum client version, extension dependencies, Extras requirements, activation hooks | Native loader remains in the iframe; no general Pocket catalog demonstrated | Distinguish installed, disabled, active, missing dependency and failed load; preserve native loading order and errors |
| Install, update, disable, removal | Native manager and `/api/extensions` routes; several lifecycle paths reload the page | Reload can destroy the engine and its bridge during a hosted interaction | Preserve drafts and saved state, detect restart, reconnect once, and display actual resulting state |
| Settings | Native templates and settings containers; direct DOM/jQuery handlers; shared settings object and save helpers | Native host currently defines connection and presets surfaces, not general extension settings | Operate original controls, save/reopen, survive extension redraw and localization without losing handlers |
| Menu actions | Entries in native extension menu and other native controls | No general action exposure established | Discover usable actions without assuming one entry per manifest; preserve disabled state, context and resulting layers |
| Dialogs and transient layers | `Popup`, native modal dialogs, select2, legacy dialogs, toasts and custom DOM | Current host recognizes `.popup[style*="display: block"]`; modern Popup uses `showModal()` | Open stacked dialogs, enter values, cancel/confirm, dismiss Back in correct order, and restore focus |
| Persistent panels | Body or `#movingDivs` attachments, drag/resize logic, viewport measurements | Hidden engine and exclusive hosted surfaces do not establish coexistence with Pocket chat | Panel and chat remain usable together; keyboard, resize, scroll and focus behave at phone widths |
| Full-page workspaces | Existing native editors or extension-owned DOM, potentially shadow DOM and browser history | No universal workspace discovery or navigation contract established | Open/close/Back, nested dialogs, save and reopen using unmodified extensions; handle repeated mounting |
| Composer tools | Direct access to `#send_form`, `#send_textarea`, input events and native send controls | Pocket owns a separate textarea; submit copies text into native composer at send time | Draft changes work in both directions; tools see correct draft and target; no duplicate send or draft loss |
| Per-message controls and decorations | Native `#chat .mes`, message IDs, delegated handlers and render events | Pocket builds separate `article.message` elements; engine attachments do not automatically appear there | Correct message identity through edits, swipes, deletion, streaming and older-message loading; controls remain live |
| Message formatting | Regex and native `MessageFormatter` hooks before regex, after regex and after Markdown | Pocket has its own regex/Markdown/sanitization pipeline; it does not call the native formatter in its inspected rendering path | Preserve hook ordering, context and output while retaining safe rendering; test streaming and final output separately |
| Prompts, macros and interceptors | Context APIs, macro registry, extension prompts, generation events and manifest interceptors | Native send path is used, so these mechanisms are reachable | Verify actual request content and ordering, cancellation and edits; loading an extension is insufficient evidence |
| Slash commands and scripts | Native parser, registration, chat-input execution, variables and command controls | Explicitly rejected by Pocket runtime for text beginning with `/` | Commands execute once, can open UI or change targets, preserve result semantics, and support stop/error handling |
| Function tools | Native ToolManager registration, model/provider capability checks, execution and tool rendering events | `withoutTools()` disables function calling around Pocket sends and generated swipes | Follow complete tool round trips, results, continuation, stop/error handling and saved transcript; retain native capability checks |
| Extension-owned generation | `generate`, quiet/raw generation, completion services or independently issued requests | Native generation state is partially observable; registry-based busy checks are not universal | Concurrent work does not write to the wrong chat; distinguish known activity from unobservable extension-internal work |
| Chat and settings mutations | Live context references, save helpers and lifecycle events | Pocket has snapshots, operation ownership and verification; extensions may mutate outside its request path | Observe edits, saves and target changes initiated by extensions; reconcile without clobbering drafts or newer state |
| WI, character, persona and auxiliary data | Context helpers, native editors, server requests, metadata and local/global variables | Pocket has separate editors and projections; parity across extension mutations is unproven | Changes become visible and durable in both interfaces, including changes made while a Pocket editor is open |
| Media and attachments | Native message media helpers, caption/image controls, TTS audio and provider requests | Some native logic can run while controls or rendered media remain hidden | Upload/select/play/download flows and message persistence work on phone/WebView; browser permissions and dependencies remain distinguishable from hosting failures |
| Appearance | `--SmartTheme*`, font scale, common ST classes, custom styles and shadow roots | Pocket already injects a partial `--pt-*` skin; no `--SmartTheme*` remap in inspected native host | Palette updates reach inherited styles; original values restore; custom colors degrade honestly; control styling preserves behavior |
| Browser environment | Document/window listeners, body portals, history, focus, layout measurements and storage | Separate documents, hidden engine and pointer guards alter the visible environment | Test history/Back, portals, viewport changes, virtual keyboard and reload; same-origin access does not establish behavioral equivalence |

## Source evidence

Paths and line numbers refer to the inspected revisions.

### ST

- [Loader and dependencies](/home/Riv/SillyTavern/public/scripts/extensions.js:568): activation checks and scripts/styles. Hook lookup starts at line 383; enable/disable reloads at 479/496; manager reload at 1325; interceptors at 2024.
- [Lifecycle routes](/home/Riv/SillyTavern/src/endpoints/extensions.js:92): install, update, branches, switch, move, version, delete and discover.
- [Context API](/home/Riv/SillyTavern/public/scripts/st-context.js): live state, saving, generation, commands, tools, macros, media, WI and completion services.
- [Event vocabulary](/home/Riv/SillyTavern/public/scripts/events.js): chat/message/settings/generation lifecycle, rendering, tool calls, media and TTS. It is not a universal transaction log for arbitrary extension code.
- [Popup mounting](/home/Riv/SillyTavern/public/scripts/popup.js:680): append to body and `showModal()`. Native top-layer behavior must be considered, not only z-index.
- [Theme application](/home/Riv/SillyTavern/public/scripts/power-user.js:1106): inline root `--SmartTheme*` values; font scale at 1175. A styling implementation must account for cascade and restoration; globally forcing every value important is not selected here.
- [Formatter hooks](/home/Riv/SillyTavern/public/scripts/message-formatter.js:184): synchronous hook registration. Native formatting invokes stages in [script.js](/home/Riv/SillyTavern/public/script.js:1855). Presence is confirmed in 1.19.1; this inventory does not claim the feature first appeared in that release.
- [Commands in generation](/home/Riv/SillyTavern/public/script.js:4311) and [interceptors](/home/Riv/SillyTavern/public/script.js:4564).
- [Tool registration](/home/Riv/SillyTavern/public/scripts/tool-calling.js:269) and capability checks at 614/694.
- [Quick Reply placement](/home/Riv/SillyTavern/public/scripts/extensions/quick-reply/src/ui/ButtonUi.js:31): same feature can attach to body or composer. This defeats a simple one-extension/one-surface model.
- [Translate](/home/Riv/SillyTavern/public/scripts/extensions/translate/index.js:182): reads native message DOM and composer. [Vectors](/home/Riv/SillyTavern/public/scripts/extensions/vectors/index.js:1519) decorates native messages. [Gallery](/home/Riv/SillyTavern/public/scripts/extensions/gallery/index.js:547) attaches floating content. [TTS](/home/Riv/SillyTavern/public/scripts/extensions/tts/index.js:1621) appends audio to the document.

### Pocket

- [Version declaration and busy checks](/home/Riv/Projects/st-mobile/prototype/extension/index.js:29), [strict version guard](/home/Riv/Projects/st-mobile/prototype/extension/adapter.js:20).
- [Iframe and separate composer](/home/Riv/Projects/st-mobile/prototype/frontend/index.html).
- [Native host surface definitions](/home/Riv/Projects/st-mobile/prototype/extension/native-settings-host.js:1), guards at 17 and partial styling at 21.
- [Command rejection](/home/Riv/Projects/st-mobile/prototype/extension/runtime.js:66), native send at 88 and streaming subscription at 101.
- [Tool suppression](/home/Riv/Projects/st-mobile/prototype/extension/generation-tools.js:1).
- [Pocket message rendering](/home/Riv/Projects/st-mobile/prototype/frontend/app.js:370), formatter setup at 41, and [display regex implementation](/home/Riv/Projects/st-mobile/prototype/frontend/regex-display.js:1).

## Consequences for architecture evaluation

The primary difficulty is preserving the document and live UI that extensions operate on. Sharing a document would not by itself make a separately rendered Pocket chat compatible. Conversely, an iframe is not inherently incompatible: retaining native interactive surfaces inside it may preserve assumptions that copying or moving them breaks. Neither architecture wins from this inventory alone.

Evaluate candidates against message controls, composer mutation, a persistent panel coexisting with chat, a workspace with nested dialogs, and extension-initiated state changes. Settings and palette tests alone are too easy to discriminate between candidates.

No universal UI ownership metadata was established in the inspected loader/context interfaces. Container naming and observed DOM mutations can aid discovery, but do not reliably identify every surface, owner, action or completion boundary. A required Pocket registration API would contradict the agreed scope.

Removing the tool and slash-command blocks creates obligations beyond exposing buttons: command-driven navigation, multi-step tool generation, stop semantics and transcript persistence all need qualification.

Extension dependencies remain real requirements. Compatibility with an unmodified extension does not imply Pocket supplies its external service, credentials, backend plugin or supported model. Android packaging, backend plugin support and third-party workspace internals need separate inspection before claims about them.

The earlier parked investigation contains a privileged WIhero role and proposed author contracts. Those are not assumptions for this inventory: the current user direction is uniform, unmodified-extension support. Earlier proposals remain unchanged as historical inputs.

## Completion of this planning step

The attachment inventory and current source-level gaps are established. Runtime coverage, architecture selection and implementation sequencing remain later steps. No code, engine configuration, installed extensions or existing proposals were changed.
