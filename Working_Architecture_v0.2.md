# SillyTavern Mobile — Working Architecture v0.2

Status: proposed architecture and feasibility plan, not a validated implementation.
This supplements the original concept; its ownership and mobile UX principles remain in force.

## Discussion decisions

- User's existing ST version: 1.19.0. Use that release as the initial compatibility target; resolve its exact revision during implementation.
- Prefer reuse of a standard separately running Android ST installation. Termux is the documented candidate, pending confirmation of the user's current runtime. Do not assume a bundled ST distribution is required.
- The proposed first capability scope is accepted.
- Background execution is preferred. Test both the ST server and the browser-side runtime: keeping the server alive alone does not prove generation orchestration and saving survive backgrounding. Prioritize completing an active response and recovering chat state over indefinite idle execution.

## Critical finding

SillyTavern's existing browser application contains engine behavior as well as presentation. Its generation entry point, chat mutations, and extension context live in browser JavaScript, with DOM dependencies. Connecting a native app only to server endpoints is therefore not sufficient to preserve existing ST behavior automatically.

Primary references inspected:
- https://raw.githubusercontent.com/SillyTavern/SillyTavern/release/public/script.js
- https://docs.sillytavern.app/for-contributors/writing-extensions/
- https://docs.sillytavern.app/for-contributors/server-plugins/

These moving references establish the feasibility question. Implementation must pin an exact ST revision.

## Proposed architecture to test

Mobile UI -> versioned bridge -> dedicated ST runtime session -> ST server -> generation provider.

The runtime session initially loads ST's browser application and an adapter. The adapter invokes existing operations and returns structured data. The visible mobile interface remains independent. This is a compatibility prototype, not a claim that ST already exposes a headless engine.

For phone-local operation, evaluate an app-owned WebView runtime and a separately managed local ST server. For remote operation, a browser runtime near the server is a candidate; requiring an ordinary desktop tab to stay open is unsuitable as the eventual operating model. Runtime lifecycle and resource cost must be measured.

If this approach cannot operate reliably, the alternatives are extracting a DOM-independent ST core or implementing a narrower client against server endpoints. Both require explicit scope and maintenance decisions; neither should happen silently.

## Ownership and sessions

- ST owns persisted characters, chats, presets, personas, lore, and generation behavior.
- The runtime session owns active ST execution state; the bridge owns operation tracking and admission control.
- The mobile app owns navigation, layout, gestures, drafts, and display caches.
- Initial prototype: one active runtime session and one writer. Desktop editing of the same data is excluded from this test. Detecting or coordinating additional writers is required before claiming concurrent desktop/mobile use.
- Selecting another chat while generation is active must have an explicit rule. Initially reject it until generation stops.

## Bridge contract

Start with capabilities/version handshake, list/select character, list/open/create chat, read messages, append user message, edit/delete message, choose swipe, start regeneration, stop generation, and inspect operation status.

Use commands and snapshots for normal operations. Add a narrow event stream for generation deltas, completion, cancellation, errors, and invalidation. Do not mirror ST's complete event bus.

Every mutation carries a request ID, session ID, target resource, and expected revision. Retries must not repeat completed mutations; generation retries must query operation status rather than blindly start another generation. Revisions and deduplication are bridge responsibilities to implement, not existing ST guarantees.

Adapter responses preserve unknown ST metadata. Cache message IDs independently of array positions where necessary. After disconnection or runtime restart, obtain a fresh authoritative snapshot. Report success only when persistence has been verified.

## First usable scope

The technical slice covers character selection, existing and new one-character chats, text messages, streaming, stop, edits/deletes, swipe selection/regeneration, and persistence after restart.

Before a usable release, include generation connection configuration and selection of existing presets, personas, and lorebooks. Verify their effects with representative fixtures. Full editors can follow incrementally; this is delivery sequencing, not a permanent desktop-only policy.

When the local ST runtime is available but generation is unavailable, browsing and supported editing remain functional. When ST itself is unavailable, only cached reads and local drafts are promised initially. Offline authoritative mutations and synchronization require a separate design.

Extension support is capability-based: classify extensions as runtime-only, needing native controls, or needing their existing browser UI. Test named extensions; do not promise arbitrary extension compatibility.

## Required platform decisions

1. Decided: the first local version runs SillyTavern on the Android phone itself. A nearby computer is not a prerequisite.
2. Android is the initial target. Any later iOS scope remains open; do not select cross-platform technology solely for an unconfirmed future requirement.
3. Separate frontend technology from ST server packaging. On-phone operation needs a runtime installation/update strategy, writable data storage, startup/shutdown behavior, background handling, backups, and recovery.
4. Authenticate bridge access within the ST user's scope; retain server credentials and provider secrets on the runtime/server side where possible. Bind phone-local services to loopback. Remote transport needs TLS and explicit pairing/session expiry.
5. Define a supported ST revision and adapter update policy. Assess upstream licensing before distribution.

## Feasibility milestone and acceptance

Build a minimal command harness before designing the complete UI. Against a pinned ST revision and isolated fixture data:

- Open a character and chat, send a message, and stream a response using ST's existing generation path.
- Stop generation and inspect both displayed and saved results.
- Edit/delete and select/regenerate a swipe; restart and confirm persisted state and metadata.
- Demonstrate preset, persona, and lore effects in generation inputs.
- Disable the provider and confirm browsing/editing still work.
- Disconnect during generation, reconnect, and retry a command without duplication.
- Background/resume the phone runtime and document whether execution survives, pauses, or terminates.

Deliver a dependency map, command contract, measurements, limitations, and a go/no-go decision on runtime reuse. A mock provider can test streaming failures; one real supported provider is needed to verify the ST generation path.

## Delivery order

1. Audit and pin ST; establish isolated fixtures.
2. Prove runtime reuse and local startup/lifecycle.
3. Stabilize bridge semantics and persistence/recovery.
4. Design and implement the mobile chat experience.
5. Add configuration/editor breadth and explicit extension support.
6. Validate the remote runtime deployment using the same bridge contract.
