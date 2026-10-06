# ST adapter source audit

Inspected checkout: `/home/Riv/SillyTavern`.
Package version: 1.19.0. Git description: `1.19.0-1-g06bde939f`.
Working tree was clean at inspection. This is one commit beyond the release tag; use this exact checkout for the first experiment and validate the release tag separately before claiming release compatibility.

## Available integration surface

`public/scripts/st-context.js` exposes `getContext()` via `SillyTavern.getContext()`. It returns characters, current chat, metadata, character/chat selection, generation, cancellation, saving, and events. This is a useful adapter entry point, but remains browser-dependent.

Source anchors in this checkout:

| Operation | Entry point | Source |
| --- | --- | --- |
| Snapshot / extension API | getContext | public/scripts/st-context.js:115 |
| Character selection | selectCharacterById | public/script.js:875 |
| Open existing chat | openCharacterChat | public/script.js:7744 |
| User message with ST processing | sendMessageAsUser | public/script.js:5874 |
| Generation | Generate | public/script.js:4290 |
| Cancellation request | stopGeneration | public/script.js:5607 |
| Persist single-character chat | saveChat | public/script.js:7395 |
| Conditional save wrapper | saveChatConditional | public/script.js:9412 |
| Runtime and generation events | event_types | public/scripts/events.js:3 |

## Important adapter constraints

- Character selection can silently return without switching while saving or generating. Verify the resulting selected character rather than treating a resolved promise as success.
- `openCharacterChat` mutates the selected character and updates DOM elements. Keep the ST page loaded for the initial experiment.
- `Generate` reads the existing composer and processes slash commands. Do not append a user message independently and then invoke ordinary generation without inspecting the full submission path: it can duplicate or change submission semantics.
- `sendMessageAsUser` applies regex, macros, persona information, attachments, and events. Directly pushing messages into the chat array would bypass that behavior.
- The context's `saveChat` is `saveChatConditional`, which catches errors and can return after a timeout. A resolved promise is not a persistence acknowledgement. The adapter needs independent readback/error handling.
- `stopGeneration` requests cancellation. Its boolean result does not prove cancellation has finished or that a partial answer has been saved.
- `STREAM_TOKEN_RECEIVED` is emitted with accumulated text in the inspected stream path. Treat it as replacement text there, not automatically as an append-only token delta. Inspect reasoning/tool flows separately.
- Use APP_READY for initial readiness and fresh context snapshots after state changes. No arbitrary extension compatibility has been verified.

## Next experiment

Create an adapter module in st-mobile that can be injected into a dedicated ST page. Start with handshake, character listing/selection, and chat snapshots. Add generation only after tracing the normal composer submission, guards, streaming completion, and save paths completely.

Use a separate ST data directory and fixture character for mutation tests. Do not run the prototype against existing personal chats. This audit did not start the server, modify ST, access provider credentials, or validate Android background behavior.

## PC prototype result

Implemented in `prototype/extension`: readiness/version handshake, character listing, guarded selection, and detached chat snapshots. Validated in a separate ST copy on localhost port 8123 with fresh data and the default Seraphina character. Five automated adapter tests pass. Generation and Android operation remain untested. See README.md for sandbox usage.

## Generation prototype result

The runtime now invokes `sendTextareaMessage()` through the existing ST composer. It does not separately append a user message, avoiding duplicate submission and preserving ST's regex/persona/macro processing. Streams are replacement text. Completion comes from submission settling plus independent `/api/chats/get` readback, rather than GENERATION_ENDED alone (which can fire before saving finishes).

Live mock-provider tests verified normal generation, same-session request replay, partial-response cancellation, HTTP 503 failure, and persistence after a server/browser restart. The adapter guards unsupported text-only flows and simultaneous operations. Fourteen automated tests pass. Cross-restart deduplication, arbitrary extensions, real-provider generation, and Android background behavior remain open.
