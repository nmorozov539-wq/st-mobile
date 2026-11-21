# Pocket Tavern: Extension Integration Concept

Draft v1 by Claude, 21 November 2026. Based on a read of SillyTavern 1.19.1 (`release`) and Pocket Tavern `dev` (0.9.x). Written to be compared with other AI proposals and merged.

## 1. Summary

Pocket Tavern should support extensions that add **functions**, and should own all **UX** itself. The problem is that SillyTavern (ST) extensions have no UI contract: each one builds DOM, wires jQuery handlers and opens popups inside ST's own page. Pocket today hosts ST in a hidden same-origin iframe and borrows its DOM through special cases (the native settings host, a hard-coded popup list, one patched copy of Summaryception). That works for two extensions and does not generalise.

This document proposes:

1. **One contract, three tiers.** Tier 0 works for every extension with no author effort (discovery, hosting, theming, observed activity). Tier 1 is an optional declaration (surfaces, busy state, side effects). Tier 2 is optional declarative settings that Pocket renders natively. No code path may mention a specific extension.
2. **An Activity Coordinator** that replaces today's ad-hoc busy checks and pointer guards with typed claims, so races are handled by policy, not by lockouts.
3. **A theme-token bridge and a skin sheet**, so hosted extension UI inherits Pocket's palette and looks "slightly different, never alien".
4. **A host interface** (`SurfaceHost`) with two candidate implementations: a generalised iframe host (Option A) and a single-document shell with Pocket chrome in a shadow root (Option B). The contract is the same for both, so the choice can be made after a spike.

What we give up is explicit: extensions that restyle ST's chat or chrome are unsupported, and Pocket never promises to host every extension's every pixel.

## 2. Goals and non-goals

**Goals** (from the product owner's statements)

- Support extensions that add new functions for the user.
- Hosted extension UI looks native, or close to it. Slight differences are fine; alien is not.
- No extension is treated differently from any other. Summaryception and WIhero are the test cases, not special cases.
- Pocket is mobile-friendly, convenient and extension-ready at the end. Any part of Pocket may be rewritten if that serves this.

**Non-goals**

- Visual or UX extensions (themes, chat restylers, wrapper renderers). Pocket ships its own themes, possibly inspired by popular ST ones such as Moonlit Echoes, and imports ST colour themes.
- Re-creating ST's desktop UI. Touch adaptation of third-party panels is not required now, though some extensions are already phone-aware.
- Changing how WI looks via extension. Base WI is Pocket's and should be good on its own. WIhero is an optional upgrade on top.
- Layout customisation by extensions. Layout changes go through a Pocket-specific API, with a few shipped presets.

## 3. Method and confidence

Every finding below carries one of three labels.

- **[code]** read directly in the ST or Pocket source.
- **[survey]** taken from public repositories and READMEs of third-party extensions. This is a sample, not an exhaustive census.
- **[hypothesis]** reasoned from the code but not verified. The spike in section 11 exists to test these.

Not inspected: WIhero and ChatHero internals (excluded at the owner's request), and the internals of Summaryception beyond Pocket's patch notes.

## 4. How ST lets extensions show UI

- **Loading [code].** ST discovers extensions from manifests (`/api/extensions/discover`), honours `extension_settings.disabledExtensions`, and injects each extension's `js` and `css` into the page. The manifest declares `js`, `css`, `hooks`, `requires` and `generate_interceptor`. It says nothing about UI.
- **Settings [code].** Extensions append a template into a pre-declared container inside `#extensions_settings` or `#extensions_settings2`, by convention `#<name>_container`. The markup is an `inline-drawer` using ST's own classes (`menu_button`, `text_pole`, `flex-container`).
- **Menu entries [code].** Wand-menu items are added to `#extensionsMenu`, usually through `#<name>_wand_container`.
- **Everything else [code].** Extensions also write into the composer (`#send_form`, `#qr_container`), the chat (`#chat`, per-message buttons) and `document.body` (floating panels). 9 of the 14 bundled extensions touch `document.body`. Popups use `Popup` or `callGenericPopup`. Several extensions pop panels out into `#movingDivs`.
- **Context and events [code].** `SillyTavern.getContext()` exposes state and helpers. `eventSource` carries about 110 event types. There is no event for "extension UI registered".
- **Theme variables [code].** ST defines about 17 `--SmartTheme*` variables (body, em, quote, underline, border, shadow, blur tint and strength, chat and message tints, checkbox colours). Five bundled extensions use them. Third-party extensions say they inherit them [survey].

Conclusion: the only universal interface an extension has is the DOM it builds inside ST's page. A design that needs a schema from every extension will not work with existing extensions.

## 5. How Pocket hosts ST today

- **Engine [code].** ST runs in a hidden iframe (`#engine`, `inert`, `aria-hidden`). The frontend and ST share an origin. The bridge is a MessageChannel handled by a dispatcher in `extension/index.js`. Message rendering is Pocket's own: it has its own markup and its own regex, Markdown and sanitise pipeline (`regex-display.js`), not ST's `.mes` DOM.
- **Native panels [code].** `native-settings-host.js` takes real ST roots inside the iframe (`#rm_api_block`, `#left-nav-panel`), forces them to `position: fixed; inset: 0` with `!important` styles, and installs a document-wide guard that blocks pointer events outside those roots. Popups are found with hard-coded selectors. The frontend then un-hides the iframe and places it over a mount rect (`.native-engine`).
- **Summaryception [code].** A vendor copy (`5.5.4-pocket`, with `POCKET-PATCH.md`) registers `window.pocketExtensions.set('summaryception', { read, run })`. The adapter goes through the bridge, and the global `isBusy` consults it.
- **Busy model [code].** `isBusy` is assembled from generation, saving, native-host, migration and each registered extension's own flag. Pocket also keeps `pocketVerifyMemory` and `pocketSaveSettings` paths and a pending-changes queue so that Pocket's view and ST's state do not diverge.
- **Known failure mode [code].** `NATIVE_LAYER_UNHANDLED` is raised when an extension opens a layer the host does not recognise.
- **Docs.** `docs/EXTENSION_INTEGRATION.md` and `LAYOUT.md` already treat extension hosting as a parked investigation and name WIhero as the stress test.

## 6. What extensions do: a working taxonomy

Four kinds, from the bundled set and a survey of popular third-party extensions [survey].

|   |   |   |
|---|---|---|
|Kind|Examples|What it needs from the host|
|1. Settings and background logic|Summaryception, vectors|A settings surface; load and enable state; access to chat and metadata|
|2. On-demand popups|WorldInfo Info (active lorebook entries), QuickPersona|A launcher (wand-menu entry); a layer for popups and dropdowns|
|3. Persistent panels|EchoText (floating iMessage-style side chat), EchoChamber (live reaction feed), RPG inventory/map extensions, Doom's Enhancement Suite|Real screen space beside or over the chat; own state; frequently own generation|
|4. Extension-initiated requests|EchoText and EchoChamber (separate connection profiles; EchoChamber can call Ollama directly)|Awareness that a request is in flight, even when it bypasses ST's generation path|

Out of scope but common: extensions that decorate messages or restyle ST (themes, bubble styles, per-message widgets). Pocket neither hosts nor detects these.

## 7. The races, catalogued

|   |   |   |
|---|---|---|
|ID|Race|Source|
|R1|Busy state is fragmented. Anything that is not registered is invisible to `isBusy`.|[code]|
|R2|Two holders of state. Pocket's displayed chat can differ from ST's active chat, and extensions mutate ST directly (settings, `chat_metadata`, saves, extension prompts). Today's answer is lockouts and a pending queue.|[code]|
|R3|Input blocking is a lock, not coordination. The pointer guard needs a complete list of the host's layers, and any unlisted popup is unreachable or unclosable.|[code]|
|R4|Extension-initiated generations contend with the main chat. Some go through ST (observable by events), some do not (EchoChamber to Ollama).|[survey]|
|R5|Registration timing. Extensions load asynchronously, so Pocket may query the registry before an extension has registered.|[hypothesis]|
|R6|Surface lifetime. A hosted surface can be rebuilt by its extension (for example after a settings reload) while Pocket holds a reference to a stale node.|[hypothesis]|

R1 to R3 are structural and are addressed by the Activity Coordinator (section 9). R4 is partly observable and partly needs Tier 1. R5 and R6 are to be confirmed or killed by the spike.

## 8. The contract

### 8.1 Principles

1. **Uniformity.** No Pocket code path may reference an extension by id. A test enforces this.
2. **Pocket owns UX, extensions own function.** An extension's UI is hosted, not redesigned. Pocket's own screens never depend on an extension.
3. **Opt-in depth.** An extension that does nothing still works at Tier 0. Each higher tier is a small, declarative, additive step.
4. **Observe first, ask second.** Prefer inferring activity from ST events and DOM over requiring registration.
5. **Graceful escape.** Anything Pocket cannot host cleanly falls back to a full-panel view of the real ST UI, clearly labelled.

### 8.2 Tier 0: universal, no author effort

- **Discovery.** The extension list comes from ST's manifests and disabled list. An observer on `#extensions_settings(2)` and `#extensionsMenu` maps each extension to its container (the `#<name>_container` convention plus a MutationObserver as the generic fallback).
- **Hosting.** The settings container becomes the extension's _settings surface_. Wand-menu entries become _actions_ in a Pocket Actions list. Any popup or dropdown opened from a hosted surface is captured by a generic layer registry (ST's `Popup` class, select2, `#dialogue_popup`, `#movingDivs`), replacing the hard-coded lists.
- **Theming.** Token bridge and skin sheet (section 10).
- **Activity.** Observed through ST events (generation start, end, stop; chat changed; settings updated; message edited).

### 8.3 Tier 1: declaration

A small optional block that tells Pocket what it cannot infer. It is static where possible (read from the manifest) and dynamic where needed (a runtime handle).

```json
"pocket": {
  "apiVersion": 1,
  "surfaces": [
    { "id": "settings", "kind": "settings", "root": "#summarize_container", "title": "Summaryception" },
    { "id": "inspect",  "kind": "panel",    "placement": "sheet", "open": "#sc_open_btn" }
  ],
  "activity": {
    "requests": true,
    "writes": ["chat_metadata", "extension_settings.summaryception"]
  }
}
```

The runtime handle replaces today's `window.pocketExtensions.set(...)`:

```js
window.pocketExtensions.register('summaryception', {
  busy: () => boolean,          // pull model, cheap
  onClaim: (claim) => {},       // Pocket tells the extension what it is about to do
  onEvent: (name, data) => {}   // optional
});
```

Summaryception's special-case adapter becomes an ordinary Tier 1 declaration. Verification needed: that ST ignores unknown manifest keys, and whether static declaration or runtime registration should be the primary route [hypothesis].

### 8.4 Tier 2: declarative settings (optional, later)

For simple settings (toggle, select, number, text, button, section) an extension may provide a schema, and Pocket renders it natively. This is the only route to a truly native look. It suits extensions the owner controls (WIhero, Summaryception) and anyone who wants it. It is not required, and the first release does not need it.

### 8.5 Placement vocabulary

Placements Pocket offers to surfaces: `page` (full screen), `sheet` (bottom sheet), `dock` (persistent beside or over chat), and `action` (a launcher item). `dock` is the one that stresses the architecture (section 9).

## 9. Coordination: the Activity Coordinator

One component owns "what is the engine doing, and who is allowed to start what".

- **Claims.** Typed claims: `generation`, `chat-write`, `settings-write`, `ui-attention`, each with an owner (`pocket`, `st`, or an extension id) and an expiry.
- **Sources of claims.** Observed ST events (always on), Tier 1 declarations and runtime `busy()` (when present), and hosted-surface interaction (an open surface registers a soft `ui-attention` claim).
- **Policy over lockout.** Pocket asks `canStart(action)`. Conflicts are queued, deferred or explained ("Summaryception is writing to this chat") rather than silently blocked. This replaces R1's fragmented `isBusy`.
- **Layers instead of a pointer guard.** Pocket keeps a layer stack of surfaces and popups. The underlay is made inert (using the `inert` attribute on Pocket's own root). Pocket does not reach into ST's DOM to block events. This addresses R3.
- **Out-of-band requests.** An extension that calls an external model directly (R4) is visible only if it declares `activity.requests` or implements `busy()`. We document this limitation honestly. No amount of observation will find a request that never touches ST.
- **Single source of truth.** In Option B, the live ST chat array is the state, which removes R2 at the source. In Option A, the existing verify-and-queue machinery stays, but is routed through the Coordinator.

## 10. Look and feel

Three levels, in order of effort.

1. **Token bridge (all extensions).** Map Pocket's theme tokens onto ST's `--SmartTheme*` variables inside the hosted document. Extensions that inherit ST colours (several do [survey]) pick up Pocket's palette automatically. Pocket currently has no such mapping.
2. **Skin sheet (all extensions).** A Pocket-owned stylesheet, scoped under a surface class, restyles ST's shared classes (`menu_button`, `text_pole`, `inline-drawer`, `flex-container`, checkboxes, select2). Hard-coded colours remain; they will look different but not broken.
3. **Native rendering (opt-in, Tier 2).** Pocket renders the schema with its own components.

Touch-target enlargement is a possible later flag on the skin sheet. It is not in scope now.

## 11. Hosting: two candidate architectures

Both implement a single interface, so the contract above survives either choice.

```text
SurfaceHost: mount(surface, target) / unmount(surface) / size(surface)
             focus(surface) / layers() / on('layer-open' | 'layer-close' | 'rebuild')
```

### Option A: the split, generalised

Keep the hidden iframe. A surface becomes "this container, sized to its content, presented in a Pocket page or sheet". The iframe is moved or resized to the target and the rest of the ST DOM is hidden by injected CSS. The same-origin relationship allows content-size observation through `ResizeObserver`.

- **Gains.** Smallest rewrite. Full CSS isolation in both directions. Pocket's chat and ST's DOM never interfere.
- **Loses.** One iframe means one visible surface at a time. Persistent panels (kind 3) cannot coexist with the chat. Two timelines of state remain (R2). Hosting stays a sequence of window-over-window workarounds.

### Option B: one document, Pocket chrome in a shadow root

Pocket becomes the shell of ST's own page. Pocket's UI lives in a shadow root so ST's global CSS cannot reach it. Extension containers are moved (not cloned) under Pocket's host element and projected through slots. Moving preserves their handlers.

- **Gains.** Extensions' popups, select2 and jQuery work as written. Several surfaces can be on screen at once, including docks beside the chat. State is read live through `getContext()` and `eventSource` with no message port. One event loop, so the Coordinator is ordinary code.
- **Loses.** A large rewrite: the bridge, the frontend/engine split and most of the test suite. ST's own layout assumptions (`#chat`, `#send_textarea` must exist) must be kept alive and hidden. Popups appended to `body` sit outside the shadow root and keep ST styling. Pocket and ST share a crash domain. Pocket's feature of browsing a saved chat without activating it in ST has to be rebuilt as a read-only view over chat files.

### Recommendation

Prefer Option B if the spike passes, because it is the only path where persistent panels, popups and race handling all come out simple. Keep Option A as the documented fallback. The contract, the Coordinator, the token bridge and the skin sheet are the same for both, so Phase 1 can start before the choice.

### Spike (pass/fail)

Build a throwaway shell with a minimal Pocket chrome in a shadow root, then:

1. Re-parent Summaryception's `#summarize_container` into a slotted surface. Pass: controls work, state persists, no console errors.
2. Open an ST popup and a select2 dropdown from inside it. Pass: they appear above the shell, receive input and close properly.
3. Run two surfaces at once. Pass: both interactive, no focus theft.
4. Apply the token bridge. Pass: the panel visibly follows Pocket's palette.
5. Trigger a generation and confirm the Coordinator sees it through events alone. Pass: claim appears and clears.
6. Reload an extension's settings (R6). Report whether the surface reference survives.

If 1 or 2 fail in a way that cannot be fixed with a bounded change, choose Option A.

## 12. Lifecycle and failure handling

- **Enable and disable.** The Extensions page reflects ST's disabled list. A disabled extension has no surfaces.
- **Updates.** The `dev` branch already adds Git update errors and engine diagnostics. Extension updates should surface here as structured results, not strings.
- **Load failure.** An extension whose scripts fail to load is listed as failed, with its error, and no surface.
- **Unhostable surface.** Any surface that does not mount cleanly shows "Open full panel" (the existing native view, kept as the last-resort escape hatch).
- **Rebuild.** If an extension replaces its container, the host re-resolves the root and remounts without losing the user's place (R6).
- **Isolation of failures.** A failing extension must not block Pocket's core screens. In Option B this relies on error boundaries around surface mounting.

## 13. The Pocket UX

- An **Extensions** page (the nav slot already planned in layout v4) lists every extension with name, version, state and update status.
- Each extension expands into its **Settings** surface, its **Actions** (from the wand menu and any Tier 1 launchers) and its **Panels**, if any.
- Panels use `page`, `sheet` or `dock` placement, chosen by Pocket's layout preset, not by the extension.
- Layout customisation is a Pocket API with a few shipped presets. No extension can change layout.
- A global activity indicator shows which claims are active and by whom.

## 14. Compatibility matrix

|   |   |   |   |
|---|---|---|---|
|Kind|Tier 0|With Tier 1|Notes|
|1. Settings and background|Yes|Better busy state|The easiest case|
|2. Popups|Yes, via the layer registry|Launchers declared|Depends on the layer registry being general|
|3. Persistent panels|Option A: one at a time. Option B: yes|Placement hints|Main reason to prefer B|
|4. Own requests|Partly (via ST events)|Full|Out-of-band calls need declaration|
|Chat or chrome decorators|Not supported|Not supported|Out of scope by decision|

Open item: composer-tray extensions such as Quick Replies sit between kind 2 and the composer. Whether Pocket supports these through the contract or provides its own base feature is a product decision (section 17).

## 15. Phased plan

- **Phase 0, spike.** Section 11. Output: choose A or B, and confirm or kill R5 and R6.
- **Phase 1, contract without host change.** Implement discovery, the layer registry, the Coordinator, the token bridge and the skin sheet on top of the current architecture. This is useful in 0.9.x to 1.0 whichever host wins.
- **Phase 2, host.** Implement `SurfaceHost` for the chosen option. Retire the native-settings special cases.
- **Phase 3, de-special-casing.** Convert Summaryception and WIhero to Tier 1 declarations and delete their adapters. A uniformity test fails the build if any code path references an extension id.
- **Phase 4, optional.** Tier 2 declarative settings, for extensions that want a fully native look.

**Acceptance fixtures.** Summaryception and WIhero (owner's extensions), plus representative third-party ones: a popup extension (WorldInfo Info), a persistent panel with its own generation (EchoChamber-style), and a persona helper (QuickPersona). Each phase is checked against the same fixtures.

## 16. Risks

- **Option B rewrite cost and regression surface.** Mitigated by the spike and by keeping the contract independent of the host.
- **CSS bleed.** Mitigated by the shadow root. Popups on `body` remain a residual risk.
- **ST internal drift.** The container convention and `#`-ids are conventions, not APIs. ST updates may move them. The observer approach tolerates this better than hard-coded selectors, but not perfectly.
- **Unknown unknowns in third-party code.** Extensions that assume a desktop layout or particular ids will misbehave. The escape hatch bounds the damage.
- **Declaration burden.** Tier 1 must stay small enough that authors will actually add it. Anything larger belongs in Tier 2.

## 17. Open decisions

1. Choose A or B after the spike?
2. Quick Replies and other composer-tray extensions: via the contract, or as a base Pocket feature?
3. Static (manifest) or runtime registration as the primary Tier 1 route?
4. Should Phase 1 ship before the spike result, in 0.9.x or in a 1.0 branch?
5. Who maintains Pocket-shipped themes inspired by popular ST ones, and is there a naming and credit convention? Orbweaver's credits page for Moonlit Echoes is a precedent worth reading.

## Appendix: reference points

**ST [code].** `public/scripts/extensions.js` (loader, wand menu, settings containers), `st-context.js` (`getContext()`), `events.js` (about 110 events), `src/endpoints/extensions.js` (discover), `index.html` (`#extensions_settings`, `#extensions_settings2`, `#extensionsMenu`), `style.css` (`--SmartTheme*`).

**Pocket [code].** `prototype/extension/index.js` (dispatcher), `native-settings-host.js`, `native-host-lock.js`, `adapter.js` (`window.pocketExtensions`), `prototype/frontend/transport.js`, `side-panels.js`, `regex-display.js`, `vendor/Extension-Summaryception` plus `POCKET-PATCH.md`, `docs/EXTENSION_INTEGRATION.md`, `docs/LAYOUT.md`, `docs/THEME_API.md`.

**Third-party [survey].** Moonlit Echoes (RivelleDays), EchoText and EchoChamber (mattjaybe), WorldInfo Info (aikohanasaki), QuickPersona, Doom's Enhancement Suite (DangerDaza), cryhell's RPG extension.