# STM foundation roadmap

Updated 21 November 2026. This is the current plan for the next phase. It supersedes the delivery order and architectural assumptions in the former Android roadmap and earlier implementation plans. 0.9.2 is a cleanup and release-metadata handoff with no new functionality; see HANDOFF_0_9_2.md for its actual delivery status.

## Product direction

STM is primarily an installable SillyTavern interface extension. The same interface runs in a browser and in the Android APK. The APK supplies optional platform capabilities; browser operation must not depend on it. ST owns its data, extension loading, commands, prompts and generation.

The technical identity is `stm`, chosen by the user. Use `STM` as the temporary display name; the final public brand remains open. Remove former Pocket identifiers from active first-party code before 0.10 work begins. Git history and historical evidence retain their original names.

Preserve the intended layout, themes, fans, sheets, reading modes and useful product features. Code reuse is subordinate to reliable behavior. No extension is essential or receives a bespoke adapter. Work with unmodified extensions without requiring author cooperation. Settings, actions, panels, workspaces, composer tools, message actions, slash commands and function tools are all in scope. Group chats are excluded. Generic styling should match ST's integration standard: palette first, common controls second, no promise to redesign arbitrary extension interfaces.

## Release sequence

| Release | Role | Exit requirement |
|---|---|---|
| 0.9.1 | Preserved implementation baseline | Exact commit, evidence and limitations recorded; recoverable tag and package provenance established |
| 0.9.2 | Transition-only handoff | Current plans consolidated, obsolete guidance removed, version metadata aligned, baseline preserved; coding preflight explicitly handed over |
| 0.10.* | New foundation | Build and qualify the extension architecture in the milestones below |

Current baseline is `dev` commit `0919ea64d37e61229300004da8d49028e8a7573e`, already titled “Fix mobile layout and native settings for 0.9.1”. The 0.9.1 baseline is preserved by the transition release tag. Android still has separate early-host version metadata; do not describe it as a qualified 0.9.1 APK. Both the Android engine pin and browser adapter target 1.19.0 today. The required next-foundation baseline is ST 1.19.1 at `82b64a45c34facbc98ff4b9f33c067d3ccab6a17`.

The [implementation preflight](PREPARATION_0_9_2.md) remains the gate before any 0.10 implementation; the transition release does not claim those code changes. [Architecture decisions](FOUNDATION_ARCHITECTURE.md) distinguish commitments from experiments. [Reuse and migration](FOUNDATION_REUSE.md) accounts for the existing product.

## Milestone 1 Establish the extension foundation

Build a minimal same-document extension shell with explicit enter/exit and native ST recovery. Keep native ST running and preserve its extension loader. Test the real ST composer inside STM framing; compare separate chat rendering using native formatting against native message elements styled for STM. The existing iframe build remains a comparison baseline, not the assumed future host.

Exercise a simple launcher, message action, direct draft mutation, anchored popup, formatting hook, persistent panel and workspace with nested Back behavior. Run a thin APK capability handshake test early, without attempting full Android migration.

Exit: record the selected chat/composer architecture, demonstrated tradeoffs, retained design and rejected alternatives. Browser mode works without an APK connection. No extension-specific fixes or source edits. If neither chat approach meets the gates, revise the design before bulk porting. Distribution as an ST extension remains committed independently of DOM ownership.

## Milestone 2 Deliver a reliable conversation

Implement chat activation, drafts, send, streaming, stop, save/reload, edit, delete, swipe and error recovery on the selected foundation. Use ST's execution and formatting paths. Include a slash command and a function-tool round trip now so the operation model is not built around text-only generation.

Exit: visible target and operation target agree; no duplicate sends, lost drafts or unverified save claims. Exercise cancellation, model failure, extension-initiated updates, reload and stale completion after navigation. Browsing a saved chat without activating it is explicitly read-only until contextual actions activate that target. Tool results and continuation survive reload.

## Milestone 3 Deliver generic extension access

Expose original settings and menu surfaces; mirror only behavior classes validated in milestone 1. Handle dynamic controls, popouts, dropdowns, dialogs, persistent panels and full-page workspaces. Coordinate enable/disable/update reloads. Add shared palette projection and recovery to plain native styling.

Exit: demonstrate settings persistence, action targeting, dynamic surface replacement, panel/chat coexistence, nested dismissal and independent extension updates. Record each behavior as integrated, working through native fallback, blocked or untested. Use an unmodified third-party holdout selected after generic implementation; do not special-case failures. A failed capability remains an explicit gap rather than being averaged away by many simple passing extensions.

## Milestone 4 Restore the wider product

Port Home, navigation, Library, character/persona management, chats and collections, WI, connection/preset entrances, themes and diagnostics in small vertical slices. Keep ST as the authoritative owner of its settings. Restore Memory access through ordinary extension entrances, removing privileged product assumptions.

Exit: every feature in the reuse inventory has a disposition and evidence. Themes, reading/Messenger modes, fans and sheets are visually checked at 320/390 px and a tablet width, including larger text and keyboard states. Deferred cosmetic repairs have an explicit backlog. Do not silently drop functional features because a new shell is smaller.

## Milestone 5 Complete Android integration

Connect supported platform capabilities through a versioned optional interface. Preserve engine/data separation, file picking, external links and diagnostics. Add coordinated Back, keyboard/insets, lifecycle/restart recovery and available file/download behaviors. Package the same extension artifact used in browser qualification.

Exit: one physical arm64 device demonstrates first/warm start, draft editing with keyboard, files, nested Back, background/foreground, engine loss and recovery. Browser behavior remains functional without native capabilities. App identity and import/export migration use the preflight decision, not a late rename.

## Milestone 6 Qualify and retire replaced paths

Repeat representative workflows on the final packaged browser and APK artifacts. Verify upgraded and fresh installations, reload after extension updates, theme recovery, preservation of ST data and migration from the 0.9.2 export. Remove replaced runtime paths only after their replacement gates pass.

Exit: publish a feature/compatibility matrix, exact tested revisions, remaining limitations and release provenance. There is one active foundation rather than two partially supported interfaces. Do not claim universal extension compatibility or real-device results from source inspection or browser-only tests.

## Delivery rules

Milestones may span multiple 0.10 patch releases; version numbers are not substitutes for acceptance. Browser development remains the fast loop, with early and milestone-level Android checks. Retain dev/main promotion flow unless explicitly revised; no automatic merge or publish follows document acceptance.

For each slice record source revision, packaged revision, ST revision, specimen revisions, behavior checks and any visual/device evidence. Reuse meaningful tests, replace implementation-coupled assertions when architecture changes, and retain regression cases for data loss, targeting, save recovery and cancellation. The next coding handoff is the bounded implementation preflight, not the entire roadmap at once.
