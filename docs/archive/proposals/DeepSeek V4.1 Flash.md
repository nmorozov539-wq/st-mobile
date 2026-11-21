> It was the only one working with the files on the laptop directly via opencode

# Extension integration review — current state, boundaries and a proposed path

Status: discussion review, 20 November 2026. Read-only investigation of `dev` and the local SillyTavern 1.19.0 tree. No implementation authorized.

I read both trees, including the current host/translator code and the draft in `Extension integration/`. Here’s my read of the problem, the parts that are already closer than they look, and where I think the real boundaries are.

## What already exists

Extensions **already run**. The engine iframe is a real SillyTavern page, so ST loads them normally, and Pocket sends generation through ST’s own composer (`runtime.js` → `sendTextareaMessage`). That means interceptors, extension prompts, display regex, settings persistence, and data-level effects already happen. Summaryception proves it.

So the missing piece is not a runtime. It’s **exposure and appearance**.

And `prototype/extension/native-settings-host.js` is already a proto-translator:

- it hosts original native roots in place, with an exclusive session, Back/dismiss chain, save verification, focus and guard handling;
- `presentationCss()` is a first-draft skin;
- `openNativeSettings()` already projects a subset of Pocket theme tokens and positions the same-origin iframe over a Pocket mount.

That is the right seed. I would generalize this rather than invent a parallel “extension system”.

## Three concrete gaps I found

**1. The layer handling is stale for ST 1.19 and already breaks real flows.**
ST’s modern popup is `<dialog class="popup" open>` (`public/scripts/popup.js`, template in `public/index.html`). The host only recognizes `#dialogue_popup` and `.popup[style*="display: block"]`. Its containment CSS hides direct `body` children except an allowlist, and its pointer guard only re-enables the allowlist. Result: modern popups opened from a hosted surface would be **invisible and unclickable**, and Back would close the whole surface instead of the dialog.

This isn’t hypothetical. Saving/renaming/deleting a preset uses `Popup.show.input`/`callGenericPopup`, so the hosted Presets surface can already fail there. The extension manager, install, update warnings, and confirmation chains all use the same class.

This is the first thing I’d fix, and it should be a **shared layer registry** used by both the host and the translator: `dialog.popup[open]`, legacy `#dialogue_popup`, `.select2-container--open`, `#completion_prompt_manager_popup`, `.ui-dialog`, `#toast-container`, plus registered extension layers.

**2. The presentation is partial in ways that matter.**
Three examples:

- Text size sets `html { font-size }`, but ST sizes most UI through `--fontScale` / `--mainFontSize` in px, so Pocket’s 13–24 px preference barely reaches hosted controls.
- ST applies theme colors as **inline styles on `documentElement`** (`power-user.js`). A translator that declares `--SmartTheme*` in a stylesheet will lose. It must set them with `setProperty(..., 'important')` and restore them on close.
- Most extension CSS already consumes ST’s `--SmartThemeBodyColor`, `--SmartThemeBorderColor`, `--SmartThemeBlurTintColor`, `--SmartThemeQuoteColor`, etc. **Remapping those variables is higher leverage than restyling every class.** It automatically recolors bespoke widgets and most third-party CSS.

That last point changes the translator design: it should be *variable projection first, pattern stylesheet second, DOM pass last or never*. The Qwen draft is directionally right on three systems, but it leans too hard on per-selector rules and a structural pass. I’d invert that.

**3. Extension lifecycle owns a full page reload.**
`showExtensionsDetails()` doesn’t toggle immediately; it applies toggles on popup close, then calls `location.reload()` (`extensions.js` lines ~1187/1324). Updates do the same. If we host the native manager, closing it after a toggle kills the engine frame under the host. Pocket can recover via its reconnect path, but it needs to be coordinated: save drafts, close the host intentionally, reload the frame, re-handshake, show “Engine restarted to apply extension changes.”

That’s a strong argument for a Pocket-owned lifecycle list (catalog, enable/disable, update) with bridge methods, and using the native host for **per-extension settings**. The native manager can remain reachable for full lifecycle, but it shouldn’t be the primary phone path.

## The architecture I’d propose

**Three systems, one boundary:**

1. **Surface host** — turns a native surface into a Pocket page *in place*: root discovery, exclusive session, interactive containment, layer registry, Back chain, settle/verify, focus restore. Owns behavior boundaries, not paint.
2. **Translator** — appearance only, inside the engine document, scoped to the hosted session. Owns token projection, ST variable remap, pattern CSS (drawers, controls, sliders, selects, tables, banners), layer chrome (popup/sheet, select2, toastr). With it disabled, the session must render exactly as plain ST.
3. **Glue/adapters** — only where native DOM isn’t enough: extension catalog, menu-action enumeration, optional full-page workspace contract, chat-surface hook. Generic per capability, not per extension.

The “translator that catches extensions” should live *in the engine document*, not as a component mapper in Pocket. Transplanting extension DOM into Pocket breaks handlers, selectors, jQuery assumptions, and extension CSS. The iframe is already the correct isolation boundary; the job is to translate inside it.

One deliberate constraint: **no structural DOM rewriting in v1**. Extensions re-render (WIhero redraws, Summaryception `updateUI()` rewrites blocks). CSS variables plus a scoped stylesheet get most of the visual coherence with far less risk. Icon replacement and wrapper injection can wait. Also prefer specificity over `!important` so extension-specific styles can still win, and reserve `!important` for host containment.

## What “supported” would mean

I’d make this a visible ladder rather than a binary claim:

| Tier | Needs | Examples | Reality |
|---|---|---|---|
| Runs invisibly | nothing beyond engine load | regex, translate auto-mode, interceptors, prompts, WIhero logic | mostly already works |
| Hosted settings | drawer host + translator | Translate, TTS, SD, Regex, Vectors, Summaryception, WIhero panel | first real deliverable |
| Actions | menu enumeration + layer session | Translate Chat, Prompt Inspector, token counter | second deliverable |
| Full-page workspace | extension root + Back contract | WIhero editor | stress test, later |
| Chat-surface | Pocket renderer participation | colorizinator, per-message TTS/SD, composer tools | explicit boundary |

The exclusions you named fit naturally: theme/layout revamps and redundant cosmetic extensions don’t need a tier. They may still load and run, but Pocket’s shell is a separate document and won’t show their layout. Their global CSS can bleed into hosted surfaces; I’d call that unsupported rather than build a sandbox that would also break legitimate extensions.

## The two real frontiers

**A. Message-surface extensions.**
Pocket renders its own chat. Only display regex is mirrored (`display-regex.js`). Anything that decorates `#chat .mes` (like `st-colorizinator`), adds per-message buttons, media, or composer tools is invisible. Options:

- accept the boundary for now and state it honestly;
- add an optional `format(text, message)` hook to the extension registration API so authors can participate in Pocket’s renderer;
- experiment with a render probe (render offscreen in ST, capture sanitized HTML) — risky, side effects, handlers don’t transfer;
- offer a deliberate “open this chat in native ST view” escape hatch — maximum compatibility, but loses Pocket’s chat UX for that session.

My recommendation: **accept the boundary now, offer the hook as the long-term contract, don’t build the probe yet**. It’s the one place where “blocked function” is real, so it should be an explicit product decision rather than an accidental omission.

**B. Extension-owned workspaces and Back.**
WIhero is the perfect stress test: it renders its editor into a shadow root on `body`, hides ST’s WI drawer underneath, and implements its own Back via `popstate` inside the iframe. Hosting it needs a contract for open/close/Back, or very careful generic detection. Its shadow DOM also means the translator cannot skin its internals — the workspace will look like WIhero, not Pocket. That’s probably acceptable for a full-page editor, but it’s a fidelity limit worth naming.

This is where the existing `window.pocketExtensions` registration is valuable: it’s the seed of an **optional capability contract** (`settings root`, `actions`, `workspace open/close`, `busy`, later `format`). Generic hosting stays the default; deeper integration is opt-in by the extension, not a Pocket-side fork.

## Adjacent blockers worth deciding on

Two existing limits will make some extension functions look “broken” even after hosting:

- `withoutTools()` force-disables tool calling for Pocket sends, so extensions registering function tools won’t be used.
- Pocket’s composer rejects text starting with `/`, so slash-command-driven extension actions can’t be invoked from the phone composer.

Neither is a reason to stop, but they belong in the same conversation as “what does supported mean”.

## What I’d do first

A bounded slice that proves the generic path:

1. Shared layer registry + modern popup fix (also fixes preset save/delete under the current host).
2. Add an `extensions` surface: host `#rm_extensions_block` with the drawer, the manager, and all settings blocks.
3. Translator v2: full token projection, ST `--SmartTheme*` remap via inline important, `--fontScale`, scoped pattern CSS, popup/sheet/select2/toastr chrome. No structural pass.
4. Extensions hub: generic catalog (name, version, enabled, type) via bridge; Manage/Install opens the hosted lifecycle surface; tapping an extension opens settings (whole drawer at first; precise jump later).
5. Coordinate lifecycle reloads through Pocket instead of surprise `location.reload()`.
6. Tests: manager popup, install popup, enable/disable readback + reload, Summaryception settings edit, WIhero panel edit, theme switch, translator off = plain ST.

That gets “not entirely alien” for the majority of useful extensions and gives WIhero a foundation.

## Questions for you

1. **Hub model:** Pocket-native catalog for lifecycle (enable/disable/update/install) with native hosting for per-extension settings — or host the native manager as the main path? I lean hybrid.
2. **Translator fidelity:** skin-only (recolor, type, controls, layers) vs. reorganizing extension settings into Pocket-like cards/pages. I strongly lean skin-only in v1; restructuring is where drift and behavior bugs live.
3. **Message-surface:** accept unsupported for now, or commit to an extension `format` hook? I lean accept + hook contract, no probe.
4. **WIhero:** require an opt-in workspace contract for reliable Back/open/close, or attempt generic detection of full-page body elements? I lean contract.
5. **Priority:** broad shallow (drawer + translator + hub) before deep narrow (WIhero workspace). I lean broad first because it proves the no-per-extension-code claim.

If you disagree with any of those leans, that’s the useful part — the rest is implementation detail we can refine.
