# Interface overhaul: foundation investigation

Checked against the current Pocket Tavern prototype, the installed ST 1.19.0 source, and bundled Summaryception 5.5.4. This is an implementation assessment, not a claim that the proposed systems are already implemented. No interface or engine source changed during the investigation.

## Evidence

- Existing automated suite: 73 tests pass.
- Live isolated ST `/api/chats/get`: read the existing 22-message fixture and a temporary one-message fixture through explicit avatar/file identifiers. Both returned messages and metadata without using native chat selection. The temporary fixture was removed afterward.
- Live `/api/chats/recent`: returned file/character identifiers and last-message preview fields. No model requests were made.
- Current adapter uses selected ST context for snapshots and edits, locks mutations during generation/save/Memory work, and checks expected message content before edits.
- Current local journal holds one pending operation; drafts are already keyed by character/chat.

## 1. Displayed chat versus engine chat

Feasible. Add independent saved-chat reads, separate displayed/engine targets, and operation events carrying explicit targets. Stream state belongs to the generating chat even when another chat is displayed. Browse/read/draft operations must not emit native selection events. Current frontend initialization, rendering and recovery assume one target and need restructuring. Keep native mutations serialized and switch ST targets only while idle. Independent browsing of an active chat may return its last saved state; supplement it with the tracked live operation without treating partial text as persisted. The design does not pause ST's event bus.

## 2. Scoped settings

Feasible using namespaced, versioned fields in normal ST data: chat copies in chat metadata, character copies in character extension data, global Pocket state in user extension settings. Keep independent full generation-setting copies rather than inherited deltas. Preserve inactive copies, and copy the currently effective configuration on first activation. Store the selected model separately from preset content. Do not store secrets in scoped copies.

ST's native preset handler already skips fields marked as connection-related when `bind_preset_to_connection` is false. This can be reused, with independent before/after verification of source, endpoint and model. Native character-name preset auto-selection must finish before Pocket applies its scope. Native preset application saves shared settings, so maintain an explicit global baseline: Home cannot infer Global from whichever scoped values happen to be active in ST. A global provider change may make a scoped model unavailable; expose that state rather than silently substitute another model.

## 3. Pending changes and restart recovery

Feasible, but the current single-operation journal is insufficient. Pending records need operation ID, target/scope, requested change, original content/revision and state. Coalesce repeated setting choices for the same scope/field. Keep edits as explicit commits. Persist draft changes in batches and committed work before indicating it is safely pending.

Apply serially after generation, save and Memory work settle. Re-read before each edit; an index alone is unsafe following deletion. ST's integrity slug is a chat-identity check, not a complete content revision. Verify writes by readback. After restart, classify operations as already applied, still pending, conflicted or target missing and present review rather than blindly replaying. No queued or automatically retried message sends.

## 4. Deletion, forks and Memory

Native branch creation copies the original metadata while replacing branch identity fields, so Pocket settings and Summaryception data can travel with a fork. Original branch creation also adds a branch link to the source message; preserving the original means preserving its narrative/settings/memory, not promising byte-identical metadata.

Summaryception's branch repair handles some out-of-range basic summaries without API calls. Its combined higher-level summaries lose source ranges, and it has no dedicated arbitrary-deletion handler. Use conservative validity checks, including changes to summarized message content/alternatives. When validity is uncertain, retain memory for inspection, clear injected memory and disable automatic summary processing for that chat. Restore retained source messages hidden by Summaryception, preserving unrelated user-hidden messages. Do not reset global Memory settings or automatically rebuild. This can increase raw context use, bounded by ST's context limit.

Undo must restore the corresponding messages and Memory metadata together, not just message text. Chat deletion requires a short-lived recovery copy because native deletion removes the file directly; there is no native Undo endpoint in the inspected chat router. Multi-delete should be one coordinated mutation. Include exact save verification and conflict handling.

## Recommended implementation sequence

1. Separate displayed chat and engine ownership; independent reads and navigation.
2. Explicit global baseline, scoped settings and serialized apply operations.
3. Durable pending-change records, recovery and conflict checks.
4. Memory validity guard, coordinated delete/fork and Undo.
5. Build the agreed screens and gestures on those foundations.

No specification blocker was found. The four areas require real implementation and targeted tests; wrapping the current UI alone would not satisfy them. Android/background lifecycle guarantees and future ST-version compatibility remain separate investigations.
